import React, { useState, useEffect, useMemo, useCallback } from "react";
import { interp } from "./interp.js";
import Pitch from "./Pitch.jsx";
import GwReport from "./GwReport.jsx";
import { PlayerHeadline, SeasonTable, PriceEditor } from "./PlayerPanel.jsx";
import SetPieces from "./SetPieces.jsx";
import { SetPieceIcon } from "./Icons.jsx";
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
import Leaderboard from "./Leaderboard.jsx";
import { clamp, sellTenths, lookupPos, lookupMeasured,
  tierOf, TIER_BG, TIER_FG, TIER_NAME, TIER_COUNT, greenRuns,
  makeFixDifficulty, computeTransferCost, expPointsFor, priceMovePrediction,
  cleanSheetProb, rankScore, eloStale, parseEntryId } from "./model.js";

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

const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const sans = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/* ---- Þema: ljóst, í stíl við fantasy.premierleague.com ---- */
const C = {
  page: "#f2f2f4", card: "#ffffff", cardAlt: "#fafafb",
  border: "#e0e0e4", borderStrong: "#c9c9d0",
  text: "#1d1d20", text2: "#61616b", text3: "#8b8b95",
  purple: "#37003c", purple2: "#4a0050",
  green: "#00b96b", greenBg: "#e6f9f0",
  amber: "#c98a00", amberBg: "#fff6e0",
  red: "#d92d3c", redBg: "#fdecee",
  pitch: "#e9f5ee", pitchLine: "#ffffff",
};

/* ---- Lið-kóðar fyrir félagsmerki (notað ef 'code' vantar í teams.json) ---- */
const CREST_FALLBACK = {
  ARS:3, AVL:7, BOU:91, BRE:94, BHA:36, CHE:8, CRY:31, EVE:11, FUL:54,
  LIV:14, MCI:43, MUN:1, NEW:4, NFO:17, TOT:6, SUN:56, COV:9, HUL:88, IPS:40, LEE:2,
};
/* ---- Treyjulitir fyrir fallback-mynd ---- */
const KIT = {
  ARS:["#EF0107","#ffffff"], AVL:["#670E36","#95BFE5"], BOU:["#DA291C","#000000"],
  BRE:["#E30613","#ffffff"], BHA:["#0057B8","#ffffff"], CHE:["#034694","#ffffff"],
  COV:["#78D0F3","#ffffff"], CRY:["#1B458F","#C4122E"], EVE:["#003399","#ffffff"],
  FUL:["#ffffff","#000000"], HUL:["#F18A01","#000000"], IPS:["#0044A9","#ffffff"],
  LEE:["#ffffff","#1D428A"], LIV:["#C8102E","#ffffff"], MCI:["#6CABDD","#ffffff"],
  MUN:["#DA020E","#ffffff"], NEW:["#241F20","#ffffff"], NFO:["#DD0000","#ffffff"],
  TOT:["#ffffff","#132257"], SUN:["#EB172B","#ffffff"],
};
const POS_LABEL = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };   // universal, ekki islenskt
/* FPL explain-lyklar -> íslensk heiti (stiga-uppskipting) */
const EXPLAIN_IS = {
  get minutes() { return "Minutes"; }, get goals_scored() { return "Goals"; }, get assists() { return "Assists"; }, get clean_sheets() { return "Clean sheets"; },
  get goals_conceded() { return "Goals conceded"; }, get own_goals() { return "Own goals"; }, get penalties_saved() { return "Penalty saves"; },
  get penalties_missed() { return "Penalties missed"; }, get yellow_cards() { return "Yellow card"; }, get red_cards() { return "Red card"; },
  get saves() { return "Saves"; }, get bonus() { return "Bonus"; }, bps:"BPS", get defensive_contribution() { return "Defensive contribution"; },
};
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

/* ---- MÆLDAR VOGTÖLUR FYRIR STIGASPÁ ----
   FITTAÐ út-af-úrtaki á 2025/26 umferð-fyrir-umferð gögnum:
   19.448 sýni, lært á GW6-20, prófað á GW21-33. Markmið = stig næstu 5 umferðir.

   MAE á prófunarsetti:
     ekkert líkan (meðaltal)  6,70
     FPL-eigin xP             6,43
     mitt handvalda skor      5,00
     FITTAÐ                   3,66   <- 27% betra en handvalið

   RÍKJANDI ÞÁTTUR ER MÍNÚTUR (stöðluð áhrif +4,6 til +5,1 stig).
   FDR MÆLIST ~0 — það bætir engu við á NEINUM sjóndeildarhring (1 til 8
   umferðir, prófað). Það er samt haft með á sinni MÆLDU vog (lítilli),
   ekki handvalinni. Litakóðar á leikjum eru gagnlegt samhengi þótt
   forspárgildi þeirra sé lítið.                                            */
const FIT = {
  1: { bias:-1.05, mins5:11.776, pts5:-0.344, bps90:0.179, price:2.092, fdr:-0.597, xgi90:0 },
  2: { bias:-2.31, mins5:11.571, pts5: 0.142, bps90:0.006, price:2.350, fdr:-1.769, xgi90:4.218 },
  3: { bias:-1.62, mins5:14.578, pts5: 0.180, bps90:0.003, price:0.984, fdr:-0.534, xgi90:2.403 },
  4: { bias:-1.98, mins5:13.869, pts5: 0.519, bps90:0.009, price:0.698, fdr:-0.881, xgi90:1.919 },
};
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
const BREAK_MIN_DAYS = 12;
function intlBreaks(fixtures) {
  const by = {};
  for (const f of fixtures || []) {
    if (f.event == null || !f.kickoff_time) continue;
    const t = Date.parse(f.kickoff_time);
    if (!Number.isFinite(t)) continue;
    const a = by[f.event] || (by[f.event] = { min: t, max: t });
    if (t < a.min) a.min = t; if (t > a.max) a.max = t;
  }
  const out = {};
  for (const k of Object.keys(by)) {
    const n = +k, next = by[n + 1];
    if (!next) continue;
    const days = (next.min - by[n].max) / 864e5;
    if (days >= BREAK_MIN_DAYS) out[n] = Math.round(days);
  }
  return out;
}

/* ---- Chips ----
   AÐEINS lýsigögn hér. REGLURNAR (hvenær má nota, hversu oft) koma úr
   FPL-API-inu (data/chips.json) svo þær sjálf-uppfærast ef FPL breytir þeim.
   FPL 2026/27: tvö sett — eitt fyrir GW1-19, annað fyrir GW20-38.
   Wildcard og Free Hit byrja í GW2 (skipti eru þegar ótakmörkuð í GW1).   */
const CHIPS = {
  wildcard: { label:"Wildcard",       short:"WC", color:"#d92d3c", icon:"♻",  get desc() { return "Unlimited transfers, no hit"; } },
  freehit:  { label:"Free Hit",       short:"FH", color:"#2563eb", icon:"⚡", get desc() { return "Squad for one gameweek, then reverts"; } },
  bboost:   { label:"Bench Boost",    short:"BB", color:"#00b96b", icon:"⬆",  get desc() { return "The bench scores too (all 15)"; } },
  "3xc":    { label:"Triple Captain", short:"TC", color:"#c98a00", icon:"3×", get desc() { return "Captain ×3 instead of ×2"; } },
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
const photoUrl = code => code ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png` : null;
/* Andstæðingur: HEIMALEIKUR = STÓRIR STAFIR, ÚTILEIKUR = litlir stafir.
   Það gerir "(a)"-merkið óþarft og heldur flísunum þéttum.               */
const oppLabel = (short, home) => !short ? "?" : (home ? short.toUpperCase() : short.toLowerCase());

const crestUrl = code => code ? `https://resources.premierleague.com/premierleague/badges/50/t${code}.png` : null;
const fmtDate = iso => {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return `${days[d.getDay()]} ${d.getDate()}.${d.getMonth()+1}. ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};
const fmtClock = iso => {
  if (!iso) return "—";
  const d = new Date(iso), now = new Date();
  const mins = Math.round((now - d) / 60000);
  if (mins < 2) return "now";
  if (mins < 60) return interp("{0} min ago", [mins]);
  const h = Math.round(mins / 60);
  return h < 24 ? interp("{0}h ago", [h]) : `${d.getDate()}.${d.getMonth()+1}.`;
};
const fmtDeadline = iso => {
  if (!iso) return "—";
  const d = new Date(iso);
  return interp("{0}/{1} at {2}:{3}", [d.getDate(), d.getMonth()+1,
    String(d.getHours()).padStart(2,"0"), String(d.getMinutes()).padStart(2,"0")]);
};
/* ---- VISTUN ----
   ATH: window.storage er AÐEINS til í Claude-artifact-sandkassa. Á Netlify
   er það undefined, og þögult try/catch faldi það — svo allt ástand hvarf
   við hverja endurhleðslu. localStorage er rétta lausnin fyrir vafra.
   Röð: localStorage -> window.storage -> minni (og VIÐVÖRUN, ekki þögn).  */
let _memStore = {};
let _storeMode = null;

function storageMode() {
  if (_storeMode) return _storeMode;
  try {
    const k = "__fpl_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    _storeMode = "local";
  } catch {
    _storeMode = (typeof window !== "undefined" && window.storage) ? "artifact" : "memory";
    if (_storeMode === "memory")
      console.warn("FPL: hvorki localStorage né window.storage í boði — ástand vistast EKKI.");
  }
  return _storeMode;
}

async function saveState(key, val) {
  const mode = storageMode();
  const s = JSON.stringify(val);
  try {
    if (mode === "local") window.localStorage.setItem(key, s);
    else if (mode === "artifact") await window.storage.set(key, s);
    else _memStore[key] = s;
    return true;
  } catch (e) {
    console.warn(`FPL: vistun brást (${mode}):`, e?.message || e);
    _memStore[key] = s;
    return false;
  }
}

async function loadState(key) {
  const mode = storageMode();
  try {
    let raw = null;
    if (mode === "local") raw = window.localStorage.getItem(key);
    else if (mode === "artifact") { const r = await window.storage.get(key); raw = r ? r.value : null; }
    else raw = _memStore[key] ?? null;
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn(`FPL: lestur brást (${mode}):`, e?.message || e);
    return null;
  }
}

/* ---- Tiltækileiki, bann-hætta, fastaleikir, skiptingar-hætta ----
   status: a=til leiks, d=vafi, i=meiddur, s=Í BANNI, u=ótiltækur, n=ekki í hóp
   Spjaldabann (Premier League): 5 gul (fyrir umf. 19) = 1 leikur,
   10 gul (fyrir umf. 32) = 2 leikir, 15 gul = 3 leikir.            */
/* SOLID litir bættir vid 29.7.: pale bakgrunnur + dokkur texti i 8,5px
   var nær OSYNILEGUR a vellinum — notandinn sa ekki ad Garner var meiddur.
   `bg`/`color` halda ser fyrir LISTA og glugga (thar er hvitur grunnur og
   fint merki rett), en SPJALDID a vellinum notar `solid` + hvitan texta.  */
const AVAIL = {
  a: { get label() { return "Available"; },    short:"",   color:null,      bg:null,      solid:null },
  d: { get label() { return "Doubt"; },         short:"?",  color:"#8a5f00", bg:"#fff6e0", solid:"#e0a100" },
  i: { get label() { return "Injured"; },      short:"✚",  color:"#a01f2b", bg:"#fdecee", solid:"#d92d3c" },
  s: { get label() { return "Suspended"; },      short:"⛔", color:"#5b21b6", bg:"#f1e9ff", solid:"#6d28d9" },
  u: { get label() { return "Unavailable"; },    short:"✕",  color:"#61616b", bg:"#eeeef1", solid:"#4b4b55" },
  n: { get label() { return "Not in squad"; },   short:"–",  color:"#61616b", bg:"#eeeef1", solid:"#4b4b55" },
};
function availOf(p) {
  const a = AVAIL[p?.status] || AVAIL.a;
  const chance = p?.chance_of_playing_next_round;
  return { ...a, chance, news: (p?.news || "").trim(), isRisk: p?.status && p.status !== "a" };
}
/* Hversu nálægt NÆSTA spjaldabanni?
   ATH: raunverulegt bann kemur úr FPL status ('s') — sjá availOf().
   Þetta mælir aðeins HÆTTU á komandi banni.
   Premier League: 5 gul (til umf. 19) = 1 leikur, 10 (til umf. 32) = 2, 15 = 3.

   MIKILVÆGT: gul spjöld NÚLLSTILLAST milli tímabila, en FPL sýnir tölur
   FYRRA tímabils í bootstrap-static þar til nýtt tímabil byrjar. Að reikna
   bann-hættu á þeim er villa — Luke Shaw var sýndur "9 gul" og "1 frá banni"
   þegar hann hefur núll. Þess vegna: EKKERT fyrr en umferð er lokin.        */
function banRisk(p, gwNow, seasonStarted) {
  if (!seasonStarted) return null;      // spjöld fyrra tímabils gilda ekki
  const y = p?.yellow_cards;
  if (y == null) return null;
  const TIERS = [[5, 19, 1], [10, 32, 2], [15, 38, 3]];
  // næsti þröskuldur sem er BÆÐI framundan og enn í gildi
  const tier = TIERS.find(([t, until]) => y < t && gwNow <= until);
  if (!tier) return { level: "none", y, toGo: null, threshold: null, matches: null };
  const [threshold, , matches] = tier;
  const toGo = threshold - y;
  return {
    level: toGo === 1 ? "high" : toGo === 2 ? "mid" : "low",
    toGo, y, threshold, matches,
  };
}
// Vítataki / fastaleikir (1 = fyrsti í röð)
function setPieceOf(p) {
  const pen = p?.penalties_order, ck = p?.corners_and_indirect_freekicks_order, fk = p?.direct_freekicks_order;
  if (pen == null && ck == null && fk == null) return null;
  return { pen, ck, fk, isPenTaker: pen === 1 };
}
// Skiptingar-hætta: byrjaði sjaldan þrátt fyrir að vera heill.
// FYRIR TÍMABIL sýnir FPL starts FYRRA tímabils (deilt með 38). Þegar
// tímabilið er hafið núllstillast tölurnar og rétt nefnari er fjöldi
// LOKINNA umferða — að deila með 38 gaf t.d. "8%" eftir 3 umferðir.
// Undir 3 loknum umferðum er úrtakið of lítið fyrir "high"-flagg.
function rotationRisk(p, seasonGames) {
  const st = p?.starts;
  if (st == null) return null;
  const prevSeason = !seasonGames;               // engin lokin umferð enn
  const played = prevSeason ? 38 : seasonGames;
  if (!played) return null;
  const pct = Math.round((st / played) * 100);
  const enough = prevSeason || seasonGames >= 3;
  const level = !enough ? "low" : pct >= 75 ? "safe" : pct >= 50 ? "mid" : "high";
  return { starts: st, played, pct, prevSeason, level };
}

/* ---- Teiknuð treyja (fallback ef mynd næst ekki) ---- */
function Kit({ short, size = 34 }) {
  const [a, b] = KIT[short] || ["#9aa", "#fff"];
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 40 36" aria-hidden="true">
      <path d="M13 3 L20 6 L27 3 L34 8 L31 14 L28 12 L28 33 L12 33 L12 12 L9 14 L6 8 Z"
        fill={a} stroke="rgba(0,0,0,0.18)" strokeWidth="0.7" strokeLinejoin="round" />
      <path d="M13 3 L9 14 L6 8 Z" fill={b} opacity="0.9" />
      <path d="M27 3 L31 14 L34 8 Z" fill={b} opacity="0.9" />
    </svg>
  );
}

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
  const [bsd, setBsd] = useState(null);                // BSD per-skot xG + Opta-tolur (2025/26)
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
  const [formFeat, setFormFeat] = useState(null);   // rúllandi eiginleikar (fittað líkan)
  const [teamForm, setTeamForm] = useState(null);   // HEILT lið-form úr E0
  const [luck, setLuck] = useState(null);           // xG/xGC per lið (FPL-summa)
  const [teamShots, setTeamShots] = useState(null); // SVAEDI skotanna (ESPN, heilt timabil)
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
  const [recMaxCost, setRecMaxCost] = useState("");   // hamarksverd i tillogum (tomt = ekkert thak)
  const [teamSort, setTeamSort] = useState("def");
  const [detail, setDetail] = useState(null); // {kind:"player"|"team", id}
  const [live, setLive] = useState(null);      // lifandi staða valdrar umferðar
  const [gwStats, setGwStats] = useState(null); // per-leikmanns tölur valdrar umferðar
  const [liveTick, setLiveTick] = useState(0);
  const [view, setView] = useState("planner");   // "planner" | "gw" | "board"
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
  const [rivalInput, setRivalInput] = useState("");
  const [rivalData, setRivalData] = useState({});    // {id: {name, gwPts, totalPts, captain, picks}}

  const flash = m => { setToast(m); setTimeout(() => setToast(null), 2800); };

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
        if (!plA || !tmA || !fxA || !evA) throw new Error("kjarnagögn í óvæntri lögun");
        setPlayers(plA); setTeams(tmA); setFixtures(fxA); setEvents(evA);
        setDataState("ok");
        try { setDefcon(await j("defcon.json")); } catch {}
        try { setDefconHist(await j("defcon_history.json")); } catch {}
        try { setConsist(await j("consistency.json")); } catch {}
        try { setBsd(await j("bsd_players.json")); } catch {}
        try { setPlayerForm(await j("player_form.json")); } catch {}
        try { setPipeStatus(await j("status.json")); } catch {}
        /* HRADA KEYRSLAN SKRIFAR I status_fast.json OG APPID LAS HANA EKKI.
           Thar med voru ALLAR heimildir hradar keyrslunnar osynilegar i
           hlidarstikunni — thar a medal api_lineups. Vordur i profi.     */
        try { setPipeStatusFast(await j("status_fast.json")); } catch {}
        /* STADFEST BYRJUNARLID. Pipeline skrifadi lineups.json en APPID LAS
           HANA ALDREI — eiginleikinn var fullbyggdur og maeldur en gognin
           foru ekkert. Thridja tilvikid af somu tegund i thessari lotu
           (rong keyrsla -> vantandi lykil -> enginn notandi).            */
        try { setLineups(await j("lineups.json")); } catch {}
        try { setElo(await j("elo.json")); } catch {}
        try { setWeather(await j("weather.json")); } catch {}
        try { setTravel(await j("travel.json")); } catch {}
        /* season_baseline.json er EKKI lengur lesin: gamla "i ar vs i fyrra"-taflan
           notadi hana, en SeasonTable les nu player_seasons.json sem porar a `code`
           (fast a leikmanni) i stad `id` sem FPL endurnytir milli timabila.
           Pipeline skrifar hana afram — hun er bara ekki sott i framendann.     */
        try { setInjuries(await j("injuries.json")); } catch {}
        try { setEloFx(await j("elo_fixtures.json")); } catch {}
        try { setEuroFx(await j("euro_fixtures.json")); } catch {}
        try { setNews(await j("news.json")); } catch {}
        try { setPromoted(await j("promoted_baseline.json")); } catch {}
        try { setChipRules(await j("chips.json")); } catch {}
        try { setFormFeat(await j("form_features.json")); } catch {}
        try { setTeamForm(await j("team_form.json")); } catch {}
        try { setLuck(await j("luck.json")); } catch {}
        try { setTeamShots(await j("team_shots.json")); } catch {}
        try { setLastGw(await j("last_gw.json")); } catch {}
        try { setLastGwShots(await j("last_gw_shots.json")); } catch {}
        try { setSeasonsFile(await j("player_seasons.json")); } catch {}
        try { setSpNotes(await j("set_piece_notes.json")); } catch {}
        try { setImminent(await j("imminent.json")); } catch {}
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
  useEffect(() => {
    let alive = true;
    setGwStats(null);
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
        setEntryId(s.entryId ?? null); setPlan(s.plan ?? []);
        setCaptain(s.captain ?? START_CAPTAIN); setVice(s.vice ?? null);
        setBenchSwaps(s.benchSwaps ?? {}); setChips(s.chips ?? {}); setBuyPrices(s.buyPrices ?? {});
        setRivals(s.rivals ?? []); setWatch(s.watch ?? []);
      }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (loaded) saveState("fpl_planner_v3", { entryId, plan, captain, vice, benchSwaps, chips, buyPrices, rivals, watch });
  }, [entryId, plan, captain, vice, benchSwaps, chips, buyPrices, rivals, watch, loaded]);

  /* ---------- Sækja raunlið + stig úr FPL-slóð ---------- */
  useEffect(() => {
    if (!PROXY_URL || !entryId) { setTotalPts(null); setGwPts(null); setSquadOverride(null); setApiHit(null); return; }
    (async () => {
      try {
        const r = await fetch(`${PROXY_URL}?path=fpl-picks&id=${entryId}&gw=${gw}`);
        const d = await r.json();
        setGwPts(d?.entry_history?.points ?? null);
        setTotalPts(d?.entry_history?.total_points ?? null);
        // FPL gefur banka í entry_history — nákvæmara en okkar áætlun
        if (d?.entry_history?.bank != null) setApiBank(d.entry_history.bank);
        // FPL segir okkur raunverulega refsingu sem var tekin í umferðinni
        setApiHit(d?.entry_history?.event_transfers_cost ?? null);
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
          const pp = {};
          d.picks.forEach(p => { if (p.purchase_price != null) pp[p.element] = p.purchase_price; });
          if (Object.keys(pp).length) setBuyPrices(prev => ({ ...prev, ...pp }));
          const c = d.picks.find(p => p.is_captain);
          const v = d.picks.find(p => p.is_vice_captain);
          if (c) setCaptain(c.element);
          if (v) setVice(v.element);
          /* STADFESTING A ThVI SEM SKIPTIR: lidid UPPFAERDIST. */
          setConn(cc => ({ ...cc, state:"picks", picks:true,
            msg: interp("Connected ✓ — {0} players fetched from FPL for gameweek {1}.", [d.picks.length, gw]) }));
        }
      } catch { setTotalPts(null); setGwPts(null); }
    })();
  }, [entryId, gw]);


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

  function addRival() {
    const m = rivalInput.match(/entry\/(\d+)/) || rivalInput.match(/^(\d+)$/);
    if (!m) { flash("Rival URL or team ID — e.g. 606 or .../entry/606/"); return; }
    const id = m[1];
    if (rivals.some(r => r.id === id)) { flash("Already on the list."); return; }
    if (String(id) === String(entryId)) { flash("That is your own team."); return; }
    setRivals(rs => [...rs, { id }]); setRivalInput("");
  }

  /* ---------- Afleidd gögn ---------- */
  /* ---------- TÍMABILS-STAÐA — verður að vera SNEMMA ----------
     Uppsafnaðar tölur í players.json (spjöld, mínútur, byrjanir, stig) eru
     frá FYRRA tímabili þar til umferð er lokin. Þessi tvö flögg ákveða hvort
     þær megi lesa sem yfirstandandi — og margt neðar þarf þau, svo þau eru
     skilgreind hér, ekki hjá preSeason.                                     */
  const seasonStarted = !!events?.some(e => e.finished);
  const seasonGames = (events || []).filter(e => e.finished).length;

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
  const crestFor = t => crestUrl(t?.code ?? CREST_FALLBACK[t?.short]);

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

  const fixturesOfGw = useMemo(() =>
    (fixtures || []).filter(f => f.event === gw)
      .sort((a,z) => (a.kickoff_time||"").localeCompare(z.kickoff_time||"")),
    [fixtures, gw]);

  // Lið-mælikvarðar úr opinberum gögnum (sl. tímabil)
  const teamMetrics = useMemo(() => {
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
      // Nýliðar hafa enga PL-sögu (xG ~0). Notum B-deildargrunn með afslætti
      // og MERKJUM sem staðgengil — má ekki líta út sem xG-mæling.
      if (xg90 < 0.2) {
        const pb = promoted && promoted[t.name.replace(/ (City|Town|United)$/, "")] ||
                   promoted && promoted[t.name];
        if (pb) {
          xg90 = +(pb.goals_pg * 0.75).toFixed(2);      // B-deild -> PL afsláttur
          xgc90 = +(pb.goals_against_pg * 1.35).toFixed(2); // fá meira á sig í PL
          src = "championship_proxy";
        } else { xg90 = 1.1; xgc90 = 1.6; src = "default"; }
      }
      m[t.id] = { xg90, xgc90, sotFor, sotAg, matches,
        prevGoals, prevConc, prevSotFor, prevSotAg, mins: a.gkMins, src };
    });
    return m;
  }, [players, teams, promoted, teamForm]);

  // ---- ClubElo styrkur per lið ----
  /* Landsleikjahle REIKNAD ur leikjadagsetningum — sja intlBreaks(). */
  const breaks = useMemo(() => intlBreaks(fixtures), [fixtures]);

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
  function xgaFor(teamId, fx) {
    const short = teamById[teamId]?.short;
    const bk = odds && short && odds[short];
    const bkValid = bk && Number.isFinite(bk.xga) && fx &&
      teamById[fx.opp]?.short === bk.opp &&
      (!fx.kickoff || !bk.kickoff || fx.kickoff.slice(0,10) === bk.kickoff.slice(0,10));
    if (bkValid) return bk.xga;
    if (!fx) return null;
    // MÆLD tafla: FDR -> mörk á sig (1.102 leikir). Fínt með liðsstyrk.
    const d2 = fixDifficulty(teamId, fx, 2) ?? fx.fdr;
    return +clamp(lookupMeasured("ga", d2), 0.3, 3.4).toFixed(1);
  }
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
      kind: "cup", comp: x.comp, label: x.comp_label || x.comp, date: x.date,
    }));
    return [...pl, ...extra]
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .slice(0, count);
  }

  /* ---------- FREE HIT-UMFERÐIR ----------
     Skipti gerð í Free Hit-umferð gilda AÐEINS í þeirri umferð — liðið
     fer sjálfkrafa til baka eftir hana. Lesið beint úr chips-ástandinu
     (lyklarnir heita "freehit:START"), svo þetta þarf ekki chipSlots.   */
  const fhGws = useMemo(() => new Set(
    Object.entries(chips).filter(([k]) => k.startsWith("freehit")).map(([, g]) => g)
  ), [chips]);

  /* ---------- Lið í valdri umferð ---------- */
  const squadAt = useMemo(() => {
    let sq = (squadOverride || START_SQUAD).map(s => ({ ...s }));
    [...plan].sort((a,z) => a.gw - z.gw).forEach(tr => {
      if (tr.gw > gw) return;
      // FH-skipti gilda aðeins í sinni umferð
      if (fhGws.has(tr.gw) && tr.gw !== gw) return;
      const i = sq.findIndex(s => s.id === tr.outId);
      if (i >= 0) sq[i] = { ...sq[i], id: tr.inId };
    });
    (benchSwaps[gw] || []).forEach(([aId, bId]) => {
      const ia = sq.findIndex(s => s.id === aId), ib = sq.findIndex(s => s.id === bId);
      if (ia >= 0 && ib >= 0) {
        const t = sq[ia].starter; sq[ia] = { ...sq[ia], starter: sq[ib].starter }; sq[ib] = { ...sq[ib], starter: t };
      }
    });
    return sq;
  }, [plan, gw, benchSwaps, squadOverride, fhGws]);

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
  const plannedIn = useMemo(() => new Set(plan.filter(t => t.gw <= gw).map(t => t.inId)), [plan, gw]);

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
    const rec = buyPrices[id];
    return (rec && typeof rec === "object" ? rec.p : rec) ?? byId[id]?.now_cost ?? 0;
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
    // beita plönuðum skiptum til og með valdri umferð.
    // FH-skipti snerta bankann aðeins Í sinni umferð — hann gengur til baka.
    [...plan].sort((a, z) => a.gw - z.gw).forEach(tr => {
      if (tr.gw > gw) return;
      if (fhGws.has(tr.gw) && tr.gw !== gw) return;
      tenths += sellOf(tr.outId) - (byId[tr.inId]?.now_cost ?? 0);
    });
    return +(tenths / 10).toFixed(1);
  }, [players, squadOverride, apiBank, plan, gw, byId, buyPrices, fhGws]);

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
  starters.forEach(s => { const p = byId[s.id]; if (p) rows[p.element_type].push(s); });

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

    // FPL-REGLA: verður að hafa fyrir því. (Notum núverandi verð; raunverulegt
    // söluverð getur verið lægra v. 50%-hagnaðarreglu — sjá athugasemd í UI.)
    // söluverð út (50%-reglan), fullt verð inn
    const bankAfter = +(bank + (sellOf(outId) - n.now_cost) / 10).toFixed(1);
    if (bankAfter < 0) {
      flash(interp("£{0}m short — transfer too expensive.", [Math.abs(bankAfter).toFixed(1)]));
      return;
    }

    // Skrá verðið sem við SJÁUM núna — það verður kaupverðið þegar skiptin fara fram.
    // (Ef verðið breytist fyrir framkvæmd uppfærist það við næstu liðs-greiningu.)
    setPlan(p => [...p, { gw, outId, inId, seenPrice: n.now_cost, seenAt: new Date().toISOString().slice(0,10) }]);
    setSelling(null); setSearchQ("");
    flash(interp("GW{0}: {1} → {2} · bank £{3}", [gw, o.web_name, n.web_name, bankAfter.toFixed(1)]));
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
    next.filter(s => s.starter).forEach(s => { const p = byId[s.id]; if (p) cnt[p.element_type]++; });
    if (cnt[1] !== 1 || cnt[2] < 3 || cnt[3] < 2 || cnt[4] < 1 || cnt[2]+cnt[3]+cnt[4] !== 10) {
      flash("Illegal formation (1 GK, 3+ DEF, 2+ MID, 1+ FWD)."); return false;
    }
    setBenchSwaps(bs => ({ ...bs, [gw]: [...(bs[gw] || []), [aId, bId]] }));
      return true;
  }
  /* ---------- ENDURSTILLING ----------
     Hvað er plönuð í umferð: skipti, bekkjar-breytingar, chip.
     Tveggja-skrefa staðfesting því þetta er óafturkræft.                */
  function gwPlanned(g) {
    const tr = plan.filter(t => t.gw === g).length;
    const bs = (benchSwaps[g] || []).length;
    const chKey = Object.keys(chips).find(k => chips[k] === g);
    const ch = chKey ? (CHIPS[chipSlots.find(x => x.key === chKey)?.name]?.short || "chip") : null;
    return { tr, bs, ch, any: tr > 0 || bs > 0 || !!ch };
  }
  function resetGw(g) {
    setPlan(pl => pl.filter(t => t.gw !== g));
    setBenchSwaps(bs => { const n = { ...bs }; delete n[g]; return n; });
    setChips(c => { const n = { ...c }; for (const k of Object.keys(n)) if (n[k] === g) delete n[k]; return n; });
    setSwapSel(null); setSelling(null); setConfirmReset(null);
    flash(interp("GW{0} reset — original squad restored.", [g]));
  }
  function resetAll() {
    setPlan([]); setBenchSwaps({}); setChips({});
    setCaptain(START_CAPTAIN); setVice(null);
    setSwapSel(null); setSelling(null); setConfirmReset(null);
    flash("All planning reset.");
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

  /* ---------- Tillögu-kerfi: MÆLDAR vogtölur (sjá FIT ofar) ---------- */
  const recommendations = useMemo(() => {
    if (!players || !fixtures) return { byPos: {}, sellIds: new Set() };
    const N = recRange;
    const ff = {};
    (formFeat?.players || []).forEach(x => ff[x.fpl_id] = x);
    const haveForm = (formFeat?.mode === "fitted");

    const scoreOf = (p) => {
      const fxs = [];
      for (let g = gw; g < gw + N && g <= maxGw; g++) {
        (fixByTeamGw[p.team]?.[g] || []).forEach(f => fxs.push(f));
      }
      if (!fxs.length) return null;
      const fdrAvg = fxs.reduce((a, f) => a + f.fdr, 0) / fxs.length;
      const homeShare = fxs.filter(f => f.home).length / fxs.length;
      const price = (p.now_cost || 0) / 10;
      const avail = p.status === "a" ? 1 : (p.chance_of_playing_next_round ?? 0) / 100;
      const w = FIT[p.element_type] || FIT[3];

      let raw, mode;
      if (haveForm && ff[p.id]) {
        // MÆLT LÍKAN — mins5 er ríkjandi þáttur
        const f = ff[p.id];
        raw = w.bias
            + w.mins5 * (f.mins5 / 90)
            + w.pts5  * f.pts5
            + w.xgi90 * f.xgi90
            + w.bps90 * f.bps90
            + w.price * price
            + w.fdr   * fdrAvg;
        // skala úr 5-umferða kvarða í valinn sjóndeildarhring
        raw = raw * (N / 5);
        mode = "fitted";
      } else {
        // FYRIR TÍMABIL: mins5 er ekki til. Notum það sem er í boði og
        // MERKJUM lægra öryggi. Mæling sýnir að þetta er ~1,5 stigum verra.
        const ppg = parseFloat(p.points_per_game || 0);
        const ep = parseFloat(p.ep_next || 0);
        const mins = p.minutes || 0;
        const per90 = mins > 400 ? 90 / mins : 0;
        const xgi90 = parseFloat(p.expected_goal_involvements || 0) * per90;
        raw = w.bias
            + w.mins5 * Math.min(1, mins / (38 * 90))   // sl. tímabils mínútuhlutfall
            + w.pts5  * ppg
            + w.xgi90 * xgi90
            + w.price * price
            + w.fdr   * fdrAvg
            + ep * 1.2;                                  // FPL-eigin spá vegur inn
        raw = raw * (N / 5);
        mode = "preseason";
      }

      // Aðlaganir sem MÆLINGIN nær ekki yfir (tiltækileiki, bönn, fastaleikir)
      const br = banRisk(p, gw, seasonStarted);
      const banPen = !br ? 0 : br.level === "high" ? -2.5 : br.level === "mid" ? -1 : 0;
      const spB = setPieceOf(p)?.isPenTaker ? 2.2 : 0;
      const rot = rotationRisk(p, seasonGames);
      const rotPen = !rot ? 0 : rot.level === "high" ? -2 : rot.level === "mid" ? -0.8 : 0;
      // DefCon-tækifæri fyrir vörn (aðskilið frá CS%)
      let dcB = 0;
      if (p.element_type <= 2) {
        const o = dcOpp[p.team]?.defcon_opportunity;
        if (typeof o === "number") dcB = (o - 60) / 30;
      }

      const score = (raw + banPen + spB + rotPen + dcB) * (0.35 + 0.65 * avail);

      /* HVAÐ DRÍFUR SKORIÐ — birt á kortinu svo talan sé ekki dulúð.
         Mælt: mínútur eru ríkjandi (+4,9 stöðluð áhrif), FFDR nær núll (−0,4).
         Þess vegna getur leikmaður með ÞUNGA leiki verið réttmæt tillaga.     */
      const drivers = [];
      if (haveForm && ff[p.id]) {
        drivers.push([interp("mins {0}′", [Math.round(ff[p.id].mins5)]), w.mins5 * (ff[p.id].mins5 / 90)]);
      } else {
        const mp = Math.min(1, (p.minutes || 0) / (38 * 90));
        drivers.push([interp("mins {0}%", [Math.round(mp * 100)]), w.mins5 * mp]);
      }
      drivers.push([`£${price.toFixed(1)}`, w.price * price]);
      drivers.push(["fixtures", w.fdr * fdrAvg]);
      drivers.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      const tot = drivers.reduce((a, x) => a + Math.abs(x[1]), 0) || 1;
      /* TVÆR PRÓSENTUR í sama streng var ólæsilegt: labelið getur sjálft
         innihaldið % ("mín 89%") og svo var HLUTDEILD driverins skeytt á
         eftir -> "mín 89% 44%", sem lestist sem ein tala. Hlutdeildin fer
         nú í sviga með orði, svo það sé ljóst hvað er hvað.              */
      const why = drivers.slice(0, 2)
        .map(([lbl, v]) => interp("{0} ({1}% of score)", [lbl, Math.round(100 * Math.abs(v) / tot)]))
        .join(" · ");

      // algilt meðal-FFDR yfir sviðið (til samanburðar milli liða)
      let fsum = 0, fn = 0;
      for (const f of fxs) { const d = fixDifficulty(p.team, f, p.element_type); if (d != null) { fsum += d; fn++; } }

      /* RÖÐUNARSKOR — mælt sér fyrir RÖÐUN, sjá rankScore í model.js.
         Tillögur eru RAÐAÐAR eftir þessu (topp-5 6,07 raunstig á móti
         5,29 hjá gamla skorinu og 5,20 hjá FPL-eigin xP, 5/5 tímabil).
         `score` heldur sér ÓBREYTT sem birt tala og drifkraftar (`why`)
         — mælingin sýndi að röðun og birt stærð eru tvö ólík störf og
         eiga ekki að deila einni tölu.                                  */
      const gamesSoFar = seasonGames || 38;      // forleikur: síðasta tímabil
      /* mínútuþróun kemur úr pipeline (player_form.json). Vantar hún —
         preseason eða <4 loknar umferðir — fer 0 inn og skorið er eins
         og áður. mins5 þar er RAUNVERULEGAR síðustu 5 umferðir og því
         betri en árs-meðaltalið; við notum hana þegar hún er til.       */
      const pf = playerForm?.players?.[p.id];
      /* TILTAEKILEIKI VANTADI I RODUNINA — FUNDID 7.8.2026 AF NOTANDA:
         J.Timber (ARS, `status:"i"`, chance_next 0, ep_next 0.0,
         "Groin injury") var i 2. saeti yfir varnarmenn sem MAELT ER MED
         AD KAUPA. rankScore metur form/minutur/verd/FFDR — hann veit
         EKKERT um meidsli, svo meiddur madur i lidi med letta leiki
         (ARS, FFDR 1,62) flaut upp. Birta talan (`score`) bar hins vegar
         tiltaekileikann (9,51 a moti 42,74 hja Gabriel) og THVI leit
         listinn ut fyrir ad vera oradadur — sami galli, tvo einkenni.
         Sama margfeldi og `score` notar er nu lagt a rodunina: 0% likur
         -> 0 og madurinn dettur af listanum, 25/50/75% skala hlutfallslega.
         Mælingin a rankScore (kafli 4) haggast ekki: hun snyst um ROD
         theirra sem GETA spilad.                                        */
      const rank = rankScore({
        form: parseFloat(p.form),
        minsPerGame: Number.isFinite(pf?.mins5) ? pf.mins5
                   : (p.minutes ?? 0) / Math.max(1, gamesSoFar),
        price: (p.now_cost ?? 45) / 10,
        ffdr: fn ? fsum / fn : null,
        minsTrend: pf?.mins_trend,
      }) * avail;
      return { p, score: +score.toFixed(2), rank: +rank.toFixed(3),
               ease: +(5 - fdrAvg).toFixed(2), fxs, mode,
               why, ffdrAvg: fn ? +(fsum / fn).toFixed(2) : null };
    };
    const all = players.map(scoreOf).filter(Boolean);
    /* VERDTHAK — sia adeins a TILLOGULISTANN, ekki a "skipta ut"-matid.
       Verdthak a ekki ad breyta thvi hver er verstur i thinu lidi.        */
    const maxT = (() => {
      const v = parseFloat(String(recMaxCost).replace(",", "."));
      return Number.isFinite(v) && v > 0 ? Math.round(v * 10) : null;
    })();
    const byPos = {};
    [1,2,3,4].forEach(pos => {
      byPos[pos] = all.filter(r => r.p.element_type === pos && !squadIds.has(r.p.id)
                                && (maxT == null || (r.p.now_cost ?? 0) <= maxT))
        .sort((a,b) => b.rank - a.rank).slice(0, 4);
    });
    // versti í liðinu = mælt með að skipta út
    const inSquad = all.filter(r => squadIds.has(r.p.id));
    const sorted = [...inSquad].sort((a,b) => a.score - b.score);
    const sellIds = new Set(sorted.slice(0, 2).map(r => r.p.id));
    return { byPos, sellIds, inSquadScores: Object.fromEntries(inSquad.map(r => [r.p.id, r.score])) };
  }, [players, fixtures, gw, recRange, fixByTeamGw, teamMetrics, squadIds, odds, defcon, dcOpp, eloByTeam, eloCsByFx, maxGw, formFeat, recMaxCost, playerForm]);

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
  const preSeason = gw1Deadline ? new Date() < new Date(gw1Deadline) : false;
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
      // lið í þeirri umferð (með plönuðum skiptum)
      let sq = (squadOverride || START_SQUAD).map(x => ({ ...x }));
      [...plan].sort((a, z) => a.gw - z.gw).forEach(tr => {
        if (tr.gw > g) return;
        if (fhGws.has(tr.gw) && tr.gw !== g) return;   // FH gildir eina umferð
        const i = sq.findIndex(x => x.id === tr.outId);
        if (i >= 0) sq[i] = { ...sq[i], id: tr.inId };
      });
      (benchSwaps[g] || []).forEach(([aId, bId]) => {
        const ia = sq.findIndex(x => x.id === aId), ib = sq.findIndex(x => x.id === bId);
        if (ia >= 0 && ib >= 0) { const t = sq[ia].starter; sq[ia] = { ...sq[ia], starter: sq[ib].starter }; sq[ib] = { ...sq[ib], starter: t }; }
      });
      const bb = sq.filter(x => !x.starter).reduce((a, x) => a + expPoints(x.id, g), 0);
      const capIn = sq.some(x => x.id === captain && x.starter);
      const tc = capIn ? expPoints(captain, g) : 0;   // auka 1x ofan á venjuleg 2x
      out[g] = { bboost: +bb.toFixed(1), "3xc": +tc.toFixed(1) };
    }
    return out;
  }, [players, fixtures, plan, benchSwaps, squadOverride, captain, maxGw, byId, fixByTeamGw, events, fhGws]);

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
          {/* VISAR A LEIKMENN-FLIPANN. browse-hamurinn var TVIVERKNADUR:
              flipinn gerir thad sama betur (108 dalkar, throskuldar,
              vaktlisti, samanburdur, fjogur timabil) medan thessi gluggi
              hafdi adeins nafna-leit + stodu-siu.
              HEITID BREYTTIST UR "Leikmenn" I "Leita": tveir hnappar hetu
              "Leikmenn" (thessi og flipinn) og thad rugl er MAELT, ekki
              tilgatulegt — baedi vafra-leit og prof greipu thann ranga i
              throun og areksturinn thurfti ad skjalfesta i profaskra.
              SKIPTA-GLUGGINN (selling) LIFIR OBREYTTUR: hann veit hvad thu
              ert ad selja, hvad er i bankanum og hvad 3-per-felag reglan
              segir. Leikmannalistinn veit ekkert af thvi.                 */}
          <button style={S.searchBtn} onClick={() => setView("players")}
            title={"Open the player list — search, filters and comparison"}>{"🔍 Search"}</button>
          <button style={{ ...S.searchBtn, ...(showFfdr ? S.searchBtnOn : {}) }}
            onClick={() => setShowFfdr(v => !v)}
            title={"Fixture difficulty for every team, defensive and attacking"}>{"📊 FFDR"}</button>
          <button style={{ ...S.searchBtn, ...(showChips ? S.searchBtnOn : {}) }}
            onClick={() => setShowChips(v => !v)}
            title="Wildcard, Free Hit, Bench Boost, Triple Captain">{"🎫 Chips"}</button>
          <input className="url-input" style={S.urlInput}
            placeholder={"FPL URL or team ID"} value={urlInput}
            title={"Paste the link to YOUR TEAM (it contains /entry/NUMBER/) — or just the number. Example: fantasy.premierleague.com/entry/1234567/event/1"}
            onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && connectUrl()} />
          <button style={S.connectBtn} onClick={connectUrl}
            disabled={conn.state === "checking"}>
            {conn.state === "checking" ? "Checking …" : entryId ? "Refresh" : "Connect"}</button>
        </div>
        {/* STADA TENGINGARINNAR — SYNILEG. Adur var engin stadfesting og
            engin villa: notandinn sa "Tengt lid X" samstundis og svo ekkert
            thott soknin hefdi brostid. Nu sest hvad gerdist i raun.       */}
        {conn.state !== "idle" && (
          <div style={{ ...S.connMsg,
            background: conn.state === "error" ? "#fdecee"
                      : conn.state === "checking" ? "#f4f4f6"
                      : conn.picks === false ? "#fff6e0" : "#e6f9f0",
            color: conn.state === "error" ? "#93202b"
                 : conn.state === "checking" ? C.text2
                 : conn.picks === false ? "#7a5600" : "#046b41" }}>
            {conn.state === "error" ? "✕ " : conn.state === "checking" ? "… "
              : conn.picks === false ? "⚠ " : "✓ "}
            {conn.msg}
            {conn.state === "error" && (
              <span style={S.connHint}>
                {" "}{"Example: fantasy.premierleague.com/entry/1234567/event/1 — or just 1234567"}
              </span>
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
          ["board","🏆 Leaderboard"],["sp","Set pieces", SetPieceIcon]].map(([k,l,Ico]) => (
          <button key={k} style={{ ...S.viewTab, ...(view === k ? S.viewTabOn : {}),
                                   ...(Ico ? S.viewTabIcon : {}) }}
            onClick={() => setView(k)}>
            {Ico ? <Ico size={14} title="" /> : null}{l}
          </button>
        ))}
      </div>

      {view === "gw" && (
        <GwReport report={lastGw} shotsFile={lastGwShots} teamById={teamById} Crest={Crest} />
      )}
      {view === "players" && (
        <PlayerList players={players} teams={teams} teamById={teamById} events={events}
          seasonsFile={seasonsFile} imminent={imminent} shotsFile={lastGwShots}
          fixtures={fixtures} odds={odds} defcon={defcon} defconHist={defconHist} consist={consist}
          bsd={bsd} photoUrl={photoUrl} Crest={Crest}
          onPickPlayer={id => setDetail({ kind:"player", id })}
          watch={watch}
          onWatch={id => setWatch(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])}
          mineIds={squadIds}
          cmpIds={cmpIds}
          onCompare={id => setCmpIds(v => v.includes(id) ? v.filter(x => x !== id)
                                                        : [...v, id].slice(0, 4))} />
      )}
      {view === "teams" && (
        <Teams teams={teams} teamForm={teamForm} luck={luck} teamShots={teamShots} />
      )}
      {view === "sp" && (
        <SetPieces players={players} teams={teams} teamById={teamById} Crest={Crest}
          notes={spNotes} onPickPlayer={id => setDetail({ kind:"player", id })} />
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
                {brk && <span style={S.intl}
                  title={interp("International break — {0} days between GW{1} and GW{2}", [brk, n, n + 1])}>
                  <span style={S.globe}>🌐</span></span>}
              </React.Fragment>
            );
          })}
        </div>
          <button style={{ ...S.tlArrow, ...(tlStart + tlWindow > maxGw ? S.tlArrowOff : {}) }}
            disabled={tlStart + tlWindow > maxGw} title={"Later gameweeks"}
            onClick={() => setTlStart(v => Math.min(Math.max(1, maxGw - tlWindow + 1), v + tlWindow))}>›</button>
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
              pl.bs ? interp(pl.bs > 1 ? "{0} bench changes" : "{0} bench change", [pl.bs]) : null,
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
                    Að spyrja `tc.chip` gaf „Bench Boost — ótakmörkuð skipti". */}
                {tc.unlimitedBy === "chip" ? interp("{0} — unlimited transfers", [CHIPS[tc.chip].label]) : "unlimited free transfers"}
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
        {preSeason && (
          <div style={S.preSeasonBar}>
            <b>{"Preseason."}</b> {"Prices do not move and transfers are unlimited and free until the GW1 deadline passes"} {fmtDeadline(gw1Deadline)}{". Purchase prices lock then — the 50% sell rule applies after that."}
          </div>
        )}
      </div>

      {/* ---------- Mælaborð ---------- */}
      <div className="app-stats" style={S.stats}>
        <Stat icon="💰" label={"Bank"} value={`£${bank.toFixed(1)}`}
          sub={interp("squad £{0} · total £{1}", [squadValue.toFixed(1), (bank + squadValue).toFixed(1)])}
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
            {(benchSwaps[gw]?.length > 0) &&
              <button style={S.ghost} onClick={() => setBenchSwaps(bs => { const n = { ...bs }; delete n[gw]; return n; })}>{"Reset bench"}</button>}
          </div>

          {/* VÖLLUR — spjöldin í VENJULEGU FLÆÐI ofan á bakgrunninum.
              Fyrri útgáfa negldi raðir á föst prósent af hæð; þegar spjöldin
              urðu hærri en bilið SKÖRUÐUST raðirnar og bekkurinn klipptist
              neðan af. Nú deila raðirnar plássinu (space-evenly) og
              völlurinn VEX ef efnið þarf meira — skörun er ómöguleg.       */}
          <div className="pitch-split" style={S.pitchSplit}>
          <div className="pitch-col" style={S.pitchCol}>
          <Pitch>
            <div style={S.rowsArea}>
              {[1, 2, 3, 4].map(pos => (
                <div key={pos} style={S.pitchRowFlex}>
                  {rows[pos].map(sq => (
                    <PlayerCard key={sq.id} s={sq} p={byId[sq.id]} team={teamById[byId[sq.id]?.team]} teamById={teamById}
                      fx={(fixByTeamGw[byId[sq.id]?.team]?.[gw] || [])[0]}
                      fxNext3={nextGwFixtures(byId[sq.id]?.team, gw)}
                      captain={captain} vice={vice}
                      csFor={csFor} xgaFor={xgaFor} crestFor={crestFor}
                      dc={dcOpp[byId[sq.id]?.team]} elo={eloByTeam[byId[sq.id]?.team]} gwNow={gw} sellTenths_={sellOf(sq.id)} diffOf={fixDifficulty}
                      isPlanned={plannedIn.has(sq.id) && !officialIds.has(sq.id)}
                      isSellHint={recommendations.sellIds?.has(sq.id)}
                      onInfo={() => setDetail({ kind:"player", id:sq.id })}
                      onTransfer={() => { setSelling(sq.id); setSearchQ(""); setSwapSel(null); }}
                      onRotation={() => setRotIds([sq.id])}
                      confirmed={lineupBy[`${sq.id}|${gw}`]}
                      onCardClick={() => clickPlayer(sq.id)} swapSel={swapSel} seasonStarted={seasonStarted} seasonGames={seasonGames} ep={expPoints(sq.id, gw)} cumLabel={cumLabel}
                      dragId={dragId} setDragId={setDragId}
                      onDropPlayer={fromId => swapStarterBench(fromId, sq.id)} />
                  ))}
                </div>
              ))}
            </div>
            {/* BEKKUR — HTML-borði sem fylgir innihaldinu, ekki fast prósent */}
            <div style={S.benchArea}>
              <div style={S.benchLabel}>{"Bench"}</div>
              <div style={S.pitchRowFlex}>
                {bench.map(sq => (
                  <PlayerCard key={sq.id} s={sq} p={byId[sq.id]} team={teamById[byId[sq.id]?.team]} teamById={teamById}
                    fx={(fixByTeamGw[byId[sq.id]?.team]?.[gw] || [])[0]} bench
                    fxNext3={nextGwFixtures(byId[sq.id]?.team, gw)}
                    captain={captain} vice={vice}
                    csFor={csFor} xgaFor={xgaFor} crestFor={crestFor}
                    dc={dcOpp[byId[sq.id]?.team]} elo={eloByTeam[byId[sq.id]?.team]} gwNow={gw} sellTenths_={sellOf(sq.id)} diffOf={fixDifficulty}
                    isPlanned={plannedIn.has(sq.id) && !officialIds.has(sq.id)}
                    isSellHint={recommendations.sellIds?.has(sq.id)}
                    onInfo={() => setDetail({ kind:"player", id:sq.id })}
                    onTransfer={() => { setSelling(sq.id); setSearchQ(""); setSwapSel(null); }}
                    onRotation={() => setRotIds([sq.id])}
                    confirmed={lineupBy[`${sq.id}|${gw}`]}
                    onCardClick={() => clickPlayer(sq.id)} swapSel={swapSel} seasonStarted={seasonStarted} seasonGames={seasonGames} ep={expPoints(sq.id, gw)} cumLabel={cumLabel}
                    dragId={dragId} setDragId={setDragId}
                    onDropPlayer={fromId => swapStarterBench(fromId, sq.id)} />
                ))}
              </div>
            </div>
          </Pitch>
          </div>
          {/* LEIKIR UMFERÐARINNAR — við hliðina á vellinum */}
          <GwFixtureList gw={gw} fixtures={fixtures} teamById={teamById}
            weatherByFx={weatherByFx} travelByFx={travelByFx} liveByFx={liveByFx}
            nameOf={id => byId[id]?.web_name || `#${id}`} diffOf={fixDifficulty}
            onPick={t => setDetail({ kind:"team", id:t })} />
          </div>

          {/* Meiðsli, bönn og hætta í liðinu */}
          <section style={S.card}>
            <h2 style={S.h2}>{"Squad availability"}</h2>
            {(() => {
              const flagged = squadAt.map(x => byId[x.id]).filter(Boolean).map(pp => ({
                pp, av: availOf(pp), ban: banRisk(pp, gw, seasonStarted), rot: rotationRisk(pp, seasonGames),
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
            <h2 style={S.h2}>{"Price changes — transfers this gameweek"}</h2>
            <div style={S.muted}>
              {"Real data: transfers_in/out and cost_change_event from FPL."}
              <b> {"\"tonight?\""}</b> {"is an approximation (net transfers against ownership) — FPL does not publish its formula, so this is an indication, not a certainty. A green name = he is in your transfer plan:"} <b>{"bring the transfer forward"}</b> {"if he rises."}
            </div>
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
              diffOf={fixDifficulty} crestFor={crestFor}
              from={tlStart} span={tlWindow} maxGw={maxGw}
              onPickTeam={id => setDetail({ kind:"team", id })} />
          )}

          {/* Skiptaáætlun (listi — ekki form) */}
          {plan.length > 0 && (
            <div style={S.card}>
              <div style={S.recHead}>
                <h2 style={S.h2}>{"Transfer plan"}</h2>
                <span style={S.planTotal}>
                  {(() => {
                    const gain = plan.reduce((a, t) => a + transferNet(t), 0);
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
              {/* ENDURSTILLA ALLT — fyrir þegar Wildcard-tilraun er hætt við */}
              <div style={S.resetAllRow}>
                {confirmReset === "all" ? (
                  <span style={S.resetConfirm}>
                    {"Clear ALL planning ("}{plan.length} {"transfers,"} {Object.keys(benchSwaps).length} {"gameweeks with bench changes,"} {Object.keys(chips).length} {"chip)?"}
                    <button style={S.resetYes} onClick={resetAll}>{"yes, everything"}</button>
                    <button style={S.resetNo} onClick={() => setConfirmReset(null)}>{"no"}</button>
                  </span>
                ) : (
                  <button style={S.resetBtn} onClick={() => setConfirmReset("all")}
                    title={"Clear every transfer, bench change and chip — original squad restored"}>
                    {"↺ reset all planning"}
                  </button>
                )}
              </div>
              {[...plan].sort((a,z) => a.gw - z.gw).map((t,i) => {
                const gain = transferNet(t);
                const tc = transferCost[t.gw];
                // refsing deilist á skiptin í þeirri umferð
                const inGw = plan.filter(x => x.gw === t.gw).length;
                const hitShare = tc && inGw ? tc.points / inGw : 0;
                const net = +(gain + hitShare).toFixed(1);
                return (
                  <div key={i} style={S.planItem}>
                    <span style={{ ...S.planGw, ...(tc?.hits > 0 ? S.planGwHit : {}) }}>GW{t.gw}</span>
                    {fhGws.has(t.gw) &&
                      <span style={S.planFh} title={"Free Hit — the squad reverts after the gameweek, the transfers only count in it"}>FH</span>}
                    <span style={{ flex:1, minWidth:0 }}>
                      <span style={{ color:C.red }}>{byId[t.outId]?.web_name}</span>
                      {" → "}
                      <span style={{ color:C.green, fontWeight:600 }}>{byId[t.inId]?.web_name}</span>
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
          <section style={S.card}>
            <div style={S.recHead}>
              <h2 style={S.h2}>{"Teams — FFDR GW"}{gw}–{Math.min(gw + recRange - 1, maxGw)}</h2>
              <select style={S.chipSel} value={teamSort} onChange={e => setTeamSort(e.target.value)}>
                <option value="def">{"FFDR defence"}</option>
                <option value="att">{"FFDR attack"}</option>
              </select>
            </div>
            <div style={S.muted}>
              {"FFDR is"} <b>{"the output"}</b> {"— ClubElo, xGC and the market line are inputs to it and are therefore not shown separately. Lower FFDR = easier. (The DefCon opportunity is its own signal and appears on player cards and in the team overview.)"}
              {/* ALDUR INNTAKANNA — THOGULL BILUN VAR MOGULEG.
                  elo.json er FFDR-inntak og var 31.7.2026 EINN OG HALFUR
                  DAGUR gomul thvi ClubElo brast ("fetch failed" i
                  status.json) — en ekkert i vidmotinu sagdi thad. Sama
                  mynstur sem gerdi markadslidinn daudan i VIKU (kafli 3):
                  formulan var i lagi, gognin sem hun fekk voru ekki.
                  Aldurinn er thvi synilegur ThAR SEM FFDR ER BIRT, ekki
                  adeins sem rauð lina i heimildalistanum.               */}
              {(() => {
                /* Threpin sjalf eru i model.js (eloStale) svo thau seu
                   profanleg — vafrinn getur ekki sett sig i 'gamalt' stod. */
                const st = eloStale(elo?.updated);
                if (!st) return null;
                return (
                  <div style={{ marginTop:6, fontSize:10.5, lineHeight:1.5,
                                color: st.level === "bad" ? C.red : C.amber }}>
                    {st.level === "bad" ? "⚠ " : ""}
                    {interp("Elo data is {0} days old — ClubElo has not responded since then.", [st.days.toFixed(1)])}
                  </div>
                );
              })()}
            </div>
            <div style={S.tblHead}>
              <span style={{ flex:1 }}>{"Team"}</span>
              <span style={S.tblNum} title={"FFDR for defenders, average over the selected range"}>{"def"}</span>
              <span style={S.tblNum} title={"FFDR for forwards"}>{"att"}</span>
            </div>
            {(() => {
              // meðal-FFDR yfir valið bil, per staða
              const avg = (tid, pos) => {
                let n = 0, sum = 0;
                for (let g = gw; g < gw + recRange && g <= maxGw; g++) {
                  for (const fx of (fixByTeamGw[tid]?.[g] || [])) {
                    const d = fixDifficulty(tid, fx, pos);
                    if (d != null) { sum += d; n++; }
                  }
                }
                return n ? +(sum / n).toFixed(2) : null;
              };
              const rows = teams.map(t => ({
                t, def: avg(t.id, 2), att: avg(t.id, 4),
              }));
              rows.sort((a, b) => {
                const k = teamSort === "att" ? "att" : "def";
                return (a[k] ?? 9) - (b[k] ?? 9);
              });
              return rows.map(({ t, def, att }) => {
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
                    </span>
                    <span style={{ ...S.tblNum }}>
                      <span style={{ ...S.ffdrCell, background:cd.bg, color:cd.fg }}>{def ?? "—"}</span>
                    </span>
                    <span style={{ ...S.tblNum }}>
                      <span style={{ ...S.ffdrCell, background:ca.bg, color:ca.fg }}>{att ?? "—"}</span>
                    </span>
                  </div>
                );
              });
            })()}
          </section>

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

          {/* API-staða */}
          <section style={S.card}>
            <h2 style={S.h2}>{"Data sources"}</h2>
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
            <div style={S.srcRow}>
              <span style={Object.keys(eloByTeam || {}).length ? S.dotOk : S.dotWait} />
              ClubElo — {Object.keys(eloByTeam || {}).length}/{teams?.length ?? 0} {"teams"}
              {eloFx?.fixtures?.length ? interp(" · {0} matches with CS probabilities", [eloFx.fixtures.length]) : ""}
            </div>
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
                thott 404 fyrir timabil se EDLILEGT astand. Nu: islensk heiti,
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
              };
              return Object.entries(sources)
                .filter(([k]) => SHOW[k])
                .map(([k, v]) => {
                  // "bidur" = keyrslan tokst en gognin eru ekki til enn
                  const waiting = v.ok && (!v.count || v.count === 0);
                  const dot = !v.ok ? S.dotErr : waiting ? S.dotWait : S.dotOk;
                  return (
                    <div key={k} style={S.srcRow} title={v.note || ""}>
                      <span style={dot} />{SHOW[k]} — {
                        !v.ok ? interp("error: {0}", [(v.note || "unknown").slice(0, 40)])
                        : waiting ? (v.note || "waiting for data")
                        : v.count}
                    </div>
                  );
                });
            })()}
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
              <b style={{ color: C.amber }}>{"Preseason mode."}</b> {"Minutes from recent gameweeks are the dominant factor but they do not exist yet. We use price, FPL ep_next and last season. Measurement shows this is"} <b>{"~1.5 points less accurate"}</b> {"— the score sharpens from GW6."}
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
                  crestFor={crestFor} csFor={csFor} range={recRange} onAdd={() => setDetail({ kind:"player", id:r.p.id })} />
              ))}
            </div>
          </div>
        ))}
      </section>
      </>)}

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
        const sp = isPlayer ? setPieceOf(p) : null;
        const rot = isPlayer ? rotationRisk(p, seasonGames) : null;
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

                  {/* ep og vitarod eiga heima her, ekki i timabila-toflunni */}
                  <div style={S.dGrid}>
                    <DStat k={"Next GW forecast (ep)"} v={p.ep_next} />
                    {rot && <DStat k={"Started"} v={`${rot.starts}/${rot.played}`} sub={`${rot.pct}%`} />}
                    {/* Afturvirkjud tala, ALDREI hra — og n synilegt vid hlidina */}
                    {dcp && dcp.starts > 0 && dcp.hit_rate_adj != null &&
                      <DStat k={"DC hit rate"} v={`${Math.round(dcp.hit_rate_adj * 100)}%`}
                        sub={interp("{0} starts · raw {1}%", [dcp.starts, Math.round(dcp.hit_rate * 100)])} />}
                    {sp && <DStat k={"Penalty order"} v={sp.pen ?? "—"} sub={sp.isPenTaker ? "first taker" : ""} />}
                    {sp?.ck != null && <DStat k={"Corners/FK"} v={sp.ck} />}
                    {sp?.fk != null && <DStat k={"Free kicks"} v={sp.fk} />}
                  </div>

                  <SeasonTable p={p} seasonsFile={seasonsFile}
                    currentLabel={currentSeasonLabel} seasonStarted={seasonStarted} />
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
                    <DStat k={"DefCon opportunity"} v={dcv ? dcv.defcon_opportunity : "—"} sub={"higher = more CBIT"} />
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
                    <div style={S.muted}>
                      {"No numbers for GW"}{gw} {"yet — the gameweek has not started (the season begins 21 August)."}
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
                        sub={xg != null && st.minutes > 0 ? (overP >= 0 ? `+${overP.toFixed(2)} yfir` : `${overP.toFixed(2)} undir`) : ""} />
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
                              <span style={S.dExName}>{EXPLAIN_IS[x.identifier] || x.identifier}</span>
                              {x.value != null && <span style={S.dExVal}>{x.value}</span>}
                              <span style={{ ...S.dExPts, color: x.points > 0 ? C.green : C.red }}>
                                {x.points > 0 ? "+" : ""}{x.points}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Big chances missed — krefst Understat */}
                    <div style={S.dNote}>
                      <b>Big chances missed</b> {"is not in the FPL API. It is derived from Understat shot data (a shot with xG above 0.30 that did not go in) — it appears once shot data arrives (season under way)."}
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
                // sýna fyrirfram hvort skiptin eru lögleg
                let block = null;
                if (selling) {
                  const after = squadAt.map(x => (x.id === selling ? p.id : x.id));
                  if (after.filter(id => byId[id]?.team === p.team).length > 3) block = "3 per club";
                  else if (bank + diff < 0) block = interp("£{0} short", [Math.abs(bank + diff).toFixed(1)]);
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
                        {setPieceOf(p)?.isPenTaker && <span style={S.sPen} title={"First penalty taker (updated daily from FPL)"}>PEN</span>}
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
                        : <div style={{ ...S.sDiff, color: diff >= 0 ? C.green : C.red }}>
                            {diff >= 0 ? "+" : ""}£{diff.toFixed(1)}
                          </div>)}
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
function Crest({ team, size = 16, style }) {
  const [ok, setOk] = useState(true);
  const url = crestUrl(team?.code ?? CREST_FALLBACK[team?.short]);
  if (!url || !ok) return (
    <span style={{ ...S.crestFallback, fontSize: Math.max(7, size * 0.5), ...style }}>
      {team?.short || "?"}
    </span>
  );
  return <img src={url} alt="" loading="lazy"
    style={{ width:size, height:size, objectFit:"contain", ...style }}
    onError={() => setOk(false)} />;
}

function PlayerImg({ code, short, size = 34 }) {
  const [ok, setOk] = useState(true);
  const url = photoUrl(code);
  if (!url || !ok) return <Kit short={short} size={size} />;
  return <img src={url} alt="" style={{ height:size, width:"auto", objectFit:"contain" }}
    onError={() => setOk(false)} loading="lazy" />;
}

/* Heimildin býr í FLOKKS-fyrirsögninni fyrir ofan (Núna / Tímabilið X /
   Styrkur) — per-tölu merkin sem voru hér reyndust óþörf tvítekning
   þegar tölurnar flokkuðust rétt.                                       */
function DStat({ k, v, sub }) {
  return (
    <div style={S.dStat}>
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
        const d = best != null ? best : use.fdr;
        const t = tierOf(d);
        const opp = teamById[use.opp]?.short || "?";
        const label = fxs.map(f =>
          `${teamById[f.opp]?.short || "?"}${f.home ? "" : " (" + "away" + ")"}`).join(" + ");
        return (
          <div key={i} style={{ ...S.fixMini, background:TIER_BG[t], color:TIER_FG[t] }}
            title={`${label}\nFFDR ${d.toFixed(2)} — ${TIER_NAME[t]}`
              + `\nFDR ${use.fdr}${fxs.length > 1 ? "\n" + "DOUBLE GAMEWEEK" : ""}`}>
            {oppLabel(opp, use.home)}{fxs.length > 1 ? "⧫" : ""}
          </div>
        );
      })}
    </div>
  );
}

function FixChip({ fx, teamById, diff, pos }) {
  if (!fx) return <div style={S.noFix}>—</div>;
  const opp = teamById[fx.opp]?.short || "?";
  const d = diff != null ? diff : fx.fdr;
  /* ALGILT þrep — aldrei afstætt innan liðs. Sjá skýringuna þar sem
     ffdrRange/tierRel voru fjarlægð (mælt á 28.355 leikmanna-umferðum). */
  const t = tierOf(d);
  const bg = TIER_BG[t], fg = TIER_FG[t];
  return (
    <div style={{ ...S.fixChip, background:bg, color:fg }}
      title={diff != null
        ? interp("{0} — absolute scale, comparable between teams", [TIER_NAME[t]])
          + `\nFFDR ${d}`
          + `\nFDR ${fx.fdr} · ${fx.home ? "home" : "away"}`
        : `FDR ${fx.fdr}`}>
      {oppLabel(opp, fx.home)}
      {diff != null && <span style={S.fixNum}>{d.toFixed(1)}</span>}
    </div>
  );
}

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
    if (!iso) return "Not scheduled";
    const d = new Date(iso);
    return `${DAYS[d.getDay()]} ${d.getDate()}. ${MON[d.getMonth()]}`;
  };
  const timeLbl = iso => {
    if (!iso) return "—";
    const d = new Date(iso);
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
            const scorers = side => [
              ...(L?.[side]?.goals || []).map(id => `⚽ ${nameOf ? nameOf(id) : id}`),
              ...(L?.[side]?.assists || []).map(id => `↗ ${nameOf ? nameOf(id) : id}`),
            ];
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
                      const sc = scorers(sd);
                      return sc.length ? <div key={sd}><b>{sh}</b> {sc.join(" · ")}</div> : null;
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
function FfdrTable({ teams, fixByTeamGw, teamById, diffOf, crestFor, from, span, maxGw, onPickTeam }) {
  const [pos, setPos] = useState(2);   // 2 = varnar-hópur, 4 = sóknar-hópur
  const gws = Array.from({ length: span }, (_, i) => from + i).filter(g => g <= maxGw);
  const rows = (teams || []).map(t => {
    const cells = gws.map(g => {
      const fxs = fixByTeamGw[t.id]?.[g] || [];
      if (!fxs.length) return { blank: true };
      return {
        multi: fxs.length > 1,
        items: fxs.map(f => ({ f, d: diffOf(t.id, f, pos) ?? f.fdr })),
      };
    });
    const vals = cells.flatMap(c => c.items ? c.items.map(x => x.d) : []);
    return { t, cells, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
             played: vals.length };
  }).sort((a, z) => (a.avg ?? 9) - (z.avg ?? 9));
  const POSB = [[2,"DEFENCE"],[4,"ATTACK"]];   // tveir hópar — GK+DEF og MID+FWD
  return (
    <section style={S.card}>
      <div style={S.recHead}>
        <h2 style={S.h2}>{"FFDR — fixture difficulty"}</h2>
        <div style={S.ffdrPos}>
          {POSB.map(([v,l]) => (
            <button key={v} style={{ ...S.ffdrPosBtn, ...(pos === v ? S.ffdrPosOn : {}) }}
              onClick={() => setPos(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div style={S.muted}>
        GW{gws[0]}–{gws[gws.length-1]} {"· sorted by average FFDR (easiest on top)."}
        <b> {"This is an ABSOLUTE scale"}</b> {"— comparable between teams, so a weak team is red even in an easy match. That is right for \"who should I buy\". The fixture tiles on player cards are"} <b>{"relative within the team"}</b> {"— for \"when should I play him\"."}
      </div>
      <div style={S.ffdrScroll}>
        <table style={S.ffdrTable}>
          <thead>
            <tr>
              <th style={{ ...S.ffdrTh, ...S.ffdrThTeam }}>{"Team"}</th>
              {gws.map(g => <th key={g} style={S.ffdrTh}>{g}</th>)}
              <th style={S.ffdrTh} title={"Average over the range"}>{"Avg."}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ t, cells, avg }) => {
          /* GRAEN RUNA — 3+ LEIKIR I ROD I GRAENU THREPI FA RAMMA.
             Reiknad A RODINNI, ekki i holfinu: holf veit ekkert um
             nagranna sina. Sjalf reglan er i model.js (`greenRuns`) af
             somu astaedu og allt annad reiknad — profin keyra sama kodann.  */
          const run = greenRuns(cells.map(c => c.blank ? null
            : tierOf(Math.max(...c.items.map(x => x.d)))));
          return (
              <tr key={t.id}>
                <td style={S.ffdrTeamCell}>
                  <button style={S.ffdrTeamBtn} onClick={() => onPickTeam && onPickTeam(t.id)}>
                    <Crest team={t} size={13} />{t.short}
                  </button>
                </td>
                {cells.map((c, i) => {
                  if (c.blank) return <td key={i} style={S.ffdrBlank} title={"Blank gameweek"}>—</td>;
                  const worst = Math.max(...c.items.map(x => x.d));
                  const tier = tierOf(worst);
                  const r = run[i];
                  return (
                    <td key={i} style={{ ...S.ffdrTd, background: TIER_BG[tier], color: TIER_FG[tier],
                          ...(r ? {
                            borderTopColor: C.green, borderBottomColor: C.green,
                            ...(r.first ? { borderLeftColor: C.green } : {}),
                            ...(r.last ? { borderRightColor: C.green } : {}),
                            borderTopLeftRadius: r.first ? 5 : 0, borderBottomLeftRadius: r.first ? 5 : 0,
                            borderTopRightRadius: r.last ? 5 : 0, borderBottomRightRadius: r.last ? 5 : 0,
                          } : {}) }}
                      title={(r ? `${r.len} easy gameweeks in a row — ` : "")
                        + c.items.map(x => `${teamById[x.f.opp]?.short}${x.f.home ? " (h)" : " (a)"} · ${x.d}`).join("  |  ")}>
                      {c.items.map((x, k) => (
                        <span key={k} style={S.ffdrOpp}>
                          {teamById[x.f.opp]?.short || "?"}{x.f.home ? "" : <i style={S.ffdrAway}>{"a"}</i>}
                        </span>
                      ))}
                      {c.multi && <span style={S.ffdrDouble}>×2</span>}
                    </td>
                  );
                })}
                <td style={S.ffdrAvg}>{avg == null ? "—" : avg.toFixed(2)}</td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
      <div style={S.ffdrLegend}>
        {TIER_NAME.map((n, i) => (
          <span key={n} style={{ ...S.ffdrChip, background: TIER_BG[i], color: TIER_FG[i] }}>{n}</span>
        ))}
      </div>
    </section>
  );
}

function PlayerCard({ s, p, team, teamById, fx, bench, captain, vice, csFor, xgaFor,
  crestFor, dc, elo, gwNow, sellTenths_, diffOf, isPlanned, isSellHint,
  onInfo, onTransfer, onRotation, onCardClick, swapSel, confirmed, fxNext3, seasonStarted, seasonGames, ep, cumLabel, dragId, setDragId, onDropPlayer }) {
  if (!p) return null;
  const isCap = p.id === captain, isVice = p.id === vice;
  const isDef = p.element_type <= 2;
  const dragging = dragId === p.id;
  const csObj = isDef ? csFor(p.team, fx) : null;
  const csColor = csObj?.cs == null ? C.text3 : csObj.cs >= 40 ? C.green : csObj.cs >= 25 ? C.amber : C.red;
  const av = availOf(p);
  const ban = banRisk(p, gwNow, seasonStarted);
  const rot = rotationRisk(p, seasonGames);
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
        opacity: dragging ? 0.4 : (isSellHint ? 0.62 : 1),
        /* HRINGUR UM SPJALDID thegar madurinn er EKKI til leiks. Merkid eitt
           er 15px og drukknar innan um myndina; hringurinn sest a einu
           augabragdi yfir allan vollinn. `inset` svo hann breyti ekki
           uppsetningu (spjoldin eru i flæði, sja kafla 8 i CLAUDE.md).    */
        boxShadow: av.isRisk
          ? `inset 0 0 0 2px ${av.solid || "#d92d3c"}${av.chance === 0 ? "" : "99"}`
          : undefined,
        // VALINN til skipta fær sterkan ramma; plönuð viðbót punktalínu
        outline: swapSel === p.id ? `2px solid ${C.purple}`
               : isPlanned ? `2px dashed ${C.green}` : "none",
        outlineOffset: swapSel === p.id ? 2 : (isPlanned ? 1 : 0),
      }}
      title={swapSel === p.id ? "Selected — click another to swap"
             : "Click to swap with another player"}>
      {/* IKON — sér aðgerðir. Smellur á spjaldið er SKIPTI. */}
      {/* "i" ER VINSTRA MEGIN. Thrju ikon i sama horni voru trodin og
          spjaldid er adeins clamp(62px, 17.5%, 100px) breitt. Vinstra
          hornid var laust nema tha midjuflaggid (availBadge) se til —
          thad er faert til hlidar vid ikonid i stad thess ad liggja undir. */}
      <div style={S.pcIconsL}>
        <button style={S.pcIcon} title={"Information"}
          onClick={e => { e.stopPropagation(); onInfo && onInfo(); }}>i</button>
        {/* FYRIRLIDA-MERKID ER HER, VINSTRA MEGIN (beidni 7.8.2026).
            Adur sat thad `position:absolute top:4 right:4` — NAKVAEMLEGA
            undir ⇄/↻-ikonunum (zIndex 2 a moti 3), svo C-id a Haaland
            var OSYNILEGT. I flex-rodinni vinstra megin getur thad ekki
            legid undir neinu. availBadge (meidsli) faerist til hlidar
            a moti, sja `availLeft`.                                    */}
        {isCap && <span style={{ ...S.bandFlow, background:"#ffd23f", color:"#4a3800" }}
          title={"Captain — double points"}>C</span>}
        {isVice && <span style={{ ...S.bandFlow, background:"#c9c9d0", color:"#33333a" }}
          title={"Vice-captain — takes over if the captain does not play"}>V</span>}
      </div>
      <div style={S.pcIcons}>
        <button style={{ ...S.pcIcon, ...S.pcIconSwap }} title={"Transfer out — opens search"}
          onClick={e => { e.stopPropagation(); onTransfer && onTransfer(); }}>⇄</button>
        {/* FFDR-SAMANBURDUR — hver kemur inn fyrir hann i ERFIDU umferdunum.
            Adskilid frá ⇄ (sem er skipti) og frá i (sem er upplysingar).   */}
        <button style={{ ...S.pcIcon, ...S.pcIconRot }}
          title={"FFDR comparison — find a player with easy gameweeks where his are hard"}
          onClick={e => { e.stopPropagation(); onRotation && onRotation(); }}>↻</button>
      </div>
      {av.isRisk && (
        <span style={{ ...S.availBadge, left: isCap || isVice ? 38 : 21,
                       background:av.solid || av.bg,
                       color:av.solid ? "#fff" : av.color }}
          title={`${av.label}${av.chance != null ? interp(" — {0}% chance", [av.chance]) : ""}${av.news ? `\n${av.news}` : ""}`}>
          {av.short}{av.chance != null && av.chance > 0 ? av.chance : ""}
        </span>
      )}
      <div style={S.pPortrait}
        title={interp("{0}{1}NOTE: the FPL photo can show an OLD club after a transfer. The crest is right.", [team?.name || "?", "\n"])}>
        <PlayerImg code={p.code} short={team?.short} size={38} />
        {/* Merkið er ÓTVÍRÆÐA félags-vísbendingin — stærra og með hvítum
            baug svo það lesist yfir myndinni, sem getur verið úrelt.       */}
        <Crest team={team} size={18} style={S.pCrest} />
      </div>
      <div style={S.pName}>{p.web_name}</div>
      <div style={S.pPrice}>
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

function RecCard({ r, team, teamById, dc, elo, crestFor, csFor, diffOf, range, onAdd }) {
  const { p, fxs } = r;
  const isDef = p.element_type <= 2;
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
        {fxs.slice(0, range || 6).map((f,i) => {
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
            const vals = fxs.map(f => csFor(p.team, f).cs).filter(v => Number.isFinite(v));
            /* VILLA SEM VAR: "|| 0" taldi vantandi CS sem NULL og dro
               medaltalid nidur — Raya syndi 9% thegar laegsta mogulega er 15%.
               Vantandi gildum er SLEPPT, og "—" ef ekkert er til.           */
            chips.push(["CS expectation", vals.length
              ? `${Math.round(vals.reduce((a, v) => a + v, 0) / vals.length)}%` : "—",
              "Average clean-sheet probability over the range — for the TEAM. The player only gets the points if he plays 60+ mins."]);
            if (dc) chips.push(["DC", dc.defcon_opportunity,
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
const S = {
  shell: { fontFamily:sans, background:C.page, color:C.text, minHeight:"100vh", padding:"14px 16px 40px", maxWidth:1280, margin:"0 auto" },
  loading: { padding:40, textAlign:"center", color:C.text2, fontFamily:mono },
  errBox: { padding:20, background:C.redBg, border:`1px solid ${C.red}`, borderRadius:10, color:"#7a1520" },

  head: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:14, flexWrap:"wrap" },
  headRight: { display:"flex", gap:8, alignItems:"center" },
  connMsg: { margin:"6px 0 0", padding:"5px 9px", borderRadius:6, fontSize:11.5,
    lineHeight:1.5, maxWidth:"100%" },
  connHint: { opacity:0.85, fontFamily:mono, fontSize:10.5 },
  urlInput: { background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 11px", fontSize:13, color:C.text, width:210, outline:"none" },
  searchBtn: { background:C.card, border:`1px solid ${C.borderStrong}`, borderRadius:8, padding:"8px 12px", fontSize:12.5, color:C.text, cursor:"pointer", whiteSpace:"nowrap" },
  connectBtn: { background:C.purple, color:"#fff", border:"none", borderRadius:8, padding:"9px 14px", fontSize:13, fontWeight:600, cursor:"pointer" },

  cmpFab: { position:"fixed", right:16, bottom:16, zIndex:60, border:"none",
            background:C.purple, color:"#fff", borderRadius:22, padding:"10px 16px",
            fontSize:13, fontWeight:600, cursor:"pointer",
            boxShadow:"0 6px 20px rgba(55,0,60,0.35)" },
  viewTabs: { display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" },
  viewTab: { border:`1px solid ${C.border}`, background:C.card, color:C.text2,
             borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, cursor:"pointer" },
  viewTabOn: { background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  /* Ikonid stendur thar sem emoji-in stada i hinum flipunum: sama bil (6px)
     svo hausrodin lesist jofn thott eitt taknid se teiknad og fjogur ekki. */
  viewTabIcon: { display:"inline-flex", alignItems:"center", gap:6 },
  tlWrap: { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:12 },
  // lína gegnum hnútana — teiknuð sem bakgrunnur á röðinni
  tlOuter: { display:"flex", alignItems:"flex-end", gap:6 },
  tlArrow: { width:22, height:26, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:15, lineHeight:1, cursor:"pointer", background:C.cardAlt, color:C.purple,
    border:`1px solid ${C.border}`, borderRadius:7, padding:0, marginBottom:1 },
  tlArrowOff: { opacity:0.3, cursor:"default", color:C.text3 },
  /* Röðin FYLLIR breiddina og hnútarnir deila henni jafnt (flex:1 á nodeCol).
     Þannig spannar línan allan skjáinn í staðinn fyrir að hanga vinstra megin. */
  tlRow: { flex:1, minWidth:0, position:"relative", display:"flex", alignItems:"flex-end", gap:3 },
  tlLine: { position:"absolute", left:0, right:0, bottom:15, height:2, background:C.border, borderRadius:1, zIndex:0 },
  nodeCol: { flex:"1 1 0", minWidth:0, position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 },
  chipSlotAbove: { height:17, display:"flex", alignItems:"center" },
  chipAbove: { display:"flex", alignItems:"center", gap:2, color:"#fff", borderRadius:5, padding:"1px 4px", lineHeight:1.3, boxShadow:"0 1px 3px rgba(0,0,0,0.18)" },
  chipAboveIcon: { fontFamily:mono, fontSize:9, fontWeight:700 },
  chipAboveTxt: { fontFamily:mono, fontSize:8.5, fontWeight:700, letterSpacing:0.2 },
  // width:100% -> hnúturinn fyllir kólumnuna sína, svo röðin nær yfir allan skjáinn
  node: { position:"relative", zIndex:1, width:"100%", minWidth:26, height:32, borderRadius:8,
    border:`1px solid ${C.border}`, background:C.cardAlt, cursor:"pointer", fontFamily:mono,
    fontSize:12, color:C.text2, padding:0 },
  nodeOn: { background:C.purple, color:"#fff", border:`1px solid ${C.purple}`, fontWeight:700 },
  nodeNum: { position:"relative", zIndex:1 },
  nodeDot: { position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background:"#f59e0b" },
  intl: { flexShrink:0, position:"relative", zIndex:2, display:"inline-flex", alignItems:"center", alignSelf:"flex-end", marginBottom:5 },
  globe: { display:"inline-flex", alignItems:"center", justifyContent:"center", width:18, height:18, borderRadius:"50%", background:C.card, border:`1px solid ${C.border}`, fontSize:10, boxShadow:`0 0 0 3px ${C.card}` },
  resetAllRow: { marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}` },
  resetBtn: { marginLeft:10, fontFamily:sans, fontSize:9.5, cursor:"pointer",
    background:C.cardAlt, color:C.text2, border:`1px solid ${C.border}`,
    borderRadius:6, padding:"2px 7px" },
  resetConfirm: { marginLeft:10, display:"inline-flex", alignItems:"center", gap:5,
    fontSize:9.5, color:"#a01f2b", background:C.redBg, border:`1px solid ${C.red}`,
    borderRadius:6, padding:"2px 6px" },
  resetYes: { fontFamily:sans, fontSize:9.5, fontWeight:700, cursor:"pointer",
    background:C.red, color:"#fff", border:"none", borderRadius:4, padding:"1px 7px" },
  resetNo: { fontFamily:sans, fontSize:9.5, cursor:"pointer",
    background:C.card, color:C.text2, border:`1px solid ${C.border}`, borderRadius:4, padding:"1px 7px" },
  deadline: { marginTop:9, fontSize:12, color:C.text2, fontFamily:mono },

  tcFree: { marginLeft:8, color:"#0a7a4a", fontWeight:600 },
  tcOk: { marginLeft:8, color:C.text2 },
  tcHit: { marginLeft:8, color:C.red, fontWeight:700 },
  preSeasonBar: { marginTop:9, background:"#f1e9ff", border:`1px solid #d9c8f5`, borderRadius:8, padding:"8px 10px", fontSize:11.5, color:"#4a1a6b", lineHeight:1.5 },
  nodeHit: { position:"absolute", bottom:-7, left:"50%", transform:"translateX(-50%)", fontFamily:mono, fontSize:8, fontWeight:700, color:"#fff", background:C.red, padding:"0 3px", borderRadius:3, lineHeight:1.4 },
  planFh: { fontFamily:mono, fontSize:8.5, fontWeight:700, color:"#fff", background:"#2563eb",
    borderRadius:4, padding:"1px 4px" },
  planGwHit: { background:C.redBg, border:`1px solid ${C.red}`, color:"#a01f2b", fontWeight:700 },
  stats: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 },
  statCard: { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"11px 12px", textAlign:"center" },
  statLbl: { fontFamily:mono, fontSize:10, letterSpacing:0.8, textTransform:"uppercase", color:C.text3 },
  statVal: { fontFamily:mono, fontSize:23, fontWeight:700, marginTop:2 },
  statSub: { fontSize:10.5, color:C.text3, marginTop:1 },


  main: { display:"grid", gridTemplateColumns:"minmax(0,1fr) 320px", gap:14, alignItems:"start" },
  // völlur + leikir hlið við hlið; völlurinn MINNI en áður
  searchBtnOn: { background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  /* Tungumals-vixlarinn: same haed sem hnapparnir vid hlidina (36 px) svo
     hausinn haldi einni linu. Fastri breidd a hvern hnapp (34 px) er haldid
     svo "IS"/"EN" hoppi ekki til nar valid breytist.                     */
  langWrap: { display:"flex", border:`1px solid ${C.borderStrong}`, borderRadius:8,
              overflow:"hidden", background:C.card, flexShrink:0 },
  langBtn: { width:34, padding:"8px 0", border:"none", background:"transparent",
             fontSize:11.5, fontWeight:600, letterSpacing:0.3, color:C.text2,
             cursor:"pointer", lineHeight:1.2 },
  langOn: { background:C.purple, color:"#fff" },
  ffdrPos: { display:"flex", gap:3 },
  ffdrPosBtn: { fontFamily:mono, fontSize:9, fontWeight:700, letterSpacing:0.3, cursor:"pointer",
    padding:"3px 7px", background:C.cardAlt, color:C.text2, border:`1px solid ${C.border}`, borderRadius:6 },
  ffdrPosOn: { background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  ffdrScroll: { overflowX:"auto", marginTop:8, paddingBottom:2 },
  /* BORDERSPACING VAR 2 OG ER NU 0 MED 1px GAGNSAEUM RAMMA A HVERJU HOLFI.
     Rumfraedin er ONBREYTT (1+1 = somu 2px milli holfa) en graeni ramminn
     um graena runu verdur SAMFELLDUR: raendur naest-liggjandi holfa
     SNERTAST i stad thess ad hafa 2px gat, sem hefdi litid ut eins og
     strikalina en ekki rammi. `backgroundClip:"padding-box"` heldur
     lit-flotinu innan vid rammann.
     BREIDDIN ER 2px (bil milli holfa = 4px, var 2). Med 1px var taflan
     of thett thegar graeni ramminn baettist ofan a hana — holfin i runu
     lasust sem EINN klumpur i stad thriggja leikja. Bilid er thad sem
     gerir rununa laesilega, ekki ramminn einn.                          */
  ffdrTable: { borderCollapse:"separate", borderSpacing:0, fontSize:9.5, width:"100%" },
  ffdrTh: { fontFamily:mono, fontSize:8.5, fontWeight:700, color:C.text3, textAlign:"center",
    padding:"1px 3px", minWidth:34, border:"2px solid transparent", backgroundClip:"padding-box" },
  ffdrThTeam: { textAlign:"left", minWidth:58, position:"sticky", left:0, background:C.card, zIndex:1 },
  ffdrTeamCell: { position:"sticky", left:0, background:C.card, zIndex:1, padding:0 },
  ffdrTeamBtn: { display:"flex", alignItems:"center", gap:4, width:"100%", cursor:"pointer",
    fontFamily:mono, fontSize:10, fontWeight:700, color:C.text, background:"none", border:"none", padding:"2px 3px" },
  ffdrOpp: { display:"block" },
  ffdrAway: { fontStyle:"normal", fontSize:7, opacity:0.7, marginLeft:1 },
  ffdrDouble: { display:"block", fontSize:7, opacity:0.8 },
  ffdrBlank: { textAlign:"center", padding:"3px 2px", borderRadius:5, background:C.cardAlt,
    color:C.text3, fontFamily:mono, fontSize:9,     border:"2px solid transparent", backgroundClip:"padding-box" },
  ffdrAvg: { textAlign:"center", padding:"3px 4px", fontFamily:mono, fontSize:9.5, fontWeight:700,
    color:C.text2, background:C.cardAlt, borderRadius:5,     border:"2px solid transparent", backgroundClip:"padding-box" },
  ffdrLegend: { display:"flex", gap:4, flexWrap:"wrap", marginTop:8, paddingTop:7, borderTop:`1px solid ${C.border}` },
  ffdrChip: { fontFamily:mono, fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:4 },
  /* Breiddin kemur úr grid-dálki pitchSplit — flex/minWidth hér áður
     YFIRFLÆDDI 164px dálkinn (leifar frá því þetta var flexbox). */
  gfWrap: { boxSizing:"border-box", minWidth:0,
    background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
    padding:"12px 13px", position:"sticky", top:8 },
  gfHead: { display:"flex", alignItems:"center", gap:6, fontFamily:mono, fontSize:9.5, textTransform:"uppercase", letterSpacing:0.7, color:C.purple, fontWeight:700, marginBottom:7 },
  gfCount: { fontWeight:400, color:C.text3, letterSpacing:0, marginLeft:"auto" },
  gfDay: { marginTop:7 },
  gfDayLbl: { fontFamily:mono, fontSize:9.5, textTransform:"uppercase", letterSpacing:0.6,
    color:C.text3, padding:"4px 0 4px", borderTop:`1px solid ${C.border}` },
  /* Röðin er grid: [heimapilla → hægri] [tími] [útipilla ← vinstri].
     Áður þandi hvor "hlið" sig yfir hálfa breiddina með lit — leit út
     eins og málningarklessur. Nú situr liturinn á pillunni sjálfri. */
  gfMatch: { display:"grid", gridTemplateColumns:"1fr 58px 1fr", alignItems:"center",
    gap:4, padding:"2px 0" },
  gfCellL: { display:"flex", justifyContent:"flex-end", minWidth:0 },
  gfCellR: { display:"flex", justifyContent:"flex-start", minWidth:0 },
  gfPill: { display:"inline-flex", alignItems:"center", gap:4, cursor:"pointer",
    background:C.cardAlt, border:"none", borderRadius:6, padding:"3px 7px" },
  gfShort: { fontFamily:mono, fontSize:12.5, fontWeight:700 },
  gfMid: { minWidth:54, textAlign:"center", fontFamily:mono, fontSize:12, fontWeight:600,
    color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:5,
    padding:"2px 3px", cursor:"default" },
  gfMidLive: { background:C.redBg, color:"#a01f2b", fontWeight:700, border:`1px solid ${C.red}` },
  gfMidOpen: { cursor:"pointer", color:C.purple },
  gfDetail: { gridColumn:"1 / -1", marginTop:2, fontSize:8.5, lineHeight:1.5, color:C.text2 },
  gfEmpty: { fontSize:11, color:C.text3, padding:"6px 0" },
  /* Völlur + leikjalisti hlið við hlið. Seinni dálkurinn VERÐUR að rúma
     gfWrap — fastur 164px dálkur með minWidth:280 á innihaldinu olli
     yfirflæði sem braut útlitið. Á smáum skjám brotnar þetta í eina
     súlu í src/styles.css.                                                */
  pitchSplit: { display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(280px,340px)", gap:10, alignItems:"start", marginBottom:12 },
  // Völlurinn fyllir dálkinn sinn (ekkert þak lengur — skelin breikkaði í
  // 1280 og leikjalistinn fékk sinn fasta dálk, svo þeir slást ekki um pláss).
  pitchCol: { minWidth:0 },
  side: { display:"flex", flexDirection:"column", gap:12 },

  capBar: { display:"flex", gap:8, alignItems:"center", marginBottom:9 },
  capBox: { display:"flex", alignItems:"center", gap:6, background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px" },
  capBadge: { width:20, height:20, borderRadius:"50%", background:"#ffd23f", color:"#4a3800", fontFamily:mono, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  capSel: { border:"none", background:"transparent", fontSize:12.5, color:C.text, outline:"none", maxWidth:120 },
  ghost: { background:"transparent", border:`1px solid ${C.border}`, borderRadius:7, padding:"6px 10px", fontSize:11.5, color:C.text2, cursor:"pointer" },

  /* Raðirnar deila plássinu jafnt; völlurinn vex ef þarf (sjá Pitch.jsx) */
  rowsArea: { flex:"1 0 auto", display:"flex", flexDirection:"column",
    justifyContent:"space-evenly", gap:6, padding:"10px 6px 12px" },
  pitchRowFlex: { display:"flex", justifyContent:"center", gap:6, flexWrap:"nowrap", padding:"0 2px" },
  benchArea: { flex:"0 0 auto", background:"rgba(9,24,15,0.78)",
    borderTop:"1.6px dashed rgba(234,243,236,0.35)", padding:"7px 8px 10px" },
  benchLabel: { fontFamily:mono, fontSize:9, letterSpacing:1, textTransform:"uppercase",
    color:"rgba(234,243,236,0.55)", marginBottom:4 },

  pCard: { position:"relative", width:"clamp(62px, 17.5%, 100px)", background:C.card,
    border:`1px solid rgba(255,255,255,0.5)`, borderRadius:9, padding:"6px 4px 6px",
    textAlign:"center", cursor:"pointer", boxShadow:"0 2px 6px rgba(0,0,0,0.28)",
    flexShrink:1, minWidth:0 },
  pCardBench: { background:"rgba(255,255,255,0.94)" },
  pcIcons: { position:"absolute", top:2, right:2, display:"flex", gap:2, zIndex:3 },
  pcIconsL: { position:"absolute", top:2, left:2, display:"flex", gap:2, zIndex:3 },
  pcIcon: { width:15, height:15, padding:0, display:"flex", alignItems:"center", justifyContent:"center",
    fontFamily:mono, fontSize:9, fontWeight:700, lineHeight:1, cursor:"pointer",
    background:"rgba(255,255,255,0.92)", color:C.text2, border:`1px solid ${C.border}`,
    borderRadius:4, boxShadow:"0 1px 2px rgba(0,0,0,0.10)" },
  pcIconSwap: { color:C.purple, border:"1px solid #d9c8f5", fontSize:10 },
  /* FFDR-samanburdur: gron umgjord svo hun se ekki misskilin sem skipti. */
  pcIconRot: { color:"#046b41", border:"1px solid #b7e6cd", fontSize:10 },
  band: { position:"absolute", top:4, right:4, minWidth:15, height:15, borderRadius:8, fontFamily:mono, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", zIndex:2 },
  /* Sama utlit og `band` en I FLAEDI (pcIconsL) i stad absolute — thannig
     getur merkid ekki lent undir odru ikoni. Sja skyringu vid notkun.  */
  bandFlow: { minWidth:15, height:15, borderRadius:8, fontFamily:mono, fontSize:9,
    fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center",
    flexShrink:0, boxShadow:"0 1px 2px rgba(0,0,0,0.10)" },
  pPortrait: { position:"relative", height:34, display:"flex", alignItems:"flex-end", justifyContent:"center", marginBottom:2 },
  pCrest: { position:"absolute", bottom:-3, right:4, width:18, height:18, objectFit:"contain",
    background:"#fff", borderRadius:"50%", padding:1,
    boxShadow:"0 0 0 1.5px #fff, 0 1px 3px rgba(0,0,0,0.28)" },
  pName: { fontSize:11, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  pPrice: { fontFamily:mono, fontSize:10.5, color:C.text2 },
  pEp: { fontFamily:mono, fontSize:12, fontWeight:700, color:C.purple },
  pCsSmall: { fontFamily:mono, fontSize:8.5, fontWeight:700, marginLeft:4 },
  fixChip: { display:"inline-block", fontFamily:mono, fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:5, margin:"4px 0 1px" },
  /* WRAP, EKKI CLIP — og thad er kjarninn. Fyrsta utgafa hafdi
     flexWrap:"nowrap" + overflow:"hidden": i simabreidd (spjald 73px) fóru
     flisarnar i 16px thott "NEW" thurfi 21px, svo SIDASTI STAFURINN VAR
     KLIPPTUR AF OLLUM NIU flisum sem maeldar voru. Yfirflaedi-profid sagdi
     "ekkert yfirflaedi" thvi klipping ER ekki yfirflaedi — thad fannst
     adeins med thvi ad bera scrollWidth vid clientWidth per flis.
     Nu vefjast thaer i tvaer linur i stad thess ad klippast, og
     overflow:hidden er FARID svo thogul klipping se ekki moguleg aftur.  */
  fixStrip: { display:"flex", gap:2, justifyContent:"center", alignItems:"center",
    margin:"4px 0 1px", flexWrap:"wrap", rowGap:2 },
  fixMini: { fontFamily:mono, fontSize:8.5, fontWeight:700, padding:"2px 2px",
    borderRadius:4, whiteSpace:"nowrap", flex:"0 0 auto" },
  fixBlank: { background:"#f1f1f4", color:C.text3 },
  fixNum: { fontSize:7.5, opacity:0.7, marginLeft:3, fontWeight:400 },
  noFix: { fontFamily:mono, fontSize:10, color:C.text3, margin:"4px 0" },

  card: { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px" },
  h2: { fontSize:13.5, fontWeight:700, margin:"0 0 8px", color:C.purple },
  muted: { fontSize:11, color:C.text3, marginBottom:8, lineHeight:1.5 },

  planItem: { display:"flex", alignItems:"center", gap:8, fontSize:12.5, padding:"6px 0", borderTop:`1px solid ${C.border}` },
  planGw: { fontFamily:mono, fontSize:10.5, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:5, padding:"2px 5px", color:C.text2 },
  planTotal: { fontFamily:mono, fontSize:12 },
  planCalc: { fontFamily:mono, fontSize:10.5, color:C.text3, minWidth:32, textAlign:"right" },
  planHitVal: { fontFamily:mono, fontSize:10.5, color:C.red, minWidth:22, textAlign:"right" },
  planNet: { fontFamily:mono, fontSize:12, fontWeight:700, minWidth:34, textAlign:"right" },
  rm: { background:"transparent", border:"none", color:C.text3, cursor:"pointer", fontSize:12 },

  chipHalfLbl: { display:"flex", alignItems:"baseline", gap:6, fontFamily:mono, fontSize:9.5, textTransform:"uppercase", letterSpacing:0.7, color:C.purple, fontWeight:700, marginTop:10, paddingTop:6, borderTop:`1px solid ${C.border}` },
  chipExpiry: { fontWeight:400, letterSpacing:0, color:C.text3, marginLeft:"auto", fontSize:9 },
  chipExpired: { color:C.red, fontWeight:700 },
  chipHalfRange: { fontWeight:400, color:C.text3, letterSpacing:0 },
  chipRow: { display:"flex", alignItems:"center", gap:9, padding:"6px 0" },
  chipIcon: { width:24, height:24, borderRadius:6, color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontFamily:mono },
  chipName: { fontSize:12.5, fontWeight:600 },
  chipDesc: { fontSize:10, color:C.text3 },
  chipSel: { background:C.card, border:`1px solid ${C.border}`, borderRadius:7, padding:"4px 6px", fontSize:11.5, color:C.text, outline:"none" },

  moveRow: { display:"flex", alignItems:"center", gap:6, fontSize:12, padding:"4px 0", borderTop:`1px solid ${C.border}` },
  moveName: { flex:1, minWidth:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  moveTeam: { fontFamily:mono, fontSize:9.5, color:C.text3 },
  moveNet: { fontFamily:mono, fontSize:11, color:C.green, minWidth:44, textAlign:"right" },
  moveChg: { fontFamily:mono, fontSize:10, minWidth:44, textAlign:"right" },
  movePredict: { fontFamily:mono, fontSize:9.5, fontWeight:700, color:C.green },
  moveSep: { fontFamily:mono, fontSize:10, textTransform:"uppercase", letterSpacing:0.8, color:C.text3, marginTop:9, paddingTop:6, borderTop:`1px solid ${C.border}` },

  rivalAddRow: { display:"flex", gap:6, marginBottom:8 },
  rivalBlock: { borderTop:`1px solid ${C.border}`, padding:"7px 0" },
  rivalRow: { display:"flex", alignItems:"center", gap:7 },
  rivalName: { fontWeight:700, fontSize:12.5, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  rivalPts: { fontFamily:mono, fontSize:10.5, color:C.text2, flexShrink:0 },
  rivalMeta: { fontSize:10.5, color:C.text3, marginTop:2 },
  rivalDiff: { display:"flex", alignItems:"center", gap:4, flexWrap:"wrap", marginTop:4 },
  rivalDiffLbl: { fontFamily:mono, fontSize:8.5, textTransform:"uppercase", letterSpacing:0.5, color:C.text3, marginRight:2 },
  rivalChip: { fontSize:10.5, fontWeight:600, background:C.cardAlt, border:`1px solid ${C.border}`,
    borderRadius:5, padding:"1px 6px", cursor:"pointer" },
  srcRow: { display:"flex", alignItems:"center", gap:7, fontSize:11.5, color:C.text2, padding:"3px 0" },
  dotErr: { width:6, height:6, borderRadius:"50%", background:C.red, flex:"0 0 6px" },
  dotOk: { width:7, height:7, borderRadius:"50%", background:C.green, flexShrink:0 },
  tblHead: { display:"flex", alignItems:"center", gap:4, fontFamily:mono, fontSize:9, textTransform:"uppercase", letterSpacing:0.6, color:C.text3, paddingBottom:4, borderBottom:`1px solid ${C.border}` },
  tblRow: { display:"flex", alignItems:"center", gap:4, padding:"3px 0", borderBottom:`1px solid ${C.page}` },
  // ffdrCell = <span> í leikmanns-yfirliti (inline-block)
  ffdrCell: { display:"inline-block", minWidth:32, textAlign:"center", fontFamily:mono,
    fontSize:10, fontWeight:700, padding:"1px 4px", borderRadius:4 },
  // ffdrTd = <td> í FFDR-töflunni. MÁ EKKI vera inline-block — brýtur töfluna.
  ffdrTd: { textAlign:"center", padding:"3px 2px", borderRadius:5, fontFamily:mono,
    fontSize:9, fontWeight:700, whiteSpace:"nowrap", lineHeight:1.25,
    border:"2px solid transparent", backgroundClip:"padding-box" },
  tblNum: { width:46, textAlign:"right", fontFamily:mono, fontSize:11, color:C.text2, position:"relative" },
  /* left 21 (var 4): "i"-ikonid situr nu i vinstra horninu. */
  /* fontSize 8,5 -> 10 og hvitur baugur svo merkid lesist yfir myndinni. */
  availBadge: { position:"absolute", top:3, left:21, fontFamily:mono, fontSize:10,
    fontWeight:800, padding:"1px 4px", borderRadius:4, lineHeight:1.35, zIndex:4,
    boxShadow:"0 0 0 1.5px #fff, 0 1px 2px rgba(0,0,0,0.25)" },
  sAvail: { fontFamily:mono, fontSize:8.5, fontWeight:700, padding:"1px 4px", borderRadius:4, marginLeft:5 },
  sPen: { fontFamily:mono, fontSize:8, fontWeight:700, padding:"1px 3px", borderRadius:4, background:"#e6f9f0", color:"#0a7a4a", marginLeft:4 },
  okBox: { background:C.greenBg, color:"#0a7a4a", borderRadius:8, padding:"8px 10px", fontSize:12 },
  riskRow: { display:"flex", alignItems:"center", gap:7, padding:"5px 0", borderTop:`1px solid ${C.border}`, fontSize:11.5 },
  riskTag: { fontFamily:mono, fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:4, flexShrink:0, whiteSpace:"nowrap" },
  riskName: { fontWeight:600, flexShrink:0 },
  riskNews: { color:C.text3, fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  pMain: { marginTop:2 },
  sigRow: { display:"flex", gap:3, justifyContent:"center", flexWrap:"wrap", marginTop:3, minHeight:11 },
  confBadge: { position:"absolute", left:2, right:2, bottom:2, color:"#fff",
    fontFamily:mono, fontSize:8.5, fontWeight:800, letterSpacing:0.3,
    textAlign:"center", borderRadius:3, padding:"1px 0", zIndex:4 },
  sigSet: { fontFamily:mono, fontSize:8, fontWeight:700, padding:"1px 3px", borderRadius:4,
            background:C.cardAlt, color:C.text2, border:`1px solid ${C.border}` },
  sigSetFirst: { background:"#e6f9f0", color:"#0a7a4a", border:"1px solid #b9e8d0" },
  sigPen: { fontFamily:mono, fontSize:7.5, fontWeight:700, padding:"1px 3px", borderRadius:3, background:"#e6f9f0", color:"#0a7a4a", letterSpacing:0.2 },
  sigDc:  { fontFamily:mono, fontSize:7.5, fontWeight:700, padding:"1px 3px", borderRadius:3, background:"#eef2ff", color:"#3730a3" },
  sigCard:{ fontFamily:mono, fontSize:7.5, fontWeight:700, padding:"1px 3px", borderRadius:3, background:"#fff6e0", color:"#8a5f00" },
  sigRot: { fontFamily:mono, fontSize:7.5, fontWeight:700, padding:"1px 3px", borderRadius:3, background:"#eeeef1", color:"#61616b" },

  detail: { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, width:"100%", maxWidth:520, maxHeight:"88vh", overflowY:"auto", padding:"14px 16px 16px", boxShadow:"0 18px 50px rgba(0,0,0,0.24)" },
  dHead: { display:"flex", alignItems:"center", gap:11, marginBottom:10 },
  dPortrait: { width:52, height:52, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  dName: { fontSize:17, fontWeight:700, color:C.purple },
  dSub: { fontSize:11.5, color:C.text2, fontFamily:mono, marginTop:1 },
  dAlert: { borderRadius:8, padding:"8px 10px", fontSize:12, marginBottom:9 },
  dGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(88px,1fr))", gap:7, marginBottom:12 },
  dStat: { background:C.cardAlt, borderRadius:8, padding:"7px 9px" },
  dStatK: { fontFamily:mono, fontSize:8.5, textTransform:"uppercase", letterSpacing:0.5, color:C.text3 },
  dStatV: { fontFamily:mono, fontSize:15, fontWeight:700, marginTop:1 },
  dStatS: { fontSize:9, color:C.text3 },
  dGroupHead: { display:"flex", alignItems:"baseline", gap:6, fontSize:12, fontWeight:700,
    color:C.text, marginBottom:6, marginTop:2, paddingTop:8, borderTop:`1px solid ${C.border}` },
  dGroupDot: { width:8, height:8, borderRadius:"50%", flexShrink:0, alignSelf:"center" },
  dGroupSub: { fontFamily:mono, fontSize:9, fontWeight:400, color:C.text3, letterSpacing:0.2 },
  cmpTable: { width:"100%", borderCollapse:"collapse", marginBottom:12, fontSize:11.5 },
  cmpTh: { fontFamily:mono, fontSize:8.5, textTransform:"uppercase", letterSpacing:0.5,
    color:C.amber, textAlign:"left", padding:"2px 6px", borderBottom:`1px solid ${C.border}` },
  cmpThNum: { textAlign:"right" },
  cmpK: { color:C.text2, padding:"3px 6px", borderBottom:`1px solid ${C.page}` },
  cmpV: { fontFamily:mono, fontWeight:700, textAlign:"right", padding:"3px 6px", borderBottom:`1px solid ${C.page}` },
  dSectionLbl: { display:"flex", alignItems:"baseline", gap:7, fontSize:12.5, fontWeight:700, color:C.purple, marginBottom:6, paddingTop:4, borderTop:`1px solid ${C.border}` },
  dSectionNote: { fontFamily:mono, fontSize:9.5, fontWeight:400, color:C.text3 },
  dFixList: { display:"flex", flexDirection:"column", gap:2, marginBottom:12 },
  dFixRow: { display:"flex", alignItems:"center", gap:7, padding:"4px 0", borderBottom:`1px solid ${C.page}`, fontSize:11.5 },
  dFixCup: { display:"flex", alignItems:"center", gap:7, padding:"4px 0", borderBottom:`1px solid ${C.page}`, fontSize:11.5, background:"#faf7ff" },
  dFixGw: { fontFamily:mono, fontSize:10, color:C.text3, width:36, flexShrink:0 },
  dFixOpp: { fontFamily:mono, fontSize:10.5, fontWeight:700, padding:"2px 6px", borderRadius:5, minWidth:44, textAlign:"center" },
  dFixComp: { fontFamily:mono, fontSize:10, fontWeight:700, color:"#5b21b6", background:"#f1e9ff", padding:"2px 6px", borderRadius:5 },
  dFixFdr: { fontFamily:mono, fontSize:9.5, color:C.text3 },
  dFixHome: { fontFamily:mono, fontSize:9, color:C.text3 },
  dFixCs: { fontFamily:mono, fontSize:10, color:C.text2 },
  dFixTravel: { fontFamily:mono, fontSize:9, color:C.text3 },
  dFixTravelLong: { color:"#8a5f00", background:"#fff6e0", borderRadius:4, padding:"0 4px", fontWeight:700 },
  dFixDate: { fontFamily:mono, fontSize:9.5, color:C.text3, flexShrink:0 },
  dSubLbl: { fontFamily:mono, fontSize:9.5, textTransform:"uppercase", letterSpacing:0.6, color:C.text3, marginBottom:4 },
  dExList: { display:"flex", flexDirection:"column", gap:1, marginBottom:10 },
  dExRow: { display:"flex", alignItems:"center", gap:7, fontSize:11.5, padding:"3px 0", borderBottom:`1px solid ${C.page}` },
  dExName: { flex:1, color:C.text2 },
  dExVal: { fontFamily:mono, fontSize:10, color:C.text3 },
  dExPts: { fontFamily:mono, fontSize:11.5, fontWeight:700, minWidth:26, textAlign:"right" },
  injSrc: { fontFamily:mono, fontSize:8.5, opacity:0.75 },
  dNote: { background:C.cardAlt, borderRadius:8, padding:"8px 10px", fontSize:10.5, color:C.text2, lineHeight:1.5, marginBottom:10 },
  priceRow: { display:"flex", alignItems:"center", gap:9, marginBottom:9 },
  priceLbl: { fontFamily:mono, fontSize:10, textTransform:"uppercase", letterSpacing:0.5, color:C.text3 },
  priceOpen: { display:"inline-flex", alignItems:"center", gap:6, cursor:"pointer",
    fontFamily:mono, fontSize:13, fontWeight:700, color:C.text,
    background:C.cardAlt, border:`1px dashed ${C.border}`, borderRadius:7, padding:"3px 8px" },
  priceOpenIcon: { fontFamily:sans, fontSize:8.5, fontWeight:400, color:C.purple,
    textTransform:"uppercase", letterSpacing:0.4 },
  priceInput: { width:52, textAlign:"center", fontFamily:mono, fontSize:12.5, fontWeight:700,
    color:C.text, background:C.card, border:`1px solid ${C.border}`, borderRadius:5, padding:"2px 3px" },
  priceDone: { width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center",
    cursor:"pointer", fontSize:11, background:C.green, color:"#fff", border:"none", borderRadius:5, padding:0 },
  priceEdit: { display:"flex", alignItems:"center", gap:5, background:C.cardAlt, borderRadius:7, padding:"3px 5px" },
  priceStep: { width:22, height:22, borderRadius:5, border:`1px solid ${C.border}`, background:C.card, color:C.text, fontSize:13, cursor:"pointer", lineHeight:1, padding:0 },
  priceReset: { background:"transparent", border:"none", color:C.text3, fontSize:10.5, cursor:"pointer", textDecoration:"underline" },
  pSell: { fontFamily:mono, fontSize:8.5, color:C.red, marginLeft:2 },
  dActions: { display:"flex", gap:6, flexWrap:"wrap", paddingTop:8, borderTop:`1px solid ${C.border}` },
  dBtn: { background:C.card, border:`1px solid ${C.borderStrong}`, borderRadius:7, padding:"7px 11px", fontSize:12, color:C.text, cursor:"pointer", fontWeight:500 },
  dotWait: { width:7, height:7, borderRadius:"50%", background:"#f59e0b", flexShrink:0 },

  recHead: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" },
  recCtl: { display:"flex", gap:6 },
  recBlock: { marginTop:10 },
  recPosLbl: { display:"flex", alignItems:"center", gap:6, fontFamily:mono, fontSize:10.5, textTransform:"uppercase", letterSpacing:0.8, color:C.text2, marginBottom:6 },
  posDot: { width:8, height:8, borderRadius:"50%" },
  recGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:8 },
  recCard: { background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 10px", cursor:"pointer" },
  recTop: { display:"flex", alignItems:"center", gap:8 },
  recPortrait: { position:"relative", width:32, height:32, display:"flex", alignItems:"flex-end", justifyContent:"center", flexShrink:0 },
  recName: { fontSize:12.5, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  recMaxWrap: { display:"inline-flex", alignItems:"center", gap:3, border:`1px solid ${C.border}`,
                borderRadius:6, padding:"2px 6px", background:C.card },
  recMaxLbl: { fontSize:10, color:C.text3, whiteSpace:"nowrap" },
  recMaxInput: { width:46, border:"none", outline:"none", fontSize:11.5, fontFamily:mono,
                 background:"transparent", color:C.text },
  recMaxClear: { border:"none", background:"transparent", color:C.text3, cursor:"pointer",
                 fontSize:10, padding:0, lineHeight:1 },
  recChip: { display:"inline-flex", alignItems:"baseline", gap:3, background:C.cardAlt,
             border:`1px solid ${C.border}`, borderRadius:4, padding:"1px 5px", whiteSpace:"nowrap" },
  recChipK: { fontSize:8.5, color:C.text3, textTransform:"uppercase", letterSpacing:0.3 },
  recChipV: { fontSize:10.5, fontWeight:700, color:C.text, fontFamily:mono },
  recWhy: { fontFamily:mono, fontSize:8.5, color:C.purple, fontWeight:700, marginTop:4, lineHeight:1.4 },
  recFfdr: { fontFamily:mono, fontSize:8.5, color:C.text3 },
  recMeta: { fontFamily:mono, fontSize:10, color:C.text3 },
  recScore: { fontFamily:mono, fontSize:13, fontWeight:700, color:C.purple, flexShrink:0 },
  recFix: { display:"flex", gap:3, marginTop:7, flexWrap:"wrap" },
  recFixChip: { fontFamily:mono, fontSize:9, fontWeight:700, padding:"2px 4px", borderRadius:4 },
  recExtra: { display:"flex", flexWrap:"wrap", gap:4, marginTop:5 },

  overlay: { position:"fixed", inset:0, background:"rgba(20,20,25,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:18 },
  modal: { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, width:"100%", maxWidth:440, maxHeight:"82vh", display:"flex", flexDirection:"column", boxShadow:"0 18px 50px rgba(0,0,0,0.22)" },
  modalHead: { display:"flex", gap:8, alignItems:"center", padding:"13px 13px 9px" },
  search: { flex:1, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 11px", fontSize:13, color:C.text, outline:"none" },
  close: { background:"transparent", border:"none", color:C.text3, fontSize:15, cursor:"pointer", padding:4 },
  searchList: { overflowY:"auto", padding:"0 7px 11px", display:"flex", flexDirection:"column", gap:2 },
  sItem: { display:"flex", alignItems:"center", gap:9, background:"transparent", border:"none", borderRadius:8, padding:"6px 7px", cursor:"pointer", textAlign:"left", width:"100%" },
  sPortrait: { position:"relative", width:32, height:32, display:"flex", alignItems:"flex-end", justifyContent:"center", flexShrink:0 },
  crestFallback: { fontFamily:mono, fontWeight:700, color:C.text3, background:C.cardAlt, borderRadius:3, padding:"0 2px", lineHeight:1.4, display:"inline-block" },
  sCrest: { position:"absolute", bottom:-2, right:-3, width:13, height:13, objectFit:"contain" },
  sName: { fontSize:13, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  sMeta: { fontFamily:mono, fontSize:10, color:C.text3 },
  /* ---- maeldu merkin i skipta-glugganum ---- */
  sSig:{ display:"flex", alignItems:"center", gap:4, marginTop:3, flexWrap:"wrap" },
  sigPill:{ fontSize:9.5, fontWeight:700, borderRadius:3, padding:"0 3px", lineHeight:"14px" },
  sigOk:{ background:"#e6f7ef", color:"#0a7d4f" },
  sigWarn:{ background:"#fff5e0", color:"#8a5a00" },
  sigBad:{ background:"#fde8ea", color:"#a3202c" },
  sigFfdr:{ fontSize:9.5, fontWeight:700, borderRadius:3, padding:"0 4px",
            lineHeight:"14px", fontFamily:mono },
  sigMo:{ fontSize:9.5, fontWeight:600, borderRadius:3, padding:"0 3px",
          lineHeight:"14px", background:"#f0eef4", color:"#4a3d5c" },
  sigUp:{ fontSize:9.5, fontWeight:700, borderRadius:3, padding:"0 3px",
          lineHeight:"14px", background:"#e6f7ef", color:"#0a7d4f" },
  sigDown:{ fontSize:9.5, fontWeight:700, borderRadius:3, padding:"0 3px",
            lineHeight:"14px", background:"#fde8ea", color:"#a3202c" },
  sPrice: { fontFamily:mono, fontSize:12.5, fontWeight:700 },
  sItemBlocked: { opacity:0.45 },
  sBlock: { fontFamily:mono, fontSize:9, color:C.red, fontWeight:700 },
  sDiff: { fontFamily:mono, fontSize:10 },

  toast: { position:"fixed", bottom:18, left:"50%", transform:"translateX(-50%)", background:C.purple, color:"#fff", padding:"10px 16px", borderRadius:9, fontSize:12.5, zIndex:200, boxShadow:"0 6px 22px rgba(0,0,0,0.25)" },
};
