export type ProductType = "switch_board" | "accessory" | "retrofit" | "curtain" | "smart_lock" | "vdp" | "other";
export type QuotationStatus = "draft" | "sent" | "approved" | "rejected";
export type DiscountType = "percentage" | "fixed" | "none";
export type AdminRole = "super_admin" | "admin" | "sales";

export interface Category {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
  parent?: Category | null;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
  products?: Product[];
}

export interface Product {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  type: ProductType;
  categoryId: number | null;
  category?: Category;
  price: string;
  unit: string;
  imageUrl: string | null;
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuotationItem {
  id: number;
  quotationRoomId: number;
  productId: number;
  product?: Product;
  sbNumber: string | null;
  quantity: number;
  unitPrice: string;
  notes: string | null;
  sortOrder: number;
}

export interface QuotationRoom {
  id: number;
  quotationId: string;
  roomTypeId: number | null;
  roomType?: { id: number; name: string; icon: string | null };
  customName: string | null;
  subArea: string | null;
  notes: string | null;
  sortOrder: number;
  items: QuotationItem[];
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  clientName: string;
  clientGstNumber: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  houseTypeId: number | null;
  houseType?: { id: number; name: string };
  status: QuotationStatus;
  notes: string | null;
  discountType: DiscountType | null;
  discountValue: string | null;
  terms: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt?: string;
  rooms: QuotationRoom[];
}

export interface Company {
  id: number;
  name: string;
  gstNumber: string | null;
  phone: string;
  email: string | null;
  address: string;
  logoUrl: string | null;
  tagline: string | null;
}

export interface HouseType {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  roomTemplate?: HouseTypeRoomTemplate[];
}

export interface RoomType {
  id: number;
  name: string;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface HouseTypeRoomTemplate {
  id: number;
  houseTypeId: number;
  roomTypeId: number;
  roomType?: RoomType;
  defaultCount: number;
  sortOrder: number;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
}
