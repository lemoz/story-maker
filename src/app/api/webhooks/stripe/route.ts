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
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  const session = event.data.object as Stripe.Checkout.Session;

  try {
    switch (event.type) {
      case "checkout.session.completed":
        // Retrieve the subscription details from Stripe
        const subscription = (await stripe.subscriptions.retrieve(
          session.subscription as string
        )) as unknown as Stripe.Response<Stripe.Subscription>;

        // Update or create subscription in database
        await prisma.subscription.upsert({
          where: {
            stripeSubscriptionId: subscription.id,
          },
          create: {
            stripeSubscriptionId: subscription.id,
            userId: session.metadata?.userId!,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              (subscription as any).current_period_end * 1000
            ),
            stripeCustomerId: subscription.customer as string,
            status: subscription.status,
            plan: session.metadata?.plan || "monthly",
          },
          update: {
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              (subscription as any).current_period_end * 1000
            ),
            status: subscription.status,
          },
        });
        break;

      case "invoice.payment_succeeded":
        // Retrieve the subscription details from Stripe
        const paidSubscription = (await stripe.subscriptions.retrieve(
          session.subscription as string
        )) as unknown as Stripe.Response<Stripe.Subscription>;

        // Update the subscription in database
        await prisma.subscription.update({
          where: {
            stripeSubscriptionId: paidSubscription.id,
          },
          data: {
            stripePriceId: paidSubscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
              (paidSubscription as any).current_period_end * 1000
            ),
            status: paidSubscription.status,
          },
        });
        break;

      case "customer.subscription.deleted":
        // Update the subscription status in database
        await prisma.subscription.update({
          where: {
            stripeSubscriptionId: session.subscription as string,
          },
          data: {
            status: "canceled",
          },
        });
        break;
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
