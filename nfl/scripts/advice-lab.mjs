#!/usr/bin/env node
/* ============================================================
   advice-lab.mjs — BAETIR RADGJOFIN VID A-RANKING?

     node scripts/advice-lab.mjs [--scoring=ppr|standard]

   -> data/advice_<scoring>.json

   A-Ranking radar leikmonnum. Radgjofin i `src/advice.js` gerir
   annad: hun tekur tillit til thess HVER VERDUR ENN LAUS vid naesta
   val thitt og maelir thvi med theim sem tapast ella.

   THAD HLJOMAR SANNFAERANDI OG THAD ER NAKVAEMLEGA THESS VEGNA SEM
   THAD VERDUR AD MAELA. Hugmyndin er studd i ollum draft-leidbeiningum
   sem til eru; enginn theirra syar tolu. Ef hun baetir engu a hun ad
   fara ut, hversu skynsamleg sem hun hljomar.

   ADFERD: sama hermun og annars stadar i verkefninu — 12-lida snakk,
   oll 12 saetin, motherjarnir drafta eftir ADP, skorad a raunverulegum
   stigum. Eini munurinn er hvernig OKKAR lid velur.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { recommend, survivalProb, picksUntilNext, defaultSd, SD_K } from "../src/advice.js";
import { startersPoints, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean, bootstrapDiff } from "../src/learn.js";

import { stamp } from "./lib/provenance.mjs";
import { parseArgs } from "./lib/args.mjs";
const OUT = path.resolve(process.cwd(), "data");
/* Gildi sem raedur skraarnafni verdur ad koma ur leyfdum lista —
   sja lib/args.mjs um skrarnar med bilum i nafni. */
const ARG = parseArgs(process.argv.slice(2), {
  scoring: ["ppr", "standard"],
});
const SCORING = String(ARG.scoring || "ppr");
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.map((r) => r.season))].sort();

  /* ---------- MAELUM SD-REGLUNA ----------
     `advice.js` notar 0,55*sqrt(ADP) thegar FFC birtir ekki stdev.
     Su tala ma ekki vera agiskun. */
  const withSd = rows.filter((r) => r.adp != null && r.adpSd != null && r.adpSd > 0);
  let num = 0, den = 0;
  for (const r of withSd) { const s = Math.sqrt(r.adp); num += r.adpSd * s; den += s * s; }
  const kFit = den ? num / den : null;
  console.log(`sd-regla: stdev ~ k*sqrt(ADP), k maelt = ${kFit.toFixed(3)} ` +
    `(${withSd.length} radir, koden notar ${SD_K})`);

  /* ---------- HERMUN ---------- */
  const byStrategy = { aRank: {}, advice: {}, adp: {} };

  for (const year of years) {
    const yr = rows.filter((r) => r.season === year && r.adp != null);
    if (yr.length < 120) continue;
    const hasSleeper = yr.filter((r) => r.sleeperProj != null).length > 100;
    if (!hasSleeper) continue;             // A-Ranking krefst Sleeper-spar

    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const proj = (r) => r.sleeperProj;

    /* VBD ur spanni — sama uppskrift og A-Ranking i appinu. */
    const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
    const base = {};
    for (const pos of ["QB", "RB", "WR", "TE"]) {
      const v = yr.filter((r) => r.pos === pos && proj(r) != null)
        .map(proj).sort((a, b) => b - a);
      if (!v.length) continue;
      const k = Math.min(v.length - 1, REPL[pos] - 1);
      base[pos] = mean(v.slice(Math.max(0, k - 1), k + 2));
    }
    const pool = yr.filter((r) => proj(r) != null && base[r.pos] != null)
      .map((r) => ({
        id: r.id, name: r.name, pos: r.pos,
        vbd: proj(r) - base[r.pos],
        adp: r.adp, adpSd: r.adpSd, actual: pts(r),
      }));
    if (pool.length < 120) continue;

    const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }]));
    const adpOrder = pool.slice().sort((a, b) => a.adp - b.adp).map((p) => p.id);
    const aRankOrder = pool.slice().sort((a, b) => b.vbd - a.vbd).map((p) => p.id);

    for (const [key, run] of [
      ["aRank", (s) => draft(pool, adpOrder, actual, s, staticPicker(aRankOrder))],
      ["adp", (s) => draft(pool, adpOrder, actual, s, staticPicker(adpOrder))],
      ["advice", (s) => draft(pool, adpOrder, actual, s, advicePicker())],
    ]) {
      const slots = [];
      for (let slot = 1; slot <= TEAMS; slot++) slots.push(run(slot));
      /* `mean` SKILAR NULL FYRIR TOMT, OG `null * 10` ER 0 — sja notuna
         vid `mean` i src/learn.js. Med TEAMS = 12 getur `slots` ekki ordid
         tomt i dag, svo thetta er LATENT og ekki lifandi villa; hlidid er
         samt hér thvi thad er ODYRT og thvi er throskuldurinn fyrir ad
         thetta VERDI villa (einhver gerir TEAMS ad breytu) ekki hljodur
         nulldalkur i skyrslu. */
      const m = mean(slots);
      byStrategy[key][year] = m == null ? null : Math.round(m * 10) / 10;
    }
  }

  /* ---------- NIDURSTADA ---------- */
  const ys = Object.keys(byStrategy.aRank);
  /* HVERT AR GETUR HOPPAD YFIR (fjogur `continue`-hlid ad ofan: < 120
     radir, engin Sleeper-spa, tom stodulaug, < 120 i laug), svo `ys`
     GETUR ordid tomt — og tha var `mean(ys...)` null og `.toFixed(1)`
     kastadi TypeError i lok keyrslunnar. Uttekt sem sagdist hafa talid
     kallendur `mean` TAEMANDI missti thennan; hann er hér med.
     Prosa sem segir "—" er rett svar, TypeError er thad ekki.        */
  const fmt1 = (v) => (v == null ? "—" : v.toFixed(1));
  if (!ys.length) {
    console.log("\n  ENGIN AR STODUST HLIDIN (< 120 radir, engin Sleeper-spa " +
      "eda of grunn laug) — engin maeling, engar tolur.");
    return;
  }
  console.log(`\n${"=".repeat(78)}`);
  console.log(`  RADGJOF GEGN A-RANKING · ${SCORING.toUpperCase()} · ${TEAMS} lid · ${ys.length} timabil`);
  console.log("=".repeat(78));
  console.log("  adferd        " + ys.map((y) => String(y).padStart(8)).join("") + "   medaltal");
  for (const k of ["advice", "aRank", "adp"]) {
    console.log(`  ${k.padEnd(14)}` +
      ys.map((y) => String(byStrategy[k][y]).padStart(8)).join("") +
      `   ${fmt1(mean(ys.map((y) => byStrategy[k][y]).filter((v) => v != null)))}`);
  }

  const vsA = bootstrapDiff(byStrategy.advice, byStrategy.aRank);
  const vsAdp = bootstrapDiff(byStrategy.advice, byStrategy.adp);
  const wins = ys.filter((y) => byStrategy.advice[y] > byStrategy.aRank[y]).length;

  console.log(`\n  radgjof gegn A-Ranking : ${sgn(vsA.diff)} ` +
    `[${sgn(vsA.lo)}, ${sgn(vsA.hi)}]  ${vsA.excludesZero ? "MARKTAEKT" : "innan vikmarka"}` +
    `  · vinnur ${wins}/${ys.length} ar`);
  console.log(`  radgjof gegn ADP       : ${sgn(vsAdp.diff)} ` +
    `[${sgn(vsAdp.lo)}, ${sgn(vsAdp.hi)}]  ${vsAdp.excludesZero ? "MARKTAEKT" : "innan vikmarka"}`);

  console.log(vsA.excludesZero && vsA.diff > 0
    ? "\n  -> radgjofin baetir vid. Hun a ad vera i appinu."
    : vsA.diff > 0
      ? "\n  -> radgjofin er BETRI en ekki marktaekt. Ma vera med, en verdur ad segja fra thvi."
      : "\n  -> radgjofin baetir ENGU. Hun a ad fara ut, hversu skynsamleg sem hun hljomar.");

  await writeFile(path.join(OUT, `advice_${SCORING}.json`), JSON.stringify({
    /* Hvernig thessi skra vard til — sja lib/provenance.mjs. */
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr" }, inputs: ["features.json"], dataDir: OUT }),
    generated: new Date().toISOString(),
    scoring: SCORING, teams: TEAMS, rounds: ROUNDS, seasons: ys.map(Number),
    sdRule: { fitted: Math.round(kFit * 1000) / 1000, used: SD_K, n: withSd.length },
    bySeason: byStrategy,
    vsARank: { ...vsA, winYears: wins, years: ys.length },
    vsAdp,
  }, null, 1));
  console.log(`\n-> data/advice_${SCORING}.json`);
}

/* ---------- hermir ---------- */

/** Fast bord: taktu efsta lausa sem thu matt. */
function staticPicker(order) {
  return (avail, roster) => {
    const counts = {};
    for (const r of roster) counts[r.pos] = (counts[r.pos] || 0) + 1;
    const set = new Set(avail.map((p) => p.id));
    for (const id of order) {
      if (!set.has(id)) continue;
      const p = avail.find((x) => x.id === id);
      const max = LEAGUE.maxPos[p.pos];
      if (max != null && (counts[p.pos] || 0) >= max) continue;
      return p;
    }
    return null;
  };
}

/**
 * BRADANAUÐSYNAR-ARMURINN — velur thann sem bradanauðsyn setur efst.
 *
 * HER VAR MAELINGIN HAETT AD MAELA NEITT. Fallid tok adur `r.picks[0]`.
 * En `recommend()` RADAR eftir VBD (sja langu notuna i advice.js: rodin
 * er A-Ranking og bradanauðsyn er upplysing sem raedur ekki), svo
 * `picks[0]` ER haesti VBD — nakvaemlega sami madur og hinn armurinn
 * velur. Baðir armar drofudu thvi somu leikmennina og munurinn maeldist
 * **0,0 i ollum fimm timabilum, i badum stigagjofum**.
 *
 * Skrain a disknum bar samt -63,8 fra eldri utgafu kodans, THEGAR
 * `recommend` radadi eftir bradanauðsyn. Og `tests/advice.mjs` var
 * GRAENT allan timann — thvi thad las TOLUNA UR SKRANNI i stad thess ad
 * endurleida hana. Nakvaemlega thogla profid sem CLAUDE.md 5b lysir:
 * fullyrding sem finnur ekkert og heldur bara afram.
 *
 * `urgencyPick` er sa sem bradanauðsyn hefdi valid og er thvi retta
 * inntakid i thennan arm. Nidurstadan sem rettlaetir akvordunina i
 * advice.js er thar med endurgeranleg ur kodanum sem er i loftinu.
 */
function advicePicker() {
  return (avail, roster, pick) => {
    const r = recommend({ available: avail, roster, pick, league: LEAGUE });
    return r.urgencyPick || r.picks[0] || null;
  };
}

/**
 * Eitt draft. Motherjarnir fylgja ADP; okkar lid notar `picker`.
 * Sama stodu-thak gildir um alla — sja notu i accuracy.js um hvers
 * vegna thad skiptir ollu.
 */
function draft(pool, fieldOrder, actual, mySlot, picker) {
  const byId = new Map(pool.map((p) => [p.id, p]));
  const taken = new Set();
  const rosters = Array.from({ length: TEAMS + 1 }, () => []);
  const counts = Array.from({ length: TEAMS + 1 }, () => ({}));

  let pick = 0;
  for (let r = 0; r < ROUNDS; r++) {
    const order = r % 2 === 0
      ? range(1, TEAMS) : range(1, TEAMS).reverse();
    for (const t of order) {
      pick++;
      let chosen = null;
      if (t === mySlot) {
        const avail = pool.filter((p) => !taken.has(p.id));
        chosen = picker(avail, rosters[t], pick);
      } else {
        for (const id of fieldOrder) {
          if (taken.has(id)) continue;
          const p = byId.get(id);
          const max = LEAGUE.maxPos[p.pos];
          if (max != null && (counts[t][p.pos] || 0) >= max) continue;
          chosen = p; break;
        }
      }
      if (!chosen) continue;
      taken.add(chosen.id);
      rosters[t].push(chosen);
      counts[t][chosen.pos] = (counts[t][chosen.pos] || 0) + 1;
    }
  }
  return startersPoints(rosters[mySlot].map((p) => p.id), actual, LEAGUE);
}

const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
const sgn = (x) => (x == null ? "-" : (x > 0 ? "+" : "") + x.toFixed(1));

main().catch((e) => { console.error(e); process.exit(1); });
