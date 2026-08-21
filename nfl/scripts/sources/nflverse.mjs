/* ============================================================
   nflverse.mjs — BURDARVIRKID i gagnaheiminum.

   nflverse-data er sjalfvirk utgafu-hirsla (GitHub Releases) med
   opinberum NFL-gognum: leikjaskra med VEDBANKALINUM, vikuleg
   leikmannafylki 2006->, snap-hlutfoll, dyptartoflur, meidsli,
   PFR-framhaldstolur og Next Gen Stats. Engir lyklar, enginn kvoti
   umfram venjulegan GitHub-hraдa.

   HVERS VEGNA THETTA ER GRUNNURINN OG EKKI SPA-HEIMILD:
   allar spa-heimildirnar (Sleeper, ESPN, FantasyPros) segja okkur
   hvad EINHVER HELDUR. nflverse segir okkur hvad GERDIST. Til ad
   svara spurningunni "hverjum er haegt ad treysta" tharf sannleiks-
   gildi, og thetta er thad eina i settinu sem er thad.

   ATH UTGAFU-HEITI: `player_stats`-utgafan er URELT og staednadi
   a 2024. Nuverandi er `stats_player` med `stats_player_week_YYYY`.
   Thetta var stadfest med konnun 9.8.2026 (player_stats_2025 = 404).
   ============================================================ */

import { getText, record, pool } from "../lib/http.mjs";
/* `rows` er flutt inn undir odru heiti VILJANDI: thrju foll hér inni
   skilgreina sina eigin `const rows`, og skuggi a innfluttu bindingu er
   loglegur en villandi fyrir thann sem les. */
import { objects, rows as csvRows, missingCols, num, num0, str } from "../lib/csv.mjs";
import { offensePoints, kickerPoints, normPos } from "../../src/scoring.js";
import { normTeam } from "../../src/names.js";

const REL = "https://github.com/nflverse/nflverse-data/releases/download";

/* ============================================================
   EIN SKILGREINING A "LES CSV OG SEGDU FRA ThVI SEM VANTAR"
   ============================================================
   Hvert fall hér ber lista af dalkaheitum. `objects()` sleppir thogult
   theim sem heimildin ber ekki lengur (sja notu vid `missingCols` i
   `lib/csv.mjs`) og thad hefur tvisvar gefid skra sem skradi sig `ok`
   medan hun var half eda tom.

   `parse()` gerir ThOGNINA AD RAUDRI ROD i `status.json`, en hun
   FELLIR EKKI KEYRSLUNA — og thad er akvordun, ekki hik:

     `tests/pipeline.mjs` er hlid a undan commit-inu i `nfl-data.yml`.
     21.8.2026 felldi EIN flokrandi fullyrding thrjar keyrslur i rod og
     thar med ALLT ADP a draftdegi. Vordur sem stoppar gogn af thvi ad
     ytri heimild endurnefndi dalk sem enginn les vaeri sama stiflan.

   Vidmidid er thvi: **drift verdur SYNILEG strax, og pipeline-id heldur
   afram med thad sem enn er nytilegt.** Fall sem TAPAR nytilegum gognum
   fellur afram a sinum eigin `record(..., false)` eins og adur
   (`depthCharts` skilar 0 rodum -> `ok: false`).

   `optional` ER LESID EN EKKI KRAFIST. Thad er fyrir dalk sem vid
   NOTUM ef hann er til en hofum MAELT ad vid tornum ekki an — annars
   yrdi Sources-flipinn med rauda rod ad eilifu fyrir dalk sem
   heimildin er buin ad taka ut viljandi, og "rautt sem hreinsast
   aldrei" kennir notandanum ad hunsa spjaldid.                      */
function parse(tag, txt, cols, optional = []) {
  const miss = missingCols(txt, cols);
  if (miss.length) {
    record(`schema:${tag}`, false,
      `source no longer carries ${miss.length} of ${cols.length} requested ` +
      `columns: ${miss.join(", ")}`);
  }
  return objects(txt, optional.length ? [...cols, ...optional] : cols);
}

/* Dalkarnir sem vid lesum ur vikulega fylkinu. Skrain er 140 dalkar
   og 8,5 MB; ad velja 40 sparar ~70% af minninu. Bættu vid hedan ef
   likanid tharf meira — EKKI lesa allt "til oryggis". */
const WEEK_COLS = [
  "player_id", "player_display_name", "position", "position_group",
  "season", "week", "season_type", "team", "opponent_team",
  "completions", "attempts", "passing_yards", "passing_tds",
  "passing_interceptions", "passing_air_yards", "passing_epa",
  "passing_2pt_conversions", "sack_fumbles_lost",
  "carries", "rushing_yards", "rushing_tds", "rushing_first_downs",
  "rushing_epa", "rushing_fumbles_lost", "rushing_2pt_conversions",
  "receptions", "targets", "receiving_yards", "receiving_tds",
  "receiving_air_yards", "receiving_first_downs", "receiving_epa",
  "receiving_fumbles_lost", "receiving_2pt_conversions",
  "racr", "target_share", "air_yards_share", "wopr",
  "special_teams_tds", "fumbles_lost_total", "fumble_recovery_tds",
  "fg_made_0_19", "fg_made_20_29", "fg_made_30_39", "fg_made_40_49",
  "fg_made_50_59", "fg_made_60_", "fg_missed", "pat_made", "pat_missed",
];

/**
 * Vikuleg leikmannafylki fyrir gefin timabil.
 * Skilar { season -> rows[] } med toldum fantasy-stigum i ollum
 * threm stigagjofum (ppr/half/std) svo appid thurfi ekki ad reikna
 * thau upp a nytt fyrir 100.000 radir i vafranum.
 */
export async function weeklyStats(seasons) {
  const out = {};
  await pool(seasons, 3, async (yr) => {
    try {
      const txt = await getText(`${REL}/stats_player/stats_player_week_${yr}.csv`);
      const raw = parse(`stats_player_week_${yr}`, txt, WEEK_COLS);
      const rows = [];
      for (const r of raw) {
        if (r.season_type !== "REG") continue;          // eftirkeppni er ekki fantasy
        const pos = normPos(r.position);
        if (!["QB", "RB", "WR", "TE", "K"].includes(pos)) continue;

        // Tolulegt afrit — CSV skilar strengjum og formulurnar
        // krefjast talna. `num` gerir "NA" ad null, ekki 0.
        const v = {};
        for (const k of WEEK_COLS) {
          v[k] = ["player_id", "player_display_name", "position", "position_group",
                  "season_type", "team", "opponent_team"].includes(k)
            ? str(r[k]) : num(r[k]);
        }
        v.position = pos;

        const ppr  = pos === "K" ? kickerPoints(v) : offensePoints(v, { ...BASE_PPR }, pos);
        const half = pos === "K" ? ppr : ppr - num0(v.receptions) * 0.5;
        const std  = pos === "K" ? ppr : ppr - num0(v.receptions) * 1.0;

        rows.push({
          id: v.player_id, name: v.player_display_name, pos,
          season: v.season, week: v.week,
          // LA/LAR og JAC/JAX eru BÆDI i nflverse-skranum eftir arum.
          // An samraemingar er "vorn gegn stodu" reiknud a TVO LID
          // fyrir Rams og hvorugt faer retta urtakid.
          team: normTeam(v.team), opp: normTeam(v.opponent_team),
          ppr: round2(ppr), half: round2(half), std: round2(std),
          att: v.attempts, py: v.passing_yards, ptd: v.passing_tds, int: v.passing_interceptions,
          car: v.carries, ry: v.rushing_yards, rtd: v.rushing_tds,
          tgt: v.targets, rec: v.receptions, recy: v.receiving_yards, rectd: v.receiving_tds,
          ay: v.receiving_air_yards, tshare: v.target_share, ayshare: v.air_yards_share,
          wopr: v.wopr, racr: v.racr,
          epa: v.receiving_epa != null || v.rushing_epa != null
            ? round2(num0(v.receiving_epa) + num0(v.rushing_epa) + num0(v.passing_epa)) : null,
        });
      }
      out[yr] = rows;
      record(`nflverse_week_${yr}`, true, `${rows.length} player weeks`);
    } catch (e) {
      record(`nflverse_week_${yr}`, false, `failed: ${e.message}`);
    }
  });
  return out;
}

const BASE_PPR = { passYd: 0.04, passTD: 4, passInt: -1, pass2pt: 2,
  rushYd: 0.1, rushTD: 6, rush2pt: 2, rec: 1, recBonusTE: 0, recYd: 0.1,
  recTD: 6, rec2pt: 2, fumbleLost: -2, fumbleRecTD: 6, specialTeamsTD: 6 };

const round2 = (x) => Math.round(x * 100) / 100;

/**
 * Leikjaskra + VEDBANKALINUR. `games.csv` ber `spread_line`,
 * `total_line` og peningalinur aftur til 1999 OG fram i timann um
 * leid og bokmakarar opna leikinn.
 *
 * ÞETTA ER STAERSTA EINSTAKA INNTAKID I VIKULEGA LIKANID.
 * Vaent stigaskor lids = total/2 - spread/2. Fantasy-framleidsla er
 * fyrst og fremst fall af thvi hve morg staeti lidid faer og hve oft
 * thad er i sokn — hvorutveggja les ur linunni.
 */
export async function schedule(seasons) {
  const txt = await getText(`${REL}/schedules/games.csv`);
  const all = parse("schedules/games", txt, [
    "game_id", "season", "game_type", "week", "gameday", "weekday", "gametime",
    "away_team", "home_team", "away_score", "home_score", "result", "total",
    "away_moneyline", "home_moneyline", "spread_line", "total_line",
    "away_rest", "home_rest", "roof", "surface", "temp", "wind", "stadium", "stadium_id",
  ]);
  const want = new Set(seasons);
  const games = all.filter((g) => want.has(num(g.season))).map((g) => ({
    id: g.game_id,
    season: num(g.season), week: num(g.week), type: g.game_type,
    date: str(g.gameday), time: str(g.gametime), weekday: str(g.weekday),
    away: str(g.away_team), home: str(g.home_team),
    awayScore: num(g.away_score), homeScore: num(g.home_score),
    // spread_line er ur SJONARHORNI HEIMALIDS og jakvaett = heimalid
    // er favorit. Thad er OFUGT vid amerisku skiltakonvensjonina og
    // hefur kostad villu i odrum verkefnum — thess vegna thessi nota.
    spread: num(g.spread_line), total: num(g.total_line),
    awayML: num(g.away_moneyline), homeML: num(g.home_moneyline),
    awayRest: num(g.away_rest), homeRest: num(g.home_rest),
    roof: str(g.roof), surface: str(g.surface),
    temp: num(g.temp), wind: num(g.wind),
    stadium: str(g.stadium), stadiumId: str(g.stadium_id),
  }));
  record("nflverse_schedules", true,
    `${games.length} games; ${games.filter((g) => g.total != null).length} with a line`);
  return games;
}

/** Snap-hlutfoll — besta einstaka maelistikan a hlutverk leikmanns. */
export async function snapCounts(season) {
  try {
    const txt = await getText(`${REL}/snap_counts/snap_counts_${season}.csv`);
    const rows = parse(`snap_counts_${season}`, txt, ["pfr_player_id", "player", "position", "team",
      "season", "week", "offense_snaps", "offense_pct"]);
    const out = rows.filter((r) => num(r.offense_snaps) != null).map((r) => ({
      pfrId: str(r.pfr_player_id), name: str(r.player), pos: normPos(r.position),
      team: str(r.team), week: num(r.week),
      snaps: num(r.offense_snaps), pct: num(r.offense_pct),
    }));
    record(`nflverse_snaps_${season}`, true, `${out.length} rows`);
    return out;
  } catch (e) {
    record(`nflverse_snaps_${season}`, false, `failed: ${e.message}`);
    return [];
  }
}

/* ============================================================
   DYPTARTOFLUR — TVO OSAMRYMANLEG SNID, OG VID LASUM ADEINS THAD GAMLA
   ============================================================
   Fallid var skrifad gegn snidinu sem nflverse notadi til og med 2024:

     season,club_code,week,game_type,depth_team,last_name,first_name,
     football_name,formation,gsis_id,jersey_number,position,elias_id,
     depth_position,full_name

   MAELT 14.8.2026 med Range-fyrirspurn a hausinn i fjorum arum:
   **2025 OG 2026 BERA ALLT ANNAD SNID.**

     dt,team,player_name,espn_id,gsis_id,pos_grp_id,pos_grp,pos_id,
     pos_name,pos_abb,pos_slot,pos_rank

   Af theim dolkum sem gamla listinn bad um er **`gsis_id` sa EINI** sem
   er til i nyja snidinu. `objects(txt, pick)` sleppir thogult theim sem
   vantar, svo `r.position` og `r.depth_position` urdu BADIR undefined,
   `pos` vard null og sian `r.id && r.pos` HENTI HVERRI EINUSTU ROD.

   `depthCharts(2026)` skiladi thvi **0 rodum og skradi sig sem `ok`**
   (`record(..., true, "0 rows")`). Thad er nakvaemlega thogla bilunin
   sem CLAUDE.md 5b lysir: fullyrding sem finnur ekkert og heldur afram.
   Enginn hafdi tekid eftir thvi thvi fallid var ALDREI KALLAD — sem er
   sjalft astaedan fyrir thessari vinnu.

   TVENNT ANNAD SEM MAELINGIN SAGDI OG SEM BREYTIR NOTKUNINNI:

   1. **NYJA SNIDID BER ENGA `week`. Thad ber `dt` — SKONNUNAR-TIMASTIMPIL**,
      og skrain SAFNAR UPP: `depth_charts_2026.csv` bar **147 einkvaem `dt`**
      (2026-03-22 -> 2026-08-14), 433.107 radir, 3.256 radir per dagsmynd.
      nflverse heldur thvi sjalft dyptar-sogunni i nyja snidinu — en
      skrain er **41 MB (8,5 MB sem .gz)** og vex daglega, svo hun er ekki
      nytileg sem beinn lestur i appinu ne i labi.
   2. `.csv.gz` ER TIL fyrir dyptartoflur (8,5 MB a moti 41 MB) og
      `getBuf` afthjappar sjalfkraft. Hun er sott fyrst.

   `latestOnly` skilar ADEINS nyjustu dagsmyndinni (haesta `dt`). Thad er
   thad sem daglega vistunin i `fetch-nfl.mjs` skrifar.

   UTKOMAN ER SAMA LOGUN UR BADUM SNIDUM: `week` er null i nyja snidinu
   og `dt` er null i gamla. Hvorugt er logið upp i annad — vika sem er
   ekki i gognunum verdur ekki til med thvi ad giska a hana.

   ATH: hér er lesid med `rows()` og VISITOLUM, ekki `objects()`. Thad er
   ekki smekkur: `objects()` a 433.107 rodum byggir jafnmarga hluti og
   thad er ~200 MB af minni fyrir skra sem vid notum 985 radir ur.       */
export async function depthCharts(season, { latestOnly = false } = {}) {
  const tag = `nflverse_depth_${season}`;
  let txt = null, lastErr = null;
  /* `.gz` fyrst — hun er 5x minni yfir vir og `getBuf` afthjappar. */
  for (const u of [`${REL}/depth_charts/depth_charts_${season}.csv.gz`,
                   `${REL}/depth_charts/depth_charts_${season}.csv`]) {
    try { txt = await getText(u); break; } catch (e) { lastErr = e; }
  }
  if (txt == null) {
    record(tag, false, `failed: ${lastErr ? lastErr.message : "no file"}`);
    return [];
  }

  try {
    const r = csvRows(txt);
    if (r.length < 2) { record(tag, false, "file has a header but no rows"); return []; }
    const head = r[0];
    const at = (n) => head.indexOf(n);

    /* SNIDID ER GREINT AF HAUSNUM, EKKI AF ARINU. Ad skipta a `season
       >= 2025` vaeri ad harдkoda thad sem nflverse getur breytt aftur —
       og thad er nakvaemlega thad sem brotnadi hér. */
    const iDt = at("dt");
    const isNew = iDt >= 0;

    const out = [];
    if (isNew) {
      const iTeam = at("team"), iName = at("player_name"), iGsis = at("gsis_id");
      const iAbb = at("pos_abb"), iRank = at("pos_rank"), iSlot = at("pos_slot");
      const iGrp = at("pos_grp"), iEspn = at("espn_id");

      /* Hvad er nyjasta dagsmyndin? Fundid i einni ferd adur en nokkud
         er byggt, svo vid buum ekki 433.000 hluti til ad henda theim. */
      let newest = "";
      if (latestOnly) {
        for (let i = 1; i < r.length; i++) {
          const d = r[i][iDt];
          if (d && d > newest) newest = d;
        }
      }
      for (let i = 1; i < r.length; i++) {
        const row = r[i];
        if (latestOnly && row[iDt] !== newest) continue;
        const id = str(row[iGsis]);
        const pos = normPos(str(row[iAbb]));
        if (!id || !pos) continue;
        out.push({
          team: normTeam(str(row[iTeam])), week: null, dt: str(row[iDt]),
          id, espnId: iEspn >= 0 ? str(row[iEspn]) : null,
          name: str(row[iName]), pos,
          /* `pos_rank` er rod INNAN stodu (1 = byrjunarmadur) og er thvi
             sama staerd og `depth_team` i gamla snidinu. `pos_slot` er
             sæti i leikskipulaginu (formation slot) og er ANNAD mal —
             thau eru baedi hofd og hvorugt er kallad thad sem thad er ekki. */
          depth: num(row[iRank]), slot: num(row[iSlot]),
          formation: iGrp >= 0 ? str(row[iGrp]) : null,
        });
      }
      record(tag, out.length > 0,
        `${out.length} rows, new schema (dt)` +
        (latestOnly ? `, latest snapshot ${newest}` : ""));
    } else {
      const iTeam = at("club_code"), iWeek = at("week"), iGsis = at("gsis_id");
      const iFull = at("full_name"), iFb = at("football_name");
      const iDepth = at("depth_team"), iPos = at("position");
      const iDepthPos = at("depth_position"), iForm = at("formation");
      for (let i = 1; i < r.length; i++) {
        const row = r[i];
        const id = str(row[iGsis]);
        const pos = normPos(str(row[iPos])) || normPos(str(row[iDepthPos]));
        if (!id || !pos) continue;
        out.push({
          team: normTeam(str(row[iTeam])), week: num(row[iWeek]), dt: null,
          id, espnId: null,
          name: str(row[iFull]) || str(row[iFb]), pos,
          depth: num(row[iDepth]), slot: null,
          formation: iForm >= 0 ? str(row[iForm]) : null,
        });
      }
      record(tag, out.length > 0, `${out.length} rows, legacy schema (week)`);
    }
    return out;
  } catch (e) {
    record(tag, false, `failed: ${e.message}`);
    return [];
  }
}

/** Meidsla-skyrslur. `report_status` er Out/Doubtful/Questionable. */
export async function injuries(season) {
  try {
    const txt = await getText(`${REL}/injuries/injuries_${season}.csv`);
    const rows = parse(`injuries_${season}`, txt, ["season", "team", "week", "gsis_id", "position",
      "full_name", "report_primary_injury", "report_status", "practice_status"]);
    const out = rows.map((r) => ({
      team: str(r.team), week: num(r.week), id: str(r.gsis_id),
      name: str(r.full_name), pos: normPos(r.position),
      injury: str(r.report_primary_injury), status: str(r.report_status),
      practice: str(r.practice_status),
    }));
    record(`nflverse_injuries_${season}`, true, `${out.length} rows`);
    return out;
  } catch (e) {
    record(`nflverse_injuries_${season}`, false, `failed: ${e.message}`);
    return [];
  }
}

/**
 * Grunnskra leikmanna — bio + AUDKENNIS-BRU.
 * `players.csv` ber gsis_id, espn_id, pfr_id o.fl. i einni rod, sem er
 * nakvaemlega thad sem tharf til ad tengja saman heimildir an
 * nafna-porunar. Nafna-porun er sidasta urraedi hja okkur — hun villti
 * Jacob og Alex Murphy i FPL-verkefninu.
 *
 * ============================================================
 * TVEIR DALKAR VORU HORFNIR OG BADIR SKRADU SIG `ok` (maelt 21.8.2026)
 * ============================================================
 * Hausinn a `players.csv` er 39 dalkar og listinn hér bad um tvo sem
 * eru ekki i honum:
 *
 *   `draft_club`  ->  ENDURNEFNT `draft_team`. `draftTeam` hefur thvi
 *                     verid **null a ollum 25.049 leikmonnum**. Enginn
 *                     les svidid enn, svo ekkert var synilega rangt —
 *                     en tomt svid sem heimildin BER er lygi sem bidur
 *                     thess ad einhver lesi hana ("NULL ER EKKI NULL").
 *                     Lagfaert: rett heiti.
 *
 *   `sleeper_id`  ->  TEKID UT ALVEG. nflverse birtir thad ekki lengur.
 *                     `nvBySleeper` i `fetch-nfl.mjs` — varaleidin ad
 *                     nflverse-rod thegar DynastyProcess-bruin thegir —
 *                     hefur thvi verid **TOM Map**.
 *
 * OG VARALEIDIN HAFDI ENGU AD TAPA — ThAD ER MAELINGIN SEM AFGREIDIR
 * MALID: af 1.167 rodum i `players.json` para **1.035 gegnum bruna** og
 * 2 gegnum Sleeper-eigid gsis; **0 gegnum `nflverse_sleeper_id`**. Their
 * 130 sem para ekki hafa **allir `gsisId: null` OG `team: null`**
 * (Reggie Diggs, Valdez Showers, Gabe Marks …) — menn sem eru ekki i
 * nflverse yfirleitt, svo ENGIN bru hefdi fundid thá.
 *
 * Dalkurinn er thvi haldinn i `optional`: hann er LESINN afram (kviknar
 * af sjalfu ser skili nflverse honum aftur) en er EKKI krafist, svo
 * Sources faer ekki rauda rod ad eilifu fyrir dalk sem heimildin
 * fjarlaegdi viljandi.
 */
export async function players() {
  const txt = await getText(`${REL}/players/players.csv`);
  const rows = parse("players", txt, ["gsis_id", "display_name", "common_first_name",
    "last_name", "position", "position_group", "latest_team", "status",
    "jersey_number", "height", "weight", "college_name", "birth_date",
    "rookie_season", "last_season", "draft_year", "draft_round", "draft_pick",
    "draft_team", "years_of_experience", "headshot", "esb_id", "smart_id",
    "espn_id", "pfr_id", "otc_id", "pff_id"], ["sleeper_id"]);
  const out = rows.map((r) => ({
    id: str(r.gsis_id), name: str(r.display_name), pos: normPos(r.position),
    posGroup: str(r.position_group), team: str(r.latest_team), status: str(r.status),
    jersey: num(r.jersey_number), height: num(r.height), weight: num(r.weight),
    college: str(r.college_name), born: str(r.birth_date),
    rookieSeason: num(r.rookie_season), lastSeason: num(r.last_season),
    draftYear: num(r.draft_year), draftRound: num(r.draft_round),
    draftPick: num(r.draft_pick), draftTeam: str(r.draft_team),
    exp: num(r.years_of_experience), headshot: str(r.headshot),
    espnId: str(r.espn_id), sleeperId: str(r.sleeper_id), pfrId: str(r.pfr_id),
  })).filter((p) => p.id);
  record("nflverse_players", true, `${out.length} players`);
  return out;
}

/**
 * Lidsvikur — sokn OG vorn i einni rod. Notad til ad reikna hradá
 * (plays/leik), sendihlutfall og hve mikid lid GEFUR FRA SER a hverja
 * stodu. Thad sidasta er "vorn gegn stodu" og er NFL-hlidstaedan vid
 * FFDR i FPL-appinu.
 */
export async function teamWeekly(seasons) {
  const out = {};
  await pool(seasons, 3, async (yr) => {
    try {
      const txt = await getText(`${REL}/stats_team/stats_team_week_${yr}.csv`);
      const rows = parse(`stats_team_week_${yr}`, txt, ["team", "season", "week", "season_type", "opponent_team",
        "attempts", "completions", "passing_yards", "passing_tds", "carries",
        "rushing_yards", "rushing_tds", "passing_epa", "rushing_epa",
        "def_sacks", "def_interceptions", "def_tds"]);
      out[yr] = rows.filter((r) => r.season_type === "REG").map((r) => ({
        team: str(r.team), week: num(r.week), opp: str(r.opponent_team),
        patt: num(r.attempts), pyd: num(r.passing_yards), ptd: num(r.passing_tds),
        car: num(r.carries), ryd: num(r.rushing_yards), rtd: num(r.rushing_tds),
        pepa: num(r.passing_epa), repa: num(r.rushing_epa),
        /* ============================================================
           `sacks`/`ints` ERU VORPUD OG ENGINN LES THAU — OG `def_tds`
           ER LESID UR CSV OG ALDREI VARPAD. Baedi var satt 14.8.2026 og
           hvorugt er villa; thad er einfaldlega OKLARADUR THRADUR.

           `teamAggregates` i `fetch-nfl.mjs` summar ADEINS
           patt/car/pyd/ryd/ptd/rtd/pepa/repa, svo thessi tvo svid detta
           ut a leidinni i `team_form.json`.

           DST-HLIDIN LES EKKI HEDAN. `scripts/dst-lab.mjs` saekir
           `stats_team_week` beint med SINUM eigin dalkalista (21 svid,
           thar a medal `def_safeties`, `def_fumbles_forced`,
           `fumble_recovery_opp` og `fumble_recovery_tds` sem eru hvorugt
           her) og sendir rodina i `dstPoints` i `src/scoring.js`.

           Svidin eru LATIN STANDA fremur en ad vera fjarlaegd: thau
           kosta ekkert, thau eru rett, og naesta lidsmaeling sem tharf
           varnartolur a ad finna thau her. En sa sem baetir vid DST-svidi
           HER a ad vita ad thad birtist hvergi fyrr en `teamAggregates`
           summar thad lika.                                          */
        sacks: num(r.def_sacks), ints: num(r.def_interceptions),
      }));
      record(`nflverse_team_${yr}`, true, `${out[yr].length} team weeks`);
    } catch (e) {
      record(`nflverse_team_${yr}`, false, `failed: ${e.message}`);
    }
  });
  return out;
}

/** Next Gen Stats — adskilnadur motherja, yfir vaentum hlaupayordum. */
export async function nextGen(season, kind) {
  try {
    const txt = await getText(`${REL}/nextgen_stats/ngs_${season}_${kind}.csv.gz`);
    const rows = objects(txt);
    record(`nflverse_ngs_${kind}_${season}`, true, `${rows.length} rows`);
    return rows;
  } catch (e) {
    record(`nflverse_ngs_${kind}_${season}`, false, `failed: ${e.message}`);
    return [];
  }
}
