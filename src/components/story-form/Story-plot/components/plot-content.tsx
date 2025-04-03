import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Plus, X, Loader2 } from "lucide-react";

interface PhotoUploadContentProps {
  eventPhotos: File[];
  eventPhotosPreviews: string[];
  onEventPhotosUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveEventPhoto: (index: number) => void;
  onSuggestStoryIdea: () => void;
  isGeneratingIdea: boolean;
  eventPhotosInputRef: React.RefObject<HTMLInputElement | null>;
}

export const PhotoUploadContent = ({
  eventPhotos,
  eventPhotosPreviews,
  onEventPhotosUpload,
  onRemoveEventPhoto,
  onSuggestStoryIdea,
  isGeneratingIdea,
  eventPhotosInputRef,
}: PhotoUploadContentProps) => {
  return (
    <div className="w-full bg-white animate-in fade-in-50 duration-300">
      <input
        type="file"
        id="event-photos"
        className="hidden"
        accept="image/*"
        multiple
        onChange={onEventPhotosUpload}
        ref={eventPhotosInputRef}
      />

      <DropZone
        eventPhotos={eventPhotos}
        eventPhotosPreviews={eventPhotosPreviews}
        onRemoveEventPhoto={onRemoveEventPhoto}
        eventPhotosInputRef={eventPhotosInputRef}
      />

      {/* {eventPhotos.length > 0 && (
        <div className="flex justify-center mt-6">
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
      )} */}
    </div>
  );
};

interface DropZoneProps {
  eventPhotos: File[];
  eventPhotosPreviews: string[];
  onRemoveEventPhoto: (index: number) => void;
  eventPhotosInputRef: React.RefObject<HTMLInputElement | null>;
}

const DropZone = ({
  eventPhotos,
  eventPhotosPreviews,
  onRemoveEventPhoto,
  eventPhotosInputRef,
}: DropZoneProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    eventPhotosInputRef.current?.click();
  };

  return (
    <div
      className={`w-fit rounded-2xl cursor-pointer transition-colors bg-gray-50/50 ${
        eventPhotos.length === 0 &&
        "border-2 border-dashed border-primary/20 hover:border-[#9B87F5]"
      }`}
      onClick={handleClick}
    >
      {eventPhotos.length === 0 ? (
        <EmptyState onClick={handleClick} />
      ) : (
        <PhotoGrid
          eventPhotosPreviews={eventPhotosPreviews}
          onRemoveEventPhoto={onRemoveEventPhoto}
          eventPhotosInputRef={eventPhotosInputRef}
          photosCount={eventPhotos.length}
        />
      )}
    </div>
  );
};

const EmptyState = ({
  onClick,
}: {
  onClick: (e: React.MouseEvent) => void;
}) => (
  <button
    type="button"
    className="h-full w-full flex flex-col items-start justify-center text-muted-foreground p-4 bg-transparent border-0"
    onClick={onClick}
  >
    <div className="w-12 h-12 rounded-xl flex items-center justify-center">
      <Plus className="h-6 w-6 text-gray-400" />
    </div>
  </button>
);

interface PhotoGridProps {
  eventPhotosPreviews: string[];
  onRemoveEventPhoto: (index: number) => void;
  eventPhotosInputRef: React.RefObject<HTMLInputElement | null>;
  photosCount: number;
}

const PhotoGrid = ({
  eventPhotosPreviews,
  onRemoveEventPhoto,
  eventPhotosInputRef,
  photosCount,
}: PhotoGridProps) => (
  <div>
    <div className="flex flex-wrap gap-2 mb-3">
      {eventPhotosPreviews.map((previewUrl, index) => (
        <PhotoPreview
          key={index}
          previewUrl={previewUrl}
          index={index}
          onRemove={onRemoveEventPhoto}
        />
      ))}
      <AddMoreButton onClick={() => eventPhotosInputRef.current?.click()} />
    </div>
    <p className="text-sm font-normal text-muted-foreground">
      {photosCount}/5 photos
    </p>
  </div>
);

interface PhotoPreviewProps {
  previewUrl: string;
  index: number;
  onRemove: (index: number) => void;
}

const PhotoPreview = ({ previewUrl, index, onRemove }: PhotoPreviewProps) => (
  <div className="relative w-24 h-24 rounded-xl overflow-hidden group shadow-sm">
    <Image
      src={previewUrl}
      alt={`Event photo ${index + 1}`}
      fill
      className="object-cover"
    />
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
    <button
      type="button"
      className="absolute top-1 right-1 p-1.5 bg-red-500 rounded-full group-hover:opacity-100 transition-opacity hover:bg-red-600"
      onClick={(e) => {
        e.stopPropagation();
        onRemove(index);
      }}
      aria-label="Remove photo"
    >
      <X className="h-4 w-4 text-white" />
    </button>
  </div>
);

const AddMoreButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }}
    className="w-24 h-24 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-400 hover:border-[#9B87F5] transition-colors"
  >
    <Plus className="h-6 w-6 text-gray-400" />
  </button>
);

interface StoryDescriptionContentProps {
  storyDescription: string;
  onDescriptionChange: (value: string) => void;
}

export const StoryDescriptionContent = ({
  storyDescription,
  onDescriptionChange,
}: StoryDescriptionContentProps) => {
  return (
    <Textarea
      id="story-description"
      placeholder="e.g., A brave knight rescues a cat from a tall tree..."
      className="min-h-[100px] rounded-xl ring-gray-200 text-base"
      value={storyDescription}
      onChange={(e) => onDescriptionChange(e.target.value)}
    />
  );
};
