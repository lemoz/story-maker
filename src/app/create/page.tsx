"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  StoryGenerationProgress,
  type StoryGenerationStatus,
} from "@/components/story-generation-progress";
import {
  CharactersSection,
  type Character,
} from "@/components/story-form/Story-characters/characters-section";
import { StoryPlotSection } from "@/components/story-form/Story-plot/story-plot-section";
import { StoryDetailsSection } from "@/components/story-form/story-details-section";
import { SubmitButton } from "@/components/story-form/submit-button";
import { Stepper } from "@/components/story-form/stepper";

// Request body interface
interface StoryRequestBody {
  characters: {
    id: string;
    name: string;
    isMain: boolean;
    gender: "female" | "male" | "unspecified";
    uploadedPhotoUrl: string | null;
  }[];
  storyPlotOption: string;
  storyDescription: string;
  ageRange: string;
  storyStyle: string;
  storyLengthTargetPages: number;
  email: string | null;
  uploadedStoryPhotoUrls?: string[];
}

const fillStoryPlotDescriptionByCharacters = (characters: Character[]) => {
  if (characters.length === 1) {
    return characters[0].name;
  } else {
    return characters.length + " characters";
  }
};

export default function CreateStoryPage() {
  const router = useRouter();
  // Create refs for file inputs
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>(
    {}
  );
  // Create a specific ref for the event photos input
  const eventPhotosInputRef = React.useRef<HTMLInputElement>(null);

  // State hooks for form values
  const [storyPlotOption, setStoryPlotOption] = useState<
    "starter" | "photos" | "describe"
  >("starter");
  const [ageRange, setAgeRange] = useState<string>("3-4");
  const [storyStyle, setStoryStyle] = useState<string>("whimsical");
  const [storyLengthTargetPages, setStoryLengthTargetPages] =
    useState<number>(6); // Default ~6 pages
  const [characters, setCharacters] = useState<Character[]>([]);
  const [storyDescription, setStoryDescription] = useState<string>("");
  const [eventPhotos, setEventPhotos] = useState<File[]>([]); // State for event photos
  const [eventPhotosPreviews, setEventPhotosPreviews] = useState<string[]>([]); // State for preview URLs
  const [uploadedStoryPhotoUrls, setUploadedStoryPhotoUrls] = useState<
    string[]
  >([]); // State for uploaded photo URLs

  // State hooks for form submission
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] =
    useState<StoryGenerationStatus>({
      step: "validating",
    });

  // Add current step state
  const [currentStep, setCurrentStep] = useState(0);

  // Form steps
  const FORM_STEPS = [
    {
      title: "Let's Create Your Characters!",
      description:
        "Add the heroes of your tale! Give them a name, gender, and a special look.",
    },
    {
      title: "How Should We Start Your Story?",
      description: `Choose a way to inspire your story with ${fillStoryPlotDescriptionByCharacters(
        characters
      )}`,
    },
    {
      title: "Customize Your Story",
      description: "Choose the age range, style, and length of your story.",
    },
  ];

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      // When component unmounts, revoke all object URLs
      characters.forEach((char) => {
        if (char.photoPreviewUrl) {
          URL.revokeObjectURL(char.photoPreviewUrl);
        }
      });

      // Clean up event photo previews
      eventPhotosPreviews.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [characters, eventPhotosPreviews]);

  // Monitor state changes for event photos
  useEffect(() => {
    // This empty effect is left intentionally to track state changes if needed
  }, [eventPhotos, eventPhotosPreviews]);

  // Handle event photos upload
  const handleEventPhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    // Convert FileList to array and filter only image files
    const newFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (newFiles.length === 0) {
      setError("Please select valid image files");
      return;
    }

    // Check file sizes (max 5MB each)
    const oversizedFiles = newFiles.filter(
      (file) => file.size > 5 * 1024 * 1024
    );

    if (oversizedFiles.length > 0) {
      setError(`${oversizedFiles.length} file(s) exceed the 5MB size limit`);
      return;
    }

    // Create preview URLs for the new files
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

    // Update state with new files and previews
    setEventPhotos((prev) => [...prev, ...newFiles]);
    setEventPhotosPreviews((prev) => [...prev, ...newPreviews]);

    // Reset the input value to allow selecting the same file again
    e.target.value = "";
  };

  // Handle removing an event photo
  const handleRemoveEventPhoto = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(eventPhotosPreviews[index]);

    // Remove the file and preview from state
    setEventPhotos((prev) => prev.filter((_, i) => i !== index));
    setEventPhotosPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Handler functions for characters
  const handleAddCharacter = () => {
    const newCharacter: Character = {
      id: crypto.randomUUID(),
      name: "",
      isMain: false,
      gender: "female",
      photoFile: null,
      photoPreviewUrl: null,
      uploadedPhotoUrl: null,
    };
    setCharacters((prev) => [...prev, newCharacter]);
  };

  const handleRemoveCharacter = (id: string) => {
    // Find the character that's being removed
    const character = characters.find((char) => char.id === id);

    // Clean up resources
    if (character?.photoPreviewUrl) {
      URL.revokeObjectURL(character.photoPreviewUrl);
    }

    // Remove the character from state
    setCharacters((prev) => prev.filter((char) => char.id !== id));

    // Clean up file input refs
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id] = null;
      delete fileInputRefs.current[id];
    }
  };

  const handleCharacterChange = (
    id: string,
    field: keyof Character,
    value: any
  ) => {
    setCharacters((prev) =>
      prev.map((char) => {
        if (char.id === id) {
          // Handle file uploads
          if (field === "photoFile") {
            const file = value as File | null;

            // Revoke any existing object URL to avoid memory leaks
            if (char.photoPreviewUrl) {
              URL.revokeObjectURL(char.photoPreviewUrl);
            }

            // Create a new preview URL if there's a file
            const photoPreviewUrl = file ? URL.createObjectURL(file) : null;

            return {
              ...char,
              photoFile: file,
              photoPreviewUrl,
              // Reset uploaded URL when a new file is selected
              uploadedPhotoUrl: null,
            };
          }

          // Handle other fields
          return { ...char, [field]: value };
        }
        return char;
      })
    );
  };

  const handleRemovePhoto = (id: string) => {
    // Find the character
    const character = characters.find((char) => char.id === id);

    // Revoke the object URL if it exists
    if (character?.photoPreviewUrl) {
      URL.revokeObjectURL(character.photoPreviewUrl);
    }

    // Reset file input value if ref exists
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id]!.value = "";
    }

    // Update the character
    handleCharacterChange(id, "photoFile", null);
  };

  // Helper function to upload character photos
  const uploadCharacterPhoto = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-character-photo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // Get more detailed error information
        let errorDetails = "";
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || "";
        } catch {
          // If we can't parse the response as JSON, just use the status text
          errorDetails = response.statusText;
        }

        throw new Error(
          `Upload failed with status: ${response.status}${
            errorDetails ? `, Details: ${errorDetails}` : ""
          }`
        );
      }

      const data = await response.json();
      return data.url;
    } catch (error: any) {
      console.error("Error uploading character photo:", error);
      setError(`Photo upload failed: ${error.message}`);
      return null;
    }
  };

  // Handle email collection
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const handleEmailSubmit = (email: string) => {
    setUserEmail(email);
    console.log(`Will email story to: ${email}`);
    // In a real implementation, store this email for later use
  };

  // Function to suggest a story idea based on uploaded photos
  const suggestStoryIdeaFromPhotos = async () => {
    if (eventPhotos.length === 0) {
      setError("Please upload at least one photo first");
      return;
    }

    setError(null);
    setIsGeneratingIdea(true);

    try {
      // First upload the photos if they haven't been uploaded yet
      const photoUrls: string[] = [];

      for (let i = 0; i < eventPhotos.length; i++) {
        const file = eventPhotos[i];

        // Create FormData and append the file
        const formData = new FormData();
        formData.append("file", file);

        // Make API call to upload the photo
        const response = await fetch("/api/upload-character-photo", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Upload failed with status: ${response.status}`,
            errorText
          );
          throw new Error(
            `Failed to upload photo ${i + 1}: ${response.status}`
          );
        }

        const data = await response.json();
        photoUrls.push(data.url);
      }

      // Map characters with name and gender for context
      const charactersInfo = characters
        .filter((char) => char.name.trim() !== "")
        .map((char) => ({
          name: char.name,
          gender: char.gender,
        }));

      // Call the suggest-story-idea API with the uploaded photo URLs
      const suggestionResponse = await fetch("/api/suggest-story-idea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photoUrls,
          characters: charactersInfo,
          ageRange: ageRange || "5-7",
        }),
      });

      if (!suggestionResponse.ok) {
        const errorText = await suggestionResponse.text();
        console.error(
          `Suggestion API failed with status: ${suggestionResponse.status}`,
          errorText
        );

        let errorMessage = `Error: ${suggestionResponse.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If can't parse as JSON, use the raw text
          if (errorText) errorMessage = errorText;
        }

        throw new Error(errorMessage);
      }

      const suggestionData = await suggestionResponse.json();
      const suggestedIdea = suggestionData.suggestedIdea;

      // Set the story description with the AI-generated idea
      setStoryDescription(suggestedIdea);

      // Switch to describe mode to show the generated description
      setStoryPlotOption("describe");
    } catch (error: any) {
      console.error("Error generating story idea from photos:", error);
      setError(`Failed to generate story idea: ${error.message}`);
    } finally {
      setIsGeneratingIdea(false);
    }
  };

  // The main story generation function with real-time progress using SSE
  const continueStoryGeneration = async () => {
    try {
      // First, upload any character photos that need to be uploaded
      const updatedCharacters = [...characters];

      // Initial validation state
      setGenerationStatus({
        step: "validating",
        detail: "Preparing character photos...",
      });

      // Process character photo uploads in parallel
      const charUploadPromises = updatedCharacters.map(async (char, index) => {
        if (char.photoFile && !char.uploadedPhotoUrl) {
          // Show which character photo is being uploaded
          setGenerationStatus({
            step: "validating",
            detail: `Uploading photo for ${char.name || "character"}...`,
          });

          const uploadedUrl = await uploadCharacterPhoto(char.photoFile);
          if (uploadedUrl) {
            updatedCharacters[index] = {
              ...char,
              uploadedPhotoUrl: uploadedUrl,
            };
          } else {
            // If upload failed and we already set an error in uploadCharacterPhoto
            // we should stop the story generation
            throw new Error(
              `Failed to upload photo for ${char.name || "character"}`
            );
          }
        }
      });

      // If we're using the photos mode, we need to upload event photos too
      let uploadedPhotoUrls: string[] = [];
      if (storyPlotOption === "photos" && eventPhotos.length > 0) {
        setGenerationStatus({
          step: "validating",
          detail: `Uploading story photos...`,
        });

        // Process event photo uploads
        const eventPhotoPromises = eventPhotos.map(async (file, index) => {
          try {
            setGenerationStatus({
              step: "validating",
              detail: `Uploading story photo ${index + 1} of ${
                eventPhotos.length
              }...`,
            });

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload-character-photo", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Upload failed with status: ${response.status}`);
            }

            const data = await response.json();
            return data.url;
          } catch (error) {
            console.error(`Error uploading event photo ${index + 1}:`, error);
            throw new Error(`Failed to upload story photo ${index + 1}`);
          }
        });

        try {
          // Wait for all event photo uploads to complete
          uploadedPhotoUrls = await Promise.all(eventPhotoPromises);
          setUploadedStoryPhotoUrls(uploadedPhotoUrls);
          console.log(
            `Successfully uploaded ${uploadedPhotoUrls.length} story photos`
          );
        } catch (error) {
          console.error("Story photo upload failed:", error);
          setGenerationStatus({
            step: "error",
            error: (error as Error).message || "Story photo upload failed",
          });
          throw error; // Re-throw to stop the story generation process
        }
      }

      try {
        // Wait for all character photo uploads to complete
        await Promise.all(charUploadPromises);
      } catch (error) {
        // We'll catch upload errors here and stop the process
        console.error("Character photo upload failed:", error);
        setGenerationStatus({
          step: "error",
          error: (error as Error).message || "Character photo upload failed",
        });
        throw error; // Re-throw to stop the story generation process
      }

      // Prepare characters data for API (excluding client-only properties)
      const charactersForAPI = updatedCharacters.map(
        ({ id, name, isMain, gender, uploadedPhotoUrl }) => ({
          id,
          name,
          isMain,
          gender,
          uploadedPhotoUrl,
        })
      );

      // Initialize for Server-Sent Events
      // This will allow the server to send progress updates in real-time
      const requestBody: StoryRequestBody = {
        characters: charactersForAPI,
        storyPlotOption,
        storyDescription,
        ageRange,
        storyStyle,
        storyLengthTargetPages, // Number of pages for the story
        email: userEmail, // Include email if provided
      };

      // Add uploaded story photo URLs to the request if using the photos option
      if (storyPlotOption === "photos" && uploadedPhotoUrls.length > 0) {
        requestBody.uploadedStoryPhotoUrls = uploadedPhotoUrls; // Include the URLs of the uploaded photos
      }

      // Prepare the fetch POST request to the SSE endpoint
      const streamResponse = await fetch("/api/generate-story-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // Check for immediate errors
      if (!streamResponse.ok) {
        throw new Error(
          `Failed to initialize story generation: ${streamResponse.status}`
        );
      }

      // Get the readable stream from the response
      const reader = streamResponse.body?.getReader();

      if (!reader) {
        throw new Error("Failed to establish stream connection");
      }

      // Create a text decoder for the stream
      const decoder = new TextDecoder();
      let buffer = "";

      // Process incoming events from the stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("Stream closed by server");
          break;
        }

        // Decode the chunk and add it to our buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete events in the buffer
        const events = buffer.split("\n\n");
        buffer = events.pop() || ""; // Keep the last incomplete event in the buffer

        for (const event of events) {
          if (!event.trim()) continue;

          // Parse the event
          let eventType;
          let eventData;

          try {
            const eventLines = event.split("\n");
            const eventTypeStr = eventLines.find((line) =>
              line.startsWith("event:")
            );
            const dataStr = eventLines.find((line) => line.startsWith("data:"));

            if (!eventTypeStr || !dataStr) {
              console.warn("Malformed event:", event);
              continue;
            }

            eventType = eventTypeStr.slice(7).trim(); // Remove "event: "
            eventData = JSON.parse(dataStr.slice(6).trim()); // Remove "data: "

            console.log(`Received event: ${eventType}`, eventData);
          } catch (parseError) {
            console.error("Error parsing event:", parseError, "Event:", event);
            continue;
          }

          // Handle different event types
          switch (eventType) {
            case "connection":
              console.log("Connection established with server");
              break;

            case "progress":
              // Update UI based on progress event
              if (eventData.step === "validating") {
                setGenerationStatus({
                  step: "validating",
                  detail: eventData.message,
                });
              } else if (eventData.step === "writing") {
                setGenerationStatus({
                  step: "writing",
                  detail: eventData.message,
                });
              } else if (eventData.step === "illustrating") {
                // Preserve any existing previewUrl when updating illustration progress
                setGenerationStatus((prev) => {
                  const newProgress = eventData.illustrationProgress || {
                    current: 0,
                    total: 5,
                    detail: eventData.message,
                  };

                  // Preserve the existing previewUrl if it exists and isn't in the new data
                  if (
                    prev.step === "illustrating" &&
                    prev.illustrationProgress?.previewUrl &&
                    !newProgress.previewUrl
                  ) {
                    console.log(
                      "Preserving existing previewUrl during progress update"
                    );
                    newProgress.previewUrl =
                      prev.illustrationProgress.previewUrl;
                  }

                  return {
                    step: "illustrating",
                    illustrationProgress: newProgress,
                  };
                });
              } else if (eventData.step === "saving") {
                setGenerationStatus({
                  step: "saving",
                  detail: eventData.message,
                });
              }
              break;

            case "image_preview":
              console.log(
                "SSE Handler: Received image_preview event data:",
                eventData
              ); // Debug log
              if (eventData?.previewUrl) {
                // Check if previewUrl exists in data
                setGenerationStatus((prev) => {
                  // Only update if currently illustrating and progress data exists
                  if (
                    prev.step !== "illustrating" ||
                    !prev.illustrationProgress
                  ) {
                    console.warn(
                      "Received image_preview event but not in illustrating step or no progress data."
                    );
                    return prev;
                  }

                  // Merge the new previewUrl correctly
                  const updatedProgress = {
                    ...prev.illustrationProgress,
                    previewUrl: eventData.previewUrl, // Update the preview URL
                    // Optionally update current count if needed:
                    // current: eventData.pageIndex + 1 // If pageIndex is reliable
                  };

                  console.log(
                    "SSE Handler: Updating generationStatus with preview:",
                    updatedProgress
                  ); // Log the update

                  return {
                    ...prev,
                    illustrationProgress: updatedProgress,
                  };
                });
              } else {
                console.warn(
                  "Received image_preview event but previewUrl was missing:",
                  eventData
                );
              }
              break;

            case "complete":
              // Story generation completed successfully
              setGenerationStatus({ step: "complete" });

              // Track successful story completion with Meta Pixel
              if (typeof window !== "undefined" && window.trackFBEvent) {
                window.trackFBEvent("Purchase", {
                  content_name: "story_created",
                  content_category: "story_creation",
                  content_type: "product",
                  content_ids: [eventData.storyId],
                  contents: [
                    {
                      id: "story_creation",
                      quantity: 1,
                    },
                  ],
                  num_items: 1,
                  currency: "USD",
                  value: 0, // This is a free product, but tracking value as 0
                });
                console.log(
                  "Meta Pixel: Tracked Purchase event for story completion"
                );
              }

              // Small delay before redirecting
              setTimeout(() => {
                router.push(`/story/${eventData.storyId}`);
              }, 1500);
              break;

            case "error":
              // Handle error
              console.error("Received error event:", eventData);
              setError(eventData.message);
              setGenerationStatus({
                step: "error",
                error: eventData.message,
              });
              break;
          }
        }
      }
    } catch (err: any) {
      console.error("Story generation failed:", err);
      const errorMsg =
        err.message || "Failed to create story. Please try again.";
      setError(errorMsg);
      setGenerationStatus({
        step: "error",
        error: errorMsg,
      });
    } finally {
      // Don't hide the progress dialog on error - user can close it
      if (generationStatus.step !== "error") {
        setIsLoading(false);
        // Don't close progress dialog on completion - we'll redirect
      }
    }
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous error
    setError(null);

    // Basic form validation
    if (characters.some((char) => !char.name.trim())) {
      setError("All characters must have a name");
      return;
    }

    if (!ageRange) {
      setError("Please select an age range");
      return;
    }

    if (!storyStyle) {
      setError("Please select a story style");
      return;
    }

    if (storyPlotOption === "describe" && !storyDescription.trim()) {
      setError("Please enter a story description");
      return;
    }

    if (storyPlotOption === "photos" && eventPhotos.length === 0) {
      setError("Please upload at least one photo for the story");
      return;
    }

    // Pre-validate all photos to make sure they're valid image files
    const invalidPhotos = characters.filter(
      (char) =>
        char.photoFile &&
        (!char.photoFile.type.startsWith("image/") ||
          char.photoFile.size > 5 * 1024 * 1024) // 5MB limit
    );

    if (invalidPhotos.length > 0) {
      const invalidCharNames = invalidPhotos
        .map((char) => char.name || "Unnamed character")
        .join(", ");

      setError(
        `Invalid photos detected for: ${invalidCharNames}. Photos must be images under 5MB.`
      );
      return;
    }

    // Track story generation start event with Meta Pixel
    if (typeof window !== "undefined" && window.trackFBEvent) {
      window.trackFBEvent("InitiateCheckout", {
        content_category: "story_creation",
        content_name: "start_story_generation",
        num_items: characters.length,
        contents: [
          {
            id: "story_generation",
            quantity: 1,
          },
        ],
      });
      console.log(
        "Meta Pixel: Tracked InitiateCheckout event for story generation start"
      );
    }

    // Set loading state and show progress dialog
    setIsLoading(true);
    setShowProgress(true);
    setGenerationStatus({ step: "validating" });

    // Validation step - small delay for UI feedback
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Start generation process
    continueStoryGeneration();
  };

  // Add step navigation handlers
  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, FORM_STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Add step validation
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 0: // Characters step
        return characters.every((char) => char.name.trim() !== "");
      case 1: // Story plot step
        if (storyPlotOption === "describe") {
          return storyDescription.trim() !== "";
        }
        return eventPhotos.length > 0;
      case 2: // Story details step
        return ageRange !== "" && storyStyle !== "";
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F6F8FF] to-white">
      <div className="container mx-auto h-screen sm:py-10 px-4 flex flex-row items-start justify-center">
        {/* Story Generation Progress Dialog */}
        <StoryGenerationProgress
          open={showProgress}
          onOpenChange={(open) => {
            if (
              generationStatus.step === "error" ||
              generationStatus.step === "complete"
            ) {
              setShowProgress(open);
            }
          }}
          status={generationStatus}
          onEmailSubmit={handleEmailSubmit}
        />

        <form className="space-y-6 sm:space-y-8" onSubmit={handleSubmit}>
          {error && (
            <div className="fixed top-4 left-1/2 sm:left-8 -translate-x-1/2 sm:-translate-x-0 z-50 w-full max-w-md animate-in fade-in slide-in-from-top-4">
              <Alert variant="destructive" className="border-red-200 shadow-lg">
                <AlertTitle className="text-red-600">Error</AlertTitle>
                <AlertDescription className="text-red-600/90">
                  {error}
                </AlertDescription>
              </Alert>
            </div>
          )}
          <div className="w-[100vw] sm:w-[85vw] md:w-[85vw] mt-8 bg-white rounded-2xl p-8 sm:p-8 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />

            <Stepper
              steps={FORM_STEPS}
              currentStep={currentStep}
              onNext={handleNext}
              onBack={handleBack}
              isNextDisabled={!isCurrentStepValid()}
              showSubmit={currentStep === FORM_STEPS.length - 1}
              isSubmitLoading={isLoading}
            />

            {/* Step content */}
            {currentStep === 0 && (
              <CharactersSection
                characters={characters}
                onAddCharacter={handleAddCharacter}
                onRemoveCharacter={handleRemoveCharacter}
                onCharacterChange={handleCharacterChange}
                onRemovePhoto={handleRemovePhoto}
                handleRemoveCharacter={handleRemoveCharacter}
                onGoNext={handleNext}
              />
            )}

            {currentStep === 1 && (
              <StoryPlotSection
                storyPlotOption={storyPlotOption}
                onPlotOptionChange={setStoryPlotOption}
                storyDescription={storyDescription}
                onDescriptionChange={setStoryDescription}
                eventPhotos={eventPhotos}
                eventPhotosPreviews={eventPhotosPreviews}
                onEventPhotosUpload={handleEventPhotosUpload}
                onRemoveEventPhoto={handleRemoveEventPhoto}
                onSuggestStoryIdea={suggestStoryIdeaFromPhotos}
                isGeneratingIdea={isGeneratingIdea}
                eventPhotosInputRef={eventPhotosInputRef}
                onBack={handleBack}
                onSubmit={handleSubmit}
              />
            )}

            {currentStep === 2 && (
              <StoryDetailsSection
                ageRange={ageRange}
                onAgeRangeChange={setAgeRange}
                storyStyle={storyStyle}
                onStoryStyleChange={setStoryStyle}
                storyLengthTargetPages={storyLengthTargetPages}
                onStoryLengthChange={setStoryLengthTargetPages}
              />
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
