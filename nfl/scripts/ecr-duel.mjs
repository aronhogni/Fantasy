#!/usr/bin/env node
/* ============================================================
   ecr-duel.mjs — A-RANKING GEGN FANTASYPROS-ECR, HAUS I HAUS,
   I RAUNVERULEGU DEILDUNUM.

     node scripts/ecr-duel.mjs [--runs=6] [--from=2015]

   -> data/measure/ecr_duel.json

   SPURNINGIN VAR ORDRETT: "berdu saman i fyrra A-Ranking i badum
   deildum med thaer reglur og FantasyPros-skor. Hver hefdi unnid?"

   UPPSETNINGIN. Herbergid er ADP (thad sem raunverulega gerist), EG
   nota A-Ranking og ANDSTAEDINGURINN notar ECR-samsteypuna. Bædi lid
   eru i somu deild, oll 12 (eda 10) saeti profud i baðum attum, og
   skorad a RAUNSTIGUM thess ars. Thad er einvigi, ekki tveir
   medaltalslistar.

   TVAER DEILDIR MED SINUM EIGIN REGLUM:
     Patriots    10 lid · PPR      · QB RB2 WR2 TE FLEX2 K DST · 15 umf.
     Sofahetjur  12 lid · half-PPR · QB RB2 WR2 TE FLEX2       · 14 umf.

   EITT AR ER EITT SYNI — OG THAD ER SAGT. Notandinn spurdi um "i
   fyrra", svo 2025 er birt sérstaklega. En eitt timabil getur snuist
   a einum leikmanni, svo ferillinn 2015-2025 er birtur vid hlidina.
   Tala ur einu ari sem les eins og tala ur ellefu er versta utkoman.

   HALF-PPR: STIGIN ERU NAKVAEM, ECR ER VIKMORK.
   Stigin eru algebra (HALF = (STD+PPR)/2, thvi eini munurinn er stig
   per mottoku). ECR er hins vegar RODUN og hun er ekki linuleg — og
   FantasyPros-half-ECR er ekki i sogulegu gognunum. Thess vegna er
   andstaedingurinn hermdur TVISVAR, med ppr-ECR og std-ECR, og badar
   tolur birtar. Se A-Ranking ofan i baðum endum er svarid otvirad.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft } from "../src/accuracy.js";
import { replacementRanks } from "../src/model.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), { runs: "number", from: "number" });
const RUNS = Number(ARG.runs || 6);
const FROM = Number(ARG.from || 2015);
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;
const tOf = (a) => {
  const v = a.filter((x) => x != null);
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
};

const LEAGUES = [
  { key: "patriots", label: "Patriots SB champs (10, PPR)", fmt: "ppr",
    league: { teams: 10, scoring: "ppr",
              starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 15,
              flexPos: ["RB", "WR", "TE"], superflex: false,
              excludePos: ["K", "DST"] } },
  { key: "sofahetjur", label: "Sofahetjur (12, half-PPR)", fmt: "half",
    league: { teams: 12, scoring: "half-ppr",
              starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 14,
              flexPos: ["RB", "WR", "TE"], superflex: false } },
];

function vbdBoard(pool, repl) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).filter((v) => v != null).sort((a, b) => b - a);
    if (!vals.length) continue;
    const k = Math.min(vals.length - 1, (repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) if (p.proj != null) scored.push([p.id, p.proj - base]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}
const rankBy = (pool, get) => new Map(pool.filter((p) => get(p) != null)
  .slice().sort((a, b) => get(a) - get(b)).map((p, i) => [p.id, i + 1]));

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const ppr = new Map(), std = new Map();
  for (const r of feats.rows) {
    if (r.scoring === "ppr") ppr.set(`${r.season}|${r.id}`, r);
    else if (r.scoring === "standard") std.set(`${r.season}|${r.id}`, r);
  }
  const years = [...new Set(feats.rows.map((r) => r.season))].sort()
    .filter((y) => y >= FROM && y <= 2025);

  const pools = {};
  for (const y of years) {
    const rows = [];
    for (const [k, a] of ppr) {
      if (!k.startsWith(`${y}|`)) continue;
      const b = std.get(k);
      if (!b || a.adp == null || a.pts == null || b.ptsStd == null) continue;
      /* ECR ER FORSENDA THESSA EINVIGIS. Leikmadur an ECR getur ekki
         verid i lidi andstaedingsins, svo hann er utan laugarinnar hja
         BADUM — annars vaeri eg ad velja ur staerri laug en hann og
         thad vaeri einvígi um urtaksstaerd, ekki um rodun. */
      if (a.ecr == null || b.ecr == null) continue;
      const pj = a.sleeperProj != null ? a.sleeperProj : a.ffProj;
      const sj = b.sleeperProj != null ? b.sleeperProj : b.ffProj;
      rows.push({ id: a.id, pos: a.pos, name: a.name, adp: a.adp,
        ecrPpr: a.ecr, ecrStd: b.ecr,
        proj: { ppr: pj, half: pj != null && sj != null ? (pj + sj) / 2 : null,
                standard: sj },
        actual: { ppr: a.pts, half: (a.pts + b.ptsStd) / 2, standard: b.ptsStd } });
    }
    if (rows.length >= 110) pools[y] = rows;
  }
  const ys = Object.keys(pools).map(Number).sort((a, b) => a - b);
  requireSeasons(ys, 5, "ecr-duel");
  console.log(`${ys.length} timabil · ${Math.round(mean(ys.map((y) => pools[y].length)))} leikmenn med BAEDI ADP og ECR\n`);

  const res = {};
  for (const L of LEAGUES) {
    res[L.key] = {};
    const repl = replacementRanks({ ...L.league, scoring: "ppr" });
    const srcs = L.fmt === "half" ? ["ecrPpr", "ecrStd"] : ["ecrPpr"];
    for (const src of srcs) {
      const per = {};
      for (const y of ys) {
        const pool = pools[y].filter((p) => p.proj[L.fmt] != null);
        if (pool.length < 110) continue;
        const mine = vbdBoard(pool.map((p) => ({ id: p.id, pos: p.pos, proj: p.proj[L.fmt] })), repl);
        const theirs = rankBy(pool, (p) => p[src]);
        const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual[L.fmt] }]));
        const d = [];
        for (let r = 0; r < RUNS; r++) {
          let a = (y * 1000 + r * 7919) >>> 0;
          const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
          const field = new Map(pool
            .map((p) => [p.id, p.adp + (rnd() + rnd() + rnd() - 1.5) * 8])
            .sort((x, z) => x[1] - z[1]).map(([id], i) => [id, i + 1]));
          for (let i = 1; i <= L.league.teams; i++) {
            const j = i % L.league.teams + 1;
            for (const swap of [false, true]) {
              const out = simulateDraft({ board: mine, fieldBoard: field, actual,
                slot: swap ? j : i, league: L.league,
                rival: { slot: swap ? i : j, board: theirs } });
              d.push(out.points - out.rivalPoints);
            }
          }
        }
        per[y] = r1(mean(d));
      }
      const vals = ys.map((y) => per[y]).filter((x) => x != null);
      res[L.key][src] = { per, mean: r1(mean(vals)), t: tOf(vals),
        wins: vals.filter((x) => x > 0).length, years: vals.length,
        y2025: per[2025] ?? null };
    }
  }

  console.log("A-RANKING GEGN FANTASYPROS-ECR — stig, jakvaett = A-Ranking vinnur\n");
  for (const L of LEAGUES) {
    console.log(`  ${L.label}`);
    for (const [src, q] of Object.entries(res[L.key])) {
      const lbl = src === "ecrPpr" ? "ECR (ppr-rod)" : "ECR (std-rod)";
      const sig = q.t != null && Math.abs(q.t) > 2.228;
      console.log(`    ${lbl.padEnd(16)} 2025: ${q.y2025 == null ? "—"
        : (q.y2025 > 0 ? "+" : "") + q.y2025}` +
        `   ·  ferill ${q.mean > 0 ? "+" : ""}${q.mean} (${q.wins}/${q.years} ar, t=${q.t})` +
        `${sig ? "  MARKTAEKT" : ""}`);
    }
    console.log("");
  }

  console.log("  PER AR (jakvaett = A-Ranking vann thad ar)");
  const head = LEAGUES.flatMap((L) => Object.keys(res[L.key])
    .map((s) => `${L.key.slice(0, 4)}/${s === "ecrPpr" ? "ppr" : "std"}`));
  console.log(`    ${"ar".padEnd(6)}${head.map((h) => h.padStart(12)).join("")}`);
  for (const y of ys) {
    const cells = LEAGUES.flatMap((L) => Object.values(res[L.key])
      .map((q) => String(q.per[y] ?? "—").padStart(12))).join("");
    console.log(`    ${String(y).padEnd(6)}${cells}`);
  }

  await mkdir(path.join(OUT, "measure"), { recursive: true });
  await writeFile(path.join(OUT, "measure", "ecr_duel.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: { runs: 6, from: 2015 },
      resolved: { runs: RUNS, leagues: LEAGUES.map((l) => l.key),
                  halfEcrIsBounded: "half-ECR er ekki i sogulegu gognunum; ppr og std notud sem vikmork",
                  poolRequiresEcr: "leikmadur an ECR er utan laugarinnar hja BADUM" },
      inputs: ["features.json"], dataDir: OUT }),
    seasons: ys, leagues: LEAGUES.map((l) => ({ key: l.key, label: l.label, league: l.league })),
    results: res,
  }, null, 1));
  console.log(`\n-> data/measure/ecr_duel.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
