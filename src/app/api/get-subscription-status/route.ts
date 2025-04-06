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

    // Get the user's subscription status
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if subscription exists and is active
    const isActive =
      user.subscription?.status === "active" &&
      user.subscription?.stripeCurrentPeriodEnd > new Date();

    console.log({
      status: isActive ? "active" : "inactive",
      plan: user.subscription?.plan || null,
      currentPeriodEnd: user.subscription?.stripeCurrentPeriodEnd || null,
    });

    return NextResponse.json({
      status: isActive ? "active" : "inactive",
      plan: user.subscription?.plan || null,
      currentPeriodEnd: user.subscription?.stripeCurrentPeriodEnd || null,
    });
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    );
  }
}
