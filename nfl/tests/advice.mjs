/* ============================================================
   nfl-advice.mjs — ver LEIDINA FRA TOLUM AD AKVORDUN.

   Kafli 5 er sa sem skiptir mali og hann ver NEIKVAEDA nidurstodu:
   rodun eftir bradanauðsyn var maeld og hun TAPAR, svo `recommend`
   VERDUR ad rada eftir VBD. Vaeri thvi snuid vid — sem er freistandi,
   thvi hugmyndin hljomar rett — myndi appid byrja ad rada verr an
   thess ad nokkud brotni.
   ============================================================ */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  survivalProb, normalCdf, defaultSd, expectedBestAt, picksUntilNext,
  recommend, SD_K, MEASURED, nextOwnPick, NEED_K, startableSlots, needPenalty,
} from "../src/advice.js";

const DATA = path.resolve(new URL(".", import.meta.url).pathname, "..", "data");
let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const near = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m} (${a} ~ ${b})`);

/* ---------- 1. NORMALDREIFING ---------- */
console.log("\n1. normaldreifing");
{
  near(normalCdf(0), 0.5, 1e-6, "F(0) = 0,5");
  near(normalCdf(1.96), 0.975, 1e-4, "F(1,96) = 0,975");
  near(normalCdf(-1.96), 0.025, 1e-4, "F(-1,96) = 0,025");
  ok(normalCdf(6) > 0.999999 && normalCdf(-6) < 1e-6, "halarnir metta rett");
  /* Samhverfa — vaeri hun rofin skekktust allar lifunarlikur i adra att. */
  for (const z of [0.3, 1.1, 2.4]) {
    near(normalCdf(z) + normalCdf(-z), 1, 1e-6, `samhverfa vid z=${z}`);
  }
}

/* ---------- 2. LIFUNARLIKUR ---------- */
console.log("\n2. lifunarlikur");
{
  /* Vid sitt eigid ADP eiga likurnar ad vera naerri 0,5. */
  near(survivalProb(30, 8, 30), 0.5, 0.05, "vid eigid ADP eru likurnar ~0,5");
  ok(survivalProb(30, 8, 10) > 0.99, "langt a undan ADP: nanast oruggur");
  ok(survivalProb(30, 8, 60) < 0.01, "langt eftir ADP: nanast farinn");

  /* DREIFINGIN SKIPTIR MALI — thad er allur tilgangurinn. */
  const tight = survivalProb(30, 3, 40);
  const wide = survivalProb(30, 20, 40);
  ok(wide > tight,
    `sami ADP, meiri dreifing -> meiri von (${wide.toFixed(3)} > ${tight.toFixed(3)})`);
  ok(tight < 0.01, "throngt ADP i 10 saeta bid er nanast vonlaust");

  ok(survivalProb(null, 5, 10) === null, "an ADP -> null, ekki agiskun");
  for (const p of [1, 50, 200]) {
    const v = survivalProb(40, null, p);
    ok(v >= 0 && v <= 1, `an sd faest gild tala vid val ${p} (${v.toFixed(3)})`);
  }

  /* Einhalft: likur mega ALDREI vaxa thegar bedid er lengur. */
  let prev = 1;
  for (let p = 1; p <= 120; p += 5) {
    const v = survivalProb(40, 10, p);
    ok(v <= prev + 1e-9, `einraen vid val ${p}`);
    prev = v;
  }
}

/* ---------- 3. SD-REGLAN ---------- */
console.log("\n3. sd-reglan");
{
  /* MAELT: k = 1,082 a 1.882 leikmanna-arum. Fyrsta utgafan setti
     0,55 — helming — sem hefdi latid alla lita ut fyrir ad vera
     oruggari en their eru. */
  ok(Math.abs(SD_K - MEASURED.sdRuleFitted) < 0.05,
    `fastinn i kodanum (${SD_K}) er vid mælda gildid (${MEASURED.sdRuleFitted})`);
  ok(SD_K > 0.8, "og hann for ekki aftur i 0,55");
  ok(defaultSd(100) > defaultSd(25), "dreifing vex med ADP");
  ok(defaultSd(1) >= 2, "golf svo ofsatolur springi ekki");
}

/* ---------- 4. SNAKK-RODIN ---------- */
console.log("\n4. hvenaer velur thu naest?");
{
  /* 12-lida snakk. Saeti 1: val 1, sidan 24 -> bidur 23.
     Saeti 12: val 12, sidan 13 -> bidur 1. */
  ok(picksUntilNext(1, 12) === 23, "saeti 1 bidur 23 val");
  ok(picksUntilNext(12, 12) === 1, "saeti 12 bidur 1 val");
  ok(picksUntilNext(6, 12) === 13, "saeti 6 bidur 13 val");
  /* SNUNINGSPUNKTURINN: saeti 12 velur TVISVAR I ROD (val 12 og 13)
     og sidan ekki fyrr en i vali 36 — 23 val sidar. Thad er einmitt
     asymmetrian sem gerir fastan "N val a milli" rangan fyrir alla
     nema thann sem situr i midjunni. */
  ok(picksUntilNext(13, 12) === 23,
    "eftir tvofalda valid bidur saeti 12 hins vegar 23 val");
  /* Summan yfir umferd verdur alltaf ad vera 2N. */
  for (let s = 1; s <= 12; s++) {
    const a = picksUntilNext(s, 12);
    const b = picksUntilNext(s + a, 12);
    ok(a + b === 24, `saeti ${s}: bid + naesta bid = 24`);
  }
}

/* ---------- 5. PROFSTEINNINN: RODIN ER A-RANKING ---------- */
console.log("\n5. PROFSTEINNINN — hvad raedur rodinni?");
{
  const league = { teams: 12, starters: { QB: 1, RB: 2, WR: 3, TE: 1 },
                   maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 } };
  /* Smiðum stodu thar sem bradanauðsyn og VBD eru OSAMMALA:
     RB1 hefur haesta VBD en RB-brekkan er flot; TE1 er langtum
     laegri en a eftir honum er hengiflug. */
  const avail = [
    { id: "rb1", name: "Big RB", pos: "RB", vbd: 100, adp: 5, adpSd: 3 },
    { id: "rb2", name: "RB two", pos: "RB", vbd: 95, adp: 8, adpSd: 3 },
    { id: "rb3", name: "RB three", pos: "RB", vbd: 92, adp: 40, adpSd: 5 },
    { id: "te1", name: "Cliff TE", pos: "TE", vbd: 60, adp: 6, adpSd: 3 },
    { id: "te2", name: "TE two", pos: "TE", vbd: 5, adp: 90, adpSd: 10 },
    { id: "wr1", name: "WR one", pos: "WR", vbd: 70, adp: 30, adpSd: 6 },
  ];
  const r = recommend({ available: avail, roster: [], pick: 5, league });

  ok(r.orderedBy === "aRank", "utkoman segir sjalf ad rodin se A-Ranking");
  ok(r.picks[0].id === "rb1",
    `tillagan er haesta VBD (${r.picks[0].name}), ekki brattinn`);
  /* Bradanauðsyn a ad benda a TE — og thad er einmitt villan. */
  ok(r.urgencyPick && r.urgencyPick.id === "te1",
    `bradanauðsyn hefdi valid ${r.urgencyPick && r.urgencyPick.name} — birt, en RAEDUR EKKI`);
  ok(r.picks[0].id !== r.urgencyPick.id,
    "adferdirnar eru osammala i thessu tilviki, eins og aetlad var");

  /* MAELINGIN SEM RETTLAETIR THETTA VERDUR AD FYLGJA KODANUM. */
  ok(MEASURED.urgencyDrivesOrder === false, "skjalfest ad bradanauðsyn radar ekki");
  ok(MEASURED.urgencyVsARank.standard.diff < 0 &&
     MEASURED.urgencyVsARank.standard.significant,
    `og hvers vegna: standard ${MEASURED.urgencyVsARank.standard.diff} stig, marktaekt`);

  /* Stodu-thak verdur ad halda. */
  const full = recommend({
    available: avail, pick: 5, league,
    roster: [{ pos: "RB" }, { pos: "RB" }, { pos: "RB" },
             { pos: "RB" }, { pos: "RB" }, { pos: "RB" }],
  });
  ok(!full.picks.some((p) => p.pos === "RB"),
    "leikmenn a fullri stodu eru ekki i bodi");

  /* Hver tillaga ber rok. Tillaga an raka er ekki haegt ad vera
     osammala og tha haettir notandinn ad nota hana. */
  ok(r.picks.every((p) => Array.isArray(p.reasons) && p.reasons.length > 0),
    "hver leikmadur ber ad minnsta kosti ein rok");

  ok(r.wait === picksUntilNext(5, 12), "bidin er reiknud ur snakk-rodinni");
  ok(r.nextPick === 5 + r.wait, "og naesta val er samkvaemt henni");
}

/* ---------- 6. VAENT BESTA GILDI ---------- */
console.log("\n6. vaent besta gildi vid naesta val");
{
  const list = [
    { id: "a", pos: "RB", vbd: 100, adp: 1, adpSd: 1 },
    { id: "b", pos: "RB", vbd: 50, adp: 200, adpSd: 5 },
  ];
  /* Vid val 40: "a" er orugglega farinn, "b" orugglega laus. */
  const e = expectedBestAt(list, "RB", 40);
  near(e.value, 50, 1, "vaentigildi fellur ad theim sem raunverulega lifir");

  const early = expectedBestAt(list, "RB", 2);
  ok(early.value > e.value, "fyrr i draftinu er vaentigildid haerra");

  ok(expectedBestAt(list, "WR", 40).value === 0, "tom stada gefur 0");

  /* EINRAENI: thvi lengra sem bedid er, thvi laegra vaentigildi. */
  let prev = Infinity;
  for (const p of [5, 20, 50, 100, 200]) {
    const v = expectedBestAt(list, "RB", p).value;
    ok(v <= prev + 1e-9, `einraent vid val ${p} (${v.toFixed(1)})`);
    prev = v;
  }
}

/* ---------- 7. RAUNGOGNIN ---------- */
console.log("\n7. maelingin a disknum");
if (existsSync(path.join(DATA, "advice_standard.json"))) {
  const A = JSON.parse(readFileSync(path.join(DATA, "advice_standard.json"), "utf8"));
  ok(A.seasons.length >= 3, `${A.seasons.length} timabil hermd`);
  /* ARMARNIR TVEIR VERDA AD VERA TVEIR.
     `advicePicker` tok einu sinni `recommend().picks[0]` — en su rod ER
     A-Ranking, svo baðir armar drofudu somu leikmennina og munurinn var
     0,0 i ollum timabilum. Skrain bar samt gamla tolu (-63,8) og THETTA
     PROF VAR GRAENT, thvi thad las toluna i stad thess ad spyrja hvort
     hun gaeti enn ordid til. Fullyrding sem finnur ekkert og heldur
     afram er engin fullyrding (CLAUDE.md 5b). */
  const diffPerSeason = A.seasons
    .filter((y) => A.bySeason.advice[y] != null && A.bySeason.aRank[y] != null)
    .map((y) => Math.abs(A.bySeason.advice[y] - A.bySeason.aRank[y]));
  ok(diffPerSeason.length > 0 && diffPerSeason.some((d) => d > 1),
    `armarnir tveir drafta ekki eins (mesti munur ${Math.max(0, ...diffPerSeason).toFixed(1)})`);
  ok(A.vsARank.diff < 0,
    `bradanauðsyn tapar fyrir A-Ranking i standard (${A.vsARank.diff.toFixed(1)})`);
  ok(A.vsAdp.diff > 0 && A.vsAdp.excludesZero,
    `en badar sla ADP marktaekt (${A.vsAdp.diff.toFixed(1)})`);
  /* Fastinn i kodanum verdur ad fylgja thvi sem var fittad. */
  ok(Math.abs(A.sdRule.used - A.sdRule.fitted) < 0.05,
    `sd-fastinn i kodanum fylgir maelingunni (${A.sdRule.used} vs ${A.sdRule.fitted})`);
} else {
  console.log("  (advice_standard.json vantar — slepp)");
}

/* ---------- 8. DEILDIN SEM FOR I LOFTID = DEILDIN SEM VAR MAELD ---------- */
/* Radgjofin var stadfest i deild med `maxPos`. Deildin sem appid notar
   bar hana ekki, svo `recommend()` sleppti thakinu thogult og lifandi
   radgjofin var ONNUR en su sem var profud: hun draftadi fimm tight
   ends og engan leikstjornanda. Kodinn ma ekki reka thannig aftur. */
console.log("\n8. deildin i appinu ber hermunar-reglurnar");
{
  const { DEFAULT_LEAGUE: APP } = await import("../src/build.js");
  const { DEFAULT_LEAGUE: SIM } = await import("../src/accuracy.js");
  ok(APP.maxPos != null, "deild appsins ber maxPos");
  ok(JSON.stringify(APP.maxPos) === JSON.stringify(SIM.maxPos),
    `maxPos eins og i hermuninni (${JSON.stringify(APP.maxPos)})`);
  ok(APP.rounds > 0, `deild appsins ber rounds (${APP.rounds})`);
  ok(APP.starters.K === 1 && APP.starters.DST === 1,
    "og K/DST-saeti — utilokun theirra a heima i maelingunni, ekki i vidmotinu");

  /* Hermd 14 umferdir a raunbordi: hopurinn verdur ad vera NOTHAEFUR. */
  const { buildRows } = await import("../src/build.js");
  const { recommend } = await import("../src/advice.js");
  const rd = (f) => JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
  if (existsSync(path.join(DATA, "players.json"))) {
    const L = { ...APP, teams: 12, scoring: "ppr" };
    const b = buildRows({ players: rd("players.json"), league: L });
    let avail = b.rows.filter((r) => r.adp != null);
    const roster = [];
    for (let k = 1; k <= 14; k++) {
      const pick = k % 2 ? (k - 1) * 12 + 7 : (k - 1) * 12 + 6;
      avail = avail.slice().sort((a, c) => a.adp - c.adp);
      const rec = recommend({ available: avail, roster, pick, league: L });
      const top = rec.picks[0];
      if (!top) break;
      roster.push(top);
      avail = avail.filter((r) => r.id !== top.id);
      const nxt = k % 2 ? k * 12 + 6 : k * 12 + 7;
      avail = avail.slice(nxt - pick - 1);
    }
    const c = {};
    for (const r of roster) c[r.pos] = (c[r.pos] || 0) + 1;
    const shape = Object.entries(c).map(([p, n]) => `${p}${n}`).join(" ");
    ok((c.QB || 0) >= 1, `radgjofin skilar ad minnsta kosti einum QB (${shape})`);
    ok((c.TE || 0) <= 2, `og i mesta lagi tveimur TE (${shape})`);
    ok((c.RB || 0) >= 2 && (c.WR || 0) >= 3, `og nogu morgum RB/WR i byrjunarlid (${shape})`);
  }
}

/* ============================================================
   AUDAR VIKUR ERU TALDAR EN VEGA EKKERT
   ============================================================
   MAELT i bye-lab.mjs med VIKULEGRI talningu (timabils-summan er blind
   a audar vikur og gat aldrei svarad thessu): tiu af tiu vogum
   jakvaedar a tveimur ohadum spaheimildum, en 8 af 12 arum og
   vikmorkin innihalda null.

   Merkid faer thvi ad SJAST og ekki ad RADA. Thetta profa ver bædi:
   ad talningin se rett OG ad hun hreyfi ENGAN i rodinni.           */
console.log("\naudar vikur: taldar, ekki vegnar");
{
  const L = { ...(await import("../src/build.js")).DEFAULT_LEAGUE, teams: 12, scoring: "ppr" };
  const avail = [
    { id: "a", name: "A", pos: "RB", vbd: 100, adp: 5, bye: 7 },
    { id: "b", name: "B", pos: "RB", vbd: 90, adp: 8, bye: 7 },
    { id: "c", name: "C", pos: "WR", vbd: 80, adp: 12, bye: 9 },
  ];
  const roster = [
    { id: "x", pos: "RB", bye: 7 }, { id: "y", pos: "RB", bye: 7 },
    { id: "z", pos: "WR", bye: 9 },
  ];

  const rec = recommend({ available: avail, roster, pick: 30, league: L });
  const clash = rec.byeClash.find((c) => c.pos === "RB");
  ok(clash && clash.n === 2 && clash.bye === 7,
    `tveir RB i frii viku 7 eru taldir (${JSON.stringify(rec.byeClash)})`);
  ok(!rec.byeClash.some((c) => c.n < 2),
    "einn madur i viku telst ekki arekstur");

  /* KJARNINN: rodin ma ekki haggast. Sami hopur an bye-upplysinga
     verdur ad gefa NAKVAEMLEGA somu rod. */
  const noBye = recommend({
    available: avail.map((p) => ({ ...p, bye: null })),
    roster: roster.map((p) => ({ ...p, bye: null })), pick: 30, league: L });
  ok(JSON.stringify(rec.picks.map((p) => p.id)) ===
     JSON.stringify(noBye.picks.map((p) => p.id)),
    `rodin er OHOGGUD af audum vikum (${rec.picks.map((p) => p.id).join(",")})`);
  ok(noBye.byeClash.length === 0, "og an gagna er enginn arekstur talinn");
}

/* ============================================================
   STODU-THORF MA EKKI HREYFA RODINA — OG `survive` EKKI HELDUR
   ============================================================
   Notandinn spurdi 12.8.2026: "eg se ad akvardanatakan tekur tillit
   til thess ad eg a engan WR — er thad smart move?" Svarid er nei,
   og appid gerir thad ekki. En hann var ekki ad imynda ser thetta:
   `reasonsFor` skrifar "you still need 2 at WR" og TEXTI SEM LITUR UT
   EINS OG ROKSTUDNINGUR LES EINS OG HANN HAFI RADID. Thess vegna eru
   badar hlidar profadar: ordalagid ma segja fra thorfinni, en rodin
   verdur ad vera oháð henni.

   MAELT:
     stodu-plan (19 utgafur, strategy-lab)  ekkert slaer BPA marktaekt
     bradanauðsyn sem rod (advice-lab)      -63,8 i standard, 0/4 ar
     lifunarlikur sem jafnteflis-rof        PPR -1,7 (4/10, t=-0,06)
       (tiebreak-lab, NYTT 12.8.2026)       std +15,9 (7/10, t=0,79)  */
console.log("\nstodu-thorf og lifunarlikur RADA ENGU");
{
  const { DEFAULT_LEAGUE: DL } = await import("../src/build.js");
  const L = { ...DL, teams: 12, scoring: "ppr" };
  const avail = [
    { id: "rb1", name: "RB One", pos: "RB", vbd: 90, proj: 250, adp: 5, adpSd: 3, tier: 1 },
    { id: "wr1", name: "WR One", pos: "WR", vbd: 88, proj: 240, adp: 6, adpSd: 3, tier: 1 },
    { id: "rb2", name: "RB Two", pos: "RB", vbd: 70, proj: 230, adp: 20, adpSd: 5, tier: 2 },
    { id: "wr2", name: "WR Two", pos: "WR", vbd: 60, proj: 220, adp: 25, adpSd: 5, tier: 2 },
    { id: "te1", name: "TE One", pos: "TE", vbd: 55, proj: 210, adp: 30, adpSd: 6, tier: 2 },
  ];

  /* Hopur MED tveimur RB og ENGUM WR. Thorfin bendir hart a WR. */
  const needWr = recommend({ available: avail,
    roster: [{ id: "x", pos: "RB" }, { id: "y", pos: "RB" }], pick: 25, league: L });
  /* Hopur med tveimur WR og engum RB — nakvaemlega spegilmyndin. */
  const needRb = recommend({ available: avail,
    roster: [{ id: "x", pos: "WR" }, { id: "y", pos: "WR" }], pick: 25, league: L });

  ok(needWr.picks[0].id === "rb1",
    `med engan WR er efsti madur samt haesta VBD (${needWr.picks[0].id})`);
  ok(JSON.stringify(needWr.picks.map((p) => p.id)) ===
     JSON.stringify(needRb.picks.map((p) => p.id)),
    "spegilmynd hopsins gefur NAKVAEMLEGA somu rod");

  /* Og ordalagid MA segja fra henni — en tha verdur thad ad vera til
     stadar, annars vaeri thetta prof ad verja fjarveru sem enginn
     saer. Neikvaed fullyrding an jakvaedrar systur er einskis virdi. */
  const txt = needWr.picks.flatMap((p) => p.reasons.map((r) => r.text)).join(" | ");
  ok(/need/i.test(txt), `thorfin er NEFND i rokunum (${txt.slice(0, 60)}…)`);
  const wr1 = needWr.picks.find((p) => p.id === "wr1");
  ok(wr1 && wr1.reasons.some((r) => r.kind === "need"),
    "og hun hangir a rettum manni");

  /* `survive` er reiknad og birt en ma ekki rada. Her er thad gert
     berum ordum: madur med LAEGRI VBD en miklu laegri lifun ma ekki
     stokkva yfir. `wr1` (88) lifir sidur en `rb1` (90) — reglan sem
     var maeld hefdi tekid hann; rodin gerir thad ekki. */
  ok(needWr.picks[0].vbd >= needWr.picks[1].vbd,
    "rodin er einraen i VBD, hvad sem lifunarlikum lidur");
  ok(needWr.picks.every((p) => p.survive === null || typeof p.survive === "number"),
    "og lifunarlikur eru samt reiknadar og skiladar (upplysing)");
}

/* Og maelingin sjalf verdur ad vera a diski og ekki marktaek. Snuist
   thad vid a ad taka akvordunina upp — ekki ad thegja um hana. */
{
  for (const sc of ["ppr", "standard"]) {
    const f = path.join(DATA, "measure", `tiebreak_${sc}.json`);
    if (!existsSync(f)) { console.log(`  (tiebreak_${sc}.json vantar)`); continue; }
    const T = JSON.parse(readFileSync(f, "utf8"));
    ok(T.summary.years >= 8, `${sc}: ${T.summary.years} ar hermd`);
    ok(T.summary.t == null || Math.abs(T.summary.t) < 2.26,
      `${sc}: jafnteflis-rofid er EKKI marktaekt (t=${T.summary.t})`);
    /* Og reglan verdur ad hafa verid VIRK — nakvaemt null alls stadar
       vaeri einkenni um obreytt bord, ekki nidurstada (sja notu i
       tiebreak-lab.mjs). */
    const any = Object.values(T.grid).some((g) =>
      Object.entries(g).some(([k, v]) => Number(k) > 0 && v !== 0));
    ok(any, `${sc}: reglan var raunverulega virk (bordid vék)`);
  }
}

/* ============================================================
   LIFUNAR-HAD TIMASETNING — README 4m, `measure/sequencing.json`
   ============================================================
   `tiebreak-lab` her ad ofan spurdi VEIKARI spurningar en notandinn:
   hun kviknar lika thegar BADIR frambjodendur eru 0% (thar sem enginn
   hagnadur er i bodi), hun maeldi EINA lognun og hun bar ENGIN
   leikmanna-klosud vikmork. `seq-lab.mjs` maelir hina — threskuld med
   X (efsti madur lifir) OG Z (hinn lifir ekki), thrju EV-form, badar
   deildir notandans, og tvo mekanisma-arma an nokkurra lifunarlikinda.

   ThRENNT ER VARID HER, OG ThAD ThRIDJA ER ThAD SEM SKIPTIR MALI:
     1. THEKJA FYRST. Skrain verdur ad bera raunverulega rist, annars
        maelir kaflinn ekkert og vaeri samt graenn (CLAUDE.md 5b).
     2. `verdict[*].passing` verdur ad vera TOMT. Byrji hólf ad
        standast barinn a ad MAELA UPP A NYTT — ekki ad thegja.
     3. `ev-cross` — retta EV-formid MED GOLFI — verdur ad vera
        NEGATIFT. Thad er sterkasta einstaka nidurstadan i 4m, og hun
        er su sem freistingin snyr vid: "reikningurinn segir ad taka
        thann sem tapast". Reikningurinn segir thad adeins an golfsins.
   ============================================================ */
{
  const f = path.join(DATA, "measure", "sequencing.json");
  if (!existsSync(f)) { console.log("  (sequencing.json vantar — keyrdu scripts/seq-lab.mjs)"); }
  else {
    const S = JSON.parse(readFileSync(f, "utf8"));
    const shapes = Object.keys(S.verdict || {});
    ok(shapes.length >= 2, `${shapes.length} lagnir maeldar`);
    ok((S.design.seasons || []).length >= 8,
      `${(S.design.seasons || []).length} timabil hermd`);
    /* THEKJA ER FULLYRDING: ristin verdur ad vera raunveruleg og hun
       verdur ad hafa KVIKNAD, annars er "0 standast" satt af tomum
       astaedum (nakvaemlega bilunin sem `tiebreak-lab` fell a fyrst). */
    const fired = Object.entries(S.fireStats || {})
      .filter(([k]) => !k.endsWith("|shipped")).map(([, v]) => v.fireRate || 0);
    ok(fired.length >= 100 && Math.max(...fired) > 0.05,
      `ristin er raunveruleg og hun kviknadi (${fired.length} hólf, haest ${Math.max(...fired)})`);
    for (const s of shapes) {
      const v = S.verdict[s];
      ok((v.passing || []).length === 0,
        `${s}: 0 af ${v.cellsBarEvaluated} mötnum hólfum standast barinn` +
        `${(v.passing || []).length ? ` — ${v.passing.join(", ")} STENST, MAELDU UPP A NYTT` : ""}`);
      const ec = S.cells[`${s}|ev-cross`];
      ok(ec && ec.mean < 0,
        `${s}: retta EV-formid med golfi TAPAR (${ec ? ec.mean : "vantar"})`);
    }
  }
}

/* ============================================================
   SJALFGEFIN GILDI MEGA EKKI REKA I SUNDUR MILLI SKRAA
   ============================================================
   `advice.js` bar `league.rounds || 14` medan `DEFAULT_LEAGUE.rounds`
   er **15**. `picksLeft = rounds - roster.length` styrir
   `mustFillUrgent`, sem er thad eina sem segir ther ad taka spyrnumann
   eda vorn — svo vid 14 taldi radgjofin EINU VALI FAERRA en deildin ber
   og kallaði bradanauðsyn einni umferd of snemma.

   Sama aett og `maxPos`-villan sem `build.js` skjalar: "thad sem var
   maelt var ekki thad sem for i loftid". Tvaer utgafur af somu deild.

   Þessi kafli les GILDID UR KODANUM og ber thad vid `DEFAULT_LEAGUE`,
   svo thau geti ekki rekid i sundur aftur — handskrifud tala hér vaeri
   thridja utgafan af sama reit.                                      */
console.log("\nsjalfgefin gildi reka ekki i sundur");
{
  const { DEFAULT_LEAGUE } = await import("../src/build.js");
  const src = readFileSync(path.join(DATA, "..", "src", "advice.js"), "utf8");
  const m = /league\.rounds\s*\|\|\s*(\d+)/.exec(src);
  ok(!!m, "sjalfgefid `rounds` finnst i `advice.js`");
  if (m) {
    ok(Number(m[1]) === DEFAULT_LEAGUE.rounds,
      `og thad er ${DEFAULT_LEAGUE.rounds}, eins og \`DEFAULT_LEAGUE\` ` +
      `(fann ${m[1]})`);
  }

  /* Og afleidingin er profud, ekki adeins talan: deild an `rounds`
     verdur ad gefa SAMA `picksLeft` og deild sem ber sjalfgefna toluna
     berum ordum. Annars er samanburdurinn hér ofan bara textaleit. */
  const roster = [];
  const av = [{ id: "x", name: "X", pos: "RB", proj: 200, vbd: 50, adp: 10, tier: 1 }];
  const a1 = recommend({ available: av, roster, pick: 1,
    league: { ...DEFAULT_LEAGUE, rounds: undefined } });
  const a2 = recommend({ available: av, roster, pick: 1, league: DEFAULT_LEAGUE });
  ok(a1.picksLeft === a2.picksLeft,
    `deild an \`rounds\` gefur sama \`picksLeft\` og sjalfgefna deildin ` +
    `(${a1.picksLeft} / ${a2.picksLeft})`);
  ok(a1.picksLeft === DEFAULT_LEAGUE.rounds,
    `og thad er ${DEFAULT_LEAGUE.rounds} med tomum hop (fann ${a1.picksLeft})`);

  /* ============================================================
     OG HOPURINN GETUR VERID STAERRI EN BORDID VEIT
     ============================================================
     Sami reitur, thridja tegundin af skekkju: `roster.length` telur
     adeins thad sem BORDID thekkir. Bordid ber ~1.130 leikmenn af
     ~11.400 hja Sleeper, svo djupt eigid val fer i `unmatched.mine` og
     HVERGI annad. Appid taldi thau ThEGAR i valnumerid (`offBoard` ->
     `pickNo`) en EKKI i hopinn — svo med tveimur oporadum eigin volum
     sagdi radgjofin TVEIMUR VOLUM FLEIRA eftir en eg a, og
     `mustFillUrgent` (thad EINA sem segir ther ad taka spyrnumann eda
     vorn) kviknadi UMFERD OF SEINT. Tomt varnarsaeti i sidustu umferd.

     `offBoard` fekk nakvaemlega thessa lagfaeringu fyrir `pickNo`;
     `roster.length` fekk hana ekki.                                 */
  {
    const two = [
      { id: "r1", name: "R1", pos: "RB", proj: 200, vbd: 50, adp: 10, tier: 1 },
      { id: "r2", name: "R2", pos: "RB", proj: 190, vbd: 45, adp: 12, tier: 1 },
    ];
    const base = recommend({ available: av, roster: two, pick: 20,
      league: DEFAULT_LEAGUE });
    const withUnknown = recommend({ available: av, roster: two, pick: 20,
      league: DEFAULT_LEAGUE, rosterUnknown: 2 });
    ok(base.picksLeft === DEFAULT_LEAGUE.rounds - 2,
      `ThEKJA: tveir menn a bordinu -> ${base.picksLeft} vol eftir`);
    ok(withUnknown.picksLeft === base.picksLeft - 2,
      `og tvo oporud eigin vol taka TVO i vidbot (${withUnknown.picksLeft} ` +
      `a moti ${base.picksLeft})`);

    /* SJALFGEFID 0 ER RETT OG ER EKKI AGISKUN: kallandi sem veit ekkert
       um oporud vol (hrein prof, `advice-lab`) hefur engan hop utan
       bordsins. Þess vegna ma sleppt svid ALDREI breyta svarinu. */
    ok(recommend({ available: av, roster: two, pick: 20,
      league: DEFAULT_LEAGUE, rosterUnknown: undefined }).picksLeft === base.picksLeft,
      "sleppt svid breytir engu (`0` er rett sjalfgefid gildi)");
    for (const junk of [null, "abc", -5, NaN]) {
      ok(recommend({ available: av, roster: two, pick: 20,
        league: DEFAULT_LEAGUE, rosterUnknown: junk }).picksLeft === base.picksLeft,
        `skokk gildi (${String(junk)}) gefur ekki NaN ne negatift`);
    }
    /* Og talan ma ekki fara undir null — hun styrir texta a skjanum. */
    ok(recommend({ available: av, roster: two, pick: 20,
      league: DEFAULT_LEAGUE, rosterUnknown: 99 }).picksLeft === 0,
      "og hun er golfud i 0, ekki negatif");

    /* ============================================================
       AFLEIDINGIN, EKKI ADEINS TALAN: BRADANAUDSYNIN FLYST
       ============================================================
       `picksLeft` er ekki birt tala eingongu — hun er thad sem raedur
       hvort "you must take a K/DST now" birtist. Fullyrding a tolunni
       einni gaeti stadist medan bradanauðsynin lesi hana ekki.       */
    const L = { ...DEFAULT_LEAGUE, rounds: 15,
                starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 } };
    /* `mustFillUrgent` er `needed > 0 && picksLeft <= needed + 1`. Med
       ellefu monnum a bordinu og hvorki K ne DST er `needed` 2 og
       `picksLeft` 4 — EKKI bradanauðsyn. Eitt oporad eigid val faerir
       hana i 3, sem ER bradanauðsyn. Skurdpunkturinn er thvi TOLU-
       NAKVAEMUR og fullyrdingin getur brugdist i badar attir.        */
    const mk = (n) => Array.from({ length: n }, (_, i) => ({
      id: `p${i}`, name: `P${i}`, pos: i % 2 ? "RB" : "WR", proj: 100, vbd: 10 }));
    const r11 = mk(11);
    const at11 = recommend({ available: av, roster: r11, pick: 110, league: L });
    const at11u = recommend({ available: av, roster: r11, pick: 110, league: L,
      rosterUnknown: 1 });
    ok(at11.picksLeft === 4 && at11u.picksLeft === 3,
      `vol eftir: ${at11.picksLeft} an og ${at11u.picksLeft} med oporudu vali`);
    ok(at11.mustFill.length === 2,
      `ThEKJA: tvaer stodur ofylltar (${at11.mustFill.map((m) => m.pos).join(",")})`);
    ok(at11.mustFillUrgent === false && at11u.mustFillUrgent === true,
      "og bradanauðsynin kviknar EINNI UMFERD FYRR med oporudu vali " +
      `(${at11.mustFillUrgent} -> ${at11u.mustFillUrgent})`);
  }
}

/* ============================================================
   12. BORDID OG KASSINN VERDA AD SEGJA SOMU TOLUNA
   ============================================================
   VILLAN SEM ÞESSI KAFLI ER TIL VEGNA VAR A SKJANUM, EKKI I KODANUM:
   bordid litadi sig med `nextOwnPick(cur, teams, sync.slot)` — sem
   notar RAUNVERULEGA saetid — medan `NextPick` sendi `taken.size + 1`
   inn i `recommend`, sem LEIDDI saetid ut af thvi valnumeri og fékk
   thvi saeti THESS SEM VAR A KLUKKUNNI.

   I 10-lida deild, saeti 7, 20 vol komin sagdi SAMI SKJAR samtimis
   "naesta val #27" og "naesta val 40, bid 19". Sami leikmadur bar 0% i
   kassanum og 31% i sinni eigin rod.

   ============================================================
   HVERS VEGNA ÞETTA ER EKKI PROFANLEGT MED EINU KALLI
   ============================================================
   Hvorugt fallid er BILAD. `nextOwnPick` er rett, `picksUntilNext` er
   rett, og badir hofdu graen prof. Villan var i ad tvaer rettar
   afleidslur voru bornar a SITTHVORT inntak og bædi svorin birt.
   Fullyrdingin verdur thvi ad vera SAMANBURDUR og hun verdur ad
   ganga yfir MORG vol — vaeri hun profud vid eitt val gaeti hun lent a
   einu af theim 6 af 60 thar sem tolurnar EIGA ad vera jafnar.

   Og hun ma ekki vera "kalladu badar og ber saman": thad profar
   afleidslurnar, ekki TENGINGUNA. Þess vegna er `recommend` kallad
   eins og `NextPick` kallar thad.                                   */
console.log("\n12. bordid og kassinn eru samhljoda");
{
  const { DEFAULT_LEAGUE } = await import("../src/build.js");
  const av = [
    { id: "a", name: "A", pos: "RB", proj: 240, vbd: 90, adp: 3,  adpSd: 6, tier: 1 },
    { id: "b", name: "B", pos: "WR", proj: 230, vbd: 80, adp: 12, adpSd: 8, tier: 1 },
    { id: "c", name: "C", pos: "QB", proj: 300, vbd: 60, adp: 30, adpSd: 10, tier: 2 },
    { id: "d", name: "D", pos: "TE", proj: 150, vbd: 40, adp: 45, adpSd: 12, tier: 2 },
  ];
  const teams = 10, slot = 7, maxRounds = 17;

  let checked = 0, agreed = 0, drift = 0;
  for (let cur = 1; cur <= 60; cur++) {
    /* THAD SEM BORDID GERIR */
    const boardNext = nextOwnPick(cur, teams, slot, maxRounds);
    if (boardNext == null) continue;
    /* THAD SEM KASSINN GERIR — nakvaemlega sama kall og `NextPick` */
    const rec = recommend({ available: av, roster: [], pick: cur,
      league: { ...DEFAULT_LEAGUE, teams }, nextPick: boardNext });
    checked++;
    if (rec.nextPick === boardNext) agreed++;
    /* Og bidin verdur ad vera samhljoda tolunni, ekki bara jafn stor */
    if (rec.wait !== boardNext - cur) drift++;
  }
  ok(checked >= 50, `bornir saman ${checked} vol (>=50)`);
  ok(agreed === checked,
    `radgjofin ber SOMU toluna sem bordid litar med i OLLUM ${checked} volum ` +
    `(samhljoda ${agreed})`);
  ok(drift === 0, `og \`wait\` er samhljoda tolunni i ollum volum (drift ${drift})`);

  /* ------------------------------------------------------------
     OG PROFID VERDUR AD GETA BRUGDIST.
     ------------------------------------------------------------
     Fullyrdingin hér ofan er hattulega nalaegt tomri fullyrdingu: eg
     GEF `nextPick` og athuga svo hvort thad hafi verid notad. Vaeri
     `nextPick` thagad nidur myndi `recommend` falla i afleidsluna —
     og THAD er nakvaemlega gamla hegdunin. Þess vegna er hún maeld hér
     berum ordum: an breytunnar VERDA tolurnar ad skilja.            */
  let oldAgreed = 0, oldChecked = 0;
  for (let cur = 1; cur <= 60; cur++) {
    const boardNext = nextOwnPick(cur, teams, slot, maxRounds);
    if (boardNext == null) continue;
    const rec = recommend({ available: av, roster: [], pick: cur,
      league: { ...DEFAULT_LEAGUE, teams } });          // <- EKKERT `nextPick`
    oldChecked++;
    if (rec.nextPick === boardNext) oldAgreed++;
  }
  ok(oldAgreed < oldChecked,
    `an \`nextPick\` SKILJA thaer — ${oldAgreed} af ${oldChecked} samhljoda, ` +
    `svo fullyrdingin hér ofan er ekki tom`);
  ok(oldAgreed > 0,
    `en ekki alltaf (${oldAgreed} vol thar sem valid a klukkunni ER mitt) — ` +
    `annars vaeri gamla hegdunin bara "alltaf rong" og villan hefdi sest`);

  /* Rusl-inntak ma ALDREI gefa negatifa bid. `nextPick` fyrir `pick`
     er ekki "hann kemur adur" heldur skokk gagn — og "0% lifun" a alla
     leikmenn les eins og maeld nidurstada. */
  for (const bad of [null, undefined, NaN, "40", -5, 0, 10, 10.5, Infinity]) {
    const r = recommend({ available: av, roster: [], pick: 10,
      league: { ...DEFAULT_LEAGUE, teams }, nextPick: bad });
    ok(r.nextPick > 10 && r.wait > 0 && Number.isFinite(r.wait),
      `\`nextPick: ${String(bad)}\` gefur samt gilda bid ` +
      `(naesta ${r.nextPick}, bid ${r.wait})`);
  }
}

/* ============================================================
   13. `MEASURED` ER AFRIT AF DISKI — OG AFRIT REKA
   ============================================================
   `MEASURED` er handskrifad afrit af `data/advice_<scoring>.json`.
   Yfirferd 12.8.2026 fann TOLF talna skekkju: hermunin hafdi verid
   endurkeyrd med fimm timabilum (2021-2025) en `advice.js` bar enn
   fjogurra-ara tolurnar — og `aRankVsAdp.standard` var 267,1 thar sem
   diskurinn segir 197,46, sem er naestum vidsnuid vid ppr og las eins
   og A-Ranking ynni MEST i standard.

   NIDURSTADAN HAGGADIST EKKI (`urgencyDrivesOrder: false` stendur i
   badum settum), og ÞAD er einmitt hvers vegna thetta gat lifad: ekkert
   prof las tolurnar, adeins alyktunina. Birt tala sem ekkert bakar upp
   er versta utkoman i thessu verkefni, hvort sem hun breytir akvordun.

   Þetta er sama aett og "sjalfgefin gildi reka ekki i sundur" hér ofan,
   nema tha var samanburdurinn milli tveggja KODASKRA; hér er hann milli
   koda og MAELINGAR.                                                 */
console.log("\n13. `MEASURED` ber somu tolur og diskurinn");
{
  const files = { ppr: "advice_ppr.json", standard: "advice_standard.json" };
  let seen = 0;
  for (const [scoring, f] of Object.entries(files)) {
    const p = path.join(DATA, f);
    if (!existsSync(p)) {
      /* Vantandi maeling er EKKI thogn: hun er sogd, og hun fellur ekki
         profid thvi lob eru ekki i pipeline. En hun ma ekki lata
         kaflann lita eins og hann hafi maelt neitt — thess vegna er
         `seen` fullyrdingin nedan. */
      console.log(`  (${f} vantar — keyrdu scripts/advice-lab.mjs --scoring=${scoring})`);
      continue;
    }
    const j = JSON.parse(readFileSync(p, "utf8"));
    seen++;

    const u = MEASURED.urgencyVsARank[scoring];
    const d = j.vsARank;
    const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.05;
    ok(near(u.diff, d.diff),
      `${scoring}: urgencyVsARank.diff ${u.diff} == diskur ${d.diff.toFixed(2)}`);
    ok(near(u.lo, d.lo) && near(u.hi, d.hi),
      `${scoring}: CI [${u.lo}, ${u.hi}] == diskur ` +
      `[${d.lo.toFixed(2)}, ${d.hi.toFixed(2)}]`);
    ok(u.winYears === d.winYears && u.years === d.years,
      `${scoring}: winYears/years ${u.winYears}/${u.years} == diskur ` +
      `${d.winYears}/${d.years}`);
    /* MARKTAEKNI ER ALYKTUN AF CI, EKKI SJALFSTAED TALA. Hafi hun rekid
       fra CI-inu er annad hvort logid. */
    ok(u.significant === !!d.excludesZero,
      `${scoring}: significant ${u.significant} == (CI utilokar null: ` +
      `${!!d.excludesZero})`);

    const a = MEASURED.aRankVsAdp[scoring];
    ok(near(a.diff, j.vsAdp.diff),
      `${scoring}: aRankVsAdp.diff ${a.diff} == diskur ${j.vsAdp.diff.toFixed(2)}`);
    ok(a.significant === !!j.vsAdp.excludesZero,
      `${scoring}: aRankVsAdp.significant == diskur`);

    ok(JSON.stringify(MEASURED.seasons) === JSON.stringify(j.seasons),
      `${scoring}: timabilin ${JSON.stringify(MEASURED.seasons)} == diskur ` +
      `${JSON.stringify(j.seasons)}`);

    /* Og standard MA EKKI vera haerri en ppr i `aRankVsAdp` — thad var
       einkennid sem afhjupadi vidsnuninguna. Þessi fullyrding er ekki
       almenn tolfraedi heldur MINNI um thessa tilteknu villu, og hun er
       merkt sem slikt: se maeling einhvern tima ad snua thessu vid a hun
       ad falla og verda skodud, ekki ad thagna. */
    if (scoring === "standard") {
      ok(MEASURED.aRankVsAdp.standard.diff < MEASURED.aRankVsAdp.ppr.diff,
        `standard (${MEASURED.aRankVsAdp.standard.diff}) < ppr ` +
        `(${MEASURED.aRankVsAdp.ppr.diff}) — vidsnuningurinn kemur ekki aftur`);
    }
  }
  ok(seen > 0, `THEKJA: ${seen} af 2 maelingum lesnar (0 vaeri togn, ekki graent)`);

  /* Og `sdRule` er sama aett — hun er lika afrit. */
  const sp = path.join(DATA, "advice_ppr.json");
  if (existsSync(sp)) {
    const j = JSON.parse(readFileSync(sp, "utf8"));
    ok(Math.abs(MEASURED.sdRuleFitted - j.sdRule.fitted) < 0.005,
      `sdRuleFitted ${MEASURED.sdRuleFitted} == diskur ${j.sdRule.fitted}`);
    ok(MEASURED.sdRuleSample === j.sdRule.n,
      `sdRuleSample ${MEASURED.sdRuleSample} == diskur ${j.sdRule.n}`);
    /* Og kodinn verdur ad nota thad sem hann segir ad hann noti. */
    ok(SD_K === j.sdRule.used,
      `SD_K ${SD_K} er talan sem lab-id keyrdi med (${j.sdRule.used})`);
  }
}

/* ============================================================
   14. TILTAEKILEIKI 0 — RODIN VAR BLIND A MEIDSLI
   ============================================================
   VILLAN: `DraftBoard` sendi `recommend()` hvorki `avail` ne `injury`,
   thott `build.js` reikni bædi i somu rod. Maelt 18.8.2026 a
   raunbordi, 10-lida PPR: **George Kittle, PUP, avail 0**, spa 169,3
   (heil 17 leikja tala) -> aRank 61, VBD 9,9, "+5,4 umferdir" GRAENT.
   Þrettan menn med `avail: 0` baru aRank.

   ÞETTA PROF ER BYGGT TIL AD FALLA THEGAR THETTA GERIST AFTUR, og
   thad er ekki einfalt: fullyrding a formi "Kittle er ekki i listanum"
   er ONYT ef hann er hvergi i inntakinu (sja CLAUDE.md 5b, regla 2).
   Þess vegna er THEKJAN FULLYRT FYRST — raunbordid VERDUR ad bera
   menn med `avail: 0` OG aRank, annars fellur kaflinn af thvi ad hann
   getur ekki maelt.

   Og hinar tvaer hlidarnar eru jafn mikilvaegar:
     · `avail == null` (vid vitum ekki) MA EKKI fella mann — NULL ER
       EKKI NULL, og forritari sem "snyrtir" thetta i `!p.avail` fellir
       hvern einasta mann sem gagnaskran thegir um.
     · 0,25 og 0,75 MEGA EKKI fella neinn. Enginn halli var funninn upp:
       FPL-hlutinn maeldi ad `Out -> 0` sotti 84% af abatanum og finni
       threp baru engin vikmork sem utiloka null; `avail-lab.mjs` hér
       ber somu nidurstodu. Fyndi einhver upp halla myndi thetta falla.
   ============================================================ */
console.log("\n14. tiltaekileiki 0 fellur ur rodinni — med astaedu");
{
  const { buildRows } = await import("../src/build.js");
  const rd = (f) => JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
  const L = {
    teams: 10, scoring: "ppr",
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
    superflex: false, maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 15,
  };

  /* ---- a) tilbuin gogn: reglan sjalf, engin gagnaskra ---- */
  const mk = (id, pos, vbd, extra = {}) => ({
    id, name: `p${id}`, pos, vbd, adp: 50, adpSd: 10, tier: 1, ...extra,
  });
  {
    const rec = recommend({
      available: [
        mk("hurt", "TE", 200, { avail: 0, injury: "PUP" }),
        mk("ok", "TE", 100),
        mk("unknown", "RB", 90, { avail: null }),
        mk("quest", "WR", 80, { avail: 0.75, injury: "Questionable" }),
        mk("doubt", "WR", 70, { avail: 0.25, injury: "Doubtful" }),
      ],
      roster: [], pick: 10, league: L, nextPick: 21,
    });
    const ids = rec.picks.map((p) => p.id);
    /* Positift fyrst: rodin BER thessa menn. An thess er "hurt er ekki
       i henni" satt af tomum astaedum. */
    ok(ids.includes("ok") && ids.includes("unknown"),
      `rodin ber heilbrigda menn (${ids.join(",")})`);
    ok(!ids.includes("hurt"),
      "avail 0 er EKKI i rodinni, thott VBD hans se haest af ollum");
    ok(ids.includes("unknown"),
      "avail null er i rodinni — NULL ER EKKI NULL");
    ok(ids.includes("quest") && ids.includes("doubt"),
      "avail 0,75 og 0,25 rada engu — enginn halli var funninn upp");
    ok(rec.sidelined.length === 1 && rec.sidelined[0].id === "hurt",
      `sidelined ber hann og hann einan (${rec.sidelined.length})`);
    ok(/PUP/.test(rec.sidelined[0].why || ""),
      `astaedan nefnir stoduna berum ordum: "${rec.sidelined[0].why}"`);
    ok(rec.sidelined[0].vbd === 200,
      "og VBD hans er skilad, svo notandinn geti sed hvad hann er ad sleppa");

    /* Hann ma ekki heldur telja i "hvad ætti stadan ad bjoda naest".
       Þessi fullyrding er sjalfstaed: eina sian er notud a badum
       stodum, svo bædi verda ad falla thegar hun er fjarlaegd. */
    ok(rec.expectedNext.TE != null && rec.expectedNext.TE <= 100,
      `expectedNext.TE (${rec.expectedNext.TE}) reiknast an hans (VBD 200)`);
  }

  /* ---- b) tomt fylki, aldrei null ---- */
  {
    const rec = recommend({
      available: [mk("a", "RB", 50), mk("b", "WR", 40)],
      roster: [], pick: 5, league: L, nextPick: 16,
    });
    ok(Array.isArray(rec.sidelined) && rec.sidelined.length === 0,
      "allir heilir -> tomt fylki, ekki null (vidmotid les .length an vardar)");
    ok(rec.sidelinedBelowRepl === 0 && rec.sidelinedWorst === null,
      "og engum var sleppt -> 0 taldir og `sidelinedWorst` er NULL, ekki 0");
  }

  /* ============================================================
     b2) VARAMANNS-LINAN KLIPPIR — OG TALAN SEGIR FRA (19.8.2026)
     ============================================================
     Kassinn bar THRETTAN menn a skjanum hja notandanum og ellefu
     theirra voru merkingarlausir (Bridgewater a VBD -288) medan
     THANN EINA sem skiptir mali — Kittle — var haegt ad missa i
     rununni. Skurdurinn er `vbd > 0`: VBD er virdi ofan a varamann,
     svo `vbd <= 0` thydir "ekki thess virdi ad taka saeti".

     ENGINN HVERFUR ThEGJANDI. Þad var asetningurinn med kassanum
     fra upphafi og hann stendur: their sem eru klipptir eru TALDIR
     og versta talan er nefnd, svo notandinn getur bædi vitad ad
     their eru til og hvers vegna their eru ekki nefndir.

     BAÐAR ATTIR ERU PROFADAR og su fyrri er nauðsynleg: vaeri
     skurdurinn latinn taka ALLA vaeri "engir ovirdulegir nefndir"
     satt af tomum astaedum.                                      */
  {
    const rec = recommend({
      available: [
        mk("keep", "TE", 12, { avail: 0, injury: "PUP" }),
        mk("edge", "WR", 0, { avail: 0, injury: "PUP" }),
        mk("clip1", "QB", -288, { avail: 0, injury: "NA" }),
        mk("clip2", "RB", -122, { avail: 0, injury: "IR" }),
        mk("ok1", "RB", 60), mk("ok2", "WR", 55),
      ],
      roster: [], pick: 10, league: L, nextPick: 21,
    });
    ok(rec.sidelined.length === 1 && rec.sidelined[0].id === "keep",
      `adeins sa yfir linunni er nefndur (${rec.sidelined.map((s) => s.id).join(",") || "enginn"})`);
    /* NAKVAEMLEGA `> 0`, ekki `>= 0`: madur a varamanns-linunni sjalfri
       er EKKI virdi ofan a varamann. `edge` er tharna til ad greina
       thessi tvo skilyrdi i sundur — an hans vaeri hvort sem er graent. */
    ok(!rec.sidelined.some((s) => s.id === "edge"),
      "og VBD nakvaemlega 0 er UNDIR linunni, ekki a henni");
    ok(rec.sidelinedBelowRepl === 3,
      `thrir voru klipptir og TALDIR (${rec.sidelinedBelowRepl})`);
    ok(rec.sidelinedWorst === -288,
      `og versta talan er nefnd, svo talan se laesileg (${rec.sidelinedWorst})`);
    /* Klipping ma ekki verda sia: their eru afram UT UR rodinni. */
    const ids = rec.picks.map((p) => p.id);
    ok(!ids.includes("clip1") && !ids.includes("clip2") && !ids.includes("edge"),
      "og klipptir menn eru samt EKKI komnir aftur i rodina");
  }

  /* ---- c) RAUNBORDID — thekjan er fullyrding, ekki logga ---- */
  if (existsSync(path.join(DATA, "players.json"))) {
    const { rows } = buildRows({ players: rd("players.json"), league: L });
    const boardish = rows.filter((r) => r.aRank != null);
    const zero = boardish.filter((r) => r.avail === 0);
    /* HER ER THEKJAN. Fyndist enginn slikur madur gaeti kaflinn ekki
       maelt neitt og vaeri samt graenn — nakvaemlega tilfellid sem
       CLAUDE.md 5b lysir. Þa er rett ad FALLA og lata skoda. */
    ok(zero.length > 0,
      `THEKJA: ${zero.length} menn med avail 0 bera aRank a raunbordinu`);
    ok(zero.some((r) => r.injury && r.injury !== "Out" && r.injury !== "IR"),
      "og theirra a medal er stada UTAN {Out, IR} — thess vegna ma "
      + "litur merkisins ekki koma ur nafnalista");

    const rec = recommend({
      /* NAKVAEMLEGA sami hlutur sem `DraftBoard` byggir. Breytist hann
         thar an thess ad breytast hér er profid ekki lengur ad maela
         thad sem for i loftid — sja kafla 12 um somu aett af villu. */
      available: boardish.sort((a, b) => a.aRank - b.aRank).map((r) => ({
        id: r.id, name: r.name, pos: r.pos, vbd: r.vbd,
        adp: r.adp, adpSd: r.adpSd, tier: r.tier, proj: r.proj,
        avail: r.avail, injury: r.injury,
      })),
      roster: [], pick: 55, league: L, nextPick: 66,
    });
    const inPicks = new Set(rec.picks.map((p) => p.id));
    const leaked = zero.filter((r) => inPicks.has(r.id));
    ok(leaked.length === 0,
      `enginn theirra ${zero.length} er i rodinni (${leaked.map((r) => r.name).join(", ") || "engir"})`);
    /* ============================================================
       TALAN VAR PINNUD UR SKRA SEM PIPELINAN ENDURSKRIFAR DAGLEGA
       ============================================================
       Þetta krafdist `sidelined.length > 0` — sem tharf ad MINNSTA KOSTI
       EINN `avail: 0` mann OFAN VID varamanns-linuna. 24.8.2026 voru 14
       slikir menn a bordinu en ENGINN theirra ofan vid linuna, svo
       fullyrdingin fell a rettum koda. Sama aett og allt annad sem er
       pinnad ur `players.json`: talan er DAEMI, ekki fasti (README 4b).

       Rett invariant er SKILYRT: se einhver klipptur, verdur hann ad
       bera astaedu. Se enginn klipptur er thad EKKI bilun — thad thydir
       ad enginn ospilandi madur var thess virdi ad nefna.
       Og til ad thetta verdi ekki tom fullyrding er THEKJAN maeld:
       `zero` VERDUR ad vera oteemt (annars profar kaflinn ekkert) og
       leka-fullyrdingin hér ofan er thad sem ber merkinguna.        */
    ok(zero.length > 0,
      `THEKJA: ${zero.length} menn med avail 0 i lauginni (0 vaeri togn)`);
    ok(rec.sidelined.every((s) => s.why && s.why.length > 12),
      `hver klipptur ber astaedu (${rec.sidelined.length} klipptir` +
      `${rec.sidelined.length === 0 ? " — enginn var ofan vid linuna i dag" : ""})`);
    /* ---- OG KASSINN NEFNIR EKKI ALLA. Þetta er a RAUNBORDINU thvi
       skurdurinn var maeldur thar: 13 menn med `avail: 0`, og gapid
       vid `vbd > 0` er MINNST 58 stig i thremur deildarlogunum
       (10-lida: +6,9 / -0,2 / -121,8). Talan er reiknud ur SOMU laug
       sem kassinn birtir, svo hun getur ekki rekid fra honum. ---- */
    ok(rec.sidelined.every((s) => s.vbd > 0),
      `enginn nefndur madur er undir varamanns-linunni (${rec.sidelined.map((s) => s.vbd).join(", ")})`);
    ok(rec.sidelined.length + rec.sidelinedBelowRepl === zero.length,
      `nefndir + taldir = ALLIR ${zero.length} (${rec.sidelined.length} + ${rec.sidelinedBelowRepl})`
      + " — enginn hverfur thegjandi");
    /* Og klippingin er RAUNVERULEG a bordinu i dag: væri hun ovirk
       vaeri talan hér 0 og fullyrdingin ofar satt af tomum astaedum. */
    ok(rec.sidelinedBelowRepl > 0,
      `THEKJA: ${rec.sidelinedBelowRepl} menn eru raunverulega klipptir a bordinu i dag`);
    ok(rec.sidelined.length < zero.length,
      `svo kassinn nefnir ${rec.sidelined.length} i stad ${zero.length}`);
    /* Og rodin ma ekki hafa tapad neinum odrum. */
    ok(rec.picks.length > 300,
      `rodin er enn full (${rec.picks.length} menn) — sian tok ekki heilbrigda med`);
  }

  /* ---- d) VIRAR: `DraftBoard` VERDUR ad senda thetta afram ----
     Reglan er hrein og profanleg, en hun er ONYT ef .jsx-skran
     sleppir svidinu — sem er EINMITT villan sem var. Sama gildra og
     `fetchLineups` i FPL-verkefninu, thar sem profid las KODA og var
     graent medan workflow-id sendi engan `env`. Hér er lesid ur
     upprunanum thvi engin onnur leid ser tenginguna; DOM-hlidin er i
     `tests/render.mjs`. */
  {
    const src = readFileSync(
      path.resolve(new URL(".", import.meta.url).pathname, "..", "src", "DraftBoard.jsx"),
      "utf8");
    const call = src.slice(src.indexOf("return recommend({"));
    const head = call.slice(0, call.indexOf("roster, pick, league"));
    ok(/avail:\s*r\.avail/.test(head),
      "DraftBoard sendir `avail` inn i recommend()");
    ok(/injury:\s*r\.injury/.test(head),
      "og `injury`, svo astaedan se nefnanleg");
  }
}

/* ============================================================
   15. TVEIR KOSTIR — OG RODIN MA EKKI HAFA HAGGAST
   ============================================================
   BEIDNI NOTANDANS 20.8.2026: "eg vill ad appid maeli med 2 leikmonnum.
   Thannig ad eg geti valid ut." Hun kom ur konkret bilun sem EITT nafn
   gat ekki synt:

     "Pick 17 — take this: TE Brock Bowers · 95% likely to still be
      here in 8 picks"

   Talan var rett og maeld — og hun stod sem ROKSTUDNINGUR fyrir vali sem
   var tekid a virdinu einu. Merkid motsagdi urskurdinum i sinu eigin
   spjaldi.

   PROFSTEINNINN ER FYRSTA FULLYRDINGIN: `choice.list[0]` VERDUR ad vera
   sami madur sem maelda rodin setur fyrstan. Vaeri annad saetid latid
   verda thad fyrsta — sem er einmitt thad sem "sydu bradanauðsyn inn"
   myndi gera — hefdi rodin verid yfirskrifud thegjandi, og HUN var maeld:
   bradanauðsyn sem rod tapar 60,06 stigum i standard (0 af 5 arum).

   Kaflinn ber lika Bowers-tilfellid sjalft med tolum sem gefa NAKVAEMLEGA
   thad astand: sa fyrri lifir (haerra ADP), sa seinni ekki.            */
console.log("\n15. tveir kostir, og maelda rodin heldur");
{
  const league = { teams: 10, rounds: 15, scoring: "ppr",
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
    maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 } };

  /* HANS EIGID TILFELLI: TE ofar a VBD og hann lifir; RB rett a eftir og
     hann fer. Bilid er 8 — talan sem gerir thetta ad vali. */
  const bowers = [
    { id: "te", name: "Brock Bowers", pos: "TE", vbd: 40, adp: 30, adpSd: 4, tier: 2 },
    { id: "rb", name: "Jahmyr Gibbs", pos: "RB", vbd: 32, adp: 17, adpSd: 3, tier: 2 },
    { id: "w1", name: "WR One", pos: "WR", vbd: 20, adp: 40, adpSd: 6, tier: 3 },
    { id: "w2", name: "WR Two", pos: "WR", vbd: 19, adp: 41, adpSd: 6, tier: 3 },
  ];
  const r = recommend({ available: bowers, roster: [], pick: 17, league, nextPick: 25 });

  /* --- PROFSTEINNINN --- */
  ok(r.choice && Array.isArray(r.choice.list) && r.choice.list.length === 2,
    `tveir kostir thegar tveir eru i bodi (${r.choice ? r.choice.list.length : "engir"})`);
  ok(r.choice.list[0].id === r.picks[0].id,
    `sa fyrri ER sa sem maelda rodin setur fyrstan (${r.choice.list[0].name})`);
  ok(r.orderedBy === "aRank" && MEASURED.urgencyDrivesOrder === false,
    "og rodin er afram A-Ranking — bradanauðsyn radar ENGU");
  /* Hin attin: annad saetid er raunverulega NAESTI madur i rodinni, ekki
     "sa sem bradanauðsyn hefdi valid" (`urgencyPick` er ser reitur og
     hann er EKKI thetta). */
  ok(r.choice.list[1].id === r.picks[1].id,
    `og sa seinni er naesti i rodinni (${r.choice.list[1].name})`);

  /* ============================================================
     OG ÞETTA ER FULLYRDINGIN SEM STOKKBREYTINGIN LIFDI AN
     ============================================================
     Fyrsta utgafa thessa kafla var GRAEN thott `choice.list` vaeri
     radad eftir bradanauðsyn — thvi i laug hennar er hun EKKI osammala
     VBD (McCaffrey er baedi haestur og bradastur). Fullyrding sem
     tharfnast thess ad tvaer radir seu osammala til ad bregdast er
     veikari en hun litur ut fyrir ad vera (CLAUDE.md 5b).

     Þessi laug er byggd svo raðirnar SEU osammala: WR-inn er haestur a
     VBD en stadan hans er DJUP (naesti WR er 38), svo bradanauðsyn hans
     er ~2. RB-inn er 8 laegri en stadan hans er TOM fyrir aftan (naesti
     RB er 5), svo bradanauðsyn hans er ~27. Bradanauðsyn myndi thvi
     setja RB-inn FYRSTAN — og hun var maeld og hun tapar.             */
  const flip = recommend({ available: [
    { id: "wr1", name: "Deep WR", pos: "WR", vbd: 40, adp: 12, adpSd: 3 },
    { id: "rb1", name: "Cliff RB", pos: "RB", vbd: 32, adp: 13, adpSd: 3 },
    /* Djupt fyrir aftan WR-inn (30, 29 lifa til vals 29) og HENGIFLUG
       fyrir aftan RB-inn (2). Þar med er bradanauðsyn RB-sins ~30 og
       WR-sins ~10, og TOPP-TVEIR a VBD eru samt wr1 og rb1. */
    { id: "wr2", name: "Deep WR2", pos: "WR", vbd: 30, adp: 60, adpSd: 4 },
    { id: "wr3", name: "Deep WR3", pos: "WR", vbd: 29, adp: 62, adpSd: 4 },
    { id: "rb2", name: "Scrub RB", pos: "RB", vbd: 2, adp: 70, adpSd: 5 },
  ], roster: [], pick: 12, league, nextPick: 29 });
  const uWr = flip.picks.find((p) => p.id === "wr1").urgency;
  const uRb = flip.picks.find((p) => p.id === "rb1").urgency;
  ok(uRb > uWr,
    `forsenda: bradanauðsyn er OSAMMALA rodinni (RB ${uRb} > WR ${uWr})`);
  ok(flip.urgencyPick && flip.urgencyPick.id === "rb1",
    `og bradanauðsyn hefdi valid RB-inn (${flip.urgencyPick
      ? flip.urgencyPick.name : "engan"})`);
  ok(flip.choice.list[0].id === "wr1",
    `EN fyrsti kosturinn er VBD-madurinn (${flip.choice.list[0].name})`);
  ok(flip.choice.list[1].id === "rb1",
    `og sa bradasti er ANNAR kosturinn — birtur, ekki radadur (${
      flip.choice.list[1].name})`);

  /* --- BILID: talan sem gerir tvo nofn ad vali --- */
  ok(r.choice.list[0].behind === 0,
    `sa fyrri er 0 fra sjalfum ser (${r.choice.list[0].behind})`);
  ok(Math.abs(r.choice.list[1].behind - 8) < 1e-9,
    `og sa seinni er 8 a eftir — sama tala sem VBD-in gefa (${r.choice.list[1].behind})`);

  /* --- LIFUN BEGGJA, ekki adeins thess sem er valinn --- */
  ok(r.choice.list.every((p) => p.survive != null),
    "lifunartala er til fyrir BADA — thad var motsognin sem var falin");
  ok(r.choice.list[0].survive > 0.7 && r.choice.list[1].survive < 0.25,
    `og thaer segja sitthvad (${r.choice.list[0].survive} / ${r.choice.list[1].survive})`);
  ok(r.choice.waitNote && /one order that can end with both/.test(r.choice.waitNote.text),
    `setningin um TIMASETNINGU er skrifud (${r.choice.waitNote
      ? r.choice.waitNote.text.slice(0, 60) : "engin"}…)`);
  /* OG HUN MA EKKI FAERA NEINN: hun er upplysing, ekki vog. */
  ok(r.picks[0].id === "te" && r.choice.list[0].id === "te",
    "og hun faerdi ENGAN — urskurdurinn er oskertur");

  /* --- ÞEGAR ENGIN SPURNING ER, ER ENGIN SETNING --- */
  const quiet = recommend({ available: [
    { id: "a", name: "A", pos: "RB", vbd: 40, adp: 30, adpSd: 4 },
    { id: "b", name: "B", pos: "WR", vbd: 32, adp: 31, adpSd: 4 },
  ], roster: [], pick: 17, league, nextPick: 25 });
  ok(quiet.choice.waitNote === null,
    "engin setning thegar lifunartolurnar segja thad sama (havadi er villan)");

  /* --- ÞRIDJA NAFNID ADEINS I SOMU STODU --- */
  const same = recommend({ available: [
    { id: "a", name: "WR A", pos: "WR", vbd: 50, adp: 5, adpSd: 3 },
    { id: "b", name: "WR B", pos: "WR", vbd: 45, adp: 6, adpSd: 3 },
    { id: "c", name: "RB C", pos: "RB", vbd: 30, adp: 9, adpSd: 3 },
  ], roster: [], pick: 3, league, nextPick: 18 });
  ok(same.choice.samePos === true && same.choice.alt && same.choice.alt.id === "c",
    `tveir i somu stodu -> thridji ur ANNARRI stodu (${same.choice.alt
      ? same.choice.alt.name : "enginn"})`);
  ok(same.choice.alt.behind === 20,
    `og bilid hans er maelt fra theim fyrsta (${same.choice.alt.behind})`);
  ok(same.choice.list[0].id === "a",
    "og hann faerdi ekki heldur neinn");
  ok(r.choice.alt === null,
    "en i olikum stodum er ENGINN thridji — hann vaeri matsedill");

  /* --- BADIR VERDA AD VERA RAUNVERULEGIR KOSTIR --- */
  const thin = recommend({ available: [
    { id: "a", name: "Worth It", pos: "WR", vbd: 5, adp: 100, adpSd: 9 },
    { id: "b", name: "Below Repl", pos: "WR", vbd: -3, adp: 120, adpSd: 9 },
  ], roster: [], pick: 140, league, nextPick: 149 });
  ok(thin.choice.list.length === 1 && thin.choice.list[0].id === "a",
    `adeins einn yfir varamanns-linunni -> EINN synur (${thin.choice.list.length})`);
  ok(thin.choice.aboveRepl === 1,
    "og talan er skiluð svo vidmotid geti SAGT thad i stad thess ad fylla i");
  ok(!thin.choice.list.some((p) => p.id === "b"),
    "madur undir varamanni er ALDREI annar kosturinn — thad vaeri padding");

  /* --- OG SA SEM SPILAR EKKI ER HVORKI FYRSTUR NE ANNAR ---
     `avail: 0` er tekinn ut ur rodinni (kafli 14) og sú sia er SAMA sian
     sem `choice` byggir a. Vaeri hun tvofold gaeti hun rekid i sundur. */
  const hurt = recommend({ available: [
    { id: "out", name: "Kittle", pos: "TE", vbd: 60, adp: 20, adpSd: 4,
      avail: 0, injury: "PUP" },
    { id: "ok1", name: "Fit One", pos: "RB", vbd: 40, adp: 22, adpSd: 4 },
    { id: "ok2", name: "Fit Two", pos: "WR", vbd: 30, adp: 24, adpSd: 4 },
  ], roster: [], pick: 10, league, nextPick: 20 });
  ok(hurt.choice.list.length === 2
     && !hurt.choice.list.some((p) => p.id === "out"),
    `sa sem spilar ekki er hvorugur kosturinn (${hurt.choice.list
      .map((p) => p.name).join(", ")})`);
  ok(hurt.sidelined.some((x) => x.id === "out"),
    "hann er samt NEFNDUR med astaedu — ekki thagður");
}

/* ============================================================
   16. `DEF` GEGN `DST` — TVAER STAFSETNINGAR A SAMA SAETI
   ============================================================
   Þetta var GRUNAD 20.8.2026 og afgreitt sem "ekki villan" — rettilega,
   thvi thad var ekki hun sem kostadi mock-draftid. En thad var afgreitt
   a EINNI leid (`startersFromRoster`, sem varpar `DEF -> DST`) og
   leidirnar eru ThRJAR. Su thridja — VISTAD ASTAND — slapp:

     `normalizeLeague` thvingadi TOLUNA i `starters` en EKKI HEITID.

   Deild sem ber `starters: { DEF: 1 }` gefur thvi
   `mustFill = [{ pos: "DEF" }]` medan HVER ROD i appinu ber `pos:
   "DST"` (`players.json` ber DST i ollum 32 lidum og ekkert annad).
   `NextPick` velur varnar-manninn med

       kdst.find((r) => rec.mustFill.some((m) => m.pos === r.pos))

   sem finnur tha ALDREI neinn: urskurdurinn nefnir aldrei vorn,
   `mustFillUrgent` stendur satt til draftsloka, notandinn faer "you
   still need DEF" i hverju vali og endar med TOMT varnar-saeti.

   Ekkert hrynur og engin tala er rong — stodurnar tvaer eru einfaldlega
   ekki sami strengurinn. Þad er sama aett og "tvo olik sjalfgefin
   `rounds`" i kafla 11 og `boardScope`-villan: TVAER UTGAFUR AF SOMU
   REGLU.

   PROFID ER TVIThAETT: (1) heitid er thvingad vid lestur, og (2) hver
   stada sem `mustFill` NEFNIR verdur ad vera stada sem rod GETUR borid
   — thad er invariantid sem hlidid i `NextPick` hvilir a.            */
console.log("\n16. `DEF` er thvingad i `DST` — mustFill ma aldrei nefna stodu sem engin rod ber");
{
  const { normalizeLeague, DEFAULT_LEAGUE } = await import("../src/build.js");

  /* ---- (1) heitid er thvingad ---- */
  const L = normalizeLeague({ teams: 10, rounds: 15, scoring: "ppr",
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DEF: 1 } });
  ok(L.starters.DST === 1 && L.starters.DEF === undefined,
    `starters.DEF -> DST (${JSON.stringify(L.starters)})`);
  /* Sleeper-heitin sem `normPos` ber: `PK` og `D/ST` lika. */
  const L2 = normalizeLeague({ starters: { PK: 1, "D/ST": 1 } });
  ok(L2.starters.K === 1 && L2.starters.DST === 1,
    `PK -> K og D/ST -> DST (${JSON.stringify(L2.starters)})`);
  /* Bædi stafsetningar i sama blobbi eru TVO saeti — sama og
     `startersFromRoster` gefur, sem TELUR saetin i fylkinu. */
  const L3 = normalizeLeague({ starters: { DEF: 1, DST: 1 } });
  ok(L3.starters.DST === 2,
    `DEF + DST i sama blobbi = tvo saeti (${JSON.stringify(L3.starters)})`);
  /* OG SUMMAN LYTUR SAMA THAKI OG LIDURINN. `int(n, 0, 6)` er thakid a
     EINU sviði; samlagning sem fer fram hja thvi er toluvorn sem gildir
     per svid en ekki per summu, og `replacementRanks` margfaldar saeti
     med lidum (12 x 12 = 144 DST-threp ur einu blobbi). Fullyrdingin er
     TVISKIPT svo hun geti ekki verid uppfyllt af klippingu EINNI:
     summan undir thakinu verdur ad standa OSKERT. */
  const L3b = normalizeLeague({ starters: { DEF: 6, DST: 6 } });
  ok(L3b.starters.DST === 6,
    `DEF: 6 + DST: 6 er klippt i 6, ekki 12 (${JSON.stringify(L3b.starters)})`);
  const L3c = normalizeLeague({ starters: { "D/ST": 2, DEF: 1 } });
  ok(L3c.starters.DST === 3,
    `en summa UNDIR thakinu stendur oskert (${JSON.stringify(L3c.starters)})`);
  /* Og thakid lika — thak a stodu sem rodirnar bera ekki bitur aldrei. */
  const L4 = normalizeLeague({ maxPos: { PK: 3 } });
  ok(L4.maxPos.K === 3 && L4.maxPos.PK === undefined,
    `maxPos.PK -> K (${JSON.stringify(L4.maxPos)})`);

  /* ---- (2) INVARIANTID SEM `NextPick` HVILIR A ----
     Hver stada sem `mustFill` nefnir verdur ad vera stada sem rod getur
     borid. Ordaforðinn er lesinn UR GOGNUNUM, ekki skrifadur hér — svo
     ny stada i `players.json` felli profid i stad thess ad thegja. */
  const POS_IN_DATA = new Set(
    JSON.parse(readFileSync(path.join(DATA, "players.json"), "utf8"))
      .map((p) => p.pos).filter(Boolean));
  ok(POS_IN_DATA.has("DST") && !POS_IN_DATA.has("DEF"),
    `gognin bera DST og ALDREI DEF (${[...POS_IN_DATA].sort().join(" ")})`);

  const av = [{ id: 1, name: "A", pos: "RB", vbd: 10, adp: 5, adpSd: 3, tier: 1, proj: 100 }];
  let bad = null;
  for (const raw of [{ QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 },
                     { QB: 1, RB: 2, WR: 2, TE: 1, PK: 1, "D/ST": 1 },
                     { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 }]) {
    const lg = normalizeLeague({ teams: 10, rounds: 15, starters: raw });
    const rec = recommend({ available: av, roster: [], pick: 5, league: lg, nextPick: 15 });
    for (const m of rec.mustFill) {
      if (m.pos !== "FLEX" && m.pos !== "SUPERFLEX" && !POS_IN_DATA.has(m.pos)) {
        bad = bad || `${JSON.stringify(raw)} -> mustFill nefnir "${m.pos}"`;
      }
    }
  }
  ok(!bad, `mustFill nefnir adeins stodur sem rod getur borid${bad ? ` — ${bad}` : ""}`);

  /* MAELITAEKID VERDUR AD GETA BRUGDIST: `recommend` faer deildina
     OSNERTA (an `normalizeLeague`) og THA a "DEF" ad sleppa i gegn —
     annars vaeri fullyrdingin ofan uppfyllt af thvi ad `mustFill` se
     alltaf tom, ekki af thvi ad vorpunin virki. */
  const rawLeague = { teams: 10, rounds: 15,
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 }, maxPos: DEFAULT_LEAGUE.maxPos };
  const leak = recommend({ available: av, roster: [], pick: 5, league: rawLeague, nextPick: 15 });
  ok(leak.mustFill.some((m) => m.pos === "DEF"),
    "an `normalizeLeague` NEFNIR mustFill \"DEF\" — svo hlidid er raunverulegt");
}

/* ============================================================
   17. AFGANGUR I MONNUDU SAETI — MAELDI FRADRATTURINN
   ============================================================
   Kafli 5 ver ad BRADANAUÐSYN radar EKKI (hun var maeld og tapadi
   60,06 stigum). Þessi kafli ver ad SU niðurstaða se ekki lesin of
   vitt: fradrattur fyrir mann sem thu getur EKKI BYRJAT er ONNUR
   spurning og hun var maeld sérstaklega — +65,4 stig og 10/11 ar i
   einvigi (11 timabil, FFToday), +84,9 og 5/5 (5 timabil, Sleeper).
   Sja `scripts/arank-need-lab.mjs` og notuna vid `needPenalty`.

   ÞRJAR FULLYRDINGAR, HVER MED SITT HLUTVERK:
     A. med TOMAN hop breytir fradratturinn ENGU — hann ma ekki vera
        almennt sia a stodur, adeins a afgang
     B. med saetid fullt vikur haerra hra VBD fyrir theim sem getur
        byrjad — OG kassinn faer `insteadOf` svo hann geti sagt thad.
        Þogul rodun sem stangast a vid birta VBD-tolu er thad sem
        gerir toluna otruverduga.
     C. hann er EKKI bradanauðsyn i dulargervi: sa sem er i stodu sem
        er TOM en verri madur ma ALDREI fara upp fyrir betri mann i
        stodu sem er lika opin. Fradratturinn ma ADEINS draga NIDUR.
   ============================================================ */
console.log("\n17. afgangur i monnudu saeti — fradratturinn");
{
  const LG = { teams: 12, rounds: 14, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
               /* THAKID ER RUMT VILJANDI: `maxPos` UTILOKAR mann alveg,
                  og tha vaeri profid ad maela thakid en ekki fradrattinn.
                  Þessi kafli snyst um manninn sem MA taka en aetti ekki. */
               flexPos: ["RB", "WR", "TE"], maxPos: { QB: 4, RB: 8, WR: 8, TE: 5 } };
  const st = startableSlots(LG);
  ok(st.QB === 1 && st.TE === 3 && st.RB === 4 && st.WR === 4,
    `byrjunarsaeti leidd ur deildinni: ${JSON.stringify(st)}`);
  /* SUPERFLEX-tilfellid er ekki tilgata: deildin ber thad svid og
     `startableSlots` er eina utfaerslan sem les thad. */
  const sf = startableSlots({ starters: { QB: 1, RB: 2, WR: 2, TE: 1, SUPERFLEX: 1 },
                              flexPos: ["RB", "WR", "TE"] });
  ok(sf.QB === 2, `superflex telst med QB (${sf.QB})`);

  const mk = (id, pos, vbd, adp) => ({ id, name: `${pos}${id}`, pos, vbd, adp, adpSd: 5,
                                       proj: 100 + vbd, tier: 1, avail: 1 });
  /* TE er BETRI a hra VBD — thad er forsendan sem gerir profid marktaekt. */
  const av = [mk("t1", "TE", 60, 20), mk("r1", "RB", 40, 22), mk("w1", "WR", 38, 24),
              mk("r2", "RB", 30, 40), mk("t2", "TE", 25, 45), mk("q1", "QB", 20, 50)];

  /* ---- A. tomur hopur: hra rodin stendur ---- */
  const empty = recommend({ available: av, roster: [], pick: 20, league: LG, nextPick: 30 });
  ok(empty.picks[0].id === "t1",
    `A: med toman hop stendur haesta VBD efst (${empty.picks[0].id})`);
  ok(!empty.picks[0].insteadOf, "A: og engin skyring er gefin thvi engu var vikid");

  /* ---- B. TE-saetid fullt: sa sem getur byrjad tekur vid ---- */
  const full = recommend({ available: av,
    roster: [{ pos: "TE" }, { pos: "TE" }, { pos: "TE" }],
    pick: 20, league: LG, nextPick: 30 });
  ok(full.picks[0].id === "r1",
    `B: med thrja TE (byrjar 3) vikur TE fyrir RB (${full.picks[0].id})`);
  /* `insteadOf` LIGGUR A URSKURDINUM (`choice.list[0]`), ekki a
     `picks[0]` — thad er kassinn sem birtir hann, og thad var einmitt
     villan sem fannst 29.8.2026: hann sat a rongum lista og
     urskurdurinn var valinn eftir HRAU gildi thott rodin vaeri
     leidrett. Fullyrdingin er thvi um SAMA hlut og skjarinn les. */
  const io = full.choice.list[0].insteadOf;
  ok(full.choice.list[0].id === "r1",
    `B: og URSKURDURINN sjalfur (choice.list[0]) er sami madur (${full.choice.list[0].id})`);
  ok(io && io.id === "t1" && io.have === 3 && io.startable === 3,
    `B: og \`insteadOf\` nefnir manninn sem var vikid (${io ? io.id : "ekkert"})`);
  ok(full.picks.find((p) => p.id === "t1").vbd === 60,
    "B: BIRTA VBD-talan er OHREYFD — fradratturinn radar, hann skrifar ekki");
  /* Stiga-staerdin sjalf: 60 - 30 = 30 < 40, svo rodin snyst vid. Vaeri
     `NEED_K` sett i 0 stæði TE afram efstur — thad er stokkbreytingin. */
  ok(NEED_K > 20 && NEED_K < 61,
    `B: \`NEED_K\` er innan maelda flata bilsins 15-60 (${NEED_K})`);
  ok(needPenalty("TE", { TE: 3 }, st) === NEED_K,
    "B: fyrsti afgangs-madur ber NAKVAEMLEGA einn K, ekki tvo");
  ok(needPenalty("TE", { TE: 2 }, st) === 0,
    "B: og sa sem KEMST i byrjunarlid ber ENGAN");

  /* ---- D. HRAA LINAN MA EKKI YFIRTAKA RODINA ----
     Þetta er tilfellid ur raunverulegu drafti notandans (val 102): sa
     eini sem er yfir varamanni A HRAA KVARDANUM er afgangs-madurinn
     sjalfur. Vaeri `above` sift a hrau gildi yrdi HANN urskurdurinn og
     allur fradratturinn kaemist aldrei a skjainn — kodinn reiknadur,
     talan aldrei birt. */
  const only = [mk("q2", "QB", 7, 60), mk("w9", "WR", -6, 62), mk("w8", "WR", -11, 64)];
  const surplusQb = recommend({ available: only, roster: [{ pos: "QB" }],
    pick: 60, league: LG, nextPick: 70 });
  ok(surplusQb.choice.list[0].id === "w9",
    `D: afgangs-QB med JAKVAETT hra VBD vikur samt (${surplusQb.choice.list[0].id})`);
  ok(surplusQb.choice.aboveRepl === 0,
    `D: og "yfir varamanni" er talid a SAMA kvarda og rodin (${surplusQb.choice.aboveRepl})`);
  ok(surplusQb.choice.list[0].insteadOf
     && surplusQb.choice.list[0].insteadOf.id === "q2",
    "D: og kassinn nefnir QB-inn sem var vikid");

  /* ---- C. ekki bradanauðsyn i dulargervi ---- */
  const openBoth = recommend({ available: av, roster: [{ pos: "RB" }],
    pick: 20, league: LG, nextPick: 30 });
  ok(openBoth.picks[0].id === "t1",
    `C: badar stodur opnar -> BESTI madurinn, ekki sa i tomari stodu (${openBoth.picks[0].id})`);
  const wOrder = openBoth.picks.map((p) => p.id);
  ok(wOrder.indexOf("r1") < wOrder.indexOf("w1"),
    "C: og innan opinna stada helst hra VBD-rodin oskert");
  /* Fradratturinn er per STODU, svo hann getur aldrei vixlad tveimur
     monnum i SOMU stodu — thad er invariant, ekki tilviljun. */
  const two = recommend({ available: av, roster: [{ pos: "TE" }, { pos: "TE" }, { pos: "TE" }],
    pick: 20, league: LG, nextPick: 30 });
  const ord = two.picks.map((p) => p.id);
  ok(ord.indexOf("t1") < ord.indexOf("t2"),
    "C: og TE1 er afram a undan TE2 thott badir beri sama fradratt");
}

/* ============================================================
   18. ÞAD SEM RYNNIN FANN — FJOGUR TILFELLI SEM VORU RONG
   ============================================================
   Kafli 17 varði rodina en EKKI thad sem birtist. Ovilhöll rynni
   29.8.2026 keyrdi jaðartilfellin og fann fjogur:

     E. superflex-deild sem ber FLAGGID (`league.superflex: true`) en
        ekkert `SUPERFLEX`-saeti — `model.js`, `sleeper-league.js` og
        `DraftBoard.jsx` lesa OLL flaggid, en `startableSlots` gerdi
        thad ekki. Annar QB fekk fradratt thott hann byrji hverja viku.
     F. `superflexPos` (Sleeper skrifar `["QB","RB","WR","TE"]`) var
        hunsad, svo RB3 bar fradratt i raunverulegri superflex-deild.
     G. deild AN `starters` fekk 0 saeti i hverri stodu -> HVER madur
        bar fradratt med TOMAN hop. "Tomt gildi er ekki null".
     H. VARAMANNS-KASSINN gat verid nakvaemlega sa sem urskurdurinn
        hafnadi: "take: VBD 40 — TE X er 60 en thu byrjar 3" og vid
        hlidina "backup: 10 VBD behind him — VBD 60,0". Haerri tala,
        sogd a eftir, med "take"-hnapp.

   HVER GREIN VAR STOKKBREYTT: se lagfaeringin afturkolluð fellur hun.
   ============================================================ */
console.log("\n18. jaðartilfellin ur rynninni");
{
  const mk = (id, pos, vbd, adp) => ({ id, name: `${pos}${id}`, pos, vbd, adp, adpSd: 5,
                                       proj: 100 + vbd, tier: 1, avail: 1 });
  const av = [mk("q1", "QB", 50, 10), mk("q2", "QB", 45, 12), mk("r1", "RB", 30, 14),
              mk("w1", "WR", 25, 16), mk("t1", "TE", 20, 18)];

  /* ---- E. superflex sem FLAGG ---- */
  const sfFlag = { teams: 12, rounds: 14, starters: { QB: 1, RB: 2, WR: 2, TE: 1 },
                   superflex: true, flexPos: ["RB", "WR", "TE"],
                   maxPos: { QB: 4, RB: 8, WR: 8, TE: 4 } };
  ok(startableSlots(sfFlag).QB === 2,
    `E: \`superflex: true\` gefur QB TVO saeti (${startableSlots(sfFlag).QB})`);
  /* PARID ER PROFID: SAMA inntak i tveimur deildum sem eru eins ad
     ollu leyti nema superflex-saetinu. An thess er "QB stendur efstur"
     satt af thvi ad hann er hvort ed er bestur — tom fullyrding. */
  const sfRec = recommend({ available: av, roster: [{ pos: "QB" }], pick: 20,
    league: sfFlag, nextPick: 30 });
  const oneQb = recommend({ available: av, roster: [{ pos: "QB" }], pick: 20,
    league: { ...sfFlag, superflex: false }, nextPick: 30 });
  ok(sfRec.choice.list[0].pos === "QB",
    `E: i superflex-deild stendur QB efstur med einn i hop (${sfRec.choice.list[0].id})`);
  ok(oneQb.choice.list[0].pos !== "QB",
    `E: en i EINS-QB deild vikur hann — sama inntak, onnur deild (${oneQb.choice.list[0].id})`);
  ok(!sfRec.choice.list[0].insteadOf && !!oneQb.choice.list[0].insteadOf,
    "E: og skyringin birtist NAKVAEMLEGA i theirri seinni");
  ok(sfRec.picks.every((p) => p.pos !== "QB" || (p.needPenalty || 0) === 0),
    "E: enginn QB ber fradratt i superflex-deild");

  /* ---- F. `superflexPos` ---- */
  const sfPos = { ...sfFlag, superflex: false,
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, SUPERFLEX: 1 },
    superflexPos: ["QB", "RB", "WR", "TE"] };
  const st2 = startableSlots(sfPos);
  ok(st2.RB === 3 && st2.QB === 2,
    `F: superflex-saetid telst med OLLUM stodum sem thad tekur (${JSON.stringify(st2)})`);

  /* ---- G. engin uppstilling -> ENGINN fradrattur ---- */
  const bare = { teams: 12, rounds: 14, maxPos: { QB: 4, RB: 8, WR: 8, TE: 4 } };
  ok(Object.keys(startableSlots(bare)).length === 0,
    "G: deild an `starters` gefur ENGA tolu — ekki 0 saeti");
  const bareRec = recommend({ available: av, roster: [], pick: 5, league: bare, nextPick: 15 });
  ok(bareRec.choice.list[0].id === "q1",
    `G: og med toman hop stendur hra rodin oskert (${bareRec.choice.list[0].id})`);
  ok(bareRec.picks.every((p) => (p.needPenalty || 0) === 0),
    "G: enginn ber fradratt thegar uppstillingin er OTHEKKT");

  /* ---- H. varamadurinn er ALDREI sa sem var hafnad ---- */
  const LG = { teams: 12, rounds: 14, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
               flexPos: ["RB", "WR", "TE"], maxPos: { QB: 4, RB: 8, WR: 8, TE: 5 } };
  const three = [{ pos: "TE" }, { pos: "TE" }, { pos: "TE" }];
  const board = [mk("t9", "TE", 60, 20), mk("r9", "RB", 40, 22), mk("w9", "WR", 25, 24)];
  const h = recommend({ available: board, roster: three, pick: 30, league: LG, nextPick: 42 });
  const names = h.choice.list.map((p) => p.id);
  ok(!names.includes("t9"),
    `H: afgangs-TE er HVORUGUR kassinn (${names.join(", ")})`);
  ok(names[0] === "r9" && names[1] === "w9",
    `H: kassarnir eru tveir bestu sem THU getur byrjad (${names.join(", ")})`);
  /* Og tha — og adeins tha — er "N VBD behind him" satt um TOLURNAR
     sem standa a kossunum. Þetta er greinin sem vantadi: hun fellur ef
     `behind` er reiknad a odrum kvarda en kassarnir birta. */
  ok(Math.abs(h.choice.list[1].behind - (board[1].vbd - board[2].vbd)) < 0.05,
    `H: og bilid er NAKVAEMLEGA munur birtu talnanna (${h.choice.list[1].behind} = 40 - 25)`);
  ok(h.choice.list[0].insteadOf && h.choice.list[0].insteadOf.id === "t9",
    "H: og sa sem var vikid er nefndur i setningu i stadinn");
  /* ============================================================
     OG ÞEGAR BADIR KASSAR BERA FRADRATT — SITTHVORN
     ============================================================
     Fyrri greinin (H) getur EKKI greint hvort `behind` er reiknad a
     hrau eda leidrettu gildi, thvi tha bera kassarnir ENGAN fradratt og
     bilid er hid sama a badum kvordum. Stokkbreyting (`behind` aftur a
     hratt) slapp thvi i gegn — fullyrding sem tharf tvennt til ad
     bregdast er veikari en hun litur ut fyrir ad vera (CLAUDE.md 5b).

     Hér er tilfellid smiðad svo kvardarnir TVEIR skilji: fjorir TE
     (afgangur 2 -> -60) og fjorir RB (afgangur 1 -> -30). Hratt bil er
     60, leidrett 30. Talan sem RÆÐUR er su leidretta — og kassinn ber
     fradrattinn synilegan svo hun stangist ekki a vid birtu toluna. */
  const deep = [...three, { pos: "TE" }, { pos: "RB" }, { pos: "RB" },
                { pos: "RB" }, { pos: "RB" }];
  const bothPen = recommend({
    available: [mk("t5", "TE", 100, 30), mk("r5", "RB", 40, 32)],
    roster: deep, pick: 60,
    league: { ...LG, maxPos: { QB: 4, RB: 9, WR: 9, TE: 9 } }, nextPick: 72 });
  const [c0, c1] = bothPen.choice.list;
  ok(c0 && c1 && c0.needPenalty === 60 && c1.needPenalty === 30,
    `H2: kassarnir bera SITTHVORN fradrattinn (${c0 && c0.needPenalty}/${c1 && c1.needPenalty})`);
  ok(Math.abs(c1.behind - 30) < 0.05,
    `H2: og bilid er a ThVI GILDI SEM RADAR (${c1.behind}; hratt vaeri 60)`);

  /* Se EKKERT oskadd eftir fa their kassana — bordid a ekki ad thagna. */
  const onlySurplus = recommend({ available: [mk("t8", "TE", 60, 20), mk("t7", "TE", 50, 22)],
    roster: three, pick: 30, league: LG, nextPick: 42 });
  ok(onlySurplus.choice.list.length >= 1 && onlySurplus.choice.list[0].id === "t8",
    "H: en se ekkert annad til stendur besti afgangs-madurinn — engin thogn");
}

/* ============================================================
   19. DRAFT-KVOLDS LAGFAERINGARNAR (31.8.2026)
   ============================================================
   Þrjar rynnir voru keyrdar tveimur dogum fyrir raunverulegt draft.
   Þessi kafli ver thad sem thaer fundu:

     A. TOM BYRJUNARSAETI I QB/RB/WR/TE voru OSYNILEG. `mustFill`
        sleppir hverri stodu sem `expNext` thekkir — sem er einmitt
        thessar fjorar, ALLTAF — svo hopur med 5 RB / 8 WR, EITT val
        eftir og ekkert QB fekk "Still to fill: 1 K, 1 DST" og vorn
        sem urskurd.
     B. og advorunin ma ekki tala i FYRSTU UMFERD, thar sem oll saeti
        eru tom med byggingu.
     C. NAESTA VAL var reiknad ur snakk-rodinni thegar saetid var
        othekkt — tha er thad saeti ANNARS MANNS, og kassinn hengdi
        lifunar-prosentu a thad.
     D. AUDA VIKAN var toldud INNAN stodu, svo fjorir byrjunarmenn ur
        leik i somu viku lasust sem "2 RB" og lentu UNDIR skaðlausum
        "3 WR".
   ============================================================ */
console.log("\n19. draft-kvolds lagfaeringarnar");
{
  const LG = { teams: 12, rounds: 14,
               starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 },
               flexPos: ["RB", "WR", "TE"], maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 } };
  const mk = (id, pos, vbd, bye) => ({ id, name: `${pos}${id}`, pos, vbd, adp: 100,
                                       adpSd: 10, proj: 100 + vbd, avail: 1, bye });
  const many = (pos, n) => Array.from({ length: n }, () => ({ pos }));

  /* ---- A. holan i QB/TE SEST ---- */
  const late = recommend({
    available: [mk("d1", "DST", 5), mk("q1", "QB", 3), mk("t1", "TE", 2)],
    roster: [...many("RB", 5), ...many("WR", 8)],
    pick: 130, league: LG, nextPick: null });
  const holes = (late.emptyStarters || []).map((m) => m.pos);
  ok(holes.includes("QB") && holes.includes("TE"),
    `A: tom byrjunarsaeti i QB og TE eru NEFND (${holes.join(",") || "engin"})`);
  ok(late.holes === 4 && late.holesForced === true,
    `A: fjorar holur og eitt val -> thvingun (holes ${late.holes}, forced ${late.holesForced})`);
  /* K/DST-leidin er MAELD og verdur ad standa oskert vid hlidina. */
  ok(late.mustFill.some((m) => m.pos === "K") && late.mustFill.some((m) => m.pos === "DST"),
    "A: og K/DST-leidin er OHREYFD — bædi svorin eru til");

  /* ---- B. ThOGN I FYRSTU UMFERD ---- */
  const first = recommend({
    available: [mk("r1", "RB", 90), mk("w1", "WR", 80)],
    roster: [], pick: 1, league: LG, nextPick: 24 });
  ok(first.emptyStarters.length === 4,
    `B: med toman hop eru OLL fjogur saetin tom (${first.emptyStarters.length})`);
  ok(first.holesUrgent === false,
    "B: en advorunin ThEGIR — 14 vol gegn 6 holum er ekki neyd");
  ok(late.holesUrgent === true, "B: og hun TALAR thegar valin thrjota");

  /* ---- C. NAESTA VAL: SAETI EDA AFLEIDSLA ---- */
  const seat = recommend({ available: [mk("r1", "RB", 90)], roster: [],
    pick: 13, league: LG, nextPick: 19 });
  ok(seat.nextPickFrom === "seat" && seat.nextPick === 19,
    `C: gefid saeti -> "seat" (${seat.nextPickFrom}, ${seat.nextPick})`);
  const derived = recommend({ available: [mk("r1", "RB", 90)], roster: [],
    pick: 13, league: LG });
  ok(derived.nextPickFrom === "derived" && derived.nextPick > 13,
    `C: ekkert saeti -> "derived" (${derived.nextPickFrom}, ${derived.nextPick})`);
  ok(seat.nextPickFrom !== derived.nextPickFrom,
    "C: og svidin TVO eru greinanleg — thogult rett og thogult rangt lita eins ut");

  /* ---- D. AUDA VIKAN ER VIKA ---- */
  const byes = recommend({ available: [mk("r9", "RB", 5)],
    /* VERSTA VIKAN ER SEINNA EN SU SKADLAUSA — ÞAD ER PROFSTEINNINN.
       Fyrsta utgafa setti hana i viku 6 og hina i 11, svo rodun eftir
       VIKU gaf sama svar og rodun eftir FJOLDA: stokkbreytingin slapp i
       gegn (0 fallnar). Nu er thad ekki haegt.
         vika 11: RB+RB+WR+TE = FJORIR byrjunarmenn ur leik  <- verst
         vika  6: ThRIR WR — flest INNAN stodu, en skaðlausara */
    roster: [{ pos: "RB", bye: 11 }, { pos: "RB", bye: 11 }, { pos: "WR", bye: 11 },
             { pos: "TE", bye: 11 }, { pos: "WR", bye: 6 }, { pos: "WR", bye: 6 },
             { pos: "WR", bye: 6 }],
    pick: 90, league: LG, nextPick: 100 });
  ok(byes.byeWeeks && byes.byeWeeks[0].week === 11 && byes.byeWeeks[0].n === 4,
    `D: versta vikan er VIKA 11 med FJORA, thott vika 6 se BADI fyrr OG ` +
    `flest innan stodu (${byes.byeWeeks && byes.byeWeeks[0].week}` +
    `/${byes.byeWeeks && byes.byeWeeks[0].n})`);
  /* Gamla talningin setti "3 WR i viku 11" fyrst — hun er ENN til (maeld
     sem samhengi) og ma ekki hafa horfid, en hun radar ekki lengur. */
  ok(byes.byeClash && byes.byeClash[0].n === 3 && byes.byeClash[0].pos === "WR"
     && byes.byeClash[0].bye === 6,
    "D: og gamla talningin innan stodu stendur oskert (hun er maeld sem samhengi)");
  ok(byes.byeWeeks[0].byPos.RB === 2 && byes.byeWeeks[0].byPos.TE === 1,
    "D: sundurlidun per stodu fylgir, svo hann sjai HVERJA hann missir");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
