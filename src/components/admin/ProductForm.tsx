"use client";
import { useState } from "react";
import { Product, Category } from "@/types";
import toast from "react-hot-toast";
import { ImagePlus, X } from "lucide-react";

const PRODUCT_TYPES = [
  { value: "switch_board", label: "Switch Board" },
  { value: "accessory", label: "Accessory" },
  { value: "retrofit", label: "Retrofit" },
  { value: "curtain", label: "Curtain" },
  { value: "smart_lock", label: "Smart Lock" },
  { value: "vdp", label: "VDP" },
  { value: "other", label: "Other" },
];

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

export default function ProductForm({ product, categories, onSuccess }: Props) {
  const [form, setForm] = useState({
    imageUrl: product?.imageUrl ?? "",
    name: product?.name ?? "",
    code: product?.code ?? "",
    description: product?.description ?? "",
    type: product?.type ?? "switch_board",
    categoryId: product?.categoryId ? String(product.categoryId) : "",
    price: product?.price ?? "",
    unit: product?.unit ?? "pcs",
    notes: product?.notes ?? "",
    isActive: product?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const flatCats = flattenCategories(categories);

  const getPublicIdFromUrl = (url: string) => {
    if (!url) return null;

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) return null;

      const prefix = `/image/upload/`;
      const marker = `${cloudName}${prefix}`;
      const markerIndex = url.indexOf(marker);
      if (markerIndex === -1) return null;

      const path = url.slice(markerIndex + marker.length);
      const withoutVersion = path.replace(/^v\d+\//, "");
      const withoutExtension = withoutVersion.replace(/\.[^.]+$/, "");
      return withoutExtension || null;
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

    const previousImageUrl = form.imageUrl;
    setUploadingImage(true);

    try {
      const payload = new FormData();
      payload.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: payload,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to upload image");
      }

      setForm((prev) => ({ ...prev, imageUrl: data.url }));

      if (previousImageUrl) {
        await deleteUploadedImage(previousImageUrl);
      }

      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    const imageUrl = form.imageUrl;
    if (!imageUrl) return;

    setUploadingImage(true);
    try {
      await deleteUploadedImage(imageUrl);
      setForm((prev) => ({ ...prev, imageUrl: "" }));
      toast.success("Image removed");
    } catch {
      setForm((prev) => ({ ...prev, imageUrl: "" }));
      toast.error("Image removed from form, but cloud cleanup failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        imageUrl: form.imageUrl || null,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        price: Number(form.price),
        sortOrder: 0,
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
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
          {form.imageUrl ? (
            <div className="border border-gray-200 rounded-xl p-3">
              <div className="w-full h-44 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center">
                <img
                  src={form.imageUrl}
                  alt="Product preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                  {uploadingImage ? "Uploading..." : "Replace Image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file);
                      }
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                  className="inline-flex items-center gap-1 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-60"
                >
                  <X size={14} />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
              <ImagePlus size={24} className="text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">{uploadingImage ? "Uploading image..." : "Upload product image"}</p>
              <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WEBP up to 2MB</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file);
                  }
                  e.currentTarget.value = "";
                }}
              />
            </label>
          )}
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder="e.g. 8S-6M Touch Panel"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className={inputClass}
            placeholder="e.g. 8S-6M"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select
            required
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            className={inputClass}
          >
            {PRODUCT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className={inputClass}
          >
            <option value="">— No Category —</option>
            {flatCats.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
          <input
            type="text"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className={inputClass}
            placeholder="pcs"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass + " resize-none"}
            rows={2}
            placeholder="Full product description..."
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (visible to sales)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={inputClass + " resize-none"}
            rows={2}
          />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active (visible in estimator)</label>
        </div>
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
