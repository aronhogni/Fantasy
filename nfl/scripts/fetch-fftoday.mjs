#!/usr/bin/env node
/* ============================================================
   fetch-fftoday.mjs — SOGULEGAR FORLEIKS-SPAR, 2015 OG AFTUR.

     node scripts/nfl/fetch-fftoday.mjs [--from=2015] [--to=2025]

   -> data-nfl/fftoday_projections.json

   VANDAMALID: A-Ranking hvilir a fimm timabilum thvi Sleeper-spar
   eru adeins hreinar fra 2021. Allar adrar spa-heimildir sem voru
   reyndar reyndust uppfaerdar eftir a — ESPN, MyFantasyLeague — og
   Internet Archive hafdi ekki vardveitt FantasyPros-spasidurnar.

   FFTODAY GEYMIR SINAR SPASIDUR FROSNAR. `playerproj.php?Season=YYYY`
   skilar spanni eins og hun var thad ar, og profid er otviraett:

     2023 WR-listinn (46 menn) inniheldur **Puka Nacua ALLS EKKI** —
     hann var othekktur nyliði thad haust.
     2024-listinn setur hann i **WR5** — eftir ad hann sprakk.
     Toppurinn 2023 er Jefferson, Chase, Hill; 2024 Hill, Lamb,
     Jefferson. Nakvaemlega retta forleiks-samsteypan hvort ar.

   Uppfaerd spa gaeti ekki sleppt Nacua 2023.

   OG SIDAN GEFUR FULLAR TOLFRAEDI-LINUR, ekki bara stig. Thad thydir
   ad vid reiknum stigin SJALF med `scoring.js` — somu formulu og
   allt annad i verkefninu — og faum thvi PPR, half og standard ur
   sama fæði. FFToday birtir adeins standard (`LeagueID=1`).

   SJALFSPROF SEM VER DALKA-VORPUNINA: reiknud standard-stig VERDA ad
   passa vid FPTS-dalkinn theirra. Skeiki their er vorpunin rong, og
   tha er allt sem byggir a henni rangt an thess ad nokkud brotni.
   ============================================================ */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { record, pool } from "./lib/http.mjs";
import { offensePoints, BASE } from "../src/scoring.js";
import { normTeam } from "../src/names.js";

const OUT = path.resolve(process.cwd(), "data");
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true];
}));
const FROM = Number(ARG.from || 2015);
const TO = Number(ARG.to || 2025);
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/* PosID -> stada. Adeins soknarstodurnar fjorar; K og DST eru utan
   A-Ranking hvort sem er (sja notu i build.js). */
const POS = { 10: "QB", 20: "RB", 30: "WR", 40: "TE" };

/**
 * DALKA-VORPUN per stodu, TALIN FRA HAEGRI.
 * Fyrsti dalkur er tomur, annar er nafn, thridji lid, fjordi bye —
 * en fjoldi tolulegra dalka er mismunandi eftir stodu. Ad telja fra
 * haegri (thar sem FPTS er alltaf sidast) er stodugra en ad telja
 * fra vinstri.
 */
const COLS = {
  /* QB: Comp Att PassYd PassTD Int RushAtt RushYd RushTD FPTS */
  QB: ["completions", "attempts", "passing_yards", "passing_tds",
       "passing_interceptions", "carries", "rushing_yards", "rushing_tds"],
  /* RB: RushAtt RushYd RushTD Rec RecYd RecTD FPTS */
  RB: ["carries", "rushing_yards", "rushing_tds",
       "receptions", "receiving_yards", "receiving_tds"],
  /* WR: Rec RecYd RecTD RushAtt RushYd RushTD FPTS */
  WR: ["receptions", "receiving_yards", "receiving_tds",
       "carries", "rushing_yards", "rushing_tds"],
  /* TE: Rec RecYd RecTD FPTS */
  TE: ["receptions", "receiving_yards", "receiving_tds"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    if (i) await sleep(1500 * i);
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) continue;
      return await res.text();
    } catch { /* reynt aftur */ }
  }
  return null;
}

async function main() {
  const years = [];
  for (let y = FROM; y <= TO; y++) years.push(y);

  const out = {};
  let mismatchTotal = 0, checkedTotal = 0;

  for (const y of years) {
    const rows = [];
    let mismatch = 0, checked = 0;
    for (const [pid, pos] of Object.entries(POS)) {
      for (const page of [0, 1]) {
        const html = await get(
          `https://fftoday.com/rankings/playerproj.php?Season=${y}` +
          `&PosID=${pid}&LeagueID=1&cur_page=${page}`);
        await sleep(400);
        if (!html) continue;
        for (const r of parse(html, pos)) {
          /* OKKAR FORMULA A THEIRRA TOLFRAEDI — ekki theirra stigatala.
             Sidan birtir `FPts` en su tala er i THEIRRA stigagjof, og
             hun er EKKI su sama og okkar fyrir leikstjornendur:
               Jalen Hurts 2023  FFToday 413,1  ·  okkar (4 stig/TD) 367,2
               ... en med 6 stigum per sendingamark: 413,2
             WR og TE passa hins vegar UPP A AUKASTAF.
             Ad taka theirra tolu og leggja grip ofan a hana — eins og
             fyrsta utgafan gerdi — hefdi flutt theirra QB-stigagjof
             inn i okkar heim an thess ad nokkud syndist ad.

             Vid reiknum thvi allt ur hra-tolfraedinni med `scoring.js`,
             somu formulu og allt annad i verkefninu notar. */
          const ppr = offensePoints(r.stats, BASE, pos);
          const rec = r.stats.receptions || 0;

          /* SJALFSPROFID VER DALKA-VORPUNINA og er thvi keyrt ADEINS
             thar sem stigagjafirnar eru thaer somu — RB, WR, TE.
             Fyrir QB er vorpunin vardin odruvisi (sja nedar). */
          if (pos !== "QB") {
            checked++;
            if (Math.abs((ppr - rec) - r.fptsStd) > 1.5) mismatch++;
          } else {
            /* QB: sannreynum ad dalkarnir seu a rettum stad med thvi
               ad krefjast raunhaefra sviða. Sendingayardar utan
               1.500-6.000 thyda ad vorpunin er skokk. */
            checked++;
            const py = r.stats.passing_yards || 0;
            if (py < 1500 || py > 6000) mismatch++;
          }

          rows.push({
            name: r.name, pos, team: r.team, bye: r.bye,
            ppr: round1(ppr),
            half: round1(ppr - rec * 0.5),
            std: round1(ppr - rec),
            fftodayPts: round1(r.fptsStd),   // theirra tala, til samanburdar
            stats: r.stats,
          });
        }
      }
    }
    checkedTotal += checked; mismatchTotal += mismatch;
    if (rows.length > 100) {
      out[y] = rows;
      record(`fftoday_${y}`, mismatch < checked * 0.05,
        `${rows.length} players; column self-check ${checked - mismatch}/${checked} exact`);
    } else {
      record(`fftoday_${y}`, false, `only ${rows.length} players`);
    }
  }

  const seasons = Object.keys(out).map(Number).sort();
  record("fftoday", seasons.length >= 8,
    `${seasons.length} seasons ${seasons[0]}-${seasons.at(-1)}, ` +
    `self-check ${checkedTotal - mismatchTotal}/${checkedTotal} exact`);

  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, "fftoday_projections.json"), JSON.stringify({
    generated: new Date().toISOString(),
    source: "FFToday preseason projections (playerproj.php, frozen per season)",
    scoringNote: "FFToday publishes standard; PPR and half are computed from " +
                 "their own stat lines with src-nfl/scoring.js",
    selfCheck: { checked: checkedTotal, exact: checkedTotal - mismatchTotal },
    seasons, projections: out,
  }));
  console.log(`\n-> ${seasons.length} timabil, ` +
    `${Object.values(out).reduce((a, v) => a + v.length, 0)} radir`);
  console.log(`-> sjalfsprof: ${checkedTotal - mismatchTotal}/${checkedTotal} nakvaem`);
}

/** Ein sida -> radir. */
function parse(html, pos) {
  const out = [];
  const cols = COLS[pos];
  for (const m of html.matchAll(/<TR[^>]*>([\s\S]*?)<\/TR>/gi)) {
    const cells = [...m[1].matchAll(/<TD[^>]*>([\s\S]*?)<\/TD>/gi)]
      .map((c) => c[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ").trim());
    if (cells.length < cols.length + 4) continue;
    const name = cells[1];
    if (!/[A-Za-z]{2,}\s+[A-Za-z]/.test(name)) continue;
    const fpts = numOf(cells[cells.length - 1]);
    if (fpts == null) continue;

    /* Talid FRA HAEGRI: sidast FPTS, thar a undan tolulegu dalkarnir
       i rod `cols`. Thad er onaemara fyrir breytingum vinstra megin
       (mynd, hlekkur, byevika) en ad telja fra vinstri. */
    const start = cells.length - 1 - cols.length;
    if (start < 2) continue;
    const stats = {};
    let ok = true;
    cols.forEach((c, i) => {
      const v = numOf(cells[start + i]);
      if (v == null) ok = false;
      stats[c] = v ?? 0;
    });
    if (!ok) continue;

    out.push({
      name, team: normTeam(cells[2]), bye: numOf(cells[3]),
      fptsStd: fpts, stats,
    });
  }
  return out;
}

const numOf = (v) => {
  const s = String(v).replace(/,/g, "").trim();
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
};
const round1 = (x) => Math.round(x * 10) / 10;

main().catch((e) => { console.error(e); process.exit(1); });
