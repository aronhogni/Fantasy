#!/usr/bin/env node
/* ============================================================
   sharp-lab.mjs — SLAER BORD BESTU SPAMANNANNA MARKADINN?

     node scripts/sharp-lab.mjs [--scoring=ppr] [--k=15] [--runs=5]

   -> data/sharp_<scoring>.json

   ============================================================
   HVAD ER VITAD ADUR EN THETTA BYRJAR
   ============================================================
   `expert-persistence.mjs` maeldi ad rod serfraedinga FLYST: rho 0,370
   yfir tiu arapor, NULL neikvaed, og topp-10 i fyrra lendir i 34,5.
   hundradshluta i ar. Haefileiki er raunverulegur.

   EN ThAD SANNAR EKKI AD BORD ThEIRRA SLAI MARKADINN. Samsteypa allra
   ~200 maelist LOKUST af fimm heimildum (1665 stig gegn 1713 hja hrau
   ADP og 1989 hja A-Ranking). Thad er samraemanlegt: hun medaltalar
   inn thá slaemu lika. Spurningin er hvort VEGID bord — adeins their
   sem hafa maelanlegan feril — snui thvi vid.

   ============================================================
   VALID VERDUR AD VERA WALK-FORWARD, ANNARS ER ThETTA LEKI
   ============================================================
   Fyrir ar Y eru serfraedingar valdir UR ARUM < Y EINGONGU. Ad velja
   thá sem reyndust bestir yfir allt timabilid og herma sidan drafting
   eftir theim vaeri ad vita utkomuna fyrirfram — og thad litur ALLTAF
   vel ut.

   VALREGLAN ER MAELD, EKKI VALIN (sja expert-persistence.mjs):
     midgildi       ekki medaltal — 60% sterkari visbending, og ad
                    henda versta ari handvirkt er MAELANLEGA VERRA
     lagmark 4 ar   fleiri ar kaupa ekkert (2 ar gefa 26,5%, 8 ar 26,5%)
     K = 15         topp 10-20 bera sterkasta merkid; K=3 gefur betra
                    punktmat en helmingi veikari visbendingu

   ============================================================
   ThRJAR NULLLINUR, ThVI ThAER SVARA ThREMUR SPURNINGUM
   ============================================================
     ADP            slaer thetta markadinn? (spurningin sem skiptir mali)
     flat samsteypa slaer VEGID bordid thad OVEGNA? (er valid ad gera gagn)
     A-Ranking      slaer thetta thad sem appid gerir i dag?
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { buildIndexes, matchByName } from "../src/names.js";
import * as fp from "./sources/fantasypros.mjs";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2),
  { scoring: ["ppr", "standard"], k: "number", runs: "number", from: "number" });
const SCORING = String(ARG.scoring || "ppr");
const K = Number(ARG.k || 15);
const RUNS = Number(ARG.runs || 5);
const FROM = Number(ARG.from || 2019);
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
const UA = "Mozilla/5.0 (compatible; fantasy-tools/1.0)";
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;
const median = (a) => {
  const s = a.slice().sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function sliceBalanced(s, at) {
  let d = 0;
  for (let i = at; i < s.length; i++) {
    if (s[i] === "[") d++;
    else if (s[i] === "]") { d--; if (!d) return s.slice(at, i + 1); }
  }
  return null;
}

/** Nakvaemni allra serfraedinga fyrir eitt ar. */
async function accuracyFor(year) {
  const html = await (await fetch(
    `https://www.fantasypros.com/nfl/accuracy/draft.php?year=${year}`,
    { headers: { "user-agent": UA } })).text();
  /* Arid a sidunni VERDUR ad passa — annars vaerum vid ad maela sama
     arid vid sjalft sig og fa fullkomna fylgni. */
  if (String((html.match(/<title>\s*(\d{4})/) || [])[1]) !== String(year)) return null;
  const at = html.indexOf('"rows":[');
  if (at < 0) return null;
  try {
    return JSON.parse(sliceBalanced(html, at + '"rows":'.length))
      .map((r) => ({ id: String(r.id), name: (r.expert && r.expert.label) || null,
                     rank: Number(r.rank) }))
      .filter((r) => r.id && r.rank);
  } catch { return null; }
}

function vbdRank(pool) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).filter((v) => v != null).sort((a, b) => b - a);
    if (!vals.length) continue;
    const k = Math.min(vals.length - 1, (REPL[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) if (p.proj != null) scored.push([p.id, p.proj - base]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

async function main() {
  console.log(`saeki nakvaemni 2015-2025 …`);
  const acc = {};
  for (let y = 2015; y <= 2025; y++) {
    const r = await accuracyFor(y);
    if (r) acc[y] = r;
    await new Promise((s) => setTimeout(s, 300));
  }
  const accYears = Object.keys(acc).map(Number).sort();
  console.log(`  ${accYears.length} ar af nakvaemni`);

  /** Valdir serfraedingar fyrir ar Y — UR FYRRI ARUM EINGONGU. */
  const pickExperts = (y) => {
    const prior = accYears.filter((p) => p < y);
    if (prior.length < 2) return [];
    const hist = {};
    for (const p of prior) {
      for (const r of acc[p]) {
        (hist[r.id] = hist[r.id] || { name: r.name, p: [] })
          .p.push(r.rank / acc[p].length * 100);
      }
    }
    return Object.entries(hist)
      .filter(([, v]) => v.p.length >= Math.min(4, prior.length))
      .map(([id, v]) => ({ id, name: v.name, mid: median(v.p) }))
      .sort((a, b) => a.mid - b.mid).slice(0, K);
  };

  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r.adp != null).map((r) => r.season))]
    .sort().filter((y) => y >= FROM && y <= 2025);

  const perYear = {}, chosen = {};
  const results = { vsAdp: {}, vsFlat: {}, vsArank: {} };

  for (const y of years) {
    const experts = pickExperts(y);
    if (experts.length < 5) { console.log(`  ${y}: of fair valdir`); continue; }

    /* Bordin theirra THAD AR. Sumir eiga ekkert bord — thad er ekki
       villa heldur algengt, og fjoldinn er birtur. */
    const boards = [];
    for (const e of experts) {
      const b = await fp.expertBoard(e.id, { year: y, scoring: SCORING === "ppr" ? "PPR" : "STD" })
        .catch(() => null);
      if (b && b.ranks.length > 50) boards.push({ ...e, ranks: b.ranks });
      await new Promise((s) => setTimeout(s, 150));
    }
    if (boards.length < 4) { console.log(`  ${y}: adeins ${boards.length} bord — slepp`); continue; }
    chosen[y] = { picked: experts.length, withBoard: boards.length,
                  names: boards.map((b) => b.name) };

    const yr = rows.filter((r) => r.season === y && r.adp != null &&
                                  (r.sleeperProj != null || r.ffProj != null));
    if (yr.length < 120) continue;
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos, name: r.name, team: r.prevTeam || null,
      proj: r.sleeperProj != null ? r.sleeperProj : r.ffProj,
      adp: r.adp, adpSd: r.adpSd, actual: pts(r) }));

    /* Bordin bera FantasyPros-nofn; laugin ber okkar. Porun a nafni
       innan stodu — sidasta urraedid, en hér er thad eina bruin. */
    const idx = buildIndexes(pool);
    const sharpRanks = new Map(), flatRanks = new Map();
    for (const b of boards) {
      for (const p of b.ranks) {
        const m = matchByName(idx, p.name, p.pos, p.team);
        if (!m) continue;
        (sharpRanks.get(m.item.id) || sharpRanks.set(m.item.id, []).get(m.item.id)).push(p.rank);
      }
    }
    /* Flata samsteypan — ALLIR sem eiga bord thetta ar, til ad svara
       "er VALID ad gera gagn" en ekki bara "eru serfraedingar godir". */
    const allIds = acc[y] ? acc[y].map((r) => r.id).slice(0, 60) : [];
    for (const id of allIds) {
      const b = await fp.expertBoard(id, { year: y, scoring: SCORING === "ppr" ? "PPR" : "STD" })
        .catch(() => null);
      if (!b || b.ranks.length < 50) continue;
      for (const p of b.ranks) {
        const m = matchByName(idx, p.name, p.pos, p.team);
        if (!m) continue;
        (flatRanks.get(m.item.id) || flatRanks.set(m.item.id, []).get(m.item.id)).push(p.rank);
      }
      await new Promise((s) => setTimeout(s, 120));
    }

    const toBoard = (m2) => {
      const s = [...m2.entries()].filter(([, v]) => v.length >= 3)
        .map(([id, v]) => [id, median(v)]).sort((a, b) => a[1] - b[1]);
      return new Map(s.map(([id], i) => [id, i + 1]));
    };
    const sharp = toBoard(sharpRanks), flat = toBoard(flatRanks);
    if (sharp.size < 100) { console.log(`  ${y}: skorpu-bordid ber adeins ${sharp.size} — slepp`); continue; }

    const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }]));
    const field = new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1]));
    const arank = vbdRank(pool);

    const noisy = (seed) => {
      let a = seed >>> 0;
      const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
      const g = () => {
        const u = Math.max(1e-9, rnd()), v = rnd();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      };
      return new Map(pool.map((p) => {
        const sd = p.adpSd > 0 ? p.adpSd : 1.08 * Math.sqrt(Math.max(1, p.adp));
        return [p.id, p.adp + g() * sd];
      }).sort((x, z) => x[1] - z[1]).map(([id], i) => [id, i + 1]));
    };

    const duel = (rival) => {
      const d = [];
      for (let r = 0; r < RUNS; r++) {
        const f2 = r === 0 ? field : noisy(y * 1000 + r * 7919);
        for (let i = 1; i <= TEAMS; i++) {
          const j = i % TEAMS + 1;
          for (const swap of [false, true]) {
            const res = simulateDraft({ board: sharp, fieldBoard: f2, actual,
              slot: swap ? j : i, league: LEAGUE, rival: { slot: swap ? i : j, board: rival } });
            d.push(res.points - res.rivalPoints);
          }
        }
      }
      return mean(d);
    };

    results.vsAdp[y] = duel(field);
    results.vsFlat[y] = flat.size >= 100 ? duel(flat) : null;
    results.vsArank[y] = duel(arank);
    perYear[y] = { experts: boards.length, sharpPlayers: sharp.size, flatPlayers: flat.size };
    console.log(`  ${y}  ${boards.length} bord · ${sharp.size} leikmenn · ` +
      `gegn ADP ${r1(results.vsAdp[y])} · gegn flatri ${results.vsFlat[y] == null ? "—" : r1(results.vsFlat[y])} · ` +
      `gegn A-Ranking ${r1(results.vsArank[y])}`);
  }

  const ys = Object.keys(perYear).map(Number).sort();
  requireSeasons(ys, "timabil med bordum OG spa");

  const stat = (obj) => {
    const vals = ys.map((y) => obj[y]).filter((v) => v != null);
    if (vals.length < 3) return null;
    const m = mean(vals);
    const sd = Math.sqrt(mean(vals.map((v) => (v - m) ** 2)) * vals.length / (vals.length - 1));
    const se = sd / Math.sqrt(vals.length);
    const tc = vals.length > 6 ? 2.228 : 2.776;
    return { mean: r1(m), t: r3(se ? m / se : 0), wins: vals.filter((v) => v > 0).length,
             years: vals.length, significant: se ? Math.abs(m / se) > tc : false };
  };
  const S = { vsAdp: stat(results.vsAdp), vsFlat: stat(results.vsFlat), vsArank: stat(results.vsArank) };

  console.log(`\n${"=".repeat(74)}`);
  console.log(`  BORD TOPP-${K} SPAMANNA (valid walk-forward, midgildi, lagmark 4 ar)`);
  console.log("=".repeat(74));
  for (const [k, label] of [["vsAdp", "gegn ADP          "],
                            ["vsFlat", "gegn flatri samst."],
                            ["vsArank", "gegn A-Ranking    "]]) {
    const s = S[k];
    if (!s) { console.log(`  ${label}  (of fa ar)`); continue; }
    console.log(`  ${label}  ${s.mean > 0 ? "+" : ""}${s.mean} stig · ${s.wins}/${s.years} ar · ` +
      `t=${s.t}  ${s.significant ? "MARKTAEKT" : ""}`);
  }

  await writeFile(path.join(OUT, `sharp_${SCORING}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", k: 15, runs: 5, from: 2019 },
      inputs: ["features.json"], dataDir: OUT }),
    scoring: SCORING, K, seasons: ys, selection: chosen, perYear,
    vsAdp: S.vsAdp, vsFlat: S.vsFlat, vsArank: S.vsArank,
    perSeasonRaw: { vsAdp: results.vsAdp, vsFlat: results.vsFlat, vsArank: results.vsArank },
  }, null, 1));
  console.log(`\n-> data/sharp_${SCORING}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
