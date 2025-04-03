import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CharacterState, StoryState } from "@/types/states";

interface FixedButtonProps {
  onClick: () => void;
  state: CharacterState | StoryState;
  isValid?: boolean;
}

export const FixedButton = ({
  onClick,
  state,
  isValid = true,
}: FixedButtonProps) => {
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
      case StoryState.StoryDescription:
        return {
          text: "Start Generating My Story ✨",
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
