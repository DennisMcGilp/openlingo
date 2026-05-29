import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createProviderRegistry } from "ai";

// Provider setup
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const registry = createProviderRegistry({
  groq,
  openai,
});

// Available models list (Groq's free models)
export const AVAILABLE_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "groq" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", provider: "groq" },
];

export const CHAT_AVAILABLE_MODELS = AVAILABLE_MODELS;

// Helper functions
export function getModel(provider: string, modelId: string) {
  const fullModelId = `${provider}:${modelId}`;
  return registry.languageModel(fullModelId as `groq:${string}` | `openai:${string}`);
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