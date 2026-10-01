'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { updateApplicationStatus, deleteApplication } from '@/app/actions/student';
import {
  Compass,
  Calendar,
  Trash2,
  ArrowRight,
  CheckCircle2,
  FileText,
  Kanban,
  Milestone,
} from 'lucide-react';
import { StatusBadge, EmptyState } from '@/components/design-system';

export interface ApplicationItem {
  id: string;
  status: string;
  updatedAt: Date | string;
  scholarshipId: string;
  scholarshipName: string;
  providerName: string;
  closeDate: string | null;
  sourceUrl?: string;
}

// 5 Visual Journey Stages
const JOURNEY_STAGES = [
  { key: 'saved', label: '1. Saved', stageNum: 1, actionHint: 'Review eligibility & criteria' },
  { key: 'planning', label: '2. Preparing', stageNum: 2, actionHint: 'Gather transcripts & draft statement' },
  { key: 'applying', label: '3. Applying', stageNum: 3, actionHint: 'Complete provider portal application' },
  { key: 'submitted', label: '4. Submitted', stageNum: 4, actionHint: 'Track interview calls & assessments' },
  { key: 'awarded', label: '5. Completed', stageNum: 5, actionHint: 'Offer received & acceptance' },
];

export function ApplicationTrackerClient({
  initialApplications,
}: {
  initialApplications: ApplicationItem[];
}) {
  const [apps, setApps] = useState<ApplicationItem[]>(initialApplications);
  const [viewMode, setViewMode] = useState<'journey' | 'kanban'>('journey');
  const [, startTransition] = useTransition();

  const handleStatusChange = (appId: string, newStatus: string) => {
    // Optimistic update
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus, updatedAt: new Date() } : a))
    );

    startTransition(async () => {
      await updateApplicationStatus(appId, newStatus);
    });
  };

  const advanceNextStage = (app: ApplicationItem) => {
    const currentIndex = JOURNEY_STAGES.findIndex((s) => s.key === app.status);
    if (currentIndex < JOURNEY_STAGES.length - 1) {
      const nextKey = JOURNEY_STAGES[currentIndex + 1].key;
      handleStatusChange(app.id, nextKey);
    }
  };

  const handleDelete = (appId: string) => {
    if (!confirm('Remove this scholarship from your application tracker?')) return;
    setApps((prev) => prev.filter((a) => a.id !== appId));
    startTransition(async () => {
      await deleteApplication(appId);
    });
  };

  const getStageIndex = (status: string) => {
    if (status === 'interview') return 3; // group with submitted/interview
    if (status === 'rejected') return 4;
    const idx = JOURNEY_STAGES.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="space-y-6">
      {/* Control bar: Switch between Journey View and Kanban Board */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Layout:
          </span>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('journey')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'journey'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Milestone className="w-3.5 h-3.5" />
              <span>Application Journey</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span>
            Tracking <strong className="text-slate-900 font-bold">{apps.length}</strong> active pipelines
          </span>
          <Link
            href="/scholarships"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-xs text-xs inline-flex items-center gap-1.5"
          >
            <span>+ Add Scholarship</span>
          </Link>
        </div>
      </div>

      {/* Empty State */}
      {apps.length === 0 ? (
        <EmptyState
          icon={<Compass className="w-6 h-6 text-blue-700" />}
          title="Your Application Pipeline is Empty"
          description="Save opportunities directly from the scholarship catalogue or run a deterministic eligibility check to track deadlines, interview dates, and documents."
          action={
            <Link
              href="/scholarships"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
            >
              <span>Explore Verified Opportunities</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />
      ) : viewMode === 'journey' ? (
        /* Visual Journey Feed */
        <div className="space-y-5">
          {apps.map((app) => {
            const currentStageIdx = getStageIndex(app.status);
            const close = app.closeDate ? new Date(app.closeDate) : null;
            const now = new Date();
            const daysLeft = close ? Math.ceil((close.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <div
                key={app.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6 hover:border-slate-300 transition-colors"
              >
                {/* Header Row: Title, Provider, Deadline, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                        {app.providerName}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <StatusBadge status={app.status} size="sm" />
                    </div>

                    <Link
                      href={`/scholarships/${app.scholarshipId}`}
                      className="font-sans text-xl sm:text-2xl font-bold text-slate-900 hover:text-blue-700 transition-colors block leading-tight"
                    >
                      {app.scholarshipName}
                    </Link>

                    {close && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Official Deadline: <strong className="text-slate-800">{close.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                        {daysLeft !== null && daysLeft > 0 && daysLeft <= 14 && (
                          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                            {daysLeft} days left
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Top Right Quick Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none"
                    >
                      {JOURNEY_STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          Stage: {s.label}
                        </option>
                      ))}
                      <option value="interview">Stage: Interview</option>
                      <option value="rejected">Stage: Unsuccessful</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleDelete(app.id)}
                      aria-label="Remove from tracker"
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Visual Journey Progression Track */}
                <div className="pt-2">
                  <div className="relative">
                    {/* Connecting progress bar */}
                    <div className="hidden sm:block absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{
                          width: `${(currentStageIdx / (JOURNEY_STAGES.length - 1)) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Step nodes */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative z-10">
                      {JOURNEY_STAGES.map((stage, idx) => {
                        const isPast = idx < currentStageIdx;
                        const isCurrent = idx === currentStageIdx;

                        return (
                          <button
                            key={stage.key}
                            type="button"
                            onClick={() => handleStatusChange(app.id, stage.key)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isCurrent
                                ? 'bg-white border-blue-600 shadow-sm ring-2 ring-blue-600/10'
                                : isPast
                                ? 'bg-emerald-50/50 border-emerald-200 text-slate-700'
                                : 'bg-slate-50/70 border-slate-200 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                  isCurrent
                                    ? 'text-blue-700'
                                    : isPast
                                    ? 'text-emerald-700'
                                    : 'text-slate-400'
                                }`}
                              >
                                Step {idx + 1}
                              </span>
                              {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                              {isCurrent && <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />}
                            </div>
                            <span className="font-bold text-xs text-slate-900 block truncate">
                              {stage.label.replace(/^\d+\.\s*/, '')}
                            </span>
                            <span className="text-[10px] text-slate-500 block line-clamp-1 mt-0.5">
                              {stage.actionHint}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Row: Direct Links & Stage Advancer */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/scholarships/${app.scholarshipId}/check`}
                      className="text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Review Eligibility Rules</span>
                    </Link>

                    <Link
                      href="/student/resume"
                      className="text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Prepare Tailored Resume</span>
                    </Link>
                  </div>

                  {currentStageIdx < JOURNEY_STAGES.length - 1 && (
                    <button
                      type="button"
                      onClick={() => advanceNextStage(app)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <span>Advance to {JOURNEY_STAGES[currentStageIdx + 1].label.replace(/^\d+\.\s*/, '')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {JOURNEY_STAGES.map((col) => {
            const colApps = apps.filter((a) => a.status === col.key);
            return (
              <div
                key={col.key}
                className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col min-h-[480px] space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">
                    {col.label}
                  </span>
                  <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    {colApps.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  {colApps.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {app.providerName}
                        </span>
                        <Link
                          href={`/scholarships/${app.scholarshipId}`}
                          className="font-sans text-sm font-bold text-slate-900 hover:text-blue-700 line-clamp-2 transition-colors"
                        >
                          {app.scholarshipName}
                        </Link>
                      </div>

                      {app.closeDate && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            Deadline:{' '}
                            {new Date(app.closeDate).toLocaleDateString('en-MY', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className="text-[11px] p-1 bg-slate-50 border border-slate-200 rounded text-slate-700 font-semibold focus:outline-none"
                        >
                          {JOURNEY_STAGES.map((s) => (
                            <option key={s.key} value={s.key}>
                              Move: {s.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDelete(app.id)}
                          aria-label="Delete application"
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
