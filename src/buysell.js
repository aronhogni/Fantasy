/* ============================================================
   KAUP- OG SOLU-LISTINN — RODUN I TIMA, ENGIN NY STIGA-FORMULA
   ============================================================
   Notandinn: „eg vill bua til BUY lista, thar sem eg stilli inn theim
   leikmonnum sem eg vill selja og tha sem eg vill kaupa ... eg vill svo
   ad appid reccomendi rettasta timann til ad gera breytinguna ... Rodum
   svo breytingum i retta rod eftir gameweek. (ATH ad stundum getur verid
   best ad gera enga breytingu i gameweek)."

   ThESSI SKRA BAETIR ENGRI STIGA-FORMULU VID OG MA ThAD EKKI.
   Vaent stig koma inn sem fallid `ep(id, gw)`, sem kallandinn byggir a
   `expPointsFor` — SAMI margfaldari og SAMA kvordun og vollurinn synir.
   Timasetningin ein kemur ur `swapTiming` (`src/swaptiming.js`), thar sem
   hun er maeld. Her er adeins thrennt sem hvorugt theirra gerir:

   1. PORUN. Skipti i FPL eru LIKT FYRIR LIKT — markmadur fyrir markmann.
      Par ur sitt hvorri stodu er ekki skipti sem haegt er ad framkvaema,
      svo tillaga um thad vaeri tillaga um ekkert. Stodan er thvi HART
      skilyrdi, ekki stuðull.
   2. RODUN I VIKUR. Eitt friskipti a viku thydir ad tvo skipti sem BADI
      vilja somu vikuna geta ekki bædi gerst frit. Sidara faerist, og
      thad er MERKT (`shifted`) — thogul faersla vaeri tillaga sem
      notandinn getur ekki rakid.
   3. ThOGN ER SVAR. `verdict: "weak"` (skiptin sjalf eru hlutkesti) og
      `verdict: "wait"` (vikan er rong) eru BADI birt sem nidurstada.
      Listi sem segir alltaf „gerdu eitthvad" er listi an upplysinga.

   ThRENNT SEM MA ALDREI FULLYRDA HER — arfur fra `swaptiming.js`:
   · ENGIN ORAKEL-TALA („besta vikan hefdi verid verd X" er 100% havadi).
   · `SWAP_TAU` er STILLING a thvi hve oft reglan talar, ekki maeling.
   · Maelingin ad baki keyrdi med `avail = 1`. Ad radid uppfaerist vid
     meidsli er eiginleiki `expPointsFor` og pipeline-unnar — ekki
     nidurstada sem var maeld hedan.
   ============================================================ */

import { swapTiming, SWAP_KMAX } from "./swaptiming.js";

/* Sjondeildarhringurinn. UI-AFMORKUN eins og verdthakid i `rotation.js`
   — ekkert i FFDR, `rankScore` ne vaentum stigum les thessa tolu.
   Hann verdur ad vera >= SWAP_KMAX + 2 svo „bida k vikur" eigi vikur
   eftir til ad borga sig i.                                          */
export const BS_HORIZON = 6;

/* ============================================================
   `ep` ER FALL, EKKI TAFLA — OG ThAD ER ASETT.
   Kallandinn a `expPointsFor` med sinum eigin `basisFor`, `fixDifficulty`
   og leikjaskra. Baeri thessi skra sina eigin toflu vaeru thad TVAER
   tolur undir einu heiti, nakvaemlega thad sem `buildTeamMetrics` var
   flutt ur App.jsx til ad hindra.
   ============================================================ */
function series(ep, id, gw, maxGw, horizon) {
  const out = [];
  for (let g = gw; g < gw + horizon && g <= maxGw; g++) {
    const v = ep(id, g);
    /* VANTANDI ER EKKI NULL. Ep sem skilar null/undefined ma ekki verda
       0 — 0 les eins og „hann faer engin stig thessa viku", sem er
       fullyrding um leikinn en ekki um gognin.                       */
    out.push(Number.isFinite(v) ? v : null);
  }
  return out;
}

/* Rod sem ber null er OVIS. `swapTiming` leggur saman, svo eitt null
   myndi hverfa i summunni og lita ut eins og nulltala.               */
const complete = a => Array.isArray(a) && a.length >= 2 && a.every(v => v != null);

export function planSwaps({ sells = [], buys = [], ep, gw, maxGw = 38,
                            freeTransfers = 1, horizon = BS_HORIZON } = {}) {
  if (typeof ep !== "function" || !Number.isFinite(gw)) return null;
  const sellList = sells.filter(p => p && p.id != null);
  const buyList = buys.filter(p => p && p.id != null);

  /* ---- 1. PORUN: stada er HART skilyrdi ---- */
  const pairs = [];
  const noMatch = { sell: [], buy: [] };
  for (const s of sellList) {
    for (const b of buyList) {
      if (s.pos !== b.pos) continue;
      const epOut = series(ep, s.id, gw, maxGw, horizon);
      const epIn = series(ep, b.id, gw, maxGw, horizon);
      if (!complete(epOut) || !complete(epIn)) {
        /* FAAR MAELINGAR -> ENGIN TALA. Par sem vantar gogn faer enga
           tillogu og er talid, ekki thagad i hel.                     */
        pairs.push({ outId: s.id, inId: b.id, pos: s.pos, timing: null,
                     net: null, why: "missingExpectedPoints" });
        continue;
      }
      const timing = swapTiming({ epOut, epIn, freeTransfers });
      pairs.push({ outId: s.id, inId: b.id, pos: s.pos, timing,
                   net: timing?.net ?? null, epOut, epIn,
                   why: timing?.why || null });
    }
  }
  for (const s of sellList) if (!buyList.some(b => b.pos === s.pos)) noMatch.sell.push(s.id);
  for (const b of buyList) if (!sellList.some(s => s.pos === b.pos)) noMatch.buy.push(b.id);

  /* ---- 2. VAL: haesta netto fyrst, hver madur adeins einu sinni ----
     Grædgi, ekki hamorkun. Fullkomin porun (ungverska adferdin) vaeri
     retta svarid vid annarri spurningu — hun myndi para SAMAN par sem
     notandinn skildi ekki, thvi hun ma faera EITT par nidur til ad lyfta
     odru. Listinn er lesinn af manni og verdur ad vera rekjanlegur.  */
  const usable = pairs.filter(p => p.timing && p.net != null)
    .sort((a, b) => b.net - a.net);
  const takenOut = new Set(), takenIn = new Set();
  const chosen = [];
  for (const p of usable) {
    if (takenOut.has(p.outId) || takenIn.has(p.inId)) continue;
    takenOut.add(p.outId); takenIn.add(p.inId);
    chosen.push(p);
  }

  /* ---- 3. RODUN I VIKUR ----
     Skipti sem reglan segir „bida k vikur" vill viku gw+k; „nuna" vill
     gw. Tvo skipti geta ekki bædi verid frit i somu viku (eitt friskipti
     a viku), svo thad sidara faerist — og faerslan er MERKT.
     VEIK SKIPTI FA ENGA VIKU. Thau eru ekki „seinna", their eru
     „kannski ekki thess virdi", og ad setja thau i rod vaeri ad
     breyta thogn i tillogu.                                          */
  const scheduled = [];
  const used = new Set();
  const wants = chosen.filter(p => p.timing.verdict !== "weak")
    .map(p => ({ ...p, want: gw + (p.timing.k || 0) }))
    .sort((a, b) => a.want - b.want || b.net - a.net);
  for (const p of wants) {
    let wk = p.want;
    while (used.has(wk) && wk <= maxGw) wk++;
    if (wk > maxGw) { scheduled.push({ ...p, week: null, shifted: false, noRoom: true }); continue; }
    used.add(wk);
    scheduled.push({ ...p, week: wk, shifted: wk !== p.want, noRoom: false });
  }
  const weak = chosen.filter(p => p.timing.verdict === "weak");

  return {
    gw, horizon, freeTransfers, kmax: SWAP_KMAX,
    moves: scheduled.sort((a, b) => (a.week ?? 99) - (b.week ?? 99)),
    weak,
    noMatch,
    /* Por sem attu enga tolu — talid, ekki thagad. */
    unknown: pairs.filter(p => !p.timing).length,
  };
}
