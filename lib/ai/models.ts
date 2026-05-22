import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createProviderRegistry } from "ai";

// Provider setup
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

// Available models list
export const AVAILABLE_MODELS = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "google" },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
];

export const CHAT_AVAILABLE_MODELS = AVAILABLE_MODELS;

// Helper functions
export function getModel(provider: string, modelId: string) {
  // The registry expects just the model ID (the provider is inferred from the registry)
  return registry.languageModel(modelId);
}

export async function getModelsForUser(userId?: string) {
  return AVAILABLE_MODELS;
}

export function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  return adminEmails.includes(email);
}

// Default export for compatibility
const models = {
  available: AVAILABLE_MODELS,
  getModel,
  getModelsForUser,
  isAdminEmail,
};

export default models;