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
import { ArrowLeft, Eye } from "lucide-react";

export default function EstimatorPage() {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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
      await fetchQuotation();
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

  const activeRoom = quotation?.rooms.find((r) => r.id === activeRoomId) ?? null;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>;
  if (!quotation) return <div className="text-center py-20 text-gray-400">Quotation not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6 lg:mb-7">
        <div className="flex items-center gap-3 md:gap-4 lg:gap-5">
          <Link href="/" className="p-2 md:p-2.5 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 md:gap-2.5">
              <h1 className="font-bold text-gray-900 text-base md:text-xl lg:text-2xl">{quotation.quotationNumber}</h1>
              <StatusBadge status={quotation.status as QuotationStatus} />
            </div>
            <p className="text-gray-400 text-xs md:text-sm lg:text-[15px]">{quotation.clientName} • {formatDate(quotation.createdAt)}</p>
          </div>
        </div>
        <Link
          href={`/quotation/${id}/preview`}
          className="flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-3 lg:px-6 lg:py-3.5 bg-whyte-blue text-white rounded-xl font-medium text-sm md:text-base hover:bg-whyte-light transition-colors shadow-sm"
        >
          <Eye size={16} />
          Preview PDF
        </Link>
      </div>

      {/* Main 2-panel layout */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-5 lg:gap-6 lg:h-[calc(100vh-200px)]">
        {/* Left: Room Panel */}
        <div className="w-full lg:w-72 lg:shrink-0">
          <RoomPanel
            quotation={quotation}
            roomTypes={roomTypes}
            activeRoomId={activeRoomId}
            onSelectRoom={setActiveRoomId}
            onAddRoom={handleAddRoom}
            onDeleteRoom={handleDeleteRoom}
          />
        </div>

        {/* Center: Product Selector or Item List */}
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
                <p className="text-sm md:text-base">Choose a room from the left panel to start adding products</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className="w-full lg:w-80 lg:shrink-0">
          <QuotationSummary
            quotation={quotation}
            onUpdateDiscount={handleUpdateDiscount}
          />
        </div>
      </div>
    </div>
  );
}
