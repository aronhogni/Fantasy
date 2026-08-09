#!/usr/bin/env node
/* ============================================================
   market-lab.mjs — HVADA MARKADSTALA SPAIR BEST, OG HVE LENGI?

     node scripts/nfl/market-lab.mjs

   -> data-nfl/market_history.json

   nflverse ber forgjof og heildarlinu fyrir HVERN leik aftur til
   1999 og peningalinur fra 2006. Thad er ~6.900 leikir og ~115.000
   leikmanna-vikur — nogu langt til ad svara ekki bara "virkar
   markadurinn" heldur "HVAD i honum virkar, fyrir HVADA stodu, og
   hefur thad breyst".

   ADFERDIN: fyrir hverja leikmanna-viku er GRUNNLINA hans eigin
   medaltal thess timabils AN theirrar viku (leave-one-out). Sidan er
   maelt hversu mikid hver markadstala skyrir AFGANGINN — thad sem
   grunnlinan nadi ekki. Tala sem skyrir engan afgang ber engar
   upplysingar umfram thad sem vid vitum thegar um leikmanninn.

   ALLT ER WALK-FORWARD: studlar fittadir a arum a undan, maelt a
   arinu sjalfu. Ad fitta og maela a sama ari gaefi hverri einustu
   tolu falskt forskot.
   ============================================================ */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { getText, record, pool } from "./lib/http.mjs";
import { objects, num, str } from "./lib/csv.mjs";
import { offensePoints, normPos } from "../../src-nfl/scoring.js";
import { normTeam } from "../../src-nfl/names.js";
import { mean, spearman, bootstrapDiff } from "../../src-nfl/learn.js";

const OUT = path.resolve(process.cwd(), "data-nfl");
const REL = "https://github.com/nflverse/nflverse-data/releases/download";

/* 2006 er nedri mork thvi peningalinur byrja thar. Forgjof og
   heildarlina na aftur til 1999 og eru profadar ser i kafla 5. */
const FIRST = 2006, LAST = 2025;
const PPR = { passYd: 0.04, passTD: 4, passInt: -1, pass2pt: 2, rushYd: 0.1,
  rushTD: 6, rush2pt: 2, rec: 1, recBonusTE: 0, recYd: 0.1, recTD: 6, rec2pt: 2,
  fumbleLost: -2, fumbleRecTD: 6, specialTeamsTD: 6 };
const COLS = ["player_id", "player_display_name", "position", "season", "week",
  "season_type", "team", "opponent_team", "attempts", "passing_yards",
  "passing_tds", "passing_interceptions", "passing_2pt_conversions",
  "carries", "rushing_yards", "rushing_tds", "rushing_2pt_conversions",
  "receptions", "targets", "receiving_yards", "receiving_tds",
  "receiving_2pt_conversions", "fumbles_lost_total", "special_teams_tds",
  "fumble_recovery_tds", "sack_fumbles_lost", "rushing_fumbles_lost",
  "receiving_fumbles_lost"];

async function main() {
  /* ---------- 1. LINURNAR ---------- */
  const gtxt = await getText(`${REL}/schedules/games.csv`);
  const games = objects(gtxt, ["season", "week", "game_type", "away_team",
    "home_team", "spread_line", "total_line", "away_moneyline", "home_moneyline",
    "away_score", "home_score"]).filter((g) => g.game_type === "REG");

  /** season|week|team -> markadstolur fra sjonarhorni THESS lids */
  const mk = new Map();
  for (const g of games) {
    const y = num(g.season), w = num(g.week);
    const sp = num(g.spread_line), to = num(g.total_line);
    if (y == null || w == null || sp == null || to == null) continue;
    const hml = num(g.home_moneyline), aml = num(g.away_moneyline);
    const wp = winProbs(hml, aml);
    const put = (team, own, opp, spread, prob) => {
      mk.set(`${y}|${w}|${normTeam(team)}`, {
        implied: own, impliedOpp: opp, total: to, spread,
        winProb: prob, margin: own - opp,
      });
    };
    put(g.home_team, to / 2 + sp / 2, to / 2 - sp / 2, sp, wp.home);
    put(g.away_team, to / 2 - sp / 2, to / 2 + sp / 2, -sp, wp.away);
  }
  record("market_lines", mk.size > 8000, `${mk.size} team-weeks with a line`);

  /* ---------- 2. LEIKMANNA-VIKUR ---------- */
  const years = [];
  for (let y = FIRST; y <= LAST; y++) years.push(y);
  const rows = [];
  await pool(years, 3, async (yr) => {
    try {
      const t = await getText(`${REL}/stats_player/stats_player_week_${yr}.csv`);
      for (const r of objects(t, COLS)) {
        if (r.season_type !== "REG") continue;
        const pos = normPos(r.position);
        if (!["QB", "RB", "WR", "TE"].includes(pos)) continue;
        const v = {};
        for (const k of COLS) {
          v[k] = ["player_id", "player_display_name", "position", "season_type",
                  "team", "opponent_team"].includes(k) ? str(r[k]) : num(r[k]);
        }
        rows.push({
          id: v.player_id, pos, season: yr, week: v.week,
          team: normTeam(v.team), opp: normTeam(v.opponent_team),
          ppr: offensePoints(v, PPR, pos),
        });
      }
      record(`weeks_${yr}`, true, `${yr} loaded`);
    } catch (e) { record(`weeks_${yr}`, false, `failed: ${e.message}`); }
  });
  console.log(`leikmanna-vikur: ${rows.length}`);

  /* ---------- 3. GRUNNLINA (leave-one-out) ---------- */
  const agg = new Map();
  for (const r of rows) {
    const k = `${r.id}|${r.season}`;
    const a = agg.get(k) || { pts: 0, n: 0 };
    a.pts += r.ppr; a.n++;
    agg.set(k, a);
  }
  const MIN_G = 8;
  const sample = [];
  for (const r of rows) {
    const a = agg.get(`${r.id}|${r.season}`);
    if (!a || a.n < MIN_G) continue;
    const base = (a.pts - r.ppr) / (a.n - 1);
    if (base < 4) continue;                 // of litil framleidsla -> hlutfall springur
    const m = mk.get(`${r.season}|${r.week}|${r.team}`);
    if (!m) continue;
    sample.push({ ...r, base, ...m, resid: r.ppr - base });
  }
  console.log(`urtak: ${sample.length} leikmanna-vikur med linu og grunnlinu`);

  /* ---------- 4. HVADA MERKI SKYRIR AFGANGINN? ---------- */
  const SIGNALS = [
    { key: "implied", label: "Implied points for his own team",
      get: (s) => s.implied,
      note: "total/2 +/- spread/2. Klassiska talan." },
    { key: "total", label: "Game total (over/under)",
      get: (s) => s.total,
      note: "Hversu morg stig i leiknum alls, an thess ad vita hvor skorar." },
    { key: "spread", label: "His team's spread",
      get: (s) => s.spread,
      note: "Jakvaett = lidid hans er favorit." },
    { key: "impliedOpp", label: "Implied points for the OPPONENT",
      get: (s) => s.impliedOpp,
      note: "Vorn andstaedingsins ad mati markadarins — og leikstada." },
    { key: "margin", label: "Implied margin (his team minus opponent)",
      get: (s) => s.margin, note: "Hversu mikid lidid hans a ad vinna." },
    { key: "winProb", label: "Win probability from the moneyline",
      get: (s) => s.winProb, note: "Afvigadar sigurlikur. Adeins 2006+." },
  ];

  const POS = ["QB", "RB", "WR", "TE"];
  const results = [];
  for (const sig of SIGNALS) {
    const row = { key: sig.key, label: sig.label, note: sig.note, pos: {}, era: {} };
    for (const p of POS) {
      const sub = sample.filter((s) => s.pos === p && sig.get(s) != null);
      if (sub.length < 2000) continue;
      row.pos[p] = scoreSignal(sub, sig.get);
    }
    /* Hefur thetta breyst? Thrju timabil, jafn long. */
    for (const [name, lo, hi] of [["2006-2012", 2006, 2012],
                                  ["2013-2019", 2013, 2019],
                                  ["2020-2025", 2020, 2025]]) {
      const sub = sample.filter((s) => s.season >= lo && s.season <= hi &&
                                       sig.get(s) != null && s.pos !== "QB");
      if (sub.length < 2000) continue;
      row.era[name] = scoreSignal(sub, sig.get);
    }
    results.push(row);
  }

  /* ---------- 5. MARKADUR GEGN TOLFRAEDI I SOMU SPURNINGU ----------
     "Hvada vorn er godur andstaedingur?" ma svara med markadinum
     (vaent stig andstaedingsins) EDA med tolfraedi (hvad hann hefur
     raunverulega gefid theirri stodu THAD SEM AF ER). Beint einvigi. */
  const headToHead = defenseHeadToHead(sample);

  /* ---------- 6. HVE LANGT AFTUR VIRKAR THETTA? ---------- */
  const byYear = {};
  for (let y = FIRST; y <= LAST; y++) {
    const sub = sample.filter((s) => s.season === y && s.pos !== "QB");
    if (sub.length < 500) continue;
    byYear[y] = round3(corr(sub.map((s) => s.implied), sub.map((s) => s.resid)));
  }

  /* ---------- PRENTUN ---------- */
  console.log(`\n${"=".repeat(94)}`);
  console.log(`  HVADA MARKADSTALA SPAIR BEST — ${FIRST}-${LAST}, ${sample.length} leikmanna-vikur`);
  console.log("=".repeat(94));
  console.log("  fylgni vid AFGANG (thad sem grunnlina leikmannsins nadi ekki)");
  console.log("  merki                                       QB      RB      WR      TE");
  for (const r of results.slice().sort((a, b) =>
    (b.pos.RB ? b.pos.RB.r : -9) - (a.pos.RB ? a.pos.RB.r : -9))) {
    console.log(`  ${r.label.slice(0, 42).padEnd(44)}` +
      POS.map((p) => (r.pos[p] ? r.pos[p].r.toFixed(3) : "   -  ").padStart(7)).join(" "));
  }

  console.log(`\n  hlutfall stadalfraviks sem merkid tekur (RB+WR+TE):`);
  console.log("  merki                                    2006-12  2013-19  2020-25");
  for (const r of results) {
    const e = r.era;
    if (!Object.keys(e).length) continue;
    console.log(`  ${r.label.slice(0, 40).padEnd(42)}` +
      ["2006-2012", "2013-2019", "2020-2025"].map((k) =>
        (e[k] ? (e[k].r).toFixed(3) : "   -  ").padStart(8)).join(" "));
  }

  console.log(`\n${"=".repeat(94)}`);
  console.log("  MARKADUR GEGN TOLFRAEDI: hvor segir betur hver er godur andstaedingur?");
  console.log("=".repeat(94));
  for (const [k, v] of Object.entries(headToHead)) {
    console.log(`  ${k.padEnd(46)} r = ${v == null ? "-" : v.toFixed(4)}`);
  }

  console.log(`\n  fylgni vaentra stiga vid afgang, ar fyrir ar:`);
  const ys = Object.keys(byYear);
  for (let i = 0; i < ys.length; i += 10) {
    console.log("   " + ys.slice(i, i + 10).map((y) =>
      `${y} ${byYear[y].toFixed(2)}`).join("  "));
  }
  const early = ys.filter((y) => +y <= 2015).map((y) => byYear[y]);
  const late = ys.filter((y) => +y > 2015).map((y) => byYear[y]);
  console.log(`\n  medaltal 2006-2015: ${mean(early).toFixed(3)}   ` +
    `2016-2025: ${mean(late).toFixed(3)}`);
  const stab = bootstrapDiff(
    Object.fromEntries(ys.filter((y) => +y > 2015).map((y) => [y, byYear[y]])),
    Object.fromEntries(ys.filter((y) => +y <= 2015).map((y) => [y, byYear[y]])));
  console.log(stab && stab.excludesZero
    ? `  -> merkid HEFUR breyst (${stab.diff.toFixed(3)}, [${stab.lo.toFixed(3)}, ${stab.hi.toFixed(3)}])`
    : `  -> engin marktaek breyting milli timabila — merkid er STODUGT i 20 ar`);

  await writeFile(path.join(OUT, "market_history.json"), JSON.stringify({
    generated: new Date().toISOString(),
    seasons: [FIRST, LAST], sampleSize: sample.length,
    signals: results, defenseHeadToHead: headToHead, byYear,
    stability: stab,
  }, null, 1));
  console.log(`\n-> data-nfl/market_history.json`);
}

/**
 * Maelir hversu vel eitt merki skyrir afganginn.
 * `r`  fylgni merkis vid afgang (thad sem grunnlinan nadi ekki)
 * `rho` sama a rodum — otaemari fyrir utlaga
 * `lift` hlutfallsleg minnkun ferskekkju thegar linulegur lidur er
 *        bætt vid, WALK-FORWARD (studull ur fyrri arum).
 */
function scoreSignal(sub, get) {
  const x = sub.map(get), y = sub.map((s) => s.resid);
  const r = corr(x, y);

  /* Walk-forward lyfting: fyrir hvert ar er studull fittadur a ollum
     fyrri arum og profadur a arinu. Fyrsta arid er sleppt. */
  const years = [...new Set(sub.map((s) => s.season))].sort();
  let sseBase = 0, sseSig = 0, n = 0;
  for (let i = 1; i < years.length; i++) {
    const tr = sub.filter((s) => s.season < years[i]);
    const te = sub.filter((s) => s.season === years[i]);
    if (tr.length < 500 || !te.length) continue;
    const mx = mean(tr.map(get));
    let sxy = 0, sxx = 0;
    for (const s of tr) { const d = get(s) - mx; sxy += d * s.resid; sxx += d * d; }
    const b = sxx ? sxy / sxx : 0;
    for (const s of te) {
      const pred = b * (get(s) - mx);
      sseBase += s.resid ** 2;
      sseSig += (s.resid - pred) ** 2;
      n++;
    }
  }
  return {
    r: round3(r), rho: round3(spearman(x, y)),
    lift: n ? round4(1 - sseSig / sseBase) : null,
    n: sub.length,
  };
}

/**
 * Beint einvigi um somu spurningu: hvor spair betur hvad leikmadur
 * gerir gegn thessum andstaedingi — markadurinn eda tolfraedin?
 *
 * Tolfraedin er reiknud AD viku w (rullandi), aldrei med henni.
 */
function defenseHeadToHead(sample) {
  const bySeason = new Map();
  for (const s of sample) {
    (bySeason.get(s.season) || bySeason.set(s.season, []).get(s.season)).push(s);
  }
  const rows = [];
  for (const [, list] of bySeason) {
    const maxW = Math.max(...list.map((s) => s.week));
    const acc = new Map();      // opp|pos -> { pts, g:Set }
    for (let w = 1; w <= maxW; w++) {
      const wk = list.filter((s) => s.week === w);
      if (w >= 5) {
        for (const s of wk) {
          const d = acc.get(`${s.opp}|${s.pos}`);
          if (!d || d.weeks.size < 4) continue;
          rows.push({
            resid: s.resid,
            statAllowed: d.pts / d.weeks.size,
            marketOpp: s.impliedOpp,
            pos: s.pos,
          });
        }
      }
      for (const s of wk) {
        const k = `${s.opp}|${s.pos}`;
        const a = acc.get(k) || { pts: 0, weeks: new Set() };
        a.pts += s.ppr; a.weeks.add(w);
        acc.set(k, a);
      }
    }
  }
  if (rows.length < 2000) return {};
  return {
    "market: opponent implied points":
      round4(corr(rows.map((r) => r.marketOpp), rows.map((r) => r.resid))),
    "stats: points that defence has allowed this position so far":
      round4(corr(rows.map((r) => r.statAllowed), rows.map((r) => r.resid))),
    "sample": rows.length,
  };
}

function corr(a, b) {
  const n = a.length;
  const ma = mean(a), mb = mean(b);
  let s = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const u = a[i] - ma, v = b[i] - mb;
    s += u * v; da += u * u; db += v * v;
  }
  return da && db ? s / Math.sqrt(da * db) : 0;
}

/** Peningalinur -> afvigadar sigurlikur. */
function winProbs(hml, aml) {
  const p = (ml) => {
    if (ml == null) return null;
    return ml > 0 ? 100 / (ml + 100) : -ml / (-ml + 100);
  };
  const h = p(hml), a = p(aml);
  if (h == null || a == null) return { home: null, away: null };
  const s = h + a;
  return s > 0 ? { home: h / s, away: a / s } : { home: null, away: null };
}

const round3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const round4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);

main().catch((e) => { console.error(e); process.exit(1); });
