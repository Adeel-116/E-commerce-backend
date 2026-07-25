import { Request } from "express";

// ── Product ───────────────────────────────────────────────────────────────────

export interface ColorVariant {
  name: string;
  hex: string;
  images: string[];
}

export interface ProductDocument {
  productId: number;
  title: string;
  slug: string;
  description: string;
  images: string[];
  price: number;
  comparePrice: number | null;
  category: string[];
  sizes: string[];
  colors: ColorVariant[];
  isNew: boolean;
  stock: boolean;
  status: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductFilterQuery {
  title?: string;
  stock?: string;
  status?: string;
  sort?: string;
  page?: string;
  limit?: string;
  category?: string;
  size?: string;
  minPrice?: string;
  maxPrice?: string;
  isBestSeller?: string;
}

export interface CreateProductInput {
  title: string;
  description?: string;
  images?: string[];
  price?: number | string;
  comparePrice?: number | string | null;
  stock?: boolean | string;
  status?: string;
  isNew?: boolean | string;
  isBestSeller?: boolean | string;
  category?: string[];
  sizes?: string[];
  colors?: ColorVariant[];
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface DeleteProductQuery {
  id?: string;
  ids?: string;
  deleteAll?: string;
}

export interface BulkWriteError {
  index: number;
  code: number;
  errmsg: string;
}

export interface FormattedError {
  index: number;
  message: string;
  code: number;
  failedDocument: unknown;
}

export interface SaveResult {
  insertedCount: number;
  errors: FormattedError[];
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export interface CartOwner {
  ownerId: string;
  ownerType: "user" | "guest";
}

export interface AddToCartBody {
  productId: string;
  size: string;
  color?: string;
}

export interface RemoveFromCartQuery {
  productId?: string;
  size?: string;
  color?: string;
}

export interface UpdateQuantityBody {
  productId: string;
  size: string;
  quantity: number;
  color?: string;
}

export type CartRequest = Request & { cartOwner: CartOwner };

// ── Discount ──────────────────────────────────────────────────────────────────

export interface CreateDiscountInput {
  name: string;
  type: "coupon" | "product" | "all_products";
  couponType?: "reward" | "general";
  productIds?: string[];
  valueType: "percentage" | "fixed";
  value: number;
  code?: string;
  usageLimit?: number | null;
  startDate?: Date | string;
  endDate?: Date | string;
  isActive?: boolean;
}

// ── ContactUs ─────────────────────────────────────────────────────────────────

export interface ContactUsDocument {
  fullName: string;
  email: string;
  contact: string;
  message: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateContactUsInput {
  fullName: string;
  email: string;
  contact: string;
  message: string;
}

// ── Subscriber ────────────────────────────────────────────────────────────────

export interface SubscriberDocument {
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSubscriberInput {
  email: string;
}

// ── Express global augmentation ───────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      cartOwner?: CartOwner;
      user?: { id: string };
    }
  }
}