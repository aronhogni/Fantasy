#!/usr/bin/env node
/* ============================================================
   disagree-lab.mjs — HVAR ERU SKORPU-SERFRAEDINGARNIR SAMHLJODA
   OSAMMALA MARKADNUM, OG BORGAR THAD SIG?

     node scripts/disagree-lab.mjs [--scoring=ppr] [--k=15]
                                   [--gap=12] [--from=2019]

   -> data/measure/disagree_<scoring>.json

   SPURNINGIN. `sharp-lab.mjs` svaradi "er BORD theirra betra en okkar
   rod?" — svarid var nei (-116 stig gegn A-Ranking). En thad er onnur
   spurning: theirra rod er heil rod, thar sem their eru MEST sammala
   markadnum af thvi their lesa hann lika. Merkid — ef thad er eitthvad —
   aetti ad liggja thar sem their vikja ALLIR i somu att fra ADP.

   TVAER MAELINGAR, OG SU SEIRRI ER SU SEM RAEDUR:

   (a) SAMHLJODA HOPARNIR. Leikmadur telst "unanimous buy" ef HVER
       EINASTI serfraedingur sem yfirleitt radar honum setur hann
       >= GAP saetum ofar en ADP; "unanimous fade" er speglunin.
       Maelt er AFGANGURINN: raunstig minus thad sem leikmenn a somu
       slodum i ADP innan SOMU STODU skorudu. Stodan verdur ad vera
       inni — QB a ADP 50 skorar fleiri hra stig en RB a ADP 50, svo
       an hennar vaeri thetta ad maela stodu en ekki merki.

   (b) BAETIR THETTA EINHVERJU OFAN A A-RANKING? Okkar rod vikur nu
       thegar fra ADP og vinnur a thvi (+14,2% PPR). Spurningin sem
       skiptir mali er thvi ekki "fylgir vik theirra afgangi" heldur
       "fylgir thad honum THEGAR STJORNAD ER FYRIR OKKAR EIGIN VIKI".
       Thess vegna er reiknud HLUTFYLGNI. Se hun null er ekkert her
       ad saekja, hversu vel sem (a) litur ut — nakvaemlega sama rok
       og felldi ADP/ECR-blondurnar.

   VARNAGLI SEM MA EKKI HVERFA: bordin eru sott EFTIR a, en radirnar
   sjalfar eru fra thvi FYRIR drott thess ars, og serfraedingarnir eru
   valdir eingongu ur ARUM A UNDAN (`lib/experts.mjs`). Enginn leki.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { buildIndexes, matchByName } from "../src/names.js";
import * as fp from "./sources/fantasypros.mjs";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";
import { loadAccuracy, pickExperts, median } from "./lib/experts.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2),
  { scoring: ["ppr", "standard"], k: "number", gap: "number", from: "number" });
const SCORING = String(ARG.scoring || "ppr");
const K = Number(ARG.k || 15);
const GAP = Number(ARG.gap || 12);      /* ein umferd i 12-manna deild */
const FROM = Number(ARG.from || 2019);
const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };
const RUNS = Number(ARG.runs || 3);
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const GRID = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
const PGRID = [0, 6, 12, 18, 24, 36];   /* saeta-refsing a samhljoda fade */
const WIN = 10;                          /* +/- nagrannar i ADP-grunnlinu */
const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

const corr = (xs, ys) => {
  const n = xs.length; if (n < 3) return null;
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    sxy += a * b; sxx += a * a; syy += b * b;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
};
/* Hlutfylgni r(x,y | z) — venjuleg formula, engin fylkjareikningur. */
const partial = (x, y, z) => {
  const xy = corr(x, y), xz = corr(x, z), yz = corr(y, z);
  if (xy == null || xz == null || yz == null) return null;
  const d = Math.sqrt((1 - xz * xz) * (1 - yz * yz));
  return d ? (xy - xz * yz) / d : null;
};
const tOf = (a) => {
  const v = a.filter((x) => x != null);
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
};

/** Sama VBD-rod og A-Ranking beitir, byggd a somu laug. */
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

/**
 * Vaent stig midad vid ADP, INNAN STODU: medaltal naesta WIN a hvora
 * hond i ADP-rod, ad leikmanninum sjalfum FRATOLDUM. An thess vaeri
 * hann i sinni eigin grunnlinu og afgangurinn thynntist kerfisbundid.
 */
function adpBaseline(pool) {
  const out = new Map();
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  for (const list of Object.values(byPos)) {
    const s = list.slice().sort((a, b) => a.adp - b.adp);
    for (let i = 0; i < s.length; i++) {
      const near = [];
      for (let j = Math.max(0, i - WIN); j <= Math.min(s.length - 1, i + WIN); j++) {
        if (j !== i && s[j].actual != null) near.push(s[j].actual);
      }
      if (near.length >= 6) out.set(s[i].id, mean(near));
    }
  }
  return out;
}

async function main() {
  console.log(`saeki nakvaemni 2015-2025 …`);
  const { acc, years: accYears } = await loadAccuracy(2015, 2025, console.log);

  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r.adp != null).map((r) => r.season))]
    .sort().filter((y) => y >= FROM && y <= 2025);

  const perYear = {}, examples = {}, grid = {}, pgrid = {};
  console.log(`\nK=${K} · gap=${GAP} saeti · ${SCORING}\n`);

  for (const y of years) {
    const experts = pickExperts(acc, accYears, y, K);
    if (experts.length < Math.min(5, K)) { console.log(`  ${y}: of fair valdir`); continue; }

    const boards = [];
    for (const e of experts) {
      const b = await fp.expertBoard(e.id, { year: y, scoring: SCORING === "ppr" ? "PPR" : "STD" })
        .catch(() => null);
      if (b && b.ranks.length > 50) boards.push({ ...e, ranks: b.ranks });
      await new Promise((s) => setTimeout(s, 150));
    }
    if (boards.length < Math.min(4, K)) {
      console.log(`  ${y}: adeins ${boards.length} bord — slepp`); continue;
    }

    const yr = rows.filter((r) => r.season === y && r.adp != null &&
                                  (r.sleeperProj != null || r.ffProj != null));
    if (yr.length < 120) { console.log(`  ${y}: laug of litil`); continue; }
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({ id: r.id, pos: r.pos, name: r.name, team: r.prevTeam || null,
      proj: r.sleeperProj != null ? r.sleeperProj : r.ffProj,
      adp: r.adp, actual: pts(r) })).filter((p) => p.actual != null);

    const idx = buildIndexes(pool);
    const ranksBy = new Map();               /* id -> [rank per serfraedingi] */
    for (const b of boards) {
      for (const p of b.ranks) {
        const m = matchByName(idx, p.name, p.pos, p.team);
        if (!m) continue;
        if (!ranksBy.has(m.item.id)) ranksBy.set(m.item.id, []);
        ranksBy.get(m.item.id).push(p.rank);
      }
    }

    const field = new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1]));
    const arank = vbdRank(pool);
    const base = adpBaseline(pool);
    const need = Math.max(3, Math.ceil(boards.length / 2));

    const buys = [], fades = [], rest = [];
    const cx = [], cy = [], cz = [];         /* sharpDelta · afgangur · arankDelta */
    for (const p of pool) {
      const rs = ranksBy.get(p.id);
      if (!rs || rs.length < need) continue;
      const b0 = base.get(p.id);
      if (b0 == null) continue;
      const f = field.get(p.id);
      const resid = p.actual - b0;

      cx.push(f - median(rs)); cy.push(resid);
      cz.push(arank.has(p.id) ? f - arank.get(p.id) : 0);

      /* SAMHLJODA = hver einasti sem radadi honum, ekki midgildid.
         Med midgildi vaeri thetta bara "theim likar hann"; krafan um
         ALLA er thad sem gerir thetta ad samhljoda skodun. */
      const allAbove = rs.every((r) => f - r >= GAP);
      const allBelow = rs.every((r) => r - f >= GAP);
      const rec = { name: p.name, pos: p.pos, adp: r1(p.adp),
                    sharp: r1(median(rs)), n: rs.length,
                    actual: r1(p.actual), base: r1(b0), resid: r1(resid) };
      if (allAbove) buys.push(rec);
      else if (allBelow) fades.push(rec);
      else rest.push(rec);
    }

    const mBuy = buys.length ? mean(buys.map((r) => r.resid)) : null;
    const mFade = fades.length ? mean(fades.map((r) => r.resid)) : null;
    const mRest = rest.length ? mean(rest.map((r) => r.resid)) : null;
    perYear[y] = {
      boards: boards.length, ranked: cx.length,
      buys: buys.length, fades: fades.length,
      buyResid: mBuy == null ? null : r1(mBuy),
      fadeResid: mFade == null ? null : r1(mFade),
      restResid: mRest == null ? null : r1(mRest),
      spread: mBuy != null && mFade != null ? r1(mBuy - mFade) : null,
      rSharp: r3(corr(cx, cy)), rArank: r3(corr(cz, cy)),
      rPartial: r3(partial(cx, cy, cz)),
    };
    examples[y] = { buys: buys.sort((a, b) => a.adp - b.adp).slice(0, 8),
                    fades: fades.sort((a, b) => a.adp - b.adp).slice(0, 8) };
    /* ============================================================
       AKVORDUNARPROFID — FYLGNI ER EKKI DROTT.
       ============================================================
       Hluta-fylgnin ad ofan segir ad vik theirra beri merki ofan a
       okkar. Hun segir EKKERT um hvort thad breyti thvi hvern thu
       tekur. Reglan i thessu verkefni er ad DROTT-HERMUNIN raedur —
       `aron/verd` i FPL haekkadi fylgni en LAEKKADI stig/leik, og
       thad er nakvaemlega sama gildra og her. Vogin er valin
       walk-forward nedar; her er einungis nedid a ollu ristinu. */
    const blendBoard = (w) => {
      const sc = pool.map((p) => {
        const a = arank.get(p.id);
        if (a == null) return null;
        const rs = ranksBy.get(p.id);
        const sh = rs && rs.length >= need ? median(rs) : null;
        return [p.id, sh == null ? a : (1 - w) * a + w * sh];
      }).filter(Boolean).sort((x, y2) => x[1] - y2[1]);
      return new Map(sc.map(([id], i) => [id, i + 1]));
    };
    const actualM = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }]));
    const noisy = (seed) => {
      let a = seed >>> 0;
      const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
      const s2 = pool.map((p) => [p.id, p.adp + (rnd() + rnd() + rnd() - 1.5) * 8])
        .sort((x, y2) => x[1] - y2[1]);
      return new Map(s2.map(([id], i) => [id, i + 1]));
    };
    /* ============================================================
       MARKVISSA REGLAN — hun a betur vid maelinguna en blandan.
       ============================================================
       Blandan hreyfir ALLA 170 radada menn eftir midgildi theirra og
       thynnir thar med merkid sem faenst i tveimur litlum hopum.
       Thessi faerir EINGONGU samhljoda hopana: fade nidur um P saeti,
       buy upp um P. Ef merkid er raunverulegt a thad ad lifa HER
       thott thad daei i blondunni.

       TVAER REGLUR ERU TVAER TILRAUNIR. Med tveimur fjolskyldum
       thyrfti |t| > ~2,9 en ekki 2,45 til ad kallast marktaekt
       (Bonferroni) — thad er skrifad her svo enginn lesi seinni
       toluna eina og telji sig hafa fundid nokkud. */
    const groupBoard = (P) => {
      const sc = pool.map((p) => {
        const a = arank.get(p.id);
        if (a == null) return null;
        const rs = ranksBy.get(p.id);
        let adj = 0;
        if (rs && rs.length >= need) {
          const f = field.get(p.id);
          if (rs.every((r) => f - r >= GAP)) adj = -P;
          else if (rs.every((r) => r - f >= GAP)) adj = P;
        }
        return [p.id, a + adj];
      }).filter(Boolean).sort((x, y2) => x[1] - y2[1]);
      return new Map(sc.map(([id], i) => [id, i + 1]));
    };

    const pure = blendBoard(0);
    grid[y] = {}; pgrid[y] = {};
    for (const w of GRID) {
      if (w === 0) { grid[y][w] = 0; continue; }
      const b = blendBoard(w);
      const d = [];
      for (let r = 0; r < RUNS; r++) {
        const f2 = noisy(y * 1000 + r * 7919);
        for (let i = 1; i <= TEAMS; i++) {
          const j = i % TEAMS + 1;
          for (const swap of [false, true]) {
            const res = simulateDraft({ board: b, fieldBoard: f2, actual: actualM,
              slot: swap ? j : i, league: LEAGUE, rival: { slot: swap ? i : j, board: pure } });
            d.push(res.points - res.rivalPoints);
          }
        }
      }
      grid[y][w] = r1(mean(d));
    }
    const duel = (b) => {
      const d = [];
      for (let r = 0; r < RUNS; r++) {
        const f2 = noisy(y * 1000 + r * 7919);
        for (let i = 1; i <= TEAMS; i++) {
          const j = i % TEAMS + 1;
          for (const swap of [false, true]) {
            const res = simulateDraft({ board: b, fieldBoard: f2, actual: actualM,
              slot: swap ? j : i, league: LEAGUE, rival: { slot: swap ? i : j, board: pure } });
            d.push(res.points - res.rivalPoints);
          }
        }
      }
      return r1(mean(d));
    };
    for (const P of PGRID) pgrid[y][P] = P === 0 ? 0 : duel(groupBoard(P));
    perYear[y].grid = grid[y];
    perYear[y].pgrid = pgrid[y];

    const q = perYear[y];
    console.log(`  ${y}  ${String(boards.length).padStart(2)} bord · ${String(q.ranked).padStart(3)} radadir · ` +
      `buy ${String(q.buys).padStart(2)} (${q.buyResid}) · fade ${String(q.fades).padStart(2)} (${q.fadeResid}) · ` +
      `annad (${q.restResid}) · r ${q.rSharp} · hluta-r ${q.rPartial}`);
  }

  const ys = Object.keys(perYear);
  requireSeasons(ys, 4, "disagree-lab");

  const spread = ys.map((y) => perYear[y].spread).filter((x) => x != null);
  const rS = ys.map((y) => perYear[y].rSharp).filter((x) => x != null);
  const rA = ys.map((y) => perYear[y].rArank).filter((x) => x != null);
  const rP = ys.map((y) => perYear[y].rPartial).filter((x) => x != null);

  const line = (label, arr) => {
    const t = tOf(arr), m = arr.length ? mean(arr) : null;
    const pos = arr.filter((x) => x > 0).length;
    console.log(`  ${label.padEnd(26)} ${m == null ? "—" : r3(m).toString().padStart(7)} · ` +
      `${pos}/${arr.length} ar · t=${t == null ? "—" : t}` +
      `${t != null && Math.abs(t) > 2.45 ? "  MARKTAEKT" : ""}`);
  };
  console.log(`\n  NIDURSTADA (${ys.length} ar)`);
  line("buy - fade (stig)", spread);
  line("r(vik theirra, afgangur)", rS);
  line("r(vik okkar,  afgangur)", rA);
  line("HLUTA-r theirra | okkar", rP);

  /* WALK-FORWARD A VOGINNI: fyrir hvert ar er w valid EINGONGU af
     arum a undan. Besta w i eftira er ekki nidurstada heldur leki. */
  const gy = Object.keys(grid).map(Number).sort((a, b) => a - b);
  const wf = [];
  for (let i = 1; i < gy.length; i++) {
    const prior = gy.slice(0, i);
    let best = 0, bv = 0;
    for (const w of GRID) {
      const v = mean(prior.map((p) => grid[p][w]));
      if (v > bv) { bv = v; best = w; }
    }
    wf.push({ year: gy[i], w: best, gain: grid[gy[i]][best] });
  }
  console.log(`\n  AKVORDUNARPROF — blanda vid A-Ranking (drott-hermun)`);
  console.log(`  ${"ar".padEnd(6)}${"valid w".padEnd(10)}stig gegn hreinu A-Ranking`);
  for (const r of wf) console.log(`  ${String(r.year).padEnd(6)}${String(r.w).padEnd(10)}${r.gain > 0 ? "+" : ""}${r.gain}`);
  const gains = wf.map((r) => r.gain);
  line("blanda - hreint A-Rank", gains);

  const wfP = [];
  for (let i = 1; i < gy.length; i++) {
    const prior = gy.slice(0, i);
    let best = 0, bv = 0;
    for (const P of PGRID) {
      const v = mean(prior.map((p) => pgrid[p][P]));
      if (v > bv) { bv = v; best = P; }
    }
    wfP.push({ year: gy[i], p: best, gain: pgrid[gy[i]][best] });
  }
  console.log(`\n  AKVORDUNARPROF — adeins samhljoda hoparnir faerdir`);
  console.log(`  ${"ar".padEnd(6)}${"valid P".padEnd(10)}stig gegn hreinu A-Ranking`);
  for (const r of wfP) console.log(`  ${String(r.year).padEnd(6)}${String(r.p).padEnd(10)}${r.gain > 0 ? "+" : ""}${r.gain}`);
  const pgains = wfP.map((r) => r.gain);
  line("hopar - hreint A-Rank", pgains);
  console.log(`  (tvaer tilraunir: markt. throskuldur er |t| > 2.9, ekki 2.45)`);

  await mkdir(path.join(OUT, "measure"), { recursive: true });
  await writeFile(path.join(OUT, "measure", `disagree_${SCORING}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", k: 15, gap: 12, from: 2019 },
      resolved: { scoring: SCORING, k: K, gap: GAP, from: FROM, window: WIN },
      inputs: ["features.json"], dataDir: OUT }),
    perYear, examples, grid, pgrid, walkForward: wf, walkForwardGroups: wfP,
    summary: { spread: tOf(spread), rSharp: tOf(rS), rArank: tOf(rA), rPartial: tOf(rP), blendGain: tOf(gains), groupGain: tOf(pgains) },
  }, null, 1));
  console.log(`\n-> data/measure/disagree_${SCORING}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
