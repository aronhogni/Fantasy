/* ============================================================
   RÖÐUNARSKOR FYRIR TILLÖGUR — 32 inntök, mælt á 5 tímabilum

   HVERS VEGNA SÉR SKOR OG EKKI BARA "VÆNT STIG":
   tests/exp-points.mjs sýndi að RÖÐUN og STÆRÐ eru tvö ólík störf. Að
   auka leikja-næmið bætti röðun en gaf 13–27% NEGATÍF vænt stig og verri
   MAE. Þess vegna: birt tala (`≈4,8 stig`) heldur sinni kvörðun, og
   tillögur raðast eftir SÉR skori sem er fitted til að RAÐA.

   VIÐMIÐIN SEM ÞARF AÐ SLÁ — og það þriðja er það erfiða:
     1. eigin stig/leik (það sem flestir nota í hausnum)
     2. aðferð appsins: base × FFDR-margfaldari
     3. **xP FRÁ FPL SJÁLFU** — þeirra eigið vænt stig fyrir umferðina.
        Þetta er hörðasta viðmiðið: FPL hefur leikmannagögn sem við höfum
        ekki og þeirra tala er þegar leikja-aðlöguð. Ef okkar skor slær
        hana ekki, þá er það ekki þess virði.

   MÆLIKVARÐINN ER ÁKVÖRÐUNIN: raunstig þeirra 15 (og 5) sem skorið
   valdi í hverri umferð — ekki r, sem er óháð því hvort réttu mennirnir
   endi á toppnum.

   TÍMA-HEIÐARLEIKI: sjá lib/panel.mjs. LOSO á tímabilum.
   ============================================================ */
import { corr } from "./lib/e0.mjs";
import {
  buildPanel, FEATURES, POSN, fitRidge, design, losoPredict, spearman, topN,
} from "./lib/panel.mjs";
import { lookupPos, POS_MEAN_PTS } from "../src/model.js";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

const rows = buildPanel();
const SEASN = [...new Set(rows.map(r => r.season))].sort();
const y = rows.map(r => r.pts);
console.log(`\n${"=".repeat(84)}`);
console.log(`RÖÐUNARSKOR — ${rows.length} leikmanna-umferðir · ${SEASN.length} tímabil · ${FEATURES.length} inntök`);
console.log("=".repeat(84));
ok(rows.length > 20000, `nóg gögn (${rows.length})`);
ok(FEATURES.length >= 30, `${FEATURES.length} inntök mæld`);

/* ---------- 1. Viðmið og skor ---------- */
const cands = {};
cands["eigin stig/leik (ppg5)"] = rows.map(r => r.ppg5);
cands["FPL-eigið xP"] = rows.map(r => r.xP5);
cands["aðferð appsins (ppg × FFDR)"] = rows.map(r => {
  const m = lookupPos(r.code, "pts", r.ffdr) / (POS_MEAN_PTS[r.code] || 3.4);
  return r.ppg5 * m;
});
cands["appið en með xP sem grunn"] = rows.map(r => {
  const m = lookupPos(r.code, "pts", r.ffdr) / (POS_MEAN_PTS[r.code] || 3.4);
  return r.xP5 * m;
});
cands["RÖÐUNARSKOR (öll 32 inntök)"] = losoPredict(rows, FEATURES, SEASN);

console.log(`\n${"─".repeat(84)}`);
console.log("skor                              r      Spearman  topp-15   topp-5    MAE");
console.log("─".repeat(84));
const res = {};
for (const [name, pred] of Object.entries(cands)) {
  const t15 = topN(rows, pred, 15), t5 = topN(rows, pred, 5);
  res[name] = { r: corr(pred, y), sp: spearman(pred, y, corr), t15: t15.got, t5: t5.got,
    mae: mean(pred.map((p, i) => Math.abs(p - y[i]))), pred };
  const x = res[name];
  console.log(`  ${name.padEnd(32)} ${x.r.toFixed(3)}   ${x.sp.toFixed(3)}    ${x.t15.toFixed(2)}    ${x.t5.toFixed(2)}    ${x.mae.toFixed(2)}`);
}
const bp = topN(rows, cands["RÖÐUNARSKOR (öll 32 inntök)"], 15);
const bp5 = topN(rows, cands["RÖÐUNARSKOR (öll 32 inntök)"], 5);
console.log(`\n  fullkomið eftirá-val: topp-15 ${bp.best.toFixed(2)} · topp-5 ${bp5.best.toFixed(2)}` +
  ` · meðal-leikmaður ${mean(y).toFixed(2)}`);

const R = res["RÖÐUNARSKOR (öll 32 inntök)"], F = res["FPL-eigið xP"], A = res["aðferð appsins (ppg × FFDR)"];
console.log(`\n  RÖÐUNARSKOR á móti:`);
console.log(`    aðferð appsins:  topp-15 ${(R.t15 - A.t15 >= 0 ? "+" : "") + (R.t15 - A.t15).toFixed(2)} stig/val` +
  `  ·  topp-5 ${(R.t5 - A.t5 >= 0 ? "+" : "") + (R.t5 - A.t5).toFixed(2)}`);
console.log(`    FPL-eigið xP:    topp-15 ${(R.t15 - F.t15 >= 0 ? "+" : "") + (R.t15 - F.t15).toFixed(2)} stig/val` +
  `  ·  topp-5 ${(R.t5 - F.t5 >= 0 ? "+" : "") + (R.t5 - F.t5).toFixed(2)}`);
ok(R.t15 > A.t15, `röðunarskorið velur betur en aðferð appsins (${R.t15.toFixed(2)} vs ${A.t15.toFixed(2)})`);
ok(R.t15 > F.t15, `og betur en FPL-eigið xP (${R.t15.toFixed(2)} vs ${F.t15.toFixed(2)}) — annars væri það ekki þess virði`);
ok(R.sp > A.sp && R.sp > F.sp, `og raðar betur (Spearman ${R.sp.toFixed(3)})`);

/* Per tímabil — heldur það? */
let wA = 0, wF = 0;
for (const s of SEASN) {
  const ix = rows.map((r, i) => r.season === s ? i : -1).filter(i => i >= 0);
  const sub = ix.map(i => rows[i]);
  const t = (p) => topN(sub, ix.map(i => p[i]), 15).got;
  if (t(R.pred) > t(A.pred)) wA++;
  if (t(R.pred) > t(F.pred)) wF++;
}
console.log(`\n  Per tímabil: slær aðferð appsins í ${wA}/${SEASN.length} · FPL-xP í ${wF}/${SEASN.length}`);
ok(wA >= SEASN.length - 1, `heldur gegn appinu í ≥${SEASN.length - 1}/${SEASN.length} (${wA})`);

/* ---------- 2. Hvaða inntök bera skorið? ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("HVAÐA INNTÖK BERA RÖÐUNINA — fall í topp-15 stigum þegar einu er sleppt");
console.log("─".repeat(84));
const imp = [];
for (let j = 0; j < FEATURES.length; j++) {
  const sub = FEATURES.filter((_, k) => k !== j);
  const p = losoPredict(rows, sub, SEASN);
  imp.push({ name: FEATURES[j][0], drop: R.t15 - topN(rows, p, 15).got, dr: R.r - corr(p, y) });
}
imp.sort((a, b) => b.drop - a.drop);
const mx = Math.max(...imp.map(x => Math.abs(x.drop))) || 1;
for (const x of imp) {
  const bar = "█".repeat(Math.max(0, Math.round(26 * x.drop / mx)));
  console.log(`  ${x.name.padEnd(11)} topp-15 ${(x.drop >= 0 ? "+" : "") + x.drop.toFixed(3).padStart(6)}` +
    `  r ${(x.dr >= 0 ? "+" : "") + x.dr.toFixed(4)}  ${bar}`);
}
console.log(`\n  (fall > 0 = inntakið bætir VALIÐ. Neikvætt = það truflar.)`);

/* ---------- 3. Fá inntök: hvað er nóg? ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("HVE FÁ INNTÖK ER NÓG? (bætt við í röð eftir mikilvægi)");
console.log("─".repeat(84));
const order = imp.filter(x => x.drop > 0).map(x => x.name);
let bestK = null;
for (const k of [3, 5, 8, 12, 20, FEATURES.length]) {
  const names = new Set(order.slice(0, k));
  const sub = FEATURES.filter(([n]) => names.has(n));
  if (!sub.length) continue;
  const p = losoPredict(rows, sub, SEASN);
  const t = topN(rows, p, 15).got;
  if (!bestK || t > bestK.t) bestK = { k: sub.length, t, names: [...names] };
  console.log(`  ${String(sub.length).padStart(2)} inntök: topp-15 ${t.toFixed(3)}  (${[...names].slice(0, 6).join(", ")}${names.size > 6 ? ", …" : ""})`);
}
console.log(`\n  -> ${bestK.k} inntök gefa ${bestK.t.toFixed(3)}; öll ${FEATURES.length} gefa ${R.t15.toFixed(3)}.`);

/* ---------- 3b. HREIÐRUÐ VALPRÓFUN — er þéttur listinn raunverulega betri? ----------
   Valið á inntökum að ofan notaði ÖLL tímabil, svo talan "9 inntök eru
   betri en 32" er sýkt af valskekkju. Hér er valið gert INNAN hvers
   folds: mikilvægi reiknað á 4 tímabilum, mælt á því 5.               */
console.log(`\n${"─".repeat(84)}`);
console.log("HREIÐRUÐ VALPRÓFUN — inntök valin á 4 tímabilum, mæld á því 5.");
console.log("─".repeat(84));
console.log("haldið út   fullt (32)   þéttur (5)   þéttur (9)   valinn þéttur listi");
let wFull = 0, wTot = 0;
const chosenSets = [];
for (const s of SEASN) {
  const inner = SEASN.filter(x => x !== s);
  const trRows = rows.filter(r => r.season !== s);
  const teRows = rows.filter(r => r.season === s);
  if (!teRows.length) continue;
  /* mikilvægi AÐEINS á innri tímabilum */
  const basePred = losoPredict(trRows, FEATURES, inner);
  const baseT = topN(trRows, basePred, 15).got;
  const impIn = FEATURES.map((f, j) => {
    const sub = FEATURES.filter((_, k) => k !== j);
    return { name: f[0], drop: baseT - topN(trRows, losoPredict(trRows, sub, inner), 15).got };
  }).sort((a, b) => b.drop - a.drop);
  const evalOn = (feats) => {
    const w = fitRidge(trRows.map(r => design(r, feats)), trRows.map(r => r.pts));
    const pred = teRows.map(r => design(r, feats).reduce((a, v, j) => a + v * w[j], 0));
    return topN(teRows, pred, 15).got;
  };
  const pick = k => { const nm = new Set(impIn.slice(0, k).map(x => x.name)); return FEATURES.filter(([n]) => nm.has(n)); };
  const tFull = evalOn(FEATURES), t5 = evalOn(pick(5)), t9 = evalOn(pick(9));
  chosenSets.push(impIn.slice(0, 5).map(x => x.name));
  wTot++; if (Math.max(t5, t9) > tFull) wFull++;
  console.log(`  ${s}       ${tFull.toFixed(3)}       ${t5.toFixed(3)}       ${t9.toFixed(3)}       ${impIn.slice(0, 5).map(x => x.name).join(", ")}`);
}
console.log(`\n  Þéttur listi slær fullan í ${wFull}/${wTot} tímabilum (hreiðrað val, engin valskekkja).`);
/* hvaða inntök eru VALIN AFTUR OG AFTUR? Þau eru raunverulega merkið. */
const freq = {};
for (const st of chosenSets) for (const n of st) freq[n] = (freq[n] || 0) + 1;
const stable = Object.entries(freq).sort((a, b) => b[1] - a[1]);
console.log(`  Inntök valin í flestum foldum: ${stable.filter(([, c]) => c >= Math.ceil(wTot * 0.6)).map(([n, c]) => `${n}(${c}/${wTot})`).join(" · ")}`);
ok(wFull >= Math.ceil(wTot / 2),
  `þéttur listi er ekki verri en fullur (${wFull}/${wTot}) — færri inntök, betra val`);
const core = stable.filter(([, c]) => c === wTot).map(([n]) => n);
ok(core.length >= 2, `${core.length} inntök valin í ÖLLUM foldum: ${core.join(", ")}`);

/* ---------- 3c. ÞAKIÐ — HVAÐ ER YFIRLEITT NÁANLEGT? ----------
   ÞETTA ER MIKILVÆGASTA TALAN Í SKRÁNNI og hún á að stoppa framtíðar-
   eltingarleik: markmið eins og "topp-15 upp í 6,0" eru YFIR ÞAKI.

   ORAKEL A veit ÁRSTÍÐAR-MEÐALTAL hvers leikmanns fyrirfram — þ.e. það
   sér framtíðina hvað gæði varðar, en veit ekki HVENÆR hann sprengur.
   Það er efsta mark sem nokkurt fyrir-leik líkan getur nálgast.

   Ef eitthvað líkan skilar TOPP-15 YFIR ~5,6 ÁN LEKA, þá er það merki um
   VILLU (leka úr framtíðinni), ekki afrek. Sama gildir um topp-5 yfir
   ~6,5. Prófið hér að neðan fellur ef svo verður.                       */
console.log(`\n${"─".repeat(84)}`);
console.log("ÞAKIÐ — hvað er yfirleitt náanlegt? (orakel sem sér framtíðina)");
console.log("─".repeat(84));
const seasonAvg = {};
for (const r of rows) {
  const k = `${r.season}|${r.name}`;
  (seasonAvg[k] ||= { p: 0, n: 0 });
  seasonAvg[k].p += r.pts; seasonAvg[k].n++;
}
const oracleA = rows.map(r => { const a = seasonAvg[`${r.season}|${r.name}`]; return a.p / a.n; });
const oracleB = rows.map((r, i) => oracleA[i] * (1 + 0.5 * (2.5 - r.ffdr) / 2.5));
const oA15 = topN(rows, oracleA, 15).got, oA5 = topN(rows, oracleA, 5).got;
const oB15 = topN(rows, oracleB, 15).got, oB5 = topN(rows, oracleB, 5).got;
console.log(`  okkar skor (LOSO, ENGINN leki)                 topp-15 ${R.t15.toFixed(3)}  topp-5 ${R.t5.toFixed(3)}`);
console.log(`  ORAKEL A: árstíðar-meðaltal (sér framtíðina)    topp-15 ${oA15.toFixed(3)}  topp-5 ${oA5.toFixed(3)}`);
console.log(`  ORAKEL B: A + leikjaþyngd                       topp-15 ${oB15.toFixed(3)}  topp-5 ${oB5.toFixed(3)}`);
console.log(`  FULLKOMIÐ (raunstig — algjör leki)             topp-15 ${topN(rows, y, 15).got.toFixed(3)}  topp-5 ${topN(rows, y, 5).got.toFixed(3)}`);
/* Hvers vegna þakið er þar sem það er: breytileiki stiga */
let ssB = 0, ssW = 0; const gm = mean(y);
const byP = {};
for (const r of rows) (byP[`${r.season}|${r.name}`] ||= []).push(r.pts);
for (const v of Object.values(byP)) {
  const m = mean(v);
  ssB += v.length * (m - gm) ** 2;
  for (const x of v) ssW += (x - m) ** 2;
}
const between = 100 * ssB / (ssB + ssW);
console.log(`\n  BREYTILEIKI STIGA: ${between.toFixed(1)}% MILLI leikmanna · ${(100 - between).toFixed(1)}% INNAN leikmanns`);
console.log(`  -> aðeins ~${between.toFixed(0)}% er náanlegt með því að þekkja leikmanninn.`);
console.log(`     Restin er hvað gerist í ÞESSUM leik og er ekki spáanleg fyrirfram.`);
console.log(`\n  Okkar skor nær ${(100 * R.t15 / oA15).toFixed(0)}% af orakel-þaki á topp-15` +
  ` og ${(100 * R.t5 / oA5).toFixed(0)}% á topp-5.`);
ok(between < 25, `meirihluti breytileika er INNAN leikmanns (${between.toFixed(1)}% milli) — þakið er lágt af eðlisfræði, ekki leti`);
ok(R.t15 < oA15 + 0.05,
  `topp-15 (${R.t15.toFixed(3)}) er UNDIR orakel-þaki (${oA15.toFixed(3)}) — hærra gildi væri LEKI, ekki afrek`);
ok(R.t5 < oA5 + 0.05,
  `topp-5 (${R.t5.toFixed(3)}) er undir orakel-þaki (${oA5.toFixed(3)})`);

/* ---------- 4. Endanlegar vogtölur til útfærslu ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("VOGTÖLUR FITTAÐAR Á ÖLL TÍMABIL (til útfærslu í model.js)");
console.log("─".repeat(84));
const wAll = fitRidge(rows.map(r => design(r, FEATURES)), y);
const sd = FEATURES.map(([, f]) => {
  const v = rows.map(f); const m = mean(v);
  return Math.sqrt(mean(v.map(x => (x - m) ** 2))) || 1;
});
const std = FEATURES.map((f, j) => ({ name: f[0], w: wAll[j + 1], beta: wAll[j + 1] * sd[j] }));
std.sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta));
console.log("  inntak       vog          stöðluð áhrif (β·sd)");
for (const x of std.slice(0, 12))
  console.log(`  ${x.name.padEnd(11)} ${x.w.toFixed(5).padStart(10)}   ${x.beta >= 0 ? "+" : ""}${x.beta.toFixed(3)}`);
console.log(`  … (${std.length - 12} fleiri)`);

console.log(`\nRÖÐUNARSKOR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
