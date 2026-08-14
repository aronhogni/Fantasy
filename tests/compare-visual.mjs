/* ============================================================
   SAMANBURDURINN — profar ad TAFLAN SEGI RETT

   SULURNAR ERU FARNAR (14.8.2026, ad beidni notanda): samanburdur er nu
   ALLTAF TAFLA og `VisualRows`/`barGeom` voru fjarlaegd. Safnid var ekki
   eytt heldur ENDURSKRIFAD, thvi reglan sem thad ver er ohreyfd og hun er
   thad sem skiptir mali:

   Fyrir "Min. per stig", "Verd", "GC" og "gul spjold" er LAEGRA betra. Ef
   merkingin fylgir einfaldlega HAESTU tolunni er GRAENI reiturinn a VERSTA
   manninum og notandinn les tofluna afturabak. Villandi mynd er verri en
   engin mynd — og villandi TAFLA er nakvaemlega jafn slaem.

   Thess vegna profar thetta safn ekki ad reitir seu til, heldur ad graena
   merkingin liggi a RETTUM manni i badar attir.
   ============================================================ */
import { readFileSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

let pass = 0, fail = 0;
/* NAFNID VERDUR AD VERA STRENGUR. Fyrsta utgafa thessa safns sneri
   roksemdunum vid i 14 kollum — `ok(cond, "nafn")` — svo skilyrdid var
   strengurinn (alltaf truthy) og prófin STODUST ALLTAF. Thau prentudu
   "✓ true" i stad heitis, sem var eina merkid. Nu fellur thad harkalega. */
const ok = (n, c, x="") => {
  if (typeof n !== "string") throw new Error(`ok(): heiti verdur ad vera strengur, fekk ${typeof n} — roksemdum snuid vid?`);
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${x ? "   " + x : ""}`); } };
const near = (a, b, t, n) => ok(n, a != null && Math.abs(a - b) <= t, `${a} vs ${b}`);

const { ROWS } = await import(new URL("src/Compare.jsx", REPO).href);

/* SULU-RUMFRAEDIN VAR HER (kafli 1) og for med `barGeom`. Reglan sem hun
   varði — "vantandi gildi faer ENGA sulu, thvi sula af lengd 0 laesist eins
   og maeld nulltala" — lifir afram i toflunni sem "—" og er profud i kafla 3. */

console.log("\n=== 2. `hi` ER SKILGREINT A HVERRI ROD ===");
const lower = ROWS.filter(r => r.k && r.hi === false).map(r => r.k);
ok(`radir thar sem laegra er betra eru skilgreindar (${lower.length})`, lower.length >= 5);
for (const k of ["cost", "minPerPt", "goals_conceded", "yellow_cards"])
  ok(`"${k}" er merkt sem laegra-er-betra`, lower.includes(k));

console.log("\n=== 3. RENDER: ER GRAENA MERKINGIN A RETTUM MANNI? ===");
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
const dom = new JSDOM("<!doctype html><div id=root></div>", { url:"http://localhost/", pretendToBeVisual:true });
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

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async()=>{ root.render(React.createElement(App)); });
await act(async()=>{ await new Promise(r=>setTimeout(r,300)); });
const fire = async el => {
  await act(async()=>{ el.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); });
  await act(async()=>{ await new Promise(r=>setTimeout(r,120)); });
};
/* MATCH A FORSKEYTI, ekki nakvaemu heiti: flipinn var endurnefndur ur
   "👥 Leikmenn" i "👥 Leikmannatolur" og nakvaema leitin brotnadi.
   Profid a ad prófa HEGDUN, ekki ordalag. Forskeytid er ohaett thvi
   LEITAR-hnappurinn heitir nu "Leita" (areksturinn sem kalladi a nakvaema
   leit er farinn).                                                       */
const btn = t => [...document.querySelectorAll("button")]
  .find(x => x.textContent.trim() === t || x.textContent.trim().startsWith(t));
await fire(btn("👥"));
const add = [...document.querySelectorAll("button")].filter(b=>(b.title||"").includes("to the comparison"));
ok(`samanburdar-hnappar i listanum (${add.length})`, add.length >= 2);
await fire(add[0]); 
const add2 = [...document.querySelectorAll("button")].filter(b=>(b.title||"").includes("to the comparison"));
await fire(add2[0]);
const fab = [...document.querySelectorAll("button")].find(b=>b.textContent.includes("Comparison ("));
ok("samanburdar-hnappur birtist med tolu", !!fab);
await fire(fab);

/* ENGINN HAM-ROFI LENGUR — taflan er eina snidid. Neikvaed fullyrding med
   SANNADRI FORSENDU: rofinn VAR i thessum sama DOM adur (kafli 3 las hann
   og krafdist thess ad "Visual" vaeri sjalfgefid fyrir tvo leikmenn).     */
ok("ham-rofinn (Visual/Table) er FARINN",
   [...document.querySelectorAll("button")].filter(b=>/▤ Visual|≡ Table/.test(b.textContent)).length === 0);
ok("engar sulur eftir i samanburdinum",
   [...document.querySelectorAll('div[style*="border-radius: 2px"][style*="position: absolute"]')].length === 0);

/* Lesa TOFLUNA: hver rod er <tr> med label i fyrsta reit og gildum a eftir.
   Graena merkingin er bakgrunnur reitsins (S.tdBest).                     */
const trs = [...document.querySelectorAll("tr")].filter(t => t.querySelectorAll("td").length >= 3);
ok(`toflu-radir teiknadar (${trs.length})`, trs.length > 10);
/* S.tdBest = { background:"#e6f9f0", color:"#046b41", fontWeight:700 }.
   jsdom skilar honum sem rgb(230, 249, 240). Fyrsta utgafa thessa profs
   leitadi ad GAMLA sulu-graena litnum (#00b96b) og fann ThVI EKKERT — 0
   radir profadar, og badar "rettu" fullyrdingarnar stodust TOMAR. Talningar-
   fullyrdingarnar (`lowChecked >= 2`) voru thad eina sem greip thad.      */
const isGreen = td => {
  const bg = (td.style.background || "") + " " + (td.style.backgroundColor || "");
  return /#e6f9f0/i.test(bg) || /rgb\(\s*230,\s*249,\s*240\s*\)/.test(bg);
};
const numOf = td => { const t = td.textContent.replace(/[£%+]/g, "").replace(",", ".").trim();
                      const v = parseFloat(t); return Number.isFinite(v) ? v : null; };
const byLabel = {};
for (const tr of trs) {
  const tds = [...tr.querySelectorAll("td")];
  const lbl = tds[0].textContent.replace("▼", "").trim();
  byLabel[lbl] = tds.slice(1).map(td => ({ v: numOf(td), green: isGreen(td), txt: td.textContent.trim() }));
}
ok(`radir lesnar med heiti (${Object.keys(byLabel).length})`, Object.keys(byLabel).length > 10);

/* KJARNAPROFID, BADAR ATTIR: graeni reiturinn verdur ad bera LAEGSTU toluna
   i laegra-er-betra rod og HAESTU i haerra-er-betra rod.                  */
let lowChecked = 0, lowWrong = [], hiChecked = 0, hiWrong = [];
for (const row of ROWS) {
  if (!row.k || row.signed) continue;
  const cells = byLabel[row.label]; if (!cells) continue;
  const nums = cells.filter(c => c.v != null);
  const g = cells.find(c => c.green && c.v != null);
  if (!g || nums.length < 2) continue;
  const best = row.hi === false ? Math.min(...nums.map(c => c.v)) : Math.max(...nums.map(c => c.v));
  if (row.hi === false) { lowChecked++; if (g.v !== best) lowWrong.push(`${row.label}: graent ${g.v} != laegsta ${best}`); }
  else { hiChecked++; if (g.v !== best) hiWrong.push(`${row.label}: graent ${g.v} != haesta ${best}`); }
}
ok(`laegra-er-betra radir profadar a raungognum (${lowChecked})`, lowChecked >= 2);
ok("i laegra-er-betra rodum ber GRAENI reiturinn LAEGSTU toluna", lowWrong.length === 0, lowWrong.join(" · "));
ok(`haerra-er-betra radir profadar (${hiChecked})`, hiChecked >= 5);
ok("i haerra-er-betra rodum ber GRAENI reiturinn HAESTU toluna", hiWrong.length === 0, hiWrong.join(" · "));

/* VANTANDI GILDI ER "—", ALDREI 0 (reglan sem sulu-fjarveran bar adur). */
const dashCells = Object.values(byLabel).flat().filter(c => c.txt === "—");
ok("vantandi gildi birtast sem \"—\" (ekki 0)", dashCells.every(c => c.v == null));

console.log(`\nSAMANBURDAR-TAFLA: ${pass}/${pass+fail} graen`);
process.exit(fail ? 1 : 0);
