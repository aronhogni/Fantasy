#!/usr/bin/env node
/* ============================================================
   dst-lab.mjs — VORNIN: ER HAEGT AD RADA HENNI, EDA VERDUR AD STREYMA?

     node scripts/dst-lab.mjs

   -> data/measure/dst.json

   HVERS VEGNA THETTA ER TIL. Notandinn spilar i deild sem BYRJAR vorn
   og appid sagdi EKKERT um thad saeti — eitt af niu byrjunarsaetum var
   oradlagt. Sama rok og `kicker-lab.mjs`: thogn er ekki hlutleysi thegar
   akvordunin er ohjakvaemileg.

   EN SPURNINGIN ER EKKI „hvernig radum vid vornunum". Hun er:

     0. Er formulan yfirleitt RETT? (akkeri gegn tveimur ohadum
        Sleeper-heimildum, upp a stigid)
     1. Flyst arangur varnar milli ara? Innan timabils?
     2. Ef ekki — hvad spair tha? (motherjinn)
     3. Hvor akvordunin er staerri: **rod** eda **streymi**?

   Spurning 0 kemur fyrst af asettu radi. Persistence-tala reiknud ur
   rangri formulu er tala med utlit maelingar, sem er versta utkoman i
   thessu repo-i — og formulan HAFDI ranga tolu i fyrstu utgafu (bædi
   `def_fumbles_forced` og `fumble_recovery_tds` vantadi).

   HEIMILDIRNAR ERU THRJAR OG THAER ERU OHADAR:
     A. nflverse `stats_team_week_{ar}.csv` — hrafylkin (okkar hlid)
     B. Sleeper `stats/nfl/{ar}/{vika}?position[]=DEF` — theirra
        birtu DST-stig fyrir oll 32 lidin
     C. Sleeper `league/{id}/matchups/{vika}` — hvad RAUNVERULEG deild
        skoradi. Þetta er urslitaheimildin thvi B og C eru OSAMMALA
        (sja README 4k) og deildin er su sem notandinn spilar i.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getText, getJSON } from "./lib/http.mjs";
import { objects } from "./lib/csv.mjs";
import { stamp } from "./lib/provenance.mjs";
import { normTeam, NFL_TEAMS } from "../src/names.js";
import { BASE, dstPoints, dstPointsAllowed } from "../src/scoring.js";
import { impliedTeamTotals } from "../src/model.js";

const OUT = path.resolve(process.cwd(), "data");
const MEASURE = path.join(OUT, "measure");
const REL = "https://github.com/nflverse/nflverse-data/releases/download";
const SLEEPER = "https://api.sleeper.com";
const SLEEPER_V1 = "https://api.sleeper.app/v1";

/* Deildin sem akkerid er lesid ur — LOKID timabil, svo tolurnar
   breytast aldrei. Þetta er 2025-utgafa deildarinnar i README 4k. */
const ANCHOR_LEAGUE = process.env.DST_ANCHOR_LEAGUE || "1257117602308689920";
const ANCHOR_SEASON = 2025;
const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

/* Svidin sem DST tharf. Skrain er 138 dalkar; ad velja 21 sparar minnid
   og segir lesandanum hvad likanid les — sama regla og `WEEK_COLS`. */
const TEAM_COLS = [
  "season", "week", "team", "season_type", "opponent_team",
  "def_sacks", "def_interceptions", "def_tds", "def_safeties",
  "def_fumbles_forced", "def_punt_blocks", "def_pat_blocks", "def_fg_blocks",
  "fumble_recovery_opp", "fumble_recovery_tds", "special_teams_tds",
  "passing_tds", "rushing_tds", "fg_made", "pat_made",
  "passing_2pt_conversions", "rushing_2pt_conversions",
];

const num = (v) => {
  if (v == null || v === "" || v === "NA") return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const se = (a) => {
  if (a.length < 2) return null;
  const m = mean(a);
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1) / a.length);
};
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
function pearson(a, b) {
  const n = a.length, ma = mean(a), mb = mean(b);
  let s = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const u = a[i] - ma, v = b[i] - mb;
    s += u * v; da += u * u; db += v * v;
  }
  return da && db ? s / Math.sqrt(da * db) : 0;
}

/* ------------------------------------------------------------
   INNTOK
   ------------------------------------------------------------ */

async function teamWeeks(year) {
  const txt = await getText(`${REL}/stats_team/stats_team_week_${year}.csv`);
  return objects(txt, TEAM_COLS)
    .filter((r) => r.season_type === "REG")
    .map((r) => ({ ...r, team: normTeam(r.team), opp: normTeam(r.opponent_team),
                   week: Number(r.week), season: year }));
}

/**
 * Leikjaskra med lokastodu, ur `schedule_history.json` (2019-2025) og
 * `schedule.json` (yfirstandandi). BADAR eru lesnar af thvi ad hvorug
 * ein baer oll arin — og lidsheiti eru samraemd BADUM MEGIN. Fyrsta
 * utgafan samraemdi adeins nflverse-hlidina og tapadi 133 lidsvikum
 * thegjandi (`LA`/`LAR` og `OAK`/`LV`), sem er nakvaemlega su
 * skekkja sem `normTeam` er til fyrir.
 */
async function finals() {
  const out = new Map();
  const lines = new Map();
  for (const f of ["schedule_history.json", "schedule.json"]) {
    let raw;
    try { raw = JSON.parse(await readFile(path.join(OUT, f), "utf8")); }
    catch { continue; }
    const games = Array.isArray(raw) ? raw : (raw.games || []);
    for (const g of games) {
      if (g.type !== "REG") continue;
      const H = normTeam(g.home), A = normTeam(g.away);
      if (g.homeScore != null && g.awayScore != null) {
        out.set(`${g.season}|${g.week}|${H}`, g.awayScore);
        out.set(`${g.season}|${g.week}|${A}`, g.homeScore);
      }
      const t = impliedTeamTotals(g.total, g.spread);
      if (t.home != null) {
        lines.set(`${g.season}|${g.week}|${H}`, { own: t.home, opp: t.away });
        lines.set(`${g.season}|${g.week}|${A}`, { own: t.away, opp: t.home });
      }
    }
  }
  return { finals: out, lines };
}

/* ------------------------------------------------------------
   0. AKKERID
   ------------------------------------------------------------ */

async function sleeperDstWeek(season, week) {
  return getJSON(`${SLEEPER}/stats/nfl/${season}/${week}` +
    `?season_type=regular&position%5B%5D=DEF`);
}

async function anchor(built) {
  /* B — Sleeper's eigin birtu DST-stig. */
  const published = new Map(), rawStats = new Map();
  for (let w = 1; w <= 18; w++) {
    let rows;
    try { rows = await sleeperDstWeek(ANCHOR_SEASON, w); }
    catch (e) { console.log(`  ! Sleeper stats week ${w}: ${e.message}`); continue; }
    for (const r of rows || []) {
      const t = normTeam(r.player_id);
      published.set(`${w}|${t}`, (r.stats && r.stats.pts_std) || 0);
      rawStats.set(`${w}|${t}`, r.stats || {});
    }
  }
  /* C — hvad RAUNVERULEG deild skoradi. */
  const league = new Map();
  const teamIds = new Set(NFL_TEAMS);
  for (let w = 1; w <= 18; w++) {
    let mus;
    try { mus = await getJSON(`${SLEEPER_V1}/league/${ANCHOR_LEAGUE}/matchups/${w}`); }
    catch { continue; }
    for (const m of mus || []) {
      for (const [pid, pts] of Object.entries(m.players_points || {})) {
        const t = normTeam(pid);
        if (teamIds.has(t)) league.set(`${w}|${t}`, pts);
      }
    }
  }
  console.log(`  akkeri: ${published.size} birtar rodir, ${league.size} deildar-rodir`);

  /* Sleeper `stats`-endapunkturinn skorar `pts_allow_14_20` sem **0**;
     raunveruleg deild skorar hana **1**. Bæði eru maeld hér svo
     osamraemid se TALIÐ og ekki lesid sem villa i okkar formulu. */
  const PUBLISHED_RULES = {
    ...BASE,
    dstPtsAllowed: BASE.dstPtsAllowed.map(([hi, v]) => (hi === 20 ? [hi, 0] : [hi, v])),
  };

  function score(truth, R, label) {
    const got = [], calc = [];
    let exact = 0;
    for (const r of built) {
      if (r.season !== ANCHOR_SEASON) continue;
      const k = `${r.week}|${r.team}`;
      if (!truth.has(k)) continue;
      const p = dstPoints(r.row, R);
      if (p == null) continue;
      got.push(truth.get(k)); calc.push(p);
      if (Math.abs(p - truth.get(k)) < 1e-9) exact++;
    }
    if (!got.length) return null;
    const d = calc.map((x, i) => x - got[i]);
    const out = { label, n: got.length, r: r3(pearson(calc, got)),
      mae: r3(mean(d.map(Math.abs))), bias: r3(mean(d)),
      exact, exactPct: r3(100 * exact / got.length) };
    console.log(`  ${label.padEnd(34)} n=${out.n} r=${out.r} MAE=${out.mae} ` +
      `bias=${out.bias} exact=${out.exact} (${out.exactPct}%)`);
    return out;
  }

  console.log("\n0. AKKERI");
  const vsLeague = score(league, BASE, "vs real league (league rules)");
  const vsLeagueP = score(league, PUBLISHED_RULES, "vs real league (published rules)");
  const vsPub = score(published, PUBLISHED_RULES, "vs Sleeper stats (published rules)");
  const vsPubL = score(published, BASE, "vs Sleeper stats (league rules)");

  /* Hvers vegna skeikar thad sem skeikar. FLOKKAD, ekki kallad havadi. */
  const cls = new Map();
  for (const r of built) {
    if (r.season !== ANCHOR_SEASON) continue;
    const k = `${r.week}|${r.team}`;
    if (!published.has(k)) continue;
    const p = dstPoints(r.row, PUBLISHED_RULES);
    if (p == null) continue;
    const d = p - published.get(k);
    if (!d) continue;
    const s = rawStats.get(k) || {};
    const stFum = num(s.def_st_fum_rec);
    const sackD = num(r.row.def_sacks) - num(s.sack);
    const ffD = num(r.row.def_fumbles_forced) - (num(s.ff) + num(s.def_st_ff));
    let tag;
    if (stFum && d === stFum) tag = "special-teams fumble recovery scored 2, Sleeper scores 1";
    else if (d && sackD === d) tag = "sack count differs between nflverse and Sportradar";
    else if (d && ffD === d) tag = "forced-fumble count differs between nflverse and Sportradar";
    else tag = "unresolved";
    cls.set(tag, (cls.get(tag) || 0) + 1);
  }
  console.log("  leifin, flokkud:");
  for (const [t, c] of [...cls.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(c).padStart(3)}  ${t}`);
  }

  /* Osamraemid milli heimilda B og C, talid berum ordum. */
  let agree = 0; const bracketDelta = [];
  for (const [k, v] of league) {
    if (!published.has(k)) continue;
    const d = v - published.get(k);
    if (!d) agree++; else bracketDelta.push(d);
  }
  const h = new Map();
  for (const d of bracketDelta) h.set(d, (h.get(d) || 0) + 1);
  console.log(`  Sleeper vs sjalfan sig: ${agree} jafnar, ${bracketDelta.length} olikar ` +
    `-> ${[...h.entries()].map(([d, c]) => `${d > 0 ? "+" : ""}${d} x${c}`).join(", ")}`);

  return {
    vsLeague, vsLeaguePublishedRules: vsLeagueP,
    vsPublished: vsPub, vsPublishedLeagueRules: vsPubL,
    residualClasses: Object.fromEntries(cls),
    sleeperSelfDisagreement: { agree, differ: bracketDelta.length,
      deltas: Object.fromEntries(h),
      note: "Sleeper's stats endpoint scores pts_allow_14_20 as 0; a real " +
            "league scores it 1. The league is the authority." },
  };
}

/* ------------------------------------------------------------
   1-3. PERSISTENCE OG AKVORDUNIN
   ------------------------------------------------------------ */

function persistence(built) {
  const seas = new Map();
  for (const r of built) {
    const k = `${r.season}|${r.team}`;
    const a = seas.get(k) || { season: r.season, team: r.team, g: 0, pts: 0 };
    a.g++; a.pts += r.pts; seas.set(k, a);
  }
  for (const a of seas.values()) a.pg = a.pts / a.g;

  const A = [], B = [], pairs = [];
  for (let i = 1; i < YEARS.length; i++) {
    const a = [], b = [];
    for (const s of seas.values()) {
      if (s.season !== YEARS[i - 1]) continue;
      const t = seas.get(`${YEARS[i]}|${s.team}`);
      if (!t) continue;
      a.push(s.pg); b.push(t.pg); A.push(s.pg); B.push(t.pg);
    }
    pairs.push({ from: YEARS[i - 1], to: YEARS[i], n: a.length, r: r3(pearson(a, b)) });
  }
  const A2 = [], B2 = [];
  for (let i = 2; i < YEARS.length; i++) {
    for (const s of seas.values()) {
      if (s.season !== YEARS[i - 2]) continue;
      const t = seas.get(`${YEARS[i]}|${s.team}`);
      if (t) { A2.push(s.pg); B2.push(t.pg); }
    }
  }
  /* Halda their sig i topp-8? TILVILJUN ER 8/32 = 25% og hun er skrifud
     hér, thvi „44% halda ser" les eins og mikid an hennar. */
  let hits = 0, tot = 0;
  for (let i = 1; i < YEARS.length; i++) {
    const prev = [...seas.values()].filter((a) => a.season === YEARS[i - 1])
      .sort((a, b) => b.pg - a.pg).slice(0, 8).map((a) => a.team);
    const now = new Set([...seas.values()].filter((a) => a.season === YEARS[i])
      .sort((a, b) => b.pg - a.pg).slice(0, 8).map((a) => a.team));
    for (const t of prev) { tot++; if (now.has(t)) hits++; }
  }

  /* Innan timabils: stok-vika gegn slettri-viku, fyrri helmingur gegn
     seinni, og vika N gegn N+1. */
  const oddA = [], oddB = [], h1 = [], h2 = [], l1a = [], l1b = [];
  for (const y of YEARS) {
    const byTeam = new Map();
    for (const r of built) {
      if (r.season !== y) continue;
      if (!byTeam.has(r.team)) byTeam.set(r.team, []);
      byTeam.get(r.team).push(r);
    }
    for (const rs of byTeam.values()) {
      const o = rs.filter((r) => r.week % 2 === 1), e = rs.filter((r) => r.week % 2 === 0);
      if (o.length >= 4 && e.length >= 4) {
        oddA.push(mean(o.map((r) => r.pts))); oddB.push(mean(e.map((r) => r.pts)));
      }
      const f = rs.filter((r) => r.week <= 9), s = rs.filter((r) => r.week > 9);
      if (f.length >= 4 && s.length >= 4) {
        h1.push(mean(f.map((r) => r.pts))); h2.push(mean(s.map((r) => r.pts)));
      }
      rs.sort((a, b) => a.week - b.week);
      for (let i = 1; i < rs.length; i++) { l1a.push(rs[i - 1].pts); l1b.push(rs[i].pts); }
    }
  }
  const rOdd = pearson(oddA, oddB);

  const spread = [];
  for (const y of YEARS) {
    const s = [...seas.values()].filter((a) => a.season === y).sort((a, b) => b.pts - a.pts);
    if (s.length < 32) continue;
    spread.push({ season: y, best: s[0].team, dst1: r2(s[0].pts), dst12: r2(s[11].pts),
                  median: r2(s[16].pts), worst: r2(s[31].pts) });
  }
  const gains = [];
  for (let i = 1; i < YEARS.length; i++) {
    const prev = [...seas.values()].filter((a) => a.season === YEARS[i - 1])
      .sort((a, b) => b.pts - a.pts);
    const now = new Map([...seas.values()].filter((a) => a.season === YEARS[i])
      .map((a) => [a.team, a]));
    const base = mean([...now.values()].map((a) => a.pts));
    const t5 = prev.slice(0, 5).map((a) => now.get(a.team)).filter(Boolean);
    if (t5.length) gains.push(mean(t5.map((a) => a.pts)) - base);
  }

  const out = {
    yearOverYear: { n: A.length, r: r3(pearson(A, B)), pairs },
    lag2: { n: A2.length, r: r3(pearson(A2, B2)) },
    top8Repeat: { hits, of: tot, pct: r3(100 * hits / tot), chancePct: 25 },
    oddEven: { n: oddA.length, r: r3(rOdd),
               fullSeasonReliability: r3(2 * rOdd / (1 + rOdd)) },
    halves: { n: h1.length, r: r3(pearson(h1, h2)) },
    weekToWeek: { n: l1a.length, r: r3(pearson(l1a, l1b)) },
    spread,
    hindsightDst1MinusDst12: r2(mean(spread.map((s) => s.dst1 - s.dst12))),
    draftLastYearTop5: { gain: r2(mean(gains)), se: r2(se(gains)),
      t: r2(mean(gains) / se(gains)), years: gains.length,
      positive: gains.filter((v) => v > 0).length },
  };
  console.log("\n1. FLYST ARANGUR VARNAR?");
  console.log(`   milli ara      n=${out.yearOverYear.n} r=${out.yearOverYear.r}` +
    `   (spyrnumenn 0,16 · RB/WR 0,68-0,73)`);
  console.log(`   tveggja ara bil n=${out.lag2.n} r=${out.lag2.r}`);
  console.log(`   topp-8 halda ser ${out.top8Repeat.hits}/${out.top8Repeat.of} = ` +
    `${out.top8Repeat.pct}% (tilviljun 25%)`);
  console.log(`   stok/slett viku n=${out.oddEven.n} r=${out.oddEven.r}`);
  console.log(`   vika N -> N+1   n=${out.weekToWeek.n} r=${out.weekToWeek.r}` +
    `   <- naestum ekkert`);
  console.log(`   "draftadu topp-5 i fyrra" ${out.draftLastYearTop5.gain > 0 ? "+" : ""}` +
    `${out.draftLastYearTop5.gain} +- ${out.draftLastYearTop5.se} stig, ` +
    `t=${out.draftLastYearTop5.t}, ${out.draftLastYearTop5.positive}/` +
    `${out.draftLastYearTop5.years} ar`);
  return { out, seas };
}

/**
 * 2-3. ROD A MOTI STREYMI — GONGUM AFRAM.
 *
 * Hvert arm velur EFSTA (eda tvo efstu) kostinn hverja viku og fær thau
 * stig sem hann skoradi RAUNVERULEGA. Vidmidid er MEDALTAL theirra sem
 * spila thá viku — ekki allra 32, thvi lid i frii er ekki kostur.
 *
 * PLACEBO-FJOLSKYLDA fylgir med af sömu astaedu og i `opp-lab`: an
 * hennar er ekkert ad bera „+3,8" saman vid.
 */
function decision(built, seas, lines, score) {
  /* Stig sem MOTHERJINN hefur skorad THAD SEM AF ER — vikur < w, aldrei
     su sem er verid ad spa. Þetta er „linu-laus" utgafan af sama merki
     og hun er hofd med af ASETTU RADI: an hennar veit lesandi ekki hvort
     abatinn se veðbankalinan sjalf eda bara „andstaedingurinn hefur
     skorad litid", sem er okeypis og krefst engrar heimildar. */
  const scoredBy = new Map();
  for (const r of built) {
    const own = score.get(`${r.season}|${r.week}|${r.opp}`);   // motherjinn gaf OKKUR
    const mine = score.get(`${r.season}|${r.week}|${r.team}`); // vid gafum honum
    if (mine == null) continue;
    const k = `${r.season}|${r.opp}`;
    if (!scoredBy.has(k)) scoredBy.set(k, []);
    scoredBy.get(k).push({ week: r.week, pts: mine });
    void own;
  }
  const oppOffToDate = (season, team, week) => {
    const a = (scoredBy.get(`${season}|${team}`) || []).filter((x) => x.week < week);
    return a.length ? mean(a.map((x) => x.pts)) : null;
  };
  const seasonPg = (y, t) => {
    const a = seas.get(`${y}|${t}`);
    return a ? a.pts / a.g : null;
  };
  const toDate = new Map();
  for (const y of YEARS) {
    const byTeam = new Map();
    for (const r of built) {
      if (r.season !== y) continue;
      if (!byTeam.has(r.team)) byTeam.set(r.team, []);
      byTeam.get(r.team).push(r);
    }
    for (const [t, rs] of byTeam) {
      rs.sort((a, b) => a.week - b.week);
      let s = 0, n = 0;
      for (const r of rs) { toDate.set(`${y}|${r.week}|${t}`, n ? s / n : null); s += r.pts; n++; }
    }
  }
  const prevRank = new Map();
  for (const y of YEARS) {
    const s = [...seas.values()].filter((a) => a.season === y - 1)
      .sort((a, b) => b.pg - a.pg);
    s.forEach((x, i) => prevRank.set(`${y}|${x.team}`, i + 1));
  }
  const pool = built.map((r) => {
    const l = lines.get(`${r.season}|${r.week}|${r.team}`);
    return { ...r, oppImplied: l ? l.opp : null, ownImplied: l ? l.own : null,
      prevPg: seasonPg(r.season - 1, r.team),
      toDate: toDate.get(`${r.season}|${r.week}|${r.team}`) ?? null,
      prevRank: prevRank.get(`${r.season}|${r.team}`) ?? null,
      oppOffToDate: oppOffToDate(r.season, r.opp, r.week) };
  }).filter((r) => r.oppImplied != null && r.prevPg != null && r.toDate != null
                && r.oppOffToDate != null);

  let seed = 20260814;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  function arm(pick, k, filt) {
    const weeks = [];
    for (const y of YEARS) {
      for (let w = 1; w <= 18; w++) {
        let p = pool.filter((r) => r.season === y && r.week === w);
        if (filt) p = p.filter(filt);
        if (p.length < 8) continue;
        const base = mean(p.map((r) => r.pts));
        const sc = p.map((r) => ({ r, s: pick(r) })).filter((x) => x.s != null);
        if (sc.length < 8) continue;
        sc.sort((a, b) => b.s - a.s);
        weeks.push({ y, top: mean(sc.slice(0, k).map((x) => x.r.pts)), base });
      }
    }
    if (!weeks.length) return null;
    const d = weeks.map((x) => x.top - x.base);
    const byY = YEARS.map((y) => {
      const s = weeks.filter((x) => x.y === y);
      return s.length ? mean(s.map((x) => x.top - x.base)) : null;
    }).filter((v) => v != null);
    return { gain: r2(mean(d)), t: r2(mean(d) / se(d)), weeks: weeks.length,
      years: byY.length, positive: byY.filter((v) => v > 0).length,
      pickScores: r2(mean(weeks.map((x) => x.top))),
      baseline: r2(mean(weeks.map((x) => x.base))) };
  }
  const waiver = (r) => r.prevRank != null && r.prevRank > 12;
  const ARMS = {
    prevSeasonRank: (r) => r.prevPg,
    seasonToDate: (r) => r.toDate,
    stream: (r) => -r.oppImplied,
    ownImplied: (r) => r.ownImplied,
    oracle: (r) => r.pts,
  };
  ARMS.oppOffenseToDate = (r) => -r.oppOffToDate;
  const full = {}, wv = {};
  for (const [name, f] of Object.entries(ARMS)) {
    full[name] = arm(f, 1, null);
    wv[name] = arm(f, 1, waiver);
  }
  /* Blondun — spurningin „er rodin thess virdi OFAN A streymid?" */
  const zf = (v, a) => { const m = mean(a), s = Math.sqrt(mean(a.map((x) => (x - m) ** 2))); return s ? (v - m) / s : 0; };
  const oi = pool.map((r) => r.oppImplied), pp = pool.map((r) => r.prevPg);
  full.streamPlusRank = arm((r) => -zf(r.oppImplied, oi) + zf(r.prevPg, pp), 1, null);
  full.streamPlusHalfRank = arm((r) => -zf(r.oppImplied, oi) + 0.5 * zf(r.prevPg, pp), 1, null);
  /* ER LINAN SJALF MERKID, EDA BARA „HANN HEFUR SKORAD LITID"? */
  const oo = pool.map((r) => r.oppOffToDate);
  wv.streamPlusOppOffense = arm(
    (r) => -zf(r.oppImplied, oi) - zf(r.oppOffToDate, oo), 1, waiver);

  const placebo = [];
  for (let i = 0; i < 8; i++) { seed = 1000 + i * 7919; placebo.push(arm(() => rnd(), 1, waiver)); }

  /* Timabils-einvigi: halda bestu vorn fyrra ars gegn ad streyma. */
  const holdVsStream = [];
  for (const y of YEARS) {
    const cand = pool.filter((r) => r.season === y);
    if (!cand.length) continue;
    const teams = [...new Set(cand.map((r) => r.team))];
    const best = teams.map((t) => ({ t, pg: cand.find((r) => r.team === t).prevPg }))
      .sort((a, b) => b.pg - a.pg)[0];
    const hold = cand.filter((r) => r.team === best.t).reduce((a, r) => a + r.pts, 0);
    let str = 0;
    for (let w = 1; w <= 18; w++) {
      const p = cand.filter((r) => r.week === w);
      if (p.length < 8) continue;
      p.sort((a, b) => a.oppImplied - b.oppImplied);
      str += p[0].pts;
    }
    holdVsStream.push({ season: y, holdTeam: best.t, hold: r2(hold), stream: r2(str),
      delta: r2(str - hold) });
  }
  const hd = holdVsStream.map((x) => x.delta);

  console.log("\n2-3. ROD A MOTI STREYMI (efsti valinn, hverja viku)");
  const show = (label, v) => v && console.log(
    `   ${label.padEnd(30)} ${v.pickScores} gegn ${v.baseline}  delta ` +
    `${v.gain > 0 ? "+" : ""}${v.gain}  t=${v.t}  ${v.positive}/${v.years} ar`);
  console.log("   -- allar 32 varnir lausar --");
  show("rod: stig i fyrra", full.prevSeasonRank);
  show("rod: stig thad sem af er", full.seasonToDate);
  show("STREYMI: motherjinn", full.stream);
  show("eigid vaent skor", full.ownImplied);
  show("streymi + rod (z)", full.streamPlusRank);
  show("streymi + halfa rod (z)", full.streamPlusHalfRank);
  show("ORAKEL", full.oracle);
  console.log("   -- adeins their sem eru EFTIR (rod i fyrra > 12) --");
  show("rod: stig i fyrra", wv.prevSeasonRank);
  show("STREYMI: motherjinn", wv.stream);
  show("stig motherjans til thessa", wv.oppOffenseToDate);
  show("linan + stig motherjans (z)", wv.streamPlusOppOffense);
  show("ORAKEL", wv.oracle);
  console.log(`   placebo (8 slembin arm): medaltal ${r2(mean(placebo.map((p) => p.gain)))}, ` +
    `THAK ${r2(Math.max(...placebo.map((p) => p.gain)))}`);
  console.log("\n   timabil: halda bestu vorn fyrra ars gegn ad streyma");
  for (const x of holdVsStream) {
    console.log(`     ${x.season}: halda ${x.holdTeam} ${x.hold} · streyma ${x.stream} ` +
      `· delta ${x.delta > 0 ? "+" : ""}${x.delta}`);
  }
  console.log(`     medaltal ${r2(mean(hd))} +- ${r2(se(hd))}  t=${r2(mean(hd) / se(hd))}  ` +
    `${hd.filter((v) => v > 0).length}/${hd.length} timabil`);

  return { fullPool: full, waiverPool: wv,
    placebo: { arms: placebo.map((p) => p.gain), mean: r2(mean(placebo.map((p) => p.gain))),
      max: r2(Math.max(...placebo.map((p) => p.gain))) },
    holdVsStream: { seasons: holdVsStream, gain: r2(mean(hd)), se: r2(se(hd)),
      t: r2(mean(hd) / se(hd)), positive: hd.filter((v) => v > 0).length, years: hd.length },
    correlates: {
      oppImplied: r3(pearson(pool.map((r) => r.oppImplied), pool.map((r) => r.pts))),
      ownImplied: r3(pearson(pool.map((r) => r.ownImplied), pool.map((r) => r.pts))),
      prevSeasonPg: r3(pearson(pool.map((r) => r.prevPg), pool.map((r) => r.pts))),
      seasonToDate: r3(pearson(pool.map((r) => r.toDate), pool.map((r) => r.pts))),
      oppOffenseToDate: r3(pearson(pool.map((r) => r.oppOffToDate), pool.map((r) => r.pts))),
      actualPointsAllowed: r3(pearson(pool.map((r) => r.pa), pool.map((r) => r.pts))),
      n: pool.length },
  };
}

/* ------------------------------------------------------------ */

async function main() {
  console.log("=== DST-LAB ===");
  const { finals: score, lines } = await finals();
  console.log(`  leikjaskra: ${score.size} lidsleikir med lokastodu, ${lines.size} med linu`);

  const byKey = new Map(), raw = [];
  for (const y of YEARS) {
    const rs = await teamWeeks(y);
    for (const r of rs) { byKey.set(`${y}|${r.week}|${r.team}`, r); raw.push(r); }
    console.log(`  ${y}: ${rs.length} lidsvikur`);
  }

  /* Byggt EINU SINNI og notad i ollum kofflum — annars gaeti akkerid
     maelt adra tolu en persistence-in og bædi virst graen. */
  const built = [];
  let noPa = 0;
  for (const r of raw) {
    const opp = byKey.get(`${r.season}|${r.week}|${r.opp}`);
    const pa = dstPointsAllowed(score.get(`${r.season}|${r.week}|${r.team}`), opp);
    if (pa == null) { noPa++; continue; }
    const row = { ...r, points_allowed: pa };
    const pts = dstPoints(row, BASE);
    if (pts == null) { noPa++; continue; }
    built.push({ season: r.season, week: r.week, team: r.team, opp: r.opp,
                 pts, pa, row });
  }
  console.log(`  byggdar ${built.length} DST-lidsvikur (${noPa} an stiga a sig)`);
  if (built.length < 3000) throw new Error(`of faar rodir: ${built.length}`);

  const anc = await anchor(built);
  const { out: pers, seas } = persistence(built);
  const dec = decision(built, seas, lines, score);

  await mkdir(MEASURE, { recursive: true });
  await writeFile(path.join(MEASURE, "dst.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { anchorLeague: ANCHOR_LEAGUE, anchorSeason: ANCHOR_SEASON, years: YEARS },
      inputs: ["schedule.json", "schedule_history.json"], dataDir: OUT }),
    seasons: YEARS, teamWeeks: built.length,
    rules: { note: "BASE in src/scoring.js — the league's own settings win at " +
                   "runtime via dstRulesFromSettings", dstPtsAllowed: BASE.dstPtsAllowed },
    anchor: anc, persistence: pers, decision: dec,
  }, null, 1));
  console.log("\n-> data/measure/dst.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
