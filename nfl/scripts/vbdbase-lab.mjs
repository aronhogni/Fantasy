#!/usr/bin/env node
/* ============================================================
   vbdbase-lab.mjs — ER VARAMANNS-GRUNNURINN RETT VALINN?

     node scripts/vbdbase-lab.mjs [--runs=4] [--boot=400] [--from=2015]

   -> data/measure/vbdbase.json

   SPURNINGIN. A-Ranking er: spa Sleeper -> VBD -> rod. `replacementRanks`
   i `model.js` setur varamanns-threpid a ROD (starters x lid, plus
   maeld FLEX-skipting), og `computeVbd` tekur grunngildid sem MEDALTAL
   THRIGGJA i kringum thad saeti. Hvorug akvordunin hefur verid maeld
   gegn odrum kostum I THEIM LOGUNUM SEM NOTANDINN SPILAR.

   OG KJARNI SPURNINGARINNAR: er besti grunnurinn OLIKUR milli PPR og
   half-PPR? Mottokur thjappa RB og WR saman, svo thad er raunveruleg
   astaeda til ad aetla ad threpid liggi annars stadar. Se hann sa sami
   er thad LIKA nidurstada.

   HVAD ER THEGAR MAELT OG MA EKKI ENDURMAELA (README kafli 5b, 5h):
     · `arank-lab.mjs` profadi FIMM fasta threpa-lista ("last starter",
       "one round deeper", "drafted count", "waiver level") x skerping
       x blondun = 45 afbrigdi. Besta i hrari leit gaf +109 gegn Sleeper
       i stad +76 — og WALK-FORWARD gaf +46, sem er LAKARA. Leitin fann
       havada. Thad var i EINNI logun (12 lid, einn FLEX, PPR/standard)
       og adeins med threpa-lista sem HEILD, aldrei per stodu.
     · KVIKT VBD (threp endurreiknad ur theim sem eru eftir, eda ur
       naesta vali) er MAELT OG FELLT: -89, -31, -97, +12. Thad er ekki
       endurmaelt her.
   THETTA ER THVI EKKI ENDURTEKNING heldur onnur spurning: BREIDD
   glugganns, HLIDRUN per stodu, POOLADUR FLEX-grunnur, og grunnur ur
   theim sem raunverulega voru settir i byrjunarlid — i THREMUR LOGUNUM
   x THREMUR SNIDUM, thar med half-PPR sem enginn threpa-maeling hefur
   nad yfir.

   HALF-PPR ER REIKNUD UPP A STIG, ekki interpolud: PPR = STD + mottokur,
   svo HALF = (STD + PPR)/2. Algebra. Sama leid og `half-lab.mjs` — og
   laugin er byggd EINS thar svo tolurnar her seu samanburdarhaefar vid
   `HALF_LAB` i `rulebasis.js`.

   MAELIKVARDINN ER AKVORDUNIN. Bordin drafta BADI I SOMU DEILD, ur somu
   laug, gegn sama velli, i baedar attir — sama porun og `arank-lab.mjs`
   notar, thvi ars-havadinn (sd ~150 stig) er margfalt staerri en
   munurinn sem er maeldur. Fylgni er EKKI maelikvardinn her; README
   kafli 5b: "haerri fylgni er ekki sama og betri akvordun".

   THRJU PROF, OG BADI VIKMORKIN VERDA AD UTILOKA NULL:
     1. pardur t med KLASA = TIMABIL (ars-medaltol)
     2. bootstrap klasad per TIMABIL (`bootstrapDiff`, repo-stadallinn)
     3. bootstrap klasad PER LEIKMANN, laugin endursyndud innan ars
        (>=400 itranir) — sja notu vid `playerBootstrap` um hvers vegna
        klonun er notud og hvad hun kostar.

   LEKAVARNIR:
     · Bordin fa ADEINS { id, pos, proj }. Ekkert `pts` kemst inn i
       bordsmidina — thad er BYGGINGARLEG vorn, ekki athugasemd.
     · Hlidrun per stodu er FITTUD A ARUM A UNDAN og beitt a arid sjalft.
     · "Startable"-grunnurinn er reiknadur UR VIKUGOGNUM TIMABILA A
       UNDAN. Skriftan DEYR ef timabil >= profarid raetist thar inn.
     · Val a milli afbrigda er lika walk-forward; hra leitin er birt en
       hun er MERKT sem urtaksval.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft } from "../src/accuracy.js";
import { replacementRanks, computeVbd, tierize, FLEX_SPLIT } from "../src/model.js";
import { mean, bootstrapDiff } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  runs: "number", boot: "number", from: "number", bootpairs: "number",
});
const RUNS = Number(ARG.runs ?? 4);          // havada-keyrslur a vellinum
const BOOT = Number(ARG.boot ?? 400);        // leikmanna-bootstrap, 0 = sleppa
const BOOT_PAIRS = Number(ARG.bootpairs ?? 4);
const FROM = Number(ARG.from ?? 2015);
const FIT_PAIRS = 6;                         // saetapor i walk-forward fitti

const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const sgn = (x) => (x == null ? "   -" : (x > 0 ? "+" : "") + x.toFixed(1));

/* Tvi-hlida t-mork vid p=0,05. Fjoldi ara er EKKI fasti (11 fyrir fost
   afbrigdi, 10 fyrir fittud, 6 fyrir startable) svo throskuldurinn ma
   ekki vera hardkodadur — sama regla og `tCrit` i rulebasis.js. */
const T_CRIT = { 2: 12.706, 3: 4.303, 4: 3.182, 5: 2.776, 6: 2.571, 7: 2.447,
                 8: 2.365, 9: 2.306, 10: 2.262, 11: 2.228 };
const tCrit = (n) => T_CRIT[Math.min(11, Math.max(2, n))] ?? 2.228;

/** Ars-medaltol -> { mean, t, se, lo, hi, wins, years, significant }. */
function seasonStats(perSeason) {
  const ys = Object.keys(perSeason).filter((y) => perSeason[y] != null);
  const vals = ys.map((y) => perSeason[y]);
  if (vals.length < 2) {
    return { mean: r1(vals.length ? vals[0] : null), t: null, se: null,
             lo: null, hi: null, wins: vals.filter((v) => v > 0).length,
             years: vals.length, significant: false };
  }
  const m = mean(vals);
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / (vals.length - 1));
  const se = sd / Math.sqrt(vals.length);
  const t = se ? m / se : null;
  const crit = tCrit(vals.length);
  return { mean: r1(m), t: r3(t), se: r1(se),
           lo: r1(m - crit * se), hi: r1(m + crit * se),
           wins: vals.filter((v) => v > 0).length, years: vals.length,
           significant: t != null && Math.abs(t) > crit };
}

/* ============================================================
   1. LAUGIN — BYGGD EINS OG I `half-lab.mjs`
   ============================================================
   Sama porun (`id`+`season` milli ppr- og standard-rada), sama spa-val
   (`sleeperProj` ef hun er til, annars `ffProj`), sama half-algebra.
   Astaedan er ekki leti: se laugin onnur er talan her ekki
   samanburdarhaef vid `HALF_LAB` i rulebasis.js, og tha er ekki haegt
   ad segja hvort munur komi fra grunninum eda fra lauginni.          */

const FORMATS = ["ppr", "half", "standard"];
const FIELDS = ["adpPpr", "adpStd"];
/* Hvort ADP-bord er ADAL-talan per snid. Half-PPR hefur EKKERT sogulegt
   ADP (sja half-lab) svo hun er maeld med badum sem VIKMORK; ppr og
   standard hafa sitt eigid. */
const PRIMARY_FIELD = { ppr: "adpPpr", half: "adpPpr", standard: "adpStd" };

const SHAPES = [
  { key: "10-2flex", label: "10 lid, 2 FLEX, ppr (Patriots)",
    league: { teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 15,
              flexPos: ["RB", "WR", "TE"], superflex: false, excludePos: ["K", "DST"] } },
  { key: "12-2flex", label: "12 lid, 2 FLEX, half (Sofahetjur)",
    league: { teams: 12, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 14,
              flexPos: ["RB", "WR", "TE"], superflex: false, excludePos: ["K", "DST"] } },
  /* Almenna lognin sem ALLT annad i verkefninu var maelt i (README 5b).
     Hun er her svo haegt se ad sja hvort utkoman se serstok fyrir
     tveggja-FLEX deildirnar eda almenn. */
  { key: "12-std", label: "12 lid, 1 FLEX, WR3 (almenna lognin)",
    league: { teams: 12, starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 14,
              flexPos: ["RB", "WR", "TE"], superflex: false, excludePos: ["K", "DST"] } },
];

async function buildPools() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const byKey = { ppr: new Map(), standard: new Map() };
  for (const r of feats.rows) {
    if (!byKey[r.scoring]) continue;
    byKey[r.scoring].set(`${r.season}|${r.id}`, r);
  }
  let paired = 0, unpaired = 0;
  for (const k of byKey.ppr.keys()) (byKey.standard.has(k) ? paired++ : unpaired++);

  const pools = {};
  for (const [k, a] of byKey.ppr) {
    const y = Number(k.split("|")[0]);
    if (y < FROM || y > 2025) continue;
    const b = byKey.standard.get(k);
    if (!b || a.adp == null || b.adp == null) continue;
    const pj = a.sleeperProj != null ? a.sleeperProj : a.ffProj;
    const sj = b.sleeperProj != null ? b.sleeperProj : b.ffProj;
    if (a.pts == null || b.ptsStd == null) continue;
    if (pj == null || sj == null) continue;
    (pools[y] = pools[y] || []).push({
      id: a.id, pos: a.pos, name: a.name,
      adpPpr: a.adp, adpStd: b.adp,
      /* Stadalfravik ADP er notad til ad hrista vollinn. Vantar hun er
         nalgunin ur arank-lab notud — og hun er MERKT sem nalgun. */
      sdPpr: a.adpSd, sdStd: b.adpSd,
      proj: { ppr: pj, standard: sj, half: (pj + sj) / 2 },
      actual: { ppr: a.pts, standard: b.ptsStd, half: (a.pts + b.ptsStd) / 2 },
    });
  }
  for (const y of Object.keys(pools)) if (pools[y].length < 120) delete pools[y];
  return { pools, paired, unpaired, adpWindows: feats.adpWindows || null };
}

/* ============================================================
   2. GRUNNARNIR — AFBRIGDIN SEM ERU PROFUD
   ============================================================ */

/** Medaltal glugga med halfbreidd k um saeti `rank1` (1-radad). */
function windowMean(vals, rank1, k) {
  if (!vals.length) return 0;
  const i = Math.min(vals.length - 1, Math.max(0, Math.round(rank1) - 1));
  const lo = Math.max(0, i - k), hi = Math.min(vals.length - 1, i + k);
  let s = 0;
  for (let j = lo; j <= hi; j++) s += vals[j];
  return s / (hi - lo + 1);
}

/**
 * VIDMIDID ER SHIPPED KODINN SJALFUR, EKKI ENDURRITUN A HONUM.
 *
 * Fyrsta utgafan afritadi reglu `computeVbd` inn i thessa skra. Thad er
 * NAKVAEMLEGA su villa sem `prediction-ledger` i FPL-verkefninu var
 * skrifad til ad banna: afritid getur rekid fra frumritinu og tha maelir
 * labbid annad en appid birtir. Vidmidid kallar thvi `computeVbd` og
 * `replacementRanks` beint ur `src/model.js`.
 */
function currentBoard(pool, league, fmt) {
  const scored = computeVbd(
    pool.map((p) => ({ id: p.id, pos: p.pos, proj: p.proj[fmt] })), league);
  const live = scored.filter((p) => p.vbd != null).sort((a, b) => b.vbd - a.vbd);
  const board = new Map(live.map((p, i) => [p.id, i + 1]));
  const base = {};
  for (const p of live) base[p.pos] = p.replacement;
  board.__base = base;
  board.__top24 = countPos(live.slice(0, 24).map((p) => [p.id, 0, p.pos]));
  return board;
}

/** Laugin rodud per stodu, fallandi spa — inntak allra grunn-reglna. */
function sortByPos(pool, fmt) {
  const byPos = {};
  for (const p of pool) {
    const v = p.proj[fmt];
    if (v == null) continue;
    (byPos[p.pos] = byPos[p.pos] || []).push({ id: p.id, proj: v });
  }
  for (const list of Object.values(byPos)) list.sort((a, b) => b.proj - a.proj);
  return byPos;
}

/**
 * Grunngildi per stodu fyrir eitt afbrigdi.
 *
 * `spec.ranks`  saeti per stodu (fra `replacementRanks`, hlidrad, eda
 *               maelt ur vikugognum)
 * `spec.k`      halfbreidd glugganns (0 = einn madur; 1 = thad sem
 *               `computeVbd` gerir i dag)
 * `spec.flexMix` 0 = saeti per stodu (nuverandi hattur), 1 = EITT
 *               sameiginlegt FLEX-threp ur pooludum afgangi, millistig
 *               er blanda.
 */
function baselinesFor(byPos, league, spec) {
  const out = {};
  const vals = {};
  for (const [pos, list] of Object.entries(byPos)) vals[pos] = list.map((p) => p.proj);
  for (const pos of Object.keys(vals)) {
    const r = spec.ranks[pos];
    out[pos] = r == null || r < 1
      /* Saeti 0 eda vantandi saeti (t.d. K/DST i deild an theirra) —
         versti madur i lauginni, sama bakfall og `computeVbd` hefur. */
      ? (vals[pos].length ? vals[pos][vals[pos].length - 1] : 0)
      : windowMean(vals[pos], r, spec.k);
  }
  if (!spec.flexMix) return out;

  /* POOLADUR FLEX-GRUNNUR. Nuverandi regla faerir hvert saeti DYPRA um
     maeldan FLEX-hlut (`FLEX_SPLIT`) og gefur thannig hverri stodu SITT
     grunngildi. Kenningin segir annad: sa sem thu faerd i FLEX-saetid ef
     thu tekur ekki thennan mann er BESTI LAUSI ur ollum FLEX-stodum, svo
     grunnurinn a ad vera EIN OG SAMA tala fyrir RB, WR og TE. Tholudu
     tolurnar eru leiddar ur lauginni — ekkert nytt fasti er kynnt.  */
  const flexPos = league.flexPos || ["RB", "WR", "TE"];
  const st = league.starters || {};
  const rest = [];
  for (const pos of flexPos) {
    const fixed = (st[pos] || 0) * league.teams;
    for (const p of (byPos[pos] || []).slice(fixed)) rest.push(p.proj);
  }
  rest.sort((a, b) => b - a);
  const seats = (st.FLEX || 0) * league.teams;
  if (!rest.length || seats < 1) return out;
  const poolBase = windowMean(rest, seats, spec.k);
  /* `flexOnly` afmarkar hvada stodur fa poolada grunninn. Thad er
     MEKANISMA-PROF, ekki afbrigdi til ad taka upp: se allur vinningurinn
     i EINNI stodu er nidurstadan "grunnur theirrar stodu er rangt
     settur", ekki "poolun er retta reglan". Full poolun og ein stada eru
     tvaer olikar fullyrdingar og thaer eiga ad maelast sundur. */
  for (const pos of (spec.flexOnly || flexPos)) {
    if (out[pos] == null) continue;
    out[pos] = out[pos] * (1 - spec.flexMix) + poolBase * spec.flexMix;
  }
  return out;
}

function boardFromSpec(pool, league, fmt, spec) {
  const byPos = sortByPos(pool, fmt);
  const base = baselinesFor(byPos, league, spec);
  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    const b = base[pos] ?? 0;
    for (const p of list) scored.push([p.id, p.proj - b, pos]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  const board = new Map(scored.map(([id], i) => [id, i + 1]));
  /* GRUNNGILDIN OG SAMSETNINGIN ERU HENGD A BORDID.
     Astaedan er ekki thaegindi: afbrigdi getur unnid AF ANNARRI ASTAEDU
     en thvi sem thad segist gera. Poolun i 12-2flex/ppr faerir EKKI alla
     thrja jafnt — RB 158,4 -> 167,6 · WR 184,7 -> 167,6 ·
     TE 122,5 -> 167,6 — svo hun gerir TVENNT i einu: DEMOTERAR TE (45
     stig) og faerir WR UPP gagnvart RB. Og hvorugt er ny vitneskja:
     "TE ekki snemma" og "WR tha RB i PPR (+24)" eru BADAR i README 5b.
     Thess vegna er poolunin klofin i `flexpool-te` og `flexpool-rbwr`;
     maelt eru thau nanast SAMLAGANDI (+38,4 og +36,5 a moti +86,5), svo
     badir vegirnir bera merki. Utan thessarar toflu hefdi thetta lesid
     eins og EIN ny regla i stad TVEGGJA gamalla.                      */
  board.__base = base;
  board.__top24 = countPos(scored.slice(0, 24));
  return board;
}

const countPos = (rows) => {
  const c = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const r of rows) if (c[r[2]] != null) c[r[2]]++;
  return c;
};

/* ============================================================
   3. "STARTABLE"-GRUNNURINN — UR VIKUGOGNUM TIMABILA A UNDAN
   ============================================================
   "Dypsti madur sem raunverulega var settur i byrjunarlid" er ekki
   saetistalan. Hun er maelanleg med SOMU adferd og `FLEX_SPLIT` var
   maeld (`calibrate.mjs`): fyllum byrjunarlid allra lida i hverri viku
   ur vikustigum vikunnar, og skodum hvada TIMABILS-saeti their menn
   hafa sem lenda i saeti.

   VARNAGLI SEM MA EKKI FALLA UT: thetta er FULLKOMIN VITNESKJA um
   vikuna (sami artefakt sem `risk-lab.mjs` flaggar). Talan svarar thvi
   "hve djupt na their sem einhver GAT sett i byrjunarlid", ekki "hve
   djupt setti raunverulegur stjornandi". Thess vegna eru THRJU
   hundradshlutfoll birt og valid milli theirra er walk-forward.        */

const WEEK_FIELD = { ppr: "ppr", half: "half", standard: "std" };

async function startableTable(weeklyYears) {
  const cache = {};
  for (const y of weeklyYears) {
    cache[y] = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8"));
  }
  /* Skilar { pos: {p50,p75,p90,deepest} } fyrir eitt ar, eina logun,
     eitt snid. */
  const perYear = (y, league, fmt) => {
    const rows = cache[y];
    const f = WEEK_FIELD[fmt];
    const POS = ["QB", "RB", "WR", "TE"];
    const tot = new Map(), posOf = new Map();
    for (const r of rows) {
      if (!POS.includes(r.pos)) continue;
      const v = r[f];
      if (v == null) continue;
      tot.set(r.id, (tot.get(r.id) || 0) + v);
      posOf.set(r.id, r.pos);
    }
    const seasonRank = new Map();
    for (const p of POS) {
      [...tot.entries()].filter(([id]) => posOf.get(id) === p)
        .sort((a, b) => b[1] - a[1]).forEach(([id], i) => seasonRank.set(id, i + 1));
    }
    const st = league.starters || {}, T = league.teams;
    const flexPos = league.flexPos || ["RB", "WR", "TE"];
    const weeks = [...new Set(rows.map((r) => r.week))].sort((a, b) => a - b);
    const all = { QB: [], RB: [], WR: [], TE: [] };
    const deepest = { QB: [], RB: [], WR: [], TE: [] };
    for (const w of weeks) {
      const byPos = { QB: [], RB: [], WR: [], TE: [] };
      for (const r of rows) {
        if (r.week !== w || !byPos[r.pos] || r[f] == null) continue;
        byPos[r.pos].push(r);
      }
      for (const p of POS) byPos[p].sort((a, b) => b[f] - a[f]);
      const started = [], used = {};
      for (const p of POS) {
        const n = (st[p] || 0) * T;
        used[p] = n;
        for (const r of byPos[p].slice(0, n)) started.push(r);
      }
      const rest = [];
      for (const p of flexPos) rest.push(...byPos[p].slice(used[p] || 0));
      rest.sort((a, b) => b[f] - a[f]);
      for (const r of rest.slice(0, (st.FLEX || 0) * T)) started.push(r);
      const mx = {};
      for (const r of started) {
        const k = seasonRank.get(r.id);
        if (k == null) continue;
        all[r.pos].push(k);
        mx[r.pos] = Math.max(mx[r.pos] || 0, k);
      }
      for (const p of Object.keys(mx)) deepest[p].push(mx[p]);
    }
    const q = (a, p) => {
      if (!a.length) return null;
      const s = a.slice().sort((x, y) => x - y);
      return s[Math.min(s.length - 1, Math.floor(p * s.length))];
    };
    return Object.fromEntries(POS.map((p) => [p, {
      p50: q(all[p], 0.5), p75: q(all[p], 0.75), p90: q(all[p], 0.9),
      deepest: deepest[p].length ? Math.round(mean(deepest[p])) : null,
    }]));
  };

  /* Medaltal yfir ARIN A UNDAN. Skriftan DEYR ef ar >= profarid raetist
     inn — leki i thessum lid vaeri osynilegur i utkomunni og hun vaeri
     samt truverdug. */
  const ranksBefore = (testYear, league, fmt, stat) => {
    const prior = weeklyYears.filter((y) => y < testYear);
    if (!prior.length) return null;
    for (const y of prior) {
      if (y >= testYear) throw new Error(`LEKI: vikugogn ${y} >= profar ${testYear}`);
    }
    const acc = { QB: [], RB: [], WR: [], TE: [] };
    for (const y of prior) {
      const t = perYear(y, league, fmt);
      for (const p of Object.keys(acc)) if (t[p] && t[p][stat] != null) acc[p].push(t[p][stat]);
    }
    const out = {};
    for (const p of Object.keys(acc)) out[p] = acc[p].length ? Math.round(mean(acc[p])) : null;
    return out;
  };
  return { perYear, ranksBefore, years: weeklyYears };
}

/* ============================================================
   3b. VILLA SEM FANNST I LEIDINNI — STADA MED NULL BYRJUNARSAETI
   ============================================================
   Thetta var ekki spurningin. Hun kom i ljos vid ad lesa `computeVbd`
   lina fyrir linu til ad geta afritad hana RETT sem vidmid:

       const r = repl[pos] || list.length;

   `replacementRanks` skilar `K: 0` og `DST: 0` fyrir deild sem hefur
   ENGIN K- eda DEF-saeti — og thad er RETTA talan: deildin byrjar
   NULL spyrnumenn. En `||` telur 0 vera "vantar" og fellur i
   `list.length`, svo grunngildid verdur VERSTI MADUR A STODUNNI.

   THAD ER SAMA VILLA OG "NULL ER EKKI NULL" I FPL-VERKEFNINU, SNUIN
   VID: hér er 0 raunveruleg tala og hun er lesin sem vantandi.

   OG HUN VIRKJAST I DEILD NOTANDANS. `startersFromRoster` i
   `sleeper-league.js` telur adeins thau saeti sem eru i
   `roster_positions`, svo Sofahetjur (12 lid, engin K, engin DEF)
   faer `starters` an K/DST -> `repl.K = 0` -> grunnur = versti
   spyrnumadur.

   HVERS VEGNA ENGINN SA THETTA: `build.js` sytir K og DST UT UR
   `aRank` (`RANKED_POS`), svo RODIN sjalf er hrein. Villan lekur i
   tvo adra staði — `vbd`-dalkinn hja K/DST, og `tier`, sem er
   reiknad ur VBD-dreifingu ALLRA rada, K og DST med.

   Thetta er MAELT hér, ekki fullyrt, og a raunverulegri
   `players.json`. Vanti skran eda hafi hun enga spyrnumenn er skilad
   `null` og skyringu — omaeld tala fær ekki reit.                   */
async function zeroSlotDefect() {
  const league = { teams: 12, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 } };
  const repl = replacementRanks(league);
  let arr = null;
  try {
    const j = JSON.parse(await readFile(path.join(OUT, "players.json"), "utf8"));
    arr = Array.isArray(j) ? j : (j.players || j.rows);
  } catch { /* skran er ekki forsenda maelingarinnar sjalfrar */ }
  if (!Array.isArray(arr)) {
    return { measured: false, why: "players.json vantar eda er a odru sniði",
             replacementRankForK: repl.K, replacementRankForDst: repl.DST };
  }
  const rows = arr.filter((p) => p.projSleeper != null)
    .map((p) => ({ id: p.id, pos: p.pos, name: p.name, proj: p.projSleeper }));
  const ks = rows.filter((p) => p.pos === "K");
  if (ks.length < 5) {
    return { measured: false, why: `adeins ${ks.length} spyrnumenn med spa i players.json`,
             replacementRankForK: repl.K };
  }
  const v = computeVbd(rows.map((r) => ({ ...r })), league);
  const board = v.filter((p) => p.vbd != null).sort((a, b) => b.vbd - a.vbd);
  const bestK = board.find((p) => p.pos === "K");
  const bestD = board.find((p) => p.pos === "DST");
  /* Threpa-smitid: sama `tierize` med og an K/DST i inntakinu. */
  const tAll = tierize(v.map((r) => r.vbd));
  const tierAll = new Map(); v.forEach((r, i) => tierAll.set(r.id, tAll[i]));
  const skill = v.filter((r) => !["K", "DST"].includes(r.pos));
  const tSkill = tierize(skill.map((r) => r.vbd));
  const tierSkill = new Map(); skill.forEach((r, i) => tierSkill.set(r.id, tSkill[i]));
  const moved = skill.filter((r) => tierAll.get(r.id) !== tierSkill.get(r.id));
  return {
    measured: true,
    league: "12 teams, QB/2RB/2WR/TE/2FLEX, no K and no DEF slot — the user's own " +
            "Sofahetjur league as sleeper-league.js reads it",
    replacementRankForK: repl.K, replacementRankForDst: repl.DST,
    kickersWithProjection: ks.length,
    baselineUsedForK: bestK ? bestK.replacement : null,
    bestKickerProjection: bestK ? Math.round(bestK.proj) : null,
    vbdGivenToBestKicker: bestK ? bestK.vbd : null,
    bestKickerBoardSlot: bestK ? board.indexOf(bestK) + 1 : null,
    vbdGivenToBestDefense: bestD ? bestD.vbd : null,
    kickersAndDefensesInTop20: board.slice(0, 20)
      .filter((p) => p.pos === "K" || p.pos === "DST").length,
    kickersAndDefensesInTop50: board.slice(0, 50)
      .filter((p) => p.pos === "K" || p.pos === "DST").length,
    skillPlayersWhoseCrossPositionTierChanges: moved.length,
    skillPlayersTotal: skill.length,
    examples: moved.slice(0, 6).map((r) =>
      `${r.name} (${r.pos}) tier ${tierAll.get(r.id)} -> ${tierSkill.get(r.id)}`),
    rootCause: "src/model.js computeVbd: `const r = repl[pos] || list.length`. Zero is a " +
      "REAL value (the league starts none of that position) but `||` reads it as missing " +
      "and falls back to the pool floor, so the baseline becomes the worst player at the " +
      "position instead of a level that reflects zero starting slots.",
    whyItWasInvisible: "build.js excludes K and DST from aRank via RANKED_POS, so the " +
      "A-Ranking ORDER is clean. The bad number reaches the vbd column for K/DST and, " +
      "through tierize(withVbd.map(r => r.vbd)), the cross-position tier of real players.",
    notFixedHere: "this lab does not touch src/ — reported, not patched",
  };
}

/* ============================================================
   4. HERMUNIN — PORUD, BADI BORDIN I SOMU DEILD
   ============================================================ */

/** LCG med fostu fraekorni. Ekkert `Math.random()` i thessari skra. */
function rngOf(seed) {
  let a = seed >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}

/**
 * Hristur vollur. Raunveruleg droft eru ekki afradin — thess vegna
 * hefur ADP stadalfravik — og med thvi ad hrista vollinn med THVI SAMA
 * fraviki og FFC maelir faum vid morg ohad syni per ar. Sama adferd og
 * `arank-lab.mjs`; hun eykur NAKVAEMNI innan ars og ma EKKI teljast
 * sem fleiri timabil.
 */
function noisyField(pool, fieldKey, sdKey, seed) {
  const rnd = rngOf(seed);
  const gauss = () => {
    const u = Math.max(1e-9, rnd()), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const j = pool.map((p) => {
    const adp = p[fieldKey];
    const sd = p[sdKey] != null && p[sdKey] > 0
      ? p[sdKey] : 1.08 * Math.sqrt(Math.max(1, adp));
    return [p.id, adp + gauss() * sd];
  }).sort((a, b) => a[1] - b[1]);
  return new Map(j.map(([id], i) => [id, i + 1]));
}

const plainField = (pool, fieldKey) =>
  new Map(pool.slice().sort((a, b) => a[fieldKey] - b[fieldKey]).map((p, i) => [p.id, i + 1]));

/**
 * Pardur munur: `cand` og `base` drafta i SOMU deild, i badum attum, a
 * moti sama velli. Skilar fylki af mun (cand - base).
 */
function pairedDiffs({ cand, base, field, actual, league, pairs }) {
  const T = league.teams;
  const out = [];
  const step = Math.max(1, Math.round(T / pairs));
  for (let i = 1; i <= T; i += step) {
    const j = (i % T) + 1;
    for (const swap of [false, true]) {
      const o = simulateDraft({
        board: cand, fieldBoard: field, actual,
        slot: swap ? j : i, league,
        rival: { slot: swap ? i : j, board: base },
      });
      out.push(o.points - o.rivalPoints);
    }
  }
  return out;
}

/* ============================================================
   5. AFBRIGDA-SKRAIN
   ============================================================ */

function fixedVariants() {
  const v = [];
  /* SJALFSPROFID. README 5h regla 1: "Nulltilgatan verdur ad vera
     hlutlaus — bord gegn sjalfu ser gefur nakvaemlega 0." Se thetta
     ekki 0 er hermunin osamhverf og HVER EINASTA tala her
     merkingarlaus. Thad er fyrsta profid, ekki skraut. */
  v.push({ key: "current", label: "current (computeVbd, k=1)", kind: "self" });
  /* Rounding-profid: `computeVbd` namundar `vbd` i EINN aukastaf adur en
     radad er. Namundun getur bufid til jafntefli sem rada monnum upp a
     nytt. Thetta afbrigdi er SAMA regla an namundunar — munurinn er
     thvi HREINT namundunar-artefakt og ma maela. */
  v.push({ key: "k1-raw", label: "k=1, an namundunar", kind: "fixed",
           spec: { k: 1, flexMix: 0 } });
  for (const k of [0, 2, 3, 5, 8]) {
    v.push({ key: `k${k}`, label: `sletta gluggi k=${k} (${2 * k + 1} menn)`,
             kind: "fixed", spec: { k, flexMix: 0 } });
  }
  for (const mix of [0.5, 1]) {
    v.push({ key: `flexpool${mix === 1 ? "" : "-mid"}`,
             label: `pooladur FLEX-grunnur, mix=${mix}`,
             kind: "fixed", spec: { k: 1, flexMix: mix } });
  }
  /* MEKANISMA-PROFIN. Fyrsta keyrslan sagdi ad `flexpool-mid` vinni i
     9 frumum af 9 — og grunngilda-taflan sagdi HVERS VEGNA: hun haekkar
     TE-grunninn ur 122,5 i 146,3 og laetur allt annad nanast i fridi.
     Vinningurinn getur thvi verid "TE-grunnurinn er settur of djupt", en
     ekki "poolun er retta reglan". Thad er PROFANLEG greinarmunur og
     thessi thrju afbrigdi skera a milli:
       flexpool-te    poolun ADEINS a TE      -> allur vinningurinn?
       flexpool-rbwr  poolun a RB og WR einum -> ekkert eftir?
       te-fixed       TE an FLEX-hlutans      -> sama att, onnur leid  */
  v.push({ key: "flexpool-te", label: "poolun ADEINS a TE (mekanismi)",
           kind: "fixed", spec: { k: 1, flexMix: 0.5, flexOnly: ["TE"] } });
  v.push({ key: "flexpool-rbwr", label: "poolun a RB/WR, TE ohreyft (mekanismi)",
           kind: "fixed", spec: { k: 1, flexMix: 0.5, flexOnly: ["RB", "WR"] } });
  v.push({ key: "te-fixed", label: "TE an FLEX-hlutans (grunnur = TE x lid)",
           kind: "teFixed", spec: { k: 1, flexMix: 0 } });
  return v;
}

const STARTABLE_STATS = ["p50", "p75", "p90"];
const OFFSET_GRID = [-8, -6, -4, -2, 0, 2, 4, 6, 8, 12, 16];

/* ============================================================
   6. ADALKEYRSLAN
   ============================================================ */

async function main() {
  const { pools, paired, unpaired, adpWindows } = await buildPools();
  const ys = Object.keys(pools).map(Number).sort((a, b) => a - b);
  requireSeasons(ys, "timabil i features.json");
  console.log(`porun ppr<->standard: ${paired} por, ${unpaired} oporud`);
  console.log(`${ys.length} timabil (${ys[0]}-${ys[ys.length - 1]}) · ` +
    `${r1(mean(ys.map((y) => pools[y].length)))} leikmenn ad medaltali\n`);

  /* Laugar-thekjan per stodu — hun BINDUR hve djupt er haegt ad fara.
     Se varamanns-saetid dypra en laugin er grunngildid einfaldlega
     versti madurinn og afbrigdid er ekki thad sem thad segist vera.
     Talan er birt thvi hun er forsenda, ekki smaatridi. */
  const POS4 = ["QB", "RB", "WR", "TE"];
  const perYearDepth = {};
  for (const p of POS4) {
    perYearDepth[p] = Object.fromEntries(
      ys.map((y) => [y, pools[y].filter((r) => r.pos === p).length]));
  }
  const depth = Object.fromEntries(POS4.map((p) =>
    [p, Math.round(mean(ys.map((y) => perYearDepth[p][y])))]));
  console.log(`laugar-dypt ad medaltali: ${POS4.map((p) => `${p} ${depth[p]}`).join(" · ")}`);
  /* LAUGAR-DYPTIN BINDUR GRUNNINN OG THAD ER EKKI SMAATRIDI.
     Se varamanns-saetid >= fjoldi manna a stodunni i lauginni er
     grunngildid EKKI "madurinn i thvi saeti" heldur "versti madur sem
     nokkur draftar". Tha er reglan ekki thad sem hun segist vera, og
     hvert afbrigdi sem faerir saetid DYPRA getur ekki gert neitt.
     Talan er talin per timabili, ekki agiskud af medaltalinu. */
  const depthOverrun = {};
  for (const s of SHAPES) {
    const rr = replacementRanks(s.league);
    const over = {};
    for (const p of POS4) over[p] = ys.filter((y) => rr[p] >= perYearDepth[p][y]).length;
    depthOverrun[s.key] = { ranks: rr, seasonsAtOrPastPoolFloor: over, seasons: ys.length,
                            meanPool: depth };
    const flag = POS4.filter((p) => over[p] > 0);
    console.log(`  ${s.key.padEnd(9)} threp: ${POS4.map((p) => `${p} ${rr[p]}`).join(" · ")}` +
      (flag.length ? `   <- A EDA UT FYRIR LAUGAR-GOLFI: ${flag
        .map((p) => `${p} ${over[p]}/${ys.length} ar`).join(", ")}` : ""));
  }
  console.log("");

  /* ---------- villan sem fannst i leidinni ---------- */
  const defect = await zeroSlotDefect();
  if (defect.measured) {
    console.log(`VILLA I \`computeVbd\` (fannst vid lestur, ekki spurt um):`);
    console.log(`  deild an K/DEF-saeta -> repl.K = ${defect.replacementRankForK}` +
      `, en \`repl[pos] || list.length\` gerir grunninn ` +
      `${defect.baselineUsedForK} (versti spyrnumadur)`);
    console.log(`  besti spyrnumadur faer VBD ${defect.vbdGivenToBestKicker} og situr i ` +
      `${defect.bestKickerBoardSlot}. saeti bordsins; ` +
      `${defect.kickersAndDefensesInTop20} af topp-20 eru K/DST`);
    console.log(`  og threpa-smitid: ${defect.skillPlayersWhoseCrossPositionTierChanges} af ` +
      `${defect.skillPlayersTotal} skill-leikmonnum faera threp thegar K/DST eru ` +
      `tekin ur \`tierize\`-inntakinu`);
    console.log(`  daemi: ${defect.examples.slice(0, 3).join(" · ")}\n`);
  } else {
    console.log(`VILLU-PROFID SVAF: ${defect.why}\n`);
  }

  /* ---------- startable-toflurnar ---------- */
  const weeklyYears = [2019, 2020, 2021, 2022, 2023, 2024, 2025].filter((y) => y <= 2025);
  const startable = await startableTable(weeklyYears);
  const startableRanks = {};   // shape|fmt|stat|testYear -> ranks
  for (const s of SHAPES) {
    for (const fmt of FORMATS) {
      for (const stat of STARTABLE_STATS) {
        for (const y of ys) {
          const r = startable.ranksBefore(y, s.league, fmt, stat);
          if (r) startableRanks[`${s.key}|${fmt}|${stat}|${y}`] = r;
        }
      }
    }
  }
  console.log("STARTABLE-SAETI (maeld ur vikugognum, medaltal 2019-2024, 12-2flex):");
  for (const fmt of FORMATS) {
    const r = {};
    for (const stat of STARTABLE_STATS) r[stat] = startableRanks[`12-2flex|${fmt}|${stat}|2025`];
    console.log(`  ${fmt.padEnd(9)} ` + STARTABLE_STATS.map((st) =>
      `${st}: ${["QB", "RB", "WR", "TE"].map((p) => `${p}${r[st] ? r[st][p] : "-"}`).join("/")}`
    ).join("   "));
  }
  const rr12 = replacementRanks(SHAPES[1].league);
  console.log(`  nuverandi  ${["QB", "RB", "WR", "TE"].map((p) => `${p}${rr12[p]}`).join("/")}` +
    "   <- p50 liggur NAERRI nuverandi threpi, sem er sjalfstaed stadfesting\n");

  /* ---------- heimarnir per (ar, snid, vollur) ---------- */
  const worlds = {};
  for (const y of ys) {
    for (const fmt of FORMATS) {
      const pool = pools[y].filter((p) => p.proj[fmt] != null);
      const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual[fmt] }]));
      for (const fld of FIELDS) {
        const sdKey = fld === "adpPpr" ? "sdPpr" : "sdStd";
        const fields = [plainField(pool, fld)];
        for (let r = 1; r < RUNS; r++) {
          fields.push(noisyField(pool, fld, sdKey, y * 1000 + r * 7919));
        }
        worlds[`${y}|${fmt}|${fld}`] = { pool, actual, fields };
      }
    }
  }

  /* ---------- afbrigdin ---------- */
  const fixed = fixedVariants();
  const variants = [
    ...fixed,
    ...STARTABLE_STATS.map((stat) => ({
      key: `startable-${stat}`, label: `startable ${stat} (ur vikugognum a undan)`,
      kind: "weekly", stat, spec: { k: 1, flexMix: 0 },
    })),
    { key: "offset-global", label: "hlidrun a ollum stodum, fittud walk-forward",
      kind: "fitted", mode: "global", spec: { k: 1, flexMix: 0 } },
    { key: "offset-pos", label: "hlidrun PER STODU, fittud walk-forward",
      kind: "fitted", mode: "pos", spec: { k: 1, flexMix: 0 } },
  ];

  /* VIDMIDS-BORDID ER OHAD ADP-BORDINU og thvi ma reikna thad einu
     sinni per (ar, snid, logun). Fyrsta utgafan kalladi `computeVbd`
     inni i afbrigda-lykkjunni — 26 sinnum oftar en tharf — og fittid
     kalladi thad i hverju grid-punkti. Talan er su sama; timinn er thad
     ekki. */
  const baseCache = new Map();
  const baseBoard = (y, fmt, shapeKey, league, pool) => {
    const k = `${y}|${fmt}|${shapeKey}`;
    if (!baseCache.has(k)) baseCache.set(k, currentBoard(pool, league, fmt));
    return baseCache.get(k);
  };

  /** Bord fyrir eitt afbrigdi i einum heimi. Skilar null se thad ekki
      skilgreint fyrir thetta ar (startable an fyrri ara, fittud an
      fyrri ara). */
  const boardOf = (v, pool, league, fmt, shapeKey, y, fittedRanks) => {
    if (v.kind === "self") return currentBoard(pool, league, fmt);
    if (v.kind === "fixed") {
      return boardFromSpec(pool, league, fmt,
        { ...v.spec, ranks: replacementRanks(league) });
    }
    if (v.kind === "teFixed") {
      const ranks = { ...replacementRanks(league) };
      ranks.TE = Math.max(1, (league.starters.TE || 0) * league.teams);
      return boardFromSpec(pool, league, fmt, { ...v.spec, ranks });
    }
    if (v.kind === "weekly") {
      const ranks = startableRanks[`${shapeKey}|${fmt}|${v.stat}|${y}`];
      if (!ranks) return null;
      const base = replacementRanks(league);
      /* K/DST halda sinu — startable-taflan naer adeins yfir QB/RB/WR/TE. */
      return boardFromSpec(pool, league, fmt, { ...v.spec, ranks: { ...base, ...ranks } });
    }
    if (v.kind === "fitted") {
      const off = fittedRanks && fittedRanks[`${v.key}|${shapeKey}|${fmt}|${y}`];
      if (!off) return null;
      const base = replacementRanks(league);
      const ranks = {};
      for (const p of Object.keys(base)) {
        ranks[p] = base[p] > 0 ? Math.max(1, base[p] + (off[p] || 0)) : base[p];
      }
      return boardFromSpec(pool, league, fmt, { ...v.spec, ranks });
    }
    return null;
  };

  /* ============================================================
     6a. WALK-FORWARD FITT A HLIDRUN
     ============================================================
     Hlidrunin er FITTUD A ARUM A UNDAN og beitt a arid sjalft. Ad fitta
     a ollum arum og maela svo a theim somu er leki — og thad er
     nakvaemlega gildran sem `arank-lab` skjalfesti: besta afbrigdid i
     hrari leit gaf +109, walk-forward +46.

     Fittid keyrir a FAERRI saetaporum og ANNARRI havada-keyrslu en
     maelingin. Thad er asett: fittid ma vera hrarra en maelingin, en
     thad MA EKKI sja profarid.                                       */
  console.log("fittar hlidrun walk-forward …");
  const fittedRanks = {};
  const fitScore = (league, shapeKey, fmt, fld, year, ranks) => {
    const w = worlds[`${year}|${fmt}|${fld}`];
    const cand = boardFromSpec(w.pool, league, fmt, { k: 1, flexMix: 0, ranks });
    const base = baseBoard(year, fmt, shapeKey, league, w.pool);
    return mean(pairedDiffs({ cand, base, field: w.fields[0], actual: w.actual,
                              league, pairs: FIT_PAIRS }));
  };
  for (const s of SHAPES) {
    for (const fmt of FORMATS) {
      const fld = PRIMARY_FIELD[fmt];
      const baseRanks = replacementRanks(s.league);
      for (let i = 1; i < ys.length; i++) {
        const y = ys[i], prior = ys.slice(0, i);
        const evalOff = (off) => mean(prior.map((py) => fitScore(s.league, s.key, fmt, fld, py,
          Object.fromEntries(Object.entries(baseRanks).map(([p, r]) =>
            [p, r > 0 ? Math.max(1, r + (off[p] || 0)) : r])))));
        /* (i) EIN hlidrun a allar stodur. */
        let bestG = { off: 0, sc: -Infinity };
        for (const d of OFFSET_GRID) {
          const sc = evalOff({ QB: d, RB: d, WR: d, TE: d });
          if (sc > bestG.sc) bestG = { off: d, sc };
        }
        fittedRanks[`offset-global|${s.key}|${fmt}|${y}`] =
          { QB: bestG.off, RB: bestG.off, WR: bestG.off, TE: bestG.off };
        /* (ii) PER STODU med hnitalaegri leit, tvaer umferdir. Full
           grid (11^4) er 14.641 punktar; hnitalaeg leit er 88 og finnur
           sama toppinn thegar samspil er litid. Se samspil mikid er
           thad TAKMORKUN og hun er skrad, ekki thogud. */
        let cur = { QB: 0, RB: 0, WR: 0, TE: 0 };
        let curSc = evalOff(cur);
        for (let pass = 0; pass < 2; pass++) {
          for (const p of ["RB", "WR", "TE", "QB"]) {
            for (const d of OFFSET_GRID) {
              if (d === cur[p]) continue;
              const trial = { ...cur, [p]: d };
              const sc = evalOff(trial);
              if (sc > curSc) { cur = trial; curSc = sc; }
            }
          }
        }
        fittedRanks[`offset-pos|${s.key}|${fmt}|${y}`] = { ...cur };
      }
      process.stdout.write(".");
    }
  }
  console.log("");

  /* ============================================================
     6b. ADALMAELINGIN — pardur munur per (afbrigdi, logun, snid, vollur)
     ============================================================ */
  console.log("\nmaelir pardur einvigi …");
  const results = {};      // key -> { perSeason, stats, boot, n }
  const mechanism = {};    // key -> hvad afbrigdid GERIR vid bordid
  for (const s of SHAPES) {
    for (const fmt of FORMATS) {
      /* Bordin eru byggd EINU SINNI per (ar, afbrigdi) og notud gegn
         badum ADP-bordum. Bordid les ekkert ur vellinum, svo tvo eins
         bord vaeru bara tvofaldur reikningur. */
      const boards = {}, diag = {};
      for (const y of ys) {
        const pool = worlds[`${y}|${fmt}|${FIELDS[0]}`].pool;
        for (const v of variants) {
          const b = v.kind === "self"
            ? baseBoard(y, fmt, s.key, s.league, pool)
            : boardOf(v, pool, s.league, fmt, s.key, y, fittedRanks);
          boards[`${y}|${v.key}`] = b;
          if (b) (diag[v.key] = diag[v.key] || []).push({ base: b.__base, top24: b.__top24 });
        }
      }
      for (const v of variants) {
        const d = diag[v.key] || [];
        if (d.length) {
          const avg = (sel, p) => r1(mean(d.map((x) => sel(x)[p]).filter((x) => x != null)));
          mechanism[`${s.key}|${fmt}|${v.key}`] = {
            baseline: Object.fromEntries(["QB", "RB", "WR", "TE"]
              .map((p) => [p, avg((x) => x.base, p)])),
            top24: Object.fromEntries(["QB", "RB", "WR", "TE"]
              .map((p) => [p, avg((x) => x.top24, p)])),
            years: d.length,
          };
        }
      }
      for (const fld of FIELDS) {
        for (const v of variants) {
          const perSeason = {};
          let n = 0;
          for (const y of ys) {
            const w = worlds[`${y}|${fmt}|${fld}`];
            const base = baseBoard(y, fmt, s.key, s.league, w.pool);
            const cand = boards[`${y}|${v.key}`];
            if (!cand) { perSeason[y] = null; continue; }
            const d = [];
            for (const field of w.fields) {
              d.push(...pairedDiffs({ cand, base, field, actual: w.actual,
                                      league: s.league, pairs: s.league.teams }));
            }
            perSeason[y] = r1(mean(d));
            n += d.length;
          }
          const stats = seasonStats(perSeason);
          const zeroA = {}, zeroB = {};
          for (const y of ys) if (perSeason[y] != null) { zeroA[y] = perSeason[y]; zeroB[y] = 0; }
          const boot = bootstrapDiff(zeroA, zeroB, 2000, 4242);
          results[`${s.key}|${fmt}|${fld}|${v.key}`] = {
            perSeason, ...stats, n,
            bootSeason: boot ? { lo: r1(boot.lo), hi: r1(boot.hi),
                                 excludesZero: boot.excludesZero } : null,
          };
        }
        process.stdout.write(".");
      }
    }
  }
  console.log("");

  /* SJALFSPROFID. Fellur skriftan her er hermunin osamhverf og engin
     tala i skranni er marktaek. Hun DEYR fremur en ad skrifa. */
  const selfFails = [];
  for (const s of SHAPES) {
    for (const fmt of FORMATS) {
      for (const fld of FIELDS) {
        const q = results[`${s.key}|${fmt}|${fld}|current`];
        if (!q || Math.abs(q.mean) > 1e-9) {
          selfFails.push(`${s.key}|${fmt}|${fld} = ${q ? q.mean : "vantar"}`);
        }
      }
    }
  }
  if (selfFails.length) {
    console.error("\n  SJALFSPROFID FELL — bord gegn sjalfu ser gefur ekki 0:\n   " +
      selfFails.join("\n   ") +
      "\n  Hermunin er osamhverf og engin tala vaeri marktaek. Skrifa EKKERT.\n");
    process.exit(2);
  }
  console.log("sjalfsprof: bord gegn sjalfu ser = 0 i ollum " +
    `${SHAPES.length * FORMATS.length * FIELDS.length} frumum  OK`);

  /* ============================================================
     6c. WALK-FORWARD VAL A MILLI AFBRIGDA
     ============================================================
     Ad velja besta afbrigdid a ollum arunum og segja "sja, thad vinnur"
     er urtaksval. Fyrir hvert ar er valid gert A ARUNUM A UNDAN.

     TVEIR VELJARAR, OG THAD ER EKKI OFAUKID.
     Fyrsti veljarinn krefst thess ad afbrigdid hafi TOLU I HVERJU
     fyrra ari. Thad er retta krafan — annars er verid ad bera saman
     medaltol ur olikum arasettum — EN hun hefur afleidingu sem er
     osynileg i tolunni: vikugognin byrja 2019, svo `startable`-
     afbrigdin hafa ALDREI tolu fyrir 2015-2019 og geta thvi ALDREI
     verid valin, i nokkru ari. Fyrsta utgafan hafdi adeins thennan
     veljara og "walk-forward val" las eins og val ur ollum afbrigdum
     thegar thad var val ur ellefu af fjortan. Su thogn er nakvaemlega
     "tom fullyrding" — hun fellur ekki, hun maelir bara minna en hun
     segist maela.

     Annar veljarinn leysir thad an ad brjota kroffuna: hann skerdir
     arasettid nidur i thau fyrri ar thar sem ALLIR frambjodendur hafa
     tolu, svo samanburdurinn er enn a somu arum — bara faerri theirra.
     Hann tharf >=2 ar, annars er ekkert valid.
     Bædar tolur eru birtar. Vaeru thaer mjog olikar vaeri thad sjalft
     nidurstada um hve mikid veljarinn raedur.                         */
  const selectWf = (shapeKey, fmt, restrictToCommonYears) => {
    const fld = PRIMARY_FIELD[fmt];
    const cands = variants.filter((v) => v.key !== "current");
    const per = {}, chosen = {}, priorYearsUsed = {};
    for (let i = 1; i < ys.length; i++) {
      const y = ys[i];
      let prior = ys.slice(0, i);
      if (restrictToCommonYears) {
        prior = prior.filter((py) => cands.every((v) =>
          results[`${shapeKey}|${fmt}|${fld}|${v.key}`].perSeason[py] != null));
        if (prior.length < 2) { per[y] = null; continue; }
      }
      let best = null;
      for (const v of cands) {
        const q = results[`${shapeKey}|${fmt}|${fld}|${v.key}`];
        const vals = prior.map((py) => q.perSeason[py]).filter((x) => x != null);
        if (vals.length < prior.length) continue;
        const sc = mean(vals);
        if (!best || sc > best.sc) best = { key: v.key, sc };
      }
      if (!best) { per[y] = null; continue; }
      per[y] = results[`${shapeKey}|${fmt}|${fld}|${best.key}`].perSeason[y];
      chosen[y] = best.key;
      priorYearsUsed[y] = prior.length;
    }
    return { chosen, per, priorYearsUsed,
             eligible: restrictToCommonYears ? cands.length
               : cands.filter((v) => ys.slice(0, ys.length - 1).every((py) =>
                   results[`${shapeKey}|${fmt}|${fld}|${v.key}`].perSeason[py] != null)).length,
             candidates: cands.length, ...seasonStats(per) };
  };
  const walkForward = {}, walkForwardCommon = {};
  for (const s of SHAPES) {
    for (const fmt of FORMATS) {
      walkForward[`${s.key}|${fmt}`] = selectWf(s.key, fmt, false);
      walkForwardCommon[`${s.key}|${fmt}`] = selectWf(s.key, fmt, true);
    }
  }

  /* ============================================================
     6d. BOOTSTRAP KLASAD PER LEIKMANN
     ============================================================
     Repo-stadallinn (`bootstrapDiff`) klasar per TIMABIL og er reiknadur
     ad ofan. Hann svarar "flokta arin?". Thessi svarar odru: "flokta
     LEIKMENNIRNIR?" — hefdi onnur teikning ur somu leikmannadreifingu
     gefid somu akvordun?

     KLONUN OG HVAD HUN KOSTAR. Klasa-bootstrap dregur leikmenn MED
     ENDURTEKNINGU. Sami leikmadur getur thvi komid tvisvar i laugina og
     faer tha nytt id (`id#1`), svo tvo lid geta baedi "eignast" hann.
     Thad er ekki raunverulegt draft — en thad er SAMA laugin fyrir badi
     bordin i hverri itrun, svo porunin heldur og munurinn er enn
     munurinn a bordunum. Vikmorkin sem thetta gefur eru THRENGRI en
     ars-klosunin thvi thau innihalda ekki ars-flokt. THVI ER KRAFAN
     AD BADI UTILOKI NULL, ekki annadhvort.

     Fittud og startable-saeti eru HALDIN FOSTUM innan bootstrappsins
     (thau eru fittud a raunverulegum fyrri arum). Vikmorkin maela thvi
     utkomu-ovissu vid gefnu saeti, ekki valovissu — og thad er sagt.  */
  const playerBoot = {};
  if (BOOT > 0) {
    console.log(`\nbootstrap klasad per leikmann (${BOOT} itranir) …`);
    for (const s of SHAPES) {
      for (const fmt of FORMATS) {
        const fld = PRIMARY_FIELD[fmt];
        const sdKey = fld === "adpPpr" ? "sdPpr" : "sdStd";
        const acc = {};
        for (const v of variants) acc[v.key] = [];
        for (let b = 0; b < BOOT; b++) {
          const iterMean = {};
          for (const v of variants) iterMean[v.key] = [];
          for (const y of ys) {
            const src = pools[y].filter((p) => p.proj[fmt] != null);
            const rnd = rngOf(y * 100003 + b * 7919 + 17);
            const res = [];
            for (let i = 0; i < src.length; i++) {
              const p = src[Math.floor(rnd() * src.length)];
              res.push({ ...p, id: `${p.id}#${i}` });
            }
            const actual = new Map(res.map((p) => [p.id, { pos: p.pos, pts: p.actual[fmt] }]));
            const field = noisyField(res, fld, sdKey, y * 7 + b * 104729 + 3);
            const base = currentBoard(res, s.league, fmt);
            for (const v of variants) {
              const cand = boardOf(v, res, s.league, fmt, s.key, y, fittedRanks);
              if (!cand) continue;
              iterMean[v.key].push(mean(pairedDiffs({ cand, base, field, actual,
                league: s.league, pairs: BOOT_PAIRS })));
            }
          }
          for (const v of variants) {
            if (iterMean[v.key].length) acc[v.key].push(mean(iterMean[v.key]));
          }
        }
        for (const v of variants) {
          const a = acc[v.key];
          if (a.length < 50) { playerBoot[`${s.key}|${fmt}|${v.key}`] = null; continue; }
          a.sort((x, z) => x - z);
          const lo = a[Math.floor(a.length * 0.025)], hi = a[Math.floor(a.length * 0.975)];
          playerBoot[`${s.key}|${fmt}|${v.key}`] = {
            runs: a.length, lo: r1(lo), hi: r1(hi), median: r1(a[Math.floor(a.length / 2)]),
            excludesZero: lo > 0 || hi < 0,
          };
        }
        process.stdout.write(".");
      }
    }
    console.log("");
  }

  /* ============================================================
     7. UTPRENTUN
     ============================================================ */
  const line = "=".repeat(96);
  for (const s of SHAPES) {
    console.log(`\n${line}\n  ${s.label}\n${line}`);
    console.log(`  ${"afbrigdi".padEnd(30)}` +
      FORMATS.map((f) => f.toUpperCase().padStart(21)).join(""));
    for (const v of variants) {
      const cells = FORMATS.map((fmt) => {
        const q = results[`${s.key}|${fmt}|${PRIMARY_FIELD[fmt]}|${v.key}`];
        if (!q || q.years === 0) return "-".padStart(21);
        const mark = q.significant ? "*" : " ";
        return `${sgn(q.mean)}${mark} ${q.wins}/${q.years} t=${q.t == null ? "-" : q.t.toFixed(2)}`
          .padStart(21);
      }).join("");
      console.log(`  ${v.label.slice(0, 29).padEnd(30)}${cells}`);
    }
    for (const [lab, tbl] of [["walk-forward val", walkForward],
                              ["  sami ara-grunnur", walkForwardCommon]]) {
      console.log(`  ${lab.padEnd(30)}` + FORMATS.map((fmt) => {
        const q = tbl[`${s.key}|${fmt}`];
        return `${sgn(q.mean)}  ${q.wins}/${q.years} t=${q.t == null ? "-" : q.t.toFixed(2)}`
          .padStart(21);
      }).join(""));
    }
    const el = walkForward[`${s.key}|ppr`];
    console.log(`  (veljari 1 sa ${el.eligible} af ${el.candidates} afbrigdum` +
      ` — vikugogn byrja 2019; veljari 2 sa oll, a faerri arum)`);
  }
  console.log(`\n  * = pardur t utilokar null (klasar = timabil). Munur er` +
    ` stig byrjunarlids yfir timabil, cand - current.`);

  /* HVAD GERIR AFBRIGDID? Tafla sem gerir muninn a "annad varamanns-
     threp" og "QB faerdur nidur" synilegan. `top24` er hve margir af
     hverri stodu eru i efstu 24 saetum bordsins — thad er thad sem
     draftari ser i fyrstu tveimur umferdunum. */
  console.log(`\n${line}\n  HVAD GERIR AFBRIGDID? grunngildi og stodur i topp-24` +
    ` (12-2flex)\n${line}`);
  for (const fmt of FORMATS) {
    console.log(`\n  ${fmt}`);
    console.log(`    ${"afbrigdi".padEnd(16)}${"grunnur QB/RB/WR/TE".padStart(30)}` +
      `${"topp-24 QB/RB/WR/TE".padStart(26)}`);
    for (const v of variants) {
      const m = mechanism[`12-2flex|${fmt}|${v.key}`];
      if (!m) continue;
      console.log(`    ${v.key.padEnd(16)}` +
        `${["QB", "RB", "WR", "TE"].map((p) => m.baseline[p]).join(" / ").padStart(30)}` +
        `${["QB", "RB", "WR", "TE"].map((p) => m.top24[p]).join(" / ").padStart(26)}`);
    }
  }

  if (BOOT > 0) {
    console.log(`\n${line}\n  BADI VIKMORKIN — ars-klosun OG leikmanna-klosun\n${line}`);
    for (const s of SHAPES) {
      for (const fmt of FORMATS) {
        const rows = variants.map((v) => {
          const q = results[`${s.key}|${fmt}|${PRIMARY_FIELD[fmt]}|${v.key}`];
          const pb = playerBoot[`${s.key}|${fmt}|${v.key}`];
          return { v, q, pb };
        }).filter((r) => r.q && r.q.years > 0 && r.v.key !== "current")
          .sort((a, b) => b.q.mean - a.q.mean).slice(0, 3);
        console.log(`\n  ${s.key} · ${fmt}`);
        for (const { v, q, pb } of rows) {
          const both = q.bootSeason && q.bootSeason.excludesZero && pb && pb.excludesZero;
          console.log(`    ${v.key.padEnd(16)} ${sgn(q.mean)}  ` +
            `ar-boot [${sgn(q.bootSeason ? q.bootSeason.lo : null)}, ` +
            `${sgn(q.bootSeason ? q.bootSeason.hi : null)}]  ` +
            `leikm-boot [${sgn(pb ? pb.lo : null)}, ${sgn(pb ? pb.hi : null)}]  ` +
            (both ? "STENST" : "utilokar ekki null"));
        }
      }
    }
  }

  /* ---------- ER BESTI GRUNNURINN OLIKUR MILLI PPR OG HALF? ----------
     Thetta er kjarna-spurningin og hun er PORUD: somu ar, somu leikmenn,
     sama logun — svo hun er profud sem pardur munur per timabili, ekki
     med tveimur ohadum medaltolum. Sama honnun og `half-lab.mjs` notar
     um snid-muninn. */
  const formatDiff = {};
  for (const s of SHAPES) {
    for (const [a, b] of [["ppr", "half"], ["half", "standard"], ["ppr", "standard"]]) {
      for (const v of variants) {
        if (v.key === "current") continue;
        const A = results[`${s.key}|${a}|${PRIMARY_FIELD[a]}|${v.key}`];
        const B = results[`${s.key}|${b}|${PRIMARY_FIELD[b]}|${v.key}`];
        if (!A || !B) continue;
        const per = {};
        for (const y of ys) {
          per[y] = A.perSeason[y] != null && B.perSeason[y] != null
            ? A.perSeason[y] - B.perSeason[y] : null;
        }
        formatDiff[`${s.key}|${a}-${b}|${v.key}`] = seasonStats(per);
      }
    }
  }
  console.log(`\n${line}\n  ER GRUNNURINN OLIKUR MILLI SNIDA? (pardur per timabili)\n${line}`);
  for (const s of SHAPES) {
    console.log(`\n  ${s.key}`);
    console.log(`    ${"afbrigdi".padEnd(20)}${"ppr - half".padStart(20)}` +
      `${"half - standard".padStart(20)}${"ppr - standard".padStart(20)}`);
    for (const v of variants) {
      if (v.key === "current") continue;
      const cells = [["ppr", "half"], ["half", "standard"], ["ppr", "standard"]].map(([a, b]) => {
        const q = formatDiff[`${s.key}|${a}-${b}|${v.key}`];
        if (!q || q.years < 2) return "-".padStart(20);
        return `${sgn(q.mean)}${q.significant ? "*" : " "} t=${q.t == null ? "-" : q.t.toFixed(2)}`
          .padStart(20);
      }).join("");
      console.log(`    ${v.key.padEnd(20)}${cells}`);
    }
  }

  /* Rodun afbrigda per snid — er TOPPURINN sami i ppr og half? */
  const ranking = {};
  for (const s of SHAPES) {
    for (const fmt of FORMATS) {
      ranking[`${s.key}|${fmt}`] = variants.filter((v) => v.key !== "current")
        .map((v) => ({ key: v.key,
          mean: results[`${s.key}|${fmt}|${PRIMARY_FIELD[fmt]}|${v.key}`].mean }))
        .filter((r) => r.mean != null)
        .sort((a, b) => b.mean - a.mean).map((r) => r.key);
    }
  }
  console.log(`\n  BESTA AFBRIGDI PER FRUMU (hra leit — URTAKSVAL, ekki nidurstada):`);
  for (const s of SHAPES) {
    console.log(`    ${s.key.padEnd(10)}` + FORMATS.map((fmt) =>
      `${fmt}: ${ranking[`${s.key}|${fmt}`][0]}`.padEnd(30)).join(""));
  }

  /* ---------- ADP-VIKMORKIN (half hefur ekkert eigid ADP) ---------- */
  console.log(`\n  HELDUR THETTA MED HINU ADP-BORDINU? (half hefur ekkert eigid ADP)`);
  for (const s of SHAPES) {
    for (const v of variants.slice(0, 3)) {
      const a = results[`${s.key}|half|adpPpr|${v.key}`];
      const b = results[`${s.key}|half|adpStd|${v.key}`];
      console.log(`    ${s.key} ${v.key.padEnd(12)} adpPpr ${sgn(a.mean)}  ` +
        `adpStd ${sgn(b.mean)}`);
    }
  }

  /* ============================================================
     8. URSKURDUR — BERUM ORDUM, A ENSKU
     ============================================================
     Reglan: afbrigdi STENDUR adeins ef BADI vikmorkin utiloka null OG
     pardur t er marktaekur. Med 12 afbrigdum x 9 frumum er besta talan
     vaentanlega jakvaed af tilviljun einni — svo Bonferroni-athugun er
     nefnd i urskurdinum, eins og README 5h gerir.                    */
  const cells = [];
  for (const s of SHAPES) for (const fmt of FORMATS) cells.push([s.key, fmt]);
  const nTests = cells.length * (variants.length - 1);

  const stands = [], consistency = {};
  for (const v of variants) {
    if (v.key === "current") continue;
    let pos = 0, sig = 0, both = 0, seen = 0;
    let sumMean = 0;
    for (const [sk, fmt] of cells) {
      const q = results[`${sk}|${fmt}|${PRIMARY_FIELD[fmt]}|${v.key}`];
      const pb = playerBoot[`${sk}|${fmt}|${v.key}`];
      if (!q || q.years < 2) continue;
      seen++;
      sumMean += q.mean;
      if (q.mean > 0) pos++;
      if (q.significant) sig++;
      const ok = q.mean > 0 && q.significant && q.bootSeason && q.bootSeason.excludesZero &&
                 (BOOT === 0 || (pb && pb.excludesZero));
      if (ok) {
        both++;
        stands.push({ shape: sk, scoring: fmt, variant: v.key, mean: q.mean,
                      t: q.t, wins: q.wins, years: q.years,
                      bootSeason: q.bootSeason, bootPlayer: pb || null });
      }
    }
    consistency[v.key] = { cells: seen, positive: pos, significant: sig, standsBoth: both,
                           meanOfCells: r1(seen ? sumMean / seen : null) };
  }
  /* Sa sem er jakvaedur i FLESTUM frumum. ATH: frumurnar eru EKKI
     ohadar (somu ar, sama laug, samfylgnir leikmenn), svo "9 af 9" er
     EKKI tekna-prof og ma ekki lesast sem p = 1/512. Hun er hneigd. */
  const leader = Object.entries(consistency)
    .sort((a, b) => (b[1].positive - a[1].positive) ||
                    (b[1].meanOfCells - a[1].meanOfCells))[0];
  /* Er TOPPURINN sami i ppr og half? Kjarna-spurningin, svarad per logun. */
  const leaderByFormat = {};
  for (const s of SHAPES) {
    leaderByFormat[s.key] = Object.fromEntries(
      FORMATS.map((fmt) => [fmt, ranking[`${s.key}|${fmt}`][0]]));
  }
  const sameTop = SHAPES.filter((s) =>
    leaderByFormat[s.key].ppr === leaderByFormat[s.key].half).map((s) => s.key);
  /* Er munurinn a snidunum marktaekur fyrir NOKKURT afbrigdi? */
  const fmtSig = Object.entries(formatDiff)
    .filter(([k, q]) => k.includes("ppr-half") && q.significant)
    .map(([k, q]) => `${k} (${q.mean}, t=${q.t})`);

  const parts = [];
  parts.push(stands.length === 0
    ? `NOTHING BEATS THE CURRENT VBD BASELINE AT THE BAR THIS REPO USES. ` +
      `${nTests} variant x shape x scoring cells were measured as a paired ` +
      `head-to-head draft in the same league, and not one variant clears a positive ` +
      `mean plus BOTH the season-clustered and the player-clustered 95% interval.`
    : `${stands.length} of ${nTests} cells clear a positive mean plus both intervals: ` +
      stands.map((x) => `${x.variant} in ${x.shape}/${x.scoring} (+${x.mean}, ` +
        `${x.wins}/${x.years} seasons, t=${x.t})`).join("; ") + `.`);
  parts.push(`With ${nTests} comparisons the best cell is expected to look positive by ` +
    `chance alone; a Bonferroni-corrected bar would need roughly ${nTests} times the ` +
    `evidence, and nothing here is close to that.`);
  parts.push(`Most consistent direction: "${leader[0]}" is positive in ` +
    `${leader[1].positive} of ${leader[1].cells} cells (mean of cell means ` +
    `${leader[1].meanOfCells > 0 ? "+" : ""}${leader[1].meanOfCells} points, ` +
    `significant in ${leader[1].significant}). The cells are NOT independent — same ` +
    `seasons, same pool, correlated players — so this is a direction, not a sign test.`);
  parts.push(`Is the best baseline different in PPR and half-PPR? The raw-search leader ` +
    `is the same variant in ${sameTop.length} of ${SHAPES.length} shapes ` +
    `(${sameTop.join(", ") || "none"}), and the paired per-season PPR-minus-half ` +
    `difference is significant for ` +
    (fmtSig.length ? `${fmtSig.length} of ${variants.length - 1} variants: ` +
      `${fmtSig.join("; ")} — read those as multiplicity before reading them as a ` +
      `scoring effect` : `NO variant`) +
    `. The receptions-compress-RB-and-WR argument is real in the numbers ` +
    `(the measured startable ranks move by 1-3 seats between PPR and half) but it does ` +
    `not move the DECISION far enough to justify a separate baseline per scoring.`);
  parts.push(`Read the walk-forward row before wiring anything: variant selection is ` +
    `exactly where arank-lab already found noise (+109 raw versus +46 walk-forward).`);
  const verdict = parts.join(" ");
  console.log(`\n${line}\n  URSKURDUR\n${line}`);
  for (const p of parts) console.log(`  ${p.replace(/(.{86}\s)/g, "$1\n  ")}\n`);

  console.log(`  SAMKVAEMNI YFIR FRUMUR (hneigd, EKKI tekna-prof — frumur eru samfylgnar):`);
  for (const [k, c] of Object.entries(consistency)
    .sort((a, b) => b[1].positive - a[1].positive)) {
    console.log(`    ${k.padEnd(16)} jakvaett ${String(c.positive).padStart(2)}/${c.cells}` +
      `  marktaekt ${c.significant}  stenst badi ${c.standsBoth}` +
      `  medaltal ${sgn(c.meanOfCells)}`);
  }

  /* ============================================================
     9. SKRIFA
     ============================================================ */
  await mkdir(path.join(OUT, "measure"), { recursive: true });
  const out = {
    generated: new Date().toISOString(),
    provenance: stamp({
      argv: process.argv.slice(2),
      defaults: { runs: 4, boot: 400, bootpairs: 4, from: 2015 },
      resolved: {
        runs: RUNS, boot: BOOT, bootPairs: BOOT_PAIRS, fitPairs: FIT_PAIRS,
        formats: FORMATS, fields: FIELDS, primaryField: PRIMARY_FIELD,
        shapes: SHAPES.map((s) => s.key), variants: variants.map((v) => v.key),
        offsetGrid: OFFSET_GRID, startableStats: STARTABLE_STATS,
        halfIsExact: "half = (ppr + standard) / 2, algebra — not interpolation",
        halfAdpIsBounded: "no historical half-PPR ADP exists; ppr and std ADP are " +
          "run as bounds (same rule as half-lab)",
        metric: "paired head-to-head draft in the same league, candidate board minus " +
          "current board, both slot orders, real season points of the starting lineup",
        baselineIsShippedCode: "the control board calls computeVbd/replacementRanks " +
          "from src/model.js — it is not a re-implementation",
      },
      inputs: ["features.json", "players.json",
               "weekly/2019.json", "weekly/2020.json",
               "weekly/2021.json", "weekly/2022.json", "weekly/2023.json",
               "weekly/2024.json", "weekly/2025.json"],
      dataDir: OUT,
    }),
    seasons: ys,
    pairing: { paired, unpaired },
    adpWindows,
    poolDepth: depth,
    poolDepthPerSeason: perYearDepth,
    depthOverrun,
    replacementRanks: Object.fromEntries(
      SHAPES.map((s) => [s.key, replacementRanks(s.league)])),
    flexSplit: FLEX_SPLIT,
    /* AUKAUTKOMA, OG SU VERDMAETASTA: villa i shipped kodanum. Hun er
       hér og ekki bara i svarinu thvi maeling sem er adeins sogd i
       samtali er ekki skjolud. */
    defectFound: defect,
    selfTest: { boardVsItself: 0, cells: SHAPES.length * FORMATS.length * FIELDS.length,
                note: "board against itself must be exactly 0 or the simulation is " +
                      "asymmetric and every number here is meaningless" },
    startableRanks,
    fittedOffsets: fittedRanks,
    mechanism,
    variants: variants.map((v) => ({ key: v.key, label: v.label, kind: v.kind })),
    results,
    playerBootstrap: playerBoot,
    walkForward,
    walkForwardCommonYears: walkForwardCommon,
    formatDifference: formatDiff,
    rawSearchRanking: ranking,
    rawSearchLeaderByFormat: leaderByFormat,
    consistency,
    mostConsistent: { variant: leader[0], ...leader[1],
      note: "cells are NOT independent (same seasons, same pool) — a direction, " +
            "not a sign test" },
    stands,
    verdict,
  };
  await writeFile(path.join(OUT, "measure", "vbdbase.json"), JSON.stringify(out, null, 1));
  console.log(`-> data/measure/vbdbase.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
