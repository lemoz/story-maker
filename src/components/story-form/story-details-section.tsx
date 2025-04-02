import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface StoryDetailsSectionProps {
  ageRange: string;
  onAgeRangeChange: (value: string) => void;
  storyStyle: string;
  onStoryStyleChange: (value: string) => void;
  storyLengthTargetPages: number;
  onStoryLengthChange: (value: number) => void;
}

export function StoryDetailsSection({
  ageRange,
  onAgeRangeChange,
  storyStyle,
  onStoryStyleChange,
  storyLengthTargetPages,
  onStoryLengthChange,
}: StoryDetailsSectionProps) {
  return (
    <Card className="shadow-sm border-primary/10">
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="age-range" className="text-sm font-medium">Child's Age Range</Label>
            <Select 
              value={ageRange} 
              onValueChange={onAgeRangeChange}
            >
              <SelectTrigger id="age-range" className="border-primary/20 focus:border-primary/60 shadow-sm">
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
            <Label htmlFor="style" className="text-sm font-medium">Story Style/Tone</Label>
            <Select 
              value={storyStyle} 
              onValueChange={onStoryStyleChange}
            >
              <SelectTrigger id="style" className="border-primary/20 focus:border-primary/60 shadow-sm">
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
        
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="story-length-slider" className="text-sm font-medium">Approximate Story Length</Label>
            {/* Display current value */}
            <span className="text-sm font-medium text-primary w-14 text-right tabular-nums">{storyLengthTargetPages} pages</span>
          </div>
          <Slider
            id="story-length-slider"
            min={3} // Min pages
            max={10} // Max pages
            step={1}
            value={[storyLengthTargetPages]} // Slider value is an array
            onValueChange={(newValueArray) => onStoryLengthChange(newValueArray[0])} // Update state with the first value
            className="py-2" // Add vertical padding for better thumb interaction
          />
          <p className="text-xs text-muted-foreground pt-1">Adjust the slider to set the desired story length (3-10 pages).</p>
        </div>
      </CardContent>
    </Card>
  );
} 