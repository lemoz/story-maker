"use client";

import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

interface StoryDetailsSectionProps {
  ageRange: string;
  onAgeRangeChange: (value: string) => void;
  storyStyle: string;
  onStoryStyleChange: (value: string) => void;
  storyLengthTargetPages: number;
  onStoryLengthChange: (value: number) => void;
  isPremium: boolean;
  onGoNext: () => void;
  onShowPaywall?: () => void;
}

export function StoryDetailsSection({
  ageRange,
  onAgeRangeChange,
  storyStyle,
  onStoryStyleChange,
  storyLengthTargetPages,
  onStoryLengthChange,
  isPremium,
  onGoNext,
  onShowPaywall,
}: StoryDetailsSectionProps) {
  const [sliderValue, setSliderValue] = useState(storyLengthTargetPages);

  const handleSliderChange = (value: number[]) => {
    const newValue = value[0];

    if (!isPremium && newValue > 3) {
      // If user is not premium and tries to set value > 3, show paywall
      if (onShowPaywall) {
        onShowPaywall();
      }
      // Reset slider to 3
      setSliderValue(3);
      return;
    }

    setSliderValue(newValue);
    onStoryLengthChange(newValue);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Age range selector */}
        <div className="space-y-3">
          <Label>Target Age Range</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {["3-4", "5-7", "8+"].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => onAgeRangeChange(range)}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-colors",
                  ageRange === range
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                )}
              >
                <div className="font-medium">{range} years</div>
                <div className="text-sm text-muted-foreground">
                  {range === "3-4"
                    ? "Preschool"
                    : range === "5-7"
                    ? "Early readers"
                    : "Confident readers"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Story style selector */}
        <div className="space-y-3">
          <Label>Story Style</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                value: "whimsical",
                label: "Whimsical",
                description: "Light and playful",
              },
              {
                value: "educational",
                label: "Educational",
                description: "Learning focused",
              },
              {
                value: "adventure",
                label: "Adventure",
                description: "Action packed",
              },
              {
                value: "funny",
                label: "Funny",
                description: "Humor and jokes",
              },
              {
                value: "magical",
                label: "Magical",
                description: "Fantasy and wonder",
              },
            ].map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => onStoryStyleChange(style.value)}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-colors",
                  storyStyle === style.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                )}
              >
                <div className="font-medium">{style.label}</div>
                <div className="text-sm text-muted-foreground">
                  {style.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Story length slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Story Length</Label>
            <div className="text-sm font-medium">{sliderValue} Pages</div>
          </div>

          <div className="relative pt-2">
            <Slider
              value={[sliderValue]}
              onValueChange={handleSliderChange}
              min={3}
              max={10}
              step={1}
              className={cn("w-full")}
            />
          </div>

          {!isPremium && (
            <p className="text-sm text-muted-foreground">
              Free users are limited to 3 pages. Upgrade to create longer
              stories!
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-end pt-4">
          <Button onClick={onGoNext}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}
