"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { HouseType } from "@/types";

type HouseTypeOption = Pick<HouseType, "id" | "name" | "description" | "isActive" | "sortOrder">;

interface NewQuotationFormProps {
  initialHouseTypes: HouseTypeOption[];
}

export default function NewQuotationForm({ initialHouseTypes }: NewQuotationFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    clientName: "",
    clientGstNumber: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    houseTypeId: "",
    defaultTier: "",
    defaultFinish: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const houseTypes = useMemo(
    () => (Array.isArray(initialHouseTypes) ? initialHouseTypes.filter((ht) => ht.isActive !== false) : []),
    [initialHouseTypes]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          clientGstNumber: form.clientGstNumber.trim() || null,
          houseTypeId: form.houseTypeId ? Number(form.houseTypeId) : null,
          defaultTier: form.defaultTier || null,
          defaultFinish: form.defaultFinish || null,
        }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      toast.success("Quotation created!");
      router.push(`/quotation/${data.id}`);
    } catch {
      toast.error("Failed to create quotation");
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition bg-white";

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 sm:mb-4 transition">
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">New Quotation</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Fill in client details to get started</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
            <input
              required
              type="text"
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              className={inputClass}
              placeholder="Enter client name"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer GST Number (Optional)</label>
              <input
                type="text"
                value={form.clientGstNumber}
                onChange={(e) => setForm({ ...form, clientGstNumber: e.target.value.toUpperCase() })}
                className={inputClass}
                placeholder="Enter customer GSTIN (if available)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.clientPhone}
                onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
                className={inputClass}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.clientEmail}
                onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
                className={inputClass}
                placeholder="client@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Address</label>
            <textarea
              value={form.clientAddress}
              onChange={(e) => setForm({ ...form, clientAddress: e.target.value })}
              className={inputClass + " resize-none"}
              rows={2}
              placeholder="Full project address..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">House Type</label>
            <select
              value={form.houseTypeId}
              onChange={(e) => setForm({ ...form, houseTypeId: e.target.value })}
              className={inputClass}
            >
              <option value="">- Select House Type (optional) -</option>
              {houseTypes.map((ht) => (
                <option key={ht.id} value={ht.id}>
                  {ht.name} {ht.description ? `- ${ht.description}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Rooms will be auto-populated based on house type</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Automation Tier</label>
              <select
                value={form.defaultTier}
                onChange={(e) => setForm({ ...form, defaultTier: e.target.value })}
                className={inputClass}
              >
                <option value="">— None (pick per product) —</option>
                <option value="remote">Remote Based</option>
                <option value="wifi">WiFi</option>
                <option value="zigbee">Zigbee</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Auto-selects this tier when adding switch boards</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Surface Finish</label>
              <select
                value={form.defaultFinish}
                onChange={(e) => setForm({ ...form, defaultFinish: e.target.value })}
                className={inputClass}
              >
                <option value="">— None (pick per product) —</option>
                <option value="acrylic">Acrylic</option>
                <option value="glass">Glass</option>
                <option value="metal">Metal</option>
                <option value="wood">Wood</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">Auto-selects this finish when adding products</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-whyte-blue text-white font-semibold rounded-xl hover:bg-whyte-light transition-all shadow-lg shadow-blue-900/20 disabled:opacity-60 mt-2"
          >
            {submitting ? "Creating..." : "Create Quotation ->"}
          </button>
        </form>
      </div>
    </div>
  );
}
