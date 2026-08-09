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
  ["rivals rusl",           JSON.stringify({ rivals: [{ id: null }, "x", 42] })],
  ["watch er hlutur",       JSON.stringify({ watch: { a: 1 } })],
  ["benchSwaps gildi rangt", JSON.stringify({ benchSwaps: { "1": "x" } })],
  ["allt rangt i einu",     JSON.stringify({ entryId: "abc", plan: null, captain: {}, vice: [],
                                             chips: "x", buyPrices: 7, rivals: {}, watch: 1,
                                             benchSwaps: null })],
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
  if (crash || !usable) crashed++;
  ok(`${label}: appid er nothaeft`, !crash && usable,
     crash ? "KASTADI: " + crash.slice(0, 60) : `ekki nothaeft (${txt.trim().length} staf)`);
}

ok(`ekkert af ${CASES.length} astondum fellir appid`, crashed === 0, `${crashed} felldu`);

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
    const nan = /undefined|NaN|\[object Object\]/.test(txt);
    ok(`${label}: nothaeft og an NaN`, !crash && usable && !nan,
       crash ? "KASTADI: " + crash.slice(0, 55) : !usable ? "ekki nothaeft" : "NaN/undefined a skja");
  }
}

console.log(`\nOTRAUST INNTAK: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
