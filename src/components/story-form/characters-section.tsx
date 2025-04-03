import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Camera, Plus, X, Trash2 } from "lucide-react";

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
  handleRemoveCharacter: (id: string) => void;
  onGoNext: () => void;
}

enum CharacterState {
  Initial = "INITIAL",
  CharacterCreation = "CHARACTER_CREATION",
  CharactersManagement = "CHARACTERS_MANAGEMENT",
}

const FixedButton = ({
  onClick,
  state,
  isValid = true,
}: {
  onClick: () => void;
  state: CharacterState;
  isValid?: boolean;
}) => {
  const getButtonConfig = () => {
    switch (state) {
      case CharacterState.CharacterCreation:
        return {
          text: "Add Character",
          icon: <Plus className="h-5 w-5" />,
        };
      case CharacterState.CharactersManagement:
        return {
          text: "Next",
          icon: null,
        };
      default:
        return;
    }
  };

  const config = getButtonConfig();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
      <Button
        type="button"
        onClick={onClick}
        disabled={!isValid}
        className="w-full bg-[#9B87F5] hover:bg-[#7E69AB] text-white rounded-full py-6 flex items-center justify-center gap-2 transition-colors shadow-lg"
      >
        {config?.icon}
        {config?.text}
      </Button>
    </div>
  );
};

export function CharactersSection({
  characters,
  onAddCharacter,
  onRemoveCharacter,
  onCharacterChange,
  onRemovePhoto,
  handleRemoveCharacter,
  onGoNext,
}: CharactersSectionProps) {
  const [state, setState] = useState(CharacterState.Initial);
  const [character, setCharacter] = useState<Character | null>(null);

  React.useEffect(() => {
    if (state === CharacterState.CharacterCreation && characters.length > 0) {
      setCharacter(characters[characters.length - 1]);
    }
  }, [characters, state]);

  const handleGoToCharacterCreation = () => {
    setState(CharacterState.CharacterCreation);
    onAddCharacter();
  };

  const handleCharacterChange = (
    id: string,
    field: keyof Character,
    value: any
  ) => {
    onCharacterChange(id, field, value);
    setCharacter((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const handleFixedButtonClick = () => {
    switch (state) {
      case CharacterState.CharacterCreation:
        if (character?.name && character?.gender) {
          setState(CharacterState.CharactersManagement);
        }
        break;
      case CharacterState.CharactersManagement:
        onGoNext();
        break;
      default:
        break;
    }
  };

  const isCharacterValid = () => {
    if (state === CharacterState.CharacterCreation && character) {
      return !!character.name;
    }
    return true;
  };

  const handleCancel = () => {
    if (character?.id) {
      onRemoveCharacter(character.id);
    }
    setState(CharacterState.Initial);
  };

  const handleEditCharacter = (id: string) => {
    setState(CharacterState.CharacterCreation);
    const characterToEdit = characters.find((character) => character.id === id);
    if (characterToEdit) {
      setCharacter(characterToEdit);
    }
  };

  const handleRemoveImage = (id: string) => {
    onRemovePhoto(id);
  };

  return (
    <div className="min-h-[300px] w-full flex flex-col items-center justify-start pb-24">
      {state === CharacterState.Initial && (
        <InitialCharacterContainer
          onAddCharacter={handleGoToCharacterCreation}
        />
      )}
      {state === CharacterState.CharacterCreation && character && (
        <CharacterCreationContainer
          character={character}
          onCharacterChange={handleCharacterChange}
          onRemoveImage={handleRemoveImage}
          onCancel={handleCancel}
        />
      )}
      {state === CharacterState.CharactersManagement && (
        <CharactersManagementContainer
          characters={characters}
          onAddCharacter={handleGoToCharacterCreation}
          onEditCharacter={handleEditCharacter}
          onDeleteCharacter={handleRemoveCharacter}
        />
      )}
      {(state === CharacterState.CharactersManagement ||
        state === CharacterState.CharacterCreation) && (
        <FixedButton
          onClick={handleFixedButtonClick}
          state={state}
          isValid={isCharacterValid()}
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
  character,
  onCharacterChange,
  onRemoveImage,
  onCancel,
}: {
  character: Character;
  onCharacterChange: (id: string, field: keyof Character, value: any) => void;
  onRemoveImage: (id: string) => void;
  onCancel: () => void;
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
    <div className="w-full h-full rounded-2xl bg-white shadow-md p-4">
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
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-primary overflow-hidden">
                  <img
                    src={character.photoPreviewUrl}
                    alt="Selected avatar preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveImage(character.id)}
                  className="absolute -top-2 -right-3 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <Button
          className="w-fit"
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

const CharactersManagementContainer = ({
  characters,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
}: {
  characters: Character[];
  onAddCharacter: () => void;
  onEditCharacter: (id: string) => void;
  onDeleteCharacter: (id: string) => void;
}) => {
  const handleEditCharacter = (id: string) => {
    onEditCharacter(id);
  };

  const handleDeleteCharacter = (id: string) => {
    onDeleteCharacter(id);
  };
  return (
    <div className="w-full rounded-2xl bg-white">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">
          Your Characters
        </h3>
        <Button
          onClick={onAddCharacter}
          className="bg-[#9B87F5] hover:bg-[#7E69AB] text-white rounded-lg px-4 py-2 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Character
        </Button>
      </div>
      <div className="flex flex-wrap gap-4">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onEditCharacter={handleEditCharacter}
            onDeleteCharacter={handleDeleteCharacter}
          />
        ))}
      </div>
    </div>
  );
};

const getInitialLetter = (name: string): string => {
  return name ? name.charAt(0).toUpperCase() : "A";
};

const CharacterCard = ({
  character,
  onEditCharacter,
  onDeleteCharacter,
}: {
  character: Character;
  onEditCharacter: (id: string) => void;
  onDeleteCharacter: (id: string) => void;
}) => {
  return (
    <div className="w-full max-w-xs max-h-xs bg-white shadow-md rounded-2xl border border-gray-100 p-6">
      <div className="flex flex-col items-center gap-4">
        {character.photoPreviewUrl ? (
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#9B87F5]">
            <img
              src={character.photoPreviewUrl}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-[#EEE9FE] border-2 border-[#9B87F5] flex items-center justify-center">
            <span className="text-2xl font-semibold text-[#9B87F5]">
              {getInitialLetter(character.name)}
            </span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{character.name}</h3>
          <p className="text-gray-500 text-center">{character.gender}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-[#9B87F5] border-[#9B87F5] hover:bg-[#EEE9FE]"
            onClick={() => onEditCharacter(character.id)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-red-500 border-red-200 hover:bg-red-50"
            onClick={() => onDeleteCharacter(character.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
