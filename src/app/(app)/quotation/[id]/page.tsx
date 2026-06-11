"use client";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Quotation, Product, Category, RoomType } from "@/types";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import RoomPanel from "@/components/estimator/RoomPanel";
import ProductSelector from "@/components/estimator/ProductSelector";
import QuotationSummary from "@/components/estimator/QuotationSummary";
import VariantPicker from "@/components/estimator/VariantPicker";
import StickyQuoteSummary from "@/components/estimator/StickyQuoteSummary";
import MobileRoomSelector from "@/components/estimator/MobileRoomSelector";
import Modal from "@/components/shared/Modal";
import StatusBadge from "@/components/shared/StatusBadge";
import { QuotationStatus } from "@/types";
import { formatDate, isBathroomLikeRoomName } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EstimatorPage() {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);

  // Layout states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Room creation state for page level (mobile/empty states)
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");
  const [customRoomName, setCustomRoomName] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  }, []);

  const fetchQuotation = useCallback(async () => {
    const res = await fetch(`/api/quotations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setQuotation(data);
      setActiveRoomId((prev) => {
        if (prev === null && data.rooms?.length > 0) {
          return data.rooms[0].id;
        }
        return prev;
      });
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchQuotation(),
        fetchProducts(),
        fetch("/api/categories").then((r) => r.json()).then(setCategories),
        fetch("/api/room-types").then((r) => r.json()).then(setRoomTypes),
      ]);
      setLoading(false);
    };
    init();
  }, [id, fetchQuotation, fetchProducts]);

  const handleRefreshProducts = async () => {
    try {
      await fetchProducts();
      toast.success("Products refreshed");
    } catch {
      toast.error("Failed to refresh products");
    }
  };

  const handleAddProduct = useCallback(
    async (productId: number) => {
      if (!activeRoomId) {
        toast.error("Select a room first");
        return;
      }

      const product = products.find((p) => p.id === productId);
      if (!product) return;

      if (product.isMatrix && (product.variants?.filter((v) => v.isActive).length ?? 0) > 1) {
        setPickerProduct(product);
        return;
      }

      await addItemToRoom(productId, undefined, undefined);
    },
    [activeRoomId, products]
  );

  const handleVariantSelected = useCallback(
    async (variantId: number, config: Record<string, string>) => {
      if (!pickerProduct || !activeRoomId) return;
      setPickerProduct(null);
      await addItemToRoom(pickerProduct.id, variantId, config);
    },
    [pickerProduct, activeRoomId]
  );

  const addItemToRoom = async (
    productId: number,
    productVariantId?: number,
    variantConfig?: Record<string, string>
  ) => {
    if (!activeRoomId) return;
    try {
      const res = await fetch(`/api/quotations/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotationRoomId: activeRoomId,
          productId,
          productVariantId: productVariantId ?? undefined,
          variantConfig: variantConfig ?? undefined,
          quantity: 1,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 422 && err.requiresPicker) {
          const product = products.find((p) => p.id === productId);
          if (product) setPickerProduct(product);
          return;
        }
        throw new Error(err.error ?? "Failed to add product");
      }
      toast.success("Added to room");
      await fetchQuotation();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add product");
    }
  };

  const handleAddRoom = async (roomTypeId: number | null, customName?: string) => {
    try {
      const res = await fetch(`/api/quotations/${id}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId,
          customName: customName ?? null,
          sortOrder: (quotation?.rooms?.length ?? 0) * 10,
        }),
      });
      const room = await res.json();
      setActiveRoomId(room.id);
      await fetchQuotation();
    } catch {
      toast.error("Failed to add room");
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    try {
      await fetch(`/api/quotations/${id}/rooms/${roomId}`, { method: "DELETE" });
      if (activeRoomId === roomId) {
        const remaining = quotation?.rooms.filter((r) => r.id !== roomId) ?? [];
        setActiveRoomId(remaining[0]?.id ?? null);
      }
      await fetchQuotation();
    } catch {
      toast.error("Failed to delete room");
    }
  };

  const handleUpdateItem = async (itemId: number, data: any) => {
    await fetch(`/api/quotations/${id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await fetchQuotation();
  };

  const handleDeleteItem = async (itemId: number) => {
    await fetch(`/api/quotations/${id}/items/${itemId}`, { method: "DELETE" });
    await fetchQuotation();
  };

  const handleUpdateRoom = async (roomId: number, data: any) => {
    const res = await fetch(`/api/quotations/${id}/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const responseJson = await res.json();
    if (!res.ok) {
      const errorMsg =
        responseJson?.details || responseJson?.error || `Failed to update room: ${res.status} ${res.statusText}`;
      throw new Error(errorMsg);
    }

    await fetchQuotation();
  };

  const handleUpdateDiscount = async (discountType: string, discountValue: number) => {
    await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discountType, discountValue }),
    });
    await fetchQuotation();
  };

  const handleAddRoomClick = () => {
    setShowAddRoomModal(true);
  };

  const handleAddRoomSubmit = async () => {
    if (!selectedRoomTypeId && !customRoomName.trim()) return;
    setAddingRoom(true);
    try {
      const roomTypeId = selectedRoomTypeId ? Number(selectedRoomTypeId) : null;
      const custom = !selectedRoomTypeId ? customRoomName.trim() : undefined;
      await handleAddRoom(roomTypeId, custom);
      setSelectedRoomTypeId("");
      setCustomRoomName("");
      setShowAddRoomModal(false);
    } finally {
      setAddingRoom(false);
    }
  };

  const activeRoom = quotation?.rooms.find((r) => r.id === activeRoomId) ?? null;
  const headerPortalEl = typeof document !== "undefined" ? document.getElementById("header-portal") : null;

  const renderHeaderPortal = () => {
    if (!mounted || !headerPortalEl || !quotation) return null;
    return createPortal(
      <div className="hidden md:flex items-center gap-2 pl-3 border-l border-gray-200 min-w-0">
        <span className="font-bold text-gray-950 text-sm truncate shrink-0">
          {quotation.quotationNumber}
        </span>
        <span className="text-gray-350 shrink-0">•</span>
        <span className="text-gray-600 text-xs md:text-sm truncate font-medium">
          {quotation.clientName}
        </span>
        <span className="shrink-0 scale-75 origin-left">
          <StatusBadge status={quotation.status as QuotationStatus} />
        </span>
      </div>,
      headerPortalEl
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>;
  if (!quotation) return <div className="text-center py-20 text-gray-400">Quotation not found</div>;

  return (
    <div className="pb-24">
      {renderHeaderPortal()}

      {/* Compact single-line header on the page (mobile only) */}
      <div className="md:hidden flex items-center justify-between mb-4 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-xs">
        <div className="min-w-0 flex-1 flex items-center gap-2 md:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 shrink-0">
            <h1 className="font-bold text-gray-950 text-xs md:text-sm">{quotation.quotationNumber}</h1>
            <span className="scale-75 origin-left shrink-0">
              <StatusBadge status={quotation.status as QuotationStatus} />
            </span>
          </div>
          <span className="text-gray-305 text-xs">|</span>
          <p className="text-gray-700 text-xs md:text-sm truncate font-semibold">
            {quotation.clientName}
          </p>
          <span className="text-gray-305 text-xs hidden sm:inline">|</span>
          <p className="text-gray-450 text-[10px] md:text-xs font-medium hidden sm:inline">
            {formatDate(quotation.createdAt)}
          </p>
        </div>
      </div>

      {/* Mobile room pill bar */}
      <MobileRoomSelector
        quotation={quotation}
        activeRoomId={activeRoomId}
        onSelectRoom={setActiveRoomId}
        onAddRoomClick={handleAddRoomClick}
      />

      {/* Main 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-5 lg:gap-6 lg:h-[calc(100vh-135px)] mt-4 lg:mt-0">
        {/* Left: Collapsible Room Panel (Desktop Only) */}
        <div className={`hidden lg:block lg:shrink-0 transition-all duration-300 ${sidebarCollapsed ? "lg:w-16" : "lg:w-64"}`}>
          <RoomPanel
            quotation={quotation}
            roomTypes={roomTypes}
            activeRoomId={activeRoomId}
            onSelectRoom={setActiveRoomId}
            onAddRoom={handleAddRoom}
            onDeleteRoom={handleDeleteRoom}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Right / Center: Product Selector or Item List */}
        <div className="w-full flex-1 min-w-0 flex flex-col gap-4 md:gap-5 overflow-hidden">
          {activeRoom && (
            <div className="min-h-[360px] md:min-h-[420px] lg:flex-1 overflow-hidden">
              <ProductSelector
                products={products}
                categories={categories}
                activeRoom={activeRoom}
                allRooms={quotation.rooms}
                onAddProduct={handleAddProduct}
                onUpdateItem={handleUpdateItem}
                onUpdateRoom={handleUpdateRoom}
                onDeleteItem={handleDeleteItem}
                onRefreshProducts={handleRefreshProducts}
              />
            </div>
          )}
          {!activeRoom && (
            <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
              <div className="text-center text-gray-400">
                <p className="text-lg md:text-xl lg:text-2xl font-medium mb-1 md:mb-2">Select a room</p>
                <p className="text-sm md:text-base">Choose a room to start adding products</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <StickyQuoteSummary
        quotation={quotation}
        activeRoom={activeRoom}
        isOpen={summaryOpen}
        onToggle={() => setSummaryOpen(!summaryOpen)}
      />

      {/* Bottom Sheet for Summary */}
      {summaryOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
            onClick={() => setSummaryOpen(false)}
          />
          {/* Sheet content */}
          <div className="relative bg-white w-full max-w-xl rounded-t-3xl shadow-2xl z-50 flex flex-col max-h-[80vh] border-t border-slate-100 overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm md:text-base">Quotation Summary</h3>
                <p className="text-xs text-slate-400 mt-0.5">{quotation.quotationNumber} • {quotation.clientName}</p>
              </div>
              <button
                onClick={() => setSummaryOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition"
              >
                Close
              </button>
            </div>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <QuotationSummary
                quotation={quotation}
                onUpdateDiscount={handleUpdateDiscount}
              />
            </div>
          </div>
        </div>
      )}

      {/* Page Level Add Room Modal */}
      <Modal isOpen={showAddRoomModal} onClose={() => setShowAddRoomModal(false)} title="Add Room" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Room Type
            </label>
            <select
              value={selectedRoomTypeId}
              onChange={(e) => {
                setSelectedRoomTypeId(e.target.value);
                if (e.target.value) setCustomRoomName("");
              }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            >
              <option value="">— Other (Custom Name) —</option>
              {roomTypes
                .filter((rt) => rt.isActive && !isBathroomLikeRoomName(rt.name))
                .map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
            </select>
          </div>

          {!selectedRoomTypeId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Room Name
              </label>
              <input
                autoFocus
                type="text"
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleAddRoomSubmit(); }
                }}
                placeholder="e.g. Master Bedroom, Terrace"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          <button
            onClick={handleAddRoomSubmit}
            disabled={addingRoom || (!selectedRoomTypeId && !customRoomName.trim())}
            className="w-full py-2.5 bg-whyte-blue text-white font-semibold rounded-xl hover:bg-whyte-light transition disabled:opacity-50"
          >
            {addingRoom ? "Adding..." : "Add Room"}
          </button>
        </div>
      </Modal>

      {/* Variant Picker Modal */}
      {pickerProduct && (
        <VariantPicker
          product={pickerProduct}
          onSelect={handleVariantSelected}
          onClose={() => setPickerProduct(null)}
        />
      )}
    </div>
  );
}
