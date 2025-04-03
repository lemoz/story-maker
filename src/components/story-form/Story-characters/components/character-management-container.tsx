import { Button } from "@/components/ui/button";
import { Character } from "../characters-section";
import { Plus } from "lucide-react";

export const CharactersManagementContainer = ({
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
          type="button"
          onClick={onAddCharacter}
          className="bg-[#9B87F5] hover:bg-[#7E69AB] text-white rounded-lg px-4 py-2 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Character
        </Button>
      </div>
      <div className="flex flex-wrap justify-center sm:justify-start gap-4">
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
            type="button"
            variant="outline"
            className="text-[#9B87F5] border-[#9B87F5] hover:bg-[#EEE9FE]"
            onClick={() => onEditCharacter(character.id)}
          >
            Edit
          </Button>
          <Button
            type="button"
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
