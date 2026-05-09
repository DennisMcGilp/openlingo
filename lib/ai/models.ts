import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createProviderRegistry } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const registry = createProviderRegistry({
  google,
  openai,
});

export const models = {
  default: {
    provider: "google",
    model: "gemini-2.0-flash",
  },
  available: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "google" },
    { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
  ],
};

export function getModel(provider: string, modelId: string) {
  return registry.languageModel(provider, modelId);
}