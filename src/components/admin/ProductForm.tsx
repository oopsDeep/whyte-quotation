"use client";
import { useState, useCallback } from "react";
import { Product, Category, MatrixDimension } from "@/types";
import toast from "react-hot-toast";
import { ImagePlus, X, Plus, Trash2, Grid3X3, Tag } from "lucide-react";

const PRODUCT_TYPES = [
  { value: "switch_board", label: "Switch Board" },
  { value: "accessory", label: "Accessory" },
  { value: "retrofit", label: "Retrofit" },
  { value: "curtain", label: "Curtain" },
  { value: "smart_lock", label: "Smart Lock" },
  { value: "vdp", label: "VDP" },
  { value: "other", label: "Other" },
];

interface VariantRow {
  id: string; // local key
  config: Record<string, string>; // e.g. { series: "wifi", finish: "glass" }
  price: string;
  isActive: boolean;
}

interface Props {
  product: Product | null;
  categories: Category[];
  onSuccess: () => void;
}

function flattenCategories(cats: Category[], prefix = ""): { id: number; label: string; level: number }[] {
  const result: { id: number; label: string; level: number }[] = [];
  for (const cat of cats) {
    result.push({ id: cat.id, label: prefix + cat.name, level: cat.level });
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, prefix + "  "));
    }
  }
  return result;
}

/** Generate all combinations of dimension options */
function generateCombinations(dimensions: MatrixDimension[]): Record<string, string>[] {
  if (dimensions.length === 0) return [{}];
  const [first, ...rest] = dimensions;
  const restCombinations = generateCombinations(rest);
  return first.options.flatMap((opt) =>
    restCombinations.map((combo) => ({ [first.key]: opt, ...combo }))
  );
}

function configKey(config: Record<string, string>) {
  return JSON.stringify(config, Object.keys(config).sort());
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProductForm({ product, categories, onSuccess }: Props) {
  // Initialize from existing product variants
  const initVariants = (): VariantRow[] => {
    if (product?.variants && product.variants.length > 0) {
      return product.variants.map((v, i) => ({
        id: `v-${i}`,
        config: v.config ?? {},
        price: v.price,
        isActive: v.isActive,
      }));
    }
    return [{ id: "v-0", config: {}, price: "", isActive: true }];
  };

  const initDimensions = (): MatrixDimension[] => {
    if (product?.matrixDimensions && product.matrixDimensions.length > 0) {
      return product.matrixDimensions;
    }
    return [];
  };

  const [form, setForm] = useState({
    imageUrl: product?.imageUrl ?? "",
    name: product?.name ?? "",
    code: product?.code ?? "",
    description: product?.description ?? "",
    type: product?.type ?? "switch_board",
    categoryId: product?.categoryId ? String(product.categoryId) : "",
    unit: product?.unit ?? "pcs",
    notes: product?.notes ?? "",
    moduleSize: product?.moduleSize ?? "",
    isActive: product?.isActive ?? true,
    isMatrix: product?.isMatrix ?? false,
  });

  const [dimensions, setDimensions] = useState<MatrixDimension[]>(initDimensions);
  const [variants, setVariants] = useState<VariantRow[]>(initVariants);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const flatCats = flattenCategories(categories);

  // ── Image helpers ────────────────────────────────────────────────────────

  const getPublicIdFromUrl = (url: string) => {
    if (!url) return null;
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) return null;
      const marker = `${cloudName}/image/upload/`;
      const markerIndex = url.indexOf(marker);
      if (markerIndex === -1) return null;
      const path = url.slice(markerIndex + marker.length);
      return path.replace(/^v\d+\//, "").replace(/\.[^.]+$/, "") || null;
    } catch {
      return null;
    }
  };

  const deleteUploadedImage = async (url: string) => {
    const publicId = getPublicIdFromUrl(url);
    if (!publicId) return;
    await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId }),
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG, and WEBP files are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be 2MB or less");
      return;
    }
    const prevUrl = form.imageUrl;
    setUploadingImage(true);
    try {
      const payload = new FormData();
      payload.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: payload });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to upload image");
      setForm((f) => ({ ...f, imageUrl: data.url }));
      if (prevUrl) await deleteUploadedImage(prevUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    const url = form.imageUrl;
    if (!url) return;
    setUploadingImage(true);
    try {
      await deleteUploadedImage(url);
      setForm((f) => ({ ...f, imageUrl: "" }));
      toast.success("Image removed");
    } catch {
      setForm((f) => ({ ...f, imageUrl: "" }));
      toast.error("Image removed from form, but cloud cleanup failed");
    } finally {
      setUploadingImage(false);
    }
  };

  // ── Dimension builder helpers ─────────────────────────────────────────────

  const addDimension = () => {
    const newDim: MatrixDimension = { key: `dim${dimensions.length + 1}`, label: "", options: [] };
    setDimensions((d) => [...d, newDim]);
    // Rebuild variants for new combinations
    rebuildVariants([...dimensions, newDim]);
  };

  const updateDimension = (index: number, field: "key" | "label", value: string) => {
    const next = dimensions.map((d, i) => (i === index ? { ...d, [field]: value } : d));
    setDimensions(next);
    rebuildVariants(next);
  };

  const addOption = (dimIndex: number, option: string) => {
    const trimmed = option.trim().toLowerCase();
    if (!trimmed) return;
    const next = dimensions.map((d, i) =>
      i === dimIndex && !d.options.includes(trimmed)
        ? { ...d, options: [...d.options, trimmed] }
        : d
    );
    setDimensions(next);
    rebuildVariants(next);
  };

  const removeOption = (dimIndex: number, opt: string) => {
    const next = dimensions.map((d, i) =>
      i === dimIndex ? { ...d, options: d.options.filter((o) => o !== opt) } : d
    );
    setDimensions(next);
    rebuildVariants(next);
  };

  const removeDimension = (index: number) => {
    const next = dimensions.filter((_, i) => i !== index);
    setDimensions(next);
    rebuildVariants(next);
  };

  const rebuildVariants = useCallback(
    (dims: MatrixDimension[]) => {
      if (!form.isMatrix || dims.length === 0) return;
      const combos = generateCombinations(dims.filter((d) => d.options.length > 0));
      // Preserve existing prices where possible
      const priceMap = new Map(variants.map((v) => [configKey(v.config), v.price]));
      setVariants(
        combos.map((config, i) => ({
          id: `v-${i}`,
          config,
          price: priceMap.get(configKey(config)) ?? "",
          isActive: true,
        }))
      );
    },
    [form.isMatrix, variants]
  );

  const toggleMatrix = (on: boolean) => {
    setForm((f) => ({ ...f, isMatrix: on }));
    if (on) {
      setDimensions([]);
      setVariants([]);
    } else {
      setDimensions([]);
      setVariants([{ id: "v-0", config: {}, price: "", isActive: true }]);
    }
  };

  const updateVariantPrice = (id: string, price: string) => {
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, price } : v)));
  };

  const toggleVariantActive = (id: string, isActive: boolean) => {
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, isActive } : v)));
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Validate
      if (form.isMatrix && variants.some((v) => v.isActive && (!v.price || isNaN(Number(v.price))))) {
        toast.error("All active matrix variant prices must be filled in");
        setSaving(false);
        return;
      }
      if (!form.isMatrix && (!variants[0]?.price || isNaN(Number(variants[0]?.price)))) {
        toast.error("Price is required");
        setSaving(false);
        return;
      }

      const body = {
        name: form.name,
        code: form.code || null,
        description: form.description || null,
        type: form.type,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        unit: form.unit || "pcs",
        imageUrl: form.imageUrl || null,
        moduleSize: form.moduleSize || null,
        notes: form.notes || null,
        isActive: form.isActive,
        sortOrder: 0,
        isMatrix: form.isMatrix,
        matrixDimensions: form.isMatrix ? dimensions : null,
        variants: variants.map((v) => ({
          config: v.config,
          price: Number(v.price || 0),
          isActive: v.isActive,
          // Set legacy fields from config for backward compat
          automationTier: v.config.series || null,
          surfaceFinish: v.config.finish || null,
        })),
      };

      const res = await fetch(
        product ? `/api/products/${product.id}` : "/api/products",
        {
          method: product ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success(product ? "Product updated!" : "Product created!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Image Upload */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
          {form.imageUrl ? (
            <div className="border border-gray-200 rounded-xl p-3">
              <div className="w-full h-44 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
                <img src={form.imageUrl} alt="Product preview" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                  {uploadingImage ? "Uploading..." : "Replace Image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingImage}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.currentTarget.value = ""; }} />
                </label>
                <button type="button" onClick={handleRemoveImage} disabled={uploadingImage}
                  className="inline-flex items-center gap-1 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-60">
                  <X size={14} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
              <ImagePlus size={24} className="text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">{uploadingImage ? "Uploading image..." : "Upload product image"}</p>
              <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WEBP up to 2MB</p>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingImage}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.currentTarget.value = ""; }} />
            </label>
          )}
        </div>

        {/* Name */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass} placeholder="e.g. Touch 8 Switch" />
        </div>

        {/* Code + Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
          <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
            className={inputClass} placeholder="e.g. T8S-6M" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className={inputClass}>
            {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Category + Unit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputClass}>
            <option value="">— No Category —</option>
            {flatCats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
          <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className={inputClass} placeholder="pcs" />
        </div>

        {/* Module Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Module Size</label>
          <input type="text" value={form.moduleSize} onChange={(e) => setForm({ ...form, moduleSize: e.target.value })}
            className={inputClass} placeholder="e.g. 4M, 6M" />
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass + " resize-none"} rows={2} placeholder="Full product description..." />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (visible to sales)</label>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={inputClass + " resize-none"} rows={2} />
        </div>

        {/* Active toggle */}
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 rounded" />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (visible in estimator)</label>
        </div>
      </div>

      {/* ── Pricing Section ───────────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3X3 size={16} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-800">Pricing</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Flat price</span>
            <button
              type="button"
              onClick={() => toggleMatrix(!form.isMatrix)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isMatrix ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.isMatrix ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
            <span className="text-xs text-gray-500">Matrix</span>
          </div>
        </div>

        {!form.isMatrix ? (
          /* ── Flat price input ──────────────────────────────────────────── */
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={variants[0]?.price ?? ""}
              onChange={(e) => updateVariantPrice("v-0", e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </div>
        ) : (
          /* ── Matrix pricing ────────────────────────────────────────────── */
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Define dimensions (e.g. Series: wifi/zigbee) and enter the price for each combination.
            </p>

            {/* Dimension Builder */}
            <div className="space-y-3">
              {dimensions.map((dim, dimIdx) => (
                <div key={dimIdx} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={dim.key}
                      onChange={(e) => updateDimension(dimIdx, "key", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-200"
                      placeholder="key (e.g. series)"
                    />
                    <input
                      type="text"
                      value={dim.label}
                      onChange={(e) => updateDimension(dimIdx, "label", e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-200"
                      placeholder="Label (e.g. Series)"
                    />
                    <button type="button" onClick={() => removeDimension(dimIdx)}
                      className="p-1 text-red-400 hover:text-red-600 rounded transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {dim.options.map((opt) => (
                      <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                        {opt}
                        <button type="button" onClick={() => removeOption(dimIdx, opt)} className="hover:text-blue-900">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <OptionInput onAdd={(opt) => addOption(dimIdx, opt)} />
                </div>
              ))}
            </div>

            <button type="button" onClick={addDimension}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={12} /> Add Dimension
            </button>

            {/* Price Grid */}
            {variants.length > 0 && dimensions.some((d) => d.options.length > 0) && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Tag size={12} /> Prices by Variant
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {variants.map((v) => {
                    const label = Object.entries(v.config)
                      .map(([k, val]) => `${capitalize(k)}: ${capitalize(val)}`)
                      .join(" • ");
                    return (
                      <div key={v.id} className="flex items-center gap-3 text-xs">
                        <input
                          type="checkbox"
                          checked={v.isActive}
                          onChange={(e) => toggleVariantActive(v.id, e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className={`flex-1 text-gray-600 truncate ${!v.isActive ? "line-through opacity-40" : ""}`}>
                          {label || "Default"}
                        </span>
                        <div className="relative shrink-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!v.isActive}
                            value={v.price}
                            onChange={(e) => updateVariantPrice(v.id, e.target.value)}
                            className="w-28 pl-6 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-400"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 bg-whyte-blue text-white font-semibold rounded-xl hover:bg-whyte-light transition-colors disabled:opacity-60"
        >
          {saving ? "Saving..." : product ? "Update Product" : "Create Product"}
        </button>
      </div>
    </form>
  );
}

/** Small inline input for adding options to a dimension */
function OptionInput({ onAdd }: { onAdd: (opt: string) => void }) {
  const [val, setVal] = useState("");
  const submit = () => {
    if (val.trim()) {
      onAdd(val.trim());
      setVal("");
    }
  };
  return (
    <div className="flex gap-1.5">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        className="flex-1 px-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-200"
        placeholder="Type option and press Enter (e.g. wifi)"
      />
      <button type="button" onClick={submit}
        className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs hover:bg-blue-100 transition">
        Add
      </button>
    </div>
  );
}
