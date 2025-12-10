import { getClient } from "./client";
import { formatHistory } from "./utils";
import { ComicPanelData } from "../types";

export const generateFullStory = async (
  topic: string,
  lang: 'en' | 'vi',
  existingPanels: ComicPanelData[],
  userAction?: string
): Promise<string> => {
  const ai = getClient();
  const modelId = "gemini-2.5-flash";

  const langInstruction = lang === 'vi' 
    ? "Write the story in Vietnamese. Tone: Emotional, engaging, novel-style." 
    : "Write the story in English. Tone: Emotional, engaging, novel-style.";

  // Strictly base the story on the existing panels
  const historyText = formatHistory(existingPanels);

  let userInterventionPrompt = "";
  if (userAction && userAction.trim() !== "") {
    userInterventionPrompt = `
    MAJOR PLOT TWIST: The user has explicitly intervened with this instruction: "${userAction}".
    You MUST change the ending and the future direction of the story to match this new instruction.
    `;
  } else {
    userInterventionPrompt = `
    Keep the story flow natural. You do not need to radically change the ending unless the recent panels suggest a new direction.
    `;
  }

  const prompt = `You are a professional novelist adapting a comic book into a full text story.
  
  CORE TASK: Write a COMPLETE story (Beginning, Middle, and End) based on the comic panels provided below.
  
  RULES:
  1. **The Past (Canon):** The story MUST start by narrating the events exactly as they happened in the "Comic Panels History". Do not contradict the panels. Use the dialogue from the panels if it fits.
  2. **The Future (Prediction):** After narrating the existing panels, you must WRITE THE REST OF THE STORY until the end. Reveal the plot, the climax, and the conclusion.
  3. **Format & Pacing (CRITICAL):** 
     - **Break paragraphs frequently.** Do NOT write long walls of text.
     - **Dialogue:** Put spoken dialogue on its own line to make it impactful. 
     - **Emphasis:** Use **bold** for loud sounds or intense emphasis. Use *italics* for internal thoughts, soft whispers, or flashbacks.
     - **Emotion:** Describe the tone of voice and micro-expressions (e.g., "he gritted his teeth," "she whispered trembling").
  
  Comic Panels History (These have already happened):
  ${historyText}
  
  Original Topic: "${topic}"

  ${userInterventionPrompt}
  
  ${langInstruction}
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
  });

  return response.text || (lang === 'vi' ? "Không thể tạo cốt truyện." : "Could not generate story.");
};