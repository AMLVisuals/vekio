import { create } from 'zustand';
import { cacheSet, cacheGet, journalCacheKey } from '../lib/cache';

export type MealType = 'petit_dejeuner' | 'dejeuner' | 'diner' | 'collation';

export interface JournalEntry {
  id: string;
  food_id: string;
  nom: string;
  quantite_g: number;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
  repas: MealType;
}

interface JournalState {
  date: string;
  entries: JournalEntry[];
  setDate: (date: string) => void;
  addEntry: (entry: JournalEntry) => void;
  removeEntry: (id: string) => void;
  loadFromCache: (date: string) => void;
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const useJournalStore = create<JournalState>((set, get) => ({
  date: todayString(),
  entries: [],

  setDate: (date) => {
    set({ date });
    get().loadFromCache(date);
  },

  addEntry: (entry) => {
    const newEntries = [...get().entries, entry];
    set({ entries: newEntries });
    // Sauvegarde immediate dans le cache local
    cacheSet(journalCacheKey(get().date), newEntries);
  },

  removeEntry: (id) => {
    const newEntries = get().entries.filter((e) => e.id !== id);
    set({ entries: newEntries });
    cacheSet(journalCacheKey(get().date), newEntries);
  },

  loadFromCache: (date) => {
    const cached = cacheGet<JournalEntry[]>(journalCacheKey(date));
    set({ entries: cached || [], date });
  },
}));
