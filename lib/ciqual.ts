import type { NutritionData } from './openfoodfacts';
import ciqualData from './ciqual-data.json';
import { ALIMENTS_BASE } from './aliments-base';

interface CiqualEntry {
  c: string; // code
  n: string; // nom court (affiche)
  s: string; // texte de recherche elargi (nom original lower-case)
  k: number; // kcal
  p: number; // proteines
  g: number; // glucides
  l: number; // lipides
  t?: number; // 1 = aliment transforme/industriel (penalite de score)
}

const data = ciqualData as CiqualEntry[];

// -----------------------------------------------------------------------------
// Normalisation : minuscule + retrait des accents
// -----------------------------------------------------------------------------
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// "Mots discriminants" : on ignore les petits mots
const STOP_WORDS = new Set(['de', 'du', 'la', 'le', 'et', 'ou', 'a', 'au', 'aux', 'des', 'en', 'un', 'une']);

// -----------------------------------------------------------------------------
// Familles culinaires : un mot dans une famille matche tous ses synonymes
// Si l'aliment contient un mot d'une famille opposee, malus.
// -----------------------------------------------------------------------------
const COOKING_FAMILIES: Record<string, string[]> = {
  cuit: ['cuit', 'cuite', 'cuits', 'cuites', 'roti', 'rotie', 'rotis', 'roties',
         'grille', 'grillee', 'grilles', 'grillees',
         'poele', 'poelee', 'poeles', 'poelees',
         'saute', 'sautee', 'sautes', 'sautees',
         'bouilli', 'bouillie', 'bouillis', 'bouillies',
         'vapeur', 'frit', 'frite', 'frits', 'frites',
         'cuisson', 'mijote', 'mijotee', 'braise', 'braisee',
         'fume', 'fumee', 'fumes', 'fumees'],
  cru: ['cru', 'crue', 'crus', 'crues', 'frais', 'fraiche', 'fraiches'],
};

// Construit le mapping inverse : mot -> nom de famille
const WORD_TO_FAMILY: Map<string, string> = new Map();
for (const [familyName, words] of Object.entries(COOKING_FAMILIES)) {
  for (const w of words) WORD_TO_FAMILY.set(w, familyName);
}

function getFamilyOfWord(word: string): string | null {
  return WORD_TO_FAMILY.get(word) ?? null;
}

// Cherche si un mot d'une famille donnee est present dans un texte normalise
function familyPresentInText(familyName: string, text: string): boolean {
  const words = COOKING_FAMILIES[familyName];
  if (!words) return false;
  for (const w of words) {
    // Matche le mot complet (entoure de non-lettres ou debut/fin)
    if (new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(text)) return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// Aliments "exclusifs" : si la requete ne contient PAS l'expression complete,
// on exclut les aliments dont le nom la contient.
// Limitee aux cas de vraie polysemie (pomme = fruit / pomme de terre = feculent)
// -----------------------------------------------------------------------------
const EXCLUSIVE_COMPOUNDS = [
  'pomme de terre',
  'patate douce',
];

function compoundConflict(queryNorm: string, nameNorm: string): boolean {
  for (const compound of EXCLUSIVE_COMPOUNDS) {
    if (nameNorm.includes(compound) && !queryNorm.includes(compound)) {
      return true;
    }
  }
  return false;
}

// -----------------------------------------------------------------------------
// Stemming basique + matching de mot entier (pas de sous-chaine)
// "boeuf" ne doit PAS matcher "oeuf", "amandier" ne doit PAS matcher "amande"
// -----------------------------------------------------------------------------
function wordVariants(word: string): string[] {
  if (word.length < 4) return [word];
  if (word.endsWith('s')) return [word, word.slice(0, -1)];
  return [word, word + 's'];
}

// Test mot entier : entoure de bornes non-alphabetiques (debut, fin, ponctuation)
function containsWholeWord(text: string, word: string): boolean {
  const re = new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`);
  return re.test(text);
}

function textContainsAnyVariant(text: string, word: string): boolean {
  for (const v of wordVariants(word)) {
    if (containsWholeWord(text, v)) return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// Comptage des matches (literal + via famille culinaire)
// -----------------------------------------------------------------------------
interface MatchCounts {
  matchedDirect: number;       // mot present directement dans le nom
  matchedSynonym: number;      // mot match via une famille culinaire (poele = cuit)
  matchedInSearch: number;     // pas dans le nom mais dans le texte de recherche elargi
  hasOpposite: boolean;        // l'aliment contient un mot d'une famille opposee
  totalMatched: number;
}

function countMatches(words: string[], nameNorm: string, searchNorm: string): MatchCounts {
  let matchedDirect = 0;
  let matchedSynonym = 0;
  let matchedInSearch = 0;
  let hasOpposite = false;

  for (const w of words) {
    if (textContainsAnyVariant(nameNorm, w)) {
      matchedDirect++;
      continue;
    }
    // Tentative via famille culinaire
    const family = getFamilyOfWord(w);
    if (family && familyPresentInText(family, nameNorm)) {
      matchedSynonym++;
      continue;
    }
    // Match dans le texte de recherche (nom Ciqual original) ?
    if (textContainsAnyVariant(searchNorm, w)) {
      matchedInSearch++;
      continue;
    }
    if (family && familyPresentInText(family, searchNorm)) {
      matchedInSearch++;
      continue;
    }
  }

  // Detection mot oppose : pour chaque mot du query qui appartient a une famille,
  // si le nom contient un mot d'une AUTRE famille, c'est un opposé.
  for (const w of words) {
    const family = getFamilyOfWord(w);
    if (!family) continue;
    for (const otherFamily of Object.keys(COOKING_FAMILIES)) {
      if (otherFamily === family) continue;
      if (familyPresentInText(otherFamily, nameNorm)) {
        hasOpposite = true;
        break;
      }
    }
    if (hasOpposite) break;
  }

  return {
    matchedDirect,
    matchedSynonym,
    matchedInSearch,
    hasOpposite,
    totalMatched: matchedDirect + matchedSynonym + matchedInSearch,
  };
}

// -----------------------------------------------------------------------------
// Calcul du score
// -----------------------------------------------------------------------------
function scoreEntry(
  displayName: string,
  searchText: string,
  queryNormalized: string,
  queryWords: string[],
  isTransformed: boolean,
  isStarFood: boolean,
): number {
  const nameNorm = normalize(displayName);
  const searchNorm = normalize(searchText);

  const m = countMatches(queryWords, nameNorm, searchNorm);
  const totalMissing = queryWords.length - m.totalMatched;

  let score = 0;

  // Bonus par mot match
  score += m.matchedDirect * 100;
  score += m.matchedSynonym * 70;
  score += m.matchedInSearch * 50;
  // Malus par mot manquant
  score -= totalMissing * 60;
  // Malus si mot oppose (cherche cuit, trouve cru)
  if (m.hasOpposite) score -= 120;

  // Match exact sur le nom court
  if (nameNorm === queryNormalized) score += 1000;
  // Le nom commence par la requete
  if (nameNorm.startsWith(queryNormalized)) score += 300;

  // Tous les mots dans le nom (direct ou synonyme)
  const allInName = (m.matchedDirect + m.matchedSynonym) === queryWords.length;
  if (allInName) score += 150;

  // Mots dans l'ordre dans le nom
  if (allInName && queryWords.length > 1) {
    let cursor = 0;
    let inOrder = true;
    for (const w of queryWords) {
      const idx = nameNorm.indexOf(w, cursor);
      if (idx === -1) { inOrder = false; break; }
      cursor = idx + w.length;
    }
    if (inOrder) score += 80;
  }

  // Bonus longueur courte
  if (nameNorm.length <= 20) score += 50;
  else if (nameNorm.length <= 30) score += 25;
  else if (nameNorm.length > 50) score -= 30;

  // Star et transforme
  if (isStarFood) score += 200;
  if (isTransformed) score -= 80;

  return score;
}

// -----------------------------------------------------------------------------
// Cle de dedupe : retire les modifieurs marketing pour fusionner les variantes
// "Poulet, filet, sans peau, cru" / ", cru, bio" / ", cru, label rouge"
// -----------------------------------------------------------------------------
const MODIFIERS_TO_STRIP = [
  'bio', 'label rouge', 'label bleu', 'aop', 'aoc', 'igp', 'fermier',
  'pasteurise', 'pasteurisee', 'sterilise', 'sterilisee',
  'standard', 'industriel', 'industrielle',
  'allege en matiere grasse', 'allege', 'allegee',
];

function dedupeKey(displayName: string): string {
  let n = normalize(displayName);
  for (const mod of MODIFIERS_TO_STRIP) {
    n = n.replace(new RegExp(`\\s*,\\s*${mod}(\\s*,|$)`, 'g'), '$1');
    n = n.replace(new RegExp(`\\s+${mod}\\b`, 'g'), '');
  }
  return n.replace(/\s*,\s*$/, '').trim();
}

// -----------------------------------------------------------------------------
// Recherche principale
// -----------------------------------------------------------------------------
export function searchCiqual(query: string): NutritionData[] {
  const queryNormalized = normalize(query.trim());
  const allWords = queryNormalized.split(/\s+/).filter((w) => w.length > 1);
  const queryWords = allWords.filter((w) => !STOP_WORDS.has(w));
  const wordsForScoring = queryWords.length > 0 ? queryWords : allWords;
  if (wordsForScoring.length === 0) return [];

  // Filtre minimum : combien de mots doivent matcher au minimum
  // 1-2 mots : au moins 1 mot match
  // 3+ mots : au moins 2 mots match (literal OU synonyme)
  const minMatchesRequired = wordsForScoring.length >= 3 ? 2 : 1;

  type Scored = { item: NutritionData; score: number };
  const scored: Scored[] = [];

  function consider(name: string, searchText: string, item: NutritionData,
                    isTransformed: boolean, isStar: boolean) {
    const nameNorm = normalize(name);
    // Filtre aliments composes
    if (compoundConflict(queryNormalized, nameNorm)) return;
    // Filtre minimum match
    const m = countMatches(wordsForScoring, nameNorm, normalize(searchText));
    const matchedInName = m.matchedDirect + m.matchedSynonym;
    if (matchedInName + m.matchedInSearch < minMatchesRequired) return;
    // Si 3+ mots, exiger au moins 2 matchs DANS LE NOM (pas juste search)
    if (wordsForScoring.length >= 3 && matchedInName < 2) return;

    const s = scoreEntry(name, searchText, queryNormalized, wordsForScoring,
                          isTransformed, isStar);
    scored.push({ item, score: s });
  }

  // 1. Aliments stars (boost massif)
  for (const a of ALIMENTS_BASE) {
    consider(a.name, a.name, a, false, true);
  }

  // 2. Base Ciqual
  for (const e of data) {
    consider(e.n, e.s, {
      code: e.c,
      name: e.n,
      brand: 'Ciqual (ANSES)',
      calories: e.k,
      proteines: e.p,
      glucides: e.g,
      lipides: e.l,
      image_url: null,
    }, e.t === 1, false);
  }

  // Tri par score decroissant
  scored.sort((a, b) => b.score - a.score);

  // Dedupe : memes "noms canoniques" -> on garde le meilleur score
  const seenKeys = new Set<string>();
  const final: NutritionData[] = [];
  for (const { item, score } of scored) {
    if (score < 0) break;
    const key = dedupeKey(item.name);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    final.push(item);
    if (final.length >= 25) break;
  }
  return final;
}
