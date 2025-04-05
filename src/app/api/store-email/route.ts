import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// Basic email validation
const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

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
    if (!email || !storyId) {
      return NextResponse.json(
        { error: "Email and storyId are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Store email and storyId in the database
    await prisma.userStory.upsert({
      where: {
        email_storyId: {
          email,
          storyId,
        },
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        email,
        storyId,
      },
    });

    return NextResponse.json(
      { success: true, message: "Email stored successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error storing email:", error);
    return NextResponse.json(
      { error: "Failed to store email" },
      { status: 500 }
    );
  }
}
