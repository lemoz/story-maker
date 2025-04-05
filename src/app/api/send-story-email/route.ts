import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

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

    // Here you would implement the email sending logic
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
