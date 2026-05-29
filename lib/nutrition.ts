// =============================================================================
// Moteur de calcul des besoins nutritionnels — refonte specs onboarding v2
// =============================================================================
// Formules :
//   - BMR : Mifflin-St Jeor (la reference)
//   - TDEE : facteur d'activite pondere multi-sports
//   - Calories : TDEE +/- ajustement selon vitesse de perte/prise
//   - Proteines : g/kg sur masse maigre si dispo, sinon poids total
//   - Lipides : 25 a 30% des calories selon objectif
//   - Glucides : reste

export type Sexe = 'homme' | 'femme';
export type Objectif = 'perte' | 'maintien' | 'prise';
export type Vitesse = 0.25 | 0.5 | 0.75;
export type SportType = 'musculation' | 'cardio' | 'collectif' | 'martial' | 'yoga' | 'autre' | 'aucun';
export type Frequence = 1 | 2 | 3 | 4 | 5 | 6 | 7; // jours par semaine, valeur exacte
export type Intention = 'bien_etre' | 'silhouette' | 'tonique';
export type PhaseCycle = 'menstruelle' | 'folliculaire' | 'ovulation' | 'luteale';

export interface Sport {
  type: SportType;
  frequence: Frequence;
}

export interface Profile {
  sexe: Sexe;
  age: number;        // calcule a partir de date_naissance
  poids: number;      // kg
  taille: number;     // cm
  objectif: Objectif;
  vitesse?: Vitesse;  // ignore si maintien
  sports: Sport[];
  masseGrassePct?: number; // optionnel — si dispo via Health/balance
  poidsObjectif?: number;  // kg, optionnel — declenche la bascule auto vers maintien
  intention?: Intention;   // motivation (bien-etre / silhouette / tonique)
  // Cycle menstruel (uniquement si sexe = femme et utilisatrice a active le suivi)
  cycleActif?: boolean;
  cycleDernieresRegles?: Date;
  cycleDureeJours?: number; // 21-40, defaut 28
}

export interface MacroObjectifs {
  calories: number;
  proteines_g: number;
  glucides_g: number;
  lipides_g: number;
  // Cibles micros journalieres (refs : ANSES 2016, OMS 2012/2015)
  fibres_g: number;
  sucres_g: number;       // sucres totaux, < pour reference
  ags_g: number;          // AG satures, < pour reference
  cholesterol_mg: number; // reference indicative 300mg
  sodium_mg: number;      // < pour reference, OMS 2g
  calcium_mg: number;
  fer_mg: number;
  potassium_mg: number;
  bmr: number;                  // pour debug/affichage
  tdee: number;                 // pour debug/affichage
  facteurActivite: number;
  calculesSurMasseMaigre: boolean;
  objectifEffectif: Objectif;   // objectif reellement applique (peut differ de profile.objectif)
  objectifAtteint: boolean;     // true si la cible est atteinte (bascule en maintien auto)
  // Cycle menstruel — null si non active
  phaseCycle: PhaseCycle | null;
  jourCycle: number | null;     // jour courant dans le cycle (1..duree)
  bonusCalorieLuteale: number;  // +150 kcal applique si phase=luteale, 0 sinon
}

// Marge de tolerance autour du poids cible avant de basculer en maintien.
// 1 kg couvre les fluctuations naturelles (hydratation, digestion, glycogene).
export const MARGE_OBJECTIF_KG = 1;

// -----------------------------------------------------------------------------
// 1. BMR — Mifflin-St Jeor
// -----------------------------------------------------------------------------
function calcBMR(p: Profile): number {
  const base = 10 * p.poids + 6.25 * p.taille - 5 * p.age;
  return p.sexe === 'homme' ? base + 5 : base - 161;
}

// -----------------------------------------------------------------------------
// 2. Facteur d'activite pondere multi-sports
//    On prend le facteur du sport principal (le plus frequent) puis on ajoute
//    un bonus pour chaque sport secondaire.
// -----------------------------------------------------------------------------
// Facteurs d'activite affines par jour (avant on avait 3 paliers a fourchettes,
// maintenant chaque jour de pratique compte). Calibres pour rester coherents
// avec les paliers Mifflin-St Jeor (1.2 sedentaire ... 1.9 athlete).
const FACTEUR_BASE: Record<Frequence, number> = {
  1: 1.32,
  2: 1.42,
  3: 1.52,
  4: 1.62,
  5: 1.70,
  6: 1.78,
  7: 1.85,
};

// Bonus pour chaque sport secondaire (pondere selon sa propre frequence).
const BONUS_SECONDAIRE: Record<Frequence, number> = {
  1: 0.04,
  2: 0.06,
  3: 0.08,
  4: 0.09,
  5: 0.10,
  6: 0.11,
  7: 0.12,
};

const FACTEUR_AUCUN = 1.2;
// Plafond raisonnable : meme un athlete de haut niveau plafonne autour de 1.9
const FACTEUR_PLAFOND = 1.9;

function calcFacteurActivite(sports: Sport[]): number {
  // Aucun sport ou que "aucun"
  const reels = sports.filter((s) => s.type !== 'aucun');
  if (reels.length === 0) return FACTEUR_AUCUN;

  // Trie par frequence decroissante : le plus frequent = principal
  const sorted = [...reels].sort((a, b) => b.frequence - a.frequence);
  const principal = sorted[0];
  let facteur = FACTEUR_BASE[principal.frequence];

  // Bonus pour chaque sport secondaire
  for (let i = 1; i < sorted.length; i++) {
    facteur += BONUS_SECONDAIRE[sorted[i].frequence];
  }

  return Math.min(facteur, FACTEUR_PLAFOND);
}

// -----------------------------------------------------------------------------
// 3. Ajustement calorique selon vitesse
//    1 kg de gras ≈ 7700 kcal donc 0,25 kg/sem ≈ 275 kcal/jour
// -----------------------------------------------------------------------------
const KCAL_PAR_VITESSE: Record<Vitesse, number> = {
  0.25: 275,
  0.5: 550,
  0.75: 825,
};

function calcAjustementCalorique(objectif: Objectif, vitesse?: Vitesse): number {
  if (objectif === 'maintien') return 0;
  const v = vitesse ?? 0.5;
  const delta = KCAL_PAR_VITESSE[v];
  return objectif === 'perte' ? -delta : +delta;
}

// -----------------------------------------------------------------------------
// 4. Proteines (g)
// Refs : ISSN Position Stand 2017 (Jager et al.), Helms et al. 2014 pour le cut
// -----------------------------------------------------------------------------
function calcProteines(p: Profile): number {
  const faitMusculation = p.sports.some((s) => s.type === 'musculation' && s.frequence >= 1);
  const faitAutreSport = p.sports.some((s) => s.type !== 'musculation' && s.type !== 'aucun');
  const bonusCombine = faitMusculation && faitAutreSport ? 0.2 : 0;

  if (p.masseGrassePct !== undefined && p.masseGrassePct > 0 && p.masseGrassePct < 60) {
    const masseMaigre = p.poids * (1 - p.masseGrassePct / 100);
    let coef = 1.8; // maintien
    if (p.objectif === 'perte') coef = 2.4; // Helms 2014 — cut agressif preserve muscu
    else if (p.objectif === 'prise') coef = 2.4;
    return Math.round((coef + bonusCombine) * masseMaigre);
  }

  // Fallback : sur poids total
  let coef = 1.6; // maintien
  if (p.objectif === 'perte') coef = 2.2; // Helms 2014 sans masse maigre
  else if (p.objectif === 'prise') coef = 2.2;
  return Math.round((coef + bonusCombine) * p.poids);
}

// -----------------------------------------------------------------------------
// 5. Lipides (g) — % des calories totales
// Ref : ANSES 2016 (35-40% AET grand public, 20% mini ISSN pour hormones).
// On uniformise a 30% — compromis sport / sante hormonale.
// -----------------------------------------------------------------------------
function calcLipides(calories: number, p: Profile): number {
  void p;
  const pct = 0.30;
  return Math.round((calories * pct) / 9);
}

// -----------------------------------------------------------------------------
// 5b. Micronutriments — cibles journalieres
// Refs :
//   - ANSES 2016 (Actualisation des references nutritionnelles)
//   - OMS 2012 (sodium <2g), OMS 2015 (sucres libres <10% AET)
// Le cholesterol est affiche a titre indicatif (300 mg, ancien repere USDA).
// -----------------------------------------------------------------------------
interface MicrosCibles {
  fibres_g: number;
  sucres_g: number;
  ags_g: number;
  cholesterol_mg: number;
  sodium_mg: number;
  calcium_mg: number;
  fer_mg: number;
  potassium_mg: number;
}

function calcMicros(p: Profile, calories: number): MicrosCibles {
  // Fibres : 30 g ANSES, 35 g pour sportif (>= 3 jours / sem cumules)
  const totalJoursSport = p.sports.reduce((sum, s) => sum + (s.type !== 'aucun' ? s.frequence : 0), 0);
  const fibres_g = totalJoursSport >= 3 ? 35 : 30;

  // Sucres totaux : OMS <10% AET. Calorie/4 pour passer en g, x 0.10.
  // Note : OMS cible vraiment "sucres libres", pas totaux, mais on utilise ce
  // proxy pour l'affichage (le user verra "sucres < cible").
  const sucres_g = Math.round((calories * 0.10) / 4);

  // AG satures : ANSES <12% AET
  const ags_g = Math.round((calories * 0.12) / 9);

  // Cholesterol : reference indicative 300 mg (pas de limite ANSES recente)
  const cholesterol_mg = 300;

  // Sodium : OMS <2000 mg (= 5 g de sel)
  const sodium_mg = 2000;

  // Calcium : ANSES — 950 mg homme / 1000 mg femme
  const calcium_mg = p.sexe === 'femme' ? 1000 : 950;

  // Fer : ANSES — 11 mg homme / 16 mg femme (perte menstruelle)
  const fer_mg = p.sexe === 'femme' ? 16 : 11;

  // Potassium : ANSES 3500 mg
  const potassium_mg = 3500;

  return { fibres_g, sucres_g, ags_g, cholesterol_mg, sodium_mg, calcium_mg, fer_mg, potassium_mg };
}

// -----------------------------------------------------------------------------
// 5c. Cycle menstruel
// Ref : ACSM/ANSES ne donnent pas de chiffre officiel. Consensus etudes
// (Solomon 1982, Webb 1986, Howe 1993) : depense en phase luteale +100 a +300
// kcal/jour selon individus. On applique +150 kcal — milieu de fourchette.
//
// Decoupage phases (cycle 28j, ajuste si autre duree) :
//   - Menstruelle : jours 1 a 5 (regles)
//   - Folliculaire : jour 6 a (duree - 14)
//   - Ovulation : jour (duree - 13) a (duree - 11) (3 jours)
//   - Luteale : jour (duree - 10) a duree
// -----------------------------------------------------------------------------
const BONUS_LUTEALE_KCAL = 150;

function calcCycle(p: Profile, now: Date = new Date()): { phase: PhaseCycle | null; jour: number | null; bonus: number } {
  if (p.sexe !== 'femme' || !p.cycleActif || !p.cycleDernieresRegles) {
    return { phase: null, jour: null, bonus: 0 };
  }
  const duree = p.cycleDureeJours ?? 28;
  const msPerDay = 24 * 60 * 60 * 1000;
  const joursEcoules = Math.floor((now.getTime() - p.cycleDernieresRegles.getTime()) / msPerDay);
  if (joursEcoules < 0) return { phase: null, jour: null, bonus: 0 };
  const jourCycle = (joursEcoules % duree) + 1; // 1..duree

  let phase: PhaseCycle;
  if (jourCycle <= 5) phase = 'menstruelle';
  else if (jourCycle >= duree - 13 && jourCycle <= duree - 11) phase = 'ovulation';
  else if (jourCycle > duree - 11) phase = 'luteale';
  else phase = 'folliculaire';

  return { phase, jour: jourCycle, bonus: phase === 'luteale' ? BONUS_LUTEALE_KCAL : 0 };
}

export function describePhase(phase: PhaseCycle | null): string {
  switch (phase) {
    case 'menstruelle': return 'Phase menstruelle';
    case 'folliculaire': return 'Phase folliculaire';
    case 'ovulation': return 'Ovulation';
    case 'luteale': return 'Phase lutéale';
    default: return '';
  }
}

// -----------------------------------------------------------------------------
// 6. Bascule automatique selon poids cible
//    - Sans poids cible : on respecte l'objectif declare tel quel.
//    - Perte : on retire des calories tant que poids_actuel > cible + marge.
//      Une fois en zone, bascule maintien automatique.
//    - Prise : symetrique (tant que poids_actuel < cible - marge).
//    - Maintien : reste maintien quoi qu'il arrive.
// -----------------------------------------------------------------------------
export function getEffectiveObjectif(p: Profile): Objectif {
  if (p.objectif === 'maintien') return 'maintien';
  if (p.poidsObjectif === undefined || p.poidsObjectif === null) return p.objectif;

  const ecart = p.poids - p.poidsObjectif;

  if (p.objectif === 'perte') {
    // Encore au-dessus de la cible (au-dela de la marge) -> on continue la perte.
    return ecart > MARGE_OBJECTIF_KG ? 'perte' : 'maintien';
  }
  // Prise : encore sous la cible (au-dela de la marge) -> on continue la prise.
  return ecart < -MARGE_OBJECTIF_KG ? 'prise' : 'maintien';
}

export function isObjectifAtteint(p: Profile): boolean {
  if (p.objectif === 'maintien') return false;
  if (p.poidsObjectif === undefined || p.poidsObjectif === null) return false;
  return getEffectiveObjectif(p) === 'maintien';
}

// -----------------------------------------------------------------------------
// 7. Calcul global
// -----------------------------------------------------------------------------
export function calculateNeeds(p: Profile): MacroObjectifs {
  // On calcule sur la base de l'objectif effectif : si la cible est atteinte,
  // toutes les formules en aval (ajustement, proteines, lipides) basculent
  // automatiquement en mode maintien.
  const objectifEffectif = getEffectiveObjectif(p);
  const objectifAtteint = isObjectifAtteint(p);
  const pEff: Profile = { ...p, objectif: objectifEffectif };

  const bmr = calcBMR(pEff);
  const facteurActivite = calcFacteurActivite(pEff.sports);
  const tdee = bmr * facteurActivite;
  const cycle = calcCycle(pEff);
  // Bonus luteale ajoute APRES l'ajustement objectif : la depense reelle
  // augmente, donc en perte le deficit reste constant en valeur absolue.
  const calories = Math.round(tdee + calcAjustementCalorique(pEff.objectif, pEff.vitesse) + cycle.bonus);

  const proteines_g = calcProteines(pEff);
  const lipides_g = calcLipides(calories, pEff);

  // Glucides = reste des calories
  const caloriesProteines = proteines_g * 4;
  const caloriesLipides = lipides_g * 9;
  const caloriesGlucides = Math.max(0, calories - caloriesProteines - caloriesLipides);
  const glucides_g = Math.round(caloriesGlucides / 4);

  const micros = calcMicros(pEff, calories);

  return {
    calories,
    proteines_g,
    glucides_g,
    lipides_g,
    ...micros,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    facteurActivite: Math.round(facteurActivite * 100) / 100,
    calculesSurMasseMaigre: pEff.masseGrassePct !== undefined && pEff.masseGrassePct > 0 && pEff.masseGrassePct < 60,
    objectifEffectif,
    objectifAtteint,
    phaseCycle: cycle.phase,
    jourCycle: cycle.jour,
    bonusCalorieLuteale: cycle.bonus,
  };
}

// -----------------------------------------------------------------------------
// 8. Helper : detecter une incoherence intention <-> sports
//    L'intention "tonique" (construire du muscle) sans aucune musculation
//    declaree dans les sports est un signal qu'on devrait alerter l'utilisateur.
// -----------------------------------------------------------------------------
export function detecteIncoherenceIntention(intention: Intention | undefined, sports: Sport[]): boolean {
  if (intention !== 'tonique') return false;
  return !sports.some((s) => s.type === 'musculation');
}

// -----------------------------------------------------------------------------
// 9. Helper : suggestion de poids cible selon l'intention et le poids actuel
//    Sert a pre-remplir intelligemment le ScrollPicker dans l'onboarding.
// -----------------------------------------------------------------------------
export function suggererPoidsCible(poidsActuel: number, objectif: Objectif, intention?: Intention): number {
  if (objectif === 'maintien') return poidsActuel;

  if (objectif === 'perte') {
    // Silhouette/affiner : ~10% de perte. Bien-etre : 5%. Tonique : 5% (la
    // recomposition compte plus que la perte pure).
    const pct = intention === 'silhouette' ? 0.10 : 0.05;
    return Math.round((poidsActuel * (1 - pct)) * 10) / 10;
  }

  // Prise : tonique vise davantage de masse, bien-etre/silhouette restent modestes.
  const pct = intention === 'tonique' ? 0.07 : 0.04;
  return Math.round((poidsActuel * (1 + pct)) * 10) / 10;
}

// -----------------------------------------------------------------------------
// Helper : calcul de l'age a partir d'une date de naissance
// -----------------------------------------------------------------------------
export function calculateAge(dateNaissance: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateNaissance.getFullYear();
  const m = today.getMonth() - dateNaissance.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateNaissance.getDate())) age--;
  return age;
}
