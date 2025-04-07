import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { Character } from "@/components/story-form/Story-characters/characters-section";
import { createClient } from "redis";

interface StoryPage {
  text: string;
  imageUrl: string | null;
}

export async function POST(request: Request) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);

    // Get request body
    const body = await request.json();
    const { storyId } = body;

    // Get email from session or request body
    const email = session?.user?.email || body.email;

    // Validate input
    if (!storyId) {
      return NextResponse.json(
        { error: "StoryId is required" },
        { status: 400 }
      );
    }

    // Get email from database
    const userStory = await prisma.userStory.findUnique({
      where: {
        email_storyId: {
          storyId,
          email: email || "", // This will be ignored due to the unique constraint
        },
      },
    });

    if (!userStory) {
      return NextResponse.json(
        { error: "Story not found or email not associated with this story" },
        { status: 404 }
      );
    }

    const userEmail = userStory.email;

    // Initialize SendGrid client
    const sgMail = require("@sendgrid/mail");
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Get story details from database
    const redis = createClient({
      url: process.env.REDIS_URL,
    });
    await redis.connect();

    // Try to get story from Redis first
    const cachedStory = await redis.get(`story:${storyId}`);
    let story;

    if (cachedStory) {
      story = JSON.parse(cachedStory);
    }

    await redis.disconnect();

    if (!story) {
      throw new Error("Story not found");
    }

    // Create email template
    const msg = {
      to: userEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      templateId: process.env.SENDGRID_TEMPLATE_ID,
      dynamicTemplateData: {
        storyTitle: story.title,
        characterNames: story.characters
          .map((char: Character) => char.name)
          .join(", "),
        storyPages: story.pages.map((page: StoryPage, index: number) => ({
          pageNumber: index + 1,
          imageUrl: page.imageUrl || "",
          text: page.text,
        })),
        storyLink: `${process.env.NEXT_PUBLIC_APP_URL}/story/${storyId}`,
        userName: userEmail.split("@")[0],
      },
    };

    // Send email
    await sgMail.send(msg);
    // For now, we'll just return a success message
    console.log(`Sending story ${storyId} to email ${userEmail}`);

    return NextResponse.json(
      {
        success: true,
        message: "Email sent successfully",
        email: userEmail,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending story email:", error);
    return NextResponse.json(
      { error: "Failed to send story email" },
      { status: 500 }
    );
  }
}
