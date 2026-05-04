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
}

export interface MacroObjectifs {
  calories: number;
  proteines_g: number;
  glucides_g: number;
  lipides_g: number;
  bmr: number;                  // pour debug/affichage
  tdee: number;                 // pour debug/affichage
  facteurActivite: number;
  calculesSurMasseMaigre: boolean;
  objectifEffectif: Objectif;   // objectif reellement applique (peut differ de profile.objectif)
  objectifAtteint: boolean;     // true si la cible est atteinte (bascule en maintien auto)
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
// -----------------------------------------------------------------------------
function calcProteines(p: Profile): number {
  const faitMusculation = p.sports.some((s) => s.type === 'musculation' && s.frequence >= 1);
  const faitAutreSport = p.sports.some((s) => s.type !== 'musculation' && s.type !== 'aucun');
  const bonusCombine = faitMusculation && faitAutreSport ? 0.2 : 0;

  if (p.masseGrassePct !== undefined && p.masseGrassePct > 0 && p.masseGrassePct < 60) {
    const masseMaigre = p.poids * (1 - p.masseGrassePct / 100);
    let coef = 1.8; // maintien
    if (p.objectif === 'perte') coef = 2.2;
    else if (p.objectif === 'prise') coef = 2.4;
    return Math.round((coef + bonusCombine) * masseMaigre);
  }

  // Fallback : sur poids total
  let coef = 1.6; // maintien
  if (p.objectif === 'perte') coef = 2.0;
  else if (p.objectif === 'prise') coef = 2.2;
  return Math.round((coef + bonusCombine) * p.poids);
}

// -----------------------------------------------------------------------------
// 5. Lipides (g) — % des calories totales
// -----------------------------------------------------------------------------
function calcLipides(calories: number, p: Profile): number {
  let pct = 0.28; // maintien / perte moderee
  if (p.objectif === 'perte' && p.vitesse === 0.75) pct = 0.25;
  if (p.objectif === 'prise') pct = 0.30;
  return Math.round((calories * pct) / 9);
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
  const calories = Math.round(tdee + calcAjustementCalorique(pEff.objectif, pEff.vitesse));

  const proteines_g = calcProteines(pEff);
  const lipides_g = calcLipides(calories, pEff);

  // Glucides = reste des calories
  const caloriesProteines = proteines_g * 4;
  const caloriesLipides = lipides_g * 9;
  const caloriesGlucides = Math.max(0, calories - caloriesProteines - caloriesLipides);
  const glucides_g = Math.round(caloriesGlucides / 4);

  return {
    calories,
    proteines_g,
    glucides_g,
    lipides_g,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    facteurActivite: Math.round(facteurActivite * 100) / 100,
    calculesSurMasseMaigre: pEff.masseGrassePct !== undefined && pEff.masseGrassePct > 0 && pEff.masseGrassePct < 60,
    objectifEffectif,
    objectifAtteint,
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
