"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";

const Confetti = dynamic(() => import("react-confetti"), {
  ssr: false,
});

function SuccessContent() {
  const router = useRouter();
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    // Set initial window size
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Handle window resize
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#9F7AEA]/10 to-white py-12">
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={500}
        gravity={0.2}
        colors={["#9F7AEA", "#805AD5", "#6B46C1", "#553C9A"]}
      />
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Welcome to Premium!</h1>
            <p className="text-gray-600">
              Your subscription has been successfully activated.
            </p>
          </div>

          <Card className="p-8 mb-8">
            <h2 className="text-xl font-bold mb-4">What's Next?</h2>
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-600">1</span>
                </div>
                <p className="text-gray-600">
                  Create unlimited stories with our premium features
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-600">2</span>
                </div>
                <p className="text-gray-600">
                  Create longer stories with up to 10 pages per story
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-purple-600">3</span>
                </div>
                <p className="text-gray-600">
                  Download your stories as beautiful PDFs to share with family
                  and friends
                </p>
              </div>
            </div>
          </Card>

          <Button
            onClick={() => router.push("/create")}
            className="w-full py-6 text-lg bg-[#9F7AEA] hover:bg-[#805AD5] text-white"
          >
            Create a New Story
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SearchParamsWrapper() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  return <SuccessContent />;
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      }
    >
      <SearchParamsWrapper />
    </Suspense>
  );
}
