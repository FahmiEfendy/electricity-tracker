import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-3xl font-[family-name:var(--font-outfit)]">
          404
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-2 font-[family-name:var(--font-outfit)]">
          Page Not Found
        </h1>

        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          The page or resource you are looking for does not exist or has been moved.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-all duration-200 shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer text-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
