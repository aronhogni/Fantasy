/* ============================================================
   THOLPROF — VANTANDI OG SKEMMDAR GAGNASKRAR

   AF HVERJU: appid les data/*.json UTAN UR NETI
   (raw.githubusercontent.com). Hver skra getur vantad — nytt
   pipeline-skref sem er ekki yett enn, GitHub nidri, hálf-skrifud skra.
   Tha ma appid birta MINNA en ALDREI hrynja med hvitum skja, og tomt
   astand a ad SEGJA hvers vegna, ekki bara "saeki...".

   Profad: hver nyr flipi i 7 atburdarasum. Fann tvennt:
     - Umferdin skiladi 229 stofum (bert "Saeki last_gw.json...") thegar
       skrain vantadi — ogreinanlegt fra "hangir". Nu skyrt tomt astand.
     - Thurfti ad meta HVERN FLIPA serstaklega; fyrri utgafa maldi adeins
       sidasta astandid og stodst thvi alltaf, sama hvad vantadi.
   ============================================================ */
/* Vantandi/skemmdar skrar: birtast flipar an thess ad hrynja? */
import { readFileSync } from "node:fs";
/* VELAROHAD SLOD. Adur var "/Users/arongeorgsson/Fantasy/..." hardkodad,
   svo profin virkudu adeins a einni vel — onnur lota gat ekki keyrt thau. */
const REPO = new URL("../", import.meta.url);
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

const SCENARIOS = [
  ["allt til",                    new Set()],
  ["last_gw VANTAR",              new Set(["last_gw.json"])],
  ["last_gw_shots VANTAR",        new Set(["last_gw_shots.json"])],
  ["player_seasons VANTAR",       new Set(["player_seasons.json"])],
  ["imminent VANTAR",             new Set(["imminent.json"])],
  ["ALLAR NYJAR VANTA",           new Set(["last_gw.json","last_gw_shots.json","player_seasons.json","imminent.json"])],
  ["set_piece_notes VANTAR",      new Set(["set_piece_notes.json"])],
];

let fail = 0;
for (const [label, missing] of SCENARIOS) {
  const dom = new JSDOM("<!doctype html><div id=root></div>", { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const errors = [];
  const origErr = console.error;
  console.error = (...a) => { const m = String(a[0] ?? ""); if (!/not wrapped in act|Warning:/.test(m)) errors.push(m.slice(0,90)); };

  globalThis.fetch = async (url) => {
    const u = String(url);
    const name = u.split("/data/")[1];
    if (!name) return { ok: false, status: 404, json: async () => ({}) };
    if (missing.has(name)) return { ok: false, status: 404, json: async () => { throw new Error("404"); } };
    try { return { ok: true, status: 200, json: async () => J(name) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("no file"); } }; }
  };

  let crashed = null; const perTab = {};
  try {
    const { default: App } = await import(new URL("src/App.jsx", REPO).href);
    const root = createRoot(document.getElementById("root"));
    await act(async () => { root.render(React.createElement(App)); });
    await act(async () => { await new Promise(r => setTimeout(r, 150)); });
    for (const tab of ["Gameweek", "Leaderboard", "Set pieces"]) {
      const b = [...document.querySelectorAll("button")].find(x => x.textContent.includes(tab));
      if (!b) { perTab[tab] = "HNAPP VANTAR"; continue; }
      await act(async () => { b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
      await act(async () => { await new Promise(r => setTimeout(r, 80)); });
      perTab[tab] = document.body.textContent || "";
    }
  } catch (e) { crashed = e.message; }
  console.error = origErr;

  // hver flipi verdur ad birta EITTHVAD marktaekt og ALDREI undefined/NaN
  const problems = [];
  if (crashed) problems.push("HRUNDI: " + crashed.slice(0, 60));
  for (const [tab, txt] of Object.entries(perTab)) {
    if (txt === "HNAPP VANTAR") { problems.push(tab + ": hnapp vantar"); continue; }
    if (txt.trim().length < 400) problems.push(tab + ": nanast tomur (" + txt.trim().length + ")");
    if (/undefined|NaN|\[object Object\]/.test(txt)) problems.push(tab + ": birti undefined/NaN");
    if (!txt.includes(tab)) problems.push(tab + ": eigid heiti vantar");
  }
  if (errors.length) problems.push("console.error: " + errors[0]);
  const bad = problems.length;
  if (bad) fail++;
  console.log(`  ${bad ? "✗" : "✓"} ${label.padEnd(26)} ${
    bad ? problems.join(" | ")
        : `ok — ${Object.entries(perTab).map(([k,v]) => k.slice(0,6)+":"+v.trim().length).join(" ")}`}`);
}
console.log(`\nVANTANDI SKRAR: ${SCENARIOS.length - fail}/${SCENARIOS.length} atburdarasir standast`);
process.exit(fail ? 1 : 0);
