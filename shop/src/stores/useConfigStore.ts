import { create } from "zustand";
import { persist } from "zustand/middleware";
import { configService } from "@/services/config.service";
import {
  DEFAULT_PALETTE,
  isValidPaletteName,
  type PaletteName,
} from "@/theme/palettes";

export interface PublicProduct {
  id: string;
  title: string;
  price: number;
  images: string[];
  description: string;
  options: { name: string; values: string[] }[];
  category?: { id: string; title: string };
  stock?: number;
}

export interface PublicCategory {
  id: string;
  title: string;
  image: string | null;
}

export interface PublicProductsResponse {
  products: PublicProduct[];
  page: number;
  totalPages: number;
}

export interface PublicBusinessInfo {
  name: string;
  description: string;
  business_image: string;
  type?: string;
  city?: string;
  phone?: string;
  hero_image?: string;
}

export interface PublicBankInfo {
  bankData: {
    bank_name: string;
    account_number: string;
    account_holder: string;
  }[];
}

interface ConfigState {
  businessInfo: PublicBusinessInfo | null;
  bankInfo: PublicBankInfo | null;
  publicProducts: PublicProduct[];
  publicCategories: PublicCategory[];
  activePalette: PaletteName;
  isLoading: boolean;
  fetchConfig: () => Promise<void>;
  fetchPublicProducts: (
    params?: Record<string, unknown>,
  ) => Promise<PublicProductsResponse>;
  fetchPublicCategories: () => Promise<void>;
  fetchBankInfo: () => Promise<void>;
  setPalette: (palette: PaletteName) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      businessInfo: null,
      bankInfo: null,
      publicProducts: [],
      publicCategories: [],
      activePalette: DEFAULT_PALETTE,
      isLoading: false,
      fetchConfig: async () => {
        set({ isLoading: true });
        try {
          const [businessInfo, themeRes] = await Promise.all([
            configService.getPublicBusinessInfo().catch(() => null),
            configService.getActivePalette().catch(() => null),
          ]);
          set({ businessInfo });
          const nextPalette = themeRes?.palette;
          if (isValidPaletteName(nextPalette)) {
            set({ activePalette: nextPalette });
          }
        } catch (error) {
          console.error("Failed to fetch config", error);
        } finally {
          set({ isLoading: false });
        }
      },
      fetchPublicProducts: async (params) => {
        set({ isLoading: true });
        try {
          const data = await configService.getPublicProducts(params);
          set({ publicProducts: data.products || data, isLoading: false });
          return data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      fetchPublicCategories: async () => {
        set({ isLoading: true });
        try {
          const data = await configService.getPublicCategories();
          set({ publicCategories: data, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      fetchBankInfo: async () => {
        try {
          const data = await configService.getBankInfo();
          set({ bankInfo: data });
        } catch (error) {
          console.error("Failed to fetch bank info", error);
        }
      },
      setPalette: (palette) => set({ activePalette: palette }),
    }),
    {
      name: "shop_config",
      partialize: (state) => ({ activePalette: state.activePalette }),
    },
  ),
);
