"use client";

import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface StoryDetailsSectionProps {
  ageRange: string;
  onAgeRangeChange: (value: string) => void;
  storyStyle: string;
  onStoryStyleChange: (value: string) => void;
  storyLengthTargetPages: number;
  onStoryLengthChange: (value: number) => void;
  isPremium: boolean;
  onGoNext: () => void;
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
}: StoryDetailsSectionProps) {
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

        {/* Story length selector */}
        <div className="space-y-3">
          <Label>Story Length</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[3, 5, 7, 10].map((pages) => {
              const isDisabled = !isPremium && pages > 3;
              return (
                <button
                  key={pages}
                  type="button"
                  onClick={() => onStoryLengthChange(pages)}
                  className={cn(
                    "relative p-4 rounded-lg border-2 text-left transition-colors",
                    storyLengthTargetPages === pages
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50",
                    isDisabled &&
                      "opacity-50 cursor-not-allowed hover:border-muted"
                  )}
                  disabled={isDisabled}
                >
                  <div className="font-medium">{pages} Pages</div>
                  <div className="text-sm text-muted-foreground">
                    {pages === 3
                      ? "Short and sweet"
                      : pages === 5
                      ? "Just right"
                      : pages === 7
                      ? "Extended tale"
                      : "Epic adventure"}
                  </div>
                  {isDisabled && (
                    <div className="absolute top-1 right-1">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
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
