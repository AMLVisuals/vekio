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
  // Micronutriments (0 si la source ne les fournit pas)
  fibres: number;
  sucres: number;
  ags: number;
  cholesterol: number;
  sodium: number;
  calcium: number;
  fer: number;
  potassium: number;
  repas: MealType;
}

interface JournalState {
  date: string;
  entries: JournalEntry[];
  isLoading: boolean;
  setDate: (date: string) => void;
  goToToday: () => void;
  shiftDay: (delta: number) => void;
  isToday: () => boolean;
  addEntry: (entry: JournalEntry) => void;
  removeEntry: (id: string) => void;
  loadFromCache: (date: string) => void;
  loadFromSupabase: () => Promise<void>;
  syncEntryToSupabase: (entry: JournalEntry) => Promise<void>;
  deleteFromSupabase: (id: string) => Promise<void>;
}

// Date du jour au format "YYYY-MM-DD".
export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Decale une date "YYYY-MM-DD" de `delta` jours, sans glissement de fuseau
// (on raisonne en UTC, la meme base que todayString).
export function addDaysISO(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().split('T')[0];
}

export const useJournalStore = create<JournalState>((set, get) => ({
  date: todayString(),
  entries: [],
  isLoading: false,

  setDate: (date) => {
    // On vide les entrees affichees le temps du chargement de la nouvelle
    // journee, pour ne jamais melanger deux jours a l'ecran.
    set({ date, entries: [] });
    get().loadFromCache(date);
    get().loadFromSupabase();
  },

  // Revient a la journee en cours. Indispensable car le store est cree une
  // seule fois au lancement : si l'app reste ouverte (ou en arriere-plan)
  // jusqu'au lendemain, `date` resterait figee sur hier.
  goToToday: () => {
    const today = todayString();
    if (get().date !== today) get().setDate(today);
    else get().loadFromSupabase();
  },

  // Navigue de `delta` jours (ex: -1 = veille, +1 = lendemain). On n'autorise
  // jamais d'aller dans le futur.
  shiftDay: (delta) => {
    const target = addDaysISO(get().date, delta);
    if (target > todayString()) return;
    get().setDate(target);
  },

  isToday: () => get().date === todayString(),

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
    const date = get().date;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ isLoading: false }); return; }

    const { data } = await supabase
      .from('journal')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
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
        fibres: Number(row.fibres_g ?? 0),
        sucres: Number(row.sucres_g ?? 0),
        ags: Number(row.ags_g ?? 0),
        cholesterol: Number(row.cholesterol_mg ?? 0),
        sodium: Number(row.sodium_mg ?? 0),
        calcium: Number(row.calcium_mg ?? 0),
        fer: Number(row.fer_mg ?? 0),
        potassium: Number(row.potassium_mg ?? 0),
        repas: row.repas as MealType,
      }));
      // Si l'utilisateur a change de jour pendant la requete, on ignore cette
      // reponse (elle concerne un autre jour) pour ne pas melanger les ecrans.
      if (get().date === date) {
        set({ entries });
        cacheSet(journalCacheKey(date), entries);
      }
    }
    if (get().date === date) set({ isLoading: false });
  },

  syncEntryToSupabase: async (entry) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: jErr } = await supabase.from('journal').insert({
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
      fibres_g: entry.fibres,
      sucres_g: entry.sucres,
      ags_g: entry.ags,
      cholesterol_mg: entry.cholesterol,
      sodium_mg: entry.sodium,
      calcium_mg: entry.calcium,
      fer_mg: entry.fer,
      potassium_mg: entry.potassium,
    });
    // Si l'enregistrement echoue, on le log (sans popup, sans bloquer l'UI).
    if (jErr) console.error('journal insert error', jErr);

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
        fibres_g: entry.fibres,
        sucres_g: entry.sucres,
        ags_g: entry.ags,
        cholesterol_mg: entry.cholesterol,
        sodium_mg: entry.sodium,
        calcium_mg: entry.calcium,
        fer_mg: entry.fer,
        potassium_mg: entry.potassium,
      });
    }
  },

  deleteFromSupabase: async (id) => {
    await supabase.from('journal').delete().eq('id', id);
  },
}));
