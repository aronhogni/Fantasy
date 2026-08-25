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
import { TEAM_STAT_BY_KEY, TEAM_GROUPS } from "../src/teamstats.js";
/* HEITIN A FLOKKA-HNOPPUNUM ERU LESIN UR SKRANNI, EKKI SLEGIN INN. Their
   stodu hardkodadir ("What the keeper faces") a fjorum stodum her og
   brotnudu allir i einu thegar heitid var stytt i "GK" 25.8.2026 — og thad
   sem verra var: `find` skilar `undefined` an thess ad kasta, svo `if (gk)`
   -kaflarnir hefdu ThAGNAD i stad thess ad falla (CLAUDE.md 5b).
   Vidmotid les SOMU skra, svo prof og skjar geta ekki farid i sundur;
   ORDALAGID er ekki thad sem thessi kafli ver, heldur HEGDUNIN.        */
const GROUP_LABEL = k => TEAM_GROUPS.find(g => g.key === k)?.label;
const GK_GROUP = GROUP_LABEL("keeper");
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
  /* ============================================================
     OSPILADUR LOKALEIKUR — DAGATALID, EKKI URSLITIN (24.8.2026)

     HVERS VEGNA HANN VARD AD KOMA: valarinn les ThAKID ur leikjaskranni
     (`maxEventOf`), ekki ur theim leikjum sem eru BUNIR — og raunveruleg
     `fixtures.json` ber ALLAR 38 umferdir fra fyrsta degi (380 radir,
     `maxEvent` 38, 6 loknar i dag). Tilbunu radirnar her ad ofan spanna
     adeins GW1-3, svo dagatalid i profinu var ThRJAR umferdir langt.

     Medan Teams stod sjalfgefid a FYRRA timabili faldist thad: `use.maxGw`
     kom tha ur SKOTAKORTINU (38 umferdir) og hvorki thakid ne fullyrdingin
     snerti leikjaskrana. Um leid og sjalfgildid vard yfirstandandi timabil
     (22.8.) er `shotIndex` sendur sem `null` — kortid naer adeins yfir
     2025/26 — og thakid fell a leikjaskrana eina: 3 kassar, sem er RETT
     svar vid ThESSARI leikjaskra og RANGT svar um appid. Fullyrdingin "38"
     var thvi hvorki rong um appid ne rett um profid; hun studdist vid
     dagatal sem mock-in bar ekki.

     RADIN ER OSPILUD OG ThAD ER ASETT: hun ma engu breyta um urslit
     (`aggFixtureRange` og `buildLiveTeamForm` sleppa henni baedi, sbr.
     9006 her ad ofan), adeins um SPONNINA. Talan 38 er hvergi slegin inn —
     `MAX_EVENT` er leidd ur ThESSARI skra og borin vid raunskrana nedar. */
  { id: 9038, event: 38, finished: false, started: false, minutes: 0,
    team_h: B, team_a: C2, team_h_score: null, team_a_score: null },
];
/* SPONN DAGATALSINS — LEIDD, EKKI SLEGIN INN (sbr. `ATTACK_N` i kafla 4). */
const MAX_EVENT = Math.max(...FIX.map(f => f.event));

const dom = new JSDOM("<!doctype html><div id=root></div>",
                      { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
/* ============================================================
   BIDIN ER MAELD, EKKI GISKUD (21.8.2026)

   Kafli 1 féll med `(0)` thegar timabilid byrjadi og thad var
   MAELITAEKID, ekki appid: `boxes().length` var lesid eftir FASTAN
   `setTimeout`, og fastur svefn er agiskun um hvad appid ThARF. Appid
   sækir nu 36 skrar i tveim boðum — `live/gw1.json` (409 KB) kviknar
   fyrst EFTIR ad `setGw` er kallad, sem gerist eftir ad valfrjalsa
   bodid er lent — svo verkid a eftir fyrsta `act` vard staerra en
   thad var i forleik. Sannreynt: 15 keyrslur i rod gafu 0 kassa og
   nakvaemlega somu keyrslur gafu 38 sidar med OBREYTTUM `data/`
   (mtime ohreyfd), svo talan var kapphlaup — ekki eiginleiki appsins.

   OG ThAD SEM VAR VERRA EN FALLID: med 0 kassa kastadi kafli 2
   `TypeError` a `boxes()[0].style`, svo safnid DO og their 90+
   fullyrdingar sem eftir voru voru aldrei lesnar. Hrun er ekki fall
   (CLAUDE.md 5b).

   ThRJAR REGLUR HER:
     1. `settle()` bidur thangad til ENGIN sokn er i loftinu OG engin ny
        hefur byrjad i tveimur mælingum i rod. Prófid stjornar `fetch`
        sjalft, svo thetta er MAELING a thvi sem svefninn var ad giska a.
     2. `waitFor()` hefur ThAK og ThROTID SJALFT ER FULLYRDING (`ok`),
        aldrei logga — svo "beid lengur" getur ekki orðid "maelir
        ekkert" (CLAUDE.md 5b, thekja er fullyrding).
     3. BIDIN MA EKKI VERA SAMA SPURNING SEM FULLYRDINGIN. Vid bidum a
        `<h2>Teams</h2>` — flipinn er UPPI — og fullyrdum svo um
        KASSANA. Bidum vid a kossunum sjalfum vaeri kafli 1 tautologia.
   ============================================================ */
let inFlight = 0, started = 0;
/* Sertaeki mock-inn A UNDAN theim almenna (CLAUDE.md kafla 5). */
globalThis.fetch = async url => {
  const s = String(url);
  inFlight++; started++;
  const done = v => { inFlight--; return v; };
  if (s.includes("fixtures.json"))
    return done({ ok: true, status: 200, json: async () => FIX });
  const n = s.split("/data/")[1];
  if (!n) return done({ ok: false, status: 404, json: async () => ({}) });
  try { const d = J(n); return done({ ok: true, status: 200, json: async () => d }); }
  catch { return done({ ok: false, status: 404, json: async () => { throw new Error("404"); } }); }
};

const tick = (ms = 10) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
/* SETTLE: engin sokn i loftinu OG engin ny i tveimur mælingum i rod.
   Bædi skilyrdin tharf: `inFlight === 0` eitt er satt i bilinu MILLI
   bodanna, og thad bil er einmitt thad sem fasti svefninn hitti a.   */
const SETTLE_CAP = 8000;
async function settle(label) {
  const t0 = Date.now(); let quiet = 0, last = started;
  while (Date.now() - t0 < SETTLE_CAP) {
    await tick();
    if (inFlight === 0 && started === last) { if (++quiet >= 2) break; }
    else quiet = 0;
    last = started;
  }
  const ms = Date.now() - t0;
  ok(`${label}: gagna-sokn kyrr eftir ${ms} ms (${started} soknir, ${inFlight} i loftinu)`,
     ms < SETTLE_CAP && inFlight === 0);
  return ms;
}
/* WAITFOR: ThAKID ER FULLYRDING. Falli hun er thad appid — og textinn
   segir hvad var beðið um, svo fallid se lesanlegt an thess ad grafa. */
async function waitFor(label, pred, cap = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < cap && !pred()) await tick();
  const got = pred();
  ok(`${label} (${Date.now() - t0} ms)`, got);
  return got;
}

console.log(`\n${"=".repeat(84)}`);
console.log("TEAMS — UMFERDAR-VALARINN");
console.log("=".repeat(84));

const { default: App } = await import("../src/App.jsx");
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await settle("hleðsla");

const tab = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Teams"));
ok("Teams-flipinn finnst", !!tab);
if (!tab) { console.log(`\nTEAMS-UMFERDIR: ${pass} stóðust, ${fail} féllu`); process.exit(1); }
await act(async () => { tab.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
/* FLIPINN ER UPPI — MERKID ER `<h2>Teams</h2>`, EKKI KASSARNIR.
   `Teams.jsx` teiknar hausinn hvad sem gognunum lidur (og segir "Team
   data has not loaded." se hann tomur), svo thetta greinir "flipinn
   opnadist ekki" fra "kassarnir eru ekki thar" — tvaer olikar bilanir
   sem toluna 0 gat ekki sagt i sundur.                              */
const teamsMounted = () => [...document.querySelectorAll("h2")]
  .some(h => h.textContent.trim() === "Teams");
await waitFor("Teams-flipinn er uppi (h2 = \"Teams\")", teamsMounted);
await settle("Teams-flipinn");

const boxes = () => [...document.querySelectorAll("[aria-label='Select gameweeks'] button")];
/* TIMABILS-HNAPPARNIR ERU FUNDNIR UT FRA MERKIMIDANUM "Season", EKKI UT FRA
   TIMABILS-TOLUNNI. `team-stats.mjs` bannar hardkodada timabils-tolu og sama
   rok gilda her: "2025/26" og "2026/27 · 6 matches" ureldast baedi i agust,
   og hnappur sem finnst ekki gefur `undefined` sem hver "breyttist"-
   fullyrding er sonn um (CLAUDE.md 5b).                                  */
/* VALARINN VARD AD FELLILISTA 25.8.2026, svo hjalparfallid finnur `<select>`
   i stad tveggja hnappa. AKKERID ER ThAD SAMA og af somu astaedu: "Season"-
   merkimidinn, aldrei timabils-talan.                                     */
const seasonSel = (host = document) => {
  const lab = [...host.querySelectorAll("span")]
    .find(s => s.textContent.trim() === "Season");
  return lab ? lab.parentElement.querySelector("select") : null;
};
const seasonOpts = (host = document) =>
  [...(seasonSel(host)?.options || [])];
/* SKIPT UM TIMABIL. `<select>` er STYRDUR REITUR — ad setja `.value` eitt
   og ser er hunsad af React vid naestu teikningu, svo `change`-atburdurinn
   VERDUR ad fylgja. Skilar `false` thegar valarinn finnst ekki, og hver
   kallandi FULLYRDIR um thad: "smellti ekki" ma aldrei lesast eins og
   "breyttist ekki" (CLAUDE.md 5b).                                        */
const pickSeason = async (v, host = document) => {
  const sel = seasonSel(host);
  if (!sel) return false;
  await act(async () => {
    sel.value = v;
    sel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });
  await act(async () => { await new Promise(r => setTimeout(r, 120)); });
  return true;
};

console.log("\n1) valarinn er ALLTAF synilegur — ekki falinn bak vid takka");
/* ============================================================
   ThAKID ER LEITT UT UR LEIKJASKRANNI, OG ThAD ER SPURT I BADUM
   TIMABILUM (24.8.2026)

   Fyrri utgafan spurdi "eru their 38?" i EINU timabili — thvi sjalfgildid
   var fyrra timabil og skotakortid gaf thakid. Nu er sjalfgildid
   yfirstandandi timabil, thar sem `shotIndex` er `null` og thakid kemur ur
   `fixtures.json` einni. Talan sem valarinn a ad syna er ThVI SU SAMA i
   badum synum — leikjaskrain spannar allt timabilid fra fyrsta degi — en
   hun kemur eftir SITTHVORRI leidinni, og bara onnur theirra var profud.

   `MAX_EVENT` er leidd ur tilbunu skranni og BORIN VID RAUNSKRANA, svo
   hvorki mock-in ne appid geti rekid fra veruleikanum an thess ad segja
   fra. Vaeri talan hardkodud 38 gaeti hun ordid rett um profid og rong um
   appid — nakvaemlega thad sem gerdist 22.8.                            */
const realMaxEvent = Math.max(...realFix.map(f => f.event || 0));
ok(`FORSENDA: tilbuna dagatalid spannar somu umferdir og raunskrain `
   + `(${MAX_EVENT} af ${realMaxEvent})`, MAX_EVENT === realMaxEvent && MAX_EVENT > 3);
const sb = seasonOpts();
ok(`FORSENDA: timabils-valarinn er FELLILISTI med tveimur valkostum (${sb.length})`,
   !!seasonSel() && sb.length === 2, sb.map(o => o.textContent.trim()).join(" | "));
/* SJALFGEFID ER YFIRSTANDANDI TIMABIL (22.8.) — TVAER OHADAR FULLYRDINGAR.

   1. HEGDUN: skyringar-linan "This season so far …" er teiknud ADEINS
      thegar `liveOn` er satt. Hun er ekki still og getur ekki verid sonn
      um ranga syn.
   2. AUDKENNID: `value` a fellilistanum. ThAD ER STYRT AF `liveOn` — ThVI
      SEM ER A SKJANUM — en ekki af hraa `season`-astandinu, svo syn sem
      fellur til baka i fyrra timabil (ekkert spilad) getur ekki stadid
      merkt "this season". Fyrri utgafan las bakgrunnslit hnappanna
      tveggja; fellilisti hefur engan slikan lit og `value` er beinni
      maeling a somu spurningu.

   ThRIDJA FULLYRDINGIN ER NY OG HUN VER ThAD SEM AUDVELDAST VAR AD TAPA I
   SKIPTUNUM: merkimidi lifandi valkostsins ber LEIKJAFJOLDANN. Urtaks-
   staerd sem hverfur ur merkimidanum er urtaksstaerd sem er falin.      */
if (sb.length === 2) {
  ok(`sjalfgefid er YFIRSTANDANDI timabil og ThAD er valid gildi valarans `
     + `(value=${JSON.stringify(seasonSel().value)})`,
     seasonSel().value === "live");
  ok("og skyringar-linan um yfirstandandi timabil er a skjanum",
     /This season so far: \d+ matches played/.test(document.body.textContent || ""));
  ok(`lifandi valkosturinn ber LEIKJAFJOLDANN (${JSON.stringify(sb[1].textContent.trim())})`,
     /\d+ matches/.test(sb[1].textContent || ""));
  /* `value` OG `onChange` VERDA AD FYLGJAST AD — annars kvartar React um
     ostyrdan reit og valid festist. Profad a HEGDUNINNI: skiptum yfir og
     til baka, og krefjumst thess ad valarinn fylgi i badar attir.       */
  ok("FORSENDA: skipt yfir i fyrra timabil", await pickSeason("prev"));
  ok(`valarinn fylgir skiptunum (value=${JSON.stringify(seasonSel().value)})`,
     seasonSel().value === "prev"
     && !/This season so far: \d+ matches played/.test(document.body.textContent || ""));
  ok("FORSENDA: og til baka", await pickSeason("live"));
  ok(`valarinn fylgir i BADAR attir (value=${JSON.stringify(seasonSel().value)})`,
     seasonSel().value === "live"
     && /This season so far: \d+ matches played/.test(document.body.textContent || ""));
}

const gwLabels = () => boxes().map(b => b.textContent.trim()).join(",");
const wanted = Array.from({ length: MAX_EVENT }, (_, i) => i + 1).join(",");
const checkBar = async (what) => {
  await settle(`${what}: teikning`);
  ok(`${what}: allir ${MAX_EVENT} kassarnir teiknadir strax (${boxes().length})`,
     boxes().length === MAX_EVENT);
  ok(`${what}: their bera tolurnar 1..${MAX_EVENT}`, gwLabels() === wanted);
};
await checkBar("yfirstandandi timabil");
/* OG SAMA I FYRRA TIMABILI — su syn hvilir a ANNARRI thaks-heimild
   (skotakortinu), svo hun er onnur spurning og ma ekki hvila a hinni.

   KAFLAR 2-4 HALDA AFRAM I FYRRA TIMABILI, OG ThAD ER SAGT BERUM ORDUM
   FREMUR EN ThAGAD (24.8.2026): their spyrja um UMFERDAR-BILID og um
   dalkana sem hvila a skotakortinu, og hvorugt er til i lifandi syninni —
   `shotIndex` er sendur sem `null` thar (kortid naer adeins yfir 2025/26)
   svo valarinn er SYNILEGUR EN SLOKKTUR. Su hegdun er ekki oprofud: hun
   er einmitt efni kafla 4b, og tolurnar i lifandi syninni eru efni kafla
   8. Ad keyra 2-4 i lifandi syn vaeri ad spyrja um bil sem er slokkt og fa
   "breyttist ekki" sem er RETT svar og engin maeling.                  */
if (sb.length === 2) {
  ok("FORSENDA: fyrra timabil valid i fellilistanum", await pickSeason("prev"));
  await checkBar("fyrra timabil");
}

/* OG SE VALARINN OF STUTTUR: SEGDU HVERS VEGNA, EKKI KASTA. Fyrri utgafan
   for i `TypeError` a `boxes()[0]` og tok 90+ fullyrdingar med ser.
   ThROSKULDURINN ER LEIDDUR AF ThVI SEM KAFLARNIR A EFTIR SNERTA, EKKI AF
   NULLI (24.8.2026): 24.8. skiladi valarinn ThREMUR kossum, sem er hvorki
   0 ne nog — kafli 3 smellir a `boxes()[13]` — svo safnid do i `TypeError`
   thratt fyrir vordinn. Skilyrdi sem tekur adeins tomt mengi ver ekki gegn
   hluta-mengi.                                                          */
const NEEDED = 14;                         // haesti vistfangi i koflum 3-6
if (boxes().length < NEEDED) {
  const bt = document.body.textContent;
  console.log(`  [diag] kassar: ${boxes().length}, tharf ${NEEDED} |`,
    "Teams uppi:", teamsMounted(),
    "| \"Team data has not loaded.\":", bt.includes("Team data has not loaded."),
    "| \"not available for this table\":", bt.includes("not available for this table"),
    "| soknir:", started, "| i loftinu:", inFlight);
  console.log(`\nTEAMS-UMFERDIR: ${pass} stóðust, ${fail} féllu`);
  process.exit(1);
}

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

/* ============================================================
   4) BILID BREYTIR TOLUNNI — OG SA SEM GETUR ThAD EKKI SEGIR ThAD

   KAERAN (20.8.2026): "i teams se eg bara season stats ... eins i attack,
   stats breytast ekki thar thegar eg filtera gameweeks."

   Fyrri utgafa thessa kafla las urslitin ur TILBUNUM `fixtures.json` og var
   graen — medan appid a raungognum gaf "—" a mork, mork a sig og hrein blod
   hja ollum 20 lidum, thvi raunverulega skrain hefur **0 lokna leiki** og er
   AUK ThESS um annad timabil en taflan synir. Profid maeldi thvi leid sem
   notandinn hafdi ekki.

   NU ER SPURT UM ThAD SEM HANN SER: talan a skjanum FYRIR val og EFTIR val.
   Tilbunu fixtures-urnar eru hafdar afram og bera nu ANNAN vord: thaer na
   yfir 4 lid og 1-2 leiki medan taflan hvilir a 38, svo takt-profid a ad
   HAFNA theim — og gerir thad, sem er sannad her ad nedan med thvi ad talan
   a skjanum er ekki 2,00 (talan sem thaer gaefu).
   ============================================================ */
console.log("\n4) BILID BREYTIR TOLUNNI — og blindur dalkur ber MERKID");
{
  /* Fyrst: HEILT TIMABIL. Kaflar 3 skildu eftir GW 10-14. */
  const clear = () => [...document.querySelectorAll("button")]
    .find(b => b.textContent.trim() === "whole season");
  if (clear()) await act(async () => {
    clear().dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  const grp = name => [...document.querySelectorAll("button")]
    .find(b => b.textContent.trim() === name);
  await act(async () => { grp("Attack").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { await new Promise(r => setTimeout(r, 80)); });

  /* LESID UR ROD LIDSINS SJALFS, EKKI LEITAD I ALLRI SIDUNNI.
     Fyrsta utgafan spurdi "er 2.00 einhvers stadar a skjanum?" — og BADAR
     stokkbreytingarnar sluppu, thvi einhver ONNUR rod bar tha tolu.
     Fullyrding sem leitar i heilli sidu er ekki maeling a einu lidi.    */
  const headCells = () => [...document.querySelectorAll("thead th")];
  const colOf = short => headCells()
    .findIndex(x => x.textContent.replace(/[↑↓]/g, "").replace(/season$/, "").trim() === short);
  const cellOf = (team, short) => {
    const col = colOf(short); if (col < 0) return undefined;
    const tr = [...document.querySelectorAll("tbody tr")]
      .find(r => (r.querySelector("th,td")?.textContent || "").startsWith(team));
    if (!tr) return undefined;
    const v = ([...tr.querySelectorAll("th,td")][col]?.textContent || "").trim();
    return v === "—" ? null : v;
  };
  /* POSITIV FORSENDA FYRST: an hennar vaeri hvert "breyttist" satt um
     `undefined !== undefined` og kaflinn maeldi tomt mengi (CLAUDE.md 5b). */
  const FOLLOW = ["Goals", "xG", "BigC/m", "G−xG"];
  const BLIND = ["Shots", "SoT", "In box", "Close", "Conv."];
  /* TALAN ER LEIDD, EKKI SLEGIN INN (22.8.2026). Hun stod hardkodud i `9`
     — i sama kafla og ber athugasemdina "TALDA SETNINGIN ER LEIDD UT, engin
     handskrifud upptalning sem stadnar" nokkrum linum nedar. Hun fell um
     leid og soknar-flokkurinn fekk samtolu-dalkana (9 -> 12). Krafan sem
     skiptir mali er ad SKJARINN og SKRAIN seu sammala, ekki hver talan er. */
  const { TEAM_STAT_DEFS: TSD } = await import("../src/teamstats.js");
  const ATTACK_N = TSD.filter(d => d.group === "attack").length;
  ok(`soknar-flokkurinn er a skjanum (${headCells().length - 1} af ${ATTACK_N} dalkum)`,
    headCells().length - 1 === ATTACK_N, `${headCells().length - 1} != ${ATTACK_N}`);
  ok("hver dalkur sem profadur er finnst i hausnum",
    [...FOLLOW, ...BLIND].every(s => colOf(s) >= 0),
    [...FOLLOW, ...BLIND].filter(s => colOf(s) < 0).join(","));
  /* LESID PER LID, EKKI EFTIR ROD-NUMERI. Fyrsta utgafan bar radirnar saman
     i thvi ORDER sem thaer stodu, og hun FELL a rettri hegdun: rodunin
     liggur a fyrsta dalki flokksins (`goals_pg`), sem FYLGIR bilinu, svo
     radirnar RADAST UPP A NYTT vid val. Samanburdur eftir stodu i toflu er
     samanburdur a rodun, ekki a tolum.                                   */
  const colValues = short => {
    const col = colOf(short); const o = {};
    if (col < 0) return o;
    for (const tr of document.querySelectorAll("tbody tr")) {
      const cells = [...tr.querySelectorAll("th,td")];
      const team = (cells[0]?.textContent || "").slice(0, 3);
      o[team] = (cells[col]?.textContent || "").trim();
    }
    return o;
  };
  const season = {}, seasonAll = {};
  for (const s of [...FOLLOW, ...BLIND]) {
    season[s] = cellOf("ARS", s);
    seasonAll[s] = colValues(s);
  }
  ok(`allar 20 radir eru lesnar (${Object.keys(seasonAll.Goals).length})`,
    Object.keys(seasonAll.Goals).length === 20);
  ok("og ARS ber TOLU i hverjum theirra a heilu timabili",
    [...FOLLOW, ...BLIND].every(s => season[s] != null),
    JSON.stringify(season));
  ok("ekkert MERKI a heilu timabili (merkimidi an merkingar)",
    !headCells().some(x => /season$/.test(x.textContent.trim())));

  /* NU BIL: GW 1-10. */
  await act(async () => { boxes()[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { boxes()[9].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { await new Promise(r => setTimeout(r, 100)); });
  ok("bilid er GW 1-10", /GW\s*1[–-]10/.test(document.body.textContent || ""));
  ok("og hausinn sjalfur segir bilid, ekki 'full season'",
    !/teams · full season/.test(document.body.textContent || ""));

  const ranged = {};
  for (const s of [...FOLLOW, ...BLIND]) ranged[s] = cellOf("ARS", s);

  /* ---- ThETTA ER FULLYRDINGIN SEM GERIR KAERUNA OMOGULEGA ----
     TALID YFIR ALLAR RADIR, EKKI A EINU LIDI. Fyrsta utgafan spurdi adeins
     um ARS og FELL a `xG 1.76 -> 1.76`: xG/leik hja Arsenal er TILVILJUN
     jafnt i GW 1-10 og yfir timabilid vid tvo aukastafi. Talan var rett og
     dalkurinn fylgdi bilinu — fullyrdingin var of throng. Dalkur sem
     hreyfist a 16 af 17 lidum FYLGIR bilinu; dalkur sem hreyfist a 0
     gerir thad ekki, og ThAD er greiningin sem tharf.                    */
  const rangedCol = {};
  for (const s of [...FOLLOW, ...BLIND]) rangedCol[s] = colValues(s);
  for (const s of FOLLOW) {
    const teams = Object.keys(seasonAll[s]).filter(t => seasonAll[s][t] !== "—");
    const moved = teams.filter(t => seasonAll[s][t] !== rangedCol[s][t]).length;
    const withVal = teams.length;
    ok(`${s}: bilid breytir tolunni hja ${moved}/${withVal} lidum (ARS ${season[s]} -> ${ranged[s]})`,
      withVal >= 15 && moved >= withVal - 2, `${moved}/${withVal}`);
  }
  /* Og hun er ekki 2,00 — talan sem tilbunu fixtures-urnar gaefu. Takt-
     profid a ad hafa hafnad theim (4 lid, 1-2 leikir a moti 38).        */
  ok(`mork ARS eru ur heimild I TAKT, ekki ur 4-lida fixtures-fixturunni (${ranged.Goals})`,
    ranged.Goals !== "2.00");

  /* TVO OLIK BIL VERDA AD GEFA TVAER OLIKAR TOLUR — OG ThESSI FULLYRDING
     VAR NAUDSYNLEG, EKKI SNYRTING. Stokkbreyting sem let bils-tolu vera
     arstidar-tolu (`if (range) return rows`) SLAPP fram hja "talan
     breyttist" hja thremur af fjorum dalkum: arstidar-birtingin er
     endurreiknud ur skotakortinu en `base` kemur ur `bsd_teams.json`, svo
     tolurnar VORU olikar — af HEIMILDA-mun, ekki af bili. "Breyttist"
     greinir thvi ekki bil fra heimildaskiptum; TVO BIL gera thad.       */
  await act(async () => { boxes()[29].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { boxes()[37].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { await new Promise(r => setTimeout(r, 100)); });
  ok("bilid er GW 30-38", /GW\s*30[–-]38/.test(document.body.textContent || ""));
  for (const s of FOLLOW) {
    const late = colValues(s);
    const teams = Object.keys(rangedCol[s]).filter(t => rangedCol[s][t] !== "—");
    const moved = teams.filter(t => rangedCol[s][t] !== late[t]).length;
    ok(`${s}: GW 1-10 og GW 30-38 eru SITT HVAD hja ${moved}/${teams.length} lidum`,
      teams.length >= 15 && moved >= teams.length - 2, `${moved}/${teams.length}`);
  }
  /* Aftur i GW 1-10 svo kaflarnir her a eftir lesi thad bil sem their lysa. */
  await act(async () => { boxes()[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { boxes()[9].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { await new Promise(r => setTimeout(r, 100)); });

  /* ---- OG SA SEM GETUR ThAD EKKI HREYFIST EKKI — EN SEGIR ThAD ---- */
  for (const s of BLIND)
    ok(`${s}: OBREYTT i ALLRI rodinni (${ranged[s]}) og hausinn ber "season"`,
      Object.keys(seasonAll[s]).every(t => seasonAll[s][t] === rangedCol[s][t]) &&
      /season$/.test((headCells()[colOf(s)]?.textContent || "").trim()),
      (headCells()[colOf(s)]?.textContent || "").trim());
  ok("og dalkur sem FYLGIR bilinu ber ALDREI merkid",
    FOLLOW.every(s => !/season$/.test((headCells()[colOf(s)]?.textContent || "").trim())),
    FOLLOW.filter(s => /season$/.test((headCells()[colOf(s)]?.textContent || "").trim())).join(","));
  ok(`fjoldi merkja = fjoldi blindra dalka i flokknum (${BLIND.length})`,
    headCells().filter(x => /season$/.test(x.textContent.trim())).length === BLIND.length,
    `${headCells().filter(x => /season$/.test(x.textContent.trim())).length}`);

  /* Skyringin i hausnum verdur ad segja ThAD SAMA sem merkid — tvo
     skilyrdi um sama hlut er hvernig thau fara i sundur.               */
  const titleOf = s => headCells()[colOf(s)]?.getAttribute("title") || "";
  ok("tooltip blinds dalks segir ad hann fylgi EKKI bilinu",
    /does not follow the gameweek range/.test(titleOf("Shots")));
  ok("og tooltip dalks sem fylgir segir HVADA umferdir hann naer yfir",
    /Follows the gameweek range: the value shown covers GW 1[–-]10/.test(titleOf("Goals")));
  ok("og hann nefnir per-umferdar heimildina, ekki bara arstidar-heimildina",
    /shot map/.test(titleOf("Goals")), titleOf("Goals").slice(-160));

  /* TALDA SETNINGIN ER LEIDD UT — engin handskrifud upptalning sem stadnar. */
  ok("stikan telur hve margir dalkar fylgja bilinu",
    new RegExp(`${ATTACK_N - BLIND.length} of ${ATTACK_N} columns in this group follow the range`)
      .test(document.body.textContent || ""),
    (document.body.textContent || "").match(/\d+ of \d+ columns[^—]*/)?.[0] || "ENGIN");
  ok("gamla HANDSKRIFADA upptalningin er farin",
    !/goals, conceded, clean sheets and the shot columns/.test(document.body.textContent || ""));

  /* NYLIDI FAER "—", EKKI 0 — lika i bili. */
  ok('nylidi (COV) faer "—" i bili, ekki 0', cellOf("COV", "Goals") === null);

  /* ---- LAEGRA-ER-BETRA HELDUR I BILI, LESID AF SKJANUM ----
     `hi` er eiginleiki dalksins en LITURINN les toluna, svo bil sem snyri
     formerki laeti "besta vornin" verda su versta an thess ad `hi` snerist. */
  await act(async () => { grp("Defence").dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await act(async () => { await new Promise(r => setTimeout(r, 80)); });
  {
    const col = colOf("GC");
    ok("GC-dalkurinn er a skjanum og lægra er betra", col >= 0 && TEAM_STAT_BY_KEY.conceded_pg.hi === false);
    const cells = [...document.querySelectorAll("tbody tr")]
      .map(tr => [...tr.querySelectorAll("th,td")][col])
      .filter(Boolean);
    const nums = cells.map(td => ({ v: (td.textContent || "").trim(), bg: td.style.background }))
      .filter(x => x.v !== "—").map(x => ({ v: Number(x.v), bg: x.bg }));
    ok(`GC ber tolur i bili (${nums.length} lid)`, nums.length >= 15, `${nums.length}`);
    const green = nums.filter(x => /230, 249, 240/.test(x.bg) || x.bg === "#e6f9f0");
    const red = nums.filter(x => /253, 236, 238/.test(x.bg) || x.bg === "#fdecee");
    ok("graena holfid er a LAEGSTU tolunni (mork a sig)",
      green.length === 1 && green[0].v === Math.min(...nums.map(x => x.v)),
      `${green.map(x => x.v)} vs min ${Math.min(...nums.map(x => x.v))}`);
    ok("og rauda holfid a HAESTU",
      red.length === 1 && red[0].v === Math.max(...nums.map(x => x.v)),
      `${red.map(x => x.v)} vs max ${Math.max(...nums.map(x => x.v))}`);
    /* CS% er hin attin i SAMA flokki — sertilfellid sem ein setning gat ekki
       sagt (CLAUDE.md 8).                                                */
    const cc = colOf("CS %");
    const cnums = [...document.querySelectorAll("tbody tr")]
      .map(tr => [...tr.querySelectorAll("th,td")][cc]).filter(Boolean)
      .map(td => ({ v: (td.textContent || "").trim().replace("%", ""), bg: td.style.background }))
      .filter(x => x.v !== "—").map(x => ({ v: Number(x.v), bg: x.bg }));
    const cgreen = cnums.filter(x => /230, 249, 240/.test(x.bg));
    ok("CS %: graena holfid er a HAESTU tolunni (hi:true)",
      cgreen.length === 1 && cgreen[0].v === Math.max(...cnums.map(x => x.v)),
      `${cgreen.map(x => x.v)} vs max ${Math.max(...cnums.map(x => x.v))}`);
  }
}

/* ============================================================
   4b) VALARINN ER SLOKKTUR THEGAR ENGIN HEIMILD ER I TAKT — MED SKYRINGU

   ThETTA ER ASTANDID SEM KEMUR 21. AGUST: `team_form.json` skiptir yfir i
   yfirstandandi timabil medan `bsd_shots.json` er enn 2025/26 (hun er
   HANDVIRK skrifta), svo skotakortid verdur UR TAKTI. Tha ma valarinn ekki
   thegja: styring sem bregst ekki vid smelli, an skyringar, er sama aett og
   dalkur sem hreyfist ekki an skyringar — og hvorttveggja var a skjanum.

   `Teams` er teiknad BEINT her (ekki gegnum App) thvi App sækir
   `bsd_shots.json` sjalft; annars vaeri ekki haegt ad taka heimildina af.
   ============================================================ */
console.log("\n4b) ENGIN HEIMILD I TAKT -> SLOKKT STYRING MED SKYRINGU");
{
  const { default: Teams } = await import("../src/Teams.jsx");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const r2 = createRoot(host);
  /* ASTANDID ER BYGGT, EKKI FENGID AD LANI UR `data/` (24.8.2026).
     Thessi kafli sendi adur `fixtures: realFix` og treysti thvi ad HVORUG
     leidin vaeri i takt. Su forsenda var SONN af RANGRI astaedu:
     `aggFixtureRange` gataði a `f.finished` EINU, sem FPL flettir ekki
     fyrr en bonus er stadfestur, svo niu spiladir GW1-leikir toldust ekki
     — og thad var einmitt villan sem notandinn kvartadi yfir („nu get eg
     ekki filterad eftir gameweeks"). Um leid og hun var logud vaknadi
     valarinn og ALLAR sex fullyrdingar her fellu.
     Kaflinn a ad profa „engin heimild i takt", svo hann verdur ad BYGGJA
     thad astand: leikjaskra an nokkurs lokins leiks. Tha er hann sannur
     um sitt eigid efni og ohað thvi hvad `data/` ber i dag.           */
  const noResults = realFix.map(f => ({ ...f, finished: false,
    finished_provisional: false, started: false,
    team_h_score: null, team_a_score: null }));
  const props = { teams: J("teams.json"), teamForm: J("team_form.json"), luck: J("luck.json"),
    teamShots: J("team_shots.json"), bsdTeams: J("bsd_teams.json"),
    fixtures: noResults, shotIndex: null };
  await act(async () => { r2.render(React.createElement(Teams, props)); });
  /* FORSENDA UM FORSENDUNA: leikjaskrain sem vid smiðuðum ber raunverulega
     ENGAN lokinn leik — annars vaeri kaflinn aftur sannur af tilviljun. */
  ok(`byggt astand: 0 loknir leikir af ${noResults.length}`,
    noResults.every(f => !f.finished && !f.finished_provisional));
  const bx = [...host.querySelectorAll("[aria-label='Select gameweeks'] button")];
  const t2 = host.textContent || "";
  /* POSITIV FORSENDA: flipinn er teiknadur og taflan ber tolur. */
  ok(`flipinn teiknadist an skotakorts (${bx.length} kassar, ${t2.length} stafir)`,
    t2.length > 500 && host.querySelectorAll("tbody tr").length === 20 &&
    [...host.querySelectorAll("tbody td")].some(td => /^\d+\.\d\d$/.test(td.textContent.trim())),
    `${host.querySelectorAll("tbody tr").length} radir`);
  ok("kassarnir eru SYNILEGIR en slokktir", bx.length > 0 && bx.every(b => b.disabled),
    `${bx.filter(b => !b.disabled).length} virkir`);
  /* `bx[0]` AN VARNAR ER HRUN, EKKI FALL (24.8.2026). Fullyrdingin a undan
     leyfir `bx.length === 0` ad FALLA — og tha kastadi thessi lina
     `TypeError` og tok 60+ fullyrdingar med ser, nakvaemlega su bilun sem
     kafli 1 var hertur gegn i somu lotu. Sannad med stokkbreytingu i
     `Teams.jsx` sem skildi flipann eftir an kassa.                      */
  ok("og opacity segir thad sjonraent",
     bx.length > 0 && bx[0].style.opacity === "0.45",
     bx.length ? bx[0].style.opacity : "engir kassar");
  ok("SKYRINGIN ER A SKJANUM (ekki adeins i kodanum)",
    /not available for this table/.test(t2) && t2.length > 500);
  ok("og hun nefnir hvers vegna", /per-gameweek/.test(t2), t2.match(/not available[^]{0,140}/)?.[0] || "");
  /* Smellur ma ekki gera neitt — annars vaeri "slokkt" adeins litur.
     SMELLURINN ER SKILYRTUR VID ThAD AD KASSINN SE TIL: an thess er thetta
     hrun (`bx[4]` er `undefined`) og hrun er ekki fall. Og fullyrdingin
     sjalf ber ThA forsenduna med ser, svo "velur ekkert bil" geti ekki
     ordid graen a tomum valara.                                         */
  if (bx.length > 4) await act(async () => {
    bx[4].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  ok("smellur a slokktan kassa velur EKKERT bil",
     bx.length > 4 && !/GW\s*5[–-]5/.test(host.textContent || ""),
     bx.length > 4 ? "" : `adeins ${bx.length} kassar — smellurinn var aldrei gerdur`);
  ok("engin tala er merkt `season` thegar ekkert bil er valid",
    ![...host.querySelectorAll("thead th")].some(x => /season$/.test(x.textContent.trim())));
  await act(async () => { r2.unmount(); });
  host.remove();
}

/* ============================================================
   4d0) HIN HLIDIN: MED RAUNVERULEGUM URSLITUM ER VALARINN VIRKUR

   Kaflinn a undan byggir astand ThAR SEM ENGIN heimild er i takt. Hann
   einn vaeri sonn lysing a BILUDU appi lika — svo hin attin verdur ad
   vera fullyrt vid hlidina (CLAUDE.md 5b regla 2).

   Notandinn: „nu get eg ekki filterad eftir gameweeks." Orsokin var
   `aggFixtureRange` sem gataði a `f.finished` EINU; niu spiladir
   GW1-leikir bera `finished: false, finished_provisional: true`, svo
   urslita-leidin var tom og valarinn slokknadi alveg.
   ============================================================ */
console.log("\n4d0) RAUNVERULEG URSLIT -> VALARINN ER VIRKUR");
{
  const { default: Teams } = await import("../src/Teams.jsx");
  const played = realFix.filter(f => f.finished || f.finished_provisional);
  const prov = played.filter(f => !f.finished && f.finished_provisional);
  /* FORSENDAN ER "ThAD ERU URSLIT", EKKI "ThAU ERU OSTADFEST" (hert
     25.8.2026). Fyrsta utgafan kraufdist `prov >= 1` — og thad var satt
     thegar hun var skrifud (10 af 10 GW1-leikjum voru ADEINS
     `finished_provisional`) en varð OSATT nokkrum klukkustundum sidar
     thegar FPL stadfesti umferdina med bonus. Fost fullyrding um
     ForBIGENGILEGT astand: nakvaemlega ættin sem thetta safn er skrifad
     gegn, og hun fell tvisvar i rod a raungognum.
     Kaflinn profar ad VALARINN VAKNI thegar urslit eru til; hvort thau eru
     stadfest edur ei er onnur spurning. `finished_provisional`-tilfellid
     sjalft er profad a TILBUNUM gognum i `team-stats.mjs` kafla 12e, thar
     sem thad getur ekki urelst.                                        */
  ok(`forsenda: ${played.length} spiladir leikir (${prov.length} ostadfestir)`,
    played.length >= 5, `${played.length} spiladir`);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(React.createElement(Teams, {
    teams: J("teams.json"), teamForm: J("team_form.json"), luck: J("luck.json"),
    teamShots: J("team_shots.json"), bsdTeams: J("bsd_teams.json"),
    fixtures: realFix, shotIndex: null, seasonLabel: "2026/27" })); });
  const bx = [...host.querySelectorAll("[aria-label='Select gameweeks'] button")];
  const live = bx.filter(b => !b.disabled);
  ok(`umferdar-valarinn er VIRKUR i lifandi syn (${live.length} af ${bx.length} kassar)`,
    bx.length > 0 && live.length > 0, `${live.length}/${bx.length}`);
  ok("og engin \"not available\"-skyring stendur eftir",
    !/not available for this table/.test(host.textContent || ""));
  await act(async () => { root.unmount(); }); host.remove();
}

/* ============================================================
   4c) SKOTAKORTIN I LIFANDI SYN BERA SITT EIGID TIMABIL (24.8.2026)

   VILLAN SEM VAR: i lifandi syn (2026/27) er `shotIndex` sendur sem `null`
   inn i `teamRangeUse`, svo `use.shots` er false og `shotSeason` var
   thvi ALLTAF `null` — en skotakorts-blokkin sjalf les HRAA propid og
   teiknadi 2025/26-skotin samt. Utkoman var 2025/26-gogn undir
   2026/27-haus MED ENGU timabili nefndu.

   Thogn var vorin sem var valin thegar `shotIndex` bar ekki `season`.
   Skrain BER hana (`bsd_shots.json.season`), svo thogn var ekki "svarid er
   okunnugt" heldur "vid slepptum ad spyrja" — og thogn um rangt timabil er
   sama aett og hardkodadi "2025/26"-strengurinn sem kafli 7 var skrifadur
   gegn, bara thogul i stad rangrar.

   POSITIV FORSENDA FYRST: kortin verda ad vera A SKJANUM, annars stæðist
   hver einasta fullyrding her a tomum flipa (CLAUDE.md 5b regla 2).
   ============================================================ */
console.log("\n4c) LIFANDI SYN — SKOTAKORTIN NEFNA SITT EIGID TIMABIL");
{
  const { default: Teams } = await import("../src/Teams.jsx");
  const sf = J("bsd_shots.json");
  const Fx = Object.fromEntries(sf.legend.fields.map((f, i) => [f, i]));
  const mk = season => {
    const byTeam = new Map(), byOpp = new Map(), byCode = new Map();
    const put = (m, k, v) => { if (k == null) return; const a = m.get(k); a ? a.push(v) : m.set(k, [v]); };
    for (const s of sf.shots) { put(byTeam, s[Fx.team], s); put(byOpp, s[Fx.opp], s);
      put(byCode, s[Fx.code], s); }
    return { byTeam, byOpp, byCode, teams: sf.legend.teams, fields: Fx,
             calib: sf.calib, positions: {}, season };
  };
  const LIVE = "2026/27";
  const run = async idx => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => { root.render(React.createElement(Teams, {
      teams: J("teams.json"), teamForm: J("team_form.json"), luck: J("luck.json"),
      teamShots: J("team_shots.json"), bsdTeams: J("bsd_teams.json"),
      fixtures: realFix, shotIndex: idx, seasonLabel: LIVE })); });
    /* Smellum a lid sem A skot i kortinu — annars er blokkin ekki teiknud
       og allt sem a eftir kemur vaeri tomt (og thvi thogult graent).     */
    const target = sf.legend.teams.find(t => t === "ARS") || sf.legend.teams[0];
    const cells = [...host.querySelectorAll("tbody td")]
      .filter(td => (td.textContent || "").includes(target));
    if (cells.length) await act(async () => {
      cells[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });
    return { host, root, text: host.textContent || "", target };
  };

  const a = await run(mk("2025/26"));
  ok(`forsenda: lifandi syn er valin og haus hennar ber ${LIVE}`,
    a.text.includes(LIVE), a.text.slice(0, 120));
  ok("forsenda: skotakortin ERU teiknud (annars er allt her ad nedan thogult)",
    /shot maps/.test(a.text) && a.host.querySelectorAll("svg").length > 0,
    `${a.host.querySelectorAll("svg").length} svg`);
  /* FULLYRDINGIN ER A HAUSNUM SJALFUM, EKKI A "2025/26 er einhvers stadar
     i textanum". Sidari utgafan var SONN af vidvorunar-kassanum einum, svo
     hun gat ekki greint hausinn i sundur — nakvaemlega "fullyrding sem
     tvennt getur uppfyllt" (CLAUDE.md 13).                              */
  ok("HAUS kortsins nefnir sitt eigid timabil (2025/26), hann thegir ekki",
    /shot maps\s*2025\/26\s*·/.test(a.text),
    a.text.match(/shot maps[^]{0,90}/)?.[0] || "");
  ok("og OSAMRAEMID er sagt berum ordum, ekki latid liggja",
    /not the same season/.test(a.text),
    a.text.match(/These maps are[^]{0,110}/)?.[0] || "");
  ok("skyringin nefnir BAEDI timabilin", /These maps are 2025\/26/.test(a.text)
    && new RegExp(`table above is ${LIVE.replace("/", "\\/")}`).test(a.text),
    a.text.match(/These maps are[^]{0,110}/)?.[0] || "");
  await act(async () => { a.root.unmount(); }); a.host.remove();

  /* GAMLA HEGDUNIN ER VARDVEITT ThEGAR SVIDID VANTAR: eldri skra i cache
     ber ekkert `season`, og THA er thogn afram retta svarid. Ad fullyrda
     "2025/26" thar vaeri agiskun i buningi maelingar.                   */
  const b = await run(mk(undefined));
  ok("forsenda: kortin eru teiknud lika an `season`-svidsins",
    /shot maps/.test(b.text) && b.host.querySelectorAll("svg").length > 0);
  ok("an `season` er THAGAD (engin timabils-fullyrding, engin vidvorun)",
    !/not the same season/.test(b.text) && !/These maps are/.test(b.text));
  await act(async () => { b.root.unmount(); }); b.host.remove();
}

/* ============================================================
   4d) SIDASTI SPOLURINN: `bsd_live.team_matches` -> xG OG xGC I LIFANDI SYN

   VILLAN SEM VAR (24.8.2026): `teamstats.js` bar BADI `aggLiveMatchRange`
   OG jafngildis-vordinn i kafla 12g, og `fetch.mjs` skrifadi rodina — en
   `App.jsx` sendi `bsdLive` ALDREI inn i `<Teams>` og `Teams.jsx` nefndi
   `liveMatches` hvergi. Dalkarnir hefdu thvi stadid TOMIR thott
   pipeline-an skrifadi gognin, og lesist eins og "BSD vantar" i stad
   "vid gleymdum ad tengja". Nakvaemlega su villa sem `lineups.json` er
   nefnd fyrir i CLAUDE.md 7.1.

   FULLYRDINGIN ER DELTA, EKKI ASTAND: SAMA teikning an `bsdLive` verdur
   ad gefa TOMT og med henni TOLUR. Fost fullyrding ("dalkurinn ber tolu")
   vaeri sonn af ollum odrum astaedum lika.
   ============================================================ */
console.log("\n4d) `bsd_live.team_matches` -> xG/xGC I LIFANDI SYN");
{
  const { default: Teams } = await import("../src/Teams.jsx");
  /* RADIRNAR ERU BYGGDAR UR RAUNVERULEGU URSLITUNUM, EKKI FUNDNAR UPP.
     `routeInStep` krefst >= 8 klubba OG ad mork/leik stemmi vid tofluna
     (`maxGoalGap` 0,10) — einn tilbuinn leikur gefur `checked = 2` og
     fellur, sem er RETT hegdun heimildarinnar og ekki villa i henni.
     Vid speglum thvi thad sem pipeline-an skrifar i raun: eina rod per
     LEIKINN leik med rettum morkum baðum megin. xG er tilbuid (skotin eru
     ekki i `fixtures.json`) og ThAD ER EINMITT ThAD SEM ER MAELT — ad
     talan RATI ALLA LEID a skjainn.                                     */
  const shortById = new Map((J("teams.json").teams || []).map(t => [t.id, t.short]));
  const XG_H = 2.4, XG_A = 0.7;
  const LIVE_MATCHES = realFix
    .filter(f => (f.finished === true || f.finished_provisional === true)
              && f.team_h_score != null && f.team_a_score != null)
    .map((f, i) => ({ id: i + 1, gw: f.event,
      home: { team: shortById.get(f.team_h) ?? null, xg: XG_H, shots: 15, bc: 3,
              goals: f.team_h_score },
      away: { team: shortById.get(f.team_a) ?? null, xg: XG_A, shots: 6, bc: 1,
              goals: f.team_a_score } }));
  ok(`forsenda: ${LIVE_MATCHES.length} leikja-radir byggdar ur raunurslitum`,
    LIVE_MATCHES.length >= 5 && LIVE_MATCHES.every(m => m.home.team && m.away.team),
    `${LIVE_MATCHES.length} radir`);
  /* Lid sem spiladi HEIMA i thessum gognum — tha er xGC thess = xG utilidsins. */
  const homeShort = LIVE_MATCHES[0].home.team;
  const draw = async bsdLive => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => { root.render(React.createElement(Teams, {
      teams: J("teams.json"), teamForm: J("team_form.json"), luck: J("luck.json"),
      teamShots: J("team_shots.json"), bsdTeams: J("bsd_teams.json"),
      fixtures: realFix, shotIndex: null, bsdLive, seasonLabel: "2026/27" })); });
    /* BADAR TEIKNINGAR ERU FAERDAR I SAMA FLOKK — annars vaeri thetta ekki
       delta heldur samanburdur a TVEIMUR OLIKUM TOFLUM. Sjalfgefni
       flokkurinn ER nefnilega ANNAR eftir thvi hvort skota-heimildin hefur
       gogn (CLAUDE.md: "notandinn lendir ekki a tomum flokki"), og ThAD ER
       RETT hegdun — hun er meira ad segja sjalfstaed vísbending um ad
       tengingin virki, en hun ma ekki rugla thessa maelingu.            */
    const catBtn = [...host.querySelectorAll("button")]
      .find(b => /^Defence$/.test((b.textContent || "").trim()));
    if (catBtn) await act(async () => {
      catBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });
    /* Rod heimalidsins, og hvad stendur i xGC-dalkinum. */
    const head = [...host.querySelectorAll("thead th")].map(t => t.textContent.trim());
    const iXgc = head.findIndex(h => /^xGC tot/.test(h));
    const row = [...host.querySelectorAll("tbody tr")]
      .find(tr => (tr.querySelector("td")?.textContent || "").includes(homeShort));
    const cell = i => i >= 0 && row ? (row.querySelectorAll("td")[i]?.textContent || "").trim() : null;
    const out = { xgc: cell(iXgc), iXgc, has: !!row };
    await act(async () => { root.unmount(); }); host.remove();
    return out;
  };
  const off = await draw(null);
  const on = await draw({ team_matches: LIVE_MATCHES });
  ok(`forsenda: xGC-dalkurinn er a skjanum og ${homeShort}-rodin finnst`,
    on.iXgc >= 0 && on.has, `iXgc=${on.iXgc} row=${on.has}`);
  ok(`AN \`bsdLive\`: xGC er TOMT ("${off.xgc}")`, !/\d/.test(off.xgc || ""));
  ok(`MED \`bsd_live.team_matches\`: xGC ber TOLU ("${on.xgc}")`, /\d/.test(on.xgc || ""));
  /* xGC ER KJARNI KAERUNNAR ("Afhverju fae eg ekki xGC a lid?") — hun er
     summa MOTHERJANNA og verdur ALDREI reiknud ur per-leikmanns summum.
     Talan verdur thvi ad vera xG ANDSTAEDINGSINS (0,7), ekki thess sjalfs
     (2,4). Vaeri hun 2,4 vaeri rodin tengd en SNUIN.                     */
  ok(`og xGC ${homeShort} er xG MOTHERJANS (${XG_A}), ekki thess sjalfs (${XG_H}): "${on.xgc}"`,
    /0[.,]7/.test(on.xgc || "") && !/2[.,]4/.test(on.xgc || ""));
}

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
    .find(b => b.textContent.trim() === GK_GROUP);
  ok(`markvardar-flokkurinn finnst (${JSON.stringify(GK_GROUP)})`, !!gk);
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

/* ============================================================
   7) TIMABILS-MISVISIRINN A SKJANUM (21.8.2026)

   TVAER ThOGLAR VILLUR SEM ENGIN VORN GAT SED, badar dagsettar a somu
   framtid — daginn sem taflan synir 2026/27 en BSD-skrarnar eru enn
   2025/26 (thaer eru skrifadar af HANDVIRKUM skriftum):

   a) `bsd_teams.json` var BIRT AN ThESS ad nokkud spyrdi hvada timabil hun
      ber, svo xG/xGC/big chances hefdu stadid undir morkum ur ODRU
      timabili — i HEILU-TIMABILS-UTSYNINU, an merkis. `routeInStep` var
      adeins a bils-leidinni. `season_locked` bar flaggid sem atti ad
      svara thessu og VAR DAUTT (0 lesendur i `src/`).
   b) TVEIR strengir "2025/26" voru HARDKODADIR i haus skotakortsins.

   KAFLINN LES BADAR AF SKJANUM. Fullyrdingarnar eru allar TVISKIPTAR:
   fyrst rett astand (timabilin i takt -> tolur, og ekkert varnadar-orð),
   svo misvisirinn (tolur horfnar OG skyringin komin). Fullyrding sem
   adeins ser misvisinn getur ekki greint hann fra flipa sem er alltaf tomur.
   ============================================================ */
console.log("\n7) TIMABILS-MISVISIRINN — tolur horfnar OG skyringin a skjanum");
{
  const { default: Teams } = await import("../src/Teams.jsx");
  const { TEAM_STAT_DEFS } = await import("../src/teamstats.js");
  const sf = J("bsd_shots.json");
  const Fx = Object.fromEntries(sf.legend.fields.map((f, i) => [f, i]));
  const mkIndex = shots => {
    const byTeam = new Map(), byOpp = new Map(), byCode = new Map();
    const put = (m, k, v) => { if (k == null) return; const a = m.get(k); a ? a.push(v) : m.set(k, [v]); };
    for (const s of shots) { put(byTeam, s[Fx.team], s); put(byOpp, s[Fx.opp], s);
      put(byCode, s[Fx.code], s); }
    return { byTeam, byOpp, byCode, teams: sf.legend.teams, fields: Fx,
             calib: sf.calib, positions: {} };
  };
  const full = mkIndex(sf.shots);
  const LOCKED = TEAM_STAT_DEFS.filter(d => d.season_locked);
  const base = { teams: J("teams.json"), teamForm: J("team_form.json"), luck: J("luck.json"),
    teamShots: J("team_shots.json"), fixtures: realFix };

  const render = async props => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const r = createRoot(host);
    await act(async () => { r.render(React.createElement(Teams, props)); });
    await act(async () => { await new Promise(x => setTimeout(x, 60)); });
    return { host, r, done: async () => { await act(async () => { r.unmount(); }); host.remove(); } };
  };
  /* Flokkurinn sem BER flesta `season_locked`-dalka er varnar-flokkurinn
     (xGC, GC-xGC) — hann er valinn BERUM ORDUM svo fullyrdingarnar mæli
     dalka sem eru raunverulega a skjanum og ekki tomt mengi.            */
  const pickGroup = async (host, name) => {
    const b = [...host.querySelectorAll("button")].find(x => x.textContent.trim() === name);
    if (b) await act(async () => { b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    await act(async () => { await new Promise(x => setTimeout(x, 40)); });
    return !!b;
  };
  const numsIn = host => [...host.querySelectorAll("tbody td")]
    .filter(td => /^-?\d+(\.\d+)?$/.test(td.textContent.trim())).length;

  /* ---- 7a. I TAKT: tolur a skjanum og ENGINN varnadur ---- */
  const inStep = await render({ ...base, bsdTeams: J("bsd_teams.json"), shotIndex: full });
  /* SAMA GILDRA, SAMI KAFLI: hardkodad 7. Krafan er ad mengid se NAKVAEMLEGA
     BSD-dalkarnir — thad er eiginleikinn sem `season_locked` a ad bera —
     en ekki hve margir their eru i dag.                                   */
  const BSD_COLS = TEAM_STAT_DEFS.filter(d => d.src === "BSD");
  ok(`${LOCKED.length} dalkar bera \`season_locked\` og thad eru nakvaemlega `
     + `BSD-dalkarnir (${BSD_COLS.length}) (forsenda)`,
     LOCKED.length > 0
     && LOCKED.map(d => d.key).sort().join(",") === BSD_COLS.map(d => d.key).sort().join(","),
     `locked=${LOCKED.map(d => d.key).sort().join(",")} bsd=${BSD_COLS.map(d => d.key).sort().join(",")}`);
  ok("varnar-flokkurinn valinn", await pickGroup(inStep.host, "Defence"));
  const okNums = numsIn(inStep.host);
  ok(`i takt: taflan ber tolur (${okNums} holf med tolu)`, okNums >= 40, `${okNums}`);
  const tIn = inStep.host.textContent || "";
  ok("og ENGIN varnadar-malsgrein um timabil er a skjanum",
    !/columns are empty here on purpose/.test(tIn));
  /* TOOLTIP-SETNINGIN ER LIKA FJARRI — hun er annad lag a somu akvordun. */
  const titlesOf = host => [...host.querySelectorAll("thead th")]
    .map(th => th.getAttribute("title") || "");
  ok("og enginn haus lofar tomu holfi", !titlesOf(inStep.host)
    .some(t => /Empty in this view on purpose/.test(t)));
  await inStep.done();

  /* ---- 7b. UR TAKTI: SAMA SKRA, adeins timabils-strengurinn breyttur ----
     ThAD ER MAELINGIN: engin onnur inntok haggast, svo utkoman getur ekki
     verid annad en timabils-samanburdurinn.
     `shotIndex: null` thvi skotakortid BJARGAR dalkunum thegar thad er i
     takt (og thad er rett) — her er spurt um tilfellid thar sem ENGIN
     BSD-leid er i takt, sem er thad eina thar sem engin rett tala er til. */
  const bsdStale = { ...J("bsd_teams.json"), season: "2026/27" };
  const outStep = await render({ ...base, bsdTeams: bsdStale, shotIndex: null });
  ok("varnar-flokkurinn valinn (ur takti)", await pickGroup(outStep.host, "Defence"));
  ok("ur takti: flipinn er ENN teiknadur (20 radir) — hann tæmist ekki allur",
    outStep.host.querySelectorAll("tbody tr").length === 20,
    `${outStep.host.querySelectorAll("tbody tr").length}`);
  const tOut = outStep.host.textContent || "";
  ok("VARNADURINN ER A SKJANUM (ekki adeins i tooltip-i)",
    /columns are empty here on purpose/.test(tOut));
  ok("og hann NEFNIR BADA timabilin berum ordum (2026/27 og 2025-26)",
    tOut.includes("2026/27") && tOut.includes(J("team_form.json").season),
    tOut.match(/covers[^]{0,90}/)?.[0] || "");
  ok("hver `season_locked`-dalkur er TOMUR i toflunni (— og ekki 0)",
    LOCKED.every(d => {
      const i = [...outStep.host.querySelectorAll("thead th")]
        .findIndex(th => th.textContent.replace(/[↑↓]/g, "").trim() === d.short);
      if (i < 0) return true;                        // ekki i thessum flokki
      return [...outStep.host.querySelectorAll("tbody tr")].every(tr =>
        (tr.children[i]?.textContent || "").trim() === "—");
    }), "eitthvad holf ber tolu");
  /* OG E0-DALKARNIR BERA TOLUR AFRAM — annars vaeri "tomt" svarid vid
     rongu spurningu og fullyrdingin ad ofan gaeti stadid a hvitum skja. */
  ok("en E0-dalkarnir (GC, CS %) bera TOLUR afram",
    [...outStep.host.querySelectorAll("tbody td")]
      .filter(td => /^\d+(\.\d+)?$/.test(td.textContent.trim())).length >= 25,
    `${[...outStep.host.querySelectorAll("tbody td")]
      .filter(td => /^\d+(\.\d+)?$/.test(td.textContent.trim())).length}`);
  ok("og hausar theirra dalka LOFA tomu holfi i tooltip-inu",
    titlesOf(outStep.host).filter(t => /Empty in this view on purpose/.test(t)).length >= 1,
    `${titlesOf(outStep.host).filter(t => /Empty in this view on purpose/.test(t)).length}`);
  await outStep.done();

  /* ---- 7c. SKOTAKORTS-HAUSINN — TIMABILID ER LEITT, EKKI HARDKODAD ----
     Fullyrdingin er MUTATION I INNTAKINU: `teamForm.season` er sett a tolu
     sem er ekki i neinni skra ("1999-00"), og hausinn VERDUR ad fylgja
     henni. Hardkodadur strengur getur ekki stadist thad, og thad er
     einmitt thad sem stod her.                                          */
  {
    const shown = async (tf) => {
      const v = await render({ ...base, teamForm: tf, bsdTeams: J("bsd_teams.json"),
        shotIndex: full });
      /* FYRRA TIMABIL ER VALID BERUM ORDUM (24.8.2026). Sjalfgildid vard
         "live" 22.8. og thar er `shotIndex` sendur sem `null` i `use`, svo
         `use.shots` er false og `shotSeason` thvi null — hausinn nefnir
         ekkert timabil OG mutation-fullyrdingin nedar getur ekki fallid,
         thvi hun ber saman tvo tom svor. Spurningin i thessum kafla er um
         SKOTAKORTID, sem er 2025/26 eitt, og hun er thvi spurd i theirri
         syn sem kortid a heima i. Kafli 8 spyr um lifandi synina.      */
      ok("forsenda: fyrra timabil valid i fellilistanum (7c)",
         await pickSeason("prev", v.host));
      const cell = [...v.host.querySelectorAll("tbody td")]
        .find(td => /ARS|AVL|LIV/.test(td.textContent));
      if (cell) await act(async () => {
        cell.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      });
      await act(async () => { await new Promise(x => setTimeout(x, 60)); });
      const t = v.host.textContent || "";
      await v.done();
      return t;
    };
    const real = J("team_form.json");
    const t1 = await shown(real);
    ok("smellur a lidsnafn opnar skotakortin (POSITIV forsenda)",
      /shot maps/.test(t1) && /bubble size = xG/.test(t1), t1.slice(0, 0) || "engin kort");
    ok(`hausinn ber timabil toflunnar (${real.season})`,
      t1.includes(`${real.season} · bubble size = xG`),
      t1.match(/shot maps[^]{0,60}/)?.[0] || "");
    ok("og skyringar-linan nefnir sama timabil",
      t1.includes(`The shot map covers ${real.season} only`));
    /* MUTATION: timabil sem er i ENGRI skra. Hardkodad "2025/26" hefdi
       birst afram og fullyrdingin fellur.                               */
    const t2 = await shown({ ...real, season: "1999-00" });
    ok("MUTATION: annad timabil i `teamForm` -> hausinn FYLGIR (1999-00)",
      t2.includes("1999-00 · bubble size = xG") && !/2025\/26 · bubble/.test(t2),
      t2.match(/shot maps[^]{0,60}/)?.[0] || "");
    /* OG SE KORTID EKKI I TAKT ER EKKERT TIMABIL NEFNT. Skotakort sem
       naer adeins til GW5 telur 5 leiki per lid a moti 38 i toflunni, svo
       taktprofid hafnar thvi — og THA er timabil kortsins okunnugt.     */
    const shortIdx = mkIndex(sf.shots.filter(s => s[Fx.gw] <= 5));
    const v3 = await render({ ...base, bsdTeams: J("bsd_teams.json"), shotIndex: shortIdx });
    const cell3 = [...v3.host.querySelectorAll("tbody td")]
      .find(td => /ARS|AVL|LIV/.test(td.textContent));
    if (cell3) await act(async () => {
      cell3.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    });
    await act(async () => { await new Promise(x => setTimeout(x, 60)); });
    const t3 = v3.host.textContent || "";
    ok("kort UR TAKTI: kortin birtast samt (POSITIV forsenda)", /shot maps/.test(t3));
    ok("en ThA er EKKERT timabil nefnt (thogn, ekki agiskun)",
      /The shot map covers a single season/.test(t3)
      && !/\d{4}[-/]\d\d · bubble size/.test(t3),
      t3.match(/shot maps[^]{0,60}/)?.[0] || "");
    await v3.done();
  }
}

/* ============================================================
   8) TIMABILS-VALID — YFIRSTANDANDI TIMABIL UR LEIKJASKRANNI

   Beidni notandans 22.8.2026: "eg vill ad Teams stats bjodi upp a nyjasta
   season, ad eg geti valid thad og tha bara skodad GW1 nuna". Toflan las
   adeins `team_form.json`, sem er FYRRA timabil (E0-skra 2026/27 verdur
   ekki til fyrr en tímabilid er komid af stad), svo yfirstandandi timabil
   atti enga leid inn.

   ThRJAR KROFUR OG SU SIDASTA ER SU SEM AUDVELDAST ER AD KLUDRA:
   1. Valid VIRKAR — tolurnar breytast, thaer eru ekki sama syn med nyju
      merkimida.
   2. ThAD SEM ER EKKI TIL ER TOMT, EKKI NULL. Skot og xG koma ur heimildum
      sem na adeins yfir fyrra timabil.
   3. NOTANDINN LENDIR EKKI A TOMUM FLOKKI. Sjalfgefni flokkurinn er
      skota-drifinn ad ollu leyti, svo an vals-leidréttingar syndi
      smellurinn TIU dalka af "—" og skyringu fyrir nedan — satt, og
      gagnslaust.
   ============================================================ */
console.log("\n8) TIMABILS-VALID — yfirstandandi timabil");
{
  const { default: Teams } = await import("../src/Teams.jsx");
  const sf8 = J("bsd_shots.json");
  const F8 = Object.fromEntries(sf8.legend.fields.map((f, i) => [f, i]));
  const bt8 = new Map(), bo8 = new Map();
  const put8 = (m, k, v) => { if (k == null) return; const a = m.get(k); a ? a.push(v) : m.set(k, [v]); };
  for (const x of sf8.shots) { put8(bt8, x[F8.team], x); put8(bo8, x[F8.opp], x); }
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root8 = createRoot(host);
  await act(async () => { root8.render(React.createElement(Teams, {
    teams: J("teams.json"), teamForm: J("team_form.json"), luck: J("luck.json"),
    teamShots: J("team_shots.json"), fixtures: J("fixtures.json"),
    bsdTeams: J("bsd_teams.json"),
    shotIndex: { byTeam: bt8, byOpp: bo8, teams: sf8.legend.teams, fields: F8, calib: sf8.calib },
    seasonLabel: "2026/27", Crest: () => null })); });
  await act(async () => { await new Promise(r => setTimeout(r, 200)); });

  const btns = () => [...host.querySelectorAll("button")];
  const heads = () => [...host.querySelectorAll("thead th")].map(h => h.textContent.trim());
  const rowOf = short => {
    const tr = [...host.querySelectorAll("tr")].find(r => (r.textContent || "").startsWith(short));
    return tr ? [...tr.querySelectorAll("th,td")].map(c => c.textContent.trim()) : null;
  };
  /* RODUNAR-ORIN ER HLUTI AF HAUS-TEXTANUM ("Shots ↑"), svo bein
     jafngilding a heiti brast um leid og rodunin faerdist a thann dalk —
     fullyrdingin var tha `undefined` af RANGRI astaedu. Orin er strippud;
     hun er birting a rodun, ekki hluti af heiti dalksins.               */
  const norm = t => String(t).replace(/[↑↓]/g, "").trim();
  const cell = (short, head) => { const i = heads().map(norm).indexOf(norm(head));
    const r = rowOf(short); return i >= 0 && r ? r[i] : undefined; };
  const click = async b => { await act(async () => {
      b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    await act(async () => { await new Promise(r => setTimeout(r, 120)); }); };

  /* VALARINN ER FELLILISTI FRA 25.8.2026. Valkostirnir eru fundnir eftir
     GILDI (`prev`/`live`), ekki eftir timabils-tolu — sama regla og adur:
     "2025-26" og "2026/27 · 10 matches" ureldast badir i agust.         */
  const optOf = v => seasonOpts(host).find(o => o.value === v);
  const prevOpt = optOf("prev"), liveOpt = optOf("live");
  ok(`badir timabils-valkostir a skjanum `
     + `(${JSON.stringify(prevOpt?.textContent)} / ${JSON.stringify(liveOpt?.textContent)})`,
     !!prevOpt && !!liveOpt);
  /* MERKIMIDINN BER KOSTNADINN. "10 matches" er ekki skraut: lifandi synin er
     eitt-leiks urtak i dag og notandinn a ad sja thad ADUR en hann les
     toluna. ThETTA MATTI EKKI TAPAST I SKIPTUNUM UR HNOPPUM I FELLILISTA. */
  ok(`lifandi valkosturinn ber LEIKJAFJOLDANN: ${JSON.stringify(liveOpt?.textContent)}`,
     /\d+ matches/.test(liveOpt?.textContent || ""));

  /* SJALFGEFNA SYNIN ER YFIRSTANDANDI TIMABIL (22.8.2026, ad beidni:
     "eg vill hafa nyjasta timabilid auto valid allstadar"). ThAD ER
     FULLYRT HER OG EKKI GEFID SER: kaflinn hafdi ThOGULT byggt a hinu
     sjalfgildinu — hann las `prevShots` STRAX eftir teikningu — og fell
     24.8. thegar sjalfgildinu var snuid. Fullyrding er betri en forsenda
     sem enginn skrifadi nidur.
     MERKID ER HEGDUN, EKKI STILL: skyringar-linan "This season so far …"
     er teiknud ADEINS thegar `liveOn` er satt.                          */
  ok("sjalfgefid er YFIRSTANDANDI timabil (skyringar-linan er a skjanum)",
     /This season so far: \d+ matches played/.test(host.textContent || ""));

  /* FORSENDA: fyrra timabil ber tolur i skota-flokknum. An hennar gaeti
     "tomt eftir smell" thytt "alltaf tomt". Fyrra timabil er nu VALID —
     og skota-flokkurinn med, thvi vals-leidrettingin faerir mann UT UR
     honum vid opnun (hann er tomur i lifandi syn), svo "Shots" er ekki
     endilega i hausnum thegar hingad er komid.                          */
  ok("forsenda: fyrra timabil valid (kafli 8)", await pickSeason("prev", host));
  const keepBtn0 = btns().find(b => (b.textContent || "").trim() === GK_GROUP);
  ok(`forsenda: skota-flokks hnappurinn finnst vid opnun`, !!keepBtn0);
  if (keepBtn0) await click(keepBtn0);
  const prevShots = cell("ARS", "Shots");
  ok(`forsenda: fyrra timabil ber skot-tolu (ARS ${prevShots})`,
     !!prevShots && prevShots !== "—");

  ok("forsenda: yfirstandandi timabil valid (kafli 8)", await pickSeason("live", host));

  /* 3 — EKKI TOMUR FLOKKUR. Vid erum nu i flokki sem BER tolur.          */
  const shown = heads().slice(1);
  const arsRow = rowOf("ARS") || [];
  const nums = arsRow.slice(1).filter(v => v && v !== "—").length;
  ok(`eftir smell er flokkurinn sem birtist EKKI tomur `
     + `(${nums} af ${shown.length} dalkum bera tolu: ${shown.join(",")})`, nums > 0);

  /* 1 — TOLURNAR ERU ADRAR. ARS: 38 leikir i fyrra, 1 nuna.             */
  const m = cell("ARS", "Matches");
  ok(`ARS ber 1 leik i yfirstandandi timabili (fekk ${JSON.stringify(m)})`, m === "1");
  ok(`og raunveruleg urslit GW1: mork a sig ${cell("ARS", "GC tot")}, CS ${cell("ARS", "CS %")}%`,
     cell("ARS", "GC tot") === "0" && cell("ARS", "CS %") === "100");
  /* Nylidi sem VAR ekki til i fyrra timabili ber nu tolu — thad er einmitt
     munurinn a syninni.                                                  */
  ok(`nylidi (COV) ber tolu i yfirstandandi timabili, ekki "—" (${cell("COV", "Matches")})`,
     cell("COV", "Matches") === "1");

  /* 2 — ThAD SEM ER EKKI TIL ER TOMT. xGC kemur ur BSD (2025/26 eitt).   */
  ok(`xGC er TOMT i yfirstandandi timabili (${cell("ARS", "xGC")} / ${cell("ARS", "xGC tot")})`,
     cell("ARS", "xGC tot") === "—" && cell("ARS", "xGC") === "—");
  /* OG ThAD SAMA UM SKOTIN — E0-hlidin. `fixtures.json` ber ENGIN skot, svo
     hver skota-dalkur verdur ad vera "—". Stokkbreyting sem setti
     `shots_pg: 0` i lifandi rodina SLAPP i gegn medan adeins xGC var
     fullyrt: xGC kemur ur BSD og var afram tomt, svo fullyrdingin sa
     ekkert. Vid profum thvi BADAR heimildirnar, ekki adra.              */
  const shotGroupBtn = btns().find(b => b.textContent.trim() === GK_GROUP);
  if (shotGroupBtn) {
    await click(shotGroupBtn);
    const r = (rowOf("ARS") || []).slice(1);
    ok(`skota-dalkarnir eru ALLIR tomir i lifandi syn (${r.length} dalkar: `
       + `${[...new Set(r)].join(",")})`,
       r.length > 0 && r.every(v => v === "—"));
    /* Og flokkurinn hoppar aftur ur honum thegar hann er tomur — annars
       vaeri vals-leidrettingin ekki i gildi eftir handvirkt val.        */
  }
  const body = () => host.textContent || "";
  ok("og skyringin segir hve margir leikir liggja ad baki",
     /This season so far: \d+ matches played/.test(body()));
  ok("og HVERS VEGNA skota-dalkarnir eru tomir", /only cover/.test(body()));
  ok("engin NaN/undefined a skjanum", !/\bNaN\b|\bundefined\b/.test(body()));

  /* AFTUR TIL BAKA: fyrra timabil ma ekki hafa breyst.                   */
  ok("forsenda: aftur i fyrra timabil (kafli 8)", await pickSeason("prev", host));
  /* AFTUR I VARNAR-FLOKKINN FYRST. Kaflinn hoppadi i skota-flokkinn hér
     ofar til ad sanna ad hann se tomur, og "Matches" er ekki i honum — an
     thessa maeldi lokafullyrdingin `undefined` og var raud af rangri
     astaedu. Su bilun var RETT: fullyrding um timabil ma ekki hanga a thvi
     hvada flokkur var sidast valinn.                                    */
  const defBtn = btns().find(b => b.textContent.trim() === "Defence");
  if (defBtn) await click(defBtn);
  ok(`til baka i fyrra timabil: ARS ber 38 leiki aftur (${cell("ARS", "Matches")})`,
     cell("ARS", "Matches") === "38");
  /* OG SKOTIN ERU KOMIN AFTUR — annars gaeti "38" thytt ad synin haefi
     einfaldlega frosid i sidasta astandi.                               */
  const keepBtn2 = btns().find(b => (b.textContent || "").trim() === GK_GROUP);
  ok(`forsenda: skota-flokks hnappurinn finnst (${btns().filter(b => TEAM_GROUPS.some(g => g.label === (b.textContent || "").trim())).map(b => JSON.stringify(b.textContent.trim())).join(",")})`,
     !!keepBtn2);
  if (keepBtn2) { await click(keepBtn2);
    ok(`og skota-tolurnar eru komnar aftur (ARS ${cell("ARS", "Shots")}, `
       + `hausar: ${heads().slice(1, 4).join(",")})`,
       cell("ARS", "Shots") === prevShots); }
}

/* ============================================================
   8b) TIMABILS-SKIPTI HREINSA UMFERDAR-BILID (25.8.2026)

   `setGwRange(null)` fylgdi badum gomlu hnoppunum og matti ekki tapast
   thegar their urdu ad fellilista. An thess situr bil sem var valid i EINU
   timabili ofan a hinu: GW30-38 i syn sem hefur spilad eina umferd gefur
   "—" i hverjum einasta dalki, og EKKERT a skjanum segir hvers vegna —
   thad les eins og "engin gogn" thegar thad thydir "thu ert ad skoda
   umferdir sem eru ekki komnar".

   8c) OG VALARINN SEGIR ThAD SEM ER A SKJANUM, EKKI ThAD SEM VAR VALID.
   `value` er styrt af `liveOn`, ekki af hraa `season`-astandinu. Se ekkert
   spilad fellur synin i fyrra timabil af sjalfu ser, og tha ma valarinn
   ekki standa merktur "this season" ofan a fyrra-timabils tolum — sama
   regla og red upplysta hnappnum adur.
   ============================================================ */
console.log("\n8b) TIMABILS-SKIPTI HREINSA BILID — og valarinn ber ThAD SEM ER A SKJANUM");
{
  const { default: Teams } = await import("../src/Teams.jsx");
  const sfB = J("bsd_shots.json");
  const FB = Object.fromEntries(sfB.legend.fields.map((f, i) => [f, i]));
  const btB = new Map(), boB = new Map();
  const putB = (m, k, v) => { if (k == null) return; const a = m.get(k); a ? a.push(v) : m.set(k, [v]); };
  for (const x of sfB.shots) { putB(btB, x[FB.team], x); putB(boB, x[FB.opp], x); }
  const idxB = { byTeam: btB, byOpp: boB, teams: sfB.legend.teams, fields: FB, calib: sfB.calib };
  const mount = async props => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const r = createRoot(host);
    await act(async () => { r.render(React.createElement(Teams, props)); });
    await act(async () => { await new Promise(x => setTimeout(x, 140)); });
    return { host, r, done: async () => { await act(async () => { r.unmount(); }); host.remove(); } };
  };
  const base = { teams: J("teams.json"), teamForm: J("team_form.json"), luck: J("luck.json"),
    teamShots: J("team_shots.json"), bsdTeams: J("bsd_teams.json"),
    seasonLabel: "this season", Crest: () => null };

  const v = await mount({ ...base, fixtures: realFix, shotIndex: idxB });
  ok("forsenda: fyrra timabil valid", await pickSeason("prev", v.host));
  const bx = () => [...v.host.querySelectorAll("[aria-label='Select gameweeks'] button")];
  ok(`forsenda: umferdar-kassarnir eru virkir i fyrra timabili (${bx().length})`,
     bx().length >= 38 && bx().every(b => !b.disabled));
  const clickBox = async i => { await act(async () => {
      bx()[i].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    await act(async () => { await new Promise(x => setTimeout(x, 80)); }); };
  await clickBox(29); await clickBox(37);
  ok("forsenda: bil GW 30-38 er valid", /GW\s*30[–-]38/.test(v.host.textContent || ""),
     (v.host.textContent || "").match(/GW\s*\d+[–-]\d+/)?.[0] || "ENGIN");
  ok("forsenda: skipt yfir i yfirstandandi timabil", await pickSeason("live", v.host));
  ok("TIMABILS-SKIPTI HREINSA BILID — hausinn segir aftur 'full season'",
     /teams · full season/.test(v.host.textContent || "")
     && !/GW\s*30[–-]38/.test(v.host.textContent || ""),
     (v.host.textContent || "").match(/teams · [^\n]{0,20}/)?.[0] || "ENGIN");
  await v.done();

  /* 8c — ENGINN LOKINN LEIKUR: `liveForm` er null, svo synin FELLUR i fyrra
     timabil thott sjalfgildid heiti "live". Valarinn verdur ad segja ThAD. */
  const noResults = realFix.map(f => ({ ...f, finished: false, finished_provisional: false,
    started: false, team_h_score: null, team_a_score: null }));
  const w = await mount({ ...base, fixtures: noResults, shotIndex: idxB });
  ok(`forsenda: byggt astand — 0 loknir leikir af ${noResults.length}`,
     noResults.every(f => !f.finished && !f.finished_provisional));
  const selW = seasonSel(w.host);
  ok(`valarinn stendur a FYRRA timabili thott sjalfgildid heiti "live" `
     + `(value=${JSON.stringify(selW?.value)})`, !!selW && selW.value === "prev");
  ok("og lifandi valkosturinn er SLOKKTUR med skyringu, ekki horfinn",
     seasonOpts(w.host).length === 2
     && seasonOpts(w.host)[1].disabled === true
     && /no matches yet/.test(seasonOpts(w.host)[1].textContent || ""),
     seasonOpts(w.host).map(o => `${o.value}:${o.disabled}:${o.textContent.trim()}`).join(" | "));
  await w.done();
}

/* ============================================================
   9) FORM-MERKID A SKJANUM — OG ThAD BER ENGAN TEXTA (25.8.2026)

   Reikningurinn er profadur i `team-stats.mjs` kafla 16 (sextill, urtaks-
   gatt, ein heimild baedi megin, einangrun fra likaninu). HER ER SPURT UM
   ThRENNT SEM ADEINS SEST A SKJANUM:

   1. RATAR MERKID ALLA LEID? Fall sem skilar rettri Map en er aldrei
      teiknad er nakvaemlega `bsd_live`-villan fra 24.8. („vid gleymdum ad
      tengja"), svo fullyrdingin er DELTA: lifandi syn (ein umferd spilud,
      merkid slokkt) a moti fyrra timabili (fullt timabil, merkid virkt).
   2. BER ThAD ENGAN TEXTA? ThETTA ER RENDER-HAETTAN. `team-gw.mjs` finnur
      radir med `textContent.startsWith(short)` og `cells[0].slice(0,3)`,
      svo EMOJI a undan skammstofuninni hefdi brotid hverja einustu
      uppflettingu i thessu safni — og verra: `find` hefdi skilad
      `undefined` an thess ad kasta, svo kaflarnir hefdu ThAGNAD. Krafan er
      thvi ad merkta holfid beri NAKVAEMLEGA sama texta og omerkt holf:
      skammstofun + nafn, ekkert annad.
   3. HEFUR ThAD NAFN? Tacn an nafns er thraut en ekki lykill (sama rok og
      best/worst-flisarnar), og lykillinn verdur ad NEFNA GLUGGANN — merki
      sem segir "heitt" an thess ad segja YFIR HVADA UMFERDIR er fullyrding
      sem notandinn getur ekki athugad.
   ============================================================ */
console.log("\n9) FORM-MERKID — TEIKNAD, NAFNGREINT OG TEXTALAUST");
{
  const { default: Teams } = await import("../src/Teams.jsx");
  const sf9 = J("bsd_shots.json");
  const F9 = Object.fromEntries(sf9.legend.fields.map((f, i) => [f, i]));
  const bt9 = new Map(), bo9 = new Map();
  const put9 = (m, k, v) => { if (k == null) return; const a = m.get(k); a ? a.push(v) : m.set(k, [v]); };
  for (const x of sf9.shots) { put9(bt9, x[F9.team], x); put9(bo9, x[F9.opp], x); }
  const host = document.createElement("div");
  document.body.appendChild(host);
  const r9 = createRoot(host);
  /* `Crest: () => null` svo HVER `<svg>` i nafna-holfi se form-merki og
     ekkert annad — annars vaeri talningin haed thvi hvort lidsmerkid er
     teiknad sem mynd eda sem svg thann daginn.                          */
  await act(async () => { r9.render(React.createElement(Teams, {
    teams: J("teams.json"), teamForm: J("team_form.json"), luck: J("luck.json"),
    teamShots: J("team_shots.json"), bsdTeams: J("bsd_teams.json"),
    fixtures: realFix,
    shotIndex: { byTeam: bt9, byOpp: bo9, teams: sf9.legend.teams, fields: F9,
                 calib: sf9.calib },
    seasonLabel: "this season", Crest: () => null })); });
  await act(async () => { await new Promise(r => setTimeout(r, 120)); });

  const marks = () => [...host.querySelectorAll("tbody [role='img']")];
  const kinds = () => marks().map(m => m.getAttribute("aria-label"));
  const nameCells = () => [...host.querySelectorAll("tbody tr")]
    .map(tr => tr.querySelector("td")).filter(Boolean);

  /* --- LIFANDI SYN: ein umferd spilud -> ENGIN merki. Og POSITIVA
     forsendan vid hlidina, annars vaeri "engin merki" satt um tomt DOM. */
  ok(`forsenda: taflan er teiknud i lifandi syn (${nameCells().length} radir)`,
     nameCells().length === 20);
  ok(`lifandi syn: ekkert form-merki — ein umferd er ekki form `
     + `(${marks().length} merki)`, marks().length === 0);
  ok("og lykillinn nefnir thau ekki heldur", !/hot form|poor form/.test(host.textContent || ""));

  /* --- FYRRA TIMABIL: fullt timabil -> merkin kvikna. */
  ok("forsenda: skipt i fyrra timabil (kafli 9)", await pickSeason("prev", host));
  const hot = kinds().filter(k => k === "hot form").length;
  const cold = kinds().filter(k => k === "poor form").length;
  ok(`fyrra timabil: merkin ERU teiknud (${hot} eldur / ${cold} is af `
     + `${nameCells().length} rodum)`, hot > 0 && cold > 0);
  /* SEXTILL SESTUR A SKJANUM: hvorugur endinn ma na thridjungi deildarinnar.
     Vaeri throskuldur settur i stad rodunar gaeti hann merkt hvad sem er. */
  ok(`og hvorugur endinn er nema sjotti hluti (${hot}/${cold} af 20)`,
     hot <= 4 && cold <= 4 && hot + cold === marks().length);
  ok("ekkert lid ber baedi eld og is",
     new Set(marks().map(m => m.closest("tr"))).size === marks().length);

  /* --- RENDER-HAETTAN: merkid ma engan texta bera. */
  const marked = marks().map(m => m.closest("td"));
  ok(`forsenda: merkin sitja i nafna-holfinu (${marked.filter(Boolean).length})`,
     marked.length > 0 && marked.every(td => td && td === td.closest("tr").querySelector("td")));
  ok("merkt holf ber NAKVAEMLEGA sama texta og omerkt: skammstofun + nafn",
     marked.every(td => {
       const spans = [...td.querySelectorAll("span")].filter(x => !x.getAttribute("role"));
       return td.textContent === spans.map(x => x.textContent).join("");
     }), marked.map(td => JSON.stringify(td.textContent)).slice(0, 3).join(" "));
  /* OG UPPFLETTINGIN SEM ALLT SAFNID HVILIR A HELDUR: rod byrjar afram a
     skammstofuninni. ThETTA er fullyrdingin sem emoji hefdi fellt.      */
  const shorts = [...host.querySelectorAll("tbody tr")]
    .map(tr => tr.querySelector("span")?.textContent || "");
  ok("hver rod byrjar afram a skammstofun lidsins (uppflettingin heldur)",
     shorts.length === 20 && shorts.every((sh, i) =>
       (host.querySelectorAll("tbody tr")[i].textContent || "").startsWith(sh)),
     shorts.slice(0, 3).join(","));
  ok("og merkid er `<svg>`, ekki tacn i texta",
     marks().every(m => m.querySelector("svg")));

  /* --- NAFNID OG GLUGGINN. */
  const t9 = host.textContent || "";
  ok("lykillinn nefnir baedi merkin", /hot form/.test(t9) && /poor form/.test(t9));
  ok("og hann NEFNIR GLUGGANN og grunninn berum ordum",
     /GW \d+[–-]\d+ against each side's own GW \d+[–-]\d+ average/.test(t9),
     t9.match(/GW \d+[–-]\d+ against[^]{0,80}/)?.[0] || "ENGINN");
  ok("og hann segir ad merkid breyti ENGRI tolu",
     /descriptive only, it changes no number here/.test(t9));
  /* TOOLTIP-ID BER SOMU FULLYRDINGU — tvo log um somu akvordun mega ekki
     segja sitthvad (sama regla og `blind`-merkid og notan bera).        */
  const tip = marks()[0]?.getAttribute("title") || "";
  ok("tooltip merkisins segir gluggann OG ad thad breyti engri tolu",
     /GW \d+[–-]\d+/.test(tip) && /DESCRIPTIVE ONLY/.test(tip)
     && /not the buy ranking/.test(tip), tip.slice(0, 90));
  ok("engin NaN/undefined i merkinu", !/\bNaN\b|\bundefined\b/.test(t9));
  await act(async () => { r9.unmount(); }); host.remove();
}

/* ============================================================
   10) FLOKKA-RODIN OG HEITIN — LESIN AF SKJANUM (25.8.2026)

   Beidni notandans: markvardar-flokkurinn AFTAR og heitid stytt i "GK".
   Rodin er ekki smekksatridi heldur ver hun thad ad notandinn lendi a
   tomasta flokknum: hann er skota-drifinn ad ollu leyti og engin skota-
   heimild naer yfir yfirstandandi timabil, sem er sjalfgefna synin.
   ============================================================ */
console.log("\n10) FLOKKA-RODIN — GK AFTAN VID DEFENCE OG ATTACK");
{
  const { default: Teams } = await import("../src/Teams.jsx");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const r10 = createRoot(host);
  await act(async () => { r10.render(React.createElement(Teams, {
    teams: J("teams.json"), teamForm: J("team_form.json"), luck: J("luck.json"),
    teamShots: J("team_shots.json"), bsdTeams: J("bsd_teams.json"),
    fixtures: realFix, shotIndex: null, seasonLabel: "this season",
    Crest: () => null })); });
  await act(async () => { await new Promise(r => setTimeout(r, 120)); });
  const labels = TEAM_GROUPS.map(g => g.label);
  const onScreen = [...host.querySelectorAll("button")]
    .map(b => (b.textContent || "").trim()).filter(t => labels.includes(t));
  ok(`allir ${labels.length} flokkarnir eru a skjanum i SKRA-ROD `
     + `(${onScreen.join(" | ")})`,
     onScreen.join("|") === labels.join("|"), labels.join("|"));
  ok(`markvardar-flokkurinn kemur AFTAN vid Defence og Attack `
     + `(${onScreen.indexOf(GK_GROUP)} af ${onScreen.length - 1})`,
     onScreen.indexOf(GK_GROUP) > onScreen.indexOf("Defence")
     && onScreen.indexOf(GK_GROUP) > onScreen.indexOf("Attack"));
  /* SJALFGEFNI FLOKKURINN ER SA SEM BER TOLUR I LIFANDI SYN — thad er
     spurningin sem rodin var faerd fyrir. Lesid AF SKJANUM: hausrodin
     verdur ad vera varnar-flokkurinn OG holfin ad bera tolur.           */
  const heads10 = [...host.querySelectorAll("thead th")]
    .map(h => h.textContent.replace(/[↑↓]/g, "").trim());
  const nums10 = [...host.querySelectorAll("tbody td")]
    .filter(td => /^\d+(\.\d+)?$/.test(td.textContent.trim())).length;
  ok(`sjalfgefna synin opnast a flokki sem BER TOLUR `
     + `(${heads10.slice(1).join(",")} — ${nums10} holf med tolu)`,
     heads10.includes("GC") && nums10 >= 20, `${nums10}`);
  await act(async () => { r10.unmount(); }); host.remove();
}

console.log(`\nTEAMS-UMFERDIR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
