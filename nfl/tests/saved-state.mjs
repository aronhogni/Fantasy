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
  /* ------------------------------------------------------------
     `nfl_leagues` OG `nfl_sleeperUser` — LYKLARNIR SEM VORU UTUNDAN
     ------------------------------------------------------------
     Þetta safn profadi ADEINS gomlu einu-deildar lyklana (`nfl_league`,
     `nfl_taken`, `nfl_sync`). Fjol-deildar lykillinn `nfl_leagues` og
     `nfl_sleeperUser` voru **aldrei snertir**, svo hvert svid inni i
     `imported` var oprofad — og fjogur theirra felldu appid i maelingu:
     `status` sem tala (`.replace`), `flexPos` sem strengur (`.join`),
     `leagueId` sem tala (`.slice`) og `name` sem hlutur
     (`[object Object]` sem flipi).

     UTGANGAN ER SU DYRASTA I APPINU: `loadEntries` les blobbid inn i
     state og hledslan skrifar thad AFTUR ut, svo oheilt svid felldi
     appid vid HVERJA hledslu, ad eilifu — og eini hnappurinn hreinsar
     ALLAR deildir og allt bordid.                                    */
  ["leagues", '[{"id":"a","name":"L","imported":{"leagueId":"1","status":3}}]',
    "imported.status sem tala (.replace fell)"],
  ["leagues", '[{"id":"a","name":"L","imported":{"leagueId":"1","flexPos":"RB/WR"}}]',
    "imported.flexPos sem strengur (.join fell)"],
  ["leagues", '[{"id":"a","name":"L","imported":{"leagueId":12345}}]',
    "imported.leagueId sem tala (.slice fell)"],
  ["leagues", '[{"id":"a","name":"L","imported":{"leagueId":"1","name":{"a":1}}}]',
    "imported.name sem hlutur ([object Object])"],
  ["leagues", '[{"id":"a","name":"L","imported":{"leagueId":"1","starters":[1,2,3]}}]',
    "imported.starters sem fylki"],
  ["leagues", '[{"id":"a","name":"L","imported":{"leagueId":"1","teams":"tiu","rounds":"fimmtan"}}]',
    "imported.teams/rounds sem strengir"],
  ["leagues", '[{"id":"a","name":"L","imported":"strengur"}]',
    "imported sem strengur"],
  ["leagues", '[{"id":"a","name":"L","imported":[]}]',
    "imported sem fylki"],
  ["leagues", '"strengur"',                     "leagues sem strengur"],
  ["leagues", '[]',                             "tomur deildarlisti"],
  ["leagues", '[{"name":"engin id"}]',          "faersla an audkennis"],
  ["leagues", '[{"id":"a"},{"id":"a"}]',        "tvaer faerslur med sama audkenni"],
  ["sleeperUser", '"aron"',                     "sleeperUser sem strengur"],
  ["sleeperUser", '{"name":{"a":1}}',           "sleeperUser.name sem hlutur"],
  ["sleeperUser", '{"name":42,"userId":[]}',    "name sem tala, userId sem fylki"],
  ["sleeperUser", '[]',                         "sleeperUser sem fylki"],
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

/* ============================================================
   6. `imported` — GILT VERDUR AD FARA OBREYTT I GEGN
   ============================================================
   Kaflinn hér ofan sannar ad skokk svid komist ekki inn. Hann getur
   EKKI sannad ad lagfaeringin se ekki einfaldlega `return null` a allt —
   tha vaeri appid graent i ollum blobbum og notandinn hefdi tapad
   innfluttu reglunum sinum vid hverja hledslu.

   Þetta er sama krafan sem "gilt astand helst obreytt" ber fyrir
   deildina, og hun er ASTAEDAN fyrir thvi ad thetta er prof og ekki
   hreinsun.                                                          */
console.log("\n6. gilt `imported` helst obreytt");
{
  const { normalizeImported } = await import("../src/App.jsx");
  ok(typeof normalizeImported === "function",
    "`normalizeImported` er flutt ut og profanleg");

  /* Nakvaemlega thad snid sem `leagueFromSleeper` skrifar. */
  const real = {
    leagueId: "1389356308104249344", draftId: "1389356308104249345",
    name: "Sofahetjur", season: "2026", status: "pre_draft",
    draftStatus: "pre_draft", draftType: "snake",
    teams: 10, rounds: 15, scoring: "ppr", rec: 1, exactScoring: true,
    superflex: false, bench: 6,
    starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 2, K: 1, DST: 1 },
    flexPos: ["RB", "WR", "TE"], orderDrawn: false,
    /* Urslitakeppnin. Þessi tvo svid voru baett vid 13.8. og ÞETTA PROF
       FELLDI ÞAU SAMSTUNDIS (17 svid a moti 19) — sem er nakvaemlega
       hegdunin sem er beðið um: nytt svid i `normalizeImported` verdur
       ad koma hér lika, annars er thad othvingad i praxis eda profid
       laetur eins og thad se ekki til. */
    playoffTeams: 6, playoffWeekStart: 15,
  };
  const back = normalizeImported(real);
  /* SAMANBURDUR A INNIHALDI, EKKI A LYKLA-ROD. `JSON.stringify`-jafnadur
     er rod-nAemur, svo hann felldi thetta prof thegar tvo svid voru baett
     vid i annarri rod en fixtúran ber — 19 svid a moti 19, oll gildi
     eins, og samt "obreytt: nei". Þad er fullyrding um ritrod hlutar,
     sem er ekki thad sem malid er: krafan er ad HVERT GILDI komist
     obreytt i gegn og ad ekkert svid TYNIST ne baetist vid.          */
  const keysReal = Object.keys(real).sort();
  const keysBack = Object.keys(back || {}).sort();
  ok(keysBack.join(",") === keysReal.join(","),
    `\`imported\` ber somu svid fram og til baka (${keysReal.length} svid` +
    `${keysBack.join(",") === keysReal.join(",") ? "" :
      " — munur: " + keysReal.filter((k) => !keysBack.includes(k)).join(",") +
      " / " + keysBack.filter((k) => !keysReal.includes(k)).join(",")})`);
  const diff = keysReal.filter((k) =>
    JSON.stringify(real[k]) !== JSON.stringify(back && back[k]));
  ok(diff.length === 0,
    `og hvert gildi er obreytt (${diff.length} vikja${
      diff.length ? ": " + diff.join(", ") : ""})`);

  /* Og hvert svid ma adeins kosta SIG SJALFT — thad er allt malid.
     Vaeri einn skokk svid latid fella hlutinn i heild yrdi ein tala fra
     Sleeper ad thvi ad allar reglurnar hyrfu. */
  for (const [k, bad] of [["status", 3], ["flexPos", "RB/WR"],
                          ["name", { a: 1 }], ["teams", "tiu"],
                          ["starters", [1, 2, 3]], ["scoring", "tunglid"]]) {
    const r = normalizeImported({ ...real, [k]: bad });
    ok(r != null && r.leagueId === real.leagueId && r.rounds === real.rounds,
      `skokk \`${k}\` kostar bara sig sjalft (leagueId og rounds standa)`);
  }

  /* `leagueId` ER burdarvirkid — `Dashboard` sier eftir honum. Hluta-
     hlutur an hans myndi lita innfluttur ut og bera engin gogn. */
  ok(normalizeImported({ name: "L", teams: 10 }) === null,
    "`imported` an `leagueId` er `null`, ekki hluta-hlutur");
  for (const bad of [null, undefined, "s", 42, [], true]) {
    ok(normalizeImported(bad) === null, `\`${JSON.stringify(bad)}\` -> null`);
  }
}

/* ============================================================
   7. `nfl_taken` — TALAN A SKJANUM, EKKI ADEINS AD APPID LIFI
   ============================================================
   Audkennin i `nfl_taken:<id>` voru othvingud ad innan. Þad hrynur EKKI
   og gefur ekkert NaN — thess vegna slapp thad fram hja ollum 44
   blobbunum hér ofan, sem spyrja "fell appid?" og "er NaN a skjanum?".
   Þad gaf RANGAR TOLUR:

     [{"a":1},{"b":2}]  ->  "2 drafted"  (a ad vera 0)
     [null,null]        ->  "1 drafted"  (a ad vera 0)
     [4034,6794]        ->  "2 drafted" OG enginn strikadur ut

   Sidasta tilfellid magnar valnumerid: gerdar-drift fleytir `pickNo` an
   thess ad strika nokkurn ut, svo bordid telur tvo vol komin og synir
   samt bada leikmennina lausa.

   ÞESS VEGNA ER KRAFAN HER ONNUR: talan sem er BIRT verdur ad vera rett.
   "Appid lifdi" er ekki nog thegar bilunin er hljod.                  */
console.log("\n7. `nfl_taken` — talan a skjanum");
{
  /* Raunveruleg audkenni ur `players.json` svo "strikadur ut" se
     merkingarbaert — tilbuid audkenni er ekki a bordinu hvort sem er. */
  const pl = JSON.parse(readFileSync(path.join(
    path.resolve(new URL(".", import.meta.url).pathname, ".."), "data",
    "players.json"), "utf8"));
  const list = Array.isArray(pl) ? pl : pl.players;
  const real = list.filter((p) => p && p.adpSleeper != null)
    .sort((a, b) => a.adpSleeper - b.adpSleeper).slice(0, 3)
    .map((p) => String(p.id));
  ok(real.length === 3, `thrju raunveruleg audkenni (${real.join(",")})`);

  const drafted = (t) => {
    const m = t.match(/(\d+)\s+drafted/);
    return m ? Number(m[1]) : null;
  };

  const cases = [
    [JSON.stringify(real),                 3, "thrjir strengir (vidmid)"],
    [JSON.stringify([{ a: 1 }, { b: 2 }]), 0, "hlutir i stad audkenna"],
    [JSON.stringify([null, null]),         0, "null i fylkinu"],
    [JSON.stringify(["", "  "]),           0, "tomir strengir"],
    /* TOLUR ERU UMBREYTTAR, EKKI FELLDAR: `4034` er audkenni sem ER til,
       bara med annarri gerd. Ad fella thad vaeri ad henda raunverulegu
       vali notandans. */
    [JSON.stringify(real.map(Number)),     3, "tolur i stad strengja (umbreytt)"],
  ];

  for (const [blob, want, label] of cases) {
    localStorage.clear();
    localStorage.setItem("nfl_leagues",
      JSON.stringify([{ id: "L1", name: "Test", rules: { teams: 10,
        scoring: "half-ppr", starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 } } }]));
    localStorage.setItem("nfl_activeLeague", '"L1"');
    localStorage.setItem("nfl_taken:L1", blob);
    localStorage.setItem("nfl_view", '"draft"');
    let t = "";
    try { t = await render(); } catch { t = ""; }
    const got = drafted(t);
    ok(got === want,
      `${label}: "${got} drafted" — vaentanlegt ${want}`);
  }

  /* Og profid verdur ad geta brugdist: vidmidid VERDUR ad gefa 3,
     annars vaeri "0" rett svar i ollum tilfellum og fullyrdingarnar
     einskis virdi. Þad er profad ofan (fyrsta tilfellid) og hér er
     thad sagt berum ordum. */
  ok(cases[0][1] === 3 && cases[1][1] === 0,
    "vidmidid er 3 og skemmda tilfellid 0 — thaer eru GREINANLEGAR");

  /* ------------------------------------------------------------
     TOLU-TILFELLID: TALNINGIN EIN NAER ÞVI EKKI, OG ÞAD ER SKRAD
     ------------------------------------------------------------
     `[9221, 9509, 7564]` gefur "3 drafted" i BADUM utgafum — `new Set`
     a threm tolum hefur threr stakir. Munurinn er ad an umbreytingar er
     `taken.has(String(r.id))` OSATT, svo leikmennirnir eru afram A
     BORDINU: appid telur thrju vol komin OG synir alla thrja lausa.
     Yfirferdin flaggadi thad ordrétt ("enginn strikadur ut").

     ÞETTA SAFN GETUR EKKI MAELT ÞAD OG EG SKRIFA ÞAD I STAD ÞESS AD
     LATA GRAENA FULLYRDINGU LIGGJA. Tvaer atlagur mistokust, badar af
     rettum astaedum:

       1. `body.includes(nafn)` — `render()` kallar `root.unmount()` adur
          en hun skilar, svo `document.querySelectorAll` eftir a gefur
          TOMT. Fullyrdingin "nafnid er strikad ut" var thvi SONN af thvi
          ad taflan var tom. TOM FULLYRDING, nakvaemlega su gerd sem
          CLAUDE.md 5b lysir — og eg skrifadi hana.
       2. "nafnid FINNST thegar ekkert er tekid" sem positift vidmid —
          taflan er syndargluggud, svo efsti ADP-madurinn er ekki
          endilega i glugganum (CLAUDE.md: "notadu rodunina til ad fleyta
          rettri rod inn i syndargluggann").

     Rett heimili fyrir thessa fullyrdingu er `sleeper.mjs`, sem heldur
     DOM-inu lifandi og styrir roduninni. Talningar-fullyrdingarnar hér
     ofan eru RAUNVERULEGAR og stadfestar med afturkollun (thaer fella
     thrjar rader), og umbreytingin sjalf er profud i `idSet`-hegduninni
     gegnum "tolur i stad strengja" -> 3. Þad sem VANTAR er sannreyning a
     ad rodin horfi af bordinu, og hun er skrad hér sem gat.          */
}

/* ============================================================
   8. BORDIN — SKORÐUNIN, TOMU LYKLARNIR OG GRISJUNIN
   ============================================================
   Villan 16.8.2026 (sja `draft-live.mjs` kafla 15) var ad `taken` var
   vistad a DEILDINNI en tilheyrdi DRAFTINU. Kafli 15 profar hana i
   gegnum lifandi bord; hér eru reglurnar sjalfar profadar berum ordum,
   thvi thaer bera thrjar akvardanir sem eru ekki synilegar a skjanum:

     · hvad telst draft (og hvad gerir thad EKKI, svo ad hálfslegid
       audkenni bui ekki til sitt eigid bord)
     · tomt bord BYR EKKI TIL lykil, en tomt bord SKRIFAST a lykil sem er
       til — annars kaemi "Reset" til baka vid naestu hledslu
     · bordum er GRISJAD, thvi hvert mock skilur eitt eftir sig

   Sidasta reglan hefur eitt undantekningarlaust skilyrdi og thad er
   profad: handvirka bordid (an `@`) ma ALDREI grisjast. Þad er eina
   eintakid af theim volum — enginn Sleeper-endapunktur getur skilad
   theim aftur.                                                        */
console.log("\n8. bordin — skorðun, tomir lyklar og grisjun");
{
  const D = await import("../src/data.js");
  localStorage.clear();

  /* (a) hvad telst draft */
  ok(D.boardScope("L1", "") === "L1", "ekkert draft -> deildin ein");
  ok(D.boardScope("", "") === "local", "engin deild -> `local`");
  ok(D.boardScope("L1", "1389356308125192192") === "L1@1389356308125192192",
    "draft-audkenni -> deild@draft");
  ok(D.boardScope("L1", "  1389356308125192192  ") === "L1@1389356308125192192",
    "og bil umhverfis er snyrt burt");
  /* Hálfslegid audkenni ma ekki verda bord. Notandinn slaer i reitinn og
     hvert atvik gefur nytt gildi — "1", "13", "138"… Vaeri hvert theirra
     bord vaeri bordid taemt i hverjum staf. */
  for (const bad of ["1", "138", "12345", "d2", "abc", "12a45678", null, undefined]) {
    ok(D.boardScope("L1", bad) === "L1",
      `\`${String(bad)}\` er ekki draft-audkenni -> deildin ein`);
  }

  /* (b) tomur listi byr ekki til lykil — en skrifast a lykil sem er til */
  localStorage.clear();
  D.saveScoped("taken:L1@111111", []);
  ok(localStorage.getItem("nfl_taken:L1@111111") == null,
    "tomt bord skrifar EKKI nyjan lykil");
  D.saveScoped("taken:L1@111111", ["a", "b"]);
  ok(JSON.parse(localStorage.getItem("nfl_taken:L1@111111")).length === 2,
    "en bord med volum gerir thad");
  D.saveScoped("taken:L1@111111", []);
  ok(JSON.parse(localStorage.getItem("nfl_taken:L1@111111")).length === 0,
    "og tha SKRIFAST tomt yfir — annars kaemi \"Reset\" til baka");

  /* (c) grisjun: nyjustu 3 lifa, thau eldri fara */
  localStorage.clear();
  for (let i = 1; i <= 5; i++) {
    D.saveScoped(`taken:L1@${1000000 + i}`, [`p${i}`]);
    D.touchBoardScope(`L1@${1000000 + i}`, 3);
  }
  const boardKeys = () => {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("nfl_taken:")) out.push(k);
    }
    return out.sort();
  };
  ok(boardKeys().length === 3, `thrju yngstu bordin lifa (${boardKeys().length})`);
  ok(!boardKeys().includes("nfl_taken:L1@1000001") &&
     boardKeys().includes("nfl_taken:L1@1000005"),
    "og thad er ELSTA sem fer, ekki thad nyjasta");
  /* Endurheimsokn a bord faerir thad fremst — annars felli virkt draft
     ut af aldri medan mock sem var opnad einu sinni sæti eftir. */
  D.touchBoardScope("L1@1000003", 3);
  D.saveScoped("taken:L1@1000009", ["p9"]);
  D.touchBoardScope("L1@1000009", 3);
  ok(boardKeys().includes("nfl_taken:L1@1000003"),
    "bord sem er heimsott aftur faerist fremst og lifir");

  /* (d) HANDVIRKA BORDID er utan grisjunar */
  D.saveScoped("taken:L1", ["hand1", "hand2"]);
  for (let i = 10; i <= 20; i++) {
    D.saveScoped(`taken:L1@${2000000 + i}`, [`q${i}`]);
    D.touchBoardScope(`L1@${2000000 + i}`, 3);
  }
  ok(JSON.parse(localStorage.getItem("nfl_taken:L1") || "[]").length === 2,
    "handvirka bordid stendur af ser ellefu mock i rod");

  /* (e) ad loka deild tekur bordin hennar MED — annars saeti eitt per
     mock eftir sem munadarlaus lykill. */
  localStorage.clear();
  D.saveScoped("taken:L1", ["h"]);
  D.saveScoped("taken:L1@331111", ["a"]);
  D.saveScoped("myPicks:L1@331111", ["a"]);
  D.saveScoped("taken:L2@332222", ["b"]);
  D.dropScopedState("L1");
  ok(localStorage.getItem("nfl_taken:L1") == null &&
     localStorage.getItem("nfl_taken:L1@331111") == null &&
     localStorage.getItem("nfl_myPicks:L1@331111") == null,
    "deild sem er lokad tekur oll bord sin med");
  ok(localStorage.getItem("nfl_taken:L2@332222") != null,
    "en snertir EKKI adra deild (`@` skilur ad, svo prefix getur ekki hlaupid yfir)");
  localStorage.clear();
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
