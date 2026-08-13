/* ============================================================
   usageblend.mjs — VORDURINN A NOTKUN-TIL-THESSA.

   `src/usageblend.js` er HREIN, svo thetta prof keyrir NAKVAEMLEGA thad
   sem appid mun nota — ekki afrit af thvi. Engin jsdom: thad er engin
   birting her ad profa.

   ============================================================
   FJORIR PROFSTEINAR, OG THEIR ERU OLIKIR
   ============================================================
   1. BOKADA TAFLAN VERDUR AD PASSA VID `data/measure/usage.json`,
      snid fyrir snid. Sama mynstur og `dashboard.mjs` kafli 3d ber
      `WEEKLY_MEASURED` vid `mktweek.json`. Endurkeyrsla labsins sem
      breytir tolunum FELLIR thetta — og tha uppfaerir madur TOFLUNA,
      ekki profid.
   2. FERILLINN i BADAR ATTIR. Vog sem er alltaf 0 stenst "≤ 0,05 vid
      4 leiki" jafn vel og rett vog, svo lagmarkid VERDUR ad vera
      profad samhlida thvi ad vogin se raunverulega haerri seinna. Su
      osamhverfa var einmitt gildran i `playerlist-sort.mjs` i
      FPL-verkefninu (fullyrding sem tharf tvennt til ad bregdast).
   3. LEKINN. `throughWeek` er UTILOKANDI og profid verdur ad geta
      brugdist: vika 5 er BYGGD sem risa-utlagi, og profid krefst thess
      ad hun hafi ENGIN ahrif vid `throughWeek: 5` OG **fullkomlega
      snyr** vid `throughWeek: 6`. An seinni helmings vaeri fullyrdingin
      graen fyrir koda sem sleppir ollum rodum.
   4. RAUNGOGN. `data/weekly/2024.json` er lesid og talan borin vid
      SJALFSTAEDA endurtalningu i profinu — tvaer utfaerslur, ekki ein
      sem endurtekur sjalfa sig.
   ============================================================ */

import {
  USAGE_BLEND, GAMES_IN_SEASON, usageToDate, blendWeight, blendedSeasonProj, PRIOR_FIT, estimateFromZ, crossSection, zOf, MAPPING_RISK } from "../src/usageblend.js";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = path.join(ROOT, "data");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const near = (a, b, eps = 1e-9) => a != null && b != null && Math.abs(a - b) <= eps;

const LAB = JSON.parse(readFileSync(path.join(DATA, "measure", "usage.json"), "utf8"));
const FORMATS = ["ppr", "half-ppr", "standard"];

/* ============================================================
   1. BOKADA TAFLAN GEGN LABINU
   ============================================================ */
console.log("\n1. bokada taflan gegn data/measure/usage.json");
{
  ok(!!LAB.results, "usage.json ber `results`");

  /* Vorpun app-lykla -> lab-lykla er BOKUD i eininginni og hun verdur
     ad hitta a raunverulega lykla i skranni. Rangur lykill her vaeri
     `undefined` i hverri toflu og "engin maeling" a hverri deild. */
  for (const f of FORMATS) {
    const key = USAGE_BLEND.labKey[f];
    ok(!!key && !!LAB.results[key], `${f} -> "${key}" er snid i usage.json`);
  }

  const A = USAGE_BLEND.arm;
  ok(A.variable === "opp_prior" && A.window === "last3" && A.curve === "bayes10",
    `sendi reiturinn er ${A.cell}`);

  for (const f of FORMATS) {
    const R = LAB.results[USAGE_BLEND.labKey[f]];
    const cell = R.grid[A.variable][A.window][A.curve];
    ok(!!cell, `${f}: holfid ${A.cell} er i skranni`);
    if (!cell) continue;
    const s = USAGE_BLEND.shipped[f];
    ok(near(s.pct, cell.pctOfGapClosed, 0.001), `${f}: pct ${s.pct} == ${cell.pctOfGapClosed}`);
    ok(near(s.delta, cell.deltaVsIncumbent, 0.001), `${f}: delta ${s.delta} == ${cell.deltaVsIncumbent}`);
    ok(near(s.t, cell.t, 0.001), `${f}: t ${s.t} == ${cell.t}`);
    ok(s.years === cell.years && s.wins === cell.wins,
      `${f}: ${s.wins}/${s.years} == ${cell.wins}/${cell.years}`);
    ok(near(s.seasonBootstrap[0], cell.ciSeasonBootstrap.lo, 0.001) &&
       near(s.seasonBootstrap[1], cell.ciSeasonBootstrap.hi, 0.001),
      `${f}: bootstrap [${s.seasonBootstrap}] == [${cell.ciSeasonBootstrap.lo}, ${cell.ciSeasonBootstrap.hi}]`);
    ok(s.seasonBootstrapExcludesZero === cell.ciSeasonBootstrap.excludesZero,
      `${f}: excludesZero ${s.seasonBootstrapExcludesZero} == ${cell.ciSeasonBootstrap.excludesZero}`);
    /* PLACEBO-FLAGGID ER ATRIDID, ekki skraut: half og standard NA EKKI
       fulla thakinu i thessu holfi og vidmotid ma ekki birta thau eins
       og ppr. Flyti thetta i sundur er fullyrdingin um ppr ordin
       fullyrding um allt. */
    ok(s.beatsPlaceboCeiling === cell.beatsPlaceboCeiling,
      `${f}: beatsPlaceboCeiling ${s.beatsPlaceboCeiling} == ${cell.beatsPlaceboCeiling}`);
    ok(s.beatsScaledPlaceboCeiling === cell.beatsScaledPlaceboCeiling,
      `${f}: beatsScaledPlaceboCeiling ${s.beatsScaledPlaceboCeiling}`);

    /* FERILLINN — hvert viku-bil per sig. Thetta ER nidurstadan. */
    for (const b of ["w1-4", "w5-9", "w10-18"]) {
      const lb = cell.bins[b], ours = s.bins[b];
      ok(!!lb && !!ours, `${f}: bilid ${b} er badum stodum`);
      if (!lb || !ours) continue;
      ok(near(ours.delta, lb.delta, 0.001) && near(ours.t, lb.t, 0.001) && ours.wins === lb.wins,
        `${f} ${b}: ${ours.delta} (t ${ours.t}, ${ours.wins} ar) == ${lb.delta} (t ${lb.t}, ${lb.wins})`);
    }
  }

  /* Toppholf per snid (talan sem README birtir) — OG hun er ONNUR en su
     sem er send i half/standard. Ef thaer verda sama tala hefur einhver
     skipt um arm an thess ad segja fra. */
  for (const f of FORMATS) {
    const R = LAB.results[USAGE_BLEND.labKey[f]];
    const h = USAGE_BLEND.headline[f];
    const bc = R.bestCells.byDelta;
    ok(h.cell === bc.cell, `${f}: toppholf "${h.cell}" == "${bc.cell}"`);
    ok(near(h.delta, bc.mean, 0.001) && near(h.t, bc.t, 0.001) &&
       near(h.pct, bc.absolutePct, 0.001),
      `${f}: toppholf ${h.delta} (t ${h.t}, ${h.pct}%)`);
    const pb = R.playerBootstrap.find((x) => x.cell === bc.cell);
    ok(!!pb, `${f}: per-leikmanns bootstrap er til fyrir toppholfid`);
    if (pb) {
      ok(near(h.playerBootstrap[0], pb.lo, 0.001) && near(h.playerBootstrap[1], pb.hi, 0.001),
        `${f}: per-leikmanns CI [${h.playerBootstrap}] == [${pb.lo}, ${pb.hi}]`);
      ok(pb.excludesZero === true, `${f}: og hun utilokar null (thad var skilyrdid)`);
    }
    ok(h.sameAsShipped === (h.cell === USAGE_BLEND.arm.cell),
      `${f}: sameAsShipped=${h.sameAsShipped} samsvarar theim reit sem er sendur`);
  }
  ok(USAGE_BLEND.headline.ppr.sameAsShipped === true &&
     USAGE_BLEND.headline["half-ppr"].sameAsShipped === false &&
     USAGE_BLEND.headline.standard.sameAsShipped === false,
    "ppr sendir sitt eigid toppholf, half og standard EKKI — og thad er skrad");

  /* Per-leikmanns bootstrap er ADEINS til fyrir toppholfin. Fyrir
     sendu holfin i half/standard er hun EKKI til og einingin ma ekki
     laetast bera hana. */
  for (const f of ["half-ppr", "standard"]) {
    const R = LAB.results[USAGE_BLEND.labKey[f]];
    const has = R.playerBootstrap.some((x) => x.cell === USAGE_BLEND.arm.cell);
    ok(has === false, `${f}: labid ber ENGA per-leikmanns CI fyrir senda holfid`);
    ok(!("playerBootstrap" in USAGE_BLEND.shipped[f]),
      `${f}: og einingin ber hana ekki heldur (annars vaeri hun tekin ur odru holfi)`);
  }

  /* Placebo-thakid. */
  for (const f of FORMATS) {
    const p = LAB.results[USAGE_BLEND.labKey[f]].placebo;
    const ours = USAGE_BLEND.placeboCeiling[f];
    ok(near(ours.delta, p.ceilingDeltaVsIncumbent, 0.001) &&
       near(ours.t, p.ceilingMaxPositiveT, 0.001) &&
       near(ours.scaledOnlyDelta, p.ceilingDeltaScaledOnly, 0.001),
      `${f}: placebo-thak ${ours.delta} / t ${ours.t} / kvardad ${ours.scaledOnlyDelta}`);
    /* Flaggid i sendu toflunni ma ekki stangast a vid thakid. */
    const s = USAGE_BLEND.shipped[f];
    ok(s.beatsPlaceboCeiling === (s.delta > ours.delta && s.t > ours.t),
      `${f}: beatsPlaceboCeiling er SAMKVAEMT thakinu (delta ${s.delta} vs ${ours.delta}, t ${s.t} vs ${ours.t})`);
  }
}

/* ============================================================
   2. MAGN, EKKI HLUTDEILD — AKVORDUNIN REIKNUD UT UR SKRANNI
   ============================================================
   `tshare`/`wopr` einar maelast VERRI en `opp`. Profid reiknar besta
   holf PER BREYTU ur skranni (52 holf hvert) og krefst thess ad `opp`
   se ofar — svo akvordunin geti ekki vikid i thogn.

   ATH: samanburdurinn er BESTA HOLF gegn BESTA HOLFI. I sendu holfinu
   (`last3 · bayes10`) er `tshare_prior` NAFNBOTARLEGA 0,07 pp ofar i
   standard, og thad er skrad i eininginni. Fullyrding um thad holf eitt
   vaeri OSONN og hun er thvi ekki her.                                */
console.log("\n2. magn slaer hlutdeild (reiknad ur skranni)");
{
  const bestOf = (grid, v) => {
    let best = -Infinity;
    for (const w of Object.keys(grid[v])) {
      for (const c of Object.keys(grid[v][w])) {
        if (c === "null-w1") continue;
        const d = grid[v][w][c].deltaVsIncumbent;
        if (typeof d === "number" && d > best) best = d;
      }
    }
    return best;
  };
  for (const f of FORMATS) {
    const grid = LAB.results[USAGE_BLEND.labKey[f]].grid;
    const opp = bestOf(grid, "opp_prior");
    const tsh = bestOf(grid, "tshare_prior");
    const wop = bestOf(grid, "wopr_prior");
    ok(opp > tsh && opp > wop,
      `${f}: opp ${opp.toFixed(3)} > tshare ${tsh.toFixed(3)} og wopr ${wop.toFixed(3)}`);
    ok(near(USAGE_BLEND.rejected.tshare.bestDelta[f], tsh, 0.001),
      `${f}: bokad tshare-thak ${USAGE_BLEND.rejected.tshare.bestDelta[f]} == ${tsh.toFixed(3)}`);
    ok(near(USAGE_BLEND.rejected.wopr.bestDelta[f], wop, 0.001),
      `${f}: bokad wopr-thak ${USAGE_BLEND.rejected.wopr.bestDelta[f]} == ${wop.toFixed(3)}`);
  }
  /* Og fasta vogin er raunverulega skadleg i w1-4 — talan sem
     rettlaetir dauda svidid i ferlinum. */
  for (const f of FORMATS) {
    const grid = LAB.results[USAGE_BLEND.labKey[f]].grid.opp_prior;
    const worst = Math.min(...Object.keys(grid).map((w) => grid[w].const0["bins"]["w1-4"].delta));
    ok(worst < -10, `${f}: const0 (spa hent) tapar ${worst.toFixed(1)} pp i vikum 1-4`);
  }
}

/* ============================================================
   3. FERILLINN — I BADAR ATTIR
   ============================================================ */
console.log("\n3. ferillinn: einraen, bundin, naestum null i byrjun");
{
  const W = (k) => blendWeight(k, "ppr");
  const ks = Array.from({ length: 18 }, (_, i) => i);        // 0..17
  const ws = ks.map(W);

  /* Bundin. */
  ok(ws.every((w) => typeof w === "number" && Number.isFinite(w) && w >= 0 && w <= 1),
    `oll gildi eru tolur i [0,1] (${ws.map((w) => w.toFixed(3)).join(" ")})`);

  /* Einraen — engin dyfa nokkurs stadar. */
  let mono = true;
  for (let i = 1; i < ws.length; i++) if (ws[i] < ws[i - 1] - 1e-12) mono = false;
  ok(mono, "einraen (ohnekkjandi) yfir 0..17");

  /* HAEGA BYRJUNIN — talan sem beidnin krefst. */
  ok(W(4) <= 0.05, `vid 4 leiki er vogin ${W(4)} (≤ 0,05)`);
  ok(W(0) === 0 && W(1) === 0 && W(2) === 0 && W(3) === 0 && W(4) === 0,
    "og hun er NAKVAEMLEGA 0 fram ad 5 leikjum (dauda svidid)");

  /* OG HIN ATTIN: vog sem er alltaf 0 er lika fall. */
  ok(W(17) > W(0), "vogin er ekki fost (0 alltaf vaeri lika bilun)");
  ok(W(10) > 0.3, `vid 10 leiki er hun ${W(10).toFixed(3)} (> 0,3)`);
  ok(W(10) > W(4) + 0.25, `og marktaekt haerri en vid 4 (${W(4)} -> ${W(10).toFixed(3)})`);
  let strict = true;
  for (let k = 6; k <= 17; k++) if (!(W(k) > W(k - 1))) strict = false;
  ok(strict, "og STRANGT vaxandi fra 5 leikjum og upp (ekki throp sem staonar)");

  /* Vogin er ALDREI 1: spain er aldrei hent alveg. `const0` var maeld
     og hun er versta holfid i toflunni. */
  ok(W(17) < 0.7 && W(1e6) < 1, "vogin naer aldrei 1 — spain er aldrei hent alveg");

  /* Formulan er su sem er skjolud, ekki ein sem litur eins ut. */
  const { K, DEAD_GAMES } = USAGE_BLEND.curve;
  ok(K === 10 && DEAD_GAMES === 4, `K=${K} (bayes10) og daudasvid=${DEAD_GAMES}`);
  for (const k of [5, 6, 8, 10, 13, 17]) {
    const eff = k - DEAD_GAMES;
    ok(near(W(k), eff / (K + eff), 1e-12), `w(${k}) = ${eff}/${K + eff} = ${W(k).toFixed(4)}`);
  }

  /* Snid: sama ferill i ollum thremur (engin maeling stydur annad),
     og OMAELD stigagjof faer ENGA vog. */
  for (const k of [6, 10, 17]) {
    ok(near(blendWeight(k, "ppr"), blendWeight(k, "half-ppr"), 1e-12) &&
       near(blendWeight(k, "ppr"), blendWeight(k, "standard"), 1e-12),
      `k=${k}: sami ferill i ollum thremur snidum`);
  }
  ok(blendWeight(12, "half") === blendWeight(12, "half-ppr") &&
     blendWeight(12, "std") === blendWeight(12, "standard"),
    "lab-heitin \"half\"/\"std\" vorpast a app-heitin");
  ok(blendWeight(12, "te-premium") === 0 && blendWeight(12, null) === 0 &&
     blendWeight(12, undefined) === 0,
    "omaeld stigagjof faer vog 0 (spain ein) — ekki naesta tala");

  /* Rusl. */
  ok(blendWeight(null, "ppr") === 0 && blendWeight(undefined, "ppr") === 0 &&
     blendWeight("tolf", "ppr") === 0 && blendWeight(NaN, "ppr") === 0 &&
     blendWeight(-3, "ppr") === 0,
    "rusl-inntak gefur 0, ekki NaN");
  ok(ws.every((w) => !Number.isNaN(w)), "og ekkert NaN i ferlinum");
}

/* ============================================================
   4. LEKINN — `throughWeek` ER UTILOKANDI
   ============================================================
   Vika 5 er RISA-UTLAGI. Se hun med i "til thessa" fyrir viku 5 er
   armid orakel og hvert bakprof er ogilt.                            */
console.log("\n4. lekaprof: vika w ma EKKI telja thegar spad er viku w");
{
  const PID = "TEST-1";
  const flat = (week, mult = 1) => ({
    id: PID, name: "Test Man", pos: "RB", season: 2026, week,
    team: "NE", opp: "BUF", ppr: 5 * mult, half: 4 * mult, std: 3 * mult,
    car: 5 * mult, tgt: 5 * mult, tshare: 0.1, wopr: 0.2, ay: 10,
  });
  /* vikur 1-8, vika 5 er 20x. */
  const rows = [1, 2, 3, 4, 5, 6, 7, 8].map((w) => flat(w, w === 5 ? 20 : 1));
  /* Rodin i skranni er ekki naudsynlega i viku-rod — hun er STOKKUD
     her svo rodun eininginnar se raunverulega profud. */
  const shuffled = [rows[4], rows[0], rows[7], rows[2], rows[6], rows[1], rows[5], rows[3]];

  const at5all = usageToDate(shuffled, { playerId: PID, throughWeek: 5, window: "all" });
  ok(at5all != null && at5all.games === 4,
    `throughWeek 5, window all: ${at5all && at5all.games} leikir (vikur 1-4)`);
  ok(near(at5all.car, 5) && near(at5all.tgt, 5) && near(at5all.opp, 10),
    `og notkunin er OSNORTIN af viku 5 (car ${at5all.car}, opp ${at5all.opp})`);

  const at5last3 = usageToDate(shuffled, { playerId: PID, throughWeek: 5 });
  ok(at5last3.window === "last3" && at5last3.windowGames === 3 && at5last3.games === 4,
    `sjalfgefinn gluggi er last3 (${at5last3.windowGames} af ${at5last3.games} leikjum)`);
  ok(near(at5last3.opp, 10), `last3 gegnum viku 4 gefur opp ${at5last3.opp}`);

  /* OG HIN ATTIN — annars stenst fullyrdingin fyrir koda sem
     sleppir hverri rod. Vika 5 SEST vid throughWeek 6. */
  const at6all = usageToDate(shuffled, { playerId: PID, throughWeek: 6, window: "all" });
  ok(at6all.games === 5 && near(at6all.opp, (10 * 4 + 200) / 5),
    `throughWeek 6: utlaginn ER inni (opp ${at6all.opp}, 5 leikir)`);
  ok(at6all.opp > at5all.opp * 2,
    "svo profid getur raunverulega brugdist (utlaginn tvofaldar tolina og meira)");
  const at6last3 = usageToDate(shuffled, { playerId: PID, throughWeek: 6 });
  ok(near(at6last3.opp, (10 + 10 + 200) / 3),
    `og last3 gegnum viku 5 gefur opp ${at6last3.opp.toFixed(3)}`);

  /* Vikan sjalf ma ekki skekkja fjoldann heldur. */
  const at9 = usageToDate(shuffled, { playerId: PID, throughWeek: 9, window: "all" });
  ok(at9.games === 8, "throughWeek 9 telur alla atta leikina");
  const at1 = usageToDate(shuffled, { playerId: PID, throughWeek: 1, window: "all" });
  ok(at1 === null, "throughWeek 1: enginn leikur lidinn -> null");

  /* Leikmanna-sian: adrir menn i skranni mega ekki blandast inn. */
  const mixed = [...shuffled, ...rows.map((r) => ({ ...r, id: "TEST-2", car: 99, tgt: 99 }))];
  const mine = usageToDate(mixed, { playerId: PID, throughWeek: 5, window: "all" });
  ok(near(mine.opp, 10) && mine.games === 4,
    "adrir leikmenn i somu skra hafa engin ahrif");
  /* Id er borid saman sem STRENGUR — GSIS-id ("00-0034844") er ekki tala.

     HEIDARLEGT DEBET: stokkbreyting sem gerir samanburdinn LAUSAN
     (`r.id != pid`) SLAPP I GEGN, og hun a ad sleppa — hun er
     JAFNGILDUR stokkbreyttur a thessum gognum. `"00-0034844"` verdur
     `NaN` i tolulegum samanburdi svo laus jafna finnur engan falskan
     mann, og thegar baedi eru strengir er `!=` thegar strangt. Strangi
     samanburdurinn er hafdur samt (hann getur ekki brugdist thegar
     einhver setur tolulegt id i skrana) en profid a EKKI ad thykjast
     verja hann — tilbuid jadartilfelli sem enginn getur haft i
     gognunum vaeri fullyrding um ekkert. */
  const strId = usageToDate([{ ...flat(1), id: "00-0034844" }],
    { playerId: "00-0034844", throughWeek: 2, window: "all" });
  ok(strId != null && strId.games === 1, "GSIS-id (strengur med nullum) parast");

  /* MAGN, EKKI HLUTDEILD — i kodanum, ekki bara i toflunni. `tshare`
     er FAST 0,1 i thessum rodum, svo eining sem laesi hana i stad
     `car+tgt` gaefi 0,1 og felli thetta. */
  ok(near(at5all.opp, at5all.car + at5all.tgt),
    `opp == car + tgt (${at5all.opp} == ${at5all.car} + ${at5all.tgt})`);
  ok(at5all.opp > 1, "og hun er MAGN (talning), ekki hlutdeild (0..1)");
}

/* ============================================================
   5. RUSL OG NULL
   ============================================================ */
console.log("\n5. rusl-inntak: engin NaN, null thar sem thad a ad vera");
{
  const PID = "J";
  const row = (over) => ({ id: PID, week: 1, car: 5, tgt: 5, ppr: 10, half: 8, std: 6, ...over });

  ok(usageToDate(null, { playerId: PID, throughWeek: 5 }) === null, "engar radir -> null");
  ok(usageToDate([], { playerId: PID, throughWeek: 5 }) === null, "tom skra -> null");
  ok(usageToDate([row()], {}) === null, "enginn playerId -> null");
  ok(usageToDate([row()], { playerId: PID }) === null, "engin throughWeek -> null");
  ok(usageToDate([row()], { playerId: PID, throughWeek: "5" }) === null,
    "throughWeek sem strengur -> null (ekki thogul umbreyting)");
  ok(usageToDate([row()], { playerId: PID, throughWeek: 5, window: "last7" }) === null,
    "omaeldur gluggi -> null, ekki sjalfgefning i thogn");
  ok(usageToDate([row()], { playerId: "ANNAR", throughWeek: 5 }) === null,
    "leikmadur sem er ekki i skranni -> null (EKKI nullur)");

  /* Radir an viku, med rangri viku, og med viku > 18. */
  const junkWeeks = [row({ week: undefined }), row({ week: null }), row({ week: "3" }),
    row({ week: 2.5 }), row({ week: 0 }), row({ week: 19 }),
    row({ week: 1 }), row({ week: 3, car: 7, tgt: 7 })];
  const jw = usageToDate(junkWeeks, { playerId: PID, throughWeek: 10, window: "all" });
  ok(jw != null && jw.games === 2, `adeins gildar vikur telja (${jw && jw.games} af 8 rodum)`);
  ok(near(jw.opp, (10 + 14) / 2) && !Number.isNaN(jw.opp), `og opp er ${jw.opp}, ekki NaN`);

  /* Rusl i tolusvidum. */
  const junkVals = [row({ week: 1, car: "abc", tgt: 5 }), row({ week: 2, car: null, tgt: 4 }),
    row({ week: 3, car: 6, tgt: null }), row({ week: 4, car: undefined, tgt: undefined }),
    row({ week: 5, car: NaN, tgt: NaN }), row({ week: 6, car: 10, tgt: 2 })];
  const jv = usageToDate(junkVals, { playerId: PID, throughWeek: 12, window: "all", scoring: "ppr" });
  ok(jv != null, "radir med ruslsvidum gefa samt svar");
  for (const k of ["car", "tgt", "opp", "ppg"]) {
    ok(jv[k] === null || Number.isFinite(jv[k]), `${k} er tala eda null (${jv[k]}), aldrei NaN`);
  }
  ok(jv.games === 6, "allar sex radir telja i `games` (their spiladu)");
  /* Rod 4 (baedi svid vantar) gefur EKKERT opp; rod 1 (rusl i car) er
     SLEPPT fyrir opp — hun ma ekki lesast eins og "0 hlaup". */
  ok(near(jv.opp, (4 + 6 + 12) / 3),
    `opp telur adeins rodir sem eru NYTILEGAR (${jv.opp.toFixed(3)} yfir 3 rodir)`);
  ok(near(jv.car, (6 + 10) / 2) && near(jv.tgt, (5 + 4 + 2) / 3),
    `car og tgt hafa SINA talningu (car ${jv.car}, tgt ${jv.tgt.toFixed(3)})`);

  /* Radir sem eru ekki hlutir. */
  const weird = usageToDate([null, 5, "x", row({ week: 1 })],
    { playerId: PID, throughWeek: 3, window: "all" });
  ok(weird != null && weird.games === 1, "radir sem eru ekki hlutir eru slept an hruns");

  /* `ppg` tharf stigagjof — annars er hun `null`, ekki ein af thremur. */
  const noScore = usageToDate([row({ week: 1 })], { playerId: PID, throughWeek: 3, window: "all" });
  ok(noScore.ppg === null, "an `scoring` er ppg null (ppr/half/std eru THRJAR tolur)");
  const s = (sc) => usageToDate([row({ week: 1 })],
    { playerId: PID, throughWeek: 3, window: "all", scoring: sc }).ppg;
  ok(s("ppr") === 10 && s("half-ppr") === 8 && s("standard") === 6,
    `ppg les rett svid per snid (${s("ppr")} / ${s("half-ppr")} / ${s("standard")})`);

  /* NULL ER EKKI NULL: madur sem spiladi an snertingar er 0, madur sem
     spiladi ekki er null. Su munur er allt sem uppstillingin hefur. */
  const bench = usageToDate([row({ week: 1, car: 0, tgt: 0 })],
    { playerId: PID, throughWeek: 3, window: "all" });
  ok(bench != null && bench.opp === 0 && bench.games === 1,
    "spiladi an snertingar -> opp 0 (EKKI null)");
  ok(usageToDate([row({ week: 5 })], { playerId: PID, throughWeek: 3 }) === null,
    "spiladi ekki -> null (EKKI 0)");
}

/* ============================================================
   6. RAUNGOGN — 2024, GEGN SJALFSTAEDRI TALNINGU
   ============================================================ */
console.log("\n6. raungogn: data/weekly/2024.json");
{
  const rows = JSON.parse(readFileSync(path.join(DATA, "weekly", "2024.json"), "utf8"));
  ok(Array.isArray(rows) && rows.length > 5000, `${rows.length} radir lesnar`);

  /* Saquon Barkley 2024 — thekkt notkun: hann var burdarasninn i
     Philadelphia. Talan er borin vid ENDURTALNINGU sem er skrifud her,
     ekki vid tolu sem einingin skiladi sjalf. */
  const PID = "00-0034844";
  const THROUGH = 11;
  const got = usageToDate(rows, { playerId: PID, throughWeek: THROUGH, window: "all", scoring: "ppr" });
  ok(got != null, "Barkley faer svar");

  let g = 0, car = 0, tgt = 0, pts = 0;
  for (const r of rows) {
    if (r.id !== PID) continue;
    if (!(typeof r.week === "number" && r.week >= 1 && r.week <= 18)) continue;
    if (r.week >= THROUGH) continue;
    g++; car += r.car || 0; tgt += r.tgt || 0; pts += r.ppr || 0;
  }
  ok(g > 0, `endurtalning finnur ${g} leiki`);
  ok(got.games === g, `games ${got.games} == endurtalning ${g}`);
  ok(near(got.car, car / g, 1e-9), `car/leik ${got.car.toFixed(3)} == ${(car / g).toFixed(3)}`);
  ok(near(got.tgt, tgt / g, 1e-9), `tgt/leik ${got.tgt.toFixed(3)} == ${(tgt / g).toFixed(3)}`);
  ok(near(got.opp, (car + tgt) / g, 1e-9), `opp/leik ${got.opp.toFixed(3)} == ${((car + tgt) / g).toFixed(3)}`);
  ok(near(got.ppg, pts / g, 1e-9), `ppg ${got.ppg.toFixed(3)} == ${(pts / g).toFixed(3)}`);

  /* SKYNSAMLEG STAERD, ekki bara samkvaem. Fyrsta byrjunarlids-RB ber
     15-25 hlaup og 2-6 sendingar per leik; tala utan thess bils thydir
     ad svid hafi vixlast (t.d. `ay` i stad `car`). */
  ok(got.car > 15 && got.car < 25, `burdarasni hefur 15-25 hlaup/leik (${got.car.toFixed(2)})`);
  ok(got.tgt > 1 && got.tgt < 7, `og 1-7 sendingar/leik (${got.tgt.toFixed(2)})`);
  ok(got.games < THROUGH - 1, `og hann atti auda viku (${got.games} leikir fyrir viku ${THROUGH})`);

  /* Gluggarnir eru raunverulega olikir a raungognum. */
  const l3 = usageToDate(rows, { playerId: PID, throughWeek: THROUGH });
  ok(l3.windowGames === 3 && l3.games === got.games,
    `last3 notar 3 leiki en telur ${l3.games} i `.concat("`games`"));
  ok(!near(l3.opp, got.opp, 1e-6), `og gefur adra tolu (${l3.opp.toFixed(2)} vs ${got.opp.toFixed(2)})`);

  /* Vika 1: ENGINN hefur notkun. Su vika er thar sem leki myndi sjast
     staerst — og hun a ad gefa null fyrir hvern einasta mann. */
  const wk1 = rows.slice(0, 400).filter((r) => r.week === 1)
    .map((r) => usageToDate(rows, { playerId: r.id, throughWeek: 1, window: "all" }));
  ok(wk1.length > 20 && wk1.every((x) => x === null),
    `viku 1: allir ${wk1.length} fa null (engin fyrri notkun til)`);

  /* Og heil vika sidar hefur ENGINN vog. */
  ok(blendWeight(1, "ppr") === 0 && blendWeight(4, "ppr") === 0,
    "og vogin er 0 i vikum 2-5 (fjorir leikir eda faerri)");
}

/* ============================================================
   7. BLONDUNIN — ALGEBRAN OG THAD SEM VANTAR
   ============================================================ */
console.log("\n7. blondun: algebran, attin, og vorpunin sem vantar");
{
  const P = 200, TD = 15;

  ok(GAMES_IN_SEASON === 17, "arstidin er 17 leikir (sama tala og weekview deilir med)");

  /* Vog 0 -> spain OBREYTT. Thad er SVAR, ekki bilun. */
  ok(blendedSeasonProj({ seasonProj: P, scoring: "ppr", gamesPlayed: 3, toDatePerGame: TD }) === P,
    "3 leikir: spain obreytt (vogin er 0 — thad er maelda svarid)");
  ok(blendedSeasonProj({ seasonProj: P, scoring: "ppr", gamesPlayed: 3 }) === P,
    "og vorpunin er ekki einu sinni notud thar");

  /* Vog > 0 -> handreiknud blondun. */
  const w = blendWeight(10, "ppr");
  const want = (1 - w) * P + w * 17 * TD;
  const got = blendedSeasonProj({ seasonProj: P, scoring: "ppr", gamesPlayed: 10, toDatePerGame: TD });
  ok(near(got, want, 1e-9), `10 leikir: ${got.toFixed(3)} == (1-${w.toFixed(3)})*200 + ${w.toFixed(3)}*17*15`);

  /* ATTIN. Haerri notkun VERDUR ad gefa haerri tolu, og talan verdur ad
     liggja MILLI spar og notkunar-matsins — snuin vog gefur tolu utan
     bilsins og su stokkbreyting slyppi framhja "== handreiknad" ef
     formulan vaeri afritud i profid. Thess vegna er thetta profad
     serstaklega. */
  const hi = blendedSeasonProj({ seasonProj: P, scoring: "ppr", gamesPlayed: 10, toDatePerGame: 30 });
  const lo = blendedSeasonProj({ seasonProj: P, scoring: "ppr", gamesPlayed: 10, toDatePerGame: 5 });
  ok(hi > got && got > lo, `einraen i notkun (${lo.toFixed(1)} < ${got.toFixed(1)} < ${hi.toFixed(1)})`);
  ok(got > Math.min(P, 17 * TD) - 1e-9 && got < Math.max(P, 17 * TD) + 1e-9,
    `og utkoman liggur MILLI 200 og ${17 * TD} (${got.toFixed(1)})`);
  /* Vaxandi fjoldi leikja faerir toluna NAER notkuninni, ekki fjaer. */
  const seq = [6, 8, 10, 13, 17].map((k) =>
    blendedSeasonProj({ seasonProj: P, scoring: "ppr", gamesPlayed: k, toDatePerGame: 30 }));
  let rising = true;
  for (let i = 1; i < seq.length; i++) if (!(seq[i] > seq[i - 1])) rising = false;
  ok(rising, `fleiri leikir -> naer notkuninni (${seq.map((x) => x.toFixed(0)).join(" < ")})`);

  /* VORPUNIN SEM VANTAR — og hun ma ekki fyllast i thogn. */
  ok(USAGE_BLEND.mapping.available === false && USAGE_BLEND.mapping.inFile === false,
    "einingin segir berum ordum ad vorpunin se EKKI i usage.json");
  /* STADFEST GEGN SKRANNI, ekki fullyrt: leitad er ad LYKLUM (ekki
     texta — "slope" kemur fyrir i placebo-NOTU og regex a strengina
     hefdi flaggad hana og latid thetta lita ut eins og vorpunin VAERI
     thar). Finnist fitt-stika i skranni a ad BAKA hana og setja
     `mapping.available = true` — og tha fellur thetta prof, sem er
     nakvaemlega thad sem thad er til fyrir. */
  const fitKeys = [];
  (function walk(node, at) {
    if (!node || typeof node !== "object") return;
    for (const k of Object.keys(node)) {
      if (/^(fit|slope|intercept|coef|priorFit|mapFit)$/i.test(k)) fitKeys.push(`${at}.${k}`);
      walk(node[k], `${at}.${k}`);
    }
  })(LAB, "usage");
  /* ============================================================
     VORPUNIN ER KOMIN — OG THETTA VAR NAKVAEMLEGA GILDRAN SEM BEID
     ============================================================
     Hér stod `ok(fitKeys.length === 0, ...)` med theim rokum ad findist
     fitt-stika i skranni AETTI hun ad vera bokud. `usage-lab` vistar hana
     nu (`results.{snid}.priorFit`) og THETTA PROF FELL — sem var thad sem
     thad var til fyrir.

     Verktakinn sem vistadi hana NEFNDI BLOKKINA `priorFit` VILJANDI, thott
     `priorMapping` hefdi haldid safninu graenu: tha hefdi
     `USAGE_BLEND.mapping.inFile: false` ordid LYGI i `src/` medan profin
     sogdu allt i lagi. Ad velja nafnid sem fellir vordinn er retta
     akvordunin og hun er skjolud hér svo hun se ekki afturkolluð.

     Fullyrdingin snyst thvi VID: nu VERDUR fittid ad vera i skranni OG
     bokada taflan verdur ad passa vid hana, svid fyrir svid.            */
  ok(fitKeys.length > 0,
    `usage.json BER nu fitt-stiku (${fitKeys.join(", ") || "engin"})`);

  /* Bokada taflan a moti skranni — 24 tolur (4 stodur × 3 snid × a/b). */
  const labKey = { ppr: "ppr", "half-ppr": "half", standard: "standard" };
  let baked = 0, drift = [];
  for (const [ours, lab] of Object.entries(labKey)) {
    const fwd = LAB.results?.[lab]?.priorFit?.forward?.byPosition;
    ok(!!fwd, `${lab}: \`priorFit.forward.byPosition\` er i skranni`);
    if (!fwd) continue;
    for (const pos of ["QB", "RB", "WR", "TE"]) {
      const mine = PRIOR_FIT[ours]?.[pos];
      const theirs = fwd[pos];
      if (!mine || !theirs) { drift.push(`${ours}.${pos}: vantar`); continue; }
      if (Math.abs(mine.a - theirs.a) > 1e-9) drift.push(`${ours}.${pos}.a ${mine.a} != ${theirs.a}`);
      if (Math.abs(mine.b - theirs.b) > 1e-9) drift.push(`${ours}.${pos}.b ${mine.b} != ${theirs.b}`);
      baked += 2;
    }
  }
  ok(baked === 24, `24 tolur bornar saman (${baked})`);
  ok(drift.length === 0, `bokada taflan passar vid skrana (${drift.slice(0, 3).join(" · ") || "hrein"})`);

  /* ÞAD ER `forward`-FITTID SEM ER BAKAD, EKKI walk-forward.
     Appid spair 2026 thar sem OLL fyrri timabil eru thekkt; hvert
     walk-forward fit sleppir einu ari og er til fyrir maelinguna sjalfa. */
  for (const [ours, lab] of Object.entries(labKey)) {
    const on = LAB.results?.[lab]?.priorFit?.forward?.fittedOnSeasons;
    ok(Array.isArray(on) && on.length >= 6 && on[on.length - 1] === 2025,
      `${lab}: bakada fittid er fittad a ${Array.isArray(on) ? on.join("-") : "?"}`);
  }

  /* STODUGLEIKINN ER BIRTUR, EKKI THAGAD UM. `b` ma ekki skipta formerki
     i neinu walk-forward ari; gerdi hann thad vaeri vorpunin ekki vorpun. */
  for (const [ours, lab] of Object.entries(labKey)) {
    const st = LAB.results?.[lab]?.priorFit?.stability;
    if (!st) continue;
    const flips = ["QB", "RB", "WR", "TE"].filter((p) => st[p]?.bSignFlips);
    ok(flips.length === 0, `${lab}: \`b\` skiptir aldrei formerki (${flips.join(",") || "engin"})`);
  }
  /* AN `toDatePerGame` er thad ENN `null` — vorpunin er til en hun er
     INNTAK, og sa sem kallar verdur ad reikna `z` yfir laugina sina.
     `estimateFromZ` er leidin; sja `MAPPING_RISK`. */
  ok(blendedSeasonProj({ seasonProj: P, scoring: "ppr", gamesPlayed: 10 }) === null,
    "vog > 0 an mats -> null (ALDREI spain thegjandi)");
  ok(blendedSeasonProj({ seasonProj: P, scoring: "ppr", gamesPlayed: 10,
    usage: { games: 10, opp: 22, ppg: 14.5 } }) === null,
    "og `usage.ppg` er EKKI notud sem varaleid (thad er annad arm)");

  /* `usage` gefur `games` thegar `gamesPlayed` vantar. */
  const viaUsage = blendedSeasonProj({ seasonProj: P, scoring: "ppr",
    usage: { games: 10 }, toDatePerGame: TD });
  ok(near(viaUsage, want, 1e-9), "`usage.games` er notad thegar `gamesPlayed` vantar");
  ok(blendedSeasonProj({ seasonProj: P, scoring: "ppr", usage: null, toDatePerGame: TD }) === null,
    "hvorki `usage` ne `gamesPlayed` -> null (vid getum ekki svarad)");

  /* Rusl og null. */
  ok(blendedSeasonProj({ seasonProj: null, scoring: "ppr", gamesPlayed: 10, toDatePerGame: TD }) === null,
    "engin arstidar-spa -> null (NULL ER EKKI NULL)");
  ok(blendedSeasonProj({ seasonProj: "200", scoring: "ppr", gamesPlayed: 10, toDatePerGame: TD }) === null,
    "spa sem strengur -> null");
  ok(blendedSeasonProj({ seasonProj: P, scoring: "ppr", gamesPlayed: 10, toDatePerGame: "15" }) === null,
    "vorpun sem strengur -> null");
  ok(blendedSeasonProj() === null && blendedSeasonProj(null) === null,
    "engin inntok -> null, ekki hrun");
  ok(blendedSeasonProj({ seasonProj: P, scoring: "te-premium", gamesPlayed: 12,
    toDatePerGame: TD }) === P,
    "omaeld stigagjof -> spain ein (vog 0), ekki blondun");

  /* Ekkert NaN i neinni leid. */
  const all = [];
  for (const k of [null, 0, 1, 4, 5, 10, 17, "x", NaN, -1]) {
    for (const sc of ["ppr", "half-ppr", "standard", "nope", null]) {
      for (const td of [null, 0, 15, "x", NaN]) {
        all.push(blendedSeasonProj({ seasonProj: P, scoring: sc, gamesPlayed: k, toDatePerGame: td }));
      }
    }
  }
  ok(all.every((x) => x === null || (typeof x === "number" && Number.isFinite(x))),
    `${all.length} samsetningar: allar tala eda null, ekkert NaN`);
}

/* ============================================================
   8. SKJOLUNIN SJALF — HVER TALA SEGIR HVADAN HUN KEMUR
   ============================================================
   `measured`-flaggid er ekki skraut: `deadMeasured: false` er
   yfirlysing um ad daudasvidid se VAL, og ef einhver setur thad i
   `true` an maelingar er thad einmitt "omaeld tala sem litur ut eins og
   maeling" — versta utkoman i thessu repo-i.                          */
console.log("\n8. hver tala ber sinn grunn");
{
  const c = USAGE_BLEND.curve;
  ok(c.KMeasured === true && typeof c.KBasis === "string" && c.KBasis.length > 20,
    "K = 10 er MAELT og grunnurinn er skrifadur");
  ok(c.deadMeasured === false && /w1-4/.test(c.deadBasis),
    "daudasvidid er merkt OMAELT og bendir a bilid sem rettlaetir thad");
  ok(/kEff/.test(c.form), `formulan sjalf er skjolud: ${c.form}`);

  for (const f of FORMATS) {
    const s = USAGE_BLEND.shipped[f];
    ok(s.measured === true && typeof s.note === "string" && s.note.length > 40,
      `${f}: `.concat("`measured` og `note` eru baedi til"));
    ok(new RegExp(String(s.pct)).test(s.note), `${f}: notan ber SINA tolu (${s.pct})`);
    /* Snid sem naer ekki placebo-thakinu ma EKKI lesast eins og sannad.
       Sama regla og `weeklyEdgeNote`: omarktaek tala ma ekki standa ein. */
    if (!s.beatsPlaceboCeiling) {
      ok(/NOT clear|not proven|not as proven/i.test(s.note),
        `${f}: notan segir ad hun nai EKKI thakinu`);
    } else {
      ok(/clears the placebo ceiling/i.test(s.note),
        `${f}: notan segir ad hun NAI thakinu`);
    }
  }
  ok(/12\.249/.test(USAGE_BLEND.shipped.ppr.note) &&
     !/12\.249/.test(USAGE_BLEND.shipped["half-ppr"].note),
    "hvert snid ber SINA tolu, ekki somu (thad var atridid i mktweek)");

  ok(Array.isArray(USAGE_BLEND.mapping.routes) && USAGE_BLEND.mapping.routes.length === 2,
    "og vorpunin ber TVAER nefndar leidir ut, ekki \"til seinna\"");
  ok(/opp_self/.test(USAGE_BLEND.mapping.routes.join(" ")),
    "thar a medal `opp_self`, sem tharf enga bokada stika");

  /* `ptsPG`-varnaglinn: deltan sem einingin nefnir er raunverulega i
     skranni OG hun utilokar ekki null. Ad birta "notkun slaer stig" an
     thess vaeri ad selja ommarktaeka tolu. */
  for (const f of FORMATS) {
    const pv = LAB.results[USAGE_BLEND.labKey[f]].pointsVsUsage.usageMinusPoints;
    ok(pv.significant === false,
      `${f}: usage-minus-points er EKKI marktaekt (t ${pv.t}) — og einingin segir thad`);
  }
  ok(/excludes zero/i.test(USAGE_BLEND.rejected.pointsPerGame.caveat),
    "varnaglinn um `ptsPG` er skrifadur, ekki gefinn ser");
}

/* ============================================================
   VORPUNIN SJALF — `estimateFromZ`, `crossSection`, `zOf`
   ============================================================
   ÞESSI KAFLI VAR SKRIFADUR EFTIR A OG THAD ER LAERDOMURINN. Follin thrju
   voru baett i `usageblend.js` an fullyrdinga, og stokkbreytingaprof
   syndi thad umsvifalaust: **ad fjarlaegja golfid vid 0 og ad deila `sd`
   med N-1 i stad N slupu BADI I GEGN** medan 200 adrar fullyrdingar voru
   graenar. Nyr kodi an nyrra fullyrdinga er oprofadur kodi, hversu
   graent safnid er ad odru leyti.                                     */
console.log("\nvorpunin sjalf");
{
  /* --- GOLFID VID 0 ER AKVORDUN LABSINS OG VERDUR AD ENDURGERAST ---
     An thess gefur mjog negatift `z` NEGATIF stig, sem `optimalLineup`
     setur sjalfkrafa a bekk sama hvad spain segir. Þad vaeri omaeld
     hegdun sem laeddist inn med formulunni. */
  const lowRb = estimateFromZ({ pos: "RB", scoring: "ppr", z: -99 });
  ok(lowRb === 0, `golfid heldur: z = -99 gefur 0, ekki negatift (${lowRb})`);
  ok(estimateFromZ({ pos: "WR", scoring: "half-ppr", z: -50 }) === 0,
    "og i half-ppr lika");
  /* Og golfid ma EKKI klippa raunveruleg gildi. */
  const midRb = estimateFromZ({ pos: "RB", scoring: "ppr", z: 0 });
  ok(Math.abs(midRb - PRIOR_FIT.ppr.RB.a) < 1e-9,
    `z = 0 gefur skurdpunktinn sjalfan (${midRb} vs ${PRIOR_FIT.ppr.RB.a})`);
  const hiRb = estimateFromZ({ pos: "RB", scoring: "ppr", z: 2 });
  ok(Math.abs(hiRb - (PRIOR_FIT.ppr.RB.a + 2 * PRIOR_FIT.ppr.RB.b)) < 1e-9,
    `og z = 2 gefur a + 2b (${hiRb.toFixed(3)})`);
  /* Einraent hækkandi i z — halli er jakvaedur i ollum 12 fittum. */
  let mono = true;
  for (const sc of ["ppr", "half-ppr", "standard"]) {
    for (const pos of ["QB", "RB", "WR", "TE"]) {
      let prev = -Infinity;
      for (const z of [-1, -0.5, 0, 0.5, 1, 2, 3]) {
        const v = estimateFromZ({ pos, scoring: sc, z });
        if (v < prev - 1e-12) mono = false;
        prev = v;
      }
    }
  }
  ok(mono, "einraent hækkandi i z i ollum 12 fittum");

  /* --- STODUR SEM VORPUNIN VAR ALDREI MAELD FYRIR --- */
  ok(estimateFromZ({ pos: "K", scoring: "ppr", z: 1 }) === null,
    "spyrnumadur -> null (vorpunin var aldrei maeld fyrir hann)");
  ok(estimateFromZ({ pos: "DST", scoring: "ppr", z: 1 }) === null, "vorn -> null");
  ok(estimateFromZ({ pos: "RB", scoring: "te-premium", z: 1 }) === null,
    "othekkt stigagjof -> null, EKKI naesta tafla");
  for (const bad of [undefined, null, NaN, Infinity, "1", {}]) {
    ok(estimateFromZ({ pos: "RB", scoring: "ppr", z: bad }) === null,
      `ogilt z gefur null: ${JSON.stringify(bad)}`);
  }
  ok(estimateFromZ() === null, "ekkert inntak -> null, ekkert hrun");

  /* --- `sd` ER ÞYDIS-STADALFRAVIK (deilt med N, EKKI N-1) ---
     Þetta er tala sem LITUR EINS UT hvort sem er og gefur annad `z`.
     Vidmid reiknad i hendi: [2,4,4,4,5,5,7,9] hefur mu = 5 og
     thydis-sd = 2 nakvaemlega (urtaks-sd vaeri 2,138). */
  const cs = crossSection([2, 4, 4, 4, 5, 5, 7, 9]);
  ok(cs && Math.abs(cs.mu - 5) < 1e-12, `mu = 5 (${cs && cs.mu})`);
  ok(cs && Math.abs(cs.sd - 2) < 1e-12,
    `sd = 2 NAKVAEMLEGA — thydis, ekki urtaks (${cs && cs.sd})`);
  ok(cs && Math.abs(cs.sd - 2.13809) > 0.1,
    "og thad er sannanlega EKKI urtaks-sd (2,138)");
  ok(cs && cs.n === 8, `n er talid (${cs && cs.n})`);

  /* --- LAGMARKID ER 8 OG THAD ER LABSINS TALA --- */
  ok(crossSection([1, 2, 3, 4, 5, 6, 7]) === null,
    "7 gildi -> null (lagmark 8)");
  ok(crossSection([1, 2, 3, 4, 5, 6, 7, 8]) !== null, "8 gildi -> thversnid");
  ok(LAB.results?.ppr?.priorFit?.z?.minFiniteValues === 8,
    "og 8 er talan sem labid notar, ekki valin hér");

  /* --- FLOT DREIFING GEFUR EKKERT `z` --- */
  ok(crossSection([5, 5, 5, 5, 5, 5, 5, 5, 5]) === null,
    "sd ~ 0 -> null (z vaeri deiling med nulli)");
  /* Rusl er SIAD, ekki talid sem 0 — annars faerdi eitt `null` mu nidur. */
  const dirty = crossSection([2, 4, 4, 4, 5, 5, 7, 9, null, "x", NaN, undefined]);
  ok(dirty && Math.abs(dirty.mu - 5) < 1e-12 && dirty.n === 8,
    `rusl er siad, ekki talid sem 0 (n=${dirty && dirty.n}, mu=${dirty && dirty.mu})`);
  ok(crossSection(null) === null && crossSection("nope") === null,
    "rusl-inntak -> null");

  /* --- `zOf` --- */
  ok(Math.abs(zOf(7, cs) - 1) < 1e-12, `zOf(7) = 1 (mu 5, sd 2) -> ${zOf(7, cs)}`);
  ok(Math.abs(zOf(5, cs) - 0) < 1e-12, "zOf(mu) = 0");
  ok(Math.abs(zOf(1, cs) + 2) < 1e-12, "zOf(1) = -2");
  ok(zOf(7, null) === null, "ekkert thversnid -> null");
  for (const bad of [null, undefined, NaN, "7", {}]) {
    ok(zOf(bad, cs) === null, `ogilt gildi -> null: ${JSON.stringify(bad)}`);
  }

  /* --- KEDJAN FRA ENDA TIL ENDA, med raunverulegum tolum --- */
  const vals = [5, 8, 11, 14, 17, 20, 23, 26, 12, 15];
  const c2 = crossSection(vals);
  const z2 = zOf(26, c2);
  const est = estimateFromZ({ pos: "RB", scoring: "ppr", z: z2 });
  ok(c2 && z2 > 1 && est > PRIOR_FIT.ppr.RB.a,
    `haesta taekifaerid gefur mat yfir skurdpunkti (z ${z2.toFixed(2)}, est ${est.toFixed(1)})`);
  const zLow = zOf(5, c2);
  const estLow = estimateFromZ({ pos: "RB", scoring: "ppr", z: zLow });
  ok(estLow < est && estLow >= 0,
    `og laegsta gefur laegra mat, aldrei negatift (${estLow.toFixed(1)})`);

  /* --- HAND-OFF AHAETTAN VERDUR AD VERA SKRIFUD, EKKI THOGUL --- */
  ok(MAPPING_RISK && MAPPING_RISK.poolDiffers === true,
    "laugar-frávikid er MERKT, ekki thagad um");
  ok(MAPPING_RISK.measured === false,
    "og thad er merkt OMAELT (thad er ekki maelanlegt afturvirkt)");
  ok(/features\.json/.test(MAPPING_RISK.labPool) &&
     /adp/i.test(MAPPING_RISK.appPool),
    "og badar laugar eru lystar berum ordum");
}

/* ============================================================
   9. ROKSTUDNINGURINN FYRIR `DEAD_GAMES` — BORINN VID DISKINN
   ============================================================
   `CURVE.deadBasis` sagdi "const0.5: -3.9 to -8.1 pp, const0: -11.4 to
   -20.1 pp". ATTIN VAR RETT en hvorug talan var a diski: rett bil er
   -4,6 til -9,4 og -21,1 til -25,6. Sidara var VANMAT um naestum helming.

   OG SVO KOM ÞAD SEM GERIR ÞENNAN KAFLA ÞESS VIRDI: FYRSTA
   LEIDRETTINGIN MIN VAR SJALF RONG. Eg las `curveTable.ptsPG.<gluggi>`
   — sem er GLUGGINN sem notkun er maeld i og er TIMABILS-VID — fann
   `const0.5` jakvaett i 5 af 6 holfum og skrifadi ad bokada
   fullyrdingin vaeri ONDVERD vid maelinguna. Rett slod er
   `.bins["w1-4"]`, vikubilid sem fullyrdingin talar um.

   Sama villa og VBD-bokunin greiddi fyrir sama dag: tvaer RETTAR tolur
   ur sitthvoru harness, bornar saman eins og thaer vaeru sama staerd.

   ÞESS VEGNA VER ÞESSI KAFLI SLODINA, EKKI ADEINS TOLUNA. `deadClaim`
   ber `source`, `bin`, `window` og `against`, og hér er tolunum flett
   upp EFTIR THEIM SVIDUM — ekki eftir slod sem er skrifud i profid.
   Fari bokunin ad benda a annan glugga fellur thetta prof, sem er
   nakvaemlega hegdunin sem hefdi stodvad bædi villurnar.             */
console.log("\n9. rokstudningurinn fyrir `DEAD_GAMES`");
{
  const C = USAGE_BLEND.curve;
  const claim = C.deadClaim;
  ok(claim && claim.const05 && claim.const0,
    "`deadClaim` er maskinulesid, ekki adeins texti");
  for (const f of ["source", "bin", "window", "against"]) {
    ok(typeof claim[f] === "string" && claim[f].length > 2,
      `\`deadClaim.${f}\` er skrifad (${claim[f]})`);
  }
  ok(/bins/.test(claim.source) && /w1-4/.test(claim.source),
    "og `source` nefnir `bins[\"w1-4\"]` — SLODINA, ekki bara skrarheitid");

  /* Uppflettingin fer eftir bokudu svidunum. */
  const cell = (f, curve, bin) => {
    const g = LAB.results[f] && LAB.results[f].grid &&
              LAB.results[f].grid.ptsPG[claim.window];
    return g && g[curve] && g[curve].bins && g[curve].bins[bin];
  };

  let cells = 0;
  const drift = [];
  for (const f of ["ppr", "half", "standard"]) {
    for (const [key, curve] of [["const05", "const0.5"], ["const0", "const0"]]) {
      const c = cell(f, curve, claim.bin);
      if (!c) { drift.push(`${curve}/${f}: slodin finnst ekki`); continue; }
      cells++;
      if (Math.abs(claim[key][f] - c.delta) > 0.02)
        drift.push(`${curve}/${f}: bokad ${claim[key][f]} != diskur ${c.delta.toFixed(2)}`);
      const tKey = key + "T";
      if (Math.abs(claim[tKey][f] - c.t) > 0.02)
        drift.push(`${curve}/${f} t: bokad ${claim[tKey][f]} != diskur ${c.t.toFixed(2)}`);
    }
    /* Og seina bilid, sem er rokid FYRIR daudasvidinu. */
    const late = cell(f, "const0.5", "w10-18");
    if (late) {
      cells++;
      if (Math.abs(claim.const05Late[f] - late.delta) > 0.02)
        drift.push(`const0.5/w10-18/${f}: bokad ${claim.const05Late[f]} != ${late.delta.toFixed(2)}`);
    }
  }
  ok(cells === 9, `THEKJA: 9 holf lesin ur usage.json (fann ${cells})`);
  ok(drift.length === 0,
    `hvert bokad gildi ber diskinn (${drift.length} reka${
      drift.length ? ": " + drift.join(" · ") : ""})`);

  /* ALYKTANIRNAR VERDA AD FYLGJA TOLUNUM. Þad var gatid: talan var rong
     og alyktunin sem hvildi a henni var samt skrifud eins og hun stædi. */
  const early = ["ppr", "half", "standard"].map((f) => cell(f, "const0.5", claim.bin));
  ok(early.every((c) => c.delta < 0),
    `const0.5 tapar i w1-4 i OLLUM thremum snidum ` +
    `(${early.filter((c) => c.delta < 0).length}/3)`);
  ok(claim.constantBlendingHurtsEarly === true, "og flaggið segir thad sama");

  const late = ["ppr", "half", "standard"].map((f) => cell(f, "const0.5", "w10-18"));
  ok(late.every((c) => c.delta > 0),
    `en VINNUR i w10-18 i ollum thremum (${late.filter((c) => c.delta > 0).length}/3)`);
  ok(late.filter((c) => c.t >= 2).length === 3,
    `og thad er marktaekt i ollum thremum (t >= 2 i ` +
    `${late.filter((c) => c.t >= 2).length})`);
  ok(claim.constantBlendingHelpsLate === true,
    "og `constantBlendingHelpsLate` segir thad — merkid SNYST VID, " +
    "sem er malefnalega rokid fyrir daudasvidinu");

  const c0 = ["ppr", "half", "standard"].map((f) => cell(f, "const0", claim.bin));
  ok(c0.every((c) => c.delta < -20) && c0.every((c) => c.t <= -3),
    `const0 tapar meira en 20 pp i ollum thremum og marktaekt ` +
    `(minnst ${Math.max(...c0.map((c) => c.delta)).toFixed(1)} pp, ` +
    `t ${Math.max(...c0.map((c) => c.t)).toFixed(2)})`);

  /* Textinn ma ekki bera GOMLU FULLYRDINGUNA. Leitad er ad ORDALAGI,
     ekki ad tolustaf: fyrsta utgafa thessarar fullyrdingar leitadi ad
     "-3.9" og felldi lagfaeringuna sina eigin, thvi `t -3.90` er ein af
     nyju RETTU tolunum. Sama lexia og `\bNaN\b` i FPL-verkefninu. */
  for (const gone of ["-3.9 to -8.1", "-11.4 to -20.1", "0.624/2.340/1.372"]) {
    ok(!String(C.deadBasis).includes(gone),
      `\`deadBasis\` ber ekki gomlu fullyrdinguna "${gone}"`);
  }
  ok("const0.5: -3.9 to -8.1 pp".includes("-3.9 to -8.1"),
    "og leitin finnur hana se hun sett inn (maelitaekid virkar)");
  ok(/w1-4/.test(C.deadBasis),
    "`deadBasis` bendir a bilid sem rettlaetir thad (w1-4)");
  ok(/REVERSES|reverses/.test(C.deadBasis),
    "og nefnir vidsnuninginn seint a timabilinu");

  ok(C.deadMeasured === false,
    "`deadMeasured` er `false` — hvar svidid endar er val, ekki maeling");
  ok(C.KMeasured === true,
    "en `K` ER maelt og er merkt sem slikt");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
