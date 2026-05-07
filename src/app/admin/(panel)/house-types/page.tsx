"use client";
import { useState } from "react";
import { HouseType, RoomType } from "@/types";
import { isBathroomLikeRoomName } from "@/lib/utils";
import { Plus, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/shared/Modal";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useHouseTypes, useRoomTypes } from "@/lib/swr";

interface HouseTypeFormProps {
  houseType?: HouseType | null;
  roomTypes: RoomType[];
  onSuccess: () => void;
}

function HouseTypeFormModal({ houseType, roomTypes, onSuccess }: HouseTypeFormProps) {
  const [name, setName] = useState(houseType?.name ?? "");
  const [description, setDescription] = useState(houseType?.description ?? "");
  const [rooms, setRooms] = useState<{ roomTypeId: number; defaultCount: number }[]>(
    houseType?.roomTemplate
      ?.filter((t) => !isBathroomLikeRoomName((t.roomType as any)?.name))
      .map((t) => ({ roomTypeId: t.roomTypeId, defaultCount: t.defaultCount })) ?? []
  );
  const [saving, setSaving] = useState(false);

  const toggleRoom = (roomTypeId: number) => {
    if (rooms.find((r) => r.roomTypeId === roomTypeId)) {
      setRooms(rooms.filter((r) => r.roomTypeId !== roomTypeId));
    } else {
      setRooms([...rooms, { roomTypeId, defaultCount: 1 }]);
    }
  };

  const setCount = (roomTypeId: number, count: number) => {
    setRooms(rooms.map((r) => r.roomTypeId === roomTypeId ? { ...r, defaultCount: count } : r));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = houseType ? `/api/house-types/${houseType.id}` : "/api/house-types";
      const res = await fetch(url, {
        method: houseType ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, sortOrder: 0, rooms }),
      });
      if (!res.ok) throw new Error();
      toast.success(houseType ? "Updated!" : "Created!");
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
        <label className="block text-sm font-medium text-gray-700 mb-1">House Type Name *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          placeholder="e.g. 3 BHK"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Room Template</label>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {roomTypes.filter((rt) => !isBathroomLikeRoomName(rt.name)).map((rt) => {
            const selected = rooms.find((r) => r.roomTypeId === rt.id);
            return (
              <div key={rt.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`rt-${rt.id}`}
                  checked={!!selected}
                  onChange={() => toggleRoom(rt.id)}
                  className="w-4 h-4"
                />
                <label htmlFor={`rt-${rt.id}`} className="flex-1 text-sm text-gray-700">
                  {rt.icon} {rt.name}
                </label>
                {selected && (
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={selected.defaultCount}
                    onChange={(e) => setCount(rt.id, Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none text-center"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full py-2.5 bg-whyte-blue text-white font-semibold rounded-xl hover:bg-whyte-light transition disabled:opacity-60"
      >
        {saving ? "Saving..." : houseType ? "Update House Type" : "Create House Type"}
      </button>
    </form>
  );
}

export default function HouseTypesPage() {
  const { data: houseTypes = [], isLoading: loadingHT, mutate: mutateHouseTypes } = useHouseTypes();
  const { data: roomTypes = [], isLoading: loadingRT } = useRoomTypes();
  const loading = loadingHT || loadingRT;

  const [expanded, setExpanded] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<HouseType | null>(null);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">House Types</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Manage room templates for each house type</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowForm(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-whyte-blue text-white rounded-xl font-medium text-sm hover:bg-whyte-light transition-colors w-full sm:w-auto"
        >
          <Plus size={16} />
          Add House Type
        </button>
      </div>

      <div className="space-y-2">
        {houseTypes.map((ht: HouseType) => (
          <div key={ht.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div
              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition gap-2"
              onClick={() => setExpanded(expanded === ht.id ? null : ht.id)}
            >
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0 flex-1">
                <span className="font-semibold text-gray-900 text-sm sm:text-base">{ht.name}</span>
                {ht.description && <span className="text-gray-400 text-xs sm:text-sm hidden sm:inline">{ht.description}</span>}
                <span className="text-[11px] sm:text-xs bg-blue-50 text-blue-600 px-1.5 sm:px-2 py-0.5 rounded-full">
                  {ht.roomTemplate?.filter((t) => !isBathroomLikeRoomName((t.roomType as any)?.name)).length ?? 0} rooms
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditTarget(ht); setShowForm(true); }}
                  className="p-1.5 text-gray-400 hover:text-whyte-blue hover:bg-blue-50 rounded-lg transition"
                >
                  <Pencil size={15} />
                </button>
                {expanded === ht.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>
            {expanded === ht.id && (
              <div className="border-t border-gray-50 px-4 pb-4 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {ht.roomTemplate
                    ?.filter((t) => !isBathroomLikeRoomName((t.roomType as any)?.name))
                    .map((t) => (
                    <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-lg">{(t.roomType as any)?.icon ?? "🏠"}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{(t.roomType as any)?.name ?? "Room"}</p>
                        <p className="text-xs text-gray-400">× {t.defaultCount}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        title={editTarget ? `Edit: ${editTarget.name}` : "Add House Type"}
        size="lg"
      >
        <HouseTypeFormModal
          houseType={editTarget}
          roomTypes={roomTypes}
          onSuccess={() => { setShowForm(false); setEditTarget(null); mutateHouseTypes(); }}
        />
      </Modal>
    </div>
  );
}
