export const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

console.log("Base URL:", baseUrl);

/**
 * Obtiene el tenantId almacenado en localStorage
 */
export function getStoredTenantId(): string | null {
    return localStorage.getItem('tenant_id');
}

/**
 * Obtiene el token de autenticación almacenado
 */
export function getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
}

/**
 * Genera los headers con autenticación y tenant
 */
export function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    
    const token = getStoredToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const tenantId = getStoredTenantId();
    if (tenantId) {
        headers['x-tenant-id'] = tenantId;
    }
    
    return headers;
}

/**
 * Genera headers solo para Content-Type y tenant (sin auth)
 */
export function getTenantHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    
    const tenantId = getStoredTenantId();
    if (tenantId) {
        headers['x-tenant-id'] = tenantId;
    }
    
    return headers;
}

/**
 * Fetch con headers de autenticación y tenant automáticos
 */
export async function fetchWithTenant(
    url: string, 
    options: RequestInit = {}
): Promise<Response> {
    const headers = new Headers(options.headers);
    
    const token = getStoredToken();
    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    
    const tenantId = getStoredTenantId();
    if (tenantId && !headers.has('x-tenant-id')) {
        headers.set('x-tenant-id', tenantId);
    }
    
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    
    return fetch(url, {
        ...options,
        headers,
    });
}