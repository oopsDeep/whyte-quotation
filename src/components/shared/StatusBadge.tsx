import { QuotationStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<QuotationStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  sent: { label: "Sent", className: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
};

export default function StatusBadge({ status }: { status: QuotationStatus }) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
