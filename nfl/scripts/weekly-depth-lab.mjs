#!/usr/bin/env node
/* ============================================================
   weekly-depth-lab.mjs — MAELIKVARDINN SEM VANTADI: BEKKURINN SKORAR

     node scripts/weekly-depth-lab.mjs [--scoring=ppr|half|std]
                                       [--runs=15] [--json=<slod>]

   ALLAR A-RANKING-MAELINGAR I THESSU REPO SKORA `startersPoints`:
   arstidar-summu atta byrjunarmanna, valda i einu lagi med
   graedgi. I theim maelikvarda er BEKKJARMADUR NAKVAEMLEGA 0.

   ÞAD ER EKKI HLUTLAUS FORSENDA, OG ÞAD VAR MAELT: sjalfstaed
   endurgerd 29.8.2026 sannreyndi afgangs-fradrattinn (+64,5 stig,
   10/11 ar) OG syndi ad a ollum 14 monnum er abatinn adeins **+7,1
   (t = 0,39)** — bekkurinn tapar 58 stigum a moti 64 i byrjunarlidinu.
   Reglan faerir virdi UR bekknum INN i byrjunarlidid. Hvort thad er
   raunverulegur abati er had thvi hvort bekkurinn skorar nokkurn
   timann, og THAD getur arstidar-summan ekki svarad.

   ============================================================
   HVERS VEGNA VIKULEGT MAT ER LEYFILEGT HÉR — OG EKKI I `risk-lab`
   ============================================================
   `risk-lab.mjs` varar rettilega vid vikulegri talningu: hun velur
   byrjunarlid hverrar viku MED FULLKOMINNI VITNESKJU um tha viku og
   VERDLAUNAR thvi sveiflu (0-0-40 madurinn kemst inn nakvaemlega tha
   viku sem hann skorar 40).

   ÞESSI SKRIFTA GERIR ÞAD **EKKI**. Byrjunarlid hverrar viku er valid
   eftir FORLEIKS-SPA — sama rod alla leid, engin vitneskja um utkomu
   vikunnar. Eina vitneskjan sem er notud er HVER VAR TILTAEKUR, sem er
   opinber fyrir kickoff og er einmitt thad sem raunverulegur
   stjornandi veit. Sveifla er thvi ekki verdlaunud; TILTAEKILEIKI er.

   ÞRJAR TAKMARKANIR SAGDAR BERUM ORDUM:
     · "spiladi ekki i theirri viku" blandar meidslum, audum vikum,
       bonnum og rotering — gognin greina thau ekki. Þad er
       IHALDSSAMT gagnvart bekknum ef eitthvad (hann er einfaldlega
       lakari madur), og hlidholt honum ef stjornandinn hefdi ekki
       gert skiptin i raun.
     · valid uppfaerist ekki innan tímabils (raunverulegur stjornandi
       les form). Fast forleiks-mat er thvi UNDIRMAT a gedi bekksins.
     · vikur 1-17; urslitakeppni deildarinnar er ekki hermd.

   Vikugognin (`data/weekly/*.json`) na yfir **2019-2025**, svo thetta
   er 7 timabil, ekki 11 — faerri en `arank-need-lab` og thad er sagt.
   ============================================================ */

import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DEFAULT_LEAGUE, simulateDraft } from "../src/accuracy.js";
import { mean, tCritDf } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs } from "./lib/args.mjs";
import { CURRENT_REPL, vbdValues, noisyField, binomialTail, sgn, round1, round2 }
  from "./lib/arank-world.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  scoring: ["ppr", "half", "std"], runs: "number", json: "string", k: "number",
  proj: ["sleeper", "fftoday"],
});
const SCORING = String(ARG.scoring || "ppr");
/* SKURDURINN VID VIKUGOGNIN RAEDUR AFLINU: `sleeperProj` byrjar 2021 og
   vikugognin 2019, svo Sleeper gefur 5 timabil en FFToday **7**. Þad er
   TVEIMUR meira af thvi eina sem thetta prof er af skornum skammti i. */
const PROJ = String(ARG.proj || "sleeper");
const PROJ_FIELD = PROJ === "fftoday" ? "ffProj" : "sleeperProj";
const RUNS = Number(ARG.runs || 15);
const NEED_K = Number(ARG.k || 30);
const TEAMS = 12, ROUNDS = 14, WEEKS = 17;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const ST = LEAGUE.starters, FLEXPOS = LEAGUE.flexPos;

const startable = (() => {
  const o = {};
  for (const p of ["QB", "RB", "WR", "TE"]) {
    o[p] = (ST[p] || 0) + (FLEXPOS.includes(p) ? (ST.FLEX || 0) : 0);
  }
  return o;
})();

const rank = (vals) => new Map([...vals.entries()]
  .sort((a, b) => b[1] - a[1]).map(([id], i) => [id, i + 1]));

/** Bordin tvo sem eru borin saman — SOMU tvo og i `arank-need-lab`. */
const plainBoard = (pool) => rank(vbdValues(pool, CURRENT_REPL, {}));
const needBoard = (pool) => {
  const vals = vbdValues(pool, CURRENT_REPL, {});
  const posOf = new Map(pool.map((p) => [p.id, p.pos]));
  return (taken, counts) => {
    const adj = new Map();
    for (const [id, v] of vals) {
      const pos = posOf.get(id);
      const s = Math.max(0, (counts[pos] || 0) - (startable[pos] ?? 99) + 1);
      adj.set(id, v - NEED_K * s);
    }
    return rank(adj);
  };
};

/* ============================================================
   VIKULEGA TALNINGIN
   ============================================================
   `order` er FORLEIKS-ROD (spa), fost allt timabilid. Hver vika:
   tiltaekir = their sem eiga rod i vikugognunum. Byrjunarlid er valid
   ur theim eftir `order` — EKKI eftir stigum vikunnar.               */
export function weeklyPoints(roster, wk, order, posOf, slots = ST, flexPos = FLEXPOS,
                             weeks = WEEKS) {
  let total = 0;
  for (let w = 1; w <= weeks; w++) {
    const avail = roster
      .filter((id) => wk.has(`${id}|${w}`))
      .sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9));
    const used = new Set();
    const take = (pred, n) => {
      let c = 0;
      for (const id of avail) {
        if (c >= n) break;
        if (used.has(id) || !pred(posOf.get(id))) continue;
        used.add(id); total += wk.get(`${id}|${w}`); c++;
      }
    };
    for (const pos of ["QB", "RB", "WR", "TE"]) take((x) => x === pos, slots[pos] || 0);
    take((x) => flexPos.includes(x), slots.FLEX || 0);
  }
  return total;
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const scoreKey = SCORING === "half" ? "half" : SCORING === "std" ? "std" : "ppr";
  const featScoring = SCORING === "std" ? "standard" : "ppr";   // features ber tvaer
  const rows = feats.rows.filter((r) => r.scoring === featScoring);

  const world = {};
  for (const y of [...new Set(rows.map((r) => r.season))].sort()) {
    let weekly;
    try { weekly = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8")); }
    catch { continue; }                       // vikugogn vantar -> arid er sleppt
    const yr = rows.filter((r) => r.season === y && r.adp != null && r[PROJ_FIELD] != null);
    if (yr.length < 120) continue;
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos, proj: r[PROJ_FIELD],
      adp: r.adp, adpSd: r.adpSd, actual: featScoring === "ppr" ? r.pts : r.ptsStd }));
    const wk = new Map();
    for (const r of weekly) {
      const v = r[scoreKey];
      if (v != null) wk.set(`${r.id}|${r.week}`, v);
    }
    world[y] = {
      pool, wk,
      posOf: new Map(pool.map((p) => [p.id, p.pos])),
      /* FORLEIKS-RODIN: spa, ekki utkoma. */
      order: new Map(pool.slice().sort((a, b) => b.proj - a.proj).map((p, i) => [p.id, i + 1])),
      actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }])),
      field: new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1])),
    };
  }
  const ys = Object.keys(world).map(Number).sort();
  console.log(`timabil med BADI spa og vikugogn: ${ys.join(", ")}`);
  if (ys.length < 3) { console.log("of fa timabil — engin tala birt"); return; }

  /* Þekja: hve mikid af arstidar-summunni naest vikulega? Vaeri thad
     langt undir 1 vaeri talningin biluð, ekki maeling. */
  {
    const y = ys[ys.length - 1], w = world[y];
    const top = w.pool.slice().sort((a, b) => b.proj - a.proj).slice(0, 8).map((p) => p.id);
    const wkSum = top.reduce((a, id) => a + Array.from({ length: WEEKS }, (_, i) =>
      w.wk.get(`${id}|${i + 1}`) || 0).reduce((x, y2) => x + y2, 0), 0);
    const seaSum = top.reduce((a, id) => a + (w.actual.get(id).pts || 0), 0);
    console.log(`THEKJA ${y}: atta bestu — vikusumma ${wkSum.toFixed(0)} ` +
      `a moti arstidar-summu ${seaSum.toFixed(0)} (${(wkSum / seaSum * 100).toFixed(1)}%)`);
  }

  /* Einvigi: BADIR bordin drafta i somu deild, gegn somu vollum, i
     badar attir — sama honnun og `arank-need-lab`. Bædi maelikvardarnir
     eru reiknadir a SOMU rosturum, svo munurinn a theim er ekki
     urtakshavadi heldur maelikvardinn sjalfur. */
  const per = { starters: [], weekly: [], bench: [] };
  for (const y of ys) {
    const w = world[y];
    const nb = needBoard(w.pool), pb = plainBoard(w.pool);
    const acc = { starters: [], weekly: [], bench: [] };
    for (let r = 0; r < RUNS; r++) {
      const field = r === 0 ? w.field : noisyField(w.pool, y * 1000 + r * 7919);
      for (let i = 1; i <= TEAMS; i++) {
        const j = i % TEAMS + 1;
        for (const swap of [false, true]) {
          const aSlot = swap ? j : i, sSlot = swap ? i : j;
          const res = simulateDraft({ board: nb, fieldBoard: field, actual: w.actual,
            slot: aSlot, league: LEAGUE, rival: { slot: sSlot, board: pb } });
          const mineR = res.rosters[aSlot], theirs = res.rosters[sSlot];
          acc.starters.push(res.points - res.rivalPoints);
          acc.weekly.push(weeklyPoints(mineR, w.wk, w.order, w.posOf)
                        - weeklyPoints(theirs, w.wk, w.order, w.posOf));
          const all = (rr) => rr.reduce((a, id) => a + (w.actual.get(id)?.pts || 0), 0);
          acc.bench.push(all(mineR) - all(theirs));
        }
      }
    }
    for (const k of ["starters", "weekly", "bench"]) per[k].push(mean(acc[k]));
    console.log(`  ${y}  byrjunarlid ${sgn(mean(acc.starters)).padStart(8)}` +
      `   vikulega ${sgn(mean(acc.weekly)).padStart(8)}` +
      `   allir 14 ${sgn(mean(acc.bench)).padStart(8)}`);
  }

  const stat = (v) => {
    const m = mean(v);
    const sd = Math.sqrt(mean(v.map((x) => (x - m) ** 2)) * v.length / Math.max(1, v.length - 1));
    const se = sd / Math.sqrt(v.length);
    const t = se ? m / se : 0, tc = tCritDf(v.length - 1);
    return { mean: round1(m), t: round2(t), lo: round1(m - tc * se), hi: round1(m + tc * se),
             significant: Math.abs(t) > tc, wins: v.filter((x) => x > 0).length,
             years: v.length, signP: round1(binomialTail(v.filter((x) => x > 0).length, v.length) * 10000) / 10000 };
  };
  const res = { starters: stat(per.starters), weekly: stat(per.weekly), bench: stat(per.bench) };
  console.log(`\n${"=".repeat(76)}`);
  console.log(`  AFGANGS-FRADRATTUR (k=${NEED_K}) GEGN HRAU VBD — ThRIR MAELIKVARDAR`);
  console.log("=".repeat(76));
  for (const [k, r] of Object.entries(res)) {
    const label = k === "starters" ? "arstidar-summa byrjunarlids (maelikvardinn sem var notadur)"
      : k === "weekly" ? "VIKULEGA, byrjunarlid valid eftir FORLEIKS-SPA ur theim TILTAEKU"
      : "allir 14 menn (bekkur talinn fullu)";
    console.log(`\n  ${label}`);
    console.log(`    ${sgn(r.mean)} stig · ${r.wins}/${r.years} ar · t = ${r.t}` +
      ` · 95% [${sgn(r.lo)}, ${sgn(r.hi)}]  ${r.significant ? "MARKTAEKT" : "ekki marktaekt"}` +
      ` · tekna-prof p = ${r.signP}`);
  }
  /* ============================================================
     SKRAARNAFNID VERDUR AD BERA **BADAR** BREYTURNAR
     ============================================================
     Fyrsta utgafa bar adeins `SCORING`, svo `--proj=fftoday` skrifadi
     OFAN I sleeper-keyrsluna: skra sem het `weekly_depth_ppr.json` bar
     `proj: "fftoday"` og SJO timabil. Tvaer olikar maelingar undir sama
     nafni — og su sem var eftir var ekki su sem nafnid lofadi.
     `arank-lab.mjs` gerir thad sama rett; hér gleymdist thad. */
  const dest = ARG.json ? String(ARG.json)
    : path.join(OUT, `weekly_depth_${SCORING}${PROJ === "fftoday" ? "_fftoday" : ""}.json`);
  await writeFile(dest, JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", proj: "sleeper", runs: 15, k: 30,
                  teams: TEAMS, rounds: ROUNDS, weeks: WEEKS },
      inputs: ["features.json", "weekly/*.json"], dataDir: OUT }),
    scoring: SCORING, proj: PROJ, needK: NEED_K, seasons: ys, teams: TEAMS, rounds: ROUNDS, weeks: WEEKS,
    perSeason: Object.fromEntries(ys.map((y, i) => [y, {
      starters: round1(per.starters[i]), weekly: round1(per.weekly[i]), bench: round1(per.bench[i]) }])),
    tests: res,
  }, null, 1));
  console.log(`\n-> ${dest}`);
}

const invokedDirectly = (() => {
  try {
    return realpathSync(process.argv[1] || "") === realpathSync(fileURLToPath(import.meta.url));
  } catch { return false; }
})();
if (invokedDirectly) main().catch((e) => { console.error(e); process.exit(1); });
