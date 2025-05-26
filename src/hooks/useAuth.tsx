import React, { useState, useEffect, createContext, useContext } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { updateFcmTokenToProfile } from '@/utils/pushNotifications';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
// Import Google Auth dari helper
import { GoogleAuth } from '@/utils/googleAuthHelper';

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
        // PENDEKATAN BARU: Gunakan native Google Auth tanpa browser
        console.log('Menggunakan native Google Auth tanpa browser');
        
        try {
          // Inisialisasi GoogleAuth jika belum
          console.log('Inisialisasi GoogleAuth...');
          GoogleAuth.initialize({
            clientId: '1048243846987-mhbh2j5q4o6j1c2lv5lfvs6u3gp6cjnm.apps.googleusercontent.com',
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
          });
          
          // Login dengan Google Auth native
          console.log('Memulai login dengan GoogleAuth native...');
          const googleUser = await GoogleAuth.signIn();
          console.log('Google Auth berhasil:', googleUser);
          
          if (!googleUser || !googleUser.authentication || !googleUser.authentication.idToken) {
            throw new Error('Tidak mendapatkan token dari Google Auth');
          }
          
          // Login ke Supabase dengan token Google
          console.log('Login ke Supabase dengan token Google...');
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: googleUser.authentication.idToken,
          });
          
          console.log('Hasil login Supabase:', data, 'Error:', error);
          
          if (error) {
            console.error('Error saat login Supabase:', error.message, error.stack);
            alert('Gagal login ke Supabase: ' + error.message);
            return { success: false, error };
          }
          
          if (data?.session) {
            console.log('Login berhasil! Session:', data.session);
            // Simpan session ke localStorage untuk memastikan
            localStorage.setItem('supabase.auth.token', JSON.stringify({
              currentSession: data.session,
              expiresAt: data.session.expires_at
            }));
            setTimeout(() => window.location.reload(), 500);
            return { success: true, error: null };
          } else {
            console.error('Tidak ada session setelah login');
            alert('Tidak mendapatkan session setelah login. Silakan coba lagi.');
            return { success: false, error: new Error('No session after login') };
          }
        } catch (e) {
          console.error('Error saat Google Auth native:', e);
          
          // Fallback ke metode browser jika native gagal
          console.log('Native Google Auth gagal, mencoba dengan browser sebagai fallback...');
          
          // Bersihkan semua listener yang ada untuk menghindari duplikasi
          Browser.removeAllListeners();
          App.removeAllListeners();
          
          // 1. Siapkan handler untuk deep link
          const handleAppUrlOpen = async ({ url }: { url: string }) => {
            console.log('Deep link terdeteksi:', url);
            
            if (url.includes('code=') || url.includes('token=') || url.includes('access_token=')) {
              // Tutup browser jika masih terbuka
              try {
                await Browser.close();
                console.log('Browser ditutup dari deep link handler');
              } catch (e) {
                console.log('Browser mungkin sudah ditutup:', e);
              }
              
              // Coba ekstrak kode dari URL
              if (url.includes('code=')) {
                const code = extractParamFromUrl(url, 'code');
                console.log('Kode otentikasi ditemukan:', code);
                
                if (code) {
                  try {
                    // Tukar kode dengan session
                    console.log('Mencoba exchange code untuk session...');
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    console.log('Hasil exchange code:', data, 'Error:', error);
                    
                    if (data?.session) {
                      console.log('Login berhasil dengan code! Session:', data.session);
                      // Simpan session ke localStorage untuk memastikan
                      localStorage.setItem('supabase.auth.token', JSON.stringify({
                        currentSession: data.session,
                        expiresAt: data.session.expires_at
                      }));
                      setTimeout(() => window.location.reload(), 500);
                      return;
                    } else if (error) {
                      console.error('Error saat exchange code:', error.message, error.stack);
                    }
                  } catch (e) {
                    console.error('Exception saat proses kode:', e);
                  }
                }
              }
              
              // Jika kode tidak berhasil, coba cek token
              if (url.includes('access_token=')) {
                const access_token = extractParamFromUrl(url, 'access_token');
                const refresh_token = extractParamFromUrl(url, 'refresh_token');
                
                console.log('Token ditemukan dalam URL:', { access_token, refresh_token });
                
                if (access_token) {
                  try {
                    // Set session dengan token
                    console.log('Mencoba set session dengan token...');
                    const { data, error } = await supabase.auth.setSession({
                      access_token: access_token,
                      refresh_token: refresh_token || ''
                    });
                    
                    console.log('Hasil set session:', data, 'Error:', error);
                    
                    if (data?.session) {
                      console.log('Login berhasil dengan token! Session:', data.session);
                      // Simpan session ke localStorage untuk memastikan
                      localStorage.setItem('supabase.auth.token', JSON.stringify({
                        currentSession: data.session,
                        expiresAt: data.session.expires_at
                      }));
                      setTimeout(() => window.location.reload(), 500);
                      return;
                    } else if (error) {
                      console.error('Error saat set session:', error.message, error.stack);
                    }
                  } catch (e) {
                    console.error('Exception saat proses token:', e);
                  }
                }
              }
              
              // Jika semua metode di atas gagal, coba refresh session
              try {
                console.log('Mencoba refresh session sebagai fallback...');
                const { data, error } = await supabase.auth.refreshSession();
                console.log('Hasil refresh session:', data, 'Error:', error);
                
                if (data?.session) {
                  console.log('Login berhasil dengan refresh! Session:', data.session);
                  // Simpan session ke localStorage untuk memastikan
                  localStorage.setItem('supabase.auth.token', JSON.stringify({
                    currentSession: data.session,
                    expiresAt: data.session.expires_at
                  }));
                  setTimeout(() => window.location.reload(), 500);
                  return;
                } else {
                  console.error('Tidak ada session setelah refresh');
                }
              } catch (e) {
                console.error('Exception saat refresh session:', e);
              }
              
              // Jika semua gagal, tampilkan pesan error
              console.error('Semua metode login gagal, menampilkan alert');
              alert('Terjadi kesalahan saat proses login. Silakan coba lagi.');
            } else {
              console.log('URL tidak mengandung kode atau token auth');
            }
          };
          
          // Daftarkan handler untuk deep link
          console.log('Mendaftarkan handler untuk appUrlOpen');
          App.addListener('appUrlOpen', handleAppUrlOpen);
          
          // 2. Siapkan handler untuk browser ditutup
          console.log('Mendaftarkan handler untuk browserFinished');
          Browser.addListener('browserFinished', async () => {
            console.log('Browser ditutup, memeriksa status login...');
            
            // Tunggu sejenak untuk memastikan proses auth selesai
            setTimeout(async () => {
              try {
                // Cek apakah sudah ada session
                console.log('Memeriksa session setelah browser ditutup...');
                const { data } = await supabase.auth.getSession();
                console.log('Session setelah browser ditutup:', data);
                
                if (data?.session) {
                  console.log('Session ditemukan, login berhasil! Session:', data.session);
                  // Simpan session ke localStorage untuk memastikan
                  localStorage.setItem('supabase.auth.token', JSON.stringify({
                    currentSession: data.session,
                    expiresAt: data.session.expires_at
                  }));
                  setTimeout(() => window.location.reload(), 500);
                  return;
                } else {
                  console.log('Session tidak ditemukan, mencoba refresh...');
                  
                  // Coba refresh session
                  try {
                    console.log('Mencoba refresh session...');
                    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                    console.log('Hasil refresh setelah browser ditutup:', refreshData, 'Error:', refreshError);
                    
                    if (refreshData?.session) {
                      console.log('Session ditemukan setelah refresh, login berhasil! Session:', refreshData.session);
                      // Simpan session ke localStorage untuk memastikan
                      localStorage.setItem('supabase.auth.token', JSON.stringify({
                        currentSession: refreshData.session,
                        expiresAt: refreshData.session.expires_at
                      }));
                      setTimeout(() => window.location.reload(), 500);
                      return;
                    } else {
                      console.log('Tidak ada session setelah refresh, error:', refreshError);
                    }
                  } catch (e) {
                    console.error('Exception saat refresh:', e);
                  }
                }
              } catch (e) {
                console.error('Exception saat memeriksa session:', e);
              }
            }, 1000);
          });
          
          // 3. Mulai proses login dengan Google
          console.log('Memulai proses login Google dengan browser...');
          
          // Gunakan URL redirect yang valid untuk web (https)
          // Ini akan di-intercept oleh deep link handler di Android
          const redirectUrl = 'https://laundrypro.vercel.app/auth/v1/callback';
          console.log('Menggunakan URL redirect:', redirectUrl);
          
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              skipBrowserRedirect: true,
              redirectTo: redirectUrl,
              // Pastikan mendapatkan refresh token
              queryParams: {
                access_type: 'offline',
                prompt: 'consent'
              }
            }
          });
          
          console.log('Hasil inisiasi OAuth:', data, 'Error:', error);
          
          if (error) {
            console.error('Error saat inisiasi OAuth:', error.message, error.stack);
            alert('Gagal memulai proses login: ' + error.message);
            return { success: false, error };
          }
          
          if (!data?.url) {
            console.error('Tidak ada URL untuk login');
            alert('Gagal mendapatkan URL login');
            return { success: false, error: new Error('No URL provided') };
          }
          
          // 4. Buka browser dengan URL login
          console.log('Membuka browser dengan URL:', data.url);
          await Browser.open({
            url: data.url,
            windowName: 'Google Login',
            presentationStyle: 'fullscreen',
            toolbarColor: '#3880ff'
          });
          
          // 5. Tambahkan timeout untuk menutup browser jika terlalu lama
          setTimeout(async () => {
            try {
              console.log('Timeout 60 detik tercapai, mencoba menutup browser...');
              await Browser.close();
              console.log('Browser ditutup oleh timeout');
              
              // Cek session setelah timeout
              console.log('Memeriksa session setelah timeout...');
              const { data: timeoutData, error: timeoutError } = await supabase.auth.getSession();
              console.log('Session setelah timeout:', timeoutData, 'Error:', timeoutError);
              
              if (timeoutData?.session) {
                console.log('Session ditemukan setelah timeout, login berhasil! Session:', timeoutData.session);
                // Simpan session ke localStorage untuk memastikan
                localStorage.setItem('supabase.auth.token', JSON.stringify({
                  currentSession: timeoutData.session,
                  expiresAt: timeoutData.session.expires_at
                }));
                setTimeout(() => window.location.reload(), 500);
              } else {
                console.log('Tidak ada session setelah timeout, error:', timeoutError);
              }
            } catch (e) {
              console.log('Exception saat menutup browser:', e);
            }
          }, 60000); // 1 menit timeout
          
          return { success: true, error: null };
        }
      } else {
        // Untuk web, gunakan flow OAuth normal
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'https://laundrypro.vercel.app/auth/v1/callback',
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
