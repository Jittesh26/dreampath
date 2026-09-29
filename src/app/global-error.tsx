'use client'; // Global error boundaries must be Client Components

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-zinc-900 font-sans p-4 text-center">
        <h1 className="text-4xl font-black text-red-600 mb-4">Critical System Error</h1>
        <p className="text-zinc-600 mb-8 max-w-lg">
          A fatal error occurred at the root level of DreamPath. We apologize for the inconvenience.
        </p>
        <button 
          onClick={() => reset()}
          className="bg-blue-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-800 transition-colors"
        >
          Attempt Recovery
        </button>
      </body>
    </html>
  );
}
