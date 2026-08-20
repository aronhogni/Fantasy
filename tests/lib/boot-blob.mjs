/* ============================================================
   BOOT UR BLOBBINU EINU — EIN UTFAERSLA, TVEIR NOTENDUR (20.8.2026)

   ThETTA VAR I `gw1-persistence.mjs` OG ER FLUTT HINGAD OBREYTT. Astaedan
   er reglan sem repo-id hefur borgad fyrir thrisvar (`buildTeamMetrics`
   skrifadi NaN a 17 lid og merkti thad `src:"e0"`; `headWidth` var graent i
   profinu medan 25 hausar klipptust; `ZONE_RE` vantadi markteiginn i BADUM
   afritum): ein spurning, ein utfaersla.

   `initial-squad.mjs` H2 tharf NAKVAEMLEGA thessa ferd — localStorage ->
   skjar, appid rifid nidur og reist upp ur baetunum einum — til ad svara
   „les GAMALT blobb thad sama sem adur?". Annad harness vaeri onnur ferd
   og gaeti verid graent a medan hin er rauð.

   `sleep` OG `J` ERU INNI HER (ekki innspytt): thau eru hluti af
   ferdinni sjalfri — `delay` a `fetch` er thad sem gerir R7-villuna
   synilega (vistad astand + haeg sokn), og `J` les SOMU committudu
   `data/`-skrarnar sem appid les.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const D = new URL("../../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
const realSetTimeout = globalThis.setTimeout;
const sleep = ms => new Promise(r => realSetTimeout(r, ms));

/* ============================================================
   HLEDSLA — EIN FUNKSJON, HVERT KALL ER NY VOFRA-LOTA

   `state` er RATT BLOB-STRENGUR (eda null = notandi sem hefur aldrei
   vistad neitt). Strengur, ekki hlutur: hord endurhledsla flytur BAETI,
   og ef profid flytti hlut vaeri `JSON.stringify`/`parse`-ferdin — thar
   sem `undefined`-svid tapast og tolur namundast — ekki maeld.
   ============================================================ */
export async function boot(state, { delay = 0 } = {}) {
  const dom = new JSDOM("<!doctype html><div id=root></div>",
    { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.innerWidth = 1280;
  if (!("oninput" in dom.window.HTMLElement.prototype))
    for (const ev of ["oninput", "onchange"])
      Object.defineProperty(dom.window.HTMLElement.prototype, ev, {
        get() { return null; }, set() {}, configurable: true });
  if (state != null) dom.window.localStorage.setItem("fpl_planner_v3", state);

  globalThis.fetch = async u => {
    /* `delay` ER EKKI SKRAUT — sja R7: villan sem CLAUDE.md kafli 13 lysir
       (`priceFloors` a `null` ur state) kviknadi ADEINS thegar VISTAD
       ASTAND og HAEG SOKN komu saman, og hvorugt tholprofa-safnid
       (`data-resilience`, `untrusted-input`) profar bada asa.          */
    if (delay) await sleep(delay);
    const n = String(u).split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => { throw new Error("no proxy"); } };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
  };

  const orig = console.error, ow = console.warn;
  console.error = (...a) => { const m = String(a[0] ?? ""); if (!/not wrapped in act|Warning:/.test(m)) orig(...a); };
  console.warn = () => {};
  let crash = null, root = null;
  try {
    const { default: App } = await import("../../src/App.jsx");
    root = createRoot(dom.window.document.getElementById("root"));
    await act(async () => { root.render(React.createElement(App)); });
    await act(async () => { await sleep(340); });
  } catch (e) { crash = e.message || String(e); }
  console.error = orig; console.warn = ow;

  const doc = dom.window.document;
  return {
    crash, doc, dom,
    text: () => doc.body.textContent || "",
    q: s => [...doc.querySelectorAll(s)],
    /* SMELLUR. `initial-squad.mjs` H2 tharf ad FLAKKA milli umferda eftir
       boot (jafngildid er umferd-fyrir-umferd), og `dom.window.MouseEvent`
       verdur ad koma UR ThESSARI JSDOM-lotu — atburdur ur annarri lotu
       fer ekki gegnum React. Thess vegna er hann HER og ekki afritadur i
       kallandann.                                                        */
    click: async el => {
      if (!el) return false;
      await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
      await act(async () => { await sleep(50); });
      return true;
    },
    /* RATT blobbid sem appid skrifadi — baetin sem hord endurhledsla flytur. */
    raw: () => dom.window.localStorage.getItem("fpl_planner_v3"),
    /* `saved()` er SAMA UTFAERSLA undir odru nafni — `initial-squad.mjs`
       les „hvad stendur a disk EFTIR lestur?" og `raw` heitir eftir
       „baetin sem hord endurhledsla flytur". Eitt fall, tvo heiti, ENGIN
       tvitekning: annad afrit gaeti lesid annan lykil.                  */
    saved: () => dom.window.localStorage.getItem("fpl_planner_v3"),
    /* RIF NIDUR. React-rotin er tekin af og JSDOM-inum fleygt; ekkert
       fer med yfir nema `raw()`.                                        */
    down: async () => { await act(async () => { root && root.unmount(); }); dom.window.close(); },
  };
}

