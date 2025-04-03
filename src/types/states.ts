export enum CharacterState {
  Initial = "INITIAL",
  CharacterCreation = "CHARACTER_CREATION",
  CharactersManagement = "CHARACTERS_MANAGEMENT",
}

export enum StoryState {
  Initial = "INITIAL",
  PlotSelection = "PLOT_SELECTION",
  PhotoUpload = "PHOTO_UPLOAD",
  StoryDescription = "STORY_DESCRIPTION",
  CharacterCreation = "CHARACTER_CREATION",
  Review = "REVIEW",
  Generating = "GENERATING",
  Complete = "COMPLETE",
}

export enum ButtonState {
  Next = "NEXT",
  Back = "BACK",
  AddCharacter = "ADD_CHARACTER",
  SaveCharacter = "SAVE_CHARACTER",
  GenerateStory = "GENERATE_STORY",
  StartOver = "START_OVER",
}

// Tipo que combina todos os estados possíveis
export type AppState = StoryState | CharacterState | ButtonState;

// Helper para verificar o tipo do estado
export const isCharacterState = (state: AppState): state is CharacterState => {
  return Object.values(CharacterState).includes(state as CharacterState);
};

export const isStoryState = (state: AppState): state is StoryState => {
  return Object.values(StoryState).includes(state as StoryState);
};

export const isButtonState = (state: AppState): state is ButtonState => {
  return Object.values(ButtonState).includes(state as ButtonState);
};
