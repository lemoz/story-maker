"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function CreateStoryPage() {
  const router = useRouter();
  
  // State hooks for form values
  const [storyPlotOption, setStoryPlotOption] = useState<string>('describe');
  const [ageRange, setAgeRange] = useState<string>('');
  const [storyStyle, setStoryStyle] = useState<string>('');
  const [characterName, setCharacterName] = useState<string>('');
  const [storyDescription, setStoryDescription] = useState<string>('');
  
  // State hooks for form submission
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous error
    setError(null);
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Make API call to generate story
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName,
          storyPlotOption,
          storyDescription,
          ageRange,
          storyStyle
        })
      });
      
      // Handle response
      if (!response.ok) {
        // Try to parse error message from response
        const errorData = await response.json().catch(() => null);
        setError(errorData?.error || `Request failed with status ${response.status}`);
        return;
      }
      
      // Parse success response
      const data = await response.json();
      
      // Redirect to story viewer page
      router.push(`/story/${data.storyId}`);
      
    } catch (err) {
      console.error('Submission failed:', err);
      setError('Failed to create story. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-2">Create Your Story</h1>
      <p className="text-muted-foreground text-center mb-8">
        Fill in the details below to generate a personalized story.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Section 1: Characters */}
        <Card>
          <CardHeader>
            <CardTitle>1. Who is the story about?</CardTitle>
            <CardDescription>
              Add characters and upload a photo to guide illustrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground shrink-0">
                Upload Photo
              </div>
              <div className="flex-1 space-y-2">
                <Input 
                  type="text" 
                  placeholder="Character's Name" 
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm">
                    Make Main Character
                  </Button>
                  <Button type="button" variant="outline" size="sm">
                    Remove
                  </Button>
                </div>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full">
              + Add Another Character
            </Button>
          </CardContent>
        </Card>

        {/* Section 2: Story Plot/Scenes */}
        <Card>
          <CardHeader>
            <CardTitle>2. What happens in the story?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup 
              value={storyPlotOption} 
              onValueChange={setStoryPlotOption}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="photos" id="option-photos" />
                <Label htmlFor="option-photos">
                  Upload Photos from the Day/Event
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="describe" id="option-describe" />
                <Label htmlFor="option-describe">Describe the Story Idea</Label>
              </div>
            </RadioGroup>

            <div className="space-y-4">
              {/* Photo upload area - conditionally rendered */}
              {storyPlotOption === 'photos' && (
                <>
                  <div className="h-24 border border-dashed rounded flex items-center justify-center text-muted-foreground">
                    Multi-Photo Upload Area
                  </div>
                  <Button type="button" variant="secondary" size="sm">
                    Suggest Story Idea from Photos
                  </Button>
                </>
              )}

              {/* Text area for describing story - conditionally rendered */}
              {storyPlotOption === 'describe' && (
                <Textarea 
                  placeholder="Write your story idea here..." 
                  className="min-h-32"
                  value={storyDescription}
                  onChange={(e) => setStoryDescription(e.target.value)}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Story Details */}
        <Card>
          <CardHeader>
            <CardTitle>3. Story Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="age-range">Child's Age Range</Label>
              <Select 
                value={ageRange} 
                onValueChange={setAgeRange}
              >
                <SelectTrigger id="age-range">
                  <SelectValue placeholder="Select age range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3-4">3-4 years</SelectItem>
                  <SelectItem value="5-7">5-7 years</SelectItem>
                  <SelectItem value="8+">8+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Story Style/Tone</Label>
              <Select 
                value={storyStyle} 
                onValueChange={setStoryStyle}
              >
                <SelectTrigger id="style">
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
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          type="submit" 
          size="lg" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Story...
            </>
          ) : (
            'Create My Story'
          )}
        </Button>
      </form>
    </div>
  );
}