"use client";
import { useState, useEffect } from "react";
import { Company } from "@/types";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useCompany } from "@/lib/swr";

export default function CompanyPage() {
  const { data: fetched, isLoading: loading, mutate } = useCompany();

  const [company, setCompany] = useState<Partial<Company>>({
    name: "",
    gstNumber: "",
    phone: "",
    email: "",
    address: "",
    tagline: "",
  });
  const [saving, setSaving] = useState(false);

  // Sync SWR data into local form state when it arrives
  useEffect(() => {
    if (fetched) {
      setCompany(fetched);
    }
  }, [fetched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      if (!res.ok) throw new Error();
      toast.success("Company settings saved!");
      mutate();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const inputClass =
    "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition";

  return (
    <div className="max-w-2xl">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Company Settings</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Shown on all PDF quotations</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              required
              value={company.name ?? ""}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              className={inputClass}
              placeholder="Whyte Automations Pvt. Ltd."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company GST Number</label>
              <input
                type="text"
                value={company.gstNumber ?? ""}
                onChange={(e) => setCompany({ ...company, gstNumber: e.target.value.toUpperCase() })}
                className={inputClass}
                placeholder="24AAXCS4505Q1ZK"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="text"
                required
                value={company.phone ?? ""}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                className={inputClass}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={company.email ?? ""}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                className={inputClass}
                placeholder="info@whyte.co.in"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <textarea
              required
              value={company.address ?? ""}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
              className={inputClass + " resize-none"}
              rows={3}
              placeholder="Full company address..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tagline (on PDF header)</label>
            <input
              type="text"
              value={company.tagline ?? ""}
              onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
              className={inputClass}
              placeholder="Smart Homes. Smarter Living."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-whyte-blue text-white font-semibold rounded-xl hover:bg-whyte-light transition-colors disabled:opacity-60 mt-2"
          >
            {saving ? "Saving..." : "Save Company Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
