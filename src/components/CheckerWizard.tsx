'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { RequirementNode } from '@/domain/schema';
import { StudentProfile, SPMGrade } from '@/domain/registry';
import { extractRequiredFields } from '@/domain/astUtils';
import { evaluateEligibility, EvaluationResult } from '@/domain/evaluator';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface CheckerWizardProps {
  scholarshipId: string;
  scholarshipName: string;
  ruleAst: RequirementNode;
}

const SPM_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G'];

export function CheckerWizard({ scholarshipId, scholarshipName, ruleAst }: CheckerWizardProps) {
  const [profile, setProfile] = useState<Partial<StudentProfile>>({});
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract exactly what we need to ask
  const requiredFields = useMemo(() => extractRequiredFields(ruleAst), [ruleAst]);

  const handleTextChange = (field: keyof StudentProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof StudentProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value ? Number(value) : undefined }));
  };

  const handleBooleanChange = (field: keyof StudentProfile, value: string) => {
    if (!value) {
      setProfile((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
      return;
    }
    setProfile((prev) => ({ ...prev, [field]: value === 'true' }));
  };

  const handleSpmChange = (subject: string, grade: string) => {
    setProfile((prev) => ({
      ...prev,
      spm_results: {
        ...(prev.spm_results || {}),
        [subject]: grade as SPMGrade,
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Slight artificial delay to indicate processing (though engine is instant)
    setTimeout(() => {
      // Execute the deterministic pure TS engine
      const evalResult = evaluateEligibility(profile as StudentProfile, {
        id: scholarshipId,
        name: scholarshipName,
        rootNode: ruleAst,
      }, new Date());
      setResult(evalResult);
      setIsSubmitting(false);
    }, 400);
  };

  if (result) {
    return (
      <div className="space-y-6" aria-live="polite">
        {result.status === 'MET' && (
          <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-xl shadow-premium">
            <h2 className="font-instrument text-3xl font-bold text-emerald-900 flex items-center gap-3">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              Meets Listed Requirements
            </h2>
            <p className="mt-3 font-jakarta text-emerald-800 text-lg">Your profile matches all explicitly verified criteria for this scholarship.</p>
          </div>
        )}

        {result.status === 'NOT_MET' && (
          <div className="p-8 bg-red-50 border border-red-200 rounded-xl shadow-premium">
            <h2 className="font-instrument text-3xl font-bold text-red-900 flex items-center gap-3">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              Not Met
            </h2>
            <p className="mt-3 font-jakarta text-red-800 text-lg mb-6">You do not meet the following deterministic criteria:</p>
            <ul className="list-disc list-inside space-y-2 font-jakarta text-red-800 bg-white/60 p-5 rounded-lg border border-red-100">
              {result.reasons.map((r, idx) => (
                <li key={idx}><strong className="font-semibold">{r.field}:</strong> {r.message}</li>
              ))}
            </ul>
          </div>
        )}

        {result.status === 'MISSING_INFO' && (
          <div className="p-8 bg-amber-50 border border-amber-200 rounded-xl shadow-premium">
            <h2 className="font-instrument text-3xl font-bold text-amber-900 flex items-center gap-3">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              Needs Information
            </h2>
            <p className="mt-3 font-jakarta text-amber-800 text-lg mb-6">We cannot fully determine your eligibility. Please provide the missing fields:</p>
            <ul className="list-disc list-inside space-y-2 font-jakarta text-amber-800 bg-white/60 p-5 rounded-lg border border-amber-100">
              {result.reasons.map((r, idx) => (
                <li key={idx}><span className="font-semibold">{r.field?.replace('spm_results.', 'SPM ')}</span>: {r.message}</li>
              ))}
            </ul>
            <Button variant="outline" className="mt-8 border-amber-300 text-amber-900 hover:bg-amber-100 hover:text-amber-950 font-jakarta" onClick={() => setResult(null)}>
              Go Back and Update Info
            </Button>
          </div>
        )}

        <Card className="mt-10 bg-white border-slate-100 shadow-premium">
          <CardContent className="p-10 text-center space-y-5">
            <h3 className="font-instrument text-3xl font-bold text-primary">Want to save this result?</h3>
            <p className="font-jakarta text-slate-500 max-w-lg mx-auto text-lg leading-relaxed">
              Create a free DreamPath account to permanently save your profile, track your application progress, and get matched with more verified scholarships.
            </p>
            <Link href="/register">
              <Button size="lg" className="mt-6 font-bold text-base px-8">
                Create an Account to Save this Result
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto bg-white border-slate-100 shadow-premium">
      <CardHeader className="pb-8">
        <CardTitle className="font-instrument text-3xl text-primary">Eligibility Checker</CardTitle>
        <p className="font-jakarta text-slate-500 mt-2 text-lg">We only ask for the specific information required by {scholarshipName}. Leave fields blank if unknown.</p>
      </CardHeader>
      <CardContent>
        <form id="checker-form" onSubmit={handleSubmit} className="space-y-6">
          {requiredFields.map((field) => {
            // Render specific inputs based on the extracted field string
            if (field === 'citizenship') {
              return (
                <div key={field} className="space-y-2">
                  <label htmlFor={`input-${field}`} className="font-semibold text-sm">Citizenship</label>
                  <select 
                    id={`input-${field}`}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(e) => handleTextChange('citizenship', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Malaysian">Malaysian</option>
                    <option value="Permanent Resident">Permanent Resident</option>
                    <option value="Non-Malaysian">Non-Malaysian</option>
                  </select>
                </div>
              );
            }
            if (field === 'bumiputeraStatus' || field === 'bumiputera_status') {
              return (
                <div key={field} className="space-y-2">
                  <label htmlFor={`input-${field}`} className="font-semibold text-sm">Bumiputera Status</label>
                  <select 
                    id={`input-${field}`}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(e) => handleBooleanChange('bumiputera_status', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              );
            }
            if (field === 'incomeBand' || field === 'income_band') {
              return (
                <div key={field} className="space-y-2">
                  <label htmlFor={`input-${field}`} className="font-semibold text-sm">Household Income Band</label>
                  <select 
                    id={`input-${field}`}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(e) => handleTextChange('income_band', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="B40">B40 (Below RM4,850)</option>
                    <option value="M40">M40 (RM4,851 - RM10,959)</option>
                    <option value="T20">T20 (RM10,960 and above)</option>
                  </select>
                </div>
              );
            }
            if (field === 'cgpa') {
              return (
                <div key={field} className="space-y-2">
                  <label htmlFor={`input-${field}`} className="font-semibold text-sm">Current CGPA</label>
                  <Input 
                    id={`input-${field}`}
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="4.0" 
                    placeholder="e.g. 3.50" 
                    onChange={(e) => handleNumberChange('cgpa', e.target.value)}
                  />
                </div>
              );
            }
            if (field === 'age') {
              return (
                <div key={field} className="space-y-2">
                  <label htmlFor={`input-${field}`} className="font-semibold text-sm">Age</label>
                  <Input 
                    id={`input-${field}`}
                    type="number" 
                    min="1" 
                    max="100" 
                    placeholder="e.g. 18" 
                    onChange={(e) => handleNumberChange('age', e.target.value)}
                  />
                </div>
              );
            }
            if (field.startsWith('spm_results.')) {
              const subject = field.split('.')[1];
              return (
                <div key={field} className="space-y-2">
                  <label htmlFor={`input-${field}`} className="font-semibold text-sm">SPM Subject: {subject}</label>
                  <select 
                    id={`input-${field}`}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(e) => handleSpmChange(subject, e.target.value)}
                  >
                    <option value="">Select Grade...</option>
                    {SPM_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              );
            }

            // Fallback for unknown fields
            return (
              <div key={field} className="space-y-2">
                <label htmlFor={`input-${field}`} className="font-semibold text-sm capitalize">{field.replace('_', ' ')}</label>
                <Input 
                  id={`input-${field}`}
                  onChange={(e) => handleTextChange(field as any, e.target.value)} 
                  placeholder={`Enter ${field}`} 
                />
              </div>
            );
          })}
        </form>
      </CardContent>
      <CardFooter className="bg-slate-50/50 pt-6 pb-6 border-t border-slate-100 rounded-b-xl">
        <Button type="submit" form="checker-form" size="lg" className="w-full font-bold text-base h-12" disabled={isSubmitting}>
          {isSubmitting ? 'Verifying strictly against official rules...' : 'Check Eligibility'}
        </Button>
      </CardFooter>
    </Card>
  );
}
