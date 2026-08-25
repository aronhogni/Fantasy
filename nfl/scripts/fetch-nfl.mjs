#!/usr/bin/env node
/* ============================================================
   fetch-nfl.mjs — allt gagna-pipeline-id fyrir NFL-hlutann.
   Skrifar i `data/`. Enginn bakendi; appid les skrarnar beint.

   KEYRSLA
     node scripts/fetch-nfl.mjs                 # allt
     node scripts/fetch-nfl.mjs --stage=core    # bara thad ferskasta
     node scripts/fetch-nfl.mjs --stage=adp     # ADEINS ADP (lett, ma keyra oft)
     node scripts/fetch-nfl.mjs --stage=history # sagan (haeg, sjaldan)
     node scripts/fetch-nfl.mjs --stage=experts # serfraedingabordin
     NFL_NO_CACHE=1 ...                             # framhja skyndiminni

   THREP OG TIDNI — thetta er ekki smekkur heldur eðli gagnanna:
     core     breytist DAGLEGA (ADP, meidsli, spar, linur)      -> cron
     experts  breytist nokkrum sinnum i viku i drafttid         -> cron
     history  breytist ALDREI fyrir lokid timabil               -> handvirkt
   Sami adskilnadur og i FPL-verkefninu: timabil sem er lokid er
   sott einu sinni og utkoman committud.

   REGLAN SEM ALLT HANGIR A: TOM KEYRSLA MA ALDREI THURRKA UT GOD
   GOGN. Hvert threp skrifar adeins ef thad hefur raunverulegt
   innihald, og `writeJson` ber saman vid thad sem fyrir er.
   ============================================================ */

import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

import { record, sourceReport } from "./lib/http.mjs";
import * as nv from "./sources/nflverse.mjs";
import * as sl from "./sources/sleeper.mjs";
import * as fp from "./sources/fantasypros.mjs";
import * as es from "./sources/espn.mjs";
import * as ad from "./sources/adp.mjs";
import * as mk from "./sources/espnodds.mjs";
import { normTeam, buildIndexes, matchByName, normName } from "../src/names.js";

const OUT = path.resolve(process.cwd(), "data");
const ARG = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }));
const STAGE = String(ARG.stage || "all");
const want = (s) => STAGE === "all" || STAGE.split(",").includes(s);

/* Timabilin sem sagan naer yfir. 2019 er nedri mork af astaedu:
   fyrir 2019 vantar `target_share`/`wopr` i nflverse og likanid
   byggir a theim. Ad taka 2018 med gaefi radir thar sem lykil-
   breyturnar eru null og thaer myndu THYNNA maelinguna an thess ad
   nokkurt profa faelli. */
/* ============================================================
   SOGULEG AR — OG YFIRSTANDANDI TIMABIL VERDUR AD VERA MED
   ============================================================
   ÞETTA VAR HARDKODAD `[2019 .. 2025]` OG THAD BLOKKADI TVAER MAELDAR
   NIDURSTODUR. `stageHistory` skrifar `data/weekly/{ar}.json`, og thad
   er eina heimildin um notkun innan timabils. Med fastan lista endar
   hun 2025, svo:

     · `usage-lab` maeldi ad notkun-til-thessa loki 12,25% af
       start/sit-bilinu fra viku 10 (a moti 5,83%), per-leikmanns CI
       [2,54 · 8,49] i ollum thremur snidum — OG APPID GAT EKKI REIKNAD
       HANA, thvi 2026 var aldrei sott.
     · `waiver-lab` maeldi ad rest-of-season gjaldmidill slai
       timabils-VBD um +13,2 stig/timabil (t=2,97, 6/7) — sama saga.

   Baðar nidurstodur voru mældar og obrukanlegar af sömu astaedu, og
   hun var ein lina. Listinn er nu LEIDDUR: fastur upphafspunktur
   (2019, thegar `weeklyStats` naer aftur til) og yfirstandandi timabil
   ur `meta.json`, sem er thegar skrifad af `stageCore`.

   Timabil sem er ekki byrjad skilar engum rodum og `writeJson` HAFNAR
   thvi (sja `weeklyMinRows`) — thad er rett hegdun, ekki bilun.       */
const HISTORY_FROM = 2019;

function historyYears() {
  let cur = new Date().getFullYear();
  try {
    /* `meta.json` er heimildin thegar hun er til: hun ber timabilid sem
       FPL-hlidin kallar `season`, og i januar er dagsetningar-arid EKKI
       timabilid. Fyrsta utgafan notadi `getFullYear()` eitt og hefdi
       thvi sott "2027" i januar 2027 medan timabilid 2026 var enn i
       gangi — og skrifad tomt yfir gott. */
    const raw = readFileSync(path.join(OUT, "meta.json"), "utf8");
    const m = JSON.parse(raw);
    if (m && Number.isFinite(Number(m.season))) cur = Number(m.season);
  } catch { /* fyrsta keyrsla: dagsetningar-arid er naesta besta gisk */ }
  const out = [];
  for (let y = HISTORY_FROM; y <= cur; y++) out.push(y);
  return out;
}

/**
 * ÞAK A `minRows` FYRIR VIKULEGA SKRA — OG THAD VAR GILDRA.
 *
 * `weekly/{ar}.json` var skrifud med `minRows: 1000`, sem er rett fyrir
 * lokid timabil (2025 ber 6.638 radir). En **vika 1 ber ~390 radir**
 * (maelt: 390 arid 2025, 385 i viku 2), svo throskuldurinn hefdi
 * HAFNAD yfirstandandi timabili thangad til ~vika 3 — og einmitt tha
 * er notkun-til-thessa mest verd, thvi hun er thad EINA sem er til.
 *
 * Lokin ar halda 1000. Yfirstandandi ar faer 100, sem er nog til ad
 * sanna ad thetta seu raunveruleg gogn (ein vika er ~390) en hleypir
 * fyrstu vikunni i gegn.
 */
function weeklyMinRows(year, currentSeason) {
  return Number(year) >= Number(currentSeason) ? 100 : 1000;
}

/* ============================================================
   GLUGGINN FYRIR VIKULEGA SPA — OG HANN ER LAERDUR AF VILLU
   ============================================================
   `sl.projections(season, week)` er vistud sem `weekly-proj/{ar}-w{n}.json`
   og hun er SKRIFUD EINU SINNI. Tvaer reglur sem eru BADAR rettar —
   "adeins fyrir vikuna" og "adeins einu sinni" — gefa SAMAN ranga
   hegdun: *skrifa vid FYRSTA taekifaeri og frysta*.

   ÞETTA GERDIST I FPL-HLUTANUM OG ER SKJOLAD I CLAUDE.md KAFLA 7: GW1-rodin
   var raunverulega skrifud **222 KLST fyrir frestinn** med `start_prob`
   null hja 577 af 577. Kvordunin hefdi thvi maelt likanid a THESS EIGIN
   VERSTU agiskun. Lausnin thar var 12 klst gluggi; hér er hun sama hugsun
   med adra reiknivél.

   ÞRIR TIMAR AF FJORUM ERU FASTIR:
     · `core` keyrir 09:00 UTC DAGLEGA — eitt taekifaeri a dag, ekki 48
       eins og 30-minutna cron-inn i FPL. Glugginn verdur thvi ad vera
       DAGAR, ekki klukkustundir, annars missir ein sleppt cron-keyrsla
       vikuna alveg (GitHub thynnir og sleppir cron).
     · 72 klst gefa **thrju** taekifaeri. Sama vardstada og "30-minutna
       cron-inn faer ~24 taekifaeri" i FPL, faerd yfir a daglegan cron.

   AKKERID ER `date` UR `schedule.json` A MIDNAETTI UTC, EKKI RAUNVERULEGUR
   BYRJUNARTIMI — OG THAD ER VILJANDI VARFAERID. `gametime` i nflverse er
   **austurstrandartimi** (ET), svo raunverulegur upphafsleikur viku 1
   2026 er 2026-09-09 20:20 ET = **2026-09-10 00:20 UTC**. Ad reikna thad
   retta krefdist sumar-/vetrartima-medferðar sem myndi skeika i annad
   hvora attina, og BADIR ENDAR ERU EKKI JAFN DYRIR: skekkja sem er of
   SEIN skrifar spa EFTIR ad leikur er byrjadur og thad er leki. Midnaetti
   UTC a leikdegi er thvi ~24 klst FYRR en satt er, og su att er sú retta.

   Vikan er lesin UR `schedule.json`, ekki ur `state.week` hja Sleeper:
   i forleik ber Sleeper `week: 1, seasonType: "pre"`, sem er vika 1 af
   FORLEIK og ekki sama tala. Leikjaskrain veit hvenaer leikirnir eru.  */
const PROJ_WINDOW_H = 72;

/**
 * Naesta OSPILADA deildarvika og hvort vid seum inni i glugganum hennar.
 * Skilar `null` ef engin slik vika er til (timabilid er buid).
 */
/**
 * ER TIMABILID BYRJAD? Leidd af LEIKJASKRANNI, ekki af dagsetningu.
 *
 * Satt um leid og EINN REG-leikur arsins liggur ad baki. Hardkodud
 * dagsetning ("eftir 4. september") vaeri valin tala sem urelist
 * thegjandi naesta ar — sama regla og felldi `SEASON_LIVE_LABEL` i
 * FPL-verkefninu.
 *
 * ÞETTA ER HLID A SOKN, EKKI SIA A SVARI, og thad er munurinn sem
 * skiptir mali. Meidsla-skyrslur nflverse (`injuries_{ar}.csv`) eru
 * EKKI TIL fyrr en vika 1 hefur verid skrad — maelt 25.8.2026:
 * `injuries_2026.csv` svarar **404** medan `injuries_2025.csv` svarar
 * **200 med 6.069 rodum**. Vaeri sott hvort sem er skradi `injuries()`
 * RAUDA ROD i `status.json` hvern einasta dag i margar vikur, og
 * notandinn laerir a viku ad hunsa kassann — tha er raunveruleg
 * vidvorun jafn gagnslaus og engin (sama rok og felldu
 * keeper-fals-jakvaedid i `sleeper-league.js`).
 */
export function seasonUnderway(games, season, nowMs) {
  for (const g of games || []) {
    if (Number(g.season) !== Number(season)) continue;
    if (g.type !== "REG" || !g.date) continue;
    const t = Date.parse(`${g.date}T00:00:00Z`);
    if (Number.isFinite(t) && t <= nowMs) return true;
  }
  return false;
}

function upcomingWeek(games, season, nowMs, windowH = PROJ_WINDOW_H) {
  const firstOf = new Map();          // vika -> ms a midnaetti UTC leikdags
  for (const g of games || []) {
    if (Number(g.season) !== Number(season)) continue;
    if (g.type !== "REG" || !g.date || !g.week) continue;
    const t = Date.parse(`${g.date}T00:00:00Z`);
    if (!Number.isFinite(t)) continue;
    const cur = firstOf.get(g.week);
    if (cur == null || t < cur) firstOf.set(g.week, t);
  }
  let best = null;
  for (const [week, t] of firstOf) {
    if (t <= nowMs) continue;                       // vikan er byrjud
    if (best == null || t < best.anchor) best = { week, anchor: t };
  }
  if (!best) return null;
  const opens = best.anchor - windowH * 3600e3;
  return { ...best, opens, inWindow: nowMs >= opens };
}

/* ---------- skrifun ---------- */

/**
 * ROD ER FARMUR, EKKI UMBUÐIR.
 *
 * THETTA KOSTADI RAUNVERULEG GOGN. Adur taldi vordurinn
 * `Object.keys(data).length` a hlut-farmi. `market.json` er hlutur med
 * sex lykla — `season`, `generated`, `lines`, `futures`, `teams`,
 * `withLine` — svo `rows` var ALLTAF 6, oháð thvi hvad var i honum.
 *
 * 9.8.2026 kl. 21:25 skilaði ESPN engum linum. Skrain for ur **272
 * linum og 32 lidum nidur i null**, vordurinn hleypti thvi i gegn
 * (6 >= 3), workflow-id sagdi "success", og Market-flipinn var tomur i
 * appinu. Nakvaemlega su bilun sem lagmarkid er til ad hindra — hun
 * var bara ad telja rangan hlut.
 *
 * Nu er talid **staersta fylkid hvar sem thad liggur i farminum**, ekki
 * adeins i efsta lagi. `ecr.json` synir hvers vegna: thar liggja 515
 * leikmenn undir `ppr.players`, svo grunn leit finnur ekkert og talan
 * yrdi 4 — skra sem er i fullkomnu lagi hefdi verid dæmd tom.
 *
 * Hlutur an nokkurs fylkis (`meta.json`) fellur aftur i lyklafjolda,
 * sem er rett fyrir hann: thar ER hver lykill ein stadreynd.
 */
function rowCount(data, depth = 0) {
  if (Array.isArray(data)) {
    /* FYLKI AF UMBUÐUM SKILAR FJOLDA UMBUÐANNA, EKKI FARMSINS.
       `adp.json` er `{ season, ffc: [5 sett], generated }` og hvert
       sett ber 258 leikmenn. Fyrsta utgafan skilaði 5 og hafnaði
       skrifum sem voru i fullkomnu lagi — sami villuflokkur og hun
       var skrifud til ad hindra, bara einu lagi ofar. Nu er dypsti
       farmurinn talinn lika. */
    let best = data.length;
    if (depth < 4) {
      for (const v of data) {
        const n = rowCount(v, depth + 1);
        if (n > best) best = n;
      }
    }
    return best;
  }
  if (!data || typeof data !== "object") return 0;
  let best = 0;
  if (depth < 4) {
    for (const v of Object.values(data)) {
      const n = rowCount(v, depth + 1);
      if (n > best) best = n;
    }
  }
  return best || Object.keys(data).length;
}

async function writeJson(name, data, { minRows = 1 } = {}) {
  const file = path.join(OUT, name);
  const rows = rowCount(data);
  if (rows < minRows) {
    record(`write:${name}`, false,
      `REFUSED: ${rows} rows (minimum ${minRows}) — existing file left in place`);
    return false;
  }
  await mkdir(path.dirname(file), { recursive: true });
  const json = JSON.stringify(data);
  await writeFile(file, json);
  const kb = Math.round(json.length / 1024);
  console.log(`  -> ${name}  ${rows} radir  ${kb} KB`);
  /* HEPPNUD SKRIF ERU LIKA SKRAD. Adur var adeins hofnun skrad, og
     thar sem `status.json` sameinar radir a heiti gat rod eins og
     `write:teams.json: REFUSED` fra einni keyrslu ALDREI hreinsast —
     engin heppnud keyrsla skrifadi neitt ofan a hana. Notandinn hefdi
     seð rauda rod i Sources ad eilifu og laert ad hunsa spjaldid, sem
     er nakvaemlega thad sem spjaldid ma ekki gera. */
  record(`write:${name}`, true, `${rows} radir, ${kb} KB`);
  return true;
}

async function readJson(name) {
  try { return JSON.parse(await readFile(path.join(OUT, name), "utf8")); }
  catch { return null; }
}

/* ============================================================
   DAGSETTAR SKRAR — SKRIFADAR EINU SINNI, ALDREI OFAN I
   ============================================================
   Sex heimildir eru vistadar med dagsetningu i heitinu. Reglan er su
   sama og `data/predictions/` i FPL-verkefninu og hun er STRANGARI en
   `writeJson`:

     `writeJson`  ma skrifa ofan i — `players.json` ER myndin i dag og
                  gamla myndin hefur ekkert gildi.
     `writeOnce`  ma ALDREI skrifa ofan i — rod sem er til er SAGA, og
                  endurskrifud saga er retro-fitting.

   Þetta er hvorki varkarni ne smekkur. "Hvad sagdi dyptartaflan i viku
   5" er OSVARANLEG spurning eftir ad vika 5 er lidin: inntokin eru
   horfin. Skrifi seinni keyrsla sama dags ofan i tha fyrri er myndin
   ekki lengur mynd af theim tima sem hun segist vera.

   ÞRJAR HLIDAR, OG THAER ERU ALLAR NAUDSYNLEGAR:
     1. skra sem er til -> ekkert gert (ONEMANDI, engin villa skrad)
     2. thunn gogn      -> ekkert skrifad, OG thad er skrad sem villa
     3. saman: fyrsta keyrsla dagsins sem faer NYTILEG gogn vinnur

   (2) er ekki thad sama og (1) og ma ekki verda thad. Tom keyrsla sem
   thegdi vaeri "vistunin er i lagi" a skjanum medan dagurinn tapadist.
   Maelt doemi ur thessu repo-i: 13.8.2026 skiladi ESPN **3 greinum** og
   `news.json` var (rettilega) HAFNAD — hefdi frettasafnid skrifad tha
   thunnu mynd og fryst hana vaeri dagurinn geymdur RANGUR ad eilifu.  */
/* ============================================================
   TIMABILID KEMUR UR DAGSETNINGU GAGNANNA, EKKI UR KEYRSLUNNI
   ============================================================
   `weekly-ecr/2025-12-30.json` bar **`"season": 2026`** a gognum fra
   viku 17 timabilsins **2025**. Skrarnafnid var lagfaert a sinum tima
   (thad kemur ur `scrapeDate`) en SVIDID var thad ekki: thad var
   `season`, breytan sem heldur utan um yfirstandandi timabil
   KEYRSLUNNAR. Lab sem joinar a `season` bar thvi 2025-gogn saman vid
   2026 an thess ad nokkud saeist.

   Sama aett og BSD-lida-vorpunin i FPL-hlutanum: **thogul rong porun
   er verri en engin**. Og sama regla og "tomt gildi er sleppt, ekki
   sett i 0" — rangt merki les eins og maeling.

   NFL-timabil Y nær fra september Y fram i februar Y+1, svo januar og
   februar tilheyra FYRRA ari. Onyt dagsetning skilar `null`, ekki
   agiskun: "vid vitum ekki" er rett svar, 2026 var thad ekki.       */
function seasonOfScrape(isoDate) {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(String(isoDate || ""));
  if (!m) return null;
  const year = Number(m[1]), month = Number(m[2]);
  if (!(month >= 1 && month <= 12)) return null;
  return month >= 3 ? year : year - 1;
}

async function writeOnce(name, data, { minRows = 1 } = {}) {
  const file = path.join(OUT, name);
  try {
    await stat(file);
    /* HLID 1 — ONEMANDI. Ekkert `record` hér: dagur sem er thegar
       vistadur er ekki frett og ma ekki fylla `status.json` af rodum
       sem lita ut eins og adgerdir. */
    return false;
  } catch { /* skrain er ekki til — halt afram */ }

  const rows = rowCount(data);
  if (rows < minRows) {
    /* HLID 2 — thogn vaeri villan. */
    record(`archive:${name}`, false,
      `REFUSED: ${rows} rows (minimum ${minRows}) — day not archived, ` +
      `a later run today may still write it`);
    return false;
  }
  await mkdir(path.dirname(file), { recursive: true });
  const json = JSON.stringify(data);
  await writeFile(file, json);
  const kb = Math.round(json.length / 1024);
  console.log(`  -> ${name}  ${rows} radir  ${kb} KB  (NY dagsett skra)`);
  record(`archive:${name}`, true, `${rows} rows, ${kb} KB — archived, never rewritten`);
  return true;
}

/** Er dagsett skra thegar til? Notad til ad SLEPPA DYRRI SOKN. */
async function archived(name) {
  try { await stat(path.join(OUT, name)); return true; }
  catch { return false; }
}

const today = () => new Date().toISOString().slice(0, 10);

/* ============================================================
   THREP 1 — KJARNI
   ============================================================ */

async function stageCore() {
  console.log("\n=== KJARNI ===");

  const state = await sl.state();
  const season = Number(state.season);

  /* --- leikmannaheimurinn --- */
  const [sleeperPlayers, nvPlayers, espnPool, idmap] = await Promise.all([
    sl.allPlayers(),
    nv.players(),
    es.playerPool(season).catch((e) => { record("espn_players", false, e.message); return []; }),
    ad.idMap().catch((e) => { record("idmap", false, e.message); return []; }),
  ]);

  /* --- ADP, spar, radningar --- */
  const [ffcSets, sleeperSeasonProj, ecrPpr, ecrHalf, ecrStd, espnInj, teams] =
    await Promise.all([
      ad.ffcAll(season),
      sl.projections(season),
      fp.ecrPage("ppr-cheatsheets").catch((e) => { record("fp_ecr_ppr", false, e.message); return null; }),
      fp.ecrPage("half-point-ppr-cheatsheets").catch(() => null),
      fp.ecrPage("consensus-cheatsheets").catch(() => null),
      es.injuries().catch((e) => { record("espn_injuries", false, e.message); return []; }),
      es.teams().catch((e) => { record("espn_teams", false, e.message); return []; }),
    ]);

  const [trendAdd, trendDrop, newsFeed] = await Promise.all([
    sl.trending("add", 24, 200), sl.trending("drop", 24, 200),
    es.news(60).catch((e) => { record("espn_news", false, e.message); return []; }),
  ]);

  /* ============================================================
     TRENDING ER VISTAD DAGLEGA — OG THAD ER OENDURHEIMTANLEGT
     ============================================================
     `/players/nfl/trending/{add|drop}` er LIFANDI ENDAPUNKTUR: hann
     svarar fyrir sidustu 24 klukkustundir og GEYMIR ENGA SOGU. Hvergi
     — hvorki hja Sleeper ne annars stadar — er haegt ad na i hvad var
     saekt i vidbot i gaer. Hver dagur sem lidur an vistunar er
     TAPADUR AD EILIFU.

     Sama rok og `data/history/` i FPL-verkefninu: dagleg mynd verdur
     ekki buin til eftir a. Og hér er tilgangurinn skyr — waiver-rodun
     er ekki haegt ad BAKPROFA an sogu um hverjir voru saektir og
     hvernig their reyndust. Ad byrja i dag thydir ad prófun er moguleg
     i oktober; ad byrja i oktober thydir prófun i naesta tímabili.

     ~10 KB a dag. Skrain er lykluð a dagsetningu og keyrsla sama dags
     yfirskrifar sjalfa sig, svo margar keyrslur a dag safna ekki upp.

     ÞETTA ER SKRIFAD, OLESID — eins og `data/history/` var. Thad er
     asetningur og ma ekki eyda i "hreinsun".                        */
  {
    const day = new Date().toISOString().slice(0, 10);
    const snap = {
      date: day, captured: new Date().toISOString(), lookbackHours: 24,
      add: trendAdd, drop: trendDrop,
    };
    await writeJson(`trending/${day}.json`, snap, { minRows: 20 });
  }

  /* --- leikjaskra + linur --- */
  const games = await nv.schedule([season, season - 1]);

  /* --- MARKADURINN ---
     nflverse-skrain ber linur en thaer eru gisnar i forleik (337 af
     557 thegar thetta er skrifad). ESPN birtir DraftKings-linur fyrir
     ALLAR umferdir strax, svo markadslagid er sott thadan. Baedi eru
     hofd: nflverse fyrir soguna, ESPN fyrir yfirstandandi ar. */
  const lines = await mk.gameLines(season);
  const futures = await mk.futures(season);
  const teamMarket = mk.teamMarketStrength(lines);

  /* --- SAMEINING --- */
  const players = joinPlayers({
    sleeperPlayers, nvPlayers, espnPool, idmap,
    ecr: ecrPpr, ecrSets: { ppr: ecrPpr, half: ecrHalf, standard: ecrStd },
    ffcSets, sleeperProj: sleeperSeasonProj,
    trendAdd, trendDrop, espnInj, season,
  });

  await writeJson("players.json", players, { minRows: 300 });
  await writeJson("teams.json", teams, { minRows: 30 });
  await writeJson("schedule.json", games, { minRows: 200 });
  await writeJson("adp.json", {
    season,
    ffc: ffcSets,
    generated: new Date().toISOString(),
  }, { minRows: 100 });   // 258 leikmenn per sett
  await writeJson("ecr.json", {
    season,
    ppr: ecrPpr, half: ecrHalf, standard: ecrStd,
  }, { minRows: 100 });  // 500+ leikmenn per snid
  /* Frettir og meidsli i eigin skra — thaer eru THAD SEM BREYTIST
     ORAST og eiga thvi ekki ad thvinga endurhledslu a `players.json`
     (1,4 MB) i hvert sinn sem frett baetist vid. */
  /* MEIDSLA-FYLKID FER EKKI I SKRANA — MAELT, EKKI AKVEDID.
     ESPN skilar 800 meidsla-rodum. Thaer voru skrifadar hingad og
     namu **453 KB af 480**, sottar i hvert sinn sem My team er opnad.

     Maelt 9.8.2026 a raungognum:
       · appid les `news.injuries` HVERGI (adeins `news.articles`)
       · 661 af 800 rodum eru status "Active" — thad er ekki meidsli
       · `espnId` er NULL a ollum 800, svo porun getur adeins verid
         eftir nafni, sem er thogla ranga porunin sem repo-id bannar
       · a fantasy-stodum ber ESPN **NULL meidsli sem Sleeper missir**
       · `injuryNote`: 0 radir koma ur ESPN, 28 ur Sleeper
       · `injury`: ESPN stadfestir 14 sem Sleeper hafdi thegar

     Sott er thad afram og notad sem BAKLEID i `joinPlayers` (linur
     334-336) — hun kostar ekkert hja notandanum og gripur ef Sleeper
     hættir ad senda svidid. Thad sem var tekid ut er ad SENDA hraa
     fylkid i vafrann. */
  record("espn_injuries_payload", true,
    `${espnInj.length} rows fetched, kept as pipeline fallback only ` +
    `(0 statuses Sleeper lacks, 0 notes — not shipped to the client)`);
  await writeJson("news.json", {
    season, generated: new Date().toISOString(),
    articles: newsFeed,
  }, { minRows: 20 });   // 50 greinar i hverri keyrslu

  await writeJson("market.json", {
    season,
    generated: new Date().toISOString(),
    lines, futures, teams: teamMarket,
    withLine: lines.filter((g) => g.total != null).length,
    /* 272 leikir a tomu timabili; 200 er golf sem lifandi keyrsla
       nær alltaf en tom keyrsla nær aldrei. */
  }, { minRows: 200 });
  await writeJson("meta.json", {
    season, week: state.week, seasonType: state.season_type,
    seasonStart: state.season_start_date,
    displayWeek: state.display_week,
    generated: new Date().toISOString(),
  });

  /* Vistunin sidast: hun ma aldrei tefja ne fella fersku kjarnagognin. */
  await archiveDaily({ season, games, ffcSets, newsFeed, lines, futures });

  return { season, players, games };
}

/* ============================================================
   VISTUNIN — SERIUR SEM VERDA EKKI TIL EFTIR A
   ============================================================
   Rokin eru EKKI ad thetta se gagnlegt einhvern tima seinna — thau eru ad
   thad se OMOGULEGT ad byggja seinna. Sama regla og `data/history/` og
   `data/predictions/` i FPL-verkefninu (CLAUDE.md kafli 7): **dagleg mynd
   verdur ekki buin til eftir a.**

   ENGIN TALA A SERIUM HER. Hér stod "FIMM SERIUR" og "fjorar vidbaetur
   her og ein i `stageHistory`" — thad var ordid rangt strax vid naestu
   vidbot (`td-props`, sidan `market/`), nakvaemlega sama villa og
   hardkodada safna-talan i CLAUDE.md kafla 5 varar vid. Listinn nedan ER
   skrain; `ls data/` gefur hana retta.

   Hvad hver serie svarar, og hvad var THEGAR maelt um hana:

   `weekly-proj/`  Vikuleg Sleeper-spa. `src/weekview.js` deilir I DAG
                   arstidar-spa a 17 og BER ATHUGASEMD UM THAD. Thetta er
                   heimildin sem kaemi i stadinn. **Ekkert er tengt hér —
                   `weekview.js` er ekki snert** (annad safn a hana); thetta
                   laetur gognin VERDA TIL svo tengingin se maelanleg.
   `news/`         `news.json` er RULLANDI 50-greina gluggi an safns.
                   `handcuff-lab` skjalar thetta sem astaeduna fyrir thvi
                   ad HELMINGURINN af handcuff-spurningunni ("er
                   byrjunarmadurinn ad koma til baka?") er OMAELANLEGUR:
                   "hann er aetladur i naesta leik" er FRETT.
   `weekly-ecr/`   Vikuleg samsteypa med start/sit-einkunn. Lyklud a
                   `scrape_date` ur gognunum — sja notuna i fantasypros.mjs.
   `adp-history/`  `adp.json` er ENDURSKRIFUD DAGLEGA. Agust-september er
                   fyrsta ar seriu sem thrju lob bida a.
   `depth/`        Dyptartafla. `players.json` ber `depth`/`depthPos` fyrir
                   757 af 1.038 en **adeins nuverandi stodu**, og thad er
                   nakvaemlega thess vegna sem `handcuff-lab` NEITADI ad
                   nota hana ("`depth` er aldrei notad i labinu").
   `td-props/`     "Anytime Touchdown Scorer" per leik, vikulega.
   `market/`       **ARSTIDAR-LESTUR MARKADARINS FYRIR FYRSTA SNAPP.** ESPN
                   verdleggur alla 272 leiki i forleik; `market.json` er
                   endurskrifud daglega og `odds`-blokkin er FJARLAEGD af
                   loknum leikjum (maelt a 2025: 16 leikir, 0 med odds).
                   Lobin nota lokalinur viku 1 sem stadgengil i dag.

   ============================================================
   VISTUNIN MA ALDREI FELLA GAGNA-KEYRSLUNA
   ============================================================
   Hvert threp er i sinu `try`. Þetta er sama akvordun og
   `continue-on-error: true` a spa-bokhaldinu i FPL-workflow-inu: safnid
   er MAELITAEKI, ekki birtingargagn, og bilun i maelitaeki ma ekki taka
   ADP-ið og meidslin med ser. Villan er samt SKRAD (`record`), svo hun
   er synileg i Sources — thogul bilun er thad eina sem er verra en bilun.  */
async function archiveDaily({ season, games, ffcSets, newsFeed, lines, futures }) {
  console.log("\n--- vistun (dagsettar seriur) ---");
  const day = today();

  /* ---- 1. FRETTIR ----
     Gognin eru THEGAR sott fyrir `news.json`; hér er engin ny sokn.
     Sami `minRows: 20` og adalskrain — sja `writeOnce` hlid (2) og
     ESPN-daginn sem skilaði 3 greinum. */
  try {
    await writeOnce(`news/${day}.json`, {
      date: day, captured: new Date().toISOString(), season,
      articles: newsFeed,
    }, { minRows: 20 });
  } catch (e) { record("archive:news", false, `failed: ${e.message}`); }

  /* ---- 2. ADP (FFC, oll snid — half-PPR thar med) ----
     Lika thegar sott. `minRows: 100` er sama golf og `adp.json` og
     `rowCount` telur DYPSTA farminn (258 leikmenn per sett), ekki
     fjolda settanna. */
  try {
    await writeOnce(`adp-history/${day}.json`, {
      date: day, captured: new Date().toISOString(), season,
      ffc: ffcSets,
    }, { minRows: 100 });
  } catch (e) { record("archive:adp-history", false, `failed: ${e.message}`); }

  /* ---- 2b. MEIDSLA-SKYRSLURNAR (official injury report) ----
     `nv.injuries()` var skrifud, profud og **ALDREI KOLLUD** — sama aett
     og `nv.snapCounts` adur, og sama aett og `usageblend` i appinu.
     `practice_status` (DNP / Limited / Full) er thad sem hun ber umfram
     `players.json`, sem hefur adeins Out/Questionable ur Sleeper.

     HUN ER SOFNUD NUNA ThVI HUN VERDUR EKKI SOFNUD EFTIR A. Skran hja
     nflverse er ENDURSKRIFUD — hun ber alltaf nyjustu utgafu arsins, og
     „hvad sagdi skyrslan a fimmtudegi i viku 6" er OSVARANLEGT thegar
     vika 6 er lidin. Sama rok og `data/history/` i FPL og `adp-history/`
     hér: dagleg mynd verdur ekki bui til eftir a. Ætli einhver ad MAELA
     hvort `practice_status` beri merki umfram FPL-stodu i oktober tharf
     serian ad hefjast i viku 1.

     ENGIN MAELING FYLGIR ThESSU OG ThAD ER ASETT. Ekkert i appinu les
     `injuries/` — thetta er HRAEFNI, eins og `data/history/` var i
     FPL i marga manudi. Ad tengja hana i radgjofina an maelingar vaeri
     omaeld tala i vel-læsilegum reit.

     HLIDID ER A SOKNINNI (sja `seasonUnderway`): i forleik er EKKERT
     KALL gert og rodin er GRAEN med „bidur". Rauð rod daglega i margar
     vikur er havadi sem thjalfar notandann i ad hunsa kassann.        */
  try {
    if (!seasonUnderway(games, season, Date.now())) {
      record("archive:injuries", true,
        "waiting for week 1 — the official injury report does not exist before it " +
        "(measured 2026-08-25: injuries_2026.csv is 404, injuries_2025.csv is 200 " +
        "with 6069 rows). No call is made, so this is a gate, not a failure.");
    } else {
      const inj = await nv.injuries(season);
      await writeOnce(`injuries/${day}.json`, {
        date: day, captured: new Date().toISOString(), season,
        rows: inj,
      }, { minRows: 50 });
    }
  } catch (e) { record("archive:injuries", false, `failed: ${e.message}`); }

  /* ---- 3. VIKULEG SPA ----
     Gluggi FYRST, sokn a eftir. Sja `upcomingWeek` — utan gluggans er
     thetta ONEMANDI og enginn kall er gerdur. */
  try {
    const up = upcomingWeek(games, season, Date.now());
    if (!up) {
      record("archive:weekly-proj", true,
        `no unplayed REG week left in ${season} — nothing to snapshot`);
    } else {
      const name = `weekly-proj/${season}-w${up.week}.json`;
      if (await archived(name)) {
        console.log(`     weekly-proj: vika ${up.week} thegar vistud`);
      } else if (!up.inWindow) {
        /* SKRAD SEM `ok`, EKKI SEM VILLA. Ad vera utan gluggans er RETT
           hegdun; rod sem segir "failed" hér myndi kenna notandanum ad
           hunsa rauda rod i Sources — nakvaemlega thad sem spjaldid ma
           ekki gera (`writeJson`-notan um REFUSED sem hreinsast aldrei). */
        const h = Math.round((up.opens - Date.now()) / 3600e3);
        record("archive:weekly-proj", true,
          `week ${up.week} window opens in ${h}h ` +
          `(${PROJ_WINDOW_H}h before first kickoff) — nothing fetched`);
      } else {
        const rows = await sl.projections(season, up.week);
        /* ============================================================
           ADEINS RADIR SEM BERA SPA — OG ROKIN ERU HLIDID, EKKI STAERDIN
           ============================================================
           Maelt 14.8.2026 gegn lifandi API: vika 1 2026 ber **3.300 radir
           en adeins 580 med `pts_ppr`** (419 arid 2025). Hinar 2.720 bera
           `ppr: null` OG null i hverju odru svidi.

           STAERDIN ER RAUNVERULEG en hun er EKKI astaedan:
             allar radir   1.147,6 KB/viku -> 20,2 MB/timabil
             adeins spa      204,0 KB/viku ->  3,6 MB/timabil

           ASTAEDAN ER AD `minRows` VERDUR ANNARS TOM FULLYRDING. `rowCount`
           finnur staersta fylkid i farminum, svo med ollum rodum er talan
           **ALLTAF 3.300** — oháð thvi hvort ein einasta spa se i henni.
           Golfid `minRows: 100` hefdi thvi hleypt i gegn viku thar sem
           Sleeper skilaði 3.300 rodum af nullum og fryst hana ad eilifu.
           Þad er nakvaemlega villan sem `rowCount` var skrifud til ad laga
           i `market.json` ("rod er farmur, ekki umbudir") — sama gildra,
           einu lagi innar: **rod an spar er umbud, ekki farmur.**

           `rowsFromSource` heldur talunni sem var, svo hlutfallid se
           LESID UR GOGNUNUM og ekki agiskad seinna.                     */
        const withPts = rows.filter((r) => r.ppr != null);
        await writeOnce(name, {
          season, week: up.week, date: day,
          captured: new Date().toISOString(),
          firstKickoffUtcFloor: new Date(up.anchor).toISOString(),
          windowHours: PROJ_WINDOW_H,
          rowsFromSource: rows.length,
          withPoints: withPts.length,
          players: withPts,
        }, { minRows: 100 });
      }
    }
  } catch (e) { record("archive:weekly-proj", false, `failed: ${e.message}`); }

  /* ============================================================
     ---- 3b. MARKA-PROP ("Anytime Touchdown Scorer") ----
     ============================================================
     `mk.tdProps` VAR TIL OG ENGINN KALLADI HANA. Sama undirskrift og
     sex heimildirnar sem voru tengdar 14.8.: `espn_td_props` hefur
     ALDREI birst i `status.json`, i neinni keyrslu.

     HVERS VEGNA HUN ER TENGD NUNA OG EKKI SEINNA: verdin eru
     OENDURHEIMTANLEG. Vedbankalina hverfur um leid og leikurinn er
     buinn — `sports.core.api` geymir enga sogu — svo "hvad sagdi
     markadurinn um hver myndi skora i viku 1" er OSVARANLEG spurning
     eftir viku 1. Sama roksemd og `data/history/` i FPL-hlutanum og
     `weekly-proj` hér: dagsmynd verdur ekki bui til eftir a. Ad bida
     thess ad vid VITUM hvad vid myndum maela vaeri ad bida thess ad
     gognin seu farin.

     ============================================================
     GLUGGINN ER SA SAMI OG HJA VIKULEGRI SPA — OG ThAD ER MAELT
     ============================================================
     Bokmakarar OPNA thessa markadi ekki fyrr en naerri leikdegi. Maelt
     21.8.2026 (20 dogum fyrir viku 1) a opnunarleiknum NE@SEA:
       5 sidur, 111 prop, **22 "Anytime Touchdown Scorer"** — og
       **0 med verd**. Onnur vika-3 leikur bar ekkert `propBets` svid.
     Til samanburdar: i loknum 2025-leik voru 1.697 prop MED verdum.
     `PROJ_WINDOW_H` (72 klst) er thvi rett gluggi og hann er SA SAMI
     svo tvaer dagsettar seriur geti ekki reikad i sundur.

     ThRJAR HLIDAR OG ThAER ERU EKKI SAMA HLIDID:
       utan gluggans        -> ENGIN sokn, skrad `ok` (rett hegdun)
       gluggi opinn, 0 verd -> skrad `ok` MED tolunni. Bokmakarar hafa
                               ekki opnad markadinn; thad er EKKI bilun
                               og rod sem segdi "failed" myndi kenna
                               notandanum ad hunsa spjaldid.
       gluggi opinn, verd   -> `writeOnce` med `minRows: 50`
     `tdProps` skilar ADEINS rodum med verdi (`decimal != null`), svo
     `rowCount` telur VERD, ekki uppskriftir — sama gildra og
     `weekly-proj` (3.300 radir, 580 med spa) og hun er lokud eins.

     KOSTNADUR: ~6 koll per leik (1 odds + upp i 5 prop-sidur) x 16
     leikir = ~96 koll, EINU SINNI per viku — `archived()` er spurt a
     undan, svo daginn eftir er thetta 0 koll.                        */
  try {
    const up = upcomingWeek(games, season, Date.now());
    if (!up) {
      record("archive:td-props", true,
        `no unplayed REG week left in ${season} — nothing to snapshot`);
    } else {
      const name = `td-props/${season}-w${up.week}.json`;
      if (await archived(name)) {
        console.log(`     td-props: vika ${up.week} thegar vistud`);
      } else if (!up.inWindow) {
        const h = Math.round((up.opens - Date.now()) / 3600e3);
        record("archive:td-props", true,
          `week ${up.week} window opens in ${h}h ` +
          `(${PROJ_WINDOW_H}h before first kickoff) — nothing fetched`);
      } else {
        /* Leikjanumerin koma UR LINUNUM sem thegar voru sottar. Ad
           saekja vika-yfirlitid aftur vaeri annad kall fyrir tolu sem
           vid holdum thegar a. */
        const ids = (lines || []).filter((g) => g.week === up.week)
          .map((g) => g.id).filter(Boolean);
        if (!ids.length) {
          record("archive:td-props", false,
            `week ${up.week} window is open but no event ids in the lines — ` +
            `nothing fetched`);
        } else {
          const rows = await mk.tdProps(ids);
          if (!rows.length) {
            record("archive:td-props", true,
              `week ${up.week}: ${ids.length} games in the window, ` +
              `0 anytime-TD entries carry a price yet — bookmakers have not ` +
              `opened this market (measured 21.8.2026: 22 listed, 0 priced)`);
          } else {
            await writeOnce(name, {
              season, week: up.week, date: day,
              captured: new Date().toISOString(),
              firstKickoffUtcFloor: new Date(up.anchor).toISOString(),
              windowHours: PROJ_WINDOW_H,
              games: ids.length,
              /* HRA LIKINDI, EKKI AFVIGUD — "einhver skorar" er ekki
                 lokad mengi, svo afviging er ekki mogulég. Talan er
                 OFMAT og `espnodds.mjs` segir thad berum ordum. */
              priced: rows.length,
              props: rows,
            }, { minRows: 50 });
          }
        }
      }
    }
  } catch (e) { record("archive:td-props", false, `failed: ${e.message}`); }

  /* ---- 4. VIKULEG ECR (DynastyProcess-speglun) ----
     Heitid kemur ur GOGNUNUM (`scrape_date`), svo dagur sem speglunin
     hefur ekki uppfaert skrifar ekkert. Þess vegna er sott adur en
     nafnid er thekkt — 267 KB, thad er odyrasta kallid i keyrslunni. */
  try {
    const w = await fp.weeklyEcr();
    if (w) {
      /* `seasonOfScrape`, EKKI `season` — sja athugasemdina vid fallid.
         Vikuleg ECR sem er sott i agust getur borid desember-mynd fra
         FYRRA timabili, og tha er `season` keyrslunnar rangt svar. */
      await writeOnce(`weekly-ecr/${w.scrapeDate}.json`, {
        scrapeDate: w.scrapeDate, captured: new Date().toISOString(),
        season: seasonOfScrape(w.scrapeDate), players: w.players,
      }, { minRows: 100 });
    }
  } catch (e) { record("archive:weekly-ecr", false, `failed: ${e.message}`); }

  /* ============================================================
     ---- 5. DYPTARTAFLA ----
     ============================================================
     ÞETTA ER DYRASTA SOKNIN I VISTUNINNI: 8,5 MB (.gz) sem vex daglega.
     Þess vegna er `archived()` SPURT A UNDAN — kvoldkeyrslan i drafttid
     (21:00 UTC) myndi annars saekja 8,5 MB til ad henda theim.

     ============================================================
     OG ROKIN FYRIR THESSARI ERU ONNUR EN FYRIR HINUM FJORUM — MAELT
     ============================================================
     Hinar fjorar seriur eru OENDURHEIMTANLEGAR: heimildin skrifar ofan
     i sjalfa sig og gaerdagurinn er farinn. **Dyptartaflan er thad EKKI**,
     og thad var maelt 14.8.2026 adur en thetta var skrifad:

       `depth_charts_2025.csv` ber **554.215 radir og 219 EINKVAEMA DAGA**
       (2025-08-03 -> 2026-03-14), thar af **151 daga INNAN timabilsins**.

     nflverse geymir thvi dyptar-soguna sjalft i nyja snidinu. Ad segja
     "annars tapast hun" vaeri OMAELD FULLYRDING SEM LITUR UT EINS OG
     MAELING, og thad er versta utkoman (README kafli 1).

     Vistunin stendur samt, af thremur rokum sem eru minni en "tapast
     ad eilifu" og eru sogd hér i sinni raunverulegu staerd:
       1. **NYTILEIKI.** Sagan er fáanleg adeins sem 8,5 MB skra sem vex
          daglega. Lab sem vill vita hver var RB1 hja einu lidi i viku 5
          getur ekki lesid hana; 121 KB dagsmynd getur thad.
       2. **VATRYGGING, OG HUN ER EKKI TILGATA.** nflverse **BREYTTI
          SNIDINU** milli 2024 og 2025 (sja notuna vid `depthCharts`) og
          thad braut lesturinn ÞEGJANDI. Heimild sem hefur breytt sniði
          einu sinni getur gert thad aftur — eda styft skrana thegar
          timabili lykur.
       3. Skrarnar eru **fastar** i git og fylgja bakprofunum.

     ============================================================
     STAERDIN, MAELD I FJORUM AFBRIGDUM (975 radir per dag)
     ============================================================
       A verbatim, eins og fallid skilar        159,6 KB/dag ->  57 MB/ar
       B **an `dt` og `week`  <- VALID**        121,5 KB/dag ->  43 MB/ar
       C adeins team/id/name/pos/depth           73,3 KB/dag ->  26 MB/ar
       D ALLAR stodur (3.228 radir)             408,2 KB/dag -> 146 MB/ar

     **B er valid og C er thad ekki**, thott C se odyrari: `espnId` er
     bru, og `slot`/`formation` eru raunveruleg upplysing (hver er WR3 i
     "3WR 1TE" er ONNUR spurning en hver er WR3 i dyptar-rod). B fjarlaegir
     ADEINS TVITEKNINGU og engin gildi: `dt` er **fasti innan dagsmyndar**
     og er geymt einu sinni sem `sourceDt`, og `week` er **alltaf null** i
     nyja snidinu. Sama akvordun og BSD-skotin i FPL-hlutanum, thar sem
     543 KB urdu 338 KB af thvi ad somu gogn voru geymd thrivegis — og
     rokin thar voru ekki staerdin heldur ad afritin gaetu rekid i sundur.
     43 MB/ar er i somu staerdargrod og `data/history/` (~29 MB/ar) sem
     CLAUDE.md kafli 7 skjalar sem "thess virdi ad fylgjast med".

     ============================================================
     `FANTASY_DEPTH_POS` ER EKKI OTHORF SIA — SJA `normPos`
     ============================================================
     ATHUGID: HER STOD RANGT MAL OG GOGNIN SJALF AFSONNUDU THAD.
     Athugasemdin sagdi ad `depthCharts(2026)` skiladi "975 radir og
     adeins fantasy-stodur, thvi `normPos` skilar `null` fyrir
     RCB/LDE", og alyktadi ad sian vaeri "engin adgerd". Hvorugt er satt:
     `normPos` (`src/scoring.js`) skilar `s` OBREYTTU fyrir okunna stodu —
     `normPos("RCB") === "RCB"` — og vorpunin thar (DEF/D-ST -> DST,
     PK -> K, FB -> RB) er thess vegna vorpun, ekki sia.

     SIAN ER THVI BURDARVIRKI. Lesid ur `rowsBeforePosFilter` i thremur
     dagsmyndum i rod:

       2026-08-14   3.228 -> 975   (2.253 felldar, 69,8%)
       2026-08-15   3.226 -> 974   (2.252 felldar, 69,8%)
       2026-08-16   3.225 -> 973   (2.252 felldar, 69,8%)

     Tvo thridju hlutar dyptartoflunnar eru varnar- og serlidsstodur sem
     engin fantasy-deild stillir upp. Vaeri `FANTASY_DEPTH_POS` fjarlaegd
     faeri dagsmyndin ur ~975 rodum i ~3.226 — threfold skra, ~146 MB/ar
     i stad ~44 — og serian yrdi osamanburdarhaef vid sjalfa sig.

     Radasettid i thessari skra ma thvi ekki haggast, og astaedan er
     NAKVAEMLEGA OFUG vid thad sem hér stod: ekki "sian gerir ekkert
     hvort sem er", heldur "sian gerir allt".

     `rowsBeforePosFilter` er geymt svo utkoman theirrar spurningar se
     LESIN UR GOGNUNUM og ekki agiskud seinna — og thad var einmitt su
     geymsla sem gerdi thessa leidrettingu moglega.                     */
  try {
    /* `depth/{dagur}.json` — EKKI `{timabil}-{dagur}`, sem gaf
       "2026-2026-08-14". Timabilid er i farminum (`season`), thar sem
       thad tharf ad vera hvort sem er: i januar er dagsetningar-arid
       EKKI timabilid (sama gildra og `historyYears()` var lagfaerd fyrir),
       svo `depth/2027-01-05.json` ber `season: 2026` og thad er rett.
       Heitid er tha eins og `trending/`, `news/` og `adp-history/`:
       einn dagur, ein skra. */
    const name = `depth/${day}.json`;
    if (await archived(name)) {
      console.log("     depth: dagurinn thegar vistadur");
    } else {
      const all = await nv.depthCharts(season, { latestOnly: true });
      const kept = all.filter((r) => FANTASY_DEPTH_POS.has(r.pos));
      /* `dt` og `week` STRIPPUD — sja B ad ofan. Engin ONNUR breyting a
         rodunum: gildin sjalf eru thau sem fallid skilaði. */
      const players = kept.map(({ dt, week, ...rest }) => rest);
      await writeOnce(name, {
        season, date: day, captured: new Date().toISOString(),
        /* `sourceDt` er timastimpill nflverse a dagsmyndinni og hann er
           EKKI sami hlutur og `date`: their skonnudu kl. 08:10 UTC, vid
           vistum kl. 09:5x. Baedi eru geymd svo enginn thurfi ad giska. */
        sourceDt: kept.length ? kept[0].dt : null,
        posKept: [...FANTASY_DEPTH_POS],
        rowsBeforePosFilter: all.length,
        players,
      }, { minRows: 200 });
    }
  } catch (e) { record("archive:depth", false, `failed: ${e.message}`); }

  /* ============================================================
     ---- 6. MARKADURINN — ARSTIDAR-LESTURINN FYRIR FYRSTA SNAPP ----
     ============================================================
     ESPN VERDLEGGUR ALLA 272 LEIKI I FORLEIK. Maelt 24.8.2026 a
     `market.json`: 272 leikir, **271 med BAEDI total og spread**, allar
     18 vikur (13-16 leikir hver). Þad er domur markadarins um HVERN
     LEIK TIMABILSINS adur en eitt snapp hefur verid spilad — og hann er
     sterkara merki en lokalinur viku 1, sem er thad sem lobin nota i dag
     sem staðgengil.

     ============================================================
     OG HANN VERDUR ALDREI TIL EFTIR A — MAELT, EKKI ALYKTAD
     ============================================================
     `sports.core.api` geymir enga sogu og `market.json` er ENDURSKRIFUD
     daglega. Þad var maelt beint 24.8.2026 a LOKNU timabili:

       scoreboard?dates=2025&seasontype=2&week=1
         site.api.espn.com      HTTP 200, 16 leikir, **0 med `odds`**
         site.web.api.espn.com  HTTP 200, 16 leikir, **0 med `odds`**

     `odds`-blokkin er thvi FJARLAEGD um leid og leikur er buinn. Þetta
     er ekki "gisin gogn" heldur horfin gogn, og thad er nakvaemlega sama
     roksemd og `data/history/`, `data/predictions/` (CLAUDE.md kafli 7)
     og hinar fimm seriurnar hér: **dagsmynd verdur ekki bui til eftir a.**

     ============================================================
     FRAMTIDARMARKADIR ERU I SOMU SKRA — OG ROKIN ERU MAELD
     ============================================================
     `/seasons/{ar}/futures` SVARAR fyrir lidin timabil (maelt 24.8.2026:
     2023 HTTP 200 / 12 markadir, 2024 / 25, 2025 / 21). Fyrsta agiskun
     vaeri thvi ad futures thurfi ekki ad vistast. **Þad er rangt, og
     talan sem sannar thad er verdid sjalft:**

       lengsta Super Bowl-verd i svarinu    2024  +25000
                                            2026  +50000
                                            2025 **+400000** (fjogur lid)

     Enginn FORLEIKS-markadur verdleggur lid a 4.000-1. Endapunkturinn
     ber thvi EITT gildi per timabil og fyrir 2025 er thad synilega
     MIDS-/SEINT-TIMABILS astand — hann geymir "eitthvad", ekki
     "forleiks-lesturinn". Færslan ber hvorki `open` ne `current`
     (maelt: 0 af 32 i baedi 2025 og 2026), svo opnunarverdid er hvergi.
     **Endapunktur sem svarar 200 er ekki thad sama og heimild sem
     geymir soguna** — sama aett og `has_xg` sem LYGUR i FPL-hlutanum.

     Þau eru i SOMU SKRA og linurnar thvi thau eru EIN markads-lestur:
     baedi svara "hvad heldur markadurinn um thetta lid", futures a
     timabils-kvarda og linurnar per leik. Vaeru thau tvaer seriur gaeti
     onnur skrifast og hin hafnad sama dag, og lab sem joinar a `date`
     baeri tha saman **tvo daga** an thess ad nokkud saeist — thogla
     ranga porunin sem repo-id bannar.

     ============================================================
     `teams` ER EKKI GEYMT — ThAD ER BEIN TVITEKNING (MAELT)
     ============================================================
     `market.json` ber `teams` (32 radir, lidsstyrkur ur linunum).
     `teamMarketStrength(games)` a VERDLOGDU rodunum i thessari skra
     skilar **byte-eins streng** vid thad svid (32.476 stafir = 32.476,
     maelt 24.8.2026). Þad er thvi afleidd tala, ekki gogn, og afrit
     sem geta rekid i sundur eru haettan — ekki staerdin (sama akvordun
     og BSD-skotin, 543 -> 338 KB, og `dt`/`week` i `depth/`).
     Staerdin fylgir samt: **75,9 -> 44,1 KB/dag.**

     ============================================================
     GOLFID: 260, OG ThAD ER MAELT A ThVI HVERNIG SVARID BROTNAR
     ============================================================
     ADEINS VERDLOGD RADIR ERU GEYMDAR (`total != null && spread != null`),
     af somu astaedu og `weekly-proj` geymir adeins radir med spa: an
     theirrar siu finnur `rowCount` alltaf 272 og golfid getur ALDREI
     fallid, hversu tomar sem linurnar eru. **Rod an verds er umbud,
     ekki farmur.**

     Golfid er sidan lagt vid THA BILUN SEM ThETTA REPO HEFUR MAELT, ekki
     vid tomt svar:
       · **HEIL VIKA FELLUR = 16 LEIKIR.** `status.json` bar 18 radir
         `espn_lines_w{n} failed: HTTP 403` 20.8.2026. Ein topud vika
         gefur 271-16 = **255 < 260 -> HAFNAD**, og thad er RETT: hola
         i arstidar-lestrinum ma ekki frjosa, thvi `writeOnce` skrifar
         aldrei ofan i og morgundagurinn faer fulla mynd.
       · **TOMT SVAR GEFUR EKKI 0 HELDUR 9.** Farmurinn ber niu lykla,
         svo `rowCount` fellur i lyklafjolda (`best || Object.keys`) og
         skilar **9** — nakvaemlega gildran sem kostadi `market.json`
         272 linur 9.8.2026 (thar 6 lyklar >= 3). Maelt hér a raunverulega
         tomum farmi: **9**. Golf 260 fellir hann; golf 1 hefdi ekki.
     271 maelt i dag, 260 golf: 11 leikja slaki fyrir stok verdlaus
     leiki, sem er RAUNVERULEGT og annad mal en topud vika.

     ============================================================
     SERIAN ER FORLEIKS-SERIA OG HUN STOPPAR SJALF — SKRAD SEM `ok`
     ============================================================
     Um leid og leikir eru spiladir hverfur `odds` af theim (maelingin
     ad ofan), svo `priced` fellur undir golfid og serian myndi skila
     **RAUDRI rod hvern einasta dag tímabilsins** — rod sem hreinsast
     aldrei og kennir notandanum ad hunsa spjaldid (sama villa og
     `writeJson`-notan lysir). Þess vegna er FYRSTI LEIKUR spurdur
     FYRST og eftir hann er skrad `ok`: arstidar-lesturinn er
     FULLKOMNADUR, ekki brotinn. Vikulegar linur eftir thad eru vistadar
     annars stadar (`advice/` ber linu lidsins, `td-props/` verdin).   */
  try {
    const name = `market/${day}.json`;
    const firstKick = firstRegKickoffMs(games, season);
    if (await archived(name)) {
      console.log("     market: dagurinn thegar vistadur");
    } else if (firstKick != null && Date.now() >= firstKick) {
      record("archive:market", true,
        `season ${season} is under way (first REG kickoff ` +
        `${new Date(firstKick).toISOString().slice(0, 10)}) — the preseason ` +
        `season-long read is complete; ESPN drops the odds block for played ` +
        `games (measured: 2025 week 1 returns 16 events, 0 with odds)`);
    } else {
      /* VERDLOGD RADIR EINAR — sja notuna. `withLine` i `market.json`
         telur adeins `total`, sem er EKKI sama tala: 272 a moti 271. */
      const priced = (lines || []).filter(
        (g) => g.total != null && g.spread != null);
      const fut = futures || [];
      const sb = fut.find((f) => /super bowl/i.test(f.market || ""));
      const sbTeams = sb ? (sb.teams || []).length : 0;
      const wrote = await writeOnce(name, {
        season, date: day, captured: new Date().toISOString(),
        /* Baðar tolur eru GEYMDAR svo hlutfallid se LESID UR GOGNUNUM og
           ekki agiskad seinna — sama regla og `rowsFromSource` i
           `weekly-proj` og `rowsBeforePosFilter` i `depth`. */
        gamesFromSource: (lines || []).length,
        priced: priced.length,
        futuresMarkets: fut.length,
        superBowlTeams: sbTeams,
        games: priced,
        futures: fut,
      }, { minRows: 260 });
      /* FUTURES ER SKRAD SER, OG ADEINS ThEGAR DAGURINN VAR VISTADUR.
         Golfid ver linurnar (thad OENDURHEIMTANLEGA); futures er ekki i
         thvi thvi `rowCount` finnur eitt haesta fylki og getur ekki
         fullyrt um tvo obundna hluta i sama farmi. Rodin hér er thvi
         hlidid a futures: 1 Super Bowl + 2 radstefnur + 8 deildir = 11
         markadir er heil mynd (maelt 24.8.2026), og Super Bowl-markadur
         med 32 lidum er akkerid sem lab joinar a. Vaeri hann thunnur
         yrdi dagurinn samt vistadur — en hann yrdi ekki ThOGULL.       */
      if (wrote) {
        record("archive:market-futures", sbTeams >= 30,
          `${fut.length} futures markets archived (11 = 1 Super Bowl + ` +
          `2 conference + 8 division is a complete read); Super Bowl market ` +
          `carries ${sbTeams} teams (30 required)`);
      }
    }
  } catch (e) { record("archive:market", false, `failed: ${e.message}`); }
}

/**
 * Fyrsti DEILDARLEIKUR timabilsins i ms, eda `null` finnist hann ekki.
 *
 * Midnaetti UTC a leikdegi, sama akkeri og `upcomingWeek` notar og af
 * somu astaedu: `gametime` i nflverse er austurstrandartimi, svo hvassari
 * tala krefdist sumar-/vetrartima-medferdar sem skeikar. Baðir endar eru
 * ekki jafn dyrir hér heldur — skekkja sem er of SEIN heldur vistuninni
 * gangandi eftir ad fyrsti leikur er byrjadur og skrifar tha halfa mynd
 * sem `writeOnce` frystir. Midnaetti er ~20 klst FYRR en satt er og su
 * att er su retta.
 */
function firstRegKickoffMs(games, season) {
  let best = null;
  for (const g of games || []) {
    if (Number(g.season) !== Number(season)) continue;
    if (g.type !== "REG" || !g.date) continue;
    const t = Date.parse(`${g.date}T00:00:00Z`);
    if (!Number.isFinite(t)) continue;
    if (best == null || t < best) best = t;
  }
  return best;
}

/* QB/RB/WR/TE/K. `normPos` gerir FB -> RB og PK -> K, svo baedir
   flokkarnir rata inn an sertilfellis. Maelt i dagsmyndinni 2026-08-14:
   WR 398, RB 216 (FB innifalid), TE 201, QB 119, K 41 = **975 radir,
   32 lid, 32 menn i QB-dyptarrod 1**. */
const FANTASY_DEPTH_POS = new Set(["QB", "RB", "WR", "TE", "K"]);

/* ============================================================
   SAMEININGIN — thetta er hjartað og thad sem getur verid rangt
   an thess ad nokkud brotni synilega.

   NAVIGERINGIN ER SLEEPER-MIDJUD af einni astaedu: Sleeper ber
   SJALFUR gsis_id OG espn_id fyrir langflesta leikmenn. Thad thydir
   ad tvaer af thremur samtengingum eru ORUGGAR an nafna-porunar.
   Adeins FantasyPros og FFC krefjast bruar/nafna.

   HVER LEIKMADUR BER `matchedVia` SEM SEGIR HVERNIG hann var
   paradur. Thad er ekki skraut: ef nafna-porun tekur skyndilega
   yfir (t.d. thvi Sleeper hætti ad senda gsis_id) sest thad
   samstundis i profinu i stad thess ad birtast sem hægfara
   gagnaskekkja.
   ============================================================ */

function joinPlayers({ sleeperPlayers, nvPlayers, espnPool, idmap, ecr, ecrSets,
                       ffcSets, sleeperProj, trendAdd, trendDrop, espnInj, season }) {
  const stats = { total: 0, gsis: 0, espn: 0, fp: 0, ffc: 0, byName: 0 };

  /* uppflettitoflur a audkennum */
  const nvByGsis = new Map(nvPlayers.map((p) => [p.id, p]));
  const nvBySleeper = new Map(nvPlayers.filter((p) => p.sleeperId).map((p) => [p.sleeperId, p]));
  const espnById = new Map(espnPool.map((p) => [p.espnId, p]));
  const projBySleeper = new Map(sleeperProj.map((p) => [p.sleeperId, p]));
  const addBySleeper = new Map(trendAdd.map((t) => [t.sleeperId, t.count]));
  const dropBySleeper = new Map(trendDrop.map((t) => [t.sleeperId, t.count]));

  /* ---- AUDKENNISBRUIN ----
     SLEEPER ER EKKI LENGUR BRU. Fyrsta utgafan reiddi sig a ad
     Sleeper baeri sjalfur `gsis_id` og `espn_id`. Maelt 9.8.2026:
     af 989 virkum QB/RB/WR/TE bera **adeins 162 gsis_id og 218
     espn_id** — Ja'Marr Chase ber hvorugt. Su leid skiladi thvi
     nafna-porun a 732 leikmonnum, sem er nakvaemlega hið thogla
     ronga sem vid erum ad forðast.

     DynastyProcess `db_playerids.csv` er hins vegar HANDVIDHALDIN
     bru med 6.362 sleeper-audkenni og hun ber gsis, espn OG
     fantasypros i somu rod. Hun er thvi hubbid — Sleeper-audkennin
     eru notud sem VARALEID, ekki ofugt. */
  const bridge = new Map();
  for (const r of idmap) if (r.sleeperId) bridge.set(r.sleeperId, r);
  const fpByGsis = new Map();
  for (const r of idmap) if (r.gsisId && r.fpId) fpByGsis.set(r.gsisId, r.fpId);

  const ecrByFp = new Map((ecr ? ecr.players : []).map((p) => [p.fpId, p]));
  const ecrIdx = buildIndexes(ecr ? ecr.players : []);

  /* ============================================================
     ECR ER SOTT I THREMUR SNIÐUM — OG THAU ERU RAUNVERULEGA OLIK
     ============================================================
     Adur var ADEINS PPR-taflan tengd vid leikmenn; hinar tvaer voru
     sottar, skrifadar i `ecr.json` og LESNAR AF ENGUM. Dalkurinn
     "Expert consensus rank" syndi thvi PPR-tolu i standard-deild,
     vid hlidina a ADP-dalki sem SKIPTIR eftir sniði.

     Og munurinn er ekki smaatriði. Maelt 10.8.2026 a thessum somu
     skram: af 502 sameiginlegum leikmonnum hafa **467 annad saeti** i
     standard en i PPR, og efstu fjorir snuast vid — Ja'Marr Chase er
     ECR1 i PPR en Jahmyr Gibbs i standard.

     Nu er hvert snid tengt fyrir sig og geymt undir `ecrByScoring`.
     Flata `ecr`-svidid stendur afram sem PPR (eldri lesendur), en
     `build.js` velur retta snidid ur toflunni.                     */
  const ecrIdxByScoring = {};
  for (const [k, set] of Object.entries(ecrSets || {})) {
    if (!set || !Array.isArray(set.players)) continue;
    ecrIdxByScoring[k] = {
      byFp: new Map(set.players.map((p) => [p.fpId, p])),
      idx: buildIndexes(set.players),
    };
  }

  /* FFC: ekkert sameiginlegt audkenni -> nafna-porun (merkt sem slik) */
  const ffcIdx = {};
  for (const set of ffcSets) {
    ffcIdx[`${set.scoring}_${set.teams}`] = buildIndexes(set.players);
  }

  const espnIdx = buildIndexes(espnPool);
  const espnInjIdx = buildIndexes(espnInj.map((i) => ({ ...i, pos: i.pos })));

  const out = [];
  for (const s of sleeperPlayers) {
    stats.total++;
    const team = normTeam(s.team);

    /* Bruin fyrst, Sleeper-audkennin sem varaleid. */
    const br = bridge.get(s.sleeperId) || {};
    const gsisId = br.gsisId || s.gsisId || null;
    const espnId = br.espnId || s.espnId || null;

    /* --- nflverse (sannleikurinn um fortidina) --- */
    let nvp = null, viaNv = null;
    if (gsisId && nvByGsis.has(gsisId)) {
      nvp = nvByGsis.get(gsisId);
      viaNv = br.gsisId ? "bridge" : "sleeper_gsis";
      stats.gsis++;
    } else if (nvBySleeper.has(s.sleeperId)) {
      nvp = nvBySleeper.get(s.sleeperId); viaNv = "nflverse_sleeper_id"; stats.gsis++;
    }

    /* --- ESPN (ADP, uppbod, eignarhald) --- */
    let esp = null, viaEs = null;
    if (espnId && espnById.has(espnId)) {
      esp = espnById.get(espnId);
      viaEs = br.espnId ? "bridge" : "sleeper_espn";
      stats.espn++;
    } else {
      const m = matchByName(espnIdx, s.name, s.pos, team);
      if (m) { esp = m.item; viaEs = `name:${m.via}`; stats.byName++; }
    }

    /* --- FantasyPros (ECR + threp) --- */
    const fpId = br.fpId || (gsisId && fpByGsis.get(gsisId)) || null;
    let ecrRow = fpId ? ecrByFp.get(fpId) : null;
    let viaFp = ecrRow ? "fp_id" : null;
    if (!ecrRow) {
      const m = matchByName(ecrIdx, s.name, s.pos, team);
      if (m) { ecrRow = m.item; viaFp = `name:${m.via}`; }
    }
    if (ecrRow) stats.fp++;

    /* Sama porun fyrir hvert snid: fp_id fyrst, nafn sem sidasta urraedi. */
    const ecrByScoring = {};
    for (const [k, tbl] of Object.entries(ecrIdxByScoring)) {
      let row = fpId ? tbl.byFp.get(fpId) : null;
      if (!row) {
        const m = matchByName(tbl.idx, s.name, s.pos, team);
        if (m) row = m.item;
      }
      if (row) {
        ecrByScoring[k] = { ecr: row.ecr, tier: row.tier, sd: row.sd,
                            best: row.best, worst: row.worst, posRank: row.posRank };
      }
    }

    /* --- FFC ADP i ollum settum --- */
    const ffc = {};
    for (const [key, idx] of Object.entries(ffcIdx)) {
      const m = matchByName(idx, s.name, s.pos, team);
      if (m) ffc[key] = { adp: m.item.adp, sd: m.item.sd, high: m.item.high,
                          low: m.item.low, times: m.item.times };
    }
    if (Object.keys(ffc).length) stats.ffc++;

    const proj = projBySleeper.get(s.sleeperId) || null;
    const inj = matchByName(espnInjIdx, s.name, s.pos, team);

    out.push({
      id: s.sleeperId,
      gsisId: gsisId || (nvp ? nvp.id : null),
      espnId: espnId || (esp ? esp.espnId : null),
      fpId,
      name: s.name,
      pos: s.pos,
      team,
      age: s.age ?? (nvp ? null : null),
      exp: s.exp,
      number: s.number,
      height: s.height, weight: s.weight, college: s.college,
      status: s.status,
      injury: s.injury || (inj ? inj.item.status : null),
      injuryBody: s.injuryBody || (inj ? inj.item.type : null),
      injuryNote: (inj ? inj.item.comment : null) || s.injuryNotes || null,
      depth: s.depth, depthPos: s.depthPos,
      headshot: nvp ? nvp.headshot : null,
      draftYear: nvp ? nvp.draftYear : null,
      draftRound: nvp ? nvp.draftRound : null,
      draftPick: nvp ? nvp.draftPick : null,
      rookie: nvp && nvp.rookieSeason === season,

      /* --- markadurinn: THRJU ADP, ekki eitt --- */
      adpSleeper: proj ? proj.adpPpr : null,
      adpSleeperHalf: proj ? proj.adpHalf : null,
      adpSleeperStd: proj ? proj.adpStd : null,
      adpEspn: esp ? esp.adp : null,
      adpFfc: ffc,
      auctionEspn: esp ? esp.auction : null,
      ownedEspn: esp ? esp.owned : null,
      startedEspn: esp ? esp.started : null,

      /* --- spar (ohadar hver annarri) --- */
      projSleeper: proj ? proj.ppr : null,
      projSleeperHalf: proj ? proj.half : null,
      projSleeperStd: proj ? proj.std : null,
      projSleeperVol: proj ? {
        patt: proj.patt, pyd: proj.pyd, ptd: proj.ptd, pint: proj.pint,
        car: proj.car, ryd: proj.ryd, rtd: proj.rtd,
        tgt: proj.tgt, rec: proj.rec, recyd: proj.recyd, rectd: proj.rectd,
        gp: proj.gp,
      } : null,
      projEspn: esp ? esp.projPts : null,

      /* --- serfraedingar --- */
      ecr: ecrRow ? ecrRow.ecr : null,
      ecrTier: ecrRow ? ecrRow.tier : null,
      ecrSd: ecrRow ? ecrRow.sd : null,
      ecrBest: ecrRow ? ecrRow.best : null,
      ecrWorst: ecrRow ? ecrRow.worst : null,
      ecrPosRank: ecrRow ? ecrRow.posRank : null,
      /* Per snid — sja notuna vid `ecrIdxByScoring`. */
      ecrByScoring: Object.keys(ecrByScoring).length ? ecrByScoring : null,
      bye: ecrRow ? ecrRow.bye : null,

      /* --- markadssveiflur --- */
      trendAdd: addBySleeper.get(s.sleeperId) ?? null,
      trendDrop: dropBySleeper.get(s.sleeperId) ?? null,

      /* --- PORUNIN SJALF, SYNILEG --- */
      matchedVia: { nflverse: viaNv, espn: viaEs, fp: viaFp },
    });
  }

  /* Sia: leikmenn sem hvorki markadurinn ne serfraedingar tha nefna
     eru ekki draftadir og thynna adeins ut allt sem birtist.
     VIDMIDID ER SAMSETT VILJANDI — einn maelikvardi einn (t.d. adeins
     ECR) myndi henda ollum sem FantasyPros hefur ekki tekid inn enn,
     og thad eru einmitt nyliðarnir sem skipta mali i agust. */
  const kept = out.filter((p) =>
    p.ecr != null || p.adpSleeper != null || p.adpEspn != null ||
    Object.keys(p.adpFfc).length > 0 || p.projSleeper != null ||
    (p.ownedEspn != null && p.ownedEspn >= 1) ||
    (p.trendAdd != null && p.trendAdd > 500));

  record("join_players", true,
    `${kept.length} of ${stats.total}; gsis ${stats.gsis}, espn ${stats.espn}, ` +
    `fp ${stats.fp}, ffc ${stats.ffc}, name matches ${stats.byName}`);

  return kept;
}

/* ============================================================
   THREP 2 — SAGAN (sannleiksgildid)
   ============================================================ */

async function stageHistory() {
  console.log("\n=== SAGA ===");

  const years = historyYears();
  const current = years[years.length - 1];
  console.log(`  ar: ${years[0]}-${current}`);
  const weekly = await nv.weeklyStats(years);
  const teamWeekly = await nv.teamWeekly(years.filter((y) => y >= 2020));

  /* SNAP-HLUTFOLL SAMEINUD INN I VIKULEGU RADIRNAR. */
  await mergeSnapCounts(weekly, years);

  /* Vikuleg gogn eru skrifud PER TIMABIL. Ein 7-ara skra vaeri
     ~12 MB og appid tharf nanast alltaf adeins sidasta arid. */
  let totalRows = 0;
  for (const [yr, rows] of Object.entries(weekly)) {
    if (!rows || !rows.length) continue;
    totalRows += rows.length;
    await writeJson(`weekly/${yr}.json`, rows,
      { minRows: weeklyMinRows(yr, current) });
  }

  /* Timabils-summur — thetta er thad sem bakprofid og "i fyrra"
     dalkarnir lesa, og thad er lítið nog til ad senda i heilu lagi. */
  const seasons = seasonAggregates(weekly);
  await writeJson("seasons.json", seasons, { minRows: 1000 });

  /* Vorn gegn stodu — NFL-hlidstaedan vid FFDR. */
  const dvp = defenseVsPosition(weekly);
  await writeJson("defense.json", dvp, { minRows: 30 });

  /* Lidshradi og sendihlutfall. */
  await writeJson("team_form.json", teamAggregates(teamWeekly), { minRows: 30 });

  record("history", true,
    `${totalRows} player weeks across ${Object.keys(weekly).length} seasons ` +
    `(${years[0]}-${current})`);
  return { weekly, seasons };
}

/* ============================================================
   SNAP-HLUTFOLL — "OEDYRASTA EINSTAKA BAETINGIN A MAELINGUNNI"
   ============================================================
   `nv.snapCounts` var til og var **aldrei kallad**. Hun er sameinud inn i
   `weekly/{ar}.json` fremur en skrifud i eigin skra, og thad er akvordun:
   `usage-lab`, `handcuff-lab` og `gap-lab` lesa OLL vikulegu radirnar, og
   heimild sem tharf serstakan lestur og eigin porun er heimild sem
   labbid sleppir. Sama rok og "svid sem enginn les".

   HVERS VEGNA THETTA SVARAR SPURNINGU SEM STIGIN GERA EKKI:
   `gap-lab` raðadi lyftistongunum **availability -> HLUTVERK -> vorn**, og
   `usage-lab` sagdi berum orðum ad "hlutverk ER notkun". Snap-hlutfall er
   hreinasti maelirinn a hlutverk sem til er: leikmadur sem fer ur 35% i
   75% af snoppum hefur nytt hlutverk ADUR en stigin hans syna thad, og
   hann er osynilegur i `tgt`/`car` thangad til bolturinn kemur.

   ============================================================
   BRUIN ER `pfr_player_id`, OG HUN VAR MAELD ADUR EN THETTA VAR SKRIFAD
   ============================================================
   Snap-skrarnar bera **PFR-audkenni** ("BankKe01"); vikulegu radirnar
   bera **gsis** ("00-0034381"). `nv.players()` ber BADI i somu rod, svo
   brun er til og NAFNA-PORUN ER OTHORF — sem er reglan i thessu repo-i
   (nafna-porun villti "Jacob og Alex Murphy" i FPL-verkefninu).

   MAELT 14.8.2026 a 2025:
     26.612 snap-radir · 2.189 einkvaem PFR-audkenni
     **2.181 leyst um bruna (99,6%)**
     **6.624 af 6.638 vikulegum rodum audgadar (99,8%)**
     14 radir eftir (9 WR, 4 RB, 1 QB) — their bera einfaldlega enga
     snap-rod og fa **null, ekki 0** (NULL ER EKKI NULL: snap-hlutfall 0
     thydir "spiladi ekki eitt snapp", sem er allt annad en "vantar").

   ============================================================
   TOM SOKN MA ALDREI THURRKA UT GOD GOGN — OG HER VAR RAUNVERULEG HAETTA
   ============================================================
   `snap_counts_2026.csv` er **404** (maelt 14.8.2026; hvorki .csv ne .csv.gz
   er til fyrr en fyrsti leikur er spiladur). Fallid skilar tha `[]`, og
   utfaerslan hér **laetur radirnar OSNERTAR** i thvi tilfelli i stad thess
   ad skrifa `snaps: null` yfir tholu. Thad er ekki tilgata: skrifudum vid
   null-svid i hverja rod myndi keyrslan i naestu viku **eyda** snoppunum
   sem su a undan hafdi sott, um leid og GitHub skilaði 404 i eitt skipti.  */
async function mergeSnapCounts(weekly, years) {
  let bridge;
  try {
    const players = await nv.players();
    bridge = new Map();
    for (const p of players) if (p.pfrId && p.id) bridge.set(p.pfrId, p.id);
  } catch (e) {
    record("snap_merge", false,
      `bridge unavailable (${e.message}) — weekly rows left untouched`);
    return;
  }
  if (bridge.size < 1000) {
    record("snap_merge", false,
      `bridge has only ${bridge.size} pfr ids — refusing to enrich on a thin bridge`);
    return;
  }

  let enriched = 0, seen = 0, skipped = [];
  for (const yr of years) {
    const rows = weekly[yr];
    if (!rows || !rows.length) continue;
    const snaps = await nv.snapCounts(yr);
    /* HLIDID: engin snap-rod -> ARID ER SLEPPT OSNERT. Sja notuna. */
    if (!snaps.length) { skipped.push(yr); continue; }

    const byKey = new Map();
    for (const s of snaps) {
      const g = bridge.get(s.pfrId);
      if (!g || s.week == null) continue;
      byKey.set(`${g}|${s.week}`, s);
    }
    /* ============================================================
       HLIDID VAR ALGILT OG THVI NANAST ALDREI VIRKT (LAGAD 19.8.2026)
       ============================================================
       Hér stod `byKey.size < 100`. MAELT a ollum sjo arum er `byKey.size`
       **23.829-26.573**, svo hlidid la vid ~0,4% af raunverulegri staerd
       og gat i verki ekki fallid.

       OG THAD VAR RAUNVERULEG HAETTA THVI LYKKJAN NEDAN SKRIFAR `null`
       YFIR HVERJA ROD SEM EKKI PARAST. Halfsott snap-skra (t.d. 3.000 af
       26.500 rodum) hefdi thvi stadist hlidid og skrifad **null yfir
       ~3.600 vikulegar radir sem baru raunverulegar tolur** — nakvaemlega
       "tom sokn thurrkar ut god gogn", i sama falli sem er skrifad gegn
       thvi (sja notuna vid `mergeSnapCounts`).

       MAELT 19.8.2026 — HLUTFALLIÐ ER HLIDID, OG THAD ER TALIÐ A ThVI SEM
       RAUNVERULEGA GERIST (pordu radirnar), ekki a staerd snap-skrarinnar:
         ar    vikulegar   snap-radir   parast   %
         2019       6.040      23.862    6.034   99,9
         2020       6.181      24.999    6.177   99,9
         2021       6.529      26.468    6.523   99,9
         2022       6.463      26.381    6.462  100,0
         2023       6.440      26.540    6.434   99,9
         2024       6.478      26.615    6.472   99,9
         2025       6.651      26.612    6.637   99,8
       Heilbrigt ar er ThVI 99,8-100,0%. Golfid 0,90 er **tiu prosentustig
       undir laegsta maelda ari** (svo eðlilegt flokt fellir thad ekki) og
       **langt yfir halfri skra** (~50%), sem er tilfellid sem thad er til
       ad stodva.

       ThAD ER TALIÐ A `rows.length` — SAMA ARI — OG EKKI A FYRRA ARI.
       Uttektin bad um "hlutfall af fyrra ari"; thad vaeri RANGT hér og af
       nakvaemlega theirri astaedu sem `weeklyMinRows` er til: vika 1 ber
       ~390 radir, svo hlutfall gegn loknu ari (6.600) hefdi HAFNAD fyrstu
       vikunum — einmitt thegar notkun-til-thessa er thad eina sem er til.
       Bædi taljarinn og nefnarinn eru vikuskordud, svo hlutfallid heldur
       i viku 1 alveg eins og i viku 18.

       TALIÐ A UNDAN SKRIFUM. Fyrri utgafan skrifadi i somu lykkju og
       taldi, svo hun gat ekki hafnad eftir a. Nu er thurr-talning fyrst.  */
    const SNAP_FLOOR = 0.90;
    let dry = 0;
    for (const r of rows) if (byKey.get(`${r.id}|${r.week}`)) dry++;
    const rate = rows.length ? dry / rows.length : 0;
    if (rate < SNAP_FLOOR) {
      record(`snap_merge_${yr}`, false,
        `only ${dry}/${rows.length} rows (${(100 * rate).toFixed(1)}%) match the ` +
        `snap file, floor is ${(100 * SNAP_FLOOR).toFixed(0)}% — ${yr} left untouched ` +
        `(writing would null ${rows.length - dry} rows that may hold real snaps)`);
      skipped.push(yr);
      continue;
    }
    let hit = 0;
    for (const r of rows) {
      seen++;
      const s = byKey.get(`${r.id}|${r.week}`);
      /* Rod an snap-gagna faer null, EKKI 0. */
      r.snaps = s ? s.snaps : null;
      r.snapPct = s ? s.pct : null;
      if (s) { hit++; enriched++; }
    }
    record(`snap_merge_${yr}`, true,
      `${hit}/${rows.length} weekly rows carry snaps ` +
      `(${((100 * hit) / rows.length).toFixed(1)}%)`);
  }
  record("snap_merge", true,
    `${enriched} of ${seen} player weeks enriched via pfr_player_id bridge ` +
    `(${bridge.size} ids)` +
    (skipped.length ? `; no snap file for ${skipped.join(", ")} (left untouched)` : ""));
}

/**
 * Timabils-summur per leikmann. Skilar LIKA `ppg` og `games`, thvi
 * summa ein og ser refsar theim sem meiddist — og thad er nakvaemlega
 * spurningin sem draft-notandinn er ad spyrja: "hversu godur er hann
 * THEGAR HANN SPILAR" a moti "hversu mikid gaf hann i heild".
 * Baedi eru rett svor vid SITTHVORRI spurningunni.
 */
function seasonAggregates(weekly) {
  const out = [];
  for (const [yr, rows] of Object.entries(weekly)) {
    const by = new Map();
    for (const r of rows) {
      let a = by.get(r.id);
      if (!a) {
        a = { id: r.id, name: r.name, pos: r.pos, season: Number(yr), team: r.team,
              g: 0, ppr: 0, half: 0, std: 0, tgt: 0, rec: 0, recy: 0, rectd: 0,
              car: 0, ry: 0, rtd: 0, att: 0, py: 0, ptd: 0, int: 0, ay: 0,
              tshareSum: 0, tshareN: 0, woprSum: 0, woprN: 0, best: 0, weeks: [] };
        by.set(r.id, a);
      }
      a.g++;
      a.team = r.team;
      for (const k of ["ppr", "half", "std", "tgt", "rec", "recy", "rectd",
                       "car", "ry", "rtd", "att", "py", "ptd", "int", "ay"]) {
        a[k] += r[k] || 0;
      }
      if (r.tshare != null) { a.tshareSum += r.tshare; a.tshareN++; }
      if (r.wopr != null) { a.woprSum += r.wopr; a.woprN++; }
      if (r.ppr > a.best) a.best = r.ppr;
      a.weeks.push(Math.round(r.ppr * 10) / 10);
    }
    for (const a of by.values()) {
      a.ppg = r2(a.ppr / a.g);
      a.ppgHalf = r2(a.half / a.g);
      a.ppgStd = r2(a.std / a.g);
      a.tshare = a.tshareN ? r3(a.tshareSum / a.tshareN) : null;
      a.wopr = a.woprN ? r3(a.woprSum / a.woprN) : null;
      /* Jofnudur: hlutfall vikna yfir stodu-throskuldi. Sama hugsun og
         "Aron-stuðull" i FPL-appinu — en hér er hann MAELDUR gegn
         raunverulegum start-throskuldi, ekki valinn. */
      a.boom = a.weeks.filter((w) => w >= BOOM[a.pos]).length;
      a.bust = a.weeks.filter((w) => w < BUST[a.pos]).length;
      a.ppr = r2(a.ppr); a.half = r2(a.half); a.std = r2(a.std);
      a.recy = r1(a.recy); a.ry = r1(a.ry); a.py = r1(a.py); a.ay = r1(a.ay);
      delete a.tshareSum; delete a.tshareN; delete a.woprSum; delete a.woprN;
      out.push(a);
    }
  }
  return out;
}

/* MAELD THREP, ekki valin. `scripts/calibrate.mjs` reiknar thau
   ur dreifingu VIKNA HJA THEIM SEM ERU RAUNVERULEGA I BYRJUNARLIDI
   (topp 12 QB / 24 RB / 36 WR / 12 TE hverja viku, 2020-2025):
   boom = 85. hundradshluti, bust = 25. hundradshluti.

   FYRSTA UTGAFAN AGISKADI OG VAR LANGT UNDIR — QB-boom var sett 24
   thar sem maelda talan er 30, og RB-boom 20 thar sem hun er 25.
   Med theim tolum hefdi "boom"-dalkurinn talid venjulega gooda viku
   sem sprengingu og talan hefdi verid merkingarlaus. */
const BOOM = { QB: 30, RB: 25, WR: 24, TE: 21, K: 12 };
const BUST = { QB: 20, RB: 14, WR: 13, TE: 12, K: 4 };

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;

/**
 * VORN GEGN STODU. Hlidstaedan vid FFDR — en NFL kallar a adra
 * byggingu en fotboltinn af einni astaedu sem skiptir ollu:
 * i FPL er andstaedingurinn 1 af 19 og timabilid 38 leikir; hér er
 * hann 1 af 31 og timabilid 17 leikir. URTAKID ER HELMINGI MINNA
 * og hávaðinn thvi miklu staerri.
 *
 * Thess vegna er talan SKREPPT ad deildarmedaltali med
 * James-Stein-lagi threpi: `w = n / (n + K)`. K er MAELT i
 * `tests/nfl-defense.mjs` — ekki valid.
 */
function defenseVsPosition(weekly) {
  const rows = [];
  for (const [yr, wk] of Object.entries(weekly)) {
    const by = new Map();          // team|pos -> { pts, n }
    for (const r of wk) {
      if (!r.opp) continue;
      const k = `${r.opp}|${r.pos}`;
      const a = by.get(k) || { team: r.opp, pos: r.pos, pts: 0, n: 0, games: new Set() };
      a.pts += r.ppr; a.n++; a.games.add(r.week);
      by.set(k, a);
    }
    /* Deildarmedaltal per stodu — vidmidid sem skrepping stefnir ad. */
    const leagueByPos = new Map();
    for (const a of by.values()) {
      const l = leagueByPos.get(a.pos) || { pts: 0, g: 0 };
      l.pts += a.pts; l.g += a.games.size;
      leagueByPos.set(a.pos, l);
    }
    for (const a of by.values()) {
      const g = a.games.size;
      const l = leagueByPos.get(a.pos);
      const leagueMean = l.g ? l.pts / l.g : 0;
      const raw = g ? a.pts / g : null;
      const K = 6;                 // MAELT — sja tests/nfl-defense.mjs
      const w = g / (g + K);
      rows.push({
        season: Number(yr), team: a.team, pos: a.pos, games: g,
        raw: raw != null ? r2(raw) : null,
        adj: raw != null ? r2(w * raw + (1 - w) * leagueMean) : null,
        leagueMean: r2(leagueMean),
      });
    }
  }
  return rows;
}

/** Lidshradi, sendihlutfall og soknar-EPA — inntak i vikulega likanid. */
function teamAggregates(teamWeekly) {
  const out = [];
  for (const [yr, rows] of Object.entries(teamWeekly)) {
    const by = new Map();
    for (const r of rows) {
      const a = by.get(r.team) || { season: Number(yr), team: r.team, g: 0,
        patt: 0, car: 0, pyd: 0, ryd: 0, ptd: 0, rtd: 0, pepa: 0, repa: 0 };
      a.g++;
      for (const k of ["patt", "car", "pyd", "ryd", "ptd", "rtd", "pepa", "repa"]) {
        a[k] += r[k] || 0;
      }
      by.set(r.team, a);
    }
    for (const a of by.values()) {
      a.plays = r1((a.patt + a.car) / a.g);
      a.passRate = a.patt + a.car ? r3(a.patt / (a.patt + a.car)) : null;
      a.pattPg = r1(a.patt / a.g);
      a.carPg = r1(a.car / a.g);
      a.epaPlay = a.patt + a.car ? r3((a.pepa + a.repa) / (a.patt + a.car)) : null;
      out.push(a);
    }
  }
  return out;
}

/* ============================================================
   THREP 3 — SERFRAEDINGARNIR
   ============================================================ */

async function stageExperts(season) {
  console.log("\n=== SERFRAEDINGAR ===");

  const [accDraft, accWeekly] = await Promise.all([
    fp.accuracy("draft").catch((e) => { record("fp_accuracy_draft", false, e.message); return []; }),
    fp.accuracy("weekly").catch(() => []),
  ]);
  const acc = accDraft;

  /* ============================================================
     FERILLINN, EKKI SIDASTA AR.
     ============================================================
     `accDraft` er EITT ar. Ad velja skorpu-hopinn ur thvi einu var
     maelt (`expert-persistence.mjs`): rod serfraedinga flyst milli
     ara med rho 0,370, svo eitt ar er veikur valari — sa sem var
     efstur i fyrra er oft midlungs i ar. Mælda reglan er MIDGILDI
     percentila yfir >= 4 ar OG ad hann se enn ad birta.

     Thess vegna er sagan sott lika. Timabil sem er lokid breytist
     aldrei, svo thetta eru odyr kollum sem skila alltaf thvi sama —
     en their eru sottir i hverri keyrslu thvi skrain er endurmyndud
     i heild og ma ekki reka i sundur vid hana. */
  const accHistory = {};
  for (let y = season - 11; y < season; y++) {
    const rows = await fp.accuracy("draft", { year: y }).catch(() => []);
    /* Ar sem skilar engu er SLEPPT, ekki skrifad tomt: tomt ar i
       sogunni liti ut eins og "enginn birti thetta ar". */
    if (rows.length) accHistory[y] = rows.map((r) => ({ id: r.fpExpertId, r: r.overall }));
  }
  console.log(`  ferill: ${Object.keys(accHistory).length} ar af nakvaemni`);

  /* Serfraedingalistinn kemur ur ECR-sidunni (hun ber `experts`-fylkid)
     og nakvaemnissidan baetir vid theim sem eru ekki med draft-bord.
     Sameinad mengi svo vid missum ekki af neinum. */
  const ecr = await fp.ecrPage("ppr-cheatsheets").catch(() => null);
  const ids = new Set([
    ...(ecr ? ecr.experts : []),
    ...acc.map((a) => a.fpExpertId),
  ].filter(Boolean));

  console.log(`  ${ids.size} serfraedinga-audkenni ad reyna`);

  /* Bord thessa ars — thad sem notandinn draftar eftir. */
  const now = await fp.expertBoards([...ids], { year: season, scoring: "PPR" });

  /* Bord SIDASTA ars — thad sem vid getum MAELT. Thetta er eina
     leidin ad svarinu "hver er klarastur" sem er okkar eigin. */
  const prev = await fp.expertBoards([...ids], { year: season - 1, scoring: "PPR" });

  const consensusNow = await fp.consensus({ year: season, scoring: "PPR" })
    .catch(() => null);

  /* ============================================================
     `minRows: 1` VAR ENGIN HLID — REGLAN GILTI UM ALLAR SKRAR NEMA
     ThESSA (lagfaert 21.8.2026)
     ============================================================
     "Tom keyrsla ma aldrei thurrka ut god gogn" er vordud a
     market/news/ecr/players/teams/schedule/adp med maeldum golfum.
     `experts.json` — 4,1 MB og staersta skrain i settinu — bar
     `minRows: 1`, sem er thad sama og ekkert.

     OG ThAD ER VERRA EN ThAD LITUR UT FYRIR, ThVI `rowCount` FELLUR I
     LYKLAFJOLDA A TOMUM FARMI. Falli FantasyPros alveg (allar fjorar
     leidirnar eru SAMI hostur) verdur farmurinn
       { season, accuracy: [], accuracyWeekly: [], accuracyHistory: {},
         boards: [], boardsPrev: [], consensus: null, generated }
     og `rowCount` skilar **8** — atta LYKLUM, ekki atta rodum. 8 >= 1,
     svo skrifin voru heimil og 4,1 MB af bordum, nakvaemnissogu og
     samsteypu hefdu verid skrifud i tomt. Nakvaemlega sama gildra og
     `market.json` 9.8.2026 ("rod er farmur, ekki umbudir"), i einu
     skranni thar sem golfid var ekki maelt.

     GOLFID ER MAELT, EKKI VALID (21.8.2026 a lifandi skra):
       allur farmurinn             508
       tomur farmur (lyklafjoldi)    8
       minnsti EINSTAKI hluti sem lifir ef hinir falla:
         accuracy (draft-sidan)    215
         accuracyHistory (11 ar)   215  (per ar)
         boards 2026              ~300  (radir i einu bordi)
         consensus                 520
     Minnsta gilda utkoma er thvi ~215. `minRows: 100` skilur eftir
     tvofalda syn nedan vid hana og felur atta-lykla-tilfellid langt
     undir sig. Vordur: `tests/pipeline.mjs` (CASES).            */
  await writeJson("experts.json", {
    season,
    accuracy: acc,              // DRAFT-nakvaemni — rett maeling fyrir draft
    accuracyWeekly: accWeekly,  // vikuleg nakvaemni — onnur spurning
    accuracyHistory: accHistory,// { ar: [{id, r}] } — valid byggir a THESSU
    boards: compactBoards(now),
    boardsPrev: compactBoards(prev),
    consensus: consensusNow,
    generated: new Date().toISOString(),
  }, { minRows: 100 });

  record("experts", now.length > 0,
    `${now.length} boards ${season}, ${prev.length} boards ${season - 1}, ` +
    `${acc.length} accuracy scores, ${Object.keys(accHistory).length} history seasons`);

  return { now, prev, acc };
}

/**
 * Thjappar bordum: { fpId: rank } i stad fylkis af hlutum.
 * 90 serfraedingar × 300 leikmenn × 6 svid vaeri ~3 MB; thetta er
 * ~600 KB. Nofnin eru THEGAR i `players.json` — ad geyma thau aftur
 * 90 sinnum er hrein tvitekning.
 */
function compactBoards(boards) {
  return boards.map((b) => ({
    id: b.fpExpertId, year: b.year, updated: b.updated,
    n: b.ranks.length,
    ranks: Object.fromEntries(b.ranks.map((r) => [r.fpId, r.rank])),
    names: Object.fromEntries(b.ranks.map((r) => [r.fpId, r.name])),
  }));
}

/* ============================================================
   KEYRSLA
   ============================================================ */


/* ============================================================
   THREP: ADP EITT OG SER — LETT, SVO HAEGT SE AD KEYRA THAD OFT
   ============================================================
   ADP HREYFIST DAGLEGA I AGUST og bord sem er tolf klukkustunda
   gamalt i draftviku er ekki nogu ferskt. En `core` er thungt: thad
   saekir 11.000 Sleeper-leikmenn, 1,5 milljon rada audkennisbru,
   ESPN-laugina, ECR-sidur og markadslinur. Ad keyra thad a thriggja
   tima fresti vaeri odonaskapur vid heimildirnar og haegt ad auki.

   ÞETTA THREP SNERTIR ADEINS ADP: fimm HTTP-koll (FFC-settin og
   Sleeper-spa/ADP), og thad SKRIFAR OFAN I `players.json` sem er
   thegar til — endurbyggir ekki poruninna. Thad ma thvi keyra oft.

   REGLAN "TOM KEYRSLA MA ALDREI THURRKA UT GOD GOGN" GILDIR HER LIKA
   og hun er strangari: thad ma ekki heldur SKRIFA HALFA UPPFAERSLU.
   Fai faerri en 100 leikmenn nytt ADP er engu breytt og thad er skrad.
   ============================================================ */
async function stageAdp() {
  console.log("\n=== ADP ===");
  const players = await readJson("players.json");
  if (!Array.isArray(players) || players.length < 300) {
    record("adp_stage", false,
      "players.json missing or too small — run --stage=core first");
    return;
  }
  const meta = await readJson("meta.json");
  const season = (meta && meta.season) || new Date().getFullYear();

  const [ffcSets, sleeperProj] = await Promise.all([
    ad.ffcAll(season),
    sl.projections(season).catch((e) => { record("sleeper_proj_adp", false, e.message); return null; }),
  ]);
  if (!ffcSets || !ffcSets.length) {
    record("adp_stage", false, "no FFC sets returned — leaving players.json untouched");
    return;
  }

  /* Map a `sleeperId`, EINS OG I `stageCore`. Sja notuna vid notkunina
     nedar: fylkis-visitala gaf spyrnumanni ADP 5,7 og thagdi um hina. */
  const projBySleeper = Array.isArray(sleeperProj)
    ? new Map(sleeperProj.filter((x) => x && x.sleeperId != null)
        .map((x) => [String(x.sleeperId), x]))
    : null;

  /* Porun a NAFNI innan stodu OG lids, eins og i `joinPlayers`. Vid
     endurbyggjum ekki bruna — hun breytist ekki milli klukkustunda. */
  const ffcIdx = {};
  for (const set of ffcSets) ffcIdx[set.scoring] = buildIndexes(set.players);

  let touched = 0;
  for (const p of players) {
    const next = {};
    for (const [key, idx] of Object.entries(ffcIdx)) {
      const m = matchByName(idx, p.name, p.pos, p.team);
      if (m) {
        next[key] = { adp: m.item.adp, sd: m.item.sd, high: m.item.high,
                      low: m.item.low, times: m.item.times };
      }
    }
    if (Object.keys(next).length) { p.adpFfc = next; touched++; }
    if (projBySleeper) {
      /* ============================================================
         TVAER VILLUR I THESSUM FJORUM LINUM, BADAR THOGULAR
         ============================================================
         Adur stod:
             const sp = sleeperProj[p.id] || sleeperProj[String(p.id)];
             if (sp.adp != null) p.adpSleeper = sp.adp;

         (1) `sl.projections()` SKILAR FYLKI, ekki ordabok a
             Sleeper-audkenni. `sleeperProj[p.id]` er thvi VISITALA i
             fylkid. `stageCore` gerir thetta RETT (`new Map(...)` a
             linu 300) — thessi stadur gerdi thad ekki.

             MAELT 12.8.2026 gegn lifandi API: fylkid er 3.300 radir, svo
             77 af 1.043 leikmonnum eiga audkenni sem LENDIR INNAN thess,
             og 5 theirra hefdu fengid ADP fra OSKYLDUM manni:

               Matt Prater  (id 17,  41 ara spyrnumadur) <- Christian
                                          McCaffrey, half-ADP 5,7
               Joe Flacco   (id 19)  <- Jaxon Smith-Njigba, 7,3
               Marcedes Lewis (id 111) <- Khalil Shakir, 130,4
               Frank Gore   (id 232) <- Dylan Sampson, 151,5
               Josh Johnson (id 260) <- David Njoku, 172

             Spyrnumadur med ADP 5,7 i half-PPR-deild er ekki namundun
             heldur toppval i sjottu umferd. Hinir 966 fengu `undefined`
             og thogdu — thess vegna sast thetta aldrei.

         (2) SVIDID HEITIR `adpPpr`, EKKI `adp`. `sp.adp` er thvi ALDREI
             til (stadfest: `'adp' in row === false`), svo
             `p.adpSleeper = sp.adp` HEFUR ALDREI KEYRT. Sleeper-blokkin
             hér skrifadi thvi ekkert rett og fimm hluti rangt.

         Porun er nu a `sleeperId` gegnum Map, eins og i `stageCore`, og
         svidaheitin eru thau sem heimildin sendir. Vordur:
         `pipeline.mjs` — half/std ADP verdur ad vera i somu staerdargrod
         og PPR-ADP fyrir sama mann, sem fellur a fylkis-visitolu.      */
      const sp = projBySleeper.get(String(p.id));
      if (sp) {
        if (sp.adpPpr != null) p.adpSleeper = sp.adpPpr;
        if (sp.adpStd != null) p.adpSleeperStd = sp.adpStd;
        if (sp.adpHalf != null) p.adpSleeperHalf = sp.adpHalf;
      }
    }
  }

  if (touched < 100) {
    record("adp_stage", false,
      `only ${touched} players matched — refusing to write a half update`);
    return;
  }
  await writeJson("players.json", players, { minRows: 300 });
  await writeJson("adp.json", {
    season, ffc: ffcSets, generated: new Date().toISOString(),
  }, { minRows: 100 });
  /* ============================================================
     ADP-SNAPSHOTID ER LIKA HER, OG THAD ER EKKI TVITEKNING
     ============================================================
     `adp-history/{dagur}.json` er skrifud i BADUM threpum. Astaedan er
     cron-id: i agust-september keyrir `--stage=adp` a **00, 03, 06, 12,
     15, 18 UTC** en `core` adeins kl. 09. Vaeri vistunin adeins i `core`
     tapadist dagurinn i hvert sinn sem 09-keyrslan brysti, thott ADP
     hefdi verid sott sex sinnum sama dag.

     `writeOnce` er ONEMANDI a skra sem er til, svo thetta er ekki
     kapphlaup: fyrsta keyrsla dagsins (00:00 UTC) skrifar, thaer fimm
     sem eftir eru gera ekkert. Ad tvaer kallstadir bendi a sama fall er
     ODYRARA en ad daginn vanti.                                       */
  try {
    await writeOnce(`adp-history/${today()}.json`, {
      date: today(), captured: new Date().toISOString(), season,
      ffc: ffcSets,
    }, { minRows: 100 });
  } catch (e) { record("archive:adp-history", false, `failed: ${e.message}`); }
  record("adp_stage", true, `${touched} players refreshed from ${ffcSets.length} FFC sets`);
}

async function main() {
  const t0 = Date.now();
  console.log(`NFL-pipeline — threp: ${STAGE}`);
  await mkdir(OUT, { recursive: true });

  let season = new Date().getFullYear();

  if (want("core")) {
    const r = await stageCore();
    season = r.season;
  } else {
    const m = await readJson("meta.json");
    if (m && m.season) season = m.season;
  }

  if (want("adp")) await stageAdp();
  if (want("history")) await stageHistory();
  if (want("experts")) await stageExperts(season);

  /* ---- HEIMILDASKRAIN — SAMEINUD YFIR THREP, EKKI YFIRSKRIFUD ----

     ÞREPIN ERU KEYRD HVERT I SINU LAGI (`core` daglega, `history`
     handvirkt, `experts` nokkrum sinnum i viku). Fyrsta utgafan
     skrifadi `status.json` upp a nytt i hverri keyrslu, svo eftir
     `--stage=experts` bar skrain ADEINS serfraedinga-heimildirnar —
     allar hinar 20 HURFU UR YFIRLITINU tho gognin theirra vaeru
     fersk a disknum.

     Thad er nakvaemlega su thogla bilun sem skrain er til ad hindra:
     notandinn hefdi sed "6 heimildir i lagi" og ekki tekid eftir ad
     ADP-heimildin var ekki einu sinni a listanum. Profid i
     `tests/nfl-pipeline.mjs` kafla 6 greip thetta.

     Nu er fyrra astand LESID og radir sameinadar a heiti. Radir sem
     thetta threp snerti EKKI halda ser og bera `stale: true` asamt
     thvi hve gamlar thaer eru — thaer eru upplysingar, ekki bilun. */
  const report = sourceReport();
  const prev = (await readJson("status.json")) || {};
  const byName = new Map((prev.sources || []).map((s) => [s.name, { ...s, stale: true }]));
  for (const r of report) byName.set(r.name, { ...r, stage: STAGE, stale: false });
  const merged = [...byName.values()];

  await writeJson("status.json", {
    generated: new Date().toISOString(),
    stage: STAGE,
    seconds: Math.round((Date.now() - t0) / 1000),
    ok: merged.filter((r) => r.ok).length,
    failed: merged.filter((r) => !r.ok).length,
    freshThisRun: report.length,
    sources: merged,
  });

  const bad = report.filter((r) => !r.ok);
  console.log(`\nLokid a ${Math.round((Date.now() - t0) / 1000)}s — ` +
    `${report.length - bad.length} i lagi, ${bad.length} brugdust`);
  if (bad.length) for (const b of bad) console.log(`  ! ${b.name}: ${b.note}`);
}

/* ============================================================
   `main()` ER SKILYRT — OG VORDURINN A ThVI ER EKKI SKRAUT
   ============================================================
   Hér stod `main()` OSKILYRT, svo HVER INNFLUTNINGUR keyrdi alla
   pipeline-una: oll netkollin, allan kvotann og skrif i `data/`. Thad
   var ekki oheppilegt heldur BINDANDI — hvert hreint fall inni i
   skranni var oprofanlegt nema med thvi ad endurrita thad i profinu,
   sem er nakvaemlega gildran sem `buildTeamMetrics` kostadi i
   FPL-verkefninu (handafrit skrifadi NaN a 17 lid og merkti thad sem
   maelingu). Sama lagfaering var gerd thar 21.8.2026.

   `realpathSync` a BADUM megin svo symlinkud eda afstaed slod thaggi
   hana ekki nidur.

   BILUN I ThESSU SKILYRDI VAERI ThOGUL: pipeline-an myndi ljuka a
   sekundubroti med utgangsstodu **0** og engum skrifum. Graen keyrsla
   sem gerir ekkert er verri utkoma en hrun — engin raud rod, og
   `data/` frystist thann dag. Vordur: `tests/pipeline.mjs` kafli
   „innflutningur keyrir ekki pipeline-una".                          */
const invokedDirectly = (() => {
  try {
    const self = realpathSync(fileURLToPath(import.meta.url));
    const argv = process.argv[1] ? realpathSync(process.argv[1]) : null;
    return argv != null && self === argv;
  } catch { return true; }   /* i vafa: hegdadu ther eins og adur */
})();

if (invokedDirectly) {
  main().catch((e) => {
    console.error("PIPELINE FELL:", e);
    process.exit(1);
  });
}
