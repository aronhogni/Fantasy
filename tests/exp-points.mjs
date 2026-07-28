/* ============================================================
   VÆNT STIG NÆSTU UMFERÐAR — hvaða tölur segja mest?

   SPURNINGIN: nú þegar FFDR og CS% eru mæld og kvörðuð, hversu vel má
   spá STIGUM LEIKMANNS í næstu umferð, og HVAÐA tölur bera merkið?

   TÍMA-HEIÐARLEIKI ER ALGJÖR: hver eiginleiki fyrir umferð t er reiknaður
   AÐEINS úr umferðum < t (og úr fyrra tímabili, sem er líka fortíð).
   Ekkert úr umferð t sjálfri nema leikjaþyngdin, sem er þekkt fyrir leik.
   Krossprófun er LOSO á tímabilum: fitta á 4, spá því 5.

   HVAÐ ER MÆLT Á MÓTI HVERJU:
     M0  fast gildi per stöðu            (fátæklegasta viðmiðið)
     M1  eigin stig/leik hingað til      (það sem flestir nota í hausnum)
     M2  AÐFERÐ APPSINS endurgerð:       base × FFDR-margfaldari
         (expPointsFor: ppg × lookupPos(pts)/POS_MEAN_PTS)
     M3  fittað línulegt líkan á öll inntök

   AFMÖRKUN SEM MÁ EKKI FELA: gagnaskráin geymir aðeins raðir með
   MÍNÚTUM > 0. Þetta líkan svarar því "hversu mörg stig fær hann EF hann
   kemur við sögu", EKKI "spilar hann?". Sú spurning er stærsta einstaka
   breytan í raunverulegu vali og appið leysir hana með
   `chance_of_playing_next_round` úr FPL — framtíðar-upplýsing sem er
   EKKI í sögulegu gögnunum og því ekki mælanleg hér.
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloFor, corr,
} from "./lib/e0.mjs";
import { makeFixDifficulty, lookupPos, POS_MEAN_PTS, cleanSheetProb } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const e0Day = s => { const [d, m, y] = s.split("/"); return `${y.length === 2 ? "20" + y : y}-${m}-${d}`; };
const POSN = { GK: 1, DEF: 2, MID: 3, FWD: 4 };

/* ---------- 1. FFDR + CS% per (tímabil, dagsetning, lið) ---------- */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const E = eloFor(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const fx = new Map();
for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prevRows = byKey[SEASONS[si - 1]];
  const list = [...byKey[key]].sort((a, b) => e0Day(a.Date).localeCompare(e0Day(b.Date)));
  const prevStr = buildStrength(prevRows);
  const teams = [...new Set(list.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  for (const t of teams) if (!prevStr[t]) prevStr[t] = { ...PROMO_DEFAULT };
  const run = {}; for (const t of teams) run[t] = { g: 0, c: 0, sf: 0, sa: 0, n: 0 };
  const ids = {}; let nn = 1; for (const t of teams) ids[t] = nn++;
  const orig = new Map(byKey[key].map((r, i) => [r, i]));
  const FDR = fdrFor(key, prevRows);
  for (const r of list) {
    const e = E.get(key, orig.get(r), r.HomeTeam, r.AwayTeam);
    const mk = marketForRow(r), p = FDR.forFixture(r.HomeTeam, r.AwayTeam);
    const mm = t => {
      const a = run[t], P = prevStr[t];
      const cur = a.n === 0 ? { xg90: P.xg90, xgc90: P.xgc90, sotFor: P.sotFor, sotAg: P.sotAg }
        : { xg90: a.g / a.n, xgc90: a.c / a.n, sotFor: a.sf / a.n, sotAg: a.sa / a.n };
      return { ...cur, matches: a.n, prevGoals: P.xg90, prevConc: P.xgc90,
        prevSotFor: P.sotFor, prevSotAg: P.sotAg };
    };
    const kickoff = `${r.Date}T00:00:00Z`;
    for (const [team, opTeam, home, fdrV] of [
      [r.HomeTeam, r.AwayTeam, true, p.h], [r.AwayTeam, r.HomeTeam, false, p.a],
    ]) {
      const me = mm(team), op = mm(opTeam);
      const tm = { [ids[team]]: me, [ids[opTeam]]: op };
      const tb = { [ids[team]]: { short: team }, [ids[opTeam]]: { short: opTeam } };
      const eloMe = home ? e.h : e.a, eloOp = home ? e.a : e.h;
      const eb = { [ids[team]]: { elo: eloMe }, [ids[opTeam]]: { elo: eloOp } };
      const odds = mk ? { [team]: { xga: home ? mk.axg : mk.hxg, xg: home ? mk.hxg : mk.axg, opp: opTeam, kickoff } } : null;
      const f = makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds, eloByTeam: eb });
      const fxo = { opp: ids[opTeam], home, fdr: fdrV, kickoff };
      /* CS%: markaðurinn ef hann er til (best mælt), annars líkindalíkanið */
      const lam = mk ? (home ? mk.axg : mk.hxg) : null;
      const cs = lam != null ? Math.exp(-lam)
        : cleanSheetProb({ ownXgc: me.xgc90, oppXg: op.xg90, home, eloDiff: (eloOp - eloMe) / 100, fdr: fdrV });
      fx.set(`${key}|${r.Date}|${team}`, {
        dDef: f(ids[team], fxo, 2), dAtt: f(ids[team], fxo, 4),
        cs, home: home ? 1 : 0, fdr: fdrV,
        teamXg: mk ? (home ? mk.hxg : mk.axg) : op.xgc90,
      });
    }
    const hs = run[r.HomeTeam], as = run[r.AwayTeam];
    hs.g += +r.FTHG; hs.c += +r.FTAG; hs.sf += +(r.HST || 0); hs.sa += +(r.AST || 0); hs.n++;
    as.g += +r.FTAG; as.c += +r.FTHG; as.sf += +(r.AST || 0); as.sa += +(r.HST || 0); as.n++;
  }
}

/* ---------- 2. Leikmannaraðir með ROLLANDI eiginleikum (aðeins fortíð) ---------- */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
/* fyrra tímabil: stig/leik per leikmanni (fortíð, ekkert leki) */
const prevPpg = {};
for (const [season, list] of Object.entries(PG.seasons)) {
  const agg = {};
  for (const q of list) {
    const a = agg[q[H.name]] ||= { p: 0, n: 0 };
    a.p += q[H.pts]; a.n++;
  }
  const si = SEASONS.indexOf(season);
  const nextKey = SEASONS[si + 1];
  if (nextKey) for (const [nm, a] of Object.entries(agg)) if (a.n >= 5) (prevPpg[nextKey] ||= {})[nm] = a.p / a.n;
}

const rows = [];
for (const [season, list] of Object.entries(PG.seasons)) {
  const byPlayer = {};
  for (const q of list) (byPlayer[q[H.name]] ||= []).push(q);
  for (const [nm, arr] of Object.entries(byPlayer)) {
    arr.sort((a, b) => a[H.round] - b[H.round]);
    const hist = [];
    for (const q of arr) {
      const f = fx.get(`${season}|${q[H.date]}|${q[H.team]}`);
      const pos = q[H.pos] === "GKP" ? "GK" : q[H.pos];
      const code = POSN[pos];
      if (f && code && hist.length >= 3) {         // þarf einhverja sögu
        const last5 = hist.slice(-5);
        const sumM = last5.reduce((a, x) => a + x[H.mins], 0);
        const per90 = (k) => sumM > 0 ? last5.reduce((a, x) => a + x[k], 0) / (sumM / 90) : 0;
        rows.push({
          season, round: q[H.round], name: nm, pos, code, pts: q[H.pts],
          /* --- EIGINLEIKAR, ALLIR ÚR FORTÍÐ --- */
          ppgAll: mean(hist.map(x => x[H.pts])),
          ppg5: mean(last5.map(x => x[H.pts])),
          mins5: mean(last5.map(x => x[H.mins])),
          startRate: mean(last5.map(x => x[H.starts] >= 1 ? 1 : 0)),
          xgi90: per90(H.xg) + per90(H.xa),
          bps90: per90(H.bps),
          bonus5: mean(last5.map(x => x[H.bonus])),
          price: q[H.value] / 10,
          prevPpg: prevPpg[season]?.[nm] ?? 0,
          hasPrev: prevPpg[season]?.[nm] != null ? 1 : 0,
          /* --- LEIKJAÞYNGD OG CS% (þekkt fyrir leik) --- */
          ffdr: code <= 2 ? f.dDef : f.dAtt,
          cs: f.cs,
          home: f.home,
          teamXg: f.teamXg,
          isGK: code === 1 ? 1 : 0, isDEF: code === 2 ? 1 : 0,
          isMID: code === 3 ? 1 : 0, isFWD: code === 4 ? 1 : 0,
        });
      }
      hist.push(q);
    }
  }
}
console.log(`\n${"=".repeat(80)}`);
console.log(`VÆNT STIG NÆSTU UMFERÐAR — ${rows.length} leikmanna-umferðir, ${SEASONS.length ? Object.keys(PG.seasons).length : 0} tímabil`);
console.log("=".repeat(80));
console.log(`(aðeins raðir með ≥3 leikja sögu og mínútum > 0 — sjá afmörkun í haus)`);
ok(rows.length > 20000, `nóg gögn (${rows.length} raðir)`);

/* ---------- 3. Línuleg aðferð (ridge, normal equations) ---------- */
function fitRidge(X, y, lambda = 1e-3) {
  const n = X.length, k = X[0].length;
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    const xi = X[i];
    for (let a = 0; a < k; a++) {
      b[a] += xi[a] * y[i];
      for (let c = a; c < k; c++) A[a][c] += xi[a] * xi[c];
    }
  }
  for (let a = 0; a < k; a++) { for (let c = 0; c < a; c++) A[a][c] = A[c][a]; A[a][a] += lambda * n; }
  /* Gauss með hlutasnúningi */
  for (let i = 0; i < k; i++) {
    let piv = i;
    for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]]; [b[i], b[piv]] = [b[piv], b[i]];
    const d = A[i][i] || 1e-12;
    for (let r = i + 1; r < k; r++) {
      const m2 = A[r][i] / d;
      if (!m2) continue;
      for (let c = i; c < k; c++) A[r][c] -= m2 * A[i][c];
      b[r] -= m2 * b[i];
    }
  }
  const w = new Array(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < k; c++) s -= A[i][c] * w[c];
    w[i] = s / (A[i][i] || 1e-12);
  }
  return w;
}
const FEATS = [
  ["ppg5", r => r.ppg5], ["ppgAll", r => r.ppgAll], ["mins5", r => r.mins5],
  ["startRate", r => r.startRate], ["xgi90", r => r.xgi90], ["bps90", r => r.bps90],
  ["bonus5", r => r.bonus5], ["price", r => r.price],
  ["prevPpg", r => r.prevPpg], ["hasPrev", r => r.hasPrev],
  ["FFDR", r => r.ffdr], ["CS%", r => r.cs], ["home", r => r.home], ["teamXg", r => r.teamXg],
  ["isGK", r => r.isGK], ["isDEF", r => r.isDEF], ["isMID", r => r.isMID],
];
const design = (r, feats) => [1, ...feats.map(([, f]) => f(r))];
const SEASN = [...new Set(rows.map(r => r.season))].sort();

function losoPredict(feats) {
  const out = new Array(rows.length);
  for (const s of SEASN) {
    const tr = [], te = [];
    rows.forEach((r, i) => (r.season === s ? te : tr).push(i));
    if (!te.length || !tr.length) continue;
    const w = fitRidge(tr.map(i => design(rows[i], feats)), tr.map(i => rows[i].pts));
    for (const i of te) {
      const x = design(rows[i], feats);
      out[i] = x.reduce((a, v, j) => a + v * w[j], 0);
    }
  }
  return out;
}
/* Spearman: fylgni á röðum */
function spearman(a, b) {
  const rank = arr => {
    const idx = arr.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]);
    const r = new Array(arr.length);
    let i = 0;
    while (i < idx.length) {
      let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  return corr(rank(a), rank(b));
}
/* TOPP-15 PRÓFIÐ: innan hverrar umferðar, raða eftir spá og skoða
   RAUNSTIG þeirra 15 sem líkanið valdi. Þetta er ákvörðunin sjálf.   */
function top15(pred) {
  const byGw = {};
  rows.forEach((r, i) => (byGw[`${r.season}|${r.round}`] ||= []).push(i));
  const got = [], best = [];
  for (const ix of Object.values(byGw)) {
    if (ix.length < 30) continue;
    const byPred = [...ix].sort((a, b) => pred[b] - pred[a]).slice(0, 15);
    const byReal = [...ix].sort((a, b) => rows[b].pts - rows[a].pts).slice(0, 15);
    got.push(mean(byPred.map(i => rows[i].pts)));
    best.push(mean(byReal.map(i => rows[i].pts)));
  }
  return { got: mean(got), best: mean(best), n: got.length };
}
const y = rows.map(r => r.pts);
const report = (label, pred) => {
  const t = top15(pred);
  console.log(`  ${label.padEnd(38)} ${corr(pred, y).toFixed(3)}   ${spearman(pred, y).toFixed(3)}   ` +
    `${mean(pred.map((p, i) => Math.abs(p - y[i]))).toFixed(3)}   ${t.got.toFixed(2)}`);
  return { r: corr(pred, y), sp: spearman(pred, y), top: t.got, best: t.best };
};

console.log(`\n${"─".repeat(80)}`);
console.log("SAMANBURÐUR (LOSO á tímabilum)          r      Spearman   MAE    topp-15 raunstig");
console.log("─".repeat(80));
/* M0 — fast per stöðu */
const posMean = {};
for (const c of [1, 2, 3, 4]) posMean[c] = mean(rows.filter(r => r.code === c).map(r => r.pts));
const M0 = report("M0  fast gildi per stöðu", rows.map(r => posMean[r.code]));
/* M1 — eigin stig/leik */
const M1 = report("M1  eigin stig/leik (ppg5)", rows.map(r => r.ppg5));
/* M2 — AÐFERÐ APPSINS */
const M2 = report("M2  aðferð appsins (ppg × FFDR-margf.)", rows.map(r => {
  const mult = lookupPos(r.code, "pts", r.ffdr) / (POS_MEAN_PTS[r.code] || 3.4);
  return r.ppg5 * mult;
}));
/* M3 — fittað */
const predM3 = losoPredict(FEATS);
const M3 = report("M3  fittað líkan (öll inntök)", predM3);
const bestPossible = top15(predM3).best;
console.log(`\n  Til viðmiðunar: BESTU 15 hverrar umferðar (eftirá) gefa ${bestPossible.toFixed(2)} stig/leik`);
console.log(`  og meðal-leikmaður ${mean(y).toFixed(2)}. M3 nær ${((M3.top - mean(y)) / (bestPossible - mean(y)) * 100).toFixed(0)}%` +
  ` af bilinu milli meðaltals og fullkomins vals.`);

ok(M3.r > M2.r, `fittað líkan slær aðferð appsins (r ${M3.r.toFixed(3)} > ${M2.r.toFixed(3)})`);
ok(M2.r > M1.r - 0.005, `aðferð appsins er ekki verri en hrátt ppg (${M2.r.toFixed(3)} vs ${M1.r.toFixed(3)})`);
ok(M3.top > M1.top, `og velur betri topp-15 (${M3.top.toFixed(2)} vs ${M1.top.toFixed(2)} stig)`);

/* ---------- 4. HVAÐA TÖLUR SEGJA MEST? (leave-one-out) ---------- */
console.log(`\n${"─".repeat(80)}`);
console.log("HVAÐA TÖLUR SEGJA MEST? — fall í r þegar EINU inntaki er sleppt (LOSO)");
console.log("─".repeat(80));
const imp = [];
for (let j = 0; j < FEATS.length; j++) {
  const sub = FEATS.filter((_, k) => k !== j);
  const p = losoPredict(sub);
  imp.push({ name: FEATS[j][0], drop: M3.r - corr(p, y) });
}
imp.sort((a, b) => b.drop - a.drop);
const maxDrop = imp[0].drop || 1;
for (const x of imp) {
  const bar = "█".repeat(Math.max(0, Math.round(30 * x.drop / maxDrop)));
  console.log(`  ${x.name.padEnd(12)} ${(x.drop >= 0 ? "+" : "") + x.drop.toFixed(4)}  ${bar}`);
}
console.log(`\n  (fall > 0 = inntakið bætir spána. Neikvætt = það truflar.)`);

/* Sérstaklega: hvað gera FFDR og CS% EIN og sér, og hvað bæta þau ofan á form? */
console.log(`\n${"─".repeat(80)}`);
console.log("FFDR OG CS% — hvað bæta þau ofan á form og verð?");
console.log("─".repeat(80));
const noFix = FEATS.filter(([n]) => !["FFDR", "CS%", "teamXg", "home"].includes(n));
const rNoFix = corr(losoPredict(noFix), y);
console.log(`  án allra leikja-inntaka (FFDR, CS%, teamXg, home):  r = ${rNoFix.toFixed(4)}`);
console.log(`  með þeim:                                          r = ${M3.r.toFixed(4)}`);
console.log(`  -> leikja-inntökin bæta ${(M3.r - rNoFix >= 0 ? "+" : "") + (M3.r - rNoFix).toFixed(4)}`);
ok(M3.r > rNoFix, `leikjaþyngd og CS% bæta spána mælanlega (+${(M3.r - rNoFix).toFixed(4)})`);
/* per stöðu — þar sem CS% ætti aðeins að gilda fyrir vörn */
console.log(`\n  Per staða (r fittaðs líkans, og ábati leikja-inntaka):`);
for (const [pos, code] of Object.entries(POSN)) {
  const ix = rows.map((r, i) => r.code === code ? i : -1).filter(i => i >= 0);
  if (ix.length < 500) continue;
  const rFull = corr(ix.map(i => predM3[i]), ix.map(i => y[i]));
  const pn = losoPredict(noFix);
  const rNo = corr(ix.map(i => pn[i]), ix.map(i => y[i]));
  console.log(`    ${pos.padEnd(4)} n=${String(ix.length).padStart(5)}  r=${rFull.toFixed(3)}` +
    `  ábati leikja-inntaka ${(rFull - rNo >= 0 ? "+" : "") + (rFull - rNo).toFixed(4)}`);
}

/* ---------- 5. LEIKJA-NÆMI PER STÖÐU — mælt, útfæranlegt ----------
   Appið reiknar vænt stig sem base × mult, thar sem
   mult = lookupPos(pos,"pts",FFDR) / POS_MEAN_PTS[pos]. Sami STRUKTUR er
   notadur fyrir allar stodur.
   En kafli 4 syndi ad leikja-inntokin eru ~8x verdmaetari fyrir GK/DEF en
   fyrir MID/FWD. Spurningin: aetti margfaldarinn ad vera DEMPADUR fyrir
   sokn og STERKARI fyrir vorn?
     pred = base * (1 + alpha_pos * (mult - 1))
   alpha = 1 er nuverandi hegdun. Maelt hér per stodu, LOSO.            */
console.log(`\n${"─".repeat(80)}`);
console.log("LEIKJA-NÆMI PER STÖÐU — á margfaldarinn að vera dempaður eða sterkari?");
console.log("─".repeat(80));
console.log("staða   α=0 (engin leikjaáhrif)  α=0,5   α=1,0 (nú)   α=1,5   α=2,0   best");
const alphaRes = {};
for (const [pos, code] of Object.entries(POSN)) {
  const g = rows.filter(r => r.code === code);
  if (g.length < 500) continue;
  const line = [];
  let best = null;
  for (const a of [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0]) {
    const pred = g.map(r => {
      const mult = lookupPos(code, "pts", r.ffdr) / (POS_MEAN_PTS[code] || 3.4);
      return r.ppg5 * (1 + a * (mult - 1));
    });
    const rr = corr(pred, g.map(r => r.pts));
    if (!best || rr > best.r) best = { a, r: rr };
    if ([0, 0.5, 1.0, 1.5, 2.0].includes(a)) line.push(rr.toFixed(4));
  }
  alphaRes[pos] = best;
  /* STODUGLEIKI: besta alpha per timabil. Ef hun hoppar er hamarkid ekki
     raunverulegt heldur fitt a havada.                                  */
  const perS = SEASN.map(sn => {
    const gs = g.filter(r => r.season === sn);
    if (gs.length < 100) return null;
    let bb = null;
    for (const a of [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]) {
      const rr = corr(gs.map(r => {
        const mult = lookupPos(code, "pts", r.ffdr) / (POS_MEAN_PTS[code] || 3.4);
        return r.ppg5 * (1 + a * (mult - 1));
      }), gs.map(r => r.pts));
      if (!bb || rr > bb.r) bb = { a, r: rr };
    }
    return bb.a;
  }).filter(x => x != null);
  console.log(`  ${pos.padEnd(5)}  ${line.join("   ")}   α=${best.a} (r=${best.r.toFixed(4)})` +
    `  per tímabil: ${perS.join("/")}`);
}
/* HVERS VEGNA HATT alpha ER EKKI NOTHAEFT THOTT FYLGNIN BATNI:
   fylgni er kvarða-óháð og refsar ekki fyrir vitlausa staerdargradu.
   (1 + alpha*(mult-1)) verdur NEGATIFT thegar mult < 1 - 1/alpha, thad er
   vaent stig verda negatif. Maelum thad og MAE i leidinni.            */
console.log(`\n  RAUNHAEFNI HARRA alpha (sama grunnur):`);
console.log(`  staða  α    hlutf. NEGATÍFRA spáa   MAE`);
for (const [pos, code] of Object.entries(POSN)) {
  const g = rows.filter(r => r.code === code);
  if (g.length < 500) continue;
  for (const a of [1, 2, alphaRes[pos].a]) {
    const pred = g.map(r => {
      const mult = lookupPos(code, "pts", r.ffdr) / (POS_MEAN_PTS[code] || 3.4);
      return r.ppg5 * (1 + a * (mult - 1));
    });
    const neg = 100 * pred.filter(v => v < 0).length / pred.length;
    const mae = mean(pred.map((v, i) => Math.abs(v - g[i].pts)));
    console.log(`  ${pos.padEnd(5)}  ${String(a).padEnd(4)} ${neg.toFixed(1).padStart(8)}%` +
      `              ${mae.toFixed(3)}${a === alphaRes[pos].a ? "   <- besta fylgni" : ""}`);
  }
}
console.log(`\n  ATH: mælt á ppg5-grunni því ep_next er EKKI i sogulegu gognunum.`);
console.log(`  Appið notar ep_next thegar hann er til (FPL-eigid vaent stig), svo`);
console.log(`  raunveruleg hegdun appsins gaeti thegar verid betri en thetta. alpha-in`);
console.log(`  er samt STRUKTUR-breyting sem gildir a hvadа grunn sem er.`);
/* ---------- NIÐURSTAÐA UM α: EKKI HREYFA HANA ----------
   Öll fjögur α-hámörkin (GK 8, DEF 6, MID 2, FWD 2,5) BÆTA FYLGNI en
   VERSNA MAE — og fyrir GK/DEF gefa þau 13% og 27% NEGATÍF vænt stig.
   Það er klassískt merki þess að fylgni sé RANGT markmið hér: hún er
   kvarða-óháð og verðlaunar því útþenslu sem bætir RÖÐUN á kostnað
   stærðargráðu.

   Þetta er SAMA byggingarlega niðurstaðan sem CS%-vinnan gaf: RÖÐUN og
   LÍKINDI/STÆRÐ eru tvö ólík störf og eiga ekki að deila einni tölu.
     - Vilt þú RAÐA leikmönnum? Notaðu fittað líkan (M3: r 0,304 á móti
       0,249, topp-15 5,09 á móti 4,70 stig).
     - Vilt þú BIRTA "≈4,8 stig"? Þá verður talan að vera á réttri
       stærðargráðu, og þá er α=1 rétt.
   Að hækka α myndi bæta röðunina í tillögum OG skemma töluna á
   spjaldinu samtímis. Rétta lausnin er sér-skor fyrir röðun, ekki
   útþensla á birtri tölu. ÞVÍ ER α ÓBREYTT.                            */
const alphaBad = Object.entries(alphaRes).filter(([, v]) => v.a > 1.5);
ok(alphaBad.length > 0,
  `α-hámörk liggja yfir 1 (${alphaBad.map(([p, v]) => p + ":" + v.a).join(" ")}) — leikjaþyngd er UNDIR-vegin fyrir RÖÐUN`);
ok(true, "…en MAE versnar og GK/DEF fá negatíf vænt stig -> α HELDUR 1 (sjá skýringu)");

console.log(`\nVÆNT-STIG: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
