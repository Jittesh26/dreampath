import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200">
      <div className="w-full bg-[#FAFAF9] py-20 text-center border-b border-slate-200">
        <h2 className="font-serif text-[#0B1B3D] text-4xl md:text-5xl mb-6">Ready to find your path?</h2>
        <Link href="/register" className={buttonVariants({ variant: "default", size: "lg", className: "px-10 h-14 text-lg font-bold" })}>
          Create your free account
        </Link>
      </div>
      <div className="container mx-auto px-4 py-12 text-center space-y-4">
        <div className="font-serif text-2xl font-bold text-[#0B1B3D]">DreamPath</div>
        <p className="text-sm text-slate-500 font-medium">© {new Date().getFullYear()} DreamPath Consultancy. Trust before AI.</p>
        <div className="flex justify-center gap-6 flex-wrap pt-4 text-sm font-medium">
          <Link href="/scholarships" className="text-slate-600 hover:text-[#0B1B3D] transition-colors p-2 min-h-[44px] flex items-center">Scholarship Directory</Link>
          <Link href="/scholarships/compare" className="text-slate-600 hover:text-[#0B1B3D] transition-colors p-2 min-h-[44px] flex items-center">Compare</Link>
          <Link href="/about" className="text-slate-600 hover:text-[#0B1B3D] transition-colors p-2 min-h-[44px] flex items-center">About DreamPath</Link>
          <Link href="/privacy" className="text-slate-600 hover:text-[#0B1B3D] transition-colors p-2 min-h-[44px] flex items-center">Privacy Policy</Link>
          <Link href="/terms" className="text-slate-600 hover:text-[#0B1B3D] transition-colors p-2 min-h-[44px] flex items-center">Terms of Service</Link>
        </div>

        <div className="max-w-3xl mx-auto pt-6 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
          <p className="font-semibold text-slate-500 mb-1">Non-Affiliation & Independent Service Disclaimer</p>
          <p>
            DreamPath is an independent scholarship guidance and discovery platform. DreamPath is not affiliated with, endorsed by, or operated in partnership with the Government of Malaysia, Jabatan Perkhidmatan Awam (JPA), Yayasan Khazanah, Yayasan PETRONAS, Bank Negara Malaysia, Shell Malaysia, or any third-party scholarship provider. All trademarks and organization names are the property of their respective owners. Scholarship information is compiled from public authoritative notices; students must always submit applications and verify terms via the official provider portals.
          </p>
        </div>
      </div>
    </footer>
  );
}
