#!/usr/bin/env node
/* ============================================================
   bye-lab.mjs — BORGAR SIG AD FORDAST AUDAR VIKUR I DRAFTINU?

     node scripts/bye-lab.mjs [--scoring=ppr|standard]
                              [--proj=sleeper|fftoday] [--runs=6]

   -> data/bye_<scoring>_<proj>.json

   SPURNINGIN ER GOMUL OG HEFUR ALDREI VERID MAELD HER. Hvert einasta
   draft-radgjafarrit segir "ekki safna monnum sem eru i frii sömu
   viku", en `advice.js` tekur ekkert bye-inntak og engin hermun i
   thessu verkefni hefur getad sed muninn.

   ASTAEDAN ER TAEKNILEG OG HUN SKIPTIR OLLU: `startersPoints` leggur
   saman TIMABILS-SUMMU. I theirri talningu er AUD VIKA OSYNILEG —
   thrir hlauparar med bye i viku 7 skila nakvaemlega somu arssummu og
   thrir med bye i viku 5, 9 og 11. Bordid gat thvi hvorki verid
   verdlaunad ne refsad fyrir thetta, og spurningin var OSVARANLEG med
   thvi tóli.

   VIKULEGA TALNINGIN SER HANA. Hun var byggd i `weekly-lab.mjs` til
   ad stadfesta ad timabils-summan vaeri nothaef nalgun (hun er thad:
   r = 0,89 til 0,99). Hér er hun notud til hins gagnstaeda — ad maela
   thad EINA sem summan getur ekki sed.

   AÐFERDIN
     Bord A  nuverandi A-Ranking, kyrrstaett.
     Bord B  sama rod, en vid HVERT VAL er dregid fra theim sem deilir
             audri viku med theim sem lidid a THEGAR i sömu stodu.
             Vogin `w` er i VBD-einingum per arekstur.
     Badir drafta i SOMU deild (arsahrifin dragast ut) og eru domdir a
     RAUNVERULEGUM VIKULEGUM stigum, med bestu uppstillingu hverrar viku.

   BYE-VIKUR ERU LEIDDAR UR VIKUGOGNUNUM SJALFUM — su vika sem lidid
   kemur hvergi fyrir i. Engin serstok heimild, engin nafna-porun.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE, weekPoints } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  scoring: ["ppr", "standard"],
  proj: ["sleeper", "fftoday"],
  runs: "number",
});
const SCORING = String(ARG.scoring || "ppr");
const PROJ = String(ARG.proj || "sleeper");
const FIELD = PROJ === "fftoday" ? "ffProj" : "sleeperProj";
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const RUNS = Number(ARG.runs || 6);
const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

/* BYRJUNARLID VIKUNNAR ER FLUTT I `src/accuracy.js` (14.8.2026) —
   sja notu i `weekly-lab.mjs`. Hér stod annad afrit af somu reglu. */

function vbdValues(pool) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const out = new Map();
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).sort((a, b) => b - a);
    const k = Math.min(vals.length - 1, (REPL[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) out.set(p.id, p.proj - base);
  }
  return out;
}
const rankOf = (m) => new Map([...m.entries()]
  .sort((a, b) => b[1] - a[1]).map(([id], i) => [id, i + 1]));

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r[FIELD] != null).map((r) => r.season))]
    .sort().filter((y) => y >= 2019);          // vikugogn na fra 2019
  console.log(`${PROJ} · ${SCORING} · timabil: ${years.join(", ")}`);

  const world = {};
  for (const y of years) {
    let weekly;
    try { weekly = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8")); }
    catch { continue; }

    /* Bye-vika lids = su vika sem thad kemur HVERGI fyrir i. Leitt ur
       gognunum sjalfum; engin serstok heimild og engin porun. */
    const played = {};
    for (const w of weekly) {
      if (!w.team) continue;
      (played[w.team] = played[w.team] || new Set()).add(w.week);
    }
    const byeOf = {};
    for (const [t, s] of Object.entries(played)) {
      for (let k = 4; k <= 14; k++) if (!s.has(k)) { byeOf[t] = k; break; }
    }

    const yr = rows.filter((r) => r.season === y && r.adp != null && r[FIELD] != null);
    if (yr.length < 120) continue;
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({
      id: r.id, pos: r.pos, proj: r[FIELD], adp: r.adp, adpSd: r.adpSd,
      team: r.prevTeam || null, actual: pts(r),
    }));

    /* Lid leikmanns THAD AR — ur vikugognunum, ekki ur `prevTeam` sem
       er lid FYRRA ars. Rangt lid gaefi ranga bye-viku og maelingin
       vaeri ad maela hávaða. */
    const teamOf = new Map();
    for (const w of weekly) if (w.id && w.team && !teamOf.has(w.id)) teamOf.set(w.id, w.team);
    for (const p of pool) p.bye = byeOf[teamOf.get(p.id)] ?? null;

    const byWeek = new Map();
    const weeks = new Set();
    for (const w of weekly) {
      weeks.add(w.week);
      byWeek.set(`${w.id}|${w.week}`, { pos: w.pos, pts: SCORING === "ppr" ? w.ppr : w.std });
    }
    const withBye = pool.filter((p) => p.bye != null).length;
    world[y] = {
      pool, byWeek, weeks: [...weeks].sort((a, b) => a - b), withBye,
      byeOf: new Map(pool.map((p) => [p.id, p.bye])),
      posOf: new Map(pool.map((p) => [p.id, p.pos])),
      actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }])),
      field: new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1])),
      vbd: vbdValues(pool),
    };
  }
  const ys = Object.keys(world).map(Number).sort();
  requireSeasons(ys, "timabil med spa OG vikugognum");
  console.log(`hermdir heimar: ${ys.length} · bye-thekja: ` +
    ys.map((y) => `${y} ${world[y].withBye}/${world[y].pool.length}`).join(", "));

  const noisy = (pool, seed) => {
    let a = seed >>> 0;
    const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    const gauss = () => {
      const u = Math.max(1e-9, rnd()), v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return new Map(pool.map((p) => {
      const sd = p.adpSd > 0 ? p.adpSd : 1.08 * Math.sqrt(Math.max(1, p.adp));
      return [p.id, p.adp + gauss() * sd];
    }).sort((x, y) => x[1] - y[1]).map(([id], i) => [id, i + 1]));
  };

  /**
   * BYE-MEDVITAD BORD. Skilar FALLI sem faer hopinn sinn vid hvert val.
   * Fradrattur = `w` x fjoldi theirra sem lidid A THEGAR i somu stodu
   * og deila audri viku med thessum manni.
   */
  const byeBoard = (w, W) => (taken, counts, round, roster) => {
    const mineByPosBye = new Map();
    for (const id of roster || []) {
      const pos = W.posOf.get(id), bye = W.byeOf.get(id);
      if (pos == null || bye == null) continue;
      const k = `${pos}|${bye}`;
      mineByPosBye.set(k, (mineByPosBye.get(k) || 0) + 1);
    }
    const scored = new Map();
    for (const p of W.pool) {
      if (taken.has(p.id)) continue;
      const v = W.vbd.get(p.id);
      if (v == null) continue;
      const clash = p.bye == null ? 0 : (mineByPosBye.get(`${p.pos}|${p.bye}`) || 0);
      scored.set(p.id, v - w * clash);
    }
    return rankOf(scored);
  };

  /* Beint einvigi vid kyrrstaeda bordid, i SOMU deild, badar attir. */
  const duel = (makeBoard) => {
    const perYear = {};
    for (const y of ys) {
      const W = world[y];
      const base = rankOf(new Map([...W.vbd.entries()]));
      const d = [];
      for (let r = 0; r < RUNS; r++) {
        const field = r === 0 ? W.field : noisy(W.pool, y * 1000 + r * 7919);
        for (let i = 1; i <= TEAMS; i++) {
          const j = i % TEAMS + 1;
          for (const swap of [false, true]) {
            const res = simulateDraft({
              board: makeBoard(W), fieldBoard: field, actual: W.actual,
              slot: swap ? j : i, league: LEAGUE,
              rival: { slot: swap ? i : j, board: base },
            });
            /* VIKULEG TALNING — thad er eina leidin til ad aud vika
               kosti nokkud. Timabils-summan er blind a hana. */
            const mine = W.weeks.reduce((a, wk) =>
              a + weekPoints(res.roster, W.byWeek, wk, LEAGUE), 0);
            const riv = W.weeks.reduce((a, wk) =>
              a + weekPoints(res.rivalRoster, W.byWeek, wk, LEAGUE), 0);
            d.push(mine - riv);
          }
        }
      }
      perYear[y] = mean(d);
    }
    const vals = ys.map((y) => perYear[y]);
    const m = mean(vals);
    const sd = Math.sqrt(mean(vals.map((v) => (v - m) ** 2)) * vals.length /
                         Math.max(1, vals.length - 1));
    const se = sd / Math.sqrt(vals.length);
    return { mean: r1(m), se: r1(se), t: r3(se ? m / se : 0),
             wins: vals.filter((v) => v > 0).length, years: vals.length,
             perYear: Object.fromEntries(ys.map((y) => [y, r1(perYear[y])])) };
  };

  /* HEILBRIGDISPROF: w=0 er sama bord og nulllinan og VERDUR ad gefa 0. */
  const self = duel((W) => byeBoard(0, W));
  console.log(`\n  heilbrigdisprof (w=0): ${self.mean} stig ` +
    `${Math.abs(self.mean) < 0.05 ? "— hlutlaust" : "— VIDVORUN, ekki samhverft"}`);

  const results = [];
  for (const w of [2, 5, 10, 20, 40]) {
    const res = duel((W) => byeBoard(w, W));
    results.push({ w, ...res });
    console.log(`  w=${String(w).padEnd(3)} ${(res.mean > 0 ? "+" : "") + String(res.mean).padStart(7)} stig · ` +
      `${res.wins}/${res.years} ar · t=${res.t}`);
  }

  const best = results.slice().sort((a, b) => b.mean - a.mean)[0];
  const tCrit = ys.length > 6 ? 2.228 : 2.776;
  /* Fimm vogtolur profadar — leidretting er let en hun er ekki engin. */
  const corrected = tCrit * 1.35;
  const verdict = Math.abs(best.t) > corrected ? "STENST"
    : Math.abs(best.t) > tCrit ? "stenst hra en ekki leidrett" : "FELLUR";
  console.log(`\n  best: w=${best.w} -> ${best.mean > 0 ? "+" : ""}${best.mean} stig, ` +
    `${best.wins}/${best.years} ar, t=${best.t}`);
  console.log(`  hra mork |t| > ${tCrit} · leidrett (5 profa) |t| > ${r3(corrected)}`);
  console.log(`  -> ${verdict}`);

  await writeFile(path.join(OUT, `bye_${SCORING}_${PROJ}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", proj: "sleeper", runs: 6 },
      inputs: ["features.json"], dataDir: OUT }),
    scoring: SCORING, projection: PROJ, seasons: ys,
    scoredWeekly: true, selfTest: self, variants: results,
    best, tCrit, corrected: r3(corrected), verdict,
  }, null, 1));
  console.log(`\n-> data/bye_${SCORING}_${PROJ}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
