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
/* Siar a "mitt lid" svo lidsmenn seu vissulega i syndu rodunum — annars
   gaeti profid stadist bara vegna thess ad enginn theirra var a skjanum. */
const mineBox = [...document.querySelectorAll("input[type=checkbox]")]
  .find(c => (c.parentElement?.textContent||"").includes("my squad"));
ok("hakkassi fyrir \"mitt lid\" er til", !!mineBox);
if (mineBox) {
  await fire(mineBox);
  const cells = rowStars().map(b => b.parentElement);
  const banded = cells.filter(c => /inset/.test(c.style.boxShadow||""));
  ok("hver synd rod i minu lidi ber bordann", cells.length>0 && banded.length===cells.length,
     `${banded.length}/${cells.length}`);
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
  const gRow = [...document.querySelectorAll("button")]
    .find(b => /Föst leikatriði og spjöld|Set pieces and cards/.test(b.textContent))?.parentElement;
  ok("flokka-rodin finnst", !!gRow);
  ok("a BORDI brotnar rodin (flexWrap:wrap) svo allir flokkar sjaist",
    gRow?.style.flexWrap === "wrap", `fekk "${gRow?.style.flexWrap}"`);
  ok("engin flokka-hnappur er falinn i larettu skruni a bordi",
    !gRow || gRow.scrollWidth <= gRow.clientWidth + 1,
    `scrollWidth ${gRow?.scrollWidth} vs clientWidth ${gRow?.clientWidth}`);
}

console.log(`\nVAKTLISTI: ${pass}/${pass+fail} graen`);
process.exit(fail ? 1 : 0);
