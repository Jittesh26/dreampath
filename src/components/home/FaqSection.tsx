'use client';

import { ChevronDown } from 'lucide-react';

export function FaqSection() {
  const faqs = [
    {
      q: 'How does DreamPath verify criteria without hallucinations?',
      a: "Every criteria rule is extracted directly from official provider announcements, university circulars, and foundation charters. We don't rely on probabilistic language models to guess eligibility—our platform uses formal boolean decision trees compiled from verified requirements, ensuring direct provenance for every eligibility score.",
      defaultOpen: true,
    },
    {
      q: 'What happens if a provider updates their deadline or funding criteria?',
      a: 'Our intake registry runs continuous audits against official institutional portals and foundation circulars to capture mid-cycle amendments. When a deadline or income tier adjusts, active matching criteria and urgency clocks refresh accordingly.',
      defaultOpen: false,
    },
    {
      q: 'Is DreamPath completely free for Malaysian students?',
      a: 'Yes, 100% free with no paywalls or hidden fees. Under our strict PDPA Act 709 compliance, we never sell student data or charge students for scholarship eligibility scoring or resume synthesis.',
      defaultOpen: false,
    },
    {
      q: 'Does DreamPath guarantee scholarship acceptance?',
      a: 'No. DreamPath verifies whether you satisfy the published minimum academic, residency, and socioeconomic rules so you do not waste time applying for scholarships for which you are ineligible. Final award selections rest exclusively with the sponsoring foundation or government agency.',
      defaultOpen: false,
    },
    {
      q: 'Where do scholarship requirements and deadlines come from?',
      a: 'All intake dates, financial values, and academic criteria are sourced directly from published Malaysian scholarship provider portals, including JPA (eSILA), Yayasan Khazanah, Yayasan Bank Rakyat, Gamuda, PETRONAS, and reputable corporate foundations.',
      defaultOpen: false,
    },
    {
      q: 'Can I use DreamPath without creating an account?',
      a: 'Yes. You can browse the verified scholarship catalogue, run preliminary eligibility screenings, and inspect requirements completely free without an account. Creating a free student account lets you save opportunities, track application statuses, and build customized resumes with the AI Career Assistant.',
      defaultOpen: false,
    },
  ];

  return (
    <section className="w-full py-16 lg:py-24 bg-[#F8FAFC]" id="faq-section">
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 flex flex-col gap-10">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight font-sans">
            Everything you need to know about DreamPath
          </h2>
          <p className="text-[15px] text-slate-600 max-w-xl">
            Clear answers about our data pipelines, deterministic logic engine, and free student access.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => (
            <details
              key={idx}
              open={faq.defaultOpen}
              className="group bg-white border border-slate-200/90 rounded-2xl shadow-2xs transition-all hover:border-blue-200"
            >
              <summary className="flex items-center justify-between cursor-pointer p-6 md:p-7 list-none text-[17px] font-bold text-[#0F172A] select-none">
                <span className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  <span>{faq.q}</span>
                </span>
                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <div className="px-6 pb-6 md:px-7 md:pb-7 pt-0 border-t border-slate-100 mt-1">
                <p className="text-[14px] text-slate-600 leading-relaxed pt-3">
                  {faq.a}
                </p>
              </div>
            </details>
          ))}
        </div>

      </div>
    </section>
  );
}
