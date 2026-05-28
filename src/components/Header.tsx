"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border backdrop-blur-xl bg-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer">
            <span className="text-2xl">⚡</span>
            <div>
              <h1
                className="text-lg font-bold font-[family-name:var(--font-outfit)] gradient-text"
                style={{ lineHeight: 1.2 }}
              >
                Electricity Tracker
              </h1>
              <p className="text-xs text-text-muted hidden sm:block">
                Monitor your kWh &amp; costs
              </p>
            </div>
          </div>

          {/* Nav — always visible, condensed on mobile */}
          <div className="flex items-center gap-3">
            {session?.user ? (
              <>
                <span className="badge badge-success">Admin</span>
                <span className="text-sm text-text-secondary hidden sm:inline">
                  {session.user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="btn-secondary text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="btn-primary text-sm">
                Admin Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
