/* ============================================================
   MODEL-PRÓF — hver einasta tala sem appið birtir á sér próf hér
   1. sellTenths (söluverð á spjöldum, banki)
   2. computeTransferCost (X skipti · Y frí · −4 stig í tímalínu)
   3. expPointsFor (≈stig á spjöldum, skiptaávinningur, chip-gildi)
   4. lookupPos/POS_MEAN_PTS (CS% og stiga-margfaldarar)
   5. makeFixDifficulty (FFDR-tölur og einrænni)
   6. tierOf-KVÖRÐUN: sextílar endurreiknaðir úr raungögnum appsins
   ============================================================ */
import { readFileSync } from "node:fs";
import { sellTenths, computeTransferCost, expPointsFor, lookupPos, priceMovePrediction,
  POS_MEAN_PTS, MEASURED_POS, tierOf, TIER_CUTS, TIER_BG,
  MEASURED, MEASURED_LEGACY_D, SCALE_FIX, toMeasuredScale, lookupMeasured,
  TIER_COUNT, TIER_NAME, TIER_FG, TIER_NEUTRAL,
  makeFixDifficulty, cleanSheetProb, lambdaFromStrength,
  rankScore, RANK_W, greenRuns,
  gwSpans, intlBreaks, euroWeeks, euroTeams, BREAK_MIN_DAYS, compLabel, COMP_EN } from "../src/model.js";
import { marketDiff } from "../src/market.js";
import { UNMEASURED_UI } from "../src/recommend.js";
import { ELO_STALE_BAD, ELO_STALE_WARN, RETURN_AVAIL, UNKNOWN_CHANCE, availFromStatus, availForKickoff, parseEntryId,
         eloStale, parseReturn, rarelyStarted, priceFloors } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const eq = (a, b, n) => ok(a === b, `${n} (${JSON.stringify(a)}${a === b ? "" : " ≠ " + JSON.stringify(b)})`);

console.log("\n=== 1. SÖLUVERÐ (50%-hagnaðarreglan) ===");
eq(sellTenths(70, 75), 72, "kaup 7,0 → verð 7,5 selst á 7,2 (niðurjafnað)");
eq(sellTenths(70, 76), 73, "kaup 7,0 → verð 7,6 selst á 7,3");
eq(sellTenths(70, 70), 70, "óbreytt verð = fullt verð");
eq(sellTenths(70, 65), 65, "tap = fullt núverandi verð (engin vörn)");
eq(sellTenths(null, 50), 50, "ekkert kaupverð = núverandi verð");
eq(sellTenths(70, null), 0, "ekkert núverandi verð = 0");

console.log("\n=== 2. FRÍ SKIPTI OG REFSINGAR (tölurnar í tímalínunni) ===");
const noChip = () => null;
/* ============================================================
   NÍU FULLYRÐINGAR HÉR VORU UPPFÆRÐAR 20.8.2026 — OG ÞÆR VORU RANGAR
   ============================================================
   GW1 var aðeins ótakmörkuð ÞEGAR `preSeason` var satt. Með
   `preSeason: false` fór GW1 í venjulega greinina og LAGÐI ÞVÍ FRÍTT
   SKIPTI Í BANKANN, svo GW2 hafði **2 frí**. Sama skrá fullyrti tveimur
   blokkum neðar (`preSeason: true`) að *„GW2: allir byrja tímabilið með 1
   frítt"* — TVÖ ÓSAMRÝMANLEG SVÖR við sömu spurningu, hvort í sínu
   `preSeason`-ástandi, bæði græn.
   FPL-reglan er einræð: enginn á 2 frí skipti í GW2. Gamla talan var því
   ekki „önnur venja" heldur villa, og prófið verndaði hana.
   GW1 er nú UPPHAFSLIÐIÐ óháð klukkunni (sjá `computeTransferCost` og
   kafla 2b), svo söfnunin byrjar í GW2 með 1 og talan er sú sama fyrir
   og eftir frest.                                                      */
// söfnun upp í 5 — byrjar i GW2 med 1, +1 per onotada umferd
let tc = computeTransferCost({ plan: [], chipAt: noChip, maxGw: 8, preSeason: false });
eq(tc[1].ftAvailable, 1, "GW1: byrjar með 1 frítt");
eq(tc[2].ftAvailable, 1, "GW2 hefur 1 — GW1 leggur ALDREI frítt skipti í bankann");
eq(tc[6].ftAvailable, 5, "ónotuð skipti safnast upp í 5");
eq(tc[8].ftAvailable, 5, "þak helst á 5");
// söfnun: GW2 gefur 1, +1 eftir hverja ónotaða umferð -> GW3 hefur 2 frí
tc = computeTransferCost({ plan: [{gw:3},{gw:3},{gw:3},{gw:3}], chipAt: noChip, maxGw: 5, preSeason: false });
eq(tc[3].ftAvailable, 2, "GW3: 2 frí söfnuð (GW2 gaf 1 + ein ónotuð umferð)");
eq(tc[3].hits, 2, "4 skipti − 2 frí = 2 yfir");
eq(tc[3].points, -8, "2 yfir = −8 stig");
eq(tc[4].ftAvailable, 1, "eftir að öll frí kláruðust: 1 í næstu");
// WILDCARD HELDUR söfnuðum skiptum (FPL-regla frá 2024/25 — var brotin áður:
// eldri kóðinn endurstillti í 1 eftir chip-umferð)
const wcAt = g => (g === 4 ? "wildcard" : null);
tc = computeTransferCost({ plan: [{gw:4},{gw:4},{gw:4},{gw:4},{gw:4}], chipAt: wcAt, maxGw: 6, preSeason: false });
eq(tc[4].hits, 0, "wildcard: engin refsing þrátt fyrir 5 skipti");
eq(tc[4].ftAvailable, 3, "wildcard: söfnuðu skiptin (3) HALDAST");
eq(tc[5].ftAvailable, 4, "eftir wildcard: +1 bætist við söfnuð (3→4), EKKI endurstillt í 1");
// GW1 fyrir tímabil: ótakmörkuð, svo allir byrja með 1 í GW2
tc = computeTransferCost({ plan: [{gw:1},{gw:1},{gw:1},{gw:1}], chipAt: noChip, maxGw: 3, preSeason: true });
eq(tc[1].hits, 0, "GW1 fyrir frest: ótakmörkuð og frí");
eq(tc[2].ftAvailable, 1, "GW2: allir byrja tímabilið með 1 frítt");

/* HVERS VEGNA ER ÓTAKMARKAÐ? — VÖRÐUR (31.7.2026)
   Villan sem notandinn sá: haus GW1 sagði „Bench Boost — ótakmörkuð skipti".
   Bench Boost gefur EKKI skipti; það var GW1-fresturinn sem gerði það. Raðan
   bar aðeins `chip`, svo birtingin eignaði chipinu verkun sem hann hefur ekki.
   Prófin hér að ofan sáu þetta ekki því þau notuðu ÖLL `noChip` í forleik —
   sambland sem er einmitt raunstaðan í appinu í dag.                        */
const bbAt = g => (g === 1 ? "bboost" : null);
tc = computeTransferCost({ plan: [{gw:1},{gw:1}], chipAt: bbAt, maxGw: 3, preSeason: true });
eq(tc[1].unlimited, true, "GW1 forleikur + BB: enn ótakmörkuð (fresturinn)");
eq(tc[1].unlimitedBy, "preseason", "BB MÁ ALDREI vera orsök ótakmarkaðra skipta");
const tcAt = g => (g === 1 ? "3xc" : null);
tc = computeTransferCost({ plan: [{gw:1}], chipAt: tcAt, maxGw: 3, preSeason: true });
eq(tc[1].unlimitedBy, "preseason", "Triple Captain er ekki heldur orsök");
/* og hin hliðin: WC/FH GEFA skipti og eiga að eignast það */
tc = computeTransferCost({ plan: [{gw:4}], chipAt: wcAt, maxGw: 6, preSeason: false });
eq(tc[4].unlimitedBy, "chip", "wildcard ER orsökin utan forleiks");
const fhAt = g => (g === 5 ? "freehit" : null);
tc = computeTransferCost({ plan: [{gw:5}], chipAt: fhAt, maxGw: 6, preSeason: false });
eq(tc[5].unlimitedBy, "chip", "free hit ER orsökin utan forleiks");
/* BB utan forleiks: hvorki ótakmarkað né orsök — venjuleg refsing gildir.
   GW2 valið VILJANDI: þar eru aðeins 2 frí söfnuð, svo 3 skipti fara yfir.
   Í GW6 væru 5 frí komin og refsingin hefði ekki mælt neitt.               */
const bb2 = g => (g === 2 ? "bboost" : null);
tc = computeTransferCost({ plan: [{gw:2},{gw:2},{gw:2}], chipAt: bb2, maxGw: 6, preSeason: false });
eq(tc[2].unlimited, false, "BB utan forleiks gefur EKKI ótakmörkuð skipti");
eq(tc[2].unlimitedBy, undefined, "og engin orsök er skráð");
eq(tc[2].ftAvailable, 1, "GW2 hefur 1 frítt (allir byrja svo)");
eq(tc[2].hits, 2, "BB ver ekki gegn refsingu: 3 skipti − 1 frí = 2 yfir");
eq(tc[2].points, -8, "og það kostar −8");

/* ============================================================
   2b. GW1 ER UPPHAFSLIÐIÐ — TALAN MÁ EKKI BREYTAST VIÐ MIÐNÆTTI
   ============================================================
   VILLAN SEM VAR, MÆLD 20.8.2026 ÁÐUR EN NOKKRU VAR BREYTT: `isGw1Free`
   var `(g === 1 && preSeason)`. Sama áætlun, sama kall, aðeins `preSeason`
   víxlað, gaf

     preSeason=true   GW1  made 5 · hits 0 · points   0 · totalHits   0
     preSeason=false  GW1  made 5 · hits 4 · points −16 · totalHits −16

   Ekkert í áætluninni breyttist — aðeins klukkan. Kl. 17:30 21.8.2026
   hefði appið því byrjað að reikna −16 stig á notandann fyrir að byggja
   UPPHAFSLIÐIÐ sitt, og talan hefði lekið inn í `totalHits`, „net X pts"
   á skiptaáætluninni og í mælaborðið. Þetta er ættin sem CLAUDE.md kafli 8
   nefnir: *sama svið má ekki þýða sitthvað eftir því hvort tímabilið er
   byrjað* — og hún var HÉR, ekki í gögnum.

   PRÓFSTEINNINN ER JAFNAÐARMERKI MILLI ÁSTANDANNA, ekki ein tala: hann
   fellur hvort sem GW1 fer að kosta eftir frest EÐA hættir að vera frítt
   fyrir hann. Þess vegna er `pre` lykkja og ekki tvö sjálfstæð `eq`.     */
const GW1_PLAN = [{gw:1},{gw:1},{gw:1},{gw:1},{gw:1},{gw:2}];
for (const pre of [true, false]) {
  const t1 = computeTransferCost({ plan: GW1_PLAN, chipAt: noChip, maxGw: 5, preSeason: pre });
  eq(t1[1].unlimited, true, `preSeason=${pre}: GW1 er ALLTAF otakmorkud (upphafslidid)`);
  eq(t1[1].hits, 0, `preSeason=${pre}: fimm GW1-val kosta ENGAN hit`);
  eq(t1[1].points, 0, `preSeason=${pre}: og engin stig`);
  eq(Object.values(t1).reduce((a, x) => a + x.points, 0), 0,
     `preSeason=${pre}: totalHits er 0 — talan sem lak i "net X pts"`);
  eq(t1[2].ftAvailable, 1, `preSeason=${pre}: GW2 byrjar med 1 fritt`);
}
/* OG ORSOKIN ER RETT NEFND I BADUM ASTANDUM. Bædi eru „ótakmörkuð", en
   ÁSTÆÐAN er ekki sú sama og skjárinn segir sitthvað: fyrir frest getur
   hann enn breytt (ótakmörkuð frí skipti), eftir frest er GW1 liðin og
   engin GW1-skipti eru möguleg (upphafsliðið). „preseason" eftir frestinn
   væri röng regla á skjánum — sama gildran og „Bench Boost — ótakmörkuð
   skipti" var.                                                          */
eq(computeTransferCost({ plan: GW1_PLAN, chipAt: noChip, maxGw: 3, preSeason: true })[1].unlimitedBy,
   "preseason", "fyrir frest: orsokin er forleikurinn");
eq(computeTransferCost({ plan: GW1_PLAN, chipAt: noChip, maxGw: 3, preSeason: false })[1].unlimitedBy,
   "initial", "eftir frest: orsokin er UPPHAFSLIDID, ekki forleikur");

console.log("\n=== 3. VÆNT STIG (≈talan á spjöldunum) ===");
// POS_MEAN_PTS á að vera nákvæmlega meðaltal mældu töflunnar
for (const pos of [1, 2, 3, 4]) {
  const mean = MEASURED_POS[pos].reduce((a, x) => a + x.pts, 0) / MEASURED_POS[pos].length;
  ok(Math.abs(mean - POS_MEAN_PTS[pos]) < 0.001,
    `POS_MEAN_PTS[${pos}] = meðaltal töflunnar (${POS_MEAN_PTS[pos]})`);
}
const flatDiff = () => 2.7;   // hlutlaus leikur
const pl = { element_type: 4, status: "a", ep_next: "5.0", points_per_game: "4.0" };
const fx1 = [{ opp: 2, home: true, fdr: 3 }];
const e1 = expPointsFor({ p: pl, fxs: fx1, fixDifficulty: flatDiff, teamId: 1 });
ok(e1 > 0, `grunndæmi skilar jákvæðu (${e1.toFixed(2)})`);
eq(expPointsFor({ p: pl, fxs: [], fixDifficulty: flatDiff, teamId: 1 }), 0, "auð umferð = 0 stig");
// TVÖFÖLD umferð = summa beggja leikja
const e2 = expPointsFor({ p: pl, fxs: [...fx1, ...fx1], fixDifficulty: flatDiff, teamId: 1 });
ok(Math.abs(e2 - 2 * e1) < 1e-9, "tvöföld umferð = 2× einfaldur leikur");
// tiltækileiki skalar línulega
const p75 = { ...pl, status: "d", chance_of_playing_next_round: 75 };
ok(Math.abs(expPointsFor({ p: p75, fxs: fx1, fixDifficulty: flatDiff, teamId: 1 }) - 0.75 * e1) < 1e-9,
  "75% líkur á að spila = 75% af stigunum");
eq(expPointsFor({ p: { ...pl, status: "i", chance_of_playing_next_round: 0 }, fxs: fx1, fixDifficulty: flatDiff, teamId: 1 }),
  0, "meiddur (0%) = 0 stig");
// grunnur: ep_next þegar til, annars stig/leik
const noEp = { ...pl, ep_next: "" };
const eNoEp = expPointsFor({ p: noEp, fxs: fx1, fixDifficulty: flatDiff, teamId: 1 });
ok(Math.abs(eNoEp / e1 - 4.0 / 5.0) < 1e-9, "án ep_next: stig/leik verður grunnurinn");
// léttari leikur gefur fleiri stig en þyngri
const eEasy = expPointsFor({ p: pl, fxs: fx1, fixDifficulty: () => 2.0, teamId: 1 });
const eHard = expPointsFor({ p: pl, fxs: fx1, fixDifficulty: () => 3.8, teamId: 1 });
ok(eEasy > e1 && e1 > eHard, `léttari leikur > hlutlaus > þyngri (${eEasy.toFixed(1)} > ${e1.toFixed(1)} > ${eHard.toFixed(1)})`);

console.log("\n=== 4. MÆLDA TAFLAN (CS% og stig eftir þyngd) ===");
// endapunktar og brúun
eq(lookupPos(2, "cs", 1.81), 38.6, "DEF léttasti punktur: CS 38,6%");
eq(lookupPos(2, "cs", 3.58), 10.9, "DEF þyngsti punktur: CS 10,9%");
eq(lookupPos(2, "cs", 1.0), 38.6, "undir bili: klemmt við léttasta");
eq(lookupPos(2, "cs", 5.0), 10.9, "yfir bili: klemmt við þyngsta");
const mid = lookupPos(2, "cs", (2.21 + 2.50) / 2);
ok(Math.abs(mid - (30.9 + 26.2) / 2) < 0.01, "línuleg brúun mitt á milli punkta");
// pts fellur einrænt með þyngd í öllum stöðum
for (const pos of [1, 2, 3, 4]) {
  const T = MEASURED_POS[pos];
  ok(T.every((x, i) => i === 0 || x.pts <= T[i-1].pts), `pts fellur einrænt (staða ${pos})`);
  ok(T.every((x, i) => i === 0 || x.cs <= T[i-1].cs), `cs fellur einrænt (staða ${pos})`);
}

// samsetta MEASURED-taflan: cs fellur, mörk á sig hækka með þyngd
import("../src/model.js").then(() => {});
{
  const { MEASURED } = await import("../src/model.js");
  ok(MEASURED.every((x, i) => i === 0 || x.cs < MEASURED[i-1].cs), "MEASURED: CS% fellur með þyngd");
  ok(MEASURED.every((x, i) => i === 0 || x.ga > MEASURED[i-1].ga), "MEASURED: mörk á sig hækka með þyngd");
}

/* ---- 4b. VÖRÐUR: MEASURED-hnitin fylgja SCALE_FIX ----
   MEASURED var mæld á LEGACY-kvarðanum (miðja í 3). Hnitin eru endurmerkt
   með SCALE_FIX.def svo hún sé á sama kvarða sem MEASURED_POS. EF
   SCALE_FIX BREYTIST OG HNITIN FYLGJA EKKI les App.jsx:1016 birt mörk á
   sig á röngum stað — og það er engin sjálfstæð heimild um þá tölu sem
   annað próf gæti borið hana við. Þessi vörður er sú heimild.          */
console.log("\n=== 4b. VÖRÐUR: MEASURED-hnitin fylgja SCALE_FIX ===");
ok(MEASURED_LEGACY_D.length === MEASURED.length, "legacy-hnit fyrir hverja röð");
MEASURED.forEach((row, i) => {
  const want = +toMeasuredScale(MEASURED_LEGACY_D[i], true).toFixed(2);
  ok(Math.abs(row.d - want) < 0.005,
    `röð ${i}: d=${row.d} = SCALE_FIX(${MEASURED_LEGACY_D[i]})=${want}`);
});
/* Og lokaprófið á að taflan sé rétt kvörðuð: meðalleikur á að gefa
   mörk á sig nálægt deildarmeðaltalinu (~1,43 úr E0). */
const gaAtMean = lookupMeasured("ga", SCALE_FIX.def.center);
ok(Math.abs(gaAtMean - 1.43) < 0.15,
  `meðalleikur (d=${SCALE_FIX.def.center}) gefur ${gaAtMean.toFixed(2)} mörk á sig ~ 1,43 í raun`);

/* ---- 4c. HREINT BLAÐ SEM LÍKINDI (cleanSheetProb) ----
   Fallback-leiðin fyrir CS% (allar umferðir nema næsta). Einingapróf á
   eiginleikum; marktektin sjálf er mæld í tests/cs-logistic.mjs.      */
console.log("\n=== 4c. cleanSheetProb — fallback-líkindi fyrir hreint blað ===");
const csP = o => cleanSheetProb(o);
ok(csP({ ownXgc: 1.4, oppXg: 1.4 }) > 0 && csP({ ownXgc: 1.4, oppXg: 1.4 }) < 1,
  `meðalleikur gefur líkindi innan (0,1): ${(100 * csP({ ownXgc: 1.4, oppXg: 1.4 })).toFixed(1)}%`);
/* Meðalleikur á að liggja nálægt raunverulegri tíðni (27,2% á 15 tímabilum) */
const csMid = 100 * csP({ ownXgc: 1.4, oppXg: 1.45, home: false, fdr: 3 });
ok(Math.abs(csMid - 27.2) < 6, `meðalleikur ~raunveruleg tíðni 27,2% (${csMid.toFixed(1)}%)`);
/* EINRÆNNI: sterkari eigin vörn -> HÆRRI líkindi */
ok(csP({ ownXgc: 0.8, oppXg: 1.4 }) > csP({ ownXgc: 1.8, oppXg: 1.4 }),
  "sterkari eigin vörn gefur hærri CS-líkindi");
/* og sterkari sókn mótherja -> LÆGRI */
ok(csP({ ownXgc: 1.4, oppXg: 0.9 }) > csP({ ownXgc: 1.4, oppXg: 2.1 }),
  "sterkari sókn mótherja gefur lægri CS-líkindi");
/* heimavöllur hjálpar, og Elo-yfirburðir mótherja skaða */
ok(csP({ ownXgc: 1.4, oppXg: 1.4, home: true }) > csP({ ownXgc: 1.4, oppXg: 1.4, home: false }),
  "heimavöllur hækkar CS-líkindi");
ok(csP({ ownXgc: 1.4, oppXg: 1.4, eloDiff: -2 }) > csP({ ownXgc: 1.4, oppXg: 1.4, eloDiff: 2 }),
  "sterkari mótherji (Elo) lækkar CS-líkindi");
ok(csP({ ownXgc: 1.4, oppXg: 1.4, fdr: 2 }) > csP({ ownXgc: 1.4, oppXg: 1.4, fdr: 5 }),
  "léttara FDR hækkar CS-líkindi");
/* λ-formið á að vera MARGFÖLDUN, ekki summa */
ok(Math.abs(lambdaFromStrength(1.45, 1.45) - 1.45) < 1e-9,
  "λ(meðal, meðal) = deildarmeðaltalið sjálft (margföldunarform)");
ok(lambdaFromStrength(2.9, 1.45) > lambdaFromStrength(1.45, 1.45),
  "λ hækkar með verri eigin vörn");
ok(csP({ ownXgc: null, oppXg: 1.4 }) === null, "vantandi inntak skilar null, ekki NaN");

/* ---- 4d. RÖÐUNARSKOR (rankScore) ----
   Skorið sem TILLÖGUR raðast eftir. Mælt í tests/rank-model.mjs:
   topp-5 6,07 raunstig á móti 5,29 (gamla skorið) og 5,20 (FPL-eigið xP),
   í 5/5 tímabilum. Hér eru eiginleikarnir varðir.                      */
console.log("\n=== 4d. RÖÐUNARSKOR (rankScore) ===");
const rs = o => rankScore(o);
const rBase = { form: 4, minsPerGame: 85, price: 8, ffdr: 2.2 };
ok(Number.isFinite(rs(rBase)), `grunndæmi skilar tölu (${rs(rBase).toFixed(2)})`);
/* EINRÆNNI Í ÖLLUM FJÓRUM — formerkin eru öll túlkanleg og mega ekki snúast */
ok(rs({ ...rBase, form: 6 }) > rs({ ...rBase, form: 2 }), "meira form -> hærra skor");
ok(rs({ ...rBase, minsPerGame: 90 }) > rs({ ...rBase, minsPerGame: 30 }), "fleiri mínútur -> hærra skor");
ok(rs({ ...rBase, price: 12 }) > rs({ ...rBase, price: 5 }), "hærra verð -> hærra skor (markaðurinn veit)");
ok(rs({ ...rBase, ffdr: 1.5 }) > rs({ ...rBase, ffdr: 3.5 }), "LÉTTARI leikur -> hærra skor");
/* Vantandi gildi mega ekki gefa NaN — þau eiga varfærið sjálfgildi */
ok(Number.isFinite(rs({})), "tómt inntak skilar tölu, ekki NaN");
ok(Number.isFinite(rs({ form: NaN, price: null, ffdr: undefined })), "vitlaus inntök skila tölu");
/* Mínútur eru klemmdar — 200 mín er ógilt inntak og má ekki blása skorið upp */
ok(rs({ ...rBase, minsPerGame: 200 }) === rs({ ...rBase, minsPerGame: 90 }),
  "mínútur klemmdar við 90 (ógilt inntak blæs ekki skorið upp)");
/* VOGTÖLU-VÖRÐUR: formerki mega ekki breytast við endurfitt */
ok(RANK_W.form > 0 && RANK_W.minsPerGame > 0 && RANK_W.price > 0 && RANK_W.ffdr < 0,
  "vogtölu-formerki: form/mín/verð jákvæð, FFDR NEGATÍF");

console.log("\n=== 5. FFDR-EIGINLEIKAR ===");
const tm = { 1: { xg90: 2.0, xgc90: 0.8, sotFor: 6, sotAg: 3 },     // sterkt lið
             2: { xg90: 1.0, xgc90: 1.8, sotFor: 3, sotAg: 6 },     // veikt lið
             3: { xg90: 1.45, xgc90: 1.45, sotFor: 4.4, sotAg: 4.4 } }; // meðal
const tb = { 1: { short: "STE" }, 2: { short: "VEI" }, 3: { short: "MID" } };
const fd = makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds: null, eloByTeam: {} });
const dStrong = fd(1, { opp: 3, home: true, fdr: 3 }, 2);
const dWeak = fd(2, { opp: 3, home: true, fdr: 3 }, 2);
ok(dStrong < dWeak, `sterk vörn fær léttara FFDR en veik gegn sama mótherja (${dStrong} < ${dWeak})`);
const vsWeak = fd(3, { opp: 2, home: true, fdr: 2 }, 4);
const vsStrong = fd(3, { opp: 1, home: true, fdr: 5 }, 4);
ok(vsWeak < vsStrong, `léttari mótherji = lægra FFDR fyrir sókn (${vsWeak} < ${vsStrong})`);
const home4 = fd(3, { opp: 1, home: true, fdr: 4 }, 4);
const away4 = fd(3, { opp: 1, home: false, fdr: 4 }, 4);
ok(home4 < away4, `heimavöllur léttir fyrir sóknarhóp (${home4} < ${away4})`);
ok([dStrong, dWeak, vsWeak, vsStrong].every(d => d >= 1 && d <= 5), "öll gildi innan 1–5");
// markaðslínan gildir AÐEINS um réttan mótherja
const odds1 = { STE: { diff: 1.2, opp: "MID", kickoff: "2026-08-21T19:00:00Z" } };
const fdO = makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds: odds1, eloByTeam: {} });
const withMkt = fdO(1, { opp: 3, home: true, fdr: 3, kickoff: "2026-08-21T19:00:00Z" }, 2);
const wrongOpp = fdO(1, { opp: 2, home: true, fdr: 3, kickoff: "2026-08-21T19:00:00Z" }, 2);
ok(withMkt < dStrong, `markaðslína (létt) dregur FFDR niður þegar hún á við (${withMkt} < ${dStrong})`);
const noOdds = fd(1, { opp: 2, home: true, fdr: 3, kickoff: "2026-08-21T19:00:00Z" }, 2);
eq(wrongOpp, noOdds, "lína á RANGAN mótherja er hunsuð");
eq(fd(9, { opp: 3, home: true, fdr: 4 }, 2), 4, "óþekkt lið fellur á hrátt FDR");
/* xga-VARALEIÐIN: röð án `diff` en með `xga` á að gefa SÖMU þyngd.
   Þetta er ekki fræðilegt — sjá vörðinn í kafla 5b hér að neðan.      */
const oddsXga = { STE: { xga: 0.8, opp: "MID", kickoff: "2026-08-21T19:00:00Z" } };
const oddsDiff = { STE: { diff: marketDiff(0.8), opp: "MID", kickoff: "2026-08-21T19:00:00Z" } };
const mk = o => makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds: o, eloByTeam: {} })
  (1, { opp: 3, home: true, fdr: 3, kickoff: "2026-08-21T19:00:00Z" }, 2);
eq(mk(oddsXga), mk(oddsDiff), "röð með xga en án diff gefur sömu þyngd");
ok(mk(oddsXga) < dStrong, `xga-varaleiðin virkjar markaðsliðinn í raun (${mk(oddsXga)} < ${dStrong})`);

/* ---- 5b. VÖRÐUR: HVER RÖÐ Í odds.json VERÐUR AÐ VERA NÝTILEG ----
   AF HVERJU ÞESSI VÖRÐUR TIL: `diff` var bætt í fetch.mjs 2026-07-25
   kl. 20:29, en data/odds.json var skrifuð kl. 17:30 sama dag og odds
   eru aðeins sótt tvisvar per umferð. Skráin í notkun hafði því aldrei
   `diff`; bkValid var alltaf falskt og markaðsliðurinn — sterkasta
   einstaka inntak FFDR (r=0,394 á móti 0,245 fyrir hrátt FDR) — var
   dauður í appinu í heila viku ÁN ÞESS AÐ NEITT PRÓF SÆI ÞAÐ. Öll
   prófin voru græn því þau prófuðu formúluna, ekki hvort gögnin sem
   hún fær séu nýtileg.
   Röð sem líkanið getur ekki notað er VERRI en engin röð: hún telst
   með í "20 lið, úr pipeline" í hliðarstikunni og lítur út eins og
   virk heimild. Krafan er því: sé röð til, verður hún að vera nýtileg. */
console.log("\n=== 5b. VÖRÐUR: odds.json-raðir eru NÝTILEGAR ===");
const oddsRaw = J("odds.json").teams || {};
const oddsRows = Object.entries(oddsRaw);
console.log(`  ${oddsRows.length} raðir í odds.json (updated ${J("odds.json").updated})`);
if (!oddsRows.length) {
  ok(true, "odds.json tóm — utan sóknarglugga, ekkert að staðfesta");
} else {
  const noWeight = oddsRows.filter(([, v]) => v.diff == null && v.xga == null);
  const noXg = oddsRows.filter(([, v]) => v.xg == null);
  ok(noXg.length === 0,
    `hver röð hefur xg — SÓKNARHÓPURINN þarf eigin vænt mörk (vantaði: ${noXg.map(([k]) => k).join(", ") || "engin"})`);
  const noOpp = oddsRows.filter(([, v]) => !v.opp);
  const noKick = oddsRows.filter(([, v]) => !v.kickoff);
  ok(noWeight.length === 0,
    `hver röð hefur diff EÐA xga (vantaði: ${noWeight.map(([k]) => k).join(", ") || "engin"})`);
  ok(noOpp.length === 0,
    `hver röð hefur opp — annars er hún hunsuð sem "rangur mótherji" (vantaði: ${noOpp.map(([k]) => k).join(", ") || "engin"})`);
  ok(noKick.length === 0,
    `hver röð hefur kickoff (vantaði: ${noKick.map(([k]) => k).join(", ") || "engin"})`);
  // gagnkvæmni: ef A á línu gegn B, á B að eiga línu gegn A
  const oneSided = oddsRows.filter(([k, v]) => v.opp && oddsRaw[v.opp]?.opp !== k);
  ok(oneSided.length === 0,
    `línur eru gagnkvæmar (einhliða: ${oneSided.map(([k]) => k).join(", ") || "engar"})`);
}

console.log("\n=== 6. LITAKVÖRÐUN GEGN RAUNGÖGNUM APPSINS ===");
// Endurbyggja teamMetrics NÁKVÆMLEGA eins og App.jsx og endurreikna sextílana
const teams = J("teams.json").teams, players = J("players.json").players;
const fixtures = J("fixtures.json"), tform = J("team_form.json");
const elo = J("elo.json"), odds = J("odds.json").teams, promoted = J("promoted_baseline.json");
const agg = {};
players.forEach(p => {
  const a = agg[p.team] = agg[p.team] || { xg: 0, gkMins: 0, gkXgc: 0 };
  a.xg += parseFloat(p.expected_goals || 0);
  if (p.element_type === 1 && p.minutes > a.gkMins) { a.gkMins = p.minutes; a.gkXgc = parseFloat(p.expected_goals_conceded || 0); }
});
const tfById = {}; (tform.teams || []).forEach(x => { if (x.matches > 0) tfById[x.fpl_id] = x; });
const metrics = {};
teams.forEach(t => {
  const a = agg[t.id] || { xg: 0, gkMins: 0, gkXgc: 0 };
  const games = a.gkMins > 0 ? a.gkMins / 90 : 38;
  let xg90 = +(a.xg / 38).toFixed(2), xgc90 = a.gkMins > 400 ? +(a.gkXgc / games).toFixed(2) : 1.4;
  let sotFor = null, sotAg = null, prevGoals = null, prevConc = null;
  if (tfById[t.id]) { const x = tfById[t.id]; xg90 = x.goals_pg; xgc90 = x.conceded_pg;
    sotFor = x.sot_pg ?? null; sotAg = x.sot_against_pg ?? null;
    prevGoals = x.prev?.goals_pg ?? null; prevConc = x.prev?.conceded_pg ?? null; }
  if (xg90 < 0.2) {
    const pb = promoted[t.name.replace(/ (City|Town|United)$/, "")] || promoted[t.name];
    if (pb) { xg90 = +(pb.goals_pg * 0.75).toFixed(2); xgc90 = +(pb.goals_against_pg * 1.35).toFixed(2); }
    else { xg90 = 1.1; xgc90 = 1.6; }
  }
  metrics[t.id] = { xg90, xgc90, sotFor, sotAg, prevGoals, prevConc };
});
const byId = {}; teams.forEach(t => byId[t.id] = t);
const eloBy = {}; (elo.teams || []).forEach(t => eloBy[t.fpl_id] = t);
const fdApp = makeFixDifficulty({ teamMetrics: metrics, teamById: byId, odds, eloByTeam: eloBy });
const vals = [];
for (const f of fixtures) {
  if (!f.event) continue;
  for (const pos of [2, 4]) {
    vals.push(fdApp(f.team_h, { opp: f.team_a, home: true, fdr: f.team_h_difficulty, kickoff: f.kickoff_time }, pos));
    vals.push(fdApp(f.team_a, { opp: f.team_h, home: false, fdr: f.team_a_difficulty, kickoff: f.kickoff_time }, pos));
  }
}
vals.sort((a, b) => a - b);
const q = p => vals[Math.floor(p * vals.length)];
const sext = Array.from({ length: TIER_COUNT - 1 }, (_, i) => q((i + 1) / TIER_COUNT));
console.log(`  sextílar úr gögnum: ${sext.map(x => x.toFixed(2)).join(" / ")}`);
console.log(`  mörkin í model.js:  ${TIER_CUTS.join(" / ")}`);
sext.forEach((x, i) => ok(Math.abs(x - TIER_CUTS[i]) <= 0.12,
  `mark ${i + 1} innan ±0,12 af sextíl (${TIER_CUTS[i]} ↔ ${x.toFixed(2)})`));
// hvert þrep fær 12–22% leikja (fullkomið væri 16,7%)
const cnt = new Array(TIER_COUNT).fill(0);
vals.forEach(v => cnt[tierOf(v)]++);
const shares = cnt.map(c => c / vals.length);
console.log(`  dreifing: ${shares.map(x => (100 * x).toFixed(1) + "%").join(" / ")}`);
shares.forEach((sh, i) => ok(sh >= 0.12 && sh <= 0.22,
  `þrep ${i} (${TIER_NAME[i]}) fær 12–22% (${(100 * sh).toFixed(1)}%)`));
ok(TIER_BG.length === TIER_COUNT && new Set(TIER_BG).size === TIER_COUNT,
  `${TIER_COUNT} aðgreindir bakgrunnslitir`);
ok(TIER_FG.length === TIER_COUNT && TIER_NAME.length === TIER_COUNT,
  "forgrunnslitir og nöfn fylgja fjölda þrepa");
ok(TIER_CUTS.length === TIER_COUNT - 1, `${TIER_COUNT - 1} skil fyrir ${TIER_COUNT} þrep`);
/* MIÐÞREPIÐ Á AÐ VERA HLUTLAUST (grátt/hvítt): mettun þess á að vera
   MARKTÆKT lægri en grænu og rauðu þrepanna, annars er "hvorki gott né
   vont" ekki lesanlegt sem slíkt. Mælt í HSL-mettun úr hex.            */
const sat = hex => {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), l = (mx+mn)/2;
  return mx === mn ? 0 : (mx-mn)/(1 - Math.abs(2*l-1));
};
const satMid = sat(TIER_BG[TIER_NEUTRAL]), satEnds = Math.min(sat(TIER_BG[0]), sat(TIER_BG[TIER_COUNT-1]));
ok(satMid < satEnds * 0.5,
  `hlutlausa þrepið (${TIER_NAME[TIER_NEUTRAL]}) er ómettað: mettun ${satMid.toFixed(2)} < helmingur af endunum ${satEnds.toFixed(2)}`);
/* Og grænt/gult mega ekki vera nánast eins — það var kvortunin sem
   olli endurhonnuninni. Krafa: nagranna-threp vikja >=0,08 i mettun EDA
   >=25 i einhverjum RGB-thaetti.                                       */
const rgb = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
for (let i = 1; i < TIER_COUNT; i++) {
  const a = rgb(TIER_BG[i-1]), b = rgb(TIER_BG[i]);
  const maxCh = Math.max(...a.map((v,k) => Math.abs(v - b[k])));
  ok(maxCh >= 20 || Math.abs(sat(TIER_BG[i-1]) - sat(TIER_BG[i])) >= 0.08,
    `þrep ${i-1} og ${i} eru sjónrænt aðgreind (max RGB-munur ${maxCh})`);
}
ok(TIER_CUTS.every((x, i) => i === 0 || x > TIER_CUTS[i - 1]), "mörkin stranghækkandi");

console.log("\n=== 7. VERÐSPÁIN (nálgunin sjálf) ===");
eq(priceMovePrediction({ net: 200000, selectedByPct: "5.0", chg: 0 }), "up",
  "mikill innflutningur á 5%-manni: hækkun");
eq(priceMovePrediction({ net: 200000, selectedByPct: "5.0", chg: 1 }), null,
  "búinn að hækka í dag: engin spá (FPL hreyfir 1x/dag)");
eq(priceMovePrediction({ net: -200000, selectedByPct: "5.0", chg: 0 }), "down",
  "mikill útflutningur: lækkun");
eq(priceMovePrediction({ net: 30000, selectedByPct: "5.0", chg: 0 }), null,
  "undir þröskuldi: engin spá");
// þröskuldurinn SKALAST með eignarhaldi: sama nettó dugar litlum en ekki fjöldamanni
eq(priceMovePrediction({ net: 100000, selectedByPct: "2.0", chg: 0 }), "up",
  "100k dugar 2%-manni");
eq(priceMovePrediction({ net: 100000, selectedByPct: "45.0", chg: 0 }), null,
  "100k dugar EKKI 45%-fjöldamanni (þröskuldur skalast)");

console.log("\n=== 8. PWA-SKRÁRNAR ===");
{
  const pub = new URL("../public/", import.meta.url).pathname;
  const mf = JSON.parse(readFileSync(pub + "manifest.webmanifest", "utf8"));
  eq(mf.start_url, "/Fantasy/", "manifest start_url með base-slóð");
  eq(mf.scope, "/Fantasy/", "manifest scope réttur");
  ok(mf.icons.length >= 3 && mf.icons.some(i => i.purpose === "maskable"), "íkonar þ.m.t. maskable");
  for (const f of ["icon-192.png", "icon-512.png", "icon-180.png"]) {
    const b = readFileSync(pub + f);
    ok(b.length > 500 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, `${f} er alvöru PNG`);
  }
  const html = readFileSync(new URL("../index.html", import.meta.url).pathname, "utf8");
  ok(html.includes('rel="manifest"') && html.includes("icon-180.png"),
    "index.html vísar á manifest og apple-touch-icon (PNG, ekki SVG)");
}

/* ---------- 12. ENDURKOMU-DAGSETNING (villa sem skekkti AKVARDANIR) ----------
   `avail` var reiknad ur chance_of_playing_next_round og notad fyrir ALLAR
   umferdir, svo flaggadur madur fekk 0 vaent stig i GW2-5 thott hann vaeri
   kominn til baka — og transferNet(horizon=5) leggur thau fimm null saman.
   Raungogn: Garner (239) "Groin injury - Expected back 22 Aug", GW1-frestur
   21.8. Maelt: 10 af 55 flögguðum hafa lesanlega dagsetningu.            */
console.log("\n=== 12. ENDURKOMU-DAGSETNING ===");
const NOW = Date.UTC(2026, 6, 31);
const P_INJ = { status:"i", chance_of_playing_next_round:0, element_type:3,
                ep_next:"3.0", points_per_game:"3.0",
                news:"Groin injury - Expected back 22 Aug" };
const P_BAN = { status:"s", chance_of_playing_next_round:0, element_type:3,
                ep_next:"3.0", points_per_game:"3.0", news:"Suspended until 29 Aug" };
const P_NODATE = { status:"i", chance_of_playing_next_round:25, element_type:3,
                   ep_next:"3.0", points_per_game:"3.0", news:"Knock" };

ok(parseReturn(P_INJ.news, NOW)?.kind === "injury", "greinir 'Expected back' sem meidsli");
ok(parseReturn(P_BAN.news, NOW)?.kind === "ban", "greinir 'Suspended until' sem bann");
ok(parseReturn("Knock", NOW) === null, "engin dagsetning -> null (og tha gildir gamla hegdunin)");
ok(parseReturn("Expected back 32 Xyz", NOW) === null, "rusl-manudur -> null, engin agiskun");
/* ARID ER EKKI I TEXTANUM — "back 10 Jan" i juli er NAESTA jan, ekki lidid */
const jan = parseReturn("Expected back 10 Jan", NOW);
ok(jan && jan.ts > NOW, "'10 Jan' i juli er NAESTI januar, ekki lidinn (annars til leiks strax)");

ok(availForKickoff(P_INJ, "2026-08-21T17:30:00Z", NOW) === 0,
  "FYRIR endurkomu: 0 (obreytt)");
ok(availForKickoff(P_INJ, "2026-08-23T13:00:00Z", NOW) === RETURN_AVAIL.injury,
  `EFTIR endurkomu: ${RETURN_AVAIL.injury} (maelt 68,6% af fyrri minutum a 1.169 endurkomum)`);
ok(availForKickoff(P_INJ, "2026-09-12T14:00:00Z", NOW) === RETURN_AVAIL.injury,
  "og EKKERT ramp upp i 1,0 seinna — maelt 68,6/67,8/66,1% er FLATT");
ok(availForKickoff(P_BAN, "2026-08-25T14:00:00Z", NOW) === 0, "bann: 0 fyrir lokadagsetningu");
ok(availForKickoff(P_BAN, "2026-08-30T14:00:00Z", NOW) === 1,
  "bann: 1,0 eftir hana — bann er reglu-atridi, ekki likamlegt");
ok(RETURN_AVAIL.ban > RETURN_AVAIL.injury,
  "bann faer HAERRA gildi en meidsli (madurinn er i fullu formi)");
ok(availForKickoff(P_NODATE, "2026-09-01T14:00:00Z", NOW) === 0.25,
  "engin dagsetning -> FPL-talan obreytt (varaleidin er REGLAN, 45 af 55)");
ok(availForKickoff({ status:"a" }, "2026-09-01T14:00:00Z", NOW) === 1,
  "heilbrigdur madur er ohreyfdur");
/* ============================================================
   VANTANDI LIKUR ERU EKKI 0% (25.8.2026)

   `?? 0` gerdi flaggadan mann MED ochekktar likur ad 0 i OLLUM leikjum,
   svo vaent stig hans nulludust yfir allan gluggann — og thad faedir
   skiptanetid, Triple-Captain-timasetninguna og `captainScore`.
   `recommend.js` lagadi nakvaemlega thessa villu hja ser 7.8.2026 eftir
   notenda-tilkynningu; `availForKickoff` bar hana afram.

   BADAR ATTIR ERU FULLYRTAR, thvi onnur ein er tautologia: `null` faer
   0,5 EN `chance: 0` faer AFRAM 0. Sidari fullyrdingin er su sem fellur
   ef einhver "lagar" thetta med `|| 0.5` og hakkar tha meidda menn upp.
   ============================================================ */
const P_UNK = { status:"d", chance_of_playing_next_round:null, element_type:3,
                ep_next:"3.0", points_per_game:"3.0", news:"Knock" };
ok(availForKickoff(P_UNK, "2026-09-01T14:00:00Z", NOW) === UNKNOWN_CHANCE,
  `"d" (DOUBTFUL) an prosentu -> ${UNKNOWN_CHANCE} ("veit ekki"), EKKI 0`);
ok(availForKickoff({ status:"d", element_type:3 }, "2026-09-01T14:00:00Z", NOW) === UNKNOWN_CHANCE,
  "sviðið ALVEG fjarverandi telst lika \"veit ekki\" fyrir \"d\"");
ok(availForKickoff({ status:"i", chance_of_playing_next_round:0 }, "2026-09-01T14:00:00Z", NOW) === 0,
  "en RAUNVERULEG 0 stendur — hun er STADREYND, ekki thogn");
/* HIN ATTIN, OG HUN VAR HERT 25.8.2026 EFTIR AD `tests/best-team.mjs`
   FELL: "d" er FPL ad segja *vid vitum ekki*, en "i"/"s"/"u"/"n" eru
   FPL ad segja *hann spilar ekki*. Fyrsta utgafa thessarar lagfaeringar
   gaf 0,5 a ALLT sem er ekki "a" — svo BANNADUR madur an prosentu
   mældist 50% liklegur til ad spila. Ad flokka allt sem er ekki "a" i
   eitt hendir theirri upplysingu sem stadan sjalf ber (kafli 6).     */
for (const st of ["i", "s", "u", "n"]) {
  ok(availForKickoff({ status:st, element_type:3 }, "2026-09-01T14:00:00Z", NOW) === 0,
    `"${st}" an prosentu -> 0 (stadan segir "spilar ekki", hun er ekki thogn)`);
}
ok(availForKickoff({ status:"d", chance_of_playing_next_round:75 }, "2026-09-01T14:00:00Z", NOW) === 0.75,
  "raunveruleg tala gildir oháð stodu (nakvaemasta stadreyndin vinnur)");
for (const [st, ch, want] of [["a", null, 1], ["d", null, 0.5], ["i", null, 0],
                              ["s", null, 0], ["d", 50, 0.5], ["i", 0, 0]]) {
  ok(availFromStatus({ status: st, chance_of_playing_next_round: ch }) === want,
    `availFromStatus("${st}", ${ch}) = ${want} — EIN tafla, badir lesendur`);
}
/* ============================================================
   VANTANDI INNTAK -> ENGIN TALA, ALDREI VERSTA TALAN (25.8.2026)

   Vanti `fx.fdr` verdur `core` NaN. NaN er EKKI null, svo hann slapp
   gegnum hverja einustu `d != null`-vord — og hver lesandi fell tha a
   sinn SIDASTA reit, sem er thyngsta threpid. Leikur an gagna las thvi
   sem "erfidasti leikur deildarinnar" i stad thess ad vera slepptur.

   BADAR ATTIR: heilbrigt inntak verdur AFRAM ad gefa tolu (annars vaeri
   "lagfaeringin" ad slokkva a toflunni), og NaN-leidirnar sem lesa `d`
   verda ad vera sannreyndar ad falla a thyngsta threpid — thad er
   MEKANISMINN og an hans er fullyrdingin bara um `null`.
   ============================================================ */
{
  /* SOMU LIDSTOLUR OG KAFLI 5 — raunhaeft inntak, annars maeldi
     "heilbrigda" tilfellid sitt eigid galla inntak.                  */
  const teamById = tb;
  const fd = makeFixDifficulty({ teamMetrics: tm, teamById, odds: null, eloByTeam: {} });
  const good = fd(1, { fdr: 3, opp: 2, home: true }, 2);
  ok(Number.isFinite(good), `FORSENDA: heilbrigdur leikur gefur tolu (${good})`);
  ok(fd(1, { fdr: undefined, opp: 2, home: true }, 2) === null,
    "leikur AN `fdr` -> null (slepptur), EKKI thyngsta threp");
  ok(fd(1, { fdr: NaN, opp: 2, home: true }, 2) === null, "og NaN beint eins");
  const fdNoMetrics = makeFixDifficulty({ teamMetrics: {}, teamById, odds: null, eloByTeam: {} });
  ok(fdNoMetrics(1, { fdr: NaN, opp: 2, home: true }, 2) === null,
    "og an lidstalna gildir sama regla (snemm-utgangan skilar ekki NaN)");
  ok(fdNoMetrics(1, { fdr: 3, opp: 2, home: true }, 2) === 3,
    "en gild FDR-tala fer afram obreytt thar");
  /* MEKANISMINN sjalfur — an thessa vissum vid ekki i HVADA att skekkjan la. */
  ok(lookupPos(3, "pts", NaN) === lookupPos(3, "pts", 99),
    "SONNUN A SKADANUM: NaN las aður sem THYNGSTA threpid i lookupPos");
  ok(tierOf(NaN) === tierOf(99),
    "og `tierOf(NaN)` gaf dokkraudasta threpid — verstu toluna, ekki enga");
}

ok(UNMEASURED_UI.unknownChance === UNKNOWN_CHANCE,
  `EIN tala fyrir bada lesendur (model ${UNKNOWN_CHANCE} = recommend ${UNMEASURED_UI.unknownChance})`);

/* GW1 STRAEKKAR 21.-24. AGUST — thvi ER thetta per LEIK og ekki per umferd */
const fdFlat = () => 2.5;
const gw1 = [{ opp:2, home:true, kickoff:"2026-08-21T17:30:00Z" }];
const gw1late = [{ opp:2, home:true, kickoff:"2026-08-23T13:00:00Z" }];
const rEarly = expPointsFor({ p:P_INJ, fxs:gw1, fixDifficulty:fdFlat, teamId:1, nowTs:NOW });
const rLate = expPointsFor({ p:P_INJ, fxs:gw1late, fixDifficulty:fdFlat, teamId:1, nowTs:NOW });
ok(rEarly === 0, `leikur 21.8. (fyrir endurkomu) -> 0 vaent stig (${rEarly})`);
ok(rLate > 0, `leikur 23.8. i SOMU umferd -> ${rLate.toFixed(2)} stig, EKKI 0`);
ok(rLate < 3.0, "en LAEGRI en fullur grunnur — hann er nykominn til baka");
/* Tvofold umferd thar sem hann missir fyrri leikinn en spilar seinni */
const dbl = expPointsFor({ p:P_INJ, fxs:[...gw1, ...gw1late], fixDifficulty:fdFlat, teamId:1, nowTs:NOW });
ok(Math.abs(dbl - rLate) < 1e-9,
  "tvofold umferd: adeins leikurinn EFTIR endurkomu telur");
/* Vordur um AKVORDUNINA: summa yfir 5 umferdir ma ekki vera 0 */
const five = [1,2,3,4,5].map(i => [{ opp:2, home:true,
  kickoff:new Date(Date.UTC(2026, 7, 21 + i * 7)).toISOString() }]);
const tot = five.reduce((a, fx) =>
  a + expPointsFor({ p:P_INJ, fxs:fx, fixDifficulty:fdFlat, teamId:1, nowTs:NOW }), 0);
ok(tot > 5, `summa yfir 5 umferdir er ${tot.toFixed(1)}, EKKI 0 — thetta er villan sem skekkti transferNet`);

/* ---------- 13. ALDUR A FFDR-INNTAKI (thogul bilun) ----------
   elo.json er inntak i FFDR og var 31.7.2026 1,5 daga gomul thvi ClubElo
   BRAST — status.json sagdi {"ok":false,"note":"fetch failed"} en vidmotid
   sagdi ekkert. Sama mynstur sem gerdi markadslidinn daudan i viku.       */
console.log("\n=== 13. ALDUR A ELO-GOGNUM ===");
const T0 = Date.UTC(2026, 6, 31, 12);
const dAgo = n => new Date(T0 - n * 864e5).toISOString();
ok(eloStale(dAgo(0.5), T0) === null, "ferskt (0,5 dags) -> engin truflun");
ok(eloStale(dAgo(1.9), T0) === null, `undir throskuldi (${ELO_STALE_WARN} dagar) -> thegjum`);
const w = eloStale(dAgo(3), T0);
ok(w?.level === "warn", "3 dagar -> vidvorun (nokkur keyrsla tapadist)");
const b2 = eloStale(dAgo(9), T0);
ok(b2?.level === "bad", `9 dagar -> BILUN (>=${ELO_STALE_BAD})`);
ok(Math.abs(b2.days - 9) < 0.01, `aldur reiknadur rett (${b2.days.toFixed(2)})`);
ok(eloStale(null, T0) === null && eloStale("rusl", T0) === null,
  "engin/ogild dagsetning -> null, engin agiskun og ekkert hrun");
ok(ELO_STALE_WARN < ELO_STALE_BAD, "vidvorun kemur A UNDAN bilun");
/* Raungogn: skrain i repo-inu ma ekki vera i 'bilun'-stodu othoguð */
const eloReal = JSON.parse(readFileSync(new URL("../data/elo.json", import.meta.url), "utf8"));
const stReal = eloStale(eloReal.updated);
console.log(`  data/elo.json: ${stReal ? stReal.days.toFixed(1) + " dagar (" + stReal.level + ")" : "ferskt"}`);
/* ENGIN STADFESTING A RAUNSKRANNI — VILJANDI. Pipeline GETUR verid nidri
   og thad er einmitt thad sem fallid er til ad birta; prof sem fell vid thad
   vaeri prof a ClubElo, ekki a okkar koda. Talan er logguð til upplysingar.
   (Fyrsta utgafa min hafdi hér `ok(... || true)` sem GAT EKKI FALLID — prof
   sem getur ekki fallid er verra en ekkert prof.)                        */

/* ---------- 14. FPL-SLOD -> LIDSNUMER ----------
   Notandinn: "Thad virkar ekki ad setja inn url. Hvada part af urlinu a ad
   fara inn? Thad kemur engin villa eda athugasemd sem segir stadfest."
   Reglan er nu hreint fall svo hun se profanleg — jsdom getur ekki drifid
   styrda React-reiti a aabyggilegan hatt (kafli 4).                       */
console.log("\n=== 14. FPL-SLOD -> LIDSNUMER ===");
{
  const E = (v) => parseEntryId(v).error, I = (v) => parseEntryId(v).id;
  ok(I("https://fantasy.premierleague.com/entry/1234567/event/1") === "1234567",
    "full slod med /event/ -> numerid");
  ok(I("https://fantasy.premierleague.com/entry/1234567/history") === "1234567",
    "onnur undirsida virkar lika (/history)");
  ok(I("fantasy.premierleague.com/entry/98765/") === "98765", "an https og med skastriki");
  ok(I("entry/42") === "42", "adeins slodar-buturinn");
  ok(I("1234567") === "1234567", "BERT numer");
  ok(I("  1234567  ") === "1234567", "bil kringum numer eru snyrt");
  ok(I("#1234567") === "1234567", "# fyrir framan (fpl syn stundum svo)");
  ok(E("") === "empty" && E("   ") === "empty", "tomt -> 'empty' (bidjum um innslatt)");
  ok(E("https://fantasy.premierleague.com/leagues/314/standings/c") === "league",
    "DEILDAR-slod -> 'league' (algengasta mistokin fær SERTAEKA villu)");
  ok(E("https://fantasy.premierleague.com/league/314/standings") === "league",
    "eintala 'league' lika");
  ok(E("bull") === "none" && E("https://google.com") === "none",
    "rusl -> 'none', engin agiskun");
  ok(E("my-team") === "none",
    "/my-team hefur ekkert numer — thad er innskrada sidan, ekki opinber slod");
  ok(parseEntryId(null).error === "empty" && parseEntryId(undefined).error === "empty",
    "null/undefined hrynja ekki");
  /* Ekki taka numer ur ORUM stodum i slodinni */
  ok(I("https://fantasy.premierleague.com/leagues/314/standings/c") === undefined,
    "deildarnumer (314) er EKKI tekid sem lidsnumer");
}

/* ---------- GRAENAR RUNUR (FFDR-ramminn) ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("GRAENAR RUNUR — 3+ leikir i rod fa ramma");
console.log("─".repeat(84));
{
  const spans = r => r.map(x => x ? (x.first ? "[" : "") + x.len + (x.last ? "]" : "") : ".").join(" ");
  /* G=0/1 graent · N=2 hlutlaust · R=5 raudur · null=aud umferd */
  ok(spans(greenRuns([1, 1, 1])) === "[3 3 3]", "threir graenir i rod -> runa");
  ok(spans(greenRuns([1, 1, 2])) === ". . .", "TVEIR duga EKKI — thad er threpid, ekki programid");
  ok(spans(greenRuns([0, 1, 0, 5, 1, 1, 1, 1])) === "[3 3 3] . [4 4 4 4]",
    "tvaer adskildar runur i somu rod", spans(greenRuns([0, 1, 0, 5, 1, 1, 1, 1])));
  ok(spans(greenRuns([1, 1, 2, 1, 1])) === ". . . . .",
    "HLUTLAUST SLITUR: 2+2 er ekki runa af 4");

  /* AUD UMFERD ER THYNGST (CLAUDE.md 3d) — hun ma ALDREI vera bru.
     Thetta er reglan sem er audveldast ad tapa: `null` er hvorki >= 2 ne
     graent, svo naiv skilyrdi hleypir henni i gegn.                     */
  ok(spans(greenRuns([1, 1, null, 1, 1])) === ". . . . .",
    "AUD UMFERD SLITUR RUNU — blank er 0 stig, thyngra en raudur leikur");
  ok(spans(greenRuns([1, 1, 1, null, 1, 1, 1])) === "[3 3 3] . [3 3 3]",
    "en runur BEGGJA vegna audrar umferdar standa", spans(greenRuns([1, 1, 1, null, 1, 1, 1])));

  ok(spans(greenRuns([])) === "", "tom rod fellur ekki");
  ok(greenRuns([1, 1, 1]).length === 3, "skilar fylki i SOMU lengd (rodun i toflunni byggir a thvi)");
  ok(spans(greenRuns([1, 1, 1, 1, 1])) === "[5 5 5 5 5]", "ein long runa er EIN runa, ekki margar");
  /* Endarnir bera rammann; an theirra vaeri hann opinn i badar attir. */
  const e = greenRuns([1, 1, 1]);
  ok(e[0].first && !e[0].last && e[2].last && !e[2].first && !e[1].first && !e[1].last,
    "first/last adeins a endunum — ramminn lokast");
}

/* ============================================================
   LANDSLEIKJAHLE OG EVROPUVIKUR

   >>> BIRTING, EKKI LIKAN. <<< Evropualag var MAELT og HAFNAD sem inntaki
   (MAELINGAR 6k: −1,37pp, CI [−4,67; +1,92] — null er inni i bilinu).
   Ef einhver vill nota thetta i spa tharf NYJA maelingu. Profin hér verja
   thvi ad talan se RETT REIKNUD, ekki ad hun spai neinu.

   ThETTA VERDUR AD PROFAST A TILBUNUM GOGNUM. `euroWeeks` skilar {} a
   raungognum i dag: `euro_fixtures.json` ber adeins Ofurbikarinn og
   Samfelagsskjoldinn og BADIR eru fyrir GW1, thvi drattur ridlakeppninnar
   er ekki kominn. Kodi sem kviknar fyrst einn morgun i agust og hefur
   aldrei verid keyrdur er nakvaemlega thad sem CLAUDE.md kafli 5 bannar —
   sama mynstur og `mins-trend` kafli 0 og `defcon-shrink`.
   ============================================================ */
console.log(`\n${"─".repeat(72)}\nLANDSLEIKJAHLE OG EVROPUVIKUR\n${"─".repeat(72)}`);
{
  const D = (gw, ...iso) => iso.map(s => ({ event: gw, kickoff_time: s }));
  /* Thrjar umferdir: GW1 (16.8.), GW2 (23.8.) og GW3 (12.9.).
     Bilid GW1->GW2 er 7 dagar (venjuleg vika), GW2->GW3 er 20 (hle).   */
  const FX = [
    ...D(1, "2026-08-15T14:00:00Z", "2026-08-16T16:00:00Z"),
    ...D(2, "2026-08-22T14:00:00Z", "2026-08-23T16:00:00Z"),
    ...D(3, "2026-09-12T14:00:00Z"),
  ];

  const spans = gwSpans(FX);
  ok(spans[1].min === Date.parse("2026-08-15T14:00:00Z")
     && spans[1].max === Date.parse("2026-08-16T16:00:00Z"),
     "gwSpans finnur fyrsta OG sidasta byrjunartima umferdar");
  ok(Object.keys(spans).length === 3, "gwSpans skilar einni faerslu per umferd");
  ok(gwSpans(null) && Object.keys(gwSpans(null)).length === 0,
     "gwSpans tholir null og skilar tomu");
  ok(Object.keys(gwSpans([{ event: 1 }, { kickoff_time: "x" }, { event: 2, kickoff_time: "ekki dagsetning" }])).length === 0,
     "radir an dagsetningar/umferdar eru hunsadar, ekki NaN");

  const brk = intlBreaks(FX);
  ok(brk[1] === undefined, "7 daga bil er EKKI hle (venjuleg vika)");
  ok(brk[2] === 20, `20 daga bil ER hle (${brk[2]} dagar)`);
  ok(BREAK_MIN_DAYS === 12, `throskuldur er 12 dagar (${BREAK_MIN_DAYS})`);
  /* RAUNGOGN: tolurnar sem CLAUDE.md skjalar verda ad haldast. Fallid
     var FLUTT ur App.jsx i model.js — thetta ver ad flutningurinn hafi
     ekki breytt hegdun (sbr. regluna um ad esbuild se ekki nog).       */
  try {
    const raw = JSON.parse(readFileSync(new URL("../data/fixtures.json", import.meta.url), "utf8"));
    const list = Array.isArray(raw) ? raw : (raw.fixtures || []);
    const real = intlBreaks(list);
    ok(real[5] >= 18 && real[10] >= 12 && real[30] >= 18,
       `raungogn: hle eftir GW5/10/30 (${real[5]}/${real[10]}/${real[30]} dagar)`);
    ok(Object.keys(real).length === 3,
       `nakvaemlega thrju hle a timabilinu (${Object.keys(real).length})`);
  } catch { ok(true, "fixtures.json vantar — raungagna-hluti sleppt"); }

  /* ---- EVROPUVIKUR ---- */
  const EU = {
    participation: { 1: ["CL"], 6: ["CL", "EL"], 99: [], 100: "ekki fylki" },
    fixtures: [
      /* i bilinu GW2->GW3 (20 dagar) — telst evropuvika */
      { date: "2026-09-02T19:00Z", comp: "uefa.champions", comp_label: "Champions League",
        home_fpl: 1, away_fpl: 6 },
      { date: "2026-09-03T19:00Z", comp: "uefa.europa", comp_label: "Europa League",
        home_fpl: 6, away_fpl: null },
      /* SAMA DAG og deildarleikur i GW1 — telst EKKI vika i bilinu */
      { date: "2026-08-15T19:00Z", comp: "x", comp_label: "Sami dagur", home_fpl: 1, away_fpl: null },
      /* eftir sidustu umferd — ekkert bil a eftir, a ad hunsast */
      { date: "2026-12-01T19:00Z", comp: "y", comp_label: "Eftir lok", home_fpl: 1, away_fpl: null },
      { date: "ekki dagsetning", comp: "z", home_fpl: 1, away_fpl: null },
    ],
  };
  const ew = euroWeeks(FX, EU);
  ok(Object.keys(ew).length === 1 && ew[2], "evropuvika lendir i RETTA bilinu (eftir GW2)");
  ok(ew[2].n === 2, `badir leikirnir i bilinu taldir (${ew[2]?.n})`);
  ok(ew[2].comps.length === 2 && ew[2].comps.includes("uefa.champions")
     && ew[2].comps.includes("uefa.europa"), "keppnirnar (velraen audkenni) taldar upp einu sinni hver");
  ok(ew[2].comps.map(compLabel).join(", ") === "Champions League, Europa League",
     `compLabel thydir audkennin a ensku (${ew[2].comps.map(compLabel).join(", ")})`);
  ok(ew[2].teams.includes(1) && ew[2].teams.includes(6) && ew[2].teams.length === 2,
     "lidin skrad einu sinni hvert, null hunsad");
  ok(!ew[1], "leikur a SAMA degi og deildarleikur telst ekki vika i bilinu");
  ok(!ew[3], "leikur eftir sidustu umferd hefur ekkert bil og er hunsadur");
  ok(Object.keys(euroWeeks(FX, null)).length === 0, "euroWeeks tholir null-skra");
  ok(Object.keys(euroWeeks(FX, { fixtures: [] })).length === 0, "tom skra gefur tomt, ekki hrun");
  ok(Object.keys(euroWeeks([], EU)).length === 0, "engir deildarleikir -> engin bil -> tomt");

  /* ---- KEPPNISHEITI VERDA AD VERA ENSK ----
     `no-icelandic.mjs` GETUR EKKI VARID ThETTA og thad er viljandi: hun
     leyfir islensku sem kemur UR `data/` (lidsnofn, frettir). `comp_label`
     kemur ur data — en er UI-TEXTI, ekki gogn. Undanthagan sem er rett
     fyrir frettir er thvi gat fyrir keppnisheiti.

     VORDURINN ER ThVI ANNARS EDLIS: hver keppni sem pipeline GETUR skrifad
     verdur ad eiga enskt heiti i COMP_EN. Ef einhver baetir keppni vid
     `CANDIDATES` i fetch.mjs an thess ad thyda hana fellur thetta — i stad
     thess ad islenskt heiti birtist thegjandi a spjaldi eftir naesta dratt. */
  {
    let src = "";
    try { src = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url), "utf8"); } catch {}
    const block = src.match(/const CANDIDATES = \[([\s\S]*?)\]/);
    const comps = block ? [...block[1].matchAll(/"([a-z0-9._]+)"/g)].map(m => m[1]) : [];
    ok(comps.length >= 8, `pipeline-keppnir lesnar ur fetch.mjs (${comps.length})`);
    const missing = comps.filter(c => !COMP_EN[c]);
    ok(missing.length === 0,
       `hver keppni i pipeline a enskt heiti${missing.length ? " — VANTAR: " + missing.join(", ") : ""}`);
    /* Og heitin sjalf mega ekki bera islensku (hvorki broddstafi ne
       ASCII-islensku ordin sem stafaskynjun ser ekki).                 */
    const IS_WORDS = /deild|bikar|forkeppni|felagslida|mots|leikur/i;
    const bad = Object.entries(COMP_EN)
      .filter(([, v]) => /[þðæöáíóúéýÞÐÆÖÁÍÓÚÉÝ]/.test(v) || IS_WORDS.test(v));
    ok(bad.length === 0, `oll ensku heitin eru ensk${bad.length ? ": " + bad.map(b => b[1]).join(", ") : ""}`);
    ok(compLabel({ comp: "uefa.super_cup", comp_label: "Ofurbikar" }) === "Super Cup",
       "compLabel HUNSAR islenska labelid og notar audkennid");
    ok(compLabel({ comp: "alveg.oth.ekkt" }) === "alveg.oth.ekkt",
       "okunn keppni fellur a audkennid (ASCII), ekki a islenska labelid");
    ok(compLabel(null) === "" && compLabel({}) === "", "compLabel tholir tomt");
  }

  /* ---- ThATTTAKA ---- */
  const et = euroTeams(EU);
  ok(et.get(1)?.join() === "CL" && et.get(6)?.join() === "CL,EL",
     "euroTeams skilar keppnunum per lid");
  ok(!et.has(99), "lid med TOMAN lista telst ekki i Evropu");
  ok(!et.has(100), "svid sem er ekki fylki er hunsad, ekki hrun");
  ok(euroTeams(null).size === 0 && euroTeams({}).size === 0, "euroTeams tholir null/tomt");
  /* RAUNGOGN: sex ensk lid eru i Evropu 2026/27.                       */
  try {
    const real = euroTeams(JSON.parse(readFileSync(new URL("../data/euro_fixtures.json", import.meta.url), "utf8")));
    ok(real.size >= 4 && real.size <= 10, `raungogn: ${real.size} lid i Evropu (4-10 er vitraent)`);
    ok([...real.values()].every(v => Array.isArray(v) && v.length), "hvert lid ber ad minnsta kosti eina keppni");
  } catch { ok(true, "euro_fixtures.json vantar — raungagna-hluti sleppt"); }
}

/* ============================================================
   MARKADS-LYKKJAN MA EKKI HENGJA SIG (fundid med slembiprofi 11.8.2026)

   `lambdaFromOver(pOver, line)` hafdi OAFMARKADA innri lykkju:
   `for (j = 0; j <= Math.floor(line); j++)`. Med `line = Infinity` (eda 1e12)
   stoppadi hun ALDREI, og ytri helmingunin keyrir hana 60 sinnum.

   HVERS VEGNA ThAD ER NAANLEGT: `scripts/fetch.mjs` reiknar
   `line = totLine / totN` ur `point`-svidum bokmakera i Odds-API-svarinu.
   `totN` er profad en GILDID er oafmarkad, svo eitt gallad `point` hengir
   daglegu keyrsluna — Actions-minutur brenna thangad til 6-klst thakid slaer
   inn, engin gogn skrifud, ENGIN VILLA skrad. Thogul bilun af verstu gerd.

   ThETTA PROF KEYRIR FALLID I EIGIN BARNAFERLI MED TIMAThAKI. Thad er
   nauðsyn, ekki ihaldssemi: JS er einthraedad, svo endalaus SYNC-lykkja er
   ekki haegt ad tima ut innan sama ferlis — profid myndi einfaldlega hanga
   med henni og `npm test` aldri ljuka.
   ============================================================ */
console.log(`\n${"─".repeat(72)}\nMARKADS-LYKKJAN: OHEMJULEG LINA MA EKKI HENGJA\n${"─".repeat(72)}`);
{
  const { execFileSync } = await import("node:child_process");
  const call = lit => {
    const code = `const {lambdaFromOver}=await import("${new URL("../src/market.js", import.meta.url).href}");`
               + `process.stdout.write(String(lambdaFromOver(0.5,${lit})));`;
    try {
      return { out: execFileSync(process.execPath, ["--input-type=module", "-e", code],
                                { timeout: 8000, encoding: "utf8" }).trim() };
    } catch (e) {
      return { hung: e.killed === true || e.signal === "SIGTERM" || /ETIMEDOUT/.test(String(e.code)) };
    }
  };
  /* KRAFAN ER "HENGIR SIG EKKI", EKKI "SKILAR TOLU" (hert 25.8.2026).
     Upphaflega villan var OAFMORKUD LYKKJA og fullyrdingin var skrifud
     gegn HENNI; "skilar tolu" var einfaldlega thad sem fallid gerdi tha.
     Sidan faekk `lambdaFromOver` hlid sem skilar `null` fyrir inntak sem
     er ekki lina — og `null` uppfyllir upphaflega markmidid BETUR en
     tala: 0,1 vaent mork er truverdug tala i sniðinu og hreinn uppspuni
     i merkingu, og `marketGoals` skrifar hana beint i `odds.json`.
     Vid krefjumst thvi: EKKI hengja, og EKKI uppspunnin tala.        */
  for (const lit of ["Infinity", "1e12", "1e308", "Number.MAX_VALUE"]) {
    const r = call(lit);
    const v = r.hung ? null : (r.out === "null" ? null : Number(r.out));
    ok(!r.hung && (v === null || Number.isFinite(v)),
       `line=${lit} hengir sig EKKI (${r.hung ? "HENGDI" : r.out})`);
  }
  /* OG `Infinity` ER EKKI LINA — hun a ad skila `null`, ekki tolu.
     Thessi fullyrding er ADSKILIN fra theirri ad ofan viljandi: su ver
     gegn HENGINGU (ollum fjorum), thessi gegn UPPSPUNA (einu tilfelli).
     Vaeru thaer ein fullyrding gaeti hun stadist af rangri astaedu.   */
  ok(call("Infinity").out === "null",
     `line=Infinity skilar null (ekki uppspunnin tala) — ${call("Infinity").out}`);
  /* OG FULLYRDINGIN MA EKKI VERA TOM: raunveruleg lina VERDUR ad fara
     obreytt i gegn, annars vaeri "vornin" ad klippa gild gogn.          */
  const real = call("2.5");
  ok(!real.hung && Math.abs(Number(real.out) - 2.67406031372356) < 1e-9,
     `raunlina 2,5 er obreytt (${real.out})`);
  /* Tolu-STRENGUR ma ekki hrynja i 0 — fyrsta tilraun min ad thessari
     lagfaeringu gerdi einmitt thad (Number.isFinite("2.5") er false).   */
  const str = call('"2.5"');
  ok(!str.hung && Math.abs(Number(str.out) - 2.67406031372356) < 1e-9,
     `tolu-strengur "2.5" jafngildir 2,5 (${str.out})`);
}

/* ============================================================
   TVAER SKILGREININGAR A SOMU TOLU — BUNDNAR SAMAN (14.8.2026)
   `LG_XG` (model.js) og `LG_XG_MARKET` (market.js) eru badar
   deildarmedaltal marka per lid-leik og badar 1,45. Skrarnar eru VILJANDI
   oháðar (market.js flytur ekkert inn ur model.js), en tvitekid gildi an
   vardar er bod um thogult misraemi: breytti einhver odru vaeri
   markadslidurinn ad reikna a odru deildarmedaltali en kjarninn, og EKKERT
   hefdi sagt fra thvi. Fullyrdingin er a JOFNUDI theirra, ekki a tolunni —
   maelist deildarmedaltalid upp a nytt eiga BADAR ad faerast.
   ============================================================ */
{
  const { LG_XG_MARKET } = await import("../src/market.js");
  const { LG_XG } = await import("../src/model.js");
  ok(LG_XG === LG_XG_MARKET,
     `LG_XG (model.js ${LG_XG}) == LG_XG_MARKET (market.js ${LG_XG_MARKET})`);
  ok(LG_XG > 1.2 && LG_XG < 1.8, `og talan er truverdugt deildarmedaltal (${LG_XG})`);
}

/* ============================================================
   "ThU NOTAR HANN ALDREI" — rarelyStarted + priceFloors

   Reglan sem SKIPTIR MALI er UNDANTEKNINGIN: odyrasti bekkjarmadurinn A ad
   sitja og ma ALDREI vera flaggadur, thvi salan losar ekkert fe. Profid er
   thvi TVIHLIDA i hverjum kafla — annars vaeri "0 flogg" graent af thvi ad
   fallid flaggar aldrei neitt.
   ============================================================ */
console.log("\n=== ThU NOTAR HANN ALDREI (rarelyStarted) ===");
{
  const P = [
    { id:1, element_type:2, now_cost:40 },   // odyrasti DEF — GOLF
    { id:2, element_type:2, now_cost:55 },   // dyrari DEF sem situr
    { id:3, element_type:3, now_cost:45 },   // odyrasti MID — GOLF
    { id:4, element_type:3, now_cost:90 },   // dyr MID sem situr
    { id:5, element_type:2, now_cost:65 },   // byrjar alltaf
    { id:6, element_type:1, now_cost:40 },   // odyrasti GK — GOLF
  ];
  const byId = Object.fromEntries(P.map(p => [p.id, p]));
  const floors = priceFloors(P);
  eq(floors[1], 40, "golf GK reiknad ur lauginni");
  eq(floors[2], 40, "golf DEF reiknad ur lauginni");
  eq(floors[3], 45, "golf MID reiknad ur lauginni");

  const sq = st => P.map(p => ({ id:p.id, starter: st.includes(p.id) }));
  const perGw = [5,6,7,8,9,10].map(gw => ({ gw, squad: sq([5]) }));
  const res = rarelyStarted({ perGw, byId, floors });
  const ids = res.map(r => r.id);

  ok(ids.length > 0, `forsenda: eitthvad er flaggad (${ids.length})`);
  ok(ids.includes(2) && ids.includes(4),
     `their sem sitja OG eru yfir golfi eru flaggadir (${ids.join(",")})`);
  ok(!ids.includes(1) && !ids.includes(3) && !ids.includes(6),
     "ODYRASTI BEKKJARMADUR ER ALDREI FLAGGADUR — ekkert odyrara er til");
  ok(!ids.includes(5), "sa sem byrjar er ekki flaggadur");
  eq(res[0].id, 4, "sa sem losar MEST fe kemur fyrstur (£9,0 -> golf £4,5)");
  eq(res[0].freesTenths, 45, "losad fe = verd - golf, i tiundum");

  /* ============================================================
     EIN BYRJUN FELLDI HANN UT — NU BER HANN TOLUNA 1 (20.8.2026)
     ============================================================
     Fullyrdingin hér var "ein byrjun i einni umferd og hann er EKKI lengur
     'aldrei notadur'", og hun var RETT um `neverStarted`. Notandinn bad um
     TALNINGU: „teldu tha hversu oft vidkomandi er i XI. Ballard t.d.
     kannski bara 1x eda eitthvad." Madur sem var i XI-inu EINU SINNI af
     sex er nanast jafn seljanlegur og sa sem var thad aldrei — og
     `starts === 0` var klettur a versta stad.
     Fullyrdingin SNYST ThVI VID, og hun er ekki slakari: hun bindur
     TOLUNA (1) og NEFNARANN (6), sem gamla ja/nei-utgafan gat ekki.   */
  const perGw2 = perGw.map((x,i) => i === 3 ? { ...x, squad: sq([5,2]) } : x);
  const r2 = rarelyStarted({ perGw: perGw2, byId, floors }).find(r => r.id === 2);
  ok(!!r2, "ein byrjun af sex -> hann er ENN nefndur (var osynilegur adur)");
  eq(r2?.starts, 1, "og talan er 1");
  eq(r2?.gws, 6, "af sex umferdum sem hann var i hopnum");
  /* OG ThAKID: TVAER byrjanir af sex er nakvaemlega thridjungur og telst
     enn sjaldan; ThRJAR er yfir og fellur ut. `>` og ekki `>=`.        */
  const twoOf6 = perGw.map((x,i) => i < 2 ? { ...x, squad: sq([5,2]) } : x);
  ok(rarelyStarted({ perGw: twoOf6, byId, floors }).some(r => r.id === 2),
     "tvaer af sex (nakvaemlega thridjungur) -> afram nefndur");
  const threeOf6 = perGw.map((x,i) => i < 3 ? { ...x, squad: sq([5,2]) } : x);
  ok(!rarelyStarted({ perGw: threeOf6, byId, floors }).some(r => r.id === 2),
     "ThRJAR af sex -> yfir UI-afmorkuninni, ekki nefndur");

  /* SA SEM ER SELDUR I MIDRI AAETLUN ER EKKI FLAGGADUR — hann er a forum. */
  const perGw3 = perGw.map((x,i) => i < 2 ? x
    : { ...x, squad: x.squad.filter(s => s.id !== 4) });
  ok(!rarelyStarted({ perGw: perGw3, byId, floors }).some(r => r.id === 4),
     "leikmadur sem hverfur ur hopnum i midri aaetlun er ekki flaggadur");

  /* ---- HERT 18.8.2026 eftir andstaedu-profun ----------------------- */

  /* SA SEM ER KEYPTUR INN OG ALDREI SPILAD — VERDMAETASTA TILFELLID.
     Gamla reglan (`gws < perGw.length` -> sleppa) atti ad utiloka thann
     sem er A FORUM en utilokadi lika thann sem er AD KOMA: kaup i GW1 +
     bekkur var flaggad, NAKVAEMLEGA somu kaup i GW2 voru THOGN.        */
  const arrive = [5,6,7,8,9,10].map((gw,i) => ({ gw,
    squad: i === 0 ? [{id:5,starter:true}] : [{id:5,starter:true},{id:4,starter:false}] }));
  ok(rarelyStarted({ perGw: arrive, byId, floors }).some(r => r.id === 4),
     "keyptur i 2. umferd gluggans og aldrei spilad -> FLAGGADUR");

  /* SA SEM ER SELDUR I LOK GLUGGANS ER ThAD EKKI — og tvitekin id-
     faersla ma ekki lauma honum inn. Adur taldi `gws++` faerslur, svo
     madur sem var keyptur TVISVAR nadi fullri thekju thott hann vaeri
     fjarverandi i sidustu umferd.                                     */
  const sold = [5,6,7,8,9,10].map((gw,i) => ({ gw,
    squad: i >= 4 ? [{id:5,starter:true}]
                  : [{id:5,starter:true},{id:4,starter:false},{id:4,starter:false}] }));
  ok(!rarelyStarted({ perGw: sold, byId, floors }).some(r => r.id === 4),
     "seldur fyrir lok gluggans -> EKKI flaggadur (tvitekid id bjargar honum ekki)");

  /* OMAELD TALA FAER ENGA ABENDINGU — "frees up to £NaN" var a skjanum. */
  const junk = { ...byId, 9: { id:9, element_type:3, now_cost:"mikid" } };
  const jr = rarelyStarted({ perGw: [5,6,7].map(gw=>({gw,squad:[{id:9,starter:false},{id:5,starter:true}]})),
                            byId: junk, floors });
  ok(jr.every(r => Number.isFinite(r.freesTenths)), "ekkert NaN i freesTenths");
  ok(!jr.some(r => r.id === 9), "leikmadur med ruslverd er ekki flaggadur");

  /* NULL-VERD I LAUGINNI MA EKKI SETJA GOLFID I 0 — `Number(null)` er 0
     og stodst `isFinite`, svo EINN slikur eyðilagdi undanthaguna fyrir
     ALLA stoduna og gerdi setningu bordans osanna.                     */
  const f2 = priceFloors([{element_type:2,now_cost:null},{element_type:2,now_cost:40},
                          {element_type:2,now_cost:55}]);
  eq(f2[2], 40, "null-verd hunsad; golfid helst 40, ekki 0");

  /* THRIGGJA UMFERDA LAGMARKID — ENGIN FULLYRDING VARDI ThAD (18.8.2026).
     `App.jsx` sleppir gluggum styttri en 3 ("aldrei" um eina umferd er
     ekki upplysing), en stokkbreyting ur `< 3` i `< 0` var GRAEN i ollum
     61 safninu. Reglan sjalf byr her: tveggja-umferda vera er lagmark, og
     glugga-lagmarkid er profad ThAR SEM ThAD ER TEKID.                */
  const twoGw = [5,6].map(gw => ({ gw, squad: sq([5]) }));
  ok(rarelyStarted({ perGw: twoGw, byId, floors }).some(r => r.id === 4),
     "tveggja umferda vera DUGAR i modelinu (glugga-lagmarkid er i App.jsx)");
  const oneGw = [{ gw: 5, squad: sq([5]) }];
  ok(!rarelyStarted({ perGw: oneGw, byId, floors }).length,
     "EIN umferd flaggar engan — 'aldrei' um eina umferd er ekki vitnisburdur");

  /* TOM AAETLUN SEGIR EKKERT — hun ma ekki flagga ollum. */
  eq(rarelyStarted({ perGw: [], byId, floors }).length, 0, "tom aaetlun -> ekkert flagg");
  /* Og an golfs (tom laug) ma hun ekki hrynja. */
  ok(Array.isArray(rarelyStarted({ perGw, byId, floors: {} })), "tomt golf hrynur ekki");
}


console.log(`\nMODEL-PRÓF: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
