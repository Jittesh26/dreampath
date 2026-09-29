'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Mic,
  MicOff,
  Send,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';

interface Message {
  role: 'interviewer' | 'student';
  content: string;
}

const SCHOLARSHIPS = [
  { name: 'Gamuda Scholarship', provider: 'Gamuda Berhad' },
  { name: 'Petronas Education Sponsorship (PESP)', provider: 'PETRONAS' },
  { name: 'Yayasan Khazanah Global Scholarship', provider: 'Yayasan Khazanah' },
  { name: 'Bank Negara Kijang Scholarship', provider: 'Bank Negara Malaysia' },
  { name: 'JPA Program Ijazah Dalam Negara (PIDN)', provider: 'Jabatan Perkhidmatan Awam' },
];

export default function InterviewPracticePage() {
  const [selectedScholarship, setSelectedScholarship] = useState(SCHOLARSHIPS[0]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'interviewer',
      content: `Welcome to your mock interview panel for the ${SCHOLARSHIPS[0].name}. Please introduce yourself, your academic background, and why you are applying for this scholarship.`,
    },
  ]);
  const [inputAnswer, setInputAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  // Web Speech API Voice Recognition with graceful fallback
  const toggleVoiceRecording = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice dictation is not supported in this browser. Please type your response.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const handleSendAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAnswer.trim() || isSubmitting) return;

    const userText = inputAnswer;
    setInputAnswer('');
    const newHistory: Message[] = [...messages, { role: 'student', content: userText }];
    setMessages(newHistory);
    setIsSubmitting(true);

    try {
      // 1. Evaluate the answer
      const evalRes = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate_answer',
          scholarshipName: selectedScholarship.name,
          providerName: selectedScholarship.provider,
          questionHistory: newHistory,
          currentAnswer: userText,
        }),
      });
      const evalData = await evalRes.json();
      if (evalData.feedback) {
        setFeedback(evalData.feedback);
      }

      // 2. Fetch the next panel question
      const nextQRes = await fetch('/api/ai/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'next_question',
          scholarshipName: selectedScholarship.name,
          providerName: selectedScholarship.provider,
          questionHistory: newHistory,
        }),
      });
      const nextQData = await nextQRes.json();
      if (nextQData.nextQuestion) {
        setMessages((prev) => [
          ...prev,
          { role: 'interviewer', content: nextQData.nextQuestion },
        ]);
      }
    } catch {
      // fallback
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetInterview = (scholarship = selectedScholarship) => {
    setSelectedScholarship(scholarship);
    setMessages([
      {
        role: 'interviewer',
        content: `Welcome to your mock interview panel for the ${scholarship.name}. Please introduce yourself, your academic background, and why you are applying for this scholarship.`,
      },
    ]);
    setFeedback(null);
    setInputAnswer('');
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Top Header */}
      <div>
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider">
          <Compass className="w-4 h-4" />
          <span>Scholarship Preparation Simulator</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B3D]">
          Scholarship Mock Interview Practice
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Roleplay with an official interview panel simulator. Receive structured feedback on clarity, STAR method alignment, and communication.
        </p>
      </div>

      {/* Target Scholarship Selection */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
            Target Interview Panel:
          </label>
          <select
            value={selectedScholarship.name}
            onChange={(e) => {
              const matched = SCHOLARSHIPS.find((s) => s.name === e.target.value);
              if (matched) resetInterview(matched);
            }}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
          >
            {SCHOLARSHIPS.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.provider})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => resetInterview()}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 border border-slate-200 px-3 py-1.5 rounded-lg"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Session
        </button>
      </div>

      {/* Interview Dialogue Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
          <span className="font-bold text-slate-800">
            Panel: {selectedScholarship.provider}
          </span>
          <span className="text-slate-400 font-mono">
            Turns: {messages.filter((m) => m.role === 'student').length} answers given
          </span>
        </div>

        {/* Message Stream */}
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl text-xs leading-relaxed ${
                m.role === 'interviewer'
                  ? 'bg-slate-50 border border-slate-200/80 text-slate-900 font-medium'
                  : 'bg-amber-50/70 border border-amber-200 text-slate-900 font-medium ml-6'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1 text-[11px] uppercase tracking-wider">
                <span className={m.role === 'interviewer' ? 'text-[#0B1B3D]' : 'text-amber-900'}>
                  {m.role === 'interviewer' ? 'Official Panelist' : 'Your Answer'}
                </span>
              </div>
              <p>{m.content}</p>
            </div>
          ))}

          {isSubmitting && (
            <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
              <span>Panel is evaluating your response and formulating the next question...</span>
            </div>
          )}
        </div>

        {/* Live Answer Feedback Card if present */}
        {feedback && (
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Panel Evaluation Feedback
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-emerald-900">
                <span>Clarity: {feedback.clarityScore}/10</span>
                <span>·</span>
                <span>Structure: {feedback.structureScore}/10</span>
              </div>
            </div>

            {feedback.strengths && feedback.strengths.length > 0 && (
              <div>
                <strong className="text-emerald-900 block text-[11px] uppercase">Key Strengths:</strong>
                <ul className="list-disc list-inside text-emerald-800 space-y-0.5">
                  {feedback.strengths.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.improvements && feedback.improvements.length > 0 && (
              <div>
                <strong className="text-amber-900 block text-[11px] uppercase">Areas to Refine:</strong>
                <ul className="list-disc list-inside text-amber-800 space-y-0.5">
                  {feedback.improvements.map((imp: string, i: number) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.sampleBetterAnswer && (
              <div className="p-2.5 bg-white border border-emerald-200 rounded-lg text-slate-700">
                <strong className="text-slate-900 block text-[11px] mb-0.5">Suggested Structure:</strong>
                <p className="italic text-slate-600">{feedback.sampleBetterAnswer}</p>
              </div>
            )}
          </div>
        )}

        {/* Answer Input Bar */}
        <form onSubmit={handleSendAnswer} className="space-y-2 pt-2 border-t border-slate-100">
          <div className="relative">
            <textarea
              rows={3}
              value={inputAnswer}
              onChange={(e) => setInputAnswer(e.target.value)}
              placeholder="Type your answer here or click the microphone to speak..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isRecording
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-slate-500" />}
              <span>{isRecording ? 'Listening... Click to stop' : 'Voice Input'}</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !inputAnswer.trim()}
              className="px-6 py-2.5 bg-[#0B1B3D] hover:bg-[#132A5C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Answer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
