import React, { useState, useEffect, createContext, useContext } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { updateFcmTokenToProfile } from '@/utils/pushNotifications';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  profile: any | null;
  businessId: string | null;
  resetPassword: (email: string) => Promise<{ success: boolean; error: any }>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  profile: null,
  businessId: null,
  resetPassword: async () => ({ success: false, error: null }),
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
      // Gunakan URL yang sesuai untuk redirect password reset
      // Deteksi apakah aplikasi berjalan di produksi atau development
      const isProduction = window.location.hostname === 'laundrypro.vercel.app';
      
      // Gunakan URL yang sesuai berdasarkan environment
      const baseUrl = isProduction 
        ? 'https://laundrypro.vercel.app' 
        : window.location.origin;
      
      // Use the exact URL format that matches our route
      const redirectUrl = `${baseUrl}/updatepassword`;
      console.log('Using redirect URL for password reset:', redirectUrl);
      
      // Use redirectTo option to ensure the token is properly passed
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      if (error) {
        console.error('Error sending reset password email:', error);
        return { success: false, error };
      }
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Exception during reset password:', error);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Helper function to extract parameters from URL dengan penanganan yang lebih baik
const extractParamFromUrl = (url: string, param: string): string | null => {
  try {
    // Coba parse URL sebagai URL object terlebih dahulu
    const urlObj = new URL(url);
    
    // Cek parameter di query string
    const queryParam = urlObj.searchParams.get(param);
    if (queryParam) return queryParam;
    
    // Jika tidak ada di query string, cek di hash fragment
    if (urlObj.hash) {
      // Hapus # di awal hash
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      const hashParam = hashParams.get(param);
      if (hashParam) return hashParam;
    }
    
    // Fallback ke metode regex jika metode di atas gagal
    const regex = new RegExp(`[#&?]${param}=([^&#]*)`); 
    const match = regex.exec(url);
    return match ? decodeURIComponent(match[1]) : null;
  } catch (e) {
    console.error('Error parsing URL:', e);
    
    // Fallback ke metode regex jika URL parsing gagal
    try {
      const regex = new RegExp(`[#&?]${param}=([^&#]*)`); 
      const match = regex.exec(url);
      return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
      console.error('Regex extraction failed:', e);
      return null;
    }
  }
};

export const useAuth = () => {
  return useContext(AuthContext);
};
