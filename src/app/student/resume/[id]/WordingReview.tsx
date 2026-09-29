'use client';

import { useState, useEffect, useCallback } from 'react';
import { getConfirmedFacts, generateWordingForSingleFact } from '@/app/actions/ai-interview';
import { GeneratedWording } from '@/domain/ai-interview';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ConfirmedFact {
  id: string;
  category: string;
  source: string;
  originalAnswer: string | null;
  content: unknown;
  isConfirmed: boolean;
  createdAt: Date;
}

export interface ProposalItem {
  factId: string;
  category: string;
  fact: ConfirmedFact;
  wording: GeneratedWording;
  status: 'pending' | 'accepted' | 'edited' | 'original';
  isRegenerating: boolean;
  isEditing: boolean;
  editedText: string;
  error?: string | null;
}

/**
 * Extracts a human-friendly editable phrasing string from a GeneratedWording object
 * based on its section (description + achievements or notes).
 */
function extractPhrasing(category: string, wording: GeneratedWording): string {
  switch (category) {
    case 'project': {
      const proj = wording.projects?.[0];
      if (!proj) return '';
      const parts = [proj.description || '', ...(proj.achievements || [])].filter(Boolean);
      return parts.join('\n• ');
    }
    case 'experience': {
      const exp = wording.experience?.[0];
      if (!exp) return '';
      const parts = [exp.description || '', ...(exp.achievements || [])].filter(Boolean);
      return parts.join('\n• ');
    }
    case 'education': {
      const edu = wording.education?.[0];
      if (!edu) return '';
      return `${edu.qualification} at ${edu.institution}${edu.cgpa ? ` (CGPA: ${edu.cgpa})` : ''}`;
    }
    case 'skills': {
      const s = wording.skills;
      if (!s) return '';
      const all = [...(s.technical || []), ...(s.soft || []), ...(s.languages || [])];
      return all.join(', ');
    }
    case 'leadership': {
      const lead = wording.leadership?.[0];
      if (!lead) return '';
      const parts = [lead.role ? `${lead.role} at ${lead.organization}` : '', lead.description || ''].filter(Boolean);
      return parts.join('\n• ');
    }
    case 'volunteering': {
      const vol = wording.volunteering?.[0];
      if (!vol) return '';
      const parts = [vol.role ? `${vol.role} at ${vol.organization}` : '', vol.description || ''].filter(Boolean);
      return parts.join('\n• ');
    }
    case 'certifications': {
      const cert = wording.certifications?.[0];
      return cert ? `${cert.name} (Issued by ${cert.issuer})` : '';
    }
    case 'awards': {
      const aw = wording.awards?.[0];
      return aw ? `${aw.name} (Issued by ${aw.issuer})` : '';
    }
    default:
      return JSON.stringify(wording, null, 2);
  }
}

/**
 * Updates a GeneratedWording object with student-customized phrasing
 */
function applyCustomPhrasing(category: string, wording: GeneratedWording, customText: string): GeneratedWording {
  const cloned: GeneratedWording = JSON.parse(JSON.stringify(wording));
  const lines = customText.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);

  switch (category) {
    case 'project': {
      if (!cloned.projects || cloned.projects.length === 0) {
        cloned.projects = [{ id: crypto.randomUUID(), name: 'Project' }];
      }
      if (cloned.projects[0]) {
        cloned.projects[0].description = lines[0] || customText;
        cloned.projects[0].achievements = lines.length > 1 ? lines.slice(1) : (lines[0] ? [lines[0]] : []);
      }
      break;
    }
    case 'experience': {
      if (!cloned.experience || cloned.experience.length === 0) {
        cloned.experience = [{ id: crypto.randomUUID(), employer: 'Company', position: 'Role', isCurrent: false }];
      }
      if (cloned.experience[0]) {
        cloned.experience[0].description = lines[0] || customText;
        cloned.experience[0].achievements = lines.length > 1 ? lines.slice(1) : (lines[0] ? [lines[0]] : []);
      }
      break;
    }
    case 'skills': {
      const skillsList = customText.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      cloned.skills = {
        ...(cloned.skills || {}),
        technical: skillsList
      };
      break;
    }
    default:
      break;
  }
  return cloned;
}

/**
 * Builds a wording proposal using the student's raw verified text (Keep Original)
 */
function buildOriginalProposal(fact: ConfirmedFact): GeneratedWording {
  const rawText = fact.originalAnswer || '';
  const contentObj = (fact.content && typeof fact.content === 'object') ? (fact.content as Record<string, unknown>) : {};
  const innerData = (contentObj.data && typeof contentObj.data === 'object') ? (contentObj.data as Record<string, unknown>) : contentObj;

  switch (fact.category) {
    case 'project':
      return {
        projects: [{
          id: crypto.randomUUID(),
          name: typeof innerData.name === 'string' ? innerData.name : 'Project',
          description: rawText,
          achievements: rawText ? [rawText] : []
        }]
      };
    case 'experience':
      return {
        experience: [{
          id: crypto.randomUUID(),
          employer: typeof innerData.employer === 'string' ? innerData.employer : 'Employer',
          position: typeof innerData.position === 'string' ? innerData.position : 'Role',
          isCurrent: false,
          description: rawText,
          achievements: rawText ? [rawText] : []
        }]
      };
    case 'education':
      return {
        education: [{
          id: crypto.randomUUID(),
          institution: typeof innerData.institution === 'string' ? innerData.institution : 'Institution',
          qualification: typeof innerData.qualification === 'string' ? innerData.qualification : (rawText.slice(0, 50) || 'Degree'),
          educationLevel: (innerData.educationLevel as 'SPM' | 'STPM' | 'Foundation' | 'Diploma' | 'Bachelor' | 'Master' | 'PhD' | 'Other') || 'Other',
          cgpa: typeof innerData.cgpa === 'string' ? innerData.cgpa : undefined
        }]
      };
    case 'skills': {
      const list = rawText.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      return {
        skills: {
          technical: list.length > 0 ? list : ['Skills']
        }
      };
    }
    default:
      return {};
  }
}

export default function WordingReview({
  onApplyProposal,
  onClose,
  onBackToInterview
}: {
  onApplyProposal: (wording: GeneratedWording) => void;
  onClose?: () => void;
  onBackToInterview?: () => void;
}) {
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Load confirmed facts and generate initial proposals
  const loadProposals = useCallback(async () => {
    setIsLoading(true);
    setGeneralError(null);
    try {
      const confirmedFactsRaw = await getConfirmedFacts();
      const facts = confirmedFactsRaw as unknown as ConfirmedFact[];

      if (facts.length === 0) {
        setProposals([]);
        setIsLoading(false);
        return;
      }

      // Generate proposals safely for each confirmed fact
      const items = await Promise.all(
        facts.map(async (fact): Promise<ProposalItem> => {
          try {
            const wording = await generateWordingForSingleFact(fact.id);
            const phrasing = extractPhrasing(fact.category, wording);
            return {
              factId: fact.id,
              category: fact.category,
              fact,
              wording,
              status: 'pending',
              isRegenerating: false,
              isEditing: false,
              editedText: phrasing
            };
          } catch {
            // Fallback to raw original text if AI single generation fails
            const originalWording = buildOriginalProposal(fact);
            return {
              factId: fact.id,
              category: fact.category,
              fact,
              wording: originalWording,
              status: 'original',
              isRegenerating: false,
              isEditing: false,
              editedText: fact.originalAnswer || '',
              error: 'AI wording temporarily unavailable; showing raw verified text.'
            };
          }
        })
      );

      setProposals(items);
    } catch {
      setGeneralError('Failed to load confirmed facts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadProposals is async; state updates occur after await
    void loadProposals();
  }, [loadProposals]);

  // Action 1: Accept single proposal -> commits to working resume state
  const handleAccept = (factId: string) => {
    const item = proposals.find(p => p.factId === factId);
    if (!item) return;

    // Apply the active wording to the editor state
    onApplyProposal(item.wording);

    setProposals(prev =>
      prev.map(p => (p.factId === factId ? { ...p, status: 'accepted', isEditing: false } : p))
    );
  };

  // Action 2: Regenerate phrasing for single confirmed fact
  const handleRegenerate = async (factId: string) => {
    setProposals(prev =>
      prev.map(p => (p.factId === factId ? { ...p, isRegenerating: true, error: null } : p))
    );

    try {
      const freshWording = await generateWordingForSingleFact(factId);
      const item = proposals.find(p => p.factId === factId);
      const newPhrasing = item ? extractPhrasing(item.category, freshWording) : '';

      setProposals(prev =>
        prev.map(p =>
          p.factId === factId
            ? {
                ...p,
                wording: freshWording,
                editedText: newPhrasing,
                status: 'pending',
                isRegenerating: false,
                isEditing: false,
                error: null
              }
            : p
        )
      );
    } catch {
      setProposals(prev =>
        prev.map(p =>
          p.factId === factId
            ? { ...p, isRegenerating: false, error: 'Regeneration failed. You can keep original or edit manually.' }
            : p
        )
      );
    }
  };

  // Action 3: Keep Original -> Bypasses AI polish, uses student's raw verified text
  const handleKeepOriginal = (factId: string) => {
    setProposals(prev =>
      prev.map(p => {
        if (p.factId !== factId) return p;
        const originalWording = buildOriginalProposal(p.fact);
        const originalPhrasing = p.fact.originalAnswer || extractPhrasing(p.category, originalWording);
        return {
          ...p,
          wording: originalWording,
          editedText: originalPhrasing,
          status: 'original',
          isEditing: false,
          error: null
        };
      })
    );
  };

  // Action 4: Toggle inline edit & save inline edits
  const toggleInlineEdit = (factId: string) => {
    setProposals(prev =>
      prev.map(p => (p.factId === factId ? { ...p, isEditing: !p.isEditing } : p))
    );
  };

  const handleSaveInlineEdit = (factId: string) => {
    setProposals(prev =>
      prev.map(p => {
        if (p.factId !== factId) return p;
        const updatedWording = applyCustomPhrasing(p.category, p.wording, p.editedText);
        return {
          ...p,
          wording: updatedWording,
          status: 'edited',
          isEditing: false
        };
      })
    );
  };

  // Accept All proposals at once
  const handleAcceptAll = () => {
    proposals.forEach(p => {
      onApplyProposal(p.wording);
    });
    setProposals(prev => prev.map(p => ({ ...p, status: 'accepted', isEditing: false })));
  };

  const acceptedCount = proposals.filter(p => p.status === 'accepted').length;

  return (
    <div className="flex flex-col h-full bg-[#FAFAF9] overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary">
              Professional Wording Review
            </h2>
            <Badge variant="secondary" className="text-xs">
              {proposals.length} Confirmed Facts
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-sans">
            Review, edit, regenerate, or keep raw text for each confirmed fact before committing to your resume.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onBackToInterview && (
            <Button variant="outline" size="sm" onClick={onBackToInterview}>
              &larr; Back to Interview
            </Button>
          )}
          {proposals.length > 0 && (
            <Button
              size="sm"
              onClick={handleAcceptAll}
              disabled={acceptedCount === proposals.length}
              className="bg-[#0B1B3D] text-[#FAFAF9] hover:bg-[#0B1B3D]/90 shadow-sm"
            >
              {acceptedCount === proposals.length ? '✓ All Accepted' : `Accept All (${proposals.length})`}
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-600">Generating professional phrasing for confirmed facts...</p>
          </div>
        )}

        {!isLoading && generalError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {generalError}
          </div>
        )}

        {!isLoading && proposals.length === 0 && !generalError && (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8">
            <span className="text-3xl mb-2 block">📋</span>
            <h3 className="text-lg font-serif font-bold text-primary mb-1">No Confirmed Facts Yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
              Complete questions in the AI Interview and confirm your facts first. Only verified facts can be converted into professional wording.
            </p>
            {onBackToInterview && (
              <Button onClick={onBackToInterview} className="bg-[#0B1B3D] text-[#FAFAF9]">
                Start AI Interview
              </Button>
            )}
          </div>
        )}

        {!isLoading && proposals.map(p => (
          <Card key={p.factId} className="shadow-sm border-slate-200 bg-white p-5 space-y-4">
            {/* Proposal Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize text-xs font-semibold px-2.5 py-1">
                  {p.category}
                </Badge>
                <span className="text-xs text-slate-400">ID: {p.factId.slice(0, 8)}</span>
              </div>

              <div>
                {p.status === 'accepted' && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                    ✓ Added to Working Resume
                  </Badge>
                )}
                {p.status === 'edited' && (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-medium">
                    ✏️ Customized Phrasing
                  </Badge>
                )}
                {p.status === 'original' && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                    📄 Raw Student Text
                  </Badge>
                )}
                {p.status === 'pending' && (
                  <Badge variant="secondary" className="text-slate-500">
                    Awaiting Review
                  </Badge>
                )}
              </div>
            </div>

            {p.error && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                {p.error}
              </div>
            )}

            {/* Side-by-Side Comparative Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Verified Fact (Provenance) */}
              <div className="rounded-lg border border-slate-200 bg-[#FAFAF9] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    <span>🔒</span> Verified Student Fact (Source of Truth)
                  </div>

                  <div className="mb-3">
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                      Student&apos;s Exact Statement:
                    </span>
                    <p className="text-sm text-slate-800 italic font-serif bg-white p-3 rounded-md border border-slate-200/80">
                      &quot;{p.fact.originalAnswer || 'No direct statement recorded'}&quot;
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                      Confirmed Data Record:
                    </span>
                    <pre className="text-xs text-slate-700 font-mono bg-white p-2.5 rounded-md border border-slate-200/80 whitespace-pre-wrap max-h-36 overflow-y-auto">
                      {JSON.stringify(p.fact.content, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/70 text-[11px] text-slate-400">
                  Provenance Verified &bull; Not modifiable by AI
                </div>
              </div>

              {/* Right Column: AI Proposed Wording / Edited Phrasing */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1.5">
                      <span>✨</span> Proposed Resume Phrasing
                    </span>
                    {p.isRegenerating && (
                      <span className="text-indigo-600 text-xs font-normal animate-pulse">
                        Regenerating...
                      </span>
                    )}
                  </div>

                  {p.isEditing ? (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Adjust phrasing in textarea:
                      </label>
                      <textarea
                        value={p.editedText}
                        onChange={e => {
                          const val = e.target.value;
                          setProposals(prev =>
                            prev.map(item => (item.factId === p.factId ? { ...item, editedText: val } : item))
                          );
                        }}
                        className="w-full h-40 rounded-lg border border-slate-300 p-3 text-sm font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 bg-[#FAFAF9] resize-y"
                        placeholder="Type custom phrasing or bullet points..."
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => toggleInlineEdit(p.factId)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveInlineEdit(p.factId)}
                          className="bg-[#0B1B3D] text-[#FAFAF9]"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#FAFAF9] p-3.5 rounded-md border border-slate-200 min-h-[140px] space-y-2">
                      <div className="text-sm text-slate-900 font-medium whitespace-pre-wrap">
                        {p.editedText || extractPhrasing(p.category, p.wording) || 'No wording available'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    Status: {p.status === 'accepted' ? 'Committed to Working Resume' : 'Proposal Ready'}
                  </span>
                  <span>AI Polish Boundary</span>
                </div>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRegenerate(p.factId)}
                  disabled={p.isRegenerating}
                  className="text-xs"
                >
                  <span>🔄 Regenerate</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleInlineEdit(p.factId)}
                  className="text-xs"
                >
                  <span>✏️ {p.isEditing ? 'Cancel Edit' : 'Inline Edit'}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleKeepOriginal(p.factId)}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  <span>↩️ Keep Original</span>
                </Button>
              </div>

              <div>
                <Button
                  size="sm"
                  onClick={() => handleAccept(p.factId)}
                  className={
                    p.status === 'accepted'
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'bg-[#0B1B3D] text-[#FAFAF9] hover:bg-[#0B1B3D]/90'
                  }
                >
                  {p.status === 'accepted' ? '✓ Re-commit to Resume' : 'Accept & Add to Resume'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
