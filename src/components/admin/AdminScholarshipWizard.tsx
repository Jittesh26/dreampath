'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  Loader2,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  createCompleteScholarship,
  ingestOfficialScholarshipUrl,
  CompleteScholarshipInput,
} from '@/app/actions/admin';
import { ScholarshipDetailView } from '@/components/scholarships/ScholarshipDetailView';
import { RequirementNode, SelectionStage } from '@/domain/schema';

interface ProviderOption {
  id: string;
  name: string;
  url?: string | null;
  description?: string | null;
}

export function AdminScholarshipWizard({
  existingProviders,
}: {
  existingProviders: ProviderOption[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'manual' | 'url_import'>('url_import');

  // URL Ingestion State
  const [ingestUrl, setIngestUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestError, setIngestError] = useState('');
  const [ingestConfidenceNotes, setIngestConfidenceNotes] = useState<Record<string, string>>({});

  // Core Form State
  const [providerMode, setProviderMode] = useState<'existing' | 'new'>('existing');
  const [providerId, setProviderId] = useState(existingProviders[0]?.id || '');
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderUrl, setNewProviderUrl] = useState('');
  const [newProviderDesc, setNewProviderDesc] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [openDate, setOpenDate] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');

  // Structured Deterministic Eligibility Criteria State
  const [criteria, setCriteria] = useState<
    Array<{
      id: string;
      name: string;
      field: string;
      operator: string;
      value: string | number;
      verificationType: 'automated_check' | 'manual_verification';
    }>
  >([
    {
      id: 'crit_1',
      name: 'Malaysian Citizenship',
      field: 'citizenship',
      operator: 'EQUALS',
      value: 'Malaysian',
      verificationType: 'automated_check',
    },
    {
      id: 'crit_2',
      name: 'Minimum Academic CGPA',
      field: 'cgpa',
      operator: 'GREATER_THAN_OR_EQUAL',
      value: '3.50',
      verificationType: 'automated_check',
    },
  ]);

  // Selection Stages State
  const [stages, setStages] = useState<SelectionStage[]>([
    {
      id: 'stage_1',
      name: 'Document Verification',
      type: 'review',
      description: 'Verification of academic transcripts, identity, and EA income documentation.',
    },
    {
      id: 'stage_2',
      name: 'Online Cognitive Assessment',
      type: 'assessment_centre',
      description: 'Standardized problem-solving and situational leadership assessment.',
    },
    {
      id: 'stage_3',
      name: 'Final Selection Board Interview',
      type: 'panel_interview',
      description: 'Panel evaluation with foundation executives and academic mentors.',
    },
  ]);

  // Preview Mode State
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Ingest URL handler
  const handleIngestUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestUrl.trim()) return;

    setIsIngesting(true);
    setIngestError('');

    try {
      const draft = await ingestOfficialScholarshipUrl(ingestUrl.trim());

      // Auto-fill form fields
      if (draft.name.value) setName(draft.name.value);
      if (draft.description.value) setDescription(draft.description.value);
      if (draft.year.value) setYear(draft.year.value);
      if (draft.openDate.value) setOpenDate(draft.openDate.value);
      if (draft.closeDate.value) setCloseDate(draft.closeDate.value);
      if (draft.sourceUrl) setSourceUrl(draft.sourceUrl);
      if (draft.evidenceNotes.value) setEvidenceNotes(draft.evidenceNotes.value);

      // Handle Provider matching or new
      const matchedProvider = existingProviders.find(
        (p) => p.name.toLowerCase() === draft.providerName.value.toLowerCase()
      );
      if (matchedProvider) {
        setProviderMode('existing');
        setProviderId(matchedProvider.id);
      } else if (draft.providerName.value) {
        setProviderMode('new');
        setNewProviderName(draft.providerName.value);
        setNewProviderUrl(draft.providerUrl.value || draft.sourceUrl);
        setNewProviderDesc(draft.providerDescription.value || '');
      }

      // Convert AST to form criteria
      if (draft.eligibilityAst && 'nodes' in draft.eligibilityAst && Array.isArray((draft.eligibilityAst as any).nodes)) {
        const flattened = (draft.eligibilityAst as any).nodes.map((c: any, i: number) => ({
          id: `crit_ext_${i + 1}`,
          name: c.field ? `Check ${c.field}` : 'Eligibility Criterion',
          field: c.field || 'qualification',
          operator: c.operator || 'EQUALS',
          value: c.value !== undefined ? c.value : '',
          verificationType: 'automated_check' as const,
        }));
        if (flattened.length > 0) setCriteria(flattened);
      }

      if (draft.selectionStages && draft.selectionStages.length > 0) {
        setStages(draft.selectionStages);
      }

      // Notes
      const notes: Record<string, string> = {};
      if (draft.openDate.notes) notes.openDate = draft.openDate.notes;
      if (draft.closeDate.notes) notes.closeDate = draft.closeDate.notes;
      setIngestConfidenceNotes(notes);

      // Switch to manual review mode
      setActiveTab('manual');
    } catch (err: any) {
      setIngestError(err.message || 'Failed to ingest URL.');
    } finally {
      setIsIngesting(false);
    }
  };

  // Add / Remove Criteria
  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        id: `crit_${Date.now()}`,
        name: 'New Requirement',
        field: 'qualification',
        operator: 'EQUALS',
        value: '',
        verificationType: 'automated_check',
      },
    ]);
  };

  const removeCriterion = (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  // Add / Remove Selection Stage
  const addStage = () => {
    setStages((prev) => [
      ...prev,
      {
        id: `stage_${Date.now()}`,
        name: 'New Selection Stage',
        type: 'interview',
        description: 'Post-application review stage.',
      },
    ]);
  };

  const removeStage = (id: string) => {
    setStages((prev) => prev.filter((s) => s.id !== id));
  };

  // Build the Composite AST from the visual criteria matching canonical RequirementNode schema
  const buildCompositeAst = (): RequirementNode => {
    const nodes: RequirementNode[] = criteria.map((c) => ({
      type: 'CONDITION',
      field: c.field,
      operator: c.operator as any,
      value: c.operator === 'GREATER_THAN_OR_EQUAL' || c.operator === 'LESS_THAN_OR_EQUAL'
        ? (isNaN(Number(c.value)) ? c.value : Number(c.value))
        : c.value,
    }));

    return {
      type: 'ALL',
      nodes: nodes.length > 0 ? nodes : [
        {
          type: 'CONDITION',
          field: 'citizenship',
          operator: 'EQUALS',
          value: 'Malaysian',
        },
      ],
    };
  };

  // Save handler (Draft or Publish)
  const handleSubmit = async (publishImmediately: boolean) => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload: CompleteScholarshipInput = {
        name,
        description,
        year: Number(year) || new Date().getFullYear(),
        openDate: openDate || undefined,
        closeDate: closeDate || undefined,
        sourceUrl,
        evidenceNotes: evidenceNotes || `Authoritative source: ${sourceUrl}`,
        ruleAst: buildCompositeAst(),
        selectionStages: stages,
        publishImmediately,
      };

      if (providerMode === 'existing') {
        payload.providerId = providerId;
      } else {
        payload.newProvider = {
          name: newProviderName,
          url: newProviderUrl,
          description: newProviderDesc,
        };
      }

      await createCompleteScholarship(payload);
      router.push('/admin/scholarships');
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred while saving the scholarship.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute selected provider info for preview
  const selectedProviderName =
    providerMode === 'existing'
      ? existingProviders.find((p) => p.id === providerId)?.name || 'Selected Provider'
      : newProviderName || 'New Provider';
  const selectedProviderDesc =
    providerMode === 'existing'
      ? existingProviders.find((p) => p.id === providerId)?.description || 'Official Malaysian sponsor.'
      : newProviderDesc || 'Official Malaysian sponsor.';
  const selectedProviderUrl =
    providerMode === 'existing'
      ? existingProviders.find((p) => p.id === providerId)?.url || ''
      : newProviderUrl || '';

  const formattedOpenDate = openDate
    ? new Date(openDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBA';
  const formattedCloseDate = closeDate
    ? new Date(closeDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'TBA';

  const previewRequirements = [
    {
      id: 'req_preview',
      name: `${name || 'Scholarship'} Eligibility Requirements`,
      ruleAst: buildCompositeAst(),
      selectionStages: stages,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl pb-16 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/scholarships"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Scholarships
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 font-sans">
            Add New <span className="font-serif italic font-normal text-blue-900">Scholarship</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Create an authoritative scholarship record identical to the existing DreamPath standard.
          </p>
        </div>

        {/* View / Preview Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !isPreviewMode
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            Editor Form
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewMode(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isPreviewMode
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-blue-700 hover:bg-blue-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Student Preview</span>
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      {!isPreviewMode && (
        <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('url_import')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'url_import'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AI-Assisted Import from Official URL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'manual'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Manual Structured Entry</span>
          </button>
        </div>
      )}

      {/* URL INGESTION TAB */}
      {!isPreviewMode && activeTab === 'url_import' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Import from Official Provider Portal</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Paste the URL of an official Malaysian scholarship announcement or circular. DreamPath will safely retrieve the text, extract draft fields, and pre-fill the review form.
              </p>
            </div>
          </div>

          <form onSubmit={handleIngestUrl} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Portal URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={ingestUrl}
                  onChange={(e) => setIngestUrl(e.target.value)}
                  placeholder="https://example-foundation.org.my/scholarships/2026-application-guidelines"
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-mono"
                />
                <button
                  type="submit"
                  disabled={isIngesting || !ingestUrl.trim()}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-xs shrink-0"
                >
                  {isIngesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
                  <span>{isIngesting ? 'Fetching & Parsing...' : 'Extract Draft'}</span>
                </button>
              </div>
            </div>

            {ingestError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{ingestError}</span>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-blue-700" />
                SSRF-Protected &amp; Human-Verified Workflow
              </span>
              <p>
                The URL is verified against private IP address barriers and fetched safely. Extracted information is <strong>never published automatically</strong>; it acts purely as a draft for human administrator verification.
              </p>
            </div>
          </form>
        </div>
      )}

      {/* PREVIEW MODE: RENDERS REAL STUDENT COMPONENT */}
      {isPreviewMode && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="font-semibold text-blue-950">
                Live Student Preview — This is exactly how the scholarship will render on DreamPath.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                Verify &amp; Publish
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
            <ScholarshipDetailView
              id="preview-id"
              name={name || 'Draft Scholarship Title'}
              providerName={selectedProviderName}
              providerDesc={selectedProviderDesc}
              providerUrl={selectedProviderUrl}
              description={description || 'Scholarship overview and discipline information.'}
              openDate={formattedOpenDate}
              closeDate={formattedCloseDate}
              status="published"
              year={Number(year) || new Date().getFullYear()}
              verificationDate="Today"
              sourceUrl={sourceUrl}
              evidenceNotes={evidenceNotes || `Verified official circular: ${sourceUrl}`}
              requirements={previewRequirements}
              similarScholarships={[]}
            />
          </div>
        </div>
      )}

      {/* MANUAL EDITOR FORM */}
      {!isPreviewMode && activeTab === 'manual' && (
        <div className="space-y-6">
          {submitError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Section 1: Provider & Basic Identity */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Provider &amp; Basic Identity
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="providerMode"
                    checked={providerMode === 'existing'}
                    onChange={() => setProviderMode('existing')}
                  />
                  <span>Select Existing Provider</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="radio"
                    name="providerMode"
                    checked={providerMode === 'new'}
                    onChange={() => setProviderMode('new')}
                  />
                  <span>Register New Provider</span>
                </label>
              </div>

              {providerMode === 'existing' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Verified Provider</label>
                  <select
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  >
                    {existingProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">New Provider Name</label>
                    <input
                      required
                      value={newProviderName}
                      onChange={(e) => setNewProviderName(e.target.value)}
                      placeholder="e.g. Yayasan Bursa Malaysia"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official Website URL</label>
                    <input
                      type="url"
                      value={newProviderUrl}
                      onChange={(e) => setNewProviderUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Provider Mandate / Description</label>
                    <input
                      value={newProviderDesc}
                      onChange={(e) => setNewProviderDesc(e.target.value)}
                      placeholder="Official foundation supporting capital market education..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-normal focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Scholarship Title</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bursa Malaysia Undergraduate Scholarship 2026"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Program Overview, Financial Package &amp; Disciplines
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Full description covering tuition waiver, monthly stipend, target fields of study (e.g. Computer Science, Finance, Law), and bond obligations..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-normal focus:outline-none focus:ring-2 focus:ring-blue-600/20 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Intake Dates & Cohort */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Intake Cycle &amp; Deadlines
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cohort Year</label>
                <input
                  type="number"
                  required
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Opening Date</label>
                <input
                  type="date"
                  value={openDate}
                  onChange={(e) => setOpenDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
                {ingestConfidenceNotes.openDate && (
                  <span className="text-[10px] text-amber-700 mt-1 block">
                    {ingestConfidenceNotes.openDate}
                  </span>
                )}
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Closing Deadline</label>
                <input
                  type="date"
                  value={closeDate}
                  onChange={(e) => setCloseDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
                {ingestConfidenceNotes.closeDate && (
                  <span className="text-[10px] text-amber-700 mt-1 block">
                    {ingestConfidenceNotes.closeDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Deterministic Eligibility Criteria */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  3. Deterministic Eligibility Rules
                </h2>
              </div>
              <button
                type="button"
                onClick={addCriterion}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Criterion</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 font-normal">
              Rules evaluated deterministically by the student Eligibility Checker. Answers <em>&ldquo;Am I eligible to apply?&rdquo;</em> only.
            </p>

            <div className="space-y-3">
              {criteria.map((crit, idx) => (
                <div
                  key={crit.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
                >
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Criterion Name</label>
                    <input
                      value={crit.name}
                      onChange={(e) => {
                        const updated = [...criteria];
                        updated[idx].name = e.target.value;
                        setCriteria(updated);
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Target Field</label>
                    <select
                      value={crit.field}
                      onChange={(e) => {
                        const updated = [...criteria];
                        updated[idx].field = e.target.value;
                        setCriteria(updated);
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold"
                    >
                      <option value="citizenship">citizenship (e.g. Malaysian)</option>
                      <option value="cgpa">cgpa (minimum CGPA)</option>
                      <option value="incomeBand">incomeBand (B40, M40, T20)</option>
                      <option value="householdIncome">householdIncome (max RM)</option>
                      <option value="age">age (maximum age)</option>
                      <option value="qualification">qualification (SPM, STPM, Degree)</option>
                      <option value="bumiputeraStatus">bumiputeraStatus</option>
                      <option value="field_of_study">field_of_study</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Operator</label>
                    <select
                      value={crit.operator}
                      onChange={(e) => {
                        const updated = [...criteria];
                        updated[idx].operator = e.target.value;
                        setCriteria(updated);
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold font-mono text-[11px]"
                    >
                      <option value="EQUALS">EQUALS</option>
                      <option value="GREATER_THAN_OR_EQUAL">&gt;=</option>
                      <option value="LESS_THAN_OR_EQUAL">&lt;=</option>
                      <option value="IN_ARRAY">IN_ARRAY</option>
                      <option value="CONTAINS">CONTAINS</option>
                      <option value="NOT_MACHINE_CHECKABLE">MANUAL CHECK</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Expected Value</label>
                    <input
                      value={crit.value as string}
                      onChange={(e) => {
                        const updated = [...criteria];
                        updated[idx].value = e.target.value;
                        setCriteria(updated);
                      }}
                      placeholder="e.g. 3.50 or Malaysian"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeCriterion(crit.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Criterion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Post-Application Selection Process */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-700" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  4. Provider Selection Stages
                </h2>
              </div>
              <button
                type="button"
                onClick={addStage}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stage</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 font-normal">
              Informational roadmap of stages conducted <strong>after application submission</strong> (e.g. assessments, interviews, camps). These never block eligibility checking.
            </p>

            <div className="space-y-3">
              {stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Stage Title</label>
                    <input
                      value={stage.name}
                      onChange={(e) => {
                        const updated = [...stages];
                        updated[idx].name = e.target.value;
                        setStages(updated);
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Stage Type</label>
                    <select
                      value={stage.type}
                      onChange={(e) => {
                        const updated = [...stages];
                        updated[idx].type = e.target.value as any;
                        setStages(updated);
                      }}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold"
                    >
                      <option value="review">Application &amp; Document Review</option>
                      <option value="assessment_centre">Assessment Centre / Online Test</option>
                      <option value="written_test">Written Aptitude Test</option>
                      <option value="interview">Individual Interview</option>
                      <option value="panel_interview">Panel Board Interview</option>
                      <option value="other">Other Stage</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Description</label>
                    <input
                      value={stage.description || ''}
                      onChange={(e) => {
                        const updated = [...stages];
                        updated[idx].description = e.target.value;
                        setStages(updated);
                      }}
                      placeholder="e.g. Cognitive testing conducted online"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-normal"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeStage(stage.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove Stage"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Official Evidence & Source URL */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ExternalLink className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                5. Official Verification Source &amp; Evidence
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Official Published Source URL (Required for Publication)
                </label>
                <input
                  type="url"
                  required
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://official-portal.com.my/scholarship/notice-2026"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Evidence Citation Notes
                </label>
                <textarea
                  rows={2}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="e.g. Verified against official PDF guideline circular v2.4 published on portal on 15 March 2026."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-normal focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <button
              type="button"
              onClick={() => setIsPreviewMode(true)}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-blue-700" />
              <span>Preview as Student</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? 'Saving...' : 'Save as Draft'}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>Verify &amp; Publish Immediately</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
