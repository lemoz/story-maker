import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

// Validation schema for request body
const regenerateImageSchema = z.object({
  storyId: z.string().min(1),
  pageIndex: z.number().int().min(0),
  comment: z.string().optional()
});

// Declare redisClient at the outer scope
let redisClient: any = undefined;

// Helper function to upload Base64 image to Vercel Blob
async function uploadImageToBlobStorage(base64Data: string, storyId: string, pageIndex: number): Promise<string | null> {
  try {
    // Check if BLOB_READ_WRITE_TOKEN is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('Missing BLOB_READ_WRITE_TOKEN environment variable.');
      return null;
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
    const filename = `stories/${storyId}/regen-page-${pageIndex + 1}-${randomUUID()}.png`;

    console.log(`Uploading regenerated image to Vercel Blob: ${filename}`);

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/png'
    });

    console.log(`Regenerated image uploaded successfully: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error(`Failed to upload regenerated image for page ${pageIndex + 1}:`, error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = regenerateImageSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { storyId, pageIndex, comment } = validationResult.data;

    // Create Redis client using REDIS_URL
    if (!process.env.REDIS_URL) {
      console.error('Missing REDIS_URL environment variable for Redis connection.');
      return NextResponse.json({ error: 'Redis connection failed: Missing configuration.' }, { status: 500 });
    }

    try {
      console.log("--- Attempting node-redis Connection ---");
      redisClient = createClient({ url: process.env.REDIS_URL });
      redisClient.on('error', (err: Error) => console.error('Redis Client Error', err));
      await redisClient.connect();
      console.log("node-redis client connected.");
    } catch (connectError) {
      console.error("Failed to connect redis client:", connectError);
      return NextResponse.json({ error: 'Redis connection failed.' }, { status: 500 });
    }

    // Initialize Google Generative AI client
    if (!process.env.GOOGLE_API_KEY) {
      console.error('Missing GOOGLE_API_KEY environment variable.');
      return NextResponse.json({ error: 'Google AI configuration failed: Missing API Key.' }, { status: 500 });
    }

    // Initialize the Google AI client with the API key
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    // Get the specific Gemini model for image generation
    const generativeModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" } as any,
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" } as any,
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" } as any,
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" } as any,
      ],
    });

    // Fetch story data from Redis
    const storyKey = `story:${storyId}`;
    const storyDataString = await redisClient.get(storyKey);
    
    // Check if story exists
    if (!storyDataString) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }
    
    // Parse the JSON string
    const storyData = JSON.parse(storyDataString);

    // Validate page index
    if (pageIndex < 0 || pageIndex >= storyData.pages.length) {
      return NextResponse.json(
        { error: 'Invalid page index' },
        { status: 400 }
      );
    }

    // Get the text for the current page
    const pageText = storyData.pages[pageIndex].text;

    // Create enhanced, structured prompt for image regeneration with strong anti-text measures
    let promptText = `
⚠️ IMPORTANT - ILLUSTRATION ONLY: DO NOT INCLUDE ANY TEXT IN THE IMAGE ⚠️

CREATE A CHILDREN'S BOOK ILLUSTRATION showing this scene:
${pageText.replace(/\b[A-Z]{2,}\b/g, word => word.toLowerCase())}

STYLE GUIDANCE:
Primary style: Professional children's book illustration
High-quality digital art with clear focal points
Visually engaging and appropriate for young readers

ARTISTIC DIRECTION:
- Create a clean, well-composed illustration with attention to lighting and depth
- Use vibrant, harmonious colors appropriate for children's illustrations
- Focus on expressive character faces and clear storytelling
- Keep backgrounds detailed but not overwhelming
- Maintain visual consistency with the story's established style
- Show objects like books, papers, or signs WITHOUT any visible text on them

⚠️ STRICT REQUIREMENTS - READ CAREFULLY: ⚠️
1. ABSOLUTELY NO TEXT OR LETTERS of any kind in the image
2. NO WORDS, WRITING, LETTERS, NUMBERS, OR TYPOGRAPHY anywhere in the illustration
3. REMOVE ALL TEXT from any objects like books, signs, clothing, etc.
4. DO NOT render any words from the story text as visual elements
5. If you need to show reading materials, show BLANK pages or abstract patterns only
6. ANY signs or displays should be BLANK or show simple abstract symbols only

CREATE AN IMAGE ONLY - NO TEXT WHATSOEVER - This is critical for the book production process.
`.trim();
      
    // Add user comment to the prompt if provided, with clear formatting and reinforced no-text warnings
    if (comment && comment.trim()) {
      promptText += `

USER SPECIFICATIONS:
${comment.trim()}

⚠️ CRITICAL REMINDER: Absolutely NO TEXT, letters, words, writing, numbers, or typography should appear anywhere in the illustration. Generate the image only. IMAGE ONLY. EXCLUDE ALL TEXT.
`;
    }
    
    // Add a final reinforcement of the no-text requirement at the end of the prompt
    promptText += `

FINAL INSTRUCTION: This image MUST NOT contain any text, letters, numbers, writing, or readable elements whatsoever.
`;
    
    // NOTE: For enhanced consistency, we could fetch character photos from the story data
    // and include them as reference images in the regeneration request, similar to the
    // original story generation process. This would help maintain character appearance.
    // TODO: Consider implementing character photo reference in future updates.

    console.log(`Generating new image for page ${pageIndex + 1} using Gemini...`);
    
    // Call Gemini to generate an image
    try {
      // Call generateContent with the @google/generative-ai structure
      // Use type assertion to work around TypeScript errors while keeping functionality
      const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: {
          responseModalities: ["Text", "Image"],
        },
      } as any);
      
      const response = await result.response;
      
      // Extract image data
      const imageCandidate = response.candidates?.[0];
      let base64ImageData: string | null = null;

      if (imageCandidate?.content?.parts) {
        const imagePart = imageCandidate.content.parts.find((part: any) => part.inlineData?.data);
        if (imagePart?.inlineData?.data) {
          const mimeType = imagePart.inlineData.mimeType || 'image/png';
          base64ImageData = `data:${mimeType};base64,${imagePart.inlineData.data}`;
          console.log(`Successfully extracted base64 image data for page ${pageIndex + 1}`);
        } else {
          console.warn(`No image part found in Gemini response for page ${pageIndex + 1}`);
          return NextResponse.json(
            { error: 'Failed to generate image' },
            { status: 500 }
          );
        }
      } else {
        console.warn(`No valid candidates or parts found in Gemini response for page ${pageIndex + 1}`);
        return NextResponse.json(
          { error: 'Failed to generate image' },
          { status: 500 }
        );
      }

      // Upload the image if we got data
      if (base64ImageData) {
        const imageUrl = await uploadImageToBlobStorage(base64ImageData, storyId, pageIndex);
        if (imageUrl) {
          // Update the image URL for the page
          storyData.pages[pageIndex].imageUrl = imageUrl;
          
          // Save the updated story data back to Redis
          await redisClient.set(storyKey, JSON.stringify(storyData));
          
          // Return success response with the new image URL
          return NextResponse.json(
            { success: true, message: 'Image regenerated successfully', imageUrl },
            { status: 200 }
          );
        } else {
          return NextResponse.json(
            { error: 'Failed to upload regenerated image' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to generate image data' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error generating image with Gemini:', error);
      return NextResponse.json(
        { error: 'Failed to generate image with AI' },
        { status: 500 }
      );
    }
  } catch (err) {
    // Log error and return server error response
    console.error('Error regenerating image:', err);
    return NextResponse.json(
      { error: 'Failed to regenerate image' },
      { status: 500 }
    );
  } finally {
    // Close Redis connection if it's open
    if (redisClient && redisClient.isOpen) {
      await redisClient.disconnect();
      console.log("node-redis client disconnected.");
    }
  }
}