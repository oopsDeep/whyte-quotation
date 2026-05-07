"use client";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Delete",
  message,
  confirmText = "Delete",
  isLoading,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-xl">
            <AlertTriangle className="text-red-600" size={20} />
          </div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Deleting..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
