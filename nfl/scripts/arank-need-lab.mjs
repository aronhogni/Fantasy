#!/usr/bin/env node
/* ============================================================
   arank-need-lab.mjs — GETUM VID BAETT A-RANKING? FIMM HUGMYNDIR.

     node scripts/arank-need-lab.mjs [--scoring=ppr] [--proj=fftoday]
                                     [--runs=10] [--json=<slod>]

   `arank-lab.mjs` leitar i ÞREMUR hnoppum (varamanns-threp, skrepping,
   blondun vid hra spa) — 45 afbrigdi af SOMU hugmynd. Þessi skrifta
   spyr hvort eitthvad ANNAD baeti hana, og hun spyr thad a somu
   gognum, i sama hermi og med somu profum (`lib/arank-world.mjs`).

   FIMM HUGMYNDIR, OG HVER THEIRRA KEMUR UR EINHVERJU RAUNVERULEGU:

   1. NEED — HOPURINN SEM ThU AT ThEGAR.
      Ur mock-drafti notandans 27.8.2026: i umferd 9 og 10 var efsti
      madur bordsins TE (Kelce, Andrews) og hann atti ThEGAR Loveland
      og Kittle. Hann tok Purdy og Nix — TVO leikstjornendur i deild
      sem byrjar EINN. `advice.js` segir sjalft "you still need 2 at
      WR — noted, not ranked", svo thetta er MEDVITAD val og thad var
      MAELT: bradanauðsyn sem ROD tapadi 60,06 stigum. EN su maeling
      var um ad TEYGJA SIG eftir stodu sem er ad thorna upp. Hun var
      ALDREI um ad taka ANNAN mann i saeti sem byrjar EINN. Þetta eru
      tvaer olikar spurningar og adeins onnur hefur verid maeld.

   2. DYN — VARAMANNS-THREPID UR ThEIM SEM ERU EFTIR.
      Bordid reiknar VBD einu sinni, fyrir draftid. Herbergid tæmir
      stodurnar misjafnt: se RB-runa i gangi er ThINN naesti RB
      ekki lengur borinn saman vid RB28 heldur vid thann sem verdur
      eftir. `accuracy.js` styður thetta beinlinis ("kvikt VBD
      endurreiknar varamanns-threpid ur THEIM SEM ERU EFTIR") og
      enginn hafdi maelt thad.

   3. MKT — MARKADURINN SEM ANNAD ALIT.
      ADP er ekki bara "hvenaer fer hann" heldur summa af thvi sem
      thusundir draftara vita. Spain okkar veit thad ekki. Blondun a
      RODUM (ekki stigum) svo kvardarnir tveir thurfi ekki ad vera
      sambaerilegir.

   4. ECR — SAMA HUGMYND, ANNAR MARKADUR (sérfraedingar, ekki draftarar).

   5. AVAIL — TILTAEKILEIKI. `durability`/`missed2y` eru i
      `features.json` og fara HVERGI inn i A-Ranking i dag.

   PROFID SEM RAEDUR ER EINVIGID GEGN NUVERANDI BORDI, ekki gegn
   Sleeper. Spurningin er "a ad skipta?", og hun er svarad med thvi ad
   lata bordin tvo drafta i SOMU deild, a moti somu motherjum, i badar
   attir — sama honnun og `arank-lab.mjs` notar gegn Sleeper.

   VAL A AFBRIGDI ER WALK-FORWARD. Ad velja besta afbrigdid a ollum
   arunum og segja svo "sja, thad vinnur" er leki, og hann er
   RAUNVERULEGUR hér: 5 timabil og 45 afbrigdi i hinni skriftunni gafu
   afbrigdi sem VANN gegn Sleeper og TAPADI einviginu.
   ============================================================ */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";
import {
  CURRENT_REPL, vbdValues, loadWorld, makeRun, makeHeadToHead, makeTests,
  sgn, round1,
} from "./lib/arank-world.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  scoring: ["ppr", "standard"], proj: ["sleeper", "fftoday"],
  runs: "number", json: "string",
});
const SCORING = String(ARG.scoring || "ppr");
const PROJ = String(ARG.proj || "fftoday");
const RUNS = Number(ARG.runs || 10);
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };

/* Hve marga i hverri stodu getur lidid BYRJAT med? FLEX er talid med
   sem eitt aukasaeti a hverja flex-haefa stodu — sa sem er i flexinu
   er raunverulega ad byrja. Talan er LEIDD ur `LEAGUE`, ekki skrifud:
   deild med adra uppstillingu faer adra tolu an thess ad nokkur muni
   eftir thvi ad breyta henni hér. */
const startable = (() => {
  const st = LEAGUE.starters, flex = st.FLEX || 0;
  const out = {};
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    out[pos] = (st[pos] || 0) + ((LEAGUE.flexPos || []).includes(pos) ? flex : 0);
  }
  return out;
})();

/** Kort ur gildum -> rodum (1 = bestur). */
const rankMap = (vals) => {
  const s = [...vals.entries()].sort((a, b) => b[1] - a[1]);
  return new Map(s.map(([id], i) => [id, i + 1]));
};
const boardFrom = (vals) => rankMap(vals);

/* ---------- bordin ---------- */
function baseVals(pool) { return vbdValues(pool, CURRENT_REPL, {}); }

/** 1. NEED: fradrattur fyrir hvern mann UMFRAM thad sem byrjar.
 *  `only` afmarkar hvada stodur bera fradrattinn — thad er
 *  SUNDURLIDUNIN sem sker ur um hvort ahrifin seu "ekki taka annan
 *  leikstjornanda" (sem maelikvardinn getur ekki verdlagt: hann telur
 *  arstidar-summu byrjunarlids, svo varamadur i einssaetis stodu er
 *  NAKVAEMLEGA 0 i honum) eda eitthvad breidara. */
function needBoard(pool, { k, only = null, slots = startable }) {
  const vals = baseVals(pool);
  const posOf = new Map(pool.map((p) => [p.id, p.pos]));
  return (taken, counts) => {
    const adj = new Map();
    for (const [id, v] of vals) {
      const pos = posOf.get(id);
      const on = !only || only.includes(pos);
      const surplus = on ? Math.max(0, (counts[pos] || 0) - (slots[pos] ?? 99) + 1) : 0;
      adj.set(id, v - k * surplus);
    }
    return boardFrom(adj);
  };
}

/** 2. DYN: varamanns-threpid reiknad ur theim sem eru EFTIR. */
function dynBoard(pool) {
  let cache = null, cacheAt = -1;
  return (taken, counts, round) => {
    if (cache && round === cacheAt) return cache;
    const left = pool.filter((p) => !taken.has(p.id));
    /* SAMA THREPA-DYPT og i dag (`CURRENT_REPL` = byrjendur+flex i
       heilli deild), en talid i LAUGINNI SEM ER EFTIR. Se helmingur
       RB-anna farinn er RB28 i upphaflegu lauginni ekki sami madur og
       RB28 i theirri sem er eftir — og thad er munurinn sem er maeldur.
       Þrepid er thvi ekki ny tala; thad er sama talan spurd seinna. */
    cache = boardFrom(vbdValues(left, CURRENT_REPL, {}));
    cacheAt = round;
    return cache;
  };
}

/** 3./4. MKT/ECR: blondun a RODUM vid markadinn. */
function marketBoard(pool, { w, field }) {
  const vals = baseVals(pool);
  const vRank = rankMap(vals);
  const have = pool.filter((p) => p[field] != null);
  const mRank = new Map(have.slice().sort((a, b) => a[field] - b[field])
    .map((p, i) => [p.id, i + 1]));
  const mixed = new Map();
  for (const [id, r] of vRank) {
    const m = mRank.get(id);
    /* VANTI MARKADSTALA ER HUN EKKI NULL OG EKKI MIDJAN — thá er
       rodin okkar latin standa OBREYTT fyrir thann mann. Ad giska a
       midju vaeri ad bua til alit sem enginn hefur. */
    mixed.set(id, -(m == null ? r : (1 - w) * r + w * m));
  }
  return boardFrom(mixed);
}

/** 5. AVAIL: spain skorin nidur eftir maeldri fjarveru. */
function availBoard(pool, { k }) {
  const adj = pool.map((p) => {
    /* `durability` er hlutfall leikja sem hann NADI (0..1) i
       `build-extra-features`. `missed2y` er fjoldi missta leikja.
       Bædi geta vantad og tha er EKKERT dregid fra — vantar er ekki
       "heilbrigdur" og ekki "meiddur". */
    const d = p.durability;
    const pen = d == null ? 0 : k * (1 - Math.max(0, Math.min(1, d)));
    return { ...p, proj: p.proj * (1 - pen) };
  });
  return boardFrom(vbdValues(adj, CURRENT_REPL, {}));
}

async function main() {
  const { world, ys, years } = await loadWorld({ dataDir: OUT, scoring: SCORING, proj: PROJ });
  console.log(`timabil (${PROJ}): ${years.join(", ")}`);
  requireSeasons(ys, "timabil med hreina spa");
  console.log(`hermdir heimar: ${ys.length} · einvigi-keyrslur: ${RUNS}`);
  console.log(`byrjunarsaeti per stoda (leidd ur LEAGUE): ${JSON.stringify(startable)}`);

  const run = makeRun({ world, ys, league: LEAGUE, teams: TEAMS });
  const sleeperRuns = run((pool, y) => world[y].sleeper);
  const slpPerSeason = Object.fromEntries(ys.map((y) => [y, mean(sleeperRuns[y])]));
  const tests = makeTests({ ys, teams: TEAMS, baseRuns: sleeperRuns, basePerSeason: slpPerSeason });

  const CUR = (pool) => boardFrom(baseVals(pool));
  const VARIANTS = [
    ["current", CUR],
    ["need k=5", (p) => needBoard(p, { k: 5 })],
    ["need k=15", (p) => needBoard(p, { k: 15 })],
    ["need k=30", (p) => needBoard(p, { k: 30 })],
    ["need k=60", (p) => needBoard(p, { k: 60 })],
    ["need k=30 RB/WR only", (p) => needBoard(p, { k: 30, only: ["RB", "WR"] })],
    /* HVE RUMT A "getur byrjad" AD VERA? Sjalfgefna talan gefur FLEX-saeti
       a HVERJA flex-haefa stodu, sem er rumt: eitt flex-saeti er talid
       thrisvar. Mock-draft notandans 27.8. syndi tilfellid — annar TE
       (Kittle) bar ENGAN fradratt af thvi ad TE faer flexid, og hann
       spiladi aldrei. Þessi tvo afbrigdi eru hin morkin. */
    ["need k=30 slots=starters only", (p) => needBoard(p, { k: 30,
      slots: { QB: 1, RB: 2, WR: 3, TE: 1 } })],
    ["need k=30 slots=flex to RB/WR", (p) => needBoard(p, { k: 30,
      slots: { QB: 1, RB: 3, WR: 4, TE: 1 } })],
    ["need k=30 QB/TE only", (p) => needBoard(p, { k: 30, only: ["QB", "TE"] })],
    ["dyn (repl ur theim sem eru eftir)", (p) => dynBoard(p)],
    ["mkt adp w=0.15", (p) => marketBoard(p, { w: 0.15, field: "adp" })],
    ["mkt adp w=0.30", (p) => marketBoard(p, { w: 0.30, field: "adp" })],
    ["mkt adp w=0.50", (p) => marketBoard(p, { w: 0.50, field: "adp" })],
    ["mkt ecr w=0.30", (p) => marketBoard(p, { w: 0.30, field: "ecr" })],
    ["avail k=0.15", (p) => availBoard(p, { k: 0.15 })],
    ["avail k=0.30", (p) => availBoard(p, { k: 0.30 })],
  ];

  /* ---------- 1. ODYRA SKIMUNIN: stig gegn ollum saetum ---------- */
  console.log(`\n--- SKIMUN: medalstig byrjunarlids (${ys.length} ar x ${TEAMS} saeti) ---`);
  const screened = [];
  for (const [name, mk] of VARIANTS) {
    const runs = run((pool) => mk(pool));
    const perSeason = Object.fromEntries(ys.map((y) => [y, mean(runs[y])]));
    const m = mean(ys.map((y) => perSeason[y]));
    screened.push({ name, mk, runs, perSeason, mean: m });
  }
  const cur = screened.find((s) => s.name === "current");
  screened.slice().sort((a, b) => b.mean - a.mean).forEach((s) => {
    const wins = ys.filter((y) => s.perSeason[y] > cur.perSeason[y]).length;
    console.log(`${s.mean.toFixed(1).padStart(8)}  ${sgn(s.mean - cur.mean).padStart(7)} vs current` +
      `  ${String(wins).padStart(2)}/${ys.length} ar  ${s.name}`);
  });

  /* ---------- 2. EINVIGI GEGN NUVERANDI BORDI ---------- */
  const h2h = makeHeadToHead({ world, ys, league: LEAGUE, teams: TEAMS, runs: RUNS,
    rivalOf: (w) => boardFrom(baseVals(w.pool)) });
  const finalists = screened.filter((s) => s.name !== "current")
    .sort((a, b) => b.mean - a.mean).slice(0, Number(ARG.top || 6));
  console.log(`\n--- EINVIGI I SOMU DEILD GEGN NUVERANDI BORDI (${finalists.length} efstu) ---`);
  const duels = [];
  for (const f of finalists) {
    const h = h2h((pool) => f.mk(pool));
    duels.push({ name: f.name, h });
    console.log(`\n  ${f.name}`);
    console.log(`    medalmunur ${sgn(h.mean)} stig · vinnur ${h.wins}/${h.n} einvigi ` +
      `(${(h.winRate * 100).toFixed(1)}%) · ${h.yearWins}/${h.years} ar`);
    console.log(`    per ar: ${Object.entries(h.byYear).map(([y, v]) => `${y} ${sgn(v)}`).join("  ")}`);
    console.log(`    t = ${h.t}, 95% [${sgn(h.lo)}, ${sgn(h.hi)}]  ` +
      (h.significant ? "MARKTAEKT" : "ekki marktaekt") + ` · tekna-prof p = ${h.signP}`);
  }

  /* ---------- 3. WALK-FORWARD: velur maelingin rett fyrirfram? ---------- */
  const wf = {};
  for (let i = 1; i < ys.length; i++) {
    const y = ys[i], prior = ys.slice(0, i);
    const best = screened.slice().sort((a, b) =>
      mean(prior.map((p) => b.perSeason[p])) - mean(prior.map((p) => a.perSeason[p])))[0];
    wf[y] = { chosen: best.name, points: best.perSeason[y], runs: best.runs[y],
              curPoints: cur.perSeason[y] };
  }
  const wfYears = Object.keys(wf).map(Number);
  const wfWins = wfYears.filter((y) => wf[y].points > wf[y].curPoints).length;
  console.log(`\n--- WALK-FORWARD (valid a fyrri arum, beitt a arid) ---`);
  for (const y of wfYears) {
    console.log(`   ${y}  ${wf[y].points.toFixed(1)} vs current ${wf[y].curPoints.toFixed(1)}` +
      `  ${sgn(wf[y].points - wf[y].curPoints)}   <- ${wf[y].chosen}`);
  }
  console.log(`   walk-forward slaer current i ${wfWins}/${wfYears.length} arum, ` +
    `medaltal ${sgn(mean(wfYears.map((y) => wf[y].points - wf[y].curPoints)))} stig`);

  const resCur = tests("current", cur.perSeason, cur.runs);
  const out = {
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", proj: "fftoday", runs: 10, teams: TEAMS, rounds: ROUNDS },
      inputs: ["features.json"], dataDir: OUT }),
    scoring: SCORING, proj: PROJ, seasons: ys, teams: TEAMS, rounds: ROUNDS,
    startable,
    screen: screened.map((s) => ({ name: s.name, mean: round1(s.mean),
      vsCurrent: round1(s.mean - cur.mean),
      perSeason: Object.fromEntries(ys.map((y) => [y, round1(s.perSeason[y])])) })),
    duels: duels.map((d) => ({ name: d.name, ...d.h })),
    walkForward: Object.fromEntries(wfYears.map((y) => [y, {
      chosen: wf[y].chosen, points: round1(wf[y].points),
      current: round1(wf[y].curPoints), diff: round1(wf[y].points - wf[y].curPoints) }])),
    currentVsSleeper: resCur,
  };
  const dest = ARG.json ? String(ARG.json)
    : path.join(OUT, `arank_need_${SCORING}${PROJ === "fftoday" ? "_fftoday" : ""}.json`);
  await writeFile(dest, JSON.stringify(out, null, 1));
  console.log(`\n-> ${dest}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
