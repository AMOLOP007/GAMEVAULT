'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithTwitch: () => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  devLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (supabaseUser: any) => {
    if (!supabaseUser) {
      setUser(null);
      return;
    }

    // Map Supabase user to our User interface
    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'User',
      avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
    });
  }, []);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        api.setToken(session.access_token);
        if ((window as any).gameVault) {
          (window as any).gameVault.setToken(session.access_token);
        }
        fetchUserProfile(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        api.setToken(session.access_token);
        if ((window as any).gameVault) {
          (window as any).gameVault.setToken(session.access_token);
        }
        fetchUserProfile(session.user);
      } else {
        api.setToken(null);
        if ((window as any).gameVault) {
          (window as any).gameVault.setToken(null);
        }
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const register = useCallback(async (email: string, _username: string, password: string) => {
    // Supabase allows storing metadata on signup
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { username: _username }
      }
    });
    if (error) throw error;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`
      }
    });
    if (error) throw error;
  }, []);

  const loginWithTwitch = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo: `${window.location.origin}/onboarding`
      }
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const devLogin = useCallback(async () => {
    if (process.env.NODE_ENV !== 'development') return;
    // In Supabase, we can't really "mock" a session easily without a real login
    // But we can use a test account if one exists
    console.warn('devLogin not implemented for Supabase yet. Please use real credentials.');
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, loginWithTwitch, register, logout, devLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
