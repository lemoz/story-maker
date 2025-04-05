"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function usePremiumLimits() {
  const { data: session } = useSession();
  const [monthlyStoryCount, setMonthlyStoryCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's story count for the current month
  useEffect(() => {
    async function fetchStoryCount() {
      if (!session?.user?.email) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/get-user-story-count");
        if (!response.ok) {
          throw new Error("Failed to fetch story count");
        }
        const data = await response.json();
        setMonthlyStoryCount(data.count);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStoryCount();
  }, [session?.user?.email]);

  // Check if user is premium (you would implement your own logic here)
  const isPremium = session?.user?.email?.endsWith("@premium.com") || false; // Temporary check, replace with your actual premium check

  // Check if user has reached the monthly story limit
  const hasReachedMonthlyLimit = !isPremium && monthlyStoryCount >= 2;

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
