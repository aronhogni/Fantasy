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

const { ROWS } = await import(new URL("src/Compare.jsx", REPO).href);

/* SULU-RUMFRAEDIN VAR HER (kafli 1) og for med `barGeom`. Reglan sem hun
   varði — "vantandi gildi faer ENGA sulu, thvi sula af lengd 0 laesist eins
   og maeld nulltala" — lifir afram i toflunni sem "—" og er profud i kafla 3. */

/* `near(a,b,t,n)` VAR HER OG VAR DAUD HJALPARFUNKSJON — FJARLAEGD 21.8.2026.
   Hun var vikmarka-samanburdur fyrir SULU-LENGDIR (`barGeom`), og thegar
   sulurnar foru 14.8.2026 for eina kall-stadurinn med theim: `grep -n "near("`
   fann NULL kall eftir thad. Hun stod samt eftir og LAS EINS OG THEKJA —
   fullyrdinga-hjalpari i profaskra segir "her er maelt", og her var ekkert
   maelt. STOKKBREYTINGARPROF sannadi daudann adur en hun var fjarlaegd:
   `near = (a,b,t,n) => ok(String(n), false, ...)` — fullyrding sem FELLUR
   ALLTAF — skildi safnid eftir a 69/69 graenum og exit 0.
   Taflan tharf hana ekki: hun ber NAMUNDADA texta-tolu (`numOf` les hana af
   skjanum) og samanburdurinn er JAFNGILDI vid laegsta/haesta gildid i sinni
   rod, ekki vikmork. Vikmarka-hjalpari an vikmarka-samanburdar er
   tautologia i bidstodu (CLAUDE.md 5b og 13).                             */

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
/* ============================================================
   ▼-MERKID — FULLYRT ADUR EN ThAD ER STRIPPAD BURT

   Lykkjan her ad nedan gerir `replace("▼","")` a rod-heitinu. Sa hreinsun var
   RUIN 14.8.2026 til 16.8.2026: `VisualRows` var eini stadurinn sem teiknadi
   merkid, thad for med sulunum, og hreinsunin hafdi ekkert ad hreinsa. Hun
   RUMADI thvi merki sem hun sannadi aldrei ad vaeri til — nakvaemlega tóma
   fullyrdingin sem CLAUDE.md 5b lysir. Skyringartextinn undir toflunni lofadi
   merkinu allan timann ("▼ in a row label marks a number where lower is
   better"), svo notandinn las tofluna an theirrar visbendingar.

   Vaentingin er LEIDD UT UR `ROWS` (ekki handskrifud), en TALAN sjalf verdur
   ad geta fallid: maelt 16.8.2026 eru thetta 9 radir (minPerPt, cost,
   minPerGi, minPerXgi, goals_conceded, expected_goals_conceded, gcDelta,
   yellow_cards, red_cards). Golfid ver gegn thvi ad "0 merkt = 0 vaentanleg"
   lesist sem graent.                                                       */
const labelOf = tr => [...tr.querySelectorAll("td")][0].textContent.replace("▼", "").trim();
const markedLabels = trs.filter(tr => [...tr.querySelectorAll("td")][0].textContent.includes("▼"))
                        .map(labelOf).sort();
const renderedLabels = new Set(trs.map(labelOf));
const wantLabels = ROWS.filter(r => r.k && r.hi === false && renderedLabels.has(r.label))
                       .map(r => r.label).sort();
ok(`laegra-er-betra radir a skjanum (${wantLabels.length})`, wantLabels.length >= 9, wantLabels.join(", "));
ok(`▼ merkt a nakvaemlega theim rodum (${markedLabels.length})`,
   markedLabels.length === wantLabels.length && markedLabels.every((l, i) => l === wantLabels[i]),
   `merkt: [${markedLabels.join(", ")}] vaentanlegt: [${wantLabels.join(", ")}]`);

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

console.log("\n=== 4. RADGJOFIN: SAMHENGIS-KASSINN A RAUNGOGNUM ===");
/* AF HVERJU DOM EN EKKI TEXTALEITAR-VORDUR: `tests/advisor.mjs` atti vord
   sem lyfti thvi ad `bigChances:` finnist einhvers stadar i `src/`. Hann var
   graenn medan framleidslan var 0 af 587 — `Compare.jsx` sendi
   `season={currentLabel}` ("2026/27") en BSD-skrain ber "2025/26", svo
   uppflettingin skiladi engu. Textinn var settur, tengingin daud. Eina
   fullyrdingin sem getur greint tharna a milli er ad LESA KASSANN.

   Hér er EKKERT endurreiknad: prófid flettir hvorki upp `code` ne les
   `bsd_players.json`. Thad les thad sem stendur a skjanum (sbr.
   buildTeamMetrics-atvikid, CLAUDE.md 7).                                  */
const advSubs = [...document.querySelectorAll("div")]
  .filter(d => d.children.length === 0 && d.textContent.trim() === "Shown, but not in the score");
ok(`samhengis-kassinn er teiknadur (${advSubs.length} dalkar)`, advSubs.length >= 1);
const ctxLabels = [...document.querySelectorAll("span")].map(s => s.textContent.trim());
ok(`byrjunar-likur birtast sem samhengi (${ctxLabels.filter(t => t === "Chance of 60+ minutes").length})`,
   ctxLabels.includes("Chance of 60+ minutes"));
const bcSpans = [...document.querySelectorAll("span")].filter(s => s.textContent.trim() === "Big chances");
ok(`"Big chances" birtist hja minnst einum leikmanni (${bcSpans.length})`, bcSpans.length >= 1,
   "0 = radgjofin les rangt timabil ur BSD (season vs currentLabel)");
/* Og talan verdur ad vera TALA — tomur reitur vaeri sama villan i dulargervi. */
const bcVals = bcSpans.map(s => parseFloat((s.nextElementSibling?.textContent || "").trim()));
ok("hvert \"Big chances\"-gildi er tala", bcVals.length > 0 && bcVals.every(Number.isFinite),
   bcVals.join(", "));

/* ============================================================
   TIMASPRENGJAN VID GW1-LOK — VALREGLAN, EKKI DOM-ID

   Um leid og fyrsta umferd telst kladud flippast sjalfgefna timabilid i
   thessum glugga i "2026/27" (`seasonStarted ? currentLabel : ...`). BSD
   ber adeins 2025/26 thangad til `bsd_live.json` fyllist, svo
   `bigChances` hefdi ordid 0 af 592 I SOMU VIKU og draftid.
   `seasonStarted` er leitt INNI i App af `events`, svo thad er ekki haegt
   ad stilla thad hedan an thess ad falsa gagnaskra. Reglan sjalf er thad
   sem var lagad, svo hun er profud BEINT — dregin ur upprunanum og keyrd
   a RAUNVERULEGU BSD-skranum i badum timabils-stodum.
   ============================================================ */
{
  const cmp = readFileSync(new URL("../src/Compare.jsx", import.meta.url), "utf8");
  const m = cmp.match(/const withData = files\.filter\([^\n]*\);\s*\n\s*const pick = ([^\n]*);/);
  ok("valreglan finnst i Compare.jsx", !!m);
  const pickFor = (files, season) => {
    const withData = files.filter(f => f && (f.players?.length || 0) > 0);
    return withData.find(f => f.season === season) || withData[0] || null;
  };
  ok("reglan ber VARALEID (`withData[0]`) — ekki adeins nakvaemt timabil",
     !!m && /withData\[0\]/.test(m[1]));

  const bsd = JSON.parse(readFileSync(new URL("../data/bsd_players.json", import.meta.url), "utf8"));
  const files = [bsd, null];                       // bsd_live er ekki til enn
  const now = pickFor(files, "2025/26");
  ok(`i dag (2025/26 valid): ${now?.players.length ?? 0} leikmenn`,
     !!now && now.players.length > 100);
  const after = pickFor(files, "2026/27");
  ok(`EFTIR GW1-flippid (2026/27 valid): ${after?.players.length ?? 0} leikmenn — ekki 0`,
     !!after && after.players.length > 100);
  /* Og thegar bsd_live FYLLIST a hun ad taka vid — annars vaeri varaleidin
     ordin ad frystingu a gomlu timabili.                                */
  const live = { season: "2026/27", players: [{ code: 1, big_chances: 3 }] };
  ok("og lifandi skra tekur vid um leid og hun ber gogn",
     pickFor([bsd, live], "2026/27") === live);
}

/* ============================================================
   5. UMFERDAR-BILID I SAMANBURDINUM (20.8.2026)

   BEIDNIN: "vil geta valid gameweek-bil eins og i Player stats — bara
   sidustu 8 leikina". Og BLOKKUNIN A SKJANUM VAR OSONN:
     "per-gameweek numbers only exist in live/gw*.json and they only fill
      up once 2026/27 begins"
   `data/live/` er ekki adeins tom — HUN ER EKKI TIL. Per-umferdar gogn
   liggja fyrir fyrir fimm LOKIN timabil og leikmannalistinn hefur notad
   thau fra 7.8.2026.

   ThESSI KAFLI PROFAR HEGDUN I DOM, EKKI TEXTA I KODA. Fjorar fullyrdingar
   sem hver getur fallid ein:
     a) valarinn er thar og kassarnir eru LEIDDIR ur skranni
     b) valid bil BREYTIR raunverulega tolum — og rod sem getur ekki fylgt
        bilinu breytist EKKI og segir thad
     c) stodu-hlidid (`defOnly`/`gkOnly`) lifir bilid: NAKVAEMLEGA somu
        radir teiknast, thvi `element_type` fylgir med
     d) yfirstandandi timabil SLEKKUR valarann MED ASTAEDU, og gamla
        osanna setningin er farin
   ============================================================ */
console.log("\n=== 5. UMFERDAR-BILID: VALARINN, TOLURNAR OG STODU-HLIDID ===");
const { maxGwOf, lastNRange, nextRange } = await import(new URL("src/gwRange.js", REPO).href);
const { ROW_BLIND, ROW_FOLLOW_N } = await import(new URL("src/Compare.jsx", REPO).href);

/* Glugginn og listinn eru BADIR i DOM (glugginn er yfirlag ofan a flipanum),
   svo hvert einasta uppslattarord verdur ad vera SKORDAD vid gluggann.    */
const panel = [...document.querySelectorAll("h2")]
  .find(h => h.textContent.trim() === "Comparison")?.parentElement?.parentElement;
ok("samanburdar-glugginn er addressanlegur (forsenda alls her a eftir)", !!panel);
const pBtn = re => [...(panel?.querySelectorAll("button") || [])]
  .find(b => re.test(b.textContent.trim()));

/* --- 5a. VALARINN --- */
const toggle = pBtn(/Gameweeks$/);
ok("umferdar-valarinn er I GLUGGANUM (hnappur vid timabils-valid)", !!toggle);
ok("...og hann er VIRKUR a loknu timabili (sjalfgefid 2025/26)",
   !!toggle && !toggle.disabled, `disabled=${toggle?.disabled}`);
await fire(toggle);
await act(async()=>{ await new Promise(r=>setTimeout(r,600)); });

const gwGroup = () => panel?.querySelector('[aria-label="Select gameweek range for the comparison"]');
const cells = () => [...(gwGroup()?.querySelectorAll("button") || [])];
ok(`kassa-strikid teiknast (${cells().length} kassar)`, cells().length > 0);
/* ThAKID ER LEITT UR SKRANNI. Talan 38 er RETT her — thess vegna er hun
   borin vid skrana sjalfa og ekki vid 38: hefdi hun verid skrifud i kodann
   vaeri hun jafn graen og jafn brotin a timabili sem naer skemur.        */
const GWF = J("player_gw_2526.json");
ok(`kassarnir eru ${maxGwOf(GWF)} — nakvaemlega thad sem 2025/26-skrain ber`,
   cells().length === maxGwOf(GWF), `${cells().length} kassar`);
/* OG ThAD MA EKKI VERA FAST I KODANUM. Baedi tolur eru 38 i dag, svo DOM-id
   getur ekki greint tharna a milli — kodinn getur. Sama snid og valreglan i
   kafla 4 er profud med.                                                 */
{
  const cmp = readFileSync(new URL("../src/Compare.jsx", import.meta.url), "utf8");
  const bar = cmp.match(/Array\.from\(\{ length: ([^}]*)\}/);
  ok("kassa-fjoldinn i kodanum er BREYTA ur skranni, ekki fasti",
     !!bar && /gwMax/.test(bar[1]) && !/\d/.test(bar[1]), bar?.[1]);
  ok('"last N"-hnapparnir klippast a thakinu (`lastNRange(n, gwMax)`)',
     /lastNRange\(n, gwMax\)/.test(cmp));
}
/* Og fallid sjalft: thakid RAEDUR, hnappur sem gerir ekkert er ekki bodinn. */
ok("lastNRange(8, 38) = [31, 38]", String(lastNRange(8, 38)) === "31,38");
ok("lastNRange(8, 12) = [5, 12] — thakid er vidfangid, ekki 38",
   String(lastNRange(8, 12)) === "5,12");
ok("lastNRange(38, 38) = null (N yfir allt timabilid er 'whole season')",
   lastNRange(38, 38) === null);
ok("nextRange: fyrsti smellur setur punkt, annar teygir AFTURABAK lika",
   String(nextRange(null, 8)) === "8,8" && String(nextRange([8, 8], 3)) === "3,8");

/* --- 5b. BREYTAST TOLURNAR? ---
   Lesid AF SKJANUM i badum homum. Rod-heitid er lesid ur TEXTA-hnutum eingongu
   svo ▼-merkid og "season"/"today"-merkid raski thvi ekki.               */
const readTable = () => {
  const out = {};
  for (const tr of panel.querySelectorAll("tr")) {
    const tds = [...tr.querySelectorAll("td")];
    if (tds.length < 3) continue;
    const label = [...tds[0].childNodes].filter(n => n.nodeType === 3)
      .map(n => n.textContent).join("").trim();
    if (!label) continue;
    out[label] = { cells: tds.slice(1).map(td => td.textContent.trim()),
                   badges: [...tds[0].querySelectorAll("span")]
                     .map(s => s.textContent.trim()).filter(t => t !== "▼") };
  }
  return out;
};
const whole = readTable();
/* TEXTINN ER TEKINN I BADUM HOMUM OG ThAD VAR STOKKBREYTINGARPROFID SEM
   KENNDI ThAD: notan ber SITTHVORA setningu eftir thvi hvort bil er valid,
   svo fullyrding sem er metin ADEINS eftir ad bil var valid getur ekki sed
   osonnu setninguna — hun bydi i "heilt timabil"-greininni. Stokkbreyting
   sem setti hana thar aftur inn SLAPP I GEGN i fyrstu utgafu kafla 6.    */
const wholeText = panel.textContent || "";
ok(`heilt timabil lesid (${Object.keys(whole).length} radir)`, Object.keys(whole).length > 10);
/* FORSENDAN SONNUD FYRST: rodin sem vid berum saman BER TOLU a heilu timabili.
   An hennar vaeri "talan breyttist" tom fullyrding (CLAUDE.md 5b).       */
ok('"FPL points" ber tolu a heilu timabili',
   !!whole["FPL points"] && whole["FPL points"].cells.every(t => /\d/.test(t)),
   JSON.stringify(whole["FPL points"]?.cells));
ok("engin rod ber merki a heilu timabili (merkid er um BILID)",
   Object.values(whole).every(r => r.badges.length === 0),
   Object.entries(whole).filter(([, r]) => r.badges.length).map(([l]) => l).join(", "));

const last8 = pBtn(/^last 8$/);
ok('"last 8" er i bodi (beidnin sjalf)', !!last8);
await fire(last8);
await act(async()=>{ await new Promise(r=>setTimeout(r,400)); });
ok("bilid sest a skjanum sem GW 31–38", /GW\s*31[–-]38/.test(panel.textContent));
const ranged = readTable();

const pts = { was: whole["FPL points"]?.cells, now: ranged["FPL points"]?.cells };
ok("GW 31–38 gefur ONNUR stig en heilt timabil (talan fylgir bilinu)",
   !!pts.now && String(pts.was) !== String(pts.now), `${pts.was} -> ${pts.now}`);
ok("...og bilid er LAEGRA en heildin (8 umferdir af 38)",
   (pts.now || []).every((t, i) => {
     const a = parseFloat(t), b = parseFloat(pts.was[i]);
     return !Number.isFinite(a) || !Number.isFinite(b) || a <= b;
   }), `${pts.was} -> ${pts.now}`);
/* Hve margar radir hreyfdust — borid vid MAELDU tolunni ur `gwBlindKeys`.  */
const moved = Object.keys(ranged).filter(l => whole[l] &&
  String(whole[l].cells) !== String(ranged[l].cells));
ok(`${moved.length} radir hreyfdust af ${Object.keys(ranged).length} a skjanum`,
   moved.length >= 8, moved.slice(0, 6).join(", "));

/* --- 5c. RADIR SEM GETA EKKI FYLGT BILINU SEGJA ThAD --- */
ok(`\`gwBlindKeys\` fann ${ROW_BLIND.size} rod sem getur ekki fylgt bilinu`
   + ` (${ROW_FOLLOW_N} geta)`, ROW_BLIND.size >= 1 && ROW_FOLLOW_N > 20,
   [...ROW_BLIND].join(", "));
ok('VERDID hreyfist EKKI med bilinu (thad er alltaf dagsins verd)',
   String(whole["Price"]?.cells) === String(ranged["Price"]?.cells),
   `${whole["Price"]?.cells} -> ${ranged["Price"]?.cells}`);
ok('...og rodin SEGIR ThAD: Verd ber merkid "today"',
   (ranged["Price"]?.badges || []).includes("today"),
   JSON.stringify(ranged["Price"]?.badges));
ok('"DC per start" ber merkid "season" (arkiv-svid, engin per-umferdar heimild)',
   (ranged["DC per start"]?.badges || []).includes("season"),
   JSON.stringify(ranged["DC per start"]?.badges));
/* OG ENGIN ONNUR ROD MA BERA MERKI. Merki a rod sem fylgir bilinu er osonn
   fullyrding i hina attina — og merki sem sest a ollum radum er ekkert merki. */
const badged = Object.entries(ranged).filter(([, r]) => r.badges.length).map(([l]) => l).sort();
ok(`nakvaemlega ${badged.length} radir bera merki, og thad eru THESSAR`,
   badged.length === Object.keys(ranged).filter(l =>
     ["Price", "DC per start"].includes(l)).length,
   badged.join(", "));
/* Merkta rodin verdur ad vera EIN AF ThEIM SEM ERU A SKJANUM — annars vaeri
   talningin her ad ofan tom.                                              */
ok("...og badar merktu radirnar eru raunverulega teiknadar",
   !!ranged["Price"] && !!ranged["DC per start"]);

/* --- 5d. STODU-HLIDID LIFIR BILID (`element_type` fylgir rodinni) ---
   `sumGwRange` skilar ENGRI stodu. An thess ad bera hana yfir er
   `defOnly`/`gkOnly`-hlidid spurt um `undefined` og varnar-radirnar HVERFA
   (eda, i listanum, birtust a rongum manni: 410 radir / 1.535 gildi).
   PROFSTEINNINN ER MENGI RADANNA: bilid ma hvorki BAETA VID ne TAKA radir. */
const posShown = [...panel.querySelectorAll("tr")][0]
  ? [...panel.querySelectorAll("th")].map(th => th.textContent).join(" ") : "";
ok(`stodurnar i samanburdinum sjast i hausnum (forsenda hlidsins)`,
   /\b(GK|DEF|MID|FWD)\b/.test(posShown), posShown.slice(0, 80));
const setEq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const lw = Object.keys(whole).sort(), lr = Object.keys(ranged).sort();
ok(`bilid teiknar NAKVAEMLEGA somu radir (${lr.length}) — stodu-hlidid lifdi`,
   setEq(lw, lr),
   `bara i heilu: [${lw.filter(l => !lr.includes(l))}] · bara i bili: [${lr.filter(l => !lw.includes(l))}]`);
/* Og hlidid VERDUR ad hafa verid virkt — annars er samanburdurinn ad ofan
   tveir tomir listar. Minnst ein stodu-laest rod er a skjanum.           */
const posLocked = ["CS", "CS %", "GC", "xGC", "DC", "Saves"].filter(l => lr.includes(l));
ok(`stodu-laestar radir a skjanum: ${posLocked.length} (${posLocked.join(", ")})`,
   posLocked.length >= 1);

/* --- 5e. YFIRSTANDANDI TIMABIL: SLOKKT MED ASTAEDU --- */
console.log("\n=== 6. YFIRSTANDANDI TIMABIL OG SETNINGIN SEM VAR OSONN ===");
/* GAMLA SETNINGIN — NEIKVAED FULLYRDING MED SANNADRI FORSENDU. Hun er sonnud
   i hina attina fyrst: nyja setningin VERDUR ad vera thar, annars vaeri
   "gamla er farin" satt um toman glugga (CLAUDE.md 5b).                  */
/* BADIR HAMIR I EINU. `wholeText` var tekinn adur en bil var valid (kafli 5b);
   nu er `panel.textContent` bils-hamurinn. Fullyrdingin er um BADA — notan
   ber sitthvora setningu og osonn setning i odrum haminum er jafn osonn.  */
const bothText = wholeText + "\n" + (panel.textContent || "");
ok("nyja setningin er a skjanum i BADUM homum og nefnir LOKIN timabil",
   (wholeText.match(/completed season/gi) || []).length >= 1
   && /completed season/i.test(panel.textContent || ""));
ok("...og nefnir hve morg thau eru, LEITT ur consistency.json (5)",
   /\b5 completed seasons\b/.test(wholeText),
   (wholeText.match(/A range works on[^.]*\./) || [""])[0]);
ok('...og "heilt timabil"-hamurinn bendir a valarann (`Gameweeks above`)',
   /gameweek range/i.test(wholeText) && /Gameweeks/.test(wholeText));
ok('OSANNA SETNINGIN ER FARIN UR BADUM HOMUM: engin tilvisun i "live/gw*.json"',
   !/live\/gw\*?\.json/.test(bothText));
ok('...og engin fullyrding um ad bil se "not an arbitrary gameweek range"',
   !/not an arbitrary gameweek range/i.test(bothText));
ok('...og "reaches 3 years back" er farid (thau eru fimm)',
   !/3 years back/i.test(bothText));

const sel = panel.querySelector("select");
ok("timabils-valid er addressanlegt", !!sel);
const liveOpt = [...(sel?.options || [])].find(o => /not started/.test(o.textContent));
ok("yfirstandandi timabil er i valmyndinni", !!liveOpt, [...(sel?.options||[])].map(o=>o.value).join(", "));
sel.value = liveOpt.value;
await act(async()=>{ sel.dispatchEvent(new dom.window.Event("change", { bubbles:true })); });
await act(async()=>{ await new Promise(r=>setTimeout(r,300)); });
ok(`valid faerdist a ${liveOpt.value}`, sel.value === liveOpt.value);
const liveToggle = pBtn(/Gameweeks$/);
ok("valarinn er SLOKKTUR a yfirstandandi timabili (ekki thogull, ekki brotinn)",
   !!liveToggle && liveToggle.disabled === true, `disabled=${liveToggle?.disabled}`);
ok("...og hann BER ASTAEDUNA, a ensku og nakvaema",
   /no per-gameweek data yet/i.test(liveToggle?.title || ""), liveToggle?.title);
ok("...og astaedan segir ad bil krefjist LOKINS timabils",
   /finished season/i.test(liveToggle?.title || ""), liveToggle?.title);
/* Og strikid ma ekki vera thar samt.                                      */
ok("kassa-strikid er hvergi a yfirstandandi timabili", !gwGroup());
/* ASTAEDAN VERDUR AD VERA LAESILEG AN ThESS AD BENDA. Valarinn var OPINN
   thegar timabilinu var skipt, svo hun stendur i eigin kassa a skjanum og
   ekki adeins i `title` — tooltip naest ekki i sima (CLAUDE.md 8).       */
ok("...og astaedan stendur A SKJANUM, ekki adeins i tooltip",
   /no per-gameweek data yet/i.test(panel.textContent || ""),
   (panel.textContent.match(/[^.]*no per-gameweek data yet[^.]*\./) || [""])[0]);

console.log(`\nSAMANBURDAR-TAFLA: ${pass}/${pass+fail} graen`);
process.exit(fail ? 1 : 0);
