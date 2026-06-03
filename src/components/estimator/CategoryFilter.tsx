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

  const l2Cats = useMemo(() => {
    if (!l1Id) return [];
    const l1 = l1Cats.find((c) => c.id === l1Id);
    return l1?.children ?? [];
  }, [l1Cats, l1Id]);

  const l3Cats = useMemo(() => {
    if (!l2Id) return [];
    const l2 = l2Cats.find((c) => c.id === l2Id);
    return l2?.children ?? [];
  }, [l2Cats, l2Id]);

  const selectClass =
    "w-full px-3 py-2 md:px-3.5 md:py-2.5 border border-gray-200 rounded-xl text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white";

  return (
    <div className="flex gap-2 md:gap-3">
      <select
        value={l1Id ?? ""}
        onChange={(e) => onL1Change(e.target.value ? Number(e.target.value) : null)}
        className={selectClass}
      >
        <option value="">All Series</option>
        {l1Cats.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {l2Cats.length > 0 && (
        <select
          value={l2Id ?? ""}
          onChange={(e) => onL2Change(e.target.value ? Number(e.target.value) : null)}
          className={selectClass}
        >
          <option value="">All Tech</option>
          {l2Cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {l3Cats.length > 0 && (
        <select
          value={l3Id ?? ""}
          onChange={(e) => onL3Change(e.target.value ? Number(e.target.value) : null)}
          className={selectClass}
        >
          <option value="">All Material</option>
          {l3Cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
