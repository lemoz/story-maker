import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Define character schema for suggestion API
const characterInfoSchema = z.object({
  name: z.string(),
  gender: z.enum(['female', 'male', 'unspecified']).optional().default('unspecified')
});

// Input validation schema
const storyIdeaRequestSchema = z.object({
  photoUrls: z.array(z.string().url()).min(1, "At least one photo URL is required"),
  characters: z.array(characterInfoSchema).optional(),
  characterNames: z.array(z.string()).optional(), // Kept for backward compatibility
  ageRange: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    console.log("Received request to suggest-story-idea endpoint");
    
    // Parse and validate request body
    const body = await request.json();
    console.log("Request body:", JSON.stringify(body));
    
    const validationResult = storyIdeaRequestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation error:", JSON.stringify(validationResult.error.format()));
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validationResult.error.format() 
      }, { status: 400 });
    }
    
    const { photoUrls, characters = [], characterNames = [], ageRange = '5-7' } = validationResult.data;
    
    // Check if Google API key is configured
    if (!process.env.GOOGLE_API_KEY) {
      console.error('Missing GOOGLE_API_KEY environment variable');
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Google API key' 
      }, { status: 500 });
    }
    
    // Initialize the Google AI client
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      // Configure safety settings to avoid content filtering issues
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" } as any,
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" } as any,
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" } as any,
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" } as any,
      ],
    });
    
    console.log(`Processing ${photoUrls.length} photos for story idea suggestion...`);
    
    // Fetch and process each photo
    const imagePartsPromises = photoUrls.map(async (photoUrl, index) => {
      try {
        console.log(`Fetching photo ${index + 1} from: ${photoUrl}`);
        
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
        
        console.log(`Successfully processed photo ${index + 1}, MIME type: ${mimeType}`);
        
        // Return in the format expected by the Gemini API
        return {
          inlineData: {
            data: base64String,
            mimeType: mimeType
          }
        };
      } catch (error) {
        console.error(`Error processing photo ${index + 1}:`, error);
        throw error;
      }
    });
    
    // Wait for all photos to be processed
    const imageParts = await Promise.all(imagePartsPromises);
    
    console.log(`Successfully processed ${imageParts.length} photos for analysis`);
    
    // Create prompt for Gemini based on characters info if provided
    let characterPrompt = '';
    
    if (characters.length > 0) {
      // Use the detailed character information including gender
      const mainCharacter = characters[0];
      const mainCharacterGender = mainCharacter.gender !== 'unspecified' ? 
        ` The main character is ${mainCharacter.gender}.` : '';
        
      if (characters.length > 1) {
        // Build descriptions for other characters with gender info
        const otherCharactersDetails = characters.slice(1).map(c => {
          const genderInfo = c.gender !== 'unspecified' ? ` (${c.gender})` : '';
          return `${c.name}${genderInfo}`;
        });
        
        characterPrompt = `The main character is ${mainCharacter.name}.${mainCharacterGender} Other characters include: ${otherCharactersDetails.join(', ')}.`;
      } else {
        characterPrompt = `The main character is ${mainCharacter.name}.${mainCharacterGender}`;
      }
    } else if (characterNames.length > 0) {
      // Fallback to just names if no detailed character info available
      const mainCharacter = characterNames[0];
      if (characterNames.length > 1) {
        characterPrompt = `The main character is ${mainCharacter}. Other characters include: ${characterNames.slice(1).join(', ')}.`;
      } else {
        characterPrompt = `The main character is ${mainCharacter}.`;
      }
    }
    
    // Create the text prompt for Gemini
    const textPrompt = `You are an expert at analyzing photos and creating story ideas for children's stories.
${characterPrompt ? characterPrompt : ''}
I've provided ${photoUrls.length} photo(s). Based on these photos, suggest a brief, one-paragraph story idea for a ${ageRange} year old child.

Your response should be imaginative, child-appropriate, and directly tied to what you see in the images.
The response should be 2-3 sentences only, focused on the main premise of a potential story.
DO NOT explain your reasoning or say things like "Based on these images..."
Just give me the story idea directly.`;
    
    // Construct the parts array for the API call
    const promptParts = [
      { text: textPrompt },
      ...imageParts
    ];
    
    console.log("Making Gemini API call for story idea suggestion...");
    
    // Call Gemini to analyze the images and suggest a story idea
    const result = await model.generateContent({
      contents: [{ role: "user", parts: promptParts }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 250,
      },
    });
    
    const response = await result.response;
    const suggestedIdea = response.text().trim();
    
    console.log("Received story idea suggestion from Gemini");
    
    // Return the suggested story idea
    return NextResponse.json({ 
      suggestedIdea,
      photoCount: photoUrls.length 
    });
    
  } catch (error: any) {
    console.error('Error suggesting story idea:', error);
    return NextResponse.json({ 
      error: `Failed to suggest story idea: ${error.message || 'Unknown error'}` 
    }, { status: 500 });
  }
}