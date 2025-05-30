// Utility untuk menyimpan dan mengambil data autentikasi secara persisten
// Menggunakan multiple storage mechanisms untuk ketahanan maksimal

import { Session } from '@supabase/supabase-js';

const AUTH_KEY = 'laundrypro_auth_session';
const PROFILE_KEY = 'laundrypro_user_profile';

// Simpan sesi ke multiple storage
export const storeSession = (session: Session | null): void => {
  if (!session) {
    clearSession();
    return;
  }

  try {
    // Simpan ke localStorage
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    
    // Simpan ke sessionStorage sebagai backup
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
    
    // Simpan ke IndexedDB jika tersedia
    storeInIndexedDB(AUTH_KEY, session);
    
    console.log('Session stored successfully');
  } catch (error) {
    console.error('Error storing session:', error);
  }
};

// Ambil sesi dari storage yang tersedia
export const getStoredSession = (): Session | null => {
  try {
    // Coba ambil dari localStorage dulu
    const localData = localStorage.getItem(AUTH_KEY);
    if (localData) {
      return JSON.parse(localData);
    }
    
    // Jika tidak ada, coba dari sessionStorage
    const sessionData = sessionStorage.getItem(AUTH_KEY);
    if (sessionData) {
      // Jika ditemukan di sessionStorage, restore ke localStorage juga
      localStorage.setItem(AUTH_KEY, sessionData);
      return JSON.parse(sessionData);
    }
    
    // Jika masih tidak ada, coba dari IndexedDB
    return getFromIndexedDB(AUTH_KEY);
  } catch (error) {
    console.error('Error retrieving session:', error);
    
    // Last resort fallback
    try {
      const sessionData = sessionStorage.getItem(AUTH_KEY);
      if (sessionData) {
        console.log('Using session from sessionStorage after localStorage error');
        return JSON.parse(sessionData);
      }
    } catch (sessionError) {
      console.error('Error retrieving backup session:', sessionError);
    }
    
    return null;
  }
};

// Simpan profil pengguna
export const storeUserProfile = (profile: any): void => {
  if (!profile) {
    return;
  }

  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    
    // Also store in sessionStorage as backup
    try {
      sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (sessionError) {
      console.warn('Could not store profile in sessionStorage:', sessionError);
    }
    
    storeInIndexedDB(PROFILE_KEY, profile);
  } catch (error) {
    console.error('Error storing profile in localStorage:', error);
    
    // Try sessionStorage as fallback
    try {
      sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      console.log('Profile stored in sessionStorage as fallback');
    } catch (sessionError) {
      console.error('Error storing profile in sessionStorage:', sessionError);
    }
  }
};

// Ambil profil pengguna
export const getStoredUserProfile = (): any => {
  try {
    const localData = localStorage.getItem(PROFILE_KEY);
    if (localData) {
      return JSON.parse(localData);
    }
    
    // Try sessionStorage as fallback
    const sessionData = sessionStorage.getItem(PROFILE_KEY);
    if (sessionData) {
      console.log('Using profile from sessionStorage fallback');
      return JSON.parse(sessionData);
    }
    
    return getFromIndexedDB(PROFILE_KEY);
  } catch (error) {
    console.error('Error retrieving user profile:', error);
    return null;
  }
};

// Hapus semua data sesi
export const clearSession = (): void => {
  try {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(PROFILE_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
    clearFromIndexedDB(AUTH_KEY);
    clearFromIndexedDB(PROFILE_KEY);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};

// Helper untuk menyimpan ke IndexedDB
const storeInIndexedDB = (key: string, value: any): void => {
  if (!window.indexedDB) {
    return;
  }

  const request = window.indexedDB.open('LaundryProAuth', 1);
  
  request.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    if (!db.objectStoreNames.contains('auth')) {
      db.createObjectStore('auth', { keyPath: 'key' });
    }
  };
  
  request.onsuccess = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    const transaction = db.transaction(['auth'], 'readwrite');
    const store = transaction.objectStore('auth');
    
    store.put({ key, value });
    
    transaction.oncomplete = () => {
      db.close();
    };
  };
  
  request.onerror = (event) => {
    console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
  };
};

// Helper untuk mengambil dari IndexedDB
const getFromIndexedDB = (key: string): any => {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    
    const request = window.indexedDB.open('LaundryProAuth', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('auth')) {
        resolve(null);
        db.close();
        return;
      }
      
      const transaction = db.transaction(['auth'], 'readonly');
      const store = transaction.objectStore('auth');
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        const result = getRequest.result;
        db.close();
        if (result) {
          // Jika ditemukan di IndexedDB, restore ke localStorage juga
          try {
            localStorage.setItem(key, JSON.stringify(result.value));
          } catch (e) {
            console.error('Error restoring from IndexedDB to localStorage:', e);
          }
          resolve(result.value);
        } else {
          resolve(null);
        }
      };
      
      getRequest.onerror = () => {
        console.error('Error getting data from IndexedDB');
        db.close();
        resolve(null);
      };
    };
    
    request.onerror = () => {
      console.error('Error opening IndexedDB');
      resolve(null);
    };
  });
};

// Helper untuk menghapus dari IndexedDB
const clearFromIndexedDB = (key: string): void => {
  if (!window.indexedDB) {
    return;
  }
  
  const request = window.indexedDB.open('LaundryProAuth', 1);
  
  request.onsuccess = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    
    if (!db.objectStoreNames.contains('auth')) {
      db.close();
      return;
    }
    
    const transaction = db.transaction(['auth'], 'readwrite');
    const store = transaction.objectStore('auth');
    
    store.delete(key);
    
    transaction.oncomplete = () => {
      db.close();
    };
  };
};
