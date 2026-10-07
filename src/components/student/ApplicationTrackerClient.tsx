'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import {
  updateApplicationStatus,
  updateApplicationDetails,
  deleteApplication,
} from '@/app/actions/student';
import {
  Compass,
  Calendar,
  Trash2,
  ArrowRight,
  CheckCircle2,
  FileText,
  Kanban,
  Milestone,
  Edit3,
  ExternalLink,
  Clock,
  AlertTriangle,
  X,
  Search,
  Check,
  Building,
} from 'lucide-react';
import { EmptyState } from '@/components/design-system';

export interface ApplicationItem {
  id: string;
  status: string;
  notes?: string | null;
  submissionDate?: string | null;
  interviewDate?: string | null;
  createdAt?: Date | string;
  updatedAt: Date | string;
  scholarshipId: string;
  scholarshipName: string;
  providerName: string;
  providerUrl?: string | null;
  closeDate: string | null;
}

export const APPLICATION_STATUSES = [
  { key: 'not_started', label: 'Not Started', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'preparing', label: 'Preparing', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'in_progress', label: 'In Progress', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'submitted', label: 'Submitted', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'shortlisted', label: 'Shortlisted', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  { key: 'interview', label: 'Interview', badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  { key: 'accepted', label: 'Accepted', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { key: 'rejected', label: 'Rejected', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200' },
  { key: 'withdrawn', label: 'Withdrawn', badgeClass: 'bg-slate-100 text-slate-500 border-slate-200' },
];

// Normalize legacy statuses
export function normalizeStatus(rawStatus: string): string {
  const s = rawStatus?.toLowerCase() || 'not_started';
  if (s === 'saved') return 'not_started';
  if (s === 'planning') return 'preparing';
  if (s === 'applying') return 'in_progress';
  if (s === 'awarded') return 'accepted';
  if (s === 'under_review') return 'submitted';
  if (APPLICATION_STATUSES.some((item) => item.key === s)) return s;
  return 'not_started';
}

export function getStatusMeta(status: string) {
  const normalized = normalizeStatus(status);
  return (
    APPLICATION_STATUSES.find((s) => s.key === normalized) || {
      key: normalized,
      label: normalized.replace('_', ' '),
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    }
  );
}

// 5 Sequential milestones for the visual journey
const JOURNEY_STEPS = [
  { key: 'not_started', label: '1. Not Started', hint: 'Saved to review' },
  { key: 'preparing', label: '2. Preparing', hint: 'Transcripts & essays' },
  { key: 'in_progress', label: '3. In Progress', hint: 'Filling portal' },
  { key: 'submitted', label: '4. Submitted', hint: 'Application sent' },
  { key: 'accepted', label: '5. Outcome', hint: 'Decision reached' },
];

export function ApplicationTrackerClient({
  initialApplications,
}: {
  initialApplications: ApplicationItem[];
}) {
  const [apps, setApps] = useState<ApplicationItem[]>(initialApplications);
  const [viewMode, setViewMode] = useState<'journey' | 'kanban'>('journey');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingApp, setEditingApp] = useState<ApplicationItem | null>(null);
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [, startTransition] = useTransition();

  // Edit form state
  const [editStatus, setEditStatus] = useState('not_started');
  const [editNotes, setEditNotes] = useState('');
  const [editSubmissionDate, setEditSubmissionDate] = useState('');
  const [editInterviewDate, setEditInterviewDate] = useState('');

  const openEditModal = (app: ApplicationItem) => {
    setEditingApp(app);
    setEditStatus(normalizeStatus(app.status));
    setEditNotes(app.notes || '');
    setEditSubmissionDate(app.submissionDate ? String(app.submissionDate).slice(0, 10) : '');
    setEditInterviewDate(app.interviewDate ? String(app.interviewDate).slice(0, 10) : '');
  };

  const closeEditModal = () => {
    setEditingApp(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    setIsSavingEdit(true);
    const appId = editingApp.id;
    const updatedStatus = editStatus;
    const updatedNotes = editNotes.trim();
    const updatedSubmissionDate = editSubmissionDate || null;
    const updatedInterviewDate = editInterviewDate || null;

    // Optimistic UI update
    setApps((prev) =>
      prev.map((a) =>
        a.id === appId
          ? {
              ...a,
              status: updatedStatus,
              notes: updatedNotes || null,
              submissionDate: updatedSubmissionDate,
              interviewDate: updatedInterviewDate,
              updatedAt: new Date(),
            }
          : a
      )
    );

    try {
      await updateApplicationDetails(appId, {
        status: updatedStatus,
        notes: updatedNotes,
        submissionDate: updatedSubmissionDate,
        interviewDate: updatedInterviewDate,
      });
      closeEditModal();
    } catch (err) {
      console.error('Failed to update application details:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleStatusChange = (appId: string, newStatus: string) => {
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus, updatedAt: new Date() } : a))
    );

    startTransition(async () => {
      try {
        await updateApplicationStatus(appId, newStatus);
      } catch (err) {
        console.error('Failed to update application status:', err);
      }
    });
  };

  const confirmDelete = async (appId: string) => {
    setApps((prev) => prev.filter((a) => a.id !== appId));
    setDeletingAppId(null);

    startTransition(async () => {
      try {
        await deleteApplication(appId);
      } catch (err) {
        console.error('Failed to delete application:', err);
      }
    });
  };

  // Dynamic Dashboard Statistics
  const stats = useMemo(() => {
    let notStarted = 0;
    let inProgress = 0;
    let submitted = 0;
    let interview = 0;
    let accepted = 0;
    let rejected = 0;
    let upcomingDeadlines = 0;
    let dueSoon = 0;
    let overdue = 0;

    const now = new Date();
    // Midnight comparison in local time
    now.setHours(0, 0, 0, 0);

    for (const app of apps) {
      const s = normalizeStatus(app.status);
      if (s === 'not_started') notStarted++;
      else if (s === 'preparing' || s === 'in_progress') inProgress++;
      else if (s === 'submitted') submitted++;
      else if (s === 'interview' || s === 'shortlisted') interview++;
      else if (s === 'accepted') accepted++;
      else if (s === 'rejected') rejected++;

      if (app.closeDate) {
        const d = new Date(app.closeDate);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
          upcomingDeadlines++;
          if (diffDays <= 7) dueSoon++;
        } else {
          overdue++;
        }
      }
    }

    return {
      total: apps.length,
      notStarted,
      inProgress,
      submitted,
      interview,
      accepted,
      rejected,
      upcomingDeadlines,
      dueSoon,
      overdue,
    };
  }, [apps]);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const norm = normalizeStatus(app.status);
      if (statusFilter !== 'all') {
        if (statusFilter === 'in_progress') {
          if (norm !== 'preparing' && norm !== 'in_progress') return false;
        } else if (statusFilter === 'interview') {
          if (norm !== 'interview' && norm !== 'shortlisted') return false;
        } else if (norm !== statusFilter) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = app.scholarshipName.toLowerCase().includes(q);
        const matchesProvider = app.providerName.toLowerCase().includes(q);
        const matchesNotes = app.notes?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesProvider && !matchesNotes) return false;
      }

      return true;
    });
  }, [apps, statusFilter, searchQuery]);

  const getDeadlineBadge = (closeDate: string | null) => {
    if (!closeDate) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <Calendar className="w-3 h-3 text-slate-300" />
          <span>No official deadline listed</span>
        </span>
      );
    }

    const d = new Date(closeDate);
    const now = new Date();
    d.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const formatted = d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
          <AlertTriangle className="w-3 h-3 text-rose-500" />
          <span>Closed ({formatted})</span>
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md animate-pulse">
          <Clock className="w-3 h-3 text-rose-600" />
          <span>Due Today! ({formatted})</span>
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>{diffDays} {diffDays === 1 ? 'day' : 'days'} left ({formatted})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
        <Calendar className="w-3 h-3 text-slate-400" />
        <span>Deadline: {formatted}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Dynamic Metric Summary Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Tracked
          </span>
          <span className="text-2xl font-black text-slate-900">{stats.total}</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Not Started
          </span>
          <span className="text-2xl font-black text-slate-700">{stats.notStarted}</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
            In Progress
          </span>
          <span className="text-2xl font-black text-blue-700">{stats.inProgress}</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block mb-1">
            Submitted
          </span>
          <span className="text-2xl font-black text-purple-700">{stats.submitted}</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
            Interview
          </span>
          <span className="text-2xl font-black text-amber-700">{stats.interview}</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
            Accepted
          </span>
          <span className="text-2xl font-black text-emerald-700">{stats.accepted}</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
            Upcoming Deadlines
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{stats.upcomingDeadlines}</span>
            {stats.dueSoon > 0 && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                {stats.dueSoon} soon
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Control & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by scholarship, provider, or notes..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          {/* View mode toggle & Add scholarship button */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('journey')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'journey'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Milestone className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            <Link
              href="/scholarships"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-xs text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Browse Scholarships</span>
            </Link>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1.5 shrink-0">
            Filter:
          </span>
          {[
            { key: 'all', label: `All (${apps.length})` },
            { key: 'not_started', label: `Not Started (${stats.notStarted})` },
            { key: 'in_progress', label: `In Progress (${stats.inProgress})` },
            { key: 'submitted', label: `Submitted (${stats.submitted})` },
            { key: 'interview', label: `Interview (${stats.interview})` },
            { key: 'accepted', label: `Accepted (${stats.accepted})` },
            { key: 'rejected', label: `Rejected (${stats.rejected})` },
          ].map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setStatusFilter(pill.key)}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
                statusFilter === pill.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Empty State */}
      {apps.length === 0 ? (
        <EmptyState
          icon={<Compass className="w-6 h-6 text-blue-700" />}
          title="You haven't added any scholarships to your tracker yet."
          description="Browse verified scholarships in Malaysia and click 'Add to Tracker' on any scholarship to monitor deadlines, submission statuses, and interview dates."
          action={
            <Link
              href="/scholarships"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
            >
              <span>Browse Scholarships</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />
      ) : filteredApps.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center space-y-3">
          <p className="text-slate-600 text-sm">No applications found matching your search or filter.</p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : viewMode === 'journey' ? (
        /* 4. Timeline View */
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const statusMeta = getStatusMeta(app.status);
            const currentNorm = normalizeStatus(app.status);

            return (
              <div
                key={app.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5 hover:border-slate-300 transition-colors"
              >
                {/* Header row: scholarship title, provider, deadline badge, and actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        {app.providerName}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <Link
                      href={`/scholarships/${app.scholarshipId}`}
                      className="font-sans text-lg sm:text-xl font-bold text-slate-900 hover:text-blue-700 transition-colors block leading-snug"
                    >
                      {app.scholarshipName}
                    </Link>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {getDeadlineBadge(app.closeDate)}

                      {app.interviewDate && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md">
                          <Calendar className="w-3 h-3 text-cyan-600" />
                          <span>
                            Interview: {new Date(app.interviewDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                          </span>
                        </span>
                      )}

                      {app.submissionDate && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>
                            Submitted: {new Date(app.submissionDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit modal button, Quick status change, and Delete */}
                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    <select
                      value={currentNorm}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 cursor-pointer"
                    >
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => openEditModal(app)}
                      aria-label="Edit application notes and dates"
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Edit application details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingAppId(app.id)}
                      aria-label="Remove from tracker"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove from tracker"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Personal Notes Banner if present */}
                {app.notes && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950 flex items-start gap-2">
                    <span className="font-bold text-amber-900 shrink-0">Notes:</span>
                    <p className="flex-1 whitespace-pre-wrap">{app.notes}</p>
                  </div>
                )}

                {/* Step Flow Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-100">
                  {JOURNEY_STEPS.map((step, idx) => {
                    const isSelected = currentNorm === step.key;
                    return (
                      <button
                        key={step.key}
                        type="button"
                        onClick={() => handleStatusChange(app.id, step.key)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-600/10'
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/70 text-slate-500'
                        }`}
                      >
                        <span
                          className={`text-[10px] font-bold block uppercase tracking-wider ${
                            isSelected ? 'text-blue-700' : 'text-slate-400'
                          }`}
                        >
                          Step {idx + 1}
                        </span>
                        <span
                          className={`text-xs font-bold block truncate mt-0.5 ${
                            isSelected ? 'text-blue-950' : 'text-slate-700'
                          }`}
                        >
                          {step.label.replace(/^\d+\.\s*/, '')}
                        </span>
                        <span className="text-[10px] text-slate-400 block line-clamp-1 mt-0.5">
                          {step.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Direct quick links */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/scholarships/${app.scholarshipId}/check`}
                      className="text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Check Eligibility</span>
                    </Link>

                    <Link
                      href="/student/resume"
                      className="text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Resume Builder</span>
                    </Link>

                    <Link
                      href="/student/interview-practice"
                      className="text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1.5"
                    >
                      <Compass className="w-3.5 h-3.5 text-purple-600" />
                      <span>Mock Interview</span>
                    </Link>
                  </div>

                  {app.providerUrl && (
                    <a
                      href={app.providerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-900 font-bold inline-flex items-center gap-1"
                    >
                      <span>Official Portal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 5. Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {[
            { key: 'not_started', label: 'Not Started', statuses: ['not_started'] },
            { key: 'in_progress', label: 'In Progress / Preparing', statuses: ['preparing', 'in_progress'] },
            { key: 'submitted', label: 'Submitted & Interview', statuses: ['submitted', 'shortlisted', 'interview'] },
            { key: 'accepted', label: 'Decided', statuses: ['accepted', 'rejected', 'withdrawn'] },
          ].map((col) => {
            const colApps = filteredApps.filter((a) =>
              col.statuses.includes(normalizeStatus(a.status))
            );

            return (
              <div
                key={col.key}
                className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col min-h-[480px] space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">{col.label}</span>
                  <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
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
                        <div className="text-[11px]">
                          {getDeadlineBadge(app.closeDate)}
                        </div>
                      )}

                      {app.notes && (
                        <p className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200/70 line-clamp-2">
                          {app.notes}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <select
                          value={normalizeStatus(app.status)}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className="text-[11px] p-1 bg-slate-50 border border-slate-200 rounded text-slate-700 font-semibold focus:outline-none"
                        >
                          {APPLICATION_STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(app)}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded"
                            title="Edit details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAppId(app.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            title="Delete application"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Edit Application Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  {editingApp.providerName}
                </span>
                <h3 className="text-base font-bold text-slate-950 leading-snug">
                  Edit Application Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {editingApp.scholarshipName}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Current Application Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date Submitted (Optional)
                  </label>
                  <input
                    type="date"
                    value={editSubmissionDate}
                    onChange={(e) => setEditSubmissionDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Interview Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={editInterviewDate}
                    onChange={(e) => setEditInterviewDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Personal Notes / Action Reminders
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Need to certify SPM transcript by next Friday. Prepared statement of purpose draft."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 leading-relaxed resize-y"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Dialog */}
      {deletingAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-950">Remove Application</h4>
                <p className="text-xs text-slate-500">Are you sure you want to remove this scholarship?</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will remove the scholarship from your tracker. Any personal notes or interview dates associated with this application will be deleted.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingAppId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(deletingAppId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
