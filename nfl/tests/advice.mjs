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
    ok(rec.sidelined.length > 0 && rec.sidelined.every((s) => s.why && s.why.length > 12),
      `og allir ${rec.sidelined.length} bera astaedu (>12 stafir)`);
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

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
