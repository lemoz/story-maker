"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { usePremiumLimits } from "@/hooks/use-premium-limits";
import { PaywallDialog } from "@/components/paywall-dialog";

type UnlockStoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  onEmailSubmit: (email: string, shouldRedirect?: boolean) => Promise<void>;
};

export function UnlockStoryDialog({
  open,
  onOpenChange,
  storyId,
  onEmailSubmit,
}: UnlockStoryDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [email, setEmail] = useState(session?.user?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { hasReachedMonthlyLimit } = usePremiumLimits();
  const [showPaywall, setShowPaywall] = useState(false);

  // Update email when session changes
  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Basic email validation
    if (!email || !email.includes("@") || !email.includes(".")) {
      return;
    }

    try {
      setIsSubmitting(true);

      // First store the email and create UserStory
      const storeResponse = await fetch("/api/store-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          storyId,
        }),
      });

      if (!storeResponse.ok) {
        throw new Error("Failed to store email");
      }

      // Send the story email
      const sendEmailResponse = await fetch("/api/send-story-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storyId,
          email,
        }),
      });

      if (!sendEmailResponse.ok) {
        console.error("Failed to send story email");
      }

      // After login is complete, check monthly limit
      if (hasReachedMonthlyLimit) {
        setShowPaywall(true);
        setIsSubmitting(false);
        return;
      }

      // If everything is ok, close dialog and redirect
      if (storyId) {
        onOpenChange(false);
        router.push(`/story/${storyId}`);
      } else {
        console.error("No storyId available for redirection");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error submitting email:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          // Não permitir fechar o diálogo enquanto estiver submetendo
          if (!isSubmitting) {
            onOpenChange(isOpen);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 gap-0 border-none bg-white">
          <div className="relative p-6">
            <button
              onClick={() => !isSubmitting && onOpenChange(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
              disabled={isSubmitting}
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
                {isSubmitting ? "Processing..." : "Unlock My Story"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PaywallDialog
        open={showPaywall}
        onOpenChange={setShowPaywall}
        reason="story_limit"
      />
    </>
  );
}
