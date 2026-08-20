/* ============================================================
   PLAYERLIST.JSX — flipinn "Leikmenn": ALLIR leikmenn, sianlegir,
   radanlegir, yfir fjogur timabil.

   EIN UPPSPRETTA DALKA. Dalkarnir eru STAT_DEFS ur src/stats.js — sama
   skra sem stigataflan og prófin nota. Annar dalkalisti hefdi farið ur
   samhengi vid hana innan viku, svo hann er EKKI skrifadur.

   TIMABILID STYRIR ALLT (maelt 29.7.2026: finished_gw = 0):
   Fyrir GW1 eru OLL arstidarsvid i players.json NULL — total_points,
   form, minutes, xG. Listi sem radar 563 nullum lítur ut eins og bilun.
   Thess vegna:
     finished_gw === 0 -> sjalfgefid timabil er SIDASTA LOKNA (2025/26)
                          og hausinn segir hvers vegna.
     finished_gw >= 1  -> 2026/27 verdur sjalfgefid.
   Thetta er LESID ur events.json i hverri hledslu, aldrei hardkodad.

   NULL ER EKKI NULL:
     null  (gogn vantar)        -> "—" gratt
     0     (raunverulegt null)  -> "0"
   Dalkur sem er tomur fyrir ALLA i voldu timabili er FALINN, ekki
   syndur sem sull af strikum — nema notandinn kveiki a honum.

   VAKTLISTI OG "MITT LID": stjarnan (vistud i localStorage) og graen rond.
   RONDIN ER A FROSNA NAFNA-HOLFINU, EKKI A RODINNI — rodin skrunar larett
   og bordi a henni hefdi horfid vid fyrsta larett skrun. Samanburdar-liturinn
   var faerdur ur graenum i ljosfjolublaan svo GRAENT thydi adeins eignarhald.

   VERD OG STADA ERU ALLTAF UR NUVERANDI players.json, lika thegar
   soguleg tolur eru syndar: thu kaupir a verdi DAGSINS, ekki a verdi
   2023/24. Sami rok fyrir stodu og tiltækileika.
   ============================================================ */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { interp } from "./interp.js";
/* UMFERDAR-BILS-VELIN ER SAMEIGINLEG (src/gwRange.js, 20.8.2026). Hun var
   HER og Compare fekk sama eiginleika; afrit af hledslunni hefdi thytt tvo
   skyndiminni og thar med tvaer soknir a somu 1,5 MB skra — nakvaemlega
   throttlunin sem hun var skrifud til ad losna vid. `RAW` er thvi ekki
   lengur lesid hedan; hun er inni i einingunni.                          */
import { useGwSeasonFile, nextRange, rangeBlind as sharedRangeBlind,
         RANGE_BLIND_BADGE } from "./gwRange.js";
import ImminentPanel from "./Imminent.jsx";
import BuyWindows from "./BuyWindows.jsx";
import { photoNext } from "./Crest.jsx";
/* `passesThreshold` var flutt UT ur thessum innflutningi 17.8.2026 med
   throskuldar-siunni. Fallid stendur afram i `stats.js` og a nu engan
   notanda i appinu.                                                    */
import { STAT_DEFS, STAT_GROUPS, STAT_BY_KEY, fmtStat, num, normName,
         sumGwRange, gwBlindKeys, makeEnricher } from "./stats.js";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c", greenBg:"#e6f9f0",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const POS = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };
const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };

/* Mynd med stafa-fallback VID VILLU, ekki adeins thegar code vantar —
   premierleague.com skilar 404 fyrir nyflutta menn og an onError birtist
   brotid-myndar-tak i rodinni. Sama regla og PlayerImg i App.jsx.       */
function RowPhoto({ src, name }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span style={S.imgFb}>{(name || "?").slice(0, 1)}</span>;
  /* KEDJAN VAR EKKI HER — OG ThETTA ER AÐALVERKFAERID (19.8.2026).
     `Crest.jsx`, `Compare.jsx` og `Imminent.jsx` ganga allar `photoNext`
     (tvaer fotur, sja maelinguna i Crest.jsx) en RowPhoto gerdi thad ekki,
     svo their 67 sem eru ADEINS i gomlu fotunni — felagaskiptin: Meslier,
     Bruno G., Garnacho, Rogers, Lacroix — fengu STAF i stad myndar i
     leikmannalistanum sjalfum. CLAUDE.md:711 fullyrti ad allir fjorir
     notendur gengju hana; thad var satt um thrja.                      */
  return <img src={src} alt="" style={S.img} loading="lazy"
    onError={e => { const n = photoNext(e.target.src); if (n) e.target.src = n; else setOk(false); }} />;
}
const POS_TABS = [["all","All"],["1","GK"],["2","DEF"],["3","MID"],["4","FWD"]];

/* FASTIR DALKAR — birtir vinstra megin i OLLUM flokkum thvi thu tekur
   engan akvordun an theirra. Their eru THVI SLEPPT ur flokka-dalkunum:
   adur voru their BAEDI fastir OG i "Grunni", svo "Price" birtist tvisvar
   i somu toflu — vid hlidina a Threat i Grunni (notandinn, 8.8.2026).
   Skra-legur samastadur theirra er obreyttur (stigataflan radar eftir
   theim og filter-valarinn finnur thau).                              */
const PINNED = new Set(["now_cost", "selected_by_percent"]);
const ROW_H = 34;          // fost haed -> synadarvaeding er einfold
const ROW_H_DENSE = 26;    // "thettar radir": 20 leikmenn i stad 12
const OVERSCAN = 12;
/* HAUSINN ER TVEGGJA THREPA (FFS-lagid, sja BANDS nedar): spannandi
   bands-rod ofan a heitunum. Haedirnar eru fastar thvi radirnar eru
   absolute-stadsettar undir hausnum — ein tala, einn stadur.          */
const BAND_H = 17;
const LABEL_H = 30;
const HEAD_H = BAND_H + LABEL_H;

/* ---- Sniðgrunnur fyrir "min/max"-siur: hvada dalkar eru tolulegir ---- */
const numericDefs = () => STAT_DEFS.filter(d => !d.pos || d.pos.length);

/* ============================================================
   UMFERDAR-BILS-BORDINN — HREIN ROKFRAEDI, UTFLUTT VILJANDI

   Bordinn fullyrdir vid notandann ad ekkert a skjanum geti breyst thott
   hann faeri umferdirnar. Fullyrding ma ekki bua i JSX-skilyrdi: thar getur
   profid adeins LESID hana, og nakvaemlega thess vegna lifdi hun rong fra
   14.8. til 16.8.2026 (sja skyringuna vid bordann sjalfan). Sami rokstudn-
   ingur og `passesThreshold` og `buildTeamMetrics` (CLAUDE.md 7.1).
   ============================================================ */
/* EIN SPURNING, EITT SKILYRDI: GETUR THESSI DALKUR FYLGT UMFERDAR-BILI?
   `blind` eitt DUGAR EKKI og thad var maelt: `gwBlindKeys` sleppir
   `live_only`-dalkum viljandi (rokstudningurinn thar er ad their "beri
   eigid now-merki") — EN ThAD MERKI ER ADEINS TIL I DALKAVALARANUM, aldrei
   i haus toflunnar. MAELT 16.8.2026 med GW30-38 virkt a "Upcoming fixtures":
   HAUS [Player, Price, Owned %, FDR6, Home, Games, Team CS, Team DC] ·
   MERKI [] · bordi: enginn. Fimm dalkar syndu dagsins framsyni medan
   hausinn sagdi GW 30-38 og EKKERT a skjanum sagdi fra.
   `rangeAwareGroupsOf` var lagfaert fyrir nakvaemlega thessa gildru 16.8.
   og bar hana skrifada i athugasemd sinni; `rangeBanner` sat eftir med
   `blind` eitt. Skilyrdid er thvi EITT fall sem BADIR lesa — tvo skilyrdi
   um sama hlut er hvernig thau fara i sundur.
   AF HVERJU EKKI HITT: ad teikna "now"-merki i haus toflunnar var
   valkosturinn og hann var HAFNAD — hausinn er maeldur i px (`headWidth`)
   og 14.8.-16.8.2026 kostadi merki sem BAETTIST VID an thess ad breiddin
   vissi af thvi 25 klippt haus-heiti. Bordinn segir thad sama an thess ad
   snerta rumfraedina.                                                    */
/* FALLID SJALFT ER I `gwRange.js` (20.8.2026) svo Compare lesi SAMA skilyrdi.
   Thad er samt endur-flutt ut HEDAN thvi `playerlist-gw-filter.mjs` flytur
   thad inn hedan (`PL.rangeBlind`) — endurnefning i profi er breyting a profi,
   og profid ver reglu sem er ohreyfd. Ein skilgreining, tvaer slodir.     */
export const rangeBlind = sharedRangeBlind;

/* `shown` = ALLIR dalkar a skjanum (fastir + valdir) · `picked` = their sem
   notandinn valdi sjalfur · `blind` = `gwBlindKeys()`.
   Skilar "all" (ekkert a skjanum fylgir bilinu) · "picked" (adeins fostu
   dalkarnir fylgja thvi) · null (eitthvad valid fylgir thvi).           */
export function rangeBanner({ mode, shown, picked, blind }) {
  const all = shown.length > 0 && shown.every(d => rangeBlind(d, blind));
  if (all) return "all";
  if (mode === "custom" && picked.length > 0 && picked.every(d => rangeBlind(d, blind)))
    return "picked";
  return null;
}

/* OG ORÐALAGID VERDUR AD FYLGJA MED. Bordinn sagdi "These are season
   totals" — satt um `blind`-dalka, ROLTOM um `live_only`: FDR6 og Team CS
   eru DAGSINS framsyni, ekki arstidar-summa. Um leid og live_only telst med
   i "all" (ofar) gaeti bordinn thvi fullyrt eitthvad sem er osatt a sama
   skja og hann stendur a — sama villuaett og forleiks-bordinn (sja nedar).
   Kindin er thvi LEIDD UT af thvi sem sest, ekki valin i JSX.           */
export function rangeBlindKind(defs) {
  if (!defs || !defs.length) return null;
  const live = defs.filter(d => d.live_only).length;
  return live === 0 ? "season" : live === defs.length ? "live" : "mixed";
}

/* HVE MARGAR RADIR BERA ENN ARSTIDAR-TOLU I OBYRJUDU TIMABILI — MAELING,
   EKKI AGISKUN. Sja langa skyringu vid forleiks-bordann nedar: hann sagdi
   "every season field is zero" a skja sem synir ICT 381,4. Fallid er HREINT
   og utflutt af somu astaedu og `rangeBanner`: fullyrding sem bur i
   JSX-skilyrdi verdur adeins LESIN af profi, aldrei KEYRD (CLAUDE.md 7.1).

   TALID ER A DALKUM SEM SAFNAST UPP YFIR UMFERDIR, og skilyrdid er ThAD
   SAMA sem `rangeBanner` notar (`!rangeBlind`) — ekki nytt skilyrdi.
   ROKIN: `finished_gw === 0` thydir ad ENGIN umferd er lokin, svo dalkur sem
   SAFNAST UPP yfir umferdir getur adeins verid non-null fra fyrra timabili.
   Nullstilli FPL arstidina fer talan i 0 og gamli textinn — sem er tha
   ordinn sannur — birtist af sjalfu ser.

   FYRSTA UTGAFAN TALDI ALLA `!live_only`-DALKA OG MAELDI ThVI EKKERT
   (maelt 17.8.2026). `now_cost` (Price) er ekki `live_only`, er non-null hja
   OLLUM og er verd DAGSINS — engin arstidar-summa. Talan var thvi 587 af 587
   og `now_cost` EINN gefur 587: hun var `Price > 0` i dulargervi. Verra:
   verdid nullstillist ALDREI, svo bordinn hefdi haldid afram ad fullyrda
   "587 af 587 bera enn arstidar-tolur" longu eftir ad FPL nullstillti
   arstidina — nakvaemlega sama villuaett (fost fullyrding um lifandi gogn)
   sem bordinn var skrifadur til ad losna vid.
   Maelt a `players.json` i dag: 587/587 -> **405 af 587** med rettu
   skilyrdinu. `minutes > 0` eru 400; fimm til bera stig/mork AN minutna
   (FPL-oheild, sbr. `isIncoherent`), svo 405 er rett tala en ekki 400.

   TALID ER A ALLRI DALKASKRANNI, EKKI A ThVI SEM SEST. Fyrsta utgafan tok
   syndu dalkana og thad er gildra i sjalfu ser: "Upcoming fixtures" ber
   0 uppsafnada dalka (5 af 5 `live_only`), svo talan hefdi ordid 0 thar og
   bordinn flett yfir i "every season field is zero" — osatt a sama skja.
   Fullyrdingin er um GOGNIN, ekki um dalkavalid, svo maelingin er thad lika. */
export function staleSeasonRows(rows = [], blind = new Set(), defs = STAT_DEFS) {
  const acc = defs.filter(d =>
    d && typeof d.get === "function" && !rangeBlind(d, blind));
  if (!acc.length) return 0;
  let n = 0;
  for (const r of rows) {
    if (!r?.src) continue;
    if (acc.some(d => {
      let v; try { v = d.get(r.src); } catch { return false; }
      return v != null && v !== 0;
    })) n++;
  }
  return n;
}

/* FLOKKARNIR SEM FYLGJA BILINU ERU LEIDDIR UT, EKKI TALDIR UPP.
   Handskrifad "Basics, Attack or Defence" stod i bordanum og var ThEGAR
   ORDID RANGT: "Set pieces and cards" ber thrja dalka (gul spjold, raud,
   spjold per 90) sem fylgja bilinu og var samt ekki nefndur. Sama villa og
   handskrifadi lyklalistinn sem `gwBlindKeys` var leidd ut til ad losna vid
   — 13 af 22 lyklum rangir (CLAUDE.md 8).
   SKILYRDID ER TVITHAETT OG `blind` EITT DUGAR EKKI: `gwBlindKeys` sleppir
   `live_only`-dalkum viljandi (their bera eigid "now"-merki), svo "Upcoming
   fixtures" (5 af 5 live_only) maelist 0 blindur og hefdi lesist eins og
   hann fylgdi bilinu. Hann horfir FRAM og getur thad aldrei.
   Maelt 16.8.2026: core 11 · attack 27 · defence 19 · setp 3 · aron 0 ·
   fixtures 0.                                                           */
export function rangeAwareGroupsOf(blind, defs = STAT_DEFS, groups = STAT_GROUPS) {
  return groups.filter(g =>
    defs.some(d => d.group === g.key && !rangeBlind(d, blind)));
}

/* ============================================================
   HVADA HRA FPL-SVID VERDA AD KOMA UR LIFANDI RODINNI — LEIDD UT

   VILLAN (maelt 16.8.2026 med raungognum i DOM): `pen_order`, `fk_order` og
   `ck_order` voru TOMIR HJA OLLUM 587 i SJALFGEFNU SYNINNI. Sjalfgefid
   timabil i forleik er sidasta lokna (2025/26), thad er SOGULEGT, og
   `player_seasons.json` ber ENGA spyrnu-rod — 0 af 1.500 rodum. Radirnar
   fengu thvi null medan lifandi `players.json` ber 65/54/79 gildi og OLL 20
   lidin eiga 1 i ollum thremur. Dalkarnir eru allir `live_only` og notan
   theirra segir "Today's order — it does not follow the selected season";
   a skjanum fylgdi hun timabilinu, beint ofan i tomid. Dalkur sem er syndur
   en alltaf tomur er SAMA UTKOMA og dalkur sem er falinn — sja `team_dc`,
   sem var daudur fra faedingu og fal sig sjalfur (CLAUDE.md 6l).
   Audgudu `_`-svidin komust ohindrud i gegn (`Object.assign(src, fields)`);
   thessi thrju eru HRA FPL-svid og attu enga leid.

   LISTINN ER LEIDDUR UT, EKKI HANDSKRIFADUR (gwBlindKeys, 13 af 22 lyklum
   rangir — CLAUDE.md 8): hver `get` er keyrdur a Proxy sem SKRAIR hvada
   svid hann les. Sjo probe-gildi thvi getterar mega hafa greinar (0/1/2/3/4
   eru raunveruleg `element_type`-gildi).

   OG SNIDID ER TVIHLIDA — thad er ekki varud heldur NAUDSYN: probe-inn synir
   ad `xg_share` (live_only) les `expected_goals`, sem er SVID TIMABILSINS og
   er lesid af 8 odrum dalkum. Vaeri thad borid yfir myndi soguleg tafla
   syna xG DAGSINS i "xG", "xGI", "xG/90" ... Reglan er thvi: svid sem
   ADEINS live_only-dalkar lesa. Svid sem badir lesa er tviraett og
   tviraedid ma aldrei skrifa yfir maelda tolu.
   MAELT 16.8.2026: safnid er nakvaemlega
   {penalties_order, direct_freekicks_order, corners_and_indirect_freekicks_order}
   — `element_type` og `expected_goals` falla ut a réttum forsendum
   (`element_type` er hvort sem er thvingad ur lifandi rodinni nedar).  */
export function liveOnlyRawFields(defs = STAT_DEFS) {
  const PROBES = [1, 0, 4, null, 2, 3, 100];
  const readsOf = d => {
    const seen = new Set();
    for (const v of PROBES) {
      const probe = new Proxy({}, { get(_, k) { if (typeof k === "string") seen.add(k); return v; } });
      /* Grein sem tholir ekki thetta probe-gildi kastar; hin gildin na henni. */
      try { d.get(probe); } catch { /* viljandi thogult */ }
    }
    return seen;
  };
  const live = new Set(), seasonal = new Set();
  for (const d of defs) {
    if (typeof d?.get !== "function") continue;
    for (const k of readsOf(d)) (d.live_only ? live : seasonal).add(k);
  }
  return [...live].filter(k => !k.startsWith("_") && !seasonal.has(k)).sort();
}
export const LIVE_RAW_FIELDS = liveOnlyRawFields();
/* Svidin borin af lifandi rodinni yfir a sogulegu rodina. Vanti svidid i
   lifandi rodinni verdur thad `undefined` — sem `num()` les sem null og
   holfid synir "—". Thad er RETT: dalkurinn segir "i dag", og se engin
   tala til i dag a hann ekki ad syna tolu fra i fyrra i stadinn.       */
const carryLive = p => {
  const o = {};
  for (const k of LIVE_RAW_FIELDS) o[k] = p[k];
  return o;
};

/* ============================================================
   HAUS-RUMFRAEDIN — UTFLUTT SVO PROFID SPEGLI HANA EKKI

   `stats.test.mjs` bar AFRIT af thessum reikningi (sitt eigid `wOf` med
   sinu eigin `marker = 9`). Afritid var graent eftir ad merki baettist i
   hausinn 14.8.2026 og skjarinn var klipptur — thad maeldi tofluna eins og
   hun var ARID ADUR. Sama lexia og `buildTeamMetrics` og `passesThreshold`
   (CLAUDE.md 7.1): rokfraedi sem prof tharf ad sanna a ekki heima i JSX.
   ============================================================ */
/* MAELT 6.8.2026 med canvas.measureText a 700 10.5px ui-monospace: stafur
   er 6,32 px. 6,35 er sú tala plus oryggismork (sja langa skyringu vid
   `wOf`-kallid nedar).                                                   */
export const HEAD_PXC = 6.35;
export const HEAD_ARROW_W = 9;              // rodunar-orin, tekin fra a OLLUM
/* MERKID SEM BAETTIST VID 14.8.2026 OG ENGINN SAGDI BREIDDINNI FRA.
   Notandinn: "the Seasons thing in Player stats is unreadable". Ekki nyr
   flipi — hausinn sjalfur var klipptur: `wOf` tok fra 9 px fyrir orina eina
   medan holfid teiknadi LIKA merkid. Holfid er `nowrap` + `overflow:hidden`
   + haegri-jafnad, svo yfirflaedid hverfur VINSTRA megin (sama og
   "Points ↓" -> "oints ↓"): merkid stod eftir og HEITID hvarf.
   MAELT 16.8.2026 a raungognum (2025/26, GW-bil virkt): 44 dalkar bera
   merkid, allir voru of throngir um >= 17 px og 25 theirra syndu EKKERT
   nema brot ur ordinu "season". Verst: "Aron" 55 px thar sem tharf 89,
   "4+ pts" 60/102, "n" 46/70, "Chg season" 86/127.

   BREIDDIN ER LEIDD AF SOMU MAELDU TOLU OG HEITID, EKKI VALIN:
   canvas er ekki til i thessu umhverfi (jsdom an `canvas`-pakkans, og
   pipeline-id er an dependencies), svo hun er reiknud UT UR 6,35 px/staf.
   Ui-monospace er jafnbreitt letur, svo stafbreidd skalast beint med
   leturstaerd: 9 px merki gefur 6,35 · 9/10,5 = 5,44 px/staf.
     6 stafir · (5,44 + 0,2 letterSpacing) = 33,9
     + padding "1px 3px" (6) + marginLeft 3            = 42,9  ->  43 px
   Breytist textinn eda stillingarnar breytist talan MED THEIM — hun er
   ekki fasti sem hægt er ad gleyma ad uppfaera (thad var einmitt villan). */
/* ORDID SJALFT ER I `gwRange.js` — samanburdurinn teiknar sama merki a sinar
   RADIR og hausinn her a sina DALKA. Tvo eintok af sama ordi er ord sem
   getur ordid tvennt; breiddar-reikningurinn her ad nedan er hins vegar
   stadbundinn (hann maelir thennan haus) og verdur her.                  */
export const BADGE_LABEL = RANGE_BLIND_BADGE;
export const BADGE_LETTER_SPACING = 0.2;
export const BADGE_W = Math.ceil(
  BADGE_LABEL.length * (HEAD_PXC * 9 / 10.5 + BADGE_LETTER_SPACING) + 3 + 3 + 3);

export const headLabel = d => String(d?.short ?? d?.label ?? "");

/* HVENAER ER MERKID TEIKNAD — EIN REGLA, LESIN BAEDI AF BREIDDINNI OG AF JSX.
   Vaeru thetta tvo skilyrdi gaeti annad kviknad an hins og vid vaerum komin
   aftur i klipptan haus.
   TVAER UNDANTEKNINGAR, BADAR ASETTAR:
     1. SIMI (`narrow`). Thar er hvert holf negld i 66 px (maelt i kafla 6i:
        frosni nafnadalkurinn tok meira en halfan skjainn) og merkid eitt er
        43 px — thad aetti EKKI eftir plass fyrir heitid. Valid stendur milli
        "merki an heitis" og "heiti an merkis", og heitid vinnur: haus sem
        segir "season" og ekkert annad segir ekki HVADA dalkur thetta er, svo
        thad tapar MEIRA en thad skilar. Merkingin lifir afram i bakgrunni
        holfsins (`hBlind`) og i bordanum efst, sem segir hana BERUM ORDUM.
        KOSTNADURINN ER RAUNVERULEGUR og verdur ad standa her: i sima naer
        madur ekki i tooltip, svo per-dalks visbendingin er tha litur einn.
        Hinn kosturinn — ad hækka 66 px thakid fyrir merktu dalkana — hefdi
        gefid ~110 px a dalk fyrir 44 dalka af 124 og gert simahaminn ad
        skruni sem hann var smidadur til ad forðast.
     2. HEITI SEM ENDAR ThEGAR A "season" ("Chg season") — annars stendur
        "Chg season season" i hausnum. Regla, ekki lyklalisti.            */
export function headBadge(d, { gwActive, blind, narrow } = {}) {
  if (!gwActive || narrow || !d?.key || !blind?.has(d.key)) return false;
  return !new RegExp(`${BADGE_LABEL}$`, "i").test(headLabel(d));
}

/* Breidd dalks i px. `badge` = ber hausinn "season"-merkid.              */
export function headWidth(d, badge = false) {
  const label = headLabel(d);
  const marker = HEAD_ARROW_W + (badge ? BADGE_W : 0);
  const lab = label.length * HEAD_PXC + marker + 13;   // 10 padding + 1 bord + 2 svigrum
  const dec = d?.dec ?? 0;
  const val = (4 + (dec ? dec + 1 : 0)) * 6.2 + 12;    // tala (11px mono)
  return Math.round(Math.max(46, Math.min(142, Math.max(lab, val))));
}

/* BROTTFELLD BRODDSTOFUM VID LEIT — `fold` er notud af `ColumnPicker`.
   HUN FOR MED `StatPicker` I FYRSTU ATRENNU 17.8.2026 og thad var alvoru
   hrun: hun var skilgreind MILLI haus-athugasemdar StatPicker og fallsins
   sjalfs, svo blokkin sem var klippt ut tok hana med. `ColumnPicker` vill
   hana enn og "Build table" felldi appid med `fold is not defined`.
   ThAD VAR APAPROFID SEM FANN ThAD (`monkey.mjs`, frae 424242, smellur
   #156) — ekkert af hinum profunum opnar bygginga-haminn med leit.       */
const fold = t => String(t ?? "").toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/þ/g, "th").replace(/ð/g, "d").replace(/æ/g, "ae").replace(/ø|ö/g, "o");

function ColumnPicker({ keys, selected, onToggle, onClear, pinnedKeys, narrow }) {
  const [q, setQ] = useState("");
  /* SAMANBROTID ER NAUDSYNLEGT, EKKI SNYRTING — og thad varð BRYNNA thegar
     valarinn faerdist ur 210 px skrun-kassa i fjoldalka YFIRLIT (sja
     `pickBody`): yfirlitid er ~490 px hatt, thvi thad synir OLL 100 chip i
     einu.

     SJALFGEFNA STADAN ER LEIDD UT UR THVI HVORT DALKAR ERU THEGAR VALDIR, og
     thad var MAELT: med valarann opinn byrjadi taflan i 974 px a 813 px skja
     — HUN VAR ALVEG UTAN SKJAS og notandinn sa engan leikmann. Sa sem kemur
     til baka med dalka i vali vill sja TOFLUNA; sa sem hefur enga dalka VERDUR
     ad velja fyrst. Rofinn er afram til fyrir hvorn sem er.               */
  const [open, setOpen] = useState(() => keys.length === 0);
  const f = fold(q);
  const groups = useMemo(() => STAT_GROUPS.map(g => {
    const ds = STAT_DEFS.filter(d => d.group === g.key && !pinnedKeys.has(d.key))
      .filter(d => !f || fold(d.label).includes(f) || fold(d.short).includes(f)
                      || fold(d.band).includes(f) || fold(g.label).includes(f)
                      || fold(d.key).replace(/_/g, " ").includes(f));
    /* Bond innan flokks — SAMFELLD i skranni, svo einfold lykkja naegir. */
    const bands = [];
    for (const d of ds) {
      const last = bands[bands.length - 1];
      if (last && last.band === d.band) last.ds.push(d);
      else bands.push({ band: d.band, ds: [d] });
    }
    return { g, bands, n: ds.length };
  }).filter(x => x.n), [f, pinnedKeys]);

  const nShown = groups.reduce((a, x) => a + x.n, 0);
  const nAll = STAT_DEFS.filter(d => !pinnedKeys.has(d.key)).length;
  const pinned = [...pinnedKeys].map(k => STAT_BY_KEY[k]).filter(Boolean);

  return (
    <div style={S.pickWrap}>
      <div style={S.pickTop}>
        <button style={S.pickToggle} aria-expanded={open} onClick={() => setOpen(v => !v)}
          title={open ? "Collapse the picker" : "Open the picker"}>
          <span style={{ ...S.pickCaret, transform: open ? "none" : "rotate(-90deg)" }}>▾</span>
          <b style={S.pickTitle}>{"Build your table"}</b>
        </button>
        {/* LEITIN VAR LENGST TIL HAEGRI — ~900 px fra thvi sem hun siar, og
            notandinn bad um "search moguleika" sem VAR ThEGAR TIL. Hun
            virkadi fullkomlega ("xg" skilar 20 dalkum); hun fannst bara
            ekki. Nu stendur hun VID titilinn, thar sem augad er.        */}
        {open && (
          <input style={S.pickSearch} value={q} onChange={e => setQ(e.target.value)}
            placeholder={"Search stats — e.g. xg, tackles, bonus"} />
        )}
        {open && q && (
          <button style={S.pickClearQ} title={"Clear the search"}
            onClick={() => setQ("")}>{"✕"}</button>
        )}
        <span style={S.pickHint}>
          {open
            ? (q ? interp("{0} of {1} stats match", [nShown, nAll])
                 : "Click a stat to add it as a column · click the column header to sort by it")
            : interp("{0} columns chosen", [keys.length])}
        </span>
        {keys.length > 0 && (
          <button style={{ ...S.pickClear, marginLeft: "auto" }}
            onClick={onClear}>{"clear"} {keys.length}</button>
        )}
      </div>

      {/* FOSTU DALKARNIR ERU SYNDIR SEM OVIRK CHIP, ekki faldir: annars
          leitar madur ad "Points" i valaranum, finnur hann ekki og veit
          ekki hvort hann se til.                                        */}
      {open && (
      <div style={S.pickFixed}>
        <span style={S.pickFixedLbl}>{"always shown"}</span>
        {pinned.map(d => (
          <span key={d.key} style={S.chipFixed} title={d.note}>{d.label}</span>
        ))}
      </div>
      )}

      {open && (
      <div style={{ ...S.pickBody, ...(narrow ? S.pickBodyNarrow : {}) }}>
        {groups.map(({ g, bands }) => (
          <div key={g.key} style={S.pickGroup}>
            <div style={S.pickGroupHd}>{g.label}</div>
            {bands.map(b => (
              <div key={b.band} style={S.pickBand}>
                <div style={S.pickBandHd}>{b.band}</div>
                <div style={S.pickChips}>
                  {b.ds.map(d => {
                    const on = selected.has(d.key);
                    return (
                      <button key={d.key} aria-pressed={on}
                        style={{ ...S.chipStat, ...(on ? S.chipStatOn : {}) }}
                        title={`${d.label}${d.short !== d.label ? ` · header: ${d.short}` : ""}`
                             + `\n\n${d.note || ""}`}
                        onClick={() => onToggle(d.key)}>
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
        {!groups.length && <div style={S.muted}>{"No stat matches “"}{q}{"”."}</div>}
      </div>
      )}
    </div>
  );
}

/* ---- TVEIR TOFLU-ROFAR: hitakort og thettleiki ----
   Their eru TOFLU-stillingar og ekki sior, svo their standa vid tofluna og
   ekki i siu-rodinni — annars hefdu their birst i "Filters"-tolunni sem
   telur hvad er SIAD, og thad hefdi verid ósatt.                        */
function ViewToggles({ dense, setDense }) {
  return (
    <span style={S.toggles}>
      <button style={{ ...S.tgl, ...(dense ? S.tglOn : {}) }} aria-pressed={dense}
        title={"Compact rows: 26px instead of 34px — about 20 players on screen instead of 12. Player photos are hidden because they need the height."}
        onClick={() => setDense(v => !v)}>{"≡ compact"}</button>
    </span>
  );
}

/* Skyndiminnid fyrir per-umferdar skrarnar var HER (`const GW_CACHE`) og er
   nu i `src/gwRange.js` — thad VERDUR ad vera EITT eintak fyrir alla lesendur
   og eining sem tvo onnur flytja inn er eini stadurinn sem getur tryggt thad. */

/* `teams` var tekid ur vidfanga-listanum 17.8.2026 — thad var adeins notad
   i lida-siunni sem for. App.jsx sendir thad afram og thad er meinlaust;
   propp sem er ekki tekid vid kostar ekkert og skrain er ekki min.      */
export default function PlayerList({ players, teamById, events, seasonsFile,
                                     imminent, shotsFile, fixtures, odds, defcon, defconHist, consist,
                                     bsd, photoUrl, Crest, onPickPlayer, onCompare, cmpIds,
                                     watch, onWatch, mineIds,
                                     /* BUY-WINDOWS-LESMATINN (19.8.2026) tharf FFDR per LEIKMANN, sem
                                        thydir `fixDifficulty` sjalft — `fixtures` og `odds` eru inntok
                                        thess, ekki hun. Hun er byggd EINU SINNI i App.jsx
                                        (`makeFixDifficulty`) og ma ekki byggjast her lika: tvo eintok
                                        af sama likani reka i sundur (sbr. `buildTeamMetrics`,
                                        CLAUDE.md 7). `gwNow` styrir sjalfgefnu bilinu.              */
                                     fixByTeamGw, fixDifficulty, gwNow, maxGw = 38 }) {
  /* ---------- SIMI: 380 px er profunar-breiddin ----------
     Frosni nafnadalkurinn var 196 px af 380 px — meira en helmingur
     skjasins, svo tolurnar fengu naerri ekkert. Og bordinn + siur + 12
     flokkahnappar ýttu toflunni undir fold. Baedi lagfaert her.        */
  const [narrow, setNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 560 : false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 559px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  /* GW-STRIKID ER OPID SJALFGEFID — OG ThAD VAR LAERT AF NOTANDANUM.
     8.8. var thad gert samanbrotid til ad spara 44 px. Notandinn tilkynnti
     thad sem HORFINN EIGINLEIKA ("það vantar gameweek barið, af hverju var
     það tekið út?") — hann var enn thar, en a bak vid litinn ▾-hnapp sem
     enginn fann. Eiginleiki sem finnst ekki er verri en 44 px af skruni.
     Hnappurinn helst svo haegt se ad loka thvi; valid er BARA vistad
     (`fpl_gwopen`) thvi thetta er SMEKKUR eins og `dense`, ekki astand.  */
  const [gwOpen, setGwOpen] = useState(() => {
    try { return localStorage.getItem("fpl_gwopen") !== "0"; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem("fpl_gwopen", gwOpen ? "1" : "0"); } catch { /* lokad */ }
  }, [gwOpen]);
  /* THETTAR RADIR: 26 px i stad 34. Vistad thvi thetta er smekkur, ekki
     astand — sa sem vill sja 20 leikmenn i einu vill thad alltaf.        */
  const [dense, setDense] = useState(() => {
    try { return localStorage.getItem("fpl_dense") === "1"; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem("fpl_dense", dense ? "1" : "0"); } catch {} }, [dense]);
  /* HITAKORT: tolurnar litadar eftir hundradshluta innan SIADA hopsins. */
  /* HEAT-HNAPPURINN VAR TEKINN UT 9.8.2026 ad beidni. Skyggingin sjalf
     helst — hun var sjalfgefid A og er thad sem gerir 100 dalka af tolum
     laesilega; thad var ROFINN sem var oþarfi, ekki liturinn.          */

  /* ---------- timabil ---------- */
  const finishedGw = useMemo(
    () => (events || []).filter(e => e.finished).length, [events]);
  const currentLabel = useMemo(() => {
    const d = (events || []).find(e => e.id === 1)?.deadline_time;
    const y = d ? new Date(d).getFullYear() : null;
    return y ? `${y}/${String((y + 1) % 100).padStart(2, "0")}` : "this year";
  }, [events]);
  const olderSeasons = seasonsFile?.seasons || [];
  const seasonOpts = [currentLabel, ...olderSeasons];
  const [season, setSeason] = useState(null);
  useEffect(() => {
    if (season != null) return;
    /* BIDUM EFTIR `player_seasons.json` ADUR EN VID LAESUM VALINU.
       Skrain kemur SEINT (i ~20-skraa halanum a eftir kjarnanum), svo se
       flipinn opnadur strax var `olderSeasons` enn tomt og sjalfgildid
       datt a OBYRJADA timabilid — tafla full af null. Og thad LEIDRETTIST
       ALDREI, thvi `season != null` stoppar effectinn ad eilifu.
       I forleik (`finishedGw === 0`) bidum vid thvi thangad til skrain er
       komin; effectinn keyrir aftur thegar hun berst.                    */
    if (finishedGw === 0 && !seasonsFile) return;
    setSeason(finishedGw >= 1 ? currentLabel : (olderSeasons[0] || currentLabel));
  }, [season, finishedGw, currentLabel, olderSeasons, seasonsFile]);
  const isLive = season === currentLabel;

  /* ---------- UMFERDAR-BIL ----------
     null = HEILT timabil. Bilid gildir adeins um samlagningarhaefar tolur;
     verd, eignarhald og FPL-saeti eru ARSTIDARTOLUR og fylgja EKKI — their
     eru merktir i vidmotinu, thvi thogul rong tala er verri en synilega
     vantandi tala. Skrarnar eru LETIHLADNAR: 1,2-1,5 MB per timabil og
     thad er tilgangslaust ad hlada theim ef bilid er ekki notad.         */
  const [gwRange, setGwRange] = useState(null);      // [fra, til] eda null

  /* Hledur ADEINS thegar bil er raunverulega valid (`enabled`). Bilid er
     nullstillt thegar timabili er skipt — annars saeti GW30-38 eftir a nyju
     timabili og notandinn saei tolur fyrir bil sem hann valdi ekki thar.  */
  useEffect(() => { setGwRange(null); }, [season]);
  useEffect(() => { if (gwRange) setGwOpen(true); }, [gwRange]);

  /* HLEDSLAN, SKYNDIMINNID, TILRAUNIRNAR OG "HVADA TIMABIL EIGA GOGN" ERU
     I `src/gwRange.js` — sameiginleg med Compare. Sja hausinn thar.      */
  const gwSrc = useGwSeasonFile({ season, consist, enabled: !!gwRange });
  const { seasonKey, available: gwAvailable, loading: gwLoading, err: gwErr } = gwSrc;
  const gwData = gwSrc.data;

  const gwActive = !!(gwRange && gwData);
  /* LEITT UT ur STAT_DEFS, ekki handskrifad — sja gwBlindKeys i stats.js.
     Fyrsta utgafa var handskrifadur lyklalisti og 13 af 22 lyklum voru
     RANGIR, svo merkingin birtist hvergi.                               */
  const blindKeys = useMemo(() => gwBlindKeys(), []);

  /* ---------- sior ----------
     `minCost`/`maxCost` (verd-bil), `teamSel` (lida-sia), `onlyAvail`
     ("fit to play") og `onlyMine` ("my squad") voru FJARLAEGD 17.8.2026
     ad beidni notandans, asamt throskuldar-siunni. Ekkert theirra var
     vistad i `localStorage` (adeins `fpl_gwopen`, `fpl_dense` og
     `fpl_cols` eru vistadir hedan), svo gamalt vistad astand ber tha
     hvergi og enginn les-vordur brotnar vid brottnamid.                */
  const [pos, setPos] = useState("all");
  const [q, setQ] = useState("");
  const [hidePicked, setHidePicked] = useState(false);
  const [onlyWatch, setOnlyWatch] = useState(false);
  const [group, setGroup] = useState("core");

  /* ---------- THRIR LESMATAR (8.8.2026) ----------
       groups   flokkur i einu, bands-hausinn (FFS-lagid) — sja kafla 6r
       custom   NOTANDINN BYGGIR TOFLUNA: smellir a tolur og thaer koma sem
                dalkar. Ur "Table" i stigatoflunni, sem gat adeins EINA tolu
                i einu; beidnin var ad geta valid MARGAR og bera saman.
       imm      IG/IA-spjoldin, flutt hingad ur stigatoflunni.
     Allt thetta er a EINUM STAD thvi notandinn sagdi thad skyrt: leikmanna-
     taflan er thad sem hann notar til ad skoda og bera saman.            */
  const [mode, setMode] = useState("groups");

  /* VALDIR DALKAR I `custom` — I VALROD, ekki i skra-rod: sa sem notandinn
     smellti a fyrst er sa sem hann vill sja fyrst. Vistad i localStorage
     undir `fpl_*`-nafnareglunni, svo hreinsunar-hnappurinn i
     ErrorBoundary taki hann med (og `fpl_lang`-reglan gildi aframhaldandi). */
  const [customKeys, setCustomKeys] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("fpl_cols") || "null");
      /* SIAD TVENNT UT: lyklar sem eru ekki lengur til (dalkur fjarlaegdur
         milli utgafa) OG fostu dalkarnir. Hid sidara getur legid i gomlu
         vistudu astandi og hefdi latid talnamerkid a hnappnum segja 4 medan
         adeins 3 dalkar birtast — talan a ad vera talan sem madur ser.   */
      if (Array.isArray(raw)) return raw.filter(k => STAT_BY_KEY[k]
        && k !== "now_cost" && k !== "total_points");
    } catch { /* skemmt blob ma ALDREI fella listann — sja 8c */ }
    return ["minutes", "expected_goal_involvements_per_90", "start_prob"];
  });
  useEffect(() => {
    try { localStorage.setItem("fpl_cols", JSON.stringify(customKeys)); } catch {}
  }, [customKeys]);
  const customSet = useMemo(() => new Set(customKeys), [customKeys]);
  const toggleCol = k => setCustomKeys(v =>
    v.includes(k) ? v.filter(x => x !== k) : [...v, k]);

  /* THROSKULDAR-SIAN VAR TEKIN UT 17.8.2026 — OG HUN VAR LIKA VILLAN.
     Beidnin 8.8.2026 var: "ef eg smelli a akvedid stat, t.d. start
     prosentu 90%, tha poppar thad upp sem filter MOGULEIKI sem eg get svo
     breytt". Utfaerslan setti siuna A SAMSTUNDIS: hvert einasta tolu-holf
     bar `onClick={() => filterOnValue(d, v)}`, svo smellur a tolu — t.d.
     til ad LESA rodina — beitti "min <talan>" strax.
     ENDURGERT I JSDOM 17.8.2026: einn smellur a "239" i Points-dalki
     Haalands for listann ur **587 af 587 i 1 af 587**. Notandinn lysti
     thessu sem "eg smelli a listann og filteringin dettur sjalfkrafa inn"
     — thad var ekki fokus- eda render-villa heldur handler a holfinu.
     Vidbotarahrif sem hvarf med: `autoFocus` a nyja chip-inu greip fokus
     ur toflunni i sama smelli.
     Med siunni for `passesThreshold`-notkunin ur thessari skra. Fallid
     sjalft stendur afram i `stats.js` (onnur lota a thа skra); thad a nu
     ENGAN notanda i appinu og ma fjarlaegja thar ef sa sem a skrana vill. */
  const [sortKey, setSortKey] = useState("total_points");
  const [sortDir, setSortDir] = useState("desc");

  /* ---------- "cook": ein umferd yfir gognin ----------
     Allt sem radun og sia thurfa er reiknad HER, einu sinni. Enginn
     utreikningur og engin JSON-uppfletting inni i render.              */
  /* ---------- AUDGUNIN — SER MEMO, OG THAD ER PERF-LAGFAERING ----------
     MAELT 8.8.2026: `cook` keyrdi FJORUM SINNUM vid hverja hledslu
     (63 + 28 + 14 + 15 ms) af thvi ad hver gagnaskra sem lendir (imminent,
     shots, defcon, consistency, bsd) er i deps-listanum. Nafna-porunin —
     dyrasti hlutinn, `findShot` og `matchImminent` fyrir 573 leikmenn — var
     endurtekin i hvert skipti, OG lika vid hverja timabils- eda
     umferdarbils-skiptingu thott hun se othad ohad theim.

     Nu er audgunin sitt eigid memo sem hangir ADEINS a theim skram sem hun
     les. `cook` hangir afram a season/gwRange en gerir tha enga porun.
     Audgunin sjalf er i src/stats.js svo stigataflan noti SAMA kod.      */
  const enrich = useMemo(() => makeEnricher({
    players, teamById, imminent, shotsFile, fixtures, events, odds,
    defcon, defconHist, consist, bsd, season, isLive,
  }), [players, teamById, imminent, shotsFile, fixtures, events, odds,
       defcon, defconHist, consist, bsd, season, isLive]);

  /* ---------- "cook": ein umferd yfir gognin ---------- */
  const rows = useMemo(() => {
    const t0 = (typeof performance !== "undefined" ? performance.now() : 0);
    const out = (players || []).map(p => {
      /* UMFERDAR-BIL kemur I STAD arstidar-rodarinnar. Skilar FPL-nefndum
         svidum, svo allir dalkar — lika afleiddu — virka obreyttir.      */
      const gwEntry = gwActive ? gwData.players?.[String(p.code)] : null;
      const ranged = gwEntry ? sumGwRange(gwEntry, gwData, gwRange[0], gwRange[1]) : null;
      const hist = isLive ? null
                 : (gwActive ? ranged
                             : seasonsFile?.players?.[String(p.code)]?.[season]);
      /* GAGNAHLUTURINN sem dalkarnir lesa: soguleg rod ef timabil er valid,
         annars lifandi. VERD og STADA koma ALLTAF ur lifandi gognum.      */
      /* `element_type` VERDUR AD FYLGJA MED — ANNARS ER STODU-HLIDID SLOKKT.
         Stodu-laestu dalkarnir (14 talsins) sia i stats.js med
         `p?.element_type != null && !allowed.includes(...)`: OThEKKT stada
         utilokar ALDREI (null er ekki merki um utilokun, sja hausinn thar).
         `sumGwRange` skilar ADEINS FPL-summum og afleiddum /90-tolum — engri
         stodu — svo i umferdar-bils-ham var hlidid einfaldlega aldrei spurt.
         MAELT 16.8.2026 a 2025/26 GW1-38: 410 radir baru 1.535 stodu-laest
         gildi (DEF 150 radir, MID 207, FWD 53) — Gyokeres syndi "Clean sheet
         % 46,2", "Goals conceded 14" og "Saves 0". Sama vandamal i
         TIMABILS-ham en af hinni astaedunni: arkiv-rodin ber stodu THESS
         timabils medan sian (`r.p.element_type`) og stodu-merkid lesa
         lifandi stodu, svo 2 radir (Marmoush, Georginio: live 4, hist 3)
         syndu 16 varnargildi. Lifandi `p` er einrátt her — nakvaemlega sama
         tala og sian og merkid nota — og hun skrifast YFIR hist-stoduna.
         Eftir: 0 og 0 i badum homum.                                      */
      /* OG SOMU LEID FARA HRA LIVE_ONLY-SVIDIN. Their eru LEIDD UT
         (`LIVE_RAW_FIELDS` ofar, sja langa skyringu thar): spyrnu-rodirnar
         thrjar voru tomar hja OLLUM i sjalfgefnu syninni thott lifandi
         rodin baeri 65/54/79 gildi, thvi arkiv-rodin ber thau hvergi.  */
      const src = isLive ? p : (hist ? { ...hist, now_cost: p.now_cost,
                                         selected_by_percent: p.selected_by_percent,
                                         element_type: p.element_type,
                                         ...carryLive(p) } : null);
      const { risk, fields } = enrich(p);
      /* AUDGADIR REITIR — allir med `_` forskeyti svo their blandist ekki
         vid FPL-svid. STAT_DEFS med live_only:true lesa thessa.          */
      if (src) Object.assign(src, fields);

      return {
        p, src, hist: !!hist,
        team: teamById?.[p.team],
        search: normName(`${p.web_name} ${p.first_name} ${p.second_name} `
                       + `${teamById?.[p.team]?.name || ""} ${teamById?.[p.team]?.short || ""}`),
        cost: (num(p.now_cost) ?? 0) / 10,
        own: num(p.selected_by_percent) ?? 0,
        avail: p.status === "a",
        startP: risk?.p ?? null, startLevel: risk?.level ?? null,
      };
    });
    if (typeof performance !== "undefined" && import.meta.env?.DEV)
      console.log(`[Players] cook ${out.length} rows: ${(performance.now()-t0).toFixed(1)} ms`);
    return out;
  }, [players, teamById, seasonsFile, season, isLive, enrich, gwActive, gwData, gwRange]);

  /* ---------- dalkar valda flokksins ----------
     live_only-dalkar eru NUTIMA-gogn (ESPN sidustu umferdar, form-gluggi,
     leikir framundan, spyrnu-rod) og eru SYNDIR ALLTAF — timabils-valid
     styrir adeins ARSTIDAR-SUMMUM. AD FELA tha i sogulegu timabili gerdi
     tha ONAANLEGA, thvi 2026/27 er tomt.

     TOMIR DALKAR ERU LIKA SYNDIR og "fela toma"-hnappurinn er FARINN
     (beidni 8.8.2026): sjalfvirk felun faldi dalka sem notandinn VEIT ad
     eiga ad vera tomir (DC-hittni fyrir GW1) og gerdi thad ovist hvort
     dalkurinn vaeri til yfirleitt — hun faldi lika RAUNVERULEGA VILLU
     eina, dauda "Team DefCon"-dalkinn (kafli 6l). Dalkur sem er tomur
     segir "engin gogn"; dalkur sem er horfinn segir ekkert.            */
  /* FOSTU DALKARNIR ERU ADRIR I `custom`: **verd og stig**, eins og bedid
     var ("Fast verður þá bara verð og stig, restina bætir maður við").
     I flokka-ham eru their afram verd og eignarhald, thvi thar er "stig"
     fyrsti dalkur i Grunni og yrdi thvi tvitekid.
     LISTINN STYRIR BAEDI BIRTINGU OG UTILOKUN — annars gaeti notandinn
     valid "Points" i valaranum og fengid hann tvisvar.                  */
  const pinnedKeys = useMemo(() => mode === "custom"
    ? new Set(["now_cost", "total_points"])
    : PINNED, [mode]);

  /* I `custom` er rodin VALROD notandans (sa sem var valinn fyrst kemur
     fyrst), i `groups` er hun skra-rodin.                               */
  const visibleCols = useMemo(() => {
    if (mode === "custom") {
      return customKeys.map(k => STAT_BY_KEY[k]).filter(d => d && !pinnedKeys.has(d.key));
    }
    return STAT_DEFS.filter(d => d.group === group && !pinnedKeys.has(d.key));
  }, [group, mode, customKeys, pinnedKeys]);

  /* ---------- HVAD ER RAUNVERULEGA A SKJANUM, OG HVAD GETUR FYLGT BILINU ----
     `visibleCols` sleppir FOSTU dalkunum — their eru birtir ser. Spurningin
     "breytist ekkert thott eg faeri umferdirnar?" snyr ad ollu sem SEST, svo
     hun verdur ad telja tha lika (i `custom` er "Points" fastur og hann
     fylgir bilinu ALLTAF).                                                */
  const pinnedDefs = useMemo(
    () => [...pinnedKeys].map(k => STAT_BY_KEY[k]).filter(Boolean), [pinnedKeys]);
  const shownCols = useMemo(() => [...pinnedDefs, ...visibleCols],
    [pinnedDefs, visibleCols]);

  const rangeAwareGroups = useMemo(() => rangeAwareGroupsOf(blindKeys), [blindKeys]);

  /* TVEIR ADSKILDIR BORDAR, TVAER ADSKILDAR FULLYRDINGAR (sja
     `rangeBanner` ofar — rokfraedin sjalf er thar, prófanleg):
       "all"     — EKKERT a skjanum getur fylgt bilinu. I flokka-ham eru
                   fostu dalkarnir verd og eignarhald, BADIR blindir, svo
                   hegdunin fra 14.8.2026 er obreytt.
       "picked"  — allir dalkarnir sem notandinn VALDI eru blindir en fastur
                   dalkur (Points) fylgir bilinu. Adeins i `custom`.      */
  const banner = useMemo(
    () => rangeBanner({ mode, shown: shownCols, picked: visibleCols, blind: blindKeys }),
    [mode, shownCols, visibleCols, blindKeys]);
  /* HVERS KONAR dalkar bera bordann — arstidar-summur, dagsins tolur eda
     hvorttveggja. Ord bordans raedst af thessu; sja `rangeBlindKind`.   */
  const bannerKind = useMemo(
    () => rangeBlindKind(banner === "picked" ? visibleCols : shownCols),
    [banner, shownCols, visibleCols]);
  /* Talid ADEINS thegar bordinn getur birst — annars 587 x 60 getter-koll
     i hverri teikningu fyrir bordа sem er ekki a skjanum. Og thad hangir
     EKKI a `shownCols` (sja `staleSeasonRows`): talan er um gognin, svo
     hun er reiknud einu sinni per rada-mengi i stad einu sinni per
     dalkavali.                                                          */
  const staleSeason = useMemo(
    () => (finishedGw === 0 && isLive ? staleSeasonRows(rows, blindKeys) : 0),
    [finishedGw, isLive, rows, blindKeys]);

  const watchSet = useMemo(() => new Set(watch || []), [watch]);
  const mineSet = useMemo(
    () => (mineIds instanceof Set ? mineIds : new Set(mineIds || [])), [mineIds]);

  /* ---------- sia ----------
     FIMM SIUR VORU TEKNAR UT 17.8.2026 ad beidni notandans: throskuldar-
     sian ("Threshold: ▾" og smellur a tolu), verd-bilid, lida-sian,
     "fit to play" og "my squad". Eftir standa stada, leit, vaktlisti og
     "hide selected" — thaer sem hann bad um ad halda.
     ThETTA ER ALLT EDA EKKERT: sia sem er tekin ur vidmotinu en skilin
     eftir i thessu falli myndi threngja listann OSYNILEGA, sem er verra
     en sian sjalf var. Vordurinn er RADA-TALNING i DOM
     (`playerlist-gw-filter.mjs` kafli 4), ekki lestur a thessum kafla.  */
  const filtered = useMemo(() => {
    const t0 = (typeof performance !== "undefined" ? performance.now() : 0);
    const needle = normName(q);
    const picked = new Set(cmpIds || []);
    const out = rows.filter(r => {
      if (pos !== "all" && r.p.element_type !== +pos) return false;
      if (hidePicked && picked.has(r.p.id)) return false;
      if (onlyWatch && !watchSet.has(r.p.id)) return false;
      if (needle && !r.search.includes(needle)) return false;
      return true;
    });
    if (typeof performance !== "undefined" && import.meta.env?.DEV)
      console.log(`[Players] filter -> ${out.length}: ${(performance.now()-t0).toFixed(1)} ms`);
    return out;
  }, [rows, pos, q, hidePicked, cmpIds, onlyWatch, watchSet]);

  /* ---------- rodun ----------
     NULL ALLTAF SIDAST, i BADAR attir. Thetta er algengasta villan:
     tom gildi fljota upp i "asc" og fylla toppinn.                     */
  const sorted = useMemo(() => {
    const t0 = (typeof performance !== "undefined" ? performance.now() : 0);
    const def = STAT_BY_KEY[sortKey];
    const special = { __name: r => r.p.web_name, __team: r => r.team?.short,
                      __cost: r => r.cost, __own: r => r.own,
                      /* `__start`, `__mo` og `__ao` voru hér fyrir thrja
                         hardkodada dalka sem eru farnir (start-prob-dalkurinn
                         var tvitekning, mo/ao lifa i STAT_DEFS). Rodun eftir
                         theim tolum gengur nu gegnum skrana eins og allt
                         annad — einn kodavegur, ekki tveir.               */ };
    const get = special[sortKey] || (r => (r.src && def ? def.get(r.src) : null));
    const isText = sortKey === "__name" || sortKey === "__team";
    const dir = sortDir === "asc" ? 1 : -1;
    const out = filtered.slice().sort((a, b) => {
      const va = get(a), vb = get(b);
      const na = va == null || va === "" || (typeof va === "number" && !Number.isFinite(va));
      const nb = vb == null || vb === "" || (typeof vb === "number" && !Number.isFinite(vb));
      if (na && nb) return a.p.code - b.p.code;
      if (na) return 1;                              // vantar -> nidur, ohad att
      if (nb) return -1;
      if (isText) return dir * String(va).localeCompare(String(vb), "is");
      return dir * (va - vb) || a.p.code - b.p.code; // stodug rodun
    });
    if (typeof performance !== "undefined" && import.meta.env?.DEV)
      console.log(`[Players] sort ${out.length}: ${(performance.now()-t0).toFixed(1)} ms`);
    return out;
  }, [filtered, sortKey, sortDir]);

  /* ---------- HITAKORT ----------
     Hundrad dalkar af einslitum grattonum tolum eru laesilegir EN EKKI
     SKANNANLEGIR: til ad sja hver er godur i xGI/90 tharf madur ad rada
     eftir honum, sem thydir ad madur getur adeins skodad einn i einu. Lida-
     flipinn i thessu sama appi litar sinar tolur og er miklu fljotlesnari —
     thess vegna er thetta hingad komid.

     THRJAR AKVARDANIR:
     1. KVARDINN ER INNAN SIADA HOPSINS, ekki allra 573. Ef notandinn siar a
        varnarmenn undir 5,0 er spurningin "hver er bestur AF THESSUM" —
        kvardi yfir allan listann hefdi gert alla dalka jafn-blada.
     2. P10-P90, EKKI min-max. Haaland i xG gerir min-max kvarda thannig ad
        allir adrir liggja i sama tonn. Klippt hundradshluta-bil heldur
        millilaginu greinanlegu; jadartilfelli fa mettada endann.
     3. `hi === false` SNYR KVARDANUM. A Verdi, Min/framlag og GC er LAEGRA
        betra — annars vaeri sterkasti graeni liturinn a versta manninum,
        sem er nakvaemlega villan sem `compare-visual.mjs` ver gegn i
        samanburdinum (kafli 6j).
     Litirnir eru LJOSIR bakgrunnar: talan sjalf verdur ad vera laesileg, svo
     thetta er tonn undir texta, ekki merki i stad hans.                  */
  const heatScale = useMemo(() => {
    const m = {};
    /* FOSTU DALKARNIR MED: Verd og Stig/Eign eru dalkar eins og adrir og
       spurningin "er hann odyr fyrir thetta?" er ekki minna gild en hinar.
       An theirra voru tveir olitadir dalkar innan um litada — sem las eins
       og villa, ekki eins og akvordun.                                   */
    for (const d of [...visibleCols, ...[...pinnedKeys].map(k => STAT_BY_KEY[k])].filter(Boolean)) {
      const vals = [];
      for (const r of filtered) {
        const v = r.src ? d.get(r.src) : null;
        if (v != null && Number.isFinite(v)) vals.push(v);
      }
      if (vals.length < 8) continue;              // ortitid urtak -> enginn litur
      /* DALKUR AN EINHALLA "BETRA" FAER ENGAN LIT (17.8.2026).
         `heatScale` a adeins tvo kosti: haerra er betra, eda laegra er
         betra (`invert`). `starts_per_90` er hvorugt — nota dalksins segir
         sjalf ad ~1,0 se KJORID og ad yfir 1 thydi "byrjar en er skipt af,
         EDA urtakid er ortitid". Med `hi:true` malaði hitakortid thvi
         sterkasta graena a Jocelin.T (2,37 ur 1 byrjun, 38 minutum) og
         kalladi hann besta mann toflunnar — a dalki sem varar sjalfur vid
         nakvaemlega thvi. `hi` er FORSENDA, ekki skraut (kafli 8):
         villandi mynd er verri en engin mynd. Rodun er OSNERT — hun er
         gagnleg; thad er LITURINN sem fullyrdir "bestur".              */
      if (d.no_heat) continue;
      vals.sort((a, b) => a - b);
      const lo = vals[Math.floor(vals.length * 0.10)];
      const hi = vals[Math.floor(vals.length * 0.90)];
      if (!(hi > lo)) continue;                    // allir eins -> enginn litur
      m[d.key] = { lo, hi, invert: d.hi === false };
    }
    return m;
  }, [visibleCols, filtered, pinnedKeys]);

  /* Fimm threp. Fleiri threp lita ut eins og halli og fara ad keppa vid
     tolurnar; faerri threp segja ekki nog.                               */
  const HEAT_GOOD = ["#e9f9f1", "#d6f3e5", "#c2ecd8"];
  const HEAT_BAD  = ["#fdeeee", "#fbdedd", "#f8cdcb"];
  const heatBg = (d, v) => {
    const sc = heatScale?.[d.key];
    if (!sc || v == null || !Number.isFinite(v)) return null;
    let t = (v - sc.lo) / (sc.hi - sc.lo);         // 0..1 (ma fara utan)
    t = Math.max(0, Math.min(1, t));
    if (sc.invert) t = 1 - t;
    /* MIDJAN FAER ENGAN TON — OG THAD ER STILLING SEM VAR MAELD A SKJA.
       Fyrsta utgafan litadi allt fra 0,55 og upp / 0,45 og nidur, sem er
       90% af hverjum dalki: taflan vard graen-raud flis og tonarnir hættu ad
       benda a nokkud. Nu er efsti og nedsti fjordungur litadur og MIDJAN
       HELMINGURINN olitadur, svo liturinn thydi "thetta er utgildi".     */
    if (t >= 0.90) return HEAT_GOOD[2];
    if (t >= 0.82) return HEAT_GOOD[1];
    if (t >= 0.74) return HEAT_GOOD[0];
    if (t <= 0.10) return HEAT_BAD[2];
    if (t <= 0.18) return HEAT_BAD[1];
    if (t <= 0.26) return HEAT_BAD[0];
    return null;
  };

  /* ---------- synadarvaeding (fost radahæd) ---------- */
  const scrollRef = useRef(null);
  /* ---------- EINN SKRUN-GLUGGI, EKKI TVEIR ----------
     MAELT 8.8.2026: kassinn var `min(66vh, 620px)` og BOTNINN hans lá 140 px
     UNDIR skjanum. Thad gaf tvo skrun-svaedi ofan i hvort annad — mus-hjolid
     gerdi sitt hvad eftir thvi hvar bendillinn var, og til ad na nedstu
     rodunum thurfti fyrst ad skruna SIÐUNNI og svo TOFLUNNI.
     Nu er haedin maeld: thad sem eftir er af skjanum fyrir nedan hausinn.
     Efektid keyrir eftir HVERJU rendri (umgjordin haekkar og laekkar med
     bordum, siu-chip-um og valaranum) en setur adeins nytt gildi ef skekkjan
     er > 3 px, svo thetta getur ekki lykkjad.                            */
  const [fitH, setFitH] = useState(0);
  useEffect(() => {
    const measure = () => {
      const el = scrollRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const h = Math.max(280, Math.round(window.innerHeight - top - 10));
      setFitH(prev => Math.abs(prev - h) > 3 ? h : prev);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => { window.removeEventListener("resize", measure);
                   window.removeEventListener("scroll", measure); };
  });
  const [scrollTop, setScrollTop] = useState(0);
  /* LARETT SKRUN ER LIKA STAT — sja S.frozenShadow. Notandinn sa "texti fer
     undir nofnin og myndir af kollum" thegar skrunad var langt til haegri:
     frosni dalkurinn ER ogagnsaer (maelt i Chrome) og hylur tolurnar rett,
     en thad var ENGIN DYPTAR-VISBENDING um ad thaer faeru undir hann — og
     haus-heitin, sem eru haegri-jofnud, birtust hálf ("ice chg (GW)") thett
     upp vid "Player". Skuggi a kantinum segir "hér er brún, efnid heldur
     afram undir" og hann er birtur AÐEINS thegar raunverulega er skrunad. */
  const [scrolledX, setScrolledX] = useState(false);
  const [viewH, setViewH] = useState(620);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => { setScrollTop(el.scrollTop); setScrolledX(el.scrollLeft > 2); };
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => setViewH(el.clientHeight || 620)) : null;
    ro?.observe(el);
    setViewH(el.clientHeight || 620);
    return () => { el.removeEventListener("scroll", onScroll); ro?.disconnect(); };
  }, []);
  const rowH = dense ? ROW_H_DENSE : ROW_H;
  const first = Math.max(0, Math.floor(scrollTop / rowH) - OVERSCAN);
  const last = Math.min(sorted.length, Math.ceil((scrollTop + viewH) / rowH) + OVERSCAN);
  const window_ = sorted.slice(first, last);

  /* Breiddir eftir skja. Nafnadalkur 196 -> 124 og tolur 88 -> 66 i sima. */
  /* +18 px fyrir stjornuna og +16 fyrir ⇄. A SIMA er ⇄ EKKI syndur og
     breiddin helst 140: kafli 6i maeldi ad frosni dalkurinn var 196 px af
     380 — meira en halfur skjarinn — og hvert pixel a ad fara i NAFNID.
     Samanburdur er skjabords-vinnuflaedi hvort sem er.                  */
  const wName = narrow ? 140 : 216;
  const cName = { ...S.cName, width: wName, minWidth: wName,
                  ...(scrolledX ? S.frozenShadow : {}) };
  /* BREIDD PER DALK, EKKI EIN FOST BREIDD FYRIR ALLA.
     Fasta breiddin var 88 px af thvi ad LENGSTA heitid ("Byrjunarhlutfall")
     thurfti thad — svo "xG" fekk lika 88 px og notandinn thurfti ad skruna
     langt til hlidar ad engu gagni. Nu er breiddin reiknud ur heitinu og
     ur thvi hve breid TALAN getur ordid (`dec`), klippt i [46, 88].
     Mælt (tha 108 dalkar): ur 9.504 px i 6.010 px = 37% styttri skrunleid. */
  /* HAUSINN MA BROTNA I TVAER LINUR — thad er thad sem gefur sparnadinn.
     Med EINNI linu stjorna islensku heitin breiddinni ("Byrjunarhlutfall")
     og 17 dalkar lentu i thakinu; maelt gaf thad adeins 21,6%. Med tveimur
     linum stjornar TALAN breiddinni og sparnadurinn verdur 36,5%
     (9.504 px -> 6.031 px yfir alla dalkana). Hausinn er EIN rod, svo
     ha0 hans er einskiptis-kostnadur — ekki per rod.
     Nedri morkin eru LENGSTA ORDID i heitinu, ekki heitid deilt i tvo:
     annars vaeri ord klippt i midju thott plass vaeri til.               */
  /* MAELT 6.8.2026 (canvas.measureText a 700 10.5px ui-monospace i Chrome):
     stafur er 6,32 px, EKKI 5,9 — gamla matid var 1-8 px of naumt og ENSK
     heiti brotnudu i MIDJU ORDI ("Point/s", "Minute/s") og "Team of the
     week" fell i thrjar linur sem klipptust vid 30px haus-haedina.
     Notandinn sa thetta ("utlitid er serstakt a sumum stodum").
     TVAER breytingar, badar maeldar:
       1. 5,9 -> 6,35 px/staf (maelt 6,32 + oryggismork).
       2. ceil(len/2)-agiskunin vek fyrir NAKVAEMRI tveggja-linu skiptingu:
          minnsta breidd thar sem ordin skiptast i tvaer samfelldar linur.
          Agiskunin vanmat heiti med ojofnum ordum ("Mins per xGI" tharf
          "Mins per"/"xGI", ekki 6 stafi per linu) — 15 heiti brotnudu.   */
  /* EIN LINA A HVERT HEITI (beidni notanda 7.8.2026 med skjamynd).
     Adur brotnudu heitin i tvaer linur til ad spara skrunleid (36,5%
     maelt i kafla 6j) en thad gerdi hausinn ojafnan: "Owned %" i tveimur
     linum vid hlidina a "Points" i einni, og "Team of the week" i thremur.
     Nu raedur FULL BREIDD heitisins: hver dalkur er nogu breidur fyrir
     sitt heiti a EINNI linu (klippt i [46, 136]).
     KOSTNADUR SEM ER VITAD AF: skrunleidin fer ur ~6.030 px i ~9.380 px
     yfir alla dalka. Thad er ASETT skipti — notandinn valdi laesileika.
     6,35 px/staf er MAELT (canvas.measureText a 700 10.5px ui-monospace,
     6,32 + oryggismork), sja kafla 6m atridi 4.                        */
  /* HAUSINN LES `short`, EKKI `label` (8.8.2026). Full heiti eiga
     hvergi heima i 46-142 px haus — "Clearances/blocks/int" passar aldrei
     en "CBI" gerir thad, og SKYRINGIN er thar sem hun a ad vera: i
     tooltip-inu, sem hver dalkur hefur nu (krafa i stats.js). Bands-rodin
     fyrir ofan gefur stuttum heitum samhengid: "/90" eitt er radgata,
     "/90" undir "Goals" er thad ekki.                                   */
  /* REIKNINGURINN SJALFUR ER I `headWidth` OFAR (utflutt svo profid speglai
     hann ekki). Hér er adeins tengingin: hvada dalkur ber merkid i dag.  */
  const hLabel = headLabel;
  const showBadge = d => headBadge(d, { gwActive, blind: blindKeys, narrow });
  const wOf = d => {
    /* PLASS FYRIR MERKI SEM BAETAST VID HEITID I HAUSNUM:
         (†-merkid var her og tok 7 px. Thad var TEKID UT 8.8.2026 ad
          beidni notandans — "afleidd tala" er skyring, ekki nokkud sem
          madur les i hverri einustu haus-rod, og hun stendur afram i
          tooltip-inu. Plassid FOR MED THVI: dalkur sem heldur plassi
          fyrir tákn sem er ekki teiknad er 7 px of breidur ad eilifu,
          og 60+ afleiddir dalkar gera thad ad raunverulegu skruni.)
         ↓  rodunar-orin — BIRTIST A THEIM DALKI SEM ER RADAD EFTIR.
       Orin var EKKI talin og thad klippti heitid: hausinn er haegri-
       jafnadur og `nowrap`, svo yfirflaedi hverfur VINSTRA megin —
       "Points ↓" birtist sem "oints ↓" (maelt 7.8.2026). Plassid er
       tekid frá A OLLUM dalkum thvi rodunin faerist milli theirra.
         "season"  merkid a arstidar-dalkum thegar umferdar-bil er virkt.
       Thad var EKKI talid fra 14.8. til 16.8.2026 og klippti hausinn a
       nakvaemlega sama hatt og orin gerdi adur — 44 dalkar, 25 theirra
       misstu heitid ad fullu. Sja `BADGE_W` ofar; merkid er skilyrt, svo
       plassid er tekid fra ADEINS thegar thad er raunverulega teiknad
       (fastur 43 px kostnadur a alla 124 dalka vaeri sama villa og
       †-merkid sem var tekid ut her ad ofan).                          */
    return headWidth(d, showBadge(d));
  };
  /* Fostu dalkarnir (Verd, Eign %) sátu i 88 px thott heitin seu stutt. */
  const wNum = narrow ? 60 : wOf({ short: "Owned %", dec: 1 });
  const cNum  = { ...S.cNum,  width: wNum,  minWidth: wNum, maxWidth: wNum };
  const wCol = d => (narrow ? Math.min(66, wOf(d)) : wOf(d));
  const cFor = d => {
    const w = wCol(d);
    return { ...S.cNum, width: w, minWidth: w, maxWidth: w };
  };

  /* ---------- BANDS: SPANNANDI HAUSROD (FFS-lagid) ----------
     FFS birtir 100+ tolur i einni toflu og gerir thad laesilegt med tveimur
     threpum: "Goals | Shots | Big Chances" spannar yfir stutt undirheiti
     ("Tot In Out H M/G"). THAD ER THETTA sem gerir stytt heiti nothaef —
     annars vaeri "/90" radgata. Bandid er `band` i STAT_DEFS og dalkarnir
     eru i skra-rod, svo band-hlutar eru SAMFELLDIR (vordur i prófinu).
     Ein breidd-utreikningur, tvaer radir: bands-rodin leggur saman
     breiddir sinna dalka svo threpin geti ekki rekid i sundur.          */
  /* HAUS-HAEDIN FYLGIR THVI HVORT BANDS-RODIN ER TEIKNUD. Radirnar eru
     absolute-stadsettar undir hausnum, svo tala sem er ekki i takti vid
     raunverulegan haus skilur eftir gat eda felur fyrstu rodina.        */
  const headH = mode === "custom" ? LABEL_H : HEAD_H;

  const bands = useMemo(() => {
    const out = [];
    for (const d of visibleCols) {
      const b = d.band || "";
      const last = out[out.length - 1];
      /* SAMA FALL sem holfin nota (`wCol`), ekki afrit af formulunni:
         tvo threp sem reikna breidd sitt i hvoru lagi reka i sundur og tha
         stendur bandid ekki lengur yfir sinum dalkum — nakvaemlega sama
         afturfor sem `boxSizing` olli i einu threpi (kafli 6j).          */
      const w = wCol(d);
      if (last && last.band === b) { last.w += w; last.n++; }
      else out.push({ band: b, w, n: 1 });
    }
    return out;
  }, [visibleCols, narrow]);   // eslint-disable-line react-hooks/exhaustive-deps

  const sortOn = (key, higherBetter = true) => {
    if (sortKey === key) { setSortDir(d => d === "asc" ? "desc" : "asc"); return; }
    setSortKey(key); setSortDir(higherBetter ? "desc" : "asc");
  };
  const arrow = k => sortKey !== k ? "" : (sortDir === "asc" ? " ↑" : " ↓");
  const aria = k => sortKey !== k ? "none" : (sortDir === "asc" ? "ascending" : "descending");

  /* Sirnar sem eftir standa (stada, leit, vaktlisti, faldir) — chip sem
     hreinsar sig. Verd-, lida-, "fit to play"- og "my squad"-chipin foru
     med siunum sinum 17.8.2026; chip an siu vaeri hnappur sem hreinsar
     ekki neitt.                                                         */
  const chips = [];
  if (pos !== "all") chips.push([POS[+pos], () => setPos("all")]);
  if (q) chips.push([`“${q}”`, () => setQ("")]);
  if (hidePicked) chips.push(["hide selected", () => setHidePicked(false)]);
  if (onlyWatch) chips.push(["★ watchlist", () => setOnlyWatch(false)]);
  const filterCount = chips.length;

  if (!players?.length) {
    return <section style={S.card}><div style={S.muted}>{"Fetching player data…"}</div></section>;
  }

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <h2 style={S.h2}>{"Players"}</h2>
          <div style={S.sub}>
            {sorted.length} {"of"} {players.length} · {season}
            {!isLive && <span style={S.histTag}>{"historical numbers"}</span>}
          </div>
        </div>
        <div style={S.headCtl}>
          {/* LESMATA-ROFI. "Build table" er ur stigatoflunni, thar sem hann
              gat adeins EINA tolu i einu; her ma velja margar og bera saman.
              "Imminent" flutti hingad ur somu toflu.                      */}
          <div style={S.modeRow} role="group" aria-label={"View"}>
            {[["groups", "Groups", "One category at a time, with grouped headers"],
              ["custom", "Build table", "Pick the stats you want as columns"],
              ["win", "Buy windows", "Gameweek timelines: when each player's fixtures are best — for HIS position, on the players the filters and the sorting leave"],
              ["imm", "Imminent", "Who is about to score or assist"]].map(([k, l, tip]) => (
              <button key={k} style={{ ...S.modeBtn, ...(mode === k ? S.modeOn : {}) }}
                aria-pressed={mode === k} title={tip}
                onClick={() => setMode(k)}>{l}
                {k === "custom" && customKeys.length
                  ? <span style={{ ...S.modeN, ...(mode === k ? S.modeNOn : {}) }}>
                      {customKeys.length}</span>
                  : null}
              </button>
            ))}
          </div>
          <select style={S.sel} value={season ?? ""} onChange={e => setSeason(e.target.value)}>
            {seasonOpts.map(s => (
              <option key={s} value={s}>
                {s}{s === currentLabel && finishedGw === 0 ? " (not started)" : ""}
              </option>
            ))}
          </select>
          {filterCount > 0 && mode !== "imm" &&
            <button style={S.clearAll} onClick={() => {
              setPos("all"); setQ(""); setHidePicked(false); setOnlyWatch(false);
            }}>{"clear all"}</button>}
        </div>
      </div>

      {/* IMMINENT ER SJALFSTAETT SPJALD — engar sior, engin tafla. Thad les
          adeins imminent.json og hefur sina eigin markhopa-reglu (0-1 framlag,
          180+ min), svo sirnar sem gilda um tofluna eiga thar ekki heima og
          hefdu logið um hvad er verid ad syna. (Daemid sem stod her — verd-
          bilid — er ekki lengur til; reglan er ohreyfd.)                   */}
      {mode === "imm" ? (
        <ImminentPanel imminent={imminent} teamById={teamById} Crest={Crest}
          photoUrl={photoUrl} players={players} onPickPlayer={onPickPlayer} />
      ) : (<>

      {/* ---------- SJONRAENT UMFERDAR-BIL ----------
          38 kassar; smellur setur upphaf, naesti smellur setur endann.
          Thad er einfaldara en tveir fellilistar og synir SAMTIMIS hvad er
          valid — spurningin "hvad var hann ad gera i lokin" er sjonræn.
          Bilid er sleppt fyrir yfirstandandi timabil sem er EKKI hafid:
          thar eru engar loknar umferdir og valarinn vaeri 38 dauðir kassar. */}
      {/* UMFERDA-BILID HER ER UM SOGULEG GOGN (arstidar-summur per umferd) og
          hefur ekkert ad gera med bilid FRAMUNDAN sem Buy windows notar. Tvo
          bil a sama skja, annad um fortid og annad um framtid, hefdi verid
          spurning um hvort thau tala saman — thau gera ekki. Buy windows ber
          sitt eigid bil i sinum eigin haus.                                */}
      {mode !== "win" && !(isLive && finishedGw === 0) && seasonKey && (
        <div style={S.gwWrap}>
          <div style={S.gwTop}>
            {/* SAMANBROTID SPARAR 44 PX AF 415 (maelt 8.8.2026). Strikid er
                38 kassar sem taka fulla rod, og notandinn snertir thad
                stundum — ekki i hverri heimsokn. Thegar bil ER valid er
                thad OPID sjalfkrafa, svo valid geti aldrei verid falid.  */}
            <button style={S.gwToggle} aria-expanded={gwOpen}
              title={gwOpen ? "Hide the gameweek picker" : "Pick a gameweek range"}
              onClick={() => setGwOpen(v => !v)}>
              <span style={{ ...S.pickCaret, transform: gwOpen ? "none" : "rotate(-90deg)" }}>▾</span>
              {"Gameweeks"}
            </button>
            {/* FORSTILLINGARNAR ("allt timabilid / 30-38 / fyrri hluti"...)
                voru fjarlaegdar 7.8.2026 ad beidni: kassa-valarinn gerir
                thad sama og meira, svo tvaer leidir ad somu stillingu voru
                bara hávaði. "Hreinsa" dugar til ad fara til baka.       */}
            {gwRange && (
              <button style={S.gwPreset} onClick={() => setGwRange(null)}>
                {"whole season"}
              </button>
            )}
            {gwRange && (
              <span style={S.gwNow}>
                GW {gwRange[0]}–{gwRange[1]}
                {!gwAvailable
                  ? ` · ${interp("no gameweek data for {0} — pick a finished season", [season])}`
                  : gwLoading ? ` · ${"loading…"}` : ""}
                {gwAvailable && gwErr ? <>
                  {` · ${"data missing"}: ${gwErr} `}
                  <button style={S.gwRetry} onClick={gwSrc.retry}>
                    {"retry"}
                  </button>
                </> : null}
              </span>
            )}
          </div>
          {gwOpen && (
          <div style={S.gwBar} role="group" aria-label={"Select gameweek range"}>
            {Array.from({ length: 38 }, (_, i) => i + 1).map(n => {
              const on = gwRange && n >= gwRange[0] && n <= gwRange[1];
              const edge = gwRange && (n === gwRange[0] || n === gwRange[1]);
              return (
                <button key={n} title={`GW ${n}`} aria-pressed={!!on}
                  style={{ ...S.gwCell, ...(on ? S.gwOn : {}), ...(edge ? S.gwEdge : {}) }}
                  /* Smell-reglan er i `gwRange.js` (`nextRange`) svo BADIR
                     valararnir hegdi ser eins. Hun er thriggja lina rokfraedi
                     og thess vegna audveldust ad afrita — og tvo eintok er
                     nakvaemlega hvernig "annar smellur" verdur olikur milli
                     glugga an ad neitt prof falli.                         */
                  onClick={() => setGwRange(r => nextRange(r, n))}>
                  {n}
                </button>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* ============================================================
          HELDUR VID: "UMFERDAR-BILID VIRKAR EKKI" (tilkynnt 14.8.2026)

          Notandinn valdi Consistency, breytti umferdum og EKKERT gerdist.
          Hegdunin var RETT — 44 af 124 dalkum eru arstidar-tolur sem geta
          ekki fylgt bili — en HUN VAR OSYNILEG: eina merkid var `∑` i 9 px
          og #9a8aa8 a #faf7fb. Og Consistency er VERSTA tilfellid: thad er
          EINI flokkurinn thar sem ALLIR dalkar eru blindir (4 af 4), svo
          thar breytist bokstaflega ekkert a skjanum.
          Maelt per flokk: core 9/21 · attack 21/60 · defence 9/28 ·
          aron 4/4 · fixtures 0/5 · setp 1/6.
          Regla: se EKKERT a skjanum ad fara ad hlyda bilinu verdur ad
          SEGJA ThAD — merking sem sest ekki er engin merking (sama logmal
          og ikonin i kafla 8: i smarri staerd er silhuettan allt).

          OG BORDINN LAUG I `custom` — LAGAD 16.8.2026. Thrennt i sama
          malsgrein: (1) hann nefndi `group`, sem er FROSINN i "core" i
          bygginga-ham (hann er adeins settur ur flokka-rodinni), svo med
          dalkana Shots/xG/Big chances a skjanum sagdi hann "Every column in
          Basics"; (2) hann taldi ADEINS `visibleCols`, sem sleppir FOSTU
          dalkunum — "Points" er fastur i `custom` og for ur 98 i 18 vid
          umferdar-skipti medan bordinn sagdi ad ekkert gaeti breyst; (3)
          hann mælti med "Basics" i somu andra og hann lysti Basics
          arstidar-toflu.
          NUNA: hann les `mode` og telur ThAD SEM SEST (fastir + valdir).
          I `custom` er "Points" fastur og fylgir bilinu ALLTAF, svo
          "ekkert a skjanum breytist" GETUR ThAR ALDREI VERID SATT — sa
          bordi er thvi ekki syndur thar. En hitt getur vel gerst: allir
          dalkarnir sem notandinn VALDI eru arstidar-tolur, og tha er sagt
          nakvaemlega thad, an thess ad nefna nokkurn flokk.               */}
      {/* OG ORÐALAGID FYLGIR `bannerKind`, ekki fostum texta: "Upcoming
          fixtures" ber 5 af 5 `live_only`-dalka og "These are season totals"
          hefdi verid ONNUR rong fullyrding i stad thagnarinnar sem var
          lagfaerd. Kindin er leidd ut af thvi sem sest.                  */}
      {gwActive && banner === "all" && (
        <div style={S.warn}>
          <b>{bannerKind === "live" ? "These are today's numbers, not GW "
            : bannerKind === "mixed" ? "Nothing on screen follows GW "
            : "These are season totals, not GW "}
             {gwRange[0]}{"–"}{gwRange[1]}{"."}</b>{" "}
          {"Every column on screen"}
          {/* FLOKKURINN ER NEFNDUR ADEINS I FLOKKA-HAM. `group` er frosinn i
              bygginga-ham (hann er adeins settur ur flokka-rodinni), svo thar
              vaeri heitid RANGT — thad var einmitt villan.               */}
          {mode === "custom" ? "" : <>{" in "}
            <b>{STAT_GROUPS.find(g => g.key === group)?.label || group}</b></>}
          {bannerKind === "live"
            ? " looks ahead or shows where he stands today, so changing the gameweek range cannot change them."
            : bannerKind === "mixed"
            ? " is either a whole-season figure or a figure for today, so changing the gameweek range cannot change them."
            : " is a whole-season figure, so changing the gameweek range cannot change them."}
          {rangeAwareGroups.length ? <>
            {" For range-aware numbers use "}
            {rangeAwareGroups.map((g, i) => (
              <React.Fragment key={g.key}>
                {i === 0 ? "" : i === rangeAwareGroups.length - 1 ? " or " : ", "}
                <b>{g.label}</b>
              </React.Fragment>
            ))}
            {" — points, minutes, goals and the rest follow the range there."}
          </> : null}
        </div>
      )}
      {gwActive && banner === "picked" && (
        <div style={S.warn}>
          <b>{bannerKind === "live"
              ? "The columns you picked are today's numbers, not GW "
              : bannerKind === "mixed"
              ? "None of the columns you picked follow GW "
              : "The columns you picked are season totals, not GW "}
             {gwRange[0]}{"–"}{gwRange[1]}{"."}</b>{" "}
          {bannerKind === "live"
            ? "Every column you added looks ahead or shows where he stands today, so changing"
            : bannerKind === "mixed"
            ? "Every column you added is either a whole-season figure or a figure for today, so changing"
            : "Every column you added is a whole-season figure, so changing"}
          {" the gameweek range cannot change them — only the pinned "}<b>{"Points"}</b>
          {" column follows the range."}
          {/* MERKID ER BENDING, EKKI REGLA: `live_only`-dalkar bera ThAD EKKI
              (`headBadge` les `blind`), svo "the ones that cannot" var of
              stor fullyrding um leid og live_only telst med. Sagt nu adeins
              thegar allir dalkarnir eru raunverulega merktir.            */}
          {bannerKind === "season"
            ? <>{" Column headers that carry the "}<b>{"season"}</b>{" tag are the ones that cannot."}</>
            : null}
        </div>
      )}

      {/* ============================================================
          FORLEIKS-BORDINN — HANN FULLYRTI EITTHVAD SEM VAR OSATT A SAMA SKJA

          Her stod: "<timabil> has not started — every season field is zero
          for all 587 players, so this view has no numbers to sort."
          MAELT 16.8.2026 A SAMA SKJA I SOMU ANDRA: B.Fernandes ICT 381,4 ·
          Creativity 1938,5 · Penalties missed 2 · Haaland Threat 1520,0 —
          somu tolur og hja theim i 2025/26. `players.json` er lifandi
          bootstrap FPL og FPL hafdi EKKI nullstillt hana: 400 af 587
          leikmonnum bera enn minutur > 0.
          Rokin eru einfold og thau eru ORUGG: `finished_gw === 0` thydir ad
          ENGIN umferd er lokin, svo hver tala sem er ekki null getur ADEINS
          verid fra sidasta timabili. Bordinn segir thad nuna.

          TALAN ER MAELD I HVERRI TEIKNINGU, EKKI SKRIFUD. Fost tala um
          lifandi gogn ureldist thegjandi — nakvaemlega thad gerdist vid
          "MEASURED: the range is 4-10" i `ck_order` 13.8.2026.
          Hun er maeld a dalkum sem SAFNAST UPP yfir umferdir (`staleSeasonRows`,
          sja skilyrdid thar); fyrsta utgafan taldi verd og eignarhald med og
          las thvi 587 af 587 sem `Price > 0` i dulargervi — tala sem hefdi
          ALDREI farid nidur, ekki einu sinni eftir nullstillingu FPL.
          Nullstilli FPL toluna verdur `staleSeason` 0 og gamli textinn —
          sem er tha ordinn sannur — birtist af sjalfu ser.               */}
      {mode !== "win" && finishedGw === 0 && isLive && (
        <div style={S.warn}>
          <b>{currentLabel} {"has not started"}</b>{" "}
          {staleSeason > 0 ? <>
            {"— but FPL has not reset its season totals yet, so these are still last season's numbers:"}
            {" "}<b>{staleSeason}</b>{" of "}{players.length}
            {" players still carry totals that only played gameweeks can add up, and with none played they can only be "}
            <b>{olderSeasons[0] || "last season"}</b>{" totals. Pick that season in the dropdown to read it on purpose"}
            {" — the archive is per season and does not move."}
          </> : <>
            {"— every season field is zero for all"}
            {" "}{players.length} {"players, so this view has no numbers to sort. Pick"} <b>{olderSeasons[0] || "an earlier season"}</b> {"in the dropdown."}
          </>}
        </div>
      )}
      {/* Baðar skyringa-linurnar voru teknar ut 9.8.2026 ad beidni: thaer
          voru RETTAR en varanlegar, og hvorttveggja er eitthvad sem madur
          les EINU SINNI. Upplysingarnar standa afram thar sem thaer eiga
          heima — timabilid i fellilistanum og `season`-merkid a dalkunum. */}

      {/* ---------- sior ---------- */}
      <div style={S.filters}>
        <div style={S.posRow}>
          {POS_TABS.map(([v, l]) => (
            <button key={v} style={{ ...S.posBtn, ...(pos === v ? S.posOn : {}) }}
              onClick={() => setPos(v)}>{l}</button>
          ))}
        </div>
        <input style={S.search} placeholder={"Search — name or team"} value={q}
          onChange={e => setQ(e.target.value)} />
        {/* HER VORU VERD-BILID, LIDA-SIAN OG "fit to play" — fjarlaegd
            17.8.2026 ad beidni notandans asamt "my squad" og throskuldar-
            siunni. Sjalf `status`-talan er ekki horfin: hun sest afram a
            hverri rod og a leikmannaspjaldinu, thad er sian sem for.    */}
        <label style={S.check} title={"Starred players only"}>
          <input type="checkbox" checked={onlyWatch}
            onChange={e => setOnlyWatch(e.target.checked)} />{"★ watchlist ("}{watchSet.size})
        </label>
        {!!(cmpIds || []).length && (
          <label style={S.check}>
            <input type="checkbox" checked={hidePicked}
              onChange={e => setHidePicked(e.target.checked)} />{"hide selected ("}{cmpIds.length})
          </label>
        )}
      </div>

      {/* ---------- VIRKAR SIUR ----------
          EIGIN RAMMI MED TOLU, EKKI LAUS CHIP-ROD: beidnin var ad "hafa
          augljost hvada filteringar eru i gangi". Throskuldar-chipin (sem
          voru ritanleg a stadnum) foru med throskuldar-siunni 17.8.2026;
          eftir standa einfoldu sirnar, hver med sinu hreinsi-chipi.     */}
      {filterCount > 0 && (
        <div style={S.filterBar}>
          <span style={S.filterHd}>{"Filters"} <span style={S.filterN}>{filterCount}</span></span>
          {chips.map(([label, clear], i) => (
            <button key={i} style={S.chip} onClick={clear}>{label} ✕</button>
          ))}
        </div>
      )}

      {/* ---------- flokkar ----------
           BROTNA A BORDI, SKRUNA I SIMA. Rodin var alltaf nowrap+auto med
           `scrollbarWidth:none` — thad er RETT i sima (fingur strjuka og
           fjorar linur af hnoppum aeta skjainn, kafli 6i) en a bordi var
           ENGIN visbending um ad meira vaeri til hægra: maelt 7.8.2026
           voru 289 px af 1.539 px utan skjas og tveir flokkar ("FPL rank",
           "Cards and penalties") osynilegir — og thad var MITT verk ad
           baeta 13. flokknum vid (DC-hittni). A bordi er lodrett plass
           odyrt, svo thar brotnar rodin i tvaer linur og allir flokkar
           sjast; i sima helst strjuk-rodin obreytt.                      */}
      {/* DALKA-VALARINN OG FLOKKA-RODIN EIGA VID TOFLUNA. I `win` er engin
          tafla — thar eru dalkarnir 38 umferdir og hvorugt stjornar theim. */}
      {mode === "win" ? null : mode === "custom" ? (
        <>
          <ColumnPicker keys={customKeys} selected={customSet} onToggle={toggleCol}
            onClear={() => setCustomKeys([])} pinnedKeys={pinnedKeys}
            narrow={narrow} />
          {/* Rofarnir eiga vid TOFLUNA, svo their fylgja henni i badum homum
              — ekki bara i flokka-rodinni.                              */}
          <div style={S.togglesRow}>
            <ViewToggles dense={dense} setDense={setDense} />
          </div>
        </>
      ) : (
      <div style={{ ...S.groupRow, ...(narrow ? {} : S.groupRowWide) }}>
        {STAT_GROUPS.map(g => (
          <button key={g.key} style={{ ...S.groupBtn, ...(group === g.key ? S.groupOn : {}) }}
            onClick={() => setGroup(g.key)}>
            {g.label}
          </button>
        ))}
        <ViewToggles dense={dense} setDense={setDense} />
      </div>
      )}

      {/* ---------- tafla, EDA TIMALINURNAR ----------
          `sorted` ER SENT INN, ekki `filtered`: rodunin i toflunni er thad sem
          gerir "topp 40 eftir DC-hittni" moguleg — madur radar i Groups og
          skiptir hingad. Vaeri `filtered` sent inn vaeri rodin skra-rod og
          thakid (fyrstu N) hefdi tekid handahofskennt urtak.               */}
      {mode === "win" ? (
        <BuyWindows rows={sorted} teamById={teamById}
          fixByTeamGw={fixByTeamGw} fixDifficulty={fixDifficulty}
          gwNow={gwNow} maxGw={maxGw} Crest={Crest} narrow={narrow}
          watch={watch} onWatch={onWatch} mineIds={mineIds}
          onPickPlayer={onPickPlayer} />
      ) : !sorted.length ? (
        <div style={S.empty}>
          <b>{"No player matches."}</b> {"Active filters:"}{" "}
          {filterCount ? chips.map(([l]) => l).join(" · ") : "none"}.
          {filterCount > 0 && <> <button style={S.link} onClick={() => {
            setPos("all"); setQ(""); setOnlyWatch(false); setHidePicked(false);
          }}>{"clear filters"}</button></>}
        </div>
      ) : (
        <div ref={scrollRef} style={{ ...S.scroll, ...(fitH ? { maxHeight: fitH } : {}) }}>
          <div style={{ height: sorted.length * rowH + headH, position: "relative", minWidth: "max-content" }}>
            {/* ---------- HAUS: TVO THREP ----------
                Bands-rodin ofan a heitunum. Frosnu hólfin (nafn, verd,
                eign) eru sett i BADAR radirnar hvor fyrir sig — sticky
                gildir per holf, svo hausinn getur ekki verið eitt
                samfellt holf yfir bædi threp.                          */}
            <div style={{ ...S.hStick, width: "100%" }}>
              {/* BANDS-RODIN ER SLEPPT I `custom`. Thar er rodin VALROD
                  notandans, svo band-hlutar eru ekki samfelldir og rodin las
                  "MINUTES EXPECTED MINUTES" — sama bandid tvisvar med gati a
                  milli. Band sem endurtekur sig er verra en ekkert band:
                  hausinn a ad flokka, og thar flokkadi hann ekkert.        */}
              {mode === "custom" ? null : (
              <div style={S.bandRow}>
                <div style={{ ...S.bandCell, ...cName, ...S.bandFrozen }}>{""}</div>
                <div style={{ ...S.bandCell, width: wNum * 2, minWidth: wNum * 2 }}>{"Today"}</div>
                {bands.map((b, i) => (
                  <div key={i} style={{ ...S.bandCell, width: b.w, minWidth: b.w, maxWidth: b.w,
                                        ...(b.band ? S.bandOn : {}) }}
                    title={b.band}>{b.band}</div>
                ))}
              </div>
              )}
              <div style={S.hRow}>
                <div style={{ ...S.hCell, ...cName, ...S.hName }} role="columnheader" aria-sort={aria("__name")}
                  tabIndex={0} onClick={() => sortOn("__name", false)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortOn("__name", false); } }}>
                  {/* Stjarnan i hausnum er SIA, ekki rodun. stopPropagation
                      thvi smellur a hausinn sjalfan radar eftir nafni.       */}
                  <button style={{ ...S.starHead, ...(onlyWatch ? S.starOn : {}) }}
                    aria-pressed={onlyWatch}
                    title={onlyWatch ? "Show all" : "Show watchlist only"}
                    onClick={e => { e.stopPropagation(); setOnlyWatch(v => !v); }}>
                    {onlyWatch ? "★" : "☆"}
                  </button>
                  {"Player"}{arrow("__name")}
                </div>
                <div style={{ ...S.hCell, ...cNum }} aria-sort={aria("__cost")} tabIndex={0}
                  title={"Current price — always today's price, also for a historical season"}
                  onClick={() => sortOn("__cost", false)}>{"Price"}{arrow("__cost")}</div>
                {mode === "custom" ? (
                  <div style={{ ...S.hCell, ...cNum }} aria-sort={aria("total_points")} tabIndex={0}
                    title={"Total FPL points in the selected season. Fixed column — everything else you add yourself."}
                    onClick={() => sortOn("total_points")}>{"Points"}{arrow("total_points")}</div>
                ) : (
                  <div style={{ ...S.hCell, ...cNum }} aria-sort={aria("__own")} tabIndex={0}
                    title={"Share of all FPL squads that own him right now"}
                    onClick={() => sortOn("__own")}>{"Owned %"}{arrow("__own")}</div>
                )}
                {visibleCols.map(d => (
                  <div key={d.key} style={{ ...S.hCell, ...cFor(d),
                         ...(gwActive && blindKeys.has(d.key) ? S.hBlind : {}),
                         }}
                    title={`${d.label}${d.short && d.short !== d.label ? ` (${d.short})` : ""}`
                         + `${d.derived ? " · computed by us from FPL fields" : ""}`
                         + `\n\n${d.note || ""}`
                         + `\n\nClick the header to sort.`
                         + (gwActive && blindKeys.has(d.key)
                            ? `\n\nSEASON FIGURE: does not follow the gameweek range, shows the total.` : "")}
                    aria-sort={aria(d.key)} tabIndex={0}
                    onClick={() => sortOn(d.key, d.hi !== false)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortOn(d.key, d.hi !== false); } }}>
                    {hLabel(d)}
                    {/* Merking a dalkinum sjalfum, ekki adeins i skyringu:
                        notandinn les tofluna, ekki fotnotur.
                        SAMA SKILYRDI OG BREIDDIN LES (`showBadge`) — vaeru
                        thau tvo gaeti merkid kviknad an thess ad plass vaeri
                        tekid fra, sem er nakvaemlega villan sem var lagfaerd
                        16.8.2026. Bakgrunnurinn (`hBlind`) og skyringin i
                        tooltip-inu fylgja HINU skilyrdinu, thvi merkingin a
                        ad haldast lika thegar merkid vikur (simi).       */}
                    {showBadge(d)
                      ? <span style={S.blindMark}
                              title={"Season total - does not follow the gameweek range"}>{BADGE_LABEL}</span> : null}
                    {arrow(d.key)}
                  </div>
                ))}
              </div>
            </div>

            {window_.map((r, i) => {
              const idx = first + i;
              const inCmp = (cmpIds || []).includes(r.p.id);
              const isWatched = watchSet.has(r.p.id);
              const isMine = mineSet.has(r.p.id);
              return (
                <div key={r.p.code} style={{
                  ...S.row, height: rowH, top: headH + idx * rowH,
                  ...(idx % 2 ? S.rowAlt : {}),
                  ...(isMine ? S.rowMine : {}), ...(inCmp ? S.rowPicked : {}),
                }}>
                  {/* TVEIR SKUGGAR A SAMA HOLFI: graena rondin ("mitt lid",
                      inset) og kant-skugginn thegar skrunad er larett. Their
                      MEGA EKKI skrifa hvor yfir annan — `cellMine` var
                      spread-ad EFTIR `cName` og hefdi thurrkað kantinn ut,
                      svo rondin hefdi horfid um leid og skrunad var.       */}
                  <div style={{ ...S.cell, ...cName,
                    boxShadow: [isMine ? S.cellMine.boxShadow : "",
                                scrolledX ? S.frozenShadow.boxShadow : ""]
                               .filter(Boolean).join(", ") || undefined }}>
                    {/* BORDINN ER A HOLFINU, EKKI RODINNI. Rodin skrunar
                        larett; bordi a henni hefdi horfid vid fyrsta skrun.
                        Frosna holfid er alltaf synilegt.                   */}
                    <button style={{ ...S.star, ...(isWatched ? S.starOn : {}) }}
                      aria-pressed={isWatched}
                      aria-label={isWatched ? interp("Remove {0} from the watchlist", [r.p.web_name])
                                            : interp("Add {0} to the watchlist", [r.p.web_name])}
                      title={isWatched ? "On the watchlist — click to remove" : "Add to the watchlist"}
                      onClick={e => { e.stopPropagation(); onWatch?.(r.p.id); }}>
                      {isWatched ? "★" : "☆"}
                    </button>
                    <button style={S.nameBtn} onClick={() => onPickPlayer?.(r.p.id)}
                      title={r.p.news || `${r.p.first_name} ${r.p.second_name}`}>
                      {/* Myndin er 25 px ha og passar ekki i 26 px thetta rod. */}
                      {!narrow && !dense && (photoUrl && r.p.code
                        ? <RowPhoto src={photoUrl(r.p.code)} name={r.p.web_name} />
                        : <span style={S.imgFb}>{r.p.web_name.slice(0, 1)}</span>)}
                      {/* STADAN SEM LITADUR TEXTI, EKKI 5 PX DEPILL.
                          Depillinn krafdist thess ad madur VISSI litakodann;
                          "MID" i sama lit segir thad sjalft og kostar 17 px af
                          200. Sami litur, sama upplysing, laesileg.        */}
                      <span style={{ ...S.posTag, color: POS_COLOR[r.p.element_type] }}>
                        {POS[r.p.element_type]}
                      </span>
                      <span style={S.nm}>{r.p.web_name}</span>
                      <span style={S.teamTag}>
                        {Crest && r.team ? <Crest team={r.team} size={11} /> : null}
                        {r.team?.short}
                      </span>
                      {!r.avail && <span style={S.flag} title={r.p.news || "Not available"}>!</span>}
                      {!isLive && !r.hist && <span style={S.noHist} title={interp("No data in {0}", [season])}>—</span>}
                    </button>
                    {/* ⇄ SITUR A EFTIR NAFNINU, EKKI VID HLIDINA A STJORNUNNI.
                        Fyrsta utgafan setti hann vid ☆ og thau tvo urdu
                        of lik og of naerri: baedi lítil takn i sama horni,
                        svo madur hitti a rangt. Nafnid a milli adskilur
                        thau. Upprunalega var hann AFTAST — A EFTIR 100+ DALKUM.
                        Til ad na i hann thurfti ad skruna toffluna alla leid
                        til haegri, svo hann fannst i reynd ekki. Nu situr hann
                        i FROSNA holfinu vid hlidina a stjornunni: sama rok og
                        bordinn "mitt lid" (6i) — thad sem madur notar i hverri
                        rod ma ekki hverfa vid larett skrun.                  */}
                    {!narrow && <button style={{ ...S.cmpBtn, ...(inCmp ? S.cmpOn : {}) }}
                      aria-pressed={inCmp}
                      aria-label={inCmp ? interp("Remove {0} from the comparison", [r.p.web_name])
                                        : interp("Add {0} to the comparison", [r.p.web_name])}
                      title={inCmp ? "In the comparison — click to remove" : "Add to the comparison"}
                      onClick={e => { e.stopPropagation(); onCompare?.(r.p.id); }}>
                      {inCmp ? "✓" : "⇄"}
                    </button>}
                  </div>
                  {/* TOLU-HOLFIN ERU EKKI LENGUR SMELLANLEG (17.8.2026).
                      `onClick` a hverju holfi setti throskuld A SAMSTUNDIS og
                      thad var villan sem notandinn tilkynnti — sja skyringuna
                      vid `sortKey` ofar. Holfin bera afram `title` med heiti
                      og gildi; thad var HITT sem thau gerdu.               */}
                  {(() => { const d = STAT_BY_KEY.now_cost, bg = heatBg(d, r.cost);
                    return <div style={{ ...S.cell, ...cNum, ...S.strong,
                                         ...(bg ? { background: bg } : {}) }}
                      title={`${d.label}: £${r.cost.toFixed(1)}`}>
                      £{r.cost.toFixed(1)}</div>; })()}
                  {mode === "custom" ? (() => {
                    /* STIGIN FYLGJA VOLDU TIMABILI OG UMFERDAR-BILI eins og
                       hver onnur summa — thau eru lesin ur `src` gegnum
                       skrana, ekki ur `p.total_points`. Annars hefdi fasti
                       dalkurinn birt arstidartolu vid hlid bils-talna.     */
                    const pd = STAT_BY_KEY.total_points;
                    const v = r.src ? pd.get(r.src) : null;
                    return (
                      <div style={{ ...S.cell, ...cNum, ...S.strong,
                                    ...(v == null ? S.miss : S.cellHit),
                                    ...(() => { const bg = heatBg(pd, v); return bg ? { background: bg } : {}; })() }}
                        title={v == null ? "Points: no data" : `Points: ${v}`}>
                        {v == null ? "—" : fmtStat(pd, v)}
                      </div>
                    );
                  })() : (
                    (() => { const d = STAT_BY_KEY.selected_by_percent, bg = heatBg(d, r.own);
                      return <div style={{ ...S.cell, ...cNum,
                                           ...(bg ? { background: bg } : {}) }}
                        title={`${d.label}: ${r.own.toFixed(1)}%`}>
                        {r.own.toFixed(1)}</div>; })()
                  )}
                  {visibleCols.map(d => {
                    const v = r.src ? d.get(r.src) : null;
                    /* BYRJUNAR-LIKUR FA LIT — thad var eini dalkurinn sem
                       hafdi hann adur (i tvitekna hola dalknum lengst til
                       haegri, sem er nu farinn) og hann a hann skilid:
                       "start prob" er einmitt talan sem a ad hropa.        */
                    const isSp = d.key === "start_prob";
                    return (
                      <div key={d.key} style={{ ...S.cell, ...cFor(d),
                        ...(v == null ? S.miss : S.cellHit),
                        ...(() => { const bg = heatBg(d, v); return bg ? { background: bg } : {}; })(),
                        ...(isSp && v != null ? {
                          fontWeight: 700,
                          color: r.startLevel === "safe" ? "#046b41"
                               : r.startLevel === "trap" ? C.red
                               : r.startLevel === "mid" ? C.amber : C.text3 } : {}) }}
                        title={v == null ? interp("{0}: no data", [d.label])
                          : (isSp && r.startLevel === "trap"
                             ? `${d.label}: ${fmtStat(d, v)} — started last time but is at risk of the bench.`
                             : `${d.label}: ${fmtStat(d, v)}`)}>
                        {v == null ? "—" : fmtStat(d, v)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode !== "win" && <div style={S.legend}>
        <b>{"Click a header to sort"}</b>{", a name to open the card,"} <b>⇄</b> {"to compare. Hover any header for what the number is and what counts as good."}
        {" "}<b>—</b> {"= data missing (not zero) and always sorts"} <b>{"last"}</b>{", in both directions; a column that is empty for everyone in"}
        {" "}{season} {"is still shown, because \"no data\" is information too."}
        {" "}<b style={{ color:"#e8a71c" }}>★</b> {"adds to the watchlist (saved between visits); the star in the header shows the watchlist only."}
        {" "}<b style={{ color:C.green }}>{"A green stripe"}</b> {"= a player in your squad — the stripe is on the name cell because the row scrolls sideways."}
      </div>}
      </>)}
    </section>
  );

}

const S = {
  /* ---- sjonraent umferdar-bil ---- */
  gwRetry:{ border:`1px solid ${C.border}`, background:"#fff", borderRadius:5,
            padding:"1px 7px", fontSize:10.5, cursor:"pointer", color:C.purple, fontWeight:700 },
  gwWrap:{ display:"flex", flexDirection:"column", gap:4, padding:"7px 0 2px" },
  gwTop:{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" },
  gwPreset:{ border:`1px solid ${C.border}`, background:"#fff", color:C.text2,
             borderRadius:5, padding:"2px 7px", fontSize:11, cursor:"pointer" },
  gwNow:{ fontFamily:mono, fontSize:11, color:C.purple, fontWeight:700 },
  gwBar:{ display:"flex", gap:1, flexWrap:"nowrap", overflowX:"auto" },
  /* ALLIR 38 KASSAR BERA NU TOLU (adur adeins 1,5,10...). Tveggja-stafa
     tolur tharfnast meira plass: minWidth 14 -> 19 og letur 8,5 -> 9.
     38 x 19 px + bil = ~760 px og roðin er ~1.250 px, svo thad passar.  */
  gwCell:{ flex:"1 1 0", minWidth:19, height:18, border:`1px solid ${C.border}`,
           background:"#fafafb", color:C.text3, borderRadius:2, cursor:"pointer",
           fontSize:9, padding:0, lineHeight:"16px", fontFamily:mono },
  gwOn:{ background:"#e8e2ee", color:C.purple, border:`1px solid #cdbcd8` },
  gwEdge:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}`, fontWeight:700 },
  /* MERKING SEM SEST. Var `∑` i 9 px, #9a8aa8 a #faf7fb — omerkjanlegt, og
     notandinn tilkynnti bilid sem BILUN 14.8.2026. Nu ber hausinn ordid
     "season" i lesanlegri staerd og bakgrunnurinn er greinanlegur.      */
  hBlind:{ background:"#f3ecf7", color:"#6b5b7b" },
  blindMark:{ fontSize:9, fontWeight:700, color:"#fff", background:"#8b7d9b",
              borderRadius:3, padding:"1px 3px", marginLeft:3, letterSpacing:0.2 },

  /* ---- leitanlegur dalkavalari (124 dalkar; select var oskrunanlegur) ---- */

  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 },
  head:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  sub:{ fontSize:11.5, color:C.text2, marginTop:3, display:"flex", alignItems:"center", gap:6 },
  histTag:{ fontSize:9.5, background:C.cardAlt, border:`1px solid ${C.border}`,
            borderRadius:4, padding:"1px 5px", color:C.text3 },
  /* flexWrap: hausrodin bar adur EITT stak (timabils-valid). Nu er thar lika
     thriggja-hnappa lesmata-rofi, og an brots faerist hann UT UR skjanum i
     sima (380 px) i stad thess ad brotna nidur i naestu linu.            */
  headCtl:{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap",
            justifyContent:"flex-end" },
  sel:{ border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 7px", fontSize:11.5, maxWidth:200 },
  clearAll:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2,
             borderRadius:6, padding:"3px 9px", fontSize:11, cursor:"pointer" },
  warn:{ fontSize:11.5, color:"#7a5600", background:C.amberBg, border:"1px solid #f0dcae",
         borderRadius:6, padding:"7px 9px", margin:"10px 0", lineHeight:1.5 },
  muted:{ fontSize:11.5, color:C.text3 },

  filters:{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", margin:"10px 0 7px" },
  posRow:{ display:"flex", gap:3 },
  posBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:5,
           padding:"3px 9px", fontSize:11.5, fontWeight:600, cursor:"pointer" },
  posOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  search:{ border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 8px", fontSize:11.5,
           flex:"1 1 170px", minWidth:130 },
  check:{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.text2, cursor:"pointer" },

  chip:{ border:`1px solid #d9c7dc`, background:"#f6f1f7", color:C.purple, borderRadius:12,
         padding:"2px 8px", fontSize:10.5, cursor:"pointer" },

  /* ---- VIRKAR SIUR: eigin rammi, ekki laus chip-rod ----
     Rammi + tala + eigin bakgrunnur svo "hvad er i gangi" se lesid i einu
     augnakasti. Chip-in eru RITANLEG (tala, atti, eyding) — thad var
     beidnin: breyta gildi an ad setja siuna inn upp a nytt.             */
  filterBar:{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center",
              background:"#f8f5f9", border:`1px solid #e4d8e7`, borderRadius:8,
              padding:"6px 8px", marginBottom:8 },
  filterHd:{ fontSize:10, fontWeight:700, letterSpacing:0.6, textTransform:"uppercase",
             color:C.purple, display:"flex", alignItems:"center", gap:4 },
  filterN:{ background:C.purple, color:"#fff", borderRadius:9, minWidth:14,
            textAlign:"center", padding:"0 4px", fontSize:9.5, letterSpacing:0 },

  /* ---- lesmata-rofi ---- */
  modeRow:{ display:"flex", gap:3 },
  modeBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2,
            borderRadius:6, padding:"3px 9px", fontSize:11.5, fontWeight:600,
            cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 },
  modeOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  modeN:{ background:"#ece7f0", color:C.purple, borderRadius:8, fontSize:9,
          fontWeight:700, padding:"0 4px" },
  modeNOn:{ background:"rgba(255,255,255,0.22)", color:"#fff" },

  /* ---- dalkavalarinn ("byggdu tofluna") ----
     BLAR = VALINN, sem var bein beidni ("verða þá bláir þegar ég smelli").
     Blai liturinn er lika ASETT ANNAR en fjolublai (rodun/sia) og graeni
     ("mitt lid") — thrju merki, thrir litir, engin tvitekning.          */
  pickWrap:{ border:`1px solid #d8e3f0`, background:"#fbfcfe", borderRadius:8,
             padding:"8px 9px", marginBottom:8 },
  pickTop:{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 },
  pickToggle:{ display:"inline-flex", alignItems:"center", gap:4, border:"none",
               background:"transparent", cursor:"pointer", padding:0, font:"inherit" },
  pickCaret:{ fontSize:9, color:"#12456f", transition:"transform 120ms" },
  pickTitle:{ fontSize:11.5, color:"#12456f" },
  pickHint:{ fontSize:10.5, color:C.text3 },
  pickSearch:{ border:`1px solid ${C.border}`, borderRadius:6,
               padding:"3px 7px", fontSize:11.5, minWidth:150, flex:"0 1 240px" },
  pickClearQ:{ border:0, background:"none", cursor:"pointer", color:C.text3,
               fontSize:11, padding:"0 2px" },
  pickClear:{ border:`1px solid #c9d8e8`, background:"#fff", color:"#12456f",
              borderRadius:6, padding:"3px 8px", fontSize:10.5, cursor:"pointer" },
  pickFixed:{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap", marginBottom:6 },
  pickFixedLbl:{ fontSize:9, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase",
                 color:C.text3 },
  chipFixed:{ fontSize:10.5, fontWeight:600, color:C.text2, background:"#eeeef2",
              border:`1px solid ${C.border}`, borderRadius:10, padding:"1px 8px" },
  /* Hamark a haed + skrun: 100 chip i fullri haed hefdu ýtt toflunni sjalfri
     undir fold, og taflan er thad sem madur er ad byggja.               */
  /* DALKA-FLAEDI, EKKI SKRUN (8.8.2026). Valarinn var 210 px hár kassi med
     `overflowY:auto` og 100 dálkar i vidum chip-rodum — thad thydir ad
     madur SKRUNAR til ad sja hvad er i bodi, sem er akkurat ofugt vid
     tilganginn: thetta er YFIRLIT yfir allt sem hægt er ad velja.

     `columns` (fjoldalka-flaedi) leysir thad sem flex-wrap getur ekki:
     efnid rennur nidur einn dalk og BYRJAR SVO EFST i theim naesta, svo
     ordin standast a og heildin sest i einu. Fjoldi dalka er ekki fastur
     heldur leiddur ut ur breiddinni (`170px`), svo hann fylgir glugganum.

     `breakInside:"avoid"` er a BONDUNUM (4-5 dálkar hvert), ekki a
     flokkunum: Attack er 33 dálkar og kemst aldrei i einn dálk, svo
     vordur a flokknum vaeri hunsadur af vafranum hvort sem er — en band
     sem klofnar milli dálka er thad sem litur i alvoru illa út.

     A SIMA er skrunid EFTIR: thar er einn dálkur og 100 fasrslur eru
     hærri en skjarinn, svo kassinn heldur ser og skrunar.               */
  pickBody:{ columns:"170px", columnGap:16, paddingTop:2 },
  pickBodyNarrow:{ columns:"auto", maxHeight:230, overflowY:"auto" },
  pickGroup:{ display:"flex", flexDirection:"column", gap:3, marginBottom:9 },
  pickGroupHd:{ fontSize:9.5, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase",
                color:"#12456f", borderBottom:"1px solid #e6eef6", paddingBottom:1,
                breakAfter:"avoid" },
  pickBand:{ display:"flex", flexDirection:"column", gap:2, breakInside:"avoid",
             marginBottom:5 },
  pickBandHd:{ fontSize:9, color:C.text3, letterSpacing:0.3, textTransform:"uppercase" },
  pickChips:{ display:"flex", flexDirection:"column", gap:2 },
  chipStat:{ border:`1px solid ${C.border}`, background:"#fff", color:C.text2,
             borderRadius:5, padding:"2px 7px", fontSize:10.5, cursor:"pointer",
             textAlign:"left", width:"100%", overflow:"hidden",
             textOverflow:"ellipsis", whiteSpace:"nowrap" },
  chipStatOn:{ background:"#1b5e9c", color:"#fff", border:"1px solid #1b5e9c",
               fontWeight:600 },

  /* ---- GW-samanbrot, upplysinga-lina og toflu-rofar ---- */
  gwToggle:{ display:"inline-flex", alignItems:"center", gap:4, border:"none",
             background:"transparent", cursor:"pointer", padding:0,
             fontSize:11, fontWeight:700, color:C.text2 },
  togglesRow:{ display:"flex", justifyContent:"flex-end", marginBottom:6 },
  toggles:{ display:"inline-flex", gap:3, marginLeft:"auto", flex:"0 0 auto" },
  tgl:{ border:`1px solid ${C.border}`, background:C.card, color:C.text3,
        borderRadius:5, padding:"2px 7px", fontSize:10, cursor:"pointer",
        whiteSpace:"nowrap" },
  tglOn:{ background:"#f1e9f2", color:C.purple, border:`1px solid #d9c7dc`, fontWeight:600 },

  groupRow:{ display:"flex", gap:4, marginBottom:8, overflowX:"auto",
             borderBottom:`1px solid ${C.border}`, paddingBottom:7,
             scrollbarWidth:"none", WebkitOverflowScrolling:"touch" },
  /* Bord: brotna i stad ad skruna (sja skyringu vid notkun). rowGap svo
     tvaer linur klessist ekki saman.                                     */
  groupRowWide:{ flexWrap:"wrap", overflowX:"visible", rowGap:4 },
  groupBtn:{ border:"none", background:"transparent", color:C.text2, borderRadius:5,
             padding:"4px 9px", fontSize:11.5, fontWeight:600, cursor:"pointer",
             whiteSpace:"nowrap", flex:"0 0 auto" },
  groupOn:{ background:"#f1e9f2", color:C.purple },

  scroll:{ overflow:"auto", maxHeight:"min(66vh, 620px)", border:`1px solid ${C.border}`,
           borderRadius:8, position:"relative" },
  /* TVO THREP: `hStick` er sticky-umgjordin, `bandRow` og `hRow` eru
     radirnar inni i henni. Sticky-vinstri gildir PER HOLF, svo frosnu
     holfin eru sett i badar radir hvor fyrir sig — eitt holf getur ekki
     spannad bædi threpin.                                               */
  hStick:{ position:"sticky", top:0, zIndex:3, display:"flex", flexDirection:"column",
           background:C.cardAlt, borderBottom:`1px solid ${C.borderStrong || C.border}` },
  bandRow:{ display:"flex", height:BAND_H, background:"#f2f0f5" },
  bandCell:{ boxSizing:"border-box", display:"flex", alignItems:"center",
             justifyContent:"center", fontSize:9.5, fontWeight:700,
             letterSpacing:0.4, textTransform:"uppercase", color:C.text3,
             padding:"0 4px", whiteSpace:"nowrap", overflow:"hidden",
             borderRight:"1px solid #e6e4ec" },
  bandOn:{ color:"#5a4a66", background:"#eae6f0" },
  bandFrozen:{ position:"sticky", left:0, zIndex:2, background:"#f2f0f5",
               borderRight:`1px solid ${C.border}` },
  hRow:{ display:"flex", height:LABEL_H },
  /* Frosni HAUS-dalkurinn er VINSTRI-jafnadur (allir adrir haegri).
     Adur var "Player" haegri-jafnad, svo thad sat thett upp vid naesta
     haus-heiti sem er klippt vinstra megin thegar skrunad er — tvo hálf
     ord i beinni rod, sem las eins og bilun ("Player" + "ice chg (GW)"). */
  /* BAKGRUNNURINN VERDUR AD VERA BEINN, EKKI `inherit`.
     THETTA VAR VILLAN SEM NOTANDINN SA ("þegar ég skrolla langt til hægri
     fer texti undir nöfnin og myndir af köllum"): `cName` ber
     `background:"inherit"`, sem virkar i GAGNARODUNUM thvi rodin sjalf
     setur lit — en i hausnum sat liturinn a sticky-UMGJORDINNI og
     haus-rodin sjalf var gagnsae, svo frosna "Player"-holfid var gagnsaett
     og haus-heitin skrunudu SYNILEGA undir thad ("s/xGIPlayer xGI/£m").
     Maelt i Chrome: bakgrunnur holfsins var rgba(0,0,0,0).
     Beinn litur her + `frozenShadow` a kantinum = holfid hylur og THAD
     SEST ad efnid heldur afram undir thvi.                              */
  hName:{ justifyContent:"flex-start", textAlign:"left", background:C.cardAlt },
  frozenShadow:{ boxShadow:"6px 0 8px -6px rgba(0,0,0,0.28)" },
  /* whiteSpace:"normal" + 2 linur: sja wOf. `lineHeight` er sett svo tvaer
     linur passi i haus-hædina an ad ýta rodunum nidur.                   */
  /* boxSizing:"border-box" A BADUM — HAUS OG HOLFI.
     AFTURFOR SEM MAELDIST: an thess var haus-holfid 2 px SMAERRA en
     gagna-holfid (60 a moti 62) thvi bordid og padding logdust UTAN a
     uppgefna breidd i einu en ekki i odru. Skekkjan HLADST UPP: dalkur 1
     var 2 px af, dalkur 9 var 16 px af, og tha situr heitid ekki lengur
     yfir sinum dalki. Med border-box er uppgefin breidd HEILDARBREIDDIN
     og haus og holf geta ekki rekid i sundur.
     fontSize 10,5 (var 9,5): heitin voru ordin of smá vid tveggja-linu
     brotid. Breiddar-formulan (wOf) notar 5,9 px/staf til samraemis.     */
  /* EIN LINA (`nowrap`) og HAEGRI-JOFNUN svo haus standi yfir sinni tolu:
     gildin eru haegri-jofnud (cNum) en hausinn var flex-start, svo stutt
     heiti sátu vinstra megin og long til haegri — thad var ojafnan sem
     notandinn sa. `justifyContent:flex-end` samraemir thetta.          */
  hCell:{ boxSizing:"border-box", display:"flex", alignItems:"center",
          justifyContent:"flex-end", textAlign:"right",
          fontSize:10.5, fontWeight:700, color:C.text2,
          padding:"0 5px", cursor:"pointer", userSelect:"none",
          whiteSpace:"nowrap", lineHeight:1.14,
          borderRight:"1px solid #eeeef1", overflow:"hidden" },
  /* BAKGRUNNURINN ER SKILYRDI, EKKI SKRAUT: frosna nafnaholfid (`cName`)
     erfir bakgrunn RADARINNAR (`background:"inherit"`). Vaeri rodin
     gagnsae — eins og hun var — skruna tolurnar SYNILEGA UNDIR nafninu
     ("6*Gabriel +GBP1.3"). Maelt i Chrome: bakgrunnur bædi radar og holfs
     var rgba(0,0,0,0). Litur ma ekki fjarlaegjast her.                   */
  row:{ position:"absolute", left:0, right:0, display:"flex", height:ROW_H,
        alignItems:"center", background:C.card,
        borderBottom:"1px solid #f4f4f6" },
  rowAlt:{ background:"#fcfcfd" },
  /* GRAENT THYDIR ADEINS "MITT LID". Samanburdur var adur greenBg — sami
     litur — svo hann er faerdur i ljosfjolublaan. Einn litur, ein merking. */
  rowPicked:{ background:"#f7f2f8" },
  rowMine:{ background:"#effaf4" },
  cellMine:{ boxShadow:`inset 3px 0 0 ${C.green}` },
  star:{ border:"none", background:"transparent", cursor:"pointer", padding:0,
         fontSize:13, lineHeight:1, color:"#c9c9d0", flex:"0 0 14px", width:14 },
  starHead:{ border:"none", background:"transparent", cursor:"pointer", padding:0,
             fontSize:12, lineHeight:1, color:"#c9c9d0", flex:"0 0 14px", width:14,
             marginRight:2 },
  starOn:{ color:"#e8a71c" },
  cell:{ boxSizing:"border-box", display:"flex", alignItems:"center", padding:"0 5px", fontSize:11.5,
         whiteSpace:"nowrap", borderRight:"1px solid #f6f6f8" },
  /* Tola sem MA smella a til ad sia. Bendillinn er eina visbendingin sem
     kostar ekkert sjonraent suð i 100-dalka toflu — tinting a hverju holfi
     hefdi gert tofluna oleaesilega.                                      */
  cellHit:{ cursor:"pointer" },
  cName:{ position:"sticky", left:0, zIndex:2, width:196, minWidth:196,
          background:"inherit", borderRight:`1px solid ${C.border}` },
  cNum:{ width:88, minWidth:88, maxWidth:88, justifyContent:"flex-end", fontFamily:mono, color:C.text2 },
  /* ⇄ i frosna holfinu — somu maal og stjarnan svo thau standi jofn. */
  cmpBtn:{ border:0, background:"none", cursor:"pointer", padding:"0 3px", fontSize:12,
           lineHeight:1, color:"#b9b9c2", flex:"0 0 auto" },
  cmpOn:{ color:"#7b2d8e", fontWeight:700 },
  strong:{ color:C.text, fontWeight:700 },
  miss:{ color:"#c4c4cc" },

  nameBtn:{ display:"flex", alignItems:"center", gap:4, border:"none", background:"transparent",
            cursor:"pointer", padding:0, width:"100%", textAlign:"left", overflow:"hidden" },
  img:{ width:20, height:25, objectFit:"contain", flex:"0 0 20px" },
  imgFb:{ width:20, height:25, display:"flex", alignItems:"center", justifyContent:"center",
          background:"#efeff2", borderRadius:3, fontSize:10, color:C.text3, flex:"0 0 20px" },
  posTag:{ fontSize:8.5, fontWeight:800, letterSpacing:0.2, flex:"0 0 auto",
           fontFamily:mono },
  nm:{ fontSize:11.5, color:C.text, overflow:"hidden", textOverflow:"ellipsis", flex:1, minWidth:0 },
  teamTag:{ display:"flex", alignItems:"center", gap:2, fontSize:9, color:C.text3 },
  flag:{ fontSize:10, fontWeight:700, color:C.red },
  noHist:{ fontSize:9, color:C.text3 },

  empty:{ fontSize:12, color:C.text2, padding:"18px 4px", lineHeight:1.6 },
  link:{ border:"none", background:"transparent", color:C.purple, fontSize:12,
         textDecoration:"underline", cursor:"pointer", padding:0 },
  legend:{ fontSize:10.5, color:C.text3, marginTop:9, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.55 },
};
