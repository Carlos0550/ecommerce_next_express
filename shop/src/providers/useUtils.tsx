'use client'

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { useTenant } from "./TenantProvider";

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

export function useUtils() {
    const [baseUrl] = useState(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api");
    const [isMobile, setIsMobile] = useState(false);
    
    
    const { tenantSlug: contextTenantSlug } = useTenant();
    
    
    const tenantSlug = contextTenantSlug || (typeof document !== 'undefined' ? getTenantSlugFromCookie() : null);

    const [windowWidth, setWindowWidth] = useState<number>(1024);
    const capitalizeTexts = (text: string) => {
        return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
    }

    const queryClient = useQueryClient();

    useEffect(() => {
        const checkIsMobile = () => {
            const width = window.innerWidth;
            setWindowWidth(width);
            setIsMobile(width <= 788);
        }
        checkIsMobile();
        window.addEventListener("resize", checkIsMobile);
        
        return () => {
            window.removeEventListener("resize", checkIsMobile);
        }
    }, [])

    /**
     * Fetch con headers de tenant automáticos
     */
    const fetchWithTenant = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
        const slug = contextTenantSlug || getTenantSlugFromCookie();
        
        const headers = new Headers(options.headers);
        if (slug) {
            headers.set('x-tenant-slug', slug);
        }
        
        return fetch(url, {
            ...options,
            headers,
        });
    }, [contextTenantSlug]);

    /**
     * Obtiene los headers con el tenant slug incluido
     */
    const getTenantHeaders = useCallback((): Record<string, string> => {
        const slug = contextTenantSlug || getTenantSlugFromCookie();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (slug) {
            headers['x-tenant-slug'] = slug;
        }
        return headers;
    }, [contextTenantSlug]);

  return {
    baseUrl,
    capitalizeTexts,
    isMobile,
    windowWidth,
    queryClient,
    tenantSlug,
    fetchWithTenant,
    getTenantHeaders,
  }
}

