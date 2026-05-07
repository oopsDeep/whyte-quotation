"use client";
import { useState, useEffect, useRef } from "react";
import { QuotationItem, QuotationRoom } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Minus, Plus, MessageSquareText } from "lucide-react";
import ProductTags from "./ProductTags";

interface Props {
  item: QuotationItem;
  currentRoomId: number;
  allRooms: QuotationRoom[];
  onUpdate: (data: any) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function ItemRow({ item, currentRoomId, allRooms, onUpdate, onDelete }: Props) {
  const [qty, setQty] = useState(item.quantity);
  const [sbNumber, setSbNumber] = useState(item.sbNumber ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [targetRoomId, setTargetRoomId] = useState(String(currentRoomId));
  const [showNotes, setShowNotes] = useState(Boolean(item.notes?.trim()));
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [movingRoom, setMovingRoom] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Keep refs to previous server values so we only call onUpdate when changed
  const prevQty = useRef(item.quantity);
  const prevSb = useRef(item.sbNumber ?? "");
  const prevNotes = useRef(item.notes ?? "");

  // Sync local state if item prop changes from server (e.g. after refresh)
  useEffect(() => {
    setQty(item.quantity);
    prevQty.current = item.quantity;
  }, [item.quantity]);

  useEffect(() => {
    setTargetRoomId(String(currentRoomId));
  }, [currentRoomId]);

  useEffect(() => {
    setSbNumber(item.sbNumber ?? "");
    prevSb.current = item.sbNumber ?? "";
  }, [item.sbNumber]);

  useEffect(() => {
    setNotes(item.notes ?? "");
    prevNotes.current = item.notes ?? "";
    setNotesDirty(false);
    if (item.notes?.trim()) setShowNotes(true);
  }, [item.notes]);

  // Debounce quantity updates — only fire when actually different from server value
  useEffect(() => {
    if (qty === prevQty.current) return;
    const timer = setTimeout(async () => {
      await onUpdate({ quantity: qty });
      prevQty.current = qty;
    }, 500);
    return () => clearTimeout(timer);
  }, [qty, onUpdate]);

  // Debounce SB number updates — only fire when actually different
  useEffect(() => {
    if (sbNumber === prevSb.current) return;
    const timer = setTimeout(async () => {
      await onUpdate({ sbNumber: sbNumber.trim() || null });
      prevSb.current = sbNumber;
    }, 800);
    return () => clearTimeout(timer);
  }, [sbNumber, onUpdate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const handleMoveRoom = async (roomIdValue: string) => {
    const roomId = Number(roomIdValue);
    if (!roomId || roomId === currentRoomId) return;

    setMovingRoom(true);
    try {
      await onUpdate({ quotationRoomId: roomId });
    } finally {
      setMovingRoom(false);
    }
  };

  const saveNotes = async () => {
    const normalized = notes.trim();
    const previous = prevNotes.current.trim();
    if (normalized === previous) {
      setNotesDirty(false);
      return;
    }

    setSavingNotes(true);
    try {
      await onUpdate({ notes: normalized || null });
      prevNotes.current = notes;
      setNotesDirty(false);
    } finally {
      setSavingNotes(false);
    }
  };

  const lineTotal = qty * Number(item.unitPrice);

  return (
    <div className="px-3 py-3 sm:px-4 md:px-5 md:py-4 lg:px-6 hover:bg-gray-50/50 transition">
      {/* Desktop: single row layout */}
      <div className="hidden sm:flex items-start gap-3 md:gap-4">
        {/* SB Number */}
        <input
          type="text"
          value={sbNumber}
          onChange={(e) => setSbNumber(e.target.value)}
          placeholder="SB #"
          title="Switch Board Number"
          className="w-14 md:w-16 px-2 py-1 md:py-1.5 border border-gray-200 rounded-lg text-xs md:text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-200 shrink-0"
        />

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm md:text-base truncate">{item.product?.name ?? "Product"}</p>
          <p className="text-xs md:text-sm text-gray-400">
            {formatCurrency(item.unitPrice)} / {item.product?.unit ?? "pcs"}
            {item.product?.code && <span className="ml-1 font-mono">• {item.product.code}</span>}
          </p>
          {item.product?.category && (
            <div className="mt-1">
              <ProductTags product={item.product} mode="full" />
            </div>
          )}
          {allRooms.length > 1 && (
            <div className="mt-1.5">
              <label className="text-[11px] md:text-xs text-gray-400 mr-2">Move to</label>
              <select
                value={targetRoomId}
                onChange={(e) => {
                  const next = e.target.value;
                  setTargetRoomId(next);
                  void handleMoveRoom(next);
                }}
                disabled={movingRoom}
                className="max-w-[170px] px-2 py-1 border border-gray-200 rounded-md text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-200 disabled:opacity-50"
              >
                {allRooms.map((room) => {
                  const roomName = room.customName ?? room.roomType?.name ?? "Room";
                  return (
                    <option key={room.id} value={room.id}>
                      {roomName}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Qty Stepper */}
        <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600"
          >
            <Minus size={10} />
          </button>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (Number.isNaN(value)) return;
              setQty(Math.max(1, Math.floor(value)));
            }}
            className="w-10 md:w-12 px-1 py-0.5 text-center text-sm md:text-base font-semibold text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-200"
            aria-label="Quantity"
          />
          <button
            onClick={() => setQty(qty + 1)}
            className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600"
          >
            <Plus size={10} />
          </button>
        </div>

        {/* Line Total */}
        <div className="w-20 md:w-24 text-right shrink-0">
          <p className="font-semibold text-gray-900 text-sm md:text-base">{formatCurrency(lineTotal)}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setShowNotes(!showNotes)}
            title={showNotes ? "Hide customer note" : "Add customer note"}
            className={`p-1 rounded transition ${
              showNotes || notes.trim()
                ? "text-whyte-blue bg-blue-50 hover:bg-blue-100"
                : "text-gray-300 hover:text-gray-600"
            }`}
          >
            <MessageSquareText size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Remove item"
            className="p-1 text-gray-300 hover:text-red-500 transition rounded disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Mobile: stacked layout */}
      <div className="sm:hidden space-y-2.5">
        {/* Top: Product name + delete */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 text-sm truncate">{item.product?.name ?? "Product"}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatCurrency(item.unitPrice)} / {item.product?.unit ?? "pcs"}
              {item.product?.code && <span className="ml-1 font-mono">• {item.product.code}</span>}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`p-2 rounded-lg transition ${
                showNotes || notes.trim()
                  ? "text-whyte-blue bg-blue-50"
                  : "text-gray-300"
              }`}
            >
              <MessageSquareText size={16} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-gray-300 hover:text-red-500 transition rounded-lg disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Tags */}
        {item.product?.category && (
          <div>
            <ProductTags product={item.product} mode="full" />
          </div>
        )}

        {/* Bottom: SB# + Qty Stepper + Total */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={sbNumber}
            onChange={(e) => setSbNumber(e.target.value)}
            placeholder="SB #"
            title="Switch Board Number"
            className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-200"
          />

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600"
            >
              <Minus size={12} />
            </button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) return;
                setQty(Math.max(1, Math.floor(value)));
              }}
              className="w-12 px-1 py-1 text-center text-sm font-semibold text-gray-900 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-200"
              aria-label="Quantity"
            />
            <button
              onClick={() => setQty(qty + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition text-gray-600"
            >
              <Plus size={12} />
            </button>
          </div>

          <p className="font-semibold text-gray-900 text-sm ml-auto">{formatCurrency(lineTotal)}</p>
        </div>

        {/* Move to room */}
        {allRooms.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Move to</label>
            <select
              value={targetRoomId}
              onChange={(e) => {
                const next = e.target.value;
                setTargetRoomId(next);
                void handleMoveRoom(next);
              }}
              disabled={movingRoom}
              className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-200 disabled:opacity-50"
            >
              {allRooms.map((room) => {
                const roomName = room.customName ?? room.roomType?.name ?? "Room";
                return (
                  <option key={room.id} value={room.id}>
                    {roomName}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Notes (collapsible) — saved on blur to avoid excessive API calls */}
      {showNotes && (
        <div className="mt-2 md:mt-3 sm:ml-[68px] md:ml-[84px]">
          <p className="text-[11px] md:text-xs font-medium text-gray-500 mb-1">Customer Note (for site visit/fitting)</p>
          <textarea
            value={notes}
            rows={2}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesDirty(e.target.value !== prevNotes.current);
            }}
            onBlur={saveNotes}
            placeholder="e.g. Install near entrance, keep module at 4.5 ft height, customer wants warm white"
            className="w-full px-3 py-2 md:py-2.5 border border-gray-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-blue-200 resize-y"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] md:text-xs text-gray-400">
              {savingNotes ? "Saving..." : notesDirty ? "Unsaved changes" : "Saved"}
            </span>
            <button
              type="button"
              onClick={saveNotes}
              disabled={savingNotes || !notesDirty}
              className="px-2 py-1 md:px-2.5 md:py-1.5 text-[11px] md:text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Save Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
