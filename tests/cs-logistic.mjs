/* ============================================================
   CS% — LOGISTIC KVÖRÐUNARLAG OFAN Á exp(−λ)?

   TILLAGA FRÁ FABLE-LOTU (28.7.2026), mæld hér á OKKAR leiðslu:
   hrár umreikningur CS = e^−λ beri kerfisbundna skekkju (favourite-
   longshot bias + overround-leifar), og logistic-lag ofan á λ éti hana
   upp. Fable mældi +0,0023 Brier á 24 tímabilum (9.410 leikir,
   GitHub-spegli af football-data.co.uk) og gaf fasta stuðla:
     oddar til:   CS% = sigmoid(+0,881 − 1,440·λ + 0,100·heima)
     engir oddar: CS% = sigmoid(+0,171 − 1,066·λ_styrkir + 0,514·heima)

   AF HVERJU ÞETTA ER PRÓFAÐ AFTUR OG EKKI BARA TEKIÐ UPP:
   1. Stuðlarnir virðast FITTAÐIR Á ÖLLU ÚRTAKINU ("fittaði ég
      lokastuðlana beint"). Þá er 22/24 og p<0,0001 mælt Á SÖMU GÖGNUM
      sem fittið sá. 3 stikur á 9.410 röðum yfirfitta lítið, en rétta
      prófið er samt ÚT-AF-ÚRTAKI. Hér er allt LOSO.
   2. Okkar λ er EKKI sama tala og þeirra. Við kvörðuðum MARKET_CALIB
      0,959 -> 1,0 í dag (mælt á 10.640 lið-leikjum), svo hluti þeirrar
      skekkju sem logistic-lagið átti að éta er ÞEGAR farinn. Spurningin
      er hvað er eftir.
   3. Fable-lotan hafði ekki okkar leiðslu; hún gat ekki mælt gegn
      NÚVERANDI útfærslu appsins. Hér er hún viðmiðið.

   Þeirra STUÐLAR eru líka prófaðir eins og þeir eru — það er sterkasta
   prófið sem til er, því þeir voru fittaðir á annað úrtak.
   ============================================================ */
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT,
  marketForRow, eloWalkForward, brier,
} from "./lib/e0.mjs";
import { poissonCleanSheet } from "../src/market.js";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const sig = z => 1 / (1 + Math.exp(-z));

/* ---------- 1. Raðir: λ úr markaði (T±S)/2 og úr styrkjum ---------- */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const eloPre = eloWalkForward(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const PRED = SEASONS.slice(1);
const rows = [];
for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prev = byKey[SEASONS[si - 1]], list = byKey[key];
  const strength = buildStrength(prev);
  const teams = [...new Set(list.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  for (const t of teams) if (!strength[t]) strength[t] = { ...PROMO_DEFAULT };
  for (const r of list) {
    const mk = marketForRow(r);
    if (!mk) continue;
    for (const [team, opTeam, home, gc, lamMkt] of [
      [r.HomeTeam, r.AwayTeam, 1, +r.FTAG, mk.axg],
      [r.AwayTeam, r.HomeTeam, 0, +r.FTHG, mk.hxg],
    ]) {
      const S = strength[team], O = strength[opTeam];
      /* λ úr styrkjum: eigin mörk-á-sig × sóknarstyrk mótherja, deilt með
         deildarmeðaltali — sama margföldunarform sem Poisson gerir ráð fyrir. */
      const lamStr = (S.xgc90 / 1.4) * (O.xg90 / 1.4) * 1.4;
      rows.push({ season: key, gc, cs: gc === 0 ? 1 : 0, home, lamMkt, lamStr });
    }
  }
}
console.log(`\n${"=".repeat(76)}`);
console.log(`CS% — LOGISTIC KVÖRÐUN OFAN Á e^-λ · ${rows.length} lið-leikir, ${PRED.length} tímabil`);
console.log("=".repeat(76));
console.log(`raun CS-hlutfall ${(100 * mean(rows.map(r => r.cs))).toFixed(1)}% · meðal-λ(markaður) ${mean(rows.map(r => r.lamMkt)).toFixed(3)}` +
  ` · meðal mörk á sig ${mean(rows.map(r => r.gc)).toFixed(3)}`);

/* ---------- 2. Logistic-fitt (IRLS-laust: einföld halla-lækkun) ---------- */
function fitLogistic(train, feats, { iters = 3000, lr = 0.5 } = {}) {
  const X = train.map(r => [1, ...feats.map(f => f(r))]);
  const y = train.map(r => r.cs);
  const k = X[0].length;
  const b = new Array(k).fill(0);
  b[0] = Math.log(mean(y) / (1 - mean(y)));
  for (let it = 0; it < iters; it++) {
    const g = new Array(k).fill(0);
    for (let i = 0; i < X.length; i++) {
      let z = 0;
      for (let j = 0; j < k; j++) z += b[j] * X[i][j];
      const e = y[i] - sig(z);
      for (let j = 0; j < k; j++) g[j] += e * X[i][j];
    }
    for (let j = 0; j < k; j++) b[j] += lr * g[j] / X.length;
  }
  return { b, predict: r => sig(b.reduce((s, v, j) => s + v * (j === 0 ? 1 : feats[j - 1](r)), 0)) };
}

const y = rows.map(r => r.cs);
const bBase = brier(rows.map(() => mean(y)), y);
const calibOf = pred => {
  const idx = pred.map((p, i) => [p, y[i]]).sort((a, b) => a[0] - b[0]);
  let bias = 0, mae = 0;
  for (let i = 0; i < 10; i++) {
    const g = idx.slice(Math.floor(i * idx.length / 10), Math.floor((i + 1) * idx.length / 10));
    bias += (100 * mean(g.map(x => x[1])) - 100 * mean(g.map(x => x[0]))) / 10;
    mae += Math.abs(100 * mean(g.map(x => x[1])) - 100 * mean(g.map(x => x[0]))) / 10;
  }
  return { bias, mae };
};
const results = {};
const report = (label, pred) => {
  const b = brier(pred, y), c = calibOf(pred);
  results[label] = { b, ...c, pred };
  console.log(`  ${label.padEnd(42)} ${b.toFixed(5)}  ${(100 * (1 - b / bBase)).toFixed(2)}%   ` +
    `${c.bias >= 0 ? "+" : ""}${c.bias.toFixed(1)}pp   ${c.mae.toFixed(1)}pp`);
};

console.log(`\n${"─".repeat(76)}\nlíkan                                        Brier     skill   halli  meðalfrávik\n${"─".repeat(76)}`);
console.log(`  ${"grunnhlutfall".padEnd(42)} ${bBase.toFixed(5)}   0.00%`);

/* NÚVERANDI: það sem appið birtir — poissonCleanSheet(λ) = e^-λ */
report("NÚVERANDI: e^-λ (appið í dag)", rows.map(r => poissonCleanSheet(r.lamMkt) / 100));

/* FABLE-STUÐLARNIR EINS OG ÞEIR ERU — út-af-úrtaki fyrir okkur */
report("Fable-stuðlar, óbreyttir", rows.map(r => sig(0.881 - 1.440 * r.lamMkt + 0.100 * r.home)));

/* LOSO-FITTAÐ logistic á OKKAR λ */
const losoPred = (feats) => {
  const out = new Array(rows.length);
  const coefs = [];
  for (const k of PRED) {
    const tr = [], te = [];
    rows.forEach((r, i) => (r.season === k ? te : tr).push(i));
    if (!te.length) continue;
    const m = fitLogistic(tr.map(i => rows[i]), feats);
    coefs.push(m.b);
    for (const i of te) out[i] = m.predict(rows[i]);
  }
  return { out, coefs };
};
const L1 = losoPred([r => r.lamMkt, r => r.home]);
report("LOSO-logistic(λ, heima)", L1.out);
const L2 = losoPred([r => r.lamMkt]);
report("LOSO-logistic(λ) — án heima", L2.out);
/* Bæta styrkjum við — Fable mældi það ÓÞARFT með raun-oddum; prófum. */
const L3 = losoPred([r => r.lamMkt, r => r.home, r => r.lamStr]);
report("LOSO-logistic(λ, heima, styrkir)", L3.out);
/* Fallback: engir oddar */
const L4 = losoPred([r => r.lamStr, r => r.home]);
report("fallback: LOSO-logistic(styrkir, heima)", L4.out);
report("fallback í dag: e^-λ(styrkir)", rows.map(r => Math.exp(-r.lamStr)));

/* ---------- 3. MARKTEKT: bootstrap á ΔBrier ---------- */
console.log(`\n${"─".repeat(76)}\nMARKTEKT — bootstrap á ΔBrier (2.000 endurtekningar, endursýnt eftir röð)\n${"─".repeat(76)}`);
/* Deterministic "slembi" — Date.now/Math.random eru bönnuð í workflow-skriftum
   og hér vill maður endurtakanleika hvort eð er. LCG með föstu sáðkorni. */
let seed = 20260728;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
function bootCI(predA, predB, reps = 2000) {
  const n = rows.length, diffs = [];
  for (let b = 0; b < reps; b++) {
    let sA = 0, sB = 0;
    for (let i = 0; i < n; i++) {
      const j = Math.floor(rnd() * n);
      sA += (predA[j] - y[j]) ** 2;
      sB += (predB[j] - y[j]) ** 2;
    }
    diffs.push((sA - sB) / n);            // >0 = B betra
  }
  diffs.sort((a, b) => a - b);
  return { lo: diffs[Math.floor(0.025 * reps)], hi: diffs[Math.floor(0.975 * reps)],
           mid: diffs[Math.floor(0.5 * reps)] };
}
const cur = results["NÚVERANDI: e^-λ (appið í dag)"];
for (const label of ["Fable-stuðlar, óbreyttir", "LOSO-logistic(λ, heima)", "LOSO-logistic(λ, heima, styrkir)"]) {
  const ci = bootCI(cur.pred, results[label].pred);
  const crosses = ci.lo <= 0 && ci.hi >= 0;
  console.log(`  ${label.padEnd(38)} ΔBrier ${ci.mid >= 0 ? "+" : ""}${ci.mid.toFixed(5)}` +
    `  [${ci.lo >= 0 ? "+" : ""}${ci.lo.toFixed(5)}, ${ci.hi >= 0 ? "+" : ""}${ci.hi.toFixed(5)}]` +
    `  ${crosses ? "ÓMARKTÆKT" : "MARKTÆKT"}`);
}

/* Formerkjapróf per tímabil — hversu oft vinnur logistic? */
console.log(`\n  Per tímabil (vinnur logistic núverandi?):`);
for (const [label] of [["LOSO-logistic(λ, heima)"], ["Fable-stuðlar, óbreyttir"]]) {
  let w = 0, tot = 0;
  for (const k of PRED) {
    const idx = rows.map((r, i) => r.season === k ? i : -1).filter(i => i >= 0);
    if (!idx.length) continue;
    tot++;
    const bA = brier(idx.map(i => cur.pred[i]), idx.map(i => y[i]));
    const bB = brier(idx.map(i => results[label].pred[i]), idx.map(i => y[i]));
    if (bB < bA) w++;
  }
  console.log(`    ${label.padEnd(38)} ${w}/${tot} tímabil`);
}

/* ---------- 4. Stuðlarnir sem OKKAR gögn gefa ---------- */
const full = fitLogistic(rows, [r => r.lamMkt, r => r.home]);
const fullFb = fitLogistic(rows, [r => r.lamStr, r => r.home]);
console.log(`\n${"─".repeat(76)}\nSTUÐLAR FITTAÐIR Á OKKAR 15 TÍMABIL (til samanburðar við Fable)\n${"─".repeat(76)}`);
console.log(`  oddar til:   CS% = sigmoid(${full.b[0] >= 0 ? "+" : ""}${full.b[0].toFixed(3)} ${full.b[1] >= 0 ? "+" : "−"} ${Math.abs(full.b[1]).toFixed(3)}·λ ${full.b[2] >= 0 ? "+" : "−"} ${Math.abs(full.b[2]).toFixed(3)}·heima)`);
console.log(`  Fable:       CS% = sigmoid(+0,881 − 1,440·λ + 0,100·heima)`);
console.log(`  engir oddar: CS% = sigmoid(${fullFb.b[0] >= 0 ? "+" : ""}${fullFb.b[0].toFixed(3)} ${fullFb.b[1] >= 0 ? "+" : "−"} ${Math.abs(fullFb.b[1]).toFixed(3)}·λ ${fullFb.b[2] >= 0 ? "+" : "−"} ${Math.abs(fullFb.b[2]).toFixed(3)}·heima)`);
console.log(`  Fable:       CS% = sigmoid(+0,171 − 1,066·λ + 0,514·heima)`);

/* ---------- 5. Assertions ---------- */
const bestL = results["LOSO-logistic(λ, heima)"];
ok(bestL.b <= cur.b, `LOSO-logistic er ekki verri en e^-λ (${bestL.b.toFixed(5)} ≤ ${cur.b.toFixed(5)})`);
ok(bestL.mae <= cur.mae + 0.2, `og ekki verr kvarðað (${bestL.mae.toFixed(1)}pp á móti ${cur.mae.toFixed(1)}pp)`);
ok(results["LOSO-logistic(λ, heima, styrkir)"].b >= bestL.b - 0.0005,
  `styrkir bæta EKKI við markaðinn (Fable fann sama: +0,00002, p=0,42)`);
ok(results["fallback: LOSO-logistic(styrkir, heima)"].b < results["fallback í dag: e^-λ(styrkir)"].b,
  `fallback: logistic á styrkjum slær hrátt e^-λ`);

console.log(`\nCS-LOGISTIC: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
