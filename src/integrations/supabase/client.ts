
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Pendekatan keamanan untuk kredensial Supabase
// Dalam development, gunakan akses langsung ke Supabase
// Dalam produksi, gunakan server proxy untuk mengamankan kredensial

// Cek apakah dalam mode produksi
const isProduction = import.meta.env.MODE === 'production';

// URL API server proxy (hanya digunakan dalam produksi)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Kredensial Supabase langsung (hanya digunakan dalam development)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Simpan token autentikasi
let authToken = '';

// Buat Supabase client untuk development
const supabaseClient = isProduction ? null : createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'laundrypro_auth_token',
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// Fungsi wrapper untuk Supabase yang aman
export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      if (isProduction) {
        // Dalam produksi, gunakan server proxy
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        if (result.data?.session?.access_token) {
          authToken = result.data.session.access_token;
          localStorage.setItem('laundrypro_auth_token', authToken);
        }
        return result;
      } else {
        // Dalam development, gunakan Supabase langsung
        return await supabaseClient!.auth.signInWithPassword({ email, password });
      }
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      if (isProduction) {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, userData: options?.data })
        });
        return await response.json();
      } else {
        return await supabaseClient!.auth.signUp({ email, password, options });
      }
    },
    signOut: async () => {
      if (isProduction) {
        const token = localStorage.getItem('laundrypro_auth_token') || authToken;
        const response = await fetch(`${API_URL}/auth/logout`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        localStorage.removeItem('laundrypro_auth_token');
        authToken = '';
        return await response.json();
      } else {
        return await supabaseClient!.auth.signOut();
      }
    },
    getSession: () => {
      if (isProduction) {
        // Implementasi sederhana untuk mode produksi
        const token = localStorage.getItem('laundrypro_auth_token');
        return { data: { session: token ? { access_token: token } : null }, error: null };
      } else {
        return supabaseClient!.auth.getSession();
      }
    }
  },
  // Implementasi metode database lainnya mengikuti pola yang sama
  from: (table: string) => ({
    select: (columns: string = '*') => ({
      eq: async (column: string, value: any) => {
        if (isProduction) {
          const token = localStorage.getItem('laundrypro_auth_token') || authToken;
          const response = await fetch(`${API_URL}/api/${table}?${column}=${value}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          return await response.json();
        } else {
          return await supabaseClient!.from(table).select(columns).eq(column, value);
        }
      },
      // Implementasi method lainnya
    }),
    insert: async (data: any) => {
      if (isProduction) {
        const token = localStorage.getItem('laundrypro_auth_token') || authToken;
        const response = await fetch(`${API_URL}/api/${table}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        return await response.json();
      } else {
        return await supabaseClient!.from(table).insert(data);
      }
    },
    update: (data: any) => ({
      eq: async (column: string, value: any) => {
        if (isProduction) {
          const token = localStorage.getItem('laundrypro_auth_token') || authToken;
          const response = await fetch(`${API_URL}/api/${table}/${value}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
          });
          return await response.json();
        } else {
          return await supabaseClient!.from(table).update(data).eq(column, value);
        }
      }
    }),
    delete: () => ({
      eq: async (column: string, value: any) => {
        if (isProduction) {
          const token = localStorage.getItem('laundrypro_auth_token') || authToken;
          const response = await fetch(`${API_URL}/api/${table}/${value}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          return await response.json();
        } else {
          return await supabaseClient!.from(table).delete().eq(column, value);
        }
      }
    })
  })
};