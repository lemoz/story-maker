import { NextResponse } from 'next/server';
import { createClient } from 'redis';

// StoryData interface
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

export async function GET(request: Request) {
  // Create a local redisClient for this request
  let redisClient: any = undefined;
  
  try {
    // Extract storyId from URL search parameters
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    // Validate storyId
    if (!storyId) {
      return NextResponse.json(
        { error: 'Missing story ID' },
        { status: 400 }
      );
    }

    // Create Redis client using REDIS_URL
    if (!process.env.REDIS_URL) {
      console.error('Missing REDIS_URL environment variable for Redis connection.');
      return NextResponse.json({ error: 'Redis connection failed: Missing configuration.' }, { status: 500 });
    }

    try {
        console.log("--- Attempting node-redis Connection ---");
        console.log("Using REDIS_URL:", process.env.REDIS_URL);
        redisClient = createClient({ url: process.env.REDIS_URL });
        redisClient.on('error', (err: Error) => console.error('Redis Client Error', err));
        await redisClient.connect();
        console.log("node-redis client connected.");
    } catch (connectError) {
        console.error("Failed to connect redis client:", connectError);
        return NextResponse.json({ error: 'Redis connection failed.' }, { status: 500 });
    }

    // Fetch data from Redis
    const storyDataString = await redisClient.get(`story:${storyId}`);
    
    // Close Redis connection after fetching data
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.disconnect();
        console.log("node-redis client disconnected.");
      }
    } catch (disconnectErr) {
      console.warn("Warning: Error disconnecting Redis client:", disconnectErr);
      // Continue processing even if disconnect fails
    }
    
    // Check if story exists
    if (!storyDataString) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }
    
    // Parse the JSON string
    const storyData: StoryData = JSON.parse(storyDataString);

    // Return the story data
    return NextResponse.json(storyData, { status: 200 });
    
  } catch (err) {
    // Log error and return server error response
    console.error('Redis Error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve story' },
      { status: 500 }
    );
  } finally {
    // Extra safety check to ensure Redis connection is closed
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.disconnect();
        console.log("node-redis client disconnected (finally block).");
      }
    } catch (err) {
      console.warn("Warning: Error in finally block when disconnecting Redis:", err);
    }
  }
}