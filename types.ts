export interface ComicPanelData {
  panel_number: number;
  visual_description: string;
  narrative_caption: string;
  dialogue: string;
  image_base64?: string;
}

export interface CharacterProfile {
  name: string;
  appearance: string; // e.g. "Short messy blue hair, wears a red scarf and brown leather jacket"
}

export interface ComicScript {
  title: string;
  visual_style: string; // Describes the global art style (e.g. "The Simpsons style, yellow skin")
  panels: ComicPanelData[];
  characters?: CharacterProfile[];
  suggestedOptions?: string[]; // New field for next plot suggestions
}

// Window augmentation for AI Studio key selection
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}