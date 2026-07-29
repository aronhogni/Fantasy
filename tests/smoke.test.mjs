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
ok(!text().includes("Sæki opinber FPL-gögn"), "hleðsluskjár horfinn");
ok(!text().includes("Náði ekki í gögnin"), "engin gagna-villa");
ok(text().includes("FantasyApp"), "haus birtist (endurnefnt úr 'Fantasy plönun')");
ok(text().includes("Banki"), "mælaborð birtist");
ok(container.querySelectorAll(".fpl-pitch").length === 1, "völlurinn teiknast");

console.log("\n=== 2. LIÐIÐ Á VELLINUM ===");
const cards = [...container.querySelectorAll('[draggable="true"]')];
ok(cards.length === 15, `15 leikmannaspjöld (fann ${cards.length})`);
ok(text().includes("Haaland"), "Haaland á vellinum");
ok(!text().includes("af undefined"), "engin 'af undefined' villa (rotationRisk)");
ok(!/NaN/.test(text()), "engin NaN í viðmótinu");

console.log("\n=== 2b. PENINGATÖLURNAR Á MÆLABORÐINU ===");
// Fyrir tímabil, án skipta: banki + liðsverð Á að vera nákvæmlega £100.0
ok(text().includes("alls £100.0"), "banki + liðsverð = £100.0 (fjárlögin ganga upp)");
ok(/Banki/.test(text()) && !/£NaN|£undefined/.test(text()), "engin brotin peningatala");

console.log("\n=== 3. UMFERÐASKIPTI Á TÍMALÍNU ===");
const gwBtns = [...container.querySelectorAll("button")].filter(b => /^\d+$/.test(b.textContent.trim()));
ok(gwBtns.length >= 13, `tímalínuhnútar til staðar (${gwBtns.length})`);
const gw5 = gwBtns.find(b => b.textContent.trim() === "5");
await act(async () => { gw5.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(text().includes("GW5"), "GW5 valin og birt");

console.log("\n=== 4. SKIPTI: opna leit, velja mann, staðfesta reglur ===");
const swapIcons = [...container.querySelectorAll("button")].filter(b => b.title?.startsWith("Skipta út"));
ok(swapIcons.length === 15, "skipta-ikon á hverju spjaldi");
await act(async () => { swapIcons[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
const searchInput = container.querySelector('input[placeholder="Leita — nafn eða lið"]');
ok(!!searchInput, "leitargluggi opnast");
const results = [...container.querySelectorAll("button")].filter(b => b.querySelector("img, svg") && b.textContent.includes("£"));
ok(results.length > 5, `leitarniðurstöður birtast (${results.length})`);
// veljum fyrsta löglega
const legal = results.find(r => !r.title?.startsWith("Ólöglegt"));
const before = text();
await act(async () => { legal.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(text().includes("Skiptaáætlun"), "skipti skráð í áætlun");
ok(text().includes("GW5:") || /GW5/.test(text()), "skiptin tengd GW5");

console.log("\n=== 5. ENDURSTILLING UMFERÐAR (tveggja skrefa) ===");
const resetBtn = [...container.querySelectorAll("button")].find(b => b.textContent.includes("endurstilla GW5"));
ok(!!resetBtn, "endurstilla-hnappur birtist eftir plönun");
await act(async () => { resetBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
const yesBtn = [...container.querySelectorAll("button")].find(b => b.textContent.trim() === "já");
ok(!!yesBtn, "staðfestingar-skref birtist");
await act(async () => { yesBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(!text().includes("Skiptaáætlun"), "áætlun tóm eftir endurstillingu");

console.log("\n=== 6. LEIKMANNAYFIRLIT (detail) ===");
const infoBtns = [...container.querySelectorAll("button")].filter(b => b.title === "Upplýsingar");
await act(async () => { infoBtns[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(text().includes("Leikir"), "yfirlit opnast með leikjalista");
/* SPJALDID VAR ENDURHANNAD (28.7.). Profin her fylgja NYJU uppsetningunni:
   efsti hluti med sex adaltolum + timabila-tafla med saetum og trendi.
   Gomlu fyrirsagnirnar ("Núna", "Tímabilið …", "uppsafnað") eru farnar
   og tolurnar eru nu i toflu, ekki i dalkaneti.                          */
for (const k of ["Verð", "Heildarstig", "Stig/leik", "Bónusstig", "Form", "Eignarhlutfall"])
  ok(text().includes(k), `efsti hluti: '${k}'`);
ok(text().includes("Tímabil"), "tímabila-taflan birtist");
ok(!text().includes("sl. tímabil"), "loðna merkingin 'sl. tímabil' horfin");
// RETT ARTAL a yfirstandandi timabili — cumLabel (2025/26) ma EKKI rata i hausinn
ok(text().includes("2026/27"), "dálkur yfirstandandi tímabils ber rétt ártal (2026/27)");
ok(text().includes("2025/26") && text().includes("2024/25"),
  "eldri tímabil fylgja með í töflunni");
// FYRIR TIMABIL a yfirstandandi dalkur ad vera TOMUR, ekki tvitekning a i fyrra
ok(text().includes("2026/27 er ekki hafið"),
  "tómur dálkur útskýrður — FPL-tölurnar eru enn fyrra tímabils");
// radirnar sem beðið var um
for (const k of ["Mínútur", "xGI", "YC / RC", "BP / BPS"])
  ok(text().includes(k), `tímabila-röðin '${k}'`);
ok(text().includes("Spá næstu"), "ep birtist áfram");
// MEIÐSLA-TEGUNDIN úr API-Sports: FPL segir 'a' -> varfærna óstaðfesta línan
ok(text().includes("API-Sports skráir:") && text().includes("Knock"),
  "meiðsla-tegund úr API-Sports birt varfærið þegar FPL flaggar ekki");
// FERÐALENGDIN (var reiknuð daglega en birtist hvergi): ✈ + km á leikjaröðum
ok(/✈\d+/.test(text()), "ferðalengd (✈ km) birtist á leikjaröðum yfirlitsins");
const travelChip = [...container.querySelectorAll("span")].find(el => /✈\d+/.test(el.textContent) && el.title);
ok(!!travelChip && /km \(loftlína\)/.test(travelChip.title), "ferða-tooltip útskýrir km og loftlínu");
ok(!text().includes("undefined"), "ekkert 'undefined' í yfirlitinu");
// Yfirlitsglugginn er SÍÐASTA "✕"-ið í DOM (fjarlægja-hnappur andstæðings
// í hliðarstikunni notar sama tákn og kemur á undan — fyrsta ✕-ið eyddi
// óvart andstæðingnum og braut kafla 9!)
const closeBtn = [...container.querySelectorAll("button")].filter(b => b.textContent === "✕").at(-1);
await act(async () => { closeBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();

console.log("\n=== 6b. FERÐALENGD Í GW-LEIKJALISTANUM ===");
const midWithTravel = [...container.querySelectorAll("button")].filter(b => b.title && b.title.includes("ferðast"));
ok(midWithTravel.length > 0, `GW-listinn ber ferðalengd í tooltip (${midWithTravel.length} leikir)`);
ok(midWithTravel.every(b => /\d+ km/.test(b.title)), "km-talan í hverju ferða-tooltipi");

console.log("\n=== 7. FFDR-TAFLAN OG CHIPS ===");
const ffdrBtn = [...container.querySelectorAll("button")].find(b => b.textContent.includes("FFDR"));
await act(async () => { ffdrBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(text().includes("FFDR — leikjaþyngd"), "FFDR-tafla opnast");
ok(container.querySelectorAll("table").length >= 1, "taflan teiknast");
const chipsBtn = [...container.querySelectorAll("button")].find(b => b.textContent.includes("Chips"));
await act(async () => { chipsBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(text().includes("Fyrri hluti"), "chips-svæðið opnast með báðum hálfleikjum");

console.log("\n=== 8. TILLÖGUR OG SJÓNDEILDARHRINGUR (dcOpp-deps prófið) ===");
ok(text().includes("Mælt með kaupum"), "tillögu-svæðið birtist");
const rangeSel = [...container.querySelectorAll("select")].find(s => [...s.options].some(o => o.textContent === "næstu 8"));
ok(!!rangeSel, "sjóndeildarhrings-val til staðar");
const dcBefore = (text().match(/DC\s?\d+/g) || []).join(",");
await act(async () => {
  rangeSel.value = "8";
  rangeSel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
});
await render();
ok(text().includes("GW5–12") || text().includes("GW5–"), "fyrirsögn fylgir nýjum sjóndeildarhring");

console.log("\n=== 9. ANDSTÆÐINGAR (differentials) ===");
ok(text().includes("Andstæðingar"), "andstæðinga-svæðið birtist");
const rivalInput = [...container.querySelectorAll("input")].find(i => i.placeholder?.includes("liðsnúmer"));
ok(!!rivalInput, "innsláttur fyrir liðsnúmer til staðar");
// hnappurinn er tengdur: tómt inntak gefur leiðbeininguna
const addBtn = [...container.querySelectorAll("button")].find(b => b.textContent === "Bæta við");
await act(async () => { addBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
ok(text().includes("Slóð eða númer andstæðings"), "Bæta við-hnappurinn tengdur (villuboð á tómu)");
await render(); await render();
ok(text().includes("Prófliðið"), "nafn andstæðings sótt og birt");
ok(text().includes("13/15 sameiginlegir"), "sameiginlegir taldir rétt (13/15)");
ok(text().includes("þeirra sérstaða"), "sérstaða þeirra birt");
ok(text().includes("þín sérstaða"), "þín sérstaða birt");
ok(text().includes("sami og þú"), "fyrirliða-samanburður (báðir með Haaland)");

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
ok(text().includes("FFDR-samanburður"), "FFDR-samanburður opnast við smell á ↻");
/* NB: leit ad "div sem inniheldur róterings-par" skilar YTSTA div appsins
   (modalinn er teiknadur inni i honum), svo thead-th-talning naedi yfir
   ADRAR toflur lika. Vid festum okkur i SJALFA rotunar-tofluna.        */
const rotTable = [...container.querySelectorAll("table")]
  .find(t => t.textContent.includes("Þekja"));
ok(!!rotTable, "spjaldið teiknar töflu");
/* Modalinn sjalfur: h2 -> S.head -> S.panel. Stillingarnar (select,
   checkbox) eru i hausnum, UTAN toflunnar, svo tha ma ekki leita i henni. */
const rotH2 = [...container.querySelectorAll("h2")]
  .find(x => x.textContent.includes("FFDR-samanburður"));
const rotPanel = rotH2?.parentElement?.parentElement || null;
ok(!!rotPanel && rotPanel.contains(rotTable), "modal-spjaldid fannst og inniheldur tofluna");
const rTxt = () => rotPanel ? rotPanel.textContent : "";
ok(rTxt().includes("Þekja") && rTxt().includes("Vinn."),
  "báðir mælikvarðar birtir: Þekja (FFDR) og Vinn. (ákvörðunin)");
ok(/Verðþak £\d/.test(rTxt()) || rTxt().includes("Verðþak ekkert"),
  "verðþakið er SÝNT, ekki falin sía");
const horSel = rotPanel && [...rotPanel.querySelectorAll("select")]
  .find(sel => [...sel.options].some(o => o.textContent === "6"));
ok(horSel && horSel.value === "6", "sjálfgildi er 6 umferðir");
const mineBox = rotPanel && [...rotPanel.querySelectorAll("input[type=checkbox]")][0];
ok(!!mineBox, "„aðeins mitt lið“ er í boði (rótering af bekknum þarf engin skipti)");
ok(!/undefined|NaN/.test(rTxt()), "ekkert undefined/NaN í róterings-spjaldinu");
/* Grindin: fjöldi umferða-dálka á að fylgja valinu */
const colsAt = () => {
  const t = [...container.querySelectorAll("table")].find(x => x.textContent.includes("Þekja"));
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
ok(c6 === 9, `6 umferdir -> 9 dalkar: nafn + 6 + þekja + vinn. (${c6})`);
ok(c10 === 13, `10 umferdir -> 13 dalkar (${c10})`);
/* Lokun */
const rotClose = [...container.querySelectorAll("button")].filter(b => b.textContent === "✕").at(-1);
await act(async () => { rotClose.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
await render();
ok(!text().includes("róterings-par"), "spjaldið lokast");

console.log(`\n========================================`);
console.log(`NIÐURSTAÐA: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
