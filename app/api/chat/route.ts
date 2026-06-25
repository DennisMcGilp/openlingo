import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { getModel, getModelsForUser } from "@/lib/ai";
import { requireSession } from "@/lib/auth-server";
import { langCodeToName, interpolateTemplate, SRS_REFERENCE } from "@/lib/prompts";
import { getUserPromptTemplate } from "@/lib/actions/prompts";
import { getTargetLanguage } from "@/lib/actions/preferences";
import { getNativeLanguage } from "@/lib/actions/profile";
import { EXERCISE_SYNTAX } from "@/lib/content/exercise-syntax";
import { db } from "@/lib/db";
import { userMemory } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { DEFAULT_AI_MODEL } from "@/lib/constants";

const DEFAULT_CHAT_MODEL = DEFAULT_AI_MODEL;

export async function POST(req: Request) {
  const session = await requireSession();
  const { messages, language: lang, model: requestedModel } = await req.json();

  const language: string = lang || (await getTargetLanguage(session.user.id)) || "en";
  const userModels = await getModelsForUser(session.user.id);
  const modelId = userModels.some((m) => m.id === requestedModel)
    ? requestedModel
    : DEFAULT_CHAT_MODEL;
  const target_language = langCodeToName[language] || language;

  const [chatTemplate, memoryRow, nativeLang] = await Promise.all([
    getUserPromptTemplate(session.user.id, "chat-system"),
    db
      .select()
      .from(userMemory)
      .where(
        and(
          eq(userMemory.userId, session.user.id),
          eq(userMemory.key, "memory"),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]),
    getNativeLanguage(session.user.id),
  ]);

  // TEMPORARY: Override with KET-specific prompt (remove once database is updated)
  const ketPrompt = `You are a KET (Key English Test) tutor for A2-level young learners.

GUIDELINES:
- Use simple, clear vocabulary
- Keep sentences short (8-12 words maximum)
- Focus on basic grammar: present simple, past simple, future with 'going to'
- Speaking topics: introductions, family, daily routine, likes/dislikes, school
- Writing: short emails (25-35 words), filling in forms, simple descriptions
- Reading: short signs, emails, simple articles (100-150 words)
- Listening: slow, clear speech with simple vocabulary

IMPORTANT: Your student is at KET level (A2). Do not use complex academic language.
Be encouraging and patient. Use emojis occasionally to keep it fun.

Course: KET
Target language: {{target_language}}
Native language: {{native_language}}
Current date: {{current_date}}

Student memory: {{memory}}

Exercise syntax reference: {{exercise_syntax}}
SRS reference: {{srs_reference}}`;

  // Use KET prompt instead of database template
  const finalPrompt = ketPrompt;

  const memory = memoryRow?.value ?? "";

  const native_language = nativeLang ? (langCodeToName[nativeLang] || nativeLang) : "English";

  const now = new Date();
  const current_date = `${String(now.getDate()).padStart(2, "0")}-${now.toLocaleString("en-US", { month: "short" })}-${now.getFullYear()}`;
  // TEMPORARY: Hardcode course for KET (remove once course selector is built)
  const course = "KET";

  const systemPrompt = interpolateTemplate(finalPrompt, {
    current_date,
    target_language,
    target_language_code: language,
    native_language,
    memory,
    exercise_syntax: EXERCISE_SYNTAX,
    srs_reference: SRS_REFERENCE,
    course,
  });

  const cleanSystemPrompt = `IMPORTANT: You are a KET tutor. NEVER answer your own questions. Always wait for the student to respond before continuing.

IMPORTANT RULES FOR YOUR RESPONSES:
1. Never use markdown, asterisks (*), brackets ([ ]), or parentheses for formatting.
2. Never say things like "[multiple-choice]" or "*correct*".
3. Never use emojis (😊, 🌞, 🎉, etc.) — use plain words only.
4. Keep your responses simple and clear.
5. Use plain text only.

EXAMPLE OF GOOD RESPONSE: "That is correct! Let's practice with an exercise."

EXAMPLE OF BAD RESPONSE: "*That is correct!* Let's practice with an exercise. [multiple-choice]"`;

  const result = streamText({
    model: getModel("groq", "llama-3.3-70b-versatile"),
    system: cleanSystemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(7),
  });

  return result.toUIMessageStreamResponse();
}