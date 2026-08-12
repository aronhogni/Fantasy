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
