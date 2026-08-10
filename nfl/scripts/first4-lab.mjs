#!/usr/bin/env node
/* ============================================================
   first4-lab.mjs — EINA MERKID SEM STOD EFTIR I LEIFINNI

     node scripts/first4-lab.mjs [--scoring=ppr] [--proj=sleeper|fftoday]

   -> data/first4_<scoring>_<proj>.json

   `feature-probe.mjs` profadi 14 breytur gegn LEIF spar Sleeper. Allt
   var undir |r| = 0,14 og `jointLift` var **-0,071** — ad setja thaer
   allar inn gerdi spana VERRI ut fyrir urtak.

   EINN REITUR STOD EFTIR: "fyrstu 4 leikir sidasta timabils (PPG)"
   gegn leifinni, **r = -0,224 hja HLAUPURUM** (heildin -0,134).

   FORMERKID ER THAD SEM GERIR THETTA ATHYGLISVERT, ekki staerdin.
   Neikvaett thydir: sa sem byrjadi HEITT i fyrra stendur UNDIR spanni
   sinni i ar. Thad er afturhvarf til medaltals sem spain hefur ekki
   melt — hun man gott upphaf betur en hun aetti ad gera. Nakvaemlega
   sama aett og "form er afturhvarf" i FPL-verkefninu (-4,52pp eftir
   mark, t=-5,26).

   EN: thetta er EINN reitur af 56 (14 breytur x 4 stodur). Vid svo
   marga samanburdi er sterkasti reiturinn vaentanlega sterkur af
   tilviljun. Thess vegna er hann ekki tekinn gildur ur toflunni heldur
   PROFADUR UPP A NYTT — a REKSTRAR-maelikvardanum (draftid), a TVEIMUR
   OHADUM spaheimildum, og med walk-forward. Fylgni i tofluni er
   tilgata; draft-hermun er profid.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";

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
const PROJ = String(ARG.proj || "sleeper");
const FIELD = PROJ === "fftoday" ? "ffProj" : "sleeperProj";
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const RUNS = Number(ARG.runs || 8);
const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

function vbdRank(pool) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).sort((a, b) => b - a);
    const k = Math.min(vals.length - 1, (REPL[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) scored.push([p.id, p.proj - base]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r[FIELD] != null).map((r) => r.season))]
    .sort().filter((y) => y >= 2020);        // tharf vikugogn ur N-1
  console.log(`${PROJ} · ${SCORING} · ${years.length} timabil: ${years.join(", ")}`);

  /* Fyrstu 4 leikir sidasta timabils, PPG. Reiknad ur vikugognum
     N-1 — ekki ur `features`, sem ber thetta ekki. */
  const first4Of = async (year) => {
    let weekly;
    try { weekly = JSON.parse(await readFile(path.join(OUT, "weekly", `${year - 1}.json`), "utf8")); }
    catch { return null; }
    const acc = new Map();
    for (const w of weekly) {
      if (w.week > 4) continue;
      const cur = acc.get(w.id) || { pts: 0, g: 0 };
      cur.pts += SCORING === "ppr" ? w.ppr : w.std;
      cur.g++;
      acc.set(w.id, cur);
    }
    const out = new Map();
    for (const [id, v] of acc) if (v.g >= 2) out.set(id, v.pts / v.g);
    return out;
  };

  const world = {};
  for (const y of years) {
    const f4 = await first4Of(y);
    if (!f4) { console.log(`  (vikugogn ${y - 1} vantar)`); continue; }
    const yr = rows.filter((r) => r.season === y && r.adp != null && r[FIELD] != null);
    if (yr.length < 120) continue;
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos, proj: r[FIELD], adp: r.adp,
                                  adpSd: r.adpSd, first4: f4.get(r.id) ?? null,
                                  actual: pts(r) }));
    const cover = pool.filter((p) => p.first4 != null).length;
    world[y] = {
      pool, cover,
      actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }])),
      field: new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1])),
    };
  }
  const ys = Object.keys(world).map(Number).sort();
  requireSeasons(ys, "timabil med spa og vikugogn ur N-1");
  console.log(`hermdir heimar: ${ys.length} · thekja first4: ` +
    ys.map((y) => `${y} ${world[y].cover}/${world[y].pool.length}`).join(", "));

  const noisyField = (pool, seed) => {
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
   * LEIDRETT BORD. Spain er faerd nidur hja theim sem byrjadi heitt i
   * fyrra, innan stodu, adur en VBD er tekid.
   *
   * `rbOnly` — merkid var langsterkast hja hlaupurum (-0,224 gegn
   * -0,046 hja mottakurum). Baðar utgafur eru maeldar thvi "adeins
   * thar sem merkid maeldist" er sjalft form af leit.
   */
  const adjusted = (pool, w, rbOnly) => {
    const byPos = {};
    for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
    const adj = [];
    for (const [pos, list] of Object.entries(byPos)) {
      const vals = list.map((p) => p.first4).filter((v) => v != null);
      if (vals.length < 15 || (rbOnly && pos !== "RB")) { adj.push(...list); continue; }
      const m = mean(vals);
      const sd = Math.sqrt(mean(vals.map((v) => (v - m) ** 2))) || 1;
      for (const p of list) {
        const z = p.first4 == null ? 0 : (p.first4 - m) / sd;
        /* NEIKVAETT formerki: heitt upphaf -> LAEGRI spa. `w` er hve
           morg prosent af spanni eru faerd per stadalfrávik. */
        adj.push({ ...p, proj: p.proj * (1 - w * z) });
      }
    }
    return vbdRank(adj);
  };

  const duel = (makeBoard) => {
    const perYear = {};
    for (const y of ys) {
      const w = world[y];
      const mine = makeBoard(w.pool), base = vbdRank(w.pool);
      const d = [];
      for (let r = 0; r < RUNS; r++) {
        const field = r === 0 ? w.field : noisyField(w.pool, y * 1000 + r * 7919);
        for (let i = 1; i <= TEAMS; i++) {
          const j = i % TEAMS + 1;
          for (const swap of [false, true]) {
            const res = simulateDraft({
              board: mine, fieldBoard: field, actual: w.actual,
              slot: swap ? j : i, league: LEAGUE,
              rival: { slot: swap ? i : j, board: base },
            });
            d.push(res.points - res.rivalPoints);
          }
        }
      }
      perYear[y] = mean(d);
    }
    const vals = ys.map((y) => perYear[y]);
    const m = mean(vals);
    const sd = Math.sqrt(mean(vals.map((v) => (v - m) ** 2)) * vals.length /
                         Math.max(1, vals.length - 1));
    const s = sd / Math.sqrt(vals.length);
    return { mean: r1(m), se: r1(s), t: r3(s ? m / s : 0),
             wins: vals.filter((v) => v > 0).length, years: vals.length,
             perYear: Object.fromEntries(ys.map((y) => [y, r1(perYear[y])])) };
  };

  /* Heilbrigdisprof: w=0 VERDUR ad gefa nakvaemlega 0. */
  const self = duel((pool) => adjusted(pool, 0, false));
  console.log(`\n  heilbrigdisprof (w=0): ${self.mean} stig ` +
    `${Math.abs(self.mean) < 0.05 ? "— hlutlaust" : "— VIDVORUN"}`);

  const results = [];
  for (const rbOnly of [false, true]) {
    for (const w of [0.03, 0.06, 0.1, 0.15]) {
      const res = duel((pool) => adjusted(pool, w, rbOnly));
      results.push({ rbOnly, w, ...res });
      console.log(`  ${(rbOnly ? "RB einir" : "allir   ").padEnd(9)} w=${String(w).padEnd(5)} ` +
        `${(res.mean > 0 ? "+" : "") + String(res.mean).padStart(7)} stig · ` +
        `${res.wins}/${res.years} ar · t=${res.t}`);
    }
  }

  const best = results.slice().sort((a, b) => b.mean - a.mean)[0];
  const tCrit = ys.length > 6 ? 2.228 : 2.776;
  /* 8 afbrigdi profud. */
  const corrected = tCrit * 1.5;
  console.log(`\n  best: ${best.rbOnly ? "RB einir" : "allir"} w=${best.w} -> ` +
    `${best.mean > 0 ? "+" : ""}${best.mean} stig, ${best.wins}/${best.years} ar, t=${best.t}`);
  console.log(`  hra mork |t| > ${tCrit} · leidrett (8 profa) |t| > ${r3(corrected)}`);
  const verdict = Math.abs(best.t) > corrected ? "STENST"
    : Math.abs(best.t) > tCrit ? "stenst HRA en ekki leidrett" : "FELLUR";
  console.log(`  -> ${verdict}`);

  await writeFile(path.join(OUT, `first4_${SCORING}_${PROJ}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", proj: "sleeper", runs: 8 },
      inputs: ["features.json"], dataDir: OUT }),
    scoring: SCORING, projection: PROJ, seasons: ys,
    selfTest: self, variants: results, best, tCrit, corrected: r3(corrected), verdict,
  }, null, 1));
  console.log(`\n-> data/first4_${SCORING}_${PROJ}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
