import { Type } from "@google/genai";
import { getClient } from "./client";
import { formatHistory, formatCharacters } from "./utils";
import { ComicScript, ComicPanelData, CharacterProfile } from "../types";

export const generateComicScript = async (
  topic: string, 
  lang: 'en' | 'vi' = 'en',
  history: ComicPanelData[] = [],
  userAction?: string,
  existingCharacters: CharacterProfile[] = [],
  currentStyle?: string
): Promise<ComicScript> => {
  const ai = getClient();
  const modelId = "gemini-2.5-flash"; 
  
  const isContinuation = history.length > 0;
  const startNumber = history.length + 1;

  const langInstruction = lang === 'vi' 
    ? "The 'narrative_caption', 'dialogue', and 'suggestedOptions' MUST be in Vietnamese. The story tone should be natural and engaging for Vietnamese readers." 
    : "The 'narrative_caption', 'dialogue', and 'suggestedOptions' MUST be in English.";

  let contextPrompt = "";
  let characterPrompt = "";
  let styleInstruction = "";

  if (isContinuation) {
    if (userAction && userAction.trim() !== "") {
      contextPrompt = `CONTINUE the story. The user explicitly requests this event to happen next: "${userAction}". You MUST incorporate this action/event into these next 2 panels naturally but immediately.`;
    } else {
      contextPrompt = `CONTINUE the story based on the history provided below. Do NOT restart the story. Do NOT rush to a conclusion yet. Introduce new challenges or plot twists to keep it engaging.`;
    }
    
    if (existingCharacters.length > 0) {
      characterPrompt = `EXISTING CHARACTERS (YOU MUST MAINTAIN THESE EXACT DESCRIPTIONS):
${formatCharacters(existingCharacters)}
IMPORTANT: You may add new characters to the list if they are introduced, but DO NOT change the appearance of existing characters.`;
    }

    if (currentStyle) {
      // Stronger enforcement of style consistency
      styleInstruction = `CURRENT ART STYLE: "${currentStyle}". 
      CRITICAL REQUIREMENT: You MUST use this exact string for the 'visual_style' field. 
      Do not change it unless the user's action explicitly demands a style change (e.g. "become pixel art").`;
    }
  } else {
    contextPrompt = `Start a new, engaging story about: "${topic}". Build a strong foundation for a long-running story. Define the main characters visually.`;
    styleInstruction = `EXTRACT THE ART STYLE from the topic (e.g. 'The Simpsons', 'Anime', 'Noir', 'Pixel Art'). 
    - If a style is mentioned, describe it in detail in the 'visual_style' field.
    - If NO style is mentioned, default 'visual_style' to: "Classic Western Comic Book Art, vibrant flat colors, clear outlines, detailed shading".`;
  }

  const prompt = `You are a professional comic book writer.
  
  Task: Write the next 2 panels for a comic strip.
  Topic/Theme: "${topic}"
  ${contextPrompt}

  ${styleInstruction}

  ${characterPrompt}

  STORY HISTORY (Context):
  ${formatHistory(history.slice(-6))} 
  (Note: Only the last 6 panels are shown for context, but keep the overall arc consistent).

  ${langInstruction}
  
  IMPORTANT REQUIREMENTS:
  1. This is a continuous story. Each batch of 2 panels is a "chapter".
  2. The plot must be deep, logical, and captivating. Avoid generic or abrupt endings.
  3. Visual descriptions must be in English.
  4. Panel numbers must start from ${startNumber}.
  5. **CRITICAL - TEXT LENGTH**: 
     - Dialogue MUST be extremely short and punchy (max 24 words).
     - Narrative captions must be very brief (max 20 words).
  6. **FORMATTING**: 
     - Do NOT include the character's name in the 'dialogue' field.
  7. **VISUAL CONSISTENCY RULES (STRICT)**:
     - The 'visual_style' must be consistent.
     - In 'visual_description', ALWAYS start with the phrase: "In the style of [visual_style], ...".
     - ALWAYS use the character's EXACT name. NEVER use pronouns like "he", "she", "they" when referring to a known character.
     - 'characters' array: The 'appearance' field MUST be extremely specific and used as a visual prompt.
       - **MUST INCLUDE**: Gender, Age, Race/Skin Tone (e.g. "pale skin", "dark brown skin"), Hair Style & Color, Facial Hair, DISTINCTIVE CLOTHING (Top, Bottom, Shoes, Headwear) and THEIR COLORS.
       - Example: "Name: Captain Zane | Appearance: Tall rugged male, olive skin, scar on left cheek, messy black hair, wearing a white sleeveless undershirt, brown leather vest, dark green cargo pants, and heavy black combat boots."
  8. **SUGGESTIONS (CRITICAL)**:
     - Provide 3 VERY DISTINCT, UNPREDICTABLE, and CREATIVE options for what happens next.
     - **AVOID** generic linear steps (e.g., "They walk through the door").
     - **INSTEAD**, focus on:
       * **Plot Twists**: Someone betrays them, a secret identity is revealed, or a main character disappears.
       * **Surreal/Weird Events**: Gravity fails, a talking animal appears, reality glitches, or they enter a different dimension.
       * **Genre Shifts**: Suddenly it becomes horror, or a musical, or sci-fi.
     - **LENGTH REQUIREMENT**: MAXIMUM 4-5 WORDS per suggestion. Keep it extremely concise, like a title or a sudden action (e.g. "Dragon attacks", "He is a ghost", "Planet explodes").

  Return a JSON object with:
  - 'title' (string)
  - 'visual_style' (string)
  - 'characters': Array of objects { name, appearance }
  - 'panels': Array of 2 objects.
  - 'suggestedOptions': Array of 3 strings (The future plot suggestions).
  
  Panel Structure:
  - 'panel_number' (integer, starting at ${startNumber})
  - 'visual_description' (string, English)
  - 'narrative_caption' (string, ${lang})
  - 'dialogue' (string, ${lang})
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          visual_style: { type: Type.STRING },
          characters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                appearance: { type: Type.STRING }
              },
              required: ["name", "appearance"]
            }
          },
          panels: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                panel_number: { type: Type.INTEGER },
                visual_description: { type: Type.STRING },
                narrative_caption: { type: Type.STRING },
                dialogue: { type: Type.STRING },
              },
              required: ["panel_number", "visual_description", "narrative_caption", "dialogue"]
            }
          },
          suggestedOptions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 highly creative and unexpected suggestions for what happens next."
          }
        },
        required: ["title", "visual_style", "panels", "characters", "suggestedOptions"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to generate script text");
  }

  return JSON.parse(response.text) as ComicScript;
};

export const generatePlotSuggestions = async (
  topic: string,
  lang: 'en' | 'vi',
  history: ComicPanelData[]
): Promise<string[]> => {
  const ai = getClient();
  const modelId = "gemini-2.5-flash";

  const langInstruction = lang === 'vi' 
    ? "The 'suggestedOptions' MUST be in Vietnamese." 
    : "The 'suggestedOptions' MUST be in English.";

  const prompt = `You are a creative director for a comic series.
  
  Task: Generate 3 NEW, EXTRAORDINARY plot directions for the story below.
  Current Story Topic: "${topic}"
  
  Story History (Last 6 panels):
  ${formatHistory(history.slice(-6))}

  ${langInstruction}

  REQUIREMENTS:
  1. **High Creativity**: Do NOT offer boring or predictable next steps.
  2. **Plot Twists**: Focus on shocking revelations, sudden genre shifts, or character betrayals.
  3. **Brevity**: MAXIMUM 4-5 WORDS per option. Must be extremely concise.
  4. **Diversity**: The options must be completely different from each other.

  Return a JSON object with:
  - 'suggestedOptions': Array of 3 strings.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedOptions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["suggestedOptions"]
      }
    }
  });

  if (!response.text) return [];
  const result = JSON.parse(response.text);
  return result.suggestedOptions || [];
};