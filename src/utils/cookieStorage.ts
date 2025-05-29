// Utilitas untuk menyimpan dan mengambil data autentikasi dari cookie
// Cookie lebih tahan terhadap pembersihan history dibanding localStorage/sessionStorage

import { Session } from '@supabase/supabase-js';

const AUTH_COOKIE_NAME = 'laundrypro_auth';
const PROFILE_COOKIE_NAME = 'laundrypro_profile';
const COOKIE_EXPIRY_DAYS = 30; // Cookie berlaku 30 hari

/**
 * Menyimpan sesi ke cookie
 */
export const storeSessionInCookie = (session: Session | null): void => {
  if (!session) {
    clearAuthCookies();
    return;
  }

  try {
    // Simpan token yang penting saja untuk mengurangi ukuran cookie
    const essentialSessionData = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role
      }
    };

    setCookie(AUTH_COOKIE_NAME, JSON.stringify(essentialSessionData), COOKIE_EXPIRY_DAYS);
    console.log('Session stored in cookie successfully');
  } catch (error) {
    console.error('Error storing session in cookie:', error);
  }
};

/**
 * Mengambil sesi dari cookie
 */
export const getSessionFromCookie = (): Partial<Session> | null => {
  try {
    const cookieValue = getCookie(AUTH_COOKIE_NAME);
    if (!cookieValue) return null;
    
    return JSON.parse(cookieValue);
  } catch (error) {
    console.error('Error retrieving session from cookie:', error);
    return null;
  }
};

/**
 * Menyimpan profil pengguna ke cookie
 */
export const storeProfileInCookie = (profile: any): void => {
  if (!profile) return;

  try {
    setCookie(PROFILE_COOKIE_NAME, JSON.stringify(profile), COOKIE_EXPIRY_DAYS);
  } catch (error) {
    console.error('Error storing profile in cookie:', error);
  }
};

/**
 * Mengambil profil pengguna dari cookie
 */
export const getProfileFromCookie = (): any => {
  try {
    const cookieValue = getCookie(PROFILE_COOKIE_NAME);
    if (!cookieValue) return null;
    
    return JSON.parse(cookieValue);
  } catch (error) {
    console.error('Error retrieving profile from cookie:', error);
    return null;
  }
};

/**
 * Menghapus semua cookie autentikasi
 */
export const clearAuthCookies = (): void => {
  deleteCookie(AUTH_COOKIE_NAME);
  deleteCookie(PROFILE_COOKIE_NAME);
};

// Helper functions untuk manipulasi cookie

/**
 * Menyimpan cookie dengan nama, nilai, dan masa berlaku tertentu
 */
function setCookie(name: string, value: string, days: number): void {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict;`;
}

/**
 * Mengambil nilai cookie berdasarkan nama
 */
function getCookie(name: string): string | null {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

/**
 * Menghapus cookie berdasarkan nama
 */
function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
}
