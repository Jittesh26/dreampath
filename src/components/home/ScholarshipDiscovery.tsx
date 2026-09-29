'use client';

import { useState } from 'react';
import { ScholarshipCard } from '@/components/ScholarshipCard';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Sparkles, ArrowRight, Loader2, Search } from 'lucide-react';

interface InitialScholarship {
  id: string;
  scholarshipName: string;
  providerName: string;
  status: string;
  openDate: string | null;
  closeDate: string | null;
}

export function ScholarshipDiscovery({
  initialItems = [],
}: {
  initialItems?: InitialScholarship[];
}) {
  const [prompt, setPrompt] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [aiFilterSummary, setAiFilterSummary] = useState<string | null>(null);
  const [scholarships, setScholarships] = useState<InitialScholarship[]>(initialItems);

  const samplePrompts = [
    'Bumiputera engineering student with 3.7 CGPA looking for degree funding',
    'SPM leaver with 8A looking for overseas Pre-U scholarships',
    'B40 computer science undergraduate student',
    'JPA or federal government scholarships for local public universities',
  ];

  const handleAiDiscover = async (queryText?: string) => {
    const textToSearch = queryText || prompt;
    if (!textToSearch.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/ai/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSearch }),
      });
      const data = await res.json();
      if (data.scholarships && Array.isArray(data.scholarships) && data.scholarships.length > 0) {
        setScholarships(data.scholarships);
        setAiFilterSummary(data.filters?.summary || 'Matched against verified database rules.');
      }
    } catch {
      // Keep existing list on failure
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section className="w-full py-20 bg-[#FAFAF9] border-b border-slate-200">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto space-y-10">
        
        {/* Editorial Heading */}
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Discovery & Verification</span>
          </div>
          <h2 className="font-serif text-[#0B1B3D] text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight">
            Scholarships, <span className="italic text-amber-800">checked against their sources.</span>
          </h2>
          <p className="font-sans text-slate-600 text-base sm:text-lg">
            Tell DreamPath who you are in plain English or Malay. Our AI extracts structured criteria and matches you directly with verified opportunities from our database.
          </p>
        </div>

        {/* Natural Language AI Discovery Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAiDiscover();
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. I am a Sarawak engineering student with 3.8 CGPA looking for full degree sponsorship..."
                className="w-full pl-12 pr-4 py-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-[#0B1B3D] hover:bg-[#132A5C] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shrink-0"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Matching Rules...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Discover Opportunities</span>
                </>
              )}
            </button>
          </form>

          {/* Quick sample prompt chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Try asking:</span>
            {samplePrompts.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => {
                  setPrompt(sp);
                  handleAiDiscover(sp);
                }}
                className="text-left text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors text-xs line-clamp-1 max-w-xs"
              >
                &ldquo;{sp}&rdquo;
              </button>
            ))}
          </div>

          {/* AI Filter Insight Banner */}
          {aiFilterSummary && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
              <span>
                <strong>AI Filter Extracted:</strong> {aiFilterSummary}
              </span>
              <button
                onClick={() => {
                  setAiFilterSummary(null);
                  setScholarships(initialItems);
                  setPrompt('');
                }}
                className="text-amber-800 hover:underline font-semibold text-xs ml-4 shrink-0"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Scholarships Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scholarships.slice(0, 6).map((item) => (
            <ScholarshipCard
              key={item.id}
              id={item.id}
              providerName={item.providerName}
              scholarshipName={item.scholarshipName}
              status={item.status}
              openDate={item.openDate}
              closeDate={item.closeDate}
            />
          ))}
        </div>

        {/* Bottom CTA to Catalogue */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-200 gap-4">
          <p className="text-xs text-slate-500 font-medium">
            Showing verified active scholarships from official 2026 guidelines.
          </p>
          <Link
            href="/scholarships"
            className={buttonVariants({
              variant: 'default',
              className: 'bg-[#0B1B3D] hover:bg-[#132A5C] text-white font-bold text-sm h-11 px-6 shadow-xs',
            })}
          >
            <span>View All 27 Verified Scholarships</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>

      </div>
    </section>
  );
}
