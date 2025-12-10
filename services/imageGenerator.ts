import { getClient } from "./client";
import { CharacterProfile } from "../types";

export const generatePanelImage = async (
  visualDescription: string, 
  characters: CharacterProfile[] = [],
  style: string = "Western Comic Book Art, vibrant flat colors, clear outlines"
): Promise<string> => {
  const ai = getClient();
  const modelId = "gemini-2.5-flash-image";

  // Improved logic: Identify characters mentioned in the description by full name or significant name parts.
  const lowerDesc = visualDescription.toLowerCase();
  
  const relevantCharacters = characters.filter(c => {
    // Check for exact full name match first
    if (lowerDesc.includes(c.name.toLowerCase())) return true;

    // Check for partial matches (e.g. "Luffy" in "Monkey D. Luffy")
    // Split name into parts, ignore short words like "The", "Dr", "Mr" if they were part of name (though unlikely in Profile)
    // We only match parts with length > 2 to avoid false positives on initials.
    const parts = c.name.toLowerCase().split(/[\s\-_]+/);
    return parts.some(part => part.length > 2 && new RegExp(`\\b${part}\\b`).test(lowerDesc));
  });

  let characterPromptBlock = "";
  if (relevantCharacters.length > 0) {
    characterPromptBlock = `
REFERENCE CHARACTER SHEETS (Apply these visual details EXACTLY to the characters in the scene):
${relevantCharacters.map(c => `CHARACTER: ${c.name}\nVISUAL APPEARANCE: ${c.appearance}`).join("\n\n")}

DRAWING INSTRUCTIONS FOR CHARACTERS:
- If a character listed above appears in the scene, you MUST draw them exactly as described in their Visual Appearance.
- Do NOT change their skin tone, hair color, or clothing colors.
- Maintain their specific accessories.
`;
  }

  // Enforce style by placing it prominently at the top AND bottom of the prompt
  // and explicit instructions to adhere to it.
  const enhancedPrompt = `
  SYSTEM: You are a professional comic artist who maintains strict visual consistency.
  
  ART STYLE: ${style}
  
  ${characterPromptBlock}

  SCENE ACTION & COMPOSITION:
  ${visualDescription}

  FINAL CHECK:
  - Render the scene EXACTLY in the style of: ${style}
  - Ensure all characters match their Reference Sheets above.
  `;

  // Retry logic configuration
  const MAX_RETRIES = 3;
  let lastError: any = new Error("Unknown error");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: enhancedPrompt,
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          }
        }
      });

      // Robustly check for image data using optional chaining
      const parts = response.candidates?.[0]?.content?.parts;
      
      if (parts) {
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
        }
      }
      
      throw new Error("No image data found in API response");

    } catch (err) {
      console.warn(`Image generation attempt ${attempt + 1} failed:`, err);
      lastError = err;
      
      if (attempt < MAX_RETRIES - 1) {
        // Simple linear backoff
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
      }
    }
  }

  throw lastError;
};