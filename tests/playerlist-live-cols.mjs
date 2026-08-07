/* ============================================================
   LIFANDI DÁLKAR Í LEIKMANNALISTANUM — tengingavörður

   AF HVERJU: "DefCon liðs"-dálkurinn var DAUÐUR FRÁ FÆÐINGU og enginn
   sá það — cook gaf num() HLUTINN sjálfan (ekki .defcon_opportunity),
   num(hlutur) er null, og dálkur sem er null hjá öllum FELUR SIG
   SJÁLFUR sem "tómur dálkur". Eiginleikinn sem gerir dálka örugga
   (null-reglan í 6i) faldi líkið. Fannst 4.8.2026 þegar sama tenging
   var skrifuð fyrir DC-hittni.

   Þetta safn opnar leikmannalistann í jsdom með HERMDU defcon.json
   (DC-hittni-dálkarnir eru annars tómir til 21.8.) og les GILDIN úr
   DOM-inu. TVÆR jsdom-gildrur sem prófið sneiðir hjá:
     · leitin er stýrður React-reitur og innsláttur er ótraustur
       (sama gildra og smoke-prófið skjalfestir) — því er RAÐAÐ í stað
       þess að sía: null raðast ALLTAF SÍÐAST (6i-reglan), svo röðun
       eftir nýja dálknum flýtur einu gagna-röðinni efst í sýndarglugga
       listans. Prófið notar þannig eiginleikann sem það ver.
     · listinn er sýndarvæddur — röð utan gluggans er EKKI í DOM.

   Keyrsla: loader-safn (sjá run-tests.mjs).
   ============================================================ */
import { readFileSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
const dom = new JSDOM("<!doctype html><div id=root></div>", { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const DEF_ID = 11; // Mosquera — ARS DEF (lid 1), i sjalfgefna lidinu

globalThis.fetch = async u => {
  const n = String(u).split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  /* DEFCON_HISTORY: fra 7.8.2026 FYLGJA DC-dalkarnir voldu timabili og
     lesa `defcon_history.json` (lyklad a `code`) thegar sogulegt timabil
     er valid — sem er SJALFGEFID i forleik (2025/26). Hermum thvi BADAR
     heimildir: history fyrir sjalfgefna sýn, defcon.json fyrir lifandi. */
  if (n === "defcon_history.json") {
    return { ok: true, status: 200, json: async () => ({
      seasons: { "2025/26": { "500040": {   // Mosquera (FPL code)
        pos: "DEF", starts: 12, hits: 9, p0: 0.361,
        hit_rate: 0.75, hit_rate_adj: 0.573 } } } }) };
  }
  if (n === "defcon.json") {
    const real = J(n);
    return { ok: true, status: 200, json: async () => ({ ...real, players: [
      { fpl_id: DEF_ID, position: 2, starts: 12, threshold_hits: 9,
        hit_rate: 0.75, hit_rate_adj: 0.573, p0: 0.361, cbit_per_90: 9.1, cbirt_per_90: 13.2 },
    ] }) };
  }
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

localStorage.setItem("fpl_planner_v3", JSON.stringify({ watch: [] }));

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 300)); });

const settle = async () => { await act(async () => { await new Promise(r => setTimeout(r, 120)); }); };
const fire = async el => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle();
};
const byTab = emoji => [...document.querySelectorAll("button")].find(x => x.textContent.trim().startsWith(emoji));
const byExact = t => [...document.querySelectorAll("button")].find(x => x.textContent.trim() === t);

/* Haus-hólfin eru div (listinn er ekki <table>) — smellt á minnsta
   stakið sem ber nákvæmlega heitið (röðunar-örvar og ∑ hreinsuð).      */
const clickHeader = async label => {
  const el = [...document.querySelectorAll("div,span")]
    .filter(x => x.textContent.trim().replace(/[↑↓∑†]/g, "").trim() === label)
    .at(-1);
  if (!el) return false;
  await fire(el);
  return true;
};
/* Textinn í röð Mosquera: gengið upp frá nafna-hnappnum þar til hólfið
   ber tölugildi (röðin), en stoppað áður en allt tréð gleypist.         */
const mosRowText = () => {
  const mos = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Mosquera"));
  let el = mos;
  for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
    const t = el.textContent || "";
    if (t.length > 2000) break;
    if (/%|\d\d/.test(t.replace("Mosquera", ""))) return t;
  }
  return mos?.textContent || "";
};

await fire(byTab("👥"));
console.log("\nLIFANDI DÁLKAR (hermt defcon.json)");

/* ---- 1. DC-hittni-flokkurinn: nyju dalkarnir ---- */
ok("flokka-hnappurinn 'DC-hittni' er til", !!byExact("DC-hittni"));
await fire(byExact("DC-hittni"));
ok("raðað eftir 'DC-leikir (n)' — null-síðast flýtur gagna-röðinni efst",
  await clickHeader("DC-leikir (n)"));
let txt = mosRowText();
ok("Mosquera-röðin er í sýnda glugganum eftir röðun", txt.includes("Mosquera"),
  `— fékk "${txt.slice(0, 80)}"`);
ok("leiðrétta talan er birt (57%)", /57%/.test(txt),
  "— afturvirknin er dauð í listanum ef aðeins hráa talan birtist");
ok("hráa talan sést til gagnsæis (75%)", /75%/.test(txt));
/* Dalkarnir limast saman i textContent ("...57%75%12...") — n-gildid er
   thvi profad sem THRENNDIN adj%,raw%,n i skilgreiningar-rod, ekki med
   \b (tolustafur fylgir beint a eftir og eydir ordamorkunum).          */
ok("n-dálkurinn ber leikjafjöldann (þrenndin 57%75%12)", txt.includes("57%75%12"));

/* ---- 2. team_dc UPPRISAN: dalkurinn var daudur fra faedingu ----
   Rodunin eftir dc_starts heldur ser thegar skipt er um flokk, svo
   Mosquera er AFRAM efstur — vid lesum team_dc-toluna ur hans rod.
   ARS defcon_opportunity ur RAUNskranni (53 i dag, endurreiknad her). */
const arsOpp = String(J("defcon.json").opportunity["1"].defcon_opportunity);
await fire(byExact("Leikir framundan"));
txt = mosRowText();
ok(`team_dc ber TÖLU — ARS-röð Mosquera sýnir ${arsOpp} (dálkurinn var dauður frá fæðingu)`,
  txt.includes("Mosquera") && txt.includes(arsOpp),
  `— fékk "${txt.slice(0, 120)}" · num(hlutur)=null stökkbreytingin fellir þetta`);

console.log(`\nLIFANDI DÁLKAR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
