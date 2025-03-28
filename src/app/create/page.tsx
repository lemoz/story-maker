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
import { Loader2, X, Trash2, Camera } from "lucide-react";

// Character interface
interface Character {
  id: string;
  name: string;
  isMain: boolean;
  photoFile: File | null;
  photoPreviewUrl: string | null;
  uploadedPhotoUrl: string | null;
}

export default function CreateStoryPage() {
  const router = useRouter();
  // Create refs for file inputs
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  
  // State hooks for form values
  const [storyPlotOption, setStoryPlotOption] = useState<string>('describe');
  const [ageRange, setAgeRange] = useState<string>('');
  const [storyStyle, setStoryStyle] = useState<string>('');
  const [characters, setCharacters] = useState<Character[]>([{ 
    id: crypto.randomUUID(), 
    name: '', 
    isMain: true,
    photoFile: null,
    photoPreviewUrl: null,
    uploadedPhotoUrl: null
  }]);
  const [storyDescription, setStoryDescription] = useState<string>('');
  
  // State hooks for form submission
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
    };
  }, [characters]);

  // Handler functions for characters
  const handleAddCharacter = () => {
    const newCharacter: Character = {
      id: crypto.randomUUID(),
      name: '',
      isMain: false,
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
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading character photo:', error);
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
      
      // Process all uploads in parallel for efficiency
      const uploadPromises = updatedCharacters.map(async (char, index) => {
        if (char.photoFile && !char.uploadedPhotoUrl) {
          const uploadedUrl = await uploadCharacterPhoto(char.photoFile);
          if (uploadedUrl) {
            updatedCharacters[index] = {
              ...char,
              uploadedPhotoUrl: uploadedUrl
            };
          }
        }
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Prepare characters data for API (excluding client-only properties)
      const charactersForAPI = updatedCharacters.map(({ id, name, isMain, uploadedPhotoUrl }) => ({
        id,
        name,
        isMain,
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
        email: userEmail // Include email if provided
      };
      
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
                setGenerationStatus({
                  step: 'illustrating',
                  illustrationProgress: eventData.illustrationProgress || {
                    current: 0,
                    total: 5,
                    detail: eventData.message
                  }
                });
              } else if (eventData.step === 'saving') {
                setGenerationStatus({
                  step: 'saving',
                  detail: eventData.message
                });
              }
              break;
              
            case 'image_preview':
              // Update the UI with the preview image
              setGenerationStatus(prev => {
                if (prev.step !== 'illustrating' || !prev.illustrationProgress) {
                  return prev;
                }
                
                return {
                  ...prev,
                  illustrationProgress: {
                    ...prev.illustrationProgress,
                    previewUrl: eventData.previewUrl
                  }
                };
              });
              break;
              
            case 'complete':
              // Story generation completed successfully
              setGenerationStatus({ step: 'complete' });
              
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
    <div className="container mx-auto max-w-3xl py-10 px-4">
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
            {characters.map((character) => (
              <div key={character.id} className="flex items-start gap-4 mb-4 p-4 border rounded">
                {/* Photo Upload Area */}
                <div className="relative h-24 w-24 shrink-0">
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
                    <div className="relative w-full h-full rounded-md overflow-hidden">
                      <Image
                        src={character.photoPreviewUrl}
                        alt={`${character.name || 'Character'} preview`}
                        fill
                        sizes="(max-width: 768px) 100px, 150px"
                        className="object-cover"
                      />
                      {/* Remove photo button */}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-0 right-0 h-6 w-6 bg-opacity-70"
                        onClick={() => handleRemovePhoto(character.id)}
                        aria-label="Remove photo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted"
                      onClick={() => fileInputRefs.current[character.id]?.click()}
                    >
                      <Camera className="h-6 w-6" />
                      <span className="text-xs">Upload Photo</span>
                    </Button>
                  )}
                </div>
                
                <div className="flex-grow space-y-2">
                  <Label htmlFor={`char-name-${character.id}`}>Character Name</Label>
                  <Input
                    id={`char-name-${character.id}`}
                    placeholder="Enter name"
                    value={character.name}
                    onChange={(e) => handleCharacterChange(character.id, 'name', e.target.value)}
                  />
                  <div className="flex items-center space-x-2">
                    {/* Main character indicator */}
                    <span className="text-xs font-medium">
                      {character.isMain ? 'Main Character' : ''}
                    </span>
                    {/* Photo status indicator */}
                    {character.uploadedPhotoUrl && (
                      <span className="text-xs text-green-600">✓ Photo uploaded</span>
                    )}
                  </div>
                </div>
                
                {/* Remove character button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
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
              className="w-full"
              onClick={handleAddCharacter}
            >
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