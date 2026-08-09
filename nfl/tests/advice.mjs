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
  recommend, SD_K, MEASURED,
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

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
