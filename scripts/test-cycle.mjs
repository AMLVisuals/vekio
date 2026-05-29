// Validation pure-JS de la logique cycle menstruel (miroir de lib/nutrition.ts).
// Sert juste a montrer que calculateNeeds produit les bons resultats avant un test device.

const BONUS_LUTEALE = 150;

const FACTEUR_BASE = { 1: 1.32, 2: 1.42, 3: 1.52, 4: 1.62, 5: 1.70, 6: 1.78, 7: 1.85 };
const BONUS_SECONDAIRE = { 1: 0.04, 2: 0.06, 3: 0.08, 4: 0.09, 5: 0.10, 6: 0.11, 7: 0.12 };
const KCAL_VITESSE = { 0.25: 275, 0.5: 550, 0.75: 825 };

function calcBMR(p) {
  const base = 10 * p.poids + 6.25 * p.taille - 5 * p.age;
  return p.sexe === 'homme' ? base + 5 : base - 161;
}

function calcFacteurActivite(sports) {
  const reels = sports.filter((s) => s.type !== 'aucun');
  if (reels.length === 0) return 1.2;
  const sorted = [...reels].sort((a, b) => b.frequence - a.frequence);
  let f = FACTEUR_BASE[sorted[0].frequence];
  for (let i = 1; i < sorted.length; i++) f += BONUS_SECONDAIRE[sorted[i].frequence];
  return Math.min(f, 1.9);
}

function calcCycle(p, now = new Date()) {
  if (p.sexe !== 'femme' || !p.cycleActif || !p.cycleDernieresRegles) {
    return { phase: null, jour: null, bonus: 0 };
  }
  const duree = p.cycleDureeJours ?? 28;
  const joursEcoules = Math.floor((now - p.cycleDernieresRegles) / 86400000);
  if (joursEcoules < 0) return { phase: null, jour: null, bonus: 0 };
  const jourCycle = (joursEcoules % duree) + 1;
  let phase;
  if (jourCycle <= 5) phase = 'menstruelle';
  else if (jourCycle >= duree - 13 && jourCycle <= duree - 11) phase = 'ovulation';
  else if (jourCycle > duree - 11) phase = 'luteale';
  else phase = 'folliculaire';
  return { phase, jour: jourCycle, bonus: phase === 'luteale' ? BONUS_LUTEALE : 0 };
}

function calculateNeeds(p) {
  const bmr = calcBMR(p);
  const facteur = calcFacteurActivite(p.sports);
  const tdee = bmr * facteur;
  const cycle = calcCycle(p);
  const delta = p.objectif === 'maintien' ? 0 : (p.objectif === 'perte' ? -KCAL_VITESSE[p.vitesse ?? 0.5] : +KCAL_VITESSE[p.vitesse ?? 0.5]);
  const calories = Math.round(tdee + delta + cycle.bonus);
  // Proteines : 2.2 g/kg en perte
  const coefP = p.objectif === 'perte' ? 2.2 : (p.objectif === 'prise' ? 2.2 : 1.6);
  const proteines_g = Math.round(coefP * p.poids);
  // Lipides : 30% AET
  const lipides_g = Math.round(calories * 0.30 / 9);
  // Glucides : reste
  const glucides_g = Math.round((calories - proteines_g * 4 - lipides_g * 9) / 4);
  return { calories, proteines_g, glucides_g, lipides_g, bmr: Math.round(bmr), tdee: Math.round(tdee), phaseCycle: cycle.phase, jourCycle: cycle.jour, bonusCalorieLuteale: cycle.bonus };
}

const profileBase = {
  sexe: 'femme', age: 28, poids: 65, taille: 168,
  objectif: 'perte', vitesse: 0.5,
  sports: [{ type: 'musculation', frequence: 3 }],
};

function daysAgo(n) { return new Date(Date.now() - n * 86400000); }

console.log('=== Profil : Femme 28 ans, 65 kg, 168 cm, perte 0.5 kg/sem, muscu 3x/sem ===\n');

const cases = [
  ['SANS CYCLE   ', {}],
  ['J1 (regles)  ', { cycleActif: true, cycleDernieresRegles: daysAgo(0), cycleDureeJours: 28 }],
  ['J8 (folli)   ', { cycleActif: true, cycleDernieresRegles: daysAgo(7), cycleDureeJours: 28 }],
  ['J15 (ovul)   ', { cycleActif: true, cycleDernieresRegles: daysAgo(14), cycleDureeJours: 28 }],
  ['J22 (luteale)', { cycleActif: true, cycleDernieresRegles: daysAgo(21), cycleDureeJours: 28 }],
  ['J28 (luteale)', { cycleActif: true, cycleDernieresRegles: daysAgo(27), cycleDureeJours: 28 }],
  ['J22 cycle 35j', { cycleActif: true, cycleDernieresRegles: daysAgo(21), cycleDureeJours: 35 }],
  ['HOMME +cycle ', { sexe: 'homme', cycleActif: true, cycleDernieresRegles: daysAgo(21), cycleDureeJours: 28 }],
];

console.log('Cas             | Calories | Phase        | Jour | Bonus');
console.log('----------------|----------|--------------|------|------');
let base = null;
for (const [label, override] of cases) {
  const r = calculateNeeds({ ...profileBase, ...override });
  if (label.startsWith('SANS')) base = r.calories;
  const phaseStr = (r.phaseCycle ?? '-').padEnd(12);
  console.log(`${label} | ${String(r.calories).padStart(8)} | ${phaseStr} | ${String(r.jourCycle ?? '-').padStart(4)} | ${r.bonusCalorieLuteale}`);
}

console.log('\n=== Verifications ===');
const luteale = calculateNeeds({ ...profileBase, cycleActif: true, cycleDernieresRegles: daysAgo(21), cycleDureeJours: 28 });
const sansLuteale = calculateNeeds(profileBase);
const diff = luteale.calories - sansLuteale.calories;
console.log(`Delta luteale vs sans cycle  : ${diff} kcal  ${diff === 150 ? 'OK' : 'BUG'} (attendu 150)`);
const homme = calculateNeeds({ ...profileBase, sexe: 'homme', cycleActif: true, cycleDernieresRegles: daysAgo(21), cycleDureeJours: 28 });
console.log(`Homme ignore cycle           : phase=${homme.phaseCycle}  ${homme.phaseCycle === null ? 'OK' : 'BUG'}`);
const menstruelle = calculateNeeds({ ...profileBase, cycleActif: true, cycleDernieresRegles: daysAgo(2), cycleDureeJours: 28 });
console.log(`J3 = menstruelle             : phase=${menstruelle.phaseCycle}  ${menstruelle.phaseCycle === 'menstruelle' ? 'OK' : 'BUG'}`);
const ovulation = calculateNeeds({ ...profileBase, cycleActif: true, cycleDernieresRegles: daysAgo(14), cycleDureeJours: 28 });
console.log(`J15 = ovulation              : phase=${ovulation.phaseCycle}  ${ovulation.phaseCycle === 'ovulation' ? 'OK' : 'BUG'}`);
