"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function NotFoundContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F6F8FF] to-white">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-gray-600">Page not found</p>
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}

function NotFoundWrapper() {
  const searchParams = useSearchParams();
  return <NotFoundContent />;
}

export default function NotFound() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      }
    >
      <NotFoundWrapper />
    </Suspense>
  );
}
