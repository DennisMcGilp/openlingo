"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

interface Lesson {
  id: string;
  title: string;
  description: string;
  type: "vocabulary" | "grammar" | "speaking" | "listening" | "reading" | "writing";
  duration: number;
  completed: boolean;
}

interface ModuleData {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lessons: Lesson[];
  quizCompleted: boolean;
  quizPassed: boolean;
  totalPoints: number;
}

const getModuleData = (moduleId: string): ModuleData | null => {
  if (moduleId === "ket_module_1") {
    return {
      id: "ket_module_1",
      title: "Greetings & Introductions",
      description: "Learn to say hello, introduce yourself, and ask basic questions",
      icon: "👋",
      color: "bg-blue-500",
      lessons: [
        {
          id: "lesson_1",
          title: "Saying Hello",
          description: "Learn different ways to say hello in English",
          type: "speaking",
          duration: 5,
          completed: false,
        },
        {
          id: "lesson_2",
          title: "Introducing Yourself",
          description: "Practice saying your name, age, and where you're from",
          type: "speaking",
          duration: 10,
          completed: false,
        },
        {
          id: "lesson_3",
          title: "Asking Questions",
          description: "Learn to ask 'What's your name?', 'How old are you?'",
          type: "grammar",
          duration: 8,
          completed: false,
        },
      ],
      quizCompleted: false,
      quizPassed: false,
      totalPoints: 100,
    };
  }
  return null;
};

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [saving, setSaving] = useState(false);

  const moduleId = params.id as string;

  useEffect(() => {
    if (session?.user) {
      loadModuleAndProgress();
    }
  }, [session, moduleId]);

  async function loadModuleAndProgress() {
    const data = getModuleData(moduleId);
    if (!data) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/progress?moduleId=${moduleId}`);
      const progress = await res.json();
      console.log("Loaded progress:", progress);

      const completedIds = progress.completedLessons || [];
     
      data.lessons = data.lessons.map(lesson => ({
        ...lesson,
        completed: completedIds.includes(lesson.id)
      }));

      data.quizCompleted = progress.quizPassed || false;
      data.quizPassed = progress.quizPassed || false;

      setModuleData(data);
    } catch (error) {
      console.error("Failed to load progress:", error);
      setModuleData(data);
    }
    setLoading(false);
  }

  async function completeLesson(lessonId: string) {
    if (!moduleData || saving) return;
    setSaving(true);

    // Get current completed lessons
    const currentCompleted = moduleData.lessons
      .filter(l => l.completed)
      .map(l => l.id);
   
    const updatedCompleted = currentCompleted.includes(lessonId)
      ? currentCompleted
      : [...currentCompleted, lessonId];

    // Optimistic update
    const updatedLessons = moduleData.lessons.map(lesson =>
      lesson.id === lessonId ? { ...lesson, completed: true } : lesson
    );
    setModuleData({ ...moduleData, lessons: updatedLessons });

    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          completedLessons: updatedCompleted,
        }),
      });

      const result = await response.json();
     
      if (result.success) {
        await loadModuleAndProgress();
      }
    } catch (error) {
      console.error("Error in completeLesson:", error);
      await loadModuleAndProgress();
    } finally {
      setSaving(false);
    }
  }

  async function completeQuiz(score: number) {
    if (!moduleData || saving) return;
    setSaving(true);

    const passed = score >= 80;

    setModuleData({
      ...moduleData,
      quizCompleted: passed,
      quizPassed: passed,
    });

    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          quizPassed: passed,
          score,
          points: passed ? moduleData.totalPoints : 0,
        }),
      });
      await loadModuleAndProgress();
    } catch (error) {
      console.error("Failed to save quiz progress:", error);
      await loadModuleAndProgress();
    } finally {
      setSaving(false);
    }
  }

  const allLessonsCompleted = moduleData?.lessons.every(l => l.completed) ?? false;
  const canTakeQuiz = allLessonsCompleted && !moduleData?.quizCompleted;

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Please log in to view this module</p>
          <Link href="/" className="mt-4 inline-block text-blue-500 underline">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2">Loading module...</p>
        </div>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Module not found</p>
          <Link href="/modules" className="mt-4 inline-block text-blue-500 underline">
            Back to Modules
          </Link>
        </div>
      </div>
    );
  }

  const completedCount = moduleData.lessons.filter(l => l.completed).length;
  const progressPercent = (completedCount / moduleData.lessons.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-4">
        <Link href="/modules" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700">
          ← Back to Modules
        </Link>
      </div>

      <div className={`mb-6 rounded-lg ${moduleData.color} p-6 text-white shadow-lg`}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{moduleData.icon}</span>
          <div>
            <h1 className="text-2xl font-bold">{moduleData.title}</h1>
            <p className="mt-1 text-white/80">{moduleData.description}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="text-sm font-semibold">{completedCount}/{moduleData.lessons.length} lessons</span>
        </div>
      </div>

      <div className="mb-8 space-y-3">
        <h2 className="text-xl font-bold text-gray-800">Lessons</h2>
        {moduleData.lessons.map((lesson, index) => (
          <div
            key={lesson.id}
            className={`flex items-center justify-between rounded-lg bg-white p-4 shadow-sm transition-all ${
              lesson.completed ? "border-l-4 border-green-500" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                {index + 1}
              </div>
              <div>
                <h3 className={`font-semibold ${lesson.completed ? "text-gray-400 line-through" : "text-gray-800"}`}>
                  {lesson.title}
                </h3>
                <p className="text-sm text-gray-500">{lesson.description}</p>
                <div className="mt-1 flex gap-3 text-xs text-gray-400">
                  <span>🎯 {lesson.type}</span>
                  <span>⏱️ {lesson.duration} min</span>
                </div>
              </div>
            </div>
            {!lesson.completed ? (
              <button
                onClick={() => setSelectedLesson(lesson)}
                disabled={saving}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                Start Lesson
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-500">
                <span>✓ Completed</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">🏆 Module Quiz</h2>
            <p className="mt-1 text-white/80">
              {!allLessonsCompleted
                ? `Complete all ${moduleData.lessons.length} lessons to unlock the quiz`
                : moduleData.quizCompleted
                ? "🎉 You passed the quiz! Module complete!"
                : "Test your knowledge and earn 100 points!"}
            </p>
          </div>
          <button
            onClick={() => setShowQuiz(true)}
            disabled={!canTakeQuiz || saving}
            className={`rounded-lg px-6 py-3 font-bold transition-colors ${
              canTakeQuiz
                ? "bg-white text-purple-600 hover:bg-gray-100"
                : "cursor-not-allowed bg-gray-400 text-gray-200"
            }`}
          >
            {moduleData.quizCompleted ? "✓ Completed" : "Take Quiz"}
          </button>
        </div>
      </div>

      {selectedLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold">{selectedLesson.title}</h2>
            <p className="mt-2 text-gray-600">{selectedLesson.description}</p>
            <div className="mt-4 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>AI Activity:</strong> Practice {selectedLesson.type} skills with the AI tutor.
              </p>
              <button
                onClick={() => {
                  router.push(`/chat?prompt=Let's practice ${selectedLesson.title} for KET level A2.`);
                  setSelectedLesson(null);
                }}
                className="mt-3 w-full rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                Open AI Tutor
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedLesson(null)}
                className="rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  completeLesson(selectedLesson.id);
                  setSelectedLesson(null);
                }}
                disabled={saving}
                className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
              >
                Mark as Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-lg w-full rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold">Module Quiz</h2>
            <p className="mt-2 text-gray-600">Quiz coming soon! Score 80% or higher to unlock the next module.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowQuiz(false)}
                className="rounded-lg bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
              >
                Close
              </button>
              <button
                onClick={() => {
                  completeQuiz(100);
                  setShowQuiz(false);
                }}
                className="rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
              >
                Simulate Pass (Testing)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}