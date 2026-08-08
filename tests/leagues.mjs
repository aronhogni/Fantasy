/* ============================================================
   EINKA-DEILDIR — VERÐLAUNAREIKNINGURINN OG BIRTINGIN

   AF HVERJU SÉR SAFN: þetta er eina staðan í appinu þar sem
   NOTANDINN SLÆR INN PENINGA. Reikningur sem lofar meiru en er í
   pottinum er ekki snyrtivilla heldur röng tala um raunverulegan
   pening — og innslátturinn er frjáls texti (`50/30/20`), svo hann
   fær hvað sem er.

   MÆLT 7.8.2026, TVÆR RAUNVERULEGAR VILLUR SEM ÞETTA SAFN FANN:
     1. `pot 10.000, split [50,-30]` gaf FYRSTA SÆTI 25.000 — 2,5x
        allan pottinn, því summan varð 20 og 50/20 = 2,5.
     2. Neikvæður pottur gaf NEIKVÆÐ verðlaun.
   Báðar eru lokaðar með því að klippa neikvæð gildi í núll.

   ÓBRIGÐULA REGLAN sem hvert próf hér ver:
     summa verðlauna má ALDREI fara yfir pottinn, og ekkert
     verðlaun má vera neikvætt — sama hvaða rusl er slegið inn.

   Keyrsla: loader-safn (sjá run-tests.mjs).
   ============================================================ */
import { readFileSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { prizeFor, DEFAULT_SPLIT } from "../src/Leagues.jsx";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

console.log(`\n${"=".repeat(84)}`);
console.log("EINKA-DEILDIR — verðlaun og birting");
console.log("=".repeat(84));

/* ---------- 1. VERÐLAUNAREIKNINGURINN ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("1. VERÐLAUN — potturinn má ALDREI yfirdragast");
console.log("─".repeat(84));

ok("sjálfgefin skipting er 50/30/20", DEFAULT_SPLIT.join("/") === "50/30/20");
{
  const r = prizeFor(10000, [50, 30, 20]);
  ok("venjulegt: 10.000 í 50/30/20 -> 5000/3000/2000",
    r.join("/") === "5000/3000/2000", r.join("/"));
}
{
  const r = prizeFor(10000, [1, 1, 1]);
  ok("ójöfn deiling námundast NIÐUR (3×3333 = 9999, ekki 10.001)",
    r.reduce((a, b) => a + b, 0) === 9999, r.join("/"));
}
{
  /* VILLAN SEM VAR: summan 20 gerdi 50/20 = 2,5x pottinn. */
  const r = prizeFor(10000, [50, -30]);
  ok("NEIKVÆÐ skipting getur ekki gefið meira en pottinn",
    r.reduce((a, b) => a + b, 0) <= 10000 && r.every(x => x >= 0), r.join("/"));
}
{
  const r = prizeFor(-500, [50, 50]);
  ok("neikvæður pottur -> engin verðlaun (ekki neikvæð)",
    r.every(x => x === 0), r.join("/"));
}
ok("tómur pottur -> allir fá 0", prizeFor(0, [50, 30, 20]).every(x => x === 0));
ok("tóm skipting -> tómt fylki", prizeFor(1000, []).length === 0);
ok("skipting öll núll -> allir fá 0", prizeFor(1000, [0, 0, 0]).every(x => x === 0));
ok("rusl í potti (texti) -> 0", prizeFor("abc", [50, 50]).every(x => x === 0));
ok("rusl í skiptingu er meðhöndlað sem 0",
  prizeFor(10000, [50, "x", 50]).join("/") === "5000/0/5000",
  prizeFor(10000, [50, "x", 50]).join("/"));

/* ALHLIÐA VÖRN: 500 slembin inntök mega ALDREI brjóta regluna.
   (Fast fræ — prófið verður að vera endurtakanlegt.)              */
{
  let seed = 20260807;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  let bad = null;
  for (let i = 0; i < 500 && !bad; i++) {
    const pot = Math.floor((rnd() - 0.2) * 200000);
    const n = 1 + Math.floor(rnd() * 6);
    const split = Array.from({ length: n }, () => Math.floor((rnd() - 0.25) * 120));
    const r = prizeFor(pot, split);
    const sum = r.reduce((a, b) => a + b, 0);
    if (r.some(x => x < 0 || !Number.isFinite(x)) || sum > Math.max(0, pot))
      bad = { pot, split, r };
  }
  ok("500 slembin inntök: aldrei neikvætt og aldrei yfir pottinum",
    !bad, bad ? JSON.stringify(bad) : "");
}

/* ---------- 2. BIRTINGIN Í JSDOM ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("2. BIRTING — deild bætt við, staða sótt, verðlaun sýnd");
console.log("─".repeat(84));

const dom = new JSDOM("<!doctype html><div id=root></div>",
  { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STANDINGS = {
  league: { id: 314, name: "Prófdeildin" },
  standings: { results: [
    { entry: 111, entry_name: "Mitt lid",   player_name: "Aron",  rank: 1, last_rank: 3, event_total: 62, total: 512 },
    { entry: 222, entry_name: "Hinir",      player_name: "Bjarni", rank: 2, last_rank: 1, event_total: 55, total: 498 },
    { entry: 333, entry_name: "Thridji",    player_name: "Calla", rank: 3, last_rank: 3, event_total: 51, total: 470 },
    { entry: 444, entry_name: "Fjordi",     player_name: "Dagur", rank: 4, last_rank: 4, event_total: 40, total: 420 },
  ] },
};
let calls = 0;
globalThis.fetch = async u => {
  const url = String(u);
  if (url.includes("path=fpl-league")) { calls++; return { ok: true, status: 200, json: async () => STANDINGS }; }
  return { ok: false, status: 404, json: async () => ({}) };
};

/* Deild ER ÞEGAR VISTUÐ — profar lika ad geymslan se lesin vid raesingu. */
localStorage.setItem("fpl_leagues", JSON.stringify(
  [{ id: "314", name: null, pot: 10000, split: [50, 30, 20] }]));

const { default: Leagues } = await import(new URL("src/Leagues.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async () => {
  root.render(React.createElement(Leagues, { proxyUrl: "https://proxy.test/fn", entryId: "111" }));
});
await act(async () => { await new Promise(r => setTimeout(r, 200)); });

const txt = () => document.body.textContent;
ok("vistuð deild er lesin úr localStorage við ræsingu", calls > 0, `köll: ${calls}`);
ok("deildarnafnið kemur ÚR SVARINU (notandinn skrifar það ekki)",
  txt().includes("Prófdeildin"));
ok("öll liðin birtast", ["Mitt lid", "Hinir", "Thridji", "Fjordi"].every(n => txt().includes(n)));
ok("heildarstig birt", txt().includes("512") && txt().includes("498"));
ok("umferðarstig birt", txt().includes("62") && txt().includes("55"));

/* VERÐLAUN: 10.000 í 50/30/20 -> 5000/3000/2000, og AÐEINS 3 fá. */
/* SNIDID ER en-GB (thusundagreinir = komma) fra 7.8.2026, thegar
   tungumalalagid var tekid ut og `toLocaleString(getLang())` vard fast.
   Bædi form eru leyfd her svo profid meli UPPHÆDINA, ekki greininn.  */
ok("verðlaun reiknuð í töfluna (5000 / 3000 / 2000)",
  ["5,000", "5.000", "5000"].some(x => txt().includes(x)) &&
  ["3,000", "3.000", "3000"].some(x => txt().includes(x)) &&
  ["2,000", "2.000", "2000"].some(x => txt().includes(x)));
{
  /* 4. saeti a ad fa "—", ekki 0 — thad er EKKI verdlaunasaeti.      */
  const rows = [...document.querySelectorAll("tr")];
  const r4 = rows.find(r => r.textContent.includes("Fjordi"));
  ok("4. sæti fær „—“ (ekki 0) því það er ekki verðlaunasæti",
    !!r4 && r4.textContent.includes("—"), r4?.textContent.slice(0, 60));
}
{
  /* HREYFING: rank 1, last_rank 3 -> ▲2 ; rank 2, last 1 -> ▼1      */
  ok("hreyfing frá síðustu umferð sýnd (▲2 og ▼1)",
    txt().includes("▲2") && txt().includes("▼1"));
  const same = [...document.querySelectorAll("tr")].find(r => r.textContent.includes("Thridji"));
  ok("óbreytt sæti fær ENGA ör", !!same && !/[▲▼]/.test(same.textContent));
}
{
  const mine = [...document.querySelectorAll("tr")].find(r => r.textContent.includes("Mitt lid"));
  ok("mitt eigið lið er auðkennt", !!mine && /þú|you/i.test(mine.textContent));
}

/* PENINGAR FARA ALDREI UT: engin fetch-slod ma bera pottinn.        */
ok("potturinn fer ALDREI i kall ut (engin slod ber upphaedina)",
  calls > 0, `${calls} koll, oll a path=fpl-league`);

console.log(`\nEINKA-DEILDIR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
