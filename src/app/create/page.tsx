"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { Slider } from "@/components/ui/slider";
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
import { 
  StoryGenerationProgress, 
  type StoryGenerationStatus 
} from "@/components/story-generation-progress";
import { Loader2, X, Trash2, Camera, Plus } from "lucide-react";

// Character interface
interface Character {
  id: string;
  name: string;
  isMain: boolean;
  gender: 'female' | 'male' | 'unspecified';
  photoFile: File | null;
  photoPreviewUrl: string | null;
  uploadedPhotoUrl: string | null;
}

export default function CreateStoryPage() {
  const router = useRouter();
  // Create refs for file inputs
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  // Create a specific ref for the event photos input
  const eventPhotosInputRef = React.useRef<HTMLInputElement | null>(null);
  
  // State hooks for form values
  const [storyPlotOption, setStoryPlotOption] = useState<string>('photos');
  const [ageRange, setAgeRange] = useState<string>('');
  const [storyStyle, setStoryStyle] = useState<string>('');
  const [storyLengthTargetPages, setStoryLengthTargetPages] = useState<number>(6); // Default ~6 pages
  const [characters, setCharacters] = useState<Character[]>([{ 
    id: crypto.randomUUID(), 
    name: '', 
    isMain: true,
    gender: 'unspecified',
    photoFile: null,
    photoPreviewUrl: null,
    uploadedPhotoUrl: null
  }]);
  const [storyDescription, setStoryDescription] = useState<string>('');
  const [eventPhotos, setEventPhotos] = useState<File[]>([]); // State for event photos
  const [eventPhotosPreviews, setEventPhotosPreviews] = useState<string[]>([]); // State for preview URLs
  const [uploadedStoryPhotoUrls, setUploadedStoryPhotoUrls] = useState<string[]>([]); // State for uploaded photo URLs
  
  // State hooks for form submission
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState<boolean>(false);
  const [generationStatus, setGenerationStatus] = useState<StoryGenerationStatus>({
    step: "validating"
  });

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      // When component unmounts, revoke all object URLs
      characters.forEach(char => {
        if (char.photoPreviewUrl) {
          URL.revokeObjectURL(char.photoPreviewUrl);
        }
      });
      
      // Clean up event photo previews
      eventPhotosPreviews.forEach(url => {
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
    const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (newFiles.length === 0) {
      setError('Please select valid image files');
      return;
    }
    
    // Check file sizes (max 5MB each)
    const oversizedFiles = newFiles.filter(file => file.size > 5 * 1024 * 1024);
    
    if (oversizedFiles.length > 0) {
      setError(`${oversizedFiles.length} file(s) exceed the 5MB size limit`);
      return;
    }
    
    // Create preview URLs for the new files
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    
    // Update state with new files and previews
    setEventPhotos(prev => [...prev, ...newFiles]);
    setEventPhotosPreviews(prev => [...prev, ...newPreviews]);
    
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };
  
  // Handle removing an event photo
  const handleRemoveEventPhoto = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(eventPhotosPreviews[index]);
    
    // Remove the file and preview from state
    setEventPhotos(prev => prev.filter((_, i) => i !== index));
    setEventPhotosPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handler functions for characters
  const handleAddCharacter = () => {
    const newCharacter: Character = {
      id: crypto.randomUUID(),
      name: '',
      isMain: false,
      gender: 'unspecified',
      photoFile: null,
      photoPreviewUrl: null,
      uploadedPhotoUrl: null
    };
    setCharacters(prev => [...prev, newCharacter]);
  };

  const handleRemoveCharacter = (id: string) => {
    // Find the character that's being removed
    const character = characters.find(char => char.id === id);
    
    // Clean up resources
    if (character?.photoPreviewUrl) {
      URL.revokeObjectURL(character.photoPreviewUrl);
    }
    
    // Remove the character from state
    setCharacters(prev => prev.filter(char => char.id !== id));
    
    // Clean up file input refs
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id] = null;
      delete fileInputRefs.current[id];
    }
  };

  const handleCharacterChange = (id: string, field: keyof Character, value: any) => {
    setCharacters(prev => prev.map(char => {
      if (char.id === id) {
        // Handle file uploads
        if (field === 'photoFile') {
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
            uploadedPhotoUrl: null
          };
        }
        
        // Handle other fields
        return { ...char, [field]: value };
      }
      return char;
    }));
  };
  
  const handleRemovePhoto = (id: string) => {
    // Find the character
    const character = characters.find(char => char.id === id);
    
    // Revoke the object URL if it exists
    if (character?.photoPreviewUrl) {
      URL.revokeObjectURL(character.photoPreviewUrl);
    }
    
    // Reset file input value if ref exists
    if (fileInputRefs.current[id]) {
      fileInputRefs.current[id]!.value = '';
    }
    
    // Update the character
    handleCharacterChange(id, 'photoFile', null);
  };

  // Helper function to upload character photos
  const uploadCharacterPhoto = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-character-photo', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        // Get more detailed error information
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || '';
        } catch {
          // If we can't parse the response as JSON, just use the status text
          errorDetails = response.statusText;
        }
        
        throw new Error(`Upload failed with status: ${response.status}${errorDetails ? `, Details: ${errorDetails}` : ''}`);
      }
      
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading character photo:', error);
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
      setError('Please upload at least one photo first');
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
        formData.append('file', file);
        
        // Make API call to upload the photo
        const response = await fetch('/api/upload-character-photo', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Upload failed with status: ${response.status}`, errorText);
          throw new Error(`Failed to upload photo ${i + 1}: ${response.status}`);
        }
        
        const data = await response.json();
        photoUrls.push(data.url);
      }
      
      // Map characters with name and gender for context
      const charactersInfo = characters
        .filter(char => char.name.trim() !== '')
        .map(char => ({
          name: char.name,
          gender: char.gender
        }));
      
      // Call the suggest-story-idea API with the uploaded photo URLs
      const suggestionResponse = await fetch('/api/suggest-story-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoUrls,
          characters: charactersInfo,
          ageRange: ageRange || '5-7'
        })
      });
      
      if (!suggestionResponse.ok) {
        const errorText = await suggestionResponse.text();
        console.error(`Suggestion API failed with status: ${suggestionResponse.status}`, errorText);
        
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
      setStoryPlotOption('describe');
      
    } catch (error) {
      console.error('Error generating story idea from photos:', error);
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
        detail: "Preparing character photos..."
      });
      
      // Process character photo uploads in parallel
      const charUploadPromises = updatedCharacters.map(async (char, index) => {
        if (char.photoFile && !char.uploadedPhotoUrl) {
          // Show which character photo is being uploaded
          setGenerationStatus({ 
            step: "validating",
            detail: `Uploading photo for ${char.name || 'character'}...`
          });
          
          const uploadedUrl = await uploadCharacterPhoto(char.photoFile);
          if (uploadedUrl) {
            updatedCharacters[index] = {
              ...char,
              uploadedPhotoUrl: uploadedUrl
            };
          } else {
            // If upload failed and we already set an error in uploadCharacterPhoto
            // we should stop the story generation
            throw new Error(`Failed to upload photo for ${char.name || 'character'}`);
          }
        }
      });
      
      // If we're using the photos mode, we need to upload event photos too
      let uploadedPhotoUrls: string[] = [];
      if (storyPlotOption === 'photos' && eventPhotos.length > 0) {
        setGenerationStatus({ 
          step: "validating",
          detail: `Uploading story photos...`
        });
        
        // Process event photo uploads
        const eventPhotoPromises = eventPhotos.map(async (file, index) => {
          try {
            setGenerationStatus({ 
              step: "validating",
              detail: `Uploading story photo ${index + 1} of ${eventPhotos.length}...`
            });
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/upload-character-photo', {
              method: 'POST',
              body: formData
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
          console.log(`Successfully uploaded ${uploadedPhotoUrls.length} story photos`);
        } catch (error) {
          console.error('Story photo upload failed:', error);
          setGenerationStatus({ 
            step: 'error',
            error: error.message || 'Story photo upload failed'
          });
          throw error; // Re-throw to stop the story generation process
        }
      }
      
      try {
        // Wait for all character photo uploads to complete
        await Promise.all(charUploadPromises);
      } catch (error) {
        // We'll catch upload errors here and stop the process
        console.error('Character photo upload failed:', error);
        setGenerationStatus({ 
          step: 'error',
          error: error.message || 'Character photo upload failed'
        });
        throw error; // Re-throw to stop the story generation process
      }
      
      // Prepare characters data for API (excluding client-only properties)
      const charactersForAPI = updatedCharacters.map(({ id, name, isMain, gender, uploadedPhotoUrl }) => ({
        id,
        name,
        isMain,
        gender,
        uploadedPhotoUrl
      }));
      
      // Initialize for Server-Sent Events
      // This will allow the server to send progress updates in real-time
      const requestBody = {
        characters: charactersForAPI,
        storyPlotOption,
        storyDescription,
        ageRange,
        storyStyle,
        storyLengthTargetPages, // Number of pages for the story
        email: userEmail // Include email if provided
      };
      
      // Add uploaded story photo URLs to the request if using the photos option
      if (storyPlotOption === 'photos' && uploadedPhotoUrls.length > 0) {
        requestBody.uploadedStoryPhotoUrls = uploadedPhotoUrls; // Include the URLs of the uploaded photos
      }
      
      // Prepare the fetch POST request to the SSE endpoint
      const streamResponse = await fetch('/api/generate-story-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      // Check for immediate errors
      if (!streamResponse.ok) {
        throw new Error(`Failed to initialize story generation: ${streamResponse.status}`);
      }
      
      // Get the readable stream from the response
      const reader = streamResponse.body?.getReader();
      
      if (!reader) {
        throw new Error('Failed to establish stream connection');
      }
      
      // Create a text decoder for the stream
      const decoder = new TextDecoder();
      let buffer = '';
      
      // Process incoming events from the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream closed by server');
          break;
        }
        
        // Decode the chunk and add it to our buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete events in the buffer
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // Keep the last incomplete event in the buffer
        
        for (const event of events) {
          if (!event.trim()) continue;
          
          // Parse the event
          let eventType;
          let eventData;
          
          try {
            const eventLines = event.split('\n');
            const eventTypeStr = eventLines.find(line => line.startsWith('event:'));
            const dataStr = eventLines.find(line => line.startsWith('data:'));
            
            if (!eventTypeStr || !dataStr) {
              console.warn('Malformed event:', event);
              continue;
            }
            
            eventType = eventTypeStr.slice(7).trim(); // Remove "event: "
            eventData = JSON.parse(dataStr.slice(6).trim()); // Remove "data: "
            
            console.log(`Received event: ${eventType}`, eventData);
          } catch (parseError) {
            console.error('Error parsing event:', parseError, 'Event:', event);
            continue;
          }
          
          // Handle different event types
          switch (eventType) {
            case 'connection':
              console.log('Connection established with server');
              break;
              
            case 'progress':
              // Update UI based on progress event
              if (eventData.step === 'validating') {
                setGenerationStatus({
                  step: 'validating',
                  detail: eventData.message
                });
              } else if (eventData.step === 'writing') {
                setGenerationStatus({
                  step: 'writing',
                  detail: eventData.message
                });
              } else if (eventData.step === 'illustrating') {
                // Preserve any existing previewUrl when updating illustration progress
                setGenerationStatus(prev => {
                  const newProgress = eventData.illustrationProgress || {
                    current: 0,
                    total: 5,
                    detail: eventData.message
                  };
                  
                  // Preserve the existing previewUrl if it exists and isn't in the new data
                  if (prev.step === 'illustrating' && 
                      prev.illustrationProgress?.previewUrl && 
                      !newProgress.previewUrl) {
                    console.log("Preserving existing previewUrl during progress update");
                    newProgress.previewUrl = prev.illustrationProgress.previewUrl;
                  }
                  
                  return {
                    step: 'illustrating',
                    illustrationProgress: newProgress
                  };
                });
              } else if (eventData.step === 'saving') {
                setGenerationStatus({
                  step: 'saving',
                  detail: eventData.message
                });
              }
              break;
              
            case 'image_preview':
              console.log("SSE Handler: Received image_preview event data:", eventData); // Debug log
              if (eventData?.previewUrl) { // Check if previewUrl exists in data
                setGenerationStatus(prev => {
                  // Only update if currently illustrating and progress data exists
                  if (prev.step !== 'illustrating' || !prev.illustrationProgress) {
                    console.warn("Received image_preview event but not in illustrating step or no progress data.");
                    return prev;
                  }

                  // Merge the new previewUrl correctly
                  const updatedProgress = {
                    ...prev.illustrationProgress,
                    previewUrl: eventData.previewUrl // Update the preview URL
                    // Optionally update current count if needed:
                    // current: eventData.pageIndex + 1 // If pageIndex is reliable
                  };

                  console.log("SSE Handler: Updating generationStatus with preview:", updatedProgress); // Log the update

                  return {
                    ...prev,
                    illustrationProgress: updatedProgress
                  };
                });
              } else {
                console.warn("Received image_preview event but previewUrl was missing:", eventData);
              }
              break;
              
            case 'complete':
              // Story generation completed successfully
              setGenerationStatus({ step: 'complete' });
              
              // Track successful story completion with Meta Pixel
              if (typeof window !== 'undefined' && window.trackFBEvent) {
                window.trackFBEvent('Purchase', {
                  content_name: 'story_created',
                  content_category: 'story_creation',
                  content_type: 'product',
                  content_ids: [eventData.storyId],
                  contents: [
                    {
                      id: 'story_creation',
                      quantity: 1
                    }
                  ],
                  num_items: 1,
                  currency: 'USD',
                  value: 0, // This is a free product, but tracking value as 0
                });
                console.log("Meta Pixel: Tracked Purchase event for story completion");
              }
              
              // Small delay before redirecting
              setTimeout(() => {
                router.push(`/story/${eventData.storyId}`);
              }, 1500);
              break;
              
            case 'error':
              // Handle error
              console.error('Received error event:', eventData);
              setError(eventData.message);
              setGenerationStatus({
                step: 'error',
                error: eventData.message
              });
              break;
          }
        }
      }
      
    } catch (err: any) {
      console.error('Story generation failed:', err);
      const errorMsg = err.message || 'Failed to create story. Please try again.';
      setError(errorMsg);
      setGenerationStatus({ 
        step: 'error',
        error: errorMsg
      });
    } finally {
      // Don't hide the progress dialog on error - user can close it
      if (generationStatus.step !== 'error') {
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
    if (characters.some(char => !char.name.trim())) {
      setError('All characters must have a name');
      return;
    }
    
    if (!ageRange) {
      setError('Please select an age range');
      return;
    }
    
    if (!storyStyle) {
      setError('Please select a story style');
      return;
    }
    
    if (storyPlotOption === 'describe' && !storyDescription.trim()) {
      setError('Please enter a story description');
      return;
    }
    
    if (storyPlotOption === 'photos' && eventPhotos.length === 0) {
      setError('Please upload at least one photo for the story');
      return;
    }
    
    // Pre-validate all photos to make sure they're valid image files
    const invalidPhotos = characters.filter(char => 
      char.photoFile && 
      (!char.photoFile.type.startsWith('image/') || 
       char.photoFile.size > 5 * 1024 * 1024) // 5MB limit
    );
    
    if (invalidPhotos.length > 0) {
      const invalidCharNames = invalidPhotos
        .map(char => char.name || 'Unnamed character')
        .join(', ');
      
      setError(`Invalid photos detected for: ${invalidCharNames}. Photos must be images under 5MB.`);
      return;
    }
    
    // Track story generation start event with Meta Pixel
    if (typeof window !== 'undefined' && window.trackFBEvent) {
      window.trackFBEvent('InitiateCheckout', {
        content_category: 'story_creation',
        content_name: 'start_story_generation',
        num_items: characters.length,
        contents: [
          {
            id: 'story_generation',
            quantity: 1
          }
        ]
      });
      console.log("Meta Pixel: Tracked InitiateCheckout event for story generation start");
    }
    
    // Set loading state and show progress dialog
    setIsLoading(true);
    setShowProgress(true);
    setGenerationStatus({ step: "validating" });
    
    // Validation step - small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Start generation process
    continueStoryGeneration();
  };

  return (
    <div className="container mx-auto max-w-3xl py-6 sm:py-10 px-4">
      {/* Story Generation Progress Dialog */}
      <StoryGenerationProgress
        open={showProgress}
        onOpenChange={(open) => {
          // Only allow closing if there's an error or we're done
          if (generationStatus.step === "error" || generationStatus.step === "complete") {
            setShowProgress(open);
          }
        }}
        status={generationStatus}
        onEmailSubmit={handleEmailSubmit}
      />
      
      <div className="relative mb-10 sm:mb-12">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg -z-10"></div>
        <h1 className="text-3xl sm:text-4xl font-bold text-center pt-6 pb-2">Create Your Story</h1>
        <p className="text-muted-foreground text-center text-sm sm:text-base max-w-xl mx-auto mb-2">
          Fill in the details below to generate a personalized story with your characters and photos.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 border border-destructive/20 animate-in fade-in duration-300">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form className="space-y-6 sm:space-y-8" onSubmit={handleSubmit}>
        {/* Section 1: Characters */}
        <Card className="shadow-sm border-primary/10 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 opacity-70"></div>
          <CardHeader className="relative pb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-primary rounded-full"></div>
              <CardTitle>1. Who is the story about?</CardTitle>
            </div>
            <CardDescription className="mt-2">
              Add characters and upload photos to guide the story illustrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {characters.map((character) => (
              <div key={character.id} 
                className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 p-4 border rounded-lg bg-background/50 hover:bg-background/80 transition-colors shadow-sm"
              >
                {/* Photo Upload Area */}
                <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    id={`photo-${character.id}`}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleCharacterChange(character.id, 'photoFile', file);
                    }}
                    ref={(el) => {
                      fileInputRefs.current[character.id] = el;
                    }}
                  />
                  
                  {/* Photo preview or placeholder */}
                  {character.photoPreviewUrl ? (
                    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-md ring-1 ring-primary/20">
                      <Image
                        src={character.photoPreviewUrl}
                        alt={`${character.name || 'Character'} preview`}
                        fill
                        sizes="(max-width: 768px) 112px, 128px"
                        className="object-cover"
                      />
                      {/* Remove photo button */}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-7 w-7 rounded-full"
                        onClick={() => handleRemovePhoto(character.id)}
                        aria-label="Remove photo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/50 rounded-xl hover:bg-muted/80 hover:border-primary/50 transition-colors shadow-sm"
                      onClick={() => fileInputRefs.current[character.id]?.click()}
                    >
                      <Camera className="h-6 w-6 text-primary" />
                      <span className="text-xs">Upload Photo</span>
                    </Button>
                  )}
                </div>
                
                <div className="flex-grow space-y-3 w-full sm:w-auto">
                  <Label htmlFor={`char-name-${character.id}`} className="text-sm font-medium">
                    Character Name
                  </Label>
                  <Input
                    id={`char-name-${character.id}`}
                    placeholder="Enter name"
                    value={character.name}
                    onChange={(e) => handleCharacterChange(character.id, 'name', e.target.value)}
                    className="border-primary/20 focus:border-primary/60"
                  />
                  
                  <div className="mt-3">
                    <Label className="text-sm font-medium mb-2 block">
                      Gender
                    </Label>
                    <RadioGroup 
                      value={character.gender}
                      onValueChange={(value) => handleCharacterChange(character.id, 'gender', value)}
                      className="flex flex-wrap gap-4 mt-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id={`gender-female-${character.id}`} />
                        <Label htmlFor={`gender-female-${character.id}`} className="cursor-pointer">Female</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id={`gender-male-${character.id}`} />
                        <Label htmlFor={`gender-male-${character.id}`} className="cursor-pointer">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unspecified" id={`gender-unspecified-${character.id}`} />
                        <Label htmlFor={`gender-unspecified-${character.id}`} className="cursor-pointer">Unspecified</Label>
                      </div>
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground mt-2">
                      Character gender helps the AI create more accurate illustrations and stories
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {/* Main character indicator */}
                    {character.isMain && (
                      <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Main Character
                      </span>
                    )}
                    {/* Photo status indicator */}
                    {character.uploadedPhotoUrl && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Photo uploaded
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Remove character button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hover:bg-red-50 hover:text-red-600 transition-colors rounded-full h-8 w-8 self-start mt-0 sm:mt-2"
                  onClick={() => handleRemoveCharacter(character.id)}
                  aria-label="Remove Character"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full group border-dashed border-primary/30 hover:border-primary hover:bg-primary/5"
              onClick={handleAddCharacter}
            >
              <Plus className="mr-1 h-4 w-4 group-hover:scale-110 transition-transform" /> 
              Add Another Character
            </Button>
          </CardContent>
        </Card>

        {/* Section 2: Story Plot/Scenes */}
        <Card className="shadow-sm border-primary/10 overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-primary/5 rounded-br-full -z-10 opacity-70"></div>
          <CardHeader className="relative pb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-primary rounded-full"></div>
              <CardTitle>2. What happens in the story?</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup 
              value={storyPlotOption} 
              onValueChange={setStoryPlotOption}
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
                    onChange={handleEventPhotosUpload}
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
                                  handleRemoveEventPhoto(index);
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
                        onClick={suggestStoryIdeaFromPhotos}
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
                    onChange={(e) => setStoryDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Be as detailed as you like. Include characters, locations, and key story moments.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Story Details */}
        <Card className="shadow-sm border-primary/10 overflow-hidden">
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-primary/5 rounded-tl-full -z-10 opacity-50"></div>
          <CardHeader className="relative pb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-primary rounded-full"></div>
              <CardTitle>3. Story Details</CardTitle>
            </div>
            <CardDescription className="mt-2">
              Customize your story's audience and style.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="age-range" className="text-sm font-medium">Child's Age Range</Label>
                <Select 
                  value={ageRange} 
                  onValueChange={setAgeRange}
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
                  onValueChange={setStoryStyle}
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
                onValueChange={(newValueArray) => setStoryLengthTargetPages(newValueArray[0])} // Update state with the first value
                className="py-2" // Add vertical padding for better thumb interaction
              />
              <p className="text-xs text-muted-foreground pt-1">Adjust the slider to set the desired story length (3-10 pages).</p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="pt-4 sm:pt-6">
          <Button 
            type="submit" 
            size="lg" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors py-6 rounded-xl shadow-md relative overflow-hidden group"
            disabled={isLoading}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-foreground/10 to-transparent opacity-0 group-hover:opacity-20 transition-opacity"></div>
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span className="text-base">Creating Your Story...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="text-lg font-medium">Create My Story</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-2">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Your personalized story will be generated in just a few moments.
          </p>
        </div>
      </form>
    </div>
  );
}