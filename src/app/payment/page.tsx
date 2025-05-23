"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import {
  Star,
  Clock,
  Download,
  Paintbrush,
  Menu,
  ArrowLeft,
} from "lucide-react";
import { z } from "zod";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUB_KEY!, {
  locale: "en",
});

// Zod schema for card validation
const cardSchema = z.object({
  cardNumber: z
    .string()
    .min(16, "Card number must be at least 16 digits")
    .max(19, "Card number must be at most 19 digits")
    .regex(/^[0-9]+$/, "Card number must contain only numbers")
    .transform((val) => val.replace(/\s/g, "")), // Remove spaces
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, "Expiry must be in MM/YY format")
    .refine((val) => {
      const [month, year] = val.split("/");
      const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
      return expiry > new Date();
    }, "Card has expired"),
  cvc: z
    .string()
    .min(3, "CVC must be at least 3 digits")
    .max(6, "CVC must be at most 6 digits")
    .regex(/^[0-9]+$/, "CVC must contain only numbers"),
});

type CardFormData = z.infer<typeof cardSchema>;

export default function PaymentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">(
    "annual"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [errors, setErrors] = useState<Partial<CardFormData>>({});

  const plans = {
    monthly: {
      price: "$7.99",
      period: "month",
      priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
    },
    annual: {
      price: "$59.99",
      period: "year",
      priceId: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID!,
      savings: "Save 37%",
    },
  };

  const features = [
    {
      icon: <Menu className="w-5 h-5" />,
      text: "Unlimited story creations",
      bgColor: "bg-amber-100",
      iconColor: "text-amber-500",
    },
    {
      icon: <Clock className="w-5 h-5" />,
      text: "Up to 10 characters per story",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-500",
    },
    {
      icon: <Download className="w-5 h-5" />,
      text: "Download stories as PDFs",
      bgColor: "bg-green-100",
      iconColor: "text-green-500",
    },
    {
      icon: <Paintbrush className="w-5 h-5" />,
      text: "Exclusive themes and styles",
      bgColor: "bg-purple-100",
      iconColor: "text-purple-500",
    },
  ];

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join("");
    } else {
      return value;
    }
  };

  // Format expiry date
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4);
    }
    return v;
  };

  const handleInputChange = (field: keyof CardFormData, value: string) => {
    let formattedValue = value;
    console.log("Formatted value:", formattedValue);

    if (field === "cardNumber") {
      formattedValue = formatCardNumber(value);
    } else if (field === "expiry") {
      formattedValue = formatExpiry(value);
    }

    setErrors((prev) => ({
      ...prev,
      [field]: formattedValue,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    try {
      cardSchema.parse(errors);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<CardFormData> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof CardFormData] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubscribe = () => {
    setShowPaymentForm(true);
  };

  if (showPaymentForm) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          appearance: {
            labels: "above",
            variables: {
              colorText: "#424770",
              fontFamily: "system-ui, sans-serif",
            },
          },
        }}
      >
        <PaymentForm
          onBack={() => setShowPaymentForm(false)}
          onSuccess={() => router.push("/success")}
          plan={plans[selectedPlan]}
          email={session?.user?.email || ""}
        />
      </Elements>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#9F7AEA]/10 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Choose your plan</h1>
            <p className="text-xl text-gray-600">
              Select the plan that's right for you and start creating unlimited
              stories today!
            </p>
          </div>

          <Card className="p-8 border-[#9F7AEA]/20">
            <div className="flex items-center justify-center gap-4 mb-8">
              <Star className="w-12 h-12 text-[#9F7AEA]" />
              <div>
                <h2 className="text-2xl font-bold">Premium</h2>
                <p className="text-gray-600">
                  Enjoy unlimited stories and all premium features
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button
                type="button"
                onClick={() => setSelectedPlan("monthly")}
                className={`p-6 rounded-lg border-2 transition-all ${
                  selectedPlan === "monthly"
                    ? "border-[#9F7AEA] bg-[#9F7AEA]/5"
                    : "border-gray-200 hover:border-[#9F7AEA]/50"
                }`}
              >
                <div className="text-xl font-bold">Monthly</div>
                <div className="text-2xl font-bold mt-1">
                  {plans.monthly.price}/month
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan("annual")}
                className={`p-6 rounded-lg border-2 transition-all relative ${
                  selectedPlan === "annual"
                    ? "border-[#9F7AEA] bg-[#9F7AEA]/5"
                    : "border-gray-200 hover:border-[#9F7AEA]/50"
                }`}
              >
                <div className="text-xl font-bold">Annual</div>
                <div className="text-2xl font-bold mt-1">
                  {plans.annual.price}/year
                </div>
                {plans.annual.savings && (
                  <span className="absolute top-2 right-2 bg-[#9F7AEA] text-white text-sm px-2 py-1 rounded">
                    {plans.annual.savings}
                  </span>
                )}
              </button>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">What's included:</h3>
              <div className="grid gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg ${feature.bgColor} flex items-center justify-center ${feature.iconColor}`}
                    >
                      {feature.icon}
                    </div>
                    <span className="text-gray-700">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSubscribe}
              className="w-full py-6 text-lg bg-[#9F7AEA] hover:bg-[#805AD5] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Subscribe"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * PaymentForm Component
 *
 * Handles the direct payment flow with Stripe:
 * 1. Collects card details using Stripe Elements
 * 2. Creates a payment method
 * 3. Creates a customer with the payment method
 * 4. Creates a subscription
 * 5. Confirms the payment
 *
 * Props:
 * - onBack: () => void - Function to go back to plan selection
 * - onSuccess: () => void - Function to handle successful payment
 * - plan: { priceId: string } - Selected plan details
 * - email: string - User's email
 */
function PaymentForm({
  onBack,
  onSuccess,
  plan,
  email,
}: {
  onBack: () => void;
  onSuccess: () => void;
  plan: { priceId: string };
  email: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ cardNumber?: string }>({});

  const handlePaymentSubmit = async () => {
    if (!stripe || !elements) {
      return;
    }

    try {
      setIsLoading(true);

      // Step 1: Create a setup intent and subscription
      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          priceId: plan.priceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create subscription");
      }

      const { clientSecret, subscriptionId } = await response.json();

      // Step 2: Confirm the setup
      const { error: setupError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement)!,
          },
        });

      console.log("Payment intent:", paymentIntent);

      if (setupError) {
        console.log("Setup error:", setupError);
        throw new Error(setupError.message);
      }

      if (!paymentIntent.payment_method) {
        throw new Error("No payment method returned");
      }

      // Step 4: Payment successful
      onSuccess();
    } catch (error) {
      console.error("Error:", error);
      setErrors({
        cardNumber:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#9F7AEA]/10 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={onBack}
            className="flex items-center text-[#805AD5] mb-8 hover:text-[#9F7AEA] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to plans
          </button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Subscribe</h1>
            <p className="text-gray-600">
              Enter your payment information to subscribe to the Premium plan.
            </p>
          </div>

          <Card className="p-8">
            <h2 className="text-xl font-bold mb-6">Payment Details</h2>

            <div className="space-y-4">
              <div className="border p-4 rounded">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "16px",
                        color: "#424770",
                        "::placeholder": {
                          color: "#aab7c4",
                        },
                      },
                      invalid: {
                        color: "#9e2146",
                      },
                    },
                    hidePostalCode: true,
                  }}
                />
              </div>

              {errors.cardNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>
              )}

              <Button
                type="button"
                onClick={handlePaymentSubmit}
                className="w-full py-6 text-lg bg-[#9F7AEA] hover:bg-[#805AD5] text-white"
                disabled={isLoading || !stripe}
              >
                {isLoading ? "Processing..." : "Subscribe"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
