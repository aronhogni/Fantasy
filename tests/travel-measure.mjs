/* ============================================================
   VARÐPRÓF: FERÐALENGD OG FFDR — 9 tímabil E0, 3.420 útileikir

   NIÐURSTAÐA (2026-07): ferðalengd hefur ENGIN marktæk áhrif á
   útilið (parað: −0,04 stig/leik, t=−0,42 · fylgni r=−0,037 eftir
   mótherja-leiðréttingu) og er því VILJANDI EKKI í FFDR — stuðull
   sem er ógreinanlegur frá núlli væri of-fittun. Markaðslínan í
   FFDR verðleggur hvort eð er raunveruleg þreytuáhrif næstu leikja.

   Prófið er VÖRÐUR: það endurmælir í hverri keyrslu og FELLUR ef
   áhrifin verða marktæk (|t|≥2 OG |r|≥0,06) í framtíðargögnum —
   þá er komin ástæða til að endurskoða ákvörðunina.

   Aðferðin er PÖRUÐ: fyrir hvert (lið, tímabil) berum við saman
   útileiki þess í STUTTUM ferðum (<300 km) og LÖNGUM (≥300 km).
   Sama lið, sama tímabil → styrkur, stjóri og leikstíll haldast
   fastir; aðeins ferðin breytist. Mótherja-styrkur gæti samt
   skekkt (löng ferð gæti kerfisbundið þýtt ákveðna mótherja),
   svo við leiðréttum líka fyrir stigum mótherjans það tímabil.
   ============================================================ */
import { readFileSync } from "node:fs";
const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

// Hnit leikvanga. Núverandi 20 úr teams_map; hin 12 (fallin lið
// tímabilanna 2017–2026) handfærð — þekkt föst hnit leikvanga.
const tmap = J("teams_map.json");
const COORD = {};
for (const v of Object.values(tmap)) if (v?.fdcouk && v.lat) COORD[v.fdcouk] = [v.lat, v.lon];
Object.assign(COORD, {
  "Burnley": [53.789, -2.230], "Cardiff": [51.473, -3.203], "Huddersfield": [53.654, -1.768],
  "Leicester": [52.620, -1.142], "Luton": [51.884, -0.432], "Norwich": [52.622, 1.309],
  "Sheffield United": [53.370, -1.471], "Southampton": [50.906, -1.391], "Stoke": [52.988, -2.176],
  "Swansea": [51.643, -3.935], "Watford": [51.650, -0.402], "West Brom": [52.509, -1.964],
  "West Ham": [51.539, -0.017], "Wolves": [52.590, -2.130],
});

const havKm = (a, b) => {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(b[0] - a[0]), dLon = r(b[1] - a[1]);
  const h = Math.sin(dLat/2)**2 + Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const SEASONS = ["1718","1819","1920","2021","2122","2223","2324","2425","2526"];
const LONG = 300;

// safna útileikjum: {team, season, km, pts, gf, ga, oppPts}
const games = [];
for (const ss of SEASONS) {
  const rows = J(`fdcouk/E0-${ss}.json`).rows;
  // stig hvers liðs þetta tímabil (til mótherja-leiðréttingar)
  const pts = {};
  for (const r of rows) {
    pts[r.HomeTeam] = (pts[r.HomeTeam] || 0) + (r.FTR === "H" ? 3 : r.FTR === "D" ? 1 : 0);
    pts[r.AwayTeam] = (pts[r.AwayTeam] || 0) + (r.FTR === "A" ? 3 : r.FTR === "D" ? 1 : 0);
  }
  for (const r of rows) {
    const A = COORD[r.AwayTeam], H = COORD[r.HomeTeam];
    if (!A || !H) { console.log("VANTAR HNIT:", r.AwayTeam, r.HomeTeam); continue; }
    games.push({
      team: r.AwayTeam, season: ss, km: havKm(A, H),
      pts: r.FTR === "A" ? 3 : r.FTR === "D" ? 1 : 0,
      gf: +r.FTAG, ga: +r.FTHG, cs: +r.FTHG === 0,
      oppPts: pts[r.HomeTeam],
    });
  }
}
console.log(`${games.length} útileikir yfir ${SEASONS.length} tímabil`);
console.log(`ferðir: miðgildi ${median(games.map(g=>g.km)).toFixed(0)} km · ≥${LONG} km = ${(100*games.filter(g=>g.km>=LONG).length/games.length).toFixed(0)}% leikja`);

function median(a){const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];}
function mean(a){return a.reduce((x,y)=>x+y,0)/(a.length||1);}
function sd(a){const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));}

/* ---------- 1. PARAÐI SAMANBURÐURINN ---------- */
const pairs = [];
const byTS = {};
games.forEach(g => (byTS[`${g.team}|${g.season}`] ??= []).push(g));
for (const [key, gs] of Object.entries(byTS)) {
  const short = gs.filter(g => g.km < LONG), long = gs.filter(g => g.km >= LONG);
  if (short.length < 4 || long.length < 4) continue;
  pairs.push({
    key,
    dPts: mean(long.map(g=>g.pts)) - mean(short.map(g=>g.pts)),
    dGf:  mean(long.map(g=>g.gf))  - mean(short.map(g=>g.gf)),
    dGa:  mean(long.map(g=>g.ga))  - mean(short.map(g=>g.ga)),
    dOpp: mean(long.map(g=>g.oppPts)) - mean(short.map(g=>g.oppPts)),
  });
}
console.log(`\n=== PARAÐUR SAMANBURÐUR (${pairs.length} lið-tímabil með ≥4 leiki í hvorum flokki) ===`);
for (const [k, lbl] of [["dPts","stig/leik úti"],["dGf","mörk skoruð"],["dGa","mörk á sig"],["dOpp","styrkur mótherja (stig)"]]) {
  const v = pairs.map(p=>p[k]);
  const m = mean(v), se = sd(v)/Math.sqrt(v.length), t = m/se;
  console.log(`  ${lbl.padEnd(26)} löng−stutt = ${m>=0?"+":""}${m.toFixed(3)}  (t=${t.toFixed(2)}${Math.abs(t)>2?" — marktækt":" — EKKI marktækt"})`);
}

/* ---------- 2. SAMFELLD FYLGNI, mótherja-leiðrétt ---------- */
// afgangs-stig: útistig mínus það sem styrkur mótherjans spáir (línulega)
const corr = (xs, ys) => {
  const n=xs.length,mx=mean(xs),my=mean(ys);
  let sxy=0,sxx=0,syy=0;
  for(let i=0;i<n;i++){const dx=xs[i]-mx,dy=ys[i]-my;sxy+=dx*dy;sxx+=dx*dx;syy+=dy*dy;}
  return sxy/Math.sqrt(sxx*syy);
};
const beta = corr(games.map(g=>g.oppPts), games.map(g=>g.pts)) * sd(games.map(g=>g.pts)) / sd(games.map(g=>g.oppPts));
const mOpp = mean(games.map(g=>g.oppPts)), mPts = mean(games.map(g=>g.pts));
const resid = games.map(g => g.pts - (mPts + beta * (g.oppPts - mOpp)));
console.log(`\n=== SAMFELLD FYLGNI ===`);
console.log(`  km ↔ útistig (hrá):                r = ${corr(games.map(g=>g.km), games.map(g=>g.pts)).toFixed(4)}`);
console.log(`  km ↔ útistig (mótherja-leiðrétt):  r = ${corr(games.map(g=>g.km), resid).toFixed(4)}`);
console.log(`  km ↔ mörk á sig:                   r = ${corr(games.map(g=>g.km), games.map(g=>g.ga)).toFixed(4)}`);

/* ---------- 3. FJARLÆGÐAR-FLOKKAR (myndin sjálf) ---------- */
console.log(`\n=== EFTIR FJARLÆGÐ ===`);
console.log("bil          leikir  stig/leik  mörk f.  mörk á sig  CS%");
for (const [lo, hi] of [[0,100],[100,200],[200,300],[300,400],[400,9999]]) {
  const g = games.filter(x => x.km >= lo && x.km < hi);
  console.log(`${`${lo}–${hi===9999?"+":hi} km`.padEnd(12)} ${String(g.length).padStart(5)}   ${mean(g.map(x=>x.pts)).toFixed(2)}      ${mean(g.map(x=>x.gf)).toFixed(2)}     ${mean(g.map(x=>x.ga)).toFixed(2)}       ${(100*mean(g.map(x=>x.cs?1:0))).toFixed(0)}%`);
}

/* ---------- VÖRÐURINN ---------- */
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
console.log("\n=== VARÐPRÓF: á ferðin heima í FFDR? ===");
const tPts = mean(pairs.map(p=>p.dPts)) / (sd(pairs.map(p=>p.dPts)) / Math.sqrt(pairs.length));
const rAdj = corr(games.map(g=>g.km), resid);
ok(pairs.length >= 30, `nægt úrtak fyrir parað próf (${pairs.length} lið-tímabil)`);
const significant = Math.abs(tPts) >= 2 && Math.abs(rAdj) >= 0.06;
ok(!significant,
  significant
    ? `FERÐA-ÁHRIFIN ERU ORÐIN MARKTÆK (t=${tPts.toFixed(2)}, r=${rAdj.toFixed(3)}) — endurskoðaðu ákvörðunina um að sleppa þeim úr FFDR!`
    : `ferða-áhrif enn ómarktæk (t=${tPts.toFixed(2)}, r=${rAdj.toFixed(3)}) — rétt að halda þeim UTAN FFDR`);
console.log(`\nFERÐAPRÓF: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
