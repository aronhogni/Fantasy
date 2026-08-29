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

/* ============================================================
   MINN HOPUR MA VERA STYRDUR — KAFLI 10 THARF VONDA UPPSTILLINGU
   ============================================================
   Sjalfgefna fixturan gefur mer fimm byrjunarlidsmenn af tiu saetum,
   sem er GILT astand en svarar EKKI spurningunni "hvad er ad hja mer" i
   theim skilningi ad thad se raunverulegt SKIPTI — thar losnar saeti sem
   enginn i byrjunarlidi er gjaldgengur i, svo `out` er `null` i hverri
   rod. Kafli 10 tharf BADAR gerdirnar, svo hann setur sinn eigin hop.
   `null` thydir "notadu sjalfgefna", svo eldri kaflar haggast ekki.   */
let myOverride = null;
let matchupsOverride = null;

/* ============================================================
   OLAESILEGUR LEIKMANNALISTI — KAFLI 11
   ============================================================
   Sleeper ber `players: null` a hop sem enginn hefur draftad i og thad
   er RAUNVERULEG upplysing. Allt annad en fylki (strengur, tala, hlutur)
   er ONYT GERD, og `freeAgents` TELUR hana i stad thess ad lesa hana sem
   "tomur hopur" — annars vaeri sagt "enginn er tekinn hja thessu lidi" um
   lid sem vid gatum ekki lesid. `null` thydir "notadu retta gerd", svo
   eldri kaflar haggast ekki.                                          */
let unreadableSlot = null;

/* Rostrar. `played` stjornar thvi hvort tímabilid er byrjad. */
const mkRosters = (n, myRoster, played) =>
  Array.from({ length: n }, (_, i) => {
    const rid = i + 1;
    const mine = rid === myRoster;
    if (mine && myOverride) {
      return {
        roster_id: rid, owner_id: "u-me",
        players: myOverride.players.slice(),
        starters: myOverride.starters.slice(),
        settings: played
          ? { wins: 5, losses: 2, ties: 0, fpts: 900, fpts_decimal: 0,
              fpts_against: 850, fpts_against_decimal: 0 }
          : { wins: 0, losses: 0, ties: 0, fpts: 0 },
      };
    }
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
      /* SIDAST, svo hun YFIRSKRIFI `players` — spread a undan lyklinum
         hefdi verid thogul og fixturan afram laesileg. */
      ...(unreadableSlot === rid ? { players: "oops" } : {}),
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
    /* UPPSTILLING LIDINNAR VIKU. Sjalfgefid `null` — tha er engin vika
       skorud og `weekRegret` skilar `null`, sem er forleiks-hegdunin. */
    const mm = /\/league\/(\d+)\/matchups\/(\d+)$/.exec(s);
    if (mm) {
      return { ok: true, status: 200,
               json: async () => (matchupsOverride || []) };
    }
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
                      openHome = true, seed = null } = {}) {
  localStorage.clear();
  localStorage.setItem("nfl_leagues", JSON.stringify(entries));
  localStorage.setItem("nfl_activeLeague", JSON.stringify(entries[0] ? entries[0].id : ""));
  if (user) localStorage.setItem("nfl_sleeperUser", JSON.stringify(user));
  /* `seed` VERDUR AD KOMA EFTIR `clear()`. Kallandi sem setur lykil
     A UNDAN `boot` fær hann thurrkadan ut og profid les tha tomt astand
     sem "eiginleikinn virkar ekki" — fyrsta utgafa kafla 9 gerdi einmitt
     thad og sa "No roster yet". */
  if (seed) for (const [k, v] of Object.entries(seed)) {
    localStorage.setItem(k, JSON.stringify(v));
  }
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
   3c. VIKU-SAMHENGID ER LYKLAD A TIMABIL — "SIDASTA ROD VANN"
   ============================================================
   `weekContext` byggdi BADAR uppflettingar sinar med `Map.set` an ars:

     leikjaskrain   `opp.set(g.home, g.away)`         yfir vikuna
     vornin         `dvp.set(`${team}|${pos}`, d)`    yfir stodu

   og BADAR skrarnar bera FLEIRA EN EITT TIMABIL:
     `schedule.json`  2025 OG 2026 (544 REG-radir) -> "vika 5" fannst tvisvar
     `defense.json`   2019-2025 (1.120 radir)      -> hvert lid x stoda 7x

   ThAD GAF RETT SVAR AF RANGRI ASTAEDU. 2026 liggur SIDAST i
   leikjaskranni og 2025 sidast i vorninni (JS itrar heiltolu-lika lykla i
   haekkandi rod i `Object.entries`), svo "sidasta vinnur" hitti a rett ar.
   Ekkert i `src/` og ekkert i profunum pinnadi thad.

   MAELT MED SOMU SKRA I OFUGRI ROD, 18 vikur x 32 lid (576 lid-vikur):
       rangur motherji (ur odru timabili)     514
       markadslina BUIN TIL ur odru timabili  327
       lid i FRII 2026 fekk motherja ur 2025   30
   og vorn-margfaldarinn haggast um 9,0% (2019 gegn 2025).

   ThRIDJU TOLUNA ER RETT AD LESA UPPHATT: 30 lid-vikur thar sem madur i
   FRII faer motherja, sem thydir ad `bye` verdur `false` og
   uppstillingartolid setur hann i byrjunarlid — "null stig i saeti sem
   atti ad bera 12", ordrett kostnadurinn sem `weekview.js` varar sjalf
   vid i athugasemdinni vid `bye`.

   OG FJORDA VILLAN VAR I SAMA KALLI: `if (t)` var ALLTAF SATT.
   `impliedTeamTotals` skilar HLUT (`{home:null, away:null}`) thegar linan
   er ekki opnud, og hlutur er truthy — svo leikur an linu SKRIFADI `null`
   i kortid. Innan eins timabils skadlaust; thvert a timabil skrifadi
   hann null OFAN I RAUNTOLU. Thad er sama aettbogi og markadslidurinn i
   FPL-hlutanum sem var DAUDUR i heila viku medan oll profin voru graen.
   ============================================================ */
console.log("\n3c. viku-samhengid er lyklað a TIMABIL");
{
  const { weekContext, weekRows } = await import("../src/weekview.js");
  const { defenseMult, impliedTeamTotals } = await import("../src/model.js");
  const defense = JSON.parse(readFileSync(path.join(DATA, "defense.json"), "utf8"));
  const schedule = JSON.parse(readFileSync(path.join(DATA, "schedule.json"), "utf8"));

  /* -- ThEKJA ER FULLYRDING (CLAUDE.md 5b regla 1). Beri hvorug skrain
        fleira en eitt timabil er allur kaflinn tom fullyrding. -- */
  const defYears = [...new Set(defense.map((d) => Number(d.season)))].sort((a, b) => a - b);
  const schYears = [...new Set(schedule.map((g) => Number(g.season)))].sort((a, b) => a - b);
  ok(defYears.length >= 2,
    `defense.json ber ${defYears.length} timabil (${defYears.join(",")})`);
  ok(schYears.length >= 2,
    `schedule.json ber ${schYears.length} timabil (${schYears.join(",")})`);
  const cur = schYears.at(-1), prev = schYears[0];

  /* ---------- A. LEIKJASKRAIN: rodin ma ekki rada ---------- */
  let wrongOpp = 0, invented = 0, byeBroken = 0, teamWeeks = 0;
  const reversed = [...schedule].reverse();
  for (let wk = 1; wk <= 18; wk++) {
    const truth = weekContext({ schedule: schedule.filter((g) => Number(g.season) === cur),
                                defense, week: wk, season: cur });
    const mixed = weekContext({ schedule: reversed, defense, week: wk, season: cur });
    if (!truth || !mixed) continue;
    for (const t of new Set([...truth.opp.keys(), ...mixed.opp.keys()])) {
      teamWeeks++;
      const a = mixed.opp.get(t) ?? null, b = truth.opp.get(t) ?? null;
      if (a !== b) { wrongOpp++; if (b == null) byeBroken++; }
      const ia = mixed.implied.get(t) ?? null, ib = truth.implied.get(t) ?? null;
      if (ib == null && ia != null) invented++;
    }
  }
  ok(teamWeeks > 500, `${teamWeeks} lid-vikur maeldar (annars maelir kaflinn ekkert)`);
  ok(wrongOpp === 0,
    `SAMA SKRA I OFUGRI ROD gefur SAMA motherja i ollum ${teamWeeks} lid-vikum ` +
    `(${wrongOpp} rangir) — gamli kodinn gaf 514`);
  ok(byeBroken === 0,
    `og ENGINN i frii faer motherja ur odru timabili (${byeBroken}) — gamli kodinn gaf 30`);
  ok(invented === 0,
    `og engin markadslina er BUIN TIL ur odru timabili (${invented}) — gamli kodinn gaf 327`);

  /* `if (t)` VAR ALLTAF SATT — fullyrdingin um hlutinn er hér svo
     lagfaeringin i `weekview.js` se ekki bara "hun virkar nuna". */
  ok(!!impliedTeamTotals(null, null),
    "`impliedTeamTotals(null,null)` ER truthy hlutur — thess vegna var `if (t)` gagnslaust");
  ok(impliedTeamTotals(null, null).home === null,
    "og tolurnar i honum eru null, svo hlidid verdur ad vera a TOLUNNI");
  /* Leikur an linu ma ekki skrifa null i kortid: nagranninn helst. */
  const noLine = weekContext({ season: 2030, week: 3, defense: [], schedule: [
    { season: 2030, week: 3, type: "REG", home: "AAA", away: "BBB", total: 44, spread: 0 },
    { season: 2030, week: 3, type: "REG", home: "CCC", away: "DDD", total: null, spread: null },
  ] });
  ok(noLine.implied.get("AAA") === 22 && noLine.implied.has("CCC") === false,
    "leikur an linu SKRIFAR EKKERT (`has` er false), hann skrifar ekki null");
  ok(noLine.opp.get("CCC") === "DDD",
    "en motherjinn er samt thekktur — 'engin lina' og 'engin leikur' eru ADGREIND");

  /* ---------- B. VORNIN: rett ar, og ADEINS thad ---------- */
  /* Tilbuin leikjaskra per ar svo hvert ar i `defense.json` se prófanlegt
     (leikjaskrain a disknum ber adeins tvo sidustu arin). */
  const fakeSched = (y) => [{ season: y, week: 1, type: "REG", home: "SF", away: "LA",
                              total: 48.5, spread: 3.5 }];
  const ctxNew = weekContext({ schedule: fakeSched(defYears.at(-1)), defense,
                              week: 1, season: defYears.at(-1) });
  const ctxOld = weekContext({ schedule: fakeSched(defYears[0]), defense,
                              week: 1, season: defYears[0] });
  const yrs = new Set([...ctxNew.dvp.values()].map((d) => Number(d.season)));
  const yrsOld = new Set([...ctxOld.dvp.values()].map((d) => Number(d.season)));
  ok(yrs.size === 1 && yrs.has(defYears.at(-1)),
    `season=${defYears.at(-1)} gefur ADEINS thad ar i dvp (${[...yrs].join(",")})`);
  ok(yrsOld.size === 1 && yrsOld.has(defYears[0]),
    `og season=${defYears[0]} gefur ADEINS ${defYears[0]} — baðar attir, ekki bara ein`);
  ok(ctxNew.defSeason === defYears.at(-1) && ctxNew.defRows === ctxNew.dvp.size,
    `\`defSeason\` segir hvada ar thad var (${ctxNew.defSeason}, ${ctxNew.defRows} radir)`);

  /* Rod skrarinnar ma ekki rada vorninni heldur. */
  const ctxRev = weekContext({ schedule: fakeSched(defYears.at(-1)),
                              defense: [...defense].reverse(), week: 1,
                              season: defYears.at(-1) });
  let same = ctxRev.dvp.size === ctxNew.dvp.size && ctxRev.dvp.size > 0;
  for (const [k, v] of ctxNew.dvp) {
    const r = ctxRev.dvp.get(k);
    if (!r || Number(r.season) !== Number(v.season) || r.adj !== v.adj) { same = false; break; }
  }
  ok(same, `vornin er lika ordu-ohad (${ctxRev.dvp.size} radir i ofugri rod)`);

  /* HVE MIKID ar-vixlid kostadi — astaedan fyrir thvi ad thetta er villa
     og ekki snyrting. */
  let worst = 0;
  for (const [k, v] of ctxNew.dvp) {
    const o = ctxOld.dvp.get(k);
    if (!o) continue;
    worst = Math.max(worst,
      Math.abs(defenseMult(v.adj, v.leagueMean) - defenseMult(o.adj, o.leagueMean)));
  }
  ok(worst > 0.02,
    `ar-vixl haggar vorn-margfaldaranum um ${(worst * 100).toFixed(1)}% ` +
    `(${defYears[0]} gegn ${defYears.at(-1)})`);

  /* ---------- C. VIKA 1: ar sem er EKKI i vorninni ---------- */
  ok(!defense.some((d) => Number(d.season) === cur),
    `${cur} er EKKI i defense.json — thad ER astandid i viku 1 (skrifad a thridjudogum)`);
  const w1ctx = weekContext({ schedule: schedule.filter((g) => Number(g.season) === cur),
                              defense, week: 1, season: cur });
  ok(w1ctx.dvp.size === 0 && w1ctx.defSeason === null,
    "-> engin vorn og `defSeason: null` (EKKI vorn fyrra ars med thessa ars merki)");
  ok(w1ctx.seasonAsked === cur,
    `en `+"`seasonAsked`"+` segir hvers var beðið (${w1ctx.seasonAsked}) svo vidmotid geti nefnt arid`);
  /* AFLEIDINGIN, ekki millilidurinn: talan ber markadslinuna en ENGAN
     varnarlid. Borid vid ar SEM HEFUR vorn, annars vaeri thetta tomt. */
  const one = [{ id: "z1", name: "Z", pos: "RB", team: "SF", proj: 238, bye: 9 }];
  const withDef = weekRows(one, weekContext({ schedule: fakeSched(defYears.at(-1)),
    defense, week: 1, season: defYears.at(-1) }))[0];
  const noDef = weekRows(one, w1ctx)[0];
  ok(noDef.proj != null && withDef.proj != null,
    `badar tolur eru raunverulegar (${noDef.proj} an varnar, ${withDef.proj} med)`);
  ok(Math.abs(noDef.proj - withDef.proj) > 1e-9,
    "og thaer eru OLIKAR — annars vaeri fullyrdingin um 'engan varnarlid' tom");
  /* Og hun ber SAMT markadslinuna — hun er ekki fallin i arstidar-medaltal.
     LIDID ER VALID UR GOGNUNUM, EKKI HANDSKRIFAD: fyrsta utgafa thessarar
     fullyrdingar notadi SF og FELL a rettum koda, thvi SF er vaentur til ad
     skora NAKVAEMLEGA 22,5 i viku 1 2026 og `gameScriptMult` er tha 1 upp a
     null. Fullyrdingin var rett; fixturan var handskrifud agiskun. */
  const lively = [...w1ctx.implied.entries()]
    .find(([, v]) => v != null && Math.abs(v - 22.5) > 1);
  ok(!!lively, `viku 1 ber lid med linu fjarri grunnlinunni (${lively ? lively.join("=") : "engin"})`);
  if (lively) {
    const r = weekRows([{ id: "z2", name: "Z2", pos: "RB", team: lively[0], proj: 238 }],
                       w1ctx)[0];
    ok(r.proj !== r.projSleeper,
      `talan an varnar ber SAMT markadslinuna (${r.proj} gegn ${r.projSleeper})`);
  }

  /* ---------- D. `season` VANTAR -> engin agiskun ---------- */
  const ctxNo = weekContext({ schedule, defense, week: 1 });
  ok(ctxNo === null || (ctxNo.dvp.size === 0 && ctxNo.defSeason === null),
    "kallandi sem sleppir `season` faer ENGA vorn, ekki thogult nyjasta arid");

  /* ---------- E. BADIR LESMATAR SENDA `season` ----------
     Byggingarleg fullyrding: hun fellur um leid og annar hvor hettir,
     ADUR en notandinn ser rangt ar. Sama gerd og `prediction-ledger.mjs`
     i FPL-hlutanum (CLAUDE.md 7.1).                                    */
  for (const f of ["Dashboard.jsx", "MyTeam.jsx"]) {
    const src = readFileSync(path.join(ROOT, "src", f), "utf8");
    const call = /weekContext\(\{[^}]*\}\)/.exec(src);
    ok(!!call, `${f}: kallid a \`weekContext\` fannst`);
    ok(!!call && /season\s*:/.test(call[0]),
      `${f} sendir \`season\` med (${call ? call[0].replace(/\s+/g, " ") : "?"})`);
  }
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
    /* ============================================================
       SPURT ER FALLID, EKKI TEXTINN (leidrett 29.8.2026)
       ============================================================
       Hér stod `src.match(/7:\s*([0-9.]+)/)` — regex a TOFLU-STAFINA i
       `rulebasis.js`. Su fullyrding brotnadi um leid og taflan var
       sameinud i `learn.js` (thrjar afritanir voru til med OLIKA
       merkingu a arguminu), thott gildid vaeri OBREYTT: 2,447.

       Fullyrding um kodann fell thvi thegar kodinn var lagfaerdur, og
       hun hefdi jafnframt stadist thott FALLID laesi tofluna rangt —
       nakvaemlega gagnrynin sem stendur i athugasemdinni fyrir nedan.
       Nu er talan sott ur fallinu sjalfu, sem er su sem appid notar. */
    ok(!!tCritFor, "`rulebasis.js` FLYTUR UT throskuldarfallid (`tCrit`)");
    if (tCritFor) {
      ok(Math.abs(T_CRIT_7 - tCritFor(7)) < 0.0005,
        `T_CRIT_7 ${T_CRIT_7} == tCrit(7) i rulebasis.js (${tCritFor(7)})`);
      ok(tCritFor(7) !== 2.228,
        "og thad er ekki df=10-gildid 2,228 sem stod hér adur");
    }
    /* ÞESSI FULLYRDING VAR DAUD: `rulebasis.js` flutti HVORUGT
       `tCritFor` ne `tCrit` ut, svo `if (tCritFor)` var alltaf osatt og
       blokkin keyrdi hja engum. Throskuldurinn var thvi borinn vid
       TOFLUNA i skranni (regex) en ALDREI vid fallid sem les hana — og
       `tCrit` gaeti hafa lesid hana rangt an ad nokkud saeist.
       `tCrit` er nu flutt ut og TILVISTIN er fullyrding. */
    ok(!!tCritFor, "`rulebasis.js` FLYTUR UT throskuldarfallid (`tCrit`)");
    if (tCritFor) {
      ok(Math.abs(tCritFor(7) - T_CRIT_7) < 0.0005,
        `og \`tCrit(7)\` gefur somu tolu (${tCritFor(7)})`);
      /* Og fallid verdur ad LESA toflina, ekki bera sitt eigid golf:
         `?? 2.228` er varaleid og ma ekki vera svarid fyrir 7 ar. */
      ok(tCritFor(7) !== 2.228,
        "og thad er ekki varaleidin 2,228 (fallid les toflina)");
      ok(tCritFor(3) > tCritFor(11),
        `throskuldurinn fellur med fjolda ara (${tCritFor(3)} > ${tCritFor(11)})`);
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
/* ============================================================
   3g. DST-LISTINN LESINN AF SKJANUM — ThRJAR TEGUNDIR AF ENGU
   ============================================================
   `dstStream` er profud i `tests/dst.mjs` og `compareOppImplied` er profud
   i BADAR attir — a EININGA-svidi. ENGINN LAS TOFLUNA AF SKJANUM.

   ThAD ER EKKI FORMSATRIDI. Skotakortid i FPL-hlutanum var "rett" i
   thremur teikningum og vitlaust i tveimur thegar thad var skodad i
   raunstaerd, og `compare-visual.mjs` er til af nakvaemlega thessari
   astaedu: "les sulurnar ur DOM og fellur ef graena sulan er a rongum
   manni". Milli `dstStream` og hólfsins liggja ThRIR hlutir sem ekkert
   prof hafdi snert: `dir`-hnappurinn (`useState` i `DstStream`),
   `.toFixed(1)` og `<span className="null">—</span>`.

   ThRJAR TEGUNDIR AF ENGU, og thaer eru ALLAR i raunskranni i viku 5:
     · lid i FRII        (engin rod i leikjaskra)        2 lid
     · leikur AN LINU    (motherji thekktur, tala ekki)  1 leikur
     · og hvorugt ma birtast sem `0.0`
   "Engin lina" er NORMAL astand i thessari skra, ekki jadartilfelli.

   OG SORTERINGIN ER LESIN AF SKJANUM I BADAR ATTIR. `compareOppImplied`
   er rett; spurningin hér er hvort HNAPPURINN se tengdur henni og hvort
   "—" sitji sidast i BADUM attum eftir smell. Naive `a - b` gerdi `null`
   ad 0 og fleytti lidi i frii EFST i "laegsta vaenta skor".
   ============================================================ */
console.log("\n3g. DST-listinn lesinn af skjanum");
{
  const root = await boot();
  /* Deild A byrjar DEF, deild B ekki — kassinn ma adeins vera i einni. */
  const heads = [...document.querySelectorAll("h3, h4, div")]
    .filter((e) => (e.textContent || "").trim() === "Defence this week");
  ok(heads.length >= 1, `"Defence this week" er a skjanum (${heads.length})`);

  /* Toflan er su sem ber hausinn "Opp. pts". */
  const tables = [...document.querySelectorAll("table.data")].filter((t) =>
    /Opp\. pts/.test(t.querySelector("thead") ? t.querySelector("thead").textContent : ""));
  ok(tables.length === 1, `nakvaemlega EIN DST-tafla (${tables.length}) — ` +
    "deildin an varnarsaetis ma ekki bera hana");
  if (tables.length !== 1) { root.unmount(); }
  else {
    const table = tables[0];
    const readRows = () => [...table.querySelectorAll("tbody tr")].map((tr) => {
      const td = [...tr.querySelectorAll("td")];
      return { team: (td[0].textContent || "").trim().split(/\s+/)[0],
               opp: (td[1].textContent || "").trim(),
               pts: (td[2].textContent || "").trim(),
               status: (td[3].textContent || "").trim() };
    });
    const nums0 = (rs) => rs.filter((r) => r.pts !== "—").map((r) => Number(r.pts));
    const rows = readRows();
    ok(rows.length === 32, `allar 32 varnir eru i toflunni (${rows.length})`);

    /* -- 1. LID I FRII: "bye" og "—", ALDREI 0.0 -- */
    const byes = rows.filter((r) => r.opp === "bye");
    ok(byes.length >= 1, `${byes.length} lid i frii i viku 5 (raunskra)`);
    ok(byes.every((r) => r.pts === "—"),
      `og hvert theirra ber "—" (${byes.map((r) => `${r.team}=${r.pts}`).join(", ")})`);

    /* ============================================================
       2. LEIKUR AN LINU — OG HVERS VEGNA ThESSI EINA FULLYRDING ER SKILYRT
       ============================================================
       Fyrsta utgafan krafdist thess ad tilfellid "motherji thekktur, tala
       ekki til" SAEIST a skjanum i viku 5. Hun FELL — og gognin voru i
       lagi: i skranni eins og hun er i dag bera ALLIR leikir viku 5 linu,
       svo tilfellid er einfaldlega ekki thar.

       ThAD ER `players.json`-LAERDOMURINN UR README 4b: "tala ur skra sem
       er endurskrifud daglega er DAEMI MED DAGSETNINGU, ekki fasti."
       Bokmakarar opna linur eftir sinni eigin klukku; 12.8. baru vikur 1-3
       linu, 18.8. bera 1-7 thad. Fullyrding sem krefst thess ad EITT
       tiltekid tilfelli se i skranni i dag er fullyrding um bokmakara, ekki
       um appid.

       ThVI ER ThEKJAN SJALF FULLYRDINGIN (CLAUDE.md 5b regla 1): minnst
       TVAER af thremur tegundum verda ad sjast, og hver theirra sem SEST er
       profud til fulls. Su thridja er profud a TILBUNUM ctx i
       `tests/dst.mjs` kafla 8 (`DEN.oppImplied === null && DEN.bye ===
       false && DEN.opp === "KC"`), svo hun er ekki oprofud — hun er bara
       ekki profud HER I DAG.                                            */
    const noLine = rows.filter((r) => r.opp !== "bye" && r.pts === "—");
    const kinds = [byes.length > 0 && "bye", noLine.length > 0 && "no line",
                   nums0(rows).length > 0 && "line"].filter(Boolean);
    ok(kinds.length >= 2,
      `${kinds.length} af thremur tegundum sjast i viku 5 i dag: ${kinds.join(" · ")} ` +
      "(thekjan er fullyrding — ein tegund ein vaeri ekki prof)");
    if (noLine.length) {
      ok(noLine.every((r) => r.opp && r.opp !== "bye" && r.opp.length >= 2),
        `${noLine.length} lid bera thekktan motherja an linu og motherjinn ER NEFNDUR ` +
        `(${noLine.map((r) => `${r.team} v ${r.opp}`).join(", ")}) — ` +
        "'engin lina' og 'engin leikur' eru ADGREIND");
    } else {
      console.log("  ·    engin lina-laus leikur i viku 5 i dag — tilfellid er profad " +
                  "a tilbunum ctx i dst.mjs kafla 8 (sja skjolun)");
    }

    /* -- 3. ENGIN NULLTALA MA BIRTAST SEM MAELING -- */
    const zero = rows.filter((r) => /^0(\.0)?$/.test(r.pts));
    ok(zero.length === 0,
      `ekkert holf les "0.0" (${zero.map((r) => r.team).join(", ") || "engin"}) — ` +
      "vaent skor 0 er omoguleg maeling, thad er vantandi gildi");
    /* Og thau sem BERA tolu bera raunhaefa tolu — akkeri, ekki kvordun.
       NFL-lid skorar 10-40 stig; 0 eda 100 vaeri kvarda-villa. */
    const nums = nums0(rows);
    ok(nums.length >= 20, `${nums.length} holf bera tolu (annars maelir thetta ekkert)`);
    ok(nums.every((v) => v > 8 && v < 45),
      `og hver theirra er a NFL-kvarda (${Math.min(...nums)}-${Math.max(...nums)})`);

    /* -- 4. ATTIN: "—" SITUR SIDAST I BADUM ATTUM, LESID AF SKJANUM -- */
    const lastNumIndex = (rs) => {
      let last = -1;
      rs.forEach((r, i) => { if (r.pts !== "—") last = i; });
      return last;
    };
    const firstNull = (rs) => rs.findIndex((r) => r.pts === "—");
    ok(firstNull(rows) > lastNumIndex(rows) || firstNull(rows) === -1,
      `"asc": hvert "—" er UNDIR hverri tolu (fyrsta null ${firstNull(rows)}, ` +
      `sidasta tala ${lastNumIndex(rows)})`);
    ok(Number(rows[0].pts) === Math.min(...nums),
      `og efsta rodin er LAEGSTA vaenta skorid (${rows[0].pts})`);

    /* Smellt a hausinn -> "desc". Hnappurinn er lesinn ur DOM, ekki
       kallad a `setDir` — thad er TENGINGIN sem er oprofud. */
    const th = [...table.querySelectorAll("thead th")]
      .find((x) => /Opp\. pts/.test(x.textContent || ""));
    ok(!!th, "hausinn er smellanlegur (`Opp. pts`)");
    await click(th);
    const desc = readRows();
    ok(/↓/.test(th.textContent || ""), `attin snerist (haus: "${(th.textContent || "").trim()}")`);
    ok(Number(desc[0].pts) === Math.max(...nums),
      `"desc": efsta rodin er HAESTA vaenta skorid (${desc[0].pts})`);
    ok(firstNull(desc) > lastNumIndex(desc) || firstNull(desc) === -1,
      `og "—" situr SAMT sidast (fyrsta null ${firstNull(desc)}, ` +
      `sidasta tala ${lastNumIndex(desc)}) — naive \`a - b\` fleytti theim EFST`);
    /* Og fjoldinn er obreyttur: rodun ma ekki tapa rodum. */
    ok(desc.length === rows.length, `og radirnar eru allar enn thar (${desc.length})`);
  }
  root.unmount();
}

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

/* ============================================================
   9. "VARNAR-LIDURINN VANTAR" ER SAGT A BADUM STODUM (19.8.2026)
   ============================================================
   Kafli 3 ver ad BADIR lesmatar sendi `season` inn i `weekContext`.
   Thetta ver naesta lag: ad BADIR SEGI thad thegar vornin er ekki til.

   HVERS VEGNA ThETTA VAR VILLA OG EKKI SMEKKUR. `defense.json` ber
   ENGAR radir fyrir yfirstandandi timabil fyrr en fyrsta vikan er
   spiluð (maelt: radir eru 2019-2025, engar 2026). `weekRows` sendir tha
   `def: null` inn i `weeklyProjection`, svo BYRJUNARLIDID a "My team" er
   radad a markadslinuna EINA. Dashboard segir thad berum ordum; MyTeam
   sagdi ekkert og las thvi eins og full maeling. Uttekt 19.8.2026.

   OG ThETTA ER NAKVAEMLEGA KODINN SEM KVIKNAR 21. AGUST: i forleik er
   `preseason` satt og notan birtist ALDREI, svo hun hefdi verid oprofud
   fram ad fyrsta leik. `inSeason` hér gefur viku 5 i 2026, sem er sama
   astandid og vika 1 — engin vorn fyrir arid.                        */
console.log("\n9. MyTeam segir ad varnar-lidurinn vanti (eins og Dashboard)");
{
  played = true; sleeperMode = "ok";

  /* HOPUR VERDUR AD VERA TIL, ANNARS ER SPJALDID "No roster yet" OG
     NOTAN BIRTIST ALDREI. `MyTeam` les merkta menn ur
     `nfl_myPicks:<boardScope>`; L_A hefur ekkert `draftId` svo skopid er
     deildar-audkennid eitt. Fimmtan menn (QB/RB/WR/TE/K/DST) sem allir
     bera `projSleeper`, svo `optimalLineup` faer raunverulegar tolur. */
  const root = await boot({ openHome: false, seed: {
    [`nfl_myPicks:${L_A.id}`]:
      ["19", "96", "1379", "2359", "3198", "4034", "1479", "2078",
       "2133", "2216", "2449", "1466", "2505", "650", "HOU"],
  } });

  /* `myteam` ER FALIN A BAK VID "More" (asett, sja TABS i App.jsx), svo
     stikan verdur ad vera opnud fyrst. Fyrsta utgafa thessa kafla leitadi
     beint og fann engan flipa — og hefdi ordid graen tom fullyrding hefdi
     hun ekki lika krafist "Start these". */
  const more = [...document.querySelectorAll("button.tab")]
    .find((b) => /More/.test(b.textContent || ""));
  ok(!!more, "\"More\" fannst (myteam er falin a bak vid hann)");
  await click(more);
  await settle(300);

  /* ThEKJA ER FULLYRDING: opnist flipinn ekki er allt hér nedar tomt. */
  const tab = [...document.querySelectorAll("button.tab")]
    .find((b) => /My team/.test(b.textContent || ""));
  ok(!!tab, "My team-flipinn fannst");
  ok(await click(tab), "og hann opnadist");
  await settle(700);
  const t = text();

  /* Vid VERDUM ad vera i lifandi grein, ekki i forleiks-notunni —
     annars vaeri fullyrdingin nedan sonn af rangri astaedu (5b regla 2). */
  ok(/Start these/.test(t), "byrjunarlids-spjaldid er a skjanum");
  ok(!/season projections divided by seventeen/i.test(t),
    "og vid erum i LIFANDI viku, ekki i forleiks-greininni");

  ok(/defence term is absent, not zero/i.test(t),
    "MyTeam SEGIR ad varnar-lidurinn vanti (ekki thogull null-lidur)");
  ok(/ranked on the betting line only/i.test(t),
    "og segir hvad talan ber i stadinn");
  root.unmount();
}

/* ============================================================
   9b. BADAR GREINAR ERU RETTAR — OG TALAN ER EKKI ENDURREIKNUD
   ============================================================
   DOM-profid ad ofan naer adeins null-greininni, thvi `data.js` ber
   sameiginlegt skyndiminni per lotu og `defense.json` er thvi FEST
   (skjalad vid `inSeason` ad ofan). Hin greinin er thvi profud thar sem
   hun er akvedin — i `weekContext`, sem er hreint fall — og TENGINGIN
   er profud byggingarlega.                                          */
console.log("\n9b. baðar greinar: 2026 -> engin vorn, 2025 -> 160 radir");
{
  const { weekContext } = await import("../src/weekview.js");
  const defense = JSON.parse(readFileSync(path.join(DATA, "defense.json"), "utf8"));
  const schedule = JSON.parse(readFileSync(path.join(DATA, "schedule.json"), "utf8"));

  const now = weekContext({ schedule, defense, week: 1, season: 2026 });
  ok(now == null || now.defSeason === null,
    "2026: `defSeason` er null — vorn arsins er ekki til enn");

  const old = weekContext({ schedule, defense, week: 1, season: 2025 });
  ok(old != null && old.defSeason === 2025 && old.defRows > 0,
    `2025: defSeason 2025 med ${old ? old.defRows : 0} radir — hin greinin er nathaleg`);

  /* OG MYTEAM LES ThAER UR `weekContext`, TELUR ThAER EKKI SJALFT.
     Afrit af talningunni vaeri `buildTeamMetrics`-villan aftur. */
  const src = readFileSync(path.join(ROOT, "src", "MyTeam.jsx"), "utf8");
  ok(/weekly\s*\?\s*weekly\.defSeason/.test(src),
    "MyTeam les `defSeason` UR `weekContext` (engin eigin talning)");
  ok(/weekly\s*\?\s*weekly\.defRows/.test(src),
    "MyTeam les `defRows` UR `weekContext` (engin eigin talning)");
  ok(!/defense\s*\.\s*filter|defense\s*\.\s*reduce/.test(src),
    "og MyTeam telur EKKI radir i `defense.json` sjalft");

  /* BADAR SETNINGARNAR VERDA AD VERA I SKRANNI. Fullyrdingin ad ofan
     naer aðeins theirri sem birtist i dag; hin kviknar thegar fyrsta
     vikan er spiluð og enginn yrdi vidstaddur til ad sja hana falla. */
  /* Uppruninn brytur setninguna yfir linur inni i `<b>`, svo bil-vidkvaem
     leit fellur a snidi og ekki a innihaldi. Leitin er thvi bil-frjals —
     og hun er ekki tautologia: DOM-kaflinn ad ofan sannar ad SAMA setning
     kemst raunverulega a skjainn. */
  const flat = src.replace(/\s+/g, " ");
  ok(/defence term is absent, not zero/.test(flat), "null-greinin er i skranni");
  ok(/includes defence-vs-position from/.test(flat), "og hin greinin lika");
}

/* ============================================================
   10. START/SIT-SKIPTIN — LESIN AF SKJANUM, FJOLDI OG ABATI
   ============================================================
   ÞETTA VAR STAERSTA GATID A FORSIDUNNI OG THAD HAFDI ALDREI VIRKAD.

   `Dashboard.jsx` las `advice.swaps`. `lineupAdvice` skilar
   `{ optimal, changes, isOptimal }` — `swaps` er til HVERGI i `src/`.
   Sanna greinin var thvi ONAANLEG og hver einasta teikning fell i
   else-greinina:

     "Your lineup is already optimal against these projections — there
      is no change that raises expected points."

   Þad er eiginleikinn sem notandinn bad um MED NAFNI ("eg vill ekki fa
   stig a bekk sem eru fleiri en hja manni sem er ad spila"), og hann
   svaradi alltaf "allt i lagi". `git log -S'swaps'` segir ad thad hafi
   verid svona fra FYRSTA commit-i forsidunnar.

   HVERS VEGNA 26 GRAEN SOFN SAU THAD EKKI:
     · `lineup.mjs` profar `lineupAdvice` i thaula — um `adv.changes`,
       sem ER retta heitid. Safnid var graent og hafdi rett fyrir ser.
     · ekkert safn las DOM-inn fyrir thessi skipti. `dashboard.mjs`
       kafli 3 las uppstillingar-TOFLUNA (sem kemur ur `optimalLineup`,
       annad kall) og `render.mjs` telur bara ad flipinn se ekki hvitur.
     · `wiring.mjs` — safnid sem er TIL fyrir "hreint fall, fullkomlega
       profad, aldrei kallad med nytilegu inntaki" — bar HANDSKRIFADAN
       lista af fjorum (skra, fall) porum og `lineup.js` var ekki a
       honum. Klasinn er nu vardadur mekanískt i `wiring.mjs` kafla 9.

   ÞEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b regla 1). Kaflinn
   fullyrdir thvi FYRST ad fixturan beri raunveruleg skipti — annars
   gaeti hann verid graenn a appi sem teiknar ekkert.

   OG NEIKVAEDA FULLYRDINGIN ER OSAMHVERF (regla 2). "Ekkert tomt nafn"
   er einskis virdi ef enginn listi er teiknadur; thess vegna er
   THREFALT profad:
     10a  vond en FULL uppstilling  -> hvert skipti hefur raunverulegan
          `out`, og BADI fjoldinn og abatinn eru bornir vid DOM-inn OG
          vid `lineupAdvice` a sama hop
     10b  HALFTOM uppstilling       -> `out: null` og tha ma ekki stada
          "Start X over " med berum tomum reit
     10c  RETT uppstilling          -> "already optimal" birtist ENN,
          svo 10a se ekki graent af thvi ad kassinn segi alltaf eitthvad
   ============================================================ */
console.log("\n10. start/sit-skiptin eru a skjanum (fjoldi OG abati)");
{
  const { lineupAdvice, slotsFor } = await import("../src/lineup.js");

  /* Hopurinn er VALINN UR GOGNUNUM eftir stodu og ADP — engin nofn eru
     negld i profid (`players.json` er endurskrifud daglega, sja notuna
     vid `BYE_MAN`). Tvo QB, fjorir RB, fjorir WR, tveir TE, spyrnumadur
     og vorn = 14 menn i deild med tiu byrjunarsaetum. */
  const byPos = (pos, n) => players
    .filter((p) => p.pos === pos && p.adpSleeper != null)
    .sort((a, b) => a.adpSleeper - b.adpSleeper)
    .slice(0, n).map((p) => String(p.id));
  const QB = byPos("QB", 2), RB = byPos("RB", 4), WR = byPos("WR", 4),
        TE = byPos("TE", 2), KK = byPos("K", 1), DD = byPos("DST", 1);
  const rosterIds = [...QB, ...RB, ...WR, ...TE, ...KK, ...DD];
  ok(rosterIds.length === 14 && new Set(rosterIds).size === 14,
    `fixturan ber 14 einkvaema menn (${rosterIds.length}/${new Set(rosterIds).size})`);

  const nameOf = new Map(players.map((p) => [String(p.id), p.name]));
  const idOfName = new Map(rosterIds.map((id) => [nameOf.get(id), id]));
  ok(idOfName.size === rosterIds.length,
    "nofnin i hopnum eru einkvaem (nafn -> audkenni er porun, ekki agiskun)");

  /* ------------------------------------------------------------
     UPPSKERAN — HOPURINN ER LESINN AF SKJANUM, EKKI ENDURREIKNADUR
     ------------------------------------------------------------
     `START`-taflan ber optimala uppstillinguna med `Ours` = `ev`, og
     BENCH-listinn ber alla sem eru ekki i henni med sama `ev`. Saman
     ERU thau hopurinn med theim tolum sem appid raunverulega notadi.
     Ad byggja `rows` upp a nytt i profinu vaeri onnur utfaersla af
     `buildRows` — nakvaemlega `buildTeamMetrics`-villan i FPL-appinu,
     thar sem afritid laug og frumkodinn var rettur allan timann.     */
  const POSRE = "(QB|RB|WR|TE|K|DST)";
  function harvest() {
    const table = [...document.querySelectorAll("table.data")]
      .find((tb) => [...tb.querySelectorAll("thead th")]
        .some((th) => (th.textContent || "").trim() === "Ours"));
    if (!table) return null;
    const heads = [...table.querySelectorAll("thead th")]
      .map((th) => (th.textContent || "").trim());
    const iO = heads.indexOf("Ours");
    if (iO < 0) return null;
    const out = [];
    for (const tr of table.querySelectorAll("tbody tr")) {
      const c = tr.children;
      if (!c[1] || !c[iO]) continue;
      const m = new RegExp(`^(.*?)\\s+${POSRE}$`).exec((c[1].textContent || "").trim());
      if (!m) continue;                       /* "— unfilled" */
      const ev = parseFloat((c[iO].textContent || "").trim());
      out.push({ name: m[1], pos: m[2], where: "start",
                 proj: Number.isFinite(ev) ? ev : null, bye: false });
    }
    const head = [...document.querySelectorAll("div")]
      .find((d) => (d.textContent || "").trim() === "BENCH");
    for (const d of head ? [...head.parentElement.children].slice(1) : []) {
      const t = (d.textContent || "").trim();
      if (t === "—") continue;
      const m = new RegExp(`^(.*?)\\s+${POSRE}(?:\\s+bye|\\s*·\\s*([\\d.]+))?$`).exec(t);
      if (!m) continue;
      out.push({ name: m[1], pos: m[2], where: "bench",
                 proj: m[3] != null ? parseFloat(m[3]) : null,
                 bye: /\bbye$/.test(t) });
    }
    return out;
  }

  /** Skipta-linurnar eins og thaer stada a skjanum. */
  function changeLines() {
    const box = [...document.querySelectorAll("div.note.warn")]
      .find((d) => /would\s+raise your projected points/.test(
        (d.textContent || "").replace(/\s+/g, " ")));
    if (!box) return null;
    const head = (box.textContent || "").replace(/\s+/g, " ");
    const count = Number((/^(\d+)\s+change/.exec(head.trim()) || [])[1]);
    const lines = [...box.querySelectorAll("li")].map((li) => ({
      text: (li.textContent || "").replace(/\s+/g, " ").trim(),
      bolds: [...li.querySelectorAll("b")].map((b) => (b.textContent || "").trim()),
    }));
    return { count, lines };
  }

  /* ============================================================
     10a. VOND EN FULL UPPSTILLING — HVERT SKIPTI HEFUR `out`
     ============================================================
     Byrjunarlidid er skipad LAKARI manni i hverju saeti og their fjorir
     bestu sitja a bekk. Þa er hvert skipti raunverulegt SKIPTI: sa sem
     fer ut er gjaldgengur i saetid sem losnar.                       */
  console.log("\n10a. vond en FULL uppstilling — fjoldi og abati bornir vid DOM");
  myOverride = {
    players: rosterIds,
    starters: [QB[1], RB[2], RB[3], WR[2], WR[3], TE[1], RB[1], WR[1], KK[0], DD[0]],
  };
  {
    played = true; sleeperMode = "ok";
    const root = await boot({ entries: [L_A] });
    await waitFor(() => harvest() != null && harvest().length > 5);
    const rows = (harvest() || []).map((r) => ({ ...r, id: idOfName.get(r.name) }));

    /* -- THEKJA FYRST: se hopurinn ekki a skjanum maelir kaflinn ekkert -- */
    ok(rows.length === rosterIds.length,
      `allur hopurinn er a skjanum (${rows.length} af ${rosterIds.length})`);
    ok(rows.every((r) => r.id), "og hver rod er porud vid audkenni");
    const starterNames = rows.filter((r) => r.where === "start").map((r) => r.name);
    const benchNames = rows.filter((r) => r.where === "bench").map((r) => r.name);
    ok(starterNames.length === 10,
      `optimala uppstillingin fyllir 10 saeti (${starterNames.length})`);
    const evOf = new Map(rows.map((r) => [r.name, r.proj]));
    const curNames = myOverride.starters.map((id) => nameOf.get(id));

    /* -- FJOLDINN. Leiddur ut UR SKJANUM: hver optimal byrjunarlidsmadur
          sem er EKKI i minni uppstillingu er eitt skipti. Þetta er
          onnur leid ad tolunni en `lineupAdvice`, svo fullyrdingin er
          samanburdur og ekki tautologia. -- */
    const expected = starterNames.filter((n) => !curNames.includes(n));
    ok(expected.length >= 2,
      `fixturan kallar raunverulega a skipti (${expected.length}) — ` +
      "annars vaeri allur kaflinn tom fullyrding");

    const got = changeLines();
    ok(got != null,
      "SKIPTA-KASSINN ER TEIKNADUR (`advice.swaps` gaf ALDREI thennan kassa)");
    ok(got != null && got.count === expected.length,
      `hausinn segir ${got ? got.count : "-"} skipti og skjarinn kallar a ` +
      `${expected.length}`);
    ok(got != null && got.lines.length === expected.length,
      `og ${got ? got.lines.length : "-"} linur eru teiknadar`);

    /* -- ABATINN. Hver lina er borin vid TOLURNAR SEM APPID BIRTI:
          `ev` theirra sem kemur inn ad fradregnu `ev` theirra sem
          situr. Badar tolur eru a skjanum, svo thetta er reikningur a
          birtum gognum og ekki endurutfaersla a rokfraedinni. -- */
    let paired = 0, badGain = 0, blank = 0;
    for (const li of (got ? got.lines : [])) {
      const m = /^Start (.+?) over (.+?)(?: \(\+([\d.]+)\))?(?: at [\w]+)?\.?$/.exec(li.text);
      if (!m) { if (/\bover\b/.test(li.text)) blank++; continue; }
      const [, inName, outName, g] = m;
      if (li.bolds.some((b) => b === "")) blank++;
      if (!starterNames.includes(inName) || curNames.includes(inName)) { badGain++; continue; }
      if (!benchNames.includes(outName) || !curNames.includes(outName)) { badGain++; continue; }
      paired++;
      if (g == null) continue;
      const want = evOf.get(inName) - evOf.get(outName);
      if (!(Math.abs(Number(g) - want) <= 0.11)) badGain++;
    }
    ok(paired === expected.length,
      `hver lina er "Start <optimal> over <minn bekkjarmadur>" (${paired})`);
    ok(blank === 0, `ekkert tomt nafn i neinni linu (${blank})`);
    ok(badGain === 0,
      "og hver birtur abati er ev(inn) - ev(ut) af skjanum " +
      `(${badGain} skekkja)`);

    /* -- OG SAMA SPURNING LOGD FYRIR MODULINN SJALFAN. `lineupAdvice`
          er kallad a UPPSKORNA hopnum — sama fall, sama inntak — og
          fjoldinn OG heildarabatinn verda ad koma eins ut. Tolurnar a
          skjanum eru namundadar a einn aukastaf, svo thakid er 0,11
          per linu. -- */
    const adv = lineupAdvice(myOverride.starters, rows, slotsFor(L_A.rules));
    ok(adv.isOptimal === false, "`lineupAdvice` er SAMMALA: uppstillingin er ekki optimal");
    ok(adv.changes.length === expected.length,
      `og skilar ${adv.changes.length} skiptum, eins og skjarinn (${expected.length})`);
    const sumDom = (got ? got.lines : []).reduce((a, li) => {
      const m = /\(\+([\d.]+)\)/.exec(li.text); return a + (m ? Number(m[1]) : 0); }, 0);
    const sumMod = adv.changes.reduce((a, c) => a + (c.gain || 0), 0);
    ok(Math.abs(sumDom - sumMod) <= 0.11 * Math.max(1, adv.changes.length),
      `heildarabati: skjar ${sumDom.toFixed(1)} vs modull ${sumMod.toFixed(1)}`);
    ok(sumDom > 0, `og hann er raunveruleg tala (${sumDom.toFixed(1)} stig)`);
    ok(!/\bNaN\b/.test(text()) && !/\bundefined\b/.test(text()),
      "ekkert NaN/undefined a sidunni");
    ok(!/already optimal/.test(text()),
      "og \"already optimal\" stendur EKKI thar (thad var eina svarid adur)");
    root.unmount();
  }

  /* ============================================================
     10b. HALFTOM UPPSTILLING — `out: null` MA EKKI VERDA TOMT NAFN
     ============================================================
     Þrir menn i tiu saetum. Þa er QB-saetid tomt og ENGINN i
     uppstillingu er gjaldgengur i thad, svo `lineupAdvice` skilar
     `out: null, gain: null`. Gamla utgafan hefdi teiknad
     "Start X over " med berum feitletrudum tomum reit — sem les eins og
     bilun, ekki eins og upplysing.                                   */
  console.log("\n10b. tomt saeti er SAGT, ekki teiknad sem tomt nafn");
  myOverride = { players: rosterIds, starters: [TE[1], KK[0], DD[0]] };
  {
    played = true; sleeperMode = "ok";
    const root = await boot({ entries: [L_A] });
    await waitFor(() => changeLines() != null);
    const got = changeLines();
    ok(got != null, "skipta-kassinn er teiknadur lika i halftomri uppstillingu");
    const lines = got ? got.lines : [];
    const empties = lines.filter((li) => /slot is empty/.test(li.text));
    ok(empties.length >= 1,
      `THEKJA: ${empties.length} linur eru innkoma i TOMT saeti — ` +
      "an theirra er neikvaeda fullyrdingin nedan einskis virdi");
    ok(empties.every((li) => !/\bover\b/.test(li.text)),
      "og engin theirra segir \"over\" (thad vaeri skipti sem er ekki til)");
    ok(lines.every((li) => !li.bolds.some((b) => b === "")),
      "ekkert tomt feitletrad nafn i neinni linu");
    ok(lines.every((li) => !/\bover\s*(\(|$)/.test(li.text)),
      "og engin lina endar a \"over\" (nafnid sem vantadi)");
    ok(empties.every((li) => li.bolds.length >= 2 && li.bolds[1].length > 0),
      "tomt saeti er NEFNT (saetisheitid er feitletrad, ekki thogult)");
    root.unmount();
  }

  /* ============================================================
     10c. RETT UPPSTILLING FAER ENN "ALREADY OPTIMAL"
     ============================================================
     An thessa kafla gaeti 10a verid graent a appi sem teiknar skipta-
     kassann ALLTAF. Byrjunarlidid er hér SETT a thad sem appid sjalft
     kallar optimalt — audkennin eru lesin af skjanum i 10a-lotunni — og
     tha ma engi skipti standa thar.

     Þetta er lika eini lesandi `isOptimal` i profunum a DOM-hlidinni:
     greinin er valin af `advice.isOptimal`, ekki af `changes.length`.  */
  console.log("\n10c. optimal uppstilling faer ENN \"already optimal\"");
  {
    played = true; sleeperMode = "ok";
    myOverride = { players: rosterIds, starters: rosterIds.slice() };
    /* Fyrst er optimala uppstillingin lesin af skjanum … */
    let root = await boot({ entries: [L_A] });
    await waitFor(() => harvest() != null && harvest().length > 5);
    const optNames = (harvest() || []).filter((r) => r.where === "start").map((r) => r.name);
    root.unmount();
    ok(optNames.length === 10, `optimala uppstillingin lesin (${optNames.length} saeti)`);
    /* … og sidan STILLT UPP nakvaemlega henni. */
    myOverride = { players: rosterIds,
                   starters: optNames.map((n) => idOfName.get(n)).filter(Boolean) };
    ok(myOverride.starters.length === optNames.length,
      "og porud vid audkenni ad fullu");
    root = await boot({ entries: [L_A] });
    await waitFor(() => /already optimal|would raise your projected/.test(text()));
    ok(/already optimal/.test(text()),
      "optimal uppstilling faer \"already optimal\"");
    ok(changeLines() == null, "og ENGINN skipta-kassi");
    /* Og modullinn verdur ad vera sammala — annars er skjarinn rettur
       af rangri astaedu. */
    const rows2 = (harvest() || []).map((r) => ({ ...r, id: idOfName.get(r.name) }));
    const adv2 = lineupAdvice(myOverride.starters, rows2, slotsFor(L_A.rules));
    ok(adv2.isOptimal === true,
      "`lineupAdvice` segir `isOptimal: true` a sama hop");
    ok(adv2.changes.length === 0, "og `changes` er tomt");
    root.unmount();
  }

  /* ------------------------------------------------------------
     OG SVIDA-HEITID SJALFT. Fullyrdingin er BYGGINGARLEG og hun er
     hér af thvi ad DOM-kaflarnir ofan geta ekki sagt HVERS VEGNA
     kassinn var tomur. `swaps` ma ekki koma aftur.
     ------------------------------------------------------------ */
  const dashSrc = readFileSync(path.join(ROOT, "src", "Dashboard.jsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  ok(!/advice\s*\.\s*swaps/.test(dashSrc),
    "`Dashboard.jsx` les EKKI `advice.swaps` (svidid er til hvergi)");
  ok(/advice\s*\.\s*changes/.test(dashSrc) && /advice\s*\.\s*isOptimal/.test(dashSrc),
    "heldur `advice.changes` OG `advice.isOptimal` — badi svidin sem modullinn skilar");
  myOverride = null;
}

/* ============================================================
   11. WAIVER-NOTURNAR — REIKNADAR OG BIRTAR HVERGI
   ============================================================
   `waivers.js` skrifar i haus sinum ad thogn se thad EINA sem ma ekki
   gerast, og skilaði samt FIMM nota-tegundum sem ENGINN las
   (`fa.notes`, `fa.unreadableRosters` — NULL lesendur i ollu `src/`).

   SU MIKILVAEGASTA ER GILDISSVID LISTANS: se hopur med OLAESILEGAN
   leikmannalista getur madur i eigu einhvers stadid a waiver-listanum og
   notandinn gert tilbod i hann. Þad er sama villa og "`pool == null` ma
   aldrei lesast eins og enginn er tekinn", i minni mynd — og hun var
   ThOGUL.

   ThEKJA ER FULLYRT FYRST: `freeAgents` VERDUR ad telja hopinn olaesilegan
   a thessari fixturu, annars gaeti "notan er a skjanum" ekki brugdist.

   OG NEIKVAEDA HLIDIN ER PROFUD LIKA (regla 2 i CLAUDE.md 5b): thegar
   allir hopar eru laesilegir ma kassinn EKKI standa thar. Kassi sem er
   alltaf a skjanum er thad sama og enginn kassi.
   ============================================================ */
console.log("\n11. waiver-noturnar eru a skjanum");
{
  const { freeAgents } = await import("../src/waivers.js");

  /* -- (a) EINN HOPUR MED ONYTA GERD -- */
  unreadableSlot = 2; myOverride = null;
  played = true; sleeperMode = "ok";
  let root = await boot({ entries: [L_A] });
  await waitFor(() => /Waiver wire/.test(text()));

  /* ThEKJA: fixturan verdur raunverulega ad gefa olaesilegan hop. */
  const rs = mkRosters(10, 7, true);
  const probe = freeAgents({ rows: players.map((p) => ({ ...p, id: String(p.id) })),
                             rosters: rs, myRosterId: 7 });
  ok(probe.unreadableRosters === 1,
    `ThEKJA: \`freeAgents\` telur EINN olaesilegan hop (${probe.unreadableRosters})`);
  ok(probe.notes.some((n) => /unreadable player list/.test(n)),
    "og skrifar notu um hann (annars er fullyrdingin nedan tom)");

  const flat = () => text().replace(/\s+/g, " ");
  ok(/1 of 10 rosters had an unreadable player list/.test(flat()),
    "og NOTAN ER A SKJANUM, ordrett ur modulnum");
  ok(/may show up as free agents/.test(flat()),
    "med afleidingunni sagdri — thad er gildissvid listans, ekki smaatridi");
  ok(!/\bNaN\b/.test(text()) && !/\bundefined\b/.test(text()),
    "ekkert NaN/undefined");
  /* Og handskrifada endursognin er FARIN — tvaer utgafur af somu
     setningu geta rekid i sundur og modullinn er heimildin. */
  const dashSrc = readFileSync(path.join(ROOT, "src", "Dashboard.jsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  ok(!/outside our board/.test(dashSrc),
    "`Dashboard.jsx` endursegir EKKI notuna sjalf (`outside our board` er farid)");
  ok(/fa\.notes/.test(dashSrc) && /fa\.unreadableRosters/.test(dashSrc),
    "heldur les `fa.notes` OG `fa.unreadableRosters` — badi svidin sem attu enga lesendur");
  root.unmount();

  /* -- (b) ALLIR HOPAR LAESILEGIR -> KASSINN MA EKKI STANDA ThAR -- */
  unreadableSlot = null;
  root = await boot({ entries: [L_A] });
  await waitFor(() => /Waiver wire/.test(text()));
  const clean = freeAgents({ rows: players.map((p) => ({ ...p, id: String(p.id) })),
                            rosters: mkRosters(10, 7, true), myRosterId: 7 });
  ok(clean.unreadableRosters === 0,
    `ThEKJA: nu er enginn hopur olaesilegur (${clean.unreadableRosters})`);
  ok(!/unreadable player list/.test(text()),
    "og notan er HORFIN — kassi sem er alltaf a skjanum segir ekkert");
  root.unmount();
  unreadableSlot = null;
}

/* ============================================================
   3h. FELLDUR ROKSTUDNINGUR A FORSIDUNNI — STUTT SJALFGEFID, EKKI EYTT
   ============================================================
   BEIDNI NOTANDANS 24.8.2026, ordrett: "Mer finnst alltof mikid ad gera
   a forsidunni, taktu ut eithvad af thessum texta, eg vill adalega nota
   draft siduna til ad segja mer hvenr eg a ad velja."

   ÞRIDJA BEIDNIN UM MINNI TEXTA. `render.mjs` kafli 8 gerdi thessa somu
   tvihlida krofu a DRAFT-BORDID 20.8.; forsidan var ekki vardin, og hun
   bar staersta textakassann i appinu.

   KRAFAN ER TVIHLIDA OG HVORUG HELMINGURINN NAEGIR EINN:

     (a) setningin er ENN I DOM-inu                    -> ekki eydd
     (b) hun er inni i `<details>` sem er EKKI `open`  -> hun er FELLD

   Med (a) einu maetti skilja hverja malsgrein eftir opna og kaflinn
   vaeri graenn — thad er nakvaemlega thad sem hann bad um ad yrdi
   breytt. Med (b) einu maetti eyda setningunni og hafa TOMT details.

   ============================================================
   OG ThRJAR SETNINGAR ERU NEFNDAR BERUM ORDUM, EKKI TALDAR
   ============================================================
   `<details>`-talning er ThEKJA og hun getur stadid medan tiltekin
   setning er horfin. Thessar thrjar eru hver um sig su EINA sem heldur
   omældu eda ohaeilu merki fra ad lesast eins og maelt:

     · `weeklyEdgeNote` — MARKTAEKNIN a bak vid "Ours". An hennar er
       dalkurinn tala an umbods.
     · "absent, not zero" — og hun MA EKKI vera felld. Hun er ekki
       adferdafraedi heldur fyrirvari um ThESSA TOLU I DAG, svo hun er
       profud i HINA attina: hun verdur ad sjast AN smells.
     · `dstStreamNote` — hvers vegna vornin er VIKULEGUR listi og ekki
       season-rod. Season-rod maeldist -0,82 medal theirra sem eru
       raunverulega lausir; ad thegja um thad vaeri ad bjoda hana.      */
console.log("\n3h. felldur rokstudningur a forsidunni");
{
  played = true; sleeperMode = "ok";
  const root = await boot();
  await waitFor(() => /Measured walk-forward/.test(text()));

  /* ============================================================
     FANGAD MEDAN DOM-ID ER LIFANDI
     ============================================================
     `root.unmount()` taemir `document`, svo hver `!/x/.test("")` er SONN
     eftir a — tom fullyrding af verstu gerd (CLAUDE.md 5b). Sama gildra
     og kaflar 3e og 3f skjala.                                        */
  const fines = [...document.querySelectorAll("details.fine")];
  const fineText = fines
    .map((d) => (d.querySelector(".fine-body") || {}).textContent || "").join(" ")
    .replace(/\s+/g, " ");
  const bodyAll = (document.body.textContent || "").replace(/\s+/g, " ");
  /* Sjalfgefna synin = allt minus INNIHALD hverrar felldrar blokkar.
     `summary`-linan er VILJANDI inni i henni: hun er synileg og a ad
     teljast bædi i thekju og i lengd. */
  let dflt = bodyAll;
  for (const d of fines) {
    const b = ((d.querySelector(".fine-body") || {}).textContent || "")
      .replace(/\s+/g, " ");
    if (b) dflt = dflt.split(b).join(" ");
  }
  /* ============================================================
     PROSAN, PER DEILDARSPJALDI — OG TOFLURNAR ERU EKKI PROSA
     ============================================================
     `.sub`/`.note`/`.dim` eru thau thrju snid sem baru malsgreinarnar.
     `.dim` er hins vegar LIKA a toflu-holfum (`<td className="txt dim">`
     i stodutoflunni, a bekknum og a ollum 32 vornum), svo fyrsta utgafa
     thessa maelis las 2.681 staf thar sem ~1.500 voru LIDSNOFN,
     MOTHERJAR og "yours/rostered/free". Þau eru ekki "auka texti"; thau
     eru INNIHALDID — nakvaemlega gildran sem `render.mjs` kafli 8
     skjalar um nofnin i trending-chip-unum.

     ÞVI ER ALLT INNAN `<table>` UNDANSKILID. Prosa situr aldrei i
     toflu-holfi, svo skilin eru byggingarleg og ekki smekksatridi.   */
  const proseLen = (() => {
    const panels = [...document.querySelectorAll("div.panel")];
    let n = 0;
    for (const p of panels) {
      let t = [...p.querySelectorAll(".sub, .note, .dim")]
        .filter((x) => !x.closest("table"))
        .map((x) => x.textContent || "").join(" ").replace(/\s+/g, " ");
      for (const d of p.querySelectorAll("details.fine")) {
        const b = ((d.querySelector(".fine-body") || {}).textContent || "")
          .replace(/\s+/g, " ");
        if (b) t = t.split(b).join(" ");
      }
      n = Math.max(n, t.length);
    }
    return n;
  })();
  root.unmount();

  /* -- ThEKJA ER FULLYRDING, EKKI LOGGA -- */
  ok(fines.length >= 3,
    `ThEKJA: ${fines.length} felldar rokstudnings-blokkir a forsidunni (>= 3)`);
  ok(fines.filter((d) => d.hasAttribute("open")).length === 0,
    "og ENGIN er opin sjalfgefid");
  ok(fines.filter((d) =>
    ((d.querySelector(".fine-body") || {}).textContent || "").trim().length < 40)
    .length === 0, "og engin er tom (tomt details er eyding i dulargervi)");
  ok(fines.filter((d) =>
    ((d.querySelector("summary") || {}).textContent || "").trim().length < 8)
    .length === 0, "og hver ber laesilegt summary");

  /* -- 1. MARKTAEKNIN A BAK VID "Ours": TIL, OG FELLD -- */
  ok(/Measured walk-forward/.test(fineText),
    "`weeklyEdgeNote` er ENN i DOM-inu i fullri lengd (ekki eydd)");
  ok(!/Measured walk-forward/.test(dflt),
    "og hun er FELLD — malsgreinin stendur ekki i sjalfgefnu syninni");
  /* En FLAGGID sest an smells: notandinn ma ekki thurfa ad smella til ad
     sja hvort dalkurinn hafi umbod. Sama rok og `render.mjs` kafli 8
     hefur um ordid "unmeasured" i summary. */
  ok(/Ours is (measured|unproven)/.test(dflt),
    "en FLAGGID sest an smells (\"Ours is measured\" / \"Ours is unproven\")");

  /* -- 2. "ABSENT, NOT ZERO" ER PROFUD I HINA ATTINA -- */
  /* Hun er (a)-fyrirvari um tolu sem er a skjanum I DAG, ekki um adferd.
     Kafli 9 krefst hennar i MyTeam; hér er krafan ad hun se SYNILEG a
     forsidunni — felld vaeri hun jafngild thvi ad thegja. */
  ok(/absent, not zero/.test(bodyAll),
    "forsendan: forleiks-/vorn-vantar-greinin er a skjanum i dag");
  ok(/absent, not zero/.test(dflt),
    "og hun er SYNILEG an smells — hun er fyrirvari um toluna, ekki um adferdina");

  /* -- 3. DST-MAELINGIN: TIL, OG FELLD -- */
  ok(/team-weeks/.test(fineText),
    "`dstStreamNote` er ENN i DOM-inu (fimm tolur, ekki eyddar)");
  ok(!/team-weeks/.test(dflt),
    "og hun er FELLD undan sjalfgefnu syninni");

  /* ============================================================
     4. ENDURSAGNIRNAR ERU EYDDAR, EKKI FELLDAR
     ============================================================
     (c) i flokkuninni: setningar sem endursegja thad sem talan eda
     ramminn segir ThEGAR. Þaer eru EKKI i `<details>` — thad vaeri ad
     halda theim; thaer eru farnar ur skranni.

     OG ÞRJAR AF FJORUM VORU TOM FULLYRDING I FYRSTU UTGAFU ÞESSA KAFLA.
     Kaflinn var keyrdur A 45b9cde (koda FYRIR styttinguna) til ad sanna
     ad hann fangi hana — og af fjorum `!bodyAll.includes(...)` **fell
     adeins EIN**. Hinar thrjar voru graenar a gamla kodanum, thvi
     greinarnar sem bera thaer TEIKNAST EKKI i thessari uppsetningu:

       "no change that raises expected points"  -> `isOptimal`-greinin
          (fixturan hefur VILJANDI hrakinn hop, svo hun er alltaf false)
       "a list that ignores that is worse than none" -> `pool == null`
          (rostrar ERU lesnir hér)
       "does not pretend to be" -> forleiks-greinin (`week` er 5)

     ÞAD ER NAKVAEMLEGA CLAUDE.md 5b regla 2: neikvaed fullyrding er
     einskis virdi nema strengurinn hafi verid SANNANLEGA tharna. Þaer
     thrjar eru thvi profadar A UPPRUNANUM, thar sem greinin ER — sama
     medferd og kafli 9b gefur setningunum i `MyTeam.jsx` sem birtast
     adeins eftir fyrstu spiluðu viku. Su EINA sem sannanlega var a
     skjanum heldur DOM-krofunni.                                     */
  ok(!bodyAll.includes("a tool that always finds a move is useless"),
    "endursogn eydd ur DOM-inum (hun var SANNANLEGA thar i 45b9cde): " +
    "\"a tool that always finds a move is useless\"");

  const dashCode = readFileSync(path.join(ROOT, "src", "Dashboard.jsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ");
  for (const gone of [
    "no change that raises expected points",
    "a list that ignores that is worse than none",
    "does not pretend to be",
  ]) {
    ok(!dashCode.includes(gone),
      `endursogn eydd ur uppruna (greinin teiknast ekki hér): "${gone}"`);
  }
  /* ThEKJA A UPPRUNA-LEITINNI SJALFRI. Vaeri `dashCode` tomur — rong
     slod, breytt strippun — vaeru thrjar krofurnar ad ofan tomar. Þessi
     thrjar strengir ERU i skranni og verda ad vera thad: thad eru
     greinarnar sem endursagnirnar voru teknar UR. */
  for (const kept of ["already optimal", "free-agent pool is unknown",
                      "season projection over 17"]) {
    ok(dashCode.includes(kept),
      `ThEKJA: uppruna-leitin les raunverulega skrana ("${kept}" fannst)`);
  }
  /* OG ThAD SEM KVIKNAR A RAUNVERULEGRI BILUN VAR EKKI HREYFT. Hver
     thessara er GREINING sem kostadi eitthvad adur en hun var skrifud;
     stytting ma ekki hafa tekid hana med. */
  for (const keep of ["Nobody on waivers beats", "Waiver wire", "Start / sit"]) {
    ok(bodyAll.includes(keep), `greiningin stendur: "${keep}"`);
  }

  /* ============================================================
     5. OG PROSAN SJALF ER STUTT — ThAD ER BEIDNIN
     ============================================================
     ÞAKID ER MAELT, EKKI VALID. Kaflinn var keyrdur a badum utgafum med
     THESSUM SAMA maeli (toflur undanskildar):

       45b9cde  (fyrir)   **2.291 stafir**
       eftir styttinguna   **915 stafir**   (-60%)

     1.100 er ~20% ofan vid mælda utkomu — nog fyrir eina nyja
     greiningu, of litid fyrir nya malsgrein. Þakid ma HAEKKA thegar ny
     GREINING kemur inn (thaer eru ekki prosa i thessum skilningi), en
     tha a talan ad vera maeld upp a nytt og notan uppfaerd, ekki bara
     thakid hreyft.                                                    */
  ok(proseLen > 200,
    `ThEKJA: prosan er raunverulega lesin (${proseLen} stafir)`);
  ok(proseLen <= 1100,
    `og hun er STUTT sjalfgefid (${proseLen} stafir <= 1100; ` +
    "maelt 2.291 a 45b9cde, 915 eftir)");
}

/* ============================================================
   3i. HVERT SPJALD VERDLEGGUR UR SINNI EIGIN DEILD
   ============================================================
   `App.jsx` byggir `rows` ur EINNI deild og forsidan teiknar KORT PER
   DEILD, svo hitt kortid bar tolur virku deildarinnar: VBD, aRank,
   threp og `value` reiknud ur rongum varamanns-threpum, og start/sit og
   waiver ofan a theim.

   MAELT A RAUNGOGNUM (`buildRows` a badum deildum, 1.175 pardar radir):
   midgildi |aRank| **9** saeti, midgildi |VBD| **25,4** stig, og **75**
   af 102 K/DST-rodum flakka milli raunverulegs VBD og `null`.

   ÞETTA VAR OSYNILEGT AF ThVI AD ThAD LEIT NORMAL UT. Engin tala var
   tom, ekkert var rautt, og oll 27 profasofnin voru graen. Kafli 3e
   verdur einmitt til vegna sama forms einum lid framar i kedjunni
   (`weeklyEdgeNote("ppr")` hardkodad a badar deildir).

   FULLYRDINGIN MA EKKI VERA FOST TALA. `players.json` er endurskrifud
   daglega, svo "spjaldid ber 90,7" urelist thegjandi (sama regla og
   felldi „4-10 og aldrei 1" i FPL-verkefninu). Hun er thvi um SKORUN:
   spjoldin tvo mega ekki bera SOMU spa-tolurnar.

   MAELT MED OG AN LAGFAERINGARINNAR, sama fixtura:
     med:  Sofahetjur 17.6 · 17.2 · 15.1 · 12.1     skorun vid ppr = 0
     an:   Sofahetjur 19.5 · 19.1 · 18.3 · 14.7     skorun vid ppr = 3
   Tolurnar 19,5 / 19,1 / 18,3 eru Patriots-tolurnar ORDRETT — thad er
   villan sjalf, laesileg a skjanum.

   OG PPR-SPJALDID ER OBREYTT (4.825 stafir i badum keyrslum), sem er
   rett: thad ER virka deildin, svo radirnar voru thegar hennar. Su
   osamhverfa er hluti af fullyrdingunni — lagfaering sem breytti BADUM
   vaeri ad faera vandann, ekki leysa hann.                            */
console.log("\n3i. hvert spjald verdleggur ur SINNI deild");
{
  /* --- (a) forsendan: deildirnar eru raunverulega olikar --- */
  const { buildRows: br } = await import("../src/build.js");
  const bA = br({ players, league: L_A.rules }).rows;
  const bB = br({ players, league: L_B.rules }).rows;
  const byId = new Map(bB.map((r) => [String(r.id), r]));
  const dR = [], dV = [];
  let kdst = 0, flick = 0;
  for (const r of bA) {
    const o = byId.get(String(r.id));
    if (!o) continue;
    if (r.aRank != null && o.aRank != null) dR.push(Math.abs(r.aRank - o.aRank));
    if (r.vbd != null && o.vbd != null) dV.push(Math.abs(r.vbd - o.vbd));
    if (r.pos === "K" || r.pos === "DST") {
      kdst++; if ((r.vbd == null) !== (o.vbd == null)) flick++;
    }
  }
  const med = (x) => { const t = x.slice().sort((a, b) => a - b); return t.length ? t[t.length >> 1] : null; };
  ok(dR.length > 200 && dV.length > 200,
    `FORSENDA: ${dR.length} radir bera BADAR tolur`);
  ok(med(dR) >= 3,
    `FORSENDA: midgildi |aRank| milli deildanna er ${med(dR)} saeti — thaer eru raunverulega olikar`);
  ok(med(dV) >= 10,
    `FORSENDA: midgildi |VBD| er ${med(dV).toFixed(1)} stig`);
  ok(flick >= 20,
    `FORSENDA: ${flick} af ${kdst} K/DST-rodum flakka milli tolu og null (deild an theirra saeta gefur null)`);

  /* --- (b) SKJARINN, OG FULLYRDINGIN ER ORSAKATENGD ---
     FYRSTA TILRAUN MIN VAR TOM OG HUN ER SKRAD ThVI HUN LITUR VEL UT:
     eg maldi hvort spjoldin BAERU SOMU spa-tolurnar og krafdist ad
     skorunin vaeri 0. Maelt bædi med og an lagfaeringarinnar: skorunin
     er **0 i BADUM** — fullyrdingin gat aldrei fallid.

     Rett prof er ekki um GILDI heldur um ORSOK: sama kortid er teiknad
     TVISVAR i somu keyrslu, med `buildFor` og an hennar, og spurt hvort
     innihaldid breytist. Thad er lika onaemt fyrir thvi ad
     `players.json` er endurskrifud daglega — engin fost tala.

     OSAMHVERFAN ER HLUTI AF FULLYRDINGUNNI: kort VIRKU deildarinnar
     (`rows` eru hennar) ma EKKI breytast, hitt VERDUR ad gera thad.
     Lagfaering sem breytti badum vaeri ad faera vandann. */
  const { default: Dashboard } = await import("../src/Dashboard.jsx");
  const { normalizeLeague } = await import("../src/build.js");
  const buildForTest = (lg) => br({ players, league: normalizeLeague(lg) });

  const renderDash = async (withBuildFor) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const r = createRoot(host);
    await act(async () => {
      r.render(React.createElement(Dashboard, {
        entries: [L_A, L_B],
        rows: bA,                       /* virka deildin er A */
        meta: { season: 2026 },
        schedule: null, defense: null, news: null, weekly: null,
        sleeperUser: "u-me",
        ...(withBuildFor ? { buildFor: buildForTest } : {}),
      }));
    });
    await settle(500);
    const grab = (name) => {
      const p = [...host.querySelectorAll("div.panel")]
        .find((el) => [...el.querySelectorAll("h2")]
          .some((h) => (h.textContent || "").trim() === name));
      return p ? (p.textContent || "") : null;
    };
    const out = { a: grab("Patriots SB champs"), b: grab("Sofahetjur") };
    await act(async () => { r.unmount(); });
    host.remove();
    return out;
  };

  const withFix = await renderDash(true);
  const without = await renderDash(false);

  ok(withFix.a && withFix.b && without.a && without.b,
    "THEKJA: badi spjoldin teiknast i BADUM keyrslum");
  ok((withFix.b || "").length > 300,
    `THEKJA: Sofahetju-spjaldid ber raunverulegt innihald (${(withFix.b || "").length} stafir)`);

  ok(withFix.a === without.a,
    "VIRKA deildin (Patriots) er OBREYTT — radirnar voru thegar hennar");
  ok(withFix.b !== without.b,
    "en HIN deildin (Sofahetjur) breytist — hun var verdlogd ur rangri deild");
}

/* ============================================================
   3j. EFTIRSJA VIKUNNAR — TALAN A SKJANUM, EKKI STRENGUR I SKRA
   ============================================================
   `benchRegret` var otengd i tvaer vikur. Nu er kedjan
   `Dashboard -> weekRegret -> benchRegret` og `tests/lineup.mjs` ber
   hana — EN SU KRAFA ER TEXTALEIT, og stokkbreytingin

     const regret = useMemo(() => (false ? weekRegret({...}) : null))

   SLAPP I GEGN, thvi strengurinn `weekRegret(` stendur enn i skranni.
   Textaleit greinir ekki "kallad" fra "skrifad". Þess vegna er talan
   lesin AF SKJANUM hér.

   HEIMURINN ER TILBUINN OG SVARID ER REIKNAD I HAUSNUM:
     byrjunarlid  X 3 stig · Y 4 stig     = 7
     bekkur       Z 30 stig · W 1 stig
     tvo bestu af ollum: Z 30 + Y 4       = 34
     left = 34 - 7 = 27
   Slots eru RB1+RB2 (`starters: { RB: 2 }`), svo allir fjorir eru
   gjaldgengir i badi saetin og reikningurinn er otviraedur.          */
console.log("\n3j. eftirsja vikunnar er a skjanum");
{
  const { buildRows: br2 } = await import("../src/build.js");
  const { default: Dashboard } = await import("../src/Dashboard.jsx");
  const L = { teams: 10, scoring: "ppr", rounds: 15, superflex: false,
              starters: { RB: 2 }, flexPos: ["RB", "WR", "TE"] };
  const rowsL = br2({ players, league: L }).rows;
  /* Fjorir RB med `gsisId` — VALDIR UR GOGNUNUM, ekki hardkodadir:
     nafn eda audkenni sem er neglt inn rekur um leid og
     `players.json` er endurskrifud (hun er thad daglega). */
  const rbs = rowsL.filter((r) => r.pos === "RB" && r.gsisId && r.proj != null).slice(0, 4);
  ok(rbs.length === 4, `FORSENDA: fjorir RB med gsisId (${rbs.length})`);

  const [X, Y, Z, W] = rbs;
  const PTS = { [X.gsisId]: 3, [Y.gsisId]: 4, [Z.gsisId]: 30, [W.gsisId]: 1 };
  const weeklyRows = rbs.map((r) => ({ id: r.gsisId, week: 1, team: r.team,
                                       ppr: PTS[r.gsisId], half: PTS[r.gsisId],
                                       std: PTS[r.gsisId] }));

  const entryL = { ...L_A, rules: L,
                   imported: { ...L_A.imported, teams: 10, starters: { RB: 2 } } };
  matchupsOverride = [{ roster_id: 7,
                        starters: [String(X.id), String(Y.id)],
                        players: rbs.map((r) => String(r.id)) }];

  const host = document.createElement("div");
  document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => {
    r.render(React.createElement(Dashboard, {
      entries: [entryL], rows: rowsL, meta: { season: 2026 },
      schedule: null, defense: null, news: null,
      weekly: weeklyRows, sleeperUser: "u-me",
      buildFor: (lg) => br2({ players, league: lg }),
    }));
  });
  await settle(700);
  const txt = host.textContent || "";
  await act(async () => { r.unmount(); });
  host.remove();
  matchupsOverride = null;

  ok(/Week 1:/.test(txt), "eftirsju-linan er teiknud fyrir viku 1");
  ok(/left/.test(txt) && /27/.test(txt),
    `og hun ber toluna 27 (7 spilud, 34 moguleg)${/27/.test(txt) ? "" : ` [texti: ${txt.slice(0, 300)}]`}`);
  /* NEFNARINN VERDUR AD FYLGJA thegar ekki allir bera stig. Hér bera
     ALLIR fjorir stig, svo hann a EKKI ad sjast — og su krafa er thess
     virdi: fotnota sem birtist alltaf er skraut, ekki upplysing. */
  ok(!/of 4 players have scores/.test(txt),
    "og nefnarinn sest EKKI thegar allir bera stig");

  /* --- OG I FORLEIK ER EKKERT KALL GERT ---
     HLID A SOKNINNI, EKKI SIA A SVARINU. `weekRegret` skilar `null`
     hvort sem er thegar engin vika er skorud, svo rangt vaerd hlid
     BROTNAR EKKI — thad eydir bara Sleeper-kalli per deild i hverri
     heimsokn allt sumarid. Su stokkbreyting slapp i gegn thangad til
     thessi fullyrding kom, thvi hun er um ThAD SEM VAR EKKI GERT. */
  const before = calls.length;
  const host2 = document.createElement("div");
  document.body.appendChild(host2);
  const r2 = createRoot(host2);
  await act(async () => {
    r2.render(React.createElement(Dashboard, {
      entries: [entryL], rows: rowsL, meta: { season: 2026 },
      schedule: null, defense: null, news: null,
      weekly: null, sleeperUser: "u-me",          /* forleikur */
      buildFor: (lg) => br2({ players, league: lg }),
    }));
  });
  await settle(700);
  await act(async () => { r2.unmount(); });
  host2.remove();
  const fresh = calls.slice(before);
  ok(fresh.length > 0, `THEKJA: ${fresh.length} Sleeper-koll gerd (annars vaeri krafan ad nedan tom)`);
  ok(!fresh.some((u) => /\/matchups\//.test(u)),
    `og ENGIN theirra er \`/matchups/\` — engin vika skorud, engin sokn ` +
    `(${fresh.filter((u) => /\/matchups\//.test(u)).length} slik)`);
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
