/* ============================================================
   measure-dc-flag.mjs — MA MERKJA MANN SEM "DC-LEIKMANN"?

   Keyrsla:  node scripts/measure-dc-flag.mjs [--json <slod>]
   Les committud `data/player_gw_2526.json`. ENGIN ytri koll, ~1 s,
   DETERMINISTISK (fast frae 7).

   ============================================================
   SPURNINGIN, ORDRETT FRA NOTANDANUM (24.8.2026)
   ============================================================
   "Til ad gera thetta tharftu liklega fyrst ad merkja Defcon
    leikmennina serstaklega til ad gera spad. Defcon leikmenn eru their
    sem eru +50% leikja ad fa DC stig. Svo eru attacking leikmenn sem
    thurfa ad treysta a G eda A."

   Skilgreiningin er HANS og hun er skyr: **hrá hittni > 0,50**. Thessi
   maeling spyr ekki hvort skilgreiningin se rett — hun spyr hvort
   MERKID BERI MERKI, og vid hvada golf.

   ============================================================
   NIDURSTADAN
   ============================================================
   1. **EIN BYRJUN ER ONYT SEM MERKI.** Med 1 byrjun er hittnin annad
      hvort 0 eda 1. Split-half kappa er 0,358 og HVERGI ofar en 0,462
      (vid 10 byrjanir) — merkid er "sanngjarnt", aldrei skarpt. Golf
      er thvi NAUDSYNLEGT en ekkert golf gerir thad skarpt.

   2. **FYRSTA MAELINGIN MIN A FALS-JAKVAEDUM VAR RANGT MAELITAEKI OG
      ER SKRIFUD HER SVO HUN VERDI EKKI ENDURTEKIN.** Hun taldi mann
      "rangt merktan" ef timabils-hittni hans for undir 0,50, og gaf
      **79% fals-jakvaedi vid 1 byrjun og 53% vid 8** — tala sem virdist
      fella hugmyndina. En hun taldi 0,48 sem VILLU. Sundurlidad
      (golf 5): 12 sannir · 11 a JADRINUM (0,40-0,50) · 5 skyrt undir
      (0,25-0,40) · **NULL undir 0,25**. Merkid skyst thvi ALDREI langt
      framhja; thad sem leit ut eins og villa var throskuldar-jitter.
      Sama aett og `\bNaN\b`-gildran i CLAUDE.md 5b: *athugadu hvort
      profid se ad maela thad sem thu heldur.*

   3. **OG MERKID BER RAUNVERULEGT MERKI — UT FYRIR URTAK.** Merkt eftir
      FYRSTU 5 byrjunum, maelt a theim sem A EFTIR ad koma:
        merktir   n=28   medal DC-hittni i framhaldinu **0,441**
        omerktir  n=252  medal DC-hittni i framhaldinu **0,168**
        munur **+0,273, 95% CI [0,218, 0,334]** (bootstrap yfir
        leikmenn, 2.000 itranir, frae 7, n=280) — **UTILOKAR NULL.**
      Til samanburdar: threpid sem var samthykkt fyrir kaup-glugga bar
      minni adskilnad, og "sleppa oheppnis-lidnum" var HAFNAD vid CI
      sem innihelt null.

   ============================================================
   HVAD ThETTA LEYFIR — OG HVAD ThAD LEYFIR EKKI
   ============================================================
   LEYFIR:  merkimida a leikmann i listanum, med `hits/starts` synilegt.
   LEYFIR EKKI:  ad merkid fari inn i `expPointsFor`, `rankScore` eda
   FFDR. Su spurning var maeld SER (`measure-exp-points-v2.mjs`,
   25.8.2026) og FELLD: DC sem inntak gefur `d top15` **0,000 CI
   [-0,239, +0,232]**, og formid sem notandinn lysti sjalfur
   (`nonDC-ppg x mult + 2 x p_hit`) er VERRA — **-0,344 CI [-0,565,
   -0,088]**, utilokar null i RANGA att. **Persistence er ekki
   forspargildi ofan a thad sem vid hofum thegar.** Merkid er thvi
   BIRTING, eins og BSD: detti thad ut brotnar ekkert annad.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const jsonOut = (() => { const i = process.argv.indexOf("--json"); return i > 0 ? process.argv[i + 1] : null; })();

/* Threskuldarnir eru their somu og `defcon.json` notar. GK ER UTILOKADUR
   og thad er MAELT, ekki alyktad: 757 leikja-umferdir, 750 byrjanir,
   NULL DefCon-stig (CLAUDE.md kafli 12). */
const THRESH = { DEF: 10, MID: 12, FWD: 12 };
const MIN_STARTS = 5;
const HIT_CUT = 0.50;

const g = JSON.parse(readFileSync(path.join(ROOT, "data", "player_gw_2526.json"), "utf8"));
const IX = Object.fromEntries(g.stats.map((s, i) => [s, i]));

const by = new Map();
for (const [code, p] of Object.entries(g.players || {})) {
  const th = THRESH[p.p];
  if (!th) continue;
  const xs = [];
  for (const [gwId, row] of Object.entries(p.gw || {})) {
    /* NEFNARINN ER BYRJANIR, EKKI LEIKIR. Innkoma af bekk gerir
       throskuldinn onaedanlegan og taldist adur sem MISS — sem skekkti
       hittnina um 40% (CLAUDE.md kafli 12). */
    if (Number(row[IX.starts]) <= 0) continue;
    xs.push({ gw: Number(gwId), hit: Number(row[IX.dc]) >= th ? 1 : 0 });
  }
  if (xs.length) by.set(code, xs.sort((a, b) => a.gw - b.gw));
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const rate = (xs) => xs.reduce((s, x) => s + x.hit, 0) / xs.length;

/* ---------- 1. split-half: hve stodugt er merkid? ---------- */
const splitHalf = [];
for (const MIN of [1, 2, 3, 4, 5, 6, 8, 10]) {
  let n = 0, agree = 0, aY = 0, bY = 0;
  for (const [, xs] of by) {
    const A = xs.filter((x) => x.gw % 2 === 1), B = xs.filter((x) => x.gw % 2 === 0);
    if (A.length < MIN || B.length < MIN) continue;
    const la = rate(A) > HIT_CUT, lb = rate(B) > HIT_CUT;
    n++; if (la === lb) agree++; if (la) aY++; if (lb) bY++;
  }
  if (!n) continue;
  const pa = agree / n, pe = (aY / n) * (bY / n) + (1 - aY / n) * (1 - bY / n);
  splitHalf.push({ min: MIN, n, agree: +(pa).toFixed(3), kappa: pe < 1 ? +((pa - pe) / (1 - pe)).toFixed(3) : null });
}

/* ---------- 2. hve alvarleg eru "fals-jakvaedin"? ---------- */
const severity = { true_over_50: 0, boundary_40_50: 0, clearly_under_25_40: 0, badly_wrong_under_25: 0 };
for (const [, xs] of by) {
  if (xs.length < 12) continue;
  const first = xs.slice(0, MIN_STARTS);
  if (first.length < MIN_STARTS || !(rate(first) > HIT_CUT)) continue;
  const r = rate(xs);
  if (r > 0.50) severity.true_over_50++;
  else if (r >= 0.40) severity.boundary_40_50++;
  else if (r >= 0.25) severity.clearly_under_25_40++;
  else severity.badly_wrong_under_25++;
}

/* ---------- 3. ber merkid merki UT FYRIR URTAK? ---------- */
const pairs = [];
for (const [code, xs] of by) {
  if (xs.length < 12) continue;
  const first = xs.slice(0, MIN_STARTS); if (first.length < MIN_STARTS) continue;
  const rest = xs.slice(MIN_STARTS); if (!rest.length) continue;
  pairs.push({ code, lab: rate(first) > HIT_CUT, fut: rate(rest) });
}
const sep = (arr) => {
  const y = arr.filter((p) => p.lab).map((p) => p.fut), n = arr.filter((p) => !p.lab).map((p) => p.fut);
  return (y.length && n.length) ? mean(y) - mean(n) : null;
};
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const boot = [];
for (let b = 0; b < 2000; b++) {
  const s = Array.from({ length: pairs.length }, () => pairs[Math.floor(rnd() * pairs.length)]);
  const d = sep(s); if (d != null) boot.push(d);
}
boot.sort((a, b) => a - b);
const out = {
  minStarts: MIN_STARTS, hitCut: HIT_CUT,
  players: by.size, splitHalf, severity,
  forward: {
    n: pairs.length,
    labelled: pairs.filter((p) => p.lab).length,
    meanLabelled: +mean(pairs.filter((p) => p.lab).map((p) => p.fut)).toFixed(3),
    meanUnlabelled: +mean(pairs.filter((p) => !p.lab).map((p) => p.fut)).toFixed(3),
    diff: +sep(pairs).toFixed(3),
    ci: [+boot[Math.floor(boot.length * 0.025)].toFixed(3), +boot[Math.floor(boot.length * 0.975)].toFixed(3)],
  },
};

console.log(`\nplayers with at least one start: ${out.players}`);
console.log("\nSPLIT-HALF on the label (raw hit rate > 0.50):");
for (const r of splitHalf) console.log(`  floor ${String(r.min).padStart(2)}  n=${String(r.n).padStart(4)}  agree ${(r.agree * 100).toFixed(1)}%  kappa ${r.kappa}`);
console.log(`\nHOW BAD ARE THE FALSE POSITIVES? (floor ${MIN_STARTS}):`);
for (const [k, v] of Object.entries(severity)) console.log(`  ${k.padEnd(24)} ${v}`);
console.log(`\nOUT OF SAMPLE (labelled on the first ${MIN_STARTS} starts, measured on the rest):`);
console.log(`  labelled     n=${out.forward.labelled}   ${out.forward.meanLabelled}`);
console.log(`  not labelled n=${out.forward.n - out.forward.labelled}  ${out.forward.meanUnlabelled}`);
console.log(`  difference ${out.forward.diff}  95% CI [${out.forward.ci[0]}, ${out.forward.ci[1]}]`);
console.log(out.forward.ci[0] > 0
  ? "\n  -> CI EXCLUDES ZERO: the label carries signal and may be shown (as a LABEL, not a model input)."
  : "\n  -> CI INCLUDES ZERO: the label carries no signal and must NOT be shown.");

if (jsonOut) { writeFileSync(jsonOut, JSON.stringify(out, null, 2)); console.log(`\nwritten: ${jsonOut}`); }
