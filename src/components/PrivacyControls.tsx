'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { exportUserData, deleteAccount } from '@/app/actions/privacy';

export function PrivacyControls() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dataStr = await exportUserData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dreampath_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently wipe your profile and application history.")) {
      setIsDeleting(true);
      await deleteAccount();
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="p-6 border border-slate-100 rounded-xl bg-white shadow-premium">
        <h3 className="font-instrument text-2xl font-bold text-primary">Data Portability</h3>
        <p className="font-jakarta text-slate-500 mt-2 mb-6 text-lg">
          Download a complete copy of your profile and application history in JSON format.
        </p>
        <Button variant="outline" onClick={handleExport} disabled={isExporting} className="font-bold">
          {isExporting ? 'Exporting...' : 'Export My Data'}
        </Button>
      </div>

      <div className="p-6 border border-red-200 rounded-xl bg-red-50 shadow-premium">
        <h3 className="font-instrument text-2xl font-bold text-red-900">Danger Zone</h3>
        <p className="text-sm text-destructive/80 mt-1 mb-4">
          Permanently delete your DreamPath account and all associated data.
        </p>
        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete Account'}
        </Button>
      </div>
    </div>
  );
}
