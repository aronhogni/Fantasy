/* ============================================================
   HREINT BLAÐ (CS%) — MÁ SPÁ ÞVÍ BETUR EN VIÐ GERUM NÚNA?

   NÚVERANDI LEIÐ: FFDR þjappar öllum inntökum í EINA tölu á 1–5 kvarða,
   og sú tala er lesin upp í MEASURED_POS-töflunni -> CS%. Það er tvöföld
   þjöppun: (a) mörg inntök -> eitt d, (b) d -> tafla með 5 punktum.
   Hvort tveggja hendir upplýsingum sem eru til.

   TILLAGA SEM ER MÆLD HÉR: spá mörkum á sig sem TALNINGU með Poisson-
   aðhvarfi á inntökin sjálf, og fá CS út úr því sem P(0) = e^-λ.
   Þrír kostir, allir mælanlegir:
     1. Poisson-líkindi nota FULLA talninguna (0,1,2,3 mörk), ekki bara
        tvíkosta "hélt/hélt ekki" — meiri upplýsingar í hverri röð.
     2. Engin 5-punkta tafla og engin 1–5 þjöppun.
     3. CS = e^-λ er RÉTT líkindaform fyrir "ekkert mark", svo kvörðun
        kemur frítt í stað þess að þurfa SCALE_FIX.

   ALLT LOSO-KROSSPRÓFAÐ (fitta 13 tímabil, mæla á því 14.) og ENGIN
   INNTÖK ÚR FRAMTÍÐINNI: liðsstyrkur úr fyrra tímabili, Elo úr loknum
   leikjum, markaðslína fyrir-leik, opinbert FPL-FDR.

   VIÐMIÐ sem þarf að slá:  Brier grunnhlutfalls · núverandi FFDR-leið ·
   markaðurinn beint (e^-xga).
   ============================================================ */
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloWalkForward, brier, corr,
} from "./lib/e0.mjs";
import { makeFixDifficulty, lookupPos, LG_XG, LG_SOT } from "../src/model.js";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

/* ---------- 1. Byggja fylki af inntökum + útkomu ---------- */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const eloPre = eloWalkForward(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const PRED = SEASONS.slice(1);
const rows = [];
for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prev = byKey[SEASONS[si - 1]], list = byKey[key];
  const FDR = fdrFor(key, prev), strength = buildStrength(prev);
  const teams = [...new Set(list.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  for (const t of teams) if (!strength[t]) strength[t] = { ...PROMO_DEFAULT };
  const ids = {}; let n = 1;
  for (const t of teams) ids[t] = n++;
  const tm = {}, tb = {}, eb = {};
  for (const t of teams) { tm[ids[t]] = strength[t]; tb[ids[t]] = { short: t }; }
  list.forEach((r, i) => {
    const H = ids[r.HomeTeam], A = ids[r.AwayTeam], e = eloPre.get(`${key}|${i}`);
    eb[H] = { elo: e.h }; eb[A] = { elo: e.a };
    const mk = marketForRow(r), kickoff = `${r.Date}T00:00:00Z`;
    const odds = mk ? {
      [r.HomeTeam]: { xga: mk.axg, xg: mk.hxg, opp: r.AwayTeam, kickoff },
      [r.AwayTeam]: { xga: mk.hxg, xg: mk.axg, opp: r.HomeTeam, kickoff },
    } : null;
    const f = makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds, eloByTeam: eb });
    const p = FDR.forFixture(r.HomeTeam, r.AwayTeam);
    for (const [team, opTeam, op, home, fdr, gc, mktXga] of [
      [r.HomeTeam, r.AwayTeam, A, true, p.h, +r.FTAG, mk?.axg],
      [r.AwayTeam, r.HomeTeam, H, false, p.a, +r.FTHG, mk?.hxg],
    ]) {
      const me = ids[team];
      const S = strength[team], O = strength[opTeam];
      rows.push({
        season: key, realFdr: p.real, gc, cs: gc === 0,
        dDef: f(me, { opp: op, home, fdr, kickoff }, 2),
        /* HRÁ INNTÖK — ekki þjappað í eina tölu */
        ownXgc: S.xgc90, oppXg: O.xg90,
        ownSotAg: S.sotAg ?? LG_SOT, oppSotFor: O.sotFor ?? LG_SOT,
        home: home ? 1 : 0, fdr,
        eloDiff: ((home ? e.a : e.h) - (home ? e.h : e.a)) / 100,   // mótherji − ég
        mktXga: mktXga ?? null,
      });
    }
  });
}
console.log(`\n${"=".repeat(76)}`);
console.log(`CS%-LÍKAN — ${rows.length} lið-leikir, ${PRED.length} spáð tímabil`);
console.log("=".repeat(76));
const baseRate = rows.filter(r => r.cs).length / rows.length;
console.log(`raunverulegt CS-hlutfall: ${(100 * baseRate).toFixed(1)}%  ·  mörk á sig/leik: ${mean(rows.map(r => r.gc)).toFixed(3)}`);

/* ---------- 2. Poisson-aðhvarf með log-hlekk: λ = exp(β·x) ----------
   Fittað með halla-lækkun á log-líkindum Poisson. Talningin (gc) er
   markmiðið, EKKI tvíkosta cs — hún hefur meiri upplýsingar per röð.  */
function fitPoisson(train, feats, { iters = 400, lr = 0.06 } = {}) {
  const X = train.map(r => [1, ...feats.map(f => f(r))]);
  const y = train.map(r => r.gc);
  const k = X[0].length;
  /* Stöðlun svo halla-lækkun sé stöðug */
  const mu = Array.from({ length: k }, (_, j) => j === 0 ? 0 : mean(X.map(x => x[j])));
  const sd = Array.from({ length: k }, (_, j) => {
    if (j === 0) return 1;
    const m = mu[j];
    return Math.sqrt(mean(X.map(x => (x[j] - m) ** 2))) || 1;
  });
  const Z = X.map(x => x.map((v, j) => j === 0 ? 1 : (v - mu[j]) / sd[j]));
  const b = new Array(k).fill(0);
  b[0] = Math.log(mean(y) || 0.1);
  for (let it = 0; it < iters; it++) {
    const g = new Array(k).fill(0);
    for (let i = 0; i < Z.length; i++) {
      let eta = 0;
      for (let j = 0; j < k; j++) eta += b[j] * Z[i][j];
      const lam = Math.exp(Math.min(3, eta));
      const resid = y[i] - lam;                    // afleiða log-líkinda
      for (let j = 0; j < k; j++) g[j] += resid * Z[i][j];
    }
    for (let j = 0; j < k; j++) b[j] += lr * g[j] / Z.length;
  }
  return r => {
    const x = [1, ...feats.map(f => f(r))];
    let eta = 0;
    for (let j = 0; j < k; j++) eta += b[j] * (j === 0 ? 1 : (x[j] - mu[j]) / sd[j]);
    return Math.exp(Math.min(3, eta));            // λ
  };
}

/* Kandídatar: hver setur af inntökum, LOSO-mældur */
const FEATS = {
  "aðeins liðsstyrkur":        [r => r.ownXgc, r => r.oppXg, r => r.home],
  "+ skot á mark":             [r => r.ownXgc, r => r.oppXg, r => r.home, r => r.ownSotAg, r => r.oppSotFor],
  "+ Elo og FDR":              [r => r.ownXgc, r => r.oppXg, r => r.home, r => r.ownSotAg, r => r.oppSotFor, r => r.eloDiff, r => r.fdr],
  "+ MARKAÐSLÍNA (allt)":      [r => r.ownXgc, r => r.oppXg, r => r.home, r => r.ownSotAg, r => r.oppSotFor, r => r.eloDiff, r => r.fdr, r => r.mktXga ?? LG_XG],
  "aðeins markaðslína":        [r => r.mktXga ?? LG_XG],
};

console.log(`\n${"─".repeat(76)}\nLOSO-KROSSPRÓFAÐ — Brier á CS (lægra betra) og kvörðun\n${"─".repeat(76)}`);
console.log("líkan                                Brier     skill    halli    meðalfrávik   r(λ,gc)");

/* Viðmið 1: grunnhlutfall */
const yAll = rows.map(r => r.cs ? 1 : 0);
const bBase = brier(rows.map(() => baseRate), yAll);
const results = {};
const calibOf = (pred, ys) => {
  const idx = pred.map((p, i) => [p, ys[i]]).sort((a, b) => a[0] - b[0]);
  let bias = 0, mae = 0;
  for (let i = 0; i < 10; i++) {
    const g = idx.slice(Math.floor(i * idx.length / 10), Math.floor((i + 1) * idx.length / 10));
    const pr = 100 * mean(g.map(x => x[0])), re = 100 * mean(g.map(x => x[1]));
    bias += (re - pr) / 10; mae += Math.abs(re - pr) / 10;
  }
  return { bias, mae };
};
const show = (label, pred, lam) => {
  const b = brier(pred, yAll);
  const c = calibOf(pred, yAll);
  const rl = lam ? corr(lam, rows.map(r => r.gc)) : null;
  results[label] = { b, ...c };
  console.log(`  ${label.padEnd(34)} ${b.toFixed(5)}  ${(100 * (1 - b / bBase)).toFixed(2)}%   ` +
    `${c.bias >= 0 ? "+" : ""}${c.bias.toFixed(1)}pp   ${c.mae.toFixed(1)}pp` +
    `        ${rl != null ? rl.toFixed(3) : "—"}`);
};
console.log(`  ${"grunnhlutfall (spá alltaf meðaltalinu)".padEnd(34)} ${bBase.toFixed(5)}   0.00%   —        —`);

/* Viðmið 2: NÚVERANDI leið — FFDR -> MEASURED_POS-tafla */
show("NÚVERANDI: FFDR -> tafla", rows.map(r => lookupPos(2, "cs", r.dDef) / 100), null);

/* Viðmið 3: markaðurinn beint sem Poisson, ÓFITTAÐUR */
show("markaðurinn beint (e^-xga)", rows.map(r => Math.exp(-(r.mktXga ?? LG_XG))),
  rows.map(r => r.mktXga ?? LG_XG));

/* Poisson-líkönin, LOSO */
for (const [label, feats] of Object.entries(FEATS)) {
  const pred = new Array(rows.length), lam = new Array(rows.length);
  for (const k of PRED) {
    const trIdx = [], teIdx = [];
    rows.forEach((r, i) => (r.season === k ? teIdx : trIdx).push(i));
    const model = fitPoisson(trIdx.map(i => rows[i]), feats);
    for (const i of teIdx) {
      const l = model(rows[i]);
      lam[i] = l; pred[i] = Math.exp(-l);
    }
  }
  show(`Poisson: ${label}`, pred, lam);
}

/* ---------- 3. Niðurstaða og tillaga ---------- */
const cur = results["NÚVERANDI: FFDR -> tafla"];
const mkt = results["markaðurinn beint (e^-xga)"];
const poiAll = results["Poisson: + MARKAÐSLÍNA (allt)"];
const poiNoMkt = results["Poisson: + Elo og FDR"];
console.log(`\n${"─".repeat(76)}\nNIÐURSTAÐA\n${"─".repeat(76)}`);
const line = (lbl, x) => console.log(`  ${lbl.padEnd(30)} Brier ${x.b.toFixed(5)} · skill ${(100 * (1 - x.b / bBase)).toFixed(2)}%` +
  ` · halli ${x.bias >= 0 ? "+" : ""}${x.bias.toFixed(1)}pp · meðalfrávik ${x.mae.toFixed(1)}pp`);
line("NÚVERANDI (FFDR -> tafla)", cur);
line("markaðurinn beint (e^-λ)", mkt);
line("Poisson m/ öllu", poiAll);
line("Poisson ÁN markaðar", poiNoMkt);

/* LYKILNIÐURSTAÐAN: hrár markaðs-Poisson slær ALLT, líka fittað líkan
   sem hefur markaðinn OG okkar inntök. Það þýðir að fyrir CS er
   markaðurinn EKKI bara besta inntakið — hann er nægjanlegur, og að
   blanda okkar inntökum við hann gerir spána VERRI.                   */
let winMkt = 0, winPoi = 0;
for (const k of PRED) {
  const teIdx = [];
  rows.forEach((r, i) => { if (r.season === k) teIdx.push(i); });
  const y = teIdx.map(i => rows[i].cs ? 1 : 0);
  const bCur = brier(teIdx.map(i => lookupPos(2, "cs", rows[i].dDef) / 100), y);
  const bMkt = brier(teIdx.map(i => Math.exp(-(rows[i].mktXga ?? LG_XG))), y);
  if (bMkt < bCur) winMkt++;
  if (results["Poisson: + MARKAÐSLÍNA (allt)"] && poiAll.b < cur.b) winPoi++;
}
console.log(`\n  markaðs-Poisson slær núverandi leið í ${winMkt}/${PRED.length} tímabilum.`);
ok(mkt.b < cur.b, `markaðs-Poisson (e^-λ) slær FFDR->tafla (${mkt.b.toFixed(5)} < ${cur.b.toFixed(5)})`);
ok(winMkt >= PRED.length - 2, `og gerir það í ≥${PRED.length - 2}/${PRED.length} tímabilum (${winMkt})`);
ok(Math.abs(mkt.bias) <= Math.abs(cur.bias) + 0.3 && mkt.mae < cur.mae,
  `markaðs-Poisson er betur kvarðaður (${mkt.mae.toFixed(1)}pp á móti ${cur.mae.toFixed(1)}pp)`);
/* Og að FITTAÐA líkanið bæti EKKI við markaðinn — það er niðurstaða, ekki
   uppgjöf: hún segir okkur að sleppa flækjunni.                        */
ok(mkt.b <= poiAll.b + 0.0005,
  `okkar inntök bæta EKKI við markaðinn fyrir CS (${mkt.b.toFixed(5)} vs ${poiAll.b.toFixed(5)}) — engin flækja réttlætt`);
/* ÁN markaðar (allar umferðir nema næsta) er Poisson BETUR KVARÐAÐUR
   en taflan, þótt Brier sé lítillega hærri. Það er raunverulegur ábati
   fyrir birtar tölur, sem er það sem CS% er.                           */
console.log(`\n  ÁN markaðslínu (þ.e. allar umferðir nema næsta):`);
console.log(`    taflan:  meðalfrávik ${cur.mae.toFixed(1)}pp`);
console.log(`    Poisson: meðalfrávik ${poiNoMkt.mae.toFixed(1)}pp  (Brier ${poiNoMkt.b.toFixed(5)} á móti ${cur.b.toFixed(5)})`);
ok(poiNoMkt.mae < cur.mae,
  `Poisson án markaðar er betur kvarðaður en taflan (${poiNoMkt.mae.toFixed(1)}pp á móti ${cur.mae.toFixed(1)}pp)`);

console.log(`\n  TILLAGA (mæld, ekki valin):`);
console.log(`    1. Leikir MEÐ línu: nota e^-λ BEINT. Best af öllu sem var mælt`);
console.log(`       (skill ${(100 * (1 - mkt.b / bBase)).toFixed(2)}% · meðalfrávik ${mkt.mae.toFixed(1)}pp) og appið hefur töluna þegar`);
console.log(`       í odds.json.cs — ekki þynna hana með FFDR.`);
console.log(`    2. Leikir ÁN línu: Poisson á liðsstyrk+Elo+FDR í stað töflu`);
console.log(`       (meðalfrávik ${poiNoMkt.mae.toFixed(1)}pp á móti ${cur.mae.toFixed(1)}pp).`);
console.log(`    3. FFDR heldur sínu hlutverki: RÖÐUN leikja (litir, vænt stig).`);
console.log(`       CS% á að vera LÍKINDALÍKAN, ekki uppflettitala á 1-5 kvarða.`);

console.log(`\nCS-LÍKAN: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
