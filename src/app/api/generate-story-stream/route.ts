import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from 'redis';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';

// Character schema
const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  isMain: z.boolean(),
  uploadedPhotoUrl: z.string().url().optional().nullable(),
});

// Input validation schema
const storyInputSchema = z.object({
  characters: z.array(characterSchema).min(1, "At least one character is required"),
  ageRange: z.string({ required_error: "Age range is required" }),
  storyPlotOption: z.enum(["photos", "describe"]),
  storyDescription: z.string().min(1, "Story description is required when using describe mode").optional(),
  storyStyle: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  uploadedStoryPhotoUrls: z.array(z.string().url()).optional(), // URLs of uploaded story photos
});

type StoryInput = z.infer<typeof storyInputSchema>;

// Story page structure
interface StoryPage {
  text: string;
  imageUrl: string | null;
}

interface StoryData {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  pages: StoryPage[];
}

// Helper function to send SSE events
function sendEvent(controller: ReadableStreamDefaultController, eventType: string, data: any) {
  const event = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(event));
}

// Helper function to upload Base64 image to Vercel Blob
async function uploadImageToBlobStorage(base64Data: string, storyId: string, pageIndex: number): Promise<string | null> {
  try {
    console.log(`BEGIN uploadImageToBlobStorage for Page ${pageIndex + 1}`);
    
    // Check if BLOB_READ_WRITE_TOKEN is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error(`Page ${pageIndex + 1}: Missing BLOB_READ_WRITE_TOKEN environment variable.`);
      return null;
    }

    // Extract the actual base64 content (remove the data:image/...;base64, part)
    console.log(`Page ${pageIndex + 1}: Extracting base64 content from data URL...`);
    const base64String = base64Data.split(',')[1];
    if (!base64String) {
      console.error(`Page ${pageIndex + 1}: Invalid base64 data string received.`);
      return null;
    }

    // Convert base64 to Buffer
    console.log(`Page ${pageIndex + 1}: Converting base64 to buffer...`);
    const buffer = Buffer.from(base64String, 'base64');
    console.log(`Page ${pageIndex + 1}: Buffer size: ${buffer.length} bytes`);

    // Generate a unique filename
    const filename = `stories/${storyId}/page-${pageIndex + 1}-${randomUUID()}.png`;
    console.log(`Page ${pageIndex + 1}: Generated filename: ${filename}`);

    console.log(`Page ${pageIndex + 1}: Starting Vercel Blob PUT operation...`);
    console.log(`Page ${pageIndex + 1}: PUT parameters - filename: ${filename}, contentType: image/png, access: public`);

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public', // Make the image publicly accessible
      contentType: 'image/png', // Explicitly set content type
    });

    console.log(`Page ${pageIndex + 1}: Image uploaded successfully. URL: ${blob.url}`);
    return blob.url; // Return the public URL

  } catch (error) {
    console.error(`ERROR during image upload for Page ${pageIndex + 1}:`, error);
    console.error(`Page ${pageIndex + 1}: Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Create a unique ID early for this story
  const storyId = randomUUID();
  let redisClient: any = undefined;

  // Create a stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial connection established event
        sendEvent(controller, 'connection', { status: 'established' });

        // Parse and validate request body
        const body = await request.json();
        
        // Validation stage
        sendEvent(controller, 'progress', { 
          step: 'validating', 
          status: 'in_progress', 
          message: 'Validating input data...' 
        });
        
        console.log("Request body:", JSON.stringify(body));
        const validationResult = storyInputSchema.safeParse(body);

        if (!validationResult.success) {
          console.error("Validation error:", JSON.stringify(validationResult.error.format()));
          sendEvent(controller, 'error', { 
            message: 'Invalid input', 
            details: validationResult.error.format() 
          });
          controller.close();
          return;
        }

        const storyInput = validationResult.data;
        
        // Additional validation for story photos when using "photos" option
        if (storyInput.storyPlotOption === "photos" && 
            (!storyInput.uploadedStoryPhotoUrls || storyInput.uploadedStoryPhotoUrls.length === 0)) {
          console.error("Validation error: No story photos provided for photos mode");
          sendEvent(controller, 'error', { 
            message: 'No story photos provided', 
            details: 'Please upload at least one photo for photo-based story generation' 
          });
          controller.close();
          return;
        }
        
        // For describe mode, ensure story description is provided
        if (storyInput.storyPlotOption === "describe" && 
            (!storyInput.storyDescription || storyInput.storyDescription.trim() === "")) {
          console.error("Validation error: No story description provided for describe mode");
          sendEvent(controller, 'error', { 
            message: 'No story description provided', 
            details: 'Please provide a story description for text-based story generation' 
          });
          controller.close();
          return;
        }
        sendEvent(controller, 'progress', { 
          step: 'validating', 
          status: 'complete', 
          message: 'Input validation successful' 
        });

        // Initialize OpenAI client
        if (!process.env.OPENAI_API_KEY) {
          sendEvent(controller, 'error', { message: 'OpenAI API key is not configured' });
          controller.close();
          return;
        }
        
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        
        // Initialize Google Generative AI client
        if (!process.env.GOOGLE_API_KEY) {
          sendEvent(controller, 'error', { message: 'Google AI configuration failed: Missing API Key.' });
          controller.close();
          return;
        }
        
        try {
          // Initialize the Google AI client with the API key
          const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
          
          // Get the specific Gemini model for image generation
          const generativeModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp-image-generation",
            // Use type assertion to satisfy TypeScript
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" } as any,
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" } as any,
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" } as any,
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" } as any,
            ],
          });
          
          // Create Redis client using REDIS_URL
          if (!process.env.REDIS_URL) {
            sendEvent(controller, 'error', { message: 'Redis connection failed: Missing configuration.' });
            controller.close();
            return;
          }

          try {
            sendEvent(controller, 'progress', { 
              step: 'setup', 
              status: 'in_progress', 
              message: 'Connecting to database...' 
            });
            
            console.log("--- Attempting node-redis Connection ---");
            console.log("Using REDIS_URL:", process.env.REDIS_URL);
            redisClient = createClient({ url: process.env.REDIS_URL });
            redisClient.on('error', (err: Error) => console.error('Redis Client Error', err));
            await redisClient.connect();
            console.log("node-redis client connected.");
            
            sendEvent(controller, 'progress', { 
              step: 'setup', 
              status: 'complete', 
              message: 'Database connection established' 
            });
            
          } catch (connectError) {
            console.error("Failed to connect redis client:", connectError);
            sendEvent(controller, 'error', { message: 'Redis connection failed.' });
            controller.close();
            return;
          }
          
          // --- Begin Story Generation Process ---
          try {
            // 1. Generate story text
            sendEvent(controller, 'progress', { 
              step: 'writing', 
              status: 'in_progress', 
              message: 'Creating your unique story...' 
            });
            
            let storyPagesText: string[];
            
            // Choose the appropriate story generation method based on storyPlotOption
            if (storyInput.storyPlotOption === "photos" && storyInput.uploadedStoryPhotoUrls) {
              // Generate story from photos using Gemini
              sendEvent(controller, 'progress', { 
                step: 'writing', 
                status: 'in_progress', 
                message: 'Analyzing photos and crafting your story...' 
              });
              
              storyPagesText = await generateStoryTextFromPhotos(generativeModel, storyInput);
            } else {
              // Generate story from text description using OpenAI
              sendEvent(controller, 'progress', { 
                step: 'writing', 
                status: 'in_progress', 
                message: 'Creating your story from description...' 
              });
              
              storyPagesText = await generateStoryText(openai, storyInput);
            }
            
            sendEvent(controller, 'progress', { 
              step: 'writing', 
              status: 'complete', 
              message: 'Story text generated successfully!' 
            });

            // 2. Generate illustrations (passing storyId)
            sendEvent(controller, 'progress', { 
              step: 'illustrating', 
              status: 'in_progress', 
              message: 'Starting illustration process...',
              illustrationProgress: {
                current: 0,
                total: storyPagesText.length
              }
            });
            
            // Generate each illustration and send events for progress
            const imageUrls = await generateIllustrations(
              controller,
              generativeModel,
              storyPagesText,
              storyInput,
              storyId
            );

            // 3. Combine text and image URLs
            sendEvent(controller, 'progress', { 
              step: 'saving', 
              status: 'in_progress', 
              message: 'Assembling your storybook...' 
            });
            
            const pagesData: StoryPage[] = storyPagesText.map((text, index) => ({
              text,
              imageUrl: imageUrls[index], // This is now a URL or null
            }));

            // 4. Assemble story data
            const title = generateStoryTitle(storyInput.characters);
            const subtitle = `A story for ${storyInput.ageRange} year olds`;
            const storyData: StoryData = {
              id: storyId,
              title,
              subtitle,
              createdAt: new Date().toISOString(),
              pages: pagesData,
            };

            // 5. Convert to JSON and store in Redis
            const storyDataJSON = JSON.stringify(storyData);
            const dataSizeInKB = Math.round(storyDataJSON.length / 1024);
            console.log(`Story data size (excluding images): ${dataSizeInKB} KB`);
            
            console.log("Illustration loop completed. Attempting to save final data to Redis...");
            console.log(`Redis key: story:${storyId}, Data size: ${dataSizeInKB} KB, Expiration: 86400 seconds (24 hours)`);
            
            try {
              await redisClient.set(`story:${storyId}`, storyDataJSON, { EX: 86400 });
              console.log("Story saved to Redis successfully.");
            } catch (redisError) {
              console.error("ERROR during Redis save operation:", redisError);
              console.error("Redis error stack:", redisError instanceof Error ? redisError.stack : 'No stack trace available');
              throw redisError; // Rethrow to be caught by the outer try/catch
            }
            
            // Handle email subscription if provided
            if (storyInput.email) {
              // In a real implementation, you'd save this email for notifications
              console.log(`Story completion will be emailed to: ${storyInput.email}`);
              // You could add a database entry or call another service here
            }
            
            // 6. Send success event and close the stream
            sendEvent(controller, 'progress', { 
              step: 'saving', 
              status: 'complete',
              message: 'Story saved successfully!'
            });
            
            sendEvent(controller, 'complete', { 
              storyId, 
              title,
              message: 'Your story has been created successfully!'
            });
            
          } catch (error: any) {
            console.error('ERROR during story generation process:', error);
            console.error('Story generation error stack:', error instanceof Error ? error.stack : 'No stack trace available');
            
            let errorMessage = 'An unexpected error occurred during story generation';
            
            if (error.message && error.message.includes('OOM command not allowed')) {
              console.error('ERROR: Redis OOM (Out of Memory) detected');
              errorMessage = 'Memory limit exceeded when storing the story. This might be due to large image sizes.';
            } else if (error.message && error.message.includes('Failed to generate story text')) {
              console.error('ERROR: Story text generation failure detected');
              errorMessage = 'Failed to generate the story text. Please try again or modify your description.';
            } else if (error.message && error.message.includes('Redis connection failed')) {
              console.error('ERROR: Redis connection issue detected');
              errorMessage = 'Database connection error. Please try again later.';
            } else if (error.message?.includes('Failed to upload image')) {
              console.error('ERROR: Image upload failure detected');
              errorMessage = 'Part of the story generation failed (image upload). The story might be incomplete.';
            }
            
            console.log('Sending error event to client:', errorMessage);
            sendEvent(controller, 'error', { message: errorMessage });
          }
          
        } catch (error) {
          console.error('Error initializing Google Generative AI:', error);
          sendEvent(controller, 'error', { message: 'Failed to initialize Google Generative AI services' });
        } finally {
          // Close Redis connection if it's open
          try {
            if (redisClient && redisClient.isOpen) {
              await redisClient.disconnect();
              console.log("node-redis client disconnected.");
            }
          } catch (err) {
            console.error("Error disconnecting from Redis:", err);
          }
          
          // Close the stream
          controller.close();
        }
        
      } catch (error) {
        console.error('Error processing request:', error);
        sendEvent(controller, 'error', { message: 'An unexpected error occurred' });
        controller.close();
      }
    }
  });

  // Return the stream with appropriate headers for SSE
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Function to generate story text from text description using OpenAI
async function generateStoryText(openai: OpenAI, storyInput: StoryInput): Promise<string[]> {
  try {
    console.log("Starting generateStoryText with OpenAI...");
    
    const { characters, ageRange, storyDescription, storyStyle } = storyInput;
    
    // Find the main character, or use the first character if none is marked as main
    const mainCharacter = characters.find(char => char.isMain) || characters[0];
    
    // Get all character names for the story
    const characterNames = characters.map(c => c.name).filter(name => name.trim() !== '');
    const mainCharacterName = mainCharacter.name || 'the main character';
    
    const characterPrompt = characterNames.length > 1 
      ? `The main character is named ${mainCharacterName}. Other characters in the story are: ${characterNames.filter(n => n !== mainCharacterName).join(', ')}.`
      : `The story should be about a character named ${mainCharacterName}.`;
    
    const systemPrompt = `You are a creative children's story writer. Create a 5-paragraph story for a ${ageRange} year old child. 
${characterPrompt}
${storyStyle ? `The story should have a ${storyStyle} style and tone.` : ''}
The story should be engaging, age-appropriate, and have a clear beginning, middle, and end.
Return ONLY a JSON object with a "storyPages" array containing exactly 5 strings, each representing one paragraph of the story.
Do not include any explanations, notes, or other text outside the JSON structure.`;

    const userPrompt = `Write a children's story based on this idea: ${storyDescription}`;
    
    console.log("Making OpenAI API call for story generation...");
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }
    
    console.log("Parsing OpenAI response");
    const parsedResponse = JSON.parse(content);
    
    if (!parsedResponse.storyPages || !Array.isArray(parsedResponse.storyPages) || parsedResponse.storyPages.length !== 5) {
      throw new Error('Invalid response format from OpenAI');
    }
    
    console.log("Successfully generated story text with OpenAI");
    return parsedResponse.storyPages;
    
  } catch (error) {
    console.error('Error generating story text with OpenAI:', error);
    throw new Error('Failed to generate story text with OpenAI');
  }
}

// Function to generate story text from photos using Gemini
async function generateStoryTextFromPhotos(generativeModel: any, storyInput: StoryInput): Promise<string[]> {
  try {
    console.log("Starting generateStoryTextFromPhotos with Gemini...");
    
    if (!storyInput.uploadedStoryPhotoUrls || storyInput.uploadedStoryPhotoUrls.length === 0) {
      throw new Error('No photo URLs provided for story generation');
    }
    
    const { characters, ageRange, storyStyle, uploadedStoryPhotoUrls } = storyInput;
    
    // Find the main character, or use the first character if none is marked as main
    const mainCharacter = characters.find(char => char.isMain) || characters[0];
    
    // Get all character names for the story
    const characterNames = characters.map(c => c.name).filter(name => name.trim() !== '');
    const mainCharacterName = mainCharacter.name || 'the main character';
    
    const characterPrompt = characterNames.length > 1 
      ? `The main character is named ${mainCharacterName}. Other characters in the story are: ${characterNames.filter(n => n !== mainCharacterName).join(', ')}.`
      : `The story should be about a character named ${mainCharacterName}.`;
    
    console.log(`Processing ${uploadedStoryPhotoUrls.length} photos for story generation...`);
    
    // Fetch and process each photo
    const imagePartsPromises = uploadedStoryPhotoUrls.map(async (photoUrl, index) => {
      try {
        console.log(`Fetching story photo ${index + 1} from: ${photoUrl}`);
        
        // Fetch the image
        const response = await fetch(photoUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        // Get image data as ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();
        
        // Convert to base64
        const base64String = Buffer.from(arrayBuffer).toString('base64');
        
        // Determine MIME type from Content-Type header or extension
        let mimeType = response.headers.get('Content-Type');
        
        // If we couldn't get MIME type from headers, try to infer from URL
        if (!mimeType || mimeType === 'application/octet-stream') {
          // Extract extension from URL, if any
          const extension = photoUrl.split('.').pop()?.toLowerCase();
          if (extension) {
            switch (extension) {
              case 'jpg':
              case 'jpeg':
                mimeType = 'image/jpeg';
                break;
              case 'png':
                mimeType = 'image/png';
                break;
              case 'gif':
                mimeType = 'image/gif';
                break;
              case 'webp':
                mimeType = 'image/webp';
                break;
              case 'svg':
                mimeType = 'image/svg+xml';
                break;
              default:
                // Default fallback
                mimeType = 'image/jpeg';
            }
          } else {
            // Default fallback if no extension found
            mimeType = 'image/jpeg';
          }
        }
        
        console.log(`Successfully processed story photo ${index + 1}, MIME type: ${mimeType}, Size: ${arrayBuffer.byteLength} bytes`);
        
        // Return in the format expected by the Gemini API
        return {
          inlineData: {
            data: base64String,
            mimeType: mimeType
          }
        };
      } catch (error) {
        console.error(`Error processing story photo ${index + 1}:`, error);
        throw error; // Re-throw to be caught by the outer try/catch
      }
    });
    
    // Wait for all photos to be processed
    const imageParts = await Promise.all(imagePartsPromises);
    
    console.log(`Successfully processed ${imageParts.length} photos for story generation`);
    
    // Create the text prompt for Gemini
    const textPrompt = `You are a creative children's story writer. Create a 5-paragraph story for a ${ageRange} year old child.
${characterPrompt}
${storyStyle ? `The story should have a ${storyStyle} style and tone.` : ''}

I've provided a sequence of photos. Create a story that incorporates these images in order, as if they represent scenes or moments in the story's progression.

The story should be engaging, age-appropriate, and have a clear beginning, middle, and end.

IMPORTANT: You MUST return ONLY a valid JSON object with this exact structure:
{
  "storyPages": [
    "paragraph 1",
    "paragraph 2",
    "paragraph 3",
    "paragraph 4",
    "paragraph 5"
  ]
}

Each paragraph should be a string with approximately 3-4 sentences.
Do not include any explanations, notes, or other text outside the JSON structure.`;
    
    // Construct the complete parts array for the API call
    const promptParts = [
      { text: textPrompt },
      ...imageParts
    ];
    
    console.log("Creating Gemini model instance for photo-based story generation...");
    
    // Use Gemini 1.5 Flash for multimodal generation with fast response
    const model = generativeModel.getGenerativeModel({
      model: "gemini-1.5-flash",
      // Configure safety settings to avoid content filtering issues
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" } as any,
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" } as any,
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" } as any,
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" } as any,
      ],
    });
    
    console.log("Making Gemini API call for photo-based story generation...");
    
    // Make the API call to Gemini with our prompt parts
    const result = await model.generateContent({
      contents: [{ role: "user", parts: promptParts }],
      generationConfig: {
        responseMimeType: "application/json", // Request JSON response
        temperature: 0.7,                     // Add some creativity
        maxOutputTokens: 2048,                // Enough for 5 paragraphs
      },
    });
    
    const response = await result.response;
    const content = response.text();
    
    console.log("Received response from Gemini API for photo-based story");
    
    if (!content) {
      throw new Error('No content returned from Gemini API');
    }
    
    console.log("Parsing JSON response from Gemini");
    
    try {
      // Parse JSON response
      const parsedResponse = JSON.parse(content);
      
      // Validate response structure
      if (!parsedResponse.storyPages || !Array.isArray(parsedResponse.storyPages) || parsedResponse.storyPages.length !== 5) {
        console.error('Invalid response format from Gemini:', content);
        throw new Error('Invalid response format from Gemini (missing storyPages array or wrong length)');
      }
      
      console.log("Successfully parsed Gemini response into story pages");
      return parsedResponse.storyPages;
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Raw response:', content);
      throw new Error('Failed to parse Gemini response as JSON');
    }
    
  } catch (error) {
    console.error('Error generating story text from photos:', error);
    throw new Error(`Failed to generate story from photos: ${error.message}`);
  }
}

// Helper function to fetch a character photo and convert to base64
async function fetchCharacterPhoto(photoUrl: string): Promise<{ data: string, mimeType: string } | null> {
  try {
    console.log(`Fetching character photo from: ${photoUrl}`);
    
    // Fetch the image
    const response = await fetch(photoUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Get image data as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert to base64
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    
    // Determine MIME type from Content-Type header or extension
    let mimeType = response.headers.get('Content-Type');
    
    // If we couldn't get MIME type from headers, try to infer from URL
    if (!mimeType || mimeType === 'application/octet-stream') {
      // Extract extension from URL, if any
      const extension = photoUrl.split('.').pop()?.toLowerCase();
      if (extension) {
        switch (extension) {
          case 'jpg':
          case 'jpeg':
            mimeType = 'image/jpeg';
            break;
          case 'png':
            mimeType = 'image/png';
            break;
          case 'gif':
            mimeType = 'image/gif';
            break;
          case 'webp':
            mimeType = 'image/webp';
            break;
          case 'svg':
            mimeType = 'image/svg+xml';
            break;
          default:
            // Default fallback
            mimeType = 'image/jpeg';
        }
      } else {
        // Default fallback if no extension found
        mimeType = 'image/jpeg';
      }
    }
    
    console.log(`Successfully fetched and processed character photo, MIME type: ${mimeType}, Size: ${arrayBuffer.byteLength} bytes`);
    
    return {
      data: base64String, // Return just the base64 string without data URL prefix, required for Gemini API
      mimeType: mimeType
    };
  } catch (error) {
    console.error('Error fetching character photo:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    return null;
  }
}

// Modified generateIllustrations function to send progress events
async function generateIllustrations(
  controller: ReadableStreamDefaultController,
  generativeModel: any,
  storyPages: string[],
  storyInput: StoryInput,
  storyId: string
): Promise<(string | null)[]> {
  // Initialize array with nulls for all pages
  const imageResults: (string | null)[] = Array(storyPages.length).fill(null);
  
  // Generate illustrations for all pages
  const indicesToIllustrate = Array.from({ length: storyPages.length }, (_, i) => i); 
  
  for (const index of indicesToIllustrate) {
    try {
      const pageText = storyPages[index];
      const { characters, storyStyle } = storyInput;
      
      // Send event for illustration progress
      sendEvent(controller, 'progress', {
        step: 'illustrating',
        status: 'in_progress',
        message: `Generating illustration ${index + 1} of ${storyPages.length}...`,
        illustrationProgress: {
          current: index + 1,
          total: storyPages.length,
          detail: index === 0 ? 'Creating title page illustration' : `Creating illustration for page ${index}`
        }
      });
      
      // Send substep events to show more granular progress
      sendEvent(controller, 'progress', {
        step: 'illustrating',
        status: 'in_progress',
        message: `Analyzing scene content for page ${index + 1}...`,
        illustrationProgress: {
          current: index + 1,
          total: storyPages.length,
          detail: 'Analyzing scene...'
        }
      });
      
      // Find the main character, or use the first character if none is marked as main
      const mainCharacter = characters.find(char => char.isMain) || characters[0];
      const mainCharacterName = mainCharacter.name || 'the main character';
      
      // Get all character names for the illustration
      const otherCharacterNames = characters
        .filter(c => !c.isMain && c.name.trim() !== '')
        .map(c => c.name);
      
      // Create character description for prompt
      const characterDescription = otherCharacterNames.length > 0
        ? `The main character's name is ${mainCharacterName}. Other characters that may appear: ${otherCharacterNames.join(', ')}.`
        : `The main character's name is ${mainCharacterName}.`;
      
      // Create enhanced prompt for image generation using a structured approach
      const promptText = `
⚠️ IMPORTANT - ILLUSTRATION ONLY: DO NOT INCLUDE ANY TEXT IN THE IMAGE ⚠️

CREATE A CHILDREN'S BOOK ILLUSTRATION showing this scene:
${pageText.replace(/\b[A-Z]{2,}\b/g, word => word.toLowerCase())} 

CHARACTER DETAILS:
${characterDescription}

STYLE GUIDANCE:
${storyStyle ? `Primary style: ${storyStyle}` : 'Primary style: balanced and appealing for children'}
Age-appropriate visuals for ${storyInput.ageRange || '5-7'} year old audience
Professional children's book quality, colorful with clear focal points
${index === 0 ? 'Create an establishing scene that introduces the character and setting' : ''}
${index === storyPages.length - 1 ? 'Create a satisfying resolution scene with positive emotional tone' : ''}

ARTISTIC DIRECTION:
- Create a clean, well-composed illustration with attention to lighting and depth
- Use vibrant, harmonious colors appropriate for children's illustrations
- Maintain a consistent artistic style across the story pages
- Focus on expressive character faces and clear storytelling
- Keep backgrounds detailed but not overwhelming
- Show objects like books, papers, or signs WITHOUT any visible text on them

⚠️ STRICT REQUIREMENTS - READ CAREFULLY: ⚠️
1. ABSOLUTELY NO TEXT OR LETTERS of any kind in the image
2. NO WORDS, WRITING, LETTERS, NUMBERS, OR TYPOGRAPHY anywhere in the illustration
3. REMOVE ALL TEXT from any objects like books, signs, clothing, etc.
4. DO NOT render any words from the story text as visual elements
5. If you need to show reading materials, show BLANK pages or abstract patterns only
6. ANY signs or displays should be BLANK or show simple abstract symbols only

CREATE AN IMAGE ONLY - This is critical for the book production process.

FINAL INSTRUCTION: This image MUST NOT contain any text, letters, numbers, writing, or readable elements whatsoever.
`.trim();

      sendEvent(controller, 'progress', {
        step: 'illustrating',
        status: 'in_progress',
        message: `Creating composition for page ${index + 1}...`,
        illustrationProgress: {
          current: index + 1,
          total: storyPages.length,
          detail: 'Creating composition...'
        }
      });
      
      console.log(`Generating image for page ${index + 1} using Gemini...`);
      
      // Prepare the content parts for Gemini
      const contentParts: any[] = [{ text: promptText }];
      
      // Check if main character has an uploaded photo
      let characterPhotoData = null;
      if (mainCharacter.uploadedPhotoUrl) {
        sendEvent(controller, 'progress', {
          step: 'illustrating',
          status: 'in_progress',
          message: `Processing character photo for page ${index + 1}...`,
          illustrationProgress: {
            current: index + 1,
            total: storyPages.length,
            detail: 'Processing character photo...'
          }
        });
        
        characterPhotoData = await fetchCharacterPhoto(mainCharacter.uploadedPhotoUrl);
        
        if (characterPhotoData) {
          console.log(`Adding character photo to Gemini request for page ${index + 1}`);
          
          // Add additional text to prompt about using the character photo
          contentParts[0].text += `\nUse the provided image as a reference for the main character's appearance.`;
          
          // Add the image part
          contentParts.push({
            inlineData: {
              data: characterPhotoData.data,
              mimeType: characterPhotoData.mimeType
            }
          });
        }
      }
      
      sendEvent(controller, 'progress', {
        step: 'illustrating',
        status: 'in_progress',
        message: `AI generating image for page ${index + 1}...`,
        illustrationProgress: {
          current: index + 1,
          total: storyPages.length,
          detail: 'AI drawing illustration...'
        }
      });
      
      // Call generateContent with the @google/generative-ai structure
      // Use type assertion to work around TypeScript errors while keeping functionality
      const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: contentParts }],
        generationConfig: {
          responseModalities: ["Text", "Image"],
        },
      } as any);
      
      const response = await result.response;
      
      console.log(`Got response from Gemini for page ${index + 1}`);
      
      sendEvent(controller, 'progress', {
        step: 'illustrating',
        status: 'in_progress',
        message: `Processing generated image for page ${index + 1}...`,
        illustrationProgress: {
          current: index + 1,
          total: storyPages.length,
          detail: 'Processing generated image...'
        }
      });
      
      // Extract image data
      const imageCandidate = response.candidates?.[0];
      let base64ImageData: string | null = null;

      if (imageCandidate?.content?.parts) {
        const imagePart = imageCandidate.content.parts.find((part: any) => part.inlineData?.data);
        if (imagePart?.inlineData?.data) {
          const mimeType = imagePart.inlineData.mimeType || 'image/png';
          base64ImageData = `data:${mimeType};base64,${imagePart.inlineData.data}`;
          console.log(`Successfully extracted base64 image data for page ${index + 1}`);
          
          // Send a preview event with the base64 data so frontend can show it immediately
          sendEvent(controller, 'image_preview', {
            pageIndex: index,
            previewUrl: base64ImageData
          });
        } else {
          console.warn(`No image part found in Gemini response for page ${index + 1}`);
        }
      } else {
        console.warn(`No valid candidates or parts found in Gemini response for page ${index + 1}`);
      }
      
      // Upload the image if we got data
      if (base64ImageData) {
        console.log(`Page ${index + 1}: Preparing to upload base64 image to blob storage. Data length: ${base64ImageData.length} characters`);
        sendEvent(controller, 'progress', {
          step: 'illustrating',
          status: 'in_progress',
          message: `Uploading illustration for page ${index + 1}...`,
          illustrationProgress: {
            current: index + 1,
            total: storyPages.length,
            detail: 'Uploading and saving illustration...'
          }
        });
        
        console.log(`Page ${index + 1}: Calling uploadImageToBlobStorage function...`);
        const imageUrl = await uploadImageToBlobStorage(base64ImageData, storyId, index);
        
        if (imageUrl) {
          imageResults[index] = imageUrl; // Store the URL
          console.log(`Page ${index + 1}: Successfully uploaded image and stored URL: ${imageUrl}`);
          
          // Send completion event for this illustration
          console.log(`Page ${index + 1}: Sending progress event to client.`);
          sendEvent(controller, 'progress', {
            step: 'illustrating',
            status: 'in_progress',
            message: `Completed illustration ${index + 1} of ${storyPages.length}`,
            illustrationProgress: {
              current: index + 1,
              total: storyPages.length,
              detail: 'Illustration complete!'
            }
          });
        } else {
          console.error(`ERROR: Failed to upload image for page ${index + 1}. URL will be null.`);
          console.log(`Page ${index + 1}: Sending error progress event to client.`);
          sendEvent(controller, 'progress', {
            step: 'illustrating',
            status: 'in_progress',
            message: `Warning: Failed to upload image for page ${index + 1}`,
            illustrationProgress: {
              current: index + 1,
              total: storyPages.length,
              detail: 'Upload failed, continuing...'
            }
          });
        }
      }
      
    } catch (error) {
      console.error(`Error generating illustration for page ${index}:`, error);
      // Continue with other illustrations rather than failing completely
      sendEvent(controller, 'progress', {
        step: 'illustrating',
        status: 'in_progress',
        message: `Error generating illustration ${index + 1}, continuing...`,
        illustrationProgress: {
          current: index + 1,
          total: storyPages.length,
          detail: 'Error with this illustration, continuing...'
        }
      });
    }
  }
  
  console.log("Illustration loop completed. All images processed.");
  
  // Send final completion event for illustration phase
  console.log("Sending final illustration completion event to client.");
  sendEvent(controller, 'progress', {
    step: 'illustrating',
    status: 'complete',
    message: 'All illustrations generated successfully!',
    illustrationProgress: {
      current: storyPages.length,
      total: storyPages.length,
      detail: 'All illustrations complete!'
    }
  });
  
  console.log(`Returning array of ${imageResults.length} image URLs. Null count: ${imageResults.filter(url => url === null).length}`);
  return imageResults;
}

function generateStoryTitle(characters: { id: string; name: string; isMain: boolean }[]): string {
  const titlePrefixes = [
    "The Adventure of",
    "The Magical Journey of",
    "The Incredible Tale of", 
    "The Fantastic Quest of",
    "The Amazing Day with"
  ];
  
  // Find the main character, or use the first character if none is marked as main
  const mainCharacter = characters.find(char => char.isMain) || characters[0];
  const mainCharacterName = mainCharacter.name || 'the Hero';
  
  const randomPrefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
  return `${randomPrefix} ${mainCharacterName}`;
}