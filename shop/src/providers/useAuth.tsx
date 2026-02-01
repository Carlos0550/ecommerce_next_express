"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

type AuthProps = {
  email: string;
  name: string;
  profileImage?: string;
};

type AuthState = {
  token: string | null;
  user: AuthProps | null;
  loading: boolean;
};

export function useAuth() {
  const [baseUrl] = useState(() => process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api");

  const [state, setState] = useState<AuthState>({ token: null, user: null, loading: false });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;
    (async () => {
      try {
        setState((s) => ({ ...s, loading: true }));
        const res = await fetchWithTimeout(`${baseUrl}/shop/validate-token`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        if (!res.ok) throw new Error('invalid_token');
        const data = await res.json();
        const user: AuthProps = {
          email: data.email,
          name: data.name,
          profileImage: data.profileImage || '',
        };
        setState({ token, user, loading: false });
        try { document.cookie = `auth_token=${token}; Max-Age=${60 * 60 * 24}; Path=/`; } catch {}
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_exchange_done');
        setState({ token: null, user: null, loading: false });
      }
    })();
  }, [baseUrl]);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true }));
    const res = await fetchWithTimeout(`${baseUrl}/shop/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      timeout: 10000,
    });
    if (!res.ok) {
      setState((s) => ({ ...s, loading: false }));
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'login_failed');
    }
    const data = await res.json();
    const token = data.token as string;
    const user: AuthProps = {
      email: data.user.email,
      name: data.user.name,
      profileImage: data.user.profile_image || '',
    };
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_exchange_done', '1');
    try { document.cookie = `auth_token=${token}; Max-Age=${60 * 60 * 24}; Path=/`; } catch {}
    setState({ token, user, loading: false });
    return { token, user };
  }, [baseUrl]);

  const signUp = useCallback(async (name: string, email: string, password: string, asAdmin: boolean = false) => {
    setState((s) => ({ ...s, loading: true }));
    const res = await fetchWithTimeout(`${baseUrl}/shop/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, asAdmin }),
      timeout: 10000,
    });
    if (!res.ok) {
      setState((s) => ({ ...s, loading: false }));
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'register_failed');
    }
    const data = await res.json();
    if (data.pending) {
      setState((s) => ({ ...s, loading: false }));
      return { pending: true, message: data.message };
    }
    const token = data.token as string;
    const user: AuthProps = {
      email: data.user.email,
      name: data.user.name,
      profileImage: data.user.profileImage || '',
    };
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_exchange_done', '1');
    try { document.cookie = `auth_token=${token}; Max-Age=${60 * 60 * 24}; Path=/`; } catch {}
    setState({ token, user, loading: false });
    return { token, user };
  }, [baseUrl]);

  const signOut = useCallback(async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_exchange_done');
    setState({ token: null, user: null, loading: false });
    try { document.cookie = `auth_token=; Max-Age=0; Path=/`; } catch {}
    window.location.reload()
  }, []);

  const isAuthenticated = !!state.token && !!state.user;

  return {
    state,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
  };
}

export default useAuth;
