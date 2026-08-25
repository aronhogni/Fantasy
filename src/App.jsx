import React, { useState, useEffect, useMemo, useCallback } from "react";
import { interp } from "./interp.js";
import Pitch from "./Pitch.jsx";
import GwReport from "./GwReport.jsx";
import { PlayerHeadline, SeasonTable, SeasonSoFar, PriceEditor,
         priceChangeOf } from "./PlayerPanel.jsx";
import SetPieces, { setPieceRanks } from "./SetPieces.jsx";
import { SetPieceIcon, CrownIcon } from "./Icons.jsx";
import Teams from "./Teams.jsx";
import Compare from "./Compare.jsx";
import Leagues from "./Leagues.jsx";
import Rotation from "./Rotation.jsx";
import { RAW } from "./dataUrl.js";
/* Toluranar i skipta-glugganum koma UR SOMU SKRA sem listinn og stigataflan
   nota (src/stats.js) — ekki afritadar formulur. Sama regla sem gildir um
   model.js: ein utfaersla, svo profin keyri thad sem appid birtir.        */
import { moScore, aoScore, startProbability, inImminentPool,
         indexImminentByTeam, matchImminent } from "./stats.js";
import PlayerList from "./PlayerList.jsx";
import ShotMap from "./ShotMap.jsx";
/* ThROSKULDURINN ER LESINN, EKKI SKRIFADUR — sja notuna vid "Big chances
   missed". `BIG_CHANCE_XG` er fittad i `bsd.js` og ma ekki afritast hingad
   sem tala (fost tala um maeldan kvarda urelidist thegjandi).           */
import { BIG_CHANCE_XG } from "./bsd.js";
import PositionMap from "./PositionMap.jsx";
import Leaderboard from "./Leaderboard.jsx";
import BestOfBest from "./BestOfBest.jsx";
/* `mono` og `sans` VORU FLUTT UT HER OG NOTUD I ENGU (25.8.2026) —
   MAELT: 0 tilvik utan innflutnings-linunnar sjalfrar. Stilarnir sem
   thurfa thau lesa thau innan `appStyles.js`.                        */
import { C, S } from "./appStyles.js";
import { storageMode, saveState, loadState } from "./storage.js";
import { AVAIL, availOf, banRisk, setPieceOf, rotationRisk,
         matchesPlayedByClub, seasonHasStarted, startedGameweeks } from "./availability.js";
/* `Kit`, `crestUrl` og `CREST_FALLBACK` VORU DAUD HER (25.8.2026).
   MAELT: 0 tilvik utan innflutningsins — eina "notkunin" var inni i
   ATHUGASEMD (linu ~1080), sem er nakvaemlega gildran i CLAUDE.md 13:
   athugasemd uppfyllir textaleit. Athugasemdin sagdi rett ad `Crest`
   noti thau, en `Crest` flytur thau inn HJA SER; thessi lina gerdi
   thad aftur til einskis. `Crest`, `PlayerImg` og `photoUrl` eru NOTUD
   (15 / 4 / 3 tilvik) og standa.                                    */
import { Crest, PlayerImg, photoUrl } from "./Crest.jsx";
import FfdrTable from "./FfdrTable.jsx";
import { buildTeamMetrics } from "./teamstats.js";
import { buildRecommendations, swapCandidates, sellTiming } from "./recommend.js";
/* VELIN ER ADFLUTT, EKKI ENDURSKRIFUD. `legalFormation` og `posKey` eru
   flutt inn af SOMU astaedu og `buildTeamMetrics` var flutt ur App.jsx i
   `teamstats.js` (CLAUDE.md kafli 7): afrit af reglunni her vaeri onnur
   utfaersla sem gaeti rekid i sundur vid tha sem velin sjalf notar. */
import { bestTeamPlan, legalFormation, posKey, XI_SIZE } from "./bestteam.js";
import { clamp, sellTenths, lookupPos, lookupMeasured,
  tierOf, TIER_BG, TIER_FG, TIER_NAME, TIER_COUNT, greenRuns,
  makeFixDifficulty, computeTransferCost, isInitialSquadPick, applyPlan, expPointsFor, priceMovePrediction,
  cleanSheetProb, rankScore, eloStale, parseEntryId, rarelyStarted, priceFloors,
  intlBreaks, euroWeeks, euroTeams, compLabel } from "./model.js";

/* ============================================================
   FPL PLÖNUN — v3
   ÖLL GÖGN ÚR OPINBERUM HEIMILDUM:
   - data/*.json úr GitHub Actions pipeline (FPL bootstrap, fixtures,
     events, defcon) — lesið frá raw.githubusercontent (CORS-opið,
     engin Netlify-function-köll, enginn credit-kostnaður)
   - Bókmakera-CS% úr data/odds.json (cron sækir daglega) — valfrjálst
   Ekkert sáð/handskrifað leikmannagagn. Verð, lið, myndir, leikir,
   FDR, deadline og spár koma öll úr API.
   ============================================================ */

/* Í BYGGINGU les appid raw.githubusercontent (main-greinina) — engin bakendi.
   Í DEV les það data/ STAÐBUNDID svo nyjar pipeline-skrar seu synilegar ADUR
   en their eru pushadar, og svo dev virki an nets. Vite thjonar rot-skrar.   */
/* Slodin er i src/dataUrl.js — leikmannalistinn tharf hana lika og
   ad flytja hana inn ur App.jsx hefdi gefid hringtilvisun. */
const PROXY_URL = "https://mellifluous-hummingbird-565c85.netlify.app/.netlify/functions/odds";
const POS_LABEL = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };   // universal, ekki islenskt
/* FPL explain-lyklar -> birt heiti (stiga-uppskipting) */
const EXPLAIN_LABEL = {
  minutes: "Minutes", goals_scored: "Goals", assists: "Assists", clean_sheets: "Clean sheets",
  goals_conceded: "Goals conceded", own_goals: "Own goals", penalties_saved: "Penalty saves",
  penalties_missed: "Penalties missed", yellow_cards: "Yellow card", red_cards: "Red card",
  saves: "Saves", bonus: "Bonus", bps:"BPS", defensive_contribution: "Defensive contribution",
};
/* HVE MARGIR I "HARDEST RUN AHEAD" (25.8.2026)
   Notandinn: "i hardest run er nog ad syna bara thra leikmenn, sem stysst
   er i erfida runnid. Eg graedi litid a ad sja hardest run i gameweek
   34-38 thegar thad er bara gameweek 1."
   RODIN VAR ThEGAR TIMAROD (`run.from`), svo fyrstu threir ERU their sem
   naest eru runnunni — engin ny rodun og engin thver-leikmanna rodun
   (sem ordalagid i kassanum er beinlinis skrifad gegn).
   ThAKID ER SAGT A SKJANUM, EKKI ThAGAD: "no silent caps" (CLAUDE.md 4) —
   listi sem er skorinn an ord les eins og "thetta eru allir".
   UI-AFMORKUN, EKKI HLUTI LIKANSINS: ekkert i FFDR, `rankScore` ne
   vaentum stigum les thessa tolu (sbr. MIN_WINDOW/MAX_WINDOWS i
   buywindow.js og verdthakid i rotation.js).                          */
const HARD_RUN_SHOW = 3;

const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };

/* ---- MÆLD KVÖRÐUN Á LEIKJAÞYNGD ----
   1.102 leikir yfir 3 tímabil, FDR borið við LOKALÍNUR markaðarins.
   Niðurstaða: FDR er RÉTT KVARÐAÐ að meðaltali — nánast eins og markaðurinn
   (FDR2: 1,19 raun / 1,20 markaður. FDR5: 2,25 / 2,24).
   VANDINN ER UPPLAUSN: innan "FDR 3" er markaðs-breiddin 0,61-2,75 mörk.
   Þess vegna notum við MÆLDU töfluna og fínum hana með liðsstyrk.       */
/* ============================================================
   FFDR — Fantasy Fixture Difficulty Rating
   Okkar mælda leikjaþyngd. MÆLT á 7 tímabilum (2019/20-2025/26),
   3.808 lið-leikjum. Liðsstyrkur alltaf úr FYRRA tímabili.

     staða      FPL FDR     FFDR    bæting
     GK           0,131    0,147     +13%
     DEF          0,233    0,305     +31%
     MID          0,207    0,304     +47%
     FWD          0,119    0,181     +51%
     MEÐAL        0,172    0,234     +36%

   Brestir: 2 af 28 (7%). Báðir skýrðir:
     GK 2019/20 — GK-merkið er innbyggt veikt (vörslur verðlauna erfiða leiki)
     FWD 2020/21 — COVID, engir áhorfendur. Heimavallar-forskot framherja
       varð NEGATÍFT (−0,140) og heima-stuðullinn refsaði því ranglega.

   LÆRDÓMUR SEM BREYTTI STILLINGUM: markaðslínan INNIHELDUR ÞEGAR
   heimavöllinn. Þegar hún er blönduð inn verður sér-heima-stuðull
   TVÍTALNING. Fyrir varnarmenn fellur fylgnin einræn þegar hann hækkar
   (0,3071 við 0,00 -> 0,2919 við 0,24), svo hann var settur í NÚLL þar.
   ============================================================ */
/* ---- SÉR-LEIKJAÞYNGD PER STÖÐU (FFDR) ----
   GRID-LEIT + krossprófun yfir 5 tímabil (2021/22-2025/26, 2.720 lið-leikir).
   Liðsstyrkur alltaf úr FYRRA tímabili -> ekkert leki.

   Krossprófuð fylgni við RAUNVERULEG stig per leikmann:
     staða   hrátt FDR   ein formúla   SÉR per stöðu
     GK        +0,140       +0,158        +0,161
     DEF       +0,236       +0,267        +0,275
     MID       +0,202       +0,252        +0,272   <- mest bæting
     FWD       +0,117       +0,156        +0,171

   TVENNT ÓVÆNT SEM MÆLINGIN SÝNDI:
   1) Andstæðingurinn vegur nánast NÚLL (0,00-0,10). FDR fangar hann þegar,
      svo sér-liður fyrir hann er nær óþarfur.
   2) MIÐJUMENN nota VARNAR-umbreytinguna, ekki sóknar. Þeir fá hreint-blað-stig
      og eigin varnarstyrkur spáir betur en sóknarstyrkur.                    */
/* TVEIR HÓPAR í stað fjögurra staða. MÆLT á 7 tímabilum:
     staða   FPL FDR   4 stöður   2 hópar
     GK        0,131     0,149     0,149
     DEF       0,233     0,307     0,307
     MID       0,207     0,307     0,314   <- betri
     FWD       0,119     0,183     0,184
     MEÐAL     0,172     0,236     0,238

   Af hverju hópar eru betri: MIÐJUMENN mældust betur með SÓKNAR-umbreytingu
   eftir að markaðsþátturinn kom inn. Markaðslínan fangar liðsstyrk, svo
   eftirstöðvarnar lesast sóknarlega. Áður (án markaðar) var varnar-umbreyting
   betri fyrir miðju — það var rétt þá og er ekki rétt núna.

   Og hópun leysir vandamál sem var sýnilegt: Sunderland-miðjumaður fékk
   þyngd 2,36 og Sunderland-framherji 3,15 í SAMA leik, því ólíkar
   umbreytingar voru notaðar. Nú fá þeir sömu tölu.                        */

/* ---- HEIMAVÖLLUR — MÆLDUR ----
   PÖRUÐ GREINING, 9 tímabil úr E0 (3.420 samanburðir, sama liðapar bæði áttir):
     mörk skoruð   +0,262 heima     mörk á sig   −0,262
     stig          +0,348           hreint blað  +6,6 prósentustig
   Síðustu 4 tímabil: +0,283 mörk, +0,391 stig, +5,4pp CS. Marktækt (9 stvillur).

   NÁTTÚRULEG TILRAUN: 2020/21 (engir áhorfendur, COVID) gaf +0,01 mörk —
   heimavöllurinn HVARF. Áhorfendur eru vélbúnaðurinn.

   FANTASY-STIG, parað á LEIKMANN (5 tímabil, >=60 mín, >=5 leikir hvor átt):
     FWD +0,735  ·  DEF +0,507  ·  MID +0,297  ·  GK +0,197 (á mörkum)

   ATH: 'home' í DIFF_W er EFTIRSTÖÐVA-stuðull, ekki hráa forskotið. FDR gefur
   þegar lægra gildi heima, svo við bætum aðeins því við sem FDR MISSIR.
   Þess vegna er röðin önnur: FWD 0,24 > MID 0,16 > DEF 0,08 > GK 0,02.        */
const HOME_PTS = { 1: 0.197, 2: 0.507, 3: 0.297, 4: 0.735 };  // mæld stig/leik

/* MÆLDIR FLOKKAR PER STÖÐU — kvantílar, allir EINRÆNIR.
   pts = raunveruleg meðalstig per leikmann í þeirri stöðu í einum leik.     */
/* MÆLD TAFLA — 3.808 lið-leikir, 7 tímabil, á SAMA FFDR-kvarða sem
   appið notar (öll vog innifalin, þ.m.t. markaður og heimavöllur).
   BÆÐI pts og cs — cs vantaði áður og gaf NaN í CS%-sýn.            */

/* MÆLT Á SAMSETTA KVARÐANUM — 2.720 lið-leikir, 5 tímabil (2021/22-2025/26).
   Liðsstyrkur alltaf úr FYRRA tímabili, svo ekkert leki.
   Nýi stuðullinn slær FDR á ÖLLUM fantasy-útkomum og í ÖLLUM 5 tímabilum:
     hreint blað    FDR +0,170 -> nýr +0,190  (+12%)
     mörk á sig     FDR +0,276 -> nýr +0,289  (+5%)
     varnarm.-stig  FDR +0,207 -> nýr +0,241  (+16%)
     markm.-stig    FDR +0,126 -> nýr +0,152  (+21%)
     sóknar-stig    FDR +0,171 -> nýr +0,226  (+32%)                        */

/* `FIT`-taflan og tillogu-skorid FLUTTUST I `src/recommend.js` 18.8.2026 (C.1).
   Astaedan er ekki snyrtimennska: skorid var ANNAD likan vid hlidina a thvi
   maelda, med ~12 handsettum lidum ofan a maeldu tofluna, og ekkert prof gat
   snert thad medan thad bjo inni i React-memo-i. Sja hausinn a recommend.js. */
const FFDR_AHEAD = 5;  // umferðir sem útskiptingar-röðun horfir á
/* UMFERDIR SYNDAR I EINU — BREIDDARHAD SIDAN 31.7.2026.
   Hnutarnir "FYLLA breiddina" (kafli 8), sem er rett a bord/skjá en BROTNAR
   i simabreidd: 13 hnutar i 390px gefa 26px hnuta sem SKARAST. Maelt i
   Chrome a 390 og 480 px: 9 skorunar-par, og skarandi hnutar eru ekki
   throngir heldur OTAPPANLEGIR — thu getur ekki valid umferdina sem thu
   villt. Ekkert yfirflaedi maeldist, svo profin og yfirflaedi-vordurinn
   sau thetta ekki; thad fannst med thvi ad RENDRA appid i simabreidd.
   760px+ hafdi engin skorun, thvi eru brotin thar.                       */
const TL_WINDOW = 13;        // >760px
const TL_WINDOW_MID = 9;     // 481-760
const TL_WINDOW_NARROW = 6;  // <=480 (simi)
function useTlWindow() {
  const [w, setW] = useState(() =>
    typeof window !== "undefined" && window.innerWidth ? window.innerWidth : 1280);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on);
                   window.removeEventListener("orientationchange", on); };
  }, []);
  return w <= 480 ? TL_WINDOW_NARROW : w <= 760 ? TL_WINDOW_MID : TL_WINDOW;
}

/* ---- Landsleikjahlé: hlé Á EFTIR þessum umferðum ---- */
/* LANDSLEIKJAHLE — REIKNAD UR LEIKJUM, EKKI HARDKODAD.
   VILLAN SEM VAR (fundin 7.8.2026 thegar notandinn bad um ad sja LENGD
   hlesins i tooltip): listinn var hardkodadur `[3,7,11,15,22,27]` og
   PASSADI EKKI VID 2026/27. Maelt ur `fixtures.json`: bilid eftir thessum
   sex umferdum er 4,2-7,0 dagar — thad er VENJULEG VIKA, ekkert hle.
   Raunverulegu longu bilin eru eftir GW5 (19,9 d), GW10 (14,0 d) og
   GW30 (21,0 d). Merkin sátu thvi á kolröngum stödum og enginn sá thad
   fyrr en beðið var um ad birta TÖLUNA sjálfa.
   NU: bil >= BREAK_MIN_DAYS telst hle. 12 dagar skilja longu bilin
   (14-21 d) fra theim sem eru bara midvikudagslausar vikur (7-9,8 d).  */
/* FALLID SJALFT ER NU I model.js — asamt `euroWeeks`, sem verdur ad nota
   NAKVAEMLEGA SOMU skilgreiningu a "bili milli umferda". Vaeru thau tvo
   reiknud sitt i hvoru lagi gaetu merkin tvo lent a sitthvorum stadnum
   fyrir sama gap. Sja athugasemdina vid `gwSpans`.                     */

/* ---- Chips ----
   AÐEINS lýsigögn hér. REGLURNAR (hvenær má nota, hversu oft) koma úr
   FPL-API-inu (data/chips.json) svo þær sjálf-uppfærast ef FPL breytir þeim.
   FPL 2026/27: tvö sett — eitt fyrir GW1-19, annað fyrir GW20-38.
   Wildcard og Free Hit byrja í GW2 (skipti eru þegar ótakmörkuð í GW1).   */
const CHIPS = {
  wildcard: { label:"Wildcard",       short:"WC", color:"#d92d3c", icon:"♻",  desc: "Unlimited transfers, no hit" },
  freehit:  { label:"Free Hit",       short:"FH", color:"#2563eb", icon:"⚡", desc: "Squad for one gameweek, then reverts" },
  bboost:   { label:"Bench Boost",    short:"BB", color:"#00b96b", icon:"⬆",  desc: "The bench scores too (all 15)" },
  "3xc":    { label:"Triple Captain", short:"TC", color:"#c98a00", icon:"3×", desc: "Captain ×3 instead of ×2" },
};

/* ---- Byrjunarlið: raunveruleg FPL-ID (staðfest úr players.json) ---- */
const START_SQUAD = [
  { id:496, starter:true,  order:1 },  // Kinsky      TOT GK
  { id:11,  starter:true,  order:2 },  // Mosquera    ARS DEF
  { id:356, starter:true,  order:3 },  // Virgil      LIV DEF
  { id:423, starter:true,  order:4 },  // Shaw        MUN DEF
  { id:542, starter:true,  order:5 },  // E.Le Fée    SUN MID
  { id:397, starter:true,  order:6 },  // Semenyo     MCI MID
  { id:426, starter:true,  order:7 },  // B.Fernandes MUN MID
  { id:239, starter:true,  order:8 },  // Garner      EVE MID
  { id:368, starter:true,  order:9 },  // Szoboszlai  LIV MID
  { id:411, starter:true,  order:10 }, // Haaland     MCI FWD
  { id:346, starter:true,  order:11 }, // Calvert-Lewin LEE FWD
  { id:497, starter:false, order:12 }, // Dubravka    TOT GK
  { id:173, starter:false, order:13 }, // Thomas      COV DEF
  { id:278, starter:false, order:14 }, // Hughes      HUL DEF
  { id:321, starter:false, order:15 }, // Walle Egeli IPS FWD
];
const START_CAPTAIN = 411; // Haaland
const BUDGET = 100.0;

/* ---- Hjálparföll ---- */

/* ---- FPL SÖLUVERÐ (50%-hagnaðarreglan) ----
   Þú fær kaupverðið + 50% af hagnaði, NIÐURJAFNAÐ á næstu 0,1.
   Tap: þú fær fullt núverandi verð (engin vörn).
   Dæmi: kaup 7,0 -> verð 7,5 gefur 7,2 (ekki 7,5).
   Verð eru heiltölur x10 í API-inu, svo við reiknum í tíundum.       */

/* Andstæðingur: HEIMALEIKUR = STÓRIR STAFIR, ÚTILEIKUR = litlir stafir.
   Það gerir "(a)"-merkið óþarft og heldur flísunum þéttum.               */
const oppLabel = (short, home) => !short ? "?" : (home ? short.toUpperCase() : short.toLowerCase());
/* ONYT DAGSETNING ER SAMA OG VANTANDI (11.8.2026).
   Fimm sniðgerdir profudu `!iso` — sem gripur null og tomann streng — en EKKI
   hvort dagsetningin se NYTILEG. `new Date("ekki dagsetning")` er Invalid Date,
   og tha er `getDay()` NaN, svo `days[NaN]` er **undefined** og `getDate()` er
   **NaN**. Utkoman a skjanum var ordrett:
     "10 fixturesundefined NaN. undefinedARSNaN:NaN"
   Fundid i proflotu 11.8.2026 med `kickoff_time: "ekki dagsetning"` i
   fixtures.json. ATH: `kickoff_time: null` var ThEGAR i lagi — thad var
   ONYTUR STRENGUR sem slapp, sem er einmitt thad sem hálf-skrifud skra eda
   sniðs-breyting hja FPL gefur.
   Eitt fall svo profin fimm geti ekki rekid i sundur; `null` ut thydir
   "notadu somu varaleid og fyrir vantandi gildi".                        */
const asDate = iso => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};
const fmtDate = iso => {
  const d = asDate(iso);
  if (!d) return "—";
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return `${days[d.getDay()]} ${d.getDate()}.${d.getMonth()+1}. ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};
const fmtClock = iso => {
  const d = asDate(iso);
  if (!d) return "—";
  const now = new Date();
  const mins = Math.round((now - d) / 60000);
  if (mins < 2) return "now";
  if (mins < 60) return interp("{0} min ago", [mins]);
  const h = Math.round(mins / 60);
  return h < 24 ? interp("{0}h ago", [h]) : `${d.getDate()}.${d.getMonth()+1}.`;
};
const fmtDeadline = iso => {
  const d = asDate(iso);
  if (!d) return "—";
  return interp("{0}/{1} at {2}:{3}", [d.getDate(), d.getMonth()+1,
    String(d.getHours()).padStart(2,"0"), String(d.getMinutes()).padStart(2,"0")]);
};
/* ---- PENINGUR Á SKJÁ ----
   MERKID FER FYRIR PUNDID, EKKI EFTIR THVI. Bankinn ma nu fara i MINUS
   (notandinn ma velja dyran mann og fjarmagna hann sidar), og
   `£${(-1.5).toFixed(1)}` gefur **"£-1.5"** — thad les eins og skrifvilla
   eda eins og gildi sem gleymdist ad thatta, ekki eins og skuld.
   `-£1.5` er einraett.
   OG THAD MA ALDREI VERDA `£NaN`: bankinn er summa ur `sellOf`/`now_cost`
   og hvert theirra getur verid ochekkt ytra svid (sbr. `bank:"mikid"` ur
   proxyinu, CLAUDE.md 5b). Otala verdur thvi "—", ekki NaN — "veit ekki"
   er astand sem appid kann, NaN er thad ekki.                            */
const money = v => (Number.isFinite(v)
  ? `${v < 0 ? "-" : ""}£${Math.abs(v).toFixed(1)}`
  : "—");
/* MERKID ER BER, LIKA ThEGAR ThAD ER PLUS. `-0.35` og `0.35` lesast eins i
   fljotu bragdi og runa sem er UNDIR hans eigin medaltali verdur ad bera
   minus i hverju holfi thar sem hun er birt; sama regla og `money` fylgir
   fyrir minus-banka. Otala verdur "—", ekki NaN.                        */
const signedPts = v => (Number.isFinite(v)
  ? `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(2)}`
  : "—");
/* ---- VISTUN ----
   ATH: window.storage er AÐEINS til í Claude-artifact-sandkassa. Á Netlify
   er það undefined, og þögult try/catch faldi það — svo allt ástand hvarf
   við hverja endurhleðslu. localStorage er rétta lausnin fyrir vafra.
   Röð: localStorage -> window.storage -> minni (og VIÐVÖRUN, ekki þögn).  */

/* ---- Tiltækileiki, bann-hætta, fastaleikir, skiptingar-hætta ----
   status: a=til leiks, d=vafi, i=meiddur, s=Í BANNI, u=ótiltækur, n=ekki í hóp
   Spjaldabann (Premier League): 5 gul (fyrir umf. 19) = 1 leikur,
   10 gul (fyrir umf. 32) = 2 leikir, 15 gul = 3 leikir.            */
/* SOLID litir bættir vid 29.7.: pale bakgrunnur + dokkur texti i 8,5px
   var nær OSYNILEGUR a vellinum — notandinn sa ekki ad Garner var meiddur.
   `bg`/`color` halda ser fyrir LISTA og glugga (thar er hvitur grunnur og
   fint merki rett), en SPJALDID a vellinum notar `solid` + hvitan texta.  */

function Logo() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      {/* Merki appsins — currentColor erfir lit, --logo-accent stýrir boltanum */}
      <svg width="34" height="34" viewBox="0 0 64 64" role="img" aria-label="FantasyApp"
        style={{ color: C.purple, "--logo-accent": "#46d17f", flexShrink: 0 }}>
        <title id="t">{"Logo of a Fantasy football model"}</title>
        <defs>
        <clipPath id="c"><circle cx="32" cy="32" r="26"/></clipPath>
        <clipPath id="b"><circle cx="55.0" cy="20.0" r="6.2"/></clipPath>
        </defs>
        <g clipPath="url(#c)" fill="currentColor" opacity=".13">
        <rect x="0" y="8"  width="64" height="7"/>
        <rect x="0" y="22" width="64" height="7"/>
        <rect x="0" y="36" width="64" height="7"/>
        <rect x="0" y="50" width="64" height="7"/>
        </g>
        <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="3.2"/>
        <path d="M13 44 H26 V33 H40 V20 H55" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <g>
        <circle cx="55.0" cy="20.0" r="6.2" fill="var(--logo-accent, #46d17f)"/>
        <g clipPath="url(#b)" fill="#0f2e1c">
        <path d="M55.00 18.41 L56.51 19.51 L55.94 21.29 L54.06 21.29 L53.49 19.51 Z"/>
        <path d="M55.94 15.42 L54.06 15.42 L53.49 13.64 L55.00 12.54 L56.51 13.64 Z"/>
        <path d="M59.64 19.48 L59.06 17.70 L60.58 16.60 L62.09 17.70 L61.51 19.48 Z"/>
        <path d="M56.93 24.25 L58.45 23.15 L59.96 24.25 L59.38 26.03 L57.51 26.03 Z"/>
        <path d="M51.55 23.15 L53.07 24.25 L52.49 26.03 L50.62 26.03 L50.04 24.25 Z"/>
        <path d="M50.94 17.70 L50.36 19.48 L48.49 19.48 L47.91 17.70 L49.42 16.60 Z"/>
        </g>
        <g clipPath="url(#b)" fill="none" stroke="#0f2e1c" strokeWidth="0.3" strokeLinejoin="round">
        <path d="M56.87 19.02 L55.36 17.92 L55.94 16.14 L57.81 16.14 L58.39 17.92 Z"/>
        <path d="M56.51 21.48 L57.09 19.70 L58.96 19.70 L59.54 21.48 L58.03 22.58 Z"/>
        <path d="M54.06 21.90 L55.94 21.90 L56.51 23.68 L55.00 24.78 L53.49 23.68 Z"/>
        <path d="M52.91 19.70 L53.49 21.48 L51.97 22.58 L50.46 21.48 L51.04 19.70 Z"/>
        <path d="M54.64 17.92 L53.13 19.02 L51.61 17.92 L52.19 16.14 L54.06 16.14 Z"/>
        </g>
        <circle cx="55.0" cy="20.0" r="6.2" fill="none" stroke="#0f2e1c" strokeWidth="0.52"/>
        </g>
      </svg>
      <div>
        <div style={{ fontWeight:700, fontSize:16, letterSpacing:-0.3, color:C.purple }}>FantasyApp</div>
      </div>
    </div>
  );
}


export default function App() {
  /* ---------- Gögn úr pipeline ---------- */
  const [players, setPlayers] = useState(null);
  const [teams, setTeams] = useState(null);
  const [fixtures, setFixtures] = useState(null);
  const [events, setEvents] = useState(null);
  const [defcon, setDefcon] = useState(null);
  const [defconHist, setDefconHist] = useState(null);  // DC-hittni fyrri timabila
  const [consist, setConsist] = useState(null);        // Aron-studull (jofnudur)
  const [bsd, setBsd] = useState(null);                // BSD 2025/26 (frosid)
  const [bsdLive, setBsdLive] = useState(null);        // BSD yfirstandandi timabil
  /* SKOTAKORTID ER LETIHLADID — 168 KB sem eiga ekkert erindi i fyrstu
     hledslu. Sótt i fyrsta sinn sem leikmannaspjald er opnad, svo einu
     sinni fyrir alla lotuna (sama mynstur og player_gw_*.json, 6j).    */
  const [shotFile, setShotFile] = useState(null);      // null | "loading" | gogn | "err"
  /* Skrain geymir EINA rod per skot (ekki afrit per leikmann og lid), svo
     sýnirnar eru siadar ut ur henni. Visarnir eru byggdir EINU SINNI —
     annars vaeri 9.544-rada sia keyrd i hverri teiknun.                */
  const shotIndex = useMemo(() => {
    if (!shotFile || typeof shotFile !== "object" || !Array.isArray(shotFile.shots)) return null;
    const F = shotFile.legend?.fields || [];
    const iCode = F.indexOf("code"), iTeam = F.indexOf("team"), iOpp = F.indexOf("opp");
    const byCode = new Map(), byTeam = new Map(), byOpp = new Map();
    const put = (m, k, v) => { if (k == null) return; const a = m.get(k); a ? a.push(v) : m.set(k, [v]); };
    for (const s of shotFile.shots) {
      put(byCode, s[iCode], s); put(byTeam, s[iTeam], s); put(byOpp, s[iOpp], s);
    }
    const teams = shotFile.legend?.teams || [];
    const fields = Object.fromEntries((shotFile.legend?.fields || []).map((f, i) => [f, i]));
    /* `season` FYLGIR MED — SKRAIN BER HANA OG VID HENTUM HENNI (24.8.2026).
       `bsd_shots.json` ber `season: "2025/26"`, en visirinn flutti hana ekki,
       svo `Teams.jsx` gat ekki nefnt timabil skotakortsins og THAGDI i
       stadinn. I lifandi syn (2026/27) thyddi thogn ad 2025/26-skot voru
       teiknud undir 2026/27-haus an nokkurs merkis. Ad lesa toluna ur
       ANNARRI skra vaeri agiskun; ad lesa hana ur skranni sem skotin komu
       UR er einfaldlega svidid sjalft.                                   */
    return { byCode, byTeam, byOpp, teams, fields, calib: shotFile.calib,
             season: shotFile.season || null,
             positions: shotFile.positions || {} };
  }, [shotFile]);
  const [playerForm, setPlayerForm] = useState(null);   // per-umferðar mínútusaga
  const [lineups, setLineups] = useState(null);         // STADFEST byrjunarlid
  const [pipeStatusFast, setPipeStatusFast] = useState(null);
  const [elo, setElo] = useState(null);
  const [weather, setWeather] = useState(null);
  const [travel, setTravel] = useState(null);   // ferðalengd útiliðs per leik (pipeline)
  const [injuries, setInjuries] = useState(null); // TEGUND meiðsla úr API-Sports (auðgar FPL-status)
  const [eloFx, setEloFx] = useState(null);
  const [euroFx, setEuroFx] = useState(null);
  const [pipeStatus, setPipeStatus] = useState(null);
  const [dataState, setDataState] = useState("loading");
  const [odds, setOdds] = useState(null);
  const [oddsState, setOddsState] = useState("idle");
  const [news, setNews] = useState(null); // fljótandi gögn (30 mín cron)
  const [promoted, setPromoted] = useState(null); // B-deildargrunnur nýliða
  const [chipRules, setChipRules] = useState(null); // chip-reglur ÚR FPL-API
  /* "Best of the best" — hopurinn sjalfur (pros.json) og thad sem hann gerdi
     (pros_gw.json). Baedi vantar i forleik og thad er RETT astand.        */
  const [pros, setPros] = useState(null);
  const [prosPanel, setProsPanel] = useState(null);
  const [formFeat, setFormFeat] = useState(null);   // rúllandi eiginleikar (fittað líkan)
  const [teamForm, setTeamForm] = useState(null);   // HEILT lið-form úr E0
  const [luck, setLuck] = useState(null);           // xG/xGC per lið (FPL-summa)
  const [teamShots, setTeamShots] = useState(null); // SVAEDI skotanna (ESPN, heilt timabil)
  const [bsdTeams, setBsdTeams] = useState(null);   // per-skot xG (BSD, 2025/26 eitt)
  const [buyPrices, setBuyPrices] = useState({});  // {playerId: kaupverð x10}
  const [apiBank, setApiBank] = useState(null);    // banki úr FPL (tíundir) ef tengt
  const [apiHit, setApiHit] = useState(null);      // raunveruleg refsing úr FPL

  /* ---------- Notanda-ástand ---------- */
  const [gw, setGw] = useState(1);
  const [entryId, setEntryId] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [squadOverride, setSquadOverride] = useState(null); // raunlið úr FPL-slóð
  /* STADA TENGINGARINNAR. Adur var flash("Tengt lid X") sent SAMSTUNDIS —
     ADUR en nokkud var sannreynt — og ef soknin brast var thad ThOGULT
     (`catch { setTotalPts(null) }`). Notandinn sa thvi "tengt" og svo
     ekkert. Nu er thetta thrjar adgreindar stodur med raunverulegu svari. */
  const [conn, setConn] = useState({ state: "idle", msg: "", name: null, picks: null });
  const [plan, setPlan] = useState([]);            // [{gw, outId, inId}]
  const [captain, setCaptain] = useState(START_CAPTAIN);
  const [vice, setVice] = useState(null);
  const [benchSwaps, setBenchSwaps] = useState({});
  const [chips, setChips] = useState({});
  const [dragId, setDragId] = useState(null);
  const [swapSel, setSwapSel] = useState(null);   // valinn til skipta (smellu-flæði)
  const [confirmReset, setConfirmReset] = useState(null); // "gw" | "all" — staðfestingar-skref
  const [tlStart, setTlStart] = useState(1);        // fyrsta umferð í tímalínu-glugga
  const tlWindow = useTlWindow();                  // BREIDDARHAD — sja useTlWindow
  const [selling, setSelling] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [showFfdr, setShowFfdr] = useState(false);  // FFDR-taflan sýnileg
  const [showChips, setShowChips] = useState(false); // chip-stillingar sýnilegar // frjáls leit (ekki bundin sölu)
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [totalPts, setTotalPts] = useState(null);
  const [gwPts, setGwPts] = useState(null);
  const [recPos, setRecPos] = useState("ALL");
  const [recRange, setRecRange] = useState(5);
  /* FFDR-TAFLAN FÆR SITT EIGIÐ BIL. Hún hékk á `recRange`, sem er líka
     bilið fyrir tillögurnar — að breyta öðru breytti hinu. Og bilið byrjaði
     ALLTAF á næstu umferð, svo það var ekki hægt að skoða t.d. GW5–9.
     null = fylgja `recRange` eins og áður (sjálfgefið).                  */
  const [ffdrRange, setFfdrRange] = useState(null);   // [frá, til] eða null
  const [ffdrOpen, setFfdrOpen] = useState(false);
  const [recMaxCost, setRecMaxCost] = useState("");   // hamarksverd i tillogum (tomt = ekkert thak)
  const [teamSort, setTeamSort] = useState("def");
  const [detail, setDetail] = useState(null); // {kind:"player"|"team", id}
  const [live, setLive] = useState(null);      // lifandi staða valdrar umferðar
  const [gwStats, setGwStats] = useState(null); // per-leikmanns tölur valdrar umferðar
  const [liveTick, setLiveTick] = useState(0);
  const [view, setView] = useState("planner");   // "planner" | "gw" | "board"

  /* LETIHLEDSLAN kviknar thegar skotakorts sé raunverulega thorf — spjald
     opnad eda Teams-flipinn valinn — EKKI vid raesingu. 338 KB eiga ekkert
     erindi i fyrstu hledslu (sama regla og player_gw_*.json, 6j).      */
  const wantShots = detail?.kind === "player" || view === "teams";
  useEffect(() => {
    if (!wantShots || shotFile != null) return;
    setShotFile("loading");
    fetch(`${RAW}/bsd_shots.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setShotFile)
      .catch(() => setShotFile("err"));
  }, [wantShots, shotFile]);

  /* SERFRAEDINGA-HOPURINN ER LIKA LETIHLADINN, OG THAD ER MAELT:
     `pros_gw.json` er 21 KB per umferd (1.000 lid), sem er ~814 KB i lok
     timabils — maelt 10.8.2026 a raunhaefri dreifingu. `pros.json` er 69 KB
     til vidbotar. Hvorugt kemur fyrstu hledslu vid: EINN flipi les thau.
     Sama regla og bsd_shots (338 KB) og player_gw_*.json.               */
  const wantPros = view === "best";
  useEffect(() => {
    if (!wantPros || pros != null) return;
    setPros("loading");
    (async () => {
      try { setProsPanel(await (await fetch(`${RAW}/pros.json`)).json()); } catch {}
      try {
        const r = await fetch(`${RAW}/pros_gw.json`);
        setPros(r.ok ? await r.json() : "missing");
      } catch { setPros("err"); }
    })();
  }, [wantPros, pros]);
  const [lastGw, setLastGw] = useState(null);     // data/last_gw.json — sidasta lokna umferd
  const [lastGwShots, setLastGwShots] = useState(null); // data/last_gw_shots.json — ESPN-skot
  const [seasonsFile, setSeasonsFile] = useState(null); // data/player_seasons.json — fyrri timabil (lyklad a code)
  const [priceEdit, setPriceEdit] = useState(null);     // {id} — lettur verd-gluggi
  const [spNotes, setSpNotes] = useState(null);         // data/set_piece_notes.json
  const [imminent, setImminent] = useState(null);       // data/imminent.json — mo/ao
  const [watch, setWatch] = useState([]);               // vaktlisti (stjornumerktir) — ekkert thak
  const [cmpIds, setCmpIds] = useState([]);             // samanburdur — allt ad 4
  /* FFDR-samanburdur (roterings-par): 1-2 menn sem eg vil fa hjalp med.
     Adskilid fra cmpIds — thad er stat-samanburdur, thetta er leikjaplan. */
  const [rotIds, setRotIds] = useState([]);
  const [cmpOpen, setCmpOpen] = useState(false);
  const [rivals, setRivals] = useState([]);          // [{id}] — andstæðingar til samanburðar
  /* SIDASTA UMFERD SEM LIFANDI TOLUR VORU SOTTAR FYRIR. Sja effectinn
     sem les `live/gw{n}.json`: hann keyrir lika a 60 sek `liveTick`, og
     an thessa var nullstillt i hvert sinn (flokt a opnu spjaldi).     */
  const lastLiveGw = React.useRef(null);
  const [rivalInput, setRivalInput] = useState("");
  const [rivalData, setRivalData] = useState({});    // {id: {name, gwPts, totalPts, captain, picks}}

  /* EITT TIMER I EINU. Adur var nyr timer settur an thess ad hreinsa thann
     fyrri, svo tvaer tilkynningar innan 2,8 s enduðu a thvi ad SU FYRRI
     faldi thá seinni adur en hun hafdi verid lesin.                      */
  const toastTimer = React.useRef(null);
  const flash = m => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => { setToast(null); toastTimer.current = null; }, 2800);
  };

  /* ---------- Sækja gögn ---------- */
  useEffect(() => {
    (async () => {
      try {
        // MIKILVÆGT: athuga r.ok. GitHub skilar HTML-villusíðu við 404, og .json()
        // gaf {} sem fór í state -> (fixtures || []).forEach kastaði.
        const j = async f => {
          const r = await fetch(`${RAW}/${f}`);
          if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
          return r.json();
        };
        const [pl, tm, fx, ev] = await Promise.all([
          j("players.json"), j("teams.json"), j("fixtures.json"), j("events.json"),
        ]);
        // verja gegn óvæntri lögun — bíða heldur en að hrynja
        const arr = (v, k) => Array.isArray(v) ? v : (Array.isArray(v?.[k]) ? v[k] : null);
        const plA = arr(pl,"players"), tmA = arr(tm,"teams"), fxA = arr(fx,"fixtures"), evA = arr(ev,"events");
        if (!plA || !tmA || !fxA || !evA) throw new Error("core data in an unexpected shape");
        setPlayers(plA); setTeams(tmA); setFixtures(fxA); setEvents(evA);
        setDataState("ok");
        /* VALFRJALSU SKRARNAR ERU SOTTAR SAMHLIDA (lagad 11.8.2026).
           ADUR voru thetta **28 `await` I ROD** eftir kjarnann, hver sin eigin
           ferd til raw.githubusercontent. Kjarninn (players/teams/fixtures/
           events) var thegar i `Promise.all`, en allt hitt — oddar, elo,
           frettir, skotakort, byrjunarlid — bidadi i rod, svo a haegri
           tengingu var bidin SUMMA allra 28 ferda i stad thess ad vera lengd
           theirrar haegustu. Thad er thad sem notandinn ser sem "spjaldid er
           tomt i nokkrar sekundur".

           `allSettled` ER RETTA VERKFAERID, EKKI `all`: hver skra HER er
           VALFRJALS og ma vanta (`bsd_live.json` er ekki til i forleik,
           `defcon.json` adeins 2025/26). `Promise.all` hefdi latid EINA
           vantandi skra fella allar hinar — thad vaeri afturfor fra
           `try {} catch {}` sem var thar adur. Hver faersla heldur thvi sinni
           eigin thoglu bilun, nakvaemlega eins og adur; thad eina sem
           breytist er ROD ferdanna, ekki utkoman.

           Athugasemdirnar sem stodu vid stakar skrar eru VID FAERSLURNAR
           sjalfar hér ad nedan — thaer skjala villur sem kostudu tima og
           thaer eiga ekki ad tynast i endurskipulagningu.                */
        const OPTIONAL = [
          ["defcon.json",            setDefcon],
          ["defcon_history.json",    setDefconHist],
          ["consistency.json",       setConsist],
          ["bsd_players.json",       setBsd],
          /* Til fyrst thegar timabilid er byrjad — vantar i forleik og thad
             er RETT (enginn lokinn leikur til ad telja).                  */
          ["bsd_live.json",          setBsdLive],
          ["player_form.json",       setPlayerForm],
          ["status.json",            setPipeStatus],
          /* HRADA KEYRSLAN SKRIFAR I status_fast.json OG APPID LAS HANA EKKI.
             Thar med voru ALLAR heimildir hradar keyrslunnar osynilegar i
             hlidarstikunni — thar a medal api_lineups. Vordur i profi.     */
          ["status_fast.json",       setPipeStatusFast],
          /* STADFEST BYRJUNARLID. Pipeline skrifadi lineups.json en APPID LAS
             HANA ALDREI — eiginleikinn var fullbyggdur og maeldur en gognin
             foru ekkert. Thridja tilvikid af somu tegund i thessari lotu
             (rong keyrsla -> vantandi lykil -> enginn notandi).            */
          ["lineups.json",           setLineups],
          ["elo.json",               setElo],
          ["weather.json",           setWeather],
          ["travel.json",            setTravel],
          /* season_baseline.json er EKKI lengur lesin: gamla "i ar vs i fyrra"-taflan
             notadi hana, en SeasonTable les nu player_seasons.json sem porar a `code`
             (fast a leikmanni) i stad `id` sem FPL endurnytir milli timabila.
             Pipeline skrifar hana afram — hun er bara ekki sott i framendann.     */
          ["injuries.json",          setInjuries],
          ["elo_fixtures.json",      setEloFx],
          ["euro_fixtures.json",     setEuroFx],
          ["news.json",              setNews],
          ["promoted_baseline.json", setPromoted],
          ["chips.json",             setChipRules],
          ["form_features.json",     setFormFeat],
          ["team_form.json",         setTeamForm],
          ["luck.json",              setLuck],
          ["team_shots.json",        setTeamShots],
          ["bsd_teams.json",         setBsdTeams],
          ["last_gw.json",           setLastGw],
          ["last_gw_shots.json",     setLastGwShots],
          ["player_seasons.json",    setSeasonsFile],
          ["set_piece_notes.json",   setSpNotes],
          ["imminent.json",          setImminent],
        ];
        await Promise.allSettled(OPTIONAL.map(([file, set]) =>
          j(file).then(set, () => {})));
        const cur = evA.find(e => e.is_current) || evA.find(e => e.is_next);
        if (cur) setGw(cur.id);
      } catch (e) { setDataState("error"); }
    })();
  }, []);

  /* ---------- Bókmakera-CS% — úr pipeline (GitHub), EKKI Netlify-function ----------
     Var áður proxy-kall við hverja opnun. Nú sækir cron 1x/dag og appið les frítt. */
  useEffect(() => {
    (async () => {
      setOddsState("loading");
      try {
        const r = await fetch(`${RAW}/odds.json`);
        if (!r.ok) { setOddsState("missing"); return; }      // cron ekki keyrt
        const d = await r.json();
        setOdds(d?.teams || null);
        // greinum "engin skrá" frá "skrá til en engir leikir á línu"
        setOddsState(d?.teams && Object.keys(d.teams).length ? "ok" : "empty");
      } catch (e) { console.warn("FPL odds:", e?.message || e); setOddsState("missing"); }
    })();
  }, []);

  /* ---------- Lifandi staða umferðar (gegnum proxy, CDN-cache 60s) ---------- */
  useEffect(() => {
    if (!PROXY_URL) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${PROXY_URL}?path=live&gw=${gw}`);
        const d = await r.json();
        if (alive) setLive(d);
      } catch { if (alive) setLive(null); }
    })();
    return () => { alive = false; };
  }, [gw, liveTick]);

  // Endurhlaða aðeins ef leikur er í gangi — engin óþörf köll annars
  useEffect(() => {
    if (!live?.any_live) return;
    const t = setInterval(() => setLiveTick(x => x + 1), 60000);
    return () => clearInterval(t);
  }, [live?.any_live]);

  const liveByFx = useMemo(() => {
    const m = {};
    (live?.fixtures || []).forEach(f => m[f.id] = f);
    return m;
  }, [live]);

  /* ---------- Tölur leikmanna í valdri umferð ----------
     Loknar umferðir: data/live/gw{n}.json úr pipeline (frítt, engin function-köll).
     Yfirstandandi: proxy (cache 60s). Explain-blokkin fylgir óskert.               */
  /* ============================================================
     ENDURNYJUN ER EKKI SAMA OG UMFERDASKIPTI (25.8.2026)

     `setGwStats(null)` var kallad SAMSTUNDIS i hverri keyrslu thessa
     effects — og deps eru `[gw, liveTick]`, thar sem `liveTick` telur
     upp a 60 sek fresti **medan leikur er i gangi**. Opid
     leikmannaspjald flokti thvi yfir i „engar tolur enn"-textann a
     hverri minutu, nakvaemlega thegar notandinn er ad horfa.

     GOMLU TOLURNAR ERU RETTAR ThANGAD TIL NYJAR KOMA. Nullstillingin
     a adeins vid thegar UMFERDIN sjalf breytist, thvi tha eiga gomlu
     tolurnar vid ADRA umferd og maetti ekki syna thaer undir nyjum
     haus (sama regla og `file?.key === seasonKey` i `gwRange.js`:
     gogn eru adeins syn thegar thau eiga vid thad sem er valid).

     `lastGw` er ref en ekki state: hann ma ekki kveikja teikningu, og
     hann er lesinn/skrifadur i SOMU keyrslu effectsins.
     ============================================================ */
  useEffect(() => {
    let alive = true;
    if (lastLiveGw.current !== gw) { setGwStats(null); lastLiveGw.current = gw; }
    (async () => {
      // 1) reyna pipeline-skrána
      try {
        const r = await fetch(`${RAW}/live/gw${gw}.json`);
        if (r.ok) {
          const d = await r.json();
          if (alive && d?.elements?.length) {
            const m = {}; d.elements.forEach(e => m[e.id] = e);
            setGwStats({ src: "pipeline", byId: m });
            return;
          }
        }
      } catch {}
      // 2) annars proxy (yfirstandandi umferð)
      if (!PROXY_URL) return;
      try {
        const r = await fetch(`${PROXY_URL}?path=fpl-live&gw=${gw}`);
        const d = await r.json();
        if (alive && d?.elements?.length) {
          const m = {}; d.elements.forEach(e => m[e.id] = e);
          setGwStats({ src: "live", byId: m });
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, [gw, liveTick]);

  /* ---------- Vistun ---------- */
  useEffect(() => {
    (async () => {
      const s = await loadState("fpl_planner_v3");
      if (s) {
        /* GERD HVERS SVIDS ER ThVINGUD, EKKI TREYST.
           `loadState` ver adeins gegn ONYTU JSON. GILT JSON med RANGRI
           GERD for ospurt inn i state og felldi appid vid hledslu —
           maelt a 14 skemmdum astondum, fjogur hrundu:
             plan:"abc"          -> plan.filter is not a function
             chips:[1,2,3]       -> les .color af undefined
             benchSwaps:{1:"x"}  -> (benchSwaps[gw]||[]).forEach is not a function
             rivals:{}           -> rivals.map is not a function
           ErrorBoundary greip thau (kafli 8c) en eina utgangan thar er
           "hreinsa vistada plonun" — sem eydir OLLU lidinu. Ad hunsa eitt
           ONYTT svid er storum betra en ad kosta notandann allt hitt.
           Gilt astand fer i gegn obreytt.                              */
        const arr = (v, d = []) => Array.isArray(v) ? v : d;
        const obj = v => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
        /* TOLU-SVIDIN VORU EKKI ThVINGUD (lagad 11.8.2026). Fyrri umferd
           thessarar vinnu thvingadi GERD FYLKJA og HLUTA en let stoku
           tolurnar og INNIHALD fylkjanna ospurt. Thau eru jafn ovarin:
             entryId:"abc"                -> fer i `?path=fpl-entry&id=abc`
             captain:"x"                  -> `x === s.id` er alltaf false,
                                             svo fyrirlidinn HVERFUR thogult
             plan:[{gw:"2"}]              -> `tr.gw > g` ber strengja-
                                             samanburd; rod skiptanna raskast
             watch:[{}]                   -> `v.includes(id)` finnur aldrei
             rivals:["606"]               -> `r.id` er undefined -> kall med
                                             `id=undefined`
           `localStorage` er notanda-gogn sem VID skrifum, en notandinn (eda
           onnur utgafa appsins, eda handvirk breyting) getur skrifad hvad sem
           er — og reglan i kafla 8c er ad EITT onytt svid ma bara kosta sig
           sjalft. Gilt astand fer i gegn OBREYTT.                         */
        const int = v => {
          const n = typeof v === "number" ? v : (typeof v === "string" ? Number(v) : NaN);
          return Number.isInteger(n) ? n : null;
        };
        /* Fylki AF TOLUM: hver ogild faersla er sleppt, ekki nulluð — 0 er
           gilt leikmanns-id i engum heimi, en `null` i vaktlista vaeri rod
           sem birtist sem tomt spjald.                                    */
        const intArr = v => arr(v).map(int).filter(x => x != null);
        /* Fylki AF HLUTUM med tolu-svidum sem MEGA EKKI vanta.            */
        const rowArr = (v, req) => arr(v).filter(r => r && typeof r === "object"
          && req.every(k => int(r[k]) != null))
          .map(r => ({ ...r, ...Object.fromEntries(req.map(k => [k, int(r[k])])) }));
        /* benchSwaps er hlutur af fylkjum AF PORUM (umferd -> [[aId,bId]…]),
           og ThAD ER EITT STIG DYPRA EN ThESSI ATHUGASEMD SAGDI ADUR.
           Hun sagdi "hlutur AF FYLKJUM" og `objOfArr` thvingadi nakvaemlega
           thad — en notkunarstadirnir (1367 og 2001) gera
           `(benchSwaps[gw] || []).forEach(([aId, bId]) => …)`, sem
           AFBYGGIR hverja faerslu sem par.
           `{"3": [1, 2]}` er thvi "hlutur af fylkjum", stenst gamla profid,
           OG FELLIR APPID: `1` er ekki iterable.

           FUNDID 11.8.2026 AF NYJA HRINGFERDAR-PROFINU — og fyrst sem
           villa i profgognunum MINUM (eg skrifadi `{"3":[1,2]}` sem "gilt
           astand"), sem er einmitt hvernig raunveruleg skemmd blob verda
           til: einu stigi of flatt. Ad thvinga bara ytri gerdina var sami
           halfkaraði vordur og "gilt JSON" var adur.

           Nu er hver faersla ThVINGUD I PAR AF TOLUM og ogild por sleppt —
           eitt skemmt par kostar sig sjalft, ekki umferdina.            */
        const objOfArr = v => Object.fromEntries(
          Object.entries(obj(v)).map(([k, val]) => [k,
            arr(val).filter(pair => Array.isArray(pair) && pair.length === 2
                                    && pair.every(x => int(x) != null))
                    .map(pair => pair.map(int))]));
        setEntryId(int(s.entryId)); setPlan(rowArr(s.plan, ["gw", "outId", "inId"]));
        setCaptain(int(s.captain) ?? START_CAPTAIN); setVice(int(s.vice));
        setBenchSwaps(objOfArr(s.benchSwaps)); setChips(obj(s.chips)); setBuyPrices(obj(s.buyPrices));
        setRivals(rowArr(s.rivals, ["id"])); setWatch(intArr(s.watch));
      }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (loaded) saveState("fpl_planner_v3", { entryId, plan, captain, vice, benchSwaps, chips, buyPrices, rivals, watch });
  }, [entryId, plan, captain, vice, benchSwaps, chips, buyPrices, rivals, watch, loaded]);

  /* ---------- Sækja raunlið + stig úr FPL-slóð ---------- */
  useEffect(() => {
    /* `apiBank` VAR EKKI NULLSTILLTUR vid aftengingu, svo gamall FPL-banki
       hélt afram ad yfirskrifa aaetlada bankann eftir ad tengingin for.   */
    if (!PROXY_URL || !entryId) { setTotalPts(null); setGwPts(null); setSquadOverride(null); setApiHit(null); setApiBank(null); return; }
    /* KAPPHLAUPS-VORD — systur-effectarnir (live, gwStats, rivals) hafa thad
       allir, thessi ekki. An thess getur SEINT svar fra fyrri umferd lent
       EFTIR svari nyju umferdarinnar og yfirskrifad `squadOverride`,
       fyrirlida, varafyrirlida, kaupverd og tengistodu med RONGU umferdinni.
       Sest fyrst thegar flett er hratt milli umferda — thad er einmitt thad
       sem madur gerir thegar tímabilid er byrjad.                        */
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${PROXY_URL}?path=fpl-picks&id=${entryId}&gw=${gw}`);
        const d = await r.json();
        /* EINN UTGANGUR DUGAR FYRIR ALLA SETJARA HER A EFTIR: hafi umferdin
           (eda lidid) breyst medan bedid var er thetta svar urelt.        */
        if (!alive) return;
        /* TALA EDA NULL — ALDREI ThAD SEM KOM.
           `bank != null` hleypti STRENG i gegn og hann for beint i
           peninga-reikninginn, svo skjarinn bar `NaN` (maelt med
           `bank:"mikid"`). Thetta er ytra svar sem vid stjornum ekki:
           proxy-villa eda HTML-sida getur skilad hverju sem er. `null`
           thydir "veit ekki" og appid kann thad thegar; NaN kann thad
           ekki — sbr. regluna um ad tomt gildi se ALDREI 0.            */
        const n = v => (typeof v === "number" && Number.isFinite(v)) ? v : null;
        setGwPts(n(d?.entry_history?.points));
        setTotalPts(n(d?.entry_history?.total_points));
        // FPL gefur banka í entry_history — nákvæmara en okkar áætlun
        if (n(d?.entry_history?.bank) != null) setApiBank(d.entry_history.bank);
        // FPL segir okkur raunverulega refsingu sem var tekin í umferðinni
        setApiHit(n(d?.entry_history?.event_transfers_cost));
        if (d?.error) {
          /* SKYRING I STAD ThOGNAR. Forleikur: FPL birtir ekki `picks` fyrir
             umferd sem er EKKI byrjud — /entry/{id}/event/{gw}/picks/ er 404.
             Thad er ekki villa i slodinni og notandinn a ad vita thad. */
          const is404 = /404/.test(String(d.error));
          setConn(c => (c.state === "ok" || c.state === "picks")
            ? { ...c, state:"picks", picks:false,
                msg: is404 ? interp("Connected ✓ — but FPL does not publish the squad until gameweek {0} starts. Points and your real squad will arrive automatically.", [gw])
                           : interp("Connected ✓ — but could not fetch the squad ({0}).", [String(d.error).slice(0, 40)]) }
            : c);
        }
        if (Array.isArray(d?.picks) && d.picks.length) {
          setSquadOverride(d.picks.map((p, i) => ({
            id: p.element, starter: p.position <= 11, order: p.position,
          })));
          // Ef API-ið skilar purchase_price (aðeins innskráð my-team gerir það)
          // þá notum við það. Annars heldur notandinn sínum skráðu verðum.
          /* API-VERD MA EKKI ThURRKA UT HANDSKRAD VERD.
             Adur var talan geymd BER (`pp[id] = 6.5`) og dreift yfir `prev`,
             svo faersla sem notandinn hafdi skrad sjalfur ({p, src:"manual"})
             hvarf — og `buySrcOf` merkti sidan API-toluna sem "manual",
             sem er beinlinis rangt. Nu er hun geymd sem {p, src:"api"} OG
             handskradar faerslur eru latnar i fridi.                       */
          /* LESID UR `prev` INNI I UPPFAERSLUNNI, ekki ur lokun.
             Effectinn hangir adeins a [entryId, gw], svo `buyPrices` ur
             lokuninni vaeri UREL — og tha hefdi "ekki yfirskrifa handskrad"
             lesid gamalt astand. Funksjonal uppfaersla ser alltaf thad nyjasta. */
          const apiPrices = d.picks
            .filter(p => p.purchase_price != null)
            .map(p => [p.element, p.purchase_price]);
          if (apiPrices.length) setBuyPrices(prev => {
            const next = { ...prev };
            for (const [id, price] of apiPrices) {
              const cur = prev[id];
              if (cur && typeof cur === "object" && cur.src === "manual") continue;
              next[id] = { p: price, src: "api" };
            }
            return next;
          });
          const c = d.picks.find(p => p.is_captain);
          const v = d.picks.find(p => p.is_vice_captain);
          if (c) setCaptain(c.element);
          if (v) setVice(v.element);
          /* STADFESTING A ThVI SEM SKIPTIR: lidid UPPFAERDIST. */
          setConn(cc => ({ ...cc, state:"picks", picks:true,
            msg: interp("Connected ✓ — {0} players fetched from FPL for gameweek {1}.", [d.picks.length, gw]) }));
        }
      } catch { if (alive) { setTotalPts(null); setGwPts(null); } }
    })();
    return () => { alive = false; };
    /* ============================================================
       `liveTick` KOM I DEPS ThEGAR „Refresh"-TAKKINN FOR (21.8.2026)
       ============================================================
       Takkinn var fjarlaegdur ur hausnum ad beidni notandans, svo aðrar
       leidir ad ferskum tolum urdu ad vera taldar UPP adur en hann for.
       MAELT A KODANUM ADUR EN NOKKRU VAR BREYTT — hann gat hvort ed er
       ekki endurnyjad hopinn:
         · `connectUrl` byrjar a `if (!raw)` og `urlInput` er ALDREI
           vistadur, svo eftir endurhledslu gaf „Refresh" villuna
           „Paste your FPL link or team ID." og ekkert annad.
         · Hefdi reiturinn verid fylltur kallar hann `setEntryId(id)` med
           SAMA gildi — React sleppir tha endurteikningu og ThESSI effect
           keyrir EKKI. Hann sotti `fpl-entry` (nafnid), aldrei `picks`.
       Takkinn var thvi merki um endurnyjun sem gerdist ekki — akkurat
       „absence rendered as success". Nu er endurnyjunin RAUNVERULEG og
       sjalfvirk: `liveTick` tikkar a 60 s medan leikur er i gangi (sja
       `live?.any_live`), sem er nakvaemlega thad tímabil sem stig, banki
       og refsing HREYFAST. Utan thess eru pikkarnir frosnir og ekkert
       ad endurnyja. Vill hann thvinga sokn — Disconnect og tengja aftur;
       thad nullstillir `entryId` og keyrir thennan effect fra grunni.  */
  }, [entryId, gw, liveTick]);


  // preSeason er reiknað neðar (þarf events) — ref til að buyOf nái í það
  const preSeasonRef = React.useRef(false);

  /* ---------- Andstæðingar: lið þeirra í valdri umferð ----------
     Endurnotar proxy-leiðirnar sem eru ÞEGAR til (fpl-entry, fpl-picks) —
     engin ný Netlify-uppsetning. Nafnið er sótt einu sinni per andstæðing;
     picks fylgja valdri umferð. Fyrir tímabil skilar picks 404 (ekkert lið
     skráð enn) — þá sýnum við nafnið og bíðum.                            */
  useEffect(() => {
    if (!PROXY_URL || !rivals.length) return;
    let alive = true;
    (async () => {
      for (const r of rivals) {
        try {
          let name = rivalData[r.id]?.name;
          if (!name) {
            const e = await (await fetch(`${PROXY_URL}?path=fpl-entry&id=${r.id}`)).json();
            name = e?.name || e?.player_first_name
              ? `${e.name ?? ""}${e.player_first_name ? ` (${e.player_first_name})` : ""}`.trim()
              : interp("team {0}", [r.id]);
          }
          let picks = null, gwPts = null, totalPts = null, capId = null;
          try {
            const d = await (await fetch(`${PROXY_URL}?path=fpl-picks&id=${r.id}&gw=${gw}`)).json();
            if (Array.isArray(d?.picks) && d.picks.length) {
              picks = d.picks.map(x => x.element);
              capId = d.picks.find(x => x.is_captain)?.element ?? null;
              gwPts = d?.entry_history?.points ?? null;
              totalPts = d?.entry_history?.total_points ?? null;
            }
          } catch {}
          if (alive) setRivalData(prev => ({ ...prev, [r.id]: { name, picks, capId, gwPts, totalPts } }));
        } catch {
          if (alive) setRivalData(prev => ({ ...prev, [r.id]: { name: interp("team {0}", [r.id]), error: true } }));
        }
      }
    })();
    return () => { alive = false; };
  }, [rivals, gw]);

  /* ============================================================
     ID-GERDIN VERDUR AD VERA EIN — TVITEKNINGARVORNIN BROTNADI VID
     ENDURHLEDSLU (25.8.2026)

     `addRival` geymdi id sem **STRENG** (regex skilar streng) en
     hreinsarinn i `loadState` (`rowArr(s.rivals, ["id"])`) thvingar
     hvert `id` i **TOLU** vid hleðslu. Eftir endurhleðslu bar listinn
     thvi tolur medan nyja gildid var strengur, og `r.id === id` er
     `false` fyrir `606 === "606"`. Utkoman: sami andstaedingur tvitekinn,
     TVEIR React-hnutar med SAMA `key`, og eyðingartakkinn
     (`x.id !== r.id`) hegdar ser oreiðanlega thvi hann sier tvo hluti
     sem eru "sami" fyrir notandanum en ekki fyrir `!==`.

     LEYST A GEYMSLU-FORMINU, EKKI I SAMANBURDINUM: id er geymt sem TALA
     hedan i fra, sem er nakvaemlega thad sem hreinsarinn skilar. Vaeri
     adeins samanburdinum breytt (`String(a) === String(b)`) vaeri
     listinn afram BLANDADUR i minni, og naesta fullyrding sem gleymir
     ad umbreyta myndi endurvekja villuna. Ein gerd, einn samanburdur.

     Eldri vistud blob bera strengi — thau fara gegnum `rowArr` vid
     hleðslu og koma ut sem tolur, svo thau lagast sjalf.
     ============================================================ */
  function addRival() {
    const m = rivalInput.match(/entry\/(\d+)/) || rivalInput.match(/^(\d+)$/);
    if (!m) { flash("Rival URL or team ID — e.g. 606 or .../entry/606/"); return; }
    const id = Number(m[1]);
    if (!Number.isFinite(id)) { flash("Rival URL or team ID — e.g. 606 or .../entry/606/"); return; }
    if (rivals.some(r => Number(r.id) === id)) { flash("Already on the list."); return; }
    if (id === Number(entryId)) { flash("That is your own team."); return; }
    setRivals(rs => [...rs, { id }]); setRivalInput("");
  }

  /* ---------- Afleidd gögn ---------- */
  /* ---------- TÍMABILS-STAÐA — verður að vera SNEMMA ----------
     Uppsafnaðar tölur í players.json (spjöld, mínútur, byrjanir, stig) eru
     frá FYRRA tímabili þar til umferð er lokin. Þessi tvö flögg ákveða hvort
     þær megi lesa sem yfirstandandi — og margt neðar þarf þau, svo þau eru
     skilgreind hér, ekki hjá preSeason.                                     */
  /* Fostu-leikatriða rodun INNAN LIDS — reiknud einu sinni, notud af
     `setPieceOf` (sja thar hvers vegna FPL-tolan er ekki nog).          */
  const spRanks = useMemo(() => setPieceRanks(players || []), [players]);
  /* EIN KLUKKA — utfaerslan er i `availability.js`, ekki her. Hun var
     `events.some(e => e.finished)` og svaradi ODRU en PlayerList a lifandi
     gognum 24.8.2026; sja maelinguna vid `seasonHasStarted`.             */
  const seasonStarted = seasonHasStarted(events);
  /* HVE MARGAR UMFERDIR ERU BYRJADAR — SAMA KLUKKA, EKKI NY. `seasonStarted`
     er `startedGameweeks(...) > 0`, svo talan sjalf er thegar til i
     `availability.js` og er flutt inn her. Ny talning (`e.finished`,
     `is_current`, frestur) vaeri fjorda afritid af klukkunni og thau tvo
     sem voru til svorudu SITTHVORU 24.8.2026.                           */
  const startedGws = startedGameweeks(events);
  const seasonGames = (events || []).filter(e => e.finished).length;
  /* LEIKIR SEM HVERT FELAG HEFUR SPILAD — NEFNARINN I `rotationRisk`.
     `seasonGames` telur umferdir sem eru `finished`, og hun er RETT thar
     sem hun er notud annars stadar (uppsafnadar tolur eru bundnar vid
     stadfestar umferdir). Hun er hins vegar RANGUR NEFNARI fyrir hlutfall
     byrjana: umferd telst ekki `finished` fyrr en bonus er stadfestur, svo
     eftir GW1 var hun 0 medan sex leikir voru spiladir — og
     `rotationRisk` deildi ThESSA timabils byrjunum med 38 leikjum SIDASTA
     timabils. Sja blokkina i `availability.js`.                          */
  const playedByClub = useMemo(() => matchesPlayedByClub(fixtures), [fixtures]);
  /* ---- EIN KLUKKA, EKKI FJORAR ----
     „Er umferd g byrjud?" er sama spurning og `preSeason` svarar fyrir
     GW1, og hun a ad hafa EITT svar. Fresturinn er profsteinninn (ekki
     `finished`): umferd sem er I GANGI hefur setta uppstillingu, og hun
     er thad sem „hef eg verid ad nota hann?" les.
     `preSeason` nedar er nu skilgreind UT FRA thessu falli.             */
  const deadlinePassed = useCallback(g => {
    const e = (events || []).find(x => x.id === g);
    return e?.deadline_time ? Date.now() >= new Date(e.deadline_time).getTime() : false;
  }, [events]);

  const byId = useMemo(() => {
    const m = {}; (players || []).forEach(p => m[p.id] = p);

    // Fersk gögn úr hraða cron-inu (30 mín) yfirskrifa daglegu myndina.
    // Þannig sérðu meiðslafrétt sem barst fyrir hálftíma, ekki í gær.
    (news?.players || []).forEach(n => {
      if (!m[n.id]) return;
      m[n.id] = { ...m[n.id],
        status: n.status, news: n.news, news_added: n.news_added,
        chance_of_playing_next_round: n.chance_next,
        chance_of_playing_this_round: n.chance_this,
        now_cost: n.now_cost, cost_change_event: n.cost_change_event,
        transfers_in_event: n.transfers_in_event, transfers_out_event: n.transfers_out_event,
        selected_by_percent: n.selected_by_percent,
      };
    });
    return m;
  }, [players, news]);

  /* ---------- Sjálfvirk kaupverðs-greining ----------
     Þegar liðið kemur úr FPL-slóðinni berum við það við það sem við sáum síðast.
     Nýr leikmaður = hann var keyptur síðan síðast -> skráum verð hans í dag.
     Þetta gerir kaupverðin réttari með tímanum án að þú þurfir að slá þau inn. */
  useEffect(() => {
    if (!squadOverride || !players) return;
    const today = new Date().toISOString().slice(0, 10);
    setBuyPrices(prev => {
      const next = { ...prev };
      let changed = false;
      for (const s of squadOverride) {
        if (next[s.id] != null) continue;                  // þegar skráð
        const cost = byId[s.id]?.now_cost;
        if (cost == null) continue;
        // ef við plönuðum þennan mann, notum verðið sem við sáum þá
        const planned = plan.find(t => t.inId === s.id && t.seenPrice != null);
        next[s.id] = planned
          ? { p: planned.seenPrice, src: "auto", date: planned.seenAt }
          : { p: cost, src: "auto", date: today };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [squadOverride, players, byId, plan]);
  const teamById = useMemo(() => {
    const m = {}; (teams || []).forEach(t => m[t.id] = t); return m;
  }, [teams]);
  /* `crestFor` VAR HER OG ER FARID (11.8.2026): thraedd sem prop inn i
     FfdrTable, PlayerCard og RecCard — og NOTUD I ENGRI theirra (0 tilvik i
     ollum thremur foll-likomum). `Crest` byggir sina eigin slod ur
     `crestUrl`/`CREST_FALLBACK`, sem stada afram thvi Crest notar thau.   */

  const maxGw = events ? events.length : 38;

  /* tímalínu-glugginn fylgir valdri umferð ef hún fer út fyrir hann.
     ATH: verður að vera EFTIR maxGw — TDZ annars.                          */
  useEffect(() => {
    setTlStart(v => {
      if (gw < v) return Math.max(1, gw - 1);
      if (gw > v + tlWindow - 1) return Math.min(Math.max(1, maxGw - tlWindow + 1), gw - tlWindow + 2);
      return v;
    });
  }, [gw, maxGw, tlWindow]);

  // Leikir per lið per umferð
  const fixByTeamGw = useMemo(() => {
    const m = {};
    (fixtures || []).forEach(f => {
      if (!f.event) return;
      const add = (tid, oppId, home, fdr) => {
        m[tid] = m[tid] || {};
        (m[tid][f.event] = m[tid][f.event] || []).push({
          opp: oppId, home, fdr, kickoff: f.kickoff_time, id: f.id,
        });
      };
      add(f.team_h, f.team_a, true, f.team_h_difficulty);
      add(f.team_a, f.team_h, false, f.team_a_difficulty);
    });
    return m;
  }, [fixtures]);

  /* `fixturesOfGw` VAR HER OG ER FARID (11.8.2026): useMemo sem raðadi
     leikjum umferdarinnar og var ALDREI LESID (eitt tilvik i skranni =
     skilgreiningin sjalf). Leikjalistinn i GW-flipanum byggir sina eigin
     rod i `GwFixtureList`. Daudur useMemo er ekki bara rusl — hann keyrir
     vid hverja breytingu a `fixtures`/`gw` og les eins og hann matti mali. */
  // Lið-mælikvarðar úr opinberum gögnum (sl. tímabil)
  /* LIDSVISARNIR BUA I `src/teamstats.js` (12.8.2026) — sja thar hvers vegna
     their voru fluttir: spa-bokhaldid tharf SOMU tolur og skjarinn, og afrit
     af thessum utreikningi gaf `NaN` merkt sem maeling. */
  const teamMetrics = useMemo(
    () => buildTeamMetrics({ players, teams, promoted, teamForm }),
    [players, teams, promoted, teamForm]);

  // ---- ClubElo styrkur per lið ----
  /* Landsleikjahle REIKNAD ur leikjadagsetningum — sja intlBreaks(). */
  const breaks = useMemo(() => intlBreaks(fixtures), [fixtures]);
  /* EVROPUVIKUR — leikir sem falla i bilid a eftir umferd n.
     BIRTING, EKKI LIKAN: evropualag maeldist −1,37pp med CI sem inniheldur
     null (MAELINGAR 6k) og fer thvi hvergi inn i FFDR. Sja model.js.    */
  const euroGw = useMemo(() => euroWeeks(fixtures, euroFx), [fixtures, euroFx]);
  /* Hvada lid eru i Evropu i ar. `participation` virkar THOTT leikir seu
     odregnir — i agust er thetta eina evropu-merkid sem er til.         */
  const euroIn = useMemo(() => euroTeams(euroFx), [euroFx]);

  const eloByTeam = useMemo(() => {
    const m = {};
    (elo?.teams || []).forEach(t => m[t.fpl_id] = t);
    return m;
  }, [elo]);

  // ---- Veður per leik ----
  const weatherByFx = useMemo(() => {
    const m = {};
    (weather?.fixtures || []).forEach(w => m[w.fixture_id] = w);
    return m;
  }, [weather]);
  /* Ferðalengd útiliðsins (loftlína milli leikvanga, ≥300 km = langferð).
     VAR REIKNUÐ DAGLEGA í pipeline en birtist hvergi — nú á leikjaröðum. */
  const travelByFx = useMemo(() => {
    const m = {};
    (travel?.fixtures || []).forEach(t => m[t.fixture_id] = t);
    return m;
  }, [travel]);
  /* Meiðsla-TEGUNDIN úr API-Sports. FPL-status ræður áfram tiltækileika
     (a/d/i/s + %-líkur) — þetta svarar bara "HVAÐ er að honum?".        */
  const injuryById = useMemo(() => {
    const m = {};
    (injuries?.players || []).forEach(x => { if (!m[x.fpl_id]) m[x.fpl_id] = x; });
    return m;
  }, [injuries]);
  const weatherReady = useMemo(() =>
    (weather?.fixtures || []).some(w => w.temp_c != null), [weather]);

  // ---- ClubElo CS-líkindi per leik (ókeypis, úr úrslitalíkindum) ----
  const eloCsByFx = useMemo(() => {
    const m = {};
    (eloFx?.fixtures || []).forEach(f => {
      if (f.home_fpl) m[`${f.home_fpl}|${f.date}`] = { cs: f.cs_home, xg: f.xg_home, win: f.p_home };
      if (f.away_fpl) m[`${f.away_fpl}|${f.date}`] = { cs: f.cs_away, xg: f.xg_away, win: f.p_away };
    });
    return m;
  }, [eloFx]);

  // ---- DefCon-tækifæri per lið ----
  // Úr pipeline ef til, annars reiknað hér úr sömu opinberu gögnum.
  // Rök: mikið vinnuálag varnar -> fleiri CBIT -> fleiri DefCon-stig.
  // AÐSKILINN mælikvarði frá CS% — þeir draga í gagnstæða átt.
  const dcOpp = useMemo(() => {
    if (defcon?.opportunity && Object.keys(defcon.opportunity).length) {
      const m = {};
      Object.entries(defcon.opportunity || {}).forEach(([tid, o]) => m[tid] = o);
      return m;
    }
    if (!players || !fixtures || !teams) return {};
    const m = {};
    teams.forEach(t => {
      const tid = t.id;
      const own = teamMetrics[tid]?.xgc90 ?? 1.4;
      const up = fixtures.filter(f => !f.finished && (f.team_h === tid || f.team_a === tid)).slice(0, recRange);
      let s = 0;
      // sóknarstyrkur andstæðinga úr teamMetrics (xG, með nýliða-fallback)
      up.forEach(f => { const o = f.team_h === tid ? f.team_a : f.team_h; s += (teamMetrics[o]?.xg90 ?? 1.4); });
      const oa = up.length ? s / up.length : 1.4;
      m[tid] = {
        own_xgc90: own, opp_attack_avg: +oa.toFixed(2),
        defcon_opportunity: clamp(Math.round(own * 22 + oa * 20), 0, 100),
        fixtures_used: up.length,
      };
    });
    return m;
  }, [defcon, players, fixtures, teams, teamMetrics, recRange]);

  /* ---- SAMSETT LEIKJAÞYNGD ----
     MÆLT á 544 lið-leikjum (fyrra tímabil spáir næsta, ekkert leki):
       FDR eitt                    r = +0,218
       vörn/sókn án FDR            r = +0,174   <- verra
       FDR + vörn + sókn andst.    r = +0,247   <- BEST
     Vogtölur 0,45 / 0,35 / 0,20 úr mælingunni. Skilar 1-5 kvarða eins og
     FDR svo litamörkin haldast, en er 13% skarpari.
     Vogtölur eru MÆLDAR per stöðu — sjá DIFF_W. Varnar-umbreyting notar
     eigin vörn + sókn andstæðings; sóknar-umbreyting eigin sókn + vörn
     andstæðings. Mælingin setti GK, DEF OG MID á varnar-umbreytinguna.   */
  /* FFDR-fallið sjálft býr í src/model.js — prófin og bakprófunin keyra
     NÁKVÆMLEGA sama kóða. Hér er það aðeins bundið við gögn appsins.    */
  const fixDifficulty = useMemo(
    () => makeFixDifficulty({ teamMetrics, teamById, odds, eloByTeam }),
    [teamMetrics, teamById, odds, eloByTeam]);

  /* ---- AFSTÆTT FFDR ----
     VANDAMÁL sem mældist: eigin-styrkur vegur 0,55, svo bilið FÆRIST með
     liðsstyrk. Leeds-framherji fær 2,61-4,20 og sér ALDREI grænt, sama hve
     léttur andstæðingurinn er. Man City fær 1,77-3,36.

     Það er rétt sem STIGASPÁ (Leeds-framherji skorar minna) en gagnslaust
     sem LEIKJA-SAMANBURÐUR — liturinn segir hvaða liði maðurinn er í.

     Lausn: TVEIR kvarðar, hvor fyrir sína spurningu.
       ALGILT   — hvern á ég að kaupa?  (samanburður milli liða) -> FFDR-tafla
       AFSTÆTT  — hvenær á ég að spila honum? (innan liðs) -> leikja-flísar
     Afstætt raðar 38 leikjum liðsins í sex jafnstóra flokka.                */
  /* AFSTÆÐ ÞREP INNAN LIÐS VORU FJARLÆGÐ 28.7.2026 (ffdrRange + tierRel).
     Þau þvinguðu hvert lið til að nota alla sex litina, svo Arsenal fékk
     "rautt" á leik sem er algilt dökkgult. MÆLT á 28.355 byrjunarliðs-
     umferðum: algilt þrep spáir stigum leikmanns MARKTÆKT betur en afstætt
     (DEF −0,267 á móti −0,190; ~30% af merkinu fór til spillis).
     Spjöld og tillögur eru því algild — sjá tests/ffdr-player-points.mjs
     kafla E, sem er vörðurinn. Ekki setja afstæð þrep inn aftur án þess
     að sú mæling segi annað.                                            */


  // CS-mat: bókmakarar ef til, annars afleitt úr FDR + xGC (opinber gögn)
  function csFor(teamId, fx) {
    const short = teamById[teamId]?.short;
    const bk = odds && short && odds[short];
    // Bókmakara-línan gildir AÐEINS um þann leik sem hún var sett fyrir.
    // Staðfestum gegn mótherja + dagsetningu — annars notum við aðrar heimildir.
    const bkValid = bk && Number.isFinite(bk.cs) && fx &&
      teamById[fx.opp]?.short === bk.opp &&
      (!fx.kickoff || !bk.kickoff || fx.kickoff.slice(0,10) === bk.kickoff.slice(0,10));
    if (bkValid) return { cs: bk.cs, src: "bookie" };
    // ClubElo úrslitalíkindi (ókeypis, engin Odds-credit)
    if (fx?.kickoff) {
      const key = `${teamId}|${fx.kickoff.slice(0,10)}`;
      const e = eloCsByFx[key];
      if (e && Number.isFinite(e.cs)) return { cs: Math.round(e.cs), src: "elo" };
    }
    if (!fx) return { cs: null, src: null };
    /* LÍKINDALÍKAN, EKKI UPPFLETTITAFLA. Var `lookupPos(2,"cs", FFDR)`,
       sem þjappaði öllu í eitt d á 1–5 kvarða og las 5-punkta töflu.
       MÆLT á 10.640 lið-leikjum (14 tímabil, LOSO): logistic á inntökin
       gefur skill 5,94% á móti 3,91%, halla +0,0pp á móti +2,3pp og
       meðalfrávik 1,1pp á móti 2,3pp. ΔBrier +0,00569 með
       öryggisbili [+0,00555, +0,00584] — marktækt.
       Staðfest sjálfstætt: Fable-lota fékk sama form á öðru úrtaki.
       Sjá cleanSheetProb í model.js og tests/cs-logistic.mjs.          */
    const me = teamMetrics[teamId], op = teamMetrics[fx.opp];
    if (me && op) {
      const myElo = eloByTeam[teamId]?.elo, opElo = eloByTeam[fx.opp]?.elo;
      const p = cleanSheetProb({
        ownXgc: me.xgc90, oppXg: op.xg90, home: !!fx.home,
        eloDiff: (myElo && opElo) ? (opElo - myElo) / 100 : 0,
        fdr: fx.fdr,
      });
      if (Number.isFinite(p)) return { cs: clamp(Math.round(100 * p), 3, 70), src: "probability" };
    }
    /* Neyðarvara ef liðstölur vanta alveg (t.d. nýliði án grunnlínu). */
    const d2 = fixDifficulty(teamId, fx, 2) ?? fx.fdr;
    const raw = lookupPos(2, "cs", d2);
    if (!Number.isFinite(raw)) return { cs: null, src: null };
    return { cs: clamp(Math.round(raw), 3, 70), src: "measured" };
  }
  // Vænt mörk á sig
  /* `xgaFor` VAR HER OG ER FARID (11.8.2026): reiknadi vaent mork a sig fyrir
     lid i leik (markadslina, annars maelda FDR-taflan) og var thraett sem
     prop inn i PlayerCard — sem notadi hana ALDREI. Spjaldid birtir CS%
     (`csFor`), ekki xGA. Fallid las `odds`, `teamById`, `fixDifficulty` og
     `lookupMeasured`, svo thad LAS EINS OG BURDARVIRKI en var enda-lokad.  */
  // Team xG (sóknar-vænting liðsins í þessum leik)

  /* ---------- Sameinaður leikjalisti: deild + Evrópa + bikar ---------- */
  function allFixturesFor(teamId, fromGw = 1, count = 10) {
    const pl = (fixtures || [])
      .filter(f => (f.team_h === teamId || f.team_a === teamId) && f.event && f.event >= fromGw)
      .map(f => ({
        kind: "pl", id: f.id, gw: f.event, date: f.kickoff_time,
        opp: f.team_h === teamId ? f.team_a : f.team_h,
        home: f.team_h === teamId,
        fdr: f.team_h === teamId ? f.team_h_difficulty : f.team_a_difficulty,
      }));
    const extra = ((euroFx?.by_team || {})[teamId] || []).map(x => ({
      /* ENSKT HEITI — `comp_label` i skranni er ISLENSKT ("Ofurbikar",
         "Meistaradeild") og thetta er BIRT i leikjalistanum. Sja compLabel(). */
      kind: "cup", comp: x.comp, label: compLabel(x), date: x.date,
    }));
    return [...pl, ...extra]
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .slice(0, count);
  }

  /* ---------- UMFERÐIR MEÐ TILTEKNU CHIPI ----------
     Lyklarnir i `chips` heita `"<nafn>:<START>"` (sja `chipSlots`), svo
     nafnid er lesid UR LYKLINUM og thetta tharf hvorki `chipSlots` ne
     `chipAt` — sem er nauðsynlegt her, thvi bæði eru skilgreind LANGT
     nedar (const-TDZ) en `squadForGw` og vollurinn thurfa svarid her.
     `split(":")[0] === name` i stad `startsWith(name)`: "bboost" er ekki
     forskeyti neins annars chips i dag, en forskeyta-samanburdur er hlid
     sem opnast thegjandi ef FPL bætir vid chipi sem byrjar eins.
     EIN utfaersla fyrir bædi Free Hit og Bench Boost — afritud lykkja er
     tvaer lykkjur sem reka i sundur (sbr. `buildTeamMetrics`, kafli 7).  */
  const gwsWithChip = useCallback(name => new Set(
    Object.entries(chips).filter(([k]) => k.split(":")[0] === name).map(([, g]) => g)
  ), [chips]);
  /* FREE HIT: skipti gerd i Free Hit-umferd gilda ADEINS i theirri umferd —
     lidid fer sjalfkrafa til baka eftir hana.                            */
  const fhGws = useMemo(() => gwsWithChip("freehit"), [gwsWithChip]);
  /* BENCH BOOST: bekkurinn skorar lika, svo ALLIR 15 fara a vollinn i
     theirri umferd (beidni notandans 20.8.2026).                        */
  const bbGws = useMemo(() => gwsWithChip("bboost"), [gwsWithChip]);

  /* ---------- Lið í TILTEKINNI umferð — EIN ÚTFÆRSLA ----------
     Þessi lykkja stóð ÞRISVAR áður en „þú notar hann aldrei" bættist við
     (`squadAt`, `chipValue`, og hún hefði orðið þriðja afritið). Afrituð
     útfærsla er ekki stílspurning hér: `buildTeamMetrics`-atvikið (kafli 7)
     var nákvæmlega þetta — afritið skrifaði NaN fyrir öll 17 liðin og
     merkti það `src:"e0"` eins og það væri mæling, meðan frumritið var
     alltaf rétt. Bæði `squadAt` og áætlunar-skönnunin lesa nú þetta.   */
  /* `withArrangement = false` sleppir BEKKJAR-VIXLUNUM en heldur skiptunum.
     ThAD ER EKKI SNYRTING: „hefur hann stillt upp fyrir thessa umferd?"
     er spurning um UPPSTILLINGU, og GW1-valin breyta ID-um i sömu SAETUM.
     Adur var svarid fundid med thvi ad bera byrjunarlidid vid `START_SQUAD`
     — svo hopur sem hann var BUINN AD VELJA i GW1 mældist sem „hann hefur
     stillt upp GW3-8", sem er nakvaemlega kaeran (sja `unusedPlan`).     */
  /* ============================================================
     FOLDIN SJALF ER ADFLUTT — `applyPlan` I `model.js` (21.8.2026)
     ============================================================
     Lykkjan sem stod her (og AFRIT hennar i `bank`) lagdi UPPHAFSLIDS-
     valin ofan a raunlidid ur FPL og fleygdi thogult hverri rod sem ekki
     var haegt ad beita. Baedi vandamalin — og maelingin sem sannadi thau
     (Saliba i stad White, banki -1,5 i stad +0,5) — eru skjolud vid
     `applyPlan`. Her er ADEINS tengingin og UPPSTILLINGIN.
     `official: !!squadOverride` er reglan i einu orði: **er raunlidid
     komid?** Ef svo er ER thad upphafslidid, svo GW1-valin eru ofaukin;
     GW2+ leggjast afram a thad, thvi thad er allur punkturinn i plonun. */
  const squadForGw = useCallback((g, withArrangement = true) => {
    let sq = applyPlan({ base: squadOverride || START_SQUAD, plan, gw: g,
                         fhGws, official: !!squadOverride }).seats;
    /* ============================================================
       UPPSTILLINGIN ERFIST FRAM — SIDASTI SKYRI LYKILL, EKKI FOLD
       (20.8.2026)
       ============================================================
       Notandinn: „Eg vill ad gameweek se auto eins og gameweek var a
       undan, nema eg se buinn ad breyta einhverju sjalfur."

       ADUR: lykkjan hér fyrir ofan foldar SKIPTIN (`tr.gw <= g`) en
       bekkjar-vixlin lasu ADEINS `benchSwaps[g]` — eina umferd. GW5
       opnadist thvi eins og GRUNNHOPURINN, ekki eins og GW4, svo
       bekkjar-breyting i GW2 „gufadi upp" i GW3.

       FYRSTA LAGFAERINGIN VAR FOLD (`benchSwaps[1..g]` lagt saman) OG HUN
       VAR HAETTULEG. Undir GAMLA merkingunni var EINA leidin til ad hafa
       mann a bekknum i GW1-6 ad skra SOMU vixlin i allar sex umferdirnar
       — og fold gerir sex eins faerslur ad VIXLARA:
         6 eins faerslur   OLD bbbbbb   FOLD bSbSbS
       Notandinn hefdi thvi opnad appid i lid sem hann valdi aldrei. Og
       tvibendan er OLEYSANLEG: `{1:[[A,B]], 2:[[A,B]]}` er BAEDI gamalt
       „a bekknum badar umferdir" OG nytt „a bekkinn i GW1, TIL BAKA i
       GW2" — sama gildi, tvaer merkingar, og blobbid ber engan stimpil.
       Engin sameiningar-regla getur greint thau; su sem verdur sem
       „gamalt" EYDIR visvitandi vixlara, og su sem verdur sem „nytt"
       eydir lidinu hans. `data/` laeknar sig i naestu sokn, en blobbid
       „er i vafranum og fer hvergi".

       ThVI ER REGLAN: SIDASTI SKYRI LYKILL <= g, LAGDUR A GRUNNINN.
       Umferd sem HEFUR lykil er thvi BYTE-EINS og hun var; adeins
       LYKILLAUSAR umferdir breytast, og their voru einmitt kaeran (thaer
       fellu i grunnhopinn). ENGIN SKYR AKVORDUN NOTANDANS ER
       ENDURTULKUD — og thess vegna tharf ENGA sameiningu, engan stimpil
       og enga agiskun.

       MAELT A FJORUM BLOB-GERDUM (`decide.mjs`, umferd sem HEFUR lykil):
         gerd                sidasti-lykill   fold
         6 eins faerslur     OBREYTT          ENDURTULKUD
         1 faersla           OBREYTT          OBREYTT
         gluffa {1,3}        OBREYTT          ENDURTULKUD
         visvitandi vixlari  OBREYTT          ENDURTULKUD
       4/4 a moti 1/4. Og jafngildid sem beðið var um fæst FRITT:
       `{1..6:[[A,B]]}` og `{1:[[A,B]]}` gefa BADAR `bbbbbb`.

       TOM FYLKING TELST EKKI SKYR LYKILL: undir gomlu merkingunni gaf
       `[]` grunninn — nakvaemlega thad sama sem VANTANDI lykill gaf — svo
       hun ber engan greinanlegan asetning, og stok tom fylking ur
       skemmdu blobbi mundi ella FRYSTA grunn-uppstillinguna um allt
       tímabilid.

       EKKERT ER MATERIALISERAD VID LESTUR. Ad skrifa uppstillingu GW5 inn
       i `benchSwaps` thegar hann bara SKODAR GW5 vaeri ad breyta lestri i
       ritun og gera spurninguna „hefur hann breytt einhverju?"
       OSVARANLEGA. Vid RITUN saedir `swapStarterBench` hins vegar
       umferdina med erfda listanum — sja thar; an thess vaeri hans eina
       vixl lagt a GRUNNINN i stad thess ad leggjast a thad sem hann sa.

       VISTADA GERDIN ER OHREYFD: `benchSwaps` er afram hlutur AF FYLKJUM
       af PORUM, `fpl_planner_v3` afram sami lykill.
       Vordur: `initial-squad.mjs` kafli H (kedjan, afturkollunin,
       jafngildid baðar leidir, og ad ENGU se skrifad vid flakk).       */
    if (withArrangement) {
      /* `Array.isArray` OG `.length`: `benchSwaps` kemur ur `localStorage`
         og `{"1":"x"}` er gildur hlutur sem fellur a `.forEach`
         (CLAUDE.md kafli 8). `objOfArr` i `loadState` ver thetta thegar,
         en hér er lykla-svidid skannad ALLT (1..g) og ekki einn lykill,
         svo thad ma ekki treysta a thad.                              */
      let k = 0;
      for (let j = 1; j <= g; j++) {
        const l = benchSwaps[j];
        if (Array.isArray(l) && l.length > 0) k = j;
      }
      if (k) benchSwaps[k].forEach(pair => {
        if (!Array.isArray(pair)) return;
        const [aId, bId] = pair;
        const ia = sq.findIndex(s => s.id === aId), ib = sq.findIndex(s => s.id === bId);
        if (ia >= 0 && ib >= 0) {
          const t = sq[ia].starter; sq[ia] = { ...sq[ia], starter: sq[ib].starter }; sq[ib] = { ...sq[ib], starter: t };
        }
      });
    }
    return sq;
  }, [plan, benchSwaps, squadOverride, fhGws]);

  /* ---------- Lið í valdri umferð ---------- */
  const squadAt = useMemo(() => squadForGw(gw), [squadForGw, gw]);
  /* Leikmanna-hlutirnir a bak vid saetin. `sellTiming` tharf `team` og
     `element_type` (leikjaskra + stada), svo saetin ein duga ekki. */
  const squadPlayers = useMemo(
    () => squadAt.map(s => byId[s.id]).filter(p => p && p.team != null),
    [squadAt, byId]);
  /* ============================================================
     HVENAER A AD SELJA — SER `useMemo`, EKKI REITUR I `buildRecommendations`
     ============================================================
     Solu-RODUNIN er `score` (MAELT 18.8.2026: `rankScore` gaf -0,118
     CI [-0,328, +0,088], OGREINANLEGT) og TIMASETNINGIN er `hardestRun`.
     Ad leggja thaer saman vaeri OMAELD SAMSETNING tveggja talna a sitt
     hvorum kvarda — sama aett sem CLAUDE.md kafli 4 er kirkjugardur yfir.
     ThVI ER ThETTA SER MEMO OG `buildRecommendations` TEKUR ThAD EKKI INN:
     byggingin sjalf er fullyrdingin. Vordur: `tests/recommend.mjs` kafli 9
     fullyrdir ad `sellTiming` se EKKI kollud thadan og ad solu-rodun se
     BYTE-EINS med og an thessa.
     TALAN ER INNAN LEIKMANNS. Hun ma ALDREI lesast sem thver-leikmanna
     rodun (notandinn las Rice sem "verstan" ur nakvaemlega theirri villu
     20.8.2026), svo hvert svid er birt MED grunni sinum — sja `basis`.  */
  const sellWhen = useMemo(() => sellTiming({
    squad: squadPlayers, gwNow: gw, maxGw, fixByTeamGw, fixDifficulty,
  }), [squadPlayers, gw, maxGw, fixByTeamGw, fixDifficulty]);

  /* ============================================================
     „ThU HEFUR EKKERT VERID AD NOTA HANN" — BADAR ATTIR (21.8.2026)
     ============================================================
     Fra 21.8. skilar thetta TVEIMUR svorum, `fwd` og `back`, og thau eru
     TVAER OLIKAR SPURNINGAR sem MA EKKI LEGGJA SAMAN:
       `back` — STADREYND: „hverja hafdi eg ekki inni?" (umferdir sem eru
                byrjadar). Thogn i forleik, sja regluna hér fyrir nedan.
       `fwd`  — AAETLUN: „hverja aetla eg ekki ad spila naestu 6?"

     FRAMVIRKA UTGAFAN VAR FJARLAEGD 20.8. OG KEMUR NU AFTUR — OG ThAD ER
     EKKI AFTURKOLLUN A THEIRRI AKVORDUN, ThVI FORSENDAN BREYTTIST.
     Kaeran var ALDREI attin: „eg er ekki buinn ad setja upp thessar
     gameweeks, thannig ad thetta comment er ekki alveg rétt." Setningin
     sagdi „as you have them set up" um uppstillingu sem hann hafdi ekki
     gert — SJALFGEFNA uppstillingu, eignada honum. Falsk FORSENDA, ekki
     rong att.
     ERFDIN (20.8., sja `squadForGw`) leysir nakvaemlega thad: GW2-7 BERA
     nu GW1-uppstillinguna hans, svo framvirka svarid er lesid ur HANS
     EIGIN akvordun, ekki ur grunninum. Setningin er thvi ordud eftir
     ThVI SEM VELIN GERDI — „carried forward from your GW1 line-up" — og
     hun er LEIDD (`basis`), ekki skrifud i JSX: sama regla og
     `basis.scale` i „when to sell" og sama gildra sem „4-10 and never
     reach 1" var (fost tala/setning um lifandi gogn).
     OG ThOGNIN ER VARDVEITT ThAR SEM HUN A VID: hafi hann HVORKI skyra
     uppstillingu (`benchSwaps`) NE raunlid ur FPL (`squadOverride`) er
     ekkert til ad erfa, og tha ma spurningin ekki svarast — thad vaeri
     gamla falska forsendan aftur, bara med nyrri setningu.

     Notandinn (20.8.): „Thad vaeri sniduugra ad horfa afturabak, i theirri
     gameweek sem eg er, og segja: thu hefur ekkert verid ad nota thennan
     leikmann eda thessa leikmenn."

     ThETTA ER EKKI SNYRTING A GOMLU UTGAFUNNI HELDUR ONNUR SPURNING, OG
     HUN ER SPURNING SEM MA SVARA. Framvirka utgafan spurdi „hverjir byrja
     i ENGRI af naestu 6 umferdum eins og thu hefur stillt thaer upp" — og
     hann hafdi ekki stillt thaer upp. Svarid var thvi um SJALFGEFNU
     uppstillinguna en setningin eignadi honum hana: omældur FORSENDA i
     stad omældrar tolu, sama aett og kafli 3 og 8 (og sama aett og `st0%`
     — nulltala um mann sem atti engar 38 umferdir).

     AFTURABAK ER STADREYND. Umferd sem er byrjud hefur SETTA uppstillingu;
     hann hafdi thessa ellefu inni og thessa fjora ekki. Villan er thvi
     FJARLAEGD, ekki vardud — og bonusinn er ad thetta er OHAD erfda-
     reglunni (`squadForGw`): sagan tharf enga erfd.

     ThRJAR REGLUR:
       1. GLUGGINN ENDAR I ThEIRRI UMFERD SEM HANN ER I, og aldrei
          seinna en sidasta umferd sem er BYRJUD. Profsteinninn er
          `deadlinePassed` — SAMA klukka og `preSeason` (sja thar), ekki
          fjorda hugmynd um „nuna".
       2. I FORLEIK ER ThETTA ThOGN. Núll umferdir eru spiladar, svo engin
          notkunar-saga er til, og fjarvera ma ekki teiknast sem maeling.
          Fyrsta lesning kemur thvi i GW2 og hun er fyrst gagnleg nokkrum
          umferdum inn.
       3. GOLFID ER TVAER UMFERDIR (og `rarelyStarted` krefst thess lika ad
          hann se i hopnum i sidustu umferd gluggans). EIN umferd ma ekki
          brennimerkja mann sem „onotadan" — hann gat verid meiddur thá
          eina viku.
     ThAKID ER SEX umferdir: nog til ad merkid se raunverulegt, ekki svo
     langt ad madur sem var seldur i GW2 dragi thad med ser allt tímabilid.

     PENINGA-HLIDIN ER OBREYTT og hun var alltaf MAELD ur hopnum sjalfum:
     `priceFloors` (odyrasti bekkjarmadur per stodu er ALDREI nefndur, thvi
     salan losar ekkert fe) og `Array.isArray`-vordurinn i `priceFloors`
     sem stoppadi hrun a ollu appinu (CLAUDE.md 13).                     */
  const unusedPlan = useMemo(() => {
    const WIN = 6, MIN_GWS = 2;
    const floors = priceFloors(players);
    const rowsFor = gws => rarelyStarted({ perGw: gws, byId, floors });
    let lastPlayed = 0;
    for (let g = 1; g <= maxGw; g++) if (deadlinePassed(g)) lastPlayed = g;

    /* ---------- AFTURABAK — OBREYTT REGLA ----------
       „i theirri gameweek sem eg er" — glugginn fylgir timalinu-valinu, en
       getur ALDREI nad yfir umferd sem er ekki byrjud.                   */
    const bTo = Math.min(gw, lastPlayed);
    let back = { rows: [], from: 1, to: bTo, played: bTo, idle: true };
    if (bTo >= MIN_GWS) {
      const bFrom = Math.max(1, bTo - (WIN - 1));
      const gws = [];
      for (let g = bFrom; g <= bTo; g++) gws.push({ gw: g, squad: squadForGw(g) });
      back = { rows: rowsFor(gws), from: bFrom, to: bTo, played: gws.length, idle: false };
    }

    /* ---------- FRAMVIRKT — HANS EIGIN UPPSTILLING, ERFD FRAM ----------
       GLUGGINN SEM ER SAGDUR ER GLUGGINN SEM VAR SKODADUR: `fFrom..fTo`
       er BYGGT her og BIRT thadan, og `played` er longd sama fylkis. Fost
       tala i JSX var einmitt „4-10"-bilunin (CLAUDE.md 8).

       `keyAt(g)` ENDURTEKUR EKKI ERFDA-REGLUNA — hun spyr adeins HVADA
       lykil `squadForGw(g)` mun nota, thvi setningin a skjanum verdur ad
       segja hvadan uppstillingin kom. Beiting reglunnar (vixlin sjalf)
       er AFRAM adeins a einum stad, i `squadForGw`.
       `Array.isArray` OG `.length > 0` eru SOMU tvo skilyrdi og thar —
       tom fylking telst ekki skyr akvordun (sja langa athugasemdina).   */
    /* ============================================================
       FRAMVIRKI GLUGGINN BYRJAR A FYRSTU OLOKNU UMFERD (25.8.2026)

       Notandinn: "Not in your plan's XI — GW1-6, vid natturulega horfum
       ekki a lidnar umferdir."

       Hann hafdi rett fyrir ser og villan var maelanleg: `fFrom` var
       `Math.max(1, gw)`, og `gw` er UMFERDIN SEM ER VALIN i timalinunni —
       ekki naesta oleikna. Med GW1 valda (og spilada) hljodadi kassinn
       "GW1-6" og taldi umferd sem er BUIN inn i "aetlar ad spila".
       Fortidin er `back`-hlutinn; hun a ekki ad birtast tvisvar.

       KLUKKAN ER SU SAMA OG ANNARS STADAR (`deadlinePassed`), ekki ny
       regla: fyrsta umferd sem fresturinn er EKKI runninn ut a.
       Se timabilinu lokid (allar umferdir bunar) er `fFrom > maxGw` og
       glugginn thagnar af sjalfu ser.                                */
    let firstOpen = gw;
    while (firstOpen <= maxGw && deadlinePassed(firstOpen)) firstOpen++;
    const fFrom = Math.max(1, firstOpen), fTo = Math.min(maxGw, fFrom + WIN - 1);
    const keyAt = g => {
      let k = 0;
      for (let j = 1; j <= g; j++) {
        const l = benchSwaps[j];
        if (Array.isArray(l) && l.length > 0) k = j;
      }
      return k;
    };
    const fGws = [];
    for (let g = fFrom; g <= fTo; g++) fGws.push(g);
    const keys = fGws.map(keyAt);
    /* SKYR AKVORDUN INNAN GLUGGANS a moti ERFDRI UTAN HANS. Greiningin er
       LEIDD ur lyklunum sjalfum — „partly explicit, partly inherited" ma
       ekki vera handsveiflad ordalag.                                  */
    const explicit = [...new Set(keys.filter(k => k >= fFrom))].sort((a, z) => a - z);
    const inherited = keys.filter(k => k < fFrom).length;
    const baseKey = keys.length ? Math.min(...keys) : 0;
    /* ENGIN UPPSTILLING TIL -> ThOGN, ekki setning um grunninn. `baseKey`
       0 OG engin skyr akvordun OG ekkert raunlid ur FPL thydir ad
       byrjunarlidid er `START_SQUAD` — sjalfgefid, ekki hans.          */
    const mine = explicit.length > 0 || baseKey > 0 || !!squadOverride;
    let fwd = { rows: [], from: fFrom, to: fTo, played: fGws.length,
                idle: true, basis: null };
    if (mine && fGws.length >= MIN_GWS) {
      const basePart = baseKey > 0
        ? interp("your GW{0} line-up", [baseKey])
        : "your current line-up";
      /* ThRIR HLUTAR, EINN ROKSTUDNINGUR: hvadan gluggin ERFIR, og hvada
         skyru akvardanir liggja INNAN hans. Sidari listinn ma ALDREI
         vera tomur i thogn — fyrsta utgafan sagdi adeins fra FYRSTU
         skyru akvordun og thagdi um thaer sem komu eftir henni, svo
         blobb med breytingu i GW1 OG GW3 las eins og blobb med GW1
         einni. Prófid fann thad (kafli O.3).                          */
      const head = explicit.length === 0
        ? interp("carried forward from {0}", [basePart])
        : inherited === 0
          ? interp("your own GW{0} line-up, carried forward", [explicit[0]])
          : interp("carried forward from {0}", [basePart]);
      const rest = explicit.slice(explicit.length && inherited === 0 ? 1 : 0);
      const basis = rest.length === 0 ? head
        : interp("{0}, plus your own {1} in {2}",
                 [head, rest.length === 1 ? "change" : "changes",
                  rest.map(k => `GW${k}`).join(", ")]);
      const gws = fGws.map(g => ({ gw: g, squad: squadForGw(g) }));
      fwd = { rows: rowsFor(gws), from: fFrom, to: fTo,
              played: gws.length, idle: false, basis };
    }
    return { fwd, back };
  }, [squadForGw, deadlinePassed, gw, maxGw, byId, players, plan, benchSwaps, squadOverride]);

  const squadIds = useMemo(() => new Set(squadAt.map(s => s.id)), [squadAt]);
  /* ThRJAR NAESTU UMFERDIR fyrir spjaldid — fylking PER UMFERD (tom = auð,
     tveir = tvofold). Klippt vid maxGw svo sidustu umferdir gefi ekki
     draugaumferdir.                                                      */
  const nextGwFixtures = useCallback((teamId, from) => {
    const out = [];
    for (let g = from; g < from + 3 && g <= maxGw; g++)
      out.push(fixByTeamGw[teamId]?.[g] || []);
    return out;
  }, [fixByTeamGw, maxGw]);
  /* STADFEST BYRJUNARLID per umferd. Adeins fyrir tha umferd sem lineups.json
     naer til (leikur innan gluggans); annars tomt og spjaldid syn ekkert. */
  const lineupBy = useMemo(() => {
    const m = {};
    for (const r of (lineups?.players || []))
      if (r?.fpl_id != null) m[`${r.fpl_id}|${r.gw}`] = !!r.started;
    return m;
  }, [lineups]);
  const officialIds = useMemo(() => new Set((squadOverride || START_SQUAD).map(s => s.id)), [squadOverride]);
  /* GRAENI RAMMINN = „ThESSI MADUR ER NYKOMINN INN". GW1-VALIN ERU EKKI
     ThAD (20.8.2026). Notandinn: „Thegar eg er kominn i gameweek 2, er enn
     graenn border utan um kallana, eins og eg hafi verid ad skipta theim
     ut." `t.gw <= gw` er RETT um skipti (skipti i GW2 sest afram i GW5 —
     hann er enn nykominn samanborid vid opinbera hopinn) en GW1-valin eru
     UPPHAFSLIDID og verda aldrei „nykomin". Reglan er EIN og hun er i
     `model.js` — sja `isInitialSquadPick`, sami predikatinn sem
     skiptaaetlunin les.                                                  */
  const plannedIn = useMemo(() => new Set(
    plan.filter(t => t.gw <= gw && !isInitialSquadPick(t)).map(t => t.inId)), [plan, gw]);

  /* ============================================================
     HVAD VAR RAUNVERULEGA BEITT — OG HVAD EKKI (21.8.2026)
     ============================================================
     `planFold` er SAMA kall sem vollurinn gerir fyrir valda umferd, svo
     bankinn og talningin geta ekki sagt annad en vollurinn syn.
     `planStatus` svarar sömu spurningu PER ROD, og hun er ekki reiknud
     med nyrri reglu heldur med thvi ad kalla `applyPlan` einu sinni per
     umferd sem aaetlunin nefnir og lesa ur hvorum lista rodin kom.
     Ein utfaersla, tveir lesendur — sbr. `buildTeamMetrics` (kafli 7).
     LYKILLINN ER HLUT-TILVISUNIN sjalf (`Map` a rod-hlutinn), ekki
     `gw:out:in`-strengur: tvaer EINS radir eru leyfilegar i `plan` og
     strengja-lykill hefdi latid thaer deila stodu — su fyrri BEITT og su
     seinni SLEPPT er raunverulegt astand (kedjan sem villuna sannadi). */
  const planFold = useMemo(() => applyPlan({
    base: squadOverride || START_SQUAD, plan, gw, fhGws, official: !!squadOverride,
  }), [squadOverride, plan, gw, fhGws]);
  const planStatus = useMemo(() => {
    const m = new Map();
    const gws = [...new Set(plan.map(t => Number(t?.gw)).filter(Number.isFinite))]
      .sort((a, z) => a - z);
    for (const g of gws) {
      const f = applyPlan({ base: squadOverride || START_SQUAD, plan, gw: g,
                            fhGws, official: !!squadOverride });
      for (const [kind, list] of [["applied", f.applied], ["skipped", f.skipped],
                                  ["redundant", f.redundant]])
        for (const t of list) if (Number(t.gw) === g) m.set(t, kind);
    }
    return m;
  }, [plan, squadOverride, fhGws]);
  /* TALNINGARNAR SEM VIDMOTID BIRTIR. `redundant` er adeins til thegar
     raunlid er tengt (skilyrdid er inni i `applyPlan`), svo hér tharf
     ENGA adra profun a `squadOverride` — annars vaeri reglan a tveimur
     stodum og gaeti rekid i sundur.                                    */
  /* TVEIR LISTAR OG ThAD ER EKKI SNYRTING: „skipti sem ekki er haegt ad
     beita" og „upphaflids-val sem ekki er haegt ad setja" birtast i
     SITTHVORUM kafla (Transfer plan / Starting squad), svo ein tala hefdi
     ordid ord sem passa ekki i annan hvorn kaflann. Sama skilyrdi
     (`isInitialSquadPick`), tvo ord.                                    */
  const planSkipped = useMemo(() =>
    plan.filter(t => planStatus.get(t) === "skipped"), [plan, planStatus]);
  const skippedMoves = useMemo(() =>
    planSkipped.filter(t => !isInitialSquadPick(t)), [planSkipped]);
  const skippedPicks = useMemo(() =>
    planSkipped.filter(isInitialSquadPick), [planSkipped]);
  const planRedundant = useMemo(() =>
    plan.filter(t => planStatus.get(t) === "redundant"), [plan, planStatus]);

  /* ---- KAUPVERÐ ----
     Þrjár sjálfvirkar heimildir, í forgangsröð:
     1) "manual" — þú stilltir það sjálf/ur
     2) "api"    — FPL skilaði purchase_price (aðeins innskráð my-team)
     3) "auto"   — appið SÁ verðið þegar leikmaðurinn kom inn í liðið
                   (við skipti í appinu, eða greint þegar nýr maður birtist
                    í liðinu úr FPL-slóðinni)
     Fyrir PLÖNUÐ skipti sem eru ekki gerð: núverandi verð, því þú hefur
     ekki keypt hann enn — hagnaður byrjar við kaup.                        */
  const buyOf = (id) => {
    // FYRIR TÍMABIL: verð hreyfast ekki og skipti eru ótakmörkuð.
    // Kaupverð læsist ekki fyrr en GW1-frestur -> notum núverandi verð.
    if (preSeasonRef.current) return byId[id]?.now_cost ?? 0;
    // ekki enn keyptur -> ekkert kaupverð, notum núverandi
    if (!officialIds.has(id)) return byId[id]?.now_cost ?? 0;
    /* GILDID SJALFT ER ThVINGAD, EKKI BARA YTRI GERDIN.
       `loadState` thvingar ad `buyPrices` se HLUTUR, en gildin voru
       ochekkud: `{"411":"abc"}` (eda `{p:"abc"}`) skilade streng beint i
       `sellTenths` og skjarinn bar **£NaN** — banki, soluverd og hvert
       skiptaverd med. Sama aett og `bank:"mikid"` ur proxyinu: NULL er
       "veit ekki" og appid kann thad, NaN kann thad ekki.               */
    const rec = buyPrices[id];
    const raw = (rec && typeof rec === "object" ? rec.p : rec);
    const n = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    return n ?? byId[id]?.now_cost ?? 0;
  };
  const buySrcOf = (id) => {
    if (!officialIds.has(id)) return "planned";
    const rec = buyPrices[id];
    return (rec && typeof rec === "object" ? rec.src : rec != null ? "manual" : null) ?? null;
  };
  // Söluverð eftir 50%-hagnaðarreglunni.
  const sellOf = (id) => sellTenths(buyOf(id), byId[id]?.now_cost ?? 0);

  /* ---- BANKI ----
     Rétt fyrirmynd: banki er reiðufé, ekki 100 mínus liðsverð.
     - Tengt lið: banki kemur úr FPL (entry_history.bank) — nákvæmt.
     - Ótengt:   áætlum 100 mínus KAUPVERÐ upphafsliðsins.
     Skipti breyta banka um: söluverð(út) − núverandi verð(inn).            */
  const bank = useMemo(() => {
    if (!players) return 0;
    const base = squadOverride || START_SQUAD;
    let tenths;
    if (apiBank != null) {
      tenths = apiBank;
    } else {
      const spentBuy = base.reduce((a, s) => a + buyOf(s.id), 0);
      tenths = Math.round(BUDGET * 10) - spentBuy;
    }
    /* BANKINN LES `applied`, EKKI `plan` — OG ThAD VAR VILLAN (21.8.2026).
       Her stod eigid afrit af foldinni og thad hafdi ENGA `i >= 0`-profun,
       svo hver rod sem vollurinn SLEPPTI var samt reiknud inn i bankann:
       tiu GW1-radir ofan a raunlidid gafu **-1,5** thar sem rett svar var
       +0,5. Tvo afrit af einni lykkju REKA i sundur, og thau gerdu thad.
       FH-reglan flyst med (`applyPlan` ber hana), svo hun er hvorki
       endurskrifud her ne tapast.                                       */
    for (const tr of planFold.applied)
      tenths += sellOf(tr.outId) - (byId[tr.inId]?.now_cost ?? 0);
    return +(tenths / 10).toFixed(1);
  }, [players, squadOverride, apiBank, planFold, gw, byId, buyPrices]);

  // Liðsverð = summa SÖLUVERÐA (það sem þú fengir ef þú seldir allt)
  const squadValue = useMemo(() =>
    +(squadAt.reduce((a, s) => a + sellOf(s.id), 0) / 10).toFixed(1),
    [squadAt, byId, buyPrices]);

  const starters = squadAt.filter(s => s.starter).sort((a,z) => a.order - z.order);
  // BEKKUR: markmaður ALLTAF lengst til vinstri (eins og FPL), svo röð.
  const bench = squadAt.filter(s => !s.starter).sort((a, z) => {
    const gk = x => (byId[x.id]?.element_type === 1 ? 0 : 1);
    return gk(a) - gk(z) || a.order - z.order;
  });
  const rows = { 1:[], 2:[], 3:[], 4:[] };
  /* STODU-KORFAN ER PROFUD, EKKI GEFIN SER (lagad 11.8.2026).
     `rows[p.element_type].push(s)` hrundi appinu VID HLEDSLU ef `element_type`
     var ekki 1-4: `rows[99]` er undefined og `.push` kastar. `if (p)` var
     thegar thar — thad vantadi vord a KORFUNA, ekki a leikmanninn.

     ThETTA ER EKKI TILBUID TILFELLI: `element_type` kemur ur FPL
     `bootstrap-static`, og FPL HEFUR ThEGAR bætt vid stodu-tegund (stjorar,
     element_type 5, i sinum eigin keppnisformum). Nyr element_type i svarinu
     hefdi thvi ekki gefid tomann flipa heldur HVITAN SKJA — ErrorBoundary
     greip hann, og eina utgangan thar hreinsar OLL `fpl_*`-lyklana.

     `stats.js:893` gerdi thetta ThEGAR rett (`if (byPos[r.pos])`), svo thetta
     samraemir App.jsx vid mynstrid sem er annars stadar i repo-inu.
     Leikmadur med othekkta stodu er SLEPPT ur vellinum — hann er ekki settur
     i ranga korfu, thvi rong stada er verri en vantandi (sama regla og
     THOGUL RONG PORUN i bsd.js).
     Vordur: tests/extreme-values.mjs.                                     */
  /* ============================================================
     BENCH BOOST: ALLIR 15 A VOLLINN (beidni notandans 20.8.2026)
     ============================================================
     Bekkurinn SKORAR i BB-umferd — thad er allur chipinn — svo vollurinn
     a ad syna thad sem er i spilinu, ekki 11 af 15.

     ThRJU SEM ER VILJANDI **OBREYTT**, thvi annars vaeri thetta ekki
     birtingar-breyting heldur likans-breyting:
       1. `starter`-FLAGGID sjalft. `starters`/`bench` eru areidanlega tha
          somu mengi, svo fyrirlida-vallistinn (sem ma adeins bjoda
          byrjunarlidsmenn), `swapStarterBench` (1 GK · 3+ DEF · 2+ MID ·
          1+ FWD) og `chipValue.bboost` (summa bekkjarins) lesa OBREYTT
          gogn. BB er ekki uppstillingar-breyting.
       2. `bench`-eiginleikinn a spjaldinu. Bekkjarmadur a vellinum heldur
          `pCardBench` (graa spjaldid, 76 i RGB), svo hann er enn adgreinanlegur
          — vitneskjan "hverjir eru XI-in" tapast ekki i BB.
       3. Bekkjar-borainn helst a sinum stad med skyringu i stad spjalda,
          svo tomur borði lesi ekki eins og bilun.

     KLIPPAST 15 SPJOLD? Nei, og thad er reiknad ur FPL-hopnum sem er
     ALLTAF 2 GK · 5 DEF · 5 MID · 3 FWD: LENGSTA rodin verdur FIMM, sem
     er nakvaemlega thad sem 5-manna vorn gefur i dag. Spjaldid er
     clamp(62px, 17.5%, 100px), svo fimm spjold thurfa 87,5% + fjogur 6px
     bil — their komast fyrir an thess ad skreppa saman. `pitchRowFlex`
     fekk auk thess `flexWrap` sem net fyrir smaa skjai (WRAP, EKKI CLIP),
     og vollurinn sjalfur VEX (Pitch.jsx: aspectRatio er LAGMARK, radirnar
     space-evenly) svo hærra innihald getur ekki skarast — sem er einmitt
     astaedan fyrir ad radirnar voru teknar af fostum prosentum.        */
  const bbActive = bbGws.has(gw);
  const onPitch = bbActive
    ? [...squadAt].sort((a, z) => a.order - z.order)
    : starters;
  onPitch.forEach(s => { const p = byId[s.id]; if (p && rows[p.element_type]) rows[p.element_type].push(s); });

  /* ---------- Skipti ---------- */
  function commitTransfer(outId, inId) {
    const o = byId[outId], n = byId[inId];
    if (!o || !n) return;
    if (o.element_type !== n.element_type) { flash("Transfers must be in the same position."); return; }

    // FPL-REGLA: hámark 3 leikmenn frá sama félagi
    const after = squadAt.map(s => (s.id === outId ? inId : s.id));
    const sameClub = after.filter(id => byId[id]?.team === n.team).length;
    if (sameClub > 3) {
      flash(interp("Too many from {0} — maximum 3 per club.", [teamById[n.team]?.short]));
      return;
    }

    /* ============================================================
       VERD BLOKKAR EKKI VAL — BANKINN MA FARA I MINUS (20.8.2026)
       ============================================================
       Her stod `if (bankAfter < 0) { flash("...short"); return; }` og thad
       var HART HLID: dyr leikmadur var OVELJANLEGUR. Notandinn (beidni
       20.8.2026): hann vill velja dyra manninn FYRST og fjarmagna hann
       sidan med solu — og i thvi flaedi er millistadan alltaf minus.
       Gamla hlidid gerdi thann rodun omogulega, thvi hun refsadi fyrir
       fyrsta skrefid af tveimur.

       ThRIU-PER-FELAG OG STODU-REGLAN STANDA OBREYTTAR. Thad er ekki
       smekksatriði: thaer eru FPL-LOGMAETI (uppstilling sem er ologleg
       verdur aldrei log), en peningur er BOKHALD sem gengur til baka vid
       naesta skref. Fyrra er astand sem FPL myndi hafna, seinna er astand
       sem notandinn er a leidinni ut ur.

       MINUS-BANKINN ER SYNILEGUR, EKKI KLIPPTUR I 0: `money()` skrifar
       `-£1.5`, maelabordid faer `tone:"bad"` (raudur), og hvergi er
       `Math.max(0, ...)`. Klipptur banki vaeri ThOGUL LYGI — hann segdi
       "thu att 0" thegar rett svar er "thu vantar 1,5" (sama aett og
       `?? 0` badum megin, CLAUDE.md 12).                                 */
    // söluverð út (50%-reglan), fullt verð inn
    const bankAfter = +(bank + (sellOf(outId) - n.now_cost) / 10).toFixed(1);

    // Skrá verðið sem við SJÁUM núna — það verður kaupverðið þegar skiptin fara fram.
    // (Ef verðið breytist fyrir framkvæmd uppfærist það við næstu liðs-greiningu.)
    setPlan(p => [...p, { gw, outId, inId, seenPrice: n.now_cost, seenAt: new Date().toISOString().slice(0,10) }]);
    setSelling(null); setSearchQ("");
    flash(bankAfter < 0
      ? interp("GW{0}: {1} → {2} · bank {3} — sell someone to fund it", [gw, o.web_name, n.web_name, money(bankAfter)])
      : interp("GW{0}: {1} → {2} · bank {3}", [gw, o.web_name, n.web_name, money(bankAfter)]));
  }
  function removeTransfer(i) { setPlan(p => p.filter((_,j) => j !== i)); }
  /* ---------- SMELLU-SKIPTI ----------
     Smella á leikmann VELUR hann. Smella á annan SKIPTIR þeim, ef FPL-reglur
     leyfa. Upplýsingar og útskipting eru á sér ikonum, svo smellur á spjaldið
     er alltaf skipti — ekki tvíræð aðgerð.                                  */
  function clickPlayer(id) {
    if (swapSel == null) { setSwapSel(id); return; }
    if (swapSel === id) { setSwapSel(null); return; }
    const a = squadAt.find(x => x.id === swapSel), b = squadAt.find(x => x.id === id);
    if (a && b && a.starter === b.starter) {
      flash(a.starter ? "Both are starting — pick one on the bench." : "Both are on the bench.");
      setSwapSel(id); return;
    }
    swapStarterBench(swapSel, id);
    setSwapSel(null);
  }

  function swapStarterBench(aId, bId) {
    const a = squadAt.find(s => s.id === aId), b = squadAt.find(s => s.id === bId);
    if (!a || !b || a.starter === b.starter) return false;
    const next = squadAt.map(s => s.id === aId ? { ...s, starter: b.starter } : s.id === bId ? { ...s, starter: a.starter } : s);
    const cnt = { 1:0, 2:0, 3:0, 4:0 };
    /* Sama vord og a `rows` ad ofan: `cnt[99]++` kastar ekki (thad gerir
       `NaN`) en thad BAETIR VID LYKLI sem leikstodu-profid nedar les ekki,
       svo ologleg uppstilling hefdi slopped thegjandi.                    */
    next.filter(s => s.starter).forEach(s => { const p = byId[s.id]; if (p && cnt[p.element_type] != null) cnt[p.element_type]++; });
    if (cnt[1] !== 1 || cnt[2] < 3 || cnt[3] < 2 || cnt[4] < 1 || cnt[2]+cnt[3]+cnt[4] !== 10) {
      flash("Illegal formation (1 GK, 3+ DEF, 2+ MID, 1+ FWD)."); return false;
    }
    /* ============================================================
       RITUN SAEDIR UMFERDINA MED ERFDA LISTANUM (20.8.2026)
       ============================================================
       Listinn i `benchSwaps[g]` er ALLTAF fullur mismunur fra GRUNNINUM
       fyrir thá umferd — thad er forsenda „sidasti skyri lykill"-reglunnar
       i `squadForGw`. Vid ritun tharf hann thvi ad HEFJAST a thvi sem
       notandinn SA a skjanum (erfda uppstillingin), annars vaeri hans eina
       vixl lagt a grunninn og hin erfdu horfin i sama smelli.
       `[...own]` gefur NYTT fylki — aldrei sama tilvisun sem onnur umferd
       ber, annars breytti eitt smell tveimur umferdum.
       ATH ad thetta er ritun VID ADGERD, ekki vid lestur: ad skrifa vid
       FLAKK vaeri thad sem gerir „hefur hann breytt einhverju?"
       osvaranlegt. Vordur: `initial-squad.mjs` kafli H.
       OG VISVITANDI VIXLARI ER ThVI AFRAM SKRANLEGUR: bekkur i GW1 og TIL
       BAKA i GW2 verdur `[[A,B],[A,B]]` i GW2 — tvo vixl a grunninn =
       grunnurinn, sem er nakvaemlega thad sem hann bad um.            */
    appendBenchSwaps([[aId, bId]]);
      return true;
  }
  /* EIN UTFAERSLA A RITUNINNI — "Pick best XI" skrifar THE SAMA LISTA.
     Takkinn baetir MORGUM porum vid i einu; hefdi hann sina eigin ritun
     vaeru tvaer utfaerslur af "saeda umferdina med erfda listanum" og
     thaer gaetu rekid i sundur thegjandi (sama roksemd og `wOf`-afritid i
     `stats.test.mjs`, CLAUDE.md 8). VISTADA GERDIN ER OHREYFD: hlutur AF
     FYLKJUM af PORUM.                                                   */
  function appendBenchSwaps(pairs) {
    setBenchSwaps(bs => {
      const mine = Array.isArray(bs[gw]) && bs[gw].length > 0 ? bs[gw] : null;
      let own = mine;
      if (!own) {
        own = [];
        for (let j = gw - 1; j >= 1; j--) {
          const l = bs[j];
          if (Array.isArray(l) && l.length > 0) { own = l; break; }
        }
      }
      return { ...bs, [gw]: [...own, ...pairs] };
    });
  }
  /* ============================================================
     "PICK BEST XI" — VELIN ER `src/bestteam.js`, HER ER ADEINS TENGINGIN
     ============================================================
     SKORID ER `expPointsFor` OG EKKERT ANNAD. Ad margfalda med
     `startProbability` var MAELT OG HAFNAD 20.8.2026: thad vinnur a hrarri
     XI-summu en TAPAR eftir ad FPL-autosubs eru beittir (-0,055 / -0,096 /
     -0,006 stig/umferd, oll thrju CI utiloka null), thvi autosubs skila
     theim abata FRITT — 88,9% theirra sem thad hefdi bekkjad og sem svo
     gafu ekkert komu inn af bekknum hvort sem er. Og `expPts x sp^k` er
     einraent fallandi i k, svo ENGIN vog vinnur. Ekki opna thetta aftur.

     BEKKJAR-RODIN ER EKKI VISTANLEG I DAG: `benchSwaps` vixlar ADEINS
     `starter`-flaggi, og birt rod kemur ur `order` i `plan`/`START_SQUAD`.
     Takkinn setur thvi HVER BYRJAR, ekki bekkjar-rodina, og thad er sagt
     A SKJANUM (`bestXiNote`) — ekki adeins i toast sem hverfur.

     HVERT MILLI-SKREF ER SANNREYNT, EKKI BARA ENDASTADAN. `benchSwapPairs`
     radar porunum svo hver milli-uppstilling se leyfileg; her er thad
     PROFAD adur en nokkru er skrifad, thvi `swapStarterBench` getur ekki
     gert thad i lykkju (hann les `squadAt` ur state, sem uppfaerist ekki
     fyrr en vid naesta teikningu, svo par nr. 2 vaeri sannreynt gegn
     RANGRI uppstillingu). Reglan sjalf er ADFLUTT (`legalFormation`).   */
  function pickBestXi() {
    const seats = squadForGw(gw);
    const bt = bestTeamPlan({
      seats,
      score: s => expPoints(s.id, gw),
      /* `posKey` VERDUR AD VERA HER OG ThAD ER ENGIN SNYRTING. `pickXi`
         beitir `posKey` ADEINS a sjalfgefna uppflettinguna — eigin `posOf`
         verdur thvi ad skila STODU-LYKLI ("MID"), ekki `element_type` (3).
         Bert `byId[s.id]?.element_type` gefur `byPos[3] === undefined`, svo
         HVER SAETI ER SLEPPT og svarid er TOMT XI med `changed:false` —
         takkinn hefdi sagt "already the best XI" um lid med Haaland a
         bekknum. Maelt: `xi:[]`, `legal:false`, engin villa kastad.       */
      posOf: s => posKey(byId[s.id]?.element_type),
    });
    /* TOMT SVAR MA EKKI LESAST EINS OG "ThEGAR BEST" — ThAD VAR VILLAN.
       Med `posOf` sem skilar tolu i stad stodu-lykils skilar velin `xi:[]`,
       `legal:false` og `changed:false` — nakvaemlega sama undirskrift sem
       raunverulega besta lid gefur. Fullyrding um "best" ma thvi ekki
       byggja a `changed` einu; hun tharf LEYFILEGT ELLEFU-MANNA lid.     */
    if (!bt.legal || bt.xi.length !== XI_SIZE) {
      flash("Could not read a legal XI from your squad — nothing was changed.");
      return false;
    }
    if (!bt.changed || !bt.swaps.length) {
      flash(interp("GW{0}: already the best XI — nothing to change.", [gw]));
      return false;
    }
    if (!bt.swapsLegal) {
      flash("No legal order of swaps reaches that XI — arrange it by hand.");
      return false;
    }
    let sim = seats.map(s => ({ ...s }));
    for (const [aId, bId] of bt.swaps) {
      const ia = sim.findIndex(s => s.id === aId), ib = sim.findIndex(s => s.id === bId);
      if (ia < 0 || ib < 0 || sim[ia].starter === sim[ib].starter) {
        flash("Illegal formation (1 GK, 3+ DEF, 2+ MID, 1+ FWD)."); return false;
      }
      const t = sim[ia].starter;
      sim[ia] = { ...sim[ia], starter: sim[ib].starter };
      sim[ib] = { ...sim[ib], starter: t };
      const cnt = { GK:0, DEF:0, MID:0, FWD:0 };
      sim.filter(s => s.starter).forEach(s => {
        const k = posKey(byId[s.id]?.element_type); if (k) cnt[k]++;
      });
      if (!legalFormation(cnt)) {
        flash("Illegal formation (1 GK, 3+ DEF, 2+ MID, 1+ FWD)."); return false;
      }
    }
    appendBenchSwaps(bt.swaps);
    setSwapSel(null);
    flash(interp(bt.swaps.length === 1
      ? "GW{0}: best XI set — {1} change. Bench order is unchanged."
      : "GW{0}: best XI set — {1} changes. Bench order is unchanged.",
      [gw, bt.swaps.length]));
    return true;
  }
  /* ---------- ENDURSTILLING ----------
     Hvað er plönuð í umferð: skipti, bekkjar-breytingar, chip.
     Tveggja-skrefa staðfesting því þetta er óafturkræft.                */
  function gwPlanned(g) {
    const tr = plan.filter(t => t.gw === g).length;
    /* `bs` ER BOOLEAN, EKKI TALA (20.8.2026). Adur var thad
       `benchSwaps[g].length` og textinn sagdi „3 bench changes". Eftir ad
       listinn vard FULLUR MISMUNUR FRA GRUNNINUM (sja `squadForGw`) berr
       hann lika ERFDU vixlin, svo talan hefdi sagt notandanum ad hann
       hefdi gert thrjar breytingar i GW4 thegar hann gerdi eina. Tala sem
       lygur er verri en engin tala (CLAUDE.md 3); spurningin sem lykillinn
       svarar er JA/NEI: „ber thessi umferd sina EIGIN uppstillingu?"    */
    const bs = Array.isArray(benchSwaps[g]) && benchSwaps[g].length > 0;
    const chKey = Object.keys(chips).find(k => chips[k] === g);
    const ch = chKey ? (CHIPS[chipSlots.find(x => x.key === chKey)?.name]?.short || "chip") : null;
    return { tr, bs, ch, any: tr > 0 || bs || !!ch };
  }
  function resetGw(g) {
    setPlan(pl => pl.filter(t => t.gw !== g));
    setBenchSwaps(bs => { const n = { ...bs }; delete n[g]; return n; });
    setChips(c => { const n = { ...c }; for (const k of Object.keys(n)) if (n[k] === g) delete n[k]; return n; });
    setSwapSel(null); setSelling(null); setConfirmReset(null);
    flash(interp("GW{0} reset — original squad restored.", [g]));
  }
  /* ============================================================
     „reset all planning" EYDDI LIDINU HANS (20.8.2026)
     ============================================================
     Notandinn, korter fyrir frest: „Er mer ohaett ad reset all planning,
     dettur tha starting GW1 lidid ut?" SVARID VAR JA, ThAD DATT UT.

     `setPlan([])` var EYDINGARSKIPUN A HOPNUM. Hopurinn er ekki vistadur
     sem hopur: hann er `START_SQUAD` (harkodudu 15) PLUS `plan`, og
     `squadForGw` foldar listann. Ad hreinsa `plan` skilar thvi
     SJALFGEFNU lidi sem hann valdi aldrei — og gerir thad ThEGJANDI.
     Tooltip-id sagdi „original squad restored", sem er BOKSTAFLEGA RETT
     og VILLANDI i somu andra: „original" hljomar eins og HANS lid.

     ThETTA ER FJORDA ANDLIT SOMU VILLU (kostnadurinn, aetlunar-listinn,
     graeni ramminn, og nu thetta), svo hun er leyst med SAMA predikati og
     hin thrju — `isInitialSquadPick` — og ekki med fjordu stadbundnu
     lagfaeringu.

     VALID: UPPHAFSLIDID STENDUR, ADEINS PLONUN FER. Notandinn sagdi thad
     sjalfur berum orðum: GW1 er lidid hans, GW2+ er plonun. „Reset
     planning" ma thvi ekki thyda „fleygdu lidinu minu". Vilji hann skipta
     um mann i upphafslidinu er `✕` a hverri rod i „Starting squad"-
     kaflanum — EITT val i einu, sem er retta kornastaerdin fyrir
     adgerd sem er ekki afturkraef.

     FYRIRLIDINN FER EKKI HELDUR — OG EKKI VARAFYRIRLIDINN.
     `setCaptain(START_CAPTAIN)` setti hann a Haaland (sjalfgefna
     proflidid) thott notandinn hefdi valid annan, og `setVice(null)`
     thurrkadi varafyrirlidann. Bædar linur voru samhverfar og bædar voru
     rangar af SOMU astaedu: bandid er akvordun um LIDID, ekki plonun.
     Ad halda fyrirlidanum en thurrka varann vaeri halft svar — og tha
     vaeri setningin „your starting squad is untouched" osonn i somu andra
     og „as you have them set up" var.
     ATH hvers vegna thetta lifdi: `captain` er `useState(START_CAPTAIN)`
     en `vice` er `useState(null)`, svo `setVice(null)` LEIT UT eins og
     „aftur i sjalfgefid" — sem thad er. Sjalfgefid er samt ekki hans val.

     EFTIR FRESTINN er GW1 saga og verdur ekki breytt, svo reglan gildir
     tha af ENN sterkari astaedu (og `unlimitedBy === "initial"` segir thad
     a skjanum). Ein regla, bædar hlidar klukkunnar.
     Vordur: `initial-squad.mjs` kafli N.                               */
  function resetAll() {
    setPlan(p => p.filter(isInitialSquadPick));
    setBenchSwaps({}); setChips({});
    setSwapSel(null); setSelling(null); setConfirmReset(null);
    flash("Transfer planning reset — your starting squad is untouched.");
  }

  /* ============================================================
     „TAKA UPP FPL-HOPINN" — HANN SMELLIR, VID EYDUM ALDREI SJALF
     (21.8.2026)
     ============================================================
     Thegar raunlidid er tengt eru GW1-valin OFAUKIN (sja `applyPlan`) og
     vollurinn hunsar thau. Ad LATA thau standa i listanum og segja
     ekkert vaeri hins vegar nakvaemlega su villa sem hann hefur kaert
     tvisvar i dag: appid fullyrdir eitthvad sem er ekki svo — tiu „val"
     sem gera ekki neitt.
     ThVI: setningin er a skjanum OG hnappur til ad hreinsa thau, en
     HREINSUNIN ER HANS SMELLUR. Sjalfvirk eyding er utilokud af sömu
     astaedu sem `resetAll` var lagad fyrir: `plan` + `START_SQUAD` er
     ThAD SEM HOPURINN ER thegar ekkert er tengt, svo rod sem vid eydum
     i dag er saeti sem hann hefur ekki a morgun (aftengist hann, eda
     dettur FPL ut). `gw1-persistence.mjs` pinnar öll 15.
     ADEINS GW1-RADIR FARA — `isInitialSquadPick`, sami predikatinn, og
     GW2+ plonun er osnort.                                            */
  function adoptFplSquad() {
    const n = plan.filter(isInitialSquadPick).length;
    setPlan(p => p.filter(t => !isInitialSquadPick(t)));
    setConfirmReset(null);
    flash(interp(n === 1
      ? "{0} GW1 pick removed — the FPL squad is your starting squad. Transfer planning is untouched."
      : "{0} GW1 picks removed — the FPL squad is your starting squad. Transfer planning is untouched.",
      [n]));
  }

  /* ============================================================
     AFTENGING — TENGINGIN FER, LIDID OG PLONUNIN STANDA (21.8.2026)
     ============================================================
     Notandinn: „Taktu gluggann fyrir urlid ut og Refresh takkann. Og
     setjum disconnect takka fyrir aftan. Ef eg disconnecta svo lidid
     mitt, tha myndi url reiturinn koma aftur upp."

     ThAD SEM FER: `entryId` — og ekkert annad SETT hér. `squadOverride`,
     `apiBank`, `apiHit`, `totalPts` og `gwPts` nullstillast SJALF i
     effectinum vid `!entryId` (linu 785), svo tvi-nullstilling hér vaeri
     annad afrit af theirri reglu og gaeti rekid i sundur vid hana.
     `conn` er hins vegar EKKI i theim effect og verdur ad fara hér,
     annars stæði „Connected ✓ — 15 players fetched" ofan vid tomt
     url-svaedi.

     ThAD SEM FER **EKKI**, OG ThAD ER ADALATRIDID: `plan`, `benchSwaps`,
     `chips`, `captain`, `vice`, `buyPrices`, `watch`, `rivals`. Ad
     aftengjast FPL er EKKI sama athofn og ad fleygja lidinu sinu.
     `resetAll` gerdi nakvaemlega thessi mistok i gaer (`setPlan([])` a
     bak vid hnapp sem het „reset all planning") og su villa ma ekki
     endurtaka sig i nyju formi. Vordur: `initial-squad.mjs` kafli P
     les BLOBBID fyrir og eftir og krefst ad thad se BYTE-EINS ad thvi
     einu frataldu ad `entryId` er `null`.

     OG HANN A AD VITA AF ThVI FYRIRFRAM ad vollurinn getur breytst:
     an raunlidsins er hopurinn `START_SQUAD` + `plan` aftur, sem er
     ekki endilega sami hopur. Setningin er a hnappnum sjalfum
     (`title`) OG i stadfestingar-linunni — ekki i toast sem hverfur.

     ENDURTENGING: `urlInput` er ekki nullstillt hér (hann getur haft
     limt inn nytt id) en `setUrlInput("")` er ohaett thvi reiturinn er
     hvort eð er tomur medan hann er faldur; ThAD SEM SKIPTIR er ad
     effectinn vid [entryId, gw] sækir UPP A NYTT thegar nytt id er
     sett, svo hopur fra fyrra id getur ekki lifad af — hann var
     nullstilltur i sama effect fyrst.                                */
  function disconnectFpl() {
    setEntryId(null);
    setConn({ state:"idle", msg:"", name:null, picks:null });
    setUrlInput("");
    setConfirmReset(null);
    flash("Disconnected from FPL. Your squad, planning and captain are untouched — the pitch is back on your own saved squad.");
  }

  /* TENGING ER NU SANNREYND. `fpl-entry` virkar i forleik (skilar nafni
     stjornandans) svo vid getum stadfest ad slodin/numerid se RETT thott
     `fpl-picks` se ekki til fyrr en umferdin byrjar. Thad er kjarninn:
     tvennt sem brast var (a) engin stadfesting, (b) thogul mistok.       */
  async function connectUrl() {
    const raw = (urlInput || "").trim();
    if (!raw) { setConn({ state:"error", msg:"Paste your FPL link or team ID.", name:null, picks:null }); return; }
    /* Leyfilegt: full slod (hvada undirsida sem er), /entry/NNN, eda bert numer */
    const parsed = parseEntryId(raw);
    if (parsed.error) {
      setConn({ state:"error", name:null, picks:null,
        msg: parsed.error === "league"
          ? "That is a LEAGUE link. Use the link to YOUR TEAM — it contains /entry/NUMBER/."
          : "No team ID found. The link must contain /entry/NUMBER/ — or just paste the number." });
      return;
    }
    const id = parsed.id;
    if (!PROXY_URL) { setConn({ state:"error", msg:"No proxy — cannot reach FPL.", name:null, picks:null }); return; }
    setConn({ state:"checking", msg:interp("Checking team {0} …", [id]), name:null, picks:null });
    try {
      const r = await fetch(`${PROXY_URL}?path=fpl-entry&id=${id}`);
      const d = await r.json();
      if (d?.error || d?.id == null) {
        setConn({ state:"error", name:null, picks:null,
          msg: interp("FPL has no team {0}. Check the number.", [id]) });
        return;
      }
      const nm = [d.player_first_name, d.player_last_name].filter(Boolean).join(" ");
      const team = d.name || "";
      setEntryId(id);
      setConn({ state:"ok", name: team || nm, picks:null,
        msg: interp("Connected: {0}{1} — team {2}", [team || nm, team && nm ? ` (${nm})` : "", id]) });
    } catch (e) {
      setConn({ state:"error", name:null, picks:null,
        msg: interp("Could not reach FPL ({0}).", [String(e.message || e).slice(0, 40)]) });
    }
  }

  /* ---------- Leit (allir 558) ---------- */
  /* Meðal-FFDR næstu FFDR_AHEAD umferðir, í hóp leikmannsins.
     Notað til að raða útskiptingar-kostum: léttustu leikirnir efst.        */
  const ffdrAhead = useCallback(p => {
    let sum = 0, n = 0;
    for (let g = gw; g < gw + FFDR_AHEAD && g <= maxGw; g++) {
      for (const f of (fixByTeamGw[p.team]?.[g] || [])) {
        const d = fixDifficulty(p.team, f, p.element_type);
        if (d != null) { sum += d; n++; }
      }
    }
    return n ? sum / n : 9;      // engir leikir -> aftast
  }, [gw, maxGw, fixByTeamGw, teamMetrics, odds, eloByTeam, teamById]);

  /* ---------- MERKI FYRIR SKIPTA-GLUGGANN ----------
     Skipta-glugginn er AUGNABLIK AKVORDUNARINNAR og hann syndi adeins
     `ep_next` og andstaeding, thott vid hofum maelt fjorar adrar tolur.
     Thaer eru allar reiknadar UR SOMU SKRAM sem hinir fliparnir nota.

     BYRJUNAR-LIKUR ERU FYRSTAR AF ASETTU RADI: allt annad er verdlaust ef
     leikmadurinn spilar ekki. Maelt (kafli 6h): af theim sem byrjudu sidast
     spila 21,6% EKKI 60+ naest, og laegsti tiundarhlutinn fangar 42-49%
     theirra — lyfting 2,09x, samhljoda oll thrju timabilin.               */
  const immIdx = useMemo(() => indexImminentByTeam(imminent), [imminent]);
  const netByPlayer = useMemo(() => {
    const m = {};
    for (const p of players || []) {
      m[p.id] = { net: (p.transfers_in_event || 0) - (p.transfers_out_event || 0),
                  chg: p.cost_change_event || 0 };
    }
    return m;
  }, [players]);

  /* Byrjunar-likur EINAR (fyrir roterings-parid o.fl.) — sama utfaersla og
     signalsOf notar, an mo/ao/verd-hlutans. null = engin gogn, EKKI 0.   */
  const startPOf = useCallback(p => {
    if (!p) return null;
    const im = matchImminent(p, immIdx, teamById?.[p.team]?.short);
    return im?.start_feats ? startProbability(im.start_feats) : null;
  }, [immIdx, teamById]);

  const signalsOf = useCallback(p => {
    if (!p) return null;
    const im = matchImminent(p, immIdx, teamById?.[p.team]?.short);
    const w = im?.window;
    const nb = netByPlayer[p.id] || {};
    return {
      /* startProbability tekur `start_feats` sem pipeline reiknar (5 umferda
         gluggi). Vantar hann -> null, EKKI 0: "engin gogn" og "spilar ekki"
         eru ekki sama hlutid.                                             */
      startP: im?.start_feats ? startProbability(im.start_feats) : null,
      /* mo/ao gilda ADEINS i markhopnum (0-1 framlag, 180+ min). Fyrir adra
         er talan ekki "lag" heldur EKKI TIL — thess vegna null.

         MARKMENN FA HVORUGA, OG THAD ER MAELINGAR-ATRIDI EKKI SMEKKUR:
         mo/ao eru soknar-visar og markmenn komast i markhopinn AF THVI AD
         their hafa 0 framlog. tests/mo-candidates.mjs maeldi DEF/MID/FWD —
         GK var ALDREI maeldur. "mo 0.0" a markverdi er thvi omaeld tala
         sem lítur út eins og maeling, sem er thad sem thetta repo a ad
         forðast (sbr. "Vaent stig" og "birt CS%" i kafla 3).             */
      mo: (w && p.element_type !== 1 && inImminentPool(w)) ? moScore(w) : null,
      ao: (w && p.element_type !== 1 && inImminentPool(w)) ? aoScore(w) : null,
      ffdr: ffdrAhead(p),
      predict: priceMovePrediction({ net: nb.net, selectedByPct: p.selected_by_percent,
                                     chg: nb.chg }),
    };
  }, [immIdx, teamById, netByPlayer, ffdrAhead]);

  const searchResults = useMemo(() => {
    if (!players) return [];
    const q = searchQ.toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    /* I SKIPTI-HAM er stadan alltaf su sem er seld — FPL leyfir ekki ad
       skipta varnarmanni fyrir framherja. Stodu-sian sem browse-hamurinn
       hafdi er thvi ekki lengur til; hun var adeins fyrir flakk og thad
       flutti a Leikmenn-flipann.                                          */
    const posFilter = byId[selling]?.element_type ?? null;
    return players.filter(p => {
      if (posFilter && p.element_type !== posFilter) return false;
      if (selling && squadIds.has(p.id)) return false;
      if (!q) return true;
      const t = teamById[p.team];
      const hay = `${p.web_name} ${p.first_name} ${p.second_name} ${t?.name || ""} ${t?.short || ""}`
        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return hay.includes(q);
    }).sort((a, b) => {
      /* Í ÚTSKIPTINGU: raða eftir FFDR næstu 5 umferðir — LÉTTAST EFST.
         Það er spurningin sem verið er að svara: hver á bestu leikina? */
      if (selling) {
        const d = ffdrAhead(a) - ffdrAhead(b);
        if (Math.abs(d) > 0.005) return d;
      }
      return parseFloat(b.ep_next || 0) - parseFloat(a.ep_next || 0)
          || (b.total_points || 0) - (a.total_points || 0);
    }).slice(0, 120);
  }, [players, searchQ, selling, squadIds, byId, teamById, ffdrAhead]);

  /* ---------- Tillogu-kerfid ----------
     BYR I `src/recommend.js` (flutt 18.8.2026, C.1) — hreint fall med
     INNSPYTTUM hadum, svo prof geti keyrt NAKVAEMLEGA sama kodann.
     HADALISTINN VAR RANGUR OG ER LAGADUR: hann taldi upp `teamMetrics`,
     `odds`, `defcon`, `eloByTeam` og `eloCsByFx` — sem blokkin las ENGA —
     medan `fixDifficulty`, `spRanks`, `seasonStarted` og `seasonGames`
     VANTADI. Thraer fyrri thoktu tvaer their sidari OBEINT (fixDifficulty
     er memo af teamMetrics/teamById/odds/eloByTeam, spRanks af players),
     en `seasonStarted`/`seasonGames` koma ur `events` sem var HVERGI i
     listanum — thau gatu thvi frosid. Thad var RAUNVERULEGA gatid.
     `seasonStarted` er ekki lengur i listanum thvi fallid les hann ekki
     lengur: eini lesandinn var `banPen`, sem var MAELDUR OG FELLDUR (sja
     recommend.js). Listinn telur nakvaemlega thad sem fallid les.       */
  const recommendations = useMemo(
    () => buildRecommendations({
      players, fixtures, gw, maxGw, recRange, recMaxCost,
      fixByTeamGw, fixDifficulty, spRanks, seasonGames,
      squadIds, formFeat, playerForm }),
    [players, fixtures, gw, maxGw, recRange, recMaxCost,
     fixByTeamGw, fixDifficulty, spRanks, seasonGames,
     squadIds, formFeat, playerForm]);

  /* ============================================================
     „OG HVERN AETTI EG AD FA I STADINN?" (20.8.2026)
     ============================================================
     Notandinn: „I statsinu sem horfir afturabak vill eg ad recommendi
     leikmann sem vaeri betra ad hafa i stadinn, einhvern sem a tha
     thaegilegri leiki thegar thessi a thad ekki".

     ENGIN NY RODUN VAR SMIDUD, OG ThAD ER REGLA OG EKKI LETI. `rankScore`
     (`model.js`, borid fram af `buildRecommendations` sem `rank`) er MAELDA
     kaup-rodunin: hun slær bædi eldri adferd appsins og FPL-eigid xP i 5/5
     timabilum, og `rank-model.mjs` ber orakel-thak sem syn ad hærri tala
     vaeri LEKI, ekki afrek. Bordinn les hana; hann reiknar ekkert sjalfur.
     (ATH: SOLU-rodun er `score`, ekki `rank` — maelt OGREINANLEGT,
     -0,118 CI [-0,328, +0,088]. Thetta er KAUP-tillaga.)

     FJORAR HORDAR SIUR — TILLAGA SEM ER OLOGLEG ER VERRI EN ENGIN:
       1. SAMA STADA. FPL leyfir ekkert annad.
       2. RAUNVERULEGA A FJARHAGSAETLUN: SOLUVERD hans (`sellOf` — kaupverd
          + 50% af hagnadi, NIDURJAFNAD) + banki. EKKI nuverandi verd hans;
          thad er talan sem notandinn fengi ekki.
       3. ThRIR-PER-FELAG HELDUR EFTIR SKIPTIN. Salan opnar saeti hja HANS
          felagi, svo talningin dregur thad fra thegar felagid er hid sama.
       4. TILTAEKILEIKI: `avail === 0` (FPL segir 0%) er UT, og sa sem hefur
          ENGAR PL-minutur er lika ut — 195 leikmenn eru i theim flokki og
          „ohekkt" ma ekki birtast eins og „gott" (sama regla og `st0%`).

     „ThAEGILEGRI LEIKIR" ER PER STODU og hun er EKKI handreiknud hér:
     `ffdrAvg` kemur ur `buildRecommendations`, sem kallar `fixDifficulty`
     MED stodunni — varnarmadur og framherji hja sama felagi fá ekki sömu
     tolu, og thad er einmitt forsendan i kaup-glugga-syninni. Borid er
     LAEGRA gegn HAERRA (laegri FFDR = thaegilegri).
     OG DELTAN ER EKKI BIRT SEM STIG: kaup-glugga-vinnan sannadi ad
     glugga-tala er INNAN leikmanns og getur ekki radad tveimur monnum.
     Birt er NAFN + VERD, og tooltip-id segir hvadan rodunin kemur.

     EITT EDA TVO nofn per rod — bordinn er thegar thettur og notandinn
     var ad fjarlaegja texta i allt kvold.                               */
  /* EIN VORPUN FYRIR BADAR ATTIR — spjaldid les hana. Radirnar eru
     LYKLADAR A ATTINA, ekki lagdar saman: „0 of 6" (aaetlun) og „0 of 4"
     (stadreynd) eru tvaer olikar fullyrdingar um sama mann og summan
     theirra er merkingarlaus.                                          */
  const unusedById = useMemo(() => {
    const m = {};
    for (const r of unusedPlan.fwd.rows) m[r.id] = { ...(m[r.id] || {}), fwd: r };
    for (const r of unusedPlan.back.rows) m[r.id] = { ...(m[r.id] || {}), back: r };
    return m;
  }, [unusedPlan]);
  /* ============================================================
     "KEMST HANN ALDREI I PICK BEST XI?" (25.8.2026)

     Notandinn: "einnig vil eg ad thessi hluti horfi a ef leikmadur kemst
     aldrei i 'pick best xl' ad hann se tha merktur her, enda er eg tha
     liklega ekki ad fara ad nota hann og kominn timi til ad velja
     einhvern annan."

     ThETTA ER ONNUR SPURNING EN "i thinni aaetlun" OG ThAD ER ALLUR
     PUNKTURINN: `unusedPlan` les HANS EIGIN uppstillingu (staðreynd um
     hvad hann aetlar), thetta les HVAD APPID MYNDI VELJA (mat a
     vaentum stigum). Madur getur verid utan aaetlunarinnar en INNAN
     besta XI — tha er abendingin "thu ert ad bekkja hann ad osekju" —
     og hann getur verid i aaetluninni en ALDREI i besta XI, sem er
     hin abendingin. Thess vegna eru thetta tveir merkimidar, ekki einn.

     VELIN ER SU SAMA SEM `pickBestXi`-takkinn notar (`bestTeamPlan` +
     `expPoints`), ekki afrit: annars gaeti bordinn sagt "aldrei i besta
     XI" um mann sem takkinn setur i lidid — tveir svor um sama hlut
     (CLAUDE.md 7). Engin ny rodun og engin ny tala.

     GLUGGINN ER SA SAMI SEM KASSINN SYNIR (`unusedPlan.fwd`), svo
     merkimidinn getur ekki att vid annad bil en hausinn segir.        */
  const neverBestXi = useMemo(() => {
    const out = new Set();
    const u = unusedPlan?.fwd;
    if (!u || u.idle || !(u.to >= u.from)) return out;
    const everIn = new Set();
    let ran = 0;
    for (let g = u.from; g <= u.to; g++) {
      const seats = squadForGw(g);
      if (!Array.isArray(seats) || !seats.length) continue;
      let bt = null;
      try {
        bt = bestTeamPlan({ seats, score: s => expPoints(s.id, g),
                            posOf: s => posKey(byId[s.id]?.element_type) });
      } catch { bt = null; }
      if (!bt?.xi?.length) continue;
      ran++;
      for (const x of bt.xi) if (x?.id != null) everIn.add(x.id);
    }
    /* ENGIN KEYRSLA -> ENGIN FULLYRDING. Vaeri `ran` 0 og vid skiladum
       "aldrei i besta XI" um alla vaeri thad tala ur engu (kafli 8).   */
    if (!ran) return out;
    for (const s of squadForGw(u.from) || []) {
      if (s?.id != null && !everIn.has(s.id)) out.add(s.id);
    }
    return out;
  }, [unusedPlan, squadForGw, expPoints, byId]);

  const unusedSwaps = useMemo(() => {
    const out = {};
    const ranked = recommendations?.rankedByPos || {};
    const adv = recommendations?.advisorById || {};
    /* BADAR ATTIR fa tillogu — sami reikningur, og `out` er lyklad a
       leikmanni svo madur sem er flaggadur i badum fai hana einu sinni. */
    const flagged = [...unusedPlan.fwd.rows, ...unusedPlan.back.rows];
    if (!flagged.length) return out;
    const perClub = {};
    squadAt.forEach(s => { const t = byId[s.id]?.team;
      if (t != null) perClub[t] = (perClub[t] || 0) + 1; });
    for (const r of flagged) {
      if (out[r.id]) continue;
      const p = byId[r.id];
      if (!p) continue;
      const ownFfdr = adv[r.id]?.ffdrAvg;
      const budget = sellOf(r.id) + Math.round(bank * 10);   // TIUNDIR
      /* SIURNAR BUA I `swapCandidates` (recommend.js) — HREINT FALL.
         Their voru HER og voru profadar a raungognum; SJO af atta
         stokkbreytingum slupppu, thvi toppmennirnir tveir stodust hvort eda
         er allar siur. Sja hausinn a fallinu.                          */
      out[r.id] = swapCandidates({
        ranked: ranked[p.element_type] || [], outP: p, squadIds,
        perClub, budget, ownFfdr, max: 2 });
    }
    return out;
  }, [unusedPlan, recommendations, squadAt, squadIds, byId, bank, buyPrices]);

  /* ---------- Verðbreytingar (raunveruleg gögn) ---------- */
  const priceMovers = useMemo(() => {
    if (!players) return { up:[], down:[] };
    const withNet = players.map(p => {
      const net = (p.transfers_in_event || 0) - (p.transfers_out_event || 0);
      const chg = p.cost_change_event || 0;
      return { p, net, chg,
        predict: priceMovePrediction({ net, selectedByPct: p.selected_by_percent, chg }) };
    });
    const up = withNet.filter(x => x.net > 0).sort((a,b) => b.net - a.net).slice(0, 8);
    const down = withNet.filter(x => x.net < 0).sort((a,b) => a.net - b.net).slice(0, 6);
    return { up, down };
  }, [players]);

  /* ---------- FYRIR TÍMABIL ----------
     Verð hreyfast ekki og skipti eru ótakmörkuð og frí þar til GW1-frestur
     rennur út. Kaupverð læsist því EKKI fyrr en þá — 50%-hagnaðarreglan er
     óviðkomandi á meðan (enginn hagnaður til að deila).                     */
  const gw1Deadline = events?.find(e => e.id === 1)?.deadline_time || null;
  // SAMA KLUKKA og `deadlinePassed` (skilgreind ofar) — ekki tvo svor vid
  // sömu spurningu. `gw1Deadline ? … : false` heldur gomlu merkingunni:
  // vantandi frestur er EKKI forleikur.
  const preSeason = gw1Deadline ? !deadlinePassed(1) : false;
  /* HVAÐAN eru uppsöfnuðu tölurnar? Fyrir tímabil: allar frá SÍÐASTA
     tímabili (t.d. "2025/26"), reiknað úr GW1-frestinum svo merkið sé
     alltaf rétt ártal. Eftir að umferðir klárast: "GW1–N". Þetta merki
     fylgir HVERRI uppsafnaðri tölu — ekki bara skýringunni.             */
  const prevSeasonLabel = (() => {
    const y = gw1Deadline ? new Date(gw1Deadline).getFullYear() : null;
    return y ? `${y - 1}/${String(y).slice(-2)}` : "last season";
  })();
  const cumLabel = seasonStarted ? `GW1–${seasonGames}` : prevSeasonLabel;
  /* HEITI YFIRSTANDANDI TIMABILS — annad en cumLabel!
     cumLabel merkir "hvada timabil eiga tolurnar i players.json vid" og er
     thvi fyrra timabilid fyrir GW1. Timabila-taflan tharf hins vegar RETTA
     artalid a efsta dalkinn, annars faer 2026/27-dalkurinn heitid 2025/26
     OG 2025/26-dalkurinn dettur ut sem tvitekning.                        */
  const currentSeasonLabel = (() => {
    const y = gw1Deadline ? new Date(gw1Deadline).getFullYear() : null;
    return y ? `${y}/${String((y + 1) % 100).padStart(2, "0")}` : "this year";
  })();
  // TÍMABIL BYRJAÐ = einhver umferð lokin. Þangað til eru allar uppsöfnuðu
  // tölur í players.json frá SÍÐASTA tímabili (spjöld, mínútur, stig).
  preSeasonRef.current = preSeason;

  /* ---------- VÆNT STIG per umferð ----------
     Byggt á opinberum gögnum: stig/leik (sl. tímabil) leiðrétt fyrir
     leikjaþyngd (FDR), og FPL-eigin ep_next fyrir næstu umferð.
     Þetta er ÁÆTLUN, ekki spá með vissu — en hún er samanburðarhæf.        */
  /* ---- VÆNT STIG ----
     ÁÐUR: næsta umferð notaði FPL ep_next, seinni umferðir ppg x FDR-fasta.
     Það voru TVÆR ÓKVARÐAÐAR aðferðir og gaf stökk milli GW1 og GW2
     (2,0 -> 3,4 fyrir sama leikmann). Nú EIN aðferð:
       grunnur  = leikmanns-stig, óháð umferð (ep_next ef til, annars stig/leik)
       margfaldari = MÆLD stig við hans FFDR / meðaltal stöðunnar
     Þar með er kvarðinn festur við FPL-spána og aðeins LEIKURINN breytist.  */
  function expPoints(pid, g) {
    const p = byId[pid];
    if (!p) return 0;
    return expPointsFor({ p, fxs: fixByTeamGw[p.team]?.[g] || [],
      fixDifficulty, teamId: p.team });
  }
  // Nettó ávinningur skipta: vænt stig inn − út yfir sjóndeildarhring, mínus
  // refsing. FH-skipti gilda AÐEINS í sinni umferð — ávinningurinn líka.
  /* ÁÆTLUNIN SKIPTIST Í TVENNT OG SKILYRÐIÐ ER EITT (sjá `isInitialSquadPick`
     í model.js). Venjuleg gildi, ekki hook: `plan` er þegar state og þetta
     eru tvær síur á honum — enginn hook-röð til að rugla.                */
  const gw1Picks = plan.filter(isInitialSquadPick);
  const planMoves = plan.filter(t => !isInitialSquadPick(t));

  // Nettó ávinningur skipta — sjá athugasemdina fyrir ofan.
  function transferNet(tr, horizon = 5) {
    const h = fhGws.has(tr.gw) ? 1 : horizon;
    let gain = 0;
    for (let g = tr.gw; g < tr.gw + h && g <= maxGw; g++) {
      gain += expPoints(tr.inId, g) - expPoints(tr.outId, g);
    }
    return +gain.toFixed(1);
  }

  /* ---------- CHIP-PLÁSS úr FPL-API ----------
     Hvert "pláss" er eitt chip í einum hálfleik, með gildistíma úr API-inu.
     Fallback ef API-gögnin vantar: sömu reglur harðkóðaðar.                */
  const chipSlots = useMemo(() => {
    const raw = Array.isArray(chipRules) ? chipRules : chipRules?.chips;
    if (raw?.length) {
      return raw.map(c => ({
        key: `${c.name}:${c.start_event}`, name: c.name,
        from: c.start_event, to: c.stop_event,
        half: c.start_event >= 20 ? 2 : 1,
      }));
    }
    return [
      { key:"wildcard:2", name:"wildcard", from:2,  to:19, half:1 },
      { key:"freehit:2",  name:"freehit",  from:2,  to:19, half:1 },
      { key:"bboost:1",   name:"bboost",   from:1,  to:19, half:1 },
      { key:"3xc:1",      name:"3xc",      from:1,  to:19, half:1 },
      { key:"wildcard:20",name:"wildcard", from:20, to:38, half:2 },
      { key:"freehit:20", name:"freehit",  from:20, to:38, half:2 },
      { key:"bboost:20",  name:"bboost",   from:20, to:38, half:2 },
      { key:"3xc:20",     name:"3xc",      from:20, to:38, half:2 },
    ];
  }, [chipRules]);

  // chips-ástand: { slotKey: gw }
  function setChipSlot(slotKey, g) {
    setChips(prev => {
      const next = { ...prev };
      if (!g) { delete next[slotKey]; return next; }
      // ein chip per umferð — fjarlægja aðra sem er þegar í þeirri umferð
      for (const k of Object.keys(next)) if (next[k] === g) delete next[k];
      next[slotKey] = g;
      return next;
    });
  }
  // hvaða chip er í umferð g? (skilar nafni)
  const chipAt = (g) => {
    const key = Object.keys(chips).find(k => chips[k] === g);
    if (!key) return null;
    const slot = chipSlots.find(x => x.key === key);
    return slot?.name || (key.includes(":") ? key.split(":")[0] : key);
  };

  /* ---------- SKIPTA-KOSTNAÐUR per umferð ----------
     1 frítt skipti á umferð, má safna upp í 5. Hvert aukalegt = -4 stig.
     Wildcard og Free Hit: ótakmörkuð, ekkert -4.
     Fyrir GW1-frest: ótakmörkuð og frí.                                     */
  /* Skipta-kostnaður reiknast í model.js. ATH LAGFÆRING: Wildcard/Free Hit
     eyðir EKKI söfnuðum fríum skiptum lengur — þau haldast og +1 bætist við
     (regla FPL frá 2024/25). Eldri útgáfa endurstillti í 1 sem sýndi ranga
     "X frí" tölu eftir chip-umferðir.                                     */
  const transferCost = useMemo(
    () => computeTransferCost({ plan, chipAt, maxGw, preSeason }),
    [plan, chips, chipSlots, maxGw, preSeason]);

  /* ---------- VERÐMÆTI CHIPS per umferð ----------
     Bench Boost: hvað bekkurinn (4 menn) væri vænt að skora í þeirri umferð.
     Triple Captain: AUKA-stigin sem fyrirliðinn gefur (×3 í stað ×2 = +1×).
     Þetta svarar spurningunni "hvaða umferð á ég að nota þetta í?"          */
  const chipValue = useMemo(() => {
    if (!players || !fixtures) return {};
    const out = {};
    for (let g = 1; g <= maxGw; g++) {
      /* ThRIDJA AFRITID AF UPPSTILLINGAR-LYKKJUNNI VAR HER — OG ThAD LIFDI
         ATHUGASEMDINA SEM SEGIR AD ThAU SEU HORFIN (lagad 20.8.2026).
         Athugasemdin vid `squadForGw` segir „Bædi `squadAt` og
         aetlunar-skonnunin lesa nu thetta" — en `chipValue` bar sitt eigid
         afrit, ord fyrir ord. Thad var meinlaust svo lengi sem regla
         thess var SAMA; um leid og uppstillingin fór ad ERFAST hefdi
         `chipValue.bboost` summad ANNAN bekk en vollurinn syndi — tvær
         tolur um sama bekk, hvor ur sinni utfærslu. Nakvaemlega
         `buildTeamMetrics`-atvikid (CLAUDE.md kafli 7).
         `squadForGw(g)` skilar NYJUM hlutum i hverju kalli (`.map(s => ({...s}))`
         + `{...sq[i]}`), svo hér er ekkert sameiginlegt astand ad
         yfirskrifa — sama afrit-semantik og `[...squadAt]` a vellinum.  */
      const sq = squadForGw(g);
      const bb = sq.filter(x => !x.starter).reduce((a, x) => a + expPoints(x.id, g), 0);
      const capIn = sq.some(x => x.id === captain && x.starter);
      const tc = capIn ? expPoints(captain, g) : 0;   // auka 1x ofan á venjuleg 2x
      out[g] = { bboost: +bb.toFixed(1), "3xc": +tc.toFixed(1) };
    }
    return out;
    /* `fixDifficulty` VANTADI I DEPS og `events` var thar an thess ad vera
       notad. Afleidingin: "best i GW x" fyrir Bench Boost og Triple Captain
       var reiknad med FYRIR-odds/fyrir-Elo thyngd og uppfaerdist ekki fyrr
       en eitthvad OSKYLT breyttist. Chip-akvordun er dyr — hun a ad lesa
       somu FFDR og allt annad a skjanum.                                */
    // `squadForGw` I DEPS — hann BER nu `plan`/`benchSwaps`/`squadOverride`/
    // `fhGws`, en their eru latnir standa: eftirlitid (`react-hooks/exhaustive
    // -deps`) er ekki i keyrslu hér og skra sem missir hann thegjandi er
    // versta utkoman (sbr. `fixDifficulty`-atvikid i athugasemdinni ofar).
  }, [squadForGw, players, fixtures, plan, benchSwaps, squadOverride, captain, maxGw, byId, fixByTeamGw, fixDifficulty, fhGws]);

  // besta umferð fyrir hvert chip innan gildistíma
  const bestGwFor = (name, from, to) => {
    if (name !== "bboost" && name !== "3xc") return null;
    let best = null;
    for (let g = Math.max(from, gw); g <= to && g <= maxGw; g++) {
      const v = chipValue[g]?.[name];
      if (v == null) continue;
      if (!best || v > best.v) best = { g, v };
    }
    return best;
  };

  const totalHits = useMemo(() =>
    Object.values(transferCost).reduce((a, x) => a + x.points, 0), [transferCost]);

  const ev = events?.find(e => e.id === gw);

  /* ---------- Hleðsla / villa ---------- */
  if (dataState === "loading") return (
    <div style={S.shell}><div style={S.loading}>{"Fetching official FPL data…"}</div></div>
  );
  if (dataState === "error") return (
    <div style={S.shell}><div style={S.errBox}>
      {"Could not fetch the data from"} <code>data/</code>{". Run GitHub Actions (fetch-data) and try again."}
    </div></div>
  );

  return (
    <div className="app-shell" style={S.shell}>
      {/* ---------- Haus ---------- */}
      <header className="app-head" style={S.head}>
        <Logo />
        <div className="head-right" style={S.headRight}>
          {/* "🔍 Search"-HNAPPURINN ER FARINN (25.8.2026, ad beidni
              notandans: "Search boxid virkar ekki, ma taka ut, eg nota bara
              player search i player stats").

              Hann GERDI raunar eitt: `setView("players")` — sama og
              flipinn `👥 Player stats` beint fyrir nedan. Notandinn las
              samt „Search" sem leitarbox og fekk flipa; vaentingin var
              rong OG hnappurinn var tviverknadur, svo hvorttveggja leysist
              med thvi ad taka hann ut. Leitin sjalf er OBREYTT — hun er i
              flipanum, thar sem hun hefur 124 dalka, throskulda, vaktlista
              og samanburd sem thessi hnappur hafdi aldrei.

              SAGAN SEM MA EKKI TYNAST: adur var her `browse`-hamur med
              nafna-leit + stodu-siu. Hann var TVIVERKNADUR og var tekinn
              ut; hnappurinn lifdi thad af sem visir. Nu fer hann lika.
              Tveir hnappar hetu einu sinni badir "Leikmenn" og thad rugl
              var MAELT (bædi vafra-leit og prof greipu thann ranga) —
              thess vegna er eitt heiti a einum stad rett endastada.
              SKIPTA-GLUGGINN (selling) LIFIR OBREYTTUR og er OSKYLDUR:
              hann veit hvad thu ert ad selja, hvad er i bankanum og hvad
              3-per-felag reglan segir. Leikmannalistinn veit ekkert af thvi. */}
          <button style={{ ...S.searchBtn, ...(showFfdr ? S.searchBtnOn : {}) }}
            onClick={() => setShowFfdr(v => !v)}
            title={"Fixture difficulty for every team, defensive and attacking"}>{"📊 FFDR"}</button>
          <button style={{ ...S.searchBtn, ...(showChips ? S.searchBtnOn : {}) }}
            onClick={() => setShowChips(v => !v)}
            title="Wildcard, Free Hit, Bench Boost, Triple Captain">{"🎫 Chips"}</button>
          {/* ============================================================
              TENGT EDA OTENGT — TVEIR HLUTIR, EKKI EINN MED TVEIMUR
              HEITUM (21.8.2026)
              ============================================================
              Notandinn: „Taktu gluggann fyrir urlid ut og Refresh takkann.
              Og setjum disconnect takka fyrir aftan."

              REITURINN OG „Connect" ERU ADGERDIN; ThEGAR HUN ER GERD ERU
              THAU RUSL — sama rokfaersla sem tok fjorar skyringa-blokkir
              ut i gaer. Og „Refresh" var ekki bara rusl heldur MERKI UM
              ENDURNYJUN SEM GERDIST EKKI: `urlInput` er aldrei vistadur,
              svo eftir endurhledslu skiladi hann villunni „Paste your FPL
              link or team ID", og med fylltan reit kalladi hann
              `setEntryId` med SAMA gildi — React sleppir tha
              endurteikningu og pikka-effectinn keyrdi EKKI. Maelingin og
              hvad kom i stadinn: sja `liveTick` i deps their.

              `entryId` ER SKILYRDID, ekki `conn.state`: `conn` er
              birtingar-astand sem lifir villur og bid-stodur, en
              `entryId` er ThAD SEM PIKKA-EFFECTINN LES (linu 785). Vaeri
              skilyrdid `conn` gaeti reiturinn horfid an thess ad nokkud
              vaeri tengt.                                              */}
          {/* DISCONNECT-HNAPPURINN FLUTTIST NIDUR I STODU-RODINA (25.8.2026,
              ad beidni notandans: "Faera disconnect hnapp, gera minni og
              setja haegra megin vid ✓ Connected").
              Hann er thvi EKKI lengur her — sja `connRow` nedar. Skilyrdid
              `entryId ? ... : ...` heldur samt haus-reitnum: an tengingar a
              inntaks-reiturinn ad vera her, med tengingu ekkert.        */}
          {entryId ? null : (<>
            <input className="url-input" style={S.urlInput}
              placeholder={"FPL URL or team ID"} value={urlInput}
              title={"Paste the link to YOUR TEAM (it contains /entry/NUMBER/) — or just the number. Example: fantasy.premierleague.com/entry/1234567/event/1"}
              onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && connectUrl()} />
            <button style={S.connectBtn} onClick={connectUrl}
              disabled={conn.state === "checking"}>
              {conn.state === "checking" ? "Checking …" : "Connect"}</button>
          </>)}
        </div>
        {/* STADA TENGINGARINNAR — SYNILEG. Adur var engin stadfesting og
            engin villa: notandinn sa "Tengt lid X" samstundis og svo ekkert
            thott soknin hefdi brostid. Nu sest hvad gerdist i raun.       */}
        {/* RODIN SEGIR NU HVERJU VID ERUM TENGD, OG BER DISCONNECT (25.8.2026)

            Notandinn: "Baetum vid hvad hvada lid appid er connected vid, t.d.
            setja sem sagt username lika. T.d. Connected to Kalelgifler eda ef
            thad er ekki haegt, Connected to og svo team ID."

            TVENNT SEM ThURFTI AD BREYTAST OG ThAD ER EKKI SAMA:
            1. SKILYRDID. Adur `conn.state !== "idle"`, sem er BIRTINGAR-
               astand og lifir adeins thessa lotu. Vid ENDURHLEDSLU kemur
               `entryId` ur localStorage medan `conn` er `idle` — svo rodin
               (og thar med Disconnect) HORFDI thott lidid vaeri tengt.
               Skilyrdid er nu `entryId || conn.state !== "idle"`: tenging
               ER `entryId` (sama rok og haus-reiturinn ofar hvilir a).
            2. HEITID. `conn.name` er lidsnafnid (eda nafn stjornandans) og
               er sett vid tengingu — en er NULL eftir endurhledslu af somu
               astaedu. Tha fellur thad a `team {id}`, sem er nakvaemlega
               varaleidin sem notandinn nefndi sjalfur. Engin agiskun: ef
               nafnid er ekki i minni er thad EKKI birt.                  */}
        {(entryId || conn.state !== "idle") && (
          <div style={{ ...S.connRow,
            background: conn.state === "error" ? "#fdecee"
                      : conn.state === "checking" ? "#f4f4f6"
                      : conn.picks === false ? "#fff6e0" : "#e6f9f0",
            color: conn.state === "error" ? "#93202b"
                 : conn.state === "checking" ? C.text2
                 : conn.picks === false ? "#7a5600" : "#046b41" }}>
            <span style={S.connText}>
              {conn.state === "error" ? "✕ " : conn.state === "checking" ? "… "
                : conn.picks === false ? "⚠ " : "✓ "}
              {conn.msg || interp("Connected to {0}", [conn.name || `team ${entryId}`])}
              {conn.state === "error" && (
                <span style={S.connHint}>
                  {" "}{"Example: fantasy.premierleague.com/entry/1234567/event/1 — or just 1234567"}
                </span>
              )}
            </span>
            {entryId && (
              <button style={S.discBtnSm} onClick={disconnectFpl}
                title={"Unlink this FPL team. Your squad, transfer planning, line-ups, chips and captain are NOT touched — but the pitch goes back to your own saved squad, which may differ from the FPL one."}>
                {"Disconnect"}</button>
            )}
          </div>
        )}
      </header>

      {/* ---------- Flipar ----------
          "Umferdin" og "Stigatafla" eru SJALFSTAEDIR lesmatar sem lesa
          data/last_gw*.json og players.json — their hanga ekki a lidinu
          thinu og virka thott ekkert se tengt.                            */}
      <div style={S.viewTabs}>
        {/* "Set pieces" bar SAMA taknid sem "Planner" (⚽) — tveir flipar med
            sama tákni er thad sama og ekkert tákn. Nu teiknad ikon (dautt
            bolta-spark ad marki), sja src/Icons.jsx. Textinn heldur ser thvi
            prófin OG notandinn finna flipann eftir nafni.                 */}
        {[["planner","⚽ Planner"],["players","👥 Player stats"],["teams","🛡️ Teams"],
          ["gw","📊 Gameweek"],
          ["board","🏆 Leaderboard"],["best","Best of the best", CrownIcon],
          ["sp","Set pieces", SetPieceIcon]].map(([k,l,Ico]) => (
          <button key={k} style={{ ...S.viewTab, ...(view === k ? S.viewTabOn : {}),
                                   ...(Ico ? S.viewTabIcon : {}) }}
            onClick={() => setView(k)}>
            {Ico ? <Ico size={14} title="" /> : null}{l}
          </button>
        ))}
        {/* NFL-appid er SJALFSTAETT app a eigin sidu (`nfl.html`), ekki
            flipi hér — thau deila engum koda, engum stilum og engum
            gognum. Thess vegna er thetta <a> en ekki <button>: smellur
            hledur adra sidu i stad thess ad skipta um `view`.
            An thessa hlekks vaeri hitt appid ofinnanlegt. */}
        <a href="nfl/" style={{ ...S.viewTab, textDecoration: "none",
                                    display: "inline-flex", alignItems: "center" }}>
          🏈 NFL
        </a>
      </div>

      {view === "gw" && (
        <GwReport report={lastGw} shotsFile={lastGwShots} />
      )}
      {view === "players" && (
        <PlayerList players={players} teams={teams} teamById={teamById} events={events}
          seasonsFile={seasonsFile} imminent={imminent} shotsFile={lastGwShots}
          fixtures={fixtures} odds={odds} defcon={defcon} defconHist={defconHist} consist={consist}
          bsd={[bsd, bsdLive]} photoUrl={photoUrl} Crest={Crest}
          /* BUY WINDOWS tharf FFDR PER LEIKMANN — sja BuyWindows.jsx. `fixDifficulty`
             er byggd her (EINU SINNI) og send inn; hun ma ekki byggjast i tveimur
             stodum af somu astaedu og `buildTeamMetrics` var flutt ur thessari skra. */
          fixByTeamGw={fixByTeamGw} fixDifficulty={fixDifficulty} gwNow={gw} maxGw={maxGw}
          onPickPlayer={id => setDetail({ kind:"player", id })}
          watch={watch}
          onWatch={id => setWatch(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])}
          mineIds={squadIds}
          cmpIds={cmpIds}
          onCompare={id => setCmpIds(v => v.includes(id) ? v.filter(x => x !== id)
                                                        : [...v, id].slice(0, 4))} />
      )}
      {view === "teams" && (
        /* `bsdLive` BER `team_matches` — EINA HEIMILDIN UM xGC A
           YFIRSTANDANDI TIMABILI. Hun vantadi hingad (24.8.2026):
           `teamstats.js` hafdi bædi samlagninguna OG jafngildis-vordinn,
           en propid var ALDREI sent, svo dalkarnir hefdu stadid tomir
           ThOTT pipeline-an skrifadi rodina. Nakvaemlega gildran sem
           `lineups.json` er nefnd fyrir i kafla 7.1: "pipeline skrifadi
           hana en APPID LAS HANA ALDREI".
           ATH: venjuleg /* *\/-athugasemd, EKKI {/* *\/} — sidara formid
           er JSX-BARN og bjo til TVO born i `cond && ( ... )` sem tekur
           eitt. Byggingin fell samstundis.                            */
        <Teams teams={teams} teamForm={teamForm} luck={luck} teamShots={teamShots}
          fixtures={fixtures} bsdLive={bsdLive}
          bsdTeams={bsdTeams} shotIndex={shotIndex}
          seasonLabel={currentSeasonLabel} Crest={Crest} />
      )}
      {view === "best" && (
        <BestOfBest pros={typeof pros === "string" ? null : pros}
          panelFile={prosPanel} players={players}
          teamById={teamById} mineIds={squadIds}
          onPickPlayer={id => setDetail({ kind:"player", id })} />
      )}
      {view === "sp" && (
        <SetPieces players={players} teams={teams} teamById={teamById} Crest={Crest}
          notes={spNotes} bsd={bsd} onPickPlayer={id => setDetail({ kind:"player", id })} />
      )}
      {view === "board" && (
        <>
        {/* `imminent` og `photoUrl` fylgja ekki lengur: IG/IA-spjoldin
            fluttu undir Player stats og bekkjar-haettan var tekin ut, svo
            stigataflan les nu ADEINS players.json. */}
        {/* SOMU GAGNASKRAR OG LEIKMANNATAFLAN FAER. An theirra las stigataflan
            HRAT players.json og 20 kassar voru varanlega tomir (Ogn 8/8,
            Leikir framundan 5/5, Jofnudur 4/4) — sja makeEnricher i stats.js. */}
        <Leaderboard players={players} teams={teams} teamById={teamById} Crest={Crest}
          imminent={imminent} shotsFile={lastGwShots} fixtures={fixtures} events={events}
          odds={odds} defcon={defcon} consist={consist} season={currentSeasonLabel}
          bsd={[bsd, bsdLive]}
          onPickPlayer={id => setDetail({ kind:"player", id })}
          seasonNote={preSeason
            ? "The 2026/27 season has not started. The numbers here are the cumulative totals FPL is showing right now — they reset to zero when GW1 opens."
            : null} />
        {/* EINKA-DEILDIR + VERDLAUN. Undir stigatoflunni thvi thetta er
            sama spurning fra hinni hlidinni: "hvernig stend eg?" —
            stigataflan er leikmanna-tolur, thetta er MIN stada.        */}
        <Leagues proxyUrl={PROXY_URL} entryId={entryId} />
        </>
      )}

      {view === "planner" && (<>
      {/* ---------- Tímalína ---------- */}
      <div style={S.tlWrap}>
        <div style={S.tlOuter}>
          <button style={{ ...S.tlArrow, ...(tlStart <= 1 ? S.tlArrowOff : {}) }}
            disabled={tlStart <= 1} title={"Earlier gameweeks"}
            onClick={() => setTlStart(v => Math.max(1, v - tlWindow))}>‹</button>
        <div style={S.tlRow}>
          <div style={S.tlLine} />
          {Array.from({ length: Math.min(tlWindow, maxGw) }, (_,i) => tlStart + i).filter(n => n <= maxGw).map(n => {
            const active = n === gw;
            const has = plan.some(t => t.gw === n);
            const brk = breaks[n];   // fjoldi daga, eda undefined
            return (
              <React.Fragment key={n}>
                <div style={S.nodeCol}>
                  {/* CHIP-IKON FYRIR OFAN UMFERÐINA */}
                  <div style={S.chipSlotAbove}>
                    {(() => {
                      const c = chipAt(n);
                      if (!c) return null;
                      const meta = CHIPS[c];
                      const val = chipValue[n]?.[c];
                      return (
                        <span style={{ ...S.chipAbove, background: meta.color }}
                          title={`${meta.label}${val ? interp(" — expected +{0} pts", [val]) : ""}`}>
                          <span style={S.chipAboveIcon}>{meta.icon}</span>
                          <span style={S.chipAboveTxt}>{meta.short}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <button onClick={() => setGw(n)} style={{ ...S.node, ...(active ? S.nodeOn : {}) }}>
                    <span style={S.nodeNum}>{n}</span>
                    {has && <span style={S.nodeDot} />}
                    {transferCost[n]?.hits > 0 &&
                      <span style={S.nodeHit} title={interp("{0} transfers, {1} over the free ones = {2} pts", [transferCost[n].made, transferCost[n].hits, transferCost[n].points])}>
                        {transferCost[n].points}
                      </span>}
                  </button>
                </div>
                {/* MILLI-HNUTA MERKIN. Baðar sitja i sama bili (eftir
                    umferd n) og lesa somu `gwSpans`, svo thau geta ekki
                    lent a sitthvorum stad fyrir sama gap.
                    SILHUETTAN GREINIR THAU (CLAUDE.md: i smarri staerd er
                    hun allt): hnottur = hringur, stjarna = oddar. Tvo
                    hringlaga takn hefdu verid EINS vid 11 px.           */}
                {brk && <span style={S.intl}
                  title={interp("International break — {0} days between GW{1} and GW{2}", [brk, n, n + 1])}>
                  <span style={S.globe}>🌐</span></span>}
                {euroGw[n] && <span style={S.intl}
                  title={interp("European week between GW{0} and GW{1} — {2} ({3} matches)",
                                [n, n + 1, euroGw[n].comps.map(compLabel).join(", "), euroGw[n].n])}>
                  <span style={S.euroStar}>★</span></span>}
              </React.Fragment>
            );
          })}
        </div>
          <button style={{ ...S.tlArrow, ...(tlStart + tlWindow > maxGw ? S.tlArrowOff : {}) }}
            disabled={tlStart + tlWindow > maxGw} title={"Later gameweeks"}
            onClick={() => setTlStart(v => Math.min(Math.max(1, maxGw - tlWindow + 1), v + tlWindow))}>›</button>
        </div>
        {/* SKYRING A MERKJUNUM I STIKUNNI — OG A ThVI ThEGAR ThAU VANTA.
            🌐 er reiknad ur `fixtures.json` og er thvi alltaf til. ★ er
            reiknad ur `euro_fixtures.json`, sem ber ENGA dagsetningu innan
            timabilsins fyrr en drattur ridlakeppninnar er kominn (i agust
            eru thar adeins Ofurbikarinn og Samfelagsskjoldurinn, BADIR
            fyrir GW1). Tomt merki an skyringar laesi eins og "engin
            evropukeppni" — sem er RANGT; hun er 6 lid. Reglan er su sama og
            annars stadar i appinu: tomt astand a ad SEGJA hvers vegna.  */}
        <div style={S.tlLegend}>
          <span style={S.tlLegendItem}><span style={S.globeMini}>🌐</span>{"international break"}</span>
          <span style={S.tlLegendItem}><span style={S.euroMini}>★</span>{
            Object.keys(euroGw).length
              ? interp("European week ({0})", [Object.keys(euroGw).length])
              : euroIn.size
                ? interp("European week — {0} clubs are in Europe, dates land when the draw is made", [euroIn.size])
                : "European week"
          }</span>
        </div>
        <div style={S.deadline}>
          <b>GW{gw}</b> {"· deadline"} {fmtDeadline(ev?.deadline_time)}
          {ev?.finished ? " · finished" : ""}
          {/* ENDURSTILLA UMFERÐ — birtist aðeins ef eitthvað er plönuð */}
          {(() => {
            const pl = gwPlanned(gw);
            if (!pl.any) return null;
            const what = [
              pl.tr ? interp("{0} transfers", [pl.tr]) : null,
              pl.bs ? "its own line-up" : null,
              pl.ch,
            ].filter(Boolean).join(" · ");
            return confirmReset === "gw" ? (
              <span style={S.resetConfirm}>
                {"Clear"} {what}?
                <button style={S.resetYes} onClick={() => resetGw(gw)}>{"yes"}</button>
                <button style={S.resetNo} onClick={() => setConfirmReset(null)}>{"no"}</button>
              </span>
            ) : (
              <button style={S.resetBtn} onClick={() => setConfirmReset("gw")}
                title={interp("Clear all planning in GW{0}: {1}", [gw, what])}>
                {"↺ reset GW"}{gw}
              </button>
            );
          })()}
          {(() => {
            const tc = transferCost[gw];
            if (!tc) return null;
            if (tc.unlimited) return (
              <span style={S.tcFree}>
                {/* AÐEINS WC/FH gefa skipti — sjá `unlimitedBy` í model.js.
                    Að spyrja `tc.chip` gaf „Bench Boost — ótakmörkuð skipti".
                    "initial" = GW1 EFTIR frest: thad eru ekki skipti heldur
                    upphafslidid, og setningin segir thad i stad thess ad
                    lofa skiptum sem eru ekki i bodi.                      */}
                {tc.unlimitedBy === "chip" ? interp("{0} — unlimited transfers", [CHIPS[tc.chip].label])
                 : tc.unlimitedBy === "initial" ? "starting squad — not transfers"
                 : "unlimited free transfers"}
              </span>
            );
            return (
              <span style={tc.hits > 0 ? S.tcHit : S.tcOk}>
                {tc.made} {"transfers ·"} {tc.ftAvailable} {"free"}
                {tc.hits > 0 ? interp(" · {0} pts", [tc.points]) : ""}
              </span>
            );
          })()}
        </div>
        {/* FORLEIKS-MALSGREININ VAR FJARLAEGD (beidni notandans 20.8.2026).
            Reglan sjalf er OBREYTT i kodanum — `preSeason` styrir aframhaldandi
            `buyOf` (kaupverd laesist ekki fyrr en frestur), `computeTransferCost`
            og `seasonNote` a umferdastikunni. Thad sem for var TEXTINN, ekki
            hegdunin. Vordur: `planner-pitch.mjs` kafli D.                    */}
      </div>

      {/* ---------- Mælaborð ---------- */}
      <div className="app-stats" style={S.stats}>
        {/* MINUS ER LEYFILEGT ASTAND, EKKI VILLA: `money()` skrifar `-£1.5`
            (ekki `£-1.5`) og `tone:"bad"` gerir hann raudan. Engin klipping
            i 0 — sja `commitTransfer`.                                    */}
        <Stat icon="💰" label={"Bank"} value={money(bank)}
          sub={bank < 0
            ? interp("squad {0} · needs {1} — sell to fund it", [money(squadValue), money(-bank)])
            : interp("squad {0} · total {1}", [money(squadValue), money(bank + squadValue)])}
          tone={bank < 0 ? "bad" : "ok"} />
        <Stat icon="🏆" label={"Total points"} value={totalPts == null ? "—" : totalPts} sub={entryId ? interp("team {0}", [entryId]) : "connect FPL URL"} />
        <Stat icon="📅" label={interp("Gameweek {0}", [gw])} value={gwPts == null ? "—" : gwPts}
          sub={apiHit ? interp("{0} hit taken", [-apiHit])
            : transferCost[gw]?.hits > 0 ? interp("planned hit {0}", [transferCost[gw].points])
            : ev?.finished ? "finished" : "not started"}
          tone={(apiHit || transferCost[gw]?.hits) ? "bad" : "ok"} />
      </div>
      {/* Leikir umferðarinnar eru NÚ AÐEINS við hliðina á vellinum
          (GwFixtureList). Þeir voru bæði hér og þar — tvítekning. */}

      <div className="app-main" style={S.main}>
        {/* ---------- Völlur ---------- */}
        <div>
          <div style={S.capBar}>
            <div style={S.capBox}>
              <span style={S.capBadge}>C</span>
              <select style={S.capSel} value={captain}
                onChange={e => { const v = +e.target.value; if (v === vice) setVice(null); setCaptain(v); }}>
                {starters.map(s => <option key={s.id} value={s.id}>{byId[s.id]?.web_name}</option>)}
              </select>
            </div>
            <div style={S.capBox}>
              <span style={{ ...S.capBadge, background: C.text3 }}>V</span>
              <select style={S.capSel} value={vice || ""} onChange={e => setVice(e.target.value ? +e.target.value : null)}>
                <option value="">—</option>
                {starters.filter(s => s.id !== captain).map(s => <option key={s.id} value={s.id}>{byId[s.id]?.web_name}</option>)}
              </select>
            </div>
            {/* ============================================================
                "PICK BEST XI" — SJA `pickBestXi` FYRIR ROKSTUDNINGINN
                ============================================================
                BENCH BOOST: i BB-umferd skora ALLIR 15, svo hvada 11 byrja
                er einskis virdi. Takkinn er thvi SLOKKTUR og MERKIMIDINN
                SEGIR AF HVERJU — slokktur takki an skyringar lesist eins og
                bilun, og takki sem virkar en gerir ekkert er verri.       */}
            <button style={{ ...S.ghost, ...(bbActive ? S.ghostOff : null) }}
              disabled={bbActive}
              onClick={() => { if (!bbActive) pickBestXi(); }}
              title={bbActive
                ? "Bench Boost: all 15 players score this gameweek, so which 11 start is worth nothing. Nothing to pick."
                : "Arranges your XI for this gameweek to the highest total expected points, using the same expected-points model as the rest of the app. It sets WHO STARTS — the bench order is not changed, because FPL stores that as the squad's own seat order and this button only touches the starter flags. Undo with Reset bench."}>
              {bbActive ? "Best XI — nothing to pick in Bench Boost" : "⚡ Pick best XI"}</button>
            {/* „sets who starts, not bench order" VAR HER SEM SYNILEG LINA
                OG ER FARIN (beidni notandans 21.8.2026: „Taka thetta ut").
                STADREYNDIN ER OBREYTT OG HUN MATTI EKKI FARA MED LINUNNI:
                `benchSwaps` vixlar ADEINS `starter`-flaggi og birt rod kemur
                ur `order` i `plan`/`START_SQUAD`, svo takkinn GETUR ekki
                radad bekknum — an fyrirvarans lofar hann einhverju sem hann
                gerir ekki. Fyrirvarinn liggur thvi i `title` a TAKKANUM
                sjalfum, thar sem spurningin vaknar, og MEKANISMINN (seat
                order) fluttist med — annars hefdi tooltip nr. 2 tapad efni
                sem tooltip nr. 1 bar ekki.
                SOMU URLAUSN OG VERDSPAR-MALSGREININ 20.8.: malsgreinin for,
                fyrirvarinn lifdi i rodinni og i `title`-unum.
                Vordur: `planner-pitch.mjs` — hun fullyrdir nu um TOOLTIP-ID
                (og ad synilega linan se farin), thvi vordur sem er EYDT er
                hvernig fullyrding verdur osonn i thogn.                 */}
            {(benchSwaps[gw]?.length > 0) &&
              <button style={S.ghost} onClick={() => setBenchSwaps(bs => { const n = { ...bs }; delete n[gw]; return n; })}>{"Reset bench"}</button>}
          </div>

          {/* VÖLLUR — spjöldin í VENJULEGU FLÆÐI ofan á bakgrunninum.
              Fyrri útgáfa negldi raðir á föst prósent af hæð; þegar spjöldin
              urðu hærri en bilið SKÖRUÐUST raðirnar og bekkurinn klipptist
              neðan af. Nú deila raðirnar plássinu (space-evenly) og
              völlurinn VEX ef efnið þarf meira — skörun er ómöguleg.       */}
          {/* „ÞÚ NOTAR HANN ALDREI" ER NU UNDIR LEIKJUNUM, VID HLIDINA A
              VELLINUM (beidni notandans 20.8.2026) — sja `S.side` nedar i
              hinum dalki `pitchSplit`. Bordinn stod her, MILLI maelabordsins
              og vallarins, og ytti thvi vellinum nidur i hvert skipti sem
              hann birtist. Rokfraedin (`unusedPlan`) er OBREYTT — thad sem
              faerdist er hvar hann er teiknadur.                          */}

          <div className="pitch-split" style={S.pitchSplit}>
          <div className="pitch-col" style={S.pitchCol}>
          <Pitch>
            <div style={S.rowsArea}>
              {[1, 2, 3, 4].map(pos => (
                <div key={pos} style={S.pitchRowFlex}>
                  {/* `bench={!sq.starter}`: i BB-umferd eru bekkjarmenn A
                      VELLINUM og their halda `pCardBench` (graa spjaldid)
                      svo "hverjir eru XI-in" tapist ekki. Utan BB er thetta
                      alltaf `false` her — obreytt hegdun.                  */}
                  {rows[pos].map(sq => (
                    <PlayerCard key={sq.id} s={sq} p={byId[sq.id]} team={teamById[byId[sq.id]?.team]} teamById={teamById}
                      fx={(fixByTeamGw[byId[sq.id]?.team]?.[gw] || [])[0]}
                      bench={!sq.starter}
                      fxNext3={nextGwFixtures(byId[sq.id]?.team, gw)}
                      captain={captain} vice={vice}
                      csFor={csFor}
                      dc={dcOpp[byId[sq.id]?.team]} elo={eloByTeam[byId[sq.id]?.team]} gwNow={gw} sellTenths_={sellOf(sq.id)} diffOf={fixDifficulty}
                      isPlanned={plannedIn.has(sq.id) && !officialIds.has(sq.id)}
                      isSellHint={recommendations.sellIds?.has(sq.id)}
                      onInfo={() => setDetail({ kind:"player", id:sq.id })}
                      onTransfer={() => { setSelling(sq.id); setSearchQ(""); setSwapSel(null); }}
                      onRotation={() => setRotIds([sq.id])}
                      confirmed={lineupBy[`${sq.id}|${gw}`]}
                      onCardClick={() => clickPlayer(sq.id)} swapSel={swapSel} seasonStarted={seasonStarted} seasonGames={seasonGames}
                      clubPlayed={playedByClub[byId[sq.id]?.team]} ep={expPoints(sq.id, gw)} cumLabel={cumLabel}
                      dragId={dragId} setDragId={setDragId}
                      onDropPlayer={fromId => swapStarterBench(fromId, sq.id)} />
                  ))}
                </div>
              ))}
            </div>
            {/* BEKKUR — HTML-borði sem fylgir innihaldinu, ekki fast prósent.
                I BB-umferd eru spjoldin a vellinum, en BORDINN HELST med
                skyringu: tomur borði (eda horfinn borði) les eins og bilun,
                og hann er thad eina sem SEGIR hvers vegna 15 eru a vellinum. */}
            <div style={S.benchArea}>
              <div style={S.benchLabel}>{"Bench"}</div>
              {bbActive ? (
                <div style={S.bbNote}>
                  {/* SETNINGIN HEFUR VERID OSONN TVISVAR OG HVORUG VILLAN
                      VAR I ORDALAGINU HELDUR I ThVI SEM VAR MALAD:
                      · „The lighter cards are your bench" (fram til 20.8.)
                        benti a doufnun sem var `opacity: 0.62` fra
                        `isSellHint` — ALLTAF nakvaemlega tveir menn — medan
                        bekkjar-skugginn sjalfur var 13 i RGB og sast ekki.
                      · „the cards marked BENCH" (20.-25.8.) benti a ord sem
                        er nu FARID (beidni notandans).
                      Hun bendir nu a GRAA SPJALDID, sem er 76 i RGB a badum
                      bokgrunnum og er thad eina sem er sannanlega thar.
                      REGLAN SEM ThETTA KENNIR: bordinn ma adeins nefna thad
                      sem `pCardBench` malar — ekkert annad a vellinum er
                      grátt, og thad er maelt.                            */}
                  {"Bench Boost — all 15 score, so the whole squad is on the pitch. The four grey cards are your bench."}
                </div>
              ) : (
              <div style={S.pitchRowFlex}>
                {bench.map(sq => (
                  <PlayerCard key={sq.id} s={sq} p={byId[sq.id]} team={teamById[byId[sq.id]?.team]} teamById={teamById}
                    fx={(fixByTeamGw[byId[sq.id]?.team]?.[gw] || [])[0]} bench
                    fxNext3={nextGwFixtures(byId[sq.id]?.team, gw)}
                    captain={captain} vice={vice}
                    csFor={csFor}
                    dc={dcOpp[byId[sq.id]?.team]} elo={eloByTeam[byId[sq.id]?.team]} gwNow={gw} sellTenths_={sellOf(sq.id)} diffOf={fixDifficulty}
                    isPlanned={plannedIn.has(sq.id) && !officialIds.has(sq.id)}
                    isSellHint={recommendations.sellIds?.has(sq.id)}
                    onInfo={() => setDetail({ kind:"player", id:sq.id })}
                    onTransfer={() => { setSelling(sq.id); setSearchQ(""); setSwapSel(null); }}
                    onRotation={() => setRotIds([sq.id])}
                    confirmed={lineupBy[`${sq.id}|${gw}`]}
                    onCardClick={() => clickPlayer(sq.id)} swapSel={swapSel} seasonStarted={seasonStarted} seasonGames={seasonGames}
                      clubPlayed={playedByClub[byId[sq.id]?.team]} ep={expPoints(sq.id, gw)} cumLabel={cumLabel}
                    dragId={dragId} setDragId={setDragId}
                    onDropPlayer={fromId => swapStarterBench(fromId, sq.id)} />
                ))}
              </div>
              )}
            </div>
          </Pitch>
          </div>
          {/* HINN DALKURINN: LEIKIR UMFERDARINNAR, OG UNDIR THEIM
              "Never in your XI" (beidni notandans 20.8.2026). `S.side`
              `S.pitchSide` (flex-suila, gap 12, LIMD) er fyrir nakvaemlega
              thetta — sja langa athugasemdina vid `gfWrap` i appStyles.js:
              limingin VAR a leikjakassanum sjalfum og malaði thvi ofan a
              „Never in your XI" um leid og hann fekk systkini. */}
          <div className="pitch-side" style={S.pitchSide}>
          {/* LEIKIR UMFERÐARINNAR — við hliðina á vellinum */}
          <GwFixtureList gw={gw} fixtures={fixtures} teamById={teamById}
            weatherByFx={weatherByFx} travelByFx={travelByFx} liveByFx={liveByFx}
            nameOf={id => byId[id]?.web_name || `#${id}`} diffOf={fixDifficulty}
            onPick={t => setDetail({ kind:"team", id:t })} />
          {/* ============================================================
              MERKI, EKKI MALSGREIN — OG PER-LEIKMANNS-SMAATRIDIN ERU A
              SPJALDINU (21.8.2026)
              ============================================================
              Notandinn: „thetta er alltof mikill og flokinn texti, thott
              upplysingar seu godar. AEtti thetta kannski ad vera frekar a
              player spjaldinu?"

              JA — OG ThAD ER SAMA DOMGREINDIN sem felldi fjorar adrar
              malsgreinar 20.8. (verdspar-malsgreinina, fyrirlidana,
              forleikinn, „How the panel was chosen"). Allar voru RETTAR.
              NAKVAEMT ER EKKI ThAD SAMA OG ThESS VERT AD TAKA PLASSID.

              ThVI FOR:
                · „Looking back at the N gameweeks up to GWM ..." —
                  glugginn stendur i HAUSNUM (`from`-`to`) og nefnarinn
                  stendur a HVERRI ROD („0 of 4"), svo setningin sagdi
                  ThRIDJA sinni thad sem tvisvar var thegar sagt.
                · „Selling one saves ... cheapest bench player ..." —
                  REGLAN ER OBREYTT i `rarelyStarted`/`priceFloors`
                  (odyrasti bekkjarmadur per stodu er ALDREI nefndur), en
                  hun er nu i `title` a „Save £"-holfinu, thar sem
                  spurningin vaknar.
                · „Easier fixtures: ..." — FLUTT A SPJALDID (leit:
                  `unusedSwaps` i leikmannaglugganum). Tillaga um ANNAN
                  mann tok tvo linur inni i merki um thennan.

              ThAD SEM MATTI EKKI FARA og for ekki: glugginn er sagdur
              (hausinn), nefnarinn er a rodinni, ATTIN er merkt a BADUM
              kossum svo thau seu ekki lesin sem eitt, og tolurnar eru
              ALDREI lagdar saman (tveir kassar, tveir teljarar).       */}
          {[unusedPlan.fwd, unusedPlan.back].map((u, ui) => u.rows.length === 0 ? null : (
            <div key={ui ? "back" : "fwd"} style={{ ...S.card, borderColor:C.amber }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>
                {ui ? "Not been in your XI — GW" : "Not in your plan's XI — GW"}
                {u.from}–{u.to}
              </div>
              {/* ATTIN, I EINNI SETNINGARBROT-LINU. Framvirka linan er
                  `u.basis` — LEIDD i memo-unni, ekki skrifud her, svo
                  merkimidinn getur ekki sagt annad en velin gerdi (sama
                  regla og `basis.scale` i „when to sell"). Afturvirka
                  linan er fost af thvi ad hun er ekki agiskun.         */}
              <div style={S.unusedDir}
                title={ui
                  ? "Gameweeks whose deadline has passed — the arrangement you actually had. Nothing here is a forecast."
                  : "Read from your own arrangement: gameweeks you have not changed inherit the last line-up you did set (see the gameweek bar). It is your plan, not a forecast of who will play."}>
                {ui ? "what you actually did" : u.basis}
              </div>
              {/* ============================================================
                  UPPSETNINGIN VAR BROTIN OG ORSOKIN VAR EIN TALA (20.8.2026)
                  ============================================================
                  Notandinn: "lid og verd eru miklu ofar en nofn a leikmanni".
                  Ordid "ofar" var bokstaflegt. `S.srcRow` er
                  `display:flex; alignItems:"center"`, og lid/verd notudu
                  `S.muted` — sem ber **`marginBottom: 8`**. Med
                  `alignItems:center` er ytri kassinn (INNIFALID margin)
                  midjusettur, svo 8px undir textanum lyftu textanum sjalfum
                  um 4px, medan nafnid vid hlidina sat kyrrt. Sjonraent voru
                  thetta tvaer linur i sama flex-rod.
                  `S.muted` er ALMENN blokka-still (malsgreinar undir hausum)
                  og margin-id er RETT thar; thad er RANGT i flex-rod. Rodin
                  ber thvi sinn eigin still (`srcMeta`) i stad thess ad afrita
                  almenna stilinn og laga hann a stadnum — sami still tveimur
                  stodum med ymsum yfirskriftum er tveir stilar sem reka i
                  sundur.
                  `baseline` var mælt og hafnad: hun raðar `posDot` (8px
                  hringur an texta) og `Replace`-hnappnum eftir grunnlinu sem
                  their eiga ekki, svo hringurinn hoppar upp. `center` er rett
                  — vandinn var margin-id, ekki jofnunin.                  */}
              {u.rows.map(r => {
                const p = byId[r.id];
                if (!p) return null;
                return (
                  <div key={r.id} style={S.srcRow}>
                    <span style={{ ...S.posDot, background: POS_COLOR[p.element_type] }} />
                    <span style={S.srcName}
                      onClick={() => setDetail({ kind:"player", id:p.id })}>{p.web_name}</span>
                    <span style={S.srcMeta}>{teamById[p.team]?.short} · £{(p.now_cost/10).toFixed(1)}</span>
                    {/* TALAN SEM BEDIN VAR: „Ballard t.d. kannski bara 1x".
                        NEFNARINN ER MED — bert „1x" segir ekki AF HVERJU
                        thad er 1x, og tala a skjanum an grunns er einmitt
                        „4-10 and never reach 1"-bilunin (CLAUDE.md 8).
                        Nefnarinn er umferdirnar sem hann var I HOPNUM (sja
                        `rarelyStarted`), thvi madur sem var keyptur i midjum
                        glugga var ekki valanlegur i theim fyrri.          */}
                    <span style={S.srcUse}
                      title={interp(ui
                        ? "You picked him in your XI in {0} of the {1} gameweeks he was in your squad. This counts your XI, not autosubs."
                        : "Your plan has him in the XI in {0} of the {1} gameweeks he is in your squad. Gameweeks you have not changed inherit the last line-up you did set.",
                        [r.starts, r.gws])}>
                      {r.starts}{" of "}{r.gws}{" in XI"}</span>
                    {/* ============================================================
                        TVEIR MERKIMIDAR SEM NOTANDINN BAD UM (25.8.2026)

                        "Merkja hann tha sem alltaf bekkjadur" og "ef
                        leikmadur kemst aldrei i pick best xl ad hann se tha
                        merktur her".

                        ThEIR ERU TVEIR OG ThAD ER ASETT: "always benched"
                        er STADREYND um HANS EIGIN aaetlun (starts === 0 i
                        glugganum), "never in best XI" er MAT VELARINNAR
                        (vaent stig). Madur getur verid annad an ad vera
                        hitt — og su samsetning er einmitt uppl.: utan
                        aaetlunar EN i besta XI thydir "thu bekkjar hann ad
                        osekju", medan badir merkimidar samtimis thydir
                        "hann er raunverulega ofaukinn".

                        `starts === 0` er ekki thad sama sem `rarelyStarted`
                        siar a (hun hleypir throdjungi eda minna i gegn), svo
                        merkid greinir "aldrei" fra "sjaldan" — sem er
                        munurinn a "seldu hann" og "skodadu hann".        */}
                    {r.starts === 0 && (
                      <span style={S.srcNever}
                        title={interp("Your own arrangement never has him in the XI across GW{0}-{1} — not once in the {2} gameweeks he is in the squad. This is your plan, not a forecast.",
                                      [u.from, u.to, r.gws])}>
                        {"always benched"}</span>
                    )}
                    {!ui && neverBestXi.has(r.id) && (
                      <span style={S.srcNeverBest}
                        title={interp("The app's own \"pick best XI\" would not select him in ANY gameweek from GW{0} to GW{1}, judged on expected points. That is the machine's view, not your arrangement — the two are shown separately on purpose.",
                                      [u.from, u.to])}>
                        {"never best XI"}</span>
                    )}
                    {/* TALAN OG HNAPPURINN ERU EIN OSKIPTANLEG BLOKK — sja
                        `srcAct` i appStyles.js. Ekki `<span style={{flex:1}}/>`
                        + tvo laus holf: thad var uppsetningin sem let
                        „Replace" fara UT FYRIR kassann a longsta nafninu. */}
                    <span style={S.srcAct}>
                      {/* VERDGOLFS-REGLAN VAR MALSGREIN UNDIR HAUSNUM OG ER NU
                          HER, ThAR SEM TALAN STENDUR. Reglan sjalf er OBREYTT
                          i `rarelyStarted`/`priceFloors` — thad sem faerdist er
                          hvar hun er SOGD, ekki hvad hun gerir.            */}
                      <span style={S.srcFrees}
                        title={"What selling him frees: his selling price minus the cheapest player that exists at his position. The cheapest bench player at each position is never listed here, because selling him frees nothing."}>
                        {"Save £"}{(r.freesTenths/10).toFixed(1)}</span>
                      <button style={S.dBtn} onClick={() => { setSelling(p.id); setSearchQ(""); }}>
                        {"Replace"}</button>
                    </span>
                    {/* ============================================================
                        "OG HVERN AETTI EG AD FA I STADINN?" — NU LIKA HER

                        Notandinn (25.8.2026): "komdu her lika med hugmynd af
                        odrum leikmanni til ad kaupa. Sem er med mest
                        impressive stats og gaeti gengid sem replacement og
                        adallega horft a naestu leiki med FFDR i huga."

                        TILLAGAN VAR ThEGAR TIL — hun var adeins a
                        LEIKMANNASPJALDINU (`unusedSwaps`, 20.8.2026). Hun er
                        thvi FLUTT HINGAD LIKA, EKKI ENDURSMIDUD: sama vorpun,
                        sami listi, sama rodun.

                        RODUNIN ER `rankScore` OG ThAD ER EKKI VAL: hun er
                        MAELDA kaup-rodunin (slaer badi eldri adferd appsins og
                        FPL-eigid xP i 5/5 timabilum, og `rank-model.mjs` ber
                        orakel-thak sem synir ad haerri tala vaeri LEKI).
                        "Naestu leikir med FFDR i huga" er inni i henni —
                        `ffdrAvg` kemur ur `buildRecommendations`, sem kallar
                        `fixDifficulty` MED STODUNNI, svo varnarmadur og
                        framherji hja sama felagi fa ekki somu tolu.
                        Fjorar hordu siurnar (sama stada · a soluverdi + banka ·
                        thrir-per-felag eftir skiptin · tiltaekileiki) eru allar
                        i `unusedSwaps`; bordinn reiknar ekkert sjalfur.     */}
                    {(unusedSwaps[p.id] || []).length > 0 && (
                      <div style={S.srcSwapRow}>
                        <span style={S.srcSwapLbl}
                          title={"Ranked by the measured buy ranking (rankScore), which already reads the upcoming fixtures for THIS position. Filtered to what you could actually do: same position, within his selling price plus your bank, still legal on three-per-club, and available."}>
                          {"instead:"}</span>
                        {(unusedSwaps[p.id] || []).map(c => (
                          <button key={c.id} style={S.srcSwapBtn}
                            onClick={() => setDetail({ kind:"player", id:c.id })}
                            title={interp("{0} — {1}, £{2}. Suggested by the measured buy ranking for this position over the coming gameweeks. Opens his card; it does not make the transfer.",
                                          [byId[c.id]?.web_name || c.id,
                                           teamById[byId[c.id]?.team]?.short || "?",
                                           ((byId[c.id]?.now_cost ?? 0) / 10).toFixed(1)])}>
                            {byId[c.id]?.web_name || c.id}
                            <span style={S.srcSwapCost}>
                              {" £"}{((byId[c.id]?.now_cost ?? 0) / 10).toFixed(1)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {/* ============================================================
              HVENAER A AD SELJA — TALAN ER INNAN LEIKMANNS
              ============================================================
              Beidnin (21.8.2026): „appid recommendi sell i akveðinni viku
              thegar leikmenn eiga erfida leiki framundan".

              ORdALAGID ER SJALFT VORDURINN. Notandinn las Rice sem „verstan"
              20.8.2026 ur nakvaemlega thessari tolu — hun er AFSTAED VID HANS
              EIGIN MEDALTAL, svo −0,35 hja honum og −0,35 hja odrum eru
              tvaer olikar fullyrdingar. Thess vegna:
                · hvert tolu-holf ber GRUNN SINN i somu setningu
                  („vs his own average over GW6-38"), og `basis.scale` er
                  LESID af svarinu, ekki skrifad her — merkimidinn getur
                  thvi ekki sagt annad en velin gerdi.
                · summan er ALDREI ber: hun er bundin honum OG lengdinni
                  („for him", „over those 4 gameweeks").
                · ein skyringar-setning segir berum ordum ad thetta se EKKI
                  rodun — solu-rodunin er `score` og hun er annars stadar.
              RODIN ER TIMAROD (`run.from`), EKKI STAERD TOLUNNAR: rodun eftir
              tolunni VAERI thver-leikmanna rodun i dulargervi, sem er
              nakvaemlega villan sem ordalagid a ad koma i veg fyrir.
              `run: null` BER `why` ORDRETT — „engin erfid runa" og „vid
              vitum ekki" ma ekki lesast eins (CLAUDE.md: null er ekki null).
              Radirnar an runu eru HOPADAR eftir `why` svo textinn se
              ORDRETTUR en kassinn ekki fimmtan linur af sama streng.     */}
          {(() => {
            const rows = squadPlayers.map(p => ({ p, t: sellWhen[p.id] })).filter(x => x.t);
            if (!rows.length) return null;
            const withRun = rows.filter(x => x.t.run).sort((a, z) =>
              a.t.run.from - z.t.run.from || a.t.run.to - z.t.run.to || a.p.id - z.p.id);
            const grouped = [];
            for (const x of rows) {
              if (x.t.run) continue;
              const why = x.t.why || "no answer from the fixture data";
              const g = grouped.find(v => v.why === why);
              if (g) g.names.push(x.p.web_name); else grouped.push({ why, names: [x.p.web_name] });
            }
            return (
              <div style={S.card}>
                <div style={S.sellWhenHead}>{"When to sell — hardest run ahead"}</div>
                <div style={S.muted}>
                  {"Relative to his own fixtures — this does not say sell him rather than someone else. Sell order is the squad list's own ranking."}
                  {" "}{"Fixture difficulty (FFDR) is the only input: no form, no minutes, no market line. The points figure is FFDR read through the measured points-per-tier table for his position, which is what makes two positions comparable at the same difficulty."}
                  {withRun.length > HARD_RUN_SHOW && (
                    <>{" "}<b>{interp("Showing the {0} whose hard run starts soonest; {1} more are further out.",
                                      [HARD_RUN_SHOW, withRun.length - HARD_RUN_SHOW])}</b></>
                  )}
                </div>
                {withRun.slice(0, HARD_RUN_SHOW).map(({ p, t }) => (
                  <div key={p.id} style={S.srcRow}>
                    <span style={{ ...S.posDot, background: POS_COLOR[p.element_type] }} />
                    <span style={S.srcName}
                      onClick={() => setDetail({ kind:"player", id:p.id })}>{p.web_name}</span>
                    <span style={S.srcMeta}>{teamById[p.team]?.short}</span>
                    <span style={S.sellWhenRun}
                      title={"His worst stretch of fixtures between now and the end of the range, measured against his own average over that range — the same search that finds buy windows, with the direction flipped."}>
                      {interp("Hardest run ahead: GW{0}–{1}", [t.run.from, t.run.to])}</span>
                    <span style={S.sellWhenFig}
                      title={interp("FFDR for GW{0}-{1}, read through the measured points-per-tier table for his position, compared with his own average across GW{2}-{3} ({4} gameweeks with a known fixture). FFDR is the ONLY input. A figure for HIM — it is not comparable with another player's.", [t.run.from, t.run.to, t.basis.from, t.basis.to, t.basis.n])}>
                      {interp("{0} pts/GW vs {1} average over GW{2}–{3}",
                        [signedPts(t.run.perGw), t.basis.scale, t.basis.from, t.basis.to])}</span>
                    <span style={S.sellWhenSum}
                      title={"The per-gameweek figure multiplied by the length of the run. Bound to him and to the length on purpose: a bare total beside another player's would read as a ranking."}>
                      {interp("{0} pts over those {1} gameweeks, for him",
                        [signedPts(t.run.gain), t.run.len])}</span>
                  </div>
                ))}
                {grouped.map(g => (
                  <div key={g.why} style={S.sellWhenWhy}>
                    <b>{g.why}</b>{" — "}{g.names.join(", ")}
                  </div>
                ))}
              </div>
            );
          })()}
          </div>
          </div>

          {/* Meiðsli, bönn og hætta í liðinu */}
          <section style={S.card}>
            <h2 style={S.h2}>{"Squad availability"}</h2>
            {(() => {
              const flagged = squadAt.map(x => byId[x.id]).filter(Boolean).map(pp => ({
                pp, av: availOf(pp), ban: banRisk(pp, gw, seasonStarted), rot: rotationRisk(pp, playedByClub[pp.team] ?? seasonGames),
              })).filter(x => x.av.isRisk || (x.ban && x.ban.level === "high") || (x.rot && x.rot.level === "high"));
              if (!flagged.length) return <div style={S.okBox}>{"All 15 available — no injuries, suspensions or card risk."}</div>;
              return flagged.map(({ pp, av, ban, rot }) => (
                <div key={pp.id} style={S.riskRow}>
                  {av.isRisk
                    ? <span style={{ ...S.riskTag, background:av.bg, color:av.color }}>{av.label}{av.chance != null ? ` ${av.chance}%` : ""}</span>
                    : ban && ban.level === "high"
                      ? <span style={{ ...S.riskTag, background:"#fff6e0", color:"#8a5f00" }}>{ban.y} {"yellow"}</span>
                      : <span style={{ ...S.riskTag, background:"#eeeef1", color:"#61616b" }}>{"start"} {rot.pct}%</span>}
                  <span style={S.riskName}>{pp.web_name}</span>
                  <span style={S.riskNews} title={[av.news, injuryById[pp.id]?.reason && `API-Sports: ${injuryById[pp.id].reason}`].filter(Boolean).join("\n")}>
                    {injuryById[pp.id]?.reason
                      ? <><b>{injuryById[pp.id].reason}</b>{av.news ? ` · ${av.news.slice(0, 30)}` : ""}</>
                      : (av.news ? av.news.slice(0, 42) : "")}
                  </span>
                </div>
              ));
            })()}
            <div style={S.muted}>
              {"From FPL: status, chance_of_playing, news, yellow cards and start rate. Card bans: 5 yellows (up to GW19) = 1 match, 10 = 2, 15 = 3."}
            </div>
          </section>
          {/* Verðbreytingar */}
          <section style={S.card}>
            {/* SKYRINGAR-MALSGREININ VAR FJARLAEGD (beidni notandans 20.8.2026).
                EN HEIDARLEIKA-MERKID MATTI EKKI FARA MED HENNI: CLAUDE.md 3
                segir berum ordum ad verdspain "ma aldrei birtast sem vissa".
                Hun er nu merkt a ThREMUR stodum sem allar voru thegar til
                og engin theirra er malsgrein:
                  1. TEXTINN sjalfur er "↑ tonight?" — spurningarmerkid ER
                     fyrirvarinn, i hverri rod.
                  2. `title` a hverri spa: "...(approximation)".
                  3. `title` a haus flipans, her fyrir nedan — thangad for
                     setningin um ad FPL birti ekki formuluna.
                Tafla, litir og spar eru OBREYTT. Vordur: `planner-pitch.mjs`
                kafli E, sem fellur BAEDI ef malsgreinin kemur aftur OG ef
                ordid "approximation" hverfur ur DOM-inum.                  */}
            <h2 style={S.h2}
              title={"\"tonight?\" is an approximation — net transfers against ownership. FPL does not publish its price-change formula, so this is an indication, not a certainty."}>
              {"Price changes — transfers this gameweek"}
            </h2>
            {priceMovers.up.map(({ p, net, chg, predict }) => {
              const mine = squadIds.has(p.id), planned = plan.some(t => t.inId === p.id);
              return (
                <div key={p.id} style={S.moveRow}>
                  <span style={{ ...S.moveName, fontWeight: mine ? 700 : 400, color: planned ? C.green : C.text }}>
                    {p.web_name} <span style={S.moveTeam}>{teamById[p.team]?.short}</span>
                  </span>
                  <span style={S.moveNet}>+{(net/1000).toFixed(0)}k</span>
                  <span style={{ ...S.moveChg, color: chg > 0 ? C.green : C.text3 }}>
                    {chg > 0 ? `↑ £${(chg/10).toFixed(1)}`
                     : predict === "up" ? <span style={S.movePredict} title={"Net transfers above the estimated threshold — likely a rise in FPL's next price run (approximation)"}>{"↑ tonight?"}</span>
                     : "—"}
                  </span>
                </div>
              );
            })}
            {priceMovers.down.length > 0 && <div style={S.moveSep}>{"Most out"}</div>}
            {priceMovers.down.map(({ p, net, chg, predict }) => {
              const mine = squadIds.has(p.id);
              return (
                <div key={p.id} style={S.moveRow}>
                  <span style={{ ...S.moveName, fontWeight: mine ? 700 : 400 }}>
                    {p.web_name} <span style={S.moveTeam}>{teamById[p.team]?.short}</span>
                  </span>
                  <span style={{ ...S.moveNet, color: C.red }}>{(net/1000).toFixed(0)}k</span>
                  <span style={{ ...S.moveChg, color: chg < 0 ? C.red : C.text3 }}>
                    {chg < 0 ? `↓ £${Math.abs(chg/10).toFixed(1)}`
                     : predict === "down" ? <span style={{ ...S.movePredict, color:C.red }} title={"Net transfers out above the threshold — likely a fall tonight (approximation). If you plan to sell him: do it before the price run."}>{"↓ tonight?"}</span>
                     : "—"}
                  </span>
                </div>
              );
            })}
          </section>

          {/* FFDR-TAFLAN — plönunar-yfirsýn yfir öll lið */}
          {showFfdr && (
            <FfdrTable teams={teams} fixByTeamGw={fixByTeamGw} teamById={teamById}
              diffOf={fixDifficulty}
              from={tlStart} span={tlWindow} maxGw={maxGw}
              onPickTeam={id => setDetail({ kind:"team", id })} />
          )}

          {/* ============================================================
              SKIPTAAETLUNIN OG UPPHAFSLIDID ERU TVEIR HLUTIR (20.8.2026)
              ============================================================
              Notandinn: „Thetta transfer plan er ekki rett. Er ekki neitt
              transfer, bara starting lidid mitt".

              HANN HAFDI RETT FYRIR SER OG ThAD VAR EKKI SNYRTI-ATRIDI.
              I GW1 er ENGINN madur ad fara ut — hann VELUR hop. `out`-hlidin
              a hverri rod var thvi hver sem HANDAHOFI var i hopnum sem hann
              byrjadi fra (`START_SQUAD` eda FPL-hopurinn), svo
              „Dubravka -> Raya +17,7" var Raya maeldur gegn HANDAHOFS-VIDMIDI
              — birt i sama sniði og raunverulegur skipta-avinningur. Og
              „net X pts" i hausnum lagdi tiu slikar tolur SAMAN.
              CLAUDE.md kafli 3: „omaeld tala sem litur ut eins og maeling er
              versta utkoman — hun er rong OG truverdug."

              SKILYRDID ER `isInitialSquadPick` UR `model.js`, ekki ny
              `gw === 1`-profun her: sama regla ber kostnadinn
              (`computeTransferCost`) og graena rammann (`plannedIn`), og
              thrju afrit af einni reglu er nakvaemlega thad sem
              `buildTeamMetrics`, `headWidth` og `ZONE_RE` kostudu.

              SETNINGIN er hins vegar tima-had og kemur ur `unlimitedBy`:
              „preseason" = fresturinn er ekki runninn ut, hann getur enn
              breytt hopnum · „initial" = GW1 er lidin og ekkert GW1-skipti
              er mogulegt. Sama tala, tvaer setningar, hvorug lygur.      */}
          {plan.length > 0 && (
            <div style={S.card}>
              {planMoves.length > 0 && (<>
              <div style={S.recHead}>
                <h2 style={S.h2}>{"Transfer plan"}</h2>
                <span style={S.planTotal}>
                  {(() => {
                    /* SUMMAN LES `planMoves`, EKKI `plan`. `totalHits` er
                       thegar GW1-laus: `computeTransferCost` gefur GW1
                       `points: 0` an skilyrda (bebd117), svo hann tvitelur
                       ekki neitt her.                                    */
                    const gain = planMoves.reduce((a, t) => a + transferNet(t), 0);
                    const net = +(gain + totalHits).toFixed(1);
                    return <span style={{ color: net >= 0 ? C.green : C.red, fontWeight:700 }}>
                      {"net"} {net >= 0 ? "+" : ""}{net} {"pts"}
                    </span>;
                  })()}
                </span>
              </div>
              <div style={S.muted}>
                {"Gain = expected points (points/match + FDR, FPL ep_next for the next gameweek) over 5 gameweeks. The hit is subtracted. An estimate, not a certainty."}
              </div>
              </>)}
              {/* ============================================================
                  ROD SEM EKKI VAR HAEGT AD BEITA VERDUR AD SJAST
                  (21.8.2026)
                  ============================================================
                  `if (i >= 0)` i foldinni fleygdi rod thegar `outId` var
                  ekki i hopnum — an merkis nokkurs stadar. ThAD er
                  astaedan fyrir thvi ad villan a opnunardegi las eins og
                  „connected, 15 fetched, rangt lid" i stad villuskilabods:
                  fjarvist var teiknud sem arangur. `gw1-persistence.mjs`
                  R6 maelir thognina berum orðum og kallar hana „verra".
                  Talan kemur ur `planStatus`, sem er SAMA kall
                  (`applyPlan`) sem vollurinn gerir — hun getur thvi ekki
                  sagt annad en vollurinn syn.                          */}
              {skippedMoves.length > 0 && (
                <div style={S.planWarn}>
                  {interp(skippedMoves.length === 1
                    ? "⚠ {0} planned transfer cannot be applied: the outgoing player is not in the squad in that gameweek, so the pitch ignores it. Marked below."
                    : "⚠ {0} planned transfers cannot be applied: the outgoing player is not in the squad in that gameweek, so the pitch ignores them. Marked below.",
                    [skippedMoves.length])}
                </div>
              )}
              {/* ENDURSTILLA ALLT — fyrir þegar Wildcard-tilraun er hætt við */}
              <div style={S.resetAllRow}>
                {confirmReset === "all" ? (
                  <span style={S.resetConfirm}>
                    {/* ============================================================
                        TEXTINN VERDUR AD TELJA ThAD SEM RAUNVERULEGA FER
                        ============================================================
                        „Clear ALL planning (10 transfers …)" taldi
                        UPPHAFSLIDS-valin med i „transfers" — svo hann sagdi
                        notandanum ad hann vaeri ad hreinsa skipti medan hann
                        var ad hreinsa LIDID SITT. Nu telur hann adeins thad
                        sem `resetAll` fjarlaegir, og segir BERUM ORDUM ad
                        upphafslidid stendur — thvi „ekkert um X" er ekki
                        sama og „X er oruggt" fyrir thann sem er ad thora
                        ad yta a hnappinn.                                */}
                    {"Clear transfer planning ("}{planMoves.length} {"transfers,"}
                    {" "}{Object.keys(benchSwaps).length} {"gameweeks with their own line-up,"} {Object.keys(chips).length} {"chip)?"}
                    {gw1Picks.length > 0
                      ? interp(" Your starting squad ({0} GW1 picks) is NOT touched.", [gw1Picks.length])
                      : ""}
                    <button style={S.resetYes} onClick={resetAll}>{"yes, clear planning"}</button>
                    <button style={S.resetNo} onClick={() => setConfirmReset(null)}>{"no"}</button>
                  </span>
                ) : (
                  <button style={S.resetBtn} onClick={() => setConfirmReset("all")}
                    title={"Clear every planned transfer, line-up change and chip from GW2 onward. Your GW1 starting squad and captain are NOT touched — remove a GW1 pick with its own ✕."}>
                    {"↺ reset transfer planning"}
                  </button>
                )}
              </div>
              {[...planMoves].sort((a,z) => a.gw - z.gw).map((t,i) => {
                const gain = transferNet(t);
                const tc = transferCost[t.gw];
                // refsing deilist á skiptin í þeirri umferð
                const inGw = plan.filter(x => x.gw === t.gw).length;
                const hitShare = tc && inGw ? tc.points / inGw : 0;
                const net = +(gain + hitShare).toFixed(1);
                return (
                  /* STODUGUR LYKILL, EKKI VISITALA: hægt er ad eyda ur MIDJUM
                     listanum, og tha faerast visitolur — React endurnytir tha
                     rangan hnut og innslattur/aherslur lenda a rangri rod.  */
                  <div key={`${t.gw}:${t.outId ?? t.out}:${t.inId ?? t.in}:${i}`} style={S.planItem}>
                    <span style={{ ...S.planGw, ...(tc?.hits > 0 ? S.planGwHit : {}) }}>GW{t.gw}</span>
                    {fhGws.has(t.gw) &&
                      <span style={S.planFh} title={"Free Hit — the squad reverts after the gameweek, the transfers only count in it"}>FH</span>}
                    <span style={{ flex:1, minWidth:0 }}>
                      <span style={{ color:C.red }}>{byId[t.outId]?.web_name}</span>
                      {" → "}
                      <span style={{ color:C.green, fontWeight:600 }}>{byId[t.inId]?.web_name}</span>
                      {/* MERKID ER A RODINNI SJALFRI, ekki adeins i
                          talningunni ofar: talan segir HVE MARGAR, radan
                          segir HVER. An hennar vaeri „2 cannot be applied"
                          upplysing sem hann getur ekki brugdist vid.    */}
                      {planStatus.get(t) === "skipped" && (
                        <span style={S.planSkipTag}
                          title={"The outgoing player is not in your squad in that gameweek, so this row changes nothing. Delete it with ✕, or plan the transfer from a player you actually have."}>
                          {" not applied"}
                        </span>
                      )}
                    </span>
                    <span style={S.planCalc} title={"expected points over 5 gameweeks"}>
                      {gain >= 0 ? "+" : ""}{gain}
                    </span>
                    {hitShare < 0 && <span style={S.planHitVal} title={"share of the hit"}>{hitShare}</span>}
                    <span style={{ ...S.planNet, color: net >= 0 ? C.green : C.red }}
                      title={net >= 0 ? "worth it" : "costs more than it gives"}>
                      {net >= 0 ? "+" : ""}{net}
                    </span>
                    <button style={S.rm} onClick={() => removeTransfer(plan.indexOf(t))}>✕</button>
                  </div>
                );
              })}
              {/* ============================================================
                  UPPHAFSLIDID — SYNILEGT OG AFTURKALLANLEGT, EN EKKI SKIPTI
                  ============================================================
                  HVERS VEGNA ER ThETTA HER OG EKKI HORFID: hann tharf ad
                  sja hvad hann valdi og geta tekid thad til baka. `✕` kallar
                  NAKVAEMLEGA sama `removeTransfer(plan.indexOf(t))` og adur —
                  vistada gerdin er OHREYFD (`{gw,outId,inId}`), thetta er
                  birting og engu odru.

                  EIN TALA OG HUN ER UM MANNINN SEM KEMUR INN EINAN:
                  `expPoints(t.inId, 1)` — hans eigin vaentu stig i GW1, sama
                  tala og spjaldid a vellinum ber (`ep=`), merkt „ep" og AN
                  formerkis. Delta gegn `outId` er thad sem ma ekki vera
                  hérna: `outId` er handahofs-madurinn ur grunnhopnum.
                  `out`-nafnid er samt SYNT — grátt og med orðunum „in place
                  of" — thvi hann tharf ad geta pardad rodina vid vollinn;
                  thad sem laug var SNIDID (raudur -> graenn med delta), ekki
                  tilvist upplysingarinnar.
                  Vantar leikmanninn (`byId` skilar undefined) -> ENGIN tala,
                  ekki 0: NULL ER EKKI NULL (kafli 8).                    */}
              {gw1Picks.length > 0 && (<>
                <div style={{ ...S.planSecHead, ...(planMoves.length ? {} : S.planSecFirst) }}>
                  <h2 style={S.h2}>{"Starting squad"}</h2>
                  <span style={S.planSecTag}>{"GW1 — not transfers"}</span>
                </div>
                {/* ============================================================
                    RAUNLID TENGT -> GW1-VALIN ERU OFAUKIN, OG ThAD ER SAGT
                    (21.8.2026)
                    ============================================================
                    Reglan sjalf er i `applyPlan` (`official`), her er
                    ADEINS setningin og hnappurinn. Hvorugt er valkvaett:
                    ad hunsa radirnar OG thegja um thad vaeri tiu „val" a
                    skjanum sem gera ekki neitt — sama aett sem hann hefur
                    kaert tvisvar i dag.
                    HNAPPURINN EYDIR ADEINS VID SMELL OG MED STADFESTINGU.
                    `plan` + `START_SQUAD` ER hopurinn thegar ekkert er
                    tengt, svo rod sem vid eydum sjalf er saeti sem hann
                    hefur ekki eftir aftengingu — sja `adoptFplSquad`.  */}
                {planRedundant.length > 0 && (
                  <div style={S.planWarn}>
                    {interp(planRedundant.length === 1
                      ? "Your FPL team is connected, so the squad it returns IS your starting squad — this {0} GW1 pick is redundant and the pitch ignores it."
                      : "Your FPL team is connected, so the squad it returns IS your starting squad — these {0} GW1 picks are redundant and the pitch ignores them.",
                      [planRedundant.length])}
                    {confirmReset === "gw1" ? (
                      <span style={S.resetConfirm}>
                        {interp(" Remove all {0}? Your transfer planning, line-ups, chips and captain are NOT touched.",
                                [planRedundant.length])}
                        <button style={S.resetYes} onClick={adoptFplSquad}>{"yes, use the FPL squad"}</button>
                        <button style={S.resetNo} onClick={() => setConfirmReset(null)}>{"no, keep them"}</button>
                      </span>
                    ) : (
                      <button style={S.resetBtn} onClick={() => setConfirmReset("gw1")}
                        title={"Delete the GW1 picks you made by hand before connecting. The pitch does not change — it already shows the FPL squad. Keep them if you may disconnect later: without them the pitch falls back to the default squad, not yours."}>
                        {"↺ use the FPL squad"}
                      </button>
                    )}
                  </div>
                )}
                {skippedPicks.length > 0 && (
                  <div style={S.planWarn}>
                    {interp(skippedPicks.length === 1
                      ? "⚠ {0} of these picks cannot be placed: the player it replaces is not in the squad, so the pitch ignores it. Marked below."
                      : "⚠ {0} of these picks cannot be placed: the player they replace is not in the squad, so the pitch ignores them. Marked below.",
                      [skippedPicks.length])}
                  </div>
                )}
                <div style={S.muted}>
                  {transferCost[1]?.unlimitedBy === "initial"
                    ? "GW1 has kicked off, so these are locked — no GW1 transfer exists. They are your opening squad, not moves, so there is no gain to show against an outgoing player and no hit."
                    : "These are the players you picked for your opening squad. Picking a squad is free and unlimited until the GW1 deadline, so there is no hit — and no gain either, because nobody is being sold. The figure is each player's own expected points in GW1."}
                </div>
                {[...gw1Picks].map((t, i) => {
                  const inP = byId[t.inId];
                  const ep = inP ? expPoints(t.inId, 1) : null;
                  return (
                    /* SAMI STODUGI LYKILL og a skipta-rodunum — eyding ur
                       MIDJUM listanum faerir visitolur og React endurnytti
                       thá rangan hnut.                                    */
                    <div key={`i${t.gw}:${t.outId ?? t.out}:${t.inId ?? t.in}:${i}`} style={S.planItem}>
                      <span style={S.planGw}>GW{t.gw}</span>
                      <span style={{ flex:1, minWidth:0 }}>
                        <span style={{ color:C.green, fontWeight:600 }}>{inP?.web_name}</span>
                        {byId[t.outId] &&
                          <span style={S.planSecTag}>{" in place of "}{byId[t.outId]?.web_name}</span>}
                        {/* TVAER OLIKAR ASTAEDUR, TVO OLIK ORD. „redundant"
                            = raunlidid er thegar rett og rodin er ofaukin
                            (engin adgerd nauðsynleg). „not placed" =
                            manninum sem hun leysir af er ekki i hopnum, svo
                            valid komst ALDREI a vollinn (adgerd
                            nauðsynleg). Eitt ord fyrir badar hefdi latid
                            hina fyrri lesast eins og villa og hina seinni
                            eins og allt vaeri i lagi.                    */}
                        {planStatus.get(t) === "redundant" && (
                          <span style={S.planSkipTag}
                            title={"Your FPL squad already decides this seat, so the row changes nothing. Harmless — but you can clear it above."}>
                            {" redundant"}
                          </span>
                        )}
                        {planStatus.get(t) === "skipped" && (
                          <span style={S.planSkipTag}
                            title={"The player this pick replaces is not in the squad, so it never reached the pitch. Delete it with ✕ and pick again from the squad you have."}>
                            {" not placed"}
                          </span>
                        )}
                      </span>
                      <span style={S.planPickEp}
                        title={"His OWN expected points in GW1 (minutes + FFDR + form). Not a comparison with anyone — in GW1 nobody is being sold."}>
                        {ep == null ? "—" : `ep ${ep.toFixed(1)}`}
                      </span>
                      <button style={S.rm} onClick={() => removeTransfer(plan.indexOf(t))}>✕</button>
                    </div>
                  );
                })}
              </>)}
            </div>
          )}
        </div>

        {/* ---------- Hliðarstika ---------- */}
        <div className="app-side" style={S.side}>
          {/* CHIPS — bak við hnapp (🎫 Chips) í staðinn fyrir að vera alltaf sýnilegt */}
          {showChips && (
            <section style={S.card}>
              <h2 style={S.h2}>Chips</h2>
              <div style={S.muted}>
                {"Two sets — one for each half of the season. Validity comes from the FPL API. One chip per gameweek. Wildcard and Free Hit start in GW2."}
              </div>
              {[1, 2].map(half => {
                const slots = chipSlots.filter(x => x.half === half);
                if (!slots.length) return null;
                return (
                  <div key={half}>
                    {(() => {
                      const lastGw = Math.max(...slots.map(x => x.to));
                      const dl = events?.find(e => e.id === lastGw)?.deadline_time;
                      const unused = slots.filter(x => !chips[x.key]).length;
                      const expired = dl ? new Date() > new Date(dl) : false;
                      return (
                        <div style={S.chipHalfLbl}>
                          {half === 1 ? "First half" : "Second half"}
                          <span style={S.chipHalfRange}>GW{slots[0].from}–{lastGw}</span>
                          {dl && (
                            <span style={{ ...S.chipExpiry, ...(expired ? S.chipExpired : {}) }}>
                              {expired ? "expired" : interp("expires {0}", [fmtDeadline(dl)])}
                              {!expired && unused > 0 ? interp(" · {0} unused", [unused]) : ""}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    {slots.map(slot => {
                      const c = CHIPS[slot.name];
                      if (!c) return null;
                      const used = chips[slot.key];
                      const best = bestGwFor(slot.name, slot.from, slot.to);
                      const val = used ? chipValue[used]?.[slot.name] : null;
                      return (
                        <div key={slot.key} style={S.chipRow}>
                          <span style={{ ...S.chipIcon, background: c.color }}>{c.icon}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={S.chipName}>{c.label}</div>
                            <div style={S.chipDesc}>
                              {used && val != null
                                ? <span style={{ color: C.green, fontWeight:600 }}>GW{used} {"· expected +"}{val} {"pts"}</span>
                                : best
                                  ? <span>{"best in"} <b>GW{best.g}</b> (+{best.v})</span>
                                  : c.desc}
                            </div>
                          </div>
                          <select style={S.chipSel} value={used || ""}
                            onChange={e => setChipSlot(slot.key, e.target.value ? +e.target.value : null)}>
                            <option value="">—</option>
                            {Array.from({ length: slot.to - slot.from + 1 }, (_, i) => slot.from + i).map(n => {
                              const other = chipAt(n);
                              const taken = other && chips[slot.key] !== n;
                              const v = chipValue[n]?.[slot.name];
                              return (
                                <option key={n} value={n} disabled={taken}>
                                  GW{n}{taken ? ` (${CHIPS[other]?.short})` : v != null && v > 0 ? ` +${v}` : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </section>
          )}


          {/* Lið: FFDR-röðun + DefCon (það eina sem er EKKI í FFDR) */}
          {(() => {
          const ffdrFrom = ffdrRange ? ffdrRange[0] : gw;
          const ffdrTo   = ffdrRange ? ffdrRange[1] : Math.min(gw + recRange - 1, maxGw);
          return (
          <section style={S.card}>
            <div style={S.recHead}>
              <h2 style={S.h2}>{"Teams — FFDR GW"}{ffdrFrom}{ffdrFrom !== ffdrTo ? `–${ffdrTo}` : ""}</h2>
              <select style={S.chipSel} value={teamSort} onChange={e => setTeamSort(e.target.value)}>
                <option value="def">{"FFDR defence"}</option>
                <option value="att">{"FFDR attack"}</option>
              </select>
            </div>
            {/* SKYRINGAR-MALSGREININ VAR FJARLAEGD 16.8.2026 ad beidni
                notandans — hun stod i hverri hledslu og sagdi thad sama.
                ALDUR INNTAKANNA FYLGDI EKKI MED I RUSLID og ma ekki gera
                thad: elo.json er FFDR-inntak og var 31.7.2026 EINN OG
                HALFUR DAGUR gomul thvi ClubElo brast ("fetch failed" i
                status.json) — en ekkert i vidmotinu sagdi thad. Sama
                mynstur sem gerdi markadslidinn daudan i VIKU (kafli 3):
                formulan var i lagi, gognin sem hun fekk voru ekki.
                `eloStale` byr nu i ClubElo-rodinni i Data sources-bordanum
                nedst (leit: "ClubElo —"), sem er EINN stadur fyrir ferskleika
                allra heimilda i stad thess ad dreifa honum um vidmotid.   */}
            {/* BILIÐ — MINNKA/AUKA MEÐ EINUM SMELLI, eða velja nákvæmar
                umferðir í kassaröðinni (sama og í Player stats). Áður var
                bilið fast við `recRange` og byrjaði alltaf á næstu umferð. */}
            <div style={S.ffdrBar}>
              <button style={S.ffdrStep} title={"One gameweek fewer"}
                onClick={() => setFfdrRange([ffdrFrom, Math.max(ffdrFrom, ffdrTo - 1)])}>−</button>
              <span style={S.ffdrNow}>{"GW"} {ffdrFrom}{ffdrFrom !== ffdrTo ? `–${ffdrTo}` : ""}
                <span style={S.ffdrN}>{ffdrTo - ffdrFrom + 1}</span></span>
              <button style={S.ffdrStep} title={"One gameweek more"}
                onClick={() => setFfdrRange([ffdrFrom, Math.min(maxGw, ffdrTo + 1)])}>+</button>
              <button style={S.ffdrPick} aria-expanded={ffdrOpen}
                onClick={() => setFfdrOpen(v => !v)}>{ffdrOpen ? "hide" : "pick"}</button>
              {ffdrRange && (
                <button style={S.ffdrPick} title={"Back to the default range"}
                  onClick={() => { setFfdrRange(null); setFfdrOpen(false); }}>{"reset"}</button>
              )}
            </div>
            {ffdrOpen && (
              <div style={S.ffdrBoxes} role="group" aria-label={"Select gameweeks"}>
                {Array.from({ length: maxGw }, (_, i) => i + 1).map(n => {
                  const on = n >= ffdrFrom && n <= ffdrTo;
                  return (
                    <button key={n} title={`GW ${n}`} aria-pressed={on}
                      style={{ ...S.ffdrBox, ...(on ? S.ffdrBoxOn : {}) }}
                      onClick={() => setFfdrRange(r => {
                        /* Sama og i Player stats: fyrsti smellur = upphaf,
                           annar = endi, smellur FYRIR upphafid snyr bilinu. */
                        const cur = r || [ffdrFrom, ffdrTo];
                        if (cur[0] !== cur[1]) return [n, n];
                        return n < cur[0] ? [n, cur[0]] : [cur[0], n];
                      })}>{n}</button>
                  );
                })}
              </div>
            )}
            <div style={S.tblHead}>
              <span style={{ flex:1 }}>{"Team"}</span>
              <span style={S.tblNum} title={"FFDR for defenders, average over the selected gameweeks"}>{"def"}</span>
              <span style={S.tblNum} title={"FFDR for forwards"}>{"att"}</span>
              <span style={S.tblN} title={"How many fixtures the team actually has in the range. A BLANK is skipped by the average, so a run with fewer fixtures can look easier than it is — this number makes that visible."}>{"n"}</span>
            </div>
            {(() => {
              // meðal-FFDR yfir valið bil, per staða
              const avg = (tid, pos) => {
                let n = 0, sum = 0;
                for (let g = ffdrFrom; g <= ffdrTo; g++) {
                  for (const fx of (fixByTeamGw[tid]?.[g] || [])) {
                    const d = fixDifficulty(tid, fx, pos);
                    if (d != null) { sum += d; n++; }
                  }
                }
                return n ? +(sum / n).toFixed(2) : null;
              };
              /* FJOLDI LEIKJA i bilinu — AUD UMFERD er sleppt ur medaltalinu
                 (hun hefur engan leik ad meta), svo lid med blank litur
                 LETTARA ut en thad er. Kafli 3d telur auda umferd ThYNGST
                 i roteringu; hér er hun ad minnsta kosti SYNILEG.        */
              const nFix = tid => {
                let k = 0;
                for (let g = ffdrFrom; g <= ffdrTo; g++) k += (fixByTeamGw[tid]?.[g] || []).length;
                return k;
              };
              const span = ffdrTo - ffdrFrom + 1;
              const rows = teams.map(t => ({
                t, def: avg(t.id, 2), att: avg(t.id, 4), n: nFix(t.id),
              }));
              rows.sort((a, b) => {
                const k = teamSort === "att" ? "att" : "def";
                return (a[k] ?? 9) - (b[k] ?? 9);
              });
              return rows.map(({ t, def, att, n }) => {
                const mine = squadAt.some(x => byId[x.id]?.team === t.id);
                const cell = v => v == null ? { bg:"transparent", fg:C.text3 }
                  : { bg: TIER_BG[tierOf(v)], fg: TIER_FG[tierOf(v)] };
                const cd = cell(def), ca = cell(att);
                return (
                  <div key={t.id} style={{ ...S.tblRow, cursor:"pointer" }}
                    onClick={() => setDetail({ kind:"team", id:t.id })}>
                    <span style={{ flex:1, display:"flex", alignItems:"center", gap:5, minWidth:0 }}>
                      <Crest team={t} size={14} />
                      <span style={{ fontWeight: mine ? 700 : 400, fontSize:11.5 }}>{t.short}</span>
                      {/* I EVROPU — DAUFT OG LITID, VILJANDI.
                          Feitletrun er ThEGAR TEKIN: hun thydir "i minu
                          lidi" (sja litareglurnar i CLAUDE.md — thrir
                          litir, thrjar merkingar, mega ekki rekast a).
                          Skaletur a 11,5 px skammstofun er varla synilegt.
                          Thess vegna litil stjarna: SAMA takn og i
                          umferdastikunni, svo ★ thydir eitt i ollu
                          appinu — evropukeppni. Og hun er GRA en ekki
                          raud thvi thetta er samhengi, ekki vidvorun:
                          evropualag maeldist EKKI marktaekt (6k).       */}
                      {euroIn.has(t.id) && (
                        <span style={S.euroTag}
                          title={interp("{0} is in {1} this season — European matches fall in the midweek gaps. Shown as context: the measured effect on points was not significant.",
                                        [t.short, euroIn.get(t.id).map(compLabel).join(" + ")])}>★</span>
                      )}
                    </span>
                    <span style={{ ...S.tblNum }}>
                      <span style={{ ...S.ffdrCell, background:cd.bg, color:cd.fg }}>{def ?? "—"}</span>
                    </span>
                    <span style={{ ...S.tblNum }}>
                      <span style={{ ...S.ffdrCell, background:ca.bg, color:ca.fg }}>{att ?? "—"}</span>
                    </span>
                                      <span style={{ ...S.tblN, color: n < span ? C.red : C.text3 }}
                      title={n < span ? `Only ${n} fixtures in ${span} gameweeks — a BLANK is skipped by the average, so this run is harder than the number looks`
                                      : `${n} fixtures in ${span} gameweeks`}>{n}</span>
                  </div>
                );
              });
            })()}
          </section>
          );
          })()}

          {/* Andstæðingar — sérstöðu-samanburður */}
          <section style={S.card}>
            <h2 style={S.h2}>{"Rivals"}</h2>
            <div style={S.muted}>
              {"Compare your squad with rivals in your mini-league: who are"}
              <b> {"the differentials"}</b> {"on both sides, and who wears their armband."}
            </div>
            <div style={S.rivalAddRow}>
              <input style={{ ...S.urlInput, width:"auto", flex:1, minWidth:0 }}
                placeholder={"FPL URL or team ID"} value={rivalInput}
                onChange={e => setRivalInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addRival()} />
              <button style={S.connectBtn} onClick={addRival}>{"Add"}</button>
            </div>
            {!rivals.length && <div style={S.muted}>{"None added yet. The ID is in the team's URL on fantasy.premierleague.com."}</div>}
            {rivals.map(r => {
              const d = rivalData[r.id];
              if (!d) return <div key={r.id} style={S.rivalRow}><span style={S.rivalName}>{"teams"} {r.id}</span><span style={S.muted}>{"fetching…"}</span></div>;
              const myIds = squadIds;
              const theirs = (d.picks || []).filter(id => !myIds.has(id)).map(id => byId[id]).filter(Boolean)
                .sort((a, b) => parseFloat(b.ep_next || 0) - parseFloat(a.ep_next || 0));
              const mine = d.picks ? [...myIds].filter(id => !d.picks.includes(id)).map(id => byId[id]).filter(Boolean)
                .sort((a, b) => parseFloat(b.ep_next || 0) - parseFloat(a.ep_next || 0)) : [];
              const shared = d.picks ? d.picks.filter(id => myIds.has(id)).length : null;
              return (
                <div key={r.id} style={S.rivalBlock}>
                  <div style={S.rivalRow}>
                    <span style={S.rivalName}>{d.name}</span>
                    <span style={S.rivalPts}>{d.gwPts != null ? interp("GW {0} · total {1}", [d.gwPts, d.totalPts]) : "—"}</span>
                    <button style={S.rm} title={"Remove"}
                      onClick={() => { setRivals(rs => rs.filter(x => x.id !== r.id)); }}>✕</button>
                  </div>
                  {d.picks ? (
                    <>
                      <div style={S.rivalMeta}>
                        {shared}{"/15 shared"}
                        {d.capId != null && <> {"· captain"} <b>{byId[d.capId]?.web_name ?? "?"}</b>
                          {d.capId === captain ? " (same as yours)" : ""}</>}
                      </div>
                      {theirs.length > 0 && <div style={S.rivalDiff}>
                        <span style={S.rivalDiffLbl}>{"their differentials"}</span>
                        {theirs.slice(0, 3).map(p => <span key={p.id} style={S.rivalChip}
                          title={`ep ${p.ep_next} · ${teamById[p.team]?.short}`}
                          onClick={() => setDetail({ kind:"player", id:p.id })}>{p.web_name}</span>)}
                        {theirs.length > 3 && <span style={S.muted}>+{theirs.length - 3}</span>}
                      </div>}
                      {mine.length > 0 && <div style={S.rivalDiff}>
                        <span style={{ ...S.rivalDiffLbl, color:C.green }}>{"your differentials"}</span>
                        {mine.slice(0, 3).map(p => <span key={p.id} style={{ ...S.rivalChip, background:C.greenBg, color:"#0a7a4a" }}
                          title={`ep ${p.ep_next} · ${teamById[p.team]?.short}`}
                          onClick={() => setDetail({ kind:"player", id:p.id })}>{p.web_name}</span>)}
                        {mine.length > 3 && <span style={S.muted}>+{mine.length - 3}</span>}
                      </div>}
                    </>
                  ) : <div style={S.rivalMeta}>{d.error ? "could not be fetched — is the ID right?" : "no squad registered for this gameweek yet (normal in preseason)"}</div>}
                </div>
              );
            })}
          </section>
        </div>
      </div>

      {/* ---------- TILLÖGUR ---------- */}
      <section style={{ ...S.card, marginTop:16 }}>
        <div style={S.recHead}>
          <h2 style={S.h2}>{"Recommended buys — GW"}{gw}–{Math.min(gw + recRange - 1, maxGw)}</h2>
          <div style={S.recCtl}>
            <select style={S.chipSel} value={recRange} onChange={e => setRecRange(+e.target.value)}>
              <option value={1}>{"next match"}</option>
              <option value={2}>{"next 2"}</option>
              <option value={3}>{"next 3"}</option>
              <option value={4}>{"next 4"}</option>
              <option value={5}>{"next 5"}</option>
              <option value={6}>{"next 6"}</option>
              <option value={8}>{"next 8"}</option>
            </select>
            <label style={S.recMaxWrap} title={"Show only players below this price"}>
              <span style={S.recMaxLbl}>{"max £"}</span>
              <input style={S.recMaxInput} type="number" step="0.5" min="3.5" max="20"
                placeholder="—" value={recMaxCost}
                onChange={e => setRecMaxCost(e.target.value)} />
              {recMaxCost !== "" && (
                <button style={S.recMaxClear} title={"Clear price cap"}
                  onClick={() => setRecMaxCost("")}>✕</button>
              )}
            </label>
            <select style={S.chipSel} value={recPos} onChange={e => setRecPos(e.target.value)}>
              <option value="ALL">{"all positions"}</option>
              <option value="1">{"goalkeepers"}</option>
              <option value="2">{"def"}</option>
              <option value="3">{"midfield"}</option>
              <option value="4">{"att"}</option>
            </select>
          </div>
        </div>
        <div style={S.muted}>
          {formFeat?.mode === "fitted" ? (
            <>
              <b style={{ color: C.green }}>{"Measured model."}</b> {"Weights fitted out-of-sample on 2025/26 ("}{formFeat.gws_used} {"gameweeks in a rolling window). The dominant factor is"} <b>{"minutes"}</b>{". Fixture difficulty is a"} <b>{"measured table"}</b> {"from 1,102 matches, not a linear guess — FDR is correctly calibrated on average but too coarse, so we refine it with team strength."}
            </>
          ) : (
            <>
              {/* HEITID FYLGIR KLUKKUNNI, TALAN EKKI (25.8.2026).
                  „Preseason mode" var satt um LIKANID (formFeat.mode) og vard
                  osatt um DAGINN um leid og GW1-fresturinn leid: `form_features
                  .json` er afram i `preseason` medan `gws_used` er 0 (fitting
                  tharf ~5 loknar umferdir), svo bordinn sagdi „preseason" a
                  timabili sem VAR byrjad. Tvennt olikt undir einu nafni.
                  Skilyrdid er sameiginlega klukkan (`seasonStarted`), ekki ny
                  profun; REIKNINGURINN sjalfur er OBREYTTUR — `recommend.js`
                  les afram `formFeat.mode` og hvorki vogtolur ne
                  ~1,5-stiga-maelingin haggast. Adeins ordid um DAGINN er
                  leidrett.                                                */}
              <b style={{ color: C.amber }}>{seasonStarted ? "Early-season mode." : "Preseason mode."}</b> {"Minutes from recent gameweeks are the dominant factor but they do not exist yet. We use price, FPL ep_next and last season. Measurement shows this is"} <b>{"~1.5 points less accurate"}</b> {"— the score sharpens from GW6."}
            </>
          )}
        </div>
        {[1,2,3,4].filter(pos => recPos === "ALL" || +recPos === pos).map(pos => (
          <div key={pos} style={S.recBlock}>
            <div style={S.recPosLbl}><span style={{ ...S.posDot, background: POS_COLOR[pos] }} />{POS_LABEL[pos]}</div>
            <div style={S.recGrid}>
              {(recommendations.byPos[pos] || []).map(r => (
                <RecCard key={r.p.id} r={r} team={teamById[r.p.team]} teamById={teamById}
                  dc={dcOpp[r.p.team]} elo={eloByTeam[r.p.team]} diffOf={fixDifficulty}
                  csFor={csFor} range={recRange} onAdd={() => setDetail({ kind:"player", id:r.p.id })} />
              ))}
            </div>
          </div>
        ))}
      </section>
      </>)}

      {/* ---------- DATA SOURCES — BORDI NEDST, YFIR ALLA BREIDD ----------
          Stod adur sem spjald i hlidarstiku Planner-flipans og sast thvi
          ADEINS thar. Faert hingad 16.8.2026 ad beidni notandans: heimildirnar
          eiga vid ALLA flipa (Player stats, Teams, Gameweek ... lesa allar
          somu `data/`-skrarnar), svo their eiga heima nedst i skelinni.

          TVAER RADIR BAETTUST VID UM LEID OG THAD VAR EKKI SNYRTING:
          `prediction_ledger` og `elo_age` eru BAEDI skrifud i status.json af
          pipeline-inni en HVORUGT var i `SHOW`, svo raud lina fra theim for
          a disk, var committud — og synd ENGUM. Spa-bokhaldid hefur EITT
          skot per umferd (kafli 7) og glugginn fyrir GW1 opnast 21.8.
          Athugasemdin i `snapshot-predictions.mjs` fullyrdir ad rodin
          "birtist undir Data sources"; hun var osonn thangad til nuna.     */}
      <footer style={{ marginTop:18, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
        <h2 style={{ ...S.h2, marginBottom:6 }}>{"Data sources"}</h2>
        <div style={{ display:"grid", gap:"0 18px",
                      gridTemplateColumns:"repeat(auto-fill, minmax(270px, 1fr))" }}>
          <div style={S.srcRow}><span style={S.dotOk} />FPL bootstrap — {players.length} {"players,"} {teams.length} {"teams"}</div>
          <div style={S.srcRow}>
            <span style={news ? S.dotOk : S.dotWait} />
            {"Injuries and prices —"} {news
              ? interp("{0} flagged · updated {1}", [(news.players || []).length, fmtClock(news.updated)])
              : "waiting for the fast run"}
          </div>
          <div style={S.srcRow}><span style={S.dotOk} />FPL fixtures — {fixtures.length} {"fixtures + FDR"}</div>
          <div style={S.srcRow}><span style={S.dotOk} />{"FPL events — deadlines,"} {events.length} {"gameweeks"}</div>
          <div style={S.srcRow}>
            <span style={oddsState === "ok" ? S.dotOk : S.dotWait} />
            {"Bookmaker CS%"} {oddsState === "ok"
              ? interp("({0} teams, from the pipeline)", [Object.keys(odds || {}).length])
              : oddsState === "loading" ? "(fetching…)"
              : oddsState === "empty" ? "(file exists, no matches priced)"
              : "(odds.json missing — run fetch-data)"}
          </div>
          {(() => {
            /* FERSKLEIKI ELO — FLUTTUR HINGAD UR FFDR-SPJALDINU 16.8.2026.
               Notandinn bad um ad malsgreinin thar faeri, en VIDVORUNIN ma
               ekki fara med henni: elo.json er FFDR-inntak og var 31.7.2026
               EINN OG HALFUR DAGUR gomul thvi ClubElo brast — og ekkert i
               vidmotinu sagdi thad. Threpin sjalf eru i model.js (eloStale)
               svo thau seu profanleg (vafrinn getur ekki sett sig i "gamalt"
               stod). Thessi profun er STERKARI en `elo_age` ur status.json:
               stodvist pipeline-in fryst `elo_age` en thessi telur afram.  */
            const st = eloStale(elo?.updated);
            const nElo = Object.keys(eloByTeam || {}).length;
            return (
              <div style={S.srcRow} title={st ? "ClubElo has not responded since then" : ""}>
                <span style={st?.level === "bad" ? S.dotErr : nElo ? S.dotOk : S.dotWait} />
                ClubElo — {nElo}/{teams?.length ?? 0} {"teams"}
                {/* HVADAN TALAN KOM — OG ThAD SEST HVERGI ANNARS STADAR.
                    `status.json.sources.elo` er EKKI i `SHOW` her ad nedan
                    (viljandi: aldurinn er reiknadur LIFANDI i thessari rod i
                    stad thess ad tvitaka hann ur pipeline-inum), svo notan
                    sem `record("elo", ...)` skrifar er osynileg i appinu.
                    Fra 20.8.2026 ber `elo.json` sjalf `source`: API-inn
                    (`api.clubelo.com`) var ONAAANLEGUR fra 14.8. medan
                    `clubelo.com` svaradi 200 a 0,11 s — tveir hostar, ein
                    bilud. Fersk skra ur varaleidinni er RETT, en hun ma ekki
                    lesast eins og API-inn hafi virkad.                     */}
                {elo?.source && elo.source !== "api.clubelo.com" && (
                  <span style={{ color: C.amber, fontWeight: 700 }}
                        title={"api.clubelo.com is unreachable; these ratings were read "
                             + "from the clubelo.com website and validated before they were written"}>
                    {" · via "}{elo.source}</span>
                )}
                {eloFx?.fixtures?.length ? interp(" · {0} matches with CS probabilities", [eloFx.fixtures.length]) : ""}
                {st && <span style={{ color: st.level === "bad" ? C.red : C.amber, fontWeight:700 }}>
                  {" · "}{st.level === "bad" ? "⚠ " : ""}{interp("{0} days old", [st.days.toFixed(1)])}</span>}
              </div>
            );
          })()}
          <div style={S.srcRow}>
            <span style={weatherReady ? S.dotOk : S.dotWait} />
            {"Weather —"} {weatherReady ? interp("{0} matches", [(weather.fixtures || []).filter(w => w.temp_c != null).length]) : "outside the 16-day forecast"}
          </div>
          {/* API-SPORTS: "0 paraðir" LAS SEM BILUN en er RETT preseason-utkoma.
              Fria threpid leyfir adeins leikdaga innan +/-1 dags og fyrir
              timabil eru their ekki til — 0 kollum eytt, engin villa.
              Fyrsta raunprofun er 20.-21. agust (CLAUDE.md kafli 6).
              FPL-status raedur afram tiltaekileika; thetta AUDGAR hann
              med TEGUND meidsla sem FPL-news gefur ekki.                 */}
          <div style={S.srcRow} title={injuries?.via || ""}>
            <span style={injuries?.players?.length ? S.dotOk : S.dotWait} />
            {"Injury types (API-Sports) —"} {
              !injuries ? "waiting for the first run"
              : injuries.error ? interp("error: {0}", [String(injuries.error).slice(0, 30)])
              : injuries.players?.length ? interp("{0} matched", [injuries.players.length])
              : "no match days in the window (waiting for GW1)"}
          </div>
          <div style={S.srcRow}>
            <span style={Object.keys(dcOpp || {}).length ? S.dotOk : S.dotWait} />
            {"DefCon opportunity —"} {Object.keys(dcOpp || {}).length} {"teams"}
            {defcon?.opportunity && Object.keys(defcon.opportunity).length ? " (pipeline)" : " (computed in the app)"}
          </div>
          <div style={S.srcRow}>
            <span style={defcon?.players?.length ? S.dotOk : S.dotWait} />
            DefCon hit-rate — {defcon?.players?.length || 0} {"players"} {defcon?.players?.length ? "" : "(waiting for matches)"}
          </div>
          {/* PIPELINE-HEIMILDIR ur status.json.
              AÐUR: hrait lykilheiti ("fdcouk_e0") og note klippt i 34 stafi,
              svo "404 https://www.football-data.co.u" birtist sem villa —
              thott 404 fyrir timabil se EDLILEGT astand. Nu: laesileg heiti,
              THRJU stig (i lagi / bidur / villa) og full skyring i tooltip.
              Understat er ekki lengur i listanum — hun var tekin ur notkun
              (sja kafla 6b i CLAUDE.md); ESPN kom i stadinn.               */}
          {(pipeStatus?.sources || pipeStatusFast?.sources) && (() => {
            /* BADAR STODUSKRARNAR. Hrada keyrslan (30 min) skrifar i
               status_fast.json og appid las hana ALDREI — thar med voru
               allar heimildir hennar osynilegar, thar a medal api_lineups
               (stadfest byrjunarlid) sem er EINGONGU sott thar. Hrada
               keyrslan er nyrri, svo hun hefur forgang a somu lykla.   */
            const sources = { ...(pipeStatus?.sources || {}),
                              ...(pipeStatusFast?.sources || {}) };
            const SHOW = {
              /* TVITEKNINGIN VAR MIN (fjarlaegd 21.8.2026): eg stagedi mitt
                 eigid `SHOW`-hunk med `git apply --cached` medan onnur lota
                 baetti SOMU linu vid — badar foru i main og build gaf
                 "Duplicate key". Skadlaust i keyrslu (sidasti vinnur) en
                 thad er merki um TVO skrifara a sama hlut, og skyringin er
                 hér ad nedan vid thann sem stendur.                     */
              api_lineups:    "Confirmed lineups",
              apisports_account: "API-Sports account",
              fdcouk_e0:      "Match stats E0 (current)",
              fdcouk_history: "Match stats E0 (history)",
              espn_shots:     "Shots with coordinates (ESPN)",
              last_gw:        "Gameweek report",
              player_seasons: "Players' earlier seasons",
              travel:         "Travel distances",
              rotation:       "Rotation",
              team_form:      "Team form",
              luck:           "Luck meter",
              form_features:  "Rolling form",
              gameweek_shape: "Gameweek shape",
              euro_fixtures:  "European fixtures",
              /* THESSI VAR SKRIFUD EN ALDREI SYND (baett vid 16.8.2026).
                 `prediction_ledger` er eina merkid um hvort spa-bokhaldid
                 hafi raunverulega skrifad rod i sinum 12 klst glugga —
                 EINSKOTA taekifaeri per umferd (kafli 7: inntokin eru
                 horfin eftir a). Athugasemdin i `snapshot-predictions.mjs`
                 fullyrti ad rodin birtist her; hun gerdi thad ekki, svo
                 raud lina hefdi farid a disk og verid synd ENGUM.
                 `elo_age` var lika utan SHOW en er VILJANDI aframhaldandi
                 utan hans: hun segir aldurinn eins og hann var i SIDUSTU
                 pipeline-keyrslu (23,2 klst) medan ClubElo-rodin her ad
                 ofan telur hann LIFANDI i vafranum (2,7 dagar). Tvaer
                 tolur um sama hlut, sin med hvoru svari, er verra en ein. */
              prediction_ledger: "Prediction ledger",
              /* SAMA GAT, SAMA KVOLD (20.8.2026): `record("preseason", …)`
                 var skrifud a disk en `SHOW` er STRANGUR hvitlisti, svo
                 lidin — RAUD LINA MED — hefdi verid synd ENGUM. Sama og
                 `prediction_ledger`/`elo_age` 16.8. Vordur:
                 `tests/preseason.mjs` kafli K.                          */
              preseason:      "Preseason friendlies",
              /* ARKIVID VERDUR AD SJAST ThOTT ENGINN LESI ThAD.
                 `odds_raw` skrifar hratt Odds-API-svar i dagsetta skra
                 (kafli 7 / SCHEMA). Appid les hana ALDREI — en einmitt
                 thess vegna er thogul bilun her verst: enginn dalkur
                 tæmist, ekkert lit breytist, og linu-hreyfingin sem
                 fæst hvergi annars stadar tapast varanlega. Sama rok og
                 `data/history/`: dagleg mynd verdur ekki buin til eftir a. */
              odds_raw:          "Raw odds archive",
            };
            return Object.entries(sources)
              .filter(([k]) => SHOW[k])
              .map(([k, v]) => {
                // "bidur" = keyrslan tokst en gognin eru ekki til enn
                const waiting = v.ok && (!v.count || v.count === 0);
                const dot = !v.ok ? S.dotErr : waiting ? S.dotWait : S.dotOk;
                return (
                  /* NOTAN ER KLIPPT I BADAR ATTIR OG FULL I TOOLTIP.
                     Bordinn er rist (auto-fill 270px) svo 150 stafa nota
                     — t.d. spa-bokhaldsins — teygdi eina rod yfir fjorar
                     linur og skekkti allar hinar. 40 stafir stodu thegar
                     a villunni; "bidur" hafdi ekkert thak.              */
                  <div key={k} style={S.srcRow} title={v.note || ""}>
                    <span style={dot} />{SHOW[k]} — {
                      !v.ok ? interp("error: {0}", [(v.note || "unknown").slice(0, 40)])
                      : waiting ? ((v.note || "waiting for data").length > 46
                          ? (v.note || "").slice(0, 46).trimEnd() + "…"
                          : (v.note || "waiting for data"))
                      : v.count}
                  </div>
                );
              });
          })()}
        </div>
      </footer>

      {/* ---------- Yfirlit: leikmaður eða lið ---------- */}
      {detail && (() => {
        const isPlayer = detail.kind === "player";
        const p = isPlayer ? byId[detail.id] : null;
        const t = isPlayer ? teamById[p?.team] : teamById[detail.id];
        if (!t) return null;
        /* NAESTU 8 LEIKIR a spjaldinu (ad beidni). Aður var thetta bundid
           vid recRange (lagmark 6) sem thydir ad spjaldid stytti sig thegar
           tillogu-bilid var stytt — ohad hvor öðrum nu. Evropu-/bikarleikir
           fljota med i tímaröð svo alagið sjáist i samhengi.               */
        const CARD_FIXTURES = 8;
        const fxs = allFixturesFor(t.id, gw, CARD_FIXTURES);
        const av = isPlayer ? availOf(p) : null;
        const ban = isPlayer ? banRisk(p, gw, seasonStarted) : null;
        const sp = isPlayer ? setPieceOf(p, spRanks) : null;
        const rot = isPlayer ? rotationRisk(p, playedByClub[p.team] ?? seasonGames) : null;
        /* DC-HITTNI (afturvirkjud, sja TERMINAL_HANDOFF_4 og CLAUDE.md 6l):
           hit_rate_adj ur defcon.json — EKKI hraa hit_rate, hun ofmaelist a
           litlum synum. n (startir) fylgir ALLTAF med. GK er sleppt: DefCon-
           stig eru fyrir utivallarmenn og GK-talan vaeri omaeld tala sem
           liti ut eins og maeling (sama regla og mo/ao i skiptaglugganum). */
        const dcp = isPlayer && p.element_type !== 1 && defcon?.players?.length
          ? defcon.players.find(x => x.fpl_id === p.id) : null;
        const tm = teamMetrics[t.id] || {};
        const e = eloByTeam[t.id], dcv = dcOpp[t.id];
        return (
          <div style={S.overlay} onClick={() => setDetail(null)}>
            <div style={S.detail} onClick={ev => ev.stopPropagation()}>
              {/* haus */}
              <div style={S.dHead}>
                <div style={S.dPortrait}>
                  {isPlayer
                    ? <PlayerImg code={p.code} short={t.short} size={52} />
                    : <Crest team={t} size={44} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={S.dName}>{isPlayer ? p.web_name : t.name}</div>
                  <div style={S.dSub}>
                    {isPlayer
                      ? `${p.first_name} ${p.second_name} · ${t.short} · ${POS_LABEL[p.element_type]} · £${(p.now_cost/10).toFixed(1)}`
                      : interp("{0} · {1} players", [t.short, (players || []).filter(x => x.team === t.id).length])}
                  </div>
                </div>
                <button style={S.close} onClick={() => setDetail(null)}>✕</button>
              </div>

              {/* staða / meiðsli */}
              {isPlayer && av.isRisk && (
                <div style={{ ...S.dAlert, background:av.bg, color:av.color }}>
                  <b>{av.label}</b>{av.chance != null ? interp(" — {0}% chance of playing", [av.chance]) : ""}
                  {av.news ? <div style={{ marginTop:2, fontWeight:400 }}>{av.news}</div> : null}
                  {injuryById[p.id]?.reason && (
                    <div style={{ marginTop:3, fontWeight:400 }}>
                      {"Type:"} <b>{injuryById[p.id].reason}</b>
                      {injuryById[p.id].type ? ` · ${injuryById[p.id].type}` : ""}
                      <span style={S.injSrc}> — API-Sports</span>
                    </div>
                  )}
                </div>
              )}
              {/* API-Sports veit af meiðslum sem FPL hefur EKKI flaggað enn —
                  birt varfærið sem óstaðfest vísbending, ekki viðvörun.      */}
              {isPlayer && !av.isRisk && injuryById[p.id]?.reason && (
                <div style={{ ...S.dAlert, background:C.cardAlt, color:C.text2 }}>
                  <b>{"API-Sports records:"}</b> {injuryById[p.id].reason}
                  {injuryById[p.id].type ? ` (${injuryById[p.id].type})` : ""} {"— FPL has not flagged him, so this may be out of date or minor."}
                </div>
              )}
              {isPlayer && ban && (ban.level === "high" || ban.level === "mid") && (
                <div style={{ ...S.dAlert, background:"#fff6e0", color:"#8a5f00" }}>
                  <b>{ban.y} {"yellow cards"}</b> — {ban.toGo} {"from"} {ban.threshold}{" threshold ("}{ban.matches} {ban.matches === 1 ? "match" : "fixtures"} {"ban)"}
                </div>
              )}

              {/* ---------- TÖLUR ----------
                  LEIKMENN: nyr efsti hluti (sex adaltolur) + timabila-tafla
                  med saetum og trend-merkingu — sja src/PlayerPanel.jsx.
                  LID: obreytt reiknad mat appsins.                        */}
              {isPlayer ? (
                <>
                  <PlayerHeadline
                    p={p}
                    inSquad={squadIds.has(p.id)}
                    buyTenths={squadIds.has(p.id) ? buyOf(p.id) : null}
                    sellTenths_={squadIds.has(p.id) ? sellOf(p.id) : null}
                    seasonStarted={seasonStarted}
                    onEditPrice={() => setPriceEdit({ id: p.id })} />

                  {/* ============================================================
                      YFIRSTANDANDI TIMABIL EFST (25.8.2026, beidni notandans)
                      ============================================================
                      Radirnar eru byggdar HER thvi `gwStats` er state appsins;
                      `SeasonSoFar` er hreinn birtir og fær thaer tilbunar.
                      EIN UMFERD ER HLADIN I EINU og thad er ASETT: `live/gw{n}
                      .json` er 424 KB og appid sækir ADEINS thá umferd sem er
                      valin — 16 MB i GW38 gegnum raw.githubusercontent, sem
                      hefur throttlad okkur tvisvar. Radirnar sem eru ekki
                      hladnar bera „—" MED SKYRINGU, aldrei 0.
                      `startedGws` er SAMA klukka og allt annad.          */}
                  <SeasonSoFar p={p} seasonStarted={seasonStarted}
                    currentLabel={currentSeasonLabel} startedGws={startedGws}
                    clubPlayed={playedByClub[p.team]}
                    gwRows={Array.from({ length: startedGws }, (_, i) => {
                      const g = i + 1;
                      return { gw: g, st: g === gw ? (gwStats?.byId?.[p.id]?.stats || null) : null };
                    })} />

                  {/* ep og vitarod eiga heima her, ekki i timabila-toflunni */}
                  <div style={S.dGrid}>
                    <DStat k={"Next GW forecast (ep)"} v={p.ep_next} />
                    {/* ============================================================
                        „St%" UR EINUM LEIK ER EKKI MAELING — HLIDID VANTADI
                        A ThENNAN KALLSTAD (25.8.2026, kaera notandans)
                        ============================================================
                        `rotationRisk` VEIT thegar hvenaer urtakid er of litid:
                        `enough = prevSeason || seasonGames >= 3`, og an thess
                        skilar hun `level: "low"`. HINIR TVEIR kallstadirnir —
                        vallar-merkid (`rot.level === "high"`) og hlidarstikan —
                        lesa hana; ThESSI EINI gerdi thad ekki og birti thvi
                        „1/1 · 100%" eftir eina umferd, sem les eins og maelt
                        hlutfall en er ein leikur.
                        SAMA AETT OG NEFNARA-VILLAN 24.8.: lagfaering sem
                        snertir tvo af thremur kallstodum er osamkvaemni, ekki
                        lagfaering. Skilyrdid er `rotationRisk` sjalf — ENGIN
                        ny `seasonGames >= 3`-profun her, thvi thrju afrit af
                        einni reglu er nakvaemlega thad sem `buildTeamMetrics`
                        og `headWidth` kostudu.
                        ENGIN GAT I RASTINNI: `dGrid` er
                        `repeat(auto-fit, minmax(88px,1fr))`, svo reitirnir
                        sem eftir eru fylla bilid — reitur sem er ekki
                        teiknadur skilur ekkert eftir sig.               */}
                    {rot && rot.level !== "low" &&
                      <DStat k={"Started"} v={`${rot.starts}/${rot.played}`} sub={`${rot.pct}%`}
                        title={rot.prevSeason && cumLabel
                          ? interp("Started {0} of {1} matches in {2}.", [rot.starts, rot.played, cumLabel])
                          : interp("Started {0} of the {1} matches his club has played this season.", [rot.starts, rot.played])} />}
                    {/* Afturvirkjud tala, ALDREI hra — og n synilegt vid hlidina */}
                    {dcp && dcp.starts > 0 && dcp.hit_rate_adj != null &&
                      <DStat k={"DC hit rate"} v={`${Math.round(dcp.hit_rate_adj * 100)}%`}
                        sub={interp("{0} starts · raw {1}%", [dcp.starts, Math.round(dcp.hit_rate * 100)])} />}
                    {sp && <DStat k={"Penalty order"} v={sp.pen ?? "—"} sub={sp.isPenTaker ? "first taker" : ""} />}
                    {sp?.ck != null && <DStat k={"Corners/FK"} v={sp.ck} />}
                    {sp?.fk != null && <DStat k={"Free kicks"} v={sp.fk} />}
                  </div>

                  {/* ============================================================
                      „ThIN AAETLUN" — PER-LEIKMANNS-STADREYNDIRNAR (21.8.2026)
                      ============================================================
                      Notandinn: „AEtti thetta kannski ad vera frekar a player
                      spjaldinu?" Ja: upplysingin ER per leikmann, og hun a
                      thvi ad vera thar sem hann er ThEGAR ad skoda ThENNAN
                      mann. A vellinum stendur eftir MERKI (hausinn + rodin),
                      ekki malsgrein.

                      ThRJAR TOLUR, ALLAR UR VELUM SEM ERU ThEGAR TIL:
                        `unusedById[..].fwd`  — aaetlunin (erfd fram)
                        `unusedById[..].back` — stadreyndin (byrjadar umferdir)
                        `sellWhen[..].run`    — erfidasta runan framundan
                      ENGIN NY TALA er reiknud her og ENGIN ThEIRRA er lögd
                      saman: framvirka og afturvirka talan eru tvaer olikar
                      fullyrdingar um sama mann (sja `unusedById`), og runan
                      er a alveg odrum kvarda.

                      HVER TALA BER SINN GLUGGA I `sub`: „0 of 6" an „GW1-6"
                      er nakvaemlega „4-10 and never reach 1"-bilunin, og
                      glugginn er LESINN af svarinu (`u.from`/`u.to`), ekki
                      skrifadur her.
                      OG EIN SETNING VER GEGN RANGLESTRI, ekki fleiri:
                      runu-talan er INNAN LEIKMANNS og radar ekki tveimur
                      monnum — thad er einmitt villan sem notandinn gerdi med
                      Rice 20.8. Hun stendur i `dGroupSub` og i tooltip-inu;
                      hitt fellur ut med naerverunni (kassinn heitir „Your
                      plan" og situr a spjaldi ThESSA manns).             */}
                  {(() => {
                    const u = unusedById[p.id] || {};
                    /* `sell`, EKKI `t` — `t` er LIDID i ytri lokuninni
                       (`const t = isPlayer ? teamById[...]`). Skuggun a thvi
                       nafni her vaeri logleg og OLAESILEG.               */
                    const sell = sellWhen[p.id];
                    const sw = unusedSwaps[p.id] || [];
                    const run = sell?.run || null;
                    if (!u.fwd && !u.back && !run) return null;
                    const win = v => interp("GW{0}–{1}", [v.from, v.to]);
                    return (
                      <>
                        <div style={S.dGroupHead}>
                          <span style={{ ...S.dGroupDot, background:C.amber }} />
                          {"Your plan"}
                          <span style={S.dGroupSub}>
                            {"about him only — these figures do not rank him against another player"}
                          </span>
                        </div>
                        <div style={S.dGrid}>
                          {u.fwd && <DStat k={"In your plan's XI"}
                            v={interp("{0} of {1}", [u.fwd.starts, u.fwd.gws])}
                            sub={`${win(unusedPlan.fwd)} · ${unusedPlan.fwd.basis}`}
                            title={interp("Your plan has him in the XI in {0} of the {1} gameweeks he is in your squad across GW{2}-{3}. Gameweeks you have not changed inherit the last line-up you did set, so this is your own arrangement carried forward — not a forecast of who will play.", [u.fwd.starts, u.fwd.gws, unusedPlan.fwd.from, unusedPlan.fwd.to])} />}
                          {u.back && <DStat k={"Was in your XI"}
                            v={interp("{0} of {1}", [u.back.starts, u.back.gws])}
                            sub={`${win(unusedPlan.back)} · what you actually did`}
                            title={interp("You picked him in your XI in {0} of the {1} gameweeks he was in your squad across GW{2}-{3}. Gameweeks whose deadline has passed, so this is fact. It counts your XI, not autosubs.", [u.back.starts, u.back.gws, unusedPlan.back.from, unusedPlan.back.to])} />}
                          {run && <DStat k={"Hardest run ahead"}
                            v={interp("GW{0}–{1}", [run.from, run.to])}
                            sub={interp("{0} pts/GW vs {1} average over GW{2}–{3}",
                              [signedPts(run.perGw), sell.basis.scale, sell.basis.from, sell.basis.to])}
                            title={interp("Expected points per gameweek inside GW{0}-{1} compared with HIS OWN average across GW{2}-{3} ({4} gameweeks with a known fixture). A figure for him — it is not comparable with another player's, and it is not a sell order.", [run.from, run.to, sell.basis.from, sell.basis.to, sell.basis.n])} />}
                        </div>
                        {/* SKIPTA-TILLAGAN — FLUTT HINGAD UR VALLAR-MERKINU.
                            Hun ber NAFN og VERD og enga delta-tolu: mismunur
                            i leikjathyngd er ekki stig, og ad birta hann sem
                            stig var einmitt villan sem kaup-glugga-vinnan
                            felldi.                                        */}
                        {sw.length > 0 && (
                          <div style={S.dNote}>
                            {"Easier fixtures at his position: "}
                            {sw.map((c, i) => (
                              <span key={c.p.id}>
                                {i > 0 ? " · " : ""}
                                <span style={S.srcSwapName}
                                  onClick={() => setDetail({ kind:"player", id:c.p.id })}
                                  title={"Ranked by the measured buy ranker (rankScore) — same position, affordable from this sale plus your bank, legal under the 3-per-club rule, and easier fixtures than him over the coming gameweeks. Not a points forecast."}>
                                  {c.p.web_name}</span>
                                {" £"}{(c.p.now_cost/10).toFixed(1)}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* SKOTAKORT — 2025/26, eina timabilid sem BSD hefur skot fyrir.
                      Birtist EKKI ef leikmadurinn skaut ekki: tomur vollur
                      segir "engin gogn" en litur ut eins og "skaut aldrei". */}
                  {(() => {
                    const sm = shotIndex?.byCode.get(p.code) || null;
                    if (!sm?.length) return null;
                    return (
                      <>
                        <div style={S.dGroupHead}>
                          Shot map <span style={{ fontWeight: 400, opacity: 0.65 }}>
                            2025/26 · bubble size = xG</span>
                        </div>
                        <ShotMap shots={sm} calib={shotIndex.calib} label={p.web_name} />
                      </>
                    );
                  })()}

                  {/* "Hvar hann spilar" STOD HER og var faert NEDST i gluggann
                      16.8.2026 ad beidni notandans — leit: PositionMap.      */}
                  {/* `SeasonTable` STOD HER og er faerd NEDST 25.8.2026 ad
                      beidni notandans — leit: SeasonTable. Hun er staersti
                      kassinn a spjaldinu (allt ad ellefu radir x fimm
                      timabil) og sat MILLI kaupakvordunar-talnanna og
                      leikjanna, svo ThESSI umferd og leikirnir framundan
                      voru undir henni. Saga er samhengi, ekki akvordun —
                      sama rok og faerdi `PositionMap` nedst 16.8.
                      HUN LIFIR FLUTNINGINN OBREYTT: hun teiknar sinn eigin
                      adskilnad (`S.secLbl` med `borderTop`), svo hun tharf
                      ekkert fra thvi sem er fyrir ofan hana.             */}
                </>
              ) : (
                <>
                  <div style={S.dGroupHead}>
                    <span style={{ ...S.dGroupDot, background:C.purple }} />
                    {"Team strength"} <span style={S.dGroupSub}>{"the app's own estimate ("}{cumLabel}{") · ClubElo live"}</span>
                  </div>
                  <div style={S.dGrid}>
                    <DStat k="ClubElo" v={e ? Math.round(e.elo) : "—"} sub={e ? `rank ${e.rank}` : "not matched"} />
                    <DStat k={"xG / match"} v={tm.xg90 ?? "—"} />
                    <DStat k="xGC / 90" v={tm.xgc90 ?? "—"} sub={"lower is better"} />
                    <DStat k={"DefCon opportunity"} v={dcv?.defcon_opportunity ?? "—"} sub={"higher = more CBIT"} />
                  </div>
                </>
              )}

              {/* VERD-BLOKKIN VAR HER OG ER FARIN.
                  Hun hafdi eigin stillingar-glugga, +/- hnappa og thrju
                  smaletursvid — allt til ad breyta EINNI tolu. Nu er ✎ a
                  verd-reitnum i efsta hluta (PlayerHeadline) sem opnar einn
                  lettan popup (PriceEditor), og soluverd/hagnadur birtast
                  thar sem undirtexti. Ein tala, einn stadur.               */}

              {/* GW-FRAMMISTAÐA — hvernig gekk í þessari umferð */}
              {isPlayer && (() => {
                const g = gwStats?.byId?.[p.id];
                if (!g) return (
                  <>
                    <div style={S.dSectionLbl}>GW{gw} {"performance"}</div>
                    {/* ============================================================
                        FORLEIKS-SETNINGIN VARD OSONN VID FRESTINN (25.8.2026)
                        ============================================================
                        Her stod „the season begins 21 August" — FOST DAGSETNING
                        um lifandi astand, nakvaemlega sama aett og
                        „the range is 4-10 and NO club has a 1" i `SetPieces`
                        og hordu „2025/26"-strengirnir i haus skotakortsins.
                        Hun ureltist ThOGULT: 21. agust leid, GW1 var spilud, og
                        spjaldid helt afram ad segja notandanum ad timabilid vaeri
                        ekki byrjad um leid og hann skodadi GW2.
                        SKILYRDID ER SAMEIGINLEGA KLUKKAN (`seasonStarted` ->
                        `seasonHasStarted` i availability.js), EKKI NY PROFUN OG
                        ENGIN DAGSETNING. Tvaer klukkur um sama tima er sama aett
                        og `buildTeamMetrics`: afritin reka i sundur og BAEDI lita
                        ut fyrir ad vera rett (maelt 24.8.: App sagdi `false` og
                        PlayerList `true` um SAMA dag).
                        TVAER ORSAKIR, TVAER SETNINGAR: fyrir frest er timabilid
                        ekki byrjad; eftir hann er umferdin annadhvort oleikin eda
                        skrain ekki komin — og tha er RANGT ad segja ad timabilid
                        se ekki byrjad.                                     */}
                    <div style={S.muted}>
                      {seasonStarted
                        ? interp("No numbers for GW{0} yet — it has not been played, or the gameweek file has not been published.", [gw])
                        : interp("No numbers for GW{0} yet — the season has not started.", [gw])}
                    </div>
                  </>
                );
                const st = g.stats || {};
                const ex = (g.explain || []).flatMap(b => b.stats || []);
                const num = v => (v == null ? "—" : v);
                const xg = st.expected_goals, xa = st.expected_assists;
                const overP = (st.goals_scored || 0) - parseFloat(xg || 0);
                return (
                  <>
                    <div style={S.dSectionLbl}>
                      GW{gw} {"performance"}
                      <span style={S.dSectionNote}>
                        {st.total_points} {"pts ·"} {st.minutes} {"min"}
                        {gwStats.src === "live" ? " · live" : ""}
                      </span>
                    </div>
                    <div style={S.dGrid}>
                      <DStat k={"Points"} v={num(st.total_points)} />
                      <DStat k={"Minutes"} v={num(st.minutes)} />
                      <DStat k={"Goals"} v={num(st.goals_scored)} />
                      <DStat k={"Assists"} v={num(st.assists)} />
                      <DStat k="xG" v={xg == null ? "—" : (+xg).toFixed(2)}
                        sub={xg != null && st.minutes > 0 ? (overP >= 0 ? `+${overP.toFixed(2)} over` : `${overP.toFixed(2)} under`) : ""} />
                      <DStat k="xA" v={xa == null ? "—" : (+xa).toFixed(2)} />
                      <DStat k={"Bonus / BPS"} v={`${num(st.bonus)} / ${num(st.bps)}`} />
                      {p.element_type <= 2 && <DStat k={"Clean sheets"} v={st.clean_sheets ? "yes" : "no"} sub={interp("{0} conceded", [num(st.goals_conceded)])} />}
                      {p.element_type <= 2 && <DStat k="xGC" v={st.expected_goals_conceded == null ? "—" : (+st.expected_goals_conceded).toFixed(2)} />}
                      {p.element_type === 1 && <DStat k={"Saves"} v={num(st.saves)} />}
                      {(st.yellow_cards || st.red_cards) ? <DStat k={"Cards"} v={interp("{0}Y / {1}R", [num(st.yellow_cards), num(st.red_cards)])} /> : null}
                      {st.defensive_contribution != null && <DStat k={"Defensive contribution"} v={st.defensive_contribution} />}
                    </div>

                    {/* Hvaðan stigin komu — úr explain, óskert */}
                    {ex.length > 0 && (
                      <>
                        <div style={S.dSubLbl}>{"Where the points came from"}</div>
                        <div style={S.dExList}>
                          {ex.filter(x => x.points !== 0).map((x, i) => (
                            <div key={i} style={S.dExRow}>
                              <span style={S.dExName}>{EXPLAIN_LABEL[x.identifier] || x.identifier}</span>
                              {x.value != null && <span style={S.dExVal}>{x.value}</span>}
                              <span style={{ ...S.dExPts, color: x.points > 0 ? C.green : C.red }}>
                                {x.points > 0 ? "+" : ""}{x.points}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* BIG CHANCES MISSED — NOTAN NEFNDI HEIMILD SEM ER DAUD
                        OG ThROSKULD SEM ER EKKI OKKAR (lagad 25.8.2026).

                        Hun sagdi "derived from Understat shot data (xG above
                        0.30)". Hvorttveggja er rangt:
                        · Understat er DAUD sem heimild (maelt 9.8.2026 —
                          deildarsidur Cloudflare-vardar, leikjasidur bera
                          hvorki `shotsData` ne `rostersData` i vafra), og
                          eina talan sem hun atti EIN maeldist gagnslaus.
                        · ThROSKULDURINN ER 0,18, EKKI 0,30 — `BIG_CHANCE_XG`
                          i `src/bsd.js`, og hann er FITTADUR gegn
                          raunverulega BSD-sviðinu `big_chances` (MAE 0,746,
                          r 0,774 a 748 lid-leikjum). 0,30 var agiskun um
                          annad gagnasett.
                        Fost tala um lifandi kvarda urelidist thegjandi — og
                        her var hun UROREITT fra upphafi. Nu er hun LEIDD ur
                        sama fasta sem kodinn notar, svo hun getur ekki
                        rekist i sundur vid hann.                          */}
                    <div style={S.dNote}>
                      <b>Big chances missed</b> {interp("is not in the FPL API. It is derived from BSD per-shot xG — a shot with xG at or above {0} that did not go in. BSD covers 2025/26 only, so this is empty for other seasons.", [BIG_CHANCE_XG])}
                    </div>
                  </>
                );
              })()}

              {/* LEIKIR — deild + Evrópa + bikar */}
              <div style={S.dSectionLbl}>
                {"Fixtures"}
                <span style={S.dSectionNote}>
                  {euroFx?.fixtures?.length
                    ? "league · Europe · cup"
                    : "league (Europe/cup data not in yet)"}
                </span>
              </div>
              <div style={S.dFixList}>
                {fxs.map((f, i) => {
                  if (f.kind === "cup") return (
                    <div key={i} style={S.dFixCup}>
                      <span style={S.dFixGw}>—</span>
                      <span style={S.dFixComp}>{f.label}</span>
                      <span style={{ flex:1 }} />
                      <span style={S.dFixDate}>{fmtDate(f.date)}</span>
                    </div>
                  );
                  const cs = csFor(t.id, { ...f, kickoff: f.date });
                  const dd = fixDifficulty(t.id, f, isPlayer ? p.element_type : 2) ?? f.fdr;
                  const tt = tierOf(dd);
                  const bg = TIER_BG[tt], fg = TIER_FG[tt];
                  return (
                    <div key={i} style={S.dFixRow}>
                      <span style={S.dFixGw}>GW{f.gw}</span>
                      <span style={{ ...S.dFixOpp, background:bg, color:fg }}>
                        {oppLabel(teamById[f.opp]?.short, f.home)}
                      </span>
                      <span style={S.dFixFdr} title={interp("FDR {0}, combined {1}", [f.fdr, dd])}>{"difficulty"} {dd}</span>
                      {(() => {
                        /* AÐEINS eigin ferðalengd. Ferð MOTHERJANS var her lika
                           (thegar f.home) en var tekin ut ad beidni notanda —
                           hun er ekki relevant fyrir hans eigin leikmann.       */
                        const tr = travelByFx[f.id];
                        if (!tr?.km || f.home) return null;
                        return (
                          <span style={{ ...S.dFixTravel, ...(tr.is_long_trip ? S.dFixTravelLong : {}) }}
                            title={(() => {
                              /* HEIL SETNING i hvorri leid, ekki sniðmat +
                                 islenskur buti sem rok. Sa buti var ekki
                                 thyddur og gaf "travel 359 km (langferð)". */
                              const who = isPlayer ? "The team" : t.short;
                              return tr.is_long_trip
                                ? interp("{0} travels {1} km (as the crow flies) — long trip (300+ km)", [who, tr.km])
                                : interp("{0} travels {1} km (as the crow flies)", [who, tr.km]);
                            })()}>
                            ✈{tr.km}
                          </span>
                        );
                      })()}
                      {isPlayer && HOME_PTS[p.element_type] != null && (
                        <span style={S.dFixHome}
                          title={interp("Measured home advantage for {0}: +{1} pts/match", [POS_LABEL[p.element_type], HOME_PTS[p.element_type]])}>
                          {f.home ? `+${HOME_PTS[p.element_type].toFixed(2)}` : "away"}
                        </span>
                      )}
                      <span style={{ flex:1 }} />
                      {/* CS-vaenting er MERKINGARLAUS fyrir FWD (og synd MID adeins
                          af thvi ad their fa 1 stig fyrir CS). Tekin ut fyrir sokn. */}
                      {cs.cs != null && !(isPlayer && p.element_type === 4) &&
                        <span style={S.dFixCs} title={"Clean-sheet probability — for the TEAM, not the player. He only gets the points if the team keeps a clean sheet AND he plays 60+ mins."}>CS {cs.cs}%</span>}
                      <span style={S.dFixDate}>{fmtDate(f.date)}</span>
                    </div>
                  );
                })}
                {!fxs.length && <div style={S.muted}>{"No fixtures listed."}</div>}
              </div>

              {/* HVAR HANN SPILAR — medalstada per leik.
                  EKKI heatmap: BSD skjalar `heatmap` en skilar henni
                  aldrei (0 af 15.189 rodum). Thetta er thad sem ER til.
                  FAERT NEDST 16.8.2026 (var a undan SeasonTable): kortid er
                  samhengi, ekki tala sem akvordun byggist a, svo thad a ad
                  vera nedan vid leikina en ofan vid adgerdirnar.          */}
              {isPlayer && (() => {
                const pos = shotIndex?.positions?.[String(p.code)];
                if (!pos?.length) return null;
                return (
                  <>
                    <div style={S.dGroupHead}>
                      Where he plays <span style={{ fontWeight: 400, opacity: 0.65 }}>
                        2025/26 · one dot per match, not a touch heatmap</span>
                    </div>
                    <PositionMap positions={pos} label={p.web_name} />
                  </>
                );
              })()}

              {/* TIMABILA-TAFLAN — NEDST, RETT OFAN VID ADGERDIRNAR
                  (faerd hingad 25.8.2026, sja skyringuna thar sem hun stod).
                  ENN INNAN `isPlayer`: `SeasonTable` les `p.code` og
                  `p.element_type` og lid-spjaldid a hvorugt.             */}
              {isPlayer && <SeasonTable p={p} seasonsFile={seasonsFile}
                currentLabel={currentSeasonLabel} seasonStarted={seasonStarted} />}

              {/* aðgerðir */}
              <div style={S.dActions}>
                {isPlayer && squadIds.has(p.id) && (
                  <>
                    <button style={S.dBtn} onClick={() => { setDetail(null); setSelling(p.id); setSearchQ(""); }}>{"Transfer out"}</button>
                    {starters.some(x => x.id === p.id) && p.id !== captain &&
                      <button style={S.dBtn} onClick={() => { if (p.id === vice) setVice(null); setCaptain(p.id); setDetail(null); flash(interp("{0} is captain", [p.web_name])); }}>{"Captain"}</button>}
                    {starters.some(x => x.id === p.id) && p.id !== captain && p.id !== vice &&
                      <button style={S.dBtn} onClick={() => { setVice(p.id); setDetail(null); flash(interp("{0} is vice-captain", [p.web_name])); }}>{"Vice-captain"}</button>}
                  </>
                )}
                {isPlayer && (
                  <button style={S.dBtn} title={"Add this player to the comparison"}
                    onClick={() => {
                      setCmpIds(v => v.includes(p.id) ? v : [...v, p.id].slice(0, 4));
                      setDetail(null); setCmpOpen(true);
                    }}>
                    {"⇄ Compare"}{cmpIds.length ? ` (${cmpIds.length})` : ""}
                  </button>
                )}
                {isPlayer && <button style={S.dBtn} onClick={() => setDetail({ kind:"team", id:t.id })}>{"See team:"} {t.short}</button>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ---------- Leitargluggi ---------- */}
      {/* ADEINS SKIPTI-HAMUR. browse var fjarlagt 31.7. — sja hnappinn ofar. */}
      {selling !== null && (
        <div style={S.overlay} onClick={() => { setSelling(null); setSearchQ(""); }}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <input autoFocus style={S.search} placeholder={"Search — name or team"}
                value={searchQ} onChange={e => setSearchQ(e.target.value)} />
              <button style={S.close} onClick={() => { setSelling(null); setSearchQ(""); }}>✕</button>
            </div>
            <div style={S.searchList}>
              {searchResults.map(p => {
                const t = teamById[p.team];
                const fx = (fixByTeamGw[p.team]?.[gw] || [])[0];
                const diff = (sellOf(selling) - p.now_cost) / 10;
                /* LOGMAETI BLOKKAR, VERD GERIR ThAD EKKI (20.8.2026).
                   `block` bar adur BAEDI "3 per club" OG "£X short", og
                   badir grafu spjaldid i `sItemBlocked` (opacity 0,45) —
                   svo dyr madur LAS eins og ologlegur. Nu er verdid
                   `overdraft`: talan er synd (raud, "needs -£X.X") en
                   valid er OPID, thvi notandinn aetlar ad fjarmagna thad
                   med solu i naesta skrefi.                             */
                let block = null;
                let overdraft = null;
                if (selling) {
                  const after = squadAt.map(x => (x.id === selling ? p.id : x.id));
                  if (after.filter(id => byId[id]?.team === p.team).length > 3) block = "3 per club";
                  if (bank + diff < 0) overdraft = +(bank + diff).toFixed(1);
                }
                return (
                  <button key={p.id}
                    onClick={() => selling
                      ? commitTransfer(selling, p.id)
                      : (setSearchQ(""), setDetail({ kind:"player", id:p.id }))}
                    style={{ ...S.sItem, ...(block ? S.sItemBlocked : {}) }}
                    title={block ? interp("Illegal: {0}", [block]) : ""}>
                    <div style={S.sPortrait}>
                      <PlayerImg code={p.code} short={t?.short} size={30} />
                      <Crest team={t} size={13} style={S.sCrest} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={S.sName}>
                        {p.web_name}
                        {(() => { const a = availOf(p); return a.isRisk
                          ? <span style={{ ...S.sAvail, background:a.bg, color:a.color }}
                              title={a.news || a.label}>{a.short}{a.chance != null && a.chance > 0 ? ` ${a.chance}%` : ""}</span>
                          : null; })()}
                        {setPieceOf(p, spRanks)?.isPenTaker && <span style={S.sPen} title={"First penalty taker (updated daily from FPL)"}>PEN</span>}
                      </div>
                      <div style={S.sMeta}>
                        {t?.short} · {POS_LABEL[p.element_type]} · ep {p.ep_next}
                        {fx ? ` · ${oppLabel(teamById[fx.opp]?.short, fx.home)}` : ""}
                      </div>
                      {/* MAELDU TOLURNAR. Rodin er ASETT: byrjunar-likur
                          fyrst (allt annad er verdlaust ef hann spilar
                          ekki), tha thyngd leikjanna, tha "a hann tima",
                          tha verdid. Tomt gildi er SLEPPT, ekki sett i 0 —
                          "engin gogn" og "lag tala" eru ekki sama hlutid. */}
                      {(() => {
                        const sg = signalsOf(p);
                        if (!sg) return null;
                        const ti = tierOf(sg.ffdr);
                        return (
                          <div style={S.sSig}>
                            {sg.startP != null && (
                              <span style={{ ...S.sigPill,
                                             ...(sg.startP < 0.5 ? S.sigBad
                                                 : sg.startP < 0.75 ? S.sigWarn : S.sigOk) }}
                                title={"Chance of 60+ minutes — measured model (Brier 0.089 vs 0.118 for \"started last time\"). The window is the LAST 5 COMPLETED GAMEWEEKS; in preseason that means the end of last season, when rest and rotation are heavy. Below 50% = bench risk."}>
                                {Math.round(sg.startP * 100)}%
                              </span>
                            )}
                            {sg.ffdr < 9 && (
                              <span style={{ ...S.sigFfdr, background:TIER_BG[ti], color:TIER_FG[ti] }}
                                title={`FFDR ${FFDR_AHEAD} — ${TIER_NAME[ti]}`}>
                                {sg.ffdr.toFixed(2)}
                              </span>
                            )}
                            {sg.mo != null && sg.mo >= 0.05 && (
                              <span style={S.sigMo}
                                title={"Goal imminent — volume (xGI) + threat + bad luck over the last 4 gameweeks. Only for players in the target group (0–1 returns, 180+ mins)."}>
                                {"IG"} {sg.mo.toFixed(1)}
                              </span>
                            )}
                            {sg.ao != null && sg.ao >= 20 && (
                              <span style={S.sigMo}
                                title={"Assist imminent — creativity per 90 mins. High = creating chances without getting the assist."}>
                                {"IA"} {sg.ao.toFixed(0)}
                              </span>
                            )}
                            {sg.predict === "up" && (
                              <span style={S.sigUp} title={"Likely price rise tonight — AN APPROXIMATION, FPL does not publish the formula"}>
                                ↑
                              </span>
                            )}
                            {sg.predict === "down" && (
                              <span style={S.sigDown} title={"Likely price fall tonight (approximation) — buy after the price run"}>
                                ↓
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={S.sPrice}>£{(p.now_cost/10).toFixed(1)}</div>
                      {selling && (block
                        ? <div style={S.sBlock}>{block}</div>
                        : <>
                            <div style={{ ...S.sDiff, color: diff >= 0 ? C.green : C.red }}>
                              {diff >= 0 ? "+" : ""}£{diff.toFixed(1)}
                            </div>
                            {/* MINUS-BANKI ER UPPLYSING, EKKI HINDRUN. */}
                            {overdraft != null &&
                              <div style={S.sOver} title={"Your bank goes negative — the pick is allowed, sell someone to fund it"}>
                                {"bank"} {money(overdraft)}
                              </div>}
                          </>)}
                    </div>
                  </button>
                );
              })}
              {!searchResults.length && <div style={S.muted}>{"No player found."}</div>}
            </div>
          </div>
        </div>
      )}

      {/* VERD-POPUP — einn lettur gluggi, kallaður fra ✎ a spjaldinu */}
      {priceEdit && (() => {
        const pp = byId[priceEdit.id];
        if (!pp) return null;
        return (
          <PriceEditor p={pp} valueTenths={buyOf(pp.id)}
            onClose={() => setPriceEdit(null)}
            onSave={tenths => {
              setBuyPrices(b => {
                const nb = { ...b };
                if (tenths == null) delete nb[pp.id];
                else nb[pp.id] = { p: clamp(tenths, 35, 200), src: "manual" };
                return nb;
              });
              flash(tenths == null ? interp("{0}: purchase price cleared", [pp.web_name])
                                   : interp("{0}: purchase price £{1}", [pp.web_name, (tenths/10).toFixed(1)]));
            }} />
        );
      })()}

      {/* SAMANBURDUR — fljotandi hnappur medan eitthvad er valid */}
      {!!cmpIds.length && !cmpOpen && (
        <button style={S.cmpFab} onClick={() => setCmpOpen(true)}>
          {"⇄ Comparison ("}{cmpIds.length})
        </button>
      )}
      {!!rotIds.length && (
        <Rotation targetIds={rotIds} players={players} teamById={teamById}
          fixByTeamGw={fixByTeamGw} fixDifficulty={fixDifficulty}
          startProbOf={startPOf}
          gwNow={gw} maxGw={maxGw} squadIds={squadIds} Crest={Crest}
          onToggleTarget={id => setRotIds(v => v.includes(id)
            ? (v.length > 1 ? v.filter(x => x !== id) : v)
            : [...v, id].slice(0, 2))}
          onClear={() => setRotIds([])}
          onClose={() => setRotIds([])} />
      )}
      {cmpOpen && (
        <Compare ids={cmpIds} players={players} teamById={teamById}
          seasonsFile={seasonsFile} photoUrl={photoUrl} Crest={Crest}
          currentLabel={currentSeasonLabel} seasonStarted={seasonStarted}
          advisorById={recommendations.advisorById} imminent={imminent}
          defcon={defcon} consist={consist} horizon={recRange}
          /* BSD FYLGIR MED svo `bigChances` i radgjofinni hafi heimild —
             hann var eini samhengis-thatturinn an framleidanda (14.8.2026). */
          bsd={[bsd, bsdLive]}
          onRemove={id => setCmpIds(v => v.filter(x => x !== id))}
          onClear={() => { setCmpIds([]); setCmpOpen(false); }}
          onClose={() => setCmpOpen(false)} />
      )}

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

/* ================= Undirhlutar ================= */

/* Félagsmerki með fallback. FPL-CDN getur skilað 404 (t.d. ef lið-kóði er
   ágiskaður), og þá sást brotin mynd í stað liðakóðans. */

/* Heimildin býr í FLOKKS-fyrirsögninni fyrir ofan (Núna / Tímabilið X /
   Styrkur) — per-tölu merkin sem voru hér reyndust óþörf tvítekning
   þegar tölurnar flokkuðust rétt.                                       */
/* `title` ER VALKVAETT OG ThAD ER ASETT: reitur an tooltips ma ekki fa
   `title=""` (tomur tooltip er verri en enginn — hann opnast tomur), svo
   `undefined` fer a reitina sem hafa ekkert ad segja. Naest-heidarlegasti
   stadurinn fyrir grunn tolu er vid hlidina a henni (`sub`); tooltip-id
   ber fulla setninguna thegar hun kemst ekki fyrir.                     */
function DStat({ k, v, sub, title }) {
  return (
    <div style={S.dStat} title={title || undefined}>
      <div style={S.dStatK}>{k}</div>
      <div style={S.dStatV}>{v}</div>
      {sub ? <div style={S.dStatS}>{sub}</div> : null}
    </div>
  );
}

function Stat({ icon, label, value, sub, tone }) {
  return (
    <div style={S.statCard}>
      <div style={S.statLbl}><span style={{ marginRight:5 }}>{icon}</span>{label}</div>
      <div style={{ ...S.statVal, color: tone === "bad" ? C.red : C.text }}>{value}</div>
      {sub && <div style={S.statSub}>{sub}</div>}
    </div>
  );
}

/* FIMM litaþrep — bilin eru MÆLDU flokkarnir, ekki valin.
   Hvert þrep svarar raunverulegri fantasy-útkomu (sjá MEASURED).           */
/* SEX ÞREP — MÆLT betri en fimm. Þrepun tapar upplýsingum úr samfellda
   stuðlinum, og 5 þrep tapa meira en 6:
     staða  samfellt  5 þrep  6 þrep
     GK       0,161    0,151   0,162
     DEF      0,278    0,267   0,268
     MID      0,282    0,270   0,276
     FWD      0,182    0,172   0,179
   Talan sjálf er líka sýnd, svo ekkert tapast í raun.                      */
/* SEX ÞREP — litaröð eftir erfiðleikastigi:
   1 dökkgrænt · 2 grænt · 3 ljósgult · 4 dökkgult · 5 ljósrautt · 6 rautt   */

/* ---- ThRIR NAESTU LEIKIR A SPJALDINU (1.8.2026) ----
   Adur var EIN flis: leikur yfirstandandi umferdar. Notandinn vill sja
   thyngdina framundan a spjaldinu sjalfu, ekki bara i FFDR-toflunni.

   LEIKIR ERU PER UMFERD, EKKI PER LEIK: umferd getur verid AUD (- ) eda
   TVOFOLD (⧫). Thess vegna er inntakid fylking af umferdum, hver med sinni
   fylkingu af leikjum — annars myndi tvofold umferd yta thridju umferdinni
   ut og spjaldid syna "3 naestu leiki" sem eru i raun 2 umferdir.

   LITURINN ER ALGILT ThREP (TIER_BG), sami kvardi sem taflan og
   roterings-spjaldid nota. ENGIN flis ber toluna synilega — fyrsta flisin
   bar hana adur en notandinn bad um ad hun faeri (6.8.2026): liturinn
   segir threpid og nakvaema talan er i tooltip a hverri flis. FixChip
   (skiptaglugginn) heldur SINNI tolu — annad yfirbord, onnur beidni.    */
function FixStrip({ gws, teamById, diffOf, teamId, pos }) {
  const cells = (gws || []).slice(0, 3);
  if (!cells.length) return <div style={S.noFix}>—</div>;
  return (
    <div style={S.fixStrip}>
      {cells.map((fxs, i) => {
        if (!fxs?.length)
          return <div key={i} style={{ ...S.fixMini, ...S.fixBlank }}
            title={"Blank gameweek — he does not play and scores 0"}>–</div>;
        /* tvofold umferd: LETTASTI leikurinn raedur litnum (thad er sa sem
           thu myndir stilla upp fyrir), badir i tooltip. */
        let best = null, bestFx = null;
        for (const f of fxs) {
          const d = diffOf ? diffOf(teamId, f, pos) : null;
          if (d != null && (best == null || d < best)) { best = d; bestFx = f; }
        }
        const use = bestFx || fxs[0];
        /* `d` GETUR VERID TOM OG ThAD ER NYTT (25.8.2026).
           `makeFixDifficulty` skiladi adur `NaN` thegar inntok vantadi;
           `NaN != null` er TRUE, svo `best` vard NaN og tooltip-id bar
           ordrett "FFDR NaN" — thogul rong tala. Fallid skilar nu `null`
           (V11), svo greinin fer i `use.fdr`, sem er `undefined` a leik
           an FDR-svids — og tha kastadi `d.toFixed(2)`.
           Bædi astondin eru SAMA vandamalid: engin FFDR-tala er til.
           Hun er thvi PROFUD sem tala, ekki sem "ekki null", og reiturinn
           segir "—" i stad thess ad ljuga eda hrynja (CLAUDE.md 8:
           NULL ER EKKI NULL, og omæld tala fær ekki reit).            */
        const dRaw = best != null ? best : use.fdr;
        const d = Number.isFinite(dRaw) ? dRaw : null;
        const t = tierOf(d);
        const opp = teamById[use.opp]?.short || "?";
        const label = fxs.map(f =>
          `${teamById[f.opp]?.short || "?"}${f.home ? "" : " (" + "away" + ")"}`).join(" + ");
        return (
          <div key={i} style={{ ...S.fixMini, background:TIER_BG[t], color:TIER_FG[t] }}
            title={`${label}\nFFDR ${d == null ? "—" : d.toFixed(2)} — ${TIER_NAME[t]}`
              + `\nFDR ${use.fdr ?? "—"}${fxs.length > 1 ? "\n" + "DOUBLE GAMEWEEK" : ""}`}>
            {oppLabel(opp, use.home)}{fxs.length > 1 ? "⧫" : ""}
          </div>
        );
      })}
    </div>
  );
}

/* `FixChip` VAR HER OG ER FARID (11.8.2026): fullbuinn leikja-flisi med
   threpa-lit, tooltip og FFDR-tolu sem var ALDREI TEIKNADUR (0 tilvik af
   `<FixChip`). Spjoldin nota `FixStrip` og tillogurnar `S.recFixChip`.
   Stilarnir `S.fixChip` og `S.fixNum` foru med honum — their voru hans og
   engra annarra.                                                        */

/* ---- LEIKIR UMFERÐARINNAR ----
   Hópað eftir DEGI eins og opinbera FPL-síðan: dagsetning EINU SINNI sem
   haus, leikir dagsins undir, tíminn MIÐJAÐUR milli liðanna.
   FFDR er EKKI hér — hann er í sinni eigin töflu, svo þetta er hreinn
   leikjalisti án tvítekningar.                                             */
function GwFixtureList({ gw, fixtures, teamById, weatherByFx, travelByFx, liveByFx, nameOf, diffOf, onPick }) {
  const [open, setOpen] = useState(null);
  const list = (fixtures || []).filter(f => f.event === gw)
    .sort((a, b) => String(a.kickoff_time || "~").localeCompare(String(b.kickoff_time || "~")));
  const DAYS = ["Sunday","Monday","Tuesday","Wednesday",
                "Thursday","Friday","Saturday"];
  const MON  = ["Jan","Feb","March","April","May","June",
                "July","August","Sep","Oct","Nov","Dec"];
  const dayLbl = iso => {
    const d = asDate(iso);
    if (!d) return "Not scheduled";
    return `${DAYS[d.getDay()]} ${d.getDate()}. ${MON[d.getMonth()]}`;
  };
  const timeLbl = iso => {
    const d = asDate(iso);
    if (!d) return "—";
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };
  const groups = [];
  for (const f of list) {
    const k = f.kickoff_time ? f.kickoff_time.slice(0, 10) : "tbc";
    let g = groups.find(x => x.key === k);
    if (!g) groups.push(g = { key: k, label: dayLbl(f.kickoff_time), items: [] });
    g.items.push(f);
  }
  if (!list.length) return (
    <div className="gf-wrap" style={S.gfWrap}>
      <div style={S.gfHead}>{"Fixtures GW"}{gw}</div>
      <div style={S.gfEmpty}>{"No fixtures listed — blank gameweek."}</div>
    </div>
  );
  return (
    <div className="gf-wrap" style={S.gfWrap}>
      <div style={S.gfHead}>{"Fixtures GW"}{gw} <span style={S.gfCount}>{list.length} {"fixtures"}</span></div>
      {groups.map(g => (
        <div key={g.key} style={S.gfDay}>
          <div style={S.gfDayLbl}>{g.label}</div>
          {g.items.map(f => {
            const H = teamById[f.team_h], A = teamById[f.team_a];
            const w = weatherByFx?.[f.id];
            const L = liveByFx?.[f.id];
            const live = L?.started && !L?.finished;
            const done = L?.finished || f.finished;
            const hs = L?.h?.score ?? f.team_h_score, as = L?.a?.score ?? f.team_a_score;
            /* ============================================================
               MORK OG ASSIST ERU TVAER LINUR, EKKI EIN (25.8.2026)

               Notandinn: "hérna skulum vid syna assist undir markinu,
               thannig ad sjaist hver gaf assist fyrir hvada mark."

               ThAD SEM ER GERT: assistin eru nu a EIGIN LINU undir
               morkunum i stad thess ad vera limd i sama streng
               ("⚽ Clarke · ⚽ Emersonn · ↗ Lukic · ↗ Enciso"), svo
               morkin lesast sem mork og assistin sem assist.

               ThAD SEM ER **EKKI** GERT, OG HVERS VEGNA: PORUNIN
               mark<->assist ER EKKI I NEINNI HEIMILD SEM VID HOFUM.
               Maelt 25.8.2026: `live/gw{n}.json` ber per-leikmanns TOLUR
               (`goals_scored`, `assists`) og `explain` ber stiga-lidun per
               leik — hvorugt segir HVADA assist tilheyrir HVADA marki.
               `last_gw.json` ber adeins lids-tolur (skot, horn, spjold).
               Ad giska a porunina — t.d. para i rod — vaeri uppspuni sem
               les eins og gogn, svo hun er EKKI birt. Textinn segir thad
               berum ordum i stad thess ad thegja um thad.

               FANTASY-ASSIST ER ThEGAR ThAD SEM ER SYNT: `assists` fra FPL
               ER fantasy-skilgreiningin (thess vegna eru BSD-assist 29%
               faerri, CLAUDE.md 6). Tzolis-daemid sem notandinn nefndi er
               nakvaemlega thetta svid — thad er thegar inni.            */
            const goalsOf = side => (L?.[side]?.goals || [])
              .map(id => `⚽ ${nameOf ? nameOf(id) : id}`);
            const assistsOf = side => (L?.[side]?.assists || [])
              .map(id => `↗ ${nameOf ? nameOf(id) : id}`);
            const scorers = side => [...goalsOf(side), ...assistsOf(side)];
            const hasDetail = live || (done && (scorers("h").length || scorers("a").length));
            const mid = (done || live) && hs != null ? `${hs}–${as}` : timeLbl(f.kickoff_time);
            // FFDR-pilla per lið — LITURINN situr á pillunni sjálfri
            // (nafn + merki), ekki á blokk sem þenur sig yfir hálfa röðina.
            const pill = (team, home, right) => {
              const oppId = home ? f.team_a : f.team_h;
              const fdr = home ? (f.team_h_difficulty ?? 3) : (f.team_a_difficulty ?? 3);
              const d = diffOf ? diffOf(team === H ? f.team_h : f.team_a,
                { opp: oppId, home, fdr, kickoff: f.kickoff_time }, 2) : null;
              const t = d != null ? tierOf(d) : null;
              return (
                <button style={{ ...S.gfPill, ...(t != null ? { background:TIER_BG[t], color:TIER_FG[t] } : {}) }}
                  onClick={() => onPick && onPick(home ? f.team_h : f.team_a)}
                  title={`${team?.name || "?"} — ${home ? "home" : "away"}${d != null ? ` · FFDR ${d}` : ""}`}>
                  {right ? <><Crest team={team} size={13} /><span style={S.gfShort}>{oppLabel(team?.short, home)}</span></>
                         : <><span style={S.gfShort}>{oppLabel(team?.short, home)}</span><Crest team={team} size={13} /></>}
                </button>
              );
            };
            return (
              <div key={f.id} style={S.gfMatch}>
                <span style={S.gfCellL}>{pill(H, true, false)}</span>
                <button style={{ ...S.gfMid, ...(live ? S.gfMidLive : {}), ...(hasDetail ? S.gfMidOpen : {}) }}
                  onClick={() => hasDetail && setOpen(open === f.id ? null : f.id)}
                  title={hasDetail ? "Click for goalscorers"
                        : [
                            w?.temp_c != null ? `${Math.round(w.temp_c)}°C${w.precip_mm >= 0.5 ? " · rain" : ""}` : null,
                            travelByFx?.[f.id]?.km
                              ? (travelByFx[f.id].is_long_trip
                                  ? interp("✈ {0} travels {1} km (long trip)", [A?.short || "away", travelByFx[f.id].km])
                                  : interp("✈ {0} travels {1} km", [A?.short || "away", travelByFx[f.id].km]))
                              : null,
                          ].filter(Boolean).join(" · ") || undefined}>
                  {mid}
                </button>
                <span style={S.gfCellR}>{pill(A, false, true)}</span>
                {open === f.id && hasDetail && (
                  <div style={S.gfDetail}>
                    {[["h", H?.short], ["a", A?.short]].map(([sd, sh]) => {
                      const gs = goalsOf(sd), as_ = assistsOf(sd);
                      if (!gs.length && !as_.length) return null;
                      return (
                        <div key={sd}>
                          <div><b>{sh}</b> {gs.length ? gs.join(" · ") : "—"}</div>
                          {as_.length > 0 && (
                            <div style={S.gfAssistLine}
                              title={"Fantasy assists (FPL's own definition — wider than the official one). FPL publishes goals and assists as separate per-player counts and never says which assist belongs to which goal, so they are listed rather than paired."}>
                              {as_.join(" · ")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   FFDR-TAFLA — lið × umferðir, sér fyrir hverja stöðu.
   Þetta er plönunar-yfirsýnin: hvaða lið eiga léttustu leikina á
   næstunni, fyrir þá stöðu sem þú ert að versla í.
   Raðað eftir MEÐAL-FFDR yfir valið svið (léttast fyrst).
   ============================================================ */

function PlayerCard({ s, p, team, teamById, fx, bench, captain, vice, csFor,
  dc, gwNow, sellTenths_, diffOf, isPlanned, isSellHint,
  onInfo, onTransfer, onRotation, onCardClick, swapSel, confirmed, fxNext3, seasonStarted, seasonGames, clubPlayed, ep, cumLabel, dragId, setDragId, onDropPlayer }) {
  if (!p) return null;
  const isCap = p.id === captain, isVice = p.id === vice;
  const isDef = p.element_type <= 2;
  const dragging = dragId === p.id;
  const csObj = isDef ? csFor(p.team, fx) : null;
  const csColor = csObj?.cs == null ? C.text3 : csObj.cs >= 40 ? C.green : csObj.cs >= 25 ? C.amber : C.red;
  const av = availOf(p);
  const ban = banRisk(p, gwNow, seasonStarted);
  /* NEFNARINN ER LEIKIR FELAGSINS, EKKI LOKNAR UMFERDIR — OG ThESSI
     KALLSTADUR GLEYMDIST I FYRSTU UTGAFU (24.8.2026).
     Hinir tveir (`playedByClub[...] ?? seasonGames`) voru lagadir strax en
     ThESSI — spjaldid a VELLINUM — helt gamla nefnaranum, svo notandinn sa
     afram "Started 1 of 38 matches in 2025/26 — rotation risk" a NIU
     spjoldum. `initial-squad.mjs` fann thad ordrett.
     LAERDOMURINN: lagfaering sem snertir tvo af thremur kallstodum er ekki
     lagfaering heldur osamkvaemni — og hun er VERRI en engin, thvi nu segja
     tveir stadir eitt og einn annad um sama mann.                        */
  const rot = rotationRisk(p, clubPlayed ?? seasonGames);
  return (
    <div
      draggable
      onDragStart={e => { setDragId(p.id); e.dataTransfer.effectAllowed = "move"; }}
      onDragEnd={() => setDragId(null)}
      onDragOver={e => { if (dragId && dragId !== p.id) e.preventDefault(); }}
      onDrop={e => { e.preventDefault(); if (dragId && dragId !== p.id) onDropPlayer(dragId); setDragId(null); }}
      onClick={() => !dragging && onCardClick && onCardClick()}
      style={{
        ...S.pCard, ...(bench ? S.pCardBench : {}),
        borderTop: `3px solid ${POS_COLOR[p.element_type]}`,
        /* `isSellHint` DOFNADI SPJALDID ADUR (`opacity: 0.62`) OG ThAD VAR
           ORSOK TVEGGJA KAERA (20.8.2026): „thad eru bara 2 kort sem eru
           lighter — ekki 4" og „Somu mennirnir hanga gegnsaeir eda grair,
           thegar eg set tha a bekk i gameweek 2".
           `recommend.js:330` er `sorted.slice(0, 2)` — ALLTAF nakvaemlega
           tveir menn, og hun les EKKI umferdina sem er skodud, svo doufnunin
           gat hvorki verid 4 ne fylgt bekkjar-valinu. Hun var auk thess
           sterkasta doufnunin a vellinum og bar ENGA skyringu, svo hun las
           eins og bekkur og bekkjar-skyringin (13 i RGB, sja `pCardBench`)
           drukknadi undir henni.
           Tillagan sjalf er obreytt — hun er nu MERKI i `sigRow` (`sigSell`)
           eins og hvert annad merki a spjaldinu. Adeins DRAG heldur
           doufnun, og hun er sjalfskyrd (hun stendur i 200 ms).         */
        opacity: dragging ? 0.4 : 1,
        /* HRINGUR UM SPJALDID thegar madurinn er EKKI til leiks. Merkid eitt
           er 15px og drukknar innan um myndina; hringurinn sest a einu
           augabragdi yfir allan vollinn. `inset` svo hann breyti ekki
           uppsetningu (spjoldin eru i flæði, sja kafla 8 i CLAUDE.md).    */
        /* VALRAMMINN VAR `outline` OG LAK NIDUR I NAESTU ROD.
           `outline` teiknast UTAN vid kassann og telur EKKI i uppsetningu:
           2px + 1px offset = 3px sem liggja ofan a thvi sem er fyrir nedan.
           Radabilid a vellinum er 1-5 px (maelt: rod 1 -> rod 2 er 1 px),
           svo rammin skarst vid naestu rod. Notandinn sa thetta; hvorki
           bounding-box-maeling ne prof gatu sed thad, einmitt AF ThVI ad
           outline er utan uppsetningar.
           Nu ERU ALLIR HRINGIR `inset` — eins og aettingi theirra fyrir ofan
           (av.isRisk) sem var thegar rettur og bar skyringuna. Their eru
           lagdir saman i EINN boxShadow med olikri dypt (2px / 4px) svo
           spjald sem er BAEDI i haettu OG planad syni bada; spread-adur
           seinni skuggi hefdi thurrkad thann fyrri ut (sbr. 6r).        */
        boxShadow: [
          av.isRisk ? `inset 0 0 0 2px ${av.solid || "#d92d3c"}${av.chance === 0 ? "" : "99"}` : "",
          swapSel === p.id ? `inset 0 0 0 ${av.isRisk ? 4 : 2}px ${C.purple}`
            : isPlanned ? `inset 0 0 0 ${av.isRisk ? 4 : 2}px ${C.green}` : "",
        ].filter(Boolean).join(", ") || undefined,
      }}
      title={[
        /* BEKKJAR-SETNINGIN LIFIR HER ThOTT ORDID SE FARID (25.8.2026).
           Sama urlausn og verdspar-malsgreinin 20.8. og Pick-best-XI
           fyrirvarinn 21.8.: synilega linan for, EFNID for i `title` thar
           sem spurningin vaknar. Grátt spjald an skyringar er merki sem
           enginn getur flett upp.                                      */
        bench ? "On your bench for this gameweek — he only scores if a starter does not play (or with Bench Boost)" : "",
        swapSel === p.id ? "Selected — click another to swap"
                         : "Click to swap with another player",
      ].filter(Boolean).join("\n")}>
      {/* IKON — sér aðgerðir. Smellur á spjaldið er SKIPTI. */}
      {/* ============================================================
          VINSTRA MEGIN: C/V + i + ↻ (+ meidsla-merki) · HAEGRA MEGIN: ⇄
          (beidni notandans 20.8.2026)
          ============================================================
          ↻ (FFDR-samanburdur) var haegra megin med ⇄. Nu er ADEINS
          skipti-ikonid haegra megin og allt sem er UPPLYSING er vinstra
          megin — ein hlid spyr "hvad er hann?", onnur "skipta honum ut?".

          OG MAGIC-TALAN A `availBadge` FOR MED (`left: isCap ? 38 : 21`).
          Hun var handreiknud ur ThVI HVE MORG ikon voru i vinstri rodinni
          (2 + 15 = 17 -> 21; tvo ikon -> 34 -> 38). Thridja ikonid gerdi
          hana ranga i BADUM greinum, og ThOGULT: merkid hefdi legid ofan a
          ↻ eda C-inu i stad thess ad birtast vid hlid theirra — nakvaemlega
          gamla gildran sem athugasemdin fra 7.8.2026 nefnir (C undir ⇄).
          Merkid er thvi FLUTT I FLAEDID, eins og `bandFlow` var flutt af
          somu astaedu: i flex-rod getur thad ekki legid undir neinu og
          engin tala tharf ad fylgja fjolda ikona.
          KLIPPIST ThAD EKKI A 62px SPJALDI? Nei — `pcIconsL` hefur
          `flexWrap:"wrap"` og `maxWidth`, svo rodin BROTNAR i tvaer linur
          i stad thess ad klippast (sama regla og FixStrip: WRAP, EKKI
          CLIP — sja `pFix` i appStyles.js).                             */}
      <div style={S.pcIconsL}>
        {/* FYRIRLIDA-MERKID ER FYRST I RODINNI (beidni notandans 25.8.2026).
            SAGAN I TVEIMUR SKREFUM, OG BADAR VILLURNAR VORU STADSETNING:
            7.8.2026 sat merkid `position:absolute top:4 right:4` — NAKVAEMLEGA
            undir ⇄/↻-ikonunum (zIndex 2 a moti 3), svo C-id a Haaland var
            OSYNILEGT. Thad var flutt i flex-rodina vinstra megin og gat tha
            ekki legid undir neinu. EN ThAD VAR SETT AFTAST, a eftir i, ↻ og
            meidsla-merkinu, og `pcIconsL` er `flexWrap:"wrap"` a spjaldi sem
            er clamp(62px, 17.5%, 100px): fjorda atridid BROTNAR I NAESTU LINU
            og lendir tha OFAN A ANDLITSMYNDINNI, mitt a spjaldinu.
            Notandinn ordadi thad thannig: „C/V hylja andlitid a leikmanninum".
            Fyrsta sætid i flex-rodinni ER efsta vinstra hornid — thad er
            eina sætid sem getur ALDREI brotnad nidur, hvad sem hin thrju
            atridin gera.
            ENGIN ABSOLUTE-STADSETNING AFTUR, OG ENGIN HANDREIKNUD TALA:
            `left: isCap ? 38 : 21` var akkurat lausnin sem var felld 20.8.
            (hun var reiknud ur fjolda ikona og vard rong THOGULT um leid og
            thridja ikonid kom). Rodun i flaedi hefur enga tolu ad reka.   */}
        {isCap && <span style={{ ...S.bandFlow, background:"#ffd23f", color:"#4a3800" }}
          title={"Captain — double points"}>C</span>}
        {isVice && <span style={{ ...S.bandFlow, background:"#c9c9d0", color:"#33333a" }}
          title={"Vice-captain — takes over if the captain does not play"}>V</span>}
        <button style={S.pcIcon} title={"Information"}
          onClick={e => { e.stopPropagation(); onInfo && onInfo(); }}>i</button>
        {/* FFDR-SAMANBURDUR — hver kemur inn fyrir hann i ERFIDU umferdunum.
            Adskilid frá ⇄ (sem er skipti) og frá i (sem er upplysingar).   */}
        <button style={{ ...S.pcIcon, ...S.pcIconRot }}
          title={"FFDR comparison — find a player with easy gameweeks where his are hard"}
          onClick={e => { e.stopPropagation(); onRotation && onRotation(); }}>↻</button>
        {/* MEIDSLA-/BANN-MERKID — sterkasta upplysingin sem EKKI er C/V.   */}
        {av.isRisk && (
          <span style={{ ...S.availFlow,
                         background:av.solid || av.bg,
                         color:av.solid ? "#fff" : av.color }}
            title={`${av.label}${av.chance != null ? interp(" — {0}% chance", [av.chance]) : ""}${av.news ? `\n${av.news}` : ""}`}>
            {av.short}{av.chance != null && av.chance > 0 ? av.chance : ""}
          </span>
        )}
      </div>
      <div style={S.pcIcons}>
        <button style={{ ...S.pcIcon, ...S.pcIconSwap }} title={"Transfer out — opens search"}
          onClick={e => { e.stopPropagation(); onTransfer && onTransfer(); }}>⇄</button>
      </div>
      {/* STYRKING A GREYINGUNNI, EKKI MERKID (sja `pCardBench`): myndin
          missir lit og textinn dofnar i lit — hvorugt er `opacity` og
          hvorugt ber fullyrdinguna. Maelda merkid er bakgrunnurinn.     */}
      <div style={{ ...S.pPortrait, ...(bench ? S.pPortraitBench : {}) }}
        title={interp("{0}{1}NOTE: the FPL photo can show an OLD club after a transfer. The crest is right.", [team?.name || "?", "\n"])}>
        <PlayerImg code={p.code} short={team?.short} size={38} />
        {/* Merkið er ÓTVÍRÆÐA félags-vísbendingin — stærra og með hvítum
            baug svo það lesist yfir myndinni, sem getur verið úrelt.       */}
        <Crest team={team} size={18} style={S.pCrest} />
      </div>
      <div style={{ ...S.pName, ...(bench ? S.pNameBench : {}) }}>{p.web_name}</div>
      <div style={{ ...S.pPrice, ...(bench ? S.pPriceBench : {}) }}>
        £{(p.now_cost/10).toFixed(1)}
        {sellTenths_ != null && sellTenths_ < p.now_cost &&
          <span style={S.pSell} title={interp("Sell price under the 50% rule: £{0}", [(sellTenths_/10).toFixed(1)])}>
            →{(sellTenths_/10).toFixed(1)}
          </span>}
      </div>
      {/* ALGILT ÞREP, EKKI afstætt innan liðsins. MÆLT 28.7.2026 á 28.355
          byrjunarliðs-umferðum (tests/ffdr-player-points.mjs kafli E):
            fylgni við stig leikmanns   ALGILT   AFSTÆTT
              DEF                       −0,267   −0,190
              MID                       −0,195   −0,139
          Afstæða þrepið henti ~30% af merkinu. Það þvingaði HVERT lið til
          að nota alla sex litina, svo Arsenal fékk "rautt" á leik sem er
          algilt dökkgult og "ljósrautt" á leik sem er algilt GRÆNN — það
          var raunveruleg röng birting, ekki smekksatriði (Rice sýndi 2
          rauða leiki sem voru í raun léttir). Spjöld eru borin saman ÞVERT
          á lið, svo þau verða að vera á algildum kvarða — og þá er
          "Lið — FFDR"-taflan loks samræmd við spjöldin.                  */}
      <FixStrip gws={fxNext3} teamById={teamById} diffOf={diffOf}
        teamId={p.team} pos={p.element_type} />
      {/* EIN aðaltala */}
      {/* EIN aðaltala — VÆNT STIG leikmannsins.
          Áður var hér lið-xG fyrir sóknarmenn, en það er ÓÞARFI: FFDR-flísin
          inniheldur það þegar (eigin sóknarstyrkur vegur 0,60 í FFDR fyrir
          framherja). Vænt stig er leikmanns-stig og ekki tvítalning.        */}
      <div style={S.pMain}>
        <span style={S.pEp} title={"Expected points this gameweek (minutes + FFDR + form)"}>
          {ep == null ? "—" : `≈${ep.toFixed(1)}`}
        </span>
        {isDef && csObj?.cs != null && (
          <span style={{ ...S.pCsSmall, color:csColor }} title={"Clean-sheet probability — for the TEAM, not the player. He only gets the points if the team keeps a clean sheet AND he plays 60+ mins."}>
            CS {csObj.cs}%
          </span>
        )}
      </div>
      {/* Fínleg merkjaröð — aðeins það sem er athugavert */}
      {/* STADFEST BYRJUNARLID — sterkasta merkid a spjaldinu thegar thad er
          til, thvi thad er ekki spa heldur STADFESTING (lidin birtast 40-60
          min fyrir leik). "BEKKUR" er thad sem kostar mest ad missa.     */}
      {confirmed != null && (
        <div style={{ ...S.confBadge,
                      background: confirmed ? "#0a7a4a" : "#b3261e" }}
          title={confirmed ? "CONFIRMED in the starting XI (from the match lineup)"
                           : "CONFIRMED ON THE BENCH — he is NOT starting this match"}>
          {confirmed ? "STARTS" : "BENCHED"}
        </div>
      )}
      <div style={S.sigRow}>
        {/* BEKKUR-MERKID (`pcBench`, ordid „BENCH") ER FARID 25.8.2026 AD
            BEIDNI NOTANDANS og GREYINGIN BER MERKID EIN. Thad er sama
            akvordun og var snuid vid 20.8., svo hun stendur adeins vegna
            thess ad mekanisminn er annar: skugginn er nu OGEGNSAER og
            maelist 76 i RGB a BADUM bokgrunnum sem `bench` getur verid satt
            a (20.8. var hann 13 a odrum theirra). Full maeling og astaedan
            fyrir ogegnsæinu eru vid `pCardBench` i appStyles.js.
            SETNINGIN SEM ORDID BAR ER EKKI HORFIN — hun er `title` a
            spjaldinu sjalfu (sja `title` a ytri <div>), thvi spurningin
            „af hverju er hann grar?" vaknar a spjaldinu.                */}
        {isSellHint && <span style={S.sigSell}
          title={"Lowest-ranked player in your squad by the sell model — a suggestion, not a verdict"}>{"SELL?"}</span>}
        {/* VERDFALL — FPL-s EIGIN TALA, OSKOLUD (25.8.2026).
            Vollurinn ber ADEINS thina eigin menn, svo „vara mig vid thegar
            leikmadur sem eg a er ad falla" er nakvaemlega thessi rod.
            Talan sjalf er OBREYTT fra FPL og hun er sott gegnum
            `priceChangeOf`, sem kallar `STAT_BY_KEY.price_change_percent
            .get()` — SAMA skilgreining og dalkurinn i Player stats. Ekkert
            afrit, engin skolun, ekkert formerki snuid.
            ThRoSKULDURINN ER UI-AFMORKUN (`PRICE_FALL_MARK = -50`, leidd af
            FPL-throskuldinum 100) og hun er rokstudd og MAELD i
            PlayerPanel.jsx. Laestur leikmadur fær ekkert merki: verdid
            getur ekki breyst medan lasinn er a.                        */}
        {(() => {
          const pc = priceChangeOf(p);
          if (!pc?.falling) return null;
          return (
            <span style={S.sigDrop}
              title={interp("FPL's own \"progress to price change\" figure is {0}% — he is at least halfway to a price FALL. The figure is FPL's, shown unscaled; 100 is where the change lands. This app does not predict the night it happens.", [pc.pct])}>
              {"↓"}{Math.abs(Math.round(pc.pct))}{"%"}
            </span>
          );
        })()}
        {/* FOST LEIKATRIDI ERU EKKI A SPJALDINU (fjarlaegt 29.7. ad bedni
            notanda). Spjaldid er clamp(62px, 17.5%, 100px) breitt og thessi
            ikon-rod (viti + aukaspyrna + horn) trod merkjarodina svo
            thad sem er ATHUGAVERT — DC, spjaldabann, roterings-haetta —
            drukknadi i henni. Rodunin er OBREYTT annars stadar:
            leikmannaglugginn ("Vitarod") og flipinn "Fost leikatridi".
            Ekki setja inn aftur an thess ad spjaldid stækki.              */}
        {isDef && dc && dc.defcon_opportunity >= 70 &&
          <span style={S.sigDc} title={interp("DefCon opportunity {0} — heavy defensive workload", [dc.defcon_opportunity])}>DC{dc.defcon_opportunity}</span>}
        {ban && ban.level === "high" &&
          <span style={S.sigCard} title={interp("{0} yellow cards — 1 from the {1} threshold ({2}-match ban)", [ban.y, ban.threshold, ban.matches])}>{ban.y}Y</span>}
        {rot && rot.level === "high" &&
          <span style={S.sigRot} title={rot.prevSeason && cumLabel
            ? interp("Started {0} of {1} matches in {2} — rotation risk", [rot.starts, rot.played, cumLabel])
            : interp("Started {0} of {1} matches — rotation risk", [rot.starts, rot.played])}>
            {/* MERKIMIDINN ER NAUDSYNLEGUR, EKKI SKRAUT: bert "24%" stod
                vid hlidina a "CS 44%" sem ER merkt, svo talan las sem
                onnur likindi. `st` = hlutfall leikja sem hann BYRJADI.
                Tooltip-id ber fulla setningu; spjaldid er 62-100 px svo
                heilt ord kemst ekki fyrir.                              */}
            {"st"}{rot.pct}%</span>}
      </div>
    </div>
  );
}

function RecCard({ r, team, teamById, dc, elo, csFor, diffOf, range, onAdd }) {
  const { p, fxs } = r;
  const isDef = p.element_type <= 2;
  /* EITT MENGI FYRIR BADA — TEIKNADA REITI OG CS-MEDALTALID.
     Adur teiknadi strimillinn `fxs.slice(0, range || 6)` en CS-vaentingin
     lagdi saman ALLA `fxs`. I dag er thad OSYNILEGT: leikjaskra 2026/27
     hefur 0 audar og 0 tvofaldar umferdir, svo mengin eru eins. Vid
     FYRSTU tvofoldu umferd hefdi kortid synt `range` reiti en talan
     verid medaltal af FLEIRUM — tala og mynd um sama hlut, ekki eins.  */
  const shown = fxs.slice(0, range || 6);
  return (
    <div style={S.recCard} onClick={onAdd}>
      <div style={S.recTop}>
        <div style={S.recPortrait}>
          <PlayerImg code={p.code} short={team?.short} size={32} />
          <Crest team={team} size={13} style={S.sCrest} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={S.recName}>{p.web_name}</div>
          <div style={S.recMeta}>{team?.short} · £{(p.now_cost/10).toFixed(1)} · ep {p.ep_next}</div>
        </div>
        <div style={S.recScore}>{r.score}</div>
      </div>
      <div style={S.recFix}>
        {shown.map((f,i) => {
          const d = diffOf ? (diffOf(p.team, f, p.element_type) ?? f.fdr) : f.fdr;
          /* ALGILT — tillögur bera leikmenn ÞVERT á lið, svo afstætt þrep
             innan liðs væri hér beinlínis misvísandi (sjá PlayerCard).  */
          const t = tierOf(d);
          const bg = TIER_BG[t], fg = TIER_FG[t];
          return (
            <span key={i} style={{ ...S.recFixChip, background:bg, color:fg }}
              title={interp("combined difficulty {0} (FDR {1})", [d, f.fdr])}>
              {oppLabel(teamById[f.opp]?.short, f.home)}
            </span>
          );
        })}
      </div>
      {/* TOLUR SEM MERKTIR REITIR.
          AÐUR: allt steypt saman i einn streng an bila —
          "£5.5 49% · min 89% 44%FFDR 2.38CS-vaenting 30% · DC 62 · elo 1971".
          Talan og heiti hennar limdust saman og enginn gat lesid hvad var hvad.
          Nu er hver tala sinn reitur med SKYRU heiti og tooltip.            */}
      <div style={S.recExtra}>
        {(() => {
          const chips = [];
          if (r.ffdrAvg != null) chips.push(["FFDR", r.ffdrAvg,
            "Average FFDR over the range (absolute scale) — lower is easier"]);
          if (isDef) {
            const vals = shown.map(f => csFor(p.team, f).cs).filter(v => Number.isFinite(v));
            /* VILLA SEM VAR: "|| 0" taldi vantandi CS sem NULL og dro
               medaltalid nidur — Raya syndi 9% thegar laegsta mogulega er 15%.
               Vantandi gildum er SLEPPT, og "—" ef ekkert er til.           */
            chips.push(["CS expectation", vals.length
              ? `${Math.round(vals.reduce((a, v) => a + v, 0) / vals.length)}%` : "—",
              "Average clean-sheet probability over the range — for the TEAM. The player only gets the points if he plays 60+ mins."]);
            /* `dc?.defcon_opportunity` ER NU `null` (lagfaering 20.8.2026 —
               adur tilbuid 57 a ollum 20 lidum), og `dc &&` profar UMBUDIRNAR
               en ekki GILDID: rodin var thvi „DC" med ekkert eftir.
               NULL ER EKKI NULL og thad birtist sem gratt „—" (kafli 8);
               „DC" eitt er sama tvibendan, bara hljodlatari.            */
            if (dc) chips.push(["DC", dc.defcon_opportunity ?? "—",
              "The team's DefCon opportunity — higher = more defensive actions on offer"]);
          }
          if (elo) chips.push(["Elo", Math.round(elo.elo), "The team's ClubElo strength"]);
          return chips.map(([k, v, tip]) => (
            <span key={k} style={S.recChip} title={tip}>
              <span style={S.recChipK}>{k}</span>
              <span style={S.recChipV}>{v}</span>
            </span>
          ));
        })()}
      </div>
      {/* HVERS VEGNA — hvad rekur skorid. Minutur og verd rada; leikir ~5%. */}
      {r.why && <div style={S.recWhy} title={"The biggest factors behind the score"}>{r.why}</div>}
    </div>
  );
}

/* ================= Stílar ================= */
