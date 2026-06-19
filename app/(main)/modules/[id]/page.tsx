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
  quiz: {
    id: string;
    question: string;
    options: string[];
    correctAnswers: number[];
    explanation: string;
  }[];
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
          description: "Learn different greetings for different times of day and situations",
          type: "speaking",
          duration: 10,
          completed: false,
        },
        {
          id: "lesson_2",
          title: "Introducing Yourself",
          description: "Learn three ways to say your name: 'My name is...', 'I am...', and 'I'm...' with context",
          type: "speaking",
          duration: 10,
          completed: false,
        },
        {
          id: "lesson_3",
          title: "Asking Questions",
          description: "Learn to ask names, ages, and other personal questions naturally",
          type: "grammar",
          duration: 8,
          completed: false,
        },
      ],
      quiz: [
        {
          id: "q1",
          question: "Which greeting is used in the morning?",
          options: ["Good evening", "Good morning", "Good afternoon", "Good night"],
          correctAnswers: [1],
          explanation: "Good morning is used before 12:00 PM. Good evening is after 6 PM. Good afternoon is 12 PM - 6 PM.",
        },
        {
          id: "q2",
          question: "What is a formal way to greet someone?",
          options: ["Hey", "Hi", "Hello", "What's up?"],
          correctAnswers: [2],
          explanation: "Hello is neutral and can be used in any situation. Hey and Hi are informal. What's up? is very casual.",
        },
        {
          id: "q3",
          question: "How do you introduce yourself? (Select all that are correct)",
          options: ["My name is...", "I am...", "I'm...", "Me name..."],
          correctAnswers: [0, 1, 2],
          explanation: "All three are correct: 'My name is...' (formal), 'I am...' (neutral), and 'I'm...' (informal). 'Me name...' is grammatically incorrect.",
        },
        {
          id: "q4",
          question: "Which question do you ask to find out someone's age?",
          options: ["What is your name?", "How old are you?", "Where are you from?", "How are you?"],
          correctAnswers: [1],
          explanation: "How old are you? is used to ask about age. What is your name? asks for a name. Where are you from? asks about origin. How are you? asks about well-being.",
        },
        {
          id: "q5",
          question: "What is the difference between 'What is your name?' and 'What's your name?'",
          options: ["They mean the same thing", "One is formal, one is casual", "One is correct, one is not", "Both are formal"],
          correctAnswers: [0, 1],
          explanation: "Both are correct and mean the same thing. 'What is your name?' is more formal, while 'What's your name?' is casual and commonly used in conversation.",
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
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

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

  function startQuiz() {
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setQuizSubmitted(false);
    setQuizScore(0);
  }

  function selectAnswer(index: number) {
    if (quizSubmitted) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = index;
    setSelectedAnswers(newAnswers);
  }

  function nextQuestion() {
    if (currentQuestionIndex < (moduleData?.quiz?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      submitQuiz();
    }
  }

  function submitQuiz() {
    const quiz = moduleData?.quiz || [];
    let correct = 0;
    quiz.forEach((q, i) => {
      const userAnswer = selectedAnswers[i];
      if (userAnswer !== undefined && q.correctAnswers.includes(userAnswer)) {
        correct++;
      }
    });
    const score = Math.round((correct / quiz.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);
    completeQuiz(score);
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
  async function resetProgress() {
  if (!moduleData) return;
  if (!confirm("Are you sure you want to reset all progress for this module?")) return;
 
  setSaving(true);
 
  try {
    // Delete the progress record from the database
    await fetch("/api/progress", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleId,
      }),
    });
   
    // Reload the page to reset all states
    await loadModuleAndProgress();
    setQuizStarted(false);
    setQuizSubmitted(false);
    setQuizScore(0);
    setSelectedAnswers([]);
   
  } catch (error) {
    console.error("Failed to reset progress:", error);
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
    <div className="flex gap-2">
     <button
  onClick={() => {
    let prompt = "";
   
    if (selectedLesson.id === "lesson_1") {
      prompt = `Let's practice English greetings. I will teach you:
      - Hello (neutral)
      - Hi / Hey (informal)
      - Good morning (before 12 PM)
      - Good afternoon (12 PM - 6 PM)
      - Good evening (after 6 PM)
      - Good day (formal)

      STEP 1: I will ask you to greet me at different times of day.
      STEP 2: You practice responding with the correct greeting.
      STEP 3: When you have successfully greeted me 5 times, say "I'm ready to complete the lesson!"
     
      Let's start. It's 9 AM. How do you greet someone?`;
    } else if (selectedLesson.id === "lesson_2") {
      prompt = `Let's practice introducing yourself in English. I will teach you three ways:
      1. "My name is [name]." (formal)
      2. "I am [name]." (neutral)
      3. "I'm [name]." (informal)

      STEP 1: I will ask you to introduce yourself in different ways.
      STEP 2: You practice each style.
      STEP 3: When you have successfully introduced yourself 3 ways, say "I'm ready to complete the lesson!"
     
      Start by introducing yourself formally.`;
    } else if (selectedLesson.id === "lesson_3") {
      prompt = `Let's practice asking questions in English. I will teach you:
      - "What is your name?" / "What's your name?" (formal/casual)
      - "How old are you?"
      - "Where are you from?"
      - "How are you?"

      STEP 1: I will ask you questions.
      STEP 2: You respond correctly.
      STEP 3: When you have answered 5 questions correctly, say "I'm ready to complete the lesson!"
     
      Let's start. Ask me "What is your name?"`;
    }
   
    router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
    setSelectedLesson(null);
  }}
  className="mt-3 w-full rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
>
  Open AI Tutor
</button>
    </div>
  </div>
</div>

      {selectedLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold">{selectedLesson.title}</h2>
            <p className="mt-2 text-gray-600">{selectedLesson.description}</p>

            {/* Detailed lesson content */}
            <div className="mt-4 rounded-lg bg-yellow-50 p-4">
              <h4 className="text-sm font-semibold text-yellow-800">📖 Lesson Content:</h4>
              <div className="mt-2 text-sm text-yellow-700">
                {selectedLesson.id === "lesson_1" && (
                  <div>
                    <p className="font-medium">Greetings in English:</p>
                    <ul className="mt-2 space-y-2 list-disc pl-4">
                      <li><strong>Hello</strong> – Neutral, can be used anytime</li>
                      <li><strong>Hi</strong> – Informal, friendly</li>
                      <li><strong>Hey</strong> – Very informal, for friends</li>
                      <li><strong>Good morning</strong> – Before 12:00 PM</li>
                      <li><strong>Good afternoon</strong> – 12:00 PM – 6:00 PM</li>
                      <li><strong>Good evening</strong> – After 6:00 PM</li>
                      <li><strong>Good day</strong> – Formal, often used in professional settings</li>
                    </ul>
                    <div className="mt-3 rounded-lg bg-blue-50 p-3">
                      <p className="text-xs text-blue-700">
                        💡 <strong>Context tip:</strong> Use "Good morning/afternoon/evening" in formal situations or with people you don't know well. Use "Hi" or "Hey" with friends and family.
                      </p>
                    </div>
                  </div>
                {selectedLesson.type === "speaking" && (
  <div className="mt-3 rounded-lg bg-green-50 p-3">
    <p className="text-xs text-green-700">
      🎤 <strong>Speaking Practice:</strong> Say your answers out loud to practice speaking.
      You can type your responses to check if they're correct.
    </p>
  </div>
                )}

                {selectedLesson.id === "lesson_2" && (
                  <div>
                    <p className="font-medium">Introducing Yourself:</p>
                    <ul className="mt-2 space-y-2 list-disc pl-4">
                      <li><strong>"My name is [name]."</strong> – Formal, polite</li>
                      <li><strong>"I am [name]."</strong> – Neutral, common</li>
                      <li><strong>"I'm [name]."</strong> – Informal, casual</li>
                    </ul>
                    <div className="mt-3 rounded-lg bg-blue-50 p-3">
                      <p className="text-xs text-blue-700">
                        💡 <strong>Context tip:</strong> Use "My name is" in formal situations (interviews, meetings). Use "I am" for everyday conversations. Use "I'm" with friends and family.
                      </p>
                    </div>
                  </div>
                )}

                {selectedLesson.id === "lesson_3" && (
                  <div>
                    <p className="font-medium">Asking Questions:</p>
                    <ul className="mt-2 space-y-2 list-disc pl-4">
                      <li><strong>"What is your name?"</strong> – Formal way to ask a name</li>
                      <li><strong>"What's your name?"</strong> – Casual, common</li>
                      <li><strong>"How old are you?"</strong> – Asking age</li>
                      <li><strong>"Where are you from?"</strong> – Asking about origin</li>
                      <li><strong>"How are you?"</strong> – Asking about well-being</li>
                    </ul>
                    <div className="mt-3 rounded-lg bg-blue-50 p-3">
                      <p className="text-xs text-blue-700">
                        💡 <strong>Context tip:</strong> "What's" is a contraction of "What is" – it's more casual. Use "What is" in formal writing or speaking.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Tutor button with custom prompts */}
            <div className="mt-4 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>AI Activity:</strong> Practice {selectedLesson.type} skills with the AI tutor.
              </p>
              <button
                onClick={() => {
                  let prompt = "";

                  if (selectedLesson.id === "lesson_1") {
                    prompt = `Let's practice English greetings. I will teach you:
                    - Hello (neutral)
                    - Hi / Hey (informal)
                    - Good morning (before 12 PM)
                    - Good afternoon (12 PM - 6 PM)
                    - Good evening (after 6 PM)
                    - Good day (formal)

                    Please ask me to greet you at different times of day, and correct me if I use the wrong greeting. Start by saying: "It's 9 AM. How do you greet someone?"`;
                  } else if (selectedLesson.id === "lesson_2") {
                    prompt = `Let's practice introducing yourself in English. I will teach you three ways to say your name:
                    1. "My name is [name]." (formal)
                    2. "I am [name]." (neutral)
                    3. "I'm [name]." (informal)

                    Please ask me to introduce myself in different ways, and correct me if I make mistakes. Start by asking me: "What is your name?"`;
                  } else if (selectedLesson.id === "lesson_3") {
                    prompt = `Let's practice asking questions in English. I will teach you:
                    - "What is your name?" / "What's your name?" (formal/casual)
                    - "How old are you?"
                    - "Where are you from?"
                    - "How are you?"

                    Please ask me questions and correct my responses. Start by saying: "Let's practice asking questions. Ask me 'What is your name?'"`;
                  }

                  router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);
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

      {showQuiz && !quizStarted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-lg w-full rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold">📝 Module Quiz</h2>
            <p className="mt-2 text-gray-600">
              Test your knowledge of greetings and introductions!
            </p>
            <div className="mt-4 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                📋 {moduleData?.quiz?.length || 0} questions
              </p>
              <p className="text-sm text-blue-800">
                🎯 80% to pass ({Math.round((moduleData?.quiz?.length || 0) * 0.8)} correct)
              </p>
              <p className="text-sm text-blue-800">
                🏆 100 points for passing
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowQuiz(false);
                  setQuizStarted(false);
                }}
                className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={startQuiz}
                className="rounded-lg bg-purple-500 px-6 py-2 text-white hover:bg-purple-600"
              >
                Start Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuiz && quizStarted && !quizSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-lg w-full rounded-lg bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Question {currentQuestionIndex + 1} of {moduleData?.quiz?.length}</h2>
              <span className="text-sm text-gray-500">
                {Math.round((currentQuestionIndex / (moduleData?.quiz?.length || 1)) * 100)}%
              </span>
            </div>
            <div className="mt-4 h-2 w-full bg-gray-200 rounded-full">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${(currentQuestionIndex / (moduleData?.quiz?.length || 1)) * 100}%` }}
              />
            </div>
            <div className="mt-6">
              <p className="text-lg font-medium">{moduleData?.quiz[currentQuestionIndex]?.question}</p>
              {moduleData?.quiz[currentQuestionIndex]?.correctAnswers.length > 1 && (
                <p className="mt-1 text-sm text-blue-500">💡 Select all correct answers</p>
              )}
              <div className="mt-4 space-y-2">
  {moduleData?.quiz[currentQuestionIndex]?.options.map((option, idx) => {
    const isMultiple = moduleData?.quiz[currentQuestionIndex]?.correctAnswers.length > 1;
    const isSelected = selectedAnswers[currentQuestionIndex] === idx;
   
    return (
      <button
        key={idx}
        onClick={() => {
          if (isMultiple) {
            // For multiple choice: toggle selection
            const currentSelected = selectedAnswers[currentQuestionIndex] !== undefined
              ? selectedAnswers[currentQuestionIndex]
              : -1;
            if (currentSelected === idx) {
              // Deselect if already selected
              const newAnswers = [...selectedAnswers];
              newAnswers[currentQuestionIndex] = -1;
              setSelectedAnswers(newAnswers);
            } else {
              // Select this option
              const newAnswers = [...selectedAnswers];
              newAnswers[currentQuestionIndex] = idx;
              setSelectedAnswers(newAnswers);
            }
          } else {
            // For single choice: just select
            const newAnswers = [...selectedAnswers];
            newAnswers[currentQuestionIndex] = idx;
            setSelectedAnswers(newAnswers);
          }
        }}
        className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
          isSelected
            ? "border-purple-500 bg-purple-50"
            : "border-gray-200 hover:border-purple-300"
        }`}
      >
        <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {option}
        {isMultiple && isSelected && (
          <span className="ml-2 text-purple-500">✓</span>
        )}
      </button>
    );
  })}
</div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={nextQuestion}
                disabled={selectedAnswers[currentQuestionIndex] === undefined}
                className={`rounded-lg px-6 py-2 text-white ${
                  selectedAnswers[currentQuestionIndex] !== undefined
                    ? "bg-purple-500 hover:bg-purple-600"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                {currentQuestionIndex < (moduleData?.quiz?.length || 0) - 1 ? "Next Question" : "Submit Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuiz && quizSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-lg w-full rounded-lg bg-white p-6 text-center">
            {quizScore >= 80 ? (
              <div>
                <div className="text-6xl">🎉</div>
                <h2 className="mt-4 text-2xl font-bold text-green-600">You Passed!</h2>
                <p className="mt-2 text-gray-600">You scored {quizScore}%</p>
                <div className="mt-4 rounded-lg bg-green-50 p-4">
                  <p className="text-green-800">🏆 +100 points earned!</p>
                  <p className="text-sm text-green-600">Module complete! 🎊</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-6xl">📚</div>
                <h2 className="mt-4 text-2xl font-bold text-red-600">Keep Practicing!</h2>
                <p className="mt-2 text-gray-600">You scored {quizScore}%</p>
                <p className="text-sm text-gray-500">You need 80% to pass</p>
                <div className="mt-4 rounded-lg bg-yellow-50 p-4">
                  <p className="text-yellow-800">💡 Review the lessons and try again</p>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => {
                  setShowQuiz(false);
                  setQuizStarted(false);
                  setQuizSubmitted(false);
                  if (quizScore >= 80) {
                    loadModuleAndProgress();
                  }
                }}
                className={`rounded-lg px-6 py-2 text-white ${
                  quizScore >= 80
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {quizScore >= 80 ? "Continue to Next Module" : "Try Again"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
