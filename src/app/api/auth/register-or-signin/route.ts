import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // If not, create new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          emailVerified: new Date(), // Mark as verified since we're auto-creating
        },
      });
    }

    // Create a JWT token
    const token = jwt.sign(
      {
        email: user.email,
        id: user.id,
        name: user.name,
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "30d" }
    );

    // Set the token in a HTTP-only cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: "next-auth.session-token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Error in register-or-signin:", error);
    return NextResponse.json(
      { error: "Failed to process registration/sign in" },
      { status: 500 }
    );
  }
}
