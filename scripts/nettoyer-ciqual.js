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

// On part TOUJOURS de l'original pour ne pas degrader le champ `s` (recherche)
// au fil des relances. Le `s` est reconstruit a chaque passe depuis le nom brut.
const SRC = path.join(__dirname, '..', 'lib', 'ciqual-data.original.json');
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
  // Ajouts cycle 2 : provenance, exemples, etat fruit, etc.
  /\s*\(ex\s*:[^)]+\)/gi,
  /\s*\(produit en (France|Suisse|Allemagne|Belgique|Italie|Espagne|Pays-Bas)\)/gi,
  /\s*\(degré d'alcool variable\)/gi,
  /\s*\(arôme inconnu\)/gi,
  /\s*\(fruit (mûr|vert)\)/gi,
  /\s*\(variété hybride\)/gi,
  // Noms scientifiques : (Genus species [...]) ou listes type "L., merr, var.,..."
  // Heuristique : 1er mot avec majuscule + 4+ lettres, puis 1 a 5 mots/abrev.
  /\s*\([A-Z][a-zà-ÿ]{3,}(\.|\s+(?:[a-zà-ÿ]+|L\.|merr|spp\.|var\.|subsp\.|f\.))+[^)]*\)/g,
  // Parenthese fermante orpheline en fin de chaine (cas "Ananas comosus (L.) merr var. Queen)")
  /\s+[A-Z][a-zà-ÿ]+(?:\s+[a-zà-ÿ]+)*\s*\([^)]*\)[^()]*\)\s*$/g,
  // Cycle 3 : parentheses jus (variantes courtes non couvertes par la regle generique)
  /\s*\(à moins de 10\s*%\s*de jus\)/gi,
  /\s*\(de 10 à 50\s*%\s*de jus\)/gi,
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
  // Cycle 2 : vitamines/mineraux (toutes variantes etendues)
  'enrichi à la vitamine d', 'enrichie à la vitamine d',
  'enrichi en calcium et vitamine d', 'enrichie en calcium et vitamine d',
  'enrichi ou restauré en vitamines ou minéraux',
  'enrichie ou restaurée en vitamines ou minéraux',
  'enrichis ou restaurés en vitamines ou minéraux',
  'enrichies ou restaurées en vitamines ou minéraux',
  'enrichi et/ou restauré en vitamines et/ou minéraux',
  'enrichie et/ou restaurée en vitamines et/ou minéraux',
  'enrichi en vitamines', 'enrichie en vitamines',
  'enrichi en calcium', 'enrichie en calcium',
  // Cycle 2 : probiotiques / additifs marketing
  'aux esters de stérol végétal', 'aux esters de stérol',
  'au l casei', 'au l. casei',
  'au bifidus',
  // Cycle 2 : edulcorants / allege (decision utilisateur : couper)
  'avec édulcorants', 'avec édulcorant',
  'allégé en sucres', 'allégée en sucres', 'allégés en sucres', 'allégées en sucres',
  'allégé en sucre', 'allégée en sucre',
  // Cycle 2 : provenance Reunion / Guadeloupe
  'prélevé à la réunion', 'prélevée à la réunion',
  'prélevés à la réunion', 'prélevées à la réunion',
  'prélevé à la guadeloupe', 'prélevée à la guadeloupe',
  'prélevés à la guadeloupe', 'prélevées à la guadeloupe',
  // Cycle 2 : format / conditionnement
  'prêt à boire', 'prête à boire',
  'instantané', 'instantanée',
  // Cycle 2 : composition implicite
  'non allégé en mg', 'non allégée en mg',
  'au lait partiellement écrémé', 'au lait partiellement écrémée',
  'au lait demi-écrémé standard', 'au lait demi-écrémé',
  // Cycle 2 : coquille presente dans la base Ciqual
  'prémeballé', 'prémeballée',
  // Cycle 3 : variante coquille + tags supplementaires
  'prémballé', 'prémballée', 'prémballés', 'prémballées',
  'et assimilés', 'et assimilées', 'et assimilé', 'et assimilée',
  'teneur en matière grasse inconnue',
  'teneur en mg inconnue',
  'sans édulcorant', 'sans édulcorants',
  'au lait pasteurisé', 'au lait pasteurisée',
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
// Etape 4 : substitutions de phrases stereotypees (prefixes longs)
// Ciqual utilise des formules redondantes ("Yaourt, lait fermente ou specialite
// laitiere", "Matiere grasse vegetale (type margarine)"...). On les ramene a
// leur version courante.
// -----------------------------------------------------------------------------
const PHRASE_REPLACEMENTS = [
  // Margarines
  [/^Matière grasse végétale \(type margarine\),?\s*à tartiner/i, 'Margarine à tartiner'],
  [/^Matière grasse végétale \(type margarine\)/i, 'Margarine'],
  // Fromages
  [/^Spécialité fromagère non affinée à tartiner/i, 'Fromage à tartiner'],
  [/^Spécialité fromagère non affinée/i, 'Fromage frais'],
  [/^Fromage rond à pâte molle et croûte fleurie/i, 'Fromage à pâte molle'],
  // Yaourts / produits laitiers
  [/^Yaourt, lait fermenté ou spécialité laitière/i, 'Yaourt'],
  [/^Lait fermenté ou spécialité laitière type yaourt/i, 'Yaourt'],
  [/^Lait fermenté ou spécialité laitière/i, 'Yaourt à boire'],
  [/^Fromage blanc ou spécialité laitière/i, 'Fromage blanc'],
  [/^Boisson lactée, lait fermenté ou yaourt à boire/i, 'Yaourt à boire'],
  // Boissons lactees aromatisees
  [/^Boisson lactée aromatisée au /i, 'Boisson lactée '],
  [/^Boisson lactée aromatisée à la /i, 'Boisson lactée '],
  [/^Boisson lactée aromatisée à l'/i, "Boisson lactée "],
  [/^Boisson lactée aromatisée/i, 'Boisson lactée'],
  // Sirops / boissons a diluer
  [/^Boisson préparée à partir de boisson concentrée à diluer/i, 'Boisson à diluer'],
  [/^Boisson préparée à partir de sirop à diluer/i, 'Sirop à diluer'],
  // Plats
  [/^Substitut de repas hypocalorique/i, 'Substitut de repas'],
  [/^Pomme de terre, purée à base de flocons, reconstituée[^,]*/i, 'Purée de pomme de terre'],
  // "environ XX% MG" -> "XX% MG" (garde l'info nutritionnelle, vire le mot inutile)
  [/\benviron\s+(\d)/gi, '$1'],
  // -------------------------------------------------------------------------
  // Cycle 3 : classification fromagere technique -> langue courante
  // -------------------------------------------------------------------------
  [/à pâte molle non pressée non cuite croûte naturelle/gi, 'à pâte molle'],
  [/à pâte molle non pressée non cuite/gi, 'à pâte molle'],
  [/à pâte pressée cuite/gi, 'à pâte dure'],
  [/à pâte pressée non cuite/gi, 'à pâte mi-dure'],
  [/à pâte persillée/gi, 'persillé'],
  // -------------------------------------------------------------------------
  // Cycle 3 : "type X ou Y ou Z" -> "type X" (garde la 1re reference)
  // S'applique au milieu d'une chaine, avant prochaine virgule ou fin.
  // -------------------------------------------------------------------------
  [/\btype\s+([^,]+?)\s+ou\s+[^,]+?(,|$)/gi, 'type $1$2'],
  // -------------------------------------------------------------------------
  // Cycle 3 : enumerations a 3+ alternatives "X, ou Y, ou Z[, ou W...]"
  // On garde le 1er + le 2e, on coupe le reste.
  // Cas particuliers de poissons / produits exotiques nommes.
  // -------------------------------------------------------------------------
  [/^Sébaste du nord[^,]*,?\s*ou[^,]*(,?\s*ou[^,]*)+/i, 'Sébaste'],
  [/^Brèdes chou de Chine ou bok choy ou pak choï/i, 'Brèdes (chou de Chine)'],
  [/^Mont d'or ou Vacherin du Haut-Doubs[^]*Vacherin-?Mont d'Or[^]*$/i, "Mont d'or"],
  // Generique : ", ou X, ou Y[, ou Z...]" en fin de portion -> couper a partir de la 2e "ou"
  [/(,\s*ou\s+[^,]+),\s*ou\s+[^,]+(,\s*ou\s+[^,]+)*/gi, '$1'],
  // -------------------------------------------------------------------------
  // Cycle 3 : porc/boeuf descriptions techniques de hachage
  // -------------------------------------------------------------------------
  [/^Porc, ([\w\s]+?) sans jarret, sans bateau, découenné, dégraissé, désossé/i, 'Porc, $1'],
  [/^Haché à base de boeuf ou Préparation de viande hachée de boeuf/i, 'Boeuf haché'],
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

  // 1d. Substitution de phrases stereotypees (avant l'etape tags pour beneficier
  // ensuite des suppressions de virgules)
  for (const [re, rep] of PHRASE_REPLACEMENTS) s = s.replace(re, rep);

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
