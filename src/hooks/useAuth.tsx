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
      console.log('Platform: ' + (isNative ? 'Native' : 'Web'));
      
      if (isNative) {
        // Untuk aplikasi native (Android/iOS), gunakan pendekatan yang lebih langsung
        // Hapus semua listener untuk menghindari duplikasi
        Browser.removeAllListeners();
        
        // Tambahkan listener untuk menangkap ketika browser ditutup
        Browser.addListener('browserFinished', async () => {
          console.log('Browser ditutup, memulai proses login manual...');
          
          try {
            // Dapatkan URL saat ini untuk debugging
            console.log('Mencoba login manual dengan Supabase...');
            
            // Coba login langsung dengan token yang mungkin sudah ada di storage
            const { data, error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                skipBrowserRedirect: true,
                redirectTo: window.location.origin,
              },
            });
            
            console.log('Hasil login manual:', { data, error });
            
            // Periksa session setelah upaya login
            const { data: sessionData } = await supabase.auth.getSession();
            console.log('Session setelah login manual:', sessionData);
            
            if (sessionData.session) {
              console.log('Session ditemukan, user berhasil login');
              // Refresh halaman untuk menerapkan state login baru
              window.location.reload();
            } else {
              console.log('Session tidak ditemukan, mencoba refresh...');
              // Coba refresh session
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              console.log('Hasil refresh session:', { refreshData, refreshError });
              
              if (refreshData.session) {
                console.log('Session berhasil di-refresh');
                window.location.reload();
              } else {
                console.log('Gagal mendapatkan session setelah refresh');
                // Tampilkan pesan error ke user
                alert('Gagal login dengan Google. Silakan coba lagi.');
              }
            }
          } catch (e) {
            console.error('Error saat proses login manual:', e);
            alert('Terjadi kesalahan saat login. Silakan coba lagi.');
          }
        });
        
        // Gunakan URL Vercel untuk autentikasi
        console.log('Memulai proses OAuth dengan Google...');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            skipBrowserRedirect: true,
            redirectTo: 'https://laundrypro.vercel.app',
          },
        });
        
        console.log('Hasil OAuth init:', { data, error });
        
        if (data?.url) {
          console.log('Membuka browser dengan URL:', data.url);
          // Buka URL autentikasi dengan opsi standar
          await Browser.open({
            url: data.url,
            windowName: 'Google Login',
          });
        } else {
          console.error('Tidak ada URL untuk OAuth:', error);
          alert('Gagal memulai proses login. Silakan coba lagi.');
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
