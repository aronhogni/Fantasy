#!/usr/bin/env node
/* ============================================================
   h2h-lab.mjs — FANTASY VINNST EKKI A STIGUM HELDUR A VIKUM

     node scripts/h2h-lab.mjs [--runs=10] [--sruns=4] [--boot=2000]
                              [--from=2019]

   SJALFGEFNU GILDIN ERU THAU SEM BOKUDU TOLURNAR VORU MAELDAR MED,
   svo kall an vidfanga endurgeri skrana upp a stafi. `provenance`
   segir hvort gildi kom ur vidfangi eda sjalfgefid — sja lib/provenance.mjs
   um skrana sem sagdi `mean: 59,9` og var i raun onnur keyrsla.

   -> data/measure/h2h.json

   ============================================================
   HVERS VEGNA THETTA VANTADI — OG HVERS VEGNA THAD ER STAERSTA
   OMAELDA SPURNINGIN I VERKEFNINU
   ============================================================
   HVER EINASTA nidurstada i thessu repo-i er maeld i STIGUM:
   A-Ranking slaer ADP um +233,6 stig (`model_eval_ppr.json`), "WR
   fyrst" slaer BPA um +23,5 stig (`strategy_ppr.json`), bye-vogin
   gefur +28 stig. Fantasy vinnst ekki a stigum. Hun vinnst a
   VIKULEGUM VIDUREIGNUM og a urslitakeppni i vikum 15-17.

   BORD SEM SKORAR MEIRA GETUR TAPAD FLEIRI VIKUM — 2.000 stig sem
   koma i thremur 200-stiga vikum og ellefu 130-stiga vikum er verri
   deildarutkoma en 1.950 stig sem koma jafnt. Og ekkert i repo-inu
   hefdi tekid eftir thvi, thvi ENGIN maeling her hafdi motherja i
   viku.

   THESSI SKRIFTA TENGIR EKKERT INN I `src/`. Hun er MAELING og hun
   skrifar EINA skra.

   ============================================================
   REGLURNAR ERU LESNAR, EKKI VALDAR
   ============================================================
   Baðar deildir notandans svara Sleeper med `playoff_week_start: 15`
   og `playoff_teams: 6` (raunsvor, ordrett i `tests/standings.mjs`),
   og `fpts` i sama svari er sannanlega vikur 1-14 EINGONGU: rostur 1
   i Patriots 2025 ber 1815,34 en summa vikna 1-17 er 2268,18.

   Thess vegna: REGLULEGT TIMABIL = VIKUR 1-14, URSLITAKEPPNI = 15-17,
   SEX LID KOMAST INN. Engin af thessum thremur tolum er valin her.

   LOGUNIN sjalf (lid, byrjunarlid, umferdir) er NAKVAEMLEGA su sama og
   `half-lab`, `opp-lab`, `vbdbase-lab` og `waiver-lab` bera — og
   varamanns-threpid er BORID VID `data/measure/waiver.json`, sem
   thegar ber thad fyrir somu logunarheiti. Se thad ekki eins deyr
   skriftan: tvaer maelingar sem heita sama nafni og maela sitthvora
   deild eru verri en ein.

   ============================================================
   NULLPROFID ER HLID, EKKI SKRAUT
   ============================================================
   Bord sem spilar gegn SJALFU SER verdur ad gefa NAKVAEMLEGA 50%.
   Faest thad ekki er herminn bilaður og hver einasta tala undir honum
   merkingarlaus — tha er thad tilkynnt og keyrslan STOPPAR.

   OG THAD ER SAGT BERUM ORDUM HVERNIG NULLID ER FENGID: spegluninni
   (medferd i saeti A og vidmid i B, sidan vidmid i A og medferd i B)
   er BEINLINIS aetlad ad gera thad nakvaemt. Nullprofid er thvi
   NAKVAEMT AD BYGGINGU og thad ver ARM-bokhaldid — ekki
   SAETIS-skekkju, thvi armarnir skiptast a saetum. Thess vegna eru
   thrju onnur hlid:

     N2  BOKHALDID: sigrar = tôp i hverri deild, hvert lid spilar
         nakvaemlega 14 leiki, hver vika er fullkomin porun, og
         nakvaemlega EINN meistari.
     N3  SAETIS-DREIFINGIN OSPEGLUD: hve mikid munar a saetum thegar
         allir drafta eftir SAMA bordi. Su tala er astaedan fyrir
         spegluninni og hun er BIRT, ekki felld.
     N4  AKKERI I BADA ENDA: orakel-bord (raunstig timabilsins) verdur
         ad slá A-Ranking i SIGRUM, og andhverft ADP verdur ad tapa
         stort. "Pipan virkar" er sannad ur badum endum eda ekki.

   ============================================================
   BYRJUNARLID VIKUNNAR — BADAR LEIDIR, OG THAD ER EKKI VARFAERNI
   ============================================================
   README 5m: vikuleg talning sem velur byrjunarlid med FULLKOMINNI
   vitneskju um vikuna VERDLAUNAR SVEIFLU (0-0-40 kemst i lidid
   nakvaemlega thá viku sem hann skorar 40). Nidurstada sem stenst
   adeins thar er artefakt.

   Thess vegna er hver headline-fruma skoruð TVISVAR a SAMA DRAFTI:
     · `oracleLineup` — byrjunarlid valid af raunstigum vikunnar
     · `wfLineup`     — byrjunarlid valid af GANGANDI spa (vikur < w),
                        hrist ppg med k=4, skorad a raunstigum
   Baðar nota SAMA `startersRaw` i `src/accuracy.js`, svo thetta er
   ekki tvaer utfaerslur heldur eitt inntak i eina.

   ============================================================
   THAD SEM ER OMAELT HER OG HVERS VEGNA (sja `unmeasured`)
   ============================================================
   · WAIVER OG SKIPTI. Hoparnir eru fastir allt timabilid. `waiver-lab`
     maelir waiver-regluna og ad blanda thvi saman vid thetta vaeri ad
     maela tvennt i einu. Afleidingin er skrád: meiddur madur er 0 stig
     i 10 vikur og enginn getur skipt honum ut.
   · K OG DST. Utan draftsins (`excludePos`) og thvi TOM saeti hja
     OLLUM lidum i 10-lida deildinni — thau fella ut ur hverjum mun.
     `data/weekly/` ber enga DST yfirleitt.
   · SKRA-STYRKUR. Umferdaskrain er hringadferd med slembadri
     umferdarod, ekki deildir og ekki raunveruleg Sleeper-skra.
     Spegluninni er aetlad ad fella thad ut.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { simulateDraft, scoreLeague, roundRobin, startersPoints,
         DEFAULT_LEAGUE } from "../src/accuracy.js";
import { replacementRanks } from "../src/model.js";
import { mean, bootstrapDiff, spearman } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const DATA = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  runs: "number", sruns: "number", boot: "number", from: "number",
});
const DEFAULTS = { runs: 10, sruns: 4, boot: 2000, from: 2019 };
const RUNS  = Number(ARG.runs  ?? DEFAULTS.runs);    // fraekorn per (ar, fruma)
const SRUNS = Number(ARG.sruns ?? DEFAULTS.sruns);   // fraekorn i stefnu-toflunni
const BOOT  = Number(ARG.boot  ?? DEFAULTS.boot);
const FROM  = Number(ARG.from  ?? DEFAULTS.from);

const REG_WEEKS = 14;                  // MAELT: `fpts` = vikur 1-14
const PO_WEEKS = [15, 16, 17];         // MAELT: playoff_week_start = 15
const PO_TEAMS = 6;                    // MAELT: playoff_teams = 6
const KPRIOR = 4;                      // sama hrista og waiver-lab

const POSES = ["QB", "RB", "WR", "TE"];
const r1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const sgn = (x, d = 2) => (x == null ? "-" : `${x > 0 ? "+" : ""}${x.toFixed(d)}`);

/* Fraekorn: LCG, sama utfaersla og i `waiver-lab`/`half-lab`/`bye-lab`
   svo havadinn se sambaerilegur milli maelinga. */
function rngOf(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const gaussOf = (rnd) => () => {
  const u = Math.max(1e-9, rnd()), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/* Pardur t yfir timabil — klasarnir eru ARIN, eins og annars stadar. */
function tOf(a) {
  const v = a.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
}

/* ============================================================
   1. LOGUNIN — RAUNVERULEGU DEILDIRNAR OG SU ALMENNA
   ============================================================
   Fyrstu tvaer eru deildirnar sem notandinn spilar i. Su thridja er
   `DEFAULT_LEAGUE` — logunin sem ALLT annad i verkefninu var maelt i,
   thar med talið +233,6 og stefnutaflan. An hennar vaeri thetta ekki
   endurmaeling a bokudu tolunum heldur maeling a annarri deild.       */
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

/* HALF-PPR BER ENGA SOGULEGA ADP (half-lab). Thess vegna er
   markadsbordid maelt med BADUM sem vikmork thar sem thad er
   headline-talan, og adeins ppr-ADP thar sem taflan er stor. */
const ADP_SRC = { ppr: ["adpPpr"], half: ["adpPpr", "adpStd"], standard: ["adpStd"] };

/* ============================================================
   2. GOGNIN — LAUG UR VIKUSKRANUM, EKKI UR `features` EINGONGU
   ============================================================
   `features.json` ber 145-204 leikmenn a timabili en 12x14 draft tharf
   168 og 10x15 tharf 150. Vaeri laugin `features` eingongu myndu hopar
   verda TOMIR i sidustu umferdunum og tomt byrjunarlids-saeti gefur 0
   stig — havadi sem litur ut eins og utkoma. Sama lausn og
   `waiver-lab` skjalar: laugin er ALLIR sem eiga vikugogn og TAGLID a
   bordinu er radad eftir GANGANDI forgildi.

   FORGILDID SER ALDREI FRAMTIDINA:
     · spa arsins / leikir arsins   (thegar hun er til)
     · annars stig FYRRA timabils / 17 (per LEIK LIDSINS, svo meiddur
       madur se rettilega odyr)
     · nylidi an fyrra timabils: stodu-golf reiknad AF FYRRI ARUM
       EINGONGU. 2019 hefur engin fyrri vikugogn og thad er SAGT.      */
async function loadInputs() {
  const weekly = {}, seasons = [];
  for (let y = 2018; y <= 2025; y++) {
    try {
      weekly[y] = JSON.parse(await readFile(path.join(DATA, "weekly", `${y}.json`), "utf8"));
      if (y >= FROM) seasons.push(y);
    } catch { /* vantar -> sest i `seasons` */ }
  }
  const feats = JSON.parse(await readFile(path.join(DATA, "features.json"), "utf8"));
  let waiverDesign = null;
  try {
    waiverDesign = JSON.parse(await readFile(path.join(DATA, "measure", "waiver.json"), "utf8"));
  } catch { /* ekki til -> vordurinn segir thad */ }
  return { weekly, seasons, feats, waiverDesign };
}

const ptsOf = (row, fmt) => (fmt === "ppr" ? row.ppr : fmt === "half" ? row.half : row.std);
const gamesInSeason = (y) => (y <= 2020 ? 16 : 17);
const MAXW = 18;

function buildWorld(y, weekly, featIdx) {
  const rows = weekly[y], prev = weekly[y - 1] || null;

  /* --- leikmenn --- */
  const idx = new Map(), P = [];
  for (const r of rows) {
    if (!POSES.includes(r.pos)) continue;         // K utan (excludePos), engin DST i gognunum
    if (!idx.has(r.id)) { idx.set(r.id, P.length); P.push({ id: r.id, name: r.name, pos: r.pos }); }
  }
  const N = P.length;

  /* --- raunstig per viku, per snid --- */
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

  /* --- fyrra timabil og nylida-golf, BADI AF FYRRI ARUM EINGONGU --- */
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

  /* --- forgildi, spa og ADP --- */
  const prior = new Float64Array(N);
  const priorFrom = new Array(N).fill("rookieFloor");
  const proj = { ppr: new Array(N).fill(null), half: new Array(N).fill(null),
                 standard: new Array(N).fill(null) };
  const adp = { adpPpr: new Array(N).fill(null), adpStd: new Array(N).fill(null) };
  const adpSd = new Array(N).fill(null);
  let projected = 0, withAdp = 0;
  for (let i = 0; i < N; i++) {
    const a = featIdx.get(`${y}|${P[i].id}|ppr`);
    const b = featIdx.get(`${y}|${P[i].id}|standard`);
    /* Spa: Sleeper thar sem hun er til, annars FFToday — sama rod og
       `half-lab`. HALF er ALGEBRA, ekki interpolun: half = std +
       mottokur/2 = (ppr + std)/2, upp a stig. */
    const pj = a ? (a.sleeperProj != null ? a.sleeperProj : a.ffProj) : null;
    const sj = b ? (b.sleeperProj != null ? b.sleeperProj : b.ffProj) : null;
    proj.ppr[i] = pj ?? null;
    proj.standard[i] = sj ?? null;
    proj.half[i] = pj != null && sj != null ? (pj + sj) / 2 : (pj ?? null);
    if (a && a.adp != null) { adp.adpPpr[i] = a.adp; adpSd[i] = a.adpSd ?? null; }
    if (b && b.adp != null) adp.adpStd[i] = b.adp;
    if (adp.adpPpr[i] != null || adp.adpStd[i] != null) withAdp++;

    if (proj.ppr[i] != null) { prior[i] = proj.ppr[i] / gamesInSeason(y); priorFrom[i] = "projection"; projected++; }
    else if (prevPts.has(P[i].id)) { prior[i] = prevPts.get(P[i].id) / 17; priorFrom[i] = "prevSeason"; }
    else prior[i] = rookieFloor[P[i].pos] || 0;
  }

  /* --- GANGANDI ppg fyrir naemnisprofid a byrjunarlidinu ---
     `wf[fmt]` er kort `${id}|${w}` -> hrist ppg ur vikum < w. Talningin
     er VIKUR SEM LIDNAR ERU, ekki leikir sem hann spiladi: aud vika er
     tha 0 stig, sem er nakvaemlega thad sem gerdist. Einfoldun gagnvart
     `waiver-lab` (sem telur leiki lidsins) og hun gildir EINS um bada
     arma, svo hun getur ekki halað hvorugum.                          */
  const wf = {};
  for (const fmt of FMTS) {
    const m = new Map();
    const cum = new Float64Array(N);
    for (let w = 1; w <= MAXW; w++) {
      for (let i = 0; i < N; i++) {
        m.set(`${P[i].id}|${w}`, (KPRIOR * prior[i] + cum[i]) / (KPRIOR + (w - 1)));
      }
      for (let i = 0; i < N; i++) {
        const r = byWeek[fmt].get(`${P[i].id}|${w}`);
        if (r) cum[i] += r.pts;
      }
    }
    wf[fmt] = m;
  }

  /* --- timabils-kort sem bordin og stodu-thakid lesa --- */
  const actual = {}, actual14 = {};
  for (const fmt of FMTS) {
    actual[fmt] = new Map(P.map((p, i) => [p.id, { pos: p.pos, pts: totAll[fmt][i] }]));
    actual14[fmt] = new Map(P.map((p, i) => [p.id, { pos: p.pos, pts: tot14[fmt][i] }]));
  }

  return { y, N, P, idx, prior, priorFrom, proj, adp, adpSd, byWeek, wf,
           actual, actual14, totAll, tot14,
           coverage: { players: N, projected, withAdp,
                       priorSource: prev ? "prevSeason+projection" : "projection only (engin fyrri vikugogn)" } };
}

/* ============================================================
   3. BORDIN
   ============================================================ */

/** A-RANKING: spa -> virdi yfir varamanni. Taglid radast eftir forgildi. */
function arankBoard(W, fmt, repl) {
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
    /* TAGLID: -1e5 + forgildi. Alltaf undir theim sem hafa spa, en
       radad innbyrdis eftir thvi sem vid VITUM a draft-degi. */
    scored.push([W.P[i].id, v != null ? v - (base[W.P[i].pos] ?? 0) : -1e5 + W.prior[i]]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** HRA SPA-ROD — engin umreikningur i VBD. Bokad forskot: +74,7 stig. */
function projBoard(W, fmt) {
  const scored = [];
  for (let i = 0; i < W.N; i++) {
    const v = W.proj[fmt][i];
    scored.push([W.P[i].id, v != null ? v : -1e5 + W.prior[i]]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** MARKADURINN: ADP. `noise=true` gefur eitt drátt af herberginu. */
function adpBoard(W, src, rnd = null) {
  const gauss = rnd ? gaussOf(rnd) : null;
  let maxAdp = 0;
  for (let i = 0; i < W.N; i++) if (W.adp[src][i] != null) maxAdp = Math.max(maxAdp, W.adp[src][i]);
  const scored = [];
  for (let i = 0; i < W.N; i++) {
    const a = W.adp[src][i];
    if (a != null) {
      /* Dreifingin er MAELD per leikmann (`adpSd` ur FFC). Vanti hana
         er 1,08*sqrt(adp) notad — sama varaleid og `bye-lab`. */
      const sd = W.adpSd[i] > 0 ? W.adpSd[i] : 1.08 * Math.sqrt(Math.max(1, a));
      scored.push([W.P[i].id, gauss ? a + gauss() * sd : a]);
    } else {
      /* Sa sem ADP-listinn ber ekki er DRAFTADUR SIDAST, i forgildisrod. */
      scored.push([W.P[i].id, maxAdp + 1 + Math.max(0, 60 - W.prior[i]) * 5]);
    }
  }
  scored.sort((a, b) => a[1] - b[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** ORAKEL: raunstig timabilsins. EFRA AKKERID — verdur ad vinna stort. */
function oracleBoard(W, fmt) {
  const scored = W.P.map((p, i) => [p.id, W.totAll[fmt][i]]);
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** ANDHVERFT ADP. NEDRA AKKERID — verdur ad tapa stort. */
function reverseBoard(W, src) {
  const keys = [...adpBoard(W, src).keys()].reverse();
  return new Map(keys.map((k, i) => [k, i + 1]));
}

/** SLEMBIN ROD. Vidmid sem er hvorugt akkerid. */
function randomBoard(W, seed) {
  const rnd = rngOf(seed);
  const keys = W.P.map((p) => p.id);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return new Map(keys.map((k, i) => [k, i + 1]));
}

/* ============================================================
   4. VELIN — EIN FRUMA = TVEIR ARMAR I SOMU DEILD, SPEGLADIR
   ============================================================
   MEDFERDIN sitúr i saeti i, VIDMIDID i saeti j, OLL ONNUR saeti drafta
   eftir markadinum. Bædi lidin lifa thvi SAMA arið, sama herbergid og
   naer sama skra — arsahávadinn (sd ~150 stig milli timabila) dregst UT
   og eftir stendur adeins munurinn a bordunum. Sama rok og `rival` i
   `accuracy.js` skjalar, adeins fart upp a deildarstig.

   SPEGLUN: hver fruma er keyrd i BADUM attum. Thad fjarlaegir
   saetis-skekkju OG gerir sjalfsprofid NAKVAEMT.
   ============================================================ */

function runCell({ shape, W, treat, ctrl, runs, seedBase, adpSrc,
                   poTeams = PO_TEAMS, poWeeks = PO_WEEKS, wf = false }) {
  const league = shape.league;
  const T = league.teams;
  const fmt = shape.fmt;
  const acc = {
    n: 0,
    winT: 0, winC: 0, tieGames: 0,
    wT: [], wC: [], pfT: [], pfC: [], ssT: [], ssC: [],
    champT: 0, champC: 0, poT: 0, poC: 0, topT: 0, topC: 0,
    wfWT: [], wfWC: [], wfPfT: [], wfPfC: [],
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
          league, schedule, regWeeks: REG_WEEKS, playoffWeeks: poWeeks,
          playoffTeams: poTeams });

        const A = S.rec[ti], B = S.rec[ci];
        acc.n++;
        acc.wT.push(A.w + A.t / 2); acc.wC.push(B.w + B.t / 2);
        acc.pfT.push(A.pf); acc.pfC.push(B.pf);
        acc.ssT.push(startersPoints(draft.rosters[ti], W.actual[fmt], league));
        acc.ssC.push(startersPoints(draft.rosters[ci], W.actual[fmt], league));
        acc.tieGames += A.t;
        if (S.champion === ti) acc.champT++;
        if (S.champion === ci) acc.champC++;
        if (S.seeds.indexOf(ti) < poTeams) acc.poT++;
        if (S.seeds.indexOf(ci) < poTeams) acc.poC++;
        if (S.seeds[0] === ti) acc.topT++;
        if (S.seeds[0] === ci) acc.topC++;
        /* VIKA MOT VIKU, OHAD SKRANNI: hvor skoradi meira i hverri af
           14 vikunum? Thad er hreinasta myndin af "vinnur hann vikuna"
           og hun er onaem fyrir thvi hvern skrain gaf theim.          */
        for (let w = 1; w <= REG_WEEKS; w++) {
          const a = S.scores[ti][w], b = S.scores[ci][w];
          if (a > b) acc.weekWinT++; else if (b > a) acc.weekWinC++; else acc.weekTie++;
        }

        if (wf) {
          const sel = (key, week) => W.wf[fmt].get(`${key}|${week}`) ?? 0;
          const S2 = scoreLeague({ rosters: draft.rosters, byWeek: W.byWeek[fmt],
            league, schedule, regWeeks: REG_WEEKS, playoffWeeks: poWeeks,
            playoffTeams: poTeams, selectBy: sel });
          const A2 = S2.rec[ti], B2 = S2.rec[ci];
          acc.wfWT.push(A2.w + A2.t / 2); acc.wfWC.push(B2.w + B2.t / 2);
          acc.wfPfT.push(A2.pf); acc.wfPfC.push(B2.pf);
        }
      }
    }
  }
  return acc;
}

/** Leggur saman tvaer frumur sem eru KEYRDAR MED OHADUM FRAEKORNUM. */
function mergeAcc(a, b) {
  const out = { n: a.n + b.n };
  for (const k of Object.keys(a)) {
    if (k === "n") continue;
    out[k] = Array.isArray(a[k]) ? a[k].concat(b[k]) : a[k] + b[k];
  }
  return out;
}

function padPlan(plan, rounds) {
  const out = plan.slice(0, rounds);
  while (out.length < rounds) out.push(null);
  return out;
}

/** Dregur eina frumu nidur i tolur sem eru sambaerilegar milli ara. */
function cellStats(acc) {
  const wd = acc.wT.map((v, i) => v - acc.wC[i]);
  return {
    leagues: acc.n,
    winsT: r3(mean(acc.wT)), winsC: r3(mean(acc.wC)), winsDiff: r3(mean(wd)),
    pfT: r1(mean(acc.pfT)), pfC: r1(mean(acc.pfC)), pfDiff: r1(mean(acc.pfT) - mean(acc.pfC)),
    seasonT: r1(mean(acc.ssT)), seasonC: r1(mean(acc.ssC)),
    seasonDiff: r1(mean(acc.ssT) - mean(acc.ssC)),
    champT: r3(acc.champT / acc.n), champC: r3(acc.champC / acc.n),
    poRateT: r3(acc.poT / acc.n), poRateC: r3(acc.poC / acc.n),
    topSeedT: r3(acc.topT / acc.n), topSeedC: r3(acc.topC / acc.n),
    weekWinRate: r3(acc.weekWinT / Math.max(1, acc.weekWinT + acc.weekWinC)),
    weekWinT: acc.weekWinT, weekWinC: acc.weekWinC, weekTie: acc.weekTie,
    tieGames: acc.tieGames,
    wfWinsT: acc.wfWT.length ? r3(mean(acc.wfWT)) : null,
    wfWinsC: acc.wfWC.length ? r3(mean(acc.wfWC)) : null,
    wfWinsDiff: acc.wfWT.length ? r3(mean(acc.wfWT) - mean(acc.wfWC)) : null,
    wfPfT: acc.wfPfT.length ? r1(mean(acc.wfPfT)) : null,
    wfPfC: acc.wfPfC.length ? r1(mean(acc.wfPfC)) : null,
  };
}

/** 8,43 sigrar af 14 -> "8,4-5,6". Talan sem notandinn les i deildinni. */
const recordOf = (w) => (w == null ? "-"
  : `${w.toFixed(1)}-${(REG_WEEKS - w).toFixed(1)}`);

/** Timabil -> tvo kort af tolum -> bootstrap klasadur PER TIMABIL. */
function boot(perYear, keyT, keyC) {
  const A = {}, B = {};
  for (const [y, c] of Object.entries(perYear)) {
    if (c[keyT] == null || c[keyC] == null) continue;
    A[y] = c[keyT]; B[y] = c[keyC];
  }
  const bd = bootstrapDiff(A, B, BOOT);
  const d = Object.keys(A).map((y) => A[y] - B[y]);
  return bd ? { ...bd, diff: r3(bd.diff), lo: r3(bd.lo), hi: r3(bd.hi),
                t: tOf(d), wins: d.filter((x) => x > 0).length, years: d.length }
            : { diff: r3(mean(d)), lo: null, hi: null, excludesZero: null,
                t: tOf(d), wins: d.filter((x) => x > 0).length, years: d.length,
                why: "faerri en 3 timabil — ENGIN vikmork" };
}

/* ============================================================
   5. STEFNURNAR — ORDRETT SOMU AAETLANIR OG `strategy-lab.mjs`
   ============================================================
   Afritad viljandi og ekki flutt: `strategy-lab` skrifar bokada
   toflunna og ma ekki fara ad lesa deildar-herminn. Se listinn
   breyttur a einum stad og ekki odrum eru toflurnar ekki
   sambaerilegar — og THAD er profad i `tests/accuracy.mjs`.          */
const ANY = null;
const S14 = (...p) => [...p, ...Array(Math.max(0, 14 - p.length)).fill(ANY)];
const STRATEGIES = [
  { key: "bpa", label: "Best available (no plan)", plan: null },
  { key: "rb_rb", label: "RB-RB (robust RB)", plan: S14(["RB"], ["RB"]) },
  { key: "rb_rb_rb", label: "RB-RB-RB", plan: S14(["RB"], ["RB"], ["RB"]) },
  { key: "rb_wr", label: "RB then WR", plan: S14(["RB"], ["WR"]) },
  { key: "wr_rb", label: "WR then RB", plan: S14(["WR"], ["RB"]) },
  { key: "wr_wr", label: "WR-WR", plan: S14(["WR"], ["WR"]) },
  { key: "wr_wr_wr", label: "WR-WR-WR", plan: S14(["WR"], ["WR"], ["WR"]) },
  { key: "hero_rb", label: "Hero RB (RB1, then no RB until R5)",
    plan: S14(["RB"], ["WR", "TE"], ["WR", "TE"], ["WR", "TE"]) },
  { key: "zero_rb", label: "Zero RB (no RB in rounds 1-4)",
    plan: S14(["WR", "TE"], ["WR", "TE"], ["WR", "TE"], ["WR", "TE"]) },
  { key: "zero_rb6", label: "Zero RB, extended (no RB in rounds 1-6)",
    plan: S14(["WR", "TE"], ["WR", "TE"], ["WR", "TE"], ["WR", "TE"],
              ["WR", "TE"], ["WR", "TE"]) },
  { key: "qb1", label: "QB in round 1", plan: S14(["QB"]) },
  { key: "qb2", label: "QB in round 2", plan: S14(ANY, ["QB"]) },
  { key: "qb3", label: "QB in round 3", plan: S14(ANY, ANY, ["QB"]) },
  { key: "qb_late", label: "QB not before round 9",
    plan: [...Array(8).fill(["RB", "WR", "TE"]), ...Array(6).fill(ANY)] },
  { key: "te1", label: "TE in round 1", plan: S14(["TE"]) },
  { key: "te2", label: "TE in round 2", plan: S14(ANY, ["TE"]) },
  { key: "te_late", label: "TE not before round 9",
    plan: [...Array(8).fill(["QB", "RB", "WR"]), ...Array(6).fill(ANY)] },
  { key: "balanced", label: "RB-WR-RB-WR", plan: S14(["RB"], ["WR"], ["RB"], ["WR"]) },
  { key: "wr_heavy", label: "WR-WR-RB-WR", plan: S14(["WR"], ["WR"], ["RB"], ["WR"]) },
];

/* ============================================================
   MAIN
   ============================================================ */
async function main() {
  const t0 = Date.now();
  const { weekly, seasons, feats, waiverDesign } = await loadInputs();
  requireSeasons(seasons, "timabil med vikugognum (data/weekly/*.json)");

  const featIdx = new Map();
  for (const r of feats.rows) featIdx.set(`${r.season}|${r.id}|${r.scoring}`, r);

  console.log(`timabil med vikugognum: ${seasons.join(", ")}`);
  const worlds = {};
  for (const y of seasons) worlds[y] = buildWorld(y, weekly, featIdx);

  /* --- er summan min sama tala og `features` ber? --- */
  const sumCheck = { pairs: 0, maxAbs: 0, worst: null };
  for (const y of seasons) {
    const W = worlds[y];
    for (let i = 0; i < W.N; i++) {
      const f = featIdx.get(`${y}|${W.P[i].id}|ppr`);
      if (!f || f.pts == null) continue;
      const d = Math.abs(f.pts - W.totAll.ppr[i]);
      sumCheck.pairs++;
      if (d > sumCheck.maxAbs) { sumCheck.maxAbs = r2(d); sumCheck.worst = `${W.P[i].name} ${y}`; }
    }
  }
  console.log(`timabils-summa min gegn features.pts: ${sumCheck.pairs} por, ` +
    `staersta frávik ${sumCheck.maxAbs} (${sumCheck.worst})`);
  console.log(`laugin per ari: ` + seasons.map((y) =>
    `${y} ${worlds[y].N}`).join(" · "));

  /* --- SPA-TIMABILIN: bokada +233,6 er 2021-2025 (Sleeper-spa) --- */
  const projYears = seasons.filter((y) => {
    let n = 0;
    for (const r of feats.rows) if (r.season === y && r.scoring === "ppr" && r.sleeperProj != null) n++;
    return n > 100;
  });
  console.log(`timabil med Sleeper-spa OG vikugognum: ${projYears.join(", ")}`);

  const repl = {};
  for (const sh of SHAPES) repl[sh.key] = replacementRanks({ ...sh.league, scoring: sh.fmt });

  /* ============================================================
     VORDUR: ER LOGUNIN SU SAMA SEM THEGAR ER MAELD?
     ============================================================
     `waiver.json` ber `design.replacementRanks` fyrir NAKVAEMLEGA somu
     logunarheiti. Se hun ekki eins er annad hvort labid ad maela adra
     deild en hitt, og tvaer maelingar undir sama nafni sem maela
     sitthvora deild eru verri en ein.

     EN MUNUR ER EKKI ALLTAF VILLA, og vordurinn verdur ad geta greint
     thad — annars er hann bara alarm sem einhver slekkur a. Hann
     keyrdi og fann `10-2flex.WR: 30 gegn 29`. Orsokin er SKJALFEST
     BREYTING A `replacementRanks` (14.8.2026): flex-saetum var deilt
     med `Math.round` per stodu, sem lét saetin summast i 21 fyrir 20 i
     NAKVAEMLEGA thessari logun (athugasemdin vid `apportion` i
     model.js nefnir hana med nafni). `waiver.json` var skrifud 12.8 og
     ber thvi GOMLU regluna.

     Thess vegna reiknar vordurinn GOMLU REGLUNA LIKA og krefst thess
     ad hun SKYRI hvern mun. Munur sem gamla reglan skyrir er skrádur
     sem `legacyDrift`; munur sem hun skyrir EKKI drepur keyrsluna.   */
  const legacyRepl = (league) => {
    /* Gamla reglan ordrett: `Math.round` per stodu, flexPos hunsad. */
    const t = league.teams || 12, st = league.starters || {};
    const flex = (st.FLEX || 0) * t;
    const SPLIT = { RB: 0.330, WR: 0.477, TE: 0.193 };
    const out = {};
    for (const pos of POSES) {
      out[pos] = (st[pos] || 0) * t + Math.round(flex * (SPLIT[pos] || 0));
    }
    return out;
  };
  const shapeGuard = { checked: 0, mismatches: [], legacyDrift: [] };
  if (waiverDesign && waiverDesign.design && waiverDesign.design.replacementRanks) {
    for (const sh of SHAPES) {
      const other = waiverDesign.design.replacementRanks[sh.key];
      if (!other) continue;
      shapeGuard.checked++;
      const legacy = legacyRepl(sh.league);
      for (const pos of POSES) {
        if (other[pos] == null || other[pos] === repl[sh.key][pos]) continue;
        const line = `${sh.key}.${pos}: waiver.json ${other[pos]} vs her ${repl[sh.key][pos]}`;
        if (other[pos] === legacy[pos]) {
          shapeGuard.legacyDrift.push(`${line} (gamla Math.round-reglan gefur ${legacy[pos]} ` +
            "— skyrt af apportion-lagfaeringunni 14.8.2026)");
        } else shapeGuard.mismatches.push(line);
      }
    }
  } else shapeGuard.note = "data/measure/waiver.json vantar — logunin er OBORIN";
  if (shapeGuard.mismatches.length) {
    console.error("\n  LOGUNIN STEMMIR EKKI VID data/measure/waiver.json:");
    for (const m of shapeGuard.mismatches) console.error(`    ${m}`);
    console.error("  Og gamla `replacementRanks`-reglan skyrir thad ekki. Skrifa EKKERT.\n");
    process.exit(2);
  }
  console.log(`logunar-vordur: ${shapeGuard.checked} logun borin vid waiver.json · ` +
    `${shapeGuard.mismatches.length} oskyrdir mismunir · ` +
    `${shapeGuard.legacyDrift.length} skyrdir af apportion-lagfaeringunni`);
  for (const d of shapeGuard.legacyDrift) console.log(`   ${d}`);

  /* ============================================================
     N1 — NULLPROFID. HLID.
     ============================================================ */
  console.log(`\n${"=".repeat(78)}`);
  console.log("  N1 NULLPROF (HLID) — BORD GEGN SJALFU SER VERDUR AD GEFA NAKVAEMLEGA 50%");
  console.log("=".repeat(78));
  const nullTest = { cells: [], maxAbsWins: 0, maxAbsChamp: 0, maxAbsPf: 0,
                     maxAbsWeekWinRate: 0, passed: true };
  for (const sh of SHAPES) {
    for (const y of projYears) {
      const W = worlds[y];
      const self = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) };
      const acc = runCell({ shape: sh, W, treat: self, ctrl: self, runs: 2,
        seedBase: 11, adpSrc: ADP_SRC[sh.fmt][0] });
      const c = cellStats(acc);
      const dw = Math.abs(c.winsT - c.winsC);
      const dc = Math.abs(c.champT - c.champC);
      const dp = Math.abs(c.pfT - c.pfC);
      const dr = Math.abs(c.weekWinRate - 0.5);
      nullTest.cells.push({ shape: sh.key, season: y, leagues: c.leagues,
        winsT: c.winsT, winsC: c.winsC, champT: c.champT, champC: c.champC,
        weekWinRate: c.weekWinRate });
      nullTest.maxAbsWins = Math.max(nullTest.maxAbsWins, dw);
      nullTest.maxAbsChamp = Math.max(nullTest.maxAbsChamp, dc);
      nullTest.maxAbsPf = Math.max(nullTest.maxAbsPf, dp);
      nullTest.maxAbsWeekWinRate = Math.max(nullTest.maxAbsWeekWinRate, dr);
    }
  }
  nullTest.passed = nullTest.maxAbsWins === 0 && nullTest.maxAbsChamp === 0 &&
                    nullTest.maxAbsPf === 0 && nullTest.maxAbsWeekWinRate === 0;
  console.log(`  ${nullTest.cells.length} frumur · ` +
    `${nullTest.cells.reduce((a, c) => a + c.leagues, 0)} hermdar deildir`);
  console.log(`  staersti munur a SIGRUM         ${nullTest.maxAbsWins}`);
  console.log(`  staersti munur a MEISTARATITLUM ${nullTest.maxAbsChamp}`);
  console.log(`  staersti munur a STIGUM         ${nullTest.maxAbsPf}`);
  console.log(`  vikuleg sigurprosenta fra 50%   ${nullTest.maxAbsWeekWinRate}`);
  console.log(`  -> ${nullTest.passed ? "STENST" : "FELLUR"}`);
  if (!nullTest.passed) {
    await writeOut({ gate: false, nullTest, note:
      "NULLPROFID FELL. Herminn hallar a arm og hver tala undir honum er " +
      "merkingarlaus. Engar nidurstodur eru reiknadar." });
    console.error("\n  NULLPROFID FELL — engar nidurstodur reiknadar. Sja data/measure/h2h.json\n");
    process.exit(3);
  }

  /* ============================================================
     N2 — BOKHALDID
     ============================================================ */
  const acct = { leagues: 0, bad: [] };
  for (const sh of SHAPES) {
    const W = worlds[projYears.at(-1)];
    const board = arankBoard(W, sh.fmt, repl[sh.key]);
    const T = sh.league.teams;
    for (let r = 0; r < 3; r++) {
      const seed = (7 + r * 999983) >>> 0;
      const field = adpBoard(W, ADP_SRC[sh.fmt][0], rngOf(seed));
      const schedule = roundRobin(T, REG_WEEKS, rngOf(seed ^ 0x5bf03635));
      /* skra: hver vika er fullkomin porun */
      for (let w = 0; w < schedule.length; w++) {
        const seen = new Set();
        for (const [a, b] of schedule[w]) {
          if (a === b) acct.bad.push(`${sh.key} vika ${w + 1}: lid gegn sjalfu ser`);
          if (seen.has(a) || seen.has(b)) acct.bad.push(`${sh.key} vika ${w + 1}: lid tvisvar`);
          seen.add(a); seen.add(b);
        }
        if (seen.size !== T) acct.bad.push(`${sh.key} vika ${w + 1}: ${seen.size} af ${T} lidum`);
      }
      const boards = new Array(T + 1).fill(field);
      boards[2] = board;
      const draft = simulateDraft({ board: field, fieldBoard: field,
        actual: W.actual[sh.fmt], slot: 1, league: sh.league, boards });
      const S = scoreLeague({ rosters: draft.rosters, byWeek: W.byWeek[sh.fmt],
        league: sh.league, schedule, regWeeks: REG_WEEKS,
        playoffWeeks: PO_WEEKS, playoffTeams: PO_TEAMS });
      acct.leagues++;
      const rec = S.rec.slice(1);
      const sw = rec.reduce((a, x) => a + x.w, 0), sl = rec.reduce((a, x) => a + x.l, 0);
      const st = rec.reduce((a, x) => a + x.t, 0);
      if (sw !== sl) acct.bad.push(`${sh.key}: sigrar ${sw} != tôp ${sl}`);
      if (sw + sl + st !== T * REG_WEEKS) {
        acct.bad.push(`${sh.key}: ${sw + sl + st} utkomur, aetti ad vera ${T * REG_WEEKS}`);
      }
      for (const x of rec) {
        if (x.w + x.l + x.t !== REG_WEEKS) acct.bad.push(`${sh.key}: lid ${x.team} spiladi ${x.w + x.l + x.t}`);
      }
      if (S.champion == null) acct.bad.push(`${sh.key}: enginn meistari`);
      if (S.playoff.rounds.length !== 3) acct.bad.push(`${sh.key}: ${S.playoff.rounds.length} umferdir i urslitakeppni`);
      if (new Set(S.seeds).size !== T) acct.bad.push(`${sh.key}: rodun ber ekki oll lid`);
    }
  }
  console.log(`\n  N2 bokhald: ${acct.leagues} deildir · ${acct.bad.length} villur`);
  for (const b of acct.bad.slice(0, 5)) console.log(`     ${b}`);
  if (acct.bad.length) {
    await writeOut({ gate: false, nullTest, accounting: acct, note:
      "BOKHALDID BRAST. Skra eda talning er biluð og tolur undir henni eru merkingarlausar." });
    process.exit(3);
  }

  /* ============================================================
     N3 — SAETIS-DREIFINGIN, OSPEGLUD
     ============================================================
     ALLIR a SAMA bordi. Tha er hvert saeti eins gott og hvert annad
     ad byggingu — og THAD ER THAD SAMT EKKI, thvi snakk-rodin gefur
     saeti 1 og saeti 10 gerolika leikmenn. Talan hér er astaedan
     fyrir spegluninni: hun er STAERRI en munurinn sem er verid ad
     maela, svo osplegluð fruma vaeri maeling a saetum.                */
  const seatSpread = {};
  for (const sh of SHAPES) {
    const T = sh.league.teams;
    const winsBySeat = Array.from({ length: T + 1 }, () => []);
    const pfBySeat = Array.from({ length: T + 1 }, () => []);
    for (const y of projYears) {
      const W = worlds[y];
      const board = arankBoard(W, sh.fmt, repl[sh.key]);
      for (let r = 0; r < 3; r++) {
        const seed = (23 + W.y * 7919 + r * 104729) >>> 0;
        const field = adpBoard(W, ADP_SRC[sh.fmt][0], rngOf(seed));
        const schedule = roundRobin(T, REG_WEEKS, rngOf(seed ^ 0x5bf03635));
        const boards = new Array(T + 1).fill(board);
        const draft = simulateDraft({ board, fieldBoard: field,
          actual: W.actual[sh.fmt], slot: 1, league: sh.league, boards });
        const S = scoreLeague({ rosters: draft.rosters, byWeek: W.byWeek[sh.fmt],
          league: sh.league, schedule, regWeeks: REG_WEEKS,
          playoffWeeks: PO_WEEKS, playoffTeams: PO_TEAMS });
        for (let t = 1; t <= T; t++) {
          winsBySeat[t].push(S.rec[t].w + S.rec[t].t / 2);
          pfBySeat[t].push(S.rec[t].pf);
        }
      }
    }
    const mw = winsBySeat.slice(1).map((a) => mean(a));
    const mp = pfBySeat.slice(1).map((a) => mean(a));
    seatSpread[sh.key] = {
      winsBySeat: mw.map((x) => r2(x)),
      winsRange: r2(Math.max(...mw) - Math.min(...mw)),
      pfRange: r1(Math.max(...mp) - Math.min(...mp)),
      note: "allir a SAMA bordi — thetta er saetis-skekkja og ekkert annad",
    };
    console.log(`  N3 ${sh.key}: saetis-bil i sigrum ${seatSpread[sh.key].winsRange} ` +
      `af ${REG_WEEKS} · i stigum ${seatSpread[sh.key].pfRange}`);
  }

  /* ============================================================
     N4 — AKKERI I BADA ENDA
     ============================================================ */
  console.log(`\n${"=".repeat(78)}`);
  console.log("  N4 AKKERI — PIPAN SONNUD UR BADUM ENDUM");
  console.log("=".repeat(78));
  const anchors = {};
  for (const sh of SHAPES) {
    const src = ADP_SRC[sh.fmt][0];
    const arank = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) };
    const list = [
      { key: "oracle", label: "orakel (raunstig timabilsins) gegn A-Ranking",
        treat: { board: (X) => oracleBoard(X, sh.fmt) }, ctrl: arank, gate: "up" },
      { key: "reverse", label: "andhverft ADP gegn A-Ranking",
        treat: { board: (X) => reverseBoard(X, src) }, ctrl: arank, gate: "down" },
      { key: "random", label: "slembin rod gegn A-Ranking",
        treat: { board: (X) => randomBoard(X, X.y * 31 + 7) }, ctrl: arank, gate: "down" },
    ];
    anchors[sh.key] = {};
    for (const a of list) {
      const perYear = {};
      for (const y of projYears) {
        perYear[y] = cellStats(runCell({ shape: sh, W: worlds[y], treat: a.treat,
          ctrl: a.ctrl, runs: 2, seedBase: 31, adpSrc: src }));
      }
      const wins = boot(perYear, "winsT", "winsC");
      const pts = boot(perYear, "seasonT", "seasonC");
      const champ = boot(perYear, "champT", "champC");
      const okGate = a.gate === "up"
        ? (wins.diff > 0 && wins.excludesZero === true)
        : (wins.diff < 0 && wins.excludesZero === true);
      anchors[sh.key][a.key] = { label: a.label, wins, points: pts, champ,
        gate: a.gate, passed: okGate, perYear };
      console.log(`  ${sh.key.padEnd(10)} ${a.key.padEnd(8)} sigrar ${sgn(wins.diff)} ` +
        `[${sgn(wins.lo)},${sgn(wins.hi)}] · stig ${sgn(pts.diff, 0)} · ` +
        `titlar ${sgn(champ.diff, 3)} -> ${okGate ? "OK" : "FELLUR"}`);
    }
  }
  const anchorFail = [];
  for (const [k, v] of Object.entries(anchors)) {
    for (const [a, r] of Object.entries(v)) if (!r.passed) anchorFail.push(`${k}/${a}`);
  }
  if (anchorFail.length) {
    console.error(`\n  AKKERI FELLU: ${anchorFail.join(", ")}\n` +
      "  Pipan breytir ekki gaedum i sigra og hofnun er tha EKKI nidurstada.\n");
    await writeOut({ gate: false, nullTest, accounting: acct, seatSpread, anchors,
      note: "AKKERI FELLU — pipan breytir ekki gaedum i sigra." });
    process.exit(3);
  }

  /* ============================================================
     Q1 — A-RANKING GEGN HRARRI ADP, A SIGRUM
     ============================================================ */
  console.log(`\n${"=".repeat(78)}`);
  console.log("  Q1 BOKAD: A-RANKING GEGN ADP = +233,6 STIG (5/5). HELDUR THAD I SIGRUM?");
  console.log("=".repeat(78));
  const q1 = {};
  for (const sh of SHAPES) {
    q1[sh.key] = {};
    for (const src of ADP_SRC[sh.fmt]) {
      const arank = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) };
      const cells = {
        adp: { label: "hra ADP-rod", ctrl: { board: (X) => adpBoard(X, src) } },
        proj: { label: "hra spa-rod (engin VBD)", ctrl: { board: (X) => projBoard(X, sh.fmt) } },
      };
      q1[sh.key][src] = {};
      for (const [ck, cv] of Object.entries(cells)) {
        const perYear = {};
        for (const y of projYears) {
          perYear[y] = cellStats(runCell({ shape: sh, W: worlds[y], treat: arank,
            ctrl: cv.ctrl, runs: RUNS, seedBase: 101, adpSrc: src, wf: true }));
        }
        const lvl = (k) => r3(mean(Object.values(perYear).map((c) => c[k])));
        const out = {
          label: cv.label,
          leagues: Object.values(perYear).reduce((a, c) => a + c.leagues, 0),
          /* ABSOLUTU TOLURNAR LIKA. "+2,9 sigrar" er munur; notandinn
             spyr "hvad endar lidid mitt i?" og thad er 8-6 gegn 5-9. */
          level: {
            winsT: lvl("winsT"), winsC: lvl("winsC"),
            recordT: recordOf(lvl("winsT")), recordC: recordOf(lvl("winsC")),
            champT: lvl("champT"), champC: lvl("champC"),
            poRateT: lvl("poRateT"), poRateC: lvl("poRateC"),
            topSeedT: lvl("topSeedT"), topSeedC: lvl("topSeedC"),
          },
          wins: boot(perYear, "winsT", "winsC"),
          weekPoints: boot(perYear, "pfT", "pfC"),
          seasonPoints: boot(perYear, "seasonT", "seasonC"),
          champ: boot(perYear, "champT", "champC"),
          playoffs: boot(perYear, "poRateT", "poRateC"),
          topSeed: boot(perYear, "topSeedT", "topSeedC"),
          /* NAEMNI: byrjunarlid valid AN thess ad sja vikuna. */
          wfWins: boot(perYear, "wfWinsT", "wfWinsC"),
          wfWeekPoints: boot(perYear, "wfPfT", "wfPfC"),
          weekWinRate: r3(mean(Object.values(perYear).map((c) => c.weekWinRate))),
          perYear,
        };
        q1[sh.key][src][ck] = out;
        console.log(`  ${sh.key.padEnd(10)} ${src.padEnd(7)} ${ck.padEnd(5)} ` +
          `${out.level.recordT} gegn ${out.level.recordC} · ` +
          `sigrar ${sgn(out.wins.diff)} [${sgn(out.wins.lo)},${sgn(out.wins.hi)}]` +
          `${out.wins.excludesZero ? "*" : " "} ${out.wins.wins}/${out.wins.years} · ` +
          `vika-v-viku ${(out.weekWinRate * 100).toFixed(1)}% · ` +
          `titlar ${(out.level.champT * 100).toFixed(1)}% gegn ${(out.level.champC * 100).toFixed(1)}%` +
          `${out.champ.excludesZero ? "*" : ""} · stig ${sgn(out.seasonPoints.diff, 0)}`);
        console.log(`${" ".repeat(27)}an hindsight-uppstillingar: sigrar ` +
          `${sgn(out.wfWins.diff)} [${sgn(out.wfWins.lo)},${sgn(out.wfWins.hi)}]` +
          `${out.wfWins.excludesZero ? "*" : ""}`);
      }
    }
  }

  /* ============================================================
     Q2 — STEFNURNAR: BREYTIST RODIN?
     ============================================================ */
  console.log(`\n${"=".repeat(78)}`);
  console.log("  Q2 BOKAD: STEFNU-RODIN I STIGUM. BREYTIST HUN I SIGRUM?");
  console.log("=".repeat(78));
  const bookedPpr = JSON.parse(await readFile(path.join(DATA, "strategy_ppr.json"), "utf8"));
  const bookedOrder = bookedPpr.strategies.map((s) => s.key);

  /* ============================================================
     HVERS VEGNA RODIN HER ER EKKI ALVEG SU BOKADA — MAELT, EKKI GISKAD
     ============================================================
     Adur en nokkud er sagt um "rodin breyttist" tharf ad vita hve mikid
     af muninum er MAELIKVARDINN og hve mikid er HERMIRINN. Ein
     mælanleg orsok liggur i lauginni sjalfri: `strategy-lab` draftar UR
     `features.json` EINGONGU og 12x14 draft tharf 168 leikmenn. Se
     laugin minni en thad ganga hoparnir UPP og sidustu umferdirnar
     skila ENGUM manni — sem er nakvaemlega thar sem stodu-aaetlun a ad
     borga sig eda ekki. Thetta er talid her og birt.                  */
  const bookedPoolDepth = {};
  {
    const need = (bookedPpr.teams || 12) * (bookedPpr.rounds || 14);
    for (const y of bookedPpr.seasons || []) {
      const n = feats.rows.filter((r) => r.season === y && r.scoring === "ppr"
        && r.adp != null).length;
      bookedPoolDepth[y] = { pool: n, need, short: Math.max(0, need - n) };
    }
    const shortYears = Object.entries(bookedPoolDepth).filter(([, v]) => v.short > 0);
    console.log(`  bokada stefnutaflan: laugin dugdi EKKI i ${shortYears.length} af ` +
      `${Object.keys(bookedPoolDepth).length} arum ` +
      `(${shortYears.map(([y, v]) => `${y} vantar ${v.short}`).join(", ") || "-"})`);
  }

  const q2 = {};
  const strategyYears = seasons;             // 2019-2025, sama regla og strategy-lab
  for (const sh of SHAPES) {
    const src = ADP_SRC[sh.fmt][0];
    const bpa = STRATEGIES.find((s) => s.key === "bpa");
    const rows = [];
    for (const st of STRATEGIES) {
      const treat = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]), plan: st.plan };
      const ctrl = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]), plan: bpa.plan };
      const perYear = {}, halfA = {}, halfB = {};
      for (const y of strategyYears) {
        /* KLOFID FRAEKORN: fruman er keyrd i TVENNU LAGI med ohadum
           fraekornum. Adaltalan er theirra summa (ekkert tapast) og
           helmingarnir gefa OKEYPIS maelingu a thvi hve AREIDANLEG
           rodun malikvardans er vid sjalfa sig. Rodun sem er ekki
           sjalfsamkvaem getur ekki "breyst" a marktaekan hatt — thad
           er sama rok og "areidanleiki er ekki gagnsemi" i
           FPL-verkefninu, bara hinum megin fra.                      */
        const A = runCell({ shape: sh, W: worlds[y], treat, ctrl,
          runs: SRUNS, seedBase: 400001, adpSrc: src });
        const B = runCell({ shape: sh, W: worlds[y], treat, ctrl,
          runs: SRUNS, seedBase: 900007, adpSrc: src });
        halfA[y] = cellStats(A);
        halfB[y] = cellStats(B);
        perYear[y] = cellStats(mergeAcc(A, B));
      }
      rows.push({
        key: st.key, label: st.label,
        leagues: Object.values(perYear).reduce((a, c) => a + c.leagues, 0),
        winsAbs: r3(mean(Object.values(perYear).map((c) => c.winsT))),
        weekPtsAbs: r1(mean(Object.values(perYear).map((c) => c.pfT))),
        seasonPtsAbs: r1(mean(Object.values(perYear).map((c) => c.seasonT))),
        champAbs: r3(mean(Object.values(perYear).map((c) => c.champT))),
        vsBpaWins: boot(perYear, "winsT", "winsC"),
        vsBpaSeason: boot(perYear, "seasonT", "seasonC"),
        vsBpaWeek: boot(perYear, "pfT", "pfC"),
        vsBpaChamp: boot(perYear, "champT", "champC"),
        splitA: { wins: r3(mean(Object.values(halfA).map((c) => c.winsT))),
                  season: r1(mean(Object.values(halfA).map((c) => c.seasonT))) },
        splitB: { wins: r3(mean(Object.values(halfB).map((c) => c.winsT))),
                  season: r1(mean(Object.values(halfB).map((c) => c.seasonT))) },
        perYear,
      });
    }

    /* --- rodanir og fylgni theirra --- */
    const orderBy = (k, dir = -1) => rows.slice()
      .sort((a, b) => dir * (a[k] - b[k])).map((r) => r.key);
    const rankMap = (order) => new Map(order.map((k, i) => [k, i + 1]));
    const common = rows.map((r) => r.key).filter((k) => bookedOrder.includes(k));
    const rankOfBooked = rankMap(bookedOrder);
    const cmp = (aKey, bKeyOrder) => {
      const A = rankMap(orderBy(aKey));
      return r3(spearman(common.map((k) => A.get(k)), common.map((k) => bKeyOrder.get(k))));
    };
    const rWins = rankMap(orderBy("winsAbs"));
    const rSeason = rankMap(orderBy("seasonPtsAbs"));
    const rWeek = rankMap(orderBy("weekPtsAbs"));
    const rChamp = rankMap(orderBy("champAbs"));
    const rSplitA = rankMap(rows.slice().sort((a, b) => b.splitA.wins - a.splitA.wins).map((r) => r.key));
    const rSplitB = rankMap(rows.slice().sort((a, b) => b.splitB.wins - a.splitB.wins).map((r) => r.key));
    const sSplitA = rankMap(rows.slice().sort((a, b) => b.splitA.season - a.splitA.season).map((r) => r.key));
    const sSplitB = rankMap(rows.slice().sort((a, b) => b.splitB.season - a.splitB.season).map((r) => r.key));
    const sp = (A, B) => r3(spearman(common.map((k) => A.get(k)), common.map((k) => B.get(k))));

    q2[sh.key] = {
      seasons: strategyYears,
      rows: rows.sort((a, b) => b.winsAbs - a.winsAbs),
      order: { byWins: orderBy("winsAbs"), bySeasonPoints: orderBy("seasonPtsAbs"),
               byWeekPoints: orderBy("weekPtsAbs"), byChamp: orderBy("champAbs"),
               booked: bookedOrder },
      rho: {
        winsVsSeasonPoints: sp(rWins, rSeason),
        winsVsWeekPoints: sp(rWins, rWeek),
        winsVsChamp: sp(rWins, rChamp),
        winsVsBooked: sp(rWins, rankOfBooked),
        seasonPointsVsBooked: sp(rSeason, rankOfBooked),
        /* SJALFSAREIDANLEIKI: sama malikvardi, tvo odháð fraekorn. */
        winsSelfReliability: sp(rSplitA, rSplitB),
        seasonSelfReliability: sp(sSplitA, sSplitB),
      },
      top3: { byWins: orderBy("winsAbs").slice(0, 3),
              bySeasonPoints: orderBy("seasonPtsAbs").slice(0, 3),
              booked: bookedOrder.slice(0, 3) },
      significantOnWins: rows.filter((r) => r.vsBpaWins.excludesZero).map((r) => r.key),
      significantOnPoints: rows.filter((r) => r.vsBpaSeason.excludesZero).map((r) => r.key),
      /* NULLID INNAN SJALFRAR TOFLUNNAR: `bpa`-rodin er medferd == vidmid.
         Hun VERDUR ad lesa nakvaemlega 0 a ollum thremur malikvordum.
         Thetta er sama nullprof og N1 en thad keyrir i SJALFRI
         maelingunni, ekki i serstakri lykkju vid hlidina a henni. */
      bpaSelfNull: (() => {
        const b = rows.find((r) => r.key === "bpa");
        return { winsDiff: b.vsBpaWins.diff, seasonDiff: b.vsBpaSeason.diff,
                 weekDiff: b.vsBpaWeek.diff, champDiff: b.vsBpaChamp.diff,
                 passed: b.vsBpaWins.diff === 0 && b.vsBpaSeason.diff === 0 &&
                         b.vsBpaWeek.diff === 0 && b.vsBpaChamp.diff === 0 };
      })(),
    };

    const Q = q2[sh.key];
    console.log(`\n  ${sh.label}`);
    console.log(`     ${"stefna".padEnd(34)}${"sigrar".padStart(8)}${"vs BPA".padStart(9)}` +
      `${"stig".padStart(9)}${"vs BPA".padStart(9)}${"titlar".padStart(8)}`);
    for (const r of Q.rows) {
      console.log(`     ${r.label.slice(0, 33).padEnd(34)}${r.winsAbs.toFixed(2).padStart(8)}` +
        `${sgn(r.vsBpaWins.diff).padStart(9)}${r.seasonPtsAbs.toFixed(0).padStart(9)}` +
        `${sgn(r.vsBpaSeason.diff, 0).padStart(9)}${(r.champAbs * 100).toFixed(1).padStart(7)}%`);
    }
    console.log(`     rho(sigrar, timabils-stig) = ${Q.rho.winsVsSeasonPoints}` +
      ` · rho(sigrar, vikustig) = ${Q.rho.winsVsWeekPoints}`);
    console.log(`     rho(sigrar, bokud rod) = ${Q.rho.winsVsBooked}` +
      ` · rho(stig, bokud rod) = ${Q.rho.seasonPointsVsBooked}`);
    console.log(`     SJALFSAREIDANLEIKI: sigrar ${Q.rho.winsSelfReliability}` +
      ` · stig ${Q.rho.seasonSelfReliability}`);
    console.log(`     marktaek gegn BPA — a sigrum: ` +
      `${Q.significantOnWins.length ? Q.significantOnWins.join(", ") : "ENGIN"}` +
      ` · a stigum: ${Q.significantOnPoints.length ? Q.significantOnPoints.join(", ") : "ENGIN"}`);
    console.log(`     bpa-rodin (medferd == vidmid) les ${Q.bpaSelfNull.winsDiff} sigra / ` +
      `${Q.bpaSelfNull.seasonDiff} stig -> ${Q.bpaSelfNull.passed ? "NULL STENST" : "NULL FELLUR"}`);
    if (!Q.bpaSelfNull.passed) {
      console.error("\n  NULLID INNAN TOFLUNNAR FELL — taflan er merkingarlaus.\n");
      process.exit(3);
    }
  }

  /* ============================================================
     NAEMNI — FJOGUR LID I URSLITAKEPPNI I STAD SEX
     ============================================================ */
  const poSens = {};
  for (const sh of SHAPES) {
    const src = ADP_SRC[sh.fmt][0];
    const arank = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) };
    const ctrl = { board: (X) => adpBoard(X, src) };
    const perYear = {};
    for (const y of projYears) {
      perYear[y] = cellStats(runCell({ shape: sh, W: worlds[y], treat: arank, ctrl,
        runs: 2, seedBase: 101, adpSrc: src, poTeams: 4, poWeeks: [16, 17] }));
    }
    poSens[sh.key] = { champ: boot(perYear, "champT", "champC"),
                       playoffs: boot(perYear, "poRateT", "poRateC"), perYear };
  }

  /* ============================================================
     RAUNVERULEIKA-AKKERI — ER HERMDA DEILDIN LIK RAUNVERULEGRI?
     ============================================================
     EINA lokna deildin sem vid EIGUM er Patriots 2025 (raunsvar
     Sleeper, ordrett i `tests/standings.mjs`). `ppts` i thvi svari er
     BESTA MOGULEGA byrjunarlidid, sem er nakvaemlega thad sem
     `oracleLineup` reiknar — thvi er thad sambaerilega talan, ekki
     `fpts`. Thetta er SAMHENGI OG EKKI HLID: hermda deildin ber hvorki
     spyrnumenn ne varnir og engan waiver, svo hun A ad liggja lagra.  */
  const realWins = [8, 7, 7, 5, 10, 8, 7, 6, 5, 7];
  const realPpts = [1987.64, 2022.62, 1780.06, 1777.26, 2291.40,
                    2126.94, 2094.02, 2010.26, 1940.94, 2131.66];
  const sdOf = (a) => Math.sqrt(mean(a.map((x) => (x - mean(a)) ** 2)));
  const simWinsSd = [], simPfMean = [], simPfSd = [];
  {
    const sh = SHAPES[0];                    // Patriots-lognin
    const T = sh.league.teams;
    for (const y of projYears) {
      const W = worlds[y];
      const board = arankBoard(W, sh.fmt, repl[sh.key]);
      const seed = (55 + W.y * 7919) >>> 0;
      const field = adpBoard(W, "adpPpr", rngOf(seed));
      const schedule = roundRobin(T, REG_WEEKS, rngOf(seed ^ 0x5bf03635));
      const boards = new Array(T + 1).fill(field);
      boards[3] = board;                     // eitt lid med A-Ranking, eins og i raun
      const draft = simulateDraft({ board: field, fieldBoard: field,
        actual: W.actual[sh.fmt], slot: 1, league: sh.league, boards });
      const S = scoreLeague({ rosters: draft.rosters, byWeek: W.byWeek[sh.fmt],
        league: sh.league, schedule, regWeeks: REG_WEEKS,
        playoffWeeks: PO_WEEKS, playoffTeams: PO_TEAMS });
      const w = S.rec.slice(1).map((x) => x.w + x.t / 2);
      const pf = S.rec.slice(1).map((x) => x.pf);
      simWinsSd.push(sdOf(w)); simPfMean.push(mean(pf)); simPfSd.push(sdOf(pf));
    }
  }
  /* HVE MIKID AF STIGA-BILINU ER SPYRNUMADURINN? Reiknad ur SOMU
     vikuskram — spyrnumenn eru i `data/weekly/`, thott their seu utan
     draftsins. K sem endar i saeti 10 a stigum yfir timabilid er sa
     sem 10-lida deild myndi eiga; medaltal hans per viku x 14 er
     framlagid sem hermda deildin ber EKKI. Vornina er ekki haegt ad
     reikna — `data/weekly/` ber enga DST — og thad er sagt.          */
  const kickerGap = (() => {
    const per = [];
    for (const y of projYears) {
      const tot = new Map();
      for (const r of weekly[y]) {
        if (r.pos !== "K" || r.week > REG_WEEKS) continue;
        tot.set(r.id, (tot.get(r.id) || 0) + (r.ppr ?? 0));
      }
      const sorted = [...tot.values()].sort((a, b) => b - a);
      per.push(mean(sorted.slice(0, 10)));       // 10 lid = 10 spyrnumenn
    }
    return r1(mean(per));
  })();
  const realism = {
    real: { league: "Patriots SB champs 2025 (raunsvar Sleeper, tests/standings.mjs)",
            wins: realWins, winsSd: r2(sdOf(realWins)),
            optimalPoints: { mean: r1(mean(realPpts)), sd: r1(sdOf(realPpts)),
                             min: r1(Math.min(...realPpts)), max: r1(Math.max(...realPpts)) },
            note: "`ppts` = besta mogulega byrjunarlid, vikur 1-14, MED K og DEF" },
    simulated: { winsSd: r2(mean(simWinsSd)), pointsMean: r1(mean(simPfMean)),
                 pointsSd: r1(mean(simPfSd)), seasons: projYears },
    pointsGap: r1(mean(realPpts) - mean(simPfMean)),
    kickerContribution: kickerGap,
    isGate: false,
    why: "hermda deildin ber hvorki K/DEF ne waiver-hreyfingu, svo hun A ad " +
         "liggja lagra i stigum. Spyrnumadurinn einn er maelanlegur ur somu " +
         "gognum; vornin er thad ekki (data/weekly ber enga DST). Bilid sem " +
         "eftir stendur er vorn + waiver og er EKKI fullyrding um hvorugt.",
  };
  console.log(`\n  raunveruleika-akkeri: sigra-sd raun ${realism.real.winsSd} ` +
    `gegn hermt ${realism.simulated.winsSd} · stig raun ` +
    `${realism.real.optimalPoints.mean} gegn hermt ${realism.simulated.pointsMean} ` +
    `(bil ${realism.pointsGap}, thar af spyrnumadur ${kickerGap})`);

  /* ============================================================
     SKRIFA
     ============================================================ */
  const secs = Math.round((Date.now() - t0) / 100) / 10;
  const verdict = buildVerdict({ q1, q2, anchors });
  console.log(`\n${"=".repeat(78)}`);
  for (const line of verdict.lines) console.log(`  ${line}`);
  console.log("=".repeat(78));

  await writeOut({
    gate: true, nullTest, accounting: acct, seatSpread, anchors,
    q1, q2, playoffSensitivity: poSens, realism, verdict, bookedPoolDepth,
    coverage: Object.fromEntries(seasons.map((y) => [y, worlds[y].coverage])),
    sumCheck, shapeGuard, projYears, seasons, runtimeSec: secs,
  });
  console.log(`\n-> data/measure/h2h.json  (${secs} s)`);
}

function buildVerdict({ q1, q2, anchors }) {
  const lines = [];
  const q1cells = [];
  for (const [sk, byS] of Object.entries(q1)) {
    for (const [src, cells] of Object.entries(byS)) {
      const c = cells.adp;
      q1cells.push({ shape: sk, src, wins: c.wins, champ: c.champ,
                     points: c.seasonPoints });
    }
  }
  const winsPos = q1cells.filter((c) => c.wins.diff > 0).length;
  const winsSig = q1cells.filter((c) => c.wins.excludesZero).length;
  const champPos = q1cells.filter((c) => c.champ.diff > 0).length;
  lines.push(`Q1 A-Ranking gegn ADP: jakvaett a SIGRUM i ${winsPos} af ${q1cells.length} ` +
    `frumum, marktaekt i ${winsSig}. Titlar jakvaedir i ${champPos}.`);
  const orderChanged = [];
  for (const [sk, Q] of Object.entries(q2)) {
    const same = Q.order.byWins.join(",") === Q.order.bySeasonPoints.join(",");
    orderChanged.push(`${sk}: rho(sigrar,stig)=${Q.rho.winsVsSeasonPoints}` +
      `${same ? " (NAKVAEMLEGA sama rod)" : ""}` +
      `, sjalfsareidanleiki sigra ${Q.rho.winsSelfReliability}`);
  }
  lines.push(`Q2 stefnu-rodin: ${orderChanged.join(" | ")}`);

  /* ============================================================
     SAMANBURDUR SEM SKER UR — OG HANN ER SJALFUR MAELDUR
     ============================================================
     "Rodin breyttist" er merkingarlaust nema thrjar tolur seu bornar
     saman i einu:
       A  rho(sigrar, stig)  — I SOMU DROFTUM. Hreint metrik-áhrif.
       B  rho(stig, bokud rod) — SOMU stig, annar hermir. Hreint
          hermis-áhrif (og thad er EKKI null).
       C  sjalfsareidanleiki sigra — thakid a thvi hve mikid A getur
          verid ann annad en havadi.
     Se A HAERRA en B thá faerdi mælikvardinn rodina MINNA en munurinn
     a herminum gerdi, og "punktar voru nothaef nálgun" er nidurstada,
     ekki uppgjof.                                                    */
  const cmp = Object.entries(q2).map(([sk, Q]) => ({
    shape: sk,
    metricEffect: Q.rho.winsVsSeasonPoints,
    harnessEffect: Q.rho.seasonPointsVsBooked,
    ceiling: Q.rho.winsSelfReliability,
    metricMovesLess: Q.rho.winsVsSeasonPoints > Q.rho.seasonPointsVsBooked,
  }));
  const nLess = cmp.filter((c) => c.metricMovesLess).length;
  lines.push(`Q2 rho(sigrar,stig) er HAERRA en rho(stig,bokud) i ${nLess} af ` +
    `${cmp.length} logunum — thad ad skipta um MAELIKVARDA faerir rodina ` +
    "minna en thad ad skipta um HERMI.");
  /* HVAD ER MARKTAEKT, OG I HVORA ATT? Ad segja "ein stefna er
     marktaek" er ekki nog: se hver einasta marktaeka stefna NEIKVAED
     er nidurstadan "thad er haegt ad maela hvad ma EKKI gera, ekki
     hvad a ad gera" — og hun er allt onnur setning.               */
  const dirs = { posWins: [], posPoints: [], negWins: [], negPoints: [] };
  for (const [sk, Q] of Object.entries(q2)) {
    const rows = Object.fromEntries(Q.rows.map((r) => [r.key, r]));
    for (const k of Q.significantOnWins) {
      (rows[k].vsBpaWins.diff > 0 ? dirs.posWins : dirs.negWins).push(`${sk}/${k}`);
    }
    for (const k of Q.significantOnPoints) {
      (rows[k].vsBpaSeason.diff > 0 ? dirs.posPoints : dirs.negPoints).push(`${sk}/${k}`);
    }
  }
  lines.push(`Q2 marktaekar stefnur — a sigrum: ${dirs.posWins.length} jakvaedar, ` +
    `${dirs.negWins.length} neikvaedar. A stigum: ${dirs.posPoints.length} jakvaedar, ` +
    `${dirs.negPoints.length} neikvaedar.`);
  lines.push(dirs.posWins.length === 0 && dirs.posPoints.length === 0
    ? "Q2 ENGIN stefna slaer BPA marktaekt a HVORUGUM malikvardanum. Thad sem er " +
      "maelanlegt er hvad ma EKKI gera (zero-RB, QB snemma, WR-WR-WR) — og THAD " +
      "segja badir malikvardarnir eins."
    : "Q2 minnst ein stefna slaer BPA marktaekt — rodin er thvi ekki oll havadi.");
  return { lines, winsPositiveCells: winsPos, winsSignificantCells: winsSig,
           champPositiveCells: champPos, q1cellCount: q1cells.length,
           orderComparison: cmp, significantDirections: dirs };
}

async function writeOut(body) {
  await mkdir(path.join(DATA, "measure"), { recursive: true });
  const inputs = ["features.json", "strategy_ppr.json", "model_eval_ppr.json",
    ...[2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y) => `weekly/${y}.json`)];
  await writeFile(path.join(DATA, "measure", "h2h.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: DEFAULTS,
      inputs, dataDir: DATA }),
    question: "Fantasy vinnst a vikulegum vidureignum, ekki a stigum. " +
      "Halda tolurnar sem eru bokadar i stigum thegar thaer eru maeldar i SIGRUM?",
    design: {
      regularSeason: `vikur 1-${REG_WEEKS} (MAELT: \`fpts\` i raunsvari Sleeper er ` +
        "1815,34 = vikur 1-14, en vikur 1-17 gefa 2268,18)",
      playoffs: `vikur ${PO_WEEKS.join(",")} (MAELT: playoff_week_start = 15)`,
      playoffTeams: `${PO_TEAMS} (MAELT: playoff_teams = 6 i BADUM deildum notandans)`,
      schedule: "hringadferd med slembadri umferdarod per deild; hvert lid spilar " +
        "nakvaemlega einn leik i viku",
      seeding: "wins + ties/2, sidan stig (`pf`) — regla Sleeper; jafntefli i " +
        "urslitaleik: efra saeti kemst afram (deterministiskt)",
      arms: "medferdin i saeti i, vidmidid i saeti j, oll onnur saeti eftir markadinum; " +
        "hver fruma SPEGLUD (i<->j) svo saetis-skekkja falli ut og nullprofid se nakvaemt",
      lineup: "byrjunarlid vikunnar ur `startersRaw` i src/accuracy.js — ein utfaersla. " +
        "Headline-frumur skoradar TVISVAR: raunstig vikunnar (`oracleLineup`) og " +
        "gangandi spa (`wfLineup`, hrist ppg k=4, vikur < w)",
      pool: "allir sem eiga vikugogn (QB/RB/WR/TE); taglid a bordinu radast eftir " +
        "gangandi forgildi thvi features.json ber 145-204 menn en 12x14 draft tharf 168",
      excluded: "K og DST — utan draftsins, tom saeti hja OLLUM lidum, fella ut ur mun",
      clustering: "bootstrap KLASADUR PER TIMABIL (src/learn.js bootstrapDiff); " +
        "radir innan ars eru ekki ohadar",
      bootRuns: BOOT,
    },
    unmeasured: {
      waiver: "hoparnir eru fastir allt timabilid. `waiver-lab` maelir waiver-regluna; " +
        "ad blanda thvi hingad vaeri ad maela tvennt i einu. Meiddur madur er 0 stig " +
        "og enginn getur skipt honum ut.",
      trades: "engin skipti. Enginn gagnagrunnur ber tha sogulega.",
      scheduleStrength: "hringadferd, ekki raunveruleg Sleeper-skra og engar deildir. " +
        "Spegluninni er aetlad ad fella thad ut, ekki ad herma thad.",
      halfAdp: "sogulegt half-PPR ADP er ekki til (half-lab). 12-lida deildin er thvi " +
        "maeld med BADUM (ppr og std) sem vikmork.",
    },
    ...body,
  }, null, 1));
}

main().catch((e) => { console.error(e); process.exit(1); });
