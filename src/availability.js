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
      FPL notar annan grunn fyrir horn (svid 4-10) svo `order === 1` naer
      thar aldrei. Maelt: badar adferdir gefa somu 20 vitaskyttur i dag —
      thetta er vorn gegn ThOGULLI bilun, ekki lagfaering a birtri tolu.
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
   gildra sem `SetPieces.jsx` er skrifud til ad vara vid: FPL notar ANNAN
   GRUNN fyrir horn (svid 4-10), svo `order === 1` naedi ThAR aldrei — og
   ekkert lofar ad vita-svidid haldi sinum grunni. `setPieceRanks` radar
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
export function rotationRisk(p, seasonGames) {
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
