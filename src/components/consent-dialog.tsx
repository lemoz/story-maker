"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent: (data: { terms: boolean; marketing: boolean }) => Promise<void>;
}

export function ConsentDialog({
  open,
  onOpenChange,
  onConsent,
}: ConsentDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    router.push("/");
  };

  const handleSubmit = async () => {
    if (!termsAccepted) return;

    try {
      setIsSubmitting(true);
      await onConsent({
        terms: termsAccepted,
        marketing: marketingAccepted,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving consent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-[425px] p-6 shadow-lg rounded-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-3xl font-bold text-center text-[#A78BFA] mb-0">
            One Quick Step!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Before we continue, we need your agreement to our terms.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-6">
          <div className="space-y-6">
            <div className="flex items-start space-x-3 rounded-lg">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked: boolean) =>
                  setTermsAccepted(checked)
                }
                className="mt-0.5"
              />
              <div className="grid gap-1.5 leading-none">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-sm font-medium">I agree to the</span>
                  <Link
                    href="/terms"
                    className="text-[#A78BFA] hover:underline text-sm font-medium"
                    target="_blank"
                  >
                    Terms of Service
                  </Link>
                  <span className="text-sm font-medium">and</span>
                  <Link
                    href="/privacy"
                    className="text-[#A78BFA] hover:underline text-sm font-medium"
                    target="_blank"
                  >
                    Privacy Policy
                  </Link>
                </div>
                <p className="text-[0.8rem] text-muted-foreground">
                  Required to continue
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="marketing"
                checked={marketingAccepted}
                onCheckedChange={(checked: boolean) =>
                  setMarketingAccepted(checked)
                }
                className="mt-0.5"
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="marketing"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Yes, send me email updates about new features and special
                  offers
                </Label>
                <p className="text-[0.8rem] text-muted-foreground">Optional</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!termsAccepted || isSubmitting}
              className="w-full bg-[#A78BFA] hover:bg-[#A78BFA]/90 text-white rounded-full py-6 text-lg font-medium"
            >
              {isSubmitting ? "Saving..." : "Agree & Continue Creation"}
            </Button>
            <button
              type="button"
              onClick={handleClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
