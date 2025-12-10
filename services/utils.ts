import { ComicPanelData, CharacterProfile } from "../types";

// Helper to format history for the AI
export const formatHistory = (history: ComicPanelData[]): string => {
  if (history.length === 0) return "";
  
  return history.map(p => 
    `Panel ${p.panel_number}: [Visual: ${p.visual_description}] [Narrative: ${p.narrative_caption}] [Dialogue: ${p.dialogue}]`
  ).join("\n");
};

// Helper to format character sheets for the AI
export const formatCharacters = (characters: CharacterProfile[]): string => {
  if (!characters || characters.length === 0) return "";
  return characters.map(c => `Name: ${c.name} | Appearance: ${c.appearance}`).join("\n");
};