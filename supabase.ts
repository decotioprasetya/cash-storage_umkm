
import { createClient } from '@supabase/supabase-js';

// PENTING: Masukkan URL dan Anon Key dari dashboard Supabase Anda di sini
const supabaseUrl = 'https://ygocwzsksqaesccymbtn.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnb2N3enNrc3FhZXNjY3ltYnRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzU4MTAsImV4cCI6MjA4NTk1MTgxMH0.B3mr-qhuqgecFgNPcBjIvJ2qjvPHfZuBgV_MQpH5P7A';

/**
 * Mencegah error "supabaseUrl is required" saat runtime.
 * Jika URL/Key kosong, kita mengekspor objek dummy agar aplikasi tetap bisa berjalan (Offline Mode).
 */
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ error: { message: 'Konfigurasi Supabase belum diisi di supabase.ts' } }),
        signUp: async () => ({ error: { message: 'Konfigurasi Supabase belum diisi di supabase.ts' } }),
        signOut: async () => ({ error: null })
      },
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null })
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        upsert: () => Promise.resolve({ data: null, error: null }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      })
    } as any;

// Helper untuk mengecek apakah koneksi cloud siap digunakan
export const isCloudReady = !!(supabaseUrl && supabaseAnonKey);
