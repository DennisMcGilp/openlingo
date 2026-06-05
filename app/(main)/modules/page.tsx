"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";

interface Module {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lessons: number;
  locked: boolean;
  completed: boolean;
  progress: number; // 0-100
  pointsEarned?: number;
}

export default function ModulesPage() {
  const { data: session } = useSession();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (session?.user) {
      loadModules();
    }
  }, [session]);

  async function loadModules() {
    // TODO: Replace with actual database fetch
    // For now, hardcoded KET modules
   
    const hardcodedModules: Module[] = [
      {
        id: "ket_module_1",
        title: "Greetings & Introductions",
        description: "Learn to say hello, introduce yourself, and ask basic questions",
        icon: "👋",
        color: "bg-blue-500",
        lessons: 3,
        locked: false,
        completed: false,
        progress: 0,
      },
      {
        id: "ket_module_2",
        title: "Numbers & Age",
        description: "Count from 1-20, say your age, and ask about others",
        icon: "🔢",
        color: "bg-green-500",
        lessons: 3,
        locked: true,
        completed: false,
        progress: 0,
      },
      {
        id: "ket_module_3",
        title: "Family",
        description: "Talk about family members and relationships",
        icon: "👨‍👩‍👧‍👦",
        color: "bg-purple-500",
        lessons: 3,
        locked: true,
        completed: false,
        progress: 0,
      },
      {
        id: "ket_module_4",
        title: "Daily Routine",
        description: "Describe your day from morning to night",
        icon: "⏰",
        color: "bg-orange-500",
        lessons: 3,
        locked: true,
        completed: false,
        progress: 0,
      },
      {
        id: "ket_module_5",
        title: "Food & Drink",
        description: "Order food, talk about likes and dislikes",
        icon: "🍕",
        color: "bg-red-500",
        lessons: 3,
        locked: true,
        completed: false,
        progress: 0,
      },
    ];

    setModules(hardcodedModules);
   
    // Calculate total points (100 per completed module)
    const completedPoints = hardcodedModules.filter(m => m.completed).length * 100;
    setTotalPoints(completedPoints);
    setLoading(false);
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Please log in to view modules</p>
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
          <p className="mt-2">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header with points */}
      <div className="mb-8 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">KET Preparation Course</h1>
            <p className="mt-2 text-amber-100">Cambridge Key English Test - A2 Level</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">🏆 {totalPoints}</div>
            <div className="text-sm text-amber-100">Total Points</div>
          </div>
        </div>
      </div>

      {/* Modules grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({ module }: { module: Module }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 ${
        isHovered ? "shadow-xl -translate-y-1" : ""
      } ${module.locked ? "opacity-60" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Progress bar */}
      {module.progress > 0 && (
        <div className="absolute top-0 left-0 h-1 bg-green-500 transition-all duration-300" style={{ width: `${module.progress}%` }} />
      )}

      <div className="p-6">
        {/* Icon and title */}
        <div className="flex items-start justify-between">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${module.color} text-2xl`}>
            {module.icon}
          </div>
          {module.completed && (
            <div className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-600">
              ✓ Completed
            </div>
          )}
          {module.locked && !module.completed && (
            <div className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-500">
              🔒 Locked
            </div>
          )}
        </div>

        <h2 className="mt-4 text-xl font-bold text-gray-800">{module.title}</h2>
        <p className="mt-2 text-sm text-gray-500">{module.description}</p>

        {/* Lessons info */}
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <span>📚</span>
          <span>{module.lessons} lessons</span>
        </div>

        {/* Start button */}
        <Link href={module.locked ? "#" : `/modules/${module.id}`}>
          <button
            disabled={module.locked}
            className={`mt-6 w-full rounded-lg px-4 py-2 font-bold transition-all ${
              module.locked
                ? "cursor-not-allowed bg-gray-200 text-gray-400"
                : module.completed
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-amber-500 text-white hover:bg-amber-600"
            }`}
          >
            {module.completed ? "Review Module" : module.locked ? "Complete Previous Module" : "Start Module"}
          </button>
        </Link>

        {/* Points reward */}
        {!module.completed && !module.locked && (
          <div className="mt-3 text-center text-xs text-amber-500">
            🎁 Earn 100 points upon completion
          </div>
        )}
      </div>
    </div>
  );
}
