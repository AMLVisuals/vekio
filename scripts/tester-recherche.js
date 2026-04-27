/**
 * Test du nouvel algo de recherche (scoring tolerant).
 * Reproduit la logique de lib/ciqual.ts en JS pur.
 */

const path = require('path');
const fs = require('fs');

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'lib', 'ciqual-data.json'), 'utf-8')
);

const aliBaseTs = fs.readFileSync(
  path.join(__dirname, '..', 'lib', 'aliments-base.ts'),
  'utf-8'
);
const stars = [];
// Regex qui gere les apostrophes echappees dans 'Lait d\'amande'
const lineRegex = /name:\s*'((?:[^'\\]|\\.)+)'/g;
let m;
while ((m = lineRegex.exec(aliBaseTs))) {
  // Decoder les sequences echappees ('\'' -> "'", '\\' -> '\')
  const decoded = m[1].replace(/\\(.)/g, '$1');
  stars.push(decoded);
}

const STOP_WORDS = new Set(['de', 'du', 'la', 'le', 'et', 'ou', 'a', 'au', 'aux', 'des', 'en']);

function normalize(t) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function score(displayName, searchText, queryNormalized, queryWords, isTransformed, isStar) {
  const nameNorm = normalize(displayName);
  const searchNorm = normalize(searchText);
  let s = 0;

  let mn = 0, ms = 0;
  for (const w of queryWords) {
    if (nameNorm.includes(w)) mn++;
    else if (searchNorm.includes(w)) ms++;
  }
  const missing = queryWords.length - mn - ms;
  s += mn * 100;
  s += ms * 60;
  s -= missing * 40;

  if (nameNorm === queryNormalized) s += 1000;
  if (nameNorm.startsWith(queryNormalized)) s += 300;

  const allInName = mn === queryWords.length;
  if (allInName) s += 150;
  if (allInName && queryWords.length > 1) {
    let cur = 0, ok = true;
    for (const w of queryWords) {
      const idx = nameNorm.indexOf(w, cur);
      if (idx === -1) { ok = false; break; }
      cur = idx + w.length;
    }
    if (ok) s += 80;
  }

  if (nameNorm.length <= 20) s += 50;
  else if (nameNorm.length <= 30) s += 25;
  else if (nameNorm.length > 50) s -= 30;

  if (isStar) s += 200;
  if (isTransformed) s -= 80;
  return s;
}

function search(query) {
  const qn = normalize(query.trim());
  const all = qn.split(/\s+/).filter((w) => w.length > 1);
  const disc = all.filter((w) => !STOP_WORDS.has(w));
  const wfs = disc.length > 0 ? disc : all;
  if (!wfs.length) return [];

  const hasAny = (h) => wfs.some((w) => h.includes(w));
  const scored = [];

  for (const star of stars) {
    const n = normalize(star);
    if (!hasAny(n)) continue;
    scored.push({ name: star, source: 'STAR', score: score(star, star, qn, wfs, false, true) });
  }
  for (const e of data) {
    const n = normalize(e.n);
    const s = normalize(e.s);
    if (!hasAny(n) && !hasAny(s)) continue;
    scored.push({
      name: e.n,
      source: e.t === 1 ? 'CIQ-T' : 'CIQ',
      score: score(e.n, e.s, qn, wfs, e.t === 1, false),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const out = [];
  for (const r of scored) {
    if (r.score < 0) break;
    const k = normalize(r.name);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
    if (out.length >= 8) break;
  }
  return out;
}

const queries = [
  // Anciens tests
  'filet de poulet cuit', 'yaourt nature', 'pomme', 'saumon',
  // Nouveautes : petits-dej
  'croissant', 'pain au chocolat', 'brioche', 'porridge', 'cornflakes',
  // Nouveautes : plats
  'pizza', 'pates carbonara', 'lasagnes', 'hamburger', 'sandwich jambon',
  'quiche lorraine', 'taboule', 'sushi',
  // Nouveautes : fromages
  'camembert', 'comte', 'feta', 'parmesan',
  // Nouveautes : fruits
  'poire', 'cerise', 'framboise', 'ananas', 'melon',
  // Nouveautes : legumes
  'aubergine', 'artichaut', 'asperges', 'poireau',
  // Nouveautes : boissons
  'cafe', 'cafe au lait', 'jus orange', 'coca', 'the vert',
  // Nouveautes : snacks
  'chips', 'cookies', 'glace vanille', 'nutella', 'confiture',
  // Cas tordus
  'lait amande', 'lait soja', 'kefir', 'edamame',
];

for (const q of queries) {
  const r = search(q);
  console.log(`\n>>> "${q}"`);
  if (!r.length) { console.log('  (aucun resultat)'); continue; }
  r.forEach((x, i) => {
    const tag = x.source.padEnd(6);
    const sc = String(x.score).padStart(5);
    console.log(`  ${(i + 1).toString().padStart(2)}. [${tag}] ${sc}  ${x.name}`);
  });
}
