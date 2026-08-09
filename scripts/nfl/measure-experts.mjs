#!/usr/bin/env node
/* ============================================================
   measure-experts.mjs — KEYRIR maelinguna i `src-nfl/accuracy.js`
   a raungognum og skrifar `data-nfl/accuracy.json`.

     node scripts/nfl/measure-experts.mjs

   Krefst thess ad `--stage=experts` og `--stage=history` hafi verid
   keyrd (bordin og raunveruleikinn).

   HVAD ER BORID SAMAN:
     - hvert einstakt serfraedingabord fra forleik 2025   (~200 bord)
     - samsteypa FantasyPros (ECR) sama ars
     - ADP mannfjoldans (FantasyFootballCalculator, 2025)
     - "handahof innan threpa" — VIDMID SEM VERDUR AD VERA MED

   SIDASTA ATRIDID ER EKKI GRIN OG THAD ER MIKILVAEGASTA LINAN I
   SKRANNI. Ef bestu serfraedingarnir sla ekki bord sem er handahof
   innan somu threpa, tha er rodun theirra INNAN threps hávaði — og
   tha a appid ad segja thad, ekki ad selja rodina sem visku.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getText } from "./lib/http.mjs";
import { objects, str } from "./lib/csv.mjs";
import { scoreBoard, rankExperts, DEFAULT_LEAGUE } from "../../src-nfl/accuracy.js";
import { buildIndexes, matchByName } from "../../src-nfl/names.js";

const OUT = path.resolve(process.cwd(), "data-nfl");
const read = async (f) => JSON.parse(await readFile(path.join(OUT, f), "utf8"));

/* Timabilid sem er MAELT. Thad verdur ad vera LOKID timabil — ad
   maela yfirstandandi ar vaeri ad gefa einkunn fyrir hlutaleik. */
const MEASURE_SEASON = 2025;

async function main() {
  const experts = await read("experts.json");
  const seasons = await read("seasons.json");

  const boards = experts.boardsPrev || [];
  if (!boards.length) {
    console.error("Engin bord fyrir fyrra timabil — keyrdu --stage=experts fyrst.");
    process.exit(1);
  }

  /* ---- 1. RAUNVERULEIKINN ---- */
  const act = seasons.filter((s) => s.season === MEASURE_SEASON);
  console.log(`raunveruleiki: ${act.length} leikmenn ${MEASURE_SEASON}`);

  // Rodun eftir HEILDARSTIGUM. Heild, ekki ppg: leikmadur sem meiddist
  // kostadi thig timabilid og bord sem sa thad ekki a ad tapa a thvi.
  const sorted = act.slice().sort((a, b) => b.ppr - a.ppr);
  const overall = new Map(sorted.map((s, i) => [s.id, i + 1]));
  const posRank = new Map();
  for (const pos of ["QB", "RB", "WR", "TE", "K"]) {
    act.filter((s) => s.pos === pos).sort((a, b) => b.ppr - a.ppr)
      .forEach((s, i) => posRank.set(s.id, i + 1));
  }

  /* ---- 2. BRUIN fpId -> raunveruleiki ---- */
  const idmapTxt = await getText(
    "https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_playerids.csv");
  const idmap = objects(idmapTxt, ["fantasypros_id", "gsis_id", "name", "position"]);
  const gsisByFp = new Map();
  for (const r of idmap) {
    const fp = str(r.fantasypros_id), g = str(r.gsis_id);
    if (fp && g) gsisByFp.set(fp, g);
  }

  const byGsis = new Map(act.map((s) => [s.id, s]));
  const nameIdx = buildIndexes(act);

  /** fpId -> { pos, pts, posRank, overallRank } */
  const actual = new Map();
  const nameFor = new Map();
  let viaId = 0, viaName = 0, missing = 0;

  // Nofnin koma ur bordunum sjalfum (their bera `names`).
  for (const b of boards) for (const [fp, nm] of Object.entries(b.names || {})) {
    if (!nameFor.has(fp)) nameFor.set(fp, nm);
  }

  const posGuess = new Map();
  for (const r of idmap) {
    const fp = str(r.fantasypros_id);
    if (fp && r.position) posGuess.set(fp, str(r.position));
  }

  for (const fp of nameFor.keys()) {
    const g = gsisByFp.get(fp);
    let row = g ? byGsis.get(g) : null;
    if (row) viaId++;
    else {
      const m = matchByName(nameIdx, nameFor.get(fp), posGuess.get(fp) || null);
      if (m) { row = m.item; viaName++; }
    }
    if (!row) { missing++; continue; }
    actual.set(fp, {
      pos: row.pos, pts: row.ppr,
      posRank: posRank.get(row.id) ?? null,
      overallRank: overall.get(row.id) ?? null,
      name: row.name, team: row.team, games: row.g, ppg: row.ppg,
    });
  }
  console.log(`porun: ${viaId} um audkenni, ${viaName} um nafn, ${missing} ofundnir ` +
    `(af ${nameFor.size} nofnum a bordum)`);

  /* ---- 3. MARKADURINN sem motherji ----
     Samsteypan er bygð ur bordunum sjalfum: medalrod hvers leikmanns
     yfir alla serfraedinga. Thad er nakvaemlega skilgreining ECR og
     thad tryggir ad markadurinn se i SAMA HEIMI og bordin (sama
     leikmannamengi, sama ar). Ad saekja ECR utan fra gaefi ordinn
     mun a mengjum sem myndi rugla hermunina. */
  const sum = new Map(), cnt = new Map();
  for (const b of boards) {
    for (const [fp, rank] of Object.entries(b.ranks)) {
      sum.set(fp, (sum.get(fp) || 0) + rank);
      cnt.set(fp, (cnt.get(fp) || 0) + 1);
    }
  }
  // Adeins leikmenn sem MEIRIHLUTI bordanna nefnir — annars raedur
  // einn serfraedingur rod leikmanns sem hinir slepptu.
  const minCnt = Math.max(3, Math.floor(boards.length * 0.5));
  const consensusPairs = [...sum.keys()]
    .filter((fp) => cnt.get(fp) >= minCnt && actual.has(fp))
    .map((fp) => [fp, sum.get(fp) / cnt.get(fp)])
    .sort((a, b) => a[1] - b[1]);
  const fieldBoard = new Map(consensusPairs.map(([fp], i) => [fp, i + 1]));
  console.log(`markadsbord: ${fieldBoard.size} leikmenn (nefndir af >= ${minCnt} bordum)`);

  /* ---- 4. MAELINGIN ---- */
  const accByExpert = new Map(
    (experts.accuracy || []).map((a) => [a.fpExpertId, a]));

  const scored = [];
  for (const b of boards) {
    const board = new Map(
      Object.entries(b.ranks)
        .filter(([fp]) => actual.has(fp))
        .sort((x, y) => x[1] - y[1])
        .map(([fp], i) => [fp, i + 1]));       // thett rod, engar eydur
    if (board.size < 50) continue;
    const s = scoreBoard({ board, fieldBoard, actual });
    if (!s) continue;
    const meta = accByExpert.get(b.id);
    scored.push({
      id: b.id,
      name: meta ? meta.name : `Expert ${b.id}`,
      site: meta ? meta.site : null,
      fpDraftRank: meta ? meta.overall : null,
      boardSize: b.n, updated: b.updated,
      ...s,
    });
  }
  console.log(`maeld bord: ${scored.length}`);

  /* ---- 5. VIDMIDIN ---- */
  const benchmarks = [];

  benchmarks.push({
    id: "consensus", name: "FantasyPros consensus (ECR)", site: "FantasyPros",
    kind: "benchmark", boardSize: fieldBoard.size,
    ...scoreBoard({ board: fieldBoard, fieldBoard, actual }),
  });

  /* ADP mannfjoldans sama ar. */
  const ffc = await ffcBoard(MEASURE_SEASON, actual, nameFor);
  if (ffc) {
    benchmarks.push({
      id: "adp", name: "Crowd ADP (FantasyFootballCalculator)", site: "FFC",
      kind: "benchmark", boardSize: ffc.size,
      ...scoreBoard({ board: ffc, fieldBoard, actual }),
    });
  }

  /* HANDAHOF INNAN THREPA — NULLDREIFINGIN, ekki eitt vidmid.
     Bordid heldur threpa-rodun samsteypunnar (12 i senn) en stokkar
     ROD INNAN hvers threps. Ef serfraedingar sla thetta ekki er
     rodun theirra innan threps hávaði.

     KEYRT 50 SINNUM, EKKI EINU SINNI. Fyrsta utgafan keyrdi eitt
     fraekorn og fekk 1.852 stig — HAERRA en samsteypan sjalf, sem
     leit ut eins og uppgotvun ("handahof slaer serfraedingana").
     Thad var ekki uppgotvun heldur URTAK AF STAERD 1: eitt stokkad
     bord hefur sina eigin heppni, nakvaemlega eins og hver
     serfraedingur. Med 50 fraekornum faest DREIFING og tha er haegt
     ad segja hvar serfraedingarnir liggja i henni — sem er
     spurningin sem skiptir mali.

     Fastur fraekornsgrunnur svo talan se ENDURGERANLEG. Math.random
     hér vaeri tala sem breytist milli keyrslna og enginn gaeti
     sannreynt hana. */
  const NULL_RUNS = 50;
  const nullMeans = [];
  let shuffleExample = null;
  for (let i = 0; i < NULL_RUNS; i++) {
    const sh = shuffleWithinTiers(fieldBoard, 12, 20260809 + i * 7919);
    const s = scoreBoard({ board: sh, fieldBoard, actual });
    if (!s || !s.draft) continue;
    nullMeans.push(s.draft.mean);
    if (i === 0) shuffleExample = s;
  }
  nullMeans.sort((a, b) => a - b);
  const nullMean = nullMeans.reduce((a, b) => a + b, 0) / nullMeans.length;
  const nullSd = Math.sqrt(
    nullMeans.reduce((a, b) => a + (b - nullMean) ** 2, 0) / nullMeans.length);
  const nullDist = {
    runs: nullMeans.length,
    mean: Math.round(nullMean * 10) / 10,
    sd: Math.round(nullSd * 10) / 10,
    p05: nullMeans[Math.floor(nullMeans.length * 0.05)],
    p50: nullMeans[Math.floor(nullMeans.length * 0.50)],
    p95: nullMeans[Math.floor(nullMeans.length * 0.95)],
  };
  benchmarks.push({
    id: "tier-shuffle", name: `Random within consensus tiers (${NULL_RUNS} runs)`,
    site: null, kind: "benchmark", boardSize: fieldBoard.size,
    ...shuffleExample,
    draft: { ...shuffleExample.draft, mean: nullDist.mean, sd: nullDist.sd,
             bySlot: shuffleExample.draft.bySlot },
    nullDist,
  });

  /* ---- 6. SKRIFA ---- */
  const ranked = rankExperts([...scored, ...benchmarks]);
  const out = {
    measuredSeason: MEASURE_SEASON,
    league: DEFAULT_LEAGUE,
    generated: new Date().toISOString(),
    matched: { viaId, viaName, missing, names: nameFor.size },
    fieldBoardSize: fieldBoard.size,
    experts: ranked,
  };
  await writeFile(path.join(OUT, "accuracy.json"), JSON.stringify(out));

  /* ---- 7. SEGDU FRA ---- */
  const top = ranked.filter((r) => r.draft).slice(0, 12);
  const bench = ranked.filter((r) => r.kind === "benchmark");
  console.log(`\n=== TOPP 12 EFTIR DRAFT-HERMUN (${MEASURE_SEASON}) ===`);
  console.log("  stig    +/-   rho   mae50  RB%   WR%  bord  nafn");
  for (const r of top) {
    console.log(
      `${String(r.draft.mean).padStart(7)} ${String(r.se).padStart(5)} ` +
      `${String(r.rho ?? "-").padStart(6)} ${String(r.mae50 ?? "-").padStart(6)} ` +
      `${pct(r.hit.RB)} ${pct(r.hit.WR)} ${String(r.boardSize).padStart(5)}  ${r.name}`);
  }
  console.log("\n=== VIDMID ===");
  for (const r of bench) {
    console.log(
      `${String(r.draft.mean).padStart(7)} ${String(r.se).padStart(5)} ` +
      `${String(r.rho ?? "-").padStart(6)} ${String(r.mae50 ?? "-").padStart(6)} ` +
      `${pct(r.hit.RB)} ${pct(r.hit.WR)} ${String(r.boardSize).padStart(5)}  ${r.name}`);
  }
  /* ---- 8. STENDST THETTA NULLTILGATUNA? ----
     Spurningin er ekki "hver var efstur" heldur "er rodun
     serfraedinga betri en handahof innan somu threpa". Ef helmingur
     theirra er undir midgildi nulldreifingarinnar er svarid NEI og
     thad a ad standa jafn skyrt og listinn sjalfur. */
  const nd = benchmarks.find((b) => b.id === "tier-shuffle").nullDist;
  const expertMeans = scored.filter((s) => s.draft).map((s) => s.draft.mean);
  const aboveNull = expertMeans.filter((m) => m > nd.mean).length;
  const above95 = expertMeans.filter((m) => m > nd.p95).length;
  const consMean = benchmarks.find((b) => b.id === "consensus").draft.mean;

  console.log(`\n=== NULLDREIFING (handahof innan threpa, ${nd.runs} keyrslur) ===`);
  console.log(`  medaltal ${nd.mean}  sd ${nd.sd}  [p05 ${nd.p05} · p50 ${nd.p50} · p95 ${nd.p95}]`);
  console.log(`  serfraedingar yfir medaltali nulls : ${aboveNull}/${expertMeans.length} ` +
    `(${(100 * aboveNull / expertMeans.length).toFixed(0)}%)`);
  console.log(`  serfraedingar yfir p95 nulls       : ${above95}/${expertMeans.length} ` +
    `(${(100 * above95 / expertMeans.length).toFixed(0)}%)`);
  console.log(`  samsteypan (ECR)                   : ${consMean} ` +
    `(${consMean > nd.mean ? "yfir" : "undir"} medaltali nulls)`);

  const withSim = ranked.filter((r) => r.draft);
  const spread = withSim[0].draft.mean - withSim[withSim.length - 1].draft.mean;
  const medSe = median(withSim.map((r) => r.se));
  console.log(`\nbil besta og versta bords: ${spread.toFixed(1)} stig`);
  console.log(`mediangildi vikmarka:      ${medSe.toFixed(1)} stig`);
  console.log(spread > 4 * medSe
    ? "-> bilid er STAERRA en havadinn: munur a bordum er raunverulegur."
    : "-> bilid er INNAN havada: rodun bordanna er ad mestu heppni.");

  /* ---- 9. HELMINGA-AREIDANLEIKI — er thetta haefni eda heppni? ----

     LISTINN AD OFAN GETUR EKKI SVARAD THVI. Hann er eitt timabil, og
     ad rada 205 monnum eftir einni maelingu gefur alltaf einhvern
     efstan — lika thegar allir eru jafngodir. Ad birta hann an
     thessa prófs vaeri nakvaemlega "omaeld tala sem litur ut eins og
     maeling".

     PROFID: klyfjum timabilid i vikur 1-9 og 10-18, maelum HVERT bord
     gegn BADUM helmingum og fylgni-berum utkomurnar. Ef rodin er
     haefni a hun ad birtast i badum helmingum. Ef hun er heppni er
     fylgnin nálægt null.

     Thetta er EKKI thad sama og ad spa naesta ari (thad er ekki haegt
     ad maela enn — 2026-bordin eiga eftir ad spilast). Thad er
     NEDRI MORK: bord sem er ekki einu sinni samkvaemt sjalfu ser
     innan sama timabils getur ekki verid samkvaemt milli ara. */
  const halves = await splitHalfReliability(boards, actual, fieldBoard, gsisByFp);
  console.log(`\n=== HELMINGA-AREIDANLEIKI ===`);
  if (halves) {
    console.log(`  fylgni milli vikna 1-9 og 10-18: rho = ${halves.rho} (n=${halves.n})`);
    console.log(`  spa-fylgni fyrir heilt timabil (Spearman-Brown): ${halves.corrected}`);
    console.log(halves.rho > 0.3
      ? "  -> rodun bordanna er SAMKVAEM innan timabils: merki, ekki bara havadi."
      : "  -> rodun bordanna er EKKI samkvaem innan timabils: mestmegnis heppni.");
  } else {
    console.log("  ekki haegt ad reikna (vantar vikuleg gogn).");
  }

  out.splitHalf = halves;
  out.nullDist = nd;
  out.verdict = {
    expertsAboveNullMean: aboveNull,
    expertsAboveNullP95: above95,
    expertCount: expertMeans.length,
    consensusMean: consMean,
    spread: Math.round(spread * 10) / 10,
    medianSe: Math.round(medSe * 10) / 10,
  };
  await writeFile(path.join(OUT, "accuracy.json"), JSON.stringify(out));
}

const pct = (x) => (x == null ? "   -" : `${(x * 100).toFixed(0)}%`).padStart(5);
const median = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/**
 * Maelir hvert bord gegn BADUM helmingum timabilsins og skilar
 * fylgni utkomanna. `actual` er endurbyggt fyrir hvorn helming ur
 * vikulegu gognunum — heildarstig helmingsins, ekki hlutfall.
 */
async function splitHalfReliability(boards, actualFull, fieldBoard, gsisByFp) {
  let weekly;
  try { weekly = await read(`weekly/${MEASURE_SEASON}.json`); }
  catch { return null; }

  const half = (from, to) => {
    const agg = new Map();
    for (const r of weekly) {
      if (r.week < from || r.week > to) continue;
      const a = agg.get(r.id) || { pos: r.pos, pts: 0 };
      a.pts += r.ppr; agg.set(r.id, a);
    }
    // gsis -> fpId (snuum bruinni vid)
    const fpByGsis = new Map();
    for (const [fp, g] of gsisByFp) if (!fpByGsis.has(g)) fpByGsis.set(g, fp);
    const m = new Map();
    for (const [gsis, a] of agg) {
      const fp = fpByGsis.get(gsis);
      if (fp && actualFull.has(fp)) m.set(fp, { pos: a.pos, pts: a.pts });
    }
    // rodun innan helmings
    const sorted = [...m.entries()].sort((x, y) => y[1].pts - x[1].pts);
    sorted.forEach(([fp], i) => { m.get(fp).overallRank = i + 1; });
    return m;
  };

  const h1 = half(1, 9), h2 = half(10, 18);
  if (h1.size < 100 || h2.size < 100) return null;

  const pairs = [];
  for (const b of boards) {
    const board = new Map(
      Object.entries(b.ranks)
        .filter(([fp]) => actualFull.has(fp))
        .sort((x, y) => x[1] - y[1])
        .map(([fp], i) => [fp, i + 1]));
    if (board.size < 50) continue;
    const s1 = scoreBoard({ board, fieldBoard, actual: h1 });
    const s2 = scoreBoard({ board, fieldBoard, actual: h2 });
    if (!s1 || !s2 || !s1.draft || !s2.draft) continue;
    pairs.push({ pred: s1.draft.mean, actual: s2.draft.mean });
  }
  if (pairs.length < 20) return null;

  const rho = spearmanPairs(pairs);
  /* Spearman-Brown: fylgni tveggja helminga vanmetur areidanleika
     HEILLAR maelingar. Leidrettingin 2r/(1+r) faerir hana upp i thad
     sem bust ma vid fyrir fullt timabil. */
  const corrected = rho != null ? (2 * rho) / (1 + rho) : null;
  return {
    n: pairs.length,
    rho: rho != null ? Math.round(rho * 1000) / 1000 : null,
    corrected: corrected != null ? Math.round(corrected * 1000) / 1000 : null,
  };
}

/* Spearman a { pred, actual } — sama stærdfraedi og i accuracy.js en
   thar er hun bundin vid bord. Hedan er hun kollud a utkomum. */
function spearmanPairs(pairs) {
  const rank = (xs) => {
    const idx = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
    const out = new Array(xs.length);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const r = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) out[idx[k][1]] = r;
      i = j + 1;
    }
    return out;
  };
  const a = rank(pairs.map((p) => p.pred));
  const b = rank(pairs.map((p) => p.actual));
  const ma = a.reduce((x, y) => x + y, 0) / a.length;
  const mb = b.reduce((x, y) => x + y, 0) / b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    const u = a[i] - ma, v = b[i] - mb;
    num += u * v; da += u * u; db += v * v;
  }
  return da && db ? num / Math.sqrt(da * db) : null;
}

/** Deterministiskt stokk (mulberry32) — endurgeranlegt milli keyrslna. */
function shuffleWithinTiers(board, size, seed) {
  let a = seed >>> 0;
  const rnd = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const keys = [...board.entries()].sort((x, y) => x[1] - y[1]).map(([k]) => k);
  const out = new Map();
  for (let i = 0; i < keys.length; i += size) {
    const tier = keys.slice(i, i + size);
    for (let j = tier.length - 1; j > 0; j--) {
      const k = Math.floor(rnd() * (j + 1));
      [tier[j], tier[k]] = [tier[k], tier[j]];
    }
    tier.forEach((k, j) => out.set(k, i + j + 1));
  }
  return out;
}

/** ADP mannfjoldans sem bord (nafna-porun — FFC ber engin sameiginleg id). */
async function ffcBoard(year, actual, nameFor) {
  try {
    const r = await fetch(
      `https://fantasyfootballcalculator.com/api/v1/adp/ppr?teams=12&year=${year}`);
    const d = await r.json();
    if (!d.players) return null;
    // fpId -> nafn er thegar til; snuum vid og porum a nafni.
    const byName = new Map();
    for (const [fp, nm] of nameFor) byName.set(norm(nm), fp);
    const pairs = [];
    for (const p of d.players) {
      const fp = byName.get(norm(p.name));
      if (fp && actual.has(fp)) pairs.push([fp, p.adp]);
    }
    pairs.sort((a, b) => a[1] - b[1]);
    return new Map(pairs.map(([fp], i) => [fp, i + 1]));
  } catch { return null; }
}
const norm = (s) => String(s || "").toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z ]/g, "").replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
  .replace(/\s+/g, " ").trim();

main().catch((e) => { console.error(e); process.exit(1); });
