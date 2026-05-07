"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkScreen = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Auto-close sidebar when resizing to mobile
      if (mobile) setIsOpen(false);
    };
    
    // Initial setup
    const mobile = window.innerWidth < 1024;
    setIsMobile(mobile);
    setIsOpen(!mobile);
    
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-gray-50 w-full">
      {/* Top Header */}
      <header className="h-[56px] sm:h-[64px] lg:h-[72px] shrink-0 bg-whyte-dark border-b border-white/10 flex items-center px-3 sm:px-4 md:px-6 z-50 sticky top-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-white/60 hover:text-white p-2 -ml-1 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Toggle Sidebar"
        >
          {isOpen && isMobile ? <X size={22} /> : <Menu size={22} />}
        </button>
        <Link
          href="/"
          className="ml-3 sm:ml-4 inline-flex items-center rounded-xl bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 hover:bg-gray-100 transition shadow-sm"
          aria-label="Go to home"
        >
          <Image
            src="/company-logo.png"
            alt="Whyte logo"
            width={152}
            height={38}
            priority
            className="h-6 sm:h-7 w-auto object-contain"
          />
        </Link>
      </header>

      {/* Body Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Overlay */}
        {isMobile && isOpen && (
          <div 
            className="fixed inset-0 top-[56px] sm:top-[64px] lg:top-[72px] bg-black/50 z-30 lg:hidden transition-opacity"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Sidebar Container */}
        <div 
          className={`
            fixed top-[56px] sm:top-[64px] lg:top-[72px] bottom-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
            w-60 lg:w-64 xl:w-72 bg-whyte-dark
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <AdminSidebar onClose={() => isMobile && setIsOpen(false)} />
        </div>

        {/* Main Content */}
        <main 
          className={`
            flex-1 overflow-auto min-w-0 flex flex-col bg-gray-50
            transition-all duration-300 ease-in-out w-full
            ${isOpen && !isMobile ? "lg:ml-64 xl:ml-72" : "ml-0"}
          `}
        >
          <div className="p-3 sm:p-4 md:p-6 xl:p-8 flex-1 max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
