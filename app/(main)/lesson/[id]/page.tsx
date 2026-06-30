"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface LessonStep {
  id: string;
  type: 'speak' | 'listen' | 'wait' | 'end';
  text: string;
  waitForResponse?: boolean;
  expectedAnswers?: string[];
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  nextStepOnYes?: string;
  nextStepOnNo?: string;
  nextStep?: string;
}

interface Lesson {
  id: string;
  title: string;
  steps: LessonStep[];
}

const lessonData: Record<string, Lesson> = {
  lesson_1: {
    id: "lesson_1",
    title: "Greetings and Self-Introductions",
    steps: [
      {
        id: "step_1",
        type: "speak",
        text: "Hello. I am your friendly AI English Teacher. Welcome to your Global English Language Proficiency journey! What is your name?",
        waitForResponse: true,
        nextStep: "step_2",
      },
      {
        id: "step_2",
        type: "speak",
        text: "It is a pleasure to meet you. Let's start with Lesson 1: Greetings and Introducing yourself. I will teach you different ways to say hello and introduce yourself in English.",
        waitForResponse: false,
        nextStep: "step_3",
      },
      {
        id: "step_3",
        type: "speak",
        text: "Hello is neutral and the most commonly used greeting. You can use it at any time.",
        waitForResponse: false,
        nextStep: "step_4",
      },
      {
        id: "step_4",
        type: "speak",
        text: "Hi and Hey are informal. You can also use these at any time, but it is best to only use them with close friends or family.",
        waitForResponse: false,
        nextStep: "step_5",
      },
      {
        id: "step_5",
        type: "speak",
        text: "We say Good Morning from the time we wake up in the early morning until 12 PM, which is the middle of the day.",
        waitForResponse: false,
        nextStep: "step_6",
      },
      {
        id: "step_6",
        type: "speak",
        text: "Good Afternoon is used from 12 PM to 6 PM. Good Evening is used after 6 PM, when it starts getting dark outside.",
        waitForResponse: false,
        nextStep: "step_7",
      },
      {
        id: "step_7",
        type: "speak",
        text: "You can introduce yourself in two ways. Say 'My name is' or say 'I am'. For example, 'Hi, my name is Dennis' or 'Hello, I am Dennis'. You can mix any greeting with any introduction.",
        waitForResponse: false,
        nextStep: "step_8",
      },
      {
        id: "step_8",
        type: "speak",
        text: "Do you understand?",
        waitForResponse: true,
        expectedAnswers: ["yes", "yeah", "yep", "sure", "ok", "okay"],
        feedbackCorrect: "Great! Let's continue.",
        feedbackIncorrect: "Let me explain it another way.",
        nextStepOnYes: "step_9",
        nextStepOnNo: "step_8_repeat",
      },
      {
        id: "step_8_repeat",
        type: "speak",
        text: "Which part do you not understand? Let me explain it another way. We use different greetings for different times of day. Good Morning is before 12 PM. Good Afternoon is from 12 PM to 6 PM. Good Evening is after 6 PM. And you can introduce yourself by saying 'My name is' or 'I am'. Do you understand now?",
        waitForResponse: true,
        expectedAnswers: ["yes", "yeah", "yep", "sure", "ok", "okay"],
        feedbackCorrect: "Great! Let's continue.",
        feedbackIncorrect: "Don't worry, we'll practice together and you'll learn it.",
        nextStepOnYes: "step_9",
        nextStepOnNo: "step_9",
      },
      {
        id: "step_9",
        type: "speak",
        text: "Let's practice together. How would you greet a person for the first time and introduce yourself right now?",
        waitForResponse: true,
        expectedAnswers: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "my name is", "i am"],
        feedbackCorrect: "Well done, that was correct!",
        feedbackIncorrect: "That is not correct. You should say something like 'Hello, my name is Dennis' or 'Good afternoon, I am Dennis'. Let's move on.",
        nextStep: "step_10",
      },
      {
        id: "step_10",
        type: "speak",
        text: "Now imagine it is 8 PM. What greeting would you use?",
        waitForResponse: true,
        expectedAnswers: ["good evening", "evening"],
        feedbackCorrect: "Excellent! That is correct.",
        feedbackIncorrect: "The correct answer is 'Good Evening'. Let's keep going.",
        nextStep: "step_11",
      },
      {
        id: "step_11",
        type: "speak",
        text: "Now imagine it is 9 AM. What greeting would you use?",
        waitForResponse: true,
        expectedAnswers: ["good morning", "morning"],
        feedbackCorrect: "Fantastic! That is correct.",
        feedbackIncorrect: "The correct answer is 'Good Morning'. Let's keep going.",
        nextStep: "step_12",
      },
      {
        id: "step_12",
        type: "end",
        text: "Fantastic work! You have completed Lesson 1. You are ready to move on to Lesson 2.",
      },
    ],
  },
};

interface LessonPlayerProps {
  lessonId: string;
  onComplete?: () => void;
}

export function LessonPlayer({ lessonId, onComplete }: LessonPlayerProps) {
  const router = useRouter();
  const [currentStepId, setCurrentStepId] = useState<string>("");
  const [displayText, setDisplayText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [studentInput, setStudentInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [subtitleText, setSubtitleText] = useState("");

  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lesson = lessonData[lessonId];

  // Get current step
  const currentStep = lesson?.steps.find((s) => s.id === currentStepId);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined") {
      speechSynthRef.current = window.speechSynthesis;
    }
  }, []);

  // Start the lesson
  useEffect(() => {
    if (lesson && !currentStepId) {
      setCurrentStepId(lesson.steps[0].id);
    }
  }, [lesson]);

  // Handle step changes
  useEffect(() => {
    if (!currentStep) return;

    // Clear previous typing
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    setDisplayText("");
    setFeedback("");
    setStudentInput("");
    setIsWaiting(false);

    if (currentStep.type === "end") {
      setIsComplete(true);
      if (onComplete) onComplete();
      return;
    }

    if (currentStep.type === "speak" || currentStep.type === "listen") {
      speakText(currentStep.text);
    }
  }, [currentStep]);

  // Type text on screen as it's spoken
  const typeText = (text: string) => {
    setSubtitleText("");
    let index = 0;

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    typingIntervalRef.current = setInterval(() => {
      if (index < text.length) {
        setSubtitleText((prev) => prev + text[index]);
        index++;
      } else {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }
    }, 50);
  };

  const speakText = (text: string) => {
    if (!speechSynthRef.current) return;

    // Cancel any ongoing speech
    speechSynthRef.current.cancel();

    // Clean the text
    const cleanText = text
      .replace(/[^\w\s.,!?' ]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    // Start typing the text on screen
    typeText(cleanText);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = 0.6;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find a good English voice
    const voices = speechSynthRef.current.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Google") ||
          v.name.includes("Natural") ||
          v.name.includes("Premium"))
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utteranceRef.current = utterance;
    setIsSpeaking(true);

    utterance.onend = () => {
      setIsSpeaking(false);
      if (currentStep?.waitForResponse) {
        setIsWaiting(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);
      } else if (currentStep?.nextStep) {
        setTimeout(() => {
          setCurrentStepId(currentStep.nextStep!);
        }, 500);
      }
    };

    speechSynthRef.current.speak(utterance);
  };

  const handleSubmit = () => {
    if (!studentInput.trim() || !currentStep) return;

    const input = studentInput.trim().toLowerCase();

    // Check if there are expected answers
    if (currentStep.expectedAnswers) {
      const isCorrect = currentStep.expectedAnswers.some((ans) =>
        input.includes(ans.toLowerCase())
      );

      if (isCorrect) {
        setFeedback(currentStep.feedbackCorrect || "Correct!");
        setTimeout(() => {
          setFeedback("");
          if (currentStep.nextStepOnYes) {
            setCurrentStepId(currentStep.nextStepOnYes);
          } else if (currentStep.nextStep) {
            setCurrentStepId(currentStep.nextStep);
          }
          setStudentInput("");
          setIsWaiting(false);
        }, 1500);
      } else {
        setFeedback(currentStep.feedbackIncorrect || "Not quite. Let's try again.");
        setStudentInput("");
        setTimeout(() => {
          setFeedback("");
        }, 2000);
      }
    } else {
      // No expected answers - just move on
      if (currentStep.nextStep) {
        setCurrentStepId(currentStep.nextStep);
        setStudentInput("");
        setIsWaiting(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-lg">Lesson not found</p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-3xl font-bold text-green-600 mb-4">
          Lesson Complete!
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          {currentStep?.text || "You have completed this lesson!"}
        </p>
        <button
          onClick={() => {
            router.push("/modules");
          }}
          className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600"
        >
          Return to Modules
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{lesson.title}</h1>
      </div>

      {/* Subtitle display */}
      <div className="bg-gray-50 rounded-lg p-6 min-h-[150px] flex items-center justify-center border-2 border-gray-200">
        {subtitleText ? (
          <p className="text-xl text-gray-800 text-center leading-relaxed">
            {subtitleText}
          </p>
        ) : isSpeaking ? (
          <p className="text-gray-400 text-lg">Speaking...</p>
        ) : isWaiting ? (
          <p className="text-blue-500 text-lg font-medium">
            Please respond below...
          </p>
        ) : (
          <p className="text-gray-400 text-lg">Loading...</p>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            feedback.includes("Correct") ||
            feedback.includes("Well done") ||
            feedback.includes("Excellent") ||
            feedback.includes("Fantastic")
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          <p className="font-medium">{feedback}</p>
        </div>
      )}

      {/* Input area */}
      {isWaiting && (
        <div className="mt-6">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer here..."
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!studentInput.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Press Enter to send your response
          </p>
        </div>
      )}

      {/* Progress */}
      <div className="mt-8">
        <div className="flex justify-between text-sm text-gray-500">
          <span>
            Step {lesson.steps.findIndex((s) => s.id === currentStepId) + 1} of{" "}
            {lesson.steps.length}
          </span>
        </div>
      </div>
    </div>
  );
}
