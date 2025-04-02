import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Camera, Plus, X, Trash2 } from "lucide-react";

// Character interface
export interface Character {
  id: string;
  name: string;
  isMain: boolean;
  gender: "female" | "male" | "unspecified";
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
  fileInputRefs: React.MutableRefObject<
    Record<string, HTMLInputElement | null>
  >;
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
    <div className="min-h-[300px] w-full flex flex-col items-center justify-start">
      {characters.length === 0 ? (
        <div className="w-full h-full rounded-2xl bg-white-200 shadow-md transition-all ease-in-out duration-150 py-12 px-8 text-center flex gap-4 flex-col items-center justify-center">
          <div className="flex justify-center">
            <svg
              className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              ></path>
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">
              No characters added yet
            </h3>
            <p className="text-gray-500">
              Start by adding your first character to the story!
            </p>
          </div>
          <Button
            type="button"
            className="bg-[#9B87F5] hover:bg-[#7E69AB] text-white rounded-xl px-6 py-3 flex items-center gap-2 transition-colors mx-auto"
            onClick={onAddCharacter}
          >
            <Plus className="h-5 w-5" />
            Add Character
          </Button>
        </div>
      ) : (
        <div className="w-full space-y-6">
          {characters.map((character) => (
            <div
              key={character.id}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-8 p-8 border rounded-2xl bg-background/50 hover:bg-background/80 transition-colors shadow-sm"
            >
              {/* Photo Upload Area */}
              <div className="relative h-40 w-40 sm:h-48 sm:w-48 shrink-0">
                {/* Hidden file input */}
                <input
                  type="file"
                  id={`photo-${character.id}`}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    onCharacterChange(character.id, "photoFile", file);
                  }}
                  ref={(el) => {
                    fileInputRefs.current[character.id] = el;
                  }}
                />

                {/* Photo preview or placeholder */}
                {character.photoPreviewUrl ? (
                  <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-md ring-1 ring-primary/20">
                    <Image
                      src={character.photoPreviewUrl}
                      alt={`${character.name || "Character"} preview`}
                      fill
                      sizes="(max-width: 768px) 160px, 192px"
                      className="object-cover"
                    />
                    {/* Remove photo button */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={() => onRemovePhoto(character.id)}
                      aria-label="Remove photo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/50 rounded-2xl hover:bg-muted/80 hover:border-primary/50 transition-colors shadow-sm"
                    onClick={() => fileInputRefs.current[character.id]?.click()}
                  >
                    <Camera className="h-8 w-8 text-primary" />
                    <span className="text-sm">Upload Photo</span>
                  </Button>
                )}
              </div>

              <div className="flex-grow space-y-6 w-full sm:w-auto">
                <div>
                  <Label
                    htmlFor={`char-name-${character.id}`}
                    className="text-base font-medium mb-2 block"
                  >
                    Character Name
                  </Label>
                  <Input
                    id={`char-name-${character.id}`}
                    placeholder="Enter name"
                    value={character.name}
                    onChange={(e) =>
                      onCharacterChange(character.id, "name", e.target.value)
                    }
                    className="border-primary/20 focus:border-primary/60 text-lg h-12"
                  />
                </div>

                <div className="mt-6">
                  <Label className="text-base font-medium mb-3 block">
                    Gender
                  </Label>
                  <RadioGroup
                    value={character.gender}
                    onValueChange={(value) =>
                      onCharacterChange(character.id, "gender", value)
                    }
                    className="flex flex-wrap gap-6 mt-2"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem
                        value="female"
                        id={`gender-female-${character.id}`}
                        className="h-5 w-5"
                      />
                      <Label
                        htmlFor={`gender-female-${character.id}`}
                        className="cursor-pointer text-base"
                      >
                        Female
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem
                        value="male"
                        id={`gender-male-${character.id}`}
                        className="h-5 w-5"
                      />
                      <Label
                        htmlFor={`gender-male-${character.id}`}
                        className="cursor-pointer text-base"
                      >
                        Male
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem
                        value="unspecified"
                        id={`gender-unspecified-${character.id}`}
                        className="h-5 w-5"
                      />
                      <Label
                        htmlFor={`gender-unspecified-${character.id}`}
                        className="cursor-pointer text-base"
                      >
                        Unspecified
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  {/* Main character indicator */}
                  {character.isMain && (
                    <span className="text-sm font-semibold bg-primary/10 text-primary px-4 py-2 rounded-full">
                      Main Character
                    </span>
                  )}
                  {/* Photo status indicator */}
                  {character.uploadedPhotoUrl && (
                    <span className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-full flex items-center gap-2">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 6L9 17L4 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
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
                className="shrink-0 hover:bg-red-50 hover:text-red-600 transition-colors rounded-full h-10 w-10 self-start mt-0 sm:mt-2"
                onClick={() => onRemoveCharacter(character.id)}
                aria-label="Remove Character"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            className="bg-[#9B87F5] hover:bg-[#7E69AB] text-white rounded-full px-6 py-3 flex items-center gap-2 transition-colors mx-auto"
            onClick={onAddCharacter}
          >
            <Plus className="h-5 w-5" />
            Add Character
          </Button>
        </div>
      )}
    </div>
  );
}
