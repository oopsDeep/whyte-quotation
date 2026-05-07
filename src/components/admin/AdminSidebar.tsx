"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Tag,
  Home,
  DoorOpen,
  FileText,
  Building2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/house-types", label: "House Types", icon: Home },
  { href: "/admin/room-types", label: "Room Types", icon: DoorOpen },
  { href: "/admin/quotations", label: "Quotations", icon: FileText },
  { href: "/admin/company", label: "Company", icon: Building2 },
];

export default function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="w-full bg-whyte-dark flex flex-col h-full">
      {/* Nav */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-whyte-light text-white shadow-lg shadow-blue-900/30"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 sm:p-4 border-t border-white/10 shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
