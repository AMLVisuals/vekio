import { supabase } from './supabase';
import type { NutritionData } from './openfoodfacts';

// Base communautaire partagee entre tous les utilisateurs Vekio (facon MFP).
// Quand quelqu'un saisit a la main un produit absent d'Open Food Facts, il est
// partage ici : les autres le retrouvent au scan sans ressaisie. Valeurs /100g.

const num = (x: any): number | undefined => (x != null ? Number(x) : undefined);

/** Cherche un produit dans la base communautaire par code-barres. */
export async function getCommunityProduct(code: string): Promise<NutritionData | null> {
  const { data } = await supabase
    .from('produits_communaute')
    .select('*')
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

/**
 * Partage un produit dans la base communautaire. Insert seul : on n'ecrase jamais
 * une contribution existante (le 1er a saisir fait foi, anti-vandalisme).
 * Ne bloque pas l'UI si echec.
 */
export async function saveCommunityProduct(p: NutritionData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !p.code) return;

  const { error } = await supabase.from('produits_communaute').upsert({
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
    created_by: user.id,
  }, { onConflict: 'code', ignoreDuplicates: true });

  if (error) console.error('produits_communaute insert error', error);
}
