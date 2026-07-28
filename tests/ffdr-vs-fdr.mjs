/* ============================================================
   FFDR GEGN OPINBERU FPL-FDR — 10 TÍMABIL, RAUNVERULEG ÚRSLIT

   SPURNINGIN: hversu miklu betri er FFDR en FDR-ið sem FPL sjálft birtir,
   við að spá (a) mörkum á sig og (b) hreinu blaði?

   ÞRENNT SEM GERIR ÞETTA MARKTÆKT:

   1. FDR-IÐ ER ÞAÐ RAUNVERULEGA, ekki nálgun. Fyrri bakpróf nálguðu
      sögulegt FDR með röðun stiga því FPL birtir aðeins yfirstandandi
      tímabil. Hér er opinbera talan sótt úr afriti af FPL-API-inu
      (data/fpl_fdr_history.json, 1819–2526, öll 380/380 leikir per
      tímabil pöruð og staðfest). Það munar: FPL notar t.d. FDR 1 í
      10% leikja 2024/25, sem nálgunin gerði aldrei.

   2. SAMANBURÐURINN ER SANNGJARN. FDR hefur aðeins 4–5 þrep, svo það
      væri ódýrt að refsa því fyrir grófleika. Þrjár mælingar:
        - r og AUC: RÖÐUNARMÆLINGAR, engin vörpun, engin þrepaáhrif.
        - Brier eftir að BÁÐUM er gefin sín BESTA vörpun í CS%, kvörðuð
          á 9 tímabilum og mæld á því 10. (LOSO) — svo hvorugt fær
          forskot af of-fitti.
        - FFDR ÞVINGAÐ Í 4 ÞREP líka, til að skilja "betri upplýsingar"
          frá "fínni upplausn".

   3. ENGINN LEKI: liðsstyrkur alltaf úr fyrra tímabili, Elo aðeins úr
      loknum leikjum, bókmakaralínan er fyrir-leik. FFDR er reiknað með
      SAMA model.js sem appið birtir.

   Aukalega er FFDR mælt ÁN markaðslínunnar, því annars er ósvarað hversu
   mikið af forskotinu kemur frá líkaninu og hversu mikið frá bókmökurum.
   ============================================================ */
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrApprox, realFdr,
  marketForRow, eloWalkForward, corr,
} from "./lib/e0.mjs";
import { makeFixDifficulty } from "../src/model.js";

/* ---------- 1. Byggja heiminn ---------- */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const eloPre = eloWalkForward(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const PRED = SEASONS.slice(1);                 // 10 spáð tímabil

const all = [];
const fdrSource = {};
for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prevRows = byKey[SEASONS[si - 1]], rows = byKey[key];
  const strength = buildStrength(prevRows);
  const approx = fdrApprox(prevRows);
  const real = realFdr(key);
  fdrSource[key] = real ? "opinbert" : "nálgað";

  const teams = [...new Set(rows.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  for (const t of teams) if (!strength[t]) strength[t] = { ...PROMO_DEFAULT };
  const ids = {}; let n = 1;
  for (const t of teams) ids[t] = n++;
  const teamMetrics = {}, teamById = {}, eloByTeam = {};
  for (const t of teams) { teamMetrics[ids[t]] = strength[t]; teamById[ids[t]] = { short: t }; }

  rows.forEach((r, i) => {
    const H = ids[r.HomeTeam], A = ids[r.AwayTeam];
    const e = eloPre.get(`${key}|${i}`);
    eloByTeam[H] = { elo: e.h }; eloByTeam[A] = { elo: e.a };
    const mk = marketForRow(r);
    const kickoff = `${r.Date}T00:00:00Z`;
    const odds = mk ? {
      [r.HomeTeam]: { xga: mk.axg, xg: mk.hxg, opp: r.AwayTeam, kickoff },
      [r.AwayTeam]: { xga: mk.hxg, xg: mk.axg, opp: r.HomeTeam, kickoff },
    } : null;
    const withMkt = makeFixDifficulty({ teamMetrics, teamById, odds, eloByTeam });
    const noMkt = makeFixDifficulty({ teamMetrics, teamById, odds: null, eloByTeam });

    /* OPINBERA FDR-IÐ fyrir þennan leik (eða nálgun fyrir 1617/1718) */
    const pair = real && real(r.HomeTeam, r.AwayTeam);
    const fdrH = pair ? pair[0] : approx(r.AwayTeam);
    const fdrA = pair ? pair[1] : approx(r.HomeTeam);

    for (const [team, oppTeam, home, ga, fdr] of [
      [r.HomeTeam, r.AwayTeam, true, +r.FTAG, fdrH],
      [r.AwayTeam, r.HomeTeam, false, +r.FTHG, fdrA],
    ]) {
      const me = ids[team], op = ids[oppTeam];
      const fx = { opp: op, home, fdr, kickoff };
      all.push({
        season: key, real: !!pair,
        ffdr: withMkt(me, fx, 2),
        ffdrNoMkt: noMkt(me, fx, 2),
        fdr, ga, cs: ga === 0,
      });
    }
  });
}

console.log(`\n${"=".repeat(70)}`);
console.log(`FFDR GEGN OPINBERU FPL-FDR — ${PRED.length} tímabil, ${all.length} lið-leikir`);
console.log("=".repeat(70));
console.log(`Tímabil: ${PRED.map(k => `${k}(${fdrSource[k] === "opinbert" ? "O" : "n"})`).join(" ")}`);
console.log(`  O = opinbert FPL-FDR úr afriti af API-inu · n = nálgað (FPL-safnið nær ekki svo langt)`);
const realRows = all.filter(x => x.real);
console.log(`  -> ${realRows.length} lið-leikir með OPINBERU FDR (${realRows.length / 760} tímabil)`);

/* ---------- 2. Tölfræði ---------- */
/* AUC með jafnteflum (Mann-Whitney): líkindi þess að slembivalinn leikur
   MEÐ hreinu blaði fái léttara gildi en slembivalinn leikur ÁN. 0,5 = ekkert
   upplýsingainnihald. Röðunarmæling — grófleiki FDR skaðar það ekki óréttlátt. */
function auc(scores, labels) {
  const idx = scores.map((s, i) => [s, labels[i]]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(idx.length);
  let i = 0;
  while (i < idx.length) {                      // meðaltalsröð fyrir jafntefli
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[k] = avg;
    i = j + 1;
  }
  let sumPos = 0, nPos = 0, nNeg = 0;
  idx.forEach(([, lab], k) => { if (lab) { sumPos += ranks[k]; nPos++; } else nNeg++; });
  // lægra gildi = léttara = líklegra hreint blað, svo við snúum
  return 1 - (sumPos - nPos * (nPos + 1) / 2) / (nPos * nNeg);
}
const brier = (p, y) => p.reduce((a, v, i) => a + (v - y[i]) ** 2, 0) / p.length;

/* LOSO-kvörðun: vörpun predictor -> CS% lærð á 9 tímabilum, mæld á því 10.
   `bins` = fjöldi þrepa (null = notaðu STÖK GILDI, sem er náttúrulegt fyrir FDR). */
function losoBrier(getX, bins) {
  const preds = [], labels = [];
  for (const k of PRED) {
    const tr = all.filter(x => x.season !== k), te = all.filter(x => x.season === k);
    let assign;
    if (bins == null) {
      assign = x => String(getX(x));                       // stök gildi (FDR)
    } else {
      const sorted = tr.map(getX).sort((a, b) => a - b);   // jöfn þrep úr TRAIN
      const cuts = Array.from({ length: bins - 1 },
        (_, i) => sorted[Math.floor((i + 1) * sorted.length / bins)]);
      assign = x => { const v = getX(x); let b = 0; while (b < cuts.length && v >= cuts[b]) b++; return String(b); };
    }
    const rate = {}, cnt = {};
    for (const x of tr) { const b = assign(x); rate[b] = (rate[b] || 0) + (x.cs ? 1 : 0); cnt[b] = (cnt[b] || 0) + 1; }
    const base = tr.filter(x => x.cs).length / tr.length;
    for (const x of te) {
      const b = assign(x);
      preds.push(cnt[b] >= 20 ? rate[b] / cnt[b] : base);
      labels.push(x.cs ? 1 : 0);
    }
  }
  return { brier: brier(preds, labels), base: labels.reduce((a, b) => a + b, 0) / labels.length };
}

function report(rows, title) {
  console.log(`\n${"─".repeat(70)}\n${title}  (n=${rows.length})\n${"─".repeat(70)}`);
  const ga = rows.map(x => x.ga), cs = rows.map(x => x.cs ? 1 : 0);
  const cands = [
    ["FFDR (eins og appið birtir)", x => x.ffdr],
    ["FFDR án markaðslínu",         x => x.ffdrNoMkt],
    ["FDR (opinbert FPL)",          x => x.fdr],
  ];
  console.log("mælikvarði                     r(mörk á sig)   AUC(hreint blað)");
  const M = {};
  for (const [name, f] of cands) {
    const xs = rows.map(f);
    M[name] = { r: corr(xs, ga), auc: auc(xs, cs) };
    console.log(`  ${name.padEnd(28)} ${M[name].r.toFixed(3).padStart(8)}       ${M[name].auc.toFixed(4)}`);
  }
  const F = M["FFDR (eins og appið birtir)"], D = M["FDR (opinbert FPL)"];
  console.log(`\n  FFDR á móti opinberu FDR:`);
  console.log(`    fylgni við mörk á sig:  ${F.r.toFixed(3)} á móti ${D.r.toFixed(3)}  ` +
    `->  ${((F.r / D.r - 1) * 100).toFixed(0)}% sterkara merki`);
  console.log(`    AUC (röðun):            ${F.auc.toFixed(4)} á móti ${D.auc.toFixed(4)}  ` +
    `->  ${(100 * (F.auc - 0.5)).toFixed(1)}% á móti ${(100 * (D.auc - 0.5)).toFixed(1)}% ` +
    `yfir tilviljun (${((F.auc - 0.5) / (D.auc - 0.5)).toFixed(2)}x)`);
  return M;
}

const M10 = report(all, `A. ÖLL ${PRED.length} TÍMABIL (FDR opinbert í ${realRows.length / 760} af ${PRED.length})`);
const M8 = report(realRows, "B. AÐEINS TÍMABIL MEÐ OPINBERU FDR — ÁREIÐANLEGASTA TALAN");

/* ---------- 3. CS%-nákvæmni: Brier eftir bestu vörpun fyrir BÁÐA ---------- */
console.log(`\n${"─".repeat(70)}\nC. NÁKVÆMNI Á CS% — Brier eftir LOSO-kvörðun (lægra = betra)\n${"─".repeat(70)}`);
const rows8 = realRows;
const only8 = (getX, bins) => {
  const saved = all.length;
  return losoBrierOn(rows8, getX, bins);
};
/* sama og losoBrier en á tilteknu úrtaki */
function losoBrierOn(rows, getX, bins) {
  const preds = [], labels = [];
  const seasons = [...new Set(rows.map(x => x.season))];
  for (const k of seasons) {
    const tr = rows.filter(x => x.season !== k), te = rows.filter(x => x.season === k);
    let assign;
    if (bins == null) assign = x => String(getX(x));
    else {
      const sorted = tr.map(getX).sort((a, b) => a - b);
      const cuts = Array.from({ length: bins - 1 },
        (_, i) => sorted[Math.floor((i + 1) * sorted.length / bins)]);
      assign = x => { const v = getX(x); let b = 0; while (b < cuts.length && v >= cuts[b]) b++; return String(b); };
    }
    const rate = {}, cnt = {};
    for (const x of tr) { const b = assign(x); rate[b] = (rate[b] || 0) + (x.cs ? 1 : 0); cnt[b] = (cnt[b] || 0) + 1; }
    const base = tr.filter(x => x.cs).length / tr.length;
    for (const x of te) {
      const b = assign(x);
      preds.push(cnt[b] >= 20 ? rate[b] / cnt[b] : base);
      labels.push(x.cs ? 1 : 0);
    }
  }
  const b = brier(preds, labels);
  const base = labels.reduce((a, v) => a + v, 0) / labels.length;
  return { brier: b, skill: 1 - b / brier(labels.map(() => base), labels) };
}
const variants = [
  ["FDR (opinbert) — stök þrep",        x => x.fdr, null],
  ["FFDR — 4 þrep (SAMA upplausn)",     x => x.ffdr, 4],
  ["FFDR — 10 þrep (eðlileg upplausn)", x => x.ffdr, 10],
  ["FFDR án markaðar — 10 þrep",        x => x.ffdrNoMkt, 10],
];
const csBase = rows8.filter(x => x.cs).length / rows8.length;
console.log(`  grunnlína (spá alltaf ${(100 * csBase).toFixed(1)}%): Brier ${(csBase * (1 - csBase)).toFixed(5)}\n`);
const briers = {};
for (const [name, f, b] of variants) {
  const R = losoBrierOn(rows8, f, b);
  briers[name] = R;
  console.log(`  ${name.padEnd(36)} Brier ${R.brier.toFixed(5)}  ·  skill ${(100 * R.skill).toFixed(2)}%`);
}
const bF = briers["FFDR — 10 þrep (eðlileg upplausn)"], bD = briers["FDR (opinbert) — stök þrep"];
console.log(`\n  -> FFDR nær ${(100 * bF.skill).toFixed(2)}% af mögulegri framför á móti ${(100 * bD.skill).toFixed(2)}% hjá FDR`);
console.log(`     ${(bF.skill / bD.skill).toFixed(2)}x meira nýtilegt upplýsingainnihald um hreint blað.`);
console.log(`     Við SÖMU upplausn (4 þrep) er FFDR enn ` +
  `${(briers["FFDR — 4 þrep (SAMA upplausn)"].skill / bD.skill).toFixed(2)}x — forskotið er` +
  ` upplýsingar, ekki fínni þrep.`);

/* ---------- 4. Það sem notandinn sér: sjöttungarnir ---------- */
console.log(`\n${"─".repeat(70)}\nD. Í PRAKTÍK — léttasti á móti þyngsta sjöttungi (opinberu tímabilin)\n${"─".repeat(70)}`);
console.log("mælikvarði                 léttasti 1/6      þyngsti 1/6     bil");
for (const [name, f] of [["FFDR", x => x.ffdr], ["FDR (opinbert)", x => x.fdr]]) {
  const s = [...rows8].sort((a, b) => f(a) - f(b));
  const n = Math.floor(s.length / 6);
  const easy = s.slice(0, n), hard = s.slice(-n);
  const csE = 100 * easy.filter(x => x.cs).length / easy.length;
  const csH = 100 * hard.filter(x => x.cs).length / hard.length;
  const gaE = easy.reduce((a, x) => a + x.ga, 0) / easy.length;
  const gaH = hard.reduce((a, x) => a + x.ga, 0) / hard.length;
  console.log(`  ${name.padEnd(24)} CS ${csE.toFixed(1)}% (${gaE.toFixed(2)} mörk)   ` +
    `CS ${csH.toFixed(1)}% (${gaH.toFixed(2)})   ${(csE - csH).toFixed(1)}pp`);
}
console.log(`  (jafntefli í FDR eru brotin af handahófi röðunar — FDR getur ekki`);
console.log(`   skipt 5.320 leikjum í sex jafna hluta því það hefur aðeins 4–5 gildi.)`);

/* ---------- 5. Per tímabil ---------- */
console.log(`\n${"─".repeat(70)}\nE. PER TÍMABIL — heldur forskotið alltaf?\n${"─".repeat(70)}`);
console.log("tímabil  FDR-heimild   r FFDR   r FDR    AUC FFDR  AUC FDR   FFDR vinnur?");
let wins = 0;
for (const k of PRED) {
  const g = all.filter(x => x.season === k);
  const rF = corr(g.map(x => x.ffdr), g.map(x => x.ga));
  const rD = corr(g.map(x => x.fdr), g.map(x => x.ga));
  const aF = auc(g.map(x => x.ffdr), g.map(x => x.cs ? 1 : 0));
  const aD = auc(g.map(x => x.fdr), g.map(x => x.cs ? 1 : 0));
  const win = rF > rD && aF > aD;
  if (win) wins++;
  console.log(`  ${k}   ${fdrSource[k].padEnd(12)} ${rF.toFixed(3)}   ${rD.toFixed(3)}    ` +
    `${aF.toFixed(4)}    ${aD.toFixed(4)}    ${win ? "JÁ" : "nei"}`);
}
console.log(`\n  FFDR vinnur á BÁÐUM mælikvörðum í ${wins}/${PRED.length} tímabilum.`);
console.log(`\n${"=".repeat(70)}`);
