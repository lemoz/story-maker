import { Character } from "../characters-section";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export const CharacterCreationContainer = ({
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
