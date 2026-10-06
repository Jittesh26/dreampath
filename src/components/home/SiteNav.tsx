'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  User as UserIcon,
  Briefcase,
  Shield,
  LogOut,
} from 'lucide-react';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client';
import { logout } from '@/app/actions/auth';
import type { AuthUserInfo } from '@/lib/auth-user';

export function SiteNav({ initialUser }: { initialUser?: AuthUserInfo | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<AuthUserInfo | null>(initialUser ?? null);
  const [prevInitialUser, setPrevInitialUser] = useState(initialUser);

  if (initialUser !== prevInitialUser) {
    setPrevInitialUser(initialUser);
    setUser(initialUser ?? null);
  }

  const buttonRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Scroll listener for translucent background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Client-side authentication listener & fallback check
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // If initialUser was not passed by the server, check client-side session immediately
    if (initialUser === undefined) {
      supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
        if (data?.user) {
          const u = data.user;
          const name = (
            u.user_metadata?.full_name ||
            u.user_metadata?.name ||
            u.email?.split('@')[0] ||
            'Student'
          ).trim();
          setUser({
            id: u.id,
            email: u.email || '',
            name,
            role: 'student',
          });
        } else {
          setUser(null);
        }
      });
    }

    // Subscribe to auth state changes across navigation & logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (session?.user) {
        const u = session.user;
        const name = (
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.email?.split('@')[0] ||
          'Student'
        ).trim();
        setUser((prev) => ({
          id: u.id,
          email: u.email || '',
          name,
          role: prev?.role || 'student',
        }));
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsUserMenuOpen(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [initialUser]);

  // Click outside to close user dropdown menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation listener (Escape closes menus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isOpen) {
          setIsOpen(false);
          buttonRef.current?.focus();
        }
        if (isUserMenuOpen) {
          setIsUserMenuOpen(false);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUserMenuOpen]);

  const closeMenu = () => {
    setIsOpen(false);
    setIsUserMenuOpen(false);
  };

  const handleScrollToAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    closeMenu();
    if (href.startsWith('/#') && pathname === '/') {
      e.preventDefault();
      const targetId = href.replace('/#', '');
      const el = document.getElementById(targetId);
      if (el) {
        const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: isReduced ? 'auto' : 'smooth' });
        window.history.pushState(null, '', href);
      }
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    closeMenu();
    if (pathname === '/') {
      e.preventDefault();
      const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: isReduced ? 'auto' : 'smooth' });
      if (window.location.hash) {
        window.history.pushState(null, '', '/');
      }
    }
  };

  const navLinks = [
    { href: '/scholarships', label: 'Scholarships' },
    { href: '/eligibility', label: 'Eligibility' },
    { href: '/student/applications', label: 'Tracker & Tools' },
    { href: '/#architecture', label: 'How It Works' },
    { href: '/about', label: 'About' },
  ];

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

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
          onClick={handleLogoClick}
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
              Malaysian Scholarship Intelligence
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
                onClick={(e) => handleScrollToAnchor(e, link.href)}
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

        {/* Right Actions: Authenticated Identity UI OR Log In / Sign Up */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
                aria-label="User profile menu"
                className="hidden sm:inline-flex items-center gap-2 pl-1.5 pr-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-full transition-all cursor-pointer group shadow-2xs"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center border border-slate-700/60 shrink-0">
                  {userInitial}
                </div>
                <span className="font-semibold text-[13px] text-slate-800 group-hover:text-slate-950 max-w-[130px] truncate">
                  {user.name}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200/90 shadow-xl p-2 z-50 text-xs font-semibold text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mb-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {user.role === 'admin' ? 'System Administrator' : 'Verified Student'}
                    </p>
                    <p className="font-bold text-slate-900 truncate mt-0.5">{user.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
                  </div>

                  <Link
                    href="/student"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-slate-400" />
                    <span>Student Workspace</span>
                  </Link>

                  <Link
                    href="/student/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>Academic Profile</span>
                  </Link>

                  <Link
                    href="/student/applications"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span>Application Tracker</span>
                  </Link>

                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 text-purple-900 font-bold transition-colors"
                    >
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span>Admin Console</span>
                    </Link>
                  )}

                  <div className="pt-1.5 mt-1.5 border-t border-slate-100">
                    <form action={logout}>
                      <button
                        type="submit"
                        className="w-full flex items-center justify-between px-3 py-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50/60 rounded-xl transition-colors cursor-pointer"
                      >
                        <span>Sign Out</span>
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}

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
              onClick={(e) => handleScrollToAnchor(e, link.href)}
              className="p-3 min-h-[44px] flex items-center text-[15px] font-semibold text-slate-700 hover:text-[#0F172A] hover:bg-slate-50 rounded-xl"
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {userInitial}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-xs text-slate-900 truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              <Link
                href="/student"
                onClick={closeMenu}
                className="p-3 min-h-[44px] flex items-center gap-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                <span>Student Workspace</span>
              </Link>

              <Link
                href="/student/profile"
                onClick={closeMenu}
                className="p-3 min-h-[44px] flex items-center gap-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span>Academic Profile</span>
              </Link>

              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className="p-3 min-h-[44px] flex items-center gap-2 text-sm font-bold text-purple-900 hover:bg-purple-50 rounded-xl"
                >
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Admin Console</span>
                </Link>
              )}

              <form action={logout}>
                <button
                  type="submit"
                  className="w-full p-3 min-h-[44px] flex items-center justify-between text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  <span>Sign Out</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
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
          )}
        </div>
      )}
    </header>
  );
}
