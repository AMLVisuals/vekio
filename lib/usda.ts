import type { NutritionData } from './openfoodfacts';

const USDA_API_KEY = 'lSD37fTWccEhxIJm2x58G8hsN5fGe70PJOKR6q6z';
const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// IDs des nutriments USDA
const NUTRIENT_IDS = {
  energy: 1008,     // Energy (kcal)
  protein: 1003,    // Protein (g)
  carbs: 1005,      // Carbohydrate (g)
  fat: 1004,        // Total lipid/fat (g)
};

function extractNutrient(nutrients: any[], id: number): number {
  const n = nutrients?.find((n: any) => n.nutrientId === id);
  return n ? Math.round(n.value * 10) / 10 : 0;
}

/**
 * Recherche d'aliments via l'API USDA FoodData Central
 * Utilise les types Foundation et SR Legacy pour avoir les aliments generiques
 */
export async function searchUSDA(query: string): Promise<NutritionData[]> {
  if (USDA_API_KEY === 'VOTRE_CLE_USDA') return [];

  try {
    const response = await fetch(`${BASE_URL}/foods/search?api_key=${USDA_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        dataType: ['Foundation', 'SR Legacy'],
        pageSize: 15,
        sortBy: 'dataType.keyword',
        sortOrder: 'asc',
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.foods) return [];

    return data.foods
      .map((food: any) => {
        const nutrients = food.foodNutrients || [];
        const calories = extractNutrient(nutrients, NUTRIENT_IDS.energy);
        const proteines = extractNutrient(nutrients, NUTRIENT_IDS.protein);
        const glucides = extractNutrient(nutrients, NUTRIENT_IDS.carbs);
        const lipides = extractNutrient(nutrients, NUTRIENT_IDS.fat);

        return {
          code: `usda-${food.fdcId}`,
          name: food.description || '',
          brand: 'USDA',
          calories,
          proteines,
          glucides,
          lipides,
          image_url: null,
        };
      })
      .filter((r: NutritionData) => r.calories > 0 && r.name);
  } catch {
    return [];
  }
}
