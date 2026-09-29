'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('DreamPath Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#FAFAF9] text-center px-4 space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h2 className="font-serif text-3xl font-bold text-[#0B1B3D]">Something went wrong</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          An unexpected issue interrupted your session. Verified data is preserved safely.
        </p>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-[#0B1B3D] text-white text-xs font-bold rounded-xl hover:bg-[#132A5C] transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
