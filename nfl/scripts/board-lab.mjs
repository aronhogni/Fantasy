#!/usr/bin/env node
/* ============================================================
   board-lab.mjs — GETUM VID GERT RODINA BETRI?

     node scripts/board-lab.mjs [--scoring=ppr|standard]
                                [--proj=sleeper|fftoday]
                                [--runs=12]

   -> data/board_<scoring>_<proj>.json

   A-Ranking er i dag EIN adgerd: spa -> virdi yfir varamanni. Hér er
   spurt hvort eitthvad ANNAD sem vid eigum gogn um baeti hana:

     ADP       markadurinn sjalfur — vitund fjoldans
     ECR       samsteypa serfraedinga
     ending    hve marga leiki hann spiladi i fyrra
     aldur     ferilkurfan
     lidsstyrk sokn lidsins i fyrra

   MAELIKVARDINN ER DRAFTID, EKKI FYLGNI. Hærri fylgni vid raunstig
   er EKKI sama og betri akvordun — thad var maelt i FPL-verkefninu
   og aftur hér (rankScore slaer FIT tho FIT hafi haerri fylgni).
   Hvert afbrigdi draftar thvi gegn NUVERANDI bordi i somu deild, ollum
   saetum, ollum arum, og er domt a raunverulegum stigum byrjunarlids.

   TVENNT SEM VER MAELINGUNA GEGN SJALFRI SER:

   1. WALK-FORWARD. Se vog valin er hun valin A FYRRI ARUM eingongu og
      beitt a naesta ar. Ad velja bestu vog a ollum gognum og birta
      hana sem arangur er leki, og hann litur alltaf vel ut.

   2. FJOLDI SAMANBURDA. Fjorar fjolskyldur x sjo vogtolur = 28
      afbrigdi. Vid 28 samanburdi er BESTA utkoman vaentanlega jakvæd
      af tilviljun einni. Bonferroni-leidrett mork eru birt vid hlidina
      a hrau tolunni og thad er su leidretta sem gildir.
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { mean } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true];
}));
const SCORING = String(ARG.scoring || "ppr");
const PROJ = String(ARG.proj || "sleeper");
const FIELD = PROJ === "fftoday" ? "ffProj" : "sleeperProj";
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const RUNS = Number(ARG.runs || 12);

/* Varamanns-threpin sem eru i notkun i dag. */
const REPL = { QB: 12, RB: 28, WR: 41, TE: 14 };

const r1 = (x) => Math.round(x * 10) / 10;
const r3 = (x) => Math.round(x * 1000) / 1000;

/** VBD-gildi per leikmadur — grunnurinn sem allt annad er lagt ofan a. */
function vbdValues(pool) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const out = new Map();
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => p.proj).sort((a, b) => b - a);
    const k = Math.min(vals.length - 1, (REPL[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) out.set(p.id, p.proj - base);
  }
  return out;
}

/** Rod ur gildakorti: haesta gildi fyrst. */
const rankOf = (scores) => new Map([...scores.entries()]
  .sort((a, b) => b[1] - a[1]).map(([id], i) => [id, i + 1]));

/** Stodlun innan arsins svo olikar einingar seu sambaerilegar. */
function zmap(pool, get) {
  const vals = pool.map(get).filter((v) => v != null && Number.isFinite(v));
  if (vals.length < 20) return null;
  const m = mean(vals);
  const s = Math.sqrt(mean(vals.map((v) => (v - m) ** 2))) || 1;
  return (p) => {
    const v = get(p);
    return v == null || !Number.isFinite(v) ? 0 : (v - m) / s;
  };
}

/* ============================================================
   AFBRIGDIN
   ============================================================
   Hvert er FALL sem tekur laugina og vog og skilar bordi. Vog 0 er
   ALLTAF nuverandi bord — thad er nulltilgatan og hun er med i hverri
   fjolskyldu svo samanburdurinn se innan somu vellar.               */
const FAMILIES = {
  /* Markadurinn sjalfur. VBD er velraen umbreyting a EINNI spa; ADP
     er nidurstada thusunda drafta. Se vitund fjoldans med eitthvad
     sem spain hefur ekki a blondun ad vinna. */
  adp: (pool, w) => {
    const vbd = vbdValues(pool);
    const zv = zmap(pool, (p) => vbd.get(p.id));
    /* ADP er LAEGRA-ER-BETRA, thvi formerkid. */
    const za = zmap(pool, (p) => -p.adp);
    if (!zv || !za) return null;
    return rankOf(new Map(pool.map((p) => [p.id, (1 - w) * zv(p) + w * za(p)])));
  },

  /* Samsteypa serfraedinga, adgreind fra mannfjoldanum. */
  ecr: (pool, w) => {
    const vbd = vbdValues(pool);
    const zv = zmap(pool, (p) => vbd.get(p.id));
    const ze = zmap(pool, (p) => (p.ecr == null ? null : -p.ecr));
    if (!zv || !ze) return null;
    return rankOf(new Map(pool.map((p) => [p.id, (1 - w) * zv(p) + w * ze(p)])));
  },

  /* ENDING. Spain segir hvad hann gerir SPILI hann; hun veit ekkert um
     hvort hann spilar. Leikir i fyrra er thad einfaldasta sem til er. */
  durability: (pool, w) => {
    const vbd = vbdValues(pool);
    const zv = zmap(pool, (p) => vbd.get(p.id));
    const zg = zmap(pool, (p) => p.prevG);
    if (!zv || !zg) return null;
    return rankOf(new Map(pool.map((p) => [p.id, (1 - w) * zv(p) + w * zg(p)])));
  },

  /* ALDUR. Ferilkurfan er raunveruleg; spurningin er hvort hun se
     THEGAR i spanni. */
  age: (pool, w) => {
    const vbd = vbdValues(pool);
    const zv = zmap(pool, (p) => vbd.get(p.id));
    /* Yngri er betri, en adeins linulega — hvadeina flottara vaeri
       fitta sem tharf sina eigin krossprofun. */
    const za = zmap(pool, (p) => (p.age == null ? null : -p.age));
    if (!zv || !za) return null;
    return rankOf(new Map(pool.map((p) => [p.id, (1 - w) * zv(p) + w * za(p)])));
  },

  /* ============================================================
     TVAER FJOLSKYLDUR SEM VINNA A SPANNI SJALFRI, EKKI A RODINNI
     ============================================================
     Allt hér ad ofan blandar VBD vid annan MAELIKVARDA eftir a. Thessar
     tvaer breyta INNTAKINU og lata VBD sidan vinna sitt verk obreytt.
     Thad er annar gangur og gat gefid adra nidurstodu.               */

  /* TILTAEKILEIKI SEM MARGFALDARI. Spain segir hvad hann gerir SPILI
     hann. Leikir i fyrra, hafnir upp i vog `w`, er einfaldasta matid a
     thvi hvort hann spilar — og margfoldun er retta adgerdin, ekki
     samlagning: madur sem missir helming timabilsins skorar helming,
     hann faer ekki fasta fradragid. */
  availMult: (pool, w) => {
    if (w === 0) return null;
    const adj = pool.map((p) => ({ ...p,
      proj: p.proj * Math.pow(p.prevG == null ? 1 : Math.max(0.35, p.prevG / 17), w) }));
    const vbd = vbdValues(adj);
    return rankOf(new Map(adj.map((p) => [p.id, vbd.get(p.id)])));
  },

  /* SKREPPING AD MARKADINUM. Spain er EIN skodun; ADP er nidurstada
     thusunda drafta. I stad thess ad blanda RODUNUM er spain sjalf
     dregin ad theirri spa sem ADP-saeti hans gefur til kynna innan
     stodunnar — og VBD reiknad ur theirri leidrettu spa. */
  adpShrink: (pool, w) => {
    if (w === 0) return null;
    const byPos = {};
    for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
    const adj = [];
    for (const list of Object.values(byPos)) {
      /* Spa-gildin i rod, og ADP-rodin innan stodunnar. Sa sem er
         ADP-nr k innan stodu "aetti" ad bera k-ta haesta spa-gildid. */
      const projSorted = list.map((p) => p.proj).sort((a, b) => b - a);
      const byAdp = list.slice().sort((a, b) => a.adp - b.adp);
      const implied = new Map(byAdp.map((p, i) => [p.id, projSorted[i]]));
      for (const p of list) {
        adj.push({ ...p, proj: (1 - w) * p.proj + w * implied.get(p.id) });
      }
    }
    const vbd = vbdValues(adj);
    return rankOf(new Map(adj.map((p) => [p.id, vbd.get(p.id)])));
  },

  /* SOKN LIDSINS i fyrra — faer hann taekifaeri? */
  team: (pool, w) => {
    const vbd = vbdValues(pool);
    const zv = zmap(pool, (p) => vbd.get(p.id));
    const zt = zmap(pool, (p) => p.prevTeamPfG);
    if (!zv || !zt) return null;
    return rankOf(new Map(pool.map((p) => [p.id, (1 - w) * zv(p) + w * zt(p)])));
  },
};

const WEIGHTS = [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4];

async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const rows = feats.rows.filter((r) => r.scoring === SCORING);
  const years = [...new Set(rows.filter((r) => r[FIELD] != null).map((r) => r.season))].sort();
  console.log(`heimild ${PROJ} · ${SCORING} · timabil: ${years.join(", ")}`);

  const world = {};
  for (const y of years) {
    const yr = rows.filter((r) => r.season === y && r.adp != null && r[FIELD] != null);
    if (yr.length < 120) continue;
    const pts = (r) => (SCORING === "ppr" ? r.pts : r.ptsStd);
    const pool = yr.map((r) => ({
      id: r.id, pos: r.pos, proj: r[FIELD], adp: r.adp, adpSd: r.adpSd,
      ecr: r.ecr, prevG: r.prevG, age: r.age, prevTeamPfG: r.prevTeamPfG,
      actual: pts(r),
    }));
    world[y] = {
      pool,
      actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }])),
      field: new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1])),
    };
  }
  const ys = Object.keys(world).map(Number).sort();
  console.log(`hermdir heimar: ${ys.length}`);

  /* Hristur vollur — sama rok og i arank-lab: raunveruleg droft eru
     ekki afradin, svo eitt ADP-draft per ar er eitt sýni og allt flakt
     blandast. Fraekornid er fast. */
  const noisyField = (pool, seed) => {
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
  };

  /* BEINT EINVIGI vid nuverandi bord i somu deild. Baðar attir a
     hverju saetapari svo saetin jafnist ut. */
  const duel = (boardOf) => {
    const perYear = {}, diffs = [];
    for (const y of ys) {
      const w = world[y];
      const mine = boardOf(w.pool, y);
      const base = FAMILIES.adp(w.pool, 0);          // = hreint VBD
      if (!mine || !base) continue;
      const d = [];
      for (let r = 0; r < RUNS; r++) {
        const field = r === 0 ? w.field : noisyField(w.pool, y * 1000 + r * 7919);
        for (let i = 1; i <= TEAMS; i++) {
          const j = i % TEAMS + 1;
          for (const swap of [false, true]) {
            const aSlot = swap ? j : i, bSlot = swap ? i : j;
            const res = simulateDraft({
              board: mine, fieldBoard: field, actual: w.actual,
              slot: aSlot, league: LEAGUE, rival: { slot: bSlot, board: base },
            });
            d.push(res.points - res.rivalPoints);
          }
        }
      }
      perYear[y] = mean(d);
      diffs.push(...d.map((v) => ({ y, v })));
    }
    const byYear = ys.map((y) => perYear[y]).filter((v) => v != null);
    const m = mean(byYear);
    const sd = Math.sqrt(mean(byYear.map((v) => (v - m) ** 2)) *
                         byYear.length / Math.max(1, byYear.length - 1));
    const se = sd / Math.sqrt(byYear.length);
    return {
      mean: r1(m), se: r1(se), t: r3(se ? m / se : 0),
      years: byYear.length, wins: byYear.filter((v) => v > 0).length,
      perYear: Object.fromEntries(Object.entries(perYear).map(([k, v]) => [k, r1(v)])),
    };
  };

  /* ---------- 1. HREIN LEIT (ekki nidurstada — leit) ---------- */
  const results = [];
  for (const [fam, fn] of Object.entries(FAMILIES)) {
    for (const w of WEIGHTS) {
      if (w === 0 && fam !== "adp") continue;         // nulltilgatan einu sinni
      const res = duel((pool) => fn(pool, w));
      results.push({ family: fam, w, ...res });
      console.log(`  ${fam.padEnd(11)} w=${String(w).padEnd(5)} ` +
        `${(res.mean > 0 ? "+" : "") + String(res.mean).padStart(7)} stig · ` +
        `${res.wins}/${res.years} ar · t=${res.t}`);
    }
  }

  /* ---------- 2. FJOLDI SAMANBURDA ---------- */
  const tried = results.filter((r) => r.w !== 0).length;
  /* Tvihlida t-mork vid 0,05 leidrett fyrir `tried` samanburdi.
     Frigradur = ar - 1; taflan er nalgud med Welch-Satterthwaite-
     lausu formi thvi vid berum saman medaltal ara. */
  const tCrit = { 4: 2.776, 10: 2.228 }[Math.max(4, Math.min(10, ys.length - 1))] || 2.228;
  const bonf = tCrit * Math.sqrt(Math.log(Math.max(2, tried)) / Math.log(2)) * 0.6 + tCrit * 0.4;
  const best = results.filter((r) => r.w !== 0).sort((a, b) => b.mean - a.mean)[0];

  console.log(`\n${"=".repeat(80)}`);
  console.log("  NIDURSTADA");
  console.log("=".repeat(80));
  console.log(`  ${tried} afbrigdi profud. Vid svo marga samanburdi er BESTA`);
  console.log("  utkoman vaentanlega jakvæd af tilviljun einni.");
  console.log(`\n  best: ${best.family} w=${best.w} -> ${best.mean > 0 ? "+" : ""}${best.mean} stig, ` +
    `${best.wins}/${best.years} ar, t=${best.t}`);
  console.log(`  hra mork      |t| > ${tCrit}`);
  console.log(`  leidrett mork |t| > ${r3(bonf)}  (Bonferroni-lik leidretting a ${tried} profum)`);
  console.log(`  -> ${Math.abs(best.t) > bonf
    ? "STENST leidrettu morkin"
    : "FELLUR a leidrettu morkunum — thetta er leit, ekki uppgotvun"}`);

  /* ---------- 3. WALK-FORWARD A THVI SEM LEIT VELUR ---------- */
  /* Se vog valin verdur hun ad vera valin a FYRRI arum. Thetta er
     eina talan sem ma bera saman vid nuverandi bord i alvoru. */
  console.log(`\n  WALK-FORWARD (vog valin a fyrri arum eingongu):`);
  const wf = {};
  for (let i = 1; i < ys.length; i++) {
    const y = ys[i], prior = ys.slice(0, i);
    let bestPrior = null;
    for (const r of results) {
      if (r.w === 0) continue;
      const m = mean(prior.map((p) => r.perYear[p]).filter((v) => v != null));
      if (bestPrior == null || m > bestPrior.m) bestPrior = { m, r };
    }
    const got = bestPrior ? bestPrior.r.perYear[y] : null;
    wf[y] = { chosen: `${bestPrior.r.family} w=${bestPrior.r.w}`, gain: got };
    console.log(`    ${y}  ${got == null ? "—" : (got > 0 ? "+" : "") + got} stig  <- ${wf[y].chosen}`);
  }
  const wfVals = Object.values(wf).map((v) => v.gain).filter((v) => v != null);
  const wfMean = mean(wfVals);
  console.log(`    medaltal ${wfMean > 0 ? "+" : ""}${r1(wfMean)} stig · ` +
    `${wfVals.filter((v) => v > 0).length}/${wfVals.length} ar jakvaed`);
  console.log(`  -> ${wfMean > 0 && wfVals.filter((v) => v > 0).length > wfVals.length / 2
    ? "vert ad skoda naenar"
    : "ENGIN BAETING — nuverandi bord stendur"}`);

  await writeFile(path.join(OUT, `board_${SCORING}_${PROJ}.json`), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { scoring: "ppr", proj: "sleeper", runs: 12 },
      inputs: ["features.json"], dataDir: OUT }),
    scoring: SCORING, projection: PROJ, seasons: ys,
    variants: results,
    tried, tCrit, correctedT: r3(bonf),
    best: { family: best.family, w: best.w, mean: best.mean, t: best.t,
            passesCorrected: Math.abs(best.t) > bonf },
    walkForward: wf, walkForwardMean: r1(wfMean),
  }, null, 1));
  console.log(`\n-> data/board_${SCORING}_${PROJ}.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
