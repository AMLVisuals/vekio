import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { calculateNeeds, type Profile, type MacroObjectifs, type Sport, type Vitesse, type Intention } from '../lib/nutrition';
import { scheduleWeeklyWeighIn } from '../lib/notifications';

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
  poids_objectif: number | null;
  intention: Intention | null;
  objectif_atteint_le: string | null;
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
  poids_objectif?: number | null;
  intention?: Intention | null;
}

// Resultat du recalcul apres une pesee : indique si on vient juste de basculer
// dans la zone "objectif atteint" (pour declencher le modal de celebration une seule fois).
export interface RecalcResult {
  celebrate: boolean;
  macros: MacroObjectifs;
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
  // Recalcule les macros apres une nouvelle pesee, met a jour profiles.poids,
  // detecte la premiere bascule "objectif atteint" et persist tout en DB.
  recalculateAfterWeight: (nouveauPoids: number) => Promise<RecalcResult>;
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
        poids_objectif: profileData.poids_objectif !== null && profileData.poids_objectif !== undefined ? Number(profileData.poids_objectif) : null,
        intention: (profileData.intention as Intention | null) ?? null,
        objectif_atteint_le: profileData.objectif_atteint_le ?? null,
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
            objectifEffectif: profileData.objectif,
            objectifAtteint: profileData.objectif_atteint_le !== null,
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

    // Calcul des macros (avant sauvegarde profil, pour pouvoir poser
    // objectif_atteint_le si la cible est deja atteinte des l'onboarding).
    const profileForCalc: Profile = {
      sexe: data.sexe,
      age: data.age,
      poids: data.poids,
      taille: data.taille,
      objectif: data.objectif,
      vitesse,
      sports: data.sports,
      masseGrassePct: data.masse_grasse_pct,
      poidsObjectif: data.poids_objectif ?? undefined,
      intention: data.intention ?? undefined,
    };
    const macros = calculateNeeds(profileForCalc);

    const objectifAtteintLe = macros.objectifAtteint
      ? new Date().toISOString().split('T')[0]
      : null;

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
        poids_objectif: data.poids_objectif ?? null,
        intention: data.intention ?? null,
        objectif_atteint_le: objectifAtteintLe,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (profileError) throw profileError;

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
        poids_objectif: data.poids_objectif ?? null,
        intention: data.intention ?? null,
        objectif_atteint_le: objectifAtteintLe,
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
    // Reprogramme la notification hebdo. Si la permission n'a pas ete accordee,
    // l'appel echoue silencieusement — pas un probleme bloquant.
    try {
      await scheduleWeeklyWeighIn(jour, heure);
    } catch (e) {
      console.warn('Notif hebdo non programmee', e);
    }
  },

  // -------------------------------------------------------------------------
  // Recalcul apres pesee : a appeler chaque fois qu'une nouvelle pesee est
  // ajoutee. Met a jour profile.poids, recalcule les macros via le moteur
  // (qui gere la bascule auto vers maintien quand la cible est atteinte) et
  // persist tout en DB. Renvoie celebrate=true uniquement la premiere fois
  // que l'utilisateur entre dans la zone "objectif atteint" — pour declencher
  // le modal de celebration une seule fois.
  // -------------------------------------------------------------------------
  recalculateAfterWeight: async (nouveauPoids: number): Promise<RecalcResult> => {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = get().profile;
    if (!user || !profile) {
      throw new Error('Profil non charge');
    }

    const vitesse: Vitesse | undefined =
      profile.vitesse_kg_semaine === 0.25 || profile.vitesse_kg_semaine === 0.5 || profile.vitesse_kg_semaine === 0.75
        ? profile.vitesse_kg_semaine : undefined;

    const profileForCalc: Profile = {
      sexe: profile.sexe,
      age: profile.age,
      poids: nouveauPoids,
      taille: profile.taille,
      objectif: profile.objectif,
      vitesse,
      sports: profile.sports,
      masseGrassePct: profile.masse_grasse_pct,
      poidsObjectif: profile.poids_objectif ?? undefined,
      intention: profile.intention ?? undefined,
    };
    const macros = calculateNeeds(profileForCalc);

    // Premiere bascule en zone objectif atteint (objectif_atteint_le encore null)
    const wasAlreadyAtteint = profile.objectif_atteint_le !== null;
    const celebrate = macros.objectifAtteint && !wasAlreadyAtteint;
    const objectifAtteintLe = celebrate
      ? new Date().toISOString().split('T')[0]
      : profile.objectif_atteint_le;

    // Persist profil (poids + flag celebration eventuel)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        poids: nouveauPoids,
        objectif_atteint_le: objectifAtteintLe,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    if (profileError) throw profileError;

    // Persist macros recalcules
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

    set((s) => ({
      profile: s.profile
        ? { ...s.profile, poids: nouveauPoids, objectif_atteint_le: objectifAtteintLe }
        : null,
      macros,
    }));

    return { celebrate, macros };
  },
}));
