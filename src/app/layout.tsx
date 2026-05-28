import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "⚡ Electricity Tracker — Monitor Your kWh & Costs",
  description:
    "Track your daily electricity usage, monitor kWh consumption, and analyze costs in Indonesian Rupiah. Simple, beautiful, and responsive.",
  keywords: ["electricity", "tracker", "kWh", "Indonesia", "cost", "monitoring"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="id" className="dark">
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        <SessionProvider session={session}>
          <div className="relative z-10 min-h-screen">{children}</div>
        </SessionProvider>
      </body>
    </html>
  );
}
