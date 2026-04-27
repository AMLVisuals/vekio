/**
 * Test de l'algo de recherche v2 (avec familles culinaires + composes + dedupe).
 */

const path = require('path');
const fs = require('fs');

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'lib', 'ciqual-data.json'), 'utf-8')
);

// Parser stars depuis aliments-base.ts
const aliBaseTs = fs.readFileSync(
  path.join(__dirname, '..', 'lib', 'aliments-base.ts'),
  'utf-8'
);
const stars = [];
const lineRegex = /name:\s*'((?:[^'\\]|\\.)+)'/g;
let m;
while ((m = lineRegex.exec(aliBaseTs))) {
  stars.push(m[1].replace(/\\(.)/g, '$1'));
}

const STOP_WORDS = new Set(['de', 'du', 'la', 'le', 'et', 'ou', 'a', 'au', 'aux', 'des', 'en', 'un', 'une']);

const COOKING_FAMILIES = {
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

const WORD_TO_FAMILY = new Map();
for (const [fname, words] of Object.entries(COOKING_FAMILIES)) {
  for (const w of words) WORD_TO_FAMILY.set(w, fname);
}

const EXCLUSIVE_COMPOUNDS = ['pomme de terre', 'patate douce'];

function wordVariants(w) {
  if (w.length < 4) return [w];
  if (w.endsWith('s')) return [w, w.slice(0, -1)];
  return [w, w + 's'];
}
function containsWholeWord(text, word) {
  return new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`).test(text);
}
function textContainsAnyVariant(text, word) {
  return wordVariants(word).some(v => containsWholeWord(text, v));
}

const MODIFIERS = ['bio', 'label rouge', 'label bleu', 'aop', 'aoc', 'igp', 'fermier',
  'pasteurise', 'pasteurisee', 'sterilise', 'sterilisee',
  'standard', 'industriel', 'industrielle',
  'allege en matiere grasse', 'allege', 'allegee'];

function normalize(t) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function familyPresentInText(fname, text) {
  const ws = COOKING_FAMILIES[fname];
  if (!ws) return false;
  return ws.some(w => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(text));
}

function countMatches(words, nameNorm, searchNorm) {
  let direct = 0, syn = 0, inSearch = 0, opp = false;
  for (const w of words) {
    if (textContainsAnyVariant(nameNorm, w)) { direct++; continue; }
    const f = WORD_TO_FAMILY.get(w);
    if (f && familyPresentInText(f, nameNorm)) { syn++; continue; }
    if (textContainsAnyVariant(searchNorm, w)) { inSearch++; continue; }
    if (f && familyPresentInText(f, searchNorm)) { inSearch++; continue; }
  }
  for (const w of words) {
    const f = WORD_TO_FAMILY.get(w);
    if (!f) continue;
    for (const f2 of Object.keys(COOKING_FAMILIES)) {
      if (f2 === f) continue;
      if (familyPresentInText(f2, nameNorm)) { opp = true; break; }
    }
    if (opp) break;
  }
  return { direct, syn, inSearch, opp, total: direct + syn + inSearch };
}

function compoundConflict(qn, nameNorm) {
  for (const c of EXCLUSIVE_COMPOUNDS) {
    if (nameNorm.includes(c) && !qn.includes(c)) return true;
  }
  return false;
}

function scoreEntry(name, search, qn, words, transformed, star) {
  const nameNorm = normalize(name);
  const searchNorm = normalize(search);
  const m = countMatches(words, nameNorm, searchNorm);
  const missing = words.length - m.total;
  let s = 0;
  s += m.direct * 100;
  s += m.syn * 70;
  s += m.inSearch * 50;
  s -= missing * 60;
  if (m.opp) s -= 120;
  if (nameNorm === qn) s += 1000;
  if (nameNorm.startsWith(qn)) s += 300;
  const allInName = (m.direct + m.syn) === words.length;
  if (allInName) s += 150;
  if (allInName && words.length > 1) {
    let cur = 0, ok = true;
    for (const w of words) {
      const idx = nameNorm.indexOf(w, cur);
      if (idx === -1) { ok = false; break; }
      cur = idx + w.length;
    }
    if (ok) s += 80;
  }
  if (nameNorm.length <= 20) s += 50;
  else if (nameNorm.length <= 30) s += 25;
  else if (nameNorm.length > 50) s -= 30;
  if (star) s += 200;
  if (transformed) s -= 80;
  return s;
}

function dedupeKey(name) {
  let n = normalize(name);
  for (const mod of MODIFIERS) {
    n = n.replace(new RegExp(`\\s*,\\s*${mod}(\\s*,|$)`, 'g'), '$1');
    n = n.replace(new RegExp(`\\s+${mod}\\b`, 'g'), '');
  }
  return n.replace(/\s*,\s*$/, '').trim();
}

function search(query) {
  const qn = normalize(query.trim());
  const all = qn.split(/\s+/).filter(w => w.length > 1);
  const disc = all.filter(w => !STOP_WORDS.has(w));
  const wfs = disc.length > 0 ? disc : all;
  if (!wfs.length) return [];
  const minMatch = wfs.length >= 3 ? 2 : 1;

  const scored = [];
  function consider(name, searchText, source, transformed, star) {
    const nameNorm = normalize(name);
    if (compoundConflict(qn, nameNorm)) return;
    const m = countMatches(wfs, nameNorm, normalize(searchText));
    const matchedInName = m.direct + m.syn;
    if (matchedInName + m.inSearch < minMatch) return;
    if (wfs.length >= 3 && matchedInName < 2) return;
    const s = scoreEntry(name, searchText, qn, wfs, transformed, star);
    scored.push({ name, source, score: s, opp: m.opp });
  }

  for (const star of stars) consider(star, star, 'STAR', false, true);
  for (const e of data) consider(e.n, e.s, e.t === 1 ? 'CIQ-T' : 'CIQ', e.t === 1, false);

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const out = [];
  for (const r of scored) {
    if (r.score < 0) break;
    const key = dedupeKey(r.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= 8) break;
  }
  return out;
}

const queries = [
  'filet de poulet cuit',
  'filet de poulet cru',
  'filet de poulet',
  'poulet roti',
  'pomme',
  'pomme de terre',
  'fromage blanc',
  'haricots verts',
  'haricots',
  'lait',
  'lait amande',
  'pates',
  'riz cuit',
  'riz cru',
  'saumon',
  'saumon fume',
  'oeuf',
  'oeuf dur',
  'yaourt nature',
  'pizza',
  'croissant',
];

for (const q of queries) {
  const r = search(q);
  console.log(`\n>>> "${q}"`);
  if (!r.length) { console.log('  (aucun resultat)'); continue; }
  r.forEach((x, i) => {
    const tag = x.source.padEnd(6);
    const sc = String(x.score).padStart(5);
    const opp = x.opp ? ' OPP' : '';
    console.log(`  ${(i + 1).toString().padStart(2)}. [${tag}] ${sc}${opp}  ${x.name}`);
  });
}
