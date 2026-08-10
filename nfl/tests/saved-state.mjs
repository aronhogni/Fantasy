/* ============================================================
   saved-state.mjs — VISTAD ASTAND ER ALVARLEGRA EN VANTANDI GOGN.

   Ur FPL-verkefninu, ordrett: "`data/` lagast vid naestu sokn, en
   blobbid er i vafranum og fer hvergi, svo oheilt blob felldi appid
   vid HVERJA hledslu, ad eilifu."

   Og lærdómurinn sem kom a eftir: **villuvornin a ad vera sidasta
   urraedi, ekki thad fyrsta.** `loadState` var thar latin verja gegn
   onytu JSON — en GILT JSON MED RANGRI GERD for ospurt inn i state.
   Fjogur af fjortan skemmdum blobbum felldu appid.

   HER ER SAMA HAETTA OG HUN ER STAERRI EN HUN VIRDIST:

     loadState("league", {})

   Sjalfgefna gildid er TOMUR HLUTUR. Gerdarvordurinn i `loadState`
   ber saman `typeof` og `Array.isArray` — og HVER hlutur stenst thad
   prof. Sidan er hann dreift YFIR sjalfgefnu deildina:

     { ...DEFAULT_LEAGUE, ...loadState("league", {}) }

   svo `{"teams":"abc"}` yfirskrifar goda talningu og hver einasta
   VBD-tala verdur NaN. Ytri gerd dugar ekki thegar hluturinn ber
   hluti — nakvaemlega `benchSwaps`-tilfellid i hinu appinu, thar sem
   `{"1":"x"}` var gildur hlutur en `"x".forEach` fell.

   PROFID KREFST TVENNS, og seinna atridid er thad sem gerir thad ad
   profi en ekki hreinsun: (1) skemmt astand ma ekki fella appid ne
   setja NaN a skjainn, og (2) GILT ASTAND VERDUR AD FARA I GEGN
   OBREYTT — annars vaeri "lagfaeringin" ad henda raunverulegri
   planun notandans.
   ============================================================ */

import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = path.join(ROOT, "data");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>",
  { url: "https://example.test/nfl/", pretendToBeVisual: true });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(globalThis, "navigator",
  { value: dom.window.navigator, configurable: true });
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.localStorage = dom.window.localStorage;
global.location = dom.window.location;

global.fetch = async (url) => {
  const m = String(url).match(/\/data\/(.+)$/);
  if (!m) return { ok: false, status: 404, json: async () => ({}) };
  try {
    return { ok: true, status: 200,
             json: async () => JSON.parse(readFileSync(path.join(DATA, m[1]), "utf8")) };
  } catch { return { ok: false, status: 404, json: async () => ({}) }; }
};

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
global.IS_REACT_ACT_ENVIRONMENT = true;
const App = (await import("../src/App.jsx")).default;

/* ============================================================
   SKEMMDU BLOBBIN
   ============================================================
   Hvert er GILT JSON — thad er malid. Onytt JSON er thegar varid.
   Thetta eru gildin sem komast fram hja gerdarverdinum.            */
const BLOBS = [
  // --- deildin: hluturinn sem er dreift YFIR sjalfgefnu gildin ---
  ["league", '{"teams":"abc"}',                 "teams sem strengur"],
  ["league", '{"teams":0}',                     "teams = 0 (deiling med null)"],
  ["league", '{"teams":-5}',                    "neikvaedur lidafjoldi"],
  ["league", '{"teams":99999}',                 "fáránlegur lidafjoldi"],
  ["league", '{"starters":"x"}',                "starters sem strengur"],
  ["league", '{"starters":null}',               "starters = null"],
  ["league", '{"starters":{"QB":"margir"}}',    "saetafjoldi sem strengur"],
  ["league", '{"starters":{"QB":-3}}',          "neikvaed saeti"],
  ["league", '{"scoring":"tunglid"}',           "othekkt stigagjof"],
  ["league", '{"scoring":42}',                  "stigagjof sem tala"],
  ["league", '{"maxPos":"nei"}',                "maxPos sem strengur"],
  ["league", '{"flexPos":"RB"}',                "flexPos sem strengur i stad fylkis"],
  ["league", '[]',                              "fylki i stad hlutar"],
  // --- draftid ---
  ["taken", '["ekki-til","1234"]',              "audkenni sem eru ekki til"],
  ["taken", '[null,null]',                      "null i fylkinu"],
  ["taken", '[{"a":1}]',                        "hlutir i stad audkenna"],
  ["myPicks", '"strengur"',                     "strengur i stad fylkis"],
  ["sync", '{"slot":"nei","draftId":123}',      "slot sem strengur"],
  ["sync", '{"slot":-99}',                      "saeti utan deildar"],
  // --- taflan ---
  ["sort", '{"key":"ekki-dalkur","dir":-1}',    "rodun eftir dalki sem er ekki til"],
  ["sort", '{"key":"vbd","dir":"upp"}',         "att sem strengur"],
  ["sort", '{}',                                "tomur rodunar-hlutur"],
  ["cols", '["ekki-dalkur","vbd"]',             "dalkur sem er ekki til"],
  ["cols", '[]',                                "enginn dalkur valinn"],
  ["cols", '[1,2,3]',                           "tolur i stad dalkaheita"],
  ["posFilter", '["ZZ"]',                       "stada sem er ekki til"],
  ["view", '"ekki-flipi"',                      "flipi sem er ekki til"],
  ["view", '{"a":1}',                           "hlutur i stad flipaheitis"],
];

const render = async () => {
  const el = document.getElementById("root");
  const root = createRoot(el);
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { await new Promise((r) => setTimeout(r, 500)); });
  const text = document.body.textContent || "";
  root.unmount();
  return text;
};

console.log(`\n${BLOBS.length} skemmd blob — appid ma hvorki falla ne syna NaN`);
let broke = 0, nan = 0;
for (const [key, value, label] of BLOBS) {
  localStorage.clear();
  localStorage.setItem(`nfl_${key}`, value);
  let text = "";
  let crashed = false;
  try { text = await render(); } catch (e) { crashed = true; }

  /* `\bNaN\b` en ekki `NaN` bert: `textContent` limir saman texta an
     bila, svo "MUN"+"a"+"NEW" bar undirstrenginn NaN i hinu appinu og
     felldi fimm profasofn ad astaedulausu. */
  const hasNaN = /\bNaN\b|\bundefined\b|\bInfinity\b/.test(text);
  const boundary = /Something broke|villa/i.test(text);
  const empty = text.trim().length < 200;

  if (crashed || boundary || empty) {
    broke++;
    console.log(`  FAIL ${key} = ${label}` +
      ` — ${crashed ? "HRUN" : boundary ? "villuvornin greip" : "tomur skjar"}`);
    fail++;
  } else if (hasNaN) {
    nan++;
    console.log(`  FAIL ${key} = ${label} — NaN/undefined a skjanum`);
    fail++;
  }
}
ok(broke === 0 && nan === 0,
  `${BLOBS.length} skemmd blob: ${broke} felldu appid, ${nan} gafu NaN`);

/* ============================================================
   GILT ASTAND VERDUR AD FARA I GEGN OBREYTT
   ============================================================
   Thetta er atridid sem gerir thetta ad profi en ekki hreinsun. Vaeri
   "lagfaeringin" ad henda ollu vistudu astandi vaeri hun ad henda
   planun notandans — og profid haetti ad geta sed muninn.          */
console.log("\ngilt astand helst obreytt");
{
  const { loadState, saveState, clearState } = await import("../src/data.js");
  localStorage.clear();

  const cases = [
    ["league", { teams: 14, scoring: "standard",
                 starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 } }],
    ["taken", ["4034", "6794", "11565"]],
    ["sync", { draftId: "1234567890", slot: 7 }],
    ["sort", { key: "adp", dir: 1 }],
    ["cols", ["proj", "vbd", "adp"]],
    ["posFilter", ["RB", "WR"]],
    ["view", "players"],
  ];
  for (const [k, v] of cases) {
    saveState(k, v);
    const back = loadState(k, Array.isArray(v) ? [] : (typeof v === "object" ? {} : ""));
    ok(JSON.stringify(back) === JSON.stringify(v),
      `${k} helst obreytt (${JSON.stringify(v).slice(0, 46)})`);
  }

  /* Og hreinsunin verdur ad na OLLUM `nfl_*` — valid, ekki
     hardkodadur listi, svo nyr lykill verdi ekki utundan thegjandi. */
  localStorage.setItem("nfl_nyr_lykill", '"eitthvad"');
  localStorage.setItem("annad_app", '"ma ekki hverfa"');
  clearState();
  const left = [];
  for (let i = 0; i < localStorage.length; i++) left.push(localStorage.key(i));
  ok(!left.some((k) => k && k.startsWith("nfl_")),
    `clearState nær ollum nfl_* (eftir: ${left.join(", ") || "ekkert"})`);
  ok(left.includes("annad_app"), "og snertir ekki lykla annarra appa");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
