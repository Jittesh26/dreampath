'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  getInterviewSession, 
  submitInterviewTurn, 
  synthesizeAndSaveResume,
  resetInterviewSession 
} from '@/app/actions/ai-interview';
import { ChatMessage, GeneratedWording } from '@/domain/ai-interview';
import { ResumeContent } from '@/domain/resume';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, CheckCircle2, RotateCcw, X, ArrowRight, AlertCircle } from 'lucide-react';

interface AIInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyGeneratedContent: (content: GeneratedWording | ResumeContent) => void;
  resumeId: string;
}

export default function AIInterviewModal({
  isOpen,
  onClose,
  onApplyGeneratedContent,
  resumeId,
}: AIInterviewModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisStage, setSynthesisStage] = useState(0);
  const [synthesisSuccess, setSynthesisSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || messages.length > 0) return;

    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) setIsLoading(true);
    }, 0);

    getInterviewSession(resumeId)
      .then((session) => {
        if (!isMounted) return;
        if (session.messages.length > 0) {
          setMessages(session.messages);
        } else {
          setMessages([
            {
              id: crypto.randomUUID(),
              role: 'ai',
              content: "Hello! I'm here to help you craft a standout resume. Let's start with your academic foundation: what degree or program are you studying, at which university or college, and what is your current year or CGPA?",
              timestamp: new Date(),
            },
          ]);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        console.error('Failed to load interview session:', err);
        setMessages([
          {
            id: crypto.randomUUID(),
            role: 'ai',
            content: "Hello! Let's build your resume together. What are you currently studying and where?",
            timestamp: new Date(),
          },
        ]);
      })
      .finally(() => {
        if (isMounted) {
          clearTimeout(timer);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, resumeId, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSynthesizing, synthesisSuccess]);

  // Focus input on load
  useEffect(() => {
    if (isOpen && !isLoading && !isSynthesizing) {
      inputRef.current?.focus();
    }
  }, [isOpen, isLoading, isSynthesizing]);

  // Dynamic progressive feedback during batch synthesis
  useEffect(() => {
    if (!isSynthesizing) return;
    const t1 = setTimeout(() => setSynthesisStage(1), 1800);
    const t2 = setTimeout(() => setSynthesisStage(2), 4200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isSynthesizing]);

  // Handle final automatic synthesis
  const triggerSynthesis = useCallback(async () => {
    setIsSynthesizing(true);
    setSynthesisStage(0);
    setErrorMsg(null);
    try {
      const result = await synthesizeAndSaveResume(resumeId);
      if (result.success && result.content) {
        onApplyGeneratedContent(result.content);
        setSynthesisSuccess(true);
      } else {
        setErrorMsg('Synthesis finished, but no new content was generated.');
      }
    } catch (err: any) {
      console.error('Synthesis failed:', err);
      setErrorMsg('Resume synthesis encountered a temporary issue. Your answers are safely saved in our database.');
    } finally {
      setIsSynthesizing(false);
      setSynthesisStage(0);
    }
  }, [resumeId, onApplyGeneratedContent]);

  // Submits student turn in a single unified operation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading || isSynthesizing) return;

    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'student',
      content: userText,
      timestamp: new Date(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await submitInterviewTurn({
        resumeId,
        history: messages,
        answer: userText,
      });

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'ai',
        content: result.nextQuestion,
        timestamp: new Date(),
      };

      setMessages([...nextHistory, aiMsg]);

      // Detect completion protocol: automatically synthesize and update resume
      if (result.isComplete) {
        setTimeout(() => {
          void triggerSynthesis();
        }, 1200);
      }
    } catch (err: any) {
      console.error('Turn submission error:', err);
      setErrorMsg(err?.message || 'We encountered an issue processing your response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReset() {
    if (!confirm('Start a fresh interview conversation for this resume?')) return;
    setIsLoading(true);
    try {
      await resetInterviewSession(resumeId);
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'ai',
          content: "Hello! Let's start fresh. What degree or qualification are you currently pursuing, and at which institution?",
          timestamp: new Date(),
        },
      ]);
      setSynthesisSuccess(false);
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Failed to reset session:', err);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  const synthesisMessages = [
    { title: 'Organising your background...', desc: 'Analyzing your answers and categorizing education, experiences, projects, and skills.' },
    { title: 'Drafting professional resume sections...', desc: 'Crafting concise, high-impact phrasing with active verbs and verifiable metrics.' },
    { title: 'Saving to your resume...', desc: 'Persisting verified updates directly to PostgreSQL and syncing your editor.' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[82vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-[#0B1B3D]">Resume AI Assistant</h2>
              <p className="text-xs text-slate-500">Conversational resume builder. Just chat naturally.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              title="Reset conversation"
              className="text-xs text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Stream Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FAFAF9]">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                  m.role === 'ai'
                    ? 'bg-white border border-slate-200 text-slate-800 shadow-xs'
                    : 'bg-[#0B1B3D] text-[#FAFAF9] shadow-sm font-medium'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}

          {/* AI Thinking Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xs flex gap-1.5 items-center">
                <span className="text-xs text-slate-500 font-medium mr-1">AI is thinking</span>
                <div className="w-1.5 h-1.5 bg-amber-700 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-amber-700 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-amber-700 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}

          {/* Progressive Batch Synthesis State */}
          {isSynthesizing && (
            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center gap-3 animate-in fade-in transition-all">
              <Loader2 className="w-5 h-5 animate-spin text-amber-800 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-950">
                  {synthesisMessages[synthesisStage]?.title || 'Synthesizing your resume...'}
                </p>
                <p className="text-[11px] text-amber-800">
                  {synthesisMessages[synthesisStage]?.desc || 'Compiling education, experiences, projects, and skills into executive phrasing.'}
                </p>
              </div>
            </div>
          )}

          {/* Synthesis Success Banner */}
          {synthesisSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-950">Your resume has been updated &amp; saved!</p>
                  <p className="text-[11px] text-emerald-800">All sections were synthesized from your conversation and saved to PostgreSQL.</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={onClose}
                className="bg-[#0B1B3D] text-[#FAFAF9] hover:bg-[#0B1B3D]/90 text-xs shrink-0 inline-flex items-center gap-1.5"
              >
                <span>View in Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Synthesis Failure with Direct Retry */}
          {errorMsg && (
            <div className="p-4 bg-red-50/90 border border-red-200 text-red-900 text-xs rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-950">Resume build encountered an issue</p>
                  <p className="text-[11px] text-red-800 mt-0.5">{errorMsg}</p>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => triggerSynthesis()}
                  disabled={isSynthesizing}
                  className="bg-white border border-red-300 text-red-800 hover:bg-red-50 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Resume Synthesis</span>
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 space-y-2.5">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || isSynthesizing}
              placeholder={isLoading ? "Please wait..." : "Type your answer naturally..."}
              className="flex-1 rounded-full border border-slate-300 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 text-xs sm:text-sm px-4 py-2 text-slate-800"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isSynthesizing}
              className="bg-[#0B1B3D] text-white rounded-full px-5 py-2 text-xs font-semibold disabled:opacity-50 hover:bg-[#0B1B3D]/90 transition-colors shadow-xs cursor-pointer"
            >
              Send
            </button>
          </form>

          {/* Polished Bottom Toolbar: Natural tip & instant build button */}
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
              <span>Share education, work, projects, or skills in your own words.</span>
            </span>

            {!synthesisSuccess && messages.filter((m) => m.role === 'student').length >= 1 && (
              <button
                type="button"
                onClick={() => triggerSynthesis()}
                disabled={isLoading || isSynthesizing}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 ml-auto"
              >
                <span>Finish &amp; Build Resume Now &rarr;</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
