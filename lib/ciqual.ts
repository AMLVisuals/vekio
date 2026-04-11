import type { NutritionData } from './openfoodfacts';
import ciqualData from './ciqual-data.json';

interface CiqualEntry {
  c: string; // code
  n: string; // nom
  k: number; // kcal
  p: number; // proteines
  g: number; // glucides
  l: number; // lipides
}

const data = ciqualData as CiqualEntry[];

/**
 * Recherche dans la table Ciqual (ANSES)
 * Retourne les aliments dont le nom contient tous les mots recherches
 */
export function searchCiqual(query: string): NutritionData[] {
  const words = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length === 0) return [];

  return data
    .filter((entry) => {
      const name = entry.n
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return words.every((word) => name.includes(word));
    })
    .slice(0, 20)
    .map((entry) => ({
      code: entry.c,
      name: entry.n,
      brand: 'Ciqual (ANSES)',
      calories: entry.k,
      proteines: entry.p,
      glucides: entry.g,
      lipides: entry.l,
      image_url: null,
    }));
}
