/* ============================================================
   weekview.js — VIKAN SEM ER I GANGI, REIKNUD EINU SINNI. HREIN.

   Ekkert React, ekkert `fetch`. Tekur vid rodum + leikjaskra + vorn og
   skilar theim rodum sem `lineup.js` vill sja.

   ============================================================
   HVERS VEGNA ÞETTA VAR DREGID UT
   ============================================================
   Vorpunin "arstidar-spa -> spa THESSARAR viku" var INNI I
   `MyTeam.jsx`: `base = proj / 17`, sidan `weeklyProjection()` med
   markadslinu og vorn-gegn-stodu, sidan `optimalLineup`. Hun var rett
   — en hun var i .jsx-skra og forsidan (`Dashboard.jsx`) tharf
   NAKVAEMLEGA sama reikning fyrir badar deildir notandans.

   Afrit hefdi verid onnur utfaersla af somu formulu. Thetta repo ber
   tvo skjolud tilfelli af thvi hvad thad kostar:
     · `buildTeamMetrics` i FPL-appinu var afritad inn i spa-bokhaldid.
       Afritid sleppti `sotFor`/`sotAg`, `prev*`-adloguninni og
       nyliða-staðgenglinum, og skrifadi `NaN` fyrir OLL 17 lidin —
       merkt `src:"e0"` eins og thad vaeri maeling. App.jsx var ALLTAF
       RETT; afritid laug.
     · `makeEnricher` i FPL var inni i `cook`, svo stigataflan hafdi
       20 varanlega toma kassa og thrir flokkar sogdu "No numbers".

   Reglan sem leiddi af theim: **hrein rokfraedi byr utan React og
   BADIR lesmatar flytja hana inn.** Thess vegna er thetta skra og
   thess vegna flytur `MyTeam.jsx` hana inn i stad thess ad bera hana.
   ============================================================ */

import { weeklyProjection, impliedTeamTotals } from "./model.js";
/* ÞESSI TALA VAR SKRIFUD TVISVAR. `usageblend.js` flytur `GAMES_IN_SEASON`
   ut MED ATHUGASEMD um ad thad se "sama tala og `weekview` deilir med" —
   og `weekview` bar sitt eigid `17`. Tvo afrit af somu forsendu, og
   athugasemdin sem nefndi thau bædi var eina tengingin.
   Nu er hun ein, og `usageblend.mjs` kafli 5b ber hana. */
import { GAMES_IN_SEASON } from "./usageblend.js";

/* ============================================================
   HVE MIKID ER VIKU-ADLOGUNIN THESS VIRDI — PER STIGAGJOF
   ============================================================
   `weeklyProjection` var maeld i PPR og talan 5,831% var borin a ALLAR
   deildir i vidmótinu. Þad var RANGT fyrir half-PPR og thad kom i ljos
   i `mktweek-lab` 12.8.2026, sem maeldi incumbent-inn i ollum thremur
   snidum FYRST — thad hafdi aldrei verid gert:

     ppr       5,831%   t=4,328   7/7 timabil jakvaed   MARKTAEKT
     standard  2,967%   t=2,831   6/7  (-1,23 arid 2019)   MARKTAEKT
     half      3,199%   t=1,908   5/7  (-1,07 arid 2020, -3,14 arid 2021)
                                       EKKI MARKTAEKT (throskuldur 2,228)

   Notandinn spilar i BADUM: Patriots er PPR, Sofahetjur er half-PPR.
   Ad birta "maelt 5,8%" a half-deildinni var ad lata OMARKTAEKA tolu
   lesast eins og maelda — versta utkoman i thessu repo-i, og hun var
   thogul thvi talan var raunveruleg, bara ur odru sniði.

   TAFLAN ER BOKUD HER OG VARIN GEGN `data/measure/mktweek.json` i
   `dashboard.mjs`, svo hun geti ekki rekid i thogn — sama mynstur og
   `HALF_LAB` i `rulebasis.js`. Endurkeyrsla labsins sem breytir tolunum
   fellir profid; tha uppfaerir madur TOFLUNA, ekki profid.           */
/* ============================================================
   TALAN VAR SMITUD AF LEIKNUM SEM HUN SPADI — LAGFAERT 13.8.2026
   ============================================================
   Adur stod her `pct: 5.831` og hun var borin a skjainn sem "measured".
   `defweek-lab` synir ad hun er **SJALF-SMITUD**, og eg stadfesti thad:

   `data/defense.json` er SEASON TOTAL — hver rod ber `games` 14-17, thad
   er ALLT timabilid. Bakprofid notadi thvi vorn sem er byggd ur ollu
   timabilinu til ad "spa" viku 3, svo leikurinn sem var spadur er
   INNI I INNTAKINU. Þetta er nakvaemlega leka-skilyrdid sem hvert lab i
   dag var latid forda — og incumbent-inn sjalfur braut thad.

   Sonnun, ekki alyktun: `leakySeasonK6` endurgerir 5,831 / 3,199 / 2,967
   UPP A NULL ur `data/weekly/` (hlutfoll skeika 8,7e-4), svo uppskiptingin
   er staðfest. Og orakelid segir sömu sogu ur annarri att: FULLKOMIN
   vitneskja um varnarstyrk FYRIR leik lokar adeins 4,938% i ppr — **minna
   en birta talan** — sem er omogulegt nema birta talan innihaldi leikinn.

      snid        birt (smitud)   WALK-FORWARD (hrein)   t      ar
      ppr             5,831            3,482            3,21   7/7
      half-ppr        3,199            2,860            2,615  6/7
      standard        2,967            2,245            2,862  6/7

   HREINA TALAN ER SU SEM ER BIRT NUNA. `leaky` er hofd med thvi
   `startsit_*.json` a disknum ber hana og prof pinna hana — en hun ma
   ekki vera thad sem notandinn les.

   OG EITT SNYST VID: eg birti half-ppr sem OMARKTAEKA (t=1,908 ur
   `mktweek-lab`). Hrein maeling gefur t=2,615, sem ER marktaekt gegn
   throskuldi 2,228. Smitid var thvi ekki adeins ad blasa upp ppr heldur
   lika ad fela ad half stendur. Baðar tolur eru i skranni; su hreina er
   birt og su smitada er merkt.

   ÞETTA ER MAELINGIN, EKKI APPID. I lifandi notkun byggir pipeline-id
   `defense.json` ur LOKNUM leikjum, svo vika sem er ospiluð er ekki i
   henni. Villan var i thvi HVAD VID SOGDUM ad talan vaeri, ekki i thvi
   hvad appid reiknar.                                                */
export const WEEKLY_MEASURED = {
  ppr: { pct: 3.482, t: 3.21, years: 7, positive: 7, significant: true,
         leakyPct: 5.831, leakyT: 4.328, leakyPositive: 7 },
  standard: { pct: 2.245, t: 2.862, years: 7, positive: 6, significant: true,
              leakyPct: 2.967, leakyT: 2.831, leakyPositive: 6 },
  "half-ppr": { pct: 2.860, t: 2.615, years: 7, positive: 6, significant: true,
                leakyPct: 3.199, leakyT: 1.908, leakyPositive: 5 },
};

/**
 * Throskuldurinn fyrir 7 timabil, tvihlida 5%.
 *
 * ============================================================
 * ÞETTA STOD SEM 2,228 OG ÞAD ER GILDID FYRIR df=10, EKKI df=6
 * ============================================================
 * 7 timabil gefa df = 7 - 1 = 6, og t(0,975; 6) = **2,447**. 2,228 er
 * t(0,975; 10) — heitid sagdi "7 ar" en talan var ur ellefu-ara rod.
 * `src/rulebasis.js` ber retta toflu og hun segir `7: 2.447`;
 * `usage.json` skrifar `tCrit: 2.447` vid `years: 7`. Þrjar heimildir
 * i sama repo-i og tvaer theirra voru samhljoda.
 *
 * ENGIN NIDURSTADA HAGGAST og thad er akkurat hvers vegna thetta lifdi:
 * oll thrju hrein t-gildi eru yfir BADUM throskuldum (3,21 / 2,862 /
 * 2,615) og smitada half-talan (1,908) er undir badum. Skekkjan var
 * thvi osynileg i utkomunni — en throskuldur sem er 9% of lagur er
 * DULID FRJALSLYNDI sem hefdi sagt "marktaekt" um t = 2,3 einn dag.
 *
 * Ekki harðkoda naesta throskuld: `rulebasis.js` ber toflu 3-11 og
 * `tCrit(years)` er thad sem a ad kalla se fjoldinn annar en 7.
 */
export const T_CRIT_7 = 2.447;

/**
 * Hvad ma SEGJA um viku-adlogunina i thessari deild.
 *
 * Omaeld eda omarktaek stigagjof faer EKKI toluna birta sem maelingu —
 * hun faer setningu sem segir ad hun se ekki marktaek. Sama regla og
 * `edgeSentence` i `rulebasis.js`: `significant: false` thydir ad TALAN
 * MA EKKI STANDA EIN.
 */
export function weeklyEdgeNote(scoring) {
  const m = WEEKLY_MEASURED[scoring];
  if (!m) {
    return { measured: false, significant: false,
      text: "The weekly adjustment has not been measured in this scoring format." };
  }
  if (!m.significant) {
    return { measured: true, significant: false, pct: m.pct, t: m.t,
      text: `In ${scoring} the weekly adjustment closes ${m.pct}% of the gap ` +
            `but that is NOT significant (t = ${m.t}, positive in only ` +
            `${m.positive} of ${m.years} seasons) — treat "Ours" as unproven here.` };
  }
  /* TALAN ER SU HREINA. Su smitada (`leakyPct`) er ~1,7 pp haerri i ppr og
     hun var birt fram ad 13.8.2026 — sja notuna vid `WEEKLY_MEASURED`. */
  return { measured: true, significant: true, pct: m.pct, t: m.t,
    text: `Measured walk-forward: closes ${m.pct}% of the available gap in ` +
          `${scoring} (t = ${m.t}, positive in ${m.positive} of ${m.years} ` +
          `seasons). Defence strength is taken from weeks already played only.` };
}

/**
 * VIKAN ER ADEINS LESIN A TIMABILINU.
 *
 * `meta.seasonType` er "pre" i forleik og tha er `week` 1 — sem vaeri
 * BORID SAMAN vid bye-viku 1 og gaefi ranga utkomu ef einhver baeri
 * hana. Enginn ber viku 1 (fyrsta auda vikan er 5), svo villan vaeri
 * THOGUL i ar og birtist fyrst thegar deildin faerist. Skilyrdid er
 * thvi a `seasonType`, ekki a thvi hvort talan lítur ut fyrir ad passa.
 *
 * Sama rok og i `MyTeam.jsx`, thar sem thetta var adur.
 */
export function currentWeek(meta) {
  if (!meta) return null;
  return (meta.seasonType === "regular" || meta.seasonType === "post")
    ? (Number.isFinite(Number(meta.week)) ? Number(meta.week) : null)
    : null;
}

/**
 * Samhengi vikunnar: markadslina per lid, motherji per lid, og
 * vorn-gegn-stodu. Reiknad EINU SINNI og endurnotad — `Dashboard`
 * kallar thetta fyrir tvaer deildir og samhengid er thad SAMA fyrir
 * badar (thad er NFL-vikan, ekki deildin).
 */
export function weekContext({ schedule, defense, week }) {
  if (week == null || !schedule) return null;
  /* Leikja-tegundin er SIAD. Skran ber lika forleiki og stjornuleik;
     `!g.type` er tekid med af thvi ad eldri radir bera hana ekki. */
  const games = schedule.filter((g) => g.week === week &&
    (g.type === "REG" || g.type === "POST" || !g.type));
  if (!games.length) return null;
  const implied = new Map(), opp = new Map();
  for (const g of games) {
    /* `impliedTeamTotals(total, spread)` — TVAER TOLUR PER LEIK, ekki
       markadsskra og leikjalisti. Fyrsta utgafa thessarar skrar giskadi
       a `(market, games)` og hefdi skilad `{home:null, away:null}` fyrir
       hvern einasta leik: engin markadslina, engin viku-adlogun, og
       ekkert hefdi sagt fra thvi — tolurnar hefdu einfaldlega verid
       arstidar-medaltalid med utlit viku-spar. Formerkid a `spread` er
       thegar profad i `market.mjs`. */
    const t = impliedTeamTotals(g.total, g.spread);
    if (t) { implied.set(g.home, t.home); implied.set(g.away, t.away); }
    opp.set(g.home, g.away); opp.set(g.away, g.home);
  }
  const dvp = new Map();
  for (const d of (defense || [])) dvp.set(`${d.team}|${d.pos}`, d);
  return { implied, opp, dvp, week };
}

/**
 * Rodir -> rodir sem `lineup.js` vill: `{ id, name, pos, team, proj,
 * avail, bye, injury }`, thar sem `proj` er spa THESSARAR VIKU.
 *
 * `ctx == null` (forleikur, eda engin vika) -> `proj` er
 * arstidar-spain deilt a 17 og ekkert annad. Thad er RETT: an
 * markadslinu og motherja hofum vid enga viku-serstaka vitneskju, og
 * ad birta arstidar-medaltal sem "spa vikunnar" er thad sem thad er.
 * Vid buum ekki til tolu ur engu.
 *
 * `proj == null` HELST NULL. Leikmadur an spar er ekki leikmadur med
 * spa 0 — `optimalLineup` setur hann a bekk OG telur hann i `unknown`,
 * sem er upplysing en ekki domur. NULL ER EKKI NULL.
 */
export function weekRows(roster, ctx) {
  return (roster || []).map((r) => {
    const base = r.proj != null ? r.proj / GAMES_IN_SEASON : null;
    let proj = base;
    if (ctx && base != null && r.team) {
      const o = ctx.opp.get(r.team);
      const d = o ? ctx.dvp.get(`${o}|${r.pos}`) : null;
      const wp = weeklyProjection({
        base, pos: r.pos, implied: ctx.implied.get(r.team),
        def: d ? { adj: d.adj, leagueMean: d.leagueMean } : null,
        avail: 1, bye: false,
      });
      if (wp && wp.pts != null) proj = wp.pts;
    }
    return {
      id: r.id, name: r.name, pos: r.pos, team: r.team, proj,
      /* BADAR TOLURNAR ERU SKILADAR, ekki bara okkar.
         `projSleeper` er Sleeper-spain deild a 17 — theirra tala, oadloguð.
         `proj` er OKKAR: sama tala eftir `weeklyProjection` (markadslina
         lidsins og vorn motherjans gegn stodunni).

         Notandinn bad um ad sja BADAR og thad er rett krafa: okkar tala
         er FULLYRDING um ad vid vitum eitthvad sem Sleeper missir, og
         fullyrding sem er birt EIN er ekki fullyrding heldur bara tala.
         Med badar vid hlidina getur hann seð hvenaer thaer eru osattar og
         hve mikid — og thad er lika thad sem bakprofid maelir.

         VIDVORUN VID LESTUR: `projSleeper` er ARSTIDAR-spa deild a 17,
         EKKI viku-spa fra Sleeper. Sleeper birtir viku-spar a
         `/projections/nfl/{season}/{week}` og pipeline-id saekir thaer
         EKKI enn (`scripts/sources/sleeper.mjs` sækir timabilid). Thegar
         thaer koma a `projSleeper` ad vera THEIRRA viku-tala; thangad til
         er thetta jafn-deiling og ma ekki lesast sem annad. */
      projSleeper: base,
      avail: r.avail,
      /* Auð vika er REIKNUD hér og ekki gefin ser. `bye: false`
         hardkodad thydir "enginn er nokkurn timann i frii", svo
         uppstillingartolid setti mann i byrjunarlid a THEIRRI VIKU SEM
         HANN SPILAR EKKI — null stig i saeti sem atti ad bera 12. */
      bye: ctx != null && r.bye != null && r.bye === ctx.week,
      injury: r.injury,
    };
  });
}

/* ============================================================
   DST — STREYMI, EKKI ROD. MAELINGIN VALDI EIGINLEIKANN.
   ============================================================
   Notandinn spilar i deild sem BYRJAR vorn, og appid sagdi ekkert um
   thad saeti. Fyrsta hugmyndin var „radadu vornunum" — og hun var maeld
   FYRST, af thvi ad svarid gat verid nei. Thad var nei.

   `scripts/dst-lab.mjs`, 2019-2025, 3.742 lidsvikur, gongum-afram
   (aldrei tímabil sem er verid ad spa i inntakinu):

     regla (efsti valinn, hverja viku)        umfram medal-vorn   t     ar
     ------------------------------------------------------------------
     rod eftir stigum i FYRRA                     +0,77          1,16   3/6
     rod eftir stigum THAD SEM AF ER              +1,14          1,83   5/6
     **STREYMI: laegsta vaenta skor motherja**    **+3,82**      5,75   6/6
     eigid vaent skor                             +1,63          2,74   6/6
     orakel (fullkomin vitneskja)                +15,53            —    6/6

   OG I RAUNVERULEGA HOPNUM SNYST RODIN VID. Deild med 12 lid draftar
   12 varnir, svo thad sem ma raunverulega skipta um er restin. Med
   hopnum takmorkudum vid tha sem VORU EKKI i topp-12 i fyrra:

     rod eftir stigum i fyrra                     **-0,82**     -1,66   0/6
     STREYMI                                      **+3,96**      6,86   6/6

   Rodin er thvi ekki bara veik a vírnum heldur NEGATIF, og hun er
   negatif i ollum sex arum. Ad blanda henni saman vid streymid SKADAR
   lika: +3,82 eitt sér -> +2,30 med halfu vaegi a rodina -> +1,92 med
   fullu. Hver einasti dropi af rodinni kostar.

   Placebo-fjolskylda (8 slembin skor gegnum sama net) nær hæst +0,26.
   Streymid er 15x thad thak.

   Og einbeitt gegn heilu timabili: ad HALDA bestu vorn fyrra ars gefur
   63,2 stigum MINNA en ad streyma (t=3,01, 5/6 timabil) — eina arid sem
   streymid tapar er 2022 (DAL, -29).

   ÞVI ER ENGIN DST-ROD BYGGD. `RANKED_POS` i `waivers.js` og
   `aRank`-utilokunin i `build.js` STANDA OBREYTT — thaer voru rettar og
   eru nu maeldar fyrir DST serstaklega, ekki adeins fyrir K.

   HVAD ER *EKKI* MAELT HER, og ma thvi ekki fullyrda: hvort thad borgi
   sig ad EYDA vaiver-forgangi i vornina. Labid maelir hvad efsti
   kosturinn skorar, ekki hvad thad kostar ad na honum.               */
export const DST_STREAM_MEASURED = {
  source: "data/measure/dst.json · dst-lab.mjs · 2019-2025",
  seasons: 7, teamWeeks: 3742,
  /* Efsti valinn per viku, umfram medaltal theirra sem spila thá viku. */
  stream: { gain: 3.82, t: 5.75, years: 6, positive: 6 },
  streamWaiverPool: { gain: 3.96, t: 6.86, years: 6, positive: 6 },
  prevSeasonRank: { gain: 0.77, t: 1.16, years: 6, positive: 3 },
  prevSeasonRankWaiverPool: { gain: -0.82, t: -1.66, years: 6, positive: 0 },
  seasonToDate: { gain: 1.14, t: 1.83, years: 6, positive: 5 },
  oracle: { gain: 15.53 },
  streamPlusHalfRank: { gain: 2.30 },
  streamPlusRank: { gain: 1.92 },
  placeboMax: 0.26,
  holdVsStream: { gain: 63.17, t: 3.01, years: 6, positive: 5 },
  /* Ferillinn milli ara — hann ER til, hann er bara ekki nothaefur. */
  yearOverYear: { r: 0.304, n: 192 },
  weekToWeek: { r: 0.049, n: 3518 },
};

/**
 * Hvad ma SEGJA um DST-streymid. Sama mynstur og `weeklyEdgeNote`:
 * talan stendur ALDREI ein thegar hun er ekki marktaek.
 */
export function dstStreamNote() {
  const m = DST_STREAM_MEASURED;
  return {
    measured: true, significant: true,
    text: `Measured walk-forward on ${m.seasons} seasons ` +
      `(${m.teamWeeks} team-weeks): starting the defence with the lowest ` +
      `expected opponent score is worth +${m.stream.gain} points a week over ` +
      `an average defence (t = ${m.stream.t}, positive in ` +
      `${m.stream.positive} of ${m.stream.years} seasons). Ranking defences by ` +
      `last season instead is worth +${m.prevSeasonRank.gain} ` +
      `(t = ${m.prevSeasonRank.t}) — and among the defences actually left on ` +
      `waivers it is ${m.prevSeasonRankWaiverPool.gain}. That is why this is a ` +
      `weekly matchup list and not a season ranking.`,
  };
}

/**
 * NULL SITUR SIDAST I BADAR ATTIR.
 *
 * Vorn an markadslinu (leikur sem bokmakarar hafa ekki opnad) og vorn i
 * frii bera BADAR `oppImplied = null`, og thaer mega hvorugum megin
 * fljota upp. Fyrsta utgafan skiladi `a - b` og `null` varð `0` i
 * frádraettinum — sem setti hvern lidslausan mann EFST i „laegsta
 * vaenta skor", thar sem hann las eins og fullkomin viðureign.
 *
 * `dir` er `"asc"` (laegst best — sjalfgefid fyrir DST) eda `"desc"`.
 */
export function compareOppImplied(a, b, dir = "asc") {
  const av = a && a.oppImplied != null && Number.isFinite(a.oppImplied);
  const bv = b && b.oppImplied != null && Number.isFinite(b.oppImplied);
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return dir === "desc" ? b.oppImplied - a.oppImplied : a.oppImplied - b.oppImplied;
}

/**
 * Vikuleg DST-tillaga: hvada vorn a ad byrja.
 *
 * `ctx`    ur `weekContext` (markadslina og motherji per lid)
 * `teams`  `[{ team, name, bye }]` — allar 32 varnir ur `players.json`
 * `taken`  audkenni varna sem EINHVER i deildinni a (Sleeper `players`)
 * `mine`   audkenni minnar varnar, eda null
 *
 * Skilar rodum thar sem `oppImplied` getur verid `null` — og tha ER thad
 * null alla leid a skjainn. Bye-vika og lina sem er ekki opnud eru
 * ADGREINDAR (`bye`), thvi thad eru olik svor: „hann spilar ekki" a móti
 * „vid vitum thad ekki enn".
 */
export function dstStream({ ctx, teams, taken, mine } = {}) {
  const list = Array.isArray(teams) ? teams.filter((t) => t && t.team) : [];
  if (!list.length) {
    return { week: ctx ? ctx.week : null, rows: [], best: [],
             why: "No defences were loaded." };
  }
  /* `taken` ma vera Set, fylki eda ekkert. Samraemt EINU SINNI hér svo
     hvor greinin sem er nedar geti ekki lesid hann odruvisi. */
  const own = taken instanceof Set ? taken
    : new Set(Array.isArray(taken) ? taken : []);

  if (!ctx) {
    /* Forleikur eda engin vika. VID BUUM EKKI TIL TOLU UR ENGU — sama
       regla og `weekRows` med `ctx == null`. */
    return { week: null, best: [],
      rows: list.map((t) => ({ team: t.team, name: t.name || t.team, opp: null,
        oppImplied: null, ownImplied: null, bye: false, rank: null,
        taken: own.has(t.team), mine: mine != null && t.team === mine })),
      why: "The season has not started, so there is no matchup to read yet." };
  }

  const rows = list.map((t) => {
    const opp = ctx.opp.get(t.team) ?? null;
    const raw = ctx.implied.get(t.team);
    /* MOTHERJANS vaenta skor er thad sem vornin gefur fra ser. `implied`
       ber EIGID vaent skor hvers lids, svo thetta er flettingin a
       motherjanum — ekki minus a minu eigin. Fyrsta utgafan las mitt og
       taldi hatt eigid skor gott fyrir vornina, sem maelist +1,63 en er
       ONNUR breyta og adeins 40% af merkinu. */
    const oppImplied = opp != null && ctx.implied.get(opp) != null
      ? ctx.implied.get(opp) : null;
    return {
      team: t.team, name: t.name || t.team, opp,
      /* `bye` er RAUNVERULEG frivika: engin rod i leikjaskra thessarar
         viku. Adgreint fra „engin lina" — sja skjolun ad ofan. */
      bye: opp == null,
      oppImplied,
      ownImplied: raw != null ? raw : null,
      taken: own.has(t.team),
      mine: mine != null && t.team === mine,
    };
  });
  rows.sort((a, b) => compareOppImplied(a, b, "asc") ||
                      String(a.team).localeCompare(String(b.team)));
  rows.forEach((r, i) => { r.rank = r.oppImplied == null ? null : i + 1; });

  /* Tillagan er ur theim sem eru LAUSIR (eda minir). Vorn sem annar a er
     ekki tillaga heldur upplysing, og hun er samt synd — „hann er
     tekinn" er svar, ekki thogn. */
  const best = rows.filter((r) => r.oppImplied != null && (!r.taken || r.mine)).slice(0, 3);
  const lines = rows.filter((r) => r.oppImplied != null).length;
  return {
    week: ctx.week, rows, best,
    why: lines ? null
      : "No betting lines are open for this week yet, so there is nothing to " +
        "rank on. This list is a matchup list — without a line it is empty, " +
        "not zero.",
  };
}

/** Hverjir eru i frii thessa viku. Synt sem upplysing, ekki fald. */
export function onByeThisWeek(roster, week) {
  if (week == null) return [];
  return (roster || []).filter((r) => r && r.bye != null && r.bye === week);
}
