import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  isLoading: boolean;
}

export function SubmitButton({ isLoading }: SubmitButtonProps) {
  return (
    <div className="pt-4 sm:pt-6">
      <Button 
        type="submit" 
        size="lg" 
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors py-6 rounded-xl shadow-md relative overflow-hidden group"
        disabled={isLoading}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary-foreground/10 to-transparent opacity-0 group-hover:opacity-20 transition-opacity"></div>
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="text-base">Creating Your Story...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="text-lg font-medium">Create My Story</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-2">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </Button>
      <p className="text-xs text-center text-muted-foreground mt-3">
        Your personalized story will be generated in just a few moments.
      </p>
    </div>
  );
} 