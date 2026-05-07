import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";
import StatusBadge from "@/components/shared/StatusBadge";
import { QuotationStatus } from "@/types";

export default async function HomePage() {
  let quotations: any[] = [];

  try {
    quotations = await prisma.quotation.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch (error) {
    console.error("Database connection failed:", error);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Create and manage client quotations</p>
        </div>
        <Link
          href="/quotation/new"
          className="flex items-center justify-center gap-2 px-5 py-3 bg-whyte-blue text-white rounded-xl font-semibold text-sm hover:bg-whyte-light transition-all shadow-lg shadow-blue-900/20 w-full sm:w-auto"
        >
          <Plus size={18} />
          New Quotation
        </Link>
      </div>

      {quotations.length === 0 ? (
        <div className="text-center py-16 sm:py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <FileText size={48} className="mx-auto text-gray-200 mb-4" />
          <h2 className="text-lg font-semibold text-gray-600 mb-2">No quotations yet</h2>
          <p className="text-gray-400 text-sm mb-6">Create your first quotation to get started</p>
          <Link
            href="/quotation/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-whyte-blue text-white rounded-xl font-semibold text-sm hover:bg-whyte-light transition"
          >
            <Plus size={16} />
            Create Quotation
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">QT Number</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900 text-sm">{q.quotationNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-sm">{q.clientName}</p>
                        {q.clientPhone && <p className="text-gray-400 text-xs">{q.clientPhone}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{formatDate(q.createdAt)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={q.status as QuotationStatus} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/quotation/${q.id}`}
                          className="text-sm text-whyte-light font-medium hover:underline"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {quotations.map((q) => (
              <Link
                key={q.id}
                href={`/quotation/${q.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold text-gray-900 text-sm">{q.quotationNumber}</p>
                    <p className="font-medium text-gray-700 text-sm mt-0.5 truncate">{q.clientName}</p>
                    {q.clientPhone && <p className="text-gray-400 text-xs mt-0.5">{q.clientPhone}</p>}
                  </div>
                  <StatusBadge status={q.status as QuotationStatus} />
                </div>
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-50">
                  <span className="text-xs text-gray-400">{formatDate(q.createdAt)}</span>
                  <span className="text-xs text-whyte-light font-medium">Open →</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
