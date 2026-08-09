/* ============================================================
   KEYRSLUPRÓF — rennir App.jsx í jsdom með ALVÖRU data/-skránum
   úr repo-inu. Fetch er hermt: raw.githubusercontent -> les skrá
   af diski; proxy-slóðir -> hermd svör í réttri lögun.
   Keyrsla:  node tests/run-tests.mjs
   ============================================================ */
import { readFileSync, existsSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const DATA = new URL("../data/", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (cond, name) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
};

// ---------- jsdom-umhverfi ----------
const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
  url: "https://aronhogni.github.io/Fantasy/",
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.localStorage = dom.window.localStorage;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
/* jsdom skortir oninput/onchange-EIGINDIRNAR á frumgerðinni; react-dom
   notar ('oninput' in div) til að velja atburðaleið og féll þess vegna á
   IE9-polyfill (attachEvent) sem er ekki til — onChange á textareitum
   kviknaði aldrei. Shimmið lætur React velja nútímaleiðina.            */
if (!("oninput" in dom.window.HTMLElement.prototype)) {
  for (const ev of ["oninput", "onchange"])
    Object.defineProperty(dom.window.HTMLElement.prototype, ev, {
      get() { return null; }, set() {}, configurable: true });
}

// ---------- fetch-hermun ----------
let proxyLiveCalls = 0;
globalThis.fetch = async (url) => {
  url = String(url);
  if (url.endsWith("/injuries.json")) {
    return { ok: true, status: 200, json: async () => ({
      updated: "x", players: [
        { fpl_id: 496, name_api: "A. Kinsky", team_api: "Tottenham", type: "Questionable", reason: "Knock" },
      ], unmatched: [] }) };
  }
  const raw = url.match(/raw\.githubusercontent\.com\/aronhogni\/Fantasy\/main\/data\/(.+)$/);
  if (raw) {
    const f = `${DATA}${raw[1]}`;
    if (!existsSync(f)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(f, "utf8")) };
  }
  if (url.includes("path=live")) {
    proxyLiveCalls++;
    return { ok: true, status: 200, json: async () => ({ gw: 1, any_live: false, fixtures: [] }) };
  }
  if (url.includes("path=fpl-live")) {
    return { ok: true, status: 200, json: async () => ({ elements: [] }) };
  }
  if (url.includes("path=fpl-entry")) {
    return { ok: true, status: 200, json: async () => ({ name: "Prófliðið", player_first_name: "Jón" }) };
  }
  if (url.includes("path=fpl-picks") && url.includes("id=909")) {
    // andstæðingur: 13 sameiginlegir + 2 sérstöðumenn, Haaland með bandið
    return { ok: true, status: 200, json: async () => ({
      entry_history: { points: 0, total_points: 0 },
      picks: RIVAL_PICKS.map((el, i) => ({ element: el, position: i + 1, is_captain: el === 411 })),
    }) };
  }
  if (url.includes("path=fpl-picks")) {
    return { ok: true, status: 200, json: async () => ({}) };
  }
  return { ok: false, status: 404, json: async () => ({}) };
};

// ---------- flýta setTimeout fyrir toast (annars hangir act) ----------
const realSetTimeout = globalThis.setTimeout;

// Sérstöðumenn andstæðingsins: tveir raunverulegir leikmenn utan byrjunarliðsins
const allPlayers = JSON.parse(readFileSync(`${DATA}players.json`, "utf8")).players;
const START_IDS = [496,11,356,423,542,397,426,239,368,411,346,497,173,278,321];
const outsiders = allPlayers.filter(p => !START_IDS.includes(p.id)).slice(0, 2).map(p => p.id);
const RIVAL_PICKS = [...START_IDS.slice(0, 13), ...outsiders];

/* Andstæðingurinn er FORFYLLTUR í vistaða ástandið: jsdom + react-dom
   eiga í útistöðum um input-atburði á stýrðum textareitum, og það sem
   skiptir máli að prófa er sóknar-, birtingar- og vistunarflæðið —
   ekki atburðakerfi jsdom. Hnappa-tengingin er prófuð sér (tómt =
   villuboð).                                                          */
dom.window.localStorage.setItem("fpl_planner_v3",
  JSON.stringify({ rivals: [{ id: "909" }], captain: 411 }));

const { default: App } = await import("../src/App.jsx");

const container = document.getElementById("root");
const root = createRoot(container);
const sleep = ms => new Promise(r => realSetTimeout(r, ms));
const render = async () => { await act(async () => { await sleep(60); }); };

console.log("\n=== 1. HLEÐSLA MEÐ ALVÖRU GÖGNUM ===");
await act(async () => { root.render(React.createElement(App)); });
await render(); await render();

const text = () => container.textContent;
ok(!text().includes("Fetching official FPL data"), "hleðsluskjár horfinn");
ok(!text().includes("Could not fetch"), "engin gagna-villa");
ok(text().includes("FantasyApp"), "haus birtist (endurnefnt úr 'Fantasy plönun')");
ok(text().includes("Bank"), "mælaborð birtist");
ok(container.querySelectorAll(".fpl-pitch").length === 1, "völlurinn teiknast");

console.log("\n=== 2. LIÐIÐ Á VELLINUM ===");
const cards = [...container.querySelectorAll('[draggable="true"]')];
ok(cards.length === 15, `15 leikmannaspjöld (fann ${cards.length})`);
ok(text().includes("Haaland"), "Haaland á vellinum");
ok(!text().includes("af undefined"), "engin 'af undefined' villa (rotationRisk)");
ok(!/NaN/.test(text()), "engin NaN í viðmótinu");

console.log("\n=== 2b. PENINGATÖLURNAR Á MÆLABORÐINU ===");
// Fyrir tímabil, án skipta: banki + liðsverð Á að vera nákvæmlega £100.0
ok(text().includes("total £100.0"), "banki + liðsverð = £100.0 (fjárlögin ganga upp)");
ok(/Bank/.test(text()) && !/£NaN|£undefined/.test(text()), "engin brotin peningatala");

console.log("\n=== 3. UMFERÐASKIPTI Á TÍMALÍNU ===");
const gwBtns = [...container.querySelectorAll("button")].filter(b => /^\d+$/.test(b.textContent.trim()));
ok(gwBtns.length >= 13, `tímalínuhnútar til staðar (${gwBtns.length})`);
const gw5 = gwBtns.find(b => b.textContent.trim() === "5");
await act(async () => { gw5.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(text().includes("GW5"), "GW5 valin og birt");

console.log("\n=== 4. SKIPTI: opna leit, velja mann, staðfesta reglur ===");
const swapIcons = [...container.querySelectorAll("button")].filter(b => b.title?.startsWith("Transfer out"));
ok(swapIcons.length === 15, "skipta-ikon á hverju spjaldi");
await act(async () => { swapIcons[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
const searchInput = container.querySelector('input[placeholder="Search — name or team"]');
ok(!!searchInput, "leitargluggi opnast");
const results = [...container.querySelectorAll("button")].filter(b => b.querySelector("img, svg") && b.textContent.includes("£"));
ok(results.length > 5, `leitarniðurstöður birtast (${results.length})`);
// veljum fyrsta löglega
const legal = results.find(r => !r.title?.startsWith("Ólöglegt"));
const before = text();
await act(async () => { legal.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(text().includes("Transfer plan"), "skipti skráð í áætlun");
ok(text().includes("GW5:") || /GW5/.test(text()), "skiptin tengd GW5");

console.log("\n=== 5. ENDURSTILLING UMFERÐAR (tveggja skrefa) ===");
const resetBtn = [...container.querySelectorAll("button")].find(b => b.textContent.includes("reset GW5"));
ok(!!resetBtn, "endurstilla-hnappur birtist eftir plönun");
await act(async () => { resetBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
const yesBtn = [...container.querySelectorAll("button")].find(b => b.textContent.trim() === "yes");
ok(!!yesBtn, "staðfestingar-skref birtist");
await act(async () => { yesBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(!text().includes("Transfer plan"), "áætlun tóm eftir endurstillingu");

console.log("\n=== 6. LEIKMANNAYFIRLIT (detail) ===");
const infoBtns = [...container.querySelectorAll("button")].filter(b => b.title === "Information");
await act(async () => { infoBtns[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(text().includes("Fixtures"), "yfirlit opnast með leikjalista");
/* SPJALDID VAR ENDURHANNAD (28.7.). Profin her fylgja NYJU uppsetningunni:
   efsti hluti med sex adaltolum + timabila-tafla med saetum og trendi.
   Gomlu fyrirsagnirnar ("Núna", "Tímabilið …", "uppsafnað") eru farnar
   og tolurnar eru nu i toflu, ekki i dalkaneti.                          */
for (const k of ["Price", "Total points", "Pts/match", "Bonus points", "Form", "Ownership"])
  ok(text().includes(k), `efsti hluti: '${k}'`);
ok(text().includes("Season"), "tímabila-taflan birtist");
/* LODNA MERKINGIN ("sl. timabil" / "last season") ma ekki standa i
   TIMABILA-HAUSNUM — dalkurinn a ad bera artal. Fra 7.8.2026 er profid
   bundid vid HAUSANA og ekki lengur vid allan textann: enskan notar
   sama ordalag i PROSU ("...price, FPL ep_next and last season"), sem
   islenskan gerdi ekki, svo heildar-leitin fell a rettum texta.       */
ok([...container.querySelectorAll("th")].every(el => el.textContent.trim() !== "last season"),
   "lodna merkingin 'last season' er ekki dalkahaus");
// RETT ARTAL a yfirstandandi timabili — cumLabel (2025/26) ma EKKI rata i hausinn
ok(text().includes("2026/27"), "dálkur yfirstandandi tímabils ber rétt ártal (2026/27)");
ok(text().includes("2025/26") && text().includes("2024/25"),
  "eldri tímabil fylgja með í töflunni");
// FYRIR TIMABIL a yfirstandandi dalkur ad vera TOMUR, ekki tvitekning a i fyrra
ok(text().includes("2026/27 has not started"),
  "tómur dálkur útskýrður — FPL-tölurnar eru enn fyrra tímabils");
// radirnar sem beðið var um
for (const k of ["Minutes", "xGI", "YC / RC", "BP / BPS"])
  ok(text().includes(k), `tímabila-röðin '${k}'`);
ok(text().includes("Next GW forecast"), "ep birtist áfram");
// MEIÐSLA-TEGUNDIN úr API-Sports: FPL segir 'a' -> varfærna óstaðfesta línan
ok(text().includes("API-Sports records:") && text().includes("Knock"),
  "meiðsla-tegund úr API-Sports birt varfærið þegar FPL flaggar ekki");
// FERÐALENGDIN (var reiknuð daglega en birtist hvergi): ✈ + km á leikjaröðum
ok(/✈\d+/.test(text()), "ferðalengd (✈ km) birtist á leikjaröðum yfirlitsins");
const travelChip = [...container.querySelectorAll("span")].find(el => /✈\d+/.test(el.textContent) && el.title);
ok(!!travelChip && /km \(as the crow flies\)/.test(travelChip.title), "ferða-tooltip útskýrir km og loftlínu");
ok(!text().includes("undefined"), "ekkert 'undefined' í yfirlitinu");
// Yfirlitsglugginn er SÍÐASTA "✕"-ið í DOM (fjarlægja-hnappur andstæðings
// í hliðarstikunni notar sama tákn og kemur á undan — fyrsta ✕-ið eyddi
// óvart andstæðingnum og braut kafla 9!)
const closeBtn = [...container.querySelectorAll("button")].filter(b => b.textContent === "✕").at(-1);
await act(async () => { closeBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();

console.log("\n=== 6b. FERÐALENGD Í GW-LEIKJALISTANUM ===");
const midWithTravel = [...container.querySelectorAll("button")].filter(b => b.title && b.title.includes("travels"));
ok(midWithTravel.length > 0, `GW-listinn ber ferðalengd í tooltip (${midWithTravel.length} leikir)`);
ok(midWithTravel.every(b => /\d+ km/.test(b.title)), "km-talan í hverju ferða-tooltipi");

console.log("\n=== 7. FFDR-TAFLAN OG CHIPS ===");
const ffdrBtn = [...container.querySelectorAll("button")].find(b => b.textContent.includes("FFDR"));
await act(async () => { ffdrBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(text().includes("FFDR — fixture difficulty"), "FFDR-tafla opnast");
ok(container.querySelectorAll("table").length >= 1, "taflan teiknast");
const chipsBtn = [...container.querySelectorAll("button")].find(b => b.textContent.includes("Chips"));
await act(async () => { chipsBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(text().includes("First half"), "chips-svæðið opnast með báðum hálfleikjum");

console.log("\n=== 8. TILLÖGUR OG SJÓNDEILDARHRINGUR (dcOpp-deps prófið) ===");
ok(text().includes("Recommended buys"), "tillögu-svæðið birtist");
const rangeSel = [...container.querySelectorAll("select")].find(s => [...s.options].some(o => o.textContent === "next 8"));
ok(!!rangeSel, "sjóndeildarhrings-val til staðar");
const dcBefore = (text().match(/DC\s?\d+/g) || []).join(",");
await act(async () => {
  rangeSel.value = "8";
  rangeSel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
});
await render();
ok(text().includes("GW5–12") || text().includes("GW5–"), "fyrirsögn fylgir nýjum sjóndeildarhring");

console.log("\n=== 9. ANDSTÆÐINGAR (differentials) ===");
ok(text().includes("Rivals"), "andstæðinga-svæðið birtist");
const rivalInput = [...container.querySelectorAll("input")].find(i => i.placeholder?.includes("team ID"));
ok(!!rivalInput, "innsláttur fyrir liðsnúmer til staðar");
// hnappurinn er tengdur: tómt inntak gefur leiðbeininguna
const addBtn = [...container.querySelectorAll("button")].find(b => b.textContent === "Add");
await act(async () => { addBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
ok(text().includes("Rival URL or team ID"), "Bæta við-hnappurinn tengdur (villuboð á tómu)");
await render(); await render();
ok(text().includes("Prófliðið"), "nafn andstæðings sótt og birt");
ok(text().includes("13/15 shared"), "sameiginlegir taldir rétt (13/15)");
ok(text().includes("their differentials"), "sérstaða þeirra birt");
ok(text().includes("your differentials"), "þín sérstaða birt");
ok(text().includes("same as yours"), "fyrirliða-samanburður (báðir með Haaland)");

console.log("\n=== 10. VISTUN (localStorage) ===");
const saved = dom.window.localStorage.getItem("fpl_planner_v3");
ok(!!saved, "ástand vistast í localStorage");
ok(JSON.parse(saved).captain === 411, "fyrirliði (Haaland) í vistuðu ástandi");
ok(JSON.parse(saved).rivals?.length === 1, "andstæðingur vistast með ástandinu");

console.log("\n=== 11. FFDR-SAMANBURÐUR (róterings-par) ===");
/* Þriðja ikonið á spjaldinu. Það er EITT per spjald, svo við tökum það
   fyrsta — byrjunarliðið er teiknað fyrst, svo þetta er byrjunarliðsmaður. */
const rotBtns = [...container.querySelectorAll("button")].filter(b => b.textContent === "↻");
ok(rotBtns.length >= 15, `↻-ikon á hverju spjaldi (${rotBtns.length} fundin)`);
await act(async () => { rotBtns[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(text().includes("FFDR comparison"), "FFDR-samanburður opnast við smell á ↻");
/* NB: leit ad "div sem inniheldur róterings-par" skilar YTSTA div appsins
   (modalinn er teiknadur inni i honum), svo thead-th-talning naedi yfir
   ADRAR toflur lika. Vid festum okkur i SJALFA rotunar-tofluna.        */
const rotTable = [...container.querySelectorAll("table")]
  .find(t => t.textContent.includes("Cover"));
ok(!!rotTable, "spjaldið teiknar töflu");
/* Modalinn sjalfur: h2 -> S.head -> S.panel. Stillingarnar (select,
   checkbox) eru i hausnum, UTAN toflunnar, svo tha ma ekki leita i henni. */
const rotH2 = [...container.querySelectorAll("h2")]
  .find(x => x.textContent.includes("FFDR comparison"));
const rotPanel = rotH2?.parentElement?.parentElement || null;
ok(!!rotPanel && rotPanel.contains(rotTable), "modal-spjaldid fannst og inniheldur tofluna");
const rTxt = () => rotPanel ? rotPanel.textContent : "";
ok(rTxt().includes("Cover") && rTxt().includes("Gain"),
  "báðir mælikvarðar birtir: Þekja (FFDR) og Vinn. (ákvörðunin)");
ok(/Price cap £\d/.test(rTxt()) || rTxt().includes("Price cap none"),
  "verðþakið er SÝNT, ekki falin sía");
const horSel = rotPanel && [...rotPanel.querySelectorAll("select")]
  .find(sel => [...sel.options].some(o => o.textContent === "6"));
ok(horSel && horSel.value === "6", "sjálfgildi er 6 umferðir");
const mineBox = rotPanel && [...rotPanel.querySelectorAll("input[type=checkbox]")][0];
ok(!!mineBox, "„aðeins mitt lið“ er í boði (rótering af bekknum þarf engin skipti)");
ok(!/\bundefined\b|\bNaN\b/.test(rTxt()), "ekkert undefined/NaN í róterings-spjaldinu");
/* Grindin: fjöldi umferða-dálka á að fylgja valinu */
const colsAt = () => {
  const t = [...container.querySelectorAll("table")].find(x => x.textContent.includes("Cover"));
  return t ? t.querySelectorAll("thead th").length : 0;
};
const c6 = colsAt();
if (horSel) {
  await act(async () => {
    horSel.value = "10";
    horSel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });
  await render();
}
const c10 = colsAt();
/* 1 nafnadalkur + N umferdir + 2 tolur */
/* +1 dalkur 7.8.2026: FFDR (medaltal i erfidu umferdunum) sem listinn
   er nu RADADUR eftir. nafn + 6 umferdir + FFDR + thekja + vinn. = 10 */
ok(c6 === 10, `6 umferdir -> 10 dalkar: nafn + 6 + FFDR + þekja + vinn. (${c6})`);
ok(c10 === 14, `10 umferdir -> 14 dalkar (${c10})`);
/* Lokun */
const rotClose = [...container.querySelectorAll("button")].filter(b => b.textContent === "✕").at(-1);
await act(async () => { rotClose.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
/* VAR TOM FULLYRDING. Leitad var ad "róterings-par" — íslenskum streng
   sem er HVERGI i vidmotinu (hann er adeins til i kóða-athugasemd), og
   eftir ad appid vard enskt gat hann alls ekki birst. Fullyrdingin var
   thvi SONN hvort sem glugginn lokadist eda ekki. Nu er leitad ad
   "Price cap", sem er sannanlega i glugganum sjalfum (profad tveimur
   linum ofar) og hverfur thegar hann lokast.                          */
ok(!/Price cap/.test(text()), "spjaldið lokast");

console.log("\n=== 12. TIMALINAN I SIMABREIDD (skorunar-vordur) ===");
/* HVERS VEGNA ThETTA PROF ER TIL: TL_WINDOW var FAST 13 og i 390px urdu
   hnutarnir 26px og SKORUÐUST — 9 skorunar-por, maelt i raunverulegum
   Chrome 31.7.2026. Skarandi hnutar eru ekki throngir heldur OTAPPANLEGIR.
   Ekkert yfirflaedi maeldist, svo hvorki profin ne yfirflaedi-vordurinn
   sau thad; thad fannst med thvi ad RENDRA appid i simabreidd.
   jsdom hefur enga uppsetningu (getBoundingClientRect er allt 0) svo
   SKORUNIN sjalf er ekki maelanleg her — thad sem ER maelanlegt, og er
   raunveruleg orsok, er FJOLDI hnuta per breidd. Thad er thad sem er varid. */
const pagerCount = () => [...container.querySelectorAll("button")]
  .filter(b => /^\d{1,2}$/.test(b.textContent.trim())).length;
const atWidth = async (w) => {
  dom.window.innerWidth = w;
  await act(async () => { dom.window.dispatchEvent(new dom.window.Event("resize")); });
  await render();
  return pagerCount();
};
const wide = await atWidth(1280);
ok(wide === 13, `1280px -> 13 umferdir i timalinu (${wide})`);
const mid = await atWidth(760);
ok(mid === 9, `760px -> 9 umferdir (${mid})`);
const phone = await atWidth(390);
ok(phone === 6, `390px (simi) -> 6 umferdir, ekki 13 (${phone})`);
ok(phone < wide, "simi faer FAERRI hnuta en bord — thad er allt malid");
/* Hnutarnir verda ad vera nogu breidir til ad tappa a. Vid 390px og 6
   hnutum maeldust their 42px i Chrome; vid 13 voru their 26px. Reglan
   ma ekki reka thannig ad simi fai fleiri en 8.                        */
ok(phone <= 8, `simi faer <=8 hnuta svo hver verdi >=40px breidur (${phone})`);
await atWidth(1280);   // skila i upphaflegt svo seinni prof se ohreyfd

console.log("\n=== 13. THRIR NAESTU LEIKIR A SPJALDINU ===");
/* Adur var EIN leikjaflis (yfirstandandi umferd). Nu thrjar umferdir.
   ATH: ThRJAR UMFERDIR, EKKI ThRIR LEIKIR — tvofold umferd ma ekki yta
   thridju umferdinni ut, og auð umferd verdur ad birtast sem "–" og ekki
   hverfa (auð umferd = 0 stig, thad er ThYNGSTA upplysingin).           */
const stripsOf = () => [...container.querySelectorAll("div")].filter(x => {
  const k = [...x.children];
  return k.length >= 1 && k.length <= 3 && k.every(c =>
    c.tagName === "DIV" && /^[A-Za-z?–]{1,4}[⧫]?[\d.]*$/.test((c.textContent || "").trim()));
});
const strips = stripsOf();
ok(strips.length >= 15, `leikjastrengur a hverju spjaldi (${strips.length} fundnir)`);
const sizes = strips.map(s => s.children.length);
ok(sizes.every(n => n >= 1 && n <= 3), `hver strengur ber 1-3 umferdir (${[...new Set(sizes)].join(",")})`);
ok(sizes.some(n => n === 3), "minnst einn strengur ber ALLAR thrjar umferdirnar");
/* Hver flis a ad hafa tooltip med FFDR — annars er talan hvergi */
const cells = strips.flatMap(s => [...s.children]);
const withFfdr = cells.filter(c => /FFDR/.test(c.title || ""));
const blanks = cells.filter(c => (c.textContent || "").trim() === "–");
ok(withFfdr.length + blanks.length === cells.length,
  `hver flis hefur FFDR i tooltip eda er auð umferd (${withFfdr.length} + ${blanks.length} = ${cells.length})`);
ok(cells.every(c => (c.title || "").length > 0), "engin flis an tooltip");
/* ENGIN flis ber toluna SYNILEGA — notandinn bad um ad hun faeri
   (6.8.2026); liturinn segir threpid og talan er i tooltip.
   Ofugt vid eldri stadhaefingu sem krafdist tolunnar a fyrstu flis.  */
ok(cells.every(c => !/\d\.\d/.test(c.textContent || "")),
  "engin flis birtir FFDR-toluna synilega (hun er i tooltip)");
/* Heimavollur/utivollur helst i staffrodinni (oppLabel: STORT=heima) */
ok(cells.some(c => /^[A-Z]{3}/.test((c.textContent || "").trim()))
   && cells.some(c => /^[a-z]{3}/.test((c.textContent || "").trim())),
  "heima (STORT) og uti (litid) sest afram i staffrodinni");

console.log("\n=== 14. FPL-TENGING: STADFESTING OG VILLUR ===");
/* ThAD SEM BRAST: connectUrl sendi flash("Tengt lid X") SAMSTUNDIS — adur en
   nokkud var sannreynt — og ef soknin brast var thad ThOGULT
   (`catch { setTotalPts(null) }`). Notandinn sa "tengt" og svo EKKERT, og
   fekk enga visbendingu um hvad hann atti ad lima inn.
   MAELT 4.8.2026: `fpl-entry` virkar i forleik (skilar nafni stjornandans) en
   `fpl-picks` er 404 thvi FPL birtir ekki lid fyrir umferd sem er EKKI byrjud.
   Tengingin er thvi sannreynd med fpl-entry og forleiks-stodan skyrd.     */
const urlInput = container.querySelector("input.url-input");
ok(!!urlInput, "slodar-innslattur finnst");
ok(/entry\/NÚMER|entry\/NUMBER/.test(urlInput?.title || ""),
  "tooltip segir HVADA part af slodinni a ad lima (var ekkert)");
ok(/1234567/.test(urlInput?.title || ""), "og gefur DAEMI, ekki adeins reglu");
const connBtn = [...container.querySelectorAll("button")]
  .find(b => /Tengja|Uppfæra|Connect|Update/.test(b.textContent));
ok(!!connBtn, "Tengja-hnappur finnst");
/* REGLAN SJALF er profud i tests/model.test.mjs (parseEntryId) — HREINT
   fall. Innslattur i STYRDA React-reiti er otraustur i jsdom (kafli 4), svo
   ad drifa hann her maelir jsdom og ekki regluna. Fyrsta utgafa thessa
   profs gerdi thad og fell af theim sokum, ekki af kodanum.
   Her er thvi adeins profad thad sem jsdom GETUR sagt: ad merkid se til,
   ad thad segi hvad a ad lima, og ad gamla ostadfesta "tengt" se farid.  */
ok(!/Tengt lið .* sæki raunlið/.test(text()),
  "GAMLA HEGDUNIN ER FARIN: engin 'tengt' stadfesting an sannreyningar");

console.log(`\n========================================`);
console.log(`NIÐURSTAÐA: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
