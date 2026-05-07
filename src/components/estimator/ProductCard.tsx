"use client";
import { Product } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Package } from "lucide-react";
import ProductTags from "./ProductTags";

interface Props {
  product: Product;
  onAdd: () => void;
  /** IDs of currently active category filters — tags matching these are hidden */
  activeFilterIds?: number[];
  /** Compact mode for mobile horizontal scroller */
  compact?: boolean;
}

const typeColors: Record<string, string> = {
  switch_board: "bg-blue-50 text-blue-600",
  accessory: "bg-purple-50 text-purple-600",
  retrofit: "bg-orange-50 text-orange-600",
  curtain: "bg-green-50 text-green-600",
  smart_lock: "bg-yellow-50 text-yellow-700",
  vdp: "bg-pink-50 text-pink-600",
  other: "bg-gray-50 text-gray-600",
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

export default function ProductCard({ product, onAdd, activeFilterIds = [], compact = false }: Props) {
  if (compact) {
    return (
      <article className="h-full bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-md hover:shadow-blue-100/30 transition-all duration-200 flex flex-col">
        {product.imageUrl ? (
          <div className="w-full h-20 bg-white rounded-lg mb-2.5 flex items-center justify-center border border-slate-100 overflow-hidden">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-2.5 flex items-center justify-center border border-slate-100">
            <Package size={24} className="text-slate-300" />
          </div>
        )}

        <div className="flex-1 min-h-0">
          <div className="flex items-start gap-1 mb-1.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${typeColors[product.type] ?? typeColors.other}`}>
              {typeLabels[product.type] ?? product.type}
            </span>
          </div>

          <h3 className="font-medium text-slate-900 text-xs leading-snug line-clamp-2 min-h-[2rem]">{product.name}</h3>
          {product.code && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{product.code}</p>}
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900 text-sm leading-none">{formatCurrency(product.price)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">per {product.unit}</p>
          </div>

          <button
            onClick={onAdd}
            className="shrink-0 inline-flex items-center justify-center h-9 px-3 bg-whyte-blue text-white text-xs font-semibold rounded-lg hover:bg-whyte-light transition-colors"
          >
            <Plus size={12} className="mr-0.5" /> Add
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="h-full min-h-[300px] bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md hover:shadow-blue-100/30 transition-all duration-200 flex flex-col">
      {product.imageUrl ? (
        <div className="w-full h-28 bg-white rounded-xl mb-3.5 flex items-center justify-center border border-slate-100 overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl mb-3.5 flex items-center justify-center border border-slate-100">
          <Package size={30} className="text-slate-300" />
        </div>
      )}

      <div className="flex-1 min-h-0">
        <div className="flex items-start justify-between gap-1.5 mb-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium ${typeColors[product.type] ?? typeColors.other}`}>
            {typeLabels[product.type] ?? product.type}
          </span>
          {/* Context-aware tags — hides already-filtered levels, condenses in 'All Products' */}
          <ProductTags
            product={product}
            activeFilterIds={activeFilterIds}
            mode="card"
            className="justify-end"
          />
        </div>

        <h3 className="font-medium text-slate-900 text-sm md:text-base leading-snug line-clamp-2 min-h-[2.6rem]">{product.name}</h3>
        {product.code && <p className="text-xs text-slate-400 font-mono mt-1">{product.code}</p>}

        {product.description && (
          <p className="text-xs md:text-sm text-slate-500 line-clamp-2 mt-2 min-h-[2.4rem]">{product.description}</p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900 text-base md:text-lg leading-none">{formatCurrency(product.price)}</p>
          <p className="text-xs text-slate-400 mt-1">per {product.unit}</p>
        </div>

        <button
          onClick={onAdd}
          className="shrink-0 inline-flex items-center justify-center min-w-[88px] h-10 px-4 bg-whyte-blue text-white text-sm font-semibold rounded-lg hover:bg-whyte-light transition-colors"
        >
          <Plus size={14} className="mr-1" /> Add
        </button>
      </div>
    </article>
  );
}
