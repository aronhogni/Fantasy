/* ============================================================
   THOLPROF — VANTANDI OG SKEMMDAR GAGNASKRAR

   AF HVERJU: appid les data/*.json UTAN UR NETI
   (raw.githubusercontent.com). Hver skra getur vantad — nytt
   pipeline-skref sem er ekki yett enn, GitHub nidri, hálf-skrifud skra.
   Tha ma appid birta MINNA en ALDREI hrynja med hvitum skja, og tomt
   astand a ad SEGJA hvers vegna, ekki bara "saeki...".

   Profad: hver nyr flipi i 7 atburdarasum. Fann tvennt:
     - Umferdin skiladi 229 stofum (bert "Saeki last_gw.json...") thegar
       skrain vantadi — ogreinanlegt fra "hangir". Nu skyrt tomt astand.
     - Thurfti ad meta HVERN FLIPA serstaklega; fyrri utgafa maldi adeins
       sidasta astandid og stodst thvi alltaf, sama hvad vantadi.
   ============================================================ */
/* Vantandi/skemmdar skrar: birtast flipar an thess ad hrynja? */
import { readFileSync } from "node:fs";
/* VELAROHAD SLOD. Adur var "/Users/arongeorgsson/Fantasy/..." hardkodad,
   svo profin virkudu adeins a einni vel — onnur lota gat ekki keyrt thau. */
const REPO = new URL("../", import.meta.url);
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

/* SKEMMDAR SKRAR ERU ANNAR FLOKKUR EN VANTANDI — og hausinn a thessari
   skra lofadi theim fra byrjun an thess ad profa thaer. Vantandi skra
   fellur i `catch` og appid veit ad hun kom aldrei. SKEMMD skra kemur
   inn sem GILT svar (ok:true) og fer alla leid inn i `cook`/render —
   thad er leidin sem getur hvitad skjainn. Thrjar tegundir eru profadar:
     jsonVilla  — hálf-skrifud skra (pipeline drapst i midju skrifi)
     tomtSvid   — rett skra en lykil-fylkid er null
     rangGerd   — fylki thar sem hlutur a ad vera (skema-breyting)
     hlutur    — HLUTUR ThAR SEM FYLKI A AD VERA (gagnstaeda atttin)

   FJORDA TEGUNDIN VANTADI OG ThAD VAR RAUNVERULEGT GAT (14.8.2026).
   `rangGerd` profar fylki-i-stad-hlutar; ENGIN atburdarás profadi
   HLUT-I-STAD-FYLKIS, sem er einmitt su lögun sem `|| []` hleypir gegn
   (`{} || []` er `{}`) og sem kastar "object is not iterable". Maelt: thrjar
   valkvaedar skrar (`last_gw_shots`, `defcon`, `bsd_players`) felldu appid
   inni i <PlayerList>. Og hun er EKKI tilbuin: sviðid `players` er ThEGAR
   hlutur i `player_form.json`, `player_seasons.json` og `player_gw_*.json`,
   svo mis-vírud prop eda snids-breyting gefur nakvaemlega thetta.        */
const BREAK = {
  jsonVilla: () => { throw new SyntaxError("Unexpected end of JSON input"); },
  tomtSvid : o => ({ ...o, players: null, rows: null, shots: null }),
  rangGerd : () => [],
  hlutur   : o => ({ ...o, players: {}, rows: {}, shots: {} }),
};

/* [heiti, vantandi, skemmt: {skra: tegund}] */
/* Flipar sem eru HEIMSOTTIR, og OLL flipa-heitin (stikan ber thau öll, svo
   thau eru notud til ad SKERA hana fra spjaldinu — sja `panelLen`).      */
const TABS = ["Player stats", "Teams", "Gameweek", "Leaderboard",
              "Best of the best", "Set pieces"];
const ALL_TABS = ["Planner", ...TABS];

/* ============================================================
   MAELITAEKID SJALFT — TVENNT SEM VAR RANGT OG GAF 19 FALS-FELL

   Golfid a ad liggja a SPJALDINU, ekki a `document.body`: bolurinn ber haus
   + 7-flipa stiku + fot i HVERJU tilviki, svo maeling a honum getur ekki
   seð toman flipa (sama gildra og `pros-render.mjs:630` skjalar). Ad thvi
   marki var fyrri lagfaeringin rett. **BADAR adferdirnar sem hun notadi
   voru samt brotnar, og thad kom i ljos SOMU nott og timabilid vard
   lifandi (21.8.2026):**

   1. **FASTUR BID-TIMI (80 ms) ER EKKI MAELING A ThVI AD TEIKNINGU SE
      LOKID.** Hann var kvardadur a FORLEIKS-gagnamagni. Um leid og
      `data/live/gw1.json` (409 KB, 600 radir) baettist vid naest appid ekki
      ad teikna Teams-flipann innan 80 ms, og MIDJA teikningin maeldist —
      **93 stafir**. Suitan sagdi tha "spjaldid nanast tomt" i OLLUM 21
      atburdarasum. Sjalfstaed maeling a SAMA flipa med lengri bid gaf
      **2.275 stafi af raunverulegum lidstolum** — flipinn var i fullkomnu
      lagi allan timann. CLAUDE.md 5b: *maelitaekid getur sjalft verid
      villan.* Nu er bedid ThANGAD TIL TEXTINN HAETTIR AD VAXA (`settle`),
      sem er ohað gagnamagni; fastur timi hefdi thurft nyja kvordun i hvert
      sinn sem gagnaskra staekkar.

   2. **"STAERSTA HYLKI SEM BER EKKI HEITI ANNARRA FLIPA" GETUR EKKI FUNDID
      SPJALD SEM NEFNIR ANNAN FLIPA.** Teams-spjaldid ber merkimidann
      **`"Gameweeks"`** (`Teams.jsx:376`) — sem INNIHELDUR undirstrenginn
      `"Gameweek"`, heiti annars flipa. Hvert hylki utan um spjaldid var thvi
      utilokad. Maelt a sama flipa: heuristikin gefur **998**, byggingarleg
      maeling **2.185** — 54% af spjaldinu horfid, og VERRA: talan hefdi
      lika getad falid tomt spjald.
      Byggingarlega leidin spyr ekki um TEXTA heldur um BYGGINGU: stikan er
      hylkid sem ber FLESTA flipa-hnappa (7 af 7, 90 stafir), og spjaldid er
      thad sem eftir stendur af bolnum. Hun getur ekki brotnad thott spjald
      nefni flipa.
   ============================================================ */

/* Bidur thangad til bolur-textinn hefur verid OBREYTTUR tvo hringi i rod,
   eda thakid naest. Skilar fjolda hringja svo hann megi fullyrda um.     */
async function settleOn(doc, actFn) {
  let last = -1, stable = 0, i = 0;
  for (; i < 40; i++) {
    await actFn(async () => { await new Promise(r => setTimeout(r, 25)); });
    const n = (doc.body.textContent || "").length;
    if (n === last) { if (++stable >= 2) break; } else { stable = 0; last = n; }
  }
  return i;
}

/* GOLFID, ENDURKVARDAD MED RETTA MAELITAEKINU (21.8.2026).
   Maelt yfir ALLAR 21 atburdarasir x 6 flipa med `settle` + byggingarlegri
   maelingu: sja `CAL`-utprentunina i lok keyrslu. Talan hér er sett UNDIR
   laegsta heilbrigda spjaldid og VEL YFIR thad sem tomur flipi gefur —
   tomur flipi skilar adeins skel-textanum (~76 stafir), thvi stikan er
   thegar dregin fra.                                                     */
const PANEL_MIN = 400;

/* ============================================================
   HVER FLIPI VERDUR AD BERA SITT EIGID NAFN — GATID SEM VAR OPID

   Thangad til nu var krafan adeins "spjaldid er EKKI tomt". Undir henni
   maetti HVER flipi teikna spjald ANNARS flipa og suitan haldist graen —
   sem er ekki tholprof heldur naerveru-prof. Gamla eigid-nafn-prófid var
   fjarlaegt af rettri astaedu (thad las `document.body`, og hnappurinn sem
   var nybuið ad smella a uppfyllti thad sjalfur, svo thad gat ekki brugdist
   i 126 keyrslum), en gatid var tha SKILID EFTIR OPID.

   AKKERID ER MAELT, EKKI VALID: hvert spjald nefnir sig sjalft i sinni
   EIGIN yfirskrift (`h1/h2/h3`) — talid a ollum 21 atburdarasum x 6 flipum.
   `"Data sources"` er hlidarstika SKELJARINNAR og er thvi undanskilin.
   ATH: heiti spjaldsins er EKKI heiti hnappsins i tveimur tilvikum
   ("Player stats" -> `Players`, "Gameweek" -> `The gameweek`), svo
   hnappa-textinn er ONYTUR sem akkeri — thad er einmitt thess vegna sem
   thessi tafla er maeld og skrifud nidur.                               */
const PANEL_ID = {
  "Player stats":     "Players",
  "Teams":            "Teams",
  "Gameweek":         "The gameweek",
  "Leaderboard":      "Leaderboard",
  "Best of the best": "Best of the best",
  "Set pieces":       "Set pieces",
};
const SHELL_HEAD = "Data sources";

const SCENARIOS = [
  ["allt til",                    new Set(), {}],
  ["last_gw VANTAR",              new Set(["last_gw.json"]), {}],
  ["last_gw_shots VANTAR",        new Set(["last_gw_shots.json"]), {}],
  ["player_seasons VANTAR",       new Set(["player_seasons.json"]), {}],
  ["imminent VANTAR",             new Set(["imminent.json"]), {}],
  ["ALLAR NYJAR VANTA",           new Set(["last_gw.json","last_gw_shots.json","player_seasons.json","imminent.json"]), {}],
  ["set_piece_notes VANTAR",      new Set(["set_piece_notes.json"]), {}],
  /* BSD er NYJASTA heimildin og bar ENGA tholprofun — allt skota-kortid,
     stodukortid og 23 dalkar hanga a thessum tveimur skram.               */
  ["bsd_players VANTAR",          new Set(["bsd_players.json"]), {}],
  ["bsd_shots VANTAR",            new Set(["bsd_shots.json"]), {}],
  ["BADAR BSD VANTA",             new Set(["bsd_players.json","bsd_shots.json"]), {}],
  /* Skemmdar — hver ein er raunveruleg bilun sem getur komid ur pipeline. */
  /* players.json ER KJARNINN — an hennar er ekkert app. Tha eru fliparnir
     RETTILEGA ekki teiknadir, svo krafan er onnur og strangari i eðli sinu:
     skyrd villa a skjanum. Maelt: "Could not fetch the data from data/…".
     Ad heimta flipa hér vaeri ad heimta app an gagna.                      */
  ["players.json HALFSKRIFUD",    new Set(), { "players.json": "jsonVilla" }, "kjarni"],
  ["players.json VANTAR",         new Set(["players.json"]), {}, "kjarni"],
  ["bsd_players TOMT SVID",       new Set(), { "bsd_players.json": "tomtSvid" }],
  ["bsd_shots RONG GERD",         new Set(), { "bsd_shots.json": "rangGerd" }],
  ["player_seasons TOMT SVID",    new Set(), { "player_seasons.json": "tomtSvid" }],
  ["fixtures RONG GERD",          new Set(), { "fixtures.json": "rangGerd" }],
  /* HLUTUR I STAD FYLKIS — thessar thrjar felldu appid fyrir 14.8.2026.    */
  ["last_gw_shots HLUTUR",        new Set(), { "last_gw_shots.json": "hlutur" }],
  ["defcon HLUTUR",               new Set(), { "defcon.json": "hlutur" }],
  ["bsd_players HLUTUR",          new Set(), { "bsd_players.json": "hlutur" }],
  ["imminent HLUTUR",             new Set(), { "imminent.json": "hlutur" }],
  ["ALLAR FJORAR HLUTUR",         new Set(), { "last_gw_shots.json": "hlutur", "defcon.json": "hlutur",
                                               "bsd_players.json": "hlutur", "imminent.json": "hlutur" }],
];

let fail = 0;
for (const [label, missing, broken = {}, kind = "flipar"] of SCENARIOS) {
  const dom = new JSDOM("<!doctype html><div id=root></div>", { url: "http://localhost/", pretendToBeVisual: true });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.SVGElement = dom.window.SVGElement;
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const errors = [];
  const origErr = console.error;
  console.error = (...a) => { const m = String(a[0] ?? ""); if (!/not wrapped in act|Warning:/.test(m)) errors.push(m.slice(0,90)); };

  globalThis.fetch = async (url) => {
    const u = String(url);
    const name = u.split("/data/")[1];
    if (!name) return { ok: false, status: 404, json: async () => ({}) };
    if (missing.has(name)) return { ok: false, status: 404, json: async () => { throw new Error("404"); } };
    /* Skemmd skra svarar ok:true — thad er einmitt hvers vegna hun er
       haettulegri en vantandi skra og verdur ad profast serstaklega.   */
    if (broken[name]) return { ok: true, status: 200, json: async () => BREAK[broken[name]](J(name)) };
    try { return { ok: true, status: 200, json: async () => J(name) }; }
    catch { return { ok: false, status: 404, json: async () => { throw new Error("no file"); } }; }
  };

  /* Bundid vid ThENNAN dom — hver atburdaras byr sinn eigin.            */
  const settle = () => settleOn(dom.window.document, act);
  /* SPJALDID = BOLUR - STIKA. Stikan er fundin a BYGGINGU (hylkid sem ber
     flesta flipa-hnappa, minnsta slikt), aldrei a texta spjaldsins.      */
  let crashed = null; const perTab = {}, panelLen = {}, heads = {}; let firstPaint = "";
  try {
    const { default: App } = await import(new URL("src/App.jsx", REPO).href);
    const root = createRoot(document.getElementById("root"));
    await act(async () => { root.render(React.createElement(App)); });
    await settle();
    firstPaint = document.body.textContent || "";
    /* "Player stats" og "Teams" voru ekki profadir — og thad eru einmitt
       fliparnir sem BSD-gognin lenda i. Tholprof sem sleppir theim flipum
       sem nyjustu gognin fæda er tholprof a gomlu appi.                  */
    /* "Best of the best" baettist vid 9.8.2026. Hann er SERSTAKLEGA vidkvaemur
       her thvi hann les TVAER skrar sem eru EKKI til i forleik (pros.json og
       pros_gw.json) — nakvaemlega tilfellid sem thetta safn er til fyrir.   */
    for (const tab of TABS) {
      const b = [...document.querySelectorAll("button")].find(x => x.textContent.includes(tab));
      if (!b) { perTab[tab] = "HNAPP VANTAR"; continue; }
      await act(async () => { b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
      await settle();
      perTab[tab] = document.body.textContent || "";
      heads[tab] = [...document.querySelectorAll("h1,h2,h3")]
        .map(h => (h.textContent || "").trim())
        .filter(t => t && !t.includes(SHELL_HEAD));
    }
    /* ============================================================
       SPJALDID = ThAD SEM BREYTIST MILLI FLIPA (21.8.2026)

       Tvaer fyrri adferdir voru badar maeldar og badar felldar, og ThRIDJA
       tolan sem stokkbreyting gaf er astaedan:
         · "bolur - stika"      -> tomur flipi maeldist **1.002** stafir
         · "staersta systkini"  -> tomur flipi maeldist **929** stafir
       Baedi skilja SKELINA eftir inni i tolunni (haus, leit, FFDR/Chips,
       Connect, fot, hlidarstika), svo golfid hefdi ordid ad liggja i thrönga
       bilinu 929..1179 — 1,27x — thar sem NYR HNAPP I HAUS lyftir "tomu"
       tolunni upp yfir heilbrigt gagnabil. Golf sem raest af skelinni maelir
       ekki spjaldid.

       ThRIDJA ADFERDIN ER LEIDD, EKKI VALIN: skelin er per skilgreiningu
       ThAD SEM ER EINS a ollum flipum, svo hun er LANGSTI SAMEIGINLEGI
       FORSKEYTIS- OG VIDSKEYTIS-hluti bolanna sex. Spjaldid er thad sem
       eftir stendur. Tomur flipi gefur tha **0** — ekki 929, ekki 1.002 —
       og talan er onaem fyrir hverju sem baetist vid skelina.             */
    const bodies = TABS.map(t => perTab[t]).filter(x => typeof x === "string" && x !== "HNAPP VANTAR");
    let pre = 0, suf = 0;
    if (bodies.length >= 2) {
      const shortest = Math.min(...bodies.map(b => b.length));
      while (pre < shortest && bodies.every(b => b[pre] === bodies[0][pre])) pre++;
      while (suf < shortest - pre
             && bodies.every(b => b[b.length - 1 - suf] === bodies[0][bodies[0].length - 1 - suf])) suf++;
    }
    for (const t of TABS) {
      const b = perTab[t];
      panelLen[t] = (typeof b === "string" && b !== "HNAPP VANTAR")
        ? Math.max(0, b.trim().length - pre - suf) : 0;
    }
  } catch (e) { crashed = e.message; }
  console.error = origErr;

  // hver flipi verdur ad birta EITTHVAD marktaekt og ALDREI undefined/NaN
  const problems = [];
  if (crashed) problems.push("HRUNDI: " + crashed.slice(0, 60));

  /* KJARNA-ATBURDARAS: fliparnir eiga EKKI ad vera thar, en skjarinn ma
     ekki vera audur. Krafan er ad notandinn se hvad brast og hvad hann
     getur gert — hvitur skjar og "Saeki..." sem hangir eru bædi fall.   */
  if (kind === "kjarni") {
    const t = firstPaint.trim();
    if (!t.length) problems.push("HVITUR SKJAR — engin skilaboð");
    else if (!/could not|failed|error|villa|ekki/i.test(t))
      problems.push("tomt astand SEGIR EKKI hvers vegna: " + JSON.stringify(t.slice(0, 60)));
    if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(t)) problems.push("villuskilabod bera undefined/NaN");
    if (problems.length) fail++;
    console.log(`  ${problems.length ? "✗" : "✓"} ${label.padEnd(26)} ${
      problems.length ? problems.join(" | ") : `ok — skyrd villa (${t.length} staf)`}`);
    continue;
  }

  for (const [tab, txt] of Object.entries(perTab)) {
    if (txt === "HNAPP VANTAR") { problems.push(tab + ": hnapp vantar"); continue; }
    /* TVAER ATHUGANIR HER VORU DAUDAR OG SAFNID ER "eina sem ser hvitan
       skja" (CLAUDE.md kafli 5). Sannad med EINNI stokkbreytingu:
       `SetPieces.jsx` latinn skila `null` — flipinn birti ALGERLEGA
       EKKERT — og OLL 21 atburdarasin voru afram graenar, exit 0.

       (a) GOLFID VAR A `document.body`. Skelin (haus + 7-flipa stika +
           fot) er i honum i hverju tilviki, svo tomur Set pieces-flipi
           maeldist 1096 stafir — 2,7x YFIR 400. Sama villa og
           `pros-render.mjs:630` skjalfestir ("`host` ber allt appid, og
           flipa-stikan ein er yfir 400 stafir") og hafdi ThEGAR verid
           leyst thar; her var hun oleyst og beitt 126 sinnum (21 x 6).
           Golfid liggur nu a SPJALDINU (`panelLen`): 2045 -> 93 vid somu
           stokkbreytingu, svo hun fellur.

       (b) `!txt.includes(tab)` GAT ALDREI KVIKNAD. `txt` er allur
           `document.body` EFTIR ad smellt var a hnappinn sem fannst i
           :131 med `x.textContent.includes(tab)` — hnappurinn er sjalfur
           i body, svo heitid er ThAR med byggingu. Hun var auk thess
           TVITEKNING a "HNAPP VANTAR"-athuguninni i :131, sem ER virk.
           HUN ER EKKI ENDURVAKIN I SINNI GOMLU MYND, OG ThAD ER MAELT:
           HNAPPA-textinn er ONYTT akkeri, thvi spjaldid heitir ekki thad
           sama sem hnappurinn i tveimur tilvikum af sex ("Player stats"
           -> `Players`, "Gameweek" -> `The gameweek`). Krafan
           `panel.includes(hnappur)` vaeri thvi MAELT OSONN og felli a
           heilbrigdu appi.
           **EN GATID SEM HUN SKILDI EFTIR ER LOKAD ANNARS STADAR** —
           `PANEL_ID` her ofar: hvert spjald nefnir sig i sinni EIGIN
           yfirskrift, maelt 21 x 6. An thess maetti hver flipi teikna
           spjald ANNARS flipa og suitan haldist graen.                  */
    if ((panelLen[tab] ?? 0) < PANEL_MIN)
      problems.push(tab + ": spjaldid nanast tomt (" + (panelLen[tab] ?? 0) + " < " + PANEL_MIN + ")");
    /* EIGID NAFN — OG ENGIN ONNUR. Tvennt, thvi annad an hins er hálft:
       vantar eigid nafn = spjaldid teiknadist ekki; ber nafn ANNARS flipa
       = rangt spjald teiknadist, sem golfid getur ekki seð.              */
    const hs = heads[tab] || [];
    const mine = PANEL_ID[tab];
    if (mine && !hs.some(h => h.includes(mine)))
      problems.push(tab + ": yfirskriftin nefnir ekki spjaldid ("
        + JSON.stringify(hs.slice(0, 2)) + ")");
    const alien = Object.entries(PANEL_ID)
      .filter(([t, id]) => t !== tab && !mine.includes(id) && !id.includes(mine))
      .filter(([, id]) => hs.some(h => h.includes(id))).map(([t]) => t);
    if (alien.length) problems.push(tab + ": ber yfirskrift ANNARS flipa: " + alien.join(","));
    if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(txt)) problems.push(tab + ": birti undefined/NaN");
  }
  if (errors.length) problems.push("console.error: " + errors[0]);
  const bad = problems.length;
  if (bad) fail++;
  console.log(`  ${bad ? "✗" : "✓"} ${label.padEnd(26)} ${
    bad ? problems.join(" | ")
        : `ok — ${TABS.map(k => k.slice(0,6)+":"+(panelLen[k] ?? 0)).join(" ")}`}`);
}
console.log(`\nVANTANDI SKRAR: ${SCENARIOS.length - fail}/${SCENARIOS.length} atburdarasir standast`);
process.exit(fail ? 1 : 0);
