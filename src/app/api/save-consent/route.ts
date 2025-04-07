import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { terms, marketing } = await request.json();

    // Update user consent
    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        hasAcceptedTerms: terms,
        hasAcceptedMarketing: marketing,
        termsAcceptedAt: terms ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        hasAcceptedTerms: user.hasAcceptedTerms,
        hasAcceptedMarketing: user.hasAcceptedMarketing,
        termsAcceptedAt: user.termsAcceptedAt,
      },
    });
  } catch (error) {
    console.error("Error saving consent:", error);
    return NextResponse.json(
      { error: "Failed to save consent" },
      { status: 500 }
    );
  }
}
