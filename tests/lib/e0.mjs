/* ============================================================
   E0.MJS — SÖGULEG ENDURUPPBYGGING fyrir bakprófin

   Bæði ffdr-backtest.mjs (eitt tímabil, litirnir) og
   ffdr-walkforward.mjs (átta tímabil, mælingin) byggja spá-heiminn
   úr data/fdcouk/E0-*.json. Sú uppbygging á AÐEINS að vera á einum
   stað — annars getur eitt bakpróf mælt annan heim en hitt og bæði
   virst græn á meðan þau eru ósamanburðarhæf.

   REGLAN SEM ALLT HVÍLIR Á: ekkert leki. Spá fyrir tímabil S má
   aðeins sjá tímabil < S (liðsstyrkur, Elo) og upplýsingar sem voru
   til FYRIR leikinn (bókmakaralínan). Aldrei úrslit sama tímabils.
   ============================================================ */
import { readFileSync } from "node:fs";
import { marketGoals, marketDiff, devig, devig2 } from "../../src/market.js";

const D = new URL("../../data/", import.meta.url).pathname;

/* Tímabilin í tímaröð. Fyrsta er aðeins STYRK-heimild (það er ekkert
   tímabil á undan því til að spá því með), svo 11 tímabil = 10 spáð.
   1516 og 1617 voru bætt við 28.7.2026 til að fá 10 spáð tímabil;
   leikjatölur (skot á mark) eru til frá 1516 svo styrkur er heill. */
export const SEASONS = ["1516", "1617", "1718", "1819", "1920", "2021",
                        "2122", "2223", "2324", "2425", "2526"];

/* RAUNVERULEGT FPL-FDR per leik, sótt af scripts/fetch-fdr-history.mjs.
   Til frá 1819. Lykill: "HomeTeam|AwayTeam" -> [h_diff, a_diff].
   Notaðu ALLTAF þetta þegar það er til; fdrApprox er neyðarlausn.      */
let _fdrHist = null;
export function realFdr(seasonKey) {
  if (_fdrHist === null) {
    try { _fdrHist = JSON.parse(readFileSync(`${D}fpl_fdr_history.json`, "utf8")).seasons; }
    catch { _fdrHist = {}; }
  }
  const s = _fdrHist[seasonKey];
  if (!s) return null;
  return (homeTeam, awayTeam) => s[`${homeTeam}|${awayTeam}`] || null;
}

/* BESTA FÁANLEGA FDR fyrir tímabil — EINN staður svo bakprófin geti ekki
   notað sitt hvora heimildina. Opinbert þegar það er til (1819+), annars
   nálgun. `source` er skilað með svo útprent geti merkt hvort er hvað.  */
export function fdrFor(seasonKey, prevRows) {
  const real = realFdr(seasonKey);
  const approx = fdrApprox(prevRows);
  return {
    source: real ? "opinbert" : "nálgað",
    real: !!real,
    /* Skilar { h, a } — FDR heimaliðs og útiliðs fyrir þennan leik. */
    forFixture(homeTeam, awayTeam) {
      const p = real && real(homeTeam, awayTeam);
      return p ? { h: p[0], a: p[1], real: true }
               : { h: approx(awayTeam), a: approx(homeTeam), real: false };
    },
  };
}

export const loadSeason = key =>
  JSON.parse(readFileSync(`${D}fdcouk/E0-${key}.json`, "utf8")).rows;

/* ---------- LIÐSSTYRKUR úr loknu tímabili ----------
   Sömu fjórar tölur sem App.jsx setur í teamMetrics úr team_form.json:
   mörk/leik, mörk á sig/leik, skot á mark fyrir/á sig per leik.        */
export function buildStrength(rows) {
  const agg = {};
  for (const r of rows) {
    for (const [team, gf, ga, sot, sotAg] of [
      [r.HomeTeam, +r.FTHG, +r.FTAG, +(r.HST || 0), +(r.AST || 0)],
      [r.AwayTeam, +r.FTAG, +r.FTHG, +(r.AST || 0), +(r.HST || 0)],
    ]) {
      const a = agg[team] = agg[team] || { g: 0, c: 0, sf: 0, sa: 0, n: 0 };
      a.g += gf; a.c += ga; a.sf += sot; a.sa += sotAg; a.n++;
    }
  }
  const out = {};
  for (const [t, a] of Object.entries(agg)) {
    out[t] = { xg90: a.g / a.n, xgc90: a.c / a.n, sotFor: a.sf / a.n, sotAg: a.sa / a.n };
  }
  return out;
}

/* NÝLIÐAR: appið hefur enga PL-sögu fyrir þá. Ef promoted_baseline.json
   nær ekki til þeirra fer það í `src: "default"` (App.jsx:835) sem setur
   xg90=1,1 og xgc90=1,6 og LÆTUR sot VERA null — þá sleppir FFDR
   sot-liðnum alveg. Við speglum það nákvæmlega, sot=null þar með.      */
export const PROMO_DEFAULT = { xg90: 1.1, xgc90: 1.6, sotFor: null, sotAg: null };

/* ---------- FDR-NÁLGUN ----------
   FPL-FDR er ekki til sögulega. Það er í reynd gróf röðun mótherja, svo
   við nálgum það með röðun stiga mótherjans í FYRRA tímabili.
   FPL notar nær aldrei 1, svo skalinn er 2–5.

   KVARÐAÐ 2026-07-27 gegn RAUNVERULEGU FPL-FDR í data/fixtures.json
   (760 lið-leikir 2026/27): 5 -> 5,0% · 4 -> 22,5% · 3 -> 45,0% · 2 -> 27,5%,
   meðaltal 3,050. Gömlu mörkin (4/4/6/6 lið) gáfu 20% fimmur og meðaltal
   3,300 — 0,25 ÞYNGRI en FPL. Með fdr-vog 0,45 skekkti það allan
   líkanskjarna bakprófsins um ~0,11 í átt að of þungu og gerði
   kvörðunarmælingar ómarktækar. Nú: 1 lið fær 5, næstu 5 fá 4, næstu 9
   fá 3, síðustu 5 fá 2 -> 5% / 25% / 45% / 25%, meðaltal ~3,05.
   Vörður: tests/ffdr-walkforward.mjs krefst þess að jaðardreifingin
   haldist innan 0,1 frá FPL-meðaltalinu.                               */
export function fdrApprox(prevRows) {
  const pts = {};
  for (const r of prevRows) {
    const res = r.FTR;
    pts[r.HomeTeam] = (pts[r.HomeTeam] || 0) + (res === "H" ? 3 : res === "D" ? 1 : 0);
    pts[r.AwayTeam] = (pts[r.AwayTeam] || 0) + (res === "A" ? 3 : res === "D" ? 1 : 0);
  }
  const ranked = Object.entries(pts).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  return opp => {
    const i = ranked.indexOf(opp);
    if (i < 0) return 2;                                  // nýliði = léttur, eins og FPL gerir
    return i < 1 ? 5 : i < 6 ? 4 : i < 15 ? 3 : 2;
  };
}

/* ---------- BÓKMAKARALÍNAN úr E0-dálkum ----------
   Dálkanöfnin breytast milli tímabila (Betbrain-meðaltöl fyrir 2019,
   B365/Avg eftir það), svo hver tala er sótt með fallröð. Þetta eru
   FYRIR-LEIK odds — engin lekavandamál.
   Skilar { hDiff, aDiff, hxg, axg } eða null ef línan vantar.
   hDiff = markaðsþyngd HEIMALIÐSINS (byggð á væntum mörkum mótherjans). */
const pick = (r, keys) => {
  for (const k of keys) {
    const v = +r[k];
    if (r[k] != null && r[k] !== "" && Number.isFinite(v)) return v;
  }
  return null;
};
export function marketForRow(r) {
  const h = pick(r, ["B365H", "PSH", "AvgH", "BbAvH", "WHH"]);
  const d = pick(r, ["B365D", "PSD", "AvgD", "BbAvD", "WHD"]);
  const a = pick(r, ["B365A", "PSA", "AvgA", "BbAvA", "WHA"]);
  const over = pick(r, ["B365>2.5", "Avg>2.5", "P>2.5", "BbAv>2.5"]);
  const under = pick(r, ["B365<2.5", "Avg<2.5", "P<2.5", "BbAv<2.5"]);
  const ah = pick(r, ["AHh", "BbAHh", "AHCh"]);
  if (!h || !d || !a || !over || !under) return null;
  const p = devig(h, d, a);
  const pOver = devig2(over, under);
  const { hxg, axg } = marketGoals({
    pHome: p.home, pAway: p.away, line: 2.5, pOver,
    ah: ah != null ? ah : null,
  });
  // Þyngd liðsins byggist á væntum mörkum MÓTHERJANS (hreint blað er útkoman)
  return { hDiff: marketDiff(axg), aDiff: marketDiff(hxg), hxg, axg };
}

/* ---------- ELO WALK-FORWARD ----------
   ClubElo-tölur eru aðeins til fyrir NÚNA (data/elo.json), svo sögulegt
   Elo er reiknað hér úr úrslitum — en AÐEINS úr leikjum sem búnir voru
   fyrir hvern leik (fyrir-leik Elo, ekkert leki).

   KVÖRÐUN: FFDR notar ELO_SCALE=150 á ClubElo-kvarða, þar sem PL-liðin
   liggja um meðaltal 1819 með staðalfráviki ~115 (mælt úr data/elo.json
   2026-07). Hrátt 400-logistic Elo með K=20 gefur mun þéttari dreifingu,
   svo elo-liðurinn yrði ranglega dempaður. Því er hvert tímabil AFFINT
   kvarðað í sama meðaltal/staðalfrávik. Röðunin haggast ekki; aðeins
   bilin verða sambærileg því sem appið sér.

   Þetta er NÁLGUN á ClubElo, ekki ClubElo — merkt sem slíkt í útprenti. */
export const CLUBELO_MEAN = 1819;
export const CLUBELO_SD = 115;

export function eloWalkForward(seasons, { K = 20, hfa = 60, carry = 0.8, entry = 1420 } = {}) {
  const rating = {};
  const pre = new Map();          // `${seasonKey}|${idx}` -> { h, a } (kvarðað)
  for (const { key, rows } of seasons) {
    // Tímabilaskil: dragðu að meðaltali (nýtt tímabil, ný lið)
    for (const t of Object.keys(rating)) rating[t] = 1500 + (rating[t] - 1500) * carry;
    for (const r of rows) {
      if (rating[r.HomeTeam] == null) rating[r.HomeTeam] = entry;
      if (rating[r.AwayTeam] == null) rating[r.AwayTeam] = entry;
    }
    // Kvörðunin miðast við stöðuna í BYRJUN tímabils (það sem appið hefði séð)
    const at0 = rows.flatMap(r => [r.HomeTeam, r.AwayTeam]);
    const teamsIn = [...new Set(at0)];
    const vals = teamsIn.map(t => rating[t]);
    const mu = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mu) ** 2, 0) / vals.length) || 1;
    const scale = v => CLUBELO_MEAN + (v - mu) / sd * CLUBELO_SD;

    rows.forEach((r, i) => {
      const H = rating[r.HomeTeam], A = rating[r.AwayTeam];
      pre.set(`${key}|${i}`, { h: scale(H), a: scale(A) });
      // uppfærsla EFTIR að spáin var skráð
      const exp = 1 / (1 + 10 ** ((A - (H + hfa)) / 400));
      const s = r.FTR === "H" ? 1 : r.FTR === "D" ? 0.5 : 0;
      rating[r.HomeTeam] = H + K * (s - exp);
      rating[r.AwayTeam] = A + K * ((1 - s) - (1 - exp));
    });
  }
  return pre;
}

/* ---------- TÖLFRÆÐI ---------- */
export function corr(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
}
/* Fisher-z staðalfrávik á r — til að segja hvort tveir r séu í raun ólíkir */
export const rSE = n => 1 / Math.sqrt(n - 3);
export const fisherZ = r => 0.5 * Math.log((1 + r) / (1 - r));

/* Brier: meðaltal (spáð líkindi − raun)². Lægra er betra.
   Brier SKILL = 1 − brier/brier_grunnlínu; >0 þýðir betra en grunnlínan. */
export const brier = (ps, ys) => ps.reduce((a, p, i) => a + (p - ys[i]) ** 2, 0) / ps.length;
