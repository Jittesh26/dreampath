'use client';

import { useState } from 'react';
import Link from 'next/link';
import { login } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

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
      // In Next.js App Router, redirect() throws a specific error to interrupt execution.
      // We must rethrow it so the framework handles the navigation.
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <Link href="/" className="font-instrument text-3xl font-bold tracking-tight text-primary hover:opacity-80 transition-opacity">
          DreamPath
        </Link>
        <h2 className="mt-6 font-instrument text-4xl font-bold tracking-tight text-primary">
          Sign in to your account
        </h2>
        <p className="mt-2 font-jakarta text-slate-500 text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-bold text-primary hover:underline underline-offset-4 transition-all">
            Sign up
          </Link>
        </p>
      </div>

      <Card className="sm:mx-auto sm:w-full sm:max-w-md bg-white border-slate-100 shadow-premium">
        <CardContent className="pt-8 px-4 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="assertive">
                <p className="text-sm text-red-800 font-medium font-jakarta">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-900 font-jakarta">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-12 w-full text-base bg-white"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-900 font-jakarta">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="h-12 w-full text-base bg-white pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full h-12 text-base font-bold" disabled={isPending}>
              {isPending ? 'Signing in...' : 'Sign in'}
            </Button>

            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500 font-jakarta">
                Demo Accounts: <span className="font-semibold text-slate-700">student@dreampath.my</span> or <span className="font-semibold text-slate-700">admin@dreampath.my</span>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
