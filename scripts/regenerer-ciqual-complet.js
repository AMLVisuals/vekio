/**
 * Regenere lib/ciqual-data.json depuis le xls ANSES Ciqual 2020 en gardant
 * les 8 micronutriments en plus des 3 macros + kcal.
 *
 * Source : scripts/ciqual-source/Ciqual-2020.xls (telecharge depuis ciqual.anses.fr)
 *
 * Sortie format compact :
 *   c  : code ("ciq-XXXXX")
 *   n  : nom court (re-utilise depuis l'ancien json si dispo)
 *   s  : texte de recherche
 *   t  : 1 si transforme (re-utilise depuis l'ancien json)
 *   k  : kcal
 *   p  : proteines (g)
 *   g  : glucides (g)
 *   l  : lipides (g)
 *   fb : fibres (g)
 *   sc : sucres totaux (g)
 *   sa : AG satures (g)
 *   ch : cholesterol (mg)
 *   so : sodium (mg)
 *   ca : calcium (mg)
 *   fe : fer (mg)
 *   po : potassium (mg)
 *
 * Les champs nutritionnels sont omis quand absents (reduit la taille du fichier).
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const SRC = path.join(__dirname, 'ciqual-source', 'Ciqual-2020.xls');
const OUT = path.join(__dirname, '..', 'lib', 'ciqual-data.json');
// Priorite : backup pre-micros (noms courts originaux) sinon le fichier courant
const BAK = path.join(__dirname, '..', 'lib', 'ciqual-data.json.before-micros.bak');
const OLD = fs.existsSync(BAK) ? BAK : OUT;

// Indices de colonnes du fichier Ciqual 2020 (verifies au prealable)
const COL = {
  code: 6,
  nom: 7,
  kcal: 10,        // Energie UE 1169
  proteines: 14,   // N x facteur Jones
  glucides: 16,
  lipides: 17,
  sucres: 18,
  fibres: 26,
  ags: 31,
  cholesterol: 48, // mg
  calcium: 50,     // mg
  fer: 53,         // mg
  potassium: 58,   // mg
  sodium: 60,      // mg
};

// ---------------------------------------------------------------------------
// Parsing valeurs Ciqual : decimale virgule FR, "traces" -> 0, "< X" -> X
// ---------------------------------------------------------------------------
function parseValue(raw) {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === '' || s === '-') return null;
  if (s.toLowerCase() === 'traces') return 0;
  // "< 0,3" -> borne haute 0.3
  const inf = s.match(/^<\s*([0-9]+(?:[.,][0-9]+)?)$/);
  if (inf) return Number(inf[1].replace(',', '.'));
  // Valeur numerique standard
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Arrondi a 1 decimale pour les g, entier pour les mg
function round1(n) {
  if (n === null || n === undefined) return null;
  return Math.round(n * 10) / 10;
}
function roundInt(n) {
  if (n === null || n === undefined) return null;
  return Math.round(n);
}

// ---------------------------------------------------------------------------
// Charge l'ancien json pour preserver n, s, t (deja nettoyes)
// ---------------------------------------------------------------------------
function loadOld() {
  if (!fs.existsSync(OLD)) return new Map();
  try {
    const data = JSON.parse(fs.readFileSync(OLD, 'utf8'));
    const map = new Map();
    for (const e of data) {
      if (e.c) map.set(e.c, { n: e.n, s: e.s, t: e.t });
    }
    return map;
  } catch (e) {
    console.warn('Impossible de charger l\'ancien json:', e.message);
    return new Map();
  }
}

// ---------------------------------------------------------------------------
// Normalise un nom brut pour le champ de recherche (sans accents, lower)
// ---------------------------------------------------------------------------
function normalizeSearch(nom) {
  return nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ---------------------------------------------------------------------------
// Nettoyage des noms Ciqual : retrait du jargon ", pulpe", ", pulpe et peau"
// et fusion du qualificatif final (cru/cuit/seche/...) avec un espace.
// "Banane, pulpe, crue" -> "Banane crue"
// "Pomme Golden, pulpe et peau, crue" -> "Pomme Golden crue"
// "Tomate, pulpe" -> "Tomate"
// "Sandwich pain de mie, garnitures diverses" -> inchange
// ---------------------------------------------------------------------------
const QUALIFIERS = 'cru|crue|crus|crues|cuit|cuite|cuits|cuites|frais|fraiche|fraiches|sec|seche|seches|sechee|sechees|fume|fumee|fumes|fumees|grille|grillee|grilles|grillees|roti|rotie|rotis|roties|sale|salee|sales|salees|surgelee|surgele|surgeles|surgelees|bouillie|bouilli|bouillies|frit|frite|frits|frites';
function cleanName(name) {
  let n = name
    // "Banane, pulpe et peau, crue" -> "Banane, crue"
    .replace(/,\s*pulpe et peau,/gi, ',')
    // "Banane, pulpe, crue" -> "Banane, crue"
    .replace(/,\s*pulpe,/gi, ',')
    // "Tomate, pulpe" en fin -> "Tomate"
    .replace(/,\s*pulpe\s*$/gi, '')
    // Nettoie les doubles virgules
    .replace(/,\s*,/g, ',')
    .replace(/,\s*$/, '')
    .trim();
  // Si finit par ", crue" / ", cuit" etc. -> espace au lieu de virgule
  const re = new RegExp(`,\\s*(${QUALIFIERS})\\b`, 'i');
  n = n.replace(re, ' $1');
  return n.trim();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log('Lecture du xls...');
  const wb = XLSX.readFile(SRC);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  console.log('Total lignes:', rows.length, '(1 entete + aliments)');

  const oldMap = loadOld();
  console.log('Anciens noms nettoyes charges:', oldMap.size);

  const out = [];
  let skipped = 0;
  let withMicros = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const codeNum = row[COL.code];
    const nomBrut = row[COL.nom];
    if (!codeNum || !nomBrut) {
      skipped++;
      continue;
    }
    const code = `ciq-${codeNum}`;

    // Recupere les valeurs nutritionnelles
    const kcalRaw = parseValue(row[COL.kcal]);
    const protRaw = parseValue(row[COL.proteines]);
    const glucRaw = parseValue(row[COL.glucides]);
    const lipRaw  = parseValue(row[COL.lipides]);

    // Exclusion stricte : si un seul macro est absent on saute. Ciqual a des
    // aliments avec gluc='-' ou prot='-' qui faussent completement les chiffres
    // (ex: pomme cajou aurait kcal=4 et gluc=0 a cause du fallback Atwater).
    // On prefere une base plus petite mais fiable.
    if (protRaw === null || glucRaw === null || lipRaw === null) {
      skipped++;
      continue;
    }

    const prot = round1(protRaw);
    const gluc = round1(glucRaw);
    const lip  = round1(lipRaw);
    // Si Ciqual n'a pas l'energie, on l'estime via Atwater (4P + 4G + 9L).
    // Couvre les ~28% d'aliments avec kcal absent mais macros completes.
    const kcal = roundInt(kcalRaw !== null ? kcalRaw : prot * 4 + gluc * 4 + lip * 9);

    // Micros
    const fb = round1(parseValue(row[COL.fibres]));
    const sc = round1(parseValue(row[COL.sucres]));
    const sa = round1(parseValue(row[COL.ags]));
    const ch = roundInt(parseValue(row[COL.cholesterol]));
    const so = roundInt(parseValue(row[COL.sodium]));
    const ca = roundInt(parseValue(row[COL.calcium]));
    const fe = round1(parseValue(row[COL.fer]));
    const po = roundInt(parseValue(row[COL.potassium]));

    if (fb !== null || sc !== null || sa !== null || ch !== null || so !== null) {
      withMicros++;
    }

    // Reutilise n, s, t de l'ancien json si dispo, sinon prend le nom brut.
    // Dans tous les cas on passe par cleanName() pour retirer le jargon Ciqual.
    const old = oldMap.get(code);
    const n = cleanName(old?.n ?? String(nomBrut).trim());
    const s = old?.s ?? normalizeSearch(String(nomBrut));
    const t = old?.t;

    const entry = { c: code, n, s, k: kcal, p: prot, g: gluc, l: lip };
    if (t === 1) entry.t = 1;
    if (fb !== null) entry.fb = fb;
    if (sc !== null) entry.sc = sc;
    if (sa !== null) entry.sa = sa;
    if (ch !== null) entry.ch = ch;
    if (so !== null) entry.so = so;
    if (ca !== null) entry.ca = ca;
    if (fe !== null) entry.fe = fe;
    if (po !== null) entry.po = po;
    out.push(entry);
  }

  console.log(`Aliments produits: ${out.length}`);
  console.log(`Avec au moins un micro: ${withMicros}`);
  console.log(`Sautes (incomplets): ${skipped}`);

  // Sauvegarde l'ancien fichier au cas ou
  const backup = OUT + '.before-micros.bak';
  if (fs.existsSync(OUT) && !fs.existsSync(backup)) {
    fs.copyFileSync(OUT, backup);
    console.log('Backup de l\'ancien json:', backup);
  }

  fs.writeFileSync(OUT, JSON.stringify(out));
  const stats = fs.statSync(OUT);
  console.log(`Ecrit ${OUT} (${(stats.size / 1024).toFixed(0)} kB)`);
}

main();
