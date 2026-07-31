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
  rankScore, RANK_W } from "../src/model.js";
import { marketDiff } from "../src/market.js";
import { ELO_STALE_BAD, ELO_STALE_WARN, RETURN_AVAIL, availForKickoff,
         eloStale, parseReturn } from "../src/model.js";

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
// söfnun upp í 5
let tc = computeTransferCost({ plan: [], chipAt: noChip, maxGw: 8, preSeason: false });
eq(tc[1].ftAvailable, 1, "GW1: byrjar með 1 frítt");
eq(tc[5].ftAvailable, 5, "ónotuð skipti safnast upp í 5");
eq(tc[8].ftAvailable, 5, "þak helst á 5");
// söfnun: GW1 gefur 1, +1 eftir hverja ónotaða umferð -> GW3 hefur 3 frí
tc = computeTransferCost({ plan: [{gw:3},{gw:3},{gw:3},{gw:3}], chipAt: noChip, maxGw: 5, preSeason: false });
eq(tc[3].ftAvailable, 3, "GW3: 3 frí söfnuð (1 + tvær ónotaðar umferðir)");
eq(tc[3].hits, 1, "4 skipti − 3 frí = 1 yfir");
eq(tc[3].points, -4, "1 yfir = −4 stig");
eq(tc[4].ftAvailable, 1, "eftir að öll frí kláruðust: 1 í næstu");
// WILDCARD HELDUR söfnuðum skiptum (FPL-regla frá 2024/25 — var brotin áður:
// eldri kóðinn endurstillti í 1 eftir chip-umferð)
const wcAt = g => (g === 4 ? "wildcard" : null);
tc = computeTransferCost({ plan: [{gw:4},{gw:4},{gw:4},{gw:4},{gw:4}], chipAt: wcAt, maxGw: 6, preSeason: false });
eq(tc[4].hits, 0, "wildcard: engin refsing þrátt fyrir 5 skipti");
eq(tc[4].ftAvailable, 4, "wildcard: söfnuðu skiptin (4) HALDAST");
eq(tc[5].ftAvailable, 5, "eftir wildcard: +1 bætist við söfnuð (4→5), EKKI endurstillt í 1");
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
eq(tc[2].ftAvailable, 2, "GW2 hefur 2 frí söfnuð");
eq(tc[2].hits, 1, "BB ver ekki gegn refsingu: 3 skipti − 2 frí = 1 yfir");
eq(tc[2].points, -4, "og það kostar −4");

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

console.log(`\nMODEL-PRÓF: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
