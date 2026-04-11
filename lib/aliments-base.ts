import type { NutritionData } from './openfoodfacts';

// Base d'aliments courants francais — valeurs pour 100g
// Source : table Ciqual (ANSES)
export const ALIMENTS_BASE: NutritionData[] = [
  // Viandes
  { code: 'base-filet-poulet', name: 'Filet de poulet', brand: '', calories: 121, proteines: 26.2, glucides: 0, lipides: 1.8, image_url: null },
  { code: 'base-cuisse-poulet', name: 'Cuisse de poulet', brand: '', calories: 170, proteines: 20, glucides: 0, lipides: 10, image_url: null },
  { code: 'base-steak-hache-5', name: 'Steak haché 5%', brand: '', calories: 136, proteines: 22, glucides: 0, lipides: 5.5, image_url: null },
  { code: 'base-steak-hache-15', name: 'Steak haché 15%', brand: '', calories: 218, proteines: 19, glucides: 0, lipides: 15, image_url: null },
  { code: 'base-escalope-dinde', name: 'Escalope de dinde', brand: '', calories: 108, proteines: 24, glucides: 0, lipides: 1.5, image_url: null },
  { code: 'base-jambon-blanc', name: 'Jambon blanc', brand: '', calories: 115, proteines: 21, glucides: 1, lipides: 3, image_url: null },
  { code: 'base-lardons', name: 'Lardons fumés', brand: '', calories: 260, proteines: 16, glucides: 0.5, lipides: 22, image_url: null },
  { code: 'base-entrecote', name: 'Entrecôte de boeuf', brand: '', calories: 208, proteines: 20, glucides: 0, lipides: 14, image_url: null },
  { code: 'base-cote-porc', name: 'Côte de porc', brand: '', calories: 207, proteines: 19, glucides: 0, lipides: 14, image_url: null },
  { code: 'base-merguez', name: 'Merguez', brand: '', calories: 280, proteines: 15, glucides: 1, lipides: 24, image_url: null },

  // Poissons
  { code: 'base-saumon', name: 'Saumon frais', brand: '', calories: 208, proteines: 20, glucides: 0, lipides: 13, image_url: null },
  { code: 'base-thon-frais', name: 'Thon frais', brand: '', calories: 130, proteines: 29, glucides: 0, lipides: 1, image_url: null },
  { code: 'base-thon-boite', name: 'Thon en boîte (naturel)', brand: '', calories: 116, proteines: 26, glucides: 0, lipides: 1, image_url: null },
  { code: 'base-cabillaud', name: 'Cabillaud', brand: '', calories: 80, proteines: 18, glucides: 0, lipides: 0.7, image_url: null },
  { code: 'base-crevettes', name: 'Crevettes', brand: '', calories: 98, proteines: 21, glucides: 0, lipides: 1.4, image_url: null },
  { code: 'base-sardines', name: 'Sardines en boîte', brand: '', calories: 220, proteines: 22, glucides: 0, lipides: 14, image_url: null },

  // Oeufs & produits laitiers
  { code: 'base-oeuf', name: 'Oeuf entier (60g)', brand: '', calories: 140, proteines: 12, glucides: 0.7, lipides: 10, image_url: null },
  { code: 'base-blanc-oeuf', name: 'Blanc d\'oeuf', brand: '', calories: 48, proteines: 11, glucides: 0.7, lipides: 0, image_url: null },
  { code: 'base-fromage-blanc-0', name: 'Fromage blanc 0%', brand: '', calories: 46, proteines: 8, glucides: 4, lipides: 0, image_url: null },
  { code: 'base-fromage-blanc', name: 'Fromage blanc 3%', brand: '', calories: 68, proteines: 7, glucides: 4, lipides: 3, image_url: null },
  { code: 'base-yaourt-nature', name: 'Yaourt nature', brand: '', calories: 60, proteines: 4, glucides: 5, lipides: 2.5, image_url: null },
  { code: 'base-yaourt-grec', name: 'Yaourt grec', brand: '', calories: 97, proteines: 9, glucides: 4, lipides: 5, image_url: null },
  { code: 'base-lait-demi', name: 'Lait demi-écrémé', brand: '', calories: 46, proteines: 3.2, glucides: 4.8, lipides: 1.6, image_url: null },
  { code: 'base-emmental', name: 'Emmental', brand: '', calories: 370, proteines: 27, glucides: 0, lipides: 29, image_url: null },
  { code: 'base-mozzarella', name: 'Mozzarella', brand: '', calories: 250, proteines: 18, glucides: 1, lipides: 19, image_url: null },
  { code: 'base-beurre', name: 'Beurre', brand: '', calories: 745, proteines: 0.8, glucides: 0.5, lipides: 82, image_url: null },
  { code: 'base-creme-fraiche', name: 'Crème fraîche 30%', brand: '', calories: 300, proteines: 2.2, glucides: 3, lipides: 30, image_url: null },

  // Feculents
  { code: 'base-riz-blanc-cuit', name: 'Riz blanc (cuit)', brand: '', calories: 130, proteines: 2.7, glucides: 28, lipides: 0.3, image_url: null },
  { code: 'base-riz-complet-cuit', name: 'Riz complet (cuit)', brand: '', calories: 123, proteines: 2.7, glucides: 25, lipides: 1, image_url: null },
  { code: 'base-pates-cuites', name: 'Pâtes (cuites)', brand: '', calories: 131, proteines: 5, glucides: 25, lipides: 0.7, image_url: null },
  { code: 'base-semoule-cuite', name: 'Semoule (cuite)', brand: '', calories: 113, proteines: 4, glucides: 23, lipides: 0.2, image_url: null },
  { code: 'base-quinoa-cuit', name: 'Quinoa (cuit)', brand: '', calories: 120, proteines: 4.4, glucides: 21, lipides: 1.9, image_url: null },
  { code: 'base-pomme-de-terre', name: 'Pomme de terre (cuite)', brand: '', calories: 80, proteines: 2, glucides: 17, lipides: 0.1, image_url: null },
  { code: 'base-patate-douce', name: 'Patate douce (cuite)', brand: '', calories: 90, proteines: 1.6, glucides: 20, lipides: 0.1, image_url: null },
  { code: 'base-lentilles-cuites', name: 'Lentilles (cuites)', brand: '', calories: 112, proteines: 9, glucides: 16, lipides: 0.4, image_url: null },
  { code: 'base-pois-chiches-cuits', name: 'Pois chiches (cuits)', brand: '', calories: 164, proteines: 9, glucides: 27, lipides: 2.6, image_url: null },
  { code: 'base-haricots-rouges', name: 'Haricots rouges (cuits)', brand: '', calories: 127, proteines: 9, glucides: 22, lipides: 0.5, image_url: null },

  // Pain & cereales
  { code: 'base-pain-blanc', name: 'Pain blanc (baguette)', brand: '', calories: 265, proteines: 8, glucides: 55, lipides: 1.3, image_url: null },
  { code: 'base-pain-complet', name: 'Pain complet', brand: '', calories: 247, proteines: 9, glucides: 46, lipides: 2.5, image_url: null },
  { code: 'base-pain-mie', name: 'Pain de mie', brand: '', calories: 275, proteines: 8, glucides: 49, lipides: 4, image_url: null },
  { code: 'base-flocons-avoine', name: 'Flocons d\'avoine', brand: '', calories: 367, proteines: 14, glucides: 58, lipides: 7, image_url: null },
  { code: 'base-muesli', name: 'Muesli', brand: '', calories: 370, proteines: 10, glucides: 60, lipides: 8, image_url: null },

  // Fruits
  { code: 'base-banane', name: 'Banane', brand: '', calories: 90, proteines: 1.1, glucides: 20, lipides: 0.3, image_url: null },
  { code: 'base-pomme', name: 'Pomme', brand: '', calories: 52, proteines: 0.3, glucides: 12, lipides: 0.2, image_url: null },
  { code: 'base-orange', name: 'Orange', brand: '', calories: 47, proteines: 0.9, glucides: 10, lipides: 0.1, image_url: null },
  { code: 'base-fraises', name: 'Fraises', brand: '', calories: 33, proteines: 0.7, glucides: 6, lipides: 0.3, image_url: null },
  { code: 'base-raisin', name: 'Raisin', brand: '', calories: 72, proteines: 0.6, glucides: 16, lipides: 0.2, image_url: null },
  { code: 'base-kiwi', name: 'Kiwi', brand: '', calories: 58, proteines: 1, glucides: 12, lipides: 0.4, image_url: null },
  { code: 'base-mangue', name: 'Mangue', brand: '', calories: 63, proteines: 0.6, glucides: 14, lipides: 0.3, image_url: null },
  { code: 'base-avocat', name: 'Avocat', brand: '', calories: 160, proteines: 2, glucides: 1.8, lipides: 15, image_url: null },
  { code: 'base-dattes', name: 'Dattes séchées', brand: '', calories: 282, proteines: 2.5, glucides: 64, lipides: 0.4, image_url: null },

  // Legumes
  { code: 'base-tomate', name: 'Tomate', brand: '', calories: 20, proteines: 0.8, glucides: 3.5, lipides: 0.3, image_url: null },
  { code: 'base-courgette', name: 'Courgette', brand: '', calories: 17, proteines: 1.2, glucides: 2, lipides: 0.3, image_url: null },
  { code: 'base-brocoli', name: 'Brocoli', brand: '', calories: 34, proteines: 3, glucides: 4, lipides: 0.4, image_url: null },
  { code: 'base-carotte', name: 'Carotte', brand: '', calories: 36, proteines: 0.8, glucides: 7, lipides: 0.2, image_url: null },
  { code: 'base-haricots-verts', name: 'Haricots verts', brand: '', calories: 30, proteines: 1.8, glucides: 4.5, lipides: 0.2, image_url: null },
  { code: 'base-epinards', name: 'Épinards', brand: '', calories: 23, proteines: 2.9, glucides: 1.6, lipides: 0.4, image_url: null },
  { code: 'base-poivron', name: 'Poivron', brand: '', calories: 27, proteines: 0.9, glucides: 5, lipides: 0.2, image_url: null },
  { code: 'base-champignons', name: 'Champignons', brand: '', calories: 25, proteines: 2.5, glucides: 2.3, lipides: 0.3, image_url: null },
  { code: 'base-salade-verte', name: 'Salade verte', brand: '', calories: 14, proteines: 1.3, glucides: 1.5, lipides: 0.2, image_url: null },
  { code: 'base-oignon', name: 'Oignon', brand: '', calories: 40, proteines: 1.1, glucides: 8, lipides: 0.1, image_url: null },
  { code: 'base-concombre', name: 'Concombre', brand: '', calories: 12, proteines: 0.6, glucides: 1.8, lipides: 0.1, image_url: null },

  // Matieres grasses & oleagineux
  { code: 'base-huile-olive', name: 'Huile d\'olive', brand: '', calories: 900, proteines: 0, glucides: 0, lipides: 100, image_url: null },
  { code: 'base-amandes', name: 'Amandes', brand: '', calories: 578, proteines: 21, glucides: 7, lipides: 50, image_url: null },
  { code: 'base-noix', name: 'Noix', brand: '', calories: 654, proteines: 15, glucides: 7, lipides: 63, image_url: null },
  { code: 'base-beurre-cacahuete', name: 'Beurre de cacahuète', brand: '', calories: 588, proteines: 25, glucides: 14, lipides: 50, image_url: null },

  // Autres
  { code: 'base-miel', name: 'Miel', brand: '', calories: 320, proteines: 0.4, glucides: 78, lipides: 0, image_url: null },
  { code: 'base-sucre', name: 'Sucre', brand: '', calories: 400, proteines: 0, glucides: 100, lipides: 0, image_url: null },
  { code: 'base-chocolat-noir', name: 'Chocolat noir 70%', brand: '', calories: 545, proteines: 8, glucides: 33, lipides: 41, image_url: null },
  { code: 'base-whey', name: 'Whey protéine', brand: '', calories: 380, proteines: 75, glucides: 8, lipides: 5, image_url: null },
];

/**
 * Recherche dans la base d'aliments courants
 */
export function searchAlimentsBase(query: string): NutritionData[] {
  const words = query.toLowerCase().split(/\s+/);
  return ALIMENTS_BASE.filter((a) => {
    const name = a.name.toLowerCase();
    return words.every((word) => name.includes(word));
  });
}
