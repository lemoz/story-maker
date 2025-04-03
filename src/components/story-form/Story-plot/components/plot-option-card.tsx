import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { StoryDescriptionContent } from "./plot-content";
import { PhotoUploadContent } from "./plot-content";

interface PlotOptionCardProps {
  storyPlotOption: string;
  value: "photos" | "describe";
  title: string;
  description: string;
  icon: React.ReactNode;
  eventPhotos: File[];
  eventPhotosPreviews: string[];
  onEventPhotosUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveEventPhoto: (index: number) => void;
  onSuggestStoryIdea: () => void;
  isGeneratingIdea: boolean;
  eventPhotosInputRef: React.RefObject<HTMLInputElement | null>;
  storyDescription: string;
  onDescriptionChange: (value: string) => void;
}

export const PlotOptionCard = ({
  storyPlotOption,
  value,
  title,
  description,
  icon,
  eventPhotos,
  eventPhotosPreviews,
  onEventPhotosUpload,
  onRemoveEventPhoto,
  onSuggestStoryIdea,
  isGeneratingIdea,
  eventPhotosInputRef,
  storyDescription,
  onDescriptionChange,
}: PlotOptionCardProps) => {
  const isSelected = storyPlotOption === value;

  return (
    <div
      className={`relative rounded-3xl p-6 text-left transition-all duration-300 transform ${
        isSelected
          ? "ring-4 ring-[#9B87F5] bg-white shadow-lg scale-[1.03] -translate-y-1"
          : "bg-gray-50 ring-1 ring-gray-200 hover:bg-white hover:shadow-md hover:scale-[1.0] hover:-translate-y-0.5"
      }`}
    >
      <Label
        htmlFor={`option-${value}`}
        className={`flex flex-col cursor-pointer w-full h-full text-left items-start`}
      >
        <RadioGroupItem
          value={value}
          id={`option-${value}`}
          className="hidden absolute top-4 right-4 h-4 w-4 text-primary border-primary/40"
        />

        <div className="space-y-2 text-left">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>

        <div className="mt-2 w-full flex justify-center">
          {!isSelected ? (
            <div
              className={`w-20 h-20 ${
                value === "photos" ? "bg-blue-50" : "bg-yellow-50"
              } rounded-2xl flex items-center justify-center`}
            >
              {icon}
            </div>
          ) : (
            <>
              {storyPlotOption === "photos" && (
                <PhotoUploadContent
                  eventPhotos={eventPhotos}
                  eventPhotosPreviews={eventPhotosPreviews}
                  onEventPhotosUpload={onEventPhotosUpload}
                  onRemoveEventPhoto={onRemoveEventPhoto}
                  onSuggestStoryIdea={onSuggestStoryIdea}
                  isGeneratingIdea={isGeneratingIdea}
                  eventPhotosInputRef={eventPhotosInputRef}
                />
              )}

              {storyPlotOption === "describe" && (
                <StoryDescriptionContent
                  storyDescription={storyDescription}
                  onDescriptionChange={onDescriptionChange}
                />
              )}
            </>
          )}
        </div>
      </Label>
    </div>
  );
};
