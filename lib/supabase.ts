import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Stockage chiffre natif (Keychain iOS / Keystore Android) compatible Expo Go.
// La session Supabase persiste entre les reloads — l'utilisateur reste connecte
// jusqu'a un logout explicite. Plus securise qu'AsyncStorage.
const storageAdapter = {
  getItem: async (key: string) => {
    try { return await SecureStore.getItemAsync(key); }
    catch { return null; }
  },
  setItem: async (key: string, value: string) => {
    try { await SecureStore.setItemAsync(key, value); }
    catch {}
  },
  removeItem: async (key: string) => {
    try { await SecureStore.deleteItemAsync(key); }
    catch {}
  },
};

const SUPABASE_URL = 'https://mwbrwppbwucbeardeyyc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13YnJ3cHBid3VjYmVhcmRleXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODE3ODYsImV4cCI6MjA5Mjg1Nzc4Nn0.KoGgjqsPbzZBgaBMMdFfbE1S1oNaHOmHdkEZyWHQJBs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
