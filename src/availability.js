/* ============================================================
   TILTAEKILEIKI — FPL-STATUS RÆDUR, ALLT ANNAD AUDGAR

   Flutt ur `App.jsx` 11.8.2026 (F1). Hreint: engin React, engin gogn sott.

   ThRJAR MAELDAR REGLUR SEM ERU I ThESSUM KODA OG MEGA EKKI HVERFA:

   1. `banRisk` SKILAR null FYRIR TIMABILID. FPL synir gul spjold FYRRA
      timabils i bootstrap-static thangad til nytt timabil byrjar, svo
      bann-haetta reiknud a theim er VILLA — Luke Shaw var syndur "9 gul,
      1 fra banni" thegar hann hefur null. Thess vegna: EKKERT fyrr en
      umferd er lokin.
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
/* Hversu nálægt NÆSTA spjaldabanni?
   ATH: raunverulegt bann kemur úr FPL status ('s') — sjá availOf().
   Þetta mælir aðeins HÆTTU á komandi banni.
   Premier League: 5 gul (til umf. 19) = 1 leikur, 10 (til umf. 32) = 2, 15 = 3.

   MIKILVÆGT: gul spjöld NÚLLSTILLAST milli tímabila, en FPL sýnir tölur
   FYRRA tímabils í bootstrap-static þar til nýtt tímabil byrjar. Að reikna
   bann-hættu á þeim er villa — Luke Shaw var sýndur "9 gul" og "1 frá banni"
   þegar hann hefur núll. Þess vegna: EKKERT fyrr en umferð er lokin.        */
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
export function matchesPlayedByClub(fixtures) {
  const by = {};
  for (const f of (Array.isArray(fixtures) ? fixtures : [])) {
    const done = f?.finished === true || f?.finished_provisional === true;
    if (!done) continue;
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
