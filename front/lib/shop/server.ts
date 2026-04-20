import { API_URL } from "@/lib/api";
import type { Business, Category, Product, FAQ } from "@/lib/types";

function normalizeProduct<T extends { images?: unknown }>(p: T): T {
  const raw = (p as any)?.images;
  if (Array.isArray(raw)) {
    (p as any).images = raw.map((im: any, i: number) =>
      typeof im === "string" ? { id: `${i}`, url: im } : im,
    );
  }
  return p;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchBusiness(): Promise<Business | null> {
  const data = await getJson<any>("/business/public");
  if (!data) return null;
  return (data.business ?? data.data ?? data) as Business;
}

export async function fetchPublicCategories(): Promise<Category[]> {
  const data = await getJson<any>("/products/public/categories");
  const list = data?.data ?? data?.categories ?? [];
  return Array.isArray(list) ? (list as Category[]) : [];
}

export async function fetchPublicProducts(params?: {
  categoryId?: number | string;
  title?: string;
  limit?: number;
}): Promise<Product[]> {
  const qs = new URLSearchParams();
  if (params?.categoryId) qs.set("categoryId", String(params.categoryId));
  if (params?.title) qs.set("title", params.title);
  qs.set("limit", String(params?.limit ?? 48));
  const data = await getJson<any>(`/products/public?${qs}`);
  const list =
    data?.data?.products ??
    data?.products ??
    (Array.isArray(data?.data) ? data.data : null) ??
    [];
  return Array.isArray(list) ? (list as Product[]).map(normalizeProduct) : [];
}

export async function fetchPublicProduct(id: string | number): Promise<Product | null> {
  const data = await getJson<any>(`/products/public/${id}`);
  if (!data || data.ok === false) return null;
  const product = (data.data?.product ?? data.product ?? data.data ?? data) as Product;
  return normalizeProduct(product);
}

export async function fetchFaqs(): Promise<FAQ[]> {
  const data = await getJson<any>("/faq");
  const list = data?.items ?? data?.faqs ?? data?.data ?? [];
  return Array.isArray(list) ? (list as FAQ[]) : [];
}
