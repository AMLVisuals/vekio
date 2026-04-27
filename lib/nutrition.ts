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
export type Frequence = 1 | 3 | 5; // 1-2/sem, 3-4/sem, 5+/sem (valeur centrale)

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
}

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
const FACTEUR_BASE: Record<Frequence, number> = {
  1: 1.375, // 1-2x/sem
  3: 1.55,  // 3-4x/sem
  5: 1.725, // 5+/sem
};

const BONUS_SECONDAIRE: Record<Frequence, number> = {
  1: 0.05,
  3: 0.10,
  5: 0.10,
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
// 6. Calcul global
// -----------------------------------------------------------------------------
export function calculateNeeds(p: Profile): MacroObjectifs {
  const bmr = calcBMR(p);
  const facteurActivite = calcFacteurActivite(p.sports);
  const tdee = bmr * facteurActivite;
  const calories = Math.round(tdee + calcAjustementCalorique(p.objectif, p.vitesse));

  const proteines_g = calcProteines(p);
  const lipides_g = calcLipides(calories, p);

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
    calculesSurMasseMaigre: p.masseGrassePct !== undefined && p.masseGrassePct > 0 && p.masseGrassePct < 60,
  };
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
