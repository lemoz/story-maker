/**
 * API Route: /api/webhooks/stripe
 *
 * Handles Stripe webhook events to keep subscription status in sync.
 * This route processes various Stripe events to update the database.
 *
 * Events Handled:
 * - checkout.session.completed: Initial subscription creation
 * - invoice.payment_succeeded: Successful payment for subscription
 * - customer.subscription.deleted: Subscription cancellation
 *
 * Security:
 * - Verifies Stripe signature for webhook authenticity
 *
 * Response:
 * - received: boolean - Confirmation of webhook processing
 *
 * Error Response:
 * - error: string - Error message
 * - status: 400/500 - Bad request or internal server error
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

// Helper function to calculate subscription end date
function calculateEndDate(startDate: Date, plan: string): Date {
  const end = new Date(startDate);
  if (plan === "monthly") {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  return end;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  console.log("Webhook received with signature:", signature);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("Webhook event constructed successfully:", event.type);
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "customer.subscription.created": {
        console.log("Processing customer.subscription.created event");
        const subscription = event.data.object as Stripe.Subscription;
        // console.log("Subscription data:", { subscription });

        // Get the user ID from the subscription metadata
        const userId = subscription.metadata.userId;
        if (!userId) {
          console.error("No user ID found in subscription metadata");
          throw new Error("No user ID found in subscription metadata");
        }

        const startDate = new Date(subscription.start_date * 1000);
        const plan =
          subscription.items.data[0].plan.interval === "year"
            ? "annual"
            : "monthly";
        const endDate = calculateEndDate(startDate, plan);

        console.log("Creating subscription in database for user:", userId);

        // First check if subscription already exists
        const existingSubscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (existingSubscription) {
          console.log("Subscription already exists, updating...");
          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              status: subscription.status,
              startDate: startDate,
              endDate: endDate,
              canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000)
                : null,
            },
          });
        } else {
          console.log("Creating new subscription...");
          await prisma.subscription.create({
            data: {
              stripeSubscriptionId: subscription.id,
              userId: userId,
              stripePriceId: subscription.items.data[0].price.id,
              stripeCustomerId: subscription.customer as string,
              status: subscription.status,
              plan: plan,
              startDate: startDate,
              endDate: endDate,
              canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000)
                : null,
            },
          });
        }

        break;
      }

      case "invoice.payment_succeeded": {
        console.log("Processing invoice.payment_succeeded event");
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) {
          console.error("No subscription ID found in invoice");
          break;
        }

        console.log("Updating subscription for invoice:", subscriptionId);
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );

        const startDate = new Date(subscription.start_date * 1000);
        const plan =
          subscription.items.data[0].plan.interval === "year"
            ? "annual"
            : "monthly";
        const endDate = calculateEndDate(startDate, plan);

        await prisma.subscription.update({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          data: {
            stripePriceId: subscription.items.data[0].price.id,
            status: subscription.status,
            startDate: startDate,
            endDate: endDate,
            canceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000)
              : null,
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        console.log("Processing customer.subscription.updated event");
        const subscription = event.data.object as Stripe.Subscription;

        const startDate = new Date(subscription.start_date * 1000);
        const plan =
          subscription.items.data[0].plan.interval === "year"
            ? "annual"
            : "monthly";
        const endDate = calculateEndDate(startDate, plan);

        await prisma.subscription.update({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          data: {
            stripePriceId: subscription.items.data[0].price.id,
            status: subscription.status,
            startDate: startDate,
            endDate: endDate,
            canceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000)
              : null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        console.log("Processing customer.subscription.deleted event");
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Canceling subscription:", subscription.id);

        await prisma.subscription.update({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          data: {
            status: "canceled",
            canceledAt: new Date(),
          },
        });
        break;
      }

      default: {
        console.log("Unhandled event type:", event.type);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
