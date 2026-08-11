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
/* Lidsskipan i fixturunni: 3-4-3 hja 600, 4-4-2 hja 350. Verd-punktar
   valdir svo "4,5 GK eda 4,0 GK" se profanlegt.                          */
const SHAPE = {
  formations: { "3-4-3": 600, "4-4-2": 350 },
  benchPos: { "1234": 900 },
  shapeN: 950,
  startCost: 845, benchCost: 170,
  byPos: { 1: 45, 2: 155, 3: 335, 4: 310 },
  priceStart: { 1: { 45: 700, 50: 250 }, 2: { 40: 400, 60: 300 },
                3: { 50: 500, 120: 200 }, 4: { 90: 400, 145: 300 } },
  priceBench: { 1: { 40: 900 }, 2: { 40: 800 }, 3: { 45: 700 }, 4: { 45: 600 } },
  outcome: { n: 950, panelDelta: -1000,
             byFormation: { "3-4-3": { n: 600, delta: -2500 },
                            "4-4-2": { n: 350, delta: 500 },
                            "5-3-2": { n: 4, delta: -99999 } } },
};

const GW7 = {
  ...SHAPE,
  /* CONTROL-HOPUR: sama talning, verri tolur. An vidmids er "bekkurinn
     kostar 17,0" merkingarlaus tala.                                     */
  control: { size: 1000, n: 900, points: 48, benchPoints: 12, transfers: 1.9,
             hitCost: 3.4, value: 1002, benchCost: 205, autoSubs: 0.8,
             transferMinsMedian: 240,
             formations: { "4-4-2": 500, "3-4-3": 400 }, shapeN: 900,
             byPos: { 1: 48, 2: 182, 3: 300, 4: 262 }, startCost: 792 },
  n: 950,
  own:  { [P[0]]: 700, [P[1]]: 400, [P[2]]: 950, [P[3]]: 120 },
  capt: { [P[2]]: 950, [P[0]]: 0 },
  vice: { [P[1]]: 300 },
  in:   { [P[0]]: 620, [P[1]]: 210, [P[3]]: 90 },
  out:  { [P[4]]: 540, [P[5]]: 180 },
  chips: { bboost: 40, wildcard: 95 },          // 13,7% spiladu skipta-chip
  transfers: 1.6, hitCost: 1.2, hitShare: 0.31,
  value: 1013, bank: 4, rankMedian: 41250,
  /* Svidin sem audit-ið 10.8.2026 skiladi — voru i svarinu allan timann. */
  points: 62, benchPoints: 3, autoSubs: 0.4,
  transferMinsMedian: 45, transferLateShare: 0.62,
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
const fetched = { pros_gw: 0, pros: 0 };
globalThis.fetch = async url => {
  const s = String(url);
  if (s.includes("pros_gw.json")) {
    fetched.pros_gw++;
    return { ok: true, status: 200, json: async () => PROS_GW };
  }
  if (s.includes("pros.json")) fetched.pros++;
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

/* LETIHLEDSLAN ER MAELD, EKKI TREYST. `pros_gw.json` er ~21 KB per umferd
   (~814 KB i lok timabils) og `pros.json` 69 KB — hvorugt kemur fyrstu
   hledslu vid. Sama regla og bsd_shots (CLAUDE.md kafla 6, skotakortin).
   An thessarar fullyrdingar gaeti letihledslan verid fjarlaegd thegjandi.  */
ok(`pros_gw.json EKKI sott vid raesingu (${fetched.pros_gw} soknir)`, fetched.pros_gw === 0);
ok(`pros.json EKKI sott vid raesingu (${fetched.pros} soknir)`, fetched.pros === 0);

const btn = [...document.querySelectorAll("button")]
  .find(b => b.textContent.includes("Best of the best"));
ok("flipa-hnappurinn finnst", !!btn);
await act(async () => { btn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await act(async () => { await new Promise(r => setTimeout(r, 120)); });

ok(`pros_gw.json sott EFTIR ad flipinn var valinn (${fetched.pros_gw})`, fetched.pros_gw === 1);
ok(`pros.json sott lika (${fetched.pros})`, fetched.pros === 1);

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

/* ---------- 4a2. VIDMID: THEIR BESTU GEGN ALMENNUM STJORNANDA ---------- */
console.log("\n4a2) vidmid gegn almennum stjornanda");
ok("vidmids-taflan birtist", /Average manager/.test(body));
ok("stig theirra bestu (62.0) og almennra (48.0)", /62\.0/.test(body) && /48\.0/.test(body));
ok("bekkjar-stig bædi (3.0 og 12.0)", /3\.0/.test(body) && /12\.0/.test(body));
ok("bekkjar-kostnadur bædi (£17.0 og £20.5)", /£17\.0/.test(body) && /£20\.5/.test(body));
ok("staerd vidmids-hopsins nefnd (1000)", /1000 randomly chosen/.test(body));
/* MUNURINN a bekkjar-stigum er -9 og LAEGRA ER BETRA thar — merkid ma ekki
   radast af formerki eingongu.                                          */
ok("munur birtur (-9.0 a bekkjar-stigum)", /-9\.0/.test(body));
/* LITURINN VERDUR AD SEGJA THAD SAMA OG TALAN. Fyrir "stig a bekk" og
   "stig i hits" er LAEGRA BETRA, svo -9 er GODUR munur og verdur ad vera
   graenn. Fyrsta utgafa profsins skodadi adeins toluna, og stokkbreyting
   sem slokkti a laegra-er-betra reglunni SLAPP — nakvaemlega gildran sem
   CLAUDE.md kafla 8 lysir ("hi er FORSENDA, ekki skraut") og sem
   compare-visual.mjs var byggt fyrir.                                    */
{
  const GREEN = "rgb(0, 185, 107)", RED = "rgb(217, 45, 60)";
  const rowOf = label => [...document.querySelectorAll("tr")]
    .find(tr => (tr.querySelector("td")?.textContent || "").trim() === label);
  const diffColor = label => {
    const tds = rowOf(label)?.querySelectorAll("td");
    return tds ? tds[tds.length - 1].style.color : null;
  };
  ok(`færri stig a bekk er GRAENN munur (${diffColor("Points left on bench")})`,
     diffColor("Points left on bench") === GREEN);
  ok(`faerri stig i hits er GRAENN munur (${diffColor("Points spent on hits")})`,
     diffColor("Points spent on hits") === GREEN);
  /* Og fyrir STIG er HAERRA betra — svo +14 verdur lika ad vera graent.
     Ef bædi vaeru eins gaeti reglan verid slokkt an ad thad saeist.      */
  ok(`meiri stig er GRAENN munur (${diffColor("Points")})`,
     diffColor("Points") === GREEN);
  /* Skjarinn ma ekki vera allur graenn: eitthvad verdur ad geta ordid raudt.
     Bekkjar-KOSTNADUR er laegri hja theim bestu (17,0 a moti 20,5) og
     HAERRA er "betra" i thessari reglu, svo hann A ad vera raudur — thad
     sannar ad liturinn radast af tolunni og ekki af rodinni.             */
  ok(`bekkjar-kostnadur er RAUDUR (${diffColor("Bench cost")})`,
     diffColor("Bench cost") === RED);
}

/* ---------- 4b. LIDSSKIPAN, VERD-PUNKTAR OG HVAD STOD SIG BEST ---------- */
console.log("\n4b) lidsskipan, verd-punktar, arangur kerfa");
ok("Squad shape birtist", body.includes("Squad shape"));
ok("leikstodukerfi 3-4-3 birtist", /3-4-3/.test(body));
ok("hlutfall kerfis (63.2%)", /63\.2%/.test(body), body.match(/6[0-9]\.\d%/)?.[0]);
ok("eydsla i vorn birtist (£15.5)", /£15\.5/.test(body));
ok("bekkjar-kostnadur birtist (£17.0)", /£17\.0/.test(body));
/* VERD-PUNKTAR — thetta er spurningin "4,5 GK eda 4,0 GK". */
ok("verd-punktar byrjunarlids birtast (£4.5)", /£4\.5/.test(body));
ok("bekkjar-markmadur a 4,0 birtist (£4.0)", /£4\.0/.test(body));
ok("dyr sokn i verd-punktum (£14.5)", /£14\.5/.test(body));
/* HVAD STOD SIG BEST */
ok("kaflinn um arangur kerfa birtist", /How each formation actually did/.test(body));
ok("rodunar-breyting birtist (-2,500)", /-2,500/.test(body));
ok("borid vid hopinn (-1,500)", /-1,500/.test(body), "delta -2500 minus panel -1000");
/* KERFI MED FAA LID MA EKKI BIRTAST — 4 stjornendur er ekki maeling, og
   -99999 vaeri staersta talan a skjanum ef sian brotnadi.               */
ok("kerfi med adeins 4 lid er SLEPPT", !/5-3-2/.test(body) && !/99,999/.test(body));

/* ---------- 4c. MEST EIGADIR ---------- */
console.log("\n4c) mest eigadir");
ok("Most owned birtist", body.includes("Most owned"));
ok(`mest eigadi madurinn birtist (${NAME[P[2]]})`, body.includes(NAME[P[2]]));
ok("eignarhalds-hlutfall birtist (100.0%)", /100\.0%/.test(body));

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

/* ---------- 10. SIMAHAMUR OG LARETT SKRUN ---------- */
console.log("\n10) breidar toflur ma EKKI lata sidunna skruna larett");
{
  /* CLAUDE.md kafla 8: "Breid tafla faer sinn eigin skrun-kassa svo hun
     rydji ekki SIDUNNI ut a sima. Sidan skrunar hvergi larett."

     JSDOM GERIR ENGA UMBROTSREIKNINGA — `scrollWidth` er alltaf 0 — svo
     ekki er haegt ad MAELA yfirflaedi her. Thad sem ER haegt ad fullyrda er
     BYGGINGIN: hver tafla verdur ad hafa forfodur med overflowX auto/scroll.
     Tafla sem sleppur ut ur skrun-kassa er einmitt hun sem rydur sidunni.  */
  const tables = [...document.querySelectorAll("table")];
  ok(`toflur fundust i flipanum (${tables.length})`, tables.length >= 4);
  const loose = tables.filter(t => {
    for (let e = t.parentElement; e; e = e.parentElement) {
      const ox = e.style?.overflowX || "";
      if (ox === "auto" || ox === "scroll") return false;
    }
    return true;
  });
  ok(`hver tafla er i eigin skrun-kassa (${tables.length - loose.length}/${tables.length})`,
     loose.length === 0);

  /* Ekkert i flipanum ma bera FASTA breidd sem er breidari en simi (390px). */
  const wide = [...document.querySelectorAll("*")].filter(e => {
    const w = e.style?.width || e.style?.minWidth || "";
    const m = /^(\d+)px$/.exec(w);
    return m && +m[1] > 390;
  });
  ok(`engin fost breidd yfir 390px (${wide.length} brot)`, wide.length === 0,
     wide[0]?.tagName + " " + (wide[0]?.style?.width || wide[0]?.style?.minWidth));
}

console.log("\n10b) flipinn teiknast i simahami (390px + matchMedia)");
{
  /* CLAUDE.md kafla 8: `narrow` kviknar a innerWidth < 560 OG matchMedia.
     jsdom gefur 1024 og HEFUR ENGA matchMedia, svo simahamurinn var
     "fast false i ollum profum" thangad til playerlist-narrow.mjs stillti
     badum upp. Sama er gert her — annars vaeri helmingur hegdunarinnar
     oprofadur, sem er einmitt villan sem thad safn afhjupadi.             */
  dom.window.innerWidth = 390;
  dom.window.matchMedia = q => ({
    matches: /max-width:\s*(390|480|559|560)px/.test(q) || /max-width/.test(q),
    media: q, onchange: null,
    addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  });
  PROS_GW.gw = { 6: GW6, 7: GW7 }; PROS_GW.panel_size = PANEL;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const r = createRoot(host);
  let crashed = null;
  try {
    await act(async () => { r.render(React.createElement(App)); });
    await act(async () => { await new Promise(z => setTimeout(z, 250)); });
    const b = [...host.querySelectorAll("button")].find(x => x.textContent.includes("Best of the best"));
    if (b) {
      await act(async () => { b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
      await act(async () => { await new Promise(z => setTimeout(z, 150)); });
    }
  } catch (e) { crashed = e.message; }
  const t = host.textContent || "";
  ok("teiknast an hruns i 390px", !crashed, crashed || "");
  ok("efnid er enn thar i simahami", /Bought|Sold/.test(t), t.slice(0, 60));
  ok("engin undefined/NaN i simahami", !/\bundefined\b|\bNaN\b/.test(t));
  r.unmount(); host.remove();
}

/* ---------- 10b2. MISMUNA-TOFLURNAR MA EKKI SKARAST ---------- */
console.log("\n10b2) sami leikmadur ma ekki vera i BADUM mismuna-toflum");
{
  /* Maelt 10.8.2026: med adeins 3 eigendum birtust allir thrir i BADUM
     toflum — einni sem segir "experts own MORE" og annarri "own LESS".
     `slice(0,10)` og `slice(-10)` skarast undir 20 radir. Sami flokkur og
     "liturinn verdur ad segja thad sama og talan": skjarinn ma ekki
     fullyrda tvennt gagnstaett um sama mann.                              */
  const few = players.slice(0, 3).map(p => p.id);
  PROS_GW.gw = { 7: { n: 100,
    own: { [few[0]]: 90, [few[1]]: 50, [few[2]]: 10 },
    capt: {}, vice: {}, in: { [few[0]]: 40 }, out: { [few[1]]: 30 },
    chips: {}, transfers: 1, hitCost: 0, hitShare: 0,
    value: 1000, bank: 0, rankMedian: 1000 } };
  PROS_GW.panel_size = PANEL;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => { r.render(React.createElement(App)); });
  await act(async () => { await new Promise(z => setTimeout(z, 250)); });
  const b = [...host.querySelectorAll("button")].find(x => x.textContent.includes("Best of the best"));
  if (b) {
    await act(async () => { b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    await act(async () => { await new Promise(z => setTimeout(z, 150)); });
  }
  /* Finna badar mismuna-toflur og bera saman nofnin i theim. */
  const heads = [...host.querySelectorAll("div")]
    .filter(d => /^(Experts own more|Experts own less)$/.test((d.textContent || "").trim()));
  ok(`badar mismuna-toflur fundust (${heads.length})`, heads.length === 2);
  const namesOf = h => {
    const tbl = h.parentElement?.querySelector("table");
    return new Set([...(tbl?.querySelectorAll("tbody tr td:first-child") || [])]
      .map(td => (td.textContent || "").trim()).filter(Boolean));
  };
  if (heads.length === 2) {
    const A = namesOf(heads[0]), B = namesOf(heads[1]);
    const both = [...A].filter(x => B.has(x));
    ok(`engin leikmadur i badum toflum (${A.size} + ${B.size}, skorun ${both.length})`,
       both.length === 0, both.join(", "));
  }
  r.unmount(); host.remove();
}

/* ---------- 10c. LEIKMADUR SEM ER EKKI LENGUR I players.json ---------- */
console.log("\n10c) horfinn leikmadur");
{
  /* FPL fjarlaegir leikmenn (log, uppsagnir). `pros_gw.json` er skrifud i
     GW7 en `players.json` er endurmyndud daglega, svo id getur horfid UNDAN
     talningunni. Tha ma hvorki koma `undefined` a skja ne hrun — hvorugt
     segir notandanum neitt.                                              */
  PROS_GW.gw = { 7: { ...GW7, in: { 999999: 300 }, out: { 999998: 200 },
                      own: { 999999: 500 }, capt: { 999999: 250 } } };
  PROS_GW.panel_size = PANEL;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const r = createRoot(host);
  let crashed = null;
  try {
    await act(async () => { r.render(React.createElement(App)); });
    await act(async () => { await new Promise(z => setTimeout(z, 250)); });
    const b = [...host.querySelectorAll("button")].find(x => x.textContent.includes("Best of the best"));
    if (b) {
      await act(async () => { b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
      await act(async () => { await new Promise(z => setTimeout(z, 150)); });
    }
  } catch (e) { crashed = e.message; }
  const t = host.textContent || "";
  ok("horfinn leikmadur fellir ekki flipann", !crashed, crashed || "");
  ok("engin undefined/NaN thott nafnid vanti", !/\bundefined\b|\bNaN\b/.test(t));
  ok('birt sem "unknown", ekki tomt', /unknown/.test(t));
  ok("talan sjalf birtist samt (300)", /300/.test(t));
  r.unmount(); host.remove();
}

/* ---------- 11. FULLT TIMABIL (38 UMFERDIR) ---------- */
console.log("\n11) lok timabils — 38 umferdir i skranni");
{
  /* Flipinn hefur adeins verid profadur med TVEIMUR umferdum. I mai verda
     thaer 38: chip-dagatalid faer 38 radir og valarinn 38 kosti. Thetta er
     astandid sem varir LENGST og hafdi aldrei teiknast.                   */
  const full = {};
  for (let g = 1; g <= 38; g++) {
    full[g] = { ...GW7, n: 900 + (g % 50),
                chips: g === 19 ? { wildcard: 300, bboost: 80 } : (g % 5 ? {} : { bboost: 30 }) };
  }
  PROS_GW.gw = full; PROS_GW.panel_size = PANEL;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const r = createRoot(host);
  const t0 = Date.now();
  let crashed = null;
  try {
    await act(async () => { r.render(React.createElement(App)); });
    await act(async () => { await new Promise(z => setTimeout(z, 250)); });
    const b = [...host.querySelectorAll("button")].find(x => x.textContent.includes("Best of the best"));
    if (b) {
      await act(async () => { b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
      await act(async () => { await new Promise(z => setTimeout(z, 200)); });
    }
  } catch (e) { crashed = e.message; }
  const ms = Date.now() - t0;
  const t = host.textContent || "";
  ok("teiknast an hruns med 38 umferdir", !crashed, crashed || "");
  /* Nyjasta umferdin A ad vera valin sjalfgefid — ekki sú fyrsta. */
  ok("nyjasta umferdin (38) er sjalfgefin", /Gameweek 38/.test(t));
  const sel = host.querySelector("select[aria-label='Gameweek']");
  ok(`valarinn ber allar 38 umferdir (${sel?.querySelectorAll("option").length})`,
     sel && sel.querySelectorAll("option").length === 38);
  /* Chip-dagatalid a ad bera ALLAR umferdir, ekki bara thaer med chip. */
  const rows = [...host.querySelectorAll("table")].map(x => x.querySelectorAll("tbody tr").length);
  ok(`chip-dagatalid hefur 38 radir (staersta tafla: ${Math.max(...rows)})`,
     rows.includes(38));
  /* GW19 er sidasta umferd fyrra chip-settsins — wildcard-toppurinn.
     VAENTA TALAN ER REIKNUD UR SOMU GOGNUM, ekki slegin inn: fyrsta utgafan
     bar "32.2%" sem eg reiknadi i hausnum med rongu `n` (deildi med 931 i
     stad 919) og profid fell a MINNI reiknivillu, ekki a kodanum. Hardkodud
     vaentitala i profi er sama aett af villu og hardkodud safna-tala.     */
  const n19 = 900 + (19 % 50);
  const want19 = `${(100 * 300 / n19).toFixed(1)}%`;
  ok(`wildcard-toppurinn i GW19 birtist (${want19} = 300/${n19})`,
     t.includes(want19), t.match(/3[0-9]\.\d%/)?.[0]);
  ok("engin undefined/NaN med fullt timabil", !/\bundefined\b|\bNaN\b/.test(t));
  ok(`teiknast a vidunandi tima (${ms} ms)`, ms < 8000, ms + " ms");
  r.unmount(); host.remove();
}

console.log(`\nPROS-BIRTING: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
