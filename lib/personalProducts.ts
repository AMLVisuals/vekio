import { supabase } from './supabase';
import type { NutritionData } from './openfoodfacts';

// Produits scannes dont le code-barres est absent d'Open Food Facts (typiquement
// les produits sport : whey, gainers, barres...). L'utilisateur saisit les macros
// une fois ; on les memorise par code-barres pour les re-scans suivants.
// Valeurs stockees POUR 100 g, comme NutritionData.

const num = (x: any): number | undefined => (x != null ? Number(x) : undefined);

/** Cherche un produit perso par code-barres pour l'utilisateur connecte. */
export async function getPersonalProduct(code: string): Promise<NutritionData | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('produits_perso')
    .select('*')
    .eq('user_id', user.id)
    .eq('code', code)
    .single();

  if (!data) return null;

  return {
    code: data.code,
    name: data.nom,
    brand: data.brand ?? '',
    calories: Number(data.calories),
    proteines: Number(data.proteines_g),
    glucides: Number(data.glucides_g),
    lipides: Number(data.lipides_g),
    image_url: null,
    fibres: num(data.fibres_g),
    sucres: num(data.sucres_g),
    ags: num(data.ags_g),
    cholesterol: num(data.cholesterol_mg),
    sodium: num(data.sodium_mg),
    calcium: num(data.calcium_mg),
    fer: num(data.fer_mg),
    potassium: num(data.potassium_mg),
  };
}

/** Enregistre (ou met a jour) un produit perso. Upsert sur (user_id, code). */
export async function savePersonalProduct(p: NutritionData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !p.code) return;

  const { error } = await supabase.from('produits_perso').upsert({
    user_id: user.id,
    code: p.code,
    nom: p.name,
    brand: p.brand ?? '',
    calories: Math.round(p.calories),
    proteines_g: p.proteines,
    glucides_g: p.glucides,
    lipides_g: p.lipides,
    fibres_g: p.fibres ?? null,
    sucres_g: p.sucres ?? null,
    ags_g: p.ags ?? null,
    cholesterol_mg: p.cholesterol ?? null,
    sodium_mg: p.sodium ?? null,
    calcium_mg: p.calcium ?? null,
    fer_mg: p.fer ?? null,
    potassium_mg: p.potassium ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,code' });

  if (error) console.error('produits_perso upsert error', error);
}
