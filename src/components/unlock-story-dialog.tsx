"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type UnlockStoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  onEmailSubmit: (email: string) => Promise<void>;
};

export function UnlockStoryDialog({
  open,
  onOpenChange,
  storyId,
  onEmailSubmit,
}: UnlockStoryDialogProps) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Basic email validation
    if (!email || !email.includes("@") || !email.includes(".")) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Call the parent handler and wait for it to complete
      await onEmailSubmit(email);

      // Only redirect after email submission is complete
      if (storyId) {
        router.push(`/story/${storyId}`);
      } else {
        console.error("No storyId available for redirection");
      }
    } catch (error) {
      console.error("Error submitting email:", error);
    } finally {
      setIsSubmitting(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 border-none bg-white">
        <div className="relative p-6">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Unlock Your Story!
            </h2>
            <p className="text-base text-muted-foreground mt-2">
              Your story is ready! Enter your email to view and save it.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="h-12 px-4 text-base"
                required
              />
              <p className="text-sm text-muted-foreground">
                We'll send you a copy of your story and let you know about
                future updates.
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-12 text-base bg-[#9F7AEA] hover:bg-[#805AD5]"
            >
              View My Story
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
