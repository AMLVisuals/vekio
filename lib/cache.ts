// Stockage en memoire — compatible Expo Go
// MMKV sera utilise dans le build de production
const memoryCache = new Map<string, string>();

/**
 * Sauvegarde une valeur dans le cache local
 */
export function cacheSet<T>(key: string, value: T): void {
  memoryCache.set(key, JSON.stringify(value));
}

/**
 * Recupere une valeur depuis le cache local
 */
export function cacheGet<T>(key: string): T | null {
  const raw = memoryCache.get(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

/**
 * Supprime une valeur du cache
 */
export function cacheDelete(key: string): void {
  memoryCache.delete(key);
}

/**
 * Cle pour le journal du jour
 */
export function journalCacheKey(date: string): string {
  return `journal:${date}`;
}
