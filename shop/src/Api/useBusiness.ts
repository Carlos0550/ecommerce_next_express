export type BusinessData = {
  id?: string;
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
};

function getTenantSlugFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'tenant_slug') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export const getBusinessInfo = async (tenantSlug?: string): Promise<BusinessData | null> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  let slug = tenantSlug;
  if (!slug && typeof document !== 'undefined') {
    slug = getTenantSlugFromCookie()!;
  }

  if (!slug) {
    return null;
  }

  try {
    const headers: Record<string, string> = {
      'x-tenant-slug': slug
    };

    const res = await fetch(`${baseUrl}/business/public`, { 
      next: { revalidate: 60 },
      headers
    });
    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[getBusinessInfo] Error: ${res.status} ${res.statusText}`, errorBody);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error("[getBusinessInfo] Error:", error);
    return null;
  }
};
