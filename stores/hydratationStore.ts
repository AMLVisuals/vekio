import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface HydratationState {
  totalMl: number;
  objectifMl: number;
  isLoading: boolean;
  loadToday: () => Promise<void>;
  addWater: (ml: number) => Promise<void>;
  removeWater: (ml: number) => Promise<void>;
  setObjectif: (ml: number) => Promise<void>;
}

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const useHydratationStore = create<HydratationState>((set, get) => ({
  totalMl: 0,
  objectifMl: 2000,
  isLoading: false,

  loadToday: async () => {
    set({ isLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ isLoading: false }); return; }

    const { data } = await supabase
      .from('hydratation')
      .select('total_ml, objectif_ml')
      .eq('user_id', user.id)
      .eq('date', todayString())
      .single();

    if (data) {
      set({ totalMl: data.total_ml, objectifMl: data.objectif_ml });
    } else {
      set({ totalMl: 0 });
    }
    set({ isLoading: false });
  },

  addWater: async (ml) => {
    const newTotal = get().totalMl + ml;
    set({ totalMl: newTotal });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('hydratation')
      .upsert({
        user_id: user.id,
        date: todayString(),
        total_ml: newTotal,
        objectif_ml: get().objectifMl,
      }, { onConflict: 'user_id,date' });
  },

  removeWater: async (ml) => {
    const newTotal = Math.max(0, get().totalMl - ml);
    set({ totalMl: newTotal });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('hydratation')
      .upsert({
        user_id: user.id,
        date: todayString(),
        total_ml: newTotal,
        objectif_ml: get().objectifMl,
      }, { onConflict: 'user_id,date' });
  },

  setObjectif: async (ml) => {
    set({ objectifMl: ml });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('hydratation')
      .upsert({
        user_id: user.id,
        date: todayString(),
        total_ml: get().totalMl,
        objectif_ml: ml,
      }, { onConflict: 'user_id,date' });
  },
}));
