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
     vitneskjan "hverjir eru XI-in".                                    */
  const lighter = onPitch(v).filter(c => /rgba\(255,\s*255,\s*255,\s*0?\.94\)/.test(c.getAttribute("style") || ""));
  ok(lighter.length === 4, `fjorir bekkjarmenn eru enn adgreindir (ljosari) (${lighter.length})`);

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
   Bordinn kviknar adeins med RAUNVERULEGRI planun (sja
   `planner-idle.mjs`), svo bekkjar-vixl i ollum sex umferdunum er
   FORSENDA hers kafla, ekki skraut.                                    */
console.log("\n--- F. 'Never in your XI' ---");
{
  const bs = {}; for (let g = 1; g <= 6; g++) bs[g] = [[411, 321]];
  const v = await mount({ captain: 411, benchSwaps: bs });
  ok(/Never in your XI/.test(v.text()), "forsenda: bordinn birtist");

  /* KASSINN SJALFUR, EKKI HAUS-DIVID OG EKKI DALKURINN UTAN UM HANN.
     Fyrsta utgafa profsins tok `banner.parentElement` — sem er SIDE-
     DALKURINN, og hann INNIHELDUR Fixtures-listann. Thess vegna var
     `compareDocumentPosition` 10 (CONTAINS+PRECEDING), ekki 4, og
     `gf.parentElement.contains(card)` var satt af annarri astaedu en
     profid taldi. Kassinn er sa YSTI div sem BYRJAR a hausnum OG ber
     tolurnar — hausinn einn ber thaer ekki, dalkurinn byrjar a "Fixtures". */
  const card = v.q("div").find(d => {
    const t = (d.textContent || "").trim();
    return /^Never in your XI/.test(t) && /frees up to £/.test(t);
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
      && /frees up to £/.test(d.textContent || "");
  });
  ok(rows.length >= 1, `forsenda: minst ein leikmanna-rod i bordanum (${rows.length})`);
  let bad = [];
  for (const r of rows)
    for (const cell of [...r.children]) {
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
  ok(/frees up to £/.test(v.text()), "og talan um losad fe stendur");
  ok(!NANRE.test(v.text()), "ekkert NaN i bordanum");
}

console.log(`\nVOLLURINN: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
