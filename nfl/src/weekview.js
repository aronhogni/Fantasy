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

/** Throskuldurinn sem `startsit_*.json` notar (7 ar, tvihlida 5%). */
export const T_CRIT_7 = 2.228;

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
    const base = r.proj != null ? r.proj / 17 : null;
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

/** Hverjir eru i frii thessa viku. Synt sem upplysing, ekki fald. */
export function onByeThisWeek(roster, week) {
  if (week == null) return [];
  return (roster || []).filter((r) => r && r.bye != null && r.bye === week);
}
