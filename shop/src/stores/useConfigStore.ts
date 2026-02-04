import { create } from "zustand";
import { persist } from "zustand/middleware";
import { configService } from "@/services/config.service";
interface ConfigState {
  businessInfo: Record<string, unknown> | null;
  theme: Record<string, unknown> | null;
  bankInfo: Record<string, any> | null;
  publicProducts: any[];
  publicCategories: any[];
  paletteName: string;
  colors: string[];
  isLoading: boolean;
  fetchConfig: () => Promise<void>;
  fetchPublicProducts: (params?: any) => Promise<any>;
  fetchPublicCategories: () => Promise<void>;
  fetchBankInfo: () => Promise<void>;
  updateTheme: (name: string, colors: string[]) => void;
}
export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      businessInfo: null,
      theme: null,
      bankInfo: null,
      publicProducts: [],
      publicCategories: [],
      paletteName: "mono",
      colors: [
        "#ffffff",
        "#f2f2f2",
        "#e6e6e6",
        "#cccccc",
        "#b3b3b3",
        "#999999",
        "#7f7f7f",
        "#666666",
        "#4d4d4d",
        "#1a1a1a",
      ],
      isLoading: false,
      fetchConfig: async () => {
        set({ isLoading: true });
        try {
          const [businessInfo, themeRes] = await Promise.all([
            configService.getPublicBusinessInfo().catch(() => null),
            configService.getThemePalette("shop").catch(() => null),
          ]);
          set({ businessInfo });
          if (
            themeRes?.name &&
            Array.isArray(themeRes.colors) &&
            themeRes.colors.length === 10
          ) {
            const slug =
              String(themeRes.name)
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-9]/g, "") || "brand";
            set({
              paletteName: slug,
              colors: themeRes.colors as string[],
              theme: themeRes,
            });
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
      updateTheme: (name, colors) => {
        set({ paletteName: name, colors });
      },
    }),
    {
      name: "shop_config",
      partialize: (state) => ({
        paletteName: state.paletteName,
        colors: state.colors,
      }), 
    },
  ),
);
