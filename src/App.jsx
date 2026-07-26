import React, { useState, useEffect, useMemo, useCallback } from "react";
import Pitch from "./Pitch.jsx";
import { clamp, sellTenths, lookupPos, lookupMeasured,
  tierOf, TIER_BG, TIER_FG, TIER_NAME,
  makeFixDifficulty, computeTransferCost, expPointsFor, priceMovePrediction } from "./model.js";

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

const RAW = "https://raw.githubusercontent.com/aronhogni/Fantasy/main/data";
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
const POS_LABEL = { 1:"Markv.", 2:"Vörn", 3:"Miðja", 4:"Sókn" };
/* FPL explain-lyklar -> íslensk heiti (stiga-uppskipting) */
const EXPLAIN_IS = {
  minutes:"Mínútur", goals_scored:"Mörk", assists:"Assist", clean_sheets:"Hreint blað",
  goals_conceded:"Mörk á sig", own_goals:"Sjálfsmörk", penalties_saved:"Vítavörslur",
  penalties_missed:"Klúðruð víti", yellow_cards:"Gult spjald", red_cards:"Rautt spjald",
  saves:"Vörslur", bonus:"Bónus", bps:"BPS", defensive_contribution:"Varnarframlag",
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
const TL_WINDOW = 13;  // umferðir sýndar í einu — hnútarnir FYLLA breiddina

/* ---- Landsleikjahlé: hlé Á EFTIR þessum umferðum ---- */
const INTL_BREAK_AFTER = [3, 7, 11, 15, 22, 27];

/* ---- Chips ----
   AÐEINS lýsigögn hér. REGLURNAR (hvenær má nota, hversu oft) koma úr
   FPL-API-inu (data/chips.json) svo þær sjálf-uppfærast ef FPL breytir þeim.
   FPL 2026/27: tvö sett — eitt fyrir GW1-19, annað fyrir GW20-38.
   Wildcard og Free Hit byrja í GW2 (skipti eru þegar ótakmörkuð í GW1).   */
const CHIPS = {
  wildcard: { label:"Wildcard",       short:"WC", color:"#d92d3c", icon:"♻",  desc:"Ótakmörkuð skipti, engin refsing" },
  freehit:  { label:"Free Hit",       short:"FH", color:"#2563eb", icon:"⚡", desc:"Lið eina umferð, fer svo til baka" },
  bboost:   { label:"Bench Boost",    short:"BB", color:"#00b96b", icon:"⬆",  desc:"Bekkurinn skorar líka (allir 15)" },
  "3xc":    { label:"Triple Captain", short:"TC", color:"#c98a00", icon:"3×", desc:"Fyrirliði ×3 í stað ×2" },
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
  const days = ["sun","mán","þri","mið","fim","fös","lau"];
  return `${days[d.getDay()]} ${d.getDate()}.${d.getMonth()+1}. ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};
const fmtClock = iso => {
  if (!iso) return "—";
  const d = new Date(iso), now = new Date();
  const mins = Math.round((now - d) / 60000);
  if (mins < 2) return "núna";
  if (mins < 60) return `f. ${mins} mín`;
  const h = Math.round(mins / 60);
  return h < 24 ? `f. ${h} klst` : `${d.getDate()}.${d.getMonth()+1}.`;
};
const fmtDeadline = iso => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth()+1}. kl. ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
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
const AVAIL = {
  a: { label:"Til leiks",    short:"",   color:null,      bg:null },
  d: { label:"Vafi",         short:"?",  color:"#8a5f00", bg:"#fff6e0" },
  i: { label:"Meiddur",      short:"✚",  color:"#a01f2b", bg:"#fdecee" },
  s: { label:"Í banni",      short:"⛔", color:"#5b21b6", bg:"#f1e9ff" },
  u: { label:"Ótiltækur",    short:"✕",  color:"#61616b", bg:"#eeeef1" },
  n: { label:"Ekki í hóp",   short:"–",  color:"#61616b", bg:"#eeeef1" },
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
      <svg width="34" height="34" viewBox="0 0 64 64" role="img" aria-label="Fantasy plönun"
        style={{ color: C.purple, "--logo-accent": "#46d17f", flexShrink: 0 }}>
        <title id="t">Merki reiknilíkans fyrir Fantasy-fótbolta</title>
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
        <div style={{ fontWeight:700, fontSize:16, letterSpacing:-0.3, color:C.purple }}>Fantasy plönun</div>
        <div style={{ fontSize:10.5, color:C.text3, fontFamily:mono, letterSpacing:0.4 }}>2026/27 · opinber gögn</div>
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
  const [elo, setElo] = useState(null);
  const [weather, setWeather] = useState(null);
  const [travel, setTravel] = useState(null);   // ferðalengd útiliðs per leik (pipeline)
  const [baseline, setBaseline] = useState(null); // lokatölur FYRRA tímabils (frystar við GW1)
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
  const [buyPrices, setBuyPrices] = useState({});  // {playerId: kaupverð x10}
  const [apiBank, setApiBank] = useState(null);    // banki úr FPL (tíundir) ef tengt
  const [apiHit, setApiHit] = useState(null);      // raunveruleg refsing úr FPL

  /* ---------- Notanda-ástand ---------- */
  const [gw, setGw] = useState(1);
  const [entryId, setEntryId] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [squadOverride, setSquadOverride] = useState(null); // raunlið úr FPL-slóð
  const [plan, setPlan] = useState([]);            // [{gw, outId, inId}]
  const [captain, setCaptain] = useState(START_CAPTAIN);
  const [vice, setVice] = useState(null);
  const [benchSwaps, setBenchSwaps] = useState({});
  const [chips, setChips] = useState({});
  const [dragId, setDragId] = useState(null);
  const [swapSel, setSwapSel] = useState(null);   // valinn til skipta (smellu-flæði)
  const [editPrice, setEditPrice] = useState(null); // kaupverð í stillingu (id)
  const [confirmReset, setConfirmReset] = useState(null); // "gw" | "all" — staðfestingar-skref
  const [tlStart, setTlStart] = useState(1);        // fyrsta umferð í tímalínu-glugga
  const [selling, setSelling] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [browse, setBrowse] = useState(false);
  const [showFfdr, setShowFfdr] = useState(false);  // FFDR-taflan sýnileg
  const [showChips, setShowChips] = useState(false); // chip-stillingar sýnilegar // frjáls leit (ekki bundin sölu)
  const [searchPos, setSearchPos] = useState("all");
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [totalPts, setTotalPts] = useState(null);
  const [gwPts, setGwPts] = useState(null);
  const [recPos, setRecPos] = useState("ALL");
  const [recRange, setRecRange] = useState(5);
  const [teamSort, setTeamSort] = useState("def");
  const [detail, setDetail] = useState(null); // {kind:"player"|"team", id}
  const [live, setLive] = useState(null);      // lifandi staða valdrar umferðar
  const [gwStats, setGwStats] = useState(null); // per-leikmanns tölur valdrar umferðar
  const [liveTick, setLiveTick] = useState(0);
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
        try { setPipeStatus(await j("status.json")); } catch {}
        try { setElo(await j("elo.json")); } catch {}
        try { setWeather(await j("weather.json")); } catch {}
        try { setTravel(await j("travel.json")); } catch {}
        try { setBaseline(await j("season_baseline.json")); } catch {}
        try { setInjuries(await j("injuries.json")); } catch {}
        try { setEloFx(await j("elo_fixtures.json")); } catch {}
        try { setEuroFx(await j("euro_fixtures.json")); } catch {}
        try { setNews(await j("news.json")); } catch {}
        try { setPromoted(await j("promoted_baseline.json")); } catch {}
        try { setChipRules(await j("chips.json")); } catch {}
        try { setFormFeat(await j("form_features.json")); } catch {}
        try { setTeamForm(await j("team_form.json")); } catch {}
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
        setRivals(s.rivals ?? []);
      }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (loaded) saveState("fpl_planner_v3", { entryId, plan, captain, vice, benchSwaps, chips, buyPrices, rivals });
  }, [entryId, plan, captain, vice, benchSwaps, chips, buyPrices, rivals, loaded]);

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
              : `lið ${r.id}`;
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
          if (alive) setRivalData(prev => ({ ...prev, [r.id]: { name: `lið ${r.id}`, error: true } }));
        }
      }
    })();
    return () => { alive = false; };
  }, [rivals, gw]);

  function addRival() {
    const m = rivalInput.match(/entry\/(\d+)/) || rivalInput.match(/^(\d+)$/);
    if (!m) { flash("Slóð eða númer andstæðings — t.d. 606 eða .../entry/606/"); return; }
    const id = m[1];
    if (rivals.some(r => r.id === id)) { flash("Þegar á listanum."); return; }
    if (String(id) === String(entryId)) { flash("Það ert þú sjálf/ur."); return; }
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
      if (gw > v + TL_WINDOW - 1) return Math.min(Math.max(1, maxGw - TL_WINDOW + 1), gw - TL_WINDOW + 2);
      return v;
    });
  }, [gw, maxGw]);

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
      if (tf[t.id]) {                       // HEILT — tekur forgang
        const x = tf[t.id];
        xg90 = x.goals_pg; xgc90 = x.conceded_pg;
        sotFor = x.sot_pg ?? null; sotAg = x.sot_against_pg ?? null;
        prevGoals = x.prev?.goals_pg ?? null; prevConc = x.prev?.conceded_pg ?? null;
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
      m[t.id] = { xg90, xgc90, sotFor, sotAg, prevGoals, prevConc, mins: a.gkMins, src };
    });
    return m;
  }, [players, teams, promoted, teamForm]);

  // ---- ClubElo styrkur per lið ----
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
  const baselineById = useMemo(() => {
    const m = {};
    (baseline?.players || []).forEach(b => m[b.id] = b);
    return m;
  }, [baseline]);
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
  const ffdrRange = useMemo(() => {
    if (!teams || !fixtures) return {};
    const out = {};
    for (const t of teams) {
      for (const pos of [2, 4]) {
        const vals = [];
        for (let g = 1; g <= maxGw; g++) {
          for (const f of (fixByTeamGw[t.id]?.[g] || [])) {
            const d = fixDifficulty(t.id, f, pos);
            if (d != null) vals.push(d);
          }
        }
        if (vals.length) {
          /* ÓLÍK gildi, ekki kvantílar. Lélegt lið hefur aðeins ~8 ólík FFDR-gildi
             (FDR 1-5 x heima/úti), svo kvantílar mynda tvítekin skil og flokkar
             verða tómir. Röðun ólíkra gilda tryggir að jafnir leikir fá SAMA lit
             og að allir sex litir nýtist.                                       */
          out[`${t.id}|${pos}`] = [...new Set(vals)].sort((a, b) => a - b);
        }
      }
    }
    return out;
  }, [teams, fixtures, maxGw, fixByTeamGw, teamMetrics, odds, eloByTeam]);

  /* Þrep leiks AFSTÆTT innan liðsins (0 = léttasti sjötti hluti). */
  function tierRel(teamId, fx, pos) {
    const d = fixDifficulty(teamId, fx, pos);
    if (d == null) return null;
    const uniq = ffdrRange[`${teamId}|${pos <= 2 ? 2 : 4}`];
    if (!uniq || uniq.length < 2) return tierOf(d);
    const i = uniq.indexOf(d);
    if (i < 0) return tierOf(d);
    // röð ólíks gildis -> þrep 0..5
    return Math.min(5, Math.floor(i * 6 / uniq.length));
  }


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
    // MÆLD KVÖRÐUN: samfelld þyngd -> CS% úr töflu sem er mæld á 1.102 leikjum.
    // Fínt með eigin vörn (liðsstyrkur) sem FDR sér ekki.
    const d2 = fixDifficulty(teamId, fx, 2) ?? fx.fdr;
    const raw = lookupPos(2, "cs", d2);
    if (!Number.isFinite(raw)) return { cs: null, src: null };
    return { cs: clamp(Math.round(raw), 3, 70), src: "mælt" };
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
    if (o.element_type !== n.element_type) { flash("Skiptin verða að vera í sömu stöðu."); return; }

    // FPL-REGLA: hámark 3 leikmenn frá sama félagi
    const after = squadAt.map(s => (s.id === outId ? inId : s.id));
    const sameClub = after.filter(id => byId[id]?.team === n.team).length;
    if (sameClub > 3) {
      flash(`Of margir frá ${teamById[n.team]?.short} — hámark 3 per félagi.`);
      return;
    }

    // FPL-REGLA: verður að hafa fyrir því. (Notum núverandi verð; raunverulegt
    // söluverð getur verið lægra v. 50%-hagnaðarreglu — sjá athugasemd í UI.)
    // söluverð út (50%-reglan), fullt verð inn
    const bankAfter = +(bank + (sellOf(outId) - n.now_cost) / 10).toFixed(1);
    if (bankAfter < 0) {
      flash(`Vantar £${Math.abs(bankAfter).toFixed(1)}m — of dýr skipti.`);
      return;
    }

    // Skrá verðið sem við SJÁUM núna — það verður kaupverðið þegar skiptin fara fram.
    // (Ef verðið breytist fyrir framkvæmd uppfærist það við næstu liðs-greiningu.)
    setPlan(p => [...p, { gw, outId, inId, seenPrice: n.now_cost, seenAt: new Date().toISOString().slice(0,10) }]);
    setSelling(null); setSearchQ("");
    flash(`GW${gw}: ${o.web_name} → ${n.web_name} · banki £${bankAfter.toFixed(1)}`);
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
      flash(a.starter ? "Báðir í byrjunarliði — veldu einn á bekk." : "Báðir á bekk.");
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
      flash("Ólögleg uppstilling (1 GK, 3+ vörn, 2+ miðja, 1+ sókn)."); return false;
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
    flash(`GW${g} endurstillt — upprunalega liðið aftur.`);
  }
  function resetAll() {
    setPlan([]); setBenchSwaps({}); setChips({});
    setCaptain(START_CAPTAIN); setVice(null);
    setSwapSel(null); setSelling(null); setConfirmReset(null);
    flash("Öll plönun endurstillt.");
  }

  function connectUrl() {
    const m = urlInput.match(/entry\/(\d+)/) || urlInput.match(/^(\d+)$/);
    if (!m) { flash("Slóð þarf að innihalda /entry/{númer}/"); return; }
    setEntryId(m[1]); flash(`Tengt lið ${m[1]} — sæki raunlið og stig.`);
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

  const searchResults = useMemo(() => {
    if (!players) return [];
    const q = searchQ.toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const posFilter = selling ? byId[selling]?.element_type : (searchPos === "all" ? null : +searchPos);
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
  }, [players, searchQ, searchPos, selling, squadIds, byId, teamById, ffdrAhead]);

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
        drivers.push([`mín ${Math.round(ff[p.id].mins5)}′`, w.mins5 * (ff[p.id].mins5 / 90)]);
      } else {
        const mp = Math.min(1, (p.minutes || 0) / (38 * 90));
        drivers.push([`mín ${Math.round(mp * 100)}%`, w.mins5 * mp]);
      }
      drivers.push([`£${price.toFixed(1)}`, w.price * price]);
      drivers.push(["leikir", w.fdr * fdrAvg]);
      drivers.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      const tot = drivers.reduce((a, x) => a + Math.abs(x[1]), 0) || 1;
      const why = drivers.slice(0, 2).map(([lbl, v]) => `${lbl} ${Math.round(100 * Math.abs(v) / tot)}%`).join(" · ");

      // algilt meðal-FFDR yfir sviðið (til samanburðar milli liða)
      let fsum = 0, fn = 0;
      for (const f of fxs) { const d = fixDifficulty(p.team, f, p.element_type); if (d != null) { fsum += d; fn++; } }

      return { p, score: +score.toFixed(2), ease: +(5 - fdrAvg).toFixed(2), fxs, mode,
               why, ffdrAvg: fn ? +(fsum / fn).toFixed(2) : null };
    };
    const all = players.map(scoreOf).filter(Boolean);
    const byPos = {};
    [1,2,3,4].forEach(pos => {
      byPos[pos] = all.filter(r => r.p.element_type === pos && !squadIds.has(r.p.id))
        .sort((a,b) => b.score - a.score).slice(0, 4);
    });
    // versti í liðinu = mælt með að skipta út
    const inSquad = all.filter(r => squadIds.has(r.p.id));
    const sorted = [...inSquad].sort((a,b) => a.score - b.score);
    const sellIds = new Set(sorted.slice(0, 2).map(r => r.p.id));
    return { byPos, sellIds, inSquadScores: Object.fromEntries(inSquad.map(r => [r.p.id, r.score])) };
  }, [players, fixtures, gw, recRange, fixByTeamGw, teamMetrics, squadIds, odds, defcon, dcOpp, eloByTeam, eloCsByFx, maxGw, formFeat]);

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
    return y ? `${y - 1}/${String(y).slice(-2)}` : "sl. tímabil";
  })();
  const cumLabel = seasonStarted ? `GW1–${seasonGames}` : prevSeasonLabel;
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
    <div style={S.shell}><div style={S.loading}>Sæki opinber FPL-gögn…</div></div>
  );
  if (dataState === "error") return (
    <div style={S.shell}><div style={S.errBox}>
      Náði ekki í gögnin úr <code>data/</code>. Keyrðu GitHub Actions (fetch-data) og reyndu aftur.
    </div></div>
  );

  return (
    <div className="app-shell" style={S.shell}>
      {/* ---------- Haus ---------- */}
      <header className="app-head" style={S.head}>
        <Logo />
        <div className="head-right" style={S.headRight}>
          <button style={S.searchBtn} onClick={() => { setBrowse(true); setSearchQ(""); setSearchPos("all"); }}
            title="Leita í öllum leikmönnum">🔍 Leikmenn</button>
          <button style={{ ...S.searchBtn, ...(showFfdr ? S.searchBtnOn : {}) }}
            onClick={() => setShowFfdr(v => !v)}
            title="Leikjaþyngd allra liða, varnar- og sóknar-hópur">📊 FFDR</button>
          <button style={{ ...S.searchBtn, ...(showChips ? S.searchBtnOn : {}) }}
            onClick={() => setShowChips(v => !v)}
            title="Wildcard, Free Hit, Bench Boost, Triple Captain">🎫 Chips</button>
          <input className="url-input" style={S.urlInput} placeholder="FPL Url" value={urlInput}
            onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && connectUrl()} />
          <button style={S.connectBtn} onClick={connectUrl}>{entryId ? "Uppfæra" : "Tengja"}</button>
        </div>
      </header>

      {/* ---------- Tímalína ---------- */}
      <div style={S.tlWrap}>
        <div style={S.tlOuter}>
          <button style={{ ...S.tlArrow, ...(tlStart <= 1 ? S.tlArrowOff : {}) }}
            disabled={tlStart <= 1} title="Fyrri umferðir"
            onClick={() => setTlStart(v => Math.max(1, v - TL_WINDOW))}>‹</button>
        <div style={S.tlRow}>
          <div style={S.tlLine} />
          {Array.from({ length: Math.min(TL_WINDOW, maxGw) }, (_,i) => tlStart + i).filter(n => n <= maxGw).map(n => {
            const active = n === gw;
            const has = plan.some(t => t.gw === n);
            const brk = INTL_BREAK_AFTER.includes(n);
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
                          title={`${meta.label}${val ? ` — vænt +${val} stig` : ""}`}>
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
                      <span style={S.nodeHit} title={`${transferCost[n].made} skipti, ${transferCost[n].hits} yfir frí = ${transferCost[n].points} stig`}>
                        {transferCost[n].points}
                      </span>}
                  </button>
                </div>
                {brk && <span style={S.intl} title="Landsleikjahlé"><span style={S.globe}>🌐</span></span>}
              </React.Fragment>
            );
          })}
        </div>
          <button style={{ ...S.tlArrow, ...(tlStart + TL_WINDOW > maxGw ? S.tlArrowOff : {}) }}
            disabled={tlStart + TL_WINDOW > maxGw} title="Næstu umferðir"
            onClick={() => setTlStart(v => Math.min(Math.max(1, maxGw - TL_WINDOW + 1), v + TL_WINDOW))}>›</button>
        </div>
        <div style={S.deadline}>
          <b>GW{gw}</b> · frestur {fmtDeadline(ev?.deadline_time)}
          {ev?.finished ? " · lokið" : ""}
          {/* ENDURSTILLA UMFERÐ — birtist aðeins ef eitthvað er plönuð */}
          {(() => {
            const pl = gwPlanned(gw);
            if (!pl.any) return null;
            const what = [
              pl.tr ? `${pl.tr} skipti` : null,
              pl.bs ? `${pl.bs} bekkjar-breyting${pl.bs > 1 ? "ar" : ""}` : null,
              pl.ch,
            ].filter(Boolean).join(" · ");
            return confirmReset === "gw" ? (
              <span style={S.resetConfirm}>
                Hreinsa {what}?
                <button style={S.resetYes} onClick={() => resetGw(gw)}>já</button>
                <button style={S.resetNo} onClick={() => setConfirmReset(null)}>nei</button>
              </span>
            ) : (
              <button style={S.resetBtn} onClick={() => setConfirmReset("gw")}
                title={`Hreinsa alla plönun í GW${gw}: ${what}`}>
                ↺ endurstilla GW{gw}
              </button>
            );
          })()}
          {(() => {
            const tc = transferCost[gw];
            if (!tc) return null;
            if (tc.unlimited) return (
              <span style={S.tcFree}>
                {tc.chip ? `${CHIPS[tc.chip].label} — ótakmörkuð skipti` : "ótakmörkuð frí skipti"}
              </span>
            );
            return (
              <span style={tc.hits > 0 ? S.tcHit : S.tcOk}>
                {tc.made} skipti · {tc.ftAvailable} frí
                {tc.hits > 0 ? ` · ${tc.points} stig` : ""}
              </span>
            );
          })()}
        </div>
        {preSeason && (
          <div style={S.preSeasonBar}>
            <b>Fyrir tímabil.</b> Verð hreyfast ekki og skipti eru ótakmörkuð og frí þar til
            frestur GW1 rennur út {fmtDeadline(gw1Deadline)}. Kaupverð læsist þá — 50%-söluregla
            gildir eftir það.
          </div>
        )}
      </div>

      {/* ---------- Mælaborð ---------- */}
      <div className="app-stats" style={S.stats}>
        <Stat icon="💰" label="Banki" value={`£${bank.toFixed(1)}`}
          sub={`lið £${squadValue.toFixed(1)} · alls £${(bank + squadValue).toFixed(1)}`}
          tone={bank < 0 ? "bad" : "ok"} />
        <Stat icon="🏆" label="Heildarstig" value={totalPts == null ? "—" : totalPts} sub={entryId ? `lið ${entryId}` : "tengdu FPL Url"} />
        <Stat icon="📅" label={`Umferð ${gw}`} value={gwPts == null ? "—" : gwPts}
          sub={apiHit ? `refsing ${-apiHit} tekin`
            : transferCost[gw]?.hits > 0 ? `áætluð refsing ${transferCost[gw].points}`
            : ev?.finished ? "lokið" : "ekki hafin"}
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
              <button style={S.ghost} onClick={() => setBenchSwaps(bs => { const n = { ...bs }; delete n[gw]; return n; })}>Núllstilla bekk</button>}
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
                      captain={captain} vice={vice}
                      csFor={csFor} xgaFor={xgaFor} crestFor={crestFor}
                      dc={dcOpp[byId[sq.id]?.team]} elo={eloByTeam[byId[sq.id]?.team]} gwNow={gw} sellTenths_={sellOf(sq.id)} diffOf={fixDifficulty}
                      isPlanned={plannedIn.has(sq.id) && !officialIds.has(sq.id)}
                      isSellHint={recommendations.sellIds?.has(sq.id)}
                      onInfo={() => setDetail({ kind:"player", id:sq.id })}
                      onTransfer={() => { setSelling(sq.id); setSearchQ(""); setSwapSel(null); }}
                      onCardClick={() => clickPlayer(sq.id)} swapSel={swapSel} seasonStarted={seasonStarted} seasonGames={seasonGames} relOf={tierRel} ep={expPoints(sq.id, gw)} cumLabel={cumLabel}
                      dragId={dragId} setDragId={setDragId}
                      onDropPlayer={fromId => swapStarterBench(fromId, sq.id)} />
                  ))}
                </div>
              ))}
            </div>
            {/* BEKKUR — HTML-borði sem fylgir innihaldinu, ekki fast prósent */}
            <div style={S.benchArea}>
              <div style={S.benchLabel}>Bekkur</div>
              <div style={S.pitchRowFlex}>
                {bench.map(sq => (
                  <PlayerCard key={sq.id} s={sq} p={byId[sq.id]} team={teamById[byId[sq.id]?.team]} teamById={teamById}
                    fx={(fixByTeamGw[byId[sq.id]?.team]?.[gw] || [])[0]} bench
                    captain={captain} vice={vice}
                    csFor={csFor} xgaFor={xgaFor} crestFor={crestFor}
                    dc={dcOpp[byId[sq.id]?.team]} elo={eloByTeam[byId[sq.id]?.team]} gwNow={gw} sellTenths_={sellOf(sq.id)} diffOf={fixDifficulty}
                    isPlanned={plannedIn.has(sq.id) && !officialIds.has(sq.id)}
                    isSellHint={recommendations.sellIds?.has(sq.id)}
                    onInfo={() => setDetail({ kind:"player", id:sq.id })}
                    onTransfer={() => { setSelling(sq.id); setSearchQ(""); setSwapSel(null); }}
                    onCardClick={() => clickPlayer(sq.id)} swapSel={swapSel} seasonStarted={seasonStarted} seasonGames={seasonGames} relOf={tierRel} ep={expPoints(sq.id, gw)} cumLabel={cumLabel}
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
            <h2 style={S.h2}>Tiltækileiki liðsins</h2>
            {(() => {
              const flagged = squadAt.map(x => byId[x.id]).filter(Boolean).map(pp => ({
                pp, av: availOf(pp), ban: banRisk(pp, gw, seasonStarted), rot: rotationRisk(pp, seasonGames),
              })).filter(x => x.av.isRisk || (x.ban && x.ban.level === "high") || (x.rot && x.rot.level === "high"));
              if (!flagged.length) return <div style={S.okBox}>Allir 15 tiltækir — engin meiðsli, bönn eða spjaldahætta.</div>;
              return flagged.map(({ pp, av, ban, rot }) => (
                <div key={pp.id} style={S.riskRow}>
                  {av.isRisk
                    ? <span style={{ ...S.riskTag, background:av.bg, color:av.color }}>{av.label}{av.chance != null ? ` ${av.chance}%` : ""}</span>
                    : ban && ban.level === "high"
                      ? <span style={{ ...S.riskTag, background:"#fff6e0", color:"#8a5f00" }}>{ban.y} gul</span>
                      : <span style={{ ...S.riskTag, background:"#eeeef1", color:"#61616b" }}>byrj {rot.pct}%</span>}
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
              Úr FPL: status, chance_of_playing, news, gul spjöld og byrjunarhlutfall.
              Spjaldabann: 5 gul (til umf. 19) = 1 leikur, 10 = 2, 15 = 3.
            </div>
          </section>
          {/* Verðbreytingar */}
          <section style={S.card}>
            <h2 style={S.h2}>Verðbreytingar — flutningar í umferð</h2>
            <div style={S.muted}>
              Raungögn: transfers_in/out og cost_change_event úr FPL.
              <b> „í nótt?"</b> er nálgun (nettó-flutningar á móti eignarhaldi) —
              FPL birtir ekki formúluna sína, svo þetta er vísbending, ekki vissa.
              Grænt nafn = þú ert með hann í skiptaáætlun: <b>flýttu skiptunum</b> ef hann hækkar.
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
                     : predict === "up" ? <span style={S.movePredict} title="Nettó-flutningar yfir áætluðum þröskuldi — líklega hækkun í næstu verðkeyrslu FPL (nálgun)">↑ í nótt?</span>
                     : "—"}
                  </span>
                </div>
              );
            })}
            {priceMovers.down.length > 0 && <div style={S.moveSep}>Mest út</div>}
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
                     : predict === "down" ? <span style={{ ...S.movePredict, color:C.red }} title="Nettó-útflutningar yfir þröskuldi — líklega lækkun í nótt (nálgun). Ef þú ætlar að selja hann: gerðu það fyrir verðkeyrsluna.">↓ í nótt?</span>
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
              from={tlStart} span={TL_WINDOW} maxGw={maxGw}
              onPickTeam={id => setDetail({ kind:"team", id })} />
          )}

          {/* Skiptaáætlun (listi — ekki form) */}
          {plan.length > 0 && (
            <div style={S.card}>
              <div style={S.recHead}>
                <h2 style={S.h2}>Skiptaáætlun</h2>
                <span style={S.planTotal}>
                  {(() => {
                    const gain = plan.reduce((a, t) => a + transferNet(t), 0);
                    const net = +(gain + totalHits).toFixed(1);
                    return <span style={{ color: net >= 0 ? C.green : C.red, fontWeight:700 }}>
                      nettó {net >= 0 ? "+" : ""}{net} stig
                    </span>;
                  })()}
                </span>
              </div>
              <div style={S.muted}>
                Ávinningur = vænt stig (stig/leik + FDR, FPL ep_next fyrir næstu umferð) yfir 5 umferðir.
                Refsing dregst frá. Áætlun, ekki vissa.
              </div>
              {/* ENDURSTILLA ALLT — fyrir þegar Wildcard-tilraun er hætt við */}
              <div style={S.resetAllRow}>
                {confirmReset === "all" ? (
                  <span style={S.resetConfirm}>
                    Hreinsa ALLA plönun ({plan.length} skipti, {Object.keys(benchSwaps).length} umferðir
                    m. bekkjar-breytingum, {Object.keys(chips).length} chip)?
                    <button style={S.resetYes} onClick={resetAll}>já, allt</button>
                    <button style={S.resetNo} onClick={() => setConfirmReset(null)}>nei</button>
                  </span>
                ) : (
                  <button style={S.resetBtn} onClick={() => setConfirmReset("all")}
                    title="Hreinsa öll skipti, bekkjar-breytingar og chips — upprunalega liðið aftur">
                    ↺ endurstilla alla plönun
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
                      <span style={S.planFh} title="Free Hit — liðið fer til baka eftir umferðina, skiptin gilda aðeins í henni">FH</span>}
                    <span style={{ flex:1, minWidth:0 }}>
                      <span style={{ color:C.red }}>{byId[t.outId]?.web_name}</span>
                      {" → "}
                      <span style={{ color:C.green, fontWeight:600 }}>{byId[t.inId]?.web_name}</span>
                    </span>
                    <span style={S.planCalc} title="vænt stig yfir 5 umferðir">
                      {gain >= 0 ? "+" : ""}{gain}
                    </span>
                    {hitShare < 0 && <span style={S.planHitVal} title="hlutdeild í refsingu">{hitShare}</span>}
                    <span style={{ ...S.planNet, color: net >= 0 ? C.green : C.red }}
                      title={net >= 0 ? "þess virði" : "kostar meira en það gefur"}>
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
                Tvö sett — eitt fyrir hvern hálfleik. Gildistími kemur úr FPL-API-inu.
                Ein chip per umferð. Wildcard og Free Hit byrja í GW2.
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
                          {half === 1 ? "Fyrri hluti" : "Seinni hluti"}
                          <span style={S.chipHalfRange}>GW{slots[0].from}–{lastGw}</span>
                          {dl && (
                            <span style={{ ...S.chipExpiry, ...(expired ? S.chipExpired : {}) }}>
                              {expired ? "útrunnið" : `fellur ${fmtDeadline(dl)}`}
                              {!expired && unused > 0 ? ` · ${unused} ónotuð` : ""}
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
                                ? <span style={{ color: C.green, fontWeight:600 }}>GW{used} · vænt +{val} stig</span>
                                : best
                                  ? <span>best í <b>GW{best.g}</b> (+{best.v})</span>
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
              <h2 style={S.h2}>Lið — FFDR GW{gw}–{Math.min(gw + recRange - 1, maxGw)}</h2>
              <select style={S.chipSel} value={teamSort} onChange={e => setTeamSort(e.target.value)}>
                <option value="def">FFDR vörn</option>
                <option value="att">FFDR sókn</option>
              </select>
            </div>
            <div style={S.muted}>
              FFDR er <b>útkoman</b> — ClubElo, xGC og markaðslínan eru inntök í hana
              og eru því ekki sýnd sér. Lægra FFDR = léttara. (DefCon-tækifærið er
              sér-merki og sést á leikmannaspjöldum og í liða-yfirlitinu.)
            </div>
            <div style={S.tblHead}>
              <span style={{ flex:1 }}>Lið</span>
              <span style={S.tblNum} title="FFDR fyrir varnarmenn, meðaltal valins bils">vörn</span>
              <span style={S.tblNum} title="FFDR fyrir framherja">sókn</span>
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
            <h2 style={S.h2}>Andstæðingar</h2>
            <div style={S.muted}>
              Berðu liðið þitt við keppinauta í mini-deildinni: hverjir eru
              <b> sérstöðumennirnir</b> (differentials) á báða bóga, og hver ber bandið hjá þeim.
            </div>
            <div style={S.rivalAddRow}>
              <input style={{ ...S.urlInput, width:"auto", flex:1, minWidth:0 }}
                placeholder="FPL-slóð eða liðsnúmer" value={rivalInput}
                onChange={e => setRivalInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addRival()} />
              <button style={S.connectBtn} onClick={addRival}>Bæta við</button>
            </div>
            {!rivals.length && <div style={S.muted}>Engir skráðir enn. Númerið er í slóð liðsins á fantasy.premierleague.com.</div>}
            {rivals.map(r => {
              const d = rivalData[r.id];
              if (!d) return <div key={r.id} style={S.rivalRow}><span style={S.rivalName}>lið {r.id}</span><span style={S.muted}>sæki…</span></div>;
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
                    <span style={S.rivalPts}>{d.gwPts != null ? `GW ${d.gwPts} · alls ${d.totalPts}` : "—"}</span>
                    <button style={S.rm} title="Fjarlægja"
                      onClick={() => { setRivals(rs => rs.filter(x => x.id !== r.id)); }}>✕</button>
                  </div>
                  {d.picks ? (
                    <>
                      <div style={S.rivalMeta}>
                        {shared}/15 sameiginlegir
                        {d.capId != null && <> · fyrirliði <b>{byId[d.capId]?.web_name ?? "?"}</b>
                          {d.capId === captain ? " (sami og þú)" : ""}</>}
                      </div>
                      {theirs.length > 0 && <div style={S.rivalDiff}>
                        <span style={S.rivalDiffLbl}>þeirra sérstaða</span>
                        {theirs.slice(0, 3).map(p => <span key={p.id} style={S.rivalChip}
                          title={`ep ${p.ep_next} · ${teamById[p.team]?.short}`}
                          onClick={() => setDetail({ kind:"player", id:p.id })}>{p.web_name}</span>)}
                        {theirs.length > 3 && <span style={S.muted}>+{theirs.length - 3}</span>}
                      </div>}
                      {mine.length > 0 && <div style={S.rivalDiff}>
                        <span style={{ ...S.rivalDiffLbl, color:C.green }}>þín sérstaða</span>
                        {mine.slice(0, 3).map(p => <span key={p.id} style={{ ...S.rivalChip, background:C.greenBg, color:"#0a7a4a" }}
                          title={`ep ${p.ep_next} · ${teamById[p.team]?.short}`}
                          onClick={() => setDetail({ kind:"player", id:p.id })}>{p.web_name}</span>)}
                        {mine.length > 3 && <span style={S.muted}>+{mine.length - 3}</span>}
                      </div>}
                    </>
                  ) : <div style={S.rivalMeta}>{d.error ? "náðist ekki — er númerið rétt?" : "ekkert lið skráð í þessari umferð enn (fyrir tímabil er það eðlilegt)"}</div>}
                </div>
              );
            })}
          </section>

          {/* API-staða */}
          <section style={S.card}>
            <h2 style={S.h2}>Gagnaheimildir</h2>
            <div style={S.srcRow}><span style={S.dotOk} />FPL bootstrap — {players.length} leikmenn, {teams.length} lið</div>
            <div style={S.srcRow}>
              <span style={news ? S.dotOk : S.dotWait} />
              Meiðsli og verð — {news
                ? `${(news.players || []).length} merktir · uppfært ${fmtClock(news.updated)}`
                : "bíður hraðakeyrslu"}
            </div>
            <div style={S.srcRow}><span style={S.dotOk} />FPL fixtures — {fixtures.length} leikir + FDR</div>
            <div style={S.srcRow}><span style={S.dotOk} />FPL events — frestir, {events.length} umferðir</div>
            <div style={S.srcRow}>
              <span style={oddsState === "ok" ? S.dotOk : S.dotWait} />
              Bókmakera-CS% {oddsState === "ok"
                ? `(${Object.keys(odds || {}).length} lið, úr pipeline)`
                : oddsState === "loading" ? "(sæki…)"
                : oddsState === "empty" ? "(skrá til, engir leikir á línu)"
                : "(odds.json vantar — keyrðu fetch-data)"}
            </div>
            <div style={S.srcRow}>
              <span style={Object.keys(eloByTeam || {}).length ? S.dotOk : S.dotWait} />
              ClubElo — {Object.keys(eloByTeam || {}).length}/{teams?.length ?? 0} lið
              {eloFx?.fixtures?.length ? ` · ${eloFx.fixtures.length} leikir m. CS-líkindum` : ""}
            </div>
            <div style={S.srcRow}>
              <span style={weatherReady ? S.dotOk : S.dotWait} />
              Veður — {weatherReady ? `${(weather.fixtures || []).filter(w => w.temp_c != null).length} leikir` : "utan 16-daga spár"}
            </div>
            <div style={S.srcRow}>
              <span style={injuries?.players?.length ? S.dotOk : S.dotWait} />
              Meiðsla-tegundir (API-Sports) — {injuries
                ? (injuries.error ? `villa: ${String(injuries.error).slice(0, 30)}` : `${(injuries.players || []).length} paraðir`)
                : "bíður fyrstu keyrslu"}
            </div>
            <div style={S.srcRow}>
              <span style={Object.keys(dcOpp || {}).length ? S.dotOk : S.dotWait} />
              DefCon-tækifæri — {Object.keys(dcOpp || {}).length} lið
              {defcon?.opportunity && Object.keys(defcon.opportunity).length ? " (pipeline)" : " (reiknað í appi)"}
            </div>
            <div style={S.srcRow}>
              <span style={defcon?.players?.length ? S.dotOk : S.dotWait} />
              DefCon hit-rate — {defcon?.players?.length || 0} leikmenn {defcon?.players?.length ? "" : "(bíður leikja)"}
            </div>
            {pipeStatus?.sources && Object.entries(pipeStatus.sources).filter(([k]) => k.startsWith("understat") || k.startsWith("fdcouk")).map(([k,v]) => (
              <div key={k} style={S.srcRow}>
                <span style={v.ok ? S.dotOk : S.dotWait} />{k} — {v.ok ? `${v.count}` : (v.note || "").slice(0,34)}
              </div>
            ))}
          </section>
        </div>
      </div>

      {/* ---------- TILLÖGUR ---------- */}
      <section style={{ ...S.card, marginTop:16 }}>
        <div style={S.recHead}>
          <h2 style={S.h2}>Mælt með kaupum — GW{gw}–{Math.min(gw + recRange - 1, maxGw)}</h2>
          <div style={S.recCtl}>
            <select style={S.chipSel} value={recRange} onChange={e => setRecRange(+e.target.value)}>
              <option value={1}>næsti leikur</option>
              <option value={2}>næstu 2</option>
              <option value={3}>næstu 3</option>
              <option value={4}>næstu 4</option>
              <option value={5}>næstu 5</option>
              <option value={6}>næstu 6</option>
              <option value={8}>næstu 8</option>
            </select>
            <select style={S.chipSel} value={recPos} onChange={e => setRecPos(e.target.value)}>
              <option value="ALL">allar stöður</option>
              <option value="1">markverðir</option>
              <option value="2">vörn</option>
              <option value="3">miðja</option>
              <option value="4">sókn</option>
            </select>
          </div>
        </div>
        <div style={S.muted}>
          {formFeat?.mode === "fitted" ? (
            <>
              <b style={{ color: C.green }}>Mælt líkan.</b> Vogtölur fittaðar út-af-úrtaki á 2025/26
              ({formFeat.gws_used} umferðir í rúllandi glugga). Ríkjandi þáttur er <b>mínútur</b>.
              Leikjaþyngd er <b>mæld tafla</b> úr 1.102 leikjum, ekki línuleg ágiskun —
              FDR er rétt kvarðað að meðaltali en of grófkornótt, svo við fínum það með liðsstyrk.
            </>
          ) : (
            <>
              <b style={{ color: C.amber }}>Fyrir-tímabils ham.</b> Mínútur síðustu umferða eru
              ríkjandi þátturinn en þær eru ekki til enn. Notum verð, FPL ep_next og síðasta tímabil.
              Mæling sýnir að þetta er <b>~1,5 stigum ónákvæmara</b> — skorið verður skarpara frá GW6.
            </>
          )}
        </div>
        {[1,2,3,4].filter(pos => recPos === "ALL" || +recPos === pos).map(pos => (
          <div key={pos} style={S.recBlock}>
            <div style={S.recPosLbl}><span style={{ ...S.posDot, background: POS_COLOR[pos] }} />{POS_LABEL[pos]}</div>
            <div style={S.recGrid}>
              {(recommendations.byPos[pos] || []).map(r => (
                <RecCard key={r.p.id} r={r} team={teamById[r.p.team]} teamById={teamById}
                  dc={dcOpp[r.p.team]} elo={eloByTeam[r.p.team]} diffOf={fixDifficulty} relOf={tierRel}
                  crestFor={crestFor} csFor={csFor} range={recRange} onAdd={() => setDetail({ kind:"player", id:r.p.id })} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ---------- Yfirlit: leikmaður eða lið ---------- */}
      {detail && (() => {
        const isPlayer = detail.kind === "player";
        const p = isPlayer ? byId[detail.id] : null;
        const t = isPlayer ? teamById[p?.team] : teamById[detail.id];
        if (!t) return null;
        // FFDR-sjóndeildarhringur fylgir stillingunni (lágmark 6 svo
        // Evrópu- og bikarleikir sjáist í samhengi)
        const fxs = allFixturesFor(t.id, gw, Math.max(6, recRange));
        const av = isPlayer ? availOf(p) : null;
        const ban = isPlayer ? banRisk(p, gw, seasonStarted) : null;
        const sp = isPlayer ? setPieceOf(p) : null;
        const rot = isPlayer ? rotationRisk(p, seasonGames) : null;
        const tm = teamMetrics[t.id] || {};
        const e = eloByTeam[t.id], dcv = dcOpp[t.id];
        const per90 = (v, mins) => (mins > 400 && v != null) ? +(parseFloat(v) * (90 / mins)).toFixed(2) : null;
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
                      : `${t.short} · ${(players || []).filter(x => x.team === t.id).length} leikmenn`}
                  </div>
                </div>
                <button style={S.close} onClick={() => setDetail(null)}>✕</button>
              </div>

              {/* staða / meiðsli */}
              {isPlayer && av.isRisk && (
                <div style={{ ...S.dAlert, background:av.bg, color:av.color }}>
                  <b>{av.label}</b>{av.chance != null ? ` — ${av.chance}% líkur á að spila` : ""}
                  {av.news ? <div style={{ marginTop:2, fontWeight:400 }}>{av.news}</div> : null}
                  {injuryById[p.id]?.reason && (
                    <div style={{ marginTop:3, fontWeight:400 }}>
                      Tegund: <b>{injuryById[p.id].reason}</b>
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
                  <b>API-Sports skráir:</b> {injuryById[p.id].reason}
                  {injuryById[p.id].type ? ` (${injuryById[p.id].type})` : ""} —
                  FPL hefur ekki flaggað hann, svo þetta getur verið úrelt eða smávægilegt.
                </div>
              )}
              {isPlayer && ban && (ban.level === "high" || ban.level === "mid") && (
                <div style={{ ...S.dAlert, background:"#fff6e0", color:"#8a5f00" }}>
                  <b>{ban.y} gul spjöld</b> — {ban.toGo} frá {ban.threshold}-þröskuldi
                  ({ban.matches} {ban.matches === 1 ? "leikur" : "leikir"} í banni)
                </div>
              )}

              {/* ---------- TÖLUR — FLOKKAÐAR UNDIR FYRIRSÖGNUM ----------
                  Þrír flokkar með lit fyrirsagnarinnar sem heimildar-merki:
                  grænt = lifandi núna · gult = tímabils-uppsöfnun (með
                  dálkum "í ár" og "í fyrra" þegar bæði eru til) ·
                  fjólublátt = reiknað mat appsins.                        */}
              {isPlayer ? (
                <>
                  <div style={S.dGroupHead}>
                    <span style={{ ...S.dGroupDot, background:C.green }} />
                    Núna <span style={S.dGroupSub}>lifandi úr FPL</span>
                  </div>
                  <div style={S.dGrid}>
                    <DStat k="Spá næstu (ep)" v={p.ep_next} />
                    <DStat k="Eignarhlutfall" v={`${p.selected_by_percent}%`} />
                    <DStat k="Form" v={p.form} sub="rúllandi 30 dagar" />
                    {sp && <DStat k="Vítaröð" v={sp.pen ?? "—"} sub={sp.isPenTaker ? "fyrsti taki" : ""} />}
                  </div>

                  <div style={S.dGroupHead}>
                    <span style={{ ...S.dGroupDot, background:C.amber }} />
                    {seasonStarted && baselineById[p.id]
                      ? <>Tímabilin <span style={S.dGroupSub}>uppsafnað — í ár á móti í fyrra</span></>
                      : <>Tímabilið {cumLabel} <span style={S.dGroupSub}>uppsafnað{seasonStarted ? "" : " — nýtt tímabil ekki hafið"}</span></>}
                  </div>
                  {(() => {
                    const bl = baselineById[p.id];
                    const rows = [
                      ["Stig", p.total_points, bl?.total_points],
                      ["Stig/leik", p.points_per_game, bl?.points_per_game],
                      ["Mínútur", p.minutes, bl?.minutes],
                      rot && ["Byrjaði", `${rot.starts}/${rot.played} (${rot.pct}%)`,
                        bl?.starts != null ? `${bl.starts}/38 (${Math.round(bl.starts / 38 * 100)}%)` : null],
                      ["Mörk + assist", `${p.goals_scored ?? 0} + ${p.assists ?? 0}`,
                        bl ? `${bl.goals_scored ?? 0} + ${bl.assists ?? 0}` : null],
                      ["xG / 90", per90(p.expected_goals, p.minutes) ?? "—",
                        bl ? (per90(bl.expected_goals, bl.minutes) ?? "—") : null],
                      ["xA / 90", per90(p.expected_assists, p.minutes) ?? "—",
                        bl ? (per90(bl.expected_assists, bl.minutes) ?? "—") : null],
                      p.element_type <= 2 && ["Hrein blöð", p.clean_sheets, bl?.clean_sheets],
                      ["Gul / rauð", `${p.yellow_cards ?? 0} / ${p.red_cards ?? 0}`,
                        bl ? `${bl.yellow_cards ?? 0} / ${bl.red_cards ?? 0}` : null],
                    ].filter(Boolean);
                    /* Þegar bæði tímabil eru til: SAMANBURÐARTAFLA með dálk
                       fyrir hvort. Annars venjulegt dálkanet — sama gagn. */
                    if (seasonStarted && bl) return (
                      <table style={S.cmpTable}>
                        <thead><tr>
                          <th style={S.cmpTh}></th>
                          <th style={{ ...S.cmpTh, ...S.cmpThNum }}>í ár · GW1–{seasonGames}</th>
                          <th style={{ ...S.cmpTh, ...S.cmpThNum, color:C.text3 }}>{baseline?.label || "í fyrra"}</th>
                        </tr></thead>
                        <tbody>
                          {rows.map(([k, cur, prev]) => (
                            <tr key={k}>
                              <td style={S.cmpK}>{k}</td>
                              <td style={S.cmpV}>{cur ?? "—"}</td>
                              <td style={{ ...S.cmpV, color:C.text3 }}>{prev ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                    return (
                      <div style={S.dGrid}>
                        {rows.map(([k, cur]) => <DStat key={k} k={k} v={cur ?? "—"}
                          sub={k === "Gul / rauð" && !seasonStarted ? "núllstillast við GW1" : null} />)}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <>
                  <div style={S.dGroupHead}>
                    <span style={{ ...S.dGroupDot, background:C.purple }} />
                    Styrkur liðsins <span style={S.dGroupSub}>reiknað mat appsins ({cumLabel}) · ClubElo lifandi</span>
                  </div>
                  <div style={S.dGrid}>
                    <DStat k="ClubElo" v={e ? Math.round(e.elo) : "—"} sub={e ? `rank ${e.rank}` : "ekki paraður"} />
                    <DStat k="xG / leik" v={tm.xg90 ?? "—"} />
                    <DStat k="xGC / 90" v={tm.xgc90 ?? "—"} sub="lægra betra" />
                    <DStat k="DefCon-tækifæri" v={dcv ? dcv.defcon_opportunity : "—"} sub="hærra = fleiri CBIT" />
                  </div>
                </>
              )}

              {/* VERÐ: kaup, sala, hagnaður (50%-reglan) */}
              {isPlayer && squadIds.has(p.id) && (() => {
                const buy = buyOf(p.id), cur = p.now_cost, sell = sellOf(p.id);
                const profit = cur - buy, kept = sell - buy;
                return (
                  <>
                    <div style={S.dSectionLbl}>
                      Verð
                      <span style={S.dSectionNote}>50% af hagnaði, niðurjafnað</span>
                    </div>
                    <div style={S.priceRow}>
                      <label style={S.priceLbl}>Kaupverð</label>
                      {editPrice === p.id ? (
                        <div style={S.priceEdit}>
                          <button style={S.priceStep} title="−0,1"
                            onClick={() => setBuyPrices(b => ({ ...b, [p.id]: { p: Math.max(35, buy - 1), src:"manual" } }))}>−</button>
                          <input type="number" step="0.1" min="3.5" max="20" style={S.priceInput}
                            value={(buy / 10).toFixed(1)}
                            onChange={e => {
                              const v = Math.round(parseFloat(e.target.value) * 10);
                              if (Number.isFinite(v)) setBuyPrices(b => ({ ...b, [p.id]: { p: clamp(v, 35, 200), src:"manual" } }));
                            }} />
                          <button style={S.priceStep} title="+0,1"
                            onClick={() => setBuyPrices(b => ({ ...b, [p.id]: { p: Math.min(200, buy + 1), src:"manual" } }))}>+</button>
                          <button style={S.priceDone} onClick={() => setEditPrice(null)}>✓</button>
                          {buyPrices[p.id] != null && (
                            <button style={S.priceReset} title="Aftur í sjálfvirkt"
                              onClick={() => { setBuyPrices(b => { const n = { ...b }; delete n[p.id]; return n; }); setEditPrice(null); }}>
                              núllstilla
                            </button>
                          )}
                        </div>
                      ) : (
                        <button style={S.priceOpen} onClick={() => setEditPrice(p.id)}
                          title="Smelltu til að stilla kaupverð">
                          £{(buy / 10).toFixed(1)}<span style={S.priceOpenIcon}>stilla</span>
                        </button>
                      )}
                    </div>
                    <div style={S.dGrid}>
                      <DStat k="Núverandi" v={`£${(cur / 10).toFixed(1)}`} src="live" />
                      <DStat k="Söluverð" v={`£${(sell / 10).toFixed(1)}`}
                        sub={profit > 0 ? `${((profit - kept) / 10).toFixed(1)} tapast` : ""} />
                      <DStat k="Verðbreyting"
                        v={`${profit >= 0 ? "+" : ""}£${(profit / 10).toFixed(1)}`}
                        sub={profit > 0 ? `heldur £${(kept / 10).toFixed(1)}` : profit < 0 ? "fullt verð" : ""} />
                    </div>
                    {(() => {
                      const src = buySrcOf(p.id);
                      const rec = buyPrices[p.id];
                      const date = rec && typeof rec === "object" ? rec.date : null;
                      const LBL = {
                        manual:  ["Stillt af þér", C.purple],
                        api:     ["Úr FPL", C.green],
                        auto:    [date ? `Skráð sjálfkrafa ${date}` : "Skráð sjálfkrafa", C.green],
                        planned: ["Ekki keyptur enn — enginn hagnaður", C.text2],
                      };
                      const [txt, col] = LBL[src] || ["Áætlað sem núverandi verð", C.amber];
                      return (
                        <div style={S.dNote}>
                          <span style={{ color: col, fontWeight: 600 }}>{txt}.</span>{" "}
                          {src === "auto"
                            ? "Appið sá verðið þegar hann kom inn í liðið. Stilltu ef það er ekki rétt."
                            : src === "planned"
                              ? "Hagnaður byrjar að reiknast þegar skiptin fara fram."
                              : src === "manual" || src === "api"
                                ? "Söluverð og banki reiknast af þessu."
                                : "Opinbera FPL-slóðin gefur ekki kaupverð. Stilltu það hér, eða tengdu liðið — þá skráir appið það sjálft."}
                        </div>
                      );
                    })()}
                  </>
                );
              })()}

              {/* GW-FRAMMISTAÐA — hvernig gekk í þessari umferð */}
              {isPlayer && (() => {
                const g = gwStats?.byId?.[p.id];
                if (!g) return (
                  <>
                    <div style={S.dSectionLbl}>GW{gw} frammistaða</div>
                    <div style={S.muted}>
                      Engar tölur fyrir GW{gw} enn — umferðin er ekki byrjuð (tímabil hefst 21. ágúst).
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
                      GW{gw} frammistaða
                      <span style={S.dSectionNote}>
                        {st.total_points} stig · {st.minutes} mín
                        {gwStats.src === "live" ? " · lifandi" : ""}
                      </span>
                    </div>
                    <div style={S.dGrid}>
                      <DStat k="Stig" v={num(st.total_points)} />
                      <DStat k="Mínútur" v={num(st.minutes)} />
                      <DStat k="Mörk" v={num(st.goals_scored)} />
                      <DStat k="Assist" v={num(st.assists)} />
                      <DStat k="xG" v={xg == null ? "—" : (+xg).toFixed(2)}
                        sub={xg != null && st.minutes > 0 ? (overP >= 0 ? `+${overP.toFixed(2)} yfir` : `${overP.toFixed(2)} undir`) : ""} />
                      <DStat k="xA" v={xa == null ? "—" : (+xa).toFixed(2)} />
                      <DStat k="Bónus / BPS" v={`${num(st.bonus)} / ${num(st.bps)}`} />
                      {p.element_type <= 2 && <DStat k="Hreint blað" v={st.clean_sheets ? "já" : "nei"} sub={`${num(st.goals_conceded)} á sig`} />}
                      {p.element_type <= 2 && <DStat k="xGC" v={st.expected_goals_conceded == null ? "—" : (+st.expected_goals_conceded).toFixed(2)} />}
                      {p.element_type === 1 && <DStat k="Vörslur" v={num(st.saves)} />}
                      {(st.yellow_cards || st.red_cards) ? <DStat k="Spjöld" v={`${num(st.yellow_cards)}G / ${num(st.red_cards)}R`} /> : null}
                      {st.defensive_contribution != null && <DStat k="Varnarframlag" v={st.defensive_contribution} />}
                    </div>

                    {/* Hvaðan stigin komu — úr explain, óskert */}
                    {ex.length > 0 && (
                      <>
                        <div style={S.dSubLbl}>Hvaðan stigin komu</div>
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
                      <b>Big chances missed</b> er ekki í FPL-API-inu. Það er afleitt úr Understat
                      skot-gögnum (skot með xG yfir 0,30 sem fór ekki inn) — birtist þegar
                      skot-gögn eru komin (tímabil hafið).
                    </div>
                  </>
                );
              })()}

              {/* LEIKIR — deild + Evrópa + bikar */}
              <div style={S.dSectionLbl}>
                Leikir
                <span style={S.dSectionNote}>
                  {euroFx?.fixtures?.length
                    ? "deild · Evrópa · bikar"
                    : "deild (Evrópu/bikar-gögn ekki komin)"}
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
                      <span style={S.dFixFdr} title={`FDR ${f.fdr}, samsett ${dd}`}>þyngd {dd}</span>
                      {(() => {
                        const tr = travelByFx[f.id];
                        if (!tr?.km) return null;
                        // sjónarhorn skoðaða liðsins: úti = ÞAÐ ferðast,
                        // heima = MÓTHERJINN ferðast (gott fyrir vörnina)
                        return (
                          <span style={{ ...S.dFixTravel, ...(tr.is_long_trip ? S.dFixTravelLong : {}) }}
                            title={f.home
                              ? `Mótherjinn ferðast ${tr.km} km (loftlína)${tr.is_long_trip ? " — langferð (300+ km), mælist draga úr útiliðum" : ""}`
                              : `${isPlayer ? "Liðið" : t.short} ferðast ${tr.km} km (loftlína)${tr.is_long_trip ? " — langferð (300+ km)" : ""}`}>
                            ✈{tr.km}{f.home ? "→" : ""}
                          </span>
                        );
                      })()}
                      {isPlayer && HOME_PTS[p.element_type] != null && (
                        <span style={S.dFixHome}
                          title={`Mælt heimavallar-forskot fyrir ${POS_LABEL[p.element_type].toLowerCase()}: +${HOME_PTS[p.element_type]} stig/leik`}>
                          {f.home ? `+${HOME_PTS[p.element_type].toFixed(2)}` : "úti"}
                        </span>
                      )}
                      <span style={{ flex:1 }} />
                      {cs.cs != null && <span style={S.dFixCs}>CS {cs.cs}%</span>}
                      <span style={S.dFixDate}>{fmtDate(f.date)}</span>
                    </div>
                  );
                })}
                {!fxs.length && <div style={S.muted}>Engir leikir skráðir.</div>}
              </div>

              {/* aðgerðir */}
              <div style={S.dActions}>
                {isPlayer && squadIds.has(p.id) && (
                  <>
                    <button style={S.dBtn} onClick={() => { setDetail(null); setSelling(p.id); setSearchQ(""); }}>Skipta út</button>
                    {starters.some(x => x.id === p.id) && p.id !== captain &&
                      <button style={S.dBtn} onClick={() => { if (p.id === vice) setVice(null); setCaptain(p.id); setDetail(null); flash(`${p.web_name} er fyrirliði`); }}>Fyrirliði</button>}
                    {starters.some(x => x.id === p.id) && p.id !== captain && p.id !== vice &&
                      <button style={S.dBtn} onClick={() => { setVice(p.id); setDetail(null); flash(`${p.web_name} er varafyrirliði`); }}>Varafyrirliði</button>}
                  </>
                )}
                {isPlayer && <button style={S.dBtn} onClick={() => setDetail({ kind:"team", id:t.id })}>Sjá lið: {t.short}</button>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ---------- Leitargluggi ---------- */}
      {(selling !== null || browse) && (
        <div style={S.overlay} onClick={() => { setSelling(null); setBrowse(false); setSearchQ(""); }}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <input autoFocus style={S.search} placeholder="Leita — nafn eða lið"
                value={searchQ} onChange={e => setSearchQ(e.target.value)} />
              <button style={S.close} onClick={() => { setSelling(null); setBrowse(false); setSearchQ(""); }}>✕</button>
            </div>
            {browse && !selling && (
              <div style={S.posFilter}>
                {[["all","Allir"],["1","GK"],["2","Vörn"],["3","Miðja"],["4","Sókn"]].map(([v,l]) => (
                  <button key={v} onClick={() => setSearchPos(v)}
                    style={{ ...S.posBtn, ...(searchPos === v ? S.posBtnOn : {}) }}>{l}</button>
                ))}
              </div>
            )}
            <div style={S.searchList}>
              {searchResults.map(p => {
                const t = teamById[p.team];
                const fx = (fixByTeamGw[p.team]?.[gw] || [])[0];
                const diff = (sellOf(selling) - p.now_cost) / 10;
                // sýna fyrirfram hvort skiptin eru lögleg
                let block = null;
                if (selling) {
                  const after = squadAt.map(x => (x.id === selling ? p.id : x.id));
                  if (after.filter(id => byId[id]?.team === p.team).length > 3) block = "3 per félag";
                  else if (bank + diff < 0) block = `vantar £${Math.abs(bank + diff).toFixed(1)}`;
                }
                return (
                  <button key={p.id}
                    onClick={() => selling
                      ? commitTransfer(selling, p.id)
                      : (setBrowse(false), setSearchQ(""), setDetail({ kind:"player", id:p.id }))}
                    style={{ ...S.sItem, ...(block ? S.sItemBlocked : {}) }}
                    title={block ? `Ólöglegt: ${block}` : ""}>
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
                        {setPieceOf(p)?.isPenTaker && <span style={S.sPen} title="Fyrsti vítataki (uppfærist daglega úr FPL)">PEN</span>}
                      </div>
                      <div style={S.sMeta}>
                        {t?.short} · {POS_LABEL[p.element_type]} · ep {p.ep_next}
                        {fx ? ` · ${oppLabel(teamById[fx.opp]?.short, fx.home)}` : ""}
                      </div>
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
              {!searchResults.length && <div style={S.muted}>Enginn leikmaður fannst.</div>}
            </div>
          </div>
        </div>
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

function FixChip({ fx, teamById, diff, pos, relTier }) {
  if (!fx) return <div style={S.noFix}>—</div>;
  const opp = teamById[fx.opp]?.short || "?";
  const d = diff != null ? diff : fx.fdr;
  // AFSTÆTT þrep ef til (innan liðsins), annars algilt
  const t = relTier != null ? relTier : tierOf(d);
  const bg = TIER_BG[t], fg = TIER_FG[t];
  return (
    <div style={{ ...S.fixChip, background:bg, color:fg }}
      title={diff != null
        ? `${TIER_NAME[t]} — ${relTier != null ? "AFSTÆTT innan liðsins" : "algilt"}`
          + `\nFFDR ${d} (algilt, samanburðarhæft milli liða)`
          + `\nFDR ${fx.fdr} · ${fx.home ? "heima" : "úti"}`
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
  const DAYS = ["sunnudagur","mánudagur","þriðjudagur","miðvikudagur","fimmtudagur","föstudagur","laugardagur"];
  const MON  = ["jan","feb","mars","apríl","maí","júní","júlí","ágúst","sept","okt","nóv","des"];
  const dayLbl = iso => {
    if (!iso) return "Ótímasett";
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
      <div style={S.gfHead}>Leikir GW{gw}</div>
      <div style={S.gfEmpty}>Engir leikir skráðir — auð umferð.</div>
    </div>
  );
  return (
    <div className="gf-wrap" style={S.gfWrap}>
      <div style={S.gfHead}>Leikir GW{gw} <span style={S.gfCount}>{list.length} leikir</span></div>
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
                  title={`${team?.name || "?"} — ${home ? "heima" : "úti"}${d != null ? ` · FFDR ${d}` : ""}`}>
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
                  title={hasDetail ? "Smelltu fyrir markaskorara"
                        : [
                            w?.temp_c != null ? `${Math.round(w.temp_c)}°C${w.precip_mm >= 0.5 ? " · úrkoma" : ""}` : null,
                            travelByFx?.[f.id]?.km ? `✈ ${A?.short || "úti"} ferðast ${travelByFx[f.id].km} km${travelByFx[f.id].is_long_trip ? " (langferð)" : ""}` : null,
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
  const POSB = [[2,"VÖRN"],[4,"SÓKN"]];   // tveir hópar — GK+DEF og MID+FWD
  return (
    <section style={S.card}>
      <div style={S.recHead}>
        <h2 style={S.h2}>FFDR — leikjaþyngd</h2>
        <div style={S.ffdrPos}>
          {POSB.map(([v,l]) => (
            <button key={v} style={{ ...S.ffdrPosBtn, ...(pos === v ? S.ffdrPosOn : {}) }}
              onClick={() => setPos(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div style={S.muted}>
        GW{gws[0]}–{gws[gws.length-1]} · raðað eftir meðal-FFDR (léttast efst).
        <b> Þetta er ALGILDUR kvarði</b> — samanburðarhæfur milli liða, svo lélegt
        lið er rautt jafnvel í léttum leik. Það er rétt fyrir „hvern á ég að kaupa".
        Leikja-flísar á spjöldum eru <b>afstæðar innan liðsins</b> — fyrir „hvenær
        á ég að spila honum".
      </div>
      <div style={S.ffdrScroll}>
        <table style={S.ffdrTable}>
          <thead>
            <tr>
              <th style={{ ...S.ffdrTh, ...S.ffdrThTeam }}>Lið</th>
              {gws.map(g => <th key={g} style={S.ffdrTh}>{g}</th>)}
              <th style={S.ffdrTh} title="Meðaltal yfir sviðið">Með.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ t, cells, avg }) => (
              <tr key={t.id}>
                <td style={S.ffdrTeamCell}>
                  <button style={S.ffdrTeamBtn} onClick={() => onPickTeam && onPickTeam(t.id)}>
                    <Crest team={t} size={13} />{t.short}
                  </button>
                </td>
                {cells.map((c, i) => {
                  if (c.blank) return <td key={i} style={S.ffdrBlank} title="Auð umferð">—</td>;
                  const worst = Math.max(...c.items.map(x => x.d));
                  const tier = tierOf(worst);
                  return (
                    <td key={i} style={{ ...S.ffdrTd, background: TIER_BG[tier], color: TIER_FG[tier] }}
                      title={c.items.map(x => `${teamById[x.f.opp]?.short}${x.f.home ? " (h)" : " (ú)"} · ${x.d}`).join("  |  ")}>
                      {c.items.map((x, k) => (
                        <span key={k} style={S.ffdrOpp}>
                          {teamById[x.f.opp]?.short || "?"}{x.f.home ? "" : <i style={S.ffdrAway}>ú</i>}
                        </span>
                      ))}
                      {c.multi && <span style={S.ffdrDouble}>×2</span>}
                    </td>
                  );
                })}
                <td style={S.ffdrAvg}>{avg == null ? "—" : avg.toFixed(2)}</td>
              </tr>
            ))}
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
  onInfo, onTransfer, onCardClick, swapSel, seasonStarted, seasonGames, relOf, ep, cumLabel, dragId, setDragId, onDropPlayer }) {
  if (!p) return null;
  const isCap = p.id === captain, isVice = p.id === vice;
  const isDef = p.element_type <= 2;
  const dragging = dragId === p.id;
  const csObj = isDef ? csFor(p.team, fx) : null;
  const xga = isDef ? xgaFor(p.team, fx) : null;
  const csColor = csObj?.cs == null ? C.text3 : csObj.cs >= 40 ? C.green : csObj.cs >= 25 ? C.amber : C.red;
  const av = availOf(p);
  const ban = banRisk(p, gwNow, seasonStarted);
  const sp = setPieceOf(p);
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
        // VALINN til skipta fær sterkan ramma; plönuð viðbót punktalínu
        outline: swapSel === p.id ? `2px solid ${C.purple}`
               : isPlanned ? `2px dashed ${C.green}` : "none",
        outlineOffset: swapSel === p.id ? 2 : (isPlanned ? 1 : 0),
      }}
      title={swapSel === p.id ? "Valinn — smelltu á annan til að skipta"
             : "Smelltu til að skipta við annan leikmann"}>
      {/* IKON — sér aðgerðir. Smellur á spjaldið er SKIPTI. */}
      <div style={S.pcIcons}>
        <button style={S.pcIcon} title="Upplýsingar"
          onClick={e => { e.stopPropagation(); onInfo && onInfo(); }}>i</button>
        <button style={{ ...S.pcIcon, ...S.pcIconSwap }} title="Skipta út — opnar leit"
          onClick={e => { e.stopPropagation(); onTransfer && onTransfer(); }}>⇄</button>
      </div>
      {isCap && <span style={{ ...S.band, background:"#ffd23f", color:"#4a3800" }}>C</span>}
      {isVice && <span style={{ ...S.band, background:"#c9c9d0", color:"#33333a" }}>V</span>}
      {av.isRisk && (
        <span style={{ ...S.availBadge, background:av.bg, color:av.color }}
          title={`${av.label}${av.chance != null ? ` — ${av.chance}% líkur` : ""}${av.news ? `\n${av.news}` : ""}`}>
          {av.short}{av.chance != null && av.chance > 0 ? av.chance : ""}
        </span>
      )}
      <div style={S.pPortrait}
        title={`${team?.name || "?"}${"\n"}ATH: FPL-myndin getur sýnt GAMALT félag eftir skipti. Merkið er rétt.`}>
        <PlayerImg code={p.code} short={team?.short} size={38} />
        {/* Merkið er ÓTVÍRÆÐA félags-vísbendingin — stærra og með hvítum
            baug svo það lesist yfir myndinni, sem getur verið úrelt.       */}
        <Crest team={team} size={18} style={S.pCrest} />
      </div>
      <div style={S.pName}>{p.web_name}</div>
      <div style={S.pPrice}>
        £{(p.now_cost/10).toFixed(1)}
        {sellTenths_ != null && sellTenths_ < p.now_cost &&
          <span style={S.pSell} title={`Söluverð eftir 50%-reglunni: £${(sellTenths_/10).toFixed(1)}`}>
            →{(sellTenths_/10).toFixed(1)}
          </span>}
      </div>
      <FixChip fx={fx} teamById={teamById} diff={diffOf ? diffOf(p.team, fx, p.element_type) : null} pos={p.element_type}
        relTier={relOf ? relOf(p.team, fx, p.element_type) : null} />
      {/* EIN aðaltala */}
      {/* EIN aðaltala — VÆNT STIG leikmannsins.
          Áður var hér lið-xG fyrir sóknarmenn, en það er ÓÞARFI: FFDR-flísin
          inniheldur það þegar (eigin sóknarstyrkur vegur 0,60 í FFDR fyrir
          framherja). Vænt stig er leikmanns-stig og ekki tvítalning.        */}
      <div style={S.pMain}>
        <span style={S.pEp} title="Vænt stig í þessari umferð (mínútur + FFDR + form)">
          {ep == null ? "—" : `≈${ep.toFixed(1)}`}
        </span>
        {isDef && csObj?.cs != null && (
          <span style={{ ...S.pCsSmall, color:csColor }} title="Líkur á hreinu blaði (mælt)">
            CS {csObj.cs}%
          </span>
        )}
      </div>
      {/* Fínleg merkjaröð — aðeins það sem er athugavert */}
      <div style={S.sigRow}>
        {sp?.isPenTaker && <span style={S.sigPen} title="Fyrsti vítataki (uppfærist daglega)">PEN</span>}
        {isDef && dc && dc.defcon_opportunity >= 70 &&
          <span style={S.sigDc} title={`DefCon-tækifæri ${dc.defcon_opportunity} — mikið vinnuálag varnar`}>DC{dc.defcon_opportunity}</span>}
        {ban && ban.level === "high" &&
          <span style={S.sigCard} title={`${ban.y} gul spjöld — 1 frá ${ban.threshold}-þröskuldi (${ban.matches} leikja bann)`}>{ban.y}Y</span>}
        {rot && rot.level === "high" &&
          <span style={S.sigRot} title={`Byrjaði ${rot.starts} af ${rot.played} leikjum${rot.prevSeason && cumLabel ? ` tímabilið ${cumLabel}` : ""} — skiptingar-hætta`}>{rot.pct}%</span>}
      </div>
    </div>
  );
}

function RecCard({ r, team, teamById, dc, elo, crestFor, csFor, diffOf, relOf, range, onAdd }) {
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
          // AFSTÆTT innan liðsins — sami kvarði sem á leikmanna-spjöldum
          const t = relOf ? (relOf(p.team, f, p.element_type) ?? tierOf(d)) : tierOf(d);
          const bg = TIER_BG[t], fg = TIER_FG[t];
          return (
            <span key={i} style={{ ...S.recFixChip, background:bg, color:fg }}
              title={`samsett þyngd ${d} (FDR ${f.fdr})`}>
              {oppLabel(teamById[f.opp]?.short, f.home)}
            </span>
          );
        })}
      </div>
      <div style={S.recExtra}>
        {/* HVERS VEGNA — svo skorið sé ekki dulúð. Mínútur og verð ráða; leikir vega ~5%. */}
        {r.why && <span style={S.recWhy}>{r.why}</span>}
        {r.ffdrAvg != null && <span style={S.recFfdr} title="Meðal-FFDR (algilt) yfir sviðið">FFDR {r.ffdrAvg}</span>}
        {isDef && (() => {
            /* VILLA SEM VAR: "|| 0" taldi vantandi CS sem NÚLL og dró meðaltalið
               niður — Raya (Arsenal) sýndi 9% þegar lægsta mögulega er 15%.
               Nú er vantandi gildum SLEPPT, og ef ekkert er til sýnum við "—". */
            const vals = fxs.map(f => csFor(p.team, f).cs).filter(v => Number.isFinite(v));
            if (!vals.length) return "CS-vænting —";
            return `CS-vænting ${Math.round(vals.reduce((a, v) => a + v, 0) / vals.length)}%`;
          })()}
        {isDef && dc && ` · DC ${dc.defcon_opportunity}`}
        {elo && `${isDef ? " · " : ""}elo ${Math.round(elo.elo)}`}
      </div>
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
  urlInput: { background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 11px", fontSize:13, color:C.text, width:210, outline:"none" },
  searchBtn: { background:C.card, border:`1px solid ${C.borderStrong}`, borderRadius:8, padding:"8px 12px", fontSize:12.5, color:C.text, cursor:"pointer", whiteSpace:"nowrap" },
  posFilter: { display:"flex", gap:4, padding:"0 13px 9px" },
  posBtn: { flex:1, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 0", fontSize:11, color:C.text2, cursor:"pointer" },
  posBtnOn: { background:C.purple, color:"#fff", border:`1px solid ${C.purple}`, fontWeight:600 },
  connectBtn: { background:C.purple, color:"#fff", border:"none", borderRadius:8, padding:"9px 14px", fontSize:13, fontWeight:600, cursor:"pointer" },

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
  ffdrPos: { display:"flex", gap:3 },
  ffdrPosBtn: { fontFamily:mono, fontSize:9, fontWeight:700, letterSpacing:0.3, cursor:"pointer",
    padding:"3px 7px", background:C.cardAlt, color:C.text2, border:`1px solid ${C.border}`, borderRadius:6 },
  ffdrPosOn: { background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  ffdrScroll: { overflowX:"auto", marginTop:8, paddingBottom:2 },
  ffdrTable: { borderCollapse:"separate", borderSpacing:2, fontSize:9.5, width:"100%" },
  ffdrTh: { fontFamily:mono, fontSize:8.5, fontWeight:700, color:C.text3, textAlign:"center",
    padding:"1px 3px", minWidth:34 },
  ffdrThTeam: { textAlign:"left", minWidth:58, position:"sticky", left:0, background:C.card, zIndex:1 },
  ffdrTeamCell: { position:"sticky", left:0, background:C.card, zIndex:1, padding:0 },
  ffdrTeamBtn: { display:"flex", alignItems:"center", gap:4, width:"100%", cursor:"pointer",
    fontFamily:mono, fontSize:10, fontWeight:700, color:C.text, background:"none", border:"none", padding:"2px 3px" },
  ffdrOpp: { display:"block" },
  ffdrAway: { fontStyle:"normal", fontSize:7, opacity:0.7, marginLeft:1 },
  ffdrDouble: { display:"block", fontSize:7, opacity:0.8 },
  ffdrBlank: { textAlign:"center", padding:"3px 2px", borderRadius:5, background:C.cardAlt,
    color:C.text3, fontFamily:mono, fontSize:9 },
  ffdrAvg: { textAlign:"center", padding:"3px 4px", fontFamily:mono, fontSize:9.5, fontWeight:700,
    color:C.text2, background:C.cardAlt, borderRadius:5 },
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
  pcIcon: { width:15, height:15, padding:0, display:"flex", alignItems:"center", justifyContent:"center",
    fontFamily:mono, fontSize:9, fontWeight:700, lineHeight:1, cursor:"pointer",
    background:"rgba(255,255,255,0.92)", color:C.text2, border:`1px solid ${C.border}`,
    borderRadius:4, boxShadow:"0 1px 2px rgba(0,0,0,0.10)" },
  pcIconSwap: { color:C.purple, border:"1px solid #d9c8f5", fontSize:10 },
  band: { position:"absolute", top:4, right:4, minWidth:15, height:15, borderRadius:8, fontFamily:mono, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", zIndex:2 },
  pPortrait: { position:"relative", height:34, display:"flex", alignItems:"flex-end", justifyContent:"center", marginBottom:2 },
  pCrest: { position:"absolute", bottom:-3, right:4, width:18, height:18, objectFit:"contain",
    background:"#fff", borderRadius:"50%", padding:1,
    boxShadow:"0 0 0 1.5px #fff, 0 1px 3px rgba(0,0,0,0.28)" },
  pName: { fontSize:11, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  pPrice: { fontFamily:mono, fontSize:10.5, color:C.text2 },
  pEp: { fontFamily:mono, fontSize:12, fontWeight:700, color:C.purple },
  pCsSmall: { fontFamily:mono, fontSize:8.5, fontWeight:700, marginLeft:4 },
  fixChip: { display:"inline-block", fontFamily:mono, fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:5, margin:"4px 0 1px" },
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
  dotOk: { width:7, height:7, borderRadius:"50%", background:C.green, flexShrink:0 },
  tblHead: { display:"flex", alignItems:"center", gap:4, fontFamily:mono, fontSize:9, textTransform:"uppercase", letterSpacing:0.6, color:C.text3, paddingBottom:4, borderBottom:`1px solid ${C.border}` },
  tblRow: { display:"flex", alignItems:"center", gap:4, padding:"3px 0", borderBottom:`1px solid ${C.page}` },
  // ffdrCell = <span> í leikmanns-yfirliti (inline-block)
  ffdrCell: { display:"inline-block", minWidth:32, textAlign:"center", fontFamily:mono,
    fontSize:10, fontWeight:700, padding:"1px 4px", borderRadius:4 },
  // ffdrTd = <td> í FFDR-töflunni. MÁ EKKI vera inline-block — brýtur töfluna.
  ffdrTd: { textAlign:"center", padding:"3px 2px", borderRadius:5, fontFamily:mono,
    fontSize:9, fontWeight:700, whiteSpace:"nowrap", lineHeight:1.25 },
  tblNum: { width:46, textAlign:"right", fontFamily:mono, fontSize:11, color:C.text2, position:"relative" },
  availBadge: { position:"absolute", top:4, left:4, fontFamily:mono, fontSize:8.5, fontWeight:700, padding:"1px 3px", borderRadius:4, lineHeight:1.3, zIndex:2 },
  sAvail: { fontFamily:mono, fontSize:8.5, fontWeight:700, padding:"1px 4px", borderRadius:4, marginLeft:5 },
  sPen: { fontFamily:mono, fontSize:8, fontWeight:700, padding:"1px 3px", borderRadius:4, background:"#e6f9f0", color:"#0a7a4a", marginLeft:4 },
  okBox: { background:C.greenBg, color:"#0a7a4a", borderRadius:8, padding:"8px 10px", fontSize:12 },
  riskRow: { display:"flex", alignItems:"center", gap:7, padding:"5px 0", borderTop:`1px solid ${C.border}`, fontSize:11.5 },
  riskTag: { fontFamily:mono, fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:4, flexShrink:0, whiteSpace:"nowrap" },
  riskName: { fontWeight:600, flexShrink:0 },
  riskNews: { color:C.text3, fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  pMain: { marginTop:2 },
  sigRow: { display:"flex", gap:3, justifyContent:"center", flexWrap:"wrap", marginTop:3, minHeight:11 },
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
  recWhy: { fontFamily:mono, fontSize:8.5, color:C.purple, fontWeight:700 },
  recFfdr: { fontFamily:mono, fontSize:8.5, color:C.text3 },
  recMeta: { fontFamily:mono, fontSize:10, color:C.text3 },
  recScore: { fontFamily:mono, fontSize:13, fontWeight:700, color:C.purple, flexShrink:0 },
  recFix: { display:"flex", gap:3, marginTop:7, flexWrap:"wrap" },
  recFixChip: { fontFamily:mono, fontSize:9, fontWeight:700, padding:"2px 4px", borderRadius:4 },
  recExtra: { fontFamily:mono, fontSize:10, color:C.text2, marginTop:5 },

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
  sPrice: { fontFamily:mono, fontSize:12.5, fontWeight:700 },
  sItemBlocked: { opacity:0.45 },
  sBlock: { fontFamily:mono, fontSize:9, color:C.red, fontWeight:700 },
  sDiff: { fontFamily:mono, fontSize:10 },

  toast: { position:"fixed", bottom:18, left:"50%", transform:"translateX(-50%)", background:C.purple, color:"#fff", padding:"10px 16px", borderRadius:9, fontSize:12.5, zIndex:200, boxShadow:"0 6px 22px rgba(0,0,0,0.25)" },
};
