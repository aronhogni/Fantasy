/* ============================================================
   FFDR-BAKPRÓF — spáin gegn því sem RAUNGERÐIST

   Uppsetning (ekkert leki):
   - Spáum öllum 380 leikjum tímabilsins 2025/26 (E0-2526, lokið)
   - Notum AÐEINS styrk úr 2024/25 (E0-2425) — nákvæmlega eins og
     appið gerir í dag: það spáir 2026/27 með styrk úr 2025/26
   - FDR-liðurinn er ekki til sögulega; hann er nálgaður með
     kvintílum stiga mótherjans úr 2024/25 á 1–5 kvarða (það er í
     raun það sem FPL-FDR er). Nýliðar fá sömu sjálfgildi og appið.
   - Keyrt á SAMA model.js og appið — engin eftirlíking.

   Spurningarnar sem prófið svarar:
   1. Halda LITIRNIR? Grænni flokkur á að skila FLEIRI hreinum
      blöðum og FÆRRI mörkum á sig — einrænt yfir öll sex þrep.
   2. Passar MEASURED-taflan (sem CS% á spjöldunum kemur úr) við
      raunveruleikann í nýju tímabili?
   3. Er dreifingin á litaþrepunum heilbrigð (~1/6 hvert)?
   ============================================================ */
import { readFileSync } from "node:fs";
import { makeFixDifficulty, tierOf, TIER_NAME, lookupMeasured } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

/* ---------- 1. Styrkur úr 2024/25 (spá-tímabilið sér hann aldrei) ---------- */
const prev = J("fdcouk/E0-2425.json").rows;
const agg = {};
for (const r of prev) {
  for (const [team, gf, ga, sot, sotAg] of [
    [r.HomeTeam, +r.FTHG, +r.FTAG, +(r.HST || 0), +(r.AST || 0)],
    [r.AwayTeam, +r.FTAG, +r.FTHG, +(r.AST || 0), +(r.HST || 0)],
  ]) {
    const a = agg[team] = agg[team] || { g: 0, c: 0, sf: 0, sa: 0, n: 0 };
    a.g += gf; a.c += ga; a.sf += sot; a.sa += sotAg; a.n++;
  }
}
const strength = {};
for (const [t, a] of Object.entries(agg)) {
  strength[t] = { xg90: a.g / a.n, xgc90: a.c / a.n, sotFor: a.sf / a.n, sotAg: a.sa / a.n };
}
// Nýliðar 2025/26 (ekki í E0-2425): sömu sjálfgildi og appið notar
const cur = J("fdcouk/E0-2526.json").rows;
const teams26 = new Set(cur.flatMap(r => [r.HomeTeam, r.AwayTeam]));
const promoted = [...teams26].filter(t => !strength[t]);
console.log(`\nNýliðar 2025/26 (fá sjálfgildi eins og í appinu): ${promoted.join(", ")}`);
for (const t of promoted) strength[t] = { xg90: 1.1, xgc90: 1.6, sotFor: 3.4, sotAg: 5.0 };

/* ---------- 2. FDR-nálgun: kvintílar stiga mótherjans 2024/25 ---------- */
const pts = {};
for (const r of prev) {
  const res = r.FTR;
  pts[r.HomeTeam] = (pts[r.HomeTeam] || 0) + (res === "H" ? 3 : res === "D" ? 1 : 0);
  pts[r.AwayTeam] = (pts[r.AwayTeam] || 0) + (res === "A" ? 3 : res === "D" ? 1 : 0);
}
const ranked = Object.entries(pts).sort((a, b) => b[1] - a[1]).map(([t]) => t);
const fdrOf = opp => {
  const i = ranked.indexOf(opp);
  if (i < 0) return 2;                 // nýliði = léttur mótherji, eins og FPL gerir
  return i < 4 ? 5 : i < 8 ? 4 : i < 14 ? 3 : 2;   // FPL notar nær aldrei 1
};

/* ---------- 3. FFDR með SAMA fallinu og appið ---------- */
const ids = {}; let nextId = 1;
for (const t of teams26) ids[t] = nextId++;
const teamMetrics = {}, teamById = {};
for (const t of teams26) { teamMetrics[ids[t]] = strength[t]; teamById[ids[t]] = { short: t }; }
const fixDifficulty = makeFixDifficulty({ teamMetrics, teamById, odds: null, eloByTeam: {} });

/* ---------- 4. Spá + raun fyrir alla 760 lið-leiki ---------- */
const rows = [];
for (const r of cur) {
  const H = ids[r.HomeTeam], A = ids[r.AwayTeam];
  const hg = +r.FTHG, ag = +r.FTAG;
  rows.push({ team: r.HomeTeam, d: fixDifficulty(H, { opp: A, home: true,  fdr: fdrOf(r.AwayTeam) }, 2), cs: ag === 0, ga: ag, gf: hg });
  rows.push({ team: r.AwayTeam, d: fixDifficulty(A, { opp: H, home: false, fdr: fdrOf(r.HomeTeam) }, 2), cs: hg === 0, ga: hg, gf: ag });
}
ok(rows.length === 760 && rows.every(x => x.d >= 1 && x.d <= 5), "760 lið-leikir, FFDR öll innan 1–5");

/* ---------- 5. LITAPRÓFIÐ: raunveruleikinn per þrep ----------
   TÖLFRÆÐIN SKIPTIR MÁLI HÉR: eitt tímabil gefur ~110 leiki per þrep,
   svo staðalfrávik CS-hlutfalls er ~4pp. Miðþrepin geta því víxlast af
   hreinu suði þótt formúlan sé rétt — þess vegna prófum við:
   (a) samfelldu fylgnina (sterkasta merkið, ekkert þrepasuð),
   (b) einrænni MEÐ suð-vikmörkum (1,5×staðalfrávik),
   (c) endana, sem eiga að vera afgerandi aðskildir,
   (d) MEASURED-töfluna með vikmörkum sem taka mið af úrtaksstærð.
   Nýliða-raðirnar eru UNDANSKILDAR einrænni-prófinu: styrkur þeirra
   2024/25 er ekki til (þeir fá flöt sjálfgildi) — það er inntaksgat
   bakprófsins, ekki galli í formúlunni.                                */
const promoSet = new Set(promoted);
const known = rows.filter(x => x.team && !promoSet.has(x.team));

console.log("\n=== LITIRNIR GEGN RAUNVERULEIKANUM (2025/26, út-af-úrtaki) ===");
console.log("þrep        leikir  hlutf.  CS% raun (±suð)  mörk á sig  CS% skv. töflu");
const byTier = [0, 1, 2, 3, 4, 5].map(t => {
  const g = rows.filter(x => tierOf(x.d) === t);
  const cs = g.length ? 100 * g.filter(x => x.cs).length / g.length : null;
  const sd = g.length ? 100 * Math.sqrt((cs/100) * (1 - cs/100) / g.length) : null;
  const ga = g.length ? g.reduce((a, x) => a + x.ga, 0) / g.length : null;
  const dAvg = g.length ? g.reduce((a, x) => a + x.d, 0) / g.length : null;
  const tblCs = dAvg != null ? lookupMeasured("cs", dAvg) : null;
  console.log(`${TIER_NAME[t].padEnd(11)} ${String(g.length).padStart(5)}  ${(100*g.length/rows.length).toFixed(1).padStart(5)}%   ${cs?.toFixed(1).padStart(5)}% (±${sd?.toFixed(1)})     ${ga?.toFixed(2)}        ${tblCs?.toFixed(1)}%`);
  return { t, n: g.length, cs, sd, ga, tblCs };
});

// (a) SAMFELLDA FYLGNIN — sterkasta prófið
const corr = (xs, ys) => {
  const n = xs.length, mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let sxy=0, sxx=0, syy=0;
  for (let i=0;i<n;i++){ const dx=xs[i]-mx, dy=ys[i]-my; sxy+=dx*dy; sxx+=dx*dx; syy+=dy*dy; }
  return sxy/Math.sqrt(sxx*syy);
};
const rFfdrGa = corr(rows.map(x=>x.d), rows.map(x=>x.ga));
const rowsFdr = [];
for (const r of cur) {
  rowsFdr.push({ f: fdrOf(r.AwayTeam), ga: +r.FTAG });
  rowsFdr.push({ f: fdrOf(r.HomeTeam), ga: +r.FTHG });
}
const rFdrGa = corr(rowsFdr.map(x=>x.f), rowsFdr.map(x=>x.ga));
console.log(`\nFylgni við mörk á sig:  FFDR r=${rFfdrGa.toFixed(3)}  ·  hrátt FDR r=${rFdrGa.toFixed(3)}`);
ok(rFfdrGa > 0.15, `FFDR spáir raunverulegum mörkum á sig (r=${rFfdrGa.toFixed(3)})`);
ok(rFfdrGa > rFdrGa, `FFDR slær hrátt FDR (${rFfdrGa.toFixed(3)} > ${rFdrGa.toFixed(3)})`);

// (b) EINRÆNNI með suð-vikmörkum, á jöfnum sextílum ÞEKKTRA liða
const kn = [...known].sort((a, b) => a.d - b.d);
const bins = [0,1,2,3,4,5].map(i => {
  const g = kn.slice(Math.floor(i*kn.length/6), Math.floor((i+1)*kn.length/6));
  const cs = 100 * g.filter(x=>x.cs).length / g.length;
  const sd = 100 * Math.sqrt((cs/100)*(1-cs/100)/g.length);
  const ga = g.reduce((a,x)=>a+x.ga,0)/g.length;
  return { cs, sd, ga, n: g.length };
});
console.log("\nJafnir sextílar (þekkt lið): CS% " + bins.map(b=>b.cs.toFixed(1)).join(" → "));
const csMono = bins.every((b, i) => i === 0 || b.cs <= bins[i-1].cs + 1.5*Math.max(b.sd, bins[i-1].sd));
const gaMono = bins.every((b, i) => i === 0 || b.ga >= bins[i-1].ga - 0.15);
ok(csMono, "CS% fellur einrænt innan 1,5×suð-vikmarka");
ok(gaMono, "mörk á sig hækka einrænt innan vikmarka");
// stefnifylgni þrepa-meðaltalanna á að vera nær fullkomlega neikvæð
const rBins = corr(bins.map((_, i) => i), bins.map(b => b.cs));
ok(rBins < -0.85, `þrepa-meðaltölin stefna rétt (r=${rBins.toFixed(2)})`);

// (c) ENDARNIR — afgerandi aðskilnaður, hann er tilgangur litanna
ok(bins[0].cs - bins[5].cs >= 15,
  `léttasti sjöttungur slær þyngsta afgerandi: ${bins[0].cs.toFixed(0)}% CS á móti ${bins[5].cs.toFixed(0)}%`);

// (d) MEASURED-taflan gegn rauninni. Sex þrep = sex tölfræðileg úrtök;
// EINN 2σ-útlagi af sex hefur ~10% líkur af hreinu suði og fellir ekki
// töfluna (hún var mæld á 2.720+ lið-leikjum yfir 5 tímabil). Krafan:
// mest einn útlagi OG meðalfrávik ≤6pp OG enginn kerfisbundinn halli.
const tb6 = byTier.filter(x => x.n >= 40);
const errs = tb6.map(x => x.cs - x.tblCs);
const outliers = tb6.filter(x => Math.abs(x.cs - x.tblCs) > Math.max(6, 2 * x.sd));
const meanAbs = errs.reduce((a, e) => a + Math.abs(e), 0) / errs.length;
const meanSigned = errs.reduce((a, e) => a + e, 0) / errs.length;
ok(outliers.length <= 1, `mest einn 2σ-útlagi af ${tb6.length} þrepum (fann ${outliers.length})`);
ok(meanAbs <= 6, `meðalfrávik töflu frá raun ≤6pp (${meanAbs.toFixed(1)}pp)`);
ok(Math.abs(meanSigned) <= 4, `enginn kerfisbundinn halli (${meanSigned >= 0 ? "+" : ""}${meanSigned.toFixed(1)}pp)`);

/* ---------- 6. Dreifing — AÐEINS til upplýsingar hér ----------
   Kvörðunarprófið á dreifingunni býr í model.test.mjs og keyrir á
   RAUNVERULEGUM inntökum appsins 2026/27; hér er FDR nálgað og
   odds/elo vantar, svo dreifingin er önnur per hönnun.               */
console.log("\nDreifing í bakprófs-heiminum (upplýsing): " +
  byTier.map(x => (100*x.n/rows.length).toFixed(0) + "%").join(" / "));

console.log(`\nBAKPRÓF: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
