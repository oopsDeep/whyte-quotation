"use client";
import { useState } from "react";
import { Category } from "@/types";
import { Plus, Trash2, ChevronRight, ChevronDown, Package } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useCategories } from "@/lib/swr";

const MAX_DEPTH = 3;

const LEVEL_LABELS: Record<number, string> = {
  1: "Series",
  2: "Category",
  3: "Subcategory",
};

const LEVEL_COLORS: Record<number, { bg: string; text: string; addBg: string; addText: string }> = {
  1: { bg: "bg-gray-50/50", text: "text-gray-800", addBg: "bg-blue-50", addText: "text-blue-600" },
  2: { bg: "", text: "text-gray-700", addBg: "bg-emerald-50", addText: "text-emerald-600" },
  3: { bg: "", text: "text-gray-600", addBg: "bg-violet-50", addText: "text-violet-600" },
};

interface InlineFormProps {
  level: number;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}

function InlineForm({ level, onSave, onCancel }: InlineFormProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        await onSave(name.trim());
        setSaving(false);
      }}
      className="flex gap-2 items-center my-1"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder={`${LEVEL_LABELS[level] ?? "Category"} name`}
        className="flex-1 px-3 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      <button type="submit" disabled={saving} className="px-3 py-1.5 bg-whyte-blue text-white rounded-lg text-sm font-medium hover:bg-whyte-light transition disabled:opacity-60">
        {saving ? "..." : "Save"}
      </button>
      <button type="button" onClick={onCancel} className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
        Cancel
      </button>
    </form>
  );
}

interface CategoryNodeProps {
  category: Category;
  depth: number;
  addingTo: { level: number; parentId: number | null } | null;
  onSetAddingTo: (val: { level: number; parentId: number | null } | null) => void;
  onAdd: (name: string, level: number, parentId: number | null) => Promise<void>;
  onDelete: (cat: Category) => void;
}

function CategoryNode({ category, depth, addingTo, onSetAddingTo, onAdd, onDelete }: CategoryNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (category.children?.length ?? 0) > 0;
  const isLeaf = !hasChildren;
  const canAddChild = depth < MAX_DEPTH;
  const colors = LEVEL_COLORS[depth] ?? LEVEL_COLORS[3];
  const paddingLeft = depth === 1 ? "pl-4" : depth === 2 ? "pl-10" : "pl-16";
  const nextLevel = depth + 1;

  return (
    <div>
      {/* Category Row */}
      <div className={`flex items-center justify-between ${paddingLeft} pr-4 py-2.5 ${colors.bg}`}>
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-5 flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full inline-block" />
            </span>
          )}
          <span className={`${depth === 1 ? "font-semibold" : "font-medium"} ${colors.text} text-sm truncate`}>
            {category.name}
          </span>
          <span className="text-[10px] text-gray-400 font-normal shrink-0">{LEVEL_LABELS[depth]}</span>
          {isLeaf && (
            <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium shrink-0 hidden sm:inline-flex items-center gap-1">
              <Package size={10} /> Leaf
            </span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {canAddChild && (
            <button
              onClick={() => onSetAddingTo({ level: nextLevel, parentId: category.id })}
              className={`text-xs px-2 py-1 ${colors.addBg} ${colors.addText} rounded-lg hover:opacity-80 transition flex items-center gap-1`}
            >
              <Plus size={12} /> <span className="hidden sm:inline">Add {LEVEL_LABELS[nextLevel] ?? "Sub"}</span><span className="sm:hidden">+</span>
            </button>
          )}
          <button onClick={() => onDelete(category)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Inline add form for child */}
      {addingTo?.level === nextLevel && addingTo.parentId === category.id && (
        <div className={`${depth === 1 ? "px-8" : depth === 2 ? "px-14" : "px-20"} py-2 bg-blue-50/30`}>
          <InlineForm
            level={nextLevel}
            onSave={(name) => onAdd(name, nextLevel, category.id)}
            onCancel={() => onSetAddingTo(null)}
          />
        </div>
      )}

      {/* Children (recursive) */}
      {expanded && hasChildren && (
        <div>
          {category.children!.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              depth={depth + 1}
              addingTo={addingTo}
              onSetAddingTo={onSetAddingTo}
              onAdd={onAdd}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const { data: categories = [], isLoading: loading, mutate } = useCategories();
  const [addingTo, setAddingTo] = useState<{ level: number; parentId: number | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAdd = async (name: string, level: number, parentId: number | null) => {
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, level, parentId, sortOrder: 0 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add");
      }
      toast.success(`${LEVEL_LABELS[level] ?? "Category"} added`);
      setAddingTo(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add category");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Category deleted");
      setDeleteTarget(null);
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  // Count total nodes for info display
  const countNodes = (cats: Category[]): number =>
    cats.reduce((sum, c) => sum + 1 + countNodes(c.children ?? []), 0);
  const totalNodes = countNodes(categories);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Hierarchy: Series → Category → Subcategory (max {MAX_DEPTH} levels) · {totalNodes} total
          </p>
        </div>
        <button
          onClick={() => setAddingTo({ level: 1, parentId: null })}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-whyte-blue text-white rounded-xl font-medium text-sm hover:bg-whyte-light transition-colors w-full sm:w-auto"
        >
          <Plus size={16} />
          Add Series
        </button>
      </div>

      {/* Add Level 1 inline */}
      {addingTo?.level === 1 && !addingTo.parentId && (
        <div className="bg-blue-50 p-3 rounded-xl mb-4">
          <InlineForm level={1} onSave={(name) => handleAdd(name, 1, null)} onCancel={() => setAddingTo(null)} />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
        {categories.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">No categories yet. Add a Series to get started.</div>
        )}
        {categories.map((l1: Category) => (
          <CategoryNode
            key={l1.id}
            category={l1}
            depth={1}
            addingTo={addingTo}
            onSetAddingTo={setAddingTo}
            onAdd={handleAdd}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={`Delete "${deleteTarget?.name}"? ${
          (deleteTarget?.children?.length ?? 0) > 0
            ? "This will also affect all subcategories underneath."
            : "This cannot be undone."
        }`}
        isLoading={deleting}
      />
    </div>
  );
}
