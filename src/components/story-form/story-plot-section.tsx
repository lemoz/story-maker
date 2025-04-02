import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Camera, Plus, X, Loader2 } from "lucide-react";

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
  return (
    <Card className="shadow-sm border-primary/10">
      <CardContent className="space-y-6 pt-6">
        <RadioGroup 
          value={storyPlotOption} 
          onValueChange={onPlotOptionChange}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className={`border p-4 rounded-xl transition-all shadow-sm
            ${storyPlotOption === 'photos' 
              ? 'border-primary bg-primary/5 ring-1 ring-primary/40' 
              : 'hover:border-primary/30 hover:bg-primary/3'}`}
          >
            <Label 
              htmlFor="option-photos" 
              className="flex items-center space-x-3 cursor-pointer w-full"
            >
              <RadioGroupItem 
                value="photos" 
                id="option-photos" 
                className="h-4 w-4 text-primary border-primary/40" 
              />
              <div className="flex-1">
                <span className={`block mb-1 font-medium ${storyPlotOption === 'photos' ? 'text-primary' : ''}`}>
                  Upload Photos from the Day/Event
                </span>
                <p className="text-xs text-muted-foreground">
                  AI will generate a story based on your uploaded photos
                </p>
              </div>
            </Label>
          </div>
          
          <div className={`border p-4 rounded-xl transition-all shadow-sm
            ${storyPlotOption === 'describe' 
              ? 'border-primary bg-primary/5 ring-1 ring-primary/40' 
              : 'hover:border-primary/30 hover:bg-primary/3'}`}
          >
            <Label 
              htmlFor="option-describe" 
              className="flex items-center space-x-3 cursor-pointer w-full"
            >
              <RadioGroupItem 
                value="describe" 
                id="option-describe" 
                className="h-4 w-4 text-primary border-primary/40"
              />
              <div className="flex-1">
                <span className={`block mb-1 font-medium ${storyPlotOption === 'describe' ? 'text-primary' : ''}`}>
                  Describe the Story Idea
                </span>
                <p className="text-xs text-muted-foreground">
                  Write a brief description and we'll create a story from it
                </p>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <div className="mt-6 space-y-4">
          {/* Photo upload area - conditionally rendered */}
          {storyPlotOption === 'photos' && (
            <div className="bg-background/70 p-4 rounded-lg border border-muted animate-in fade-in-50 duration-300">
              {/* Hidden file input */}
              <input 
                type="file" 
                id="event-photos" 
                className="hidden" 
                accept="image/*" 
                multiple 
                onChange={onEventPhotosUpload}
                ref={eventPhotosInputRef}
              />
              
              {/* Dropzone/upload button */}
              <div 
                className="border border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30"
                onClick={(e) => {
                  e.preventDefault();
                  eventPhotosInputRef.current?.click();
                }}
              >
                {eventPhotos.length === 0 ? (
                  <button 
                    type="button"
                    className="h-36 sm:h-40 w-full flex flex-col items-center justify-center text-muted-foreground p-4 bg-transparent border-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      eventPhotosInputRef.current?.click();
                    }}
                  >
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <Camera className="h-7 w-7 text-primary" />
                    </div>
                    <p className="text-sm sm:text-base text-center font-medium">
                      Click to upload photos from the day or event
                    </p>
                    <p className="text-xs text-center mt-1 max-w-xs mx-auto text-muted-foreground">
                      Supported formats: JPG, PNG, GIF (max 5MB each)
                    </p>
                  </button>
                ) : (
                  <div className="p-5">
                    <div className="flex flex-wrap gap-4 mb-3 justify-center sm:justify-start">
                      {eventPhotosPreviews.map((previewUrl, index) => (
                        <div key={index} className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden group shadow-sm">
                          <Image
                            src={previewUrl}
                            alt={`Event photo ${index + 1}`}
                            fill
                            sizes="(max-width: 768px) 96px, 112px"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                          <button
                            type="button"
                            className="absolute top-1 right-1 p-1.5 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveEventPhoto(index);
                            }}
                            aria-label="Remove photo"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button"
                        className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          eventPhotosInputRef.current?.click();
                        }}
                      >
                        <Plus className="h-6 w-6 mb-1" />
                        <span className="text-xs">Add more</span>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center sm:text-left">
                      {eventPhotos.length} photo{eventPhotos.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </div>
              
              {eventPhotos.length > 0 && (
                <div className="flex justify-center mt-4">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={onSuggestStoryIdea}
                    disabled={isGeneratingIdea}
                    className="relative bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border border-primary/30 shadow-sm"
                  >
                    {isGeneratingIdea ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating idea...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">✨</span>
                        Suggest Story Idea from Photos
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Text area for describing story - conditionally rendered */}
          {storyPlotOption === 'describe' && (
            <div className="bg-background/70 p-4 rounded-lg border border-muted animate-in fade-in-50 duration-300">
              <Label htmlFor="story-description" className="block mb-2 text-sm font-medium">
                Enter your story idea
              </Label>
              <Textarea 
                id="story-description"
                placeholder="Write your story idea here... (For example: A magical adventure where Sam discovers a hidden forest with talking animals, and learns about friendship and bravery.)" 
                className="min-h-36 border-primary/20 focus:border-primary/60"
                value={storyDescription}
                onChange={(e) => onDescriptionChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Be as detailed as you like. Include characters, locations, and key story moments.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 