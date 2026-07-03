"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

// ─── LESSON DATA ───
interface LessonStep {
  id: string;
  type: 'speak' | 'end';
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
        text: "It is a pleasure to meet you. Let's start with Lesson 1: Greetings and Introducing yourself.",
        waitForResponse: false,
        nextStep: "step_3",
      },
      {
        id: "step_3",
        type: "speak",
        text: "Hello is neutral. You can use it at any time. Hi and Hey are informal. Use them with friends and family.",
        waitForResponse: false,
        nextStep: "step_4",
      },
      {
        id: "step_4",
        type: "speak",
        text: "Good Morning is used from the early morning until 12 PM. Good Afternoon is used from 12 PM to 6 PM. Good Evening is used after 6 PM.",
        waitForResponse: false,
        nextStep: "step_5",
      },
      {
        id: "step_5",
        type: "speak",
        text: "You can introduce yourself by saying 'My name is' or 'I am'. For example: 'Hi, my name is Dennis' or 'Hello, I am Dennis'.",
        waitForResponse: false,
        nextStep: "step_6",
      },
      {
        id: "step_6",
        type: "speak",
        text: "Do you understand?",
        waitForResponse: true,
        expectedAnswers: ["yes", "yeah", "yep", "sure", "ok", "okay"],
        feedbackCorrect: "Great! Let's continue.",
        feedbackIncorrect: "That's okay. Let me explain again. Good Morning is before 12 PM. Good Afternoon is 12 PM to 6 PM. Good Evening is after 6 PM. Say 'My name is' or 'I am' to introduce yourself. Do you understand now?",
        nextStepOnYes: "step_7",
        nextStepOnNo: "step_6_repeat",
      },
      {
        id: "step_6_repeat",
        type: "speak",
        text: "Good Morning is before 12 PM. Good Afternoon is 12 PM to 6 PM. Good Evening is after 6 PM. Say 'My name is' or 'I am' to introduce yourself. Do you understand now?",
        waitForResponse: true,
        expectedAnswers: ["yes", "yeah", "yep", "sure", "ok", "okay"],
        feedbackCorrect: "Great! Let's continue.",
        feedbackIncorrect: "Don't worry, we'll practice together and you'll learn it.",
        nextStepOnYes: "step_7",
        nextStepOnNo: "step_7",
      },
      {
        id: "step_7",
        type: "speak",
        text: "Let's practice. How would you greet someone right now?",
        waitForResponse: true,
        expectedAnswers: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"],
        feedbackCorrect: "Well done, that was correct!",
        feedbackIncorrect: "You said that is not correct. Try saying 'Hello' or 'Good morning'.",
        nextStep: "step_8",
      },
      {
        id: "step_8",
        type: "speak",
        text: "Now imagine it is 8 PM. What greeting would you use?",
        waitForResponse: true,
        expectedAnswers: ["good evening", "evening"],
        feedbackCorrect: "Excellent! That is correct.",
        feedbackIncorrect: "The correct answer is 'Good Evening'.",
        nextStep: "step_9",
      },
      {
        id: "step_9",
        type: "speak",
        text: "Now imagine it is 9 AM. What greeting would you use?",
        waitForResponse: true,
        expectedAnswers: ["good morning", "morning"],
        feedbackCorrect: "Fantastic! That is correct.",
        feedbackIncorrect: "The correct answer is 'Good Morning'.",
        nextStep: "step_10",
      },
      {
        id: "step_10",
        type: "end",
        text: "Fantastic work! You have completed Lesson 1. You are ready to move on to Lesson 2.",
      },
    ],
  },
};

// ─── LESSON PLAYER COMPONENT ───
export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.id as string;
  const lesson = lessonData[lessonId];

  const [currentStepId, setCurrentStepId] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [studentInput, setStudentInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [subtitleText, setSubtitleText] = useState("");
  const [isListening, setIsListening] = useState(false);

  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const currentStep = lesson?.steps.find((s) => s.id === currentStepId);

  useEffect(() => {
    if (typeof window !== "undefined") {
      speechSynthRef.current = window.speechSynthesis;
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    if (lesson && !currentStepId) {
      setCurrentStepId(lesson.steps[0].id);
    }
  }, [lesson]);

  useEffect(() => {
    if (!currentStep) return;

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    setFeedback("");
    setStudentInput("");
    setIsWaiting(false);

    if (currentStep.type === "end") {
      setIsComplete(true);
      return;
    }

    if (currentStep.type === "speak") {
      speakText(currentStep.text);
    }
  }, [currentStep]);

  const typeText = (text: string) => {
    setSubtitleText("");
    let index = 0;

    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    typingIntervalRef.current = setInterval(() => {
      if (index < text.length) {
        setSubtitleText(text.slice(0, index + 1));
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

    speechSynthRef.current.cancel();

    const cleanText = text
      .replace(/[^\w\s.,!?' ]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const finalText = cleanText || text;
    if (!finalText) return;

    typeText(finalText);

    // Split into sentences
    const sentences = finalText.match(/[^.!?]+[.!?]+/g) || [finalText];
    let sentenceIndex = 0;

    function speakNextSentence() {
      if (sentenceIndex >= sentences.length) {
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
        return;
      }

      const sentence = sentences[sentenceIndex].trim();
      if (!sentence) {
        sentenceIndex++;
        speakNextSentence();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = "en-US";
      utterance.rate = 0.7;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = speechSynthRef.current!.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") ||
            v.name.includes("Natural") ||
            v.name.includes("Premium") ||
            v.name.includes("Samantha") ||
            v.name.includes("Zira"))
      ) || voices.find((v) => v.lang.startsWith("en"));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        sentenceIndex++;
        setTimeout(speakNextSentence, 200);
      };

      speechSynthRef.current!.speak(utterance);
    }

    setIsSpeaking(true);
    speakNextSentence();
  };

  const startListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setStudentInput(transcript);
      if (event.results[0].isFinal) {
        setIsListening(false);
        setTimeout(() => handleSubmit(), 300);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
    recognitionRef.current = recognition;
  };

  const handleSubmit = () => {
    if (!studentInput.trim() || !currentStep) return;

    const input = studentInput.trim().toLowerCase();

    if (currentStep.expectedAnswers) {
      const isCorrect = currentStep.expectedAnswers.some((ans) =>
        input.includes(ans.toLowerCase())
      );

      // Check if it's a "no" response
      const isNo = ["no", "nope", "not really", "nah"].includes(input);

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
      } else if (isNo && currentStep.nextStepOnNo) {
        // Trigger the re-explain step
        setCurrentStepId(currentStep.nextStepOnNo);
        setStudentInput("");
        setIsWaiting(false);
      } else {
        setFeedback(currentStep.feedbackIncorrect || "Not quite. Try again.");
        setStudentInput("");
        setTimeout(() => {
          setFeedback("");
        }, 2000);
      }
    } else {
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
        <p className="text-lg">Lesson not found. ID: {lessonId}</p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-3xl font-bold text-green-600 mb-4">Lesson Complete!</h2>
        <p className="text-lg text-gray-600 mb-6">
          {currentStep?.text || "You have completed this lesson!"}
        </p>
        <button
          onClick={() => router.push("/modules")}
          className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600"
        >
          Return to Modules
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{lesson.title}</h1>

      <div className="bg-gray-50 rounded-lg p-6 min-h-[150px] flex items-center justify-center border-2 border-gray-200">
        {subtitleText ? (
          <p className="text-xl text-gray-800 text-center leading-relaxed">{subtitleText}</p>
        ) : isSpeaking ? (
          <p className="text-gray-400 text-lg">Speaking...</p>
        ) : isWaiting ? (
          <p className="text-blue-500 text-lg font-medium">Please respond below...</p>
        ) : (
          <p className="text-gray-400 text-lg">Loading...</p>
        )}
      </div>

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

      {isWaiting && (
        <div className="mt-6">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or speak your answer..."
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
              autoFocus
            />
            <button
              onClick={startListening}
              className={`px-4 py-3 rounded-lg font-bold text-white transition-colors ${
                isListening ? "bg-red-500 animate-pulse" : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {isListening ? "🔴 Stop" : "🎤 Speak"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!studentInput.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-2">Type your answer or click Speak to use your voice</p>
        </div>
      )}

      <div className="mt-8">
        <div className="flex justify-between text-sm text-gray-500">
          <span>
            Step {lesson.steps.findIndex((s) => s.id === currentStepId) + 1} of {lesson.steps.length}
          </span>
        </div>
      </div>
    </div>
  );
}