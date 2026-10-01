'use client';

import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

import { PageHeader } from '@/components/design-system';

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
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Student Workspace', href: '/student' },
          { label: 'Interview Simulator' },
        ]}
        eyebrow="Scholarship Preparation Simulator"
        title="Mock Interview Practice"
        subtitle="Roleplay with an AI scholarship interview panel. Get real-time feedback on clarity, STAR framework structure, and answer impact."
        actions={
          <button
            type="button"
            onClick={() => resetInterview()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Session</span>
          </button>
        }
      />

      {/* Target Scholarship Selection */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Target Interview Panel:
          </label>
          <select
            value={selectedScholarship.name}
            onChange={(e) => {
              const matched = SCHOLARSHIPS.find((s) => s.name === e.target.value);
              if (matched) resetInterview(matched);
            }}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          >
            {SCHOLARSHIPS.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.provider})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Panel active: <strong className="text-slate-900">{selectedScholarship.provider}</strong></span>
        </div>
      </div>

      {/* Interview Dialogue Box */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
          <span className="font-bold text-slate-900">
            Interview Stream — {selectedScholarship.name}
          </span>
          <span className="text-slate-400 font-mono text-[11px] font-semibold">
            {messages.filter((m) => m.role === 'student').length} answers submitted
          </span>
        </div>

        {/* Message Stream */}
        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl text-xs leading-relaxed transition-all ${
                m.role === 'interviewer'
                  ? 'bg-slate-50 border border-slate-200/90 text-slate-800'
                  : 'bg-blue-50/60 border border-blue-200/90 text-slate-900 ml-4 sm:ml-8'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 text-[11px] font-bold tracking-wide">
                <span className={m.role === 'interviewer' ? 'text-slate-900 uppercase text-[10px] tracking-wider' : 'text-blue-700 uppercase text-[10px] tracking-wider'}>
                  {m.role === 'interviewer' ? 'Official Panel Question' : 'Your Response'}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}

          {isSubmitting && (
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Evaluating your response against panel rubrics...</span>
            </div>
          )}
        </div>

        {/* Live Answer Feedback Card if present */}
        {feedback && (
          <div className="p-4.5 bg-emerald-50/70 border border-emerald-200/90 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Panel Evaluation Feedback
              </span>
              <div className="flex items-center gap-3 font-mono text-[11px] font-bold text-emerald-900">
                <span>Clarity: {feedback.clarityScore}/10</span>
                <span>•</span>
                <span>Structure: {feedback.structureScore}/10</span>
              </div>
            </div>

            {feedback.strengths && feedback.strengths.length > 0 && (
              <div>
                <strong className="text-emerald-900 block text-[11px] uppercase tracking-wider mb-1 font-bold">Key Strengths:</strong>
                <ul className="list-disc list-inside text-emerald-900 space-y-0.5 font-medium">
                  {feedback.strengths.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.improvements && feedback.improvements.length > 0 && (
              <div>
                <strong className="text-amber-950 block text-[11px] uppercase tracking-wider mb-1 font-bold">Refinement Opportunities:</strong>
                <ul className="list-disc list-inside text-amber-900 space-y-0.5 font-medium">
                  {feedback.improvements.map((imp: string, i: number) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.sampleBetterAnswer && (
              <div className="p-3 bg-white border border-emerald-200/90 rounded-lg text-slate-700 mt-2">
                <strong className="text-slate-900 block text-[11px] mb-1 font-bold">Suggested Model Phrasing:</strong>
                <p className="italic text-slate-600 text-xs leading-relaxed">{feedback.sampleBetterAnswer}</p>
              </div>
            )}
          </div>
        )}

        {/* Answer Input Bar */}
        <form onSubmit={handleSendAnswer} className="space-y-3 pt-3 border-t border-slate-100">
          <div>
            <textarea
              rows={3}
              value={inputAnswer}
              onChange={(e) => setInputAnswer(e.target.value)}
              placeholder="Type your response using the STAR method (Situation, Task, Action, Result)..."
              className="w-full p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 placeholder:text-slate-400 leading-relaxed resize-y font-normal"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isRecording
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-slate-500" />}
              <span>{isRecording ? 'Listening... Click to stop' : 'Voice Input'}</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !inputAnswer.trim()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
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
