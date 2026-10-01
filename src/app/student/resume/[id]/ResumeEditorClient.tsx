'use client';

import { useState, useTransition } from 'react';
import { updateResume } from '@/app/actions/resume';
import { ResumeContent } from '@/domain/resume';
import { GeneratedWording } from '@/domain/ai-interview';
import { mergeResumeContent } from '@/domain/resume-merge';
import Link from 'next/link';
import AIInterviewModal from './AIInterviewModal';
import PDFPreviewModal from '@/components/resume/PDFPreviewModal';
import { ATSCheckerModal } from '@/components/resume/ATSCheckerModal';
import { ScholarshipTailoringModal } from '@/components/resume/ScholarshipTailoringModal';
import { ShareResumeModal } from '@/components/resume/ShareResumeModal';
import { Card } from '@/components/ui/card';
import {
  Sparkles,
  ShieldCheck,
  Target,
  Share2,
  FileDown,
  Eye,
  Plus,
  Trash2,
  ArrowLeft,
  Check,
  Save,
} from 'lucide-react';

export default function ResumeEditorClient({
  resume,
}: {
  resume: { id: string; title: string; content: ResumeContent };
}) {
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState<ResumeContent>(resume.content);
  const [title, setTitle] = useState(resume.title);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [isATSModalOpen, setIsATSModalOpen] = useState(false);
  const [isTailorModalOpen, setIsTailorModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateResume(resume.id, title, JSON.stringify(content));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch {
        alert('Failed to save resume. Please try again.');
      }
    });
  };

  const handlePersonalChange = (field: string, value: string) => {
    setContent(prev => ({
      ...prev,
      personal: {
        ...(prev.personal || { fullName: '', email: '' }),
        [field]: value,
      },
    }));
  };

  // Education Helpers
  const handleAddEducation = () => {
    setContent(prev => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: crypto.randomUUID(),
          institution: '',
          qualification: '',
          educationLevel: 'Bachelor',
          startDate: '',
          endDate: '',
          cgpa: '',
        },
      ],
    }));
  };

  const handleUpdateEducation = (id: string, field: string, value: string) => {
    setContent(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    }));
  };

  const handleDeleteEducation = (id: string) => {
    setContent(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id),
    }));
  };

  // Experience Helpers
  const handleAddExperience = () => {
    setContent(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: crypto.randomUUID(),
          employer: '',
          position: '',
          startDate: '',
          endDate: '',
          isCurrent: false,
          description: '',
          achievements: [],
        },
      ],
    }));
  };

  const handleUpdateExperience = (id: string, field: string, value: string | boolean | string[]) => {
    setContent(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const handleDeleteExperience = (id: string) => {
    setContent(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id),
    }));
  };

  // Project Helpers
  const handleAddProject = () => {
    setContent(prev => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          id: crypto.randomUUID(),
          name: '',
          role: '',
          description: '',
          technologies: [],
          achievements: [],
        },
      ],
    }));
  };

  const handleUpdateProject = (id: string, field: string, value: string | string[]) => {
    setContent(prev => ({
      ...prev,
      projects: prev.projects.map(proj =>
        proj.id === id ? { ...proj, [field]: value } : proj
      ),
    }));
  };

  const handleDeleteProject = (id: string) => {
    setContent(prev => ({
      ...prev,
      projects: prev.projects.filter(proj => proj.id !== id),
    }));
  };

  // Skills Helpers
  const handleSkillsChange = (category: 'technical' | 'languages' | 'soft', value: string) => {
    const list = value.split(',').map(s => s.trim()).filter(Boolean);
    setContent(prev => ({
      ...prev,
      skills: {
        ...(prev.skills || {}),
        [category]: list,
      },
    }));
  };

  const handleApplyGeneratedContent = (generatedContent: GeneratedWording | ResumeContent) => {
    setContent(prev => mergeResumeContent(prev, generatedContent as GeneratedWording));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F8FAFC] w-full pb-16 font-sans">
      {/* STEP 1: FIX HEADER & TOOLBAR LAYOUT */}
      <header className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-3.5 bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/student/resume"
            className="text-slate-500 hover:text-slate-900 text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Resumes</span>
          </Link>
          <span className="text-slate-300">|</span>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="font-sans text-base sm:text-lg font-black border-none outline-none focus:ring-0 p-0 text-slate-950 bg-transparent truncate max-w-xs sm:max-w-md"
            placeholder="Untitled Resume"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            type="button"
            className="h-9 px-3.5 text-xs font-bold border border-blue-200/80 bg-blue-50/80 text-blue-900 hover:bg-blue-100 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            onClick={() => setIsAIModalOpen(true)}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Career Assistant</span>
          </button>

          <button
            type="button"
            className="h-9 px-3 text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            onClick={() => setIsATSModalOpen(true)}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>ATS Check</span>
          </button>

          <button
            type="button"
            className="h-9 px-3 text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            onClick={() => setIsTailorModalOpen(true)}
          >
            <Target className="w-3.5 h-3.5 text-amber-600" />
            <span>Tailor</span>
          </button>

          <button
            type="button"
            className="h-9 px-3 text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            onClick={() => setIsShareModalOpen(true)}
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Share</span>
          </button>

          <button
            type="button"
            className="h-9 px-3.5 text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            onClick={() => setIsPDFModalOpen(true)}
          >
            <FileDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="h-9 px-4 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 shadow-2xs transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {isPending ? (
              <span>Saving...</span>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* STEP 2: WORKSPACE GRID & SPLIT-SCREEN STRUCTURE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full">
        {/* LEFT COLUMN (Editor Form) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Section: Personal Information */}
          <Card className="bg-white border-slate-200 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-serif text-lg font-bold text-primary">Personal Information</h2>
              <p className="text-xs text-slate-500">Contact details and professional introduction.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={content.personal?.fullName || ''}
                  onChange={e => handlePersonalChange('fullName', e.target.value)}
                  placeholder="e.g. Muhammad Danial bin Azman"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={content.personal?.email || ''}
                  onChange={e => handlePersonalChange('email', e.target.value)}
                  placeholder="e.g. danial.azman@siswa.um.edu.my"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={content.personal?.phone || ''}
                  onChange={e => handlePersonalChange('phone', e.target.value)}
                  placeholder="e.g. +60 17-234 5678"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Location</label>
                <input
                  type="text"
                  value={content.personal?.location || ''}
                  onChange={e => handlePersonalChange('location', e.target.value)}
                  placeholder="e.g. Kuala Lumpur, Malaysia"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">LinkedIn Profile</label>
                <input
                  type="text"
                  value={content.personal?.linkedin || ''}
                  onChange={e => handlePersonalChange('linkedin', e.target.value)}
                  placeholder="e.g. linkedin.com/in/danialazman"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">GitHub / Portfolio</label>
                <input
                  type="text"
                  value={content.personal?.github || ''}
                  onChange={e => handlePersonalChange('github', e.target.value)}
                  placeholder="e.g. github.com/danialazman"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Professional Summary</label>
              <textarea
                value={content.personal?.professionalSummary || ''}
                onChange={e => handlePersonalChange('professionalSummary', e.target.value)}
                rows={3}
                placeholder="Brief summary of your academic background, strengths, and career ambitions..."
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
              />
            </div>
          </Card>

          {/* Section: Education */}
          <Card className="bg-white border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-primary">Education &amp; Qualifications</h2>
                <p className="text-xs text-slate-500">Degree, Foundation, Diploma, or SPM records.</p>
              </div>
              <button
                type="button"
                onClick={handleAddEducation}
                className="text-xs font-semibold text-[#0B1B3D] hover:text-[#0B1B3D]/80 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Education
              </button>
            </div>

            {content.education.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-[#FAFAF9] rounded-lg border border-dashed border-slate-200">
                No education entries yet. Click &quot;Add Education&quot; or use the AI Assistant.
              </div>
            ) : (
              content.education.map((edu, idx) => (
                <div key={edu.id} className="p-4 bg-[#FAFAF9] rounded-lg border border-slate-200 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Entry #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteEducation(edu.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Institution</label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={e => handleUpdateEducation(edu.id, 'institution', e.target.value)}
                        placeholder="e.g. Universiti Malaya"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Qualification</label>
                      <input
                        type="text"
                        value={edu.qualification}
                        onChange={e => handleUpdateEducation(edu.id, 'qualification', e.target.value)}
                        placeholder="e.g. Bachelor of Computer Science"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Dates / Year</label>
                      <input
                        type="text"
                        value={[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}
                        onChange={e => {
                          const [s, end] = e.target.value.split('-');
                          handleUpdateEducation(edu.id, 'startDate', s?.trim() || '');
                          handleUpdateEducation(edu.id, 'endDate', end?.trim() || '');
                        }}
                        placeholder="e.g. 2022 - 2026"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">CGPA / Grade</label>
                      <input
                        type="text"
                        value={edu.cgpa || ''}
                        onChange={e => handleUpdateEducation(edu.id, 'cgpa', e.target.value)}
                        placeholder="e.g. 3.92 / 4.00"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>

          {/* Section: Experience */}
          <Card className="bg-white border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-primary">Work &amp; Internship Experience</h2>
                <p className="text-xs text-slate-500">Employment, internships, or academic tutoring.</p>
              </div>
              <button
                type="button"
                onClick={handleAddExperience}
                className="text-xs font-semibold text-[#0B1B3D] hover:text-[#0B1B3D]/80 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Experience
              </button>
            </div>

            {content.experience.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-[#FAFAF9] rounded-lg border border-dashed border-slate-200">
                No experience entries recorded. Click &quot;Add Experience&quot; to begin.
              </div>
            ) : (
              content.experience.map((exp, idx) => (
                <div key={exp.id} className="p-4 bg-[#FAFAF9] rounded-lg border border-slate-200 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Position #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Job Title / Role</label>
                      <input
                        type="text"
                        value={exp.position}
                        onChange={e => handleUpdateExperience(exp.id, 'position', e.target.value)}
                        placeholder="e.g. Software Engineering Intern"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Company / Organization</label>
                      <input
                        type="text"
                        value={exp.employer}
                        onChange={e => handleUpdateExperience(exp.id, 'employer', e.target.value)}
                        placeholder="e.g. Petronas Digital Sdn Bhd"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Key Description &amp; Achievements</label>
                    <textarea
                      value={exp.description || (exp.achievements ? exp.achievements.join('\n') : '')}
                      onChange={e => handleUpdateExperience(exp.id, 'description', e.target.value)}
                      rows={2}
                      placeholder="Bullet points or summary of your contributions..."
                      className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 resize-y"
                    />
                  </div>
                </div>
              ))
            )}
          </Card>

          {/* Section: Projects */}
          <Card className="bg-white border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-primary">Key Projects</h2>
                <p className="text-xs text-slate-500">Academic, personal, or open-source software/engineering projects.</p>
              </div>
              <button
                type="button"
                onClick={handleAddProject}
                className="text-xs font-semibold text-[#0B1B3D] hover:text-[#0B1B3D]/80 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </button>
            </div>

            {content.projects.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-[#FAFAF9] rounded-lg border border-dashed border-slate-200">
                No projects listed. Click &quot;Add Project&quot; to showcase your technical accomplishments.
              </div>
            ) : (
              content.projects.map((proj, idx) => (
                <div key={proj.id} className="p-4 bg-[#FAFAF9] rounded-lg border border-slate-200 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Project #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(proj.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Project Name</label>
                      <input
                        type="text"
                        value={proj.name}
                        onChange={e => handleUpdateProject(proj.id, 'name', e.target.value)}
                        placeholder="e.g. BiasiswaHub Malaysia"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Technologies Used (comma separated)</label>
                      <input
                        type="text"
                        value={proj.technologies ? proj.technologies.join(', ') : ''}
                        onChange={e =>
                          handleUpdateProject(
                            proj.id,
                            'technologies',
                            e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="e.g. Next.js, PostgreSQL, Tailwind"
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Description &amp; Highlights</label>
                    <textarea
                      value={proj.description || ''}
                      onChange={e => handleUpdateProject(proj.id, 'description', e.target.value)}
                      rows={2}
                      placeholder="What you built, the impact achieved, or metrics..."
                      className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs text-slate-800 resize-y"
                    />
                  </div>
                </div>
              ))
            )}
          </Card>

          {/* Section: Skills & Languages */}
          <Card className="bg-white border-slate-200 shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-serif text-lg font-bold text-primary">Skills &amp; Languages</h2>
              <p className="text-xs text-slate-500">Categorized proficiencies for ATS scanning and review.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Technical Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={content.skills?.technical ? content.skills.technical.join(', ') : ''}
                  onChange={e => handleSkillsChange('technical', e.target.value)}
                  placeholder="e.g. Python, TypeScript, React, SQL, Docker, AWS"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Languages (comma separated)
                </label>
                <input
                  type="text"
                  value={content.skills?.languages ? content.skills.languages.join(', ') : ''}
                  onChange={e => handleSkillsChange('languages', e.target.value)}
                  placeholder="e.g. Bahasa Melayu (Native), English (Fluent / CEFR C1), Mandarin (Basic)"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Soft Skills / Competencies (comma separated)
                </label>
                <input
                  type="text"
                  value={content.skills?.soft ? content.skills.soft.join(', ') : ''}
                  onChange={e => handleSkillsChange('soft', e.target.value)}
                  placeholder="e.g. Leadership, Public Speaking, Agile/Scrum"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN (Live Document Preview) */}
        <div className="lg:col-span-5 sticky top-20 self-start">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Live Document Preview</span>
            </span>
            <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
              Standard A4
            </span>
          </div>

          {/* Styled Desktop Page Frame with Drop Shadow */}
          <div className="shadow-lg border border-slate-200/90 bg-white rounded-md p-6 sm:p-8 min-h-[600px] text-slate-800 font-sans text-xs space-y-5">
            {/* Faux Preview Header */}
            <div className="text-center border-b border-slate-900 pb-3">
              <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-slate-900">
                {content.personal?.fullName || 'Your Full Name'}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 mt-1.5">
                {content.personal?.email && <span>{content.personal.email}</span>}
                {content.personal?.phone && <span>&bull; {content.personal.phone}</span>}
                {content.personal?.location && <span>&bull; {content.personal.location}</span>}
              </div>
              {content.personal?.professionalSummary && (
                <p className="text-[11px] text-slate-600 mt-2 text-left italic">
                  {content.personal.professionalSummary}
                </p>
              )}
            </div>

            {/* Faux Preview: Education */}
            {content.education.length > 0 && (
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                  EDUCATION
                </h3>
                <div className="space-y-2">
                  {content.education.map(edu => (
                    <div key={edu.id} className="text-[11px]">
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span>{edu.qualification || 'Qualification'}</span>
                        <span className="text-slate-500 font-normal">
                          {[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>{edu.institution || 'Institution'}</span>
                        {edu.cgpa && <span className="font-semibold text-slate-700">CGPA: {edu.cgpa}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Faux Preview: Experience */}
            {content.experience.length > 0 && (
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                  EXPERIENCE
                </h3>
                <div className="space-y-2.5">
                  {content.experience.map(exp => (
                    <div key={exp.id} className="text-[11px]">
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span>{exp.position || 'Position'}</span>
                        <span className="text-slate-500 font-normal">
                          {[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' - ')}
                        </span>
                      </div>
                      <div className="text-slate-600 font-medium">{exp.employer || 'Employer'}</div>
                      {exp.description && (
                        <p className="text-slate-600 mt-1 whitespace-pre-wrap">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Faux Preview: Projects */}
            {content.projects.length > 0 && (
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                  PROJECTS
                </h3>
                <div className="space-y-2.5">
                  {content.projects.map(proj => (
                    <div key={proj.id} className="text-[11px]">
                      <div className="font-semibold text-slate-800">{proj.name || 'Project Name'}</div>
                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="text-[10px] text-slate-500 italic">
                          Tech: {proj.technologies.join(', ')}
                        </div>
                      )}
                      {proj.description && (
                        <p className="text-slate-600 mt-0.5">{proj.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Faux Preview: Skills */}
            {content.skills && (
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                  SKILLS &amp; LANGUAGES
                </h3>
                <div className="space-y-1 text-[11px]">
                  {content.skills.technical && content.skills.technical.length > 0 && (
                    <div>
                      <span className="font-semibold text-slate-700">Technical: </span>
                      <span className="text-slate-600">{content.skills.technical.join(', ')}</span>
                    </div>
                  )}
                  {content.skills.languages && content.skills.languages.length > 0 && (
                    <div>
                      <span className="font-semibold text-slate-700">Languages: </span>
                      <span className="text-slate-600">{content.skills.languages.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Interview Modal */}
      <AIInterviewModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onApplyGeneratedContent={handleApplyGeneratedContent}
        resumeId={resume.id}
      />

      {/* PDF Export & Preview Modal */}
      <PDFPreviewModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        content={content}
        title={title}
      />

      {/* ATS Checker Modal */}
      <ATSCheckerModal
        isOpen={isATSModalOpen}
        onClose={() => setIsATSModalOpen(false)}
        content={content}
      />

      {/* Scholarship Tailoring Modal */}
      <ScholarshipTailoringModal
        isOpen={isTailorModalOpen}
        onClose={() => setIsTailorModalOpen(false)}
        content={content}
      />

      {/* Share Resume Modal */}
      <ShareResumeModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        resumeId={resume.id}
        title={title}
      />
    </div>
  );
}
