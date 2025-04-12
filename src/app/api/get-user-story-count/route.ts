import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  try {
    // Get the session
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the start of the current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Get the end of the current month
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Count stories created by the user in the current month
    const count = await prisma.userStory.count({
      where: {
        email: session.user.email,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error getting user story count:", error);
    return NextResponse.json(
      { error: "Failed to get story count" },
      { status: 500 }
    );
  }
}
