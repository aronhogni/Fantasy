/* ============================================================
   TEAMS — UMFERDAR-VALARINN, LESINN AF SKJANUM

   HVERS VEGNA THETTA SAFN VARD TIL: notandinn opnadi flipann og sa
   "1234567891011121314…38" i einni bendu, an ramma og an lits. Astaedan
   var ad ALLIR stilarnir a valaranum — `S.gwBar`, `S.gwBox`, `S.gwBoxOn`
   og fjorir adrir — voru NOTADIR i markup-inu en HVERGI SKILGREINDIR.

   ENGIN VORN GREIP THAD, og thad er kjarni malsins:
     - `S.gwBox` er gild uppfletting sem skilar `undefined`, og
       `{...undefined}` er logleg JS, svo esbuild og `npm run build` voru
       graen (sama aett og hviti skjarinn i CLAUDE.md kafla 2).
     - `data-resilience` opnar flipann en telur adeins STAFI — 38 tolur an
       stila eru jafn margir stafir og 38 tolur med stilum.
     - `react-warnings` heimsaekir flipann en vidvorun kemur engin: React
       kvartar ekki yfir `style={undefined}`.

   Lardomurinn er sá sami og med simahaminn: thad sem enginn MAELIR a
   skjanum er ekki vitad ad virki. Thetta safn maelir thvi STILANA sjalfa,
   ekki bara ad hnappurinn se til.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

/* TILBUNAR FIXTURES: raunveruleg lid-id, en LOKNIR leikir — i forleik er
   `finished` false hja ollum 380, svo urslita-dalkarnir hefdu ekkert ad
   syna og profid vaeri toma fullyrdingin sem kafli 5b varar vid.       */
const realFix = J("fixtures.json");
const teamIds = [...new Set(realFix.flatMap(f => [f.team_h, f.team_a]))].slice(0, 4);
const [A, B, C2, D2] = teamIds;
const FIX = [
  /* GW1: A 3-0 B  ·  C 1-1 D */
  { id: 9001, event: 1, finished: true, started: true, minutes: 90,
    team_h: A, team_a: B, team_h_score: 3, team_a_score: 0 },
  { id: 9002, event: 1, finished: true, started: true, minutes: 90,
    team_h: C2, team_a: D2, team_h_score: 1, team_a_score: 1 },
  /* GW2: B 2-1 A  ·  D 0-0 C */
  { id: 9003, event: 2, finished: true, started: true, minutes: 90,
    team_h: B, team_a: A, team_h_score: 2, team_a_score: 1 },
  { id: 9004, event: 2, finished: true, started: true, minutes: 90,
    team_h: D2, team_a: C2, team_h_score: 0, team_a_score: 0 },
  /* GW3: A 5-0 C — utan bilsins sem vid veljum, svo hun MA EKKI telja. */
  { id: 9005, event: 3, finished: true, started: true, minutes: 90,
    team_h: A, team_a: C2, team_h_score: 5, team_a_score: 0 },
  /* GW2 leikur sem er EKKI lokinn — hlutastada ma ekki telja sem urslit. */
  { id: 9006, event: 2, finished: false, started: true, minutes: 61,
    team_h: A, team_a: D2, team_h_score: 4, team_a_score: 0 },
];

const dom = new JSDOM("<!doctype html><div id=root></div>",
                      { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
/* Sertaeki mock-inn A UNDAN theim almenna (CLAUDE.md kafla 5). */
globalThis.fetch = async url => {
  const s = String(url);
  if (s.includes("fixtures.json"))
    return { ok: true, status: 200, json: async () => FIX };
  const n = s.split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};

console.log(`\n${"=".repeat(84)}`);
console.log("TEAMS — UMFERDAR-VALARINN");
console.log("=".repeat(84));

const { default: App } = await import("../src/App.jsx");
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 250)); });

const tab = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Teams"));
ok("Teams-flipinn finnst", !!tab);
await act(async () => { tab.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await act(async () => { await new Promise(r => setTimeout(r, 150)); });

const boxes = () => [...document.querySelectorAll("[aria-label='Select gameweeks'] button")];

console.log("\n1) valarinn er ALLTAF synilegur — ekki falinn bak vid takka");
ok(`allir 38 kassarnir teiknadir strax (${boxes().length})`, boxes().length === 38);
ok("their bera tolurnar 1..38",
   boxes().map(b => b.textContent.trim()).join(",") ===
   Array.from({ length: 38 }, (_, i) => i + 1).join(","));

console.log("\n2) KASSARNIR HAFA STILA — thetta er villan sem notandinn sa");
{
  /* `S.gwBox` var oskilgreindur, svo `{...undefined}` gaf BERAN texta.
     Krafan er ad hver kassi beri ramma, bakgrunn og fasta breidd.      */
  const b0 = boxes()[0];
  ok(`kassi ber ramma (${b0.style.border || "ENGINN"})`, !!b0.style.border);
  ok(`kassi ber bakgrunn (${b0.style.background || "ENGINN"})`, !!b0.style.background);
  ok(`kassi ber lagmarksbreidd (${b0.style.minWidth || "ENGIN"})`, !!b0.style.minWidth);
  const bar = document.querySelector("[aria-label='Select gameweeks']");
  ok(`rodin sjalf er flex-rod (${bar.style.display || "ENGIN"})`, bar.style.display === "flex");
}

console.log("\n3) VALID BIL LITAST — og endarnir eru adgreindir");
{
  const before = boxes()[9].style.background;
  await act(async () => {
    boxes()[9].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  await act(async () => {
    boxes()[13].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  await act(async () => { await new Promise(r => setTimeout(r, 80)); });
  const bs = boxes();
  const inRange = bs.slice(9, 14), outside = bs[20], edgeLo = bs[9], edgeHi = bs[13];
  ok(`valid bil er merkt (aria-pressed)`, inRange.every(b => b.getAttribute("aria-pressed") === "true"));
  ok(`bakgrunnur BREYTIST vid val (${before} -> ${edgeLo.style.background})`,
     edgeLo.style.background !== before);
  ok("valid bil hefur ANNAN bakgrunn en oval umferd",
     inRange[2].style.background !== outside.style.background,
     `${inRange[2].style.background} vs ${outside.style.background}`);
  ok("ENDARNIR eru adgreindir fra midjunni (eins og i Player stats)",
     edgeLo.style.background !== inRange[2].style.background &&
     edgeHi.style.background === edgeLo.style.background,
     `${edgeLo.style.background} vs ${inRange[2].style.background}`);
  ok(`valid bil birtist sem texti (GW 10-14)`, /GW\s*10[–-]14/.test(document.body.textContent));
}

console.log("\n4) URSLITA-DALKARNIR FYLGJA BILINU — ekki bara skotin");
{
  /* Bil 1-2: lid A skorar 3+1=4 mork i 2 leikjum -> 2,00 per leik, og
     faer a sig 0+2=2 -> 1,00. GW3-leikurinn (5-0) MA EKKI telja, og
     olokni leikurinn (4-0) ekki heldur.                                */
  await act(async () => {
    boxes()[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  await act(async () => {
    boxes()[1].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  await act(async () => { await new Promise(r => setTimeout(r, 100)); });
  const txt = document.body.textContent || "";
  ok("bilid er GW 1-2", /GW\s*1[–-]2/.test(txt));
  /* Attack-hopurinn ber "Goals"; skiptum yfir i hann. */
  const grp = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Attack");
  if (grp) {
    await act(async () => { grp.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    await act(async () => { await new Promise(r => setTimeout(r, 80)); });
  }
  /* LESID UR ROD LIDSINS SJALFS, EKKI LEITAD I ALLRI SIDUNNI.
     Fyrsta utgafan spurdi "er 2.00 einhvers stadar a skjanum?" og
     "er 3.00 hvergi?" — og BADAR stokkbreytingarnar (olokinn leikur talinn,
     umferdar-sian slokkt) SLUPPU, thvi einhver ONNUR rod bar tha tolu.
     Fullyrding sem leitar i heilli sidu er ekki maeling a einu lidi.    */
  const goalsOf = short => {
    const heads = [...document.querySelectorAll("thead th")].map(x => x.textContent.trim());
    const col = heads.findIndex(h => /^Goals/.test(h));
    if (col < 0) return null;
    const tr = [...document.querySelectorAll("tbody tr")]
      .find(r => (r.querySelector("th,td")?.textContent || "").startsWith(short));
    if (!tr) return null;
    const cells = [...tr.querySelectorAll("th,td")];
    const v = (cells[col]?.textContent || "").trim();
    return v === "—" ? null : Number(v);
  };
  const gA = goalsOf("ARS");
  /* A skoradi 3 (GW1) + 1 (GW2) = 4 i TVEIMUR loknum leikjum -> 2,00.
     Olokni 4-0 leikurinn (GW2) og 5-0 leikurinn (GW3) mega HVORUGUR telja:
     med theim fyrri yrdi thad 2,67 og med theim sidari 3,00.            */
  ok(`mork per leik hja ARS eru 2.00 (fekk ${gA})`, gA === 2.00);
  ok("olokinn leikur telur EKKI (2.67 vaeri merki um thad)", gA !== 2.67);
  ok("GW3-leikurinn telur EKKI (3.00 vaeri merki um thad)", gA !== 3.00);
  /* Og lid sem spiladi engan leik i bilinu faer NULL, ekki 0. */
  const gNone = goalsOf("AVL");
  ok(`lid an leiks i bilinu faer "—", ekki 0 (fekk ${gNone})`, gNone === null);
  /* Vidvorunin verdur ad segja RETT hvad fylgir bilinu. */
  const warn = document.body.textContent || "";
  ok("vidvorunin nefnir mork og hrein blod",
     /goals, conceded, clean sheets/.test(warn));
  ok("hun segir EKKI lengur ad adeins skotin fylgi",
     !/only the shot columns follow/.test(warn));
}

/* 4b) LEIKJAFJOLDI UR URSLITUM — EKKI THAKINN AF THESSU SAFNI, OG THAD
   ER SAGT BERUM ORDUM.

   Nefnarinn i skot-dalkunum kemur nu ur `fixtures.json` i stad lykilsins
   `umferd:motherji`, thvi sa lykill getur ekki adgreint tvo leiki gegn SAMA
   lidi i somu umferd. Sa fix er OPROFADUR her, og eg skrifadi fyrst ad
   hann vaeri thakinn af `gA === 2.00` i kafla 4. THAD VAR RANGT:
   `goals_pg` kemur ur urslita-samlagningunni, ekki ur skot-nefnaranum, svo
   sa reitur breytist ekki thott nefnaranum se skipt til baka —
   stokkbreyting stadfesti thad (SURVIVED).

   Til ad profa hann tharf ad HERMA `bsd_shots.json` med tveimur leikjum
   gegn sama motherja i einni umferd. Skotin eru geymd sem thjoppud fylki
   med eigin `legend`/`calib`, svo su fixtura er sjalfstaett verk — og hun
   er ekki komin. Thangad til stendur thetta sem OTHAKID.

   Skrad her fremur en sleppt: prof sem THEGIR um thad sem thad naer ekki
   yfir er verra en prof sem segir thad.                                  */

console.log("\n5) TEXTARNIR SEM VORU TEKNIR UT ERU FARNIR");
{
  const t = document.body.textContent || "";
  /* NEIKVAED FULLYRDING KREFST POSITIVRAR VID HLIDINA (CLAUDE.md 5b).
     "Textinn er farinn" er SANN ef flipinn teiknadi EKKERT — svo badar
     fullyrdingarnar hér ad nedan hefdu stadist a hvitum skja. Vid sonnum
     thvi FYRST ad flipinn se raunverulega teiknadur.                    */
  ok("flipinn teiknadist (haus og lidarod til stadar)",
     /DEF-MID-FWD|Formation|Team/.test(t) && t.trim().length > 800,
     `${t.trim().length} stafir`);
  ok("kynningin er farin", !/How the teams themselves play/.test(t));
  ok("BSD-skyringin er farin", !/threshold was fitted against the big-chance count/.test(t));
  /* En VARUDIN um otylltan dalk verdur ad standa — hun er ekki skyring
     heldur vorn gegn thvi ad tomur dalkur lesist sem "engar faerir".   */
  const hasBsd = (() => { try { J("bsd_teams.json"); return true; } catch { return false; } })();
  if (!hasBsd) ok("varudin um otylltan dalk stendur", /is not filled in yet/.test(t));
  else ok("BSD er til, svo varudin a ekki vid", true);
}

console.log(`\nTEAMS-UMFERDIR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
