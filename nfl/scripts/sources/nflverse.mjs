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
import { objects, num, num0, str } from "../lib/csv.mjs";
import { offensePoints, kickerPoints, normPos } from "../../src/scoring.js";
import { normTeam } from "../../src/names.js";

const REL = "https://github.com/nflverse/nflverse-data/releases/download";

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
      const raw = objects(txt, WEEK_COLS);
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
  const all = objects(txt, [
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
    const rows = objects(txt, ["pfr_player_id", "player", "position", "team",
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

/** Dyptartoflur — hver er nr. 1 a sinni stodu. */
export async function depthCharts(season) {
  try {
    const txt = await getText(`${REL}/depth_charts/depth_charts_${season}.csv`);
    const rows = objects(txt, ["season", "club_code", "week", "gsis_id",
      "football_name", "full_name", "depth_team", "position", "depth_position",
      "formation", "elias_id", "game_type"]);
    const out = rows.map((r) => ({
      team: str(r.club_code), week: num(r.week), id: str(r.gsis_id),
      name: str(r.full_name) || str(r.football_name),
      depth: num(r.depth_team), pos: normPos(r.position) || normPos(r.depth_position),
      formation: str(r.formation),
    })).filter((r) => r.id && r.pos);
    record(`nflverse_depth_${season}`, true, `${out.length} rows`);
    return out;
  } catch (e) {
    record(`nflverse_depth_${season}`, false, `failed: ${e.message}`);
    return [];
  }
}

/** Meidsla-skyrslur. `report_status` er Out/Doubtful/Questionable. */
export async function injuries(season) {
  try {
    const txt = await getText(`${REL}/injuries/injuries_${season}.csv`);
    const rows = objects(txt, ["season", "team", "week", "gsis_id", "position",
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
 * `players.csv` ber gsis_id, espn_id, sleeper_id, pfr_id o.fl. i einni
 * rod, sem er nakvaemlega thad sem tharf til ad tengja saman heimildir
 * an nafna-porunar. Nafna-porun er sidasta urraedi hja okkur — hun
 * villti Jacob og Alex Murphy i FPL-verkefninu.
 */
export async function players() {
  const txt = await getText(`${REL}/players/players.csv`);
  const rows = objects(txt, ["gsis_id", "display_name", "common_first_name",
    "last_name", "position", "position_group", "latest_team", "status",
    "jersey_number", "height", "weight", "college_name", "birth_date",
    "rookie_season", "last_season", "draft_year", "draft_round", "draft_pick",
    "draft_club", "years_of_experience", "headshot", "esb_id", "smart_id",
    "espn_id", "sleeper_id", "pfr_id", "otc_id", "pff_id"]);
  const out = rows.map((r) => ({
    id: str(r.gsis_id), name: str(r.display_name), pos: normPos(r.position),
    posGroup: str(r.position_group), team: str(r.latest_team), status: str(r.status),
    jersey: num(r.jersey_number), height: num(r.height), weight: num(r.weight),
    college: str(r.college_name), born: str(r.birth_date),
    rookieSeason: num(r.rookie_season), lastSeason: num(r.last_season),
    draftYear: num(r.draft_year), draftRound: num(r.draft_round),
    draftPick: num(r.draft_pick), draftTeam: str(r.draft_club),
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
      const rows = objects(txt, ["team", "season", "week", "season_type", "opponent_team",
        "attempts", "completions", "passing_yards", "passing_tds", "carries",
        "rushing_yards", "rushing_tds", "passing_epa", "rushing_epa",
        "def_sacks", "def_interceptions", "def_tds"]);
      out[yr] = rows.filter((r) => r.season_type === "REG").map((r) => ({
        team: str(r.team), week: num(r.week), opp: str(r.opponent_team),
        patt: num(r.attempts), pyd: num(r.passing_yards), ptd: num(r.passing_tds),
        car: num(r.carries), ryd: num(r.rushing_yards), rtd: num(r.rushing_tds),
        pepa: num(r.passing_epa), repa: num(r.rushing_epa),
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
