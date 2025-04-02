import React, { useState, useRef } from "react";
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
}

enum CharacterState {
  Initial = "INITIAL",
  CharacterCreation = "CHARACTER_CREATION",
  CharactersManagement = "CHARACTERS_MANAGEMENT",
}

export function CharactersSection({
  characters,
  onAddCharacter,
  onRemoveCharacter,
  onCharacterChange,
  onRemovePhoto,
}: CharactersSectionProps) {
  const [state, setState] = useState(CharacterState.Initial);
  const [character, setCharacter] = useState<Character | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleGoToCharacterCreation = () => {
    const newCharacter: Character = {
      id: crypto.randomUUID(),
      name: "",
      isMain: false,
      gender: "unspecified" as "female" | "male" | "unspecified",
      photoFile: null,
      photoPreviewUrl: null,
      uploadedPhotoUrl: null,
    };

    setCharacter(newCharacter);
    setState(CharacterState.CharacterCreation);
    onAddCharacter(); // Adiciona o personagem à lista global
  };

  const handleCharacterChange = (
    id: string,
    field: keyof Character,
    value: any
  ) => {
    setCharacter((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      onCharacterChange(id, field, value); // Atualiza o estado global
      return updated;
    });
  };

  return (
    <div className="min-h-[300px] w-full flex flex-col items-center justify-start">
      {state === CharacterState.Initial && (
        <InitialCharacterContainer
          onAddCharacter={handleGoToCharacterCreation}
        />
      )}
      {state === CharacterState.CharacterCreation && character && (
        <CharacterCreationContainer
          onAddCharacter={onAddCharacter}
          character={character}
          onCharacterChange={handleCharacterChange}
        />
      )}
    </div>
  );
}

const InitialCharacterContainer = ({
  onAddCharacter,
}: {
  onAddCharacter: () => void;
}) => {
  return (
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
  );
};

const CharacterCreationContainer = ({
  onAddCharacter,
  character,
  onCharacterChange,
}: {
  onAddCharacter: () => void;
  character: Character;
  onCharacterChange: (id: string, field: keyof Character, value: any) => void;
}) => {
  const handleUploadAvatar = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onCharacterChange(character.id, "photoFile", file);
        const reader = new FileReader();
        reader.onload = () => {
          onCharacterChange(
            character.id,
            "photoPreviewUrl",
            reader.result as string
          );
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };
  return (
    <div className="w-full h-full rounded-2xl bg-white shadow-md p-8">
      <div className="flex flex-col gap-6 w-full">
        <h3 className="text-xl font-semibold text-foreground">
          Add a New Character
        </h3>
        <div className="w-full">
          <Label
            htmlFor={`char-name-${character.id}`}
            className="text-base font-medium"
          >
            Character Name
          </Label>
          <Input
            id={`char-name-${character.id}`}
            placeholder="Enter character name"
            value={character.name}
            onChange={(e) =>
              onCharacterChange(character.id, "name", e.target.value)
            }
            className="w-full text-base"
          />
        </div>

        <div>
          <Label className="text-base font-medium">Gender</Label>
          <RadioGroup
            value={character.gender}
            onValueChange={(value) =>
              onCharacterChange(character.id, "gender", value)
            }
            className="flex gap-6 mt-2"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem
                value="female"
                id={`gender-female-${character.id}`}
              />
              <Label
                htmlFor={`gender-female-${character.id}`}
                className="cursor-pointer text-base"
              >
                Female
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="male" id={`gender-male-${character.id}`} />
              <Label
                htmlFor={`gender-male-${character.id}`}
                className="cursor-pointer text-base"
              >
                Male
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="w-full">
          <Label
            htmlFor={`char-avatar-${character.id}`}
            className="text-base font-medium"
          >
            Character Avatar
          </Label>
          <p className="text-sm text-muted-foreground mb-4">
            For best results, please upload a clear face photo.
          </p>

          <div className="flex gap-4 items-center">
            {/* Upload Button */}
            <button
              type="button"
              onClick={() => handleUploadAvatar()}
              className="w-16 h-16 rounded-full border-2 border-primary/20 hover:border-primary/40 flex items-center justify-center bg-white"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary/60"
              >
                <path
                  d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 8L12 3L7 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 3V15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Avatar Preview */}
            {character.photoPreviewUrl && (
              <div className="w-16 h-16 rounded-full border-2 border-primary overflow-hidden">
                <img
                  src={character.photoPreviewUrl}
                  alt="Character avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {character.photoPreviewUrl && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <h3 className="text-sm font-medium">Selected Avatar:</h3>
              <div className="w-16 h-16 rounded-full border-2 border-primary overflow-hidden">
                <img
                  src={character.photoPreviewUrl}
                  alt="Selected avatar preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>

        <Button
          className="w-fit"
          type="button"
          variant="outline"
          onClick={() => onAddCharacter()}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
