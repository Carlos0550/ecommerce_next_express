// Tipos de respuesta del backend Cinnamon.
// Alineados con prisma/schema.prisma y los controllers en backend/src/modules/*.

export type UserRole = "ADMIN" | "CUSTOMER";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  profile_image?: string | null;
  profileImage?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ProductState = "active" | "inactive" | "draft" | "out_stock" | "deleted";

export interface ProductImage {
  id: number;
  url: string;
  position?: number;
}

export interface Category {
  id: number;
  title: string;
  image?: string | null;
  is_active?: boolean;
  slug?: string;
}

export interface Product {
  id: number;
  title: string;
  description?: string | null;
  price: string | number;
  stock: number;
  category_id: number;
  category?: Category;
  images?: ProductImage[];
  state?: ProductState;
  slug?: string;
  sku?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product_id: number;
  product?: Product;
  quantity: number;
  price?: string | number;
  options?: Array<{ name: string; value: string }>;
}

export interface Cart {
  items: CartItem[];
  total: string | number;
  is_admin?: boolean;
}

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface OrderItem {
  product_id: number;
  product?: Product;
  quantity: number;
  price: string | number;
}

export interface Order {
  id: number;
  user_id?: number | null;
  buyer_email?: string;
  buyer_name?: string;
  buyer_phone?: string;
  buyer_address?: string;
  status: OrderStatus;
  payment_method: string;
  subtotal: string | number;
  total: string | number;
  receipt_url?: string | null;
  createdAt: string;
  items?: OrderItem[];
}

export type SaleSource = "ONLINE" | "CAJA";

export interface SalePaymentMethod {
  method: string;
  amount: string | number;
}

export interface Sale {
  id: number;
  total: string | number;
  tax?: string | number;
  source: SaleSource;
  payment_method: string;
  payment_methods?: SalePaymentMethod[];
  status?: "PENDING" | "PROCESSED" | "DECLINED";
  orders?: Order[];
  products?: Array<{ product_id: number; quantity: number; product?: Product }>;
  manual_products?: Array<{ title: string; price: string | number; quantity: number }>;
  createdAt: string;
}

export type BannerVariant =
  | "none"
  | "split-grid"
  | "split-single"
  | "centered"
  | "overlay";

export type BannerImageSource = "auto-products" | "products" | "custom";

export interface BannerConfig {
  variant: BannerVariant;
  eyebrow?: string;
  title_main?: string;
  title_accent?: string;
  subtitle?: string;
  cta_label?: string;
  cta_href?: string;
  image_source: BannerImageSource;
  product_ids?: number[];
  custom_images?: string[];
}

export interface Business {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  type?: string;
  description?: string;
  business_image?: string;
  favicon?: string;
  hero_image?: string;
  active_palette?:
    | "kuromi"
    | "mono"
    | "blush"
    | "sage"
    | "ocean"
    | "sunset"
    | "midnight";
  banner_config?: BannerConfig | null;
  admin_layout_config?: AdminLayoutConfig | null;
  bankData?: BankData[];
}

export type AdminLayoutMode = "legacy" | "modern";

export interface AdminLayoutConfig {
  sales?: AdminLayoutMode;
}

export interface BankData {
  id?: string | number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  alias?: string | null;
  cbu?: string | null;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  position: number;
  is_active: boolean;
}

export interface ApiOk<T = unknown> {
  ok: true;
  [key: string]: unknown;
  data?: T;
}

export interface AuthResponse {
  ok: true;
  token: string;
  user: User;
}

export interface Paginated<T> {
  ok: true;
  total: number;
  pages?: number;
  [key: string]: unknown;
  data?: T[];
}
