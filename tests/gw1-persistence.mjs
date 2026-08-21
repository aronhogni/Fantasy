/* ============================================================
   GW1-LIDID VERDUR AD LIFA HARDA ENDURHLEDSLU — HRINGFERD MED
   TVEIMUR OHADUM HLEDSLUM

   BEIDNI NOTANDANS 20.8.2026, DAGINN FYRIR FRESTINN:
     "Eg vill t.d. ad gameweek 1 lidid vistist rett thannig ad ef eg hard
      reloda se thad enn thar."

   HVERS VEGNA ThETTA ER ANNAD SAFN EN `untrusted-input.mjs`:
   thad safn ber tvaer fullyrdingar um vistad astand og HVORUG svarar
   thessari beidni.
     A-kaflinn spyr hvort SKEMMT blob felli appid  — hann profar villuleid.
     A2-kaflinn les blobbid AFTUR UR SOMU HLEDSLU — thad profar SKRIFIN.
   Hvorugt er hord endurhledsla. Hord endurhledsla er thegar **ekkert
   nema baetin i `localStorage`** kemst yfir markalinuna: nyr `window`,
   ny React-rot, ekkert state i minni. Villa sem byr i LESTRINUM (svid
   sem er skrifad rett en lesid rangt) er OSYNILEG i A2, thvi thar er
   samanburdurinn gerdur adur en nokkur les blobbid aftur.

   ThVI ER HVER ATBURDARAS KEYRD TVISVAR:
     hledsla 1:  blob0 -> state -> DOM      (vid lesum DOM og blob1)
     RIF NIDUR:  root.unmount(), JSDOM-inum fleygt
     hledsla 2:  blob1 -> state -> DOM      (NYTT window, ny localStorage)
   og thad sem er fullyrt er ad DOM-MYNDIN SE SU SAMA — lidid, fyrirlidinn,
   varafyrirlidinn, bekkjar-rodin, uppstillingin, bankinn — svid fyrir svid,
   ekki bara "appid teiknadist".

   VORDUR A MAELITAEKINU SJALFU (kafli 0, CLAUDE.md 5b regla 2):
   "hledsla 2 syndi thad sama" er TAUTOLOGIA ef hledsla 2 les i raun ekki
   `localStorage` heldur situr a modul-kaesju fra hledslu 1 (`import`
   kaesar `src/App.jsx` milli hledslna og `src/storage.js` geymir
   `_storeMode` a modul-svidi). Kafli 0 gefur hledslu 2 ANNAD blob og
   krefst ANNARS lids. Fari sa kafli i graent an thess, maelir allt
   safnid ekkert.

   KAFLAR
     0   MAELITAEKID     — hledsla 2 les raunverulega storage
     1-5 ATBURDARASIR    — tomt · fullir 15 · minus-banki · Bench Boost · GW1-6
     R1  GW1-KOSTNADUR   — er hann LEIDDUR? (ekkert i blobbinu ma bera hann)
     R2  MINUS-BANKI     — lifir sem MINUS, aldrei klipptur i 0 ne NaN
     R3  BENCH BOOST     — `starter`-mengid OBREYTT thott 15 seu a vellinum
     R4  GERD-ThVINGUN   — hun ma ekki EYDA gildu astandi
     R5  GAMALT BLOB     — snidid breyttist ekki i dag; blob fra i gaer les
     R6  START_SQUAD     — PINNAD: hvert vistad `plan` hangir a thvi
     R7  HAEG SOKN       — vistad astand OG haeg sokn i einu (CLAUDE.md 13)

   ATTA STOKKBREYTINGAR STADFESTAR (engin hrundi safninu, allar felldu
   NEFNDA fullyrdingu):
     1 `captain` fellt ur `saveState`      -> 5 fullyrdingar
     2 `setVice(int(s.vice))` -> `null`    -> 2  (BADAR nyjar; hringferdin
                                               ein er BLIND a samhverfa
                                               bilun i lestri)
     3 `Math.max(0, bank)`                 -> 4
     4 `rowArr`: `!= null` -> `== null`    -> 25
     5 `unlimitedBy` VISTAD i blobbinu     -> 4
     6 BB setur `starter:true` a alla 15   -> 3
     7 `priceFloors(players = [])` (afturkollun a CLAUDE.md 13-lagfaeringu)
                                           -> 4, og ThRESKULDURINN MAELDIST
                                              AFTUR: 1 ms teiknast, 5 ms og
                                              40 ms kasta "players is not
                                              iterable" — nakvaemlega thad
                                              sem skjalid segir
     8 eitt id breytt i `START_SQUAD`      -> 6
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

let pass = 0, fail = 0;
const ok = (c, n, x = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                 : (fail++, console.log(`  ✗ ${n}${x ? "   " + x : ""}`)); };

const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
const ALL = J("players.json").players;
const byId = {}; ALL.forEach(p => byId[p.id] = p);
/* OLL `web_name` — notad til ad THEKKJA nafna-holfid a spjaldinu ur DOM
   an thess ad giska a stil. Sja `cardName`.                            */
const NAMES = new Set(ALL.map(p => p.web_name));

/* PROFLIDID: sama `START_SQUAD` sem App.jsx notar ef ekkert FPL-lid er
   tengt (sama listi og i `smoke.test.mjs` og `planner-pitch.mjs`).     */
const START_IDS = [496,11,356,423,542,397,426,239,368,411,346,497,173,278,321];
const SS = new Set(START_IDS);

const realSetTimeout = globalThis.setTimeout;
const sleep = ms => new Promise(r => realSetTimeout(r, ms));

/* `boot` VAR SKILGREINDUR HER OG ER NU I `lib/boot-blob.mjs` — sja
   hausinn thar. `initial-squad.mjs` kafli H2 les SOMU utfaersluna, thvi
   „les gamalt blobb thad sama sem adur?" er sama ferdin og thetta safn
   ver, og tvo harness fyrir eina ferd geta rekid i sundur i thogn.     */
import { boot } from "./lib/boot-blob.mjs";

/* ---------- DOM-LESTUR ----------
   Allt her er lesid AF SKJANUM. Engin state-uppfletting, engin
   endurreikning — annars vaeri thetta onnur utfaersla vid hlidina a
   appinu (sbr. `buildTeamMetrics`, CLAUDE.md kafli 7).               */

/* Spjold: `draggable="true"` er ADEINS a `PlayerCard`.                */
const cards = v => v.q('[draggable="true"]');
/* `S.rowsArea` er eina umgjordin i vellinum med `space-evenly`.       */
const rowsArea = v => v.q(".fpl-pitch div").find(d =>
  /justify-content:\s*space-evenly/.test(d.getAttribute("style") || ""));
/* Nafnid a spjaldinu: `S.pName` er eina holfid med `text-overflow`, og
   textinn verdur AUK ThESS ad vera raunverulegt `web_name`. Tvo skilyrdi
   thvi stilar breytast og nofn geta verid undirstrengir hvers annars. */
function cardName(c) {
  for (const d of c.querySelectorAll("div")) {
    if (!/text-overflow/.test(d.getAttribute("style") || "")) continue;
    const t = (d.textContent || "").trim();
    if (NAMES.has(t)) return t;
  }
  return null;
}
/* Stodu-radirnar 1-4 i rod, hver med sinum spjoldum i BIRTINGAR-ROD.  */
function pitchRows(v) {
  const a = rowsArea(v);
  if (!a) return null;
  return [...a.children].map(row => [...row.querySelectorAll('[draggable="true"]')].map(cardName));
}
/* Bekkurinn: `S.benchArea` er eina umgjordin med thennan bakgrunn.    */
function benchRow(v) {
  const b = v.q("div").find(d => /rgba\(9,\s*24,\s*15,\s*0\.78\)/.test(d.getAttribute("style") || ""));
  return b ? [...b.querySelectorAll('[draggable="true"]')].map(cardName) : null;
}
/* Fyrirlida-/varafyrirlida-vallistarnir: `S.capSel` er eini stillinn med
   `max-width:120px`. Fyrsti = C, annar = V. `options` a fyrsta listanum
   ER `starters`-mengid — thad er lesid i R3.                          */
const capSels = v => v.q("select").filter(s => /max-width:\s*120px/.test(s.getAttribute("style") || ""));
/* Maelabords-holf (`Stat`): `statLbl` ber "<ikon><heiti>", `statVal` er
   naesta holf og `statSub` thad thar naest.
   ThRJU HOLF ERU TIL — Bank · Total points · Gameweek N — OG ENGIN ONNUR.
   Fyrsta utgafa thessa profs las "💎Squad value" og "✂Transfers", sem eru
   EKKI TIL: `stat()` skiladi `null`, og fullyrdingin `null === null`
   STODST. Tvaer tomar fullyrdingar, nakvaemlega aettin sem CLAUDE.md 5b
   lysir. Lidsverdid og refsingin bua i UNDIRTEXTANUM a Bank/Gameweek, svo
   thad er thangad sem er lesid — og forsendurnar nedar ver-
   ja ad thau seu ekki tom (sja `forsenda: lidsverdid er lesid`). */
function stat(v, label) {
  const l = v.q("div").find(d => (d.textContent || "").trim() === label);
  if (!l) return { val: null, sub: null };
  const val = l.nextElementSibling;
  const sub = val && val.nextElementSibling;
  return { val: val ? (val.textContent || "").trim() : null,
           sub: sub ? (sub.textContent || "").trim() : null };
}

/* HEIL MYND AF ThVI SEM NOTANDINN A. Thetta er thad sem verdur ad vera
   eins fyrir og eftir endurhledslu.                                   */
function snapshot(v) {
  const sels = capSels(v);
  return {
    rows: pitchRows(v),
    bench: benchRow(v),
    captain: sels[0] ? sels[0].value : null,
    captainName: sels[0] ? (sels[0].selectedOptions[0]?.textContent ?? null) : null,
    vice: sels[1] ? sels[1].value : null,
    viceName: sels[1] ? (sels[1].selectedOptions[0]?.textContent ?? null) : null,
    /* `starters`-mengid, lesid gegnum vallistann — sja R3.             */
    starterOpts: sels[0] ? [...sels[0].options].map(o => o.textContent).sort() : null,
    bank: stat(v, "💰Bank").val,
    /* LIDSVERDID er i undirtextanum a Bank-holfinu ("squad £98.5 · …"). */
    bankSub: stat(v, "💰Bank").sub,
    /* REFSINGIN er i undirtextanum a Gameweek-holfinu ("planned hit -16"). */
    gwSub: stat(v, "📅Gameweek 1").sub,
  };
}
const NANRE = /\bNaN\b|\bundefined\b|\[object Object\]/;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const flat = s => (s.rows || []).flat().concat(s.bench || []);

/* ============================================================
   ATBURDARASIRNAR — BYGGDAR UR `data/`, EKKI HARDKODADAR

   Verdin i `players.json` hreyfast, svo hardkodadur hopur myndi
   ThOGULT haetta ad kosta thad sem profid segir (sama gildra og
   "4-10 og aldrei 1" i `stats.js`, CLAUDE.md kafli 8). `buildSquad`
   byggir 15 manna hop ur listanum: sama stada i hverju saeti,
   <=3 per felag, engin id sem er ThEGAR i `START_SQUAD`, og
   heildarverd nakvaemlega `target` tiundir.
   ============================================================ */
function buildSquad(target) {
  const used = new Set(), clubs = {}, out = [];
  for (const id of START_IDS) {
    const et = byId[id].element_type;
    const c = ALL.filter(p => p.element_type === et && !used.has(p.id) && !SS.has(p.id))
      .sort((a, z) => a.now_cost - z.now_cost || a.id - z.id)
      .find(p => (clubs[p.team] || 0) < 3);
    clubs[c.team] = (clubs[c.team] || 0) + 1; used.add(c.id); out.push(c);
  }
  let total = out.reduce((a, p) => a + p.now_cost, 0), guard = 0;
  while (total < target && guard++ < 500) {
    let best = null;
    for (let i = 0; i < out.length; i++) {
      const cur = out[i];
      for (const p of ALL) {
        if (p.element_type !== cur.element_type || used.has(p.id) || SS.has(p.id)) continue;
        const d = p.now_cost - cur.now_cost;
        if (d <= 0 || total + d > target) continue;
        const cl = { ...clubs }; cl[cur.team]--;
        if ((cl[p.team] || 0) >= 3) continue;
        if (!best || d > best.d) best = { i, p, d, cur };
      }
    }
    if (!best) break;
    clubs[best.cur.team]--; used.delete(best.cur.id);
    clubs[best.p.team] = (clubs[best.p.team] || 0) + 1; used.add(best.p.id);
    out[best.i] = best.p; total += best.d;
  }
  return { ids: out.map(p => p.id), total };
}
/* 15 GW1-skipti = "eg byggdi mitt eigid upphafslid". Thad ER hvernig
   appid geymir hopinn: `START_SQUAD` + `plan`. Enginn "squad"-listi er
   vistadur, og thad er kjarni thessa safns — se `plan` skert i lestri
   hverfa leikmenn sem notandinn valdi.                              */
const gw1Plan = ids => START_IDS.map((outId, i) => ({ gw: 1, outId, inId: ids[i] }));

const LEGAL = buildSquad(995);    // banki  0,5
const OVER  = buildSquad(1015);   // banki -1,5

const SCEN = [];
/* 1. TOMT — notandi sem hefur aldrei vistad neitt (fyrsta heimsokn).  */
SCEN.push({ name: "1 tomt (fyrsta heimsokn)", blob: null, expectPlan: 0 });
/* 2. FULLIR 15 I GW1, ekkert planad lengra. ThETTA ER TILFELLID I KVOLD. */
SCEN.push({ name: "2 fullir 15 i GW1 (kvoldid i kvold)", expectPlan: 15, expectIds: LEGAL.ids,
  blob: JSON.stringify({ entryId: null, plan: gw1Plan(LEGAL.ids),
    captain: LEGAL.ids[9], vice: LEGAL.ids[5],
    benchSwaps: { "1": [[LEGAL.ids[4], LEGAL.ids[11]]] },
    chips: {}, buyPrices: {}, rivals: [], watch: [] }) });
/* 3. MINUS-BANKI — nytt i dag: hann ma velja dyran mann og fjarmagna
      hann sidar. Talan ma ALDREI koma til baka klippt i 0 ne sem NaN. */
SCEN.push({ name: "3 minus-banki (yfirdrattur)", expectPlan: 15, expectIds: OVER.ids,
  blob: JSON.stringify({ entryId: null, plan: gw1Plan(OVER.ids),
    captain: OVER.ids[9], vice: OVER.ids[6],
    benchSwaps: {}, chips: {}, buyPrices: {}, rivals: [], watch: [] }) });
/* 4. BENCH BOOST i GW1 — 15 a vellinum, en `starter`-mengid OBREYTT.   */
SCEN.push({ name: "4 Bench Boost i GW1", expectPlan: 15, expectIds: LEGAL.ids,
  blob: JSON.stringify({ entryId: null, plan: gw1Plan(LEGAL.ids),
    captain: LEGAL.ids[9], vice: LEGAL.ids[5],
    benchSwaps: {}, chips: { "bboost:1": 1 }, buyPrices: {}, rivals: [], watch: [] }) });
/* 5. AAETLUN YFIR GW1-6 — chip, bekkjar-vixl i tveimur umferdum,
      vaktlisti og andstaedingur med.                                  */
SCEN.push({ name: "5 aaetlun GW1-6", expectPlan: 18, expectIds: LEGAL.ids,
  blob: JSON.stringify({ entryId: 606,
    plan: [...gw1Plan(LEGAL.ids),
           { gw: 3, outId: LEGAL.ids[0], inId: 226 },
           { gw: 5, outId: LEGAL.ids[13], inId: 175 },
           { gw: 6, outId: LEGAL.ids[8], inId: 480 }],
    captain: LEGAL.ids[9], vice: LEGAL.ids[5],
    benchSwaps: { "2": [[LEGAL.ids[3], LEGAL.ids[12]]], "4": [[LEGAL.ids[7], LEGAL.ids[14]]] },
    chips: { "bboost:1": 4 }, buyPrices: { [LEGAL.ids[9]]: { p: 90, src: "manual" } },
    rivals: [{ id: 606 }], watch: [411, 379] }) });

const SAVED_KEYS = ["benchSwaps","buyPrices","captain","chips","entryId","plan","rivals","vice","watch"];

console.log(`\n${"=".repeat(84)}`);
console.log("GW1-LIDID EFTIR HARDA ENDURHLEDSLU — TVAER OHADAR HLEDSLUR");
console.log("=".repeat(84));
console.log(`  forsenda: proflid 995 tiundir (banki 0,5) og 1015 (banki -1,5)`);
ok(LEGAL.total === 995 && OVER.total === 1015,
   `forsenda: hoparnir kosta 995 og 1015 tiundir (${LEGAL.total}/${OVER.total})`);
ok(new Set(LEGAL.ids).size === 15 && LEGAL.ids.every(i => !SS.has(i)),
   "forsenda: 15 einkvaemir nyir leikmenn, engir ur START_SQUAD");

/* ============================================================
   0. MAELITAEKID — LES HLEDSLA 2 RAUNVERULEGA `localStorage`?

   `import("../src/App.jsx")` er KAESAD milli hledslna og `storage.js`
   geymir `_storeMode` a modul-svidi. Vaeri lidid a einhvern hatt
   endurnotad ur minni myndu ALLIR kaflarnir her a eftir vera graenir
   an ad maela nokkud — sama tautologia og CLAUDE.md 5b lysir.

   PROFID: tvaer hledslur, SITT blob hvor, og lidin verda ad vera
   OLIK. Fellur thessi kafli er allt safnid onytt.
   ============================================================ */
console.log("\n--- 0. MAELITAEKID: hledsla 2 les storage, ekki minni ---");
{
  const a = await boot(SCEN[1].blob);
  const sa = snapshot(a); await a.down();
  const b = await boot(SCEN[2].blob);
  const sb = snapshot(b); await b.down();
  ok(!!sa.rows && !!sb.rows, "badar hledslur teiknudu vollinn");
  ok(flat(sa).filter(Boolean).length === 15, `forsenda: hledsla A hefur 15 spjold (${flat(sa).filter(Boolean).length})`);
  ok(!eq(flat(sa), flat(sb)),
     "ANNAD blob -> ANNAD lid (svo hledsla 2 les raunverulega storage)",
     "somu 15 ur tveimur olikum blobbum -> profid maelir minni, ekki geymslu");
  ok(sa.bank !== sb.bank, `bankinn er lika olikur (${sa.bank} vs ${sb.bank})`);
}

/* ============================================================
   1-5. ATBURDARASIRNAR — HRINGFERDIN SJALF
   ============================================================
   Rodin er: FYRST er fullyrt ad astandid SE ThARNA (CLAUDE.md 5b
   regla 2 — "lifdi af" er einskis virdi hafi ekkert verid thar), sidan
   er rifid nidur, og fyrst tha er samanburdurinn gerdur.
   ============================================================ */
for (const sc of SCEN) {
  console.log(`\n--- ${sc.name} ---`);
  const b1 = await boot(sc.blob);
  ok(!b1.crash, "hledsla 1 keyrdi an hruns", b1.crash ? "KASTADI: " + b1.crash.slice(0, 70) : "");
  const s1 = snapshot(b1);
  const t1 = b1.text();
  ok(t1.includes("Planner") || t1.includes("Player stats"), "hledsla 1: vidmotid teiknadist");
  ok(!NANRE.test(t1), "hledsla 1: ekkert NaN/undefined a skja");

  /* --- FORSENDAN: astandid ER ThARNA. Utan thessa gaeti "helst eins"
         stadist a tveimur TOMUM skjaum.                              --- */
  const n1 = flat(s1).filter(Boolean).length;
  ok(n1 === 15, `forsenda: 15 leikmenn a skjanum (${n1})`, JSON.stringify(s1.rows));
  ok(s1.captain && s1.captainName && NAMES.has(s1.captainName),
     `forsenda: fyrirlidinn er valinn (${s1.captainName} / ${s1.captain})`);
  /* SAMHVERF BILUN I LESTRI ER OSYNILEG I TVEGGJA-HLEDSLU SAMANBURDI.
     Vaeri `setVice` neytt i `null` vaeri hledsla 1 EINS TOM og hledsla 2
     og "VARAFYRIRLIDINN helst" staedist. Thess vegna er hvert svid sem
     blobbid BER fullyrt SEM POPULERAD i hledslu 1 — samanburdurinn
     nedar ver adeins ad thad TAPIST ekki, ekki ad thad hafi verid thar. */
  if (sc.blob && JSON.parse(sc.blob).vice != null)
    ok(s1.vice && s1.viceName && NAMES.has(s1.viceName),
       `forsenda: varafyrirlidinn er valinn (${s1.viceName} / ${s1.vice})`);
  ok(s1.starterOpts && s1.starterOpts.length === 11,
     `forsenda: byrjunarlidid er 11 (${s1.starterOpts?.length})`);
  ok(/£/.test(s1.bank || ""), `forsenda: bankinn er tala (${s1.bank})`);
  /* THEKJA ER FULLYRDING (CLAUDE.md 5b regla 1): undirtextarnir eru thad
     sem ber lidsverdid og refsinguna, og `null === null` stenst.       */
  ok(/£/.test(s1.bankSub || ""), `forsenda: lidsverdid er lesid (${s1.bankSub})`);
  ok((s1.gwSub || "").length > 2, `forsenda: umferdar-undirtextinn er lesinn (${s1.gwSub})`);
  if (sc.expectPlan) {
    const blob1 = JSON.parse(b1.raw() || "{}");
    ok(blob1.plan?.length === sc.expectPlan,
       `forsenda: ${sc.expectPlan} skipti i blobbinu (${blob1.plan?.length})`);
  }
  /* HOPURINN A SKJANUM VERDUR AD VERA NAKVAEMLEGA SA SEM HANN VALDI.
     FYRSTA UTGAFA THESSARAR FULLYRDINGAR VAR "ekkert yfirlag vid
     START_SQUAD", OG HUN VAR OF ODYR — stadfest med stokkbreytingu: eitt
     id breytt i `START_SQUAD` (496 -> 226) tapar einu saeti UR VISTADA
     PLANINU (`findIndex` finnur ekki `outId` og skiptid er thogult sleppt),
     og "ekkert yfirlag" STODST SAMT, thvi nyi grunn-madurinn er hvorki i
     hans hop NE i mengin sem profid bar hann vid. Mengja-jafna er thad
     eina sem getur fallid a rettum hlut.                              */
  if (sc.expectIds) {
    const seen = flat(s1).filter(Boolean).sort();
    const want = sc.expectIds.map(i => byId[i].web_name).sort();
    ok(eq(seen, want), `forsenda: NAKVAEMLEGA hans 15 eru a skjanum`,
       `\n      skjar: ${JSON.stringify(seen)}\n      valdir: ${JSON.stringify(want)}`);
  }

  const raw1 = b1.raw();
  ok(typeof raw1 === "string" && raw1.length > 2, "hledsla 1: `saveState` skrifadi blob",
     String(raw1).slice(0, 40));
  /* INNTAK -> BLOB ER SJALFSTAED FULLYRDING, OG HUN ER STERKARI EN
     HRINGFERDIN. Hringferdin ber hledslu 1 vid hledslu 2 og er thvi BLIND
     a bilun sem er SAMHVERF (svid sem er ALLTAF fellt i lestri, eda alltaf
     sleppt i skrifum, kemur eins ut badum megin). Her er borid vid ThAD
     SEM NOTANDINN ATTI ADUR EN APPID SA THAD.                          */
  if (sc.blob)
    ok(eq(JSON.parse(sc.blob), JSON.parse(raw1 || "{}")),
       "blobbid sem appid skrifadi ER inntakid, svid fyrir svid",
       `\n      inn:  ${sc.blob.slice(0, 200)}\n      ut:   ${String(raw1).slice(0, 200)}`);
  await b1.down();

  /* --- HORD ENDURHLEDSLA: ekkert nema `raw1` kemst yfir.            --- */
  const b2 = await boot(raw1);
  ok(!b2.crash, "hledsla 2 keyrdi an hruns", b2.crash ? "KASTADI: " + b2.crash.slice(0, 70) : "");
  const s2 = snapshot(b2);
  const t2 = b2.text();
  ok(!NANRE.test(t2), "hledsla 2: ekkert NaN/undefined a skja");

  ok(eq(s1.rows, s2.rows), "UPPSTILLINGIN helst (4 stodu-radir, rod og allt)",
     `\n      fyrir: ${JSON.stringify(s1.rows)}\n      eftir: ${JSON.stringify(s2.rows)}`);
  ok(eq(s1.bench, s2.bench), "BEKKJAR-RODIN helst",
     `\n      fyrir: ${JSON.stringify(s1.bench)}\n      eftir: ${JSON.stringify(s2.bench)}`);
  ok(s1.captain === s2.captain && s1.captainName === s2.captainName,
     `FYRIRLIDINN helst (${s2.captainName})`, `${s1.captain} -> ${s2.captain}`);
  ok(s1.vice === s2.vice && s1.viceName === s2.viceName,
     `VARAFYRIRLIDINN helst (${s2.viceName})`, `${s1.vice} -> ${s2.vice}`);
  ok(eq(s1.starterOpts, s2.starterOpts), "BYRJUNARLIDID (11) helst obreytt");
  ok(s1.bank === s2.bank, `BANKINN helst (${s2.bank})`, `${s1.bank} -> ${s2.bank}`);
  ok(s1.bankSub === s2.bankSub, `LIDSVERDID helst (${s2.bankSub})`, `${s1.bankSub} -> ${s2.bankSub}`);
  ok(s1.gwSub === s2.gwSub, `SKIPTA-KOSTNADURINN helst (${s2.gwSub})`, `${s1.gwSub} -> ${s2.gwSub}`);

  /* Blobbid sjalft ma ekki reka: hledsla 2 skrifar aftur, og faeri eitt
     svid tapast i hverri hledslu vaeri appid ad naga astandid nidur i
     nokkrum endurhledslum an thess ad EIN hringferd syndi thad.       */
  const raw2 = b2.raw();
  const j1 = JSON.parse(raw1), j2 = JSON.parse(raw2 || "{}");
  ok(eq(j1, j2), "BLOBBID er stafrett eins eftir adra hledslu (ekkert nagast af)",
     `\n      1: ${raw1?.slice(0, 160)}\n      2: ${String(raw2).slice(0, 160)}`);
  ok(eq(Object.keys(j2).sort(), SAVED_KEYS),
     `blobbid ber nakvaemlega ${SAVED_KEYS.length} thekkt svid`, Object.keys(j2).sort().join(","));
  await b2.down();
}

/* ============================================================
   R1. GW1-KOSTNADURINN ER LEIDDUR, EKKI VISTADUR

   `isGw1Free` for ur `(g === 1 && preSeason)` i `(g === 1)` i dag. Su
   breyting er OHAETT ADEINS ThVI HUN ER REIKNUD I HVERRI TEIKNINGU.
   Vaeri kostnadurinn (eda `unlimitedBy`) VISTADUR myndi MERKING
   blobbsins breytast undir notandanum: blob skrifad i dag med
   "unlimited/preseason" laesi vitlaust eftir frestinn a morgun — sama
   aett og `web_name`-atvikid (CLAUDE.md kafli 8: sama svid ma ekki
   thyda sitthvad eftir thvi hvort timabilid er byrjad).

   PROFID ER TVIThAETT:
     a) blobbid ber ENGIN kostnadar-svid (svidalistinn er taemandi)
     b) 15 GW1-skipti kosta 0 stig a BADUM hledslum — talan sem
        commit bebd117 maeldi (-16) ma ekki birtast.
   ============================================================ */
console.log("\n--- R1. GW1-kostnadur er LEIDDUR, ekki vistadur ---");
{
  const b = await boot(SCEN[1].blob);
  const j = JSON.parse(b.raw() || "{}");
  const bad = Object.keys(j).filter(k => /cost|hit|unlimited|free|preseason|initial|ft|squad|start/i.test(k));
  ok(bad.length === 0, "ekkert kostnadar-/GW1-svid i blobbinu", bad.join(","));
  ok(eq(Object.keys(j).sort(), SAVED_KEYS), "svidalistinn er nakvaemlega sa gamli",
     Object.keys(j).sort().join(","));
  const s = snapshot(b), t = b.text();
  /* "✂Transfers" ber fjolda skipta og refsingin er i undirtextanum.
     15 skipti i GW1 kosta 0 — hvorki -16 ne "-56 pts".               */
  ok(!/-\d+\s*pts/.test(t), "engin refsing a skjanum fyrir 15 GW1-skipti", (t.match(/-\d+\s*pts/) || [""])[0]);
  ok(/starting squad|preseason|unlimited/i.test(t),
     "GW1 er merkt otakmorkud (orsokin er birt, ekki thogud)");
  await b.down();
}

/* ============================================================
   R2. MINUS-BANKI — LIFIR SEM MINUS

   Bankinn ma nu fara i minus (gatid var tekid ut i dag). Talan er
   REIKNUD ur `plan` og verdlistanum, svo hun getur bara komid til
   baka rong ef `plan` skerdist i lestri. Tveir bilunar-hamir eru
   nefndir berum ordum: KLIPPT I 0 og `£NaN` (`bank:"mikid"`,
   CLAUDE.md 5b).
   ============================================================ */
console.log("\n--- R2. minus-banki lifir sem MINUS ---");
{
  const b1 = await boot(SCEN[2].blob);
  const s1 = snapshot(b1);
  ok(s1.bank === "-£1.5", `forsenda: bankinn ER minus fyrir endurhledslu (${s1.bank})`);
  const raw = b1.raw(); await b1.down();
  const b2 = await boot(raw);
  const s2 = snapshot(b2), t2 = b2.text();
  ok(s2.bank === "-£1.5", `minus-bankinn lifdi endurhledsluna (${s2.bank})`);
  ok(!/^£0\.0$/.test(s2.bank || ""), "bankinn var EKKI klipptur i 0", s2.bank);
  ok(!/£NaN|NaN/.test(s2.bank || ""), "bankinn er EKKI NaN", s2.bank);
  ok(!NANRE.test(t2), "enginn NaN a skjanum i yfirdraetti");
  /* MERKID FER FYRIR PUNDID (`money()`): "-£1.5", ekki "£-1.5".      */
  ok(/^-£/.test(s2.bank || ""), "`money()`-snidid helst: merkid fyrir pundid", s2.bank);
  await b2.down();
}

/* ============================================================
   R3. BENCH BOOST — 15 A VELLINUM, `starter`-MENGID OBREYTT

   Breytingin i dag er BIRTING. Vaeri hun lekid inn i astandid yrdi
   XI-id hans 15 og endurhledsla laesi vitlaust. Fullyrdingin er lesin
   thar sem `starters` er raunverulega notad: FYRIRLIDA-VALLISTINN ma
   adeins bjoda BYRJUNARLIDSMENN, svo option-fjoldinn ER maelikvardi a
   mengid. 15 vaeri leki; 11 er rett — i BADUM tilfellum.
   ============================================================ */
console.log("\n--- R3. Bench Boost snertir ekki `starter`-mengid ---");
{
  const bb = await boot(SCEN[3].blob);
  const sbb = snapshot(bb);
  const nOn = (pitchRows(bb) || []).flat().filter(Boolean).length;
  ok(nOn === 15, `forsenda: BB setur 15 a vollinn (${nOn})`);
  ok((benchRow(bb) || []).length === 0, "forsenda: bekkjar-rodin er tom i BB (skyringin i stad spjalda)");
  ok(sbb.starterOpts?.length === 11,
     `BB: fyrirlida-vallistinn er ENN 11 (${sbb.starterOpts?.length}) — mengid var ekki mengad`);
  const rawbb = bb.raw(); await bb.down();

  /* Sama aaetlun AN chipsins: mengin verda ad vera stafrett eins.
     TVIBURINN VERDUR AD VERA NAKVAEMLEGA SAMA ASTAND AD CHIPINU UNDANSKILDU.
     Fyrsta utgafa bar BB-astandid vid ATBURDARAS 2, sem hefur ANNAD
     `benchSwaps` — svo profid fell a MINUM eigin mun (Saka a moti Dennis)
     og hefdi verid lesid sem BB-leki. Fullyrding sem ber tvo olik inntok
     saman getur hvorki fallid ne stadist um thad sem hun heitir eftir.  */
  const twin = JSON.parse(SCEN[3].blob); twin.chips = {};
  const noBb = await boot(JSON.stringify(twin));
  const snb = snapshot(noBb);
  const nOn2 = (pitchRows(noBb) || []).flat().filter(Boolean).length;
  ok(nOn2 === 11, `forsenda: an BB eru 11 a vellinum (${nOn2})`);
  ok(eq(sbb.starterOpts, snb.starterOpts),
     "BB og ekki-BB gefa NAKVAEMLEGA sama byrjunarlid (11 somu nofn)",
     `\n      BB:   ${JSON.stringify(sbb.starterOpts)}\n      an:   ${JSON.stringify(snb.starterOpts)}`);
  await noBb.down();

  /* Og BB-hledslan ma ekki hafa skrifad bekkjar-vixl sem notandinn
     gerdi ekki: `benchSwaps` var tomur inn og verdur ad vera tomur ut. */
  const j = JSON.parse(rawbb || "{}");
  ok(eq(j.benchSwaps, {}), "BB skrifadi ENGIN bekkjar-vixl i blobbid", JSON.stringify(j.benchSwaps));
  ok(j.chips?.["bboost:1"] === 1, "BB-chipid sjalft helst i blobbinu", JSON.stringify(j.chips));
}

/* ============================================================
   R4. GERD-ThVINGUNIN MA EKKI EYDA GILDU ASTANDI

   `loadState`-thvingunin (9.8.) er thar til ad EITT onytt svid kosti
   adeins sig sjalft. Hun ma ekki henda gildu: "annars vaeri
   lagfaeringin ad henda raunverulegri plonun notandans" (CLAUDE.md 8).
   `untrusted-input.mjs` A2 ber thetta a SMAU astandi (2 skipti); her er
   thad borid a ThVI SEM HANN A I KVOLD: 18 skipti, aukasvid, tvaer
   umferdir af bekkjar-vixlum, chip, vaktlisti og andstaedingur.
   ============================================================ */
console.log("\n--- R4. gerd-thvingunin eydir ekki gildu astandi ---");
{
  const IN = JSON.parse(SCEN[4].blob);
  const b = await boot(SCEN[4].blob);
  const j = JSON.parse(b.raw() || "{}");
  ok(j.plan?.length === 18, `oll 18 skipti komust i gegn (${j.plan?.length})`);
  ok(eq(j.plan, IN.plan), "hvert skipti er STAFRETT eins (gw/outId/inId, rodin)",
     JSON.stringify(j.plan?.slice(0, 2)));
  ok(eq(j.benchSwaps, IN.benchSwaps), "badar bekkjar-vixl-umferdir helda", JSON.stringify(j.benchSwaps));
  ok(eq(j.chips, IN.chips), "chip-in helda", JSON.stringify(j.chips));
  ok(eq(j.watch, IN.watch), "vaktlistinn helst", JSON.stringify(j.watch));
  ok(eq(j.rivals, IN.rivals), "andstaedingar helda", JSON.stringify(j.rivals));
  ok(j.entryId === 606, `entryId helst (${j.entryId})`);
  /* AUKASVID: `buyPrices`-faerslan ber `src:"manual"` sem `buySrcOf`
     les. `rowArr`/`obj` ma ekki byggja hluti upp a nytt.              */
  const k = String(LEGAL.ids[9]);
  ok(j.buyPrices?.[k]?.p === 90 && j.buyPrices?.[k]?.src === "manual",
     "kaupverd heldur BADUM svidum (p + src)", JSON.stringify(j.buyPrices));
  await b.down();
}

/* ============================================================
   R5. SNIDID BREYTTIST EKKI I DAG — BLOB FRA I GAER LES

   Ef vistada snidid hefdi breyst i dag vaeri vistadur hopur fra i gaer
   olesanlegur, og thad vaeri BLOKKANDI (aldrei thogul flutningur).
   `git log -L 689,770:src/App.jsx` segir ad blokkin hafi sidast breyst
   11.8.2026 (`ab96890`) — thetta er hegdunar-hlidin a thvi: blob med
   NAKVAEMLEGA gamla svidalistanum (og engu odru) les og teiknar.
   ============================================================ */
console.log("\n--- R5. blob fra i gaer les obreytt ---");
{
  /* Skrifad eins og gamla utgafan skrifadi: somu nio svid, tolur sem
     tolur, `vice: null`, `benchSwaps` sem hlutur af PORUM.           */
  const YESTERDAY = JSON.stringify({
    entryId: null, plan: gw1Plan(LEGAL.ids), captain: LEGAL.ids[9], vice: null,
    benchSwaps: {}, chips: {}, buyPrices: {}, rivals: [], watch: [],
  });
  const b = await boot(YESTERDAY);
  const s = snapshot(b), t = b.text();
  ok(!b.crash, "gamalt blob: engin hrun", b.crash ? "KASTADI: " + b.crash.slice(0, 70) : "");
  ok(flat(s).filter(Boolean).length === 15, `gamalt blob: allir 15 komu upp (${flat(s).filter(Boolean).length})`);
  ok(!NANRE.test(t), "gamalt blob: ekkert NaN");
  ok(s.captainName === byId[LEGAL.ids[9]].web_name,
     `gamalt blob: fyrirlidinn er rettur (${s.captainName})`);
  /* `vice: null` ma ekki verda fyrirlidinn ne "undefined" a skja.     */
  ok(s.vice === "" || s.vice == null, `gamalt blob: tomur varafyrirlidi helst tomur (${JSON.stringify(s.vice)})`);
  await b.down();
}

/* ============================================================
   R6. `START_SQUAD` ER HLUTI AF VISTUNAR-SAMNINGNUM — PINNAD

   HOPURINN ER EKKI VISTADUR. Appid geymir `START_SQUAD` (fastur listi i
   `App.jsx`) PLUS `plan`, og `squadForGw` beitir hverju skipti med
   `sq.findIndex(s => s.id === tr.outId)`. **Finnist `outId` ekki er
   skiptid ThOGULT SLEPPT** (`if (i >= 0)`), og tha hverfur leikmadurinn
   sem notandinn valdi — an villu, an merkis.

   Afleidingin er hord: **hver breyting a `START_SQUAD` OGILDIR HVERT
   VISTAD `plan`.** Vaeri einum manni skipt ut ur fastanum (t.d. thvi hann
   for ur deildinni) tapadi notandinn nakvaemlega thvi saeti — og ekkert
   i appinu segdi honum thad.

   Thess vegna eru id-in PINNUD her. Fullyrdingin er ekki um smekk heldur
   um samninginn: se `START_SQUAD` breytt fellur thetta, og tha VERDUR
   einhver ad hugsa um vistadu blobbin adur en thad er ytt.
   ============================================================ */
console.log("\n--- R6. START_SQUAD er pinnad (vistud plon hanga a thvi) ---");
{
  const b = await boot(null);
  const s = snapshot(b);
  const seen = flat(s).filter(Boolean).sort();
  const want = START_IDS.map(i => byId[i].web_name).sort();
  ok(eq(seen, want), "sjalfgefni hopurinn er NAKVAEMLEGA `START_SQUAD` (15 pinnud id)",
     `\n      skjar: ${JSON.stringify(seen)}\n      pinnud: ${JSON.stringify(want)}`);
  await b.down();

  /* HEGDUNIN SJALF, MAELD: plan sem visar a id UTAN grunnhopsins er
     sleppt. Thetta er thad sem gerdist ef fastanum vaeri breytt.
     ThOGNIN ER FARIN 21.8.2026 OG ThESSI KAFLI SAGDI HANA „VERRA".
     Radirnar eru afram slepptar — thad er RETT, `outId` er ekki i hopnum —
     en `applyPlan` skilar theim nu i `skipped` og vidmotid TELUR thaer.
     Fullyrdingin hér a eftir er thvi ekki lengur „og thad hrynur ekki";
     hun er „og hann fær ad vita". Sja `initial-squad.mjs` kafla O.     */
  const orphan = JSON.stringify({ entryId: null,
    plan: LEGAL.ids.map((inId, i) => ({ gw: 1, outId: 900000 + i, inId })),
    captain: START_IDS[9], vice: null, benchSwaps: {}, chips: {},
    buyPrices: {}, rivals: [], watch: [] });
  const o = await boot(orphan);
  const so = snapshot(o);
  const kept = flat(so).filter(Boolean).filter(n => LEGAL.ids.some(i => byId[i].web_name === n)).length;
  ok(kept === 0,
     `MAELT: plan med ogildum \`outId\` tapar OLLUM 15 (${kept} komust inn)`);
  ok(!o.crash && !NANRE.test(o.text()), "og thad hrynur ekki");
  /* OG ThAD ER EKKI ThOGULT LENGUR. Talan er lesin AF SKJANUM og hun
     verdur ad vera FIMMTAN — „einhver vidvorun" hefdi stadist thott
     talningin vaeri rong, og rong tala er verri en engin (CLAUDE.md 3). */
  const om = o.text().match(/(\d+) of these picks cannot be placed/);
  ok(om && Number(om[1]) === 15,
     `og fimmtan slepptar radir eru TALDAR a skjanum (${om ? om[1] : "engin tala"})`);
  await o.down();
}

/* ============================================================
   R7. VISTAD ASTAND **OG** HAEG SOKN I EINU

   CLAUDE.md kafli 13 nefnir thennan as berum ordum: `priceFloors` kastadi
   `TypeError` fyrir hvern notanda sem hafdi planad eitthvad, thvi
   sjalfgildi i falli ver adeins `undefined` — ekki `null`, sem er thad sem
   React-state er medan netid svarar. "Maelt: 0-1 ms tof teiknast, **5 ms
   og upp ur hrynur**." Og hvorugt tholprofa-safnid gat sed thad:
   `data-resilience` skrifar aldrei `fpl_planner_v3`, `untrusted-input`
   gefur heilbrigd gagnaskrar.

   Her er ThAD BIL PROFAD MED HANS EIGIN GW1-HOP: ef appid fellur her er
   eina utgangan ur `ErrorBoundary` ad EYDA OLLU LIDINU.
   ============================================================ */
console.log("\n--- R7. vistad astand OG haeg sokn (bilid milli tholprofanna) ---");
for (const ms of [1, 5, 40]) {
  const b = await boot(SCEN[1].blob, { delay: ms });
  const t = b.text();
  ok(!b.crash, `${ms} ms tof: engin hrun med vistadan GW1-hop`,
     b.crash ? "KASTADI: " + b.crash.slice(0, 90) : "");
  ok(t.includes("Planner") || t.includes("Player stats"), `${ms} ms tof: vidmotid er nothaeft`);
  ok(!NANRE.test(t), `${ms} ms tof: ekkert NaN/undefined`);
  /* OG BLOBBID MA EKKI SKERDAST VID HAEGA HLEDSLU: hefdi `loaded`
     kviknad fyrir lestur myndi TOMT state skrifast OFAN A godan hop. */
  const j = JSON.parse(b.raw() || "{}");
  ok(j.plan?.length === 15, `${ms} ms tof: blobbid er OSKERT (${j.plan?.length}/15 skipti)`,
     "tomt state skrifadist ofan a godan hop");
  await b.down();
}

console.log(`\n${"=".repeat(84)}`);
console.log(fail ? `GW1-VISTUN: ${fail} af ${pass + fail} fullyrdingum fell`
                 : `GW1-VISTUN: allar ${pass} fullyrdingar graenar`);
process.exit(fail ? 1 : 0);
