/* ============================================================
   STÖÐUR GEGN LIÐUM — hefur mótherji SÉR-VEIKLEIKA per stöðu?

   SPURNING NOTANDANS: "skoðum hvaða liðum ákveðnar stöður eru að ná
   stigum gegn... sambærilegur leikmaður í framtíðar leikjum á móti
   þessu liði gæti þá gengið eins."

   ÞETTA ER MÆLING, EKKI EIGINLEIKI. FFDR gefur mótherja EINA þyngd per
   hóp (vörn/sókn). Ef lið hefur RAUNVERULEGAN sér-veikleika — t.d.
   hleypir miðjumönnum að en ekki framherjum — þá er sú vitneskja
   FYRIR UTAN líkanið og gæti bætt það. Ef veikleikinn er hins vegar
   bara hávaði (og hvert lið-tímabil hefur aðeins 38 leiki, svo hávaði
   er mikill) þá má hann EKKI fara inn: hann myndi líta út eins og
   innsæi en vera tilviljun.

   AÐFERÐIN sem skilur merki frá hávaða:
     1. Reikna, per (mótherji, staða), hversu mörg stig leikmenn í þeirri
        stöðu fá að meðaltali — LEIÐRÉTT fyrir almennum styrk mótherjans
        (þ.e. leif eftir að FFDR-væntingin er dregin frá).
     2. Spyrja hvort sá veikleiki HELDUR MILLI TÍMABILA: leifin á
        tímabili N á að spá leifinni á tímabili N+1 ef hún er raunveruleg.
        Þetta er lykilprófið — innan sama tímabils er hún alltaf til
        (hún er skilgreind út frá þeim leikjum), svo eina marktæka
        spurningin er hvort hún flytjist fram í tímann.
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloWalkForward, corr, rSE,
} from "./lib/e0.mjs";
import { makeFixDifficulty, lookupPos } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

/* ---------- FFDR + mótherji per (tímabil, dagsetning, lið) ---------- */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const eloPre = eloWalkForward(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const info = new Map();
for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prev = byKey[SEASONS[si - 1]], rows = byKey[key];
  const FDR = fdrFor(key, prev), strength = buildStrength(prev);
  const teams = [...new Set(rows.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  for (const t of teams) if (!strength[t]) strength[t] = { ...PROMO_DEFAULT };
  const ids = {}; let n = 1;
  for (const t of teams) ids[t] = n++;
  const tm = {}, tb = {}, eb = {};
  for (const t of teams) { tm[ids[t]] = strength[t]; tb[ids[t]] = { short: t }; }
  rows.forEach((r, i) => {
    const H = ids[r.HomeTeam], A = ids[r.AwayTeam], e = eloPre.get(`${key}|${i}`);
    eb[H] = { elo: e.h }; eb[A] = { elo: e.a };
    const mk = marketForRow(r), kickoff = `${r.Date}T00:00:00Z`;
    const odds = mk ? {
      [r.HomeTeam]: { xga: mk.axg, xg: mk.hxg, opp: r.AwayTeam, kickoff },
      [r.AwayTeam]: { xga: mk.hxg, xg: mk.axg, opp: r.HomeTeam, kickoff },
    } : null;
    const f = makeFixDifficulty({ teamMetrics: tm, teamById: tb, odds, eloByTeam: eb });
    const p = FDR.forFixture(r.HomeTeam, r.AwayTeam);
    for (const [team, oppName, op, home, fdr] of [
      [r.HomeTeam, r.AwayTeam, A, true, p.h],
      [r.AwayTeam, r.HomeTeam, H, false, p.a],
    ]) {
      const me = ids[team], fx = { opp: op, home, fdr, kickoff };
      info.set(`${key}|${r.Date}|${team}`, { opp: oppName, dDef: f(me, fx, 2), dAtt: f(me, fx, 4) });
    }
  });
}

/* ---------- Leikmannaraðir ---------- */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const HD = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const POSN = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
const rows = [];
for (const [season, list] of Object.entries(PG.seasons)) {
  for (const r of list) {
    if (r[HD.starts] < 1 || r[HD.mins] < 60) continue;
    const f = info.get(`${season}|${r[HD.date]}|${r[HD.team]}`);
    if (!f) continue;
    const pos = r[HD.pos] === "GKP" ? "GK" : r[HD.pos];
    const code = POSN[pos];
    if (!code) continue;
    const d = code <= 2 ? f.dDef : f.dAtt;
    /* LEIFIN: raunstig mínus það sem FFDR spáði fyrir þessa stöðu. Þar með
       er almennur styrkur mótherjans tekinn út og aðeins sér-veikleiki eftir. */
    rows.push({ season, opp: f.opp, pos, pts: r[HD.pts],
      resid: r[HD.pts] - lookupPos(code, "pts", d) });
  }
}
console.log(`\n${"=".repeat(72)}`);
console.log(`STÖÐUR GEGN LIÐUM — ${rows.length} byrjunarliðs-umferðir, ` +
  `${new Set(rows.map(r => r.season)).size} tímabil`);
console.log("=".repeat(72));

/* ---------- 1. Stærstu sér-veikleikar (til upplýsingar) ---------- */
const cell = {};
for (const r of rows) {
  const k = `${r.season}|${r.opp}|${r.pos}`;
  (cell[k] ||= []).push(r.resid);
}
const solid = Object.entries(cell).filter(([, v]) => v.length >= 30)
  .map(([k, v]) => { const [s, o, p] = k.split("|"); return { s, o, p, n: v.length, m: mean(v) }; });
solid.sort((a, b) => b.m - a.m);
console.log(`\nSTÆRSTU SÉR-VEIKLEIKAR (leif = raunstig − FFDR-vænting, ≥30 umferðir):`);
console.log("  tímabil mótherji           staða  n     leif/leik");
for (const x of solid.slice(0, 6))
  console.log(`  ${x.s}    ${x.o.padEnd(18)} ${x.p.padEnd(5)}  ${String(x.n).padStart(3)}   ${x.m >= 0 ? "+" : ""}${x.m.toFixed(2)}`);
console.log("  ... og þéttustu vörnaðirnir:");
for (const x of solid.slice(-3))
  console.log(`  ${x.s}    ${x.o.padEnd(18)} ${x.p.padEnd(5)}  ${String(x.n).padStart(3)}   ${x.m >= 0 ? "+" : ""}${x.m.toFixed(2)}`);

/* ---------- 2. LYKILPRÓFIÐ: heldur veikleikinn milli tímabila? ---------- */
console.log(`\n${"─".repeat(72)}\nHELDUR SÉR-VEIKLEIKINN MILLI TÍMABILA? (ef ekki er hann hávaði)\n${"─".repeat(72)}`);
const seasonsSorted = [...new Set(rows.map(r => r.season))].sort();
const byKeyCell = {};
for (const x of solid) byKeyCell[`${x.s}|${x.o}|${x.p}`] = x.m;
console.log("staða   pör (lið sem eru í deildinni tvö tímabil í röð)   r(N -> N+1)");
let anySignal = false;
const measured = [];                    /* ThEKJAN ER FULLYRDING, EKKI LOGGA */
for (const pos of ["GK", "DEF", "MID", "FWD"]) {
  const xs = [], ys = [];
  for (let i = 1; i < seasonsSorted.length; i++) {
    const a = seasonsSorted[i - 1], b = seasonsSorted[i];
    const opps = new Set(rows.filter(r => r.season === b).map(r => r.opp));
    for (const o of opps) {
      const va = byKeyCell[`${a}|${o}|${pos}`], vb = byKeyCell[`${b}|${o}|${pos}`];
      if (va == null || vb == null) continue;
      xs.push(va); ys.push(vb);
    }
  }
  if (xs.length < 20) { console.log(`  ${pos.padEnd(5)} of fá pör (${xs.length})`); continue; }
  const r = corr(xs, ys), se = rSE(xs.length);
  const sig = Math.abs(r) > 2 * se;
  if (sig && r > 0) anySignal = true;
  measured.push(pos);
  console.log(`  ${pos.padEnd(5)} ${String(xs.length).padStart(3)} pör` +
    `                                     ${r.toFixed(3)} (±${se.toFixed(3)}) ${sig ? (r > 0 ? "MERKI" : "andstætt") : "hávaði"}`);
}

/* Samanburður: heldur ALMENNUR styrkur mótherjans milli tímabila? Hann
   gerir það vissulega — og það er einmitt það sem FFDR notar þegar. Þessi
   lína er viðmiðið sem sér-veikleikinn þarf að slá til að vera nýr. */
const gen = {};
for (const r of rows) (gen[`${r.season}|${r.opp}`] ||= []).push(r.resid);
const genM = Object.fromEntries(Object.entries(gen).filter(([, v]) => v.length >= 80)
  .map(([k, v]) => [k, mean(v)]));
const gx = [], gy = [];
for (let i = 1; i < seasonsSorted.length; i++) {
  const a = seasonsSorted[i - 1], b = seasonsSorted[i];
  for (const o of new Set(rows.filter(r => r.season === b).map(r => r.opp))) {
    const va = genM[`${a}|${o}`], vb = genM[`${b}|${o}`];
    if (va == null || vb == null) continue;
    gx.push(va); gy.push(vb);
  }
}
const rGen = corr(gx, gy);
console.log(`\n  VIÐMIÐ — almenn leif mótherjans (allar stöður saman): r=${rGen.toFixed(3)} á ${gx.length} pörum`);
console.log(`  ATH: þetta er LEIF EFTIR FFDR, ekki liðsstyrkur. Að hún sé ~0 er`);
console.log(`  GÓÐ niðurstaða: það þýðir að FFDR hefur þegar dregið út þann hluta`);
console.log(`  mótherjans sem ER stöðugur, og skilið eftir hávaða — sem er nákvæmlega`);
console.log(`  það sem á að vera eftir.`);

/* ÞETTA VAR TAUTOLÓGÍA OG STÓÐ GRÆN FRÁ 9.8.2026 (fundið 21.8.2026):
     ok(!anySignal || true, "mælt — sjá niðurstöðu að neðan")
   `x || true` ER `true`, svo `fail` gat aldrei orðið 1 og
   `process.exit(fail ? 1 : 0)` skilaði ALLTAF 0. Skráin var sett í
   `SUITES` 9.8.2026 með þeim rökum að hún BÆRI `ok()` og `exit(fail?1:0)`
   og væri þar með "raunverulegur vörður" — en eina fullyrðingin í henni
   gat ekki fallið, svo hún var í raun mælinga-skýrsla eins og
   `ffdr-vs-fdr.mjs`, bara skráð sem vörður. Sannað með stökkbreytingu:
   `let anySignal = true` (þ.e. staða MEÐ stöðugan sér-veikleika, sem er
   nákvæmlega það sem á að fella hana) skilaði áfram "1 stóðust, 0 féllu".

   Nú er hún tvíhliða, eins og `travel-measure.mjs:130` sem er systur-
   mælingin í sömu töflu (kafli 4) og hefur ALLTAF haft rétta formið:
     1. ÞEKJAN: allar fjórar stöður verða að hafa NÆG pör. Annars
        slokknar `if (xs.length < 20) continue` þegjandi á þeim öllum,
        `anySignal` helst false og niðurstaðan "flyst ekki" er TÓM —
        hún þýðir þá "var ekki mæld". Sama regla og MIN_VISITED.
     2. NIÐURSTAÐAN: enginn sér-veikleiki flyst milli tímabila.
   Verður fullyrðing 2 rauð er það EKKI villa í prófinu — það er
   réttlæting fyrir að endurskoða kafla 4, mælt á NÝJU úrtaki fyrst. */
ok(measured.length === 4,
  `allar fjórar stöður mældar, ekki slokknaðar á fáum pörum (${measured.join(",") || "engin"})`);
ok(!anySignal,
  "enginn sér-veikleiki per stöðu flyst milli tímabila (kafli 4 — hafnað)");
if (anySignal) {
  console.log(`\n  -> NIÐURSTAÐA: einhver staða sýnir STÖÐUGAN sér-veikleika milli`);
  console.log(`     tímabila. Það er réttlæting fyrir að skoða per-stöðu-leiðréttingu`);
  console.log(`     á FFDR — en HÚN Á AÐ VERA MÆLD Á NÝJU ÚRTAKI ÁÐUR EN HÚN FER INN.`);
} else {
  console.log(`\n  -> NIÐURSTAÐA: sér-veikleiki per stöðu FLYTST EKKI milli tímabila.`);
  console.log(`     Stóru tölurnar að ofan (±1 stig/leik) eru því hávaði úr 38-leikja`);
  console.log(`     úrtaki, ekki eiginleiki liðsins. ÞETTA MÁ EKKI FARA Í FFDR:`);
  console.log(`     það myndi líta út eins og innsæi og vera tilviljun.`);
  console.log(`     Og leifin ALMENNT flyst ekki heldur (r=${rGen.toFixed(3)}), sem er`);
  console.log(`     staðfesting á að FFDR sé þegar búið að taka út þann hluta`);
  console.log(`     mótherjans sem er raunverulega stöðugur (xG/xGC, Elo, markaður).`);
}

console.log(`\nSTÖÐU-PRÓF: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
