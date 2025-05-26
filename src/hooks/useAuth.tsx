import React, { useState, useEffect, createContext, useContext } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { updateFcmTokenToProfile } from '@/utils/pushNotifications';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  profile: any | null;
  businessId: string | null;
  resetPassword: (email: string) => Promise<{ success: boolean; error: any }>;
  signInWithGoogle: () => Promise<{ success: boolean; error: any }>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  profile: null,
  businessId: null,
  resetPassword: async () => ({ success: false, error: null }),
  signInWithGoogle: async () => ({ success: false, error: null }),
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setProfile(data);
        setBusinessId((data as any).business_id || null);
      } else {
        setProfile(null);
        setBusinessId(null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
        if (currentSession?.user) {
          fetchProfile(currentSession.user.id);
          // Update FCM token ke database jika ada
          const fcmToken = localStorage.getItem('fcm_token');
          if (fcmToken) updateFcmTokenToProfile(fcmToken);
        } else {
          setProfile(null);
          setBusinessId(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
        // Update FCM token ke database jika ada
        const fcmToken = localStorage.getItem('fcm_token');
        if (fcmToken) updateFcmTokenToProfile(fcmToken);
      } else {
        setProfile(null);
        setBusinessId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    try {
      // Gunakan URL Vercel untuk redirect password reset
      const redirectUrl = 'https://laundrypro.vercel.app/update-password';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) {
        return { success: false, error };
      }
      
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        // Untuk aplikasi native (Android/iOS), gunakan pendekatan sederhana
        // Hapus listener lama jika ada untuk menghindari duplikasi
        Browser.removeAllListeners();
        
        // Tambahkan listener untuk menangkap ketika browser ditutup
        Browser.addListener('browserFinished', async () => {
          console.log('Browser ditutup, cek session...');
          // Cek session setelah browser ditutup
          for (let i = 0; i < 5; i++) {
            // Coba beberapa kali dengan jeda waktu
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log('Session ditemukan, user berhasil login');
              // Refresh halaman untuk menerapkan state login baru
              window.location.reload();
              break;
            }
            console.log(`Percobaan ${i+1}: Session belum tersedia`);
          }
        });
        
        // Gunakan URL Vercel untuk autentikasi
        const { data } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            skipBrowserRedirect: true,
            redirectTo: 'https://laundrypro.vercel.app',
          },
        });
        
        if (data?.url) {
          // Buka URL autentikasi dengan opsi yang lebih terintegrasi
          await Browser.open({
            url: data.url,
            toolbarColor: '#3880ff', // Warna toolbar yang sesuai dengan tema aplikasi
          });
        }
      } else {
        // Untuk web, gunakan flow OAuth normal
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        
        if (error) {
          return { success: false, error };
        }
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, error };
    }
  };

  const value = {
    session,
    user,
    loading,
    signOut,
    profile,
    businessId,
    resetPassword,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
