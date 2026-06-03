"use client";
import { useState, useRef, useEffect, useCallback, type FormEvent, useMemo } from "react";
import { Category, VariantOption } from "@/types";
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Package, 
  Layers, 
  RefreshCw,
  FolderOpen,
  Settings,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useCategories, useAdminProducts } from "@/lib/swr";

export default function CategoriesPage() {
  const { data: categories = [], isLoading: loadingCategories, mutate: mutateCategories } = useCategories();
  const { data: products = [], mutate: mutateProducts } = useAdminProducts();
  const loading = loadingCategories;

  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addTiers, setAddTiers] = useState<VariantOption[]>([]);
  const [addFinishes, setAddFinishes] = useState<VariantOption[]>([]);
  const [savingAdd, setSavingAdd] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editTiers, setEditTiers] = useState<VariantOption[]>([]);
  const [editFinishes, setEditFinishes] = useState<VariantOption[]>([]);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshAll = () => {
    mutateCategories();
    mutateProducts();
  };

  // --- Add ---
  const handleAddSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addName.trim()) return;

    // Validate that all variant options have both value and label
    const validTiers = addTiers.filter(t => t.value.trim() && t.label.trim());
    const validFinishes = addFinishes.filter(f => f.value.trim() && f.label.trim());

    setSavingAdd(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          level: 1,
          parentId: null,
          sortOrder: 0,
          variantTiers: validTiers,
          variantFinishes: validFinishes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add category");
      }
      toast.success("Category added successfully");
      setShowAddModal(false);
      setAddName("");
      setAddTiers([]);
      setAddFinishes([]);
      refreshAll();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add category");
    } finally {
      setSavingAdd(false);
    }
  };

  // --- Edit ---
  const handleEditOpen = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditTiers((category.variantTiers as VariantOption[]) ?? []);
    setEditFinishes((category.variantFinishes as VariantOption[]) ?? []);
  };

  useEffect(() => {
    if (editingCategory) {
      setTimeout(() => {
        try {
          editInputRef.current?.focus();
          const len = editInputRef.current?.value?.length ?? 0;
          editInputRef.current?.setSelectionRange(len, len);
        } catch {}
      }, 0);
    }
  }, [editingCategory]);

  const handleEditClose = useCallback(() => {
    setEditingCategory(null);
    setEditName("");
    setEditTiers([]);
    setEditFinishes([]);
    setSavingEdit(false);
  }, []);

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    const validTiers = editTiers.filter(t => t.value.trim() && t.label.trim());
    const validFinishes = editFinishes.filter(f => f.value.trim() && f.label.trim());

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          variantTiers: validTiers,
          variantFinishes: validFinishes,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to update category");
      }

      toast.success("Category updated");
      handleEditClose();
      refreshAll();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update category");
    } finally {
      setSavingEdit(false);
    }
  };

  // --- Delete ---
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Category deleted");
      setDeleteTarget(null);
      refreshAll();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  // Mapped products count map for speed
  const productCountMap = useMemo(() => {
    const map: Record<number, number> = {};
    products.forEach((p) => {
      if (p.categoryId) {
        map[p.categoryId] = (map[p.categoryId] ?? 0) + 1;
      }
    });
    return map;
  }, [products]);

  if (loading) return <LoadingSpinner />;

  const totalCategories = categories.length;
  const categorizedProducts = products.filter((p) => p.categoryId !== null).length;

  const inputClass = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-white transition";

  return (
    <div className="max-w-full space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Categories &amp; Series</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your product lines, series taxonomy, and configure variant dimensions (tiers &amp; finishes) per category.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-whyte-blue text-white rounded-xl font-semibold text-sm hover:bg-whyte-light transition-all shadow-sm hover:shadow-md shrink-0 w-full sm:w-auto"
        >
          <Plus size={16} />
          Add Series / Category
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Card 1: Total Categories */}
        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-blue-50 text-whyte-blue rounded-xl">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product Categories / Series</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalCategories}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Top-level product catalog anchors</p>
          </div>
        </div>

        {/* Card 2: Categorized Products */}
        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Package size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Categorized Products</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{categorizedProducts}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Assigned to parent catalog lines</p>
          </div>
        </div>

      </div>

      {/* Categories List Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/30">
          <h2 className="font-semibold text-slate-800 text-sm">All Series &amp; Categories</h2>
          <button 
            onClick={refreshAll} 
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all bg-white shadow-sm"
            title="Refresh category list"
          >
            <RefreshCw size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="text-left px-5 py-4">Series / Category Name</th>
                <th className="text-left px-5 py-4 w-52">Variant Dimensions</th>
                <th className="text-left px-5 py-4 w-48">Mapped Products</th>
                <th className="text-right px-5 py-4 w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FolderOpen size={36} className="opacity-20 text-slate-900" />
                      <p className="font-semibold text-slate-500">No categories found</p>
                      <p className="text-xs text-slate-400">Click &quot;Add Series / Category&quot; above to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
              {categories.map((cat: Category) => {
                const count = productCountMap[cat.id] ?? 0;
                const tiers = (cat.variantTiers as VariantOption[]) ?? [];
                const finishes = (cat.variantFinishes as VariantOption[]) ?? [];
                const hasDimensions = tiers.length > 0 || finishes.length > 0;

                return (
                  <tr key={cat.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-800 text-sm">
                      {cat.name}
                    </td>
                    <td className="px-5 py-4">
                      {hasDimensions ? (
                        <div className="flex flex-wrap gap-1.5">
                          {tiers.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[10px] font-semibold">
                              <Settings size={9} /> {tiers.length} Tier{tiers.length > 1 ? "s" : ""}
                            </span>
                          )}
                          {finishes.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-md text-[10px] font-semibold">
                              <Settings size={9} /> {finishes.length} Finish{finishes.length > 1 ? "es" : ""}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-md text-[10px] font-semibold">
                          Single Price
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[11px] font-semibold">
                          <Package size={11} /> {count} Product{count > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-full text-[11px] font-semibold">
                          <Package size={11} /> 0 Products
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleEditOpen(cat)}
                          className="p-2 text-slate-400 hover:text-whyte-blue hover:bg-blue-50 rounded-xl transition-all"
                          title="Edit category & variant config"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cat)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Delete category"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-slate-100 bg-white">
          {categories.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              <FolderOpen size={32} className="mx-auto opacity-20 mb-2" />
              <p className="font-semibold">No categories seeded yet</p>
            </div>
          )}
          {categories.map((cat: Category) => {
            const count = productCountMap[cat.id] ?? 0;
            const tiers = (cat.variantTiers as VariantOption[]) ?? [];
            const finishes = (cat.variantFinishes as VariantOption[]) ?? [];
            const hasDimensions = tiers.length > 0 || finishes.length > 0;

            return (
              <div key={cat.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-sm">{cat.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditOpen(cat)}
                      className="p-2 text-slate-400 hover:text-whyte-blue hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(cat)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {hasDimensions ? (
                    <>
                      {tiers.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[9px] font-bold">
                          {tiers.length} Tier{tiers.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {finishes.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[9px] font-bold">
                          {finishes.length} Finish{finishes.length > 1 ? "es" : ""}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-200 rounded text-[9px] font-bold">
                      Single Price
                    </span>
                  )}
                  {count > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-semibold">
                      <Package size={10} /> {count} Product{count > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-full text-[10px] font-semibold">
                      <Package size={10} /> 0 Products
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setAddName(""); setAddTiers([]); setAddFinishes([]); }}
        title="Add Product Category / Series"
        size="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Category Name *
            </label>
            <input
              required
              autoFocus
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Tactus VLuxe, Retro Series"
            />
          </div>

          {/* Variant Tiers Config */}
          <VariantDimensionEditor
            label="Automation Tiers"
            description="Define available technology tiers for this series (e.g., WiFi, Zigbee). Leave empty for single-price products."
            items={addTiers}
            onChange={setAddTiers}
            valuePlaceholder="e.g. wifi"
            labelPlaceholder="e.g. WiFi Smart"
            inputClass={inputClass}
          />

          {/* Variant Finishes Config */}
          <VariantDimensionEditor
            label="Surface Finishes"
            description="Define available surface finishes for this series (e.g., Glass, Acrylic). Leave empty for no finish options."
            items={addFinishes}
            onChange={setAddFinishes}
            valuePlaceholder="e.g. glass"
            labelPlaceholder="e.g. Glass Panel"
            inputClass={inputClass}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowAddModal(false); setAddName(""); setAddTiers([]); setAddFinishes([]); }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingAdd || !addName.trim()}
              className="px-4 py-2.5 rounded-xl bg-whyte-blue text-white text-sm font-semibold hover:bg-whyte-light transition-all disabled:opacity-60 shadow-sm"
            >
              {savingAdd ? "Saving..." : "Add Category"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingCategory}
        onClose={handleEditClose}
        title="Edit Category & Variant Config"
        size="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Category Name *
            </label>
            <input
              ref={editInputRef}
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={inputClass}
              placeholder="Enter category name"
            />
          </div>

          {/* Variant Tiers Config */}
          <VariantDimensionEditor
            label="Automation Tiers"
            description="Technology tiers available for products in this series. Changes apply to new products only."
            items={editTiers}
            onChange={setEditTiers}
            valuePlaceholder="e.g. wifi"
            labelPlaceholder="e.g. WiFi Smart"
            inputClass={inputClass}
          />

          {/* Variant Finishes Config */}
          <VariantDimensionEditor
            label="Surface Finishes"
            description="Surface finish options for products in this series. Changes apply to new products only."
            items={editFinishes}
            onChange={setEditFinishes}
            valuePlaceholder="e.g. glass"
            labelPlaceholder="e.g. Glass Panel"
            inputClass={inputClass}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleEditClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit || !editName.trim()}
              className="px-4 py-2.5 rounded-xl bg-whyte-blue text-white text-sm font-semibold hover:bg-whyte-light transition-all disabled:opacity-60 shadow-sm"
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All associated product mappings will be cleared. This action is irreversible.`}
        isLoading={deleting}
      />

    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Reusable component for editing a list of variant options
// ──────────────────────────────────────────────────────────────
function VariantDimensionEditor({
  label,
  description,
  items,
  onChange,
  valuePlaceholder,
  labelPlaceholder,
  inputClass,
}: {
  label: string;
  description: string;
  items: VariantOption[];
  onChange: (items: VariantOption[]) => void;
  valuePlaceholder: string;
  labelPlaceholder: string;
  inputClass: string;
}) {
  const addItem = () => {
    onChange([...items, { value: "", label: "" }]);
  };

  const updateItem = (index: number, field: "value" | "label", val: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    // Auto-generate value from label if value is empty
    if (field === "label" && !next[index].value) {
      next[index].value = val.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    }
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2">No {label.toLowerCase()} configured — products will have no {label.toLowerCase()} dimension.</p>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
            <div className="col-span-4">Value (stored)</div>
            <div className="col-span-7">Display Label</div>
            <div className="col-span-1"></div>
          </div>

          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <div className="col-span-1 sm:col-span-4">
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => updateItem(i, "value", e.target.value)}
                  className={inputClass + " text-xs font-mono"}
                  placeholder={valuePlaceholder}
                />
              </div>
              <div className="col-span-1 sm:col-span-7">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateItem(i, "label", e.target.value)}
                  className={inputClass + " text-xs"}
                  placeholder={labelPlaceholder}
                />
              </div>
              <div className="col-span-1 sm:col-span-1 flex justify-end sm:justify-center">
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
