/* ============================================================
   adp.mjs — ADP ur MORGUM heimum, og audkennisbruin.

   HVERS VEGNA FLEIRI EN EITT ADP:
   ADP er ekki ein tala heldur maeling a AKVEDNUM HOPI vid AKVEDNAR
   reglur. Sami leikmadur hefur olikt ADP i 10-lida standard og
   12-lida PPR, og enn annad a Sleeper en a ESPN. Ad birta "ADP" sem
   eina tolu er thvi rangt i sama skilningi og ad birta "verd" an
   gjaldmidils.

   Thad sem skiptir mali fyrir notandann er ekki medaltalid heldur
   HVAR HANS DRAFT LIGGUR. Thess vegna er FFC sott i theim staerdum
   sem hann getur att von a (10/12/14 lid × ppr/half/standard) og
   appid velur rett sett eftir stillingum deildarinnar.

   FantasyFootballCalculator er raunveruleg draft-gogn ur theirra
   herminum — `total_drafts` og `times_drafted` fylgja med, svo
   URTAKSSTAERDIN ER SYNILEG. Tala an urtaksstaerdar er hálf tala.
   ============================================================ */

import { getJSON, getText, record, pool } from "../lib/http.mjs";
import { objects, str, num } from "../lib/csv.mjs";
import { normPos } from "../../src/scoring.js";

const FFC = "https://fantasyfootballcalculator.com/api/v1/adp";

/** Eitt ADP-sett. `scoring` = ppr | half-ppr | standard | 2qb | dynasty */
export async function ffc(scoring, teams, year) {
  const url = `${FFC}/${scoring}?teams=${teams}&year=${year}`;
  try {
    const d = await getJSON(url);
    if (d.status !== "Success" || !Array.isArray(d.players)) {
      record(`ffc_${scoring}_${teams}`, false, `unexpected response: ${d.status}`);
      return null;
    }
    const out = {
      scoring, teams, year,
      totalDrafts: d.meta ? d.meta.total_drafts : null,
      from: d.meta ? d.meta.start_date : null,
      to: d.meta ? d.meta.end_date : null,
      players: d.players.map((p) => ({
        ffcId: String(p.player_id), name: p.name, pos: normPos(p.position),
        team: p.team, adp: p.adp, adpFmt: p.adp_formatted,
        sd: p.stdev != null ? p.stdev : null,
        high: p.high, low: p.low, times: p.times_drafted, bye: p.bye,
      })),
    };
    record(`ffc_${scoring}_${teams}`, true,
      `${out.players.length} players from ${out.totalDrafts} drafts (${out.from}–${out.to})`);
    return out;
  } catch (e) {
    record(`ffc_${scoring}_${teams}`, false, `failed: ${e.message}`);
    return null;
  }
}

/** Öll settin sem appid getur thurft. */
export async function ffcAll(year) {
  const combos = [];
  for (const s of ["ppr", "half-ppr", "standard"]) {
    for (const t of [10, 12, 14]) combos.push([s, t]);
  }
  combos.push(["2qb", 12], ["dynasty", 12]);
  const got = await pool(combos, 3, ([s, t]) => ffc(s, t, year));
  return got.filter(Boolean);
}

/* ---------- audkennisbruin ---------- */

/**
 * DynastyProcess `db_playerids.csv` — EIN rod per leikmann med
 * fantasypros_id, sleeper_id, gsis_id, espn_id, yahoo_id, pfr_id …
 *
 * HVERS VEGNA THETTA ER LYKILATRIDI: heimildirnar okkar nota fimm
 * olik audkenni. An bruar vaeri eina leidin nafna-porun, og hun er
 * thad sem villti "Jacob og Alex Murphy" i FPL-verkefninu. Hér er
 * porun EKKI thorf — brun er handviðhaldin af theim sem eiga gognin.
 *
 * Nafna-porun er samt HOFD MED sem SIDASTA urraedi fyrir nyliða sem
 * eru ekki komnir i bruna, og hun er MERKT sem slik i utkomunni
 * (`via: "name"`) svo aldrei se haegt ad rugla henni vid orugga porun.
 */
export async function idMap() {
  const txt = await getText(
    "https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv");
  const rows = objects(txt, ["fantasypros_id", "sleeper_id", "gsis_id", "espn_id",
    "yahoo_id", "pfr_id", "mfl_id", "name", "merge_name", "position", "team",
    "birthdate", "age", "draft_year", "draft_round", "draft_pick", "db_season"]);
  const out = rows.map((r) => ({
    fpId: str(r.fantasypros_id), sleeperId: str(r.sleeper_id),
    gsisId: str(r.gsis_id), espnId: str(r.espn_id), yahooId: str(r.yahoo_id),
    pfrId: str(r.pfr_id), mflId: str(r.mfl_id),
    name: str(r.name), mergeName: str(r.merge_name),
    pos: normPos(r.position), team: str(r.team),
    age: num(r.age), draftYear: num(r.draft_year),
    draftRound: num(r.draft_round), draftPick: num(r.draft_pick),
  })).filter((r) => r.name);
  const withFp = out.filter((r) => r.fpId).length;
  const withSl = out.filter((r) => r.sleeperId).length;
  record("idmap", true,
    `${out.length} rows; fp-id ${withFp}, sleeper-id ${withSl}`);
  return out;
}
