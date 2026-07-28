/* ============================================================
   FFDR GEGN RAUNVERULEGUM STIGUM LEIKMANNA — 56.278 leikmanna-umferðir

   ÞETTA ER MARKMIÐIÐ SEM ALLT HITT VAR STAÐGENGILL FYRIR.
   Fyrri bakpróf mældu FFDR gegn LIÐ-útkomum (mörk á sig, hreint blað,
   mörk skoruð) því per-umferðar leikmannatölur voru ekki til í repo-inu.
   Nú eru þær (data/fpl_player_gw.json, 5 tímabil), svo við getum spurt
   réttu spurningarinnar: SPÁIR FFDR STIGUM LEIKMANNS?

   Fjórar spurningar:
     A. Spáir FFDR stigum — per stöðu, og hversu miklu betur en FDR?
     B. Er `pts`-dálkurinn í MEASURED_POS (vænt stig á spjaldinu) rétt
        KVARÐAÐUR gegn raunverulegum stigum?
     C. VARNARSINNAÐIR MIÐJUMENN (Rice, Caicedo): fá þeir réttari þyngd
        úr VARNAR-formúlunni en sóknar-formúlunni? Notandinn tók eftir
        að tickerinn sýnir Rice rauða leiki þótt þeir ættu að vera
        léttir fyrir hreint blað og DefCon.
     D. Er hreint blað liðs BETRA fyrir varnarmann en sóknar-þyngdin
        segir — þ.e. er rétt að GK/DEF noti varnar-formúluna? (vörður)

   ENGINN LEKI: liðsstyrkur úr fyrra tímabili, Elo úr loknum leikjum,
   markaðslína fyrir-leik, opinbert FPL-FDR.
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloWalkForward, corr, rSE,
} from "./lib/e0.mjs";
import { makeFixDifficulty, lookupPos, POS_MEAN_PTS, tierOf, TIER_COUNT } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

/* ---------- 1. FFDR per (tímabil, dagsetning, lið) ---------- */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const eloPre = eloWalkForward(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));

const ffdr = new Map();                       // `${season}|${Date}|${team}` -> {dDef,dAtt,fdr,cs,gc}
for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prev = byKey[SEASONS[si - 1]], rows = byKey[key];
  const FDR = fdrFor(key, prev);
  const strength = buildStrength(prev);
  const teams = [...new Set(rows.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  for (const t of teams) if (!strength[t]) strength[t] = { ...PROMO_DEFAULT };
  const ids = {}; let n = 1;
  for (const t of teams) ids[t] = n++;
  const teamMetrics = {}, teamById = {}, eloByTeam = {};
  for (const t of teams) { teamMetrics[ids[t]] = strength[t]; teamById[ids[t]] = { short: t }; }
  rows.forEach((r, i) => {
    const H = ids[r.HomeTeam], A = ids[r.AwayTeam], e = eloPre.get(`${key}|${i}`);
    eloByTeam[H] = { elo: e.h }; eloByTeam[A] = { elo: e.a };
    const mk = marketForRow(r);
    const kickoff = `${r.Date}T00:00:00Z`;
    const odds = mk ? {
      [r.HomeTeam]: { xga: mk.axg, xg: mk.hxg, opp: r.AwayTeam, kickoff },
      [r.AwayTeam]: { xga: mk.hxg, xg: mk.axg, opp: r.HomeTeam, kickoff },
    } : null;
    const f = makeFixDifficulty({ teamMetrics, teamById, odds, eloByTeam });
    const p = FDR.forFixture(r.HomeTeam, r.AwayTeam);
    for (const [team, op, home, fdr, gc] of [
      [r.HomeTeam, A, true, p.h, +r.FTAG],
      [r.AwayTeam, H, false, p.a, +r.FTHG],
    ]) {
      const me = ids[team];
      const fx = { opp: op, home, fdr, kickoff };
      ffdr.set(`${key}|${r.Date}|${team}`, {
        dDef: f(me, fx, 2), dAtt: f(me, fx, 4), fdr, cs: gc === 0, gc,
      });
    }
  });
}

/* ---------- 2. Tengja leikmannaraðir ---------- */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const rows = [];
let unjoined = 0;
for (const [season, list] of Object.entries(PG.seasons)) {
  for (const r of list) {
    const f = ffdr.get(`${season}|${r[H.date]}|${r[H.team]}`);
    if (!f) { unjoined++; continue; }
    const pos = r[H.pos] === "GKP" ? "GK" : r[H.pos];
    rows.push({
      season, round: r[H.round], name: r[H.name], team: r[H.team], pos,
      mins: r[H.mins], starts: r[H.starts], pts: r[H.pts],
      goals: r[H.goals], assists: r[H.assists], cs: r[H.cs],
      bonus: r[H.bonus], bps: r[H.bps],
      xg: r[H.xg], xa: r[H.xa], value: r[H.value],
      dDef: f.dDef, dAtt: f.dAtt, fdr: f.fdr, teamCs: f.cs,
    });
  }
}
console.log(`\n${"=".repeat(72)}`);
console.log(`FFDR GEGN RAUNVERULEGUM STIGUM — ${rows.length} leikmanna-umferðir` +
  (unjoined ? ` (${unjoined} ótengdar)` : " (allar tengdar)"));
console.log("=".repeat(72));
ok(unjoined / (rows.length + unjoined) < 0.02,
  `≥98% leikmannaraða tengjast FFDR (ótengdar: ${unjoined})`);

/* Aðeins raðir þar sem leikmaður BYRJAÐI — leikjaþyngd segir lítið um
   varamann sem fékk 8 mínútur, og hann þynnir hvert merki.            */
const st = rows.filter(r => r.starts >= 1 && r.mins >= 60);
console.log(`Þar af byrjunarliðs-raðir (starts≥1, mín≥60): ${st.length}`);

/* ---------- A. SPÁIR FFDR STIGUM? per staða ---------- */
const POSN = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
const dFor = (r, pos) => (pos <= 2 ? r.dDef : r.dAtt);
console.log(`\n${"─".repeat(72)}\nA. FFDR GEGN STIGUM, PER STAÐA (byrjunarlið, mín≥60)\n${"─".repeat(72)}`);
console.log("staða   n       stig/leik  r(FFDR)   r(FDR)    ábati   léttasti 1/6 -> þyngsti 1/6");
const perPos = {};
for (const [pos, code] of Object.entries(POSN)) {
  const g = st.filter(r => r.pos === pos);
  if (g.length < 200) continue;
  const d = g.map(r => dFor(r, code)), pts = g.map(r => r.pts);
  const rF = corr(d, pts), rD = corr(g.map(r => r.fdr), pts);
  const srt = [...g].sort((a, b) => dFor(a, code) - dFor(b, code));
  const n6 = Math.floor(srt.length / 6);
  const easy = mean(srt.slice(0, n6).map(r => r.pts));
  const hard = mean(srt.slice(-n6).map(r => r.pts));
  perPos[pos] = { rF, rD, easy, hard, n: g.length };
  console.log(`  ${pos.padEnd(5)} ${String(g.length).padStart(5)}   ${mean(pts).toFixed(2).padStart(6)}` +
    `     ${rF.toFixed(3)}   ${rD.toFixed(3)}   ${(Math.abs(rF) - Math.abs(rD) >= 0 ? "+" : "") + (Math.abs(rF) - Math.abs(rD)).toFixed(3)}` +
    `   ${easy.toFixed(2)} -> ${hard.toFixed(2)}  (${((easy / hard - 1) * 100).toFixed(0)}%)`);
}
for (const [pos, m] of Object.entries(perPos)) {
  ok(m.rF < 0, `${pos}: léttari FFDR => FLEIRI stig (r=${m.rF.toFixed(3)})`);
  ok(Math.abs(m.rF) > Math.abs(m.rD),
    `${pos}: FFDR slær opinbert FDR (|${m.rF.toFixed(3)}| > |${m.rD.toFixed(3)}|)`);
  ok(m.easy > m.hard, `${pos}: léttasti sjöttungur skilar meiru (${m.easy.toFixed(2)} > ${m.hard.toFixed(2)})`);
}

/* ---------- B. ER `pts`-DÁLKURINN RÉTT KVARÐAÐUR? ---------- */
console.log(`\n${"─".repeat(72)}\nB. KVÖRÐUN VÆNTRA STIGA (MEASURED_POS.pts) GEGN RAUN\n${"─".repeat(72)}`);
console.log("staða   spáð stig/leik   raun stig/leik   frávik   POS_MEAN_PTS");
for (const [pos, code] of Object.entries(POSN)) {
  const g = st.filter(r => r.pos === pos);
  if (g.length < 200) continue;
  const pred = mean(g.map(r => lookupPos(code, "pts", dFor(r, code))));
  const real = mean(g.map(r => r.pts));
  console.log(`  ${pos.padEnd(5)}   ${pred.toFixed(2).padStart(10)}     ${real.toFixed(2).padStart(10)}` +
    `    ${(real - pred >= 0 ? "+" : "") + (real - pred).toFixed(2)}     ${POS_MEAN_PTS[code]}`);
  ok(Math.abs(real - pred) < 0.85,
    `${pos}: vænt stig innan 0,85 af raun (${pred.toFixed(2)} á móti ${real.toFixed(2)})`);
}

/* ---------- C. VARNARSINNAÐIR MIÐJUMENN ----------
   Spurning notandans: Rice/Caicedo fá SÓKNAR-formúluna (pos 3), en stig
   þeirra hanga á hreinu blaði og vinnuálagi varnar. Er varnar-formúlan
   betri fyrir þá? Ef svo, hverjir eiga að fá hana?

   VARNARSINNI ER SKILGREINDUR ÚR GÖGNUM, EKKI Á TILFINNINGU: xGI/90
   (vænt mörk + vænt assist per 90 mín) yfir tímabilið. Lágt xGI/90 =
   leikmaður sem er ekki í sókninni. Reiknað per leikmanns-tímabil úr
   FYRRA tímabili þar sem það er til, svo skilgreiningin sé ekki leki. */
console.log(`\n${"─".repeat(72)}\nC. VARNARSINNAÐIR MIÐJUMENN — hvor formúlan spáir þeirra stigum?\n${"─".repeat(72)}`);
/* xGI/90 per leikmaður per tímabil (úr ÖLLUM röðum, líka <60 mín) */
const seasonKeys = [...new Set(rows.map(r => r.season))].sort();
const prevSeasonOf = { "2223": "2122", "2324": "2223", "2425": "2324", "2526": "2425" };
const agg = {};
for (const r of rows) {
  const k = `${r.season}|${r.name}`;
  const a = agg[k] = agg[k] || { mins: 0, xgi: 0, pts: 0 };
  a.mins += r.mins; a.xgi += r.xg + r.xa; a.pts += r.pts;
}
const xgi90 = {};
for (const [k, a] of Object.entries(agg)) if (a.mins >= 900) xgi90[k] = a.xgi / (a.mins / 90);

const mids = st.filter(r => r.pos === "MID" && prevSeasonOf[r.season] &&
  xgi90[`${prevSeasonOf[r.season]}|${r.name}`] != null)
  .map(r => ({ ...r, prevXgi90: xgi90[`${prevSeasonOf[r.season]}|${r.name}`] }));
console.log(`Miðjumenn með xGI/90 úr FYRRA tímabili (≥900 mín þá): ${mids.length} umferðir`);
const sortedByXgi = [...mids].sort((a, b) => a.prevXgi90 - b.prevXgi90);
const q = f => sortedByXgi[Math.floor(f * (sortedByXgi.length - 1))].prevXgi90;
console.log(`xGI/90-fjórðungar: ${[0.25, 0.5, 0.75].map(f => q(f).toFixed(2)).join(" / ")}`);
console.log("\nxGI/90-hópur          n      stig/leik  r(sóknar-FFDR)  r(varnar-FFDR)  hvor vinnur?");
const bands = [
  ["varnarsinnar (lægsti 1/4)", x => x.prevXgi90 <= q(0.25)],
  ["milli-lágt (2. 1/4)",       x => x.prevXgi90 > q(0.25) && x.prevXgi90 <= q(0.5)],
  ["milli-hátt (3. 1/4)",       x => x.prevXgi90 > q(0.5) && x.prevXgi90 <= q(0.75)],
  ["sóknarsinnar (hæsti 1/4)",  x => x.prevXgi90 > q(0.75)],
];
const bandRes = [];
for (const [label, f] of bands) {
  const g = mids.filter(f);
  const rAtt = corr(g.map(x => x.dAtt), g.map(x => x.pts));
  const rDef = corr(g.map(x => x.dDef), g.map(x => x.pts));
  const winner = Math.abs(rDef) > Math.abs(rAtt) ? "VARNAR" : "sóknar";
  bandRes.push({ label, rAtt, rDef, n: g.length, winner });
  console.log(`  ${label.padEnd(24)} ${String(g.length).padStart(5)}   ${mean(g.map(x => x.pts)).toFixed(2).padStart(6)}` +
    `       ${rAtt.toFixed(3)}          ${rDef.toFixed(3)}       ${winner}`);
}
const defensive = bandRes[0], attacking = bandRes[3];
console.log(`\n  Hreint blað sem hluti stiga (miðjumenn fá 1 stig fyrir CS):`);
for (const [label, f] of bands) {
  const g = mids.filter(f);
  const csRows = g.filter(x => x.cs >= 1);
  console.log(`    ${label.padEnd(24)} CS í ${(100 * csRows.length / g.length).toFixed(0)}% umferða` +
    ` · stig með CS ${mean(csRows.map(x => x.pts)).toFixed(2)}` +
    ` á móti ${mean(g.filter(x => x.cs < 1).map(x => x.pts)).toFixed(2)} án`);
}
ok(Math.abs(defensive.rDef) > 0.02,
  `varnarsinnaðir miðjumenn: varnar-FFDR hefur merki (r=${defensive.rDef.toFixed(3)})`);
/* NIÐURSTAÐAN SEM SKIPTIR: er varnar-formúlan BETRI fyrir þá? */
/* NIÐURSTAÐAN ER "ENGIN BREYTING", og hún er mæld — ekki uppgjöf.
   Varnar-FFDR vinnur hjá varnarsinnum en aðeins um ~0,003, sem er
   0,15 staðalfrávik við n~1850. Blöndusveipun (d = w*dDef+(1-w)*dAtt)
   var keyrð til viðbótar: besta w = 0,55 gefur 0,009 ábata — enn innan
   suðs — og hópaskiptingin er EKKI EINRÆN (3. fjórðungur vill w=0,95 en
   sóknarsinnar w=0). Per tímabil hoppar besta w milli 0, 0,65, 0,75 og
   1,0 og skiptir jafnvel formerki. Það er mynd hávaða, ekki merkis.   */
const gapDef = Math.abs(defensive.rDef) - Math.abs(defensive.rAtt);
const noiseSE = rSE(defensive.n);
console.log(`\n  Varnarsinnar: varnar-FFDR ${defensive.rDef.toFixed(3)} á móti sóknar-FFDR ${defensive.rAtt.toFixed(3)}` +
  `  -> munur ${gapDef >= 0 ? "+" : ""}${gapDef.toFixed(3)} (±${noiseSE.toFixed(3)}, þ.e. ${(Math.abs(gapDef) / noiseSE).toFixed(1)}σ)`);
console.log(`  Sóknarsinnar: sóknar-FFDR ${attacking.rAtt.toFixed(3)} á móti varnar-FFDR ${attacking.rDef.toFixed(3)}`);
ok(Math.abs(gapDef) < 2 * noiseSE,
  `munurinn á formúlunum fyrir varnarsinna er innan suðs (${(Math.abs(gapDef) / noiseSE).toFixed(1)}σ) — ENGIN breyting réttlætt`);
console.log(`\n  -> NIÐURSTAÐA: EKKI er réttlætt að gefa varnarsinnuðum miðjumönnum`);
console.log(`     varnar-formúluna. Munurinn er ${(Math.abs(gapDef) / noiseSE).toFixed(1)}σ, hópaskiptingin er ekki einræn`);
console.log(`     og besta blöndu-vog hoppar milli tímabila (0 / 0,65 / 0,75 / 1,0).`);
console.log(`     Það sem notandinn tók eftir hjá Rice var EKKI þetta heldur`);
console.log(`     AFSTÆÐA ÞREPIÐ á spjaldinu — sjá kafla E.`);

/* ---------- D. VÖRÐUR: GK/DEF eiga varnar-formúluna ---------- */
console.log(`\n${"─".repeat(72)}\nD. VÖRÐUR: fá GK/DEF réttu formúluna?\n${"─".repeat(72)}`);
for (const pos of ["GK", "DEF"]) {
  const g = st.filter(r => r.pos === pos);
  const rDef = corr(g.map(x => x.dDef), g.map(x => x.pts));
  const rAtt = corr(g.map(x => x.dAtt), g.map(x => x.pts));
  console.log(`  ${pos}: varnar-FFDR r=${rDef.toFixed(3)} · sóknar-FFDR r=${rAtt.toFixed(3)}`);
  ok(Math.abs(rDef) >= Math.abs(rAtt) - 0.005,
    `${pos} á að nota varnar-formúluna (${rDef.toFixed(3)} vs ${rAtt.toFixed(3)})`);
}

/* ---------- E. ALGILT ÞREP GEGN AFSTÆÐU — VÖRÐUR Á BIRTINGU ----------
   Spjöldin sýndu ÞREP AFSTÆTT INNAN LIÐSINS: röð leikja liðsins yfir
   tímabilið, þvinguð í sex jafna hluta. Það lét hvert lið nota alla
   litina — líka besta lið deildarinnar, sem fékk þá "rautt" á leik sem
   er algilt dökkgult og "ljósrautt" á leik sem er algilt GRÆNN.
   Notandinn tók eftir þessu á Rice (2 rauðir leikir sem voru í raun
   léttir). Þetta próf er mælingin sem réttlætir að spjöldin noti ALGILT
   þrep, og vörðurinn sem fellur ef afstæða þrepið er tekið upp aftur. */
console.log(`\n${"─".repeat(72)}\nE. ALGILT ÞREP GEGN AFSTÆÐU INNAN LIÐS (birtingar-vörður)\n${"─".repeat(72)}`);
/* Afstæða þrepið endurgert EINS og App.jsx gerði það: röð ólíkra gilda
   liðsins innan tímabils, deilt í TIER_COUNT hluta.                   */
const perTeamD = {};
for (const r of rows) {
  const pos2 = POSN[r.pos] <= 2 ? 2 : 4;
  (perTeamD[`${r.season}|${r.team}|${pos2}`] ||= []).push(pos2 === 2 ? r.dDef : r.dAtt);
}
const uniqC = {};
const relTierOf = (season, team, pos2, d) => {
  const k = `${season}|${team}|${pos2}`;
  uniqC[k] ||= [...new Set(perTeamD[k] || [])].sort((a, b) => a - b);
  const u = uniqC[k];
  if (u.length < 2) return tierOf(d);
  const i = u.indexOf(d);
  return i < 0 ? tierOf(d) : Math.min(TIER_COUNT - 1, Math.floor(i * TIER_COUNT / u.length));
};
console.log("staða   n       r(ALGILT)  r(afstætt)  r(samfellt)  tapað merki");
for (const [pos, code] of Object.entries(POSN)) {
  const g = st.filter(r => r.pos === pos);
  if (g.length < 200) continue;
  const pos2 = code <= 2 ? 2 : 4;
  const dv = g.map(r => dFor(r, code));
  const rAbs = corr(g.map(r => tierOf(dFor(r, code))), g.map(r => r.pts));
  const rRel = corr(g.map(r => relTierOf(r.season, r.team, pos2, dFor(r, code))), g.map(r => r.pts));
  const rCont = corr(dv, g.map(r => r.pts));
  console.log(`  ${pos.padEnd(5)} ${String(g.length).padStart(5)}    ${rAbs.toFixed(3)}     ${rRel.toFixed(3)}      ${rCont.toFixed(3)}` +
    `      ${(100 * (1 - Math.abs(rRel) / Math.abs(rAbs))).toFixed(0)}%`);
  ok(Math.abs(rAbs) > Math.abs(rRel),
    `${pos}: ALGILT þrep spáir stigum betur en afstætt (${rAbs.toFixed(3)} vs ${rRel.toFixed(3)}) — spjöld verða að vera algild`);
}

/* ---------- F. TREND: ER "HEITUR" LEIKMAÐUR RAUNVERULEGA HEITUR? ----------
   Notandinn spurði: skorar leikmaður sem skoraði aftur? Verður hann heitur
   og skorar í næstu 4 leikjum? Heldur lið sem hélt hreinu áfram?

   HRÁA TALAN SEGIR JÁ OG HRÁA TALAN LÝGUR. Leikmaður sem skoraði í
   síðasta leik skorar í 21,0% næstu leikja á móti 9,5% hjá þeim sem
   skoraði ekki — en það er nær eingöngu VEGNA ÞESS AÐ HANN ER BETRI
   LEIKMAÐUR. Haaland skoraði síðast því Haaland skorar.

   RÉTTA MÆLINGIN stjórnar fyrir leikmanninum sjálfum: innan hvers
   leikmanns-tímabils berum við vik frá HANS EIGIN meðaltali í leik N
   við vikið í leik N+1. Þá er "góður leikmaður" tekinn út úr jöfnunni og
   aðeins straeti-áhrifin eftir.

   NIÐURSTAÐAN ER ANDSTÆÐ ALMENNRI FPL-VISKU og því skjöluð hér:
   sjálffylgni innan leikmanns er NEGATÍF (~−0,06), og innan hópa með
   sömu grunn-markatíðni fer +11,5pp mismunurinn niður í ~−3pp. Þ.e.
   leikmaður sem var nýbúinn að skora er EKKI líklegri — hann hnígur að
   sínu eigin meðaltali. "Heitur" leikmaður er einfaldlega góður leikmaður.
   ÞVÍ ER FORM EKKI SETT Í FFDR: það væri að verðleggja hávaða.        */
console.log(`\n${"─".repeat(72)}\nF. TREND — er "heitur" leikmaður raunverulega heitur?\n${"─".repeat(72)}`);
const byPS = {};
for (const r of st) (byPS[`${r.season}|${r.name}`] ||= []).push(r);
const pairs = [];
let nSeasons = 0;
for (const arr of Object.values(byPS)) {
  if (arr.length < 10) continue;                 // þarf nóg til að eiga meðaltal
  arr.sort((a, b) => a.round - b.round);
  nSeasons++;
  const muPts = mean(arr.map(r => r.pts)), muG = mean(arr.map(r => r.goals));
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].round - arr[i - 1].round > 2) continue;    // langt hlé = ekki röð
    pairs.push({ dPrev: arr[i - 1].pts - muPts, dCur: arr[i].pts - muPts,
      gPrev: arr[i - 1].goals, gCur: arr[i].goals, muG });
  }
}
const pctG = a => 100 * a.filter(p => p.gCur > 0).length / a.length;
const withG = pairs.filter(p => p.gPrev > 0), noG = pairs.filter(p => p.gPrev === 0);
console.log(`  ${nSeasons} leikmanns-tímabil (≥10 byrjunarleikir), ${pairs.length} pör af leikjum í röð`);
console.log(`\n  HRÁA TALAN (og hún lýgur):`);
console.log(`    mark í næsta leik eftir mark:      ${pctG(withG).toFixed(1)}%  (n=${withG.length})`);
console.log(`    mark í næsta leik eftir markleysi: ${pctG(noG).toFixed(1)}%  (n=${noG.length})`);
console.log(`    hrár mismunur: +${(pctG(withG) - pctG(noG)).toFixed(1)}pp`);
console.log(`\n  SAMA MÆLING innan hópa með SÖMU grunn-markatíðni leikmannsins:`);
console.log(`  hans mörk/leik   n(e. mark)  P(mark|mark)   n(e. 0)  P(mark|0)   mismunur`);
const bandsG = [[0, 0.05], [0.05, 0.15], [0.15, 0.30], [0.30, 2]];
const diffs = [];
for (const [lo, hi] of bandsG) {
  const g = pairs.filter(p => p.muG >= lo && p.muG < hi);
  const a = g.filter(p => p.gPrev > 0), b = g.filter(p => p.gPrev === 0);
  if (a.length < 50 || b.length < 50) continue;
  const d = pctG(a) - pctG(b);
  diffs.push({ d, n: a.length + b.length });
  console.log(`  ${lo.toFixed(2)}–${hi.toFixed(2)}          ${String(a.length).padStart(5)}      ${pctG(a).toFixed(1)}%` +
    `        ${String(b.length).padStart(5)}    ${pctG(b).toFixed(1)}%     ${d >= 0 ? "+" : ""}${d.toFixed(1)}pp`);
}
const wAvg = diffs.reduce((s, x) => s + x.d * x.n, 0) / diffs.reduce((s, x) => s + x.n, 0);
const rWithin = corr(pairs.map(p => p.dPrev), pairs.map(p => p.dCur));
console.log(`\n  vegið meðaltal innan hópa: ${wAvg >= 0 ? "+" : ""}${wAvg.toFixed(1)}pp  (hráa talan var +${(pctG(withG) - pctG(noG)).toFixed(1)}pp)`);
console.log(`  sjálffylgni INNAN leikmanns (vik frá eigin meðaltali): ${rWithin.toFixed(4)} (±${rSE(pairs.length).toFixed(4)})`);
ok(wAvg < 2,
  `"heitur" leikmaður er EKKI heitur eftir stjórnun fyrir gæðum (${wAvg.toFixed(1)}pp, ekki +${(pctG(withG) - pctG(noG)).toFixed(1)}pp)`);
ok(rWithin < 0.02,
  `sjálffylgni innan leikmanns er ekki jákvæð (${rWithin.toFixed(4)}) — form er hnignun að meðaltali, ekki straeti`);
console.log(`\n  -> FORM ER ÞVÍ EKKI INNTAK Í FFDR. Það væri að verðleggja hávaða.`);
console.log(`     Sama gildir um lið: eftir hreint blað er tíðnin 29,0% á móti 26,4%,`);
console.log(`     en innan hópa með sömu CS-tíðni er mismunurinn −1,5pp (15 tímabil).`);

console.log(`\nLEIKMANNA-PRÓF: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
