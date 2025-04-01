import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Camera, Plus, X, Trash2 } from "lucide-react";

// Character interface
export interface Character {
  id: string;
  name: string;
  isMain: boolean;
  gender: 'female' | 'male' | 'unspecified';
  photoFile: File | null;
  photoPreviewUrl: string | null;
  uploadedPhotoUrl: string | null;
}

interface CharactersSectionProps {
  characters: Character[];
  onAddCharacter: () => void;
  onRemoveCharacter: (id: string) => void;
  onCharacterChange: (id: string, field: keyof Character, value: any) => void;
  onRemovePhoto: (id: string) => void;
  fileInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}

export function CharactersSection({
  characters,
  onAddCharacter,
  onRemoveCharacter,
  onCharacterChange,
  onRemovePhoto,
  fileInputRefs,
}: CharactersSectionProps) {
  return (
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
                  onCharacterChange(character.id, 'photoFile', file);
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
                    onClick={() => onRemovePhoto(character.id)}
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
                onChange={(e) => onCharacterChange(character.id, 'name', e.target.value)}
                className="border-primary/20 focus:border-primary/60"
              />
              
              <div className="mt-3">
                <Label className="text-sm font-medium mb-2 block">
                  Gender
                </Label>
                <RadioGroup 
                  value={character.gender}
                  onValueChange={(value) => onCharacterChange(character.id, 'gender', value)}
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
              onClick={() => onRemoveCharacter(character.id)}
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
          onClick={onAddCharacter}
        >
          <Plus className="mr-1 h-4 w-4 group-hover:scale-110 transition-transform" /> 
          Add Another Character
        </Button>
      </CardContent>
    </Card>
  );
} 