import Link from "next/link";
import Image from "next/image";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 md:px-6 md:py-3.5 lg:px-8 lg:py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center rounded-xl px-2 py-1.5 md:px-2.5 md:py-2 hover:bg-gray-50 transition"
            aria-label="Go to home"
          >
            <Image
              src="/company-logo.png"
              alt="Whyte logo"
              width={176}
              height={44}
              priority
              className="h-9 md:h-10 w-auto object-contain"
            />
          </Link>
          <Link
            href="/admin/dashboard"
            className="text-xs md:text-sm lg:text-base text-gray-400 hover:text-gray-600 transition"
          >
            Admin →
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">{children}</main>
    </div>
  );
}
