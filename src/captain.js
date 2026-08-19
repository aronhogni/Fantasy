/* ============================================================
   CAPTAIN.JS — HVERN A AD SETJA MED BANDID (maelt 18.8.2026)

   FYRIR THETTA VAR EKKERT TIL. Fyrirlida-VAL er til (tveir `<select>`
   yfir byrjunarlidid, engin skorun, engin rodun, `START_CAPTAIN = 411`
   hardkodad); fyrirlida-RADGJOF var hvergi. `advisor.js` er eingongu um
   skipti, og eina stadan thar sem fyrirlidatign maetir likaninu er
   Triple-Captain-timasetningin, sem kallar `expPoints(captain, g)` a
   TEGAR VOLDUM fyrirlida. Velin var thvi til — hun var bara aldrei
   keyrd yfir FRAMBODENDUR. Thetta skjal keyrir hana.

   SKORID ER TVEIR LIDIR OG EKKI FLEIRI:

       captainScore = expPoints  x  startProb

   Badir eru ADFLUTTIR (dependency injection): `expPoints` kemur ur
   `model.js:expPointsFor` og `startProb` ur `stats.js:startProbability`.
   Thessi skra reiknar hvorugt sjalf — hun MARGFALDAR thau og RADAR.
   Thad er asett: annars vaeri thridja utfaersla af vaentum stigum til i
   repo-inu og thaer gaetu rekid i sundur (sama regla og
   `buildTeamMetrics` sem VAR flutt ur App.jsx, sja CLAUDE.md kafla 7).

   ------------------------------------------------------------
   BAKPROFID — `tests/captain.mjs`, 174 umferdir, 5 timabil
   ------------------------------------------------------------
   Laugin er `tests/lib/panel.mjs` med `includeBlanks: true` (ALLAR
   radir, lika 0-minutu). Thad er EKKI smekksatridi: med
   `includeBlanks: false` er madur sem sat a bekknum EKKI I LAUGINNI,
   svo byrjunar-likurnar gaetu ekki tapad neinu og maelingin vaeri
   sjalfgefid jakvaed. Akvordunin er `topN(rows, pred, 1)` per umferd —
   EIN fyrirlidi, sem er akvordunin sjalf en ekki stadgengill hennar.
   Medaltal ~733 frambodenda per umferd.

   maeling                          stig   sd    topp-3  10+    <=2   0 min
   naiv: dyrasti madurinn           5,43  4,96    7,5%  18,4%  43,1%  20/174
   xP5 (jafngildi `ep_next`)        5,92  5,47   10,9%  21,3%  38,5%  17/174
   expPoints = xP5 x leikjathyngd   6,13  5,48   11,5%  23,0%  37,4%  16/174
   `rankScore` (thad sem repo-id a) 6,62  5,47   14,4%  21,8%  33,9%  11/174
   CAPTAIN = expPoints x startProb  6,97  5,49   14,4%  25,9%  28,2%   6/174
   FPL-eigid xP thessarar umferdar 10,37   —       —      —      —      —
   ORAKEL (raunstig)               17,21  2,73  100,0% 100,0%   0,0%   0/174

   FPL-eigid xP er SOTT EFTIR ad umferdin klarast (`data/SCHEMA.md`), svo
   thad er EKKI keppinautur heldur RAUSNARLEGT THAK — tala sem enginn gat
   haft fyrir frest. Thad er maelt a theim 99 umferdum thar sem thekjan er
   >=50%; a somu umferdum faer CAPTAIN 7,28 og naiv 5,82.

   ------------------------------------------------------------
   HVAD STOD OG HVAD FELL (bootstrap, 400 itranir, KLASAD PER
   LEIKMANN — sami maelikvardi og `tests/mo-candidates.mjs`)
   ------------------------------------------------------------
   CAPTAIN  -  naiv dyrasti      +1,046  [ 0,178 ;  1,902 ]  STENDUR
   startProb-lidurinn            +0,790  [ 0,379 ;  1,178 ]  STENDUR
   leikjathyngdar-lidurinn       +0,133  [-0,241 ;  0,649 ]  OGREINANLEGT
   vitaspyrnu-overlay w=0,10     -0,081  [-0,322 ;  0,121 ]  FELLUR
   vitaspyrnu-overlay w=0,25     -0,300  [-0,713 ;  0,052 ]  FELLUR
   vitaspyrnu-overlay w=0,50     -0,331  [-0,845 ;  0,213 ]  FELLUR

   THRJAR NIDURSTODUR SEM MA EKKI SNUA VID I KYNNINGU:

   1. NAIVA VIDMIDID ER SLEGID, og i 5/5 timabilum (+1,49 +1,03 +1,17
      +3,86 +0,11). En thad er thess virdi ad sja hvad naiva vidmidid ER:
      thad velur Haaland i 96 af 174 umferdum og Salah i 71. "Settu bandid
      a dyrasta manninn" er thvi ekki straman heldur raunhaeft rad, og
      forskotid +1,5 stig (x2 = +3 stig med bandinu) er raunverulegt en
      ekki risavaxid.

   2. CAPTAIN ER **EKKI** GREINANLEGA BETRA EN `rankScore` SEM ER THEGAR
      TIL: +0,351, 95% CI [-0,420 ; 1,122] — INNIHELDUR NULL, og per
      timabil er thad +0,40 +0,88 +0,69 0,00 -0,20 (3/5). Retta
      framsetningin er thvi: fyrirlida-radgjof gefur naiva vidmidinu
      maelanlegt forskot, en hun er JAFNTEFLI vid rodunarskorid sem
      tillogu-velin notar nu thegar. Ef einhver spyr "hvers vegna tha nyja
      skra?" er svarid EKKI "hun er betri" heldur ad hun er a REttum
      KVARDA (vaent stig, ekki rodunareining) og ad hun ber
      byrjunar-likurnar, sem `rankScore` ber ekki.

   3. LEIKJATHYNGDIN INNI I `expPoints` ER OGREINANLEG VID N=1
      (+0,133, CI inniheldur null). Hun er samt HER — thvi hun er ekki
      lidur sem thessi skra baetti vid, heldur hluti af `expPointsFor` sem
      appid a fyrir. Ad TAKA hana ut er lika ogreinanlegt. Skrain
      FULLYRDIR thvi ekkert um hana; hun tekur vid theirri tolu sem
      kallandinn gefur. Ekki selja leikjathyngdina sem fyrirlida-merki.

   ------------------------------------------------------------
   MAELT OG HAFNAD — EKKI TAKA THETTA UPP AFTUR
   ------------------------------------------------------------
   * VITASPYRNU-OVERLAY. `src/stats.js` fullyrti i tooltip ad rodun a
     vitaspyrnum vaeri "the strongest single captaincy signal in the
     data". Su setning var FJARLAEGD ur `stats.js` 16.8.2026 og hun atti
     aldrei ad standa: `grep -i captain docs/MAELINGAR.md` skilar EINU
     (heiti Triple-Captain-chipsins), svo engin fyrirlida-maeling var til
     i repo-inu thegar hun var skrifud.
     ATH 18.8.2026: SAMA FULLYRDING LIFIR ENN I VIDMOTINU —
     `src/SetPieces.jsx` birtir "the no. 1 penalty taker is the strongest
     single captaincy hint the data holds". Su skra er ekki a minu
     forraedi, en maelingin her stangast beint a vid hana og setningin a
     ad fara sama veg og systir hennar i `stats.js`.
     Maeld her sem overlay `(1 + w * takari)`: punktmatid er NEIKVAETT vid
     ollum thremur vogunum og ekkert CI utilokar null. Overlay-id er thvi
     EKKI i skorinu.
     OG AUDKENNINGIN SJALF ER TAKMORKUD, sem verdur ad fylgja tolunni:
     sogulegu gognin bera ENGA `penalties_order`. `players.json` ber hana
     adeins fyrir YFIRSTANDANDI timabil og `player_seasons.json` ber
     `penalties_missed` en EKKI `penalties_scored`. Eina lekalausa
     audkenningin sem committud gogn leyfa er thvi "hann hefur MISST viti
     i fyrri umferd" — nakvaemni 1,0 en endurheimt lag: 59 leikmenn,
     4.218 af 126.730 rodum. Retta ordalagid er thess vegna: *overlay-id
     maeldist ekki hjalpa a theim takarahopi sem haegt er ad audkenna
     lekalaust*, ekki *vitaspyrnur skipta ekki mali*. Ad staekka hopinn
     krefst nyrrar heimildar; BSD ber vitaspyrnur en adeins 2025/26, og
     "BSD i bakprofin" er thegar maelt og hafnad (CLAUDE.md kafli 4).
   * VELDI A BYRJUNAR-LIKUM (`startProb^k`). k=1,5 gefur +0,201 med CI
     [-0,025 ; 0,427] og k=2,0 +0,144 [-0,125 ; 0,412] — baedi innihalda
     null. k=1 stendur, og thad er MIKILVAEGT ad thad se 1: veldi er
     kvordunarlaust og myndi eydileggja thad ad talan se stig.
   * GOLF A BYRJUNAR-LIKUM (a la `rotation.js:MIN_START_PROB`). Maelt vid
     0,15 / 0,30 / 0,50 ofan a margfeldid: delta er NAKVAEMLEGA 0,000 i
     ollum thremur — margfeldid hefur thegar ytt theim nidur, svo golfid
     breytir aldrei valinu. Ohreyft golf er ohreyfd tala; hun er ekki her.
   * `rankScore x startProb`. 6,53 a moti 6,62 fyrir bert `rankScore` —
     VERRA. `rankScore` er a rodunar-kvarda med biasi, ekki vaentum
     stigum, svo margfeldi er merkingarlaust a theim kvarda.

   ------------------------------------------------------------
   TAKMARKANIR SEM VERDUR AD SEGJA UPPHATT
   ------------------------------------------------------------
   * `availForKickoff` er EKKI endurbyggjanleg sogulega (engin
     `status`/`news` i gognunum), svo bakprofid maelir skorid AN
     tiltaekileika-lidsins. I appinu er hann inni i `expPointsFor` og
     getur adeins baett valid.
   * `START_MODEL` var thjalfad a hluta somu timabila, svo
     startProb-lidurinn er ekki 100% ut fyrir urtak. Merkid er samt
     stort og einratt (0 min: 20/174 -> 6/174), svo hofid skyrir thad
     ekki.
   * Laugin er OTAKMORKUD (allir leikmenn deildarinnar), ekki byrjunarlid
     notandans. Endurmaelt a raunhaefum fyrirlidahopi (verd >= 7,0m) helst
     rodun tho oskert: naiv 5,46 · rankScore 6,64 · CAPTAIN 6,82, og
     CAPTAIN - naiv +1,353 [0,378 ; 2,327].
   * HAVADINN ER STOR. sd er ~5,5 stig a moti medaltali ~7. 26% umferda
     gefa 10+ og 28% gefa <=2. Verkfaeri sem birtir "best captain" an
     thessara talna er ad ljuga um vissu. Thess vegna er
     `CAPTAIN_MEASURED` FLUTT UT — vidmotid a ad geta birt dreifinguna.
   ============================================================ */
import { clamp } from "./model.js";

/* MAELDU TOLURNAR. `tests/captain.mjs` ENDURREIKNAR thaer allar ur
   `data/fpl_player_gw.json` og FELLUR ef thaer reka i sundur — thess
   vegna ma hafa thaer her an thess ad thaer stadni thegjandi.
   `seasons` afmarkar maelinguna: nytt timabil breytir tolunum, og tha a
   ad ENDURMAELA og uppfaera, ekki ad slokkva a verdinum.               */
export const CAPTAIN_MEASURED = {
  seasons: ["2122", "2223", "2324", "2425", "2526"],
  gameweeks: 174,
  pool: "panel includeBlanks=true, ~733 candidates per gameweek, N=1",
  /* medalstig raunverulegs vals (EKKI tvofoldud — bandid tvofaldar) */
  meanPoints: 6.97,
  sd: 5.49,
  top3Rate: 0.144,     // hversu oft valid var i raun-topp-3 umferdarinnar
  haulRate: 0.259,     // 10+ stig
  blankRate: 0.282,    // <=2 stig
  didNotPlay: 6,       // umferdir thar sem valdi madurinn spiladi 0 min
  baselines: {
    naivePrice:  { meanPoints: 5.43, top3Rate: 0.075, didNotPlay: 20 },
    epNextOnly:  { meanPoints: 5.92, top3Rate: 0.109, didNotPlay: 17 },
    expPoints:   { meanPoints: 6.13, top3Rate: 0.115, didNotPlay: 16 },
    rankScore:   { meanPoints: 6.62, top3Rate: 0.144, didNotPlay: 11 },
    fplXpPostHoc:{ meanPoints: 10.37, note: "scraped AFTER the gameweek — a ceiling, not a rival" },
    oracle:      { meanPoints: 17.21 },
  },
  /* bootstrap 400, klasad per leikmann */
  terms: {
    startProb:   { delta: +0.790, lo: +0.379, hi: +1.178, verdict: "kept" },
    fixtureDiff: { delta: +0.133, lo: -0.241, hi: +0.649, verdict: "indistinguishable" },
    penalties10: { delta: -0.081, lo: -0.322, hi: +0.121, verdict: "rejected" },
    penalties25: { delta: -0.300, lo: -0.713, hi: +0.052, verdict: "rejected" },
    penalties50: { delta: -0.331, lo: -0.845, hi: +0.213, verdict: "rejected" },
  },
  vsNaive: { delta: +1.046, lo: +0.178, hi: +1.902 },
  /* CI inniheldur null — MA EKKI kynna sem sigur */
  vsRankScore: { delta: +0.351, lo: -0.420, hi: +1.122, verdict: "indistinguishable" },
};

/* ------------------------------------------------------------------
   SKORID. TVEIR LIDIR, ENGIN FALIN TALA.
   `tests/captain.mjs` kafli 1 ber thetta vid `expPoints * startProb` a
   500 slembnum inntokum og fellur ef nokkud annad kemur inn — svo
   omaeldur lidur getur ekki laumast hingad seinna.

   NULL-REGLAN (CLAUDE.md kafli 8): `null` er EKKI `0`. Vantandi
   byrjunar-likur (nylidi, forleikur, engar 5 umferdir ad baki) mega
   ALDREI utiloka mann — thaer verda hlutlausar (1). `0` er hins vegar
   maeld nulltala og utilokar. Thetta er nakvaemlega villan sem kostadi
   sumarid 2026: `imminent.json` gaf fals-null og golfid var "aldrei
   spurt" (CLAUDE.md kafli 3).
   ------------------------------------------------------------------ */
export function captainScore({ expPoints, startProb } = {}) {
  const e = Number.isFinite(expPoints) ? expPoints : 0;
  if (!(e > 0)) return 0;                    // aud umferd / engin gogn -> 0
  const p = startProb == null || !Number.isFinite(startProb)
    ? 1                                      // ovitad -> hlutlaust, ekki 0
    : clamp(startProb, 0, 1);
  return e * p;
}

/* ------------------------------------------------------------------
   RODUNIN. Frambodandi: { id, name, expPoints, startProb, ... }.
   Oll onnur svid berast obreytt i gegn svo vidmotid geti borid sitt eigid
   med ser (lid, verd, mynd) an thess ad thessi skra viti af theim.

   HVER DETTUR UT: adeins their sem faa skor 0 — thad er annad hvort
   `expPoints <= 0` (aud umferd, engin `ep_next`/`points_per_game`) eda
   `startProb === 0` (MAELT nulltala: hann byrjar ekki). Vantandi
   byrjunar-likur detta EKKI ut, sja null-regluna ad ofan.

   JAFNTEFLI ER LEYST A NAFNI, ekki latid rada ser sjalft: `Array.sort`
   er stodugt i Node en rodun frambodenda er thad ekki — inntakid kemur
   ur hlutum sem hafa enga trygga rod. An thessa gaeti "besti fyrirlidi"
   skipt um mann milli teikninga an thess ad nokkur tala breyttist.
   ------------------------------------------------------------------ */
export function rankCaptains(candidates, { limit = 0 } = {}) {
  if (!Array.isArray(candidates)) return [];
  const out = [];
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    const expPoints = Number.isFinite(c.expPoints) ? c.expPoints : 0;
    const known = c.startProb != null && Number.isFinite(c.startProb);
    const startProb = known ? clamp(c.startProb, 0, 1) : null;
    const score = captainScore({ expPoints, startProb });
    if (!(score > 0)) continue;
    out.push({ ...c, expPoints, startProb, startProbKnown: known, score });
  }
  const key = c => String(c.name ?? c.id ?? "");
  out.sort((a, b) => b.score - a.score || key(a).localeCompare(key(b)));
  return limit > 0 ? out.slice(0, limit) : out;
}

/* Thaegindafall — skilar `null` thegar enginn er gildur (aud umferd hja
   ollum, tomt lid, forleikur). `null` er RETT svar thar; tilbuinn
   "fyrirlidi" ur tomri laug vaeri omaeld fullyrding.                    */
export function bestCaptain(candidates) {
  return rankCaptains(candidates, { limit: 1 })[0] ?? null;
}
