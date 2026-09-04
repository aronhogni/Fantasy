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
import { makeFixDifficulty, lookupPos, POS_MEAN_PTS, cleanSheetProb, expPointsFor,
         pointsBase, calibrateExp } from "../src/model.js";

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
/* TOLURNAR VORU ADEINS PRENTADAR. Thaer eru ROKSTUDNINGURINN fyrir "α helst
   1" (sja nidurstoduna her a eftir) og engin fullyrding las thaer — svo hefdi
   MAE snuist vid hefdi safnid prentad thad og verid graent. Nu eru thaer
   geymdar og fullyrt um thaer.                                            */
const raun = {};
for (const [pos, code] of Object.entries(POSN)) {
  const g = rows.filter(r => r.code === code);
  if (g.length < 500) continue;
  raun[pos] = {};
  for (const a of [1, 2, alphaRes[pos].a]) {
    const pred = g.map(r => {
      const mult = lookupPos(code, "pts", r.ffdr) / (POS_MEAN_PTS[code] || 3.4);
      return r.ppg5 * (1 + a * (mult - 1));
    });
    const neg = 100 * pred.filter(v => v < 0).length / pred.length;
    const mae = mean(pred.map((v, i) => Math.abs(v - g[i].pts)));
    raun[pos][a] = { neg, mae };
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
/* UPPFÆRT 29.7.: með RÉTTRI sögu (blankar með í rúllandi glugga, sjá
   lib/panel.mjs) hurfu háu α-hámörkin — þau voru að hluta artefakt af
   því að "síðustu 5" þýddi síðustu 5 LEIKIR, svo bekkjaðir leikmenn
   litu í formi. Niðurstaðan er ÓBREYTT (α helst 1) en nú af sterkari
   ástæðu: hámarkið er ekki lengur yfir 1 að marki.                    */
const ALPHA_HIGH_CUT = 1.5;
const alphaHigh = Object.entries(alphaRes).filter(([, v]) => v.a > ALPHA_HIGH_CUT);
console.log(`\n  α-hámörk yfir 1,5: ${alphaHigh.length ? alphaHigh.map(([p, v]) => p + ":" + v.a).join(" ") : "ENGIN"}`);
/* ============================================================
   THRJAR FULLYRDINGAR I STAD EINNAR SEM GAT EKKI FALLID (21.8.2026)

   HER STOD:
     ok(alphaHigh.length === 0 || alphaHigh.every(([p]) => [...].includes(p)), ...)
   `[].every()` er SATT AD BYGGINGU, svo vinstri lidurinn (`length === 0`) er
   DAUDUR — hann getur ekki bjargad neinu sem haegri lidurinn hefdi fellt.
   Fullyrdingin las thvi sterkari en hun var (sama aett og `||` bindur fastar
   en `?:` i CLAUDE.md 13), og i dag er `alphaHigh` TOMT (best α er 1/1/1/0,5),
   svo hun sagdi EKKERT um thad sem hun heitir eftir. Talan sem segir hvort
   hun hafi haft nokkud ad maela var adeins PRENTUD ("ENGIN").

   THAD SEM HUN A AD VERJA — og ver nu, i thrennu:
     (a) ThEKJA: fjorar stodur voru raunverulega maeldar. `if (g.length < 500)
         continue` getur ThAGGAD stodu nidur i thogn, og tha vaeri hvert
         alpha-svar um hana rett af thvi ad thad var aldrei spurt.
     (b) MEKANISMINN: MAE verdur VERRA vid α=2 i OLLUM stodum. Thetta er
         astaedan fyrir ad α helst 1 (fylgni er kvarda-ohad, MAE er ekki), og
         hun var adeins prentud.
     (c) SJALFT SKILYRDID, an dauda lidarins og med TOLUNA i heitinu svo
         "0 hamork" lesist i keyrslunni og geti ekki thagnad.
   ============================================================ */
ok(Object.keys(alphaRes).length === Object.keys(POSN).length,
  `THEKJA: alpha var maelt fyrir allar ${Object.keys(POSN).length} stodur`
  + ` (${Object.keys(alphaRes).join("/")}) — engin thoggud i sundur`);
for (const pos of Object.keys(alphaRes)) {
  const r1 = raun[pos]?.[1], r2 = raun[pos]?.[2];
  ok(!!r1 && !!r2 && r2.mae > r1.mae,
    `${pos}: MAE VERSNAR vid α=2 (${r2?.mae.toFixed(3)} > ${r1?.mae.toFixed(3)})`
    + ` — mekanisminn sem gerir α=1 rett`);
}
ok(alphaHigh.every(([p]) => ["GK", "DEF"].includes(p)),
  `ha α-hamork yfir ${ALPHA_HIGH_CUT}: ${alphaHigh.length}`
  + ` (${alphaHigh.map(([p, v]) => p + ":" + v.a).join(" ") || "engin"})`
  + " — og ef nokkur eru, tha adeins hja GK/DEF thar sem MAE versnar mest");
/* ============================================================
   α = 1 ER FULLYRDING UM APPID, OG HUN VAR BOKSTAFLEGT `true` (lagad 21.8.2026)

   Her stod `ok(true, "α HELDUR 1 ...")`. Thad er EKKI svefn-merki eins og
   thau sem repo-id notar visvitandi (their bera `null`/`why` eda segjast
   sofa) — thad er fullyrding i LIFANDI kafla sem GETUR ekki fallid, svo
   nidurstadan "α helst 1" var prentud sem thekja an ad vera maeld. Ef einhver
   setur alpha-utthenslu inn i `expPointsFor` a morgun hefdi thessi lina
   verid graen og haldid afram ad segja ad alpha se 1.

   NU ER TALAN LESIN UT UR APPINU. Formid sem var maelt her fyrir ofan er
     pred = base * (1 + alpha * (mult - 1))
   og `expPointsFor` skrifar `base * mult` fyrir EINN leik, sem er nakvaemlega
   alpha = 1. Fullyrdingin er thvi TOLULEG jafngilding vid appid sjalft, ekki
   texta-leit — og hun greinir alpha i sundur: sama tilfelli er borid vid
   alpha = 2 og verdur ad vera FRABRUGDID.

   FORSENDAN ER SONNUD FYRST (CLAUDE.md 5b): margfaldarinn verdur ad vera
   FJARRI 1, annars er alpha OSYNILEGT — vid mult = 1 gefa OLL alpha somu
   tolu og fullyrdingin vaeri tom. Maelt: DEF fer ur 1,3455 (thref 0) i
   0,6303 (thref 5), svo badir endar eru profadir.                        */
{
  const pos = 2, base = 5;                       // DEF, ep_next = 5,0
  const p = { element_type: pos, ep_next: "5.0", points_per_game: "5.0", status: "a" };
  const mean = POS_MEAN_PTS[pos];
  const fx = [{ kickoff: "2026-08-21T17:30:00Z" }];
  const nowTs = Date.parse("2026-08-01T00:00:00Z");
  for (const [heiti, d] of [["lettasta threp", 0], ["thyngsta threp", 5]]) {
    const mult = lookupPos(pos, "pts", d) / mean;
    ok(Math.abs(mult - 1) > 0.1,
      `forsenda (${heiti}): margfaldarinn er fjarri 1 (${mult.toFixed(4)}) svo α SEST i tolunni`);
    const got = expPointsFor({ p, fxs: fx, fixDifficulty: () => d, teamId: 1, nowTs });
    ok(Math.abs(got - base * mult) < 1e-9,
      `α HELDUR 1 (${heiti}): expPointsFor = base x margfaldari (${got.toFixed(4)} = ${(base * mult).toFixed(4)})`);
    const a2 = base * (1 + 2 * (mult - 1));
    ok(Math.abs(got - a2) > 1e-6,
      `...og talan GREINIR α i sundur: α=2 gaefi ${a2.toFixed(4)}, ekki ${got.toFixed(4)}`);
  }
}
/* Rokstudningurinn fyrir thvi ad hun EIGI ad vera 1 er athugasemdin her fyrir
   ofan (rodun og birt staerd eru tvo olik storf, sja `rankScore`).         */

/* ---------- NYLIDA-GRUNNURINN: VORDUR GEGN BLINDU FORGILDI ----------
   Maelt 2.8.2026 a 4 nylida-argongum (sja CLAUDE.md kafla 3e). Skekkjan er
   RAUNVERULEG (xP of lagt um +0,95 til +1,26 a byrjunarlidsmonnum, t 3,3-8,3)
   EN ONYTANLEG: a lauginni sem appid beitir grunninum a (ALLIR nylidar,
   n=1994) er xP obreytt BEST — MAE 0,848 a moti 0,873 fyrir 50/50-blondu og
   1,217 fyrir flatt stodu-forgildi. Fjorar SKILYRTAR utfaerslur (a fyrri
   minutum, enginn leki) gafu 0,0005 i MAE og unnu i 2/4 argongum = suð.
   Thessi vordur fellur ef einhver setur stodu-forgildi inn i grunninn.   */
console.log("\n=== NYLIDA-GRUNNURINN (vordur) ===");
{
  const modelSrc = readFileSync(new URL("../src/model.js", import.meta.url), "utf8");
  const fn = modelSrc.slice(modelSrc.indexOf("export function expPointsFor"));
  const body = fn.slice(0, fn.indexOf("\n}\n"));
  ok(/ep_next/.test(body) && /points_per_game/.test(body),
    "VARALEIDIN er ENN ep_next med points_per_game (4.9.2026: hun er "
    + "ekki lengur eina leidin — sja kaflann her a eftir)");
  ok(!/PROMO|promoted|nylid|NYLID/i.test(body),
    "ENGIN nylida-serregla i grunninum — maeld og hafnad, sja kafla 3e");
  ok(!/POS_MEAN_PTS\s*\[/.test(body.replace(/const mean = POS_MEAN_PTS[^;]*;/, "")),
    "POS_MEAN_PTS er adeins notad sem NORMALISERING, ekki sem forgildi a grunninn");
}

/* ============================================================
   6. MAELDI GRUNNURINN (`pointsBase`, 4.9.2026)

   Kaeran: „eg vill lika gera projected points betri, thad er ekkert ad
   marka thau." Orsokin er maeld: `ep_next === form` hja 94,2% theirra
   sem hofdu spilad (lifandi svar 26.8.2026), svo „vaent stig" var i
   framkvaemd 30-daga medaltal — og eftir tvaer umferdir er thad tvaer
   tolur. Sangare bar `ep_next` 9,0 af thvi einu ad hann hafdi skorad
   vel i tveimur leikjum.

   MAELINGIN sjalf er i `scripts/measure-base.mjs` (134.711
   leikmanna-umferdir, 5 timabil) og tolurnar eru i athugasemdinni vid
   `pointsBase`. Thessi kafli ver ThRENNT sem maelingin getur ekki:
     (a) formuluna sjalfa a tilbunum tolum thar sem svarid er thekkt,
     (b) ad hun se SLEPPT — ekki gisk — thegar inntokin vantar,
     (c) AD HUN SE TENGD. Thridja atriðið er ekki formsatridi: `bsdLive`
         var reiknad, vardad og skrifad en ALDREI sent inn i `<Teams>`
         (CLAUDE.md kafli 3), og `lineups.json` er nefnd fyrir sömu
         villu. „Kodinn og verdirnir eru komnir" er EKKI sama og
         „talan lendir a skjanum".
   ============================================================ */
console.log("\n=== 6. MAELDI GRUNNURINN — `pointsBase` ===");
{
  const ON = { seasonStarted: true };
  const P = { element_type: 3, total_points: 11, ep_next: "9.0", points_per_game: "5.5" };
  const F = { mins5: 90, minsTrend: 0, matchesPlayed: 2 };

  /* (a) FORMULAN A TOLUM ThAR SEM SVARID ER REIKNAD I HONDUNUM.
     prevM90 = 2700/90 = 30 · w = 30/(30+5) = 6/7
     prev90  = 120/30 = 4 · posP90 = 1,2342/(60/90) = 1,8513
     prior90 = 6/7 x 4 + 1/7 x 1,8513 = 3,6930
     perMatch = (11 + 8 x 3,6930 x 2/3) / (2 + 8) = 3,0695
     grunnur  = 3,0695 x 90/60 = 4,6043                               */
  const b = pointsBase({ ...ON, ...F, p: P, prevPts: 120, prevMins: 2700 });
  ok(Math.abs(b - 4.6044) < 0.001, `formulan gefur handreiknada svarid (${b.toFixed(4)})`);

  /* MINUTUR ERU MARGFALDARI, EKKI LEIDRETTING.                        */
  const half = pointsBase({ ...ON, ...F, mins5: 45, p: P, prevPts: 120, prevMins: 2700 });
  ok(Math.abs(half - b / 2) < 1e-9, "45 min -> halfur grunnur");
  /* OG ThAER ERU ThAKADAR VID 90 — leitni ma ekki senda mann yfir leikinn. */
  const over = pointsBase({ ...ON, ...F, minsTrend: 40, p: P, prevPts: 120, prevMins: 2700 });
  ok(Math.abs(over - b) < 1e-9, "mins5 + leitni er thakad vid 90");
  const trend = pointsBase({ ...ON, ...F, mins5: 50, minsTrend: 10, p: P,
                             prevPts: 120, prevMins: 2700 });
  ok(trend > pointsBase({ ...ON, ...F, mins5: 50, p: P, prevPts: 120, prevMins: 2700 }),
     "og leitnin telur (mins5 50 + 10 > mins5 50)");

  /* (b) FORGILDID ER SJALFT URTAK OG ER SKRUMPAD EFTIR ThVI.
     ThETTA VAR SYNILEG VILLA A LIFANDI GOGNUM: leikmadur med 12 stig a
     88 minutum i fyrra bar 12,3 stig/90 og fekk grunn > 4,8 ut a ekkert. */
  const tiny = pointsBase({ ...ON, ...F, p: P, prevPts: 12, prevMins: 88 });
  const big  = pointsBase({ ...ON, ...F, p: P, prevPts: 12 * 30, prevMins: 88 * 30 });
  ok(tiny < big, `sama HLUTFALL a litlu urtaki gefur LAEGRI grunn `
    + `(${tiny.toFixed(2)} < ${big.toFixed(2)}) — forgildid er skrumpad eftir minutum`);
  const none = pointsBase({ ...ON, ...F, p: P });
  ok(tiny > none && tiny < big,
     "og 88 minutur liggja MILLI stodu-forgildisins og fulls timabils");

  /* SKRUMPUN EIGIN TALNA SLOKKNAR MED GOGNUM.                         */
  const hot = { element_type: 3, total_points: 20 };
  const small = pointsBase({ ...ON, ...F, p: hot, prevPts: 60, prevMins: 2700 });
  const many  = pointsBase({ ...ON, ...F, matchesPlayed: 30, p: { ...hot, total_points: 300 },
                             prevPts: 60, prevMins: 2700 });
  ok(small < 20 / 2 * (90 / 60), `litid urtak er DREGID NIDUR (${small.toFixed(2)})`);
  /* ATTIN, EKKI THOL: K = 8 skrumpar afram um 17% eftir 38 leiki, svo
     „naerri" er ekki maelanlegt an thess ad velja tolu. Fullyrdingin er
     ad STORT urtak liggi NAER hans eigin hlutfalli en litid gerir.    */
  const own = 300 / 30 * (90 / 60), ownSmall = 20 / 2 * (90 / 60);
  ok(Math.abs(many - own) / own < Math.abs(small - ownSmall) / ownSmall,
     `stort urtak liggur HLUTFALLSLEGA naer hans eigin tolu en litid `
     + `(${(Math.abs(many - own) / own * 100).toFixed(0)}% a moti `
     + `${(Math.abs(small - ownSmall) / ownSmall * 100).toFixed(0)}%)`);

  /* (c) FAAR MAELINGAR -> ENGIN TALA. Hvert vantandi inntak fyrir sig. */
  ok(pointsBase({ ...ON, p: P, matchesPlayed: 2 }) === null, "`mins5` vantar -> ENGIN tala");
  ok(pointsBase({ ...ON, ...F, mins5: null, p: P }) === null, "null `mins5` -> ENGIN tala");
  ok(pointsBase({ ...ON, ...F, mins5: undefined, p: P }) === null, "undefined -> ENGIN tala");
  ok(pointsBase({ ...ON, ...F, mins5: "", p: P }) === null, "tomur strengur -> ENGIN tala");
  ok(Number.isFinite(pointsBase({ ...ON, ...F, mins5: "90", p: P })),
     "en TALA I STRENG er gild — FPL sendir bædi snidin");
  ok(pointsBase({ ...ON, ...F, matchesPlayed: 0, p: P }) === null,
     "ENGIR LEIKNIR LEIKIR -> ENGIN tala (nefnarinn er leikir felagsins)");
  ok(pointsBase({ ...ON, ...F, matchesPlayed: null, p: P }) === null,
     "og null-leikjafjoldi lika");
  ok(pointsBase({ ...ON, ...F, p: null }) === null, "enginn leikmadur -> ENGIN tala");
  ok(pointsBase({ ...ON, ...F, p: { element_type: 3 } }) === null,
     "engin stig a leikmanninum -> ENGIN tala");
  ok(Number.isFinite(pointsBase({ ...ON, ...F, p: P })),
     "an fyrra timabils stendur stodu-forgildid");

  /* KLUKKAN — PROFUD A HEGDUN, EKKI A TEXTA.                          */
  ok(pointsBase({ ...F, p: P }) === null,
     "AN KLUKKUNNAR -> ENGIN tala (forleikur ber minutur FYRRA timabils)");
  ok(pointsBase({ ...F, seasonStarted: false, p: P }) === null, "`false` lika");
  ok(pointsBase({ ...F, seasonStarted: 1, p: P }) === null,
     "og hun er STRONG — `1` er ekki `true`");

  /* HLIDID I `expPointsFor`.                                          */
  const fxs = [{ kickoff: null }];
  const fd = () => 2;
  const off = expPointsFor({ p: P, fxs, fixDifficulty: fd, teamId: 1 });
  const offOff = expPointsFor({ p: P, fxs, fixDifficulty: fd, teamId: 1,
    basis: { ...F, seasonStarted: false } });
  const on = expPointsFor({ p: P, fxs, fixDifficulty: fd, teamId: 1,
    basis: { ...ON, ...F, prevPts: 120, prevMins: 2700 } });
  ok(Math.abs(off - offOff) < 1e-12, "`seasonStarted: false` er sama og enginn basis");
  ok(off > 0, "forsenda: gamla leidin gefur tolu");
  ok(Math.abs(on - off) > 0.5,
     `og med klukkuna a BREYTIST talan raunverulega (${off.toFixed(2)} -> ${on.toFixed(2)})`);
  ok(on < off, "hun laekkar her, thvi ep_next 9,0 var tveggja leikja medaltal");

  /* ============================================================
     (c2) KVORDUNIN — RODIN MA EKKI HREYFAST
     ============================================================
     Bakprofid a 2025/26 syndi ad likanid RADAR betur en SPADI +1,61 of
     hatt i efsta tiundarhlutanum — sem er einmitt lidid hans.
     `a + b*x^g` med b, g > 0 er EINRAEN, svo rodin er obreytt og allar
     topp-15 maelingar standa MED BYGGINGU. Thad er profad her, ekki
     fullyrt.                                                          */
  ok(calibrateExp(0) === 0, "kvordun a 0 er 0 — engar minutur, engin stig");
  ok(calibrateExp(-1) === 0, "og neikvaett inntak gefur 0, ekki NaN");
  ok(calibrateExp(5) < 5 && calibrateExp(5) > 3,
     `hun ThJAPPAR toppinn (5,0 -> ${calibrateExp(5).toFixed(2)})`);
  ok(calibrateExp(1) > 1, `og LYFTIR botninum (1,0 -> ${calibrateExp(1).toFixed(2)})`);
  const xs = [0.1, 0.5, 1, 2, 3, 5, 8, 12];
  ok(xs.every((x, i) => i === 0 || calibrateExp(x) > calibrateExp(xs[i - 1])),
     "EINRAEN — rodin getur ekki hreyfst (profad a 8 gildum)");
  /* OG HUN ER TENGD I `expPointsFor` — ANNARS ER HUN DAUDUR KODI.     */
  const calOn = expPointsFor({ p: P, fxs, fixDifficulty: fd, teamId: 1,
    basis: { ...ON, ...F, prevPts: 120, prevMins: 2700 } });
  const rawBase = pointsBase({ ...ON, ...F, p: P, prevPts: 120, prevMins: 2700 });
  /* MARGFALDARINN ER REIKNADUR BEINT — ekki leiddur ut ur svarinu
     sjalfu. Fyrsta utgafa thessara tveggja fullyrdinga deildi svarinu
     med sjalfu ser (`calOn / calibrateExp(rawBase)`) og var thvi TOM:
     `Math.abs(x - x) >= 0` er alltaf satt.                            */
  const m1 = lookupPos(P.element_type, "pts", 2) / POS_MEAN_PTS[P.element_type];
  ok(Math.abs(calOn - calibrateExp(rawBase * m1)) < 1e-9,
     `expPointsFor er NAKVAEMLEGA cal(grunnur x margfaldari) `
     + `(${calOn.toFixed(4)} = cal(${(rawBase * m1).toFixed(4)}))`);
  ok(Math.abs(calOn - rawBase * m1) > 0.3,
     `og hun er ekki sama tala og OKVORDUD (${calOn.toFixed(2)} a moti `
     + `${(rawBase * m1).toFixed(2)})`);
  /* TILTAEKILEIKI STENDUR UTAN KVORDUNARINNAR OG ThAD ER PROFANLEGT
     ADEINS ThEGAR HANN ER < 1. Fyrsta utgafa thessa kafla profadi
     adeins mann a fullum tiltaekileika, svo stokkbreyting sem faerdi
     `av` INN i kvordunina slapp i gegn (0 fallnar) — badar leidir gefa
     somu tolu vid av = 1. `cal(x)*0,5` og `cal(x*0,5)` eru olik af thvi
     ad kvordunin er ekki hlutfallsleg (hun ber skurdpunkt).          */
  const HURT = { ...P, status: "d", chance_of_playing_next_round: 50 };
  const hurtEp = expPointsFor({ p: HURT, fxs, fixDifficulty: fd, teamId: 1,
    basis: { ...ON, ...F, prevPts: 120, prevMins: 2700 } });
  const hurtBase = pointsBase({ ...ON, ...F, p: HURT, prevPts: 120, prevMins: 2700 });
  ok(Math.abs(hurtEp - calibrateExp(hurtBase * m1) * 0.5) < 1e-9,
     `50% tiltaekileiki margfaldar KVORDUDU toluna (${hurtEp.toFixed(4)})`);
  ok(Math.abs(hurtEp - calibrateExp(hurtBase * m1 * 0.5)) > 0.2,
     `og hann fer EKKI inn i kvordunina (${calibrateExp(hurtBase * m1 * 0.5).toFixed(4)} vaeri rangt)`);

  /* TVOFOLD UMFERD: kvordunin er kupt, svo ad beita henni a SUMMUNA
     myndi thjappa seinni leikinn ranglega. Tveir leikir eiga ad gefa
     naerri tvofalt, ekki `cal(2x)`.                                   */
  const two = expPointsFor({ p: P, fxs: [{ kickoff: null }, { kickoff: null }],
    fixDifficulty: fd, teamId: 1, basis: { ...ON, ...F, prevPts: 120, prevMins: 2700 } });
  ok(Math.abs(two - 2 * calOn) < 1e-9,
     `tvofold umferd er TVISVAR kvordud, ekki kvordun a summunni `
     + `(${two.toFixed(3)} = 2 x ${calOn.toFixed(3)})`);
  /* OG `ep_next`-VARALEIDIN ER EKKI KVORDUD — FPL-talan er theirra
     kvordun og tvaer ofan a hvor adra vaeru tveir kvardar.            */
  const fallback = expPointsFor({ p: P, fxs, fixDifficulty: fd, teamId: 1 });
  ok(Math.abs(fallback - 9 * (fallback / 9)) < 1e-12 && fallback > 9,
     `varaleidin (ep_next 9,0) er OKVORDUD (${fallback.toFixed(2)})`);

  /* (d) TENGINGIN — „kodinn er kominn" er EKKI „talan lendir a skjanum". */
  const appSrc = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const bf = appSrc.slice(appSrc.indexOf("const basisFor"), appSrc.indexOf("function expPoints("));
  ok(/basis:\s*basisFor\(p\)/.test(appSrc),
     "App.jsx SENDIR `basis` inn i expPointsFor");
  ok(/player_form|playerForm/.test(appSrc) && /seasonsFile/.test(appSrc),
     "og hann byggir hann ur skram sem appid les ThEGAR — engin ny sokn");
  /* SAMA SVIDID, EKKI BARA BADA STRENGINA EINHVERS STADAR I BLOKKINNI:
     `playedByClub` stendur lika i deps-fylkinu, svo tvo adskilin
     `test()` stodust thegar `matchesPlayed` var neglt i fasta.        */
  ok(/matchesPlayed:\s*playedByClub/.test(bf),
     "OG HANN SENDIR LEIKJAFJOLDANN UR LEIKJASKRANNI — an hans er nefnarinn "
     + "rangur, ekki tomur", bf.match(/matchesPlayed:[^,\n]*/)?.[0]);
  ok(/minsTrend/.test(bf), "og minutu-leitnina (afbrigdi `B` i leitinni)");
  ok(/seasonStarted/.test(bf), "og klukkuna");
  ok(!/seasonStarted:\s*(true|false|1|0)\b/.test(bf),
     "sem BREYTU, ekki fasta (fasti vaeri hlid sem er alltaf opid)");
  const rotSrc = readFileSync(new URL("../src/rotation.js", import.meta.url), "utf8");
  ok(/basis:\s*basisOf\s*\?/.test(rotSrc),
     "rotation.js sendir grunninn lika (annars tvaer tolur undir sama heiti)");
  ok(/basisOf=\{basisFor\}/.test(appSrc), "og App.jsx gefur honum hann");

  /* (e) LIFANDI THEKJA ER FULLYRDING, EKKI LOGGA.                     */
  const J2 = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
  const PL = J2("players.json"), PF = J2("player_form.json"), PS = J2("player_seasons.json");
  const FX = J2("fixtures.json");
  const played = {};
  for (const f of (Array.isArray(FX) ? FX : FX.fixtures || []))
    if (f.finished || f.finished_provisional) {
      played[f.team_h] = (played[f.team_h] || 0) + 1;
      played[f.team_a] = (played[f.team_a] || 0) + 1;
    }
  const prevKey = PS.seasons?.[0];
  let got = 0, moved = 0;
  for (const p of PL.players || []) {
    const pf = PF.players?.[p.id] || {};
    const pv = PS.players?.[String(p.code)]?.[prevKey];
    const nb = pointsBase({ ...ON, p, mins5: pf.mins5, minsTrend: pf.mins_trend,
      prevPts: pv?.total_points, prevMins: pv?.minutes, matchesPlayed: played[p.team] });
    if (!Number.isFinite(nb)) continue;
    got++;
    if (Math.abs(nb - parseFloat(p.ep_next)) > 0.5) moved++;
  }
  ok(got >= 200, `THEKJA: ${got} leikmenn faa maeldan grunn a raungognum`);
  ok(moved >= got * 0.25,
     `og hann er RAUNVERULEGA annar en ep_next hja ${moved} af ${got} (>25%)`);
}

console.log(`\nVÆNT-STIG: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
