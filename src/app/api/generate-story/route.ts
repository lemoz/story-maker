import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from 'redis';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Input validation schema
const storyInputSchema = z.object({
  characterName: z.string().min(1, "Character name is required"),
  ageRange: z.string({ required_error: "Age range is required" }),
  storyPlotOption: z.enum(["photos", "describe"]),
  storyDescription: z.string().min(5, "Story description must be at least 5 characters long"),
  storyStyle: z.string().optional(),
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

// Declare redisClient at the outer scope
let redisClient: any = undefined;

export async function POST(request: Request) {
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
        // Define safety settings using string literals
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          // Note: Exclude HARM_CATEGORY_CIVIC_INTEGRITY as it wasn't in the library's HarmCategory enum we imported previously, might not be standard
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
          redisClient.on('error', (err) => console.error('Redis Client Error', err)); // Add error listener
          await redisClient.connect(); // Connect explicitly
          console.log("node-redis client connected.");
      } catch (connectError) {
          console.error("Failed to connect redis client:", connectError);
          return NextResponse.json({ error: 'Redis connection failed.' }, { status: 500 });
      }
      
      // Generate story text using OpenAI
      const storyPages = await generateStoryText(openai, storyInput);
      
      // Generate illustrations using Gemini
      const imageResults = await generateIllustrations(
        generativeModel,
        storyPages,
        storyInput
      );
      
      // Combine text and images
      const pagesData: StoryPage[] = storyPages.map((text, index) => ({
        text,
        imageUrl: imageResults[index],
      }));
      
      // Create unique ID and title for the story
      const storyId = randomUUID();
      const title = generateStoryTitle(storyInput.characterName);
      const subtitle = `A story for ${storyInput.ageRange} year olds`;
      
      // Assemble complete story data
      const storyData: StoryData = {
        id: storyId,
        title,
        subtitle,
        createdAt: new Date().toISOString(),
        pages: pagesData,
      };
      
      // Store in Redis (with 24 hour expiration)
      await redisClient.set(`story:${storyId}`, JSON.stringify(storyData), { EX: 86400 }); // Note: EX for seconds
      
      // Return success response with story ID
      return NextResponse.json({ storyId }, { status: 200 });
      
    } catch (error) {
      console.error('Error initializing Google Generative AI:', error);
      return NextResponse.json(
        { error: 'Failed to initialize Google Generative AI services' },
        { status: 500 }
      );
    } finally {
      // Close Redis connection if it's open
      if (redisClient && redisClient.isOpen) {
        await redisClient.disconnect();
        console.log("node-redis client disconnected.");
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
    const { characterName, ageRange, storyDescription, storyStyle } = storyInput;
    
    const systemPrompt = `You are a creative children's story writer. Create a 5-paragraph story for a ${ageRange} year old child. 
The story should be about a character named ${characterName}. 
${storyStyle ? `The story should have a ${storyStyle} style and tone.` : ''}
The story should be engaging, age-appropriate, and have a clear beginning, middle, and end.
Return ONLY a JSON object with a "storyPages" array containing exactly 5 strings, each representing one paragraph of the story.
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
    
    if (!parsedResponse.storyPages || !Array.isArray(parsedResponse.storyPages) || parsedResponse.storyPages.length !== 5) {
      throw new Error('Invalid response format from OpenAI');
    }
    
    return parsedResponse.storyPages;
    
  } catch (error) {
    console.error('Error generating story text:', error);
    throw new Error('Failed to generate story text');
  }
}

async function generateIllustrations(
  generativeModel: any, 
  storyPages: string[], 
  storyInput: StoryInput
): Promise<(string | null)[]> {
  // Initialize array with nulls for all pages
  const imageResults: (string | null)[] = Array(storyPages.length).fill(null);
  
  // Generate illustrations for all pages
  const indicesToIllustrate = Array.from({ length: storyPages.length }, (_, i) => i); // Illustrate all pages
  
  for (const index of indicesToIllustrate) {
    try {
      const pageText = storyPages[index];
      const { characterName, storyStyle } = storyInput;
      
      // Create prompt for image generation
      const promptText = `Create a children's book illustration showing: ${pageText}
The main character's name is ${characterName}.
${storyStyle ? `The illustration style should be ${storyStyle}.` : ''}
Style: Colorful, whimsical, high-quality children's book illustration, digital art, appealing to children. No text or words in the image.`;

      console.log(`Generating image for page ${index + 1} using Gemini...`);
      
      // Call generateContent with the @google/generative-ai structure
      const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: {
          // Remove responseMimeType as JSON mode is not supported for this model
          responseModalities: ["Text", "Image"], // Request BOTH Text and Image
          // candidateCount: 1 // Usually defaults to 1
        },
      });
      
      const response = await result.response; // Get the response object
      
      console.log(`Got response from Gemini for page ${index + 1}`);
      
      // Extract image data with improved parsing
      const imageCandidate = response.candidates?.[0];

      if (imageCandidate && imageCandidate.content && imageCandidate.content.parts) {
        // Find the first part with image data
        const imagePart = imageCandidate.content.parts.find(part => part.inlineData?.data);
        if (imagePart && imagePart.inlineData?.data) {
          const mimeType = imagePart.inlineData.mimeType || 'image/png'; // Use provided mime type
          const dataUri = `data:${mimeType};base64,${imagePart.inlineData.data}`;
          imageResults[index] = dataUri;
          console.log(`Successfully generated image for page ${index + 1} via Gemini`);
        } else {
          console.warn(`No image part found in Gemini response for page ${index + 1}`, JSON.stringify(response, null, 2)); // Log full response if no image
        }
      } else {
        console.warn(`No valid candidates or parts found in Gemini response for page ${index + 1}`, JSON.stringify(response, null, 2)); // Log full response
      }
    } catch (error) {
      console.error(`Error generating illustration for page ${index}:`, error);
      // Continue with other illustrations rather than failing completely
    }
  }
  
  return imageResults;
}

function generateStoryTitle(characterName: string): string {
  const titlePrefixes = [
    "The Adventure of",
    "The Magical Journey of",
    "The Incredible Tale of", 
    "The Fantastic Quest of",
    "The Amazing Day with"
  ];
  
  const randomPrefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
  return `${randomPrefix} ${characterName}`;
}