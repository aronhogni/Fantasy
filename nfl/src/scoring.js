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

  /* ============================================================
     VORN/SERLID (DST) — MAELT GEGN SLEEPER 14.8.2026, EKKI AGISKAD
     ============================================================
     Hver ein af thessum tolum var LEST UT UR SLEEPER-STIGUM, ekki
     slegin inn eftir minni. Adferdin og allar tolur eru i
     `nfl/README.md` kafla 4k og i `scripts/dst-lab.mjs`; hér er
     adeins thad sem ma ekki tapast:

       · `dstFumForced = 1` var EKKI i fyrstu utgafu thessarar toflu og
         hun var thess vegna ROMG i 203 af 544 lidsvikum. Hun kom i
         ljos vid ad flokka leifina eftir sviðum, ekki vid lestur.
       · `dstPtsAllowed`-throskuldarnir eru LEIDDIR UT per staka
         `pts_allow`-tolu (0..52), ekki tekin af Sleeper-skjolun.
         Sonnunin er ad hvert eitt gildi ber EINA leif: pa=14..20 gefur
         0 i 130 af 132 rodum og pa=21..27 gefur 0 i 149 af 155.
       · OG THAR ER RAUNVERULEGT OSAMRAEMI HJA SLEEPER SJALFUM:
         `stats/nfl/{ar}/{vika}` birtir `pts_std` med
         **`pts_allow_14_20 = 0`** en RAUNVERULEG deild skorar hana
         **1** (`league/{id}/matchups/{vika}` -> `players_points`).
         Maelt: 43 af 43 tilfellum thar sem pa er 14-20 eru NAKVAEMLEGA
         +1 i deildinni, og 152 rodir utan bilsins eru jafnar.
         **DEILDIN ER HEIMILDIN**, svo taflan hér ber 1 — en sa sem
         akkerar gegn `stats`-endapunktinum verdur ad nota 0, annars
         maelist hann +1 ur engu.
     ============================================================ */
  dstSack: 1, dstInt: 2, dstFumRec: 2, dstTD: 6, dstSafety: 2, dstBlock: 2,
  dstFumForced: 1,       // forced fumble — MAELT, vantadi i fyrstu utgafu
  dstStTD: 6,            // kick/punt return TD
  /* Throskuldarnir eru `[<= mork, stig]` i hækkandi rod og SIDASTA
     rodin er `Infinity`. Hun er thar svo taflan geti aldrei fallid
     i gegn an svars — `dstBracket` skilar `null` ef ekkert grip er,
     og null er tha SYNILEG bilun i stad thegjandi nulls. */
  dstPtsAllowed: Object.freeze([
    Object.freeze([0, 10]), Object.freeze([6, 7]), Object.freeze([13, 4]),
    Object.freeze([20, 1]), Object.freeze([27, 0]), Object.freeze([34, -1]),
    Object.freeze([Infinity, -4]),
  ]),
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
   DST-STIGAREIKNINGUR — SKILYRDID SEM VAR SETT ER NU UPPFYLLT
   ============================================================
   Hér stod adur ad `dstPoints` hefdi verid FJARLAEGT viljandi, thvi
   hann myndadi lokadan hring, var ONOTHAEFUR med theim gognum sem til
   voru, og — thad sem skiptir mali —

     „Thurfi DST-stig sidar tharf FYRST heimild sem ber thau, og tha er
      formulan skrifud gegn theirri heimild og profud vid hana."

   **Baedi skilyrdin eru nu uppfyllt og thess vegna er hann kominn
   aftur.** Heimildirnar eru tvaer og OHADAR:

     1. nflverse `stats_team_week_{ar}.csv` ber `def_sacks`,
        `def_interceptions`, `def_tds`, `def_safeties`,
        `def_fumbles_forced`, `fumble_recovery_opp`,
        `fumble_recovery_tds`, `def_punt_blocks`, `def_pat_blocks`,
        `def_fg_blocks` og `special_teams_tds` — alla tiu lidina.
        (Fyrri fullyrdingin „vid eigum engin DST-gogn" atti vid
        `seasons.json` og `defense.json`; hun var rett um thaer skrar
        og rong um pipeline-heimildina, sem var THEGAR sott.)
     2. Sleeper birtir SIN EIGIN DST-stig per lid per viku, og
        raunveruleg deild birtir hvad hun skoradi. **Formulan er
        akkerud gegn BADUM** (`scripts/dst-lab.mjs`, README 4k):
        r = 0,996 / MAE 0,13 gegn deildinni og r = 0,997 / MAE 0,11
        gegn `stats`-endapunktinum, 90,2% og 90,9% UPP A STIGID.

   AKKERID FANN TVAER VILLUR SEM LESTUR HEFDI ALDREI FUNDID og baðar
   eru bakadar inn i kodann hér:
     · `fumble_recovery_tds` ER varnar-touchdown i Sleeper-bokhaldi.
       nflverse skiptir theim i tvo svid (`def_tds` = skilamork eftir
       gripið sendingu o.fl.) og su sem var sleppt kostadi MAE
       0,306 -> 0,112.
     · `def_fumbles_forced` er stigagefandi (1). An hennar fell
       nakvaemnin ur 90,9% i 50,9%.

   OG EITT SEM AKKERID GAT EKKI LEYST — thad er skrifad hér svo naesti
   lesandi endurmæli thad ekki: nflverse `fumble_recovery_opp` skilur
   EKKI serlids-endurheimtur fra varnar-endurheimtum, en Sleeper skorar
   thaer 1 (`def_st_fum_rec`) a moti 2. Thad er +1 skekkja i **27 af 544**
   lidsvikum (5,0%) og hun er OLEYSANLEG med thessum gognum. Hun er
   ekki „hávaði"; hun er thekkt, taluð og efri mörk a nakvaemninni.
   ============================================================ */

/**
 * AKKERID, BAKAD VID HLIDINA A FORMULUNNI SEM THAD VER.
 *
 * Sama mynstur og `WEEKLY_MEASURED` i `weekview.js`: tolurnar bua i
 * `data/measure/dst.json` en eru bakadar hingad svo `dstPoints` beri
 * SITT EIGID PROF med ser. `tests/dst.mjs` kafli 1 ber thaer saman og
 * fellur ef labid er endurkeyrt med annarri utkomu — tha uppfaerir
 * madur TOFLUNA, ekki profid.
 *
 * `exactPct` er hlutfall lidsvikna thar sem talan er RETT UPP A STIGID,
 * ekki „innan skekkjumarka". Su krafa er hord af asettu radi: fantasy-
 * stig eru heiltolur og deildin borgar ekki fyrir naerri-rett.
 */
export const DST_ANCHOR = {
  source: "data/measure/dst.json · dst-lab.mjs · 2025 · 14.8.2026",
  /* C — raunveruleg Sleeper-deild (`players_points`). URSLITAHEIMILDIN. */
  vsLeague: { n: 209, r: 0.996, mae: 0.124, exactPct: 90.431 },
  /* B — Sleeper `stats`-endapunkturinn, oll 32 lidin. Athugid ad hann
     tharf ADRA throskuldatoflu (`pts_allow_14_20 = 0`); med okkar toflu
     mælist hann 70,6% og su tala er EKKI villa i formulunni. */
  vsPublished: { n: 544, r: 0.997, mae: 0.108, exactPct: 91.176 },
  vsPublishedWithLeagueBrackets: { exactPct: 70.588 },
  /* Leifin, FLOKKUD. „Havadi" er ekki svar; hvert einasta frávik er
     rakid, og staersti flokkurinn er thekkt takmorkun a gognunum. */
  residuals: {
    "special-teams fumble recovery scored 2, Sleeper scores 1": 27,
    "forced-fumble count differs between nflverse and Sportradar": 8,
    "sack count differs between nflverse and Sportradar": 7,
    unresolved: 6,
  },
  /* Sleeper er osammala SJALFUM SER, og thad er talid. */
  sleeperSelfDisagreement: { agree: 160, differ: 49, delta: 1 },
};

/* ============================================================
   `dn` — HVERS VEGNA DST NOTAR ADRA TOLU-VORPUN EN `offensePoints`
   ============================================================
   `n` ofar krefst `typeof v === "number"`. Thad er RETT thar sem thad
   er notad: `weeklyStats` byggir tolulegt afrit af CSV-rodinni ADUR en
   `offensePoints` er kolluð, svo strengur kemst aldrei ad.

   DST-hlidin hefur ekki thann milliid: labid les
   `stats_team_week_{ar}.csv` og sendir rodina BEINT inn. Med `n` gaf
   thad **0 fyrir hvert einasta stigagefandi svid** og eftir stod adeins
   throskuldurinn — medaltal 0,47 stig a viku i stad 7,33, og akkerid
   las bias nakvaemlega -7,08 gegn Sleeper.

   ÞAD FANNST VID FYRSTU AKKERIS-KEYRSLU, og thad er nakvaemlega thess
   vegna sem akkerid var skrifad FYRIR persistence-tolurnar: an thess
   hefdi ferillinn milli ara verid reiknadur ur nanast tomri formulu og
   hann hefdi litid alveg venjulega ut (r = 0,258 a moti rettu 0,304).

   `dn` tekur thvi vid tolu EDA tolustreng. `"NA"`, `""`, `null` og
   rusl fara i 0 — sama merking og `num` i `scripts/lib/csv.mjs`, svo
   thaer tvaer geta ekki rekid i sundur.                             */
const dn = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v !== "string" || v === "" || v === "NA") return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/**
 * Throskuldur fyrir stig a sig. `null` inn -> `null` ut.
 *
 * SKILAR NULL EF TAFLAN GRIPUR EKKI. Fyrsta utgafan skiladi 0 i thvi
 * tilfelli og thad er nakvaemlega gildran: 0 er RAUNVERULEGT gildi i
 * thessari toflu (bilid 21-27), svo „engin tafla" og „hlutlaust bil"
 * hefdu lesid eins. Sidasta rodin er `Infinity`, svo null getur i raun
 * adeins komid fram ur skemmdri toflu — og tha a hun ad sjast.
 */
export function dstBracket(pointsAllowed, table = BASE.dstPtsAllowed) {
  if (pointsAllowed == null || !Number.isFinite(Number(pointsAllowed))) return null;
  if (!Array.isArray(table) || !table.length) return null;
  const pa = Number(pointsAllowed);
  for (const row of table) {
    if (!Array.isArray(row) || row.length < 2) continue;
    if (pa <= row[0]) return row[1];
  }
  return null;
}

/**
 * STIG A SIG FYRIR FANTASY-VORN — OG THAD ER EKKI LOKASTADAN.
 *
 * MAELT 14.8.2026 gegn Sleeper `pts_allow` a 527 lidsvikum 2025:
 *
 *   heil lokastada motherjans                        476/527 = 90,3%
 *   adeins soknarstig motherjans (TD+FG+PAT+2pt)      499/527 = 94,7%
 *   **lokastada MINUS 6·(varnar-TD motherjans)
 *     MINUS 2·(safety motherjans)**                  **525/527 = 99,6%**
 *
 * Thridja formulan er su sem er notud og hun er RETT AF ASTAEDU:
 * fantasy-vornin er ekki a vellinum thegar hin vornin skorar a MINA
 * sokn, svo those stig eru ekki hennar sok. **Endurkomu-touchdown a
 * serlidi (`special_teams_tds`) er hins vegar TALINN MED** — thad var
 * maelt, ekki alyktað: sú útgáfa sem dró hann lika fra fell i 501/527.
 *
 * Tvaer rodir sem eftir standa (ARI viku 5 og 15, 2025) eru
 * `fumble_recovery_tds` hja motherjanum sem Sleeper faerdi a SOKNINA.
 * Thaer eru taldar hér svo enginn telji thaer aftur.
 *
 * `oppRow` er lidsrod MOTHERJANS ur `stats_team_week` — ekki min.
 * Vanti annad hvort inntakid: **null, ekki lokastadan hra**. Skekkja
 * upp a 6 eda 12 stig a sig getur haggad throskuldi um tvo threp.
 */
export function dstPointsAllowed(oppFinalScore, oppRow) {
  if (oppFinalScore == null || oppFinalScore === "" ||
      !Number.isFinite(Number(oppFinalScore))) return null;
  if (!oppRow || typeof oppRow !== "object") return null;
  const defTds = dn(oppRow.def_tds) + dn(oppRow.fumble_recovery_tds);
  return Number(oppFinalScore) - 6 * defTds - 2 * dn(oppRow.def_safeties);
}

/**
 * Fantasy-stig fyrir VORN/SERLID (DST) ur einni lidsrod i
 * `stats_team_week`. Svidaheitin eru nflverse-heiti OBREYTT, sama regla
 * og `offensePoints` — ein dalkaskra alla leid i gegn.
 *
 * `points_allowed` er thad EINA svid sem er OKKAR (nflverse ber thad
 * ekki); thad kemur ur `dstPointsAllowed`.
 *
 * NULL ER EKKI NULL, OG THAD ER TVISVAR HER:
 *   · engin rod            -> `null`. Lid an raðar spiladi ekki (auð
 *     vika); 0 stig er RAUNVERULEG utkoma og ma ekki lesast eins.
 *   · engin stig a sig     -> `null`. Throskuldurinn er −4 til +10, svo
 *     ad sleppa honum gefur tolu sem er allt ad 14 stigum fra retta
 *     svarinu — og hun litur nakvaemlega eins ut og maeld tala.
 */
export function dstPoints(r, R = BASE) {
  if (!r || typeof r !== "object") return null;
  const bracket = dstBracket(r.points_allowed, R.dstPtsAllowed);
  if (bracket == null) return null;

  let pts = bracket;
  pts += dn(r.def_sacks) * R.dstSack;
  pts += dn(r.def_interceptions) * R.dstInt;
  pts += dn(r.fumble_recovery_opp) * R.dstFumRec;
  pts += dn(r.def_safeties) * R.dstSafety;
  /* BADAR TD-SVIDIN. nflverse skiptir varnar-touchdownum i tvennt og
     Sleeper leggur thau saman — sja akkerid ad ofan. */
  pts += (dn(r.def_tds) + dn(r.fumble_recovery_tds)) * R.dstTD;
  pts += (dn(r.def_punt_blocks) + dn(r.def_pat_blocks) + dn(r.def_fg_blocks)) * R.dstBlock;
  pts += dn(r.special_teams_tds) * R.dstStTD;
  pts += dn(r.def_fumbles_forced) * R.dstFumForced;
  return pts;
}

/* ---------- stodur sem fantasy notar ---------- */

/** Stodurnar sem eiga heima i fantasy-deild. Adrar eru siadar burt. */
export const FANTASY_POS = ["QB", "RB", "WR", "TE", "K", "DST"];

/**
 * nflverse/Sleeper nota olik heiti fyrir vorn. Samraemt hedan.
 *
 * ============================================================
 * STADA SEM ER EKKI I `FANTASY_POS` FER OBREYTT UT — ASETT
 * ============================================================
 * Hér stod `return FANTASY_POS.includes(s) ? s : s`, thar sem BADAR
 * greinar eru sama gildid: skilyrdid var einskis virdi og las eins og
 * sia sem sfar ekki. Þad er verri gerd af daudum koda en onotad fall,
 * thvi hann laetur lesandann alyta ad eitthvad se siad hér.
 *
 * OG HANN MA EKKI VERDA `: null`, sem er tha eina sem hann liti ut fyrir
 * ad hafa aetlað ad vera. Tvennt i pipeline-inu byggir a thvi ad staða
 * utan fantasy fari OBREYTT ut:
 *   · `nflverse.depth()` skrifar `pos: normPos(r.position) ||
 *     normPos(r.depth_position)` og heldur rodinni ef `pos` er satt.
 *     Med `null` myndi ALLUR varnar-hluti djupt-listans hverfa thegjandi.
 *   · kallendur sia sjalfir (`["QB","RB","WR","TE","K"].includes(pos)`),
 *     sem er retti stadurinn: sian tilheyrir spurningunni, ekki vorpuninni.
 * `null` er thvi geymt fyrir "ekkert var gefid" (fyrsta linan) og er
 * ADGREINANLEGT fra "gefid, en ekki fantasy-stada".
 *
 * Vordur: `tests/waivers.mjs` kafli 10b — stadu-orðaforðinn sem
 * `rankedPos` ber sig vid kemur hedan, og hann var OPROFADUR.
 */
export function normPos(p) {
  if (!p) return null;
  const s = String(p).toUpperCase();
  if (s === "DEF" || s === "D/ST" || s === "DST") return "DST";
  if (s === "PK") return "K";
  if (s === "FB") return "RB";     // fullbakkar eru RB i ollum deildum
  return s;
}
