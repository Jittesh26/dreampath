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
      <div className="p-6 border border-slate-200/90 rounded-xl bg-white shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200/60 shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-[#0B1B3D]">
              Privacy &amp; Data Ethics Commitments
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              DreamPath operates on strict zero-telemetry and data-minimization principles under Malaysia’s Personal Data Protection Act (PDPA 2010). Your grades, household income band, and resume contents are never sold to commercial lead brokers or external advertisers.
            </p>
          </div>
        </div>
      </div>

      {/* Data Portability */}
      <div className="p-6 border border-slate-200/90 rounded-xl bg-white shadow-xs space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-900 rounded-lg border border-amber-200/60 shrink-0">
            <Download className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#0B1B3D]">
              Authoritative Data Portability
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Exercise your data portability right. Download a structured machine-readable JSON archive of your verified student profile, tracked scholarships, application stages, and saved interview notes.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExporting ? 'Generating JSON Archive...' : 'Export Student Data (.json)'}</span>
          </button>

          {exportComplete && (
            <span className="text-xs text-emerald-700 flex items-center gap-1.5 font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Download ready
            </span>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 border border-red-200/80 rounded-xl bg-red-50/50 shadow-xs space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-red-100 text-red-800 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-red-950">
              Permanent Account Deletion
            </h3>
            <p className="text-xs text-red-800/90 mt-0.5 leading-relaxed">
              Irrevocably erase your student identity, verified profile, uploaded transcripts, saved scholarships, and application milestones. This cannot be recovered.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Erasing Account Records...' : 'Delete Account Permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
