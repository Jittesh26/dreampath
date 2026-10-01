'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Menu, X } from 'lucide-react';

export function SiteNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const navLinks = [
    { href: '/scholarships', label: 'Scholarships' },
    { href: '/scholarships', label: 'Eligibility Engine' },
    { href: '/student/applications', label: 'Tracker & Tools' },
    { href: '/#architecture', label: 'How It Works' },
    { href: '/about', label: 'About' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-[0_1px_6px_rgba(15,23,42,0.04)]'
          : 'bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_6px_rgba(15,23,42,0.02)]'
      }`}
    >
      <div className="h-20 max-w-[1280px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Brand Logo & Authority Label */}
        <Link
          href="/"
          onClick={closeMenu}
          className="flex items-center gap-3.5 focus-visible:outline-2 focus-visible:outline-blue-600 rounded-lg group shrink-0"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-slate-700/60 flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[21px] font-bold text-[#0F172A] tracking-tight leading-none mb-1 font-sans whitespace-nowrap">
              DreamPath
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none whitespace-nowrap">
              National Scholarship Intelligence
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation - Strictly One Single Horizontal Line */}
        <nav
          className="hidden lg:flex items-center gap-4 xl:gap-7 flex-nowrap shrink-0"
          aria-label="Main Navigation"
        >
          {navLinks.map((link, idx) => {
            const isActive = pathname === link.href && !link.href.includes('#');
            return (
              <Link
                key={`${link.href}-${idx}`}
                href={link.href}
                className={`text-[14px] font-semibold transition-colors rounded py-1 px-1.5 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Login & Sign Up ONLY (No notification icon, no search bar, no Student Portal) */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center justify-center font-sans text-[13px] font-semibold text-slate-700 hover:text-[#0F172A] px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap min-h-[40px]"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="hidden sm:inline-flex items-center justify-center bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-[13px] px-5 py-2.5 rounded-full transition-all shadow-sm hover:shadow whitespace-nowrap min-h-[40px]"
          >
            Sign Up
          </Link>

          {/* Mobile Menu Button */}
          <button
            ref={buttonRef}
            className="lg:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#0F172A] rounded-lg hover:bg-slate-100 transition-colors"
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle navigation menu"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div
          id="mobile-menu"
          className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-5 flex flex-col gap-2.5 lg:hidden shadow-lg animate-in slide-in-from-top-2 duration-150"
        >
          {navLinks.map((link, idx) => (
            <Link
              key={`m-${link.href}-${idx}`}
              href={link.href}
              onClick={closeMenu}
              className="p-3 min-h-[44px] flex items-center text-[15px] font-semibold text-slate-700 hover:text-[#0F172A] hover:bg-slate-50 rounded-xl"
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={closeMenu}
              className="p-3 min-h-[44px] flex items-center justify-center text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              Log in
            </Link>
            <Link
              href="/register"
              onClick={closeMenu}
              className="p-3 min-h-[44px] flex items-center justify-center text-sm font-bold bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl shadow-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
