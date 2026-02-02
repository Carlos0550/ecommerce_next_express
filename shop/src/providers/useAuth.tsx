"use client";
import { useCallback, useMemo } from "react";
import { useUnifiedAuth } from "./useUnifiedAuth";

export function useAuth() {
  const unifiedAuth = useUnifiedAuth();

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await unifiedAuth.loginUser(email, password);
    return { 
      token: unifiedAuth.token, 
      user: {
        email: data.user?.email || unifiedAuth.session?.email || "",
        name: data.user?.name || unifiedAuth.session?.name || "",
        profileImage: data.user?.profile_image || unifiedAuth.session?.profileImage || "",
      } 
    };
  }, [unifiedAuth]);

  const signUp = useCallback(async (name: string, email: string, _password: string, asAdmin: boolean = false) => {
    if (asAdmin) {
      const result = await unifiedAuth.registerAdmin(name, email);
      if (result.pending) {
        return { pending: true, message: result.message };
      }
      return { 
        token: unifiedAuth.token, 
        user: {
          email: result.user?.email || unifiedAuth.session?.email || "",
          name: result.user?.name || unifiedAuth.session?.name || "",
          profileImage: result.user?.profile_image || unifiedAuth.session?.profileImage || "",
        } 
      };
    }
    
    const data = await unifiedAuth.registerUser(name, email);
    return { 
      token: unifiedAuth.token, 
      user: {
        email: data.user?.email || unifiedAuth.session?.email || "",
        name: data.user?.name || unifiedAuth.session?.name || "",
        profileImage: data.user?.profile_image || unifiedAuth.session?.profileImage || "",
      } 
    };
  }, [unifiedAuth]);

  const signOut = useCallback(async () => {
    unifiedAuth.logout({ redirect: "/" });
  }, [unifiedAuth]);

  const isAuthenticated = useMemo(() => {
    return !!unifiedAuth.session;
  }, [unifiedAuth.session]);

  const state = useMemo(() => ({
    token: unifiedAuth.token,
    user: unifiedAuth.session ? {
      email: unifiedAuth.session.email,
      name: unifiedAuth.session.name,
      profileImage: unifiedAuth.session.profileImage,
    } : null,
    loading: unifiedAuth.loading,
  }), [unifiedAuth.token, unifiedAuth.session, unifiedAuth.loading]);

  return {
    state,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
  };
}

export default useAuth;
