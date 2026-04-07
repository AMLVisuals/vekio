import { MMKV } from 'react-native-mmkv';

// @ts-expect-error MMKV is a JSI module, TS sees it as type-only in some configs
export const cache: InstanceType<typeof MMKV> = new (MMKV as any)({ id: 'vekio-cache' });

/**
 * Sauvegarde une valeur dans le cache local
 */
export function cacheSet<T>(key: string, value: T): void {
  cache.set(key, JSON.stringify(value));
}

/**
 * Recupere une valeur depuis le cache local
 */
export function cacheGet<T>(key: string): T | null {
  const raw = cache.getString(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

/**
 * Supprime une valeur du cache
 */
export function cacheDelete(key: string): void {
  cache.delete(key);
}

/**
 * Cle pour le journal du jour
 */
export function journalCacheKey(date: string): string {
  return `journal:${date}`;
}
