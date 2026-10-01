'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Compass, CheckCircle2, Briefcase, FileText, User, Settings, ArrowRight } from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  category: 'Navigation' | 'Scholarship' | 'Tool';
  href: string;
  icon: React.ReactNode;
}

const STATIC_ACTIONS: QuickAction[] = [
  {
    id: 'browse',
    title: 'Browse Scholarships Catalogue',
    description: 'Explore all 27 verified Malaysian scholarships and grants',
    category: 'Navigation',
    href: '/scholarships',
    icon: <Compass className="w-4 h-4 text-amber-600" />,
  },
  {
    id: 'check',
    title: 'Instant Eligibility Checker',
    description: 'Run deterministic checks against verified criteria',
    category: 'Tool',
    href: '/scholarships',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  },
  {
    id: 'compare',
    title: 'Compare Scholarships',
    description: 'Side-by-side comparison of benefits, bonds & requirements',
    category: 'Tool',
    href: '/scholarships/compare',
    icon: <ArrowRight className="w-4 h-4 text-blue-600" />,
  },
  {
    id: 'tracker',
    title: 'Application Tracker',
    description: 'View your Kanban board & upcoming deadlines',
    category: 'Navigation',
    href: '/student/applications',
    icon: <Briefcase className="w-4 h-4 text-purple-600" />,
  },
  {
    id: 'resume',
    title: 'Resume Builder & AI Interview',
    description: 'Structure facts, refine wording, and generate ATS PDF',
    category: 'Tool',
    href: '/student/resume',
    icon: <FileText className="w-4 h-4 text-indigo-600" />,
  },
  {
    id: 'profile',
    title: 'Student Academic Profile',
    description: 'Update SPM grades, CGPA, and household income',
    category: 'Navigation',
    href: '/student/profile',
    icon: <User className="w-4 h-4 text-slate-600" />,
  },
  {
    id: 'interview-prep',
    title: 'Scholarship Interview Practice',
    description: 'Simulate official interview panel with AI feedback',
    category: 'Tool',
    href: '/student/interview-practice',
    icon: <Compass className="w-4 h-4 text-amber-700" />,
  },
  {
    id: 'essay-prep',
    title: 'Scholarship Essay Assistant',
    description: 'Brainstorm structure and refine tone for personal statements',
    category: 'Tool',
    href: '/student/essay-assistant',
    icon: <FileText className="w-4 h-4 text-teal-600" />,
  },
  {
    id: 'settings',
    title: 'Privacy & Settings',
    description: 'Export data, manage retention and notifications',
    category: 'Navigation',
    href: '/student/settings',
    icon: <Settings className="w-4 h-4 text-slate-500" />,
  },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filteredActions = STATIC_ACTIONS.filter(
    (action) =>
      action.title.toLowerCase().includes(query.toLowerCase()) ||
      action.description.toLowerCase().includes(query.toLowerCase()) ||
      action.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredActions.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % (filteredActions.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        handleSelect(filteredActions[selectedIndex].href);
      } else if (query.trim()) {
        handleSelect(`/scholarships?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] font-sans"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search scholarships (e.g. JPA, Gamuda, CGPA)..."
            className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent outline-none font-medium"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono font-bold text-slate-400 bg-slate-100 rounded-md border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-50">
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500 font-medium">No direct matching commands.</p>
              <button
                onClick={() => handleSelect(`/scholarships?q=${encodeURIComponent(query)}`)}
                className="mt-3 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                Search scholarships catalogue for &ldquo;{query}&rdquo; &rarr;
              </button>
            </div>
          ) : (
            filteredActions.map((action, idx) => (
              <button
                key={action.id}
                onClick={() => handleSelect(action.href)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  idx === selectedIndex ? 'bg-blue-50/70 text-slate-950' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-100 shadow-2xs shrink-0">
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-950 truncate">{action.title}</p>
                    <p className="text-xs text-slate-500 truncate">{action.description}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 font-semibold uppercase tracking-wider">
                  {action.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↵</kbd> to select
            </span>
          </div>
          <span className="font-serif italic text-blue-900 font-semibold">DreamPath Intelligence</span>
        </div>
      </div>
    </div>
  );
}
