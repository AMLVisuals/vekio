export interface Profile {
  sexe: 'homme' | 'femme';
  age: number;
  poids: number; // kg
  taille: number; // cm
  activite: 'sedentaire' | 'leger' | 'modere' | 'actif' | 'tres_actif';
  objectif: 'perte' | 'maintien' | 'prise';
}

export interface MacroObjectifs {
  calories: number;
  proteines_g: number;
  glucides_g: number;
  lipides_g: number;
}

const ACTIVITY_MULTIPLIER: Record<Profile['activite'], number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  actif: 1.725,
  tres_actif: 1.9,
};

const OBJECTIF_MODIFIER: Record<Profile['objectif'], number> = {
  perte: -400,
  maintien: 0,
  prise: 300,
};

/**
 * Calcul des besoins nutritionnels avec la formule Mifflin-St Jeor
 * Reference : Mifflin MD et al. (1990)
 */
export function calculateNeeds(profile: Profile): MacroObjectifs {
  // Metabolisme de base (BMR) — Mifflin-St Jeor
  let bmr: number;
  if (profile.sexe === 'homme') {
    bmr = 10 * profile.poids + 6.25 * profile.taille - 5 * profile.age + 5;
  } else {
    bmr = 10 * profile.poids + 6.25 * profile.taille - 5 * profile.age - 161;
  }

  // TDEE = BMR x multiplicateur d'activite
  const tdee = bmr * ACTIVITY_MULTIPLIER[profile.activite];

  // Calories ajustees selon l'objectif
  const calories = Math.round(tdee + OBJECTIF_MODIFIER[profile.objectif]);

  // Repartition macros standard : 30% proteines, 40% glucides, 30% lipides
  const proteines_g = Math.round((calories * 0.30) / 4);
  const glucides_g = Math.round((calories * 0.40) / 4);
  const lipides_g = Math.round((calories * 0.30) / 9);

  return { calories, proteines_g, glucides_g, lipides_g };
}
