#!/usr/bin/env node
/* ============================================================
   projbase-lab.mjs — ER SJALFUR SPA-GRUNNURINN RETT VALINN?

     node scripts/projbase-lab.mjs [--ref=sleeper|fftoday]
                                   [--runs=2] [--pairs=4]
                                   [--boot=200] [--bootpairs=4] [--from=2015]

   -> data/measure/projbase.json   (ref=sleeper)
   -> data/measure/projbase_ff.json (ref=fftoday)

   SPURNINGIN, OG HVERS VEGNA HUN ER ONNUR EN ALLAR HINAR.
   A-Ranking er: **spa Sleeper -> VBD -> rod**. Um fimmtan hugmyndir
   hafa nu verid maeldar og felldar (README 4a/4d/4e/4l/4m, 5h, 5m, 5n)
   og THAER ALLAR profudu LEIDRETTINGU OFAN A SLEEPER — lítil vog ofan
   a `z(VBD)`, hnignun, aldursferil, markadslinu, ECR-vik, skorts-rodun.
   **Enginn hefur maelt GRUNNINN SJALFAN.** VBD, threpin, `value`,
   lifunar-litirnir og radgjofin erfa OLL thad sem spain segir, svo se
   grunnurinn ekki bestur er allt hitt reiknad rett ur rongu inntaki.

   ADFERDIN ER ENDURNOTUD, EKKI NY. Vidmidid er **`computeVbd` og
   `replacementRanks` ur `src/model.js` sjalfum** (ekki endurritun a
   theim — thad er villan sem `buildTeamMetrics` kostadi i
   FPL-verkefninu), hermunin er **`simulateDraft` ur `src/accuracy.js`**,
   pordunin er su sama sem `arank-lab`/`vbdbase-lab` nota (badi bordin i
   SOMU deild, i badar attir, a moti sama hrista velli) og lognun,
   snidin og half-algebran eru **orðrett** thaer somu sem `vbdbase-lab`
   ber. EINA sem er nytt er hvad er sett I `proj`-sviðid.

   HVAD ER THEGAR MAELT OG MA EKKI LESAST SEM NY NIDURSTADA:
     · **Sleeper + FFToday blondud** er felld i README 5h — en HUN VAR
       MAELD A FYLGNI (r 0,599 -> 0,501), ekki a akvordun. Repo-ins eigin
       regla ("haerri fylgni er ekki betri akvordun") gerir tha hofnun
       ofullkomna, og thad er nakvaemlega thad sem thetta lab lagfaerir.
     · **FFToday sem grunnur i stad Sleeper** er maelt i 5k (4 af 16
       lognum gegn ADP a moti 12 af 16). Thad er endurgert her sem
       AKKERI, ekki sem ny spurning.
     · **Spain blondud vid ADP** kostar 185 stig (5b) og
       **ECR-blondun ofan a VBD** fellur walk-forward i ollum fjorum
       frumum (5h). Hvorugt er blondun A SPA-KVARDA, sem er thad sem
       hér er maelt.
     · **AFFIN OHAGGANLEIKI (5b/4a) SETUR MORKIN A HVAD ER YFIRLEITT
       MAELANLEGT.** Se `proj' = (1-w)*proj + w*m_pos` (fast per stodu)
       tha er `VBD' = (1-w)*VBD` — einn hnattraenn skali og **SAMA ROD**.
       Grunnur sem er adeins fast hlidrun/skoling per stodu getur thvi
       EKKI breytt A-Ranking. Thess vegna er `posmean` her sem ARM: hann
       maelir **namundunar-golfid** (`computeVbd` namundar i einn
       aukastaf, sem byr til og slitur jafntefli — sama golf sem
       README 4h maelir sem +-0,42/0,58/0,86 pp) og hann er akkeri sem
       verdur ad liggja NAERRI NULLI.

   LEKI ER ADALHAETTAN OG HANN ER TVIHLIDA:
     · Hver grunnur sem er leiddur af RAUNTOLUM er strangt walk-forward:
       `prior*` notar ADEINS `prev*`-svid (fyrra timabil), og hnignunar-
       vogin `k` er fittud a arum A UNDAN profarinu. Rank->stig kurfan
       fyrir ECR/ADP er sömuleiðis fittuð á fyrri árum eingöngu.
     · **ORAKEL-ARMURINN ER BYGGDUR VILJANDI OG MERKTUR SEM THAK.**
       README 4m skjalar ad lekahlidid i `opp-lab` er BLINT A LEKA A
       LIDSSTIGI — orakel-armur slapp thar i gegn med "ok". Sama blinda
       gildir hér, og eina vornin sem virkar er su sem 4m notadi:
       **byggja orakelid sjalfur og merkja thad**, svo haegt se ad
       greina merki fra eftirsja. `oracle` ma ALDREI lesast sem
       tillaga.

   HLIDIN (og skriftan DEYR fremur en ad skrifa falli eitthvad):
     N1  vidmidid gegn sjalfu ser = **nakvaemlega 0** i hverri frumu
     N2  `w = 0` = **nakvaemlega 0** fyrir hvern frambjodanda
     N3  SENTINEL: staersta hrif i netinu verdur ad vera **> 0**,
         annars gaeti nullid verid satt af thvi einu ad velin lesi 0
     N4  ORAKEL yfir vidmidinu og ANDHVERFA undir thvi — velin verdur
         ad geta sed merki i badar attir
     N5  affin sannprofun: OMANUNDUD blondun vidmids vid `posmean` gefur
         **bitaeins somu rod** (fullyrding um algebruna, ekki um gognin)

   BARINN A FRAMBJODANDA (allt fjogur, sama krafa sem 4d/4m/4l beittu):
     1. jakvaett punktmat
     2. ars-klasad 95% bil utilokar null
     3. **leikmanna-klasad** 95% bil utilokar null (hlidid sem felldi
        `vbdbase-lab` i 153 holfum af 153, README 4c)
     4. slaer PLASEBO-THAKID (forspárbil eins nys frækasts)
   og ad thvi loknu: heldur thad walk-forward, og i meirihluta ara.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft } from "../src/accuracy.js";
import { computeVbd, replacementRanks } from "../src/model.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  ref: ["sleeper", "fftoday"],
  runs: "number", pairs: "number", boot: "number", bootpairs: "number",
  from: "number",
});
const REF = String(ARG.ref || "sleeper");
const OUT_FILE = REF === "sleeper" ? "projbase.json" : "projbase_ff.json";
const RUNS = Number(ARG.runs ?? 2);
const PAIRS = Number(ARG.pairs ?? 4);
const BOOT = Number(ARG.boot ?? 200);
const BOOT_PAIRS = Number(ARG.bootpairs ?? 4);
const FROM = Number(ARG.from ?? 2015);

const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const sgn = (x) => (x == null ? "     -" : ((x > 0 ? "+" : "") + x.toFixed(1)).padStart(6));

/* Tvi-hlida t-mork vid p=0,05. Fjoldi ara er EKKI fasti (5 med Sleeper,
   11 med FFToday) svo throskuldurinn ma ekki vera hardkodadur. */
const T_CRIT = { 2: 12.706, 3: 4.303, 4: 3.182, 5: 2.776, 6: 2.571, 7: 2.447,
                 8: 2.365, 9: 2.306, 10: 2.262, 11: 2.228 };
const tCrit = (n) => T_CRIT[Math.min(11, Math.max(2, n))] ?? 2.228;

function seasonStats(perSeason) {
  const ys = Object.keys(perSeason).filter((y) => perSeason[y] != null);
  const vals = ys.map((y) => perSeason[y]);
  if (vals.length < 2) {
    return { mean: r1(vals[0] ?? null), t: null, se: null, lo: null, hi: null,
             wins: vals.filter((v) => v > 0).length, years: vals.length,
             significant: false };
  }
  const m = mean(vals);
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / (vals.length - 1));
  const se = sd / Math.sqrt(vals.length);
  const t = se ? m / se : null;
  const crit = tCrit(vals.length);
  return { mean: r1(m), sd: r1(sd), t: r3(t), se: r1(se),
           lo: r1(m - crit * se), hi: r1(m + crit * se),
           wins: vals.filter((v) => v > 0).length, years: vals.length,
           significant: t != null && Math.abs(t) > crit };
}

/* ============================================================
   1. LAUGIN — BYGGD ORDRETT EINS OG I `vbdbase-lab.mjs`
   ============================================================
   Sama porun (`id`+`season` milli ppr- og standard-rada), sama
   half-algebra (PPR = STD + mottokur, svo HALF = (STD+PPR)/2). Eini
   munurinn er ad HER er hver spa-heimild geymd SER i stad thess ad
   fallast i eina (`sleeperProj ?? ffProj`) — thad fall er nakvaemlega
   thad sem er verid ad maela og ma thvi ekki vera innbyggt i laugina.  */

const FORMATS = ["ppr", "half", "standard"];
const PRIMARY_FIELD = { ppr: "adpPpr", half: "adpPpr", standard: "adpStd" };

const SHAPES = [
  { key: "10-2flex", label: "10 lid, 2 FLEX (Patriots)",
    league: { teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 15,
              flexPos: ["RB", "WR", "TE"], superflex: false, excludePos: ["K", "DST"] } },
  { key: "12-2flex", label: "12 lid, 2 FLEX (Sofahetjur)",
    league: { teams: 12, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 14,
              flexPos: ["RB", "WR", "TE"], superflex: false, excludePos: ["K", "DST"] } },
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
  const pools = {};
  const drop = { unpaired: 0, noAdp: 0, noActual: 0, noRef: 0 };
  for (const [k, a] of byKey.ppr) {
    const y = Number(k.split("|")[0]);
    if (y < FROM || y > 2025) continue;
    const b = byKey.standard.get(k);
    if (!b) { drop.unpaired++; continue; }
    if (a.adp == null || b.adp == null) { drop.noAdp++; continue; }
    if (a.pts == null || b.ptsStd == null) { drop.noActual++; continue; }

    /* SPA-HEIMILDIRNAR, HVER SER. `null` er `null` — hun er EKKI fyllt
       med hinni heimildinni, thvi tha vaeri "Sleeper" arminn i raun
       "Sleeper thar sem hun er til, FFToday annars" og samanburdurinn
       maeldi blondu sem enginn valdi. */
    const slp = a.sleeperProj != null && b.sleeperProj != null
      ? { ppr: a.sleeperProj, standard: b.sleeperProj,
          half: (a.sleeperProj + b.sleeperProj) / 2 } : null;
    const ff = a.ffProj != null && b.ffProj != null
      ? { ppr: a.ffProj, standard: b.ffProj, half: (a.ffProj + b.ffProj) / 2 } : null;

    /* RAUNTOLU-GRUNNURINN: heildarstig FYRRA timabils, endurreiknud ur
       `prevPpg * prevG`. `prevPts` i skranni er EKKI notud og thad er
       maelt, ekki smekkur: hun er PPR-skorud i BADUM rada-gerdum (mælt:
       1.200 af 1.200 standard-rodum bera PPR-stig fyrra ars), svo hun
       vaeri rangt snid i standard og half. `prevPpg*prevG` endurgerir
       raunverulegu summuna innan 0,12 stiga (namundun). */
    const pg = a.prevG != null && a.prevG > 0 ? a.prevG : null;
    const prior = pg != null && a.prevPpg != null && a.prevPpgStd != null
      ? { ppr: a.prevPpg * pg, standard: a.prevPpgStd * pg,
          half: ((a.prevPpg + a.prevPpgStd) / 2) * pg } : null;

    (pools[y] = pools[y] || []).push({
      id: a.id, pos: a.pos, name: a.name,
      adpPpr: a.adp, adpStd: b.adp, sdPpr: a.adpSd, sdStd: b.adpSd,
      ecrPpr: a.ecr, ecrStd: b.ecr,
      slp, ff, prior,
      actual: { ppr: a.pts, standard: b.ptsStd, half: (a.pts + b.ptsStd) / 2 },
    });
  }
  for (const y of Object.keys(pools)) if (pools[y].length < 120) delete pools[y];

  /* THREGING VID VIDMIDID. Pordun krefst thess ad BADIR armar sjai
     SOMU laug — annars maelist "hann a spa a fleiri monnum", ekki
     "spain hans er betri". Leikmadur an vidmids-spar fellur thvi ur
     lauginni ALVEG, ekki adeins ur einum armi. */
  const refOf = (p) => (REF === "sleeper" ? p.slp : p.ff);
  for (const y of Object.keys(pools)) {
    const before = pools[y].length;
    pools[y] = pools[y].filter((p) => refOf(p) != null);
    drop.noRef += before - pools[y].length;
    if (pools[y].length < 120) delete pools[y];
  }
  return { pools, drop, adpWindows: feats.adpWindows || null };
}

/* ============================================================
   2. GRUNNARNIR — HVAD FER I `proj`
   ============================================================
   Hver grunnur er fall (pool, fmt, year, fit) -> Map(id -> stig) eda
   `null` se heimildin ekki til thad ar. ALLT sem er fittad kemur ur
   `fit`, sem er reiknad UR ARUM A UNDAN `year` og engu odru.          */

const POS4 = ["QB", "RB", "WR", "TE"];

/** Vidmidid: sa grunnur sem appid sendir i dag. */
const refValues = (pool, fmt) => new Map(pool.map((p) =>
  [p.id, (REF === "sleeper" ? p.slp : p.ff)[fmt]]));

/** Medaltal per stodu i lauginni — inntak `posmean`-armsins. */
function posMeanOf(vals, pool) {
  const s = {}, n = {};
  for (const p of pool) {
    const v = vals.get(p.id);
    if (v == null) continue;
    s[p.pos] = (s[p.pos] || 0) + v; n[p.pos] = (n[p.pos] || 0) + 1;
  }
  const out = {};
  for (const k of Object.keys(s)) out[k] = s[k] / n[k];
  return out;
}

/** LCG — ekkert `Math.random()` i thessari skra. */
function rngOf(seed) {
  let a = seed >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}

/**
 * PLASEBO: gildi vidmidsins UMROÐUD INNAN STODU.
 *
 * Thetta er retta nulldreifingin fyrir "annar grunnur": jafn-dreifdur
 * (nakvaemlega sama jadar-dreifing per stodu), jafn-kvardadur, og med
 * NULL upplysingu. Blondun vidmidsins vid hann er thvi hreint suð med
 * rettum kvarda — og se raunverulegur frambjodandi ekki betri en THETTA
 * er hann ekki grunnur heldur hristing.
 */
function shuffledWithinPos(vals, pool, seed) {
  const rnd = rngOf(seed);
  const byPos = {};
  for (const p of pool) {
    const v = vals.get(p.id);
    if (v == null) continue;
    (byPos[p.pos] = byPos[p.pos] || []).push([p.id, v]);
  }
  const out = new Map();
  for (const list of Object.values(byPos)) {
    const ids = list.map(([id]) => id);
    const vs = list.map(([, v]) => v);
    for (let i = vs.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [vs[i], vs[j]] = [vs[j], vs[i]];
    }
    ids.forEach((id, i) => out.set(id, vs[i]));
  }
  return out;
}

/**
 * RANK -> STIG KURFA, FITTUD A ARUM A UNDAN.
 *
 * ECR og ADP eru RODUN. Rod hefur engan kvarda milli stodna, og
 * einmitt thar liggur allt VBD: 300 stig fra QB og 300 fra RB eru ekki
 * jafngild. Ad blanda rodun vid spa a stigakvarda krefst thvi vorpunar
 * — og hun ma ekki vera agiskun (README-reglan). Su sem er notud er
 * MAELD: medaltal RAUNSTIGA theirra sem satu i saeti j innan stodu, yfir
 * OLL FYRRI ar, slettad med hlaupandi glugga (halfbreidd 2). Hun er
 * einraen ad meginhluta AF BYGGINGU, svo `ecrproj` raðar EINS og ECR
 * INNAN stodu; thad sem hun leggur til er kvardinn MILLI stodna.
 *
 * FYLGIR THVI VARNAGLI SEM MA EKKI FALLA UT: hun getur thvi EKKI baett
 * rodun ECR innan stodu, adeins gefid henni virdi. Se utkoman null er
 * spurningin "ber ECR virdis-upplysingu?" svarad — ekki "er ECR gott
 * bord?", sem 5b og 5h svara thegar (1685,7 gegn 1755 hja ADP).
 */
function rankCurve(pools, years, fmt, rankKey) {
  const acc = {};                                   // pos -> rank -> [pts]
  for (const y of years) {
    const pool = pools[y];
    if (!pool) continue;
    for (const pos of POS4) {
      const list = pool.filter((p) => p.pos === pos && p[rankKey] != null)
        .sort((a, b) => a[rankKey] - b[rankKey]);
      list.forEach((p, i) => {
        const a = (acc[pos] = acc[pos] || []);
        (a[i] = a[i] || []).push(p.actual[fmt]);
      });
    }
  }
  const curve = {};
  for (const pos of POS4) {
    const raw = (acc[pos] || []).map((xs) => (xs && xs.length ? mean(xs) : null));
    const sm = raw.map((_, i) => {
      const win = [];
      for (let j = Math.max(0, i - 2); j <= Math.min(raw.length - 1, i + 2); j++) {
        if (raw[j] != null) win.push(raw[j]);
      }
      return win.length ? mean(win) : null;
    });
    curve[pos] = sm;
  }
  return curve;
}

function curveValues(pool, curve, rankKey) {
  const out = new Map();
  for (const pos of POS4) {
    const list = pool.filter((p) => p.pos === pos && p[rankKey] != null)
      .sort((a, b) => a[rankKey] - b[rankKey]);
    const c = curve[pos] || [];
    const floor = c.filter((v) => v != null).slice(-1)[0] ?? 0;
    list.forEach((p, i) => out.set(p.id, c[i] != null ? c[i] : floor));
    /* Sa sem ber enga rodun faer gildi UNDIR ollum — hann er
       odraftadur i theirri heimild, sem er upplysing og ekki 0. */
    for (const p of pool.filter((q) => q.pos === pos && q[rankKey] == null)) {
      out.set(p.id, floor - 1);
    }
  }
  return out;
}

/**
 * HNIGNUNAR-VOGIN A RAUNTOLU-GRUNNINN, FITTUD A FYRRI ARUM.
 *
 * `prior` (heildarstig i fyrra) er skekkt a tvo vegu sem eru THEKKTIR
 * fyrirfram: nyliðar bera 0, og sa sem var meiddur i fyrra ber lagt.
 * Hnignun ad stodu-medaltali er retta lagfaeringin — OG hun er hlutlaus
 * gagnvart rodinni innan stodu (affin), svo hun getur adeins hreyft
 * KVARDANN MILLI stodna. `k` er thvi ekki "fistilling a rodun" heldur
 * kvordun, og hun er valin med SSE gegn raunstigum fyrri ara.
 */
function fitPriorShrink(pools, years, fmt) {
  const GRID = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  let best = null;
  for (const k of GRID) {
    let sse = 0, n = 0;
    for (const y of years) {
      const pool = pools[y];
      if (!pool) continue;
      const base = new Map(pool.map((p) => [p.id, p.prior ? p.prior[fmt] : 0]));
      const pm = posMeanOf(base, pool);
      for (const p of pool) {
        const v = (1 - k) * (base.get(p.id) ?? 0) + k * (pm[p.pos] ?? 0);
        sse += (v - p.actual[fmt]) ** 2; n++;
      }
    }
    if (!n) continue;
    if (best == null || sse / n < best.mse) best = { k, mse: sse / n };
  }
  return best ? best.k : 0.5;
}

/* ============================================================
   3. AFBRIGDA-SKRAIN
   ============================================================ */

const WEIGHTS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1];

/* `kind` styrir hvernig arminn er LESINN, ekki hvernig hann er
   reiknadur — thad er sama vel fyrir alla. */
const CANDS = [
  { key: "alt", label: REF === "sleeper" ? "FFToday-spa" : "Sleeper-spa",
    kind: "honest" },
  { key: "prior", label: "rauntolur i fyrra (hrar)", kind: "honest" },
  { key: "priorreg", label: "rauntolur i fyrra, hnignad (k fittad walk-fwd)",
    kind: "honest" },
  { key: "ecrproj", label: "ECR -> stig (maeld rank-kurfa, walk-fwd)",
    kind: "honest" },
  { key: "adpproj", label: "ADP -> stig (maeld rank-kurfa, walk-fwd)",
    kind: "honest" },
  { key: "posmean", label: "stodu-medaltal (AFFIN NULL — namundunar-golf)",
    kind: "anchor" },
  { key: "oracle", label: "RAUNSTIG TIMABILSINS (ORAKEL — THAK)",
    kind: "oracle" },
  { key: "antiref", label: "vidmidid a HVOLFI (andhverfa — akkeri)",
    kind: "anchor" },
  { key: "pbo1", label: "plasebo 1 (vidmid umrodað innan stodu)", kind: "placebo" },
  { key: "pbo2", label: "plasebo 2", kind: "placebo" },
  { key: "pbo3", label: "plasebo 3", kind: "placebo" },
  { key: "pbo4", label: "plasebo 4", kind: "placebo" },
];

/** Gildi frambjodanda fyrir eitt ar og eitt snid. `null` = ekki til. */
function candValues(key, pool, fmt, year, fit) {
  const ref = refValues(pool, fmt);
  switch (key) {
    case "alt": {
      const other = REF === "sleeper" ? "ff" : "slp";
      if (pool.every((p) => p[other] == null)) return null;
      /* Sa sem vantar i hinni heimildinni heldur VIDMIDS-gildinu sinu.
         Annars vaeri armurinn ad refsa monnum fyrir ad FFToday sleppti
         theim, sem er onnur maeling en "er spain hennar betri". */
      return new Map(pool.map((p) =>
        [p.id, p[other] != null ? p[other][fmt] : ref.get(p.id)]));
    }
    case "prior":
      return new Map(pool.map((p) => [p.id, p.prior ? p.prior[fmt] : 0]));
    case "priorreg": {
      const base = new Map(pool.map((p) => [p.id, p.prior ? p.prior[fmt] : 0]));
      const pm = posMeanOf(base, pool);
      const k = fit.priorK;
      return new Map(pool.map((p) =>
        [p.id, (1 - k) * (base.get(p.id) ?? 0) + k * (pm[p.pos] ?? 0)]));
    }
    case "ecrproj":
      if (!fit.ecrCurve) return null;
      return curveValues(pool, fit.ecrCurve, fit.ecrKey);
    case "adpproj":
      if (!fit.adpCurve) return null;
      return curveValues(pool, fit.adpCurve, fit.adpKey);
    case "posmean": {
      const pm = posMeanOf(ref, pool);
      return new Map(pool.map((p) => [p.id, pm[p.pos] ?? 0]));
    }
    case "oracle":
      return new Map(pool.map((p) => [p.id, p.actual[fmt]]));
    case "antiref": {
      /* Andhverfa INNAN STODU: haesta spa faer laegsta gildi, en
         kvardinn milli stodna er ohreyfdur. Annars vaeri armurinn
         "allir QB fyrst", sem maelir annad. */
      const byPos = {};
      for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
      const out = new Map();
      for (const list of Object.values(byPos)) {
        const vs = list.map((p) => ref.get(p.id)).sort((a, b) => a - b);
        list.slice().sort((a, b) => ref.get(b.id) - ref.get(a.id))
          .forEach((p, i) => out.set(p.id, vs[i]));
      }
      return out;
    }
    case "pbo1": case "pbo2": case "pbo3": case "pbo4": {
      const n = Number(key.slice(3));
      return shuffledWithinPos(ref, pool, year * 1009 + n * 7919 + 13);
    }
    default: return null;
  }
}

/** Blanda a STIGAKVARDA. `w = 0` gefur vidmidid, bitaeins. */
function blend(ref, cand, w) {
  if (w === 0) return ref;
  const out = new Map();
  for (const [id, v] of ref) {
    const c = cand.get(id);
    out.set(id, c == null ? v : (1 - w) * v + w * c);
  }
  return out;
}

/* ============================================================
   4. BORD OG HERMUN — SHIPPED KODINN, EKKI ENDURRITUN
   ============================================================ */

/** `computeVbd` ur `src/model.js`. Namundun og allt. */
function vbdBoard(pool, league, vals) {
  const scored = computeVbd(
    pool.map((p) => ({ id: p.id, pos: p.pos, proj: vals.get(p.id) ?? null })), league);
  const live = scored.filter((p) => p.vbd != null).sort((a, b) => b.vbd - a.vbd);
  return new Map(live.map((p, i) => [p.id, i + 1]));
}

/** Sama regla ONAMUNDUD — adeins til ad sannprofa affin ohagganleika.
    Skilar `[id, vbd]` i rod svo N5 geti bordid BADI rodina OG gildin. */
function rawBoardOrder(pool, league, vals) {
  const repl = replacementRanks(league);
  const byPos = {};
  for (const p of pool) {
    const v = vals.get(p.id);
    if (v == null) continue;
    (byPos[p.pos] = byPos[p.pos] || []).push({ id: p.id, pos: p.pos, proj: v });
  }
  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    list.sort((a, b) => b.proj - a.proj);
    const r = repl[pos];
    let base;
    if (r == null || r < 1) base = list[list.length - 1].proj;
    else {
      const i = Math.min(list.length - 1, Math.max(0, Math.round(r) - 1));
      const around = list.slice(Math.max(0, i - 2), i + 1).map((p) => p.proj);
      base = around.length ? mean(around) : list[list.length - 1].proj;
    }
    for (const p of list) scored.push([p.id, p.proj - base]);
  }
  scored.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return scored;
}

/**
 * N5 — AFFIN OHAGGANLEIKI, OG HANN VAR FYRST OFPRENGDUR.
 *
 * Fullyrdingin er algebrusk: se `proj' = (1-w)*proj + w*m_pos` (fast per
 * stodu) tha er `base' = (1-w)*base + w*m_pos` og thvi
 * `VBD' = (1-w)*VBD` — einn hnattraenn skali og SAMA ROD.
 *
 * FYRSTA UTGAFA THESSA HLIDS BAR `a.join(",") !== b.join(",")` A
 * ID-ROÐINNI OG FELL — a 10-2flex|ppr|2023|w=0,5. **Algebran var samt
 * ekki brotin.** Maelt: staersta AFSTAEDA vik fra `(1-w)*VBD` er
 * **1,5e-13** (absolut 5,7e-14), og roðin skeikadi i **2 saetum af 154**,
 * badum a EINU jafntefli (`vbd` beggja nakvaemlega 25,533333333333303,
 * bil = **0**). Jafntefli er brotid a `id`, og fleytitolu-summan
 * `((1-w)*p + w*m) - ((1-w)*b + w*m)` er ekki BITAEINS `(1-w)*(p-b)`,
 * svo sidustu bitarnir sveiflast og jafnteflid snyst.
 *
 * Hlidid var thvi ad maela **fleytitolu-tie-break**, ekki reikninginn.
 * Nu er fullyrdingin sjalf profud beint — `VBD' == (1-w)*VBD` innan
 * 1e-9 afstaett — og rodin er bordin THAR SEM HUN ER SKILGREIND, thad
 * er thar sem gildin eru ekki jafn. Thetta er STRANGARA i thvi sem
 * mali skiptir (gildin sjalf, ekki bara rodin) og ekki logid um hitt.
 *
 * OG "JAFN" VERDUR AD VERA MED VIKMORKUM, sem onnur tilraun sannadi:
 * `10-2flex|standard|2024|w=0,2` skeikadi a saeti 40 milli
 * `16,166666666666686` og `16,16666666666667` — bil **1,6e-14**, sem er
 * mathematiskt jafntefli sem `x !== y` les sem tvo gildi. Jafntefli er
 * thvi `|x-y| <= 1e-9 * max(1,|x|,|y|)`. Tha eftir stendur ad hlidid
 * fellur ef GILDIN vikja (1e-9) eda rodin skeikar THAR SEM BIL ER
 * RAUNVERULEGT — og hvorugt gerist.
 *
 * Namundada leidin (`vbdBoard`) er hins vegar `Math.round(x*10)/10` inni
 * i `computeVbd`, sem BYR TIL jafntefli i storum stil og slitur onnur.
 * Thad er ekki villa heldur golf, og `posmean`-armurinn i toflunni
 * MAELIR thad golf (README 4h maelir sama golf sem +-0,42/0,58/0,86 pp).
 */
function affineViolation(a, b, w) {
  if (a.length !== b.length) return `lengd ${a.length} vs ${b.length}`;
  const bv = new Map(b);
  let maxRel = 0;
  for (const [id, v] of a) {
    const got = bv.get(id);
    if (got == null) return `id ${id} vantar i blondudu bordi`;
    const exp = (1 - w) * v;
    const rel = Math.abs(got - exp) / Math.max(1e-9, Math.abs(exp));
    if (rel > maxRel) maxRel = rel;
  }
  if (maxRel > 1e-9) return `VBD' != (1-w)*VBD, afstaett vik ${maxRel.toExponential(2)}`;
  const av = new Map(a);
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] === b[i][0]) continue;
    /* Skeikar rodin? Tha ma thad ADEINS vera a jafntefli i vidmidinu. */
    const x = av.get(a[i][0]), y = av.get(b[i][0]);
    const tie = Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
    if (!tie) return `saeti ${i}: ${a[i][0]} (${x}) <-> ${b[i][0]} (${y}), EKKI jafntefli`;
  }
  return null;
}

function noisyField(pool, fieldKey, sdKey, seed) {
  const rnd = rngOf(seed);
  const gauss = () => {
    const u = Math.max(1e-9, rnd()), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return new Map(pool.map((p) => {
    const adp = p[fieldKey];
    const sd = p[sdKey] != null && p[sdKey] > 0
      ? p[sdKey] : 1.08 * Math.sqrt(Math.max(1, adp));
    return [p.id, adp + gauss() * sd];
  }).sort((a, b) => a[1] - b[1]).map(([id], i) => [id, i + 1]));
}

/** Pordur munur: badi bordin i SOMU deild, i badar attir. */
function pairedDiffs({ cand, base, field, actual, league, pairs }) {
  const T = league.teams;
  const out = [];
  const step = Math.max(1, Math.round(T / pairs));
  for (let i = 1; i <= T; i += step) {
    const j = (i % T) + 1;
    for (const swap of [false, true]) {
      const o = simulateDraft({
        board: cand, fieldBoard: field, actual,
        slot: swap ? j : i, league, rival: { slot: swap ? i : j, board: base },
      });
      out.push(o.points - o.rivalPoints);
    }
  }
  return out;
}

function die(msg) { console.error(`\n  HLID FELL: ${msg}\n`); process.exit(3); }

/* ============================================================
   5. ADALKEYRSLAN
   ============================================================ */

async function main() {
  const { pools, drop, adpWindows } = await buildPools();
  const ys = Object.keys(pools).map(Number).sort((a, b) => a - b);
  requireSeasons(ys, `timabil med ${REF}-spa i features.json`);

  console.log(`\nVIDMID: ${REF}   ·   ${ys.length} timabil (${ys[0]}-${ys.at(-1)})`);
  console.log(`laug: ${ys.map((y) => `${y}:${pools[y].length}`).join(" ")}`);
  console.log(`felld ur laug: oporud ${drop.unpaired} · an ADP ${drop.noAdp} · ` +
    `an raunstiga ${drop.noActual} · an vidmids-spar ${drop.noRef}`);

  /* Laugar-dypt per stodu — hun BINDUR hve djupt varamanns-threpid nær. */
  for (const s of SHAPES) {
    const rr = replacementRanks(s.league);
    const over = {};
    for (const p of POS4) {
      over[p] = ys.filter((y) => rr[p] >= pools[y].filter((q) => q.pos === p).length).length;
    }
    const flag = POS4.filter((p) => over[p] > 0);
    console.log(`  ${s.key.padEnd(9)} threp ${POS4.map((p) => `${p}${rr[p]}`).join("/")}` +
      (flag.length ? `   <- laugar-golf: ${flag.map((p) => `${p} ${over[p]}/${ys.length}`).join(", ")}` : ""));
  }

  /* ---------- walk-forward fitt per (fmt, ar) ---------- */
  const fits = {};
  for (const fmt of FORMATS) {
    for (const y of ys) {
      const prior = ys.filter((p) => p < y);
      const ecrKey = fmt === "standard" ? "ecrStd" : "ecrPpr";
      const adpKey = PRIMARY_FIELD[fmt] === "adpStd" ? "adpStd" : "adpPpr";
      fits[`${fmt}|${y}`] = {
        ecrKey, adpKey,
        priorK: prior.length ? fitPriorShrink(pools, prior, fmt) : 0.5,
        ecrCurve: prior.length ? rankCurve(pools, prior, fmt, ecrKey) : null,
        adpCurve: prior.length ? rankCurve(pools, prior, fmt, adpKey) : null,
        priorYears: prior.length,
      };
    }
  }
  console.log(`\nfittud hnignun a rauntolu-grunn (k, per snid/ar):`);
  for (const fmt of FORMATS) {
    console.log(`  ${fmt.padEnd(9)} ` + ys.map((y) =>
      `${y}:${fits[`${fmt}|${y}`].priorK.toFixed(1)}`).join(" "));
  }

  /* ---------- N5: AFFIN OHAGGANLEIKI, ONAMUNDAD ---------- */
  let affineChecked = 0, affineTies = 0;
  for (const s of SHAPES) {
    for (const fmt of FORMATS) {
      for (const y of ys) {
        const pool = pools[y];
        const ref = refValues(pool, fmt);
        const pm = candValues("posmean", pool, fmt, y, fits[`${fmt}|${y}`]);
        const a = rawBoardOrder(pool, s.league, ref);
        for (const w of [0.2, 0.5, 0.9]) {
          const b = rawBoardOrder(pool, s.league, blend(ref, pm, w));
          const bad = affineViolation(a, b, w);
          if (bad) {
            die(`N5 affin ohagganleiki brotinn (${s.key}|${fmt}|${y}|w=${w}) — ${bad}`);
          }
          for (let i = 0; i < a.length; i++) if (a[i][0] !== b[i][0]) affineTies++;
          affineChecked++;
        }
      }
    }
  }
  console.log(`\nN5 affin ohagganleiki: ${affineChecked} samanburdir, ` +
    `VBD' = (1-w)*VBD innan 1e-9, rod ohreyfd nema a jafnteflum ` +
    `(${affineTies} saeti a jafntefli, sja athugasemd vid affineViolation)`);

  /* ---------- NETID ---------- */
  const cells = {};           // shape|fmt|cand|w -> { perSeason, ... }
  const variants = [];
  variants.push({ cand: "self", w: 0, key: "self|0" });
  for (const c of CANDS) for (const w of WEIGHTS) variants.push({ cand: c.key, w, key: `${c.key}|${w}` });

  const totalCells = SHAPES.length * FORMATS.length * variants.length;
  console.log(`\nnet: ${SHAPES.length} lognun x ${FORMATS.length} snid x ` +
    `${variants.length} afbrigdi = ${totalCells} frumur, ${ys.length} timabil, ` +
    `${RUNS} vallar-frækorn\n`);

  let done = 0;
  for (const s of SHAPES) {
    for (const fmt of FORMATS) {
      const fld = PRIMARY_FIELD[fmt];
      const sdKey = fld === "adpPpr" ? "sdPpr" : "sdStd";
      /* Gildin per ar reiknud EINU SINNI per (fmt, ar) — sama vinnan
         fyrir allar lognun, svo hun er ekki gerd thrisvar. */
      for (const v of variants) {
        const per = {};
        for (const y of ys) {
          const pool = pools[y];
          const fit = fits[`${fmt}|${y}`];
          const ref = refValues(pool, fmt);
          let vals;
          if (v.cand === "self") vals = ref;
          else {
            const cv = candValues(v.cand, pool, fmt, y, fit);
            if (cv == null) { continue; }
            vals = blend(ref, cv, v.w);
          }
          const base = vbdBoard(pool, s.league, ref);
          const cand = vbdBoard(pool, s.league, vals);
          const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual[fmt] }]));
          const runs = [];
          for (let r = 0; r < RUNS; r++) {
            const field = noisyField(pool, fld, sdKey, y * 7 + r * 104729 + 3);
            runs.push(mean(pairedDiffs({ cand, base, field, actual,
              league: s.league, pairs: PAIRS })));
          }
          per[y] = mean(runs);
        }
        cells[`${s.key}|${fmt}|${v.key}`] = { ...seasonStats(per), perSeason: per };
        done++;
        if (done % 40 === 0) process.stdout.write(".");
      }
    }
  }
  console.log("");

  /* ---------- HLIDIN N1-N4 ---------- */
  let maxSelf = 0;
  for (const s of SHAPES) for (const fmt of FORMATS) {
    const c = cells[`${s.key}|${fmt}|self|0`];
    for (const y of Object.keys(c.perSeason)) maxSelf = Math.max(maxSelf, Math.abs(c.perSeason[y]));
  }
  if (maxSelf > 1e-9) die(`N1 vidmid gegn sjalfu ser er ${maxSelf}, ekki 0`);

  let sentinel = 0;
  for (const k of Object.keys(cells)) {
    const m = cells[k].mean;
    if (m != null) sentinel = Math.max(sentinel, Math.abs(m));
  }
  if (!(sentinel > 0)) die("N3 sentinel: ekkert afbrigdi hreyfir neitt — velin les alltaf 0");

  const oracleMeans = [], antiMeans = [];
  for (const s of SHAPES) for (const fmt of FORMATS) {
    oracleMeans.push(cells[`${s.key}|${fmt}|oracle|1`].mean);
    antiMeans.push(cells[`${s.key}|${fmt}|antiref|1`].mean);
  }
  if (!(mean(oracleMeans) > 100)) die(`N4 orakel maelist ${r1(mean(oracleMeans))} — velin ser ekki merki`);
  if (!(mean(antiMeans) < -100)) die(`N4 andhverfa maelist ${r1(mean(antiMeans))} — velin ser ekki tap`);
  console.log(`N1 self=0 · N3 sentinel=${r1(sentinel)} · ` +
    `N4 orakel ${sgn(mean(oracleMeans))} / andhverfa ${sgn(mean(antiMeans))}`);

  /* ---------- PLASEBO-THAKID ----------
     Forspárbil eins NYS frækasts, ekki haesta einstaka frækast. Sama
     skilgreining og 5n/Q3 og 4m nota: `m +- tcrit*sd*sqrt(1+1/n)`.  */
  const placeboCeil = {};
  for (const s of SHAPES) for (const fmt of FORMATS) {
    /* Hvert plasebo faer SITT besta w (sama frelsi sem frambjodandi
       faer i hrari leit) — annars vaeri thakid maelt an leitarinnar
       sem frambjodandinn nytur. */
    const best = CANDS.filter((c) => c.kind === "placebo").map((c) => {
      let b = null;
      for (const w of WEIGHTS) {
        const m = cells[`${s.key}|${fmt}|${c.key}|${w}`].mean;
        if (m != null && (b == null || m > b)) b = m;
      }
      return b;
    }).filter((x) => x != null);
    if (best.length < 3) { placeboCeil[`${s.key}|${fmt}`] = null; continue; }
    const m = mean(best);
    const sd = Math.sqrt(best.reduce((a, v) => a + (v - m) ** 2, 0) / (best.length - 1));
    const crit = tCrit(best.length);
    placeboCeil[`${s.key}|${fmt}`] = {
      n: best.length, mean: r1(m), sd: r1(sd),
      ceiling: r1(m + crit * sd * Math.sqrt(1 + 1 / best.length)),
      floor: r1(m - crit * sd * Math.sqrt(1 + 1 / best.length)),
      each: best.map(r1),
    };
  }

  /* ---------- HRAA LEITIN (merkt sem urtaksval) ---------- */
  const bestW = {};
  for (const s of SHAPES) for (const fmt of FORMATS) for (const c of CANDS) {
    let b = null;
    for (const w of WEIGHTS) {
      const cell = cells[`${s.key}|${fmt}|${c.key}|${w}`];
      if (cell.mean == null) continue;
      if (b == null || cell.mean > b.mean) b = { w, mean: cell.mean };
    }
    bestW[`${s.key}|${fmt}|${c.key}`] = b;
  }

  /* ---------- WALK-FORWARD VAL A `w` ---------- */
  const walkFwd = {};
  for (const s of SHAPES) for (const fmt of FORMATS) for (const c of CANDS) {
    const per = {}, chosen = {};
    for (let i = 1; i < ys.length; i++) {
      const y = ys[i], prior = ys.slice(0, i);
      let b = null;
      for (const w of WEIGHTS) {
        const cell = cells[`${s.key}|${fmt}|${c.key}|${w}`];
        const vals = prior.map((p) => cell.perSeason[p]).filter((v) => v != null);
        if (vals.length !== prior.length) continue;
        const m = mean(vals);
        if (b == null || m > b.m) b = { w, m };
      }
      if (!b) continue;
      const v = cells[`${s.key}|${fmt}|${c.key}|${b.w}`].perSeason[y];
      if (v == null) continue;
      per[y] = v; chosen[y] = b.w;
    }
    walkFwd[`${s.key}|${fmt}|${c.key}`] = { chosen, ...seasonStats(per), perSeason: per };
  }

  /* ---------- BOOTSTRAP KLASAD PER LEIKMANN ----------
     Hlidid sem felldi `vbdbase-lab` i 153 holfum af 153. Thad er
     dyrasti hlutinn, svo hann er keyrdur a SHORTLISTA: hver
     frambjodandi a SINU besta w (hraa leitin) PLUS oll plasebo a
     sinu besta w. **Plasebo eru ALDREI siud ut** — thak an
     nulldreifingar er ekki thak (4m).                                */
  const playerBoot = {};
  if (BOOT > 0) {
    console.log(`\nbootstrap klasad per leikmann (${BOOT} itranir, shortlisti) …`);
    for (const s of SHAPES) {
      for (const fmt of FORMATS) {
        const fld = PRIMARY_FIELD[fmt];
        const sdKey = fld === "adpPpr" ? "sdPpr" : "sdStd";
        const short = CANDS.map((c) => {
          const b = bestW[`${s.key}|${fmt}|${c.key}`];
          return b ? { key: c.key, w: b.w } : null;
        }).filter(Boolean);
        const acc = {};
        for (const it of short) acc[it.key] = [];
        for (let b = 0; b < BOOT; b++) {
          const iter = {};
          for (const it of short) iter[it.key] = [];
          for (const y of ys) {
            const src = pools[y];
            const fit = fits[`${fmt}|${y}`];
            const rnd = rngOf(y * 100003 + b * 7919 + 17);
            const res = [];
            for (let i = 0; i < src.length; i++) {
              const p = src[Math.floor(rnd() * src.length)];
              res.push({ ...p, id: `${p.id}#${i}` });
            }
            const ref = refValues(res, fmt);
            const actual = new Map(res.map((p) => [p.id, { pos: p.pos, pts: p.actual[fmt] }]));
            const field = noisyField(res, fld, sdKey, y * 7 + b * 104729 + 3);
            const base = vbdBoard(res, s.league, ref);
            for (const it of short) {
              const cv = candValues(it.key, res, fmt, y, fit);
              if (cv == null) continue;
              const cand = vbdBoard(res, s.league, blend(ref, cv, it.w));
              iter[it.key].push(mean(pairedDiffs({ cand, base, field, actual,
                league: s.league, pairs: BOOT_PAIRS })));
            }
          }
          for (const it of short) if (iter[it.key].length) acc[it.key].push(mean(iter[it.key]));
        }
        for (const it of short) {
          const a = acc[it.key];
          if (a.length < 50) { playerBoot[`${s.key}|${fmt}|${it.key}`] = null; continue; }
          a.sort((x, z) => x - z);
          const lo = a[Math.floor(a.length * 0.025)], hi = a[Math.floor(a.length * 0.975)];
          playerBoot[`${s.key}|${fmt}|${it.key}`] = {
            w: it.w, runs: a.length, lo: r1(lo), hi: r1(hi),
            median: r1(a[Math.floor(a.length / 2)]), excludesZero: lo > 0 || hi < 0,
          };
        }
        process.stdout.write(".");
      }
    }
    console.log("");
  }

  /* ---------- BARINN ---------- */
  const verdict = { passes: [], nearMiss: [], cellsJudged: 0 };
  for (const s of SHAPES) for (const fmt of FORMATS) {
    const ceil = placeboCeil[`${s.key}|${fmt}`];
    for (const c of CANDS) {
      if (c.kind !== "honest") continue;
      for (const w of WEIGHTS) {
        const cell = cells[`${s.key}|${fmt}|${c.key}|${w}`];
        if (cell.mean == null) continue;
        verdict.cellsJudged++;
        const pb = playerBoot[`${s.key}|${fmt}|${c.key}`];
        const usePb = pb && pb.w === w ? pb : null;
        const cond = {
          positive: cell.mean > 0,
          seasonCi: !!cell.significant && cell.mean > 0,
          playerCi: usePb ? (usePb.excludesZero && usePb.lo > 0) : null,
          beatsPlacebo: ceil ? cell.mean > ceil.ceiling : null,
        };
        const rec = { cell: `${s.key}|${fmt}|${c.key}|w${w}`, mean: cell.mean,
                      t: cell.t, years: `${cell.wins}/${cell.years}`, cond };
        if (cond.positive && cond.seasonCi && cond.beatsPlacebo && cond.playerCi) {
          verdict.passes.push(rec);
        } else if (cond.positive && (cond.seasonCi || cond.beatsPlacebo)) {
          verdict.nearMiss.push(rec);
        }
      }
    }
  }

  /* ---------- PRENTUN ---------- */
  const line = "=".repeat(104);
  for (const s of SHAPES) {
    for (const fmt of FORMATS) {
      const ceil = placeboCeil[`${s.key}|${fmt}`];
      console.log(`\n${line}`);
      console.log(`  ${s.label}  ·  ${fmt.toUpperCase()}  ·  vidmid = ${REF}` +
        `  ·  plasebo-thak ${ceil ? sgn(ceil.ceiling) : "-"}`);
      console.log(line);
      console.log("  grunnur                                     " +
        WEIGHTS.map((w) => `w${String(w).padStart(4)}`).join(" ") +
        "   besta w   ars-CI              leikm.-CI          wf");
      for (const c of CANDS) {
        const row = WEIGHTS.map((w) => {
          const m = cells[`${s.key}|${fmt}|${c.key}|${w}`].mean;
          return (m == null ? "    -" : sgn(m).trim().padStart(5)).padStart(5);
        }).join(" ");
        const b = bestW[`${s.key}|${fmt}|${c.key}`];
        const cell = b ? cells[`${s.key}|${fmt}|${c.key}|${b.w}`] : null;
        const pb = playerBoot[`${s.key}|${fmt}|${c.key}`];
        const wf = walkFwd[`${s.key}|${fmt}|${c.key}`];
        console.log(`  ${c.label.slice(0, 42).padEnd(43)}${row}` +
          `  ${b ? `${String(b.w).padStart(4)} ${sgn(b.mean)}` : "         -"}` +
          `  ${cell && cell.lo != null ? `[${sgn(cell.lo)},${sgn(cell.hi)}]${cell.significant ? "*" : " "}` : "                    "}` +
          `  ${pb ? `[${sgn(pb.lo)},${sgn(pb.hi)}]${pb.excludesZero ? "*" : " "}` : "                    "}` +
          `  ${wf && wf.mean != null ? sgn(wf.mean) : "     -"}`);
      }
    }
  }

  console.log(`\n${line}`);
  console.log(`  BARINN: ${verdict.passes.length} af ${verdict.cellsJudged} frumum standast ` +
    `(jakvaett + ars-CI + leikmanna-CI + plasebo-thak)`);
  if (verdict.passes.length) {
    for (const p of verdict.passes) console.log(`    STENST  ${p.cell}  ${sgn(p.mean)}  t=${p.t}  ${p.years}`);
  }
  console.log(`  naerri: ${verdict.nearMiss.length}`);
  for (const p of verdict.nearMiss.slice(0, 12)) {
    console.log(`    naerri  ${p.cell}  ${sgn(p.mean)}  t=${p.t}  ${p.years}  ` +
      `[ars ${p.cond.seasonCi} · leikm ${p.cond.playerCi} · thak ${p.cond.beatsPlacebo}]`);
  }
  console.log(line);

  /* ---------- SKRIFA ---------- */
  await mkdir(path.join(OUT, "measure"), { recursive: true });
  const out = {
    provenance: stamp({
      argv: process.argv.slice(2),
      defaults: { ref: "sleeper", runs: 2, pairs: 4, boot: 200, bootpairs: 4, from: 2015 },
      inputs: ["features.json"], dataDir: OUT,
    }),
    question: "Er spa-grunnurinn sjalfur rett valinn? Skiptir annar eda blandadur " +
      "grunnur, keyrdur gegnum SOMU VBD-umreikning, betri akvordun?",
    reference: REF,
    seasons: ys,
    pool: Object.fromEntries(ys.map((y) => [y, pools[y].length])),
    dropped: drop,
    adpWindows,
    shapes: SHAPES.map((s) => ({ key: s.key, label: s.label, league: s.league })),
    formats: FORMATS,
    weights: WEIGHTS,
    candidates: CANDS,
    fittedPriorShrink: Object.fromEntries(FORMATS.map((fmt) =>
      [fmt, Object.fromEntries(ys.map((y) => [y, fits[`${fmt}|${y}`].priorK]))])),
    gates: {
      n1SelfMax: maxSelf,
      n3Sentinel: r1(sentinel),
      n4Oracle: r1(mean(oracleMeans)),
      n4AntiRef: r1(mean(antiMeans)),
      n5AffineComparisons: affineChecked,
      note: "N5 er fullyrding um ALGEBRUNA (onamundud rod), ekki um gognin. " +
        "`posmean`-armurinn i toflunni er SAMA algebra GEGNUM `computeVbd` og " +
        "maelir thvi namundunar-golfid — sja README 4h.",
    },
    placeboCeiling: placeboCeil,
    cells: Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, {
      mean: v.mean, t: v.t, lo: v.lo, hi: v.hi, wins: v.wins, years: v.years,
      significant: v.significant,
      perSeason: Object.fromEntries(Object.entries(v.perSeason).map(([y, x]) => [y, r1(x)])),
    }])),
    rawSearchBestW: bestW,
    walkForward: Object.fromEntries(Object.entries(walkFwd).map(([k, v]) => [k, {
      mean: v.mean, t: v.t, lo: v.lo, hi: v.hi, wins: v.wins, years: v.years,
      significant: v.significant, chosen: v.chosen,
    }])),
    playerBootstrap: playerBoot,
    verdict,
    caveats: [
      "ORAKEL-ARMURINN ER THAK OG MERKTUR SEM SLIKT. Lekahlidid i `opp-lab` er " +
      "blint a leka a lidsstigi (README 4m); her er engin lidsbreyta, en " +
      "orakelid er byggt VILJANDI svo haegt se ad greina merki fra eftirsja.",
      "`ecrproj` og `adpproj` rada EINS OG heimildin innan stodu — rank-kurfan " +
      "getur adeins gefid kvarda MILLI stodna. Null thar svarar 'ber rodunin " +
      "virdis-upplysingu?', ekki 'er hun gott bord?'.",
      "Sigrar (h2h) eru EKKI maeldir her. README 5n/Q2 maelir " +
      "rho(sigrar, stig) = 0,961-0,989 gegn sjalfsareidanleika 0,935-0,968 og " +
      "bokar ad stigin voru fullnaegjandi stadgengill; protokollid sem 4d/4m " +
      "fylgdu er ad keyra sigra-netid ADEINS a armi sem naer barnum.",
      REF === "sleeper"
        ? "FIMM TIMABIL. Sama thak sem README 5g skjalar: spar fra fyrir 2021 eru " +
          "ekki til omengadar. Keyrdu --ref=fftoday fyrir 11-ara utgafu af sömu spurningu."
        : "ELLEFU TIMABIL, en vidmidid er FFToday sem er MAELT LAKARA en Sleeper " +
          "(5k: r 0,628 a moti 0,696). Talan svarar 'er haegt ad baeta LAKARI grunn', " +
          "sem er onnur spurning en 'er haegt ad baeta thann sem appid notar'.",
    ],
  };
  await writeFile(path.join(OUT, "measure", OUT_FILE), JSON.stringify(out));
  console.log(`\n-> data/measure/${OUT_FILE}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
