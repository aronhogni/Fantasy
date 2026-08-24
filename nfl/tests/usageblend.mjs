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
  /* `const0` (spain hent alveg) tapar raunverulega i w1-4 — thad er
     rokid fyrir thvi ad hafa VOG a spana.

     HER STOD "talan sem rettlaetir dauda svidid i ferlinum" OG THAD VAR
     RANGT (leidrett 14.8.2026, sja kafla 9): `const0` rettlaetir vogina,
     ekki daudasvidid. `const0.5` — sem er raunverulega ferillinn an
     daudasvids — tapar EKKI i w1-4 a senda arminu. */
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
   SAMA FULLYRDING, THRJAR VILLUR. Hun er thess virdi ad rekja thvi
   hver villa slapp fram hja profinu sem atti ad na henni:

     1. "const0.5: -3.9 to -8.1 pp, const0: -11.4 to -20.1 pp" — engin
        slod, ekkert arm. Ekkert prof las hana.
     2. LEIDRETT 13.8. i `grid.ptsPG.last3...bins["w1-4"]` og THA VAR
        THESSI KAFLI SKRIFADUR — en hann harkodadi `.ptsPG` i sinni eigin
        uppflettingu. Profid sannreyndi thvi bokunina gegn NAKVAEMLEGA
        theim stad sem bokunin benti a, sem er ekki sannreyning: bæði
        bokun og prof voru a RONGU ARMI. Sent er `opp_prior`.
     3. LEIDRETT 14.8. — hér.

   ÞRIR LAERDOMAR SEM ERU BYGGDIR INN I THENNAN KAFLA:

   (a) UPPFLETTINGIN VERDUR AD FARA EFTIR BOKUDU SVIDUNUM, OG ARMID ER
       EITT AF THEIM. `deadClaim.variable` er nytt og hér er thad borid
       vid `USAGE_BLEND.arm.variable`. Prof sem tekur armid sem gefid
       getur ekki sed bokun a rangt arm — thad var gatid i utgafu 2.
   (b) MERKID ER `arm - INCUMBENT`, EKKI `arm - bayes10`. Sja
       `usage-lab.mjs` ~1290. Positift `const0.5` i w10-18 slaer thvi
       SPANA, ekki senda ferilinn; til thess tharf FRADRATT. Utgafa 2
       las merkid og skrifadi "const0.5 BEATS the bayes curve".
   (c) ÞEKJA ER FULLYRDING. Finnist holf ekki er thad FALL, ekki hlaup.

   OG SKONNUNIN A AFTURKOLLUDUM TOLUM NAER NU YFIR ALLA SKRANA.
   Fyrri utgafa skannadi ADEINS `C.deadBasis` — thess vegna lifdu thrju
   afrit: haus skrarinnar, `rejected.constantWeight.note` og tvaer
   athugasemdir. Nu er skannad `JSON.stringify(USAGE_BLEND)` (hvert
   bokad svid) OG hraan skrartexta (hver athugasemd).

   ATH UM SKONNUNINA: sagan i skranni MA nefna afturkolludu tolurnar —
   hun er skjolun a villunni. Sagan er skrifud a islensku med KOMMU
   ("3,9-8,1") og lifandi fullyrdingar a ensku med PUNKTI ("3.9-8.1"),
   svo skannad er ad punkt-forminu. Hver strengur ber sitt eigid
   sjalfsprof (maelitaekid verdur ad finna hann se hann settur inn) —
   fyrsta utgafa thessa kafla leitadi ad "-3.9" og felldi lagfaeringuna
   sina eigin, thvi `t -3.90` er ein af nyju RETTU tolunum.           */
console.log("\n9. rokstudningurinn fyrir `DEAD_GAMES`");
{
  const C = USAGE_BLEND.curve;
  const claim = C.deadClaim;
  const SRC = readFileSync(path.join(ROOT, "src", "usageblend.js"), "utf8");
  const LABF = ["ppr", "half", "standard"];
  /* Lab-lykill -> app-lykill, svo `SHIPPED` (app-lyklar) og `deadClaim`
     (lab-lyklar) geti maetst an thess ad vorpunin se harkodud tvisvar. */
  const APP = Object.fromEntries(
    Object.entries(USAGE_BLEND.labKey).map(([app, lab]) => [lab, app]));

  ok(claim && claim.const05 && claim.const0,
    "`deadClaim` er maskinulesid, ekki adeins texti");
  for (const f of ["source", "variable", "window", "bin", "lateBin", "against"]) {
    ok(typeof claim[f] === "string" && claim[f].length > 2,
      `\`deadClaim.${f}\` er skrifad (${claim[f]})`);
  }

  /* ---- (a) BOKUNIN VERDUR AD VERA A SENDA ARMINU ----
     ÞETTA ER FULLYRDINGIN SEM HEFDI STODVAD VILLU 2. Hun snyr ekki ad
     tolu heldur ad thvi HVADA MAELINGU talan er tekin ur. */
  const A = USAGE_BLEND.arm;
  ok(claim.variable === A.variable,
    `\`deadClaim.variable\` er SENDA ARMID: "${claim.variable}" == "${A.variable}"`);
  ok(claim.window === A.window,
    `og sami gluggi sem er sendur: "${claim.window}" == "${A.window}"`);
  ok(claim.shippedCurve === A.curve,
    `og `.concat(`\`shippedCurve\` er sendi ferillinn ("${claim.shippedCurve}")`));
  ok(claim.source.includes(claim.variable) && claim.source.includes(claim.window) &&
     /bins/.test(claim.source) && claim.source.includes(claim.bin),
    "`source` nefnir BREYTU, glugga og `bins[bil]` — full slod, ekki skrarheiti");
  ok(!/ptsPG/.test(claim.source),
    "og hun bendir EKKI a `ptsPG` (thad var villa 2)");

  /* ---- (b) `against` MA EKKI SEGJA "bayes10" ---- */
  ok(/incumbent/i.test(claim.against) && /NOT bayes10|not bayes10/.test(claim.against),
    "`against` segir ad merkid se gegn VIDMIDINU, ekki gegn `bayes10`");

  /* ---- UPPFLETTINGIN: EINGONGU UR BOKUDU SVIDUNUM ----
     Ekkert her nefnir breytu, glugga ne bil berum ordum. Faeri bokunin
     a annad arm faerdi hun profid MED ser — thess vegna er akkerid
     fullyrdingin her ofar (`claim.variable === A.variable`), ekki
     slodin i thessu falli. */
  const cell = (labFmt, curve, bin) => {
    const g = LAB.results?.[labFmt]?.grid?.[claim.variable]?.[claim.window];
    return g?.[curve]?.bins?.[bin] || null;
  };
  /* Senda ferilsins eigin bil — LESID UR `SHIPPED`, ekki bokad aftur. */
  const shippedBin = (labFmt, bin) =>
    USAGE_BLEND.shipped[APP[labFmt]].bins[bin];

  /* Hvert bokad trio med sinu (ferli, bili). Bætir madur trioi vid
     tofluna an thess ad setja thad hér fellur thekju-talan. */
  const BOOKED = [
    { key: "const05", tKey: "const05T", curve: "const0.5", bin: claim.bin },
    { key: "const0", tKey: "const0T", curve: "const0", bin: claim.bin },
    { key: "const05Late", tKey: "const05LateT", curve: "const0.5", bin: claim.lateBin },
  ];

  let cmp = 0;
  const drift = [], missing = [];
  for (const b of BOOKED) {
    /* BADAR ATTIR VERDA AD VERA TALDAR SEM FJARVERA, EKKI SEM HRUN:
       holf sem vantar A DISKI og trio sem vantar I BOKUNINNI. Fyrsta
       utgafa las `claim[b.key][f]` blint og HRUNDI thegar trio var
       fjarlaegt — fall, en ekki fullyrding sem segir HVAD vantar. */
    const bookedD = claim[b.key], bookedT = claim[b.tKey];
    if (!bookedD || !bookedT) {
      missing.push(`bokun vantar: deadClaim.${b.key}/${b.tKey}`);
      continue;
    }
    for (const f of LABF) {
      const c = cell(f, b.curve, b.bin);
      if (!c) { missing.push(`diskur vantar: ${b.curve}/${f}/${b.bin}`); continue; }
      if (typeof bookedD[f] !== "number" || typeof bookedT[f] !== "number") {
        missing.push(`bokun vantar snid: ${b.key}.${f}`);
        continue;
      }
      cmp++;
      if (Math.abs(bookedD[f] - c.delta) > 0.02)
        drift.push(`${b.key}/${f}: bokad ${bookedD[f]} != diskur ${c.delta.toFixed(3)}`);
      cmp++;
      if (Math.abs(bookedT[f] - c.t) > 0.02)
        drift.push(`${b.tKey}/${f}: bokad ${bookedT[f]} != diskur ${c.t.toFixed(3)}`);
    }
  }
  /* ÞEKJA ER FULLYRDING, EKKI LOGGA. 3 trio x 3 snid x (delta + t). */
  ok(missing.length === 0,
    `hvert bokad holf finnst a diski (${missing.join(", ") || "oll"})`);
  ok(cmp === 18, `THEKJA: 18 tolur bornar vid diskinn (fann ${cmp})`);
  ok(drift.length === 0,
    `hvert bokad gildi ber diskinn (${drift.length} reka${
      drift.length ? ": " + drift.join(" · ") : ""})`);

  /* ---- OG ENGIN BOKUD TALA MA SLEPPA UT UR SAMANBURDINUM ----
     Fast thak (`cmp === 18`) ver gegn tolu sem HORFUR, en ekki gegn tolu
     sem er BÆTT VID an vardar — nyr trio-reitur i `deadClaim` vaeri
     obundinn diskinum og gaeti verid hvad sem er. Þetta er sama villa og
     "talid sem hlutfall, ekki fast thak" i FPL-verkefninu.

     Trio-reitir eru LEIDDIR UT ur hlutnum (hvert svid sem ber tolu fyrir
     oll thrju snidin), ekki taldir upp — handskrifadur listi myndi
     stadna nakvaemlega eins og bokunin sjalf gerdi. */
  const trioFields = Object.keys(claim).filter((k) => {
    const v = claim[k];
    return v && typeof v === "object" && !Array.isArray(v) &&
      LABF.every((f) => typeof v[f] === "number");
  });
  const covered = new Set(BOOKED.flatMap((b) => [b.key, b.tKey]));
  const uncovered = trioFields.filter((k) => !covered.has(k));
  ok(trioFields.length >= 6,
    `THEKJA: ${trioFields.length} tolu-trio i \`deadClaim\` (${trioFields.join(", ")})`);
  ok(uncovered.length === 0,
    `og hvert eitt er i \`BOOKED\` og thvi borid vid diskinn ` +
    `(oborin: ${uncovered.join(", ") || "engin"})`);

  /* ---- SENDI FERILLINN LIKA, UM SOMU UPPFLETTINGU ----
     `SHIPPED[...].bins` er thegar borid vid diskinn i kafla 1 gegnum
     `ARM`; hér er thad gert AFTUR gegnum `claim`-svidin, svo trioin i
     `note`/`deadBasis` (sem eru BYGGD ur `SHIPPED`) hangi a sama akkeri. */
  let scmp = 0;
  for (const f of LABF) {
    for (const bin of [claim.bin, claim.lateBin]) {
      const disk = cell(f, claim.shippedCurve, bin);
      ok(!!disk, `sendi ferillinn ${f}/${bin} er a diski`);
      if (!disk) continue;
      scmp++;
      ok(Math.abs(shippedBin(f, bin).delta - disk.delta) < 0.02 &&
         Math.abs(shippedBin(f, bin).t - disk.t) < 0.02,
        `${f}/${bin}: bokad ${shippedBin(f, bin).delta} (t ${shippedBin(f, bin).t}) ` +
        `== diskur ${disk.delta} (t ${disk.t})`);
    }
  }
  ok(scmp === 6, `THEKJA: 6 holf senda ferilsins (fann ${scmp})`);

  /* ---- ALYKTANIRNAR VERDA AD FYLGJA TOLUNUM ----
     ÞAD VAR GATID I OLLUM THREMUR UMFERDUM: talan var endurbokud en
     alyktunin sem hvildi a henni stod obreytt. Hvert flagg er hér
     REIKNAD ur diskinum og borid vid bokunina. */
  const early = LABF.map((f) => cell(f, "const0.5", claim.bin));
  const hurtsEarly = early.every((c) => c.delta < 0);
  ok(hurtsEarly === false,
    `const0.5 tapar EKKI i w1-4 i ollum thremur (tapar i ` +
    `${early.filter((c) => c.delta < 0).length}/3: ` +
    `${early.map((c) => c.delta.toFixed(2)).join(" / ")})`);
  ok(claim.constantBlendingHurtsEarly === hurtsEarly,
    `og flaggid segir thad sama (${claim.constantBlendingHurtsEarly})`);
  ok(early.every((c) => Math.abs(c.t) < 2),
    `og ekkert holfid er marktaekt (|t| ` +
    `${early.map((c) => Math.abs(c.t).toFixed(2)).join(" / ")})`);

  /* SEINA BILID — OG HER ER FRADRATTURINN, sem er atridid i (b).
     Positift gegn vidmidinu er EKKI "slaer senda ferilinn". */
  const late = LABF.map((f) => cell(f, "const0.5", claim.lateBin));
  ok(late.every((c) => c.delta > 0),
    `const0.5 er positift i w10-18 gegn VIDMIDINU i ollum thremum ` +
    `(${late.map((c) => c.delta.toFixed(2)).join(" / ")})`);
  const beatsLate = LABF.map((f) =>
    cell(f, "const0.5", claim.lateBin).delta - shippedBin(f, claim.lateBin).delta);
  ok(beatsLate.filter((d) => d > 0).length === 1,
    `en gegn SENDA FERLINUM slaer hun adeins EITT snid ` +
    `(${beatsLate.map((d) => d.toFixed(2)).join(" / ")})`);
  const helpsLate = beatsLate.every((d) => d > 0);
  ok(claim.constantBlendingHelpsLate === helpsLate && helpsLate === false,
    "`constantBlendingHelpsLate` er `false` — vidsnuningurinn var " +
    "maelikvarda-villa, ekki merki");
  for (const f of LABF) {
    const d = cell(f, "const0.5", claim.lateBin).delta - shippedBin(f, claim.lateBin).delta;
    ok(claim.beatsShippedCurveLate[f] === (d > 0),
      `${f}: \`beatsShippedCurveLate\` ${claim.beatsShippedCurveLate[f]} == (${d.toFixed(2)} > 0)`);
    const e = cell(f, "const0.5", claim.bin).delta - shippedBin(f, claim.bin).delta;
    ok(claim.beatsShippedCurveEarly[f] === (e > 0),
      `${f}: \`beatsShippedCurveEarly\` ${claim.beatsShippedCurveEarly[f]} == (${e.toFixed(2)} > 0)`);
  }
  ok(claim.armDiffHasNoInterval === true,
    "og fradratturinn er merktur PUNKTMAT — skran ber engin vikmork " +
    "fyrir arm-gegn-armi");

  /* `const0` ER hid raunverulega rok fyrir thvi ad hafa VOG. Talan er
     11,4-19,7 a senda arminu — ekki 21,1-25,6 (`ptsPG`) og ekki
     11,4-20,1 (upphaflega, sem var RETT bil a thessu armi). */
  const c0 = LABF.map((f) => cell(f, "const0", claim.bin));
  ok(c0.every((c) => c.delta < -10),
    `const0 tapar meira en 10 pp i ollum thremum ` +
    `(${c0.map((c) => c.delta.toFixed(1)).join(" / ")})`);
  ok(c0.filter((c) => c.t <= -2).length === 2,
    `og er marktaekt i TVEIMUR af thremur, ekki ollum ` +
    `(t ${c0.map((c) => c.t.toFixed(2)).join(" / ")})`);
  ok(claim.const0RejectedEarly === undefined ||
     USAGE_BLEND.rejected.constantWeight.const0RejectedEarly === true,
    "og `rejected.constantWeight` merkir `const0` sem thad sem er hafnad");
  ok(USAGE_BLEND.rejected.constantWeight.const05RejectedEarly === false,
    "en EKKI `const0.5` — hun var afturkollud 14.8.");

  /* ---- KOSTNADUR DAUDA SVIDSINS, REIKNADUR UR DISKINUM ----
     Svidid nullar `w1-4` (k = 0..3), svo thad fleygir w1-4-delta senda
     ferilsins. Se eitthvad af thvi MARKTAEKT JAKVAETT er svidid ekki
     "innan jafnteflis-bands" heldur maelanlegur kostnadur. */
  const disc = LABF.map((f) => shippedBin(f, claim.bin));
  const sigPos = LABF.filter((f, i) => disc[i].delta > 0 && disc[i].t >= 2);
  ok(sigPos.length >= 1,
    `daudasvidid fleygir MARKTAEKT JAKVAEDU merki i ${sigPos.length} sniði ` +
    `(${sigPos.join(",")}: ${disc.map((d) => `${d.delta}/t${d.t}`).join(" · ")})`);
  ok(claim.deadZoneDiscardsShippedGain === true &&
     claim.evidenceSupportsDeadZone === false,
    "og bokunin segir thad berum ordum: maelingin stydur EKKI svidid");
  ok(USAGE_BLEND.labKey[claim.deadZoneDiscardsSignificantGain] === sigPos[0],
    `og nefnir RETTA snidid ("${claim.deadZoneDiscardsSignificantGain}" -> ` +
    `"${sigPos[0]}")`);
  ok(typeof claim.recommendation === "string" &&
     /DEAD_GAMES = 0/.test(claim.recommendation) &&
     /NOT CHANGED|not changed/.test(claim.recommendation),
    "tillagan er skrifud OG thad er sagt ad talan se EKKI breytt");
  /* OG TALAN ER RAUNVERULEGA OBREYTT. Tillaga sem er komin i kodann
     thegjandi vaeri verri en engin tillaga. */
  ok(C.DEAD_GAMES === 4,
    "`DEAD_GAMES` er OBREYTT (4) — tillagan tharf maelingu, ekki commit");
  ok(C.deadMeasured === false,
    "`deadMeasured` er `false` — nu af RETTRI astaedu (val sem gognin " +
    "benda gegn), ekki \"val innan jafnteflis\"");
  ok(C.KMeasured === true,
    "en `K` ER maelt og er merkt sem slikt");

  /* ---- TRIOIN I TEXTANUM ERU BORIN VID DISKINN ----
     `USAGE_BLEND.note` bar "+12.3/+12.1/+9.0" thar sem MIDJUTALAN var ur
     odru holfi (`opp_prior · jump · const0.5` = 12,142) medan senda armid
     gefur 10,182. Trioid er nu BYGGT ur `SHIPPED`, en thad ma ekki verja
     sig sjalft — hér er thad LESID UR TEXTANUM og borid vid diskinn. */
  const trioIn = (s, tag) => {
    const m = String(s).match(new RegExp(`${tag}[^(]*\\(([+-][\\d.]+/[+-][\\d.]+/[+-][\\d.]+)`));
    return m ? m[1].split("/").map(Number) : null;
  };
  const lateTrio = trioIn(USAGE_BLEND.note, "weeks 10-18");
  ok(!!lateTrio && lateTrio.length === 3,
    `\`note\` ber w10-18 trio (${lateTrio ? lateTrio.join("/") : "FANN EKKERT"})`);
  if (lateTrio) {
    const want = LABF.map((f) => cell(f, claim.shippedCurve, claim.lateBin).delta);
    ok(lateTrio.every((v, i) => Math.abs(v - want[i]) < 0.06),
      `og hvert gildi er senda armsins eigid (${lateTrio.join("/")} vs ` +
      `${want.map((v) => v.toFixed(1)).join("/")})`);
    ok(Math.abs(lateTrio[1] - 12.142) > 0.5,
      `og midjutalan er EKKI toppholf half (12,1) heldur ${lateTrio[1]}`);
  }
  const earlyTrio = trioIn(USAGE_BLEND.note, "weeks 1-4");
  ok(!!earlyTrio, `\`note\` ber w1-4 trio (${earlyTrio ? earlyTrio.join("/") : "FANN EKKERT"})`);
  if (earlyTrio) {
    const want = LABF.map((f) => cell(f, claim.shippedCurve, claim.bin).delta);
    ok(earlyTrio.every((v, i) => Math.abs(v - want[i]) < 0.06),
      `og thau eru senda armsins (${earlyTrio.join("/")})`);
  }
  ok(!/is nothing in weeks 1-4/.test(USAGE_BLEND.note),
    "`note` segir EKKI LENGUR \"nothing in weeks 1-4\" (half er marktaekt thar)");

  /* OG FRADRATTAR-TRIOIN I `deadBasis` — thau eru KJARNI leidrettingar (b),
     svo thau eru lesin AF TEXTANUM og borin vid diskinn eins og allt annad.
     `subtracting the two gives X / Y / Z` og `in w1-4 ... is X / Y / Z`. */
  const diffIn = (tag) => {
    const m = String(C.deadBasis).match(
      new RegExp(`${tag}\\s*([+-][\\d.]+ / [+-][\\d.]+ / [+-][\\d.]+)`));
    return m ? m[1].split(" / ").map(Number) : null;
  };
  for (const [tag, bin] of [["subtracting the two gives", claim.lateBin],
                            ["the same subtraction is", claim.bin]]) {
    const got = diffIn(tag);
    ok(!!got && got.length === 3,
      `\`deadBasis\` ber fradrattar-trio fyrir ${bin} (${got ? got.join(" / ") : "FANN EKKERT"})`);
    if (!got) continue;
    const want = LABF.map((f) =>
      cell(f, "const0.5", bin).delta - shippedBin(f, bin).delta);
    ok(got.every((v, i) => Math.abs(v - want[i]) < 0.011),
      `og hvert gildi er `.concat(
        `\`const0.5 - ${claim.shippedCurve}\` ur diskinum ` +
        `(${got.join(" / ")} vs ${want.map((v) => v.toFixed(2)).join(" / ")})`));
    /* OG THAD MA EKKI VERA HRAA `bins`-TALAN — thad var villan. */
    const raw = LABF.map((f) => cell(f, "const0.5", bin).delta);
    ok(got.some((v, i) => Math.abs(v - raw[i]) > 0.5),
      `og thad er EKKI hraa delta-gegn-vidmidi talan (${raw.map((v) => v.toFixed(2)).join(" / ")})`);
  }

  /* ---- AFTURKOLLUDU TOLURNAR: BOKUD SVID **OG** HRAR SKRARTEXTI ----
     Fyrri utgafa skannadi ADEINS `deadBasis` og thess vegna lifdu thrju
     afrit annars stadar i skranni. */
  const BLOB = JSON.stringify(USAGE_BLEND);

  /* TVEIR LISTAR OG SKILIN MILLI THEIRRA ERU MAELD, EKKI VALIN.
     Fyrsta utgafa thessarar skonnunar setti allt i EINN lista og FELL —
     a sjalfri skjoluninni: sagan hér i skranni VERDUR ad geta nefnt
     ranga slodina og ranga `against`-textann, annars er ekki haegt ad
     skrifa nidur hvad var rangt. Sama gildra og "-3.9" i utgafu 2.

     TOLU-FULLYRDING (`CLAIMS`) er BONNUD ALLS STADAR: hun er
     rokstudningur, og rokstudningur i athugasemd er einmitt thad sem
     lifdi thrjar umferdir. Sagan nefnir thaer a islensku med KOMMU.

     KENNI-STRENGUR (`IDENT`) — slod eda merkimidi — er bannadur i
     LIFANDI SVIDUM (`BLOB`) en leyfdur i sogunni, thvi hann ER heitid a
     villunni. Ahaettan sem hann ber er thegar vardud berum ordum ofar:
     `!/ptsPG/.test(claim.source)` og `against`-fullyrdingin.           */
  const CLAIMS = [
    "3.9-8.1", "-3.9 to -8.1",          // upphaflega const0.5-bilid
    "11.4-20.1", "-11.4 to -20.1",      // upphaflega const0-bilid
    "4.6-9.4", "-4.6 to -9.4",          // ptsPG "leidrettingin"
    "21.1-25.6", "-21.1 to -25.6",      // ptsPG "leidrettingin"
    "+7.96", "+8.21", "+6.02",          // ptsPG w10-18 tolurnar
    "+12.3/+12.1",                      // blandada `note`-trioid
  ];
  const IDENT = [
    "bayes10 (the shipped curve)",      // ranga `against`
    "grid.ptsPG.last3",                 // ranga slodin
  ];
  for (const gone of CLAIMS) {
    ok(!BLOB.includes(gone), `ekkert bokad svid ber "${gone}"`);
    ok(!SRC.includes(gone),
      `og hun er hvergi i `.concat(`\`src/usageblend.js\` heldur ("${gone}")`));
    /* MAELITAEKID VERDUR AD FINNA HANA SE HUN SETT INN. Neikvaed
       fullyrding an thessa er einskis virdi (CLAUDE.md 5b regla 2). */
    ok(`x ${gone} y`.includes(gone), `og leitin finnur hana se hun sett inn`);
  }
  for (const gone of IDENT) {
    ok(!BLOB.includes(gone), `ekkert LIFANDI svid ber "${gone}"`);
    ok(`x ${gone} y`.includes(gone), `og leitin finnur hana se hun sett inn`);
    /* OG SAGAN NEFNIR HANA — annars er skjolunin horfin. */
    ok(SRC.includes(gone),
      `en sagan i skranni NEFNIR hana (annars er villan oskjolud)`);
  }
  /* OG SAGAN MA NEFNA THAER — a islensku med KOMMU. Se sagan horfin er
     skjolunin horfin, og tha er villan opin fyrir fjordu umferd. */
  ok(SRC.includes("3,9-8,1") && SRC.includes("11,4-20,1"),
    "en SAGAN nefnir upphaflegu tolurnar (komma-form) — skjolunin stendur");
  ok(/ptsPG/.test(SRC) && /villa 2|VILLAN A SOMU|ANNAD ARM/.test(SRC),
    "og hun nefnir ad `ptsPG` var RANGA ARMID");

  ok(/w1-4/.test(C.deadBasis), "`deadBasis` nefnir bilid (w1-4)");
  ok(/DOES NOT SUPPORT|does not support/.test(C.deadBasis),
    "og segir berum ordum ad maelingin stydji svidid EKKI");
  ok(/METRIC ERROR|metric error/.test(C.deadBasis),
    "og ad vidsnuningurinn seint hafi verid maelikvarda-villa");
}

/* ============================================================
   10. FITTIN ERU TALIN, EKKI REIKNUD
   ============================================================
   `usageblend.js` sagdi "0 af 72 fittum". 4 stodur x 3 snid x 6 ar = 72
   er RETTUR REIKNINGUR og RANGT SVAR: TE hefur adeins 5 fit i hverju
   sniði thvi `accFit` skilar `null` undir `minN: 200` uppsofnudum
   leikmanna-vikum, og TE naer thvi ekki thegar 2020 er haldid ut.
   Retta talan er 69.

   ÞAD SEM ÞETTA ER RAUNVERULEGA UM: `null` VERDUR AD TELJAST SEM
   FJARVERA. Hefdi labid skrifad `{a: 0, b: 0}` i stad `null` vaeri talan
   72 og fullyrdingin "b skiptir aldrei formerki" hefdi verid STYRKT af
   holfi sem var aldrei fittad — "omaeld tala sem litur ut eins og
   maeling". `minNNote` a diski varar vid thessu berum ordum.

   Þess vegna TELUR thetta prof fittin ur skranni. Fullyrding sem reiknar
   ut vaentan fjolda getur ekki sed thegar holf vantar.               */
console.log("\n10. fittin eru talin ur skranni, ekki reiknud");
{
  let total = 0, flips = 0, negative = 0, cells = 0;
  const perFormat = {};
  for (const f of ["ppr", "half", "standard"]) {
    const st = LAB.results[f] && LAB.results[f].priorFit &&
               LAB.results[f].priorFit.stability;
    ok(!!st, `${f}: \`priorFit.stability\` er i skranni`);
    if (!st) continue;
    perFormat[f] = {};
    for (const [pos, v] of Object.entries(st)) {
      cells++;
      total += v.fits;
      perFormat[f][pos] = v.fits;
      if (v.bSignFlips) flips++;
      negative += v.bNegative;
      /* `fits` verdur ad passa vid lengd `heldOutSeasons` — annars er
         talan sjalf ekki i samraemi vid thad sem hun telur. */
      ok(v.fits === (v.heldOutSeasons || []).length,
        `${f}/${pos}: fits ${v.fits} == heldOutSeasons ` +
        `${(v.heldOutSeasons || []).length}`);
    }
  }
  ok(cells === 12, `THEKJA: 12 holf (4 stodur x 3 snid), fann ${cells}`);
  ok(total === 69,
    `fit alls ${total} — TALID, ekki reiknad (4x3x6 = 72 er rangt svarid)`);
  ok(total !== 72,
    "og thad er EKKI 72 — TE ber 5 fit, ekki 6, i hverju sniði");
  for (const f of ["ppr", "half", "standard"]) {
    ok(perFormat[f] && perFormat[f].TE === 5,
      `${f}: TE ber 5 fit (minN 200 naest ekki thegar 2020 er haldid ut)`);
  }
  ok(flips === 0, `og \`b\` skiptir aldrei formerki (${flips} holf)`);
  ok(negative === 0, `og er aldrei negatift (${negative} fit)`);

  /* Og textinn verdur ad bera TOLUNA sem er talin. */
  const src = readFileSync(path.join(ROOT, "src", "usageblend.js"), "utf8");
  ok(src.includes(`0 af **${total}** fittum`) || src.includes(`0 af ${total} fittum`),
    `athugasemdin i \`usageblend.js\` ber toluna ${total}`);
  ok(!/0 af 72 fittum/.test(src),
    "og ekki gomlu reiknudu toluna 72");
}

/* ============================================================
   11. VIRINN SJALFUR — `usagePool` -> `weekRows`
   ============================================================
   Kaflar 1-10 profa EININGUNA. Hun var rett i tvo vikur og var samt
   ekki kollud ur `src/` — nakvaemlega su bilun sem `lineups.json` er
   nefnd fyrir i FPL-verkefninu: "kodinn og verdirnir eru komnir" er
   EKKI sama og "talan lendir a skjanum".

   TVAER FULLYRDINGAR SEM VERDA BADAR AD VERA TIL, og hvorug dugar ein:
     · A: an vikuskrar er utkoman BAETIS-EINS og gamla `r.proj / 17`.
     · B: MED vikuskra HREYFAST tolurnar raunverulega.
   An B vaeri A stodust af kода sem hendir `usage` og gerir ekkert —
   thad er tom fullyrding (5b regla 2). An A gaeti virinn breytt
   forleiknum thegjandi, sem er thad sem hann ma ALDREI gera.
   ============================================================ */
console.log("\n11. virinn: usagePool -> weekRows");
{
  const { weekRows } = await import("../src/weekview.js");
  const { usagePool, blendedFor } = await import("../src/usageblend.js");

  const players = JSON.parse(readFileSync(path.join(DATA, "players.json"), "utf8"));
  const plist = Array.isArray(players) ? players : (players.players || []);
  /* Radir eins og `buildRows` skilar their: adp + proj + gsisId + pos. */
  const rows = plist
    .filter((p) => p && p.gsisId && p.pos && p.adpSleeper != null && p.projSleeper != null)
    .map((p) => ({ id: p.id, gsisId: p.gsisId, name: p.name, pos: p.pos, team: p.team,
                   adp: p.adpSleeper, proj: p.projSleeper, avail: 1, bye: null, injury: null }));
  ok(rows.length > 100, `${rows.length} radir med badi adp og proj (laugin)`);

  const roster = rows.slice(0, 40);

  /* ---- A. FORLEIKUR: engin vikuskra -> BAETIS-EINS ---- */
  const preNo   = weekRows(roster, null);
  const preNull = weekRows(roster, null, null);
  const poolNone = usagePool({ weeklyRows: null, throughWeek: 5, scoring: "ppr", rows });
  ok(poolNone === null, "engin vikuskra -> `usagePool` skilar null (ekki tomt mot)");
  const preUndef = weekRows(roster, null, poolNone);
  ok(JSON.stringify(preNo) === JSON.stringify(preNull),
     "A: `weekRows(r, ctx)` og `weekRows(r, ctx, null)` eru BAETIS-EINS");
  ok(JSON.stringify(preNo) === JSON.stringify(preUndef),
     "A: og eins med null-laug — forleikurinn hreyfist ekki um einn bæti");

  /* Og talan er RETT gamla talan, ekki bara stodug. */
  const anyProj = preNo.find((x) => x.proj != null);
  const src0 = roster.find((r) => r.id === anyProj.id);
  ok(near(anyProj.proj, src0.proj / 17, 1e-12),
     "A: og hun er nakvaemlega `proj / 17`");

  /* ---- B. MED VIKUSKRA: tolurnar HREYFAST ---- */
  /* 2026 er ekki spilad, svo profid keyrir 2025-skrana i gegnum sama
     vir. Thad er ekki afrit af neinu: thad er SAMA fallid, sama laug,
     sami lykill — adeins arid er annad. */
  const wk2025 = JSON.parse(readFileSync(path.join(DATA, "weekly", "2025.json"), "utf8"));
  const pool = usagePool({ weeklyRows: wk2025, throughWeek: 12, scoring: "ppr", rows });
  ok(pool != null, "B: laug byggd ur data/weekly/2025.json");
  ok(pool.estimated > 20, `B: ${pool.estimated} leikmenn fa mat (vorpun til)`);

  const live = weekRows(roster, null, pool);
  let moved = 0, same = 0;
  for (let i = 0; i < roster.length; i++) {
    if (live[i].proj == null || preNo[i].proj == null) continue;
    if (Math.abs(live[i].proj - preNo[i].proj) > 1e-9) moved++; else same++;
  }
  ok(moved > 0, `B: ${moved} radir HREYFAST (og ${same} ekki) — virinn er lifandi`);

  /* ---- C. LYKILLINN ER `gsisId`, EKKI `id` ---- */
  /* Talid SJALFSTAETT: hve margir i lauginni eiga rod i vikuskranni
     fyrir viku < 12. Vaeri lyklad a Sleeper-`id` vaeri thetta 0 og
     kafli B felli — en `moved > 0` eitt gaeti stadist af tilviljun ef
     einhver onnur grein hreyfdi toluna, svo talan er borin lika. */
  const gsisSeen = new Set();
  for (const r of wk2025) if (r && Number(r.week) < 12) gsisSeen.add(String(r.id));
  const expect = rows.filter((r) => gsisSeen.has(String(r.gsisId))).length;
  ok(pool.byGsis.size === expect,
     `C: ${pool.byGsis.size} pardir = sjalfstaed talning ${expect} (lykillinn er gsisId)`);
  ok(expect > 100, `C: og talan er raunveruleg (${expect}), ekki 0`);

  /* Stokkbreytingin sjalf: lykladu a `id` og C VERDUR ad falla. */
  const byWrongKey = rows.filter((r) => gsisSeen.has(String(r.id))).length;
  ok(byWrongKey === 0,
     `C: og Sleeper-\`id\` finnur ENGAN i vikuskranni (${byWrongKey}) — lyklarnir eru olikir`);

  /* ---- D. `projSleeper` ER THEIRRA TALA OG BLANDAST ALDREI ---- */
  let sleeperMoved = 0;
  for (let i = 0; i < roster.length; i++) {
    if (live[i].projSleeper == null) continue;
    if (Math.abs(live[i].projSleeper - roster[i].proj / 17) > 1e-12) sleeperMoved++;
  }
  ok(sleeperMoved === 0,
     "D: `projSleeper` er obreytt `proj / 17` i BADUM tilfellum — okkar leidretting lekur ekki i theirra dalk");
  ok(moved > 0 && sleeperMoved === 0,
     "D: og dalkarnir tveir eru thar med raunverulega OLIKIR (samanburdurinn heldur)");

  /* ---- E. FALLID I SPANA, ALDREI I 0 ---- */
  const ghost = { id: "zz", gsisId: "00-9999999", pos: "WR", proj: 170, adp: 50 };
  ok(blendedFor(pool, ghost) === 170,
     "E: madur sem finnst ekki i vikuskranni heldur arstidar-spanni sinni (ekki 0, ekki null)");
  const kicker = { id: "zk", gsisId: [...gsisSeen][0], pos: "K", proj: 140, adp: 200 };
  ok(blendedFor(pool, kicker) === 140,
     "E: stada an vorpunar (K) heldur spanni sinni — `PRIOR_FIT` naer ekki yfir hana");
  ok(blendedFor(pool, { id: "x", gsisId: "00-0023459", pos: "QB", proj: null }) === null,
     "E: engin spa -> null, ekki tala ur engu");

  /* ---- F. OMAELD STIGAGJOF FAER ENGA LAUG ---- */
  ok(usagePool({ weeklyRows: wk2025, throughWeek: 12, scoring: "superflex-ppr", rows }) === null,
     "F: stigagjof sem `PRIOR_FIT` hefur ekki -> null, ekki naesta snid");
  ok(usagePool({ weeklyRows: wk2025, throughWeek: null, scoring: "ppr", rows }) === null,
     "F: engin vika -> null");
  ok(usagePool({ weeklyRows: wk2025, throughWeek: 12, scoring: "ppr", rows: [] }) === null,
     "F: engar radir -> null");

  /* ---- G. LEKINN, GEGNUM VIRINN ---- */
  /* Kafli 4 ver `usageToDate`. Hér er sama krafa a HEILU leidinni:
     vika 1 hefur engar fyrri vikur, svo engin blondun getur ordid. */
  const w1 = usagePool({ weeklyRows: wk2025, throughWeek: 1, scoring: "ppr", rows });
  ok(w1 === null, "G: vika 1 -> engin fyrri vika -> null (og thar med baetis-eins)");
  const w1rows = weekRows(roster, null, w1);
  ok(JSON.stringify(w1rows) === JSON.stringify(preNo),
     "G: og vika 1 er thar med BAETIS-EINS vid forleikinn");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
