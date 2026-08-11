#!/usr/bin/env node
/* ============================================================
   risk-lab.mjs — A AD TAKA ORUGGA MANNINN SNEMMA OG SVEIFLUNA SEINT?

     node scripts/risk-lab.mjs [--scoring=ppr|standard]
                               [--proj=sleeper|fftoday] [--runs=5]

   -> data/risk_<scoring>_<proj>.json

   SPURNINGIN sem hvert draft-rit svarar jatandi og enginn hér hefur
   maelt: taktu oruggan mann i fyrstu umferdunum og sveiflukenndan
   seint, thvi snemma ertu ad verja stig og seint ertu ad kaupa mida.

   THRJU AHAETTUMAT, OLL TIL A DRAFT-DEGI (enginn leki):
     adpSd    hve mikid MARKADURINN er osammala um hvar hann fer
     ecrSd    hve mikid SERFRAEDINGAR eru osammala um saeti hans
     prevVol  sveiflustudull vikustiga hans i fyrra (sd/medaltal)

   FJOGUR AFBRIGDI:
     avoid    vbd - w*z(ahaetta)          — foroast sveiflu alls stadar
     seek     vbd + w*z(ahaetta)          — leita hennar alls stadar
     early    foroast i umferdum 1-4, hlutlaust eftir thad
     late     hlutlaust framan af, leita hennar fra umferd 9
   `early` og `late` KREFJAST thess ad bordid viti UMFERDINA, sem er
   nyleg geta — kyrrstaett kort getur ekki svarad theim.

   ============================================================
   VARNAGLINN SEM RAEDUR THVI HVERNIG THETTA ER LESID
   ============================================================
   Vikulega talningin velur byrjunarlid hverrar viku MED FULLKOMINNI
   VITNESKJU um tha viku. Su talning VERDLAUNAR SVEIFLU: madur sem
   skorar 0-0-40 kemst i byrjunarlid nakvaemlega tha viku sem hann
   skorar 40. Raunveruleg fantasy velur FYRIRFRAM og faer thad ekki.

   Thess vegna er ALLT MAELT BADAR LEIDIR:
     timabils-summa  hlutlaus gagnvart sveiflu innan timabils
     vikulega        verdlaunar hana (ofurmat)

   Nidurstada sem stenst BADAR er raunveruleg. Nidurstada sem stenst
   ADEINS vikulegu er artefakt af fullkominni vitneskju og ma ekki
   sendast i vidmotid. Thad er munurinn sem thetta prof er byggt til
   ad syna, og hann er astaedan fyrir ad `seek` er sagt serstaklega.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
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
const RUNS = Number(ARG.runs || 5);
const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

function weekPoints(roster, byWeek, week) {
  const by = { QB: [], RB: [], WR: [], TE: [] };
  for (const id of roster) {
    const w = byWeek.get(`${id}|${week}`);
    if (w && by[w.pos]) by[w.pos].push(w.pts);
  }
  for (const k in by) by[k].sort((a, b) => b - a);
  let sum = 0;
  const take = (pos, n) => { sum += by[pos].splice(0, n).reduce((a, b) => a + b, 0); };
  take("QB", 1); take("RB", 2); take("WR", 3); take("TE", 1);
  const flex = [...by.RB, ...by.WR, ...by.TE].sort((a, b) => b - a);
  if (flex.length) sum += flex[0];
  return sum;
}

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

/** Stodlun INNAN STODU — sveifla er ekki sambaerileg milli stada. */
function zByPos(pool, get) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const z = new Map();
  for (const list of Object.values(byPos)) {
    const vals = list.map(get).filter((v) => v != null && Number.isFinite(v));
    if (vals.length < 10) { for (const p of list) z.set(p.id, 0); continue; }
    const m = mean(vals);
    const sd = Math.sqrt(mean(vals.map((v) => (v - m) ** 2))) || 1;
    for (const p of list) {
      const v = get(p);
      z.set(p.id, v == null || !Number.isFinite(v) ? 0 : (v - m) / sd);
    }
  }
  return z;
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r[FIELD] != null).map((r) => r.season))]
    .sort().filter((y) => y >= 2020);        // tharf vikugogn UR N-1
  console.log(`${PROJ} · ${SCORING} · timabil: ${years.join(", ")}`);

  const world = {};
  for (const y of years) {
    let weekly, prevWeekly;
    try {
      weekly = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8"));
      prevWeekly = JSON.parse(await readFile(path.join(OUT, "weekly", `${y - 1}.json`), "utf8"));
    } catch { continue; }

    /* SVEIFLA I FYRRA — sd/medaltal vikustiga. Reiknud UR N-1, svo hun
       er upplysing sem draftarinn hafdi. Kraft um >=8 vikur: annars er
       "sveifla" bara faar maelingar. */
    const byPlayer = new Map();
    for (const w of prevWeekly) {
      if (!w.id) continue;
      (byPlayer.get(w.id) || byPlayer.set(w.id, []).get(w.id))
        .push(SCORING === "ppr" ? w.ppr : w.std);
    }
    const volOf = new Map();
    for (const [id, pts] of byPlayer) {
      if (pts.length < 8) continue;
      const m = mean(pts);
      if (m <= 1) continue;
      const sd = Math.sqrt(mean(pts.map((v) => (v - m) ** 2)));
      volOf.set(id, sd / m);
    }

    const yr = rows.filter((r) => r.season === y && r.adp != null && r[FIELD] != null);
    if (yr.length < 120) continue;
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({
      id: r.id, pos: r.pos, proj: r[FIELD], adp: r.adp, adpSd: r.adpSd,
      ecrSd: r.ecrSd, prevVol: volOf.get(r.id) ?? null, actual: pts(r),
    }));

    const byWeek = new Map();
    const weeks = new Set();
    for (const w of weekly) {
      weeks.add(w.week);
      byWeek.set(`${w.id}|${w.week}`, { pos: w.pos, pts: SCORING === "ppr" ? w.ppr : w.std });
    }
    world[y] = {
      pool, byWeek, weeks: [...weeks].sort((a, b) => a - b),
      cover: {
        adpSd: pool.filter((p) => p.adpSd != null).length,
        ecrSd: pool.filter((p) => p.ecrSd != null).length,
        prevVol: pool.filter((p) => p.prevVol != null).length,
      },
      actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }])),
      field: new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1])),
      vbd: vbdValues(pool),
    };
  }
  const ys = Object.keys(world).map(Number).sort();
  requireSeasons(ys, "timabil med spa OG vikugognum ur N-1");
  console.log(`hermdir heimar: ${ys.length} · thekja (adpSd/ecrSd/prevVol): ` +
    ys.map((y) => `${y} ${world[y].cover.adpSd}/${world[y].cover.ecrSd}/${world[y].cover.prevVol}`).join(", "));

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

  /** Bord sem faerir menn eftir ahaettu — hattur raedur hvenaer. */
  const riskBoard = (W, metric, mode, w) => {
    const z = zByPos(W.pool, (p) => p[metric]);
    return (taken, counts, round) => {
      /* `round` er 0-vistad. `early` virkar i umferdum 1-4, `late` fra
         umferd 9 — thad er thar sem radleggingin sjalf setur mörkin. */
      let sign = 0;
      if (mode === "avoid") sign = -1;
      else if (mode === "seek") sign = +1;
      else if (mode === "early") sign = round < 4 ? -1 : 0;
      else if (mode === "late") sign = round >= 8 ? +1 : 0;

      const scored = new Map();
      for (const p of W.pool) {
        if (taken.has(p.id)) continue;
        const v = W.vbd.get(p.id);
        if (v == null) continue;
        scored.set(p.id, v + sign * w * (z.get(p.id) || 0));
      }
      return rankOf(scored);
    };
  };

  /* BADAR TALNINGAR I EINNI FERD — sami draftur, tvo maelikvardar.
     Sja varnaglann i hausnum: vikulega verdlaunar sveiflu, summan er
     hlutlaus gagnvart henni. */
  const duel = (makeBoard) => {
    const bySeason = {}, byWeekly = {};
    for (const y of ys) {
      const W = world[y];
      const base = rankOf(new Map([...W.vbd.entries()]));
      const ds = [], dw = [];
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
            ds.push(res.points - res.rivalPoints);
            const mine = W.weeks.reduce((a, wk) => a + weekPoints(res.roster, W.byWeek, wk), 0);
            const riv = W.weeks.reduce((a, wk) => a + weekPoints(res.rivalRoster, W.byWeek, wk), 0);
            dw.push(mine - riv);
          }
        }
      }
      bySeason[y] = mean(ds); byWeekly[y] = mean(dw);
    }
    const stat = (per) => {
      const vals = ys.map((y) => per[y]);
      const m = mean(vals);
      const sd = Math.sqrt(mean(vals.map((v) => (v - m) ** 2)) * vals.length /
                           Math.max(1, vals.length - 1));
      const se = sd / Math.sqrt(vals.length);
      return { mean: r1(m), t: r3(se ? m / se : 0),
               wins: vals.filter((v) => v > 0).length, years: vals.length };
    };
    return { season: stat(bySeason), weekly: stat(byWeekly) };
  };

  /* Heilbrigdisprof: vog 0 er sama bord og nulllinan. */
  const self = duel((W) => riskBoard(W, "adpSd", "avoid", 0));
  console.log(`\n  heilbrigdisprof (w=0): summa ${self.season.mean} · vikulega ${self.weekly.mean} ` +
    `${Math.abs(self.season.mean) < 0.05 && Math.abs(self.weekly.mean) < 0.05
      ? "— hlutlaust" : "— VIDVORUN"}`);

  const results = [];
  console.log("\n  maelikvardi  hattur  vog   TIMABILS-SUMMA      VIKULEGA");
  for (const metric of ["adpSd", "ecrSd", "prevVol"]) {
    for (const mode of ["avoid", "seek", "early", "late"]) {
      for (const w of [5, 15]) {
        const res = duel((W) => riskBoard(W, metric, mode, w));
        results.push({ metric, mode, w, ...res });
        const f = (o) => `${(o.mean > 0 ? "+" : "") + String(o.mean).padStart(7)} (${o.wins}/${o.years}, t=${String(o.t).padStart(6)})`;
        console.log(`  ${metric.padEnd(11)} ${mode.padEnd(6)} ${String(w).padEnd(4)} ${f(res.season)}  ${f(res.weekly)}`);
      }
    }
  }

  /* ---------- DOMURINN ---------- */
  const tCrit = ys.length > 6 ? 2.228 : 2.776;
  /* 24 afbrigdi profud — leidretting er nauðsynleg og hun er throng. */
  const corrected = tCrit * 1.6;
  const bothWays = results.filter((r) =>
    r.season.mean > 0 && r.weekly.mean > 0 &&
    Math.abs(r.season.t) > corrected && Math.abs(r.weekly.t) > corrected);
  const weeklyOnly = results.filter((r) =>
    Math.abs(r.weekly.t) > corrected && Math.abs(r.season.t) <= corrected);

  console.log(`\n  ${results.length} afbrigdi. Leidrett mork |t| > ${r3(corrected)}.`);
  console.log(`  stenst BADAR talningar : ${bothWays.length}` +
    (bothWays.length ? ` — ${bothWays.map((r) => `${r.metric}/${r.mode}/w${r.w}`).join(", ")}` : ""));
  console.log(`  stenst ADEINS vikulegu : ${weeklyOnly.length}` +
    (weeklyOnly.length ? ` — ARTEFAKT af fullkominni vitneskju, ma EKKI senda` : ""));
  const verdict = bothWays.length ? "STENST" : "FELLUR";
  console.log(`  -> ${verdict}`);

  await writeFile(path.join(OUT, `risk_${SCORING}_${PROJ}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", proj: "sleeper", runs: 5 },
      inputs: ["features.json"], dataDir: OUT }),
    scoring: SCORING, projection: PROJ, seasons: ys,
    scoredBothWays: true, selfTest: self, variants: results,
    tCrit, corrected: r3(corrected),
    passesBoth: bothWays.map((r) => `${r.metric}/${r.mode}/w${r.w}`),
    weeklyOnly: weeklyOnly.map((r) => `${r.metric}/${r.mode}/w${r.w}`),
    verdict,
  }, null, 1));
  console.log(`\n-> data/risk_${SCORING}_${PROJ}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
