"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

interface HeaderProps {
  onShowImport?: () => void;
}

export default function Header({ onShowImport }: HeaderProps) {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
              <div className="flex items-center gap-3">
                {/* 1. Admin Badge */}
                <span className="badge badge-success">Admin</span>

                {/* 2. Email */}
                <span className="text-sm text-text-secondary hidden sm:inline">
                  {session.user.email}
                </span>

                {/* 3. Profile Circle with Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className="w-9 h-9 rounded-full bg-accent/20 hover:bg-accent/35 border border-accent/25 text-accent flex items-center justify-center font-bold text-sm select-none cursor-pointer focus:outline-none transition-colors"
                  >
                    {session.user.email?.charAt(0).toUpperCase() || "A"}
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-bg-secondary/95 border border-border backdrop-blur-xl shadow-2xl py-1.5 z-50 animate-fade-in origin-top-right">
                      {onShowImport && (
                        <button
                          onClick={() => {
                            onShowImport();
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-accent/15 hover:text-accent transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span>📥</span> Import Spreadsheet Data
                        </button>
                      )}
                      <button
                        onClick={() => {
                          signOut();
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors flex items-center gap-2 cursor-pointer border-t border-border/50"
                      >
                        <span>🚪</span> Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
