#!/usr/bin/env node
/* ============================================================
   calibrate.mjs — MAELIR fastana i `src/model.js`.

     node scripts/calibrate.mjs

   Skrifar `data/calibration.json` og prentar toflurnar.

   HVERS VEGNA THETTA ER TIL: `model.js` ber tolur eins og
   `ELASTICITY = 0,55` og `DEF_WEIGHT = 0,35`. An thessarar skriftu
   vaeru thaer VALDAR og athugasemdin sem segir "MAELT" vaeri osonn.
   Grunnreglan ur CLAUDE.md gildir obreytt i thessu verkefni:
   **omaeld tala sem litur ut eins og maeling er versta utkoman —
   hun er rong OG truverdug.**

   URTAKID: 2020-2025 (6 timabil). 2019 er sleppt thvi vedbankalinur
   i `games.csv` eru gisnari thar, og 2020 er HAFT MED tho thad se
   Covid-arid — ad henda thvi vaeri ad velja urtak eftir utkomu.
   ============================================================ */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { getText } from "./lib/http.mjs";
import { objects, num, str } from "./lib/csv.mjs";
import { readFile } from "node:fs/promises";
import { IMPLIED_BASE } from "../src/model.js";
import { normTeam } from "../src/names.js";
import { flexOccupancy, LEGACY_SHAPE } from "./lib/flex-occupancy.mjs";

const OUT = path.resolve(process.cwd(), "data");
const SEASONS = [2020, 2021, 2022, 2023, 2024, 2025];
const REL = "https://github.com/nflverse/nflverse-data/releases/download";

async function main() {
  /* ---- leikjaskra med linum ---- */
  const txt = await getText(`${REL}/schedules/games.csv`);
  const games = objects(txt, ["season", "week", "game_type", "away_team",
    "home_team", "spread_line", "total_line", "away_score", "home_score"])
    .filter((g) => SEASONS.includes(num(g.season)) && g.game_type === "REG"
                   && num(g.total_line) != null && num(g.spread_line) != null);

  /** season|week|team -> { implied, oppImplied } */
  const implied = new Map();
  for (const g of games) {
    const t = num(g.total_line), s = num(g.spread_line);
    const home = t / 2 + s / 2, away = t / 2 - s / 2;
    const k = (tm) => `${num(g.season)}|${num(g.week)}|${normTeam(tm)}`;
    implied.set(k(g.home_team), { implied: home, opp: away });
    implied.set(k(g.away_team), { implied: away, opp: home });
  }
  console.log(`linur: ${games.length} leikir, ${implied.size} lid-vikur`);

  /* ---- vikuleg leikmannagogn ---- */
  const weeks = [];
  for (const yr of SEASONS) {
    try {
      const rows = JSON.parse(await readFile(path.join(OUT, `weekly/${yr}.json`), "utf8"));
      weeks.push(...rows);
    } catch { console.log(`  (vantar weekly/${yr}.json — slepp)`); }
  }
  if (!weeks.length) {
    console.error("Engin vikuleg gogn. Keyrdu --stage=history fyrst.");
    process.exit(1);
  }
  console.log(`leikmanna-vikur: ${weeks.length}`);

  /* ---- grunnlina hvers leikmanns per timabil ---- */
  const byPlayerSeason = new Map();
  for (const r of weeks) {
    const k = `${r.id}|${r.season}`;
    const a = byPlayerSeason.get(k) || { pts: 0, n: 0 };
    a.pts += r.ppr; a.n++;
    byPlayerSeason.set(k, a);
  }

  /* ============================================================
     1. TEYGNI GAGNVART VAENTU STIGASKORI
     ============================================================
     Likan:  log(pts_iw / base_i) = e * log(implied_iw / BASE)
     Fittad gegnum nullpunkt per stodu.

     GRUNNLINAN ER LEAVE-ONE-OUT — vikan sjalf er dregin fra
     medaltalinu. An thess vaeri vikan i BADUM hlidum jofnunnar og
     teygnin maeldist of lag (sjalfsfylgni dregur i null).           */

  const MIN_GAMES = 8;
  const rows = [];
  for (const r of weeks) {
    if (!SEASONS.includes(r.season)) continue;
    const im = implied.get(`${r.season}|${r.week}|${r.team}`);
    if (!im || !im.implied || im.implied <= 0) continue;
    const a = byPlayerSeason.get(`${r.id}|${r.season}`);
    if (!a || a.n < MIN_GAMES) continue;
    const base = (a.pts - r.ppr) / (a.n - 1);     // leave-one-out
    if (base < 3) continue;                       // of litil framleidsla -> hlutfall springur
    if (r.ppr <= 0) continue;                     // log(0) — sja notu ad nedan
    rows.push({ pos: r.pos, y: Math.log(r.ppr / base),
                x: Math.log(im.implied / IMPLIED_BASE), season: r.season });
  }
  console.log(`teygni-urtak: ${rows.length} radir (>=${MIN_GAMES} leikir, grunnlina >=3)`);

  /* NULL-STIGA VIKUR ERU SLEPPT OG THAD ER SKEKKJA SEM VERDUR AD
     STANDA I SKJOLUM: log-likanid tekur ekki 0. Threr eru ~6% af
     radunum og their eru EKKI af handahofi — thaer eru oftar i
     leikjum med lagt vaent skor. Ad sleppa theim VANMETUR thvi
     teygnina. Talan sem kemur ut er thar med VARFAERIN, sem er retta
     attin ad skeika i thegar hun er notud sem margfaldari. */

  const elasticity = {};
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    const sub = rows.filter((r) => r.pos === pos);
    const e = fitThroughOrigin(sub);
    elasticity[pos] = e;
    console.log(`  ${pos}: e = ${e.beta.toFixed(3)}  (se ${e.se.toFixed(3)}, ` +
      `n ${e.n}, t ${(e.beta / e.se).toFixed(1)})`);
  }

  /* LOSO — er teygnin stodug milli ara eda er hun eitt ar? */
  console.log("\n  leave-one-season-out (RB):");
  const losoRb = [];
  for (const yr of SEASONS) {
    const e = fitThroughOrigin(rows.filter((r) => r.pos === "RB" && r.season !== yr));
    losoRb.push(e.beta);
    console.log(`    an ${yr}: ${e.beta.toFixed(3)}`);
  }
  const losoSpread = Math.max(...losoRb) - Math.min(...losoRb);
  console.log(`    bil: ${losoSpread.toFixed(3)} — ` +
    (losoSpread < 0.10 ? "stodug" : "OSTODUG, ekki treysta"));

  /* ============================================================
     2. VOG A "VORN GEGN STODU"
     ============================================================
     Spurningin er EKKI "fylgir vorn gegn stodu utkomunni" (thad gerir
     hun, afturvirkt) heldur "spair vorn gegn stodu ur FYRRI vikum
     theirri naestu". Thess vegna er hun reiknud UPP AD viku w og
     profud a viku w.

     Utkoman er sa margfaldari a leidrettinguna sem lágmarkar
     ferskekkju UTAN URTAKS. Ef besta vogin er ~0 tha ber merkid
     ekkert og liðurinn a ad fara ut.                                */

  const dw = fitDefenseWeight(weeks, byPlayerSeason, implied);
  console.log(`\nvorn gegn stodu — besta vog: ${dw.best.toFixed(2)} ` +
    `(RMSE ${dw.bestRmse.toFixed(4)} a moti ${dw.baseRmse.toFixed(4)} an lidar)`);
  for (const [w, r] of dw.curve) {
    console.log(`    w=${w.toFixed(2)}  RMSE ${r.toFixed(5)}${w === dw.best ? "  <-" : ""}`);
  }

  /* ============================================================
     3. FLEX-SKIPTING — hvada stodur enda i flex i raun
     ============================================================ */
  const flexFull = flexOccupancy(weeks, LEGACY_SHAPE);
  const flex = flexFull.shares;
  console.log(`\nflex-skipting (maeld 2020-2025, ${flexFull.n} flex-saeti i ` +
    `${flexFull.weeksSeen} vikum — 12 lid, WR3, EITT flex, full PPR):`);
  for (const [pos, v] of Object.entries(flex)) {
    console.log(`    ${pos}: ${(v * 100).toFixed(1)}%`);
  }

  /* ============================================================
     4. BOOM/BUST-THREP ur dreifingunni sjalfri
     ============================================================ */
  const thresholds = measureThresholds(weeks);
  console.log(`\nboom/bust-threp (p85 / p25 af vikum startera):`);
  for (const [pos, v] of Object.entries(thresholds)) {
    console.log(`    ${pos}: boom >= ${v.boom}  bust < ${v.bust}`);
  }

  const out = {
    generated: new Date().toISOString(),
    seasons: SEASONS,
    sample: { playerWeeks: weeks.length, elasticityRows: rows.length },
    elasticity, elasticityLoso: { RB: losoRb, spread: round3(losoSpread) },
    defenseWeight: { best: dw.best, curve: dw.curve, baseRmse: dw.baseRmse },
    flexSplit: flex,
    /* VIKMORKIN SEM TOLUNA VANTADI. `flexSplit` var EIN punkttala an
       nokkurs bils, i skra thar sem teygnin ber `se` og `n` og
       varnarvogin ber utan-urtaks-feril. Per-timabils-skiptingin var
       alltaf maelanleg med somu talningu og var einfaldlega ekki birt —
       og hun er STOR: TE-hlutur hleypur fra 0,130 til 0,352. */
    flexSplitPerSeason: flexFull.perSeason,
    flexSplitShape: { ...LEGACY_SHAPE, flexSlots: flexFull.flexSlots,
      startersUsed: flexFull.startersUsed,
      note: "12 lid, RB2/WR3/TE1, EITT flex, full PPR. HVORUG DEILD NOTANDANS " +
        "er thessi logun — sja data/measure/tesplit.json um somu talningu a " +
        "hans lognum (TE 0,073 og 0,083)" },
    thresholds,
  };
  await writeFile(path.join(OUT, "calibration.json"), JSON.stringify(out, null, 1));
  console.log(`\n-> data/calibration.json`);
}

/* ---------- minnstu kvadrat gegnum nullpunkt ---------- */
function fitThroughOrigin(rows) {
  let sxy = 0, sxx = 0;
  for (const r of rows) { sxy += r.x * r.y; sxx += r.x * r.x; }
  const beta = sxx ? sxy / sxx : 0;
  let sse = 0;
  for (const r of rows) { const e = r.y - beta * r.x; sse += e * e; }
  const varE = rows.length > 1 ? sse / (rows.length - 1) : 0;
  const se = sxx ? Math.sqrt(varE / sxx) : 0;
  return { beta: round3(beta), se: round3(se), n: rows.length };
}

/**
 * Prófar vogir a "vorn gegn stodu" UTAN URTAKS.
 * Vornin er reiknud ur vikum < w og profud a viku w.
 */
function fitDefenseWeight(weeks, byPlayerSeason, implied) {
  /* Bygg upp: fyrir hvert (season, team, pos) rúllandi medaltal
     stiga sem lidid gefur, ADEINS ur fyrri vikum. */
  const bySeason = new Map();
  for (const r of weeks) {
    if (!r.opp) continue;
    (bySeason.get(r.season) || bySeason.set(r.season, []).get(r.season)).push(r);
  }

  const samples = [];
  for (const [season, rows] of bySeason) {
    const maxWeek = Math.max(...rows.map((r) => r.week));
    // rullandi summa: opp|pos -> { pts, games:Set }
    const acc = new Map();
    const leagueAcc = new Map();
    for (let w = 1; w <= maxWeek; w++) {
      const thisWeek = rows.filter((r) => r.week === w);
      /* SPA fyrst (med thvi sem vid vissum FYRIR vikuna) ... */
      if (w >= 5) {
        for (const r of thisWeek) {
          const a = byPlayerSeason.get(`${r.id}|${r.season}`);
          if (!a || a.n < 8) continue;
          const base = (a.pts - r.ppr) / (a.n - 1);
          if (base < 3 || r.ppr <= 0) continue;
          const d = acc.get(`${r.opp}|${r.pos}`);
          const l = leagueAcc.get(r.pos);
          if (!d || !d.g || !l || !l.g) continue;
          const dAvg = d.pts / d.g, lAvg = l.pts / l.g;
          if (!lAvg) continue;
          const im = implied.get(`${r.season}|${r.week}|${r.team}`);
          samples.push({
            y: r.ppr / base,
            ratio: dAvg / lAvg,
            implied: im ? im.implied : null,
            pos: r.pos,
          });
        }
      }
      /* ... og BAETUM svo vikunni vid soguna. */
      for (const r of thisWeek) {
        const k = `${r.opp}|${r.pos}`;
        const a = acc.get(k) || { pts: 0, g: 0, weeks: new Set() };
        a.pts += r.ppr; if (!a.weeks.has(w)) { a.weeks.add(w); a.g++; }
        acc.set(k, a);
        const l = leagueAcc.get(r.pos) || { pts: 0, g: 0, weeks: new Set() };
        l.pts += r.ppr;
        const lk = `${r.opp}|${w}`;
        if (!l.weeks.has(lk)) { l.weeks.add(lk); l.g++; }
        leagueAcc.set(r.pos, l);
      }
    }
  }

  const curve = [];
  let best = 0, bestRmse = Infinity, baseRmse = 0;
  for (let w = 0; w <= 1.0001; w += 0.1) {
    let sse = 0;
    for (const s of samples) {
      const mult = 1 + (s.ratio - 1) * w;
      const e = s.y - mult;
      sse += e * e;
    }
    const rmse = Math.sqrt(sse / samples.length);
    curve.push([round2(w), round3(rmse)]);
    if (w === 0) baseRmse = rmse;
    if (rmse < bestRmse) { bestRmse = rmse; best = round2(w); }
  }
  return { best, bestRmse, baseRmse, curve, n: samples.length };
}

/* ============================================================
   FLEX-SKIPTINGIN VAR DREGIN UT — `scripts/lib/flex-occupancy.mjs`
   ============================================================
   `measureFlexSplit` bjo HER og var hardkodud a EINA logun: 12 lid,
   RB2/WR3/TE1, EITT flex, full PPR. Talan sem hun gaf — TE 0,193 — er
   i `src/model.js` og THADAN i varamanns-threp ALLRA deilda, lika
   theirra sem eru allt annad snid.

   HVORUG DEILD NOTANDANS ER SU LOGUN. Hun var thvi dregin ut svo
   SAMA TALNINGIN vaeri keyranleg a odrum lognum og per timabili
   (`vbdbase-lab --tesweep` gerir baedi). ADEINS FLUTT — kallid hér
   notar `LEGACY_SHAPE` og var sannreynt BITAEINS gegn gomlu
   utfaerslunni a somu gognum adur en hun var fjarlaegd.
   ============================================================ */

/** Threp ur dreifingu vikna hja theim sem eru raunverulega i byrjunarlidi. */
function measureThresholds(weeks) {
  const out = {};
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    const starters = { QB: 12, RB: 24, WR: 36, TE: 12 }[pos];
    const vals = [];
    const bySW = new Map();
    for (const r of weeks) {
      if (r.pos !== pos) continue;
      const k = `${r.season}|${r.week}`;
      (bySW.get(k) || bySW.set(k, []).get(k)).push(r);
    }
    for (const list of bySW.values()) {
      list.sort((a, b) => b.ppr - a.ppr);
      for (const r of list.slice(0, starters)) vals.push(r.ppr);
    }
    vals.sort((a, b) => a - b);
    out[pos] = {
      boom: Math.round(vals[Math.floor(vals.length * 0.85)]),
      bust: Math.round(vals[Math.floor(vals.length * 0.25)]),
      n: vals.length,
    };
  }
  return out;
}

const round2 = (x) => Math.round(x * 100) / 100;
const round3 = (x) => Math.round(x * 1000) / 1000;

main().catch((e) => { console.error(e); process.exit(1); });
