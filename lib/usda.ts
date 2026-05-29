import type { NutritionData } from './openfoodfacts';

const USDA_API_KEY = 'lSD37fTWccEhxIJm2x58G8hsN5fGe70PJOKR6q6z';
const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// IDs des nutriments USDA FoodData Central
const NUTRIENT_IDS = {
  energy: 1008,       // Energy (kcal)
  protein: 1003,      // Protein (g)
  carbs: 1005,        // Carbohydrate (g)
  fat: 1004,          // Total lipid/fat (g)
  fiber: 1079,        // Fiber, total dietary (g)
  sugars: 2000,       // Sugars, total including NLEA (g)
  ags: 1258,          // Fatty acids, total saturated (g)
  cholesterol: 1253,  // Cholesterol (mg)
  sodium: 1093,       // Sodium, Na (mg)
  calcium: 1087,      // Calcium, Ca (mg)
  iron: 1089,         // Iron, Fe (mg)
  potassium: 1092,    // Potassium, K (mg)
};

function extractNutrient(nutrients: any[], id: number): number {
  const n = nutrients?.find((n: any) => n.nutrientId === id);
  return n ? Math.round(n.value * 10) / 10 : 0;
}
// Variante : renvoie undefined si absent (pour les micros optionnels)
function extractOptional(nutrients: any[], id: number, rounding: 'int' | 'one' = 'one'): number | undefined {
  const n = nutrients?.find((n: any) => n.nutrientId === id);
  if (!n) return undefined;
  return rounding === 'int' ? Math.round(n.value) : Math.round(n.value * 10) / 10;
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
          fibres: extractOptional(nutrients, NUTRIENT_IDS.fiber),
          sucres: extractOptional(nutrients, NUTRIENT_IDS.sugars),
          ags: extractOptional(nutrients, NUTRIENT_IDS.ags),
          cholesterol: extractOptional(nutrients, NUTRIENT_IDS.cholesterol, 'int'),
          sodium: extractOptional(nutrients, NUTRIENT_IDS.sodium, 'int'),
          calcium: extractOptional(nutrients, NUTRIENT_IDS.calcium, 'int'),
          fer: extractOptional(nutrients, NUTRIENT_IDS.iron),
          potassium: extractOptional(nutrients, NUTRIENT_IDS.potassium, 'int'),
        };
      })
      .filter((r: NutritionData) => r.calories > 0 && r.name);
  } catch {
    return [];
  }
}
