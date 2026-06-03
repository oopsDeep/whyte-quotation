"use client";
import { ProductVariant } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { X } from "lucide-react";

interface Props {
  productName: string;
  variants: ProductVariant[];
  onSelect: (variantId: number) => void;
  onClose: () => void;
}

function buildLabel(tier: string | null, finish: string | null): string {
  const parts: string[] = [];
  if (tier) parts.push(tier.charAt(0).toUpperCase() + tier.slice(1));
  if (finish) parts.push(finish.charAt(0).toUpperCase() + finish.slice(1));
  return parts.length > 0 ? parts.join(" + ") : "Standard";
}

export default function VariantPicker({ productName, variants, onSelect, onClose }: Props) {
  const activeVariants = variants.filter((v) => v.isActive);

  // Group variants by automationTier for a cleaner layout
  const tiers = [...new Set(activeVariants.map((v) => v.automationTier))];
  const finishes = [...new Set(activeVariants.map((v) => v.surfaceFinish))];

  // If we have a 2D grid (tiers × finishes), show as table
  const showGrid = tiers.length > 1 && finishes.length > 1 && tiers.length * finishes.length <= activeVariants.length + 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Select Variant</p>
            <h3 className="text-sm font-semibold text-slate-900 truncate mt-0.5">{productName}</h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Variant List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {showGrid ? (
            // Grid layout for 2D variants (tier × finish)
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 text-xs font-medium text-slate-400 pr-3"></th>
                    {finishes.map((f) => (
                      <th key={f ?? "none"} className="pb-2 text-xs font-medium text-slate-500 text-center px-2">
                        {f ? f.charAt(0).toUpperCase() + f.slice(1) : "Standard"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((t) => (
                    <tr key={t ?? "none"}>
                      <td className="py-1.5 text-xs font-medium text-slate-600 pr-3 whitespace-nowrap">
                        {t ? t.charAt(0).toUpperCase() + t.slice(1) : "Standard"}
                      </td>
                      {finishes.map((f) => {
                        const variant = activeVariants.find(
                          (v) => v.automationTier === t && v.surfaceFinish === f
                        );
                        return (
                          <td key={`${t}-${f}`} className="py-1.5 px-2 text-center">
                            {variant ? (
                              <button
                                onClick={() => onSelect(variant.id)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all"
                              >
                                {formatCurrency(variant.price)}
                              </button>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Simple list layout for 1D variants or mixed
            <div className="space-y-2">
              {activeVariants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelect(v.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                >
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                    {buildLabel(v.automationTier, v.surfaceFinish)}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                    {formatCurrency(v.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400 text-center">
            Click a price to add this product with that variant
          </p>
        </div>
      </div>
    </div>
  );
}
