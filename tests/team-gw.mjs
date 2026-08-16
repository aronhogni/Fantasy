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
import { TEAM_STAT_BY_KEY } from "../src/teamstats.js";
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
  /* 16.8.2026: nylida-malsgreinin og skyringar-blokkin undir toflunni.
     BADAR eru sannanlega TEIKNADAR i thessu safni fram ad theirri breytingu
     — flipinn er opinn og >800 stafir samkvaemt fullyrdingunni her ad ofan
     — svo thessi thrju "farin" geta fallid.                              */
  ok("nylida-malsgreinin er farin",
     !/did not play in the Premier League last season/.test(t));
  ok("skyringar-textinn undir toflunni er farinn",
     !/Best and worst follow the column/.test(t) && !/Amber headers/.test(t));
  ok("heimilda-rodin undir toflunni er farin",
     !/football-data E0, 380 matches/.test(t) && !/Shot zones — ESPN commentary/.test(t));
  /* EN LITA-LYKILLINN STENDUR — an hans eru graent og raut holf tvo litud
     holf an nafns. Hann er lykill, ekki skyring, og for thvi ekki med.   */
  ok("lita-lykillinn (best/worst) stendur eftir", /best/.test(t) && /worst/.test(t));
  /* En VARUDIN um otylltan dalk verdur ad standa — hun er ekki skyring
     heldur vorn gegn thvi ad tomur dalkur lesist sem "engar faerir".   */
  const hasBsd = (() => { try { J("bsd_teams.json"); return true; } catch { return false; } })();
  if (!hasBsd) ok("varudin um otylltan dalk stendur", /is not filled in yet/.test(t));
  else ok("BSD er til, svo varudin a ekki vid", true);
}

/* ============================================================
   6) SKYRINGARNAR ERU I HAUSNUM — LESNAR AF SKJANUM

   Skyringar-blokkin og heimilda-rodin undir toflunni voru fjarlaegdar
   16.8.2026 og efni theirra flutt i `title` a hverjum dalka-haus. Kafli 5
   sannar ad textinn se FARINN; ef ekkert kaemi i stadinn vaeri thad
   nakvaemlega tapadur rokstudningur, svo hann verdur ad finnast HER.

   THRENNT SEM BLOKKIN GAT EKKI GERT OG ThETTA VER:
     1. HUN SAGDI EITT FYRIR ALLA DALKA. "For everything a team concedes,
        lower is better — except long shots faced" er handskrifud undantekning
        sem stadnar vid naesta dalk. Attin er nu lesin ur `d.hi`, svo hun er
        profud PER DALK (skot a sig: laegra betra · langskot: haerra betra).
     2. HUN BAR FASTAR TOLUR. "380 matches" og "817 shots carried no zone
        text" voru hardkodadar. Thaer eru nu lesnar ur skranum og eru bornar
        vid ThAER SOMU SKRAR her — sama regla og `spRanges` i SetPieces.
     3. EIN SETNING HENNAR VAR ORDIN ROng: "xG and xGC — FPL player totals,
        roughly 19% short". Thau koma ur BSD-skotakortinu fra 8.8.2026
        (r 0,369 -> 0,818). Sa strengur ma hvergi snua aftur.
   ============================================================ */
console.log("\n6) HVER DALKUR BER SINA SKYRINGU I HAUSNUM");
{
  /* HEILT TIMABIL AFTUR: kaflar 3-4 skildu eftir valid bil, og i throngu
     bili geta of faar tolur verid i dalki til ad besta/versta se merkt —
     tha vaeri fullyrdingin um litina had thvi hvad var smellt adur.     */
  const back = [...document.querySelectorAll("button")].find(b => b.textContent.trim() === "whole season");
  if (back) await act(async () => { back.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { await new Promise(r => setTimeout(r, 80)); });
  /* OG FLOKKURINN ER VALINN BERUM ORDUM. Kafli 4 skildi eftir SOKNAR-
     flokkinn, svo `Shots` var soknar-dalkurinn og `Long` / `xG/shot` voru
     alls ekki a skjanum — fullyrdingarnar mældu tha rangan dalk og tomt
     mengi. Markvardar-flokkurinn er lika sa eini sem ber ALLAR THRJAR
     heimildirnar (E0, ESPN, BSD) og sertilfellid um langskotin.        */
  const gk = [...document.querySelectorAll("button")]
    .find(b => b.textContent.trim() === "What the keeper faces");
  ok("markvardar-flokkurinn finnst", !!gk);
  if (gk) await act(async () => { gk.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { await new Promise(r => setTimeout(r, 80)); });

  const ths = [...document.querySelectorAll("th")];
  /* POSITIV FORSENDA FYRST — an hennar vaeri hvert "inniheldur" hér ad
     nedan satt um TOMT mengi (CLAUDE.md 5b, thekja er fullyrding).      */
  const cols = ths.slice(1);                    // fyrsti er lids-dalkurinn
  ok(`hausrodin er teiknud (${cols.length} tolu-dalkar)`, cols.length >= 8, `${cols.length}`);
  ok("lids-dalkurinn ber sina eigin skyringu", /Sort by team/.test(ths[0]?.title || ""));

  const titles = cols.map(th => th.getAttribute("title") || "");
  ok("hver einasti dalkur ber skyringu", titles.every(t => t.length > 40),
     `tomir: ${titles.filter(t => t.length <= 40).length}`);
  ok("hver skyring nefnir heimild sina", titles.every(t => /\nSource: /.test(t)),
     titles.filter(t => !/\nSource: /.test(t)).length + " an heimildar");
  ok("hver skyring segir hvor attin er betri",
     titles.every(t => /(Higher|Lower) is better\./.test(t)),
     titles.filter(t => !/(Higher|Lower) is better\./.test(t)).length + " an attar");

  /* Skyringin sjalf (`note` ur teamstats.js) verdur ad fylgja med — thad er
     idiomid ur stats.js og eina skyldusvidid i dalkaskranni.             */
  const byShort = k => titles[cols.findIndex(th => th.textContent.replace(/[↑↓]/g, "").trim() === k)] || "";
  const tShots = byShort("Shots"), tLong = byShort("Long"), tXgShot = byShort("xG/shot");
  ok("skyring dalks ber `note` ur dalkaskranni",
     tShots.includes(TEAM_STAT_BY_KEY.shots_against_pg.note), tShots.slice(0, 60));

  /* 1. ATTIN ER PER DALK — thetta er thad sem ein setning gat ekki sagt. */
  ok("skot a sig: LAEGRA er betra", /Lower is better\./.test(tShots), tShots.slice(0, 80));
  ok("langskot a sig: HAERRA er betra (sertilfellid)",
     /Higher is better\./.test(tLong), tLong.slice(0, 80));
  ok("og skyringin segir hvad litirnir thyda",
     /marked best \(green\), the (lowest|highest) worst \(red\)/.test(tShots));

  /* 2. TOLURNAR ERU LESNAR UR SKRANUM — bornar vid somu skrar. */
  const ts = J("team_shots.json"), tf = J("team_form.json");
  let bsd = null; try { bsd = J("bsd_teams.json"); } catch { /* ma vanta */ }
  const perClub = Math.max(0, ...(tf.teams || []).map(t => Number(t.matches) || 0));
  const espnT = titles.filter(t => /ESPN commentary/.test(t));
  ok(`ESPN-dalkar nefna leikjafjolda skrarinnar (${ts.matches})`,
     espnT.length > 0 && espnT.every(t => t.includes(`ESPN commentary, ${ts.matches} matches`)),
     `${espnT.length} dalkar`);
  /* `.every` A TOMU MENGI ER SATT — og stokkbreyting (gamla tooltip-snidid)
     let thessa fullyrdingu OG timabils-fullyrdinguna hér ad nedan LIFA
     medan hinar tiu fellu, thvi `espnT`/`bsdT` urdu tom. Thaer krefjast
     thvi FJOLDANS lika (CLAUDE.md 5b: thekja er fullyrding).            */
  ok(`og svaedalausu skotin eru TALIN, ekki hardkodud (${ts.no_zone})`,
     espnT.length > 0 && (!ts.no_zone
       || espnT.every(t => t.includes(`${ts.no_zone} shots carried no zone text`))));
  const e0T = titles.filter(t => /football-data E0/.test(t));
  ok(`E0-dalkar nefna leiki per lid ur skranni (${perClub})`,
     e0T.length > 0 && e0T.every(t => t.includes(`${perClub} matches per club`)), `${e0T.length} dalkar`);
  /* E0-HEILDARTALAN MA EKKI KOMA AFTUR: hun var hardkodud "380 matches" og
     er EKKI reiknanleg ur team_form.json (summa/2 gefur 323 thvi follnu
     lidin thrju vantar). Se hun sett inn aftur er hun agiskun i buningi
     maelingar.                                                           */
  ok("og enginn heldur fram E0-heildartolu sem er ekki reiknanleg",
     !titles.some(t => /football-data E0[^\n]*380 matches/.test(t)));
  if (bsd) {
    const bsdT = titles.filter(t => /BSD shot map/.test(t));
    ok(`BSD-dalkar nefna leikjafjolda skrarinnar (${bsd.matches})`,
       bsdT.length > 0 && bsdT.every(t => t.includes(`${bsd.matches} matches`)), `${bsdT.length} dalkar`);
    ok(`og timabilid er SOTT ur skranni (${bsd.season})`,
       bsdT.length > 0 && bsdT.every(t => t.includes(`(${bsd.season} only)`)));
  }

  /* 3. GAMLA, RANGA SETNINGIN MA HVERGI VERA — hvorki a skjanum ne i
     skyringu. POSITIVA HLIDIN VID HLIDINA: xG/skot-dalkurinn nefnir BSD,
     svo "FPL-strengurinn finnst ekki" getur ekki verid satt af thvi ad
     enginn texti se til.                                                */
  ok("xG-heimildin er BSD-skotakortid", /BSD shot map/.test(tXgShot), tXgShot.slice(-90));
  const all = titles.join("\n") + (document.body.textContent || "");
  ok("hvergi stendur lengur ad xG/xGC komi ur FPL-summu",
     !/FPL player totals/.test(all) && !/roughly 19% short/.test(all));
}

console.log(`\nTEAMS-UMFERDIR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
