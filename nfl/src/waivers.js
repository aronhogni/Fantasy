/* ============================================================
   waivers.js — HVER ER LAUS, OG ER HANN BETRI EN SA VERSTI HJA MER?
   HREIN. Ekkert React, engin netkoll, engin gogn lesin af disk.

   Hun tekur vid THVI SEM ER THEGAR TIL — rodunum ur `buildRows` og
   hopunum ur Sleeper — og skilar tveimur svorum:

     1. HVERJIR ERU LAUSIR       (`freeAgents`)
     2. A AD SKIPTA, OG VID HVERN (`pickupAdvice`)

   Astaedan fyrir thvi ad hun er utan .jsx er sama og annars stadar i
   thessu repo: profin verda ad geta keyrt NAKVAEMLEGA thad sem appid
   birtir. Vaeri hun inni i .jsx gaeti profid adeins profad AFRIT.

   ============================================================
   HVERS VEGNA "EKKI PIKKA NEINN UPP" ER GILT SVAR
   ============================================================
   Verkfaeri sem finnur ALLTAF skipti er gagnslaust — thad segir thad
   sama hvad sem gognin segja, og notandinn laerir a viku ad hunsa
   thad. Sama aett og vidvorunar-kassinn i FPL-appinu sem var alltaf
   raudur: kassi sem er alltaf raudur haettir ad segja neitt.

   `pickupAdvice` skilar thvi TOMU FYLKI thegar enginn i lauginni
   slaer thann sem er odyrast ad missa. Thad er nidurstada, ekki bilun.

   ============================================================
   GJALDMIDILLINN ER `vbd`, OG THAD ER MAELT
   ============================================================
   Skiptin eru verdlogd i VIRDI YFIR VARAMANNI I THINNI DEILD (`vbd`
   ur `model.js`), thvi thad er talan sem A-Ranking radar eftir og
   A-Ranking er thad sem VAR MAELT: +233,6 stig gegn hrau ADP,
   vinnur oll fimm timabilin, bootstrap klosad per timabil utilokar
   null (sja langa notu i `build.js`).

   TVENNT SEM MA EKKI RUGLAST:
     · `gain` er MUNUR A VBD, ekki munur a spadum stigum. Milli stada
       eru varamanns-threpin olik, svo `proj_a - proj_b` er ekki
       sambaerileg tala en `vbd_a - vbd_b` er thad — nakvaemlega thess
       vegna er A-Ranking EINN listi og ekki fjorir.
     · Talan er TIMABILS-tala. Vikuleg utgafa vaeri `weeklyProjection`
       (leikjaflaedi x vorn), og hun ER maeld — `startsit-lab` lokar
       5,8% af bilinu, t=4,33, 7/7 ar. EN hun tharf vaent stigaskor
       ur markadslinu vikunnar og vorn andstaedingsins, og HVORUGT er
       i rodunum sem thetta fall faer. Thess vegna er hun ekki her, og
       thess vegna er thad SAGT i stad thess ad naegjast vid nalgun sem
       liti ut eins og vikuleg tala.

   ============================================================
   STODUTHORF RAEDUR ENGU — MAELT OG HAFNAD, THRISVAR
   ============================================================
   Freistnin er ad rada eftir "hvad vantar mig": tomt WR-saeti a ad
   toga WR upp listann. THAD VAR MAELT I THREMUR MYNDUM OG ENGIN
   THEIRRA SLAER "BESTA LAUSA MANN":

     · 19 stoduplon (`strategy-lab.mjs`)          ekkert marktaekt
     · bradanauðsyn sem ROD (`advice-lab.mjs`)    -63,8 i standard,
                                                  vinnur 0 af 4 arum
     · lifunarlikur sem jafnteflis-rof            t = -0,06 / +0,79
       (`tiebreak-lab.mjs`)

   Thorfin er thvi NEFND i `why` og MERKT "noted, not ranked", sama
   ordalag og `reasonsFor` i `advice.js`. Strengur sem stendur i dalki
   sem heitir "Why" les eins og hann hafi radid — og thad vaeri sama
   aett af villu og omaeld tala i eigin reit.

   Eina undantekningin er RETTLEIKS-GOLF, ekki rodun: skipti sem
   skildi byrjunarlidid OFYLLANLEGT er ekki skipti heldur villa. Sja
   `allowedSwap`. Golfid getur adeins VARDVEITT thad sem hopurinn
   hefur thegar — thad getur ekki KRAFIST thess ad hann se fullur,
   annars faerdi hopur sem er hálfur engin rad.
   ============================================================ */

import { normalizeLeague } from "./build.js";
import { availability } from "./model.js";
import { slotsFor } from "./lineup.js";

/* ============================================================
   KVORDUNIN — HVER TALA OG HVORT HUN ER MAELD
   ============================================================
   Hver rod ber `measured`. Thad er ekki skraut: talan sem er VALIN og
   talan sem er MAELD lita nakvaemlega eins ut i kodanum, og su fyrri
   er versta utkoman i thessu repo-i thvi hun er rong OG truverdug.
   Vordur: `tests/waivers.mjs` fellur ef rod vantar `measured`, `note`
   eda ef `minGain` er merkt maeld.                                 */
export const WAIVER_CAL = {
  rankedPos: {
    value: ["QB", "RB", "WR", "TE"],
    measured: true,
    note: "K and DST are excluded on both sides of every swap. They were left " +
          "out of every simulation that validates the VBD order (excludePos in " +
          "accuracy.js), and their VBD prices DST1 around pick 77 — which nobody " +
          "drafts. Pricing a kicker swap would put an unmeasured number next to " +
          "measured ones without saying so.",
  },
  currency: {
    value: "vbd",
    measured: true,
    note: "Gain is the difference in value over replacement for YOUR league, not " +
          "the difference in projected points. A-Ranking (the VBD order) beat raw " +
          "ADP by 233.6 points and won all five clean seasons (model_eval_ppr.json, " +
          "models[0] `Sleeper projection -> VBD`, vsAdp.diff 233.56, CI " +
          "[148.8, 296.1]); that is the measured " +
          "claim this ranking rests on. AND THE WEEKLY ALTERNATIVE IS MEASURED " +
          "DEAD: waiver-lab puts a weekly-projection currency at -74.6 points a " +
          "season against this one (CI [-91, -57]), and dropping the " +
          "replacement-level adjustment entirely (raw weekly points) at -118 more. " +
          "Chasing one week churns away season value. BUT THIS IS NOT THE BEST " +
          "CURRENCY EITHER: rest-of-season VBD, pro-rated, beats season VBD by " +
          "+13.2 points a season (t=2.97, 6 of 7 seasons, CI [5.9, 22.2], positive " +
          "in 17 of 18 cells). It is not used here because it CANNOT BE: it needs " +
          "the weeks that remain and the season-to-date usage behind them, and the " +
          "app cannot yet supply both. THE PLUMBING HALF IS NOW DONE: data.js has " +
          "loadWeekly(season) and the pipeline archives the current season " +
          "weekly (nfl-data.yml, Tuesdays). What is still missing is the SEASON " +
          "ITSELF - data/weekly/ stops at 2025 because 2026 has not been played. " +
          "In preseason the two currencies are identical anyway, so nothing is " +
          "lost today; the switch becomes live and testable in week 2. " +
          "See README 4g.",
  },
  minGain: {
    value: 10,
    measured: false,
    note: "STILL NOT MEASURED — but no longer for want of trying. The lab this " +
          "note used to ask for now exists (scripts/waiver-lab.mjs, 169,368 " +
          "simulated league-seasons, 2019-2025, every other seat running this " +
          "same rule) and its answer is that the floor is NOT MEASURABLE: paired " +
          "on identical drafts, floor 0 minus floor 10 is +0.5 points a season, " +
          "CI [-0.7, +1.8]. Walk-forward selection of the floor does not beat " +
          "floor 0 either (+3.9, t=1.37 in 10-team PPR; +1.3, t=0.48 in 12-team " +
          "half). 10 is exactly as defensible as 0, and the two leagues do not " +
          "measurably want different floors. So this stays `measured: false`: the " +
          "value is a choice inside a measured indifference band, which is a " +
          "different and honest thing from an unexamined guess. ONE CONDITIONAL " +
          "FINDING travels with it: if `currency` ever becomes rest-of-season, an " +
          "ABSOLUTE floor starts to hurt (floor 0 minus floor 10 = +5.4, CI " +
          "[2.2, 8.2]) and must be pro-rated to the weeks that remain.",
  },
  /* ============================================================
     GILDID VERDUR AD VERA THAD SEM `confidenceOf` RAUNVERULEGA PROFAR
     ============================================================
     Hér stod `"gain >= minGain AND vbd > 0 AND ..."` og fyrsti lidurinn
     var EKKI i fallinu — hann getur ekki verid thar: `pickupAdvice` siar
     eftir golfinu ADUR (`gain < floor -> continue`), svo hver rod sem
     kemst til `confidenceOf` hefur THEGAR stadid thad. Skilyrdi sem getur
     ekki brugdist er ekki skilyrdi, og skjalað skilyrdi sem kodinn profar
     ekki er verra en ekkert: thad er FULLYRDING um vel-laesilegt svid
     (`confidence.value`) sem stemmir ekki vid hegdunina — og hun laug lika
     a skjanum, i fotnotunni i `Dashboard.jsx` sem sagdi ad graen-lausar
     rodir hvildu a golfinu.

     Vordur: `tests/waivers.mjs` kafli 8b ber thennan streng vid
     `confidenceOf` sjalft (fjolda skilyrda OG hegdun per skilyrdi), svo
     thau geta ekki rekid i sundur aftur.                              */
  confidence: {
    value: "vbd > 0 AND projection is Sleeper's own AND availability 1",
    measured: false,
    note: "`confident` is NOT a probability and must never be shown as one. It is " +
          "true only when every input behind the gain is one of the measured ones: " +
          "the player projects above YOUR league's replacement level (vbd > 0, so " +
          "he is startable rather than bench dust), the projection is Sleeper's own " +
          "(the strongest single source measured — ESPN is a fallback only), and he " +
          "is fully available. Any item that fails one of these carries the reason " +
          "in `why`. THE GAIN FLOOR IS DELIBERATELY NOT ONE OF THEM: `pickupAdvice` " +
          "filters on it before this runs, so every row that exists has already " +
          "cleared it and testing it again could never fail. That is why `minGain` " +
          "being unmeasured is NOT the reason a row is outside green — the reason is " +
          "always one of the three above, and it is named in `why`.",
  },
};

const RANKED_POS = WAIVER_CAL.rankedPos.value;

/* ============================================================
   1. HVERJIR ERU LAUSIR
   ============================================================
   "VID VITUM EKKI HVERJIR ERU TEKNIR" MA ALDREI LESAST EINS OG
   "ENGINN ER TEKINN". Thad er thess vegna sem `pool` er `null` og
   ekki allir leikmenn thegar hoparnir vantar: listi sem bydur ther
   300 leikmenn sem eru allir i eigu einhvers er verri en enginn
   listi, thvi hann litur nakvaemlega eins ut og rettur listi.
   Sama regla og NULL-reglan i vidmotinu: null er "vantar", 0 er tala.

   OG THEIR SEM BORDID THEKKIR EKKI ERU TALDIR. Sleeper ber ~11.400
   leikmenn og bordid ~1.130 (varnarmenn og linumenn eiga rettilega
   ekkert erindi thangad). Leikmadur a hop hja einhverjum sem finnst
   ekki i rodunum ma samt ekki hverfa thegjandi — tha vaeri talan
   "hve marga a eg?" rong an thess ad nokkud brotni. Sama vord og
   `unmatched` i `DraftBoard.jsx`.
   ============================================================ */

/**
 * `{ rows, rosters, myRosterId }` -> `{ pool, mine, rosteredCount, unknownRostered, ... }`
 *
 * `rows`        rodirnar ur `buildRows`
 * `rosters`     svar Sleeper `/league/{id}/rosters`
 * `myRosterId`  `roster_id` MITT (tala eda strengur)
 *
 * `pool`   allir i `rows` sem eru a ENGUM hop — eda `null` ef hoparnir
 *          voru ekki lesnir.
 * `mine`   minir — eda `null` ef vid vitum ekki hver hopurinn er minn.
 *          Tomt fylki og null eru SITTHVAD: tomt = hopurinn er tomur,
 *          null = vid vitum ekki hver hann er.
 * `notes`  enskir strengir fyrir vidmotid: hvad vantadi og hvad var
 *          ekki laesilegt. Thogul sleppa er thad eina sem er bannad.
 */
export function freeAgents({ rows, rosters, myRosterId } = {}) {
  const list = Array.isArray(rows) ? rows.filter((r) => r && r.id != null) : [];
  const byId = new Map(list.map((r) => [String(r.id), r]));
  const notes = [];

  const teamRosters = Array.isArray(rosters)
    ? rosters.filter((r) => r && typeof r === "object" && !Array.isArray(r))
    : null;

  if (!teamRosters || !teamRosters.length) {
    /* Engir hopar -> vid vitum EKKERT um hverjir eru teknir. */
    return unknownPool(rosters, "No rosters were read from the league, so we cannot " +
                                "tell who is already taken.");
  }

  /* `players` er LAESILEGT thegar thad er fylki EDA berum ordum tomt
     (`null`/vantar) — Sleeper ber `players: null` a hop sem enginn
     hefur draftad i, og thad er raunveruleg upplysing, ekki bilun.
     Allt annad (strengur, tala, hlutur) er ONYT gerd og verdur ad
     TELJAST; ad lesa hana sem "tomur hopur" vaeri ad segja "enginn er
     tekinn hja thessu lidi" um lid sem vid gatum ekki lesid. */
  let unreadable = 0, readable = 0;
  const rostered = new Set();
  const mineIds = [];
  let myRoster = null;
  const wantMine = myRosterId != null && String(myRosterId) !== "";

  for (const r of teamRosters) {
    const isMine = wantMine && String(r.roster_id) === String(myRosterId);
    if (isMine) myRoster = r;

    const ps = r.players;
    if (ps == null) { readable++; continue; }
    if (!Array.isArray(ps)) { unreadable++; continue; }
    readable++;
    for (const raw of ps) {
      if (raw == null) continue;
      const id = String(raw);
      if (!id) continue;
      rostered.add(id);
      if (isMine) mineIds.push(id);
    }
  }

  if (!readable) {
    /* Hver einasti hopur var onytur — thad er thad SAMA og ad hafa
       ekki lesid tha, og ma thvi ekki gefa laug. */
    return unknownPool(rosters, `None of the ${unreadable} rosters had a readable ` +
                                `player list, so we cannot tell who is already taken.`);
  }
  if (unreadable) {
    notes.push(`${unreadable} of ${teamRosters.length} rosters had an unreadable ` +
               `player list — players on them may show up as free agents.`);
  }

  /* Their sem eru a hop en bordid thekkir ekki. TALDIR, ekki hentir. */
  const unknownIds = [...rostered].filter((id) => !byId.has(id));
  if (unknownIds.length) {
    notes.push(`${unknownIds.length} rostered players are not on this board ` +
               `(it covers ${list.length} offensive players, Sleeper carries ` +
               `thousands) — they are counted, not dropped.`);
  }

  const pool = byVbd(list.filter((r) => !rostered.has(String(r.id))));

  let mine = null, myUnknown = null;
  if (wantMine && myRoster) {
    mine = byVbd(mineIds.map((id) => byId.get(id)).filter(Boolean));
    myUnknown = mineIds.filter((id) => !byId.has(id)).length;
    if (myUnknown) {
      notes.push(`${myUnknown} of your own players are not on this board, so they ` +
                 `were not priced.`);
    }
  } else if (wantMine) {
    notes.push(`No roster with roster_id ${myRosterId} was found in this league.`);
  } else {
    notes.push("No roster id was given, so we do not know which team is yours.");
  }

  return {
    pool,
    mine,
    rosteredCount: rostered.size,
    unknownRostered: unknownIds.length,
    unknownRosteredIds: unknownIds,
    unreadableRosters: unreadable,
    myUnknown,
    notes,
  };
}

/* ALLT ER NULL, EKKERT ER 0. `rosteredCount: 0` vaeri fullyrding um ad
   enginn se tekinn — nakvaemlega su fullyrding sem vid getum ekki
   gert thegar hoparnir voru ekki lesnir. */
function unknownPool(rosters, why) {
  const unreadable = Array.isArray(rosters)
    ? rosters.filter((r) => r && typeof r === "object" && !Array.isArray(r) &&
                            r.players != null && !Array.isArray(r.players)).length
    : 0;
  return {
    pool: null, mine: null, rosteredCount: null, unknownRostered: null,
    unknownRosteredIds: null, unreadableRosters: unreadable,
    myUnknown: null, notes: [why],
  };
}

/* Rodun: haesta VBD fyrst, og VANTANDI VBD ALLTAF SIDAST. Tomt gildi
   sem flytur upp i rodun litur ut eins og lelegasti — eda besti —
   madurinn, eftir att. Sama regla og i toflum appsins. */
function byVbd(rowsIn) {
  return rowsIn.slice().sort((a, b) => {
    const x = num(a.vbd), y = num(b.vbd);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return y - x;
  });
}

/* ============================================================
   2. A AD PIKKA EINHVERN UPP — OG VID HVERN?
   ============================================================ */

/**
 * `{ pool, mine, league, week, minGain }` -> `[{ add, drop, gain, why, confident }]`
 *
 * Hver rod er SJALFSTAETT skipti, ekki plan: thaer deila oft sama
 * manni ut, thvi spurningin "hvern maetti eg missa" hefur eitt svar.
 * Fylgi notandinn tveimur rodum er hann ad droppa tveimur monnum, og
 * thad er thess vegna sagt i `why`.
 *
 * `week` faerist ALDREI inn i rodunina. Hun er notud til eins: ad
 * segja hvort madurinn se i frii thessa viku. Auðar vikur voru maeldar
 * (`bye-lab.mjs`, 10 af 10 vogum jakvaedar a tveimur ohadum
 * spaheimildum, EN 8 af 12 arum og vikmorkin innihalda null) — merkid
 * er sterkara en null og veikara en maeling, svo thad SEST og RAEDUR
 * ENGU. Sama akvordun og Evruálagid i FPL-verkefninu.
 *
 * Tomt fylki er GILT SVAR og thad er algengasta rétta svarid a godum
 * hop.
 */
export function pickupAdvice({ pool, mine, league, week, minGain } = {}) {
  /* `null` fra `freeAgents` thydir "vitum ekki" — hvorki laug ne
     hopur. Radgjof ur ovissu vaeri hreinn tilbuningur, svo hun er
     ekki gefin. Tomt fylki, ekkert hrun. */
  if (!Array.isArray(pool) || !Array.isArray(mine)) return [];

  const L = normalizeLeague(league);
  const wk = intOrNull(week, 1, 22);
  /* Ruslsvar i `minGain` fellur i sjalfgefna golfid — ekki i 0.
     `Number("abc")` er NaN og `NaN >= x` er false, svo 0-golf hefdi
     hleypt HVERJU skipti i gegn. */
  const floor = Number.isFinite(Number(minGain)) && Number(minGain) >= 0
    ? Number(minGain) : WAIVER_CAL.minGain.value;

  const adds = pool.filter((r) => r && RANKED_POS.includes(r.pos) &&
    num(r.vbd) != null &&
    /* MADURINN SEM ER TEKINN VERDUR AD GETA SPILAD.
       Radgjof um ad droppa manni sem er `Out` og taka annan sem er
       lika `Out` er hreint hrindl: hun kostar waiver-rod og skilar
       engum staerdum sem vid getum maelt. Og `vbd` er timabils-tala
       sem gerir ekki rad fyrir thvi ad hann sitji — "stash"-virdi er
       ekki maelt her, svo thad er ekki verdlagt. Hann sest afram i
       `pool`; hann er bara ekki RADLAGDUR. */
    availOf(r) > 0);

  const mineRanked = mine.filter((r) => r && RANKED_POS.includes(r.pos));
  const drops = mineRanked.filter((r) => num(r.vbd) != null);
  /* Madur an spar hefur `vbd: null`, og null er EKKI 0 — vid getum
     ekki fullyrt ad hann se odyr. Hann er thvi ekki verdlagdur sem
     skiptimynt, EN thad verdur ad sjast: annars gaeti radgjofin sagt
     "droppadu odrum besta hlauparanum thinum" medan omeltur madur
     sat vid hlidina. */
  const unpriced = mineRanked.length - drops.length;
  if (!adds.length || !drops.length) return [];

  /* Stodutalning a OLLUM hopnum, lika K og DST: byrjunarlidid tharf
     tha thott rodin nai ekki til theirra. */
  const before = {};
  for (const r of mine) if (r && r.pos) before[r.pos] = (before[r.pos] || 0) + 1;
  const needFixed = fixedSlotNeeds(L);

  const out = [];
  for (const a of adds) {
    const drop = cheapestDrop(drops, a, before, needFixed);
    if (!drop) continue;
    const gain = round1(num(a.vbd) - num(drop.vbd));
    if (gain == null || gain < floor) continue;

    const conf = confidenceOf(a);
    out.push({
      add: brief(a),
      drop: brief(drop),
      gain,
      confident: conf.ok,
      why: whyFor({ a, drop, gain, conf, league: L, before, wk, unpriced }),
    });
  }

  /* Rodad eftir ABATA, faellandi. Jafntefli brotid a VBD thess sem
     kemur inn svo rodin se ENDURGERANLEG — tvaer keyrslur a somu
     gognum verda ad gefa somu rod, annars les vidmotid nyja tillogu
     thar sem ekkert breyttist. */
  out.sort((x, y) => (y.gain - x.gain) || (num(y.add.vbd) - num(x.add.vbd)));

  /* HVER ROD ER SJALFSTAETT SKIPTI, EKKI PLAN — og thad er sagt ADEINS
     thegar thad er satt. Spurningin "hvern maetti eg missa" hefur eitt
     svar, svo margar rodir nefna sama mann ut; notandi sem fylgir
     tveimur er ad droppa tveimur. Vidvorunin var fyrst sett a HVERJA
     rod, lika thegar rodin var ein — og tha var hun einfaldlega OSONN.
     Vidvorun sem er stundum osonn er verri en engin. */
  const dropCount = new Map();
  for (const o of out) dropCount.set(String(o.drop.id), (dropCount.get(String(o.drop.id)) || 0) + 1);
  if ([...dropCount.values()].some((n) => n > 1)) {
    for (const o of out) {
      if (dropCount.get(String(o.drop.id)) > 1) {
        o.why.push({ kind: "caution", text:
          "each row is a standalone swap, not a plan — " +
          `${dropCount.get(String(o.drop.id))} of these name ${o.drop.name || "the same player"} ` +
          "as the one to drop" });
      }
    }
  }
  return out;
}

/**
 * ODYRAST AD MISSA — laegsta VBD sem MA fara.
 *
 * "Ma fara" er rettleiks-golf og ekki rodun: skipti sem skilur
 * byrjunarlidid ofyllanlegt er villa, ekki val. Golfid VARDVEITIR
 * adeins — ef hopurinn er thegar of thunnur a stodu er honum ekki
 * refsad fyrir thad, annars faeri hálfur hopur engin rad og verkfaerid
 * yrdi thogult nakvaemlega thegar thad er mest tharft.
 */
function cheapestDrop(drops, add, before, needFixed) {
  const sorted = drops.slice().sort((a, b) => num(a.vbd) - num(b.vbd));
  for (const d of sorted) {
    if (allowedSwap(add, d, before, needFixed)) return d;
  }
  return null;
}

function allowedSwap(add, drop, before, needFixed) {
  if (add.id != null && drop.id != null && String(add.id) === String(drop.id)) return false;
  const after = { ...before };
  after[drop.pos] = (after[drop.pos] || 0) - 1;
  after[add.pos] = (after[add.pos] || 0) + 1;
  for (const pos of Object.keys(needFixed)) {
    const keep = Math.min(needFixed[pos], before[pos] || 0);   // vardveita, ekki krefjast
    if ((after[pos] || 0) < keep) return false;
  }
  return true;
}

/**
 * Fost byrjunarsaeti per stodu, LEIDD UT AF `slotsFor` og ekki
 * handskrifud. Ein utfaersla a saetunum: gerdi thetta fall sina eigin
 * gaeti hun rekid fra theirri sem stillir upp lidinu, og tha vaeri
 * "thu maetir ekki droppa honum" satt i odru tolinu og osatt i hinu.
 * FLEX er sleppt viljandi — hann tekur yfirmengi stada, svo hann
 * bindur enga EINA stodu.
 */
function fixedSlotNeeds(league) {
  const out = {};
  for (const s of slotsFor(league)) {
    if (!Array.isArray(s.pos) || s.pos.length !== 1) continue;
    out[s.pos[0]] = (out[s.pos[0]] || 0) + 1;
  }
  return out;
}

/**
 * `confident` ER EKKI LIKINDATALA OG MA ALDREI BIRTAST SEM SLIK.
 * Hun er sonn adeins thegar hvert inntak ad baki abatanum er eitt af
 * theim sem VORU maeld. Falli eitt theirra er astaedan skiluð med,
 * svo notandinn geti verid osammala — radgjof sem ekki er haegt ad
 * vera osammala er ekki notud, hun er hunsuð.
 */
function confidenceOf(a) {
  const reasons = [];
  const vbd = num(a.vbd);
  /* Golfid a abatanum er ekki profad her — thad er thegar sia i
     `pickupAdvice` og rod sem er undir thvi kemst aldrei hingad.
     Skilyrdi sem getur ekki brugdist er ekki skilyrdi. */
  if (!(vbd > 0)) {
    reasons.push("he still projects below your league's replacement level " +
                 "(vbd " + fmt(vbd) + "), so this is bench depth, not a starter");
  }
  if (a.projFallback) {
    reasons.push("his projection is the ESPN fallback, not Sleeper's own — " +
                 "Sleeper is the source every measurement here rests on");
  }
  const av = availOf(a);
  if (av < 1) {
    reasons.push(`he is listed ${a.injury || "less than fully available"} ` +
                 `(availability ${av}), so a season number overstates him`);
  }
  return { ok: reasons.length === 0, reasons };
}

function whyFor({ a, drop, gain, conf, league, before, wk, unpriced }) {
  const why = [];

  why.push({ kind: "gain", text:
    `${fmt(gain)} more value over replacement than ${nameOf(drop)} ` +
    `(${a.pos} ${fmt(a.vbd)} vs ${drop.pos} ${fmt(drop.vbd)}) — season points ` +
    `above your league's replacement level, not projected points` });

  if (a.tier != null && drop.tier != null) {
    why.push({ kind: "tier", text: a.tier < drop.tier
      ? `tier ${a.tier} against tier ${drop.tier}`
      : `both in tier ${a.tier}` });
  }

  /* MEIDSLI OG TILTAEKILEIKI — BADAR HLIDAR. Sa sem fer ut getur
     verid ur leik, og thad er raunveruleg upplysing um hvad skiptin
     kosta. Ad nefna adeins thann sem kemur inn vaeri half saga. */
  if (availOf(a) < 1) {
    why.push({ kind: "injury", text:
      `${nameOf(a)} is listed ${a.injury || "not fully available"}` });
  }
  if (availOf(drop) === 0) {
    why.push({ kind: "injury", text:
      `${nameOf(drop)} is listed ${drop.injury || "out"} — he is not playing as things stand` });
  }

  /* AUÐ VIKA — NEFND, EKKI VEGIN. Maelt i `bye-lab.mjs`: 10 af 10
     vogum jakvaedar a tveimur ohadum spaheimildum en adeins 8 af 12
     arum og vikmorkin innihalda null. */
  if (wk != null) {
    if (num(a.bye) === wk) {
      why.push({ kind: "bye", text:
        `on bye in week ${wk}, so he cannot help you this week — noted, not ranked` });
    }
    if (num(drop.bye) === wk) {
      why.push({ kind: "bye", text:
        `${nameOf(drop)} is on bye in week ${wk} — noted, not ranked` });
    }
  }

  /* STODUTHORF — STADREYND, EKKI ROKSTUDNINGUR. Sja notuna i haus
     skrarinnar: threfalt maeld, threfalt hafnad sem rodun. */
  const st = league.starters || {};
  const need = (st[a.pos] || 0) - (before[a.pos] || 0);
  if (need > 0) {
    why.push({ kind: "need", text:
      `you still need ${need} at ${a.pos} — noted, not ranked` });
  }

  /* WAIVER-HLAUPID SJALFT. Trending add/drop er SAMHENGI: i forleik er
     thad meidsla-frett, a timabili er thad hlaupid. Hvorugt hefur
     verid maelt sem merki her, svo talan er birt og ekki vegin. */
  if (num(a.trendAdd) != null) {
    why.push({ kind: "context", text:
      `added in ${num(a.trendAdd).toLocaleString("en-US")} Sleeper rosters in the ` +
      `last 24h — waiver-run context, not measured as a signal` });
  }

  if (!conf.ok) {
    why.push({ kind: "caution", text: `not a confident upgrade: ${conf.reasons.join("; ")}` });
  }
  if (unpriced > 0) {
    why.push({ kind: "caution", text:
      `${unpriced} player${unpriced > 1 ? "s" : ""} on your roster have no ` +
      `projection, so they were not priced as drop candidates — check them first` });
  }
  return why;
}

/* ============================================================
   3. SMAATRIDI SEM MEGA EKKI VERA A TVEIMUR STODUM
   ============================================================ */

/** Thad sem tillagan HVILIR a, og ekkert annad. Skorin rod getur ekki
 *  borid `undefined` — hvert svid er nefnt og fellur i `null`. */
function brief(r) {
  return {
    id: r.id ?? null,
    name: r.name ?? null,
    pos: r.pos ?? null,
    team: r.team ?? null,
    vbd: num(r.vbd),
    tier: r.tier ?? null,
    posTier: r.posTier ?? null,
    proj: num(r.proj),
    adp: num(r.adp),
    injury: r.injury ?? null,
    avail: availOf(r),
    bye: num(r.bye),
    trendAdd: num(r.trendAdd),
    trendDrop: num(r.trendDrop),
  };
}

/**
 * Tiltaekileiki. `avail` er thegar reiknadur i `buildRows`, en rod sem
 * kemur annars stadar ad ber hann ekki — tha er hann reiknadur ur
 * `injury`/`status` med SAMA falli og appid notar (`model.js`), ekki
 * med afriti af toflunni.
 */
function availOf(r) {
  const a = Number(r.avail);
  if (Number.isFinite(a) && a >= 0 && a <= 1) return a;
  return availability(r.status ?? null, r.injury ?? null);
}

const nameOf = (r) => (r && r.name) || (r && r.id != null ? `#${r.id}` : "that player");

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function intOrNull(v, lo, hi) {
  const n = num(v);
  if (n == null) return null;
  const i = Math.round(n);
  return i >= lo && i <= hi ? i : null;
}

const round1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const fmt = (x) => (x == null ? "—" : String(round1(x)));
