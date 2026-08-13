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
  recommend, SD_K, MEASURED, nextOwnPick,
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

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
