import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET(request: Request) {
  // Get the previously shown story ID from the query param if available
  const url = new URL(request.url);
  const previousStoryId = url.searchParams.get('previousId') || '';
  let redisClient: any = undefined;
  
  try {
    // Initialize Redis client
    if (!process.env.REDIS_URL) {
      return NextResponse.json(
        { error: 'Redis configuration is missing' },
        { status: 500 }
      );
    }
    
    try {
      redisClient = createClient({ url: process.env.REDIS_URL });
      redisClient.on('error', (err) => console.error('Redis Client Error', err));
      await redisClient.connect();
      console.log("Connected to Redis successfully");
    } catch (connectError) {
      console.error("Failed to connect to Redis:", connectError);
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      );
    }
    
    // Get all keys that start with 'story:'
    const storyKeys = await redisClient.keys('story:*');
    
    if (!storyKeys || storyKeys.length === 0) {
      return NextResponse.json(
        { error: 'No stories found' },
        { status: 404 }
      );
    }
    
    // If we have a previous story ID, filter it out to avoid showing the same story
    let filteredStoryKeys = storyKeys;
    if (previousStoryId) {
      filteredStoryKeys = storyKeys.filter(key => !key.includes(previousStoryId));
      // If filtering removed all keys, revert to all keys
      if (filteredStoryKeys.length === 0) {
        filteredStoryKeys = storyKeys;
      }
    }
    
    // Pick a random story key
    const randomIndex = Math.floor(Math.random() * filteredStoryKeys.length);
    const randomStoryKey = filteredStoryKeys[randomIndex];
    
    // Get the story data
    const storyData = await redisClient.get(randomStoryKey);
    
    if (!storyData) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }
    
    // Parse the story data
    const story = JSON.parse(storyData);
    
    // Return a simplified version with just what we need for the preview
    return NextResponse.json({
      id: story.id,
      title: story.title,
      subtitle: story.subtitle,
      createdAt: story.createdAt,
      previewPage: story.pages[0], // Just return the first page for preview
      totalPages: story.pages.length
    });
    
  } catch (error) {
    console.error('Error fetching random story:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the story' },
      { status: 500 }
    );
  } finally {
    // Close Redis connection if it's open
    if (redisClient && redisClient.isOpen) {
      await redisClient.disconnect();
      console.log("Redis client disconnected");
    }
  }
}