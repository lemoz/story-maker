/**
 * API Route: /api/create-subscription
 *
 * Creates a new subscription using separate calls to ensure proper data retrieval:
 * 1. Creates the subscription
 * 2. Retrieves the latest invoice
 * 3. Retrieves the payment intent
 *
 * This approach is more reliable than using expand, as it follows
 * Stripe's recommended pattern for accessing nested resources.
 *
 * Request Body:
 * - email: string - Email of the customer
 * - priceId: string - Stripe price ID for the subscription plan
 *
 * Response:
 * - subscriptionId: string - Stripe subscription ID
 * - clientSecret: string - Client secret for confirming the payment
 *
 * Error Response:
 * - error: string - Error message
 * - status: 500 - Internal server error
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { priceId } = await request.json();

    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Step 1: Get or create customer
    console.log("Getting or creating customer...");
    let customer = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });
    let customerId: string;

    if (customer.data.length > 0) {
      customerId = customer.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = newCustomer.id;
    }

    // Step 2: Create a SetupIntent
    console.log("Creating setup intent...");
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    // Step 3: Create the subscription
    console.log("Creating subscription...");
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      metadata: {
        userId: user.id,
      },
    });

    console.log("Subscription flow completed successfully");
    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error("Error in subscription creation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create subscription",
      },
      { status: 500 }
    );
  }
}
