/* ============================================================
   HUNT 4 — OHEMJULEG GILDI I VELFORMUDUM SKRAM

   `data-resilience.mjs` profar VANTANDI og SKEMMDAR skrar (hálfskrifad JSON,
   tomt svid, rong gerd). Thad sem thad profar EKKI er skra sem er
   FULLKOMLEGA GILT JSON med RETTRI GERD en OHEMJULEGUM TOLUM:
     minutes: -90        (negativ spilatid)
     now_cost: 1e12      (verd sem sprengir banka-reikninginn)
     expected_goals: Infinity
     total_points: NaN-ígildi ur JSON (null i tolusvidi)
     starts: 1e9         (deiling gefur ~0)
   Thetta er ThAD sem raunveruleg API-bilun skilar: ekki brotid JSON heldur
   VITLAUSAR TOLUR. Og reglan i CLAUDE.md kafla 8 er skyr — NaN ma ALDREI a
   skja, tomt gildi er "—", ekki 0.

   KRAFAN ER SU SAMA OG I untrusted-input: appid ma vera TOMT, en thad ma
   hvorki hrynja ne bera `NaN`/`undefined`/`[object Object]`.
   ============================================================ */
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                    : (fail++, console.log(`  ✗ ${n}${extra ? "   " + extra : ""}`)); };

/* Hver atburdarás breytir GILDUM i players.json (og odds/teams) — snidid
   helst rett, svo hvorki `Array.isArray` ne `JSON.parse` gripa thau.     */
const SCEN = [
  ["negativ minutur",        p => ({ ...p, minutes: -90, starts: -3 })],
  ["verd 1e12",              p => ({ ...p, now_cost: 1e12 })],
  ["verd 0",                 p => ({ ...p, now_cost: 0 })],
  ["xG Infinity (sem 1e400 -> null i JSON)", p => ({ ...p, expected_goals: 1e400 })],
  ["oll tolusvid null",      p => ({ ...p, minutes: null, total_points: null, now_cost: null,
                                    starts: null, expected_goals: null, form: null })],
  ["tolur sem STRENGIR",     p => ({ ...p, minutes: "900", total_points: "50", now_cost: "75",
                                     form: "4.2", expected_goals: "1.5" })],
  ["starts 1e9",             p => ({ ...p, starts: 1e9 })],
  ["element_type ogilt",     p => ({ ...p, element_type: 99 })],
  ["team ogilt",             p => ({ ...p, team: 999 })],
  ["chance_of_playing -50",  p => ({ ...p, chance_of_playing_next_round: -50 })],
  ["status othekkt",         p => ({ ...p, status: "ZZ" })],
  ["ep_next ohemjulegt",     p => ({ ...p, ep_next: "1e99" })],
];

const basePlayers = J("players.json");
const baseTeams = J("teams.json");
const baseFix = J("fixtures.json");
const fixArr = Array.isArray(baseFix) ? baseFix : (baseFix.fixtures || []);

/* ============================================================
   ANNAR HOPUR: LEIKJASKRAIN. Hun er jafn ytri og players.json og HREYFIST
   MEIRA — frestun, endurrodun og tvofaldar umferdir breyta henni i hverri
   viku. FPL hefur skilad `event: null` (odregnir leikir) i heilu lagi, og
   sjalfs-leikur/tvitekid id eru thad sem kemur ut ur rangri sameiningu.
   ============================================================ */
const FIX_SCEN = [
  ["event null a OLLUM",      fs => fs.map(f => ({ ...f, event: null }))],
  ["event 0 og negativt",     fs => fs.map((f, i) => ({ ...f, event: i % 2 ? 0 : -3 }))],
  ["event 999",               fs => fs.map(f => ({ ...f, event: 999 }))],
  ["sjalfs-leikur (h === a)", fs => fs.map(f => ({ ...f, team_a: f.team_h }))],
  ["tvitekid fixture id",     fs => fs.map(f => ({ ...f, id: 1 }))],
  ["negativ stada",           fs => fs.map(f => ({ ...f, finished: true, team_h_score: -2, team_a_score: -5 }))],
  ["stada sem STRENGIR",      fs => fs.map(f => ({ ...f, finished: true, team_h_score: "2", team_a_score: "1" }))],
  ["kickoff onytt",           fs => fs.map(f => ({ ...f, kickoff_time: "ekki dagsetning" }))],
  ["kickoff null",            fs => fs.map(f => ({ ...f, kickoff_time: null }))],
  ["difficulty 99 / null",    fs => fs.map(f => ({ ...f, team_h_difficulty: 99, team_a_difficulty: null }))],
  ["lid utan 1-20",           fs => fs.map(f => ({ ...f, team_h: 999, team_a: 998 }))],
  ["finished OG started false med stodu", fs => fs.map(f => ({ ...f, finished: false, started: false, team_h_score: 3, team_a_score: 1 }))],
];

async function render(label, mkFiles) {
  const dom = new JSDOM("<!doctype html><div id=root></div>",
                        { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const m of ["attachEvent", "detachEvent"])
    if (!(m in dom.window.HTMLElement.prototype)) dom.window.HTMLElement.prototype[m] = function () {};

  /* ADEINS EIN skra er skemmd i hverri atburdaras — hitt er raunverulegt, svo
     bilunin er einangrud vid gildin (annars vaeri thetta bara "tomt app").  */
  const over = mkFiles();
  globalThis.fetch = async url => {
    const n = String(url).split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => { throw new Error("no proxy"); } };
    if (over[n]) return { ok: true, status: 200, json: async () => over[n] };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
  };

  const oe = console.error, ow = console.warn;
  console.error = () => {}; console.warn = () => {};
  let crash = null, txt = "";
  try {
    const { default: App } = await import(new URL("src/App.jsx", REPO).href);
    const root = createRoot(document.getElementById("root"));
    await act(async () => { root.render(React.createElement(App)); });
    await act(async () => { await new Promise(r => setTimeout(r, 240)); });
    txt = document.body.textContent || "";
  } catch (e) { crash = e.message; }
  console.error = oe; console.warn = ow;

  const usable = txt.includes("Planner") || txt.includes("Player stats");
  /* `\bNaN\b` — EKKI berort "NaN": `textContent` limir texta an bila, svo
     FFDR-taflan skilar "MUN"+"a"+"NEW" = "MUNaNEW" sem ber undirstrenginn.
     Thessi gildra felldi fimm sofn adur (CLAUDE.md 5b).                  */
  const bad = /\bNaN\b|\bundefined\b|\[object Object\]|\bInfinity\b/.exec(txt);
  ok(`${label}: nothaeft og an NaN/Infinity`, !crash && usable && !bad,
     crash ? "KASTADI: " + crash.slice(0, 70)
           : !usable ? `ekki nothaeft (${txt.trim().length} staf)`
           : bad ? `fann "${bad[0]}" — dæmi: …${txt.slice(Math.max(0, bad.index - 45), bad.index + 25).replace(/\s+/g, " ")}…` : "");
}

console.log(`\n--- players.json: ohemjuleg gildi ---`);
for (const [label, mut] of SCEN)
  await render(label, () => ({ "players.json": { ...basePlayers, players: (basePlayers.players || []).map(mut) } }));

console.log(`\n--- fixtures.json: ohemjuleg gildi ---`);
for (const [label, mut] of FIX_SCEN)
  await render(label, () => {
    const next = mut(fixArr.map(f => ({ ...f })));
    return { "fixtures.json": Array.isArray(baseFix) ? next : { ...baseFix, fixtures: next } };
  });

/* ThEKJA ER FULLYRDING: se `players.json` tom eda skemmd i grunninum profar
   thetta ekkert — tha vaeri hvert vidmot tomt og "engin NaN" trivialt satt. */
ok(`grunn-gognin voru raunveruleg (${(basePlayers.players || []).length} leikmenn, ${(baseTeams.teams || []).length} lid, ${fixArr.length} leikir)`,
   (basePlayers.players || []).length > 400 && (baseTeams.teams || []).length === 20 && fixArr.length >= 300);
ok(`badir hoparnir keyrdu (${SCEN.length} + ${FIX_SCEN.length} atburdarasir)`,
   SCEN.length >= 12 && FIX_SCEN.length >= 12);

console.log(`\nOHEMJULEG GILDI: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
