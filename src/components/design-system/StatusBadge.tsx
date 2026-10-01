import React from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Bookmark,
  Send,
  Mic,
  Award,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export type StatusType =
  | 'open'
  | 'closing-soon'
  | 'closed'
  | 'opening-soon'
  | 'verified'
  | 'saved'
  | 'planning'
  | 'in-progress'
  | 'submitted'
  | 'interview'
  | 'awarded'
  | 'unsuccessful'
  | 'eligible'
  | 'ineligible'
  | 'review';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, label, className = '', size = 'md' }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/\s+/g, '-');

  let config: {
    bg: string;
    text: string;
    border: string;
    icon: React.ReactNode;
    defaultLabel: string;
  };

  switch (normalized) {
    case 'open':
    case 'published':
      config = {
        bg: 'bg-emerald-50/80',
        text: 'text-emerald-800',
        border: 'border-emerald-200/90',
        icon: <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />,
        defaultLabel: 'Open',
      };
      break;
    case 'closing-soon':
    case 'closing_soon':
      config = {
        bg: 'bg-amber-50/90',
        text: 'text-amber-900',
        border: 'border-amber-300',
        icon: <Clock className="w-3 h-3 text-amber-700" />,
        defaultLabel: 'Closing Soon',
      };
      break;
    case 'closed':
      config = {
        bg: 'bg-slate-100/90',
        text: 'text-slate-600',
        border: 'border-slate-200',
        icon: <XCircle className="w-3 h-3 text-slate-400" />,
        defaultLabel: 'Closed',
      };
      break;
    case 'opening-soon':
    case 'opening_soon':
      config = {
        bg: 'bg-blue-50/80',
        text: 'text-blue-800',
        border: 'border-blue-200',
        icon: <Clock className="w-3 h-3 text-blue-600" />,
        defaultLabel: 'Opening Soon',
      };
      break;
    case 'verified':
      config = {
        bg: 'bg-emerald-50/90',
        text: 'text-emerald-900',
        border: 'border-emerald-300/80',
        icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />,
        defaultLabel: 'Official Source Verified',
      };
      break;
    case 'saved':
      config = {
        bg: 'bg-amber-50/80',
        text: 'text-amber-900',
        border: 'border-amber-200/80',
        icon: <Bookmark className="w-3 h-3 text-amber-700 fill-amber-700" />,
        defaultLabel: 'Saved',
      };
      break;
    case 'planning':
      config = {
        bg: 'bg-blue-50/80',
        text: 'text-blue-800',
        border: 'border-blue-200',
        icon: <Sparkles className="w-3 h-3 text-blue-600" />,
        defaultLabel: 'Planning',
      };
      break;
    case 'in-progress':
    case 'applying':
      config = {
        bg: 'bg-amber-50/80',
        text: 'text-amber-900',
        border: 'border-amber-200/90',
        icon: <Clock className="w-3 h-3 text-amber-700" />,
        defaultLabel: 'In Progress',
      };
      break;
    case 'submitted':
      config = {
        bg: 'bg-purple-50/80',
        text: 'text-purple-800',
        border: 'border-purple-200',
        icon: <Send className="w-3 h-3 text-purple-600" />,
        defaultLabel: 'Submitted',
      };
      break;
    case 'interview':
      config = {
        bg: 'bg-indigo-50/80',
        text: 'text-indigo-800',
        border: 'border-indigo-200',
        icon: <Mic className="w-3 h-3 text-indigo-600" />,
        defaultLabel: 'Interview Scheduled',
      };
      break;
    case 'awarded':
    case 'offer':
      config = {
        bg: 'bg-emerald-50/90',
        text: 'text-emerald-900',
        border: 'border-emerald-300',
        icon: <Award className="w-3.5 h-3.5 text-emerald-700" />,
        defaultLabel: 'Awarded / Offer',
      };
      break;
    case 'unsuccessful':
    case 'rejected':
      config = {
        bg: 'bg-rose-50/80',
        text: 'text-rose-800',
        border: 'border-rose-200',
        icon: <XCircle className="w-3 h-3 text-rose-500" />,
        defaultLabel: 'Unsuccessful',
      };
      break;
    case 'eligible':
      config = {
        bg: 'bg-emerald-50/90',
        text: 'text-emerald-900',
        border: 'border-emerald-300',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />,
        defaultLabel: 'Criteria Met',
      };
      break;
    case 'ineligible':
      config = {
        bg: 'bg-rose-50/80',
        text: 'text-rose-800',
        border: 'border-rose-200',
        icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
        defaultLabel: 'Criteria Unmet',
      };
      break;
    default:
      config = {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        icon: <AlertCircle className="w-3 h-3 text-slate-500" />,
        defaultLabel: status,
      };
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-sans font-semibold rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {config.icon}
      <span>{label || config.defaultLabel}</span>
    </span>
  );
}
