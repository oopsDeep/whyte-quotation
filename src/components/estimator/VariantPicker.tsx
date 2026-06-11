"use client";
import { useState } from "react";
import { Product, ProductVariant, MatrixDimension } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { X, ChevronRight } from "lucide-react";

interface Props {
  product: Product;
  onSelect: (variantId: number, config: Record<string, string>) => void;
  onClose: () => void;
}

/** Build a human-readable label from a config object */
function buildLabel(config: Record<string, string>): string {
  const parts = Object.values(config).filter(Boolean);
  return parts.length > 0
    ? parts.map((v) => v.charAt(0).toUpperCase() + v.slice(1)).join(" + ")
    : "Standard";
}

/** Find the variant that exactly matches a config */
function findVariant(
  variants: ProductVariant[],
  config: Record<string, string>
): ProductVariant | undefined {
  return variants.find((v) => {
    const vc = (v.config as Record<string, string>) ?? {};
    const configKeys = Object.keys(config);
    const vcKeys = Object.keys(vc);
    if (configKeys.length !== vcKeys.length) return false;
    return configKeys.every((k) => vc[k] === config[k]);
  });
}

/** Picker for a 2D matrix — renders a rows × columns grid */
function Grid2DPicker({
  dim1,
  dim2,
  variants,
  onSelect,
}: {
  dim1: MatrixDimension;
  dim2: MatrixDimension;
  variants: ProductVariant[];
  onSelect: (v: ProductVariant) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="pb-2 pr-3 text-xs font-medium text-slate-400 text-left">{dim1.label}</th>
            {dim2.options.map((opt) => (
              <th key={opt} className="pb-2 px-2 text-xs font-semibold text-slate-600 text-center">
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {dim1.options.map((row) => (
            <tr key={row}>
              <td className="py-2 pr-3 text-xs font-semibold text-slate-600 whitespace-nowrap">
                {row.charAt(0).toUpperCase() + row.slice(1)}
              </td>
              {dim2.options.map((col) => {
                const config = { [dim1.key]: row, [dim2.key]: col };
                const variant = findVariant(variants, config);
                return (
                  <td key={col} className="py-2 px-2 text-center">
                    {variant ? (
                      <button
                        onClick={() => onSelect(variant)}
                        className="w-full min-w-[72px] px-2 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition-all"
                      >
                        {formatCurrency(variant.price)}
                      </button>
                    ) : (
                      <span className="inline-flex items-center justify-center w-full min-w-[72px] px-2 py-2 rounded-lg border border-slate-100 text-xs text-slate-300 bg-slate-50 cursor-not-allowed select-none">
                        N/A
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Picker for a 1D matrix — renders a simple scrollable list */
function List1DPicker({
  dim,
  variants,
  onSelect,
}: {
  dim: MatrixDimension;
  variants: ProductVariant[];
  onSelect: (v: ProductVariant) => void;
}) {
  return (
    <div className="space-y-2">
      {dim.options.map((opt) => {
        const config = { [dim.key]: opt };
        const variant = findVariant(variants, config);
        if (!variant) {
          return (
            <div key={opt} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed">
              <span className="text-sm font-medium text-slate-500">{opt.charAt(0).toUpperCase() + opt.slice(1)}</span>
              <span className="text-xs text-slate-400">N/A</span>
            </div>
          );
        }
        return (
          <button
            key={opt}
            onClick={() => onSelect(variant)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 active:scale-[0.99] transition-all group"
          >
            <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                {formatCurrency(variant.price)}
              </span>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Cascading picker for 3+ dimensions */
function CascadingPicker({
  dimensions,
  variants,
  onSelect,
}: {
  dimensions: MatrixDimension[];
  variants: ProductVariant[];
  onSelect: (v: ProductVariant) => void;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const updateSelection = (key: string, value: string) => {
    setSelections((prev) => {
      const next: Record<string, string> = {};
      // Reset all keys that come after this one
      let found = false;
      for (const dim of dimensions) {
        if (dim.key === key) {
          next[dim.key] = value;
          found = true;
        } else if (!found) {
          if (prev[dim.key]) next[dim.key] = prev[dim.key];
        }
      }
      return next;
    });
  };

  const selectedVariant =
    Object.keys(selections).length === dimensions.length
      ? findVariant(variants, selections)
      : undefined;

  return (
    <div className="space-y-3">
      {dimensions.map((dim) => (
        <div key={dim.key}>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">{dim.label}</label>
          <div className="flex flex-wrap gap-1.5">
            {dim.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateSelection(dim.key, opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selections[dim.key] === opt
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50"
                }`}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>
      ))}

      {selectedVariant && (
        <button
          onClick={() => onSelect(selectedVariant)}
          className="w-full mt-2 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/20"
        >
          Add at {formatCurrency(selectedVariant.price)}
        </button>
      )}
      {Object.keys(selections).length === dimensions.length && !selectedVariant && (
        <p className="text-xs text-center text-slate-400 py-2">
          This combination is not available
        </p>
      )}
    </div>
  );
}

export default function VariantPicker({ product, onSelect, onClose }: Props) {
  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
  const dims = product.matrixDimensions ?? [];

  const handleSelect = (variant: ProductVariant) => {
    const config = (variant.config as Record<string, string>) ?? {};
    onSelect(variant.id, config);
    onClose();
  };

  // Determine render mode
  const renderMode =
    dims.length === 0
      ? "list" // flat/no-dim → just list active variants
      : dims.length === 1
      ? "1d"
      : dims.length === 2
      ? "2d"
      : "cascade";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Variant</p>
            <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">{product.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[65vh] overflow-y-auto">
          {activeVariants.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">No variants available</p>
          ) : renderMode === "2d" ? (
            <Grid2DPicker dim1={dims[0]} dim2={dims[1]} variants={activeVariants} onSelect={handleSelect} />
          ) : renderMode === "1d" ? (
            <List1DPicker dim={dims[0]} variants={activeVariants} onSelect={handleSelect} />
          ) : renderMode === "cascade" ? (
            <CascadingPicker dimensions={dims} variants={activeVariants} onSelect={handleSelect} />
          ) : (
            // Flat / no-dim fallback list
            <div className="space-y-2">
              {activeVariants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleSelect(v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 active:scale-[0.99] transition-all group"
                >
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                    {buildLabel((v.config as Record<string, string>) ?? {})}
                  </span>
                  <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
                    {formatCurrency(v.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400 text-center">
            {renderMode === "2d"
              ? "Click a price in the grid to add this product"
              : renderMode === "cascade"
              ? "Select each option then click Add"
              : "Click a variant to add it"}
          </p>
        </div>
      </div>
    </div>
  );
}
