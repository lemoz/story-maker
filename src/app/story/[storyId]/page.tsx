"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Loader2,
  AlertCircle,
  Check,
  Edit,
  Save,
  X,
  Wand2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Story data interfaces
interface StoryPage {
  text: string;
  imageUrl: string | null;
}

interface StoryData {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  pages: StoryPage[];
}

export default function StoryViewerPage() {
  const params = useParams();
  const storyId = params.storyId as string;
  const { data: session } = useSession();

  // State hooks
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");

  // Text editing state
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [isSavingText, setIsSavingText] = useState(false);

  // Image regeneration state
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [showImageRegenDialog, setShowImageRegenDialog] = useState(false);
  const [imageRegenComment, setImageRegenComment] = useState("");
  const router = useRouter();

  // Fetch story data
  useEffect(() => {
    async function fetchStory() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/get-story?storyId=${storyId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch story: ${response.status}`);
        }

        const data: StoryData = await response.json();
        setStoryData(data);
      } catch (err: any) {
        setError(
          err.message || "An unknown error occurred while fetching the story."
        );
        setStoryData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStory();
  }, [storyId]);

  // Navigate to the previous page
  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      // Reset editing states when changing pages
      setIsEditingText(false);
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  // Navigate to the next page
  const goToNextPage = () => {
    if (storyData && currentPageIndex < storyData.pages.length - 1) {
      // Reset editing states when changing pages
      setIsEditingText(false);
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  // Share story handler
  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2500);
    } catch (err) {
      console.error("Failed to copy URL to clipboard:", err);
    }
  };

  // Start text editing
  const handleEditText = () => {
    if (storyData) {
      setEditedText(storyData.pages[currentPageIndex].text);
      setIsEditingText(true);
    }
  };

  // Save edited text
  const handleSaveText = async () => {
    if (!storyData) return;

    setIsSavingText(true);
    try {
      const response = await fetch("/api/update-story-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storyId,
          pageIndex: currentPageIndex,
          newText: editedText.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update story text");
      }

      // Update local state with new text
      const updatedPages = [...storyData.pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        text: editedText.trim(),
      };

      setStoryData({
        ...storyData,
        pages: updatedPages,
      });

      setIsEditingText(false);
      toast.success("Story text updated successfully");
    } catch (err: any) {
      console.error("Error saving text:", err);
      toast.error(err.message || "Failed to update story text");
    } finally {
      setIsSavingText(false);
    }
  };

  // Handle image regeneration dialog submission
  const handleSubmitImageRegen = async () => {
    if (!storyData) return;

    setIsRegeneratingImage(true);
    setShowImageRegenDialog(false);

    try {
      const response = await fetch("/api/regenerate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storyId,
          pageIndex: currentPageIndex,
          comment: imageRegenComment.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to regenerate image");
      }

      const data = await response.json();

      // Update local state with new image URL
      const updatedPages = [...storyData.pages];
      updatedPages[currentPageIndex] = {
        ...updatedPages[currentPageIndex],
        imageUrl: data.imageUrl,
      };

      setStoryData({
        ...storyData,
        pages: updatedPages,
      });

      // Reset comment for next time
      setImageRegenComment("");
      toast.success("Image regenerated successfully");
    } catch (err: any) {
      console.error("Error regenerating image:", err);
      toast.error(err.message || "Failed to regenerate image");
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-start mb-4">
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="text-center mb-6">
          <Skeleton className="h-10 w-3/4 mx-auto mb-2" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
        </div>
        <div className="flex justify-center gap-4 mb-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2">
                <Skeleton className="h-60 w-full rounded-lg" />
              </div>
              <div className="md:w-1/2">
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="my-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Story</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="text-center mt-8">
          <Link href="/create">
            <Button>Create a New Story</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success state - Main story view
  if (storyData) {
    const currentPage = storyData.pages[currentPageIndex];

    return (
      <div className="container mx-auto py-8 px-4">
        {/* Back link */}
        <Link
          href="/create"
          className="text-sm text-muted-foreground hover:underline mb-4 inline-block"
        >
          <ChevronLeft className="inline h-4 w-4 mr-1" /> Back to Create
        </Link>

        {/* Story Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">{storyData.title}</h1>
          <p className="text-muted-foreground">{storyData.subtitle}</p>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4 mb-6 flex-wrap">
          <Button
            variant="outline"
            className="gap-2 text-white bg-[#9F7AEA] hover:bg-[#805AD5]"
            onClick={() => router.push(`/create`)}
          >
            <Plus className="h-4 w-4" /> Create Another
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleShare}>
            {shareStatus === "copied" ? (
              <>
                <Check className="h-4 w-4" /> Copied!
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" /> Share Story
              </>
            )}
          </Button>
        </div>

        {/* Pagination controls */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            onClick={goToPreviousPage}
            disabled={currentPageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {currentPageIndex + 1} of {storyData.pages.length}
          </span>

          <Button
            variant="outline"
            onClick={goToNextPage}
            disabled={currentPageIndex >= storyData.pages.length - 1}
          >
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Story content */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image area */}
              <div className="md:w-1/2">
                <div className="relative">
                  {currentPage.imageUrl ? (
                    <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={currentPage.imageUrl}
                        alt={`Illustration for page ${currentPageIndex + 1}`}
                        className="object-cover w-full h-full"
                      />
                      {isRegeneratingImage && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-12 w-12 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center bg-muted rounded-lg text-muted-foreground">
                      Illustration Placeholder
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm"
                    onClick={() => setShowImageRegenDialog(true)}
                    disabled={isRegeneratingImage || !currentPage.imageUrl}
                  >
                    {isRegeneratingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />{" "}
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-1" /> Regenerate Image
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Text area */}
              <div className="md:w-1/2">
                <div className="relative">
                  {isEditingText ? (
                    <div className="space-y-4">
                      <Textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="min-h-36 text-lg"
                        placeholder="Enter the story text"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingText(false)}
                          disabled={isSavingText}
                        >
                          <X className="h-4 w-4 mr-1" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveText}
                          disabled={isSavingText || editedText.trim() === ""}
                        >
                          {isSavingText ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />{" "}
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" /> Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg leading-relaxed">
                        {currentPage.text}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0"
                        onClick={handleEditText}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Regeneration Dialog */}
        <Dialog
          open={showImageRegenDialog}
          onOpenChange={setShowImageRegenDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Regenerate Image</DialogTitle>
              <DialogDescription>
                Provide additional details for the new image. This will help the
                AI generate a better image based on your instructions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="comment">Special Instructions (optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Example: Make it more colorful, use a watercolor style, show the character smiling, etc."
                  value={imageRegenComment}
                  onChange={(e) => setImageRegenComment(e.target.value)}
                  className="min-h-24"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowImageRegenDialog(false)}
                disabled={isRegeneratingImage}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitImageRegen}
                disabled={isRegeneratingImage}
              >
                {isRegeneratingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />{" "}
                    Generating...
                  </>
                ) : (
                  "Generate New Image"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Fallback (should not occur, as we handle all states above)
  return null;
}
