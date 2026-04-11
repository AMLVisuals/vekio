import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface WeightEntry {
  date: string;
  poids_kg: number;
}

interface WeightState {
  history: WeightEntry[];
  isLoading: boolean;
  loadHistory: () => Promise<void>;
  addWeight: (poids_kg: number, date?: string) => Promise<void>;
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
      .select('date, poids_kg')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (data) {
      set({
        history: data.map((row) => ({
          date: row.date,
          poids_kg: Number(row.poids_kg),
        })),
      });
    }
    set({ isLoading: false });
  },

  addWeight: async (poids_kg, date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const d = date ?? todayString();

    await supabase
      .from('poids_historique')
      .upsert({
        user_id: user.id,
        date: d,
        poids_kg,
      }, { onConflict: 'user_id,date' });

    await get().loadHistory();
  },
}));
