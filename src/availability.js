/* ============================================================
   TILTAEKILEIKI — FPL-STATUS RÆDUR, ALLT ANNAD AUDGAR

   Flutt ur `App.jsx` 11.8.2026 (F1). Hreint: engin React, engin gogn sott.

   ThRJAR MAELDAR REGLUR SEM ERU I ThESSUM KODA OG MEGA EKKI HVERFA:

   1. `banRisk` SKILAR null FYRIR TIMABILID. FPL synir gul spjold FYRRA
      timabils i bootstrap-static thangad til nytt timabil byrjar, svo
      bann-haetta reiknud a theim er VILLA — Luke Shaw var syndur "9 gul,
      1 fra banni" thegar hann hefur null. Thess vegna: EKKERT fyrr en
      timabilid er BYRJAD — sem er FRESTURINN, ekki fyrsta lokna umferdin
      (leidrett 24.8.2026, sja `seasonHasStarted` og athugasemdina vid
      `banRisk`). Skilyrdid er thad sama og FPL sjalft notar til ad
      nullstilla tolurnar, svo hvorki of snemmt ne of seint.
   2. `setPieceOf` les RODUN INNAN LIDS (`rank === 1`), ekki FPL-toluna.
      Grunnurinn sem FPL notar fyrir horn er EKKI fastur: hann var 2-12 (engin
      1) fram til 12.8.2026 og 1-6 (18 af 20 lidum med 1) fra 13.8.2026, svo
      `order === 1` naedi thar ekki i gamla grunninum og naer i 18 lid i nyja.
      Rod innan lids er rett a BADUM. Maelt: badar adferdir gefa somu 20
      vitaskyttur i dag — thetta er vorn gegn ThOGULLI bilun, ekki lagfaering
      a birtri tolu.
   3. `rotationRisk` deilir med 38 FYRIR timabil og med loknum umferdum
      eftir thad. Sami arfur og i (1): `starts` er fyrra timabilid i
      forleik.

   RAUNVERULEGT BANN kemur ur FPL-status ('s') i `availOf`, ekki ur
   `banRisk` — su sidari maelir adeins HAETTU a komandi banni.
   ============================================================ */

export const AVAIL = {
  a: { label: "Available",    short:"",   color:null,      bg:null,      solid:null },
  d: { label: "Doubt",         short:"?",  color:"#8a5f00", bg:"#fff6e0", solid:"#e0a100" },
  i: { label: "Injured",      short:"✚",  color:"#a01f2b", bg:"#fdecee", solid:"#d92d3c" },
  s: { label: "Suspended",      short:"⛔", color:"#5b21b6", bg:"#f1e9ff", solid:"#6d28d9" },
  u: { label: "Unavailable",    short:"✕",  color:"#61616b", bg:"#eeeef1", solid:"#4b4b55" },
  n: { label: "Not in squad",   short:"–",  color:"#61616b", bg:"#eeeef1", solid:"#4b4b55" },
};
export function availOf(p) {
  const a = AVAIL[p?.status] || AVAIL.a;
  const chance = p?.chance_of_playing_next_round;
  return { ...a, chance, news: (p?.news || "").trim(), isRisk: p?.status && p.status !== "a" };
}
/* ============================================================
   ER TIMABILID BYRJAD — EIN UTFAERSLA FYRIR ALLT APPID (24.8.2026)

   `App.jsx` spurdi `events.some(e => e.finished)` og `PlayerList.jsx`
   spurdi hvort EIN umferd vaeri byrjud. MAELT 24.8.2026 a lifandi `data/`:
   thau svorudu SITTHVORU — App sagdi `false` og PlayerList `true` — thvi
   GW1 ber `finished: false, is_current: true` med frest lidinn 21.8., og
   `finished` flettist ekki fyrr en umferdin er stadfest med bonus. Tvaer
   klukkur um sama tima er sama aett og `buildTeamMetrics` (CLAUDE.md 7):
   afritin reka i sundur og BADA lita ut fyrir ad vera rett.

   OG `finished` ER RANGA SPURNINGIN, EKKI BARA SU SEINNI. FPL nullstillir
   arstidar-summurnar VID FRESTINN, ekki thegar umferd klarast — maelt sama
   dag a `players.json`: max `starts` 1, max `minutes` 90, max
   `yellow_cards` 1, allt 2026/27. A thvi bili gerdi gamla reglan tvennt
   rangt i einu: `cumLabel` skrifadi "2025/26" ofan a tolum THESSA
   timabils, og `banRisk` thagdi yfir spjoldum sem VORU thessa timabils —
   nakvaemlega ofugt vid thad sem hun a ad verja (sja regluna nedar).

   `finished_provisional` ER EKKI LEIDIN HER: thad svid er a LEIKJUM
   (`fixtures.json`), ekki a `events` — maelt, thad er `undefined` a ollum
   38 rodunum — svo vorpunin i `matchesPlayedByClub` flyst EKKI hingad.
   Skilyrdin thrju eru `finished` (einratt sidar a timabilinu),
   `is_current` (flettist a frestinum sjalfum) og FRESTUR-SEM-ER-LIDINN
   (bakvorn ef `events.json` frys — tha er klukkan eina heimildin sem
   eftir er). Thrju skilyrdi, EIN spurning: thau geta ekki verid osammala
   um annad en hversu snemma svarid kemur.
   ============================================================ */
export const gwStarted = (e, now = Date.now()) =>
  !!(e && (e.finished || e.is_current
    || (e.deadline_time && Date.parse(e.deadline_time) <= now)));
export function startedGameweeks(events, now = Date.now()) {
  return (events || []).filter(e => gwStarted(e, now)).length;
}
/* SIDASTA UMFERDIN SEM ER BYRJUD — ThAD ER SU SEM FPL BIRTIR LID FYRIR.
   `entry/{id}/event/{gw}/picks/` er 404 thangad til fresturinn lidur, svo
   "hvada umferd er verid ad skipuleggja" og "hvada lid getum vid SED" eru
   TVAER spurningar. Thaer voru sama talan medan appid opnadi alltaf a
   `is_current`; um leid og skipuleggjarinn faerdist a naestu umferd
   (`planningGw`) yrdi sokinn ad 404 og TENGDA LIDID hyrfi af vellinum.
   Sama klukka og `startedGameweeks` — ekki nytt skilyrdi, sama fall.   */
export function latestStartedGw(events, now = Date.now()) {
  const ids = (Array.isArray(events) ? events : [])
    .filter(e => gwStarted(e, now)).map(e => Number(e.id)).filter(Number.isFinite);
  return ids.length ? Math.max(...ids) : null;
}
export const seasonHasStarted = (events, now = Date.now()) =>
  startedGameweeks(events, now) > 0;

/* Hversu nálægt NÆSTA spjaldabanni?
   ATH: raunverulegt bann kemur úr FPL status ('s') — sjá availOf().
   Þetta mælir aðeins HÆTTU á komandi banni.
   Premier League: 5 gul (til umf. 19) = 1 leikur, 10 (til umf. 32) = 2, 15 = 3.

   MIKILVÆGT: gul spjöld NÚLLSTILLAST milli tímabila, en FPL sýnir tölur
   FYRRA tímabils í bootstrap-static þar til nýtt tímabil byrjar. Að reikna
   bann-hættu á þeim er villa — Luke Shaw var sýndur "9 gul" og "1 frá banni"
   þegar hann hefur núll. Þess vegna: EKKERT fyrr en tímabilið er byrjað.
   LEIÐRÉTT 24.8.2026: skilyrðið var „umferð LOKIN" og það var of seint.
   FPL núllstillir spjöldin VIÐ FRESTINN (mælt: max `yellow_cards` 1 þann
   dag, meðan engin umferð var `finished`), svo gamla reglan þagði yfir
   spjöldum þessa tímabils í ~3 daga — hún varði ekki neitt á því bili,
   hún faldi rétt gögn. `seasonHasStarted` er sama klukka og allt annað.  */
export function banRisk(p, gwNow, seasonStarted) {
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
/* Vitataki / fastaleikir.
   `isPenTaker` KEMUR NU UR RODUN INNAN LIDS, EKKI UR FPL-TOLUNNI
   (lagad 11.8.2026). Adur var thad `pen === 1`, sem er nakvaemlega su
   gildra sem `SetPieces.jsx` er skrifud til ad vara vid: FPL notadi ANNAN
   GRUNN fyrir horn (svid 2-12, engin 1) svo `order === 1` naedi ThAR aldrei —
   og ekkert lofar ad vita-svidid haldi sinum grunni. ThAD LOFAR ENGINN NEINU:
   13.8.2026 endurgrunnadi FPL hornin sjalf i 1-6. `setPieceRanks` radar
   INNAN LIDS og `rank === 1` er thvi "fyrsti takarinn" oháð grunni.

   ThETTA VAR TVITEKNING, EKKI VILLA I DAG: maelt a raungognum (63 leikmenn
   med `penalties_order`) gefa BADAR adferdir SOMU 20 vitaskyttur, 0 fravik.
   En `setPieceBadges` — sem er RETTA adferdin skv. hausnum a SetPieces.jsx —
   var export sem appid notadi ekki, medan appid bar sina eigin utgafu. Their
   hefdu rekid i sundur ThANN DAG sem FPL endurgrunnar vita-rodina, og tha i
   thogn: PEN-merkid hefdi einfaldlega horfid af ollum spjoldum.
   Vordur: tests/set-pieces.mjs.                                          */
export function setPieceOf(p, ranks) {
  const pen = p?.penalties_order, ck = p?.corners_and_indirect_freekicks_order, fk = p?.direct_freekicks_order;
  if (pen == null && ck == null && fk == null) return null;
  const isPenTaker = (ranks?.get?.(p?.id) || []).some(b => b.key === "pen" && b.rank === 1);
  return { pen, ck, fk, isPenTaker };
}
// Skiptingar-hætta: byrjaði sjaldan þrátt fyrir að vera heill.
// FYRIR TÍMABIL sýnir FPL starts FYRRA tímabils (deilt með 38). Þegar
// tímabilið er hafið núllstillast tölurnar og rétt nefnari er fjöldi
// LOKINNA umferða — að deila með 38 gaf t.d. "8%" eftir 3 umferðir.
// Undir 3 loknum umferðum er úrtakið of lítið fyrir "high"-flagg.
/* ============================================================
   LEIKIR SEM HVERT FELAG HEFUR RAUNVERULEGA SPILAD

   Ein utfaersla, thvi spurningin "hefur verid spilad?" er nu spurd a
   fjorum stodum og hvert afrit er stadur thar sem `finished` gaeti laumast
   inn aftur. `finished_provisional` er skilyrdid, EKKI `finished`: maelt
   22.8.2026 bera allir sex leiknu GW1-leikirnir `finished: false` med
   `finished_provisional: true, minutes: 90` og fullum urslitum — `finished`
   flettist fyrst thegar umferdin er stadfest med bonus.
   Leikur I GANGI er utilokadur (bædi skor verda ad vera til OG leikurinn
   merktur bunum), svo hlutfall hoppi ekki a medan spilad er.
   ============================================================ */
/* ============================================================
   `fixturePlayed` — EIN UTFAERSLA A "VAR ThESSI LEIKUR SPILADUR?"

   Reglan sjalf er MAELD og skjolud i CLAUDE.md kafla 1: leikur telst
   spiladur vid `finished || finished_provisional`, thvi `finished`
   flettist EKKI fyrr en bonus er stadfestur, ~3 dogum eftir umferdina.

   HUN VAR HANDSKRIFUD A FJORUM STODUM OG EITT AFRITID VAR ThEGAR ORDID
   RANGT AFTUR (25.8.2026): `calibration.js` bar bert `f.finished` med
   athugasemd sem sagdi "sama regla og Teams-flipinn fylgir" — sem var
   maelt OSATT, thvi Teams-flipinn ber badar. Afrit sem lysir sjalfu ser
   sem samhljoda odru afriti er versta utgafan af tvitekningu.

   ============================================================
   ThETTA A **EKKI** VID UM `events` — OG ThAD ER MAELT
   ============================================================
   `finished_provisional` er svid a LEIK, ekki a UMFERD: maelt a
   `data/events.json`, allar 38 radir bera `undefined`. Fall sem vaeri
   beitt a umferd myndi thvi bera lid sem er ALLTAF OSATT — hol
   fullyrding i skilningi CLAUDE.md 5b, sem lítur út eins og hlid.
   Spurningin "er umferdin byrjud?" er ONNUR og hun a sitt eigid fall
   (`startedGameweeks` her ad nedan, thrju skilyrdi, skjolud).
   ============================================================ */
export const fixturePlayed = (f) =>
  f?.finished === true || f?.finished_provisional === true;

/* ============================================================
   HVAÐA UMFERÐ ER VERIÐ AÐ SKIPULEGGJA? (27.8.2026)

   App.jsx opnaði á `is_current` og féll aðeins á `is_next` ef engin
   umferð var current. FPL heldur hins vegar `is_current` á umferðinni
   ÞANGAÐ TIL næsti frestur líður — svo frá því að síðasti leikur
   umferðarinnar flautar og þar til næsti frestur rennur upp (þrír til
   fjórir dagar af hverri viku, NÁKVÆMLEGA þeir dagar sem skipti eru
   gerð) opnaðist skipuleggjarinn á umferð sem VAR BÚIN.

   MÆLT 27.8.2026 á lifandi `data/`: allir tíu GW1-leikirnir bera
   `finished_provisional`, GW2-fresturinn er eftir ~21 klst, og `gw` var
   samt 1. Vænt stig á hverju spjaldi — allir 616 leikmenn — voru þar með
   reiknuð úr leik sem var þegar spilaður (Sangaré 2,12 gegn Tottenham
   í stað 1,92 að Leeds), og leikjastikan sýndi hann fremstan.

   ÞRENNT SEM REGLAN VERÐUR AÐ VIRÐA:
     1. UMFERÐ Í GANGI ER ENN UMFERÐIN MANNS. Meðan einhver leikur er
        óspilaður (eða í gangi) er `is_current` rétta svarið — það er þá
        sem maður horfir á lifandi stig. Þess vegna er prófsteinninn
        `fixturePlayed` á ÖLLUM leikjum umferðarinnar, ekki `finished`
        á umferðinni sjálfri (hún flettist ~3 dögum of seint, CLAUDE.md 1).
     2. TÓM LEIKJASKRÁ MÁ EKKI ÁKVEÐA NEITT. `[].every(...)` er `true`,
        svo umferð sem á enga leik í skránni myndi lesast sem "fullspiluð"
        og fleyta manni áfram — hol fullyrðing í skilningi CLAUDE.md 5b.
        Vantandi gögn halda manni kyrrum.
     3. SÍÐASTA UMFERÐIN Á SIG SJÁLF. Að GW38 lokinni er ekkert `is_next`;
        þá stendur maður í 38 en fær ekki `null`.
   ============================================================ */
/* ENGIN KLUKKA HER OG ThAD ER ASETT: fresturinn kemur hvergi vid sogu,
   thvi spurningin er hvort LEIKIRNIR seu spiladir. Breyta sem er tekin
   vid og aldrei lesin er loford sem fallid heldur ekki. */
export function planningGw(events, fixtures) {
  const evs = Array.isArray(events) ? events : [];
  if (!evs.length) return null;
  const cur = evs.find(e => e?.is_current);
  const next = evs.find(e => e?.is_next);
  if (!cur) return next?.id ?? null;               /* forleikur: `is_next` */
  const fxAll = Array.isArray(fixtures) ? fixtures : [];
  /* ============================================================
     GENGID AFRAM ThANGAD TIL UMFERD A OLEIKINN LEIK — EKKI EITT SKREF
     (28.8.2026)

     Fyrsta utgafan skilaði `next.id` um leid og `is_current` var
     fullspilud. Thad dugar medan FPL flettir merkinu a rettum tima — en
     thad gerir hun EKKI: maelt 28.8. kl. 21:25 UTC bar `events.json` enn
     `is_current: 1` thott GW2-fresturinn hefdi lidid kl. 17:30 og einn
     GW2-leikur vaeri buinn. Vaeri merkid enn a GW1 thegar OLL GW2 er
     spilud skilaði gamla reglan 2 — sem er ThA lokin umferd, nakvaemlega
     villan sem hun var skrifud gegn, i nyjum bunningi.
     Thess vegna er gengid afram: fyrsta umferd fra `is_current` sem A
     oleikinn leik. Skilyrdin thrju halda ser — umferd i gangi stoppar
     gonguna, tom leikjaskra stoppar hana lika (vantandi gogn akveda
     ekkert), og sidasta umferdin a sig sjalf.
     ============================================================ */
  const ordered = evs.filter(e => e?.id >= cur.id).sort((a, b) => a.id - b.id);
  for (const e of ordered) {
    const fxs = fxAll.filter(f => f?.event === e.id);
    if (!fxs.length) return e.id;                  /* regla 2 */
    if (!fxs.every(fixturePlayed)) return e.id;    /* regla 1 */
  }
  /* Allt spilad fra `is_current` og ut: `is_next` ef hun er seinna, annars
     sidasta umferdin sjalf (regla 3).                                   */
  if (next?.id != null && next.id > cur.id) return next.id;
  return ordered.length ? ordered[ordered.length - 1].id : cur.id;
}

export function matchesPlayedByClub(fixtures) {
  const by = {};
  for (const f of (Array.isArray(fixtures) ? fixtures : [])) {
    if (!fixturePlayed(f)) continue;
    if (f?.team_h_score == null || f?.team_a_score == null) continue;
    by[f.team_h] = (by[f.team_h] || 0) + 1;
    by[f.team_a] = (by[f.team_a] || 0) + 1;
  }
  return by;
}

export function rotationRisk(p, seasonGames) {
  const st = p?.starts;
  if (st == null) return null;
  /* ============================================================
     `starts: 0` HJA ThEIM SEM SPILADI ALDREI ER EKKI MAELING (20.8.2026)
     ============================================================
     Notandinn sa `st0%` a Tzolis og Sangare. Baðir eru NYIR i deildinni,
     svo `starts` er 0 af thvi ad their attu enga leiki ad byrja — og
     appid fullyrti „Started 0 of 38 matches — rotation risk" um mann sem
     hafdi engar 38 umferdir. Fyrri vordurinn (`st == null`) gat ekki
     tekid thad: MAELT a `data/players.json` er `starts == null` hja
     **0 af 595**. FPL geymir raunverulegt `0`, svo vordurinn var TOM
     fullyrding a lifandi gognum (CLAUDE.md 5b).

     MAELT A COMMITTUDUM GOGNUM (595 leikmenn):
       starts=0 OG minutes=0   195   (94 kosta >= 5,0m)  -> ENGIN tala
       starts=0 en raunminutur  35   (Unal 214, Nwaneri 165, Uche 159,
                                      Nelson 118, J.Fletcher 107)  -> HELDUR
     Bein staðfesting: **enginn** af 195 hefur minutur (maelt, ekki alyktað).

     ThESS VEGNA TVO SVID OG EKKI EITT: `starts === 0 -> null` hefdi
     hreinsad 195 tilbunar tolur OG 35 RAUNVERULEGAR maelingar i somu
     hreyfingu. Fyrir mann med 214 minutur og 0 byrjanir er „byrjadi 0 af
     38" nakvaemlega thad sem flaggid er til ad segja: hann VAR til leiks
     og byrjadi samt aldrei. Sama aett og kafli 12: `mins_per_gi` vardi
     nefnarann en ekki `minutes: 0`, svo Meslier (11 mork / 0 minutur) sat
     efstur; og fimm `*_per_90` dalkar birtu `0.00` fyrir 164 menn sem
     spiludu aldrei.

     SKILYRDID ER MINUTUR > 0, ekki „minutes er 0". Vantandi svid er ekki
     sonnun um natt: NULL ER EKKI NULL i badar attir — hlutfall byrjana er
     adeins maeling ef til er vitni um ad hann hafi verid til leiks.
     Vordur: `initial-squad.mjs` kafli D (baðar attir a raungognum).      */
  const mins = Number(p?.minutes);
  if (!Number.isFinite(mins) || mins <= 0) return null;
  /* ============================================================
     NEFNARINN VAR UMFERDIR SEM ERU `finished`, EKKI LEIKIR SEM VORU
     SPILADIR — OG ThAD MERKTI MANN SEM SPILADI ALLT SEM HAEGT VAR
     (22.8.2026, ad abendingu notandans)

     Hann ordadi thad nakvaemlega: "thad meikar ekki sens ad hafa leikmenn
     merkta rotation risk ef their hafa spilad 1 af 38 leikjum, thvi their
     hafa ekki getad spilad fleiri, their eru ekki bunir."

     `seasonGames` kom ur `events.filter(e => e.finished).length`. Umferd
     telst ekki `finished` fyrr en FPL stadfestir hana med bonus, svo eftir
     GW1 var hun **0** thott SEX leikir vaeru spiladir. Tha vard
     `prevSeason` satt, nefnarinn 38 — og TELJARINN kom ur ThESSU timabili,
     thvi FPL nullstillir uppsofnudu tolurnar vid frestinn. Utkoman:
     "Started 1 of 38 matches — rotation risk" um mann sem byrjadi HVERN
     leik sem til var. Teljari og nefnari ur sitthvoru timabilinu — sama
     aett og `xg_share` 148% (kafli 12) og Championship-tolur nylidanna.

     ThETTA ER FJORDA TILVIKID AF SOMU ROT A EINUM DEGI: `season_baseline`,
     forleiks-bordinn i PlayerList, sjalfgefna timabilid og nu thetta. Alls
     stadar var spurt "er umferd LOKID?" thegar spurningin var "hefur verid
     SPILAD?".

     NEFNARINN ER NU LEIKIR SEM HANS EIGID FELAG HEFUR SPILAD — ekki
     deildar-medaltal: auð umferd og tvofold umferd gera thad ad verkum ad
     felog hafa spilad misjafnlega marga, og hlutfall verdur ad deila med
     ThVI SEM STOD HONUM TIL BODA.

     `starts > played` ER GAGNAVILLA og er medhondlud sem slik: hun getur
     adeins gerst ef teljari og nefnari eru ur sitthvorri attinni — einmitt
     villan sem var — svo svarid er ENGIN TALA, ekki tala yfir 100%.      */
  const prevSeason = !seasonGames;               // ekkert spilad enn
  const played = prevSeason ? 38 : seasonGames;
  if (!played) return null;
  if (st > played) return null;                  // sja blokkina her ofan
  const pct = Math.round((st / played) * 100);
  /* ThRIR LEIKIR ER LAGMARKID og thad stod adur — en thad var aldrei spurt
     medan `prevSeason` var satt allt timabilid. Nu bitur thad.           */
  const enough = prevSeason || seasonGames >= 3;
  const level = !enough ? "low" : pct >= 75 ? "safe" : pct >= 50 ? "mid" : "high";
  return { starts: st, played, pct, prevSeason, level };
}
