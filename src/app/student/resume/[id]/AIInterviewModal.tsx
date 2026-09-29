'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  askQuestion, 
  processStudentAnswer, 
  getUnconfirmedFacts, 
  confirmFact, 
  rejectFact 
} from '@/app/actions/ai-interview';
import { ChatMessage, GeneratedWording } from '@/domain/ai-interview';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import WordingReview from './WordingReview';

// Minimal shape of an unconfirmed fact row as returned by the DB action
interface PendingFact {
  id: string;
  category: string;
  content: unknown;
  originalAnswer?: string | null;
}

function FactReviewCard({
  fact,
  onConfirm,
  onReject
}: {
  fact: PendingFact;
  onConfirm: (id: string, content?: unknown) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedJson, setEditedJson] = useState(JSON.stringify(fact.content, null, 2));

  return (
    <Card className="p-4 mb-4 shadow-sm border-slate-200 bg-white flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h4 className="text-base font-serif font-bold text-primary capitalize">{fact.category}</h4>
        <Badge variant="secondary">{fact.category}</Badge>
      </div>
      
      <div className="text-sm font-jakarta space-y-3">
        {fact.originalAnswer && (
          <div className="bg-[#FAFAF9] p-3 rounded-md border border-slate-200 text-slate-700 text-sm">
            <span className="font-semibold text-primary block mb-1">Source Text:</span>
            &quot;{fact.originalAnswer}&quot;
          </div>
        )}
        
        {isEditing ? (
          <textarea
            className="w-full h-32 rounded-lg border border-slate-300 p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={editedJson}
            onChange={e => setEditedJson(e.target.value)}
          />
        ) : (
          <pre className="text-xs text-slate-800 whitespace-pre-wrap font-mono bg-[#FAFAF9] p-3 rounded-md border border-slate-200">
            {JSON.stringify(fact.content, null, 2)}
          </pre>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button 
          variant="ghost"
          size="sm"
          onClick={() => onReject(fact.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          Reject
        </Button>
        {isEditing ? (
          <Button 
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                const parsed = JSON.parse(editedJson);
                onConfirm(fact.id, parsed);
                setIsEditing(false);
              } catch {
                alert('Invalid JSON format');
              }
            }}
          >
            Save & Confirm
          </Button>
        ) : (
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
        {!isEditing && (
          <Button 
            size="sm"
            onClick={() => onConfirm(fact.id, fact.content)}
            className="bg-[#0B1B3D] text-[#FAFAF9] hover:bg-[#0B1B3D]/90"
          >
            Confirm
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function AIInterviewModal({ 
  isOpen, 
  onClose,
  onApplyGeneratedContent,
  initialView = 'interview'
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onApplyGeneratedContent: (content: GeneratedWording) => void;
  initialView?: 'interview' | 'review';
}) {
  const [view, setView] = useState<'interview' | 'review'>(initialView);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFacts, setPendingFacts] = useState<PendingFact[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Declared as const arrow + useCallback so it can be referenced before the useEffect
  const initInterview = useCallback(async () => {
    setIsLoading(true);
    try {
      const initialQuestion = await askQuestion([]);
      setMessages([{ id: crypto.randomUUID(), role: 'ai', content: initialQuestion, timestamp: new Date() }]);
    } catch {
      setMessages([{ id: crypto.randomUUID(), role: 'ai', content: "Sorry, the AI is unavailable. You can still edit your resume manually.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs active tab when modal is opened from parent
      setView(initialView);
    }
  }, [isOpen, initialView]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initInterview is async; setState runs after await
      void initInterview();
    }
  }, [isOpen, initInterview, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingFacts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading || pendingFacts.length > 0) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'student',
      content: input,
      timestamp: new Date()
    };
    
    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      await processStudentAnswer(newHistory, userMessage.content);
      const unconfirmed = await getUnconfirmedFacts();
      
      if (unconfirmed.length > 0) {
        setPendingFacts(unconfirmed as PendingFact[]);
      } else {
        const nextQ = await askQuestion(newHistory);
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'ai', content: nextQ, timestamp: new Date() }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'ai', content: "Sorry, an error occurred. Please try again.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmFact(factId: string, editedContent?: unknown) {
    setIsLoading(true);
    await confirmFact(factId, editedContent);
    await refreshPendingFacts();
  }

  async function handleRejectFact(factId: string) {
    setIsLoading(true);
    await rejectFact(factId);
    await refreshPendingFacts();
  }

  async function refreshPendingFacts() {
    const unconfirmed = await getUnconfirmedFacts();
    setPendingFacts(unconfirmed as PendingFact[]);
    if (unconfirmed.length === 0) {
      const nextQ = await askQuestion(messages);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'ai', content: nextQ, timestamp: new Date() }]);
    }
    setIsLoading(false);
  }

  if (!isOpen) return null;

  if (view === 'review') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
          <WordingReview
            onApplyProposal={onApplyGeneratedContent}
            onClose={onClose}
            onBackToInterview={() => setView('interview')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-surface flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold font-serif text-primary">Resume Interview</h2>
            <p className="text-xs text-gray-500">I will extract facts, you confirm them, then I write.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#FAFAF9]">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                m.role === 'ai' 
                  ? 'bg-white border border-gray-200 text-gray-800 shadow-sm' 
                  : 'bg-primary text-white shadow-md'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}

          {/* Fact Confirmation UI */}
          {pendingFacts.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 mt-4">
              <h3 className="text-base font-bold font-serif text-primary mb-3 flex items-center gap-2">
                <span>🔍</span> I extracted the following facts. Please review and confirm:
              </h3>
              <div>
                {pendingFacts.map(fact => (
                  <FactReviewCard 
                    key={fact.id} 
                    fact={fact} 
                    onConfirm={handleConfirmFact} 
                    onReject={handleRejectFact} 
                  />
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm flex gap-1 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading || pendingFacts.length > 0}
              placeholder={pendingFacts.length > 0 ? "Please confirm facts above first..." : "Type your answer..."}
              className="flex-1 rounded-full border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm px-4"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading || pendingFacts.length > 0}
              className="bg-primary text-white rounded-full px-6 py-2 text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              Send
            </button>
          </form>
          <div className="mt-3 flex justify-center">
             <button
                type="button"
                onClick={() => setView('review')}
                disabled={isLoading}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors"
             >
                <span>📝</span> Review Professional Wording Proposals &rarr;
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
