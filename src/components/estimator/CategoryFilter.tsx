"use client";
import { Category } from "@/types";
import { useMemo } from "react";

interface Props {
  categories: Category[];
  l1Id: number | null;
  l2Id: number | null;
  l3Id: number | null;
  onL1Change: (id: number | null) => void;
  onL2Change: (id: number | null) => void;
  onL3Change: (id: number | null) => void;
}

export default function CategoryFilter({ categories, l1Id, l2Id, l3Id, onL1Change, onL2Change, onL3Change }: Props) {
  const l1Cats = categories; // Already top-level

  // Get children of selected L1
  const l2Cats = useMemo(() => {
    if (!l1Id) return [];
    const l1 = l1Cats.find((c) => c.id === l1Id);
    return l1?.children ?? [];
  }, [l1Cats, l1Id]);

  // Get children of selected L2
  const l3Cats = useMemo(() => {
    if (!l2Id) return [];
    const l2 = l2Cats.find((c) => c.id === l2Id);
    return l2?.children ?? [];
  }, [l2Cats, l2Id]);

  // Determine how many dropdowns to show:
  // Always show Series. Show Category only if selected series has children.
  // Show Subcategory only if selected category has children.
  const showL2 = l2Cats.length > 0;
  const showL3 = l3Cats.length > 0;

  // Count active dropdowns for responsive grid
  const activeCols = 1 + (showL2 ? 1 : 0) + (showL3 ? 1 : 0);
  const gridClass =
    activeCols === 3
      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3"
      : activeCols === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3"
      : "grid grid-cols-1 gap-2.5 md:gap-3 max-w-xs";

  const selectClass =
    "w-full h-11 px-3 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-white transition-colors";

  return (
    <div className={gridClass}>
      {/* Level 1: Series — always visible */}
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1.5">Series</label>
        <select
          value={l1Id ?? ""}
          onChange={(e) => onL1Change(e.target.value ? Number(e.target.value) : null)}
          className={selectClass}
          aria-label="Filter by series"
        >
          <option value="">All Series</option>
          {l1Cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Level 2: Category — only shown if selected series has children */}
      {showL2 && (
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1.5">Category</label>
          <select
            value={l2Id ?? ""}
            onChange={(e) => onL2Change(e.target.value ? Number(e.target.value) : null)}
            className={selectClass}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {l2Cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Level 3: Subcategory — only shown if selected category has children */}
      {showL3 && (
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1.5">Subcategory</label>
          <select
            value={l3Id ?? ""}
            onChange={(e) => onL3Change(e.target.value ? Number(e.target.value) : null)}
            className={selectClass}
            aria-label="Filter by subcategory"
          >
            <option value="">All Subcategories</option>
            {l3Cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
