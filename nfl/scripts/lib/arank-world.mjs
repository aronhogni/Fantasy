/* ============================================================
   arank-world.mjs — HERMDI DRAFT-HEIMURINN, EIN UTFAERSLA

   ÞETTA VAR ALLT INNI I `arank-lab.mjs` og var thess vegna
   OAÐGENGILEGT ODRUM MAELINGUM: skrain kallar `main()` OSKILYRT i
   botni, svo `import` a henni keyrir ALLA maelinguna (sama aett og
   `fetch.mjs` i FPL-hlutanum, kafli 7 thar). Onnur skrifta sem vildi
   nota sama heim atti thvi tvo kosti og badir rangir — afrita
   utfaersluna, eda keyra hana i barnaferli og lesa JSON.

   AFRIT ER TVAER UTFAERSLUR SEM REKA I SUNDUR. Þad er nakvaemlega
   villan sem `buildTeamMetrics` kostadi i FPL-hlutanum: handafrit
   skrifadi NaN a 17 lid og merkti thad sem maelingu. Hér er utfaerslan
   EIN og badar skriftur flytja hana inn.

   PROFSTEINN A FLUTNINGNUM: `arank-lab.mjs` skrifar `arank_ppr.json`,
   og eftir flutninginn verdur hun BYTE-EINS ad `generated`/
   `provenance` fraskildum. Þad var sannreynt.
   ============================================================ */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft } from "../../src/accuracy.js";
import { mean, bootstrapDiff } from "../../src/learn.js";

/** Varamanns-threp. Fyrsta talan er su sem er i notkun i dag. */
export const REPL_VARIANTS = {
  "starters+flex (current)": { QB: 12, RB: 28, WR: 41, TE: 14 },
  "last starter": { QB: 12, RB: 24, WR: 36, TE: 12 },
  "one round deeper": { QB: 18, RB: 34, WR: 48, TE: 18 },
  "drafted count": { QB: 20, RB: 40, WR: 60, TE: 20 },
  "waiver level": { QB: 24, RB: 48, WR: 72, TE: 24 },
};
export const CURRENT_REPL = REPL_VARIANTS["starters+flex (current)"];

export function vbdBoard(pool, repl, { shrink = 0, blend = 0 } = {}) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).sort((a, b) => b - a);
    const k = Math.min(vals.length - 1, (repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    const m = mean(vals);
    for (const p of list) {
      const proj = p.proj * (1 - shrink) + m * shrink;
      const v = proj - base;
      scored.push([p.id, (1 - blend) * v + blend * proj]);
    }
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** Somu VBD-gildi og `vbdBoard` radar eftir — en OROÐUD. */
export function vbdValues(pool, repl, { shrink = 0, blend = 0 } = {}) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const out = new Map();
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).sort((a, b) => b - a);
    const k = Math.min(vals.length - 1, (repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    const m = mean(vals);
    for (const p of list) {
      const proj = p.proj * (1 - shrink) + m * shrink;
      out.set(p.id, (1 - blend) * (proj - base) + blend * proj);
    }
  }
  return out;
}

/**
 * Heimurinn per timabil ur `features.json`.
 * `proj` = "sleeper" (5 hrein timabil) eda "fftoday" (11).
 */
export async function loadWorld({ dataDir, scoring = "ppr", proj = "sleeper" }) {
  const field = proj === "fftoday" ? "ffProj" : "sleeperProj";
  const feats = JSON.parse(await readFile(path.join(dataDir, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === scoring);
  const years = [...new Set(rows.filter((r) => r[field] != null).map((r) => r.season))].sort();
  const world = {};
  for (const y of years) {
    const yr = rows.filter((r) => r.season === y && r.adp != null && r[field] != null);
    if (yr.length < 120) continue;
    const pts = (r) => (scoring === "ppr" ? r.pts : r.ptsStd);
    /* AUKASVIDIN FYLGJA MEÐ OG ÞAU ERU EKKI SKRAUT: `arank-need-lab`
       spyr hvort markadurinn (adp/ecr) eda tiltaekileiki baeti nokkru
       vid spana, og THAU eru gognin. `vbdBoard` snertir thau ekki. */
    const pool = yr.map((r) => ({
      id: r.id, pos: r.pos, proj: r[field], adp: r.adp, adpSd: r.adpSd,
      ecr: r.ecr, ecrSd: r.ecrSd, age: r.age, exp: r.exp,
      durability: r.durability, missed2y: r.missed2y, prevMissed: r.prevMissed,
      prevPpg: r.prevPpg, trend: r.trend, teamChange: r.teamChange,
      actual: pts(r),
    }));
    world[y] = {
      pool,
      actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }])),
      field: new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1])),
      sleeper: new Map(pool.slice().sort((a, b) => b.proj - a.proj).map((p, i) => [p.id, i + 1])),
    };
  }
  const ys = Object.keys(world).map(Number).sort();
  return { world, ys, years };
}

/* ============================================================
   HRISTINGURINN NOTADI ALDREI MAELDA FRAVIKID (fundid 28.8.2026)
   ============================================================
   `arank-lab.mjs` sagdi berum ordum: "Med thvi ad hrista vollinn med
   THVI SAMA fraviki og FFC maelir faum vid morg ohad sýni per ar."
   Fallid les `p.adpSd` og fellur i `1,08 * sqrt(ADP)` vanti hana.

   EN LAUGIN BAR ALDREI `adpSd`. Hun var byggd sem
   `{ id, pos, proj, adp, actual }`, svo `p.adpSd` var `undefined`
   fyrir HVERN EINASTA leikmann og varaleidin gilti um alla. Maeld
   dreifing var i gognunum (`features.json` ber `adpSd` i 100% rada)
   og var einfaldlega ekki rett i laugina.

   ÞETTA ER SAMA AETT OG "tomt gildi er ekki null": grein sem er
   skrifud fyrir eitt tilfelli og keyrir i ollum tilfellum. Hun
   THAGDI thvi hun gefur ALLTAF tolu — bara ranga: sleepari med
   sd 25 og hornsteinn med sd 3 voru hristir jafn mikid.

   MAELT: h2h-medaltalid fer ur +59,9 i +51,2 (5 timabil, PPR) og
   arin faerast ohað — 2021 +169,3 -> +187,8. Vordurinn er
   `arank-lab-refactor` samanburdurinn sjalfur: med `adpSd` fjarlaegt
   ur lauginni er utkoman BYTE-EINS og fyrir flutninginn, sem sannar
   ad EKKERT ANNAD breyttist i flutningnum.                        */
/** Hristur vollur — sama frávik og FFC maelir, fast fraekorn. */
export function noisyField(pool, seed) {
  let a = seed >>> 0;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const gauss = () => {
    const u = Math.max(1e-9, rnd()), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const jittered = pool.map((p) => {
    const sd = p.adpSd != null && p.adpSd > 0 ? p.adpSd : 1.08 * Math.sqrt(Math.max(1, p.adp));
    return [p.id, p.adp + gauss() * sd];
  }).sort((x, y) => x[1] - y[1]);
  return new Map(jittered.map(([id], i) => [id, i + 1]));
}

/** Eitt bord gegn ollum saetum og arum; skilar per (ar, saeti). */
export function makeRun({ world, ys, league, teams }) {
  return (boardOf) => {
    const bySlot = {};
    for (const y of ys) {
      const w = world[y];
      const board = boardOf(w.pool, y);
      bySlot[y] = [];
      for (let slot = 1; slot <= teams; slot++) {
        bySlot[y].push(simulateDraft({ board, fieldBoard: w.field,
          actual: w.actual, slot, league }).points);
      }
    }
    return bySlot;
  };
}

/** Beint einvigi i somu deild — pordu tilraunahonnunin. */
export function makeHeadToHead({ world, ys, league, teams, runs = 20, rivalOf = (w) => w.sleeper }) {
  return (boardOf) => {
    const diffs = [];
    for (const y of ys) {
      const w = world[y];
      const board = boardOf(w.pool, y);
      const rivalBoard = rivalOf(w);
      for (let r = 0; r < runs; r++) {
        const fieldB = r === 0 ? w.field : noisyField(w.pool, y * 1000 + r * 7919);
        for (let i = 1; i <= teams; i++) {
          const j = i % teams + 1;
          for (const swap of [false, true]) {
            const aSlot = swap ? j : i, sSlot = swap ? i : j;
            const a = simulateDraft({
              board, fieldBoard: fieldB, actual: w.actual, slot: aSlot, league,
              rival: { slot: sSlot, board: rivalBoard },
            });
            diffs.push({ season: y, aSlot, sSlot, diff: a.points - a.rivalPoints });
          }
        }
      }
    }
    const m = mean(diffs.map((d) => d.diff));
    const wins = diffs.filter((d) => d.diff > 0).length;
    const byYear = ys.map((y) => mean(diffs.filter((d) => d.season === y).map((d) => d.diff)));
    const mm = mean(byYear);
    const sd = Math.sqrt(mean(byYear.map((v) => (v - mm) ** 2)) *
                         byYear.length / Math.max(1, byYear.length - 1));
    const se = sd / Math.sqrt(byYear.length);
    const t = se ? mm / se : 0;
    const yearWins = byYear.filter((v) => v > 0).length;
    /* t-morkin voru HARÐKODUD a 2,776 = t(4) — rett fyrir FIMM ar og
       ROMG fyrir eLLEFU. Med fftoday-heiminum var billid thvi ~20%
       of breitt. Sja `tCrit`. */
    const tc = tCrit(byYear.length - 1);
    return {
      mean: round1(m), n: diffs.length, wins, winRate: round4(wins / diffs.length),
      byYear: Object.fromEntries(ys.map((y, i) => [y, round1(byYear[i])])),
      yearWins, years: ys.length,
      t: round2(t), se: round1(se),
      lo: round1(mm - tc * se), hi: round1(mm + tc * se),
      significant: Math.abs(t) > tc,
      signP: round4(binomialTail(yearWins, ys.length)),
    };
  };
}

/** Þrju prof gegn vidmidi (Sleeper-rod). */
export function makeTests({ ys: allYs, teams, baseRuns, basePerSeason }) {
  return (label, perSeason, runsBySlot) => {
    const ys = Object.keys(perSeason).map(Number).sort();
    const wins = ys.filter((y) => perSeason[y] > basePerSeason[y]).length;
    const boot = bootstrapDiff(perSeason, basePerSeason);
    const signP = binomialTail(wins, ys.length);
    const perSlotDiffs = [];
    for (const y of ys) {
      for (let i = 0; i < teams; i++) perSlotDiffs.push(runsBySlot[y][i] - baseRuns[y][i]);
    }
    const yearMeans = ys.map((y) => mean(runsBySlot[y].map((v, i) => v - baseRuns[y][i])));
    const m = mean(yearMeans);
    const sd = Math.sqrt(mean(yearMeans.map((v) => (v - m) ** 2)) *
                         ys.length / Math.max(1, ys.length - 1));
    const se = sd / Math.sqrt(ys.length);
    const t = se ? m / se : 0;
    const tc = tCrit(ys.length - 1);
    return {
      label, mean: round1(mean(Object.values(perSeason))),
      diff: round1(m), wins, years: ys.length,
      boot: boot ? { lo: round1(boot.lo), hi: round1(boot.hi),
                     excludesZero: boot.excludesZero } : null,
      signP: round4(signP),
      paired: { t: round2(t), se: round1(se),
                lo: round1(m - tc * se), hi: round1(m + tc * se),
                significant: Math.abs(t) > tc },
      slotWins: perSlotDiffs.filter((d) => d > 0).length,
      slots: perSlotDiffs.length,
    };
  };
}

/* ============================================================
   t-MORKIN VORU HARÐKODUD OG THAU ERU HAD FRIGRADUM
   ============================================================
   `arank-lab.mjs` bar `2.776` med athugasemdinni "t(4), 95%" a BADUM
   stodum. Þad er rett tala fyrir fimm timabil (df=4) og ROMG fyrir
   ellefu (df=10 -> 2,228) — og skriftan tekur `--proj=fftoday`, sem
   gefur nakvaemlega ellefu. Vikmorkin i `arank_ppr_fftoday.json` voru
   thvi ~25% of breid, og `significant`-flaggid of strangt: t=2,33
   (blandan) var merkt "ekki marktaekt" thott 2,228 se rett mork.

   ÞETTA ER SKEKKJA I VARFAERNI ATT, sem er astaedan fyrir thvi ad hun
   lifdi — hun gat aldrei buid til fals-jakvaeda nidurstodu, adeins
   falid rettmaeta. En tala sem er kolluð "95%" og er thad ekki er
   ROMG tala, i hvora attina sem hun hallar.

   Taflan er t(0,975, df) fyrir df 1..30 og sidan normal-morkin.     */
const T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262,
  2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086,
  2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];
export function tCrit(df) {
  if (df < 1) return Infinity;
  return df <= 30 ? T95[df - 1] : 1.96;
}

/** P(X >= k) fyrir X ~ Bin(n, 0.5) — einhlida tekna-prof. */
export function binomialTail(k, n) {
  let s = 0;
  for (let i = k; i <= n; i++) s += choose(n, i);
  return s / 2 ** n;
}
function choose(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

export const sgn = (x) => (x == null ? "-" : (x > 0 ? "+" : "") + x.toFixed(1));
export const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
export const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
export const round4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
