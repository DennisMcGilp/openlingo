import { requireSession } from "@/lib/auth-server";
import { ChatView } from "@/components/chat/chat-view";
import {
  getTargetLanguage,
  getPreferredModel,
} from "@/lib/actions/preferences";
import { getModelsForUser } from "@/lib/ai/models";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>;
}) {
  const session = await requireSession();
  const [language, preferredModel, params] = await Promise.all([
    getTargetLanguage(session.user.id),
    getPreferredModel(session.user.id),
    searchParams,
  ]);

  const availableModels = await getModelsForUser(session.user.id);

  return (
    <ChatView
      key={params.prompt ? `prompt-${params.prompt}` : "new"}
      language={language ?? undefined}
      preferredModel={preferredModel}
      availableModels={availableModels}
      initialPrompt={params.prompt}
    />
  );
}
