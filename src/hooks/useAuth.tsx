import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { updateFcmTokenToProfile } from '@/utils/pushNotifications';
import { storeSession, getStoredSession, storeUserProfile, getStoredUserProfile, clearSession } from '@/utils/authStorage';
import { storeSessionInCookie, getSessionFromCookie, storeProfileInCookie, getProfileFromCookie, clearAuthCookies } from '@/utils/cookieStorage';
import { useAppLifecycle } from "./useAppLifecycle";

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
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const syncInProgressRef = useRef<boolean>(false);

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
        storeProfileInCookie(data);
      } else {
        // Error fetching profile
        
        // Coba gunakan data profil yang tersimpan
        const storedProfile = getStoredUserProfile();
        if (storedProfile && storedProfile.id === userId) {
          // Using stored profile data
          setProfile(storedProfile);
          setBusinessId(storedProfile.business_id || null);
          return;
        }
        
        setProfile(null);
        setBusinessId(null);
      }
    } catch (e) {
      // Exception during profile fetch
      
      // Coba gunakan data profil yang tersimpan sebagai fallback
      const storedProfile = getStoredUserProfile();
      if (storedProfile) {
        // Using stored profile data after error
        setProfile(storedProfile);
        setBusinessId(storedProfile.business_id || null);
      } else {
        setProfile(null);
        setBusinessId(null);
      }
    }
  };

  // Función para sincronizar datos cuando la aplicación vuelve a primer plano
  const syncDataOnResume = async () => {
    // Sincronizando datos después de volver a primer plano
    
    // Evitar múltiples sincronizaciones simultáneas
    if (syncInProgressRef.current) {
      return;
    }
    
    syncInProgressRef.current = true;
    
    try {
      // Verificar si tenemos una sesión activa
      if (!session) {
        // No hay sesión activa, intentando recuperar
        await refreshSession();
      } else {
        // Sesión activa encontrada, verificando validez
        // Verificar si la sesión sigue siendo válida
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          // Sesión expirada, intentando recuperar
          await refreshSession();
        } else {
          // Sesión válida, actualizando datos
          // La sesión es válida, actualizar datos del perfil
          if (user?.id) {
            await fetchProfile(user.id);
            
            // Reforzar el almacenamiento de la sesión
            storeSession(data.session);
            storeSessionInCookie(data.session);
          }
        }
      }
    } catch (error) {
      // Error al sincronizar datos
      
      // Intento de recuperación final
      try {
        const cookieSession = getSessionFromCookie();
        if (cookieSession && cookieSession.access_token && cookieSession.refresh_token) {
          await supabase.auth.setSession({
            access_token: cookieSession.access_token as string,
            refresh_token: cookieSession.refresh_token as string
          });
        }
      } catch (e) {
        // Ignorar errores en la recuperación final
      }
    } finally {
      setLastSyncTime(Date.now());
      syncInProgressRef.current = false;
    }
  };

  // Función para refrescar la sesión desde almacenamiento local o cookies
  const refreshSession = async () => {
    // Intentando refrescar sesión
    
    // Intentar recuperar sesión de cookies primero (más resistente)
    const cookieSession = getSessionFromCookie();
    if (cookieSession && cookieSession.access_token && cookieSession.refresh_token) {
      // Recuperando sesión desde cookie
      try {
        const { data: { session: restoredSession }, error } = await supabase.auth.setSession({
          access_token: cookieSession.access_token as string,
          refresh_token: cookieSession.refresh_token as string
        });
        
        if (!error && restoredSession) {
          // Sesión restaurada exitosamente desde cookie
          setSession(restoredSession);
          setUser(restoredSession.user);
          
          // Actualizar almacenamiento local con la sesión restaurada
          storeSession(restoredSession);
          
          // Recuperar datos del perfil
          if (restoredSession.user) {
            await fetchProfile(restoredSession.user.id);
          }
          return true;
        }
      } catch (e) {
        // Error al restaurar sesión desde cookie
      }
    }
    
    // Si no se pudo recuperar de cookies, intentar desde localStorage
    const localSession = getStoredSession();
    if (localSession && localSession.access_token && localSession.refresh_token) {
      // Recuperando sesión desde localStorage
      try {
        const { data: { session: restoredSession }, error } = await supabase.auth.setSession({
          access_token: localSession.access_token,
          refresh_token: localSession.refresh_token
        });
        
        if (!error && restoredSession) {
          // Sesión restaurada exitosamente desde localStorage
          setSession(restoredSession);
          setUser(restoredSession.user);
          
          // Actualizar cookies con la sesión restaurada
          storeSessionInCookie(restoredSession);
          
          // Recuperar datos del perfil
          if (restoredSession.user) {
            await fetchProfile(restoredSession.user.id);
          }
          return true;
        }
      } catch (e) {
        // Error al restaurar sesión desde localStorage
      }
    }
    
    return false;
  };

  // Integrar el hook de ciclo de vida de la aplicación
  useAppLifecycle(
    // Callback cuando la app vuelve a primer plano
    () => {
      // App resumed - ejecutando sincronización de datos
      // Reducir el tiempo mínimo entre sincronizaciones a 5 segundos
      // para asegurar una sincronización más frecuente
      const now = Date.now();
      if (now - lastSyncTime > 5000) {
        // Usar setTimeout para dar tiempo a que la app se estabilice
        setTimeout(() => {
          syncDataOnResume();
        }, 500);
      } else {
        // Sincronización omitida - última sincronización hace menos de 5 segundos
      }
    },
    // Callback cuando la app pasa a segundo plano
    () => {
      // App paused - guardando estado actual
      // Asegurarse de que la sesión actual esté almacenada en todas las ubicaciones
      if (session) {
        storeSession(session);
        storeSessionInCookie(session);
        
        // Forzar almacenamiento en localStorage para mayor persistencia
        try {
          const sessionStr = JSON.stringify(session);
          localStorage.setItem('supabase.auth.token', sessionStr);
        } catch (e) {
          // Ignorar errores de almacenamiento
        }
      }
      if (profile) {
        storeUserProfile(profile);
        storeProfileInCookie(profile);
      }
    }
  );

  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Auth state changed
        
        // Simpan sesi ke penyimpanan lokal dan cookie
        if (currentSession) {
          // Storing session in local storage and cookie
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
            // No session found in storage or cookie, clearing profile
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
          // No active Supabase session, trying to recover from cookie
          const cookieSession = getSessionFromCookie();
          
          // Jika berhasil mendapatkan sesi dari cookie, coba set ke Supabase
          if (cookieSession && cookieSession.access_token && cookieSession.refresh_token) {
            // Recovered session from cookie, setting in Supabase
            try {
              // Set session ke Supabase
              const { data: { session: restoredSession }, error: restoreError } = await supabase.auth.setSession({
                access_token: cookieSession.access_token as string,
                refresh_token: cookieSession.refresh_token as string
              });
              
              if (restoreError) {
                // Error setting session from cookie
              } else if (restoredSession) {
                // Session restored successfully from cookie
                currentSession = restoredSession;
                
                // Simpan sesi yang dipulihkan ke penyimpanan lokal
                storeSession(restoredSession);
              }
            } catch (e) {
              // Exception setting session from cookie
            }
          } else {
            // Jika tidak ada di cookie, coba dari localStorage
            // No session in cookie, trying localStorage
            const localSession = getStoredSession();
            
            if (localSession && localSession.access_token && localSession.refresh_token) {
              // Recovered session from localStorage, setting in Supabase
              try {
                // Set session ke Supabase
                const { data: { session: restoredSession }, error: restoreError } = await supabase.auth.setSession({
                  access_token: localSession.access_token,
                  refresh_token: localSession.refresh_token
                });
                
                if (restoreError) {
                  // Error setting session from localStorage
                } else if (restoredSession) {
                  // Session restored successfully from localStorage
                  currentSession = restoredSession;
                  
                  // Simpan sesi yang dipulihkan ke cookie juga
                  storeSessionInCookie(restoredSession);
                }
              } catch (e) {
                // Exception setting session from localStorage
              }
            }
          }
        } else if (currentSession) {
          // Simpan sesi yang valid ke penyimpanan lokal dan cookie
          // Active session found, storing in both localStorage and cookie
          storeSession(currentSession);
          storeSessionInCookie(currentSession);
        }
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          // Session user found, fetching profile
          // Coba ambil profil dari database
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          
          if (profileError || !profileData) {
            // Error fetching profile from database
            
            // Coba ambil dari cookie
            const cookieProfile = getProfileFromCookie();
            if (cookieProfile && cookieProfile.id === currentSession.user.id) {
              // Using profile from cookie
              setProfile(cookieProfile);
              setBusinessId(cookieProfile.business_id || null);
            } else {
              // Coba ambil dari localStorage
              const localProfile = getStoredUserProfile();
              if (localProfile && localProfile.id === currentSession.user.id) {
                // Using profile from localStorage
                setProfile(localProfile);
                setBusinessId(localProfile.business_id || null);
              } else {
                setProfile(null);
                setBusinessId(null);
              }
            }
          } else {
            // Profil berhasil diambil dari database
            // Profile fetched successfully from database
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
          // No user in session, clearing profile
          setProfile(null);
          setBusinessId(null);
        }
      } catch (e) {
        // Exception during auth initialization
        
        // Coba recovery dari cookie
        try {
          // Attempting final recovery from cookie after error
          const cookieSession = getSessionFromCookie();
          const cookieProfile = getProfileFromCookie();
          
          if (cookieSession && cookieSession.user) {
            // Recovering session from cookie after error
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
              // Recovering session from localStorage after error
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
