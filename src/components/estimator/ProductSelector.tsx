"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { Product, Category, QuotationRoom } from "@/types";
import { formatCurrency } from "@/lib/utils";
import CategoryFilter from "./CategoryFilter";
import ProductCard from "./ProductCard";
import ItemRow from "./ItemRow";
import { ShoppingBag, Search, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  products: Product[];
  categories: Category[];
  activeRoom: QuotationRoom;
  allRooms: QuotationRoom[];
  onAddProduct: (productId: number) => void;
  onUpdateItem: (itemId: number, data: any) => Promise<void>;
  onUpdateRoom: (roomId: number, data: any) => Promise<void>;
  onDeleteItem: (itemId: number) => Promise<void>;
  onRefreshProducts: () => Promise<void>;
}

export default function ProductSelector({
  products,
  categories,
  activeRoom,
  allRooms,
  onAddProduct,
  onUpdateItem,
  onUpdateRoom,
  onDeleteItem,
  onRefreshProducts,
}: Props) {
  const [l1Id, setL1Id] = useState<number | null>(null);
  const [l2Id, setL2Id] = useState<number | null>(null);
  const [l3Id, setL3Id] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"products" | "items">("products");
  const [roomNotes, setRoomNotes] = useState(activeRoom.notes ?? "");
  const [roomNotesDirty, setRoomNotesDirty] = useState(false);
  const [savingRoomNotes, setSavingRoomNotes] = useState(false);
  const prevRoomNotes = useRef(activeRoom.notes ?? "");

  useEffect(() => {
    const next = activeRoom.notes ?? "";
    setRoomNotes(next);
    prevRoomNotes.current = next;
    setRoomNotesDirty(false);
  }, [activeRoom.id, activeRoom.notes]);

  /**
   * Category filter logic:
   * Uses the deepest selected category ID and checks whether each product's
   * category is that ID or a descendant of it. Works for any hierarchy depth
   * (1-level, 2-level, or 3-level). Products with no category are shown only
   * when no category filter is active.
   */
  const filteredProducts = useMemo(() => {
    let result = products;

    // Find the deepest selected category ID (most specific filter)
    const activeFilterId = l3Id ?? l2Id ?? l1Id;

    if (activeFilterId) {
      result = result.filter((p) => {
        const cat = p.category;
        if (!cat) return false;

        // Walk up the parent chain to check if product belongs under selected category
        let current: any = cat;
        while (current) {
          if (current.id === activeFilterId) return true;
          current = current.parent ?? null;
        }
        return false;
      });
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code?.toLowerCase() ?? "").includes(q) ||
          (p.description?.toLowerCase() ?? "").includes(q)
      );
    }

    return result;
  }, [products, l1Id, l2Id, l3Id, search]);

  const roomSubtotal = activeRoom.items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice),
    0
  );

  const saveRoomNotes = async () => {
    const normalized = roomNotes.trim();
    const previous = prevRoomNotes.current.trim();
    if (normalized === previous) {
      setRoomNotesDirty(false);
      return;
    }

    setSavingRoomNotes(true);
    try {
      console.log("[saveRoomNotes] Saving for room:", activeRoom.id, "notes:", normalized);
      await onUpdateRoom(activeRoom.id, { notes: normalized || null });
      prevRoomNotes.current = roomNotes;
      setRoomNotesDirty(false);
      toast.success("Room note saved");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to save room note";
      console.error("[saveRoomNotes] Error:", errorMsg, e);
      toast.error(errorMsg);
      setRoomNotesDirty(true);
    } finally {
      setSavingRoomNotes(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Room Header */}
      <div className="px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4 lg:px-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-gray-900 text-sm md:text-base lg:text-lg truncate">
              {activeRoom.roomType?.icon && <span className="mr-1">{activeRoom.roomType.icon}</span>}
              {activeRoom.customName ?? activeRoom.roomType?.name ?? "Room"}
            </h2>
            <p className="text-xs md:text-sm text-gray-400">
              {activeRoom.items.length} items • {formatCurrency(roomSubtotal)}
            </p>
          </div>
          <div className="flex gap-1 md:gap-1.5 bg-gray-100 p-0.5 md:p-1 rounded-lg shrink-0">
            <button
              onClick={() => setTab("products")}
              className={`px-3 py-1.5 md:px-3.5 md:py-1.5 rounded-md text-xs md:text-sm font-medium transition ${
                tab === "products" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setTab("items")}
              className={`px-3 py-1.5 md:px-3.5 md:py-1.5 rounded-md text-xs md:text-sm font-medium transition ${
                tab === "items" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              Items ({activeRoom.items.length})
            </button>
          </div>
        </div>
        <div className="mt-3 md:mt-4">
          <p className="text-[11px] md:text-xs font-medium text-gray-500 mb-1">Room Notes (for customer/technician)</p>
          <textarea
            value={roomNotes}
            rows={2}
            onChange={(e) => {
              setRoomNotes(e.target.value);
              setRoomNotesDirty(e.target.value !== prevRoomNotes.current);
            }}
            onBlur={saveRoomNotes}
            placeholder="e.g. Keep switch panel near entrance, maintain 4.5 ft height, avoid drilling on this wall"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-blue-200 resize-y"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] md:text-xs text-gray-400">
              {savingRoomNotes ? "Saving..." : roomNotesDirty ? "Unsaved changes" : "Saved"}
            </span>
            <button
              type="button"
              onClick={saveRoomNotes}
              disabled={savingRoomNotes || !roomNotesDirty}
              className="px-2 py-1 text-[11px] md:text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>

      {tab === "products" && (
        <>
          <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:px-6 border-b border-slate-100 bg-slate-50/60 space-y-3 shrink-0">
            <CategoryFilter
              categories={categories}
              l1Id={l1Id}
              l2Id={l2Id}
              l3Id={l3Id}
              onL1Change={(id) => { setL1Id(id); setL2Id(null); setL3Id(null); }}
              onL2Change={(id) => { setL2Id(id); setL3Id(null); }}
              onL3Change={setL3Id}
            />

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1 min-w-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by product name, code, or description"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  aria-label="Search products"
                />
              </div>

              <button
                onClick={onRefreshProducts}
                className="h-11 px-4 inline-flex items-center justify-center gap-2 border border-slate-200 bg-white rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 shrink-0"
                title="Refresh product catalog"
                type="button"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 lg:p-6 bg-slate-50/30 scroll-smooth">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <ShoppingBag size={32} className="mb-2 opacity-30" />
                <p className="text-sm md:text-base font-medium">No matching products</p>
                {(l1Id || l2Id || l3Id || search) && (
                  <button
                    onClick={() => { setL1Id(null); setL2Id(null); setL3Id(null); setSearch(""); }}
                    className="mt-2 text-sm text-whyte-light hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <p className="text-xs sm:text-sm text-slate-500">
                    {filteredProducts.length} products available
                  </p>
                </div>

                {/* Mobile/Tablet: Horizontal scroll with smaller cards */}
                <div className="lg:hidden overflow-x-auto product-scroll-mobile pb-3 -mx-1 px-1">
                  <div className="flex gap-3 sm:gap-4">
                    {filteredProducts.map((p) => (
                      <div key={p.id} className="w-[180px] sm:w-[220px] md:w-[240px] shrink-0">
                        <ProductCard
                          product={p}
                          onAdd={() => onAddProduct(p.id)}
                          activeFilterIds={[l1Id, l2Id, l3Id].filter((id): id is number => id !== null)}
                          compact
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop: Grid layout */}
                <div className="hidden lg:block">
                  <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-5">
                    {filteredProducts.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onAdd={() => onAddProduct(p.id)}
                        activeFilterIds={[l1Id, l2Id, l3Id].filter((id): id is number => id !== null)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {tab === "items" && (
        <div className="flex-1 overflow-y-auto">
          {activeRoom.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <p className="text-sm md:text-base">No items in this room</p>
              <button onClick={() => setTab("products")} className="mt-2 md:mt-3 text-xs md:text-sm text-whyte-light hover:underline">
                Browse Products →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeRoom.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  currentRoomId={activeRoom.id}
                  allRooms={allRooms}
                  onUpdate={(data) => onUpdateItem(item.id, data)}
                  onDelete={() => onDeleteItem(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
