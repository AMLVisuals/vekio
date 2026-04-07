import { createClient } from '@supabase/supabase-js';
import { MMKV } from 'react-native-mmkv';

// @ts-expect-error MMKV is a JSI module, TS sees it as type-only in some configs
const storage = new (MMKV as any)({ id: 'supabase-auth' }) as InstanceType<typeof MMKV>;

// Adaptateur de stockage pour Supabase Auth compatible MMKV
const mmkvStorageAdapter = {
  getItem: (key: string) => {
    const value = storage.getString(key);
    return value ?? null;
  },
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};

// TODO : remplacer par tes vraies valeurs Supabase
const SUPABASE_URL = 'https://VOTRE_PROJET.supabase.co';
const SUPABASE_ANON_KEY = 'VOTRE_CLE_ANON';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: mmkvStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
