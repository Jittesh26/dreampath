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
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-card border border-border rounded-lg">
      <h4 className="font-bold text-foreground">See outdated information?</h4>
      <p className="text-sm text-muted-foreground">Help us keep DreamPath trustworthy. Report any discrepancies.</p>
      <div className="flex gap-2">
        <Input 
          name="message" 
          placeholder="What's wrong? (e.g. Deadline changed to Aug 15)" 
          required 
          maxLength={500}
          disabled={loading}
          className="flex-1 bg-background"
        />
        <Button type="submit" variant="secondary" disabled={loading}>
          {loading ? 'Sending...' : 'Report'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
