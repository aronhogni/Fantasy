/* ============================================================
   `xP` I `data/fpl_player_gw.json` ER MENGAD — VORDUR (25.8.2026)

   HVERS VEGNA THETTA SAFN ER TIL:
   `xP`-dalkurinn litur ut eins og OKEYPIS VIDMID. Hann er FPL-eigid vaent
   stig fyrir THANN leik, og thad er beint jafngildi `ep_next`, sem er
   BASE-inn i `expPointsFor` (src/model.js). Vaeri hann leka-frjals maetti
   maela raunverulega adferd appsins yfir fimm timabil — sem ekkert annad
   gagn i repo-inu leyfir. Naesti madur SEM SER DALKINN MUN FREISTAST.

   HANN ER MENGADUR. Maelt 25.8.2026 (`scripts/measure-exp-points-v2.mjs`
   kafli 1b):
     · INNAN LEIKMANNS (leikmanns-timabil afmedaltalad) fylgir `xP`
       raunstigum med r ~0,45 medan besta LEKA-FRJALSA likan naer ~0,07.
       Innan leikmanns er fortidin naestum fost milli vikna, svo leka-frjals
       spa GETUR nanast ekki hreyfst med raunstigum — thad er einmitt
       throskurinn sem gerir profid marktaekt.
     · Og hun VEIT UM BLANKID: i theim vikum sem FASTAMADUR fekk 0 stig la
       `xP` hans ~0,58 stigum UNDIR hans eigin medaltali.
     · Utan leikmanns velur `xP` topp-15 sem fa 7,26 stig thegar thakid er
       11,66 og besta leka-frjalsa likan naer 4,73. Enginn forspar-adili er thar.

   HVAD ER SAMT LEYFILEGT: `xP5` i `tests/lib/panel2.mjs` — medaltal `xP`
   UR FYRRI umferdum. Fortidar-utkomur eru loglega thekktar, nakvaemlega eins
   og `ppg5`. Munurinn er RODIN, ekki dalkurinn, og kafli C her ver hann
   TOLULEGA en ekki med textaleit.

   THRJAR REGLUR UR CLAUDE.md 5b SEM THETTA SAFN FYLGIR:
     1. THEKJA ER FULLYRDING. Ef maelingin heimsaekir engar radir er hun
        graen og maelir ekkert — kafli A fellur undir golfi.
     2. NEIKVAED FULLYRDING VERDUR AD NEFNA EITTHVAD SEM VAR THARNA.
        Kafli D leitar ad `xP5` (sem ER i BASE_FEATURES, sannad i somu
        linu) adur en hann fullyrdir ad hratt `xP` se thad EKKI.
     3. STOKKBREYTTU THVI SEM THU LAGAR. Kafli C ber `xP5` ekki adeins vid
        retta utreikninginn heldur LIKA vid RANGA (thann sem tekur thessa
        rod med) og krefst thess ad their seu ADGREINANLEGIR — annars gaeti
        fullyrdingin ekki fallid thott einhver opnadi lekann.
   ============================================================ */
import { readFileSync } from "node:fs";
import { buildPanel, BASE_FEATURES, mean } from "./lib/panel2.mjs";
import { corr } from "./lib/e0.mjs";
import { lookupPos, POS_MEAN_PTS } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ok  ${n}`)) : (fail++, console.log(`  NO  ${n}`)); };

const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const SEASN = Object.keys(PG.seasons);

console.log("\n=== A. COVERAGE - the measurement must actually have rows ===");
const rows = buildPanel({ includeBlanks: true });
const xpMap = new Map();
for (const s of SEASN) for (const q of PG.seasons[s] || [])
  xpMap.set(`${s}|${q[H.name]}|${q[H.round]}`, q[H.xP]);
for (const r of rows) r.fplXp = xpMap.get(`${r.season}|${r.name}|${r.round}`) ?? 0;

const withXp = rows.filter(r => r.fplXp > 0);
/* Klasar = leikmanns-timabil. Faerri en 15 radir og afmedaltalið er hávaði. */
const grp = new Map();
for (const r of withXp) {
  const k = `${r.season}|${r.name}`;
  (grp.get(k) || grp.set(k, []).get(k)).push(r);
}
const groups = [...grp.values()].filter(a => a.length >= 15);
const nRows = groups.reduce((a, g) => a + g.length, 0);
console.log(`  panel rows ${rows.length}, with xP > 0: ${withXp.length}, ` +
  `player-seasons with >= 15 such rows: ${groups.length} (${nRows} rows)`);
ok(groups.length >= 1000, `COVERAGE: at least 1000 player-seasons measured (${groups.length})`);
ok(nRows >= 20000, `COVERAGE: at least 20000 rows measured (${nRows})`);

console.log("\n=== B. THE FACT - within player, xP tracks the outcome; a leak-free number cannot ===");
/* Leka-frjalsi samanburdurinn er ADFERD APPSINS sjalfs (ppg5 x FFDR-margfaldari).
   Hun er reiknud an nokkurs fitts, svo thessi vordur er odyr og hefur enga
   eigin fritt-breytu sem gaeti verid stillt til ad na tilaetladri nidurstodu. */
const appOf = r => r.ppg5 * (lookupPos(r.code, "pts", r.ffdr) / (POS_MEAN_PTS[r.code] || 3.4));
const dX = [], dA = [], dY = [];
for (const g of groups) {
  const mx = mean(g.map(r => r.fplXp)), ma = mean(g.map(appOf)), my = mean(g.map(r => r.pts));
  for (const r of g) { dX.push(r.fplXp - mx); dA.push(appOf(r) - ma); dY.push(r.pts - my); }
}
const rXp = corr(dX, dY), rApp = Math.abs(corr(dA, dY));
console.log(`  within-player corr(xP, actual points)               ${rXp.toFixed(4)}`);
console.log(`  within-player corr(leak-free app method, points)    ${rApp.toFixed(4)}`);
console.log(`  ratio                                              ${(rXp / rApp).toFixed(2)}x`);
ok(rXp > 0.25, `xP tracks the SAME-MATCH outcome within player (r ${rXp.toFixed(4)} > 0.25)`);
ok(rApp < 0.20, `the leak-free comparator does NOT (r ${rApp.toFixed(4)} < 0.20) - so the`
  + " test can tell the two apart; without this the ratio would prove nothing");
ok(rXp / rApp > 3, `xP is at least 3x the leak-free ceiling (${(rXp / rApp).toFixed(2)}x)`
  + " -> STILL CONTAMINATED. If this ever fails, the archive changed: RE-MEASURE"
  + " before treating xP as a benchmark, do not just relax the threshold.");

/* Og thad sem enginn forspar-adili getur: ad vita ad fastamadur blankar. */
const blank = [], other = [];
for (const g of groups) {
  const mx = mean(g.map(r => r.fplXp));
  for (const r of g) (r.pts === 0 && r.mins5 > 45 ? blank : other).push(r.fplXp - mx);
}
const gap = mean(other) - mean(blank);
console.log(`  xP on weeks a REGULAR blanked: ${mean(blank).toFixed(3)} vs ${mean(other).toFixed(3)} otherwise` +
  `  (gap ${gap.toFixed(3)}, n=${blank.length})`);
ok(blank.length >= 500, `COVERAGE: the blank-week case has rows (${blank.length})`);
ok(gap > 0.3, `xP is depressed on weeks the player actually blanked (gap ${gap.toFixed(3)} > 0.3)`
  + " - nothing written before the deadline knows that");

console.log("\n=== C. WHAT IS STILL ALLOWED - xP5 is STRICTLY PAST, verified numerically ===");
/* Sjalfstaed endurbygging: `xP5` a ad vera medaltal xP UR SIDUSTU 5 RODUM
   A UNDAN thessari (thau > 0), annars medaltal stiga theirra 5. Bæði
   utgafan sem ER rett OG su sem tæki thessa rod med eru reiknadar, og
   fullyrt er um baðar — annars gaeti profid ekki greint thaer i sundur.  */
{
  /* TVOFOLD UMFERD ER GILDRAN HER, OG HUN FANNST I FYRSTU UTGAFU THESSA
     KAFLA: `buildPanel` heldur `hist` PER LEIK, svo seinni leikur tvofaldrar
     umferdar SER thann fyrri — en uppfletting eftir `round` gerir thad ekki.
     Fyrsta utgafan skeikadi a 71 af 3.426 rodum af nakvaemlega theirri astaedu
     og hefdi verid lesin sem "leki i panelinu". Sami lardomur og alls stadar
     annars stadar i thessu repo-i: athugadu hvort maelitaekid se ad maela thad
     sem thu heldur. Radirnar eru thvi paradar i ROD, ekki eftir umferd.     */
  const byPl = {};
  for (const s of SEASN) for (const q of PG.seasons[s] || []) (byPl[`${s}|${q[H.name]}`] ??= []).push(q);
  for (const a of Object.values(byPl)) a.sort((x, y) => x[H.round] - y[H.round]);
  const xp5Of = hist => {
    const h = hist.slice(-5);
    if (!h.length) return null;
    const xs = h.map(q => q[H.xP]).filter(v => v > 0);
    return xs.length ? mean(xs) : mean(h.map(q => q[H.pts]));
  };
  /* Panel-radir per leikmann, i somu rod og `buildPanel` bjo thaer til. */
  const panelBy = {};
  for (const r of rows) (panelBy[`${r.season}|${r.name}`] ??= []).push(r);
  let seen = 0, sampled = 0, agree = 0, distinguishable = 0, worst = 0;
  for (const [key, prs] of Object.entries(panelBy)) {
    const arr = byPl[key]; if (!arr) continue;
    /* Ganga `arr` eins og buildPanel gerir og skra vaentanlegt xP5 per leik. */
    const exp = [];
    const hist = [];
    for (const q of arr) { exp.push(xp5Of(hist)); hist.push(q); }
    /* Panel-radirnar eru hlutmengi (tharf >= 3 leikja sogu og fixture-porun),
       en i SOMU ROD, svo thaer parast fra ENDANUM tolulega oruggt: taka
       sidustu prs.length skraningar sem eiga xP5. */
    const cands = exp.map((v, i) => ({ v, i })).filter(x => x.v != null);
    if (cands.length < prs.length) continue;
    const use = cands.slice(cands.length - prs.length);
    for (let j = 0; j < prs.length; j++) {
      if (seen++ % 37 !== 0) continue;                      // fast, deterministiskt urtak
      sampled++;
      const good = use[j].v;
      const bad = xp5Of(arr.slice(0, use[j].i + 1));         // sama, EN med thessa rod med
      const d = Math.abs(good - prs[j].xP5);
      if (d < 1e-9) agree++; else worst = Math.max(worst, d);
      if (Math.abs(good - bad) > 1e-9) distinguishable++;
    }
  }
  console.log(`  sampled ${sampled} of ${seen} rows; xP5 matches the PAST-ONLY reconstruction on ${agree}` +
    (agree < sampled ? `  (worst mismatch ${worst.toFixed(6)})` : ""));
  console.log(`  and the leaky reconstruction would differ on ${distinguishable} of them`);
  ok(sampled >= 1000, `COVERAGE: enough rows sampled (${sampled})`);
  /* GOLFID ER 0,4 OG THAD ER MAELT, EKKI VALID: ~47% rada bera xP <= 0, sem
     er SIAD BURT i badum utgafum, svo thaer geta ekki verid adgreinanlegar.
     Golf a 1,0 vaeri fullyrding sem getur ekki stadist.                    */
  ok(distinguishable > 0.4 * sampled,
    `the two reconstructions ARE distinguishable on ${distinguishable}/${sampled} rows`
    + " - so the next assertion is not a tautology (it cannot be 100%: rows whose"
    + " own xP is 0 are filtered out of both)");
  ok(agree === sampled,
    `xP5 equals the PAST-ONLY value on every sampled row (${agree}/${sampled})`);
}

console.log("\n=== D. NO SAME-ROW xP MAY ENTER A FEATURE LIST ===");
{
  /* Neikvaeda fullyrdingin nefnir fyrst eitthvad sem ER tharna (regla 2). */
  ok(BASE_FEATURES.includes("xP5"), `BASE_FEATURES does contain the PAST-only xP5`
    + " (so the search is looking in the right place)");
  const raw = BASE_FEATURES.filter(f => /^xp$/i.test(f) || /^fplXp$/i.test(f) || f === "xP");
  ok(raw.length === 0, `BASE_FEATURES contains NO same-row xP key (found: ${raw.join(",") || "none"})`);
  /* Og ad panelid setji ekki hratt xP a rodina yfirleitt. `fplXp` her ad ofan
     var sett af THESSU safni, ekki af `buildPanel` — thad er sannreynt.    */
  const fresh = buildPanel({ includeBlanks: false })[0];
  const leaky = Object.keys(fresh).filter(k => /^(xP|fplXp|xp)$/.test(k));
  ok(leaky.length === 0, `buildPanel puts no raw same-row xP on a row (found: ${leaky.join(",") || "none"})`);
}

console.log(`\nxP-CONTAMINATION: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
