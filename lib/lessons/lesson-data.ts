"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { lessons, type LessonStep } from "@/lib/lessons/lesson-data";

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

  const lesson = lessons[lessonId];

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
    }, 50); // Speed of typing
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
    utterance.rate = 0.6; // Slow for learners
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
          if (currentStep.nextStep) {
            setCurrentStepId(currentStep.nextStep);
          }
          setStudentInput("");
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
            // Mark as complete and go back to modules
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
