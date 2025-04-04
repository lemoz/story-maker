import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { FixedButton } from "./fixedButton";
import { StoryState } from "@/types/states";

interface StoryDetailsSectionProps {
  ageRange: string;
  onAgeRangeChange: (value: string) => void;
  storyStyle: string;
  onStoryStyleChange: (value: string) => void;
  storyLengthTargetPages: number;
  onStoryLengthChange: (value: number) => void;
  isPremium?: boolean;
  onGoNext?: () => void;
}

export function StoryDetailsSection({
  ageRange,
  onAgeRangeChange,
  storyStyle,
  onStoryStyleChange,
  storyLengthTargetPages,
  onStoryLengthChange,
  isPremium = false,
  onGoNext,
}: StoryDetailsSectionProps) {
  const [showPaywallDialog, setShowPaywallDialog] = useState(false);

  const handleStoryLengthChange = (newValue: number[]) => {
    const newLength = newValue[0];
    if (!isPremium && newLength > 3) {
      setShowPaywallDialog(true);
      onStoryLengthChange(3); // Reset to 3 pages for free users
    } else {
      onStoryLengthChange(newLength);
    }
  };

  const isValid = ageRange && storyStyle && storyLengthTargetPages >= 3;

  return (
    <Card className="shadow-sm border-primary/10">
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="age-range" className="text-sm font-medium">
              Child's Age Range
            </Label>
            <Select value={ageRange} onValueChange={onAgeRangeChange}>
              <SelectTrigger
                id="age-range"
                className="border-primary/20 focus:border-primary/60 shadow-sm"
              >
                <SelectValue placeholder="Select age range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3-4">3-4 years</SelectItem>
                <SelectItem value="5-7">5-7 years</SelectItem>
                <SelectItem value="8+">8+ years</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              We'll adjust vocabulary and themes to suit this age group
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="style" className="text-sm font-medium">
              Story Style/Tone
            </Label>
            <Select value={storyStyle} onValueChange={onStoryStyleChange}>
              <SelectTrigger
                id="style"
                className="border-primary/20 focus:border-primary/60 shadow-sm"
              >
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whimsical">Whimsical</SelectItem>
                <SelectItem value="adventurous">Adventurous</SelectItem>
                <SelectItem value="funny">Funny</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="magical">Magical</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Sets the overall tone and mood of your story
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <Label
              htmlFor="story-length-slider"
              className="text-sm font-medium"
            >
              Story Length
              {!isPremium && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (Free users limited to 3 pages)
                </span>
              )}
            </Label>
            <span className="text-sm font-medium text-primary w-14 text-right tabular-nums">
              {storyLengthTargetPages} pages
            </span>
          </div>
          <Slider
            id="story-length-slider"
            min={3}
            max={10}
            step={1}
            value={[storyLengthTargetPages]}
            onValueChange={handleStoryLengthChange}
            className="py-2"
            disabled={!isPremium && storyLengthTargetPages >= 3}
          />
          <p className="text-xs text-muted-foreground pt-1">
            {isPremium
              ? "Choose between 3-10 pages for your story."
              : "Free users can create stories with 3 pages. Upgrade to create longer stories!"}
          </p>
        </div>
      </CardContent>

      <Dialog open={showPaywallDialog} onOpenChange={setShowPaywallDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Unlock Longer Stories
            </DialogTitle>
            <DialogDescription>
              Upgrade to Premium to create stories with up to 10 pages!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Premium Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Create stories with up to 10 pages</li>
                <li>Access to exclusive story themes</li>
                <li>Priority story generation</li>
                <li>Advanced customization options</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaywallDialog(false)}
            >
              Maybe Later
            </Button>
            <Button
              className="bg-primary text-white hover:bg-primary/90"
              onClick={() => {
                // Add your upgrade logic here
                setShowPaywallDialog(false);
              }}
            >
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FixedButton
        state={StoryState.AgeRangeSelection}
        onClick={onGoNext || (() => {})}
        isValid={!!isValid}
      />
    </Card>
  );
}
