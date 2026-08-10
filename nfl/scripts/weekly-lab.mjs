#!/usr/bin/env node
/* ============================================================
   weekly-lab.mjs — ER TIMABILS-SUMMAN AD BLEKKJA OKKUR?

     node scripts/weekly-lab.mjs [--scoring=ppr|standard] [--proj=...]

   -> data/weekly_check_<scoring>_<proj>.json

   ALLT SEM ER MAELT I THESSU VERKEFNI HVILIR A EINNI FORSENDU sem
   hefur aldrei verid profud: `startersPoints` leggur saman TIMABILS-
   SUMMU og velur byrjunarlidid graduglega ur henni. Raunveruleg
   fantasy er ekki thannig. Hun er 17 adskildar vikulegar akvardanir,
   og thar:

     · AUD VIKA kostar. Madur med 300 stig a 16 vikum og madur med 300
       a 17 eru EKKI jafn verdmaetir — sa fyrri skilur eftir gat.
     · MEIDSLI i viku 6 eydileggja seinni helminginn, ekki hlutfall
       af heildinni.
     · DYPT hefur gildi sem timabils-summan sér alls ekki: fjordi
       mottakarinn er einskis virdi i summunni en bjargar vikunni thar
       sem tveir eru i fri.

   Se rodun sem vinnur a timabils-summu EKKI su sama og vinnur
   vikulega, tha eru allar hinar maelingarnar ad svara rangri
   spurningu. Thetta profar thad beint: SAMA draft, tvær adferdir vid
   ad telja stigin.

   VIKULEGA ADFERDIN NOTAR RETTA UPPLYSINGU A RETTUM TIMA — hun velur
   byrjunarlid vikunnar med FULLKOMINNI vitneskju um tha viku. Thad er
   ofurmat a badum bordum jafnt (baedi njota thess), svo samanburdurinn
   milli borda helst rettur; thad sem breytist er hvort DYPT og
   MAETING fai ad telja, og thad er einmitt thad sem er verid ad maela.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE, startersPoints } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true];
}));
const SCORING = String(ARG.scoring || "ppr");
const PROJ = String(ARG.proj || "sleeper");
const FIELD = PROJ === "fftoday" ? "ffProj" : "sleeperProj";
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const RUNS = Number(ARG.runs || 6);
const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

/* Byrjunarlid VIKUNNAR: QB1 RB2 WR3 TE1 FLEX1, besta samsetning.
   Saetamengin eru hreidrud, svo throngt-fyrst er sannanlega best —
   sama rok og i `lineup.js`, og thad er profad thar. */
function weekPoints(roster, byWeek, week) {
  const pool = roster.map((id) => {
    const w = byWeek.get(`${id}|${week}`);
    return w ? { id, pos: w.pos, pts: w.pts } : null;
  }).filter(Boolean);
  const by = { QB: [], RB: [], WR: [], TE: [] };
  for (const p of pool) if (by[p.pos]) by[p.pos].push(p.pts);
  for (const k in by) by[k].sort((a, b) => b - a);
  let sum = 0;
  const take = (pos, n) => { const t = by[pos].splice(0, n); sum += t.reduce((a, b) => a + b, 0); };
  take("QB", 1); take("RB", 2); take("WR", 3); take("TE", 1);
  const flex = [...by.RB, ...by.WR, ...by.TE].sort((a, b) => b - a);
  if (flex.length) sum += flex[0];
  return sum;
}

function staticBoard(pool) {
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
    .sort().filter((y) => y >= 2019);        // vikugogn na fra 2019
  console.log(`${PROJ} · ${SCORING} · timabil med BÆÐI spa og vikugogn: ${years.join(", ")}`);

  const world = {};
  for (const y of years) {
    let weekly;
    try { weekly = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8")); }
    catch { console.log(`  (vikugogn vantar fyrir ${y})`); continue; }

    const yr = rows.filter((r) => r.season === y && r.adp != null && r[FIELD] != null);
    if (yr.length < 120) continue;
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos, proj: r[FIELD],
                                  adp: r.adp, adpSd: r.adpSd, actual: pts(r) }));

    /* Vikutaflan er lykluð a `id|week`. `features` bera nflverse-id og
       vikuskrarnar lika, svo engin nafna-porun kemur nálaegt thessu. */
    const byWeek = new Map();
    const weeks = new Set();
    for (const w of weekly) {
      weeks.add(w.week);
      byWeek.set(`${w.id}|${w.week}`,
        { pos: w.pos, pts: SCORING === "ppr" ? w.ppr : w.std });
    }
    world[y] = {
      pool, byWeek, weeks: [...weeks].sort((a, b) => a - b),
      actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }])),
      field: new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1])),
    };
  }
  const ys = Object.keys(world).map(Number).sort();
  console.log(`hermdir heimar: ${ys.length}`);

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

  /* SAMA DRAFT, TVAER TALNINGAR. Bordin tvo eru A-Ranking (VBD) og
     hra spa-rod — nakvaemlega samanburdurinn sem allt verkefnid hvilir
     a. Se hann ODRUVISI vikulega er thad stor frett. */
  const rawBoard = (pool) => new Map(pool.slice()
    .sort((a, b) => b.proj - a.proj).map((p, i) => [p.id, i + 1]));

  const season = [], week = [];
  const perYear = {};
  for (const y of ys) {
    const w = world[y];
    const vbd = staticBoard(w.pool), raw = rawBoard(w.pool);
    const sD = [], wD = [];
    for (let r = 0; r < RUNS; r++) {
      const field = r === 0 ? w.field : noisyField(w.pool, y * 1000 + r * 7919);
      for (let i = 1; i <= TEAMS; i++) {
        const j = i % TEAMS + 1;
        for (const swap of [false, true]) {
          const res = simulateDraft({
            board: vbd, fieldBoard: field, actual: w.actual,
            slot: swap ? j : i, league: LEAGUE,
            rival: { slot: swap ? i : j, board: raw },
          });
          sD.push(res.points - res.rivalPoints);
          const mineW = w.weeks.reduce((a, wk) => a + weekPoints(res.roster, w.byWeek, wk), 0);
          const rivW = w.weeks.reduce((a, wk) => a + weekPoints(res.rivalRoster, w.byWeek, wk), 0);
          wD.push(mineW - rivW);
        }
      }
    }
    perYear[y] = { season: r1(mean(sD)), weekly: r1(mean(wD)) };
    season.push(mean(sD)); week.push(mean(wD));
    console.log(`  ${y}  timabils-summa ${mean(sD) > 0 ? "+" : ""}${r1(mean(sD))} · ` +
      `vikulega ${mean(wD) > 0 ? "+" : ""}${r1(mean(wD))}`);
  }

  const stat = (a) => {
    const m = mean(a);
    const sd = Math.sqrt(mean(a.map((v) => (v - m) ** 2)) * a.length / Math.max(1, a.length - 1));
    const s = sd / Math.sqrt(a.length);
    return { mean: r1(m), se: r1(s), t: r3(s ? m / s : 0),
             wins: a.filter((v) => v > 0).length, years: a.length };
  };
  const S = stat(season), W = stat(week);
  /* Fylgni milli adferdanna yfir arin: 1,0 thydir ad thaer segi somu
     sogu, lag tala ad onnur hvor se ad maela eitthvad annad. */
  const ms = mean(season), mw = mean(week);
  let num = 0, ds = 0, dw = 0;
  for (let i = 0; i < season.length; i++) {
    num += (season[i] - ms) * (week[i] - mw);
    ds += (season[i] - ms) ** 2; dw += (week[i] - mw) ** 2;
  }
  const corr = ds && dw ? num / Math.sqrt(ds * dw) : 0;

  console.log(`\n${"=".repeat(72)}`);
  console.log("  A-RANKING GEGN HRARRI SPAROD — TVAER TALNINGAR A SAMA DRAFTI");
  console.log("=".repeat(72));
  console.log(`  timabils-summa  ${S.mean > 0 ? "+" : ""}${S.mean} stig · ${S.wins}/${S.years} ar · t=${S.t}`);
  console.log(`  vikulega        ${W.mean > 0 ? "+" : ""}${W.mean} stig · ${W.wins}/${W.years} ar · t=${W.t}`);
  console.log(`  fylgni adferda yfir arin: r=${r3(corr)}`);
  const sameStory = (S.mean > 0) === (W.mean > 0) && corr > 0.5;
  console.log(`\n  -> ${sameStory
    ? "SOMU SOGU. Timabils-summan er nothaef nalgun og allar hinar maelingarnar standa."
    : "OLIKA SOGU — timabils-summan er ad svara annarri spurningu og thad tharf ad endurskoda."}`);

  await writeFile(path.join(OUT, `weekly_check_${SCORING}_${PROJ}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", proj: "sleeper", runs: 6 },
      inputs: ["features.json"], dataDir: OUT }),
    scoring: SCORING, projection: PROJ, seasons: ys,
    seasonTotal: S, weekly: W, correlation: r3(corr), sameStory, perYear,
  }, null, 1));
  console.log(`\n-> data/weekly_check_${SCORING}_${PROJ}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
