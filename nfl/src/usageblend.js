/* ============================================================
   usageblend.js — NOTKUN THAD SEM ER LIDID AF TIMABILINU. HREIN.

   Ekkert React, ekkert `fetch`, engin `import` onnur en engin. Tekur
   vid viku-rodum (`data/weekly/{season}.json` gegnum `D.loadWeekly`) og
   skilar (a) notkun-til-thessa an leka, (b) VOGINNI a hana, og (c)
   blondudu arstidar-spanni thegar vorpunin er til.

   ============================================================
   HVERS VEGNA HUN ER TIL
   ============================================================
   `weekview.js` byggir a arstidar-spa deildri a 17 og notar EKKERT af
   thvi sem hefur gerst i thessu timabili. `usage-lab.mjs` maeldi hvad
   thad kostar (`data/measure/usage.json`, 12.8.2026, 2.342 arm x 7
   timabil): notkun-til-thessa lokar allt ad threfalt staerri hluta af
   bilinu milli "spa/17" og fullkominnar vitneskju.

   Sigurvegarinn er `opp_prior` — **HLAUP + SENDINGAR** (`car + tgt`),
   varpad i stig gegnum fitt a FYRRI timabilum. THAD ER MAGN
   TAEKIFAERA, ekki hlutdeild: `tshare` og `wopr` maelast VERRI (besta
   holf per breytu: opp_prior +6,40/+8,64/+7,09 a moti tshare_prior
   +3,05/+4,13/+4,97 og wopr_prior +1,55/+4,42/+4,48). Thessi akvordun
   er vardud i `tests/usageblend.mjs` og henni ma ekki vikja an
   maelingar.

   ============================================================
   THRJU ATRIDI SEM MEGA EKKI GLEYMAST VID LESTUR
   ============================================================
   1. FERILLINN ER NIDURSTADAN, EKKI TALAN. I vikum 1-4 maelist
      EKKERT (sja `bins` her nidri) og krofug blondun THAR er
      SKADLEG — `const0.5` (fost 50% vog) tapar 3,9-8,1 pp i w1-4 og
      `const0` tapar 11-20 pp. Vogin er thess vegna Bayesisk med
      DAUDU SVIDI i byrjun; sja `CURVE`.
   2. VORPUNIN opp -> STIG ER **EKKI** I `usage.json`. Skran ber
      samantektir (delta, t, vikmork, ferla) en ENGA fitt-stika. Thess
      vegna tekur `blendedSeasonProj` vid `toDatePerGame` — thegar
      hana vantar skilar hun `null`, ALDREI spanni thegjandi og aldrei
      `usage.ppg` i stadinn (thad vaeri annad arm, `ptsPG`, sem var
      maelt SERSTAKLEGA og er lakara: +1,71/+1,72/+2,08 undir `opp`).
      Sja `USAGE_BLEND.mapping`.
   3. `usageToDate` MA EKKI SJA VIKUNA SEM ER SPAD. `throughWeek` er
      UTILOKANDI. Thad er haettulegasti lekinn i verkefninu: leikur i
      viku w i "notkun til thessa" fyrir viku w gefur arm sem litur ut
      eins og spa en er orakel. `usage-lab` byggir toluna sina a
      `kAt[w]` = fjoldi leikja med viku < w, og thetta er sama regla.
   ============================================================ */

/* ============================================================
   MAELDA TAFLAN — BOKUD, OG PROFID BER HANA VID DISKINN
   ============================================================
   Tolurnar bua i `data/measure/usage.json` en eru bakadar hingad af
   somu astaedu og `WEEKLY_MEASURED` i `weekview.js` og `HALF_LAB` i
   `rulebasis.js`: vidmotid les thaer i hverri teikningu og ny gagnaskra
   i lestrarleidinni tharf sina eigin throlni-vord. `tests/usageblend.mjs`
   ber toffluna vid skrana a diski og FELLUR ef hun rekur — svo hun
   getur ekki ordid urelt i thogn. Endurkeyrsla labsins sem breytir
   tolunum fellir profid; tha uppfaerir madur TOFLUNA, ekki profid.

   INCUMBENT-TALAN ER EKKI HER. Hun byr i `weekview.WEEKLY_MEASURED`
   (5,831 / 3,199 / 2,967) og tvo afrit af somu tolu i tveimur skram
   er hvernig toflur reka i sundur. Profid ber `pct` her vid labid, og
   labid ber incumbent-inn — thau maetast a diski, ekki i koda.        */

/** Sa tilraunar-reitur sem thessi eining IMPLEMENTERAR. */
const ARM = {
  variable: "opp_prior",
  window: "last3",
  curve: "bayes10",
  cell: "opp_prior · last3 · bayes10",
  metric: "opp = car + tgt (mean per game over the window)",
  source: "data/measure/usage.json · usage-lab.mjs · 2026-08-12T20:31Z",
};

/* ============================================================
   HVERS VEGNA EITT HOLF FYRIR OLL THRJU SNIDIN
   ============================================================
   Besta holfid er EKKI thad sama i ollum snidum:

     ppr       opp_prior · last3 · bayes10   +6,399
     half      opp_prior · jump  · const0.5  +8,642
     standard  opp_prior · last3 · const0.5  +7,094

   Ad senda thrjar olikar reglur vaeri ad velja sigurvegara ur 52 holfum
   thrisvar — nakvaemlega thad sem placebo-thakid i labinu er til ad
   vara vid (havadi naer +2,03/+3,93/+4,40 gegnum sama net). OG BADIR
   `const0.5`-reitirnir eru DAEMDIR UR LEIK af atridi 1 her ofar: fost
   50% vog tapar i vikum 1-4.

   `last3 · bayes10` er thvi valid sem EITT holf, og thad er maelt
   jakvaett i OLLUM THREMUR med timabila-bootstrap sem UTILOKAR NULL:

     ppr       +6,399  t 2,561  5/6  [1,63 · 10,53]
     half      +7,134  t 3,298  5/6  [3,09 · 10,37]
     standard  +4,747  t 2,130  5/6  [0,95 ·  8,96]

   THAD KOSTAR OG KOSTNADURINN ER SKRADUR: half tapar 1,51 pp og
   standard 2,35 pp a moti sinu eigin besta holfi, og i standard er
   `tshare_prior` NAFNBOTARLEGA 0,07 pp ofar i THESSU holfi
   (+4,815 a moti +4,747) thott `opp` vinni med 0,15 pp thegar hvor
   breyta faer sitt besta holf. Su tala er innan havada og hun snyr
   EKKI akvordunni um magn a moti hlutdeild — en hun a ad standa her,
   ekki i minninu a theim sem las skrana.                             */

/** Reitur `opp_prior · last3 · bayes10` — THAD SEM ER SENT. */
const SHIPPED = {
  ppr: {
    pct: 12.249, delta: 6.399, t: 2.561, years: 6, wins: 5,
    seasonBootstrap: [1.629, 10.526], seasonBootstrapExcludesZero: true,
    beatsPlaceboCeiling: true, beatsScaledPlaceboCeiling: true,
    bins: { "w1-4": { delta: 0.835, t: 0.624, wins: 4 },
            "w5-9": { delta: 2.025, t: 0.354, wins: 4 },
            "w10-18": { delta: 12.281, t: 4.211, wins: 6 } },
    measured: true,
    note: "opp_prior · last3 · bayes10 closes 12.249% of the gap in PPR " +
      "(+6.399 pp over the weekly model, t = 2.561, positive in 5 of 6 seasons, " +
      "season bootstrap [1.63, 10.53]) and it clears the placebo ceiling (+2.034 pp, t 2.076).",
  },
  "half-ppr": {
    pct: 9.241, delta: 7.134, t: 3.298, years: 6, wins: 5,
    seasonBootstrap: [3.09, 10.368], seasonBootstrapExcludesZero: true,
    /* FELLUR A PLACEBO-THAKINU I HALF og thad er ekki smaatridi:
       thakid thar er t = 3,611 (haesta EINHLIDA t sem akvedinn
       havadi naer gegnum sama net) og thetta holf hefur t = 3,298.
       Deltan sjalf (7,134) er yfir delta-thakinu (3,928) og
       kvarda-samstillta thakid (1,36) er slegid — svo thetta er
       "liklega raunverulegt merki sem naer ekki throskuldinum",
       ekki "havadi". Vidmotid ma EKKI birta half sem jafn-sannad
       og ppr. */
    beatsPlaceboCeiling: false, beatsScaledPlaceboCeiling: true,
    bins: { "w1-4": { delta: 5.125, t: 2.34, wins: 5 },
            "w5-9": { delta: 2.968, t: 0.962, wins: 4 },
            "w10-18": { delta: 10.182, t: 3.759, wins: 5 } },
    measured: true,
    note: "In half-PPR the same rule closes 9.241% (+7.134 pp, t = 3.298, 5 of 6 seasons) " +
      "but it does NOT clear the full placebo ceiling (t threshold 3.611) — " +
      "treat it as measured, not as proven.",
  },
  standard: {
    pct: 8.414, delta: 4.747, t: 2.13, years: 6, wins: 5,
    seasonBootstrap: [0.945, 8.958], seasonBootstrapExcludesZero: true,
    /* Sama saga: thakid i standard er t = 2,302 og thetta holf er
       2,130. Besta holf standard (`last3 · const0.5`, t 2,742) SLAER
       thakid — en thad er `const0.5`, sem er daemt ur leik. */
    beatsPlaceboCeiling: false, beatsScaledPlaceboCeiling: true,
    bins: { "w1-4": { delta: 1.807, t: 1.372, wins: 4 },
            "w5-9": { delta: 2.35, t: 0.44, wins: 3 },
            "w10-18": { delta: 9.032, t: 3.111, wins: 6 } },
    measured: true,
    note: "In standard the same rule closes 8.414% (+4.747 pp, t = 2.130, 5 of 6 seasons) " +
      "but it does NOT clear the full placebo ceiling (t threshold 2.302) — " +
      "treat it as measured, not as proven.",
  },
};

/** Besta holfid per snid — TALAN SEM README BIRTIR. Ekki thad sem er sent. */
const HEADLINE = {
  ppr: { cell: "opp_prior · last3 · bayes10", pct: 12.249, delta: 6.399, t: 2.561,
    years: 6, wins: 5, playerBootstrap: [2.538, 8.49], sameAsShipped: true },
  "half-ppr": { cell: "opp_prior · jump · const0.5", pct: 10.749, delta: 8.642, t: 2.261,
    years: 6, wins: 5, playerBootstrap: [0.612, 7.863], sameAsShipped: false },
  standard: { cell: "opp_prior · last3 · const0.5", pct: 10.761, delta: 7.094, t: 2.742,
    years: 6, wins: 6, playerBootstrap: [0.599, 8.037], sameAsShipped: false },
};

/** Placebo-thakid per snid — hve gott getur AKVEDINN HAVADI litid ut. */
const PLACEBO_CEILING = {
  ppr: { delta: 2.034, t: 2.076, scaledOnlyDelta: -1.012 },
  "half-ppr": { delta: 3.928, t: 3.611, scaledOnlyDelta: 1.36 },
  standard: { delta: 4.399, t: 2.302, scaledOnlyDelta: 1.251 },
};

/* ============================================================
   FERILLINN
   ============================================================
   `bayes10` i labinu er vog a SPANNA: `wProj(k) = 10 / (10 + k)`, thar
   sem `k` = fjoldi leikja med viku < w. Vogin a TIMABILID er thvi
   `1 - wProj = k / (10 + k)`. `K = 10` er MAELT: `bayes10` er
   sigur-ferillinn i ppr og fyrir `opp_prior · last3` er hun besti
   bayes-ferillinn i ollum thremur snidum.

   DAUDA SVIDID (`DEAD_GAMES = 4`) ER VALID, EKKI MAELT — og thad er
   skrifad her svo thad geti ekki lesist eins og fitt:

     · thad sem ER maelt: w1-4-bilid er OGREINANLEGT fra nulli.
       Per-leikmanns bootstrap i ppr gefur [-1,53 · 4,02] og
       timabila-t-in eru 0,624 / 2,340 / 1,372. `const0.5` i sama
       bili tapar 3,9-8,1 pp og `const0` 11,4-20,1 pp.
     · thad sem ER VALID: hvar svidid endar. `4` er EFRI MORK
       w1-4-bilsins i labinu — thad er markalina maelingarinnar, ekki
       tala sem var fittud. Hvert annad gildi milli 3 og 8 vaeri jafn
       vel stutt af gognunum.
     · thad sem thad KOSTAR: `bayes10` an daudasvids maelist +5,125 pp
       i w1-4 i half (t 2,340) og +0,835 i ppr. Daudasvidid gefur thann
       half-vinning UPP. Thad er vidvitandi: hann er einn af thremur og
       hann er sa sem placebo-thakid naer ekki ad utiloka.

   Vogin er thvi `w(k) = kEff / (K + kEff)`, `kEff = max(0, k - 4)`:

     k    0-4     5      6      7      8     10     13     17
     w    0    0,091  0,167  0,231  0,286  0,375  0,474  0,565

   Einraen, bundin vid [0, 1), og NUL fram ad 5 leikjum — sem er thad
   sem "naestum engin vog fyrr en ~6 leikir eru komnir" tydir i tolum.  */
const CURVE = {
  form: "w(k) = kEff / (K + kEff), kEff = max(0, k - DEAD_GAMES)",
  K: 10,
  DEAD_GAMES: 4,
  KMeasured: true,
  KBasis: "bayes10 = 10/(10+k) is the winning curve in usage.json (ppr) and the best " +
    "bayes curve for opp_prior · last3 in all three formats",
  deadMeasured: false,
  deadBasis: "upper edge of the w1-4 bin, where the measured delta is indistinguishable " +
    "from zero (t 0.624/2.340/1.372, ppr per-player bootstrap [-1.53, 4.02]) and strong " +
    "constant blending is harmful (const0.5: -3.9 to -8.1 pp, const0: -11.4 to -20.1 pp)",
};

/**
 * ARSTIDIN ER 17 LEIKIR. Ekki maeld tala — thad er lengd
 * leikjaskrarinnar — en hun ER forsenda thess ad blondun a
 * arstidar-kvarda se sama adgerd og blondun a viku-kvarda:
 *   17 * (wProj*proj/17 + w*toDate) = wProj*proj + w*17*toDate.
 * `weekview.weekRows` deilir med somu tolu (`r.proj / 17`) og
 * `usage-lab` maeldi flata arminn sem `proj / 17`. Breytist hun a
 * einum stad tharf hun ad breytast a badum.
 */
export const GAMES_IN_SEASON = 17;

/** Gluggar sem VORU MAELDIR. Fleiri eru ekki i bodi. */
const WINDOW_N = { all: null, last3: 3, last5: 5 };

/** Stigagjafar-svid i viku-rodunum. Lykill appsins -> svid i `weekly/*.json`. */
const POINTS_FIELD = { ppr: "ppr", "half-ppr": "half", standard: "std" };

/** Lykill labsins per snid — profid ber tofluna vid skrana med thessu. */
const LAB_KEY = { ppr: "ppr", "half-ppr": "half", standard: "standard" };

export const USAGE_BLEND = {
  arm: ARM,
  shipped: SHIPPED,
  headline: HEADLINE,
  placeboCeiling: PLACEBO_CEILING,
  curve: CURVE,
  labKey: LAB_KEY,
  gamesInSeason: GAMES_IN_SEASON,
  measured: true,
  note: "Season-to-date opportunity (carries + targets) beats the season projection " +
    "from about week 6 on. Measured in usage.json (2.342 arms, 7 seasons); the gain is " +
    "concentrated in weeks 10-18 (+12.3/+12.1/+9.0 pp) and is nothing in weeks 1-4.",

  /* ============================================================
     VORPUNIN — THAD SEM VANTAR, OG THAD BIDUR TENGINGARINNAR
     ============================================================
     `opp_prior` thydir: `est = a + b * z`, thar sem
       z = (opp i glugganum - mu) / sd  yfir THVERSNID stodunnar i
           theirri viku (adeins leikmenn med gogn), og
       (a, b) = OLS a FYRRI TIMABILUM af (z, stig i viku w).

     HVORUGT er i `usage.json`. Skran ber `deltaVsIncumbent`, `t`,
     vikmork og ferla — enga stika. `grep slope` i skranni gefur adeins
     placebo-MERKIMIDA ("own fitted slope"), engar tolur.

     Thess vegna BYR EKKI THESSI EINING TIL VORPUN. Tvaer leidir eru
     til og BADAR eru akvordun sem eg tek ekki her:

       (1) LATA LABID SKRIFA FITTID. `accFit(priorAcc, pos, met, win)`
           i `scripts/usage-lab.mjs` skilar `{a, b, n}` per
           (stada, maelikvardi, gluggi). Vaeri hun skrifud i
           `usage.json` fyrir `(pos, opp, last3)` — 4 stodur x 2 tolur —
           gaeti hun verid bokud her eins og allt annad og profid gaeti
           bori hana vid skrana. `mu`/`sd` verda samt ad vera reiknud
           i appinu; thau eru THVERSNID THESSARAR VIKU og geta ekki
           verid bokud.
       (2) SKIPTA UM ARM. `opp_self` notar THVERSNID YFIRSTANDANDI
           TIMABILS (vikur < w) i stad fyrri ara og tharf ENGA bokada
           stika — hvorki (a,b) ne mu/sd — thvi allt er reiknad ur
           theim vikum sem eru lidnar. Hun maelist +4,866 / +6,302 /
           +5,515 i thessu holfi (`last3 · bayes10`) a moti +6,399 /
           +7,134 / +4,747 fyrir `opp_prior`: LAKARI i ppr og half,
           BETRI i standard. Su leid krefst thess ad appid reikni OLS
           yfir hopinn i hverri viku — thad er kodi, ekki maeling.

     THANGAD TIL skilar `blendedSeasonProj` `null` nema kallandinn
     gefi `toDatePerGame` a STIGA-KVARDA. Thad er asett: tala sem er
     buin til ur engu og litur ut eins og maeling er versta utkoman.  */
  mapping: {
    available: false,
    needs: "prior-season OLS (a, b) per (position, opp, last3) plus the current week's " +
      "cross-sectional mu/sd for the position",
    inFile: false,
    why: "usage.json stores deltas, t values, intervals and curves — no fit parameters. " +
      "usage-lab.mjs computes them in accFit() and discards them.",
    routes: ["persist accFit(priorAcc, pos, opp, last3) from usage-lab.mjs",
             "switch the arm to opp_self, which needs no baked parameters " +
             "(+4.866/+6.302/+5.515 instead of +6.399/+7.134/+4.747)"],
  },

  /* MAELT OG HAFNAD — hlutdeild i stad magns. Besta holf per breytu:
     opp_prior +6,399/+8,642/+7,094 · tshare_prior +3,054/+4,126/+4,968 ·
     wopr_prior +1,548/+4,420/+4,484. Profid reiknar thetta UT UR
     skranni og fellur ef hlutdeild fer fram ur magni.               */
  rejected: {
    tshare: { bestDelta: { ppr: 3.054, "half-ppr": 4.126, standard: 4.968 } },
    wopr: { bestDelta: { ppr: 1.548, "half-ppr": 4.42, standard: 4.484 } },
    constantWeight: {
      note: "A constant weight is worse than none in weeks 1-4: const0.5 loses 3.9-8.1 pp " +
        "and const0 (season-to-date only) loses 11.4-20.1 pp.",
    },
    pointsPerGame: {
      note: "ptsPG (points per game so far) needs no mapping but is measured below opp: " +
        "usage minus points is +1.713/+1.716/+2.080 pp.",
      caveat: "None of those three differences excludes zero on its own " +
        "(t 0.962 / 0.756 / 2.158) — opp is ahead, not proven ahead.",
    },
  },
};

/* ============================================================
   HJALPARFOLL
   ============================================================ */

/**
 * Tala eda `null`. STRENGUR ER RUSL, EKKI TALA.
 *
 * `Number("5")` er 5 og freistingin er ad taka thad — en svid sem BER
 * streng i JSON-i sem a ad bera tolu er skemmt gagn, og ad umbreyta
 * thvi thegjandi er ad fela bilun i pipunni. `car: "abc"` verdur
 * `null`, ekki `NaN` og ekki 0.
 */
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Svid i rodinni: `null` = VANTAR (telst ekki med), `undefined` = RUSL
 * (rodin er slept fyrir thennan maelikvarda).
 *
 * Greinarmunurinn er naudsynlegur fyrir `opp`: labid telur rod med
 * `car: null, tgt: 3` sem `opp = 3` (vantandi hlaup eru raunverulega
 * engin hlaup), en `car: "abc"` VEIT vid ekkert um — hun ma ekki lesast
 * sem 0 thvi thad vanmaeti taekifaerin thegjandi.
 */
function cell(row, key) {
  const v = row[key];
  if (v === null || v === undefined) return null;
  return (typeof v === "number" && Number.isFinite(v)) ? v : undefined;
}

/** Vika sem heiltala 1..18, annars `null`. Labid sleppir viku > 18. */
function weekOf(row) {
  const w = row.week;
  if (typeof w !== "number" || !Number.isInteger(w)) return null;
  return (w >= 1 && w <= 18) ? w : null;
}

/* Stigagjof appsins -> lykill i toflunum her. Othekkt -> `null`.

   EKKI UTFLUTT VILJANDI. `rulebasis.scoringKeyOf(league)` er THEGAR til
   og skilar LAB-lyklunum ("half"), medan thessi skilar APP-lyklunum
   ("half-ppr"). Tvo utflutt foll med naestum sama nafni sem skila
   OLIKUM strengjum fyrir sama inntak er hvernig kallandi faer `undefined`
   ur toflu og heldur ad taflan se tom. Kallandinn gefur `league.scoring`
   beint inn i `blendWeight`/`blendedSeasonProj` og thau vorpa sjalf.  */
function scoringKey(scoring) {
  if (scoring === "ppr" || scoring === "standard") return scoring;
  if (scoring === "half-ppr" || scoring === "half") return "half-ppr";
  /* "std" er heitid i README-toflunni; appid notar "standard". */
  if (scoring === "std") return "standard";
  return null;
}

/* ============================================================
   1. NOTKUN TIL THESSA — OG `throughWeek` ER UTILOKANDI
   ============================================================ */

/**
 * Notkun leikmanns THAD SEM ER LIDID, an leka.
 *
 * @param weeklyRows radir ur `data/weekly/{season}.json` (ALLIR
 *        leikmenn — sian er her svo kallandinn thurfi ekki ad byggja
 *        visa fyrir hvern mann).
 * @param opts.playerId `id` i rodunum (`"00-0034844"`). Borid saman
 *        sem STRENGUR: viku-skrarnar bera GSIS-id sem er strengur og
 *        tolulegur samanburdur a `"00-0034844"` er alltaf falskur.
 * @param opts.throughWeek vikan sem er SPAD — **UTILOKANDI**. Leikur i
 *        viku `w` telst EKKI thegar spad er viku `w`.
 * @param opts.window `"last3"` (maeld sjalfgefin), `"last5"` eda
 *        `"all"`. Othekktur gluggi -> `null`, ekki thogul sjalfgefning.
 * @param opts.scoring stigagjof, ADEINS fyrir `ppg`. An hennar er
 *        `ppg` `null` — `ppr`, `half` og `std` eru thrjar olikar tolur
 *        og ad velja eina thegjandi vaeri ad birta ranga.
 *
 * @returns `{ games, windowGames, window, car, tgt, opp, ppg,
 *            throughWeek, playerId }` eda `null`.
 *
 * `games` ER HEILDARFJOLDI LEIKJA fyrir `throughWeek` — thad er
 * inntakid i `blendWeight` — en `car`/`tgt`/`opp`/`ppg` eru MEDALTOL
 * PER LEIK YFIR GLUGGANN (`windowGames` leikir). Thaer tvaer tolur eru
 * ekki sama talan og maelingin notar BADAR: ferillinn les fjoldann,
 * matid les gluggann.
 *
 * NULL ER SVAR. Enginn leikur fyrir `throughWeek` -> `null`, ekki
 * nullur. Kallandinn verdur ad greina "engin gogn" fra "engin notkun":
 * varamadur sem hefur spilad 4 leiki an snertingar er `opp: 0`, madur
 * sem hefur ekki spilad er `null`, og sa munur er allt sem uppstillingin
 * hefur til ad fara eftir.
 */
export function usageToDate(weeklyRows, opts) {
  const o = opts || {};
  if (!Array.isArray(weeklyRows)) return null;
  if (o.playerId === null || o.playerId === undefined || o.playerId === "") return null;

  const through = num(o.throughWeek);
  if (through == null) return null;

  const window = o.window === undefined ? ARM.window : o.window;
  if (!Object.prototype.hasOwnProperty.call(WINDOW_N, window)) return null;

  const pid = String(o.playerId);
  const kept = [];
  for (const r of weeklyRows) {
    if (!r || typeof r !== "object") continue;
    if (String(r.id) !== pid) continue;
    const wk = weekOf(r);
    if (wk == null) continue;
    /* HERNA ER LEKINN VARINN. `<` og aldrei `<=`. */
    if (wk >= through) continue;
    kept.push({ wk, r });
  }
  /* Fost rod: eldsta fyrst. Baedi svo `last3` se raunverulega SIDUSTU
     THRIR og svo summan se logd saman i somu rod i hverri keyrslu —
     fleytitolu-samlagning er ekki vixlin (sama regla og `fetch-bsd`). */
  kept.sort((a, b) => a.wk - b.wk);

  const games = kept.length;
  if (!games) return null;

  const n = WINDOW_N[window] == null ? games : Math.min(games, WINDOW_N[window]);
  const use = kept.slice(games - n);

  /* Hver maelikvardi hefur SINA talningu — rod sem vantar `tgt` en
     hefur `car` telst i `car`-medaltalinu. Sama og `cnt` per
     maelikvarda i labinu. */
  const acc = { car: [0, 0], tgt: [0, 0], opp: [0, 0], pts: [0, 0] };
  const ptsField = POINTS_FIELD[scoringKey(o.scoring)] || null;

  for (const { r } of use) {
    const car = cell(r, "car");
    const tgt = cell(r, "tgt");
    if (car !== undefined && car !== null) { acc.car[0] += car; acc.car[1]++; }
    if (tgt !== undefined && tgt !== null) { acc.tgt[0] += tgt; acc.tgt[1]++; }
    /* `opp` eins og labid: null i BADUM -> engin rod; annars er
       vantandi svid 0. Rusl i hvorugu -> rodin er slept. */
    if (car !== undefined && tgt !== undefined && !(car === null && tgt === null)) {
      acc.opp[0] += (car || 0) + (tgt || 0); acc.opp[1]++;
    }
    if (ptsField) {
      const p = cell(r, ptsField);
      if (p !== undefined && p !== null) { acc.pts[0] += p; acc.pts[1]++; }
    }
  }
  const mean = (a) => (a[1] > 0 ? a[0] / a[1] : null);

  return {
    playerId: pid,
    throughWeek: through,
    window,
    games,
    windowGames: n,
    car: mean(acc.car),
    tgt: mean(acc.tgt),
    opp: mean(acc.opp),
    ppg: ptsField ? mean(acc.pts) : null,
  };
}

/* ============================================================
   2. VOGIN
   ============================================================ */

/**
 * Vog A TIMABILID (0 = notadu spana eina, 1 = spain hent).
 *
 * `0` er NULL-TILGATAN og hun er rett svar: fyrir 5 leiki er hun
 * maelda svarid (bilid w1-4 er ogreinanlegt fra nulli) og fyrir
 * omaelda stigagjof er hun eina heidarlega svarid — sama regla og
 * `weeklyEdgeNote`: omaeld stigagjof faer enga tolu.
 *
 * @param gamesPlayed leikir SPILADIR fyrir vikuna sem er spad
 *        (`usageToDate(...).games`).
 * @param scoring `"ppr"` | `"half-ppr"` | `"standard"`. Othekkt -> 0.
 */
export function blendWeight(gamesPlayed, scoring) {
  if (scoringKey(scoring) == null) return 0;
  const k = num(gamesPlayed);
  if (k == null || k <= 0) return 0;
  const eff = Math.max(0, k - CURVE.DEAD_GAMES);
  if (eff <= 0) return 0;
  const w = eff / (CURVE.K + eff);
  /* Bundid berum ordum. Formulan getur ekki farid ut fyrir [0,1) fyrir
     k >= 0, en klippingin er odyr og hun er thad sem ver kallandann
     gegn oheilu inntaki (`gamesPlayed: 1e308`). */
  return w < 0 ? 0 : w > 1 ? 1 : w;
}

/* ============================================================
   3. BLONDUNIN
   ============================================================ */

/**
 * Arstidar-spa blondud med notkun-til-thessa.
 *
 * @param seasonProj arstidar-spa i STIGUM (sama tala og
 *        `weekview.weekRows` deilir med 17).
 * @param usage utkoma `usageToDate` — notud fyrir `games` thegar
 *        `gamesPlayed` er ekki gefid.
 * @param scoring stigagjof deildarinnar.
 * @param gamesPlayed yfirskrifar `usage.games`.
 * @param toDatePerGame **matid a STIGA-KVARDA** ur notkun-til-thessa,
 *        tha VORPUN sem er ekki i `usage.json` (sja
 *        `USAGE_BLEND.mapping`). Vantar hana -> `null`.
 *
 * @returns blondud arstidar-spa, eda `null`.
 *
 * THRJAR UTKOMUR OG THAER ERU OLIKAR:
 *   · `null`  — vid getum ekki svarad (engin spa, enginn leikja-fjoldi,
 *               eda vog > 0 en engin vorpun).
 *   · `seasonProj` obreytt — vogin er 0. THAD ER SVAR, ekki bilun:
 *               fyrir viku 6 er maelda svarid "notadu spana eina".
 *   · blondud tala.
 *
 * ENGIN THOGUL VARALEID. Freistingin er ad nota `usage.ppg` thegar
 * vorpunina vantar — thad er ANNAD ARM (`ptsPG`), maelt serstaklega og
 * lakara, og ad setja thad inn undir nafni `opp` vaeri ad birta eina
 * maelingu sem adra.
 */
export function blendedSeasonProj(args) {
  const a = args || {};
  const proj = num(a.seasonProj);
  if (proj == null) return null;

  const u = a.usage && typeof a.usage === "object" ? a.usage : null;
  const k = num(a.gamesPlayed) != null ? num(a.gamesPlayed)
          : (u ? num(u.games) : null);
  if (k == null) return null;

  const w = blendWeight(k, a.scoring);
  if (w === 0) return proj;

  const td = num(a.toDatePerGame);
  if (td == null) return null;

  return (1 - w) * proj + w * GAMES_IN_SEASON * td;
}
