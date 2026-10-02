'use client';

import { useState } from 'react';
import Link from 'next/link';
import { register } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, ShieldCheck, GraduationCap } from 'lucide-react';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsPending(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsPending(false);
      return;
    }

    try {
      const result = await register(formData);
      if (result?.error) {
        setError(result.error);
        setIsPending(false);
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Ambient background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-blue-100/40 via-indigo-50/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8 relative z-10">
        <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 border border-blue-500/30 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
            <GraduationCap className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-sans font-black text-xl tracking-tight text-slate-950 leading-none">
              Dream<span className="text-blue-700">Path</span>
            </span>
            <span className="text-[10px] tracking-widest text-slate-400 uppercase font-bold mt-0.5">
              Malaysia
            </span>
          </div>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
          Create your student <span className="font-serif italic font-normal text-blue-900">account</span>
        </h2>
        <p className="mt-2 text-slate-600 text-xs sm:text-sm font-normal">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-blue-700 hover:text-blue-800 underline underline-offset-4 transition-all">
            Sign in
          </Link>
        </p>
      </div>

      <Card className="sm:mx-auto sm:w-full sm:max-w-md bg-white border-slate-200/90 shadow-2xs rounded-2xl relative z-10">
        <CardContent className="pt-8 px-6 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl" role="alert" aria-live="assertive">
                <p className="text-xs text-rose-800 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block text-xs font-bold text-slate-700">
                Full name
              </label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                className="h-11 w-full text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                placeholder="e.g. Jittesh Amaran"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold text-slate-700">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-11 w-full text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="h-11 w-full text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white pr-10 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                  placeholder="Create a secure password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-700">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="h-11 w-full text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium"
                placeholder="Confirm your password"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-11 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-all cursor-pointer"
              disabled={isPending}
            >
              {isPending ? 'Creating account...' : 'Create Student Account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 relative z-10 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>End-to-end verified session • Malaysian PDPA compliant</span>
      </div>
    </div>
  );
}
