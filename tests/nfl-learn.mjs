/* ============================================================
   nfl-learn.mjs — ver TOLFRAEDINA sem allar niðurstodurnar hvila a.

   Ef ridge-fittid, krossprofunin eda bootstrappid er rangt tha eru
   allar tolur i Model-lab-flipanum rangar OG truverdugar. Thess vegna
   er hver adgerd profud gegn TILVIKI THAR SEM SVARID ER THEKKT
   FYRIRFRAM, ekki bara gegn sjalfri ser.

   Kafli 4 er mikilvaegastur: bootstrappid VERDUR ad vera klosad per
   timabil. Vaeri thad klosad per rod yrdu vikmorkin margfalt of throng
   og hver einasti munur liti ut fyrir ad vera marktaekur.
   ============================================================ */

import {
  solve, standardize, designMatrix, ridgeFit, ridgePredict, pickLambda,
  spearman, rankArray, mae, rmse, hitRate, mean, bootstrapDiff,
} from "../src-nfl/learn.js";

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const near = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m} (${a} ~ ${b})`);

/* ---------- 1. LINULEG ALGEBRA ---------- */
console.log("\n1. jofnuhneppi");
{
  const x = solve([[2, 1], [1, 3]], [5, 10]);
  near(x[0], 1, 1e-9, "leysir 2x+y=5, x+3y=10 -> x=1");
  near(x[1], 3, 1e-9, "…y=3");

  /* Sinngult hneppi ma EKKI skila tolum. Vaeri skilad NaN faeri thad
     thogult i gegnum allt likanid og birtist sem "—" i toflu. */
  ok(solve([[1, 2], [2, 4]], [1, 2]) === null, "sinngult hneppi skilar null");

  /* Snuningur: fyrsta stodid er 0 og verdur ad vixlast. */
  const y = solve([[0, 1], [1, 0]], [2, 3]);
  near(y[0], 3, 1e-9, "hlutasnuningur virkar thegar stod er 0");
}

/* ---------- 2. RIDGE ---------- */
console.log("\n2. ridge");
{
  /* Thekkt tilvik: y = 3*x1 + 0*x2 + havadi-laust. Med lambda -> 0
     a studullinn ad naest hitta 3 (a stodludum kvarda). */
  const n = 200;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const x1 = (i % 20) - 10, x2 = ((i * 7) % 13) - 6;
    rows.push({ x1, x2, y: 3 * x1 + 50 });
  }
  const cols = ["x1", "x2"];
  const stats = standardize(rows, cols);
  const X = designMatrix(rows, cols, stats, { missingFlags: false });
  const y = rows.map((r) => r.y);

  const m0 = ridgeFit(X, y, 1e-6);
  const pred = ridgePredict(m0, X);
  near(rmse(pred, y), 0, 1e-6, "havadalaust samband er fittad nakvaemlega");
  near(m0.intercept, mean(y), 1e-9, "skurdpunktur er medaltal y");
  ok(Math.abs(m0.beta[0]) > Math.abs(m0.beta[1]) * 100,
    "studull a merkjandi breytu er margfalt staerri en a havada");

  /* HAERRA LAMBDA VERDUR AD SKREPPA. Ef thad gerir thad ekki er
     refsingin ekki ad virka og offitting er ovarid. */
  const mBig = ridgeFit(X, y, 1e6);
  ok(Math.abs(mBig.beta[0]) < Math.abs(m0.beta[0]),
    "haerra lambda skreppir studlana");

  ok(pickLambda(X, y).valueOf() <= 1000, "lambda-valid skilar gildi ur netinu");

  /* Vantandi gildi: fara i medaltal OG fa eigin vitisbreytu. */
  const withNull = [{ x1: null, x2: 1 }, { x1: 5, x2: 2 }];
  const D = designMatrix(withNull, cols, stats);
  ok(D[0].length === 4, "vitisbreytur baetast vid (2 dalkar -> 4)");
  ok(D[0][0] === 0, "vantandi gildi verdur 0 a stodludum kvarda (= medaltal)");
  ok(D[0][2] === 1 && D[1][2] === 0, "vitisbreyta merkir HVAR gildid vantadi");
}

/* ---------- 3. MAELIKVARDAR ---------- */
console.log("\n3. maelikvardar");
{
  near(spearman([1, 2, 3, 4], [1, 2, 3, 4]), 1, 1e-9, "fullkomin rod -> 1");
  near(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1, 1e-9, "ofug rod -> -1");
  ok(spearman([1, 2], [1, 2]) === null, "of litid urtak -> null");

  const r = rankArray([10, 10, 20]);
  near(r[0], 1.5, 1e-9, "jafntefli fa MEDALROD");
  near(r[1], 1.5, 1e-9, "…badir");
  near(r[2], 3, 1e-9, "…og sa haesti faer 3");

  near(mae([1, 2, 3], [2, 2, 2]), 2 / 3, 1e-9, "MAE rett");
  near(rmse([0, 0], [3, 4]), Math.sqrt(12.5), 1e-9, "RMSE rett");

  /* Hittni krefst laugar sem er STAERRI en N — annars er "topp N"
     allir og talan er 1,000 hvernig sem radad er. */
  ok(hitRate([5, 4, 3], [5, 4, 3], 3) === null,
    "of grunn laug skilar null i stad falskra 100%");
  const p = Array.from({ length: 20 }, (_, i) => 20 - i);
  near(hitRate(p, p, 10), 1, 1e-9, "fullkomin rod hittir 100%");
  near(hitRate(p, p.slice().reverse(), 10), 0, 1e-9, "ofug rod hittir 0%");
}

/* ---------- 4. BOOTSTRAP — PROFSTEINNINN ---------- */
console.log("\n4. BOOTSTRAP: klosad per timabil");
{
  /* Tvo likon thar sem A er ALLTAF 100 stigum betra. Vikmorkin eiga
     ad utiloka null. */
  const A = { 2019: 1100, 2020: 1200, 2021: 1150, 2022: 1300, 2023: 1250 };
  const B = { 2019: 1000, 2020: 1100, 2021: 1050, 2022: 1200, 2023: 1150 };
  const d = bootstrapDiff(A, B);
  near(d.diff, 100, 1e-9, "punktmat er raunverulegi munurinn");
  ok(d.excludesZero, "stodugur munur -> vikmorkin utiloka null");
  ok(d.lo > 0 && d.hi > 0, "badar vikmarka-hlidar jakvaedar");

  /* Likon sem skiptast a ad vinna med stórum sveiflum: EKKI marktaekt. */
  const C = { 2019: 1300, 2020: 900, 2021: 1250, 2022: 950, 2023: 1200 };
  const D2 = { 2019: 900, 2020: 1300, 2021: 950, 2022: 1250, 2023: 1000 };
  const d2 = bootstrapDiff(C, D2);
  ok(!d2.excludesZero,
    `sveiflukenndur munur er EKKI marktaekur (${d2.lo.toFixed(0)}..${d2.hi.toFixed(0)})`);

  /* ENDURGERANLEIKI: fast fraekorn -> sama svar i hvert sinn. */
  const a1 = bootstrapDiff(A, B), a2 = bootstrapDiff(A, B);
  ok(a1.lo === a2.lo && a1.hi === a2.hi,
    "somu inntok gefa somu vikmork — ekkert Math.random");

  ok(bootstrapDiff({ 2019: 1 }, { 2019: 0 }) === null,
    "of fa ar -> null i stad tolu sem litur ut eins og maeling");

  /* KJARNINN: vikmorkin verda ad VIDA thegar arin eru faerri.
     Vaeri klosad per ROD i stad per ARI yrdu thau nanast engin.

     ATH: munurinn VERDUR ad sveiflast milli ara. Vaeri hann nakvaemlega
     sami i hverju ari gaefi hver einasta endurtekt sama svar og bædi
     vikmork yrdu 0 breid — profid vaeri tha ad bera saman tvo null og
     stadfesta ekkert. Fyrsta utgafan gerdi einmitt thad. */
    const mkPair = (diffs) => {
      const a = {}, b = {};
      Object.entries(diffs).forEach(([y, d]) => { a[y] = 1000 + d; b[y] = 1000; });
      return [a, b];
    };
    const [fA, fB] = mkPair({ 2022: 40, 2023: 160, 2024: 100 });
    const [mA, mB] = mkPair({ 2018: 40, 2019: 160, 2020: 100, 2021: 60,
                              2022: 140, 2023: 90, 2024: 110, 2025: 80 });
    const few = bootstrapDiff(fA, fB);
    const many = bootstrapDiff(mA, mB);
    ok((few.hi - few.lo) > (many.hi - many.lo),
      `faerri ar gefa VIDARI vikmork (${(few.hi - few.lo).toFixed(0)} > ${(many.hi - many.lo).toFixed(0)})`);
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
