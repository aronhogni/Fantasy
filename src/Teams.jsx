/* ============================================================
   LIDA-TOLUR — FLIPINN

   BIRTING EINGONGU. Hver tala kemur ur `src/teamstats.js` (hreint,
   ekkert React) af somu astaedu og `model.js` og `stats.js`: profin
   keyra sama kodann og skjarinn synir.

   AF HVERJU SER FLIPI OG EKKI DALKAR I LEIKMANNALISTANUM: rodin er
   LIDID, ekki leikmadurinn. Ad haengja 20 lida-tolur a 572 leikmenn
   vaeri ad endurtaka somu tuttugu raedirnar 28 sinnum hverja, og
   rodun eftir theim vaeri rodun a lidum i dulargervi.
   ============================================================ */
import React, { useMemo, useState, useEffect, useRef } from "react";
import ShotMap from "./ShotMap.jsx";
import { buildTeamRows, TEAM_STAT_DEFS, TEAM_GROUPS, sortTeamRows, TEAM_STAT_BY_KEY,
         applyTeamRange, teamRangeUse, teamRangeBlind, maxEventOf,
         TEAM_RANGE_SRC, bsdSeasonInStep, buildLiveTeamForm,
         teamFormFlags, FORM_MIN_MATCHES } from "./teamstats.js";
/* MERKID OG SMELLURINN ERU FLUTT INN, EKKI AFRITUD. `nextRange` stod
   ORDRETT afritad her (thrjar linur) og merkja-ordid "season" var ekki til
   i thessum flipa — thott sami eiginleiki i Player stats hafi bædi haft
   thau fra 20.8. Ord sem er skrifad tvisvar er ord sem getur ordid tvennt
   (sja hausinn a gwRange.js).                                           */
import { RANGE_BLIND_BADGE, nextRange } from "./gwRange.js";

/* Engin sameiginleg thema-eining er til i thessu repo-i — hver eining ber
   sina eigin `C` (sbr. PlayerList.jsx og Leagues.jsx). Afritad viljandi
   fremur en ad bua til nyja sameign i midri lotu thar sem onnur lota er
   ad breyta somu skram.                                                 */
const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c", greenBg:"#e6f9f0",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

export default function Teams({ teams, teamForm, luck, teamShots, fixtures, bsdTeams,
                                shotIndex, bsdLive, seasonLabel, Crest }) {
  /* HEITID ER LEITT, EKKI SKRIFAD. Fyrsta utgafan bar
     `SEASON_LIVE_LABEL = "2026-27"` her — og `team-stats.mjs` felldi hana
     samstundis: "engin timabils-tala er hardkodud i kodanum sjalfum".
     Su regla er til vegna hardkoduðu "2025/26"-strengjanna tveggja i haus
     skotakortsins (`team-gw.mjs` kafli 7), og hun a jafn vel vid um
     yfirstandandi timabil: fost tala urelist thegjandi naesta agust.
     `seasonLabel` kemur ur `currentSeasonLabel` i App.jsx, sem er leitt af
     GW1-frestinum — SAMA talan sem allir adrir flipar bera.             */
  const liveLabel = seasonLabel || "this season";
  /* UMFERDAR-BIL — EN AÐEINS FYRIR ThAD SEM ThAD GETUR HREYFT.
     Hvad getur og hvad getur ekki — og hvers vegna — er MAELT og skjalad i
     `teamstats.js` (kaflinn "UMFERDAR-BILID"). Her er adeins birtingin:
     dalkur sem getur ekki fylgt bilinu BER MERKID (`season`), thvi thogull
     dalkur sem hreyfist ekki var einmitt kaeran (20.8.2026: "i attack
     breytast stats ekki thegar eg filtera gameweeks").                  */
  const [gwRange, setGwRange] = useState(null);       // [fra, til] eda null
  /* SJALFGEFNI FLOKKURINN FYLGIR RODINNI I `TEAM_GROUPS` — hann var
     "keeper" medan sa flokkur stod fremstur og er "defence" eftir ad
     rodinni var snuid 25.8.2026 (sja teamstats.js). Hann er skrifadur her
     og ekki leiddur af `TEAM_GROUPS[0]` af asettu radi: leidrettingin
     nedar (`groupHasData`) er su sem MA EKKI vera hardkodud, thvi hun
     raedur hvad notandinn SER; thetta er upphafsstada sem prof mega
     fullyrda um berum ordum.                                            */
  const [group, setGroup] = useState("defence");
  /* TIMABILS-VALID (22.8.2026, ad beidni notandans). `season` er "prev" eda
     "live".

     SJALFGEFID VAR "prev" OG ThVI VAR SNUID SAMDAEGURS AD BEIDNI: "eg vill
     hafa nyjasta timabilid auto valid allstadar, og eg thurfti ad velja til
     baka ef eg vill sja thad." Rokin fyrir gamla sjalfgildinu voru rett um
     GOGNIN — yfirstandandi timabil er eitt-leiks urtak i dag — en thad er
     EKKI okkar ad velja fyrir hann hvad hann skodar; okkar er ad syna
     honum hvad talan hvilir a. Thess vegna ber hnappurinn leikjafjoldann
     ("2026/27 · 6 matches") og skyringar-linan segir hvad er tomt og hvers
     vegna. Urtaksstaerd sem SEST er onnur saga en urtaksstaerd sem er falin
     med thvi ad syna hana ekki.

     ThAD FELLUR AFTUR I "prev" EF EKKERT ER SPILAD: `buildLiveTeamForm`
     skilar `null` thegar enginn leikur er buinn, og tha vaeri "live" tomur
     flipi. Sjalfgildid les thvi gognin, thad giskar ekki.               */
  const [season, setSeason] = useState("live");
  /* Valid lid fyrir skotakortin. null = ekkert valid.               */
  const [pick, setPick] = useState(null);
  /* UPPHAFS-RODUNIN VERDUR AD VERA I SJALFGEFNA FLOKKNUM. Hun stod a
     `sot_against_pg` (markvardar-dalkur) og eftir flokka-snuninginn
     25.8.2026 var hun a dalki sem er EKKI a skjanum vid opnun — thad var
     ekki synileg villa (effectinn nedar leidretti hana strax) en thad er
     ein teikning i osamraemi vid sjalft sig, og "tvo skilyrdi um sama hlut
     er hvernig thau fara i sundur".                                     */
  const [sort, setSort] = useState({ key: "conceded_pg", dir: "asc" });

  /* YFIRSTANDANDI TIMABIL ER REIKNAD UR `fixtures.json` — engin ny gagnaskra
     (sja `buildLiveTeamForm`). `luck`, `teamShots` og `bsdTeams` eiga OLL
     vid fyrra timabil, svo thau eru EKKI send med i lifandi syn; vaeru thau
     send bæri sama rodin urslit thessa timabils og skot hins.           */
  const liveForm = useMemo(
    () => buildLiveTeamForm({ fixtures, teams: teams?.teams || teams,
                              season: liveLabel }),
    [fixtures, teams]);
  const liveOn = season === "live" && !!liveForm;

  const base = useMemo(
    () => liveOn
      ? buildTeamRows({ teams, teamForm: liveForm, luck: null, teamShots: null })
      : buildTeamRows({ teams, teamForm, luck, teamShots, bsdTeams }),
    [liveOn, liveForm, teams, teamForm, luck, teamShots, bsdTeams]);

  /* HVOR PER-UMFERDAR LEID ER I TAKT VID TIMABILID SEM TAFLAN SYNIR.
     Thetta er EKKI gefid ser og var THAD adur: valarinn las `fixtures.json`,
     sem er YFIRSTANDANDI timabil, medan taflan synir thad SIDASTA. Maelt
     20.8.2026: 380 leikir, 0 loknir — svo mork, mork a sig og hrein blod
     urdu "—" hja ollum 20 lidum um leid og bil var valid, og engin skyring
     var a skjanum. `teamRangeUse` PROFAR heimildina (leikjafjoldi per lid,
     mork per leik) i stad thess ad trua henni.                          */
  /* LIFANDI SYN NOTAR ENGIN SKOT — `bsd_shots.json` er 2025/26, svo
     `shotIndex` yrdi ur ODRU timabili. Bilid fylgir thvi urslitunum einum.  */
  /* YFIRSTANDANDI TIMABIL FAER SINA EIGIN SKOTA-HEIMILD (24.8.2026).
     `bsd_shots.json` er FROSID 2025/26, svo `shotIndex` er rettilega
     `null` i lifandi syn — en thad skildi xG OG xGC eftir tom thar.
     `bsd_live.team_matches` er EIN rod per leikinn leik med BADAR hlidar,
     sem er einmitt thad sem xGC krefst (hun er summa MOTHERJANNA og
     verdur aldrei reiknud ur per-leikmanns summum).
     Rodin er skrifud af pipeline-unni og `teamstats.js` hafdi bædi
     samlagninguna og jafngildis-vordinn — thad sem vantadi var ThETTA:
     ad senda hana inn. An thess hefdu dalkarnir stadid tomir ad eilifu
     og litid ut eins og "BSD vantar", ekki "vid gleymdum ad tengja".   */
  const liveMatches = useMemo(
    () => (liveOn && Array.isArray(bsdLive?.team_matches) ? bsdLive.team_matches : null),
    [liveOn, bsdLive]);
  const use = useMemo(() => teamRangeUse({ base, shotIndex: liveOn ? null : shotIndex,
                                           liveMatches, fixtures }),
    [base, shotIndex, liveMatches, fixtures, liveOn]);

  /* EIN UTFAERSLA, OG `range: null` ER LIKA HUN. Arstidar-rodin er thvi
     REIKNUD UR SOMU FORMULUM sem bilid notar — annars kaemi "whole season"
     ur `bsd_teams.json` (pipeline-summa, sott 8.8.) og "GW 1-38" ur
     `bsd_shots.json` (sott 19.8.), tvaer tolur um sama hlut (ARS xG/leik
     1,725 a moti 1,76). Sja teamstats.js.                              */
  /* `liveMatches` FYLGIR BADUM KOLLUNUM — `teamRangeUse` OG `applyTeamRange`.
     Ad senda hana adeins i takt-profid en ekki i samlagninguna hefdi gefid
     "heimildin er i takt" OG tomar tolur i sama andartaki: verra en hvorugt,
     thvi merkid hefdi sagt ad allt vaeri i lagi.                        */
  const rows = useMemo(
    () => applyTeamRange(base, { range: gwRange, shotIndex: liveOn ? null : shotIndex,
                                 liveMatches, fixtures, use }),
    [base, gwRange, shotIndex, liveMatches, fixtures, use, liveOn]);

  /* ThAKID KEMUR UR GOGNUNUM. Bil sem endar a GW38 i heimild sem naer til
     GW34 gaefi thogla null-summu — tolu sem litur ut eins og maeling (sama
     regla og `maxGwOf` i gwRange.js).                                   */
  const maxGw = use.maxGw || maxEventOf(fixtures) || 0;
  const gwOn = !!(use.shots || use.results) && maxGw > 0;

  /* EKKI LENDA NOTANDANUM A TOMUM FLOKKI (22.8.2026). Sjalfgefni flokkurinn
     VAR "What the keeper faces" (nu "GK") og hann er skota-drifinn AD OLLU
     LEYTI, svo smellur a yfirstandandi timabil skiladi TIU dalkum af "—" og
     skyringu fyrir nedan. Thad er satt en gagnslaust: notandinn bad um ad
     SJA timabilid, ekki ad sja ad thad se tomt.
     25.8.2026 VAR ORSOKIN SJALF LOGUD I STAD ThESS AD LATA PLASTRID DUGA:
     `TEAM_GROUPS` setti tomasta flokkinn fremstan og hann var thvi baedi
     sjalfgildid OG thad sem thessi leidretting var alltaf ad hlaupa fra.
     Vardveitt her thvi hun ver LIKA ondverdu attina (skipt UR lifandi syn
     i fyrra timabil) og hvern nyjan flokk sem verdur tomur i annarri hvorri.
     FLOKKURINN SEM ER VALINN ER LEIDDUR, EKKI HARDKODADUR: fyrsti flokkur
     sem a a.m.k. einn dalk med tolu i thessari syn. Vaeri hann skrifadur
     ("defence") myndi hann stadna um leid og dalkur faerist milli flokka —
     nakvaemlega thad sem gerdist i nott thegar `goals` for i attack.     */
  const groupHasData = useMemo(() => {
    const has = {};
    for (const g of TEAM_GROUPS) {
      has[g.key] = TEAM_STAT_DEFS.some(d => d.group === g.key
        && rows.some(r => d.get(r) != null));
    }
    return has;
  }, [rows]);
  /* ADEINS VID TIMABILS-SKIPTI, EKKI VID HVERJA TEIKNINGU (lagad strax).
     Fyrsta utgafan leidretti flokkinn i hvert sinn sem hann var tomur, og
     thad thydir ad notandi sem VELUR "GK" i lifandi syn
     er hentur strax til baka i Defence — hann getur ekki skodad flokkinn
     sem hann bad um. Profid fann thad: fullyrding um ad skota-dalkarnir
     seu tomir gat ekki einu sinni OPNAD thann flokk.
     Leidrettingin a heima a SKIPTINNI: thu lendir ekki a tomum flokki, en
     thu maett fara i hann sjalfur.                                       */
  /* `null` OG EKKI `season` — ANNARS KEYRIR LEIDRETTINGIN ALDREI A FYRSTU
     TEIKNINGU. Um leid og sjalfgildid vard "live" (22.8.) thydir "engin
     skipti enn" ad flokkurinn er OSNERTUR, og tha var sjalfgefni
     flokkurinn skota-drifinn ad ollu leyti — svo notandinn hefdi lent a
     TOMRI toflu strax vid opnun. `null` gerir fyrstu teikninguna ad
     "skiptum". SJALFGILDID ER EKKI LENGUR TOMT (25.8.), en `null` stendur:
     thad ver hverja framtidar-samsetningu thar sem upphafs-flokkurinn og
     upphafs-timabilid passa ekki saman, og su samsetning verdur ekki til
     med thvi ad einhver taki eftir henni.                                */
  const lastSeason = useRef(null);
  useEffect(() => {
    if (lastSeason.current === season) return;       // engin skipti
    lastSeason.current = season;
    if (groupHasData[group]) return;                 // flokkurinn er i lagi
    const first = TEAM_GROUPS.find(g => groupHasData[g.key]);
    if (first) setGroup(first.key);
  }, [season, groupHasData, group]);

  const defs = useMemo(() => TEAM_STAT_DEFS.filter(d => d.group === group), [group]);
  /* Ef skipt er um flokk og radad var eftir dalki sem er ekki lengur a
     skjanum, situr rodunin i ONSYNILEGRI tolu og taflan litur handahofs-
     kennt ut. Tha er fallid aftur a fyrsta dalk flokksins.              */
  useEffect(() => {
    if (sort.key !== "__name" && !defs.some(d => d.key === sort.key))
      setSort({ key: defs[0]?.key || "__name", dir: defs[0]?.hi === false ? "asc" : "desc" });
  }, [group, defs, sort.key]);

  const sorted = useMemo(() => sortTeamRows(rows, sort.key, sort.dir), [rows, sort]);

  /* FYLGIR DALKURINN BILINU? LEITT UT, ALDREI HANDSKRIFAD.
     Fyrri utgafa bar HANDSKRIFADA setningu ("goals, conceded, clean sheets
     and the shot columns follow the range — shots faced, corners, fouls and
     cards are season totals"). Hun var rett thann daginn og gat ekki verid
     rett lengi: hun nefnir hvorki hvad gerist thegar heimildin er ur takti
     ne nyja dalka. Sama villa og horna-svidin i SetPieces 13.8.2026 —
     fost tala/upptalning um lifandi gogn ureldist thogult.               */
  const blind = useMemo(() => {
    const o = {};
    for (const d of TEAM_STAT_DEFS) o[d.key] = teamRangeBlind(d.key, use);
    return o;
  }, [use]);
  const following = defs.filter(d => !blind[d.key]).length;

  /* ============================================================
     ELDUR OG IS — SAMHENGI, EKKI TALA (25.8.2026, ad beidni notandans)

     Reikningurinn er ALLUR i `teamstats.js` (`teamFormFlags`) og
     rokstudningurinn stendur thar: form sem SPA er maelt og fellt thrisvar
     i thessu repo-i, svo merkid fer HVERGI inn i `fixDifficulty`,
     `expPointsFor`, `rankScore` ne `csFor`. Thetta er sami samningur og
     Evropu-stjarnan ber (CLAUDE.md kafli 4) — synt vid hlidina a tolunni,
     aldrei inni i henni.

     HER ER ADEINS BIRTINGIN, og hun ber tvennt sem ekki ma sleppa:
     glugginn er NEFNDUR i tooltip-inu (merki an bils er fullyrding sem
     enginn getur athugad) og tacknin eru VALIN EFTIR SILHUETTU: fyllt
     dropa-form a moti thunnum geislum. Vid 13 px er thad eina sem lesst
     (CLAUDE.md 8, ikon-kaflinn) — tveir hringir med smaatridum vaeru sama
     taknid.

     SVG-IN ERU SKRIFUD HER OG EKKI I `Icons.jsx` af utanadkomandi astaedu:
     onnur lota a thann skra i somu andra og tvaer lotur i sama vinnutre
     mega ekki skrifa i somu skra (CLAUDE.md kafli 2). Faerist thau thangad
     sidar er thad hrein flutningur — thau lesa ekkert ur thessari skra.

     ENGINN TEXTI I HOLFINU. `team-gw.mjs` finnur radir med
     `textContent.startsWith(short)`, svo emoji a undan skammstofuninni
     hefdi brotid hverja einustu uppflettingu i thvi safni. `<svg>` ber
     engan texta og situr auk thess AFTAN vid nafnid.                    */
  const form = useMemo(
    () => teamFormFlags({ rows, shotIndex: liveOn ? null : shotIndex,
                          liveMatches, fixtures, use, range: gwRange }),
    [rows, shotIndex, liveMatches, fixtures, use, gwRange, liveOn]);
  const formTitle = kind => {
    if (!form.window) return "";
    const [a, b] = form.window, [c, d] = form.baseRange;
    return (kind === "hot"
        ? "Hot form. Over GW " : "Poor form. Over GW ")
      + `${a}–${b} this side's goal difference per match sits in the league's `
      + (kind === "hot" ? "best " : "worst ")
      + `sixth measured against its OWN average over GW ${c}–${d} — so it is a `
      + `statement about a change, not about being good or bad. Both halves are `
      + `counted from the same source over the same table.`
      + `\n\nDESCRIPTIVE ONLY. It changes no number anywhere in this app: not `
      + `fixture difficulty, not expected points, not the buy ranking, not clean-`
      + `sheet odds. Form as a predictor is measured and rejected here — within a `
      + `player a goal is followed by regression, and team clean sheets do not run `
      + `in streaks (lift 0.99).`
      + `\n\nNo mark is given to a side with fewer than ${FORM_MIN_MATCHES} matches `
      + `in the window, and the cut is the league's top and bottom sixth rather than `
      + `a chosen threshold.`;
  };

  /* BESTA OG VERSTA GILDID i hverjum dalki — litud, thvi 20 raedir af
     tveggja aukastafa tolum eru olæsilegar an akkeris. `hi` raedur hvor
     endinn er graenn; an thess vaeri myndin ROng fyrir allt sem lidid
     faer A SIG (haerra = verra). Sama regla og i Compare.jsx.           */
  const ext = useMemo(() => {
    const o = {};
    for (const d of defs) {
      const vals = rows.map(d.get).filter(v => typeof v === "number");
      if (vals.length < 3) continue;
      o[d.key] = { min: Math.min(...vals), max: Math.max(...vals) };
    }
    return o;
  }, [defs, rows]);

  const cellStyle = (d, v) => {
    /* OFULLKOMINN DALKUR FAER ENGA BESTA/VERSTA MERKINGU. Merkingin er
       FULLYRDING ("thetta er besta vornin i deildinni") og dalkur sem
       vantar gogn i getur ekki borid hana.

       ENGINN DALKUR BER `incomplete` I DAG — OG ATHUGASEMDIN HER SAGDI
       ANNAD ThANGAD TIL 21.8.2026. Her stod ad xG/xGC vaeru FPL-summa,
       "vantadi ~19%", og daemid var Leeds med xGC 0,70 a moti 1,47 i
       raunmorkum. Thad var rett ThANGAD TIL 8.8.2026 og hefur verid RANGT
       sidan: xG/xGC koma ur BSD-skotakortinu (per-skot xG, r 0,369 ->
       0,818 gegn raunmorkum) og BERA ThVI EKKI flaggid — nakvaemlega thad
       sem `team-stats.mjs` kafli 10 krefst. Athugasemd sem lysir horfnu
       astandi er ekki meinlaus: hun var ROKSTUDNINGURINN fyrir thvi ad
       vélbunadurinn se hafdur inni, og hun benti a ranga astaedu.

       VELBUNADURINN STENDUR SAMT OG ThAD ER ASETT: reglan er almenn og
       naesti dalkur sem er ThEKKT ofullkominn (t.d. FPL-summa sem
       einhver setur aftur inn) faer hana sjalfkrafa i stad thess ad
       thurfa nyja utfaerslu. Vardur: `team-stats.mjs` kafli 10 fellur ef
       dalkur med `src: "FPL"` er baett vid AN flaggsins.               */
    if (d.incomplete) return null;
    const e = ext[d.key];
    if (e == null || typeof v !== "number" || e.max === e.min) return null;
    const good = d.hi === false ? e.min : e.max;
    const bad = d.hi === false ? e.max : e.min;
    if (v === good) return S.best;
    if (v === bad) return S.worst;
    return null;
  };

  const fmt = (d, v) => {
    if (v == null) return "—";
    if (d.pct) return `${(v * 100).toFixed(d.dec >= 3 ? 1 : 0)}%`;
    return v.toFixed(d.dec ?? 2);
  };

  /* HEIMILDA-TEXTARNIR — LESNIR UR SKRANUM, ALDREI HARDKODADIR.
     Skyringar-blokkin sem sat undir toflunni bar thessar setningar sem
     FASTAN TEXTA ("380 matches", "817 shots carried no zone text") og EIN
     theirra var ordin ROng: hun sagdi xG og xGC koma ur FPL-summu sem
     vaeri "roughly 19% short". Thau hafa komid ur BSD-skotakortinu fra
     8.8.2026 (per-skot xG, r 0,369 -> 0,818 gegn raunmorkum, sja
     buildTeamRows) og `luck.json` leggur nu ADEINS til RAUNMORKIN i
     mismuna-dalkana. Fost tala um lifandi gogn urelldist thogult — sama
     villa og horna-rodunin 13.8.2026 — svo tolurnar eru lesnar ur
     skranum sem bera thaer.

     HEILDAR-LEIKJAFJOLDI E0 ER EKKI REIKNANLEGUR HER OG ER THVI EKKI
     SAGDUR: `team_form.json` ber engan heildarfjolda, og summa leikja per
     lidi deilt med tveimur telur adeins leiki milli lida sem BADI eru enn
     i deildinni — follnu lidin thrju vantar, svo talan yrdi 323 en ekki
     380. Leikir PER LID standa i skranni og eru sagdir i stadinn.      */
  const srcText = useMemo(() => {
    const perClub = Math.max(0, ...(teamForm?.teams || []).map(t => Number(t.matches) || 0));
    const bsdM = Number(bsdTeams?.matches) || 0;
    const espnM = Number(teamShots?.matches) || 0;
    const noZone = Number(teamShots?.no_zone) || 0;
    return {
      E0: "football-data E0" + (teamForm?.season ? ` ${teamForm.season}` : "")
        + (perClub ? `, ${perClub} matches per club` : ""),
      BSD: "BSD shot map, expected goals counted per shot"
        + (bsdM ? `, ${bsdM} matches` : "")
        + (bsdTeams?.season ? ` (${bsdTeams.season} only)` : ""),
      ESPN: "ESPN commentary" + (espnM ? `, ${espnM} matches` : "")
        + (noZone ? ` (${noZone} shots carried no zone text and are counted in the totals only)` : ""),
    };
  }, [teamForm, bsdTeams, teamShots]);

  /* ============================================================
     HVADA TIMABIL SKOTAKORTID BER — LEITT, EKKI HARDKODAD (21.8.2026)

     Her stodu TVEIR hardkodadir strengir "2025/26" i skotakorts-
     hausnum, og their eru sami flokkur og horna-sviðin i SetPieces
     13.8.2026: FOST TALA UM LIFANDI GOGN UREDLIST ThOGULT. Skrain sem
     berst er `bsd_shots.json` og hun ER lyklud a timabil — thegar hun
     verdur endurnyjud fyrir 2026/27 hefdi kortid haldid afram ad segja
     "2025/26" ofan a nyjum skotum, og thad er verri villa en tom tala.

     `shotIndex` (App.jsx) FLYTUR EKKI `season`-svidid, svo talan er ekki
     laesileg her — og ad lesa hana ur ANNARRI skra (`bsd_teams.json`)
     vaeri agiskun i buningi maelingar, nakvaemlega thad sem `routeInStep`
     hafnar. ThAD SEM ER MAELT er hins vegar til: `use.shots` er satt
     ADEINS thegar skotakortid telur sama leikjafjolda per lid OG sama
     mork-per-leik sem arstidar-heimildin sem taflan hvilir a. ThA — og
     adeins tha — er timabil kortsins ThAD SAMA sem `teamForm.season`, og
     thad er ekki agiskun heldur utkoma taktprofsins.
     Se kortid EKKI i takt er EKKERT timabil nefnt. Thogn er retta svarid
     thegar svarid er okunnugt (sama regla og "engin gogn" er ekki 0).

     > OG SVARID VAR EKKI OKUNNUGT — LEIDRETT 24.8.2026. Setningin her ad
     > ofan ("`shotIndex` FLYTUR EKKI `season`-svidid") var RETT lysing a
     > visinum og RONG astaeda til ad thegja: `bsd_shots.json` BER
     > `season` og visirinn flytur hana nu (App.jsx). Thogn var thvi ekki
     > "svarid er okunnugt" heldur "vid slepptum ad spyrja".
     > ThAD SKIPTI MALI I LIFANDI SYN: `use.shots` er alltaf false thar
     > (`shotIndex` er sendur sem `null` inn i `teamRangeUse`), en
     > skotakorts-blokkin sjalf les HRAA propid — svo 2025/26-skot voru
     > teiknud undir 2026/27-haus MED ENGU timabili nefndu. Nakvaemlega
     > sama aett og hardkodadi "2025/26"-strengurinn sem thessi kafli var
     > skrifadur gegn, bara med thogn i stad rangrar tolu.
     > REGLAN NU: se kortid i takt vid tofluna er timabil TOFLUNNAR nefnt
     > (obreytt); annars er timabil KORTSINS nefnt ur skranni sjalfri, og
     > se thad annad en taflan syni er thad sagt BERUM ORDUM. Vanti
     > svidid (eldri skra i cache) er thagad eins og adur.               */
  const shotSeason = use.shots ? (teamForm?.season || null)
                               : (shotIndex?.season || null);
  /* ER KORTID UR ODRU TIMABILI EN TAFLAN SYNIR? Adeins fullyrt thegar
     BADAR tolur eru til — annars er thogn afram retta svarid.          */
  const shotSeasonOff = !use.shots && !!shotIndex?.season
    && !!(liveOn ? liveLabel : teamForm?.season)
    && shotIndex.season !== (liveOn ? liveLabel : teamForm?.season);

  /* BSD-DALKARNIR OG TIMABILID — `season_locked` GERIR NU EITTHVAD.
     Beri `bsd_teams.json` annad timabil en taflan synir eru dalkarnir
     TOMIR (sja `bsdSeasonInStep` i teamstats.js), og TOM DALKARODIN VERDUR
     AD SEGJA HVERS VEGNA — annars les hun eins og "engar storar faerir"
     i stad "gognin eru ur odru timabili" (CLAUDE.md 8).                 */
  const bsdSeason = useMemo(() => bsdSeasonInStep(teamForm, bsdTeams), [teamForm, bsdTeams]);
  /* ER RODIN RAUNVERULEGA TOM A SKJANUM? Leitt ur `season_locked`, aldrei
     upptalið: nyr eins-timabils-dalkur telst med sjalfkrafa.            */
  const lockedBlank = useMemo(
    () => TEAM_STAT_DEFS.filter(d => d.season_locked)
            .every(d => rows.every(r => d.get(r) == null)),
    [rows]);

  /* HVADAN BILS-TALAN KEMUR — SOGT BERUM ORDUM. `src` a dalkinum er
     ARSTIDAR-heimildin (E0 fyrir mork og hrein blod) og hun er ekki su sem
     bilid les, svo tooltip sem naefndi adeins hana vaeri rangt um toluna sem
     stendur i holfinu. Textinn er LEIDDUR ur `TEAM_RANGE_SRC` og `use`, svo
     hann getur ekki sagt "fixtures" thegar skotakortid var notad.        */
  const rangeSrcText = key => {
    const need = TEAM_RANGE_SRC[key];
    const res = use.results === "fixtures"
      ? "the finished fixtures in data/fixtures.json"
      : "the BSD shot map — its goals, goals conceded and clean sheets reproduce the "
        + "E0 season totals exactly for all 17 clubs that have one";
    if (need === "shots") return "the BSD shot map (one row per shot, with the gameweek)";
    if (need === "results") return res;
    return `${res}, together with the BSD shot map`;
  };

  /* HVER DALKUR BER SINA EIGIN SKYRINGU (16.8.2026, ad beidni notandans).
     Skyringar-blokkin undir toflunni sagdi fyrir ALLA dalka thad sem atti
     vid um EINN ("for everything a team concedes, lower is better — except
     long shots faced"). Attin er nu LESIN UR `d.hi`, svo nyr dalkur erfir
     retta setningu i stad thess ad vera undanskilinn i texta sem enginn
     man eftir ad uppfaera — sama regla og `spRanges` i SetPieces.jsx.   */
  const titleFor = d => {
    const up = d.hi !== false;
    const dir = up ? "Higher is better." : "Lower is better.";
    /* MERKINGIN ER BUNDIN VID `cellStyle` — SAMA SKILYRDI, svo skyringin
       getur ekki lofad lit sem taflan setur ekki: dalkur med faerri en
       thremur tolum faer engan (`ext` sleppir honum) og ofullkominn dalkur
       faer enga fullyrdingu.                                            */
    const marked = !d.incomplete && ext[d.key] != null;
    const mark = marked
      ? (up ? " The highest value in the column is marked best (green), the lowest worst (red)."
            : " The lowest value in the column is marked best (green), the highest worst (red).")
      : "";
    const inc = d.incomplete
      ? "\n\nKnown to be incomplete — the amber header says so: compare it between teams, "
        + "do not read it as an absolute, and it carries no best/worst marking for that reason."
      : "";
    /* SKYRINGIN SEGIR ThAD SAMA SEM MERKID — SAMA SKILYRDI, EITT FALL.
       Tooltip sem thegdi um thetta vaeri sami galli i minni umbud: talan i
       hólfinu er timabils-tala inni i sidudu utsyni.                     */
    const rng = !gwRange ? ""
      : blind[d.key]
        ? `\n\nThis column does not follow the gameweek range — the number shown is the `
          + `whole-season value, and the "${RANGE_BLIND_BADGE}" mark in the header says so. `
          + `Its source has no per-gameweek breakdown for this table's season.`
        : `\n\nFollows the gameweek range: the value shown covers GW ${gwRange[0]}–${gwRange[1]} `
          + `only, counted from ${rangeSrcText(d.key)}.`;
    /* EITT SKILYRDI, TVEIR STADIR — SAMA REGLA OG `rng` HER FYRIR OFAN.
       Varnadar-malsgreinin ofan vid tofluna og thetta tooltip lesa BADIR
       `bsdSeason.ok && lockedBlank`, svo their geta ekki sagt sitthvad um
       sama holf.                                                        */
    const lockd = d.season_locked && !bsdSeason.ok && lockedBlank
      ? `\n\nEmpty in this view on purpose: its source covers ${bsdSeason.bsdLabel} `
        + `and this table is showing ${bsdSeason.tableLabel}. A number from the wrong `
        + `season is worse than no number.`
      : "";
    return `${d.label}\n\n${d.note}\n\n${dir}${mark}\n\nSource: ${srcText[d.src] || d.src}${inc}${lockd}${rng}`;
  };

  const head = (key, label, title, right = true) => (
    <th key={key} title={title}
      style={{ ...S.th, ...(right ? S.thRight : S.thName),
               ...(TEAM_STAT_BY_KEY[key]?.incomplete ? S.thIncomplete : null),
               ...(sort.key === key ? S.thOn : null) }}
      onClick={() => setSort(s => s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: TEAM_STAT_DEFS.find(d => d.key === key)?.hi === false ? "asc" : "desc" })}>
      {label}{sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
      {/* MERKID — ADEINS thegar bil er valid. "season" a dalki i heilu
          timabili vaeri merkimidi an merkingar; thad sem tharf ad segja er
          "ThESSI hreyfdist ekki thott thu sidir".                       */}
      {gwRange && TEAM_STAT_BY_KEY[key] && blind[key]
        ? <span style={S.badge}>{RANGE_BLIND_BADGE}</span> : null}
    </th>
  );

  const missing = !teamForm && !luck && !teamShots && !bsdTeams;
  /* MALSGREININ UM NYLIDANA VAR FJARLAEGD 16.8.2026 ad beidni notandans
     ("Taktu thetta ut"), og `promoted`-listinn sem faeddi hana for med
     henni — hann atti engan annan lesanda.
     HEGDUNIN STENDUR OBREYTT: COV/HUL/IPS eiga enga rod i ensku
     urvalsdeildinni i fyrra og hver einasta tala theirra er thvi NULL sem
     birtist sem "—", aldrei 0 (CLAUDE.md kafla 8). Vordur: team-stats.mjs
     kafli 4.                                                            */

  return (
    <section style={S.card}>
      <div style={S.headRow}>
        <div>
          <h2 style={S.h2}>{"Teams"}</h2>
          {/* BILID STENDUR I HAUSNUM, EKKI ADEINS I VALARANUM. Notandi sem
              skrunar nidur i tofluna og kemur til baka a ekki ad thurfa ad
              giska a hvad hann er ad lesa (sama regla og hausrodin i
              leikmannalistanum ber bilid).                                */}
          <div style={S.sub}>
            {teamForm?.season ? `${teamForm.season} · ` : ""}
            {rows.length} {"teams · "}
            {gwRange ? `GW ${gwRange[0]}–${gwRange[1]}` : "full season"}
          </div>
        </div>
      </div>

      {/* TVEIR SKYRINGAR-MALSGREINAR VORU FJARLAEGDIR 11.8.2026 ad beidni
          notandans ("Taktu thetta ut"): almenn kynning a thvi hvad taflan
          er, og BSD-skyringin a stora-faerum. VARNADAR-textinn her ad nedan
          stendur AFRAM — hann er ekki skyring heldur VARUD um dalk sem er
          ekki fylltur, og an hans les tomur dalkur eins og "engar stórar
          faerir" i stad "engin gogn" (CLAUDE.md kafla 8).                */}
      {/* TIMABILS-MISVISIRINN — SAGDUR, EKKI ThAGADUR UM.
          `season_locked` blankar BSD-dalkana thegar `bsd_teams.json` ber
          annad timabil en taflan (sja teamstats.js). Tom dalkarod an
          skyringar les eins og "engar storar faerir" og thad er onnur
          fullyrding en "gognin eru ur odru ari" — nakvaemlega sami galli
          sem slokkti umferdar-valarinn thagdi um 20.8.2026.
          SKILYRDID ER LEITT AF ThVI SEM ER A SKJANUM (`lockedBlank`), ekki
          af flagginu einu: se skotakortid I TAKT fyllir `applyTeamRange`
          dalkana aftur og THA vaeri varnadur um tomt eintak ROng
          fullyrding um tolu sem stendur i holfinu.                       */}
      {bsdTeams && !bsdSeason.ok && lockedBlank ? (
        <p style={S.warn}>
          <b>{"The expected-goals columns are empty here on purpose."}</b>
          {" The BSD shot data in this repo covers "}<b>{bsdSeason.bsdLabel}</b>
          {", but this table is showing "}<b>{bsdSeason.tableLabel}</b>
          {". xG, xGC, both big-chance columns and the two difference columns are "}
          {"blank rather than carrying last season's numbers under this season's heading — "}
          {"a number from the wrong season is worse than no number. Re-run "}
          <code style={S.code}>{"BSD_KEY=… node scripts/fetch-bsd-teams.mjs"}</code>
          {" and the shot-map fetch to fill them."}
        </p>
      ) : null}

      {bsdTeams ? null : (
        <p style={S.warn}>
          <b>{"Big chances faced is not filled in yet."}</b>{" The zones in this table come from "}
          {"ESPN, which gives the position of every shot but no expected-goals value for it, so "}
          {"nothing here can separate a good chance from a hopeful one. "}
          <b>{"Close-range faced"}</b>{" is the measured stand-in and carries its own name. "}
          {"The real column is one fetch away — "}<code style={S.code}>{"BSD_KEY=… node scripts/fetch-bsd-teams.mjs"}</code>
          {" writes it from the BSD shot map, which does carry per-shot expected goals."}
        </p>
      )}

      {missing ? (
        <p style={S.note}>{"Team data has not loaded."}</p>
      ) : (
        <>
          {/* UMFERDAR-BIL. Hvad hreyfist er LEITT UT (`blind`), aldrei
              upptalid i texta sem stadnar.                              */}
          {/* TIMABILS-VALID — FELLILISTI FRA 25.8.2026 (ad beidni notandans).
              Adur voru thetta tveir hnappar. Merkimidarnir eru OBREYTTIR og
              thad er adalatridid: "10 matches" a lifandi valkostinum er ekki
              skraut heldur urtaksstaerdin sjalf, og hun a ad sjast ADUR en
              talan er lesin, ekki eftir a.

              ThRENNT SEM MATTI EKKI TAPAST I SKIPTUNUM:
              1. `setGwRange(null)` FYLGIR HVERRI BREYTINGU. An thess situr
                 bil sem var valid i einu timabili ofan a hinu — GW30-38 i
                 syn sem hefur spilad eina umferd — og dalkarnir yrdu tomir
                 an thess ad nokkud saegdi hvers vegna.
              2. `value` KEMUR UR `liveOn`, EKKI UR `season`. Se ekkert
                 spilad fellur synin i fyrra timabil (`liveForm` er null),
                 og tha ma valarinn ekki standa a "this season" ofan a
                 fyrra-timabils tolum — sama regla og red upplysta hnappnum.
              3. `value` OG `onChange` FYLGJAST AD. Annad an hins gefur
                 React-vidvorun um ostyrdan reit (`react-warnings.mjs`).

              TOOLTIP-IN TVO LIFA A VALARANUM SJALFUM, EKKI A VALKOSTUNUM:
              `title` a `<option>` er ekki birt i ollum vofrum, svo thad
              vaeri texti sem er til i DOM en hvergi a skjanum.          */}
          <div style={S.gwBar}>
            <span style={S.gwToggle}>{"Season"}</span>
            <select style={S.seasonSel}
              value={liveOn ? "live" : "prev"}
              onChange={e => { setSeason(e.target.value); setGwRange(null); }}
              aria-label={"Season"}
              title={`${teamForm?.season || "Last season"}: last season in full — `
                   + `38 matches per club, and the only season with shot-map data `
                   + `(xG, xGC, shots on target, big chances).`
                   + `\n\n${liveLabel}: `
                   + (liveForm
                       ? `this season so far, built from finished fixtures: `
                         + `${liveForm.matches_counted} matches played. Results only — `
                         + `goals, goals conceded and clean sheets. Shots and xG come `
                         + `from the shot map, which covers `
                         + `${bsdTeams?.season || "last season"} only, so those columns `
                         + `are empty here.`
                       : `this season has no finished match yet.`)}>
              <option value="prev">{teamForm?.season || "last season"}</option>
              {/* SLOKKTUR VALKOSTUR, EKKI HORFINN — "ekkert spilad enn" er
                  upplysing og hun hverfur ef valkosturinn hverfur.       */}
              <option value="live" disabled={!liveForm}>
                {liveLabel}
                {liveForm ? ` · ${liveForm.matches_counted} matches` : " · no matches yet"}
              </option>
            </select>
          </div>
          {liveOn && (
            /* HVAD ER TOMT OG HVERS VEGNA — SAGT EINU SINNI, EKKI EITT
               SPURNINGARMERKI PER DALK. Thogull tomur dalkur var kaeran
               sem `season_locked`-vélin var smidud fyrir.               */
            <p style={S.note}>
              {`This season so far: ${liveForm.matches_counted} matches played. `
               + `Goals, goals conceded and clean sheets are real; shots, xG, xGC `
               + `and set-piece columns are empty because those come from sources `
               + `that only cover ${bsdTeams?.season || "last season"}.`}
            </p>
          )}
          <div style={S.gwBar}>
            {/* ALLTAF SYNILEGT, EKKI FALID BAK VID TAKKA (11.8.2026 ad
                beidni). Samanbrotið sparadi 44 px (maelt 8.8.) en kostadi
                thad ad valarinn var osynilegur thangad til smellt var —
                og hann er adalstyringin i thessum flipa. Plássið er
                odyrara en styring sem sest ekki.                        */}
            <span style={S.gwToggle}>{"Gameweeks"}</span>
            {gwRange && (
              <>
                <span style={S.gwNow}>GW {gwRange[0]}–{gwRange[1]}</span>
                <button style={S.gwClear} onClick={() => setGwRange(null)}>{"whole season"}</button>
              </>
            )}
            {/* SLOKKT STYRING VERDUR AD SEGJA HVERS VEGNA. Valari sem
                bregst ekki vid smelli, an skyringar, er sama aett og dalkur
                sem hreyfist ekki an skyringar — og bædi voru a skjanum i
                einu (11.8.-utgafan var tengd fixtures.json, sem hefur 0
                lokna leiki i forleik).                                   */}
            {!gwOn && (
              <span style={S.gwWarn}>
                {"not available for this table — "}{use.why || "no per-gameweek source"}
              </span>
            )}
            {gwOn && gwRange && (
              <span style={S.gwWarn}>
                {following} {"of"} {defs.length} {"columns in this group follow the range"}
                {following < defs.length
                  ? ` — the rest are marked "${RANGE_BLIND_BADGE}" and show the whole season`
                  : ""}
              </span>
            )}
          </div>
          {maxGw > 0 && (
            <div style={S.gwBoxes} role="group" aria-label={"Select gameweeks"}>
              {Array.from({ length: maxGw }, (_, i) => i + 1).map(n => {
                const on = gwRange && n >= gwRange[0] && n <= gwRange[1];
                const edge = gwRange && (n === gwRange[0] || n === gwRange[1]);
                return (
                  <button key={n} title={gwOn ? `GW ${n}` : `GW ${n} — ${use.why}`}
                    aria-pressed={!!on} disabled={!gwOn}
                    style={{ ...S.gwBox, ...(on ? S.gwBoxOn : {}),
                             ...(edge ? S.gwBoxEdge : {}),
                             ...(gwOn ? {} : S.gwBoxOff) }}
                    onClick={() => setGwRange(r => nextRange(r, n))}>{n}</button>
                );
              })}
            </div>
          )}

          <div style={S.groupRow}>
            {TEAM_GROUPS.map(g => (
              <button key={g.key} type="button"
                style={{ ...S.groupBtn, ...(group === g.key ? S.groupOn : null) }}
                onClick={() => setGroup(g.key)}>{g.label}</button>
            ))}
          </div>

          <div style={S.scroll}>
            <table style={S.table}>
              <thead>
                <tr>
                  {head("__name", "Team", "Sort by team", false)}
                  {defs.map(d => head(d.key, d.short, titleFor(d)))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.id}>
                    <td style={{ ...S.tdName, ...(shotIndex ? { cursor: "pointer" } : null),
                                 ...(pick === r.short ? { boxShadow: "inset 3px 0 0 #7b2d8e" } : null) }}
                        onClick={shotIndex ? () => setPick(pick === r.short ? null : r.short) : undefined}
                        title={shotIndex ? "Show this team's shot maps" : undefined}>
                      {Crest ? <Crest team={r} size={14} /> : null}
                      <span style={S.short}>{r.short}</span>
                      <span style={S.name}>{r.name || ""}</span>
                      {/* AFTAN VID NAFNID, ALDREI FRAMAN VID SKAMMSTOFUNINA
                          — sja rokstudninginn vid `form` her ad ofan.    */}
                      {form.flags.get(r.id)
                        ? <FormMark kind={form.flags.get(r.id)}
                                    title={formTitle(form.flags.get(r.id))} />
                        : null}
                    </td>
                    {defs.map(d => {
                      const v = d.get(r);
                      return (
                        <td key={d.key} style={{ ...S.td, ...(cellStyle(d, v) || {}) }}>
                          {fmt(d, v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SKOTAKORT LIDSINS — BADAR HLIDAR.
              Taflan segir HVE MORG skot lidid faer; kortid segir HVADAN.
              "A sig"-kortid er thad sem raedur markvardar-/varnarvali og er
              thvi fyrst: 12 langskot og 9 teigsskot eru sami dalkur i
              toflunni en gerolikt mal a vellinum — nakvaemlega thad sem
              skyringin efst i thessum flipa heldur fram.                */}
          {shotIndex && pick && (() => {
            const ti = shotIndex.teams.indexOf(pick);
            if (ti < 0) return null;
            const against = shotIndex.byOpp.get(ti) || [];
            const forr = shotIndex.byTeam.get(ti) || [];
            if (!against.length && !forr.length) return null;
            const row = sorted.find(r => r.short === pick);
            return (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e6e6ea" }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  {row?.name || pick}{" — shot maps "}
                  <span style={{ fontWeight: 400, opacity: 0.65, fontSize: 12 }}>
                    {shotSeason ? `${shotSeason} · ` : ""}{"bubble size = xG · goal at top"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6a6a72", marginBottom: 10 }}>
                  {"Faced is the keeper-and-defence question; taken is the attack. "}
                  {shotSeason
                    ? `The shot map covers ${shotSeason} only, so a side that was not in the league then has none — and none means no data.`
                    : "The shot map covers a single season, so a side that was not in the league then has none — and none means no data."}
                </div>
                {/* TIMABILS-OSAMRAEMID ER SAGT, EKKI THAGAD. Skotakortid er
                    eina rodin a thessum flipa sem getur borid ANNAD timabil
                    en taflan; an thessarar linu las hun eins og hun aetti
                    vid tolurnar fyrir ofan. Sama regla og `lockedBlank`.  */}
                {shotSeasonOff && (
                  <div style={{ fontSize: 12, color: "#8a5f00", background: "#fff6e0",
                                border: "1px solid #f0d68a", borderRadius: 6,
                                padding: "6px 9px", marginBottom: 10 }}>
                    {`These maps are ${shotIndex.season} — the table above is `}
                    {liveOn ? liveLabel : teamForm?.season}
                    {". They are not the same season, so read them side by side, not as one number."}
                  </div>
                )}
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{"Shots faced"}</div>
                    <ShotMap shots={against} calib={shotIndex.calib} width={300} label={`${pick} faced`} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{"Shots taken"}</div>
                    <ShotMap shots={forr} calib={shotIndex.calib} width={300} label={`${pick} taken`} />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SKYRINGAR-BLOKKIN OG HEIMILDA-RODIN VORU FJARLAEGDAR 16.8.2026
              ad beidni notandans; efni theirra fluttist i `titleFor` og
              birtist nu vid ad benda a HAUS hvers dalks. Rokin fyrir thvi
              ad flytja fremur en ad afrita: blokkin sagdi eitt fyrir alla
              dalka og ein setning hennar var ordin ROng (xG/xGC ur FPL,
              "~19% short") longu adur en nokkur tok eftir.

              LITA-LYKILLINN STENDUR EFTIR — og hann er ekki texti heldur
              LYKILL. An hans er graent og raut holf i toflunni tvo litud
              holf an nafns, og "hverfdu yfir dalkinn til ad komast ad thvi
              hvad liturinn thydir" er ekki lykill heldur thraut. Hann ber
              engan skyringar-texta lengur: attin (haerra/laegra er betra)
              er ekki hin sama i ollum dalkum og a thvi heima i dalkinum
              sjalfum, ekki i einni setningu undir toflunni.             */}
          <div style={S.legend}>
            <span style={{ ...S.chip, ...S.best }}>{"best"}</span>
            <span style={{ ...S.chip, ...S.worst }}>{"worst"}</span>
            {/* TACKNID FAER NAFN A SKJANUM. Litad holf an nafns er thraut en
                ekki lykill (sama rok og best/worst-flisarnar standa fyrir),
                og thad gildir enn frekar um tacn sem er ekki texti. Lykillinn
                birtist ADEINS thegar merkin eru raunverulega a skjanum —
                annars vaeri hann lykill ad engu.                         */}
            {form.window && form.flags.size > 0 && (
              <>
                <span style={S.legendItem}>
                  <FormMark kind="hot" title={formTitle("hot")} />
                  <span style={S.legendTxt}>{"hot form"}</span>
                </span>
                <span style={S.legendItem}>
                  <FormMark kind="cold" title={formTitle("cold")} />
                  <span style={S.legendTxt}>{"poor form"}</span>
                </span>
                <span style={S.legendTxt}>
                  {`GW ${form.window[0]}–${form.window[1]} against each side's own `}
                  {`GW ${form.baseRange[0]}–${form.baseRange[1]} average · top and `}
                  {"bottom sixth · descriptive only, it changes no number here"}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* ============================================================
   FORM-TACKNIN — TVAER OLIKAR SILHUETTUR, EKKI TVO SKREYTT TACKN

   CLAUDE.md kafli 8: "i smarri staerd er SILHUETTAN allt — tvo ikon sem eru
   badi hringur med smaatridum verda EINS vid 13 px." Thess vegna er hvort
   a sinni grunnform-samsetningu: eldurinn er EITT FYLLT FLATARMAL (dropi
   med oddi upp) og isinn er ThRIR ThUNNIR GEISLAR sem skerast. Fyllt a moti
   linum les i sundur adur en nokkurt smaatridi gerir thad.

   ENGINN TEXTI, ENGIN EMOJI: `<svg>` ber engan `textContent`, svo radirnar
   i toflunni haldast laesilegar fyrir prof sem finna thaer eftir texta.

   `aria-hidden` a myndinni og `title` a hylkinu: skjalesari a ad fa
   SETNINGUNA, ekki "path".                                              */
function FormMark({ kind, title }) {
  return (
    <span style={S.formMark} title={title} role="img"
          aria-label={kind === "hot" ? "hot form" : "poor form"}>
      {kind === "hot" ? (
        <svg width="9" height="11" viewBox="0 0 9 11" aria-hidden="true" focusable="false">
          <path fill="#e0562a"
            d="M4.6 0 C4.9 2.1 6.1 2.9 7 4.1 C7.7 5 8.1 6 8.1 7.1 C8.1 9.3 6.5 11 4.5 11
               C2.5 11 0.9 9.3 0.9 7.1 C0.9 5.6 1.7 4.6 2.6 3.3 C2.8 4.3 3.2 4.8 3.7 5.2
               C4.3 3.9 4.7 2 4.6 0 Z" />
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true" focusable="false">
          <g stroke="#2f7bd0" strokeWidth="1.2" strokeLinecap="round">
            <path d="M5.5 0.7 L5.5 10.3" />
            <path d="M1.4 3.1 L9.6 7.9" />
            <path d="M9.6 3.1 L1.4 7.9" />
          </g>
        </svg>
      )}
    </span>
  );
}

const S = {
  /* UMFERDAR-VALARINN — STILARNIR VORU ALDREI TIL (lagad 11.8.2026).
     `S.gwBar`, `S.gwBox`, `S.gwBoxOn` og fjorir adrir voru NOTADIR i
     markup-inu en HVERGI SKILGREINDIR, svo `{...undefined}` breiddist ut i
     ekkert og allir 38 kassarnir teiknudust sem berur texti: "123456789..."
     i einni bendu, an ramma og an lits a valdi bili. Notandinn sa thetta
     strax og sagdi "eg vill ad valdar umferdir litist eins og i hinum
     gluggum".

     ESBUILD OG PROFIN SAGU THETTA ALDREI: `S.gwBox` er gild uppfletting sem
     skilar `undefined`, og `{...undefined}` er logleg JS. Thetta er sami
     flokkur og hvitur skjar sem esbuild samthykkir (CLAUDE.md kafla 2) —
     og hann fannst med thvi ad HORFA A SKJAINN, ekki med thvi ad lesa koda.

     Litirnir eru TEKNIR UR PlayerList.jsx svo baedi vidmotin lesist eins:
     valid bil er ljosfjolublatt (#e8e2ee / #cdbcd8), endarnir fylltir
     fjolubláir. Vordur: tests/team-gw.mjs.                              */
  gwBar:{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
          padding:"7px 0 2px" },
  gwToggle:{ border:"none", background:"none", padding:0, cursor:"pointer",
             font:"inherit", fontSize:11.5, fontWeight:700, color:C.text2,
             display:"inline-flex", alignItems:"center", gap:4 },
  gwNow:{ fontFamily:mono, fontSize:11, color:C.purple, fontWeight:700 },
  gwClear:{ border:`1px solid ${C.border}`, background:"#fff", color:C.text2,
            borderRadius:5, padding:"2px 7px", fontSize:11, cursor:"pointer" },
  gwWarn:{ fontSize:10.5, color:C.text3 },
  gwBoxes:{ display:"flex", gap:1, flexWrap:"nowrap", overflowX:"auto",
            padding:"2px 0 6px" },
  gwBox:{ flex:"1 1 0", minWidth:19, height:18, border:`1px solid ${C.border}`,
          background:"#fafafb", color:C.text3, borderRadius:2, cursor:"pointer",
          fontSize:9, padding:0, lineHeight:"16px", fontFamily:mono },
  gwBoxOn:{ background:"#e8e2ee", color:C.purple, border:"1px solid #cdbcd8" },
  gwBoxEdge:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}`,
              fontWeight:700 },
  /* SLOKKT: SYNILEGT en ekki smellanlegt. Ad fela valarann vaeri ad taka
     eiginleikann af skjanum an thess ad segja af hverju — sem er einmitt
     thad sem var kaert.                                                 */
  gwBoxOff:{ cursor:"default", opacity:0.45 },
  /* MERKID Í HAUSNUM. `verticalAlign` og lítil stærð svo thad situr med
     heitinu og skruni ekki undir naesta dalk; ENGIN blondun a styttingu og
     langritun i ramma/hornum (CLAUDE.md 8 — thad gaf 14 React-vidvaranir i
     FFDR-toflunni).                                                      */
  badge:{ marginLeft:3, padding:"0 3px", borderRadius:3, background:"#eceaf1",
          color:C.text3, fontSize:8.5, fontWeight:700, letterSpacing:0.2,
          verticalAlign:"middle", textTransform:"none" },

  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 12 },
  headRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  h2: { margin: 0, fontSize: 16, fontWeight: 700, color: C.text },
  sub: { fontSize: 11.5, color: C.text3, marginTop: 2 },
  note: { fontSize: 11.5, color: C.text2, background: C.cardAlt, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "8px 10px", margin: "10px 0 0", lineHeight: 1.45 },
  warn: { fontSize: 11.5, color: "#7a5600", background: C.amberBg, border: "1px solid #f0dcae",
    borderRadius: 8, padding: "8px 10px", margin: "8px 0 0", lineHeight: 1.45 },
  groupRow: { display: "flex", gap: 4, flexWrap: "wrap", margin: "12px 0 8px" },
  groupBtn: { border: "none", background: "transparent", color: C.text2, borderRadius: 5,
    padding: "4px 9px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  groupOn: { background: "#f1e9f2", color: C.purple },
  scroll: { overflowX: "auto" },
  table: { borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: 11.5 },
  th: { position: "sticky", top: 0, background: C.cardAlt, fontSize: 10.5, fontWeight: 700,
    color: C.text2, padding: "5px 7px", cursor: "pointer", userSelect: "none",
    whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}`, textAlign: "left" },
  thRight: { textAlign: "right" },
  thOn: { color: C.purple },
  /* OFULLKOMIN TALA VERDUR AD SJAST SEM SLIK A SKJANUM, ekki adeins i
     tooltip-i: tala sem er ROng i ThEKKTRI att ma ekki lita eins ut og
     tala sem er rett. Litur en EKKI nytt tákn — †-merkid var tekid ut
     samdaegurs ad beidni notandans, svo ad baeta vid odru tákni vaeri ad
     ganga til baka i sama vanda.
     DAEMID SEM STOD HER (xG/xGC "~19% of lag" ur FPL-summu) VAR URELT OG
     ER FARID — thau koma ur BSD-skotakortinu fra 8.8.2026 og bera ekki
     flaggid. Enginn dalkur ber thad i dag; stillingin bidur thess naesta
     sem gerir thad. Sja `cellStyle`.                                    */
  thIncomplete: { color: "#8a6100" },
  /* LIDID VERDUR AD HALDAST A SKJANUM. Taflan ber 22 dalka og skrunar
     larett innan sins kassa; an frysts fyrsta dalks veit madur ekki hvada
     rod hann er ad lesa thegar hann er kominn ut i "langskot a sig" —
     og thad er einmitt dalkurinn sem madur skrunar ad.

     BAKGRUNNURINN ER SKILYRDI, EKKI SKRAUT: `background:"inherit"` a
     frystu holfi erfir GAGNSAETT fra rod sem hefur engan eigin lit, og
     tha skruna tolurnar SYNILEGA UNDIR lidsheitinu. Su villa var maeld i
     leikmannalistanum 8.8.2026 ("6*Gabriel +GBP1.3") — hún er ekki
     endurtekin hér: liturinn er GEFINN BEINT.                            */
  thName: { position: "sticky", left: 0, zIndex: 2, background: C.cardAlt },
  tdName: { position: "sticky", left: 0, zIndex: 1, background: C.card,
    display: "flex", alignItems: "center", gap: 5, padding: "4px 7px",
    borderBottom: "1px solid #f4f4f6", whiteSpace: "nowrap",
    borderRight: `1px solid ${C.border}` },
  short: { fontFamily: mono, fontWeight: 700, fontSize: 11.5, color: C.text },
  name: { fontSize: 11, color: C.text3 },
  td: { textAlign: "right", fontFamily: mono, padding: "4px 7px", color: C.text2,
    borderBottom: "1px solid #f4f4f6", whiteSpace: "nowrap" },
  best: { background: C.greenBg, color: "#0a5c3e", fontWeight: 700 },
  worst: { background: "#fdecee", color: "#8f2230", fontWeight: 700 },
  legend: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 10 },
  chip: { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 6px" },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 3 },
  legendTxt: { fontSize: 10, color: C.text3 },
  /* TACKNID SITUR A GRUNNLINU NAFNSINS OG TEKUR ENGA BREIDD FRA ThVI:
     `flex: none` svo nafnadalkurinn (frystur, fost breidd) tognist ekki
     um leid og lid faer merki og hoppi til baka thegar thad missir thad. */
  formMark: { display: "inline-flex", alignItems: "center", flex: "none",
    lineHeight: 0, marginLeft: 1 },
  /* TIMABILS-VALARINN. Sama letur og umferdar-kassarnir (mono) svo
     tolurnar tvaer lesist eins; `fontSize` er `inherit`-laus af asettu radi
     — vafra-sjalfgildid a `<select>` er staerra en flipinn ber.          */
  seasonSel: { border: `1px solid ${C.border}`, background: "#fff", color: C.text,
    borderRadius: 5, padding: "2px 6px", fontSize: 11, fontFamily: mono,
    cursor: "pointer", maxWidth: 260 },
  /* `legendTxt`, `srcRow` og `src` voru fjarlaegd med textanum sem thau
     stiludu (16.8.2026). Daudur stil-hlutur er sama aett og `S.vGrp`: hann
     litur ut eins og eitthvad se enn teiknad med honum.                 */
  code: { fontFamily: mono, fontSize: 10.5, background: "#fff", padding: "1px 4px",
    borderRadius: 3, border: `1px solid ${C.border}` },
};
