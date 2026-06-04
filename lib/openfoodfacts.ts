const BASE_URL = 'https://world.openfoodfacts.org';

// Open Food Facts demande un User-Agent identifiant l'app (sinon throttling /
// requetes potentiellement filtrees). cf. https://world.openfoodfacts.org/api
const OFF_HEADERS = { 'User-Agent': 'Vekio/1.0 (contact: berki.adam@outlook.fr)' };

// Champs demandes a l'API v2 : limite la taille de reponse et accelere le scan.
const PRODUCT_FIELDS =
  'code,product_name,product_name_fr,brands,image_front_small_url,nutriments';

export interface NutritionData {
  code: string;
  name: string;
  brand: string;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
  image_url: string | null;
  // Micronutriments optionnels pour 100g.
  // g : fibres, sucres, ags. mg : cholesterol, sodium, calcium, fer, potassium.
  fibres?: number;
  sucres?: number;
  ags?: number;
  cholesterol?: number;
  sodium?: number;
  calcium?: number;
  fer?: number;
  potassium?: number;
}

// Helper : extrait un micro OFF. Champs en g/100g, conversion mg si besoin.
function offMicros(n: any): Partial<NutritionData> {
  const r1 = (x: number | undefined) => x !== undefined ? Math.round(x * 10) / 10 : undefined;
  const rInt = (x: number | undefined) => x !== undefined ? Math.round(x) : undefined;
  return {
    fibres: r1(n.fiber_100g),
    sucres: r1(n.sugars_100g),
    ags: r1(n['saturated-fat_100g']),
    // OFF stocke cholesterol/mineraux en g/100g -> on convertit en mg
    cholesterol: rInt(n.cholesterol_100g !== undefined ? n.cholesterol_100g * 1000 : undefined),
    sodium: rInt(n.sodium_100g !== undefined ? n.sodium_100g * 1000 : undefined),
    calcium: rInt(n.calcium_100g !== undefined ? n.calcium_100g * 1000 : undefined),
    fer: r1(n.iron_100g !== undefined ? n.iron_100g * 1000 : undefined),
    potassium: rInt(n.potassium_100g !== undefined ? n.potassium_100g * 1000 : undefined),
  };
}

export async function getProductByBarcode(barcode: string): Promise<NutritionData | null> {
  try {
    // API v2 (la v0 est depreciee). fields= limite la reponse aux champs utiles.
    const response = await fetch(
      `${BASE_URL}/api/v2/product/${barcode}.json?fields=${PRODUCT_FIELDS}`,
      { headers: OFF_HEADERS }
    );
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const n = p.nutriments || {};

    return {
      code: barcode,
      name: p.product_name_fr || p.product_name || 'Produit inconnu',
      brand: p.brands || '',
      calories: Math.round(n['energy-kcal_100g'] || 0),
      proteines: Math.round((n.proteins_100g || 0) * 10) / 10,
      glucides: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
      lipides: Math.round((n.fat_100g || 0) * 10) / 10,
      image_url: p.image_front_small_url || null,
      ...offMicros(n),
    };
  } catch {
    return null;
  }
}

export async function searchProducts(query: string, page: number = 1): Promise<NutritionData[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page=${page}&page_size=20&lc=fr&cc=fr`,
      { headers: OFF_HEADERS }
    );
    if (!response.ok) return [];

    const text = await response.text();
    // Verifier que c'est bien du JSON
    if (!text.startsWith('{') && !text.startsWith('[')) return [];

    const data = JSON.parse(text);
    if (!data.products) return [];

    return data.products
      .filter((p: any) => p.nutriments && p.product_name)
      .map((p: any) => {
        const n = p.nutriments;
        return {
          code: p.code || '',
          name: p.product_name_fr || p.product_name || 'Produit inconnu',
          brand: p.brands || '',
          calories: Math.round(n['energy-kcal_100g'] || 0),
          proteines: Math.round((n.proteins_100g || 0) * 10) / 10,
          glucides: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
          lipides: Math.round((n.fat_100g || 0) * 10) / 10,
          image_url: p.image_front_small_url || null,
          ...offMicros(n),
        };
      });
  } catch {
    return [];
  }
}
