'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fatal DreamPath Root Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col items-center justify-center bg-[#FAFAF9] text-slate-800 font-sans p-6 text-center space-y-4">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B1B3D]">Critical System Error</h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          A critical exception occurred at the root level of DreamPath. Your data remains secured.
        </p>
        <button 
          onClick={() => reset()}
          className="bg-[#0B1B3D] text-white text-xs font-bold py-3 px-6 rounded-xl hover:bg-[#132A5C] transition-colors"
        >
          Attempt Recovery
        </button>
      </body>
    </html>
  );
}
