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

/* ---- LOKALÍNU-AÐFERÐIN (BAKPRÓFUÐ á 380 leikjum) ----
   1) Leysa væntanleg heildarmörk út úr yfir/undir-líkum með Poisson-inversion.
   2) Skipta þeim með handicap: heima = (λ − AH) / 2.  ATH FORMERKI:
      NEGATÍFT handicap = heimalið er favorít (staðfest á raungögnum).
   3) Kvarða −4,1% — líkanið mældist systematískt bjartsýnt.
   Markaðurinn mældist 1,3x betri en FDR (r 0,374 á móti 0,283).           */
export const MARKET_CALIB = 0.959;          // −4,1%

export function lambdaFromOver(pOver, line) {
  // finna λ þannig að P(X > line) = pOver  (Poisson)
  const k = Math.floor(line);        // t.d. 2 fyrir línuna 2,5
  let lo = 0.1, hi = 8;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    let cum = 0, term = Math.exp(-m);
    for (let j = 0; j <= k; j++) { cum += term; term *= m / (j + 1); }
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
   Mælt: 1,0 mark á sig ~ þyngd 2,0 · 2,0 ~ 4,0 (úr MEASURED-töflunni). */
export function marketDiff(expectedGoalsAgainst) {
  return Math.round(clampN(1.0 + (expectedGoalsAgainst - 0.5) * 1.55, 1, 5) * 100) / 100;
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
