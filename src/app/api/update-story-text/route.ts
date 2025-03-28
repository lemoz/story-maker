import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { z } from 'zod';

// Validation schema for request body
const updateTextSchema = z.object({
  storyId: z.string().min(1),
  pageIndex: z.number().int().min(0),
  newText: z.string().min(1)
});

// Declare redisClient at the outer scope
let redisClient: any = undefined;

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateTextSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { storyId, pageIndex, newText } = validationResult.data;

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

    // Update the text for the specified page
    storyData.pages[pageIndex].text = newText;

    // Save the updated story data back to Redis
    await redisClient.set(storyKey, JSON.stringify(storyData));

    // Return success response
    return NextResponse.json(
      { success: true, message: 'Story text updated successfully' },
      { status: 200 }
    );
    
  } catch (err) {
    // Log error and return server error response
    console.error('Error updating story text:', err);
    return NextResponse.json(
      { error: 'Failed to update story text' },
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