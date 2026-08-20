/* ============================================================
   "ThU NOTAR HANN ALDREI" — HIN HLIDIN: BORDINN A AD ThEGJA

   HVERS VEGNA SER SKRA: `smoke.test.mjs` skrifar `fpl_planner_v3` MED
   bekkjar-vixlum adur en appid er teiknad, svo thad getur ekki profad
   ostillt astand. Athugasemd thar sagdi "profad nedar" og su fullyrding
   var OSONN — engin fullyrding um thogn var til (fundid 18.8.2026 med
   stokkbreytingu sem fjarlaegdi `planned`-hlidid og slapp i gegn).

   ThRJAR HLIDAR ERU PROFADAR, ALLAR MED SOMU TOLU A SKJANUM:
     1. engin planun            -> ThOGN
     2. vixl vid SJALFAN SIG    -> ThOGN  (nullaðgerd, en var "planun")
     3. vixl a id sem eru hvergi -> ThOGN (sama)
     4. RAUNVERULEG vixl        -> BORDINN (annars maelir 1-3 ekkert)
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { playedEvents } from "./lib/played-events.mjs";

let pass = 0, fail = 0;
const ok = (c, n, x = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                 : (fail++, console.log(`  ✗ ${n} ${x}`)); };
const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

async function render(state, patch = null) {
  const dom = new JSDOM("<!doctype html><div id=root></div>",
    { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  if (state) dom.window.localStorage.setItem("fpl_planner_v3", JSON.stringify(state));
  const orig = console.error;
  console.error = (...a) => { const m = String(a[0] ?? ""); if (!/not wrapped in act|Warning:/.test(m)) orig(...a); };
  globalThis.fetch = async u => {
    const n = String(u).split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => ({}) };
    if (patch && patch[n]) return { ok: true, status: 200, json: async () => patch[n] };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("no"); } }; }
  };
  const { default: App } = await import("../src/App.jsx");
  createRoot(document.getElementById("root")).render(React.createElement(App));
  await act(async () => { await new Promise(r => setTimeout(r, 300)); });
  console.error = orig;
  return document.body.textContent || "";
}

console.log(`\n${"=".repeat(84)}`);
console.log("AAETLUNAR-BORDINN — ThOGN ThEGAR EKKERT ER PLANAD");
console.log("=".repeat(84));

const HAS = t => /Not been in your XI/.test(t);

/* ============================================================
   TIMABILID VERDUR AD VERA BYRJAD (20.8.2026)
   ============================================================
   Bordinn horfir nu AFTURABAK og er thvi ThOGULL i forleik — og
   committud `events.json` ER forleikur. An thessa patch-s vaeri HVER
   fullyrding hér ad nedan graen af RANGRI astaedu (bordinn er ekki til),
   og fullyrdingin "raunveruleg vixl -> bordinn birtist" hefdi fallid og
   sagt hvers vegna. Sja `tests/lib/played-events.mjs`.
   ============================================================ */
const PLAYED = { "events.json": { events: playedEvents(J("events.json").events, 4) } };

/* FORSENDAN FYRST: i FORLEIK segir bordinn EKKERT — engin saga er til.  */
ok(!HAS(await render({ captain: 411, benchSwaps: { 1: [[411, 321]] } })),
   "FORLEIKUR: engin notkunar-saga -> bordinn segir EKKERT (ekki tom fullyrding)");

ok(!HAS(await render(null, PLAYED)), "engin planun -> ThOGN");

const self = {}; for (let g = 1; g <= 6; g++) self[g] = [[411, 411]];
ok(!HAS(await render({ captain: 411, benchSwaps: self }, PLAYED)),
   "vixl vid SJALFAN SIG er nullaðgerd -> ThOGN");

const ghost = {}; for (let g = 1; g <= 6; g++) ghost[g] = [[999998, 999999]];
ok(!HAS(await render({ captain: 411, benchSwaps: ghost }, PLAYED)),
   "vixl a id sem eru hvergi til -> ThOGN");

/* FORSENDAN — an hennar vaeri "thogn" graent af thvi ad bordinn virkar
   aldrei, og hinar thrjar fullyrdingarnar maeldu ekkert.

   OG ThAD SEM ThETTA SAFN SANNAR EKKI, SAGT BERUM ORDUM (18.8.2026):
   i proflidinu er BEKKURINN ALLUR A VERDGOLFI (Dubravka £4,0, Thomas og
   Hughes £4,0, Walle Egeli £4,5), svo thogn i tilfellum 1-3 hefur TVAER
   ohadar orsakir — `planned`-hlidid OG verdgolfs-undanthaguna. Maelt:
   stokkbreyting sem slekkur a `planned`-hlidinu heldur safninu GRAENU.
   Safnid sannar thvi UTKOMUNA (bordinn thegir i thessum stodum), ekki ad
   hlidid se thad sem thaggar hann. Ad syna hlidid eitt tharf hop thar sem
   DYR madur situr a bekknum an nokkurrar planunar, og thann hop er ekki
   haegt ad smiða ur `localStorage` — hann kemur ur tengdu FPL-lidi
   (`squadOverride`). Reglan sjalf er profud i `model.test.mjs`.        */
/* EIN FAERSLA — sja athugasemdina i smoke.test.mjs: uppstillingin erfist
   nu fram, svo sex eins faerslur toggla i stad thess ad safnast.       */
const real = { 1: [[411, 321]] };
const t = await render({ captain: 411, benchSwaps: real }, PLAYED);
ok(HAS(t), "RAUNVERULEG vixl -> bordinn birtist (forsenda hinna thriggja)");
ok(/Save £/.test(t), "og hann ber tolu um losad fe");

console.log(`\nAAETLUNAR-BORDINN: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
