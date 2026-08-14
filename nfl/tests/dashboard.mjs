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
   HOPURINN VERDUR AD BERA MANN I FRII I ÞEIRRI VIKU SEM ER PROFUD
   ============================================================
   `bye`-lidurinn i `weekRows` var OPROFADUR i praxis og tvaer
   stokkbreytingar lifdu thess vegna:

     bye: ctx != null && r.bye === ctx.week   ->   bye: false      LIFDI
     pickupAdvice(... week: null)                                 LIFDI

   Astaedan var ekki i lidnum heldur i FIXTURUNNI: vikan er fest a 5 og
   hopurinn var `TOP.slice(0, 5)` — Gibbs (6), Robinson (11), Chase (6),
   Nacua (11), McCaffrey (8). ENGINN I FRII I VIKU 5. Þar med var
   `onByeThisWeek` alltaf `[]`, `bye`-kassinn aldrei teiknadur, og
   fullyrdingin `flat.every(r => r.bye === false)` VAR SONN LIKA UNDIR
   STOKKBREYTINGUNNI.

   Athugasemdin vid linuna i `weekview.js` segir hvad thetta kostar:
   "`bye: false` hardkodad thydir enginn er nokkurn timann i frii, svo
   uppstillingartolid setti mann i byrjunarlid a ÞEIRRI VIKU SEM HANN
   SPILAR EKKI — null stig i saeti sem atti ad bera 12."

   `BYE_WEEK` er 5 thvi thad er vikan sem hermda ESPN-svarid gefur.
   Leikmadurinn er VALINN UR GOGNUNUM, ekki harðkodadur: nafn sem er
   negld inn i prof rekur um leid og ADP breytist (`players.json` er
   endurskrifud daglega).                                             */
const BYE_WEEK = 5;
const BYE_MAN = byAdp.slice(0, 60).find((p) => p.bye === BYE_WEEK) || null;
const BYE_ID = BYE_MAN ? String(BYE_MAN.id) : null;

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
              /* ============================================================
                 SNIÐID SEM PIPAN SKRIFAR, EKKI SNIÐ SEM ER TIL HAEGDA
                 ============================================================
                 Hér stod `settings: { playoff_teams: 6 }`.
                 `leagueFromSleeper` skrifar EKKI `settings` i `imported` —
                 fixturan bar thvi logun sem raunverulegur innflutningur
                 getur ekki gefid. Og ENGIN fullyrding notadi svidid: thad
                 var thar til ad rettlaeta hegdun sem var hvorki profud ne
                 moguleg, medan cutið var DAUTT i appinu (sja
                 `wiring.mjs` kafla 7).

                 Nu er flata snidid notad — `playoffTeams`, sem er thad sem
                 `imported` raunverulega ber — og `wiring.mjs` sannar ad
                 `standingsFrom` lesi thad.                              */
              playoffTeams: 6, playoffWeekStart: 15 },
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
      /* MINN hopur faer mann i frii i viku 5 (sja `BYE_MAN`) — annars
         er `bye`-lidurinn oprofadur og stokkbreyting a honum lifir. */
      players: mine && BYE_ID
        ? [...TOP.slice(0, 4), BYE_ID, ...TOP.slice((rid - 1) * 5, rid * 5)]
            .filter((x, i, a) => a.indexOf(x) === i)
        : TOP.slice((rid - 1) * 5, rid * 5),
      starters: mine
        ? (BYE_ID ? [...TOP.slice(0, 4), BYE_ID] : TOP.slice(0, 5))
        : [],
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

  /* ============================================================
     STAERDAR-AKKERI — PROFIN MAELDU SAMKVAEMNI, ALDREI STAERD
     ============================================================
     Stokkbreytingin `base = r.proj / 17 -> r.proj` LIFDI badar
     jsdom-svidsmyndir. Oll viku-spa verdur 17x of stor — 240 stig i viku
     fyrir WR sem a ad bera 14 — og bædi sofnin graen, thvi thau profudu
     `proj === projSleeper` (samkvaemni) og "thaer eru olikar" a
     timabili, HVERGI staerd.

     Akkerid er thegar til i `usageblend.mjs`: "burdarasni hefur 15-25
     hlaup/leik". Sama gerd vantadi hér. Bilin nedan eru RUM — thau eru
     ekki kvordun, thau eru til thess ad utiloka staerdargradu-villu.  */
  {
    const anchor = weekRows([
      { id: "a1", name: "RB", pos: "RB", team: "SF", proj: 238 },
      { id: "a2", name: "QB", pos: "QB", team: "BUF", proj: 340 },
      { id: "a3", name: "TE", pos: "TE", team: "KC", proj: 153 },
    ], null);
    const [rb, qb, te] = anchor;
    ok(rb.proj > 4 && rb.proj < 30,
      `byrjunarlids-RB ber 4-30 stig i viku (${rb.proj}) — ` +
      `17x villa gaefi ${(rb.proj * 17).toFixed(0)}`);
    ok(qb.proj > 8 && qb.proj < 35, `QB ber 8-35 (${qb.proj})`);
    ok(te.proj > 2 && te.proj < 22, `TE ber 2-22 (${te.proj})`);
    /* Og deilingin verdur ad vera SAMA tala sem `usageblend` flytur ut —
       hun var skrifud tvisvar og athugasemdin var eina tengingin. */
    const { GAMES_IN_SEASON } = await import("../src/usageblend.js");
    ok(Math.abs(rb.proj - 238 / GAMES_IN_SEASON) < 1e-9,
      `og talan er nakvaemlega \`proj / GAMES_IN_SEASON\` ` +
      `(${238 / GAMES_IN_SEASON})`);
    const src = readFileSync(path.join(ROOT, "src", "weekview.js"), "utf8");
    ok(/GAMES_IN_SEASON/.test(src) && !/r\.proj \/ 17\b/.test(src),
      "`weekview.js` flytur toluna inn i stad thess ad bera sitt eigid 17");
  }

  const flat = weekRows(roster, null);
  ok(flat.every((r) => r.proj === r.projSleeper),
    "an viku er `proj` NAKVAEMLEGA `projSleeper` — tveir dalkar vaeru eins");
  ok(flat.every((r) => r.proj != null && Number.isFinite(r.proj)),
    "og talan er samt raunveruleg (arstidar-spa deild a 17)");
  ok(flat.every((r) => r.bye === false),
    "engin auð vika thegar engin vika er thekkt");

  /* ------------------------------------------------------------
     OG ÞESSI FULLYRDING ER EINSKIS VIRDI EIN.
     ------------------------------------------------------------
     `bye === false` a ollum er SATT lika thegar lidurinn er
     `bye: false` hardkodad — og su stokkbreyting LIFDI. Krafan er
     OSAMHVERF, eins og i `playerlist-sort.mjs` i FPL-verkefninu:
     nulltalan verdur ad standa NEDAR OG jakvaeda tilfellid verdur ad
     koma UT. Þess vegna er raunverulegt frii profad hér samhlida.

     Athugasemdin i `weekview.js` segir hvad hardkodad `false` kostar:
     leikmadur i frii settur i byrjunarlid, "null stig i saeti sem atti
     ad bera 12".                                                     */
  /* SAMHENGID ER BYGGT MED `weekContext`, EKKI HANDSKRIFAD. Fyrsta
     utgafa smiðaði `{ week: 7, defense: null, schedule: null }` og
     `weekRows` fell a `ctx.opp.get` — sem er ANNAD tilfelli af thvi ad
     endurutfaera i profi thad sem kodinn byggir. Rett er ad kalla
     bygginguna, tha er profid ekki ad giska a innra snidid.           */
  const byeCtx = weekContext({
    schedule: [{ week: 7, home: "SF", away: "SEA" }],
    defense: [], week: 7,
  });
  ok(byeCtx != null, "viku-samhengi fyrir viku 7 er byggt med `weekContext`");
  const mix = weekRows([
    { id: "b1", name: "Frii", pos: "RB", team: "SEA", proj: 170, bye: 7 },
    { id: "b2", name: "Spilar", pos: "RB", team: "SF", proj: 170, bye: 11 },
  ], byeCtx);
  ok(mix[0].bye === true,
    "leikmadur i frii i ÞESSARI viku faer `bye: true` (hardkodad `false` fellur hér)");
  ok(mix[1].bye === false,
    "og sa sem spilar faer `false` — badar attir, ekki bara ein");
  /* `proj` HELST FULL TALA OG ÞAD ER ASETT — `lineup.js` utilokar eftir
     FLAGGINU (`playable: false`, `ev: 0`), ekki eftir spanni. Fyrsta
     utgafa thessarar fullyrdingar krafdist `proj === 0` og FELL a rettum
     kodha; hun var min tilgata um utfaersluna, ekki krafa notandans.

     Þess vegna er AFLEIDINGIN profud i stad milliliðarins: madurinn i
     frii ma ekki komast i byrjunarlid. Þad er nakvaemlega thad sem
     athugasemdin i `weekview.js` segir ad hardkodad `false` kostadi —
     "null stig i saeti sem atti ad bera 12".                          */
  {
    const { optimalLineup, slotsFor } = await import("../src/lineup.js");
    const slots = slotsFor({ starters: { RB: 1 }, flexPos: [] });
    const best = optimalLineup(mix, slots);
    /* `starters` er `[{ slot, eligible, player }]` — audkennid er inni i
       `player`. Fyrsta utgafan las `x.id || x.player` og fékk HLUTINN,
       svo `includes("b1")` var osatt af RANGRI astaedu og fullyrdingin
       "hann er ekki i byrjunarlidi" var TOM. Hun stodst — og hefdi
       stadist thott hann VAERI thar. Sidari fullyrdingin (`b2` ER thar)
       er einmitt til thess ad thetta komi i ljos, og hun gerdi thad. */
    const startedIds = (best.starters || [])
      .map((x) => x && x.player && x.player.id).filter(Boolean);
    ok(!startedIds.includes("b1"),
      `madurinn i frii er EKKI i byrjunarlidi (${startedIds.join(",") || "tomt"})`);
    ok(startedIds.includes("b2"),
      "en sa sem spilar ER — annars vaeri fullyrdingin ofan sonn af thvi " +
      "ad enginn var valinn");
  }
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

  /* ============================================================
     "ENGIN SKIPTI" MA EKKI SEGJAST UM HOP SEM ER TOMUR
     ============================================================
     FANNST A SKJANUM, EKKI I TALNINGU. I forleik er hopurinn tomur og
     allir 1.043 leikmenn lausir — og waiver-hlutinn sagdi samt "Nobody
     on waivers beats anyone on your roster". Su setning er FULLYRDING um
     samanburd sem var aldrei gerdur: hun les eins og yfirveguð
     nidurstada thegar sannleikurinn er "thad er ekkert til ad skoda enn".
     Start/sit-hlutinn hafdi thegar retta orðalagið fyrir sama astand;
     waiver-hlutinn hafdi thad ekki.                                    */
  ok(!/Nobody on waivers beats/i.test(t) || /free agents/.test(t),
    "waiver-hlutinn stendur");
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
   3d. VIKU-ABATINN ER PER STIGAGJOF — OG TAFLAN MA EKKI REKA
   ============================================================
   Adur stod "maelt 5,8% af bilinu (t=4,33, 7/7)" a BADUM deildum
   notandans. Su tala er PPR-talan. `mktweek-lab` maeldi incumbent-inn i
   ollum thremur snidum 12.8.2026 — thad hafdi ALDREI verid gert — og i
   half-PPR er hun **3,199% med t=1,908 og adeins 5 af 7 timabilum
   jakvaed**, sem er EKKI marktaekt (throskuldur 2,228).

   Notandinn spilar i BAÐUM (Patriots ppr, Sofahetjur half-ppr), svo
   PPR-talan a half-deildinni let OMARKTAEKA tolu lesast eins og maelda.

   Þessi kafli ber bokudu tofluna vid `data/measure/mktweek.json`, svo
   hun geti ekki rekid i thogn — sama mynstur og `HALF_LAB` i
   `rulebasis.js`. Endurkeyrsla labsins sem breytir tolunum FELLIR
   thetta, og tha uppfaerir madur TOFLUNA, ekki profid.               */
console.log("\n3d. viku-abatinn er per stigagjof");
{
  const { WEEKLY_MEASURED, weeklyEdgeNote, T_CRIT_7 } = await import("../src/weekview.js");

  /* ------------------------------------------------------------
     ÞROSKULDURINN VERDUR AD VERA SA SEM `rulebasis.js` BER
     ------------------------------------------------------------
     `T_CRIT_7` var 2,228, sem er t(0,975; df=10) — heitid sagdi "7 ar"
     en talan var ur ellefu-ara rod. Rett er 2,447 (df = 7-1 = 6), og
     `rulebasis.js` bar retta toflu allan timann.

     ENGIN NIDURSTADA HAGGADIST (oll thrju t yfir badum throskuldum), svo
     skekkjan var osynileg i utkomunni. Þad gerir hana ekki omerkilega:
     throskuldur sem er 9% of lagur er DULID FRJALSLYNDI sem hefdi sagt
     "marktaekt" um t = 2,3 einn dag. Þess vegna er hann nu borinn vid
     toluna sem hitt einingin notar i stad thess ad standa einn.       */
  {
    const { tCritFor } = await import("../src/rulebasis.js")
      .then((m) => ({ tCritFor: m.tCritFor || m.tCrit || null }))
      .catch(() => ({ tCritFor: null }));
    const src = readFileSync(path.join(ROOT, "src", "rulebasis.js"), "utf8");
    const m = src.match(/7:\s*([0-9.]+)/);
    ok(!!m, "`rulebasis.js` ber throskuld fyrir 7 ar i toflunni sinni");
    if (m) {
      ok(Math.abs(T_CRIT_7 - Number(m[1])) < 0.0005,
        `T_CRIT_7 ${T_CRIT_7} == toflan i rulebasis.js (${m[1]})`);
      ok(Number(m[1]) !== 2.228,
        "og thad er ekki df=10-gildid 2,228 sem stod hér adur");
    }
    if (tCritFor) {
      ok(Math.abs(tCritFor(7) - T_CRIT_7) < 0.0005,
        `og \`tCrit(7)\` gefur somu tolu (${tCritFor(7)})`);
    }
  }
  const lab = JSON.parse(readFileSync(path.join(DATA, "measure", "mktweek.json"), "utf8"));

  /* ============================================================
     TVAER TOLUR, OG SU SEM ER BIRT ER SU HREINA
     ============================================================
     `defweek-lab` synir ad birta talan var SJALF-SMITUD: `defense.json`
     er SEASON TOTAL (hver rod `games` 14-17), svo bakprofid notadi vorn
     ur ollu timabilinu til ad "spa" viku 3 — leikurinn var i inntakinu.

     `leakyPct` er su tala og hun er PINNAD vid `mktweek.json` (og
     `startsit_*.json`, sem ber hana). `pct` er WALK-FORWARD talan og hun
     er pinnad vid `defweek.json`. Su sidari er thad sem notandinn les.  */
  const defLab = JSON.parse(readFileSync(path.join(DATA, "measure", "defweek.json"), "utf8"));
  const keyOf = { ppr: "ppr", standard: "standard", "half-ppr": "half" };
  for (const [ours, theirs] of Object.entries(keyOf)) {
    const t = WEEKLY_MEASURED[ours];

    /* --- SMITADA talan, pinnad vid mktweek --- */
    const inc = lab.incumbent && lab.incumbent[theirs];
    ok(!!inc, `${theirs} er i mktweek.json`);
    if (inc) {
      ok(Math.abs(t.leakyPct - inc.pctOfGapClosed) < 0.01,
        `${ours}: smitud ${t.leakyPct} == mktweek ${inc.pctOfGapClosed}`);
      ok(Math.abs(t.leakyT - inc.t) < 0.01, `${ours}: smitud t ${t.leakyT}`);
    }

    /* --- HREINA talan, pinnad vid defweek --- */
    const wf = defLab.incumbentWalkForward && defLab.incumbentWalkForward[theirs];
    ok(!!wf, `${theirs} ber \`incumbentWalkForward\` i defweek.json`);
    if (wf) {
      ok(Math.abs(t.pct - wf.pctOfGapClosed) < 0.01,
        `${ours}: BIRT ${t.pct} == walk-forward ${wf.pctOfGapClosed}`);
      ok(Math.abs(t.t - wf.t) < 0.01, `${ours}: birt t ${t.t} == ${wf.t}`);
      ok(t.positive === wf.positive, `${ours}: ${t.positive} jakvaed == ${wf.positive}`);
    }

    /* --- OG SU HREINA VERDUR AD VERA LAEGRI I PPR --- */
    if (ours === "ppr") {
      ok(t.pct < t.leakyPct - 1,
        `ppr: hreina talan er MERKJANLEGA laegri (${t.pct} < ${t.leakyPct})`);
    }
  }
  /* Smitid var ekki adeins ad blasa upp ppr heldur lika ad FELA ad half
     stendur: smitud t = 1,908 (omarktaek), hrein t = 2,615 (marktaek). */
  ok(WEEKLY_MEASURED["half-ppr"].leakyT < T_CRIT_7 &&
     WEEKLY_MEASURED["half-ppr"].t > T_CRIT_7,
    `half: smitud t ${WEEKLY_MEASURED["half-ppr"].leakyT} < ${T_CRIT_7} < ` +
    `hrein t ${WEEKLY_MEASURED["half-ppr"].t} — smitid FALDI ad hun stendur`);

  /* MARKTAEKNIN ER REIKNUD, ekki bokud sem skodun: t a moti 2,228. */
  for (const [ours, m] of Object.entries(WEEKLY_MEASURED)) {
    ok(m.significant === (m.t > T_CRIT_7),
      `${ours}: significant=${m.significant} samsvarar t=${m.t} vs ${T_CRIT_7}`);
  }
  /* OLL THRJU standa a hreinu tolunni — thad er nidurstadan, og hun er
     ONNUR en su sem var birt i gaer. */
  ok(Object.values(WEEKLY_MEASURED).every((m) => m.significant),
    "oll thrju snid standa a HREINU tolunni");

  /* SETNINGIN sjalf: omarktaek stigagjof ma EKKI lesast eins og maeld. */
  const half = weeklyEdgeNote("half-ppr");
  const ppr = weeklyEdgeNote("ppr");
  ok(/walk-forward/i.test(ppr.text),
    "setningin SEGIR ad talan se walk-forward (thad var atridid)");
  ok(/3\.482/.test(ppr.text) && /2\.86/.test(half.text),
    "og hver ber SINA HREINU tolu, ekki somu");
  /* SMITADA TALAN MA EKKI BIRTAST. Hun var a skjanum fram ad 13.8.2026. */
  ok(!/5\.831/.test(ppr.text),
    "og smitada talan 5,831 er EKKI i textanum");
  ok(!/3\.199/.test(half.text), "ne 3,199 i half");
  ok(/weeks already played/i.test(ppr.text),
    "og thad er sagt HVERS VEGNA hun er hrein");
  /* Othekkt snid faer ENGA tolu. */
  const unknown = weeklyEdgeNote("te-premium");
  ok(unknown.measured === false && !/\d\.\d/.test(unknown.text),
    "othekkt stigagjof faer enga tolu birta");
}

/* ============================================================
   3e. TALAN SEM STENDUR A HVERJU SPJALDI — LESIN AF SKJANUM
   ============================================================
   Kafli 3d profar `weeklyEdgeNote` SEM HREINT FALL og thad er ekki nog:
   ekkert las TEIKNUDU deildar-spjaldid, svo stokkbreytingin

     weeklyEdgeNote(scoring)   ->   weeklyEdgeNote("ppr")

   i `Dashboard.jsx` LIFDI — badar deildir hefdu tha bordid PPR-toluna
   3,482% og half-deildin lesid hana sem sina. Þad er NAKVAEMLEGA villan
   sem kafli 3d var skrifadur til ad fjarlaegja (adur stod 5,8% a badum),
   endurvakin einum stad sidar i kedjunni og osynileg fyrir hreinu profin.

   Fullyrdingin er thvi TVIHLIDA og PER SPJALDI: half-spjaldid VERDUR ad
   bera 2,860 OG MA EKKI bera 3,482; ppr-spjaldid hid gagnstaeda. Krafa
   sem adeins segir "einhver tala er thar" — eda "2,86 er einhvers stadar
   a sidunni" — hefdi verid graen undir stokkbreytingunni, thvi sidan ber
   BADAR deildir og thar med badar tolur.                              */
console.log("\n3e. hvert spjald ber SINA tolu (lesid af skjanum)");
{
  played = true; sleeperMode = "ok";
  const root = await boot();
  await waitFor(() => /Measured walk-forward/.test(text()));

  /* SPJALDIÐ ER SOTT MEDAN DOM-ID ER LIFANDI. `root.unmount()` tæmir
     `document`, svo texti sem er lesinn EFTIR a er tomur strengur — og
     `!/3\.482/.test("")` er SONN. Þad er tom fullyrding af verstu gerd
     (CLAUDE.md 5b), svo textinn er FANGADUR hér, adur en nokkud er
     tekid nidur. */
  const panelText = (name) => {
    const p = [...document.querySelectorAll("div.panel")]
      .find((el) => [...el.querySelectorAll("h2")]
        .some((h) => (h.textContent || "").trim() === name));
    return p ? (p.textContent || "") : null;
  };
  const ppr = panelText("Patriots SB champs");     // 10 lid, PPR
  const half = panelText("Sofahetjur");            // 12 lid, half-PPR

  ok(ppr != null && half != null, "badi spjoldin finnast sem ser `div.panel`");
  ok(ppr !== half, "og thau eru TVO spjold, ekki sama hnutur tvisvar");
  /* FORSENDAN: setningin er raunverulega a BADUM. An hennar vaeri
     "3,482 er ekki a half-spjaldinu" satt af thvi ad thar er engin
     setning — sama gildran og `!includes(X)` an sonnunar a X. */
  ok(/Measured walk-forward/.test(ppr || "") && /Measured walk-forward/.test(half || ""),
    "og BADI bera viku-setninguna (annars vaeru neikvaedu krofurnar tomar)");

  ok(/3\.482/.test(ppr || ""), "ppr-spjaldid ber 3,482 — PPR-toluna");
  ok(!/2\.860|2\.86\b/.test(ppr || ""), "og EKKI half-toluna 2,860");
  ok(/2\.860|2\.86\b/.test(half || ""), "half-spjaldid ber 2,860 — HALF-toluna");
  ok(!/3\.482/.test(half || ""),
    "og EKKI 3,482 — hardkodad `weeklyEdgeNote(\"ppr\")` fellur HER");
  /* Og hvorugt ber smitudu tolurnar sem voru birtar fram ad 13.8.2026. */
  ok(!/5\.831/.test(ppr || "") && !/3\.199/.test(half || ""),
    "hvorugt spjald ber smitudu tolurnar (5,831 / 3,199)");

  root.unmount();
}

/* ============================================================
   3f. FOTNOTAN UNDIR WAIVER-LISTANUM NEFNDI RANGA ORSOK
   ============================================================
   Hun sagdi ad rodir sem eru ekki graenar hvili ad hluta a
   `minGain`-golfinu ("a conservative guess, not a fitted number"). Þad er
   OSATT um hverja einustu birta rod: `pickupAdvice` siar eftir golfinu
   ADUR en rod verdur til (`gain < floor -> continue`), og `confidenceOf`
   profar thad viljandi ekki — "skilyrdi sem getur ekki brugdist er ekki
   skilyrdi". Astaedan er alltaf ein af threm (undir varamanns-threpi ·
   ESPN-bakfall · ekki heill) og hun stendur thegar i `why`.
   `tests/waivers.mjs` kafli 8b ber vel-laesilega svidid vid fallid; hér
   er SETNINGIN SEM NOTANDINN LES borin vid thad sama.

   ÞEKJA ER FULLYRDING, OG HUN FELLDI FYRSTU UTGAFU ÞESSA KAFLA. Hann var
   fyrst i sömu svidsmynd og 3e (hopur = topp-5 ADP), thar sem ENGIN
   tillaga verdur til — fotnotan var hvergi og allar `every`-krofurnar
   voru samt graenar a TOMU fylki. Þess vegna er hopurinn hér HRAKINN
   (ADP 241-250, sami hopur og kafli 7 notar): hann gefur 272 tillogur,
   241 theirra utan graena flokksins, svo fotnotan VERDUR til.         */
console.log("\n3f. waiver-fotnotan nefnir RETTA orsokina");
{
  played = true; sleeperMode = "ok";
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
  const root = await boot({ entries: [L_A] });
  await waitFor(() => /Rows not in green/.test(text()));

  /* Fangad MEDAN DOM-ID ER LIFANDI — `root.unmount()` taemir `document`
     og `!/x/.test("")` er SONN. Tom fullyrding af verstu gerd. */
  const foot = [...document.querySelectorAll("div.dim")]
    .map((el) => el.textContent || "")
    .filter((t) => /Rows not in green/.test(t));
  /* Waiver-taflan er sott UR DOM-INU og ekki ur `textContent`:
     `textContent` limir hausana saman i "AddDropGainWhy", svo `\bAdd\b`
     finnur hana ekki — sama limingar-gildra og `MUNaNEW` -> `NaN` i
     FPL-verkefninu, bara i hina attina. */
  const waiverRows = [...document.querySelectorAll("table.data")]
    .filter((tb) => {
      const h = [...tb.querySelectorAll("thead th")].map((th) => (th.textContent || "").trim());
      return h.includes("Add") && h.includes("Drop");
    })
    .reduce((n, tb) => n + tb.querySelectorAll("tbody tr").length, 0);

  ok(waiverRows > 0, `forsendan: hrakinn hopur FAER tillogur (${waiverRows} rodir)`);
  ok(foot.length > 0,
    `og fotnotan um rodir utan graena flokksins er a skjanum (${foot.length})`);
  ok(foot.every((t) => !/minimum-gain floor is a conservative guess/.test(t)),
    "hun segir EKKI ad golfid se astaedan (gamla ranga orsokin)");
  ok(foot.every((t) => /replacement level/.test(t) && /ESPN fallback/.test(t) &&
                       /not fully\s+available/.test(t)),
    "hun nefnir thau THRJU skilyrdi sem `confidenceOf` raunverulega profar");
  ok(foot.every((t) => /already cleared it/.test(t)),
    "og segir berum ordum ad hver birt rod hafi thegar stadid golfid");

  root.unmount();
  global.fetch = origFetch;
}

/* ============================================================
   3c. FRETTIR OG MEIDSLI — BIRT, ALDREI TULKUD
   ============================================================
   Fréttir eru SAMHENGI. Reglan i `MyTeam.jsx` gildir her lika: "tolid
   les thaer ekki og breytir engri tolu vegna theirra; ad lata
   malgreiningu faera spa vaeri omaeld tala i reit".

   OG NAFNA-BAKLEIDIN VERDUR AD VERA SYND. `newsmatch.js` parar a
   `espnId` fyrst og a nafni ADEINS fyrir tha sem bera ekkert audkenni
   — thvi "Josh Allen" (BUF, QB) og "Josh Allen" (JAX, LB) eru sami
   strengur. Gamla utgafan i `MyTeam.jsx` leitadi a audkenni EDA nafni
   fyrir hvern leikmann, svo sa sem BAR audkenni gat samt parast a
   nafni vid annan mann. Profad her sem HREIN vorpun, thvi hun er hrein
   og thad er odyrara en ad smida frettaskra i DOM.                   */
console.log("\n3c. frettir eru birtar, ekki tulkadar");
{
  const { newsForRoster, injuredOn } = await import("../src/newsmatch.js");

  const roster = [
    { id: "1", name: "Josh Allen", pos: "QB", espnId: "3918298", injury: null },
    { id: "2", name: "Bijan Robinson", pos: "RB", espnId: null, injury: "Questionable" },
    { id: "3", name: "Active Guy", pos: "WR", espnId: "999", injury: "Active" },
  ];
  const news = { articles: [
    { id: "a1", headline: "Allen throws four", published: "2026-08-10T00:00:00Z",
      athletes: [{ espnId: "3918298", name: "Josh Allen" }] },
    /* SAMA NAFN, ANNAR MADUR og annad audkenni. Hann er EKKI i hopnum,
       svo thetta ma ALDREI parast. */
    { id: "a2", headline: "Linebacker Josh Allen signs", published: "2026-08-09T00:00:00Z",
      athletes: [{ espnId: "4241985", name: "Josh Allen" }] },
    { id: "a3", headline: "Robinson limited", published: "2026-08-08T00:00:00Z",
      athletes: [{ espnId: "4430807", name: "Bijan Robinson" }] },
    { id: "a4", headline: "Nobody relevant", published: "2026-08-07T00:00:00Z",
      athletes: [{ espnId: "5", name: "Someone Else" }] },
  ] };

  const m = newsForRoster({ roster, news });
  ok(m.loaded === true, "frettaskra sem er til er merkt `loaded`");
  ok(m.items.length === 2, `tvaer greinar passa (${m.items.length})`);
  ok(m.items.some((a) => a.id === "a1") && m.items.some((a) => a.id === "a3"),
    "rettar tvaer");
  /* ÞETTA ER PROFSTEINNINN: samnefndi linebacker-inn ma EKKI parast. */
  ok(!m.items.some((a) => a.id === "a2"),
    "samnefndur madur sem er EKKI i hopnum parast EKKI (gamla villan)");
  ok(m.viaId === 1 && m.viaName === 1,
    `porun er TALIN: ${m.viaId} a audkenni, ${m.viaName} a nafni`);
  ok(m.items.find((a) => a.id === "a3").matchedBy === "name",
    "sa an audkennis var paradur a nafni og thad er MERKT");
  ok(m.items[0].id === "a1", "nyjasta fyrst");

  /* Vantandi frettaskra er "vitum ekki", ekki "engar frettir". */
  const none = newsForRoster({ roster, news: null });
  ok(none.loaded === false && none.items.length === 0,
    "vantandi frettaskra -> `loaded: false`, ekki tomt sem stadreynd");

  /* Meidsli: "Active" er EKKI meidsli og `null` er ekki heldur. */
  const hurt = injuredOn(roster);
  ok(hurt.length === 1 && hurt[0].id === "2",
    `adeins raunverulegt meidsli flaggast (${hurt.length})`);
  ok(!hurt.some((r) => r.injury === "Active"), "\"Active\" er ekki meidsli");
  ok(injuredOn(null).length === 0 && injuredOn([]).length === 0,
    "rusl gefur tomt, ekki hrun");

  /* Tveir eins i SAMA hop -> parun omoguleg og TALIN, ekki gisk. */
  const dup = newsForRoster({
    roster: [{ id: "9", name: "Same Name", espnId: null },
             { id: "10", name: "Same Name", espnId: null }],
    news: { articles: [{ id: "b1", headline: "x", published: "2026-01-01T00:00:00Z",
                         athletes: [{ name: "Same Name" }] }] } });
  ok(dup.items.length === 0 && dup.ambiguous === 1,
    `tviraett nafn er talid og EKKI parad (${dup.ambiguous})`);
}

/* ============================================================
   7b. FORLEIKUR: ENGINN WAIVER-LISTI, EKKI "ENGIN SKIPTI"
   ============================================================
   Þrjar OLIKAR astaedur fyrir tomum waiver-lista og thaer mega EKKI
   bera sama texta:
     · rostrar olesnir      -> vid vitum ekki hverjir eru teknir
     · lid othekkt          -> vid vitum ekki hvad ER hopurinn minn
     · hopur TOMUR (fyrir draft) -> thad er ekkert til ad skoda enn
     · hopur fullur, engin skipti -> RAUNVERULEG nidurstada
   Sidasta setningin var borin a THRIDJA tilfellinu og las tha eins og
   yfirveguð nidurstada. Profad hér i ollum fjorum.                   */
console.log("\n7b. thrjar astaedur fyrir tomum waiver-lista");
{
  played = true; sleeperMode = "ok";

  /* (a) HOPUR TOMUR — engir leikmenn draftadir. */
  const origFetch = global.fetch;
  global.fetch = async (url) => {
    const s2 = String(url);
    if (/\/league\/(\d+)\/rosters$/.test(s2) && s2.includes("api.sleeper")) {
      calls.push(s2);
      const m = /\/league\/(\d+)\/rosters$/.exec(s2);
      return { ok: true, status: 200, json: async () => {
        const rs = mkRosters(m[1] === L_A.id ? 10 : 12, m[1] === L_A.id ? 7 : 3, true);
        for (const r of rs) { r.players = []; r.starters = []; }
        return rs;
      } };
    }
    return origFetch(url);
  };
  const rootE = await boot({ entries: [L_A] });
  await waitFor(() => /Waiver wire/i.test(text()));
  const tE = text();
  ok(/no waiver wire|Nothing drafted yet/i.test(tE),
    "tomur hopur: sagt ad enginn waiver-listi se til enn");
  ok(!/Nobody on waivers beats/i.test(tE),
    "og EKKI \"nobody beats anyone on your roster\" — thad var fullyrdingin " +
    "um samanburd sem var aldrei gerdur");
  ok(/1043|free agents|players are still unowned/i.test(tE),
    "en talan er samt sogd (hun var alltaf rett)");
  rootE.unmount();
  global.fetch = origFetch;

  /* (b) LID OTHEKKT — enginn notandi, ekkert saeti. */
  const noSlot = { ...L_A, teams: [], sync: { draftId: "dx", slot: null } };
  const rootU = await boot({ entries: [noSlot], user: null });
  await waitFor(() => /Waiver wire/i.test(text()));
  const tU = text();
  ok(/do not know which team is yours/i.test(tU),
    "othekkt lid: sagt, og ekki latid lesast eins og \"engin skipti\"");
  ok(!/Nobody on waivers beats/i.test(tU),
    "og hin setningin er EKKI thar");
  rootU.unmount();
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
