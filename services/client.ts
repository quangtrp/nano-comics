import { GoogleGenAI } from "@google/genai";

export const getClient = (): GoogleGenAI => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};
