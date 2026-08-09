/* ============================================================
   APAPROF — HANDAHOFSKENNDIR SMELLIR UM ALLT VIDMOTID

   HVERS VEGNA ThETTA ER ANNAD EN HIN PROFIN: oll hin smella a hluti sem
   ÉG VALDI. Their finna thvi adeins thad sem mer datt i hug ad profa —
   og hver einasta thogla bilun sem fannst 9.8.2026 (react-warnings 0/22,
   simahamurinn, skemmt vistad astand) atti sameiginlegt ad ENGINN HAFDI
   SPURT. Apinn spyr ekki; hann smellir.

   Thad sem hann getur fundid en hin ekki eru RADIR: opna glugga medan
   annar er opinn, skipta um flipa i midri sию, velja umferdarbil og
   skipta svo um timabil, raða eftir dalki sem hverfur vid flokka-skipti.
   Astandsvélin er stor og profin ganga um hana eftir beinum brautum.

   ThRENNT SEM GERIR ThETTA AD PROFI EN EKKI HAPPDRAETTI:
     1. FAST FRAE (deterministic PRNG). Sama keyrsla i hvert sinn, svo
        fall er ENDURTAKANLEGT og hægt ad rekja. `Math.random()` hefdi
        gefid prof sem fellur einu sinni og aldrei aftur.
     2. FJOGUR FRAE, svo fjorar olikar brautir seu farnar.
     3. HREINSUNAR-HNAPPAR ERU UNDANSKILDIR. "Clear saved planning" er
        tvistiga og eydir vinnu; api sem finnur hann eydir sinu eigin
        astandi og restin af keyrslunni maelir tomt app.

   ================= HVAD ThETTA PROF GETUR **EKKI** =================
   ThAD ER NET, EKKI VORDUR — og thad er MAELT, ekki agiskad. Tvaer
   stokkbreytingar voru profadar:

     bilun a ALGENGRI BRAUT (Teams-flipinn kastar)
        -> FUNDIN, i BADUM fyrstu fraeum, med skyrri greiningu
           ("#92 '🛡️ Teams': MUTANT") — apinn smellir a flipa oft.
     bilun a DJUPU, SJALDGAEFU MARKI (rodun eftir Verdi kastar)
        -> **SLAPP I GEGN i 800 smellum**. Dalkahaus i einni toflu er
           einn af morg hundrud smellanlegum hlutum og handahofid raetist
           thangad naestum aldrei.

   ThVI MA ALDREI SEGJA "apaprofid ver X". Thad ver ekkert AKVEDID.
   Gildid er ad finna hrun sem ENGINN SPURDI UM a leidum sem eru gengnar
   — og hverja slika uppgotvun a ad festa i ALVORU vordur (eins og
   `player-cards.mjs` gerdi vid spjoldin) i stad thess ad treysta a ad
   apinn radist thangad aftur.

   UMHVERFIS-HAVADI: jsdom vantar `attachEvent`/`detachEvent` sem
   react-dom notar i gamalli input-vöktun. Thad kemur ur JSDOM, ekki ur
   okkar koda — sama undantekning og i `react-warnings.mjs`.

   MAELT 9.8.2026: 800 smellir (4 x 200), 0 hrun, 0 NaN-astond.
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

const CLICKS = 200;
/* Hnappar sem eyda astandi eda skipta um mal — sja hausinn.            */
const AVOID = /clear|hreinsa|reset|^IS$|^EN$/i;

async function run(seed) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  const dom = new JSDOM("<!doctype html><div id=root></div>",
                        { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const errs = [];
  const oe = console.error;
  console.error = (...a) => {
    const t = String(a[0] ?? "");
    if (/not wrapped in act|Warning:/.test(t)) return;
    /* jsdom-arfleifd, ekki okkar kodi (sja haus). */
    if (/attachEvent|detachEvent/.test(t)) return;
    errs.push(t.slice(0, 120));
  };

  globalThis.fetch = async u => {
    const n = String(u).split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => ({}) };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
  };

  const { default: App } = await import(new URL("src/App.jsx", REPO).href);
  const root = createRoot(document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { await new Promise(r => setTimeout(r, 300)); });

  const out = { clicked: 0, crashes: [], nan: [], errs };
  for (let i = 0; i < CLICKS; i++) {
    /* EKKI ADEINS <button>. Fyrsta utgafan smellti bara a hnappa og
       MISSTI ThVI AF STORUM HLUTA VIDMOTSINS: dalkahausarnir i
       leikmannatoflunni, FFDR-reitirnir og lidsradirnar eru allt
       `<div onClick>`. Stokkbreyting sem let rodun eftir verdi KASTA
       slapp i gegn af theirri astaedu einni. React setur `onClick` ekki
       sem DOM-attribute, svo thad er ekki haegt ad velja eftir henni —
       en appid merkir allt smellanlegt med `cursor:"pointer"`, og THAD
       er haegt ad velja eftir.                                          */
    /* <a> ER UNDANSKILID: eini hlekkurinn er "🏈 NFL", sem hledur ADRA
       SIDU. jsdom neitar ("Not implemented: navigation to another
       Document") og thad er UMHVERFID, ekki appid — og hefdi thar ad auki
       endad throfina. NFL-appid a sin eigin sofn.                        */
    const btns = [...document.querySelectorAll("button, [style*='cursor']")]
      .filter(b => b.tagName === "BUTTON" || (b.tagName !== "A" && b.style?.cursor === "pointer"))
      .filter(b => !AVOID.test((b.textContent || "").trim()));
    if (!btns.length) break;
    const b = btns[Math.floor(rnd() * btns.length)];
    const label = (b.textContent || "").trim().slice(0, 26);
    try {
      await act(async () => { b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
      await act(async () => { await new Promise(r => setTimeout(r, 0)); });
      out.clicked++;
    } catch (e) {
      out.crashes.push(`#${i} "${label}": ${e.message.slice(0, 70)}`);
      if (out.crashes.length > 4) break;
      continue;
    }
    /* ORDAMORK ERU NAUDSYNLEG, EKKI SNYRTIMENNSKA.
       `textContent` limir saman texta an bila, svo FFDR-taflan skilar
       "…NFOMUN a NEW…" sem "MUNaNEW" — og thad ber undirstrenginn "NaN".
       Fyrsta utgafa apaprofsins flaggadi ThRJU frae af fjorum a thessu og
       appid var i fullkomnu lagi: villan var i MAELITAEKINU. Sama gildra
       var i fimm odrum sofnum og var lagfaerd med.                      */
    const t = document.body.textContent || "";
    if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(t)) out.nan.push(`#${i} "${label}"`);
  }
  console.error = oe;
  return out;
}

console.log(`\n${"─".repeat(72)}\nAPAPROF — ${CLICKS} handahofskenndir smellir x 4 frae\n${"─".repeat(72)}`);

for (const seed of [20260809, 424242, 777001, 13579]) {
  const r = await run(seed);
  console.log(`  frae ${seed}: ${r.clicked} smellir`);
  ok(`frae ${seed}: allir ${CLICKS} smellir framkvaemdir`, r.clicked === CLICKS,
     `adeins ${r.clicked}`);
  ok(`frae ${seed}: ekkert hrun`, r.crashes.length === 0, r.crashes.slice(0, 3).join(" | "));
  ok(`frae ${seed}: ekkert NaN/undefined a skja`, r.nan.length === 0,
     `${r.nan.length} astond, fyrst ${r.nan[0] || ""}`);
  ok(`frae ${seed}: engin console-villa ur appinu`, r.errs.length === 0,
     [...new Set(r.errs)].slice(0, 2).join(" | "));
}

console.log(`\nAPAPROF: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
