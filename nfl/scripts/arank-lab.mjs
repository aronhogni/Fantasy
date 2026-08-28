#!/usr/bin/env node
/* ============================================================
   arank-lab.mjs — GERUM A-RANKING BETRI, OG MAELUM THAD RETT.

     node scripts/arank-lab.mjs [--scoring=ppr|standard]

   -> data/arank_<scoring>.json

   A-Ranking = spa Sleeper -> virdi yfir varamanni. Hun slaer Sleeper
   um ~75 stig og vinnur oll timabilin, en med fimm timabilum eru
   bootstrap-vikmork klosud per ar OFUR-IHALDSSOM. Tvennt er gert hér:

   1. LEITAD AD BETRI UTGAFU af umreikningnum — varamanns-threpid,
      slettun spar og blondun vid hra spa — ALLT WALK-FORWARD svo
      valid se ekki gert a sama gagni og maelt er a.

   2. MAELT MED THREMUR OLIKUM PROFUM sem hafa olikan styrk og
      olikar forsendur. Ad birta adeins thad ihaldssamasta er jafn
      villandi og ad birta adeins thad hagstaedasta:
        - bootstrap klosad per timabil  (faerst, 5 klasar)
        - tekna-prof a timabilum         (5/5 -> p = 1/32)
        - pardur samanburdur per (timabil, saeti), 60 por,
          med klosun leidrettri fyrir fylgni innan timabils
   ============================================================ */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
/* HEIMURINN, BORDID OG PROFIN BUA I `lib/arank-world.mjs` — sja hausinn
   thar. Ekkert af thessu var endurritad; thad var FLUTT, og profsteinn
   flutningsins er ad `arank_ppr.json` er byte-eins a eftir. */
import {
  REPL_VARIANTS, vbdBoard, loadWorld, makeRun, makeHeadToHead, makeTests,
  binomialTail, sgn, round1, round2, round4,
} from "./lib/arank-world.mjs";

import { parseArgs, requireSeasons } from "./lib/args.mjs";
const OUT = path.resolve(process.cwd(), "data");
/* Gildi sem raedur skraarnafni verdur ad koma ur leyfdum lista —
   sja lib/args.mjs um skrarnar med bilum i nafni. */
const ARG = parseArgs(process.argv.slice(2), {
  scoring: ["ppr", "standard"],
  proj: ["sleeper", "fftoday"],
  runs: "number",
});
const SCORING = String(ARG.scoring || "ppr");
/* HVADA SPA ER GRUNNURINN.
   `sleeper` (sjalfgefid) naer yfir 5 hrein timabil. `fftoday` naer yfir
   **11** — 2015-2025, oll gegnum sama leka-hlid (sja build-features).
   Aetlunin er ekki ad skipta um heimild heldur ad geta spurt SOMU
   spurningar a tvofalt lengri sogu: er A-Ranking betri en hra
   stigarod, og er munurinn marktaekur? Fimm ar dugdu ekki i PPR. */
const PROJ = String(ARG.proj || "sleeper");
const PROJ_FIELD = PROJ === "fftoday" ? "ffProj" : "sleeperProj";
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };

/* ---------- afbrigdin sem eru profud ----------
   Hvert afbrigdi er FALL sem tekur laugina og skilar bordi. */

async function main() {
  const { world, ys, years } = await loadWorld({ dataDir: OUT, scoring: SCORING, proj: PROJ });
  console.log(`timabil med hreina spa (${PROJ}): ${years.join(", ")}`);
  requireSeasons(ys, "timabil med hreina spa");
  console.log(`hermdir heimar: ${ys.length}`);

  /* ============================================================
     HAVADI I VELLINUM — thad sem gerir maelinguna nakvaemari
     ============================================================
     Fyrri utgafa let motherjana drafta NAKVAEMLEGA eftir ADP. Su
     hermun er afradin: hun gefur EITT sýni per (ar, saeti) og allt
     flakt milli ara er tho blanda af (a) raunverulegum arsmun og (b)
     tilviljun um hverjir raktust til okkar i thvi eina drafti.

     Raunveruleg droft eru ekki afradin — thess vegna hefur ADP
     stadalfravik. Med thvi ad hrista vollinn med THVI SAMA fraviki
     og FFC maelir faum vid morg ohad sýni per ar. Thad fjarlaegir
     lid (b) ur dreifingunni og skilur eftir lid (a), sem er thad
     sem vid viljum maela.

     ATH: thetta eykur NAKVAEMNI maelingarinnar a hverju ari. Thad
     minnkar EKKI raunverulegan mun milli ara, og ma thvi ekki nota
     til ad thykjast hafa fleiri timabil en fimm.

     Fraekornid er fast — sama keyrsla gefur somu tolu. */
  const NOISE_RUNS = Number(ARG.runs || 20);
  const run = makeRun({ world, ys, league: LEAGUE, teams: TEAMS });

  const sleeperRuns = run((pool, y) => world[y].sleeper);
  const adpRuns = run((pool, y) => world[y].field);

  /* ---------- 1. LEIT AD BETRI UMREIKNINGI ---------- */
  const grid = [];
  for (const [name, repl] of Object.entries(REPL_VARIANTS)) {
    for (const shrink of [0, 0.1, 0.2]) {
      for (const blend of [0, 0.1, 0.25]) {
        grid.push({ name, repl, shrink, blend });
      }
    }
  }
  console.log(`\nprofa ${grid.length} afbrigdi …`);

  const scored = grid.map((g) => {
    const runs = run((pool) => vbdBoard(pool, g.repl, g));
    const perSeason = Object.fromEntries(ys.map((y) => [y, mean(runs[y])]));
    return { ...g, runs, perSeason, mean: mean(ys.map((y) => perSeason[y])) };
  });
  scored.sort((a, b) => b.mean - a.mean);

  const slpPerSeason = Object.fromEntries(ys.map((y) => [y, mean(sleeperRuns[y])]));
  const adpPerSeason = Object.fromEntries(ys.map((y) => [y, mean(adpRuns[y])]));

  console.log("\n  stig   vs Slp  vinnur  threp                      skrepp blanda");
  for (const s of scored.slice(0, 10)) {
    const d = s.mean - mean(Object.values(slpPerSeason));
    const w = ys.filter((y) => s.perSeason[y] > slpPerSeason[y]).length;
    console.log(`${s.mean.toFixed(1).padStart(7)} ${sgn(d).padStart(7)}  ${w}/${ys.length}` +
      `    ${s.name.padEnd(26)} ${String(s.shrink).padStart(4)}  ${String(s.blend).padStart(4)}`);
  }

  /* ---------- 2. WALK-FORWARD VAL A AFBRIGDI ----------
     Ad velja besta afbrigdid a ollum arunum og segja svo "sja, thad
     vinnur" er LEKI. Rett adferd: fyrir hvert ar er valid gert a
     arunum A UNDAN og beitt a arid sjalft. */
  const wf = {};
  for (let i = 1; i < ys.length; i++) {
    const y = ys[i], prior = ys.slice(0, i);
    const best = scored.slice().sort((a, b) =>
      mean(prior.map((p) => b.perSeason[p])) - mean(prior.map((p) => a.perSeason[p])))[0];
    wf[y] = { chosen: `${best.name} shrink=${best.shrink} blend=${best.blend}`,
              points: best.perSeason[y], runs: best.runs[y] };
  }
  const wfYears = Object.keys(wf).map(Number);
  console.log(`\n  WALK-FORWARD (afbrigdi valid a fyrri arum):`);
  for (const y of wfYears) {
    console.log(`    ${y}  ${wf[y].points.toFixed(1)}  ` +
      `(Sleeper ${slpPerSeason[y].toFixed(1)})  <- ${wf[y].chosen}`);
  }

  /* ============================================================
     3. BEINT EINVIGI I SAMA DRAFTI — RETTA TILRAUNAHONNUNIN
     ============================================================
     Fyrri profin bera saman TVO ADSKILIN droft og lenda thvi i thvi
     ad ars-havadinn drekkir muninum: 2025 var lagskorandi ar fyrir
     ALLA, 2024 hatt fyrir alla, og su sveifla (sd ~150 stig) er
     margfalt staerri en munurinn sem verid er ad maela (~75).

     RETT HONNUN ER PORUN: latum bædi bordin drafta I SOMU DEILD, a
     moti somu motherjum, ur somu laug. Tha DREGST arsahrifin UT —
     bædi lidin nutu goda arsins eda lidu fyrir thad slaema — og eftir
     stendur adeins munurinn a bordunum.

     Thetta er lika RAUNSAERRA: i thinni deild ertu ekki ad keppa vid
     medaltal aranna heldur vid hina i herberginu, og einhver theirra
     draftar eftir Sleeper-rodinni.

     Hvert saetapar er keyrt i BADAR attir (A-Ranking i saeti i og
     Sleeper i saeti j, og svo ofugt) svo saetin sjalf jafnist ut. */
  const headToHead = makeHeadToHead({ world, ys, league: LEAGUE, teams: TEAMS,
    runs: NOISE_RUNS, rivalOf: (w) => w.sleeper });

  /* ---------- 3. THRJU PROF ---------- */
  const current = scored.find((s) => s.name === "starters+flex (current)" &&
                                     s.shrink === 0 && s.blend === 0);

  const tests = makeTests({ ys, teams: TEAMS, baseRuns: sleeperRuns,
    basePerSeason: slpPerSeason });

  const resCurrent = tests("A-Ranking (current)", current.perSeason, current.runs);
  const resBest = tests(`A-Ranking (best variant: ${scored[0].name}, ` +
    `shrink=${scored[0].shrink}, blend=${scored[0].blend})`,
    scored[0].perSeason, scored[0].runs);
  const resWf = tests("A-Ranking (walk-forward choice)",
    Object.fromEntries(wfYears.map((y) => [y, wf[y].points])),
    Object.fromEntries(wfYears.map((y) => [y, wf[y].runs])));

  /* Einvigin — bædi fyrir nuverandi utgafu og bestu. */
  const h2hCurrent = headToHead((pool) => vbdBoard(pool, current.repl, current));
  const h2hBest = headToHead((pool) => vbdBoard(pool, scored[0].repl, scored[0]));

  console.log(`\n${"=".repeat(88)}`);
  console.log(`  BEINT EINVIGI I SOMU DEILD · ${SCORING.toUpperCase()}`);
  console.log("=".repeat(88));
  for (const [lab, h] of [["nuverandi", h2hCurrent], ["besta afbrigdi", h2hBest]]) {
    console.log(`\n  ${lab}`);
    console.log(`    A-Ranking vinnur ${h.wins}/${h.n} einvigi (${(h.winRate * 100).toFixed(1)}%)`);
    console.log(`    medalmunur ${sgn(h.mean)} stig · vinnur ${h.yearWins}/${h.years} timabil`);
    console.log(`    per ar: ${Object.entries(h.byYear).map(([y, v]) => `${y} ${sgn(v)}`).join("  ")}`);
    console.log(`    t = ${h.t}, 95% [${sgn(h.lo)}, ${sgn(h.hi)}]  ` +
      (h.significant ? "MARKTAEKT" : "ekki marktaekt") +
      `  · tekna-prof p = ${h.signP}`);
  }

  console.log(`\n${"=".repeat(88)}`);
  console.log(`  A-RANKING GEGN SLEEPER — THRJU PROF · ${SCORING.toUpperCase()}`);
  console.log("=".repeat(88));
  for (const r of [resCurrent, resBest]) {
    console.log(`\n  ${r.label}`);
    console.log(`    munur ${sgn(r.diff)} stig · vinnur ${r.wins}/${r.years} timabil · ` +
      `${r.slotWins}/${r.slots} saeti`);
    /* `bootstrapDiff` SKILAR NULL vid faerri en thrju sameiginleg ar —
       thad er rett hegdun, thrju ar bera engin vikmork. En skriftan
       kastadi tha `Cannot read properties of null`, sem segir lesanda
       EKKERT um hvad var ad. Maelingaskyrsla a ad segja hvers vegna hun
       getur ekki reiknad; hun a ekki ad deyja. */
    if (!r.boot) {
      console.log(`    bootstrap (klosad per ar) : of fa sameiginleg ar (${r.years})`);
    } else {
      console.log(`    bootstrap (klosad per ar) : [${sgn(r.boot.lo)}, ${sgn(r.boot.hi)}]  ` +
        (r.boot.excludesZero ? "MARKTAEKT" : "utilokar ekki null"));
    }
    console.log(`    tekna-prof a timabilum    : p = ${r.signP}  ` +
      (r.signP < 0.05 ? "MARKTAEKT" : "ekki marktaekt"));
    console.log(`    pardur t-prof (klasar=ar) : t = ${r.paired.t}, ` +
      `95% [${sgn(r.paired.lo)}, ${sgn(r.paired.hi)}]  ` +
      (r.paired.significant ? "MARKTAEKT" : "ekki marktaekt"));
  }

  await writeFile(path.join(OUT, `arank_${SCORING}${PROJ === "fftoday" ? "_fftoday" : ""}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    /* HVERNIG THESSI SKRA VARD TIL. Skra sem ber ekki vidfongin sin er
       mynd af einni keyrslu, ekki maeling — sja lib/provenance.mjs. */
    provenance: stamp({
      argv: process.argv.slice(2),
      defaults: { scoring: "ppr", proj: "sleeper", runs: 20, teams: TEAMS, rounds: ROUNDS },
      inputs: ["features.json"], dataDir: OUT,
    }),
    scoring: SCORING, teams: TEAMS, rounds: ROUNDS, seasons: ys,
    sleeperPerSeason: Object.fromEntries(ys.map((y) => [y, round1(slpPerSeason[y])])),
    adpPerSeason: Object.fromEntries(ys.map((y) => [y, round1(adpPerSeason[y])])),
    variants: scored.slice(0, 12).map((s) => ({
      name: s.name, shrink: s.shrink, blend: s.blend,
      mean: round1(s.mean),
      perSeason: Object.fromEntries(ys.map((y) => [y, round1(s.perSeason[y])])),
    })),
    walkForward: Object.fromEntries(wfYears.map((y) =>
      [y, { chosen: wf[y].chosen, points: round1(wf[y].points) }])),
    tests: { current: resCurrent, best: resBest, walkForward: resWf },
    headToHead: { current: h2hCurrent, best: h2hBest },
  }, null, 1));
  console.log(`\n-> data/arank_${SCORING}${PROJ === "fftoday" ? "_fftoday" : ""}.json`);
}



main().catch((e) => { console.error(e); process.exit(1); });
