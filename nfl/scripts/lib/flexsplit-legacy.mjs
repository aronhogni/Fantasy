/* ============================================================
   flexsplit-legacy.mjs — HEGDUNIN SEM VAR, GEYMD SVO MAELINGIN SE
   ENDURGERANLEG. ÞETTA ER EKKI KODI SEM MA FARA I LOFTID.

   Fram til 14.8.2026 uthlutadi `replacementRanks` (`src/model.js`)
   flex-saetum med `Math.round` PER STODU og hunsadi `league.flexPos`.
   Hvorttveggja er lagfaert thar nuna (Hamilton + `flexPos` virt).

   HVERS VEGNA GAMLA HEGDUNIN ER GEYMD I STAD THESS AD VERA EYDD:
   spurningin "hreyfdist bordid?" er ekki svaranleg eftir a nema BADIR
   armarnir seu til. Var thessi skra eytt gaeti `flexsplit-lab.mjs`
   adeins borid nuverandi kodann vid sjalfan sig — rho 1,000, sem lesst
   eins og "engin breyting" af rangri astaedu. Sama rok og
   `data/predictions/` i FPL-verkefninu: **inntakid verdur ekki til
   eftir a.**

   VORDUR: `tests/model.mjs` kafli 8b fellur ef nokkud i `src/`
   flytur thessa skra inn. Hun ma adeins vera lesin af maelingum.
   ============================================================ */

import { FLEX_SPLIT, SUPERFLEX_SPLIT } from "../../src/model.js";

/**
 * NAKVAEMLEGA thad sem stod i `src/model.js` fyrir 14.8.2026 — afritad
 * ord fyrir ord, ekki endurskrifad ur minni. `FLEX_SPLIT` og
 * `SUPERFLEX_SPLIT` eru flutt inn ur `src/model.js` thvi thau eru
 * OBREYTT af lagfaeringunni; thad sem breyttist var namundunin.
 *
 * Vaeru thau afritud hingad gaeti maelingin borid gamla namundun a
 * gamlar hlutfallstolur vid nyja namundun a NYJUM hlutfallstolum og
 * kallad muninn namundun.
 */
export function replacementRanksLegacy(league) {
  const t = league.teams || 12;
  const st = league.starters || { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 };
  const flex = (st.FLEX || 0) * t;
  const sflex = ((st.SUPERFLEX || 0) || (league.superflex ? 1 : 0)) * t;
  const out = {};
  for (const pos of ["QB", "RB", "WR", "TE", "K", "DST"]) {
    const base = (st[pos] || 0) * t;
    const extra = FLEX_SPLIT[pos] ? Math.round(flex * FLEX_SPLIT[pos]) : 0;
    const sExtra = SUPERFLEX_SPLIT[pos] ? Math.round(sflex * SUPERFLEX_SPLIT[pos]) : 0;
    out[pos] = base + extra + sExtra;
  }
  return out;
}
