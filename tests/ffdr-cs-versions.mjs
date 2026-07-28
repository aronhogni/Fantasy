/* ============================================================
   ÞRJÁR ÚTGÁFUR BORNAR SAMAN — FFDR OG CS%, 15 TÍMABIL

   "Gamla útgáfan frá í gær" er tvírætt, svo hér eru ÞRÍR fastir punktar
   og enginn þarf að giska:

     A  8b81b9f  27.7. 21:37  FYRIR alla FFDR-vinnu (byrjun lotunnar)
     B  7890ca5  27.7. 23:51  SÍÐASTA commit í gær
     C  núverandi src/        eftir vinnu 28.7.

   ÚTGÁFURNAR ERU FLUTTAR INN ÚR GIT (tests/lib/frozen/A|B), ekki
   endurgerðar. Samanburður sem endurskrifar gamla kóðann mælir ekkert.

   HVAÐ BREYTTIST MILLI ÞEIRRA (til að lesa töflurnar rétt):
     A -> B : mkt-vog 0,50 -> 0,80 · rétt markaðsstærð fyrir sókn (xg í
              stað xga) · xga-varaleið sem VAKTI markaðinn (hann var
              dauður í A því odds.json hafði ekki `diff`) · SCALE_FIX
     B -> C : MARKET_CALIB 0,959 -> 1,0 · SCALE_FIX endurfittað á
              OPINBERT FDR · CS% varð líkindalíkan (cleanSheetProb) í
              stað uppflettitöflu · aðlögunar-blanda á liðsstyrk
              (prevWeight k/(n+k)) í stað hreins yfirstandandi forms

   A ER MÆLD EINS OG HÚN KEYRÐI: með dauðum markaði. Það er það sem
   notandinn hafði í raun, og að mæla hana með lifandi markaði væri að
   gefa henni eiginleika sem hún hafði ekki. Hin útgáfan er líka sýnd.

   ENGINN LEKI: liðsstyrkur úr fyrra tímabili + hlaupandi yfirstandandi
   (aðeins leikir sem búnir voru), Elo úr loknum leikjum, markaðslína
   fyrir-leik, OPINBERT FPL-FDR þegar það er til.
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloWalkForward, corr, rSE, brier,
} from "./lib/e0.mjs";
import * as C_ from "../src/model.js";
import * as A_ from "./lib/frozen/A/model.js";
import * as B_ from "./lib/frozen/B/model.js";
import { poissonCleanSheet, marketDiff } from "../src/market.js";

const D = new URL("../data/", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const e0Day = s => { const [d, m, y] = s.split("/"); return `${y.length === 2 ? "20" + y : y}-${m}-${d}`; };
/* Poisson-CS eins og hvor kvörðun gefur hana */
const csFromLambda = (lam, calib) => Math.exp(-lam * calib);

/* ---------- 1. Byggja raðir með ÖLLU sem útgáfurnar þurfa ---------- */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const eloPre = eloWalkForward(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const PRED = SEASONS.slice(1);
const rows = [];
for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prevRows = byKey[SEASONS[si - 1]];
  const list = [...byKey[key]].sort((a, b) => e0Day(a.Date).localeCompare(e0Day(b.Date)));
  const prevStr = buildStrength(prevRows);
  const teams = [...new Set(list.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  for (const t of teams) if (!prevStr[t]) prevStr[t] = { ...PROMO_DEFAULT };
  const run = {}; for (const t of teams) run[t] = { g: 0, c: 0, sf: 0, sa: 0, n: 0 };
  const ids = {}; let nn = 1; for (const t of teams) ids[t] = nn++;
  const origIdx = new Map(byKey[key].map((r, i) => [r, i]));
  const FDR = fdrFor(key, prevRows);
  for (const r of list) {
    const e = eloPre.get(`${key}|${origIdx.get(r)}`);
    const mk = marketForRow(r);
    const p = FDR.forFixture(r.HomeTeam, r.AwayTeam);
    for (const [team, opTeam, home, gc, gf, fdr] of [
      [r.HomeTeam, r.AwayTeam, true, +r.FTAG, +r.FTHG, p.h],
      [r.AwayTeam, r.HomeTeam, false, +r.FTHG, +r.FTAG, p.a],
    ]) {
      /* teamMetrics EINS OG APPIÐ BYGGIR ÞAÐ: yfirstandandi form sem
         `xg90/xgc90` og fyrra tímabil sem `prev*`. Útgáfur A og B hafa
         prev-vog 0 og hunsa prev-reitina; C notar þá gegnum prevWeight.
         Þannig mælist hver útgáfa með SINNI EIGIN styrk-meðferð.        */
      const mkMetrics = t => {
        const a = run[t], P = prevStr[t];
        const cur = a.n === 0
          ? { xg90: P.xg90, xgc90: P.xgc90, sotFor: P.sotFor, sotAg: P.sotAg }
          : { xg90: a.g / a.n, xgc90: a.c / a.n, sotFor: a.sf / a.n, sotAg: a.sa / a.n };
        return { ...cur, matches: a.n,
          prevGoals: P.xg90, prevConc: P.xgc90, prevSotFor: P.sotFor, prevSotAg: P.sotAg };
      };
      rows.push({
        season: key, date: r.Date, team, opTeam, home, gc, gf, fdr, cs: gc === 0 ? 1 : 0,
        me: mkMetrics(team), op: mkMetrics(opTeam),
        eloMe: home ? e.h : e.a, eloOp: home ? e.a : e.h,
        lamMkt: mk ? (home ? mk.axg : mk.hxg) : null,
        xgMkt: mk ? (home ? mk.hxg : mk.axg) : null,
        idMe: ids[team], idOp: ids[opTeam],
      });
    }
    const hs = run[r.HomeTeam], as = run[r.AwayTeam];
    hs.g += +r.FTHG; hs.c += +r.FTAG; hs.sf += +(r.HST || 0); hs.sa += +(r.AST || 0); hs.n++;
    as.g += +r.FTAG; as.c += +r.FTHG; as.sf += +(r.AST || 0); as.sa += +(r.HST || 0); as.n++;
  }
}

/* ---------- 2. Reikna FFDR + CS% fyrir hverja útgáfu ---------- */
function evalVersion(M, { market, calib, csMode }) {
  const out = { def: [], att: [], csWith: [], csNo: [] };
  for (const r of rows) {
    const teamMetrics = { [r.idMe]: r.me, [r.idOp]: r.op };
    const teamById = { [r.idMe]: { short: r.team }, [r.idOp]: { short: r.opTeam } };
    const eloByTeam = { [r.idMe]: { elo: r.eloMe }, [r.idOp]: { elo: r.eloOp } };
    const kickoff = `${r.date}T00:00:00Z`;
    /* Odds-kortið í því sniði sem HVER ÚTGÁFA SKILUR, og með ÞEIRRA
       EIGIN λ-kvörðun (A og B höfðu MARKET_CALIB 0,959; C hefur 1,0).
       A las AÐEINS `diff` — hún hafði enga xga-varaleið, og einmitt þess
       vegna var markaðurinn dauður í raun (odds.json hafði ekki `diff`). */
    const lam = r.lamMkt * calib, xgm = r.xgMkt * calib;
    const odds = !market ? null : (M === A_
      ? { [r.team]: { diff: marketDiff(lam), opp: r.opTeam, kickoff } }
      : { [r.team]: { xga: lam, xg: xgm, opp: r.opTeam, kickoff } });
    const f = M.makeFixDifficulty({ teamMetrics, teamById, odds, eloByTeam });
    const fNo = M.makeFixDifficulty({ teamMetrics, teamById, odds: null, eloByTeam });
    const fx = { opp: r.idOp, home: r.home, fdr: r.fdr, kickoff };
    out.def.push(f(r.idMe, fx, 2));
    out.att.push(f(r.idMe, fx, 4));
    /* CS% — MEÐ markaðslínu (næsta umferð) */
    out.csWith.push(csMode === "logistic"
      ? csFromLambda(r.lamMkt, calib)                    // C: e^-λ, CALIB 1,0
      : csFromLambda(r.lamMkt, calib));                  // A/B: e^-λ, CALIB 0,959
    /* CS% — ÁN markaðslínu (allar umferðir nema næsta) */
    if (csMode === "logistic") {
      const p = M.cleanSheetProb({
        ownXgc: r.me.xgc90, oppXg: r.op.xg90, home: r.home,
        eloDiff: (r.eloOp - r.eloMe) / 100, fdr: r.fdr,
      });
      out.csNo.push(p);
    } else {
      out.csNo.push(M.lookupPos(2, "cs", fNo(r.idMe, fx, 2)) / 100);
    }
  }
  return out;
}

const V = {
  "A (fyrir vinnu, markaður DAUÐUR)": evalVersion(A_, { market: false, calib: 0.959, csMode: "table" }),
  "A′ (sami kóði, markaður lifandi)": evalVersion(A_, { market: true, calib: 0.959, csMode: "table" }),
  "B (síðasta í gær)":                evalVersion(B_, { market: true, calib: 0.959, csMode: "table" }),
  "C (núna)":                         evalVersion(C_, { market: true, calib: 1.0, csMode: "logistic" }),
};

const gc = rows.map(r => r.gc), gf = rows.map(r => r.gf), y = rows.map(r => r.cs);
const se = rSE(rows.length);

console.log(`\n${"=".repeat(82)}`);
console.log(`ÞRJÁR ÚTGÁFUR — ${rows.length} lið-leikir · ${PRED.length} tímabil (${PRED[0]}–${PRED[PRED.length-1]})`);
console.log("=".repeat(82));

/* ---------- TAFLA 1: FFDR ---------- */
console.log(`\n${"─".repeat(82)}`);
console.log("TAFLA 1 — FFDR: raðar líkanið leikjum rétt? (hærra = betra)");
console.log("─".repeat(82));
console.log("útgáfa                              vörn:      sókn:      DEF-stig   MID-stig");
console.log("                                    mörk á sig mörk skoruð (raun)     (raun)");

/* raunveruleg stig leikmanna */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const HD = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const rowIdx = new Map(); rows.forEach((r, i) => rowIdx.set(`${r.season}|${r.date}|${r.team}`, i));
const pl = [];
for (const [season, list] of Object.entries(PG.seasons))
  for (const q of list) {
    if (q[HD.starts] < 1 || q[HD.mins] < 60) continue;
    const i = rowIdx.get(`${season}|${q[HD.date]}|${q[HD.team]}`);
    if (i == null) continue;
    const pos = q[HD.pos] === "GKP" ? "GK" : q[HD.pos];
    pl.push({ i, pos, pts: q[HD.pts] });
  }
const ptsFor = (arr, pos) => {
  const g = pl.filter(x => x.pos === pos);
  return corr(g.map(x => arr[x.i]), g.map(x => x.pts));
};
const T1 = {};
for (const [label, R] of Object.entries(V)) {
  const rGc = corr(R.def, gc), rGf = Math.abs(corr(R.att, gf));
  const rDef = ptsFor(R.def, "DEF"), rMid = ptsFor(R.att, "MID");
  T1[label] = { rGc, rGf, rDef, rMid };
  console.log(`  ${label.padEnd(34)} ${rGc.toFixed(3)}      ${rGf.toFixed(3)}      ` +
    `${rDef.toFixed(3)}     ${rMid.toFixed(3)}`);
}
console.log(`  (staðalfrávik á r: ±${se.toFixed(3)} · stig mæld á ${pl.length} byrjunarliðs-umferðum)`);

/* ---------- TAFLA 2: CS% ---------- */
console.log(`\n${"─".repeat(82)}`);
console.log("TAFLA 2 — CS%: er birt tala rétt? (Brier lægra = betra · frávik lægra = betra)");
console.log("─".repeat(82));
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
console.log("                                    MEÐ markaðslínu        ÁN markaðslínu");
console.log("útgáfa                              Brier    halli  frávik  Brier    halli  frávik");
const T2 = {};
for (const [label, R] of Object.entries(V)) {
  const bW = brier(R.csWith, y), cW = calibOf(R.csWith);
  const bN = brier(R.csNo, y), cN = calibOf(R.csNo);
  T2[label] = { bW, cW, bN, cN };
  console.log(`  ${label.padEnd(34)} ${bW.toFixed(4)}  ${(cW.bias >= 0 ? "+" : "") + cW.bias.toFixed(1)}pp  ${cW.mae.toFixed(1)}pp` +
    `   ${bN.toFixed(4)}  ${(cN.bias >= 0 ? "+" : "") + cN.bias.toFixed(1)}pp  ${cN.mae.toFixed(1)}pp`);
}
console.log(`  (grunnhlutfall: Brier ${bBase.toFixed(4)} · raun CS ${(100 * mean(y)).toFixed(1)}%)`);

/* ---------- MARKTEKT ---------- */
let seed = 20260728;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const bootCI = (pa, pb, reps = 2000) => {
  const n = rows.length, d = [];
  for (let b = 0; b < reps; b++) {
    let sa = 0, sb = 0;
    for (let i = 0; i < n; i++) { const j = Math.floor(rnd() * n); sa += (pa[j] - y[j]) ** 2; sb += (pb[j] - y[j]) ** 2; }
    d.push((sa - sb) / n);
  }
  d.sort((x, z) => x - z);
  return { lo: d[Math.floor(0.025 * reps)], hi: d[Math.floor(0.975 * reps)], mid: d[Math.floor(0.5 * reps)] };
};
console.log(`\n${"─".repeat(82)}`);
console.log("MARKTEKT — er munurinn raunverulegur?");
console.log("─".repeat(82));
const A = T1["A (fyrir vinnu, markaður DAUÐUR)"], B = T1["B (síðasta í gær)"], Cc = T1["C (núna)"];
const sig2 = (x, z) => Math.abs(x - z) > 2 * se ? "MARKTÆKT" : "innan suðs";
console.log(`  FFDR vörn:  C−A ${(Cc.rGc - A.rGc >= 0 ? "+" : "") + (Cc.rGc - A.rGc).toFixed(3)} (${sig2(Cc.rGc, A.rGc)})` +
  `  ·  C−B ${(Cc.rGc - B.rGc >= 0 ? "+" : "") + (Cc.rGc - B.rGc).toFixed(3)} (${sig2(Cc.rGc, B.rGc)})`);
console.log(`  FFDR sókn:  C−A ${(Cc.rGf - A.rGf >= 0 ? "+" : "") + (Cc.rGf - A.rGf).toFixed(3)} (${sig2(Cc.rGf, A.rGf)})` +
  `  ·  C−B ${(Cc.rGf - B.rGf >= 0 ? "+" : "") + (Cc.rGf - B.rGf).toFixed(3)} (${sig2(Cc.rGf, B.rGf)})`);
for (const [nm, key] of [["MEÐ línu", "csWith"], ["ÁN línu", "csNo"]]) {
  const ciA = bootCI(V["A (fyrir vinnu, markaður DAUÐUR)"][key], V["C (núna)"][key]);
  const ciB = bootCI(V["B (síðasta í gær)"][key], V["C (núna)"][key]);
  console.log(`  CS% ${nm}:  C vs A ΔBrier ${(ciA.mid >= 0 ? "+" : "") + ciA.mid.toFixed(5)} [${ciA.lo.toFixed(5)}, ${ciA.hi.toFixed(5)}] ` +
    `${ciA.lo <= 0 && ciA.hi >= 0 ? "innan suðs" : "MARKTÆKT"}`);
  console.log(`  ${" ".repeat(nm.length + 5)}  C vs B ΔBrier ${(ciB.mid >= 0 ? "+" : "") + ciB.mid.toFixed(5)} [${ciB.lo.toFixed(5)}, ${ciB.hi.toFixed(5)}] ` +
    `${ciB.lo <= 0 && ciB.hi >= 0 ? "innan suðs" : "MARKTÆKT"}`);
}
/* per tímabil */
console.log(`\n  Per tímabil (C betri en …?):`);
for (const [lbl, other] of [["A", "A (fyrir vinnu, markaður DAUÐUR)"], ["B", "B (síðasta í gær)"]]) {
  let wD = 0, wCs = 0;
  for (const k of PRED) {
    const ix = rows.map((r, i) => r.season === k ? i : -1).filter(i => i >= 0);
    if (corr(ix.map(i => V["C (núna)"].def[i]), ix.map(i => gc[i])) >
        corr(ix.map(i => V[other].def[i]), ix.map(i => gc[i]))) wD++;
    if (brier(ix.map(i => V["C (núna)"].csNo[i]), ix.map(i => y[i])) <
        brier(ix.map(i => V[other].csNo[i]), ix.map(i => y[i]))) wCs++;
  }
  console.log(`    gegn ${lbl}:  FFDR vörn ${wD}/${PRED.length} tímabil  ·  CS% án línu ${wCs}/${PRED.length} tímabil`);
}

ok(Cc.rGc > A.rGc + 2 * se, `FFDR vörn: C slær A marktækt (${Cc.rGc.toFixed(3)} vs ${A.rGc.toFixed(3)})`);
ok(Cc.rGc > B.rGc, `FFDR vörn: C slær B (${Cc.rGc.toFixed(3)} vs ${B.rGc.toFixed(3)})`);
ok(T2["C (núna)"].bN < T2["A (fyrir vinnu, markaður DAUÐUR)"].bN,
  `CS% án línu: C slær A (${T2["C (núna)"].bN.toFixed(4)} vs ${T2["A (fyrir vinnu, markaður DAUÐUR)"].bN.toFixed(4)})`);
ok(T2["C (núna)"].bN < T2["B (síðasta í gær)"].bN,
  `CS% án línu: C slær B (${T2["C (núna)"].bN.toFixed(4)} vs ${T2["B (síðasta í gær)"].bN.toFixed(4)})`);
ok(T2["C (núna)"].cN.mae < T2["B (síðasta í gær)"].cN.mae,
  `CS% án línu: C betur kvarðað en B (${T2["C (núna)"].cN.mae.toFixed(1)}pp vs ${T2["B (síðasta í gær)"].cN.mae.toFixed(1)}pp)`);

console.log(`\nÚTGÁFU-SAMANBURÐUR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
