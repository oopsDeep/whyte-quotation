import { prisma } from "@/lib/prisma";
import { Package, FileText, Tag, Home } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import StatusBadge from "@/components/shared/StatusBadge";
import { QuotationStatus } from "@/types";

export default async function DashboardPage() {
  const [productCount, quotationCount, recentQuotations] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.quotation.count(),
    prisma.quotation.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { houseType: true },
    }),
  ]);

  const stats = [
    { label: "Active Products", value: productCount, icon: Package, color: "bg-blue-50 text-blue-600", href: "/admin/products" },
    { label: "Total Quotations", value: quotationCount, icon: FileText, color: "bg-purple-50 text-purple-600", href: "/admin/quotations" },
  ];

  return (
    <div className="max-w-full">
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Welcome to Whyte Automations Admin Panel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`p-2.5 sm:p-3 rounded-xl ${stat.color}`}>
                  <Icon size={20} className="sm:hidden" />
                  <Icon size={22} className="hidden sm:block" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 group-hover:text-whyte-blue transition-colors">
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-8">
        {[
          { href: "/admin/categories", label: "Manage Categories", icon: Tag, desc: "Flat product lines & series" },
          { href: "/admin/house-types", label: "House Types", icon: Home, desc: "Room templates" },
        ].map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 hover:border-whyte-light hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 mb-1.5 sm:mb-2">
                <Icon size={18} className="text-whyte-blue" />
                <span className="font-semibold text-gray-800 text-sm">{link.label}</span>
              </div>
              <p className="text-gray-400 text-xs">{link.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent Quotations */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Recent Quotations</h2>
          <Link href="/admin/quotations" className="text-xs sm:text-sm text-whyte-light hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentQuotations.length === 0 && (
            <div className="p-6 sm:p-8 text-center text-gray-400 text-sm">No quotations yet</div>
          )}
          {recentQuotations.map((q) => (
            <Link
              key={q.id}
              href={`/quotation/${q.id}`}
              className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 hover:bg-gray-50 transition-colors gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 text-sm truncate">{q.quotationNumber}</p>
                <p className="text-gray-400 text-xs truncate">{q.clientName}</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="text-gray-400 text-[11px] sm:text-xs hidden sm:inline">{formatDate(q.createdAt)}</span>
                <StatusBadge status={q.status as QuotationStatus} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
