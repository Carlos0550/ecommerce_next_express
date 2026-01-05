import { baseUrl } from "@/components/Api"
import { showNotification } from "@mantine/notifications"
import { useQuery } from "@tanstack/react-query"
import { useState, useMemo, useLayoutEffect, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { fetchWithTimeout } from "@/Utils/fetchWithTimeout"

export type Session = {
    id: string,
    email: string,
    name: string,
    is_active: boolean,
    role: number,
    tenantId?: string
}

const getInitialToken = (): string | null => {
    const storedToken = localStorage.getItem('auth_token')
    if (storedToken && storedToken !== "") {
        return storedToken
    }
    localStorage.removeItem('auth_token')
    return null
}

const getStoredTenantId = (): string | null => {
    return localStorage.getItem('tenant_id')
}

const setStoredTenantId = (tenantId: string | null) => {
    if (tenantId) {
        localStorage.setItem('tenant_id', tenantId)
    } else {
        localStorage.removeItem('tenant_id')
    }
}

export function useAuth() {
    const [token, setToken] = useState<string | null>(getInitialToken)
    const [tenantId, setTenantIdState] = useState<string | null>(getStoredTenantId)
    const navigate = useNavigate()

    
    useLayoutEffect(() => {
        if (!token) {
            navigate("/auth")
        }
    }, [])

    const updateToken = (newToken: string | null) => {
        setToken(newToken)
        if (newToken) {
            localStorage.setItem('auth_token', newToken)
        } else {
            localStorage.removeItem('auth_token')
        }
    }

    const updateTenantId = (newTenantId: string | null) => {
        setTenantIdState(newTenantId)
        setStoredTenantId(newTenantId)
    }

    const { data: validationData, isLoading, error, refetch } = useQuery({
        queryKey: ['validateToken', token],
        queryFn: async () => {
            if (!token) {
                throw new Error('No token available')
            }

            const response = await fetchWithTimeout(baseUrl + '/validate-token', {
                method: 'GET',
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                timeout: 5000,
            })
            
            if (!response.ok) {
                throw new Error('Token validation failed')
            }
            
            const data = await response.json()
            return data
        },
        enabled: !!token, 
        retry: false,
        staleTime: 5 * 60 * 1000, 
        refetchInterval: 5 * 60 * 1000, 
        refetchIntervalInBackground: true,
        throwOnError: false,
    })

    
    useEffect(() => {
        if (validationData?.tenantId && validationData.tenantId !== tenantId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            updateTenantId(validationData.tenantId)
        }
    }, [validationData, tenantId])

    
    const session = useMemo<Session | null>(() => {
        if (!validationData) return null
        return validationData
    }, [validationData])

    
    useLayoutEffect(() => {
        if (error && token) {
            console.error('Token validation error')
            navigate("/auth")
            localStorage.removeItem('auth_token')
            showNotification({
                title: "Token inválido o sesión expirada",
                message: 'Por favor, inicie sesión de nuevo',
                color: 'red',
            })
        }
    }, [error, token, navigate])

    const logout = (expired_session: boolean = false) => {
        updateToken(null)
        updateTenantId(null)
        navigate("/auth")
        if (expired_session) {
            return showNotification({
                title: "Sesión expirada",
                message: 'Por favor, inicie sesión de nuevo',
                color: 'red',
            })
        }else{
            return showNotification({
                title: "Sesión cerrada",
                message: 'Hasta pronto',
                color: 'green',
            })
        }
    }

    return {
        session,
        setSession: () => {}, 
        token,
        setToken: updateToken,
        tenantId,
        setTenantId: updateTenantId,
        loading: isLoading,
        refetchValidation: refetch,
        logout
    }
}

