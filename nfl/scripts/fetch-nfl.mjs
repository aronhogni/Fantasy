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

import { mkdir, writeFile, readFile } from "node:fs/promises";
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
const HISTORY = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

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

  return { season, players, games };
}

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

  const weekly = await nv.weeklyStats(HISTORY);
  const teamWeekly = await nv.teamWeekly(HISTORY.filter((y) => y >= 2020));

  /* Vikuleg gogn eru skrifud PER TIMABIL. Ein 7-ara skra vaeri
     ~12 MB og appid tharf nanast alltaf adeins sidasta arid. */
  let totalRows = 0;
  for (const [yr, rows] of Object.entries(weekly)) {
    if (!rows || !rows.length) continue;
    totalRows += rows.length;
    await writeJson(`weekly/${yr}.json`, rows, { minRows: 1000 });
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

  record("history", true, `${totalRows} player weeks across ${Object.keys(weekly).length} seasons`);
  return { weekly, seasons };
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

  await writeJson("experts.json", {
    season,
    accuracy: acc,              // DRAFT-nakvaemni — rett maeling fyrir draft
    accuracyWeekly: accWeekly,  // vikuleg nakvaemni — onnur spurning
    accuracyHistory: accHistory,// { ar: [{id, r}] } — valid byggir a THESSU
    boards: compactBoards(now),
    boardsPrev: compactBoards(prev),
    consensus: consensusNow,
    generated: new Date().toISOString(),
  }, { minRows: 1 });

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

main().catch((e) => {
  console.error("PIPELINE FELL:", e);
  process.exit(1);
});
