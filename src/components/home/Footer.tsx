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
        <div className="flex justify-center gap-4 flex-wrap pt-4">
          <Link href="/privacy" className="text-sm text-slate-500 hover:text-[#0B1B3D] transition-colors p-2 min-h-[44px] flex items-center">Privacy Policy</Link>
          <Link href="/terms" className="text-sm text-slate-500 hover:text-[#0B1B3D] transition-colors p-2 min-h-[44px] flex items-center">Terms of Service</Link>
          <Link href="/about" className="text-sm text-slate-500 hover:text-[#0B1B3D] transition-colors p-2 min-h-[44px] flex items-center">About Us</Link>
        </div>
      </div>
    </footer>
  );
}
