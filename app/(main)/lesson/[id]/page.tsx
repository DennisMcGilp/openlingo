import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { requireSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const session = await requireSession();
  const { id } = await params;

  // Redirect if no session
  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <LessonPlayer lessonId={id} />
    </div>
  );
}
