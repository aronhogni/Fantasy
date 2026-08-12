#!/usr/bin/env node
/* ============================================================
   agecurve-lab.mjs — ER ALDURSKLIF RAUNVERULEGT OFAN A SPANA?

     node scripts/agecurve-lab.mjs [--runs=3] [--boot=600] [--from=2015]

   -> data/measure/agecurve.json

   ============================================================
   HVERS VEGNA THETTA ER MAELT AFTUR — OG HVERS VEGNA THAD ER EKKI
   ENDURTEKNING A `feature-probe.mjs`
   ============================================================
   `feature-probe` maeldi `age` gegn leif Sleeper-sparinnar og fekk
   **r = -0,017**. Su tala er RETT og hun er endurreiknud her sem
   akkeri (kafli A). En hun er svar vid ODRU falli en spurningunni.

   LINULEG FYLGNI GETUR EKKI GREINT ALDURSKLIF. Ef hlaupari heldur
   virdi til 26 og hrynur svo, er sannleikurinn BROTALINA. Fylgni yfir
   allt svidid jafnar haekkunina 22->26 ut a moti fallinu 27->31 og
   skilar ~0. Tvo raunveruleg merki med gagnstaedum formerkjum gefa
   somu tolu og ekkert merki — og fylgnin getur ekki greint thau ad.

   Thetta er sama aett og "Snertingar i vitateig" i FPL-verkefninu:
   **rett maeling, rangt inntak.** Her er thvi maelt OLINULEGT fall:
   brotalina med FITTUDUM hnykk, ferningslidur, og sama tvennt fyrir
   `exp` (ar i deildinni) i stad `age`.

   ============================================================
   THRJU SKILYRDI SEM GERA THETTA MAELINGU OG EKKI LEIT
   ============================================================
   1. **AD SKILJA ALDUR FRA THVI SEM MARKADURINN VEIT THEGAR.**
      Spurningin er EKKI "fellur gamall RB?" (thad vita allir og ADP
      verdleggur thad) heldur "fellur hann MEIRA en spain og ADP
      segja?". Thvi er markmidid LEIF sparinnar og `log(ADP)` er
      STYRIBREYTA i hverju fitti. Aldurslidirnir eru thar med
      HLUTSTUDLAR, net af thvi sem herbergid veit. Baedi er maelt —
      med og an ADP-styringar — thvi munurinn a theim ER svarid vid
      "veit markadurinn thetta thegar?".

   2. **WALK-FORWARD, ALLTAF.** Hnykkurinn er valinn a arum A UNDAN
      profarinu og vogin `w` somuleidis. Brotalina med fittudum hnykk
      hefur FLEIRI FRIGRADUR en linuleg fylgni — thad er einmitt hvers
      vegna hun GETUR unnid i urtaki og TAPAD ut fyrir thad. README
      5h skjalar thetta ordrett um aldur: hann "var best i hrau
      leitinni i HVERT einasta sinn — og fell i walk-forward i hvert
      einasta sinn". Su fyrri maeling var a LINULEGU z-skori; her er
      formid annad, en varnaglinn er sami.

   3. **MAELIKVARDINN ER AKVORDUNIN.** Draft-hermunin (`simulateDraft`)
      er talan sem gildir; fylgni og R2 fylgja sem aukaupplysing.
      README: "haerri fylgni er ekki sama og betri akvordun".

   ============================================================
   HALF-PPR ER REIKNAD UPP A STIG, EKKI NALGAD
   ============================================================
   Eini munurinn a snidunum er stig per mottoku, svo
       HALF = STD + mottokur/2 = (STD + PPR) / 2
   — ALGEBRA, ekki interpolun. Sama gildir um spana. Sama leid og
   `half-lab.mjs` notar; porunin er talin og birt.

   **ADP ER UNDANTEKNINGIN.** ADP er hegdun, ekki formula, og sogulegt
   half-ADP er ekki i gognunum. Thess vegna er half maelt TVISVAR —
   einu sinni med ppr-ADP sem markadsbord og einu sinni med std-ADP —
   og badar tolur birtar sem VIKMORK.

   ============================================================
   NULLTILGATAN VERDUR AD VERA HLUTLAUS
   ============================================================
   `w = 0` er sama bord og A-Ranking sjalft og VERDUR ad gefa
   NAKVAEMLEGA 0 i einviginu. Vaeri thad ekki svo vaeri hermunin
   osamhverf og hver tala her merkingarlaus. Thad er fyrsta profid og
   skriftan DEYR ef thad fellur (sja `neutral`).
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft } from "../src/accuracy.js";
import { replacementRanks } from "../src/model.js";
import { mean, solve, bootstrapDiff } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  runs: "number", boot: "number", from: "number",
});
const RUNS = Number(ARG.runs || 3);        // havada-keyrslur per ar i einviginu
const BOOT = Number(ARG.boot || 600);      // >= 400 er krafan
const FROM = Number(ARG.from || 2015);

const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
const sgn = (x) => (x == null ? "    -" : (x > 0 ? "+" : "") + x.toFixed(1));

/* Studentsprof a fylki ara-medaltala. Klasar eru ARIN — radir innan
   ars eru ekki ohadar (sama deild, somu adstaedur). */
function tOf(a) {
  const v = a.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r2(m / (sd / Math.sqrt(v.length))) : null;
}

/* ============================================================
   FORMIN SEM ERU PROFUD
   ============================================================
   `age` er MIDJUD a 27 og `exp` a 4 — fastar tolur, ekki fittadar, svo
   normaljofnurnar seu vel skilyrtar og studlarnir laesilegir. Midjunin
   breytir engu um fittid sjalft (bara skurdpunktinum, sem er ALDREI
   notadur — sja `correctionOf`).

   `hinge`     brotalina: halli fyrir hnykk OG annar halli eftir hann
   `hingeFlat` flatt og svo halli — "heldur virdi til k, hrynur svo",
               sem er einmitt tilgatan i sinni beinustu mynd
   `quad`      ferningslidur til samanburdar (mjuk kurfa, engin brot)
   `linear`    tilgatan sem `feature-probe` maeldi — her sem VIDMID

   `termFns(k)` skilar fylki af SKOLUM-follum, eitt per lid. Thau eru
   skrifud svona (og ekki sem eitt fall sem skilar fylki) THVI thau eru
   kollud milljonum sinnum: fylki-per-rod bjo til ~300M urtak fyrir
   sorphirduna i fyrstu utgafu og hun var threfalt haegari. */
const AGE_C = 27, EXP_C = 4;
const FAMILIES = [
  { key: "linear", v: "age", label: "age, linear (control = feature-probe)",
    termFns: () => [(r) => r.age - AGE_C] },
  { key: "quad", v: "age", label: "age + age^2",
    termFns: () => [(r) => r.age - AGE_C, (r) => (r.age - AGE_C) ** 2] },
  { key: "hinge", v: "age", label: "age, broken line with fitted knot", knots: "age",
    termFns: (k) => [(r) => r.age - AGE_C, (r) => Math.max(0, r.age - k)] },
  { key: "hingeFlat", v: "age", label: "age, flat then decline (fitted knot)", knots: "age",
    termFns: (k) => [(r) => Math.max(0, r.age - k)] },
  { key: "expLinear", v: "exp", label: "exp, linear",
    termFns: () => [(r) => r.exp - EXP_C] },
  { key: "expQuad", v: "exp", label: "exp + exp^2",
    termFns: () => [(r) => r.exp - EXP_C, (r) => (r.exp - EXP_C) ** 2] },
  { key: "expHinge", v: "exp", label: "exp, broken line with fitted knot", knots: "exp",
    termFns: (k) => [(r) => r.exp - EXP_C, (r) => Math.max(0, r.exp - k)] },
  { key: "expHingeFlat", v: "exp", label: "exp, flat then decline (fitted knot)", knots: "exp",
    termFns: (k) => [(r) => Math.max(0, r.exp - k)] },
];

/* Hnykk-net per stodu. Bilin eru dregin ur RAUNVERULEGRI dreifingu
   aldurs innan stodu (p25-p90 ur `features.json`) — hnykkur utan
   gagnanna er ekki fittanlegur, og QB spila til 45 medan RB eru
   horfnir vid 31. */
function mkGrid(a, b, s) {
  const o = [];
  for (let x = a; x <= b + 1e-9; x += s) o.push(Math.round(x * 100) / 100);
  return o;
}
const KNOTS = {
  age: { RB: mkGrid(24, 30, 0.5), WR: mkGrid(24, 31, 0.5),
         TE: mkGrid(25, 31, 0.5), QB: mkGrid(27, 36, 0.5) },
  exp: { RB: mkGrid(1, 8, 1), WR: mkGrid(1, 9, 1),
         TE: mkGrid(2, 10, 1), QB: mkGrid(2, 14, 1) },
};

/* Nau minnsta urtak til ad fitta yfirleitt. Undir thessu er ENGIN
   leidretting gefin (0), ekki agiskun — "omaeld tala faer ekki reit". */
const MIN_FIT = 70;         // radir i thjalfun per stodu
const MIN_SIDE = 30;        // radir a HVORA hlid hnykksins
const POSITIONS = ["QB", "RB", "WR", "TE"];

/* ============================================================
   1. OLS MED STYRIBREYTUM — OG BARA ALDURSLIDIRNIR ERU NOTADIR
   ============================================================
   `controls` (skurdpunktur, log(ADP), stodu-dummy) eru fittud MED en
   fara ALDREI inn i leidrettinguna. Thad er kjarninn i honnuninni:
   vid viljum thann hluta aldursmerkisins sem ADP hefur EKKI thegar
   verdlagt, og til thess verdur ADP ad vera i fittinu en ekki i
   utkomunni.

   `fns` er [styribreytur..., lidir...] og `nControls` segir hvar
   skilin liggja. Hvorki `X` ne rada-fylki eru materialiserud — eitt
   skrap-fylki er endurnotad. */
function ols(rows, fns, nControls, ridge = 1e-6) {
  const p = fns.length;
  if (rows.length <= p + 2) return null;
  const XtX = Array.from({ length: p }, () => new Float64Array(p));
  const Xty = new Float64Array(p);
  const x = new Float64Array(p);
  for (const r of rows) {
    for (let j = 0; j < p; j++) x[j] = fns[j](r);
    const y = r.resid;
    for (let a = 0; a < p; a++) {
      Xty[a] += x[a] * y;
      const row = XtX[a];
      for (let b = a; b < p; b++) row[b] += x[a] * x[b];
    }
  }
  const A = [];
  for (let a = 0; a < p; a++) {
    const row = new Array(p);
    for (let b = 0; b < p; b++) row[b] = b >= a ? XtX[a][b] : XtX[b][a];
    /* Ordid smar ridge-lidur er EKKI reglun heldur toluleg vorn: an hans
       verdur hneppid sinngult thegar hnykkur liggur utan gagnanna og
       `solve` skilar null i midri leit. */
    row[a] += ridge;
    A.push(row);
  }
  const beta = solve(A, Array.from(Xty));
  if (!beta || beta.some((b) => !Number.isFinite(b))) return null;
  return { beta, nControls, p };
}

/** Thjalfunar-SSE fyrir fittad likan. Notad til ad velja hnykkinn. */
function sseOf(rows, fns, beta) {
  let sse = 0;
  for (const r of rows) {
    let pred = 0;
    for (let j = 0; j < fns.length; j++) pred += fns[j](r) * beta[j];
    sse += (r.resid - pred) ** 2;
  }
  return sse;
}

/**
 * Byggir LEIDRETTINGAR-FALL per stodu ur thjalfunargognum.
 *
 * `netOfAdp` segir hvort log(ADP) se styribreyta. Baedi er maelt:
 * munurinn a theim er svarid vid "veit markadurinn thetta thegar?".
 */
function buildCorrector(trainRows, fam, netOfAdp) {
  const byPos = {};
  for (const pos of POSITIONS) {
    const sub = trainRows.filter((r) => r.pos === pos && r[fam.v] != null &&
      Number.isFinite(r.resid) && (!netOfAdp || r.logAdp != null));
    if (sub.length < MIN_FIT) { byPos[pos] = null; continue; }
    const controls = netOfAdp ? [() => 1, (r) => r.logAdp] : [() => 1];

    let best = null;
    const knots = fam.knots ? KNOTS[fam.knots][pos] : [null];
    for (const k of knots) {
      /* HNYKKUR SEM HEFUR NAER ENGIN GOGN A ANNARRI HLID ER EKKI
         HNYKKUR heldur utlagi sem hefur fengid sinn eigin studul.
         Krafan um MIN_SIDE a hvora hlid er thad sem stodvar thad. */
      if (k != null) {
        let above = 0;
        for (const r of sub) if (r[fam.v] > k) above++;
        if (above < MIN_SIDE || sub.length - above < MIN_SIDE) continue;
      }
      const terms = fam.termFns(k);
      const fns = [...controls, ...terms];
      const m = ols(sub, fns, controls.length);
      if (!m) continue;
      /* Hnykkurinn er valinn a THJALFUNAR-SSE. Thad er leyfilegt THVI
         profarid er ekki i `sub` — walk-forward heldur. */
      const sse = sseOf(sub, fns, m.beta);
      if (!best || sse < best.sse) best = { sse, knot: k, beta: m.beta, terms,
        nControls: controls.length };
    }
    byPos[pos] = best ? { knot: best.knot, beta: best.beta, terms: best.terms,
      nControls: best.nControls, n: sub.length,
      coef: best.terms.map((_, j) => r3(best.beta[best.nControls + j])) } : null;
  }
  /* LEIDRETTINGIN ER ADEINS ALDURSLIDIRNIR.
     Skurdpunktur og ADP-lidur eru SLEPPT — annars vaeri thetta ny spa,
     ekki aldurs-leidretting, og bordin tvo vaeru ekki lengur porud um
     ALDUR EINAN. Fasti per stodu skiptir hvort ed er engu mali: VBD
     dregur stodu-threpid fra, svo jofn hlidrun innan stodu STYTTIST UT
     nakvaemlega. */
  const correctionOf = (r) => {
    const f = byPos[r.pos];
    if (!f || r[fam.v] == null) return 0;
    let s = 0;
    for (let j = 0; j < f.terms.length; j++) s += f.terms[j](r) * f.beta[f.nControls + j];
    return Number.isFinite(s) ? s : 0;
  };
  return { correctionOf, byPos,
    knots: Object.fromEntries(POSITIONS.map((p) => [p, byPos[p] ? byPos[p].knot : null])),
    coefs: Object.fromEntries(POSITIONS.map((p) => [p, byPos[p] ? byPos[p].coef : null])) };
}

/* Leidrettingar-foll eru DYR (hnykk-leit = allt ad 19 OLS per stodu) og
   NAKVAEMLEGA endurnytanleg: thau eru fall af (spa, snid, form, ar).
   Somu foll eru notud i kafla C og i akvordunar-einviginu og half-
   frumurnar tvaer (ADP=ppr og ADP=std) deila theim algerlega. */
const CORR_CACHE = new Map();
function corrector(rows, projKey, fmt, fam, netOfAdp, year) {
  const key = `${projKey}|${fmt}|${fam.key}|${netOfAdp ? 1 : 0}|${year}`;
  if (CORR_CACHE.has(key)) return CORR_CACHE.get(key);
  const tr = rows.filter((r) => r.season < year);
  const C = tr.length < MIN_FIT ? null : buildCorrector(tr, fam, netOfAdp);
  CORR_CACHE.set(key, C);
  return C;
}

/* ============================================================
   2. BORDIN
   ============================================================ */
/** A-Ranking: VBD ofan a spa. Sama utfaersla og `half-lab.mjs`. */
function vbdBoard(pool, repl, projOf) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const scored = [];
  for (const list of Object.values(byPos)) {
    const pos = list[0].pos;
    const vals = list.map(projOf).filter((v) => v != null).sort((a, b) => b - a);
    if (!vals.length) continue;
    const k = Math.min(vals.length - 1, (repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) {
      const v = projOf(p);
      if (v != null) scored.push([p.id, v - base]);
    }
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** Vollurinn: ADP hristur med SINU EIGIN stadalfraviki (sja arank-lab). */
function noisyField(pool, adpOf, seed) {
  let a = seed >>> 0;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const gauss = () => {
    const u = Math.max(1e-9, rnd()), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const j = pool.map((p) => {
    const adp = adpOf(p);
    const sd = p.adpSd != null && p.adpSd > 0 ? p.adpSd : 1.08 * Math.sqrt(Math.max(1, adp));
    return [p.id, adp + gauss() * sd];
  }).sort((x, y) => x[1] - y[1]);
  return new Map(j.map(([id], i) => [id, i + 1]));
}

/* ============================================================
   3. BOOTSTRAP KLASADUR PER LEIKMANN
   ============================================================
   Krafan i FPL-verkefninu (`mo-candidates.mjs`) og her: klasi er
   LEIKMADUR, ekki rod. Sami leikmadur kemur fyrir i allt ad 11
   timabilum og leifar hans eru hadar hver annarri — ad bootstrappa
   radir gaefi allt of throng vikmork.

   ATH OG THAD VERDUR AD STANDA: thetta gildir um TOLFRAEDI-DELTAID
   (R2 a leifinni). Draft-hermunin er EKKI summa per leikmann — ad
   endursyna leikmenn thar myndi breyta LAUGINNI sem er draftad ur og
   maela annad. Akvordunar-deltaid er thvi klasad PER TIMABILI og thad
   er sagt berum ordum i utkomunni (`clusterUnit`). */
function bootPlayers(rows, statFn, runs = BOOT, seed = 20260812) {
  const byId = new Map();
  for (const r of rows) {
    if (!byId.has(r.id)) byId.set(r.id, []);
    byId.get(r.id).push(r);
  }
  const clusters = [...byId.values()];
  if (clusters.length < 20) return null;
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const out = [];
  for (let i = 0; i < runs; i++) {
    const samp = [];
    for (let c = 0; c < clusters.length; c++) {
      const pick = clusters[Math.floor(rnd() * clusters.length)];
      for (const r of pick) samp.push(r);
    }
    const v = statFn(samp);
    if (v != null && Number.isFinite(v)) out.push(v);
  }
  if (out.length < runs * 0.8) return null;
  out.sort((a, b) => a - b);
  const lo = out[Math.floor(out.length * 0.025)], hi = out[Math.floor(out.length * 0.975)];
  return { lo: r4(lo), hi: r4(hi), excludesZero: lo > 0 || hi < 0,
    runs: out.length, clusters: clusters.length };
}

/* ============================================================
   MAIN
   ============================================================ */
async function main() {
  const t0 = Date.now();
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const pprRows = feats.rows.filter((r) => r.scoring === "ppr");
  const stdBy = new Map(feats.rows.filter((r) => r.scoring === "standard")
    .map((r) => [`${r.season}|${r.id}`, r]));

  /* PORUNIN VERDUR AD STANDA — half er reiknad ur BADUM snidum, svo
     rod sem er adeins i odru er ekki nothaef. Talan er birt. */
  let paired = 0, unpaired = 0;
  for (const r of pprRows) (stdBy.has(`${r.season}|${r.id}`) ? paired++ : unpaired++);
  console.log(`porun ppr<->standard: ${paired} por, ${unpaired} oporud`);

  /* ---------- laugin per ari ---------- */
  const pools = {};
  for (const r of pprRows) {
    if (r.season < FROM || r.season > 2025) continue;
    const b = stdBy.get(`${r.season}|${r.id}`);
    if (!b) continue;
    if (r.adp == null || b.adp == null || r.pts == null || b.ptsStd == null) continue;
    if (r.age == null || r.exp == null) continue;
    const half = (a, c) => (a != null && c != null ? (a + c) / 2 : null);
    const row = {
      id: r.id, name: r.name, pos: r.pos, season: r.season,
      age: r.age, exp: r.exp, draftRound: r.draftRound, draftPick: r.draftPick,
      adp: { ppr: r.adp, standard: b.adp }, adpSd: r.adpSd,
      logAdp: Math.log(r.adp),
      proj: {
        sleeper: { ppr: r.sleeperProj, standard: b.sleeperProj,
          half: half(r.sleeperProj, b.sleeperProj) },
        fftoday: { ppr: r.ffProj, standard: b.ffProj,
          half: half(r.ffProj, b.ffProj) },
      },
      actual: { ppr: r.pts, standard: b.ptsStd, half: (r.pts + b.ptsStd) / 2 },
    };
    (pools[r.season] = pools[r.season] || []).push(row);
  }
  const allYears = Object.keys(pools).map(Number).sort((a, b) => a - b);
  requireSeasons(allYears, "timabil i lauginni");
  console.log(`${allYears.length} timabil · ` +
    `${r1(mean(allYears.map((y) => pools[y].length)))} leikmenn ad medaltali`);

  /* Snid og lagnir. Frumurnar eru valdar til ad naa BADUM deildum
     notandans (10-lida PPR og 12-lida half-PPR) OG kanoniska 12-lida
     PPR-snidinu sem allar adrar maelingar i verkefninu nota. */
  const SHAPES = {
    "10-2flex": { label: "10 lid, 2 FLEX",
      league: { teams: 10, rounds: 15,
        starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
        maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
        flexPos: ["RB", "WR", "TE"], excludePos: ["K", "DST"] } },
    "12-2flex": { label: "12 lid, 2 FLEX",
      league: { teams: 12, rounds: 14,
        starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
        maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
        flexPos: ["RB", "WR", "TE"], excludePos: ["K", "DST"] } },
  };
  /* `adpSrc` fyrir half er TVIRAETT og thad er sagt: sogulegt half-ADP
     er ekki til, svo badir endar eru maeldir sem vikmork. */
  const CELLS = [
    { fmt: "ppr", shape: "10-2flex", adpSrc: "ppr", label: "PPR · 10 lid, 2 FLEX" },
    { fmt: "ppr", shape: "12-2flex", adpSrc: "ppr", label: "PPR · 12 lid" },
    { fmt: "half", shape: "12-2flex", adpSrc: "ppr", label: "HALF · 12 lid (ADP=ppr)" },
    { fmt: "half", shape: "12-2flex", adpSrc: "standard", label: "HALF · 12 lid (ADP=std)" },
    { fmt: "standard", shape: "12-2flex", adpSrc: "standard", label: "STANDARD · 12 lid" },
  ];
  const PROJS = [
    { key: "sleeper", label: "Sleeper (5 hrein timabil)" },
    { key: "fftoday", label: "FFToday (11 timabil)" },
  ];
  /* Radirnar per (spa, snid) — reiknadar EINU SINNI. */
  const ROWS = {};
  for (const P of PROJS) {
    ROWS[P.key] = {};
    for (const fmt of ["ppr", "half", "standard"]) {
      ROWS[P.key][fmt] = residRows(pools, allYears, P.key, fmt);
    }
  }

  const out = {
    generated: new Date().toISOString(),
    provenance: stamp({
      argv: process.argv.slice(2),
      defaults: { runs: 3, boot: 600, from: 2015 },
      inputs: ["features.json"], dataDir: OUT,
    }),
    resolved: {
      runs: RUNS, boot: BOOT, from: FROM,
      halfIsExact: "half = (ppr + standard) / 2, exact algebra, not interpolation",
      adpIsBounded: "no historical half-PPR ADP exists; ppr and standard ADP are " +
        "measured as bounds",
      centering: { age: AGE_C, exp: EXP_C },
      minFit: MIN_FIT, minSide: MIN_SIDE,
      clusterUnits: { statistical: "player", decision: "season" },
      target: "residual of the projection: actual season points - projected points",
      control: "log(ADP) is a regressor in every fit, so the age terms are partial " +
        "coefficients net of what the market already prices",
    },
    pairing: { paired, unpaired },
    seasons: allYears,
  };

  /* ============================================================
     A. AKKERID — ER FYRRI TALAN ENDURREIKNANLEG?
     ============================================================
     Adur en nokkud nytt er fullyrt verdur thetta ror ad gefa SOMU
     TOLU og `feature_probe.json`: r(age, leif) ~ -0,017 a Sleeper/PPR.
     Gefi thad annad er villan i MINU rori og engin tala her er treyst-
     andi. Sama regla og `calibration.mjs` i FPL-verkefninu: velin er
     sannreynd a thekktu svari fyrst. */
  console.log(`\n${"=".repeat(78)}\n  A. AKKERI — endurreikna r = -0,017 ur feature_probe\n${"=".repeat(78)}`);
  const anchorRows = ROWS.sleeper.ppr;
  const anchor = {
    n: anchorRows.length,
    rAll: r3(corr(anchorRows.map((r) => r.age), anchorRows.map((r) => r.resid))),
    byPos: Object.fromEntries(["RB", "WR", "TE", "QB"].map((pos) => {
      const s = anchorRows.filter((r) => r.pos === pos);
      return [pos, s.length >= 60
        ? r3(corr(s.map((r) => r.age), s.map((r) => r.resid))) : null];
    })),
    reference: { source: "data/feature_probe.json", r: -0.017, n: 873,
      byPos: { RB: -0.042, WR: -0.073, TE: -0.063, QB: 0.158 } },
  };
  anchor.reproduced = anchor.rAll != null && Math.abs(anchor.rAll + 0.017) < 0.03;
  console.log(`  n = ${anchor.n} (feature_probe: 873)`);
  console.log(`  r(age, resid) = ${anchor.rAll}  (feature_probe: -0.017)`);
  console.log(`  per stodu:     ${JSON.stringify(anchor.byPos)}`);
  console.log(`  feature_probe: ${JSON.stringify(anchor.reference.byPos)}`);
  console.log(`  -> ${anchor.reproduced ? "ENDURREIKNAD" : "REKUR — les EKKI meira ur thessari skra"}`);
  out.anchor = anchor;

  /* ============================================================
     B. FORMID SJALFT — HVAD FYLGNIN GAT EKKI SED
     ============================================================
     Bein tafla: medalleif per aldursbili. Ef fylgnin er ~0 en bilin
     mynda klif er BROTALINAN raunveruleg og fylgnin var rett tala um
     rangt fall. Ef bilin eru flot er ekkert klif og fyrri maelingin
     var einfaldlega RETT. Thetta er LYSING (i urtaki) — engin
     akvordun hangir a henni. */
  console.log(`\n${"=".repeat(78)}\n  B. FORMID — medalleif per aldursbili (LYSING, i urtaki)\n${"=".repeat(78)}`);
  const BINS = [[0, 23], [23, 25], [25, 27], [27, 29], [29, 31], [31, 99]];
  const binLabel = ([a, b]) => (a === 0 ? "<23" : b === 99 ? "31+" : `${a}-${b}`);
  out.shape = {};
  for (const P of PROJS) {
    out.shape[P.key] = {};
    for (const fmt of ["ppr", "half", "standard"]) {
      const rows = ROWS[P.key][fmt];
      if (rows.length < 200) { out.shape[P.key][fmt] = null; continue; }
      out.shape[P.key][fmt] = {};
      for (const pos of ["RB", "WR", "TE", "QB"]) {
        const s = rows.filter((r) => r.pos === pos);
        if (s.length < 80) { out.shape[P.key][fmt][pos] = null; continue; }
        /* NET AF ADP: leifin eftir ad log(ADP) hefur verid dregin ut,
           thvi hra leifin ber lika "hann var odyr" sem er ekki aldur. */
        const m = ols(s, [() => 1, (r) => r.logAdp], 2);
        const netOf = (r) => r.resid - (m ? m.beta[0] + m.beta[1] * r.logAdp : 0);
        out.shape[P.key][fmt][pos] = {
          linearR: r3(corr(s.map((r) => r.age), s.map((r) => r.resid))),
          n: s.length,
          bins: BINS.map(([lo, hi]) => {
            const b = s.filter((r) => r.age >= lo && r.age < hi);
            return { bin: binLabel([lo, hi]), n: b.length,
              resid: b.length >= 15 ? r1(mean(b.map((r) => r.resid))) : null,
              residNetAdp: b.length >= 15 ? r1(mean(b.map(netOf))) : null };
          }),
        };
      }
    }
  }
  for (const P of PROJS) {
    const cell = out.shape[P.key].ppr;
    if (!cell) continue;
    console.log(`\n  ${P.label} · PPR — medalleif NET AF ADP per aldursbili (stig)`);
    console.log(`   stada    linR${BINS.map((b) => binLabel(b).padStart(9)).join("")}`);
    for (const pos of ["RB", "WR", "TE", "QB"]) {
      const c = cell[pos];
      if (!c) { console.log(`   ${pos.padEnd(8)}   —`); continue; }
      console.log(`   ${pos.padEnd(8)}${String(c.linearR).padStart(6)}` +
        c.bins.map((b) => (b.residNetAdp == null ? "-" : sgn(b.residNetAdp)).padStart(9)).join(""));
    }
  }

  /* ============================================================
     B2. ER ALDUR THEGAR INNI I SPANNI? — PORAD, SOMU RADIR
     ============================================================
     Kafli B gaf 2-3x sterkara aldursmerki gegn FFToday en gegn
     Sleeper. Tvaer ohadar skyringar liggja fyrir og THAER ERU EKKI
     JAFNGILDAR:
       (a) FFToday naer yfir 11 timabil og Sleeper adeins 5 — annad
           urtak, annad merki. Tilviljun.
       (b) Sleeper VERDLEGGUR aldur en FFToday ekki. Merkid er tha
           raunverulegt en THEGAR INNI i theirri spa sem appid notar.

     Thetta er PORANLEGT og thess vegna svaranlegt: maelt a NAKVAEMLEGA
     SOMU RADIR (Sleeper-arin, radir sem bera BADAR spar), svo (a)
     fellur ut og adeins (b) er eftir. Se merkid sterkara gegn FFToday
     a somu radum hefur Sleeper melt aldurinn — og tha er svarid vid
     upprunalegu spurningunni ekki "ekkert aldursklif er til" heldur
     "spain er buin ad taka thad". Su greinarmun skiptir mali thvi hun
     spair thvi hvad myndi gerast ef spa-heimildin breyttist. */
  console.log(`\n${"=".repeat(78)}\n  B2. ER ALDUR THEGAR INNI I SPANNI? (poradar radir)\n${"=".repeat(78)}`);
  out.absorbed = {};
  for (const fmt of ["ppr", "half"]) {
    /* Adeins radir sem bera BADAR spar — annars vaeri thetta tvo urtok. */
    const both = ROWS.sleeper[fmt].filter((r) => r.proj.fftoday[fmt] != null)
      .map((r) => ({ ...r, residSlp: r.actual[fmt] - r.proj.sleeper[fmt],
        residFf: r.actual[fmt] - r.proj.fftoday[fmt] }));
    if (both.length < 200) { out.absorbed[fmt] = null; continue; }
    const ys = [...new Set(both.map((r) => r.season))].sort((a, b) => a - b);
    out.absorbed[fmt] = { n: both.length, seasons: ys, byPos: {} };
    for (const pos of ["RB", "WR", "TE", "QB", "ALL"]) {
      const s = pos === "ALL" ? both : both.filter((r) => r.pos === pos);
      if (s.length < 60) { out.absorbed[fmt].byPos[pos] = null; continue; }
      const a = s.map((r) => r.age);
      out.absorbed[fmt].byPos[pos] = {
        n: s.length,
        rSleeper: r3(corr(a, s.map((r) => r.residSlp))),
        rFftoday: r3(corr(a, s.map((r) => r.residFf))),
      };
    }
    const q = out.absorbed[fmt];
    console.log(`\n  ${fmt.toUpperCase()} · ${q.n} radir sem bera BADAR spar, ${ys.join(", ")}`);
    console.log(`    ${"stada".padEnd(7)}${"r(age, leif Sleeper)".padStart(22)}${"r(age, leif FFToday)".padStart(22)}`);
    for (const pos of ["RB", "WR", "TE", "QB", "ALL"]) {
      const v = q.byPos[pos];
      if (!v) { console.log(`    ${pos.padEnd(7)}  of fatt`); continue; }
      console.log(`    ${pos.padEnd(7)}${String(v.rSleeper).padStart(22)}${String(v.rFftoday).padStart(22)}` +
        `   n=${v.n}`);
    }
  }

  /* ============================================================
     C. TOLFRAEDI-PROFID — BAETIR FORMID EINHVERJU UT FYRIR URTAK?
     ============================================================
     Walk-forward: fitt a arum < y, maelt a y. Vidmidid er SAMA spa an
     aldurslidsins, svo deltaR2 er ALDURSLIDURINN EINN. Bootstrap
     KLASADUR PER LEIKMANN og CI verdur ad utiloka null. */
  console.log(`\n${"=".repeat(78)}\n  C. UT FYRIR URTAK — delta R2 a leifinni (klasar = leikmenn)\n${"=".repeat(78)}`);
  out.statistical = {};
  for (const P of PROJS) {
    out.statistical[P.key] = {};
    for (const fmt of ["ppr", "half", "standard"]) {
      const rows = ROWS[P.key][fmt];
      const ys = [...new Set(rows.map((r) => r.season))].sort((a, b) => a - b);
      if (ys.length < 3) { out.statistical[P.key][fmt] = null; continue; }
      out.statistical[P.key][fmt] = {};
      for (const netOfAdp of [true, false]) {
        const tag = netOfAdp ? "netOfAdp" : "raw";
        out.statistical[P.key][fmt][tag] = {};
        for (const fam of FAMILIES) {
          const test = [];
          const knots = {}, coefs = {};
          for (let i = 1; i < ys.length; i++) {
            const y = ys[i];
            const C = corrector(rows, P.key, fmt, fam, netOfAdp, y);
            if (!C) continue;
            knots[y] = C.knots; coefs[y] = C.coefs;
            for (const r of rows) {
              if (r.season === y) test.push({ ...r, pred: C.correctionOf(r) });
            }
          }
          if (test.length < 200) { out.statistical[P.key][fmt][tag][fam.key] = null; continue; }
          /* Vidmidid er "engin aldurs-leidretting". Leidrettingin er
             MIDJUD innan urtaksins adur en R2 er tekid, thvi fasti
             skiptir engu i VBD (hann styttist ut) en HANN SKIPTIR MALI
             i R2 — omidjud leidretting maelist annars sem "abati" thott
             hun se hrein hlidrun. */
          const stat = (sample) => {
            const mR = mean(sample.map((r) => r.resid));
            const mP = mean(sample.map((r) => r.pred));
            let sse = 0, sst = 0;
            for (const r of sample) {
              sse += (r.resid - (r.pred - mP)) ** 2;
              sst += (r.resid - mR) ** 2;
            }
            return sst ? 1 - sse / sst : null;
          };
          const point = stat(test);
          const ci = bootPlayers(test, stat);
          out.statistical[P.key][fmt][tag][fam.key] = {
            label: fam.label,
            deltaR2: r4(point),
            corrPredResid: r3(corr(test.map((r) => r.pred), test.map((r) => r.resid))),
            n: test.length, testYears: Object.keys(knots).length,
            ci: ci ? [ci.lo, ci.hi] : null,
            excludesZero: ci ? ci.excludesZero : null,
            clusters: ci ? ci.clusters : null,
            clusterUnit: "player",
            knots, coefs,
          };
        }
      }
    }
  }
  for (const P of PROJS) {
    for (const fmt of ["ppr", "half"]) {
      const cell = out.statistical[P.key][fmt];
      if (!cell) continue;
      console.log(`\n  ${P.label} · ${fmt.toUpperCase()}`);
      console.log(`    ${"form".padEnd(15)}${"dR2 netADP".padStart(12)}` +
        `${"95% CI (player clusters)".padStart(26)}${"dR2 raw".padStart(10)}`);
      for (const fam of FAMILIES) {
        const a = cell.netOfAdp[fam.key], b = cell.raw[fam.key];
        if (!a) { console.log(`    ${fam.key.padEnd(15)}  of fatt`); continue; }
        const ciTxt = a.ci ? `[${a.ci[0].toFixed(4)}, ${a.ci[1].toFixed(4)}]` : "-";
        console.log(`    ${fam.key.padEnd(15)}${String(a.deltaR2).padStart(12)}` +
          `${ciTxt.padStart(26)}${String(b ? b.deltaR2 : "-").padStart(10)}` +
          (a.excludesZero ? "  UTILOKAR NULL" : ""));
      }
    }
  }

  /* ============================================================
     D. AKVORDUNIN — DRAFT-EINVIGI I SOMU DEILD
     ============================================================
     Aldurs-leidretta bordid gegn HREINU A-Ranking, baedi i somu deild,
     a moti sama velli, ur somu laug. Ars-ahrifin dragast thar med ut
     (sja `arank-lab.mjs` um hvers vegna thad er retta honnunin).
     Leidrettingin er ALLTAF walk-forward fittud (ar < y). */
  console.log(`\n${"=".repeat(78)}\n  D. AKVORDUNIN — einvigi gegn hreinu A-Ranking\n${"=".repeat(78)}`);
  const WEIGHTS = [0, 0.25, 0.5, 1];
  const DEC_FAMS = ["linear", "quad", "hinge", "hingeFlat", "expHinge", "expHingeFlat"];
  out.decision = {};
  let neutralWorst = 0;

  for (const P of PROJS) {
    for (const cell of CELLS) {
      const key = `${P.key}|${cell.fmt}|${cell.shape}|adp=${cell.adpSrc}`;
      const rows = ROWS[P.key][cell.fmt];
      const ys = [...new Set(rows.map((r) => r.season))].sort((a, b) => a - b);
      if (ys.length < 3) { out.decision[key] = null; continue; }
      const league = SHAPES[cell.shape].league;
      const repl = replacementRanks(league);
      const projOf = (p) => p.proj[P.key][cell.fmt];
      const adpOf = (p) => p.adp[cell.adpSrc];

      /* Laugin per ari — SOMU radir sem leifin var maeld a. */
      const world = {};
      for (const y of ys) {
        const pool = rows.filter((r) => r.season === y);
        if (pool.length < 120) continue;
        world[y] = {
          pool,
          actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual[cell.fmt] }])),
          plain: vbdBoard(pool, repl, projOf),
          fields: [new Map(pool.slice().sort((a, b) => adpOf(a) - adpOf(b))
            .map((p, i) => [p.id, i + 1]))],
        };
        for (let r = 1; r < RUNS; r++) {
          world[y].fields.push(noisyField(pool, adpOf, y * 1000 + r * 7919));
        }
      }
      const wy = Object.keys(world).map(Number).sort((a, b) => a - b);
      if (wy.length < 3) { out.decision[key] = null; continue; }

      /* Einvigid per (form, vog, ar). */
      const grid = {};
      for (const famKey of DEC_FAMS) {
        const fam = FAMILIES.find((f) => f.key === famKey);
        for (const w of WEIGHTS) {
          const per = {};
          for (let i = 1; i < wy.length; i++) {
            const y = wy[i];
            const C = corrector(rows, P.key, cell.fmt, fam, true, y);
            if (!C) continue;
            const W = world[y];
            const adj = (p) => {
              const base = projOf(p);
              return base == null ? null : base + w * C.correctionOf(p);
            };
            const board = vbdBoard(W.pool, repl, adj);
            const d = [];
            for (const field of W.fields) {
              for (let s = 1; s <= league.teams; s++) {
                const j = (s % league.teams) + 1;
                for (const swap of [false, true]) {
                  const o = simulateDraft({
                    board, fieldBoard: field, actual: W.actual,
                    slot: swap ? j : s, league,
                    rival: { slot: swap ? s : j, board: W.plain },
                  });
                  d.push(o.points - o.rivalPoints);
                }
              }
            }
            per[y] = r1(mean(d));
          }
          const vals = Object.values(per).filter((x) => x != null);
          if (!vals.length) continue;
          grid[`${famKey}|w=${w}`] = {
            family: famKey, w, per, mean: r1(mean(vals)), t: tOf(vals),
            wins: vals.filter((x) => x > 0).length, years: vals.length,
            boot: bootOfSeasons(per),
          };
          if (w === 0) {
            neutralWorst = Math.max(neutralWorst, ...vals.map((v) => Math.abs(v)));
          }
        }
      }

      /* ============================================================
         EFRA AKKERID — GETUR HERMUNIN YFIRLEITT SED MERKI?
         ============================================================
         `w = 0` sannar ad hermunin se HLUTLAUS. Hun sannar EKKI ad hun
         geti FUNDID nokkud — bilud pipa sem gefur alltaf 0 stedst
         nulltilgatuna med glans og laesist svo sem "REJECTED". Thad er
         nakvaemlega thogla toma fullyrdingin sem CLAUDE.md 5b lysir:
         "NEIKVAED FULLYRDING VERDUR AD NEFNA STRENG SEM VAR SANNANLEGA
         THARNA."

         Efra akkerid er thvi ORAKEL: leidrettingin er RAUNVERULEGA
         leifin (leki, viljandi), svo bordid verdur spa med fullkominni
         vitneskju. Thad VERDUR ad vinna storsigur. Gerdi thad thad
         ekki vaeri hofnunin her onyt — hun vaeri maeling a biladri pipu.
         Talan sjalf er engin nidurstada; hun er profsteinn a maelinn. */
      const oraclePer = {};
      for (let i = 1; i < wy.length; i++) {
        const y = wy[i], W = world[y];
        const board = vbdBoard(W.pool, repl, (p) => p.actual[cell.fmt]);
        const d = [];
        for (const field of W.fields) {
          for (let s = 1; s <= league.teams; s++) {
            const j = (s % league.teams) + 1;
            for (const swap of [false, true]) {
              const o = simulateDraft({
                board, fieldBoard: field, actual: W.actual,
                slot: swap ? j : s, league,
                rival: { slot: swap ? s : j, board: W.plain },
              });
              d.push(o.points - o.rivalPoints);
            }
          }
        }
        oraclePer[y] = r1(mean(d));
      }
      const oracleVals = Object.values(oraclePer);

      /* WALK-FORWARD VAL A (form, vog): valid a arum a undan.
         Fyrsta einvigis-arid hefur ekkert a undan ser, svo valid
         byrjar a thvi naesta. */
      const decYears = wy.slice(1);
      const wfPer = {}, wfChosen = {};
      for (let i = 1; i < decYears.length; i++) {
        const y = decYears[i], prior = decYears.slice(0, i);
        let best = null;
        for (const [k, g] of Object.entries(grid)) {
          if (g.w === 0) continue;              // nulltilgatan er ekki afbrigdi
          const pv = prior.map((p) => g.per[p]).filter((x) => x != null);
          if (!pv.length || g.per[y] == null) continue;
          const m = mean(pv);
          if (!best || m > best.m) best = { m, k, v: g.per[y] };
        }
        if (best) { wfPer[y] = best.v; wfChosen[y] = best.k; }
      }
      const wfVals = Object.values(wfPer);

      /* LOSO: valid a OLLUM ODRUM arum, beitt a arid sjalft.
         Leidrettingin sjalf er AFRAM walk-forward (ar < y) — LOSO
         gildir adeins um afbrigda-valid, og thad er sagt her svo
         enginn lesi meira ur thessari tolu en er. */
      const losoPer = {}, losoChosen = {};
      for (const y of decYears) {
        const others = decYears.filter((z) => z !== y);
        let best = null;
        for (const [k, g] of Object.entries(grid)) {
          if (g.w === 0) continue;
          const pv = others.map((p) => g.per[p]).filter((x) => x != null);
          if (!pv.length || g.per[y] == null) continue;
          const m = mean(pv);
          if (!best || m > best.m) best = { m, k, v: g.per[y] };
        }
        if (best) { losoPer[y] = best.v; losoChosen[y] = best.k; }
      }
      const losoVals = Object.values(losoPer);

      out.decision[key] = {
        label: `${P.label} · ${cell.label}`,
        proj: P.key, fmt: cell.fmt, shape: cell.shape, adpSrc: cell.adpSrc,
        seasons: wy, decisionYears: decYears,
        clusterUnit: "season",
        /* Profsteinn a maelinn, EKKI nidurstada — sja notu ofan. */
        oracle: { per: oraclePer, mean: r1(mean(oracleVals)),
          wins: oracleVals.filter((x) => x > 0).length, years: oracleVals.length,
          note: "board = actual points (deliberate leak). Upper anchor: if this is " +
            "not hugely positive the duel cannot see a signal and the rejection " +
            "below would be measuring a broken harness, not the idea" },
        grid,
        walkForward: { per: wfPer, chosen: wfChosen, mean: r1(mean(wfVals)),
          t: tOf(wfVals), wins: wfVals.filter((x) => x > 0).length,
          years: wfVals.length, boot: bootOfSeasons(wfPer) },
        loso: { per: losoPer, chosen: losoChosen, mean: r1(mean(losoVals)),
          t: tOf(losoVals), wins: losoVals.filter((x) => x > 0).length,
          years: losoVals.length, boot: bootOfSeasons(losoPer) },
      };

      const bestGrid = Object.entries(grid).filter(([, g]) => g.w !== 0)
        .sort((a, b) => b[1].mean - a[1].mean)[0];
      const D = out.decision[key];
      console.log(`\n  ${D.label}  (${wy.length} timabil, ${decYears.length} maeld)`);
      console.log(`    hra leit, best : ${bestGrid[0].padEnd(20)} ${sgn(bestGrid[1].mean)} ` +
        `(${bestGrid[1].wins}/${bestGrid[1].years}, t=${bestGrid[1].t})`);
      console.log(`    WALK-FORWARD   : ${sgn(D.walkForward.mean)} ` +
        `(${D.walkForward.wins}/${D.walkForward.years}, t=${D.walkForward.t})` +
        (D.walkForward.boot
          ? `  CI [${sgn(D.walkForward.boot.lo)}, ${sgn(D.walkForward.boot.hi)}]` +
            (D.walkForward.boot.excludesZero ? " UTILOKAR NULL" : "") : ""));
      console.log(`    LOSO           : ${sgn(D.loso.mean)} ` +
        `(${D.loso.wins}/${D.loso.years}, t=${D.loso.t})`);
      console.log(`    per vog (hinge): ` + WEIGHTS.map((w) => {
        const g = grid[`hinge|w=${w}`];
        return `w=${w} ${g ? sgn(g.mean) : "-"}`;
      }).join("  "));
      console.log(`    akkeri         : w=0 ${sgn(grid["hinge|w=0"].mean)} (hlutlaus) · ` +
        `orakel ${sgn(D.oracle.mean)} (${D.oracle.wins}/${D.oracle.years})`);
    }
  }

  /* NULLTILGATAN. `w = 0` er sama bord og andstaedingurinn og verdur ad
     gefa NAKVAEMLEGA 0. Skriftan DEYR ella — osamhverf hermun gerir
     hverja tolu her merkingarlausa (README 5h, regla 1). */
  out.neutral = { maxAbsAtW0: r3(neutralWorst), passed: neutralWorst < 1e-9,
    note: "w=0 is the same board as the rival; the duel must be exactly zero" };
  console.log(`\n  NULLTILGATA (w=0 gegn sjalfu ser): staersta |munur| = ` +
    `${out.neutral.maxAbsAtW0} -> ${out.neutral.passed ? "HLUTLAUS" : "OSAMHVERF — ALLT ONYTT"}`);
  if (!out.neutral.passed) {
    console.error("\n  w=0 gaf EKKI null. Hermunin er osamhverf; skrifa EKKERT.\n");
    process.exit(3);
  }

  /* EFRA AKKERID a OLLUM frumum. Hofnun er adeins nidurstada ef profid
     GAT stadist — orakel-bordid verdur ad vinna i hverri einustu frumu.
     Ella er thetta maeling a biladri pipu og skriftan DEYR. */
  const oracles = Object.values(out.decision).filter(Boolean).map((d) => d.oracle);
  out.oracle = {
    cells: oracles.length,
    positive: oracles.filter((o) => o.mean > 0).length,
    minMean: r1(Math.min(...oracles.map((o) => o.mean))),
    meanMean: r1(mean(oracles.map((o) => o.mean))),
    passed: oracles.every((o) => o.mean > 50),
    note: "upper anchor: a board built from actual points must beat A-Ranking in " +
      "every cell, otherwise the duel cannot see a signal and any rejection below " +
      "would be measuring a broken harness",
  };
  console.log(`  EFRA AKKERI (orakel-bord): vinnur i ${out.oracle.positive}/${out.oracle.cells} ` +
    `frumum, minnst ${sgn(out.oracle.minMean)}, medaltal ${sgn(out.oracle.meanMean)} ` +
    `-> ${out.oracle.passed ? "MAELIRINN SER MERKI" : "MAELIRINN SER EKKERT — ALLT ONYTT"}`);
  if (!out.oracle.passed) {
    console.error("\n  Orakel-bordid vann ekki. Hermunin getur ekki sed merki; skrifa EKKERT.\n");
    process.exit(4);
  }

  /* ============================================================
     E. ALDUR A MOTI ARUM I DEILDINNI — HVORT BER MERKID?
     ============================================================
     Thau eru fylgin en ekki eins: nylidi sem er 24 er ANNAD en nylidi
     sem er 21. Baedi eru fittud hvort i sinu lagi i kafla C; her eru
     THAU BAEDI I SAMA FITTI — sa lidur sem lifir thad er sa sem ber
     merkid, thvi hinn faer thann hluta sem hann atti ekki.

     Hnykk-netid er GROFARA her (annar hver punktur i aldri, annar hver
     i exp) af hreinni reiknihagkvaemni: tvo net saman eru product, og
     fina netid gaf 104 fitt per stodu per ar. */
  console.log(`\n${"=".repeat(78)}\n  E. age gegn exp — badir lidir i SAMA fitti\n${"=".repeat(78)}`);
  const coarse = (a) => a.filter((_, i) => i % 2 === 0);
  out.ageVsExp = {};
  for (const P of PROJS) {
    out.ageVsExp[P.key] = {};
    for (const fmt of ["ppr", "half"]) {
      const rows = ROWS[P.key][fmt];
      const ys = [...new Set(rows.map((r) => r.season))].sort((a, b) => a - b);
      if (ys.length < 3) { out.ageVsExp[P.key][fmt] = null; continue; }
      const test = [];
      const chosen = {};
      for (let i = 1; i < ys.length; i++) {
        const y = ys[i];
        const tr = rows.filter((r) => r.season < y);
        const te = rows.filter((r) => r.season === y);
        if (tr.length < MIN_FIT || !te.length) continue;
        const byPos = {};
        for (const pos of POSITIONS) {
          const sub = tr.filter((r) => r.pos === pos);
          if (sub.length < MIN_FIT) { byPos[pos] = null; continue; }
          let best = null;
          for (const ka of coarse(KNOTS.age[pos])) {
            for (const ke of coarse(KNOTS.exp[pos])) {
              const fns = [() => 1, (r) => r.logAdp,
                (r) => r.age - AGE_C, (r) => Math.max(0, r.age - ka),
                (r) => r.exp - EXP_C, (r) => Math.max(0, r.exp - ke)];
              const m = ols(sub, fns, 2);
              if (!m) continue;
              const sse = sseOf(sub, fns, m.beta);
              if (!best || sse < best.sse) best = { sse, ka, ke, beta: m.beta };
            }
          }
          byPos[pos] = best;
        }
        chosen[y] = Object.fromEntries(POSITIONS.map((p) => [p,
          byPos[p] ? { ageKnot: byPos[p].ka, expKnot: byPos[p].ke } : null]));
        for (const r of te) {
          const f = byPos[r.pos];
          if (!f) { test.push({ ...r, predAge: 0, predExp: 0 }); continue; }
          const b = f.beta;
          test.push({ ...r,
            predAge: b[2] * (r.age - AGE_C) + b[3] * Math.max(0, r.age - f.ka),
            predExp: b[4] * (r.exp - EXP_C) + b[5] * Math.max(0, r.exp - f.ke) });
        }
      }
      const sdOf = (xs) => {
        const m = mean(xs);
        return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
      };
      const cell = out.statistical[P.key][fmt];
      out.ageVsExp[P.key][fmt] = {
        n: test.length,
        note: "joint fit: age broken line AND exp broken line, both net of log(ADP), " +
          "walk-forward; the term that keeps its correlation is the one carrying the signal",
        corrAgeTerm: r3(corr(test.map((r) => r.predAge), test.map((r) => r.resid))),
        corrExpTerm: r3(corr(test.map((r) => r.predExp), test.map((r) => r.resid))),
        sdAgeTerm: r2(sdOf(test.map((r) => r.predAge))),
        sdExpTerm: r2(sdOf(test.map((r) => r.predExp))),
        soloAgeBest: bestFamily(cell, ["linear", "quad", "hinge", "hingeFlat"]),
        soloExpBest: bestFamily(cell, ["expLinear", "expQuad", "expHinge", "expHingeFlat"]),
        knots: chosen,
      };
      const q = out.ageVsExp[P.key][fmt];
      console.log(`\n  ${P.label} · ${fmt.toUpperCase()}  n=${q.n}`);
      console.log(`    i sameiginlegu fitti: r(age-lidur, leif) = ${q.corrAgeTerm} ` +
        `(sd ${q.sdAgeTerm}) · r(exp-lidur, leif) = ${q.corrExpTerm} (sd ${q.sdExpTerm})`);
      console.log(`    einir og ser, besta dR2: age ${JSON.stringify(q.soloAgeBest)}`);
      console.log(`                             exp ${JSON.stringify(q.soloExpBest)}`);
    }
  }

  /* ============================================================
     F. NYLIDAR — BER NFL-DRAFTSTADA MERKI SEM SPAIN MISSIR?
     ============================================================
     `exp === 0`: engin fyrri timabil, svo spain hefur MINNST ad byggja
     a — thad er einmitt thar sem utanadkomandi merki gaeti bitid.

     URTAKID ER LITID og thad raedur honnuninni: ~200 nylidar yfir 11
     timabil, thar af 10 TE og 15 QB. Per stodu er thad EKKI fittanlegt,
     svo fittid er POOLED med STODU-DUMMY sem styribreytum. Stodu-fasti
     styttist hvort ed er ut i VBD, svo dummy-arnir kosta ekkert; thad
     sem er GEFID EFTIR er ad hallinn a draftstodu se sami i ollum
     stodum. Thad er FORSENDA og hun er skrifud, ekki thogul. */
  console.log(`\n${"=".repeat(78)}\n  F. NYLIDAR — draftRound / draftPick ofan a spana\n${"=".repeat(78)}`);
  out.rookies = {};
  for (const P of PROJS) {
    out.rookies[P.key] = {};
    for (const fmt of ["ppr", "half"]) {
      const rk = ROWS[P.key][fmt].filter((r) => r.exp === 0 && r.draftPick != null);
      const ys = [...new Set(rk.map((r) => r.season))].sort((a, b) => a - b);
      if (rk.length < 60 || ys.length < 4) { out.rookies[P.key][fmt] = null; continue; }
      const dummies = [
        (r) => (r.pos === "RB" ? 1 : 0), (r) => (r.pos === "WR" ? 1 : 0),
        (r) => (r.pos === "TE" ? 1 : 0),
      ];
      const CAND = [
        { key: "logPick", label: "log(draftPick)", terms: [(r) => Math.log(r.draftPick)] },
        { key: "round", label: "draftRound", terms: [(r) => r.draftRound ?? 8] },
        { key: "round1", label: "first-round dummy", terms: [(r) => (r.draftRound === 1 ? 1 : 0)] },
      ];
      out.rookies[P.key][fmt] = { n: rk.length, seasons: ys, cands: {} };
      for (const c of CAND) {
        const test = [];
        const coefs = {};
        for (let i = 1; i < ys.length; i++) {
          const y = ys[i];
          const tr = rk.filter((r) => r.season < y);
          const te = rk.filter((r) => r.season === y);
          if (tr.length < 40 || !te.length) continue;
          const fns = [() => 1, (r) => r.logAdp, ...dummies, ...c.terms];
          const m = ols(tr, fns, 2 + dummies.length);
          if (!m) continue;
          const off = 2 + dummies.length;
          coefs[y] = c.terms.map((_, j) => r3(m.beta[off + j]));
          for (const r of te) {
            test.push({ ...r,
              pred: c.terms.reduce((a, f, j) => a + f(r) * m.beta[off + j], 0) });
          }
        }
        if (test.length < 40) { out.rookies[P.key][fmt].cands[c.key] = null; continue; }
        const stat = (sample) => {
          const mR = mean(sample.map((r) => r.resid));
          const mP = mean(sample.map((r) => r.pred));
          let sse = 0, sst = 0;
          for (const r of sample) {
            sse += (r.resid - (r.pred - mP)) ** 2;
            sst += (r.resid - mR) ** 2;
          }
          return sst ? 1 - sse / sst : null;
        };
        const ci = bootPlayers(test, stat, BOOT, 771113);
        out.rookies[P.key][fmt].cands[c.key] = {
          label: c.label, deltaR2: r4(stat(test)),
          corrPredResid: r3(corr(test.map((r) => r.pred), test.map((r) => r.resid))),
          n: test.length, ci: ci ? [ci.lo, ci.hi] : null,
          excludesZero: ci ? ci.excludesZero : null,
          clusters: ci ? ci.clusters : null, clusterUnit: "player",
          coefs,
        };
      }
      const q = out.rookies[P.key][fmt];
      console.log(`\n  ${P.label} · ${fmt.toUpperCase()} — ${q.n} nylidar, ${ys.length} timabil`);
      for (const c of CAND) {
        const v = q.cands[c.key];
        if (!v) { console.log(`    ${c.label.padEnd(20)} of fatt`); continue; }
        console.log(`    ${c.label.padEnd(20)} dR2 ${String(v.deltaR2).padStart(9)} ` +
          `r ${String(v.corrPredResid).padStart(7)} n=${String(v.n).padStart(3)} ` +
          (v.ci ? `CI [${v.ci[0].toFixed(4)}, ${v.ci[1].toFixed(4)}]` : "") +
          (v.excludesZero ? "  UTILOKAR NULL" : ""));
      }
    }
  }

  /* ============================================================
     VERDICT — BERUM ORDUM
     ============================================================ */
  out.verdict = buildVerdict(out);
  console.log(`\n${"=".repeat(78)}\n  VERDICT\n${"=".repeat(78)}`);
  for (const line of out.verdict.lines) console.log(`  - ${line}`);

  out.runtimeSec = Math.round((Date.now() - t0) / 1000);
  await mkdir(path.join(OUT, "measure"), { recursive: true });
  await writeFile(path.join(OUT, "measure", "agecurve.json"),
    JSON.stringify(out, null, 1));
  console.log(`\n-> data/measure/agecurve.json  (${out.runtimeSec}s)`);
}

/* ---------- hjalparfoll ---------- */

/** Radir med leif fyrir eitt (spa, snid). Leif = raun - spa. */
function residRows(pools, years, projKey, fmt) {
  const out = [];
  for (const y of years) {
    for (const p of pools[y]) {
      const pr = p.proj[projKey][fmt];
      const ac = p.actual[fmt];
      if (pr == null || ac == null) continue;
      out.push({ ...p, resid: ac - pr });
    }
  }
  return out;
}

/** Bootstrap klasadur PER TIMABILI a ara-diffum (endurnotar audit-fallid). */
function bootOfSeasons(per) {
  const ys = Object.keys(per).filter((y) => per[y] != null);
  if (ys.length < 3) return null;
  const A = Object.fromEntries(ys.map((y) => [y, per[y]]));
  const B = Object.fromEntries(ys.map((y) => [y, 0]));
  const b = bootstrapDiff(A, B, 2000, 424242);
  return b ? { lo: r1(b.lo), hi: r1(b.hi), excludesZero: b.excludesZero,
    clusterUnit: "season" } : null;
}

/** Besta form ur `statistical`-frumu (net af ADP), eftir deltaR2. */
function bestFamily(cell, keys) {
  if (!cell || !cell.netOfAdp) return null;
  let best = null;
  for (const k of keys) {
    const v = cell.netOfAdp[k];
    if (!v || v.deltaR2 == null) continue;
    if (!best || v.deltaR2 > best.deltaR2) {
      best = { family: k, deltaR2: v.deltaR2, ci: v.ci, excludesZero: v.excludesZero };
    }
  }
  return best;
}

function corr(a, b) {
  const ma = mean(a), mb = mean(b);
  let s = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    const u = a[i] - ma, v = b[i] - mb;
    s += u * v; da += u * u; db += v * v;
  }
  return da && db ? s / Math.sqrt(da * db) : null;
}

/**
 * VERDICT ER LEITT UT UR TOLUNUM, EKKI SKRIFAD I HONDUNUM.
 * Handskrifadur domur stadnar um leid og talan breytist — sama villa
 * og hardkodud safna-tala i FPL-verkefninu. Her er hann REIKNADUR svo
 * hann geti ekki logid um sina eigin skra.
 */
function buildVerdict(out) {
  const lines = [];
  const decisions = Object.entries(out.decision).filter(([, v]) => v);
  const wf = decisions.map(([k, v]) => ({ k, ...v.walkForward }));
  const wfPos = wf.filter((x) => x.mean > 0).length;
  const wfSig = wf.filter((x) => x.boot && x.boot.excludesZero && x.mean > 0).length;
  const loso = decisions.map(([, v]) => v.loso);
  const losoPos = loso.filter((x) => x.mean > 0).length;
  const raw = decisions.map(([, v]) => Math.max(...Object.values(v.grid)
    .filter((g) => g.w !== 0).map((g) => g.mean)));
  const rawPos = raw.filter((x) => x > 0).length;

  let statSig = 0, statTot = 0;
  for (const P of Object.keys(out.statistical)) {
    for (const fmt of Object.keys(out.statistical[P])) {
      const c = out.statistical[P][fmt];
      if (!c || !c.netOfAdp) continue;
      for (const f of Object.keys(c.netOfAdp)) {
        const v = c.netOfAdp[f];
        if (!v) continue;
        statTot++;
        if (v.excludesZero && v.deltaR2 > 0) statSig++;
      }
    }
  }
  let rookSig = 0, rookTot = 0;
  for (const P of Object.keys(out.rookies)) {
    for (const fmt of Object.keys(out.rookies[P])) {
      const c = out.rookies[P][fmt];
      if (!c) continue;
      for (const k of Object.keys(c.cands)) {
        const v = c.cands[k];
        if (!v) continue;
        rookTot++;
        if (v.excludesZero && v.deltaR2 > 0) rookSig++;
      }
    }
  }

  const held = wfSig > 0 && wfPos > wf.length / 2;
  lines.push(`Null hypothesis is neutral: at w=0 the duel differs from zero by at most ` +
    `${out.neutral.maxAbsAtW0} points (required: exactly 0).`);
  lines.push(`Upper anchor: an oracle board built from actual points beats A-Ranking in ` +
    `${out.oracle.positive} of ${out.oracle.cells} cells (mean ${out.oracle.meanMean}, ` +
    `worst ${out.oracle.minMean}), so the duel demonstrably can see a signal -- ` +
    `a rejection below is a result, not a broken harness.`);
  lines.push(`Anchor: r(age, Sleeper PPR residual) = ${out.anchor.rAll} on n=${out.anchor.n}, ` +
    `reproducing the -0.017 in data/feature_probe.json` +
    `${out.anchor.reproduced ? "" : " -- DOES NOT REPRODUCE, trust nothing below"}.`);
  lines.push(`Out-of-sample residual R2, net of log(ADP): ${statSig} of ${statTot} ` +
    `(projection x scoring x shape) cells have a bootstrap CI clustered per player ` +
    `that excludes zero on the positive side.`);
  lines.push(`Raw search (shape and weight chosen while looking at every season): ` +
    `positive in ${rawPos} of ${decisions.length} league cells.`);
  lines.push(`WALK-FORWARD (shape, knot and weight all chosen on prior seasons only): ` +
    `positive in ${wfPos} of ${wf.length} cells, significant in ${wfSig} of ${wf.length} ` +
    `(bootstrap clustered per season).`);
  lines.push(`LOSO: positive in ${losoPos} of ${loso.length} cells.`);
  lines.push(`Rookies: ${rookSig} of ${rookTot} draft-position candidates have a ` +
    `player-clustered CI excluding zero.`);
  lines.push(held
    ? "VERDICT: HOLDS. A non-linear age term survives out of sample and improves the " +
      "draft decision. Read the per-cell knots and weights before wiring anything."
    : "VERDICT: REJECTED. A non-linear age or experience term does not improve the " +
      "draft decision out of sample. The raw search finds it -- exactly as the linear " +
      "age z-score did in README 5h -- and it does not survive being chosen on prior " +
      "seasons only. Do not wire an age curve into A-Ranking.");
  return {
    held,
    cells: wf.length,
    cellsRawPositive: rawPos,
    cellsWalkForwardPositive: wfPos, cellsWalkForwardSignificant: wfSig,
    cellsLosoPositive: losoPos,
    statisticalCellsSignificant: statSig, statisticalCells: statTot,
    rookieCandidatesSignificant: rookSig, rookieCandidates: rookTot,
    lines,
  };
}

main().catch((e) => { console.error(e); process.exit(1); });
