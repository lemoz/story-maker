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

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Get the user ID from the subscription metadata
        const userId = subscription.metadata.userId;
        if (!userId) {
          throw new Error("No user ID found in subscription metadata");
        }

        // Update or create subscription in database
        await prisma.subscription.upsert({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          create: {
            stripeSubscriptionId: subscription.id,
            userId: userId,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              (subscription as unknown as { current_period_end: number })
                .current_period_end * 1000
            ),
            stripeCustomerId: subscription.customer as string,
            status: subscription.status,
            plan: subscription.items.data[0].price.lookup_key || "monthly",
          },
          update: {
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              (subscription as unknown as { current_period_end: number })
                .current_period_end * 1000
            ),
            status: subscription.status,
          },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as unknown as { subscription: string })
          .subscription;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );

          await prisma.subscription.update({
            where: {
              stripeSubscriptionId: subscription.id,
            },
            data: {
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date(
                (subscription as unknown as { current_period_end: number })
                  .current_period_end * 1000
              ),
              status: subscription.status,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.subscription.update({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          data: {
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              (subscription as unknown as { current_period_end: number })
                .current_period_end * 1000
            ),
            status: subscription.status,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.subscription.update({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          data: {
            status: "canceled",
          },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
