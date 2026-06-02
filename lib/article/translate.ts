// Article translation feature temporarily disabled while switching AI providers
// Will re-enable with Groq support later

export async function detectLanguage(text: string): Promise<string> {
  return "Unknown";
}

export async function translateChunk(
  text: string,
  targetLanguage: string,
  cefrLevel: string,
  options?: { returnCleanOriginal?: boolean },
): Promise<{ original: string; translated: string; bridge?: string }> {
  return { original: text, translated: text };
}