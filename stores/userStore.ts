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
  jour_pesee_hebdo: number;
  heure_notification_pesee: string;
  intro_seen: Record<string, boolean>;
  isPro: boolean;
  // Cycle menstruel (uniquement si sexe = femme)
  cycle_actif: boolean;
  cycle_dernieres_regles: string | null; // ISO date YYYY-MM-DD
  cycle_duree_jours: number;
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
  cycle_actif?: boolean;
  cycle_dernieres_regles?: string | null;
  cycle_duree_jours?: number;
}

// Resultat du recalcul apres une pesee : indique si on vient juste de basculer
// dans la zone "objectif atteint" (pour declencher le modal de celebration une seule fois).
export interface RecalcResult {
  celebrate: boolean;
  macros: MacroObjectifs;
}

export type MacrosMode = 'auto' | 'manuel';

interface UserState {
  profile: UserProfile | null;
  macros: MacroObjectifs | null;
  // 'auto' : recalcul automatique a chaque pesee selon le profil.
  // 'manuel' : valeurs figees, la pesee met juste a jour le poids.
  macrosMode: MacrosMode;
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
  // Si macrosMode='manuel', seul le poids est mis a jour, les macros restent.
  recalculateAfterWeight: (nouveauPoids: number) => Promise<RecalcResult>;
  // Sauvegarde des macros saisies a la main + bascule en mode 'manuel'.
  saveMacrosManual: (m: { calories: number; proteines_g: number; glucides_g: number; lipides_g: number }) => Promise<void>;
  // Recalcule les macros depuis le profil + bascule en mode 'auto'.
  resetMacrosToAuto: () => Promise<MacroObjectifs>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  macros: null,
  macrosMode: 'auto',
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
        jour_pesee_hebdo: profileData.jour_pesee_hebdo ?? 1,
        heure_notification_pesee: (profileData.heure_notification_pesee as string)?.slice(0, 5) ?? '09:00',
        intro_seen: (profileData.intro_seen as Record<string, boolean>) ?? {},
        isPro: profileData.is_pro ?? false,
        cycle_actif: profileData.cycle_actif ?? false,
        cycle_dernieres_regles: profileData.cycle_dernieres_regles ?? null,
        cycle_duree_jours: profileData.cycle_duree_jours ?? 28,
      },
      macros: macrosData
        ? {
            calories: Number(macrosData.calories),
            proteines_g: Number(macrosData.proteines_g),
            glucides_g: Number(macrosData.glucides_g),
            lipides_g: Number(macrosData.lipides_g),
            // Si non persistes (anciens users), 0 — seront recalcules au prochain
            // saveProfile/resetMacrosToAuto/recalculateAfterWeight.
            fibres_g: Number(macrosData.fibres_g ?? 0),
            sucres_g: Number(macrosData.sucres_g ?? 0),
            ags_g: Number(macrosData.ags_g ?? 0),
            cholesterol_mg: Number(macrosData.cholesterol_mg ?? 0),
            sodium_mg: Number(macrosData.sodium_mg ?? 0),
            calcium_mg: Number(macrosData.calcium_mg ?? 0),
            fer_mg: Number(macrosData.fer_mg ?? 0),
            potassium_mg: Number(macrosData.potassium_mg ?? 0),
            bmr: 0,
            tdee: 0,
            facteurActivite: 0,
            calculesSurMasseMaigre: macrosData.calculees_sur_masse_maigre ?? false,
            objectifEffectif: profileData.objectif,
            objectifAtteint: profileData.objectif_atteint_le !== null,
            phaseCycle: null,
            jourCycle: null,
            bonusCalorieLuteale: 0,
          }
        : null,
      macrosMode: (macrosData?.macros_mode as MacrosMode) ?? 'auto',
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
      cycleActif: data.cycle_actif ?? false,
      cycleDernieresRegles: data.cycle_dernieres_regles ? new Date(data.cycle_dernieres_regles) : undefined,
      cycleDureeJours: data.cycle_duree_jours ?? 28,
    };
    const macros = calculateNeeds(profileForCalc);

    // On ne pose PAS objectif_atteint_le a l'inscription, meme si la cible
    // est deja techniquement atteinte. La celebration aura lieu lors de la
    // premiere pesee dans la zone — c'est plus marquant et plus juste UX.
    const objectifAtteintLe = null;

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
        cycle_actif: data.cycle_actif ?? false,
        cycle_dernieres_regles: data.cycle_dernieres_regles ?? null,
        cycle_duree_jours: data.cycle_duree_jours ?? 28,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (profileError) throw profileError;

    // L'edition du profil repasse en mode auto : si l'utilisateur change son
    // poids/sport/objectif il s'attend a ce que les macros se recalibrent.
    const { error: macrosError } = await supabase
      .from('objectifs_macros')
      .upsert({
        user_id: user.id,
        calories: macros.calories,
        proteines_g: macros.proteines_g,
        glucides_g: macros.glucides_g,
        lipides_g: macros.lipides_g,
        fibres_g: macros.fibres_g,
        sucres_g: macros.sucres_g,
        ags_g: macros.ags_g,
        cholesterol_mg: macros.cholesterol_mg,
        sodium_mg: macros.sodium_mg,
        calcium_mg: macros.calcium_mg,
        fer_mg: macros.fer_mg,
        potassium_mg: macros.potassium_mg,
        calculees_sur_masse_maigre: macros.calculesSurMasseMaigre,
        macros_mode: 'auto',
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
        jour_pesee_hebdo: 1,
        heure_notification_pesee: '09:00',
        intro_seen: {},
        cycle_actif: data.cycle_actif ?? false,
        cycle_dernieres_regles: data.cycle_dernieres_regles ?? null,
        cycle_duree_jours: data.cycle_duree_jours ?? 28,
      },
      macros,
      macrosMode: 'auto',
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
    // Mise a jour locale du profil pour que les pop-ups d'intro pre-remplissent
    // avec les valeurs courantes.
    set((s) => ({
      profile: s.profile
        ? { ...s.profile, jour_pesee_hebdo: jour, heure_notification_pesee: heure }
        : null,
    }));
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
    const mode = get().macrosMode;
    const currentMacros = get().macros;
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
      cycleActif: profile.cycle_actif,
      cycleDernieresRegles: profile.cycle_dernieres_regles ? new Date(profile.cycle_dernieres_regles) : undefined,
      cycleDureeJours: profile.cycle_duree_jours,
    };
    // En mode 'manuel' on respecte les macros saisies par l'utilisateur :
    // la pesee met juste a jour le poids et le flag celebration.
    const macros = mode === 'manuel' && currentMacros ? currentMacros : calculateNeeds(profileForCalc);

    // Premiere bascule en zone objectif atteint (objectif_atteint_le encore null).
    // On calcule la bascule meme en mode manuel : c'est un evenement profil, pas macros.
    const macrosForCelebration = calculateNeeds(profileForCalc);
    const wasAlreadyAtteint = profile.objectif_atteint_le !== null;
    const celebrate = macrosForCelebration.objectifAtteint && !wasAlreadyAtteint;
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

    // Persist macros uniquement en mode auto (sinon on ne touche pas a la ligne)
    if (mode === 'auto') {
      const { error: macrosError } = await supabase
        .from('objectifs_macros')
        .upsert({
          user_id: user.id,
          calories: macros.calories,
          proteines_g: macros.proteines_g,
          glucides_g: macros.glucides_g,
          lipides_g: macros.lipides_g,
          fibres_g: macros.fibres_g,
          sucres_g: macros.sucres_g,
          ags_g: macros.ags_g,
          cholesterol_mg: macros.cholesterol_mg,
          sodium_mg: macros.sodium_mg,
          calcium_mg: macros.calcium_mg,
          fer_mg: macros.fer_mg,
          potassium_mg: macros.potassium_mg,
          calculees_sur_masse_maigre: macros.calculesSurMasseMaigre,
          macros_mode: 'auto',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (macrosError) throw macrosError;
    }

    set((s) => ({
      profile: s.profile
        ? { ...s.profile, poids: nouveauPoids, objectif_atteint_le: objectifAtteintLe }
        : null,
      macros,
    }));

    return { celebrate, macros };
  },

  // -------------------------------------------------------------------------
  // Sauvegarde manuelle des macros : passe en mode 'manuel'
  // -------------------------------------------------------------------------
  saveMacrosManual: async (m) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Non connecté');
    const { error } = await supabase
      .from('objectifs_macros')
      .upsert({
        user_id: user.id,
        calories: m.calories,
        proteines_g: m.proteines_g,
        glucides_g: m.glucides_g,
        lipides_g: m.lipides_g,
        macros_mode: 'manuel',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (error) throw error;
    set((s) => ({
      macros: s.macros ? { ...s.macros, ...m } : {
        ...m,
        fibres_g: 0, sucres_g: 0, ags_g: 0,
        cholesterol_mg: 0, sodium_mg: 0, calcium_mg: 0,
        fer_mg: 0, potassium_mg: 0,
        bmr: 0, tdee: 0, facteurActivite: 0,
        calculesSurMasseMaigre: false,
        objectifEffectif: 'maintien',
        objectifAtteint: false,
        phaseCycle: null,
        jourCycle: null,
        bonusCalorieLuteale: 0,
      },
      macrosMode: 'manuel',
    }));
  },

  // -------------------------------------------------------------------------
  // Reset des macros au calcul automatique a partir du profil courant
  // -------------------------------------------------------------------------
  resetMacrosToAuto: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const profile = get().profile;
    if (!user || !profile) throw new Error('Profil non charge');

    const vitesse: Vitesse | undefined =
      profile.vitesse_kg_semaine === 0.25 || profile.vitesse_kg_semaine === 0.5 || profile.vitesse_kg_semaine === 0.75
        ? profile.vitesse_kg_semaine : undefined;
    const profileForCalc: Profile = {
      sexe: profile.sexe,
      age: profile.age,
      poids: profile.poids,
      taille: profile.taille,
      objectif: profile.objectif,
      vitesse,
      sports: profile.sports,
      masseGrassePct: profile.masse_grasse_pct,
      poidsObjectif: profile.poids_objectif ?? undefined,
      intention: profile.intention ?? undefined,
      cycleActif: profile.cycle_actif,
      cycleDernieresRegles: profile.cycle_dernieres_regles ? new Date(profile.cycle_dernieres_regles) : undefined,
      cycleDureeJours: profile.cycle_duree_jours,
    };
    const macros = calculateNeeds(profileForCalc);

    const { error } = await supabase
      .from('objectifs_macros')
      .upsert({
        user_id: user.id,
        calories: macros.calories,
        proteines_g: macros.proteines_g,
        glucides_g: macros.glucides_g,
        lipides_g: macros.lipides_g,
        fibres_g: macros.fibres_g,
        sucres_g: macros.sucres_g,
        ags_g: macros.ags_g,
        cholesterol_mg: macros.cholesterol_mg,
        sodium_mg: macros.sodium_mg,
        calcium_mg: macros.calcium_mg,
        fer_mg: macros.fer_mg,
        potassium_mg: macros.potassium_mg,
        calculees_sur_masse_maigre: macros.calculesSurMasseMaigre,
        macros_mode: 'auto',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (error) throw error;
    set({ macros, macrosMode: 'auto' });
    return macros;
  },
}));
