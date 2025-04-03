import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio-group";
import { Camera, PencilLine } from "lucide-react";
import { StoryStarter } from "./components/plot-staters";
import {
  PhotoUploadContent,
  StoryDescriptionContent,
} from "./components/plot-content";
import { PlotOptionCard } from "./components/plot-option-card";

interface StoryPlotSectionProps {
  storyPlotOption: string;
  onPlotOptionChange: (value: string) => void;
  storyDescription: string;
  onDescriptionChange: (value: string) => void;
  eventPhotos: File[];
  eventPhotosPreviews: string[];
  onEventPhotosUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveEventPhoto: (index: number) => void;
  onSuggestStoryIdea: () => void;
  isGeneratingIdea: boolean;
  eventPhotosInputRef: React.RefObject<HTMLInputElement | null>;
}

export function StoryPlotSection({
  storyPlotOption,
  onPlotOptionChange,
  storyDescription,
  onDescriptionChange,
  eventPhotos,
  eventPhotosPreviews,
  onEventPhotosUpload,
  onRemoveEventPhoto,
  onSuggestStoryIdea,
  isGeneratingIdea,
  eventPhotosInputRef,
}: StoryPlotSectionProps) {
  const handleStoryStarterSelect = (starter: string) => {
    onPlotOptionChange("describe");
    onDescriptionChange(starter);
  };

  return (
    <Card className="shadow-sm border-primary/10">
      <CardContent className="space-y-8 pt-6">
        <StoryStarter onSelect={handleStoryStarterSelect} />

        <RadioGroup
          value={storyPlotOption}
          onValueChange={onPlotOptionChange}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <PlotOptionCard
            storyPlotOption={storyPlotOption}
            value="photos"
            title="Use Your Photos"
            description="Upload 1-5 photos, and we'll weave them into a magical story!"
            icon={<Camera className="w-10 h-10 text-primary/60" />}
            eventPhotos={eventPhotos}
            eventPhotosPreviews={eventPhotosPreviews}
            onEventPhotosUpload={onEventPhotosUpload}
            onRemoveEventPhoto={onRemoveEventPhoto}
            onSuggestStoryIdea={onSuggestStoryIdea}
            isGeneratingIdea={isGeneratingIdea}
            eventPhotosInputRef={eventPhotosInputRef}
            storyDescription={storyDescription}
            onDescriptionChange={onDescriptionChange}
          />
          <PlotOptionCard
            storyPlotOption={storyPlotOption}
            value="describe"
            title="Write Your Idea"
            description="Describe the adventure you imagine."
            icon={<PencilLine className="w-10 h-10 text-primary/60" />}
            eventPhotos={eventPhotos}
            eventPhotosPreviews={eventPhotosPreviews}
            onEventPhotosUpload={onEventPhotosUpload}
            onRemoveEventPhoto={onRemoveEventPhoto}
            onSuggestStoryIdea={onSuggestStoryIdea}
            isGeneratingIdea={isGeneratingIdea}
            eventPhotosInputRef={eventPhotosInputRef}
            storyDescription={storyDescription}
            onDescriptionChange={onDescriptionChange}
          />
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
