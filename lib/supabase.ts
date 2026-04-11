import { createClient } from '@supabase/supabase-js';

// Stockage en memoire — compatible Expo Go
// MMKV sera utilise dans le build de production
const memoryStorage = new Map<string, string>();

const storageAdapter = {
  getItem: (key: string) => {
    return memoryStorage.get(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    memoryStorage.set(key, value);
  },
  removeItem: (key: string) => {
    memoryStorage.delete(key);
  },
};

const SUPABASE_URL = 'https://ejksceajiklhjpqdcpbi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqa3NjZWFqaWtsaGpwcWRjcGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4ODg0NjAsImV4cCI6MjA5MTQ2NDQ2MH0.wpgbGnEyZET672GSQ67f9__-n_ksrco_vhp4C0fuKSU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
