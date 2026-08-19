/* ============================================================
   learn.js — HREIN tolfraedi. Ekkert React, engin gogn, engin netkoll.
   Notad af `scripts/model-lab.mjs` og profad beint.

   HVERS VEGNA EIGIN RIDGE EN EKKI SAFN: verkefnid ber engar
   dependencies umfram React og Vite, og ad baeta vid einu til ad
   leysa 12x12 jofnuhneppi vaeri ovarlegt. Staerdirnar hér eru
   smaar (p <= 20, n ~ 3.000) og venjulegar normaljofnur duga.

   RIDGE EN EKKI VENJULEG AFTURHVARF af tveimur astaedum sem baðar
   skipta mali i thessu gagnasetti:
   1. Breyturnar eru MJOG SAMFYLGNI (sendingar a mann, sendingahlutfall
      og WOPR maela naerri thvi sama). Venjuleg afturhvarf gefur tha
      risavaxna og andstaeda studla sem lita ut eins og innsyn en eru
      hreinn havadi.
   2. Urtakid per stodu er ~500-900 radir. Med 12+ breytum er
      offitting raunveruleg haetta og lambda er vornin.
   ============================================================ */

/* ---------- linuleg algebra ---------- */

/** Leysir A x = b med Gauss-eydingu og hlutasnuningi. A er n x n. */
export function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12) return null;      // sinngult
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (!f) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/* ---------- stodlun ---------- */

/**
 * Stadlar dalka i 0 medaltal og 1 stadalfravik.
 * VANTANDI GILDI eru sett i MEDALTAL DALKSINS **og merkt i eigin
 * vitisbreytu**. Ad setja thau i 0 eftir stodlun vaeri ad segja
 * "medalgildi", sem er akvedin fullyrding; vitisbreytan leyfir
 * likaninu ad laera hvort thad ad VANTA se sjalft merki (t.d. nyliði
 * an fyrra timabils).
 */
export function standardize(rows, cols) {
  const stats = cols.map((c) => {
    const vals = rows.map((r) => r[c]).filter((v) => v != null && Number.isFinite(v));
    const m = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const sd = vals.length > 1
      ? Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / (vals.length - 1)) : 1;
    return { col: c, mean: m, sd: sd > 1e-9 ? sd : 1 };
  });
  return stats;
}

export function designMatrix(rows, cols, stats, { missingFlags = true } = {}) {
  const X = [];
  for (const r of rows) {
    const row = [];
    for (let i = 0; i < cols.length; i++) {
      const v = r[cols[i]];
      const ok = v != null && Number.isFinite(v);
      row.push(ok ? (v - stats[i].mean) / stats[i].sd : 0);
    }
    if (missingFlags) {
      for (const c of cols) {
        const v = r[c];
        row.push(v != null && Number.isFinite(v) ? 0 : 1);
      }
    }
    X.push(row);
  }
  return X;
}

/* ---------- ridge ---------- */

/**
 * Fittar ridge: beta = (X'X + lambda I)^-1 X'y.
 * `X` er thegar stadlad; skurdpunktur er MEDALTAL `y` (ekki
 * refsad, eins og vera ber).
 */
export function ridgeFit(X, y, lambda) {
  const n = X.length, p = X[0].length;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const yc = y.map((v) => v - yMean);

  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    const xi = X[i];
    for (let a = 0; a < p; a++) {
      Xty[a] += xi[a] * yc[i];
      for (let b = a; b < p; b++) XtX[a][b] += xi[a] * xi[b];
    }
  }
  for (let a = 0; a < p; a++) {
    for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
    XtX[a][a] += lambda;
  }
  const beta = solve(XtX, Xty);
  return beta ? { beta, intercept: yMean } : null;
}

export function ridgePredict(model, X) {
  return X.map((xi) => model.intercept +
    xi.reduce((a, v, j) => a + v * model.beta[j], 0));
}

/**
 * Velur `lambda` med K-faldri krossprofun INNAN thjalfunargagnanna.
 * ALDREI a profgognunum — thad vaeri leki og likanid liti betur ut
 * en thad er.
 */
export function pickLambda(X, y, grid = [0.1, 1, 3, 10, 30, 100, 300, 1000], K = 5) {
  const n = X.length;
  const fold = new Array(n);
  for (let i = 0; i < n; i++) fold[i] = i % K;      // deterministiskt
  let best = grid[0], bestErr = Infinity;
  for (const lam of grid) {
    let sse = 0, cnt = 0;
    for (let k = 0; k < K; k++) {
      const Xtr = [], ytr = [], Xte = [], yte = [];
      for (let i = 0; i < n; i++) {
        if (fold[i] === k) { Xte.push(X[i]); yte.push(y[i]); }
        else { Xtr.push(X[i]); ytr.push(y[i]); }
      }
      if (Xtr.length < 20 || !Xte.length) continue;
      const m = ridgeFit(Xtr, ytr, lam);
      if (!m) continue;
      const pred = ridgePredict(m, Xte);
      for (let i = 0; i < yte.length; i++) { sse += (pred[i] - yte[i]) ** 2; cnt++; }
    }
    if (cnt && sse / cnt < bestErr) { bestErr = sse / cnt; best = lam; }
  }
  return best;
}

/* ---------- maelikvardar ---------- */

export function spearman(pred, actual) {
  const n = pred.length;
  if (n < 3) return null;
  const rp = rankArray(pred), ra = rankArray(actual);
  const mp = mean(rp), ma = mean(ra);
  let num = 0, dp = 0, da = 0;
  for (let i = 0; i < n; i++) {
    const a = rp[i] - mp, b = ra[i] - ma;
    num += a * b; dp += a * a; da += b * b;
  }
  return dp && da ? num / Math.sqrt(dp * da) : null;
}

export function rankArray(xs) {
  const idx = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(xs.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k][1]] = r;
    i = j + 1;
  }
  return out;
}

/* ============================================================
   TOM ROD SKILAR `null`, EKKI `0` — LAGFAERT 18.8.2026
   ============================================================
   Her stod `xs.reduce((a,b) => a+b, 0) / (xs.length || 1)`. Deilingin
   med `|| 1` gerdi `mean([])` ad **0**, svo MAELING A ENGU birtist sem
   `0.000`. Thad er grunnregla repo-sins brotin i `src/` sjalfu: "omaeld
   tala sem litur ut eins og maeling er versta utkoman — hun er rong OG
   truverdug." `scripts/h2h-lab.mjs` (bootZero) hafdi thegar SKRIFAD
   thennan varnagla i athugasemd og vardist honum sjalft; hinar 38
   labs-skriftur gerdu thad ekki.

   HVERS VEGNA THETTA VAR OHAETT AD BREYTA — TVENNT MAELT, EKKI AGISKAD:

   1. `mean` ER EKKI A APP-LEIDINNI. `src/` flytur adeins `spearman` inn
      (`accuracy.js`), og `spearman` skilar `null` vid n < 3 svo `mean`
      faer thar aldrei toma rod. Ekkert i `src/*.jsx` les hana. Null gat
      thvi ekki radad a skja sem `NaN`.
   2. INSTRUMENTED KEYRSLA A LABS-SKRIFTUNUM: `mean` var latin skrifa
      stakkspor i hvert skipti sem hun fekk toma rod og OLL labs-skriftin
      keyrd a raungognum i `nfl/data/`. **NULL HIT.** Enginn kallandi
      naer thvi tilfellinu i dag; breytingin er vorn framvirkt, ekki
      lagfaering a tolu sem er birt nuna.

   OG NULL VAR EKKI NOG EITT SER — HER ER GILDRAN SEM `null` OPNAR:
   `null` er 0 i reikningi (`null + 5 === 5`, `Math.sqrt(null) === 0`).

   AFLEIDDU FOLLIN ERU THVI **OSAMHVERF**, og thad var MAELT med
   stokkbreytingu, ekki alyktad:
     · `mae` ERFIR nullid. `[].map(f)` er `[]`, svo `mae([], [])` er
       `mean([])` er `null` — an nokkurs hlids. Stokkbreyting sem TOK
       HLIDID UT felldi ENGA fullyrdingu, sem er rett: thad var ekki
       vordur heldur endursogn.
     · `rmse` ERFIR ThAD EKKI. `Math.sqrt(null)` er **0**, svo an eigin
       hlids hefdi `rmse([], [])` haldid afram ad skila 0 — sem les eins
       og FULLKOMIN SPA og er thvi VERRI lygi en 0-medaltalid sem var
       verid ad fjarlaegja.
   Hlidin sem eftir stada bera thvi bædi vinnu: thau na TOMU RODINNI hja
   `rmse` og ONYTU GERDINNI (`null`, hlutur) hja badum, thar sem `.map`
   hefdi kastad. Bædi tilfellin eru profud berum ordum i
   `tests/learn.mjs` kafla 3b — annars vaeri hlidid enn endursogn.

   KALLENDUR SEM MYNDU NU HRYNJA I STAD THESS AD LJUGA voru hliddir a
   notkunarstad (`fmt` i `market-lab.mjs` og `startsit-lab.mjs`) — texti
   sem segir "—" er rettur, `TypeError` i lok 20-minutna keyrslu er thad
   ekki.

   HER STOD "taldir upp TAEMANDI ... fjorar linur i tveimur skriftum".
   **THAD VAR RANGT OG ORDID "TAEMANDI" ER ASTAEDAN FYRIR THVI AD THAD
   LIFDI** (uttekt 19.8.2026 fann thad): `scripts/advice-lab.mjs` flytur
   `mean` inn ur thessari skra og bar THRJA kallstadi til, thar af
   `mean(ys.map(...)).toFixed(1)` sem KASTAR thegar oll ar hoppa yfir
   fjogur `continue`-hlidin. Stadfest med stokkbreytingu: an hlidsins
   `TypeError` i linu 124, med thvi prosa og exit 0.

   LAERDOMURINN ER ALMENNUR OG HANN ER UM ORDALAGID: "taemandi" er
   fullyrding sem ekkert prof les, svo hun eldist eins og homurud tala.
   Retta formid er skonnun sem FELLUR — og hun er nu til fyrir
   birtingarlagid (`tests/learn.mjs` skannar `src/` og fellur ef nokkur
   skra thar flytur inn `mean`/`mae`/`rmse`). **Skriftur i `scripts/` eru
   VILJANDI utan thess vardar**: thar ER null rett svar og hlidid a ad
   liggja a notkunarstad, sem er einmitt thad sem var gert hér.

   AFLEIDDU FOLLIN ERU OLL THEGAR HLIDD og thad var athugad hvert fyrir
   sig: `spearman` (n < 3 -> null), `hitRate` (n*1,5 -> null),
   `bootstrapDiff` (< 3 timabil -> null), `standardize` (`vals.length`
   berum ordum). Eina afleidda fallid sem *notar* `mae` (`model-lab.mjs`)
   er hliðad a `te.length < 12` og rundar med null-oruggu `r2`.
   ============================================================ */
export const mean = (xs) => {
  const n = Array.isArray(xs) ? xs.length : 0;
  return n ? xs.reduce((a, b) => a + b, 0) / n : null;
};

export function mae(pred, actual) {
  if (!Array.isArray(pred) || !pred.length) return null;
  return mean(pred.map((p, i) => Math.abs(p - actual[i])));
}

export function rmse(pred, actual) {
  /* HLIDID ER HER, EKKI I `mean`. `Math.sqrt(null)` er 0 — an thessarar
     linu hefdi "engin maeling" lesist sem ferskekkja 0. */
  if (!Array.isArray(pred) || !pred.length) return null;
  return Math.sqrt(mean(pred.map((p, i) => (p - actual[i]) ** 2)));
}

/**
 * Hlutfall theirra sem likanid setti i topp-N og enduðu i topp-N.
 * Reiknad INNAN STODU — thvert a stodur er thad ekki spurning sem
 * neinn spyr.
 */
export function hitRate(pred, actual, n) {
  if (pred.length < n * 1.5) return null;
  const byPred = pred.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0])
    .slice(0, n).map(([, i]) => i);
  const byAct = actual.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0])
    .slice(0, n).map(([, i]) => i);
  const s = new Set(byAct);
  return byPred.filter((i) => s.has(i)).length / n;
}

/**
 * BOOTSTRAP-VIKMORK a mun tveggja likana, KLOSAD PER TIMABIL.
 * Klosun skiptir ollu: radir innan sama ars eru EKKI ohadar (sama
 * deild, somu adstaedur), og ad bootstrappa radir hverja fyrir sig
 * gaefi allt of throng vikmork — tala sem segdi "marktaekt" thegar
 * urtakid er i raun 11 ar, ekki 3.722 radir.
 */
export function bootstrapDiff(perSeasonA, perSeasonB, runs = 2000, seed = 12345) {
  const years = Object.keys(perSeasonA).filter((y) => y in perSeasonB);
  if (years.length < 3) return null;
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const diffs = [];
  for (let r = 0; r < runs; r++) {
    let sum = 0;
    for (let i = 0; i < years.length; i++) {
      const y = years[Math.floor(rnd() * years.length)];
      sum += perSeasonA[y] - perSeasonB[y];
    }
    diffs.push(sum / years.length);
  }
  diffs.sort((a, b) => a - b);
  const point = mean(years.map((y) => perSeasonA[y] - perSeasonB[y]));
  return {
    diff: point,
    lo: diffs[Math.floor(runs * 0.025)],
    hi: diffs[Math.floor(runs * 0.975)],
    /* Marktaekt = vikmorkin utiloka null. Sama krafa og
       `mo-candidates.mjs` gerir i FPL-verkefninu. */
    excludesZero: diffs[Math.floor(runs * 0.025)] > 0 ||
                  diffs[Math.floor(runs * 0.975)] < 0,
  };
}
