/* ============================================================
   GAMLA FFDR GEGN NÝJU — 15 tímabil, mælanlegur munur?

   Gamla útgáfan er EKKI endurgerð heldur FLUTT INN ÚR GIT
   (tests/lib/model-pre-2807.js = src/model.js við 8b81b9f), svo
   samanburðurinn geti ekki rekið frá því sem raunverulega var.

   ÞRJÁR ÚTGÁFUR eru mældar, því "gamla" er tvírætt:
     A. GAMALT-EINS-OG-ÞAÐ-KEYRÐI: gamli kóðinn OG dauður markaður.
        data/odds.json hafði aldrei `diff`, svo bkValid var alltaf falskt
        og markaðsliðurinn beit ekki. Þetta er FFDR sem notandinn sá.
     B. GAMALT-EINS-OG-ÞAÐ-VAR-HUGSAÐ: gamli kóðinn með markaðinn
        virkan (mkt 0,50 vörn / 0,35 sókn, marketDiff(xga) á allar stöður).
     C. NÝTT: núverandi src/model.js.

   TVENNT ER MÆLT SÉR, ÞVÍ ÞAÐ ER EKKI SAMA SPURNINGIN:
     1. AÐGREINING (r, AUC) — raðar líkanið leikjum rétt? Affin
        umbreyting (SCALE_FIX) haggar þessu EKKI, svo hér sést aðeins
        ábati af vogum og af réttri markaðsstærð.
     2. KVÖRÐUN — er BIRT CS% rétt? Hér sést SCALE_FIX, og aðeins hér.
        Hvert líkan er lesið gegnum SÍNA EIGIN MEASURED-töflu, því
        töflurnar voru endurmerktar með kvarðanum.
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloWalkForward, corr, rSE, brier,
} from "./lib/e0.mjs";
import * as NEW from "../src/model.js";
import * as OLD from "./lib/model-pre-2807.js";

const D = new URL("../data/", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

/* ---------- Byggja heiminn EINU SINNI og reikna allar þrjár útgáfur ---------- */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const eloPre = eloWalkForward(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const PRED = SEASONS.slice(1);

const rows = [];
const perTeamDate = new Map();          // fyrir leikmanna-tenginguna
for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prev = byKey[SEASONS[si - 1]], list = byKey[key];
  const FDR = fdrFor(key, prev), strength = buildStrength(prev);
  const teams = [...new Set(list.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  for (const t of teams) if (!strength[t]) strength[t] = { ...PROMO_DEFAULT };
  const ids = {}; let n = 1;
  for (const t of teams) ids[t] = n++;
  const tm = {}, tb = {}, eb = {};
  for (const t of teams) { tm[ids[t]] = strength[t]; tb[ids[t]] = { short: t }; }

  list.forEach((r, i) => {
    const H = ids[r.HomeTeam], A = ids[r.AwayTeam], e = eloPre.get(`${key}|${i}`);
    eb[H] = { elo: e.h }; eb[A] = { elo: e.a };
    const mk = marketForRow(r), kickoff = `${r.Date}T00:00:00Z`;
    /* NÝTT sniðið: xga + xg, svo model.js velji rétta stærð per hóp. */
    const oddsNew = mk ? {
      [r.HomeTeam]: { xga: mk.axg, xg: mk.hxg, opp: r.AwayTeam, kickoff },
      [r.AwayTeam]: { xga: mk.hxg, xg: mk.axg, opp: r.HomeTeam, kickoff },
    } : null;
    /* GAMLA sniðið: aðeins `diff` (varnarstærðin) — það sem gamli kóðinn las. */
    const oddsOld = mk ? {
      [r.HomeTeam]: { diff: mk.hDiff, opp: r.AwayTeam, kickoff },
      [r.AwayTeam]: { diff: mk.aDiff, opp: r.HomeTeam, kickoff },
    } : null;

    const fNew = NEW.makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds: oddsNew, eloByTeam: eb });
    const fOldLive = OLD.makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds: oddsOld, eloByTeam: eb });
    const fOldDead = OLD.makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds: null, eloByTeam: eb });
    const p = FDR.forFixture(r.HomeTeam, r.AwayTeam);

    for (const [team, op, home, fdr, gc, gf] of [
      [r.HomeTeam, A, true, p.h, +r.FTAG, +r.FTHG],
      [r.AwayTeam, H, false, p.a, +r.FTHG, +r.FTAG],
    ]) {
      const me = ids[team], fx = { opp: op, home, fdr, kickoff };
      const row = {
        season: key, team, realFdr: p.real, fdr, gc, gf, cs: gc === 0,
        newDef: fNew(me, fx, 2), newAtt: fNew(me, fx, 4),
        oldLiveDef: fOldLive(me, fx, 2), oldLiveAtt: fOldLive(me, fx, 4),
        oldDeadDef: fOldDead(me, fx, 2), oldDeadAtt: fOldDead(me, fx, 4),
      };
      rows.push(row);
      perTeamDate.set(`${key}|${r.Date}|${team}`, row);
    }
  });
}

console.log(`\n${"=".repeat(76)}`);
console.log(`GAMLA FFDR GEGN NÝJU — ${PRED.length} spáð tímabil, ${rows.length} lið-leikir`);
console.log("=".repeat(76));

/* ---------- 1. AÐGREINING á lið-útkomum ---------- */
const V = [
  ["A. gamalt, EINS OG ÞAÐ KEYRÐI (dauður markaður)", "oldDeadDef", "oldDeadAtt", OLD],
  ["B. gamalt, eins og það var hugsað (mkt 0,50/0,35)", "oldLiveDef", "oldLiveAtt", OLD],
  ["C. NÝTT (mkt 0,80, rétt sóknarstærð, SCALE_FIX)", "newDef", "newAtt", NEW],
];
console.log(`\n${"─".repeat(76)}\n1. AÐGREINING — raðar líkanið leikjum rétt? (r, hærra = betra)\n${"─".repeat(76)}`);
console.log("útgáfa                                              r(mörk á sig)  |r|(mörk skoruð)");
const disc = {};
for (const [label, kd, ka] of V) {
  const rGc = corr(rows.map(r => r[kd]), rows.map(r => r.gc));
  const rGf = corr(rows.map(r => r[ka]), rows.map(r => r.gf));
  disc[label] = { rGc, rGf };
  console.log(`  ${label.padEnd(50)} ${rGc.toFixed(3)}          ${Math.abs(rGf).toFixed(3)}`);
}
const se = rSE(rows.length);
console.log(`  (staðalfrávik á r: ±${se.toFixed(3)})`);
const A = disc[V[0][0]], B = disc[V[1][0]], C = disc[V[2][0]];
console.log(`\n  NÝTT á móti því sem KEYRÐI (A):  mörk á sig ${(C.rGc - A.rGc >= 0 ? "+" : "") + (C.rGc - A.rGc).toFixed(3)}` +
  ` (${((C.rGc / A.rGc - 1) * 100).toFixed(0)}%)  ·  mörk skoruð ${(Math.abs(C.rGf) - Math.abs(A.rGf)).toFixed(3)}` +
  ` (${((Math.abs(C.rGf) / Math.abs(A.rGf) - 1) * 100).toFixed(0)}%)`);
console.log(`  NÝTT á móti hugsaða gamla (B):   mörk á sig ${(C.rGc - B.rGc >= 0 ? "+" : "") + (C.rGc - B.rGc).toFixed(3)}` +
  `  ·  mörk skoruð ${(Math.abs(C.rGf) - Math.abs(B.rGf)).toFixed(3)}`);
ok(C.rGc > A.rGc + 2 * se, `nýtt slær það sem keyrði MARKTÆKT á mörkum á sig (${C.rGc.toFixed(3)} vs ${A.rGc.toFixed(3)}, >2σ)`);
ok(Math.abs(C.rGf) > Math.abs(A.rGf) + 2 * se, `og á mörkum skoruðum (${Math.abs(C.rGf).toFixed(3)} vs ${Math.abs(A.rGf).toFixed(3)}, >2σ)`);

/* Per tímabil — heldur ábatinn alltaf? */
console.log(`\n  Per tímabil (mörk á sig): nýtt slær A í hversu mörgum?`);
let winA = 0, winB = 0;
for (const k of PRED) {
  const g = rows.filter(r => r.season === k);
  const a = corr(g.map(r => r.oldDeadDef), g.map(r => r.gc));
  const b = corr(g.map(r => r.oldLiveDef), g.map(r => r.gc));
  const c = corr(g.map(r => r.newDef), g.map(r => r.gc));
  if (c > a) winA++;
  if (c > b) winB++;
}
console.log(`    gegn A (dauður markaður): ${winA}/${PRED.length} tímabil`);
console.log(`    gegn B (hugsað gamalt):   ${winB}/${PRED.length} tímabil`);
ok(winA >= PRED.length - 1, `nýtt slær A í ≥${PRED.length - 1}/${PRED.length} tímabilum (${winA})`);

/* ---------- 2. KVÖRÐUN — er BIRT CS% rétt? ---------- */
console.log(`\n${"─".repeat(76)}\n2. KVÖRÐUN — er BIRT CS% rétt? (hér sést SCALE_FIX, og aðeins hér)\n${"─".repeat(76)}`);
/* Aðeins tímabil með OPINBERU FDR — sama úrtak sem SCALE_FIX var fittað á. */
const cal = rows.filter(r => r.realFdr);
const realCs = 100 * cal.filter(r => r.cs).length / cal.length;
console.log(`  raunverulegt CS% (n=${cal.length}, opinbert FDR): ${realCs.toFixed(1)}%`);
console.log("\nútgáfa                                              birt CS%   halli    meðalfrávik   Brier");
const calRes = {};
for (const [label, kd, , MOD] of V) {
  const pred = cal.map(r => MOD.lookupPos(2, "cs", r[kd]));
  const srt = [...cal].sort((a, b) => a[kd] - b[kd]);
  let bias = 0, mae = 0;
  for (let i = 0; i < 10; i++) {
    const g = srt.slice(Math.floor(i * srt.length / 10), Math.floor((i + 1) * srt.length / 10));
    const pr = mean(g.map(r => MOD.lookupPos(2, "cs", r[kd])));
    const re = 100 * g.filter(r => r.cs).length / g.length;
    bias += (re - pr) / 10; mae += Math.abs(re - pr) / 10;
  }
  const b = brier(pred.map(v => v / 100), cal.map(r => r.cs ? 1 : 0));
  calRes[label] = { bias, mae, b, shown: mean(pred) };
  console.log(`  ${label.padEnd(50)} ${mean(pred).toFixed(1)}%     ${bias >= 0 ? "+" : ""}${bias.toFixed(1)}pp   ${mae.toFixed(1)}pp` +
    `         ${b.toFixed(4)}`);
}
const cA = calRes[V[0][0]], cC = calRes[V[2][0]];
console.log(`\n  -> NÝTT minnkar kvörðunar-halla úr ${cA.bias >= 0 ? "+" : ""}${cA.bias.toFixed(1)}pp í ` +
  `${cC.bias >= 0 ? "+" : ""}${cC.bias.toFixed(1)}pp og meðalfrávik úr ${cA.mae.toFixed(1)}pp í ${cC.mae.toFixed(1)}pp.`);
ok(Math.abs(cC.bias) < Math.abs(cA.bias), `birt CS% er réttara (halli ${cC.bias.toFixed(1)}pp á móti ${cA.bias.toFixed(1)}pp)`);
ok(cC.mae < cA.mae, `og nákvæmara per tíund (${cC.mae.toFixed(1)}pp á móti ${cA.mae.toFixed(1)}pp)`);

/* ---------- 3. RAUNVERULEG STIG LEIKMANNA ---------- */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const HD = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const POSN = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
const pl = [];
for (const [season, list] of Object.entries(PG.seasons))
  for (const r of list) {
    if (r[HD.starts] < 1 || r[HD.mins] < 60) continue;
    const f = perTeamDate.get(`${season}|${r[HD.date]}|${r[HD.team]}`);
    if (!f) continue;
    const pos = r[HD.pos] === "GKP" ? "GK" : r[HD.pos];
    if (!POSN[pos]) continue;
    pl.push({ pos, code: POSN[pos], pts: r[HD.pts], f });
  }
console.log(`\n${"─".repeat(76)}\n3. GEGN RAUNVERULEGUM STIGUM LEIKMANNA (${pl.length} byrjunarliðs-umferðir)\n${"─".repeat(76)}`);
console.log("staða   n       A: keyrði   B: hugsað   C: NÝTT     ábati C-A");
const gains = [];
for (const [pos, code] of Object.entries(POSN)) {
  const g = pl.filter(r => r.pos === pos);
  if (g.length < 200) continue;
  const pick = (r, which) => code <= 2 ? r.f[which + "Def"] : r.f[which + "Att"];
  const rA = corr(g.map(r => pick(r, "oldDead")), g.map(r => r.pts));
  const rB = corr(g.map(r => pick(r, "oldLive")), g.map(r => r.pts));
  const rC = corr(g.map(r => pick(r, "new")), g.map(r => r.pts));
  gains.push({ pos, rA, rB, rC, n: g.length });
  console.log(`  ${pos.padEnd(5)} ${String(g.length).padStart(5)}   ${rA.toFixed(3)}      ${rB.toFixed(3)}      ${rC.toFixed(3)}` +
    `      ${(Math.abs(rC) - Math.abs(rA) >= 0 ? "+" : "") + (Math.abs(rC) - Math.abs(rA)).toFixed(3)}` +
    ` (${((Math.abs(rC) / Math.abs(rA) - 1) * 100).toFixed(0)}%)`);
}
for (const x of gains)
  ok(Math.abs(x.rC) > Math.abs(x.rA),
    `${x.pos}: nýtt spáir stigum betur en það sem keyrði (${x.rC.toFixed(3)} vs ${x.rA.toFixed(3)})`);

console.log(`\nGAMALT-GEGN-NÝJU: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
