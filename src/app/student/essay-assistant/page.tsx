'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  Lightbulb,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  Compass,
  Layers,
  CheckSquare,
  FileText,
} from 'lucide-react';

import { PageHeader } from '@/components/design-system';
import {
  VERIFIED_SCHOLARSHIP_PROMPTS,
  calculateTextMetrics,
  validateEssayInput,
  EssayMode,
  EssayAssistantResponse,
} from '@/domain/essay-assistant';

export default function EssayAssistantPage() {
  const [selectedPrompt, setSelectedPrompt] = useState(VERIFIED_SCHOLARSHIP_PROMPTS[0]);
  const [action, setAction] = useState<EssayMode>('brainstorm');
  const [studentDraft, setStudentDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EssayAssistantResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);

  // Dynamic Word & Character Counter
  const { words, characters } = calculateTextMetrics(studentDraft);
  const wordLimit = selectedPrompt.wordLimit;
  const wordsRemaining = wordLimit ? wordLimit - words : null;

  // Restore draft and configuration from sessionStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = sessionStorage.getItem('dreampath_essay_assistant_draft');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.scholarshipName) {
            const matched = VERIFIED_SCHOLARSHIP_PROMPTS.find(
              (p) => p.name === parsed.scholarshipName
            );
            if (matched) setSelectedPrompt(matched);
          }
          if (parsed.action) setAction(parsed.action);
          if (parsed.studentDraft) setStudentDraft(parsed.studentDraft);
          if (parsed.result) setResult(parsed.result);
          if (parsed.lastAnalyzedAt) setLastAnalyzedAt(parsed.lastAnalyzedAt);
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save draft and state changes to sessionStorage
  useEffect(() => {
    try {
      const payload = {
        scholarshipName: selectedPrompt.name,
        action,
        studentDraft,
        result,
        lastAnalyzedAt,
      };
      sessionStorage.setItem('dreampath_essay_assistant_draft', JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [selectedPrompt, action, studentDraft, result, lastAnalyzedAt]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Client-side input validation
    const validation = validateEssayInput(studentDraft, selectedPrompt.prompt);
    if (!validation.isValid) {
      setErrorMessage(validation.errorMessage || 'Please enter your draft or notes before analyzing.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          scholarshipName: selectedPrompt.name,
          providerName: selectedPrompt.provider,
          essayPrompt: selectedPrompt.prompt,
          studentDraft: studentDraft.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setErrorMessage('Please sign in to access the AI Essay Assistant.');
        } else {
          setErrorMessage(
            data.error ||
              "We couldn't analyze your draft right now. Your draft has not been lost. Please try again."
          );
        }
        return;
      }

      setResult(data);
      setLastAnalyzedAt(new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setErrorMessage(
        "We couldn't analyze your draft right now. Your draft has not been lost. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearDraft = () => {
    if (confirm('Are you sure you want to clear your current draft?')) {
      setStudentDraft('');
      setResult(null);
      setErrorMessage(null);
      setLastAnalyzedAt(null);
      sessionStorage.removeItem('dreampath_essay_assistant_draft');
    }
  };

  const getCtaLabel = () => {
    if (isLoading) return 'Analyzing Your Draft...';
    if (action === 'brainstorm') return 'Help Me Brainstorm';
    if (action === 'structure') return 'Review Structure & Flow';
    return 'Polish Tone & Clarity';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Student Workspace', href: '/student' },
          { label: 'Essay & Statement Assistant' },
        ]}
        eyebrow="Controlled Writing Guidance"
        title="Scholarship Essay & Statement Assistant"
        subtitle="Brainstorm authentic structures, review draft clarity, and refine your tone without fabricating achievements or personal stories."
        actions={
          studentDraft ? (
            <button
              type="button"
              onClick={handleClearDraft}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear Draft</span>
            </button>
          ) : undefined
        }
      />

      {/* Configuration & Input Form */}
      <form
        onSubmit={handleGenerate}
        className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-5"
      >
        {/* Scholarship & Prompt Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Target Scholarship & Essay Prompt
          </label>
          <select
            value={selectedPrompt.name}
            onChange={(e) => {
              const matched = VERIFIED_SCHOLARSHIP_PROMPTS.find((s) => s.name === e.target.value);
              if (matched) {
                setSelectedPrompt(matched);
                setResult(null);
                setErrorMessage(null);
              }
            }}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 cursor-pointer"
          >
            {VERIFIED_SCHOLARSHIP_PROMPTS.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.provider}) — &ldquo;{s.prompt}&rdquo;
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 italic mt-1">
            Prompt: &ldquo;{selectedPrompt.prompt}&rdquo;
          </p>
        </div>

        {/* Advisory Mode Tabs */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 block">
              Advisory Mode
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              Choose how you want the AI coach to assist
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                id: 'brainstorm' as const,
                title: '1. Brainstorm Ideas',
                desc: 'Discover authentic material & outline',
              },
              {
                id: 'structure' as const,
                title: '2. Review Structure',
                desc: 'Check prompt coverage & paragraph flow',
              },
              {
                id: 'review' as const,
                title: '3. Polish & Clarity',
                desc: 'Refine phrasing, tone, and conciseness',
              },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setAction(t.id);
                  setErrorMessage(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  action === t.id
                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-xs">{t.title}</div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    action === t.id ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Student Draft / Notes Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 block">
              Your Ideas or Draft
            </label>
            <div className="text-[11px] font-mono text-slate-500 font-medium flex items-center gap-2">
              {wordLimit ? (
                <span>
                  Current: <strong className="text-slate-800">{words} words</strong> • Limit:{' '}
                  {wordLimit} words • Remaining:{' '}
                  <strong
                    className={
                      wordsRemaining !== null && wordsRemaining < 0
                        ? 'text-rose-600 font-bold'
                        : 'text-slate-800'
                    }
                  >
                    {wordsRemaining !== null && wordsRemaining < 0
                      ? `${Math.abs(wordsRemaining)} over`
                      : `${wordsRemaining} words`}
                  </strong>
                </span>
              ) : (
                <span>
                  Current: <strong className="text-slate-800">{words} words</strong> •{' '}
                  {characters} characters
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Share your own experiences, achievements, goals, or rough ideas. DreamPath will help you develop them without inventing anything.
          </p>
          <textarea
            rows={8}
            value={studentDraft}
            onChange={(e) => {
              setStudentDraft(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={
              action === 'brainstorm'
                ? 'Jot down your initial thoughts, projects you took part in, difficulties you solved, or why you are drawn to this scholarship...'
                : 'Paste your current essay paragraphs here. The assistant will review your flow, evidence, and prompt alignment...'
            }
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 placeholder:text-slate-400 leading-relaxed resize-y font-normal"
          />
        </div>

        {/* Validation or Error Message Banner */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold block">Input Attention Required:</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Strict anti-hallucination ethics: You remain the sole author.</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-xs cursor-pointer shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400" />
            )}
            <span>{getCtaLabel()}</span>
          </button>
        </div>
      </form>

      {/* Output Results */}
      {result && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6 animate-in fade-in duration-200">
          {/* Header & Qualitative Readiness Assessment */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-700 flex items-center justify-center">
                {result.mode === 'brainstorm' ? (
                  <Compass className="w-4 h-4 text-blue-600" />
                ) : result.mode === 'structure' ? (
                  <Layers className="w-4 h-4 text-purple-600" />
                ) : (
                  <FileText className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  {result.mode === 'brainstorm'
                    ? `Idea Brainstorming & Theme Exploration — ${selectedPrompt.name}`
                    : result.mode === 'structure'
                    ? `Structural Architecture & Flow Review — ${selectedPrompt.name}`
                    : `Line-by-Line Polish & Voice Review — ${selectedPrompt.name}`}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {lastAnalyzedAt ? `Analyzed at ${lastAnalyzedAt}` : 'Writing Coach Evaluation'} •{' '}
                  {result.mode === 'brainstorm'
                    ? 'Ideation & Raw Material Mining'
                    : result.mode === 'structure'
                    ? 'Paragraph Logic & Prompt Balance'
                    : 'Tone, Clarity & Authentic Student Voice'}
                </p>
              </div>
            </div>

            {/* Qualitative Readiness Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                  result.readiness === 'strong_draft'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : result.readiness === 'good_foundation'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}
              >
                Readiness: {result.readinessLabel || 'Developing'}
              </span>
            </div>
          </div>

          {/* Overall Editorial Assessment */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs text-slate-800 leading-relaxed font-normal">
            <strong className="block text-[11px] uppercase tracking-wider text-slate-900 font-bold">
              {result.mode === 'brainstorm'
                ? 'Brainstorming Coach Assessment:'
                : result.mode === 'structure'
                ? 'Structure & Progression Assessment:'
                : 'Tone & Style Review:'}
            </strong>
            <p>{result.overallAssessment}</p>
            {result.readinessDescription && (
              <p className="text-slate-500 text-[11px] mt-1 border-t border-slate-200/60 pt-1.5">
                {result.readinessDescription}
              </p>
            )}
          </div>

          {/* MODE 1: BRAINSTORM SPECIFIC SECTIONS */}
          {result.mode === 'brainstorm' && (
            <div className="space-y-6">
              {/* Strong Ideas & Experiences to Expand */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-xl space-y-2 text-xs">
                  <strong className="text-emerald-950 font-bold block text-xs flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-emerald-600" />
                    <span>Strong Ideas Already Present in Your Notes:</span>
                  </strong>
                  <ul className="space-y-1.5 pl-1">
                    {(result.brainstormData?.strongIdeas || result.strengths || []).map((idea, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-emerald-900 font-medium">
                        <span className="text-emerald-600 font-bold shrink-0">✓</span>
                        <span>{idea}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-blue-50/60 border border-blue-200/70 rounded-xl space-y-2 text-xs">
                  <strong className="text-blue-950 font-bold block text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Real Experiences Worth Expanding:</span>
                  </strong>
                  <ul className="space-y-1.5 pl-1">
                    {(result.brainstormData?.experiencesToExpand || []).map((exp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-blue-950 font-medium">
                        <span className="text-blue-600 font-bold shrink-0">▸</span>
                        <span>{exp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* What's Missing Check from Official Prompt */}
              {result.promptCoverage && result.promptCoverage.needsSupport && result.promptCoverage.needsSupport.length > 0 && (
                <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-2 text-xs">
                  <strong className="text-amber-950 font-bold block text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Requirements Missing from the Scholarship Prompt:</span>
                  </strong>
                  <p className="text-[11px] text-amber-900/80 mb-1">
                    To make your essay competitive for {selectedPrompt.name}, make sure you also address these official requirements:
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    {result.promptCoverage.needsSupport.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-amber-900 font-medium">
                        <span className="text-amber-600 font-bold shrink-0">○</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Probing Guiding Questions */}
              <div className="p-4.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2 text-xs">
                <strong className="text-slate-950 font-bold block text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>Probing Questions to Answer for Yourself:</span>
                </strong>
                <p className="text-[11px] text-slate-500 mb-2">
                  Take a few minutes to write down honest, specific answers to these questions before drafting full paragraphs:
                </p>
                <ul className="space-y-2">
                  {(result.brainstormData?.guidingQuestions || result.probingQuestions || []).map((q, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-800 leading-relaxed font-normal">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Narrative Angles */}
              {result.brainstormData?.possibleAngles && result.brainstormData.possibleAngles.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-600" />
                    <span>Possible Narrative Angles for Your Story:</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {result.brainstormData.possibleAngles.map((angle, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1 text-slate-800">
                        <span className="text-[10px] font-bold text-indigo-700 block uppercase">Option {idx + 1}</span>
                        <p className="text-[11px] leading-relaxed text-slate-700">{angle}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Starter Outline */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Suggested Starter Outline to Begin Writing:</span>
                </h4>
                <div className="space-y-2">
                  {(result.brainstormData?.starterOutline || result.suggestedOutline || []).map((step, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5 text-xs text-slate-800">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="font-medium leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: STRUCTURE SPECIFIC SECTIONS */}
          {result.mode === 'structure' && (
            <div className="space-y-6">
              {/* Prompt Coverage: Covered vs Needs Support */}
              {result.promptCoverage && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Prompt Coverage: Addressed vs Needs Personal Support</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-xl space-y-2 text-xs">
                      <strong className="text-emerald-950 font-bold block text-[11px] uppercase tracking-wider">
                        Covered by your text:
                      </strong>
                      {result.promptCoverage.covered && result.promptCoverage.covered.length > 0 ? (
                        <ul className="space-y-1.5">
                          {result.promptCoverage.covered.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-emerald-900 font-medium">
                              <span className="text-emerald-600 font-bold shrink-0">✓</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-emerald-800/80 italic text-[11px]">No core prompt components are fully grounded yet.</p>
                      )}
                    </div>

                    <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-2 text-xs">
                      <strong className="text-amber-950 font-bold block text-[11px] uppercase tracking-wider">
                        Needs personal evidence:
                      </strong>
                      {result.promptCoverage.needsSupport && result.promptCoverage.needsSupport.length > 0 ? (
                        <ul className="space-y-1.5">
                          {result.promptCoverage.needsSupport.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-amber-900 font-medium">
                              <span className="text-amber-600 font-bold shrink-0">○</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-amber-800/80 italic text-[11px]">All primary requirements have at least initial narrative support!</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Section-by-Section Paragraph Structure */}
              {result.structureEvaluation && result.structureEvaluation.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Paragraph Architecture Breakdown</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {result.structureEvaluation.map((sec, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900 font-bold">{sec.section}</strong>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sec.status === 'covered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sec.status === 'partial'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {sec.status === 'covered' ? 'Supported' : sec.status === 'partial' ? 'Partial' : 'Missing'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed font-normal">{sec.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proportional Balance & Flow Analysis */}
              <div className="p-4 bg-purple-50/50 border border-purple-200/70 rounded-xl space-y-2 text-xs">
                <strong className="text-purple-950 font-bold block text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Proportional Balance &amp; Flow Analysis:</span>
                </strong>
                <p className="text-purple-900 text-[11px] leading-relaxed">
                  {result.structureData?.paragraphBalance ||
                    'Ensure introductory remarks do not exceed 25% of your total essay, leaving sufficient space for concrete evidence (50%) and future vision (25%).'}
                </p>
                {((result.structureData?.flowAnalysis || result.flowIssues) || []).length > 0 && (
                  <ul className="space-y-1 pt-1 border-t border-purple-200/60">
                    {(result.structureData?.flowAnalysis || result.flowIssues || []).map((f, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-purple-900 font-medium text-[11px]">
                        <span className="text-purple-600 font-bold shrink-0">&bull;</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Priority Structural Revisions */}
              <div className="p-4.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2 text-xs">
                <strong className="text-slate-950 font-bold block text-xs tracking-wide">
                  Priority Structural Revisions:
                </strong>
                <ul className="space-y-2">
                  {(result.structureData?.priorityStructuralRevisions || result.actionableRecommendations || []).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-slate-800 leading-relaxed font-normal">
                      <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* MODE 3: REVIEW / POLISH SPECIFIC SECTIONS */}
          {result.mode === 'review' && (
            <div className="space-y-6">
              {/* Tone Assessment */}
              <div className="p-4 bg-blue-50/50 border border-blue-200/70 rounded-xl space-y-2 text-xs">
                <strong className="text-blue-950 font-bold block text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Tone &amp; Student Voice Assessment:</span>
                </strong>
                <p className="text-blue-900 leading-relaxed text-[11px]">
                  {result.reviewData?.toneAssessment ||
                    'Aim for humble confidence. Let your factual actions, timelines, and measurable achievements convey competence without relying on inflated buzzwords.'}
                </p>
              </div>

              {/* Clarity, Cliché & Phrase Alerts */}
              {result.toneAndClarityIssues && result.toneAndClarityIssues.length > 0 && (
                <div className="p-4 bg-amber-50/50 border border-amber-200/70 rounded-xl space-y-2 text-xs">
                  <strong className="text-amber-950 font-bold block text-xs tracking-wide flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Linguistic Tightening &amp; Cliché Alerts:</span>
                  </strong>
                  <div className="space-y-2 mt-1">
                    {result.toneAndClarityIssues.map((issue, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200/60 text-slate-800 space-y-1">
                        <div className="text-[11px] font-mono text-rose-700 font-bold">
                          &ldquo;{issue.originalSnippet}&rdquo;
                        </div>
                        <p className="text-slate-600 text-[11px]">{issue.issue}</p>
                        <p className="text-slate-900 text-[11px] font-semibold">
                          Suggested direction: {issue.suggestedImprovement}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Word Count & Brevity Advice */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
                <strong className="text-slate-900 font-bold block text-xs flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Word Count &amp; Brevity Analysis:</span>
                </strong>
                <p className="text-slate-700 text-[11px]">{result.wordCountAnalysis}</p>
                {result.reviewData?.concisenessAdvice && (
                  <p className="text-slate-600 text-[11px] border-t border-slate-200/60 pt-1 mt-1">
                    {result.reviewData.concisenessAdvice}
                  </p>
                )}
              </div>

              {/* Polish Checklist */}
              {result.reviewData?.polishChecklist && result.reviewData.polishChecklist.length > 0 && (
                <div className="p-4.5 bg-emerald-50/50 border border-emerald-200/70 rounded-xl space-y-2.5 text-xs">
                  <strong className="text-emerald-950 font-bold block text-xs flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>Final Pre-Submission Polish Checklist:</span>
                  </strong>
                  <ul className="space-y-2">
                    {result.reviewData.polishChecklist.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-emerald-900 font-medium">
                        <input
                          type="checkbox"
                          defaultChecked={false}
                          className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Iterative Polish Tip */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Tip: Edit your draft in the text box above and click the button again to run an updated analysis.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
