import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { storyId } = await request.json();

    if (!session?.user?.email || !storyId) {
      return NextResponse.json(
        { error: "Email and storyId are required" },
        { status: 400 }
      );
    }

    // Store story association
    await prisma.userStory.create({
      data: {
        email: session.user.email,
        storyId,
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
