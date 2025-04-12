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
      subject: `Your Story "${story.title}" is Ready!`,
      html: `<meta charset="UTF-8">
<title>Your Story is Ready!</title>

<div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
  
  <h1 style="color: #7A5CFA;">Hello, ${userEmail.split("@")[0]}! 🌟</h1>

  <p style="font-size: 18px;">Your story "<strong>${
    story.title
  }</strong>" has been generated!</p>

  <p style="font-size: 16px; color: #666;">Featuring: ${story.characters
    .map((char: Character) => char.name)
    .join(", ")}</p>

  <a href="${
    process.env.NEXTAUTH_URL
  }/story/${storyId}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #7A5CFA; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px;">
    Read Your Story
  </a>

  <p style="margin-top: 30px; font-size: 12px; color: #999;">
    Thank you for using My Hero Story Time! ✨
  </p>

</div>`,
    };
    // Send the email
    await sgMail.send(msg);

    return NextResponse.json(
      {
        success: true,
        message: "Email sent successfully",
        email: userEmail,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in send-story-email route:", error);
    return NextResponse.json(
      { error: "Failed to send story email" },
      { status: 500 }
    );
  }
}
