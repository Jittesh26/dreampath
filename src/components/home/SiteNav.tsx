'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Search } from 'lucide-react';

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
    { href: '/scholarships/compare', label: 'Compare' },
    { href: '/about', label: 'How It Works' },
    { href: '/student/resume', label: 'Resume AI' },
    { href: '/student/applications', label: 'Tracker' },
  ];

  const triggerCmdK = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  return (
    <header
      className={`px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40 transition-all duration-200 ${
        scrolled
          ? 'bg-[#FAFAF9]/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
          : 'bg-[#FAFAF9] border-b border-slate-200'
      }`}
    >
      <div className="flex items-center gap-8">
        <Link
          href="/"
          onClick={closeMenu}
          className="group flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-amber-600 rounded-md"
        >
          <span className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[#0B1B3D]">
            Dream<span className="text-amber-700 italic">Path</span>
          </span>
        </Link>

        {/* Desktop Nav Links (Zero-pill text links with subtle hover) */}
        <nav className="hidden lg:flex items-center gap-6" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-sans text-sm font-medium transition-colors hover:text-[#0B1B3D] focus-visible:outline-2 focus-visible:outline-amber-600 rounded ${
                  isActive ? 'text-[#0B1B3D] font-semibold' : 'text-slate-600'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Cmd+K Search Button */}
        <button
          onClick={triggerCmdK}
          aria-label="Open command search (Cmd+K)"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:text-slate-800 transition-colors shadow-2xs"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Search</span>
          <kbd className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            ⌘K
          </kbd>
        </button>

        {/* In-App Notifications */}
        <NotificationCenter />

        {/* User Auth Buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/login"
            className="font-sans text-sm font-medium text-slate-700 hover:text-[#0B1B3D] px-3 py-2 rounded-md transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className={buttonVariants({
              variant: 'default',
              size: 'sm',
              className: 'bg-[#0B1B3D] hover:bg-[#132A5C] text-white shadow-xs',
            })}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          ref={buttonRef}
          className="lg:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#0B1B3D] rounded-lg hover:bg-slate-100"
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          aria-label="Toggle navigation menu"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div
          id="mobile-menu"
          className="absolute top-full left-0 right-0 bg-[#FAFAF9] border-b border-slate-200 p-5 flex flex-col gap-3 lg:hidden shadow-lg animate-in slide-in-from-top-2 duration-150"
        >
          <button
            onClick={() => {
              closeMenu();
              triggerCmdK();
            }}
            className="w-full flex items-center justify-between p-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg min-h-[44px]"
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              Quick Command Palette
            </span>
            <kbd className="font-mono text-xs text-slate-400">⌘K</kbd>
          </button>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="p-3 min-h-[44px] flex items-center font-sans text-base font-medium text-slate-700 hover:text-[#0B1B3D] hover:bg-slate-100 rounded-lg"
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={closeMenu}
              className="p-3 min-h-[44px] flex items-center justify-center font-sans text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Log in
            </Link>
            <Link
              href="/register"
              onClick={closeMenu}
              className={buttonVariants({
                variant: 'default',
                className: 'w-full min-h-[44px] bg-[#0B1B3D] hover:bg-[#132A5C] text-white',
              })}
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
