"use client";
import { useState } from "react";
import { Quotation, QuotationRoom, RoomType } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { isBathroomLikeRoomName } from "@/lib/utils";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import Modal from "@/components/shared/Modal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

interface Props {
  quotation: Quotation;
  roomTypes: RoomType[];
  activeRoomId: number | null;
  onSelectRoom: (id: number) => void;
  onAddRoom: (roomTypeId: number | null, customName?: string) => Promise<void>;
  onDeleteRoom: (id: number) => Promise<void>;
}

export default function RoomPanel({ quotation, roomTypes, activeRoomId, onSelectRoom, onAddRoom, onDeleteRoom }: Props) {
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");
  const [customRoomName, setCustomRoomName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuotationRoom | null>(null);

  const getRoomName = (room: QuotationRoom) =>
    room.customName ?? room.roomType?.name ?? "Room";

  const getRoomSubtotal = (room: QuotationRoom) =>
    room.items.reduce((sum, item) => sum + item.quantity * Number(item.unitPrice), 0);

  const handleAdd = async () => {
    // Validation: need either a room type or a custom name
    if (!selectedRoomTypeId && !customRoomName.trim()) return;
    setAdding(true);
    try {
      const roomTypeId = selectedRoomTypeId ? Number(selectedRoomTypeId) : null;
      const custom = !selectedRoomTypeId ? customRoomName.trim() : undefined;
      await onAddRoom(roomTypeId, custom);
      // Reset form
      setSelectedRoomTypeId("");
      setCustomRoomName("");
      setShowAddRoom(false);
    } finally {
      setAdding(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddRoom(false);
    setSelectedRoomTypeId("");
    setCustomRoomName("");
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 md:px-5 md:py-4 lg:px-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 text-sm md:text-base lg:text-lg">Rooms</h2>
        <span className="text-xs md:text-sm text-gray-400">{quotation.rooms.length}</span>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {quotation.rooms.length === 0 && (
          <div className="p-4 md:p-5 text-center text-gray-400 text-xs md:text-sm">No rooms yet. Add a room to begin.</div>
        )}
        {quotation.rooms.map((room) => {
          const isActive = room.id === activeRoomId;
          const subtotal = getRoomSubtotal(room);
          return (
            <div
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              className={`group flex items-center justify-between px-3 py-3 md:px-4 md:py-3.5 lg:px-5 lg:py-4 cursor-pointer border-b border-gray-50 transition-all ${
                isActive ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
                {isActive && <ChevronRight size={14} className="text-whyte-blue shrink-0" />}
                <div className="min-w-0">
                  <p className={`text-sm md:text-base font-medium truncate ${isActive ? "text-whyte-blue" : "text-gray-800"}`}>
                    {room.roomType?.icon && <span className="mr-1">{room.roomType.icon}</span>}
                    {getRoomName(room)}
                  </p>
                  <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-400">
                    <span>{room.items.length} items</span>
                    {subtotal > 0 && <span>• {formatCurrency(subtotal)}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(room); }}
                className="opacity-0 group-hover:opacity-100 p-1 md:p-1.5 text-gray-300 hover:text-red-500 transition rounded-lg"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Room */}
      <div className="p-3 md:p-4 border-t border-gray-100">
        <button
          onClick={() => setShowAddRoom(true)}
          className="w-full flex items-center justify-center gap-1.5 md:gap-2 py-2 md:py-2.5 text-sm md:text-base text-whyte-blue font-medium rounded-xl border border-dashed border-blue-200 hover:bg-blue-50 transition"
        >
          <Plus size={15} />
          Add Room
        </button>
      </div>

      {/* Add Room Modal */}
      <Modal isOpen={showAddRoom} onClose={handleCloseModal} title="Add Room" size="sm">
        <div className="space-y-4">
          {/* Option 1: Select from existing room types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Room Type
            </label>
            <select
              value={selectedRoomTypeId}
              onChange={(e) => {
                setSelectedRoomTypeId(e.target.value);
                // Clear custom name when a type is selected
                if (e.target.value) setCustomRoomName("");
              }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            >
              <option value="">— Other (Custom Name) —</option>
              {roomTypes
                .filter((rt) => rt.isActive && !isBathroomLikeRoomName(rt.name))
                .map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.icon} {rt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Option 2: Custom name (only shown when no type selected) */}
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
                  if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                }}
                placeholder="e.g. Master Bedroom, Terrace"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={adding || (!selectedRoomTypeId && !customRoomName.trim())}
            className="w-full py-2.5 bg-whyte-blue text-white font-semibold rounded-xl hover:bg-whyte-light transition disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add Room"}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { await onDeleteRoom(deleteTarget!.id); setDeleteTarget(null); }}
        message={`Delete "${deleteTarget ? getRoomName(deleteTarget) : ""}" and all its items? This cannot be undone.`}
      />
    </div>
  );
}
