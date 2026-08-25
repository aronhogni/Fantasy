/* ============================================================
   LIDA-TOLUR — HREINT, EKKERT REACT (sama regla og model.js/stats.js:
   profin keyra NAKVAEMLEGA sama kodann og vidmotid birtir).

   SPURNINGIN SEM THETTA SVARAR er onnur en leikmannalistinn svarar:
   ekki "hver er godur?" heldur "HVERNIG ER LIDID SJALFT AD SPILA?" —
   og saerstaklega VID HVERJU MARKVORDUR MA BUAST. Markvordur faer stig
   fyrir vorslur og hreint blad, svo thad sem skiptir mali er ekki bara
   HVE MORG skot hann faer heldur HVADAN.

   THRJAR HEIMILDIR, HVER MED SITT SVID — ENGIN THEIRRA ER ENDURREIKNUD:

   | heimild            | hvad                          | thekja      |
   |--------------------|-------------------------------|-------------|
   | team_form.json     | skot, skot a mark, mork,      | E0, HEILT   |
   |  (fdcouk_e0)       | horn, spjold, hreint blad     | 380 leikir  |
   | bsd_teams.json     | xG og xGC (per-skot xG)       | BSD, 380    |
   |  (bzzoiro)         |                               | 2025/26 EITT|
   | luck.json          | RAUNMORK (goals/conceded)     | E0+FPL      |
   | team_shots.json    | SVAEDI skotanna (teigur,      | ESPN, 380   |
   |  (espn_commentary) | naerfaeri, langskot)          | leikir      |

   TVENNT SEM MA ALDREI FELA:

   1. xG/xGC KOMA UR BSD OG NA YFIR EITT TIMABIL (2025/26).
      ThAU KOMU ADUR UR FPL-SUMMU og su tala var ekki bara "~19% of lag"
      heldur BYGGINGARLEGA BILUD: lids-xGC var tekid ur
      `expected_goals_conceded` EINS markvardar, svo lid sem skipti um
      markvord fekk storlega ranga tolu. Leeds maeldist med 0,70 xGC a
      leik medan raunveruleg mork a sig voru 1,47 — og fekk thvi graena
      "besta vornin"-merkingu sem var hreinn tilbuningur.
      Maelt 8.8.2026 gegn raunmorkum, 17 lid: r 0,369 -> 0,818 (vorn) og
      0,667 -> 0,749 (sokn), MAE ~45% laegra. Sja buildTeamRows.
      Dalkarnir eru `season_locked` og TOMIR i odrum timabilum — engin
      FPL-varaleid, thvi lakari tala undir betri merkimida er verri en
      tomur dalkur.

   2. BIG CHANCES ERU I ThESSARI TOFLU — OG ThESSI LIDUR SAGDI ANNAD
      ThANGAD TIL 21.8.2026. Her stod "BIG CHANCES ERU EKKI I THESSARI
      TOFLU — ENN", og thad var rett thegar ESPN var eina skot-heimildin.
      `bc_against_pg` og `bc_pg` hafa verid i `TEAM_STAT_DEFS` fra
      8.8.2026 (BSD, per-skot xG, throskuldur 0,18 FITTADUR gegn lids-
      svidinu `big_chances`: MAE 0,746, r 0,774 a 748 lid-leikjum), svo
      hausinn a skranni fullyrti thad gagnstaeda vid skrana sjalfa. Fost
      fullyrding um lifandi dalkaskra ureldist thogult — sama villa og
      horna-sviðin i SetPieces 13.8.2026, i skjalinu sem varar vid henni.

      SVAEDIN eru ANNAD MAL og thar stendur reglan obreytt: `box_*` og
      `close_*` koma ur ESPN, sem gefur STADSETNINGU hvers skots en ENGA
      xG-tolu fyrir thad. Naerfaeri (`close_against_pg`) er thvi SKYLD
      tala en ekki sama talan sem "big chance", og hun heitir sinu retta
      nafni. Nu eru BADAR a skjanum og thad er retta astandid: `close_*`
      er ESPN-talning a hnitum, `bc_*` er BSD-talning a xG.

      KROSSPROFAD 21.8.2026: ESPN-teigsskot gegn BSD-teigsskotum
      (`x <= IN_BOX_X`) gefa r 0,968 (a sig) og 0,972 (fyrir) a 15 lidum
      — tvaer oskyldar heimildir um sama hlut. ESPN telur kerfisbundid
      LAEGRA (hlutfall 0,79-0,89) thvi 6-13% skota bera engan svaedis-
      texta og eru ADEINS i heildartolunni; skekkjan er thvi i STIGI og
      ekki i RODUN. Vordur: `team-stats.mjs` kafli 3.

   LAEGRA-ER-BETRA ER EKKI SKRAUT (`hi:false`): fyrir markvard er HAERRI
   skotafjoldi a sig verri, og tafla sem litar haestu toluna graena vaeri
   RONG MYND. Sama regla og i Compare.jsx (CLAUDE.md 6j).
   ============================================================ */

import { BIG_CHANCE_XG } from "./bsd.js";

const num = v => (typeof v === "number" && Number.isFinite(v) ? v : null);
const div = (a, b) => (num(a) != null && num(b) ? +(a / b).toFixed(3) : null);

/* MISMUNA-DALKARNIR ERU REIKNADIR A EINUM STAD — arstidar-leidin og
   umferdar-leidin kalla BADAR thetta fall. Fyrsta utgafa umferdar-bilsins
   reiknadi thau upp a nytt inni i Teams.jsx sem `goals_pg - xg_pg`, thad er
   PER LEIK, medan dalkurinn ber `dec: 1` og notu sem segir "over the
   season" — sama tala undir sama merkimida i tveimur EININGUM. Her er
   summan yfir thad bil sem er synt, hvort thad er heilt timabil eda hluti,
   og eining og aukastafir eru thvi thau somu i badum tilfellum.          */
function diffFields(goals, conceded, xgTot, xgcTot) {
  return {
    goals_minus_xg:     (num(goals) != null && num(xgTot) != null)
                          ? +(goals - xgTot).toFixed(1) : null,
    conceded_minus_xgc: (num(conceded) != null && num(xgcTot) != null)
                          ? +(conceded - xgcTot).toFixed(1) : null,
  };
}

/* ============================================================
   `season_locked` VAR DAUTT FLAGG — WIRED 21.8.2026

   Sjo dalkar baru `season_locked: true` og **ENGINN LESANDI VAR I `src/`**
   (0 tilvik; adeins ein fullyrding i `team-stats.mjs` sem sannreyndi ad
   flaggid VAERI a theim). Flagg sem enginn les er ekki varud heldur
   MERKIMIDI SEM SEGIR ADEINS SJALFUM SER — og dagurinn sem thad verdur
   thogul LYGI er dagsettur: `bsd_teams.json` er birt ANN THESS ad nokkud
   spyrji hvada timabil hun ber, svo um leid og taflan synir 2026/27 og
   BSD-skrain er enn 2025/26 stendur xG ur EINU timabili undir morkum ur
   ODRU, i heilu-timabils-utsyninu, AN MERKIS. Thad er nakvaemlega thad sem
   `routeInStep` var byggt til ad koma i veg fyrir — en hann var ADEINS a
   bils-leidinni, svo arstidar-utsynid var opid.

   "ROng tala er verri en tom tala" (kafli 8i), svo skilyrdid er ThAD SAMA
   her og annars stadar i skranni: HEIMILDIN VERDUR AD VERA I TAKT VID
   TOFLUNA. Her er thad haegt ad LESA i stad thess ad maela — BADAR skrar
   bera `season` berum ordum (`team_form.json` "2025-26",
   `bsd_teams.json` "2025/26") — svo engin agiskun er a leidinni; adeins
   snidid er olikt og thad er normalisad.

   HVAR FLAGGID ER LESID — I `Teams.jsx`, OG ThAD ER SYNILEG HEGDUN:
   `TEAM_STAT_DEFS.filter(d => d.season_locked)` velur (a) hvort varnadar-
   malsgreinin ofan vid tofluna birtist og (b) hvada dalkar bera setninguna
   "Empty in this view on purpose ..." i tooltip-inu sinu. Handskrifadur
   lyklalisti a hvorugum stad — hann stadnar (sbr. `gwBlindKeys`,
   CLAUDE.md 8) og er auk thess onnur utfaersla af somu akvordun.

   OG HER ER SAMNINGURINN, EKKI ONNUR UTFAERSLA. `bsdOk`-gattin er EINA
   agerdin i thessari skra; sveipur ofan a henni vaeri tvitekning og
   PROFID SANNADI ThAD (stokkbreyting sem tok flaggid af `bc_pg` fell ekki,
   thvi gattin taemdi hann hvort sem er). `team-stats.mjs` kafli 13d
   fullyrdir thess i stad ad mengid sem taemist se NAKVAEMLEGA thad sem ber
   flaggid — i BADAR attir, svo baedi BSD-dalkur an flaggs og flagg a
   E0-dalki fella profid.

   ATH: `applyTeamRange` fyllir thessa dalka AFTUR ur `bsd_shots.json`
   thegar skotakortid er I TAKT (`use.shots`), og thad er RETT — thar var
   taktinn MAELDUR, ekki lesinn. Blankunin bitur thvi adeins thegar HVORUG
   BSD-leidin er i takt, sem er einmitt tilfellid thar sem engin rett tala
   er til.
   ============================================================ */
export function seasonKey(s) {
  const m = String(s ?? "").match(/\d/g);
  return m && m.length >= 6 ? m.join("") : null;
}
/* `ok: true` thegar BADAR skrarnar bera timabil OG thau eru thad sama.
   VANTI ANNADHVORT ER SVARID `true` — og thad er asett: gomul skra an
   `season`-svids ma ekki verda blonk af thvi ad hun THEGIR. Vardurinn hér
   er gegn ThEKKTUM misvisi, ekki gegn thogn (sama regla og null-reglan i
   rotation.js: `P=null` utilokar ALDREI).                              */
export function bsdSeasonInStep(teamForm, bsdTeams) {
  const table = seasonKey(teamForm?.season), bsd = seasonKey(bsdTeams?.season);
  /* HEITIN ERU BORIN MED — vidmotid a ad geta NEFNT bædi timabilin thegar
     thau stangast a. "Gognin eru ur odru timabili" an thess ad segja HVORU
     er halfur varnadur, og notandinn getur ekki athugad hann.            */
  return { ok: !(table && bsd && table !== bsd), table, bsd,
           tableLabel: teamForm?.season ? String(teamForm.season) : null,
           bsdLabel: bsdTeams?.season ? String(bsdTeams.season) : null };
}

/* ============================================================
   YFIRSTANDANDI TIMABIL UR LEIKJASKRANNI (22.8.2026, ad beidni notandans)

   "Eg vill ad Teams stats bjodi upp a nyjasta season, ad eg geti valid thad
   og tha bara skodad GW1 nuna."

   Toflan las adeins `team_form.json`, sem er **fyrra timabil**: hun kemur ur
   football-data E0 og su skra verdur ekki til fyrir 2026/27 fyrr en tímabilid
   er komid af stad (CLAUDE.md kafli 6 — `fdcouk_e0` svarar 300/404 thangad
   til). Yfirstandandi timabil atti thvi ENGA leid inn i flipann.

   HEIMILDIN SEM ER TIL ER `fixtures.json` SJALF: hun ber urslitin
   (`team_h_score`/`team_a_score`) um leid og leikur er buinn, og appid les
   hana thegar. Engin ny sokn, engin ny gagnaskra, enginn nyr lykill.

   OG HUN BER EKKI ALLT — ThAD ER ADALATRIDID. Ur urslitum einum er haegt ad
   reikna leiki, mork, mork a sig og hrein blod. **Skot, skot a mark, horn,
   brot og spjold eru EKKI i `fixtures.json`**, svo their reitir eru
   ekki settir — og verda thar med `null` (= "—" a skjanum) i stad 0.
   Sama regla og annars stadar: tala sem er ekki til ma ekki verda ad nulli
   (kafli 8).

   xG/xGC KOMA EKKI HEDAN OG ThAU ERU EKKI LENGUR TOM (leidrett 22.8.2026).
   Her stod: "xG/xGC koma ur BSD sem naer adeins yfir 2025/26, svo their
   dalkar eru tomir lika og `season_locked`-velin ser um ad segja hvers
   vegna." Su setning var rett um `bsd_shots.json` (frosid kort) og ROng um
   BSD i heild: `bsd_live.json` er yfirstandandi timabil og ber nu
   `team_matches` — eina rod per leikinn leik med badar hlidar — svo bædi xG
   OG xGC eru til. `Teams.jsx` sendir thaer inn sem `liveMatches` og
   `aggLiveMatchRange` gerir ur theim somu Map og skotakortid skilar.
   `lockedBlank` er LEIDD af rodunum sjalfum, svo varnadar-textinn slokknar
   af sjalfu ser um leid og dalkarnir fyllast — hann var aldrei upptalning.

   LEIKUR TELST SPILADUR VID `finished_provisional`, EKKI `finished`. Maelt
   22.8.2026: allir SEX leiknu GW1-leikirnir bera `finished: false` med
   `finished_provisional: true, minutes: 90` og fullum urslitum — `finished`
   flettist fyrst thegar umferdin er stadfest med bonus. Ad bida eftir
   `finished` hefdi synt TOMA toflu i marga daga eftir ad leikirnir voru
   bunir. Leikur sem er I GANGI er hins vegar UTILOKADUR (bædi skor verda
   ad vera til OG leikurinn ad vera merktur bunum), svo tolurnar hoppa ekki
   a medan er spilad.
   ============================================================ */
export function buildLiveTeamForm({ fixtures, teams, season = null } = {}) {
  const fx = Array.isArray(fixtures) ? fixtures : [];
  const ts = Array.isArray(teams) ? teams : [];
  if (!ts.length) return null;
  const acc = new Map(ts.map(t => [t.id, { gf: 0, ga: 0, n: 0, cs: 0 }]));
  let played = 0;
  for (const f of fx) {
    const h = num(f?.team_h_score), a = num(f?.team_a_score);
    const done = f?.finished === true || f?.finished_provisional === true;
    if (!done || h == null || a == null) continue;
    const H = acc.get(f.team_h), A = acc.get(f.team_a);
    if (!H || !A) continue;                       // lid utan deildar
    played++;
    H.n++; H.gf += h; H.ga += a; if (a === 0) H.cs++;
    A.n++; A.gf += a; A.ga += h; if (h === 0) A.cs++;
  }
  /* ENGINN LEIKUR -> ENGIN TAFLA. Skra full af nullum vaeri verri en engin:
     hun laeti eins og hvert lid hefdi spilad og skorad ekkert.          */
  if (!played) return null;
  return {
    season, source: "fpl_fixtures", matches_counted: played,
    note: "Current season, computed from finished fixtures in fixtures.json. "
        + "Results only: shots, corners, fouls and cards are not in that file "
        + "and are left empty rather than zero.",
    teams: ts.map(t => {
      const r = acc.get(t.id);
      /* LID SEM HEFUR EKKI SPILAD FAER `matches: 0` OG ENGAR HLUTFALLSTOLUR
         — sama medferd og nylidar fa i `team_form.json`.                */
      if (!r || !r.n) return { fpl_id: t.id, short: t.short, matches: 0, source: "none" };
      return {
        fpl_id: t.id, short: t.short, matches: r.n, source: "fpl_fixtures",
        goals_pg: +(r.gf / r.n).toFixed(2),
        conceded_pg: +(r.ga / r.n).toFixed(2),
        clean_sheet_pct: +(100 * r.cs / r.n).toFixed(1),
        /* SAMTOLURNAR FYLGJA MED UR SOMU LEIKJUM. `luck.json` ber thaer fyrir
           FYRRA timabil eitt, svo an thessa vaeru samtolu-dalkarnir tomir i
           yfirstandandi timabili medan per-leik systkini theirra baeru tolu —
           tveir kvardar i sömu rod, sem er nakvaemlega thad sem
           Championship-lekinn var (kafli 12).                             */
        goals: r.gf, conceded: r.ga,
      };
    }),
  };
}

/* Ein rod per lid. `t` ber somu reiti hvadan sem their koma, svo
   dalkarnir thurfa ekki ad vita hvada skra atti hvad.                  */
export function buildTeamRows({ teams = [], teamForm = null, luck = null, teamShots = null,
                                bsdTeams = null } = {}) {
  const list = Array.isArray(teams) ? teams : (teams?.teams || []);
  const formById = {}, luckById = {}, shotsById = {};
  for (const t of teamForm?.teams || []) if (t.fpl_id != null) formById[t.fpl_id] = t;
  for (const t of luck?.teams || []) if (t.fpl_id != null) luckById[t.fpl_id] = t;
  for (const t of teamShots?.teams || []) if (t.fpl_id != null) shotsById[t.fpl_id] = t;
  const bsdById = {};
  /* BSD ER SLEPPT ALVEG thegar timabilid stemmir ekki — sja
     `bsdSeasonInStep`. Ad lesa hana og blanka a eftir vaeri sama utkoma
     med tveimur stodum til ad reka i sundur.                            */
  const bsdOk = bsdSeasonInStep(teamForm, bsdTeams).ok;
  if (bsdOk) for (const t of bsdTeams?.teams || []) if (t.fpl_id != null) bsdById[t.fpl_id] = t;

  return list.map(t => {
    const f = formById[t.id] || {}, l = luckById[t.id] || {}, s = shotsById[t.id] || {};
    const b = bsdById[t.id] || {};
    const m = num(l.matches) || num(f.matches) || null;
    /* PL-LEIKIR SER. `m` tekur `luck.json` fyrst og hun ber
       CHAMPIONSHIP-leiki nylidanna (46), svo hun getur ekki verid gatid a
       thvi hvort lidid a PL-sogu. `team_form` ber 0 fyrir tha.          */
    const plMatches = num(f.matches) || null;
    /* ---------- xG/xGC KOMA NU UR BSD, EKKI UR FPL-SUMMUNNI ----------
       MAELT 8.8.2026 a theim 17 lidum sem attu PL-rod 2025/26, gegn
       RAUNVERULEGUM morkum sama timabils:

         | heimild | r vid raunmork | MAE  |
         | FPL xGC | 0,369          | 0,212|
         | BSD xGC | 0,818          | 0,116|
         | FPL xG  | 0,667          | 0,246|
         | BSD xG  | 0,749          | 0,148|

       Orsok gomlu skekkjunnar var BYGGINGARLEG, ekki tilviljun: lids-xGC
       var tekid ur `expected_goals_conceded` EINS markvardar (haesta
       minututalan), svo lid sem skipti um markvord — eda thar sem hann
       for ur deildinni og hvarf ur bootstrap — fekk storlega ranga tolu.
       Leeds: raunveruleg mork a sig 1,47/leik, FPL xGC 0,70, BSD 1,48.

       ENGIN FPL-VARALEID. Maelt: BSD naer YFIR NAKVAEMLEGA somu 17 lid og
       FPL-summan; hin thrju (COV/HUL/IPS) attu enga PL-rod og hafa hvorugt.
       Enginn tapar tolu. Vaeri varaleidin holl eftir myndi lakari talan
       lauma ser inn undir merkimida betri heimildar — og ONAKVAEM TALA
       UNDIR RONGU NAFNI er verri en tomur dalkur (kafli 8i).
       BSD naer adeins yfir 2025/26, svo dalkarnir eru `season_locked`. */
    const bsdXg = num(b.xg_pg), bsdXgc = num(b.xgc_pg);
    const xgTot  = bsdXg  != null && m ? +(bsdXg  * m).toFixed(1) : null;
    const xgcTot = bsdXgc != null && m ? +(bsdXgc * m).toFixed(1) : null;
    const row = {
      id: t.id, short: t.short, name: t.name, team: t,
      matches: m,
      /* LEIKIR SEM TALAN HVILIR A. Hann er `matches` a heilu timabili og
         leikirnir I BILINU thegar bil er valid — ein reit sem vidmotid
         getur birt an thess ad vita hvor leidin var notud.               */
      /* `m || null` OG ThAD ER EKKI SNYRTING: nylidarnir thrir (COV/HUL/IPS)
         attu enga PL-rod, svo `m` er 0 — og 0 her er TILBUIN MAELING
         ("spiladi enga leiki") thar sem sannleikurinn er "var ekki i
         deildinni". Vordurinn i `team-stats.mjs` kafla 4 fell a thvi:
         nylidi verdur ad fa `null` i HVERJUM dalki. Bils-leidin gerdi
         thetta thegar (`out.played = n || null`); grunn-rodin ekki.     */
      played: plMatches,
      /* --- vorn --- */
      shots_against_pg:  num(f.shots_against_pg),
      sot_against_pg:    num(f.sot_against_pg),
      box_against_pg:    num(s.in_box_against_pg),
      close_against_pg:  num(s.close_against_pg),
      long_against_pg:   num(s.outside_against_pg),
      long_share:        num(s.outside_share_against),
      conceded_pg:       num(f.conceded_pg),
      xgc:               xgcTot,
      xgc_pg:            bsdXgc,
      cs_pct:            num(f.clean_sheet_pct),
      /* `xgc_per_shot` VAR HER OG ER FARID (21.8.2026) — TVAER HEIMILDIR
         I EINU BROTI. Teljarinn var BSD-xGC (per-skot xG ur skotakortinu)
         og nefnarinn E0-skot-a-sig, tvaer oskyldar heimildir sem telja
         SITTHVORN skotafjolda: BSD 8,263 skot a sig hja ARS a moti E0
         8,16 (1,3%). Thad er nakvaemlega reglan sem `xg_share` braut i
         leikmannalistanum 17.8.2026 og gaf Ogbene 148% (CLAUDE.md 12:
         "teljari og nefnari verda ad koma ur SOMU heimild og sama
         timabili").
         OG HUN VAR ThEGAR DAUD I ThRIGGJA ATTIR: (a) enginn dalkur i
         `TEAM_STAT_DEFS` les hana, (b) `applyTeamRange` setti hana i
         `null` um leid og skotakortid er i takt — sem thad er i dag — svo
         talan sem var reiknud kom ALDREI ut ur fallinu i appinu, og (c)
         RETTA talan er ThEGAR til undir sinu retta nafni:
         `xg_per_shot_against` (BSD BADUM megin, birtur dalkur). Reiknud
         tala sem enginn les er ekki meinlaus — hun bidur thess ad einhver
         gefi henni dalk, og tha er villan komin a skjainn utan mælingar. */
      sot_share_against: div(f.sot_against_pg, f.shots_against_pg),
      /* --- sokn --- */
      goals_pg:          num(f.goals_pg),
      shots_pg:          num(f.shots_pg),
      sot_pg:            num(f.sot_pg),
      box_pg:            num(s.in_box_pg),
      close_pg:          num(s.close_pg),
      long_pg:           num(s.outside_pg),
      xg:                xgTot,
      xg_pg:             bsdXg,
      conversion:        num(f.conversion),
      /* --- annad --- */
      corners_pg:        num(f.corners_pg),
      fouls_pg:          num(f.fouls_pg),
      yellows_pg:        num(f.yellows_pg),
      /* RAUNMORKIN SJALF — geymd a rodinni svo mismuna-dalkarnir og
         umferdar-leidin lesi SOMU tolu. Adur voru thau lesin beint ur
         `luck.json` inni i reikningnum og voru thvi ekki til fyrir utan
         hann; tha gat umferdar-leidin ekki notad sama fall.              */
      /* ============================================================
         DEILDAR-SAMTOLURNAR ERU SKORDADAR VID PL-SOGU (22.8.2026)

         `luck.json` ber `goals`/`conceded`/`matches` fyrir NYLIDANA LIKA —
         en thad eru CHAMPIONSHIP-tolur: COV 97 mork a 46 leikjum, HUL 70,
         IPS 80. `team_form.json` gerir thad EKKI (`matches: 0,
         source: "none"`), sem er astaedan fyrir thvi ad `goals_pg` er null
         hja theim. Rodin tok thvi SAMTOLUNA ur einni heimild og PER-LEIK
         toluna ur annarri, og thaer eru ur SITTHVORRI DEILDINNI.

         Thetta sast ekki medan enginn dalkur birti samtolurnar — thaer voru
         reiknadar og obirtar. Um leid og dalkurinn kom hefdi Coventry setid
         med **97 mork**, efst i deildinni, og talan hefdi verid rett tala um
         ranga deild. Nakvaemlega aettin ur kafla 12: teljari og nefnari
         verda ad koma ur SOMU heimild og sama timabili (`xg_share` 148%).

         Skilyrdid er ThAD SAMA og thegar nullar `goals_pg`: PL-leikir ur
         `team_form`. Nylidi faer `null` i ollum thremur, eins og i ollum
         hinum dalkunum.                                                  */
      /* FORMID FYRST, LUCK SVO. `buildLiveTeamForm` ber samtolurnar ur SOMU
         leikjum og per-leik tolurnar; `luck.json` a vid FYRRA timabil. Se
         hvorugt til er svarid `null`, aldrei 0.                          */
      goals:             num(f.goals)    ?? (plMatches ? num(l.goals) : null),
      conceded:          num(f.conceded) ?? (plMatches ? num(l.conceded) : null),
      /* ENDURREIKNAD UR BSD, EKKI LESID UR luck.json. Hefdu thessir tveir
         haldid FPL-afleidslunni vaeru their MISMUNUR TVEGGJA OLIKRA
         HEIMILDA — birt xG ur BSD en "G-xG" reiknad ur FPL-xG — og dalkarnir
         hefdu stangast a innbyrdis an thess ad nokkud syndi thad.
         Mork/mork a sig eru raunverulegar (E0-heil) og haldast.          */
      ...diffFields(l.goals, l.conceded, xgTot, xgcTot),
      /* --- BSD-skotakortid: EINA heimildin med xG PER SKOT --- */
      bc_against_pg:  num(b.bc_against_pg),
      bc_pg:          num(b.bc_pg),
      xg_per_shot_against: num(b.xg_per_shot_against),
      bsd_matches:    num(b.matches),
    };
    /* EIN AGERD, EKKI TVAER. Fyrsta utgafa thessa (21.8.2026) hafdi LIKA
       sveip her — `if (!bsdOk) for (... d.season_locked) row[d.key] = null`
       — ofan a `bsdOk`-gattinni her fyrir ofan. Hann var HREIN TVITEKNING:
       gattin taemir thegar somu sjo dalka, svo sveipurinn gerdi ekkert.
       OG PROFID SANNADI ThAD: stokkbreyting sem TOK FLAGGID af `bc_pg`
       skildi hann samt eftir toman, thvi gattin sa um thad. Kodi sem litur
       ut eins og hann beri akvordunina en gerir thad ekki er verri en
       enginn kodi — thad er nakvaemlega `buildTeamMetrics`-afritid (kafli
       7) i minni umbud, og hann hefdi latid naesta lesanda halda ad
       flaggid stjornadi hegdun i thessari skra.
       FLAGGID ER LESID I `Teams.jsx` (varnadar-malsgreinin og setningin i
       tooltip-inu hvers dalks) og ThAR ER hegdunin sem thad styrir;
       vardurinn a thvi er i `team-gw.mjs`. Her er samningurinn hins vegar
       PROFADUR: mengið sem taemist VERDUR ad vera nakvaemlega thad sem ber
       flaggid, i badar attir (`team-stats.mjs` kafli 13d).               */
    return row;
  });
}

export const TEAM_GROUPS = [
  { key: "keeper", label: "What the keeper faces" },
  { key: "defence", label: "Defence" },
  { key: "attack", label: "Attack" },
  { key: "other", label: "Discipline and set pieces" },
];

/* `hi` = haerra er betra. Fyrir ALLT sem lidid faer A SIG er thad FALSE. */
export const TEAM_STAT_DEFS = [
  /* ---- markvorslu-sjonarhornid ---- */
  { key: "shots_against_pg", label: "Shots faced per match", short: "Shots", group: "keeper",
    dec: 2, hi: false, src: "E0",
    note: "Shots faced per match (E0, full season). Volume — not quality. A keeper who faces many shots gets more saves but also more goals.",
    get: r => r.shots_against_pg },
  { key: "sot_against_pg", label: "On target faced per match", short: "SoT", group: "keeper",
    dec: 2, hi: false, src: "E0",
    note: "Shots on target faced per match. This is the number that turns into saves — an off-target shot is worth nothing to a keeper.",
    get: r => r.sot_against_pg },
  { key: "box_against_pg", label: "In-box shots faced per match", short: "In box", group: "keeper",
    dec: 2, hi: false, src: "ESPN",
    note: "Shots faced from inside the penalty area (ESPN zone text, full season).",
    get: r => r.box_against_pg },
  { key: "close_against_pg", label: "Close-range faced per match", short: "Close", group: "keeper",
    dec: 2, hi: false, src: "ESPN",
    note: "Shots faced from very close range (the six-yard area). This is the closest the available data gets to \"big chances faced\" — big chances need per-shot xG, which no reachable source provides, so this is a measured stand-in and not the same number.",
    get: r => r.close_against_pg },
  { key: "long_against_pg", label: "Long shots faced per match", short: "Long", group: "keeper",
    dec: 2, hi: true, src: "ESPN",
    note: "Shots faced from outside the box. HIGHER IS BETTER here: long shots are the cheapest shots to concede — they rarely go in and they still count as saves.",
    get: r => r.long_against_pg },
  { key: "long_share", label: "Share faced from distance", short: "Long %", group: "keeper",
    dec: 3, hi: true, pct: true, src: "ESPN",
    note: "Of every shot the team faces, the fraction taken from outside the box. A high share means the defence keeps opponents out — the same shot count is far less dangerous.",
    get: r => r.long_share },
  /* HEITID SEGIR "per match" — TILKYNNT AF NOTANDA 14.8.2026.
     Notandinn las "Big chances faced: 2" sem TIMABILS-TOLU og sagdi rettilega
     ad thad gaeti ekki stadist fyrir markmann i 38 leikjum. Talan var rett
     (deildin liggur 1,05-3,05 per leik, medaltal 2,07 — ARS best a 1,05) en
     HEITID sagdi thad ekki: notan ein bar "per match".
     FIMM dalkar brutu venjuna sem hinir atta fylgja ("Shots faced per match",
     "Goals conceded per match", "xGC per match" ...): box_against_pg,
     close_against_pg, long_against_pg, bc_against_pg og bc_pg. Tala an einingar
     er agiskun notandans um eininguna, og hann agiskadi — eðlilega — a ranga.
     `short` var lika tvitekid: "BigC" var BAEDI a soknar- og markvardar-
     dalknum, svo their voru ogreinanlegir i throngri toflu.               */
  /* BIG CHANCES A SIG — ThAD SEM SPURT VAR UM. Talid ur BSD-skotakorti:
     hvert skot ber sina eigin xG og skot yfir 0,18 telst big chance
     (throskuldurinn var FITTADUR gegn lids-svidinu `big_chances` sem BSD
     birtir sjalft: MAE 0,746, r 0,774 a 748 lid-leikjum).
     EITT TIMABIL: BSD hefur skotakort i 2025/26 og engin eldri, svo
     dalkurinn er TOMUR i odrum timabilum — og thad er rett, "engin gogn"
     er ekki "engin big chance".                                        */
  { key: "bc_against_pg", label: "Big chances faced per match", short: "BigC/m", group: "keeper",
    dec: 2, hi: false, src: "BSD", season_locked: true,
    note: "Big chances faced per match — shots against with an expected-goals value of 0.18 or more, counted from the BSD shot map. This is the number a goalkeeper actually has to survive: two teams can concede the same shot count and face completely different danger. Only 2025/26 has a shot map, so this is empty for other seasons.",
    get: r => r.bc_against_pg },
  { key: "xg_per_shot_against", label: "xG per shot faced", short: "xG/shot", group: "keeper",
    dec: 3, hi: false, src: "BSD", season_locked: true,
    note: "The average expected-goals value of a shot faced. Quality rather than volume — a low number means the defence gives up hopeful efforts, a high one means it gives up chances. Only 2025/26 has a shot map.",
    get: r => r.xg_per_shot_against },
  { key: "sot_share_against", label: "On target share faced", short: "SoT %", group: "keeper",
    dec: 3, hi: false, pct: true, src: "E0",
    note: "Of the shots faced, the fraction on target.",
    get: r => r.sot_share_against },

  /* ---- vornin i heild ---- */
  /* MORK, MORK A SIG OG HREIN BLOD FYLGJA UMFERDAR-BILI (20.8.2026) og
     notan ma thvi ekki segja "full season" — hun gerdi thad og var thar med
     ord a skjanum sem stangast a vid toluna undir henni um leid og bil er
     valid. Heimildin er E0 a heilu timabili og LOKNIR LEIKIR (skotakortid
     eda `fixtures.json`) i bili; thaer eru MAELDAR JAFNAR (17/17 lid, oll
     thrju svidin, sja kaflann um umferdar-bilid).                        */
  /* TVEIR DALKAR HLID VID HLID, TVAER OLIKAR SPURNINGAR — OG NOTANDINN
     LAS ThA SEM SOMU (tilkynnt 21.8.2026: "Arsenal xGC 0,94 fyrir GW26-38
     er rangt"). Talan var RETT: 121 skot a Arsenal i theim 13 umferdum,
     summa xG 12,18, thad er 0,937 per umferd, endurreiknad ur
     `bsd_shots.json` a ohadri leid. Raunveruleg mork a sig i sama bili
     voru 10 (0,77) og 27 yfir timabilid (0,71).
     ThAD SEM VAR RANGT VAR ThVI EKKI TALAN HELDUR ThAD AD ENGIN SETNING A
     SKJANUM SAGDI AD xGC SE EKKI MORK A SIG. Notan nefndi heimildina og
     fylgnina (r 0,82) en aldrei skilgreininguna, og "xGC per match" vid
     hlidina a "Goals conceded per match" les eins og tvaer maelingar a
     SAMA hlut sem stangast a — thegar thaer eru tvaer maelingar a SITTHVORUM
     hlut og eiga ad vera olikar.
     ThESS VEGNA SEGJA BADAR NOTUR NU HVOR ER HVOR og benda a
     `GC−xGC`-dalkinn, sem er einmitt talan sem svarar spurningunni sem
     notandinn var i raun ad spyrja. TOLURNAR STANDA OBREYTTAR.
     ENGIN TALA UR RAUNGOGNUM I NOTUNNI: dæmi ur lifandi skra ureldist
     thogult (sbr. horna-sviðin 13.8.2026). Reglan er sogd, ekki daemid. */
  { key: "conceded_pg", label: "Goals conceded per match", short: "GC", group: "defence",
    dec: 2, hi: false, src: "E0",
    note: "Goals that actually went in, per match — real results, not a model. This is the column to read as \"how many did they let in\". The neighbouring xGC column is a different quantity and the two are meant to differ: a team can concede fewer goals than the chances it faced were worth, or more. Follows the gameweek range.",
    get: r => r.conceded_pg },
  { key: "xgc_pg", label: "xGC (expected) per match", short: "xGC", group: "defence",
    dec: 2, hi: false, src: "BSD", season_locked: true,
    note: "THIS IS NOT GOALS CONCEDED. It is how much danger the defence gave up: every shot the team faced carries its own per-shot expected-goals value and this is their sum per match. Read it against the GC column beside it — when xGC is the higher of the two the team conceded fewer than the chances it faced warranted (good goalkeeping, or luck), and the GC-xGC column is that gap stated directly. Measured against real goals conceded it tracks at r 0.82 (the old FPL-summed version managed 0.37, because it took the whole team's xGC from a single goalkeeper's record). BSD covers 2025/26 only, so this is empty for other seasons.",
    get: r => r.xgc_pg },
  { key: "conceded_minus_xgc", label: "Conceded minus xGC", short: "GC−xGC", group: "defence",
    dec: 1, hi: false, src: "BSD", season_locked: true,
    note: "Goals conceded minus xGC over the gameweeks shown. Positive = conceded more than the chances faced warranted (bad keeping, or bad luck). Goals are real; xGC is summed per shot. Needs both halves for the same gameweeks, so it follows the range only when both do.",
    get: r => r.conceded_minus_xgc },
  /* ============================================================
     SAMTOLUR YFIR VALDA UMFERDIR (22.8.2026, ad beidni notandans)

     "Eg vill geta sed samtals xGC fyrir allar valdar gameweeks. A ad vera
     1-2 i hverri umferd. 20 xGC yfir 20 umferdir." Toflan bar ADEINS
     per-leik tolur, svo GW26-38 las "xGC 0,94" thar sem spurningin var
     "hve mikid alls".

     ENGIN NY STAERD OG ENGIN NY MAELING: `xg`/`xgc`/`goals`/`conceded` eru
     ThEGAR reiknud a hverri rod og `applyTeamRange` leggur thau saman UR
     SAMA BILI og per-leik tolurnar (`s.xgF`/`s.xgA` beint ur
     `bsd_shots.json`, `res.gf`/`res.ga` ur urslitunum). Thau attu einfaldlega
     engan dalk. Sama aett og `played`/`bsd_matches` — reiknad og obirt.

     OG NEFNARINN FYLGIR MED, ThAD ER EKKI SKRAUT: samtala er hadur thvi
     HVE MARGIR leikir lenda i bilinu, svo lid med auda umferd faer LAEGRI
     samtolu an thess ad vera betra. An leikjafjoldans vaeri dalkurinn
     villandi a nakvaemlega thann hatt sem hann a ad leysa — og hann er
     lika prófid sem notandinn lysti sjalfur ("1-2 i hverri umferd"):
     samtala deilt med leikjum verdur ad gefa per-leik dalkinn vid hlidina.
     `played` og `bsd_matches` eru ADSKILDIR thvi heimildirnar tvaer telja
     sitt hvorn leikjafjoldann — E0-urslit og BSD-skotakort — og samtala
     undir rongum nefnara er verri en enginn nefnari.
     ============================================================ */
  { key: "conceded", label: "Goals conceded (total)", short: "GC tot", group: "defence",
    dec: 0, hi: false, src: "E0",
    note: "Goals conceded ADDED UP over the gameweeks shown, not per match. Read it with the \"Matches\" column beside it: total divided by matches is the GC column. A side with a blank gameweek has a smaller total without being any better, which is exactly why the match count is shown.",
    get: r => r.conceded },
  { key: "xgc", label: "xGC (total)", short: "xGC tot", group: "defence",
    dec: 1, hi: false, src: "BSD", season_locked: true,
    note: "xGC ADDED UP over the gameweeks shown — the total danger the defence gave up, summed shot by shot, not per match. Divided by the BSD match count beside it this is the xGC column. Still not goals conceded: see the xGC-per-match note. BSD covers 2025/26 only, so this is empty for other seasons.",
    get: r => r.xgc },
  { key: "played", label: "Matches in range", short: "Matches", group: "defence",
    dec: 0, hi: true, src: "E0",
    note: "How many matches the results-based numbers on this row rest on — the whole season when no gameweek range is set, otherwise the matches inside it. This is the denominator for the goals and goals-conceded totals; without it a total cannot be checked. Blanks and doubles make it differ between clubs over the same range.",
    get: r => r.played },
  { key: "cs_pct", label: "Clean sheet %", short: "CS %", group: "defence",
    dec: 0, hi: true, src: "E0", note: "Share of matches with a clean sheet. Follows the gameweek range.",
    get: r => r.cs_pct },

  /* ---- soknin ---- */
  /* SAMA PARID A SOKNAR-HLIDINNI, SAMA REGLA — sja notuna vid `conceded_pg`
     fyrir rokstudninginn. Villan var tilkynnt a xGC og hun er byggingar-
     leg, ekki bundin vid thann dalk, svo hun er lagfaerd a BADUM stodum.  */
  { key: "goals_pg", label: "Goals per match", short: "Goals", group: "attack",
    dec: 2, hi: true, src: "E0",
    note: "Goals that actually went in, per match — real results, not a model. The neighbouring xG column is a different quantity and the two are meant to differ: a side can score more than the chances it created were worth, or fewer. Follows the gameweek range.",
    get: r => r.goals_pg },
  { key: "xg_pg", label: "xG (expected) per match", short: "xG", group: "attack",
    dec: 2, hi: true, src: "BSD", season_locked: true,
    note: "THIS IS NOT GOALS SCORED. It is how much chance the attack created: every shot taken carries its own per-shot expected-goals value and this is their sum per match. Read it against the Goals column beside it — when Goals is the higher of the two the side finished above the chances it made, and the G-xG column is that gap stated directly. Measured against real goals it tracks at r 0.75 (FPL-summed: 0.67) and its level is right rather than ~19% short. BSD covers 2025/26 only, so this is empty for other seasons.",
    get: r => r.xg_pg },
  { key: "goals", label: "Goals (total)", short: "Gls tot", group: "attack",
    dec: 0, hi: true, src: "E0",
    note: "Goals ADDED UP over the gameweeks shown, not per match. Total divided by the match count is the Goals column beside it. A side with a blank gameweek has a smaller total without being any worse.",
    get: r => r.goals },
  { key: "xg", label: "xG (total)", short: "xG tot", group: "attack",
    dec: 1, hi: true, src: "BSD", season_locked: true,
    note: "xG ADDED UP over the gameweeks shown — the total chance created, summed shot by shot, not per match. Divided by the BSD match count this is the xG column. BSD covers 2025/26 only, so this is empty for other seasons.",
    get: r => r.xg },
  { key: "bsd_matches", label: "Matches with a shot map", short: "BSD mt", group: "attack",
    dec: 0, hi: true, src: "BSD", season_locked: true,
    note: "How many matches the shot-map numbers rest on — the denominator for the xG and xGC totals. It is kept apart from the results match count on purpose: the two sources count matches separately, and a total shown under the wrong denominator is worse than no denominator at all. BSD covers 2025/26 only.",
    get: r => r.bsd_matches },
  { key: "shots_pg", label: "Shots per match", short: "Shots", group: "attack",
    dec: 2, hi: true, src: "E0", note: "Shots taken per match (E0, full season).",
    get: r => r.shots_pg },
  { key: "sot_pg", label: "On target per match", short: "SoT", group: "attack",
    dec: 2, hi: true, src: "E0", note: "Shots on target per match.", get: r => r.sot_pg },
  { key: "box_pg", label: "In-box shots per match", short: "In box", group: "attack",
    dec: 2, hi: true, src: "ESPN", note: "Shots taken from inside the box (ESPN zone text).",
    get: r => r.box_pg },
  { key: "close_pg", label: "Close-range shots per match", short: "Close", group: "attack",
    dec: 2, hi: true, src: "ESPN", note: "Shots taken from very close range (six-yard area).",
    get: r => r.close_pg },
  { key: "bc_pg", label: "Big chances created per match", short: "BigC/m", group: "attack",
    dec: 2, hi: true, src: "BSD", season_locked: true,
    note: "Big chances the team creates per match — shots worth 0.18 expected goals or more, from the BSD shot map. Only 2025/26 has a shot map.",
    get: r => r.bc_pg },
  { key: "conversion", label: "Shot conversion", short: "Conv.", group: "attack",
    dec: 3, hi: true, pct: true, src: "E0", note: "Goals per shot taken.",
    get: r => r.conversion },
  { key: "goals_minus_xg", label: "Goals minus xG", short: "G−xG", group: "attack",
    dec: 1, hi: true, src: "BSD", season_locked: true,
    note: "Goals scored minus xG over the gameweeks shown. Positive = finishing above the chances created. Goals are real; xG is summed per shot. Needs both halves for the same gameweeks, so it follows the range only when both do.",
    get: r => r.goals_minus_xg },

  /* ---- annad ---- */
  { key: "corners_pg", label: "Corners per match", short: "Corners", group: "other",
    dec: 2, hi: true, src: "E0", note: "Corners won per match.", get: r => r.corners_pg },
  { key: "fouls_pg", label: "Fouls per match", short: "Fouls", group: "other",
    dec: 2, hi: false, src: "E0", note: "Fouls committed per match.", get: r => r.fouls_pg },
  { key: "yellows_pg", label: "Yellows per match", short: "YC", group: "other",
    dec: 2, hi: false, src: "E0", note: "Yellow cards per match.", get: r => r.yellows_pg },
];

export const TEAM_STAT_BY_KEY = Object.fromEntries(TEAM_STAT_DEFS.map(d => [d.key, d]));

/* Rodun: NULL RADAST ALLTAF SIDAST i BADAR attir. Tomt gildi sem flytur
   upp i "asc" fyllir toppinn og er algengasta villan i svona toflum
   (sama regla og i leikmannalistanum, CLAUDE.md 6i).                    */
export function sortTeamRows(rows, key, dir = "desc") {
  const d = TEAM_STAT_BY_KEY[key];
  const val = r => (key === "__name" ? r.short : d ? d.get(r) : null);
  return rows.slice().sort((a, b) => {
    const x = val(a), y = val(b);
    if (typeof x === "string" || typeof y === "string")
      return dir === "asc" ? String(x).localeCompare(String(y)) : String(y).localeCompare(String(x));
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return dir === "asc" ? x - y : y - x;
  });
}

/* ============================================================
   UMFERDAR-BILID — HVER TALA GETUR FYLGT ThVI, OG HVERS VEGNA (20.8.2026)

   TILKYNNT AF NOTANDA: "i teams se eg bara season stats, afhverju get eg
   ekki filterad GC nidur a gameweeks? Eda CS%. Eins i attack, stats
   breytast ekki thar thegar eg filtera gameweeks."

   HANN HAFDI RETT FYRIR SER I BADA ATT. Valarinn var thegar til (11.8.) en
   hann var tengdur `fixtures.json`, sem er YFIRSTANDANDI timabil — medan
   taflan synir ThAD SIDASTA (`team_form.season` = 2025-26). MAELT 20.8.2026:
   `fixtures.json` ber 380 leiki og **0 lokna**, svo urslita-leidin gaf
   ALDREI tolu i appinu; hun gaf "—" a mork, mork a sig og hrein blod hja
   ollum 20 lidum um leid og bil var valid. Og hinir dalkarnir — skot, skot
   a mark, teigsskot, horn, spjold, hittni — satu OBREYTTIR an thess ad
   nokkud a skjanum saegi fra. Bæði einkennin eru sama villan: bilid var
   tengt heimild sem er ekki i takt vid tofluna, og thogn thar sem hun er
   thad ekki.

   HEIMILDIN SEM SVARAR ER ThEGAR I FLIPANUM: `bsd_shots.json` ber EINA ROD
   PER SKOT med `gw`, og hun er thegar letihladin thegar Teams er opnad
   (`shotIndex` i App.jsx). ENGIN NY SOKN, ENGIN NY SKRA.

   HVAD KORTID GEFUR — MAELT GEGN E0 A ODHADRI LEID (20.8.2026, 17 lid sem
   attu PL-rod 2025/26, oll 38 umferdir):

     | tala          | ur skotakortinu | E0 (team_form) | stemmir |
     |---------------|-----------------|----------------|---------|
     | mork skorud   | 71 (ARS)        | 71             | 17/17   |
     | mork a sig    | 27 (ARS)        | 27             | 17/17   |
     | hrein blod    | 19 (ARS)        | 19             | 17/17   |
     | leikir        | 38              | 38             | 17/17   |

   NAKVAEMLEGA jofn tala i ollum thremur hja ollum 17 lidum. Thad er sama
   idiomid og BSD-stodutaflan var sannreynd med (CLAUDE.md 6t): tvaer
   oskyldar leidir ad somu tolu. Fallin lidin thrju eru `null` i `team`/`opp`
   i kortinu, svo leikir gegn theim eru MED — thess vegna 38 og ekki 32.

   OG ThAD SEM VAR MAELT OG FELLT:

   1. `player_gw_2526.json` SEM LIDS-HEIMILD — FELLT. Skrain er per leikmann
      per umferd og lidid vaeri thvi samlagning yfir hans félaga. Mork a sig
      og hrein blod stemma naestum (markmanna-summa: 16/17 nakvaemt) EN MORK
      SKORUD GERA ThAD EKKI: MCI maelist 86 a moti 77 og BOU 47 a moti 58 —
      **11 mork a ranga lidi**. Orsokin er i `fetch-player-gw.mjs`: `e.t =
      team` er SIDASTI-VINNUR, svo leikmadur sem faerdist milli felaga i
      januar faer OLL sin gogn skrad a nyja felagid. Sama skekkja er i
      spjoldunum (MCI 76 a moti 67). Tala sem er 14% of ha a einu lidi og
      19% of lag a odru er ekki minni villa en engin tala — hun er verri,
      thvi hun litur ut eins og maeling (CLAUDE.md 3). Sami annmarki felldi
      spjold og allt annad ur theirri skra.
   2. E0-SKOTIN (`shots_pg`, `sot_pg`) I UMFERDAR-BIL — FELLT. `team_form`
      er ARSTIDAR-SUMMA og hefur engar umferdir. Skotakortid ER haegt ad
      telja per umferd (BSD 557 skot hja ARS a moti E0 552,1) en thad er
      ONNUR HEIMILD med 0,3-1,3% adra tolu, svo dalkur sem laesi E0 a heilu
      timabili og BSD i bili vaeri TVEIR KVARDAR undir einu heiti. Ekkert
      hefur maelt ad BSD-skotatalning se BETRI en E0 (thad var maelingin sem
      retti xG/xGC vid 8.8.), svo heimildinni er EKKI skipt — dalkurinn ber
      MERKID i stad thess ad thegja.
   3. `fixtures.json` var EKKI fjarlaegd. Hun er retta heimildin um leid og
      taflan synir yfirstandandi timabil, og THA er skotakortid ur takti.
      Baðar leidir eru thvi til og hvor um sig er PROFUD I TAKT (sja
      `routeInStep`) — ekki gefin ser.
   ============================================================ */

/* HVADA PER-UMFERDAR HEIMILD FAEDIR HVERN DALK.
   Dalkur sem er EKKI i thessari toflu getur ekki fylgt bili og VERDUR ad
   bera merkid a skjanum. "both" thydir ad hann tharf BADAR leidir — mismunur
   sem tekur mork ur einu bili og xG ur odru er verri en enginn mismunur.  */
export const TEAM_RANGE_SRC = {
  goals_pg: "results", conceded_pg: "results", cs_pct: "results",
  xg_pg: "shots", xgc_pg: "shots", bc_pg: "shots", bc_against_pg: "shots",
  xg_per_shot_against: "shots",
  goals_minus_xg: "both", conceded_minus_xgc: "both",
  /* SAMTOLURNAR OG NEFNARARNIR (22.8.2026). Their fylgja NAKVAEMLEGA somu
     leid og per-leik systkini sin — samtalan er summan sem per-leik talan
     var deild ur, svo hvad annad vaeri tveir kvardar a somu stærd. An
     thessara faerslna taldi `teamRangeBlind` tha BLINDA (`!need -> true`)
     medan their hreyfdust i raun, og vordurinn i `team-stats.mjs` kafla
     13 fell a thvi ordrett: "og ENGINN theirra hreyfist i bili".        */
  goals: "results", conceded: "results", played: "results",
  xg: "shots", xgc: "shots", bsd_matches: "shots",
};

/* EITT SKILYRDI, LESID BAEDI AF HAUSNUM OG AF TOOLTIP-INU — sama regla og
   `rangeBlind` i gwRange.js: tvo skilyrdi um sama hlut er hvernig thau fara
   i sundur. `use` er utkoma `teamRangeUse` og ber hvor leid se i takt, svo
   dalkur sem KYNNI ad fylgja bili en hefur heimild ur odru timabili ber
   merkid lika — thad er thad sama fyrir notandann.                        */
export function teamRangeBlind(key, use) {
  const need = TEAM_RANGE_SRC[key];
  if (!need) return true;
  if (need === "both") return !use?.shots || !use?.results;
  return need === "shots" ? !use?.shots : !use?.results;
}

const inRange = (g, range) =>
  g != null && (!range || (g >= range[0] && g <= range[1]));

/* MARK-GERDIN I SKOTAKORTINU ER GILDI 0, OG ThAD ER FORSENDA SEM ER
   SKRIFUD NIDUR OG VORDUD — ekki agiskun.
   `bsd_shots.json` geymir `type` sem VISI i `legend.type`
   (["goal","save","miss","block","post"]) en `shotIndex` i App.jsx flytur
   thann lista ekki, svo hann er ekki laesilegur hedan. `ShotMap.jsx` gerir
   nakvaemlega somu forsendu (`s.t === 0`) og hefur gert fra fyrstu utgafu —
   svo hun er thegar i notkun a skjanum; thad sem vantadi var ad hun stæði
   NEINS STADAR skrifud. Vordur: `team-stats.mjs` les `legend.type` ur
   skranni sjalfri og fellur ef markid faerist ur saeti 0. Se `type`-listinn
   sendur med (`shotIndex.type`) er hann notadur og fastinn ekki spurdur.  */
export const SHOT_GOAL_TYPE = 0;
const goalTypeOf = shotIndex =>
  Array.isArray(shotIndex?.type) && shotIndex.type.includes("goal")
    ? shotIndex.type.indexOf("goal") : SHOT_GOAL_TYPE;

/* ---------- SKOTAKORTID: EIN SAMLAGNING, NOTUD BAEDI FYRIR HEILT TIMABIL
   OG FYRIR BIL. `range = null` thydir ALLAR umferdir, og thad er einmitt
   thad sem takt-profid keyrir — svo "heilt timabil" og "GW 1-38" geta EKKI
   ordid tvaer tolur (ThAD VAR ThAD SEM GERDIST: arstidar-gildid kom ur
   `bsd_teams.json` en bils-gildid var endurreiknad ur `bsd_shots.json`, og
   skrarnar eru sottar 11 dogum i sundur — ARS xG/leik 1,725 a moti 1,76). */
export function aggShotRange(shotIndex, range = null) {
  const out = new Map();
  if (!shotIndex?.byTeam || !shotIndex?.byOpp || !Array.isArray(shotIndex.teams))
    return out;
  const F = shotIndex.fields || {};
  if (F.gw == null || F.xg == null) return out;
  const GOAL = F.type == null ? -1 : goalTypeOf(shotIndex);
  shotIndex.teams.forEach((short, ti) => {
    const forr = (shotIndex.byTeam.get(ti) || []).filter(s => inRange(s[F.gw], range));
    const agst = (shotIndex.byOpp.get(ti) || []).filter(s => inRange(s[F.gw], range));
    if (!forr.length && !agst.length) return;
    /* TALID I LEIKJUM, EKKI UMFERDUM — TVOFOLD UMFERD ER TVEIR LEIKIR.
       Leikur er audkenndur af (umferd, motherji): fyrir SKOT LIDSINS er
       motherjinn `opp`, fyrir SKOT A ThAD er hann `team`. Fallid lid er
       `null` i badum svidum, svo tveir leikir i somu umferd gegn tveimur
       follnum lidum runnu saman i einn — ThAD GETUR EKKI GERST i einfaldri
       umferd og er skrad her fremur en thagad um.                        */
    const games = new Set();
    for (const s of forr) games.add(`${s[F.gw]}:${s[F.opp]}`);
    for (const s of agst) games.add(`${s[F.gw]}:${s[F.team]}`);
    const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
    const goalsIn = arr => (GOAL < 0 ? null : arr.filter(s => s[F.type] === GOAL).length);
    /* HREIN BLOD ERU TALIN PER LEIK, ekki ur summu — 0+2 mork a sig i
       tveimur leikjum er EITT hreint blad, ekki ekkert.                  */
    const perGame = new Map();
    for (const s of agst) {
      const k = `${s[F.gw]}:${s[F.team]}`;
      perGame.set(k, (perGame.get(k) || 0) + (s[F.type] === GOAL ? 1 : 0));
    }
    let cs = 0;
    for (const k of games) if ((perGame.get(k) || 0) === 0) cs++;
    out.set(short, {
      n: games.size,
      nF: forr.length, nA: agst.length,
      xgF: sum(forr, x => x[F.xg]), xgA: sum(agst, x => x[F.xg]),
      bcF: forr.filter(x => (x[F.xg] || 0) >= BIG_CHANCE_XG).length,
      bcA: agst.filter(x => (x[F.xg] || 0) >= BIG_CHANCE_XG).length,
      gf: goalsIn(forr), ga: goalsIn(agst), cs: GOAL < 0 ? null : cs,
    });
  });
  return out;
}

/* ---------- SAMA SAMLAGNING, YFIRSTANDANDI TIMABIL (22.8.2026)
   "Afhverju fae eg ekki xGC a lid?" — af thvi ad skotakortid
   (`bsd_shots.json`) er FROSID 2025/26 og `bsd_live.json` bar adeins
   timabils-summur PER LEIKMANN. xG lidsins ma summa ur theim; xGC er summa
   MOTHERJANNA og hun er ekki i theim, hvorki bein ne leidd.

   `bsd_live.team_matches` (sja `matchShotTotals` i src/bsd.js) ber nu EINA
   ROD PER LEIK med badar hlidar, og thetta fall breytir theim i NAKVAEMLEGA
   somu Map og `aggShotRange` skilar — svo `applyTeamRange` og `routeInStep`
   lesa hana obreytt og engin ny formula verdur til i toflunni.

   TVAER UTFAERSLUR AF SOMU STAERD ER GILDRAN SEM ThETTA REPO ER FULLT AF
   (buildTeamMetrics, wOf, ZONE_RE …). Hun er hér OHJAKVAEMILEG — inntokin
   eru sitthvor (per skot a moti per leik) — svo hun er JAFNGILDIS-PROFUD i
   stad thess ad vera fullyrt: `team-stats.mjs` kafli 12e brytur 2025/26-
   kortid (9.544 skot) nidur i tilbunar leikja-radir og krefst thess ad
   BADAR leidir skili somu tolu fyrir oll 17 lidin, a ollum atta svidunum.

   OG HUN ER STRANGARI EN SKOT-LEIDIN A EINUM STAD: skot-lykillinn er
   (umferd, motherji) og getur thvi ekki adgreint tvo leiki gegn SAMA lidi i
   somu umferd (skjalad i `aggShotRange`). Her er lykillinn leikurinn sjalfur
   (`id`), svo tvofold umferd telst rett an hjalpar fra `fixtures.json`.  */
export function aggLiveMatchRange(matches, range = null) {
  const out = new Map();
  if (!Array.isArray(matches)) return out;
  /* BADAR HLIDAR VERDA AD VERA HEILAR. Half skrad rod (t.d. `away` an `xg`)
     myndi gefa lidinu xGC 0 OG hreint blad — tvaer tilbunar tolur ur einu
     vantandi svidi. `?? 0` badum megin er nakvaemlega su villa (CLAUDE.md 12,
     `net_transfers_event`), svo rodin er felld i heild fremur en flikkud. */
  const okSide = s => s && typeof s.xg === "number" && typeof s.shots === "number"
                   && typeof s.bc === "number" && typeof s.goals === "number";
  const bump = (self, opp) => {
    if (self.team == null) return;                 // lid utan deildar — engin rod
    const a = out.get(self.team)
      || { n: 0, nF: 0, nA: 0, xgF: 0, xgA: 0, bcF: 0, bcA: 0, gf: 0, ga: 0, cs: 0 };
    a.n++;
    a.nF += self.shots; a.nA += opp.shots;
    a.xgF += self.xg;   a.xgA += opp.xg;
    a.bcF += self.bc;   a.bcA += opp.bc;
    a.gf += self.goals; a.ga += opp.goals;
    if (opp.goals === 0) a.cs++;
    out.set(self.team, a);
  };
  for (const m of matches) {
    /* `inRange` krefst thess ad `gw` se til — leikur an umferdar er ekki
       hægt ad setja i bil og ma thvi ekki lauma ser inn i "heilt timabil"
       heldur. Sama medferd og skot an umferdar fa i `aggShotRange`.      */
    if (!m || !inRange(m.gw, range)) continue;
    if (!okSide(m.home) || !okSide(m.away)) continue;
    bump(m.home, m.away); bump(m.away, m.home);
  }
  return out;
}

/* HVOR SKOTA-HEIMILDIN — KALLANDINN VELUR, FALLID GISKAR EKKI.
   `Teams.jsx` sendir NAKVAEMLEGA adra: frosna kortid i fyrra timabili,
   leikja-radirnar i thvi yfirstandandi. Vaeri "hvor sem er til" reglan gaeti
   toflan lagt saman mork ur einu timabili og xG ur odru — sem er ekki tom
   tala heldur ROng (sama rok og `bsdSeasonInStep`).                      */
function shotAggOf(shotIndex, liveMatches, range) {
  return Array.isArray(liveMatches) && liveMatches.length
    ? aggLiveMatchRange(liveMatches, range)
    : aggShotRange(shotIndex, range);
}

/* ---------- URSLITIN UR `fixtures.json` — HIN LEIDIN, OG HUN GILDIR ADEINS
   UM ThAD TIMABIL SEM SKRAIN BER. */
export function aggFixtureRange(fixtures, range = null) {
  const out = new Map();
  if (!Array.isArray(fixtures)) return out;
  const bump = (id, gf, ga) => {
    if (id == null) return;
    const a = out.get(id) || { n: 0, gf: 0, ga: 0, cs: 0 };
    a.gf += gf; a.ga += ga; a.cs += ga === 0 ? 1 : 0; a.n++;
    out.set(id, a);
  };
  for (const f of fixtures) {
    /* ADEINS LOKNIR LEIKIR — EN `finished_provisional` TELST LOKID.
       Onnur skilyrdi (started/minutes ein og ser) duga ekki: leikur i
       gangi hefur hlutastodu og hun myndi telja sem urslit.
       LEIDRETT 24.8.2026: skilyrdid var `finished` EITT, og thad flettist
       ekki fyrr en bonus er stadfestur ~3 dogum eftir umferdina. Maelt
       thann dag: NIU af tiu GW1-leikjum baru `finished: false` med
       `finished_provisional: true, minutes: 90` og fullum urslitum, svo
       `aggFixtureRange` skiladi TOMU -> `use.results` vard null ->
       UMFERDAR-VALARINN VAR ALVEG SLOKKTUR i lifandi syn. Notandinn:
       „nu get eg ekki filterad eftir gameweeks."
       `buildLiveTeamForm` i sama skjali (sja ofar) hefur ALLTAF notad
       retta skilyrdid — tvo foll i einni skra svorudu sitthvoru um sama
       hlut, nakvaemlega `buildTeamMetrics`-aettin (CLAUDE.md 7).        */
    if (!(f?.finished === true || f?.finished_provisional === true)) continue;
    if (!inRange(f.event, range)) continue;
    if (f.team_h_score == null || f.team_a_score == null) continue;
    bump(f.team_h, f.team_h_score, f.team_a_score);
    bump(f.team_a, f.team_a_score, f.team_h_score);
  }
  return out;
}

/* ============================================================
   ER HEIMILDIN I TAKT VID TOFLUNA? — MAELT, EKKI FULLYRT

   Villan sem thetta ver er nakvaemlega su sem notandinn tilkynnti, og hun
   getur komid AFTUR i verri buningi: `fixtures.json` er yfirstandandi
   timabil og skotakortid er thad sidasta, svo THAD ER TILVILJUN hvort
   heimildin sem bilid les segir eitthvad um tofluna sem er a skjanum. Ad
   sameina thau tvo — mork ur 2026/27 og xG ur 2025/26 undir sama haus —
   vaeri ekki tom tala heldur ROng tala.

   ThAD ER EKKI PROFAD MED TIMABILS-STRENG. `bsd_shots.json` ber `season` en
   `shotIndex` (App.jsx) flytur hana ekki, og ad lesa hana ur ANNARRI skra
   (`bsd_teams.json`) vaeri agiskun i buningi maelingar. Profad er thad sem
   ER haegt ad maela: **leikjafjoldinn**. Heimild sem er i takt telur sama
   fjolda leikja per lid og arstidar-heimildin sem taflan hvilir a, og
   heimild ur odru timabili gerir thad ALDREI a neinum staerri hluta
   timabilsins (2025/26-kortid ber 38 per lid; 2026/27-fixtures baru 0 i dag
   og bera 5 i umferd 5).

   Vikmorkin eru +/-2 leikir thvi heimildirnar eru uppfaerdar a olikum
   takti: `fixtures.json` a 30 min fresti, E0-skrain vikulega, svo eitt
   umferdar-bil a milli theirra er venjulegt og ma ekki slokkva a valaranum.
   MORKIN ERU LIKA THAU SEM MAELINGIN LEYFIR: 38 a moti 0 er 38 fra
   throskuldinum, svo hann er hvergi naerri thvi ad taka rangt tilfelli.

   ANNAD SKILYRDID TEKUR ThAD SEM LEIKJAFJOLDINN GETUR EKKI: i sidustu
   umferdum yfirstandandi timabils telja BADAR heimildir ~38 leiki per lid,
   svo fjoldinn einn myndi hleypa 2025/26-skotakortinu inn undir 2026/27
   toflu — mork ur einu timabili og xG ur odru, sem er ROng tala, ekki tom.
   Vardurinn er thvi mork per leik gegn arstidar-heimildinni, OG ThROSKULDUR
   HANS ER MAELDUR: sama timabil gefur 0,003 (skotakortid gegn E0, 17 lid) en
   NAESTA timabil gefur 0,265 ad medaltali og 0,660 mest (`team_form.prev`
   gegn `team_form`, 15 lid). Tvaer staerdargradur i sundur, svo 0,10 er
   hvergi naerri hvorugu — talan velur ekki utkomuna.
   Borid ADEINS thar sem leikjafjoldinn er NAKVAEMLEGA jafn: heimildirnar
   uppfaerast a olikum takti (30 min a moti viku) og lid sem er einn leik a
   undan i einni theirra hefur ekta annad mork-per-leik an thess ad vera ur
   odru timabili.
   ============================================================ */
export function routeInStep(base, per, { maxMatchGap = 2, maxGoalGap = 0.10 } = {}) {
  let checked = 0, sameN = 0, dGoals = 0, gN = 0;
  for (const r of base || []) {
    const m = num(r.matches);
    if (!(m > 0)) continue;                 // nylidi an fyrra timabils
    const a = per(r);
    if (!a || !(a.n > 0)) continue;
    checked++;
    if (Math.abs(a.n - m) <= maxMatchGap) sameN++;
    if (a.n === m && num(r.goals_pg) != null && num(a.gf) != null) {
      dGoals += Math.abs(a.gf / a.n - r.goals_pg); gN++;
    }
  }
  const meanGoalGap = gN ? +(dGoals / gN).toFixed(3) : null;
  const ok = checked >= 8 && sameN >= Math.ceil(checked * 0.9)
    && (meanGoalGap == null || meanGoalGap < maxGoalGap);
  return { ok, checked, sameN, meanGoalGap };
}

/* HVOR LEID ER I NOTKUN — OG HVERS VEGNA EKKI, THEGAR SVARID ER "engin".
   `why` er BIRT A SKJANUM. Valari sem er slokktur an skyringar er sama
   aett og dalkur sem hreyfist ekki an skyringar (thad var kaeran).       */
export function teamRangeUse({ base, shotIndex, liveMatches = null, fixtures } = {}) {
  const shotFull = shotAggOf(shotIndex, liveMatches, null);
  const fixFull = aggFixtureRange(fixtures, null);
  const shotStep = shotFull.size
    ? routeInStep(base, r => shotFull.get(r.short)) : { ok: false, checked: 0 };
  const fixStep = fixFull.size
    ? routeInStep(base, r => fixFull.get(r.id)) : { ok: false, checked: 0 };
  /* URSLITIN: `fixtures.json` fyrst thegar hun er i takt (hun er retta
     heimildin um yfirstandandi timabil og uppfaerist a 30 min), annars
     skotakortid — sem er MAELT NAKVAEMT jofn E0 a ollum thremur tolum.  */
  const results = fixStep.ok ? "fixtures" : (shotStep.ok ? "shots" : null);
  /* ThAKID VERDUR AD KOMA UR ThEIRRI HEIMILD SEM VAR SAMThYKKT. `maxGwOfShots`
     les `shotIndex`, sem er `null` i lifandi syn — svo an thessa hefdi
     skota-leidin gefid thak 0 og bils-valarinn hefdi hangid a leikjaskranni
     einni. Sama regla og annars stadar: thakid er LEITT UT UR GOGNUNUM.  */
  const maxGw = Math.max(
    shotStep.ok ? maxGwOfShotSource(shotIndex, liveMatches) : 0,
    fixStep.ok ? maxEventOf(fixtures) : 0);
  let why = "";
  if (!shotStep.ok && !results) {
    why = shotFull.size || fixFull.size
      ? "no per-gameweek source matches the season in this table — the shot map and the "
        + "fixture results both cover a different number of matches per club"
      : "the per-gameweek shot map has not loaded";
  }
  return { shots: shotStep.ok, results, maxGw: maxGw > 0 ? maxGw : null,
           why, shotStep, fixStep, shotFull };
}

/* ThAKID A BILINU ER LEITT UT UR GOGNUNUM, EKKI 38 (sama regla og
   `maxGwOf` i gwRange.js — bil sem endar a GW38 i skra sem naer til GW34
   gaefi thogla null-summu, tolu sem litur ut eins og maeling).           */
export function maxGwOfShots(shotIndex) {
  if (!shotIndex?.byTeam) return 0;
  const F = shotIndex.fields || {};
  if (F.gw == null) return 0;
  let mx = 0;
  for (const arr of shotIndex.byTeam.values())
    for (const s of arr) { const g = s[F.gw]; if (g > mx) mx = g; }
  return mx;
}
export function maxGwOfLiveMatches(matches) {
  if (!Array.isArray(matches)) return 0;
  let mx = 0;
  for (const m of matches) { const g = m?.gw; if (typeof g === "number" && g > mx) mx = g; }
  return mx;
}
/* SAMA VAL OG `shotAggOf` — thakid ma ekki koma ur annarri heimild en talan. */
function maxGwOfShotSource(shotIndex, liveMatches) {
  return Array.isArray(liveMatches) && liveMatches.length
    ? maxGwOfLiveMatches(liveMatches) : maxGwOfShots(shotIndex);
}
export function maxEventOf(fixtures) {
  if (!Array.isArray(fixtures)) return 0;
  let mx = 0;
  for (const f of fixtures) { const g = f?.event; if (g > mx) mx = g; }
  return mx;
}

/* ============================================================
   BILID SETT A RADIRNAR — EIN UTFAERSLA

   `range = null` gefur HEILT TIMABIL ur somu formulum, og thad er ekki
   snyrting: annars kaemi arstidar-gildid ur `bsd_teams.json` (pipeline-
   summa, sott 8.8.) og bils-gildid ur `bsd_shots.json` (sott 19.8.), og
   "whole season" a moti "GW 1-38" hefdu synt SITTHVORA TOLU um sama hlut
   (maelt: xG/leik ARS 1,725 a moti 1,76 — 2%). Tvaer utfaerslur af somu
   tolu er ein utfaersla og ein thogul villa sem bidur (CLAUDE.md 7).

   Se kortid EKKI i takt (u.shots false) er `bsd_teams.json` latid i fridi
   og dalkarnir bera merkid — lakari tala undir betri merkimida er verri en
   tala sem segir ad hun se arstidar-tala.
   ============================================================ */
export function applyTeamRange(base, { range = null, shotIndex = null,
                                       liveMatches = null,
                                       fixtures = null, use = null } = {}) {
  const rows = Array.isArray(base) ? base : [];
  const u = use || {};
  if (!u.shots && !u.results) return rows;
  const shotAgg = (u.shots || u.results === "shots")
    ? shotAggOf(shotIndex, liveMatches, range) : null;
  const fixAgg = u.results === "fixtures" ? aggFixtureRange(fixtures, range) : null;

  return rows.map(r => {
    const s = shotAgg ? shotAgg.get(r.short) || null : null;
    const res = u.results === "fixtures" ? (fixAgg?.get(r.id) || null)
              : u.results === "shots" ? s : null;
    const out = { ...r };

    if (u.shots) {
      /* Lid an skota i bilinu faer NULL — EKKI 0. "Spiladi ekki" og
         "skaut ekki" eru ekki sama hlutid (CLAUDE.md 8).

         NEFNARINN KEMUR UR URSLITUM ThEGAR ThAU ERU I TAKT. Skot-lykillinn
         (umferd, motherji) getur EKKI adgreint tvo leiki gegn SAMA lidi i
         somu umferd — sjaldgaeft en mogulegt thegar frestadur leikur er
         settur i tvofalda umferd. Tha renna leikirnir saman i EINN,
         nefnarinn verdur of lagur og xg_pg / xgc_pg / bc_pg BLASA UPP.
         `fixtures.json` veit nakvaemlega hve margir leikir voru spiladir,
         svo hun leysir thad — en ADEINS thegar hun er i takt vid tofluna
         (annars vaeri nefnarinn ur odru timabili, sem er verra en of lagur
         nefnari). Skot-lykillinn er varaleidin.                          */
      const sn = s?.n || 0;
      const n = sn ? ((u.results === "fixtures" && res?.n) ? res.n : sn) : 0;
      out.xg              = n ? +s.xgF.toFixed(1) : null;
      out.xgc             = n ? +s.xgA.toFixed(1) : null;
      out.xg_pg           = n ? +(s.xgF / n).toFixed(2) : null;
      out.xgc_pg          = n ? +(s.xgA / n).toFixed(2) : null;
      out.bc_pg           = n ? +(s.bcF / n).toFixed(2) : null;
      out.bc_against_pg   = n ? +(s.bcA / n).toFixed(2) : null;
      /* BADIR HALFAR UR SAMA BILI OG SOMU HEIMILD: xG a hvert skot a sig
         er bils-xGC deilt med SKOTUNUM I SAMA BILI, badir talnir ur
         `bsd_shots.json`. `xgc_per_shot` (BSD-teljari, E0-nefnari) var
         fjarlaegd 21.8.2026 — sja buildTeamRows.                        */
      out.xg_per_shot_against = s?.nA ? +(s.xgA / s.nA).toFixed(3) : null;
      out.bsd_matches = n || null;
    }
    if (u.results) {
      const n = res?.n || 0;
      out.goals       = n ? res.gf : null;
      out.conceded    = n ? res.ga : null;
      out.goals_pg    = n ? +(res.gf / n).toFixed(2) : null;
      out.conceded_pg = n ? +(res.ga / n).toFixed(2) : null;
      out.cs_pct      = n && res.cs != null ? +(100 * res.cs / n).toFixed(1) : null;
      out.played      = n || null;
    }
    /* MISMUNIRNIR KREFJAST BEGGJA LEIDA og eru reiknadir med SAMA falli
       sem arstidar-rodin notar — sama eining, sömu aukastafir.           */
    Object.assign(out, (u.shots && u.results)
      ? diffFields(out.goals, out.conceded, out.xg, out.xgc)
      : diffFields(r.goals, r.conceded, r.xg, r.xgc));
    return out;
  });
}

/* ============================================================
   LIDSVISARNIR SEM FFDR HVILIR A — EIN UTFAERSLA (flutt 12.8.2026)

   Thetta var inni i `App.jsx` sem `useMemo` og ThVI OSYNILEGT FYRIR UTAN
   vidmotid. Thad var i lagi svo lengi sem ADEINS appid reiknadi FFDR — en
   `scripts/snapshot-predictions.mjs` skrifar nu nidur hvad vid SPADUM, og
   spa-bokhald sem reiknar lidsvisana UPP A NYTT maelir annad likan en
   notandinn sa.

   HVERS VEGNA ThETTA VAR FLUTT OG EKKI AFRITAD — ThAD VAR REYNT OG ThAD FELL:
   fyrsta utgafa bokhaldsins endurreiknadi thetta og skrifadi
   `+(x.gf / x.matches)`. `team_form.json` BER ENGIN `gf`/`ga` — hun ber
   `goals_pg` og `conceded_pg`, ThEGAR per leik. Utkoman var `NaN` fyrir oll
   17 lidin sem eiga E0-gogn, MERKT `src: "e0"` eins og hun vaeri maeling.
   Afritid slepptum lika `sotFor`/`sotAg`, `prev*`-aðlöguninni, `matches`
   (sem styrir `prevWeight`) og nyliða-staðgenglinum — fimm liðum sem FFDR
   les. Profid `prediction-ledger.mjs` greip thad; enginn hefdi sed thad a
   skjanum, thvi appid var alltaf rett.

   Lardomurinn er sa sami og `market.js` og `bsd.js` voru stofnud fyrir
   (CLAUDE.md kafli 1): tvaer utfaerslur af somu tolu er EIN utfaersla og EIN
   thogul villa sem bidur. Nu flytja BADIR — vidmotid og bokhaldid — thetta
   fall inn, svo thau geta ekki farid i sundur.

   ThRJAR REGLUR SEM LIFA I ThESSUM KODA:
     1. `team_form.json` TEKUR FORGANG yfir FPL-summur: hun er HEIL (E0, 380
        leikir) medan FPL-summur vantar ~19% (leikmenn sem foru ur deildinni
        eru fjarlaegdir ur bootstrap).
     2. NYLIDAR FA STADGENGIL, EKKI NULL — og hann er MAELDUR FASTI, ekki
        margfaldari a B-deildar-tolur (sja `PROMOTED_PL`). Nyliði an
        PL-sogu hefur xG ~0 og myndi annars lesa eins og besta vorn
        deildarinnar.
     3. `src` ER ALLTAF SKRAD. Thrennt er ekki thad sama: maeling ur
        THESSU timabili (`e0_complete`), maeldur fasti ur ANNARRI laug
        (`promoted_measured`) og sjalfgildi (`default`).
   ============================================================ */

/* ============================================================
   NYLIDA-FASTINN — MAELDUR 20.8.2026, n = 45 LID-TIMABIL

   HER STODU TVAER TOLUR AN NOKKURS ROKSTUDNINGS: `goals_pg * 0.75` og
   `goals_against_pg * 1.35`, med athugasemdunum "B-deild -> PL afslattur"
   og "fa meira a sig i PL". Thaer voru VALDAR tolur i buningi maelingar
   (CLAUDE.md kafli 3) og afleidingin var maelanleg: Ipswich modeladist
   1,74x0,75 = 1,30 i sokn og 1,02x1,35 = 1,38 a sig — MEDALLID i Premier
   League (deildar-medaltal a sig 1,295) — og **Coventry fekk 1,32 a sig,
   SJOTTA BESTA VORN DEILDARINNAR**. Nylidi a ad vera i verstu 1-3.

   MAELINGIN (`scripts/measure-promoted-proxy.mjs`, handvirk):
   Nylidi = lid sem er i E1 (Championship) timabil S OG i E0 timabil S+1.
   Bein talning ur football-data.co.uk-skraunum sjalfum, engin nafna-tafla.
   **15 PL-timabil (2011/12–2025/26), NAKVAEMLEGA 3 nylidar i hverju,
   n = 45 lid-timabil.** E1 er sannreynt `Div === "E1"` eins og E0-leidin
   sannreynir `Div === "E0"` (kafli 6).

   1. HLUTFOLLIN SEM VORU I KODANUM ERU UTAN MAELDS CI — BADAR.
        sokn (PL GF / Ch GF): medaltal 0,625 CI [0,584, 0,667]
                              midgildi 0,605 CI [0,556, 0,653]   var 0,75
        vorn (PL GA / Ch GA): medaltal 1,944 CI [1,740, 2,200]
                              midgildi 1,741 CI [1,593, 2,058]   var 1,35
      Vornin var thvi ~30% of milld og soknin ~20% of rausnarleg.

   2. OG MARGFOLDUNAR-FORMID SJALFT FELL. B-deildar-talan hefur ENGA
      forspa um PL-toluna a vornina: **r = -0,038** (Ch GA/leik -> PL
      GA/leik) og hallatalan er NEGATIF (b = -0,067). Soknin er svo
      naest engu: r = 0,250. B-deildar-STIG eru enn verri (r = 0,030 og
      0,120), svo "champion a moti umspils-sigurvegara" var maelt og fell.

      LOSO (leave-one-season-out, MAE i morkum/leik):
        | leid                    | SOKN  | VORN  |
        | 0,75 / 1,35 (var)       | 0,276 | 0,500 |
        | maelt hlutfall          | 0,182 | 0,471 |
        | maeld lina a + b*Ch     | 0,173 | 0,330 |
        | MAELDUR FASTI           | 0,175 | 0,320 |
      Parad bootstrap a somu leikjum:
        VORN fasti - hlutfall  -0,150 CI [-0,252, -0,063]  FASTINN VINNUR
        VORN fasti - lina      -0,010 CI [-0,020, -0,002]  FASTINN VINNUR
        VORN fasti - 1,35      -0,180 CI [-0,302, -0,076]  FASTINN VINNUR
        SOKN fasti - hlutfall  -0,007 CI [-0,047, +0,037]  OGREINANLEGT
        SOKN fasti - 0,75      -0,102 CI [-0,159, -0,045]  FASTINN VINNUR
      Fastinn vinnur eda er jafn i ollum samanburdum og TAPAR i engum.

   3. HVERS VEGNA HLUTFALL GETUR EKKI VIRKAD HER — thridjungs-taflan:
        Ch GA/leik thridjungar 0,35-0,85 | 0,85-0,98 | 0,98-1,37
        PL GA/leik utkoma       1,758    | 1,653     | 1,711   (FLOT)
        hlutfallid sem tharf    2,521    | 1,817     | 1,494
      PL-utkoman er FLOT yfir B-deildar-vorn; hlutfallid sveiflast adeins
      thvi NEFNARINN sveiflast. Gott B-deildar-vorn (Ipswich 1,02, Burnley
      0,35) er thvi ekki merki um neitt i PL — hun margfaldadist bara upp i
      goda PL-vorn. Sama aett og "afstaed threp innan lids" (CLAUDE.md 3):
      formid bar sponn sem merkid stydur ekki. Soknin er mildari en sama
      att: PL GF 0,984 / 1,012 / 1,082 a moti hlutfalli 0,705 / 0,611 /
      0,557 — hlutfallid margfaldar sponnina **~3,8x** yfir hina maeldu.

   4. FASTINN ER ERA-STODUGUR. Absolut a moti hlutfalli af deildar-
      medaltali gefur naest sama tolu i dag (1,010 / 1,672 a moti 1,026 /
      1,707, undir 2%) og leitni i tima er ogreinanleg (r -0,09 og +0,36
      absolut, -0,20 og +0,27 sem hlutfall). Sidustu 10 timabil ein:
      0,996 CI [0,917, 1,075] og 1,763 CI [1,604, 1,918] — CI-in skarast
      vid heildina, svo urtakid er ekki klofid.

   NIDURSTADAN: **raunveruleg PL-utkoma nylida, medaltal yfir 45 lid-
   timabil.** Midgildi gefur naest sama tolu (1,026 og 1,737) og medaltalid
   vinnur adeins i LOSO (0,320 a moti 0,326), svo namundun i tvo aukastafi
   er innan CI hvort sem er.
     sokn  1,03  medaltal 1,026 CI [0,965, 1,087]  spönn 0,605-1,632
     a sig 1,71  medaltal 1,707 CI [1,608, 1,819]  spönn 1,026-2,737

   OLL ThRJU LIDIN LENDA NU I 18. SAETI AF 18 A BADUM HLIDUM (a moti
   11./13., 5./6. og 16./18. adur) og invariantid "nylidi verri en
   deildar-medaltal a BADUM hlidum" heldur — thad var BROTID a Coventry.

   ThRJU LIDIN FA SOMU TOLU, OG ThAD ER MAELD ADGREINING SEM ER TEKIN
   BURT, EKKI TYND UPPLYSING: B-deildar-talan bar hana ekki (r = -0,038).
   Elo og markadslinan adgreina lidin afram og gera thad a maeldum grunni
   (markadsvog 0,80, sterkasta einstaka inntakid — kafli 3).

   MA EKKI ALHAEFA A `default`. Sjalfgildid nedar (1,1 / 1,6) VIRDIST
   vera sama spurning og er thad EKKI: falli `team_form.json` ut fa OLL
   20 lid xG ~0 ur FPL i forleik, thrju thekkjast sem nylidar og **17
   rotgroin PL-lid lenda i `default`**. Fyrir tha laug er ~medaltal rett
   varfaerid svar og nylida-fastinn vaeri ROng tala. Tvaer laugar, tveir
   fastar.
   ============================================================ */
export const PROMOTED_PL = {
  goals_pg: 1.03,        // maelt 1,026 CI [0,965, 1,087], n=45
  conceded_pg: 1.71,     // maelt 1,707 CI [1,608, 1,819], n=45
  n: 45, seasons: 15,
  measured: { goals_pg: 1.026, goals_pg_ci: [0.965, 1.087],
              conceded_pg: 1.707, conceded_pg_ci: [1.608, 1.819] },
};
export function buildTeamMetrics({ players, teams, promoted, teamForm }) {
  if (!players || !teams) return {};

  const m = {};
  const agg = {};
  players.forEach(p => {
    const a = agg[p.team] = agg[p.team] || { xg:0, gkMins:0, gkXgc:0 };
    // xG EINGÖNGU — expected_goal_involvements tvítelur (mark + assist á sama marki)
    a.xg += parseFloat(p.expected_goals || 0);
    if (p.element_type === 1 && p.minutes > a.gkMins) {
      a.gkMins = p.minutes;
      a.gkXgc = parseFloat(p.expected_goals_conceded || 0);
    }
  });
  // team_form.json er HEILT (úr E0, 380 leikir). FPL-summur vantar ~19%
  // því leikmenn sem fóru úr deildinni eru fjarlægðir úr bootstrap.
  const tf = {};
  (teamForm?.teams || []).forEach(x => { if (x.matches > 0) tf[x.fpl_id] = x; });
  teams.forEach(t => {
    const a = agg[t.id] || { xg:0, gkMins:0, gkXgc:0 };
    const games = a.gkMins > 0 ? a.gkMins / 90 : 38;
    let xg90 = +(a.xg / 38).toFixed(2);
    let xgc90 = a.gkMins > 400 ? +(a.gkXgc / games).toFixed(2) : 1.4;
    let src = "fpl";
    let sotFor = null, sotAg = null, prevGoals = null, prevConc = null;
    let prevSotFor = null, prevSotAg = null, matches = null;
    if (tf[t.id]) {                       // HEILT — tekur forgang
      const x = tf[t.id];
      xg90 = x.goals_pg; xgc90 = x.conceded_pg;
      sotFor = x.sot_pg ?? null; sotAg = x.sot_against_pg ?? null;
      prevGoals = x.prev?.goals_pg ?? null; prevConc = x.prev?.conceded_pg ?? null;
      prevSotFor = x.prev?.sot_pg ?? null; prevSotAg = x.prev?.sot_against_pg ?? null;
      matches = x.matches ?? null;      // stýrir aðlögunar-vog (prevWeight)
      src = "e0_complete";
    }
    /* Nýliðar hafa enga PL-sögu (xG ~0) og fá MÆLDAN FASTA — sjá
       `PROMOTED_PL` fyrir mælinguna (n=45, 15 tímabil) og fyrir það hvers
       vegna B-deildar-margfaldarinn var mældur og felldur (r=−0,038 á
       vörnina; hlutfallið margfaldaði spönnina ~3,8× yfir hina mældu).
       `promoted` er hér AÐEINS aðildar-próf — "kom þetta lið upp?" — ekki
       lengur uppspretta talnanna, og `src` segir það: `promoted_measured`
       er mældur fasti úr annarri laug, ekki B-deildartala með afslætti.  */
    if (xg90 < 0.2) {
      const pb = promoted && promoted[t.name.replace(/ (City|Town|United)$/, "")] ||
                 promoted && promoted[t.name];
      if (pb) {
        xg90 = PROMOTED_PL.goals_pg;
        xgc90 = PROMOTED_PL.conceded_pg;
        src = "promoted_measured";
      } else { xg90 = 1.1; xgc90 = 1.6; src = "default"; }
    }
    m[t.id] = { xg90, xgc90, sotFor, sotAg, matches,
      prevGoals, prevConc, prevSotFor, prevSotAg, mins: a.gkMins, src };
  });
  return m;
}
