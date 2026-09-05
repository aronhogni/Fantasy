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
import { selectGw } from "./select-gw.mjs";
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
/* ============================================================
   `picks` — RAUNLIDID UR FPL, GEGNUM PROXYINN (21.8.2026)

   BAETT VID FYRIR OPNUNARDAGS-VILLUNA: „Connected — 15 players fetched
   for gameweek 1, en rett lid kemur ekki." Hun kviknar ADEINS thegar
   VISTAD `plan` og RAUNLID koma saman, og hvorugt profa-safnid gat sett
   thad upp: `boot` skiladi 404 fyrir hverja slod sem er ekki `/data/`,
   svo `squadOverride` gat ekki ordid annad en `null`. Ferd sem getur
   ekki nad astandinu er ekki vordur um thad.

   `picks` er HRATT SVAR (sama hlutur sem `?path=fpl-picks` skilar), ekki
   listi af id-um: profid a ad fara gegnum sömu vorpun sem appid gerir
   (`p.position <= 11`, `is_captain`, `entry_history.bank`), annars vaeri
   vorpunin sjalf oprofud — og hun er einmitt thar sem bekkurinn og
   bandid geta tapast.
   ============================================================ */
/* `gw` — HVADA UMFERD ER OPIN ThEGAR PROFID BYRJAR (27.8.2026)
   Sjalfgildid er `null` = "ekki snerta", svo eldri kallendur breytast ekki.
   Safn sem er UM akvedna umferd a ad SEGJA thad: appid opnar a theirri
   umferd sem er verid ad skipuleggja (`planningGw`), og su tala faerist
   um leid og umferd klarast. Sja `tests/lib/select-gw.mjs`.            */
export async function boot(state, { delay = 0, picks = null, entry = null, warns = null, gw = null,
                                    /* `onFetch` — SJA HVER SOKN ER GERD, ekki adeins
                                       hvad kom til baka. Baett vid 5.9.2026 fyrir
                                       „endurstilling saekir raunlidid upp a nytt":
                                       su fullyrding er UM SOKNINA sjalfa, svo hun
                                       verdur ad vera synileg kallandanum.        */
                                    onFetch = null } = {}) {
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
    const s = String(u);
    if (onFetch) onFetch(s);
    /* PROXY-LEIDIRNAR FYRST. Almenni `/data/`-handlerinn ma ekki gleypa
       thaer — sertaekir mock-ar verda ad koma A UNDAN honum (CLAUDE.md 5,
       jsdom-gildrurnar).                                                */
    if (picks && s.includes("path=fpl-picks"))
      return { ok: true, status: 200, json: async () => picks };
    /* ADEINS ThEGAR KALLANDINN BAD UM ThAD. Vaeri thetta skilyrdislaust
       breytti `boot` hegdun fyrir OLL eldri tilfellin (andstaedinga-
       effectinn og `connectUrl` sæju 200 i stad 404), og tha vaeri nyr
       valkostur ordinn thogul breyting a profum sem eru thegar graen. */
    if ((entry || picks) && s.includes("path=fpl-entry"))
      return { ok: true, status: 200, json: async () => (entry || { id: 179938, name: "Test", player_first_name: "T", player_last_name: "T" }) };
    const n = s.split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => { throw new Error("no proxy"); } };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
  };

  /* ============================================================
     `warns` — SAFNA I STAD AD GLEYPA (21.8.2026)
     ============================================================
     Filterinn hér gleypir „Warning:" svo `act`-nagg fylli ekki utpudid.
     Sa filter GERIR ThAD SAMA vid raunverulegar React-vidvaranir, og
     ThAER kvikna nanast allar vid FYRSTU teikningu — sem er INNI i
     `boot`. Fullyrding sem kallandinn setur upp EFTIR `boot` getur thvi
     ekki fallid; maelt med tveimur stokkbreytingum (ogildur DOM-
     eiginleiki a hnappnum · listi an lykils) sem BADAR slupppu i gegn.
     Fylkid sem er sent inn faer thvi vidvaranirnar sjalfar, svo
     kallandinn geti fullyrt um thaer. An thess er thognin hér innbyggd.

     SIAN ER SU SAMA SEM `react-warnings.mjs` NOTAR, OG ThAD ER MAELT
     NAUDSYNLEGT: fyrsta utgafa safnadi eftir `/Warning:/` — og React 19
     SETUR ThAD FORSKEYTI EKKI LENGUR, svo hun fangadi NULL og badar
     stokkbreytingarnar slupppu afram i gegn (0 fallnar). Maelitaekid var
     sjalft villan (CLAUDE.md 5b). Nu er ALLT tekid nema `act`-naggid og
     deprecation-sudid, nakvaemlega eins og thar.
     ============================================================ */
  const NOISE = /not wrapped in act|DeprecationWarning|module\.register|attachEvent|trace-deprecation/;
  const orig = console.error, ow = console.warn;
  const grab = (...a) => { const m = String(a[0] ?? "");
    if (NOISE.test(m)) return;
    if (Array.isArray(warns)) { warns.push(m.slice(0, 200)); return; }
    if (!/Warning:/.test(m)) orig(...a); };
  console.error = grab;
  console.warn = Array.isArray(warns) ? grab : () => {};
  let crash = null, root = null;
  try {
    const { default: App } = await import("../../src/App.jsx");
    root = createRoot(dom.window.document.getElementById("root"));
    await act(async () => { root.render(React.createElement(App)); });
    await act(async () => { await sleep(340); });
  } catch (e) { crash = e.message || String(e); }
  console.error = orig; console.warn = ow;

  const doc = dom.window.document;
  const clickEl = async el => {
    if (!el) return false;
    await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    await act(async () => { await sleep(50); });
    return true;
  };
  /* `gwPicked`: `null` = ekki bedid um, `false` = BEDID UM OG MISTOKST.
     Kallandinn a ad fullyrda um `false`-tilfellid — thogul mistok her
     letu safnid keyra a hvada umferd sem er og lita eins ut.          */
  const gwPicked = (gw == null || crash) ? null : await selectGw(doc, gw, clickEl);
  return {
    crash, doc, dom, gwPicked,
    text: () => doc.body.textContent || "",
    q: s => [...doc.querySelectorAll(s)],
    /* SMELLUR. `initial-squad.mjs` H2 tharf ad FLAKKA milli umferda eftir
       boot (jafngildid er umferd-fyrir-umferd), og `dom.window.MouseEvent`
       verdur ad koma UR ThESSARI JSDOM-lotu — atburdur ur annarri lotu
       fer ekki gegnum React. Thess vegna er hann HER og ekki afritadur i
       kallandann.                                                        */
    click: clickEl,
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

