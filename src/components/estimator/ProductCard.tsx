"use client";
import { Product } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Package } from "lucide-react";

interface Props {
  product: Product;
  onAdd: () => void;
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

export default function ProductCard({ product, onAdd }: Props) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 md:p-4 lg:p-5 hover:border-blue-200 hover:shadow-md transition-all group flex flex-col">
      {/* Placeholder for image */}
      <div className="w-full h-24 md:h-28 lg:h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-3 md:mb-4 flex items-center justify-center">
        <Package size={28} className="text-gray-300 md:scale-110" />
      </div>

      <div className="flex-1">
        <span className={`inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-md text-xs md:text-sm font-medium mb-1 md:mb-1.5 ${typeColors[product.type] ?? typeColors.other}`}>
          {typeLabels[product.type] ?? product.type}
        </span>
        <p className="font-semibold text-gray-900 text-sm md:text-base lg:text-lg leading-tight mb-0.5 md:mb-1">{product.name}</p>
        {product.code && <p className="text-xs md:text-sm text-gray-400 font-mono mb-1 md:mb-1.5">{product.code}</p>}
        {product.description && (
          <p className="text-xs md:text-sm text-gray-500 line-clamp-2 mb-2 md:mb-3">{product.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 md:mt-3">
        <div>
          <p className="font-bold text-gray-900 text-sm md:text-base lg:text-lg">{formatCurrency(product.price)}</p>
          <p className="text-xs md:text-sm text-gray-400">/{product.unit}</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 md:gap-1.5 px-3 py-1.5 md:px-3.5 md:py-2 bg-whyte-blue text-white text-xs md:text-sm font-semibold rounded-lg hover:bg-whyte-light transition-colors"
        >
          <Plus size={13} />
          Add
        </button>
      </div>
    </div>
  );
}
