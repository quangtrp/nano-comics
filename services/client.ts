import { GoogleGenAI } from "@google/genai";

export const getClient = (): GoogleGenAI => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};