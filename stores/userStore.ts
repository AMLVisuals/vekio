import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { calculateNeeds, type Profile, type MacroObjectifs } from '../lib/nutrition';

interface UserProfile {
  id: string;
  email: string;
  nom: string;
  age: number;
  poids: number;
  taille: number;
  sexe: 'homme' | 'femme';
  activite: 'sedentaire' | 'leger' | 'modere' | 'actif' | 'tres_actif';
  objectif: 'perte' | 'maintien' | 'prise';
  isPro: boolean;
}

interface UserState {
  profile: UserProfile | null;
  macros: MacroObjectifs | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;

  setProfile: (profile: UserProfile) => void;
  setMacros: (macros: MacroObjectifs) => void;
  setIsPro: (isPro: boolean) => void;
  logout: () => void;

  // Supabase
  checkSession: () => Promise<void>;
  loadProfile: (userId: string) => Promise<boolean>;
  saveProfile: (data: Omit<UserProfile, 'id' | 'email' | 'isPro'>) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  macros: null,
  isAuthenticated: false,
  isLoading: true,
  hasCompletedOnboarding: false,

  setProfile: (profile) => set({ profile, isAuthenticated: true }),
  setMacros: (macros) => set({ macros }),

  setIsPro: (isPro) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, isPro } : null,
    })),

  logout: async () => {
    await supabase.auth.signOut();
    set({ profile: null, macros: null, isAuthenticated: false, hasCompletedOnboarding: false });
  },

  checkSession: async () => {
    set({ isLoading: true });
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const hasProfile = await get().loadProfile(session.user.id);
      set({
        isAuthenticated: true,
        hasCompletedOnboarding: hasProfile,
        isLoading: false,
      });
    } else {
      set({ isAuthenticated: false, isLoading: false, hasCompletedOnboarding: false });
    }
  },

  loadProfile: async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profileData) return false;

    const { data: macrosData } = await supabase
      .from('objectifs_macros')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: { user } } = await supabase.auth.getUser();

    set({
      profile: {
        id: userId,
        email: user?.email ?? '',
        nom: profileData.nom ?? '',
        age: profileData.age,
        poids: Number(profileData.poids),
        taille: Number(profileData.taille),
        sexe: profileData.sexe,
        activite: profileData.activite,
        objectif: profileData.objectif,
        isPro: profileData.is_pro ?? false,
      },
      macros: macrosData
        ? {
            calories: Number(macrosData.calories),
            proteines_g: Number(macrosData.proteines_g),
            glucides_g: Number(macrosData.glucides_g),
            lipides_g: Number(macrosData.lipides_g),
          }
        : null,
    });

    return true;
  },

  saveProfile: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non connecté');

    // Sauvegarder le profil
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        nom: data.nom,
        age: data.age,
        poids: data.poids,
        taille: data.taille,
        sexe: data.sexe,
        activite: data.activite,
        objectif: data.objectif,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (profileError) throw profileError;

    // Calculer et sauvegarder les macros
    const profileForCalc: Profile = {
      sexe: data.sexe,
      age: data.age,
      poids: data.poids,
      taille: data.taille,
      activite: data.activite,
      objectif: data.objectif,
    };
    const macros = calculateNeeds(profileForCalc);

    const { error: macrosError } = await supabase
      .from('objectifs_macros')
      .upsert({
        user_id: user.id,
        calories: macros.calories,
        proteines_g: macros.proteines_g,
        glucides_g: macros.glucides_g,
        lipides_g: macros.lipides_g,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (macrosError) throw macrosError;

    set({
      profile: {
        id: user.id,
        email: user.email ?? '',
        isPro: false,
        ...data,
      },
      macros,
      hasCompletedOnboarding: true,
    });
  },
}));
