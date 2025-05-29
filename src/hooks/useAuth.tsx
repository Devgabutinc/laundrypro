import React, { useState, useEffect, createContext, useContext } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { updateFcmTokenToProfile } from '@/utils/pushNotifications';
import { storeSession, getStoredSession, storeUserProfile, getStoredUserProfile, clearSession } from '@/utils/authStorage';
import { storeSessionInCookie, getSessionFromCookie, storeProfileInCookie, getProfileFromCookie, clearAuthCookies } from '@/utils/cookieStorage';

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
    // Improved profile fetching with retry mechanism dan penyimpanan lokal yang lebih kuat
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (!error && data) {
          setProfile(data);
          setBusinessId((data as any).business_id || null);
          
          // Simpan profil ke penyimpanan lokal yang lebih kuat
          storeUserProfile(data);
        } else {
          console.warn('Error fetching profile:', error);
          
          // Coba gunakan data profil yang tersimpan
          const storedProfile = getStoredUserProfile();
          if (storedProfile && storedProfile.id === userId) {
            console.log('Using stored profile data');
            setProfile(storedProfile);
            setBusinessId(storedProfile.business_id || null);
            return;
          }
          
          setProfile(null);
          setBusinessId(null);
        }
      } catch (e) {
        console.error('Exception during profile fetch:', e);
        
        // Coba gunakan data profil yang tersimpan sebagai fallback
        const storedProfile = getStoredUserProfile();
        if (storedProfile) {
          console.log('Using stored profile data after error');
          setProfile(storedProfile);
          setBusinessId(storedProfile.business_id || null);
        } else {
          setProfile(null);
          setBusinessId(null);
        }
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event);
        
        // Simpan sesi ke penyimpanan lokal dan cookie
        if (currentSession) {
          console.log('Storing session in local storage and cookie');
          storeSession(currentSession);
          storeSessionInCookie(currentSession);
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          fetchProfile(currentSession.user.id);
          // Update FCM token ke database jika ada
          const fcmToken = localStorage.getItem('fcm_token');
          if (fcmToken) updateFcmTokenToProfile(fcmToken);
        } else {
          // Coba cek penyimpanan lokal dan cookie sebelum menghapus profil
          const storedSession = getStoredSession();
          const cookieSession = getSessionFromCookie();
          
          if (!storedSession && !cookieSession) {
            console.log('No session found in storage or cookie, clearing profile');
            setProfile(null);
            setBusinessId(null);
          }
        }
        
        // Only set loading to false after we've handled the auth state change
        setLoading(false);
      }
    );

    // Initial session check with improved error handling dan recovery
    const initializeAuth = async () => {
      try {
        // Coba ambil sesi dari Supabase
        const { data, error } = await supabase.auth.getSession();
        let currentSession = data?.session;
        
        // Jika tidak berhasil, coba ambil dari cookie terlebih dahulu (lebih tahan terhadap clear history)
        if (error || !currentSession) {
          console.log('No active Supabase session, trying to recover from cookie');
          const cookieSession = getSessionFromCookie();
          
          // Jika berhasil mendapatkan sesi dari cookie, coba set ke Supabase
          if (cookieSession && cookieSession.access_token && cookieSession.refresh_token) {
            console.log('Recovered session from cookie, setting in Supabase');
            try {
              // Set session ke Supabase
              const { data: { session: restoredSession }, error: restoreError } = await supabase.auth.setSession({
                access_token: cookieSession.access_token as string,
                refresh_token: cookieSession.refresh_token as string
              });
              
              if (restoreError) {
                console.error('Error setting session from cookie:', restoreError);
              } else if (restoredSession) {
                console.log('Session restored successfully from cookie');
                currentSession = restoredSession;
                
                // Simpan sesi yang dipulihkan ke penyimpanan lokal
                storeSession(restoredSession);
              }
            } catch (e) {
              console.error('Exception setting session from cookie:', e);
            }
          } else {
            // Jika tidak ada di cookie, coba dari localStorage
            console.log('No session in cookie, trying localStorage');
            const localSession = getStoredSession();
            
            if (localSession && localSession.access_token && localSession.refresh_token) {
              console.log('Recovered session from localStorage, setting in Supabase');
              try {
                // Set session ke Supabase
                const { data: { session: restoredSession }, error: restoreError } = await supabase.auth.setSession({
                  access_token: localSession.access_token,
                  refresh_token: localSession.refresh_token
                });
                
                if (restoreError) {
                  console.error('Error setting session from localStorage:', restoreError);
                } else if (restoredSession) {
                  console.log('Session restored successfully from localStorage');
                  currentSession = restoredSession;
                  
                  // Simpan sesi yang dipulihkan ke cookie juga
                  storeSessionInCookie(restoredSession);
                }
              } catch (e) {
                console.error('Exception setting session from localStorage:', e);
              }
            }
          }
        } else if (currentSession) {
          // Simpan sesi yang valid ke penyimpanan lokal dan cookie
          console.log('Active session found, storing in both localStorage and cookie');
          storeSession(currentSession);
          storeSessionInCookie(currentSession);
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          console.log('Session user found, fetching profile');
          // Coba ambil profil dari database
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          
          if (profileError || !profileData) {
            console.warn('Error fetching profile from database:', profileError);
            
            // Coba ambil dari cookie
            const cookieProfile = getProfileFromCookie();
            if (cookieProfile && cookieProfile.id === currentSession.user.id) {
              console.log('Using profile from cookie');
              setProfile(cookieProfile);
              setBusinessId(cookieProfile.business_id || null);
            } else {
              // Coba ambil dari localStorage
              const localProfile = getStoredUserProfile();
              if (localProfile && localProfile.id === currentSession.user.id) {
                console.log('Using profile from localStorage');
                setProfile(localProfile);
                setBusinessId(localProfile.business_id || null);
              } else {
                setProfile(null);
                setBusinessId(null);
              }
            }
          } else {
            // Profil berhasil diambil dari database
            console.log('Profile fetched successfully from database');
            setProfile(profileData);
            setBusinessId(profileData.business_id || null);
            
            // Simpan ke penyimpanan lokal dan cookie
            storeUserProfile(profileData);
            storeProfileInCookie(profileData);
          }
          
          // Update FCM token ke database jika ada
          const fcmToken = localStorage.getItem('fcm_token');
          if (fcmToken) updateFcmTokenToProfile(fcmToken);
        } else {
          console.log('No user in session, clearing profile');
          setProfile(null);
          setBusinessId(null);
        }
      } catch (e) {
        console.error('Exception during auth initialization:', e);
        
        // Coba recovery dari cookie
        try {
          console.log('Attempting final recovery from cookie after error');
          const cookieSession = getSessionFromCookie();
          const cookieProfile = getProfileFromCookie();
          
          if (cookieSession && cookieSession.user) {
            console.log('Recovering session from cookie after error');
            setSession(cookieSession as Session);
            setUser(cookieSession.user as User);
            
            if (cookieProfile) {
              setProfile(cookieProfile);
              setBusinessId(cookieProfile.business_id || null);
            }
          } else {
            // Final fallback to localStorage
            const localSession = getStoredSession();
            const localProfile = getStoredUserProfile();
            
            if (localSession && localSession.user) {
              console.log('Recovering session from localStorage after error');
              setSession(localSession);
              setUser(localSession.user);
              
              if (localProfile) {
                setProfile(localProfile);
                setBusinessId(localProfile.business_id || null);
              }
            }
          }
        } catch (recoveryError) {
          console.error('Final recovery attempt failed:', recoveryError);
        }
      } finally {
        // Ensure loading is set to false even if there's an error
        setLoading(false);
      }
    };

    // Initialize auth
    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Hapus semua data sesi dari penyimpanan lokal dan cookie
    clearSession();
    clearAuthCookies();
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
      
      // Ensure we're using the correct URL format
      // The token will be appended as a query parameter by Supabase
      const redirectUrl = `${baseUrl}/updatepassword`;
      console.log('Using redirect URL for password reset:', redirectUrl);
      
      // Send the reset password email
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      
      console.log('Reset password response:', data);
      
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
