import { getResumes, createResume, deleteResume } from '@/app/actions/resume';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText, Plus, Trash2, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Resume Builder | DreamPath',
  description: 'Build ATS-compliant resumes with confirmed fact provenance for Malaysian scholarships.',
};

export default async function ResumeDashboard() {
  const resumes = await getResumes();

  async function handleCreate() {
    'use server';
    const newResume = await createResume('Malaysian Tertiary Scholarship Resume');
    redirect(`/student/resume/${newResume.id}`);
  }

  async function handleDelete(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await deleteResume(id);
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Fact-Grounded Resume Engine</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B3D]">
            Resume Workspace
          </h1>
          <p className="font-sans text-slate-500 text-sm max-w-xl">
            Create tailored, ATS-verified resumes for scholarship committees. Every achievement is rooted in confirmed student facts with strict provenance.
          </p>
        </div>

        <form action={handleCreate}>
          <button 
            type="submit" 
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1B3D] text-white rounded-xl hover:bg-[#132A5C] text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Resume</span>
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#0B1B3D]">My Tailored Resumes</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage, review wording, tailor for providers, and export PDF.</p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {resumes.length} {resumes.length === 1 ? 'Resume' : 'Resumes'}
          </span>
        </div>
        
        {resumes.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-xl font-bold text-[#0B1B3D]">No resumes built yet</h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                Launch your first resume with our conversational AI Interview. Answer natural questions to extract your achievements, then format into Classic Academic or Modern Tech templates.
              </p>
            </div>
            <form action={handleCreate} className="pt-2">
              <button 
                type="submit" 
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0B1B3D] text-white text-xs font-bold rounded-xl hover:bg-[#132A5C] transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Start First Resume</span>
              </button>
            </form>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {resumes.map((resume: any) => (
              <li key={resume.id} className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <Link href={`/student/resume/${resume.id}`} className="font-serif text-lg font-bold text-[#0B1B3D] hover:text-amber-800 transition-colors block">
                    {resume.title}
                  </Link>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Last edited: {new Date(resume.updatedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ATS-Formatted
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/student/resume/${resume.id}`}
                    className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    <span>Open Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <form action={handleDelete}>
                    <input type="hidden" name="id" value={resume.id} />
                    <button 
                      type="submit"
                      aria-label="Delete resume"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
