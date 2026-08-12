#!/usr/bin/env node
/* ============================================================
   waiver-lab.mjs — HVE MIKID MA VERA BETRA ADUR EN THAD ER THESS VIRDI?

     node scripts/waiver-lab.mjs [--runs=3] [--boot=120] [--weeks=14]
                                 [--from=2019] [--k=4]

   -> data/measure/waiver.json

   ============================================================
   KODINN BAD UM THESSA MAELINGU SJALFUR
   ============================================================
   `src/waivers.js` ber `WAIVER_CAL.minGain = 10` med `measured: false`
   og thessari notu:

     "Measuring the right value needs a waiver lab that does not exist
      here: a season of weekly add/drop decisions scored against real
      weekly points."

   Thetta er thad lab. `tests/waivers.mjs` kafli 11 FELLUR ef einhver
   merkir toluna maelda an thess. Thessi skrifta TENGIR EKKERT inn i
   `src/` — hun skrifar EINA skra og segir hvad tolurnar bera.

   ============================================================
   TVAER SPURNINGAR, OG SU SIDARI ER STAERRI
   ============================================================
   1. GOLFID: minGain i {0, 2, 5, 8, 10, 15, 25}. `0` er "taktu hvern
      sem er nafnbotarlega betri", `25` er "gerdu naestum ekkert".
      BADIR ENDAR ERU RAUNHAEFAR NULLTILGATUR og badir eru i toflunni.

   2. GJALDMIDILLINN: tímabils-VBD (thad sem appid notar), rest-of-
      season VBD (nytt varamanns-threp reiknad a THAER VIKUR SEM EFTIR
      ERU) eda vikuspa (`weeklyProjection`). I viku 8 er timabils-VBD
      half-urelt: hun inniheldur atta vikur sem eru THEGAR SPILADAR og
      sem enginn skipti getur haggad.

   ============================================================
   TEIKNINGIN — OG HVERS VEGNA HUN ER SVONA
   ============================================================
   Hermd deild per (timabil x logun x snid). Upphafs-hoparnir eru
   draftadir ur ADP med hávaða — `simulateDraft` UR `src/accuracy.js`,
   ekki afrit — og eru NAKVAEMLEGA THEIR SOMU fyrir hvert afbrigdi
   (sama fraekorn), svo samanburdurinn er pardur.

   Sidan 13 vikur af add/drop. Byrjunarlidid er stillt upp med
   `optimalLineup` UR `src/lineup.js` a vikuspa sem notar EINGONGU
   vikur < w, og skorad a RAUNVERULEGUM vikustigum ur `data/weekly/`.

   THRIR SETUR I HVERRI DEILD:
     · MEDFERDIN   — saetid sem notar regluna sem er maeld
     · VIDMIDID    — saetid sem GERIR EKKERT (nulltilgatan, skilyrdi 3)
     · MARKADURINN — ollum odrum saetum er stjornad af THEIRRI REGLU
                     SEM APPID SENDIR (season VBD, golf 10)

   MOTHERJARNIR VERDA AD TAKA AF WAIVER, OG THAD ER EKKI SMAATRIDI.
   `accuracy.js` skjalar villuna sem thetta forvarnar: thar var
   stoduthak adeins a OKKAR lidi og samsteypan draftadi thrja
   leikstjornendur og lenti i 124. saeti af 208. Su hermun maeldi
   "gefur bordid jafnt snid undir barnalegri reglu", ekki "hafdi hun
   rett fyrir ser". Hlidstaedan her er EINOKUN A LAUSUM MONNUM: ef
   adeins mitt lid saekir a vidirnir liggja allir a laus i 13 vikur og
   hver regla maelist stor. Thess vegna er `field` MAELT I THREMUR
   STILLINGUM — `active` (markadurinn keyrir sendu regluna), `idle`
   (enginn annar saekir) og `greedy` (markadurinn med golf 0) — og
   munurinn a theim er SVARID vid "hve miklu breytti thad".

   SPEGLUN: hver fruma er keyrd i BADUM attum (medferd i saeti A og
   vidmid i B, sidan vidmid i A og medferd i B) og medaltalid tekid.
   Thad fjarlaegir saetis-skekkju OG gerir sjalfsprofid nakvaemt.

   ============================================================
   HVERS VEGNA GOLFID ER MAELT I SOMU EININGU FYRIR ALLAR REGLUR
   ============================================================
   `minGain` er i VBD-stigum. Vikuspa er a alveg odrum kvarda (10 stig
   i EINNI viku er ekki sama krafan og 10 stig yfir timabil), svo sama
   TALAN vaeri ekki sama KRAFAN. Tvennt er gert:

     · Vikulegu gjaldmidlarnir bera golf `f / WEEKS` — sama krafa per
       viku og timabils-golfid f gefur yfir timabilid. `rosVbdPro` ber
       golf `f * (vikur eftir) / WEEKS` af somu astaedu.
     · Placebo- og orakel-reglur fa gildi sin med THREPUN
       (quantile-mapping) inn a dreifingu raunverulega gjaldmidilsins.
       Thar med hefur `minGain` NAKVAEMLEGA sama merkingu i placebo-
       frumu og i raunfrumu, og placebo-thakid er thvi samanburdarhaeft
       lid fyrir lid. An thessa vaeri "placebo-thakid" bara mæling a
       thvi hvada kvarda placeboin var a.

   ============================================================
   THAD SEM ER OMAELT HER, OG HVERS VEGNA (sja `unmeasured`)
   ============================================================
   · TRENDING. `data/trending/` ber TVO daga (2026-08-11 og -12).
     Waiver-hlaupid er thvi EKKI bakprofanlegt — og thad er einmitt thad
     sem `waivers.js` segir thegar hun birtir `trendAdd` sem samhengi og
     ekki merki. Engin tala her a hana.
   · FAAB. Deildirnar sem eru maeldar nota waiver-rod, ekki tilbod.
     Verdlagning i dollurum er onnur akvordun og hun tharf onnur gogn.
   · IR-STASH. Meidsla-stada er EKKI i sogulegu vikugognunum, svo
     `avail` er 1 hja ollum og "geymdu meiddan mann" er ekki maelanlegt.
     Leikmadur sem spilar ekki faer 0 stig — nakvaemlega thad sem
     gerdist — en ENGIN regla her getur sed thad fyrir.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { pickupAdvice, freeAgents, WAIVER_CAL } from "../src/waivers.js";
import { computeVbd, replacementRanks, weeklyProjection,
         impliedTeamTotals } from "../src/model.js";
import { optimalLineup, slotsFor } from "../src/lineup.js";
import { simulateDraft } from "../src/accuracy.js";
import { mean, bootstrapDiff } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const DATA = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  runs: "number", boot: "number", weeks: "number", from: "number", k: "number",
});
const DEFAULTS = { runs: 6, boot: 150, weeks: 14, from: 2019, k: 4 };
const RUNS  = Number(ARG.runs  ?? DEFAULTS.runs);    // draft-fraekorn per fruma
const BOOT  = Number(ARG.boot  ?? DEFAULTS.boot);    // leikmanna-bootstrap, 0 = sleppa
const WEEKS = Number(ARG.weeks ?? DEFAULTS.weeks);   // fantasy-deildarkeppni
const FROM  = Number(ARG.from  ?? DEFAULTS.from);
const KPRIOR = Number(ARG.k    ?? DEFAULTS.k);       // forgildis-thyngd i leikjum

const r1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const sgn = (x) => (x == null ? "-" : `${x > 0 ? "+" : ""}${x}`);
const POSES = ["QB", "RB", "WR", "TE"];               // = WAIVER_CAL.rankedPos.value

/* Fraekorn: LCG. Fast, endurgeranlegt, og sama utfaersla og i hinum
   loobbunum (`half-lab`, `vbdbase-lab`) svo hávaðinn se sambaerilegur. */
function rngOf(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const hash32 = (s, seed) => {
  let h = (seed >>> 0) ^ 2166136261;
  for (let i = 0; i < s.length; i++) h = ((h ^ s.charCodeAt(i)) * 16777619) >>> 0;
  return h >>> 0;
};

/* Pardur t yfir timabil. Klasarnir eru ARIN — sama og annars stadar. */
function tOf(a) {
  const v = a.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
}

/* ============================================================
   1. DEILDIRNAR SEM SKIPTA MALI
   ============================================================
   Tvaer raunverulegar deildir og ein almenn 12-lida logun (sama snid og
   `DEFAULT_LEAGUE` i accuracy.js) svo haegt se ad sja hvort svarid se
   logunar-bundid. K og DST eru EKKI i draftinu (`excludePos`, sama
   akvordun og accuracy.js: thau hafa nanast enga dreifingu og baeta
   adeins hávaða) og ekki i waiver-rodinni heldur (`RANKED_POS` i
   waivers.js). 10-lida deildin ber samt K/DST-saeti thvi thad er hennar
   raunverulega snid — thau eru TOM hja OLLUM lidum i OLLUM afbrigdum og
   fella thvi ut ur hverjum mun. `data/weekly/` ber engar varnir.       */
const SHAPES = [
  { key: "10-2flex", label: "10 lid, 2 FLEX, K+DST",
    league: { teams: 10, rounds: 15,
      starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
      maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
      flexPos: ["RB", "WR", "TE"], excludePos: ["K", "DST"] } },
  { key: "12-2flex", label: "12 lid, 2 FLEX, engin K/DST",
    league: { teams: 12, rounds: 14,
      starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
      maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
      flexPos: ["RB", "WR", "TE"], excludePos: ["K", "DST"] } },
  { key: "12-1flex", label: "12 lid, 3 WR + 1 FLEX (almenn)",
    league: { teams: 12, rounds: 14,
      starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 },
      maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
      flexPos: ["RB", "WR", "TE"], excludePos: ["K", "DST"] } },
];
const FORMATS = ["ppr", "half", "standard"];
const FLOORS = [0, 2, 5, 8, 10, 15, 25];

/* MARKADURINN ER SENDA REGLAN. Ad velja eitthvad annad vaeri ad finna
   upp markad; `WAIVER_CAL.minGain.value` er thad sem notandinn faer i
   dag, svo thad er markadurinn sem regla min tharf ad slá. */
const MARKET = { cur: "seasonVbd", scale: "abs", floor: WAIVER_CAL.minGain.value };
const FIELD_MODES = {
  active: MARKET,                                    // sendan regla
  idle: null,                                        // enginn annar saekir
  greedy: { cur: "seasonVbd", scale: "abs", floor: 0 },
};

/* ============================================================
   2. GJALDMIDLARNIR
   ============================================================ */
const CURRENCIES = [
  { key: "seasonVbd", cur: "seasonVbd", scale: "abs",
    label: "season VBD (thad sem appid notar)" },
  { key: "rosVbd", cur: "rosVbd", scale: "abs",
    label: "ROS VBD (nytt threp a vikur sem eftir eru)" },
  { key: "rosVbdPro", cur: "rosVbd", scale: "pro",
    label: "ROS VBD, golf pro-rated" },
  { key: "weekVbd", cur: "weekVbd", scale: "week",
    label: "vikuspa yfir vikulegu threpi" },
  { key: "weekRaw", cur: "weekRaw", scale: "week",
    label: "hra vikuspa (ekkert threp)" },
];

/* PLACEBO-FAMILIA. Hver regla er sama netid: sama laug, sama golf, sama
   odyrasti-drop, sama byrjunarlid. Adeins RODUNIN er havadi, og gildin
   eru threpud inn a dreifingu `seasonVbd` svo golfid haldi merkingu.
   `reverse` er NEDRA akkeri (and-merki) og ma vera storlega negatift. */
const PLACEBOS = [
  { key: "pl_perm",      label: "placebo: fost slembin rod" },
  { key: "pl_permPos",   label: "placebo: slembin rod innan stodu" },
  { key: "pl_permWeek",  label: "placebo: ny slembin rod i hverri viku" },
  { key: "pl_nameLen",   label: "placebo: eftir lengd nafns" },
  { key: "pl_alpha",     label: "placebo: eftir stafrofi" },
  { key: "pl_team",      label: "placebo: eftir lidsskammstofun" },
  { key: "pl_reverse",   label: "placebo: ANDHVERFT merki (nedra akkeri)" },
];
/* ORAKEL-AKKERIN. `or_ros` er EFRA AKKERID og thad er HLIDID: regla sem
   veit raunstig thess sem eftir er VERDUR ad slá "gera ekkert" i hverri
   frumu. Ella er thetta maeling a biladri pipu og hofnun er ekki
   nidurstada. `or_week` er EKKI hlid og er thad viljandi — fullkomin
   vitneskja um EINA viku er ekki fullkomin vitneskja um akvordunina,
   thvi skiptin gilda i allar thaer vikur sem eftir eru. Talan er birt
   thvi hun er sjalfstaed vitneskja um sama mal.                        */
const ORACLES = [
  { key: "or_ros",  cur: "or_ros",  scale: "abs", gate: true,
    label: "orakel: raunstig ALLRA vikna sem eftir eru" },
  { key: "or_week", cur: "or_week", scale: "week", gate: false,
    label: "orakel: raunstig NAESTU viku (EKKI hlid)" },
];

/* ============================================================
   3. GOGNIN
   ============================================================ */
async function loadInputs() {
  const seasons = [];
  const weekly = {};
  for (let y = 2019; y <= 2025; y++) {
    try {
      weekly[y] = JSON.parse(await readFile(path.join(DATA, "weekly", `${y}.json`), "utf8"));
      seasons.push(y);
    } catch { /* vantar -> sleppt, og thad sest i `seasons` */ }
  }
  const feats = JSON.parse(await readFile(path.join(DATA, "features.json"), "utf8"));
  const sched = JSON.parse(await readFile(path.join(DATA, "schedule_history.json"), "utf8"));
  return { weekly, seasons, feats, games: sched.games || [] };
}

const ptsOf = (row, fmt) => (fmt === "ppr" ? row.ppr : fmt === "half" ? row.half : row.std);
const gamesInSeason = (y) => (y <= 2020 ? 16 : 17);

/**
 * Ein laug per (timabil x snid). Allt er visitolu-bundid (0..N-1) thvi
 * vikulega lykkjan er heit — en `id` er haldid til haga svo
 * jafngildisprofin geti kallad i `pickupAdvice` med raunverulegum rodum.
 *
 * FORGILDID (`priorPpg`) ER GANGANDI, ALDREI FRAMTID:
 *   · leikmadur med ADP-rod: spa arsins / leikir arsins
 *   · annars: stig FYRRA timabils / 17 (per LEIK LIDSINS, svo meiddur
 *     madur se rettilega ódyr — sama rok og "aud vika = 0, ekki null")
 *   · nylidi an fyrra timabils: stodu-golf reiknad AF EINGONGU FYRRI
 *     timabilum. 2019 hefur engin fyrri vikugogn, svo thad golf er 0
 *     thar og thad er SAGT (`priorSource`).
 */
function buildPool(y, ctxIn, fmt) {
  const { weekly, featIdx, sched } = ctxIn;
  const rows = weekly[y];
  const prev = weekly[y - 1] || null;

  /* --- fyrra timabil: stig per LEIK LIDSINS (17) --- */
  const prevPts = new Map();
  if (prev) for (const r of prev) {
    const v = ptsOf(r, fmt);
    if (v != null) prevPts.set(r.id, (prevPts.get(r.id) || 0) + v);
  }

  /* --- stodu-golf fyrir "engin saga": AF FYRRI ARUM EINGONGU --- */
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
        const v = ptsOf(r, fmt);
        if (v != null) tot.set(r.id, (tot.get(r.id) || 0) + v);
      }
      for (const v of tot.values()) vals.push(v / 17);
    }
    rookieFloor[pos] = vals.length ? mean(vals) : 0;
  }

  /* --- leikmenn --- */
  const idx = new Map();
  const P = [];                          // { id, name, pos, teams:Map(w->team) }
  for (const r of rows) {
    if (!POSES.includes(r.pos)) continue;                // K/DST utan (sja SHAPES)
    let i = idx.get(r.id);
    if (i == null) {
      i = P.length; idx.set(r.id, i);
      P.push({ id: r.id, name: r.name, pos: r.pos, teamAt: new Map(), n: 0 });
    }
    const p = P[i];
    p.teamAt.set(r.week, r.team);
    p.n++;
  }
  const N = P.length;
  const posIdx = new Int8Array(N);
  P.forEach((p, i) => { posIdx[i] = POSES.indexOf(p.pos); });

  /* raunstig per viku */
  const MAXW = 18;
  const act = [];
  for (let w = 0; w <= MAXW; w++) act.push(new Float64Array(N));
  const playedWeek = [];
  for (let w = 0; w <= MAXW; w++) playedWeek.push(new Uint8Array(N));
  for (const r of rows) {
    const i = idx.get(r.id);
    if (i == null || r.week > MAXW) continue;
    const v = ptsOf(r, fmt);
    if (v == null) continue;
    act[r.week][i] = v;
    playedWeek[r.week][i] = 1;
  }

  /* THEKKT LID I VIKU w = lidid ur SIDUSTU viku < w sem hann atti rod i.
     Fyrir vikur adur en hann kemur fyrst er fyrsta lidid notad. Thad er
     UPPLYSING UM HVER HANN ER, ekki um hvernig honum gekk — sama slaka
     og ADP-listinn sjalfur veitir. */
  const teamOf = [];
  for (let w = 0; w <= MAXW; w++) teamOf.push(new Array(N).fill(null));
  for (let i = 0; i < N; i++) {
    const ws = [...P[i].teamAt.keys()].sort((a, b) => a - b);
    const first = P[i].teamAt.get(ws[0]);
    let cur = first;
    for (let w = 1; w <= MAXW; w++) {
      teamOf[w][i] = cur;
      if (P[i].teamAt.has(w)) cur = P[i].teamAt.get(w);
    }
  }

  /* --- forgildi --- */
  const prior = new Float64Array(N);
  const priorFrom = new Array(N).fill("rookieFloor");
  const adp = new Float64Array(N).fill(NaN);
  for (let i = 0; i < N; i++) {
    const f = featIdx.get(`${y}|${P[i].id}|${fmt}`);
    if (f && f.proj != null) {
      prior[i] = f.proj / gamesInSeason(y);
      priorFrom[i] = "projection";
    } else if (prevPts.has(P[i].id)) {
      prior[i] = prevPts.get(P[i].id) / 17;
      priorFrom[i] = "prevSeason";
    } else {
      prior[i] = rookieFloor[P[i].pos] || 0;
    }
    if (f && f.adp != null) adp[i] = f.adp;
  }

  /* --- leikjaskra: aud vika og vaent stigaskor --- */
  const teamWeek = new Map();            // `${team}|${w}` -> { opp, implied }
  const teamGames = new Map();           // team -> Set(w)
  for (const g of sched) {
    if (g.season !== y || g.type !== "REG") continue;
    const it = impliedTeamTotals(g.total, g.spread);
    teamWeek.set(`${g.home}|${g.week}`, { opp: g.away, implied: it.home });
    teamWeek.set(`${g.away}|${g.week}`, { opp: g.home, implied: it.away });
    for (const t of [g.home, g.away]) {
      if (!teamGames.has(t)) teamGames.set(t, new Set());
      teamGames.get(t).add(g.week);
    }
  }

  return { y, fmt, N, P, idx, posIdx, act, playedWeek, teamOf, prior, priorFrom,
           adp, teamWeek, teamGames,
           priorSource: prev ? "prevSeason+projection" : "projection only (engin fyrri vikugogn)" };
}

/**
 * ALLT SEM ER REIKNAD FYRIR VIKU w NOTAR EINGONGU VIKUR < w.
 * Thad er ekki varfaerni heldur forsenda: spa sem hefur sed vikuna er
 * ekki spa. `ppgEst` er hrist forgildi (KPRIOR leikir) og teljarinn er
 * LEIKIR LIDSINS, ekki leikir sem hann spiladi — annars vaeri madur sem
 * sat tvaer vikur jafn verdmaetur og sa sem spiladi thaer.
 */
function buildEstimates(pool, kPrior = KPRIOR) {
  const { N, P, act, teamOf, prior, teamWeek, teamGames } = pool;
  const est = { ppg: [], season: [], ros: [], week: [], bye: [], gamesLeft: [] };

  /* vorn gegn stodu, GANGANDI. Semantics eins og `defense.json`:
     `adj` = stig sem vornin gefur theirri stodu per leik. */
  const allowed = new Map();             // `${team}|${pos}` -> summa
  const defGames = new Map();            // team -> leikir
  const posTotal = new Float64Array(POSES.length);
  const posGames = new Float64Array(POSES.length);

  const ptsSoFar = new Float64Array(N);
  const teamPlayed = new Map();          // team -> leikir spiladir

  for (let w = 1; w <= WEEKS; w++) {
    /* --- def og ppg ur vikum < w (thaer eru thegar komnar inn) --- */
    const leagueMean = {};
    for (let pi = 0; pi < POSES.length; pi++) {
      leagueMean[POSES[pi]] = posGames[pi] >= 2 ? posTotal[pi] / posGames[pi] : null;
    }

    const ppg = new Float64Array(N);
    const gl = new Float64Array(N);
    const seasonEst = new Float64Array(N);
    const rosEst = new Float64Array(N);
    const weekEst = new Float64Array(N);
    const bye = new Uint8Array(N);

    for (let i = 0; i < N; i++) {
      const team = teamOf[w][i];
      const gp = (teamPlayed.get(team) || 0);
      ppg[i] = (kPrior * prior[i] + ptsSoFar[i]) / (kPrior + gp);
      /* leikir sem eftir eru: w..WEEKS hja HANS lidi */
      let left = 0;
      const gs = teamGames.get(team);
      if (gs) for (let x = w; x <= WEEKS; x++) if (gs.has(x)) left++;
      gl[i] = left;
      seasonEst[i] = ptsSoFar[i] + ppg[i] * left;
      rosEst[i] = ppg[i] * left;

      const tw = teamWeek.get(`${team}|${w}`);
      bye[i] = tw ? 0 : 1;
      const pos = POSES[pool.posIdx[i]];
      let def = null;
      if (tw && leagueMean[pos] != null) {
        const key = `${tw.opp}|${pos}`;
        const g = defGames.get(tw.opp) || 0;
        if (g >= 2 && allowed.has(key)) {
          def = { adj: allowed.get(key) / g, leagueMean: leagueMean[pos] };
        }
      }
      const wp = weeklyProjection({ base: ppg[i], pos, implied: tw ? tw.implied : null,
                                    def, avail: 1, bye: !tw });
      weekEst[i] = wp.pts == null ? 0 : wp.pts;
    }

    est.ppg[w] = ppg; est.season[w] = seasonEst; est.ros[w] = rosEst;
    est.week[w] = weekEst; est.bye[w] = bye; est.gamesLeft[w] = gl;

    /* --- NAESTA ITRUN MA SJA VIKU w, ENGIN ADUR. Allt sem er lagt vid
           her er notad fyrst i viku w+1. 0 stig i leik lidsins ER
           upplysing (hann sat eda var meiddur) og telur thvi i teljarann;
           aud vika telur EKKI, thvi thar var engum leik ad missa. --- */
    for (let i = 0; i < N; i++) {
      if (pool.playedWeek[w][i]) ptsSoFar[i] += act[w][i];
    }
    let teamsPlaying = 0;
    for (const [t, ws] of teamGames) {
      if (!ws.has(w)) continue;
      teamsPlaying++;
      teamPlayed.set(t, (teamPlayed.get(t) || 0) + 1);
      defGames.set(t, (defGames.get(t) || 0) + 1);
    }
    for (let i = 0; i < N; i++) {
      const tw = teamWeek.get(`${teamOf[w][i]}|${w}`);
      if (!tw || !pool.playedWeek[w][i]) continue;
      const pi = pool.posIdx[i];
      const key = `${tw.opp}|${POSES[pi]}`;
      allowed.set(key, (allowed.get(key) || 0) + act[w][i]);
      posTotal[pi] += act[w][i];
    }
    for (let pi = 0; pi < POSES.length; pi++) posGames[pi] += teamsPlaying;
  }
  return est;
}

/* Laugin og matin eru OHAAD logun, svo thau eru byggd EINU SINNI per
   (timabil x snid). Fyrsta utgafan byggdi thau upp a nytt fyrir hverja
   logun OG i hverri bootstrap-itrun; nylida-golfid eitt las tha ollar
   vikuskrarnar 1.680 sinnum. `WeakMap` er notad fyrir matin svo
   ENDURSYNDUD laug (nytt hlutur) fai ny mat en aldri gomul. */
const POOL_MEMO = new Map();
const EST_MEMO = new WeakMap();
function poolOf(y, ctxIn, fmt) {
  const k = `${y}|${fmt}`;
  if (!POOL_MEMO.has(k)) POOL_MEMO.set(k, buildPool(y, ctxIn, fmt));
  return POOL_MEMO.get(k);
}
function estOf(pool, k = KPRIOR) {
  let byK = EST_MEMO.get(pool);
  if (!byK) { byK = new Map(); EST_MEMO.set(pool, byK); }
  if (!byK.has(k)) byK.set(k, buildEstimates(pool, k));
  return byK.get(k);
}

/* ============================================================
   4. GJALDMIDLA-KORTIN
   ============================================================
   Eitt Float64Array per (gjaldmidill x viku) og eitt radad Int32Array
   med thvi. Baedi eru OHAAD keyrslunni — thau eru byggd EINU SINNI per
   (logun x snid x timabil) og oll afbrigdi lesa thau somu. Thad er thad
   sem gerir 60.000 deildar-keyrslur ódyrar.                            */
function buildCurrencies(pool, est, shape, seed) {
  const { N, P, posIdx, act } = pool;
  const league = shape.league;
  const val = {}, ord = {};

  const mk = () => { const a = []; for (let w = 0; w <= WEEKS; w++) a.push(null); return a; };
  for (const k of ["seasonVbd", "rosVbd", "weekVbd", "weekRaw",
                   ...PLACEBOS.map((p) => p.key), "or_week", "or_ros"]) {
    val[k] = mk(); ord[k] = mk();
  }

  /* VBD ER REIKNAD MED `computeVbd` UR model.js, ekki afriti. Thad er
     thad sem faerir "300 stig fra QB" og "300 fra RB" a sama kvarda —
     og varamanns-threpid fyrir ROS er reiknad UPP A NYTT ur ROS-spanni,
     sem er nakvaemlega thad sem spurningin snyst um. */
  const vbdOf = (projArr) => {
    const list = new Array(N);
    for (let i = 0; i < N; i++) list[i] = { i, pos: P[i].pos, proj: projArr[i] };
    const out = computeVbd(list, league);
    const a = new Float64Array(N);
    for (const p of out) a[p.i] = p.vbd == null ? NaN : p.vbd;
    return a;
  };

  for (let w = 1; w <= WEEKS; w++) {
    val.seasonVbd[w] = vbdOf(est.season[w]);
    val.rosVbd[w] = vbdOf(est.ros[w]);
    val.weekVbd[w] = vbdOf(est.week[w]);
    val.weekRaw[w] = est.week[w];

    /* --- THREPUN: sama dreifing, onnur rod --- */
    const base = val.seasonVbd[w];
    const keyed = (keyFn, within) => mapOnto(base, keyFn, within ? posIdx : null, N);
    val.pl_perm[w]     = keyed((i) => hash32(P[i].id, 991 + seed), false);
    val.pl_permPos[w]  = keyed((i) => hash32(P[i].id, 1777 + seed), true);
    val.pl_permWeek[w] = keyed((i) => hash32(P[i].id, 3313 + seed + w * 7919), false);
    val.pl_nameLen[w]  = keyed((i) => (P[i].name || "").length * 1e6 + (hash32(P[i].id, 5) % 1e6), false);
    val.pl_alpha[w]    = keyed((i) => -alphaKey(P[i].name || P[i].id), false);
    val.pl_team[w]     = keyed((i) => -alphaKey(pool.teamOf[w][i] || "ZZZ") * 1e3 - (hash32(P[i].id, 7) % 1000), false);
    val.pl_reverse[w]  = keyed((i) => -(Number.isNaN(base[i]) ? 0 : base[i]), false);

    /* --- ORAKEL: efra akkeri. Threpad a somu dreifingu og sa
           gjaldmidill sem thad er beint upp a, svo golfid haldi. --- */
    val.or_week[w] = mapOnto(val.weekVbd[w], (i) => act[w][i], null, N);
    const rosAct = new Float64Array(N);
    for (let x = w; x <= WEEKS; x++) for (let i = 0; i < N; i++) rosAct[i] += act[x][i];
    val.or_ros[w] = mapOnto(val.rosVbd[w], (i) => rosAct[i], null, N);

    for (const k of Object.keys(val)) ord[k][w] = orderOf(val[k][w], N);
  }
  return { val, ord };
}

const alphaKey = (s) => {
  let k = 0;
  for (let i = 0; i < 6; i++) k = k * 40 + ((s.charCodeAt(i) || 0) % 40);
  return k;
};

/**
 * THREPUN. Ny rod (eftir `keyFn`, haerra = fyrr) faer NAKVAEMLEGA sama
 * gildasafn og `base`. Thess vegna er `minGain = 10` sama krafan i
 * placebo-frumu og i raunfrumu — annars vaeri placebo-thakid maeling a
 * kvardanum og ekki a havadanum.
 */
function mapOnto(base, keyFn, groupBy, N) {
  const out = new Float64Array(N).fill(NaN);
  const groups = new Map();
  for (let i = 0; i < N; i++) {
    if (Number.isNaN(base[i])) continue;
    const g = groupBy ? groupBy[i] : 0;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(i);
  }
  for (const list of groups.values()) {
    const vals = list.map((i) => base[i]).sort((a, b) => b - a);
    const byKey = list.slice().sort((a, b) => (keyFn(b) - keyFn(a)) || (a - b));
    for (let k = 0; k < byKey.length; k++) out[byKey[k]] = vals[k];
  }
  return out;
}

function orderOf(vals, N) {
  const idxs = [];
  for (let i = 0; i < N; i++) if (!Number.isNaN(vals[i])) idxs.push(i);
  idxs.sort((a, b) => (vals[b] - vals[a]) || (a - b));
  return Int32Array.from(idxs);
}

/* ============================================================
   5. DRAFTID — UPPHAFS-HOPARNIR
   ============================================================
   `simulateDraft` UR accuracy.js. Thad er kallad einu sinni per saeti;
   thar sem `board === fieldBoard` er draftid NAKVAEMLEGA hid sama i
   ollum kollunum og hver kall skilar sinum hop. Thess vegna er thetta
   ekki afrit af draft-rokfraedinni heldur notkun a henni.

   ADP-SKRAIN NAER EKKI YFIR ALLT DRAFTID og thad verdur ad segjast:
   `features.json` ber 145-204 leikmenn per timabili en 12x14 draft
   tharf 168. Halinn er thvi radadur eftir FORGILDINU (gangandi, engin
   framtid). An hans myndi draftid KLARAST og munurinn sem maelist vaeri
   maeling a tomri laug.                                                */
function draftRosters(pool, shape, seed) {
  const { N, P, adp, prior } = pool;
  const rnd = rngOf(seed * 7919 + pool.y * 13 + 17);
  const scored = [];
  const noise = () => (rnd() + rnd() + rnd() - 1.5) * 8;
  const maxAdp = Math.max(...[...adp].filter((v) => !Number.isNaN(v)), 0);
  for (let i = 0; i < N; i++) {
    /* Halinn liggur ALLUR eftir ADP-lauginni (bilid 50 er staerra en
       hávaðinn), og innan hans radar forgildid. Vaeri bilid minna gaeti
       omaeldur maður stokkid fram fyrir mann med raunverulega ADP. */
    const a = Number.isNaN(adp[i])
      ? maxAdp + 50 + (30 - Math.min(30, Math.max(0, prior[i]))) * 5
      : adp[i];
    scored.push([i, a + noise()]);
  }
  scored.sort((a, b) => a[1] - b[1]);
  const board = new Map(scored.map(([i], r) => [String(i), r + 1]));
  const actual = new Map(scored.map(([i]) => [String(i), { pos: P[i].pos, pts: 0 }]));

  const out = [];
  for (let slot = 1; slot <= shape.league.teams; slot++) {
    const r = simulateDraft({ board, fieldBoard: board, actual, slot,
                              league: shape.league });
    out.push(r.roster.map(Number));
  }
  return out;
}

/* ============================================================
   6. AKVORDUNIN — HRAD BRAUT SEM ER SANNREYND GEGN `pickupAdvice`
   ============================================================
   `pickupAdvice` byggir `why`-strengi fyrir HVERJA rod yfir golfinu.
   Vid golf 0 eru thad hundrud strengja per lidi per viku, sem er
   hundrudum thusunda deildar-keyrslna ofviða (talan er skrad sem
   `design.leagueRuns` i utkomunni). Thess vegna er hrad braut hér — OG
   HUN ER GATUD: `checkEquivalence` ber hana vid `pickupAdvice` a
   sompludum lids-vikum og skriftan DEYR vid fyrsta mun. Hrad braut an
   theirrar hlids vaeri afrit af rokfraedinni, sem er nakvaemlega thad
   sem thetta repo bannar.

   Rokin fyrir thvi ad hun se jafngild: `cheapestDrop` er hað ADEINS
   stodu thess sem kemur inn (gegnum `allowedSwap`), svo fyrir hverja
   stodu er drop-id fast. Abatinn er tha einraen i gildi thess sem
   kemur inn, svo BESTI add per stodu er sa hæsti — fjorir kandidatar,
   ekki 400. Jafntefli brotna eins og i `pickupAdvice`: abati, sidan
   gildi thess sem kemur inn, sidan laugarrod (stodug rodun).           */
function decide(valArr, order, rostered, roster, posIdx, floor, needFixed) {
  /* stodutalning a OLLUM hopnum (K/DST eru ekki i lauginni her, en
     reglan er sama og i appinu) */
  const before = new Int32Array(POSES.length);
  for (const i of roster) before[posIdx[i]]++;

  const drops = roster.filter((i) => !Number.isNaN(valArr[i]))
    .sort((a, b) => valArr[a] - valArr[b]);
  if (!drops.length) return null;

  /* odyrasti LEYFILEGI drop per stodu thess sem kemur inn */
  const dropFor = new Int32Array(POSES.length).fill(-1);
  for (let ap = 0; ap < POSES.length; ap++) {
    for (const d of drops) {
      const dp = posIdx[d];
      let ok = true;
      for (let p = 0; p < POSES.length; p++) {
        const need = needFixed[POSES[p]] || 0;
        if (!need) continue;
        const keep = Math.min(need, before[p]);
        const after = before[p] - (p === dp ? 1 : 0) + (p === ap ? 1 : 0);
        if (after < keep) { ok = false; break; }
      }
      if (ok) { dropFor[ap] = d; break; }
    }
  }

  /* besti lausi madur per stodu — laugin er thegar rodud */
  let found = 0;
  const bestAdd = new Int32Array(POSES.length).fill(-1);
  for (let k = 0; k < order.length && found < POSES.length; k++) {
    const i = order[k];
    if (rostered[i]) continue;
    const p = posIdx[i];
    if (bestAdd[p] === -1) { bestAdd[p] = i; found++; }
  }

  let best = null;
  for (let k = 0; k < order.length; k++) {          // laugarrod = jafnteflisrof
    const i = order[k];
    const p = posIdx[i];
    if (bestAdd[p] !== i) continue;
    const d = dropFor[p];
    if (d === -1) continue;
    const gain = Math.round((valArr[i] - valArr[d]) * 10) / 10;
    if (!(gain >= floor)) continue;
    if (!best || gain > best.gain ||
        (gain === best.gain && valArr[i] > valArr[best.add])) {
      best = { add: i, drop: d, gain };
    }
  }
  return best;
}

const floorAt = (rule, w) => (rule.scale === "abs" ? rule.floor
  : rule.scale === "week" ? rule.floor / WEEKS
  : rule.floor * (WEEKS - w + 1) / WEEKS);

/* ============================================================
   7. EIN DEILD, 13 VIKUR
   ============================================================ */
let LEAGUE_RUNS = 0;

function runLeague(ctx, { treat, ctrl, field, treatSeat, ctrlSeat, seedIdx,
                         priority = "rotate" }) {
  LEAGUE_RUNS++;
  const { pool, shape, cur, est, slots, needFixed, rosters0 } = ctx;
  const teams = shape.league.teams;
  const N = pool.N;
  const rosters = rosters0.map((r) => r.slice());
  const rostered = new Uint8Array(N);
  for (const r of rosters) for (const i of r) rostered[i] = 1;

  const wkTreat = [], wkCtrl = [];
  let swapsT = 0, swapsC = 0, noSwapT = 0, addOk = 0, addBad = 0;
  const totals = new Float64Array(teams + 1);      // adeins fyrir `reverse`

  for (let w = 1; w <= WEEKS; w++) {
    /* WAIVER-ROD ER SNUNINGUR, EKKI ANDHVERF STADA. Andhverf stada
       gefur LAKARA lidi fyrsta val, svo forgangur yrdi fylginn thvi sem
       er verid ad maela og medferdin fengi kerfisbundid annad val.
       `reverse` er samt maelt i naemniskaflanum — akvordun sem er tekin
       af reiknilegum aestaedum og ekki maeld er agiskun.                */
    let order = null;
    if (priority === "reverse") {
      order = [];
      for (let s = 1; s <= teams; s++) order.push(s);
      order.sort((a, b) => (totals[a] - totals[b]) || (a - b));
    }
    if (w >= 2) {
      for (let s = 0; s < teams; s++) {
        const seat = order ? order[s] : ((w + seedIdx + s) % teams) + 1;
        const rule = seat === treatSeat ? treat : seat === ctrlSeat ? ctrl : field;
        if (!rule) continue;
        const roster = rosters[seat - 1];
        const d = decide(cur.val[rule.cur][w], cur.ord[rule.cur][w], rostered,
                         roster, pool.posIdx, floorAt(rule, w), needFixed);
        if (!d) { if (seat === treatSeat) noSwapT++; continue; }
        roster[roster.indexOf(d.drop)] = d.add;
        rostered[d.drop] = 0; rostered[d.add] = 1;
        if (seat === treatSeat) {
          swapsT++;
          /* VAR SKIPTID RETT EFTIR A? Stig thess sem kom inn a moti
             theim sem for ut, YFIR THAER VIKUR SEM EFTIR ERU. */
          let a = 0, b = 0;
          for (let x = w; x <= WEEKS; x++) { a += pool.act[x][d.add]; b += pool.act[x][d.drop]; }
          if (a > b) addOk++; else addBad++;
        }
        if (seat === ctrlSeat) swapsC++;
      }
    }
    /* Adeins medferdin og vidmidid eru skorud — hin saetin thurfa ekki
       stig nema forgangurinn se andhverf stada. Thad sparar 5/6 af
       uppstillingar-vinnunni og breytir engri tolu. */
    if (priority === "reverse") {
      for (let s = 1; s <= teams; s++) totals[s] += scoreSeat(ctx, rosters[s - 1], w);
      wkTreat.push(scoreSeat(ctx, rosters[treatSeat - 1], w));
      wkCtrl.push(scoreSeat(ctx, rosters[ctrlSeat - 1], w));
    } else {
      wkTreat.push(scoreSeat(ctx, rosters[treatSeat - 1], w));
      wkCtrl.push(scoreSeat(ctx, rosters[ctrlSeat - 1], w));
    }
  }
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  let h2hW = 0, h2hL = 0, h2hT = 0;
  for (let i = 0; i < wkTreat.length; i++) {
    if (wkTreat[i] > wkCtrl[i]) h2hW++; else if (wkTreat[i] < wkCtrl[i]) h2hL++; else h2hT++;
  }
  return { treat: sum(wkTreat), ctrl: sum(wkCtrl), swapsT, swapsC, noSwapT,
           addOk, addBad, h2hW, h2hL, h2hT };
}

/**
 * STIG BYRJUNARLIDS — MAELIKVARDINN. Uppstillingin er akvedin med
 * `optimalLineup` UR lineup.js a VIKUSPA (vikur < w) og skorud a
 * RAUNSTIGUM. Hun er su SAMA fyrir oll afbrigdi; adeins hopurinn er
 * olikur. Annars vaeri thetta maeling a uppstillingar-reglu.
 */
function scoreSeat(ctx, roster, w) {
  const { pool, est, slots } = ctx;
  const players = new Array(roster.length);
  for (let k = 0; k < roster.length; k++) {
    const i = roster[k];
    players[k] = { id: i, pos: pool.P[i].pos, proj: est.week[w][i],
                   avail: 1, bye: !!est.bye[w][i] };
  }
  const lu = optimalLineup(players, slots);
  let pts = 0;
  for (const s of lu.starters) if (s.player) pts += pool.act[w][s.player.id];
  return pts;
}

/* ============================================================
   8. JAFNGILDISHLIDIN — HRAD BRAUT GEGN `pickupAdvice`/`freeAgents`
   ============================================================ */
function checkEquivalence(ctx, samples, seed) {
  const { pool, shape, cur, needFixed } = ctx;
  const rnd = rngOf(seed);
  const teams = shape.league.teams;
  let checked = 0, mismatch = null;
  const rowsOf = (idxs, valArr) => idxs.map((i) => ({
    id: String(i), name: pool.P[i].name, pos: pool.P[i].pos,
    vbd: Number.isNaN(valArr[i]) ? null : valArr[i], avail: 1,
  }));

  for (let s = 0; s < samples && !mismatch; s++) {
    const w = 1 + Math.floor(rnd() * WEEKS);
    const curKey = ["seasonVbd", "rosVbd", "weekVbd"][Math.floor(rnd() * 3)];
    const floor = FLOORS[Math.floor(rnd() * FLOORS.length)];
    const rosters = draftRosters(pool, shape, 1 + Math.floor(rnd() * 5));
    const seat = Math.floor(rnd() * teams);
    const rostered = new Uint8Array(pool.N);
    for (const r of rosters) for (const i of r) rostered[i] = 1;

    const valArr = cur.val[curKey][w], order = cur.ord[curKey][w];
    const fast = decide(valArr, order, rostered, rosters[seat], pool.posIdx,
                        floor, needFixed);

    /* SAMA SPURNING GEGNUM APPID SJALFT. `freeAgents` faer Sleeper-laga
       hopa og `pickupAdvice` faer laugina ur henni — thad er nakvaemlega
       thad sem vidmotid gerir. */
    const allRows = rowsOf([...Array(pool.N).keys()], valArr);
    const fa = freeAgents({
      rows: allRows,
      rosters: rosters.map((r, k) => ({ roster_id: k + 1, players: r.map(String) })),
      myRosterId: seat + 1,
    });
    const adv = pickupAdvice({ pool: fa.pool, mine: fa.mine, league: shape.league,
                               minGain: floor });
    const slow = adv.length ? { add: Number(adv[0].add.id), drop: Number(adv[0].drop.id),
                                gain: adv[0].gain } : null;
    /* Laugin sjalf verdur lika ad vera su sama — annars gaeti hrad
       brautin verid ad velja ur odru mengi og haft "rett" fyrir slysni. */
    const poolIds = new Set(fa.pool.map((r) => Number(r.id)));
    let poolSame = poolIds.size === order.filter((i) => !rostered[i]).length;
    if (poolSame) for (const i of order) {
      if (!rostered[i] && !poolIds.has(i)) { poolSame = false; break; }
    }

    if (!poolSame) mismatch = { kind: "pool", w, curKey, floor };
    else if (!fast !== !slow) mismatch = { kind: "presence", w, curKey, floor,
      fast: fast && fast.add, slow: slow && slow.add };
    else if (fast && slow && (fast.add !== slow.add || fast.drop !== slow.drop ||
             Math.abs(fast.gain - slow.gain) > 1e-9)) {
      mismatch = { kind: "choice", w, curKey, floor, fast, slow };
    }
    checked++;
  }
  return { checked, mismatch };
}

/* ============================================================
   9. GRINDIN
   ============================================================ */
async function main() {
  const t0 = Date.now();
  const { weekly, seasons, feats, games } = await loadInputs();
  const ys = seasons.filter((y) => y >= FROM);
  requireSeasons(ys, "timabil med vikugognum (data/weekly/*.json)");
  if (ys.length < 5) {
    console.error(`\n  Adeins ${ys.length} timabil — of fatt fyrir pardan t. Skrifa EKKERT.\n`);
    process.exit(2);
  }

  /* features -> { season|id|fmt } -> { proj, adp }. `half` er reiknud
     ur ppr og standard (algebra, sja half-lab); half-ADP er EKKI til
     sogulega, svo ppr-ADP er notud og thad er SAGT. */
  const featIdx = new Map();
  const byKey = { ppr: new Map(), standard: new Map() };
  for (const r of feats.rows) if (byKey[r.scoring]) byKey[r.scoring].set(`${r.season}|${r.id}`, r);
  for (const [k, a] of byKey.ppr) {
    const b = byKey.standard.get(k);
    const pj = a.sleeperProj != null ? a.sleeperProj : a.ffProj;
    const sj = b ? (b.sleeperProj != null ? b.sleeperProj : b.ffProj) : null;
    featIdx.set(`${k}|ppr`, { proj: pj, adp: a.adp });
    if (b) featIdx.set(`${k}|standard`, { proj: sj, adp: b.adp });
    featIdx.set(`${k}|half`, { proj: pj != null && sj != null ? (pj + sj) / 2 : pj, adp: a.adp });
  }
  for (const [k, b] of byKey.standard) {
    if (!featIdx.has(`${k}|standard`)) {
      featIdx.set(`${k}|standard`,
        { proj: b.sleeperProj != null ? b.sleeperProj : b.ffProj, adp: b.adp });
    }
  }

  const ctxIn = { weekly, featIdx, sched: games };
  console.log(`waiver-lab · ${ys.length} timabil (${ys[0]}-${ys[ys.length - 1]}) · ` +
    `${WEEKS} vikur · ${RUNS} draft-fraekorn · golf ${FLOORS.join("/")}`);

  /* --- reglusafnid --- */
  const rules = [];
  for (const c of CURRENCIES) for (const f of FLOORS) {
    rules.push({ key: `${c.key}@${f}`, family: c.key, kind: "signal", label: c.label,
                 cur: c.cur, scale: c.scale, floor: f });
  }
  for (const p of PLACEBOS) for (const f of FLOORS) {
    rules.push({ key: `${p.key}@${f}`, family: p.key, kind: "placebo", label: p.label,
                 cur: p.key, scale: "abs", floor: f });
  }
  for (const o of ORACLES) for (const f of [0, 5, 10]) {
    rules.push({ key: `${o.key}@${f}`, family: o.key, kind: "oracle", label: o.label,
                 cur: o.cur, scale: o.scale, floor: f });
  }
  /* Reglur x vidirnir: `idle` og `greedy` adeins fyrir raunverulega
     gjaldmidla — placebo-thakid er throskuldur INNAN sama vids. */
  const cells = {};          // `${shape}|${fmt}|${field}|${rule}` -> { per, swaps ... }
  const acc = (key) => (cells[key] = cells[key] || { per: {}, swapsT: [], swapsC: [],
    noSwap: [], addOk: 0, addBad: 0, h2h: [0, 0, 0], runs: 0 });

  const selfTest = { mirror: null, equivalence: null };
  let mirrorWorst = 0, mirrorChecks = 0;

  /* ============================================================
     KEYRSLAN. Rodin er logun -> snid -> timabil svo gjaldmidla-kortin
     seu byggd EINU SINNI per frumu og oll afbrigdi lesi thau somu.     */
  for (const shape of SHAPES) {
    const slots = slotsFor(shape.league);
    const needFixed = {};
    for (const s of slots) if (s.pos.length === 1) needFixed[s.pos[0]] = (needFixed[s.pos[0]] || 0) + 1;

    for (const fmt of FORMATS) {
      for (const y of ys) {
        const pool = poolOf(y, ctxIn, fmt);
        const est = estOf(pool);
        const cur = buildCurrencies(pool, est, shape, 1);
        const ctxBase = { pool, shape, cur, est, slots, needFixed };

        /* --- jafngildishlidin: EITT skipti per snid/logun, a fyrsta ari --- */
        if (y === ys[0]) {
          const eq = checkEquivalence({ ...ctxBase, rosters0: null }, 40, 4242 + shape.key.length);
          if (eq.mismatch) {
            console.error(`\n  JAFNGILDI FELL (${shape.key}/${fmt}): ` +
              JSON.stringify(eq.mismatch) + "\n  Hrad brautin er EKKI `pickupAdvice`. Skrifa EKKERT.\n");
            process.exit(3);
          }
          selfTest.equivalence = { checked: (selfTest.equivalence?.checked || 0) + eq.checked };
        }

        const drafts = [];
        for (let r = 0; r < RUNS; r++) drafts.push(draftRosters(pool, shape, r + 1));
        for (const d of drafts) for (const r of d) {
          if (r.length !== shape.league.rounds) {
            console.error(`\n  Hopur af lengd ${r.length}, atti ad vera ` +
              `${shape.league.rounds} — laugin klaradist i draftinu. Skrifa EKKERT.\n`);
            process.exit(4);
          }
        }

        for (const [fieldKey, fieldRule] of Object.entries(FIELD_MODES)) {
          for (const rule of rules) {
            if (fieldKey !== "active" && rule.kind !== "signal") continue;
            const key = `${shape.key}|${fmt}|${fieldKey}|${rule.key}`;
            const A = acc(key);
            const ds = [];
            for (let r = 0; r < RUNS; r++) {
              const a = (r % shape.league.teams) + 1;
              const b = (a % shape.league.teams) + 1;
              for (const flip of [0, 1]) {
                const out = runLeague({ ...ctxBase, rosters0: drafts[r] }, {
                  treat: rule, ctrl: null, field: fieldRule,
                  treatSeat: flip ? b : a, ctrlSeat: flip ? a : b, seedIdx: r,
                });
                ds.push(out.treat - out.ctrl);
                A.swapsT.push(out.swapsT); A.swapsC.push(out.swapsC);
                A.noSwap.push(out.noSwapT);
                A.addOk += out.addOk; A.addBad += out.addBad;
                A.h2h[0] += out.h2hW; A.h2h[1] += out.h2hL; A.h2h[2] += out.h2hT;
                A.runs++;
              }
            }
            A.per[y] = r1(mean(ds));
          }

          /* --- NULLTILGATAN SEM SJALFSPROF: regla gegn SJALFRI SER.
                 Speglud fruma verdur ad gefa NAKVAEMLEGA 0. Fellur hun
                 er hermunin osamhverf (saetis-skekkja, forgangur eda
                 fraekorn sem les rullu) og hver tala her er onyt.       */
          if (fieldKey === "active" && y === ys[0]) {
            const R = rules.find((x) => x.key === `seasonVbd@${MARKET.floor}`);
            let sum = 0;
            for (let r = 0; r < RUNS; r++) {
              const a = (r % shape.league.teams) + 1;
              const b = (a % shape.league.teams) + 1;
              for (const flip of [0, 1]) {
                const out = runLeague({ ...ctxBase, rosters0: drafts[r] }, {
                  treat: R, ctrl: R, field: fieldRule,
                  treatSeat: flip ? b : a, ctrlSeat: flip ? a : b, seedIdx: r,
                });
                sum += out.treat - out.ctrl;
              }
              mirrorChecks++;
            }
            mirrorWorst = Math.max(mirrorWorst, Math.abs(sum));
          }
        }
        process.stdout.write(".");
      }
      process.stdout.write(`[${shape.key}/${fmt}] `);
    }
  }
  console.log("");

  selfTest.mirror = { checks: mirrorChecks, maxAbs: r3(mirrorWorst),
    passed: mirrorWorst < 1e-9,
    note: "the same rule at both seats, mirrored, must cancel to exactly zero; " +
          "a non-zero value means the harness itself favours a seat" };
  console.log(`sjalfsprof (regla gegn sjalfri ser, speglad): staersta |munur| = ` +
    `${selfTest.mirror.maxAbs} -> ${selfTest.mirror.passed ? "HLUTLAUS" : "OSAMHVERF"}`);
  if (!selfTest.mirror.passed) {
    console.error("\n  Speglud fruma gaf EKKI null. Hermunin er osamhverf; skrifa EKKERT.\n");
    process.exit(5);
  }
  console.log(`jafngildi: ${selfTest.equivalence.checked} lids-vikur bornar vid ` +
    `pickupAdvice/freeAgents — engin frávik`);

  /* ============================================================
     10. TOLFRAEDIN
     ============================================================ */
  for (const [key, A] of Object.entries(cells)) {
    const vals = ys.map((y) => A.per[y]).filter((x) => x != null);
    A.mean = r1(mean(vals));
    A.t = tOf(vals);
    A.years = vals.length;
    A.wins = vals.filter((x) => x > 0).length;
    A.n = A.runs;
    const zero = Object.fromEntries(ys.map((y) => [y, 0]));
    const bs = bootstrapDiff(A.per, zero, 2000, 4242);
    A.ci = { season: bs ? { lo: r1(bs.lo), hi: r1(bs.hi), excludesZero: bs.excludesZero } : null,
             player: null };
    A.swapsPerSeason = r1(mean(A.swapsT));
    A.noSwapShare = r3(mean(A.noSwap) / (WEEKS - 1));
    A.addHitRate = A.addOk + A.addBad ? r3(A.addOk / (A.addOk + A.addBad)) : null;
    A.h2hShare = r3(A.h2h[0] / Math.max(1, A.h2h[0] + A.h2h[1] + A.h2h[2]));
    delete A.swapsT; delete A.swapsC; delete A.noSwap;
  }

  /* ============================================================
     PLACEBO-THAKID — OG TVAER OLIKAR SPURNINGAR SEM THAD SVARAR
     ============================================================
     (a) HAEDIN: hversu hatt komst havadinn? Her er svarid AFGERANDI
         NEGATIFT, og thad er sjalfstaed nidurstada: hávaða-regla sem
         skiptir 13 sinnum kostar 150-300 stig. Vidirnir eru ekki fríir.
         Throskuldurinn er thvi auðveldlega slegin og segir litid.
     (b) GOLFID: hversu mikid getur EIN OG SAMA regla hoppad milli
         golf-gilda AF TILVILJUN? Thad er nakvaemlega spurningin um
         `minGain`, og svarid er `floorSpread` — staersta bil (haest -
         laegst yfir 7 golf) sem havadi naer innan sinnar eigin raðar.
         Raunverulegur gjaldmidill sem hoppar MINNA en thad hefur ekki
         maelanlegt golf, hvad sem "besta" gildid maelist.               */
  const placeboCeil = {};
  for (const shape of SHAPES) for (const fmt of FORMATS) {
    const ks = Object.keys(cells).filter((k) => k.startsWith(`${shape.key}|${fmt}|active|pl_`));
    const pos = ks.map((k) => ({ k, m: cells[k].mean, t: cells[k].t }))
      .filter((x) => x.m != null && !x.k.includes("pl_reverse"));
    pos.sort((a, b) => b.m - a.m);
    const worst = ks.map((k) => cells[k].mean).filter((x) => x != null);
    let spread = 0, spreadRule = null;
    for (const p of PLACEBOS) {
      const ms = FLOORS.map((f) => cells[`${shape.key}|${fmt}|active|${p.key}@${f}`])
        .filter(Boolean).map((A) => A.mean).filter((x) => x != null);
      if (ms.length < 2) continue;
      const s = Math.max(...ms) - Math.min(...ms);
      if (s > spread) { spread = s; spreadRule = p.key; }
    }
    placeboCeil[`${shape.key}|${fmt}`] = {
      ceiling: pos.length ? pos[0].m : null,
      ceilingRule: pos.length ? pos[0].k.split("|").pop() : null,
      ceilingT: pos.length ? pos[0].t : null,
      lowerAnchor: worst.length ? r1(Math.min(...worst)) : null,
      floorSpread: r1(spread), floorSpreadRule: spreadRule,
      cells: ks.length,
      note: "ceiling = the best cell any noise rule reached (a level threshold). " +
            "floorSpread = the widest range a single noise rule covered across the " +
            "seven floors, which is the threshold that matters for minGain: a real " +
            "currency whose floor grid moves less than that has no measurable floor. " +
            "pl_reverse is the anti-signal lower anchor and is out of the ceiling.",
    };
  }

  /* --- WALK-FORWARD VAL A GOLFINU --- */
  const walkForward = {};
  for (const shape of SHAPES) for (const fmt of FORMATS) for (const c of CURRENCIES) {
    const at = (f, y) => {
      const A = cells[`${shape.key}|${fmt}|active|${c.key}@${f}`];
      return A ? A.per[y] : null;
    };
    const choices = {}, got = [];
    for (let k = 2; k < ys.length; k++) {           // >=2 fyrri ar adur en valid
      const y = ys[k], hist = ys.slice(0, k);
      let bestF = null, bestV = -Infinity;
      for (const f of FLOORS) {
        const v = mean(hist.map((h) => at(f, h)).filter((x) => x != null));
        if (Number.isFinite(v) && v > bestV) { bestV = v; bestF = f; }
      }
      choices[y] = bestF;
      const v = at(bestF, y);
      if (v != null) got.push(v);
    }
    const full = FLOORS.map((f) => ({ f, m: mean(ys.map((y) => at(f, y)).filter((x) => x != null)) }))
      .sort((a, b) => b.m - a.m);
    /* ============================================================
       BER GOLFID SIG GEGN NULL-GOLFI? THAD ER SPURNINGIN SJALF.
       ============================================================
       "Besta golf" ur ollum arunum er VALID A SOMU GOGNUM og er thvi
       skekkt upp — sama gildra og orakel-thakid i `rank-model.mjs` ver
       gegn. Rettu prófin eru tvo og badi eru PORUD per timabili (somu
       droft, sama laug, adeins golfid annad):
         · `wfVsZero`   golf valid a FYRRI arum, borid vid golf 0 a
                        HELDU ari. Oskekkt.
         · `bestVsZero` besta golf yfir oll ar gegn golfi 0. SKEKKT UPP
                        og merkt sem slikt — hun er efra mark, ekki mat. */
    const wfZero = [];
    for (const y of Object.keys(choices)) {
      const a = at(choices[y], Number(y)), b = at(0, Number(y));
      if (a != null && b != null) wfZero.push(a - b);
    }
    const perBest = {}, perZero = {}, perMax = {};
    for (const y of ys) {
      perBest[y] = at(full[0].f, y); perZero[y] = at(0, y);
      perMax[y] = at(FLOORS[FLOORS.length - 1], y);
    }
    const bsZero = bootstrapDiff(perBest, perZero, 2000, 777);
    const bsMax = bootstrapDiff(perBest, perMax, 2000, 778);
    walkForward[`${shape.key}|${fmt}|${c.key}`] = {
      choices, bestMinGain: full[0].f, bestMinGainMean: r1(full[0].m),
      byFloor: Object.fromEntries(FLOORS.map((f) => [f,
        r1(mean(ys.map((y) => at(f, y)).filter((x) => x != null)))])),
      floorSpread: r1(Math.max(...full.map((x) => x.m)) - Math.min(...full.map((x) => x.m))),
      mean: r1(mean(got)), t: tOf(got), years: got.length,
      wins: got.filter((x) => x > 0).length,
      stable: r3(Object.values(choices).filter((f) => f === full[0].f).length /
                 Math.max(1, Object.values(choices).length)),
      wfVsZero: { mean: r1(mean(wfZero)), t: tOf(wfZero), years: wfZero.length,
        wins: wfZero.filter((x) => x > 0).length },
      bestVsZero: bsZero ? { mean: r1(bsZero.diff), lo: r1(bsZero.lo), hi: r1(bsZero.hi),
        excludesZero: bsZero.excludesZero, biased: "chosen on the same seasons" } : null,
      bestVsMaxFloor: bsMax ? { mean: r1(bsMax.diff), lo: r1(bsMax.lo), hi: r1(bsMax.hi),
        excludesZero: bsMax.excludesZero } : null,
    };
  }

  /* ============================================================
     HVAD KOSTAR GOLFID? — PORUD, SAMA DRAFT, SAMA LAUG
     ============================================================
     Spurningin "hvert er retta golfid" hefur EKKI sama svar og "kostar
     golfid sem er i loftinu eitthvad". Sidari er pordu profid sem
     notandinn getur brugdist vid: golf 0 gegn golfi 10 og gegn golfi 25
     innan SAMA gjaldmidils, per timabili, med vikmorkum. Se bilid
     ogreinanlegt fra null er golfid ekki tala heldur STILLING — og tha
     ma `minGain` heita varfaerid golf med godri samvisku.               */
  const floorCost = {};
  for (const c of CURRENCIES) {
    const pooled = {};
    for (const shape of SHAPES) for (const fmt of FORMATS) {
      const at = (f) => cells[`${shape.key}|${fmt}|active|${c.key}@${f}`];
      const A0 = at(0), A10 = at(10), A25 = at(25);
      if (!A0 || !A10 || !A25) continue;
      const mk = (X) => bootstrapDiff(A0.per, X.per, 2000, 5150);
      const b10 = mk(A10), b25 = mk(A25);
      floorCost[`${shape.key}|${fmt}|${c.key}`] = {
        zeroMinus10: b10 ? { mean: r1(b10.diff), lo: r1(b10.lo), hi: r1(b10.hi),
          excludesZero: b10.excludesZero } : null,
        zeroMinus25: b25 ? { mean: r1(b25.diff), lo: r1(b25.lo), hi: r1(b25.hi),
          excludesZero: b25.excludesZero } : null,
      };
      for (const y of ys) {
        if (A0.per[y] == null || A10.per[y] == null) continue;
        (pooled[y] = pooled[y] || []).push(A0.per[y] - A10.per[y]);
      }
    }
    const p = Object.fromEntries(Object.entries(pooled).map(([y, a]) => [y, r1(mean(a))]));
    const bs = bootstrapDiff(p, Object.fromEntries(Object.keys(p).map((y) => [y, 0])), 2000, 5151);
    const vals = Object.values(p);
    floorCost[`pooled|${c.key}`] = { per: p, mean: r1(mean(vals)), t: tOf(vals),
      years: vals.length, wins: vals.filter((x) => x > 0).length,
      ci: bs ? { lo: r1(bs.lo), hi: r1(bs.hi), excludesZero: bs.excludesZero } : null,
      note: "floor 0 minus floor 10, pooled over the nine shape x format cells " +
            "(cluster = season). Positive means the shipped floor of 10 costs points." };
  }

  /* --- EINVIGI: GJALDMIDILL GEGN GJALDMIDLI, i SOMU deild ---
         Pardur samanburdur er eina leidin ad thessari spurningu: tvo
         ADSKILIN medaltol gegn "gera ekkert" bera bædi ars-havadann og
         munurinn a theim er tha munur a tveimur havadasomum tolum.     */
  const duel = {}, duelPer = {};
  for (const shape of SHAPES) {
    const slots = slotsFor(shape.league);
    const needFixed = {};
    for (const s of slots) if (s.pos.length === 1) needFixed[s.pos[0]] = (needFixed[s.pos[0]] || 0) + 1;
    for (const fmt of FORMATS) {
      const pairs = [["rosVbd", "seasonVbd"], ["rosVbdPro", "seasonVbd"],
                     ["weekVbd", "seasonVbd"], ["weekVbd", "rosVbd"],
                     ["weekRaw", "weekVbd"]];
      const per = {};
      for (const [a, b] of pairs) per[`${a}-${b}`] = {};
      for (const y of ys) {
        const pool = poolOf(y, ctxIn, fmt);
        const est = estOf(pool);
        const cur = buildCurrencies(pool, est, shape, 1);
        const ctxBase = { pool, shape, cur, est, slots, needFixed };
        const drafts = [];
        for (let r = 0; r < RUNS; r++) drafts.push(draftRosters(pool, shape, r + 1));
        for (const [a, b] of pairs) {
          const fa = walkForward[`${shape.key}|${fmt}|${a}`].bestMinGain;
          const fb = walkForward[`${shape.key}|${fmt}|${b}`].bestMinGain;
          const RA = rules.find((x) => x.key === `${a}@${fa}`);
          const RB = rules.find((x) => x.key === `${b}@${fb}`);
          const ds = [];
          for (let r = 0; r < RUNS; r++) {
            const s1 = (r % shape.league.teams) + 1;
            const s2 = (s1 % shape.league.teams) + 1;
            for (const flip of [0, 1]) {
              const out = runLeague({ ...ctxBase, rosters0: drafts[r] }, {
                treat: RA, ctrl: RB, field: MARKET,
                treatSeat: flip ? s2 : s1, ctrlSeat: flip ? s1 : s2, seedIdx: r,
              });
              ds.push(out.treat - out.ctrl);
            }
          }
          per[`${a}-${b}`][y] = r1(mean(ds));
        }
        process.stdout.write("d");
      }
      for (const [a, b] of pairs) {
        const p = per[`${a}-${b}`];
        const vals = ys.map((y) => p[y]).filter((x) => x != null);
        const bs = bootstrapDiff(p, Object.fromEntries(ys.map((y) => [y, 0])), 2000, 909);
        duelPer[`${a}-${b}`] = duelPer[`${a}-${b}`] || {};
        for (const y of ys) {
          if (p[y] == null) continue;
          (duelPer[`${a}-${b}`][y] = duelPer[`${a}-${b}`][y] || []).push(p[y]);
        }
        duel[`${shape.key}|${fmt}|${a}-${b}`] = {
          floors: { [a]: walkForward[`${shape.key}|${fmt}|${a}`].bestMinGain,
                    [b]: walkForward[`${shape.key}|${fmt}|${b}`].bestMinGain },
          per: p, mean: r1(mean(vals)), t: tOf(vals), years: vals.length,
          wins: vals.filter((x) => x > 0).length,
          ci: bs ? { lo: r1(bs.lo), hi: r1(bs.hi), excludesZero: bs.excludesZero } : null,
        };
      }
    }
  }
  console.log("");

  /* SAMLAGT EINVIGI. Hver (logun x snid)-fruma er sama tímabil og sama
     laug, svo thaer eru EKKI ohadar athuganir og "6 af 18 marktaekar"
     er ekki tolfraedi heldur talning. Retta klasann er TIMABILID: her
     er medaltal yfir nau frumur reiknad per timabili og profad a theim
     — sama rok og `bootstrapDiff` hvilir a annars stadar i repo-inu. */
  const duelPooled = {};
  for (const k of Object.keys(duelPer)) {
    const p = Object.fromEntries(Object.entries(duelPer[k]).map(([y, a]) => [y, r1(mean(a))]));
    const vals = Object.values(p);
    const bs = bootstrapDiff(p, Object.fromEntries(Object.keys(p).map((y) => [y, 0])), 2000, 313);
    duelPooled[k] = { per: p, mean: r1(mean(vals)), t: tOf(vals), years: vals.length,
      wins: vals.filter((x) => x > 0).length, cellsPerSeason: duelPer[k][Object.keys(p)[0]].length,
      ci: bs ? { lo: r1(bs.lo), hi: r1(bs.hi), excludesZero: bs.excludesZero } : null };
  }

  /* --- BOOTSTRAP KLASAD PER LEIKMANN ---
         `bootstrapDiff` klasar per TIMABIL og svarar "flokta arin?".
         Thetta svarar odru: "flokta LEIKMENNIRNIR?" — hefdi onnur
         teikning ur somu leikmannadreifingu gefid somu akvordun?
         `vbdbase-lab`: 29 frumur marktaekar klasad per timabil, 0 af
         153 per leikmann. PER LEIKMANN RAEDUR.                        */
  const bootCells = [];
  for (const shape of SHAPES.slice(0, 2)) {
    const fmt = shape.key === "10-2flex" ? "ppr" : "half";
    bootCells.push({ shape, fmt });
  }
  const bootRules = [];
  for (const c of CURRENCIES) bootRules.push(c.key);
  if (BOOT > 0) {
    console.log(`bootstrap klasad per leikmann (${BOOT} itranir, ` +
      `${bootCells.length} frumur x ${bootRules.length} gjaldmidlar) …`);
    for (const { shape, fmt } of bootCells) {
      const slots = slotsFor(shape.league);
      const needFixed = {};
      for (const s of slots) if (s.pos.length === 1) needFixed[s.pos[0]] = (needFixed[s.pos[0]] || 0) + 1;
      const chosen = bootRules.map((c) => ({
        c, floor: walkForward[`${shape.key}|${fmt}|${c}`].bestMinGain,
      }));
      const accB = {};
      for (const ch of chosen) accB[ch.c] = [];
      for (let b = 0; b < BOOT; b++) {
        const iter = {};
        for (const ch of chosen) iter[ch.c] = [];
        for (const y of ys) {
          const pool = resamplePool(poolOf(y, ctxIn, fmt), y * 100003 + b * 7919 + 17);
          const est = estOf(pool);
          const cur = buildCurrencies(pool, est, shape, 1);
          const ctxBase = { pool, shape, cur, est, slots, needFixed };
          const drafts = [];
          for (let r = 0; r < Math.min(2, RUNS); r++) drafts.push(draftRosters(pool, shape, r + 1));
          if (drafts.some((d) => d.some((r) => r.length !== shape.league.rounds))) continue;
          for (const ch of chosen) {
            const R = rules.find((x) => x.key === `${ch.c}@${ch.floor}`);
            const ds = [];
            for (let r = 0; r < drafts.length; r++) {
              const s1 = (r % shape.league.teams) + 1;
              const s2 = (s1 % shape.league.teams) + 1;
              for (const flip of [0, 1]) {
                const out = runLeague({ ...ctxBase, rosters0: drafts[r] }, {
                  treat: R, ctrl: null, field: MARKET,
                  treatSeat: flip ? s2 : s1, ctrlSeat: flip ? s1 : s2, seedIdx: r,
                });
                ds.push(out.treat - out.ctrl);
              }
            }
            iter[ch.c].push(mean(ds));
          }
        }
        for (const ch of chosen) if (iter[ch.c].length) accB[ch.c].push(mean(iter[ch.c]));
        if (b % 10 === 0) process.stdout.write(".");
      }
      for (const ch of chosen) {
        const a = accB[ch.c].slice().sort((x, z) => x - z);
        const key = `${shape.key}|${fmt}|active|${ch.c}@${ch.floor}`;
        if (a.length < 30) continue;
        const lo = a[Math.floor(a.length * 0.025)], hi = a[Math.floor(a.length * 0.975)];
        const ci = { runs: a.length, lo: r1(lo), hi: r1(hi),
                     median: r1(a[Math.floor(a.length / 2)]),
                     excludesZero: lo > 0 || hi < 0 };
        if (cells[key]) cells[key].ci.player = ci;
      }
      process.stdout.write(`[${shape.key}/${fmt}] `);
    }
    console.log("");
  }

  /* ============================================================
     10b. NAEMNI — TVAER TOLUR SEM VORU VALDAR, EKKI MAELDAR
     ============================================================
     `KPRIOR` (hrist-thyngd forgildisins) og waiver-forgangurinn eru
     BADAR akvardanir sem thessi skrifta tok. Hvorug getur hyglt einum
     gjaldmidli fram yfir annan — thaer eru nakvaemlega eins i hverju
     afbrigdi — en "getur ekki hyglt" er rok, ekki maeling. Thess vegna
     er dominum keyrt UPP A NYTT med odrum gildum: se rodun gjaldmidla
     su sama er akvordunin oháð theim, og thad er thad sem er fullyrt.  */
  const sensitivity = { kPrior: {}, priority: {} };
  for (const { shape, fmt } of bootCells) {
    const slots = slotsFor(shape.league);
    const needFixed = {};
    for (const s of slots) if (s.pos.length === 1) needFixed[s.pos[0]] = (needFixed[s.pos[0]] || 0) + 1;
    for (const variant of [{ kind: "kPrior", k: 2 }, { kind: "kPrior", k: 8 },
                           { kind: "priority", mode: "reverse" }]) {
      const per = {};
      for (const c of CURRENCIES) per[c.key] = {};
      for (const y of ys) {
        const pool = poolOf(y, ctxIn, fmt);
        const est = estOf(pool, variant.k ?? KPRIOR);
        const cur = buildCurrencies(pool, est, shape, 1);
        const ctxBase = { pool, shape, cur, est, slots, needFixed };
        const drafts = [];
        for (let r = 0; r < RUNS; r++) drafts.push(draftRosters(pool, shape, r + 1));
        for (const c of CURRENCIES) {
          const f = walkForward[`${shape.key}|${fmt}|${c.key}`].bestMinGain;
          const R = rules.find((x) => x.key === `${c.key}@${f}`);
          const ds = [];
          for (let r = 0; r < RUNS; r++) {
            const s1 = (r % shape.league.teams) + 1;
            const s2 = (s1 % shape.league.teams) + 1;
            for (const flip of [0, 1]) {
              const out = runLeague({ ...ctxBase, rosters0: drafts[r] }, {
                treat: R, ctrl: null, field: MARKET,
                treatSeat: flip ? s2 : s1, ctrlSeat: flip ? s1 : s2, seedIdx: r,
                priority: variant.mode || "rotate",
              });
              ds.push(out.treat - out.ctrl);
            }
          }
          per[c.key][y] = r1(mean(ds));
        }
      }
      const vkey = variant.kind === "kPrior" ? `k=${variant.k}` : "reverse-standings";
      const box = sensitivity[variant.kind][`${shape.key}|${fmt}|${vkey}`] = {};
      for (const c of CURRENCIES) {
        const vals = ys.map((y) => per[c.key][y]).filter((x) => x != null);
        box[c.key] = { mean: r1(mean(vals)), t: tOf(vals),
                       baseline: cells[`${shape.key}|${fmt}|active|${c.key}@` +
                         `${walkForward[`${shape.key}|${fmt}|${c.key}`].bestMinGain}`].mean };
      }
      /* RODUNIN ER BORIN A ATTUM, EKKI A SAETUM. `rosVbd` og `rosVbdPro`
         eru sami gjaldmidill med sitthvoru golfi og skiptast a ad vera
         efst innan hávaðans; "rodun breyttist" af theirri astaedu vaeri
         ekki nidurstada heldur talnasud. Thad sem MA ekki breytast er
         hvor AETTIN vinnur: ros > season > week. */
      const FAMILY = { seasonVbd: "season", rosVbd: "ros", rosVbdPro: "ros",
                       weekVbd: "week", weekRaw: "week" };
      const ord = (get) => {
        const best = {};
        for (const c of CURRENCIES) {
          const f = FAMILY[c.key], v = get(c.key);
          if (v == null) continue;
          if (best[f] == null || v > best[f]) best[f] = v;
        }
        return Object.keys(best).sort((a, b) => best[b] - best[a]).join(">");
      };
      box.order = ord((k) => box[k].mean);
      box.baselineOrder = ord((k) => box[k].baseline);
      box.sameOrder = box.order === box.baselineOrder;
      process.stdout.write("s");
    }
  }
  console.log("");

  /* ============================================================
     11. TOFLUR
     ============================================================ */
  const line = "=".repeat(104);
  for (const shape of SHAPES) {
    console.log(`\n${line}\n  ${shape.label}  (field = markadurinn keyrir sendu regluna)\n${line}`);
    console.log(`  ${"gjaldmidill".padEnd(12)}${"golf".padStart(5)}` +
      FORMATS.map((f) => f.toUpperCase().padStart(28)).join(""));
    for (const c of CURRENCIES) {
      for (const f of FLOORS) {
        const cellsRow = FORMATS.map((fmt) => {
          const A = cells[`${shape.key}|${fmt}|active|${c.key}@${f}`];
          if (!A) return "-".padStart(28);
          const star = A.ci.season && A.ci.season.excludesZero ? "*" : " ";
          const pl = placeboCeil[`${shape.key}|${fmt}`].ceiling;
          const beat = A.mean != null && pl != null && A.mean > pl ? "^" : " ";
          return `${sgn(A.mean)}${star}${beat} ${A.wins}/${A.years} t=${A.t == null ? "-" : A.t.toFixed(2)}`
            .padStart(28);
        }).join("");
        console.log(`  ${(f === FLOORS[0] ? c.key : "").padEnd(12)}${String(f).padStart(5)}${cellsRow}`);
      }
    }
    console.log(`  ${"placebo-thak".padEnd(17)}` + FORMATS.map((fmt) => {
      const p = placeboCeil[`${shape.key}|${fmt}`];
      return `${sgn(p.ceiling)} (${p.ceilingRule})`.padStart(28);
    }).join(""));
    console.log(`  ${"placebo golf-bil".padEnd(17)}` + FORMATS.map((fmt) => {
      const p = placeboCeil[`${shape.key}|${fmt}`];
      return `${p.floorSpread} (${p.floorSpreadRule})`.padStart(28);
    }).join(""));
    console.log(`  ${"orakel ROS (hlid)".padEnd(17)}` + FORMATS.map((fmt) => {
      const A = [0, 5, 10].map((f) => cells[`${shape.key}|${fmt}|active|or_ros@${f}`])
        .filter(Boolean).sort((a, b) => b.mean - a.mean)[0];
      return `${sgn(A.mean)} ${A.wins}/${A.years}`.padStart(28);
    }).join(""));
    console.log(`  ${"orakel viku".padEnd(17)}` + FORMATS.map((fmt) => {
      const A = [0, 5, 10].map((f) => cells[`${shape.key}|${fmt}|active|or_week@${f}`])
        .filter(Boolean).sort((a, b) => b.mean - a.mean)[0];
      return `${sgn(A.mean)} ${A.wins}/${A.years}`.padStart(28);
    }).join(""));
    console.log(`  ${"walk-forward".padEnd(17)}` + FORMATS.map((fmt) => {
      const q = walkForward[`${shape.key}|${fmt}|seasonVbd`];
      return `golf ${q.bestMinGain} -> ${sgn(q.mean)} t=${q.t == null ? "-" : q.t.toFixed(2)}`.padStart(28);
    }).join(""));
  }
  console.log(`\n  * = 95% vikmork (klasar = timabil) utiloka null` +
    `   ^ = yfir placebo-thakinu   tolur eru stig byrjunarlids per timabil`);

  console.log(`\n${line}\n  GJALDMIDILL GEGN GJALDMIDLI — PARDUR, I SOMU DEILD\n${line}`);
  for (const shape of SHAPES) {
    console.log(`  ${shape.key}`);
    for (const k of Object.keys(duel).filter((x) => x.startsWith(shape.key))) {
      const d = duel[k];
      const [, fmt, pair] = k.split("|");
      console.log(`    ${pair.padEnd(22)}${fmt.padEnd(9)}${sgn(d.mean).padStart(9)}` +
        ` t=${d.t == null ? "-" : d.t.toFixed(2)}  ${d.wins}/${d.years}` +
        `  CI [${d.ci ? `${d.ci.lo}, ${d.ci.hi}` : "-"}]${d.ci && d.ci.excludesZero ? " MARKT" : ""}`);
    }
  }

  console.log(`\n  SAMLAGT (klasi = timabil, medaltal yfir allar ${SHAPES.length}x` +
    `${FORMATS.length} frumur):`);
  for (const k of Object.keys(duelPooled)) {
    const q = duelPooled[k];
    console.log(`    ${k.padEnd(22)}${sgn(q.mean).padStart(9)} t=` +
      `${q.t == null ? "-" : q.t.toFixed(2)}  ${q.wins}/${q.years}  ` +
      `CI [${q.ci.lo}, ${q.ci.hi}]${q.ci.excludesZero ? " MARKT" : ""}`);
  }

  console.log(`\n${line}\n  HVAD GERDI THAD AD MOTHERJARNIR TOKU LIKA AF WAIVER?\n${line}`);
  const fieldEffect = {};
  for (const shape of SHAPES) for (const fmt of FORMATS) for (const c of CURRENCIES) {
    const f = walkForward[`${shape.key}|${fmt}|${c.key}`].bestMinGain;
    const g = {};
    for (const fk of Object.keys(FIELD_MODES)) {
      const A = cells[`${shape.key}|${fmt}|${fk}|${c.key}@${f}`];
      g[fk] = A ? A.mean : null;
    }
    g.idleMinusActive = r1((g.idle ?? 0) - (g.active ?? 0));
    g.floor = f;
    fieldEffect[`${shape.key}|${fmt}|${c.key}`] = g;
  }
  for (const shape of SHAPES) {
    for (const fmt of FORMATS) {
      const g = fieldEffect[`${shape.key}|${fmt}|seasonVbd`];
      console.log(`  ${shape.key} ${fmt.padEnd(9)} golf ${String(g.floor).padStart(2)}  ` +
        `active ${sgn(g.active).padStart(8)}   idle ${sgn(g.idle).padStart(8)}   ` +
        `greedy ${sgn(g.greedy).padStart(8)}   idle-active ${sgn(g.idleMinusActive)}`);
    }
  }

  /* --- HVE OFT ER "GERA EKKERT" RETTA SVARID? --- */
  const doNothing = { bySeasonCell: {}, overall: null, noSwapShare: {}, addHitRate: {} };
  {
    let tot = 0, lose = 0;
    for (const c of CURRENCIES) {
      let ctot = 0, close = 0;
      for (const shape of SHAPES) for (const fmt of FORMATS) for (const f of FLOORS) {
        const A = cells[`${shape.key}|${fmt}|active|${c.key}@${f}`];
        if (!A) continue;
        for (const y of ys) {
          if (A.per[y] == null) continue;
          ctot++; if (A.per[y] <= 0) close++;
        }
      }
      doNothing.bySeasonCell[c.key] = { cells: ctot, doNothingBetter: close,
                                        share: r3(close / Math.max(1, ctot)) };
      tot += ctot; lose += close;
    }
    doNothing.overall = { cells: tot, doNothingBetter: lose, share: r3(lose / Math.max(1, tot)) };
    for (const c of CURRENCIES) {
      const f = 10;
      const ks = [];
      for (const shape of SHAPES) for (const fmt of FORMATS) {
        const A = cells[`${shape.key}|${fmt}|active|${c.key}@${f}`];
        if (A) ks.push(A);
      }
      doNothing.noSwapShare[c.key] = r3(mean(ks.map((A) => A.noSwapShare)));
      doNothing.addHitRate[c.key] = r3(mean(ks.map((A) => A.addHitRate).filter((x) => x != null)));
    }
  }
  console.log(`\n${line}\n  HVAD KOSTAR GOLFID? (golf 0 - golf 10, samlagt yfir ` +
    `${SHAPES.length}x${FORMATS.length} frumur)\n${line}`);
  for (const c of CURRENCIES) {
    const q = floorCost[`pooled|${c.key}`];
    console.log(`  ${c.key.padEnd(12)}${sgn(q.mean).padStart(8)} stig  t=` +
      `${q.t == null ? "-" : q.t.toFixed(2)}  ${q.wins}/${q.years}  ` +
      `CI [${q.ci.lo}, ${q.ci.hi}]  -> ` +
      `${q.ci.excludesZero ? (q.mean > 0 ? "GOLFID KOSTAR" : "GOLFID BORGAR SIG")
                           : "ogreinanlegt fra null"}`);
  }

  console.log(`\n${line}\n  NAEMNI (hrist-thyngd og waiver-forgangur)\n${line}`);
  for (const kind of ["kPrior", "priority"]) {
    for (const [k, box] of Object.entries(sensitivity[kind])) {
      console.log(`  ${k.padEnd(34)}${box.order.padEnd(24)}` +
        `${box.sameOrder ? "SOMU AETTAROD" : "ONNUR AETTAROD (" + box.baselineOrder + ")"}`);
    }
  }

  console.log(`\n${line}\n  HVE OFT ER "GERA EKKERT" RETTA SVARID?\n${line}`);
  console.log(`  yfir OLL ${doNothing.overall.cells} (gjaldmidill x golf x logun x snid x ar)` +
    `-holf: ${doNothing.overall.doNothingBetter} (${r1(doNothing.overall.share * 100)}%) ` +
    `thar sem "gera ekkert" var jafngott eda betra`);
  for (const c of CURRENCIES) {
    const d = doNothing.bySeasonCell[c.key];
    console.log(`    ${c.key.padEnd(12)}${d.doNothingBetter}/${d.cells} ` +
      `(${r1(d.share * 100)}%)   vikur an skipta (golf 10): ` +
      `${r1(doNothing.noSwapShare[c.key] * 100)}%   ` +
      `skipti sem gafu meira eftir a: ${r1(doNothing.addHitRate[c.key] * 100)}%`);
  }

  /* --- ORAKEL-AKKERIN: GAT PROFID STADIST? --- */
  const anchors = {};
  for (const o of ORACLES) {
    const oc = [];
    for (const shape of SHAPES) for (const fmt of FORMATS) {
      const best = [0, 5, 10].map((f) => cells[`${shape.key}|${fmt}|active|${o.key}@${f}`])
        .filter(Boolean).sort((a, b) => b.mean - a.mean)[0];
      if (best) oc.push({ key: `${shape.key}|${fmt}`, mean: best.mean, t: best.t,
                          wins: best.wins, years: best.years });
    }
    anchors[o.key] = {
      label: o.label, gate: o.gate, cells: oc.length,
      positive: oc.filter((x) => x.mean > 0).length,
      minMean: r1(Math.min(...oc.map((x) => x.mean))),
      meanMean: r1(mean(oc.map((x) => x.mean))),
      passed: oc.every((x) => x.mean > 20),
      per: Object.fromEntries(oc.map((x) => [x.key, x.mean])),
      note: o.gate
        ? "upper anchor AND a gate: a rule that knows the actual rest-of-season points " +
          "must beat doing nothing in every cell. If it does not, the harness cannot " +
          "see a signal and any rejection below would be measuring a broken pipe."
        : "not a gate. Perfect knowledge of ONE week is not perfect knowledge of the " +
          "decision: the swap holds for every week that follows, so a one-week oracle " +
          "churns for a one-week gain. That it is weak is a finding, not a fault — it " +
          "is independent evidence for what the weekly currencies measure below.",
    };
    console.log(`\n  ${o.gate ? "EFRA AKKERI (HLID)" : "orakel (ekki hlid)"} ${o.key}: ` +
      `vinnur i ${anchors[o.key].positive}/${anchors[o.key].cells} frumum, minnst ` +
      `${sgn(anchors[o.key].minMean)}, medaltal ${sgn(anchors[o.key].meanMean)}` +
      (o.gate ? ` -> ${anchors[o.key].passed ? "MAELIRINN SER MERKI"
                                             : "MAELIRINN SER EKKERT — ALLT ONYTT"}` : ""));
    if (o.gate && !anchors[o.key].passed) {
      console.error("\n  Orakelid vann ekki i hverri frumu. Skrifa EKKERT.\n");
      process.exit(6);
    }
  }

  /* ============================================================
     12. DOMURINN — REIKNADUR UR TOLUNUM, EKKI SKRIFADUR
     ============================================================ */
  const verdict = buildVerdict({ cells, placeboCeil, walkForward, duel, duelPooled,
                                floorCost, doNothing, ys });
  console.log(`\n${line}\n  DOMUR\n${line}`);
  for (const l of verdict.lines) console.log(`  ${l}`);

  /* ============================================================
     13. SKRIFAD
     ============================================================ */
  const out = {
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: DEFAULTS,
      inputs: ["features.json", "schedule_history.json",
               ...ys.map((y) => `weekly/${y}.json`)],
      dataDir: DATA }),
    question: {
      asks: "src/waivers.js WAIVER_CAL.minGain (value 10, measured:false) and the " +
            "currency behind the gain",
      floors: FLOORS,
      currencies: CURRENCIES.map((c) => ({ key: c.key, label: c.label, scale: c.scale })),
      metric: "starting-lineup points per season, treatment seat minus a do-nothing " +
              "seat in the SAME simulated league (mirrored over both seats)",
    },
    design: {
      seasons: ys, weeks: WEEKS, firstWaiverWeek: 2, draftSeeds: RUNS,
      mirrored: true, leagueRuns: LEAGUE_RUNS,
      swapsPerWeek: "one add/drop per team per week; roster size is constant",
      market: "every other seat runs the shipped rule (season VBD, floor " +
              `${MARKET.floor}); measured again with an idle field and a greedy field`,
      priority: "rotating waiver order ((week+seed+i) mod teams) — reverse-standings " +
                "would correlate priority with the outcome being measured",
      lineup: "optimalLineup from src/lineup.js on a walk-forward weekly projection " +
              "(weeks < w only), scored on real weekly points; identical across arms",
      ppgEstimate: `shrunk mean: (k*prior + points so far) / (k + team games so far), k=${KPRIOR}`,
      floorScaling: "weekly currencies carry floor/WEEKS and rosVbdPro carries " +
                    "floor*(weeks left)/WEEKS so the same number is the same demand; " +
                    "placebo and oracle values are quantile-mapped onto the real " +
                    "currency distribution for the same reason",
      excluded: "K and DST are out of the draft and out of every swap (accuracy.js " +
                "excludePos, waivers.js RANKED_POS); data/weekly carries no DST at all",
      draftTail: "features.json covers 145-204 players a season, a 12x14 draft needs " +
                 "168, so the tail of the board is ordered by the walk-forward prior",
      /* HVAR LIGGUR VARAMANNS-THREPID I HVERRI DEILD? Skrad ur
         `replacementRanks` sjalfri, ekki handskrifad — thad er talan
         sem gerir tvo gjaldmidla samanburdarhaefa og hun a ad vera
         lesanleg i skranni sem hvilir a henni. */
      replacementRanks: Object.fromEntries(SHAPES.map((s) =>
        [s.key, replacementRanks(s.league)])),
      priorCoverage: Object.fromEntries(ys.map((y) => {
        const p = poolOf(y, ctxIn, "ppr");
        const c = {};
        for (const src of p.priorFrom) c[src] = (c[src] || 0) + 1;
        return [y, { players: p.N, bySource: c, note: p.priorSource }];
      })),
    },
    selfTest, anchors,
    placeboCeiling: placeboCeil,
    cells, walkForward, duel, duelPooled, floorCost, fieldEffect, doNothing,
    sensitivity,
    verdict,
    unmeasured: [
      { what: "trending add/drop (the waiver run itself)",
        why: "data/trending carries 2026-08-11 and 2026-08-12 only — two days. There " +
             "is nothing to backtest, which is exactly why waivers.js shows trendAdd " +
             "as context and never weighs it." },
      { what: "FAAB bidding",
        why: "both measured leagues use waiver order, not budgets. Pricing a pickup " +
             "in dollars is a different decision and needs auction data we do not have." },
      { what: "IR stash / holding an injured player",
        why: "historical weekly data carries no injury status, so avail is 1 for " +
             "everyone. A player who does not play scores 0 — which is what happened — " +
             "but no rule here can foresee it, and 'stash value' is therefore not priced." },
      { what: "the optimum of the shrinkage weight k",
        why: `k=${KPRIOR} team games is a nuisance parameter held constant across every ` +
             "arm, not a fitted one. It cannot favour one currency over another, but " +
             "its own best value was not searched." },
      { what: "in-season projection updates from a real source",
        why: "Sleeper's season projection is revised weekly in the live app; history " +
             "only has the preseason one. The backtest therefore rebuilds the season " +
             "number as points-so-far plus a walk-forward rate, which is the honest " +
             "analogue but not the same series." },
      { what: "half-PPR ADP",
        why: "no historical half ADP exists (half-lab established this); ppr ADP is " +
             "used for the half draft board." },
    ],
  };
  await mkdir(path.join(DATA, "measure"), { recursive: true });
  await writeFile(path.join(DATA, "measure", "waiver.json"), JSON.stringify(out, null, 1));
  console.log(`\n-> data/measure/waiver.json  (${Math.round((Date.now() - t0) / 1000)}s)`);
}

/**
 * LEIKMANNA-BOOTSTRAP. Laugin er endursyndud MED ENDURTEKNINGU innan
 * ars: sami leikmadur getur komid tvisvar og faer tha nytt id, svo tvo
 * lid geta baedi "eignast" hann. Thad er ekki raunverulegt draft — en
 * thad er SAMA laugin fyrir badi saetin i hverri itrun, svo porunin
 * heldur og munurinn er enn munurinn a reglunum.
 */
function resamplePool(pool, seed) {
  const rnd = rngOf(seed);
  const N = pool.N;
  const pick = new Int32Array(N);
  for (let i = 0; i < N; i++) pick[i] = Math.floor(rnd() * N);

  const P = new Array(N), posIdx = new Int8Array(N);
  const prior = new Float64Array(N), adp = new Float64Array(N);
  const MAXW = pool.act.length - 1;
  const act = [], playedWeek = [], teamOf = [];
  for (let w = 0; w <= MAXW; w++) {
    act.push(new Float64Array(N)); playedWeek.push(new Uint8Array(N));
    teamOf.push(new Array(N).fill(null));
  }
  for (let i = 0; i < N; i++) {
    const s = pick[i];
    P[i] = { ...pool.P[s], id: `${pool.P[s].id}#${i}` };
    posIdx[i] = pool.posIdx[s]; prior[i] = pool.prior[s]; adp[i] = pool.adp[s];
    for (let w = 0; w <= MAXW; w++) {
      act[w][i] = pool.act[w][s]; playedWeek[w][i] = pool.playedWeek[w][s];
      teamOf[w][i] = pool.teamOf[w][s];
    }
  }
  return { ...pool, N, P, posIdx, prior, adp, act, playedWeek, teamOf,
           idx: new Map(P.map((p, i) => [p.id, i])) };
}

/**
 * DOMURINN ER REIKNADUR. Fjorar hlidar, og hver their krefst tolu:
 *   1. slaer besta golfid "gera ekkert" med vikmorkum sem utiloka null
 *      — BADUM (timabil OG leikmenn)?
 *   2. slaer thad PLACEBO-THAKID?
 *   3. er valid a golfinu STODUGT walk-forward?
 *   4. er golfid raunverulegt INNRA hamark, eda er hver tala jafngod?
 * Fellur ein their stendur `measured: false` — og thad er nidurstada.
 */
function buildVerdict({ cells, placeboCeil, walkForward, duel, duelPooled,
                       floorCost, doNothing, ys }) {
  const lines = [];
  const primary = [
    { shape: "10-2flex", fmt: "ppr", label: "10 lid PPR" },
    { shape: "12-2flex", fmt: "half", label: "12 lid half-PPR" },
  ];
  const perLeague = {};
  for (const p of primary) {
    const pc = placeboCeil[`${p.shape}|${p.fmt}`];
    const byCur = {};
    for (const c of CURRENCIES) {
      const wf = walkForward[`${p.shape}|${p.fmt}|${c.key}`];
      const best = cells[`${p.shape}|${p.fmt}|active|${c.key}@${wf.bestMinGain}`];
      const q = {
        bestMinGain: wf.bestMinGain, bestMean: best ? best.mean : null,
        walkForwardMean: wf.mean, walkForwardT: wf.t, choiceStability: wf.stable,
        ciSeasonExcludesZero: !!(best && best.ci.season && best.ci.season.excludesZero),
        ciPlayerExcludesZero: best && best.ci.player ? best.ci.player.excludesZero : null,
        beatsPlaceboCeiling: best && pc.ceiling != null ? best.mean > pc.ceiling : null,
        floorSpread: wf.floorSpread, placeboFloorSpread: pc.floorSpread,
        floorSpreadBeatsNoise: wf.floorSpread != null && pc.floorSpread != null
          ? wf.floorSpread > pc.floorSpread : null,
        wfVsZero: wf.wfVsZero, bestVsZero: wf.bestVsZero,
      };
      /* ER REGLAN THESS VIRDI? Thrennt verdur ad standa: yfir placebo-
         thakinu, og BADAR vikmarkategundir utiloka null (per timabili OG
         per leikmanni — `vbdbase-lab`: 29 frumur marktaekar per timabili,
         0 af 153 per leikmanni. PER LEIKMANN RAEDUR). */
      q.ruleWorthIt = !!(q.beatsPlaceboCeiling && q.ciSeasonExcludesZero &&
                         q.ciPlayerExcludesZero === true);
      /* ER GOLFID SJALFT MAELANLEGT? Onnur spurning: golf-bilid verdur
         ad vera staerra en thad sem havadi naer, valid verdur ad vera
         stodugt walk-forward, og valda golfid verdur ad slá GOLF 0 a
         helda ari (oskekkta profid). */
      q.floorMeasured = !!(q.floorSpreadBeatsNoise && q.choiceStability >= 0.6 &&
                           q.wfVsZero && q.wfVsZero.mean > 0 &&
                           q.wfVsZero.t != null && q.wfVsZero.t > 2 &&
                           q.bestVsZero && q.bestVsZero.excludesZero);
      byCur[c.key] = q;
    }
    const winner = CURRENCIES.map((c) => c.key)
      .sort((a, b) => (byCur[b].walkForwardMean ?? -1e9) - (byCur[a].walkForwardMean ?? -1e9))[0];
    perLeague[`${p.shape}|${p.fmt}`] = { label: p.label, winner, byCurrency: byCur,
      placeboCeiling: pc.ceiling, placeboFloorSpread: pc.floorSpread,
      bestMinGain: byCur[winner].bestMinGain,
      measured: byCur[winner].floorMeasured };
    const q = byCur[winner];
    lines.push(`${p.label}: besti gjaldmidill ${winner} (walk-forward ` +
      `${sgn(q.walkForwardMean)} t=${q.walkForwardT}) · besta golf ${q.bestMinGain} -> ` +
      `${sgn(q.bestMean)} stig/timabil`);
    lines.push(`${" ".repeat(p.label.length)}  regla thess virdi: ` +
      `${q.ruleWorthIt ? "JA" : "NEI"} (placebo-thak ${sgn(pc.ceiling)}, CI(ar) ` +
      `${q.ciSeasonExcludesZero ? "utilokar" : "inniheldur"} null, CI(leikmenn) ` +
      `${q.ciPlayerExcludesZero == null ? "ekki reiknad"
        : q.ciPlayerExcludesZero ? "utilokar" : "inniheldur"} null)`);
    lines.push(`${" ".repeat(p.label.length)}  GOLFID maelanlegt: ` +
      `${q.floorMeasured ? "JA" : "NEI"} (golf-bil ${q.floorSpread} gegn havada-bili ` +
      `${pc.floorSpread}, stodugleiki ${q.choiceStability}, valid golf gegn golfi 0 a ` +
      `heldu ari ${sgn(q.wfVsZero.mean)} t=${q.wfVsZero.t})`);
  }

  /* HVAD KOSTAR SENDA GOLFID? Su tala er ONNUR en "hvert er retta
     golfid" og hun er sú sem notandinn getur brugdist vid. */
  const shipped = floorCost[`pooled|seasonVbd`];
  const shippedCost = {
    currency: "seasonVbd", floor: WAIVER_CAL.minGain.value,
    zeroMinusTen: shipped.mean, t: shipped.t, ci: shipped.ci,
    costsPoints: !!(shipped.ci && shipped.ci.excludesZero && shipped.mean > 0),
  };
  lines.push(`senda reglan (seasonVbd, golf ${WAIVER_CAL.minGain.value}): golf 0 - golf 10 ` +
    `= ${sgn(shipped.mean)} stig, t=${shipped.t}, CI [${shipped.ci.lo}, ${shipped.ci.hi}] -> ` +
    `${shippedCost.costsPoints ? "GOLFID KOSTAR STIG"
      : "GOLFID KOSTAR EKKERT MAELANLEGT — 10 er jafn rettlaetanlegt og 0"}`);
  for (const c of CURRENCIES.filter((x) => x.key !== "seasonVbd")) {
    const q = floorCost[`pooled|${c.key}`];
    lines.push(`  ${c.key}: golf 0 - golf 10 = ${sgn(q.mean)} CI [${q.ci.lo}, ${q.ci.hi}]` +
      `${q.ci.excludesZero ? " MARKT" : ""}`);
  }

  /* ROS gegn timabils-VBD: parad einvigi. Nidurstadan hvilir a SAMLAGDA
     profinu (klasi = timabil); talningin a frumum er birt vid hlidina en
     hun er EKKI tolfraedin — frumurnar deila timabilum og droftum. */
  const rosKeys = Object.keys(duel).filter((k) => /\|(rosVbd|rosVbdPro)-seasonVbd$/.test(k));
  const weekKeys = Object.keys(duel).filter((k) => /\|weekVbd-(seasonVbd|rosVbd)$/.test(k));
  const pooledRos = duelPooled["rosVbdPro-seasonVbd"];
  const pooledRosPlain = duelPooled["rosVbd-seasonVbd"];
  const pooledWeek = duelPooled["weekVbd-seasonVbd"];
  const pooledWeekRos = duelPooled["weekVbd-rosVbd"];
  const currency = {
    pooled: duelPooled,
    rosCells: rosKeys.length,
    rosPositiveCells: rosKeys.filter((k) => duel[k].mean > 0).length,
    rosSignificantCells: rosKeys.filter((k) => duel[k].ci && duel[k].ci.excludesZero &&
                                               duel[k].mean > 0).length,
    weekCells: weekKeys.length,
    weekPositiveCells: weekKeys.filter((k) => duel[k].mean > 0).length,
    rosBeatsSeason: !!(pooledRos && pooledRos.mean > 0 && pooledRos.ci &&
                       pooledRos.ci.excludesZero),
    weekBeatsSeason: !!(pooledWeek && pooledWeek.mean > 0 && pooledWeek.ci &&
                        pooledWeek.ci.excludesZero),
    weekBeatsRos: !!(pooledWeekRos && pooledWeekRos.mean > 0 && pooledWeekRos.ci &&
                     pooledWeekRos.ci.excludesZero),
  };
  for (const [lab, q] of [["ROS-VBD (pro-rated golf)", pooledRos],
                          ["ROS-VBD (algilt golf)", pooledRosPlain]]) {
    lines.push(`${lab} gegn timabils-VBD, samlagt yfir ${q.cellsPerSeason} frumur: ` +
      `${sgn(q.mean)} stig/timabil, t=${q.t}, ${q.wins}/${q.years} ar, ` +
      `CI [${q.ci.lo}, ${q.ci.hi}] -> ${q.ci.excludesZero ? "MARKTAEKT" : "inniheldur null"}`);
  }
  lines.push(`ROS vann i ${currency.rosPositiveCells}/${currency.rosCells} stokum frumum ` +
    `(${currency.rosSignificantCells} their marktaekar hver fyrir sig)`);
  lines.push(`vikuspa gegn timabils-VBD: ${sgn(pooledWeek.mean)} t=${pooledWeek.t} ` +
    `CI [${pooledWeek.ci.lo}, ${pooledWeek.ci.hi}]  ·  gegn ROS-VBD: ` +
    `${sgn(pooledWeekRos.mean)} t=${pooledWeekRos.t} ` +
    `CI [${pooledWeekRos.ci.lo}, ${pooledWeekRos.ci.hi}]`);
  lines.push(`"gera ekkert" var jafngott eda betra i ${r1(doNothing.overall.share * 100)}% ` +
    `af ${doNothing.overall.cells} holfum`);

  const anyMeasured = Object.values(perLeague).some((q) => q.measured);
  const anyRuleWorth = Object.values(perLeague)
    .some((q) => q.byCurrency[q.winner].ruleWorthIt);
  lines.push(anyRuleWorth
    ? `-> GJALDMIDILLINN er maelanlegur: ROS-VBD er thess virdi ad taka af waiver`
    : `-> engin regla slaer bædi placebo-thakid og badar vikmarkategundir`);
  lines.push(anyMeasured
    ? `-> minGain ER MAELANLEGT i thessum gognum; sja perLeague[..].bestMinGain`
    : `-> minGain ER EKKI MAELANLEGT i thessum gognum: ` +
      `WAIVER_CAL.minGain.measured skal STANDA i false`);

  return { perLeague, currency, shippedFloorCost: shippedCost,
    doNothingShare: doNothing.overall.share,
    minGainMeasurable: anyMeasured, ruleWorthIt: anyRuleWorth,
    sameFloorBothLeagues: perLeague["10-2flex|ppr"] && perLeague["12-2flex|half"]
      ? perLeague["10-2flex|ppr"].bestMinGain === perLeague["12-2flex|half"].bestMinGain
      : null,
    sameWinnerBothLeagues: perLeague["10-2flex|ppr"] && perLeague["12-2flex|half"]
      ? perLeague["10-2flex|ppr"].winner === perLeague["12-2flex|half"].winner
      : null,
    lines,
    note: "every clause here is computed from the numbers in this file: the floor is " +
          "measured only if it beats the placebo ceiling, both bootstrap intervals " +
          "exclude zero, the walk-forward choice is stable, and the floor grid has a " +
          "real interior optimum rather than a flat line inside the noise.",
  };
}

main().catch((e) => { console.error(e); process.exit(1); });
