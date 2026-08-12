/* ============================================================
   standings.mjs — STADAN I DEILDINNI.

   Vorpunin er HREIN (`src/standings.js`), svo thetta prof keyrir
   NAKVAEMLEGA thad sem forsidan birtir — ekki afrit af thvi.

   ============================================================
   FASTAR ERU RAUNVERULEG SVOR, EKKI TILBUIN
   ============================================================
   Sott EINU SINNI med `curl` 12.8.2026, engin skilriki (endapunktarnir
   eru opnir med CORS-hausum):

     /league/1389356308104249344/{rosters,users}  Patriots SB champs 2026
     /league/1389328159903580160/{rosters,users}  Sofahetjur 2026
     /league/1257117602308689920/{rosters,users}  Patriots 2025, LOKID

   Profid sjalft kallar ALDREI a netid. Sama regla og felldi
   `euro-congestion.mjs` ut ur `npm test` i FPL-verkefninu: safn ma ekki
   falla af astaedu sem hefur ekkert med maelinguna ad gera.

   THRIDJA DEILDIN ER FORSENDA, EKKI SKRAUT. Badar deildir notandans eru
   i FORLEIK — hvert einasta `wins` og `fpts` er 0 og BAEDI
   `fpts_decimal` og `fpts_against` VANTAR ALVEG i svarinu. Vid theer
   tvaer eina er ekki haegt ad profa:
     · ad `fpts_decimal` se LESID (svidid er ekki thar)
     · ad jafnteflisbrot virki (allir eru jafnir)
     · ad `rank` verdi 1..N thegar spilad HEFUR verid
   Forveri deildarinnar (2025, `status: "complete"`) ber allt thetta med
   raunverulegum tolum, svo badar hlidar hverrar fullyrdingar eru
   maeldar a raunsvari.

   ============================================================
   HUNDRADSHLUTA-KVARDINN VAR MAELDUR, EKKI GISKADUR
   ============================================================
   `fpts_decimal: 34` gaeti verid ,34 eda ,3 — svarid segir thad ekki.
   Stadfest gegn OHADRI leid ad somu tolu: summa `points` ur
   `/league/1257117602308689920/matchups/{w}` fyrir vikur 1-14.

     fpts + fpts_decimal/100   hittir  10 af 10 rostrum upp a sentid
     fpts + fpts_decimal/10    hittir   0 af 10

   Daemi: roster 1 -> 1815,34 ur BADUM leidum. Og vikur 1-17 gefa
   2268,18, svo `fpts` er REGLULEGA TIMABILID eingongu
   (`playoff_week_start` er 15). Hvorugt er skjalad hja Sleeper.
   ============================================================ */

import { standingsFrom, myRosterId, recordLine } from "../src/standings.js";

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

/* ---------- Patriots SB champs 2026 — FORLEIKUR ---------- */
const PRE_ROSTERS = [
  {"roster_id":1,"owner_id":"868216551042633728","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":3,"wins":0}},
  {"roster_id":2,"owner_id":"868222498276323328","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":10,"wins":0}},
  {"roster_id":3,"owner_id":"469456652949516288","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":5,"wins":0}},
  {"roster_id":4,"owner_id":"868612999479500800","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":2,"wins":0}},
  {"roster_id":5,"owner_id":"868151501422501888","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":1,"wins":0}},
  {"roster_id":6,"owner_id":"869560416248975360","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":6,"wins":0}},
  {"roster_id":7,"owner_id":"388485536370724864","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":9,"wins":0}},
  {"roster_id":8,"owner_id":"997220149830778880","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":4,"wins":0}},
  {"roster_id":9,"owner_id":"868617705463414784","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":8,"wins":0}},
  {"roster_id":10,"owner_id":"869897369599287296","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":7,"wins":0}},
];
const PRE_USERS = [
  {"user_id":"388485536370724864","display_name":"mattitim"},
  {"user_id":"469456652949516288","display_name":"Fraudavailoa"},
  {"user_id":"868151501422501888","display_name":"Kittleruuules"},
  {"user_id":"868216551042633728","display_name":"SteindorB"},
  {"user_id":"868222498276323328","display_name":"Hjartarson"},
  {"user_id":"868612999479500800","display_name":"Ingolfs","metadata":{"team_name":"Birgir Bjöss"}},
  {"user_id":"868617705463414784","display_name":"CrazyCat"},
  {"user_id":"869560416248975360","display_name":"KanelGifler"},
  {"user_id":"869897369599287296","display_name":"OskarGG","metadata":{"team_name":"JerryJones for the Win"}},
  {"user_id":"997220149830778880","display_name":"Doriii","metadata":{"team_name":"The Kópavogs Monkeys"}},
];
/* `/league/{id}` snyrt ad theim svidum sem vorpunin les. */
const PRE_LEAGUE = { league_id: "1389356308104249344", name: "Patriots SB champs",
  season: "2026", status: "pre_draft", total_rosters: 10,
  settings: { num_teams: 10, playoff_teams: 6, playoff_week_start: 15, type: 0 } };

/* ---------- Patriots 2025 — LOKID, MED RAUNVERULEGUM TOLUM ---------- */
const DONE_ROSTERS = [
  {"roster_id":1,"owner_id":"868216551042633728","settings":{"fpts":1815,"fpts_against":1850,"fpts_against_decimal":84,"fpts_decimal":34,"losses":6,"ppts":1987,"ppts_decimal":64,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":3,"wins":8}},
  {"roster_id":2,"owner_id":"868222498276323328","settings":{"fpts":1814,"fpts_against":1785,"fpts_against_decimal":30,"fpts_decimal":84,"losses":7,"ppts":2022,"ppts_decimal":62,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":10,"wins":7}},
  {"roster_id":3,"owner_id":"469456652949516288","settings":{"fpts":1655,"fpts_against":1784,"fpts_against_decimal":68,"fpts_decimal":66,"losses":7,"ppts":1780,"ppts_decimal":6,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":5,"wins":7}},
  {"roster_id":4,"owner_id":"868612999479500800","settings":{"fpts":1651,"fpts_against":1798,"fpts_against_decimal":66,"fpts_decimal":44,"losses":9,"ppts":1777,"ppts_decimal":26,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":2,"wins":5}},
  {"roster_id":5,"owner_id":"868151501422501888","settings":{"fpts":2106,"fpts_against":1878,"fpts_against_decimal":42,"fpts_decimal":60,"losses":4,"ppts":2291,"ppts_decimal":40,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":1,"wins":10}},
  {"roster_id":6,"owner_id":"869560416248975360","settings":{"fpts":1885,"fpts_against":1970,"fpts_against_decimal":28,"fpts_decimal":54,"losses":6,"ppts":2126,"ppts_decimal":94,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":6,"wins":8}},
  {"roster_id":7,"owner_id":"388485536370724864","settings":{"fpts":1882,"fpts_against":1839,"fpts_against_decimal":64,"fpts_decimal":12,"losses":7,"ppts":2094,"ppts_decimal":2,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":9,"wins":7}},
  {"roster_id":8,"owner_id":"997220149830778880","settings":{"fpts":1774,"fpts_against":1747,"fpts_against_decimal":12,"fpts_decimal":46,"losses":8,"ppts":2010,"ppts_decimal":26,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":4,"wins":6}},
  {"roster_id":9,"owner_id":"868617705463414784","settings":{"fpts":1780,"fpts_against":1799,"fpts_against_decimal":22,"fpts_decimal":34,"losses":9,"ppts":1940,"ppts_decimal":94,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":8,"wins":5}},
  {"roster_id":10,"owner_id":"869897369599287296","settings":{"fpts":1915,"fpts_against":1828,"fpts_against_decimal":14,"fpts_decimal":96,"losses":7,"ppts":2131,"ppts_decimal":66,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":7,"wins":7}},
];
const DONE_USERS = [
  {"user_id":"388485536370724864","display_name":"mattitim"},
  {"user_id":"469456652949516288","display_name":"Tyreekavailoa"},
  {"user_id":"868151501422501888","display_name":"Kittleruuules"},
  {"user_id":"868216551042633728","display_name":"SteindorB"},
  {"user_id":"868222498276323328","display_name":"Hjartarson"},
  {"user_id":"868612999479500800","display_name":"Ingolfs","metadata":{"team_name":"Birgir Bjöss"}},
  {"user_id":"868617705463414784","display_name":"CrazyCat"},
  {"user_id":"869560416248975360","display_name":"KanelGifler"},
  {"user_id":"869897369599287296","display_name":"OskarGG","metadata":{"team_name":"JerryJones for the Win"}},
  {"user_id":"997220149830778880","display_name":"Doriii","metadata":{"team_name":"The Kópavogs Monkeys"}},
];
const DONE_LEAGUE = { league_id: "1257117602308689920", name: "Patriots SB champs",
  season: "2025", status: "complete", total_rosters: 10,
  settings: { num_teams: 10, playoff_teams: 6, playoff_week_start: 15, type: 0 } };

/* ---------- Sofahetjur 2026 — FORLEIKUR, 12 LID ----------
   HER ER RAUNVERULEG OSAMKVAEMNI I EINU OG SAMA SVARINU: rostur 1-10
   bera EKKI `fpts_decimal`, rostur 11-12 bera `fpts_decimal: 0`. Og
   `waiver_position` er **0** a rostri 11 og **-1** a rostri 12, sem er
   astaedan fyrir thvi ad thad svid er ekki lesid.

   EITT LIDSHEITI ER ORDID SJALFT OVIDEIGANDI og er skipt ut fyrir
   "[redacted]" — repo-id er OPINBERT. Engin fullyrding her les innihald
   thess heitis; adeins ad hver rod BERI heiti sem er ekki tomt. */
const SOFA_ROSTERS = [
  {"roster_id":1,"owner_id":"693234019730534400","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":8,"wins":0}},
  {"roster_id":2,"owner_id":"997220149830778880","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":2,"wins":0}},
  {"roster_id":3,"owner_id":"1132771651097178112","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":9,"wins":0}},
  {"roster_id":4,"owner_id":"868216551042633728","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":4,"wins":0}},
  {"roster_id":5,"owner_id":"869560416248975360","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":7,"wins":0}},
  {"roster_id":6,"owner_id":"469456652949516288","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":3,"wins":0}},
  {"roster_id":7,"owner_id":"1133587320516698112","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":10,"wins":0}},
  {"roster_id":8,"owner_id":"1133884334001258496","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":6,"wins":0}},
  {"roster_id":9,"owner_id":"1133919050880458752","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":1,"wins":0}},
  {"roster_id":10,"owner_id":"1134295739737305088","settings":{"fpts":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":5,"wins":0}},
  {"roster_id":11,"owner_id":"1264630962780639232","settings":{"fpts":0,"fpts_decimal":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":0,"wins":0}},
  {"roster_id":12,"owner_id":"728741029670428672","settings":{"fpts":0,"fpts_decimal":0,"losses":0,"ties":0,"total_moves":0,"waiver_budget_used":0,"waiver_position":-1,"wins":0}},
];
const SOFA_USERS = [
  {"user_id":"469456652949516288","display_name":"Fraudavailoa","metadata":{"team_name":"Gistiskýlis Greats"}},
  {"user_id":"693234019730534400","display_name":"elliblo"},
  {"user_id":"728741029670428672","display_name":"Nagmus69"},
  {"user_id":"868216551042633728","display_name":"SteindorB"},
  {"user_id":"869560416248975360","display_name":"KanelGifler"},
  {"user_id":"997220149830778880","display_name":"Doriii","metadata":{"team_name":"The Smárinn Seagulls"}},
  {"user_id":"1132771651097178112","display_name":"Palli3000","metadata":{"team_name":"PIP"}},
  {"user_id":"1133587320516698112","display_name":"jakobiDrakeMaye"},
  {"user_id":"1133884334001258496","display_name":"egille","metadata":{"team_name":"[redacted]"}},
  {"user_id":"1133919050880458752","display_name":"2004alex","metadata":{"team_name":"Lexus"}},
  {"user_id":"1134295739737305088","display_name":"arnargudjon"},
  {"user_id":"1264630962780639232","display_name":"BjarniKa","metadata":{"team_name":"Folarnir"}},
];
const SOFA_LEAGUE = { league_id: "1389328159903580160", name: "Sófahetjur",
  season: "2026", status: "pre_draft", total_rosters: 12,
  settings: { num_teams: 12, playoff_teams: 6, playoff_week_start: 15, type: 0 } };

/* Notandinn sjalfur er i BADUM deildum og med SAMA `user_id` — thess
   vegna er hann rostur 1 i annarri og rostur 4 i hinni, sem er
   nakvaemlega thad sem tharf til ad `myRosterId` geti ekki "svindlad"
   med thvi ad skila fyrsta lidinu. */
const ME = "868216551042633728";

/* ============================================================
   0. FORSENDURNAR — FASTARNIR ERU THAD SEM THEIR SEGJAST VERA
   ============================================================
   Kaflarnir her a eftir hafa merkingu ADEINS ad thessu gefnu. Fullyrding
   um "forleikur -> engin saeti" er tom ef fastinn er ekki forleikur, og
   fullyrding um `fpts_decimal` er tom ef svidid er ekki i honum
   (CLAUDE.md 5b: negativ fullyrding verdur ad nefna eitthvad sem VAR
   sannanlega tharna).                                                 */
console.log("\n0. forsendur um raunsvorin");
{
  ok(PRE_ROSTERS.length === 10 && SOFA_ROSTERS.length === 12 && DONE_ROSTERS.length === 10,
    `10 / 12 / 10 rostrar i svorunum`);

  ok(PRE_ROSTERS.every((r) => r.settings.wins === 0 && r.settings.losses === 0 &&
                              r.settings.ties === 0 && r.settings.fpts === 0),
    "FORLEIKUR: hvert wins/losses/ties/fpts er 0 i raunsvarinu");
  ok(PRE_ROSTERS.every((r) => !("fpts_decimal" in r.settings)),
    "og `fpts_decimal` VANTAR ALVEG (0 af 10 bera thad)");
  ok(PRE_ROSTERS.every((r) => !("fpts_against" in r.settings)),
    "og `fpts_against` vantar lika — thad er OTHEKKT, ekki 0");

  /* Sama svar, tvenns konar snid. Thetta er ekki tilbuid jadartilfelli. */
  const withDec = SOFA_ROSTERS.filter((r) => "fpts_decimal" in r.settings).length;
  ok(withDec === 2,
    `Sofahetjur: NAKVAEMLEGA 2 af 12 bera \`fpts_decimal\` (fann ${withDec}) — ` +
    `sama svar, tvenns konar snid`);
  ok(SOFA_ROSTERS.some((r) => r.settings.waiver_position === -1),
    "og eitt rostur ber `waiver_position: -1`, sem er ekki saeti (thvi er svidid ekki lesid)");

  ok(DONE_ROSTERS.every((r) => "fpts_decimal" in r.settings),
    "LOKID TIMABIL: hvert rostur ber `fpts_decimal`");
  ok(DONE_ROSTERS.filter((r) => r.settings.fpts_decimal !== 0).length === 10,
    "og hvert eitt er ANNAD en 0 — svo gildran er raunverulega i gognunum");
  ok(DONE_ROSTERS.some((r) => r.settings.wins === 7) &&
     DONE_ROSTERS.filter((r) => r.settings.wins === 7).length === 4,
    "og fjogur lid eru jofn a 7 sigrum — jafnteflisbrotid er raunverulegt");
}

/* ============================================================
   1. `fpts_decimal` ER LESID — GILDRAN SJALF
   ============================================================
   `fpts: 1815` er FULLKOMLEGA TRUVERDUG stigatala. Vaeri `fpts_decimal`
   olesid faerdi ekkert merki, ekkert hrun og engin skekkja sem sest:
   talan er 0,02% fra rettu. Thess vegna er hun profud BEINT — baedi ad
   hun se rett OG ad hun se EKKI heiltalan.

   Kvardinn (hundradshlutar, ekki tiundu) var maeldur gegn summu
   `matchups`-vikna 1-14: /100 hitti 10 af 10, /10 hitti 0 af 10.       */
console.log("\n1. stigin eru TVEIR reitir");
{
  const st = standingsFrom({ rosters: DONE_ROSTERS, users: DONE_USERS, league: DONE_LEAGUE });
  const by = new Map(st.rows.map((r) => [r.rosterId, r]));
  ok(st.rows.length === 10, `forsendan: 10 radir (${st.rows.length})`);

  ok(by.get(1).pointsFor === 1815.34,
    `roster 1: fpts 1815 + fpts_decimal 34 -> 1815,34 (fann ${by.get(1).pointsFor})`);
  ok(by.get(1).pointsFor !== 1815,
    "og EKKI 1815 — heiltalan ein er thogla villan");
  ok(by.get(1).pointsAgainst === 1850.84,
    `stig a sig lesa sama hatt: 1850,84 (fann ${by.get(1).pointsAgainst})`);
  ok(by.get(1).pointsAgainst !== 1850, "og EKKI 1850");

  /* Ollum tiu, thvi ein rod gaeti hitt af tilviljun. Talan er borin vid
     hundradshluta-summu, svo `toFixed` getur ekki hulid fleytitolu-slys. */
  const want = { 1: 1815.34, 2: 1814.84, 3: 1655.66, 4: 1651.44, 5: 2106.60,
                 6: 1885.54, 7: 1882.12, 8: 1774.46, 9: 1780.34, 10: 1915.96 };
  const hits = Object.entries(want).filter(([id, v]) => by.get(Number(id)).pointsFor === v).length;
  ok(hits === 10, `oll tiu stigagildin upp a sentid (${hits}/10)`);

  /* ---------- OG HUN VERDUR AD RADA ----------
     Prof a GILDINU eina getur stadist thott rodunin lesi heiltoluna.
     Her er par med SAMA `wins` og SOMU heiltolu og adeins
     hundradshlutinn skilur — tha ER decimalinn jafnteflisbrotid. */
  const cents = standingsFrom({
    rosters: [
      { roster_id: 1, owner_id: "a", settings: { wins: 7, losses: 7, ties: 0, fpts: 1500, fpts_decimal: 10 } },
      { roster_id: 2, owner_id: "b", settings: { wins: 7, losses: 7, ties: 0, fpts: 1500, fpts_decimal: 90 } },
    ],
    users: [{ user_id: "a", display_name: "Lower" }, { user_id: "b", display_name: "Higher" }],
    league: { settings: { num_teams: 2, playoff_teams: 1 } } });
  ok(cents.rows.length === 2 && cents.complete === true, "forsendan: tvo lid sem HAFA spilad");
  ok(cents.rows[0].name === "Higher" && cents.rows[0].rank === 1,
    `1500,90 radast ofar en 1500,10 (fann ${cents.rows[0].name} i saeti 1)`);
  ok(cents.rows[1].name === "Lower", "og hitt i saeti 2");

  /* ---------- FORLEIKUR: 0 ER MAELT NULL, VANTANDI ER NULL ----------
     Nakvaemlega su greining sem CLAUDE.md 8 gerir. `fpts: 0` ER i
     svarinu, svo 0 er rett svar. `fpts_against` er EKKI i svarinu, svo
     "points against: 0" vaeri fullyrding sem gognin bera ekki. */
  const pre = standingsFrom({ rosters: PRE_ROSTERS, users: PRE_USERS, league: PRE_LEAGUE });
  ok(pre.rows.length === 10 && pre.rows.every((r) => r.pointsFor === 0),
    "forleikur: `fpts: 0` er thar, svo pointsFor er 0 (maelt null)");
  ok(pre.rows.every((r) => r.pointsAgainst === null),
    "en `fpts_against` vantar, svo pointsAgainst er NULL — ekki 0");
  ok(pre.rows.every((r) => r.pointsAgainst !== 0),
    "og hvergi 0 tharna (NULL ER EKKI NULL)");

  /* Rusl i tolusvidi ma ekki verda 0 og ma ALDREI verda NaN. */
  const bad = standingsFrom({
    rosters: [{ roster_id: 1, owner_id: "a", settings: { wins: 3, losses: 1, ties: 0, fpts: "mikid", fpts_decimal: 44 } }],
    users: [], league: PRE_LEAGUE });
  ok(bad.rows[0].pointsFor === null,
    `\`fpts: "mikid"\` -> null, ekki 0 og ekki NaN (fann ${bad.rows[0].pointsFor})`);
  ok(!Number.isNaN(bad.rows[0].pointsFor), "og sannanlega ekki NaN");

  /* `fpts_decimal` utan 0-99 er ekki hundradshluti og ma ekki leggjast vid. */
  const wild = standingsFrom({
    rosters: [{ roster_id: 1, owner_id: "a", settings: { wins: 3, losses: 1, ties: 0, fpts: 100, fpts_decimal: 156 } }],
    users: [], league: PRE_LEAGUE });
  ok(wild.rows[0].pointsFor === 100,
    `\`fpts_decimal: 156\` er sleppt (fann ${wild.rows[0].pointsFor}, ekki 101,56)`);
}

/* ============================================================
   2. FORLEIKUR — MIKILVAEGASTA KRAFAN
   ============================================================
   Tafla sem radar tiu lidum 1-10 eftir ENGUM leikjum er TILBUNINGUR MED
   UTLIT MAELINGAR. Rodin yrdi innslattarrod svarsins og notandinn laesi
   hana sem stodu.

   FULLYRDINGIN UM LENGDINA KEMUR FYRST OG HUN ER EKKI SKRAUT:
   `rows.every(r => r.rank === null)` er SATT UM TOMT FYLKI. Nakvaemlega
   sama gildra og fjorda tilfellid i CLAUDE.md 5b, thar sem stokkbreyting
   slapp i gegn af thvi ad fullyrdingin tharfnadist tveggja hluta til ad
   bregdast. Her tharf hun bara eitt — svo lengdin er fullyrd ser.

   OG BADAR ATTIR: safn sem segir "engin saeti" verdur lika ad geta
   sagt "saeti" — annars gaeti `complete` verid fasti.                  */
console.log("\n2. forleikur -> ENGIN rodun");
{
  for (const [name, R, U, L, n] of [
    ["Patriots", PRE_ROSTERS, PRE_USERS, PRE_LEAGUE, 10],
    ["Sofahetjur", SOFA_ROSTERS, SOFA_USERS, SOFA_LEAGUE, 12],
  ]) {
    const st = standingsFrom({ rosters: R, users: U, league: L, userId: ME });
    ok(st.rows.length === n, `${name}: ${n} radir (${st.rows.length}) — an thess er naesta lina tom`);
    ok(st.complete === false, `${name}: complete === false`);
    ok(typeof st.why === "string" && st.why.length >= 12,
      `${name}: why segir hvers vegna ("${st.why}")`);
    ok(st.rows.filter((r) => r.rank === null).length === n,
      `${name}: HVERT rank er null (${st.rows.filter((r) => r.rank === null).length}/${n})`);
    ok(st.rows.every((r) => r.inPlayoffs === false),
      `${name}: enginn er i urslitakeppni — saeti er AFLAD, og 0 leikir afla thess ekki`);
    ok(st.rows.every((r) => recordLine(r) === null),
      `${name}: recordLine er null, EKKI "0-0-0"`);
    /* Reglan er lesanleg thott engin maeling se til — hun er regla, ekki maeling. */
    ok(st.playoffTeams === 6, `${name}: playoffTeams 6 lest samt (${st.playoffTeams})`);
    /* Birtingarrodin er rostur-rod og ma ekki lesast sem rodun. */
    ok(String(st.rows.map((r) => r.rosterId)) ===
       String(Array.from({ length: n }, (_, i) => i + 1)),
      `${name}: birtingarrodin er rostur-rod 1..${n}, ekki rodun`);
  }

  /* ---------- HIN ATTIN ----------
     Sama deild, en EINN leikur spiladur. Tha VERDUR taflan ad verda til.
     Vaeri `complete` fasti (eda `rank` alltaf null) fellur thetta. */
  const played = PRE_ROSTERS.map((r, i) => ({
    ...r, settings: { ...r.settings, wins: i % 2, losses: 1 - (i % 2), fpts: 100 + i, fpts_decimal: 0 } }));
  const st = standingsFrom({ rosters: played, users: PRE_USERS, league: PRE_LEAGUE });
  ok(st.complete === true, "einn leikur spiladur -> complete === true");
  ok(st.why === null, "og why er null — taflan ER maeling, kallandinn hefur ekkert ad birta");
  ok(String(st.rows.map((r) => r.rank)) === String([1,2,3,4,5,6,7,8,9,10]),
    `og saetin eru 1..10 thett (${st.rows.map((r) => r.rank).join(",")})`);

  /* ---------- OG EITT LID SEM HEFUR EKKI SPILAD NAEGIR ----------
     Ad rada lidi med 0 leiki innan um lid med leiki er sami tilbuningur
     i minni utgafu. */
  const mixed = played.map((r, i) => (i === 3
    ? { ...r, settings: { ...r.settings, wins: 0, losses: 0, ties: 0 } } : r));
  const mx = standingsFrom({ rosters: mixed, users: PRE_USERS, league: PRE_LEAGUE });
  ok(mx.complete === false && /1 of 10/.test(String(mx.why)),
    `eitt lid an leikja stodvar toffluna og why nefnir fjoldann ("${mx.why}")`);
}

/* ============================================================
   3. LOKID TIMABIL — RODIN SEM DEILDIN RADADIST I
   ============================================================
   Vaentanleg rod er TALIN ut ur raunsvarinu, ekki spurd af kodanum:
     saeti 1  roster 5   10-4-0  2106,60
     saeti 2  roster 6    8-6-0  1885,54
     saeti 3  roster 1    8-6-0  1815,34
     saeti 4  roster 10   7-7-0  1915,96
     saeti 5  roster 7    7-7-0  1882,12
     saeti 6  roster 2    7-7-0  1814,84
     saeti 7  roster 3    7-7-0  1655,66
     saeti 8  roster 8    6-8-0  1774,46
     saeti 9  roster 9    5-9-0  1780,34
     saeti 10 roster 4    5-9-0  1651,44
   Takid eftir saeti 4-7: fjogur lid a somu sigrum, radad EINGONGU af
   stigum fyrir — thad er jafnteflisbrotid i beinni.                    */
console.log("\n3. lokid timabil");
{
  const st = standingsFrom({ rosters: DONE_ROSTERS, users: DONE_USERS, league: DONE_LEAGUE, userId: ME });
  ok(st.rows.length === 10, `10 radir (${st.rows.length})`);
  ok(st.complete === true && st.why === null, "complete === true, why === null");
  ok(String(st.rows.map((r) => r.rank)) === String([1,2,3,4,5,6,7,8,9,10]),
    `saetin 1..10 thett (${st.rows.map((r) => r.rank).join(",")})`);
  ok(new Set(st.rows.map((r) => r.rank)).size === 10, "og hvert saeti er einkvaemt");
  ok(String(st.rows.map((r) => r.rosterId)) === String([5,6,1,10,7,2,3,8,9,4]),
    `rodin er ${st.rows.map((r) => r.rosterId).join(",")} (taldi 5,6,1,10,7,2,3,8,9,4)`);

  /* Metid og heitin. `team_name` gengur framar `display_name`. */
  ok(recordLine(st.rows[0]) === "10-4-0", `sigurlidid er 10-4-0 (${recordLine(st.rows[0])})`);
  const by = new Map(st.rows.map((r) => [r.rosterId, r]));
  ok(by.get(1).name === "SteindorB", `roster 1 ber display_name (${by.get(1).name})`);
  ok(by.get(8).name === "The Kópavogs Monkeys",
    `roster 8 ber team_name, sem gengur framar (${by.get(8).name})`);
  ok(by.get(10).name === "JerryJones for the Win", `og roster 10 lika (${by.get(10).name})`);
  ok(recordLine(by.get(1)) === "8-6-0", `metid er "8-6-0" (${recordLine(by.get(1))})`);
}

/* ============================================================
   4. JAFNTEFLISBROTID — SIGRAR > JAFNTEFLI > STIG FYRIR
   ============================================================
   Hver lidur er profadur BEINT og med lid sem VINNUR a einum lid en
   TAPAR a odrum, svo rett utkoma geti ekki komid af tilviljun. Vaeri
   rodin `stig > jafntefli` (eda innslattarrod) fellur kafli (b).       */
console.log("\n4. jafnteflisbrotid");
{
  const mk = (rows) => standingsFrom({
    rosters: rows.map((x, i) => ({ roster_id: i + 1, owner_id: `u${i + 1}`,
      settings: { wins: x.w, losses: x.l, ties: x.t, fpts: x.p, fpts_decimal: 0 } })),
    users: rows.map((x, i) => ({ user_id: `u${i + 1}`, display_name: x.n })),
    league: { settings: { num_teams: rows.length, playoff_teams: 1 } } });

  /* (a) somu sigrar, olik stig -> STIGIN rada. */
  const a = mk([{ n: "Low", w: 7, l: 7, t: 0, p: 1400 }, { n: "High", w: 7, l: 7, t: 0, p: 1900 }]);
  ok(String(a.rows.map((r) => r.name)) === "High,Low",
    `somu sigrar: haerri stig ofar (${a.rows.map((r) => r.name).join(",")})`);
  /* Og hin attin: sami inntakslisti i ANDSTAEDRI rod verdur ad gefa SOMU
     utkomu. Annars var thad innslattarrodin sem radadi. */
  const a2 = mk([{ n: "High", w: 7, l: 7, t: 0, p: 1900 }, { n: "Low", w: 7, l: 7, t: 0, p: 1400 }]);
  ok(String(a2.rows.map((r) => r.name)) === "High,Low",
    "og snuinn inntakslisti gefur SOMU rod (thad var ekki innslattarrodin)");

  /* (b) JAFNTEFLI GENGUR FRAMAR STIGUM. 7-6-1 er ofar en 7-7-0 thott
         stigin seu LAEGRI — leikurinn var ekki tapadur. Thetta er lidurinn
         sem fellur ef nokkur snyr rodinni vid. */
  const b = mk([{ n: "TieHasLowPts", w: 7, l: 6, t: 1, p: 1200 },
                { n: "NoTieHasHighPts", w: 7, l: 7, t: 0, p: 2000 }]);
  ok(String(b.rows.map((r) => r.name)) === "TieHasLowPts,NoTieHasHighPts",
    `7-6-1 med 1200 stig er OFAR en 7-7-0 med 2000 (${b.rows.map((r) => r.name).join(",")})`);

  /* (c) SIGRAR GANGA FRAMAR BADUM. */
  const c = mk([{ n: "SevenWinsTie", w: 7, l: 6, t: 1, p: 2500 },
                { n: "EightWins", w: 8, l: 6, t: 0, p: 1000 }]);
  ok(String(c.rows.map((r) => r.name)) === "EightWins,SevenWinsTie",
    `8 sigrar med 1000 stig eru ofar en 7 sigrar + jafntefli med 2500 ` +
    `(${c.rows.map((r) => r.name).join(",")})`);

  /* (d) Vantandi tala radast SIDAST, ekki eins og 0 og ekki eins og bestur. */
  const d = standingsFrom({
    rosters: [
      { roster_id: 1, owner_id: "a", settings: { wins: 5, losses: 9, ties: 0, fpts: 1000, fpts_decimal: 0 } },
      { roster_id: 2, owner_id: "b", settings: { wins: 5, losses: 9, ties: 0, fpts: "?", fpts_decimal: 0 } },
    ],
    users: [{ user_id: "a", display_name: "HasPts" }, { user_id: "b", display_name: "NoPts" }],
    league: { settings: { num_teams: 2, playoff_teams: 1 } } });
  ok(String(d.rows.map((r) => r.name)) === "HasPts,NoPts",
    `vantandi stigatala radast SIDAST (${d.rows.map((r) => r.name).join(",")})`);
}

/* ============================================================
   5. URSLITAKEPPNIN — N EFSTU, OG BADAR ATTIR
   ============================================================
   "inPlayoffs er satt a theim sem eiga saeti" er halft prof; "og falskt
   a theim sem eiga thad ekki" er hinn helmingurinn. Vaeri thad alltaf
   `true` (eda alltaf `false`) faeri annar helmingurinn i gegn.        */
console.log("\n5. urslitakeppnin");
{
  const st = standingsFrom({ rosters: DONE_ROSTERS, users: DONE_USERS, league: DONE_LEAGUE });
  ok(st.playoffTeams === 6, `playoffTeams 6 ur league.settings (${st.playoffTeams})`);
  const yes = st.rows.filter((r) => r.inPlayoffs === true);
  const no = st.rows.filter((r) => r.inPlayoffs === false);
  ok(yes.length === 6 && no.length === 4, `6 inni, 4 uti (${yes.length}/${no.length})`);
  ok(yes.every((r) => r.rank <= 6), "og allir sem eru inni eru i saeti 1-6");
  ok(no.every((r) => r.rank > 6), "og allir sem eru uti eru i saeti 7-10");
  ok(String(yes.map((r) => r.rosterId)) === String([5,6,1,10,7,2]),
    `rostrarnir sex eru 5,6,1,10,7,2 (${yes.map((r) => r.rosterId).join(",")})`);

  /* Ovitad cut -> `null`, EKKI `false`. `false` segdi "thu ert ekki i
     urslitakeppninni", sem er fullyrding sem gognin bera ekki. */
  const noCut = standingsFrom({
    rosters: DONE_ROSTERS, users: DONE_USERS,
    league: { total_rosters: 10, settings: { num_teams: 10 } } });
  ok(noCut.playoffTeams === null, "vantandi `playoff_teams` -> null");
  ok(noCut.rows.length === 10 && noCut.rows.every((r) => r.inPlayoffs === null),
    "og inPlayoffs er NULL a ollum, ekki false");
  ok(noCut.rows.every((r) => r.rank != null),
    "en saetin standa — cutid er onnur spurning en rodin");

  /* Fleiri saeti en lid er skemmt svar og ma ekki gefa "allir inni". */
  const wild = standingsFrom({
    rosters: DONE_ROSTERS, users: DONE_USERS,
    league: { total_rosters: 10, settings: { num_teams: 10, playoff_teams: 99 } } });
  ok(wild.playoffTeams === null && wild.rows.every((r) => r.inPlayoffs === null),
    "99 saeti i 10-lida deild er skemmt svar -> null, ekki 'allir inni'");
  const zero = standingsFrom({
    rosters: DONE_ROSTERS, users: DONE_USERS,
    league: { total_rosters: 10, settings: { num_teams: 10, playoff_teams: 0 } } });
  ok(zero.playoffTeams === null, "0 saeti er lika skemmt svar");
}

/* ============================================================
   6. METID SEM STRENGUR
   ============================================================
   "0-0-0" les NAKVAEMLEGA eins ut og maelt jafnt met eftir 14 vikur.
   Thess vegna er hun `null` i forleik — sama regla og "tomt gildi er
   SLEPPT, ekki sett i 0".                                            */
console.log("\n6. recordLine");
{
  ok(recordLine({ wins: 7, losses: 5, ties: 1 }) === "7-5-1", "7-5-1");
  ok(recordLine({ wins: 8, losses: 6, ties: 0 }) === "8-6-0",
    "jafnteflin eru ALLTAF med, lika 0 — tvo snid i sama dalki eru verri en eitt");
  ok(recordLine({ wins: 0, losses: 1, ties: 0 }) === "0-1-0",
    "0 sigrar EFTIR leik er raunverulegt met og verdur ad birtast");
  ok(recordLine({ wins: 0, losses: 0, ties: 0 }) === null,
    "en 0-0-0 er ENGIN met -> null");
  ok(recordLine({ wins: 0, losses: 0, ties: 0 }) !== "0-0-0",
    "og sannanlega ekki strengurinn \"0-0-0\"");
  for (const junk of [null, undefined, {}, 42, "7-5-1", [],
                      { wins: "x", losses: 5, ties: 0 },
                      { wins: 7, losses: null, ties: 0 }]) {
    ok(recordLine(junk) === null, `rusl gefur null: ${JSON.stringify(junk)}`);
  }
}

/* ============================================================
   7. MITT ROSTUR — `null` MA ALDREI LESAST SEM ROSTUR 0
   ============================================================
   Notandinn er i BADUM deildum med sama `user_id` og er rostur **1** i
   annarri og **4** i hinni. Thess vegna getur "skila fyrsta lidinu"
   ekki stadist baedi — sem er nakvaemlega thad sem stokkbreytingin gerir.
   ============================================================ */
console.log("\n7. myRosterId");
{
  ok(myRosterId({ rosters: PRE_ROSTERS, users: PRE_USERS, userId: ME }) === 1,
    "Patriots: eigandi 868216551042633728 er rostur 1");
  ok(myRosterId({ rosters: SOFA_ROSTERS, users: SOFA_USERS, userId: ME }) === 4,
    "Sofahetjur: SAMI notandi er rostur 4 — svo 'fyrsta lidid' getur ekki stadist");

  /* Othekktur notandi. Thrjar fullyrdingar, thvi `null`, `0` og `1` eru
     thrju olik ranghermi og fullyrding um eitt theirra utilokar ekki hin. */
  const unknown = myRosterId({ rosters: PRE_ROSTERS, users: PRE_USERS, userId: "999999999999999999" });
  ok(unknown === null, `othekktur notandi -> null (fann ${unknown})`);
  ok(unknown !== 0, "og EKKI 0");
  ok(unknown !== 1, "og EKKI fyrsta lidid");

  for (const junk of [null, undefined, "", "   ", {}, [], 0, NaN]) {
    ok(myRosterId({ rosters: PRE_ROSTERS, users: PRE_USERS, userId: junk }) === null,
      `rusl-userId gefur null: ${JSON.stringify(junk)}`);
  }
  ok(myRosterId({ rosters: null, users: null, userId: ME }) === null, "rosters null -> null");
  ok(myRosterId({}) === null, "engin gogn -> null");
  ok(myRosterId() === null, "ekkert inntak -> null, ekkert hrun");

  /* Notandinn hefur NOTANDANAFN i hendi, ekki 19-stafa snjokorn. */
  ok(myRosterId({ rosters: PRE_ROSTERS, users: PRE_USERS, userId: "SteindorB" }) === 1,
    "notandanafn gengur lika (SteindorB -> 1)");
  ok(myRosterId({ rosters: PRE_ROSTERS, users: PRE_USERS, userId: "steindorb" }) === 1,
    "og beran samanburd, thvi thad er slegid inn i hendi");
  ok(myRosterId({ rosters: PRE_ROSTERS, users: PRE_USERS, userId: "The Kópavogs Monkeys" }) === 8,
    "lidsheiti gengur lika (-> 8)");

  /* TVIRAETT -> ENGIN PORUN. Thogul rong porun er verri en engin (sama
     regla og `names.mjs`: "tviraedur lykill skilar ENGU"). */
  const dupes = [{ user_id: "x1", display_name: "Twin" }, { user_id: "x2", display_name: "Twin" }];
  const dupeRosters = [{ roster_id: 3, owner_id: "x1" }, { roster_id: 4, owner_id: "x2" }];
  ok(myRosterId({ rosters: dupeRosters, users: dupes, userId: "Twin" }) === null,
    "tvo lid med sama heiti -> null, ekki fyrsta");
  ok(myRosterId({ rosters: dupeRosters, users: dupes, userId: "x2" }) === 4,
    "en `user_id` er einkvaemt og gengur samt");
  /* Notandi i deildinni sem eigir ekkert rostur. */
  ok(myRosterId({ rosters: [{ roster_id: 1, owner_id: "x1" }], users: dupes, userId: "x2" }) === null,
    "notandi an rosturs -> null");
}

/* ============================================================
   8. isMe — REITUR SEM VID GETUM EKKI FYLLT FAER EKKI REIT
   ============================================================
   `isMe: false` a hverri rod thegar vid vitum ekki hver notandinn er
   vaeri fullyrding um rodina sem ER hann: "thetta er ekki thu" um lidid
   thitt. Reiturinn er thvi EKKI TIL i thvi tilfelli — og profid krefst
   thess i BADAR attir, thvi "vantar alltaf" er jafn gagnslaust og
   "false alltaf".                                                     */
console.log("\n8. isMe");
{
  const with_ = standingsFrom({ rosters: DONE_ROSTERS, users: DONE_USERS, league: DONE_LEAGUE, userId: ME });
  ok(with_.rows.filter((r) => r.isMe === true).length === 1,
    `med userId: NAKVAEMLEGA ein rod er min (${with_.rows.filter((r) => r.isMe === true).length})`);
  ok(with_.rows.find((r) => r.isMe === true).rosterId === 1, "og hun er rostur 1");
  ok(with_.rows.filter((r) => r.isMe === false).length === 9, "og hinar niu eru merktar false");

  const without = standingsFrom({ rosters: DONE_ROSTERS, users: DONE_USERS, league: DONE_LEAGUE });
  ok(without.rows.length === 10 && without.rows.every((r) => !("isMe" in r)),
    "an userId ber ENGIN rod reitinn `isMe` — ekki `false` a ollum");
  const bogus = standingsFrom({ rosters: DONE_ROSTERS, users: DONE_USERS, league: DONE_LEAGUE, userId: "999" });
  ok(bogus.rows.every((r) => !("isMe" in r)),
    "og othekktur userId gefur ekki `isMe: false` a alla heldur");
}

/* ============================================================
   9. RUSL-SVOR — OG GILT SVAR MA EKKI SKEMMAST
   ============================================================
   Svar fra ytri heimild er alveg eins ovarid og blob i vafranum
   (`saved-state.mjs`). En vordurinn ma ekki verda ad thvi ad henda
   RAUNVERULEGRI stodu notandans, svo sidasta fullyrdingin i kaflanum er
   ad gilt svar fari OBREYTT i gegn.                                    */
console.log("\n9. rusl-svor");
{
  const junk = [
    {},
    { rosters: null, users: null, league: null },
    { rosters: [], users: [], league: {} },
    { rosters: "nei", users: "nei", league: "nei" },
    { rosters: [null, undefined, 42, "x", []], users: null, league: {} },
    { rosters: [{ roster_id: 1 }], users: null, league: {} },
    { rosters: [{ roster_id: 1, owner_id: null, settings: null }], users: PRE_USERS, league: PRE_LEAGUE },
    { rosters: [{ roster_id: 1, owner_id: "868216551042633728", settings: { wins: "mikid", losses: null, ties: [], fpts: "mikid", fpts_decimal: "x" } }],
      users: PRE_USERS, league: PRE_LEAGUE },
    { rosters: PRE_ROSTERS, users: [{ user_id: "868216551042633728", display_name: "   " }], league: PRE_LEAGUE },
    { rosters: PRE_ROSTERS, users: [{ user_id: "868216551042633728", metadata: "nei" }], league: PRE_LEAGUE },
    { rosters: PRE_ROSTERS, users: PRE_USERS, league: { settings: "nei" } },
    { rosters: DONE_ROSTERS, users: null, league: DONE_LEAGUE },
    { rosters: DONE_ROSTERS, users: DONE_USERS, league: {}, userId: 12345 },
  ];
  for (const j of junk) {
    let crashed = null, out = null;
    try { out = standingsFrom({ ...j }); } catch (e) { crashed = String(e.message || e); }
    let bad = [];
    if (out) {
      if (!Array.isArray(out.rows)) bad.push("rows er ekki fylki");
      if (typeof out.complete !== "boolean") bad.push("complete er ekki boolean");
      if (out.why != null && typeof out.why !== "string") bad.push("why er hvorki null ne strengur");
      if (out.complete === false && !out.why) bad.push("complete:false an why");
      if (out.complete === true && out.why) bad.push("complete:true MED why");
      for (const r of out.rows || []) {
        /* Ekkert heiti ma bera "undefined"/"null"/"NaN" — thad er thad sem
           notandinn les a skja. */
        if (typeof r.name !== "string" || !r.name.trim()) bad.push("tomt heiti");
        if (/\bundefined\b|\bNaN\b|\bnull\b/i.test(r.name)) bad.push(`heiti: ${r.name}`);
        for (const k of ["wins", "losses", "ties", "pointsFor", "pointsAgainst"]) {
          if (r[k] !== null && !Number.isFinite(r[k])) bad.push(`${k} = ${r[k]}`);
        }
        if (r.rank !== null && !Number.isInteger(r.rank)) bad.push(`rank = ${r.rank}`);
        if (r.rosterId !== null && !Number.isInteger(r.rosterId)) bad.push(`rosterId = ${r.rosterId}`);
        if (![true, false, null].includes(r.inPlayoffs)) bad.push(`inPlayoffs = ${r.inPlayoffs}`);
        if ("isMe" in r && typeof r.isMe !== "boolean") bad.push(`isMe = ${r.isMe}`);
      }
    }
    ok(!crashed && out && !bad.length,
      `${JSON.stringify(j).slice(0, 58)} -> gild utkoma` +
      `${crashed ? ` — HRUN: ${crashed}` : ""}${bad.length ? ` — ${[...new Set(bad)].join("; ")}` : ""}`);
  }

  /* Rostur an eiganda ma ekki bera "undefined" a skja — en heitid ma
     ekki heldur vera tomt. */
  const orphan = standingsFrom({
    rosters: [{ roster_id: 7, owner_id: null, settings: { wins: 1, losses: 0, ties: 0, fpts: 100, fpts_decimal: 0 } }],
    users: PRE_USERS, league: PRE_LEAGUE });
  ok(orphan.rows[0].name === "Team 7",
    `rostur an eiganda faer fast heiti (${orphan.rows[0].name})`);
  ok(orphan.rows[0].userId === null, "og userId er null");

  /* ---------- OG GILT SVAR FER OBREYTT I GEGN ----------
     Annars vaeri "vordurinn" ad henda raunverulegri stodu notandans. */
  const good = standingsFrom({ rosters: DONE_ROSTERS, users: DONE_USERS, league: DONE_LEAGUE, userId: ME });
  ok(good.rows.length === 10 && good.complete === true && good.playoffTeams === 6 &&
     good.rows[0].rosterId === 5 && good.rows[0].rank === 1 &&
     good.rows.find((r) => r.rosterId === 1).pointsFor === 1815.34,
    "gilt svar fer obreytt i gegn: 10 radir, 1815,34 a rostri 1, saeti 1 er rostur 5");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
