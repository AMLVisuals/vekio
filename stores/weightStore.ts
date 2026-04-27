import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface WeightEntry {
  date: string;
  poids_kg: number;
  masse_grasse_pct?: number;
  masse_musculaire_pct?: number;
  masse_hydrique_pct?: number;
  source?: 'manuel' | 'health';
}

export interface AddWeightInput {
  poids_kg: number;
  date?: string;
  masse_grasse_pct?: number;
  masse_musculaire_pct?: number;
  masse_hydrique_pct?: number;
  source?: 'manuel' | 'health';
}

interface WeightState {
  history: WeightEntry[];
  isLoading: boolean;
  loadHistory: () => Promise<void>;
  addWeight: (input: AddWeightInput) => Promise<void>;
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const useWeightStore = create<WeightState>((set, get) => ({
  history: [],
  isLoading: false,

  loadHistory: async () => {
    set({ isLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ isLoading: false }); return; }

    const { data } = await supabase
      .from('poids_historique')
      .select('date, poids_kg, masse_grasse_pct, masse_musculaire_pct, masse_hydrique_pct, source')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (data) {
      set({
        history: data.map((row) => ({
          date: row.date,
          poids_kg: Number(row.poids_kg),
          masse_grasse_pct: row.masse_grasse_pct !== null ? Number(row.masse_grasse_pct) : undefined,
          masse_musculaire_pct: row.masse_musculaire_pct !== null ? Number(row.masse_musculaire_pct) : undefined,
          masse_hydrique_pct: row.masse_hydrique_pct !== null ? Number(row.masse_hydrique_pct) : undefined,
          source: row.source ?? 'manuel',
        })),
      });
    }
    set({ isLoading: false });
  },

  addWeight: async (input) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const date = input.date ?? todayString();

    await supabase
      .from('poids_historique')
      .upsert({
        user_id: user.id,
        date,
        poids_kg: input.poids_kg,
        masse_grasse_pct: input.masse_grasse_pct ?? null,
        masse_musculaire_pct: input.masse_musculaire_pct ?? null,
        masse_hydrique_pct: input.masse_hydrique_pct ?? null,
        source: input.source ?? 'manuel',
      }, { onConflict: 'user_id,date' });

    await get().loadHistory();
  },
}));
