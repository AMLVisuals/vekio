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

// "Mots discriminants" : on ignore les petits mots (de, du, la, le, et, ou, a)
const STOP_WORDS = new Set(['de', 'du', 'la', 'le', 'et', 'ou', 'a', 'au', 'aux', 'des', 'en']);

// -----------------------------------------------------------------------------
// Calcul du score d'un resultat pour une requete donnee.
// Plus le score est haut, plus le resultat est pertinent.
// On tolere les matches partiels : chaque mot trouve = bonus, chaque mot
// manquant = malus. Le filtre principal exige juste qu'au moins un mot
// discriminant matche.
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

  let score = 0;

  // Compter les mots qui matchent (dans le nom court, sinon dans le texte de recherche)
  let matchedInName = 0;
  let matchedInSearch = 0;
  for (const w of queryWords) {
    if (nameNorm.includes(w)) matchedInName++;
    else if (searchNorm.includes(w)) matchedInSearch++;
  }
  const totalMatched = matchedInName + matchedInSearch;
  const totalMissing = queryWords.length - totalMatched;

  // Bonus par mot trouve
  score += matchedInName * 100;
  score += matchedInSearch * 60;
  // Malus par mot manquant
  score -= totalMissing * 40;

  // Match exact sur le nom court -> bonus enorme
  if (nameNorm === queryNormalized) score += 1000;

  // Le nom court commence par la requete -> tres bon signe
  if (nameNorm.startsWith(queryNormalized)) score += 300;

  // Tous les mots sont dans le nom court (cas ideal)
  const allWordsInName = matchedInName === queryWords.length;
  if (allWordsInName) score += 150;

  // Mots dans l'ordre dans le nom court
  if (allWordsInName && queryWords.length > 1) {
    let cursor = 0;
    let inOrder = true;
    for (const w of queryWords) {
      const idx = nameNorm.indexOf(w, cursor);
      if (idx === -1) { inOrder = false; break; }
      cursor = idx + w.length;
    }
    if (inOrder) score += 80;
  }

  // Bonus longueur courte (les noms courts sont preferes)
  if (nameNorm.length <= 20) score += 50;
  else if (nameNorm.length <= 30) score += 25;
  else if (nameNorm.length > 50) score -= 30;

  // Aliment "star" (cure manuellement) -> gros boost
  if (isStarFood) score += 200;

  // Penalite : aliment transforme/industriel
  if (isTransformed) score -= 80;

  return score;
}

// -----------------------------------------------------------------------------
// Recherche principale combinant ALIMENTS_BASE + Ciqual
// Filtre tolerant : on garde tout aliment ou au moins un mot discriminant
// matche (dans le nom court ou le texte de recherche elargi).
// Tri par score decroissant.
// -----------------------------------------------------------------------------
export function searchCiqual(query: string): NutritionData[] {
  const queryNormalized = normalize(query.trim());
  const allWords = queryNormalized.split(/\s+/).filter((w) => w.length > 1);
  // Mots discriminants pour le filtre d'inclusion (on vire les stop words)
  const queryWords = allWords.filter((w) => !STOP_WORDS.has(w));
  // Si toute la requete est composee de stop words, on retombe sur les mots bruts
  const wordsForScoring = queryWords.length > 0 ? queryWords : allWords;
  if (wordsForScoring.length === 0) return [];

  type Scored = { item: NutritionData; score: number };
  const scored: Scored[] = [];

  // Helper : un aliment est-il candidat ? (au moins 1 mot discriminant matche)
  function hasAnyMatch(haystack: string): boolean {
    return wordsForScoring.some((w) => haystack.includes(w));
  }

  // 1. Aliments stars (boost massif)
  for (const a of ALIMENTS_BASE) {
    const nameNorm = normalize(a.name);
    if (!hasAnyMatch(nameNorm)) continue;
    const s = scoreEntry(a.name, a.name, queryNormalized, wordsForScoring, false, true);
    scored.push({ item: a, score: s });
  }

  // 2. Base Ciqual
  for (const e of data) {
    const nameNorm = normalize(e.n);
    const searchNorm = normalize(e.s);
    if (!hasAnyMatch(nameNorm) && !hasAnyMatch(searchNorm)) continue;

    const s = scoreEntry(e.n, e.s, queryNormalized, wordsForScoring, e.t === 1, false);
    scored.push({
      item: {
        code: e.c,
        name: e.n,
        brand: 'Ciqual (ANSES)',
        calories: e.k,
        proteines: e.p,
        glucides: e.g,
        lipides: e.l,
        image_url: null,
      },
      score: s,
    });
  }

  // Tri par score decroissant + dedupe par nom (un star peut avoir le meme nom qu'un Ciqual)
  scored.sort((a, b) => b.score - a.score);
  const seenNames = new Set<string>();
  const final: NutritionData[] = [];
  for (const { item, score } of scored) {
    if (score < 0) break; // on coupe sous zero pour eviter le bruit
    const key = normalize(item.name);
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    final.push(item);
    if (final.length >= 25) break;
  }
  return final;
}
