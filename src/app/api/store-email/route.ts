import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { storyId, email: bodyEmail } = await request.json();

    // Get email from session or request body
    const email = session?.user?.email || bodyEmail;

    if (!email || !storyId) {
      return NextResponse.json(
        { error: "Email and storyId are required" },
        { status: 400 }
      );
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          emailVerified: new Date(),
        },
      });
    }

    // Store story association
    await prisma.userStory.create({
      data: {
        email,
        storyId,
        userId: user.id, // Include the user ID in the association
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error storing story association:", error);
    return NextResponse.json(
      { error: "Failed to store story association" },
      { status: 500 }
    );
  }
}
