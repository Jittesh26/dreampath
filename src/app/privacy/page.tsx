import Link from 'next/link';
import { SiteNav } from '@/components/home/SiteNav';
import { Footer } from '@/components/home/Footer';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col font-sans">
      <SiteNav />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl space-y-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Malaysian PDPA 2010 Design Alignment</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1B3D]">
            Privacy Notice &amp; Student Data Protection
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Effective Date: March 2026 · Malaysian Personal Data Protection Act 2010 Principles
          </p>
        </div>

        <div className="p-4 bg-amber-50 border-l-4 border-amber-700 rounded-r-xl text-xs text-amber-950 leading-relaxed space-y-1">
          <strong className="font-bold block">Important Notice:</strong>
          <p>
            DreamPath is an independent consulting and student preparation platform. We are not an agent of any scholarship foundation. Using DreamPath does not automatically submit applications to external portals. Your personal data belongs exclusively to you.
          </p>
        </div>

        <section className="space-y-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-xs text-slate-700 leading-relaxed">
          <h2 className="font-serif text-xl font-bold text-[#0B1B3D]">
            1. Core Principles &amp; Malaysian PDPA Alignment
          </h2>
          <p>
            Under the Malaysian Personal Data Protection Act 2010 (PDPA), we implement the General Principle, Notice and Choice Principle, Disclosure Principle, Security Principle, Retention Principle, Data Integrity Principle, and Access Principle.
          </p>
          <p>
            We process student data solely on the basis of your explicit consent when creating a student workspace, performing an eligibility check, or constructing a verified resume.
          </p>
        </section>

        <section className="space-y-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-xs text-slate-700 leading-relaxed">
          <h2 className="font-serif text-xl font-bold text-[#0B1B3D]">
            2. Categories of Data Collected
          </h2>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>Demographic Information:</strong> Citizenship, Bumiputera status, household income band (B40, M40, T20).</li>
            <li><strong>Academic Performance:</strong> Current CGPA, verified SPM subject grades, educational qualifications.</li>
            <li><strong>Application Pipeline Records:</strong> Scholarships saved, tracked stages, interview dates.</li>
            <li><strong>Resume Facts:</strong> Student-confirmed academic projects, experience, and leadership positions.</li>
            <li><strong>Uploaded Document Text:</strong> Transient text parsed via Document Magic Autofill.</li>
          </ul>
        </section>

        <section className="space-y-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-xs text-slate-700 leading-relaxed">
          <h2 className="font-serif text-xl font-bold text-[#0B1B3D]">
            3. Document Privacy &amp; AI Intelligence Boundary
          </h2>
          <p>
            Transcripts or result slips uploaded or pasted into our Document Magic Autofill workflow are processed ephemerally on the server for grade extraction.
          </p>
          <p>
            <strong>Zero Silent Writes:</strong> Extracted credentials are never automatically written into your permanent student record. You must inspect and confirm every field on the review screen before storage.
          </p>
          <p>
            <strong>No Third-Party AI Training:</strong> Your academic facts and personal essays are not sold or used to train public machine learning models.
          </p>
        </section>

        <section className="space-y-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-xs text-slate-700 leading-relaxed">
          <h2 className="font-serif text-xl font-bold text-[#0B1B3D]">
            4. Data Portability &amp; Account Deletion
          </h2>
          <p>
            You have the right to request a complete JSON export of all your stored records or initiate immediate, irreversible account deletion via your <strong>Settings &amp; Privacy</strong> page. Upon deletion, all student profile facts, saved applications, and resume versions are permanently purged.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
