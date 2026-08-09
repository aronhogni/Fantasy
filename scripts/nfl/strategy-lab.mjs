#!/usr/bin/env node
/* ============================================================
   strategy-lab.mjs — I HVADA ROD A AD DRAFTA STODURNAR?

     node scripts/nfl/strategy-lab.mjs
     node scripts/nfl/strategy-lab.mjs --scoring=standard --teams=12

   -> data-nfl/strategy_<scoring>.json

   SPURNINGIN: QB fyrst? RB fyrst? WR fyrst? Svarid er MAELANLEGT og
   thad er maelt hér — ekki rokraett.

   ADFERD: fyrir hvert timabil 2015-2025 og hvert af 12 draft-saetum
   er draftad eftir A-Ranking-bordinu EN med STODU-AAETLUN sem thvingar
   hvada stodur ma taka i hverjum af fyrstu umferdunum. Motherjarnir
   drafta eftir ADP (markadinum) an aaetlunar — thad er thad sem
   raunverulega gerist i herberginu. Skorid er hvad lidid SKORADI
   I RAUN thad timabil.

   TVAER GILDRUR SEM ERU FORDADAR:
   1. EITT AR ER EKKI SVAR. 2017 var ar hlauparanna og 2020 ar
      mottakaranna. Hver stefna er thvi keyrd yfir OLL arin og
      dreifingin birt, ekki bara medaltalid.
   2. EITT SAETI ER EKKI SVAR. Ur saeti 1 faerdu allt annad en ur
      saeti 12 og munurinn a theim er staerri en munurinn a stefnum.
      Thess vegna eru oll 12 saetin keyrd — OG utkoman per saeti er
      geymd, thvi retta svarid gaeti verid ad thad FARI EFTIR saeti.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../../src-nfl/accuracy.js";
import { mean, bootstrapDiff } from "../../src-nfl/learn.js";

const OUT = path.resolve(process.cwd(), "data-nfl");
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true];
}));
const SCORING = String(ARG.scoring || "ppr");
const TEAMS = Number(ARG.teams || 12);
const ROUNDS = 14;

/* ---------- stefnurnar ----------
   `plan[i]` = leyfdar stodur i umferd i+1. `null` = frjalst val.
   Adeins fyrstu 6 umferdirnar eru thvingadar; eftir thad er alltaf
   besti lausi madur, thvi thad er thad sem allir gera i reynd.     */
const ANY = null;
const S = (...p) => [...p, ...Array(ROUNDS - p.length).fill(ANY)];

const STRATEGIES = [
  { key: "bpa", label: "Best available (no plan)", plan: null,
    note: "Vidmidid. Fylgir bordinu i blindni." },

  { key: "rb_rb", label: "RB-RB (robust RB)", plan: S(["RB"], ["RB"]) },
  { key: "rb_rb_rb", label: "RB-RB-RB", plan: S(["RB"], ["RB"], ["RB"]) },
  { key: "rb_wr", label: "RB then WR", plan: S(["RB"], ["WR"]) },
  { key: "wr_rb", label: "WR then RB", plan: S(["WR"], ["RB"]) },
  { key: "wr_wr", label: "WR-WR", plan: S(["WR"], ["WR"]) },
  { key: "wr_wr_wr", label: "WR-WR-WR", plan: S(["WR"], ["WR"], ["WR"]) },

  { key: "hero_rb", label: "Hero RB (RB1, then no RB until R5)",
    plan: S(["RB"], ["WR", "TE"], ["WR", "TE"], ["WR", "TE"]),
    note: "Einn oruggur hlaupari, sidan mottakarar." },
  { key: "zero_rb", label: "Zero RB (no RB in rounds 1-4)",
    plan: S(["WR", "TE"], ["WR", "TE"], ["WR", "TE"], ["WR", "TE"]),
    note: "Enginn hlaupari fyrr en i 5. umferd." },
  { key: "zero_rb6", label: "Zero RB, extended (no RB in rounds 1-6)",
    plan: S(["WR", "TE"], ["WR", "TE"], ["WR", "TE"], ["WR", "TE"],
            ["WR", "TE"], ["WR", "TE"]) },

  { key: "qb1", label: "QB in round 1", plan: S(["QB"]) },
  { key: "qb2", label: "QB in round 2", plan: S(ANY, ["QB"]) },
  { key: "qb3", label: "QB in round 3", plan: S(ANY, ANY, ["QB"]) },
  { key: "qb_late", label: "QB not before round 9",
    plan: [...Array(8).fill(["RB", "WR", "TE"]), ...Array(ROUNDS - 8).fill(ANY)],
    note: "Bidur med leikstjornanda fram i 9. umferd." },

  { key: "te1", label: "TE in round 1", plan: S(["TE"]) },
  { key: "te2", label: "TE in round 2", plan: S(ANY, ["TE"]) },
  { key: "te_late", label: "TE not before round 9",
    plan: [...Array(8).fill(["QB", "RB", "WR"]), ...Array(ROUNDS - 8).fill(ANY)] },

  { key: "balanced", label: "RB-WR-RB-WR", plan: S(["RB"], ["WR"], ["RB"], ["WR"]) },
  { key: "wr_heavy", label: "WR-WR-RB-WR", plan: S(["WR"], ["WR"], ["RB"], ["WR"]) },
];

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.map((r) => r.season))].sort();
  const league = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };

  console.log(`stefnur: ${STRATEGIES.length} · ${SCORING.toUpperCase()} · ` +
    `${TEAMS} lid · ${years.length} timabil (${years[0]}-${years.at(-1)})`);

  /* ---------- bordin ----------
     A-RANKING er notad sem bord, thvi thad er thad sem notandinn mun
     raunverulega hafa. Ad maela stefnur a fullkomnu bordi vaeri ad
     svara annarri spurningu (og gaefi RB-thungum stefnum ranglega
     forskot, thvi fullkomid bord veit hverjir meiddust).            */
  const perYear = {};
  for (const y of years) {
    const yr = rows.filter((r) => r.season === y && r.adp != null);
    if (yr.length < 120) continue;
    const actual = new Map(yr.map((r) =>
      [r.id, { pos: r.pos, pts: SCORING === "ppr" ? r.pts : r.ptsStd }]));
    const field = new Map(yr.slice().sort((a, b) => a.adp - b.adp)
      .map((r, i) => [r.id, i + 1]));

    /* A-Ranking: Sleeper-spa -> VBD. Falli hun (fyrir 2022) er ADP
       notad — og thad er MERKT, thvi tha er stefnu-maelingin ad keyra
       a odru bordi og arin eru ekki alveg sambaerileg. */
    const hasSleeper = yr.filter((r) => r.sleeperProj != null).length > 100;
    let board;
    if (hasSleeper) board = vbdBoard(yr, (r) => r.sleeperProj, TEAMS);
    else board = field;

    perYear[y] = { actual, field, board, hasSleeper, n: yr.length };
  }

  /* ---------- hermun ---------- */
  const out = [];
  for (const st of STRATEGIES) {
    const bySeason = {}, bySlot = {};
    for (const [y, w] of Object.entries(perYear)) {
      const pts = [];
      for (let slot = 1; slot <= TEAMS; slot++) {
        const r = simulateDraft({ board: w.board, fieldBoard: w.field,
          actual: w.actual, slot, league, plan: st.plan });
        pts.push(r.points);
        (bySlot[slot] = bySlot[slot] || []).push(r.points);
      }
      bySeason[y] = Math.round(mean(pts) * 10) / 10;
    }
    out.push({
      key: st.key, label: st.label, note: st.note || null,
      mean: Math.round(mean(Object.values(bySeason)) * 10) / 10,
      bySeason,
      bySlot: Object.fromEntries(Object.entries(bySlot)
        .map(([s, v]) => [s, Math.round(mean(v) * 10) / 10])),
    });
  }

  const bpa = out.find((s) => s.key === "bpa");
  for (const s of out) {
    s.vsBpa = bootstrapDiff(s.bySeason, bpa.bySeason);
    s.winYears = Object.keys(s.bySeason)
      .filter((y) => s.bySeason[y] > bpa.bySeason[y]).length;
    s.years = Object.keys(s.bySeason).length;
  }
  out.sort((a, b) => b.mean - a.mean);

  /* ---------- prentun ---------- */
  console.log(`\n${"=".repeat(92)}`);
  console.log(`  DRAFT-STEFNUR · ${SCORING.toUpperCase()} · ${TEAMS} lid · ${years.length} timabil`);
  console.log("=".repeat(92));
  console.log("   stig   vs BPA        ar sem hun vinnur   stefna");
  for (const s of out) {
    const v = s.vsBpa;
    const vs = v ? `${sgn(v.diff)}${v.excludesZero ? "*" : " "} [${sgn(v.lo)},${sgn(v.hi)}]` : "";
    console.log(`${String(s.mean).padStart(7)}  ${vs.padEnd(24)}` +
      `${String(s.winYears).padStart(2)}/${s.years}            ${s.label}`);
  }
  console.log("\n  * = 95% bootstrap-vikmork (klosud per timabil) utiloka null");

  /* ---------- FYRSTA UMFERD PER SAETI ----------
     Retta svarid gaeti farid eftir thvi hvar thu situr. Ur saeti 1
     faerdu besta hlauparann; ur saeti 12 er hann farinn og
     spurningin er onnur.                                            */
  console.log(`\n${"=".repeat(92)}`);
  console.log("  HVAD A AD TAKA I 1. UMFERD, EFTIR SAETI");
  console.log("=".repeat(92));
  const firstRound = [];
  for (const pos of ["RB", "WR", "TE", "QB"]) {
    const plan = S([pos]);
    const row = { pos, bySlot: {} };
    for (let slot = 1; slot <= TEAMS; slot++) {
      const vals = [];
      for (const [y, w] of Object.entries(perYear)) {
        vals.push(simulateDraft({ board: w.board, fieldBoard: w.field,
          actual: w.actual, slot, league, plan }).points);
      }
      row.bySlot[slot] = Math.round(mean(vals) * 10) / 10;
    }
    firstRound.push(row);
  }
  const slots = Array.from({ length: TEAMS }, (_, i) => i + 1);
  console.log("  saeti " + slots.map((s) => String(s).padStart(7)).join(""));
  for (const r of firstRound) {
    console.log(`  ${r.pos.padEnd(5)} ` +
      slots.map((s) => String(Math.round(r.bySlot[s])).padStart(7)).join(""));
  }
  console.log("  besti " + slots.map((s) => {
    const b = firstRound.slice().sort((a, c) => c.bySlot[s] - a.bySlot[s])[0];
    return b.pos.padStart(7);
  }).join(""));

  await writeFile(path.join(OUT, `strategy_${SCORING}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    scoring: SCORING, teams: TEAMS, rounds: ROUNDS,
    seasons: years,
    boardNote: "A-Ranking (Sleeper projection -> VBD) where available, ADP before 2022",
    strategies: out,
    firstRoundBySlot: firstRound,
  }, null, 1));
  console.log(`\n-> data-nfl/strategy_${SCORING}.json`);
}

/** Umreiknar spa i virdi yfir varamanni fyrir gefna deildarstaerd. */
function vbdBoard(rows, getProj, teams) {
  const REPL_12 = { QB: 12, RB: 28, WR: 41, TE: 14 };
  const scale = teams / 12;
  const byPos = {};
  for (const r of rows) {
    const v = getProj(r);
    if (v == null) continue;
    (byPos[r.pos] = byPos[r.pos] || []).push(v);
  }
  const base = {};
  for (const [pos, vals] of Object.entries(byPos)) {
    vals.sort((a, b) => b - a);
    const k = Math.min(vals.length - 1,
      Math.round((REPL_12[pos] ?? 24) * scale) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    base[pos] = around.length ? mean(around) : 0;
  }
  const scored = rows.map((r) => {
    const v = getProj(r);
    return [r.id, v != null ? v - (base[r.pos] ?? 0) : -1e6];
  }).sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

const sgn = (x) => (x == null ? "-" : (x > 0 ? "+" : "") + x.toFixed(1));

main().catch((e) => { console.error(e); process.exit(1); });
