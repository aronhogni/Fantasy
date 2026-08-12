#!/usr/bin/env node
/* ============================================================
   half-lab.mjs — ER FORSKOT A-RANKING ANNAD I HALF-PPR?

     node scripts/half-lab.mjs [--runs=4] [--from=2015]

   -> data/measure/half.json

   HVERS VEGNA THETTA VANTADI. `features.json` ber TVO snid, `ppr` og
   `standard`, og `shape-lab.mjs` maeldi thvi 16 logun i theim tveimur.
   Half-PPR var ALDREI maeld — og notandinn draftar i half-PPR deild
   (Sofahetjur, 12 lid). Forskotid thar var thvi AGISKAD ut fra thvi ad
   half liggur milli tveggja maeldra snida. Su rök eru ekki verri en
   thau eru — thau eru bara ekki maeling.

   HALF-PPR ER REIKNANLEG NAKVAEMLEGA, EKKI NALGUD.
   Eini munurinn a snidunum er stig per mottoku: 1,0 gegn 0,0. Thvi er
       PPR      = STD + mottokur
       HALF     = STD + mottokur/2 = (STD + PPR) / 2
   upp a stig. Sama gildir um spána, sem er sama tala i badum snidum
   ad thessum lid einum. Thetta er ALGEBRA, ekki interpolun — og thess
   vegna ma maela half an nyrra gagna.

   ADP ER UNDANTEKNINGIN OG THAD VERDUR AD SEGJAST.
   ADP er HEGDUN, ekki formula: half-ADP er ekki medaltal af ppr-ADP og
   std-ADP thvi herbergid hagar ser ekki linulega. Sogulegt half-ADP er
   ekki i gognunum (FFC-skrain ber `half-ppr_12` adeins fyrir
   yfirstandandi ar). Thess vegna er maelt TVISVAR — einu sinni med
   ppr-ADP sem markadsbord og einu sinni med std-ADP — og BADAR tolur
   birtar sem VIKMORK. Se forskotid marktaekt i baðum endum er
   nidurstadan otvirad, hvad sem sanna half-ADP hefdi gefið.

   OG SPURNINGIN SJALF er ekki "vinnur A-Ranking i half" heldur "ER
   MUNURINN A SNIDUNUM MARKTAEKUR". Thad er PORUD spurning — somu ar,
   somu leikmenn — svo hun er profud sem paruð tvi-syni per timabili,
   ekki med tveimur ohadum medaltolum.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft } from "../src/accuracy.js";
import { replacementRanks } from "../src/model.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), { runs: "number", from: "number" });
const RUNS = Number(ARG.runs || 4);
const FROM = Number(ARG.from || 2015);
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

const tOf = (a) => {
  const v = a.filter((x) => x != null);
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
};

/* RAUNVERULEGU DEILDIRNAR, ekki tilbunar logun. Baðar hafa TVO FLEX,
   sem `shape-lab` maeldi adeins i 12-lida sniði — svo 10-lida
   tveggja-flex logunin var lika omaeld. */
const SHAPES = [
  { key: "10-2flex", label: "10 lid, 2 FLEX (Patriots)",
    league: { teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 15,
              flexPos: ["RB", "WR", "TE"], superflex: false, excludePos: ["K", "DST"] } },
  { key: "12-2flex", label: "12 lid, 2 FLEX (Sofahetjur)",
    league: { teams: 12, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 14,
              flexPos: ["RB", "WR", "TE"], superflex: false } },
];
const FORMATS = ["ppr", "half", "standard"];

function vbdBoard(pool, repl) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).filter((v) => v != null).sort((a, b) => b - a);
    if (!vals.length) continue;
    const k = Math.min(vals.length - 1, (repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) if (p.proj != null) scored.push([p.id, p.proj - base]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const byKey = { ppr: new Map(), standard: new Map() };
  for (const r of feats.rows) {
    if (!byKey[r.scoring]) continue;
    byKey[r.scoring].set(`${r.season}|${r.id}`, r);
  }
  /* PORUNIN VERDUR AD STANDA. Vaeri hun ohreinn — leikmadur i odru
     sniði en ekki hinu — vaeri half-laugin ANNAD urtak og
     samanburdurinn ekki paraður. Talan er birt. */
  let paired = 0, unpaired = 0;
  for (const k of byKey.ppr.keys()) (byKey.standard.has(k) ? paired++ : unpaired++);
  console.log(`porun ppr<->standard: ${paired} pòr, ${unpaired} oporud`);

  const years = [...new Set(feats.rows.map((r) => r.season))].sort()
    .filter((y) => y >= FROM && y <= 2025);

  /* Byggjum laug per ari fyrir OLL THRJU snidin. `half` er reiknud
     upp a stig ur hinum tveimur (sja notu i haus). */
  const pools = {};
  for (const y of years) {
    const rows = [];
    for (const [k, a] of byKey.ppr) {
      if (!k.startsWith(`${y}|`)) continue;
      const b = byKey.standard.get(k);
      if (!b || a.adp == null || b.adp == null) continue;
      const pj = a.sleeperProj != null ? a.sleeperProj : a.ffProj;
      const sj = b.sleeperProj != null ? b.sleeperProj : b.ffProj;
      if (a.pts == null || b.ptsStd == null) continue;
      rows.push({ id: a.id, pos: a.pos, name: a.name,
        adpPpr: a.adp, adpStd: b.adp, adpSd: a.adpSd,
        proj: { ppr: pj, standard: sj, half: pj != null && sj != null ? (pj + sj) / 2 : null },
        actual: { ppr: a.pts, standard: b.ptsStd, half: (a.pts + b.ptsStd) / 2 } });
    }
    if (rows.length >= 120) pools[y] = rows;
  }
  const ys = Object.keys(pools).map(Number).sort((a, b) => a - b);
  requireSeasons(ys, 5, "half-lab");
  console.log(`${ys.length} timabil · ${r1(mean(ys.map((y) => pools[y].length)))} leikmenn ad medaltali\n`);

  /* ---------- HERMUNIN ---------- */
  const res = {};
  for (const shape of SHAPES) {
    res[shape.key] = {};
    const repl = replacementRanks({ ...shape.league, scoring: "ppr" });
    for (const fmt of FORMATS) {
      res[shape.key][fmt] = {};
      for (const fieldSrc of ["adpPpr", "adpStd"]) {
        const per = {};
        for (const y of ys) {
          const pool = pools[y].filter((p) => p.proj[fmt] != null);
          if (pool.length < 120) continue;
          const board = vbdBoard(pool.map((p) => ({ id: p.id, pos: p.pos, proj: p.proj[fmt] })), repl);
          const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual[fmt] }]));
          const d = [];
          for (let r = 0; r < RUNS; r++) {
            let a = (y * 1000 + r * 7919) >>> 0;
            const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
            const noisy = new Map(pool
              .map((p) => [p.id, p[fieldSrc] + (rnd() + rnd() + rnd() - 1.5) * 8])
              .sort((x, z) => x[1] - z[1]).map(([id], i) => [id, i + 1]));
            for (let i = 1; i <= shape.league.teams; i++) {
              const j = i % shape.league.teams + 1;
              for (const swap of [false, true]) {
                const out = simulateDraft({ board, fieldBoard: noisy, actual,
                  slot: swap ? j : i, league: shape.league,
                  rival: { slot: swap ? i : j, board: noisy } });
                d.push(out.points - out.rivalPoints);
              }
            }
          }
          per[y] = r1(mean(d));
        }
        const vals = ys.map((y) => per[y]).filter((x) => x != null);
        res[shape.key][fmt][fieldSrc] = { per, mean: r1(mean(vals)), t: tOf(vals),
          wins: vals.filter((x) => x > 0).length, years: vals.length };
      }
    }
  }

  for (const shape of SHAPES) {
    console.log(`${shape.label}`);
    console.log(`   ${"snid".padEnd(10)}${"ADP=ppr".padStart(22)}${"ADP=standard".padStart(22)}`);
    for (const fmt of FORMATS) {
      const cells = ["adpPpr", "adpStd"].map((k) => {
        const q = res[shape.key][fmt][k];
        return `${q.mean > 0 ? "+" : ""}${q.mean} (${q.wins}/${q.years}, t=${q.t})`.padStart(22);
      }).join("");
      console.log(`   ${fmt.padEnd(10)}${cells}`);
    }
    console.log("");
  }

  /* ---------- ER MUNURINN MARKTAEKUR? PORUD PROF ---------- */
  console.log(`ER MUNURINN A SNIDUNUM MARKTAEKUR? (porud per timabili)\n`);
  const diffs = {};
  for (const shape of SHAPES) {
    diffs[shape.key] = {};
    for (const [a, b] of [["half", "ppr"], ["half", "standard"], ["ppr", "standard"]]) {
      for (const src of ["adpPpr", "adpStd"]) {
        const A = res[shape.key][a][src].per, B = res[shape.key][b][src].per;
        const d = ys.map((y) => (A[y] != null && B[y] != null ? A[y] - B[y] : null))
          .filter((x) => x != null);
        const key = `${a}-${b}|${src}`;
        diffs[shape.key][key] = { mean: r1(mean(d)), t: tOf(d), years: d.length,
          wins: d.filter((x) => x > 0).length };
      }
    }
    console.log(`   ${shape.label}`);
    for (const [a, b] of [["half", "ppr"], ["half", "standard"], ["ppr", "standard"]]) {
      const cells = ["adpPpr", "adpStd"].map((src) => {
        const q = diffs[shape.key][`${a}-${b}|${src}`];
        const sig = q.t != null && Math.abs(q.t) > 2.26;
        return `${q.mean > 0 ? "+" : ""}${q.mean} t=${q.t}${sig ? " MARKT" : ""}`.padStart(24);
      }).join("");
      console.log(`     ${`${a} - ${b}`.padEnd(18)}${cells}`);
    }
    console.log("");
  }

  await mkdir(path.join(OUT, "measure"), { recursive: true });
  await writeFile(path.join(OUT, "measure", "half.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: { runs: 4, from: 2015 },
      resolved: { runs: RUNS, formats: FORMATS, shapes: SHAPES.map((s) => s.key),
                  halfIsExact: "half = (ppr + standard) / 2, algebra",
                  adpIsBounded: "sogulegt half-ADP er ekki til; ppr og std notud sem vikmork" },
      inputs: ["features.json"], dataDir: OUT }),
    seasons: ys, pairing: { paired, unpaired },
    results: res, differences: diffs,
  }, null, 1));
  console.log(`-> data/measure/half.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
