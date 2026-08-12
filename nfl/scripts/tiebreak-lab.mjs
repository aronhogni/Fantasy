#!/usr/bin/env node
/* ============================================================
   tiebreak-lab.mjs — MA LIFUNARLIKUR RADA THEGAR VID ERUM
   HVORT ED ER SAMA?

     node scripts/tiebreak-lab.mjs [--scoring=ppr] [--runs=4] [--from=2015]

   -> data/measure/tiebreak_<scoring>.json

   SPURNINGIN OG HVERS VEGNA HUN ER NY.
   `advice-lab.mjs` maeldi ROD eftir bradanauðsyn (urgency) og hun
   TAPADI: -63,8 stig i standard, 0 af 4 arum. Su regla let bratta
   rada OLLU, svo hun tok Tyreek Hill framyfir McCaffrey sem bar 40+
   stigum meira algilt virdi. Nidurstadan stendur.

   EN THAD ER ONNUR OG MIKLU VEIKARI REGLA SEM ENGINN HEFUR MAELT:
   RADA EFTIR VBD EINS OG NUNA, EN THEGAR TVEIR MENN ERU INNAN `T`
   STIGA AF HVOR ODRUM — the. vid erum raunverulega hlutlaus milli
   theirra — taka THANN SEM LIFIR SIDUR fram ad naesta vali.

   Munurinn skiptir ollu: urgency-reglan gat fornad 40 stigum, thessi
   getur i mesta lagi fornad `T`. T=0 ER NUVERANDI HEGDUN, svo ristin
   inniheldur sitt eigid null.

   ÞETTA ER EINA TALAN SEM APPID REIKNAR OG NOTAR ALDREI. `survive`
   stendur i tillogunni sem upplysing ("Lasts? 22%") og notandinn
   verdur sjalfur ad breyta henni i akvordun. Se svarid ja er thad
   beinn bati; se thad nei er `survive` stadfest sem UPPLYSING og
   thad er lika svar.

   VOGIN ER VALIN WALK-FORWARD: `T` fyrir ar Y kemur eingongu ur
   arum a undan. Besta `T` i eftira vaeri leki, ekki nidurstada.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { survivalProb, nextOwnPick } from "../src/advice.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2),
  { scoring: ["ppr", "standard"], runs: "number", from: "number" });
const SCORING = String(ARG.scoring || "ppr");
const RUNS = Number(ARG.runs || 4);
const FROM = Number(ARG.from || 2015);
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
const GRID = [0, 3, 5, 8, 12, 20];
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

const tOf = (a) => {
  const v = a.filter((x) => x != null);
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
};

/** Sama VBD-rod og A-Ranking beitir. */
function vbdOf(pool) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const out = new Map();
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).filter((v) => v != null).sort((a, b) => b - a);
    if (!vals.length) continue;
    const k = Math.min(vals.length - 1, (REPL[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) if (p.proj != null) out.set(p.id, p.proj - base);
  }
  return out;
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r.adp != null).map((r) => r.season))]
    .sort().filter((y) => y >= FROM && y <= 2025);

  const grid = {}, perYear = {};
  console.log(`\n${SCORING} · threskuldar-rist ${GRID.join(", ")} stig\n`);

  for (const y of years) {
    const yr = rows.filter((r) => r.season === y && r.adp != null &&
                                  (r.sleeperProj != null || r.ffProj != null));
    if (yr.length < 120) { console.log(`  ${y}: laug of litil`); continue; }
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos, name: r.name,
      proj: r.sleeperProj != null ? r.sleeperProj : r.ffProj,
      adp: r.adp, adpSd: r.adpSd, actual: pts(r) })).filter((p) => p.actual != null);

    const vbd = vbdOf(pool);
    const ranked = pool.filter((p) => vbd.has(p.id)).sort((a, b) => vbd.get(b.id) - vbd.get(a.id));
    const pure = new Map(ranked.map((p, i) => [p.id, i + 1]));
    const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }]));
    const byId = new Map(pool.map((p) => [p.id, p]));
    const field0 = new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1]));
    const noisy = (seed) => {
      let a = seed >>> 0;
      const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
      const s = pool.map((p) => [p.id, p.adp + (rnd() + rnd() + rnd() - 1.5) * 8])
        .sort((x, z) => x[1] - z[1]);
      return new Map(s.map(([id], i) => [id, i + 1]));
    };

    /* ============================================================
       BORDID ER FALL AF STODUNNI, THVI THAD VERDUR AD VITA HVENAER
       THU VELUR NAEST.
       ============================================================
       `simulateDraft` gefur fallinu `taken`, stodutalningu lidsins,
       umferdina og hopinn. Ur umferdinni og saetinu fæst NAESTA VAL
       thitt — og an thess er engin lifunarlikur til. Thess vegna gat
       thessi regla ekki verid maeld med kyrrstaedu korti.

       Faerslan sjalf er MINSTA MOGULEGA: adeins efsti madur og their
       sem eru innan `T` af honum koma til greina, og valinn er sa med
       LAEGSTU lifunarlikur. Se enginn innan `T` gerist ekkert — svo
       T=0 er nakvaemlega nuverandi hegdun.                          */
    const tieBoard = (T, slot) => (taken, cnt, round) => {
      if (T <= 0) return pure;
      const cur = round * TEAMS + (round % 2 === 0 ? slot : TEAMS - slot + 1);
      const np = nextOwnPick(cur, TEAMS, slot, ROUNDS + 2);
      if (np == null) return pure;
      let best = null, bestV = -Infinity;
      for (const p of ranked) {
        if (taken.has(p.id)) continue;
        const max = (LEAGUE.maxPos || {})[p.pos];
        if (max != null && (cnt[p.pos] || 0) >= max) continue;
        const v = vbd.get(p.id);
        if (v > bestV) { bestV = v; best = p; }
        break;                      /* `ranked` er thegar rodud */
      }
      if (!best) return pure;
      let pickBest = best, lowest = 2;
      for (const p of ranked) {
        if (taken.has(p.id)) continue;
        const max = (LEAGUE.maxPos || {})[p.pos];
        if (max != null && (cnt[p.pos] || 0) >= max) continue;
        const v = vbd.get(p.id);
        if (bestV - v > T) break;
        const s = survivalProb(byId.get(p.id).adp, byId.get(p.id).adpSd, np);
        /* `null` (engin ADP) er EKKI "0% likur" — hann er oskrifad
           blad og ma ekki vinna throskuldinn a thogn. */
        if (s != null && s < lowest) { lowest = s; pickBest = p; }
      }
      if (pickBest === best) return pure;
      /* ============================================================
         BORDID ER LESID I INNSETNINGAROD, EKKI EFTIR GILDI.
         ============================================================
         `bestAvailable` gerir `for (const [key] of board)` — talan i
         kortinu er ALDREI lesin. Fyrsta utgafan gerdi
         `m.set(pickBest.id, 0)` a afriti og hélt ad thad faerdi hann
         fremst; Map heldur upprunalegri stodu thegar lykill sem er
         thegar til er settur aftur, svo bordid var OBREYTT og
         maelingin skiladi NAKVAEMLEGA NULLI i ollum arum og ollum
         threskuldum. Thad leit ut eins og "reglan gerir ekkert" og
         var "reglan var aldrei virk" — versta gerd af nulli.

         Vardinn gegn thessu er i profinu: bordid VERDUR ad skila
         odrum efsta manni thegar throskuldurinn bitur.               */
      const m = new Map();
      m.set(pickBest.id, 0);
      for (const [id, r] of pure) if (id !== pickBest.id) m.set(id, r);
      return m;
    };

    grid[y] = {}; perYear[y] = { players: pool.length };
    for (const T of GRID) {
      if (T === 0) { grid[y][T] = 0; continue; }
      const d = [];
      for (let r = 0; r < RUNS; r++) {
        const f2 = noisy(y * 1000 + r * 7919);
        for (let i = 1; i <= TEAMS; i++) {
          const j = i % TEAMS + 1;
          for (const swap of [false, true]) {
            const meSlot = swap ? j : i;
            const res = simulateDraft({ board: tieBoard(T, meSlot), fieldBoard: f2,
              actual, slot: meSlot, league: LEAGUE,
              rival: { slot: swap ? i : j, board: pure } });
            d.push(res.points - res.rivalPoints);
          }
        }
      }
      grid[y][T] = r1(mean(d));
    }
    console.log(`  ${y}  ` + GRID.map((T) => `T${T}:${String(grid[y][T]).padStart(7)}`).join("  "));
  }

  const ys = Object.keys(grid).map(Number).sort((a, b) => a - b);
  requireSeasons(ys, 5, "tiebreak-lab");

  /* ============================================================
     "ENGIN AHRIF" OG "ALDREI VIRK" ERU EKKI SAMA NIDURSTADAN.
     ============================================================
     Fyrsta utgafan skiladi NAKVAEMLEGA NULLI i ollum arum og ollum
     threskuldum og las eins og hrein nidurstada. Hun var thad ekki:
     bordinu var skilad obreyttu thvi `bestAvailable` les kortid i
     INNSETNINGAROD og `m.set(id, 0)` faerir engan til. Reglan var
     aldrei prófuð.

     Nakvaemt null i hverri einustu reit er thvi ekki maeling heldur
     einkenni — og skriftan deyr fremur en ad skrifa thad. */
  const anyEffect = ys.some((y) => GRID.some((T) => T > 0 && grid[y][T] !== 0));
  if (!anyEffect) {
    console.error("\n  ALLIR REITIR ERU NAKVAEMLEGA NULL — reglan var aldrei virk.");
    console.error("  Thad er villa i bordinu, ekki nidurstada. Skrifa EKKERT.");
    process.exit(2);
  }

  const wf = [];
  for (let i = 1; i < ys.length; i++) {
    const prior = ys.slice(0, i);
    let best = 0, bv = 0;
    for (const T of GRID) {
      const v = mean(prior.map((p) => grid[p][T]));
      if (v > bv) { bv = v; best = T; }
    }
    wf.push({ year: ys[i], T: best, gain: grid[ys[i]][best] });
  }
  console.log(`\n  WALK-FORWARD (T valid eingongu ur fyrri arum)`);
  console.log(`  ${"ar".padEnd(6)}${"valid T".padEnd(10)}stig gegn hreinu VBD`);
  for (const r of wf) console.log(`  ${String(r.year).padEnd(6)}${String(r.T).padEnd(10)}${r.gain > 0 ? "+" : ""}${r.gain}`);
  const gains = wf.map((r) => r.gain);
  const t = tOf(gains), m = gains.length ? mean(gains) : null;
  console.log(`\n  medaltal ${m == null ? "—" : r1(m)} stig · ` +
    `${gains.filter((x) => x > 0).length}/${gains.length} ar · t=${t}` +
    `${t != null && Math.abs(t) > 2.26 ? "  MARKTAEKT" : "  ekki marktaekt"}`);

  await mkdir(path.join(OUT, "measure"), { recursive: true });
  await writeFile(path.join(OUT, "measure", `tiebreak_${SCORING}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", runs: 4, from: 2015 },
      resolved: { scoring: SCORING, runs: RUNS, grid: GRID },
      inputs: ["features.json"], dataDir: OUT }),
    scoring: SCORING, grid, perYear, walkForward: wf,
    summary: { mean: m == null ? null : r1(m), t, years: gains.length,
               wins: gains.filter((x) => x > 0).length },
  }, null, 1));
  console.log(`\n-> data/measure/tiebreak_${SCORING}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
