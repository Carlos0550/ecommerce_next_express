import { baseUrl } from "@/components/Api"
import { showNotification } from "@mantine/notifications"
import { useQuery } from "@tanstack/react-query"
import { useState, useMemo, useLayoutEffect } from "react"
import { useNavigate } from "react-router-dom"
import { fetchWithTimeout } from "@/Utils/fetchWithTimeout"

export type Session = {
    id: string,
    email: string,
    name: string,
    is_active: boolean,
    role: number
}

const getInitialToken = (): string | null => {
    const storedToken = localStorage.getItem('auth_token')
    if (storedToken && storedToken !== "") {
        return storedToken
    }
    localStorage.removeItem('auth_token')
    return null
}

export function useAuth() {
    const [token, setToken] = useState<string | null>(getInitialToken)
    const navigate = useNavigate()

    // Redirigir si no hay token (solo navegación, sin setState)
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

    // Derivar session desde validationData
    const session = useMemo<Session | null>(() => validationData ?? null, [validationData])

    // Manejar error de validación - solo side effects externos (sin setState)
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
        setSession: () => {}, // Deprecated: session is now derived from validationData
        token,
        setToken: updateToken,
        loading: isLoading,
        refetchValidation: refetch,
        logout
    }
}

