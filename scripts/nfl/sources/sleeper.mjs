/* ============================================================
   sleeper.mjs — vettvangurinn sem notandinn draftar a.

   Sleeper er MIKILVAEGASTA einstaka heimildin i thessu verkefni af
   thremur astaedum sem eru ekki jafngildar:

   1. SPARNAR HANS ERU THAER SEM DEILDIN SER. Ef appid mælir med
      leikmanni sem Sleeper spair 6 stigum a, tha ser notandinn tha
      tolu vid hlidina a minni i sinu eigin drafti. Ad hunsa hana
      vaeri ad hunsa thad sem motherjarnir eru ad horfa a.
   2. ADP HANS ER RETTA ADP-ID. FFC og ESPN maela adra hopa. Sleeper
      maelir folkid sem thu ert ad drafta a moti.
   3. `/draft/{id}/picks` er OPINN. Thad thydir ad appid getur fylgt
      RAUNVERULEGU drafti i beinni an nokkurs lykils — sott hverja
      valda leikmenn og reiknad naesta rad. Thad er ekki haegt vid
      Yahoo eda ESPN an OAuth.

   Endapunktarnir `/projections` og `/stats` eru OSKRADIR (engin
   opinber skjolun) en opnir og stodugir. Their eru medhondladir sem
   BROTHAETTIR: detti their ut a appid ad virka an theirra.
   ============================================================ */

import { getJSON, record, tryGet } from "../lib/http.mjs";
import { normPos } from "../../../src-nfl/scoring.js";

const V1 = "https://api.sleeper.app/v1";
const API = "https://api.sleeper.com";

/** Hvar timabilid stendur: vika, forleikur/deild, dagsetningar. */
export async function state() {
  const s = await getJSON(`${V1}/state/nfl`);
  record("sleeper_state", true,
    `seasons ${s.season} ${s.season_type}, week ${s.week} (starts ${s.season_start_date})`);
  return s;
}

/**
 * Allur leikmannaheimurinn (~5 MB, ~11.000 leikmenn).
 * Sleeper bidur beinlinis um ad thetta se sott I MESTA LAGI EINU
 * SINNI A DAG — thad er virt i `fetch-nfl.yml` (einu sinni, kl. 09).
 */
export async function allPlayers() {
  const raw = await getJSON(`${V1}/players/nfl`);
  const out = [];
  for (const [id, p] of Object.entries(raw)) {
    const pos = normPos(p.position);
    if (!["QB", "RB", "WR", "TE", "K", "DST"].includes(pos)) continue;
    if (p.status === "Inactive" && !p.team) continue;
    out.push({
      sleeperId: id,
      name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      pos, team: p.team,
      status: p.status, injury: p.injury_status, injuryBody: p.injury_body_part,
      injuryNotes: p.injury_notes,
      age: p.age, exp: p.years_exp, number: p.number,
      height: p.height, weight: p.weight, college: p.college,
      depth: p.depth_chart_order, depthPos: p.depth_chart_position,
      active: p.active,
      // audkennisbru — SLEEPER BER THAU SJALFUR og thad sparar
      // heila nafna-porun gagnvart nflverse og ESPN.
      gsisId: p.gsis_id, espnId: p.espn_id != null ? String(p.espn_id) : null,
      yahooId: p.yahoo_id != null ? String(p.yahoo_id) : null,
      rotowireId: p.rotowire_id != null ? String(p.rotowire_id) : null,
      fantasyDataId: p.fantasy_data_id != null ? String(p.fantasy_data_id) : null,
      searchName: p.search_full_name,
    });
  }
  record("sleeper_players", true, `${out.length} fantasy players of ${Object.keys(raw).length}`);
  return out;
}

const POS_Q = ["QB", "RB", "WR", "TE", "K", "DEF"]
  .map((p) => `position[]=${p}`).join("&");

/**
 * ADP-TOMGILDI. Sleeper skrifar **999** (og stundum **400**) fyrir
 * leikmann sem enginn draftar — thad er EKKI ADP 999, thad er "ekki
 * draftadur". Maelt 9.8.2026: af 2.107 RB/WR med `adp_ppr` voru
 * **1.930 nakvaemlega 999** og adeins 175 undir 300.
 *
 * Ad lata 999 standa var raunveruleg villa i fyrstu utgafu hedan:
 * hun let 3.079 af 3.083 leikmonnum lita ut fyrir ad hafa ADP, svo
 * sian sem atti ad halda skranni vid draftanlega leikmenn hleypti
 * ollum i gegn. Nakvaemlega gildran ur CLAUDE.md kafla 8:
 * **NULL ER EKKI NULL** — tomgildi sem er skrifad sem tala.
 */
const ADP_SENTINEL = 400;
const adp = (v) => (typeof v === "number" && Number.isFinite(v) && v < ADP_SENTINEL ? v : null);

/**
 * Sleeper-spar. `week` sleppt = TIMABILS-SUMMA.
 * Radirnar bera LIKA ADP i ollum afbrigdum (`adp_ppr`, `adp_std`,
 * `adp_half_ppr`, `adp_dynasty`, `adp_2qb`) — thad er ADP-ID sem
 * gildir a theim vettvangi sem notandinn spilar a.
 */
export async function projections(season, week = null) {
  const url = week == null
    ? `${API}/projections/nfl/${season}?season_type=regular&${POS_Q}&order_by=pts_ppr`
    : `${API}/projections/nfl/${season}/${week}?season_type=regular&${POS_Q}&order_by=pts_ppr`;
  const raw = await tryGet(`sleeper_proj_${season}${week ? `_w${week}` : ""}`, url);
  if (!raw || !Array.isArray(raw)) return [];

  const out = raw.map((r) => {
    const s = r.stats || {};
    const p = r.player || {};
    return {
      sleeperId: String(r.player_id ?? p.player_id ?? ""),
      name: p.first_name ? `${p.first_name} ${p.last_name}` : null,
      pos: normPos(p.position), team: r.team || p.team,
      week: r.week ?? week ?? null, opp: r.opponent ?? null, date: r.date ?? null,
      gp: s.gp ?? null,
      ppr: s.pts_ppr ?? null, half: s.pts_half_ppr ?? null, std: s.pts_std ?? null,
      // magn-sparnar — thaer eru MIKILVAEGARI en stigatalan sjalf
      // thvi thaer er haegt ad bera saman vid raunveruleg gogn.
      patt: s.pass_att ?? null, pyd: s.pass_yd ?? null, ptd: s.pass_td ?? null,
      pint: s.pass_int ?? null,
      car: s.rush_att ?? null, ryd: s.rush_yd ?? null, rtd: s.rush_td ?? null,
      tgt: s.rec_tgt ?? null, rec: s.rec ?? null, recyd: s.rec_yd ?? null,
      rectd: s.rec_td ?? null,
      adpPpr: adp(s.adp_ppr), adpStd: adp(s.adp_std),
      adpHalf: adp(s.adp_half_ppr), adpDyn: adp(s.adp_dynasty_ppr),
      adp2qb: adp(s.adp_2qb),
      posAdp: adp(s.pos_adp_dd_ppr),
    };
  }).filter((r) => r.sleeperId);
  record(`sleeper_proj_${season}${week ? `_w${week}` : "_season"}`, true,
    `${out.length} projections`);
  return out;
}

/**
 * Hvada leikmenn er verid ad saekja/sleppa akkurat nuna.
 * Thetta er EINA raunvistarmerkid um markadinn i deildinni. I
 * forleik er thad meidsla-frett adur en hun ratar i skyrslu; a
 * timabili er thad waiver-hlaupid.
 */
export async function trending(kind = "add", hours = 24, limit = 100) {
  const raw = await tryGet(`sleeper_trending_${kind}`,
    `${V1}/players/nfl/trending/${kind}?lookback_hours=${hours}&limit=${limit}`);
  if (!Array.isArray(raw)) return [];
  record(`sleeper_trending_${kind}`, true, `${raw.length} players`);
  return raw.map((r) => ({ sleeperId: String(r.player_id), count: r.count }));
}

/* ---------- BEIN DRAFT-TENGING ----------
   Thessi fjogur foll eru ekki notud i pipeline-inu heldur AF APPINU
   sjalfu i beinni. Their eru hafdir hér svo tho se EIN skilgreining
   a thvi hvernig Sleeper-draft er lesid.                            */

/** Draft-lysing: snid (snake/linear), stodur, fjoldi lida, rodun. */
export async function draft(draftId) {
  return getJSON(`${V1}/draft/${draftId}`);
}
/** Öll val sem THEGAR eru komin. Thetta er pollad i beinni. */
export async function draftPicks(draftId) {
  return getJSON(`${V1}/draft/${draftId}/picks`);
}
/** Notandi -> deildir -> draft. Leidin fra notandanafni ad draft-id. */
export async function userLeagues(userId, season) {
  return getJSON(`${V1}/user/${userId}/leagues/nfl/${season}`);
}
export async function user(name) {
  return getJSON(`${V1}/user/${name}`);
}
