#!/usr/bin/env node
/* ============================================================
   seq-lab.mjs — LIFUNAR-HAAD TIMASETNING (survival-aware sequencing)

     node scripts/seq-lab.mjs [--runs=3] [--boot=300] [--from=2015]
                              [--winruns=3] [--wboot=0] [--pairs=2]

   -> data/measure/sequencing.json

   ============================================================
   SPURNINGIN, OG HVERS VEGNA HUN ER **EKKI** SU SEM VAR HOFNUD
   ============================================================
   Notandinn sa thetta tvisvar i mock-drafti og hann hefur rett fyrir
   ser um EINKENNID:

     Pick 24 — take TE Brock Bowers · VBD 55,4 · 87% likely to still
               be there at pick 37
             — or WR Nico Collins · 10,7 VBD behind · 0% likely to last

   Ad taka Collins nuna og Bowers i 37 er ~44,7 + 0,87*55,4 = 93; ad
   taka Bowers nuna og missa Collins er 55,4 + varamadur. Rokfaerslan er
   RETT sem rokfaersla. Spurningin er hvort hun MAELIST.

   OG ThAD ER **ONNUR REGLA** EN SU SEM ER BOKUD SEM HOFNUD.
   README 5d / `advice.js` MEASURED bokar `urgencyDrivesOrder: false`.
   Thad er STODU-BRADANAUÐSYN:

       urgency(i) = VBD(i) - E[besta VBD A HANS STODU vid naesta val]

   Su regla mælir hve bratt HANS STADA versnar. Reglan hér mælir hve
   miklu hann sjalfur er likur til ad TAPAST. Thaer eru skyldar en ekki
   sama tala: se `p` lifunarlikur efsta manns og `v2` naesti a hans
   stodu, tha er urgency ~ (1-p)*(VBD - v2) medan EV-reglan er
   ~ (1-p)*VBD. Su fyrri getur verid ~0 thar sem su seinni er stor.

   `tiebreak-lab.mjs` maeldi NAESTA-SKYLDU regluna (innan T stiga, taktu
   thann sem lifir sidur) og hun gaf ekkert. EN hun spurdi EKKI:
     · X — ad efsti madur lifi RAUNVERULEGA (hun kviknar lika thegar
       BADIR eru 0%, thar sem enginn hagnadur er i bodi)
     · Z — ad hinn lifi RAUNVERULEGA EKKI
     · EV-formid sjalft (vog eftir stærd VBD, ekki hart threp)
   Thess vegna er thetta lab til. Ristin hér INNIHELDUR tiebreak-formid
   sem sértilfelli (X=0, Z=1) svo bokada nullid se endurgeranlegt.

   ============================================================
   MEKANISMA-VARNAGLINN SEM VERDUR AD FYLGJA HVERRI TOLU
   ============================================================
   `survivalProb(adp, sd, pick)` er EINRÆNT FALLANDI I ADP vid fast
   `pick`. "Taktu thann sem lifir SIDUR" er thvi, innan hops sem er
   naerri jafn a VBD, sama og "taktu thann sem MARKADURINN setur FYRR".
   Reglan er thess vegna FALIN ADP-BLONDUN — og ADP-blondun ofan a VBD
   var maeld i `board-lab`/`dynamic-lab` (README 5h) og var **negatif i
   ollum fjorum frumum walk-forward**.

   Thad er tilgata, ekki nidurstada, svo hun er MAELD hér i staðinn fyrir
   ad vera fullyrt: armurinn `adpward` gerir NAKVAEMLEGA thetta an nokkurra
   lifunarlikinda (innan Y stiga, taktu laegsta ADP). Skili hann sama
   tolu og lifunar-armarnir er mekanisminn ADP og ekkert annad.

   ANNAR MEKANISMI, JAFN RAUNVERULEGUR: a raunbordinu i dag eru
   frambjodendurnir sem "lifa" nanast eingongu THETTENDUR — thvi
   `FLEX_SPLIT.TE` gefur TE hærra VBD en markadurinn (README 6k(1) og
   4l, tolur sem eru bokadar sem OSTADFESTAR). "Taktu thann sem lifir
   sidur" er thvi ad storum hluta "sleppdu thettendanum". Armurinn
   `deferTE` gerir thad EITT, an lifunarlikinda.

   ============================================================
   HARNESS — ENDURNOTAD, EKKI SKRIFAD UPP A NYTT
   ============================================================
   `simulateDraft` / `startersPoints` / `scoreLeague` / `roundRobin` ur
   `src/accuracy.js`; `computeVbd` / `replacementRanks` ur `src/model.js`;
   `survivalProb` / `defaultSd` / `ownPickNo` / `nextOwnPick` /
   `expectedBestAt` ur `src/advice.js`; `mean` / `bootstrapDiff` ur
   `src/learn.js`. **Ekkert af thessu er endurritad hér** — thad er
   reglan sem `buildTeamMetrics` i FPL-verkefninu kostadi og sem
   `vbdbase-lab` skrifar berum orðum um `computeVbd`.

   Pardra hermunin (`pairedDiffs`-mynstrid) og laugin ur `features.json`
   eru SAMA glerid og `vbdbase-lab`/`tiebreak-lab` nota, med SOMU
   half-algebru (half = (ppr + std) / 2, upp a stig).

   ============================================================
   HLIDIN — SKRIFTAN DEYR FREMUR EN AD SKRIFA
   ============================================================
   G0  LOGUNIN ER ANKERUD I `data/measure/waiver.json`. Tvaer maelingar
       sem heita sama nafni og maela sitthvora deild eru verri en ein.
   G1  SJALFSPROFID: `shipped` er bordid gegn sjalfu ser og verdur ad
       gefa NAKVAEMLEGA 0 i hverri frumu.
   G2  REGLAN VERDUR AD VERA LIFANDI. Nakvaemt null i hverri frumu er
       EINKENNI, ekki nidurstada — thad var raunverulega bilunin i
       fyrstu utgafu `tiebreak-lab` (`m.set(id, 0)` a afriti faerir
       engan; Map heldur innsetningarod).
   G3  BORD-INNSETNINGIN ER PROFUD SER: `bestAvailable` les kortid i
       INNSETNINGAROD, svo kynningin verdur ad vera NYTT kort.
   G4  AKKERI I BADA ENDA: orakel-bord (raunstig) verdur ad SLA hreint
       VBD storlega, og andhverft ADP verdur ad TAPA storlega. "Pipan
       virkar" er sannad ur badum endum eda ekki.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { simulateDraft, scoreLeague, roundRobin, startersPoints } from "../src/accuracy.js";
import { computeVbd, replacementRanks } from "../src/model.js";
import { survivalProb, defaultSd, ownPickNo, nextOwnPick,
         expectedBestAt } from "../src/advice.js";
import { mean, bootstrapDiff } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const DATA = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  runs: "number", boot: "number", from: "number",
  winruns: "number", wboot: "number", pairs: "number",
});
const DEFAULTS = { runs: 3, boot: 300, from: 2015, winruns: 3, wboot: 0, pairs: 2 };
const RUNS    = Number(ARG.runs    ?? DEFAULTS.runs);
const BOOT    = Number(ARG.boot    ?? DEFAULTS.boot);
const FROM    = Number(ARG.from    ?? DEFAULTS.from);
const WINRUNS = Number(ARG.winruns ?? DEFAULTS.winruns);
const WBOOT   = Number(ARG.wboot   ?? DEFAULTS.wboot);
const PAIRS   = Number(ARG.pairs   ?? DEFAULTS.pairs);

const REG_WEEKS = 14;                  // MAELT: `fpts` = vikur 1-14 (h2h-lab)
const POSES = ["QB", "RB", "WR", "TE"];
const r1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const sgn = (x, d = 1) => (x == null ? "    -" : `${x > 0 ? "+" : ""}${x.toFixed(d)}`);

function rngOf(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* Pardur t yfir timabil — klasarnir eru ARIN, eins og annars stadar. */
function tOf(a) {
  const v = a.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
}

/* Determinískt suð ur (id, fraekorn) — placebo-lifun. Sama hugmynd og
   placebo-familian i `opp-lab`/`h2h-lab`: ADKVEDINN havadi med FULLA
   thekju, svo thakid getur adeins ordid HAERRA en raunbreytan tharf. */
function hash01(str, seed) {
  let h = (seed * 2654435761) >>> 0;
  for (let i = 0; i < str.length; i++) h = ((h ^ str.charCodeAt(i)) * 16777619) >>> 0;
  h ^= h >>> 13; h = (h * 1274126177) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/* ============================================================
   1. LOGUNIN — DEILDIRNAR SEM HANN SPILAR I
   ============================================================
   Ordrett sama lognun og `vbdbase-lab`, `h2h-lab` og `waiver-lab` bera
   undir SOMU lyklum, og hun er ANKERUD gegn `data/measure/waiver.json`
   i G0. Thridja lognun (almenna 12-1flex) er hofd med svo haegt se ad
   sja hvort utkoman se sertaek fyrir tveggja-FLEX deildir eda almenn. */
const SHAPES = [
  { key: "10-2flex", fmt: "ppr", label: "10 lid, 2 FLEX, PPR, K+DST, 15 umf (Patriots)",
    league: { teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 15,
              flexPos: ["RB", "WR", "TE"], superflex: false,
              excludePos: ["K", "DST"] } },
  { key: "12-2flex", fmt: "half", label: "12 lid, 2 FLEX, half-PPR, 14 umf (Sofahetjur)",
    league: { teams: 12, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 14,
              flexPos: ["RB", "WR", "TE"], superflex: false,
              excludePos: ["K", "DST"] } },
  { key: "12-1flex", fmt: "ppr", label: "12 lid, 1 FLEX, WR3, PPR (almenna lognin)",
    league: { teams: 12, starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 14,
              flexPos: ["RB", "WR", "TE"], superflex: false,
              excludePos: ["K", "DST"] } },
];
/* Half-PPR ber ENGA sogulega ADP (half-lab) — hun er maeld med ppr-ADP
   sem velli og thad er SAGT, ekki falið. */
const ADP_FIELD = { ppr: "adpPpr", half: "adpPpr", standard: "adpStd" };
const SD_FIELD  = { adpPpr: "sdPpr", adpStd: "sdStd" };

/* ============================================================
   2. AFBRIGDIN
   ============================================================
   ALLT fer gegnum SOMU vél (`frontRunner`); afbrigdi er adeins
   stillingar-hlutur. Tvo afrit af sama vali eru tvaer utgafur af thvi. */

const THR_X = [0.0, 0.5, 0.7, 0.9];     // krafa: efsti madur LIFIR
const THR_Y = [3, 8, 15, 25];           // hve mikid VBD ma fórna
const THR_Z = [0.05, 0.15, 0.25, 0.50];  // krafa: hinn LIFIR EKKI

function realVariants() {
  const v = [];
  v.push({ key: "shipped", label: "sent: haesta VBD", kind: "shipped", surv: "real" });

  /* EV-formin. `raw` er formid ur beidninni sjalfri (vbd*(1-p)).
     `cross` og `pos` eru retta EV-reikningurinn med GOLFI: se `f`
     vaentigildi thess besta sem thu faer HVORT SEM ER vid naesta val,
     tha er
        V(i) = vbd_i + p_j vbd_j + (1-p_j) f
     og mismunurinn milli tveggja frambjodenda er
        (vbd_i - f)(1-p_i) - (vbd_j - f)(1-p_j).
     Golfid er thvi EKKI valfrjals snyrting heldur hluti af reikningnum;
     `raw` er sama regla med f = 0, sem er of aggressift ad byggingu. */
  for (const form of ["raw", "cross", "pos"]) {
    v.push({ key: `ev-${form}`, label: `EV-timasetning (${form})`,
             kind: "ev", form, topN: 8, surv: "real" });
  }

  /* THRESKULDS-RISTIN. `X = 0` thydir ENGIN krafa a efsta mann (adeins
     ad hann eigi ADP), svo ristin inniheldur bædi form beiðnarinnar og
     hid vægara. Se fleiri en einn gjaldgengur er tekinn sa med HAESTA
     VBD — minnsta fórnin. */
  for (const X of THR_X) for (const Y of THR_Y) for (const Z of THR_Z) {
    v.push({ key: `thr|${X}|${Y}|${Z}`, label: `threskuldur X=${X} Y=${Y} Z=${Z}`,
             kind: "thr", X, Y, Z, surv: "real" });
  }

  /* `tiebreak-lab`-FORMID, ENDURGERT: innan Y stiga, taktu thann sem
     lifir SIDUR — engin krafa a hvorugan endann. Bokada nullid
     (t = -0,06 / +0,79) verdur thvi endurgeranlegt i SOMU rist, og se
     thad ekki er annad thessara laba ad maela annan heim. */
  for (const Y of THR_Y) {
    v.push({ key: `tiebreak|${Y}`, label: `tiebreak-formid: innan ${Y} VBD, laegsta lifun`,
             kind: "tiebreak", Y, surv: "real" });
  }

  /* MEKANISMA-ARMAR — hvorugur notar lifunarlikur. */
  for (const Y of THR_Y) {
    v.push({ key: `adpward|${Y}`, label: `markads-att: innan ${Y} VBD, laegsta ADP`,
             kind: "adpward", Y, surv: "real" });
    v.push({ key: `deferTE|${Y}`, label: `sleppa TE: innan ${Y} VBD, taktu ekki-TE`,
             kind: "deferTE", Y, surv: "real" });
  }

  /* NAEMNI: `adpSd` thvingud i bakfallid `1,08*sqrt(ADP)` HVERGI birt af
     FFC. Sogulega laugin ber RAUNVERULEGT sd a 100% rada, en lifandi
     bordid ber thad a 74-82% (sja `sdCoverage`), svo thetta er ekki
     tilgata heldur mynd af raunverulegu ástandi. */
  for (const form of ["raw", "cross"]) {
    v.push({ key: `ev-${form}#degsd`, label: `EV (${form}), sd thvingad i bakfall`,
             kind: "ev", form, topN: 8, surv: "degraded" });
  }
  for (const Y of THR_Y) {
    v.push({ key: `thr|0.7|${Y}|0.25#degsd`, label: `threskuldur X=0,7 Y=${Y} Z=0,25, bakfalls-sd`,
             kind: "thr", X: 0.7, Y, Z: 0.25, surv: "degraded" });
  }
  return v;
}

/* PLACEBO-FAMILIAN — ATTA fraekorn af ADKVEDNU sudi i stad lifunar, og
   ANDHVERF lifun. Baedi fara gegnum SOMU rist. An hennar vaeri
   per-frumu taflan olæsileg (README 4d, ordrett). */
const PLC_GRID = [
  { kind: "ev", form: "raw", topN: 8, tag: "ev-raw" },
  { kind: "thr", X: 0.5, Y: 8,  Z: 0.25, tag: "thr|0.5|8|0.25" },
  { kind: "thr", X: 0.7, Y: 15, Z: 0.15, tag: "thr|0.7|15|0.15" },
  { kind: "tiebreak", Y: 25, tag: "tiebreak|25" },
];
function placeboVariants() {
  const v = [];
  for (let s = 1; s <= 8; s++) {
    for (const g of PLC_GRID) {
      v.push({ ...g, key: `plc${s}|${g.tag}`, label: `placebo-lifun #${s} · ${g.tag}`,
               surv: "placebo", seed: s * 7919 + 13 });
    }
  }
  for (const g of PLC_GRID) {
    v.push({ ...g, key: `rev|${g.tag}`, label: `ANDHVERF lifun · ${g.tag}`,
             surv: "reversed" });
  }
  return v;
}

/* ============================================================
   3. VELIN — HVER ER KYNNTUR FREMST
   ============================================================
   `ranked` er thegar rodud eftir VBD (fallandi). Vid gongum aðeins
   fram medan bilid er innan Y (eda innan `topN` fyrir EV-formin), svo
   reglan getur ALDREI fornad meira en Y stigum — thad er nakvaemlega
   munurinn a henni og bradanauðsyn, sem gat fornad 40.               */
function frontRunner(v, ctx) {
  const { ranked, taken, counts, league, np, survOf, poolForFloor } = ctx;
  if (v.kind === "shipped" || np == null) return null;

  /* Gjaldgengir frambjodendur i VBD-rod. */
  const cand = [];
  const limit = v.kind === "ev" ? (v.topN || 8) : 64;
  for (const p of ranked) {
    if (taken.has(p.id)) continue;
    const max = (league.maxPos || {})[p.pos];
    if (max != null && (counts[p.pos] || 0) >= max) continue;
    if (league.excludePos && league.excludePos.includes(p.pos)) continue;
    cand.push(p);
    if (cand.length >= limit) break;
  }
  if (cand.length < 2) return null;
  const best = cand[0];

  if (v.kind === "deferTE") {
    if (best.pos !== "TE") return null;
    for (const p of cand) {
      if (best.vbd - p.vbd > v.Y) break;
      if (p.pos !== "TE") return p.id === best.id ? null : p.id;
    }
    return null;
  }

  if (v.kind === "adpward") {
    let pick = best, lo = best.adp == null ? Infinity : best.adp;
    for (const p of cand) {
      if (best.vbd - p.vbd > v.Y) break;
      if (p.adp != null && p.adp < lo) { lo = p.adp; pick = p; }
    }
    return pick.id === best.id ? null : pick.id;
  }

  if (v.kind === "thr") {
    const sBest = survOf(best, np);
    /* `null` (engin ADP) er OSKRIFAD BLAD og ma ekki vinna threskuld a
       thogn — sama regla og `tiebreak-lab` skrifar. */
    if (sBest == null) return null;
    if (v.X > 0 && sBest <= v.X) return null;
    for (const p of cand) {
      if (p.id === best.id) continue;
      if (best.vbd - p.vbd > v.Y) break;
      const s = survOf(p, np);
      if (s != null && s < v.Z) return p.id;   // HAESTA VBD sem uppfyllir
    }
    return null;
  }

  if (v.kind === "tiebreak") {
    let pick = best, lowest = 2;
    for (const p of cand) {
      if (best.vbd - p.vbd > v.Y) break;
      const s = survOf(p, np);
      if (s != null && s < lowest) { lowest = s; pick = p; }
    }
    return pick.id === best.id ? null : pick.id;
  }

  if (v.kind === "ev") {
    /* Golfid: hvad faerdu HVORT SEM ER vid naesta val?
         cross — besti lausi madur ur OLLUM stodum (thvert)
         pos   — besti lausi madur A HANS STODU (sama tala og
                 `advice.js` notar i `urgency`)
       Baedi eru reiknud med SENDA `expectedBestAt`, ekki afriti. */
    let bestId = null, bestScore = -Infinity;
    let floorCross = null;
    if (v.form === "cross") {
      const live = poolForFloor.filter((p) => !taken.has(p.id));
      floorCross = expectedBestAt(live.map((p) => ({ ...p, pos: "ALL" })), "ALL", np).value;
    }
    for (const p of cand) {
      const s = survOf(p, np);
      if (s == null) continue;
      let f = 0;
      if (v.form === "cross") f = floorCross;
      else if (v.form === "pos") {
        const live = poolForFloor.filter((q) => !taken.has(q.id) && q.pos === p.pos);
        f = expectedBestAt(live, p.pos, np).value;
      }
      const score = (p.vbd - f) * (1 - s);
      if (score > bestScore) { bestScore = score; bestId = p.id; }
    }
    return bestId == null || bestId === best.id ? null : bestId;
  }
  return null;
}

/* Kortid VERDUR ad vera NYTT — `bestAvailable` les innsetningarod og
   `m.set(id, 0)` a afriti faerir engan (G3). */
function promote(pure, id) {
  const m = new Map();
  m.set(id, 0);
  for (const [k, r] of pure) if (k !== id) m.set(k, r);
  return m;
}

/**
 * Bordid sem afbrigdi `v` gefur, sem FALL af stodunni. `simulateDraft`
 * kallar thad vid hvert val okkar saetis og gefur `taken`, stodutalningu
 * og umferdina (0-vaeg).
 */
function boardOf(v, ctx0, slot) {
  const { pure, ranked, league, poolForFloor, survOf } = ctx0;
  const T = league.teams, R = league.rounds;
  let fired = 0, calls = 0, sacrificed = 0, teFrom = 0, promoted = [];
  const fn = (taken, counts, round) => {
    calls++;
    const cur = ownPickNo(round + 1, T, slot);
    const np = nextOwnPick(cur, T, slot, R + 1);
    const id = frontRunner(v, { ranked, taken, counts, league, np, survOf, poolForFloor });
    if (id == null) return pure;
    fired++;
    /* Bokhald: hve miklu VBD var fornad, og var efsti madur TE? */
    let best = null;
    for (const p of ranked) {
      if (taken.has(p.id)) continue;
      const max = (league.maxPos || {})[p.pos];
      if (max != null && (counts[p.pos] || 0) >= max) continue;
      if (league.excludePos && league.excludePos.includes(p.pos)) continue;
      best = p; break;
    }
    const got = ranked.find((p) => p.id === id);
    if (best && got) {
      sacrificed += best.vbd - got.vbd;
      if (best.pos === "TE") teFrom++;
      promoted.push({ from: best.pos, to: got.pos });
    }
    return promote(pure, id);
  };
  fn.__stats = () => ({ fired, calls, sacrificed, teFrom, promoted });
  return fn;
}

/* ============================================================
   4. LAUGIN — SAMA GLER OG `vbdbase-lab`
   ============================================================
   Pordu ppr/standard radir ur `features.json`, half = (ppr + std) / 2
   upp a stig. Se laugin onnur er talan hér ekki samanburdarhaef vid
   bokudu tolurnar, og tha er ekki haegt ad segja hvort munur komi fra
   reglunni eda fra lauginni.                                        */
async function buildPools() {
  const feats = JSON.parse(await readFile(path.join(DATA, "features.json"), "utf8"));
  const byKey = { ppr: new Map(), standard: new Map() };
  for (const r of feats.rows) if (byKey[r.scoring]) byKey[r.scoring].set(`${r.season}|${r.id}`, r);
  const pools = {}, sdCov = {};
  for (const [k, a] of byKey.ppr) {
    const y = Number(k.split("|")[0]);
    if (y < FROM || y > 2025) continue;
    const b = byKey.standard.get(k);
    if (!b || a.adp == null || b.adp == null) continue;
    const pj = a.sleeperProj != null ? a.sleeperProj : a.ffProj;
    const sj = b.sleeperProj != null ? b.sleeperProj : b.ffProj;
    if (pj == null || sj == null || a.pts == null || b.ptsStd == null) continue;
    (pools[y] = pools[y] || []).push({
      id: a.id, pos: a.pos, name: a.name,
      adpPpr: a.adp, adpStd: b.adp, sdPpr: a.adpSd, sdStd: b.adpSd,
      proj: { ppr: pj, standard: sj, half: (pj + sj) / 2 },
      actual: { ppr: a.pts, standard: b.ptsStd, half: (a.pts + b.ptsStd) / 2 },
    });
  }
  for (const y of Object.keys(pools)) {
    if (pools[y].length < 120) { delete pools[y]; continue; }
    const n = pools[y].length;
    sdCov[y] = { n, withSd: pools[y].filter((p) => p.sdPpr != null && p.sdPpr > 0).length };
  }
  return { pools, sdCov };
}

/** Vollurinn: ADP hrist med sinu eigin sd. Sama utfaersla og `vbdbase-lab`. */
function noisyField(pool, fld, sdKey, seed) {
  const rnd = rngOf(seed);
  const gauss = () => {
    const u = Math.max(1e-9, rnd()), w = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
  };
  const j = pool.map((p) => {
    const adp = p[fld];
    const sd = p[sdKey] != null && p[sdKey] > 0 ? p[sdKey] : defaultSd(adp);
    return [p.id, adp + gauss() * sd];
  }).sort((a, b) => a[1] - b[1]);
  return new Map(j.map(([id], i) => [id, i + 1]));
}

/**
 * VBD-bordid — `computeVbd` UR `src/model.js`, ekki endurritun.
 * Skilar { pure, ranked } thar sem `ranked` ber `vbd` og `adp`/`adpSd`
 * i thvi sniði sem `survivalProb` og `expectedBestAt` lesa.
 */
function vbdBoard(pool, league, fmt) {
  const fld = ADP_FIELD[fmt], sdKey = SD_FIELD[fld];
  const scored = computeVbd(pool.map((p) => ({ id: p.id, pos: p.pos, proj: p.proj[fmt] })), league);
  const vbdBy = new Map(scored.filter((p) => p.vbd != null).map((p) => [p.id, p.vbd]));
  const ranked = pool.filter((p) => vbdBy.has(p.id))
    .map((p) => ({ id: p.id, pos: p.pos, name: p.name, vbd: vbdBy.get(p.id),
                   adp: p[fld], adpSd: p[sdKey] }))
    .sort((a, b) => b.vbd - a.vbd);
  return { pure: new Map(ranked.map((p, i) => [p.id, i + 1])), ranked };
}

/** Lifunar-heimildin per armi. EIN sia, oll afbrigdi lesa hana. */
function survivalSource(v) {
  if (v.surv === "degraded") return (p, np) => survivalProb(p.adp, null, np);
  if (v.surv === "reversed") {
    return (p, np) => { const s = survivalProb(p.adp, p.adpSd, np); return s == null ? null : 1 - s; };
  }
  if (v.surv === "placebo") return (p) => hash01(String(p.id), v.seed);
  return (p, np) => survivalProb(p.adp, p.adpSd, np);
}

/* ============================================================
   5. STIG — PARDUR SPEGLADUR EINVIGI
   ============================================================
   `cand` og `pure` drafta i SOMU deild, i BADUM attum, a moti sama
   velli. Spegluninni er beinlinis aetlad ad gera nullid nakvaemt: hver
   armur situr i badum saetum.                                        */
function pointsDiffs({ v, ctx0, actual, field, league, step }) {
  const T = league.teams, out = [];
  let fired = 0, calls = 0, sacrificed = 0, teFrom = 0;
  for (let i = 1; i <= T; i += step) {
    const j = (i % T) + 1;
    for (const swap of [false, true]) {
      const me = swap ? j : i, other = swap ? i : j;
      const b = boardOf(v, ctx0, me);
      const o = simulateDraft({ board: b, fieldBoard: field, actual, slot: me, league,
                                rival: { slot: other, board: ctx0.pure } });
      out.push(o.points - o.rivalPoints);
      const st = b.__stats();
      fired += st.fired; calls += st.calls; sacrificed += st.sacrificed; teFrom += st.teFrom;
    }
  }
  return { diffs: out, fired, calls, sacrificed, teFrom };
}

/* ============================================================
   6. SIGRAR — SAMA DRAFT, VIKULEG VIDUREIGN
   ============================================================
   `scoreLeague` + `roundRobin` ur `src/accuracy.js` — SOMU foll og
   `h2h-lab` notar, svo tolurnar eru samanburdarhaefar. Byrjunarlid
   vikunnar er valid af RAUNSTIGUM vikunnar (`oracleLineup` i h2h-lab);
   thad VERDLAUNAR sveiflu og gildir EINS um bada arma, svo thad getur
   ekki halað hvorugum — en thad er sagt hér svo talan se lesin rett. */
function winsDiff({ v, ctx0, actualSeason, byWeek, field, league, seed, step }) {
  const T = league.teams, out = [];
  for (let i = 1; i <= T; i += step) {
    const j = (i % T) + 1;
    for (const swap of [false, true]) {
      const me = swap ? j : i, other = swap ? i : j;
      const boards = [];
      boards[me] = boardOf(v, ctx0, me);
      boards[other] = ctx0.pure;
      const d = simulateDraft({ board: ctx0.pure, fieldBoard: field, actual: actualSeason,
                               slot: me, league, boards });
      /* ============================================================
         SKRAIN VERDUR AD VERA SU SAMA I BADUM ATTUM SPEGLUNARINNAR
         ============================================================
         Fyrsta utgafan setti `swap` i fraekornid. Tha var spegilmyndin
         ONNUR DEILD, svo `diff(i,j) + diff(j,i)` felldi ekki ut og
         nullhlidid las **+0,31 sigrar** thar sem bordin voru BITAEINS.
         Med sama fraekorni fyrir pardid er nullid NAKVAEMT AD BYGGINGU:
         hoparnir eru their somu, skrain er su sama, og eina sem
         breytist er hvor heitir "eg".                                */
      const lo = Math.min(i, j), hi = Math.max(i, j);
      const schedule = roundRobin(T, REG_WEEKS, rngOf(seed + lo * 31 + hi * 7));
      const { rec } = scoreLeague({ rosters: d.rosters, byWeek, league, schedule });
      /* `leagueRecords` skilar `{ team, w, l, t, pf, pa }` — sviðið heitir
         `w`, ekki `wins`. Jafntefli er halft (sama regla og `seeds`). */
      const wm = rec[me] ? rec[me].w + rec[me].t / 2 : null;
      const wo = rec[other] ? rec[other].w + rec[other].t / 2 : null;
      if (wm != null && wo != null) out.push(wm - wo);
    }
  }
  return out;
}

/* ============================================================
   7. KEYRSLAN
   ============================================================ */
async function main() {
  const { pools, sdCov } = await buildPools();
  const years = Object.keys(pools).map(Number).sort((a, b) => a - b);
  requireSeasons(years, "timabil i seq-lab (features.json)");
  if (years.length < 5) {
    console.error(`\n  ADEINS ${years.length} timabil — barinn hér krefst minnst 5.` +
      " Skrifa EKKERT.\n");
    process.exit(2);
  }

  /* --- G0: LOGUNIN ER ANKERUD --- */
  const shapeGuard = {};
  let waiverDesign = null;
  try {
    waiverDesign = JSON.parse(await readFile(path.join(DATA, "measure", "waiver.json"), "utf8"));
  } catch { /* ekki til -> sagt nedar */ }
  for (const s of SHAPES) {
    const mine = replacementRanks(s.league);
    const book = waiverDesign?.design?.replacementRanks?.[s.key] || null;
    shapeGuard[s.key] = { mine, booked: book };
    if (book) {
      for (const pos of Object.keys(book)) {
        if (mine[pos] !== book[pos]) {
          console.error(`\n  G0 FELLUR: ${s.key}.${pos} — waiver.json ${book[pos]} gegn ` +
            `replacementRanks ${mine[pos]}. Tvaer maelingar undir sama nafni.`);
          process.exit(2);
        }
      }
    }
  }
  console.log(`\nG0 lognun onkerud gegn waiver.json  OK` +
    `${waiverDesign ? "" : "  (waiver.json vantar — ANKER OSTADFEST)"}`);

  /* --- G3: BORD-INNSETNINGIN, PROFUD SER --- */
  {
    const pure = new Map([["a", 1], ["b", 2], ["c", 3]]);
    const bad = new Map(pure); bad.set("c", 0);
    const first = (m) => [...m.keys()][0];
    if (first(bad) !== "a") { console.error("  G3: forsendan sjalf er brostin"); process.exit(2); }
    if (first(promote(pure, "c")) !== "c") {
      console.error("\n  G3 FELLUR: `promote` faerir ekki manninn fremst. Reglan yrdi ALDREI virk.");
      process.exit(2);
    }
    console.log("G3 bord-innsetning (nytt kort, ekki `set` a afriti)  OK");
  }

  const REAL = realVariants(), PLC = placeboVariants();
  const ALL = [...REAL, ...PLC];
  console.log(`\n${ALL.length} afbrigdi (${REAL.length} raun + ${PLC.length} placebo) ` +
    `x ${SHAPES.length} lognun x ${years.length} timabil` +
    `  [${years[0]}-${years[years.length - 1]}]`);

  /* --- akkerin (G4) og hvert einasta hólf --- */
  const cells = {}, perSeason = {}, fireStats = {}, anchors = {};

  for (const s of SHAPES) {
    const fmt = s.fmt, fld = ADP_FIELD[fmt], sdKey = SD_FIELD[fld];
    const league = s.league;
    /* G4 — akkeri i bada enda, PER LOGNUN. */
    const orc = [], rev = [];
    for (const y of years) {
      const pool = pools[y];
      const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual[fmt] }]));
      const { pure } = vbdBoard(pool, league, fmt);
      const field = noisyField(pool, fld, sdKey, y * 7 + 3);
      const oracle = new Map(pool.slice().sort((a, b) => b.actual[fmt] - a.actual[fmt])
        .map((p, i) => [p.id, i + 1]));
      const antiAdp = new Map(pool.slice().sort((a, b) => b[fld] - a[fld]).map((p, i) => [p.id, i + 1]));
      for (const [board, sink] of [[oracle, orc], [antiAdp, rev]]) {
        const T = league.teams;
        for (let i = 1; i <= T; i++) {
          const j = (i % T) + 1;
          for (const swap of [false, true]) {
            const o = simulateDraft({ board, fieldBoard: field, actual,
              slot: swap ? j : i, league, rival: { slot: swap ? i : j, board: pure } });
            sink.push(o.points - o.rivalPoints);
          }
        }
      }
    }
    anchors[s.key] = { oracleVsVbd: r1(mean(orc)), antiAdpVsVbd: r1(mean(rev)) };
    if (!(mean(orc) > 100) || !(mean(rev) < -100)) {
      console.error(`\n  G4 FELLUR (${s.key}): orakel ${r1(mean(orc))}, ` +
        `andhverft ADP ${r1(mean(rev))}. Maelitaekid ser ekki merki i bada enda.`);
      process.exit(2);
    }
    console.log(`G4 ${s.key}: orakel ${sgn(mean(orc))} · andhverft ADP ${sgn(mean(rev))}  OK`);

    /* --- hólfin --- */
    for (const v of ALL) {
      const key = `${s.key}|${v.key}`;
      const per = {};
      let fired = 0, calls = 0, sac = 0, te = 0;
      for (const y of years) {
        const pool = pools[y];
        const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual[fmt] }]));
        const { pure, ranked } = vbdBoard(pool, league, fmt);
        const survOf = survivalSource(v);
        const ctx0 = { pure, ranked, league, poolForFloor: ranked, survOf };
        const d = [];
        for (let r = 0; r < RUNS; r++) {
          const field = noisyField(pool, fld, sdKey, y * 1000 + r * 7919 + 11);
          const o = pointsDiffs({ v, ctx0, actual, field, league, step: 1 });
          d.push(...o.diffs);
          fired += o.fired; calls += o.calls; sac += o.sacrificed; te += o.teFrom;
        }
        per[y] = r1(mean(d));
      }
      perSeason[key] = per;
      const arr = years.map((y) => per[y]);
      cells[key] = { shape: s.key, variant: v.key, label: v.label, kind: v.kind,
                     surv: v.surv, mean: r1(mean(arr)), t: tOf(arr),
                     winYears: arr.filter((x) => x > 0).length, years: arr.length,
                     boot: null };
      fireStats[key] = { fired, calls, fireRate: r3(calls ? fired / calls : 0),
                         vbdSacrificedPerFire: r1(fired ? sac / fired : 0),
                         teWasTopShare: r3(fired ? te / fired : 0) };
    }
    process.stdout.write(`  ${s.key} `);
    console.log("hólf reiknud");
  }

  /* --- G1: SJALFSPROFID --- */
  for (const s of SHAPES) {
    const c = cells[`${s.key}|shipped`];
    if (c.mean !== 0 || Object.values(perSeason[`${s.key}|shipped`]).some((x) => x !== 0)) {
      console.error(`\n  G1 FELLUR (${s.key}): bord gegn sjalfu ser gefur ${c.mean}, ekki 0.` +
        ` Hermunin er osamhverf og HVER einasta tala hér merkingarlaus.`);
      process.exit(2);
    }
  }
  console.log("\nG1 sjalfsprofid (sent gegn sjalfu ser = 0 i ollum lognunum)  OK");

  /* --- G2: REGLAN VERDUR AD VERA LIFANDI --- */
  const liveCells = Object.entries(cells).filter(([k, c]) => c.variant !== "shipped" && c.mean !== 0);
  const anyFire = Object.entries(fireStats).some(([k, f]) => !k.endsWith("|shipped") && f.fired > 0);
  if (!liveCells.length || !anyFire) {
    console.error("\n  G2 FELLUR: engin fruma hreyfist / reglan kviknar aldrei." +
      " Thad er villa i bordinu, ekki nidurstada. Skrifa EKKERT.");
    process.exit(2);
  }
  console.log(`G2 reglan er lifandi: ${liveCells.length} frumur hreyfast, ` +
    `haesta kviknunartidni ${r3(Math.max(...Object.entries(fireStats)
      .filter(([k]) => !k.endsWith("|shipped")).map(([, f]) => f.fireRate)))}  OK`);

  /* ============================================================
     8. PLACEBO-THAKID
     ============================================================
     Barinn er thakid, ekki nullid. Atta placebo-fraekorn + andhverf
     lifun gegnum SOMU rist; haesta jakvaeda hólf theirra er thad sem
     havadi LITUR UT EINS OG hér.                                    */
  const plcCeiling = {};
  for (const s of SHAPES) {
    const vals = PLC.map((v) => cells[`${s.key}|${v.key}`].mean).filter((x) => x != null);
    const pooled = vals.length ? mean(vals) : null;
    plcCeiling[s.key] = { max: r1(Math.max(...vals)), min: r1(Math.min(...vals)),
                          pooledMean: r1(pooled), n: vals.length };
  }

  /* ============================================================
     9. BOOTSTRAP — TIMABIL OG PER LEIKMANN
     ============================================================
     Timabils-klösunin (`bootstrapDiff` ur `src/learn.js`) svarar
     "flökta arin?". Su per leikmanni svarar odru: "flökta
     LEIKMENNIRNIR?" — og hun er su sem felldi 0 af 153 i `vbdbase-lab`
     og 0 af 102 i TE-sveipnum. **KRAFAN ER AD BADAR UTILOKI NULL.**  */
  const zeroSeason = Object.fromEntries(years.map((y) => [y, 0]));
  for (const [k, c] of Object.entries(cells)) {
    const b = bootstrapDiff(perSeason[k], zeroSeason, 2000, 424242);
    c.boot = b ? { lo: r1(b.lo), hi: r1(b.hi), excludesZero: b.excludesZero } : null;
  }

  /* Per-leikmanns bootstrap ADEINS a headline-hólfum — hann er dyr og
     ristin er stor. Valid er GAGNSAETT: sent, thrju EV-form, badir
     mekanisma-armar vid Y=15, og BESTA threskulds-hólfid per lognun
     (sem er valid EFTIR A og thad er sagt — thess vegna er
     placebo-thakid lika reiknad a somu rist). */
  const headlineKeys = {};
  for (const s of SHAPES) {
    const thr = REAL.filter((v) => v.kind === "thr" && v.surv === "real")
      .map((v) => ({ v, m: cells[`${s.key}|${v.key}`].mean }))
      .sort((a, b) => b.m - a.m);
    headlineKeys[s.key] = ["ev-raw", "ev-cross", "ev-pos", "adpward|15", "deferTE|15",
                           "ev-raw#degsd", "ev-cross#degsd",
                           thr[0].v.key, "tiebreak|15"];
  }

  const playerBoot = {};
  if (BOOT > 0) {
    console.log(`\nbootstrap klasad per leikmann (${BOOT} itranir, ${PAIRS} par) …`);
    for (const s of SHAPES) {
      const fmt = s.fmt, fld = ADP_FIELD[fmt], sdKey = SD_FIELD[fld], league = s.league;
      const keys = headlineKeys[s.key];
      const acc = {}; for (const k of keys) acc[k] = [];
      const step = Math.max(1, Math.round(league.teams / PAIRS));
      for (let b = 0; b < BOOT; b++) {
        const iter = {}; for (const k of keys) iter[k] = [];
        for (const y of years) {
          const src = pools[y];
          const rnd = rngOf(y * 100003 + b * 7919 + 17);
          const res = [];
          for (let i = 0; i < src.length; i++) {
            const p = src[Math.floor(rnd() * src.length)];
            res.push({ ...p, id: `${p.id}#${i}` });
          }
          const actual = new Map(res.map((p) => [p.id, { pos: p.pos, pts: p.actual[fmt] }]));
          const field = noisyField(res, fld, sdKey, y * 7 + b * 104729 + 3);
          const { pure, ranked } = vbdBoard(res, league, fmt);
          for (const k of keys) {
            const v = ALL.find((x) => x.key === k);
            const survOf = survivalSource(v);
            const ctx0 = { pure, ranked, league, poolForFloor: ranked, survOf };
            iter[k].push(mean(pointsDiffs({ v, ctx0, actual, field, league, step }).diffs));
          }
        }
        for (const k of keys) if (iter[k].length) acc[k].push(mean(iter[k]));
      }
      for (const k of keys) {
        const a = acc[k];
        if (a.length < 50) { playerBoot[`${s.key}|${k}`] = null; continue; }
        a.sort((x, z) => x - z);
        const lo = a[Math.floor(a.length * 0.025)], hi = a[Math.floor(a.length * 0.975)];
        playerBoot[`${s.key}|${k}`] = { runs: a.length, lo: r1(lo), hi: r1(hi),
          median: r1(a[Math.floor(a.length / 2)]), excludesZero: lo > 0 || hi < 0 };
      }
      process.stdout.write(".");
    }
    console.log("");
    for (const [k, pb] of Object.entries(playerBoot)) if (cells[k]) cells[k].bootPlayer = pb;
  }

  /* ============================================================
     10. SIGRAR — SAMA SPURNING, ANNAR MAELIKVARDI
     ============================================================ */
  const winCells = {};
  {
    const weekly = {};
    for (let y = 2019; y <= 2025; y++) {
      try { weekly[y] = JSON.parse(await readFile(path.join(DATA, "weekly", `${y}.json`), "utf8")); }
      catch { /* vantar */ }
    }
    const wYears = Object.keys(weekly).map(Number).filter((y) => pools[y]).sort((a, b) => a - b);
    console.log(`\nSIGRAR — ${wYears.length} timabil (${wYears.join(", ")})`);
    if (wYears.length >= 5) {
      for (const s of SHAPES) {
        const fmt = s.fmt, fld = ADP_FIELD[fmt], sdKey = SD_FIELD[fld], league = s.league;
        const keys = headlineKeys[s.key];
        for (const k of ["shipped", ...keys, ...PLC_GRID.map((g) => `plc1|${g.tag}`),
                         ...PLC_GRID.map((g) => `rev|${g.tag}`)]) {
          const v = ALL.find((x) => x.key === k);
          if (!v) continue;
          const per = {};
          for (const y of wYears) {
            /* Laugin er features-laugin (svo hun se samanburdarhaef vid
               stiga-armana) og TAGLID er framlengt ur vikugognunum svo
               engin byrjunarsaeti standi tom — tomt saeti er 0 stig, sem
               er havadi sem litur ut eins og utkoma. */
            const pool = pools[y];
            const have = new Set(pool.map((p) => p.id));
            const byWeek = new Map();
            const seenTail = new Map();
            for (const r of weekly[y]) {
              if (!POSES.includes(r.pos) || r.week > 18) continue;
              const pts = fmt === "ppr" ? r.ppr : fmt === "half" ? r.half : r.std;
              if (pts == null) continue;
              byWeek.set(`${r.id}|${r.week}`, { pos: r.pos, pts });
              if (!have.has(r.id)) {
                const t = seenTail.get(r.id) || { id: r.id, pos: r.pos, name: r.name, tot: 0 };
                t.tot += pts; seenTail.set(r.id, t);
              }
            }
            const { pure, ranked } = vbdBoard(pool, league, fmt);
            /* Taglid: allir sem eiga vikugogn en engin ADP/spa. Their
               eru radadir eftir FYRRA timabili (gangandi forgildi), svo
               engin framtidarvitneskja fer i rodina — og their sitja
               ALLIR undir features-lauginni, svo reglan (sem starfar i
               toppnum) snertir tha aldrei. */
            const prevTot = new Map();
            if (weekly[y - 1]) for (const r of weekly[y - 1]) {
              const pts = fmt === "ppr" ? r.ppr : fmt === "half" ? r.half : r.std;
              if (pts != null) prevTot.set(r.id, (prevTot.get(r.id) || 0) + pts);
            }
            const tail = [...seenTail.values()]
              .sort((a, b) => (prevTot.get(b.id) || 0) - (prevTot.get(a.id) || 0));
            const boardFull = new Map(pure);
            let n = boardFull.size;
            for (const t of tail) boardFull.set(t.id, ++n);
            const actualSeason = new Map();
            for (const p of pool) actualSeason.set(p.id, { pos: p.pos, pts: p.actual[fmt] });
            for (const t of tail) actualSeason.set(t.id, { pos: t.pos, pts: t.tot });
            const survOf = survivalSource(v);
            const ctx0 = { pure: boardFull, ranked, league, poolForFloor: ranked, survOf };
            const field0 = noisyField(pool, fld, sdKey, y * 13 + 5);
            const fieldFull = new Map(field0);
            let m = fieldFull.size;
            for (const t of tail) fieldFull.set(t.id, ++m);
            const d = [];
            for (let r = 0; r < WINRUNS; r++) {
              d.push(...winsDiff({ v, ctx0, actualSeason, byWeek,
                field: r === 0 ? fieldFull
                  : (() => { const f = new Map(noisyField(pool, fld, sdKey, y * 1000 + r * 6151));
                             let q = f.size; for (const t of tail) f.set(t.id, ++q); return f; })(),
                league, seed: y * 991 + r * 37, step: 1 }));
            }
            per[y] = r2(mean(d));
          }
          const arr = wYears.map((y) => per[y]);
          const zero = Object.fromEntries(wYears.map((y) => [y, 0]));
          const bt = bootstrapDiff(per, zero, 2000, 90210);
          winCells[`${s.key}|${k}`] = { shape: s.key, variant: k, mean: r2(mean(arr)),
            t: tOf(arr), winYears: arr.filter((x) => x > 0).length, years: arr.length,
            perSeason: per, boot: bt ? { lo: r2(bt.lo), hi: r2(bt.hi),
              excludesZero: bt.excludesZero } : null };
        }
        /* G1 fyrir sigra: sent gegn sjalfu ser = nakvaemlega 0. */
        const z = winCells[`${s.key}|shipped`];
        if (z && z.mean !== 0) {
          console.error(`\n  G1(sigrar) FELLUR (${s.key}): ${z.mean}, ekki 0.`);
          process.exit(2);
        }
        console.log(`  ${s.key}: nullhlid OK`);
      }
    } else {
      console.log("  of fa timabil med vikugognum — sleppt");
    }
  }

  /* ============================================================
     11. UTPRENTUN
     ============================================================ */
  const BAR = (c, pb, ceil) => {
    if (c.mean == null || c.mean <= 0) return "";
    const okSeason = c.boot && c.boot.excludesZero;
    const okPlayer = pb && pb.excludesZero;
    const okCeil = c.mean > ceil;
    const okYears = c.winYears > c.years / 2;
    return (okSeason && okPlayer && okCeil && okYears) ? "  ***STENST***"
      : `  ${okSeason ? "s" : "-"}${okPlayer ? "p" : "-"}${okCeil ? "c" : "-"}${okYears ? "y" : "-"}`;
  };

  for (const s of SHAPES) {
    const ceil = plcCeiling[s.key].max;
    console.log(`\n\n=== ${s.label} ===`);
    console.log(`placebo-thak ${sgn(ceil)} stig  ·  placebo-lagmark ${sgn(plcCeiling[s.key].min)}` +
      `  ·  pooled ${sgn(plcCeiling[s.key].pooledMean)}  (${plcCeiling[s.key].n} hólf)`);
    console.log(`\n${"afbrigdi".padEnd(26)}${"stig".padStart(8)}${"t".padStart(8)}` +
      `${"ar+".padStart(6)}  ${"ars-CI".padEnd(20)}${"leikm.-CI".padEnd(20)}kviknar  bar`);
    const rows = REAL.filter((v) => v.key !== "shipped");
    const sorted = [...rows].sort((a, b) =>
      cells[`${s.key}|${b.key}`].mean - cells[`${s.key}|${a.key}`].mean);
    for (const v of sorted) {
      const c = cells[`${s.key}|${v.key}`], f = fireStats[`${s.key}|${v.key}`];
      const pb = playerBoot[`${s.key}|${v.key}`] || null;
      console.log(`${v.key.padEnd(26)}${sgn(c.mean).padStart(8)}` +
        `${String(c.t ?? "-").padStart(8)}${`${c.winYears}/${c.years}`.padStart(6)}  ` +
        `${(c.boot ? `[${sgn(c.boot.lo)}, ${sgn(c.boot.hi)}]${c.boot.excludesZero ? "*" : ""}` : "-").padEnd(20)}` +
        `${(pb ? `[${sgn(pb.lo)}, ${sgn(pb.hi)}]${pb.excludesZero ? "*" : ""}` : "").padEnd(20)}` +
        `${String(f.fireRate).padStart(6)}${BAR(c, pb, ceil)}`);
    }
  }

  if (Object.keys(winCells).length) {
    console.log(`\n\n=== SIGRAR (af ${REG_WEEKS}) ===`);
    for (const s of SHAPES) {
      console.log(`\n${s.key}`);
      const ks = Object.keys(winCells).filter((k) => k.startsWith(`${s.key}|`));
      const plcW = ks.filter((k) => /\|plc\d|\|rev\|/.test(k)).map((k) => winCells[k].mean);
      const ceilW = plcW.length ? Math.max(...plcW) : null;
      console.log(`  placebo-thak (sigrar) ${ceilW == null ? "-" : sgn(ceilW, 2)}`);
      for (const k of ks.sort((a, b) => winCells[b].mean - winCells[a].mean)) {
        const c = winCells[k];
        console.log(`  ${c.variant.padEnd(26)}${sgn(c.mean, 2).padStart(8)}` +
          `${String(c.t ?? "-").padStart(8)}${`${c.winYears}/${c.years}`.padStart(6)}  ` +
          (c.boot ? `[${sgn(c.boot.lo, 2)}, ${sgn(c.boot.hi, 2)}]${c.boot.excludesZero ? "*" : ""}` : ""));
      }
    }
  }

  /* --- MEKANISMINN: er thetta lifun eda bara ADP? --- */
  const mech = {};
  for (const s of SHAPES) {
    const g = (k) => cells[`${s.key}|${k}`]?.mean ?? null;
    mech[s.key] = {
      bestThr: Math.max(...REAL.filter((v) => v.kind === "thr" && v.surv === "real")
        .map((v) => g(v.key))),
      adpward: { 3: g("adpward|3"), 8: g("adpward|8"), 15: g("adpward|15"), 25: g("adpward|25") },
      deferTE: { 3: g("deferTE|3"), 8: g("deferTE|8"), 15: g("deferTE|15"), 25: g("deferTE|25") },
      evRaw: g("ev-raw"), evCross: g("ev-cross"), evPos: g("ev-pos"),
      teWasTopShare: fireStats[`${s.key}|thr|0.7|15|0.25`]?.teWasTopShare ?? null,
    };
  }
  console.log(`\n\n=== MEKANISMI ===`);
  for (const s of SHAPES) {
    const m = mech[s.key];
    console.log(`${s.key}: besta threskulds-hólf ${sgn(m.bestThr)} · ` +
      `markads-att(15) ${sgn(m.adpward[15])} · sleppa-TE(15) ${sgn(m.deferTE[15])} · ` +
      `TE var efstur i ${Math.round((m.teWasTopShare ?? 0) * 100)}% kviknana`);
  }

  /* --- NAEMNI a `adpSd` --- */
  const sdSens = {};
  for (const s of SHAPES) {
    const pick = (k) => cells[`${s.key}|${k}`]?.mean ?? null;
    sdSens[s.key] = {
      evRaw: { real: pick("ev-raw"), degraded: pick("ev-raw#degsd") },
      evCross: { real: pick("ev-cross"), degraded: pick("ev-cross#degsd") },
      thr: Object.fromEntries(THR_Y.map((Y) => [Y, {
        real: pick(`thr|0.7|${Y}|0.25`), degraded: pick(`thr|0.7|${Y}|0.25#degsd`) }])),
    };
  }

  /* --- LIFANDI BORDID: einkennid sem notandinn sa --- */
  let liveShape = null;
  try {
    const { buildRows, normalizeLeague } = await import("../src/build.js");
    const J = async (f) => { try {
      return JSON.parse(await readFile(path.join(DATA, f), "utf8")); } catch { return null; } };
    const players = await J("players.json");
    const pRows = players?.rows || players?.players || players;
    const [seasons, accuracy, experts, schedule, market] = await Promise.all(
      ["seasons.json", "accuracy.json", "experts.json", "schedule.json", "market.json"].map(J));
    liveShape = {};
    for (const [k, raw] of [
      ["10-2flex", { teams: 10, scoring: "ppr", rounds: 15,
                     starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 } }],
      ["12-2flex", { teams: 12, scoring: "half-ppr", rounds: 14,
                     starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 } }],
    ]) {
      const lg = normalizeLeague(raw);
      const { rows } = buildRows({ players: pRows, seasons, accuracy, experts, schedule, market, league: lg });
      const board = rows.filter((r) => r.vbd != null && !["K", "DST"].includes(r.pos))
        .sort((a, b) => b.vbd - a.vbd);
      const priced = board.filter((r) => r.adp != null);
      const T = lg.teams;
      const snaps = [];
      for (const pick of [17, 24, 37, 77]) {
        const round = Math.ceil(pick / T), idx = pick - (round - 1) * T;
        const slot = round % 2 === 1 ? idx : T - idx + 1;
        const np = nextOwnPick(pick, T, slot, lg.rounds || 15);
        if (np == null) continue;
        const gone = new Set(priced.slice().sort((a, b) => a.adp - b.adp)
          .slice(0, pick - 1).map((r) => r.id));
        const top = board.filter((r) => !gone.has(r.id)).slice(0, 4).map((r) => ({
          name: r.name, pos: r.pos, vbd: r1(r.vbd), adp: r.adp, adpSd: r1(r.adpSd),
          lasts: r.adp == null ? null : r2(survivalProb(r.adp, r.adpSd, np)) }));
        snaps.push({ pick, slot, nextPick: np, top });
      }
      liveShape[k] = { boardRows: board.length, priced: priced.length,
        withRealSd: priced.filter((r) => r.adpSd != null && r.adpSd > 0).length, snaps };
    }
  } catch (e) { liveShape = { error: String(e && e.message || e) }; }

  /* ============================================================
     12. SKRIFAD
     ============================================================ */
  const verdict = {};
  for (const s of SHAPES) {
    const ceil = plcCeiling[s.key].max;
    const pass = [];
    for (const v of REAL) {
      if (v.key === "shipped") continue;
      const c = cells[`${s.key}|${v.key}`], pb = playerBoot[`${s.key}|${v.key}`] || null;
      if (c.mean > 0 && c.boot?.excludesZero && pb?.excludesZero
          && c.mean > ceil && c.winYears > c.years / 2) pass.push(v.key);
    }
    const evaluated = headlineKeys[s.key].length;   // hólf sem barinn MAT (per-leikmanns CI til)
    verdict[s.key] = { cellsTotal: REAL.length - 1, cellsBarEvaluated: evaluated,
                       passing: pass, placeboCeiling: ceil };
  }

  await mkdir(path.join(DATA, "measure"), { recursive: true });
  const out = {
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: DEFAULTS,
      resolved: { runs: RUNS, boot: BOOT, from: FROM, winruns: WINRUNS, pairs: PAIRS },
      inputs: ["features.json", "weekly/*.json", "measure/waiver.json", "players.json"],
      dataDir: DATA }),
    question: "Ma LIFUNARLIKUR rada TIMASETNINGU — taka thann sem lifir SIDUR thegar " +
      "bilid i VBD er minna en vaenta tapid? Thetta er ONNUR regla en `urgencyDrivesOrder` " +
      "(stodu-bradanauðsyn) og onnur en `tiebreak-lab` (sem spurdi hvorki um X ne Z).",
    design: {
      seasons: years, shapes: SHAPES.map((s) => ({ key: s.key, fmt: s.fmt, label: s.label })),
      grid: { X: THR_X, Y: THR_Y, Z: THR_Z },
      variants: REAL.length, placebos: PLC.length,
      runsPerSeason: RUNS, mirrored: true,
      draftsPerCellSeason: SHAPES.map((s) => `${s.key}: ${RUNS * s.league.teams * 2}`),
      metric: "stig byrjunarlids (startersPoints, timabils-summa) og SIGRAR (scoreLeague, 14 vikur)",
      pool: "features.json — pordu ppr/standard radir, half = (ppr + std)/2 upp a stig " +
        "(sama gler og vbdbase-lab og h2h-lab)",
      field: "ADP hrist med sinu eigin adpSd (noisyField), hver umferd nytt fraekorn",
      halfAdp: "sogulegt half-PPR ADP er ekki til (half-lab) — 12-2flex er maeld med ppr-ADP " +
        "sem velli og thad er takmorkun, ekki val",
      clustering: "TVAER klösun: per TIMABIL (bootstrapDiff) og per LEIKMANN (laugin " +
        "endursyndud innan ars). KRAFAN ER AD BADAR UTILOKI NULL — README 4c",
      barrier: "jakvaett + ars-CI utilokar null + leikmanna-CI utilokar null + " +
        "yfir placebo-thaki + jakvaett i meirihluta ara",
    },
    gates: { G0_shapeAnchor: shapeGuard, G1_selfNull: "0 i ollum lognunum",
             G2_ruleLive: `${liveCells.length} frumur hreyfast`,
             G3_boardInjection: "promote() skilar NYJU korti — profad ser",
             G4_anchors: anchors },
    sdCoverage: { historical: sdCov,
      note: "sogulega laugin ber RAUNVERULEGT adpSd a 100% rada; lifandi bordid gerir thad " +
        "ekki — sja `liveBoard.*.withRealSd`. Thess vegna er `#degsd`-armurinn til." },
    placeboCeiling: plcCeiling,
    cells, perSeason, fireStats, playerBootstrap: playerBoot,
    winCells, mechanism: mech, sdSensitivity: sdSens,
    liveBoard: liveShape,
    verdict,
    unmeasured: {
      waiver: "hoparnir eru fastir allt timabilid — sama takmorkun og h2h-lab bokar",
      kdst: "K og DST eru utan draftsins (excludePos); saetin skora 0 hja OLLUM lidum i " +
        "10-2flex og fella thvi ut ur hverjum mun",
      opponentSequencing: "motherjarnir drafta eftir ADP og nota EKKI thessa reglu. " +
        "Regla sem allir nota getur maelst annad — thad er OMAELT hér",
      lineupOracle: "vikulega byrjunarlidid er valid af RAUNSTIGUM vikunnar, sem VERDLAUNAR " +
        "sveiflu (README 5m). Thad gildir EINS um bada arma en talan ma ekki lesast sem " +
        "hrein spa-utkoma",
      liveBoardDate: "`liveBoard` er DAEMI MED DAGSETNINGU, ekki fasti — players.json er " +
        "endurskrifud daglega (README 4b)",
    },
  };
  await writeFile(path.join(DATA, "measure", "sequencing.json"), JSON.stringify(out, null, 1));
  console.log(`\n-> data/measure/sequencing.json`);
  for (const s of SHAPES) {
    console.log(`   ${s.key}: ${verdict[s.key].passing.length} af ` +
      `${verdict[s.key].cellsBarEvaluated} mötnum hólfum standast barinn`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
