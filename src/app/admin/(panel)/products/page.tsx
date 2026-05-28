"use client";
import { useState } from "react";
import { Product, Category } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ProductForm from "@/components/admin/ProductForm";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useAdminProducts, useCategories } from "@/lib/swr";

export default function ProductsPage() {
  const { data: products = [], isLoading: loadingProducts, mutate: mutateProducts } = useAdminProducts();
  const { data: categories = [], mutate: mutateCategories } = useCategories();
  const loading = loadingProducts;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshAll = () => {
    mutateProducts();
    mutateCategories();
  };

  const filtered = products.filter((p: Product) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.code?.toLowerCase() ?? "").includes(search.toLowerCase());
    const matchType = typeFilter === "all" || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to delete product");
      }
      toast.success("Product deleted");
      setDeleteTarget(null);
      await mutateProducts();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (p: Product) => {
    try {
      await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      mutateProducts();
    } catch {
      toast.error("Failed to update");
    }
  };

  const typeLabels: Record<string, string> = {
    switch_board: "Switch Board",
    accessory: "Accessory",
    retrofit: "Retrofit",
    curtain: "Curtain",
    smart_lock: "Smart Lock",
    vdp: "VDP",
    other: "Other",
  };

  return (
    <div className="max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">{products.length} total products</p>
        </div>
        <button
          onClick={() => { setEditProduct(null); setShowForm(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-whyte-blue text-white rounded-xl font-medium text-sm hover:bg-whyte-light transition-colors shadow-sm w-full sm:w-auto"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          />
        </div>
        <div className="flex gap-2.5">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
          >
            <option value="all">All Types</option>
            {Object.entries(typeLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button onClick={refreshAll} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shrink-0">
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Table — desktop / Cards — mobile */}
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Image</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                        No products found
                      </td>
                    </tr>
                  )}
                  {filtered.map((p: Product) => (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.isActive ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        {p.imageUrl ? (
                          <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden bg-white flex items-center justify-center">
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-100" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                          {p.description && <p className="text-gray-400 text-xs truncate max-w-xs">{p.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm font-mono">{p.code ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium">
                          {typeLabels[p.type] ?? p.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{formatCurrency(p.price)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggle(p)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          {p.isActive ? (
                            <ToggleRight size={24} className="text-green-500" />
                          ) : (
                            <ToggleLeft size={24} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setEditProduct(p); setShowForm(true); }}
                            className="p-1.5 text-gray-400 hover:text-whyte-blue hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
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
                No products found
              </div>
            )}
            {filtered.map((p: Product) => (
              <div key={p.id} className={`bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm ${!p.isActive ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  {/* Image */}
                  {p.imageUrl ? (
                    <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden bg-white flex items-center justify-center shrink-0">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-100 shrink-0" />
                  )}
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[11px] rounded font-medium">
                        {typeLabels[p.type] ?? p.type}
                      </span>
                      {p.code && <span className="text-[11px] text-gray-400 font-mono">{p.code}</span>}
                    </div>
                  </div>
                  
                  {/* Toggle */}
                  <button onClick={() => handleToggle(p)} className="text-gray-400 hover:text-gray-600 shrink-0">
                    {p.isActive ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                  </button>
                </div>

                {/* Bottom: Price + Actions */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50">
                  <p className="font-semibold text-gray-900 text-sm">{formatCurrency(p.price)}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditProduct(p); setShowForm(true); }}
                      className="p-2 text-gray-400 hover:text-whyte-blue hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditProduct(null); }}
        title={editProduct ? "Edit Product" : "Add Product"}
        size="lg"
      >
        <ProductForm
          product={editProduct}
          categories={categories}
          onSuccess={() => { setShowForm(false); setEditProduct(null); mutateProducts(); }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Permanently delete "${deleteTarget?.name}"? This action cannot be undone.`}
        isLoading={deleting}
      />
    </div>
  );
}
