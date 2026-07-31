/* ============================================================
   SJONRAENI SAMANBURDURINN — profar ad MYNDIN SE RETT

   Villandi mynd er VERRI en engin mynd. Fyrir "Min. per stig", "Verd",
   "GC" og "gul spjold" er LAEGRA betra; ef sulan er einfaldlega lengri
   thegar talan er haerri thá er lengsta sulan VERSTI leikmadurinn og
   notandinn les hana afturabak. Thess vegna profar thetta safn EKKI ad
   sulur seu til, heldur ad thaer segi rett.

   Maelt 29.7.2026: 16/16 graen.
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

const { barGeom, ROWS } = await import(new URL("src/Compare.jsx", REPO).href);

console.log("\n=== 1. SULU-RUMFRAEDI ===");
const plain = { hi: true }, signed = { hi: true, signed: true };
/* Venjuleg tala: 0 -> max(theirra i rodinni). Kvardinn er PER ROD. */
near(barGeom(plain, 10, 0, 20)?.width, 50, 1e-9, "helmingur af haesta gildi = 50% breidd");
near(barGeom(plain, 20, 0, 20)?.width, 100, 1e-9, "haesta gildi fyllir brautina");
ok("venjuleg sula byrjar vinstra megin", barGeom(plain, 10, 0, 20)?.left === 0);
/* VANTANDI GILDI FAER ENGA SULU — sula af lengd 0 laesist eins og maelt 0. */
ok("null gefur ENGA sulu (ekki 0-lengd)", barGeom(plain, null, 0, 20) === null);
ok("NaN gefur enga sulu", barGeom(plain, NaN, 0, 20) === null);
/* Fravikssula: ut fra midju, baedi attir. */
const neg = barGeom(signed, -1.79, -1.79, 1.5);
const pos = barGeom(signed, 1.5, -1.79, 1.5);
near(neg?.width, 50, 1e-6, "staersta fravik nær ut i kant (50% fra midju)");
near(neg?.left, 0, 1e-6, "negatift fravik teiknast VINSTRA vid midju");
near(pos?.left, 50, 1e-6, "positift fravik byrjar A midju");
near(pos?.width, 50 * (1.5/1.79), 1e-6, "fravik kvardast a staersta fravikid");
/* Kvardinn ma ekki blandast milli rada: BPS (800) og xG (20) i sama
   kvarda gaefi osynilegar xG-sulur.                                   */
near(barGeom(plain, 15, 0, 20)?.width, 75, 1e-9, "xG-rod kvardast a sinn eigin max");
near(barGeom(plain, 600, 0, 800)?.width, 75, 1e-9, "BPS-rod kvardast a sinn eigin max");

console.log("\n=== 2. `hi` ER SKILGREINT A HVERRI ROD ===");
const lower = ROWS.filter(r => r.k && r.hi === false).map(r => r.k);
ok(`radir thar sem laegra er betra eru skilgreindar (${lower.length})`, lower.length >= 5);
for (const k of ["cost", "minPerPt", "goals_conceded", "yellow_cards"])
  ok(`"${k}" er merkt sem laegra-er-betra`, lower.includes(k));

console.log("\n=== 3. RENDER: ER GRAENA SULAN A RETTUM MANNI? ===");
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
const add = [...document.querySelectorAll("button")].filter(b=>(b.title||"").includes("Bæta í samanburð"));
ok(`samanburdar-hnappar i listanum (${add.length})`, add.length >= 2);
await fire(add[0]); 
const add2 = [...document.querySelectorAll("button")].filter(b=>(b.title||"").includes("Bæta í samanburð"));
await fire(add2[0]);
const fab = [...document.querySelectorAll("button")].find(b=>b.textContent.includes("Samanburður ("));
ok("samanburdar-hnappur birtist med tolu", !!fab);
await fire(fab);

const seg = [...document.querySelectorAll("button")].filter(b=>/Sjónrænt|Tafla/.test(b.textContent));
ok("ham-rofi: sjonraent / tafla", seg.length === 2);
ok("SJONRAENT er sjalfgefid thegar TVEIR eru valdir (thad var bedin)",
   seg[0]?.getAttribute("aria-pressed") === "true");

/* Lesa hverja rod: label + gildi + hvort graena merkid se a theim rétta. */
const rowEls = [...document.querySelectorAll("div")].filter(d =>
  (d.style.gridTemplateColumns || "").includes("minmax(96px"));
ok(`sjonraenar radir teiknadar (${rowEls.length})`, rowEls.length > 10);
const read = rowEls.map(r => {
  const lbl = r.firstElementChild.textContent.replace("▼","").trim();
  const lines = [...r.lastElementChild.children].map(l => {
    const f = l.querySelector('div[style*="position: absolute"][style*="border-radius: 2px"]');
    return { txt: l.lastElementChild.textContent.trim(),
             w: f ? parseFloat(f.style.width) : null,
             green: f ? /0, 185, 107/.test(f.style.background || f.style.backgroundColor) : false };
  });
  return { lbl, lines };
});
const byLabel = {};
for (const r of read) byLabel[r.lbl] = r;

/* KJARNAPROFID: i laegra-er-betra rod verdur graena sulan ad vera SU STYTTRI. */
let checked = 0, wrong = [];
for (const row of ROWS) {
  if (!row.k || row.hi !== false || row.signed) continue;
  const r = byLabel[row.label]; if (!r) continue;
  const g = r.lines.find(l => l.green), o = r.lines.find(l => !l.green && l.w != null);
  if (!g || !o || g.w == null) continue;
  checked++;
  if (g.w > o.w) wrong.push(`${row.label}: graent ${g.w.toFixed(1)}% > ${o.w.toFixed(1)}%`);
}
ok(`laegra-er-betra radir profadar a raungognum (${checked})`, checked >= 2);
ok("i laegra-er-betra rodum er GRAENA sulan su STYTTRI", wrong.length === 0, wrong.join(" · "));

/* Og hin attin: i haerra-er-betra rod verdur graena sulan ad vera SU LENGRI. */
let hiChecked = 0, hiWrong = [];
for (const row of ROWS) {
  if (!row.k || row.hi !== true || row.signed) continue;
  const r = byLabel[row.label]; if (!r) continue;
  const g = r.lines.find(l => l.green), o = r.lines.find(l => !l.green && l.w != null);
  if (!g || !o || g.w == null) continue;
  hiChecked++;
  if (g.w < o.w) hiWrong.push(`${row.label}: graent ${g.w.toFixed(1)}% < ${o.w.toFixed(1)}%`);
}
ok(`haerra-er-betra radir profadar (${hiChecked})`, hiChecked >= 5);
ok("i haerra-er-betra rodum er GRAENA sulan su LENGRI", hiWrong.length === 0, hiWrong.join(" · "));

console.log(`\nSJONRAENN SAMANBURDUR: ${pass}/${pass+fail} graen`);
process.exit(fail ? 1 : 0);
