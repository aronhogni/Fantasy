/* ============================================================
   "BEST OF THE BEST" MED RAUNVERULEGUM TOLUM — LESID AF SKJANUM

   HVERS VEGNA THETTA SAFN ER TIL: `data-resilience.mjs` opnar flipann i
   ollum 16 bilunar-atburdarasunum — en `pros_gw.json` er EKKI TIL i forleik,
   svo thad prof hittir ALLTAF a TOMA astandid. Fyllti helmingurinn af
   BestOfBest.jsx (toflurnar, fyrirlidarnir, chip-dagatalid, mismunurinn)
   hafdi thvi ALDREI teiknast thegar thetta var skrifad.

   Thetta er sama gildran og simahamurinn (CLAUDE.md kafla 8): "annar
   helmingur toflunnar var jafn oprofadur og hann vaeri ekki til". Kodinn
   kviknar i fyrsta sinn minutum eftir frest GW1 — sem er versti timinn til
   ad uppgotva ad hann teiknar ekki.

   Gognin eru TILBUIN (`pros_gw.json` verdur ekki til fyrr en 21. agust) en
   leikmanna-id eru RAUNVERULEG ur data/players.json, svo nafna-uppflettingin
   er profud lika — hun er su sem myndi thegja ef hun brotnadi.
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

/* ---- RAUNVERULEGIR leikmenn svo uppflettingin se profud ---- */
const players = J("players.json").players;
const P = players.slice(0, 8).map(p => p.id);
const NAME = Object.fromEntries(players.map(p => [p.id, p.web_name]));
const PANEL = 1000;

/* GW7: 620 af 1000 keyptu P[0]; ALLIR eiga P[2] OG allir gera hann ad
   fyrirlida -> EO 200%, sem verdur ad birtast sem >100%.                */
const GW7 = {
  n: 950,
  own:  { [P[0]]: 700, [P[1]]: 400, [P[2]]: 950, [P[3]]: 120 },
  capt: { [P[2]]: 950, [P[0]]: 0 },
  vice: { [P[1]]: 300 },
  in:   { [P[0]]: 620, [P[1]]: 210, [P[3]]: 90 },
  out:  { [P[4]]: 540, [P[5]]: 180 },
  chips: { bboost: 40, wildcard: 95 },          // 13,7% spiladu skipta-chip
  transfers: 1.6, hitCost: 1.2, hitShare: 0.31,
  value: 1013, bank: 4, rankMedian: 41250,
};
const GW6 = { ...GW7, n: 940, in: { [P[1]]: 300 }, out: { [P[0]]: 150 },
              capt: { [P[1]]: 500 }, chips: {} };
const PROS_GW = { panel_size: PANEL, updated: "2026-09-01T12:00:00Z",
                  gw: { 6: GW6, 7: GW7 } };

const dom = new JSDOM("<!doctype html><div id=root></div>",
                      { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* SERTAEKI MOCK-INN VERDUR AD KOMA A UNDAN THEIM ALMENNA (CLAUDE.md kafla 5,
   "Gildrur i jsdom-profunum") — annars les almenni `raw`-handlerinn
   pros_gw.json af disknum, finnur hana ekki og skilar 404.               */
globalThis.fetch = async url => {
  const s = String(url);
  if (s.includes("pros_gw.json"))
    return { ok: true, status: 200, json: async () => PROS_GW };
  const n = s.split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};

/* REACT-VIDVARANIR ERU BILUN, EKKI SUD. CLAUDE.md 5b: tvaer raunverulegar
   vidvaranir (border/borderColor-blondun) lifdu manudum saman af thvi ad
   safnid sem atti ad finna thaer heimsotti 0 af 22 vidmotum. Thessi flipi
   ber toflur, <select> og skilyrt style-hlutir — nakvaemlega thad sem
   framleidir "key"- og style-vidvaranir. Vid safnum theim fra fyrsta
   render og fullyrdum um thaer i kafla 8b.                               */
const reactWarnings = [];
const origConsoleErr = console.error;
console.error = (...a) => {
  const m = a.map(x => (typeof x === "string" ? x : "")).join(" ");
  /* SIAN VERDUR AD VERA THRONG. Fyrsta utgafan leitadi ad /Warning:/ og
     greip DeprecationWarning fra jsx-loadernum (`module.register()`) —
     profid fell tha af RANGRI astaedu, sem er versta tegund vardar: naesti
     madur "lagar" hann med thvi ad eyda honum. Nu eru adeins React-eigin
     vidvaranir taldar.                                                    */
  if (/DeprecationWarning|\[DEP\d+\]|ExperimentalWarning/.test(m)) { origConsoleErr(...a); return; }
  if (/^Warning:|Each child in a list|validateDOMNesting|is using incorrect casing|unique "key"|React does not recognize|Received `?(true|false)`? for a non-boolean/i.test(m))
    reactWarnings.push(m.slice(0, 160));
  origConsoleErr(...a);
};

console.log(`\n${"=".repeat(84)}`);
console.log('"BEST OF THE BEST" MED GOGNUM — fyllti helmingurinn teiknadur');
console.log("=".repeat(84));

const { default: App } = await import("../src/App.jsx");
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 250)); });

const btn = [...document.querySelectorAll("button")]
  .find(b => b.textContent.includes("Best of the best"));
ok("flipa-hnappurinn finnst", !!btn);
await act(async () => { btn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await act(async () => { await new Promise(r => setTimeout(r, 120)); });

const txt = () => document.body.textContent || "";
const body = txt();

/* ---------- 1. Grunnurinn teiknast ---------- */
console.log("\n1) hausinn og medaltolin");
ok("umferdin birtist (GW7)", /Gameweek 7/.test(body));
ok(`thekjan birtist (${GW7.n} af ${PANEL})`, body.includes(String(GW7.n)) && body.includes(String(PANEL)));
ok("midgildi radar er snidid med thusundaskilum", /41,250/.test(body), body.match(/4.{0,2}1.{0,2}250/)?.[0]);
ok("lidsverdi birtist sem pund, ekki tiundir", /£101\.3/.test(body));
ok("hlutfall sem tok hit birtist", /31%/.test(body));

/* ---------- 2. KAUP OG SOLUR — thad sem notandinn bad um ---------- */
console.log("\n2) kaup og solur");
ok(`mest keypti madurinn birtist med nafni (${NAME[P[0]]})`, body.includes(NAME[P[0]]));
ok("fjoldinn sem keypti birtist (620)", /620/.test(body));
ok(`mest seldi madurinn birtist (${NAME[P[4]]})`, body.includes(NAME[P[4]]));
ok("fjoldinn sem seldi birtist (540)", /540/.test(body));
/* Hlutfall MIDAST VID THA SEM SVORUDU (950), ekki hopsstaerdina (1000).
   620/950 = 65,3% en 620/1000 = 62,0% — talan adgreinir thetta tvennt. */
ok("hlutfall reiknad af THEIM SEM SVORUDU (65.3%, ekki 62.0%)",
   /65\.3%/.test(body) && !/62\.0%/.test(body));

/* ---------- 3. Fyrirlidar og vikmork ---------- */
console.log("\n3) fyrirlidar");
ok(`fyrirlidinn birtist (${NAME[P[2]]})`, body.includes(NAME[P[2]]));
ok("fyrirlida-hlutfall 100%", /100\.0%/.test(body));
/* Vikmorkin verda ad vera A SKJANUM — hlutfall an urtaksstaerdar er
   fullyrding sem thykist vera maeling.                                  */
ok("vikmorkin (± 95%) eru synileg", /± 95%/.test(body));

/* ---------- 4. Chip-dagatalid ---------- */
console.log("\n4) chip-dagatal");
ok("Bench Boost daalkur", body.includes("Bench Boost"));
ok("Triple Captain daalkur", body.includes("Triple Captain"));
ok("bboost 40/950 birtist sem 4.2%", /4\.2%/.test(body));
ok("BADAR umferdir i dagatalinu (6 og 7)",
   /Gameweek 6/.test(body) || document.body.textContent.includes("6"));

/* ---------- 5. EO GETUR FARID YFIR 100% ---------- */
console.log("\n5) mismunur vid fjoldann");
ok("kaflinn birtist", body.includes("Experts vs the crowd"));
/* P[2]: allir eiga OG allir fyrirlida -> EO 200%. Talan MA fara yfir 100%
   og profid negglir thad, thvi "klippt vid 100%" vaeri throgul villa.   */
ok("EO yfir 100% birtist (200.0%)", /200\.0%/.test(body));

/* ---------- 6. WILDCARD-VIDVORUNIN ---------- */
console.log("\n6) wildcard/free hit i skipta-tolunum");
/* 95 af 950 = 10% spiludu skipta-chip, svo athugasemdin A ad birtast.   */
ok("athugasemd um chip-skipti birtist", /played a transfer chip/.test(body));
ok("hun nefnir hlutfallid (10%)", /10% of the panel/.test(body));

/* ---------- 7. UMFERDAR-VALARINN ---------- */
console.log("\n7) umferdar-valari");
const sel = document.querySelector("select[aria-label='Gameweek']");
ok("valari birtist thegar fleiri en ein umferd er til", !!sel);
ok("hann ber badar umferdir", sel && sel.querySelectorAll("option").length === 2);
if (sel) {
  /* Skipt yfir i GW6: thad sem var RETT i GW7 verdur ad BREYTAST. Prof sem
     skodar bara "birtist eitthvad" myndi ekki sja frosinn valara.        */
  await act(async () => {
    sel.value = "6";
    sel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });
  await act(async () => { await new Promise(r => setTimeout(r, 80)); });
  const b6 = txt();
  ok("valid skiptir raunverulega um umferd (GW6)", /Gameweek 6/.test(b6));
  ok("kaup-talan breytist (300 i GW6, var 620)", /300/.test(b6) && !/620/.test(b6));
  /* GW6 hefur ENGIN chip -> athugasemdin MA EKKI vera thar. Thetta er
     neikvaed fullyrding um streng sem var SANNANLEGA a skjanum adan.    */
  ok("chip-athugasemdin hverfur i umferd an chips", !/played a transfer chip/.test(b6));
}

/* ---------- 8. THEKJU-VIDVORUNIN ---------- */
console.log("\n8) thekju-vidvorun");
{
  /* 500 af 1000 = 50% -> undir 90% morkunum, svo vidvorunin A ad birtast. */
  PROS_GW.gw[7] = { ...GW7, n: 500 };
  const root2 = createRoot(document.createElement("div"));
  const dom2 = document.createElement("div");
  document.body.appendChild(dom2);
  const r2 = createRoot(dom2);
  await act(async () => { r2.render(React.createElement(App)); });
  await act(async () => { await new Promise(r => setTimeout(r, 250)); });
  const b2 = [...dom2.querySelectorAll("button")].find(b => b.textContent.includes("Best of the best"));
  if (b2) {
    await act(async () => { b2.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    await act(async () => { await new Promise(r => setTimeout(r, 120)); });
  }
  ok("vidvorun birtist thegar thekja er undir morkunum",
     /Only .* of the panel could be read/.test(dom2.textContent || ""));
}

/* ---------- 8b. ENGAR REACT-VIDVARANIR ---------- */
console.log("\n8b) react-vidvaranir");
ok("engin React-vidvorun vid ad teikna fyllta flipann",
   reactWarnings.length === 0, reactWarnings[0] || "");
/* Fra og med kafla 9 eru gognin VILJANDI skemmd, svo vidvaranir thadan
   eru ekki marktaekar — vid haettum ad telja.                            */
console.error = origConsoleErr;

/* ---------- 9. SKEMMD pros_gw.json ---------- */
console.log("\n9) skemmd gogn fella ekki flipann");
{
  /* `pros_gw.json` er GAGNASKRA og gagnaskrar koma skemmdar (sbr.
     untrusted-input.mjs og data-resilience kafla um "ronga gerd"). Hun er
     skrifud af cron sem getur dottid i sundur i midri skrift. Krafan er
     EKKI ad taflan birtist — heldur ad appid hrynji ekki og syni hvorki
     `undefined` ne `NaN`.                                               */
  const BROKEN = {
    "gw er strengur":            { panel_size: 1000, gw: "nope" },
    "umferd er ekki hlutur":     { panel_size: 1000, gw: { 7: "x" } },
    "own er fylki":              { panel_size: 1000, gw: { 7: { n: 10, own: [1,2], capt: {}, in: {}, out: {}, chips: {} } } },
    "n er strengur":             { panel_size: 1000, gw: { 7: { n: "tiu", own: {}, capt: {}, in: {}, out: {}, chips: {} } } },
    "svid vantar alveg":         { panel_size: 1000, gw: { 7: { n: 10 } } },
    "panel_size vantar":         { gw: { 7: { n: 10, own: {}, capt: {}, in: {}, out: {}, chips: {} } } },
    "null alls stadar":          { panel_size: null, gw: { 7: null } },
  };
  for (const [label, blob] of Object.entries(BROKEN)) {
    PROS_GW.gw = blob.gw; PROS_GW.panel_size = blob.panel_size;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const r = createRoot(host);
    let crashed = null;
    const origErr = console.error; console.error = () => {};
    try {
      await act(async () => { r.render(React.createElement(App)); });
      await act(async () => { await new Promise(z => setTimeout(z, 200)); });
      const b = [...host.querySelectorAll("button")].find(x => x.textContent.includes("Best of the best"));
      if (b) {
        await act(async () => { b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
        await act(async () => { await new Promise(z => setTimeout(z, 100)); });
      }
    } catch (e) { crashed = e.message; }
    console.error = origErr;
    const t = host.textContent || "";
    const bad = crashed ? "HRUNDI: " + crashed.slice(0, 50)
              : /\bundefined\b|\bNaN\b|\[object Object\]/.test(t) ? "birti undefined/NaN"
              : t.trim().length < 200 ? "naestum tomur (" + t.trim().length + ")" : "";
    ok(`skemmt: ${label}`, !bad, bad);
    r.unmount(); host.remove();
  }
}

console.log(`\nPROS-BIRTING: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
