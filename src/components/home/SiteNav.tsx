'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-[#FAFAF9] sticky top-0 z-50">
      <div className="font-serif text-2xl font-bold tracking-tight text-[#0B1B3D]">
        <Link href="/" onClick={closeMenu} className="p-2 -ml-2 rounded-md">DreamPath</Link>
      </div>
      
      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center gap-6">
        <Link href="/scholarships" className="font-sans text-sm font-medium text-slate-600 hover:text-[#0B1B3D] transition-colors p-2">
          Browse
        </Link>
        <Link href="/login" className="font-sans text-sm font-medium text-slate-600 hover:text-[#0B1B3D] transition-colors p-2">
          Log in
        </Link>
        <Link href="/register" className={buttonVariants({ variant: "default", size: "sm" })}>
          Get Started
        </Link>
      </nav>

      {/* Mobile Nav Header Elements */}
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/register" className={buttonVariants({ variant: "default", className: "min-h-[44px]" })}>
          Get Started
        </Link>
        <button
          ref={buttonRef}
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#0B1B3D] rounded-md"
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          aria-label="Toggle menu"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div 
          id="mobile-menu"
          className="absolute top-full left-0 right-0 bg-[#FAFAF9] border-b border-slate-200 p-4 flex flex-col gap-2 md:hidden shadow-sm"
        >
          <Link href="/scholarships" onClick={closeMenu} className="p-3 min-h-[44px] flex items-center font-sans text-base font-medium text-slate-600 hover:text-[#0B1B3D] hover:bg-slate-100 rounded-md">
            Browse
          </Link>
          <Link href="/about" onClick={closeMenu} className="p-3 min-h-[44px] flex items-center font-sans text-base font-medium text-slate-600 hover:text-[#0B1B3D] hover:bg-slate-100 rounded-md">
            How it works
          </Link>
          <Link href="/login" onClick={closeMenu} className="p-3 min-h-[44px] flex items-center font-sans text-base font-medium text-slate-600 hover:text-[#0B1B3D] hover:bg-slate-100 rounded-md">
            Log in
          </Link>
        </div>
      )}
    </header>
  );
}
