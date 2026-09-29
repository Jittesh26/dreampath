'use client';

import React, { useState } from 'react';
import { Share2, Check, Copy, ExternalLink, X, ShieldAlert } from 'lucide-react';

interface ShareResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId: string;
  title: string;
}

export function ShareResumeModal({ isOpen, onClose, resumeId, title }: ShareResumeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/resume/share/${resumeId}`
    : `/resume/share/${resumeId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-amber-700" />
            <h3 className="font-serif text-lg font-bold text-[#0B1B3D]">
              Shareable Resume Link
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Anyone with this private link can view a clean, read-only version of <strong>&ldquo;{title}&rdquo;</strong>. Personal contact information remains protected.
        </p>

        {/* URL Box */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase block">Public Link:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono truncate"
            />
            <button
              onClick={copyToClipboard}
              className="px-3.5 py-2.5 bg-[#0B1B3D] text-white rounded-xl text-xs font-bold hover:bg-[#132A5C] transition-colors shrink-0 flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            You can revoke access anytime from your Privacy &amp; Data Settings. No passwords or authentication credentials are leaked.
          </span>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1"
          >
            <span>Preview Public View</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
