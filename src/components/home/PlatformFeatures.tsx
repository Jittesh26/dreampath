import Link from 'next/link';
import {
  CheckCircle,
  Kanban,
  Bot,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export function PlatformFeatures() {
  const features = [
    {
      icon: CheckCircle,
      title: 'Deterministic Eligibility Engine',
      category: 'Core Evaluation',
      description:
        'Verify your qualifications against published scholarship charters using machine-checkable boolean decision trees. Zero hallucinations, with transparent match reasons.',
      linkHref: '/scholarships',
      linkText: 'Check Eligibility Rules',
      badge: 'Rule Engine',
    },
    {
      icon: Kanban,
      title: 'Application Progress Tracker',
      category: 'Student Portal',
      description:
        'Organize your applications through a dedicated Kanban pipeline from Saved to Planning, Applying, Interview, and Award. Never miss an intake closing deadline.',
      linkHref: '/student/applications',
      linkText: 'Open Application Tracker',
      badge: 'Live Tracker',
    },
    {
      icon: Bot,
      title: 'AI Career Assistant',
      category: 'Interview Coaching',
      description:
        'Converse naturally with our ChatGPT/Gemini-style career partner. It silently extracts your achievements and drafts tailored STAR bullet points for your applications.',
      linkHref: '/student/resume',
      linkText: 'Start Career Interview',
      badge: 'AI Powered',
    },
    {
      icon: FileText,
      title: 'Professional Resume Builder',
      category: 'Career Documents',
      description:
        'Generate and manage scholarship-ready resumes. Features multi-version isolation, direct PostgreSQL persistence, and instantaneous PDF exports.',
      linkHref: '/student/resume',
      linkText: 'Build Scholarship Resume',
      badge: 'PDF Ready',
    },
  ];

  return (
    <section className="w-full py-16 lg:py-24 bg-white border-b border-slate-200/80" id="platform-features">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 flex flex-col gap-12">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>PLATFORM CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight font-sans">
            Built for Serious Malaysian Scholars
          </h2>
          <p className="text-[15px] text-slate-600 leading-relaxed">
            From initial eligibility checks to conversational interview coaching and application tracking, DreamPath empowers your educational journey.
          </p>
        </div>

        {/* 4-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="flex flex-col justify-between bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs hover:shadow-lg hover:border-blue-300 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-2xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                      {feature.badge}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {feature.category}
                    </span>
                    <h3 className="text-[18px] font-bold text-[#0F172A] group-hover:text-blue-700 transition-colors leading-snug">
                      {feature.title}
                    </h3>
                  </div>

                  <p className="text-[13px] text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100">
                  <Link
                    href={feature.linkHref}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-700 hover:text-blue-900 transition-colors group-hover:translate-x-1 duration-150"
                  >
                    <span>{feature.linkText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
