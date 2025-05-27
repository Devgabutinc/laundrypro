import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// Tipe untuk handler deep link
type DeepLinkHandler = (url: URL, event: URLOpenListenerEvent) => void;

// Map untuk menyimpan handler berdasarkan path
const pathHandlers: Record<string, DeepLinkHandler> = {};

/**
 * Mendaftarkan handler untuk path tertentu
 * @param path Path yang akan ditangani (tanpa leading slash)
 * @param handler Fungsi handler
 */
export const registerDeepLinkHandler = (path: string, handler: DeepLinkHandler) => {
  pathHandlers[path] = handler;
};

/**
 * Menginisialisasi listener untuk deep link
 * @param navigate Fungsi navigate dari react-router
 */
export const initDeepLinks = (navigate: (path: string) => void) => {
  // Handler untuk konfirmasi email
  registerDeepLinkHandler('confirm-email', async (url, event) => {
    console.log('Handling confirm-email deep link:', url.toString());
    
    // Cek apakah ada token di URL
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');
    
    if (token && type === 'signup') {
      try {
        // Verifikasi token dengan Supabase
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });
        
        if (error) {
          console.error('Error verifying email:', error);
          navigate('/auth?error=email_verification_failed');
        } else {
          console.log('Email verified successfully');
          navigate('/auth?success=email_verified');
        }
      } catch (error) {
        console.error('Exception during email verification:', error);
        navigate('/auth?error=email_verification_failed');
      }
    } else {
      // Jika tidak ada token, arahkan ke halaman konfirmasi email biasa
      navigate('/confirm-email');
    }
  });
  
  // Handler untuk reset password
  registerDeepLinkHandler('updatepassword', (url, event) => {
    console.log('Handling reset password deep link:', url.toString());
    
    // Cek apakah ada token di URL
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');
    
    if (token && type === 'recovery') {
      // Tambahkan token ke hash untuk digunakan oleh halaman reset password
      navigate(`/updatepassword#access_token=${token}`);
    } else {
      // Jika tidak ada token, arahkan ke halaman reset password biasa
      navigate('/updatepassword');
    }
  });
  
  // Listener untuk app URL open
  App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    console.log('App URL opened:', event.url);
    
    try {
      // Parse URL
      const url = new URL(event.url);
      const path = url.pathname.replace(/^\//, ''); // Hapus leading slash
      
      console.log('Deep link path:', path);
      
      // Cari handler untuk path ini
      const handler = pathHandlers[path];
      
      if (handler) {
        // Jalankan handler
        handler(url, event);
      } else {
        // Default handler jika tidak ada yang cocok
        console.log('No handler for path:', path);
        navigate('/');
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  });
  
  console.log('Deep linking initialized');
};

/**
 * Membuat URL deep link untuk aplikasi
 * @param path Path tujuan (tanpa leading slash)
 * @param params Parameter query
 * @returns URL deep link lengkap
 */
export const createDeepLink = (path: string, params: Record<string, string> = {}) => {
  // Gunakan URL scheme yang berbeda berdasarkan platform
  const isNative = Capacitor.isNativePlatform();
  const scheme = isNative ? 'laundrypro://' : 'https://laundrypro.vercel.app/';
  
  
  // Buat URL base
  let url = `${scheme}${path}`;
  
  // Tambahkan parameter query jika ada
  if (Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, value);
    });
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};
