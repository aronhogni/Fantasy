/* ============================================================
   VOLLURINN — SEX BREYTINGAR BEDNAR 20.8.2026, LESNAR AF SKJANUM

   HVERS VEGNA SER SKRA OG EKKI VIDBOT VID `smoke.test.mjs`: hvert
   tilfelli her tharf SITT EIGID `localStorage` (minus-banki, Bench Boost,
   thrir fra sama felagi) og smoke-safnid teiknar appid EINU SINNI med
   fostu astandi. Safn sem tharf margar hledslur med olikum forsendum er
   annad safn — annars fara forsendurnar ad skarast og hver fullyrding
   maelir eitthvad annad en hun segir.

   ATH `\bNaN\b` MED ORDAMORKUM, EKKI `includes("NaN")`: `textContent`
   limir texta saman an bila, svo FFDR-taflan skilar "MUN"+"a"+"NEW" =
   **MUNaNEW** sem ber undirstrenginn NaN. Thad felldi apaprofid i thremur
   fraeum af fjorum medan appid var i fullkomnu lagi (CLAUDE.md 5b).

   KAFLAR
     A  MINUS-BANKI    — dyr madur er VELJANLEGUR, bankinn syni minus
     B  BENCH BOOST    — 15 spjold a vellinum, ekkert klippt
     C  MERKIN         — ↻ vinstra megin med i · ADEINS ⇄ haegra megin
     D  FORLEIKS-TEXTINN — horfinn (og forsendan syn ad hann VAR their)
     E  VERDBREYTINGAR — malsgreinin horfin, TAFLAN og FYRIRVARINN eftir
     F  "Never in your XI" — undir Fixtures, og jofnunin retti sig
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { playedEvents } from "./lib/played-events.mjs";
/* ADEINS REGLAN, EKKI VELIN. Kafli G telur XI-in UPP SJALFUR og ma thvi
   ekki kalla `bestTeamPlan` — annars vaeri thad sama utfaersla borin vid
   sjalfa sig. `legalFormation`/`posKey` eru FPL-reglan og stodu-vorpunin,
   og thaer eiga ad koma ur EINUM stad (CLAUDE.md 8).                    */
import { legalFormation, posKey, XI_SIZE } from "../src/bestteam.js";

let pass = 0, fail = 0;
const ok = (c, n, x = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                 : (fail++, console.log(`  ✗ ${n} ${x}`)); };
const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

const ALL = J("players.json").players;
const TEAMS = (() => { const t = J("teams.json"); return t.teams || t; })();
const byId = {}; ALL.forEach(p => byId[p.id] = p);
const teamShort = {}; TEAMS.forEach(t => teamShort[t.id] = t.short);

/* PROFLIDID ER ThAD SAMA OG I `smoke.test.mjs` — sama START_SQUAD sem
   App.jsx notar thegar ekkert FPL-lid er tengt.                       */
const START_IDS = [496,11,356,423,542,397,426,239,368,411,346,497,173,278,321];

const realSetTimeout = globalThis.setTimeout;
const sleep = ms => new Promise(r => realSetTimeout(r, ms));

/* Ein hledsla per tilfelli. Skilar DOM-inum sjalfum (ekki bara texta) —
   kaflar B, C og F thurfa ad SPYRJA UM UPPSETNINGU, ekki bara innihald. */
async function mount(state, { width = 1280, patch = null } = {}) {
  const dom = new JSDOM("<!doctype html><div id=root></div>",
    { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.innerWidth = width;
  if (!("oninput" in dom.window.HTMLElement.prototype))
    for (const ev of ["oninput", "onchange"])
      Object.defineProperty(dom.window.HTMLElement.prototype, ev, {
        get() { return null; }, set() {}, configurable: true });
  if (state) dom.window.localStorage.setItem("fpl_planner_v3", JSON.stringify(state));
  const orig = console.error;
  console.error = (...a) => { const m = String(a[0] ?? ""); if (!/not wrapped in act|Warning:/.test(m)) orig(...a); };
  globalThis.fetch = async u => {
    const n = String(u).split("/data/")[1];
    if (!n) return { ok: false, status: 404, json: async () => ({}) };
    if (patch && patch[n]) return { ok: true, status: 200, json: async () => patch[n] };
    try { return { ok: true, status: 200, json: async () => J(n) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("no"); } }; }
  };
  const { default: App } = await import("../src/App.jsx");
  const root = createRoot(dom.window.document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { await sleep(320); });
  console.error = orig;
  const doc = dom.window.document;
  return {
    doc,
    text: () => doc.body.textContent || "",
    html: () => doc.body.innerHTML || "",
    click: async el => { await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); }); await act(async () => { await sleep(40); }); },
    q: s => [...doc.querySelectorAll(s)],
  };
}

/* SPJOLD: `draggable` er ADEINS a `PlayerCard` (staðfest med grepi: eitt
   tilvik i App.jsx), svo thetta telur spjold og ekkert annad.
   `cards` = OLL spjold (vollur + bekkur). `onPitch` = adeins thau sem eru
   i STODU-RODUNUM. Sa greinarmunur er allur kaflinn B: fyrsta utgafa
   profsins taldi `cards` og fekk 15 BADUM megin — bekkurinn er lika
   `draggable` — svo forsendan "ellefu an chips" gat ekki stadist og
   fullyrdingin "fimmtan med BB" maeldi ekkert.                          */
const cards = v => v.q('[draggable="true"]');
/* `rowsArea` er einkennd af `justify-content: space-evenly` — eina
   umgjordin i vellinum sem ber hana (sja `S.rowsArea`).                 */
const rowsArea = v => v.q(".fpl-pitch div").find(d =>
  /justify-content:\s*space-evenly/.test(d.getAttribute("style") || ""));
const onPitch = v => { const a = rowsArea(v); return a ? [...a.querySelectorAll('[draggable="true"]')] : []; };
const cardOf = (v, name) => cards(v).find(c => (c.textContent || "").includes(name));
const NANRE = /\bNaN\b|\bundefined\b/;

console.log(`\n${"=".repeat(84)}`);
console.log("VOLLURINN — SEX BREYTINGAR (20.8.2026)");
console.log("=".repeat(84));

/* ============================================================
   A. MINUS-BANKI — VERD BLOKKAR EKKI LENGUR VAL
   ============================================================
   Talan er reiknud ur SOMU gognum sem appid les, svo profid getur ekki
   ordid osamstiga verdlistanum: proflidid kostar 98,5 -> banki 1,5.
   Walle Egeli (FWD 4,5) er seldur, svo tiltaekt fe er 6,0 — og Isak (9,0)
   er thvi 3,0 YFIR. Undir gamla kodanum var hann OVELJANLEGUR
   ("£3.0 short" + opacity 0,45).                                       */
console.log("\n--- A. MINUS-BANKI ---");
{
  const spent = START_IDS.reduce((a, id) => a + byId[id].now_cost, 0);
  const bank0 = (1000 - spent) / 10;
  const SELL = 321, BUY = 379;                 // Walle Egeli FWD -> Isak FWD
  const avail = bank0 + byId[SELL].now_cost / 10;
  const after = +(avail - byId[BUY].now_cost / 10).toFixed(1);
  ok(bank0 === 1.5, `forsenda: banki proflidsins er 1,5 (${bank0})`);
  ok(byId[BUY].element_type === byId[SELL].element_type,
     "forsenda: sama stada (FPL leyfir ekki annad)");
  ok(after < 0, `forsenda: Isak er YFIR tiltaeku fe — banki eftir ${after}`);

  const v = await mount({ captain: 411 });
  ok(/£1\.5/.test(v.text()), "byrjunarbanki £1,5 a maelabordinu");

  const card = cardOf(v, byId[SELL].web_name);
  ok(!!card, `forsenda: spjald ${byId[SELL].web_name} er a vellinum`);
  const swap = card && [...card.querySelectorAll("button")]
    .find(b => /^Transfer out/.test(b.getAttribute("title") || ""));
  ok(!!swap, "forsenda: ⇄-hnappurinn er a spjaldinu");
  await v.click(swap);

  const isak = v.q("button").find(b => {
    const t = (b.textContent || "").trim();
    return t.startsWith(byId[BUY].web_name) && t.includes(`£${(byId[BUY].now_cost/10).toFixed(1)}`);
  });
  ok(!!isak, `forsenda: ${byId[BUY].web_name} er i leitarlistanum`);

  /* HLIDID SEM VAR: rodin ma EKKI vera dofud (opacity 0,45) fyrir verd.
     Fullyrdingin er ekki tom — rodin er sannanlega minus-rod, sja naest. */
  ok(/bank -£3\.0/.test(isak.textContent || ""),
     "rodin SEGIR hvad bankinn verdur: 'bank -£3.0'",
     `[${(isak.textContent||"").slice(0,120)}]`);
  ok((isak.getAttribute("style") || "").replace(/\s/g, "").indexOf("opacity:0.45") < 0,
     "og hun er EKKI dofud — verd er upplysing, ekki hindrun");
  ok(!/short/.test(v.text()), "gamla '£X short'-hindrunin er horfin ur listanum");

  /* MINUS-RADIRNAR ERU MARGAR OG ENGIN ThEIRRA MA VERA DOFUD.
     Talan er FULLYRDING, ekki logga (CLAUDE.md 5b regla 1).           */
  const over = v.q("button").filter(b => /bank -£/.test(b.textContent || ""));
  ok(over.length >= 3, `forsenda: minst 3 minus-radir i listanum (${over.length})`);
  ok(over.every(b => (b.getAttribute("style") || "").replace(/\s/g, "").indexOf("opacity:0.45") < 0),
     "ENGIN minus-rod er dofud");

  // VALID SJALFT — thetta er kjarninn i beidninni.
  await v.click(isak);
  const t = v.text();
  ok(!/short — transfer too expensive/.test(t), "engin 'too expensive'-skilabod");
  ok(new RegExp(`${byId[SELL].web_name}\\s*→\\s*${byId[BUY].web_name}`).test(t)
     || /→/.test(t), "skiptin voru SKRAD (toast med →)");
  ok(/-£3\.0/.test(t), "bankinn er birtur SEM MINUS: -£3.0", `[${t.slice(0, 60)}]`);
  ok(!/£-3\.0/.test(t), "og ALDREI sem '£-3.0' — merkid fer fyrir pundid");
  ok(/sell someone to fund it|sell to fund it/.test(t),
     "og notandanum er sagt hvernig hann fjarmagnar thad");
  ok(!NANRE.test(t), "ekkert NaN/undefined a skjanum med negatifum banka");

  /* KLIPPING I 0 VAERI ThOGUL LYGI — hun myndi lesast eins og "thu att 0".
     Ekkert `£0.0` ma standa thar sem bankinn er.                       */
  ok(!/💰[^£]*£0\.0/.test(t.replace(/\s+/g, " ")),
     "bankinn er EKKI klipptur i £0,0");
}

/* ============================================================
   B. BENCH BOOST — ALLIR 15 A VOLLINN
   ============================================================
   `chips` er lyklad `"<nafn>:<START>"`; `bboost:1` er raunverulegt plass i
   `data/chips.json` (start_event 1) og gw byrjar i 1, svo thetta er sama
   samsetning sem notandinn faer.                                       */
console.log("\n--- B. BENCH BOOST: 15 SPJOLD ---");
{
  const base = await mount({ captain: 411 });
  const n0 = onPitch(base).length;
  ok(n0 === 11, `forsenda: an chips eru ELLEFU spjold a vellinum (${n0})`);
  ok(cards(base).length === 15, `forsenda: hopurinn er samt 15 spjold i heild (${cards(base).length})`);
  ok(/Bench/.test(base.text()), "forsenda: bekkjar-bordinn er their");

  const v = await mount({ captain: 411, chips: { "bboost:1": 1 } });
  const n1 = onPitch(v).length;
  ok(n1 === 15, `Bench Boost: FIMMTAN spjold A VELLINUM (${n1})`);
  ok(cards(v).length === 15, `og engin tvitekning — 15 spjold i heild (${cards(v).length})`);

  /* HVERT SPJALD SE RAUNVERULEGUR LEIKMADUR UR HOPNUM — annars gaeti
     talan 15 komid ur tvitekningu eda ur tomum spjoldum.              */
  const names = onPitch(v).map(c => (c.textContent || ""));
  const missing = START_IDS.filter(id => !names.some(t => t.includes(byId[id].web_name)));
  ok(missing.length === 0,
     "og thad eru NAKVAEMLEGA hopurinn — allir 15 finnast",
     `vantar ${missing.map(i => byId[i].web_name).join(",")}`);

  /* LENGSTA RODIN ER FIMM — thad er svarid vid "klippast spjoldin?".
     Radirnar eru `pitchRowFlex`-borðin inni i vellinum.                */
  const pitchRows = v.q(".fpl-pitch div").filter(d =>
    [...d.children].length > 0 && [...d.children].every(c => c.getAttribute("draggable") === "true"));
  const sizes = pitchRows.map(r => r.children.length).filter(n => n > 0);
  ok(sizes.length >= 4, `forsenda: fjorar stodu-radir finnast (${sizes.join("/")})`);
  ok(Math.max(...sizes) === 5,
     `lengsta rodin er FIMM — sama hamark og 5-manna vorn (${sizes.join("/")})`);
  ok(sizes.reduce((a, b) => a + b, 0) === 15, "og radirnar summast i 15");

  /* WRAP, EKKI CLIP: rodin verdur ad LEYFA broti. `nowrap` + flexShrink
     hefdi thjappad spjoldunum undir 62px lasgolfid i stad thess ad brjota. */
  const wrapOk = pitchRows.every(r =>
    /flex-wrap:\s*wrap/.test(r.getAttribute("style") || ""));
  ok(wrapOk, "hver rod er `flex-wrap: wrap` — wrap, ekki clip");

  /* BEKKJARMENN A VELLINUM HALDA `pCardBench` — annars taepast
     vitneskjan "hverjir eru XI-in".
     SAGAN I ThREMUR SKREFUM: 0,94 gaf ADEINS 13 i RGB a torfi og
     notandinn sa ENGAN mun ("thad eru bara 2 kort sem eru lighter");
     20.8. for hann i 0,74 OG ord-merki („BENCH") bættist vid; 25.8. var
     ordid tekid ut ad beidni notandans og liturinn gerdur OGEGNSAER
     (#b3bbc0 = 76 i RGB a BADUM bokgrunnum). Thresholdur repo-sins er
     >= 20 (CLAUDE.md 3). Talan sjalf er MAELD i `initial-squad.mjs`
     kafla F; hér er adeins TALID.
     LITURINN ER LESINN UR `appStyles.js` — hardkodadur litur her vaeri
     annad eintak sem rekur thegjandi i sundur vid stilinn.             */
  const HEX = readFileSync(new URL("../src/appStyles.js", import.meta.url).pathname, "utf8")
    .match(/pCardBench: \{ background:"(#[0-9a-fA-F]{6})" \}/);
  ok(!!HEX, "fann bekkjar-litinn i appStyles.js");
  const RGB = HEX
    ? `rgb(${[1, 3, 5].map(i => parseInt(HEX[1].slice(i, i + 2), 16)).join(", ")})`
    : " none";
  const lighter = onPitch(v).filter(c => c.style.backgroundColor === RGB);
  ok(lighter.length === 4, `fjorir bekkjarmenn eru enn adgreindir (grair) (${lighter.length})`);
  /* HIN ELLEFU ERU HVIT — an thess vaeri "fjorir eru grair" lika satt
     thegar OLL fimmtan eru grá.                                        */
  ok(onPitch(v).filter(c => c.style.backgroundColor === "rgb(255, 255, 255)").length === 11,
     "og hin ellefu bera hvita spjaldid");
  /* SETNINGIN SEM ORD-MERKID BAR LIFIR I `title` — fyrst sannad ad hun
     SE thar, svo fullyrt ad ordid se farid (CLAUDE.md 5b, regla 2).    */
  const titled = onPitch(v).filter(c => /On your bench for this gameweek/.test(c.getAttribute("title") || ""));
  ok(titled.length === 4, `bekkjar-setningin er i \`title\` a somu fjorum (${titled.length})`);
  const tagged = onPitch(v).filter(c => [...c.querySelectorAll("span")]
    .some(x => (x.textContent || "").trim() === "BENCH"));
  ok(tagged.length === 0, `og ord-merkid er farid (${tagged.length})`);

  ok(/all 15 score/.test(v.text()), "bekkjar-bordinn SEGIR hvers vegna hann er tomur");
  ok(!NANRE.test(v.text()), "ekkert NaN/undefined i BB-umferd");

  /* FYRIRLIDA-VALLISTINN MA EKKI VAXA I 15 — BB er ekki uppstillingar-
     breyting og fyrirlidinn verdur ad vera i XI-inu.                   */
  const capSel = v.q("select")[0];
  ok(capSel && capSel.querySelectorAll("option").length === 11,
     `fyrirlida-vallistinn er enn ELLEFU (${capSel && capSel.querySelectorAll("option").length})`);
}

/* ============================================================
   C. MERKIN — ↻ VINSTRA MEGIN, ADEINS ⇄ HAEGRA MEGIN
   ============================================================
   Lesid AF SPJALDINU: vinstri og haegri hopurinn eru greindir a `left`/
   `right` i stilnum, ekki a rod i DOM-inum.                            */
console.log("\n--- C. MERKI-STADSETNING ---");
{
  const v = await mount({ captain: 411 });
  const card = cardOf(v, byId[411].web_name);
  ok(!!card, "forsenda: Haaland-spjaldid finnst");
  const groups = [...card.children].filter(el => /position:\s*absolute/.test(el.getAttribute("style") || ""));
  const L = groups.find(g => /left:\s*2px/.test(g.getAttribute("style") || ""));
  const R = groups.find(g => /right:\s*2px/.test(g.getAttribute("style") || ""));
  ok(!!L && !!R, "forsenda: badir ikon-hoparnir finnast");
  const titles = g => [...g.querySelectorAll("button")].map(b => b.getAttribute("title") || "");
  const lt = titles(L), rt = titles(R);
  ok(lt.some(t => t === "Information"), "VINSTRA: 'i' (Information)");
  ok(lt.some(t => /^FFDR comparison/.test(t)), "VINSTRA: ↻ (FFDR comparison) — FLUTT hingad");
  ok(rt.length === 1 && /^Transfer out/.test(rt[0]),
     `HAEGRA: ADEINS ⇄ (${rt.length} hnappur)`, `[${rt.join(" | ")}]`);
  ok(!rt.some(t => /^FFDR comparison/.test(t)), "↻ er EKKI lengur haegra megin");
  ok(/C$|C/.test(L.textContent || ""), "fyrirlida-merkid er enn i vinstri rodinni");

  /* ============================================================
     C/V ERU FYRSTU BORNIN — OG ThAD ER RUMFRAEDI, EKKI ROD (25.8.2026)
     ============================================================
     Kaeran: „C/V hylja andlitid a leikmanninum". `pcIconsL` er
     `flexWrap:"wrap"` a spjaldi sem er clamp(62px, 17.5%, 100px), svo
     rodin BROTNAR thegar atridin verda fjogur — og thad sem brotnar
     lendir a naestu linu, ThAD ER OFAN A ANDLITSMYNDINNI. Merkid sat
     AFTAST (a eftir i, ↻ og meidsla-merkinu) og var thvi einmitt thad
     sem brotnadi.
     FYRSTA SAETID I FLEX-ROD ER EFSTA VINSTRA HORNID og thad getur ALDREI
     brotnad nidur, hvad sem hin atridin gera. Fullyrdingin er thvi um
     SAETID (`children[0]`), ekki um ad merkid se einhvers stadar i rodinni
     — su fullyrding (linan her ad ofan) var SONN allan timann sem kaeran
     var i gildi og gat thvi ekki tekid hana.
     jsdom hefur ENGA uppsetningarvel, svo „brotnar rodin?" er ekki
     maelanlegt her; fullyrdingin er um ORSOKINA (saetid), eins og
     `initial-squad.mjs` kafli G gerir vid limingu.                    */
  const vv = await mount({ captain: 411, vice: 11 });
  const iconsL = c => [...c.children].find(el => /left:\s*2px/.test(el.getAttribute("style") || ""));
  const firstOf = name => {
    const c = cardOf(vv, byId[name].web_name); const g = c && iconsL(c);
    return g && g.children[0] ? (g.children[0].textContent || "").trim() : null;
  };
  ok(firstOf(411) === "C", `FYRIRLIDINN: C er FYRSTA barnid i vinstri rodinni (${firstOf(411)})`);
  ok(firstOf(11) === "V", `VARAFYRIRLIDINN: V er FYRSTA barnid (${firstOf(11)})`);
  /* OG HJA HINUM ER ThAD i-HNAPPURINN — an thessa vaeri „C er fyrst"
     lika satt ef ALLIR baeru C.                                       */
  const plain = cardOf(vv, byId[356].web_name), pg = plain && iconsL(plain);
  ok(pg && (pg.children[0].textContent || "").trim() === "i",
     "og hja theim sem er hvorugt byrjar rodin a `i`-hnappnum");
  /* ENGIN ABSOLUTE-STADSETNING AFTUR: `left: 21/38` var lausnin sem var
     felld 20.8. og hun ma ekki laumast inn sem „lagfaering" a thessu.  */
  const capSpan = cardOf(vv, byId[411].web_name).querySelector('[title^="Captain"]');
  ok(capSpan && !/position:\s*absolute/.test(capSpan.getAttribute("style") || ""),
     "C-merkid er i FLAEDI, ekki absolute-stadsett");

  /* MAGIC-TALAN ER FARIN: engin handreiknud `left: 21px/38px` a
     meidsla-merkinu. Hun var rett fyrir TVO ikon og thogul-rong fyrir thrju. */
  ok(!/left:\s*(21|38)px/.test(card.getAttribute("innerHTML") || card.innerHTML || ""),
     "engin handreiknud left:21/38 a merkinu — thad er i flaedi");
  const lstyle = (L.getAttribute("style") || "").replace(/\s/g, "");
  ok(/flex-wrap:wrap/.test(lstyle), "vinstri rodin er `wrap` (fjogur atridi i versta tilfelli)");
  ok(/max-width/.test(lstyle), "og hun ber `maxWidth` svo hun klippist ekki");
}

/* ============================================================
   D. FORLEIKS-MALSGREININ ER HORFIN
   ============================================================
   "STRENGURINN ER FARINN" ER EINSKIS VIRDI AN FORSENDU (CLAUDE.md 5b
   regla 2). Forsendan her er NAGRANNINN: sama umferdastika ber "· deadline"
   og dagsetninguna, og malsgreinin sat NAKVAEMLEGA thar. Faeri leitin i
   ranga kassa (eda vaeri hausinn horfinn) félli forsendan fyrst.
   Stökkbreytingin er skjolud i skyrslunni: malsgreinin var sett inn aftur
   og BADAR fullyrdingar her fellu.                                     */
console.log("\n--- D. FORLEIKS-TEXTINN ---");
{
  const v = await mount({ captain: 411 });
  const t = v.text();
  ok(/· deadline/.test(t), "forsenda: umferdastikan (thar sem textinn sat) er a skjanum");
  ok(!/Prices do not move and transfers are unlimited/.test(t),
     "forleiks-malsgreinin er FARIN");
  ok(!/Purchase prices lock then/.test(t),
     "og seinni helmingur hennar lika");
  /* REGLAN SJALF STENDUR — thad var TEXTINN sem for, ekki hegdunin.
     Verdin eru enn ohreyfd i forleik, svo soluverd = nuverandi verd.   */
  ok(!/£NaN/.test(t) && !NANRE.test(t), "ekkert NaN eftir ad textinn for");
}

/* ============================================================
   E. VERDBREYTINGAR — MALSGREININ FOR, TAFLAN OG FYRIRVARINN EFTIR
   ============================================================
   CLAUDE.md 3: verdspain "ma aldrei birtast sem vissa". Fyrirvarinn ma
   thvi ekki fara med malsgreininni, og HANN ER LEITADUR SERSTAKLEGA.  */
console.log("\n--- E. VERDBREYTINGAR ---");
{
  /* TAFLAN ER TOM I FORLEIK OG ThAD ER RAUNVERULEGT — MAELT:
     `transfers_in_event`/`transfers_out_event` eru NULL hja OLLUM 587 i
     `data/players.json` i dag, svo bædi `up` og `down` eru tom fylki.
     Fullyrding um "taflan stendur" a lifandi gognum vaeri thvi TOM —
     nakvaemlega gildran sem `pros-render.mjs` var skrifad fyrir (safnid
     sem opnar flipann hittir alltaf a TOMA astandid).
     Radirnar eru thvi profadar a PATCHADRI skra thar sem svarid er thekkt
     fyrirfram, og tomu-astandid er profad ser (nedar).                  */
  const raw = J("players.json");
  const pl = raw.players.map(p => ({ ...p }));
  const UP = pl.find(p => p.id === 12), DOWN = pl.find(p => p.id === 154);
  const RISEN = pl.find(p => p.id === 4);
  UP.transfers_in_event = 900000; UP.transfers_out_event = 0;
  UP.cost_change_event = 0; UP.selected_by_percent = "5.0";
  DOWN.transfers_in_event = 0; DOWN.transfers_out_event = 800000;
  DOWN.cost_change_event = 0; DOWN.selected_by_percent = "5.0";
  RISEN.transfers_in_event = 400000; RISEN.transfers_out_event = 0;
  RISEN.cost_change_event = 1;      // hann ER thegar risinn -> "↑ £0.1"
  const v = await mount({ captain: 411 },
    { patch: { "players.json": { ...raw, players: pl } } });
  const t = v.text(), h = v.html();
  ok(/Price changes — transfers this gameweek/.test(t),
     "forsenda: kassinn sjalfur er a skjanum");
  ok(!/Real data: transfers_in\/out and cost_change_event/.test(t),
     "skyringar-malsgreinin er FARIN");
  ok(!/A green name = he is in your transfer plan/.test(t),
     "og restin af henni lika");
  // TAFLAN: netto-tolur, raunveruleg verdbreyting, og badir helmingar
  const movers = v.q("span").filter(d =>
    /^[+-]?\d+k$/.test((d.textContent || "").trim()));
  ok(movers.length >= 3, `TAFLAN stendur — minst 3 netto-tolur (${movers.length})`);
  ok(/\+900k/.test(t), "og talan sjalf er rett (+900k)");
  ok(/Most out/.test(t), "badir helmingar hennar (Most out)");
  ok(/-800k/.test(t), "og talan i nedri helmingnum (-800k)");
  ok(/↑ £0\.1/.test(t), "raunveruleg verdbreyting birtist (↑ £0.1)");
  /* SPAIN SJALF — "↑ tonight?" — ER FYRIRVARINN I TEXTA. Hun verdur ad
     vera their, annars maeldi title-fullyrdingin nedar ekkert.          */
  ok(/tonight\?/.test(t), "og SPAIN med spurningarmerkinu: 'tonight?'");
  /* FYRIRVARINN — ThRJAR OHADAR LEIDIR, ALLAR I DOM-INU:
     1. hausinn ber hann i `title`
     2. hver spa ber hann i `title`
     3. textinn sjalfur er "tonight?" — spurningarmerkid ER fyrirvarinn */
  ok(/is an approximation/.test(h),
     "FYRIRVARINN er i DOM-inu (title a hausnum)");
  ok(/FPL does not publish its price-change formula/.test(h),
     "og setningin um ad FPL birti ekki formuluna");
  const predictTitles = v.q("[title]").map(e => e.getAttribute("title"))
    .filter(x => /approximation/.test(x || ""));
  ok(predictTitles.length >= 2,
     `fyrirvarinn er a minnst tveimur title (haus + spa) (${predictTitles.length})`);
  ok(!NANRE.test(t), "ekkert NaN i verdbreytinga-kassanum");

  /* TOMA ASTANDID A LIFANDI GOGNUM — sagt BERUM ORDUM svo "taflan
     stendur" ad ofan verdi ekki misskilid sem fullyrding um forleik.   */
  const live = await mount({ captain: 411 });
  ok(/Price changes — transfers this gameweek/.test(live.text()),
     "a LIFANDI (forleiks-)gognum er hausinn their — og engar radir, sem er RETT");
  ok(/is an approximation/.test(live.html()),
     "og fyrirvarinn er their lika, thott engin rod se til");
}

/* ============================================================
   F. "Never in your XI" — UNDIR FIXTURES, OG JOFNUNIN
   ============================================================
   Bordinn HORFIR AFTURABAK fra 20.8.2026 og er thvi ThOGULL i forleik
   (sja `unusedPlan` i App.jsx). TVAER forsendur thurfa thvi ad standa hér:
   TIMINN (umferdir 1-4 byrjadar — `tests/lib/played-events.mjs`) og
   PLANUNIN (Haaland a bekknum, annars er hann i XI-inu og enginn er
   "onotadur"). Vantadi timinn vaeri hver fullyrding hér graen af RANGRI
   astaedu; thess vegna er hun MAELD i fyrstu linu kaflans.              */
console.log("\n--- F. 'Never in your XI' ---");
{
  /* EIN FAERSLA, EKKI SEX: uppstillingin ERFIST nu fram (`squadForGw`
     foldar 1..g), svo sex eins faerslur toggla i stad thess ad safnast. */
  const PLAYED = { "events.json": { events: playedEvents(J("events.json").events, 4) } };
  const v = await mount({ captain: 411, benchSwaps: { 1: [[411, 321]] } }, { patch: PLAYED });
  ok(/Not been in your XI/.test(v.text()), "forsenda: bordinn birtist");
  /* MALSGREININ VAR HER OG ER FARIN 21.8. (notandinn: "alltof mikill og
     flokinn texti"). Glugginn er sagdur i HAUSNUM og attin i eigin linu —
     tvaer stadreyndir sem malsgreinin sagdi i thridja sinni.            */
  ok(/Not been in your XI — GW1–4/.test(v.text()),
     "og hausinn segir AFTURABAK hvada umferdir hann las — glugginn er talan sjalf");
  ok(!/Looking back at the/.test(v.text()), "og malsgreinin er farin");

  /* KASSINN SJALFUR, EKKI HAUS-DIVID OG EKKI DALKURINN UTAN UM HANN.
     Fyrsta utgafa profsins tok `banner.parentElement` — sem er SIDE-
     DALKURINN, og hann INNIHELDUR Fixtures-listann. Thess vegna var
     `compareDocumentPosition` 10 (CONTAINS+PRECEDING), ekki 4, og
     `gf.parentElement.contains(card)` var satt af annarri astaedu en
     profid taldi. Kassinn er sa YSTI div sem BYRJAR a hausnum OG ber
     tolurnar — hausinn einn ber thaer ekki, dalkurinn byrjar a "Fixtures". */
  const card = v.q("div").find(d => {
    const t = (d.textContent || "").trim();
    return /^Not been in your XI/.test(t) && /Save £/.test(t);
  });
  ok(!!card, "forsenda: bordinn er ratanlegur i DOM-inum");

  const split = v.q(".pitch-split")[0];
  const pitchCol = v.q(".pitch-col")[0];
  const gf = v.q(".gf-wrap")[0];
  ok(!!split && !!pitchCol && !!gf, "forsenda: pitch-split / pitch-col / gf-wrap finnast");
  ok(split.contains(card), "bordinn er INNI i pitch-split — vid hlidina a vellinum");
  ok(!pitchCol.contains(card), "og EKKI i vallar-dalknum");
  ok(gf.parentElement === card.parentElement,
     "hann er SYSTKINI Fixtures-listans — sami dalkur");
  /* UNDIR Fixtures, ekki ofan vid: DOCUMENT_POSITION_FOLLOWING = 4.
     Systkinaprofid eitt segir ekkert um ROD, svo bædi eru nauðsynleg. */
  ok(!!(gf.compareDocumentPosition(card) & 4),
     "og hann kemur EFTIR Fixtures i skjalinu");

  /* JOFNUNIN: hvert holf i `srcRow` ma EKKI bera botn-margin. `S.muted`
     bar `marginBottom: 8` og med `alignItems:center` lyfti thad textanum
     um 4px medan nafnid sat kyrrt — thad var "lid og verd miklu ofar".  */
  const rows = v.q("div").filter(d => {
    const s = (d.getAttribute("style") || "").replace(/\s/g, "");
    return /align-items:center/.test(s) && /^[A-Z]/.test((d.textContent || "").trim())
      && /Save £/.test(d.textContent || "");
  });
  ok(rows.length >= 1, `forsenda: minst ein leikmanna-rod i bordanum (${rows.length})`);
  let bad = [];
  /* ALLIR AFKOMENDUR, EKKI ADEINS BEIN BORN (20.8.2026): `srcFrees` situr
     nu inni i `srcAct` (blokkin sem heldur tolu+hnappi saman svo hnappurinn
     fari ekki ut fyrir kassann). Med `r.children` einum hefdi vordurinn
     haett ad sja holfid sem hann var skrifadur fyrir — thogul thekju-tap. */
  for (const r of rows)
    for (const cell of [r.querySelectorAll("*")].flatMap(n => [...n])) {
      const s = (cell.getAttribute("style") || "").replace(/\s/g, "");
      const m = s.match(/margin-bottom:([^;]+)/);
      if (m && !/^0(px)?$/.test(m[1])) bad.push(`${cell.tagName}:${m[1]}`);
    }
  ok(bad.length === 0,
     "ekkert holf i rodinni ber botn-margin — lid/verd sitja a somu linu sem nafnid",
     bad.join(","));
  /* OG HOLFIN ERU RAUNVERULEGA MERKT — fullyrdingin ad ofan gaeti verid
     tom ef holfin baeru engan `style` yfirleitt.                        */
  const styled = rows[0] ? [...rows[0].children].filter(c => (c.getAttribute("style") || "").length > 0).length : 0;
  ok(styled >= 4, `forsenda: holfin bera raunverulega stil (${styled} af ${rows[0] ? rows[0].children.length : 0})`);
  ok(/Save £/.test(v.text()), "og talan um losad fe stendur");
  ok(!NANRE.test(v.text()), "ekkert NaN i bordanum");
}

/* ============================================================
   G. "PICK BEST XI" — TAKKINN SEM STILLIR BYRJUNARLIDID (21.8.2026)
   ============================================================
   VELIN (`src/bestteam.js`) ER ThEGAR PROFUD i `best-team.mjs` (84
   fullyrdingar, gradugt val borid vid 110.000 uppteldar leyfilegar XI).
   HER ER TENGINGIN PROFUD, OG HUN ER SER SPURNING: fer RETTA lidid a
   skjainn, med RETTA skorinu, og er thad AFTURKALLANLEGT.

   XI-IN ER TALIN UPP HER — VELIN ER EKKI SPURD. Profid les `≈ep` af
   HVERJU spjaldi (tolan sem notandinn ser), telur upp ALLAR C(15,11)=1.365
   hlutmengi, sier ut thau ologlegu og finnur hamarkid. Vaeri velin spurd
   i stadinn vaeri thetta sama utfaersla borin vid sjalfa sig.

   HVERS VEGNA "VONDA XI" ER FORSENDAN: proflidid er thegar nanast rett
   stillt, svo takki sem GERIR EKKERT hefdi stadist prof a thvi. Kaflinn
   byrjar thvi a `benchSwaps: {1:[[411,321]]}` — Haaland (haesta `ep` i
   hopnum) a bekknum. Sannreynt: sa hopur GAF „already the best XI" med
   fyrstu utgafu tengingarinnar, thvi `posOf` skiladi `element_type` (3) i
   stad stodu-lykils ("MID") og velin sleppti thvi HVERJU saeti — `xi:[]`,
   `changed:false`, ENGIN villa kastad. Fullyrdingin um "best" ma thvi
   aldrei byggja a `changed` einu.
   ============================================================ */
console.log("\n--- G. PICK BEST XI ---");
const idOfCard = c => START_IDS.find(id => (c.textContent || "").includes(byId[id].web_name));
const epOfCard = c => { const m = (c.textContent || "").match(/≈(\d+(?:\.\d)?)/); return m ? +m[1] : null; };
const bestBtn = v => v.q("button").find(b => /Pick best XI|Best XI/.test(b.textContent || ""));
/* TAEMANDI UPPTELJARI — OHAD VELINNI. */
function enumBestXi(ids, posOf, epOf) {
  let best = null;
  const rec = (i, chosen) => {
    if (chosen.length === XI_SIZE) {
      const cnt = { GK:0, DEF:0, MID:0, FWD:0 };
      for (const x of chosen) { const k = posOf(x); if (cnt[k] != null) cnt[k]++; }
      if (!legalFormation(cnt)) return;
      const t = +chosen.reduce((a, x) => a + (epOf(x) ?? 0), 0).toFixed(4);
      if (!best || t > best.t) best = { t, xi: chosen.slice() };
      return;
    }
    if (i >= ids.length || XI_SIZE - chosen.length > ids.length - i) return;
    rec(i + 1, [...chosen, ids[i]]); rec(i + 1, chosen);
  };
  rec(0, []);
  return best;
}
{
  const BAD = { captain: 411, benchSwaps: { 1: [[411, 321]] } };
  const v = await mount(BAD);
  const btn = bestBtn(v);
  ok(!!btn, "takkinn er a vellinum");
  ok(/Pick best XI/.test(btn?.textContent || ""), `merkimidinn er "Pick best XI" [${btn?.textContent}]`);
  ok(btn?.disabled === false, "og hann er VIRKUR utan Bench Boost");
  /* SETNINGIN UM BEKKJAR-RODINA VAR SYNILEG LINA OG ER NU I TOOLTIP-INU
     (beidni notandans 21.8.2026). STADREYNDIN ER SU SAMA og hun ma ekki
     hverfa: `benchSwaps` vixlar adeins `starter`-flaggi, svo takkinn getur
     ekki radad bekknum og ma ekki lata sem hann geri thad. Vordurinn var
     EKKI EYDDUR — hann faerdist a tooltip-id, thvi vordur sem er eytt er
     hvernig fullyrding verdur osonn i thogn.
     ThRENNT, OG ThAU SEGJA SITT HVAD: (1) synilega linan er farin,
     (2) tooltip-id ber fyrirvarann, (3) og MEKANISMINN (seat order) for
     med — annars hefdi seinni helmingur skyringarinnar tapast thegjandi. */
  const bTitle = btn?.getAttribute("title") || "";
  ok(!/sets who starts, not bench order/.test(v.text()),
     "SYNILEGA LINAN ER FARIN af skjanum");
  ok(/the bench order is not changed/.test(bTitle),
     "en TOOLTIP-ID a takkanum ber fyrirvarann", bTitle.slice(0, 120));
  ok(/seat order/.test(bTitle),
     "og MEKANISMINN fylgdi med — af hverju hann getur ekki radad bekknum");

  const before = new Set(onPitch(v).map(idOfCard));
  ok(before.size === 11, `forsenda: ellefu spjold a vellinum fyrir smell (${before.size})`);
  ok(!before.has(411), "forsenda: Haaland er A BEKKNUM — lidid er vitandi vits vitlaust");
  const eps = {}; cards(v).forEach(c => { const id = idOfCard(c); if (id != null) eps[id] = epOfCard(c); });
  const known = Object.values(eps).filter(x => x != null).length;
  ok(known === 15, `forsenda: vaent stig lesin af ollum 15 spjoldum (${known})`);
  ok(eps[411] > 3, `forsenda: Haaland ber HAETSU-flokks ep (${eps[411]}) — skiptin eru maelanleg`);

  await v.click(btn);
  const after = [...onPitch(v)].map(idOfCard);
  ok(after.length === 11, `eftir smell eru ellefu i byrjunarlidinu (${after.length})`);
  const cnt = { GK:0, DEF:0, MID:0, FWD:0 };
  after.forEach(id => { const k = posKey(byId[id]?.element_type); if (cnt[k] != null) cnt[k]++; });
  ok(legalFormation(cnt), `uppstillingin er LEYFILEG (${JSON.stringify(cnt)})`);
  ok(after.includes(411), "og Haaland er kominn INN — takkinn gerdi eitthvad");

  /* HAMARKID SJALFT, GEGN OHADRI UPPTALNINGU A BIRTU TOLUNUM. */
  const enumBest = enumBestXi(START_IDS.slice(),
    id => posKey(byId[id]?.element_type), id => eps[id]);
  ok(!!enumBest, "forsenda: uppteljarinn fann leyfilegt XI");
  const tot = +after.reduce((a, id) => a + (eps[id] ?? 0), 0).toFixed(4);
  const delta = +(enumBest.t - tot).toFixed(4);
  /* 0,05 er EIN NAMUNDUNAREINING a birtu tolunni (`≈x.y`), ekki slaki:
     jafntefli a birtu kvardanum ma leysast a hinn veginn, raunverulegt
     tap ma thad ekki.                                                   */
  ok(delta <= 0.05,
     `XI-id er HAMARK birtu vaentu stiganna (uppteljari ${enumBest.t}, skjar ${tot}, delta ${delta})`);
  ok(JSON.stringify([...after].sort((a,z)=>a-z)) === JSON.stringify(enumBest.xi.sort((a,z)=>a-z))
     || delta <= 0.05,
     "og thad er SAMA ellefu-mannalidid sem uppteljarinn valdi (eda jafngilt a birtu tolunum)");
  const t1 = v.text();
  ok(/best XI set/.test(t1), "toast segir ad lidid hafi verid stillt");
  ok(/Bench order is unchanged/.test(t1),
     "OG ad bekkjar-rodin se OHREYFD — takkinn lofar ekki thvi sem hann getur ekki gert");
  ok(!NANRE.test(t1), "ekkert NaN/undefined eftir smellinn");

  /* IDEMPOTENS: annar smellur ma ekki HRINGSNUA lidinu ne skra null-adgerd
     (sem las sem "you have planned N gameweeks", sja `benchSwapPairs`).  */
  await v.click(bestBtn(v));
  const twice = [...onPitch(v)].map(idOfCard);
  ok(JSON.stringify(twice.slice().sort((a,z)=>a-z)) === JSON.stringify(after.slice().sort((a,z)=>a-z)),
     "TVEIR SMELLIR = EINN: lidid er obreytt eftir annan smell");
  ok(/already the best XI/.test(v.text()),
     "og notandanum er sagt ad ekkert var ad gera — ekki blikkandi null-adgerd");

  /* AFTURKOLLUN: "Reset bench" hreinsar `benchSwaps[gw]` og thad er
     NAKVAEMLEGA thad sem takkinn skrifadi.                              */
  const reset = v.q("button").find(b => /^Reset bench$/.test((b.textContent || "").trim()));
  ok(!!reset, "\"Reset bench\" er their eftir smellinn (takkinn skrifadi i `benchSwaps`)");
  await v.click(reset);
  const undone = [...onPitch(v)].map(idOfCard).sort((a,z)=>a-z);
  /* „Reset bench" EYDIR `benchSwaps[gw]` OG ThVI FER BADI HANDVIRKA VIXLID
     OG ThAD SEM TAKKINN SKRIFADI — listinn er ALLTAF fullur mismunur fra
     GRUNNINUM (sja `squadForGw`), svo rett svar er GRUNN-uppstillingin,
     ekki „thad sem var a skjanum adur en eg smellti". Fullyrdingin er thvi
     um GRUNNINN; hin utgafan (== `before`) FELL, og hun atti ad falla.  */
  ok(JSON.stringify(undone) === JSON.stringify(START_IDS.slice(0, 11).sort((a,z)=>a-z)),
     `og hun eydir ALLRI uppstillingunni fyrir umferdina — grunn-XI er komid til baka [${undone.join(",")}]`);
  ok(!v.q("button").some(b => /^Reset bench$/.test((b.textContent || "").trim())),
     "og hnappurinn sjalfur er horfinn — `benchSwaps[gw]` er tomur");
}
/* BENCH BOOST: allir 15 skora, svo hvada 11 byrja er einskis virdi. */
{
  const v = await mount({ captain: 411, chips: { "bboost:1": 1 } });
  const btn = bestBtn(v);
  ok(!!btn, "BB: takkinn er afram their (falinn takki lesist eins og bilun)");
  ok(btn?.disabled === true, "BB: hann er SLOKKTUR");
  ok(/nothing to pick in Bench Boost/.test(btn?.textContent || ""),
     `BB: merkimidinn SEGIR af hverju [${btn?.textContent}]`);
  ok(/all 15 players score/.test(btn?.getAttribute("title") || ""),
     "BB: og tooltip-id gefur astaeduna — allir 15 skora");
  /* `!/sets who starts.../` STOD HER OG ER NU TAUTOLOGIA — strengurinn er
     hvergi i vidmotinu eftir 21.8., svo hun gat ekki fallid (CLAUDE.md 13).
     RETTA fullyrdingin er um BB-TOOLTIP-ID: fyrirvarinn um bekkjar-rodina
     a ekki vid thegar allir 15 skora, svo hann ma ekki vera i honum.     */
  ok(!/bench order is not changed/.test(btn?.getAttribute("title") || ""),
     "BB: fyrirvarinn um bekkjar-rodina er EKKI i tooltip-inu (hann a ekki vid)");
  const n0 = onPitch(v).length;
  await v.click(btn);
  ok(onPitch(v).length === n0 && !/best XI set/.test(v.text()),
     "BB: smellur gerir EKKERT — slokktur takki sem virkar er verri en enginn");
}

/* ============================================================
   H. "WHEN TO SELL" — TALAN ER INNAN LEIKMANNS (21.8.2026)
   ============================================================
   Velin (`sellTiming` -> `hardestRun`) er profud i `recommend.mjs` 5b og
   `buy-windows.mjs`. HER ER ORDALAGID VARID, OG ThAD ER RAUNVERULEGI
   RISKURINN: notandinn las Rice sem „verstan" 20.8.2026 ur nakvaemlega
   thessari tolu, thott gluggar hans vaeru bestu thrir af niu a sambaerilegu
   tolunni. Tolan er AFSTAED VID HANS EIGIN MEDALTAL.
   ThRJAR FULLYRDINGAR, ALLAR LESNAR AF SKJANUM:
     1. hvert per-umferdar tolu-holf ber GRUNN SINN i somu setningu,
     2. summan er ALDREI ber — hun er bundin honum OG lengdinni,
     3. rodin er TIMAROD, ekki staerd tolunnar (rodun eftir tolunni VAERI
        thver-leikmanna rodun i dulargervi).
   ============================================================ */
console.log("\n--- H. WHEN TO SELL ---");
{
  const v = await mount({ captain: 411 });
  const t = v.text();
  ok(/When to sell — hardest run ahead/.test(t), "kassinn er a skjanum");
  ok(/Relative to his own fixtures — this does not say sell him rather than someone else\. Sell order is the squad list's own ranking\./.test(t),
     "SKYRINGAR-SETNINGIN er ordrett their — hun segir berum ordum ad thetta se EKKI rodun");

  const heads = t.match(/Hardest run ahead: GW\d+–\d+/g) || [];
  /* ThEKJA ER FULLYRDING (CLAUDE.md 5b regla 1): faeri kassinn engar
     runur vaeru allar naestu fullyrdingar tomar.

     ThAKID KOM 25.8.2026 (`HARD_RUN_SHOW`, ad beidni notandans: "nog ad
     syna bara thra leikmenn, sem stysst er i erfida runnid"). Fullyrdingin
     var "minnst fimm" og hun var RETT thangad til thakid kom.
     TALAN ER LESIN UR UPPRUNANUM, EKKI SKRIFUD HER: fost 3 hefdi thagnad
     um leid og thakinu vaeri breytt, og tha maeldi profid annad thak en
     appid notar (sama aett og `wOf`/`marker`-afritid, CLAUDE.md 8).     */
  const CAP = +(readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8")
    .match(/const HARD_RUN_SHOW = (\d+);/) || [])[1];
  ok(Number.isFinite(CAP) && CAP > 0, `HARD_RUN_SHOW fannst i App.jsx (${CAP})`);
  ok(heads.length > 0 && heads.length <= CAP,
     `thekja: runur a skjanum og ekki fleiri en thakid (${heads.length} af ${CAP})`);
  /* ThAKID MA ALDREI VERA ThOGULT — listi sem er skorinn an ord les eins
     og "thetta eru allir" (CLAUDE.md 4, "no silent caps").             */
  if (heads.length === CAP) {
    ok(/Showing the \d+ whose hard run starts soonest; \d+ more are further out\./.test(t),
       "og thakid er SAGT a skjanum, ekki thagad");
  }
  /* OG INNTAKID ER SAGT: notandinn bad um ad thetta horfdi "bara a FFDR".
     Thad GERDI thad thegar (`ffdrSeries` les adeins `fixDifficulty`), en
     merkimidinn sagdi "Expected points" sem les eins og form/minutur seu
     inni. Fullyrdingin er a ThVI ad textinn segi hvad inntakid er.     */
  ok(/Fixture difficulty \(FFDR\) is the only input: no form, no minutes, no market line\./.test(t),
     "textinn segir berum ordum ad FFDR se EINA inntakid");

  const figs = t.match(/[−+]\d+\.\d\d pts\/GW/g) || [];
  const withBasis = t.match(/[−+]\d+\.\d\d pts\/GW vs his own average over GW\d+–\d+/g) || [];
  ok(figs.length === heads.length, `ein per-umferdar tala per runu (${figs.length} / ${heads.length})`);
  ok(withBasis.length === figs.length,
     `HVER per-umferdar tala ber GRUNN SINN — ekkert bert "pts/GW" (${withBasis.length} af ${figs.length})`);

  const sums = t.match(/[−+]\d+\.\d\d pts over/g) || [];
  const boundSums = t.match(/[−+]\d+\.\d\d pts over those \d+ gameweeks, for him/g) || [];
  ok(sums.length === heads.length, `ein summa per runu (${sums.length})`);
  ok(boundSums.length === sums.length,
     `HVER summa er bundin honum OG lengdinni — engin ber summa (${boundSums.length} af ${sums.length})`);

  /* RODIN ER TIMAROD. Stokkbreyting sem radar eftir `perGw` fellur her. */
  const froms = [...t.matchAll(/Hardest run ahead: GW(\d+)–\d+/g)].map(m => +m[1]);
  ok(froms.length >= 2 && froms.every((x, i) => i === 0 || froms[i - 1] <= x),
     `radirnar eru i TIMAROD, ekki eftir staerd tolunnar (${froms.join(",")})`);
  /* OG ROdIN VAERI ONNUR VAERI HUN EFTIR TOLUNNI — annars gaeti fullyrdingin
     ad ofan stadist af tilviljun.                                       */
  /* ============================================================
     ADGREININGIN ER HAD GOGNUM DAGSINS — OG ThAD VAR ThOGULT
     ============================================================
     Hér stod eingongu `pgs.some(... pgs[i-1] < x ...)`: ad tolurnar
     hoppi upp og nidur, sem sannar ad rodin se ekki eftir staerd.
     Su fullyrding er RETT thegar gognin geta adgreint — en 26.8.2026
     komu thrjar runur thar sem tolurnar voru TILVILJANAKENND
     LAEKKANDI, og tha fell hun a saklausum gognum. Deterministiskt,
     ekki flökt (keyrt thrisvar).

     Fullyrding sem getur fallid a rettum kodda er jafn slaem og su sem
     getur ekki fallid a rongum: hvor tveggja ThJALFAR MANN I AD HUNSA
     HANA. Sama aett og forsendan i `playerlist-live-cols` sem FPL
     felldi med thvi ad stadfesta GW1.

     Nu er hun TVISKIPT og segir HVOR greinin er virk:
       · geti gognin adgreint  -> upprunalega fullyrdingin, ohreyfd
       · geti thau thad ekki   -> ThAD ER SAGT, og rodunin er negld
                                  a KODANUM i stadinn (`run.from`
                                  fremst i samanburdinum)
     Seinni greinin er veikari — hun les koda en ekki skjainn — og hun
     er thess vegna EKKI sjalfgefin heldur adeins notud thegar hitt er
     omogulegt. */
  const pgs = [...t.matchAll(/[−+](\d+\.\d\d) pts\/GW/g)].map(m => +m[1]);
  const canTell = pgs.some((x, i) => i > 0 && pgs[i - 1] < x);
  if (canTell) {
    ok(true, `og hun er sannanlega EKKI rodud eftir tolunni (${pgs.join(",")} hoppa upp og nidur)`);
  } else {
    const appSrc = readFileSync(new URL("../src/App.jsx", import.meta.url).pathname, "utf8");
    ok(/a\.t\.run\.from\s*-\s*z\.t\.run\.from/.test(appSrc),
       `gogn dagsins geta EKKI adgreint (${pgs.join(",")} eru laekkandi) — `
       + "svo rodunin er negld a kodanum: `run.from` er FREMST i samanburdinum");
    ok(!/\.sort\([^)]*perGw/.test(appSrc),
       "og ekkert i rodununni les `perGw` (talan sem hun mætti EKKI radast eftir)");
  }

  ok(!/pts\/GW vs his own average over GWnull/.test(t), "engin null-umferd i grunninum");
  ok(!NANRE.test(t), "ekkert NaN/undefined i kassanum");

  /* MERKID ER BERT LIKA A MINUS: bert "0.35" lesist eins og plus. */
  ok(figs.every(s => /^[−+]/.test(s)), "hver tala ber MERKI (− eda +), ekki bera tolu");
}
/* `run: null` -> `why` ORDRETT. Flot leikjaskra (engir leikir) gefur
   „no stretch below his own average" — sem ma EKKI lesast eins og
   „vid vitum ekki" (CLAUDE.md: null er ekki null).                    */
{
  const v = await mount({ captain: 411 }, { patch: { "fixtures.json": { fixtures: [] } } });
  const t = v.text();
  ok(/When to sell — hardest run ahead/.test(t), "forsenda: kassinn er afram their an leikja");
  ok(!/Hardest run ahead: GW/.test(t), "forsenda: engin runa finnst (flot leikjaskra)");
  ok(/no stretch below his own average/.test(t),
     "`why` er birt ORDRETT — 'engin erfid runa' og 'vid vitum ekki' lesast EKKI eins");
  ok(!NANRE.test(t), "og ekkert NaN thott leikjaskrain se tom");
}

console.log(`\nVOLLURINN: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
