"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function usePremiumLimits() {
  const { data: session } = useSession();
  const [monthlyStoryCount, setMonthlyStoryCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  // Fetch user's subscription status and story count
  useEffect(() => {
    async function fetchUserData() {
      if (!session?.user?.email) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch subscription status
        const subscriptionResponse = await fetch(
          "/api/get-subscription-status"
        );
        if (!subscriptionResponse.ok) {
          throw new Error("Failed to fetch subscription status");
        }
        const subscriptionData = await subscriptionResponse.json();

        console.log("subscriptionData", subscriptionData);
        setIsPremium(subscriptionData.status === "active");

        // Fetch story count
        const countResponse = await fetch("/api/get-user-story-count");
        if (!countResponse.ok) {
          throw new Error("Failed to fetch story count");
        }
        const countData = await countResponse.json();
        console.log("countData", countData);
        setMonthlyStoryCount(countData.count);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [session?.user?.email]);

  // Check if user has reached the monthly story limit
  const hasReachedMonthlyLimit = !isPremium && monthlyStoryCount >= 3;

  // Check if page count is within free tier limit
  const isPageCountAllowed = (pageCount: number) => {
    if (isPremium) return true;
    return pageCount <= 3;
  };

  return {
    isPremium,
    hasReachedMonthlyLimit,
    isPageCountAllowed,
    monthlyStoryCount,
    isLoading,
    error,
  };
}
