"use client";

import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Image, Download, Palette } from "lucide-react";
import { useRouter } from "next/navigation";

type PaywallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "story_limit" | "page_limit";
};

export function PaywallDialog({
  open,
  onOpenChange,
  reason,
}: PaywallDialogProps) {
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 border-none bg-white">
        <div className="relative p-6">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Unlock Unlimited Adventures!✨
            </h2>
            <p className="text-base text-muted-foreground mt-2">
              Get access to premium features and create even more magical
              stories!
            </p>
          </div>

          <div className="mt-8 space-y-6">
            {/* Feature list */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Star className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium">Unlimited Story Creations</h3>
                  <p className="text-sm text-muted-foreground">
                    Create as many stories as you want — no monthly limits!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Image className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium">Longer Stories</h3>
                  <p className="text-sm text-muted-foreground">
                    Expand your adventures with up to 10 pages.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Download className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium">Download as PDF</h3>
                  <p className="text-sm text-muted-foreground">
                    Save your stories forever and share them easily.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Palette className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium">Exclusive Themes and Styles</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize your story's vibe with special options.
                  </p>
                </div>
              </div>
            </div>

            {/* Contextual message based on reason */}
            {reason === "story_limit" && (
              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                Free users can create up to 2 stories per month. Upgrade to
                create unlimited stories!
              </div>
            )}
            {reason === "page_limit" && (
              <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                Free users are limited to 3 pages per story. Upgrade to create
                longer stories!
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                className="w-full h-12 text-base bg-[#9F7AEA] hover:bg-[#805AD5]"
                onClick={() => {
                  // Here you would implement the upgrade logic
                  router.push("/payment");
                }}
              >
                Upgrade to Premium
              </Button>
              <button
                onClick={() => onOpenChange(false)}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
