import Link from 'next/link';
import { Database, ShieldCheck, Landmark, Clock } from 'lucide-react';

interface TruthStripProps {
  scholarshipCount?: number;
  providerCount?: number;
}

export function TruthStrip({
  scholarshipCount = 27,
  providerCount = 24,
}: TruthStripProps) {
  const currentDate = new Date().toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const featuredProviders = [
    { name: 'BANK RAKYAT', query: 'Bank Rakyat' },
    { name: 'MAXIS', query: 'Maxis' },
    { name: 'YTL FOUNDATION', query: 'YTL' },
    { name: 'JPA MALAYSIA', query: 'JPA' },
    { name: 'YAYASAN KHAZANAH', query: 'Khazanah' },
    { name: 'GAMUDA', query: 'Gamuda' },
    { name: 'PETRONAS', query: 'Petronas' },
    { name: 'BANK NEGARA', query: 'Bank Negara' },
  ];

  return (
    <section id="truth-metrics" className="w-full py-10 bg-white border-y border-slate-200/80 shadow-2xs">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 flex flex-col gap-8">
        
        {/* Unified Translucent Glass Container for Metrics */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md shadow-2xs p-6 lg:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 gap-6 sm:gap-0">
            
            {/* Stat 1 */}
            <div className="flex flex-col gap-1.5 sm:px-6 first:pl-0">
              <div className="flex items-center gap-2 text-[#0F172A]">
                <span className="text-[34px] font-bold tracking-tight font-sans">
                  {scholarshipCount}
                </span>
                <Database className="w-6 h-6 text-blue-700" />
              </div>
              <span className="text-[16px] font-bold text-[#0F172A]">
                Verified Programs
              </span>
              <span className="text-[13px] text-slate-500 leading-snug">
                Actively tracking {providerCount} Malaysian sponsors & GLC endowments
              </span>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col gap-1.5 sm:px-6 pt-4 sm:pt-0">
              <div className="flex items-center gap-2 text-[#0F172A]">
                <span className="text-[28px] font-bold tracking-tight font-sans">
                  Source-Verified
                </span>
                <ShieldCheck className="w-6 h-6 text-blue-700" />
              </div>
              <span className="text-[16px] font-bold text-[#0F172A]">
                Direct Provenance
              </span>
              <span className="text-[13px] text-slate-500 leading-snug">
                Every rule traced to official gazettes & charters
              </span>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col gap-1.5 sm:px-6 pt-4 sm:pt-0">
              <div className="flex items-center gap-2 text-[#0F172A]">
                <span className="text-[28px] font-bold tracking-tight font-sans">
                  Active Pools
                </span>
                <Landmark className="w-6 h-6 text-blue-700" />
              </div>
              <span className="text-[16px] font-bold text-[#0F172A]">
                Verified Allocations
              </span>
              <span className="text-[13px] text-slate-500 leading-snug">
                Active 2026/2027 Malaysian funding cycles
              </span>
            </div>

            {/* Stat 4 */}
            <div className="flex flex-col gap-1.5 sm:px-6 last:pr-0 pt-4 sm:pt-0">
              <div className="flex items-center gap-2 text-[#0F172A]">
                <span className="text-[28px] font-bold tracking-tight font-sans">
                  Updated Daily
                </span>
                <Clock className="w-6 h-6 text-blue-700" />
              </div>
              <span className="text-[16px] font-bold text-[#0F172A]">
                Real-Time Clocks
              </span>
              <span className="text-[13px] text-slate-500 leading-snug">
                Cycle status as of {currentDate}
              </span>
            </div>

          </div>
        </div>

        {/* Horizontal Provider Trust Strip */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
            VERIFIED PROVIDERS & ENDOWMENTS
          </span>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-7 gap-y-3 opacity-80">
            {featuredProviders.map((provider) => (
              <Link
                key={provider.name}
                href={`/scholarships?q=${encodeURIComponent(provider.query)}`}
                className="text-[13px] font-extrabold tracking-tight text-slate-600 hover:text-blue-700 transition-colors"
              >
                {provider.name}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
