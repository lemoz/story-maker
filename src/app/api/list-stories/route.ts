import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { unstable_cache } from "next/cache";
import { createClient } from "redis";

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on("error", (err: Error) =>
  console.error("Redis Client Error", err)
);
await redisClient.connect();

// Cache function for fetching stories
const getCachedStories = unstable_cache(
  async (email: string) => {
    try {
      // Get all stories IDs from UserStory table
      const userStories = await prisma.userStory.findMany({
        where: { email },
        orderBy: { createdAt: "desc" },
      });

      // Get story details from Redis for each story ID
      const stories = await Promise.all(
        userStories.map(async (userStory) => {
          try {
            // Get story directly from Redis
            const storyData = await redisClient.get(
              `story:${userStory.storyId}`
            );

            if (!storyData) {
              console.log(`Story not found in Redis: ${userStory.storyId}`);
              return null;
            }

            const story = JSON.parse(storyData);

            return {
              id: userStory.storyId,
              title: story.title,
              subtitle: story.subtitle,
              createdAt: userStory.createdAt,
              coverImage: story.pages[0]?.imageUrl || null,
            };
          } catch (error) {
            console.error(`Error fetching story ${userStory.storyId}:`, error);
            return null;
          }
        })
      );

      // Filter out any null values (stories that weren't found in Redis)
      return stories.filter((story) => story !== null);
    } catch (error) {
      console.error("Error in getCachedStories:", error);
      throw error;
    }
  },
  ["user-stories"], // Cache tag
  {
    revalidate: 60, // Revalidate cache every 60 seconds
    tags: ["user-stories"], // Tag for cache invalidation
  }
);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get stories from cache
    const stories = await getCachedStories(session.user.email);

    return NextResponse.json(stories);
  } catch (error) {
    console.error("Error in GET route:", error);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
}
