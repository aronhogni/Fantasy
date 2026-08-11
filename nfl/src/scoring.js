/* ============================================================
   scoring.js — HREIN stigagjof. Ekkert React, engin gogn.

   HVERS VEGNA THETTA ER SER SKRA OG ER FLUTT INN BAEDI I
   PIPELINE-ID OG APPID: pipeline-id reiknar sogulegt fantasy-skor
   ur hrafylkjum nflverse (til ad thjalfa og BAKPROFA likanid) og
   appid reiknar spad skor. Ef thaer formulur eru tvaer, tha maelir
   bakprofid annan leik en notandinn spilar — og BAEDI virdast rett.
   Sama regla og i FPL-appinu: profin keyra nakvaemlega sama koda
   og appid birtir.

   nflverse gefur EKKI fantasy-stig i `stats_player_week` (gamla
   `player_stats`-utgafan gerdi thad). Thad er i raun kostur: vid
   verdum ad reikna thau, og tha getum vid reiknad THAU SEM DEILDIN
   NOTAR i stad thess ad vera fost i einni PPR-tulkun.
   ============================================================ */

/* ---------- stillingar ---------- */

/**
 * Sjalfgefid: Sleeper "Half PPR" er algengasta uppsetningin i dag,
 * en PPR er algengast i ADP-gognum. Vid HORFUM A BAEDI og notandinn
 * velur. Sjalfgefid er PPR THVI ADP/ECR-heimildirnar eru PPR —
 * annars vaeri sjalfgefna syn appsins osamanburdarhaef vid rodunina
 * sem hun birtir vid hlidina.
 */
export const PRESETS = {
  ppr:      { name: "PPR",          rec: 1.0 },
  half:     { name: "Half PPR",     rec: 0.5 },
  standard: { name: "Standard",     rec: 0.0 },
  te_prem:  { name: "TE Premium",   rec: 1.0, recBonusTE: 0.5 },
  superflex:{ name: "Superflex PPR", rec: 1.0 },  // munurinn er i stodum, ekki stigum
};

/** Grunnreglur. Allt sem er ekki i `PRESETS` kemur hedan. */
export const BASE = {
  passYd: 0.04,          // 1 stig / 25 yarda
  passTD: 4,
  passInt: -1,
  pass2pt: 2,
  pass40Bonus: 0,        // sumar deildir; sjalfgefid af

  rushYd: 0.1,
  rushTD: 6,
  rush2pt: 2,

  rec: 1.0,              // yfirskrifad af preset
  recBonusTE: 0,
  recYd: 0.1,
  recTD: 6,
  rec2pt: 2,

  fumbleLost: -2,
  fumbleRecTD: 6,
  specialTeamsTD: 6,

  // Kicker — fjarlaegdarthrep. Thetta er Sleeper-sjalfgefid.
  fg0_19: 3, fg20_29: 3, fg30_39: 3, fg40_49: 4, fg50_59: 5, fg60: 5,
  fgMiss: 0,             // Sleeper refsar ekki sjalfgefid
  pat: 1, patMiss: -1,

  // Vorn/serlid (DST)
  dstSack: 1, dstInt: 2, dstFumRec: 2, dstTD: 6, dstSafety: 2, dstBlock: 2,
};

/** Skilar fullri reglusetningu ur preset-heiti eda hlut. */
export function rules(preset = "ppr") {
  const p = typeof preset === "string" ? (PRESETS[preset] || PRESETS.ppr) : preset;
  return { ...BASE, ...p };
}

/* ---------- stig ur hrafylkjum ---------- */

const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * Fantasy-stig fyrir SOKNARLEIKMANN (QB/RB/WR/TE) ur einni rod i
 * `stats_player_week`. Sviðaheitin eru nflverse-heiti — thau eru
 * notud OBREYTT alla leid i gegn svo ekki thurfi tvo dalkaskrar
 * (sama rok og `sumGwRange` i FPL-appinu).
 */
export function offensePoints(r, R = BASE, pos = null) {
  let pts = 0;

  pts += n(r.passing_yards) * R.passYd;
  pts += n(r.passing_tds) * R.passTD;
  pts += n(r.passing_interceptions) * R.passInt;
  pts += n(r.passing_2pt_conversions) * R.pass2pt;

  pts += n(r.rushing_yards) * R.rushYd;
  pts += n(r.rushing_tds) * R.rushTD;
  pts += n(r.rushing_2pt_conversions) * R.rush2pt;

  const recs = n(r.receptions);
  pts += recs * R.rec;
  if (R.recBonusTE && pos === "TE") pts += recs * R.recBonusTE;
  pts += n(r.receiving_yards) * R.recYd;
  pts += n(r.receiving_tds) * R.recTD;
  pts += n(r.receiving_2pt_conversions) * R.rec2pt;

  // fumbles_lost_total nær yfir sack/rush/rec — ekki leggja hinar
  // thrjar ofan a, tha er tapid TVITALID. Bakfall ef sviðid vantar.
  const fl = r.fumbles_lost_total != null
    ? n(r.fumbles_lost_total)
    : n(r.sack_fumbles_lost) + n(r.rushing_fumbles_lost) + n(r.receiving_fumbles_lost);
  pts += fl * R.fumbleLost;

  pts += n(r.special_teams_tds) * R.specialTeamsTD;
  pts += n(r.fumble_recovery_tds) * R.fumbleRecTD;

  return pts;
}

/** Fantasy-stig fyrir SPYRNUMANN (K). */
export function kickerPoints(r, R = BASE) {
  let pts = 0;
  pts += n(r.fg_made_0_19) * R.fg0_19;
  pts += n(r.fg_made_20_29) * R.fg20_29;
  pts += n(r.fg_made_30_39) * R.fg30_39;
  pts += n(r.fg_made_40_49) * R.fg40_49;
  pts += n(r.fg_made_50_59) * R.fg50_59;
  pts += n(r.fg_made_60_) * R.fg60;
  pts += n(r.fg_missed) * R.fgMiss;
  pts += n(r.pat_made) * R.pat;
  pts += n(r.pat_missed) * R.patMiss;
  return pts;
}

/* ============================================================
   DST-STIGAREIKNINGUR VAR FJARLAEGDUR — OG THAD ER ASETT
   ============================================================
   `dstPoints`, `dstPointsAllowed` og `pointsFor` mynduðu LOKADAN
   HRING: `pointsFor` kalladi a hin tvo og EKKERT kalladi a `pointsFor`.
   Enginn dalkur, engin hermun og ekkert prof snerti tha.

   Og thad var ekki tilviljun heldur afleiding af gognunum: vid EIGUM
   engin soguleg DST-stig. `seasons.json` ber QB/RB/WR/TE/K og ekkert
   annad, og `defense.json` er vorn-gegn-stodu (hvad lid gefur fra ser)
   sem er allt annad en fantasy-stig varnarinnar. Kodinn var thvi ekki
   bara onotadur heldur ONOTHAEFUR med theim gognum sem til eru.

   AD HAFA HANN TILBUINN VAERI VERRA EN AD HAFA HANN EKKI: hann var
   aldrei profadur gegn thekktri tolu, svo fyrsta notkun hans yrdi lika
   fyrsta profun hans — i beinni, i september. Thurfi DST-stig sidar
   tharf FYRST heimild sem ber thau (BSD eda nflverse team-defense), og
   tha er formulan skrifud gegn theirri heimild og profud vid hana.
   ============================================================ */

/* ---------- stodur sem fantasy notar ---------- */

/** Stodurnar sem eiga heima i fantasy-deild. Adrar eru siadar burt. */
export const FANTASY_POS = ["QB", "RB", "WR", "TE", "K", "DST"];

/** nflverse/Sleeper nota olik heiti fyrir vorn. Samraemt hedan. */
export function normPos(p) {
  if (!p) return null;
  const s = String(p).toUpperCase();
  if (s === "DEF" || s === "D/ST" || s === "DST") return "DST";
  if (s === "PK") return "K";
  if (s === "FB") return "RB";     // fullbakkar eru RB i ollum deildum
  return FANTASY_POS.includes(s) ? s : s;
}
