/* ============================================================
   DEFCON-MIÐJUMENN — á varnar-FFDR að gilda um þá?

   TVÍVEGIS SPURT, TVÍVEGIS MÆLT, MEÐ TVEIMUR SKILGREININGUM:

   1. (27.7., tests/ffdr-player-points.mjs kafli C) Varnarsinni skilgreindur
      sem LÁGT xGI/90 úr fyrra tímabili. Niðurstaða: varnar-FFDR 0,1σ betri
      en sóknar-FFDR — hreint suð, og blöndusveipun óstöðug milli tímabila.
      ENGIN breyting réttlætt.

   2. (HÉR) Varnarsinni skilgreindur af RAUNVERULEGUM DefCon-skilum:
      `defensive_contribution` úr FPL. Það er BETRI skilgreining — Rice og
      Caicedo eru ekki "menn með lágt xGI", þeir eru menn sem VINNA
      varnaraðgerðir og fá 2 stig fyrir 12+ (MID-þröskuldur).
      Fable-lota gaf töluna "+1,43" fyrir DefCon-MID án þess að sú mæling
      fylgdi með (kaflar 12–15 vantar í handoffið sem barst), svo hún er
      endurmæld hér frá grunni.

   HÖRÐ SKORÐA SEM ÖLL NIÐURSTAÐA HÉR HVÍLIR Á:
   `defensive_contribution` er NÝ STIGAGJÖF og er AÐEINS til fyrir 2025/26.
   Eitt tímabil. Þess vegna er EKKI hægt að LOSO-krossprófa yfir tímabil.
   Í staðinn er notuð tíma-heiðarleg skipting INNAN tímabils: skilgreiningin
   (hverjir eru DefCon-menn) er lærð á GW1–19 og mæld á GW20–38. Það er
   það besta sem gögnin leyfa — og það er MIKLU veikari sönnun en 14/14
   tímabil. Sú fyrirvari fylgir hverri tölu hér.
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloFor, corr, rSE,
} from "./lib/e0.mjs";
import { makeFixDifficulty } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const e0Day = s => { const [d, m, y] = s.split("/"); return `${y.length === 2 ? "20" + y : y}-${m}-${d}`; };

/* ---------- FFDR per (dagsetning, lið) fyrir 2025/26 ---------- */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const E = eloFor(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const KEY = "2526", prevRows = byKey["2425"];
const list = [...byKey[KEY]].sort((a, b) => e0Day(a.Date).localeCompare(e0Day(b.Date)));
const prevStr = buildStrength(prevRows);
const teams = [...new Set(list.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
for (const t of teams) if (!prevStr[t]) prevStr[t] = { ...PROMO_DEFAULT };
const run = {}; for (const t of teams) run[t] = { g: 0, c: 0, sf: 0, sa: 0, n: 0 };
const ids = {}; let nn = 1; for (const t of teams) ids[t] = nn++;
const orig = new Map(byKey[KEY].map((r, i) => [r, i]));
const FDR = fdrFor(KEY, prevRows);
const ffdr = new Map();
for (const r of list) {
  const e = E.get(KEY, orig.get(r), r.HomeTeam, r.AwayTeam);
  const mk = marketForRow(r), p = FDR.forFixture(r.HomeTeam, r.AwayTeam);
  const mm = t => {
    const a = run[t], P = prevStr[t];
    const cur = a.n === 0 ? { xg90: P.xg90, xgc90: P.xgc90, sotFor: P.sotFor, sotAg: P.sotAg }
      : { xg90: a.g / a.n, xgc90: a.c / a.n, sotFor: a.sf / a.n, sotAg: a.sa / a.n };
    return { ...cur, matches: a.n, prevGoals: P.xg90, prevConc: P.xgc90,
      prevSotFor: P.sotFor, prevSotAg: P.sotAg };
  };
  const kickoff = `${r.Date}T00:00:00Z`;
  for (const [team, opTeam, home, fdr] of [
    [r.HomeTeam, r.AwayTeam, true, p.h], [r.AwayTeam, r.HomeTeam, false, p.a],
  ]) {
    const tm = { [ids[team]]: mm(team), [ids[opTeam]]: mm(opTeam) };
    const tb = { [ids[team]]: { short: team }, [ids[opTeam]]: { short: opTeam } };
    const eb = { [ids[team]]: { elo: home ? e.h : e.a }, [ids[opTeam]]: { elo: home ? e.a : e.h } };
    const odds = mk ? { [team]: { xga: home ? mk.axg : mk.hxg, xg: home ? mk.hxg : mk.axg, opp: opTeam, kickoff } } : null;
    const f = makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds, eloByTeam: eb });
    const fNo = makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds: null, eloByTeam: eb });
    const fx = { opp: ids[opTeam], home, fdr, kickoff };
    ffdr.set(`${r.Date}|${team}`, {
      def: f(ids[team], fx, 2), att: f(ids[team], fx, 4),
      defNo: fNo(ids[team], fx, 2), attNo: fNo(ids[team], fx, 4),
    });
  }
  const hs = run[r.HomeTeam], as = run[r.AwayTeam];
  hs.g += +r.FTHG; hs.c += +r.FTAG; hs.sf += +(r.HST || 0); hs.sa += +(r.AST || 0); hs.n++;
  as.g += +r.FTAG; as.c += +r.FTHG; as.sf += +(r.AST || 0); as.sa += +(r.HST || 0); as.n++;
}

/* ---------- Leikmannaraðir 2025/26 ---------- */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const rows = [];
for (const q of PG.seasons[KEY]) {
  if (q[H.pos] !== "MID" || q[H.starts] < 1 || q[H.mins] < 60) continue;
  const f = ffdr.get(`${q[H.date]}|${q[H.team]}`);
  if (!f) continue;
  rows.push({ name: q[H.name], round: q[H.round], pts: q[H.pts], mins: q[H.mins],
    dc: q[H.dc], cbit: q[H.cbit], cs: q[H.cs], goals: q[H.goals], assists: q[H.assists], ...f });
}
console.log(`\n${"=".repeat(78)}`);
console.log(`DEFCON-MIÐJUMENN — 2025/26 eingöngu (${rows.length} byrjunarliðs-umferðir)`);
console.log("=".repeat(78));
const dcHit = rows.filter(r => r.dc >= 12).length;
console.log(`DefCon-þröskuldi (12+) náð í ${dcHit} umferðum (${(100 * dcHit / rows.length).toFixed(0)}%)`);
ok(rows.length > 2000, `nóg gögn (${rows.length} umferðir)`);

/* ---------- Skilgreining lærð á GW1–19, mæld á GW20–38 ---------- */
const H1 = rows.filter(r => r.round <= 19), H2 = rows.filter(r => r.round > 19);
const agg = {};
for (const r of H1) {
  const a = agg[r.name] ||= { mins: 0, dc: 0, n: 0 };
  a.mins += r.mins; a.dc += (r.dc || 0); a.n++;
}
/* DefCon-hlutfall: hve oft náði hann 12+ á fyrri hluta */
const rate = {};
for (const r of H1) (rate[r.name] ||= { hit: 0, n: 0 }).n++;
for (const r of H1) if (r.dc >= 12) rate[r.name].hit++;
const dcRate = {};
for (const [nm, v] of Object.entries(rate)) if (v.n >= 5) dcRate[nm] = v.hit / v.n;

const test = H2.filter(r => dcRate[r.name] != null).map(r => ({ ...r, dcRate: dcRate[r.name] }));
console.log(`\nSeinni hluti (GW20+) með skilgreiningu úr fyrri hluta: ${test.length} umferðir` +
  ` · ${new Set(test.map(r => r.name)).size} leikmenn`);

console.log(`\n${"─".repeat(78)}`);
console.log("DefCon-hlutfall (úr GW1–19)   n     stig/leik   r(sóknar-FFDR)  r(varnar-FFDR)  hvor?");
console.log("─".repeat(78));
const bands = [
  ["0%  — engin DefCon-skil", r => r.dcRate === 0],
  ["1–20%", r => r.dcRate > 0 && r.dcRate <= 0.20],
  ["21–40%", r => r.dcRate > 0.20 && r.dcRate <= 0.40],
  [">40% — DefCon-menn", r => r.dcRate > 0.40],
];
const res = [];
for (const [label, f] of bands) {
  const g = test.filter(f);
  if (g.length < 60) { console.log(`  ${label.padEnd(29)} ${String(g.length).padStart(4)}   (of fá)`); continue; }
  const rAtt = corr(g.map(x => x.att), g.map(x => x.pts));
  const rDef = corr(g.map(x => x.def), g.map(x => x.pts));
  res.push({ label, n: g.length, rAtt, rDef, pts: mean(g.map(x => x.pts)) });
  console.log(`  ${label.padEnd(29)} ${String(g.length).padStart(4)}   ${mean(g.map(x => x.pts)).toFixed(2).padStart(6)}` +
    `      ${rAtt.toFixed(3)}          ${rDef.toFixed(3)}       ${Math.abs(rDef) > Math.abs(rAtt) ? "VARNAR" : "sóknar"}`);
}
/* Sama á KJARNANUM (án markaðar) — þar sem breyting hefði mest að segja */
console.log(`\n  Sama á KJARNANUM (án markaðslínu, þ.e. umferðir utan næstu):`);
for (const [label, f] of bands) {
  const g = test.filter(f);
  if (g.length < 60) continue;
  const rAtt = corr(g.map(x => x.attNo), g.map(x => x.pts));
  const rDef = corr(g.map(x => x.defNo), g.map(x => x.pts));
  console.log(`    ${label.padEnd(27)} sóknar ${rAtt.toFixed(3)}  ·  varnar ${rDef.toFixed(3)}` +
    `  ${Math.abs(rDef) > Math.abs(rAtt) ? "VARNAR" : "sóknar"}`);
}

/* ---------- Hvaðan koma stig DefCon-manna? ---------- */
console.log(`\n${"─".repeat(78)}\nHVAÐAN KOMA STIGIN? (skýrir hvers vegna, eða hvers vegna ekki)\n${"─".repeat(78)}`);
for (const [label, f] of bands) {
  const g = test.filter(f);
  if (g.length < 60) continue;
  const gi = mean(g.map(x => x.goals + x.assists));
  const csR = 100 * g.filter(x => x.cs >= 1).length / g.length;
  const dcR = 100 * g.filter(x => x.dc >= 12).length / g.length;
  console.log(`  ${label.padEnd(29)} mörk+assist/leik ${gi.toFixed(2)} · CS í ${csR.toFixed(0)}%` +
    ` · DefCon-þröskuldur í ${dcR.toFixed(0)}%`);
}

/* ---------- NIÐURSTAÐA ---------- */
const dcMen = res.find(r => r.label.startsWith(">40%"));
const nonDc = res.find(r => r.label.startsWith("0%"));
console.log(`\n${"─".repeat(78)}\nNIÐURSTAÐA\n${"─".repeat(78)}`);
if (dcMen) {
  const gap = Math.abs(dcMen.rDef) - Math.abs(dcMen.rAtt);
  const se = rSE(dcMen.n);
  console.log(`  DefCon-menn (n=${dcMen.n}): varnar ${dcMen.rDef.toFixed(3)} á móti sóknar ${dcMen.rAtt.toFixed(3)}`);
  console.log(`  munur ${gap >= 0 ? "+" : ""}${gap.toFixed(3)} · staðalfrávik ±${se.toFixed(3)} · ${(Math.abs(gap) / se).toFixed(1)}σ`);
  ok(Math.abs(gap) < 2 * se || dcMen.rDef < dcMen.rAtt,
    `munurinn er innan suðs EÐA varnar-FFDR vinnur ekki (${(Math.abs(gap) / se).toFixed(1)}σ)`);
  console.log(`\n  ${Math.abs(gap) > 2 * se && Math.abs(dcMen.rDef) > Math.abs(dcMen.rAtt)
    ? "-> VARNAR-FFDR VINNUR MARKTÆKT fyrir DefCon-menn. EN: eitt tímabil,\n     engin krossprófun milli tímabila. Þarf 2026/27 til að staðfesta."
    : "-> ENGIN breyting réttlætt, NÚ MEÐ RÉTTU SKILGREININGUNNI.\n     Fyrri mælingin (xGI/90-proxy) og þessi (raun-DefCon) segja það sama."}`);
}
console.log(`\n  FYRIRVARI SEM MÁ EKKI SLEPPA: DefCon-stigagjöf er aðeins til 2025/26.`);
console.log(`  Þetta er EITT tímabil með innan-tímabils skiptingu — margfalt veikari`);
console.log(`  sönnun en 14/14 tímabil sem aðrar FFDR-ákvarðanir hvíla á.`);

console.log(`\nDEFCON-MID: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
