/* ============================================================
   MARKET.JS — bókmakara-línan umbreytt í mörk og FFDR-þyngd

   AF HVERJU SÉR SKRÁ (sama röksemd og model.js): þetta var inni í
   scripts/fetch.mjs og var þar með ÓPRÓFANLEGT — markaðsliðurinn er
   samt með vog 0,50 fyrir GK/DEF og 0,35 fyrir MID/FWD í FFDR, þ.e.
   um helmingur af þyngd varnarmanna. Bakprófið sleppti honum alveg
   (`odds: null`), svo stærsti einstaki liðurinn var ómældur.

   Nú flytja bæði pipeline (fetch.mjs) OG bakprófið sömu föllin, svo
   sögulega enduruppbyggingin úr B365-oddsum er nákvæmlega sú umbreyting
   sem appið birtir — ekki eftirlíking sem getur rekið frá henni.
   ============================================================ */

const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

/* Poisson: P(mótherji skorar 0) = e^-λ */
export function poissonCleanSheet(oppExpectedGoals) {
  return Math.round(Math.exp(-oppExpectedGoals) * 100);
}

/* ---- LOKALÍNU-AÐFERÐIN ----
   1) Leysa væntanleg heildarmörk út úr yfir/undir-líkum með Poisson-inversion.
   2) Skipta þeim með handicap: heima = (λ − AH) / 2.  ATH FORMERKI:
      NEGATÍFT handicap = heimalið er favorít (staðfest á raungögnum).
   Markaðurinn mældist 1,3x betri en FDR (r 0,374 á móti 0,283).

   MARKET_CALIB 0,959 -> 1,0 (28.7.2026). Gamla −4,1% kvörðunin var mæld á
   380 LEIKJUM. Endurmæld á 10.640 lið-leikjum (14 tímabil, `tests/cs-model.mjs`
   og sveipun á viðbótar-margfaldara) er niðurstaðan skýr: besti margfaldari
   ofan á 0,959 er 1,04–1,05, þ.e. 0,959 × 1,045 ≈ 1,00. Poisson-inversionin
   er því ÓSKEKKT í sjálfu sér og −4,1% skekkti hana.

   ÁHRIF (CS = e^−λ, LOSO á 14 tímabilum):
     kvörðunarhalli   −1,5pp -> +0,1pp
     meðalfrávik       1,5pp -> 0,8pp
     Brier            0,18422 -> 0,18401
   LOSO-bilið á margfaldaranum er 1,04–1,05, þ.e. FASTUR yfir tímabil —
   þetta er ekki fitt á hávaða.

   ÞETTA VAR RÓTIN að þeim „eftirstöðvum" sem voru skjalaðar í model.js:
   markaðurinn lét MEASURED-töfluna lesa ~2,4pp of bjartsýnt. Sú skekkja
   kom hingað, ekki úr töflunni.                                          */
export const MARKET_CALIB = 1.0;

export function lambdaFromOver(pOver, line) {
  // finna λ þannig að P(X > line) = pOver  (Poisson)
  const k = Math.floor(line);        // t.d. 2 fyrir línuna 2,5
  /* INNRI LYKKJAN ER AFMORKUD (11.8.2026) — AN ThESS STOPPADI HUN ALDREI.
     `for (j = 0; j <= k; j++)` med `k = Infinity` (eda 1e12) keyrir endalaust,
     og ytri helmingunin gerir thad 60 sinnum. Fundid med slembiprofi:
     `lambdaFromOver(0.5, Infinity)` og `(0.5, 1e12)` hengdu bædi ferlid.
     `null`/`NaN`/negativ lina voru ThEGAR ohaett — `j <= NaN` og `j <= -1`
     eru false, svo lykkjan sleppur.

     NAANLEGT UR YTRA SVARI: `scripts/fetch.mjs` reiknar
     `line = totLine / totN` ur `point`-svidum bokmakera i Odds-API-svarinu.
     `totN` er profad (deiling med 0 utilokud) en GILDID er OAFMARKAD, svo eitt
     gallad `point` — eda summa sem flaedir i Infinity — HENGIR daglegu
     keyrsluna: jobbid brennur Actions-minutur thangad til 6-klst thakid slaer
     inn, engin gogn skrifud og ENGIN VILLA skrad. Sama leid i bakprofunum
     gegnum `tests/lib/e0.mjs` ur B365-CSV.

     ADEINS EFRA ThAKID ER SETT, EKKI `k` SJALFT. Fyrsta tilraun min reiknadi
     `k` upp a nytt med `Number.isFinite(line) ? line : 0` og ThAD VAR
     AFTURFOR: `line = "2.5"` (tolu-STRENGUR, sem JSON getur vel borid) fell ur
     2,674 i 0,693, thvi `Number.isFinite("2.5")` er false. `Math.floor`
     thvingar strengi rett og ma thvi ekki hverfa. Med `Math.min(k, K_MAX)`
     helst NaN NaN, -1 helst -1, "2.5" helst 2 — og adeins ohemjan er klippt.

     20 ER RIFLEGT: haesta yfir/undir-lina i fotbolta er ~6,5 og
     deildarmedaltalid 2,9. Stadfest a 0,5..10,5 med 0,5-threpum x 7 likum
     (147 samanburdir): BITAEINS fyrir og eftir. Thetta er HENGI-VORN, ekki
     tolu-breyting.
     (data/odds.json var EKKI notad sem sonnun — hun geymir cs/xg/xga per lid,
     ekki `line`, svo "stadfest a raunlinum" hefdi verid tom fullyrding.)   */
  const K_MAX = 20;
  const kEff = Math.min(k, K_MAX);
  let lo = 0.1, hi = 8;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    let cum = 0, term = Math.exp(-m);
    for (let j = 0; j <= kEff; j++) { cum += term; term *= m / (j + 1); }
    (1 - cum < pOver) ? lo = m : hi = m;
  }
  return (lo + hi) / 2;
}

export function impliedProb(dec) { return dec > 0 ? 1 / dec : 0; }

export function devig2(o1, o2) {
  const a = impliedProb(o1), b = impliedProb(o2);
  return (a + b) ? a / (a + b) : 0.5;
}

export function devig(h, d, a) {
  const raw = [impliedProb(h), impliedProb(d), impliedProb(a)];
  const s = raw.reduce((x, y) => x + y, 0) || 1;
  return { home: raw[0] / s, draw: raw[1] / s, away: raw[2] / s };
}

export function splitGoals(total, hWin, aWin) {
  const hShare = Math.min(0.85, Math.max(0.15, 0.5 + (hWin - aWin) * 0.35));
  const home = total * hShare;
  return { home, away: total - home };
}

/* MARKAÐS-ÞYNGD á sama 1–5 kvarða sem framendinn notar.
   Mælt: 1,0 mark á sig ~ þyngd 2,0 · 2,0 ~ 4,0 (úr MEASURED-töflunni).
   ÞETTA ER VARNAR-STÆRÐIN: þyngd þess að halda hreinu blaði. Hún á við
   GK/DEF. Fyrir sóknarhópinn, sjá marketAttackDiff.                    */
/* KVORDUN ENDURFITTUD 29.7.2026: 1,00 + 1,55x -> 1,05 + 1,65x.
   Thetta voru "eftirstodvarnar" sem voru skjaladar i model.js og CLAUDE.md:
   markadslidurinn let MEASURED-tofluna lesa of BJARTSYNT. MARKET_CALIB
   (lambda-skolunin) var thegar rett — skekkjan var i thessu AFFINA falli,
   th.e. HVAR taflan er lesin, ekki i vaentu morkunum sjalfum.

   AF HVERJU THETTA VAR EKKI LAGAD ADUR: fyrra fittid lenti a JADRI gridsins
   (center 3,1 = jadar) og var thvi ekki traust. Nu er gridid BREITT
   (A 0,60-1,60 · B 1,00-2,40) og besta gildid er INNI i thvi, ekki a jadri.

   Fittad gegn RAUNVERULEGUM urslitum: Brier a birta CS%-inu
   (lookupPos(2,"cs",d)) gegn thvi hvort hreint blad vard, 11.400 lid-leikir
   med markadslinu, 15 timabil:
     kvordunarhalli   +0,89pp -> -0,71pp
     medalfravik      2,69pp  -> 1,75pp   (-35%)
     Brier            0,18534 -> 0,18495
   LOSO: A 0,95-1,10 · B 1,60-1,80 (thett), og 1,05/1,65 er jafnframt
   TIDASTA LOSO-valid. Brier batnar ut fyrir urtak i 12/15 timabilum.

   ADGREINING ER OHOGGUD OG THAD ER EKKI TILVILJUN: affin einhalla
   umbreyting breytir ENGRI rodun, svo r og AUC geta ekki haggast
   (maelt: r(d,ga) 0,39219 -> 0,39176; r(d,cs) -0,25919 -> -0,25991,
   fjordi tugstafur = numerisk rounding). Thetta er KVORDUN, ekki
   adgreining — sama tegund lagfaeringar sem SCALE_FIX var.
   Medal-d faerist 2,41 -> 2,55, sem er einmitt midja MEASURED-toflunnar.
   Klemma vid 5 bindur 0,87% af rodum (var 0,46%) — enn undir 1%.        */
export const MARKET_DIFF_A = 1.05;
export const MARKET_DIFF_B = 1.65;
export function marketDiff(expectedGoalsAgainst) {
  return Math.round(clampN(
    MARKET_DIFF_A + (expectedGoalsAgainst - 0.5) * MARKET_DIFF_B, 1, 5) * 100) / 100;
}

/* SÓKNAR-ÞYNGD ÚR MARKAÐNUM — þyngd þess að SKORA.
   AF HVERJU SÉR FALL: markaðsliðurinn gaf öllum stöðum marketDiff(xga),
   þ.e. þyngd þess að halda hreinu blaði. Fyrir miðjumann og framherja er
   það RANGA stærðin — hún mælir hvað mótherjinn skorar, ekki hvað liðið
   skorar. Rétta stærðin (eigin vænt mörk) var ÞEGAR í odds.json sem `xg`,
   ónotuð, því pipeline sækir totals+spreads.
   MÆLT á 6.080 lið-leikjum gegn mörkum SKORUÐUM: r −0,365 á móti −0,345
   með xga, og rétta stærðin slær hina í 8/8 tímabilum. Markaðs-xg eitt
   gefur −0,390 (tests/ffdr-walkforward.mjs).
   Fleiri vænt mörk = LÉTTARI leikur, svo stærðin er spegluð um
   deildarmeðaltalið og fer svo gegnum SÖMU línulegu umbreytingu — þannig
   liggur meðalleikur í 2,44 á báðum kvörðum og þeir eru samanburðarhæfir. */
export const LG_XG_MARKET = 1.45;      // deildarmeðaltal marka per lið-leik
export function marketAttackDiff(expectedGoalsFor) {
  return marketDiff(2 * LG_XG_MARKET - expectedGoalsFor);
}

/* ---- HEILDARUMBREYTINGIN: odds -> vænt mörk fyrir bæði lið ----
   Eitt fall svo pipeline og bakpróf geti ekki rekið í sundur. Tekur
   afvigtaðar 1X2-líkur, yfir/undir-línu + yfirlíkur, og valfrjálst
   asískt handicap (nákvæmara, notað þegar það er til).
   Skilar { hxg, axg, lambda, method }.                                  */
export function marketGoals({ pHome, pAway, line, pOver, ah = null }) {
  const lambda = lambdaFromOver(pOver, line) * MARKET_CALIB;
  let hxg, axg, method;
  if (ah != null && Number.isFinite(ah)) {
    hxg = (lambda - ah) / 2; axg = (lambda + ah) / 2;
    method = "totals+spreads";
  } else {
    const sp = splitGoals(lambda, pHome, pAway);
    hxg = sp.home; axg = sp.away; method = "totals+h2h";
  }
  return {
    hxg: Math.max(0.15, hxg),
    axg: Math.max(0.15, axg),
    lambda, method,
  };
}
