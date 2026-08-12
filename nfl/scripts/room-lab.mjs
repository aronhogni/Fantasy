#!/usr/bin/env node
/* ============================================================
   room-lab.mjs — HERBERGID SJALFT: HALLAR THAD, OG BREYTIR THAD
   BESTU STEFNUNNI?

     node scripts/room-lab.mjs [--scoring=ppr] [--runs=3]

   -> data/measure/room_<scoring>.json

   HVERS VEGNA THETTA. Allar hermanir i thessu verkefni nota
   "markadsbord = ADP med suði". Thad thydir ad vid hofum aldrei spurt
   hvort HERBERGID hafi kerfislaega skekkju og hvort besta stefnan gegn
   skokku herbergi se onnur en gegn ADP. Vélin hefur alltaf verið til
   (`simulateDraft` tekur vid hvaða markadsbordi sem er); spurningin
   var bara ekki spurd.

   TVEIR HLUTAR, OG FYRRI ER FORSENDA SEIRRA.

   A. ER SKEKKJAN RAUNVERULEG OG FLYST HUN?
      Fyrir hvert timabil er reiknad RAUNVIRDI (VBD ur raunstigum,
      ekki ur spa) og rod thess borin vid ADP-rod. Medaltalid per stodu
      er skekkjan: jakvaett = markadurinn tok stoduna SEINNA en hun
      atti skilid (vanmetin), negatift = of snemma.

      OG THA KEMUR PROFID SEM RAEDUR OLLU: flyst skekkjan milli ara?
      Skekkja sem er ny i hverju ari er urtakshavadi og ENGIN stefna
      getur nytt hana FYRIRFRAM. Sama krafa og felldi domara-spjoldin i
      FPL-verkefninu (r=0,182, 6 af 14 porum negatif) og stodur-gegn-
      lidum. Se hun ekki tholanlega stodug er hluti B akademiskur og
      thad er sagt berum ordum.

   B. BREYTIR HALLINN BESTU STEFNUNNI?
      Byggd eru markadsbord med THVINGADRI skekkju — hver stada faerd
      um `delta` val — og hver stefna hermd gegn theim. Rival er
      ALLTAF hreint VBD an aaetlunar, svo mismunurinn maeli
      AAETLUNINA og ekkert annad.

      Nidurstadan sem skiptir mali er ekki "hvad skorar haest" heldur
      HVORT SIGURVEGARINN BREYTIST. Vinni hreint VBD gegn ollum
      herbergjum er engin ástæda ad byggja herbergis-greiningu, og thad
      er jafn gagnlegt svar og hitt.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2),
  { scoring: ["ppr", "standard"], runs: "number", from: "number" });
const SCORING = String(ARG.scoring || "ppr");
const RUNS = Number(ARG.runs || 3);
const FROM = Number(ARG.from || 2015);
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
const POS = ["QB", "RB", "WR", "TE"];
/* Draftanlega bilid. Skekkja maeld a ollum 400 leikmonnum vaeri
   raunverulega "hverjir voru aldrei draftadir", sem er onnur spurning. */
const DRAFTABLE = 150;
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

const corr = (xs, ys) => {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    sxy += a * b; sxx += a * a; syy += b * b;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
};
const tOf = (a) => {
  const v = a.filter((x) => x != null);
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
};

/** VBD ur TOLU sem er gefin (spa eda raunstig) — sama formula. */
function vbdFrom(pool, get) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const out = new Map();
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map(get).filter((v) => v != null).sort((a, b) => b - a);
    if (!vals.length) continue;
    const k = Math.min(vals.length - 1, (REPL[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) { const v = get(p); if (v != null) out.set(p.id, v - base); }
  }
  return out;
}

const denseRank = (arr) => new Map(arr.map((p, i) => [p.id, i + 1]));

/* AAETLANIRNAR. `null` = engin — taktu besta lausa mann, sem er
   nuverandi hegdun appsins og thvi vidmidid. */
const A = ["QB", "RB", "WR", "TE"];
const plan = (...rounds) => {
  const p = Array.from({ length: ROUNDS }, () => A);
  rounds.forEach((r, i) => { if (r) p[i] = r; });
  return p;
};
const STRATS = [
  { key: "bpa", label: "besti lausi (nuverandi)", plan: null },
  { key: "rb2", label: "RB i tveimur fyrstu", plan: plan(["RB"], ["RB"]) },
  { key: "wr2", label: "WR i tveimur fyrstu", plan: plan(["WR"], ["WR"]) },
  { key: "te_early", label: "TE i 2. umferd", plan: plan(A, ["TE"]) },
  { key: "zero_rb", label: "enginn RB fyrstu fjorar", plan: plan(
    ["WR", "TE", "QB"], ["WR", "TE", "QB"], ["WR", "TE", "QB"], ["WR", "TE", "QB"]) },

  /* ============================================================
     TVAER SIDUSTU KOMA UR MAELINGUNNI SJALFRI, EKKI UR LISTA.
     ============================================================
     `relBias` segir ad RB se tekinn of snemma A OLLUM BILUM — en
     refsingin er adeins -9,3 i volum 1-24 og -17,5 til -22,3 eftir
     thad. Sama tafla segir ad WR (+7 til +8) og TE (+16 til +18) seu
     vanmetnir a NAKVAEMLEGA theim bilum.

     Tilgatan sem thad gefur er thvi ekki "RB eda ekki RB" heldur:
     ELITU-RB ER I LAGI, MID-RB ER THAR SEM VILLAN LIGGUR. Thad er
     profanlegt og thad er profad her — annars vaeri taflan bara
     athugun sem enginn brast a.

     VARNAGLI: thessar tvaer voru valdar EFTIR ad taflan var skodud.
     Med sjo stefnum er throskuldurinn ekki t>2,23 heldur ~3,5
     (Bonferroni, 10 fritt). Thad er skrifad her svo enginn lesi
     staka tolu og telji sig hafa fundid nokkud.                     */
  { key: "no_mid_rb", label: "enginn RB i umf. 3-7", plan: plan(
    A, A, ["WR", "TE", "QB"], ["WR", "TE", "QB"], ["WR", "TE", "QB"],
    ["WR", "TE", "QB"], ["WR", "TE", "QB"]) },
  { key: "rb2_fade", label: "RB x2, tha enginn til umf. 8", plan: plan(
    ["RB"], ["RB"], ["WR", "TE", "QB"], ["WR", "TE", "QB"], ["WR", "TE", "QB"],
    ["WR", "TE", "QB"], ["WR", "TE", "QB"]) },
];

/* HERBERGIN. `delta` er i VOLUM: negatift = stadan er tekin FYRR en
   ADP segir. Staerdirnar eru valdar ur hluta A (sja `biasScale`). */
const ROOMS = [
  { key: "adp", label: "ADP eins og hun er", d: {} },
  { key: "rb_early", label: "RB-thungt herbergi", d: { RB: -10, WR: 5, TE: 8 } },
  { key: "wr_early", label: "WR-thungt herbergi", d: { WR: -10, RB: 5, TE: 8 } },
  { key: "te_late", label: "TE fellur seint", d: { TE: 18 } },
  { key: "qb_early", label: "QB teknir snemma", d: { QB: -20 } },
];

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r.adp != null).map((r) => r.season))]
    .sort().filter((y) => y >= FROM && y <= 2025);

  const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
  const pools = {};
  for (const y of years) {
    const yr = rows.filter((r) => r.season === y && r.adp != null &&
      (r.sleeperProj != null || r.ffProj != null));
    if (yr.length < 120) continue;
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos, name: r.name,
      proj: r.sleeperProj != null ? r.sleeperProj : r.ffProj,
      adp: r.adp, adpSd: r.adpSd, actual: pts(r) })).filter((p) => p.actual != null);
    if (pool.length >= 120) pools[y] = pool;
  }
  const ys = Object.keys(pools).map(Number).sort((a, b) => a - b);
  requireSeasons(ys, 6, "room-lab");

  /* ---------- A. HALLAR HERBERGID, OG FLYST HALLINN? ---------- */
  console.log(`\nA. KERFISLAEG SKEKKJA I ADP  (${SCORING}, ${ys.length} ar)`);
  console.log(`   jakvaett = markadurinn tok stoduna SEINNA en hun atti skilid\n`);
  console.log(`   ar     ${POS.map((p) => p.padStart(7)).join("")}`);
  const bias = {};
  for (const y of ys) {
    const pool = pools[y];
    const realVbd = vbdFrom(pool, (p) => p.actual);
    const byAdp = pool.slice().sort((a, b) => a.adp - b.adp);
    const byReal = pool.filter((p) => realVbd.has(p.id))
      .sort((a, b) => realVbd.get(b.id) - realVbd.get(a.id));
    const rAdp = denseRank(byAdp), rReal = denseRank(byReal);
    bias[y] = {};
    for (const pos of POS) {
      const d = byAdp.slice(0, DRAFTABLE).filter((p) => p.pos === pos && rReal.has(p.id))
        .map((p) => rAdp.get(p.id) - rReal.get(p.id));
      bias[y][pos] = d.length >= 5 ? r1(mean(d)) : null;
    }
    console.log(`   ${y}   ${POS.map((p) => String(bias[y][p] ?? "—").padStart(7)).join("")}`);
  }

  /* ============================================================
     HVAR I RODINNI LIGGUR SKEKKJAN? — THETTA ER EKKI SKRAUT.
     ============================================================
     Medaltal yfir 150 leikmenn getur falid tvo andstaed merki. RB
     maelist -23 ad medaltali (tekinn OF SNEMMA) og samt vinnur "RB i
     tveimur fyrstu" i hluta B. Thad tvennt getur ekki badid verid rett
     um SAMA bilid, svo annadhvort er annad rangt eda skekkjan er ekki
     jafndreifd. Bilin svara thvi.                                    */
  const BUCKETS = [[1, 24], [25, 60], [61, 100], [101, 150]];
  const bucketBias = {};
  console.log(`\n   SKEKKJAN EFTIR BILI I ADP (medaltal allra ${ys.length} ara)`);
  console.log(`   bil        ${POS.map((p) => p.padStart(7)).join("")}`);
  for (const [lo, hi] of BUCKETS) {
    const key = `${lo}-${hi}`;
    bucketBias[key] = {};
    for (const pos of POS) {
      const per = [];
      for (const y of ys) {
        const pool = pools[y];
        const realVbd = vbdFrom(pool, (p) => p.actual);
        const byAdp = pool.slice().sort((a, b) => a.adp - b.adp);
        const byReal = pool.filter((p) => realVbd.has(p.id))
          .sort((a, b) => realVbd.get(b.id) - realVbd.get(a.id));
        const rAdp = denseRank(byAdp), rReal = denseRank(byReal);
        const d = byAdp.slice(lo - 1, hi)
          .filter((p) => p.pos === pos && rReal.has(p.id))
          .map((p) => rAdp.get(p.id) - rReal.get(p.id));
        if (d.length >= 3) per.push(mean(d));
      }
      bucketBias[key][pos] = per.length >= Math.ceil(ys.length / 2)
        ? { mean: r1(mean(per)), t: tOf(per), years: per.length } : null;
    }
    console.log(`   ${key.padEnd(11)}${POS.map((p) => {
      const q = bucketBias[key][p];
      return String(q ? q.mean : "—").padStart(7);
    }).join("")}`);
  }
  console.log(`   t          ${POS.map((p) => {
    const q = bucketBias["1-24"][p];
    return String(q ? q.t : "—").padStart(7);
  }).join("")}   <- efsta bilid`);

  /* ============================================================
     ALGILDA TALAN ER SPILLT AF AFTURHVARFI — AFSTAEDA ER SVARID.
     ============================================================
     Toppur HVERRAR rodunar fellur ad medaltali: madur sem er valinn
     nr. 5 getur adeins ordid betri um fjogur saeti en verri um 300.
     Thess vegna er efsta bilid negatift i ollum stodum og talan -40,8
     hja RB er thvi EKKI oll skekkja — hun er skekkja PLUS afturhvarf,
     og afturhvarfid er thad sama fyrir alla.

     Rétta talan er AFSTAED innan bils: hver stada minus medaltal
     bilsins. Tha fellur afturhvarfid ut, thvi thad snertir alla eins,
     og eftir stendur "hvada stodu tekur herbergid of snemma MIDAD VID
     hinar" — sem er einmitt spurningin.                              */
  const relBias = {};
  console.log(`\n   AFSTAED SKEKKJA INNAN BILS (afturhvarf dregid ut)`);
  console.log(`   bil        ${POS.map((p) => p.padStart(7)).join("")}`);
  for (const [lo, hi] of BUCKETS) {
    const key = `${lo}-${hi}`;
    const vals = POS.map((p) => bucketBias[key][p]).filter(Boolean).map((q) => q.mean);
    const base = vals.length ? mean(vals) : 0;
    relBias[key] = {};
    for (const pos of POS) {
      const q = bucketBias[key][pos];
      relBias[key][pos] = q ? r1(q.mean - base) : null;
    }
    console.log(`   ${key.padEnd(11)}${POS.map((p) =>
      String(relBias[key][p] ?? "—").padStart(7)).join("")}`);
  }

  /* MEDALTALID ER EKKI SVARID — THRAUTSEIGJAN ER. */
  console.log(`\n   medaltal${POS.map((p) =>
    String(r1(mean(ys.map((y) => bias[y][p]).filter((x) => x != null)))).padStart(7)).join("")}`);
  console.log(`   t     ${POS.map((p) =>
    String(tOf(ys.map((y) => bias[y][p]))).padStart(7)).join("")}`);

  const persist = {};
  for (const pos of POS) {
    const a = [], b = [];
    for (let i = 1; i < ys.length; i++) {
      const x = bias[ys[i - 1]][pos], z = bias[ys[i]][pos];
      if (x != null && z != null) { a.push(x); b.push(z); }
    }
    const pairs = a.map((x, i) => [x, b[i]]);
    persist[pos] = { r: r3(corr(a, b)), pairs: pairs.length,
      negative: pairs.filter(([x, z]) => x * z < 0).length };
  }
  console.log(`\n   FLYST HUN? r(ar N -> N+1) per stodu:`);
  for (const pos of POS) {
    const q = persist[pos];
    console.log(`     ${pos}  r=${String(q.r).padStart(7)}  ` +
      `${q.pairs} por · ${q.negative} med skiptu formerki`);
  }
  const usable = POS.filter((p) => persist[p].r != null && persist[p].r > 0.3 &&
    persist[p].negative <= Math.floor(persist[p].pairs / 3));
  console.log(`\n   NYTANLEG FYRIRFRAM: ${usable.length ? usable.join(", ") : "ENGIN"}`);
  if (!usable.length) {
    console.log(`   -> Hallinn er raunverulegur i hverju ari en ENDURTEKUR SIG EKKI.`);
    console.log(`      Hluti B maelir thvi hvad VAERI haegt ef hann endurtaeki sig —`);
    console.log(`      thad er efri mork, ekki tillaga.`);
  }

  /* ---------- B. BREYTIR HALLINN BESTU STEFNUNNI? ---------- */
  console.log(`\nB. BESTA STEFNAN GEGN HVERJU HERBERGI  (stig gegn hreinu VBD)\n`);
  const grid = {};
  for (const room of ROOMS) {
    grid[room.key] = {};
    for (const st of STRATS) grid[room.key][st.key] = [];
  }

  for (const y of ys) {
    const pool = pools[y];
    const projVbd = vbdFrom(pool, (p) => p.proj);
    const ranked = pool.filter((p) => projVbd.has(p.id))
      .sort((a, b) => projVbd.get(b.id) - projVbd.get(a.id));
    const pure = denseRank(ranked);
    const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }]));

    for (const room of ROOMS) {
      /* Herbergid: ADP faerd um `delta` per stodu og endurrodad. Suðið
         er THAD SAMA fyrir oll herbergi (sama fræ) svo mismunurinn
         megi ekki koma ur odru suði. */
      const field = (seed) => {
        let a = seed >>> 0;
        const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
        const s = pool.map((p) => [p.id,
          p.adp + (room.d[p.pos] || 0) + (rnd() + rnd() + rnd() - 1.5) * 8])
          .sort((x, z) => x[1] - z[1]);
        return denseRank(s.map(([id]) => ({ id })));
      };

      for (const st of STRATS) {
        const d = [];
        for (let r = 0; r < RUNS; r++) {
          const f2 = field(y * 1000 + r * 7919);
          for (let i = 1; i <= TEAMS; i++) {
            const j = i % TEAMS + 1;
            for (const swap of [false, true]) {
              const res = simulateDraft({ board: pure, fieldBoard: f2, actual,
                slot: swap ? j : i, league: LEAGUE, plan: st.plan,
                rival: { slot: swap ? i : j, board: pure } });
              d.push(res.points - res.rivalPoints);
            }
          }
        }
        grid[room.key][st.key].push(r1(mean(d)));
      }
    }
  }

  const head = STRATS.map((s) => s.key.padStart(10)).join("");
  console.log(`   herbergi            ${head}`);
  const summary = {};
  for (const room of ROOMS) {
    summary[room.key] = {};
    const cells = STRATS.map((st) => {
      const v = grid[room.key][st.key];
      const m = mean(v), t = tOf(v);
      summary[room.key][st.key] = { mean: r1(m), t, wins: v.filter((x) => x > 0).length,
                                    years: v.length };
      return String(r1(m)).padStart(10);
    }).join("");
    console.log(`   ${room.label.padEnd(20)}${cells}`);
  }

  console.log(`\n   HVER VINNUR I HVERJU HERBERGI (og er thad marktaekt?)`);
  let winnerChanges = false;
  for (const room of ROOMS) {
    let best = "bpa", bv = 0;
    for (const st of STRATS) {
      const q = summary[room.key][st.key];
      if (st.key !== "bpa" && q.mean > bv) { bv = q.mean; best = st.key; }
    }
    const q = summary[room.key][best];
    /* Bonferroni fyrir 7 stefnur: ~3,5, ekki 2,23. */
      const sig = q.t != null && Math.abs(q.t) > 3.5;
    if (best !== "bpa" && sig) winnerChanges = true;
    console.log(`     ${room.label.padEnd(20)} ${best === "bpa" ? "besti lausi madur"
      : `${best} (+${q.mean}, ${q.wins}/${q.years} ar, t=${q.t})`}` +
      `${best !== "bpa" ? (sig ? "  MARKTAEKT" : "  ekki marktaekt") : ""}`);
  }

  console.log(`\n   ${winnerChanges
    ? "SIGURVEGARINN BREYTIST -> herbergis-greining getur skilad einhverju."
    : "SIGURVEGARINN BREYTIST EKKI -> hreint VBD stendur gegn ollum herbergjum"
      + "\n   sem voru profud. Engin astaeda ad byggja herbergis-greiningu."}`);

  await mkdir(path.join(OUT, "measure"), { recursive: true });
  await writeFile(path.join(OUT, "measure", `room_${SCORING}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", runs: 3, from: 2015 },
      resolved: { scoring: SCORING, runs: RUNS, draftable: DRAFTABLE,
                  rooms: ROOMS.map((r) => r.key), strats: STRATS.map((s) => s.key) },
      inputs: ["features.json"], dataDir: OUT }),
    scoring: SCORING, seasons: ys,
    bias, bucketBias, relBias, biasPersistence: persist, usableAhead: usable,
    rooms: ROOMS, strategies: STRATS.map((s) => ({ key: s.key, label: s.label })),
    perRoom: summary, raw: grid, winnerChanges,
  }, null, 1));
  console.log(`\n-> data/measure/room_${SCORING}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
