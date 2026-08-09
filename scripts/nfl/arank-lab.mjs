#!/usr/bin/env node
/* ============================================================
   arank-lab.mjs — GERUM A-RANKING BETRI, OG MAELUM THAD RETT.

     node scripts/nfl/arank-lab.mjs [--scoring=ppr|standard]

   -> data-nfl/arank_<scoring>.json

   A-Ranking = spa Sleeper -> virdi yfir varamanni. Hun slaer Sleeper
   um ~75 stig og vinnur oll timabilin, en med fimm timabilum eru
   bootstrap-vikmork klosud per ar OFUR-IHALDSSOM. Tvennt er gert hér:

   1. LEITAD AD BETRI UTGAFU af umreikningnum — varamanns-threpid,
      slettun spar og blondun vid hra spa — ALLT WALK-FORWARD svo
      valid se ekki gert a sama gagni og maelt er a.

   2. MAELT MED THREMUR OLIKUM PROFUM sem hafa olikan styrk og
      olikar forsendur. Ad birta adeins thad ihaldssamasta er jafn
      villandi og ad birta adeins thad hagstaedasta:
        - bootstrap klosad per timabil  (faerst, 5 klasar)
        - tekna-prof a timabilum         (5/5 -> p = 1/32)
        - pardur samanburdur per (timabil, saeti), 60 por,
          med klosun leidrettri fyrir fylgni innan timabils
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../../src-nfl/accuracy.js";
import { mean, bootstrapDiff } from "../../src-nfl/learn.js";

const OUT = path.resolve(process.cwd(), "data-nfl");
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true];
}));
const SCORING = String(ARG.scoring || "ppr");
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };

/* ---------- afbrigdin sem eru profud ----------
   Hvert afbrigdi er FALL sem tekur laugina og skilar bordi. */

/** Varamanns-threp. Fyrsta talan er su sem er i notkun i dag. */
const REPL_VARIANTS = {
  "starters+flex (current)": { QB: 12, RB: 28, WR: 41, TE: 14 },
  "last starter": { QB: 12, RB: 24, WR: 36, TE: 12 },
  "one round deeper": { QB: 18, RB: 34, WR: 48, TE: 18 },
  "drafted count": { QB: 20, RB: 40, WR: 60, TE: 20 },
  "waiver level": { QB: 24, RB: 48, WR: 72, TE: 24 },
};

function vbdBoard(pool, repl, { shrink = 0, blend = 0 } = {}) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);

  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).sort((a, b) => b - a);
    const k = Math.min(vals.length - 1, (repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    const m = mean(vals);
    for (const p of list) {
      /* SKREPPING: spar hafa thykkari hala en raunveruleikinn — sa
         sem er spad 330 endar sjaldnar i 330 en sa sem er spad 200
         endar i 200. `shrink` faerir hvern mann hlutfallslega ad
         medaltali stodunnar adur en VBD er tekid. */
      const proj = p.proj * (1 - shrink) + m * shrink;
      const v = proj - base;
      /* BLONDUN: `blend` = 0 er hreint VBD, 1 er hra spa. Millistig
         segir hve mikid af hrastigunum a ad halda. */
      scored.push([p.id, (1 - blend) * v + blend * proj]);
    }
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);

  /* Timabil sem hafa hreina Sleeper-spa (leka-hlidid i
     build-features hefur thegar hent hinum). */
  const years = [...new Set(rows.filter((r) => r.sleeperProj != null)
    .map((r) => r.season))].sort();
  console.log(`timabil med hreina Sleeper-spa: ${years.join(", ")}`);

  /* ---------- heimurinn per ar ---------- */
  const world = {};
  for (const y of years) {
    const yr = rows.filter((r) => r.season === y && r.adp != null &&
                                  r.sleeperProj != null);
    if (yr.length < 120) continue;
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos, proj: r.sleeperProj,
                                  adp: r.adp, actual: pts(r) }));
    world[y] = {
      pool,
      actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }])),
      field: new Map(pool.slice().sort((a, b) => a.adp - b.adp)
        .map((p, i) => [p.id, i + 1])),
      sleeper: new Map(pool.slice().sort((a, b) => b.proj - a.proj)
        .map((p, i) => [p.id, i + 1])),
    };
  }
  const ys = Object.keys(world).map(Number).sort();
  console.log(`hermdir heimar: ${ys.length}`);

  /* ============================================================
     HAVADI I VELLINUM — thad sem gerir maelinguna nakvaemari
     ============================================================
     Fyrri utgafa let motherjana drafta NAKVAEMLEGA eftir ADP. Su
     hermun er afradin: hun gefur EITT sýni per (ar, saeti) og allt
     flakt milli ara er tho blanda af (a) raunverulegum arsmun og (b)
     tilviljun um hverjir raktust til okkar i thvi eina drafti.

     Raunveruleg droft eru ekki afradin — thess vegna hefur ADP
     stadalfravik. Med thvi ad hrista vollinn med THVI SAMA fraviki
     og FFC maelir faum vid morg ohad sýni per ar. Thad fjarlaegir
     lid (b) ur dreifingunni og skilur eftir lid (a), sem er thad
     sem vid viljum maela.

     ATH: thetta eykur NAKVAEMNI maelingarinnar a hverju ari. Thad
     minnkar EKKI raunverulegan mun milli ara, og ma thvi ekki nota
     til ad thykjast hafa fleiri timabil en fimm.

     Fraekornid er fast — sama keyrsla gefur somu tolu. */
  const NOISE_RUNS = Number(ARG.runs || 20);
  const noisyField = (pool, seed) => {
    let a = seed >>> 0;
    const rnd = () => {
      a = (a * 1664525 + 1013904223) >>> 0;
      return a / 4294967296;
    };
    /* Box-Muller ur jafndreifingunni. */
    const gauss = () => {
      const u = Math.max(1e-9, rnd()), v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    const jittered = pool.map((p) => {
      const sd = p.adpSd != null && p.adpSd > 0 ? p.adpSd : 1.08 * Math.sqrt(Math.max(1, p.adp));
      return [p.id, p.adp + gauss() * sd];
    }).sort((x, y) => x[1] - y[1]);
    return new Map(jittered.map(([id], i) => [id, i + 1]));
  };

  /* Keyrir eitt bord gegn ollum saetum og arum; skilar per (ar, saeti). */
  const run = (boardOf) => {
    const bySlot = {};
    for (const y of ys) {
      const w = world[y];
      const board = boardOf(w.pool, y);
      bySlot[y] = [];
      for (let slot = 1; slot <= TEAMS; slot++) {
        bySlot[y].push(simulateDraft({ board, fieldBoard: w.field,
          actual: w.actual, slot, league: LEAGUE }).points);
      }
    }
    return bySlot;
  };

  const sleeperRuns = run((pool, y) => world[y].sleeper);
  const adpRuns = run((pool, y) => world[y].field);

  /* ---------- 1. LEIT AD BETRI UMREIKNINGI ---------- */
  const grid = [];
  for (const [name, repl] of Object.entries(REPL_VARIANTS)) {
    for (const shrink of [0, 0.1, 0.2]) {
      for (const blend of [0, 0.1, 0.25]) {
        grid.push({ name, repl, shrink, blend });
      }
    }
  }
  console.log(`\nprofa ${grid.length} afbrigdi …`);

  const scored = grid.map((g) => {
    const runs = run((pool) => vbdBoard(pool, g.repl, g));
    const perSeason = Object.fromEntries(ys.map((y) => [y, mean(runs[y])]));
    return { ...g, runs, perSeason, mean: mean(ys.map((y) => perSeason[y])) };
  });
  scored.sort((a, b) => b.mean - a.mean);

  const slpPerSeason = Object.fromEntries(ys.map((y) => [y, mean(sleeperRuns[y])]));
  const adpPerSeason = Object.fromEntries(ys.map((y) => [y, mean(adpRuns[y])]));

  console.log("\n  stig   vs Slp  vinnur  threp                      skrepp blanda");
  for (const s of scored.slice(0, 10)) {
    const d = s.mean - mean(Object.values(slpPerSeason));
    const w = ys.filter((y) => s.perSeason[y] > slpPerSeason[y]).length;
    console.log(`${s.mean.toFixed(1).padStart(7)} ${sgn(d).padStart(7)}  ${w}/${ys.length}` +
      `    ${s.name.padEnd(26)} ${String(s.shrink).padStart(4)}  ${String(s.blend).padStart(4)}`);
  }

  /* ---------- 2. WALK-FORWARD VAL A AFBRIGDI ----------
     Ad velja besta afbrigdid a ollum arunum og segja svo "sja, thad
     vinnur" er LEKI. Rett adferd: fyrir hvert ar er valid gert a
     arunum A UNDAN og beitt a arid sjalft. */
  const wf = {};
  for (let i = 1; i < ys.length; i++) {
    const y = ys[i], prior = ys.slice(0, i);
    const best = scored.slice().sort((a, b) =>
      mean(prior.map((p) => b.perSeason[p])) - mean(prior.map((p) => a.perSeason[p])))[0];
    wf[y] = { chosen: `${best.name} shrink=${best.shrink} blend=${best.blend}`,
              points: best.perSeason[y], runs: best.runs[y] };
  }
  const wfYears = Object.keys(wf).map(Number);
  console.log(`\n  WALK-FORWARD (afbrigdi valid a fyrri arum):`);
  for (const y of wfYears) {
    console.log(`    ${y}  ${wf[y].points.toFixed(1)}  ` +
      `(Sleeper ${slpPerSeason[y].toFixed(1)})  <- ${wf[y].chosen}`);
  }

  /* ============================================================
     3. BEINT EINVIGI I SAMA DRAFTI — RETTA TILRAUNAHONNUNIN
     ============================================================
     Fyrri profin bera saman TVO ADSKILIN droft og lenda thvi i thvi
     ad ars-havadinn drekkir muninum: 2025 var lagskorandi ar fyrir
     ALLA, 2024 hatt fyrir alla, og su sveifla (sd ~150 stig) er
     margfalt staerri en munurinn sem verid er ad maela (~75).

     RETT HONNUN ER PORUN: latum bædi bordin drafta I SOMU DEILD, a
     moti somu motherjum, ur somu laug. Tha DREGST arsahrifin UT —
     bædi lidin nutu goda arsins eda lidu fyrir thad slaema — og eftir
     stendur adeins munurinn a bordunum.

     Thetta er lika RAUNSAERRA: i thinni deild ertu ekki ad keppa vid
     medaltal aranna heldur vid hina i herberginu, og einhver theirra
     draftar eftir Sleeper-rodinni.

     Hvert saetapar er keyrt i BADAR attir (A-Ranking i saeti i og
     Sleeper i saeti j, og svo ofugt) svo saetin sjalf jafnist ut. */
  const headToHead = (boardOf) => {
    const diffs = [];
    for (const y of ys) {
      const w = world[y];
      const board = boardOf(w.pool, y);
      for (let r = 0; r < NOISE_RUNS; r++) {
        /* Hver keyrsla er nyr voll med eigin havada — mismunandi
           deild, somu leikmenn. */
        const field = r === 0 ? w.field : noisyField(w.pool, y * 1000 + r * 7919);
        for (let i = 1; i <= TEAMS; i++) {
          const j = i % TEAMS + 1;
          for (const swap of [false, true]) {
            const aSlot = swap ? j : i, sSlot = swap ? i : j;
            const a = simulateDraft({
              board, fieldBoard: field, actual: w.actual,
              slot: aSlot, league: LEAGUE,
              rival: { slot: sSlot, board: w.sleeper },
            });
            diffs.push({ season: y, aSlot, sSlot, diff: a.points - a.rivalPoints });
          }
        }
      }
    }
    const m = mean(diffs.map((d) => d.diff));
    const wins = diffs.filter((d) => d.diff > 0).length;
    /* Klasar eru AFRAM arin — porun fjarlaegir arsahrifin en radir
       innan ars eru enn hadar hver annarri. Stadalvillan er thvi
       reiknud ur ARA-MEDALTOLUM. */
    const byYear = ys.map((y) => mean(diffs.filter((d) => d.season === y).map((d) => d.diff)));
    const mm = mean(byYear);
    const sd = Math.sqrt(mean(byYear.map((v) => (v - mm) ** 2)) *
                         byYear.length / Math.max(1, byYear.length - 1));
    const se = sd / Math.sqrt(byYear.length);
    const t = se ? mm / se : 0;
    const yearWins = byYear.filter((v) => v > 0).length;
    return {
      mean: round1(m), n: diffs.length, wins, winRate: round4(wins / diffs.length),
      byYear: Object.fromEntries(ys.map((y, i) => [y, round1(byYear[i])])),
      yearWins, years: ys.length,
      t: round2(t), se: round1(se),
      lo: round1(mm - 2.776 * se), hi: round1(mm + 2.776 * se),
      significant: Math.abs(t) > 2.776,
      signP: round4(binomialTail(yearWins, ys.length)),
    };
  };

  /* ---------- 3. THRJU PROF ---------- */
  const current = scored.find((s) => s.name === "starters+flex (current)" &&
                                     s.shrink === 0 && s.blend === 0);

  const tests = (label, perSeason, runsBySlot) => {
    /* Arasettid kemur UR `perSeason`, ekki ur `ys`. Walk-forward
       afbrigdid naer ekki fyrsta arinu (thad hefur ekkert a undan ser)
       og fyrsta utgafan gerdi rad fyrir ollum arum — sem felldi
       keyrsluna. */
    const ys = Object.keys(perSeason).map(Number).sort();
    const wins = ys.filter((y) => perSeason[y] > slpPerSeason[y]).length;
    const boot = bootstrapDiff(perSeason, slpPerSeason);
    /* Tekna-prof: undir nulltilgatu er hvert ar hlutkesti. */
    const signP = binomialTail(wins, ys.length);
    /* Pardur samanburdur per (ar, saeti). Klasar eru arin, svo
       stadalvillan er reiknud UR ARA-MEDALTOLUM, ekki ur 60 porum —
       annars vaeri hun allt of throng. */
    const perSlotDiffs = [];
    for (const y of ys) {
      for (let i = 0; i < TEAMS; i++) {
        perSlotDiffs.push(runsBySlot[y][i] - sleeperRuns[y][i]);
      }
    }
    const yearMeans = ys.map((y) =>
      mean(runsBySlot[y].map((v, i) => v - sleeperRuns[y][i])));
    const m = mean(yearMeans);
    const sd = Math.sqrt(mean(yearMeans.map((v) => (v - m) ** 2)) *
                         ys.length / Math.max(1, ys.length - 1));
    const se = sd / Math.sqrt(ys.length);
    const t = se ? m / se : 0;
    return {
      label, mean: round1(mean(Object.values(perSeason))),
      diff: round1(m), wins, years: ys.length,
      boot: boot ? { lo: round1(boot.lo), hi: round1(boot.hi),
                     excludesZero: boot.excludesZero } : null,
      signP: round4(signP),
      paired: { t: round2(t), se: round1(se),
                lo: round1(m - 2.776 * se), hi: round1(m + 2.776 * se),
                significant: Math.abs(t) > 2.776 },   // t(4), 95%
      slotWins: perSlotDiffs.filter((d) => d > 0).length,
      slots: perSlotDiffs.length,
    };
  };

  const resCurrent = tests("A-Ranking (current)", current.perSeason, current.runs);
  const resBest = tests(`A-Ranking (best variant: ${scored[0].name}, ` +
    `shrink=${scored[0].shrink}, blend=${scored[0].blend})`,
    scored[0].perSeason, scored[0].runs);
  const resWf = tests("A-Ranking (walk-forward choice)",
    Object.fromEntries(wfYears.map((y) => [y, wf[y].points])),
    Object.fromEntries(wfYears.map((y) => [y, wf[y].runs])));

  /* Einvigin — bædi fyrir nuverandi utgafu og bestu. */
  const h2hCurrent = headToHead((pool) => vbdBoard(pool, current.repl, current));
  const h2hBest = headToHead((pool) => vbdBoard(pool, scored[0].repl, scored[0]));

  console.log(`\n${"=".repeat(88)}`);
  console.log(`  BEINT EINVIGI I SOMU DEILD · ${SCORING.toUpperCase()}`);
  console.log("=".repeat(88));
  for (const [lab, h] of [["nuverandi", h2hCurrent], ["besta afbrigdi", h2hBest]]) {
    console.log(`\n  ${lab}`);
    console.log(`    A-Ranking vinnur ${h.wins}/${h.n} einvigi (${(h.winRate * 100).toFixed(1)}%)`);
    console.log(`    medalmunur ${sgn(h.mean)} stig · vinnur ${h.yearWins}/${h.years} timabil`);
    console.log(`    per ar: ${Object.entries(h.byYear).map(([y, v]) => `${y} ${sgn(v)}`).join("  ")}`);
    console.log(`    t = ${h.t}, 95% [${sgn(h.lo)}, ${sgn(h.hi)}]  ` +
      (h.significant ? "MARKTAEKT" : "ekki marktaekt") +
      `  · tekna-prof p = ${h.signP}`);
  }

  console.log(`\n${"=".repeat(88)}`);
  console.log(`  A-RANKING GEGN SLEEPER — THRJU PROF · ${SCORING.toUpperCase()}`);
  console.log("=".repeat(88));
  for (const r of [resCurrent, resBest]) {
    console.log(`\n  ${r.label}`);
    console.log(`    munur ${sgn(r.diff)} stig · vinnur ${r.wins}/${r.years} timabil · ` +
      `${r.slotWins}/${r.slots} saeti`);
    console.log(`    bootstrap (klosad per ar) : [${sgn(r.boot.lo)}, ${sgn(r.boot.hi)}]  ` +
      (r.boot.excludesZero ? "MARKTAEKT" : "utilokar ekki null"));
    console.log(`    tekna-prof a timabilum    : p = ${r.signP}  ` +
      (r.signP < 0.05 ? "MARKTAEKT" : "ekki marktaekt"));
    console.log(`    pardur t-prof (klasar=ar) : t = ${r.paired.t}, ` +
      `95% [${sgn(r.paired.lo)}, ${sgn(r.paired.hi)}]  ` +
      (r.paired.significant ? "MARKTAEKT" : "ekki marktaekt"));
  }

  await writeFile(path.join(OUT, `arank_${SCORING}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    scoring: SCORING, teams: TEAMS, rounds: ROUNDS, seasons: ys,
    sleeperPerSeason: Object.fromEntries(ys.map((y) => [y, round1(slpPerSeason[y])])),
    adpPerSeason: Object.fromEntries(ys.map((y) => [y, round1(adpPerSeason[y])])),
    variants: scored.slice(0, 12).map((s) => ({
      name: s.name, shrink: s.shrink, blend: s.blend,
      mean: round1(s.mean),
      perSeason: Object.fromEntries(ys.map((y) => [y, round1(s.perSeason[y])])),
    })),
    walkForward: Object.fromEntries(wfYears.map((y) =>
      [y, { chosen: wf[y].chosen, points: round1(wf[y].points) }])),
    tests: { current: resCurrent, best: resBest, walkForward: resWf },
    headToHead: { current: h2hCurrent, best: h2hBest },
  }, null, 1));
  console.log(`\n-> data-nfl/arank_${SCORING}.json`);
}

/** P(X >= k) fyrir X ~ Bin(n, 0.5) — einhliða tekna-prof. */
function binomialTail(k, n) {
  let s = 0;
  for (let i = k; i <= n; i++) s += choose(n, i);
  return s / 2 ** n;
}
function choose(n, k) {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

const sgn = (x) => (x == null ? "-" : (x > 0 ? "+" : "") + x.toFixed(1));
const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const round4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);

main().catch((e) => { console.error(e); process.exit(1); });
