
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client with persistent storage options
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    // Store session in both localStorage and cookies for better persistence
    storageKey: 'laundrypro_auth_token',
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});