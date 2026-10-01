import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-slate-200 shadow-[0_-1px_6px_rgba(15,23,42,0.02)]">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12">
        {/* Top Tier: Logo, Description & Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-slate-100">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white shadow-2xs">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-[18px] font-bold text-[#0F172A] font-sans">
                DreamPath Intelligence
              </span>
            </div>
            <p className="text-[13px] text-slate-500 max-w-xl leading-relaxed">
              An independent Malaysian scholarship intelligence platform helping students discover opportunities, evaluate structured eligibility criteria, and organize application materials.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-6" aria-label="Footer Navigation">
            <Link
              href="/scholarships"
              className="text-[13px] font-medium text-slate-600 hover:text-blue-700 transition-colors py-1"
            >
              Scholarships
            </Link>
            <Link
              href="/scholarships/compare"
              className="text-[13px] font-medium text-slate-600 hover:text-blue-700 transition-colors py-1"
            >
              Compare
            </Link>
            <Link
              href="/about"
              className="text-[13px] font-medium text-slate-600 hover:text-blue-700 transition-colors py-1"
            >
              About DreamPath
            </Link>
            <Link
              href="/privacy"
              className="text-[13px] font-medium text-slate-600 hover:text-blue-700 transition-colors py-1"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-[13px] font-medium text-slate-600 hover:text-blue-700 transition-colors py-1"
            >
              Terms of Use
            </Link>
          </nav>
        </div>

        {/* Bottom Tier: Structured Intelligence & Legal Notice */}
        <div className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[12px] text-slate-500">
          <p>
            Structured eligibility intelligence referenced from publicly accessible provider guidelines.
          </p>
          <p>
            © {currentYear} DreamPath. Independent Malaysian Scholarship Platform.
          </p>
        </div>

        {/* Independent Service Disclaimer */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
          <p>
            <strong>Non-Affiliation Notice:</strong> DreamPath is an independent scholarship guidance and verification platform. DreamPath is not a government authority, ministry, or scholarship awarding body, and is not affiliated with, endorsed by, or operated in partnership with the Government of Malaysia, Jabatan Perkhidmatan Awam (JPA), MOHE/KPT, Yayasan Khazanah, Yayasan PETRONAS, Bank Negara Malaysia, Bank Rakyat, Maxis, Gamuda, YTL Foundation, or any third-party scholarship provider. All trademarks and organization names are the property of their respective owners. Scholarship information is compiled from published provider announcements; students must always submit applications and verify official terms directly on provider portals.
          </p>
        </div>
      </div>
    </footer>
  );
}
