import { notFound } from 'next/navigation';
import { db } from '@/db';
import { resumeVersions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ResumeContent } from '@/domain/resume';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, GraduationCap } from 'lucide-react';

export default async function PublicResumeSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let resumeRecord: any = null;
  try {
    const [rec] = await db
      .select()
      .from(resumeVersions)
      .where(eq(resumeVersions.id, id));
    resumeRecord = rec;
  } catch {
    resumeRecord = null;
  }

  if (!resumeRecord) return notFound();

  const content = (typeof resumeRecord.content === 'string'
    ? JSON.parse(resumeRecord.content)
    : resumeRecord.content) as ResumeContent;

  const personal = content.personal || { fullName: 'Student Resume', email: '' };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Header */}
      <header className="px-6 py-3.5 bg-white border-b border-slate-200/90 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 border border-blue-500/30 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans font-black text-base tracking-tight text-slate-950 leading-none">
              Dream<span className="text-blue-700">Path</span>
            </span>
            <span className="text-[9px] tracking-widest text-slate-400 uppercase font-bold mt-0.5">
              Verified Dossier
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Certified Candidate Dossier</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 container mx-auto px-4 py-10 max-w-4xl space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <Link href="/scholarships" className="hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to DreamPath Directory
          </Link>
          <span className="bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60 font-mono text-[11px]">Read-only certified view</span>
        </div>

        {/* Paper Document Container */}
        <div className="bg-white border border-slate-200/90 shadow-lg rounded-2xl p-8 sm:p-12 space-y-8 font-sans">
          
          {/* Header */}
          <div className="border-b border-slate-200 pb-6 text-center space-y-2">
            <h1 className="font-sans text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              {personal.fullName || 'Student Candidate'}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
              {personal.email && <span>{personal.email}</span>}
              {personal.phone && <span>{personal.phone}</span>}
              {personal.location && <span>{personal.location}</span>}
            </div>
            {personal.professionalSummary && (
              <p className="text-xs text-slate-600 max-w-2xl mx-auto pt-2 leading-relaxed font-normal">
                {personal.professionalSummary}
              </p>
            )}
          </div>

          {/* Education */}
          {content.education && content.education.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                Education
              </h2>
              <div className="space-y-4">
                {content.education.map((edu) => (
                  <div key={edu.id} className="text-xs flex flex-col sm:flex-row justify-between gap-1">
                    <div>
                      <strong className="text-sm text-slate-900 block font-serif font-bold">
                        {edu.institution || 'University / Institution'}
                      </strong>
                      <span className="text-slate-700 font-medium">
                        {edu.qualification} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                      </span>
                      {edu.cgpa && (
                        <span className="text-amber-800 font-semibold block mt-0.5">
                          CGPA: {edu.cgpa}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 font-medium shrink-0">
                      {[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {content.experience && content.experience.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                Experience &amp; Leadership
              </h2>
              <div className="space-y-4">
                {content.experience.map((exp) => (
                  <div key={exp.id} className="text-xs space-y-1">
                    <div className="flex flex-col sm:flex-row justify-between gap-1">
                      <strong className="text-sm text-slate-900 font-bold">
                        {exp.position}
                      </strong>
                      <span className="text-slate-400 font-medium shrink-0">
                        {[exp.startDate, exp.isCurrent ? 'Present' : exp.endDate].filter(Boolean).join(' - ')}
                      </span>
                    </div>
                    <p className="text-slate-600 font-semibold">{exp.employer}</p>
                    {exp.description && (
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap mt-1">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {content.projects && content.projects.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                Academic &amp; Technical Projects
              </h2>
              <div className="space-y-3">
                {content.projects.map((proj) => (
                  <div key={proj.id} className="text-xs space-y-1">
                    <strong className="text-slate-900 font-bold block">{proj.name}</strong>
                    {proj.technologies && proj.technologies.length > 0 && (
                      <span className="text-[11px] text-amber-800 italic block">
                        Technologies: {proj.technologies.join(', ')}
                      </span>
                    )}
                    {proj.description && (
                      <p className="text-slate-600 leading-relaxed">{proj.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {content.skills && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                Skills &amp; Languages
              </h2>
              <div className="text-xs space-y-1.5 text-slate-700">
                {content.skills.technical && content.skills.technical.length > 0 && (
                  <div>
                    <strong className="text-slate-900">Technical Skills: </strong>
                    <span>{content.skills.technical.join(', ')}</span>
                  </div>
                )}
                {content.skills.languages && content.skills.languages.length > 0 && (
                  <div>
                    <strong className="text-slate-900">Languages: </strong>
                    <span>{content.skills.languages.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        Generated with DreamPath · Malaysia&rsquo;s Verified Scholarship Platform
      </footer>
    </div>
  );
}
