"use client";
import Link from "next/link";
import Image from "next/image";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2.5 md:px-6 md:py-3 lg:px-8 lg:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center rounded-xl px-2 py-1 hover:bg-gray-50 transition shrink-0"
              aria-label="Go to home"
            >
              <Image
                src="/company-logo.png"
                alt="Whyte logo"
                width={220}
                height={54}
                priority
                className="h-[44px] md:h-[52px] w-auto object-contain"
              />
            </Link>
            <div id="header-portal" className="min-w-0" />
          </div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center h-9 px-3.5 rounded-xl text-xs md:text-sm font-semibold text-gray-500 hover:text-gray-800 border border-gray-200 hover:bg-gray-50 transition-all shrink-0 select-none shadow-xs"
          >
            Admin →
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">{children}</main>
    </div>
  );
}
