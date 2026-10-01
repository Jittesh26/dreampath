'use client';

import { useState } from 'react';
import { exportUserData, deleteAccount } from '@/app/actions/privacy';
import { Download, ShieldCheck, AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';

export function PrivacyControls() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);
    try {
      const dataStr = await exportUserData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dreampath_student_archive_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 5000);
    } catch (err) {
      console.error(err);
      alert('Failed to export student data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (
      confirm(
        'Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently wipe your profile, application history, and interview records.'
      )
    ) {
      setIsDeleting(true);
      try {
        await deleteAccount();
      } catch (err) {
        console.error(err);
        alert('Failed to delete account. Please try again or contact support.');
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Guarantees */}
      <div className="p-6 border border-slate-200/90 rounded-2xl bg-white shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200/60 shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h3 className="font-sans text-base font-bold text-slate-900">
              Privacy &amp; Data Ethics Commitments
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              DreamPath operates on strict zero-telemetry and data-minimization principles under Malaysia’s Personal Data Protection Act (PDPA 2010). Your grades, household income band, and resume contents are never sold to commercial lead brokers or external advertisers.
            </p>
          </div>
        </div>
      </div>

      {/* Data Portability */}
      <div className="p-6 border border-slate-200/90 rounded-2xl bg-white shadow-2xs space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-200/60 shrink-0">
            <Download className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h3 className="font-sans text-base font-bold text-slate-900">
              Authoritative Data Portability
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">
              Exercise your data portability right. Download a structured machine-readable JSON archive of your verified student profile, tracked scholarships, application stages, and saved interview notes.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2.5 text-xs font-bold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 rounded-xl shadow-2xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExporting ? 'Generating JSON Archive...' : 'Export Student Data (.json)'}</span>
          </button>

          {exportComplete && (
            <span className="text-xs text-emerald-700 flex items-center gap-1.5 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Download ready
            </span>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 border border-rose-200/80 rounded-2xl bg-rose-50/40 shadow-2xs space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="font-sans text-base font-bold text-rose-950">
              Permanent Account Deletion
            </h3>
            <p className="text-xs text-rose-800/90 mt-1 leading-relaxed font-normal">
              Irrevocably erase your student identity, verified profile, uploaded transcripts, saved scholarships, and application milestones. This cannot be recovered.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Erasing Account Records...' : 'Delete Account Permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
