'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  business: {
    name: string;
    description?: string;
    business_image?: string;
    favicon?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    type?: string;
  } | null;
  palette: {
    id: string;
    name: string;
    colors: string[];
  } | null;
}

interface TenantContextType {
  tenant: TenantInfo | null;
  tenantSlug: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantSlug: null,
  isLoading: true,
  error: null,
  refetch: async () => {},
});

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

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

interface TenantProviderProps {
  children: ReactNode;
  initialSlug?: string;
}

export function TenantProvider({ children, initialSlug }: TenantProviderProps) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  
  const getInitialSlug = () => {
    if (initialSlug) return initialSlug;
    if (typeof document !== 'undefined') {
      return getTenantSlugFromCookie();
    }
    return null;
  };
  const [tenantSlug, setTenantSlug] = useState<string | null>(getInitialSlug);
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  const fetchTenantInfo = async (slug: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/tenant/${slug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Tienda no encontrada');
        } else {
          setError('Error al cargar información de la tienda');
        }
        setTenant(null);
        return;
      }
      
      const data = await response.json();
      
      if (data.ok && data.data) {
        setTenant(data.data);
      } else {
        setError('Error al procesar información de la tienda');
        setTenant(null);
      }
    } catch (err) {
      console.error('Error fetching tenant info:', err);
      setError('Error de conexión');
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    if (tenantSlug) {
      await fetchTenantInfo(tenantSlug);
    }
  };

  useEffect(() => {
    
    const slug = initialSlug || getTenantSlugFromCookie();
    
    if (slug && slug !== tenantSlug) {
      setTenantSlug(slug);
    } else if (!slug && tenantSlug) {
      
      setTenantSlug(null);
      setError('No se pudo identificar la tienda');
    }
  }, [initialSlug, tenantSlug]);

  return (
    <TenantContext.Provider value={{ tenant, tenantSlug, isLoading, error, refetch }}>
      {children}
    </TenantContext.Provider>
  );
}

export default TenantProvider;


