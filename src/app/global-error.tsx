"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error caught by root boundary:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans antialiased">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 text-3xl">
            ⚠️
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Critical Application Error
          </h1>

          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            The application encountered a critical runtime error. Please try reloading the app.
          </p>

          {error.digest && (
            <div className="mb-6 p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-xs font-mono text-slate-500">
              Digest: {error.digest}
            </div>
          )}

          <button
            onClick={() => reset()}
            className="w-full px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-amber-500/10 cursor-pointer text-sm"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
