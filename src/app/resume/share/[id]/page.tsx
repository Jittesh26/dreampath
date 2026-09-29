import { notFound } from 'next/navigation';
import { db } from '@/db';
import { resumeVersions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ResumeContent } from '@/domain/resume';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col font-sans">
      {/* Top Header */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-[#0B1B3D]">
          Dream<span className="text-amber-700 italic">Path</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Student Resume Profile</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <Link href="/scholarships" className="hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to DreamPath
          </Link>
          <span>Read-only certified view</span>
        </div>

        {/* Paper Document Container */}
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-8 sm:p-12 space-y-8 font-sans">
          
          {/* Header */}
          <div className="border-b border-slate-200 pb-6 text-center space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B1B3D] tracking-tight">
              {personal.fullName || 'Student Candidate'}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
              {personal.email && <span>{personal.email}</span>}
              {personal.phone && <span>{personal.phone}</span>}
              {personal.location && <span>{personal.location}</span>}
            </div>
            {personal.professionalSummary && (
              <p className="text-xs text-slate-600 max-w-2xl mx-auto pt-2 leading-relaxed">
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
