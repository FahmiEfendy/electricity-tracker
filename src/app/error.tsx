"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorSegment({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service or console
    console.error("Segment error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-center">
        {/* Warning / Error Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 text-3xl">
          ⚡
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-2 font-[family-name:var(--font-outfit)]">
          Something went wrong
        </h2>

        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          An unexpected error occurred while loading this section. You can try refreshing the view.
        </p>

        {error.digest && (
          <div className="mb-6 p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-xs font-mono text-slate-500 overflow-x-auto">
            Digest: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer text-sm"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all duration-200 border border-slate-700 active:scale-95 cursor-pointer text-sm inline-flex items-center justify-center"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
