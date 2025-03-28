import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from 'redis';
import { z } from 'zod';
import { randomUUID } from 'crypto';
// Import the Vercel Blob 'put' function
import { put } from '@vercel/blob';

// Character schema
const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  isMain: z.boolean(),
  gender: z.enum(['female', 'male', 'unspecified']).default('unspecified'),
  uploadedPhotoUrl: z.string().url().optional().nullable(),
});

// Input validation schema
const storyInputSchema = z.object({
  characters: z.array(characterSchema).min(1, "At least one character is required"),
  ageRange: z.string({ required_error: "Age range is required" }),
  storyPlotOption: z.enum(["photos", "describe"]),
  storyDescription: z.string().min(5, "Story description must be at least 5 characters long"),
  storyStyle: z.string().optional(),
  storyLengthTargetPages: z.number().int().min(3).max(10).optional().default(6),
});

type StoryInput = z.infer<typeof storyInputSchema>;

// Story page structure
interface StoryPage {
  text: string;
  imageUrl: string | null; // This will now always be a URL or null
}

interface StoryData {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  pages: StoryPage[];
}

// Redis client will be initialized in the request handler

// --- NEW: Helper function to upload Base64 image to Vercel Blob ---
async function uploadImageToBlobStorage(base64Data: string, storyId: string, pageIndex: number): Promise<string | null> {
  try {
    // Check if BLOB_READ_WRITE_TOKEN is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('Missing BLOB_READ_WRITE_TOKEN environment variable.');
        // Optionally, decide if you want to proceed without images or throw an error
        return null; // Fail gracefully for this image
    }

    // Extract the actual base64 content (remove the data:image/...;base64, part)
    const base64String = base64Data.split(',')[1];
    if (!base64String) {
      console.error('Invalid base64 data string received.');
      return null;
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(base64String, 'base64');

    // Generate a unique filename
    const filename = `stories/${storyId}/page-${pageIndex + 1}-${randomUUID()}.png`;

    console.log(`Uploading image to Vercel Blob: ${filename}`);

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public', // Make the image publicly accessible
      contentType: 'image/png', // Explicitly set content type
      // Optionally add caching headers if needed
      // cacheControlMaxAge: 31536000 // e.g., 1 year
    });

    console.log(`Image uploaded successfully: ${blob.url}`);
    return blob.url; // Return the public URL

  } catch (error) {
    console.error(`Failed to upload image for page ${pageIndex + 1}:`, error);
    return null; // Return null if upload fails
  }
}
// --- End NEW Helper function ---


export async function POST(request: Request) {
  // Create unique ID early so it can be used in filenames
  const storyId = randomUUID();
  let redisClient: any = undefined; // Keep redisClient scoped within the request

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = storyInputSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const storyInput = validationResult.data;

    // Initialize OpenAI client
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Initialize Google Generative AI client
    if (!process.env.GOOGLE_API_KEY) {
      console.error('Missing GOOGLE_API_KEY environment variable.');
      return NextResponse.json({ error: 'Google AI configuration failed: Missing API Key.' }, { status: 500 });
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
        console.error('Missing REDIS_URL environment variable for Redis connection.');
        return NextResponse.json({ error: 'Redis connection failed: Missing configuration.' }, { status: 500 });
      }

      // redisClient is now declared at the outer scope
      try {
          console.log("--- Attempting node-redis Connection ---");
          console.log("Using REDIS_URL:", process.env.REDIS_URL);
          redisClient = createClient({ url: process.env.REDIS_URL });
          redisClient.on('error', (err: Error) => console.error('Redis Client Error', err)); // Add error listener
          await redisClient.connect(); // Connect explicitly
          console.log("node-redis client connected.");
      } catch (connectError) {
          console.error("Failed to connect redis client:", connectError);
          return NextResponse.json({ error: 'Redis connection failed.' }, { status: 500 });
      }
      
      // --- Generate Story ---
      try {
        // Generate story text
        const storyPagesText = await generateStoryText(openai, storyInput);

        // Generate illustrations (passing storyId now)
        const imageUrls = await generateIllustrations(
            generativeModel,
            storyPagesText,
            storyInput,
            storyId // Pass storyId here
        );

        // Combine text and image URLs
        const pagesData: StoryPage[] = storyPagesText.map((text, index) => ({
            text,
            imageUrl: imageUrls[index], // This is now a URL or null
        }));

        // Assemble story data
        console.log("Starting AI title generation...");
        
        // Get the main character's name
        const mainCharacter = storyInput.characters.find(char => char.isMain) || storyInput.characters[0];
        const mainCharacterName = mainCharacter.name || 'the Hero';
        
        // Generate an AI-powered title based on the story content
        let title;
        try {
            title = await generateTitleFromStory(
                openai, 
                storyPagesText, 
                storyInput.ageRange, 
                mainCharacterName
            );
        } catch (titleError) {
            console.error("Failed to generate AI title, using fallback:", titleError);
            title = fallbackGenerateStoryTitle(mainCharacterName);
        }
        
        const subtitle = `A story for ${storyInput.ageRange} year olds`;
        const storyData: StoryData = {
            id: storyId,
            title,
            subtitle,
            createdAt: new Date().toISOString(),
            pages: pagesData,
        };

        // Convert to JSON
        const storyDataJSON = JSON.stringify(storyData);

        // Log size (will be much smaller now)
        const dataSizeInKB = Math.round(storyDataJSON.length / 1024);
        console.log(`Story data size (excluding images): ${dataSizeInKB} KB`);

        // Store in Redis
        await redisClient.set(`story:${storyId}`, storyDataJSON, { EX: 86400 });

        // Return success
        return NextResponse.json({ storyId }, { status: 200 });

      } catch (error: any) {
        console.error('Error in story generation process:', error);
        let errorMessage = 'An unexpected error occurred during story generation';
        const status = 500;

        if (error.message && error.message.includes('OOM command not allowed')) {
          errorMessage = 'Memory limit exceeded when storing the story. This might be due to large image sizes.';
          console.error('Redis OOM error: Memory limit exceeded');
        } else if (error.message && error.message.includes('Failed to generate story text')) {
          errorMessage = 'Failed to generate the story text. Please try again or modify your description.';
        } else if (error.message && error.message.includes('Redis connection failed')) {
          errorMessage = 'Database connection error. Please try again later.';
        } else if (error.message?.includes('Failed to upload image')) {
          errorMessage = 'Part of the story generation failed (image upload). The story might be incomplete.';
        }
        
        return NextResponse.json(
          { error: errorMessage },
          { status }
        );
      }
      // --- End Generate Story ---
      
    } catch (error) {
      console.error('Error initializing Google Generative AI:', error);
      return NextResponse.json(
        { error: 'Failed to initialize Google Generative AI services' },
        { status: 500 }
      );
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
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

async function generateStoryText(openai: OpenAI, storyInput: StoryInput): Promise<string[]> {
  try {
    const { characters, ageRange, storyDescription, storyStyle, storyLengthTargetPages = 6 } = storyInput;
    
    // Find the main character, or use the first character if none is marked as main
    const mainCharacter = characters.find(char => char.isMain) || characters[0];
    
    // Get all character names for the story
    const characterNames = characters.map(c => c.name).filter(name => name.trim() !== '');
    const mainCharacterName = mainCharacter.name || 'the main character';
    
    // Create character details with gender information
    const mainCharacterGender = mainCharacter.gender || 'unspecified';
    const mainCharacterGenderText = mainCharacterGender !== 'unspecified' ? 
      `The main character ${mainCharacterName} is ${mainCharacterGender}.` : '';
      
    // Build other characters details
    const otherCharactersDetails = characters
      .filter(c => !c.isMain && c.name.trim() !== '')
      .map(c => {
        const genderText = c.gender !== 'unspecified' ? ` (${c.gender})` : '';
        return `${c.name}${genderText}`;
      });
    
    // Create length guidance based on requested page count
    let lengthGuidance = `a story of about ${storyLengthTargetPages} paragraphs`;
    if (storyLengthTargetPages <= 4) {
      lengthGuidance += " (a short story)";
    } else if (storyLengthTargetPages >= 8) {
      lengthGuidance += " (a longer story)";
    } else {
      lengthGuidance += " (a medium-length story)";
    }
    
    const characterPrompt = characterNames.length > 1 
      ? `The main character is named ${mainCharacterName}. ${mainCharacterGenderText} Other characters in the story are: ${otherCharactersDetails.join(', ')}.`
      : `The story should be about a character named ${mainCharacterName}. ${mainCharacterGenderText}`;
    
    const systemPrompt = `You are a creative children's story writer. Create ${lengthGuidance} for a ${ageRange} year old child. 
${characterPrompt}
${storyStyle ? `The story should have a ${storyStyle} style and tone.` : ''}
The story should be engaging, age-appropriate, and have a clear beginning, middle, and end. Ensure the story has a clear beginning, middle, and end, prioritizing a complete narrative over hitting an exact paragraph count.
Return ONLY a JSON object with a "storyPages" array containing exactly ${storyLengthTargetPages} strings, each representing one paragraph of the story.
Do not include any explanations, notes, or other text outside the JSON structure.`;

    const userPrompt = `Write a children's story based on this idea: ${storyDescription}`;
    
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
    
    const parsedResponse = JSON.parse(content);
    
    if (!parsedResponse.storyPages || !Array.isArray(parsedResponse.storyPages) || 
        parsedResponse.storyPages.length !== storyLengthTargetPages) {
      console.error(`Expected ${storyLengthTargetPages} paragraphs but received ${parsedResponse.storyPages?.length || 0}`);
      throw new Error('Invalid response format from OpenAI');
    }
    
    return parsedResponse.storyPages;
    
  } catch (error) {
    console.error('Error generating story text:', error);
    throw new Error('Failed to generate story text');
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
    
    // Determine MIME type from Content-Type header or fallback to a default
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    
    console.log(`Successfully fetched and processed character photo, MIME type: ${contentType}`);
    
    return {
      data: base64String,
      mimeType: contentType
    };
  } catch (error) {
    console.error('Error fetching character photo:', error);
    return null;
  }
}

// --- MODIFIED: generateIllustrations function ---
async function generateIllustrations(
  generativeModel: any,
  storyPages: string[],
  storyInput: StoryInput,
  storyId: string // Added storyId parameter
): Promise<(string | null)[]> {
  // Initialize array with nulls for all pages
  const imageResults: (string | null)[] = Array(storyPages.length).fill(null);
  
  // Generate illustrations for all pages
  const indicesToIllustrate = Array.from({ length: storyPages.length }, (_, i) => i); 
  
  for (const index of indicesToIllustrate) {
    try {
      const pageText = storyPages[index];
      const { characters, storyStyle } = storyInput;
      
      // Find the main character, or use the first character if none is marked as main
      const mainCharacter = characters.find(char => char.isMain) || characters[0];
      const mainCharacterName = mainCharacter.name || 'the main character';
      
      // Get all character names for the illustration
      const otherCharacterNames = characters
        .filter(c => !c.isMain && c.name.trim() !== '')
        .map(c => c.name);
      
      // Create richer character descriptions with gender-specific language
      const mainCharacterGenderDescription = (() => {
        if (mainCharacter.gender === 'female') {
          return `a girl named ${mainCharacterName}`;
        } else if (mainCharacter.gender === 'male') {
          return `a boy named ${mainCharacterName}`;
        } else {
          return `a child named ${mainCharacterName}`;
        }
      })();
      
      // Build other characters details with gender
      const otherCharactersDetails = characters
        .filter(c => !c.isMain && c.name.trim() !== '')
        .map(c => {
          if (c.gender === 'female') {
            return `a girl named ${c.name}`;
          } else if (c.gender === 'male') {
            return `a boy named ${c.name}`;
          } else {
            return c.name;
          }
        });
      
      // Create a comprehensive character description to guide the illustration  
      const characterDescription = otherCharactersDetails.length > 0
        ? `The main character is ${mainCharacterGenderDescription}. Other characters that may appear: ${otherCharactersDetails.join(', ')}.`
        : `The main character is ${mainCharacterGenderDescription}.`;
      
      // Create prompt for image generation
      const promptText = `Create a children's book illustration showing: ${pageText}
${characterDescription}
${mainCharacter.gender !== 'unspecified' ? 
  `Ensure the main character clearly appears as ${mainCharacter.gender === 'female' ? 'a girl/female' : 'a boy/male'} in the illustration.` : 
  ''}
${storyStyle ? `The illustration style should be ${storyStyle}.` : ''}
Style: Colorful, whimsical, high-quality children's book illustration, digital art, appealing to children. No text or words in the image.
IMPORTANT: Do not include any text, letters, numbers, or words in the illustration.`;

      console.log(`Generating image for page ${index + 1} using Gemini...`);
      
      // Prepare the content parts for Gemini
      const contentParts: any[] = [{ text: promptText }];
      
      // Check if main character has an uploaded photo
      let characterPhotoData = null;
      if (mainCharacter.uploadedPhotoUrl) {
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
      
      // Extract image data
      const imageCandidate = response.candidates?.[0];
      let base64ImageData: string | null = null;

      if (imageCandidate?.content?.parts) {
        const imagePart = imageCandidate.content.parts.find((part: any) => part.inlineData?.data);
        if (imagePart?.inlineData?.data) {
          const mimeType = imagePart.inlineData.mimeType || 'image/png';
          base64ImageData = `data:${mimeType};base64,${imagePart.inlineData.data}`;
          console.log(`Successfully extracted base64 image data for page ${index + 1}`);
        } else {
          console.warn(`No image part found in Gemini response for page ${index + 1}`);
        }
      } else {
        console.warn(`No valid candidates or parts found in Gemini response for page ${index + 1}`);
      }

      // Upload the image if we got data
      if (base64ImageData) {
        const imageUrl = await uploadImageToBlobStorage(base64ImageData, storyId, index);
        if (imageUrl) {
          imageResults[index] = imageUrl; // Store the URL
          console.log(`Successfully uploaded image and stored URL for page ${index + 1}`);
        } else {
          console.error(`Failed to upload image for page ${index + 1}. URL will be null.`);
        }
      }
      
    } catch (error) {
      console.error(`Error generating illustration for page ${index}:`, error);
      // Continue with other illustrations rather than failing completely
    }
  }
  
  return imageResults;
}

// AI-powered title generation function
async function generateTitleFromStory(
  openai: OpenAI,
  storyPagesText: string[],
  ageRange: string,
  mainCharacterName: string
): Promise<string> {
  try {
    console.log("Generating AI title for story...");
    
    // Combine story text into a single string (use first 2-3 paragraphs to keep prompt size reasonable)
    const combinedStoryText = storyPagesText.slice(0, 3).join("\n\n");
    
    // Create prompts for the OpenAI API
    const systemPrompt = `You are an expert at creating engaging and age-appropriate titles for children's stories. 
Given the following story text, generate a short, creative, and catchy title suitable for a child in the ${ageRange} age range. 
The main character is named ${mainCharacterName}. 
The title should be memorable, reflect the story's theme, and appeal to children.
Output ONLY the title text, nothing else. Do not use quotes around the title.`;

    const userPrompt = `Story Text:\n${combinedStoryText}\n\nGenerate a title:`;
    
    // Make API call to OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 30,
      temperature: 0.8,
    });
    
    // Extract and clean the title from the response
    let title = response.choices[0]?.message?.content?.trim() || "";
    
    // Remove any quotes that might have been added
    title = title.replace(/^["'](.*)["']$/, '$1');
    
    console.log(`AI generated title: "${title}"`);
    return title;
  } catch (error) {
    console.error("Error generating AI title:", error);
    
    // Fallback to a default title pattern if AI generation fails
    console.log("Using fallback title generation method");
    return fallbackGenerateStoryTitle(mainCharacterName);
  }
}

// Fallback title generation in case the AI title generation fails
function fallbackGenerateStoryTitle(mainCharacterName: string): string {
  const titlePrefixes = [
    "The Adventure of",
    "The Magical Journey of",
    "The Incredible Tale of", 
    "The Fantastic Quest of",
    "The Amazing Day with"
  ];
  
  const randomPrefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
  return `${randomPrefix} ${mainCharacterName}`;
}