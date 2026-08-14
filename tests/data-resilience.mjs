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

/* SKEMMDAR SKRAR ERU ANNAR FLOKKUR EN VANTANDI — og hausinn a thessari
   skra lofadi theim fra byrjun an thess ad profa thaer. Vantandi skra
   fellur i `catch` og appid veit ad hun kom aldrei. SKEMMD skra kemur
   inn sem GILT svar (ok:true) og fer alla leid inn i `cook`/render —
   thad er leidin sem getur hvitad skjainn. Thrjar tegundir eru profadar:
     jsonVilla  — hálf-skrifud skra (pipeline drapst i midju skrifi)
     tomtSvid   — rett skra en lykil-fylkid er null
     rangGerd   — fylki thar sem hlutur a ad vera (skema-breyting)
     hlutur    — HLUTUR ThAR SEM FYLKI A AD VERA (gagnstaeda atttin)

   FJORDA TEGUNDIN VANTADI OG ThAD VAR RAUNVERULEGT GAT (14.8.2026).
   `rangGerd` profar fylki-i-stad-hlutar; ENGIN atburdarás profadi
   HLUT-I-STAD-FYLKIS, sem er einmitt su lögun sem `|| []` hleypir gegn
   (`{} || []` er `{}`) og sem kastar "object is not iterable". Maelt: thrjar
   valkvaedar skrar (`last_gw_shots`, `defcon`, `bsd_players`) felldu appid
   inni i <PlayerList>. Og hun er EKKI tilbuin: sviðid `players` er ThEGAR
   hlutur i `player_form.json`, `player_seasons.json` og `player_gw_*.json`,
   svo mis-vírud prop eda snids-breyting gefur nakvaemlega thetta.        */
const BREAK = {
  jsonVilla: () => { throw new SyntaxError("Unexpected end of JSON input"); },
  tomtSvid : o => ({ ...o, players: null, rows: null, shots: null }),
  rangGerd : () => [],
  hlutur   : o => ({ ...o, players: {}, rows: {}, shots: {} }),
};

/* [heiti, vantandi, skemmt: {skra: tegund}] */
const SCENARIOS = [
  ["allt til",                    new Set(), {}],
  ["last_gw VANTAR",              new Set(["last_gw.json"]), {}],
  ["last_gw_shots VANTAR",        new Set(["last_gw_shots.json"]), {}],
  ["player_seasons VANTAR",       new Set(["player_seasons.json"]), {}],
  ["imminent VANTAR",             new Set(["imminent.json"]), {}],
  ["ALLAR NYJAR VANTA",           new Set(["last_gw.json","last_gw_shots.json","player_seasons.json","imminent.json"]), {}],
  ["set_piece_notes VANTAR",      new Set(["set_piece_notes.json"]), {}],
  /* BSD er NYJASTA heimildin og bar ENGA tholprofun — allt skota-kortid,
     stodukortid og 23 dalkar hanga a thessum tveimur skram.               */
  ["bsd_players VANTAR",          new Set(["bsd_players.json"]), {}],
  ["bsd_shots VANTAR",            new Set(["bsd_shots.json"]), {}],
  ["BADAR BSD VANTA",             new Set(["bsd_players.json","bsd_shots.json"]), {}],
  /* Skemmdar — hver ein er raunveruleg bilun sem getur komid ur pipeline. */
  /* players.json ER KJARNINN — an hennar er ekkert app. Tha eru fliparnir
     RETTILEGA ekki teiknadir, svo krafan er onnur og strangari i eðli sinu:
     skyrd villa a skjanum. Maelt: "Could not fetch the data from data/…".
     Ad heimta flipa hér vaeri ad heimta app an gagna.                      */
  ["players.json HALFSKRIFUD",    new Set(), { "players.json": "jsonVilla" }, "kjarni"],
  ["players.json VANTAR",         new Set(["players.json"]), {}, "kjarni"],
  ["bsd_players TOMT SVID",       new Set(), { "bsd_players.json": "tomtSvid" }],
  ["bsd_shots RONG GERD",         new Set(), { "bsd_shots.json": "rangGerd" }],
  ["player_seasons TOMT SVID",    new Set(), { "player_seasons.json": "tomtSvid" }],
  ["fixtures RONG GERD",          new Set(), { "fixtures.json": "rangGerd" }],
  /* HLUTUR I STAD FYLKIS — thessar thrjar felldu appid fyrir 14.8.2026.    */
  ["last_gw_shots HLUTUR",        new Set(), { "last_gw_shots.json": "hlutur" }],
  ["defcon HLUTUR",               new Set(), { "defcon.json": "hlutur" }],
  ["bsd_players HLUTUR",          new Set(), { "bsd_players.json": "hlutur" }],
  ["imminent HLUTUR",             new Set(), { "imminent.json": "hlutur" }],
  ["ALLAR FJORAR HLUTUR",         new Set(), { "last_gw_shots.json": "hlutur", "defcon.json": "hlutur",
                                               "bsd_players.json": "hlutur", "imminent.json": "hlutur" }],
];

let fail = 0;
for (const [label, missing, broken = {}, kind = "flipar"] of SCENARIOS) {
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
    /* Skemmd skra svarar ok:true — thad er einmitt hvers vegna hun er
       haettulegri en vantandi skra og verdur ad profast serstaklega.   */
    if (broken[name]) return { ok: true, status: 200, json: async () => BREAK[broken[name]](J(name)) };
    try { return { ok: true, status: 200, json: async () => J(name) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("no file"); } }; }
  };

  let crashed = null; const perTab = {}; let firstPaint = "";
  try {
    const { default: App } = await import(new URL("src/App.jsx", REPO).href);
    const root = createRoot(document.getElementById("root"));
    await act(async () => { root.render(React.createElement(App)); });
    await act(async () => { await new Promise(r => setTimeout(r, 150)); });
    firstPaint = document.body.textContent || "";
    /* "Player stats" og "Teams" voru ekki profadir — og thad eru einmitt
       fliparnir sem BSD-gognin lenda i. Tholprof sem sleppir theim flipum
       sem nyjustu gognin fæda er tholprof a gomlu appi.                  */
    /* "Best of the best" baettist vid 9.8.2026. Hann er SERSTAKLEGA vidkvaemur
       her thvi hann les TVAER skrar sem eru EKKI til i forleik (pros.json og
       pros_gw.json) — nakvaemlega tilfellid sem thetta safn er til fyrir.   */
    for (const tab of ["Player stats", "Teams", "Gameweek", "Leaderboard",
                       "Best of the best", "Set pieces"]) {
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

  /* KJARNA-ATBURDARAS: fliparnir eiga EKKI ad vera thar, en skjarinn ma
     ekki vera audur. Krafan er ad notandinn se hvad brast og hvad hann
     getur gert — hvitur skjar og "Saeki..." sem hangir eru bædi fall.   */
  if (kind === "kjarni") {
    const t = firstPaint.trim();
    if (!t.length) problems.push("HVITUR SKJAR — engin skilaboð");
    else if (!/could not|failed|error|villa|ekki/i.test(t))
      problems.push("tomt astand SEGIR EKKI hvers vegna: " + JSON.stringify(t.slice(0, 60)));
    if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(t)) problems.push("villuskilabod bera undefined/NaN");
    if (problems.length) fail++;
    console.log(`  ${problems.length ? "✗" : "✓"} ${label.padEnd(26)} ${
      problems.length ? problems.join(" | ") : `ok — skyrd villa (${t.length} staf)`}`);
    continue;
  }

  for (const [tab, txt] of Object.entries(perTab)) {
    if (txt === "HNAPP VANTAR") { problems.push(tab + ": hnapp vantar"); continue; }
    if (txt.trim().length < 400) problems.push(tab + ": nanast tomur (" + txt.trim().length + ")");
    if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(txt)) problems.push(tab + ": birti undefined/NaN");
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
