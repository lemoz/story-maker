"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadStripe } from "@stripe/stripe-js";
import {
  Star,
  Clock,
  Users,
  Download,
  Paintbrush,
  Menu,
  ArrowLeft,
} from "lucide-react";
import { z } from "zod";

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

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
    .length(3, "CVC must be 3 digits")
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
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvc: "",
  });
  const [errors, setErrors] = useState<Partial<CardFormData>>({});

  const plans = {
    monthly: {
      price: "$7.99",
      period: "month",
      priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
    },
    annual: {
      price: "$59.99",
      period: "year",
      priceId: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID,
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
      return parts.join(" ");
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

    if (field === "cardNumber") {
      formattedValue = formatCardNumber(value);
    } else if (field === "expiry") {
      formattedValue = formatExpiry(value);
    }

    setPaymentDetails((prev) => ({
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
      cardSchema.parse(paymentDetails);
      setErrors({});
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

  const handlePaymentSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      // Create a checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: plans[selectedPlan].priceId,
          plan: selectedPlan,
        }),
      });

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Failed to load Stripe");

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (showPaymentForm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#9F7AEA]/10 to-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setShowPaymentForm(false)}
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
                <div>
                  <Input
                    type="text"
                    placeholder="Card number"
                    value={paymentDetails.cardNumber}
                    onChange={(e) =>
                      handleInputChange("cardNumber", e.target.value)
                    }
                    maxLength={19}
                    className={`w-full ${
                      errors.cardNumber ? "border-red-500" : ""
                    }`}
                  />
                  {errors.cardNumber && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.cardNumber}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="MM/YY"
                      value={paymentDetails.expiry}
                      onChange={(e) =>
                        handleInputChange("expiry", e.target.value)
                      }
                      maxLength={5}
                      className={errors.expiry ? "border-red-500" : ""}
                    />
                    {errors.expiry && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.expiry}
                      </p>
                    )}
                  </div>
                  <div>
                    <Input
                      type="text"
                      placeholder="CVC"
                      value={paymentDetails.cvc}
                      onChange={(e) => handleInputChange("cvc", e.target.value)}
                      maxLength={3}
                      className={errors.cvc ? "border-red-500" : ""}
                    />
                    {errors.cvc && (
                      <p className="text-red-500 text-sm mt-1">{errors.cvc}</p>
                    )}
                  </div>
                </div>

                {/* <div>
                  <Input
                    type="text"
                    placeholder="Name on card"
                    value={paymentDetails.name}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        name: e.target.value,
                      })
                    }
                    className="w-full"
                  />
                </div> */}

                <Button
                  type="button"
                  onClick={handlePaymentSubmit}
                  className="w-full py-6 text-lg bg-[#9F7AEA] hover:bg-[#805AD5] text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Subscribe"}
                </Button>

                {/* <div className="mt-4 text-center text-sm text-gray-500">
                  Powered by <span className="font-semibold">stripe</span>
                </div> */}
              </div>
            </Card>
          </div>
        </div>
      </div>
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

            {/* <div className="mt-4 text-center text-sm text-gray-500">
              Powered by <span className="font-semibold">stripe</span>
            </div> */}
          </Card>
        </div>
      </div>
    </div>
  );
}
