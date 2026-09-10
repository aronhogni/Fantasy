/* ============================================================
   KAUP-/SOLU-LISTINN — RODUNIN OG SKJARINN

   TVEIR KAFLAR SEM PROFA SITT HVAD:
     A. HREIN ROKFRAEDI (`src/buysell.js`) a TILBUNUM rodum thar sem
        svarid er thekkt FYRIRFRAM. Ekkert her snertir raungogn: raunveruleg
        leikjaskra getur ekki framkallad arekstur tveggja skipta i somu viku
        thegar mer hentar, og profid ma ekki bida eftir theim degi.
     B. SPJALDID LESID AF SKJANUM i jsdom med SEEDUDU `localStorage` —
        innslattur i stydda React-reiti er otraustur (CLAUDE.md 5).

   ThAD SEM ER VERID AD VERJA, i minnkandi rod eftir thvi hve dyrt vaeri
   ad brjota thad:

   1. STADAN ER HART SKILYRDI. Skipti i FPL eru likt fyrir likt. Tillaga
      um ad selja varnarmann og kaupa framherja er tillaga um adgerd sem
      er EKKI HAEGT ad framkvaema — verri en engin tillaga, thvi hun litur
      ut eins og rad.
   2. ThOGN ER SVAR OG VERDUR AD HALDAST ADSKILIN. „Bida tvaer vikur" og
      „ekki thess virdi" eru SITT HVAD, og notandinn bad beinlinis um
      sidara tilfellid. Vaeru veik skipti sett i vikurod vaeri thognin
      ordin ad tillogu.
   3. VANTANDI ER EKKI NULL. Vaent stig sem vantar ma ALDREI verda 0:
      thau eru summud, svo eitt 0 hverfur i summunni og les eins og
      maeling. Par an talna faer ENGA tillogu og er TALID.
   4. HVER MADUR EINU SINNI. Ad selja sama mann tvisvar er ekki haegt.
   5. FAERSLA MILLI VIKNA VERDUR AD VERA MERKT. Eitt friskipti a viku
      thydir ad annad skiptid faerist; thogul faersla er tillaga sem
      notandinn getur ekki rakid.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { planSwaps, BS_HORIZON, FT_CAP } from "../src/buysell.js";
import { pointsBasisFor, expPointsFor } from "../src/model.js";
import { SWAP_WEAK_NET } from "../src/swaptiming.js";

const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};
const hdr = t => console.log(`\n${"─".repeat(72)}\n${t}\n${"─".repeat(72)}`);

/* Raunverulegu leikmennirnir — lesnir EINU SINNI, efst, thvi bædi
   kafli A (raunverulegt `ep`) og kafli B (skjarinn) thurfa tha.       */
const PL = J("players.json").players;

/* Flat vaent stig per leikmann — einfaldasta formid thar sem svarid er
   reiknanlegt i hausnum. `ep` er fall, eins og appid sendir.          */
const flat = table => id => table[id];
const byWeek = table => (id, g) => (table[id] || [])[g - 1];

/* ============================================================
   A. ROKFRAEDIN
   ============================================================ */
hdr("A) PORUN, RODUN OG ThOGN — TILBUIN GOGN");

{
  /* 1. STADAN ER HART SKILYRDI ------------------------------------- */
  const r = planSwaps({
    sells: [{ id: 1, pos: 2 }], buys: [{ id: 2, pos: 4 }],
    ep: flat({ 1: 2, 2: 9 }), gw: 1, maxGw: 38,
  });
  ok("stada sem passar ekki gefur ENGA tillogu (DEF ut, FWD inn)",
     r.moves.length === 0 && r.weak.length === 0,
     `moves ${r.moves.length}, weak ${r.weak.length}`);
  ok("...og badir menn eru TALDIR sem opöraðir, ekki thagadir",
     r.noMatch.sell.includes(1) && r.noMatch.buy.includes(2));
}

{
  /* 2. BEIN UPPFAERSLA — betri i hverri viku -> NUNA ---------------- */
  const r = planSwaps({
    sells: [{ id: 1, pos: 3 }], buys: [{ id: 2, pos: 3 }],
    ep: flat({ 1: 2, 2: 8 }), gw: 7, maxGw: 38,
  });
  const m = r.moves[0];
  ok("betri i hverri viku -> \"now\" i thessari umferd",
     m && m.timing.verdict === "now" && m.week === 7, JSON.stringify(m?.timing));
  ok("...og nettoid er summa mismunarins yfir sjondeildarhringinn",
     m && Math.abs(m.net - 6 * BS_HORIZON) < 1e-9, `net ${m?.net}`);
}

{
  /* 3. KROSSUN — sa sem kemur inn er slaemur fyrst -> BIDA ---------- */
  const r = planSwaps({
    sells: [{ id: 1, pos: 3 }], buys: [{ id: 2, pos: 3 }],
    ep: byWeek({ 1: [6, 6, 1, 1, 1, 1], 2: [1, 1, 8, 8, 8, 8] }),
    gw: 1, maxGw: 38,
  });
  const m = r.moves[0];
  ok("krossun i leikjaskra -> \"wait\" med k > 0",
     m && m.timing.verdict === "wait" && m.timing.k > 0, JSON.stringify(m?.timing));
  ok("...og vikan er gw + k, ekki gw",
     m && m.week === 1 + m.timing.k, `week ${m?.week}, k ${m?.timing.k}`);
  ok("...og avinningur bidarinnar er JAKVAEDUR og talinn",
     m && m.timing.gain > 0, `gain ${m?.timing.gain}`);
}

{
  /* 4. VEIKT SKIPTI FAER ENGA VIKU --------------------------------- */
  const r = planSwaps({
    sells: [{ id: 1, pos: 1 }], buys: [{ id: 2, pos: 1 }],
    ep: flat({ 1: 4, 2: 4.2 }), gw: 3, maxGw: 38,
  });
  ok("skipti undir throskuldi lendir i \"weak\", ekki i vikurod",
     r.moves.length === 0 && r.weak.length === 1, `moves ${r.moves.length}`);
  /* EKKI `net <= SWAP_WEAK_NET` — thad endurtekur nakvaemlega skilyrdid
     sem SETTI parid i `weak` (`swaptiming.js`), svo thad getur ekki
     brugdist. Fullyrdingin er ad ThROSKULDURINN LIGGI ThAR SEM HANN
     SEGIST liggja: rett fyrir ofan hann verdur til tillaga.           */
  const justOver = planSwaps({
    sells: [{ id: 1, pos: 1 }], buys: [{ id: 2, pos: 1 }],
    ep: flat({ 1: 4, 2: 4 + (SWAP_WEAK_NET / BS_HORIZON) + 0.05 }), gw: 3, maxGw: 38,
  });
  ok(`throskuldurinn liggur vid ${SWAP_WEAK_NET}: rett fyrir ofan verdur til tillaga`,
     justOver.moves.length === 1 && justOver.weak.length === 0,
     `net ${justOver.moves[0]?.net ?? justOver.weak[0]?.net}`);
}

{
  /* 5. VANTANDI ER EKKI NULL ---------------------------------------
     ThETTA ER PROFSTEINNINN GEGN `?? 0`: vaeri vantandi tala talin sem
     0 fengi thetta par nettoid +48 og yrdi EFSTA tillagan a listanum.  */
  const r = planSwaps({
    sells: [{ id: 1, pos: 3 }], buys: [{ id: 2, pos: 3 }],
    ep: (id, g) => (id === 1 ? (g === 3 ? null : 0) : 8),
    gw: 1, maxGw: 38,
  });
  ok("ein vantandi vika gerir parid OVIST — engin tillaga",
     r.moves.length === 0 && r.weak.length === 0);
  ok("...og thad er TALID (`unknown`), ekki thagad i hel", r.unknown === 1,
     `unknown ${r.unknown}`);

  /* ============================================================
     OG ThESSI FULLYRDING VAR UM MITT EIGID `ep`, EKKI UM APPSINS
     ============================================================
     Kaflinn hér ad ofan gefur sjalfum ser `ep` sem SKILAR `null` og
     sannar sidan ad `null` se medhondlad rett. Thad er eiginleiki
     STUBBSINS. Appid sendi `expPoints`, sem skilar **0** thegar
     leikmadur a engan grunn (`!base` i `expPointsFor`) — ekki `null` —
     svo hlidid opnadist aldrei i raunkeyrslu og listinn bjo til
     „+21,5 stig" ur manni an gagna. **Profid maeldi annan heim en
     keyrslan** (sama aett og `buildTeamMetrics`-afritid).
     Fullyrdingin er nu um RAUNVERULEGA fallid: `pointsBasisFor` verdur
     ad greina thessa menn og their verda ad vera til i gognunum.      */
  const noBase = PL.filter(x => pointsBasisFor({ x: 0, p: x, basis: {} }) == null);
  ok(`raunverulegir leikmenn AN grunns eru til (${noBase.length} af ${PL.length})`,
     noBase.length > 0);
  ok("...og margir theirra eru OMERKTIR, svo their lita ut eins og allir adrir",
     noBase.filter(x => x.status === "a").length > 0,
     `omerktir ${noBase.filter(x => x.status === "a").length}`);
  ok("`expPointsFor` skilar 0 fyrir thessa menn (thess vegna dugdi stubburinn ekki)",
     (() => {
       const p = noBase[0];
       const v = expPointsFor({ p, fxs: [{ opp: 1, home: true, fdr: 3 }],
                                fixDifficulty: () => 3, teamId: p.team, basis: {} });
       return v === 0;
     })());
}

{
  /* 6. ARSTEKSTUR I VIKU — SIDARA SKIPTID FAERIST OG ER MERKT ------- */
  const r = planSwaps({
    sells: [{ id: 1, pos: 3 }, { id: 3, pos: 3 }],
    buys: [{ id: 2, pos: 3 }, { id: 4, pos: 3 }],
    ep: flat({ 1: 2, 2: 7, 3: 2, 4: 6 }), gw: 5, maxGw: 38,
  });
  ok("bædi skiptin komast a listann", r.moves.length === 2);
  ok("haerra nettoid faer FYRRI vikuna (graedgi, rekjanleg)",
     r.moves[0].net > r.moves[1].net && r.moves[0].week < r.moves[1].week,
     JSON.stringify(r.moves.map(m => [m.net, m.week])));
  ok("sidara skiptid er MERKT sem faert, ekki faert i thogn",
     r.moves[1].shifted === true && r.moves[0].shifted === false);
  ok("...og vikurnar eru adskildar (eitt friskipti a viku)",
     r.moves[0].week !== r.moves[1].week);
}

{
  /* 6b. BANKINN ER TALINN — „EITT A VIKU" VAR RANGT -----------------
     Fyrsta utgafa radarans leyfdi nakvaemlega eitt skipti i viku og
     hunsadi `freeTransfers`. Med tveimur bonkudum friskiptum sagdi hun
     thvi „bidðu viku eftir friskipti" um friskipti sem notandinn ATTI
     ThEGAR — rong radgjof sem kostar viku. FPL geymir upp i fimm.     */
  const three = ft => planSwaps({
    sells: [{ id: 1, pos: 3 }, { id: 3, pos: 3 }, { id: 5, pos: 2 }],
    buys: [{ id: 2, pos: 3 }, { id: 4, pos: 3 }, { id: 6, pos: 2 }],
    ep: flat({ 1: 2, 2: 7, 3: 2, 4: 6, 5: 2, 6: 5.5 }),
    gw: 5, maxGw: 38, freeTransfers: ft,
  });
  const wk = r => r.moves.map(m => m.week);
  ok("eitt friskipti -> ein vika hvert (5, 6, 7)",
     JSON.stringify(wk(three(1))) === JSON.stringify([5, 6, 7]),
     JSON.stringify(wk(three(1))));
  ok("TVO friskipti -> tvo i SOMU viku, ekki bid eftir thvi sem er til",
     JSON.stringify(wk(three(2))) === JSON.stringify([5, 5, 6]),
     JSON.stringify(wk(three(2))));
  ok("thrju friskipti -> oll thrju strax",
     JSON.stringify(wk(three(3))) === JSON.stringify([5, 5, 5]),
     JSON.stringify(wk(three(3))));
  ok("...og thau sem komast ad eru EKKI merkt sem faerd",
     three(3).moves.every(m => m.shifted === false));
  ok("engin friskipti -> ekkert i thessari viku, bankinn safnast (6, 7, 8)",
     JSON.stringify(wk(three(0))) === JSON.stringify([6, 7, 8]),
     JSON.stringify(wk(three(0))));

  /* ThAKID ER FPL-REGLA (5), EKKI OKKAR TALA. Sjo skipti med niu
     „friskiptum" verda ad lenda 5 + 1 + 1, thvi bankinn er thakadur.  */
  const many = (() => {
    const sells = [], buys = [], T = {};
    for (let i = 0; i < 7; i++) {
      sells.push({ id: 100 + i, pos: 3 }); buys.push({ id: 200 + i, pos: 3 });
      T[100 + i] = 2; T[200 + i] = 8 - i * 0.1;
    }
    return planSwaps({ sells, buys, ep: id => T[id], gw: 10, maxGw: 38,
                       freeTransfers: 9 });
  })();
  const perWeek = {};
  for (const m of many.moves) perWeek[m.week] = (perWeek[m.week] || 0) + 1;
  ok(`thakid ${FT_CAP} bindur: 7 skipti verda 5 + 1 + 1 (${JSON.stringify(perWeek)})`,
     perWeek[10] === FT_CAP && perWeek[11] === 1 && perWeek[12] === 1);
  ok("...og ekkert skipti tyndist i rodun",
     many.moves.length === 7 && many.moves.every(m => m.week != null));

  /* ============================================================
     ThAKID VERDUR AD BINDA A SOFNUNINNI LIKA — EKKI ADEINS A
     UPPHAFSBANKANUM (fannst med stokkbreytingu 9.9.2026)
     ============================================================
     Fyrsta profid a thakinu byrjadi med `freeTransfers: 9`, sem er
     klippt i 5 STRAX i upphafsgildinu — svo thakid a SOFNUNINNI var
     aldrei reynt og stokkbreytingin `bank + 1` (an `Math.min`) SLAPP
     I GEGN (0 fallnar). Tilfellid er raunverulegt: skipti sem oll vilja
     seinni viku lata bankann standa OSNERTAN og safnast, og an thaks
     leyfdi hann SEX i einni viku — sem FPL gerir ekki.
     Sama laerdomur og annars stadar i safninu: fullyrding sem tharf
     tvennt til ad bregdast (her: hatt upphafsgildi OG sofnun) er
     veikari en hun litur ut fyrir ad vera.                           */
  const idle = (() => {
    const sells = [], buys = [], T = {};
    for (let i = 0; i < 7; i++) {
      sells.push({ id: 100 + i, pos: 3 }); buys.push({ id: 200 + i, pos: 3 });
      T[100 + i] = [9, 9, 9, 1, 1, 1];                      // godur nuna
      T[200 + i] = [1, 1, 1, 12 - i * 0.1, 12 - i * 0.1, 12 - i * 0.1];
    }
    return planSwaps({ sells, buys, ep: (id, g) => T[id][g - 5],
                       gw: 5, maxGw: 38, freeTransfers: 3 });
  })();
  const idleWeeks = {};
  for (const m of idle.moves) idleWeeks[m.week] = (idleWeeks[m.week] || 0) + 1;
  ok("forsenda: oll sjo vilja SEINNI viku, svo bankinn stendur osnertur",
     idle.moves.length === 7 && idle.moves[0].timing.k === 3);
  ok(`bankinn safnast 3 -> 4 -> 5 og STOPPAR thar (${JSON.stringify(idleWeeks)})`,
     idleWeeks[8] === FT_CAP && idleWeeks[9] === 1 && idleWeeks[10] === 1);
}

{
  /* 7. HVER MADUR EINU SINNI --------------------------------------- */
  const r = planSwaps({
    sells: [{ id: 1, pos: 3 }],
    buys: [{ id: 2, pos: 3 }, { id: 4, pos: 3 }],
    ep: flat({ 1: 2, 2: 9, 4: 8 }), gw: 2, maxGw: 38,
  });
  ok("einn solumadur -> eitt skipti, thott tveir kaupkostir seu i bodi",
     r.moves.length === 1 && r.moves[0].inId === 2,
     JSON.stringify(r.moves.map(m => [m.outId, m.inId])));
}

{
  /* 8. ENGIN FRISKIPTI -> BIDA EINA VIKU --------------------------- */
  const r = planSwaps({
    sells: [{ id: 1, pos: 3 }], buys: [{ id: 2, pos: 3 }],
    ep: flat({ 1: 2, 2: 8 }), gw: 4, maxGw: 38, freeTransfers: 0,
  });
  const m = r.moves[0];
  ok("an friskipta segir reglan BIDA eina viku og NEFNIR astaeduna",
     m && m.timing.verdict === "wait" && m.timing.k === 1
     && m.timing.why === "noFreeTransfer", JSON.stringify(m?.timing));
}

{
  /* 9. SJONDEILDARHRINGURINN ENDAR VID `maxGw` --------------------- */
  const r = planSwaps({
    sells: [{ id: 1, pos: 3 }], buys: [{ id: 2, pos: 3 }],
    ep: flat({ 1: 2, 2: 8 }), gw: 37, maxGw: 38,
  });
  /* ENGIN ThRISKIPT SKILYRDI HER. Fyrsta utgafa thessarar linu var
     `r.moves.length === 0 ? (... || true) : ...` — `|| true` gerdi hana
     ALLTAF SANNA i annarri greininni, nakvaemlega tautologian sem
     CLAUDE.md kafli 13 lysir. Svarid er thekkt fyrirfram: tvaer vikur
     eftir gefa sjondeildarhring 2 og netto (8-2)*2 = 12, sem er yfir
     throskuldi, svo tillagan VERDUR ad vera til.                      */
  ok("tvaer vikur eftir af timabilinu -> sjondeildarhringur 2, engin uppspuni",
     r.moves.length === 1 && r.moves[0].timing.horizon === 2
     && Math.abs(r.moves[0].net - 12) < 1e-9,
     JSON.stringify(r.moves[0]?.timing || r.weak[0]));
  const r1 = planSwaps({
    sells: [{ id: 1, pos: 3 }], buys: [{ id: 2, pos: 3 }],
    ep: flat({ 1: 2, 2: 8 }), gw: 38, maxGw: 38,
  });
  ok("EIN vika eftir -> engin timasetningar-spurning (engin tillaga)",
     r1.moves.length === 0 && r1.weak.length === 0 && r1.unknown === 1);
}

/* ============================================================
   B. SPJALDID A SKJANUM
   ============================================================ */
hdr("B) SPJALDID LESID AF SKJANUM — SEEDAD ASTAND");

const dom = new JSDOM("<!doctype html><div id=root></div>",
                      { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.fetch = async url => {
  const n = String(url).split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};

/* TVEIR RAUNVERULEGIR MIDJUMENN — sa dyrasti og sa odyrasti sem hafa
   spilad, svo skiptin seu orugglega yfir throskuldi og tillagan birtist.
   VALID ER LEITT UR GOGNUNUM, ekki skrifad: hardkodud id urelidast vid
   naesta tímabil (sama regla og felldi linutolurnar ur CLAUDE.md).    */
const mids = PL.filter(p => p.element_type === 3 && (p.minutes || 0) > 0)
  .sort((a, b) => (b.ep_next || 0) - (a.ep_next || 0));
const good = mids[0], poor = mids[mids.length - 1];
ok(`forsenda: tveir raunverulegir midjumenn (${poor?.web_name} -> ${good?.web_name})`,
   !!good && !!poor && good.id !== poor.id);
localStorage.setItem("fpl_buysell_v1",
  JSON.stringify({ sell: [poor.id], buy: [good.id] }));

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 500)); });

/* Umferdin sem er verid ad skipuleggja — LEIDD ur leikjaskranni, ekki
   skrifud (fost tala ureldist thegjandi).                             */
const gwNow = (() => {
  const fx = J("fixtures.json");
  const list = Array.isArray(fx) ? fx : fx.fixtures;
  const open = list.filter(f => !f.finished && !f.finished_provisional)
    .map(f => f.event).filter(Number.isFinite);
  return open.length ? Math.min(...open) : 1;
})();

const card = [...document.querySelectorAll("section")]
  .find(s => /Buy \/ sell — when to make the move/.test(s.textContent || ""));
ok("spjaldid er a skjanum", !!card);
const txt = () => card?.textContent || "";

ok("badir dalkarnir eru their (Selling / Buying)",
   /Selling/.test(txt()) && /Buying/.test(txt()));
ok("solu-dalkurinn segir ad hann lesi HOPINN", /from your squad/.test(txt()));

/* SEEDUDU MENNIRNIR SJALFIR — an theirra vaeri spjaldid tomt og allar
   fullyrdingar her ad nedan tomar med (CLAUDE.md 5b).                */
ok(`seedadi solumadurinn sest (${poor.web_name})`, txt().includes(poor.web_name));
ok(`seedadi kaupmadurinn sest (${good.web_name})`, txt().includes(good.web_name));

/* NIDURSTADAN — ANNADHVORT tillaga med viku EDA thogn med astaedu.
   Baedi eru gild svor og hvorugt ma vera autt.                       */
const hasMove = /GW\d+/.test(txt());
const hasWeak = /No change worth making/.test(txt());
ok("spjaldid kvedur upp ur: annadhvort vika eda \"engin breyting\"",
   hasMove || hasWeak, txt().slice(0, 160));

if (hasMove) {
  /* HER STOD `ok("tillagan ber viku-merki", /GW\d+/.test(txt()))` INNI i
     `if (hasMove)`, thar sem `hasMove` ER nakvaemlega sama prof og
     ekkert breyttist a milli — hun gat ekki brugdist. Rett spurning er
     hvort vikan a merkinu se RAUNHAEF: innan timabilsins og ekki fyrir
     thessa umferd.                                                    */
  const weeks = [...card.querySelectorAll("span")]
    .map(x => (x.textContent || "").trim())
    .filter(x => /^GW\d+$/.test(x)).map(x => Number(x.slice(2)));
  ok(`viku-merkin eru raunhaef umferdanumer (${weeks.join(", ")})`,
     weeks.length > 0 && weeks.every(w => w >= 1 && w <= 38));
  ok("...og engin tillaga er sett a umferd sem er ThEGAR lidin",
     weeks.every(w => w >= gwNow), `nuverandi umferd ${gwNow}`);
  ok("...og hun segir HVERS VEGNA (nuna eda bida)",
     /Do it now|Wait \d+ gameweek/.test(txt()), txt().slice(0, 200));
  /* FFDR-BRAUTIRNAR BADAR — thad var beinlinis bedid um.            */
  const labels = [...card.querySelectorAll("span")]
    .map(s => (s.textContent || "").trim().toLowerCase());
  ok("FFDR-brautin er synd fyrir BADA (out og in)",
     labels.includes("out") && labels.includes("in"),
     labels.filter(l => l.length <= 3).slice(0, 8).join(","));
}

/* NOTAN VERDUR AD SEGJA HVAD ER MAELT OG HVAD ER STILLING — annars les
   `SWAP_TAU` eins og maeld tala.                                     */
ok("notan segir ad throskuldurinn se STILLING, ekki maeling",
   /a dial on how often it speaks, not a measured constant/.test(txt()));
ok("notan neitar orakel-tolu berum ordum",
   /There is no best-week number/.test(txt()));
ok("notan segir ad meidsli komi INN gegnum vaent stig, ekki hedan",
   /the timing study itself ran with everyone fit/.test(txt()));

/* ============================================================
   MEIDDUR MADUR VERDUR AD SEGJA SIG SJALFUR
   ============================================================
   Rasin sem notandinn bad um („uppfaerist ... t.d. meidsli") liggur
   gegnum `expPointsFor`, sem ber tiltaekileika — og hun ein er ekki
   nog: flaggadur madur faer laegri vaent stig og lendir i „No change
   worth making", sem er SATT um toluna og VILLANDI um astaeduna.
   Profad a RAUNVERULEGUM flogguðum manni, thvi flaggid er FPL-svid og
   agiskun a thvi vaeri onnur villa.                                  */
{
  const flagged = PL.filter(x => x.element_type === 3 && x.status && x.status !== "a")
    .sort((a, b) => (b.minutes || 0) - (a.minutes || 0))[0];
  ok(`forsenda: raunverulegur flaggadur midjumadur (${flagged?.web_name}, `
     + `status ${flagged?.status})`, !!flagged);
  localStorage.setItem("fpl_buysell_v1",
    JSON.stringify({ sell: [poor.id], buy: [flagged.id] }));
  /* NYTT HYLKI, EKKI `root.render` A SAMA — spjaldid les `localStorage`
     i MOUNT-effekti, svo endurteikning a sama root les EKKI nyja gildid.
     Fyrsta utgafa thessa kafla gerdi thad og maeldi thvi GAMLA parid
     medan hun taldi sig maela thad nyja: profid maeldi annan heim en
     thad sagdist maela (sama aett og `buildTeamMetrics`-afritid).
     `createRoot` a SAMA hylki tvisvar gefur auk thess React-vidvorun. */
  const host2 = document.createElement("div");
  document.body.appendChild(host2);
  const root2 = createRoot(host2);
  await act(async () => { root2.render(React.createElement(App)); });
  await act(async () => { await new Promise(r => setTimeout(r, 500)); });
  const card2 = [...host2.querySelectorAll("section")]
    .find(x => /Buy \/ sell — when to make the move/.test(x.textContent || ""));
  const t2 = card2?.textContent || "";
  ok("flaggadi madurinn sest a spjaldinu", t2.includes(flagged.web_name));
  ok("...og flaggid sjalft er synilegt (INJ / SUS / GONE / ?)",
     /\b(INJ|SUS|GONE)\b/.test(t2) || /\?\s*\d+%/.test(t2),
     t2.slice(0, 200));
  /* FPL-FRETTIN ER TITILLINN — engin agiskun, hans eigin ordalag.   */
  /* ALLAR flaggmerkingar a spjaldinu, ekki su fyrsta — solumadurinn
     getur sjalfur verid flaggadur, og `find` hefdi tha lesid RANGA
     merkid og fullyrdinguna med.                                     */
  const badges = [...(card2?.querySelectorAll("span") || [])]
    .filter(x => /^(INJ|SUS|GONE|\?|!)( \d+%)?$/.test((x.textContent || "").trim()));
  ok(`flaggmerki fundust a spjaldinu (${badges.length})`, badges.length > 0);
  ok("hvert flaggmerki ber TITIL — thogult merki segir ekkert",
     badges.length > 0 && badges.every(b => (b.getAttribute("title") || "").length > 0));
  ok("og titill okkar manns er FPL-FRETTIN sjalf, ordrett",
     !flagged.news || badges.some(b => b.getAttribute("title") === flagged.news),
     `leitad ad ${JSON.stringify(flagged.news)}, fannst `
     + JSON.stringify(badges.map(b => b.getAttribute("title"))));
}

/* TOM HLID — GILT ASTAND SEM MA EKKI ThEGJA. Spjaldid a ad SEGJA hvad
   vantar; „ekkert her" an astaedu les eins og bilun.
   Profad a HREINA fallinu, ekki med annarri jsdom-teikningu: fyrsta
   utgafan bjo til `dom2` og notadi hann aldrei — thogul tom fullyrding
   i profi sem er skrifad gegn tomum fullyrdingum.                     */
{
  const empty = planSwaps({ sells: [], buys: [], ep: flat({}), gw: 5, maxGw: 38 });
  ok("tom hlid gefur tomar nidurstodur en ekki hrun",
     empty && empty.moves.length === 0 && empty.weak.length === 0
     && empty.unknown === 0);
  ok("...og spjaldid ber setninguna sem utskyrir thad",
     /Put at least one player in each column/.test(
       readFileSync(new URL("src/BuySell.jsx", REPO).pathname, "utf8")));
}

console.log(`\nKAUP-/SOLU-LISTINN: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
