import { create } from 'zustand';

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
  isAuthenticated: boolean;
  setProfile: (profile: UserProfile) => void;
  setIsPro: (isPro: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isAuthenticated: false,

  setProfile: (profile) => set({ profile, isAuthenticated: true }),

  setIsPro: (isPro) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, isPro } : null,
    })),

  logout: () => set({ profile: null, isAuthenticated: false }),
}));
