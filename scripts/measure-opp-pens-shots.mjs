/* ============================================================
   THRJU MERKI SEM VORU ALDREI MAELD (25.8.2026, handvirk skrifta)

   Keyrsla:  node scripts/measure-opp-pens-shots.mjs
             node scripts/measure-opp-pens-shots.mjs --json /tmp/three.json

   ATHUGASEMDIR A ISLENSKU (rokstudningur, CLAUDE.md kafli 9);
   ALLIR PRENTADIR STRENGIR A ENSKU — sama snid og measure-exp-points-v2.mjs.

   `scripts/measure-exp-points-v2.mjs` maeldi SEX tilgatur og felldi allar.
   THRJU merki sem eigandinn nefndi voru ALDREI maeld:

     (a) MEIDSLI I LIDI MOTHERJANS — lyftir veiklad motherjalid stigum?
     (b) VITASPYRNUR liða og VITA-TILHNEIGING DOMARANS
         (domara-SPJOLD voru maeld 9.8.2026 og felld; viti er ONNUR staerd)
     (c) HRAR SKOTATOLUR sem lidur i vaentum stigum
         (`shots_in_box` var fellt OFAN A xG+xA; hratt skotamagn aldrei reynt)

   SAMTHYKKTAR-STADALLINN (CLAUDE.md kafli 4): bootstrap KLASAD PER
   LEIKMANN, 400 itranir, fast frae 7, og lidur telst virka ADEINS ef CI
   UTILOKAR NULL. Punktmat er ekki nidurstada.

   LEKI ER ADALHAETTAN. Thar sem merki er ADEINS reiknanlegt eftir a er
   thad merkt ORACLE og lesid sem THAK, ekki sem nothaeft merki — sama og
   `measure-rival-out.mjs` gerir.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { buildPanel, BASE_FEATURES, fitRidge, mean, sd } from "../tests/lib/panel2.mjs";
import { corr, loadSeason, SEASONS as E0_SEASONS } from "../tests/lib/e0.mjs";
import { bootstrapCI, byPlayer, ci } from "./start-panel.mjs";
import { IN_BOX_X } from "../src/bsd.js";

const D = new URL("../data/", import.meta.url).pathname;
const OUT = {};
const argJson = process.argv.indexOf("--json");
const line = (c = "-", n = 78) => console.log(c.repeat(n));
const head = t => { console.log(""); line("="); console.log(t); line("="); };
const sub = t => { console.log(""); console.log(t); line("-"); };
const pct = (a, b) => `${(100 * a / (b || 1)).toFixed(1)}%`;

const SEASN = ["2122", "2223", "2324", "2425", "2526"];
const LIVE = "2526";

/* ============================================================
   TOL — sama utfaersla og measure-exp-points-v2.mjs notar. Ekki afrita
   formulur; flytja inn. (CLAUDE.md kafli 7: handafrit af buildTeamMetrics
   skrifadi NaN a 17 lid og merkti thad sem maelingu.)
   ============================================================ */
const design = (r, feats) => { const x = [1]; for (const f of feats) x.push(r[f] ?? 0); return x; };

function losoPredict(rows, feats, lambda = 1e-3) {
  const out = new Array(rows.length).fill(0);
  for (const s of SEASN) {
    const tr = [], te = [];
    for (let i = 0; i < rows.length; i++) (rows[i].season === s ? te : tr).push(i);
    if (!tr.length || !te.length) continue;
    const w = fitRidge(tr.map(i => design(rows[i], feats)), tr.map(i => rows[i].pts), lambda);
    for (const i of te) {
      const x = design(rows[i], feats);
      let v = 0; for (let j = 0; j < x.length; j++) v += x[j] * w[j];
      out[i] = v;
    }
  }
  return out;
}
/* Tima-heidarleg skipting INNAN eins timabils (BSD a bara 2025/26). */
function splitPredict(rows, feats, cut = 19, lambda = 1e-3) {
  const tr = [], te = [];
  rows.forEach((r, i) => (r.round <= cut ? tr : te).push(i));
  const w = fitRidge(tr.map(i => design(rows[i], feats)), tr.map(i => rows[i].pts), lambda);
  const out = new Array(rows.length).fill(null);
  for (const i of te) {
    const x = design(rows[i], feats);
    let v = 0; for (let j = 0; j < x.length; j++) v += x[j] * w[j];
    out[i] = v;
  }
  return { pred: out, testIx: te };
}
const maeOf = (rows, pred) => mean(rows.map((r, i) => Math.abs(pred[i] - r.pts)));
const rOf = (rows, pred) => corr(pred, rows.map(r => r.pts));

function top15Groups(rows, pred) {
  const byGw = new Map();
  rows.forEach((r, i) => {
    const k = `${r.season}|${r.round}`;
    (byGw.get(k) || byGw.set(k, []).get(k)).push(i);
  });
  const g = [];
  for (const ix of byGw.values()) {
    if (ix.length < 30) continue;
    g.push(mean([...ix].sort((a, b) => pred[b] - pred[a]).slice(0, 15).map(i => rows[i].pts)));
  }
  return g;
}
/* TOM LAUG GEFUR EKKI 0 — hun gefur ENGA TOLU. `mean([])` er NaN og
   `NaN.toFixed(3)` prentar "NaN"; fyrri utgafa thessarar linu let
   siadan hop (faerri en 30 radir i umferd) lita ut fyrir ad hafa
   maelst 0,000. Tomt gildi er ekki null (CLAUDE.md kafli 8).           */
const top15 = (rows, pred) => { const g = top15Groups(rows, pred); return g.length ? mean(g) : null; };
function report(label, rows, pred, base) {
  const m = { r: rOf(rows, pred), mae: maeOf(rows, pred), top: top15(rows, pred) };
  const t15 = m.top == null ? "  n/a " : m.top.toFixed(3);
  const dTop = (m.top == null || base?.top == null) ? "  n/a "
    : (m.top - base.top >= 0 ? "+" : "") + (m.top - base.top).toFixed(3);
  const d = base ? `   dr ${(m.r - base.r >= 0 ? "+" : "") + (m.r - base.r).toFixed(4)}` +
                   `  dMAE ${(m.mae - base.mae >= 0 ? "+" : "") + (m.mae - base.mae).toFixed(4)}` +
                   `  dtop15 ${dTop}` : "";
  console.log(`  ${label.padEnd(44)} r ${m.r.toFixed(4)}  MAE ${m.mae.toFixed(4)}  top15 ${t15}${d}`);
  return m;
}
function deltaRowCI(rows, predA, predB, kind) {
  const packed = rows.map((r, i) => ({ code: r.name, y: r.pts, a: predA[i], b: predB[i] }));
  const clusters = byPlayer(packed);
  const stat = kind === "mae"
    ? xs => mean(xs.map(x => Math.abs(x.a - x.y))) - mean(xs.map(x => Math.abs(x.b - x.y)))
    : xs => corr(xs.map(x => x.b), xs.map(x => x.y)) - corr(xs.map(x => x.a), xs.map(x => x.y));
  return bootstrapCI(clusters, stat);
}
function deltaTop15CI(rows, predA, predB) {
  const ga = top15Groups(rows, predA), gb = top15Groups(rows, predB);
  const clusters = ga.map((v, i) => [{ d: gb[i] - v }]);
  return bootstrapCI(clusters, xs => mean(xs.map(x => x.d)));
}
function verdict(name, rows, predA, predB) {
  const cr = deltaRowCI(rows, predA, predB, "r");
  const cm = deltaRowCI(rows, predA, predB, "mae");
  const ct = deltaTop15CI(rows, predA, predB);
  console.log(`    ${name}`);
  console.log(`      d r      ${ci(cr)}`);
  console.log(`      d MAE-   ${ci(cm)}   (positive = candidate has LOWER MAE)`);
  console.log(`      d top15  ${ci(ct, 3)}   (POINTS per player per gameweek)`);
  return { r: cr, mae: cm, top: ct };
}
/* Siud laug: topp-15 breytir MERKINGU sinni undir siun (lib/panel2 regla 1),
   svo undirhopar fa adeins r og MAE. */
function verdictRows(name, rows, predA, predB) {
  const cr = deltaRowCI(rows, predA, predB, "r");
  const cm = deltaRowCI(rows, predA, predB, "mae");
  console.log(`    ${name}`);
  console.log(`      d r      ${ci(cr)}`);
  console.log(`      d MAE-   ${ci(cm)}   (positive = candidate has LOWER MAE)`);
  console.log("      (no top-15 here: filtering the pool changes what top-15 MEANS)");
  return { r: cr, mae: cm, top: null };
}

/* INNAN-LEIKMANNS HALLI I STIGUM. Punktmatid sjalft er svarid vid
   "hvad kostar/gefur thetta MORG STIG", sem CI a r getur ekki sagt.     */
function withinPlayerSlope(rows, xKey, minRows = 5, yKey = "pts") {
  const by = new Map();
  for (const r of rows) {
    if (r[xKey] == null || r[yKey] == null) continue;
    (by.get(r.name) || by.set(r.name, []).get(r.name)).push(r);
  }
  const clusters = [];
  for (const arr of by.values()) {
    if (arr.length < minRows) continue;
    const mx = mean(arr.map(r => r[xKey])), my = mean(arr.map(r => r[yKey]));
    clusters.push(arr.map(r => ({ x: r[xKey] - mx, y: r[yKey] - my })));
  }
  const stat = xs => {
    let sxy = 0, sxx = 0;
    for (const p of xs) { sxy += p.x * p.y; sxx += p.x * p.x; }
    return sxx > 0 ? sxy / sxx : NaN;
  };
  return { ci: bootstrapCI(clusters, stat), players: clusters.length,
           n: clusters.reduce((a, c) => a + c.length, 0) };
}

/* ============================================================
   KAFLI 0 — BIRGDATALNING. Hun er prentud ADUR en nokkud er maelt, thvi
   "merkid er ekki til i gognunum" er GILD nidurstada og ma ekki hverfa
   inni i maelingu sem var keyrd samt.
   ============================================================ */
head("SECTION 0 - INVENTORY (what is actually committed in data/)");

const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
console.log(`  fpl_player_gw.json    seasons ${Object.keys(PG.seasons).join(", ")}`);
for (const s of SEASN) console.log(`      ${s}: ${PG.seasons[s].length} player-match rows`);
console.log(`      fields: ${PG.header.join(",")}`);
console.log("      -> carries pMiss (penalties missed) and pSave (penalties saved),");
console.log("         but NOT penalties scored/awarded. Penalty COUNT is not derivable.");
console.log("      -> carries NO availability/status/news field. No injury history.");

sub("  football-data.co.uk (data/fdcouk/E0-*.json)");
{
  const cols = {};
  let seasons = 0;
  for (const s of E0_SEASONS) {
    const rows = loadSeason(s);
    if (!rows.length) continue;
    seasons++;
    for (const c of Object.keys(rows[0])) cols[c] = (cols[c] || 0) + 1;
  }
  const penCols = Object.keys(cols).filter(c => /pen/i.test(c));
  console.log(`      ${seasons} seasons, 380 matches each, Referee present in ${cols.Referee || 0}`);
  console.log(`      match-stat columns: HS,AS,HST,AST,HF,AF,HC,AC,HY,AY,HR,AR`);
  console.log(`      PENALTY COLUMNS: ${penCols.length ? penCols.join(",") : "NONE (zero, in every season)"}`);
  OUT.e0 = { seasons, penaltyColumns: penCols };
}

sub("  data/history/  (the only per-day snapshot in the repo)");
{
  const fs = readFileSync(`${D}history/2026-07-25.json`, "utf8");
  const one = JSON.parse(fs);
  const days = new Set();
  for (const f of (await import("node:fs")).readdirSync(`${D}history`)) days.add(f);
  console.log(`      ${days.size} files, first ${[...days].sort()[0]}, last ${[...days].sort().at(-1)}`);
  console.log(`      fields per row: ${Object.keys(one[0]).join(",")}`);
  console.log("      -> PRICE only. No status, no chance_of_playing, no news. And it starts");
  console.log("         2026-07-25, i.e. this preseason - it spans NO completed gameweek.");
  OUT.history = { files: days.size, fields: Object.keys(one[0]) };
}

sub("  BSD shot map (data/bsd_shots.json)");
const SH = JSON.parse(readFileSync(`${D}bsd_shots.json`, "utf8"));
const SF = Object.fromEntries(SH.legend.fields.map((f, i) => [f, i]));
const TSHORT = SH.legend.teams;
const PEN_SIT = SH.legend.sit.indexOf("penalty");
{
  const pens = SH.shots.filter(s => s[SF.sit] === PEN_SIT);
  console.log(`      season ${SH.season} ONLY. ${SH.shots.length} shots, ${pens.length} penalties.`);
  console.log(`      penalties with null team ${pens.filter(s => s[SF.team] == null).length}` +
    `, null opp ${pens.filter(s => s[SF.opp] == null).length}` +
    `, null shooter code ${pens.filter(s => s[SF.code] == null).length}`);
  console.log(`      shots with null shooter code: ${SH.shots.filter(s => s[SF.code] == null).length}` +
    ` (${pct(SH.shots.filter(s => s[SF.code] == null).length, SH.shots.length)})`);
  console.log(`      distinct shooter codes: ${new Set(SH.shots.map(s => s[SF.code]).filter(c => c != null)).size}`);
  OUT.bsd = { season: SH.season, shots: SH.shots.length, penalties: pens.length };
}

/* ============================================================
   KAFLI 1 — SAMSKEYTINGIN OG PANELID
   ============================================================ */
head("SECTION 1 - JOIN AND PANEL");
const OPP = new Map();                 // `${season}|${date}|${team}` -> {opp, home}
const REF = new Map();                 // `${season}|${date}|${team}` -> referee
{
  let tot = 0, hit = 0, homeAgree = 0;
  for (const s of SEASN) {
    for (const r of loadSeason(s)) {
      OPP.set(`${s}|${r.Date}|${r.HomeTeam}`, { opp: r.AwayTeam, home: 1 });
      OPP.set(`${s}|${r.Date}|${r.AwayTeam}`, { opp: r.HomeTeam, home: 0 });
      REF.set(`${s}|${r.Date}|${r.HomeTeam}`, r.Referee);
      REF.set(`${s}|${r.Date}|${r.AwayTeam}`, r.Referee);
    }
    for (const q of PG.seasons[s] || []) {
      tot++;
      const f = OPP.get(`${s}|${q[H.date]}|${q[H.team]}`);
      if (f) { hit++; if (f.home === q[H.home]) homeAgree++; }
    }
  }
  console.log(`  player-match rows ${tot}  joined ${hit} (${pct(hit, tot)})  home agrees ${pct(homeAgree, hit)}`);
  OUT.join = { rows: tot, joined: hit, homeAgree };
}

const POOL = { A: buildPanel({ includeBlanks: false }), B: buildPanel({ includeBlanks: true }) };
for (const [k, rows] of Object.entries(POOL)) {
  for (const r of rows) {
    const f = OPP.get(`${r.season}|${r.date}|${r.team}`);
    r.opp = f ? f.opp : null;
    r.ref = REF.get(`${r.season}|${r.date}|${r.team}`) || null;
  }
  console.log(`  POOL ${k}: ${rows.length} rows, ${rows.filter(r => !r.opp).length} without opponent`);
}
console.log("  POOL A = mins>0 ('how many points IF he features'); POOL B = all rows ('who to pick').");

/* ============================================================
   KAFLI 2 — (a) MEIDSLI I LIDI MOTHERJANS

   ENGIN SOGULEG MEIDSLASKRA ER TIL (kafli 0). Thad sem ER haegt ad smida
   ur committudum gognum er FJARVERA, ekki meidsli: hlutfall thess sem
   motherjinn hefur spilad UNDANFARID og er ekki a vellinum i dag.
   Fjarvera er meidsli + bann + rotering + solu — svo thetta er STADGENGILL
   og hann er merktur sem slikur i utprentuninni.

   TVAER UTGAFUR OG THAER SVARA SITTHVORRI SPURNINGU:
     ORACLE  fjarvera I THESSARI umferd. Ekki vitad fyrir frest -> ekki
             nothaeft merki. Thad er THAK: se thakid null er nothaefa
             merkid THAD LIKA. (Sama form og measure-rival-out.mjs.)
     USABLE  fjarvera i UMFERD N-1. Vitad fyrir frest.
   ============================================================ */
head("SECTION 2 - (a) INJURIES IN THE OPPOSING TEAM");
console.log("  NOTE: data/ contains NO historical availability. This measures ABSENCE");
console.log("  (0 minutes for his club that round), which is injury + suspension +");
console.log("  rotation + transfer. It is a PROXY and cannot separate those causes.");
{
  /* mins per (season, name, round) og lid theirrar umferdar. Tvofold umferd
     er logd saman, thvi hun er EIN umferd i panelinu.                     */
  const minsBy = new Map();            // `${s}|${name}|${round}` -> mins
  const teamBy = new Map();            // `${s}|${name}|${round}` -> team
  const posBy = new Map();             // `${s}|${name}` -> pos
  for (const s of SEASN) for (const q of PG.seasons[s]) {
    const k = `${s}|${q[H.name]}|${q[H.round]}`;
    minsBy.set(k, (minsBy.get(k) || 0) + q[H.mins]);
    teamBy.set(k, q[H.team]);
    posBy.set(`${s}|${q[H.name]}`, q[H.pos]);
  }
  /* lid -> umferd -> Map(name -> mins) */
  const teamRound = new Map();
  for (const [k, m] of minsBy) {
    const [s, name, round] = k.split("|");
    const t = teamBy.get(k);
    const kk = `${s}|${t}|${round}`;
    (teamRound.get(kk) || teamRound.set(kk, new Map()).get(kk)).set(name, m);
  }
  const isDefPos = p => p === "GKP" || p === "DEF";

  /* Hlutfall nyleara minutna motherjans sem VANTAR. Vogin (siðustu 5
     umferdir) er FORTID EIN; adeins fjaeru-visirinn er nutid/oracle.     */
  function missShare(season, team, round, atRound) {
    const w = new Map(), wDef = new Map();
    let tot = 0, totDef = 0;
    for (let g = Math.max(1, round - 5); g < round; g++) {
      const m = teamRound.get(`${season}|${team}|${g}`);
      if (!m) continue;
      for (const [nm, mins] of m) {
        if (mins <= 0) continue;
        w.set(nm, (w.get(nm) || 0) + mins); tot += mins;
        if (isDefPos(posBy.get(`${season}|${nm}`))) {
          wDef.set(nm, (wDef.get(nm) || 0) + mins); totDef += mins;
        }
      }
    }
    if (tot <= 0) return null;
    const now = teamRound.get(`${season}|${team}|${atRound}`) || new Map();
    let miss = 0, missDef = 0;
    for (const [nm, mins] of w) if (!(now.get(nm) > 0)) miss += mins;
    for (const [nm, mins] of wDef) if (!(now.get(nm) > 0)) missDef += mins;
    return { all: miss / tot, def: totDef > 0 ? missDef / totDef : null, base: tot };
  }

  let cov = 0, n = 0;
  for (const k of ["A", "B"]) for (const r of POOL[k]) {
    r.oppMiss = 0; r.oppMissDef = 0; r.hasOppMiss = 0;
    r.oppMissPrev = 0; r.oppMissPrevDef = 0; r.hasOppMissPrev = 0;
    if (!r.opp) continue;
    const o = missShare(r.season, r.opp, r.round, r.round);
    if (o && o.base >= 2000) {
      r.oppMiss = o.all; r.oppMissDef = o.def ?? o.all; r.hasOppMiss = 1;
    }
    const p = r.round > 1 ? missShare(r.season, r.opp, r.round, r.round - 1) : null;
    if (p && p.base >= 2000) {
      r.oppMissPrev = p.all; r.oppMissPrevDef = p.def ?? p.all; r.hasOppMissPrev = 1;
    }
    if (k === "A") { n++; cov += r.hasOppMiss; }
  }
  const A26 = POOL.A.filter(r => r.hasOppMiss);
  console.log(`  coverage on POOL A: ${pct(cov, n)}   n with term ${A26.length}`);
  console.log(`  oppMiss (share of opponent's last-5 minutes absent today):` +
    ` mean ${mean(A26.map(r => r.oppMiss)).toFixed(3)}  sd ${sd(A26.map(r => r.oppMiss)).toFixed(3)}` +
    `  p10 ${[...A26.map(r => r.oppMiss)].sort((a, b) => a - b)[Math.floor(0.1 * A26.length)].toFixed(3)}` +
    `  p90 ${[...A26.map(r => r.oppMiss)].sort((a, b) => a - b)[Math.floor(0.9 * A26.length)].toFixed(3)}`);
  console.log("  -> the term VARIES; a flat term would make the test empty (CLAUDE.md 5b).");

  sub("  2a. EFFECT IN POINTS - within-player slope of actual points on oppMiss (ORACLE)");
  for (const k of ["A", "B"]) {
    const rows = POOL[k].filter(r => r.hasOppMiss);
    const s = withinPlayerSlope(rows, "oppMiss");
    const per10 = { point: s.ci.point * 0.1, lo: s.ci.lo * 0.1, hi: s.ci.hi * 0.1, excludesZero: s.ci.excludesZero };
    console.log(`    POOL ${k}  players ${s.players}  rows ${s.n}`);
    console.log(`      points per +0.10 opponent minutes absent   ${ci(per10, 4)}`);
    OUT[`a_slope_${k}`] = per10;
  }
  const sDef = withinPlayerSlope(POOL.A.filter(r => r.hasOppMiss && r.code >= 3), "oppMissDef");
  const per10Def = { point: sDef.ci.point * 0.1, lo: sDef.ci.lo * 0.1, hi: sDef.ci.hi * 0.1, excludesZero: sDef.ci.excludesZero };
  console.log(`    POOL A, MID+FWD only, opponent DEFENSIVE minutes absent (players ${sDef.players})`);
  console.log(`      points per +0.10 opponent DEF minutes absent  ${ci(per10Def, 4)}`);
  OUT.a_slope_def = per10Def;

  sub("  2b. AS A MODEL TERM - LOSO over 5 seasons, on top of BASE_FEATURES");
  for (const k of ["A", "B"]) {
    const rows = POOL[k];
    const p0 = losoPredict(rows, BASE_FEATURES);
    const pOracle = losoPredict(rows, [...BASE_FEATURES, "oppMiss", "oppMissDef", "hasOppMiss"]);
    const pUse = losoPredict(rows, [...BASE_FEATURES, "oppMissPrev", "oppMissPrevDef", "hasOppMissPrev"]);
    console.log(`   POOL ${k}  (n=${rows.length})`);
    const b = report("   base", rows, p0);
    report("   + opponent absent TODAY  (ORACLE)", rows, pOracle, b);
    report("   + opponent absent in N-1 (USABLE)", rows, pUse, b);
    OUT[`a_oracle_${k}`] = verdict("opponent absence, ORACLE (ceiling)", rows, p0, pOracle);
    OUT[`a_usable_${k}`] = verdict("opponent absence in N-1, USABLE", rows, p0, pUse);

    /* AHRIF I STIGUM NET AF THVI SEM LIKANID VEIT THEGAR. Hrai hallinn i
       2a er ekki svarid: hann inniheldur allt sem fer SAMAN vid fjarveru
       (veikt lid, rotering fyrir Evropuleik, januar-glugginn). Leifin er
       thad sem er EFTIR thegar grunnlikanid hefur sagt sitt.            */
    rows.forEach((r, i) => { r.resid = r.pts - p0[i]; });
    const sRes = withinPlayerSlope(rows.filter(r => r.hasOppMiss), "oppMiss", 5, "resid");
    const p10 = { point: sRes.ci.point * 0.1, lo: sRes.ci.lo * 0.1, hi: sRes.ci.hi * 0.1,
      excludesZero: sRes.ci.excludesZero };
    console.log(`    RESIDUAL slope (net of the base model), POOL ${k}:`);
    console.log(`      points per +0.10 opponent minutes absent   ${ci(p10, 4)}`);
    OUT[`a_resid_${k}`] = p10;
    /* STODUGLEIKI. CLAUDE.md kafli 4: lidur sem SKIPTIR FORMERKI milli
       timabila er felldur jafnvel thott heildin syni marktaekni (varnar-
       FFDR 28.7., DC-FFDR 20.8.). Their thrir asar eru marktaekni, staerd
       OG stodugleiki — allir thrir eda ekkert.                          */
    if (k === "A") {
      const per = SEASN.map(s => {
        const sr = rows.filter(r => r.season === s && r.hasOppMiss);
        const q = withinPlayerSlope(sr, "oppMiss", 5, "resid");
        return `${s} ${(q.ci.point * 0.1 >= 0 ? "+" : "") + (q.ci.point * 0.1).toFixed(4)}`;
      });
      console.log(`      per season (POOL A, points per +0.10): ${per.join("  ")}`);
      OUT.a_resid_by_season = per;
    }
  }
}

/* ============================================================
   KAFLI 3 — (b) VITASPYRNUR OG DOMARINN

   TVAER SPURNINGAR, SITTHVOR NIDURSTADA:
     LID     "gefur thetta lid fra ser morg viti?" — maelanlegt, EN adeins
             ur BSD og thvi 2025/26 EITT. Bradabirgda per skilgreiningu.
     DOMARI  "flytur vita-tilhneiging domara milli timabila?" — spurningin
             sem felldi SPJOLDIN (r(N->N+1)=0,182). Hun er OSVARANLEG her:
             vitin eru til fyrir eitt timabil, svo N->N+1 er ekki til.
   ============================================================ */
head("SECTION 3 - (b) PENALTIES: TEAM RATE AND REFEREE TENDENCY");
{
  /* Vita per (short, gw) — bæði unnin og gefin fra ser. */
  const penFor = new Map(), penAg = new Map(), matchOfPen = [];
  for (const s of SH.shots) {
    if (s[SF.sit] !== PEN_SIT) continue;
    const gw = s[SF.gw], t = s[SF.team], o = s[SF.opp];
    if (t != null) penFor.set(`${TSHORT[t]}|${gw}`, (penFor.get(`${TSHORT[t]}|${gw}`) || 0) + 1);
    if (o != null) penAg.set(`${TSHORT[o]}|${gw}`, (penAg.get(`${TSHORT[o]}|${gw}`) || 0) + 1);
    matchOfPen.push({ gw, known: t != null ? TSHORT[t] : (o != null ? TSHORT[o] : null) });
  }

  /* --- domarinn: fyrst thekjan, svo af hverju spurningin er lokud --- */
  sub("  3a. REFEREE PENALTY TENDENCY");
  console.log("  E0 carries Referee for ALL 15 seasons but ZERO penalty columns (Section 0).");
  console.log("  Penalties exist ONLY in the BSD shot map, which covers 2025/26 alone.");
  console.log("  The test that decided the CARD question - r(season N -> season N+1) over");
  console.log("  14 season-pairs - therefore CANNOT BE RUN: there is only one season.");
  {
    /* Innan-timabils tholmarkið: er breytileiki milli domara staerri en
       urtakshavadi? Se hann thad ekki er engin tilhneiging maelanleg
       jafnvel innan thessa eina timabils.                                */
    const teams = JSON.parse(readFileSync(`${D}teams.json`, "utf8")).teams;
    const shortByName = new Map(teams.map(t => [t.name, t.short]));
    const ALIAS = { "Tottenham": "Spurs", "Man United": "Man Utd", "Sheffield United": "Sheffield Utd" };
    const shortOf = nm => shortByName.get(ALIAS[nm] || nm) || shortByName.get(nm) || null;
    /* (short, gw) -> domari, gegnum (dagsetning, lid) -> umferd */
    const roundOf = new Map();               // `${team}|${date}` -> round  (E0-nofn)
    for (const q of PG.seasons[LIVE]) roundOf.set(`${q[H.team]}|${q[H.date]}`, q[H.round]);
    const refOfMatch = new Map();            // `${short}|${gw}` -> referee
    const refGames = new Map();
    for (const r of loadSeason(LIVE)) {
      const rd = roundOf.get(`${r.HomeTeam}|${r.Date}`) ?? roundOf.get(`${r.AwayTeam}|${r.Date}`);
      refGames.set(r.Referee, (refGames.get(r.Referee) || 0) + 1);
      if (rd == null) continue;
      for (const nm of [r.HomeTeam, r.AwayTeam]) {
        const sh = shortOf(nm);
        if (sh) refOfMatch.set(`${sh}|${rd}`, r.Referee);
      }
    }
    const refPens = new Map();
    let attributed = 0;
    for (const p of matchOfPen) {
      if (!p.known) continue;
      const ref = refOfMatch.get(`${p.known}|${p.gw}`);
      if (!ref) continue;
      refPens.set(ref, (refPens.get(ref) || 0) + 1); attributed++;
    }
    const refs = [...refGames.entries()].filter(([, g]) => g >= 10)
      .map(([nm, g]) => ({ nm, g, p: refPens.get(nm) || 0 }));
    const totG = refs.reduce((a, x) => a + x.g, 0), totP = refs.reduce((a, x) => a + x.p, 0);
    const lam = totP / totG;
    console.log(`  2025/26: ${attributed} of ${matchOfPen.length} penalties attributed to a referee;` +
      ` ${refs.length} referees with >=10 matches (${totG} matches, ${totP} penalties).`);
    console.log(`  league penalty rate lambda = ${lam.toFixed(3)} per match.`);
    /* Vegin milli-domara dreifni a moti Poisson-urtaksdreifni. */
    const excessVar = rs => {
      const g = rs.reduce((a, x) => a + x.g, 0), p = rs.reduce((a, x) => a + x.p, 0);
      if (!g) return NaN;
      const l = p / g;
      const ov = rs.reduce((a, x) => a + x.g * (x.p / x.g - l) ** 2, 0) / g;
      const ev = rs.reduce((a, x) => a + x.g * (l / x.g), 0) / g;
      return ov - ev;
    };
    const obsVar = refs.reduce((a, x) => a + x.g * (x.p / x.g - lam) ** 2, 0) / totG;
    const expVar = refs.reduce((a, x) => a + x.g * (lam / x.g), 0) / totG;
    const trueVar = Math.max(0, obsVar - expVar);
    console.log(`  between-referee variance in pens/match  observed ${obsVar.toFixed(5)}` +
      `   expected from sampling alone ${expVar.toFixed(5)}`);
    /* KLASINN ER DOMARINN. Se CI a umframdreifninni med null er engin
       tilhneiging maelanleg — jafnvel innan thessa eina timabils.       */
    const exCI = bootstrapCI(refs.map(x => [x]), xs => excessVar(xs));
    console.log(`  EXCESS variance (observed - sampling), bootstrap clustered per referee:`);
    console.log(`    ${ci(exCI, 5)}`);
    console.log(`  implied TRUE sd of referee penalty rate = ${Math.sqrt(trueVar).toFixed(4)} pens/match` +
      (exCI.excludesZero ? "" : "   -- but the excess variance INCLUDES 0, so this sd is not established"));
    OUT.b_ref_excess = exCI;
    const busiest = refs.sort((a, b) => b.g - a.g).slice(0, 5);
    console.log("  busiest referees: " + busiest.map(x => `${x.nm} ${x.p}/${x.g}`).join(", "));
    /* THAKID I STIGUM, jafnvel med FULLKOMINNI vitneskju um sanna tidnina. */
    const sdTrue = Math.sqrt(trueVar);
    const CONVERT = 0.79, PTS_PER_PEN_GOAL = 5.0;   // mark + bonus, MID/FWD
    console.log(`  CEILING IN POINTS: a referee 1 sd above average gives ${sdTrue.toFixed(4)} extra pens/match,`);
    console.log(`    ~half of them to the side of interest, converted ${CONVERT}, worth ~${PTS_PER_PEN_GOAL} pts`);
    console.log(`    => ${(sdTrue / 2 * CONVERT * PTS_PER_PEN_GOAL).toFixed(4)} points to that club's taker, WITH PERFECT KNOWLEDGE.`);
    console.log(`    Referee CARDS were rejected at 0.016 usable points (CLAUDE.md kafli 4).`);
    OUT.b_ref = { refs: refs.length, matches: totG, pens: totP, lambda: lam,
      obsVar, expVar, trueSd: sdTrue, ceilingPoints: sdTrue / 2 * CONVERT * PTS_PER_PEN_GOAL };
  }

  /* --- lidið: motherjinn gefur fra ser viti, FORTID EIN --- */
  sub("  3b. OPPONENT PENALTIES CONCEDED AS A MODEL TERM (2025/26 ONLY)");
  const teams = JSON.parse(readFileSync(`${D}teams.json`, "utf8")).teams;
  const shortByName = new Map(teams.map(t => [t.name, t.short]));
  const ALIAS = { "Tottenham": "Spurs", "Man United": "Man Utd", "Sheffield United": "Sheffield Utd" };
  const shortOf = nm => shortByName.get(ALIAS[nm] || nm) || shortByName.get(nm) || null;
  let mapped = 0, unmapped = new Set();
  for (const k of ["A", "B"]) for (const r of POOL[k]) {
    r.oppPenConc = 0; r.hasOppPen = 0; r.ownPenWon = 0;
    if (r.season !== LIVE || !r.opp) continue;
    const sh = shortOf(r.opp), me = shortOf(r.team);
    if (!sh) { unmapped.add(r.opp); continue; }
    let p = 0, n = 0, pw = 0;
    for (let g = 1; g < r.round; g++) { p += penAg.get(`${sh}|${g}`) || 0; n++; }
    if (me) for (let g = 1; g < r.round; g++) pw += penFor.get(`${me}|${g}`) || 0;
    if (n >= 5) { r.oppPenConc = p / n; r.hasOppPen = 1; r.ownPenWon = n ? pw / n : 0; if (k === "A") mapped++; }
  }
  console.log(`  club-name mapping unmapped: ${unmapped.size ? [...unmapped].join(", ") : "none"}` +
    `   (relegated clubs carry null team/opp in BSD by construction)`);
  const live = POOL.A.filter(r => r.season === LIVE && r.hasOppPen);
  console.log(`  rows with the term (POOL A, 2025/26): ${live.length}` +
    `   oppPenConc mean ${mean(live.map(r => r.oppPenConc)).toFixed(4)} sd ${sd(live.map(r => r.oppPenConc)).toFixed(4)}`);
  console.log("  POWER WARNING: 92 penalties / 380 matches = 0.24 per match. By GW20 a club has");
  console.log("  conceded ~2. A rate estimated from ~2 events is mostly sampling noise, and no");
  console.log("  amount of modelling downstream can put information back that was never there.");

  for (const k of ["A", "B"]) {
    const rows = POOL[k].filter(r => r.season === LIVE);
    const p0 = splitPredict(rows, BASE_FEATURES);
    const p1 = splitPredict(rows, [...BASE_FEATURES, "oppPenConc", "hasOppPen"]);
    const te = p0.testIx, sr = te.map(i => rows[i]);
    console.log(`   POOL ${k}  fit GW1-19, test GW20-38, n=${sr.length}`);
    const b = report("   base", sr, te.map(i => p0.pred[i]));
    report("   + opponent penalties conceded", sr, te.map(i => p1.pred[i]), b);
    OUT[`b_team_${k}`] = verdict("opponent penalties conceded (1 season, PROVISIONAL)",
      sr, te.map(i => p0.pred[i]), te.map(i => p1.pred[i]));
  }

  /* Skarpasta prof a fullyrdingu eigandans: hun er um VITASKYTTUNA.
     "Tok viti i FYRRI umferd" er fortid ein — engin arstidar-summa.     */
  sub("  3c. THE OWNER'S ACTUAL CLAIM: does it help a PENALTY TAKER?");
  {
    const takerByRound = new Map();     // `${code}` -> sorted rounds he took one
    for (const s of SH.shots) {
      if (s[SF.sit] !== PEN_SIT || s[SF.code] == null) continue;
      const a = takerByRound.get(s[SF.code]) || takerByRound.set(s[SF.code], []).get(s[SF.code]);
      a.push(s[SF.gw]);
    }
    console.log(`  distinct penalty takers with a code in BSD: ${takerByRound.size}`);
    console.log("  NOTE: the taker is identified by CODE; the panel is keyed by NAME. The");
    console.log("  structural code<->name join is built in Section 4 and reused here.");
    OUT.b_takers = takerByRound.size;
    globalThis.__takerByRound = takerByRound;
  }
}

/* ============================================================
   KAFLI 4 — (c) HRAR SKOTATOLUR

   Skotin eru i BSD og eru lyklud a FPL-`code`; panelid er lyklad a NAFN.
   NAFNA-PORUN ER EKKI NOTUD (CLAUDE.md: thogul rong porun er verri en
   engin). Tengingin er BYGGINGARLEG: `player_gw_2526.json` er lyklud a
   `code` og ber (minutur, stig) per umferd; sami vigur ur
   `fpl_player_gw.json` per nafn. Eins vigur = sami madur.
   ============================================================ */
head("SECTION 4 - (c) RAW SHOT COUNTS AS AN EXPECTED-POINTS TERM");
{
  const G = JSON.parse(readFileSync(`${D}player_gw_2526.json`, "utf8"));
  const SI = Object.fromEntries(G.stats.map((s, i) => [s, i]));
  const vec = new Map();
  for (const q of PG.seasons[LIVE]) {
    const o = vec.get(q[H.name]) || vec.set(q[H.name], {}).get(q[H.name]);
    (o[q[H.round]] ||= [0, 0])[0] += q[H.mins];
    o[q[H.round]][1] += q[H.pts];
  }
  const sig = o => Object.keys(o).sort((a, b) => a - b).map(r => `${r}:${o[r][0]},${o[r][1]}`).join("|");
  const tot = o => Object.values(o).reduce((a, x) => a + x[0], 0);
  const bySig = new Map();
  for (const [nm, o] of vec) {
    if (tot(o) <= 0) continue;
    const s = sig(o); (bySig.get(s) || bySig.set(s, []).get(s)).push(nm);
  }
  const nameOfCode = new Map();
  let uniq = 0, amb = 0, none = 0, zero = 0;
  for (const [code, p] of Object.entries(G.players)) {
    const o = {};
    for (const [r, arr] of Object.entries(p.gw)) o[r] = [arr[SI.mins], arr[SI.pts]];
    if (tot(o) <= 0) { zero++; continue; }
    const c = bySig.get(sig(o));
    if (!c) none++; else if (c.length > 1) amb++; else { uniq++; nameOfCode.set(+code, c[0]); }
  }
  console.log(`  structural code<->name join: ${uniq} unique, ${amb} ambiguous, ${none} unmatched` +
    ` (of ${uniq + amb + none} codes with minutes; ${zero} zero-minute codes skipped).`);
  console.log("  NO name matching is used anywhere in this section.");
  OUT.c_join = { unique: uniq, ambiguous: amb, unmatched: none };

  /* skot per (nafn, umferd) — ur BSD, adeins fyrir tha sem eiga code */
  const shotsBy = new Map(), boxBy = new Map(), npBy = new Map();
  const shooterCodes = new Set();
  for (const s of SH.shots) {
    const c = s[SF.code];
    if (c == null) continue;
    shooterCodes.add(c);
    const nm = nameOfCode.get(c);
    if (!nm) continue;
    const k = `${nm}|${s[SF.gw]}`;
    shotsBy.set(k, (shotsBy.get(k) || 0) + 1);
    if (s[SF.sit] !== PEN_SIT) npBy.set(k, (npBy.get(k) || 0) + 1);
    if (typeof s[SF.x] === "number" && s[SF.x] <= IN_BOX_X) boxBy.set(k, (boxBy.get(k) || 0) + 1);
  }
  const namesWithShots = new Set([...shotsBy.keys()].map(k => k.split("|")[0]));
  console.log(`  shooters with a code ${shooterCodes.size}; of those resolved to a panel name: ${namesWithShots.size}`);
  console.log(`  IN_BOX_X = ${IN_BOX_X} imported from src/bsd.js (not re-typed).`);
  console.log("  A player whose shots BSD never attributed would look like ZERO shots, which is");
  console.log("  the 'null is not zero' trap. The term is therefore set ONLY for names that");
  console.log("  BSD attributed at least one shot to, and flagged with hasShots elsewhere.");

  const minsBy = new Map();
  for (const q of PG.seasons[LIVE]) {
    const k = `${q[H.name]}|${q[H.round]}`;
    minsBy.set(k, (minsBy.get(k) || 0) + q[H.mins]);
  }
  for (const k of ["A", "B"]) for (const r of POOL[k]) {
    r.shots90 = 0; r.box90 = 0; r.shotsPerApp = 0; r.hasShots = 0;
    r.oppPenTaker = 0;
    if (r.season !== LIVE || !namesWithShots.has(r.name)) continue;
    let sh = 0, bx = 0, mn = 0, apps = 0;
    for (let g = Math.max(1, r.round - 5); g < r.round; g++) {
      const m = minsBy.get(`${r.name}|${g}`) || 0;
      if (m > 0) { apps++; mn += m; }
      sh += shotsBy.get(`${r.name}|${g}`) || 0;
      bx += boxBy.get(`${r.name}|${g}`) || 0;
    }
    if (mn >= 90) {
      r.shots90 = sh / (mn / 90); r.box90 = bx / (mn / 90);
      r.shotsPerApp = apps ? sh / apps : 0; r.hasShots = 1;
    }
  }
  const withT = POOL.A.filter(r => r.season === LIVE && r.hasShots);
  console.log(`  rows with the term (POOL A, 2025/26): ${withT.length}` +
    `   shots90 mean ${mean(withT.map(r => r.shots90)).toFixed(3)} sd ${sd(withT.map(r => r.shots90)).toFixed(3)}`);

  for (const k of ["A", "B"]) {
    const rows = POOL[k].filter(r => r.season === LIVE);
    const p0 = splitPredict(rows, BASE_FEATURES);
    const p1 = splitPredict(rows, [...BASE_FEATURES, "shots90", "box90", "shotsPerApp", "hasShots"]);
    const te = p0.testIx, sr = te.map(i => rows[i]);
    console.log(`   POOL ${k}  fit GW1-19, test GW20-38, n=${sr.length}`);
    const b = report("   base (already has xg90, threat90, ict90)", sr, te.map(i => p0.pred[i]));
    report("   + raw shots (shots90, box90, per app)", sr, te.map(i => p1.pred[i]), b);
    OUT[`c_${k}`] = verdict("raw shot counts (1 season, PROVISIONAL)",
      sr, te.map(i => p0.pred[i]), te.map(i => p1.pred[i]));
  }
  /* Adeins their sem SKJOTA — thar er spurningin skorpust og laugin ekki
     medgud af their sem eiga engin skot. */
  {
    const rows = POOL.A.filter(r => r.season === LIVE && r.hasShots);
    const p0 = splitPredict(rows, BASE_FEATURES);
    const p1 = splitPredict(rows, [...BASE_FEATURES, "shots90", "box90", "shotsPerApp"]);
    const te = p0.testIx, sr = te.map(i => rows[i]);
    sub(`  4b. SHOOTERS ONLY (POOL A, n=${sr.length} test rows)`);
    const b = report("   base", sr, te.map(i => p0.pred[i]));
    report("   + raw shots", sr, te.map(i => p1.pred[i]), b);
    OUT.c_shooters = verdictRows("raw shots, shooters only", sr, te.map(i => p0.pred[i]), te.map(i => p1.pred[i]));
  }

  /* 3c framhald: vitaskyttan. Nu er code<->nafn til. */
  sub("  4c. BACK TO 3c - PENALTY TAKERS ONLY");
  {
    const takerByRound = globalThis.__takerByRound;
    const takerRounds = new Map();          // nafn -> raðadar umferdir
    for (const [code, gws] of takerByRound) {
      const nm = nameOfCode.get(code);
      if (nm) takerRounds.set(nm, gws.sort((a, b) => a - b));
    }
    console.log(`  takers resolved to a panel name: ${takerRounds.size} of ${takerByRound.size}`);
    for (const k of ["A"]) for (const r of POOL[k]) {
      r.isTaker = 0;
      if (r.season !== LIVE) continue;
      const g = takerRounds.get(r.name);
      r.isTaker = g && g.some(x => x < r.round) ? 1 : 0;
    }
    const rows = POOL.A.filter(r => r.season === LIVE && r.isTaker && r.hasOppPen);
    console.log(`  rows: a known taker (took one in an EARLIER round) with the opponent term: ${rows.length}`);
    if (rows.length < 200) {
      console.log("  n is too small for the split test; reporting the within-player slope only.");
    } else {
      const p0 = splitPredict(rows, BASE_FEATURES);
      const p1 = splitPredict(rows, [...BASE_FEATURES, "oppPenConc"]);
      const te = p0.testIx, sr = te.map(i => rows[i]);
      const b = report("   base", sr, te.map(i => p0.pred[i]));
      report("   + opponent penalties conceded", sr, te.map(i => p1.pred[i]), b);
      OUT.b_takers_model = verdictRows("opponent pens conceded, TAKERS ONLY",
        sr, te.map(i => p0.pred[i]), te.map(i => p1.pred[i]));
    }
    const s = withinPlayerSlope(rows, "oppPenConc", 4);
    console.log(`  within-player slope, points per +1 penalty conceded per match by the opponent:`);
    console.log(`    players ${s.players}  rows ${s.n}   ${ci(s.ci, 3)}`);
    console.log("    (opponent rates span ~0.0-0.5, so multiply by ~0.25 for a realistic swing)");
    OUT.b_taker_slope = s.ci;
  }
}

head("SUMMARY");
console.log("  (a) opponent injuries .. NOT AVAILABLE as injuries; measured as ABSENCE proxy.");
console.log("  (b) team penalties ..... 1 season only (BSD). Referee tendency NOT MEASURABLE.");
console.log("  (c) raw shot counts .... 1 season only (BSD), shooters resolved structurally.");
console.log("  Read the CI on each line above. A term is accepted only if the CI excludes 0.");

if (argJson > 0 && process.argv[argJson + 1]) {
  writeFileSync(process.argv[argJson + 1], JSON.stringify(OUT, null, 1));
  console.log(`\n  wrote ${process.argv[argJson + 1]}`);
}
