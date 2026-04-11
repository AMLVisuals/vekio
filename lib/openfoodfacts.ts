const BASE_URL = 'https://world.openfoodfacts.org';

export interface NutritionData {
  code: string;
  name: string;
  brand: string;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
  image_url: string | null;
}

export async function getProductByBarcode(barcode: string): Promise<NutritionData | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/v0/product/${barcode}.json`);
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
    };
  } catch {
    return null;
  }
}

export async function searchProducts(query: string, page: number = 1): Promise<NutritionData[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page=${page}&page_size=20&lc=fr&cc=fr`
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
        };
      });
  } catch {
    return [];
  }
}
