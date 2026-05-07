"use client";
import { useState, useEffect, useCallback } from "react";
import { Quotation, Product, Category, RoomType } from "@/types";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import RoomPanel from "@/components/estimator/RoomPanel";
import ProductSelector from "@/components/estimator/ProductSelector";
import QuotationSummary from "@/components/estimator/QuotationSummary";
import StatusBadge from "@/components/shared/StatusBadge";
import { QuotationStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Eye, Menu, Save } from "lucide-react";
import { useProducts, useCategories, useRoomTypes, useQuotation } from "@/lib/swr";

export default function EstimatorPage() {
  const { id } = useParams<{ id: string }>();

  // SWR hooks for shared/cacheable data
  const { data: products = [], mutate: mutateProducts } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: roomTypes = [] } = useRoomTypes();
  const { data: quotationData, isLoading: loadingQuotation, mutate: mutateQuotation } = useQuotation(id);

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [showRoomsDrawer, setShowRoomsDrawer] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);

  // Sync SWR quotation data into local state
  useEffect(() => {
    if (quotationData) {
      setQuotation(quotationData);
      setActiveRoomId((prev) => {
        if (prev === null && quotationData.rooms?.length > 0) {
          return quotationData.rooms[0].id;
        }
        return prev;
      });
    }
  }, [quotationData]);

  const handleRefreshProducts = async () => {
    try {
      await mutateProducts();
      toast.success("Products refreshed");
    } catch {
      toast.error("Failed to refresh products");
    }
  };

  const handleAddProduct = async (productId: number) => {
    if (!activeRoomId) {
      toast.error("Select a room first");
      return;
    }
    try {
      const res = await fetch(`/api/quotations/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotationRoomId: activeRoomId, productId, quantity: 1 }),
      });
      if (!res.ok) throw new Error();
      toast.success("Added to room");
      await mutateQuotation();
    } catch {
      toast.error("Failed to add product");
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
      await mutateQuotation();
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
      await mutateQuotation();
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
    await mutateQuotation();
  };

  const handleDeleteItem = async (itemId: number) => {
    await fetch(`/api/quotations/${id}/items/${itemId}`, { method: "DELETE" });
    await mutateQuotation();
  };

  const handleUpdateRoom = async (roomId: number, data: any) => {
    console.log("[handleUpdateRoom] Updating room:", roomId, "with data:", data);
    const res = await fetch(`/api/quotations/${id}/rooms/${roomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const responseJson = await res.json();
    console.log("[handleUpdateRoom] Response status:", res.status, "json:", responseJson);

    if (!res.ok) {
      const errorMsg = responseJson?.details || responseJson?.error || `Failed to update room: ${res.status} ${res.statusText}`;
      console.error("[handleUpdateRoom] Error response:", errorMsg, responseJson);
      throw new Error(errorMsg);
    }

    await mutateQuotation();
  };

  const handleUpdateDiscount = async (discountType: string, discountValue: number) => {
    await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discountType, discountValue }),
    });
    await mutateQuotation();
  };

  const handleSaveSnapshot = async () => {
    setSavingHeader(true);
    try {
      await Promise.all([mutateQuotation(), mutateProducts()]);
      toast.success("Changes synced");
    } catch {
      toast.error("Failed to sync changes");
    } finally {
      setSavingHeader(false);
    }
  };

  const activeRoom = quotation?.rooms.find((r) => r.id === activeRoomId) ?? null;

  if (loadingQuotation && !quotation) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>;
  if (!quotation) return <div className="text-center py-20 text-gray-400">Quotation not found</div>;

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      {/* Compact Header */}
      <div className="sticky top-0 z-30 -mx-4 md:-mx-6 lg:-mx-8 2xl:-mx-12 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex flex-col gap-3 px-4 py-3 md:px-6 md:py-4 xl:px-8 2xl:px-12">
          {/* Top row: Nav + Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowRoomsDrawer(true)}
              className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 shrink-0"
              aria-label="Open rooms"
            >
              <Menu size={18} />
            </button>
            <Link href="/" className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600 shrink-0">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 truncate">{quotation.quotationNumber}</h1>
                <StatusBadge status={quotation.status as QuotationStatus} />
              </div>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{quotation.clientName} • {formatDate(quotation.createdAt)}</p>
            </div>
          </div>

          {/* Bottom row: Actions */}
          <div className="flex items-center gap-2 md:gap-3 self-end sm:self-auto sm:ml-auto">
            <button
              type="button"
              onClick={handleSaveSnapshot}
              disabled={savingHeader}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-gray-200 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Save size={16} />
              <span className="hidden xs:inline">{savingHeader ? "Saving..." : "Save"}</span>
            </button>
            <Link
              href={`/quotation/${id}/preview`}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-whyte-blue px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-white shadow-sm transition-colors hover:bg-whyte-light"
            >
              <Eye size={16} />
              <span className="hidden xs:inline">Preview PDF</span>
              <span className="xs:hidden">PDF</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Layout — flex on lg+, stack on mobile */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-5 lg:gap-6">
        {/* Left: Room Panel — hidden on mobile, use drawer instead */}
        <div className="hidden lg:flex lg:flex-col w-64 xl:w-72 2xl:w-80 shrink-0 self-start sticky top-[5.75rem] max-h-[calc(100dvh-7rem)]">
          <RoomPanel
            quotation={quotation}
            roomTypes={roomTypes}
            activeRoomId={activeRoomId}
            onSelectRoom={setActiveRoomId}
            onAddRoom={handleAddRoom}
            onDeleteRoom={handleDeleteRoom}
          />
        </div>

        {/* Center: Product Selector or Item List — takes remaining space */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 md:gap-5">
          {activeRoom && (
            <div className="min-h-[350px] sm:min-h-[420px] lg:flex-1 overflow-hidden">
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
            <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 min-h-[200px]">
              <div className="text-center text-gray-400">
                <p className="text-lg md:text-xl lg:text-2xl font-medium mb-1 md:mb-2">Select a room</p>
                <p className="text-sm md:text-base">Choose a room from the left panel to start adding products</p>
              </div>
            </div>
          )}

          {/* Summary on mobile/tablet — below product selector */}
          <div className="lg:hidden w-full">
            <QuotationSummary
              quotation={quotation}
              onUpdateDiscount={handleUpdateDiscount}
            />
          </div>
        </div>

        {/* Right: Summary — desktop only (mobile version is above) */}
        <div className="hidden lg:block w-72 xl:w-80 shrink-0 self-start sticky top-[5.75rem] max-h-[calc(100dvh-7rem)]">
          <QuotationSummary
            quotation={quotation}
            onUpdateDiscount={handleUpdateDiscount}
          />
        </div>
      </div>

      {/* Mobile Rooms Drawer */}
      {showRoomsDrawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRoomsDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 shrink-0">
              <p className="font-semibold text-gray-900">Rooms</p>
              <button
                type="button"
                onClick={() => setShowRoomsDrawer(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <RoomPanel
                quotation={quotation}
                roomTypes={roomTypes}
                activeRoomId={activeRoomId}
                onSelectRoom={(roomId) => {
                  setActiveRoomId(roomId);
                  setShowRoomsDrawer(false);
                }}
                onAddRoom={handleAddRoom}
                onDeleteRoom={handleDeleteRoom}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
