/* ============================================================
   VAKTLISTI OG "MITT LID" — profar hegdun, ekki bara ad hnappar seu til

   AF HVERJU SER PROF: thetta er eina eiginleikinn i leikmannalistanum sem
   VISTAR astand milli heimsokna. Ef vistunin brotnar (t.d. reitur fellur ur
   saveState) sest thad ekki i smoke-profinu — thad prófar eina heimsokn.

   FJOGUR ATRIDI SEM ERU PROFUD:
     1. Stjornumerking kviknar/deyr og lendir i localStorage undir `watch`.
     2. Stjarnan i HAUSNUM siar (og radar EKKI — hun var i rodunarhaus).
     3. Graenn bordi liggur a FROSNA NAFNA-HOLFINU, ekki bara a rodinni.
        Rodin skrunar larett; bordi a henni hefdi horfid vid fyrsta skrun.
     4. LITIRNIR ERU AGREINDIR: graent = mitt lid, fjolublatt = samanburdur.
        Adur var samanburdur `greenBg` — sami litur og eignarhald a ad bera.
        Thetta prof fellur ef einhver setur graent bakvid samanburd aftur.

   Maelt 29.7.2026: 12/12 graen.
   ============================================================ */
import { readFileSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { STAT_GROUPS, tableDefs } from "../src/stats.js";

const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
const dom = new JSDOM("<!doctype html><div id=root></div>", { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.fetch = async u => { const n = String(u).split("/data/")[1];
  if (!n) return { ok:false, status:404, json:async()=>({}) };
  try { return { ok:true, status:200, json:async()=>J(n) }; }
  catch { return { ok:false, status:404, json:async()=>{ throw new Error("404"); } }; } };

let pass = 0, fail = 0;
const ok = (name, cond, extra="") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

/* Tomt vaktlista-astand — profid byggir thad upp sjalft. `plan` er ARRAY
   i appinu; `{}` her felldi allt tredi (plan is not iterable) og var minn
   eigin sadningarvilla, ekki appsins. Latum appid gefa sjalfgefid.        */
localStorage.setItem("fpl_planner_v3", JSON.stringify({ watch: [] }));

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async()=>{ root.render(React.createElement(App)); });
await act(async()=>{ await new Promise(r=>setTimeout(r,300)); });

const settle = async () => { await act(async()=>{ await new Promise(r=>setTimeout(r,120)); }); };
const fire = async el => {
  await act(async()=>{ el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
  await settle();
};
/* NAKVAEM leit, ekki `includes`: efst i skelinni er LEITAR-hnappur sem
   heitir lika "Leikmenn" (🔍) og `includes` valdi HANN — flipinn opnadist
   aldrei og profid mældi tomt vidmot. */
/* MATCH A 👥-FORSKEYTINU, ekki a fullu heiti. Nakvaem leit var sett hér
   thvi LEITAR-hnappurinn het lika "Leikmenn" og `includes` valdi HANN.
   Sa arekstur er farinn (hnappurinn heitir nu "Leita"), og nakvaema leitin
   brotnadi um leid og flipinn var endurnefndur i "Leikmannatolur" — profid
   a ad prófa HEGDUN, ekki ordalag.                                       */
const byExact = t => [...document.querySelectorAll("button")].find(x=>x.textContent.trim()===t);
const byTab = emoji => [...document.querySelectorAll("button")].find(x=>x.textContent.trim().startsWith(emoji));
const stars = () => [...document.querySelectorAll("button")].filter(x=>x.textContent==="★"||x.textContent==="☆");
const rowStars = () => stars().filter(x=>x.getAttribute("aria-label"));
const headStar = () => stars().find(x=>!x.getAttribute("aria-label"));
const stored = () => JSON.parse(localStorage.getItem("fpl_planner_v3")||"{}").watch;

await fire(byTab("👥"));

console.log("\nVAKTLISTI");
ok("stjarna a hverri rod", rowStars().length > 10, `fann ${rowStars().length}`);
ok("ein stjarna i hausnum", !!headStar());
ok("hausstjarnan er SIA, ekki rodun", /watchlist/i.test(headStar()?.title||""), headStar()?.title);

const first = rowStars()[0];
const firstName = (first.getAttribute("aria-label")||"").replace(/^(Add|Remove) | (to|from) the watchlist$/g,"");
ok("otom stjarna er hol (☆)", first.textContent==="☆");
await fire(first);
const onNow = rowStars().filter(x=>x.textContent==="★");
ok("smellur fyllir stjornuna", onNow.length===1, `${onNow.length} fylltar`);
ok("astandid lendir i localStorage", Array.isArray(stored()) && stored().length===1, JSON.stringify(stored()));
ok("aria-label snyst vid", /^Remove /.test(onNow[0]?.getAttribute("aria-label")||""));

/* stjornumerkja tvo til vidbotar svo sian hafi eitthvad ad sia */
await fire(rowStars()[2]); await fire(rowStars()[4]);
const threeIds = stored();
ok("thrir a vaktlista, engin tvitekning", threeIds.length===3 && new Set(threeIds).size===3, JSON.stringify(threeIds));

console.log("\nSIA");
const before = rowStars().length;
await fire(headStar());
const after = rowStars().length;
ok("hausstjarnan siar nidur a vaktlistann", after===3 && before>3, `${before} -> ${after}`);
ok("aria-pressed rett thegar sian er a", headStar()?.getAttribute("aria-pressed")==="true");
await fire(headStar());
ok("sia af skilar ollum aftur", rowStars().length===before, `${rowStars().length} vs ${before}`);

console.log("\nAFMERKING");
const onBtn = rowStars().find(x=>x.textContent==="★");
await fire(onBtn);
ok("smellur aftur tekur af vaktlista", stored().length===2, JSON.stringify(stored()));

console.log("\nLITIR — GRAENT = MITT LID, FJOLUBLATT = SAMANBURDUR");
/* Litirnir eru lesnir ur JSX-skranni thvi jsdom reiknar ekki innskotna stila
   sem inline-`style` fyrr en ad rendera; textinn er auk thess vordur gegn
   theim ad einhver setji graent bakvid samanburd aftur. */
const src = readFileSync(new URL("src/PlayerList.jsx", REPO).pathname, "utf8");
const picked = (src.match(/rowPicked:\{\s*background:\s*"?([^",}]+)"?/)||[])[1];
const mine   = (src.match(/rowMine:\{\s*background:\s*"?([^",}]+)"?/)||[])[1];
ok("samanburdur er EKKI graenn (var greenBg)", picked && !/green/i.test(picked), String(picked));
ok("mitt lid hefur eigin bakgrunn", !!mine, String(mine));
ok("bordinn er a HOLFINU (boxShadow inset), ekki a rodinni",
   /cellMine:\{[^}]*inset/.test(src));

console.log("\nGRAENN BORDI A FROSNA HOLFINU — LIFANDI");
/* HER VAR SIAD A "my squad"-HAKKASSANN — HANN ER FARINN (17.8.2026).
   Sian var tekin ur `PlayerList.jsx` ad beidni notandans asamt fjorum
   odrum, svo thessi kafli gat ekki lengur byrjad a henni. Hann var EKKI
   felldur ut: bordinn er thad sem kaflinn ver, ekki sian sem for.
   I stadinn er lesid BEINT ur sjalfgefnu utsyninni, og forsendan er
   MAELD i stad thess ad vera bui til med siu: 6 af 31 syndum rodum eru
   lidsmenn (sjalfgefid lid + sjalfgefin rodun eftir stigum). Baðar
   attirnar eru fullyrtar — ad einhver rod se merkt OG ad ekki seu ALLAR
   merktar — thvi bordi sem liggur a ollum segir ekkert.                */
/* ============================================================
   OG FORSENDAN VAR ERFD, EKKI VALIN — LAGAD 22.8.2026

   "6 af 31 syndum rodum eru lidsmenn (sjalfgefid lid + sjalfgefin rodun
   eftir stigum)" var MAELT og RETT — a arkivinu. Sjalfgefna timabilid i
   Player stats faerdist a yfirstandandi timabil um leid og GW1-fresturinn
   leid (`startedGw > 0`), og eftir eina umferd radar sjalfgefna rodunin
   monnum sem enginn a: maelt 22.8.2026 voru **0 af 31** syndum rodum
   lidsmenn og kaflinn maeldi ekkert.

   BORDINN SJALFUR ER OHREYFDUR — thad var URTAKID sem hvarf. Kaflinn
   VELUR thvi timabilid sem hann tharf i stad thess ad erfa thad, og segir
   thad berum ordum. Talan er LEIDD ur `player_seasons.json` (sama skra og
   `olderSeasons` i PlayerList) svo hun ureldist ekki naesta agust.
   Fyrri kaflar eru OSNERTIR: their maela sjalfgefna utsynid og eiga ad
   gera thad afram.
   ============================================================ */
{
  /* Fast bid er ekki maeling a thvi ad teikningu se lokid — timabils-skipti
     endur-elda 600 radir. Bedid er thangad til textinn haettir ad vaxa
     (sama adferd og `settleOn` i `data-resilience.mjs`).                */
  const settleOn = async () => {
    let last = -1, stable = 0;
    for (let i = 0; i < 40; i++) {
      await act(async () => { await new Promise(r => setTimeout(r, 25)); });
      const n = (document.body.textContent || "").length;
      if (n === last) { if (++stable >= 2) break; } else { stable = 0; last = n; }
    }
  };
  const ARCHIVE = J("player_seasons.json").seasons[0];
  const sel = document.querySelector("select");
  ok("timabils-valid er addressanlegt", !!sel);
  sel.value = ARCHIVE;
  await act(async () => { sel.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  await settleOn();
  ok(`listinn stendur a ${ARCHIVE} (valid tok, ekki erft)`,
     document.querySelector("select")?.value === ARCHIVE,
     String(document.querySelector("select")?.value));

  const cells = rowStars().map(b => b.parentElement);
  const banded = cells.filter(c => /inset/.test(c.style.boxShadow||""));
  ok(`lidsmenn eru i syndu rodunum (${banded.length} af ${cells.length}) — forsenda kaflans`,
     banded.length > 0, "enginn lidsmadur a skja: kaflinn maelir ekkert");
  ok("...og bordinn liggur EKKI a ollum rodum (annars merkir hann ekkert)",
     banded.length < cells.length, `${banded.length}/${cells.length}`);
  ok("bordinn er a HOLFINU, ekki adeins a rodinni",
     banded.length>0 && banded[0].parentElement !== banded[0] &&
     !/inset/.test(banded[0].parentElement.style.boxShadow||""));
}

/* ---- FLOKKA-RODIN: BROTNAR A BORDI, STRJUKAST I SIMA ----
   Maelt 7.8.2026: rodin var alltaf nowrap + overflowX:auto MED
   `scrollbarWidth:none`, svo a bordi voru 289 px af 1.539 px utan skjas
   og TVEIR flokkar osynilegir an nokkurrar visbendingar (13. flokkurinn,
   DC-hittni, var thad sem fyllti maelinn). jsdom er 1024 px breitt =
   BORD, svo hann a ad brotna her. Simamalid (<560) heldur strjuk-rodinni
   — thad er RETT thar (kafli 6i) og er gaett i koda gegnum `narrow`.   */
{
  /* AKKERID VAR "Set pieces and cards" OG SA FLOKKUR HEFUR ENGAN HNAPP
     LENGUR (25.8.2026 — hann er allur `build_only`). Hnappur sem er ekki
     til gefur `undefined` og BADAR fullyrdingarnar hér a eftir hefdu
     tha lesid `undefined?.style` — thoegult graent i annarri og villandi
     rautt i hinni. Akkerid er thvi LEITT ur flokka-rodinni sjalfri: sidasti
     flokkurinn sem A hnapp, hver sem hann er.                          */
  const gLabels = STAT_GROUPS.filter(g => tableDefs({ group: g.key }).length).map(g => g.label);
  ok(`forsenda: ${gLabels.length} flokkar eiga hnapp`, gLabels.length >= 4);
  const gRow = [...document.querySelectorAll("button")]
    .find(b => b.textContent.trim() === gLabels[gLabels.length - 1])?.parentElement;
  ok("flokka-rodin finnst", !!gRow);
  ok("a BORDI brotnar rodin (flexWrap:wrap) svo allir flokkar sjaist",
    gRow?.style.flexWrap === "wrap", `fekk "${gRow?.style.flexWrap}"`);
  ok("engin flokka-hnappur er falinn i larettu skruni a bordi",
    !gRow || gRow.scrollWidth <= gRow.clientWidth + 1,
    `scrollWidth ${gRow?.scrollWidth} vs clientWidth ${gRow?.clientWidth}`);
}

console.log(`\nVAKTLISTI: ${pass}/${pass+fail} graen`);
process.exit(fail ? 1 : 0);
