"use client";
import { useState } from "react";
import { RoomType } from "@/types";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { getRoomIcon } from "@/lib/utils";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useRoomTypes } from "@/lib/swr";

function RoomTypeForm({ roomType, onSuccess }: { roomType?: RoomType | null; onSuccess: () => void }) {
  const [name, setName] = useState(roomType?.name ?? "");
  const [icon, setIcon] = useState(roomType?.icon ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = roomType ? `/api/room-types/${roomType.id}` : "/api/room-types";
      const res = await fetch(url, {
        method: roomType ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon, sortOrder: 0, isActive: true }),
      });
      if (!res.ok) throw new Error();
      toast.success(roomType ? "Updated!" : "Created!");
      onSuccess();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Room Name *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="e.g. Living Room"
        />
      </div>
      <button type="submit" disabled={saving} className="w-full py-2.5 bg-whyte-blue text-white font-semibold rounded-xl hover:bg-whyte-light transition disabled:opacity-60">
        {saving ? "Saving..." : roomType ? "Update" : "Create Room Type"}
      </button>
    </form>
  );
}

export default function RoomTypesPage() {
  const { data: roomTypes = [], isLoading: loading, mutate } = useRoomTypes();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<RoomType | null>(null);

  const handleToggle = async (rt: RoomType) => {
    await fetch(`/api/room-types/${rt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rt.isActive }),
    });
    mutate();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Room Types</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">{roomTypes.length} room types</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-whyte-blue text-white rounded-xl font-medium text-sm hover:bg-whyte-light transition-colors w-full sm:w-auto"
        >
          <Plus size={16} />
          Add Room Type
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y divide-gray-50">
          {roomTypes.map((rt: RoomType) => {
            const RoomIcon = getRoomIcon(rt.name);
            return (
              <div key={rt.id} className={`flex items-center justify-between px-3 sm:px-4 py-3 sm:border-r border-gray-50 ${!rt.isActive ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <RoomIcon size={16} className="text-gray-500 shrink-0" />
                  <span className="text-sm font-medium text-gray-800 truncate">{rt.name}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditTarget(rt); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-whyte-blue hover:bg-blue-50 rounded-lg transition">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleToggle(rt)} className="text-gray-400 hover:text-gray-650 transition">
                    {rt.isActive ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        title={editTarget ? "Edit Room Type" : "Add Room Type"}
      >
        <RoomTypeForm
          roomType={editTarget}
          onSuccess={() => { setShowForm(false); setEditTarget(null); mutate(); }}
        />
      </Modal>
    </div>
  );
}
