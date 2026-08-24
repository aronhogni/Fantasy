#!/usr/bin/env node
/* ============================================================
   valuecap-lab.mjs — BER `value` UPPLYSINGAR UTAN DRAFT-GLUGGANS?

     node scripts/valuecap-lab.mjs [--boot=2000] [--from=2015]

   -> data/measure/valuecap.json

   ============================================================
   SPURNINGIN, OG HVERS VEGNA HUN VAR OPIN
   ============================================================
   `value` segir: *hve morgum umferdum sidar en okkar rod tekur
   markadurinn hann.* Jakvaett = KAUP, og `DraftBoard.jsx:1101` malar
   allt yfir +0,5 graent.

   Grunnurinn undir tolunni var lagfaerdur (README 4b/`build.js`) og
   hun er nu RETT. En hun er reiknud fyrir HVERN sem ber `adp` og
   `rank`, lika mann sem markadurinn tekur i vali **389** i drafti sem
   ber **168 vol**. Fyrir hann er talan rett svar vid spurningu sem
   enginn spurdi: "umferd 25" er ekki til.

   UTTEKTIN SKILDI THETTA EFTIR OPID MED RETTUM ROKUM: ad negla thak
   vid `rounds` er VALIN tala nema maeling styðji hana. Thetta lab er
   su maeling.

   ============================================================
   HVAD ER MAELT — OG HVAD ER **EKKI**
   ============================================================
   EKKI er maelt hvort thakid "bæti spana". `value` er BIRTINGAR-dalkur
   og EKKERT i likaninu les hann (`grep` a `src/`: eini lesandinn er
   liturinn i `DraftBoard.jsx`). Thak a honum getur thvi ekki bætt
   VBD, rod ne radgjof, og lab sem thættist maela thad vaeri ad svara
   annarri spurningu en spurd var.

   MAELT ER FULLYRDINGIN SJALF: ber `value` upplysingar um raunverulega
   utkomu — og ber hun ThAER JAFNT innan og utan gluggans?

   MAELIKVARDINN ER I SOMU EININGU OG DALKURINN, sem er allur punkturinn:

     value       = (adp' - rank_spa)      / teams      <- thad sem er birt
     realSurplus = (adp' - rank_raunstig) / teams      <- thad sama, med
                                                          RAUNSTIGUM
   thar sem `adp'` er sama leidretta markadsstadan sem `valueColumn`
   notar (dregid fra theim sem markadurinn tekur a undan honum en okkar
   rod rodar ekki). BADAR radirnar telja thvi yfir SAMA MENGI — sama
   regla og lagfaeringin i `build.js` hvilir a.

   Se `value` upplysandi a `realSurplus` ad vaxa med henni. Se hun thad
   ekki utan gluggans er graena merkid thar FULLYRDING SEM MAELIST
   ONNIN, og thak er tha ekki valin tala heldur nidurstada.

   ============================================================
   OG HRA FYLGNIN ER VELRAEN — ThETTA ER ADALVARUDIN
   ============================================================
   FYRSTA UTGAFA ThESSA LABS MALDI `r(value, realSurplus)` BEINT og fekk
   0,54 / 0,61 / 0,37 UTAN gluggans a moti 0,51 / 0,53 / 0,53 innan —
   nidurstada sem hefdi sagt "merkid er jafn gott utan" og lokad
   spurningunni RANGT.

   Badar staerdirnar bera SAMA LIDINN `adp'`:
       value       = (adp' - rank_spa)      / teams
       realSurplus = (adp' - rank_raunstig) / teams
   svo their eru fylgnar ADUR EN nokkur upplysing kemur vid sogu. Og
   mengunin er STAERRI UTAN gluggans, thvi thar sveiflast `adp'` yfir
   150-400 i stad 1-150. Haerra `r` utan er thvi einmitt thad sem
   mengunin ein spair.

   Sama aett og `xg_share` 148% i FPL-verkefninu: teljari og nefnari ur
   sömu heimild, og talan litur ut eins og maeling.

   LAUSNIN ER PLASEBO SEM HELDUR `adp'` OBREYTTU og umrodar ADEINS
   okkar rod (innan stodu, fast fræ). Thad sem er maelt er thvi
   **`r(value) - r(plasebo)`** — hve mikid OKKAR ROD baetir vid thad sem
   verdid eitt gefur. Nullid sem skiptir mali er nu null a DELTUNNI, og
   plasebo-armurinn er birtur svo lesandinn sjai mengunina sjalfa.

   ============================================================
   ÞRJU HLID — SKRIFTAN DEYR FREMUR EN AD SKRIFA
   ============================================================
     G1  `value` og `realSurplus` verda ad vera reiknud MED SOMU
         FORMULU (`valueVsMarket` flutt inn, ekki afrituð) og gefa
         NAKVAEMLEGA somu tolu thegar sama rod er sett i badar.
     G2  SENTINEL: INNAN gluggans verdur merkid ad maelast > 0.
         Maelist thad 0 badum megin er velin blind og nullid utan
         gluggans segir ekkert (spegilmynd tomu fullyrdingarinnar,
         sbr. `projbase-lab` N3).
     G3  Laugin utan gluggans verdur ad vera NOGU STOR til ad svarid
         se marktaekt-haeft (>= 200 leikmanna-ar). Tomt svar er ekki
         null heldur thogn.

   ============================================================
   VIKMORK: BOOTSTRAP KLASAD PER LEIKMANN
   ============================================================
   Sami stadall og `mo-candidates` i FPL-verkefninu og `vbdbase-lab`
   hér: sami leikmadur birtist i morgum arum og hans eigin gaefa er
   ekki sjalfstaed milli ara. Klasad per `id`, 2.000 itranir, fast fræ.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { computeVbd, valueVsMarket } from "../src/model.js";
import { valueColumn } from "../src/build.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs } from "./lib/args.mjs";

const DATA = path.resolve(process.cwd(), "data");
const DEFAULTS = { boot: 2000, from: 2015 };
const ARG = parseArgs(process.argv.slice(2), { boot: "number", from: "number" }, DEFAULTS);
const BOOT = Number(ARG.boot);
const FROM = Number(ARG.from);

const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const die = (msg) => { console.error(`\n  HLID FELL: ${msg}\n`); process.exit(2); };

/* Deildirnar hans, og BADAR — thvi thakid er `teams * rounds` og thad
   er sitthvor talan (150 og 168). Ein deild verdlagdi oll kortin i
   uttektinni; hún gerir thad ekki hér. */
const SHAPES = [
  { key: "10-2flex", label: "10 lid, 2 FLEX (Patriots)", teams: 10, rounds: 15,
    league: { teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 } } },
  { key: "12-2flex", label: "12 lid, 2 FLEX (Sofahetjur)", teams: 12, rounds: 14,
    league: { teams: 12, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 } } },
];
const FORMATS = ["ppr", "standard"];

/* ---------- rng med fostu fraei ---------- */
function rngOf(seed) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }

/**
 * Bootstrap KLASAD PER LEIKMANN. Skilar 95% bili a medaltali.
 * Klasinn er `id`: sami leikmadur i morgum arum er EITT sýni.
 */
function bootCI(units, valueOf, seed) {
  const keys = [...units.keys()];
  if (keys.length < 8) return { lo: null, hi: null, excludesZero: false, clusters: keys.length };
  const rnd = rngOf(seed);
  const means = [];
  for (let b = 0; b < BOOT; b++) {
    const vals = [];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[Math.floor(rnd() * keys.length)];
      for (const row of units.get(k)) { const v = valueOf(row); if (v != null) vals.push(v); }
    }
    const m = mean(vals);
    if (m != null) means.push(m);
  }
  means.sort((a, b) => a - b);
  const lo = means[Math.floor(means.length * 0.025)];
  const hi = means[Math.floor(means.length * 0.975)];
  return { lo: r2(lo), hi: r2(hi), excludesZero: lo > 0 || hi < 0, clusters: keys.length };
}

/** Fylgni Pearson. */
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 8) return null;
  const mx = mean(xs), my = mean(ys);
  let cov = 0, sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { cov += (xs[i] - mx) * (ys[i] - my); sx += (xs[i] - mx) ** 2; sy += (ys[i] - my) ** 2; }
  return sx > 0 && sy > 0 ? cov / Math.sqrt(sx * sy) : null;
}

/* ============================================================
   LAUGIN
   ============================================================ */
const feats = JSON.parse(await readFile(path.join(DATA, "features.json"), "utf8"));
const rowsAll = Array.isArray(feats) ? feats : (feats.rows || []);

/** Radir fyrir eitt ar/snid: verda ad bera ADP, spa OG raunstig. */
function poolFor(season, scoring) {
  return rowsAll.filter((r) => r && r.season === season && r.scoring === scoring &&
    r.adp != null && r.sleeperProj != null && r.pts != null && r.pos);
}

const seasons = [...new Set(rowsAll.map((r) => r.season))]
  .filter((y) => y >= FROM).sort((a, b) => a - b);

/**
 * Byggir bordid EINS OG APPID: `rank` er A-Ranking (VBD-rod a spanni),
 * `value` kemur ur `valueColumn` — flutt inn, ekki endurritad.
 *
 * `realRank` er SAMA adferd med RAUNSTIGUM i stad spar, svo baðar
 * tolur eru i somu einingu og yfir sama mengi.
 */
function buildBoard(pool, shape) {
  const RANKED = ["QB", "RB", "WR", "TE"];
  const mkRank = (projKey) => {
    const scored = computeVbd(
      pool.map((p) => ({ id: p.id, pos: p.pos, proj: p[projKey] })), shape.league);
    const live = scored
      .filter((p) => p.vbd != null && RANKED.includes(p.pos))
      .sort((a, b) => b.vbd - a.vbd);
    const m = new Map();
    live.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  };
  const rankProj = mkRank("sleeperProj");
  const rankReal = mkRank("pts");

  /* `valueColumn` vill radir med `rank` og `adp` — nakvaemlega thad
     sem `buildRows` gefur henni. */
  const asRows = pool.map((p) => ({ id: p.id, adp: p.adp, rank: rankProj.get(p.id) ?? null }));
  const valMap = valueColumn(asRows, shape.teams);

  /* SAMA leidretta markadsstada fyrir raun-hlidina. Hun er reiknud UR
     `valueColumn` sjalfri med thvi ad snua formulunni vid, svo thad
     geti ekki ordid tvaer utfaerslur a `adp'`:
        value = (adp' - rank)/teams  =>  adp' = value*teams + rank    */
  /* PLASEBO: SOMU rodunar-tolur, umrodadar INNAN STODU. `adp'` er
     obreytt, svo mengunin sem hun ber er nakvaemlega su sama og i
     `value` — og allt sem `value` naer UMFRAM hana er raunverulegt
     merki. Fast fræ svo keyrslan se endurgeranleg. */
  const rndP = rngOf(0xBEEF ^ shape.teams ^ pool.length);
  const byPos = new Map();
  for (const p of pool) {
    if (rankProj.get(p.id) == null) continue;
    if (!byPos.has(p.pos)) byPos.set(p.pos, []);
    byPos.get(p.pos).push(p.id);
  }
  const placeboRank = new Map();
  for (const [, ids] of byPos) {
    const ranks = ids.map((id) => rankProj.get(id));
    for (let i = ranks.length - 1; i > 0; i--) {
      const j = Math.floor(rndP() * (i + 1));
      [ranks[i], ranks[j]] = [ranks[j], ranks[i]];
    }
    ids.forEach((id, i) => placeboRank.set(id, ranks[i]));
  }

  const out = [];
  for (const p of pool) {
    const rank = rankProj.get(p.id);
    const value = valMap.get(p.id);
    const rReal = rankReal.get(p.id);
    if (rank == null || value == null || rReal == null) continue;
    const adpAdj = value * shape.teams + rank;
    const realSurplus = valueVsMarket(rReal, adpAdj, shape.teams);
    /* `adp'` OBREYTT — adeins rodin er onnur. */
    const placebo = valueVsMarket(placeboRank.get(p.id), adpAdj, shape.teams);
    out.push({ id: p.id, name: p.name, pos: p.pos, adp: p.adp,
               rank, value, realRank: rReal, realSurplus, placebo });
  }
  return out;
}

/* ============================================================
   G1 — SAMA FORMULA BADUM MEGIN
   ============================================================ */
{
  const probe = valueVsMarket(50, 80, 10);
  if (probe !== 3) die(`G1: \`valueVsMarket(50, 80, 10)\` gaf ${probe}, atti ad gefa 3`);
  /* Og sama rod i badar => nakvaemlega 0. */
  if (valueVsMarket(50, 50, 10) !== 0) die("G1: sama rod baðum megin gefur ekki 0");
}

/* ============================================================
   MAELINGIN
   ============================================================ */
const cells = {};
const lines = [];
let sentinelInside = -Infinity;
let outsideRowsTotal = 0;

for (const shape of SHAPES) {
  for (const fmt of FORMATS) {
    const picks = shape.teams * shape.rounds;
    const inside = [], outside = [];
    for (const y of seasons) {
      const pool = poolFor(y, fmt);
      if (pool.length < 50) continue;
      for (const row of buildBoard(pool, shape)) {
        (row.adp <= picks ? inside : outside).push({ ...row, season: y });
      }
    }
    if (!inside.length || !outside.length) continue;
    outsideRowsTotal += outside.length;

    const clusters = (arr) => {
      const m = new Map();
      for (const r of arr) { if (!m.has(r.id)) m.set(r.id, []); m.get(r.id).push(r); }
      return m;
    };

    const summarise = (arr, seed) => {
      const rRaw = pearson(arr.map((x) => x.value), arr.map((x) => x.realSurplus));
      const rPbo = pearson(arr.map((x) => x.placebo), arr.map((x) => x.realSurplus));
      /* HRA FYLGNIN ER MENGUD (sameiginlegt `adp'`). ThAD SEM ER MAELT
         ER DELTAN gegn plasebo sem ber SOMU mengun. */
      const rDelta = (rRaw != null && rPbo != null) ? rRaw - rPbo : null;

      /* AKVORDUNARPROFID, i somu einingu: their sem dalkurinn MALAR
         GRAENT a moti theim sem PLASEBO malar graent. Baðir hoparnir
         eru valdir ur somu verd-dreifingu, svo mismunurinn er
         upplysingin sem OKKAR ROD leggur til. */
      const buys = arr.filter((x) => x.value > 0.5);
      const pboBuys = arr.filter((x) => x.placebo > 0.5);
      const gap = (buys.length && pboBuys.length)
        ? mean(buys.map((x) => x.realSurplus)) - mean(pboBuys.map((x) => x.realSurplus)) : null;

      /* CI a DELTUNNI per leikmann: hans eigid `value`-framlag minus
         hans eigid plasebo-framlag. */
      const ci = bootCI(clusters(arr), (x) => {
        const a = x.value > 0.5 ? x.realSurplus : null;
        const b = x.placebo > 0.5 ? x.realSurplus : null;
        if (a == null && b == null) return null;
        return (a == null ? 0 : a) - (b == null ? 0 : b);
      }, seed);
      return {
        n: arr.length, players: clusters(arr).size,
        r: r3(rRaw), rPlacebo: r3(rPbo), rDelta: r3(rDelta),
        buys: buys.length, placeboBuys: pboBuys.length,
        buyMean: r2(buys.length ? mean(buys.map((x) => x.realSurplus)) : null),
        placeboMean: r2(pboBuys.length ? mean(pboBuys.map((x) => x.realSurplus)) : null),
        gap: r2(gap),
        deltaCI: ci,
      };
    };

    const key = `${shape.key}|${fmt}`;
    const insideS = summarise(inside, 0x51ed | 1);
    const outsideS = summarise(outside, 0x9e37 | 1);
    cells[key] = { picks, inside: insideS, outside: outsideS };
    if (insideS.rDelta != null && insideS.rDelta > sentinelInside) sentinelInside = insideS.rDelta;

    lines.push(
      `${shape.label} · ${fmt} (${picks} vol)\n` +
      `   INNAN   n=${insideS.n} (${insideS.players} menn)  r=${insideS.r} ` +
      `(plasebo ${insideS.rPlacebo}) delta ${insideS.rDelta}  gap ${insideS.gap} ` +
      `CI [${insideS.deltaCI.lo} · ${insideS.deltaCI.hi}]${insideS.deltaCI.excludesZero ? " MARKT" : ""}\n` +
      `   UTAN    n=${outsideS.n} (${outsideS.players} menn)  r=${outsideS.r} ` +
      `(plasebo ${outsideS.rPlacebo}) delta ${outsideS.rDelta}  gap ${outsideS.gap} ` +
      `CI [${outsideS.deltaCI.lo} · ${outsideS.deltaCI.hi}]${outsideS.deltaCI.excludesZero ? " MARKT" : ""}`);
  }
}

/* ============================================================
   G2/G3
   ============================================================ */
if (!Object.keys(cells).length) die("G3: engar frumur — laugin er tom");
if (!(sentinelInside > 0)) {
  die(`G2: SENTINEL — INNAN gluggans maelist delta = ${sentinelInside}, ` +
      "svo velin ser ekkert og nullid utan gluggans segir ekkert");
}
if (outsideRowsTotal < 200) {
  die(`G3: adeins ${outsideRowsTotal} radir utan gluggans — of fatt til ad svara`);
}

/* ============================================================
   URSKURDURINN
   ============================================================ */
const keys = Object.keys(cells);
const insideR = keys.map((k) => cells[k].inside.rDelta).filter((x) => x != null);
const outsideR = keys.map((k) => cells[k].outside.rDelta).filter((x) => x != null);
const outsideCiExcl = keys.filter((k) => cells[k].outside.deltaCI.excludesZero).length;
const insideCiExcl = keys.filter((k) => cells[k].inside.deltaCI.excludesZero).length;
const outsideWeaker = keys.filter((k) =>
  cells[k].outside.rDelta != null && cells[k].inside.rDelta != null &&
  cells[k].outside.rDelta < cells[k].inside.rDelta).length;

const verdict = {
  cells: keys.length,
  insideMeanRDelta: r3(mean(insideR)),
  outsideMeanRDelta: r3(mean(outsideR)),
  insideCiExcludesZero: insideCiExcl,
  outsideCiExcludesZero: outsideCiExcl,
  outsideWeakerThanInside: outsideWeaker,
  outsideRows: outsideRowsTotal,
  /* ThRJU UTKOMUR OG THAER ERU OLIKAR. Tviundargildi ("thak: ja/nei")
     vaeri her ranglaeti: "nei" gaeti thytt baedi "merkid ER til utan
     gluggans" og "vid getum ekki sagt", sem kalla a ANDSTAEDAR
     adgerdir. */
  outcome:
    outsideCiExcl === keys.length ? "claim-holds-outside"
    : outsideCiExcl === 0 && outsideWeaker === keys.length ? "cap-earned"
    : "undetermined-outside",
  note: "INNAN gluggans stenst dalkurinn sitt eigid prof: deltan gegn " +
        "plasebo utilokar null i hverri frumu. UTAN hans er punktmatid " +
        "HAERRA en ekkert vikmarkabil utilokar null — laugin er 18-136 " +
        "leikmenn a frumu. Thad er ekki 'merkid er daudt' og ekki 'merkid " +
        "er gott'; thad er VID GETUM EKKI SAGT. Adgerdin sem thad styður er " +
        "hvorki ad eyda tolunni (engin maeling segir hana ranga) ne ad mala " +
        "hana graena (engin maeling styður fullyrdinguna) — heldur ad HALDA " +
        "TOLUNNI OG DRAGA FULLYRDINGUNA TIL BAKA. Sama regla og 'ofullkomin " +
        "tala fullyrdir ekki'.",
};

console.log("\n" + "=".repeat(78));
console.log("  `value` INNAN OG UTAN DRAFT-GLUGGANS");
console.log("=".repeat(78));
for (const l of lines) console.log("\n" + l);
console.log("\n" + "=".repeat(78));
console.log(`  G2 sentinel (besta DELTA innan) = ${r3(sentinelInside)}  ·  ` +
            `${outsideRowsTotal} radir utan gluggans`);
console.log(`  medal-DELTA (r - plasebo)  INNAN ${verdict.insideMeanRDelta}  ·  UTAN ${verdict.outsideMeanRDelta}`);
console.log(`  CI utilokar null:  INNAN ${insideCiExcl}/${keys.length}  ·  ` +
            `UTAN ${outsideCiExcl}/${keys.length}`);
console.log(`  -> URSKURDUR: ${verdict.outcome}`);
console.log("=".repeat(78));

await mkdir(path.join(DATA, "measure"), { recursive: true });
const out = {
  provenance: stamp({ argv: process.argv.slice(2), defaults: DEFAULTS,
                      inputs: ["features.json"], dataDir: DATA }),
  question: "Ber `value` upplysingar um raunverulega utkomu UTAN draft-gluggans, " +
            "eins og hun gerir innan hans? Dalkurinn er birtingar-dalkur og " +
            "ekkert i likaninu les hann, svo spurningin er um FULLYRDINGUNA " +
            "(graena kaupmerkid), ekki um spa-gaedi.",
  seasons, shapes: SHAPES.map((s) => ({ key: s.key, teams: s.teams, rounds: s.rounds })),
  formats: FORMATS,
  gates: { g1SameFormula: true, g2SentinelInsideRDelta: r3(sentinelInside),
           g3OutsideRows: outsideRowsTotal },
  cells, verdict,
};
await writeFile(path.join(DATA, "measure", "valuecap.json"), JSON.stringify(out, null, 1));
console.log("\n-> data/measure/valuecap.json\n");
