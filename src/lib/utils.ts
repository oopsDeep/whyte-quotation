import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = Number(amount);
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return "—";
  }
}

/**
 * Generates a quotation number like QT-2026-001.
 * NOTE: This must be called inside a transaction (see /api/quotations/route.ts)
 * to ensure uniqueness under concurrent requests.
 */
export function generateQuotationNumber(existingCount: number): string {
  const year = new Date().getFullYear();
  return `QT-${year}-${String(existingCount + 1).padStart(3, "0")}`;
}

export function isBathroomLikeRoomName(name: string | null | undefined): boolean {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return (
    normalized.includes("bathroom") ||
    normalized.includes("washroom") ||
    normalized.includes("toilet")
  );
}

/**
 * Aggregates product quantities across all rooms in a quotation.
 * Returns an array of products with their total quantities across all rooms.
 */
export function getProductTotals(quotation: { rooms: Array<{ items: Array<{ product?: any; quantity: number; unitPrice: string }> }> }) {
  const productMap = new Map<number, { product: any; totalQuantity: number }>();

  quotation.rooms.forEach((room) => {
    room.items.forEach((item) => {
      if (!item.product) return;
      const existing = productMap.get(item.product.id) ?? { product: item.product, totalQuantity: 0 };
      existing.totalQuantity += item.quantity;
      productMap.set(item.product.id, existing);
    });
  });

  // Return sorted by product name for consistent display
  return Array.from(productMap.values()).sort((a, b) =>
    (a.product?.name ?? "").localeCompare(b.product?.name ?? "")
  );
}

/**
 * Builds a breadcrumb path from a category by walking up the parent chain.
 * Returns a human-readable string like "Tactus → Glass → Wifi"
 * or an array of names for custom formatting.
 */
export function getCategoryBreadcrumb(
  category: { name: string; parent?: { name: string; parent?: { name: string } | null } | null } | null | undefined
): string {
  if (!category) return "";

  const parts: string[] = [];
  let current: any = category;
  while (current) {
    parts.unshift(current.name);
    current = current.parent ?? null;
  }
  return parts.join(" → ");
}

export interface ProductTag {
  /** Display label for the tag */
  label: string;
  /** Depth in the hierarchy: 1 = root/series, 2 = category, 3 = sub-category, etc. */
  level: number;
  /** The category id this tag represents */
  id: number;
}

/**
 * Converts a product's nested category chain into a flat, ordered array of
 * tag objects (root-first). Compatible with any nesting depth.
 *
 * Example: product with category { name:'WiFi', id:5, parent:{ name:'Glass', id:3, parent:{ name:'Tactus', id:1 } } }
 * returns: [ { label:'Tactus', level:1, id:1 }, { label:'Glass', level:2, id:3 }, { label:'WiFi', level:3, id:5 } ]
 */
export function getProductTags(
  product: { category?: { id: number; name: string; level: number; parent?: any } | null }
): ProductTag[] {
  if (!product.category) return [];

  const tags: ProductTag[] = [];
  let current: any = product.category;

  // Walk up the parent chain, collecting nodes
  while (current) {
    tags.unshift({ label: current.name, level: current.level ?? tags.length + 1, id: current.id });
    current = current.parent ?? null;
  }

  return tags;
}

