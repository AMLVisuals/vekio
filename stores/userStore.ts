import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { calculateNeeds, type Profile, type MacroObjectifs, type Sport, type Vitesse } from '../lib/nutrition';

interface UserProfile {
  id: string;
  email: string;
  nom: string;
  age: number;
  poids: number;
  taille: number;
  sexe: 'homme' | 'femme';
  objectif: 'perte' | 'maintien' | 'prise';
  vitesse_kg_semaine: number | null;
  date_naissance: string | null;
  sports: Sport[];
  masse_grasse_pct?: number;
  masse_musculaire_pct?: number;
  masse_hydrique_pct?: number;
  intro_seen: Record<string, boolean>;
  isPro: boolean;
}

interface SaveProfileInput {
  nom: string;
  age: number;
  poids: number;
  taille: number;
  sexe: 'homme' | 'femme';
  objectif: 'perte' | 'maintien' | 'prise';
  vitesse_kg_semaine: number | null;
  date_naissance: string | null;
  sports: Sport[];
  masse_grasse_pct?: number;
  masse_musculaire_pct?: number;
  masse_hydrique_pct?: number;
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
  markIntroSeen: (tab: string) => Promise<void>;

  checkSession: () => Promise<void>;
  loadProfile: (userId: string) => Promise<boolean>;
  saveProfile: (data: SaveProfileInput) => Promise<void>;
  setPeseeSchedule: (jour: number, heure: string) => Promise<void>;
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

    const sports: Sport[] = Array.isArray(profileData.sports) ? profileData.sports : [];

    set({
      profile: {
        id: userId,
        email: user?.email ?? '',
        nom: profileData.nom ?? '',
        age: profileData.age,
        poids: Number(profileData.poids),
        taille: Number(profileData.taille),
        sexe: profileData.sexe,
        objectif: profileData.objectif,
        vitesse_kg_semaine: profileData.vitesse_kg_semaine !== null ? Number(profileData.vitesse_kg_semaine) : null,
        date_naissance: profileData.date_naissance ?? null,
        sports,
        masse_grasse_pct: profileData.masse_grasse_pct !== null ? Number(profileData.masse_grasse_pct) : undefined,
        masse_musculaire_pct: profileData.masse_musculaire_pct !== null ? Number(profileData.masse_musculaire_pct) : undefined,
        masse_hydrique_pct: profileData.masse_hydrique_pct !== null ? Number(profileData.masse_hydrique_pct) : undefined,
        intro_seen: (profileData.intro_seen as Record<string, boolean>) ?? {},
        isPro: profileData.is_pro ?? false,
      },
      macros: macrosData
        ? {
            calories: Number(macrosData.calories),
            proteines_g: Number(macrosData.proteines_g),
            glucides_g: Number(macrosData.glucides_g),
            lipides_g: Number(macrosData.lipides_g),
            bmr: 0,
            tdee: 0,
            facteurActivite: 0,
            calculesSurMasseMaigre: macrosData.calculees_sur_masse_maigre ?? false,
          }
        : null,
    });

    return true;
  },

  saveProfile: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non connecté');

    const vitesse: Vitesse | undefined =
      data.vitesse_kg_semaine === 0.25 || data.vitesse_kg_semaine === 0.5 || data.vitesse_kg_semaine === 0.75
        ? data.vitesse_kg_semaine : undefined;

    // Sauvegarde profil
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        nom: data.nom,
        age: data.age,
        poids: data.poids,
        taille: data.taille,
        sexe: data.sexe,
        objectif: data.objectif,
        vitesse_kg_semaine: data.vitesse_kg_semaine,
        date_naissance: data.date_naissance,
        sports: data.sports,
        masse_grasse_pct: data.masse_grasse_pct ?? null,
        masse_musculaire_pct: data.masse_musculaire_pct ?? null,
        masse_hydrique_pct: data.masse_hydrique_pct ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (profileError) throw profileError;

    // Calcul des macros
    const profileForCalc: Profile = {
      sexe: data.sexe,
      age: data.age,
      poids: data.poids,
      taille: data.taille,
      objectif: data.objectif,
      vitesse,
      sports: data.sports,
      masseGrassePct: data.masse_grasse_pct,
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
        calculees_sur_masse_maigre: macros.calculesSurMasseMaigre,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (macrosError) throw macrosError;

    set({
      profile: {
        id: user.id,
        email: user.email ?? '',
        isPro: false,
        nom: data.nom,
        age: data.age,
        poids: data.poids,
        taille: data.taille,
        sexe: data.sexe,
        objectif: data.objectif,
        vitesse_kg_semaine: data.vitesse_kg_semaine,
        date_naissance: data.date_naissance,
        sports: data.sports,
        masse_grasse_pct: data.masse_grasse_pct,
        masse_musculaire_pct: data.masse_musculaire_pct,
        masse_hydrique_pct: data.masse_hydrique_pct,
        intro_seen: {},
      },
      macros,
      hasCompletedOnboarding: true,
    });
  },

  // -------------------------------------------------------------------------
  // Marquer un onglet comme "intro vue" (pour ne plus afficher le pop-up)
  // -------------------------------------------------------------------------
  markIntroSeen: async (tab: string) => {
    const current = get().profile?.intro_seen ?? {};
    const next = { ...current, [tab]: true };
    set((s) => ({ profile: s.profile ? { ...s.profile, intro_seen: next } : null }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ intro_seen: next })
      .eq('user_id', user.id);
  },

  // -------------------------------------------------------------------------
  // Configurer le jour et l'heure de la pesee hebdomadaire
  // -------------------------------------------------------------------------
  setPeseeSchedule: async (jour: number, heure: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ jour_pesee_hebdo: jour, heure_notification_pesee: heure })
      .eq('user_id', user.id);
  },
}));
