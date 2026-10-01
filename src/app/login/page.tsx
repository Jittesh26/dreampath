'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
        setIsPending(false);
      }
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <Link href="/" className="font-serif text-3xl font-bold tracking-tight text-[#0B1B3D] hover:opacity-80 transition-opacity">
          DreamPath
        </Link>
        <h2 className="mt-5 font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#0B1B3D]">
          Sign in to your account
        </h2>
        <p className="mt-2 text-slate-500 text-xs sm:text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-amber-900 hover:text-amber-950 underline underline-offset-4 transition-all">
            Create an account
          </Link>
        </p>
      </div>

      <Card className="sm:mx-auto sm:w-full sm:max-w-md bg-white border-slate-200/90 shadow-xs rounded-xl">
        <CardContent className="pt-8 px-6 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-lg" role="alert" aria-live="assertive">
                <p className="text-xs text-red-800 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-11 w-full text-xs bg-slate-50 border-slate-200 rounded-lg focus:bg-white"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="h-11 w-full text-xs bg-slate-50 border-slate-200 rounded-lg focus:bg-white pr-10"
                  placeholder="••••••••"
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

            <Button
              type="submit"
              size="lg"
              className="w-full h-11 text-xs font-semibold bg-[#0B1B3D] hover:bg-[#0B1B3D]/90 text-white rounded-lg shadow-2xs transition-all cursor-pointer"
              disabled={isPending}
            >
              {isPending ? 'Signing in...' : 'Sign in'}
            </Button>

            <div className="pt-2 text-center border-t border-slate-100">
              <p className="text-[11px] text-slate-500">
                Demo Accounts: <span className="font-semibold text-slate-700">student@dreampath.my</span> or <span className="font-semibold text-slate-700">admin@dreampath.my</span>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
        <span>End-to-end encrypted session • Malaysian PDPA compliant</span>
      </div>
    </div>
  );
}
