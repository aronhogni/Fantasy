#!/usr/bin/env node
/* ============================================================
   fetch-schedule-history.mjs — LEIKJASKRA MED LINUM, AFTUR I TIMANN.

     node scripts/fetch-schedule-history.mjs [--from=2019] [--to=2025]

   -> data/schedule_history.json

   HVERS VEGNA THETTA ER TIL. `weeklyProjection()` i model.js hefur
   verid skrifad og OPROFAD: thad margfaldar grunnspa med leikjaflaedi
   (vaentum stigum lidsins ur markadslinunni) og vorn andstaedingsins.
   Husreglan segir ad omaeldur kodi fari ekki i loftid — en hann var
   ekki haegt ad maela, thvi markadslinur per viku voru adeins til
   fyrir YFIRSTANDANDI timabil (`schedule.json` ber 2025-2026).

   nflverse geymir hins vegar `spread_line` og `total_line` fyrir OLL
   timabil i EINNI skra (`schedules/games.csv`); pipeline-id sotti hana
   alltaf en SIADI hana nidur i tvo ar. Sagan var thvi til allan timann
   og enginn hafdi bedid um hana.

   TIMABIL SEM ER LOKID BREYTIST ALDREI, svo thetta er keyrt EINU SINNI
   og utkoman committud — sama regla og onnur soguleg sokn i thessu
   verkefni (sja `fetch-player-gw.mjs`, `fetch-fdr-history.mjs`).
   ============================================================ */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import * as nv from "./sources/nflverse.mjs";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), { from: "number", to: "number" });
const FROM = Number(ARG.from || 2019);
const TO = Number(ARG.to || 2025);

async function main() {
  const years = [];
  for (let y = FROM; y <= TO; y++) years.push(y);
  console.log(`saeki leikjaskra ${FROM}-${TO} …`);

  const games = await nv.schedule(years);
  if (!Array.isArray(games) || games.length < 1000) {
    console.error(`  ADEINS ${games ? games.length : 0} leikir — skrifa EKKERT.`);
    process.exit(2);
  }

  /* Thekja a linum er TALIN OG BIRT, ekki gefin ser. Ar an lina er ar
     sem `weeklyProjection` getur ekki verid maeld a, og thad verdur ad
     sjast adur en einhver treystir bakprofinu. */
  const byYear = {};
  for (const g of games) {
    const y = g.season;
    byYear[y] = byYear[y] || { games: 0, withTotal: 0, withSpread: 0, reg: 0 };
    byYear[y].games++;
    if (g.type === "REG") byYear[y].reg++;
    if (g.total != null && Number.isFinite(g.total)) byYear[y].withTotal++;
    if (g.spread != null && Number.isFinite(g.spread)) byYear[y].withSpread++;
  }
  console.log("\n  ar    leikir   med total   med spread");
  for (const y of years) {
    const b = byYear[y];
    if (!b) { console.log(`  ${y}    (engir)`); continue; }
    console.log(`  ${y}   ${String(b.games).padStart(5)}   ${String(b.withTotal).padStart(8)}   ` +
      `${String(b.withSpread).padStart(9)}`);
  }

  const thin = years.filter((y) => !byYear[y] || byYear[y].withTotal < byYear[y].games * 0.9);
  if (thin.length) {
    console.log(`\n  !! ar med gisnar linur: ${thin.join(", ")} — thau eiga ekki heima`);
    console.log("     i bakprofi a leikjaflaedi og eru merkt i skranni.");
  }

  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, "schedule_history.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { from: 2019, to: 2025 }, inputs: [], dataDir: OUT }),
    seasons: years,
    coverage: byYear,
    thinLineSeasons: thin,
    games: games.map((g) => ({
      season: g.season, week: g.week, type: g.type,
      away: g.away, home: g.home,
      awayScore: g.awayScore, homeScore: g.homeScore,
      spread: g.spread, total: g.total,
    })),
  }));
  console.log(`\n-> data/schedule_history.json  ${games.length} leikir`);
}

main().catch((e) => { console.error(e); process.exit(1); });
