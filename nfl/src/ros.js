/* ============================================================
   ros.js — REST-OF-SEASON GJALDMIDILLINN. HREIN.

   Ekkert React, ekkert `fetch`. Tekur vid viku-rodum, leikjaskra og
   bordinu og skilar VBD sem er reiknad UR THVI SEM ER EFTIR AF
   TIMABILINU, ekki ur timabilinu ollu.

   ============================================================
   HVERS VEGNA SER EINING OG EKKI INNI I `usageblend.js`
   ============================================================
   Baedi log lesa `data/weekly/{ar}.json` og badi svara "hvad hefur
   gerst i thessu timabili", svo thad vaeri edlilegt ad setja thau
   saman. THAU ERU SAMT SITTHVOR MAELINGIN og bera SITTHVORN
   MATSMANNINN:

     · `usageblend` kemur ur `usage-lab` og metur mann a
       `opp_prior · last3 · bayes10` — taekifaeri, varpad gegnum
       thversnids-`z`.
     · thetta kemur ur `waiver-lab` og metur mann a SKRUNKNU MEDALTALI
       stiga, `(k*prior + stig hingad til) / (k + leikir lidsins)` med
       **k = 4** (`provenance.params.k`).

   Ad lata annad theirra fada hitt vaeri ad senda samsetningu sem VAR
   ALDREI MAELD undir nafni maelingar sem var gerd. Their eru thvi
   adskildir og hvor ber sina tolu.

   ============================================================
   HVAD VAR MAELT
   ============================================================
   `scripts/waiver-lab.mjs`, 169.368 hermdar deildar-timabil,
   2019-2025, 14 vikur, hvert annad saeti keyrandi SENDU regluna:

     gjaldmidill                          gegn timabils-VBD
     -------------------------------------------------------
     ROS-VBD, pro-rata golf   **+13,6 stig/timabil**  7/7 ar
     ROS-VBD, algilt golf       +13,3               7/7 ar
     vikuspa (VBD)              -74,1               0/7 ar
     vikuspa (hra stig)        -115,7 undir theirri  0/7 ar

   ROS vann i **17 af 18** stokum frumum. Ad elta EINA VIKU er ekki
   bara verra en ROS heldur verra en ad gera ekki neitt sertakt —
   thad churn-ar burt timabils-virdi.

   ============================================================
   OG GOLFID VERDUR AD VERA PRO-RATA. THETTA ER ADALATRIDID.
   ============================================================
   `rosVbd` og `rosVbdPro` eru SAMI GJALDMIDILLINN. Eini munurinn er
   hvernig `minGain` er beitt, og hann raedur ollu:

     golf 0 - golf 10, samlagt yfir niu frumur (jakvaett = golf 10
     KOSTAR stig):

       timabils-VBD (sent i dag)   -0,4  CI [-2,1 · 1,4]   ekki markt
       ROS-VBD, ALGILT golf        +7,1  CI [ 3,8 · 10 ]   **MARKT**
       ROS-VBD, PRO-RATA golf      +0,1  CI [-1,1 · 1,3]   ekki markt

   Sama tala (10) er ALLT ONNUR KRAFA i viku 3 og i viku 13: i viku 13
   eru tvaer vikur eftir, svo "10 stig yfir timabilid" er krafa sem
   nanast enginn getur uppfyllt og verkfaerid thagnar nakvaemlega
   thegar deildin er ad radast. Med algildu golfi kostar thad 7,1 stig
   a timabili og CI utilokar null.

   PRO-RATA GOLFID GERIR VALID OSKADLEGT: +0,1 med CI sem inniheldur
   null thydir ad thad SKIPTIR EKKI MALI hvada tala er valin. Og thad
   er nakvaemlega thad sem tharf, thvi `minGain` er VIDURKENND VALIN
   TALA innan maelds afskiptaleysis-bands (`WAIVER_CAL.minGain`).

   Formulan er tekin ordrett ur labinu (`design.floorScaling`):
     golf(w) = golf * (VIKUR - w + 1) / VIKUR

   ============================================================
   HVAD ER EKKI MAELT HER
   ============================================================
   Labid keyrdi a 14 vikum (`provenance.params.weeks`). Deildin hans
   getur haft adra lengd, og hun er LESIN (`playoffWeekStart - 1`),
   ekki hardkodud — sama regla og `SEASON_LIVE_LABEL` i
   FPL-verkefninu: fost tímabils-tala úreldist thegjandi.

   EN AD LESA HANA ER EKKI SAMA OG AD HAFA MAELT HANA. Vinningurinn
   +13,6 var maeldur a 14 vikum; deild med 15 reglulegar vikur faer
   sama FORM en ekki sannreynda toluna. Thad er skrifad hér i stad
   thess ad thegja um thad.                                          */

import { computeVbd } from "./model.js";
/* ============================================================
   LIDSKODINN ER SAMRAEMDUR VID LESTUR (31.8.2026)
   ============================================================
   `schedule.json` og `team_form.json` baru `LA` fyrir Rams medan
   `players.json`, `defense.json` og `weekly/*` bera `LAR`. Skrifin eru
   lagfaerd i `scripts/sources/nflverse.mjs`, EN thad daekkir ekki
   skrarnar sem eru ThEGAR committadar — og `schedule_history.json` er
   eins-skiptis afurð sem verdur aldrei sott aftur. Þess vegna er
   samraemt BADUM MEGIN: vid skrif svo gogn framtidarinnar seu rett, og
   vid lestur svo gogn dagsins i dag seu thad lika.

   MAELT ADUR EN ThESSU VAR BREYTT: Rams-vornin flogguð "audur leikur"
   i 17 vikum af 17, `teamGames` felldi 22 leikmenn, og 386
   leikmanna-vikur gegn Rams tapadu DvP-lidnum thegjandi.             */
import { normTeam } from "./names.js";

/* ============================================================
   MAELDA TAFLAN — BOKUD, OG PROFID BER HANA VID DISKINN
   ============================================================
   Sama regla og `USAGE_BLEND` og `WEEKLY_MEASURED`: vidmotid og
   nóturnar lesa thessar tolur, svo thaer eru bakaðar hingad — EN
   `tests/waivers.mjs` ber hverja theirra vid
   `data/measure/waiver.json` og FELLUR ef thaer reka.

   AF HVERJU THETTA ER EKKI PARANOJA: nótan i `WAIVER_CAL.currency`
   bar "+13,2 stig/timabil (t=2,97, 6 af 7 timabilum, CI [5,9 · 22,2])"
   og conditional-fundurinn "+5,4 CI [2,2 · 8,2]". HVORUG TALAN ER I
   SKRANNI. Labid var endurkeyrt 14.8.2026 kl. 23:08 og tolurnar
   færdust — nótan var skrifud fyrir thad og engum vardi datt i hug ad
   bera hana saman, svo tvaer heimildir badu um sama sannleikann og
   sogdu sitthvad i tiu daga. Nu getur thad ekki gerst thegjandi.    */
export const ROS_MEASURED = {
  source: "data/measure/waiver.json · waiver-lab.mjs · 2026-08-14T23:08Z",
  seasons: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
  leagueRuns: 169368,
  labWeeks: 14,
  kPrior: 4,

  /* gegn timabils-VBD, samlagt yfir niu (logun x snid) frumur */
  currency: {
    proRatedFloor: { mean: 13.6, t: 3.331, years: 7, wins: 7, lo: 7.1, hi: 21.9 },
    absoluteFloor: { mean: 13.3, t: 3.523, years: 7, wins: 7, lo: 7.3, hi: 21.1 },
    weekVbd:       { mean: -74.1, t: -7.763, years: 7, wins: 0, lo: -90.6, hi: -56.2 },
    cells: 18, positiveCells: 17, significantCells: 8,
  },

  /* golf 0 - golf 10. Jakvaett = golfid 10 KOSTAR stig. */
  floorCost: {
    seasonVbd: { mean: -0.4, lo: -2.1, hi: 1.4, excludesZero: false },
    rosVbd:    { mean: 7.1,  lo: 3.8,  hi: 10,  excludesZero: true },
    rosVbdPro: { mean: 0.1,  lo: -1.1, hi: 1.3, excludesZero: false },
  },

  measured: true,
  note: "Rest-of-season VBD beats season VBD by 13.6 points a season (7 of 7 " +
        "seasons, CI [7.1, 21.9]) and wins 17 of 18 individual cells. THE FLOOR " +
        "MUST BE PRO-RATED: with an absolute floor, floor 0 beats the shipped " +
        "floor 10 by 7.1 points (CI [3.8, 10], excludes zero) — the same number " +
        "is a far harsher demand in week 13 than in week 3, so the tool goes " +
        "quiet exactly when the league is being decided. Pro-rating makes the " +
        "choice immaterial (+0.1, CI [-1.1, 1.3]), which is what an admittedly " +
        "CHOSEN number needs. Not measured: league lengths other than 14 weeks.",
};

/** Stigagjafar-svid i viku-rodunum. Sama vorpun og `usageblend`. */
const POINTS_FIELD = { ppr: "ppr", "half-ppr": "half", standard: "std" };

/* Stodurnar sem ROS-gjaldmidillinn naer yfir. K og DST eru UTAN — thau
   eru utan draftsins og utan hvers einasta skiptis i labinu
   (`design.excluded`), og `data/weekly` ber ENGAR DST-radir yfirleitt.
   Ad reikna ROS fyrir thau vaeri tala an maelingar. */
const ROS_POS = ["QB", "RB", "WR", "TE"];

/* `Number(null)` ER 0, EKKI NaN — og `Number("")` lika. An fyrstu
   linunnar hleypir thetta fall `null` i gegn sem RAUNVERULEGRI NULLU,
   sem er nakvaemlega reglan "NULL ER EKKI NULL" a hvolfi. Hun kostadi
   thrju atridi i einu i fyrstu utgafu thessarar skrar og prófid tok
   thau oll:
     · `proRatedFloor(f, { week: null })` gaf `10 * 15/14`, ekki `f`
     · rod an `week` i vikuskranni taldist vika 0 og for INN i
       "stig hingad til" — leki
     · leikmadur an spar fekk `proj: 0` i stad thess ad vera slept, og
       thar med ROS-verd ur engu
   `waivers.js` ber somu vord i sinu `num`; thetta afrit vantadi hana. */
const num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ============================================================
   1. STIGIN SEM ERU KOMIN — OG `throughWeek` ER UTILOKANDI
   ============================================================ */

/**
 * Stig hingad til per leikmadur, an leka.
 *
 * @returns `Map<gsisId, { pts, games }>`. Tom Map er GILT SVAR (vika 1).
 *
 * `<` og aldrei `<=`, sama regla og `usageToDate`: leikur i viku `w`
 * ma ekki telja thegar spad er viku `w`. Thad er haettulegasti lekinn
 * i verkefninu thvi hann gefur arm sem LITUR UT eins og spa.
 */
export function pointsToDate(weeklyRows, { throughWeek, scoring } = {}) {
  const out = new Map();
  if (!Array.isArray(weeklyRows)) return out;
  const through = num(throughWeek);
  if (through == null) return out;
  const field = POINTS_FIELD[scoring];
  if (!field) return out;

  for (const r of weeklyRows) {
    if (!r || typeof r !== "object" || r.id == null) continue;
    const wk = num(r.week);
    if (wk == null || wk >= through) continue;
    const p = num(r[field]);
    const key = String(r.id);
    const cur = out.get(key) || { pts: 0, games: 0 };
    /* Rod an stiga telst SAMT sem leikur — hann spiladi og skoradi 0.
       Ad sleppa henni vaeri ad hækka `ppg` hans fyrir ad hafa blankad. */
    cur.pts += p == null ? 0 : p;
    cur.games++;
    out.set(key, cur);
  }
  return out;
}

/* ============================================================
   2. LEIKIRNIR SEM EFTIR ERU — PER LID, UR LEIKJASKRANNI
   ============================================================ */

/**
 * `Map<lid, { played, left }>` fyrir eitt timabil.
 *
 * `left` telur vikur `[week .. lastRegWeek]` — REGLULEGU vikurnar
 * einar. Vaeri talid til viku 18 pro-rata-di gjaldmidillinn yfir vikur
 * sem deildin SPILAR EKKI, og madur med gott umspil (sem er engum til
 * gagns) maeldist betri en hann er.
 *
 * AUD VIKA ER SJALFKRAFA RETT MEDHONDLUD og thad er ekki tilviljun:
 * talan er fjoldi LEIKJA i skranni, ekki fjoldi vikna, svo lid i frii
 * i viku 9 faer einum leik faerra an thess ad nokkur regla um fri se
 * skrifud.
 */
export function teamGames(schedule, { season, week, lastRegWeek } = {}) {
  const out = new Map();
  if (!Array.isArray(schedule)) return out;
  const yr = num(season), from = num(week), last = num(lastRegWeek);
  if (yr == null || from == null || last == null) return out;

  const bump = (team, key) => {
    if (!team) return;
    const cur = out.get(team) || { played: 0, left: 0 };
    cur[key]++;
    out.set(team, cur);
  };
  for (const g of schedule) {
    if (!g || num(g.season) !== yr) continue;
    if (g.type != null && g.type !== "REG") continue;
    const wk = num(g.week);
    if (wk == null) continue;
    const H = normTeam(g.home), A = normTeam(g.away);
    if (wk < from) { bump(H, "played"); bump(A, "played"); }
    else if (wk <= last) { bump(H, "left"); bump(A, "left"); }
  }
  return out;
}

/* ============================================================
   3. GJALDMIDILLINN
   ============================================================ */

/**
 * Pro-rata golfid. `design.floorScaling`, ordrett.
 *
 * Bundid ad nedan vid 0: neikvaett golf vaeri krafa sem hleypir
 * TAPANDI skiptum i gegn, og thad er ekki thad sem 10 thydir i neinni
 * viku.
 */
export function proRatedFloor(floor, { week, lastRegWeek } = {}) {
  const f = num(floor);
  if (f == null) return null;
  const w = num(week), last = num(lastRegWeek);
  if (w == null || last == null || last <= 0) return f;
  const left = Math.max(0, last - w + 1);
  return Math.max(0, (f * left) / last);
}

/**
 * ROS-VBD fyrir hvern leikmann a bordinu.
 *
 * @returns `{ vbd, weeksLeft, weeks, priced, basis }` eda **`null`**.
 *
 * `null` ER FORLEIKS-SVARID og thad er thad sem gerir tenginguna
 * baetis-eina: an vikuskrar, an viku, an leikjaskrar eda i viku 1
 * (thar sem engin fyrri vika er til) fellur `pickupAdvice` i
 * timabils-VBD nakvaemlega eins og adur.
 *
 * ALLT-EDA-EKKERT ER ASETT. `vbd` er Map og leikmadur sem vantar i
 * hana er OVERDLAGDUR, ekki 0 — `pickupAdvice` telur hann i `unpriced`
 * og segir fra honum. Ad blanda saman timabils-VBD og ROS-VBD i sama
 * samanburdi vaeri ad bera saman tvo gjaldmidla og kalla mismuninn
 * abata; thad er nakvaemlega villan sem `xg_share` 148% var i
 * FPL-verkefninu (teljari og nefnari ur sitthvorri heimild).
 */
export function rosCurrency({ rows, weeklyRows, schedule, season, week,
                              lastRegWeek, scoring, league } = {}) {
  if (!Array.isArray(rows) || !rows.length) return null;
  if (!Array.isArray(weeklyRows) || !weeklyRows.length) return null;
  if (!Array.isArray(schedule) || !schedule.length) return null;
  const w = num(week), yr = num(season), last = num(lastRegWeek);
  if (w == null || yr == null || last == null) return null;
  if (w < 2 || w > last) return null;          /* vika 1: engin fyrri vika */
  if (!POINTS_FIELD[scoring]) return null;

  const pts = pointsToDate(weeklyRows, { throughWeek: w, scoring });
  if (!pts.size) return null;
  const games = teamGames(schedule, { season: yr, week: w, lastRegWeek: last });
  if (!games.size) return null;

  /* --- ROS-spa per leikmann: `ppg * leikir eftir` --- */
  const k = ROS_MEASURED.kPrior;
  const list = [];
  for (const r of rows) {
    if (!r || !ROS_POS.includes(r.pos)) continue;
    const proj = num(r.proj);
    if (proj == null) continue;
    const tg = r.team ? games.get(normTeam(r.team)) : null;
    if (!tg) continue;
    /* Forgildid er a PER-LEIK kvarda, eins og i labinu. */
    const prior = proj / 17;
    const got = (r.gsisId != null && pts.get(String(r.gsisId))) || { pts: 0, games: 0 };
    const ppg = (k * prior + got.pts) / (k + tg.played);
    list.push({ row: r, proj: ppg * tg.left });
  }
  if (!list.length) return null;

  /* VARAMANNS-THREPID ER REIKNAD UPP A NYTT UR ROS-SPANNI og thad er
     ekki smaatridi heldur ASTAEDAN fyrir thvi ad ROS er ekki bara
     timabils-VBD skalad nidur. Vaeri threpid tekid ur timabils-spanni
     yrdi rodin EINS og allur maeldi vinningurinn hyrfi. */
  const scored = computeVbd(list.map((x) => ({ pos: x.row.pos, proj: x.proj })), league);

  const vbd = new Map();
  let priced = 0;
  scored.forEach((s, i) => {
    if (s.vbd == null) return;
    vbd.set(String(list[i].row.id), s.vbd);
    priced++;
  });
  if (!priced) return null;

  return {
    vbd,
    weeks: last,
    weeksLeft: Math.max(0, last - w + 1),
    priced,
    basis: "rosVbdPro",
  };
}
