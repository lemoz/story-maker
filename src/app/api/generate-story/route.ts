import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { VertexAI } from '@google-cloud/vertexai';
import { kv } from '@vercel/kv';
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
    
    // Initialize Google Vertex AI client
    if (!process.env.GOOGLE_CREDENTIALS_BASE64) {
      return NextResponse.json(
        { error: 'Google Cloud credentials are not configured' },
        { status: 500 }
      );
    }
    
    try {
      // Decode and parse the base64 encoded Google credentials
      const decodedCredentials = Buffer.from(
        process.env.GOOGLE_CREDENTIALS_BASE64,
        'base64'
      ).toString();
      
      const credentials = JSON.parse(decodedCredentials);
      const projectId = credentials.project_id;
      
      const vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1',
        googleAuthOptions: {
          credentials,
        },
      });
      
      const generativeModel = vertexAI.preview.getGenerativeModel({
        model: 'imagegeneration@006',
      });
      
      // Generate story text using OpenAI
      const storyPages = await generateStoryText(openai, storyInput);
      
      // Generate illustrations using Vertex AI
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
      
      // Store in Vercel KV (with 24 hour expiration)
      await kv.set(`story:${storyId}`, storyData, { ex: 86400 });
      
      // Return success response with story ID
      return NextResponse.json({ storyId }, { status: 200 });
      
    } catch (error) {
      console.error('Error initializing Google Cloud:', error);
      return NextResponse.json(
        { error: 'Failed to initialize Google Cloud services' },
        { status: 500 }
      );
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
  
  // Indices to illustrate (first, middle, and last pages)
  const indicesToIllustrate = [0, 2, 4];
  
  for (const index of indicesToIllustrate) {
    try {
      const pageText = storyPages[index];
      const { characterName, storyStyle } = storyInput;
      
      // Create prompt for image generation
      const promptText = `Create a children's book illustration showing: ${pageText}
The main character's name is ${characterName}.
${storyStyle ? `The illustration style should be ${storyStyle}.` : ''}
Style: Colorful, whimsical, high-quality children's book illustration, digital art, appealing to children`;

      const negativePrompt = "scary, violent, disturbing, adult content, text, words, letters, ugly, deformed, disfigured, low quality";
      
      // Create the request object
      const request = {
        prompt: promptText,
        negativePrompt: negativePrompt,
        sampleCount: 1
      };
      
      // Call Imagen
      const resp = await generativeModel.generateContent(request);
      
      // Await the response
      const response = await resp.response;
      
      // Extract image data
      if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
        // Format as a data URI
        const dataUri = `data:image/png;base64,${response.candidates[0].content.parts[0].inlineData.data}`;
        imageResults[index] = dataUri;
      } else {
        console.warn(`Image data not found in the expected structure for page ${index}`);
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