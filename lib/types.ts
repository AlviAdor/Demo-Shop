import type { PhotoKey } from "./photos";
import type { Currency } from "./currency";

export type Role = "owner" | "staff" | "customer";
export type Status = "pending" | "paid" | "shipped" | "delivered" | "cancelled";
export const STATUSES: Status[] = ["pending", "paid", "shipped", "delivered", "cancelled"];
export type PaymentStatus = "requires_payment" | "paid" | "failed" | "expired" | "canceled" | "refunded";

export type ProductImage = { key: PhotoKey; pos: string }; // pos = CSS object-position for the crop

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string; // display name, e.g. "Outerwear"
  categoryId: string;
  price: number; // whole US dollars
  colour: string;
  images: ProductImage[]; // first is the catalogue image
  sizes: string[];
  sizeStock: Record<string, number>; // live stock per size
  stock: number; // live stock across all sizes
  tags: string[];
  description: string;
  details: string[];
  active: boolean;
};

export type CategoryInfo = { id: string; name: string; blurb: string; lead: string; count: number };

/** The small slice of a product the browser needs to draw a card or a bag line. */
export type ProductCard = Pick<Product, "id" | "slug" | "name" | "colour" | "price" | "category" | "sizes" | "sizeStock" | "stock" | "images">;

export type User = { id: string; name: string; email: string; role: Role; createdAt: number };

export type OrderItem = { productId: string; name: string; size: string; qty: number; price: number };

/** Card details are never stored. Only the brand and last four digits are kept, as on a receipt. */
export type Payment = {
  provider: string; sessionId: string; currency: Currency; rate: number; amountMinor: number; status: PaymentStatus;
  attempts: number; expiresAt: number; method?: { brand: string; last4: string }; pending3ds?: { brand: string; last4: string }; failure?: string;
};

// `total` is always whole US dollars so reporting stays in one currency; `payment.amountMinor` is what the customer was charged.
export type Order = { id: number; userId: string; items: OrderItem[]; total: number; status: Status; address: string; createdAt: number; restocked: boolean; payment?: Payment };
