import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

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

    // Fetch data from Vercel KV
    const storyData = await kv.get<StoryData>(`story:${storyId}`);

    // Check if story exists
    if (!storyData) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    // Return the story data
    return NextResponse.json(storyData, { status: 200 });
    
  } catch (err) {
    // Log error and return server error response
    console.error('KV Error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve story' },
      { status: 500 }
    );
  }
}