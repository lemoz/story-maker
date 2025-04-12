/**
 * API Route: /api/create-customer
 *
 * Creates a new customer in Stripe and attaches a payment method.
 * This is the first step in the subscription process.
 *
 * Request Body:
 * - email: string - Customer's email address
 * - paymentMethodId: string - Stripe payment method ID
 *
 * Response:
 * - customerId: string - Stripe customer ID
 *
 * Error Response:
 * - error: string - Error message
 * - status: 500 - Internal server error
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: Request) {
  try {
    const { email, paymentMethodId } = await request.json();

    // Create a customer
    const customer = await stripe.customers.create({
      email,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ customerId: customer.id });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
