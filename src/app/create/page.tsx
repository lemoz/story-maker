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
import { Loader2, X, Upload, Trash2, Camera } from "lucide-react";

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
  
  // Form submission handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous error
    setError(null);
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // First, upload any character photos that need to be uploaded
      const updatedCharacters = [...characters];
      
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
      
      // Make API call to generate story
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characters: charactersForAPI,
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