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
ok("flokka-hnappurinn 'Vörn' er til (DC-hittni fluttist thangad 7.8.)", !!byExact("Defence"));
await fire(byExact("Defence"));
ok("raðað eftir 'DC-leikir (n)' — null-síðast flýtur gagna-röðinni efst",
  await clickHeader("DC n"));
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
await fire(byExact("Upcoming fixtures"));
txt = mosRowText();
ok(`team_dc ber TÖLU — ARS-röð Mosquera sýnir ${arsOpp} (dálkurinn var dauður frá fæðingu)`,
  txt.includes("Mosquera") && txt.includes(arsOpp),
  `— fékk "${txt.slice(0, 120)}" · num(hlutur)=null stökkbreytingin fellir þetta`);

/* ---- 3. STIGATAFLAN FAER SOMU AUDGUN — VORDUR GEGN 20 TOMUM KOSSUM ----
   MAELT 8.8.2026: stigataflan fekk HRAT players.json, svo hver kassi i Ogn
   (8/8), Leikjum framundan (5/5) og Jofnudi (4/4) sagdi "No numbers" — thrir
   HEILIR flokkar daudir. Rotin var ekki tolan og ekki skrain: audgunin var
   adeins til a EINUM stad (cook i PlayerList).
   Thetta profar TENGINGUNA, ekki formuluna: `stats.test.mjs` kafli 14 maelir
   ad `makeEnricher` fylli dalkana, en HER er spurningin hvort App.jsx skili
   skránum yfirleitt til stigatoflunnar. Ef einhver fjarlaegir `imminent=` eda
   `fixtures=` ur <Leaderboard> fer talan i núll og THETTA fellur — an thess
   myndi hun thegja, thvi tomur dalkur er ekki villa i sjalfu ser.        */
await fire(byTab("🏆"));
await new Promise(r => setTimeout(r, 60));
{
  const noNums = [...document.querySelectorAll("div")]
    .filter(d => d.textContent.trim() === "No numbers").length;
  ok("stigataflan sýnir ENGAN tóman kassa í opnum flokki", noNums === 0,
    `— fann ${noNums}; audgunin kemst ekki til Leaderboard.jsx`);
  /* OGNAR-DALKARNIR FLUTTUST I "Attack" 8.8.2026 ad beidni notanda —
     serflokkur "Threat" er ekki lengur til. Profid eltir EIGINLEIKANN,
     ekki HEITID: thad sem her skiptir mali er ad ESPN-audgunin komist til
     Leaderboard.jsx, og hun er nu profud i sinum nyja flokki. Vaeri hakid
     afram a "Threat" myndi thad falla af ENDURNEFNINGU i stad bilunar —
     "Prof a ad profa hegdun, ekki ordalag" (CLAUDE.md 6k).             */
  const attack = byExact("Attack");
  ok("Soknar-flokkurinn er til i stigatoflunni", !!attack);
  if (attack) {
    await fire(attack);
    const noNums2 = [...document.querySelectorAll("div")]
      .filter(d => d.textContent.trim() === "No numbers").length;
    ok("Sokn (m.a. ognar-dalkarnir): engir tomir kassar eftir audgun",
       noNums2 === 0, `— fann ${noNums2}`);
  }
  ok("serflokkurinn 'Threat' er FARINN (dalkarnir eru i Attack)", !byExact("Threat"));
}

/* ============================================================
   4. FORLEIKS-BORDINN — HANN FULLYRTI EITTHVAD SEM VAR OSATT A SAMA SKJA

   Bordinn sagdi: "<timabil> has not started — every season field is zero
   for all 587 players, so this view has no numbers to sort."
   MAELT A SAMA SKJA I SOMU ANDRA (16.8.2026): B.Fernandes ICT 381,4 ·
   Creativity 1938,5 · Haaland Threat 1520,0. `players.json` er LIFANDI
   bootstrap FPL og FPL hafdi ekki nullstillt hana.

   HER ER VARIN TALAN SJALF, ekki ordalagid. Tvaer ovinsaelustu utkomurnar
   eru BADAR "graenar" hja naivri fullyrdingu:
     · talan er 0     -> bordinn fullyrdir gamla ranga textann aftur
     · talan er ALLIR -> hun er ekki maeling heldur fasti i dulargervi
   Og sidara tilvikid VAR RAUNVERULEGT (maelt 17.8.2026): fyrsta utgafa
   `staleSeasonRows` taldi alla `!live_only`-dalka, og `now_cost` (Price) er
   non-null hja OLLUM 587 — svo talan var 587 af 587, sem er `Price > 0`.
   Verst: verdid nullstillist aldrei, svo bordinn hefdi haldid afram ad
   fullyrda thetta longu eftir ad FPL nullstillti arstidina. Nakvaemlega
   sama villuaett og "MEASURED: the range is 4-10" (CLAUDE.md 8/12).
   ============================================================ */
{
  const { STAT_DEFS, gwBlindKeys } = await import(new URL("src/stats.js", REPO).href);
  const PL = await import(new URL("src/PlayerList.jsx", REPO).href);
  const players = J("players.json").players;
  const blind = gwBlindKeys();
  const rows = players.map(p => ({ src: p, p }));
  const n = PL.staleSeasonRows(rows, blind);

  console.log(`\nFORLEIKS-BORDINN (staleSeasonRows = ${n} af ${players.length})`);
  /* ANTI-TOMLEIKI I BADAR ATTIR — thad er thessi fullyrding sem bitur. */
  ok(`talan er maeling en ekki fasti: 0 < ${n} < ${players.length}`,
     n > 0 && n < players.length,
     n === players.length ? "ALLIR — thetta er `Price > 0` i dulargervi, ekki arstidar-tala"
                          : "ENGINN — bordinn fullyrdir tha gamla ranga textann");
  /* FORSENDAN SEM GERIR EFRI MORKIN MARKTAEK: Price ER non-null hja ollum,
     svo gamla skilyrdid HEFDI raunverulega skilad 587. Neikvaed fullyrding
     verdur ad nefna eitthvad sem var sannanlega tharna (CLAUDE.md 5b).   */
  ok(`Price er non-null hja OLLUM ${players.length} (thess vegna maeldi gamla skilyrdid ekkert)`,
     players.every(p => (p.now_cost ?? 0) > 0));
  const priceDef = STAT_DEFS.filter(d => d.key === "now_cost");
  ok("...og `staleSeasonRows` telur Price EKKI med (0 rader af honum einum)",
     PL.staleSeasonRows(rows, blind, priceDef) === 0,
     `fekk ${PL.staleSeasonRows(rows, blind, priceDef)}`);

  /* SJALFHREINSUNIN ER KRAFAN, EKKI TALAN: thegar FPL nullstillir arstidina
     A bordinn ad verda rettur AN ThESS ad nokkur snerti kodann. Hermt med
     thvi ad nulla hverja tolu i lifandi rodinni NEMA thaer sem eru dagsins
     (verd, eignarhald, stada) — thad er nakvaemlega thad sem FPL gerir.  */
  const KEEP = new Set(["id", "code", "team", "element_type", "now_cost", "selected_by_percent"]);
  const resetRows = players.map(p => {
    const q = { ...p };
    for (const [k, v] of Object.entries(q)) {
      if (KEEP.has(k)) continue;
      if (typeof v === "number") q[k] = 0;
      else if (typeof v === "string" && v !== "" && !isNaN(+v)) q[k] = "0";
    }
    return { src: q, p: q };
  });
  ok("nullstilli FPL arstidina fer talan i 0 af sjalfu ser (bordinn laeknast an breytingar)",
     PL.staleSeasonRows(resetRows, blind) === 0,
     `fekk ${PL.staleSeasonRows(resetRows, blind)} — bordinn myndi fullyrda um arstidar-tolur sem eru farnar`);

  /* ---- OG TALAN A SKJANUM ER SAMA TALAN ---- */
  await fire(byTab("👥"));
  const sel = [...document.querySelectorAll("select")]
    .find(s => [...s.options].some(o => /\d{4}\/\d{2}/.test(o.textContent)));
  const liveOpt = sel && [...sel.options].find(o => /not started/.test(o.textContent));
  ok("timabils-valarinn ber yfirstandandi timabil merkt '(not started)'", !!liveOpt);
  if (liveOpt) {
    await act(async () => {
      sel.value = liveOpt.value;
      sel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await settle();
    const t = document.body.textContent || "";
    ok(`bordinn birtir MAELDU toluna (${n} of ${players.length}), ekki skrifada`,
       t.includes(`${n} of ${players.length}`),
       "— fost tala i texta ureldist thegjandi");
    /* Neikvaeda fullyrdingin nefnir streng sem VAR sannanlega tharna:
       thetta stod ordrett i bordanum til 16.8.2026.                     */
    ok("...og segir EKKI lengur 'every season field is zero' a skja sem synir tolur",
       !/every season field is zero/i.test(t));
    ok("bordinn nefnir timabilid sem tolurnar tilheyra i raun",
       /still last season's numbers/i.test(t) && /2025\/26/.test(t));
  }
}

console.log(`\nLIFANDI DÁLKAR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
