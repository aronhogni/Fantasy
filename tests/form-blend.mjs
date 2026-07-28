/* ============================================================
   AÐLÖGUNAR-BLANDA Á LIÐSSTYRK — W.prev = k/(n+k)

   TILLAGA (P1.1 í Fable-handoff, "stærsti staki vinningurinn +9%"):
   `W.prev` á að vera KVIK, ekki fast 0. n = leikir liðsins ÞETTA
   tímabil, k ≈ 10. GW1 -> allt fyrra tímabil; seint -> nær allt form.

   HVERS VEGNA ÞETTA ER RAUNVERULEGT VANDAMÁL OG EKKI SMÁATRIÐI:
   `DIFF_W` hefur `prev: 0.00` í öllum stöðum, svo `mix()` í model.js
   skilar ALLTAF current. Appið notar því HREINT yfirstandandi tímabil
   í leikjaþyngd — í GW3 er það ÞRÍR leikir af hávaða, og reitirnir
   `prevGoals`/`prevConc` eru þegar lagðir alla leið en ónotaðir.

   OG ÞETTA AFHJÚPAR GALLA Í MÍNUM EIGIN FYRRI MÆLINGUM: öll bakpróf
   hingað til nota `buildStrength(prev)`, þ.e. HREINT fyrra tímabil.
   Það er ekki það sem appið gerir í tímabili — það er hinn endinn á
   sama kvarða. Í forleik (núna) fara þau saman, svo tölurnar giltu um
   GW1, en þær mældu aldrei hegðun appsins í miðju tímabili.

   HÉR ER BÁÐUM ENDUM MÆLT OG SVEIPAÐ Á MILLI, á 14 spáðum tímabilum,
   gegn mörkum OG gegn raunverulegum stigum leikmanna. Sérstaklega er
   mælt í GW-fötum, því ábatinn á að vera EINBEITTUR í byrjun tímabils —
   ef hann er það ekki er tilgátan ekki að lýsa því sem hún segir.

   EKKERT LEKI: `current` notar AÐEINS leiki liðsins sem búnir voru
   fyrir þennan leik.
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloWalkForward, corr, rSE,
} from "./lib/e0.mjs";
import { makeFixDifficulty, LG_SOT } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const eloPre = eloWalkForward(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const PRED = SEASONS.slice(1);
const e0Day = s => { const [d, m, y] = s.split("/"); return `${y.length === 2 ? "20" + y : y}-${m}-${d}`; };

/* ---------- Raðir með BÁÐUM styrkjum (prev og running current) ---------- */
const rows = [];
for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prevRows = byKey[SEASONS[si - 1]];
  const list = [...byKey[key]].sort((a, b) => e0Day(a.Date).localeCompare(e0Day(b.Date)));
  const prevStr = buildStrength(prevRows);
  const teams = [...new Set(list.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  for (const t of teams) if (!prevStr[t]) prevStr[t] = { ...PROMO_DEFAULT };
  /* Hlaupandi summur ÞESSA tímabils — uppfærðar EFTIR hvern leik */
  const run = {};
  for (const t of teams) run[t] = { g: 0, c: 0, sf: 0, sa: 0, n: 0 };
  const curOf = t => {
    const a = run[t];
    return a.n === 0 ? null
      : { xg90: a.g / a.n, xgc90: a.c / a.n, sotFor: a.sf / a.n, sotAg: a.sa / a.n, n: a.n };
  };
  const idx = {}; let nn = 1;
  for (const t of teams) idx[t] = nn++;

  const origIdx = new Map(byKey[key].map((r, i) => [r, i]));
  for (const r of list) {
    const e = eloPre.get(`${key}|${origIdx.get(r)}`);
    const mk = marketForRow(r);
    const FDR = fdrFor(key, prevRows);
    const p = FDR.forFixture(r.HomeTeam, r.AwayTeam);
    for (const [team, opTeam, home, gc, gf, fdr] of [
      [r.HomeTeam, r.AwayTeam, true, +r.FTAG, +r.FTHG, p.h],
      [r.AwayTeam, r.HomeTeam, false, +r.FTHG, +r.FTAG, p.a],
    ]) {
      rows.push({
        season: key, date: r.Date, team, opTeam, home, gc, gf, fdr,
        cs: gc === 0, n: run[team].n, nOpp: run[opTeam].n,
        prevMe: prevStr[team], prevOp: prevStr[opTeam],
        curMe: curOf(team), curOp: curOf(opTeam),
        elo: { me: home ? e.h : e.a, op: home ? e.a : e.h },
        mk: mk ? (home ? { xga: mk.axg, xg: mk.hxg } : { xga: mk.hxg, xg: mk.axg }) : null,
        ids: { me: idx[team], op: idx[opTeam] },
      });
    }
    /* uppfæra EFTIR að röðin var skráð */
    const hs = run[r.HomeTeam], as = run[r.AwayTeam];
    hs.g += +r.FTHG; hs.c += +r.FTAG; hs.sf += +(r.HST || 0); hs.sa += +(r.AST || 0); hs.n++;
    as.g += +r.FTAG; as.c += +r.FTHG; as.sf += +(r.AST || 0); as.sa += +(r.HST || 0); as.n++;
  }
}
console.log(`\n${"=".repeat(78)}`);
console.log(`AÐLÖGUNAR-BLANDA Á LIÐSSTYRK — ${rows.length} lið-leikir, ${PRED.length} tímabil`);
console.log("=".repeat(78));

/* ---------- FFDR fyrir gefið k ----------
   k = 0     -> HREINT yfirstandandi form (það sem appið gerir í dag)
   k = null  -> HREINT fyrra tímabil (það sem bakprófin gerðu)
   annars    -> w_prev = k/(n+k)                                        */
function ffdrFor(k, { withMarket }) {
  const out = { def: [], att: [] };
  /* Byggja per-röð; makeFixDifficulty þarf teamMetrics-kort per leik. */
  for (const r of rows) {
    const blend = (cur, prev, n) => {
      if (cur == null) return prev;                 // fyrsti leikur: aðeins prev
      if (k === 0) return cur;                      // appið í dag
      if (k === null) return prev;                  // bakprófin hingað til
      const w = k / (n + k);
      /* AÐEINS MÖRK ERU BLÖNDUÐ — og það er ekki val heldur skorða:
         team_form.json geymir `prev` aðeins fyrir goals_pg/conceded_pg,
         ekki fyrir skot á mark. Ef sot væri blandað hér en ekki í appinu
         væri mælingin að mæla eitthvað sem er ekki útfæranlegt.        */
      return {
        xg90: (1 - w) * cur.xg90 + w * prev.xg90,
        xgc90: (1 - w) * cur.xgc90 + w * prev.xgc90,
        sotFor: cur.sotFor, sotAg: cur.sotAg,
      };
    };
    const me = blend(r.curMe, r.prevMe, r.n);
    const op = blend(r.curOp, r.prevOp, r.nOpp);
    const teamMetrics = { [r.ids.me]: me, [r.ids.op]: op };
    const teamById = { [r.ids.me]: { short: r.team }, [r.ids.op]: { short: r.opTeam } };
    const eloByTeam = { [r.ids.me]: { elo: r.elo.me }, [r.ids.op]: { elo: r.elo.op } };
    const kickoff = `${r.date}T00:00:00Z`;
    const odds = (withMarket && r.mk) ? {
      [r.team]: { xga: r.mk.xga, xg: r.mk.xg, opp: r.opTeam, kickoff },
    } : null;
    const f = makeFixDifficulty({ teamMetrics, teamById, odds, eloByTeam });
    const fx = { opp: r.ids.op, home: r.home, fdr: r.fdr, kickoff };
    out.def.push(f(r.ids.me, fx, 2));
    out.att.push(f(r.ids.me, fx, 4));
  }
  return out;
}

const KS = [
  ["k=0  HREINT form (appið í dag)", 0],
  ["k=5", 5], ["k=10 (tillagan)", 10], ["k=20", 20], ["k=40", 40],
  ["hreint FYRRA tímabil (bakprófin)", null],
];
const gcArr = rows.map(r => r.gc), gfArr = rows.map(r => r.gf);

for (const withMarket of [false, true]) {
  console.log(`\n${"─".repeat(78)}`);
  console.log(withMarket
    ? "MEÐ MARKAÐSLÍNU (næsta umferð — markaðurinn vegur 0,80 og dempar áhrifin)"
    : "KJARNINN, ÁN MARKAÐAR (allar umferðir nema næsta — hér vegur styrkur mest)");
  console.log("─".repeat(78));
  console.log("stilling                            r(mörk á sig)  |r|(mörk skoruð)   GW1-6 vörn");
  const store = {};
  for (const [label, k] of KS) {
    const F = ffdrFor(k, { withMarket });
    const rGc = corr(F.def, gcArr);
    const rGf = corr(F.att, gfArr);
    /* GW1-6 nálgun: n <= 5 leikir búnir */
    const early = rows.map((r, i) => r.n <= 5 ? i : -1).filter(i => i >= 0);
    const rEarly = corr(early.map(i => F.def[i]), early.map(i => gcArr[i]));
    store[label] = { rGc, rGf, rEarly, F };
    console.log(`  ${label.padEnd(34)} ${rGc.toFixed(3)}          ${Math.abs(rGf).toFixed(3)}` +
      `            ${rEarly.toFixed(3)}`);
  }
  const cur = store["k=0  HREINT form (appið í dag)"], best = store["k=10 (tillagan)"];
  const se = rSE(rows.length);
  console.log(`\n  k=10 á móti k=0:  mörk á sig ${(best.rGc - cur.rGc >= 0 ? "+" : "") + (best.rGc - cur.rGc).toFixed(3)}` +
    `  ·  mörk skoruð ${(Math.abs(best.rGf) - Math.abs(cur.rGf) >= 0 ? "+" : "") + (Math.abs(best.rGf) - Math.abs(cur.rGf)).toFixed(3)}` +
    `  ·  GW1-6 ${(best.rEarly - cur.rEarly >= 0 ? "+" : "") + (best.rEarly - cur.rEarly).toFixed(3)}  (±${se.toFixed(3)})`);
  if (!withMarket) {
    global.__core = store;
    ok(best.rGc > cur.rGc + 2 * se,
      `kjarni: k=10 slær hreint form MARKTÆKT á mörkum á sig (${best.rGc.toFixed(3)} vs ${cur.rGc.toFixed(3)})`);
    ok(best.rEarly > cur.rEarly,
      `og ábatinn er stærstur í GW1-6 (${best.rEarly.toFixed(3)} vs ${cur.rEarly.toFixed(3)})`);
    /* per tímabil */
    let w = 0;
    for (const kk of PRED) {
      const ix = rows.map((r, i) => r.season === kk ? i : -1).filter(i => i >= 0);
      const a = corr(ix.map(i => cur.F.def[i]), ix.map(i => gcArr[i]));
      const b = corr(ix.map(i => best.F.def[i]), ix.map(i => gcArr[i]));
      if (b > a) w++;
    }
    console.log(`  per tímabil: k=10 slær k=0 í ${w}/${PRED.length} tímabilum`);
    ok(w >= PRED.length - 2, `heldur í ≥${PRED.length - 2}/${PRED.length} tímabilum (${w})`);
  }
}

/* ---------- GEGN RAUNVERULEGUM STIGUM ---------- */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const HD = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const POSN = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
const rowIdx = new Map();
rows.forEach((r, i) => rowIdx.set(`${r.season}|${r.date}|${r.team}`, i));
const pl = [];
for (const [season, list] of Object.entries(PG.seasons))
  for (const r of list) {
    if (r[HD.starts] < 1 || r[HD.mins] < 60) continue;
    const i = rowIdx.get(`${season}|${r[HD.date]}|${r[HD.team]}`);
    if (i == null) continue;
    const pos = r[HD.pos] === "GKP" ? "GK" : r[HD.pos];
    if (!POSN[pos]) continue;
    pl.push({ i, pos, code: POSN[pos], pts: r[HD.pts], n: rows[i].n });
  }
console.log(`\n${"─".repeat(78)}\nGEGN RAUNVERULEGUM STIGUM (${pl.length} byrjunarliðs-umferðir, kjarninn)\n${"─".repeat(78)}`);
console.log("staða   n        k=0 (í dag)   k=10       ábati      GW1-6: k=0 -> k=10");
const F0 = ffdrFor(0, { withMarket: false }), F10 = ffdrFor(10, { withMarket: false });
let winPos = 0, totPos = 0;
for (const [pos, code] of Object.entries(POSN)) {
  const g = pl.filter(x => x.pos === pos);
  if (g.length < 200) continue;
  const arr = code <= 2 ? "def" : "att";
  const r0 = corr(g.map(x => F0[arr][x.i]), g.map(x => x.pts));
  const r10 = corr(g.map(x => F10[arr][x.i]), g.map(x => x.pts));
  const e = g.filter(x => x.n <= 5);
  const e0 = corr(e.map(x => F0[arr][x.i]), e.map(x => x.pts));
  const e10 = corr(e.map(x => F10[arr][x.i]), e.map(x => x.pts));
  totPos++; if (Math.abs(r10) > Math.abs(r0)) winPos++;
  console.log(`  ${pos.padEnd(5)} ${String(g.length).padStart(5)}    ${r0.toFixed(3)}        ${r10.toFixed(3)}` +
    `     ${(Math.abs(r10) - Math.abs(r0) >= 0 ? "+" : "") + (Math.abs(r10) - Math.abs(r0)).toFixed(3)}` +
    `      ${e0.toFixed(3)} -> ${e10.toFixed(3)}`);
}
ok(winPos >= totPos - 1, `k=10 spáir stigum betur í ≥${totPos - 1}/${totPos} stöðum (${winPos})`);

console.log(`\nFORM-BLANDA: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
