"use client";

import { useState, useEffect, useRef } from "react";
import { requireSession } from "@/lib/auth-server";
import { ChatView } from "@/components/chat-view";
import {
  getTargetLanguage,
  getPreferredModel,
} from "@/lib/actions/preferences";
import { getModelsForUser } from "@/lib/ai/models";

// ─── Voice Functionality ───

// Text-to-Speech: AI speaks responses
function useTextToSpeech() {
  const speak = (text: string) => {
    if (typeof window === 'undefined') return;
    if (!window.speechSynthesis) return;
   
    window.speechSynthesis.cancel();
   
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
   
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
   
    window.speechSynthesis.speak(utterance);
  };
 
  return { speak };
}

// Speech-to-Text: Student speaks answers
function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = (onResult: (text: string) => void) => {
    if (typeof window === 'undefined') return;
   
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
   
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const currentTranscript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setTranscript(currentTranscript);
     
      if (event.results[0].isFinal) {
        onResult(currentTranscript);
        setTranscript('');
        setIsListening(false);
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

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return { isListening, transcript, startListening, stopListening };
}

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
    />
  );
}