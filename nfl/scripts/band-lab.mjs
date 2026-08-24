#!/usr/bin/env node
/* ============================================================
   band-lab.mjs — HVAR I DRAFTINU VINNUR VBD, OG ER ELITE-QB
   VANVERDLAGDUR I EINS-QB DEILD?

     node scripts/band-lab.mjs [--runs=4] [--pruns=2] [--boot=2000]
                              [--pboot=120] [--from=2019]

   -> data/measure/band.json

   ============================================================
   HVADAN THESSI SPURNING KEMUR
   ============================================================
   Notandinn draftadi hermt draft ur saeti 4 i 10-lida PPR deildinni og
   fylgdi radleggingu appsins i HVERJU vali. Hann endadi i 4. saeti af
   10 a spa (1938 gegn 2062 hja sigurvegara). Saetid FYRIR AFTAN hann —
   saeti 5, sem velur EINU vali sidar i fyrstu umferd — vann. Konkreta
   tilvikid: i 1.4 sagdi appid honum ad taka Jonathan Taylor (RB, spa
   272, ADP 7,8) medan Ja'Marr Chase (WR, spa 311, ADP 3,3) var enn
   laus. Chase for i 1.5 til sigurvegarans.

   TVAER FULLYRDINGAR ERU HER FALDAR OG THAER ERU EKKI JAFN STERKAR:

   (a) "VBD radar TOPPI draftsins RANGT." Bokada +75 (A-Ranking gegn
       hrari spa-rod) er MEDALTAL YFIR ALLT DRAFTID. Skortur-roksemdin
       er sterkust i midjunni og VEIKUST i fyrstu threm umferdum, thar
       sem hver stada a enn elite-menn. Ekkert i repo-inu hefur skorid
       forskotid nidur EFTIR UMFERD.

   (b) "Elite QB er vanverdlagdur i eins-QB deild." Sla QB-saetid ma
       ekki standa tomt, svo raunverulega vikid er
       `Allen - QB sem thu hefdir annars byrjad`, en VBD verdlagdur
       hann gegn QB10/QB12.

   ============================================================
   HVAD ER THEGAR MAELT — OG THAD MA EKKI ENDURMAELA SEM NYTT
   ============================================================
   · "QB i 1./2./3. umferd" ER MAELT, i BADUM deildum notandans, a
     BADUM maelikvordum, 7 timabil: `data/measure/h2h.json -> q2`.
     10-2flex: qb1 -0,82 sigrar / -90,2 stig (badir marktaekir),
     qb2 -0,19 / -11,2 (hvorugur), qb3 -0,14 / -2,5 (hvorugur, en
     titlar -0,057 marktaekt). 12-2flex: qb1 -0,91 / -107,8 (badir),
     qb2 -0,27 / -32,2 (hvorugur). SU SPURNING ER SVORUD og hun er
     endurbirt her sem `alreadyMeasured`, ekki endurkeyrd.
   · HLIDRUN PER STODU a varamanns-threpinu er maeld i
     `vbdbase-lab.mjs` (`offset-pos`, fittud walk-forward) og fell:
     0 af 153 holfum stodust per-leikmanns bootstrap. Fittada
     QB-hlidrunin hallar tho JAKVAETT (0..+6 i 10-2flex ppr), sem er
     nakvaemlega attin sem (b) spair.
   · KVIKT VBD er maelt og fellt (-89, -31, -97, +12).

   THAD SEM ER OMAELT OG ER MAELT HER:
     Q1  Forskot VBD SUNDURLIDAD EFTIR UMFERDABILI (1-3 / 4-7 / 8+).
         Enginn hefur skorid thad nidur adur. `risk-lab` er eina
         fordaemid um umferda-had bord og hun maelir AHAETTU, ekki
         rodunarregluna sjalfa.
     Q2a QB-EINN varamanns-grunnur, FAST grid (ekki fittad), maeldur i
         SIGRUM jafnt sem stigum, i logunum notandans. `vbdbase-lab`
         faerdi allar stodur samtimis eda fittadi thaer; QB einn a
         fostu gridi er ny fruma og SIGRAR eru nyr maelikvardi a hana.
     Q2b MAXPOS.QB = 2 — appid leyfir ANNAN QB i eins-QB deild og
         notandinn tok tvo (Prescott 10.7 OG Lawrence 11.4). Lawrence
         byrjar aldrei. Ekkert i repo-inu hefur maelt hvad thakid
         kostar. Thad er maelt her sem THAK = 1 gegn thaki = 2.

   ============================================================
   HONNUNIN — SAMA VEL OG `h2h-lab.mjs`, OG THAD ER ASETT
   ============================================================
   Laugin, heimurinn, bordin, vellirnir, umferdaskrain, sigra-bokhaldid
   og tolfraedin eru ORDRETT thau somu og `h2h-lab.mjs` ber. Thad er
   ekki leti: se laugin onnur er talan her EKKI samanburdarhaef vid
   bokudu +2,4/+3,8 sigra og +236 stig, og tha vaeri ekki haegt ad segja
   hvort munur komi fra spurningunni eda fra heiminum. Sama rok og
   `vbdbase-lab` skjalar um `half-lab`.

   AFRITID ER GERT AUDITERANLEGT MED THVERU AKKERI (kafli N3):
   A-Ranking gegn hrau ADP er ENDURKEYRD her og BORIN VID bokudu
   toluna i `h2h.json -> q1`. Se hun ekki i sama fari er afritid ad
   maela annan heim og keyrslan DEYR. Thad er sama vorn og
   `vbdbase-lab --tesweep` byggir a `k1-raw`.

   HERMINN SJALFUR ER EKKI AFRITADUR. `simulateDraft`, `scoreLeague`,
   `roundRobin`, `startersPoints` og `replacementRanks` eru FLUTT INN
   ur `src/`. Tvo afrit af draftinu eda af byrjunarlids-reglunni er
   nakvaemlega aettin af villu sem `startersRaw` var dregid ut til ad
   koma i veg fyrir.

   ============================================================
   UMFERDA-HAD BORD — HVERNIG BANDID ER MAELT
   ============================================================
   `simulateDraft` leyfir bordi ad vera FALL sem faer `(taken, counts,
   round, roster)`. Bandid er thvi:

     bandBoard(A, P, lo, hi) = (taken, counts, r) =>
       (r >= lo && r <= hi) ? P : A

   THAD ER NAKVAEMLEGA EIN BREYTA: hvada RODUNARREGLA gildir i thessum
   umferdum. Allt annad — laugin, vollurinn, stodu-thakid, skrain,
   motherjarnir — er obreytt. Merking:

     A = A-Ranking (VBD)      = REGLAN SEM ER SEND
     P = hra spa-rod          = REGLAN SEM VBD A AD SLA

   Treatment er BANDID (P i bandinu), control er A. `bandEdge` sem er
   BIRT er SNUID VID: `A - hybrid`, svo JAKVAED tala thydir "VBD
   HJALPAR i thessu bandi". Thad er sagt her thvi formerkid er eina
   leidin til ad lesa toluna rangt.

   BONDIN ERU EKKI SAMLAGNANLEG OG THAD ER MAELT, EKKI GEFID SER.
   Annad val i 1.-3. umferd breytir hverjir eru lausir i 8. umferd, svo
   summa bandanna er ekki jofn heildinni. BADAR tolur eru birtar
   (`sumOfBands` gegn `full`) og mismunurinn ER samspilid.

   ============================================================
   BARINN — REPO-SINN EIGIN, ENGIN AFSLATTUR
   ============================================================
   1. medaltal med retta formerki
   2. bootstrap klasad PER TIMABIL utilokar null
   3. bootstrap klasad PER LEIKMANN utilokar null (laugin endursynd
      innan ars) — hlidid sem gaf `vbdbase-lab` 0 af 153
   4. yfir PLACEBO-THAKI (einhlida `maxPositiveT` OG `maxPositiveMean`)
   5. rett formerki i skyrum meirihluta timabila
   6. haldi hun i BADUM maelikvordum (sigrar og stig) — sja README 5n:
      rho(sigrar, stig) er 0,961-0,989 i bokudu tolunum, svo
      VAENTINGIN er samhljoda og OSAMHLJODA lestur er merki um
      maelitaekid, ekki uppgotvun

   PLACEBO-FJOLSKYLDURNAR ERU TVAER OG THAER ERU OLIKAR:
     · Q1: A-bordid TRUFLAD i SAMA BANDI med akvednu sudi (`placeboValue`
       ur `opp-lab`, z innan stodu, tveir vogir). Spurningin sem thakid
       svarar: "les HVER SEM ER breyting a rodun thessara umferda sem
       sigur?"
     · Q2a: SOMU hlidranir a RB/WR/TE i stad QB. Thaer eru EKKI hreint
       sud — og thad er sagt berum ordum — en `vbdbase-lab` maeldi thaer
       allar sem null, svo dreifing theirra er retta viðmiðið fyrir
       "hve stor getur hlidrun a einni stodu litid ut fyrir ad vera".
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { simulateDraft, scoreLeague, roundRobin, startersPoints,
         DEFAULT_LEAGUE } from "../src/accuracy.js";
import { replacementRanks } from "../src/model.js";
import { mean, bootstrapDiff } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const DATA = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  runs: "number", pruns: "number", boot: "number", pboot: "number",
  from: "number", pbruns: "number",
});
const DEFAULTS = { runs: 4, pruns: 2, boot: 2000, pboot: 120, from: 2019,
                   pbruns: 1 };
const RUNS   = Number(ARG.runs   ?? DEFAULTS.runs);    // fraekorn per (ar, fruma)
const PRUNS  = Number(ARG.pruns  ?? DEFAULTS.pruns);   // fraekorn per placebo-fruma
const BOOT   = Number(ARG.boot   ?? DEFAULTS.boot);
const PBOOT  = Number(ARG.pboot  ?? DEFAULTS.pboot);   // per-leikmanns itranir
const PBRUNS = Number(ARG.pbruns ?? DEFAULTS.pbruns);
const FROM   = Number(ARG.from   ?? DEFAULTS.from);

const REG_WEEKS = 14;                  // MAELT: `fpts` = vikur 1-14
const PO_WEEKS = [15, 16, 17];         // MAELT: playoff_week_start = 15
const PO_TEAMS = 6;                    // MAELT: playoff_teams = 6
const KPRIOR = 4;                      // sama hrista og waiver-lab / h2h-lab
const POSES = ["QB", "RB", "WR", "TE"];
const MAXW = 18;

const r1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const sgn = (x, d = 2) => (x == null ? "     -" : `${x > 0 ? "+" : ""}${x.toFixed(d)}`);

/* Fraekorn: LCG, ORDRETT sama utfaersla og `h2h-lab`/`waiver-lab`, svo
   havadinn i vellinum se sambaerilegur milli maelinganna. */
function rngOf(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const gaussOf = (rnd) => () => {
  const u = Math.max(1e-9, rnd()), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Pardur t yfir timabil — klasarnir eru ARIN, eins og annars stadar. */
function tOf(a) {
  const v = a.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
}

/* ============================================================
   1. LOGUNIN — ORDRETT SU SAMA OG `h2h-lab.mjs` BER
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
  { key: "12-1flex", fmt: "ppr", label: "12 lid, 1 FLEX, WR3, PPR (almenna lognin)",
    league: { ...DEFAULT_LEAGUE, teams: 12, rounds: 14 } },
];
const REAL = ["10-2flex", "12-2flex"];   // deildirnar sem notandinn spilar i

const ADP_SRC = { ppr: "adpPpr", half: "adpPpr", standard: "adpStd" };

/* ============================================================
   2. HEIMURINN — ORDRETT `buildWorld` UR `h2h-lab.mjs`
   ============================================================
   Ekkert her ma vikja fra thvi labi. Tholanleikinn er PROFADUR i N3:
   A-Ranking gegn ADP er endurkeyrd og borin vid bokudu toluna.       */
async function loadInputs() {
  const weekly = {}, seasons = [];
  for (let y = 2018; y <= 2025; y++) {
    try {
      weekly[y] = JSON.parse(await readFile(path.join(DATA, "weekly", `${y}.json`), "utf8"));
      if (y >= FROM) seasons.push(y);
    } catch { /* vantar -> sest i `seasons` */ }
  }
  const feats = JSON.parse(await readFile(path.join(DATA, "features.json"), "utf8"));
  let booked = null;
  try {
    booked = JSON.parse(await readFile(path.join(DATA, "measure", "h2h.json"), "utf8"));
  } catch { /* ekki til -> N3 segir thad */ }
  return { weekly, seasons, feats, booked };
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
  const adp = { adpPpr: new Array(N).fill(null), adpStd: new Array(N).fill(null) };
  const adpSd = new Array(N).fill(null);
  let projected = 0, sleeperProjected = 0;
  for (let i = 0; i < N; i++) {
    const a = featIdx.get(`${y}|${P[i].id}|ppr`);
    const b = featIdx.get(`${y}|${P[i].id}|standard`);
    const pj = a ? (a.sleeperProj != null ? a.sleeperProj : a.ffProj) : null;
    const sj = b ? (b.sleeperProj != null ? b.sleeperProj : b.ffProj) : null;
    if (a && a.sleeperProj != null) sleeperProjected++;
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

  return { y, N, P, idx, prior, proj, adp, adpSd, byWeek, actual, actual14,
           totAll, tot14,
           coverage: { players: N, projected, sleeperProjected } };
}

/* ============================================================
   3. BORDIN — ORDRETT UR `h2h-lab.mjs`
   ============================================================ */

/** A-RANKING: spa -> virdi yfir varamanni. Taglid radast eftir forgildi. */
function arankBoard(W, fmt, repl) {
  const scored = arankScored(W, fmt, repl);
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** Varamanns-GRUNNGILDID per stodu — medaltal thriggja i kringum
    threpid, ORDRETT reglan i `computeVbd`/`arankBoard`. Dregid ut svo
    Q2c geti spurt "hve stort er bilid ofan i QB-grunninn?" an thess ad
    reikna hann i annad sinn. */
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

/** Sami utreikningur, en skilar SKORINU — thad er thad sem
    placebo-truflunin og QB-hlidrunin thurfa ad sja. */
function arankScored(W, fmt, repl) {
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
  const scored = [];
  for (let i = 0; i < W.N; i++) {
    const v = W.proj[fmt][i];
    scored.push([W.P[i].id, v != null ? v - (base[W.P[i].pos] ?? 0) : -1e5 + W.prior[i]]);
  }
  return scored;
}

/** HRA SPA-ROD — enginn umreikningur i VBD. Reglan sem VBD a ad sla. */
function projBoard(W, fmt) {
  const scored = [];
  for (let i = 0; i < W.N; i++) {
    const v = W.proj[fmt][i];
    scored.push([W.P[i].id, v != null ? v : -1e5 + W.prior[i]]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** MARKADURINN: ADP. `rnd` gefur eitt drátt af herberginu. */
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

/** ORAKEL: raunstig timabilsins. EFRA AKKERID. */
function oracleBoard(W, fmt) {
  const scored = W.P.map((p, i) => [p.id, W.totAll[fmt][i]]);
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** ANDHVERFT ADP. NEDRA AKKERID. */
function reverseBoard(W, src) {
  const keys = [...adpBoard(W, src).keys()].reverse();
  return new Map(keys.map((k, i) => [k, i + 1]));
}

/* ---------- Q1: UMFERDA-HAD BAND ---------- */

/**
 * BANDID. `lo`/`hi` eru 0-vistadar umferdir (r=0 er 1. umferd).
 *
 * Ekkert er reiknad inni i fallinu — badir kort eru byggd EINU SINNI og
 * fallid velur bara milli theirra. Thad er forsenda thess ad bandid se
 * EINA breytan: byggdi thad kort a hverju vali gaeti tolulegt flokt
 * lekid inn.
 */
const bandBoard = (A, P, lo, hi) => (taken, counts, r) =>
  (r >= lo && r <= hi ? P : A);

/* ---------- Q2c: SKILYRT ELITE-QB REGLA ---------- */

/**
 * "TAKTU BESTA QB I UMFERD R+1 EF BILID OFAN I QB-GRUNNINN ER >= G."
 *
 * Thetta er SKARPASTA form tilgatunnar: hun segir ekki "QB er alltaf
 * vanverdlagdur" heldur "hann er vanverdlagdur THEGAR hann er langt
 * fyrir ofan thann sem thu myndir annars byrja". `G` er maelt i STIGUM
 * timabilsins og er thvi sama eining og talan sem tilgatan nefnir
 * (~+80/timabil).
 *
 * REGLAN FIRRAR I NAKVAEMLEGA EINNI UMFERD (`r === R`) og adeins ef
 * lidid a ENGAN QB. Vaeri hun `r <= R` gaeti hun aldrei sagt "i annarri
 * umferd" — hun myndi alltaf firra i fyrstu. Se madurinn TEKINN thegar
 * kemur ad okkur fellur bordid i A af sjalfu ser (`bestAvailable`
 * sleppir theim sem eru teknir), sem er rett: reglan er "ef hann er
 * thar", ekki "eltu naesta QB".
 *
 * G = 0 er AKKERI, ekki afbrigdi: tha er reglan "taktu besta QB i
 * umferd R+1", sem er NAKVAEMLEGA `qb1`/`qb2`/`qb3`-aaetlunin i
 * `h2h.json -> q2`. Talan verdur ad lesa eins og bokada talan.
 */
function eliteQbBoard(W, fmt, repl, G, R) {
  const A = arankBoard(W, fmt, repl);
  const base = posBase(W, fmt, repl);
  let bestId = null, bestGap = -Infinity;
  for (let i = 0; i < W.N; i++) {
    if (W.P[i].pos !== "QB") continue;
    const v = W.proj[fmt][i];
    if (v == null) continue;
    const gap = v - (base.QB ?? 0);
    if (gap > bestGap) { bestGap = gap; bestId = W.P[i].id; }
  }
  if (bestId == null || bestGap < G) return { board: A, gap: bestGap, fired: false };
  const promoted = new Map();
  promoted.set(bestId, 0);
  for (const [id, rank] of A) if (id !== bestId) promoted.set(id, rank);
  const sorted = [...promoted.entries()].sort((a, b) => a[1] - b[1]);
  const P2 = new Map(sorted.map(([id], i) => [id, i + 1]));
  return {
    board: (taken, counts, r) => ((counts.QB || 0) === 0 && r === R ? P2 : A),
    gap: bestGap, fired: true,
  };
}

/* ---------- Q2b: STODU-THAK SEM GILDIR ADEINS UM OKKAR LID ---------- */

/**
 * `league.maxPos` er DEILDAR-VITT — thad er RETT, thvi motherjarnir eiga
 * ad haga ser eins og herbergid gerir (`accuracy.js` skjalar hvers
 * vegna thak adeins a okkur var villa sem let samsteypuna drafta THRJA
 * leikstjornendur). Til ad maela THAK A OKKAR LIDI EINU er thakid thvi
 * sett i BORDID i stad deildarinnar: se staðan full hja THESSU lidi er
 * skilad bordi thar sem staðan er faerd i taglid.
 *
 * TAGLID, EKKI UTILOKUN: `bestAvailable` skilar `null` finnist enginn og
 * `simulateDraft` SLEPPIR tha valinu. Sleppt val er ekki thad sem er
 * verid ad maela ("hvad gerist ef thu spilar ekki") heldur "hvad gerist
 * ef thu tekur eitthvad annad", svo staðan er hofd sidast en aldrei
 * ohaef.
 */
function makeCapBoard(W, A, pos, cap) {
  const posOf = new Map(W.P.map((p) => [p.id, p.pos]));
  const shifted = [...A.entries()].map(([id, rank]) =>
    [id, posOf.get(id) === pos ? rank + 1e6 : rank]);
  shifted.sort((a, b) => a[1] - b[1]);
  const demoted = new Map(shifted.map(([id], i) => [id, i + 1]));
  return (taken, counts) => ((counts[pos] || 0) >= cap ? demoted : A);
}

/* ---------- PLACEBO-TRUFLUN (Q1) ---------- */

/** Deterministiskt sud ur (id, timabil, fraekorn) — ORDRETT ur
    `opp-lab.mjs` gegnum `h2h-lab.mjs`. Se thessu breytt er
    nulldreifingin her ekki lengur sama nulldreifing og thar. */
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

/** Z innan stodu — ORDRETT regla `opp-lab`. */
function zWithinPos(list, get) {
  const st = {};
  for (const p of list) {
    const v = get(p);
    if (v == null || !Number.isFinite(v)) continue;
    (st[p.pos] = st[p.pos] || []).push(v);
  }
  const par = {};
  let covered = 0;
  for (const [pos, vals] of Object.entries(st)) {
    if (vals.length < 8) continue;
    const m = mean(vals);
    const s = Math.sqrt(mean(vals.map((v) => (v - m) ** 2))) || 1;
    par[pos] = { m, s };
    covered += vals.length;
  }
  if (!covered) return null;
  return (p) => {
    const v = get(p), q = par[p.pos];
    return q == null || v == null || !Number.isFinite(v) ? 0 : (v - q.m) / q.s;
  };
}

/**
 * A-RANKING TRUFLAD MED `w * z(placebo)`, SAMI KVARDI OG `opp-lab`:
 * VBD er z-stoðlad yfir hausinn adur en voginn er logd vid, svo w=0,06
 * se sambaerileg vog vid thad sem `opp-lab`/`h2h-lab` Q3 maeldu.
 * Z-stodlun a VBD er EINRAEN, svo w=0 gefur NAKVAEMLEGA A (profad i N2).
 */
function placeboBoard(W, fmt, repl, seed, w) {
  const scored = arankScored(W, fmt, repl);
  const head = [], tail = [];
  const byId = new Map();
  for (let i = 0; i < W.N; i++) byId.set(W.P[i].id, W.P[i].pos);
  for (const [id, v] of scored) {
    if (v <= -1e4) tail.push([id, v]);
    else head.push({ id, pos: byId.get(id), vbd: v });
  }
  if (!head.length) return arankBoard(W, fmt, repl);
  const m = mean(head.map((h) => h.vbd));
  const sd = Math.sqrt(mean(head.map((h) => (h.vbd - m) ** 2))) || 1;
  const zf = w === 0 ? null
    : zWithinPos(head, (h) => placeboValue(h.id, W.y, seed));
  const out = head.map((h) => {
    const z = (h.vbd - m) / sd;
    return [h.id, zf ? z + w * zf(h) : z];
  });
  out.sort((a, b) => b[1] - a[1]);
  tail.sort((a, b) => b[1] - a[1]);
  return new Map([...out, ...tail].map(([id], i) => [id, i + 1]));
}

/* ---------- ENDURSYND LAUG: KLASI = LEIKMADURINN ---------- */

/** ORDRETT `resampleWorld` ur `h2h-lab.mjs`, vikkad til ad bera
    `totAll` (orakel-bordid les hana) — thad er VIDBOT, ekki breyting. */
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
   4. VELIN — EIN FRUMA = TVEIR ARMAR I SOMU DEILD, SPEGLADIR
   ============================================================
   ORDRETT `runCell` ur `h2h-lab.mjs`, med EINNI VIDBOT: saeti er
   skrad med hverri utkomu (`seatT`) svo haegt se ad skera Q1 eftir
   draft-saeti. Vidbotin les EKKERT nytt og getur ekki haggad
   medaltalinu.
   ============================================================ */
function padPlan(plan, rounds) {
  const out = plan.slice(0, rounds);
  while (out.length < rounds) out.push(null);
  return out;
}

function runCell({ shape, W, treat, ctrl, runs, seedBase, adpSrc }) {
  const league = shape.league;
  const T = league.teams;
  const fmt = shape.fmt;
  const acc = {
    n: 0,
    wT: [], wC: [], pfT: [], pfC: [], ssT: [], ssC: [], seatT: [],
    champT: 0, champC: 0, poT: 0, poC: 0,
    weekWinT: 0, weekWinC: 0, weekTie: 0,
  };
  const boardT = treat.board(W);
  const boardC = ctrl.board(W);
  const planT = treat.plan ? padPlan(treat.plan, league.rounds) : null;
  const planC = ctrl.plan ? padPlan(ctrl.plan, league.rounds) : null;

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
        let plans = null;
        if (planT || planC) {
          plans = new Array(T + 1).fill(null);
          plans[ti] = planT; plans[ci] = planC;
        }
        const draft = simulateDraft({ board: field, fieldBoard: field,
          actual: W.actual[fmt], slot: 1, league, boards, plans });
        const S = scoreLeague({ rosters: draft.rosters, byWeek: W.byWeek[fmt],
          league, schedule, regWeeks: REG_WEEKS, playoffWeeks: PO_WEEKS,
          playoffTeams: PO_TEAMS });
        const A = S.rec[ti], B = S.rec[ci];
        acc.n++;
        acc.wT.push(A.w + A.t / 2); acc.wC.push(B.w + B.t / 2);
        acc.pfT.push(A.pf); acc.pfC.push(B.pf);
        acc.ssT.push(startersPoints(draft.rosters[ti], W.actual[fmt], league));
        acc.ssC.push(startersPoints(draft.rosters[ci], W.actual[fmt], league));
        acc.seatT.push(ti);
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

/** Dregur eina frumu nidur i tolur sem eru sambaerilegar milli ara. */
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

/** Saetis-skuring: medalmunur per saeti medferdarinnar. */
function bySeat(acc) {
  const w = {}, s = {};
  for (let i = 0; i < acc.n; i++) {
    const k = acc.seatT[i];
    (w[k] = w[k] || []).push(acc.wT[i] - acc.wC[i]);
    (s[k] = s[k] || []).push(acc.ssT[i] - acc.ssC[i]);
  }
  const out = {};
  for (const k of Object.keys(w)) {
    out[k] = { wins: r3(mean(w[k])), season: r1(mean(s[k])), n: w[k].length };
  }
  return out;
}

const recordOf = (w) => (w == null ? "-"
  : `${w.toFixed(1)}-${(REG_WEEKS - w).toFixed(1)}`);

/** Timabil -> tvo kort af tolum -> bootstrap klasadur PER TIMABIL. */
function boot(perYear, keyT, keyC, flip = false) {
  const A = {}, B = {};
  for (const [y, c] of Object.entries(perYear)) {
    if (c[keyT] == null || c[keyC] == null) continue;
    /* `flip` snyr merkingunni vid: bandid er maelt sem
       "hybrid - A" en BIRT sem "A - hybrid" (VBD-forskot). Snuningur
       her er EINN stadur, svo formerkid getur ekki reikad milli
       taflna. */
    A[y] = flip ? c[keyC] : c[keyT];
    B[y] = flip ? c[keyT] : c[keyC];
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

/** Ein timarod af MUNUM -> vikmork gegn nulli, klasi = TIMABIL. */
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
   MAIN
   ============================================================ */
async function main() {
  const t0 = Date.now();
  const { weekly, seasons, feats, booked } = await loadInputs();
  requireSeasons(seasons, "vikuskrar");

  const featIdx = new Map();
  for (const r of feats.rows) featIdx.set(`${r.season}|${r.id}|${r.scoring}`, r);

  const worlds = {};
  for (const y of seasons) worlds[y] = buildWorld(y, weekly, featIdx);
  const ys = seasons.slice();
  /* Timabil thar sem SLEEPER-spain er til. Bædi armar i hverri fruma
     lesa SOMU spa, svo oll 7 arin eru nytileg — en appid sendir
     SLEEPER, og README 4d varnagli 2 er skyr um ad "omarktaek i theirri
     heimild sem appid notar" er raunverulegur varnagli. Thess vegna er
     hver headline-tala LIKA birt a Sleeper-arunum EINUM. */
  const sleeperYears = ys.filter((y) =>
    worlds[y].coverage.sleeperProjected >= 100);

  const repl = {};
  for (const sh of SHAPES) repl[sh.key] = replacementRanks({ ...sh.league, scoring: sh.fmt });
  const shapeOf = Object.fromEntries(SHAPES.map((s) => [s.key, s]));

  console.log(`\ntimabil: ${ys.join(", ")}   (Sleeper: ${sleeperYears.join(", ")})`);
  for (const sh of SHAPES) {
    console.log(`  ${sh.key.padEnd(10)} repl ${JSON.stringify(repl[sh.key])}`);
  }

  /* Hjalp: keyrir eina medferd gegn einu vidmidi yfir oll ar. */
  const cell = ({ shape, treat, ctrl, runs = RUNS, seedBase = 11, years = ys,
                  keepAcc = false }) => {
    const perYear = {}, accs = {};
    for (const y of years) {
      const acc = runCell({ shape, W: worlds[y], treat, ctrl, runs, seedBase,
        adpSrc: ADP_SRC[shape.fmt] });
      perYear[y] = cellStats(acc);
      if (keepAcc) accs[y] = acc;
    }
    return { perYear, accs };
  };

  const A_OF = (sh) => ({ board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) });
  const P_OF = (sh) => ({ board: (X) => projBoard(X, sh.fmt) });

  /* ============================================================
     N1-N4  HLIDIN. Hvert eitt ma stoppa keyrsluna.
     ============================================================ */
  console.log(`\n${"=".repeat(76)}\n  N. HLIDIN\n${"=".repeat(76)}`);
  const gates = {};
  let fatal = null;

  /* N1 SJALFSPROF: A gegn A verdur ad gefa NAKVAEMLEGA 0. */
  {
    const sh = shapeOf["10-2flex"];
    const { perYear } = cell({ shape: sh, treat: A_OF(sh), ctrl: A_OF(sh), runs: 1 });
    const w = mean(Object.values(perYear).map((c) => c.winsDiff));
    const s = mean(Object.values(perYear).map((c) => c.seasonDiff));
    gates.n1_self = { winsDiff: r3(w), seasonDiff: r1(s), ok: w === 0 && s === 0 };
    console.log(`  N1 sjalfsprof (A gegn A)        wins ${sgn(w)}  stig ${sgn(s, 1)}  ` +
      (gates.n1_self.ok ? "OK" : "FELLUR"));
    if (!gates.n1_self.ok) fatal = "N1: sjalfsprof gefur ekki 0 — herminn eda spegluninn er bilaður";
  }

  /* N2 SAMSVORUN: (i) band sem er TOMT (lo>hi) verdur ad vera A;
     (ii) placebo vid w=0 verdur ad vera BITAEINS A. */
  {
    const sh = shapeOf["10-2flex"];
    const W = worlds[ys[0]];
    const A = arankBoard(W, sh.fmt, repl[sh.key]);
    const P0 = placeboBoard(W, sh.fmt, repl[sh.key], 1, 0);
    let same = A.size === P0.size;
    if (same) for (const [k, v] of A) if (P0.get(k) !== v) { same = false; break; }
    gates.n2_placeboZero = { identical: same };
    console.log(`  N2 placebo w=0 er BITAEINS A    ${same ? "OK" : "FELLUR"}`);
    if (!same) fatal = "N2: placebo w=0 gefur annad bord en A — kvardinn er ekki einraen umbreyting";
  }

  /* N4 AKKERI I BADA ENDA: orakel verdur ad vinna, andhverft ADP ad tapa. */
  {
    const sh = shapeOf["10-2flex"];
    const src = ADP_SRC[sh.fmt];
    const or = cell({ shape: sh, treat: { board: (X) => oracleBoard(X, sh.fmt) },
      ctrl: A_OF(sh), runs: 1 });
    const rv = cell({ shape: sh, treat: { board: (X) => reverseBoard(X, src) },
      ctrl: A_OF(sh), runs: 1 });
    const ow = mean(Object.values(or.perYear).map((c) => c.winsDiff));
    const rw = mean(Object.values(rv.perYear).map((c) => c.winsDiff));
    gates.n4_anchors = { oracleWins: r3(ow), reverseWins: r3(rw),
      ok: ow > 1 && rw < -1 };
    console.log(`  N4 akkeri: orakel ${sgn(ow)} sigrar · andhverft ADP ${sgn(rw)}  ` +
      (gates.n4_anchors.ok ? "OK" : "FELLUR"));
    if (!gates.n4_anchors.ok) fatal = "N4: akkerin bera ekki merkid — pipan er ekki sannreynd";
  }

  /* N3 THVERT AKKERI: A-Ranking gegn hrau ADP, borid vid `h2h.json`. */
  {
    const out = {};
    for (const key of REAL) {
      const sh = shapeOf[key];
      const src = ADP_SRC[sh.fmt];
      const { perYear } = cell({ shape: sh, treat: A_OF(sh),
        ctrl: { board: (X) => adpBoard(X, src) }, runs: 2, years: sleeperYears });
      const w = boot(perYear, "winsT", "winsC");
      const s = boot(perYear, "seasonT", "seasonC");
      const bk = booked && booked.q1 && booked.q1[key] && booked.q1[key][src]
        && booked.q1[key][src].adp;
      out[key] = { wins: w.diff, season: s.diff, years: w.years,
        bookedWins: bk ? bk.wins.diff : null,
        bookedSeason: bk ? bk.seasonPoints.diff : null };
      console.log(`  N3 ${key.padEnd(10)} A-Ranking gegn ADP  ` +
        `sigrar ${sgn(w.diff)} (bokad ${sgn(out[key].bookedWins)})  ` +
        `stig ${sgn(s.diff, 1)} (bokad ${sgn(out[key].bookedSeason, 1)})`);
    }
    /* Talan ma ekki vera NAKVAEMLEGA su sama — `runs` er lægra her og
       fraekornin onnur — en hun verdur ad vera i SAMA FARI: sama
       formerki og innan 40% af bokudu staerdinni. Se hun thad ekki er
       afritid ad maela annan heim. */
    const bad = Object.entries(out).filter(([, v]) =>
      v.bookedWins == null || v.wins == null ||
      Math.sign(v.wins) !== Math.sign(v.bookedWins) ||
      Math.abs(v.wins - v.bookedWins) > 0.4 * Math.abs(v.bookedWins) + 0.5);
    gates.n3_crossAnchor = { perShape: out, ok: bad.length === 0,
      failed: bad.map(([k]) => k) };
    console.log(`  N3 thvert akkeri                ${bad.length === 0 ? "OK" : `FELLUR (${bad.map(([k]) => k)})`}`);
    if (bad.length) fatal = `N3: afritid af heiminum er ekki i fari vid h2h.json (${bad.map(([k]) => k)})`;
  }

  if (fatal) {
    console.error(`\n  ${fatal}\n`);
    process.exit(2);
  }

  /* ============================================================
     Q1  HVAR I DRAFTINU VINNUR VBD?
     ============================================================ */
  console.log(`\n${"=".repeat(76)}\n  Q1. FORSKOT VBD SUNDURLIDAD EFTIR UMFERDABILI\n${"=".repeat(76)}`);
  console.log(`  jakvaed tala = VBD (A-Ranking) SLAER hra spa-rod i thvi bandi\n`);

  /* Bondin: 0-vistadar umferdir. `8+` naer til enda draftsins i hvorri
     logun sem er (15 umferdir i 10-lida, 14 i 12-lida). */
  const BANDS = [
    { key: "r1-3", lo: 0, hi: 2, label: "umferdir 1-3" },
    { key: "r4-7", lo: 3, hi: 6, label: "umferdir 4-7" },
    { key: "r8+",  lo: 7, hi: 99, label: "umferdir 8+" },
    { key: "full", lo: 0, hi: 99, label: "allt draftid" },
  ];

  const q1 = {};
  for (const key of Object.keys(shapeOf)) {
    const sh = shapeOf[key];
    q1[key] = { label: sh.label, seasons: ys, bands: {} };
    console.log(`  ${sh.label}`);
    console.log(`    band            sigrar (af 14)                    stig`);
    for (const b of BANDS) {
      const treat = { board: (X) => bandBoard(arankBoard(X, sh.fmt, repl[sh.key]),
        projBoard(X, sh.fmt), b.lo, b.hi) };
      const { perYear, accs } = cell({ shape: sh, treat, ctrl: A_OF(sh),
        seedBase: 101, keepAcc: key === "10-2flex" });
      /* BIRT SEM `A - hybrid` — flip=true. */
      const w = boot(perYear, "winsT", "winsC", true);
      const s = boot(perYear, "seasonT", "seasonC", true);
      const ch = boot(perYear, "champT", "champC", true);
      const slp = {};
      for (const y of sleeperYears) slp[y] = perYear[y];
      const wS = boot(slp, "winsT", "winsC", true);
      const sS = boot(slp, "seasonT", "seasonC", true);
      q1[key].bands[b.key] = {
        label: b.label, lo: b.lo, hi: b.hi,
        wins: w, season: s, champ: ch,
        sleeperOnly: { wins: wS, season: sS },
        perYear,
        bySeat: key === "10-2flex"
          ? Object.fromEntries(Object.keys(accs).map((y) => {
              const bs = bySeat(accs[y]);
              /* Saetis-taflan er BIRT SEM `A - hybrid` lika. */
              return [y, Object.fromEntries(Object.entries(bs).map(([k, v]) =>
                [k, { wins: r3(-v.wins), season: r1(-v.season), n: v.n }]))];
            }))
          : null,
      };
      console.log(`    ${b.label.padEnd(14)} ${sgn(w.diff)} [${sgn(w.lo)}, ${sgn(w.hi)}] ` +
        `t=${sgn(w.t)} ${w.wins}/${w.years}${w.excludesZero ? " SIG" : "    "}  ` +
        `${sgn(s.diff, 1)} [${sgn(s.lo, 1)}, ${sgn(s.hi, 1)}] ${s.wins}/${s.years}` +
        `${s.excludesZero ? " SIG" : ""}`);
    }
    const sob = ["r1-3", "r4-7", "r8+"].reduce((a, k) =>
      a + (q1[key].bands[k].season.diff || 0), 0);
    q1[key].sumOfBandsSeason = r1(sob);
    q1[key].fullSeason = q1[key].bands.full.season.diff;
    q1[key].interactionSeason = r1((q1[key].bands.full.season.diff || 0) - sob);
    console.log(`    summa banda ${sgn(sob, 1)} stig gegn heild ${sgn(q1[key].fullSeason, 1)} ` +
      `-> samspil ${sgn(q1[key].interactionSeason, 1)}\n`);
  }

  /* Saetis-taflan pooluð yfir ar fyrir 10-lida deildina. */
  const seatTable = {};
  for (const b of ["r1-3", "r4-7", "r8+", "full"]) {
    const per = q1["10-2flex"].bands[b].bySeat;
    if (!per) continue;
    const agg = {};
    for (const y of Object.keys(per)) {
      for (const [seat, v] of Object.entries(per[y])) {
        (agg[seat] = agg[seat] || { w: [], s: [] });
        agg[seat].w.push(v.wins); agg[seat].s.push(v.season);
      }
    }
    seatTable[b] = Object.fromEntries(Object.entries(agg).map(([k, v]) =>
      [k, { wins: r3(mean(v.w)), season: r1(mean(v.s)),
            winsPositiveYears: v.w.filter((x) => x > 0).length, years: v.w.length }]));
  }
  console.log(`  Q1b SAETIS-SKURING (10 lid, PPR) — VBD-forskot i stigum per saeti`);
  console.log(`      saeti:  ${Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(7)).join("")}`);
  for (const b of ["r1-3", "r4-7", "r8+"]) {
    if (!seatTable[b]) continue;
    console.log(`      ${b.padEnd(6)} ${Array.from({ length: 10 }, (_, i) =>
      sgn(seatTable[b][i + 1] ? seatTable[b][i + 1].season : null, 0).padStart(7)).join("")}`);
  }
  console.log(`      MULTIPLICITY: 10 saeti x 3 bond = 30 holf. Thetta er LYSING,`);
  console.log(`      ekki prof — pooluð talan er sú sem barinn gildir um.\n`);

  /* ============================================================
     Q1c  LYSANDI: HVAD GERDIST I 1.4 I HVERJU ARI?
     ============================================================
     Thetta er EKKI maeling og er merkt sem thad. Sju ar er sju tilvik.
     Hun er her thvi konkreta spurningin ("Taylor gegn Chase") er
     konkret og a ad vera SYNILEG, ekki thynnt ut i medaltal.        */
  const q1c = [];
  {
    const sh = shapeOf["10-2flex"];
    const src = ADP_SRC[sh.fmt];
    for (const y of ys) {
      const W = worlds[y];
      const A = arankBoard(W, sh.fmt, repl[sh.key]);
      const P = projBoard(W, sh.fmt);
      const field = adpBoard(W, src);            // enginn havadi: hreint ADP
      const name = new Map(W.P.map((p) => [p.id, p.name]));
      const pos = new Map(W.P.map((p) => [p.id, p.pos]));
      const act = W.actual[sh.fmt];
      const grab = (board) => simulateDraft({ board, fieldBoard: field,
        actual: act, slot: 4,
        league: { ...sh.league, rounds: 3 } }).roster;
      const rows = (roster) => roster.map((id) => ({
        name: name.get(id), pos: pos.get(id),
        proj: r1(W.proj[sh.fmt][W.idx.get(id)]),
        actual: r1(act.get(id) ? act.get(id).pts : null) }));
      const ra = grab(A), rp = grab(P);
      /* ============================================================
         HRA SUMMAN A THESSUM THREM ER VILLANDI — OG THAD ER MAELT
         ============================================================
         Fyrsta utgafa thessa reits lagdi raunstig thriggja manna SAMAN.
         Med theirri tolu "vinnur" hra spa-rodin 6 af 7 arum — thvi hun
         tekur THRJA LEIKSTJORNENDUR og QB skorar mest i HRAUM stigum.
         Su tala maelir nakvaemlega thad sem VBD er til ad lagfaera og
         les thvi ut eins og hun afsanni hann.

         RETTA TALAN er `startersPoints`, SAMA utfaersla og allar adrar
         maelingar nota: eitt QB-saeti, svo annar og thridji QB gefa
         NULL. Baðar tolur eru birtar svo gildran se synileg og svo
         enginn endurgeri hana. */
      const startable = (roster) => startersPoints(roster, act, sh.league);
      q1c.push({ season: y,
        arank: rows(ra), raw: rows(rp),
        arankStartable: startable(ra), rawStartable: startable(rp),
        arankRawSum: r1(ra.reduce((a, id) => a + (act.get(id) ? act.get(id).pts : 0), 0)),
        rawRawSum: r1(rp.reduce((a, id) => a + (act.get(id) ? act.get(id).pts : 0), 0)),
        rawQbCount: rp.filter((id) => pos.get(id) === "QB").length,
        arankQbCount: ra.filter((id) => pos.get(id) === "QB").length });
    }
    console.log(`  Q1c FYRSTU THRJU VOLIN UR SAETI 4 (10 lid, PPR, hreint ADP-herbergi)`);
    console.log(`      ar    A-Ranking (VBD)                   byrjhaef | hra spa-rod                 byrjhaef  QB`);
    for (const r of q1c) {
      const f = (rs) => rs.map((x) => `${x.name} (${x.pos})`).join(", ").slice(0, 34).padEnd(34);
      console.log(`      ${r.season}  ${f(r.arank)} ${String(r.arankStartable).padStart(8)} | ` +
        `${f(r.raw)} ${String(r.rawStartable).padStart(8)}  ${r.rawQbCount}`);
    }
    const aw = q1c.filter((r) => r.arankStartable > r.rawStartable).length;
    const awRaw = q1c.filter((r) => r.arankRawSum > r.rawRawSum).length;
    console.log(`      BYRJUNARHAEF STIG (retta talan): VBD meiri i ${aw} af ${q1c.length} arum, ` +
      `medalmunur ${sgn(mean(q1c.map((r) => r.arankStartable - r.rawStartable)), 1)}`);
    console.log(`      HRA SUMMA (GILDRAN): VBD meiri i adeins ${awRaw} af ${q1c.length}, ` +
      `${sgn(mean(q1c.map((r) => r.arankRawSum - r.rawRawSum)), 1)} — hra rodin tekur ` +
      `${mean(q1c.map((r) => r.rawQbCount)).toFixed(1)} QB af 3 og ADEINS EINN getur byrjad`);
    console.log(`      LYSING, EKKI MAELING: eitt val per ar, engin vikmork.\n`);
  }

  /* ============================================================
     Q1e  SAMA SPURNING MED QB TEKINN UT UR BADUM ARMUM
     ============================================================
     Q1 gefur STORT forskot a VBD i umferdum 1-3 — en MEKANISMINN sest
     i Q1c: hra spa-rodin tekur TVO LEIKSTJORNENDUR af thremur, thvi QB
     skorar mest i hraum stigum. Thad forskot er thvi ad staerstum hluta
     "VBD tekur ekki QB snemma", sem `strategy-lab`/`h2h.json q2` hafa
     THEGAR maelt undir odru nafni.

     SPURNING NOTANDANS VAR EKKI SU. Hun var Taylor (RB) gegn Chase
     (WR) — ROD INNAN skil-stodnanna. Til ad svara HENNI er QB tekinn
     ut ur BADUM armum med `plan` i umferdum 1-3, svo hvorugur getur
     tekid hann. Tha er EINA breytan rod RB/WR/TE i toppnum.

     VIDMIDID ER EKKI SENDA REGLAN OG THAD ER SAGT: badir armar bera
     hoftina "enginn QB i 1.-3.", svo talan er "GEFID ad thu takir ekki
     QB snemma, radar VBD RB/WR/TE rett?" — ekki "slaer VBD hra rod".
     ============================================================ */
  const NOQB3 = [["RB", "WR", "TE"], ["RB", "WR", "TE"], ["RB", "WR", "TE"]];
  console.log(`  Q1e SAMA BANDID, QB UTILOKADUR I BADUM ARMUM (umferdir 1-3)`);
  console.log(`      -> eina breytan er rod RB/WR/TE i toppnum`);
  const q1e = {};
  for (const key of Object.keys(shapeOf)) {
    const sh = shapeOf[key];
    const treat = { board: (X) => bandBoard(arankBoard(X, sh.fmt, repl[sh.key]),
      projBoard(X, sh.fmt), 0, 2), plan: NOQB3 };
    const ctrl = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]), plan: NOQB3 };
    const { perYear } = cell({ shape: sh, treat, ctrl, seedBase: 909 });
    const w = boot(perYear, "winsT", "winsC", true);
    const sc = boot(perYear, "seasonT", "seasonC", true);
    const slp = {}; for (const y of sleeperYears) slp[y] = perYear[y];
    q1e[key] = { label: sh.label, wins: w, season: sc,
      sleeperOnly: { wins: boot(slp, "winsT", "winsC", true),
                     season: boot(slp, "seasonT", "seasonC", true) },
      perYear };
    console.log(`      ${key.padEnd(10)} ${sgn(w.diff)} [${sgn(w.lo)}, ${sgn(w.hi)}] ` +
      `t=${sgn(w.t)} ${w.wins}/${w.years}${w.excludesZero ? " SIG" : "    "}  ` +
      `${sgn(sc.diff, 1)} [${sgn(sc.lo, 1)}, ${sgn(sc.hi, 1)}] ${sc.wins}/${sc.years}` +
      `${sc.excludesZero ? " SIG" : ""}`);
  }
  console.log("");

  /* ============================================================
     Q1f  STODU-BLANDAN I UMFERDUM 1-3 — LYSING
     ============================================================
     Hvad TEKUR hvert bord? Talid yfir OLL saeti og oll ar, hreint
     ADP-herbergi. Thetta er ekki prof heldur mekanisminn sjalfur og
     hann a ad vera synilegur, thvi hann er astaedan fyrir Q1e.       */
  const q1f = {};
  for (const key of Object.keys(shapeOf)) {
    const sh = shapeOf[key];
    const src = ADP_SRC[sh.fmt];
    const cnt = { arank: { QB: 0, RB: 0, WR: 0, TE: 0 }, raw: { QB: 0, RB: 0, WR: 0, TE: 0 } };
    for (const y of ys) {
      const W = worlds[y];
      const A = arankBoard(W, sh.fmt, repl[sh.key]);
      const P = projBoard(W, sh.fmt);
      const field = adpBoard(W, src);
      const pos = new Map(W.P.map((p) => [p.id, p.pos]));
      for (let slot = 1; slot <= sh.league.teams; slot++) {
        for (const [k, b] of [["arank", A], ["raw", P]]) {
          const r = simulateDraft({ board: b, fieldBoard: field,
            actual: W.actual[sh.fmt], slot,
            league: { ...sh.league, rounds: 3 } }).roster;
          for (const id of r) cnt[k][pos.get(id)]++;
        }
      }
    }
    const tot = (o) => o.QB + o.RB + o.WR + o.TE;
    q1f[key] = {
      arank: Object.fromEntries(Object.entries(cnt.arank).map(([k, v]) =>
        [k, r3(v / tot(cnt.arank))])),
      raw: Object.fromEntries(Object.entries(cnt.raw).map(([k, v]) =>
        [k, r3(v / tot(cnt.raw))])),
      picks: tot(cnt.arank),
    };
    console.log(`  Q1f stodu-blanda i umferdum 1-3 (${key}, ${q1f[key].picks} vol):` +
      `  VBD ${["QB", "RB", "WR", "TE"].map((x) => `${x} ${(q1f[key].arank[x] * 100).toFixed(0)}%`).join(" ")}` +
      `  |  hra ${["QB", "RB", "WR", "TE"].map((x) => `${x} ${(q1f[key].raw[x] * 100).toFixed(0)}%`).join(" ")}`);
  }
  console.log("");

  /* ============================================================
     Q1d  PLACEBO-THAK FYRIR BANDID
     ============================================================ */
  console.log(`  Q1d PLACEBO-THAK — A-bordid truflad i SAMA bandi`);
  const PLACEBOS = [1, 2, 3, 4, 5, 6, 7, 8];
  const PW = [0.06, 0.10];
  const q1placebo = {};
  for (const key of REAL) {
    const sh = shapeOf[key];
    const cells = [];
    for (const b of ["r1-3", "r4-7", "r8+"]) {
      const bd = BANDS.find((x) => x.key === b);
      for (const p of PLACEBOS) for (const w of PW) {
        const treat = { board: (X) => bandBoard(arankBoard(X, sh.fmt, repl[sh.key]),
          placeboBoard(X, sh.fmt, repl[sh.key], p, w), bd.lo, bd.hi) };
        const { perYear } = cell({ shape: sh, treat, ctrl: A_OF(sh),
          runs: PRUNS, seedBase: 202 });
        /* SAMA FORMERKI OG Q1: `A - truflað`. Placebo-thakid er thvi
           thak a "hve mikid getur A virst sla akvedid sud", sem er
           nakvaemlega sami mælikvardi og bandið er maelt a. */
        const wS = boot(perYear, "winsT", "winsC", true);
        const sS = boot(perYear, "seasonT", "seasonC", true);
        cells.push({ band: b, placebo: p, w,
          wins: wS.diff, winsT: wS.t, season: sS.diff, seasonT: sS.t });
      }
    }
    const pos = (f) => cells.map((c) => c[f]).filter((v) => v != null && v > 0);
    q1placebo[key] = {
      cells,
      ceiling: {
        winsMaxPositiveMean: r3(Math.max(0, ...pos("wins"))),
        winsMaxPositiveT: r3(Math.max(0, ...pos("winsT"))),
        seasonMaxPositiveMean: r1(Math.max(0, ...pos("season"))),
        seasonMaxPositiveT: r3(Math.max(0, ...pos("seasonT"))),
      },
    };
    const c = q1placebo[key].ceiling;
    console.log(`      ${key.padEnd(10)} thak: sigrar ${sgn(c.winsMaxPositiveMean)} (t ${sgn(c.winsMaxPositiveT)})` +
      `  stig ${sgn(c.seasonMaxPositiveMean, 1)} (t ${sgn(c.seasonMaxPositiveT)})  · ${cells.length} holf`);
  }

  /* ============================================================
     Q2a  QB-EINN VARAMANNS-GRUNNUR
     ============================================================ */
  console.log(`\n${"=".repeat(76)}\n  Q2a. QB-EINN VARAMANNS-GRUNNUR (fast grid, ekki fittad)\n${"=".repeat(76)}`);
  console.log(`  d > 0 = DYPRA threp = LAEGRI grunnur = MEIRA VBD a QB = elite QB UPP bordid`);
  console.log(`  jakvaed tala = afbrigdid slaer sent A-Ranking\n`);
  const DGRID = [-4, 0, 4, 8, 12, 18];
  const q2a = {};
  for (const key of Object.keys(shapeOf)) {
    const sh = shapeOf[key];
    q2a[key] = { label: sh.label, shippedQb: repl[sh.key].QB, rows: [] };
    console.log(`  ${sh.label}  (sent QB-threp = QB${repl[sh.key].QB})`);
    for (const d of DGRID) {
      const rp = { ...repl[sh.key], QB: Math.max(1, repl[sh.key].QB + d) };
      const treat = { board: (X) => arankBoard(X, sh.fmt, rp) };
      const { perYear } = cell({ shape: sh, treat, ctrl: A_OF(sh), seedBase: 303 });
      const w = boot(perYear, "winsT", "winsC");
      const s = boot(perYear, "seasonT", "seasonC");
      const slp = {}; for (const y of sleeperYears) slp[y] = perYear[y];
      const row = { d, qbRank: rp.QB, wins: w, season: s,
        champ: boot(perYear, "champT", "champC"),
        sleeperOnly: { wins: boot(slp, "winsT", "winsC"),
                       season: boot(slp, "seasonT", "seasonC") },
        perYear };
      q2a[key].rows.push(row);
      console.log(`    QB${String(rp.QB).padEnd(3)} (d=${String(d).padStart(3)})  ` +
        `${sgn(w.diff)} [${sgn(w.lo)}, ${sgn(w.hi)}] t=${sgn(w.t)} ${w.wins}/${w.years}` +
        `${w.excludesZero ? " SIG" : "    "}  ${sgn(s.diff, 1)} [${sgn(s.lo, 1)}, ${sgn(s.hi, 1)}] ` +
        `${s.wins}/${s.years}${s.excludesZero ? " SIG" : ""}`);
    }
    /* d=0 MA ALDREI VERA ANNAD EN 0 — thad er hlid, ekki upplysing. */
    const z = q2a[key].rows.find((r) => r.d === 0);
    q2a[key].zeroGate = { wins: z.wins.diff, season: z.season.diff,
      ok: z.wins.diff === 0 && z.season.diff === 0 };
    if (!q2a[key].zeroGate.ok) {
      console.error(`\n  Q2a-HLID FELLUR: d=0 gefur ${z.wins.diff}/${z.season.diff}, ekki 0\n`);
      process.exit(2);
    }
    console.log("");
  }

  /* PLACEBO: SOMU hlidranir a RB/WR/TE. */
  console.log(`  Q2a-placebo — SOMU hlidranir a RB/WR/TE (vbdbase-lab maeldi thaer allar null)`);
  const q2placebo = {};
  for (const key of REAL) {
    const sh = shapeOf[key];
    const cells = [];
    for (const pos of ["RB", "WR", "TE"]) for (const d of DGRID.filter((x) => x !== 0)) {
      const rp = { ...repl[sh.key], [pos]: Math.max(1, repl[sh.key][pos] + d) };
      const treat = { board: (X) => arankBoard(X, sh.fmt, rp) };
      const { perYear } = cell({ shape: sh, treat, ctrl: A_OF(sh),
        runs: PRUNS, seedBase: 404 });
      const w = boot(perYear, "winsT", "winsC");
      const s = boot(perYear, "seasonT", "seasonC");
      cells.push({ pos, d, wins: w.diff, winsT: w.t, season: s.diff, seasonT: s.t });
    }
    const pos = (f) => cells.map((c) => c[f]).filter((v) => v != null && v > 0);
    q2placebo[key] = { cells, ceiling: {
      winsMaxPositiveMean: r3(Math.max(0, ...pos("wins"))),
      winsMaxPositiveT: r3(Math.max(0, ...pos("winsT"))),
      seasonMaxPositiveMean: r1(Math.max(0, ...pos("season"))),
      seasonMaxPositiveT: r3(Math.max(0, ...pos("seasonT"))) } };
    const c = q2placebo[key].ceiling;
    console.log(`      ${key.padEnd(10)} thak: sigrar ${sgn(c.winsMaxPositiveMean)} (t ${sgn(c.winsMaxPositiveT)})` +
      `  stig ${sgn(c.seasonMaxPositiveMean, 1)} (t ${sgn(c.seasonMaxPositiveT)})  · ${cells.length} holf`);
  }

  /* ============================================================
     Q2c  SKILYRT ELITE-QB REGLA
     ============================================================ */
  console.log(`\n${"=".repeat(76)}\n  Q2c. SKILYRT ELITE-QB REGLA (G = bil ofan i QB-grunninn, R+1 = umferdin)\n${"=".repeat(76)}`);
  console.log(`  G=0 er AKKERI: tha er reglan sama og \`qb1\`/\`qb2\`/\`qb3\` i h2h.json q2`);
  console.log(`  jakvaed tala = elite-QB reglan slaer sent A-Ranking\n`);
  const GGRID = [0, 40, 60, 80];
  const q2c = {};
  /* Hve stort er bilid i raun? Talan er BIRT thvi grid an hennar segir
     ekki hvort skilyrdid firrar yfirleitt. */
  const qbGap = {};
  for (const key of Object.keys(shapeOf)) {
    const sh = shapeOf[key];
    qbGap[key] = Object.fromEntries(ys.map((y) => {
      const b = posBase(worlds[y], sh.fmt, repl[key]);
      let best = -Infinity, name = null;
      for (let i = 0; i < worlds[y].N; i++) {
        if (worlds[y].P[i].pos !== "QB") continue;
        const v = worlds[y].proj[sh.fmt][i];
        if (v == null) continue;
        if (v - (b.QB ?? 0) > best) { best = v - (b.QB ?? 0); name = worlds[y].P[i].name; }
      }
      return [y, { gap: r1(best), qb: name, qbBase: r1(b.QB) }];
    }));
  }
  for (const key of REAL) {
    const sh = shapeOf[key];
    q2c[key] = { label: sh.label, qbGap: qbGap[key], rows: [] };
    console.log(`  ${sh.label}`);
    console.log(`    bil QB1 ofan i QB${repl[key].QB}-grunninn per ar: ` +
      ys.map((y) => `${y} ${r1(qbGap[key][y].gap)}`).join(" · "));
    for (const R of [0, 1, 2]) for (const G of GGRID) {
      const treat = { board: (X) => eliteQbBoard(X, sh.fmt, repl[key], G, R).board };
      const { perYear } = cell({ shape: sh, treat, ctrl: A_OF(sh), seedBase: 707 });
      const w = boot(perYear, "winsT", "winsC");
      const sc = boot(perYear, "seasonT", "seasonC");
      const firedYears = ys.filter((y) => qbGap[key][y].gap >= G).length;
      q2c[key].rows.push({ round: R + 1, G, firedYears, years: ys.length,
        wins: w, season: sc, champ: boot(perYear, "champT", "champC"), perYear });
      console.log(`    umferd ${R + 1}, G=${String(G).padStart(3)} (firrar ${firedYears}/${ys.length} ar)  ` +
        `${sgn(w.diff)} [${sgn(w.lo)}, ${sgn(w.hi)}] ${w.wins}/${w.years}` +
        `${w.excludesZero ? " SIG" : "    "}  ${sgn(sc.diff, 1)} [${sgn(sc.lo, 1)}, ${sgn(sc.hi, 1)}] ` +
        `${sc.wins}/${sc.years}${sc.excludesZero ? " SIG" : ""}`);
    }
    console.log("");
  }

  /* ============================================================
     Q2b  STODU-THAKID — HVAD KOSTAR ANNAR QB?
     ============================================================ */
  console.log(`\n${"=".repeat(76)}\n  Q2b. STODU-THAK A OKKAR LIDI (maxPos)\n${"=".repeat(76)}`);
  console.log(`  jakvaed tala = ad NEITA ser um seinni manninn a stodunni SLAER sent thak\n`);
  const CAPS = [
    { pos: "QB", cap: 1, label: "QB max 1 (sent: 2)", why: "annar QB byrjar ALDREI i eins-QB deild" },
    { pos: "TE", cap: 1, label: "TE max 1 (sent: 2)", why: "SAMANBURDUR — annar TE GETUR byrjad i FLEX" },
    { pos: "RB", cap: 5, label: "RB max 5 (sent: 6)", why: "SAMANBURDUR — herding a thaki sem bindur sjaldan" },
  ];
  const q2b = {};
  for (const key of Object.keys(shapeOf)) {
    const sh = shapeOf[key];
    q2b[key] = { label: sh.label, rows: [] };
    console.log(`  ${sh.label}`);
    for (const c of CAPS) {
      const treat = { board: (X) => makeCapBoard(X,
        arankBoard(X, sh.fmt, repl[sh.key]), c.pos, c.cap) };
      const { perYear } = cell({ shape: sh, treat, ctrl: A_OF(sh), seedBase: 505 });
      const w = boot(perYear, "winsT", "winsC");
      const s = boot(perYear, "seasonT", "seasonC");
      const slp = {}; for (const y of sleeperYears) slp[y] = perYear[y];
      q2b[key].rows.push({ ...c, wins: w, season: s,
        champ: boot(perYear, "champT", "champC"),
        sleeperOnly: { wins: boot(slp, "winsT", "winsC"),
                       season: boot(slp, "seasonT", "seasonC") },
        perYear });
      console.log(`    ${c.label.padEnd(20)} ${sgn(w.diff)} [${sgn(w.lo)}, ${sgn(w.hi)}] ` +
        `t=${sgn(w.t)} ${w.wins}/${w.years}${w.excludesZero ? " SIG" : "    "}  ` +
        `${sgn(s.diff, 1)} [${sgn(s.lo, 1)}, ${sgn(s.hi, 1)}] ${s.wins}/${s.years}` +
        `${s.excludesZero ? " SIG" : ""}`);
    }
    console.log("");
  }

  /* ============================================================
     PER-LEIKMANNS BOOTSTRAP — ADEINS A THVI SEM LITUR JAKVAETT UT
     ============================================================
     Hlidið sem gaf `vbdbase-lab` 0 af 153. Thad er dyrt (laugin er
     endursynd PBOOT sinnum per ar) svo thad er keyrt ADEINS a theim
     frumum sem eiga eitthvad ad verja: medaltal med rettu formerki OG
     ars-klasad vikmork sem utiloka null. Fruma sem er thegar null
     tharf thad ekki — og ad segja "hun fell ekki a per-leikmanns
     hlidinu" um frumu sem fell adur er villandi.
     ============================================================ */
  console.log(`\n${"=".repeat(76)}\n  PER-LEIKMANNS BOOTSTRAP (klasi = LEIKMADURINN)\n${"=".repeat(76)}`);
  const candidates = [];
  for (const key of REAL) {
    for (const b of ["r1-3", "r4-7", "r8+", "full"]) {
      const c = q1[key].bands[b];
      for (const m of ["wins", "season"]) {
        if (c[m].diff > 0 && c[m].excludesZero) {
          candidates.push({ kind: "q1band", shape: key, id: b, metric: m,
            make: (sh) => ({ board: (X) => bandBoard(arankBoard(X, sh.fmt, repl[sh.key]),
              projBoard(X, sh.fmt), c.lo, c.hi) }), flip: true });
        }
      }
    }
    for (const m of ["wins", "season"]) {
      if (q1e[key][m].diff > 0 && q1e[key][m].excludesZero) {
        candidates.push({ kind: "q1band", shape: key, id: "r1-3-noQB", metric: m,
          make: (sh) => ({ board: (X) => bandBoard(arankBoard(X, sh.fmt, repl[sh.key]),
            projBoard(X, sh.fmt), 0, 2), plan: NOQB3 }), flip: true,
          ctrlPlan: NOQB3 });
      }
    }
    for (const r of q2a[key].rows) {
      if (r.d === 0) continue;
      for (const m of ["wins", "season"]) {
        if (r[m].diff > 0 && r[m].excludesZero) {
          const rp = { ...repl[key], QB: r.qbRank };
          candidates.push({ kind: "q2a", shape: key, id: `QB${r.qbRank}`, metric: m,
            make: (sh) => ({ board: (X) => arankBoard(X, sh.fmt, rp) }), flip: false });
        }
      }
    }
    for (const r of q2c[key].rows) {
      for (const m of ["wins", "season"]) {
        if (r[m].diff > 0 && r[m].excludesZero) {
          candidates.push({ kind: "q2c", shape: key, id: `R${r.round}G${r.G}`, metric: m,
            make: (sh) => ({ board: (X) => eliteQbBoard(X, sh.fmt, repl[key], r.G, r.round - 1).board }),
            flip: false });
        }
      }
    }
    for (const r of q2b[key].rows) {
      for (const m of ["wins", "season"]) {
        if (r[m].diff > 0 && r[m].excludesZero) {
          candidates.push({ kind: "q2b", shape: key, id: `${r.pos}<=${r.cap}`, metric: m,
            make: (sh) => ({ board: (X) => makeCapBoard(X,
              arankBoard(X, sh.fmt, repl[sh.key]), r.pos, r.cap) }), flip: false });
        }
      }
    }
  }
  /* Ein fruma per (kind, shape, id) — badir maelikvardar eru reiknadir
     i sömu ferd, svo tvitalning er tekin ut. */
  const uniq = [];
  for (const c of candidates) {
    if (!uniq.some((u) => u.kind === c.kind && u.shape === c.shape && u.id === c.id)) uniq.push(c);
  }
  console.log(`  ${uniq.length} fruma/frumur ad verja` +
    (uniq.length ? `: ${uniq.map((u) => `${u.shape}/${u.id}`).join(", ")}` : " — ekkert komst yfir ars-hlidid"));

  const playerBoot = [];
  /* `--pboot=0` SLEPPIR hlidinu og THAD ER SKRAD. Tom rod ma ekki lesa
     sem "0 — utilokar ekki null", thvi thad vaeri omaeld tala sem litur
     ut eins og maeling (sama regla og `bootZero` ver). */
  if (PBOOT === 0) console.log(`  --pboot=0: SLEPPT (skrad i \`playerBootstrapSkipped\`)`);
  for (const u of (PBOOT === 0 ? [] : uniq)) {
    const sh = shapeOf[u.shape];
    const treat = u.make(sh);
    /* Vidmidid VERDUR ad bera SOMU hoft og medferdin (Q1e). Vaeri thad
       an theirra vaeri per-leikmanns hlidid ad maela adra frumu en
       ars-hlidid, sem er nakvaemlega thad sem gerir tvaer maelingar
       osamanburdarhaefar. */
    const ctrl = u.ctrlPlan ? { ...A_OF(sh), plan: u.ctrlPlan } : A_OF(sh);
    /* ============================================================
       ARIN ERU MEDALTOLUD INNAN HVERRAR ITRUNAR — EKKI FLOTT UT
       ============================================================
       Fyrsta utgafa thessa reits ytti hverju (ar, itrun) PARI i eitt
       flatt fylki og tok hundradshluta af thvi. Su tala er EKKI
       leikmanna-klasad vikmork heldur BLANDA af leikmanna-floktinu og
       ARS-floktinu, og hun maelist thvi MARGFALT BREIDARI en gognin
       segja: 10-2flex/r1-3 las [-1,60, +4,58] i stad thess bils sem
       aetlunin var ad maela.

       `vbdbase-lab.mjs` gerir thetta rett og talan her VERDUR ad vera
       sambaerileg vid hana — hun er talan sem gaf "0 af 153". Reglan er
       thvi ordrett hennar: ein itrun = MEDALTAL YFIR AR af pordum mun,
       og hundradshlutir eru teknir af itrununum. */
    const wD = [], sD = [];
    for (let it = 0; it < PBOOT; it++) {
      const wY = [], sY = [];
      for (const y of ys) {
        const RW = resampleWorld(worlds[y], sh.fmt, (y * 7919 + it * 65537) >>> 0);
        const acc = runCell({ shape: sh, W: RW, treat, ctrl, runs: PBRUNS,
          seedBase: 606 + it, adpSrc: ADP_SRC[sh.fmt] });
        const st = cellStats(acc);
        wY.push(u.flip ? -st.winsDiff : st.winsDiff);
        sY.push(u.flip ? -st.seasonDiff : st.seasonDiff);
      }
      wD.push(mean(wY)); sD.push(mean(sY));
    }
    const q = (a, p) => { const v = a.slice().sort((x, y2) => x - y2);
      return v[Math.min(v.length - 1, Math.max(0, Math.floor(p * v.length)))]; };
    const row = { ...{ kind: u.kind, shape: u.shape, id: u.id },
      iters: wD.length, seasonsPerIter: ys.length,
      wins: { mean: r3(mean(wD)), lo: r3(q(wD, 0.025)), hi: r3(q(wD, 0.975)) },
      season: { mean: r1(mean(sD)), lo: r1(q(sD, 0.025)), hi: r1(q(sD, 0.975)) } };
    row.wins.excludesZero = row.wins.lo > 0 || row.wins.hi < 0;
    row.season.excludesZero = row.season.lo > 0 || row.season.hi < 0;
    playerBoot.push(row);
    console.log(`    ${u.shape}/${u.id.padEnd(10)} sigrar ${sgn(row.wins.mean)} ` +
      `[${sgn(row.wins.lo)}, ${sgn(row.wins.hi)}]${row.wins.excludesZero ? " SIG" : ""}  ` +
      `stig ${sgn(row.season.mean, 1)} [${sgn(row.season.lo, 1)}, ${sgn(row.season.hi, 1)}]` +
      `${row.season.excludesZero ? " SIG" : ""}`);
  }

  /* ============================================================
     BARINN — HVER FRUMA GEGN ALLRI FIMM SKILYRDUNUM
     ============================================================ */
  /* HVADA PLACEBO-THAK GILDIR UM HVADA FJOLSKYLDU.
     Q1 (band) hefur sitt eigid thak (truflun i SAMA bandi). Q2a/Q2b/Q2c
     eru allar STODU-BUNDNAR breytingar a bordinu og eru maeldar gegn
     thaki hlidrana a RB/WR/TE — sama vel, onnur stada. Thad er sagt
     berum ordum thvi thakid er EKKI hreint sud (sja hausinn): thad er
     dreifing SAMBAERILEGRA breytinga sem `vbdbase-lab` maeldi allar
     sem null. */
  const ceilOf = (kind, shape, metric) => {
    const c = kind === "q1band" ? q1placebo[shape] : q2placebo[shape];
    if (!c) return null;
    return metric === "wins"
      ? { mean: c.ceiling.winsMaxPositiveMean, t: c.ceiling.winsMaxPositiveT }
      : { mean: c.ceiling.seasonMaxPositiveMean, t: c.ceiling.seasonMaxPositiveT };
  };
  const verdictRows = [];
  const consider = [];
  for (const key of REAL) {
    for (const b of ["r1-3", "r4-7", "r8+", "full"])
      consider.push({ kind: "q1band", shape: key, id: b, stat: q1[key].bands[b] });
    consider.push({ kind: "q1band", shape: key, id: "r1-3-noQB", stat: q1e[key] });
    for (const r of q2a[key].rows) if (r.d !== 0)
      consider.push({ kind: "q2a", shape: key, id: `QB${r.qbRank}`, stat: r });
    for (const r of q2c[key].rows)
      consider.push({ kind: "q2c", shape: key, id: `R${r.round}G${r.G}`, stat: r });
    for (const r of q2b[key].rows)
      consider.push({ kind: "q2b", shape: key, id: `${r.pos}<=${r.cap}`, stat: r });
  }
  for (const c of consider) {
    for (const m of ["wins", "season"]) {
      const st = c.stat[m];
      const pb = playerBoot.find((p) => p.kind === c.kind && p.shape === c.shape && p.id === c.id);
      const ce = ceilOf(c.kind, c.shape, m);
      const tests = {
        signPositive: st.diff != null && st.diff > 0,
        seasonClusteredCiExcludesZero: st.excludesZero === true,
        playerClusteredCiExcludesZero: pb ? pb[m].excludesZero === true : null,
        abovePlaceboCeiling: ce && st.diff != null && st.t != null
          ? (st.diff > ce.mean && st.t > ce.t) : null,
        majorityOfSeasons: st.years ? st.wins > st.years / 2 : false,
      };
      const clears = tests.signPositive && tests.seasonClusteredCiExcludesZero
        && tests.playerClusteredCiExcludesZero === true
        && tests.abovePlaceboCeiling === true && tests.majorityOfSeasons;
      verdictRows.push({ ...c, stat: undefined, metric: m,
        diff: st.diff, lo: st.lo, hi: st.hi, t: st.t,
        seasons: `${st.wins}/${st.years}`, tests, clearsBar: clears });
    }
  }
  const cleared = verdictRows.filter((r) => r.clearsBar);
  /* BADIR MAELIKVARDAR — README 5n: osamhljoda lestur er merki um
     maelitaekid, svo "stenst" krefst thess ad HVORUGUR maelikvardi
     hafni frumunni. */
  const bothMetrics = [];
  for (const c of consider) {
    const w = verdictRows.find((r) => r.kind === c.kind && r.shape === c.shape
      && r.id === c.id && r.metric === "wins");
    const s = verdictRows.find((r) => r.kind === c.kind && r.shape === c.shape
      && r.id === c.id && r.metric === "season");
    if (w && s && w.clearsBar && s.clearsBar) bothMetrics.push(`${c.shape}/${c.kind}/${c.id}`);
  }

  console.log(`\n${"=".repeat(76)}\n  BARINN\n${"=".repeat(76)}`);
  console.log(`  frumur skodadar: ${verdictRows.length / 2} x 2 maelikvardar`);
  console.log(`  standast a EINUM maelikvarda : ${cleared.length ? cleared.map((r) => `${r.shape}/${r.id}(${r.metric})`).join(", ") : "ENGIN"}`);
  console.log(`  standast a BADUM             : ${bothMetrics.length ? bothMetrics.join(", ") : "ENGIN"}`);

  /* ============================================================
     BOKAD SEM VAR THEGAR MAELT — ENDURBIRT, EKKI ENDURKEYRT
     ============================================================ */
  const alreadyMeasured = {
    qbRoundPlans: {
      source: "data/measure/h2h.json -> q2 (7 timabil, badir maelikvardar)",
      note: "Ad THVINGA QB i tiltekna umferd er MAELT. Thad er ekki endurkeyrt her.",
      rows: booked && booked.q2 ? Object.fromEntries(Object.keys(booked.q2).map((k) =>
        [k, Object.fromEntries(booked.q2[k].rows
          .filter((r) => /^qb/.test(r.key))
          .map((r) => [r.key, {
            wins: r.vsBpaWins ? { diff: r.vsBpaWins.diff, lo: r.vsBpaWins.lo,
              hi: r.vsBpaWins.hi, excludesZero: r.vsBpaWins.excludesZero,
              seasons: `${r.vsBpaWins.wins}/${r.vsBpaWins.years}` } : null,
            season: r.vsBpaSeason ? { diff: r.vsBpaSeason.diff, lo: r.vsBpaSeason.lo,
              hi: r.vsBpaSeason.hi, excludesZero: r.vsBpaSeason.excludesZero,
              seasons: `${r.vsBpaSeason.wins}/${r.vsBpaSeason.years}` } : null,
            champ: r.vsBpaChamp ? { diff: r.vsBpaChamp.diff,
              excludesZero: r.vsBpaChamp.excludesZero } : null,
          }]))])) : null,
    },
    perPositionBaselineOffsets: {
      source: "data/measure/vbdbase.json (offset-pos, fittad walk-forward)",
      note: "Hlidrun PER STODU var maeld og fell — 0 af 153 holfum stodust "
        + "per-leikmanns bootstrap. Fittada QB-hlidrunin hallar tho JAKVAETT, "
        + "sem er attin sem elite-QB tilgatan spair. Q2a her er FAST grid a "
        + "QB EINUM og er maeld i SIGRUM lika, sem hun var ekki.",
    },
    dynamicVbd: {
      source: "README 5h / model_eval",
      note: "Kvikt VBD (threp endurreiknad ur theim sem eftir eru eda ur naesta "
        + "vali) er maelt og fellt: -89, -31, -97, +12.",
    },
    strategyTable: {
      source: "data/strategy_ppr.json + README 5b",
      note: "QB i 1. umferd -77 og QB i 2. umferd -43 stig (12 lid, 1 FLEX, "
        + "11 timabil, vikmork utiloka null i badum). Su tala er i ALMENNU "
        + "logninni; h2h.json q2 ber hana i logunum notandans.",
    },
  };

  const out = {
    generated: new Date().toISOString(),
    provenance: stamp({
      argv: process.argv.slice(2),
      defaults: DEFAULTS,
      inputs: ["features.json", "measure/h2h.json",
        ...ys.map((y) => `weekly/${y}.json`)],
      dataDir: DATA,
    }),
    question: {
      origin: "Notandinn draftadi ur saeti 4 i 10-lida PPR og endadi 4. af 10; "
        + "saeti 5 vann. Vid 1.4 sagdi appid Jonathan Taylor (spa 272) medan "
        + "Ja'Marr Chase (spa 311) var laus.",
      q1: "Vinnur VBD i umferdum 1-3, eda kemur allt forskotid ur midjunni?",
      q2: "Er elite QB vanverdlagdur i eins-QB deild, og hvad kostar "
        + "maxPos.QB = 2?",
    },
    design: {
      harness: "src/accuracy.js (simulateDraft, scoreLeague, roundRobin, "
        + "startersPoints) — FLUTT INN, ekki afritad.",
      world: "Ordrett `buildWorld` ur h2h-lab.mjs. Auditerad i N3 gegn "
        + "bokudu A-Ranking-gegn-ADP tolunni i h2h.json.",
      pairing: "Medferd i saeti i, vidmid i saeti j, spegluð; oll onnur "
        + "saeti drafta eftir ADP med maeldu sudi.",
      bandMechanism: "Bord sem FALL af umferd. treat = hra spa-rod i "
        + "bandinu, A-Ranking annars. BIRT tala er `A - hybrid`, svo "
        + "jakvaed = VBD hjalpar i bandinu.",
      capMechanism: "maxPos er deildar-vitt i `accuracy.js` (asett). Thak "
        + "a OKKAR LIDI EINU er thvi sett i BORDID: staðan faerd i taglid "
        + "thegar thakid er nad, aldrei ohaef (sleppt val vaeri onnur "
        + "tilraun).",
      bar: ["formerki", "ars-klasad bootstrap utilokar null",
        "leikmanns-klasad bootstrap utilokar null", "yfir placebo-thaki "
        + "(einhlida mean OG t)", "meirihluti timabila", "haldi i BADUM "
        + "maelikvordum"],
    },
    unmeasured: {
      waivers: "Hoparnir eru fastir allt timabilid — sama einfoldun og "
        + "h2h-lab. Meiddur madur er 0 stig i 10 vikur og enginn getur "
        + "skipt honum ut. Thad slaer BADA arma eins.",
      kdst: "K og DST eru utan draftsins (`excludePos`), svo tom saeti hja "
        + "OLLUM lidum i 10-lida deildinni; thau fella ut ur hverjum mun.",
      secondQbAsInsurance: "MIKILVAEGT, OG THAD HALLAR MED SENDU REGLUNNI. "
        + "Hoparnir eru FASTIR og engin waiver-vidskipti eru i herminum, en "
        + "byrjunarlid vikunnar er valid ur theim sem SKORUDU. Draftadur "
        + "vara-QB fyllir thvi bye-viku og meidsli sem raunverulegur "
        + "stjornandi hefdi fyllt med FRIUM manni af waiver. Herminn "
        + "OFURMETUR thvi seinni QB-inn: maeldur kostnadur thaksins er "
        + "NEDRI mork a raunverulegu tapinu. Hann maelist samt ~0, og i "
        + "12-2flex maelist thad MARKTAEKT VERRA ad taka hann EKKI.",
      eliteQbConditionalGrid: "Q2c maelir skilyrta regluna a gridi (G x R). "
        + "Hun er EKKI leit ad besta G — thad vaeri urtaksval a 7 arum. "
        + "Gridid er birt i heild og barinn gildir um hvert holf.",
    },
    seasons: ys, sleeperSeasons: sleeperYears,
    coverage: Object.fromEntries(ys.map((y) => [y, worlds[y].coverage])),
    replacementRanks: repl,
    gates,
    q1, q1seatTable: seatTable, q1firstThree: q1c,
    q1noQbBand: q1e, q1positionMix: q1f, q1placebo,
    q2a, q2placebo, q2b, q2c, qbGap,
    playerBootstrap: playerBoot,
    playerBootstrapSkipped: PBOOT === 0,
    playerBootstrapCandidates: uniq.map((u) => `${u.shape}/${u.kind}/${u.id}`),
    verdictRows,
    clearsOnEitherMetric: cleared.map((r) => `${r.shape}/${r.kind}/${r.id}(${r.metric})`),
    clearsOnBothMetrics: bothMetrics,
    alreadyMeasured,
    runtimeSec: r1((Date.now() - t0) / 1000),
  };

  await mkdir(path.join(DATA, "measure"), { recursive: true });
  await writeFile(path.join(DATA, "measure", "band.json"), JSON.stringify(out, null, 1));
  console.log(`\n-> data/measure/band.json   (${out.runtimeSec}s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
