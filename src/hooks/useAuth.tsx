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
        // Untuk aplikasi native (Android/iOS), gunakan pendekatan yang lebih baik
        // Hapus semua listener untuk menghindari duplikasi
        Browser.removeAllListeners();
        App.removeAllListeners();
        
        // Setup deep link handler untuk menangkap callback dari OAuth
        const handleAppUrlChange = async ({ url }: { url: string }) => {
          console.log('Deep link detected:', url);
          
          // Periksa apakah URL mengandung token atau kode autentikasi
          if (url.includes('access_token') || url.includes('code=') || url.includes('token_type=')) {
            console.log('Auth callback URL terdeteksi:', url);
            
            try {
              // Tutup browser terlebih dahulu untuk memastikan kembali ke aplikasi
              try {
                await Browser.close();
                console.log('Browser ditutup secara manual dari deep link handler');
              } catch (closeError) {
                console.error('Error saat menutup browser:', closeError);
              }
              
              // Jika URL berisi kode, gunakan exchangeCodeForSession
              if (url.includes('code=')) {
                const code = extractParamFromUrl(url, 'code');
                console.log('Kode OAuth terdeteksi:', code);
                
                if (code) {
                  // Gunakan kode untuk mendapatkan session
                  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                  console.log('Exchange code result:', { data, error });
                  
                  if (data.session) {
                    console.log('Session berhasil dibuat dengan kode');
                    // Gunakan setTimeout untuk memastikan UI terupdate setelah proses auth selesai
                    setTimeout(() => window.location.reload(), 500);
                    return;
                  } else if (error) {
                    console.error('Error saat exchange code:', error);
                  }
                }
              } 
              // Jika URL berisi access_token, gunakan setSession
              else if (url.includes('access_token')) {
                const access_token = extractParamFromUrl(url, 'access_token');
                const refresh_token = extractParamFromUrl(url, 'refresh_token');
                
                console.log('Token terdeteksi:', { access_token, refresh_token });
                
                if (access_token && refresh_token) {
                  const { data, error } = await supabase.auth.setSession({
                    access_token,
                    refresh_token
                  });
                  
                  console.log('Set session result:', { data, error });
                  
                  if (data.session) {
                    console.log('Session berhasil dibuat dengan token');
                    // Gunakan setTimeout untuk memastikan UI terupdate setelah proses auth selesai
                    setTimeout(() => window.location.reload(), 500);
                    return;
                  } else if (error) {
                    console.error('Error saat set session:', error);
                  }
                }
              }
              
              // Jika tidak berhasil dengan metode di atas, coba refresh session
              const { data: refreshData } = await supabase.auth.refreshSession();
              console.log('Hasil refresh session:', refreshData);
              
              if (refreshData.session) {
                console.log('Session berhasil di-refresh');
                // Gunakan setTimeout untuk memastikan UI terupdate setelah proses auth selesai
                setTimeout(() => window.location.reload(), 500);
                return;
              }
            } catch (e) {
              console.error('Error saat memproses callback URL:', e);
            }
          }
        };
        
        // Register URL open listener
        App.addListener('appUrlOpen', handleAppUrlChange);
        
        // Tambahkan listener untuk menangkap ketika browser ditutup
        Browser.addListener('browserFinished', async () => {
          console.log('Browser ditutup, memeriksa status login...');
          
          try {
            // Tunggu sebentar untuk memastikan callback URL sudah diproses
            setTimeout(async () => {
              // Periksa session setelah browser ditutup
              const { data: sessionData } = await supabase.auth.getSession();
              console.log('Session setelah browser ditutup:', sessionData);
              
              if (sessionData.session) {
                console.log('Session ditemukan, user berhasil login');
                // Gunakan setTimeout untuk memastikan UI terupdate setelah proses auth selesai
                setTimeout(() => window.location.reload(), 500);
                return;
              } 
              
              // Jika tidak ada session, coba mendapatkan URL terakhir dari browser
              console.log('Session tidak ditemukan, mencoba mendapatkan URL terakhir...');
              
              // Coba metode alternatif - cek apakah ada token di localStorage atau cookie
              const refreshResult = await supabase.auth.refreshSession();
              console.log('Hasil refresh session setelah browser ditutup:', refreshResult);
              
              if (refreshResult.data?.session) {
                console.log('Session ditemukan setelah refresh, user berhasil login');
                setTimeout(() => window.location.reload(), 500);
                return;
              }
              
              // Jika masih tidak ada session, coba login dengan metode alternatif
              console.log('Session masih tidak ditemukan, mencoba login alternatif...');
              
              try {
                // Gunakan metode yang berbeda untuk login
                const { data: manualData, error: manualError } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: 'com.laundrypro.app://login-callback',
                    skipBrowserRedirect: false, // Coba dengan false
                  },
                });
                
                console.log('Hasil login manual:', { manualData, manualError });
                
                if (manualError) {
                  console.error('Error login manual:', manualError);
                  alert('Gagal login dengan Google. Silakan coba lagi.');
                }
              } catch (e) {
                console.error('Error saat login manual:', e);
                
                // Jika semua metode gagal, tampilkan pesan error
                alert('Terjadi kesalahan saat login. Silakan coba lagi.');
              }
            }, 1000); // Tunggu 1 detik
          } catch (e) {
            console.error('Error saat proses login:', e);
            alert('Terjadi kesalahan saat login. Silakan coba lagi.');
          }
        });
        
        // Gunakan URL callback yang sesuai dengan skema aplikasi dan konfigurasi deep link
        console.log('Memulai proses OAuth dengan Google...');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            skipBrowserRedirect: true,
            // Gunakan format URL yang sesuai dengan konfigurasi intent filter
            redirectTo: 'com.laundrypro.app://login-callback',
            queryParams: {
              // Tambahkan parameter untuk memastikan callback berfungsi dengan baik
              access_type: 'offline',
              prompt: 'consent',
            }
          },
        });
        
        console.log('Hasil OAuth init:', data);
        
        if (data?.url) {
          console.log('Membuka browser dengan URL:', data.url);
          
          // Tambahkan parameter state untuk membantu identifikasi callback
          const authUrl = new URL(data.url);
          authUrl.searchParams.append('state', 'capacitor_app_auth');
          console.log('URL dengan state parameter:', authUrl.toString());
          
          // Buka URL autentikasi dengan opsi yang lebih baik
          await Browser.open({
            url: authUrl.toString(),
            windowName: 'Google Login',
            presentationStyle: 'fullscreen', // Gunakan fullscreen untuk pengalaman lebih baik
            toolbarColor: '#3880ff',
          });
          
          // Tambahkan timeout untuk memeriksa status login jika browser tidak menutup
          setTimeout(async () => {
            try {
              // Cek apakah browser masih terbuka setelah 30 detik
              const { data: sessionCheck } = await supabase.auth.getSession();
              console.log('Cek session setelah timeout:', sessionCheck);
              
              if (sessionCheck.session) {
                console.log('Session ditemukan setelah timeout, mencoba menutup browser...');
                try {
                  await Browser.close();
                  console.log('Browser berhasil ditutup setelah timeout');
                  setTimeout(() => window.location.reload(), 500);
                } catch (closeError) {
                  console.error('Error saat menutup browser setelah timeout:', closeError);
                }
              }
            } catch (e) {
              console.error('Error saat cek session setelah timeout:', e);
            }
          }, 30000); // Cek setelah 30 detik
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
