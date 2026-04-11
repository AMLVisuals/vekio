import { create } from 'zustand';
import { cacheSet, cacheGet, journalCacheKey } from '../lib/cache';
import { supabase } from '../lib/supabase';

export type MealType = 'petit_dejeuner' | 'dejeuner' | 'diner' | 'collation';

export const MEAL_LABELS: Record<MealType, string> = {
  petit_dejeuner: 'Petit-déjeuner',
  dejeuner: 'Déjeuner',
  diner: 'Dîner',
  collation: 'Collation',
};

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
  isLoading: boolean;
  setDate: (date: string) => void;
  addEntry: (entry: JournalEntry) => void;
  removeEntry: (id: string) => void;
  loadFromCache: (date: string) => void;
  loadFromSupabase: () => Promise<void>;
  syncEntryToSupabase: (entry: JournalEntry) => Promise<void>;
  deleteFromSupabase: (id: string) => Promise<void>;
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const useJournalStore = create<JournalState>((set, get) => ({
  date: todayString(),
  entries: [],
  isLoading: false,

  setDate: (date) => {
    set({ date });
    get().loadFromCache(date);
    get().loadFromSupabase();
  },

  addEntry: (entry) => {
    const newEntries = [...get().entries, entry];
    set({ entries: newEntries });
    cacheSet(journalCacheKey(get().date), newEntries);
    get().syncEntryToSupabase(entry);
  },

  removeEntry: (id) => {
    const newEntries = get().entries.filter((e) => e.id !== id);
    set({ entries: newEntries });
    cacheSet(journalCacheKey(get().date), newEntries);
    get().deleteFromSupabase(id);
  },

  loadFromCache: (date) => {
    const cached = cacheGet<JournalEntry[]>(journalCacheKey(date));
    if (cached) set({ entries: cached, date });
  },

  loadFromSupabase: async () => {
    set({ isLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ isLoading: false }); return; }

    const { data } = await supabase
      .from('journal')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', get().date)
      .order('created_at', { ascending: true });

    if (data) {
      const entries: JournalEntry[] = data.map((row) => ({
        id: row.id,
        food_id: row.food_id ?? '',
        nom: row.nom,
        quantite_g: Number(row.quantite_g),
        calories: Number(row.calories),
        proteines: Number(row.proteines_g),
        glucides: Number(row.glucides_g),
        lipides: Number(row.lipides_g),
        repas: row.repas as MealType,
      }));
      set({ entries });
      cacheSet(journalCacheKey(get().date), entries);
    }
    set({ isLoading: false });
  },

  syncEntryToSupabase: async (entry) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('journal').insert({
      id: entry.id,
      user_id: user.id,
      date: get().date,
      repas: entry.repas,
      food_id: entry.food_id,
      nom: entry.nom,
      quantite_g: entry.quantite_g,
      calories: entry.calories,
      proteines_g: entry.proteines,
      glucides_g: entry.glucides,
      lipides_g: entry.lipides,
    });

    // Mettre a jour les aliments favoris
    const { data: existing } = await supabase
      .from('aliments_favoris')
      .select('id, nb_utilisations')
      .eq('user_id', user.id)
      .eq('nom', entry.nom)
      .single();

    if (existing) {
      await supabase
        .from('aliments_favoris')
        .update({ nb_utilisations: existing.nb_utilisations + 1 })
        .eq('id', existing.id);
    } else {
      await supabase.from('aliments_favoris').insert({
        user_id: user.id,
        food_id: entry.food_id,
        nom: entry.nom,
        calories: entry.calories,
        proteines_g: entry.proteines,
        glucides_g: entry.glucides,
        lipides_g: entry.lipides,
      });
    }
  },

  deleteFromSupabase: async (id) => {
    await supabase.from('journal').delete().eq('id', id);
  },
}));
