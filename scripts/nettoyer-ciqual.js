/**
 * Script de nettoyage de la base Ciqual.
 *
 * Lit  : lib/ciqual-data.json   (format actuel : c, n, k, p, g, l)
 * Ecrit: lib/ciqual-data.json   (format nettoye : c, n, s, t, k, p, g, l)
 *
 *   n = nom court affiche (nettoye)
 *   s = texte de recherche elargi (mots de l'original gardes pour matching)
 *   t = 1 si l'aliment est transforme/industriel (penalite de score),
 *       0 sinon. Champ omis quand 0 pour reduire la taille du fichier.
 *
 * Egalement ecrit: scripts/echantillon-nettoyage.json
 *   pour valider visuellement le rendu avant/apres.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'lib', 'ciqual-data.json');
const DST = path.join(__dirname, '..', 'lib', 'ciqual-data.json');
const SAMPLE = path.join(__dirname, 'echantillon-nettoyage.json');
const HARD = path.join(__dirname, 'ciqual-cas-difficiles.json');

// -----------------------------------------------------------------------------
// Mots-cles "transforme" => penalite de score dans la recherche
// -----------------------------------------------------------------------------
const TRANSFORMED_KEYWORDS = [
  'préemballé', 'préemballée', 'préemballés', 'préemballées',
  'appertisé', 'appertisée', 'appertisés', 'appertisées',
  'déshydraté', 'déshydratée', 'déshydratés', 'déshydratées',
  'reconstitué', 'reconstituée',
  'pasteurisé', 'pasteurisée',
  'stérilisé', 'stérilisée',
  'lyophilisé', 'lyophilisée',
  'industriel', 'industrielle',
];

function isTransformed(originalName) {
  const n = originalName.toLowerCase();
  return TRANSFORMED_KEYWORDS.some((k) => n.includes(k));
}

// -----------------------------------------------------------------------------
// Etape 1 : suppressions de parentheses / mentions inutiles
// -----------------------------------------------------------------------------
const PAREN_PATTERNS = [
  /\s*\(aliment moyen\)/gi,
  /\s*\(non enrichis? en vitamines? et minéraux\)/gi,
  /\s*\(non enrichies? en vitamines? et minéraux\)/gi,
  /\s*\(enrichis? en vitamines? et minéraux\)/gi,
  /\s*\(enrichies? en vitamines? et minéraux\)/gi,
  /\s*\(variété locale\)/gi,
  /\s*\(extra ou classique\)/gi,
  /\s*\(reconstituée? avec[^)]*\)/gi,
  /\s*\(reconstitué avec[^)]*\)/gi,
  /\s*\(s\)/gi,
  /\s*\(sans précisions?\)/gi,
  /\s*\(ne convient pas aux véganes[^)]*\)/gi,
  /\s*\(convient aux véganes[^)]*\)/gi,
  /\s*\(végétale et laitière\)/gi,
  /\s*\(non sucré\)/gi,
  /\s*\(préparation pour nourrissons\)/gi,
];

// -----------------------------------------------------------------------------
// Etape 2 : suppression de "tags" entre virgules (forme: ", xxx," ou ", xxx" en fin)
// -----------------------------------------------------------------------------
const REMOVE_TAGS = [
  // Conditionnement / process
  'préemballée à réchauffer', 'préemballé à réchauffer',
  'préemballée', 'préemballé', 'préemballés', 'préemballées',
  'appertisée', 'appertisé', 'appertisés', 'appertisées',
  'déshydratée reconstituée', 'déshydraté reconstitué',
  'déshydraté', 'déshydratée', 'déshydratés', 'déshydratées',
  'reconstituée', 'reconstitué',
  'rayon frais',
  'pasteurisé', 'pasteurisée',
  'stérilisé', 'stérilisée',
  'cellophané', 'cellophanée', 'cellophanés', 'cellophanées',
  'fait maison',
  // Provenance
  'prélevé à la martinique', 'prélevée à la martinique',
  'prélevés à la martinique', 'prélevées à la martinique',
  'à la française',
  // Precisions inutiles
  'sans précision', 'sans précisions',
  'aliment moyen',
  'à moins de 10% de jus',
  'de 10 à 50% de jus',
  '10 à 50% de jus',
  // Marketing
  'enrichi en vitamine d', 'enrichie en vitamine d',
  'enrichi en vitamines et minéraux', 'enrichie en vitamines et minéraux',
  'enrichis en vitamines et minéraux', 'enrichies en vitamines et minéraux',
];

// -----------------------------------------------------------------------------
// Etape 3 : simplifications de mots composes "X/Y" -> "X"
// L'ORDRE compte : les regles specifiques (multi-mots) AVANT la regle generique.
// -----------------------------------------------------------------------------
const SLASH_SIMPLIFICATIONS = [
  // 3a. Conjonctions "et/ou" et variantes => "ou"
  [/\s*et\s*\/\s*ou\s+/gi, ' ou '],
  [/\s+ou\s*\/\s*et\s+/gi, ' ou '],
  // 3b. Cas particuliers "mot composé / mot composé"
  [/à\s+la\s+crème\s*\/\s*fromage\s+blanc/gi, 'au fromage blanc'],
  [/crème\s*\/\s*fromage\s+blanc/gi, 'fromage blanc'],
  // 3c. Methodes de cuisson redondantes
  [/rôtie?\s*\/\s*cuite? au four/gi, 'rôti'],
  [/cuite?\s*\/\s*rôtie? au four/gi, 'rôti'],
  [/bouilli\s*\/\s*cuit à l'eau/gi, 'à l\'eau'],
  [/bouillie\s*\/\s*cuite à l'eau/gi, 'à l\'eau'],
  [/sauté\s*\/\s*poêlé/gi, 'poêlé'],
  [/sautée\s*\/\s*poêlée/gi, 'poêlée'],
  [/grillée?\s*\/\s*poêlée?/gi, 'grillé'],
  [/poêlée?\s*\/\s*grillée?/gi, 'poêlé'],
  // 3d. Generique : "mot/mot" -> "mot" (en DERNIER, apres les regles ci-dessus)
  [/(\b[\wéèêàâîïôûç]+)\s*\/\s*([\wéèêàâîïôûç]+\b)/gi, '$1'],
];

// -----------------------------------------------------------------------------
// Nettoyage principal d'un nom
// -----------------------------------------------------------------------------
function cleanName(rawName) {
  let s = rawName;

  // 1a. Parentheses connues a virer
  for (const re of PAREN_PATTERNS) s = s.replace(re, '');

  // 1b. Parentheses descriptives : contenu avec virgule (liste d'ingredients)
  //     ex: "(salade verte, fromage, croutons, sauce)" -> vire
  s = s.replace(/\s*\([^)]*,[^)]*\)/g, '');

  // 1c. Parentheses longues (>25 car) qui ne sont pas une indication courte utile
  s = s.replace(/\s*\(([^)]{25,})\)/g, '');

  // 2. Tags entre virgules (on traite plusieurs passes pour gerer les chaines comme ", X, Y")
  for (let pass = 0; pass < 4; pass++) {
    for (const tag of REMOVE_TAGS) {
      const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // tag en fin de chaine
      s = s.replace(new RegExp(`\\s*,\\s*${escaped}\\s*$`, 'gi'), '');
      // tag au milieu (suivi d'une virgule)
      s = s.replace(new RegExp(`\\s*,\\s*${escaped}\\s*,`, 'gi'), ',');
    }
  }

  // 3. Slash / pluriels concurrents
  for (const [re, rep] of SLASH_SIMPLIFICATIONS) s = s.replace(re, rep);

  // 4. Espaces multiples / virgules orphelines / trim
  s = s.replace(/\s{2,}/g, ' ');
  s = s.replace(/\s*,\s*,/g, ',');
  s = s.replace(/^\s*,\s*/g, '');
  s = s.replace(/\s*,\s*$/g, '');
  s = s.trim();

  // 5. Capitaliser premiere lettre
  if (s.length > 0) s = s[0].toUpperCase() + s.slice(1);

  return s;
}

// -----------------------------------------------------------------------------
// Execution
// -----------------------------------------------------------------------------
function run() {
  const raw = JSON.parse(fs.readFileSync(SRC, 'utf-8'));
  console.log(`Lecture : ${raw.length} entrees`);

  const cleaned = [];
  const sample = [];
  const stats = { unchanged: 0, shortened: 0, transformed: 0 };
  let totalLenBefore = 0;
  let totalLenAfter = 0;

  for (const entry of raw) {
    const original = entry.n;
    const newName = cleanName(original);
    const transformed = isTransformed(original);

    totalLenBefore += original.length;
    totalLenAfter += newName.length;

    if (newName === original) stats.unchanged++;
    else stats.shortened++;
    if (transformed) stats.transformed++;

    const out = {
      c: entry.c,
      n: newName,
      s: original.toLowerCase(),
      k: entry.k,
      p: entry.p,
      g: entry.g,
      l: entry.l,
    };
    if (transformed) out.t = 1;

    cleaned.push(out);

    // Echantillon : entrees ou le changement est significatif
    if (original !== newName && Math.abs(original.length - newName.length) > 8) {
      if (sample.length < 80) sample.push({ avant: original, apres: newName, transforme: transformed });
    }
  }

  // Cas difficiles : noms encore longs apres nettoyage
  const hard = cleaned
    .filter((e) => e.n.length > 35)
    .sort((a, b) => b.n.length - a.n.length)
    .slice(0, 200)
    .map((e) => ({ code: e.c, nom_actuel: e.n, longueur: e.n.length }));

  // Rapport
  console.log('---');
  console.log(`Inchangees : ${stats.unchanged}`);
  console.log(`Raccourcies: ${stats.shortened}`);
  console.log(`Transformees (penalite score): ${stats.transformed}`);
  console.log(`Longueur moyenne avant: ${Math.round(totalLenBefore / raw.length)} car`);
  console.log(`Longueur moyenne apres: ${Math.round(totalLenAfter / raw.length)} car`);
  console.log('---');
  console.log('Distribution des longueurs apres nettoyage :');
  const buckets = { '<=20': 0, '21-30': 0, '31-40': 0, '41-60': 0, '>60': 0 };
  for (const e of cleaned) {
    const l = e.n.length;
    if (l <= 20) buckets['<=20']++;
    else if (l <= 30) buckets['21-30']++;
    else if (l <= 40) buckets['31-40']++;
    else if (l <= 60) buckets['41-60']++;
    else buckets['>60']++;
  }
  for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(6)} : ${v}`);

  // Ecriture
  fs.writeFileSync(DST, JSON.stringify(cleaned));
  fs.writeFileSync(SAMPLE, JSON.stringify(sample, null, 2));
  fs.writeFileSync(HARD, JSON.stringify(hard, null, 2));

  console.log('---');
  console.log(`Ecrit : ${DST}`);
  console.log(`Echantillon avant/apres : ${SAMPLE}`);
  console.log(`Cas a relire (>35 car) : ${HARD} (${hard.length} entrees)`);
}

run();
