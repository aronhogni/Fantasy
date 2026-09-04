/* ============================================================
   HVERT EINASTA LEIKMANNASPJALD — OPNAD, EKKI AGISKAD

   AF HVERJU THETTA SAFN ER TIL: spjaldid (`detail`-modalinn i App.jsx) er
   FLOKNASTI birtingar-flotur appsins. Thad sameinar SEX obundnar heimildir
   i einn ramma — FFDR og vaent stig (model.js), DC-hittni (defcon +
   defcon_history), mo/ao og byrjunar-likur (imminent), skotakort og
   stodukort (BSD) og roterings-por (rotation.js). Hver theirra getur skilad
   `null` fyrir hvada leikmann sem er, og hver samsetning theirra er annad
   tilfelli.

   Onnur prof opna spjaldid fyrir EINN valinn leikmann (dc-hit-display) eda
   fyrir thau 15 sem eru a vellinum (smoke). Thad skilur 558 leikmenn eftir
   oprofada — og thad eru einmitt jadartilfellin: markmenn an mo/ao, nylidar
   an BSD-radar, oparadir menn, their sem hafa 0 minutur.

   ThETTA SAFN OPNAR THAU OLL. Leidin er `Player stats` -> nafna-hnappur,
   sem kallar `onPickPlayer` -> `setDetail({kind:"player"})`. Listinn er
   SYNDARVAEDDUR, svo hver sida er skrunud fram og `scroll`-atburdur sendur
   handvirkt (jsdom sendir hann ekki sjalft thegar `scrollTop` er settur).

   ThRJAR UMFERDIR, hver sin ahaetta:
     1. OLL gogn til        — venjulega leidin
     2. BSD-skrarnar farnar — skotakort/stodukort/23 dalkar hverfa
     3. Lidsspjold          — annar `kind` i sama modal

   FALLPROF (staðfest): ef `catch` er tekid ut i BSD-lestrinum fellur
   umferd 2; ef nafna-hnappurinn haettir ad opna spjaldid fellur umferd 1.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

const ROWH = 34;   // fost radahaed syndarvaedingarinnar (sja PlayerList.jsx)

async function sweep({ label, missing = new Set(), teams = false }) {
  const dom = new JSDOM("<!doctype html><div id=root></div>",
                        { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const errors = [];
  const origErr = console.error;
  console.error = (...a) => {
    const m = String(a[0] ?? "");
    if (!/not wrapped in act|Warning:/.test(m)) errors.push(m.slice(0, 120));
  };

  globalThis.fetch = async url => {
    const n = String(url).split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => ({}) };
    if (missing.has(n)) return { ok: false, status: 404, json: async () => { throw new Error("404"); } };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
  };

  const { default: App } = await import(new URL("src/App.jsx", REPO).href);
  const root = createRoot(document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { await new Promise(r => setTimeout(r, 300)); });
  const settle = async (ms = 0) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
  const fire = async el => {
    await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    await settle();
  };

  await fire([...document.querySelectorAll("button")].find(b => b.textContent.includes("Player stats")));
  const scroller = [...document.querySelectorAll("div")]
    .find(d => (d.style.overflowY || d.style.overflow || "").includes("auto"));
  if (!scroller) { console.error = origErr; return { opened: 0, seen: 0, problems: ["skrun-umgjord fannst ekki"] }; }

  /* Nafna-hnappurinn er sa sem stendur STRAX A EFTIR stjornu-hnappnum.
     Ad leita eftir texta vaeri ohaeft: nofn rekast a dalka-heiti.        */
  const nameBtns = () => [...document.querySelectorAll("button")].filter(b => {
    const p = b.previousElementSibling;
    return p && p.tagName === "BUTTON" && /^[☆★]$/.test(p.textContent.trim());
  });

  const seen = new Set(), problems = [];
  let opened = 0;
  for (let top = 0; top <= 600 * ROWH; top += 300) {
    scroller.scrollTop = top;
    await act(async () => { scroller.dispatchEvent(new dom.window.Event("scroll")); });
    await settle();
    for (const b of nameBtns()) {
      const name = b.textContent.trim();
      if (seen.has(name)) continue;
      seen.add(name);
      const before = errors.length;
      try { await fire(b); }
      catch (e) { problems.push(`${name}: KASTADI ${e.message.slice(0, 70)}`); continue; }

      const txt = document.body.textContent || "";
      if (!/FPL's own ep_next|Compare|See team:/.test(txt)) problems.push(`${name}: spjald opnadist ekki`);
      else {
        opened++;
        /* `undefined`/`NaN` a skja er alltaf villa; `[object Object]` thydir
           ad hlutur hafi verid settur thar sem tala atti ad vera (sbr. daudi
           team_dc-dalkurinn, CLAUDE.md 6l).                              */
        if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(txt)) problems.push(`${name}: undefined/NaN i spjaldi`);
        /* Lidsspjaldid: opnad UR leikmannaspjaldinu um "See team:".      */
        if (teams) {
          const tb = [...document.querySelectorAll("button")].find(x => x.textContent.startsWith("See team:"));
          if (tb) {
            try { await fire(tb); } catch (e) { problems.push(`${name}: lidsspjald KASTADI ${e.message.slice(0,50)}`); }
            const tt = document.body.textContent || "";
            if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(tt)) problems.push(`${name}: undefined/NaN i lidsspjaldi`);
          }
        }
      }
      if (errors.length > before) problems.push(`${name}: console.error ${errors[before]}`);
      const close = [...document.querySelectorAll("button")].filter(x => x.textContent.trim() === "✕").at(-1);
      if (close) await fire(close);
    }
  }
  console.error = origErr;
  return { opened, seen: seen.size, problems };
}

console.log(`\n${"─".repeat(72)}\nHVERT EINASTA LEIKMANNASPJALD\n${"─".repeat(72)}`);

/* --- 1. Oll gogn til --- */
{
  const r = await sweep({ label: "oll gogn" });
  ok(`allir leikmenn fundust i listanum (${r.seen})`, r.seen > 500, `fann ${r.seen}`);
  ok(`OLL spjold opnudust (${r.opened}/${r.seen})`, r.opened === r.seen,
     `${r.seen - r.opened} opnudust ekki`);
  ok("ekkert spjald hrundi eda bar undefined/NaN", r.problems.length === 0,
     [...new Set(r.problems)].slice(0, 5).join(" | "));
}

/* --- 2. BSD-skrarnar farnar ---
   Ollum skota-/stodukortum og 23 dalkum er kippt undan. Spjaldid a ad
   birta MINNA, ekki hrynja — sama regla og i data-resilience.mjs.      */
{
  const r = await sweep({ label: "an BSD", missing: new Set(["bsd_players.json", "bsd_shots.json"]) });
  ok(`an BSD: oll spjold opnudust (${r.opened}/${r.seen})`, r.opened === r.seen && r.seen > 500,
     `${r.seen - r.opened} opnudust ekki`);
  ok("an BSD: ekkert hrun eda undefined/NaN", r.problems.length === 0,
     [...new Set(r.problems)].slice(0, 5).join(" | "));
}

/* --- 3. Lidsspjoldin ur hverju leikmannaspjaldi --- */
{
  const r = await sweep({ label: "lidsspjold", teams: true });
  ok(`lidsspjold: ekkert hrun ur ${r.opened} leikmannaspjoldum`, r.problems.length === 0,
     [...new Set(r.problems)].slice(0, 5).join(" | "));
}

console.log(`\nSPJALDA-PROF: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
