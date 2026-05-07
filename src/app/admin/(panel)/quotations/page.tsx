"use client";
import { useState } from "react";
import Link from "next/link";
import { Quotation, QuotationStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Trash2, ExternalLink, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useQuotations } from "@/lib/swr";

const STATUSES: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminQuotationsPage() {
  const { data: quotations = [], isLoading: loading, mutate } = useQuotations();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = quotations.filter((q: Quotation) => {
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    const matchSearch =
      !search ||
      q.clientName.toLowerCase().includes(search.toLowerCase()) ||
      q.quotationNumber.toLowerCase().includes(search.toLowerCase()) ||
      (q.clientPhone ?? "").includes(search);
    return matchStatus && matchSearch;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotations/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Quotation deleted");
      setDeleteTarget(null);
      mutate();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (q: Quotation, status: QuotationStatus) => {
    try {
      const res = await fetch(`/api/quotations/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      mutate();
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="max-w-full">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Quotations</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">{quotations.length} total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Status Tabs — scrollable on mobile */}
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-max sm:w-auto">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  statusFilter === s.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, number or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 sm:py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rooms</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                        No quotations found
                      </td>
                    </tr>
                  )}
                  {filtered.map((q: Quotation) => (
                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900 text-sm">{q.quotationNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-sm">{q.clientName}</p>
                        {q.clientPhone && <p className="text-gray-400 text-xs">{q.clientPhone}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{formatDate(q.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{q.rooms?.length ?? 0}</td>
                      <td className="px-4 py-3">
                        <select
                          value={q.status}
                          onChange={(e) => handleStatusChange(q, e.target.value as QuotationStatus)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-200 bg-white"
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <Link
                            href={`/quotation/${q.id}`}
                            className="p-1.5 text-gray-400 hover:text-whyte-blue hover:bg-blue-50 rounded-lg transition"
                            title="Open quotation in estimator"
                          >
                            <ExternalLink size={15} />
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(q)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete quotation"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
                No quotations found
              </div>
            )}
            {filtered.map((q: Quotation) => (
              <div key={q.id} className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold text-gray-900 text-sm">{q.quotationNumber}</p>
                    <p className="font-medium text-gray-700 text-sm truncate mt-0.5">{q.clientName}</p>
                    {q.clientPhone && <p className="text-gray-400 text-xs mt-0.5">{q.clientPhone}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{q.rooms?.length ?? 0} rooms</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <select
                      value={q.status}
                      onChange={(e) => handleStatusChange(q, e.target.value as QuotationStatus)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-200 bg-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <span className="text-[11px] text-gray-400">{formatDate(q.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/quotation/${q.id}`}
                      className="p-2 text-gray-400 hover:text-whyte-blue hover:bg-blue-50 rounded-lg transition"
                    >
                      <ExternalLink size={16} />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(q)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Delete quotation "${deleteTarget?.quotationNumber}" for ${deleteTarget?.clientName}? All rooms and items will be permanently deleted.`}
        isLoading={deleting}
      />
    </div>
  );
}
