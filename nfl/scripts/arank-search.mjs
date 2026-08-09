#!/usr/bin/env node
/* ============================================================
   arank-search.mjs — VIDTAEK LEIT AD BETRI A-RANKING.

     node scripts/arank-search.mjs [--scoring=ppr] [--runs=25]

   -> data/arank_search_<scoring>.json

   MARKID ER SKYRT OG THAD ER STAERDFRAEDILEGT:
   med fimm timabilum og klosun eftir ari er LAEGSTA MOGULEGA p-gildi
   1/32 = 0,031, og thad naest ADEINS ef afbrigdi vinnur OLL FIMM
   arin. Ekkert annad dugar. Leitin er thvi ad einu: bordi sem vinnur
   5/5 i PPR.

   OG THAD ER NAKVAEMLEGA THESS VEGNA SEM LEITIN ER HAETTULEG.
   Ef 500 afbrigdi eru profud munu morg vinna 5/5 af HREINNI TILVILJUN
   — vaentifjoldinn undir nulltilgatu er 500/32 = 15,6. Ad finna eitt
   og birta p=0,031 vaeri thvi hrein blekking.

   THRJAR VARNIR ERU BYGGDAR INN:
     1. TALID er hve morg afbrigdi vinna 5/5, og thad borid saman vid
        vaentifjoldann. Se hann svipadur er leitin ad finna havada.
     2. WALK-FORWARD: afbrigdid er valid a fyrri arum og beitt a thad
        naesta. Thad er eina talan sem er ekki urtaksval.
     3. FJOLPROFA-LEIDRETTING: p-gildi bestu er margfaldad med fjolda
        afbrigda (Bonferroni). Hun er groft ihaldssom og thad er
        viljandi.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean } from "../src/learn.js";

const OUT = path.resolve(process.cwd(), "data");
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true];
}));
const SCORING = String(ARG.scoring || "ppr");
const RUNS = Number(ARG.runs || 25);
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };

/* ============================================================
   AFBRIGDIN — fimm hugmyndir, hver med sinar forsendur
   ============================================================ */

/**
 * Byggir bord ur laug. `cfg` lysir hugmyndinni.
 *
 *   repl      varamanns-threp per stodu
 *   shrink    faerir spa ad medaltali stodunnar (thykkir halar)
 *   blend     hve mikid af HRASTIGUM helst (0 = hreint VBD)
 *   adpPull   faerir okkar rod ad ADP-rod (0 = engin, 1 = ADP)
 *   avail     leidretting fyrir tiltaekileika ur endingu
 *   tierAdp   innan threps: rada eftir ADP i stad VBD
 *   posBlend  blondun per stodu i stad einnar tolu
 */
function buildBoard(pool, cfg) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);

  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    /* TILTAEKILEIKA-LEIDRETTING: Sleeper spair TIMABILS-SUMMU en
       verdleggur ekki endingu serstaklega. `avail` faerir spana i att
       ad thvi hlutfalli moguleika sem madurinn hefur raunverulega
       spilad sidustu tvo ar. Vantar `durability` -> engin leidretting
       (nyliði a enga sogu og ma ekki refsast fyrir thad). */
    const adj = list.map((p) => {
      let v = p.proj;
      if (cfg.avail && p.durability != null) {
        v *= 1 - cfg.avail * (1 - Math.min(1, Math.max(0.5, p.durability)));
      }
      return v;
    });

    const vals = adj.slice().sort((a, b) => b - a);
    const m = mean(vals);
    const k = Math.min(vals.length - 1, (cfg.repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    const blend = cfg.posBlend ? (cfg.posBlend[pos] ?? cfg.blend ?? 0) : (cfg.blend ?? 0);

    list.forEach((p, i) => {
      const proj = adj[i] * (1 - (cfg.shrink ?? 0)) + m * (cfg.shrink ?? 0);
      const v = proj - base;
      scored.push([p, (1 - blend) * v + blend * proj]);
    });
  }

  scored.sort((a, b) => b[1] - a[1]);
  let order = scored.map(([p]) => p);

  /* THREPA-FLETING: innan threps eru menn naerri jafngodir, svo
     retta rodin innan thess er "sa sem verdur farinn fyrst". Thad er
     ADP. Hugmyndin er godkunn i draft-umraedu og hefur aldrei verid
     maeld svo vitad se. */
  if (cfg.tierAdp) {
    const size = cfg.tierAdp;
    const out = [];
    for (let i = 0; i < order.length; i += size) {
      const tier = order.slice(i, i + size).sort((a, b) => a.adp - b.adp);
      out.push(...tier);
    }
    order = out;
  }

  /* ADP-DRATTUR: faerir okkar rod hlutfallslega ad markadsrodinni.
     Rok: markadurinn ber upplysingar sem spain hefur ekki (frettir,
     stodubreytingar), og hann er lika thad sem motherjarnir gera. */
  if (cfg.adpPull) {
    const ourRank = new Map(order.map((p, i) => [p.id, i + 1]));
    const adpRank = new Map(pool.slice().sort((a, b) => a.adp - b.adp)
      .map((p, i) => [p.id, i + 1]));
    order = order.slice().sort((a, b) =>
      ((1 - cfg.adpPull) * ourRank.get(a.id) + cfg.adpPull * adpRank.get(a.id)) -
      ((1 - cfg.adpPull) * ourRank.get(b.id) + cfg.adpPull * adpRank.get(b.id)));
  }

  return new Map(order.map((p, i) => [p.id, i + 1]));
}

/* ---------- netid ---------- */
function grid() {
  const out = [];
  /* Varamanns-threp: leitad FRJALST per stodu i stad fastra setta. */
  const QB = [10, 12, 16, 20];
  const RB = [24, 28, 32, 36, 40];
  const WR = [30, 36, 41, 48, 55];
  const TE = [10, 12, 14, 18];
  for (const qb of QB) for (const rb of RB) for (const wr of WR) for (const te of TE) {
    out.push({ kind: "repl", repl: { QB: qb, RB: rb, WR: wr, TE: te } });
  }
  /* Hinar hugmyndirnar ofan a THVI THREPI SEM ER I NOTKUN i dag, svo
     ahrif theirra seu adgreind fra threpinu sjalfu. */
  const BASE = { QB: 12, RB: 28, WR: 41, TE: 14 };
  for (const blend of [0.1, 0.2, 0.3, 0.4]) out.push({ kind: "blend", repl: BASE, blend });
  for (const shrink of [0.1, 0.2, 0.3]) out.push({ kind: "shrink", repl: BASE, shrink });
  for (const adpPull of [0.1, 0.2, 0.3, 0.5]) out.push({ kind: "adpPull", repl: BASE, adpPull });
  for (const avail of [0.3, 0.6, 1.0]) out.push({ kind: "avail", repl: BASE, avail });
  for (const tierAdp of [4, 6, 8, 12]) out.push({ kind: "tierAdp", repl: BASE, tierAdp });
  /* Blondun per stodu — QB og TE eru flatar stodur, RB og WR brattar. */
  for (const q of [0, 0.3]) for (const w of [0, 0.3]) {
    out.push({ kind: "posBlend", repl: BASE,
               posBlend: { QB: q, TE: q, RB: w, WR: w } });
  }
  return out.map((c, i) => ({ ...c, id: i }));
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r.sleeperProj != null).map((r) => r.season))].sort();

  const world = {};
  for (const y of years) {
    const yr = rows.filter((r) => r.season === y && r.adp != null && r.sleeperProj != null);
    if (yr.length < 120) continue;
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos, proj: r.sleeperProj,
      adp: r.adp, adpSd: r.adpSd, durability: r.durability, actual: pts(r) }));
    world[y] = {
      pool,
      actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }])),
      field: new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1])),
      sleeper: new Map(pool.slice().sort((a, b) => b.proj - a.proj).map((p, i) => [p.id, i + 1])),
    };
  }
  const ys = Object.keys(world).map(Number).sort();
  console.log(`${SCORING.toUpperCase()} · ${ys.length} timabil: ${ys.join(", ")}`);

  const G = grid();
  console.log(`afbrigdi i leit: ${G.length}`);

  /* ---------- FASI 1: HRODUR SKIMUN ----------
     Afradinn voll, 12 saeti, per ar. 60 hermanir per afbrigdi.
     Hér er ekki verid ad maela heldur ad THRENGJA. */
  const sleeperSep = {};
  for (const y of ys) {
    const w = world[y];
    sleeperSep[y] = mean(range(1, TEAMS).map((slot) =>
      simulateDraft({ board: w.sleeper, fieldBoard: w.field, actual: w.actual,
        slot, league: LEAGUE }).points));
  }

  const screened = G.map((cfg) => {
    const per = {};
    for (const y of ys) {
      const w = world[y];
      const board = buildBoard(w.pool, cfg);
      per[y] = mean(range(1, TEAMS).map((slot) =>
        simulateDraft({ board, fieldBoard: w.field, actual: w.actual,
          slot, league: LEAGUE }).points));
    }
    const wins = ys.filter((y) => per[y] > sleeperSep[y]).length;
    return { cfg, per, wins, mean: mean(ys.map((y) => per[y])),
             diff: mean(ys.map((y) => per[y] - sleeperSep[y])) };
  });

  const sweep = screened.filter((s) => s.wins === ys.length);
  const expected = G.length / 2 ** ys.length;
  console.log(`\nafbrigdi sem vinna ${ys.length}/${ys.length}: ${sweep.length}`);
  console.log(`vaentifjoldi undir nulltilgatu:      ${expected.toFixed(1)}`);
  console.log(sweep.length > expected * 2
    ? "-> fleiri en tilviljun skyrir. Their eru samt urtaksval; sja fasa 3."
    : "-> EKKI fleiri en tilviljun skyrir. Leitin er ad finna havada.");

  screened.sort((a, b) => b.diff - a.diff);
  console.log("\n  best i skimun (adskilin droft):");
  for (const s of screened.slice(0, 8)) {
    console.log(`    ${sgn(s.diff).padStart(7)}  ${s.wins}/${ys.length}  ${describe(s.cfg)}`);
  }

  /* ---------- FASI 2: EINVIGI A URSLITAKOSTUM ----------
     Adeins their sem vinna oll arin i skimun (eda topp 6) fara i
     dyru maelinguna: bædi bordin i SOMU deild, med draft-havada. */
  const finalists = [...new Set([...sweep.slice(0, 12), ...screened.slice(0, 6)])];
  console.log(`\nurslitakostir i einvigi: ${finalists.length}`);

  const h2h = finalists.map((s) => ({ ...s, h: headToHead(world, ys, s.cfg) }))
    .sort((a, b) => b.h.mean - a.h.mean);

  console.log("\n  einvigi (bædi bordin i somu deild, med draft-havada):");
  console.log("    munur   vinnur   %einviga   p(tekna)  afbrigdi");
  for (const s of h2h.slice(0, 10)) {
    console.log(`    ${sgn(s.h.mean).padStart(7)}   ${s.h.yearWins}/${ys.length}` +
      `    ${(s.h.winRate * 100).toFixed(1)}%     ${String(s.h.signP).padEnd(7)}  ${describe(s.cfg)}`);
  }

  /* ---------- FASI 3: HEIDARLEIKA-PROFIN ---------- */
  const best = h2h[0];
  const bonferroni = Math.min(1, best.h.signP * G.length);

  /* Walk-forward: veldu a fyrri arum, beittu a thad naesta. */
  const wf = [];
  for (let i = 1; i < ys.length; i++) {
    const y = ys[i], prior = ys.slice(0, i);
    const pick = screened.slice().sort((a, b) =>
      mean(prior.map((p) => b.per[p] - sleeperSep[p])) -
      mean(prior.map((p) => a.per[p] - sleeperSep[p])))[0];
    wf.push({ year: y, chosen: describe(pick.cfg),
              diff: round1(pick.per[y] - sleeperSep[y]) });
  }
  const wfWins = wf.filter((w) => w.diff > 0).length;

  console.log(`\n${"=".repeat(84)}`);
  console.log("  HEIDARLEIKA-PROFIN");
  console.log("=".repeat(84));
  console.log(`  besta afbrigdi         : ${describe(best.cfg)}`);
  console.log(`  einvigi                : ${sgn(best.h.mean)} stig, ${best.h.yearWins}/${ys.length} ar, ` +
    `${(best.h.winRate * 100).toFixed(1)}% einviga`);
  console.log(`  hratt tekna-prof       : p = ${best.h.signP}`);
  console.log(`  Bonferroni (${G.length} prof) : p = ${round3(bonferroni)}  ` +
    (bonferroni < 0.05 ? "MARKTAEKT" : "EKKI marktaekt"));
  console.log(`\n  walk-forward (valid a fyrri arum):`);
  for (const w of wf) console.log(`    ${w.year}  ${sgn(w.diff).padStart(7)}   <- ${w.chosen}`);
  console.log(`    vinnur ${wfWins}/${wf.length} · medaltal ${sgn(mean(wf.map((w) => w.diff)))}`);

  const verdict = bonferroni < 0.05
    ? "MARKTAEKT eftir fjolprofa-leidrettingu"
    : (wfWins === wf.length
        ? "ekki marktaekt, en walk-forward vinnur oll arin — verdur maelanlegt med fleiri timabilum"
        : "EKKI marktaekt. Leitin fann ekki bord sem stenst.");
  console.log(`\n  NIDURSTADA: ${verdict}`);

  await writeFile(path.join(OUT, `arank_search_${SCORING}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    scoring: SCORING, seasons: ys, variants: G.length,
    sweepCount: sweep.length, sweepExpectedByChance: round1(expected),
    best: { cfg: best.cfg, describe: describe(best.cfg), h2h: best.h,
            bonferroni: round3(bonferroni) },
    top: h2h.slice(0, 10).map((s) => ({ describe: describe(s.cfg), ...s.h })),
    walkForward: { picks: wf, wins: wfWins, mean: round1(mean(wf.map((w) => w.diff))) },
    verdict,
  }, null, 1));
  console.log(`\n-> data/arank_search_${SCORING}.json`);
}

/* ---------- einvigi ---------- */
function headToHead(world, ys, cfg) {
  const diffs = [], byYear = {};
  for (const y of ys) {
    const w = world[y];
    const board = buildBoard(w.pool, cfg);
    const d = [];
    for (let r = 0; r < RUNS; r++) {
      const field = r === 0 ? w.field : noisyField(w.pool, y * 1000 + r * 7919);
      for (let i = 1; i <= TEAMS; i++) {
        const j = i % TEAMS + 1;
        for (const swap of [false, true]) {
          const s = simulateDraft({
            board, fieldBoard: field, actual: w.actual,
            slot: swap ? j : i, league: LEAGUE,
            rival: { slot: swap ? i : j, board: w.sleeper },
          });
          d.push(s.points - s.rivalPoints);
        }
      }
    }
    byYear[y] = round1(mean(d));
    diffs.push(...d);
  }
  const yearVals = ys.map((y) => byYear[y]);
  const yearWins = yearVals.filter((v) => v > 0).length;
  return {
    mean: round1(mean(yearVals)), byYear, yearWins,
    winRate: round4(diffs.filter((d) => d > 0).length / diffs.length),
    n: diffs.length,
    signP: round4(binomialTail(yearWins, ys.length)),
  };
}

function noisyField(pool, seed) {
  let a = seed >>> 0;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const gauss = () => {
    const u = Math.max(1e-9, rnd()), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return new Map(pool.map((p) => {
    const sd = p.adpSd > 0 ? p.adpSd : 1.08 * Math.sqrt(Math.max(1, p.adp));
    return [p.id, p.adp + gauss() * sd];
  }).sort((x, y) => x[1] - y[1]).map(([id], i) => [id, i + 1]));
}

function describe(c) {
  const bits = [`QB${c.repl.QB}/RB${c.repl.RB}/WR${c.repl.WR}/TE${c.repl.TE}`];
  if (c.blend) bits.push(`blend ${c.blend}`);
  if (c.shrink) bits.push(`shrink ${c.shrink}`);
  if (c.adpPull) bits.push(`adpPull ${c.adpPull}`);
  if (c.avail) bits.push(`avail ${c.avail}`);
  if (c.tierAdp) bits.push(`tierAdp ${c.tierAdp}`);
  if (c.posBlend) bits.push(`posBlend QB/TE ${c.posBlend.QB} RB/WR ${c.posBlend.RB}`);
  return bits.join(", ");
}

function binomialTail(k, n) {
  let s = 0;
  for (let i = k; i <= n; i++) s += choose(n, i);
  return s / 2 ** n;
}
function choose(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; }
const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
const sgn = (x) => (x == null ? "-" : (x > 0 ? "+" : "") + x.toFixed(1));
const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const round3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const round4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);

main().catch((e) => { console.error(e); process.exit(1); });
