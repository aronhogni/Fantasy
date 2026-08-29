/* ============================================================
   arank-world.mjs — VORDUR A SAMEIGINLEGA HERMINUM

   Rynni 29.8.2026 benti a ad ENGINN vordur snerti
   `scripts/lib/arank-world.mjs`, thott hann beri hverja einustu tolu i
   TVEIMUR maelingaskrám: t-morkin, tekna-profid, stadalvilluna sem er
   klosud per timabil, og hristinginn a vellinum. Regla thessa repos er
   skyr — vordur sem keyrir ekki er ekki vordur, og tafla sem enginn
   ber vid sjalfstaeda utfaerslu er agiskun sem litur ut eins og tafla.

   Skrain er PROFANLEG af thvi ad hun er BOKASAFN: hun keyrir ekkert
   vid innflutning. Kafli 5 fullyrdir thad um baðar skriftur sem nota
   hana — `arank-need-lab.mjs` erfdi oskilyrta `main()` i fyrstu utgafu.
   ============================================================ */
import { tCrit, binomialTail, noisyField, vbdBoard, vbdValues, REPL_VARIANTS }
  from "../scripts/lib/arank-world.mjs";
import { tCritDf } from "../src/learn.js";

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

/* ---------- 1. t-MORKIN GEGN SJALFSTAEDUM UTREIKNINGI ---------- */
console.log("\n1. t-morkin");
{
  /* Sjalfstaed utfaersla: t(0,975, df) ur ofugu ohreinu beta-falli.
     ÞETTA ER AKKERID — an thess vaeri taflan borin vid sjalfa sig. */
  const lnGamma = (x) => {
    const g = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, t = x + 5.5;
    t -= (x + 0.5) * Math.log(t);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += g[j] / ++y;
    return -t + Math.log(2.5066282746310005 * ser / x);
  };
  const betacf = (a, b, x) => {
    const EPS = 3e-14, FPMIN = 1e-300;
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d; let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  };
  const betai = (a, b, x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b)
      + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a
      : 1 - bt * betacf(b, a, 1 - x) / b;
  };
  /* P(|T| > t) = I_{df/(df+t^2)}(df/2, 1/2) */
  const twoTail = (t, df) => betai(df / 2, 0.5, df / (df + t * t));
  let worst = 0, worstDf = null;
  for (let df = 1; df <= 30; df++) {
    const p = twoTail(tCrit(df), df);
    const err = Math.abs(p - 0.05);
    if (err > worst) { worst = err; worstDf = df; }
  }
  ok(worst < 0.0015, `hvert gildi df 1..30 gefur tvihlida p = 0,05 ` +
    `(mesta frávik ${worst.toExponential(1)} vid df=${worstDf})`);
  ok(tCrit(4) === 2.776 && tCrit(10) === 2.228,
    "og thekktu akkerin standa (df=4 -> 2,776 · df=10 -> 2,228)");
  ok(tCrit(0) === Infinity && tCrit(-3) === Infinity,
    "df < 1 gefur Infinity — ENGIN mork, ekki 1,96 (annars vaeri tomt urtak marktaekt)");
  ok(tCrit(45) === 1.96, "yfir df=30 tekur normal-nalgunin vid");
  /* EIN TAFLA: `learn.js` er heimildin og `arank-world` flytur hana inn. */
  for (const df of [1, 4, 9, 10, 25, 31]) {
    if (tCrit(df) !== tCritDf(df)) { ok(false, `df=${df} er EKKI sama tafla og i learn.js`); break; }
  }
  ok([1,4,9,10,25,31].every((df) => tCrit(df) === tCritDf(df)),
    "og hun er SAMA taflan og `src/learn.js` ber — ekki afrit");
}

/* ---------- 2. TEKNA-PROFID ---------- */
console.log("\n2. tekna-prof");
{
  ok(Math.abs(binomialTail(5, 5) - 1 / 32) < 1e-12, "5 af 5 -> p = 1/32");
  ok(Math.abs(binomialTail(0, 5) - 1) < 1e-12, "0 af 5 -> p = 1");
  ok(Math.abs(binomialTail(3, 5) - 0.5) < 1e-12, "3 af 5 -> p = 0,5");
  ok(binomialTail(11, 11) < 0.0005, "11 af 11 -> p < 0,0005");
  /* EINHLIDA og thad er SAGT: p(k) + p(n-k+1) = 1 fyrir samhverft n. */
  ok(Math.abs(binomialTail(8, 11) - 0.11328125) < 1e-9, "8 af 11 -> p = 0,1133");
}

/* ---------- 3. HRISTINGURINN NOTAR MAELDA DREIFINGU ---------- */
console.log("\n3. hristur vollur");
{
  /* Tveir menn med SAMA ADP en ollik `adpSd`. Sa med haerra fravik VERDUR
     ad flakka meira — thad er hela tilgangur fallsins og thad var
     ONOTAD i marga manudi (laugin bar ekki `adpSd`). */
  const mk = (id, adp, sd) => ({ id, adp, adpSd: sd });
  const pool = [mk("tight", 50, 1), mk("loose", 50, 25)];
  for (let i = 0; i < 60; i++) pool.push(mk(`f${i}`, 20 + i, 5));
  let tightMove = 0, looseMove = 0;
  const base = new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1]));
  for (let r = 1; r <= 200; r++) {
    const f = noisyField(pool, r * 7919);
    tightMove += Math.abs(f.get("tight") - base.get("tight"));
    looseMove += Math.abs(f.get("loose") - base.get("loose"));
  }
  ok(looseMove > tightMove * 3,
    `hár breytileiki hristist margfalt meira (${looseMove} a moti ${tightMove})`);
  /* DETERMINISTISKT: sama fraekorn -> sama rod. Vaeri thad ekki svo
     vaeri hver keyrsla onnur maeling og engin theirra endurgeranleg. */
  const a = [...noisyField(pool, 12345).entries()].join();
  const b = [...noisyField(pool, 12345).entries()].join();
  ok(a === b, "sama fraekorn gefur SOMU rod (maelingin er endurgeranleg)");
  ok([...noisyField(pool, 1).entries()].join() !== a, "annad fraekorn gefur adra");
  /* VANTI `adpSd` er varaleidin notud — og hun ma ekki KASTA. */
  const noSd = pool.map((p) => ({ id: p.id, adp: p.adp }));
  ok(noisyField(noSd, 7).size === noSd.length, "vantandi `adpSd` fellur i varaleid an thess ad kasta");
}

/* ---------- 4. VBD: BORDID OG GILDIN ERU SAMA RODIN ---------- */
console.log("\n4. vbdBoard og vbdValues");
{
  const pool = [];
  for (let i = 0; i < 60; i++) pool.push({ id: `rb${i}`, pos: "RB", proj: 300 - i * 3 });
  for (let i = 0; i < 60; i++) pool.push({ id: `wr${i}`, pos: "WR", proj: 280 - i * 2 });
  const board = vbdBoard(pool, REPL_VARIANTS["starters+flex (current)"], {});
  const vals = vbdValues(pool, REPL_VARIANTS["starters+flex (current)"], {});
  const fromVals = [...vals.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const fromBoard = [...board.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
  ok(fromVals.join() === fromBoard.join(),
    "`vbdValues` og `vbdBoard` gefa NAKVAEMLEGA somu rod (tvaer utfaerslur af sama tali)");
  ok(board.get("rb0") === 1, "besti madurinn er nr. 1");
  /* Kortid er RADAD — `bestAvailable` gengur thad i rod og treystir thvi. */
  const order = [...board.values()];
  ok(order.every((v, i) => i === 0 || v > order[i - 1]),
    "og kortid er i vaxandi rod (bestAvailable gengur thad i rod)");
}

/* ---------- 5. BOKASAFN, EKKI SKRIFTA ---------- */
console.log("\n5. innflutningur keyrir ENGA maelingu");
{
  /* `arank-lab.mjs` kallar `main()` OSKILYRT — thess vegna er hermirinn
     hér. Baðar hinar verda ad vera oskadlegar i innflutningi. */
  const t0 = Date.now();
  await import("../scripts/arank-need-lab.mjs");
  const ms = Date.now() - t0;
  ok(ms < 3000, `\`arank-need-lab.mjs\` keyrir ekkert vid innflutning (${ms} ms)`);
  const src = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL("../scripts/arank-need-lab.mjs", import.meta.url), "utf8"));
  ok(/invokedDirectly/.test(src) && !/^main\(\)/m.test(src),
    "og hlidid er i kodanum, ekki adeins i hegduninni");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
