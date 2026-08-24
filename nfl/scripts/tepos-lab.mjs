/* ============================================================
   tepos-lab.mjs — ER APPID SYSTEMATISKT RANGT UM THETT-ENDA?

   SPURNINGIN, OG HVERS VEGNA HUN ER ONNUR EN `--tesweep`
   ============================================================
   `vbdbase-lab --tesweep` og `h2h-lab --tesweep` sveipudu KONSTANTINN
   (`FLEX_SPLIT.TE`, 0 -> 0,40) og felldu hann: 0 af 102 frumum, attin
   skiptir formerki milli deildanna tveggja, dypra er maelanlega verra.
   Sja README 4l.

   THAD SVARADI EKKI SPURNINGUNNI. Sveipurinn spurdi "er ANNAD gildi a
   thessari tolu betra?". Spurningin sem stendur eftir er:

     (1) HVADAN kemur TE-hallinn — hve mikid ur konstantinum, hve mikid
         ur SPA-HEIMILDINNI og hve mikid ur GRUNNI `value`-dalksins?
     (2) KOSTAR THETTINGIN NOKKUD? Bordid setur 58% af thremur fyrstu
         volunum i thett-enda (`band.json -> q1positionMix`) i deild med
         EITT TE-saeti. Er thad forskot sem markadurinn missir, eda
         systematisk villa? Sú spurning er UTKOMU-spurning og hun er
         ONNUR en "er 0,193 retta talan": thak a fjolda er ekki sama
         hlutur og annad varamanns-threp.
     (3) SE THAKID GOTT — er thad um THETT-ENDA eda um THETTINGU?
         Sama thak a RB og WR er VIDMIDID sem svarar thvi.

   ============================================================
   HVERS VEGNA THETTA ER EKKI NY VEL
   ============================================================
   Heimurinn (`buildWorld`), fruman (`runCell`), bootstrappid (`boot`),
   placebo-truflunin (`placeboValue`/`placeboBoard`), endursynda laugin
   (`resampleWorld`) og bordin (`arankBoard`/`adpBoard`/`oracleBoard`/
   `reverseBoard`/`makeCapBoard`) eru ORDRETT ur `band-lab.mjs`, sem ber
   thau ordrett ur `h2h-lab.mjs`. Thad er sama vinnulag og
   `band-lab` sjalft skjalar: afrit af heiminum er LEYFILEGT adeins
   thvi N3-hlidid endurkeyrir bokada A-Ranking-gegn-ADP toluna og deyr
   se hun ekki i sama fari.

   OG HER ER STERKARA HLID EN THAD: `band.json -> q2b` ber THEGAR
   "TE max 1" fyrir ALLT draftid, maelt med sama seedBase og sama
   `runs`. Fruman `TE cap=1 window=all` HER verdur thvi ad endurgera
   bokada toluna. Hlid N5 gerir thad — og thad er thvert akkeri a
   NAKVAEMLEGA thann kodaslood sem thessi skrifta bætir vid, ekki adeins
   a heiminn undir honum.

   EINA NYJA STYKKID ER `makeWindowCapBoard`: thak sem gildir ADEINS i
   fyrstu `until` umferdum. Vid `until = 99` er thad BITAEINS
   `makeCapBoard` og hlid N5 profar thad.

   ============================================================
   BARINN — REPO-SINN EIGIN
   ============================================================
   1. medaltal med retta formerki
   2. bootstrap klasad PER TIMABIL utilokar null
   3. bootstrap klasad PER LEIKMANN utilokar null (hlidid sem gaf
      `vbdbase-lab` 0 af 153 og `--tesweep` 0 af 102)
   4. yfir PLACEBO-THAKI (einhlida `maxPositiveMean` OG `maxPositiveT`)
   5. rett formerki i skyrum meirihluta timabila
   6. heldur WALK-FORWARD (val a fyrri arum eingongu, gegn thvi sem
      SAMA leit gefur yfir placebo-fjolskylduna)
   7. haldi hun i BADUM maelikvordum (sigrar og stig)

   PLACEBO-FJOLSKYLDAN ER NY OG HUN ER VALIN AF ASTAEDU. Thak a
   RB/WR er VIDMID (spurning 3), ekki placebo — thad er raunveruleg
   tilgata um thettingu. Nullid verdur thvi ad vera thak a hopi sem
   BER ENGA merkingu: leikmenn eru skiptir i gervi-hop med akvednu
   hakki (`pseudoGroup`), hopurinn er JAFNSTOR TE-lauginni, og sama
   thak er sett a hann i somu umferdabondum. Spurningin sem thakid
   svarar: "les HVERT SEM ER thak a ~jafnstorum hluta bordsins i
   fyrstu umferdum sem sigur?"

   ============================================================
   HVAD ER MAELT OG HVAD ER LYSING
   ============================================================
   Q1 (sundurlidunin) er LYSING a lifandi bordinu — engin vikmork,
   engin utkoma. Hun svarar "hvadan kemur hallinn", ekki "er hann
   rangur". Hun er merkt sem lysing i skranni (`kind: "descriptive"`)
   svo hun geti ekki lesist sem maeling.

   Q2/Q3 (thokin) eru MAELING og barinn gildir um hverja frumu.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { simulateDraft, scoreLeague, roundRobin, startersPoints,
         DEFAULT_LEAGUE } from "../src/accuracy.js";
import { replacementRanks } from "../src/model.js";
import { mean, bootstrapDiff } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";
import { loadTeModels, TE_SHIPPED } from "./lib/te-sweep.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DATA = path.join(ROOT, "data");
const TMP = path.join(ROOT, ".cache-nfl", "tepos");

const ARG = parseArgs(process.argv.slice(2), {
  runs: "number", pruns: "number", boot: "number", pboot: "number",
  from: "number", pbruns: "number",
});
const DEFAULTS = { runs: 4, pruns: 2, boot: 2000, pboot: 120, from: 2019,
                   pbruns: 1 };
const RUNS   = Number(ARG.runs   ?? DEFAULTS.runs);
const PRUNS  = Number(ARG.pruns  ?? DEFAULTS.pruns);
const BOOT   = Number(ARG.boot   ?? DEFAULTS.boot);
const PBOOT  = Number(ARG.pboot  ?? DEFAULTS.pboot);
const PBRUNS = Number(ARG.pbruns ?? DEFAULTS.pbruns);
const FROM   = Number(ARG.from   ?? DEFAULTS.from);
const NO_OUTCOME = !!ARG.noOutcome;

const REG_WEEKS = 14;                  // MAELT: `fpts` = vikur 1-14
const PO_WEEKS = [15, 16, 17];         // MAELT: playoff_week_start = 15
const PO_TEAMS = 6;                    // MAELT: playoff_teams = 6
const POSES = ["QB", "RB", "WR", "TE"];
const MAXW = 18;

const r1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const sgn = (x, d = 2) => (x == null ? "     -" : `${x > 0 ? "+" : ""}${x.toFixed(d)}`);
const median = (a) => {
  const v = a.filter((x) => x != null && Number.isFinite(x)).sort((x, y) => x - y);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

/* Fraekorn: LCG, ORDRETT sama utfaersla og `band-lab`/`h2h-lab`. */
function rngOf(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const gaussOf = (rnd) => () => {
  const u = Math.max(1e-9, rnd()), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
function tOf(a) {
  const v = a.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
}

/* ============================================================
   1. LOGUNIN — ORDRETT SU SAMA OG `band-lab.mjs` BER
   ============================================================ */
const SHAPES = [
  { key: "10-2flex", fmt: "ppr", label: "10 lid, 2 FLEX, PPR (Patriots)",
    league: { teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 15,
              flexPos: ["RB", "WR", "TE"], superflex: false,
              excludePos: ["K", "DST"] } },
  { key: "12-2flex", fmt: "half", label: "12 lid, 2 FLEX, half-PPR (Sofahetjur)",
    league: { teams: 12, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 14,
              flexPos: ["RB", "WR", "TE"], superflex: false,
              excludePos: ["K", "DST"] } },
];
const REAL = ["10-2flex", "12-2flex"];
const ADP_SRC = { ppr: "adpPpr", half: "adpPpr", standard: "adpStd" };

/* ============================================================
   2. HEIMURINN — ORDRETT `buildWorld` UR `band-lab.mjs`
   ============================================================ */
async function loadInputs() {
  const weekly = {}, seasons = [];
  for (let y = 2018; y <= 2025; y++) {
    try {
      weekly[y] = JSON.parse(await readFile(path.join(DATA, "weekly", `${y}.json`), "utf8"));
      if (y >= FROM) seasons.push(y);
    } catch { /* vantar -> sest i `seasons` */ }
  }
  const feats = JSON.parse(await readFile(path.join(DATA, "features.json"), "utf8"));
  let bookedH2h = null, bookedBand = null;
  try {
    bookedH2h = JSON.parse(await readFile(path.join(DATA, "measure", "h2h.json"), "utf8"));
  } catch { /* ekki til -> N3 segir thad */ }
  try {
    bookedBand = JSON.parse(await readFile(path.join(DATA, "measure", "band.json"), "utf8"));
  } catch { /* ekki til -> N5 segir thad */ }
  return { weekly, seasons, feats, bookedH2h, bookedBand };
}

const ptsOf = (row, fmt) => (fmt === "ppr" ? row.ppr : fmt === "half" ? row.half : row.std);
const gamesInSeason = (y) => (y <= 2020 ? 16 : 17);

function buildWorld(y, weekly, featIdx) {
  const rows = weekly[y], prev = weekly[y - 1] || null;

  const idx = new Map(), P = [];
  for (const r of rows) {
    if (!POSES.includes(r.pos)) continue;
    if (!idx.has(r.id)) { idx.set(r.id, P.length); P.push({ id: r.id, name: r.name, pos: r.pos }); }
  }
  const N = P.length;

  const FMTS = ["ppr", "half", "standard"];
  const byWeek = {}, totAll = {}, tot14 = {};
  for (const fmt of FMTS) {
    byWeek[fmt] = new Map();
    totAll[fmt] = new Float64Array(N);
    tot14[fmt] = new Float64Array(N);
  }
  for (const r of rows) {
    const i = idx.get(r.id);
    if (i == null || r.week > MAXW) continue;
    for (const fmt of FMTS) {
      const v = ptsOf(r, fmt);
      if (v == null) continue;
      byWeek[fmt].set(`${r.id}|${r.week}`, { pos: r.pos, pts: v });
      totAll[fmt][i] += v;
      if (r.week <= REG_WEEKS) tot14[fmt][i] += v;
    }
  }

  const prevPts = new Map();
  if (prev) for (const r of prev) {
    const v = ptsOf(r, "ppr");
    if (v != null) prevPts.set(r.id, (prevPts.get(r.id) || 0) + v);
  }
  const rookieFloor = {};
  for (const pos of POSES) {
    const vals = [];
    for (let py = 2019; py < y; py++) {
      const pr = weekly[py], pp = weekly[py - 1];
      if (!pr) continue;
      const had = new Set(pp ? pp.map((r) => r.id) : []);
      const tot = new Map();
      for (const r of pr) {
        if (r.pos !== pos || had.has(r.id)) continue;
        const v = ptsOf(r, "ppr");
        if (v != null) tot.set(r.id, (tot.get(r.id) || 0) + v);
      }
      for (const v of tot.values()) vals.push(v / 17);
    }
    rookieFloor[pos] = vals.length ? mean(vals) : 0;
  }

  const prior = new Float64Array(N);
  const proj = { ppr: new Array(N).fill(null), half: new Array(N).fill(null),
                 standard: new Array(N).fill(null) };
  /* SPA-HEIMILDIN SUNDURLIDUD. `proj` er thad sem appid notar (Sleeper
     med FFToday sem varaleid) — ORDRETT sama regla og `band-lab`. Til
     ad svara spurningu (1) tharf LIKA hvora heimild fyrir sig, og thaer
     eru thvi haldnar SER. Thetta les ekkert nytt af diski; thad eru
     sömu tvo svid ur `features.json` sem `proj` er byggt ur. */
  const projSlp = { ppr: new Array(N).fill(null) };
  const projFf = { ppr: new Array(N).fill(null) };
  const adp = { adpPpr: new Array(N).fill(null), adpStd: new Array(N).fill(null) };
  const adpSd = new Array(N).fill(null);
  let projected = 0, sleeperProjected = 0, ffProjected = 0;
  for (let i = 0; i < N; i++) {
    const a = featIdx.get(`${y}|${P[i].id}|ppr`);
    const b = featIdx.get(`${y}|${P[i].id}|standard`);
    const pj = a ? (a.sleeperProj != null ? a.sleeperProj : a.ffProj) : null;
    const sj = b ? (b.sleeperProj != null ? b.sleeperProj : b.ffProj) : null;
    if (a && a.sleeperProj != null) sleeperProjected++;
    if (a && a.ffProj != null) ffProjected++;
    projSlp.ppr[i] = a ? (a.sleeperProj ?? null) : null;
    projFf.ppr[i] = a ? (a.ffProj ?? null) : null;
    proj.ppr[i] = pj ?? null;
    proj.standard[i] = sj ?? null;
    proj.half[i] = pj != null && sj != null ? (pj + sj) / 2 : (pj ?? null);
    if (a && a.adp != null) { adp.adpPpr[i] = a.adp; adpSd[i] = a.adpSd ?? null; }
    if (b && b.adp != null) adp.adpStd[i] = b.adp;

    if (proj.ppr[i] != null) { prior[i] = proj.ppr[i] / gamesInSeason(y); projected++; }
    else if (prevPts.has(P[i].id)) prior[i] = prevPts.get(P[i].id) / 17;
    else prior[i] = rookieFloor[P[i].pos] || 0;
  }

  const actual = {}, actual14 = {};
  for (const fmt of FMTS) {
    actual[fmt] = new Map(P.map((p, i) => [p.id, { pos: p.pos, pts: totAll[fmt][i] }]));
    actual14[fmt] = new Map(P.map((p, i) => [p.id, { pos: p.pos, pts: tot14[fmt][i] }]));
  }

  return { y, N, P, idx, prior, proj, projSlp, projFf, adp, adpSd, byWeek,
           actual, actual14, totAll, tot14,
           coverage: { players: N, projected, sleeperProjected, ffProjected } };
}

/* ============================================================
   3. BORDIN — ORDRETT UR `band-lab.mjs`
   ============================================================ */
function posBase(W, fmt, repl) {
  const byPos = {};
  for (let i = 0; i < W.N; i++) {
    const v = W.proj[fmt][i];
    if (v == null) continue;
    (byPos[W.P[i].pos] = byPos[W.P[i].pos] || []).push(v);
  }
  const base = {};
  for (const [pos, vals] of Object.entries(byPos)) {
    vals.sort((a, b) => b - a);
    const k = Math.min(vals.length - 1, (repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    base[pos] = around.length ? mean(around) : 0;
  }
  return base;
}

function arankScored(W, fmt, repl) {
  const base = posBase(W, fmt, repl);
  const scored = [];
  for (let i = 0; i < W.N; i++) {
    const v = W.proj[fmt][i];
    scored.push([W.P[i].id, v != null ? v - (base[W.P[i].pos] ?? 0) : -1e5 + W.prior[i]]);
  }
  return scored;
}

function arankBoard(W, fmt, repl) {
  const scored = arankScored(W, fmt, repl);
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

function adpBoard(W, src, rnd = null) {
  const gauss = rnd ? gaussOf(rnd) : null;
  let maxAdp = 0;
  for (let i = 0; i < W.N; i++) if (W.adp[src][i] != null) maxAdp = Math.max(maxAdp, W.adp[src][i]);
  const scored = [];
  for (let i = 0; i < W.N; i++) {
    const a = W.adp[src][i];
    if (a != null) {
      const sd = W.adpSd[i] > 0 ? W.adpSd[i] : 1.08 * Math.sqrt(Math.max(1, a));
      scored.push([W.P[i].id, gauss ? a + gauss() * sd : a]);
    } else {
      scored.push([W.P[i].id, maxAdp + 1 + Math.max(0, 60 - W.prior[i]) * 5]);
    }
  }
  scored.sort((a, b) => a[1] - b[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

function oracleBoard(W, fmt) {
  const scored = W.P.map((p, i) => [p.id, W.totAll[fmt][i]]);
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

function reverseBoard(W, src) {
  const keys = [...adpBoard(W, src).keys()].reverse();
  return new Map(keys.map((k, i) => [k, i + 1]));
}

/** ORDRETT `makeCapBoard` ur `band-lab.mjs` — thak allt draftid. */
function makeCapBoard(W, A, pos, cap) {
  const posOf = new Map(W.P.map((p) => [p.id, p.pos]));
  const shifted = [...A.entries()].map(([id, rank]) =>
    [id, posOf.get(id) === pos ? rank + 1e6 : rank]);
  shifted.sort((a, b) => a[1] - b[1]);
  const demoted = new Map(shifted.map(([id], i) => [id, i + 1]));
  return (taken, counts) => ((counts[pos] || 0) >= cap ? demoted : A);
}

/* ============================================================
   3b. EINA NYJA STYKKID — THAK SEM GILDIR ADEINS I FYRSTU UMFERDUM
   ============================================================
   `until` er FJOLDI UMFERDA sem thakid gildir i (0-vistad: `r < until`).
   `until = 3`  -> "ad haesta lagi `cap` i umferdum 1-3"
   `until = 7`  -> "ad haesta lagi `cap` fyrir 8. umferd"
   `until = 99` -> allt draftid, sem er BITAEINS `makeCapBoard`.

   `counts` safnast upp yfir draftid og thakid les hann adeins medan
   `r < until`, svo talningin i thvi bili ER fjoldi a stodunni i thvi
   bili. Eftir thad er thakid horfid og deildar-thakid (`maxPos`) tekur
   vid, ordrett eins og i sendu reglunni.

   TAGLID, EKKI UTILOKUN — sama regla og `makeCapBoard`: sleppt val
   vaeri onnur tilraun ("hvad gerist ef thu spilar ekki"), ekki thessi.

   `hits` ER TALIN OG HUN ER HLID, EKKI LOGGA. Thak sem BINDUR ALDREI
   maelir ekkert, og "engin breyting" ur slikri frumu vaeri omaeld tala
   sem litur ut eins og maeling. Sama regla og THEKJA-ER-FULLYRDING i
   FPL-CLAUDE.md kafla 5b.
   ============================================================ */
function makeWindowCapBoard(W, A, pos, cap, until, tally = null) {
  const posOf = new Map(W.P.map((p) => [p.id, p.pos]));
  const shifted = [...A.entries()].map(([id, rank]) =>
    [id, posOf.get(id) === pos ? rank + 1e6 : rank]);
  shifted.sort((a, b) => a[1] - b[1]);
  const demoted = new Map(shifted.map(([id], i) => [id, i + 1]));
  return (taken, counts, r) => {
    const bind = r < until && (counts[pos] || 0) >= cap;
    if (tally) { tally.picks++; if (bind) tally.bound++; }
    return bind ? demoted : A;
  };
}

/**
 * GERVI-HOPURINN — NULLID FYRIR THAK.
 *
 * Leikmenn eru skiptir i hop med akvednu hakki ur `(id, seed)` og
 * hopurinn er stilltur ad VERA JAFNSTOR TE-lauginni i sama heimi.
 * Sama thak er sidan sett a hann i somu umferdabondum. Hopurinn ber
 * enga merkingu, svo hvad sem hann maelir er thad sem "thak a ~jafnstoru
 * broti bordsins" getur litid ut fyrir ad vera.
 *
 * HVERS VEGNA JAFNSTOR OG EKKI JAFN-DYR: staerd hopsins stjornar thvi
 * hve oft thakid bindur, sem er nakvaemlega thad sem tharf ad vera eins.
 * Ad para eftir stigum vaeri ad byggja stodu inn i nullid.
 */
function pseudoGroupBoard(W, A, seed, cap, until, tally = null) {
  const teN = W.P.filter((p) => p.pos === "TE").length;
  const frac = teN / Math.max(1, W.N);
  const h32 = (s) => {
    let h = (2166136261 ^ (seed * 16777619)) >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ((h >>> 8) & 0xffff) / 65536;
  };
  const inGroup = new Map(W.P.map((p) => [p.id, h32(p.id) < frac]));
  const shifted = [...A.entries()].map(([id, rank]) =>
    [id, inGroup.get(id) ? rank + 1e6 : rank]);
  shifted.sort((a, b) => a[1] - b[1]);
  const demoted = new Map(shifted.map(([id], i) => [id, i + 1]));
  return {
    board: (taken, counts, r, roster) => {
      /* Gervi-hopurinn er ekki stada, svo `counts` telur hann ekki.
         Hann er talinn ur HOPNUM sjalfum — sami hlutur, onnur leid ad
         honum. */
      let k = 0;
      if (roster) for (const id of roster) if (inGroup.get(id)) k++;
      const bind = r < until && k >= cap;
      if (tally) { tally.picks++; if (bind) tally.bound++; }
      return bind ? demoted : A;
    },
    size: [...inGroup.values()].filter(Boolean).length,
    teSize: teN,
  };
}

/* ---------- PLACEBO-TRUFLUN — ORDRETT UR `band-lab.mjs` ---------- */
function placeboValue(id, season, seed) {
  let h = (2166136261 ^ seed * 16777619) >>> 0;
  const s = `${id}|${season}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const u = ((h >>> 8) & 0xffff) / 65536, v = (h & 0xff) / 256;
  return u + v - 1;
}

/* ---------- ENDURSYND LAUG: KLASI = LEIKMADURINN ---------- */
/** ORDRETT `resampleWorld` ur `band-lab.mjs`. */
function resampleWorld(W, fmt, seed) {
  const rnd = rngOf(seed);
  const N = W.N;
  const P = new Array(N);
  const prior = new Float64Array(N);
  const proj = { [fmt]: new Array(N).fill(null) };
  const adp = { adpPpr: new Array(N).fill(null), adpStd: new Array(N).fill(null) };
  const adpSd = new Array(N).fill(null);
  const byWeek = new Map(), actual = new Map();
  const totAll = new Float64Array(N);
  const src = W.byWeek[fmt], act = W.actual[fmt];
  for (let i = 0; i < N; i++) {
    const o = Math.floor(rnd() * N);
    const op = W.P[o], id = `${op.id}#${i}`;
    P[i] = { id, name: op.name, pos: op.pos };
    prior[i] = W.prior[o];
    proj[fmt][i] = W.proj[fmt][o];
    adp.adpPpr[i] = W.adp.adpPpr[o];
    adp.adpStd[i] = W.adp.adpStd[o];
    adpSd[i] = W.adpSd[o];
    actual.set(id, act.get(op.id));
    totAll[i] = W.totAll[fmt][o];
    for (let k = 1; k <= MAXW; k++) {
      const r = src.get(`${op.id}|${k}`);
      if (r) byWeek.set(`${id}|${k}`, r);
    }
  }
  return { y: W.y, N, P, prior, proj, adp, adpSd,
           byWeek: { [fmt]: byWeek }, actual: { [fmt]: actual },
           totAll: { [fmt]: totAll } };
}

/* ============================================================
   4. VELIN — ORDRETT `runCell` UR `band-lab.mjs`
   ============================================================ */
function runCell({ shape, W, treat, ctrl, runs, seedBase, adpSrc }) {
  const league = shape.league;
  const T = league.teams;
  const fmt = shape.fmt;
  const acc = {
    n: 0, wT: [], wC: [], pfT: [], pfC: [], ssT: [], ssC: [],
    champT: 0, champC: 0, poT: 0, poC: 0,
    weekWinT: 0, weekWinC: 0, weekTie: 0,
  };
  const boardT = treat.board(W);
  const boardC = ctrl.board(W);

  for (let r = 0; r < runs; r++) {
    const seed = (seedBase + W.y * 7919 + r * 104729) >>> 0;
    const field = adpBoard(W, adpSrc, rngOf(seed));
    const schedule = roundRobin(T, REG_WEEKS, rngOf(seed ^ 0x5bf03635));
    for (let i = 1; i <= T; i++) {
      const j = i % T + 1;
      for (const swap of [false, true]) {
        const ti = swap ? j : i, ci = swap ? i : j;
        const boards = new Array(T + 1).fill(field);
        boards[ti] = boardT; boards[ci] = boardC;
        const draft = simulateDraft({ board: field, fieldBoard: field,
          actual: W.actual[fmt], slot: 1, league, boards });
        const S = scoreLeague({ rosters: draft.rosters, byWeek: W.byWeek[fmt],
          league, schedule, regWeeks: REG_WEEKS, playoffWeeks: PO_WEEKS,
          playoffTeams: PO_TEAMS });
        const A = S.rec[ti], B = S.rec[ci];
        acc.n++;
        acc.wT.push(A.w + A.t / 2); acc.wC.push(B.w + B.t / 2);
        acc.pfT.push(A.pf); acc.pfC.push(B.pf);
        acc.ssT.push(startersPoints(draft.rosters[ti], W.actual[fmt], league));
        acc.ssC.push(startersPoints(draft.rosters[ci], W.actual[fmt], league));
        if (S.champion === ti) acc.champT++;
        if (S.champion === ci) acc.champC++;
        if (S.seeds.indexOf(ti) < PO_TEAMS) acc.poT++;
        if (S.seeds.indexOf(ci) < PO_TEAMS) acc.poC++;
        for (let w = 1; w <= REG_WEEKS; w++) {
          const a = S.scores[ti][w], b = S.scores[ci][w];
          if (a > b) acc.weekWinT++; else if (b > a) acc.weekWinC++; else acc.weekTie++;
        }
      }
    }
  }
  return acc;
}

function cellStats(acc) {
  const wd = acc.wT.map((v, i) => v - acc.wC[i]);
  const sd = acc.ssT.map((v, i) => v - acc.ssC[i]);
  return {
    leagues: acc.n,
    winsT: r3(mean(acc.wT)), winsC: r3(mean(acc.wC)), winsDiff: r3(mean(wd)),
    seasonT: r1(mean(acc.ssT)), seasonC: r1(mean(acc.ssC)), seasonDiff: r1(mean(sd)),
    pfDiff: r1(mean(acc.pfT) - mean(acc.pfC)),
    champT: r3(acc.champT / acc.n), champC: r3(acc.champC / acc.n),
    champDiff: r3((acc.champT - acc.champC) / acc.n),
    poDiff: r3((acc.poT - acc.poC) / acc.n),
    weekWinRate: r3(acc.weekWinT / Math.max(1, acc.weekWinT + acc.weekWinC)),
  };
}

function boot(perYear, keyT, keyC) {
  const A = {}, B = {};
  for (const [y, c] of Object.entries(perYear)) {
    if (c[keyT] == null || c[keyC] == null) continue;
    A[y] = c[keyT]; B[y] = c[keyC];
  }
  const bd = bootstrapDiff(A, B, BOOT);
  const d = Object.keys(A).map((y) => A[y] - B[y]);
  if (!d.length) {
    return { diff: null, lo: null, hi: null, excludesZero: null, t: null,
             wins: 0, years: 0, why: "engin timabil" };
  }
  return bd ? { diff: r3(bd.diff), lo: r3(bd.lo), hi: r3(bd.hi),
                excludesZero: bd.excludesZero, t: tOf(d),
                wins: d.filter((x) => x > 0).length, years: d.length,
                per: Object.fromEntries(Object.keys(A).map((y, i) => [y, r3(d[i])])) }
            : { diff: r3(mean(d)), lo: null, hi: null, excludesZero: null,
                t: tOf(d), wins: d.filter((x) => x > 0).length, years: d.length,
                why: "faerri en 3 timabil — ENGIN vikmork" };
}

function bootZero(per, iters = BOOT) {
  const A = {}, Z = {};
  for (const [y, v] of Object.entries(per)) {
    if (v == null || !Number.isFinite(v)) continue;
    A[y] = v; Z[y] = 0;
  }
  const vals = Object.values(A);
  if (!vals.length) {
    return { mean: null, t: null, wins: 0, years: 0, lo: null, hi: null,
             excludesZero: null, why: "engin timabil" };
  }
  const b = bootstrapDiff(A, Z, iters, 777);
  return { mean: r3(mean(vals)), t: tOf(vals),
           wins: vals.filter((x) => x > 0).length, years: vals.length,
           lo: b ? r3(b.lo) : null, hi: b ? r3(b.hi) : null,
           excludesZero: b ? b.excludesZero : null,
           per: Object.fromEntries(Object.entries(A).map(([k, v]) => [k, r3(v)])) };
}

/* ============================================================
   5. Q1 — SUNDURLIDUN TE-HALLANS A LIFANDI BORDINU
   ============================================================
   HVERS VEGNA THETTA ER GERT MED `buildRows` OG EKKI MED EIGIN VBD:
   `computeVbd` kallar `replacementRanks` INNAN sinnar einingar, svo
   ekkert utanad getur skipt henni ut, og endurutfaersla a VBD hér
   vaeri afrit af formulu — nakvaemlega su villa sem `buildTeamMetrics`
   kostadi i FPL-verkefninu. Leidin er thvi PATCHAD AFRIT, ordrett
   adferd `flexsplit-lab.mjs`: `src/model.js` med annarri
   `FLEX_SPLIT`-linu (gegnum `lib/te-sweep.mjs`, sem hefur thegar
   thrju hlid a patchid) og `src/build.js` med innflutningi sinum
   beygdum a thad afrit.

   THRIR THAETTIR, FJORAR SAMSETNINGAR:
     · te   : `FLEX_SPLIT.TE` = 0,193 (sent) eda 0 (TE fær engan flex)
     · grunnur: `value` = (adp - aRank)/teams, thar sem `adp` er
       ALGILD draftstada yfir ALLA (thar med K, DST og menn sem vid
       rodum ekki) medan `aRank` er ThETT rod 1..n yfir RODUDU
       radirnar EINAR. Rett samanburd er thett rod BEGGJA. Sama
       breyting, tvaer utfaerslur af sama dalki.
     · leifin: thad sem stendur eftir thegar badir eru fjarlaegdir. Hun
       er SPA-HEIMILDIN — hve rausnarleg hun er vid djupa thett-enda
       gagnvart ADP theirra.

   HLUTIR ERU EKKI SAMLAGNANLEGIR I ROD, SVO BADAR RADIR ERU BIRTAR
   og bokada framlagid er MEDALTAL theirra (Shapley a tveimur
   thattum). Ein rod ein hefdi verid val a rod.
   ============================================================ */
/**
 * `loadTeModels` ER KOLLUD EINU SINNI MED BADUM GILDUM — ekki tvisvar
 * med einu. Hlid 3 i thvi falli krefst thess ad MINNST TVO te-gildi gefi
 * olik varamanns-threp, svo kall med einu gildi deyr, og RETT: eitt gildi
 * getur ekki sannad ad patchid bíti. Sundurlidunin tharf hvort eð er
 * badar hlidar i somu ferd.
 */
async function patchedBuilds(grid) {
  await mkdir(TMP, { recursive: true });
  const models = await loadTeModels(grid);
  const bsrc = await readFile(path.join(ROOT, "src", "build.js"), "utf8");
  if (!bsrc.includes('from "./model.js"')) {
    throw new Error("tepos-lab: build.js flytur ekki inn ./model.js — patchid er dautt");
  }
  const out = new Map();
  for (const te of grid) {
    const p = path.join(TMP, `build_te_${String(te).replace(".", "p")}.js`);
    /* ALLIR AFSTAEDIR INNFLUTNINGAR ERU FAERDIR, EKKI ADEINS `model.js`.
       Afritid situr i `.cache-nfl/`, svo `./scoring.js` leysist thar og
       ekki i `src/`. `flexsplit-lab.mjs` skiptir ADEINS a `./model.js`
       og var skrifad thegar `build.js` flutti ekkert annad inn afstaett;
       `./scoring.js` kom sidan og THVI FELLUR HUN NU MED
       ERR_MODULE_NOT_FOUND. Thetta er thess vegna almennt hér: hver
       `from "./x"` er faerdur i algilda slod inn i `src/`, svo ny
       innflutningslina i `build.js` geti ekki brotid sundurlidunina
       thegjandi. */
    let patched = bsrc.replace(/from "\.\/([^"]+)"/g,
      (_m, f) => `from ${JSON.stringify(path.join(ROOT, "src", f))}`);
    patched = patched.replace(
      JSON.stringify(path.join(ROOT, "src", "model.js")),
      JSON.stringify(models.get(te).path));
    if (patched.includes('from "./')) {
      throw new Error("tepos-lab: afstaedur innflutningur eftir i patchada build.js");
    }
    if (!patched.includes(models.get(te).path)) {
      throw new Error("tepos-lab: model.js-innflutningur var EKKI beygdur a patchada afritid");
    }
    await writeFile(p, patched);
    const mod = await import(p);
    out.set(te, { buildRows: mod.buildRows, split: models.get(te).split,
      replacementRanks: models.get(te).replacementRanks });
  }
  return out;
}

/** Thett rod ur tolugildi; null situr sidast og fær null. */
function denseRankOf(rows, get) {
  const withV = rows.filter((r) => get(r) != null && Number.isFinite(get(r)))
    .slice().sort((a, b) => get(a) - get(b));
  const m = new Map();
  withV.forEach((r, i) => m.set(r.id, i + 1));
  return m;
}

/**
 * `mean(markadsrod - okkar rod)` per stodu. Jakvaett = VID rodum honum
 * FYRR en markadurinn.
 *
 * ÞYÐIÐ ER FAST YFIR OLL THREPIN og thad er forsendan: hver rod hefur
 * sina eigin "draftanlegu" laug, og vaeri hun notud per threpi vaeri
 * hluti munarins ADRIR MENN i stad annarrar RADAR. `keep` er thvi
 * reiknad EINU SINNI ur sendu rodinni og gildir um alla fjora threp.
 * `restrict = false` gefur allt bordid — thad er su lesning sem README
 * 4l bokar og hun er birt lika, thvi tolurnar tvaer eru ekki eins og
 * mega ekki liggja undir sama nafni.
 */
function skewTable(rows, league, adpRankOf, ourRankOf, keep) {
  const per = {};
  for (const pos of POSES) per[pos] = [];
  for (const r of rows) {
    if (keep && !keep.has(r.id)) continue;
    const o = ourRankOf(r);
    const a = adpRankOf(r);
    if (o == null || a == null) continue;
    if (!per[r.pos]) continue;
    per[r.pos].push(a - o);
  }
  const out = {};
  for (const pos of POSES) {
    out[pos] = { n: per[pos].length, meanSlots: r1(per[pos].length ? mean(per[pos]) : null),
      medianSlots: r1(median(per[pos])),
      meanRounds: r2(per[pos].length ? mean(per[pos]) / league.teams : null) };
  }
  out.__gapTeWr = r1(out.TE.meanSlots != null && out.WR.meanSlots != null
    ? out.TE.meanSlots - out.WR.meanSlots : null);
  out.__gapTeSkill = r1(out.TE.meanSlots != null
    ? out.TE.meanSlots - mean([out.RB.meanSlots, out.WR.meanSlots]) : null);
  return out;
}

/* ============================================================
   MAIN
   ============================================================ */
async function main() {
  const t0 = Date.now();
  const { weekly, seasons, feats, bookedH2h, bookedBand } = await loadInputs();
  requireSeasons(seasons, "vikuskrar");

  const featIdx = new Map();
  for (const r of feats.rows) featIdx.set(`${r.season}|${r.id}|${r.scoring}`, r);

  const worlds = {};
  for (const y of seasons) worlds[y] = buildWorld(y, weekly, featIdx);
  const ys = seasons.slice();
  const sleeperYears = ys.filter((y) => worlds[y].coverage.sleeperProjected >= 100);

  const repl = {};
  for (const sh of SHAPES) repl[sh.key] = replacementRanks({ ...sh.league, scoring: sh.fmt });
  const shapeOf = Object.fromEntries(SHAPES.map((s) => [s.key, s]));

  console.log(`\ntimabil: ${ys.join(", ")}   (Sleeper: ${sleeperYears.join(", ")})`);
  for (const sh of SHAPES) {
    console.log(`  ${sh.key.padEnd(10)} repl ${JSON.stringify(repl[sh.key])}`);
  }

  /* ============================================================
     Q1. SUNDURLIDUN A LIFANDI BORDINU — LYSING, EKKI MAELING
     ============================================================ */
  console.log(`\n${"=".repeat(76)}\n  Q1. HVADAN KEMUR TE-HALLINN? (lifandi bord — LYSING)\n${"=".repeat(76)}`);
  const q1 = { kind: "descriptive", shapes: {} };
  {
    const rd = async (f) => JSON.parse(await readFile(path.join(DATA, f), "utf8"));
    const players = await rd("players.json");
    const seasonsFile = await rd("seasons.json");
    const schedule = await rd("schedule.json");
    const market = await rd("market.json");

    const builds = await patchedBuilds([0, TE_SHIPPED]);
    const shipped = builds.get(TE_SHIPPED);
    const te0 = builds.get(0);
    /* HLID: patchid verdur ad BITA. Vid te = 0 ma TE-threpid ekki vera
       thad sama og vid sendu gildi, ella les hver tala her "engin
       breyting" af rangri astaedu. */
    {
      const probe = { teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
        flexPos: ["RB", "WR", "TE"] };
      const a = shipped.replacementRanks(probe);
      const b = te0.replacementRanks(probe);
      if (a.TE === b.TE) {
        console.error(`\n  Q1-HLID FELLUR: te=0 og te=0,193 gefa SAMA TE-threp (${a.TE})\n`);
        process.exit(2);
      }
      q1.patchGate = { shippedTe: a.TE, te0: b.TE, ok: true };
      console.log(`  hlid: TE-threp ${a.TE} (sent) gegn ${b.TE} (te=0) — patchid bitur`);
    }

    for (const key of REAL) {
      const sh = shapeOf[key];
      const league = { scoring: sh.fmt === "half" ? "half-ppr" : sh.fmt, ...sh.league };
      const rowsS = shipped.buildRows({ players, seasons: seasonsFile, schedule, market, league }).rows;
      const rowsT = te0.buildRows({ players, seasons: seasonsFile, schedule, market, league }).rows;

      /* ============================================================
         FJOGUR THREP, EIN LEID — OG HVERT SKREF ER EINN THATTUR
         ============================================================
         L0  hra spa-rod   (`sleeperRank` ur `buildRows` — SPA-HEIMILDIN
             ein, engin VBD-umbreyting)
         L1  VBD med te = 0  (varamanns-threp TE = TE10, nakvaemlega
             byrjunarsaetin, ENGIN flex-hlutdeild)
         L2  VBD med sendu te = 0,193
         L3  = L2 en borid vid ALGILDA ADP i stad thettrar — thad er
             dalkurinn sem appid BIRTIR

         Skrefin eru thvi:
           L0            = spa-heimildin gegn markadinum
           L1 - L0       = VBD-UMBREYTINGIN sjalf (stodu-threpin)
           L2 - L1       = FLEX_SPLIT.TE
           L3 - L2       = grunn-skekkja `value`-dalksins

         HVERS VEGNA KEDJA OG EKKI SHAPLEY YFIR TVO THAETTI: fyrsta
         utgafa thessa reits hafdi tvo thaetti (te og grunn) og kalladi
         LEIFINA "spa-heimildina". Su tala var 53,4 saeti og hun las
         eins og heimildin vaeri rausnarleg vid thett-enda. Q1b maelir
         heimildina EINA og hun er thad EKKI (TE-WR -10,9). Leifin var
         thvi ekki heimildin heldur VBD sjalft, og nafnid hefdi verid
         omaeld tala sem litur ut eins og maeling. L0 er nu maelt i
         stad thess ad vera afgangur.
         ============================================================ */
      const denseS = denseRankOf(rowsS.filter((r) => r.aRank != null), (r) => r.adp);
      const byIdT = new Map(rowsT.map((r) => [r.id, r]));

      /* ÞYÐIÐ: draftanlegt bil SENDU rodarinnar. Fast yfir oll threpin. */
      const cap = sh.league.teams * sh.league.rounds;
      const keep = new Set(rowsS.filter((r) => r.aRank != null && r.aRank <= cap
        && r.adp != null).map((r) => r.id));

      const adpDense = (r) => denseS.get(r.id) ?? null;
      const adpRaw = (r) => r.adp;
      const levels = {
        L0_projectionOnly: skewTable(rowsS, sh.league, adpDense, (r) => r.sleeperRank, keep),
        L1_vbdTe0:         skewTable(rowsS, sh.league, adpDense,
                             (r) => (byIdT.get(r.id) ? byIdT.get(r.id).aRank : null), keep),
        L2_vbdShipped:     skewTable(rowsS, sh.league, adpDense, (r) => r.aRank, keep),
        L3_shippedColumn:  skewTable(rowsS, sh.league, adpRaw, (r) => r.aRank, keep),
      };
      /* README 4l bokar toluna A ALLU BORDINU, ekki adeins i
         draftanlegu bilinu, og thaer eru EKKI sama tala. Badar eru
         birtar svo hvorug geti lesist undir nafni hinnar. */
      const wholeBoard = {
        L2_vbdShipped:    skewTable(rowsS, sh.league, adpDense, (r) => r.aRank, null),
        L3_shippedColumn: skewTable(rowsS, sh.league, adpRaw, (r) => r.aRank, null),
        L1_vbdTe0:        skewTable(rowsS, sh.league, adpDense,
                            (r) => (byIdT.get(r.id) ? byIdT.get(r.id).aRank : null), null),
      };
      const cfg = levels;

      const g = (k) => levels[k].__gapTeWr;
      const srcContrib = g("L0_projectionOnly");
      const vbdContrib = g("L1_vbdTe0") - g("L0_projectionOnly");
      const teContrib = g("L2_vbdShipped") - g("L1_vbdTe0");
      const basisContrib = g("L3_shippedColumn") - g("L2_vbdShipped");
      const residual = srcContrib;
      const total = g("L3_shippedColumn");
      const check = r1(srcContrib + vbdContrib + teContrib + basisContrib);

      /* GRUNN-SKEKKJAN SJALF, I UMFERDUM: hve mikid `value` er blasid
         upp vegna thess ad `aRank` er thett en `adp` algild. Maeld a
         DJUPUM monnum, thvi thar er skekkjan — hun er nanast null i
         toppnum thar sem laugarnar skarast. */
      const infl = rowsS.filter((r) => r.aRank != null && r.adp != null && denseS.get(r.id) != null)
        .map((r) => ({ pos: r.pos, adp: r.adp,
          rounds: (r.adp - denseS.get(r.id)) / sh.league.teams }));
      const deep = infl.filter((x) => x.adp > 100);
      const basisDefect = {
        note: "value inflation from the dense-vs-absolute basis, in rounds; "
          + "positive = the shipped column reads richer than it should",
        allMedianRounds: r2(median(infl.map((x) => x.rounds))),
        deepAdpOver100MedianRounds: r2(median(deep.map((x) => x.rounds))),
        byPosDeepMedianRounds: Object.fromEntries(POSES.map((p) =>
          [p, r2(median(deep.filter((x) => x.pos === p).map((x) => x.rounds)))])),
      };

      q1.shapes[key] = {
        label: sh.label, levels: cfg, wholeBoard,
        population: { keptPlayers: keep.size, draftableCap: cap },
        decomposition: {
          unit: "board slots; TE minus WR of mean(market rank - our rank)",
          totalGapTeMinusWrSlots: r1(total),
          totalGapTeMinusWrRounds: r2(total / sh.league.teams),
          fromProjectionSource: r1(srcContrib),
          fromVbdTransform: r1(vbdContrib),
          fromFlexSplitTe: r1(teContrib),
          fromValueBasisDefect: r1(basisContrib),
          sumCheck: check, identity: Math.abs(check - r1(total)) < 0.15,
          shareProjection: r2(total ? srcContrib / total : null),
          shareVbdTransform: r2(total ? vbdContrib / total : null),
          shareFlexSplit: r2(total ? teContrib / total : null),
          shareBasis: r2(total ? basisContrib / total : null),
          roundsFromFlexSplitTe: r2(teContrib / sh.league.teams),
          roundsFromVbdTransform: r2(vbdContrib / sh.league.teams),
          roundsFromValueBasisDefect: r2(basisContrib / sh.league.teams),
          roundsFromProjectionSource: r2(srcContrib / sh.league.teams),
        },
        basisDefect,
      };

      const d = q1.shapes[key].decomposition;
      console.log(`\n  ${sh.label}   (thyði ${keep.size} leikmenn, aRank <= ${cap})`);
      console.log(`    mean(markadsrod - okkar rod) i saetum:`);
      for (const [ck, cv] of Object.entries(cfg)) {
        console.log(`      ${ck.padEnd(18)} QB ${sgn(cv.QB.meanSlots, 1).padStart(7)}  ` +
          `RB ${sgn(cv.RB.meanSlots, 1).padStart(7)}  WR ${sgn(cv.WR.meanSlots, 1).padStart(7)}  ` +
          `TE ${sgn(cv.TE.meanSlots, 1).padStart(7)}   TE-WR ${sgn(cv.__gapTeWr, 1)}`);
      }
      console.log(`    SUNDURLIDUN a TE-WR bilinu (${r1(total)} saeti = ` +
        `${r2(total / sh.league.teams)} umferdir):`);
      const pc = (x) => `${(x * 100).toFixed(0)}%`.padStart(5);
      console.log(`      spa-heimildin        ${sgn(d.fromProjectionSource, 1).padStart(7)} saeti ${pc(d.shareProjection)}  (${sgn(d.roundsFromProjectionSource, 2)} umferdir)`);
      console.log(`      VBD-umbreytingin     ${sgn(d.fromVbdTransform, 1).padStart(7)} saeti ${pc(d.shareVbdTransform)}  (${sgn(d.roundsFromVbdTransform, 2)} umferdir)`);
      console.log(`      FLEX_SPLIT.TE        ${sgn(d.fromFlexSplitTe, 1).padStart(7)} saeti ${pc(d.shareFlexSplit)}  (${sgn(d.roundsFromFlexSplitTe, 2)} umferdir)`);
      console.log(`      grunnur value-dalks  ${sgn(d.fromValueBasisDefect, 1).padStart(7)} saeti ${pc(d.shareBasis)}  (${sgn(d.roundsFromValueBasisDefect, 2)} umferdir)`);
      console.log(`      summa ${sgn(check, 1)} gegn ${sgn(total, 1)} -> ` +
        (d.identity ? "SAMLAGNANLEGT" : "REKUR"));
      console.log(`    allt bordid (README 4l-lesningin): TE-WR ` +
        `${sgn(wholeBoard.L3_shippedColumn.__gapTeWr, 1)} sent, ` +
        `${sgn(wholeBoard.L1_vbdTe0.__gapTeWr, 1)} vid te=0`);
      console.log(`    grunn-skekkja: midgildi ${basisDefect.allMedianRounds} umferdir ` +
        `(ADP>100: ${basisDefect.deepAdpOver100MedianRounds}; ` +
        `per stodu ${JSON.stringify(basisDefect.byPosDeepMedianRounds)})`);
    }

    /* SPA-HEIMILDIN SEM SLIK — sogulega, ur `features.json`. Hun er
       ThRIDJI thatturinn i sundurlidunni og her er hann maeldur SER:
       hve djupt spair hvor heimild thett-endum gagnvart ADP theirra? */
    /* ÞYÐIÐ VERDUR AD VERA THAD SAMA OG I L0, ANNARS ER THETTA EKKI
       SOMU TALA. L0 er maelt i DRAFTANLEGA BILINU (148 menn af 556);
       fyrsta utgafa thessa reits maeldi allan pollinn og gaf TE-WR
       -10,9 thar sem L0 gaf +37,1. Su motsogn var ekki uppgotvun heldur
       tvaer olikar laugar undir sama nafni — nakvaemlega gildran sem
       "allt bordid gegn draftanlegu bili" er hér fyrir ofan. Baðar eru
       thvi birtar, MERKTAR, og `draftable` er su sem er sambaerileg. */
    const srcOf = (restrictTo) => {
      const src = {};
      for (const which of ["sleeper", "fftoday"]) {
        const per = {};
        for (const pos of POSES) per[pos] = [];
        let n = 0, poolN = 0;
        for (const y of ys) {
          const W = worlds[y];
          const pv = which === "sleeper" ? W.projSlp.ppr : W.projFf.ppr;
          /* Rod innan HEIMILDAR yfir alla sem hun spair, og rod ADP innan
             SOMU laugar — thett gegn thettu, svo grunn-skekkjan se ekki
             inni i thessari tolu. */
          let pool = [];
          for (let i = 0; i < W.N; i++) {
            if (pv[i] == null || W.adp.adpPpr[i] == null) continue;
            pool.push({ pos: W.P[i].pos, p: pv[i], a: W.adp.adpPpr[i] });
          }
          if (pool.length < 50) continue;
          n++;
          const byP = pool.slice().sort((x, z) => z.p - x.p);
          byP.forEach((r, i) => { r.pr = i + 1; });
          const byA = pool.slice().sort((x, z) => x.a - z.a);
          byA.forEach((r, i) => { r.ar = i + 1; });
          if (restrictTo) pool = pool.filter((r) => r.ar <= restrictTo);
          poolN += pool.length;
          for (const r of pool) if (per[r.pos]) per[r.pos].push(r.ar - r.pr);
        }
        src[which] = { seasons: n, pooledPlayers: poolN,
          ...Object.fromEntries(POSES.map((p) =>
            [p, { n: per[p].length, meanSlots: r1(per[p].length ? mean(per[p]) : null) }])) };
        src[which].gapTeWr = r1(src[which].TE.meanSlots != null && src[which].WR.meanSlots != null
          ? src[which].TE.meanSlots - src[which].WR.meanSlots : null);
      }
      return src;
    };
    const srcDraft = srcOf(150), srcAll = srcOf(null);
    q1.projectionSource = {
      note: "dense projection rank versus dense ADP rank in the SAME pool, so "
        + "the basis defect and FLEX_SPLIT are both out. Positive = the source "
        + "ranks the position richer than the market does. `draftable` is the "
        + "population comparable to L0 (top 150 by ADP); `wholePool` is every "
        + "player the source projects and is NOT comparable to L0.",
      draftable: srcDraft,
      wholePool: srcAll,
      liveBoardL0GapTeWr: Object.fromEntries(REAL.map((k) =>
        [k, q1.shapes[k] ? q1.shapes[k].levels.L0_projectionOnly.__gapTeWr : null])),
    };
    console.log(`\n  Q1b SPA-HEIMILDIN EIN (thett gegn thettu, hvorki VBD ne grunn-skekkja):`);
    console.log(`      draftanlegt bil (topp 150 eftir ADP) — SAMBAERILEGT vid L0:`);
    for (const [k, v] of Object.entries(srcDraft)) {
      console.log(`        ${k.padEnd(9)} (${v.seasons} ar, ${v.pooledPlayers} menn)  ` + POSES.map((p) =>
        `${p} ${sgn(v[p].meanSlots, 1)}`).join("  ") + `   TE-WR ${sgn(v.gapTeWr, 1)}`);
    }
    console.log(`      allur pollurinn — EKKI sambaerilegt vid L0:`);
    for (const [k, v] of Object.entries(srcAll)) {
      console.log(`        ${k.padEnd(9)} (${v.seasons} ar)  ` + POSES.map((p) =>
        `${p} ${sgn(v[p].meanSlots, 1)}`).join("  ") + `   TE-WR ${sgn(v.gapTeWr, 1)}`);
    }
    console.log(`      lifandi bordid (L0): ` + REAL.map((k) =>
      `${k} ${sgn(q1.shapes[k].levels.L0_projectionOnly.__gapTeWr, 1)}`).join("  "));
  }

  if (NO_OUTCOME) {
    const out = {
      generated: new Date().toISOString(),
      provenance: stamp({ argv: process.argv.slice(2), defaults: DEFAULTS,
        inputs: ["players.json", "features.json", "measure/band.json",
          ...ys.map((y) => `weekly/${y}.json`)], dataDir: DATA }),
      phase: "decomposition only (--noOutcome) — Q2/Q3 NOT RUN",
      question: Q_TEXT, design: DESIGN_TEXT,
      seasons: ys, sleeperSeasons: sleeperYears, replacementRanks: repl,
      q1, runtimeSec: r1((Date.now() - t0) / 1000),
    };
    await mkdir(path.join(DATA, "measure"), { recursive: true });
    await writeFile(path.join(DATA, "measure", "tepos.json"), JSON.stringify(out, null, 1));
    console.log(`\n-> data/measure/tepos.json  (ADEINS Q1, ${out.runtimeSec}s)`);
    return;
  }

  /* ============================================================
     N-HLIDIN
     ============================================================ */
  console.log(`\n${"=".repeat(76)}\n  N. HLIDIN\n${"=".repeat(76)}`);
  const gates = {};
  let fatal = null;

  const cell = ({ shape, treat, ctrl, runs = RUNS, seedBase = 11, years = ys }) => {
    const perYear = {};
    for (const y of years) {
      perYear[y] = cellStats(runCell({ shape, W: worlds[y], treat, ctrl, runs,
        seedBase, adpSrc: ADP_SRC[shape.fmt] }));
    }
    return { perYear };
  };
  const A_OF = (sh) => ({ board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) });

  /* N1 SJALFSPROF. */
  {
    const sh = shapeOf["10-2flex"];
    const { perYear } = cell({ shape: sh, treat: A_OF(sh), ctrl: A_OF(sh), runs: 1 });
    const w = mean(Object.values(perYear).map((c) => c.winsDiff));
    const s = mean(Object.values(perYear).map((c) => c.seasonDiff));
    gates.n1_self = { winsDiff: r3(w), seasonDiff: r1(s), ok: w === 0 && s === 0 };
    console.log(`  N1 sjalfsprof (A gegn A)         wins ${sgn(w)} stig ${sgn(s, 1)}  ` +
      (gates.n1_self.ok ? "OK" : "FELLUR"));
    if (!gates.n1_self.ok) fatal = "N1: sjalfsprofid gefur ekki 0";
  }

  /* N2 THAK SEM ER OBINDANDI ER BITAEINS A. `cap` haerra en `maxPos`
     getur aldrei bundid, svo bordid VERDUR ad vera A i hverju vali. */
  {
    const sh = shapeOf["10-2flex"];
    const W = worlds[ys[0]];
    const A = arankBoard(W, sh.fmt, repl[sh.key]);
    const tally = { picks: 0, bound: 0 };
    const B = makeWindowCapBoard(W, A, "TE", 99, 99, tally);
    const got = B(new Set(), {}, 0);
    let same = got.size === A.size;
    if (same) for (const [k, v] of A) if (got.get(k) !== v) { same = false; break; }
    gates.n2_capNeverBinds = { identical: same, bound: tally.bound };
    console.log(`  N2 obindandi thak er BITAEINS A  ${same && tally.bound === 0 ? "OK" : "FELLUR"}`);
    if (!same || tally.bound) fatal = "N2: obindandi thak gaf annad bord en A";
  }

  /* N4 AKKERI I BADA ENDA. */
  {
    const sh = shapeOf["10-2flex"];
    const src = ADP_SRC[sh.fmt];
    const or = cell({ shape: sh, treat: { board: (X) => oracleBoard(X, sh.fmt) },
      ctrl: A_OF(sh), runs: 1 });
    const rv = cell({ shape: sh, treat: { board: (X) => reverseBoard(X, src) },
      ctrl: A_OF(sh), runs: 1 });
    const ow = mean(Object.values(or.perYear).map((c) => c.winsDiff));
    const rw = mean(Object.values(rv.perYear).map((c) => c.winsDiff));
    gates.n4_anchors = { oracleWins: r3(ow), reverseWins: r3(rw), ok: ow > 1 && rw < -1 };
    console.log(`  N4 akkeri: orakel ${sgn(ow)} · andhverft ADP ${sgn(rw)}  ` +
      (gates.n4_anchors.ok ? "OK" : "FELLUR"));
    if (!gates.n4_anchors.ok) fatal = "N4: akkerin bera ekki merkid";
  }

  /* N3 THVERT AKKERI A HEIMINN — A-Ranking gegn ADP gegn `h2h.json`. */
  {
    const out = {};
    for (const key of REAL) {
      const sh = shapeOf[key];
      const src = ADP_SRC[sh.fmt];
      const { perYear } = cell({ shape: sh, treat: A_OF(sh),
        ctrl: { board: (X) => adpBoard(X, src) }, runs: 2, years: sleeperYears });
      const w = boot(perYear, "winsT", "winsC");
      const s = boot(perYear, "seasonT", "seasonC");
      const bk = bookedH2h && bookedH2h.q1 && bookedH2h.q1[key] && bookedH2h.q1[key][src]
        && bookedH2h.q1[key][src].adp;
      out[key] = { wins: w.diff, season: s.diff, years: w.years,
        bookedWins: bk ? bk.wins.diff : null,
        bookedSeason: bk ? bk.seasonPoints.diff : null };
      console.log(`  N3 ${key.padEnd(10)} A gegn ADP  sigrar ${sgn(w.diff)} ` +
        `(bokad ${sgn(out[key].bookedWins)})  stig ${sgn(s.diff, 1)} (bokad ${sgn(out[key].bookedSeason, 1)})`);
    }
    const bad = Object.entries(out).filter(([, v]) =>
      v.bookedWins == null || v.wins == null ||
      Math.sign(v.wins) !== Math.sign(v.bookedWins) ||
      Math.abs(v.wins - v.bookedWins) > 0.4 * Math.abs(v.bookedWins) + 0.5);
    gates.n3_crossAnchor = { perShape: out, ok: bad.length === 0, failed: bad.map(([k]) => k) };
    console.log(`  N3 thvert akkeri a heiminn       ${bad.length === 0 ? "OK" : `FELLUR (${bad.map(([k]) => k)})`}`);
    if (bad.length) fatal = `N3: heimurinn er ekki i fari vid h2h.json (${bad.map(([k]) => k)})`;
  }

  /* ============================================================
     N5 THVERT AKKERI A THAK-KODANN SJALFAN
     ============================================================
     `band.json -> q2b` ber "TE max 1" fyrir ALLT draftid, maelt med
     seedBase 505 og sama `runs`. Fruman `TE cap=1 until=99` her fer
     gegnum `makeWindowCapBoard` i stad `makeCapBoard`, svo hun MA EKKI
     gefa adra tolu. Thetta er sterkara hlid en N3: thad profar
     nakvaemlega thann koda sem er nyr.
     ============================================================ */
  {
    const out = {}; const bad = [];
    for (const key of REAL) {
      const sh = shapeOf[key];
      const tally = { picks: 0, bound: 0 };
      const { perYear } = cell({ shape: sh, seedBase: 505,
        treat: { board: (X) => makeWindowCapBoard(X,
          arankBoard(X, sh.fmt, repl[sh.key]), "TE", 1, 99, tally) },
        ctrl: A_OF(sh) });
      const w = boot(perYear, "winsT", "winsC");
      const s = boot(perYear, "seasonT", "seasonC");
      const bk = bookedBand && bookedBand.q2b && bookedBand.q2b[key]
        && bookedBand.q2b[key].rows.find((r) => r.pos === "TE" && r.cap === 1);
      out[key] = { wins: w.diff, season: s.diff,
        bookedWins: bk ? bk.wins.diff : null, bookedSeason: bk ? bk.season.diff : null };
      /* Sami `seedBase`, sami `runs`, sami heimur -> talan a ad vera
         NAKVAEMLEGA su sama. Vikmorkin eru thvi hord (1e-6), ekki
         "i sama fari". */
      if (bk == null || w.diff == null || Math.abs(w.diff - bk.wins.diff) > 1e-6
          || Math.abs(s.diff - bk.season.diff) > 1e-6) bad.push(key);
      console.log(`  N5 ${key.padEnd(10)} TE<=1 allt draftid  sigrar ${sgn(w.diff)} ` +
        `(bokad ${sgn(out[key].bookedWins)})  stig ${sgn(s.diff, 1)} (bokad ${sgn(out[key].bookedSeason, 1)})`);
    }
    gates.n5_capCrossAnchor = { perShape: out, ok: bad.length === 0, failed: bad };
    console.log(`  N5 thvert akkeri a THAK-KODANN   ${bad.length === 0 ? "OK" : `FELLUR (${bad})`}`);
    if (bad.length) {
      fatal = `N5: makeWindowCapBoard(until=99) endurgerir EKKI bokada q2b-toluna (${bad}) `
        + "— nyi kodinn maelir annad en `makeCapBoard`";
    }
  }

  if (fatal) { console.error(`\n  ${fatal}\n`); process.exit(2); }

  /* ============================================================
     Q2. THOKIN — TE OG VIDMIDIN (RB/WR)
     ============================================================ */
  console.log(`\n${"=".repeat(76)}\n  Q2. THAK A EINNI STODU I FYRSTU UMFERDUM\n${"=".repeat(76)}`);
  console.log(`  jakvaed tala = ad NEITA ser um seinni manninn a stodunni SLAER sent bord\n`);
  const WINDOWS = [
    { key: "r1-3", until: 3, label: "umferdir 1-3" },
    { key: "r1-7", until: 7, label: "fyrir 8. umferd" },
    { key: "all", until: 99, label: "allt draftid" },
  ];
  const CAP_POS = ["TE", "RB", "WR"];
  const q2 = {};
  for (const key of REAL) {
    const sh = shapeOf[key];
    q2[key] = { label: sh.label, rows: [] };
    console.log(`  ${sh.label}`);
    for (const pos of CAP_POS) {
      for (const wd of WINDOWS) {
        const tally = { picks: 0, bound: 0 };
        const treat = { board: (X) => makeWindowCapBoard(X,
          arankBoard(X, sh.fmt, repl[sh.key]), pos, 1, wd.until, tally) };
        const { perYear } = cell({ shape: sh, treat, ctrl: A_OF(sh), seedBase: 1301 });
        const w = boot(perYear, "winsT", "winsC");
        const s = boot(perYear, "seasonT", "seasonC");
        const slp = {}; for (const y of sleeperYears) slp[y] = perYear[y];
        q2[key].rows.push({ pos, cap: 1, window: wd.key, until: wd.until,
          label: `${pos} <= 1, ${wd.label}`,
          bindRate: r3(tally.picks ? tally.bound / tally.picks : null),
          bindPicks: tally.bound, picks: tally.picks,
          wins: w, season: s, champ: boot(perYear, "champT", "champC"),
          sleeperOnly: { wins: boot(slp, "winsT", "winsC"),
                         season: boot(slp, "seasonT", "seasonC") },
          perYear });
        console.log(`    ${pos} <=1 ${wd.label.padEnd(16)} bindur ${(100 * (tally.bound / Math.max(1, tally.picks))).toFixed(1)}%  ` +
          `${sgn(w.diff)} [${sgn(w.lo)}, ${sgn(w.hi)}] t=${sgn(w.t)} ${w.wins}/${w.years}` +
          `${w.excludesZero ? " SIG" : "    "}  ${sgn(s.diff, 1)} [${sgn(s.lo, 1)}, ${sgn(s.hi, 1)}] ` +
          `${s.wins}/${s.years}${s.excludesZero ? " SIG" : ""}`);
      }
    }
    /* HLID: thak sem BINDUR ALDREI maelir ekkert. Tha er talan
       "engin breyting" af rangri astaedu og hun ma ekki lesast sem
       maeling. Hun er MERKT i staðinn, ekki thoggud. */
    for (const r of q2[key].rows) {
      r.vacuous = !(r.bindPicks > 0);
      if (r.vacuous) console.log(`      ATH: ${r.label} BINDUR ALDREI — fruman maelir ekkert`);
    }
    console.log("");
  }

  /* ============================================================
     Q2b. PLACEBO-THAKID — SAMA THAK A GERVI-HOPI
     ============================================================ */
  console.log(`  Q2b PLACEBO-THAK — sami hlutur bordsins, engin merking`);
  const PSEUDO = [1, 2, 3, 4, 5, 6];
  const q2placebo = {};
  for (const key of REAL) {
    const sh = shapeOf[key];
    const cells = [];
    let sizes = null;
    for (const wd of WINDOWS) {
      for (const p of PSEUDO) {
        const tally = { picks: 0, bound: 0 };
        const treat = { board: (X) => {
          const g = pseudoGroupBoard(X, arankBoard(X, sh.fmt, repl[sh.key]), p, 1, wd.until, tally);
          if (!sizes) sizes = { groupSize: g.size, teSize: g.teSize };
          return g.board;
        } };
        const { perYear } = cell({ shape: sh, treat, ctrl: A_OF(sh),
          runs: PRUNS, seedBase: 1401 });
        const w = boot(perYear, "winsT", "winsC");
        const s = boot(perYear, "seasonT", "seasonC");
        cells.push({ window: wd.key, seed: p,
          bindRate: r3(tally.picks ? tally.bound / tally.picks : null),
          wins: w.diff, winsT: w.t, season: s.diff, seasonT: s.t });
      }
    }
    const pos = (f) => cells.map((c) => c[f]).filter((v) => v != null && v > 0);
    q2placebo[key] = { cells, groupSizes: sizes, ceiling: {
      winsMaxPositiveMean: r3(Math.max(0, ...pos("wins"))),
      winsMaxPositiveT: r3(Math.max(0, ...pos("winsT"))),
      seasonMaxPositiveMean: r1(Math.max(0, ...pos("season"))),
      seasonMaxPositiveT: r3(Math.max(0, ...pos("seasonT"))) } };
    const c = q2placebo[key].ceiling;
    console.log(`      ${key.padEnd(10)} thak: sigrar ${sgn(c.winsMaxPositiveMean)} (t ${sgn(c.winsMaxPositiveT)})` +
      `  stig ${sgn(c.seasonMaxPositiveMean, 1)} (t ${sgn(c.seasonMaxPositiveT)})  · ${cells.length} holf` +
      `  · hopur ${sizes ? sizes.groupSize : "?"} gegn TE ${sizes ? sizes.teSize : "?"}`);
  }

  /* ============================================================
     Q3. WALK-FORWARD — VAL A FYRRI ARUM EINGONGU
     ============================================================
     Fyrir hvert ar er BESTA fruman valin ur fjolskyldunni a ARUNUM A
     UNDAN og beitt a arid sjalft. Keyrt TVISVAR: a raunverulegu
     fjolskyldunni (thok a stodum) og a PLACEBO-fjolskyldunni
     (gervi-hopar) — leit yfir gagnslaus afbrigdi getur lika "valid"
     eitthvad sem virkar naesta ar af tilviljun, og su tala er thad sem
     raunverulega fjolskyldan verdur ad sla.

     ORDRETT FORMID UR `h2h-lab.mjs` (`q3Wf`).
     ============================================================ */
  console.log(`\n${"=".repeat(76)}\n  Q3. WALK-FORWARD\n${"=".repeat(76)}`);
  const q3 = {};
  {
    const wf = (cands, metric) => {
      const per = {}, chosen = {};
      for (let i = 1; i < ys.length; i++) {
        const y = ys[i], prior = ys.slice(0, i);
        let best = null;
        for (const c of cands) {
          const vals = prior.map((p) => c.per[p]).filter((x) => x != null);
          if (vals.length < prior.length) continue;
          const m = mean(vals);
          if (best == null || m > best.m) best = { m, c };
        }
        if (!best || best.c.per[y] == null) continue;
        per[y] = best.c.per[y];
        chosen[y] = best.c.label;
      }
      return { ...bootZero(per), chosen, candidates: cands.length, metric };
    };
    const perOf = (rows, keyT, keyC) => Object.fromEntries(
      Object.entries(rows).map(([y, c]) => [y, c[keyT] != null && c[keyC] != null
        ? c[keyT] - c[keyC] : null]));

    for (const metric of ["wins", "season"]) {
      const kT = metric === "wins" ? "winsT" : "seasonT";
      const kC = metric === "wins" ? "winsC" : "seasonC";
      const real = [], plc = [];
      for (const key of REAL) {
        for (const r of q2[key].rows) {
          real.push({ label: `${key}/${r.pos}<=1/${r.window}`, per: perOf(r.perYear, kT, kC) });
        }
      }
      /* Placebo-frumurnar bera ekki `perYear` (thaer eru keyrdar med
         `PRUNS`), svo fjolskyldan er endurkeyrd her med SOMU `runs` og
         raunverulega — annars vaeri leitin ad velja ur odru sudi en hun
         er borin vid. */
      for (const key of REAL) {
        const sh = shapeOf[key];
        for (const wd of WINDOWS) for (const p of PSEUDO.slice(0, 4)) {
          const treat = { board: (X) => pseudoGroupBoard(X,
            arankBoard(X, sh.fmt, repl[sh.key]), p, 1, wd.until).board };
          const { perYear } = cell({ shape: sh, treat, ctrl: A_OF(sh), seedBase: 1501 });
          plc.push({ label: `${key}/pseudo${p}/${wd.key}`, per: perOf(perYear, kT, kC) });
        }
      }
      const wr = wf(real, metric), wp = wf(plc, metric);
      q3[metric] = { real: wr, placebo: wp,
        beatsPlaceboSearch: wr.mean != null && wp.mean != null && wr.mean > wp.mean };
      console.log(`  ${metric.padEnd(7)} raunveruleg fjolskylda ${sgn(wr.mean, metric === "wins" ? 3 : 1)} ` +
        `(${wr.wins}/${wr.years}, t=${sgn(wr.t)}) [${sgn(wr.lo, 3)}, ${sgn(wr.hi, 3)}]` +
        `${wr.excludesZero ? " SIG" : ""}  ·  placebo-leit ${sgn(wp.mean, metric === "wins" ? 3 : 1)} ` +
        `(${wp.wins}/${wp.years})  -> ${q3[metric].beatsPlaceboSearch ? "slaer leitina" : "SLAER EKKI leitina"}`);
      console.log(`          valid: ${Object.entries(wr.chosen).map(([y, l]) => `${y}:${l}`).join("  ")}`);
    }
  }

  /* ============================================================
     PER-LEIKMANNS BOOTSTRAP — ADEINS A THVI SEM LITUR JAKVAETT UT
     ============================================================ */
  console.log(`\n${"=".repeat(76)}\n  PER-LEIKMANNS BOOTSTRAP (klasi = LEIKMADURINN)\n${"=".repeat(76)}`);
  const candidates = [];
  for (const key of REAL) {
    for (const r of q2[key].rows) {
      if (r.vacuous) continue;
      for (const m of ["wins", "season"]) {
        if (r[m].diff > 0 && r[m].excludesZero) {
          candidates.push({ shape: key, id: `${r.pos}<=1/${r.window}`,
            pos: r.pos, until: r.until });
        }
      }
    }
  }
  const uniq = [];
  for (const c of candidates) {
    if (!uniq.some((u) => u.shape === c.shape && u.id === c.id)) uniq.push(c);
  }
  console.log(`  ${uniq.length} fruma/frumur ad verja` +
    (uniq.length ? `: ${uniq.map((u) => `${u.shape}/${u.id}`).join(", ")}` : " — ekkert komst yfir ars-hlidid"));
  if (PBOOT === 0) console.log(`  --pboot=0: SLEPPT (skrad i \`playerBootstrapSkipped\`)`);

  const playerBoot = [];
  for (const u of (PBOOT === 0 ? [] : uniq)) {
    const sh = shapeOf[u.shape];
    const treat = { board: (X) => makeWindowCapBoard(X,
      arankBoard(X, sh.fmt, repl[sh.key]), u.pos, 1, u.until) };
    const ctrl = A_OF(sh);
    /* ARIN ERU MEDALTOLUD INNAN HVERRAR ITRUNAR — ekki flott ut. Sama
       regla og `vbdbase-lab`/`band-lab`: flatt fylki blandar
       leikmanna-flokti og ars-flokti og maelist margfalt breidara. */
    const wD = [], sD = [];
    for (let it = 0; it < PBOOT; it++) {
      const wY = [], sY = [];
      for (const y of ys) {
        const RW = resampleWorld(worlds[y], sh.fmt, (y * 7919 + it * 65537) >>> 0);
        const st = cellStats(runCell({ shape: sh, W: RW, treat, ctrl, runs: PBRUNS,
          seedBase: 1606 + it, adpSrc: ADP_SRC[sh.fmt] }));
        wY.push(st.winsDiff); sY.push(st.seasonDiff);
      }
      wD.push(mean(wY)); sD.push(mean(sY));
    }
    const q = (a, p) => { const v = a.slice().sort((x, y2) => x - y2);
      return v[Math.min(v.length - 1, Math.max(0, Math.floor(p * v.length)))]; };
    const row = { shape: u.shape, id: u.id, iters: wD.length, seasonsPerIter: ys.length,
      wins: { mean: r3(mean(wD)), lo: r3(q(wD, 0.025)), hi: r3(q(wD, 0.975)) },
      season: { mean: r1(mean(sD)), lo: r1(q(sD, 0.025)), hi: r1(q(sD, 0.975)) } };
    row.wins.excludesZero = row.wins.lo > 0 || row.wins.hi < 0;
    row.season.excludesZero = row.season.lo > 0 || row.season.hi < 0;
    playerBoot.push(row);
    console.log(`    ${u.shape}/${u.id.padEnd(14)} sigrar ${sgn(row.wins.mean)} ` +
      `[${sgn(row.wins.lo)}, ${sgn(row.wins.hi)}]${row.wins.excludesZero ? " SIG" : ""}  ` +
      `stig ${sgn(row.season.mean, 1)} [${sgn(row.season.lo, 1)}, ${sgn(row.season.hi, 1)}]` +
      `${row.season.excludesZero ? " SIG" : ""}`);
  }

  /* ============================================================
     BARINN
     ============================================================ */
  const verdictRows = [];
  for (const key of REAL) {
    for (const r of q2[key].rows) {
      for (const m of ["wins", "season"]) {
        const st = r[m];
        const pb = playerBoot.find((p) => p.shape === key && p.id === `${r.pos}<=1/${r.window}`);
        const ce = q2placebo[key] ? (m === "wins"
          ? { mean: q2placebo[key].ceiling.winsMaxPositiveMean, t: q2placebo[key].ceiling.winsMaxPositiveT }
          : { mean: q2placebo[key].ceiling.seasonMaxPositiveMean, t: q2placebo[key].ceiling.seasonMaxPositiveT })
          : null;
        const wfOk = q3[m] ? q3[m].real.mean > 0 && q3[m].beatsPlaceboSearch : null;
        const tests = {
          notVacuous: !r.vacuous,
          signPositive: st.diff != null && st.diff > 0,
          seasonClusteredCiExcludesZero: st.excludesZero === true,
          playerClusteredCiExcludesZero: pb ? pb[m].excludesZero === true : null,
          abovePlaceboCeiling: ce && st.diff != null && st.t != null
            ? (st.diff > ce.mean && st.t > ce.t) : null,
          majorityOfSeasons: st.years ? st.wins > st.years / 2 : false,
          walkForwardHolds: wfOk,
        };
        const clears = tests.notVacuous && tests.signPositive
          && tests.seasonClusteredCiExcludesZero
          && tests.playerClusteredCiExcludesZero === true
          && tests.abovePlaceboCeiling === true && tests.majorityOfSeasons
          && tests.walkForwardHolds === true;
        verdictRows.push({ shape: key, pos: r.pos, window: r.window,
          id: `${r.pos}<=1/${r.window}`, metric: m,
          diff: st.diff, lo: st.lo, hi: st.hi, t: st.t,
          seasons: `${st.wins}/${st.years}`, bindRate: r.bindRate,
          tests, clearsBar: clears });
      }
    }
  }
  const cleared = verdictRows.filter((r) => r.clearsBar);
  const bothMetrics = [];
  for (const key of REAL) for (const r of q2[key].rows) {
    const w = verdictRows.find((v) => v.shape === key && v.id === `${r.pos}<=1/${r.window}` && v.metric === "wins");
    const s = verdictRows.find((v) => v.shape === key && v.id === `${r.pos}<=1/${r.window}` && v.metric === "season");
    if (w && s && w.clearsBar && s.clearsBar) bothMetrics.push(`${key}/${r.pos}<=1/${r.window}`);
  }

  console.log(`\n${"=".repeat(76)}\n  BARINN\n${"=".repeat(76)}`);
  console.log(`  frumur skodadar: ${verdictRows.length / 2} x 2 maelikvardar`);
  console.log(`  standast a EINUM maelikvarda : ${cleared.length ? cleared.map((r) => `${r.shape}/${r.id}(${r.metric})`).join(", ") : "ENGIN"}`);
  console.log(`  standast a BADUM             : ${bothMetrics.length ? bothMetrics.join(", ") : "ENGIN"}`);

  /* ============================================================
     STODU-SAMANBURDURINN — ER THETTA UM TE EDA UM THETTINGU?
     ============================================================ */
  const control = {};
  for (const key of REAL) {
    control[key] = {};
    for (const wd of WINDOWS) {
      const g = (pos) => q2[key].rows.find((r) => r.pos === pos && r.window === wd.key);
      control[key][wd.key] = Object.fromEntries(CAP_POS.map((p) => {
        const r = g(p);
        return [p, { wins: r.wins.diff, season: r.season.diff,
          bindRate: r.bindRate, vacuous: r.vacuous }];
      }));
    }
  }
  console.log(`\n  STODU-SAMANBURDUR (sigrar / stig / bindur%):`);
  for (const key of REAL) {
    console.log(`    ${key}`);
    for (const wd of WINDOWS) {
      console.log(`      ${wd.label.padEnd(16)} ` + CAP_POS.map((p) => {
        const v = control[key][wd.key][p];
        return `${p} ${sgn(v.wins)}/${sgn(v.season, 0)}/${((v.bindRate || 0) * 100).toFixed(0)}%`;
      }).join("  "));
    }
  }

  const out = {
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: DEFAULTS,
      inputs: ["players.json", "features.json", "measure/h2h.json",
        "measure/band.json", ...ys.map((y) => `weekly/${y}.json`)],
      dataDir: DATA }),
    question: Q_TEXT,
    design: DESIGN_TEXT,
    unmeasured: {
      waivers: "Rosters are frozen all season — the same simplification as "
        + "h2h-lab and band-lab. It hits both arms identically.",
      capIsTailNotBan: "The cap moves the position to the TAIL of the board, "
        + "never makes it ineligible. A skipped pick would be a different "
        + "experiment (what if you do not play).",
      oneTeIsStillDrafted: "cap = 1 means ONE tight end is still taken inside "
        + "the window. This is not a no-TE strategy; it is a no-CONCENTRATION "
        + "constraint. `maxPos.TE = 2` still applies after the window.",
      q1IsDescriptive: "Q1 has no intervals and no outcome. It answers WHERE "
        + "the skew comes from, not whether it is wrong. The shipped board is "
        + "rebuilt from data/players.json, which the pipeline rewrites daily, "
        + "so the Q1 numbers are a dated example; the Q2/Q3 measurement is not.",
      valueBasisFixIsConcurrent: "The dense-versus-absolute basis of `value` is "
        + "being fixed in src/ by another change. It is measured here as a "
        + "COMPONENT of the skew, not fixed here.",
    },
    seasons: ys, sleeperSeasons: sleeperYears,
    coverage: Object.fromEntries(ys.map((y) => [y, worlds[y].coverage])),
    replacementRanks: repl,
    gates,
    q1,
    q2, q2placebo, q3,
    playerBootstrap: playerBoot,
    playerBootstrapSkipped: PBOOT === 0,
    playerBootstrapCandidates: uniq.map((u) => `${u.shape}/${u.id}`),
    verdictRows,
    clearsOnEitherMetric: cleared.map((r) => `${r.shape}/${r.id}(${r.metric})`),
    clearsOnBothMetrics: bothMetrics,
    positionControl: control,
    runtimeSec: r1((Date.now() - t0) / 1000),
  };

  await mkdir(path.join(DATA, "measure"), { recursive: true });
  await writeFile(path.join(DATA, "measure", "tepos.json"), JSON.stringify(out, null, 1));
  console.log(`\n-> data/measure/tepos.json   (${out.runtimeSec}s)`);
}

const Q_TEXT = {
  origin: "A round-band measurement (data/measure/band.json -> q1positionMix) "
    + "found in passing that the shipped board spends 57.6% of its first three "
    + "picks on TIGHT ENDS in the 10-team 2FLEX full-PPR league, which starts "
    + "ONE tight end. Nobody asked for that number.",
  q1: "Where does the TE skew come from — FLEX_SPLIT.TE, the projection "
    + "source, or the `value` column's dense-versus-absolute basis?",
  q2: "Does the concentration cost anything? Cap the board at one tight end "
    + "inside rounds 1-3, and separately before round 8, and measure the "
    + "OUTCOME against the shipped order.",
  q3: "If a cap wins, is it about TIGHT ENDS or about CONCENTRATION? The same "
    + "cap on RB and WR is the control.",
  notTheSameAs: "scripts/vbdbase-lab.mjs --tesweep and h2h-lab.mjs --tesweep "
    + "swept the CONSTANT (0 -> 0.40, 0 of 102 cells cleared, README 4l). A "
    + "different replacement rank is not the same intervention as a cap on how "
    + "many you take.",
};

const DESIGN_TEXT = {
  harness: "src/accuracy.js (simulateDraft, scoreLeague, roundRobin, "
    + "startersPoints) — imported, not copied. World, cell, bootstrap, "
    + "placebo perturbation and resampled pool are VERBATIM from "
    + "scripts/band-lab.mjs, which takes them verbatim from h2h-lab.mjs.",
  onlyNewPiece: "makeWindowCapBoard — a cap that applies only while r < until. "
    + "At until = 99 it is bit-identical to band-lab's makeCapBoard, and gate "
    + "N5 proves it by reproducing the booked band.json q2b number exactly.",
  q1Harness: "buildRows (src/build.js) through a patched copy whose model.js "
    + "import is bent onto a patched FLEX_SPLIT line (lib/te-sweep.mjs). Same "
    + "method as flexsplit-lab.mjs — no reimplementation of computeVbd.",
  placeboFamily: "A cap on a PSEUDO-GROUP: players partitioned by a seeded "
    + "hash into a group the same SIZE as the TE pool, capped in the same "
    + "windows. Size is what controls how often a cap binds, so size is what "
    + "must match. RB and WR caps are the CONTROL (a real hypothesis about "
    + "concentration), not the placebo.",
  bar: ["cap actually binds", "sign", "season-clustered bootstrap excludes zero",
    "player-clustered bootstrap excludes zero", "above the placebo ceiling "
    + "(one-sided mean AND t)", "majority of seasons", "holds walk-forward "
    + "against the same search over the placebo family", "holds on BOTH metrics"],
};

main().catch((e) => { console.error(e); process.exit(1); });
