/* ============================================================
   INNTAK SEM APPID STJORNAR EKKI — TVAER UPPSPRETTUR, SAMA REGLA

   Appid tekur vid gognum ur tveimur attum sem thad raedur engu um:
     A. `localStorage` (`fpl_planner_v3`) — vistad astand notandans
     B. Netlify-proxyid (FPL-svor: stig, banki, lidid thitt)
   Hvorug ma geta fellt appid eda sett `NaN` a skjainn. Bædi profud hér.

   ---------------------------------------------------------------
   A. SKEMMT VISTAD ASTAND — VERSTA BILUNIN SEM TIL ER I THESSU APPI

   AF HVERJU ThETTA ER ALVARLEGRA EN VANTANDI GAGNASKRA: `data/`-skrarnar
   koma UR NETINU og laga sig sjalfar vid naestu sokn. `fpl_planner_v3` er
   i VOFRANUM hja notandanum og fer HVERGI. Se blobbid oheilt hrynur appid
   vid HVERJA hledslu — ekki einu sinni heldur ad eilifu — og notandinn
   hefur enga leid til baka nema devtools.

   `loadState` ver adeins gegn ONYTU JSON (`JSON.parse` i try/catch).
   GILT JSON MED RANGRI GERD for ospurt inn i state. Maelt a 14 skemmdum
   astondum: FJOGUR hrundu appinu vid hledslu:

     plan:"abc"           -> plan.filter is not a function
     chips:[1,2,3]        -> les .color af undefined
     benchSwaps:{"1":"x"} -> (benchSwaps[gw] || []).forEach is not a function
     rivals:{}            -> rivals.map is not a function

   ErrorBoundary greip thau (CLAUDE.md 8c) — en eina utgangan thar er
   "hreinsa vistada plonun", sem eydir OLLU lidinu, fyrirlidanum,
   skiptaaetluninni og chip-unum. Ad hunsa EITT onytt svid er storum betra
   en ad kosta notandann allt hitt. Thess vegna er gerd hvers svids nu
   thvingud vid lestur.

   ATH `benchSwaps`: thad er hlutur AF FYLKJUM, svo ytri gerdin ein dugar
   ekki — `{"1":"x"}` er gildur hlutur en "x".forEach fellur. Gildin eru
   thvingud lika. Thetta er einmitt tilfellid sem fyrsta lagfaeringin min
   missti af.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

/* Hvert tilfelli er RAUNVERULEG bilun sem getur ordid: eldri utgafa af
   skranni, hálf-skrifad blob, handvirkt fikt, eda svid sem breytti gerd
   milli utgafna appsins.                                              */
const CASES = [
  ["onytt JSON",            "{not json"],
  ["null",                  "null"],
  ["fylki i stad hlutar",   "[1,2,3]"],
  ["strengur",              '"halló"'],
  ["plan er strengur",      JSON.stringify({ plan: "abc" })],
  ["plan med rusli",        JSON.stringify({ plan: [{ out: 99999, in: 88888, gw: 999 }] })],
  ["chips othekkt",         JSON.stringify({ chips: { "nonexistent:42": { gw: 999 } } })],
  ["chips er fylki",        JSON.stringify({ chips: [1, 2, 3] })],
  ["captain ekki til",      JSON.stringify({ captain: 999999 })],
  ["buyPrices rusl",        JSON.stringify({ buyPrices: { "1": "dyrt", abc: { p: null } } })],
  /* GILDIN, EKKI BARA YTRI GERDIN: `{"411":"abc"}` for adur beint i
     `sellTenths` og skjarinn bar £NaN — banki og hvert soluverd med.   */
  ["buyPrices gildi strengur", JSON.stringify({ buyPrices: { "411": "abc", "412": { p: "dyrt" } } })],
  ["rivals rusl",           JSON.stringify({ rivals: [{ id: null }, "x", 42] })],
  ["watch er hlutur",       JSON.stringify({ watch: { a: 1 } })],
  ["benchSwaps gildi rangt", JSON.stringify({ benchSwaps: { "1": "x" } })],
  /* EITT STIG OF FLATT — stenst "hlutur af fylkjum" en `forEach(([a,b]))`
     afbyggir `1` og fellir appid. Fannst 11.8.2026 thegar eg skrifadi
     thetta sjalfur sem "gilt astand" i hringferdar-profinu.            */
  ["benchSwaps skalar i stad para", JSON.stringify({ benchSwaps: { "3": [1, 2] } })],
  ["benchSwaps por af rusli",   JSON.stringify({ benchSwaps: { "3": [["a", "b"], [1], [1, 2, 3]] } })],
  ["allt rangt i einu",     JSON.stringify({ entryId: "abc", plan: null, captain: {}, vice: [],
                                             chips: "x", buyPrices: 7, rivals: {}, watch: 1,
                                             benchSwaps: null })],
  /* TOLU-SVIDIN OG INNIHALD FYLKJANNA (bætt vid 11.8.2026).
     Fyrri umferd thvingadi YTRI gerd (fylki/hlutur) en let stoku tolurnar
     og INNIHALD fylkjanna ospurt, svo thessi tilfelli foru obreytt inn i
     state:
       entryId:"abc"      -> `?path=fpl-entry&id=abc`
       captain:"12"       -> `"12" === 12` er false -> fyrirlidinn HVERFUR
       plan:[{gw:"2"}]    -> `tr.gw > g` ber strengja-samanburd, rod raskast
       watch:[{}]         -> `includes(id)` finnur aldrei neitt
       rivals:["606"]     -> `r.id` undefined -> kall med `id=undefined`   */
  ["entryId er strengur",   JSON.stringify({ entryId: "abc" })],
  ["captain er strengur",   JSON.stringify({ captain: "12" })],
  ["vice er hlutur",        JSON.stringify({ vice: { id: 3 } })],
  ["plan gw er strengur",   JSON.stringify({ plan: [{ gw: "2", outId: "1", inId: "2" }] })],
  ["plan faersla an gw",    JSON.stringify({ plan: [{ outId: 1, inId: 2 }, { gw: 3, outId: 4, inId: 5 }] })],
  ["watch med hlutum",      JSON.stringify({ watch: [{}, null, "x", 7] })],
  ["rivals med strengjum",  JSON.stringify({ rivals: ["606", { id: "607" }, { nafn: "engin id" }] })],
  /* VIDMIDID: gilt astand verdur ad fara i gegn OBREYTT — annars vaeri
     "lagfaeringin" ad henda raunverulegri plonun notandans.            */
  ["GILT astand",           JSON.stringify({ plan: [], captain: null, chips: {}, buyPrices: {},
                                             rivals: [], watch: [1, 2], benchSwaps: {} })],
];

console.log(`\n${"─".repeat(72)}\nSKEMMT VISTAD ASTAND (${CASES.length} tilfelli)\n${"─".repeat(72)}`);

let crashed = 0;
for (const [label, blob] of CASES) {
  const dom = new JSDOM("<!doctype html><div id=root></div>",
                        { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem("fpl_planner_v3", blob);

  globalThis.fetch = async url => {
    const n = String(url).split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => ({}) };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
  };

  const oe = console.error, ow = console.warn;
  console.error = () => {}; console.warn = () => {};
  let crash = null, txt = "";
  try {
    const { default: App } = await import(new URL("src/App.jsx", REPO).href);
    const root = createRoot(document.getElementById("root"));
    await act(async () => { root.render(React.createElement(App)); });
    await act(async () => { await new Promise(r => setTimeout(r, 220)); });
    txt = document.body.textContent || "";
  } catch (e) { crash = e.message; }
  console.error = oe; console.warn = ow;

  /* Krafan er ekki "engin villa" heldur AD APPID SE NOTHAEFT: fliparnir
     eru a skjanum, svo notandinn getur haldid afram ad vinna.          */
  const usable = txt.includes("Planner") || txt.includes("Player stats");
  /* NaN A SKJA TELST FALL, EKKI ADEINS HRUN. Kaflinn hér profadi adeins
     "er appid nothaeft" — svo `buyPrices:{"411":"abc"}` slapp: appid
     stod uppi en bar **£NaN** i banka og soluverdi. Sama krafa og i
     proxy-kaflanum ad nedan; ekkert astand ma setja NaN a skjainn.    */
  const nan = /\bundefined\b|\bNaN\b|\[object Object\]/.test(txt);
  if (crash || !usable || nan) crashed++;
  ok(`${label}: appid er nothaeft og an NaN`, !crash && usable && !nan,
     crash ? "KASTADI: " + crash.slice(0, 60)
           : !usable ? `ekki nothaeft (${txt.trim().length} staf)` : "NaN/undefined a skja");
}

ok(`ekkert af ${CASES.length} astondum fellir appid`, crashed === 0, `${crashed} felldu`);

/* ============================================================
   A2. GILT ASTAND VERDUR AD KOMAST HEILT I GEGN — HRINGFERD

   Kaflinn hér ad ofan spyr adeins hvort appid STANDI UPPI. Thad er ekki
   nog fyrir "GILT astand"-tilfellid: fullyrdingin "nothaeft og an NaN"
   stenst LIKA ef gerd-thvingunin hendir OLLU sem notandinn atti. Sú
   fullyrding gat thvi ekki fallid a thvi sem hun heitir eftir — sama
   veikleiki og CLAUDE.md 5b lysir (fullyrding sem tharf tvennt til ad
   bregdast, eda sem maelir annad en hun segir).

   Hér er ThVI maelt hvort gildin LIFA: appid les blobbid, `saveState`
   skrifar state-id aftur i localStorage, og vid berum thad saman. Ef
   thvingunin er of hord (t.d. `rowArr` sem hendir gildum faerslum) sest
   thad HER og hvergi annars stadar.
   ============================================================ */
console.log(`\n${"─".repeat(72)}\nHRINGFERD: GILT ASTAND HELDUR SER\n${"─".repeat(72)}`);
{
  const VALID = {
    entryId: 606, captain: 5, vice: 7,
    plan: [{ gw: 3, outId: 11, inId: 22 }, { gw: 5, outId: 33, inId: 44 }],
    watch: [1, 2, 3], rivals: [{ id: 606 }, { id: 607 }],
    chips: {}, buyPrices: { "11": { p: 55, src: "manual" } }, benchSwaps: { "3": [[1, 2]] },   /* POR, ekki skalar — sja objOfArr */
    /* SENTINEL — `saveState` skrifar hann ALDREI. Se hann enn til eftir
       teikningu var ekkert skrifad og hringferdin maelir ekkert. */
    _sentinel: 1,
  };
  const dom = new JSDOM("<!doctype html><div id=root></div>",
                        { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem("fpl_planner_v3", JSON.stringify(VALID));
  globalThis.fetch = async url => {
    const n = String(url).split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => { throw new Error("no proxy"); } };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
  };
  const oe = console.error, ow = console.warn;
  console.error = () => {}; console.warn = () => {};
  let crash = null, txt = "";
  try {
    const { default: App } = await import(new URL("src/App.jsx", REPO).href);
    const root = createRoot(document.getElementById("root"));
    await act(async () => { root.render(React.createElement(App)); });
    await act(async () => { await new Promise(r => setTimeout(r, 260)); });
    txt = document.body.textContent || "";
  } catch (e) { crash = e.message; }
  console.error = oe; console.warn = ow;

  const back = JSON.parse(dom.window.localStorage.getItem("fpl_planner_v3") || "{}");

  /* ============================================================
     ThRJAR VORDUR A MAELITAEKINU SJALFU — AN ThEIRRA MAELIR ThETTA EKKERT.

     FYRSTA UTGAFA ThESSA KAFLA VAR TOM OG ThAD VAR STADFEST MED
     STOKKBREYTINGU: eg neytti `rowArr` svo hun henti OLLUM plan-faerslum,
     og "plan helst ALLT (2 faerslur)" STODST SAMT. Astaedan var ad
     `try {} catch {}` gleypti bilunina og `back` var tha EKKERT ANNAD EN
     ThAD SEM EG SKRIFADI INN SJALFUR — profid bar sitt eigid inntak til
     baka og kalladi thad nidurstodu.

     Thetta er sama aett og CLAUDE.md 5b lysir, og thridja tilvikid i
     thessari lotu: **tala sem er "rett" af thvi ad ekkert var maelt les
     eins og tala sem er rett af thvi ad allt virkar.**

     1. APPID VARD AD KEYRA (ekki kasta, og teikna vidmotid).
     2. `saveState` VARD AD SKRIFA. Sannreynt med SENTINEL: blobbid inn ber
        `_sentinel`, sem `saveState` skrifar ALDREI (hun skrifar nakvaemlega
        nio thekkt svid). Se hann enn i skranni var ENGIN skrif — og tha er
        `back` inntakid mitt, ekki utkoman.
     3. Fyrst tha eru gildin sjalf maelanleg.
     ============================================================ */
  ok("hringferd: appid keyrdi an hruns", !crash, crash ? "KASTADI: " + String(crash).slice(0, 70) : "");
  ok("hringferd: vidmotid teiknadist", txt.includes("Planner") || txt.includes("Player stats"),
     `${txt.trim().length} staf`);
  ok("hringferd: `saveState` SKRIFADI (sentinel horfinn)", back._sentinel === undefined,
     "sentinel er enn i skranni -> ekkert var skrifad, svo tolurnar nedar eru inntakid mitt");
  ok(`entryId helst (${back.entryId})`, back.entryId === 606);
  ok(`captain helst (${back.captain})`,  back.captain === 5);
  ok(`vice helst (${back.vice})`,        back.vice === 7);
  ok(`plan helst ALLT (${back.plan?.length} faerslur)`,
     Array.isArray(back.plan) && back.plan.length === 2
     && back.plan[0].gw === 3 && back.plan[0].outId === 11 && back.plan[0].inId === 22
     && back.plan[1].gw === 5,
     JSON.stringify(back.plan));
  ok(`watch helst (${JSON.stringify(back.watch)})`,
     Array.isArray(back.watch) && back.watch.join(",") === "1,2,3");
  ok(`rivals helst (${back.rivals?.length})`,
     Array.isArray(back.rivals) && back.rivals.length === 2
     && back.rivals[0].id === 606 && back.rivals[1].id === 607,
     JSON.stringify(back.rivals));
  /* AUKASVID MEGA EKKI TAPAST: `buyPrices`-faerslan ber `src:"manual"` sem
     `buySrcOf` les, og `rowArr` afritar hlutina — ekki byggja thá upp a nytt.
     (Sama regla og i C6: API-verd ma ekki eyda handvirkri skraningu.)   */
  ok(`buyPrices heldur `+"`src`", back.buyPrices?.["11"]?.src === "manual",
     JSON.stringify(back.buyPrices));
  ok(`benchSwaps helst (por)`, Array.isArray(back.benchSwaps?.["3"])
     && back.benchSwaps["3"].length === 1
     && back.benchSwaps["3"][0].join(",") === "1,2", JSON.stringify(back.benchSwaps));
}

/* ============================================================
   A3. TOLU-ThVINGUNIN SJALF — MAELD, EKKI GEFIN SER

   A2 sannar ad GILT astand lifir. Thad segir ekkert um hvort thvingunin
   GERI NOKKUD, thvi gild gogn eru thegar tolur og fara obreytt i gegn hvort
   sem hun er thar eda ekki. STADFEST MED STOKKBREYTINGU: eg afturkalladi
   alla tolu-thvingunina (`int(s.entryId)` -> `s.entryId ?? null` o.s.frv.)
   og BADIR fyrri kaflarnir voru GRAENIR — hvorugur gat sed thad.

   Hér er thvi gefid TOLU-LIKT STRENGJA-astand, sem er raunveruleg skemmd
   (eldri utgafa appsins skrifadi `entryId` sem streng ur innslattarreit), og
   maelt hvort thad kemur ut sem TOLUR. Thetta er fullyrdingin sem fellur ef
   thvingunin er fjarlægd.
   ============================================================ */
console.log(`\n${"─".repeat(72)}\nTOLU-ThVINGUN: STRENGIR VERDA TOLUR\n${"─".repeat(72)}`);
{
  const STRINGY = {
    entryId: "606", captain: "5", vice: "7",
    plan: [{ gw: "3", outId: "11", inId: "22" }],
    watch: ["1", "2"], rivals: [{ id: "606" }],
    chips: {}, buyPrices: {}, benchSwaps: { "3": [["1", "2"]] },
  };
  const dom = new JSDOM("<!doctype html><div id=root></div>",
                        { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem("fpl_planner_v3",
    JSON.stringify({ ...STRINGY, _sentinel: 1 }));
  globalThis.fetch = async url => {
    const n = String(url).split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => { throw new Error("no proxy"); } };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
  };
  const oe = console.error, ow = console.warn;
  console.error = () => {}; console.warn = () => {};
  let crash = null, txt = "";
  try {
    const { default: App } = await import(new URL("src/App.jsx", REPO).href);
    const root = createRoot(document.getElementById("root"));
    await act(async () => { root.render(React.createElement(App)); });
    await act(async () => { await new Promise(r => setTimeout(r, 260)); });
    txt = document.body.textContent || "";
  } catch (e) { crash = e.message; }
  console.error = oe; console.warn = ow;

  const back = JSON.parse(dom.window.localStorage.getItem("fpl_planner_v3") || "{}");
  ok("strengja-astand: appid keyrdi", !crash && (txt.includes("Planner") || txt.includes("Player stats")),
     crash ? "KASTADI: " + String(crash).slice(0, 60) : `${txt.trim().length} staf`);
  ok("strengja-astand: `saveState` SKRIFADI (sentinel horfinn)", back._sentinel === undefined,
     "ekkert var skrifad -> tolurnar nedan eru inntakid mitt");
  const isNum = v => typeof v === "number";
  ok(`entryId varð TALA (${JSON.stringify(back.entryId)})`, isNum(back.entryId) && back.entryId === 606);
  ok(`captain varð TALA (${JSON.stringify(back.captain)})`, isNum(back.captain) && back.captain === 5);
  ok(`vice varð TALA (${JSON.stringify(back.vice)})`,       isNum(back.vice) && back.vice === 7);
  ok(`plan.gw/outId/inId urdu TOLUR (${JSON.stringify(back.plan?.[0])})`,
     back.plan?.length === 1 && isNum(back.plan[0].gw)
     && isNum(back.plan[0].outId) && isNum(back.plan[0].inId));
  ok(`watch varð TOLUR (${JSON.stringify(back.watch)})`,
     Array.isArray(back.watch) && back.watch.length === 2 && back.watch.every(isNum));
  ok(`rivals[].id varð TALA (${JSON.stringify(back.rivals?.[0])})`,
     back.rivals?.length === 1 && isNum(back.rivals[0].id));
  ok(`benchSwaps-por urdu TOLUR (${JSON.stringify(back.benchSwaps)})`,
     back.benchSwaps?.["3"]?.[0]?.every?.(isNum) === true);
}

/* ============================================================
   B. SVOR FRA PROXY-INU — YTRI GOGN SEM GETA VERID HVAD SEM ER

   `?path=fpl-picks` skilar stigum, banka og lidinu thinu. Koden las
   `entry_history.bank` med `!= null`-profi EINU — sem hleypir STRENG i
   gegn, og hann for beint i peninga-reikninginn: skjarinn bar `NaN`
   (maelt med `bank:"mikid"`). Thetta er ytra svar sem vid stjornum ekki;
   proxy-villa, HTML-villusida eda breyting a FPL getur skilad hverju sem
   er. `null` thydir "veit ekki" og appid kann thad; NaN kann thad ekki.

   Bilunar-hamirnir (500, kastad undantekning, HTML i stad JSON, tomt
   svar) voru ALLIR i lagi fyrir — thad er thvi TALNA-GERDIN sem var
   gatid, ekki netid.
   ============================================================ */
console.log(`\n${"─".repeat(72)}\nSVOR FRA PROXY-INU\n${"─".repeat(72)}`);
{
  const P = n => Array.from({ length: n }, (_, i) => ({ element: i + 1, position: i + 1, multiplier: i === 0 ? 2 : 1 }));
  const R = body => ({ ok: true, status: 200, json: async () => body });
  const PROXY = [
    /* bilun i netinu — thessir voru thegar i lagi og eru vordur */
    ["proxy 500",           { ok: false, status: 500, json: async () => { throw new Error("500"); } }],
    ["proxy kastar",        { get ok() { throw new TypeError("Failed to fetch"); } }],
    ["HTML i stad JSON",    { ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token <"); } }],
    ["tomt svar",           R({})],
    /* efnid sjalft — hér var villan */
    ["leikmenn EKKI TIL",   R({ picks: [{ element: 999999, position: 1, multiplier: 1 }] })],
    ["16 menn",             R({ picks: P(16) })],
    ["position vantar",     R({ picks: [{ element: 1 }, { element: 2 }] })],
    ["FPL villa 404",       R({ error: "404 Not Found" })],
    ["bank er STRENGUR",    R({ entry_history: { bank: "mikid" }, picks: P(15) })],
    ["allar tolur strengir", R({ entry_history: { bank: "x", points: "y", total_points: "z", event_transfers_cost: "w" }, picks: P(15) })],
    ["bank er NaN",         R({ entry_history: { bank: 0 / 0 }, picks: P(15) })],
    ["GILT svar",           R({ entry_history: { bank: 12, points: 50, total_points: 500, event_transfers_cost: 4 }, picks: P(15) })],
  ];

  for (const [label, handler] of PROXY) {
    const dom = new JSDOM("<!doctype html><div id=root></div>",
                          { url: "http://localhost/", pretendToBeVisual: true });
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
    globalThis.HTMLElement = dom.window.HTMLElement;
    globalThis.SVGElement = dom.window.SVGElement;
    globalThis.getComputedStyle = dom.window.getComputedStyle;
    globalThis.localStorage = dom.window.localStorage;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    /* Tengt lid — annars eru proxy-leidirnar aldrei kalladar.          */
    dom.window.localStorage.setItem("fpl_planner_v3", JSON.stringify({ entryId: 123456 }));

    globalThis.fetch = async u => {
      const s = String(u);
      if (s.includes("fpl-picks")) return handler;
      if (s.includes("functions/odds")) return { ok: true, status: 200, json: async () => ({}) };
      const n = s.split("/data/")[1];
      if (!n) return { ok: false, status: 404, json: async () => ({}) };
      try { return { ok: true, status: 200, json: async () => J(n) }; }
      catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
    };

    const oe = console.error, ow = console.warn;
    console.error = () => {}; console.warn = () => {};
    let crash = null, txt = "";
    try {
      const { default: App } = await import(new URL("src/App.jsx", REPO).href);
      const root = createRoot(document.getElementById("root"));
      await act(async () => { root.render(React.createElement(App)); });
      await act(async () => { await new Promise(r => setTimeout(r, 300)); });
      txt = document.body.textContent || "";
    } catch (e) { crash = e.message; }
    console.error = oe; console.warn = ow;

    const usable = txt.includes("Planner") || txt.includes("Player stats");
    const nan = /\bundefined\b|\bNaN\b|\[object Object\]/.test(txt);
    ok(`${label}: nothaeft og an NaN`, !crash && usable && !nan,
       crash ? "KASTADI: " + crash.slice(0, 55) : !usable ? "ekki nothaeft" : "NaN/undefined a skja");
  }
}

/* ============================================================
   C. PROXY-LEIDIRNAR SJALFAR — HVAD SVARAR 200 OG HVAD 400?

   Hin lögin profa hvad appid gerir vid SVARID. Hér er profad hvad
   `netlify/functions/odds.js` gerir vid BEIDNINA — og thad er annad mal:

     · KVOTINN. `path=odds` var opin ollum (`Allow-Origin: *`, engin
       audkenning, ENGINN CDN-cache) og hvert kall kostar 1 einingu af
       500/man. Hun er stadfest onotud: framendinn kallar a `live` og
       `fpl-*`, og pipeline saekir Odds-API BEINT. Lokad 10.8.2026.
     · SLODIN. `fpl-entry`/`fpl-picks` limdu `id`/`gw` obreytt inn i
       uppstreymis-slodina, svo `id=1/transfers/?x=` sotti ADRA slod undir
       fantasy.premierleague.com gegnum okkar proxy. `fpl-league` stadfesti
       thegar; hinar tvaer ekki.

   PROFAD A HREINUM TEXTA, EKKI MED ThVI AD KEYRA FALLID: thad kraefdist
   Netlify-umhverfis. Reglurnar eru fáar og skyrar og lesast beint.
   ============================================================ */
console.log(`\n${"─".repeat(72)}\nPROXY-LEIDIRNAR (netlify/functions/odds.js)\n${"─".repeat(72)}`);
{
  const fn = readFileSync(new URL("netlify/functions/odds.js", REPO), "utf8");
  const code = fn.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  /* 1. KVOTA-LEIDIN ER LOKUD. */
  ok('`path=odds` fer ekki lengur i bokmakera-kallid',
     /path !== "live" && !path\.startsWith\("fpl-"\)/.test(code),
     "hlidid sem lokar odds-greininni fannst ekki");

  /* 2. HVER LEID SEM TEKUR `id`/`gw` STADFESTIR ThAU.
     Lesid per grein svo nyr endapunktur an stadfestingar falli.        */
  for (const route of ["fpl-entry", "fpl-picks", "fpl-league", "fpl-live"]) {
    const i = code.indexOf(`path === "${route}"`);
    if (i < 0) { ok(`${route}: greinin er til`, false); continue; }
    /* Bodyid nær ad naesta `if (path ===` eda 900 stofum.               */
    const rest = code.slice(i, i + 900);
    const body = rest.slice(0, rest.indexOf('path === "', 10) > 0
      ? rest.indexOf('path === "', 10) : rest.length);
    ok(`${route}: stadfestir tolu-vidfang adur en kallad er upp`,
       /\^\\d\+\$/.test(body) && /statusCode: 400/.test(body),
       body.slice(0, 70).replace(/\s+/g, " "));
  }

  /* 3. OThEKKT LEID SVARAR 400 — grunnreglan sjalf.

     FULLYRDINGIN VAR BUNDIN VID ORDALAG OG FELL ThVI VID ThYDINGU
     (11.8.2026). Hun var:
         /statusCode: 400[\s\S]{0,120}óþekkt/
     — hun leitadi ad ISLENSKA ORDINU "óþekkt" i kodanum. Strengurinn var
     thyddur ("unknown or disabled path") thvi App.jsx:872 birtir hann
     ORDRETT a skjanum, og tha fell profid thott hegdunin — 400 fyrir
     othekkta leid — vaeri obreytt.

     CLAUDE.md kafli 5 segir thetta berum ordum: PROF EIGA AD PROFA HEGDUN,
     EKKI ORDALAG. Tvo prof hofdu thegar fallid vid endurnefningu a flipa
     af somu astaedu. Nu er fullyrdingin BYGGINGARLEG: hlidid sjalft
     (fundid i #1) verdur ad skila 400 i sinum eigin blokk. Thad er su
     regla sem skiptir mali og hun er tungumals-ohad.                    */
  const gate = code.search(/path !== "live" && !path\.startsWith\("fpl-"\)/);
  ok("othekkt path svarar 400",
     gate >= 0 && /statusCode: 400/.test(code.slice(gate, gate + 220)),
     gate < 0 ? "hlidid fannst ekki" : code.slice(gate, gate + 120).replace(/\s+/g, " "));

  /* 4. ENGIN LEID MA HLEYPA HANDAHOFSKENNDRI SLOD I UPPSTREYMID.
     Leitad ad slodum sem lima vidfang inn AN thess ad thad hafi verid
     stadfest — grof en virk athugun: hvert `${...}` i FPL-slod verdur ad
     vera breyta sem `^\d+$` var profud a.                              */
  const interpolated = [...code.matchAll(/\$\{FPL_BASE\}[^`]*\$\{(\w+)\}/g)].map(m => m[1]);
  const unchecked = [...new Set(interpolated)].filter(v =>
    !new RegExp(`\\^\\\\d\\+\\$[\\s\\S]{0,200}\\b${v}\\b|\\b${v}\\b[\\s\\S]{0,200}\\^\\\\d\\+\\$`).test(code));
  ok(`hvert vidfang i FPL-slod er stadfest (${interpolated.length} stadir)`,
     unchecked.length === 0, `ostadfest: ${unchecked.join(", ")}`);
}

console.log(`\nOTRAUST INNTAK: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
