/* ============================================================
   GRUNNURINN SJALFUR — ER `ep_next` VONDUR GRUNNUR? (4.9.2026)

   Keyrsla:  node scripts/measure-base.mjs
             node scripts/measure-base.mjs --json /tmp/base.json

   ATHUGASEMDIR A ISLENSKU (rokstudningur, CLAUDE.md kafli 9);
   ALLIR PRENTADIR STRENGIR A ENSKU.

   SPURNINGIN (eiganda, ordrett): „eg vill lika gera projected points
   betri, thad er ekkert ad marka thau."

   HVERS VEGNA ThESSI SKRIFTA ER EKKI ENDURTEKNING A
   `measure-exp-points-v2.mjs` (25.8.2026): SU maeldi hvort baeta megi
   INNTOKUM ofan a bygginguna `grunnur x FFDR-margfaldari` og felldi sex
   tilgatur. Hun skildi eftir EINA setningu sem var aldrei profud:
   *„thad var aldrei um minutur, hratt 5-leikja medaltal er einfaldlega
   VONDUR GRUNNUR."* Grunnurinn sjalfur var aldrei borinn vid annad.

   `expPointsFor` notar `ep_next` med `points_per_game` sem varaleid.
   MAELT A LIFANDI SVARI (26.8.2026, sama lota): `ep_next === form` hja
   94,2% theirra sem hofdu spilad — svo „FPL-eigid vaent stig" er i
   framkvaemd 30-daga medaltal. Sangare fekk 2,3 af thvi ad hann hafdi
   skorad litid, ekki af thvi ad leikurinn vaeri erfidur.

   `xP` UR SOGUNNI MA EKKI VERA VIDMID (CLAUDE.md, `xp-contaminated.mjs`):
   hun er reiknud EFTIR A og fylgir raunstigum r 0,4529 a moti 0,0720 hja
   leka-frjalsu likani. Stadgengill `ep_next` i sogunni er thvi `ppg5`
   (5-leikja medaltal med blonkum), sem er nakvaemlega thad sem `form` er.

   FRAMBJODENDUR (allir reiknanlegir I APPINU i dag — engin ny heimild):
     A  ppg5      hratt 5-leikja medaltal          (stadgengill `ep_next`)
     B  ppgAll    medaltal timabilsins til thessa
     C  shrunk    (sumPts + K x prior) / (n + K)
     D  shrunkMin sama, per 90, x vaentar minutur
   `prior` er ppg fyrra timabils thegar hun er til, annars STODU-MEDALTAL
   sem er reiknad UR HINUM timabilunum (LOSO) — aldrei ur thvi sem er maelt.

   MAELT EINS OG ANNAD I REPO-INU: bootstrap KLASAD (leikmenn fyrir
   r/MAE, UMFERDIR fyrir topp-15), 400 itranir, fast frae 7. Lidur er
   thess virdi ADEINS ef CI utilokar null.

   LAUGIN ER FOST OG HUN BER BLONK (`includeBlanks: true`): spurningin er
   „hvern a eg ad velja", ekki „hve morg stig EF hann spilar".
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { buildPanel, POSN } from "../tests/lib/panel2.mjs";
import { bootstrapCI, byPlayer, ci, fmt } from "./start-panel.mjs";
import { lookupPos, POS_MEAN_PTS } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
const OUT = {};
const argJson = process.argv.indexOf("--json");
const line = (c = "-", n = 78) => console.log(c.repeat(n));
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

/* ---------- Rodin: fortid EIN, per (timabil, nafn, umferd) ----------
   Panel2 gefur ekki uppsafnadar summur ut, og ad BAETA theim thangad
   vaeri breyting a sameiginlegu safni sem oll bakprofin lesa. Their eru
   thvi reiknadar her og PARADAR vid rodina a nakvaemum lykli.        */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const SEASONS = Object.keys(PG.seasons);

const past = new Map();          // "season|name|round" -> {sumPts, n, sumMins, starts}
const prevSeason = new Map();    // "season|name" -> {ppg, mins, n}
for (const [season, list] of Object.entries(PG.seasons)) {
  const agg = {};
  for (const q of list) {
    const a = agg[q[H.name]] ||= { p: 0, m: 0, n: 0 };
    a.p += q[H.pts]; a.m += q[H.mins]; a.n++;
  }
  const nx = SEASONS[SEASONS.indexOf(season) + 1];
  if (nx) for (const [nm, a] of Object.entries(agg))
    if (a.n >= 5) prevSeason.set(`${nx}|${nm}`, { ppg: a.p / a.n, mins: a.m / a.n, n: a.n });
  const by = {};
  for (const q of list) (by[q[H.name]] ||= []).push(q);
  for (const [nm, arr] of Object.entries(by)) {
    arr.sort((a, b) => a[H.round] - b[H.round]);
    let p = 0, m = 0, n = 0, st = 0;
    for (const q of arr) {
      past.set(`${season}|${nm}|${q[H.round]}`, { sumPts: p, n, sumMins: m, starts: st });
      p += q[H.pts]; m += q[H.mins]; n++; st += q[H.starts] >= 1 ? 1 : 0;
    }
  }
}

/* ---------- Laugin ---------- */
/* `minHistory: 1` OG ThAD ER EKKI VAL: `buildPanel` les `l5[0]` fyrir
   verdbreytinguna, svo umferd an SOGU kastar. GW1 er thvi UTAN
   maelingarinnar — sem er rett hvort ed er, thvi engin af thessum
   grunnum er skilgreindur ThAR (`n = 0`); GW1 er eigid vandamal og
   eigin maeling (`measure-tail-to-gw1.mjs`).                        */
console.log("building panel (blanks included, history floor 1) ...");
const rows = buildPanel({ minHistory: 1, includeBlanks: true })
  .map(r => ({ ...r, ...(past.get(`${r.season}|${r.name}|${r.round}`) || {}),
               prev: prevSeason.get(`${r.season}|${r.name}`) || null }))
  .filter(r => r.n != null);
console.log(`rows: ${rows.length}  seasons: ${[...new Set(rows.map(r => r.season))].join(", ")}`);

/* ---------- Stodu-medaltal, LOSO ----------
   Reiknad UR HINUM timabilunum. Vaeri thad reiknad ur ollum vaeri
   forgildid buid ad sja utkomuna sem thad er borid vid.              */
const posPrior = {};             // season -> pos -> ppg
for (const s of new Set(rows.map(r => r.season))) {
  const o = {};
  for (const p of ["GK", "DEF", "MID", "FWD"]) {
    const v = rows.filter(r => r.season !== s && r.pos === p).map(r => r.pts);
    o[p] = v.length ? mean(v) : 2;
  }
  posPrior[s] = o;
}

/* ---------- Frambjodendur ----------
   ALLIR nota adeins tolur sem appid hefur fyrir frest.               */
const priorOf = r => r.prev ? r.prev.ppg : posPrior[r.season][r.pos];
const BASES = {
  ppg5:   r => r.ppg5,
  ppgAll: r => (r.n > 0 ? r.sumPts / r.n : priorOf(r)),
  shrunk: (r, K) => (r.sumPts + K * priorOf(r)) / (r.n + K),
  shrunkMin: (r, K) => {
    /* Stig per 90 skrumpud, sinnum vaentar minutur. Vaentar minutur eru
       5-leikja medaltal — SAMA tala og appid a (`mins5`).            */
    const n90 = r.sumMins / 90;
    const prior90 = r.prev && r.prev.mins > 0 ? r.prev.ppg / (r.prev.mins / 90)
                                              : priorOf(r) / (60 / 90);
    const per90 = (r.sumPts + K * prior90) / (n90 + K);
    return per90 * (r.mins5 / 90);
  },
};

/* ---------- Byggingin sjalf: grunnur x FFDR-margfaldari ----------
   NAKVAEMLEGA sama form og `expPointsFor` i src/model.js. Fluttur INN,
   ekki endurritadur (CLAUDE.md kafli 7: handafrit skrifadi NaN a 17 lid
   og merkti thad sem maelingu).                                      */
/* LYKILLINN ER TOLU-KODINN, EKKI STRENGURINN. `MEASURED_POS` og
   `POS_MEAN_PTS` eru lyklud a 1..4; med "GK" skilar `lookupPos`
   MID-toflunni ThEGJANDI (`|| MEASURED_POS[3]`) og nefnarinn verdur
   `undefined` -> NaN. Fyrsta keyrsla gaf r = 0,0000 hja OLLUM fjorum
   frambjodendum og topp-15 upp a staf — grunsamlega eins tolur voru
   merkid, ekki nidurstadan.                                          */
const multOf = r => lookupPos(r.code, "pts", r.ffdr) / POS_MEAN_PTS[r.code];
const predOf = (r, baseFn, K) => Math.max(0, baseFn(r, K)) * multOf(r);

/* ---------- Maelikvardar ---------- */
const corrOf = rs => {
  const a = rs.map(r => r._p), b = rs.map(r => r.pts);
  const ma = mean(a), mb = mean(b);
  let sab = 0, sa = 0, sb = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; sa += x * x; sb += y * y; }
  return sa && sb ? sab / Math.sqrt(sa * sb) : 0;
};
const maeOf = rs => mean(rs.map(r => Math.abs(r._p - r.pts)));
/* Topp-15 er per UMFERD — klasarnir eru umferdir, ekki leikmenn.     */
const byGw = rs => {
  const m = new Map();
  for (const r of rs) { const k = `${r.season}|${r.round}`; (m.get(k) || m.set(k, []).get(k)).push(r); }
  return [...m.values()];
};
const top15Of = rs => {
  const g = byGw(rs);
  const per = g.map(list => mean([...list].sort((a, b) => b._p - a._p).slice(0, 15).map(r => r.pts)));
  return mean(per);
};

function score(rs, baseFn, K) {
  for (const r of rs) r._p = predOf(r, baseFn, K);
  return { r: corrOf(rs), mae: maeOf(rs), top15: top15Of(rs) };
}

/* ---------- K valid LOSO ----------
   K er ekki valid a thvi timabili sem thad er maelt a.               */
const KGRID = [0, 1, 2, 3, 5, 8, 12, 20, 40];
function bestK(rs, baseFn, holdout) {
  const tr = rs.filter(r => r.season !== holdout);
  let best = null;
  for (const K of KGRID) {
    const s = score(tr, baseFn, K);
    if (!best || s.top15 > best.top15) best = { K, ...s };
  }
  return best.K;
}

const seasons = [...new Set(rows.map(r => r.season))];
const KPICK = {};
for (const nm of ["shrunk", "shrunkMin"]) {
  KPICK[nm] = {};
  for (const s of seasons) KPICK[nm][s] = bestK(rows, BASES[nm], s);
}

/* Spa hverrar radar med K sem sa EKKI hennar timabil. */
function predict(nm) {
  const fn = BASES[nm];
  for (const r of rows) r[`p_${nm}`] = predOf(r, fn, KPICK[nm]?.[r.season] ?? 0);
}
for (const nm of Object.keys(BASES)) predict(nm);

/* ---------- Skyrslan ---------- */
line("=");
console.log("BASE COMPARISON — every candidate goes through the SAME app structure");
console.log("  prediction = max(0, base) x MEASURED_POS.pts(pos, ffdr) / POS_MEAN_PTS(pos)");
line("=");
console.log("chosen K (leave-one-season-out):");
for (const nm of Object.keys(KPICK))
  console.log(`  ${nm.padEnd(10)} ${seasons.map(s => `${s}:${KPICK[nm][s]}`).join("  ")}`);

const NAMES = Object.keys(BASES);
const setP = nm => { for (const r of rows) r._p = r[`p_${nm}`]; };
const table = [];
for (const nm of NAMES) {
  setP(nm);
  table.push({ nm, r: corrOf(rows), mae: maeOf(rows), top15: top15Of(rows) });
}
line();
console.log("pool: ALL rows (blanks included) — 'whom should I pick'");
console.log("  base        r        MAE      top-15");
for (const t of table)
  console.log(`  ${t.nm.padEnd(10)} ${fmt(t.r, 4)}  ${fmt(t.mae, 4)}  ${fmt(t.top15, 3)}`);
OUT.overall = table;

/* ---------- Delta gegn ppg5, med vikmorkum ---------- */
line();
console.log("delta against ppg5 (the proxy for `ep_next`) — bootstrap, 400 iters, seed 7");
OUT.deltas = {};
for (const nm of NAMES.filter(x => x !== "ppg5")) {
  const dR = bootstrapCI(byPlayer(rows, r => r.name),
    rs => { for (const r of rs) r._p = r[`p_${nm}`]; const a = corrOf(rs);
            for (const r of rs) r._p = r.p_ppg5; return a - corrOf(rs); });
  const dM = bootstrapCI(byPlayer(rows, r => r.name),
    rs => { for (const r of rs) r._p = r[`p_${nm}`]; const a = maeOf(rs);
            for (const r of rs) r._p = r.p_ppg5; return a - maeOf(rs); });
  const dT = bootstrapCI(byGw(rows),
    rs => { for (const r of rs) r._p = r[`p_${nm}`]; const a = top15Of(rs);
            for (const r of rs) r._p = r.p_ppg5; return a - top15Of(rs); });
  console.log(`  ${nm}`);
  console.log(`    d r      ${ci(dR)}`);
  console.log(`    d MAE    ${ci(dM)}   (negative is better)`);
  console.log(`    d top15  ${ci(dT, 3)}`);
  OUT.deltas[nm] = { r: dR, mae: dM, top15: dT };
}

/* ---------- Snemma a timabili — thar sem sarsaukinn er ---------- */
line();
console.log("by gameweek bucket (the complaint is about GW1-5, where `form` has nothing)");
const BUCKETS = [["GW1-5", r => r.round <= 5], ["GW6-12", r => r.round > 5 && r.round <= 12],
                 ["GW13+", r => r.round > 12]];
OUT.buckets = {};
for (const [lab, f] of BUCKETS) {
  const rs = rows.filter(f);
  console.log(`  ${lab}  (${rs.length} rows)`);
  const o = {};
  for (const nm of NAMES) {
    setP(nm);
    const s = { r: corrOf(rs), mae: maeOf(rs), top15: top15Of(rs) };
    o[nm] = s;
    console.log(`    ${nm.padEnd(10)} r ${fmt(s.r, 4)}   MAE ${fmt(s.mae, 4)}   top15 ${fmt(s.top15, 3)}`);
  }
  /* VIKMORK INNAN BILSINS. Punktmat er ekki nidurstada — og bilid
     GW1-5 er einmitt thad sem spurningin snyst um, svo thar ma sist
     lata muninn standa an theirra.                                   */
  for (const nm of NAMES.filter(x => x !== "ppg5")) {
    const dT = bootstrapCI(byGw(rs),
      xs => { for (const r of xs) r._p = r[`p_${nm}`]; const a = top15Of(xs);
              for (const r of xs) r._p = r.p_ppg5; return a - top15Of(xs); });
    const dM = bootstrapCI(byPlayer(rs, r => r.name),
      xs => { for (const r of xs) r._p = r[`p_${nm}`]; const a = maeOf(xs);
              for (const r of xs) r._p = r.p_ppg5; return a - maeOf(xs); });
    console.log(`      d top15 vs ppg5 · ${nm.padEnd(10)} ${ci(dT, 3)}`);
    console.log(`      d MAE   vs ppg5 · ${nm.padEnd(10)} ${ci(dM, 4)}  (negative is better)`);
    o[nm].dTop15 = dT; o[nm].dMae = dM;
  }
  OUT.buckets[lab] = o;
}

/* ---------- Forgildin sem APPID tharf ad bera ----------
   Talan sem appid setur i kodann verdur ad vera SU SEM VAR MAELD.
   LOSO-utgafan (ein per timabil) er thad sem maelingin notadi; appid
   getur adeins borid EINA, svo baedi eru prentud og munurinn syndur.  */
line();
console.log("positional priors (points per row, blanks included)");
console.log("  pos   all-season   LOSO range");
OUT.posPrior = {};
for (const p of ["GK", "DEF", "MID", "FWD"]) {
  const all = mean(rows.filter(r => r.pos === p).map(r => r.pts));
  const per = seasons.map(s => posPrior[s][p]);
  OUT.posPrior[p] = { all, min: Math.min(...per), max: Math.max(...per) };
  console.log(`  ${p.padEnd(5)} ${fmt(all, 4)}      ${fmt(Math.min(...per), 4)} .. ${fmt(Math.max(...per), 4)}`);
}

/* ---------- Naemi a K ----------
   Vaeri toppurinn hvass vaeri talan valin, ekki maeld. Prentad svo
   naesti madur thurfi ekki ad trua thvi ad hann se flatur.          */
line();
console.log("K sensitivity for shrunkMin (whole pool, single K everywhere)");
console.log("  K     r        MAE      top-15");
OUT.ksens = [];
for (const K of KGRID) {
  const sc = score(rows, BASES.shrunkMin, K);
  OUT.ksens.push({ K, ...sc });
  console.log(`  ${String(K).padEnd(5)} ${fmt(sc.r, 4)}  ${fmt(sc.mae, 4)}  ${fmt(sc.top15, 3)}`);
}

if (argJson > -1) {
  writeFileSync(process.argv[argJson + 1], JSON.stringify(OUT, null, 2));
  console.log(`\nwrote ${process.argv[argJson + 1]}`);
}
