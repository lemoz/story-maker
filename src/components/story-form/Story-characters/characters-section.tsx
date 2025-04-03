import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CharacterCreationContainer } from "./components/character-creation-container";
import { CharactersManagementContainer } from "./components/character-management-container";
import { FixedButton } from "../fixedButton";
import { CharacterState } from "@/types/states";
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

  useEffect(() => {
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
          onRemoveImage={onRemovePhoto}
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
