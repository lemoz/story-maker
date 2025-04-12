import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, storyId } = await request.json();

    if (!email || !storyId) {
      return NextResponse.json(
        { error: "Email and storyId are required" },
        { status: 400 }
      );
    }

    // First, try to find or create the user
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
      },
    });

    // Then create the UserStory association if it doesn't exist
    const existingUserStory = await prisma.userStory.findFirst({
      where: {
        userId: user.id,
        storyId: storyId,
      },
    });

    let userStory;
    if (!existingUserStory) {
      userStory = await prisma.userStory.create({
        data: {
          userId: user.id,
          storyId,
          email,
        },
      });
    } else {
      userStory = existingUserStory;
    }

    return NextResponse.json({ success: true, userStory });
  } catch (error) {
    console.error("Error in store-email:", error);
    return NextResponse.json(
      { error: "Failed to store email" },
      { status: 500 }
    );
  }
}
