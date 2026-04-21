import type { BusinessBankData } from "@prisma/client";

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

export interface BusinessDataRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  type?: string;
  description?: string;
  business_image?: string;
  favicon?: string;
  hero_image?: string;
  banner_config?: BannerConfig | null;
  bankData: BusinessBankData[];
}
