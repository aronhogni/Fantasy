/* ============================================================
   dashboard.mjs — FORSIDAN.

   Nyr flipi an profs er hvitur skjar sem bidur. `render.mjs` er "eina
   profid sem ser hvitan skja" og thad ber kafla per flipa — nyr flipi
   sem er ekki i theim lista er OPROFADUR meðan safnid er graent.

   ÞETTA SAFN PROFAR THAD SEM FORSIDAN FULLYRDIR, ekki ad hun teiknist:
     · BADAR deildir birtast, hvor med SINUM reglum
     · stada i forleik er EKKI rodud (thad er tilbuningur med utlit
       maelingar)
     · start/sit ber BADAR spatolur — Sleeper og okkar
     · waiver-listinn segir "engin skipti" thegar thad er svarid
     · "vitum ekki hvada lid er thitt" er SAGT, ekki giskad
     · bilun i Sleeper er SYNILEG
     · og EKKERT er sott fyrr en flipinn er opnadur

   Sidasta atridid er asettur vordur (`sleeper.mjs` kafli 4) og hann
   gildir afram: forsidan saekir vid OPNUN, sem er notanda-adgerd, EKKI
   vid raesingu.
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

/* ---------- raunveruleg leikmanna-audkenni ---------- */
const players = JSON.parse(readFileSync(path.join(DATA, "players.json"), "utf8"));
const byAdp = players.filter((p) => p.adpSleeper != null && p.adpSleeper < 400)
  .sort((a, b) => a.adpSleeper - b.adpSleeper);
const TOP = byAdp.slice(0, 60).map((p) => String(p.id));

/* ============================================================
   TVAER DEILDIR NOTANDANS — RAUNVERULEGAR TOLUR
   ============================================================
   10 lid PPR med K og DEF · 12 lid half-PPR AN theirra. Thaer eru
   viljandi gerolikar: forsidan verdur ad reikna hvern hluta ur SINNI
   deild, og deild sem baeri reglur hinnar liti fullkomlega normal ut.  */
const mkEntry = (id, name, rules, season, slot) => ({
  id, name, rules,
  imported: { leagueId: id, name, season, teams: rules.teams, rounds: rules.rounds,
              scoring: rules.scoring, rec: rules.scoring === "ppr" ? 1 : 0.5,
              exactScoring: true, bench: 5, superflex: false, orderDrawn: true,
              starters: rules.starters, flexPos: rules.flexPos, draftId: `d${id}`,
              status: "in_season", draftStatus: "complete", draftType: "snake",
              /* `playoff_teams` er deildar-REGLA, ekki maeling — hun ma
                 birtast i forleik. */
              settings: { playoff_teams: 6 } },
  warnings: [],
  teams: [{ slot, userId: "u-me", name: "mattitim" }],
  sync: { draftId: `d${id}`, slot },
});

const L_A = mkEntry("111111111111111111", "Patriots SB champs",
  { teams: 10, scoring: "ppr", rounds: 15, superflex: false,
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
    flexPos: ["RB", "WR", "TE"], maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 } },
  "2026", 7);
const L_B = mkEntry("222222222222222222", "Sofahetjur",
  { teams: 12, scoring: "half-ppr", rounds: 14, superflex: false,
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
    flexPos: ["RB", "WR", "TE"], maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 } },
  "2026", 3);

/* Rostrar. `played` stjornar thvi hvort tímabilid er byrjad. */
const mkRosters = (n, myRoster, played) =>
  Array.from({ length: n }, (_, i) => {
    const rid = i + 1;
    const mine = rid === myRoster;
    return {
      roster_id: rid,
      owner_id: mine ? "u-me" : `u${rid}`,
      /* MINN hopur ber raunveruleg audkenni; hinir bera SITT eigid
         skammt af toppnum, svo `freeAgents` hafi raunverulega tekna
         leikmenn ad sia burt. */
      players: TOP.slice((rid - 1) * 5, rid * 5),
      starters: mine ? TOP.slice(0, 5) : [],
      settings: played
        ? { wins: 10 - i, losses: i, ties: 0,
            fpts: 1500 - i * 40, fpts_decimal: 25,
            fpts_against: 1400 + i * 10, fpts_against_decimal: 50 }
        : { wins: 0, losses: 0, ties: 0, fpts: 0 },
    };
  });

const mkUsers = (n, myRoster) =>
  Array.from({ length: n }, (_, i) => ({
    user_id: i + 1 === myRoster ? "u-me" : `u${i + 1}`,
    display_name: i + 1 === myRoster ? "mattitim" : `owner${i + 1}`,
  }));

let played = true;
let sleeperMode = "ok";           // ok | fail
/* `inSeason` skiptir `meta.json` ut fyrir viku 5. AN THESSA er ADEINS
   forleikur profadur: `currentWeek` skilar `null` i forleik, svo
   `weekContext` er `null` og viku-adlogunin keyrir ALDREI. Safnid hefdi
   thvi verid graent an ad hafa snert thann kodann sem raunverulega ber
   fullyrdinguna "okkar tala er onnur en Sleeper". */
/* SATT FRA UPPHAFI, OG THAD ER NAUDSYNLEGT. `data.js` ber SAMEIGINLEGT
   skyndiminni per lotu — thad er ASETT og skjalad i hausnum a `load()`
   (ad saekja `players.json` tvisvar er hrein soun). Afleidingin hér er
   ad `meta.json` er FEST af thvi gildi sem hledst FYRST i ferlinu, svo
   ekki er haegt ad svissa milli forleiks og timabils i somu keyrslu.
   Fyrsta utgafa thessa profs setti `false` og flippadi sidan i `true`;
   yfirskriftin hafdi ENGIN ahrif og kaflinn fell med -1 dalka-visitolu.
   Vid veljum thvi TIMABILID hér, thvi thad er astandid sem viku-adlogunin
   er TIL FYRIR; forleiks-greinin er profud sem HREIN vardveisla nedar og
   `audit.mjs` opnar flipann i raunverulegum forleik. */
let inSeason = true;
const calls = [];

global.fetch = async (url) => {
  const s = String(url);
  if (s.includes("api.sleeper")) {
    calls.push(s);
    if (sleeperMode === "fail") throw new TypeError("Failed to fetch");
    const m = /\/league\/(\d+)\/(rosters|users)$/.exec(s);
    if (m) {
      const n = m[1] === L_A.id ? 10 : 12;
      const mine = m[1] === L_A.id ? 7 : 3;
      return { ok: true, status: 200,
               json: async () => (m[2] === "rosters"
                 ? mkRosters(n, mine, played) : mkUsers(n, mine)) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }
  const m = s.match(/\/data\/(.+)$/);
  if (!m) return { ok: false, status: 404, json: async () => ({}) };
  try {
    const raw = JSON.parse(readFileSync(path.join(DATA, m[1]), "utf8"));
    if (m[1] === "meta.json" && inSeason) {
      return { ok: true, status: 200,
               json: async () => ({ ...raw, seasonType: "regular", week: 5 }) };
    }
    return { ok: true, status: 200, json: async () => raw };
  } catch { return { ok: false, status: 404, json: async () => ({}) }; }
};

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
global.IS_REACT_ACT_ENVIRONMENT = true;
const App = (await import("../src/App.jsx")).default;

const settle = async (ms = 400) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)); }); };
const text = () => document.body.textContent || "";
const click = async (el) => {
  if (!el) return false;
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle(400);
  return true;
};
const waitFor = async (cond, ms = 4000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (cond()) return true; await settle(120); }
  return cond();
};

/** Setur upp heiminn og opnar forsiduna. */
async function boot({ entries = [L_A, L_B], user = { name: "mattitim", userId: "u-me" },
                      openHome = true } = {}) {
  localStorage.clear();
  localStorage.setItem("nfl_leagues", JSON.stringify(entries));
  localStorage.setItem("nfl_activeLeague", JSON.stringify(entries[0] ? entries[0].id : ""));
  if (user) localStorage.setItem("nfl_sleeperUser", JSON.stringify(user));
  calls.length = 0;
  const root = createRoot(document.getElementById("root"));
  await act(async () => { root.render(React.createElement(App)); });
  await settle(700);
  if (openHome) {
    const tab = [...document.querySelectorAll("button.tab")]
      .find((b) => /Dashboard/.test(b.textContent || ""));
    await click(tab);
    await settle(700);
  }
  return root;
}

/* ============================================================
   1. EKKERT ER SOTT VID RAESINGU
   ============================================================
   Asettur vordur (`sleeper.mjs` kafli 4). Forsidan saekir vid OPNUN,
   sem er notanda-adgerd. Vaeri hun sjalfgefni flipinn yrdi raesing =
   sokn og vordurinn faelli — thess vegna er thetta profad BADAR ATTIR:
   ekkert vid raesingu, OG eitthvad vid opnun (annars vaeri fyrri
   fullyrdingin sonn af thvi ad forsidan saekir aldrei neitt).       */
console.log("\n1. sott vid OPNUN, ekki vid raesingu");
{
  played = true; sleeperMode = "ok";
  const root = await boot({ openHome: false });
  ok(calls.length === 0, `engin Sleeper-koll vid raesingu (${calls.length})`);

  const tab = [...document.querySelectorAll("button.tab")]
    .find((b) => /Dashboard/.test(b.textContent || ""));
  ok(!!tab, "Dashboard-flipinn er SYNILEGUR (ekki bak vid \"More\")");
  await click(tab);
  await waitFor(() => calls.length > 0);
  ok(calls.length > 0, `og sott vid opnun (${calls.length} koll)`);
  ok(calls.every((u) => u.startsWith("https://api.sleeper.app/")),
    "oll koll fara adeins til Sleeper");
  root.unmount();
}

/* ============================================================
   2. BADAR DEILDIR, HVOR MED SINUM REGLUM
   ============================================================
   Þetta er kjarninn i beidninni ("forsidan … med badum deildunum
   minum"). Og reglurnar verda ad fylgja hverri: 10 lid PPR a moti 12
   lida half-PPR. Deild sem baeri reglur hinnar liti normal ut, svo
   fullyrdingin er a BADUM tolum.                                    */
console.log("\n2. badar deildir med sinum reglum");
{
  played = true; sleeperMode = "ok";
  const root = await boot();
  await waitFor(() => /Patriots SB champs/.test(text()) && /Sofahetjur/.test(text()));
  const t = text();
  ok(/Patriots SB champs/.test(t), "deild A birtist");
  ok(/Sofahetjur/.test(t), "deild B birtist");
  ok(/10 teams/.test(t) && /12 teams/.test(t),
    "badir lidafjoldar birtast (10 og 12)");
  ok(/PPR/.test(t) && /Half PPR/.test(t),
    "og badar stigagjafir (PPR og Half PPR)");
  ok(!/\bNaN\b/.test(t), "ekkert NaN");
  ok(!/\bundefined\b/.test(t), "ekkert undefined");
  ok(!/Something broke/.test(t), "villuvornin greip ekki");
  ok(t.length > 1200, `raunverulegt innihald (${t.length} stafir), ekki hvitur skjar`);
  root.unmount();
}

/* ============================================================
   3. START / SIT BER BADAR SPATOLUR
   ============================================================
   Notandinn bad um bædi Sleeper-toluna og OKKAR. Okkar tala er
   FULLYRDING um ad vid vitum eitthvad sem Sleeper missir, og fullyrding
   sem er birt EIN er bara tala. Thess vegna verda BADIR dalkar ad vera
   thar OG their verda ad bera TOLUR, ekki bara haus.                */
console.log("\n3. spatolurnar");
{
  played = true; sleeperMode = "ok";
  const root = await boot();
  await waitFor(() => {
    const h = [...document.querySelectorAll("table.data thead th")]
      .map((th) => (th.textContent || "").trim());
    return h.includes("Ours");
  });
  ok(/week 5/.test(text()), "a timabilinu: vikan er nefnd");

  /* DALKA-VISITALAN VERDUR AD VERA INNAN SOMU TOFLU.
     Fyrsta utgafa las `th` ur OLLUM `table.data` a sidunni (stada × 2
     deildir, uppstilling × 2, waiver × 2) og fekk visitolu 7 og 8 — sem
     er alls ekki i uppstillingar-toflunni — og las sidan
     `tr.children[7]` ur rodum ALLRA taflna. Visitalan kom ur einni toflu
     og rodin ur annarri, svo fullyrdingin maeldi ekkert. */
  const lineupTable = [...document.querySelectorAll("table.data")]
    .find((tb) => [...tb.querySelectorAll("thead th")]
      .some((th) => (th.textContent || "").trim() === "Ours"));
  ok(!!lineupTable, "uppstillingar-taflan finnst");
  const heads = lineupTable
    ? [...lineupTable.querySelectorAll("thead th")].map((th) => (th.textContent || "").trim())
    : [];
  const iS = heads.indexOf("Sleeper"), iO = heads.indexOf("Ours");
  ok(iS >= 0 && iO >= 0, `badir dalkar eru i HENNI (${iS}, ${iO})`);
  const rowsWithBoth = (lineupTable
    ? [...lineupTable.querySelectorAll("tbody tr")] : [])
    .filter((tr) => {
      const c = tr.children;
      if (!c[iS] || !c[iO]) return false;
      return /\d/.test(c[iS].textContent || "") && /\d/.test(c[iO].textContent || "");
    });
  ok(rowsWithBoth.length >= 3, `${rowsWithBoth.length} rodir bera BADAR tolurnar`);

  /* Vaeri viku-adlogunin OTENGD yrdi `Ours` nakvaemlega jofn `Sleeper` a
     hverri rod — og allt vaeri graent. Thad er "daudi markadslidurinn" i
     FPL-appinu: formulan rett, inntakid horfid, profin graen i viku. */
  const differ = rowsWithBoth.filter((tr) => {
    const a2 = (tr.children[iS].textContent || "").trim();
    const b2 = (tr.children[iO].textContent || "").trim();
    return a2 !== b2;
  });
  ok(differ.length >= 1,
    `og thaer eru OLIKAR (${differ.length} af ${rowsWithBoth.length}) — ` +
    `viku-adlogunin er raunverulega tengd`);
  ok(/5\.8%|measured/i.test(text()),
    "og maelingin a bak vid okkar tolu er nefnd");
  root.unmount();
}

/* ============================================================
   3b. FORLEIKUR: TVEIR EINS DALKAR VAERU VERRI EN EINN
   ============================================================
   Profad SEM HREIN VARDVEISLA, ekki i DOM: `meta.json` er fest af
   fyrsta lestri (sja notuna vid `inSeason`), svo thetta ferli getur
   ekki lika verid i forleik. Invariantid er hins vegar hreint og thad
   er ASTAEDAN fyrir thvi ad dalkurinn er einn:

     an viku -> `ctx == null` -> `weeklyProjection` keyrir ekki ->
     `proj` ER `projSleeper`, upp a tolu.

   Þetta fannst i thessu profi: fullyrdingin "tolurnar eru ekki eins"
   fell i forleik og APPID VAR RETT — tveir eins dalkar fullyrda edge
   sem er ekki til. `audit.mjs` opnar flipann i raunverulegum forleik og
   fellur a NaN/undefined, svo teikningin sjalf er thakin thar.       */
console.log("\n3b. an viku eru tolurnar EINS (thvi er einn dalkur)");
{
  const { weekRows, weekContext, currentWeek } =
    await import("../src/weekview.js");
  const roster = [
    { id: "1", name: "A", pos: "RB", team: "SF", proj: 170, bye: 9 },
    { id: "2", name: "B", pos: "WR", team: "KC", proj: 240, bye: 6 },
    { id: "3", name: "C", pos: "QB", team: "BUF", proj: 340, bye: 7 },
  ];
  ok(currentWeek({ seasonType: "pre", week: 1 }) === null,
    "forleikur gefur enga viku");
  ok(weekContext({ schedule: [], defense: [], week: null }) === null,
    "og tha er engin viku-samhengi");

  const flat = weekRows(roster, null);
  ok(flat.every((r) => r.proj === r.projSleeper),
    "an viku er `proj` NAKVAEMLEGA `projSleeper` — tveir dalkar vaeru eins");
  ok(flat.every((r) => r.proj != null && Number.isFinite(r.proj)),
    "og talan er samt raunveruleg (arstidar-spa deild a 17)");
  ok(flat.every((r) => r.bye === false),
    "engin auð vika thegar engin vika er thekkt");
  /* Og leikmadur an spar helst null — hann er ekki leikmadur med 0. */
  const noProj = weekRows([{ id: "9", name: "D", pos: "TE", team: "LV", proj: null }], null);
  ok(noProj[0].proj === null && noProj[0].projSleeper === null,
    "leikmadur an spar er null i BADUM, ekki 0");
}

/* ============================================================
   4. FORLEIKUR: STADAN MA EKKI VERA RODUD
   ============================================================
   `standings.js` skilar `complete: false` og `rank: null` thegar engir
   leikjir eru spiladir, thvi tafla sem radar tiu lidum 1-10 eftir engum
   leikjum er TILBUNINGUR MED UTLIT MAELINGAR. Forsidan verdur ad birta
   `why` I STAD toflunnar — ekki vid hlidina a henni.

   Profad BADAR ATTIR: an leikja engin rod, MED leikjum rod. Fullyrding
   sem bara segir "engin rod" vaeri sonn um app sem birtir aldrei stodu. */
console.log("\n4. forleikur er ekki rodud stada");
{
  played = false; sleeperMode = "ok";
  const root = await boot();
  await waitFor(() => /No games played|not a standing/i.test(text()));
  const t = text();
  ok(/No games played|not a standing/i.test(t),
    "forleikur: sagt ad thetta se ekki stada");
  ok(!/\b1-0-0\b|\b0-0-0\b/.test(t),
    "og engin \"0-0-0\" skra (hun les eins og maeld stada)");
  /* Ekkert saeti ma vera birt. */
  const rankCells = [...document.querySelectorAll("table.data tbody tr td:first-child")]
    .map((td) => (td.textContent || "").trim())
    .filter((v) => /^\d+/.test(v));
  ok(rankCells.length === 0 || !/W-L-T/.test(t),
    `engin saetatala i forleik (${rankCells.length})`);
  root.unmount();

  /* Og MED spiluðum leikjum a hun ad birtast. */
  played = true;
  const root2 = await boot();
  await waitFor(() => /W-L-T/.test(text()));
  ok(/W-L-T/.test(text()), "med spiluðum leikjum BIRTIST staðan");
  ok(/10-0-0|10-0/.test(text()), "og skrain er raunveruleg");
  root2.unmount();
}

/* ============================================================
   5. "VITUM EKKI HVADA LID ER THITT" ER SAGT
   ============================================================
   An audkennis er "hver a ad byrja" osvaranlegt, og gisk setur hop
   ANNARS MANNS a skjainn. Thad ma ekki gerast thegjandi.            */
console.log("\n5. othekkt lid er sagt");
{
  played = true; sleeperMode = "ok";
  /* Hvorki notandanafn ne saeti. */
  const noSlot = { ...L_A, teams: [], sync: { draftId: "dx", slot: null } };
  const root = await boot({ entries: [noSlot], user: null });
  await waitFor(() => /which team is yours|do not know which team/i.test(text()));
  const t = text();
  ok(/do not know which team/i.test(t),
    "appid segir ad thad viti ekki hvada lid er mitt");
  ok(!/\bNaN\b/.test(t) && !/Something broke/.test(t),
    "og ekkert hrynur i thvi astandi");
  root.unmount();
}

/* ============================================================
   6. BILUN I SLEEPER ER SYNILEG
   ============================================================
   Deild sem svarar ekki ma ekki lesast eins og deild sem er tom. Thad
   fyrra er net; thad sidara er stada.                                */
console.log("\n6. bilun er synileg");
{
  played = true; sleeperMode = "fail";
  const root = await boot();
  await waitFor(() => /did not answer/i.test(text()));
  const t = text();
  ok(/did not answer/i.test(t), "bilun er sogd berum ordum");
  ok(!/Something broke/.test(t), "og villuvornin greip ekki");
  ok(/Patriots SB champs/.test(t),
    "deildin er samt nefnd (reglurnar eru vistadar, thad var STADAN sem vantadi)");
  ok(!/\bNaN\b/.test(t), "ekkert NaN");
  root.unmount();
  sleeperMode = "ok";
}

/* ============================================================
   7. WAIVER: "ENGIN SKIPTI" ER SVAR
   ============================================================
   Verkfaeri sem finnur ALLTAF skipti er gagnslaust. Og `pool == null`
   (rostrar olesnir) ma ALDREI lesast eins og "enginn er tekinn" —
   annars vaeri thar listi sem bydur 300 leikmenn i eigu annarra.     */
console.log("\n7. waiver-hlutinn");
{
  played = true; sleeperMode = "ok";
  const root = await boot();
  await waitFor(() => /Waiver wire/i.test(text()));
  const t = text();
  ok(/Waiver wire/i.test(t), "waiver-hlutinn birtist");
  /* Annadhvort tillogur EDA "enginn slaer neinn" — badir eru gild svor,
     en TOMT svaedi er thad ekki. */
  const hasTable = /Add/.test(t) && /Drop/.test(t);
  const hasNone = /Nobody on waivers beats/i.test(t);
  ok(hasTable || hasNone,
    `svarid er skyrt: ${hasTable ? "tillogur" : hasNone ? "engin skipti" : "TOMT"}`);
  ok(/free agents/i.test(t), "og laugin er TALIN");
  ok(!/\bNaN\b/.test(t), "ekkert NaN i waiver-hlutanum");
  root.unmount();

  /* ============================================================
     OG HIN ATTIN — ANNARS ER "ENGIN SKIPTI" ONNUR TOM FULLYRDING
     ============================================================
     Hopurinn her ofan er topp-5 leikmenn ADP, svo "enginn slaer neinn"
     er RETT svar. En prof sem ser adeins thad svar getur ekki greint
     "verkfaerid vann" fra "verkfaerid finnur aldrei neitt". Þess vegna
     er hér HRAKINN hopur: djupir leikmenn utan topp 200, thar sem
     laugin A ad bera betri menn.                                     */
  const weakIds = byAdp.slice(240, 250).map((p) => String(p.id));
  const origFetch = global.fetch;
  global.fetch = async (url) => {
    const s2 = String(url);
    const m = /\/league\/(\d+)\/rosters$/.exec(s2);
    if (m && s2.includes("api.sleeper")) {
      calls.push(s2);
      return { ok: true, status: 200, json: async () => {
        const rs = mkRosters(m[1] === L_A.id ? 10 : 12, m[1] === L_A.id ? 7 : 3, true);
        for (const r of rs) {
          if (String(r.owner_id) === "u-me") { r.players = weakIds; r.starters = weakIds.slice(0, 5); }
        }
        return rs;
      } };
    }
    return origFetch(url);
  };
  const root2 = await boot();
  await waitFor(() => /Add/.test(text()) || /Nobody on waivers beats/i.test(text()));
  const t2 = text();
  ok(/Add/.test(t2) && /Drop/.test(t2),
    "hrakinn hopur FAER tillogur (annars finnur verkfaerid aldrei neitt)");
  ok(!/\bNaN\b/.test(t2), "og ekkert NaN i theim");
  root2.unmount();
  global.fetch = origFetch;
}

/* ============================================================
   8. ENGIN DEILD -> SAGT, EKKI TOM SIDA
   ============================================================ */
console.log("\n8. engin deild tengd");
{
  played = true; sleeperMode = "ok";
  const bare = { id: "local", name: "My league",
                 rules: { teams: 12, scoring: "ppr", rounds: 15, superflex: false,
                          starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 },
                          maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 } },
                 imported: null, warnings: [], teams: [],
                 sync: { draftId: "", slot: null } };
  const root = await boot({ entries: [bare], user: null });
  const t = text();
  ok(/No league connected/i.test(t),
    "sagt ad engin deild se tengd, i stad thess ad birta tomt");
  ok(calls.length === 0,
    `og EKKERT sott fyrir deild an Sleeper-audkennis (${calls.length})`);
  root.unmount();
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
