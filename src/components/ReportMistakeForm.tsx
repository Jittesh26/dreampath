'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reportMistake } from '@/app/actions/public';

export function ReportMistakeForm({ scholarshipId }: { scholarshipId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    formData.append('scholarshipId', scholarshipId);
    
    const result = await reportMistake(formData);
    
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="p-4 bg-green-50 text-green-900 rounded-md border border-green-200">
        <p className="font-semibold text-sm">Thank you for your report.</p>
        <p className="text-sm mt-1">Our team will verify this against the official sources.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs font-sans">
      <h4 className="font-bold text-slate-950 text-sm">See outdated information?</h4>
      <p className="text-xs text-slate-500 font-normal">Help us keep DreamPath trustworthy. Report discrepancies directly against official sources.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input 
          name="message" 
          placeholder="What's wrong? (e.g. Deadline changed to Aug 15)" 
          required 
          maxLength={500}
          disabled={loading}
          className="flex-1 bg-slate-50 border-slate-200 rounded-xl text-xs"
        />
        <Button 
          type="submit" 
          disabled={loading}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold px-4 py-2 cursor-pointer"
        >
          {loading ? 'Sending...' : 'Report Discrepancy'}
        </Button>
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </form>
  );
}
