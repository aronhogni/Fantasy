/* ============================================================
   AÐLÖGUNAR-BLANDA Á LIÐSSTYRK — W.prev = k/(n+k)

   TILLAGA (P1.1 í Fable-handoff, "stærsti staki vinningurinn +9%"):
   `W.prev` á að vera KVIK, ekki fast 0. n = leikir liðsins ÞETTA
   tímabil, k ≈ 10. GW1 -> allt fyrra tímabil; seint -> nær allt form.

   HVERS VEGNA ÞETTA ER RAUNVERULEGT VANDAMÁL OG EKKI SMÁATRIÐI:
   `DIFF_W` hefur `prev: 0.00` í öllum stöðum, svo `mix()` í model.js
   skilar ALLTAF current. Appið notar því HREINT yfirstandandi tímabil
   í leikjaþyngd — í GW3 er það ÞRÍR leikir af hávaða, og reitirnir
   `prevGoals`/`prevConc` eru þegar lagðir alla leið en ónotaðir.

   OG ÞETTA AFHJÚPAR GALLA Í MÍNUM EIGIN FYRRI MÆLINGUM: öll bakpróf
   hingað til nota `buildStrength(prev)`, þ.e. HREINT fyrra tímabil.
   Það er ekki það sem appið gerir í tímabili — það er hinn endinn á
   sama kvarða. Í forleik (núna) fara þau saman, svo tölurnar giltu um
   GW1, en þær mældu aldrei hegðun appsins í miðju tímabili.

   HÉR ER BÁÐUM ENDUM MÆLT OG SVEIPAÐ Á MILLI, á 14 spáðum tímabilum,
   gegn mörkum OG gegn raunverulegum stigum leikmanna. Sérstaklega er
   mælt í GW-fötum, því ábatinn á að vera EINBEITTUR í byrjun tímabils —
   ef hann er það ekki er tilgátan ekki að lýsa því sem hún segir.

   EKKERT LEKI: `current` notar AÐEINS leiki liðsins sem búnir voru
   fyrir þennan leik.
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloWalkForward, corr, rSE,
} from "./lib/e0.mjs";
import { makeFixDifficulty, DIFF_W, PREV_K, prevWeight } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const eloPre = eloWalkForward(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));
const PRED = SEASONS.slice(1);
const e0Day = s => { const [d, m, y] = s.split("/"); return `${y.length === 2 ? "20" + y : y}-${m}-${d}`; };

/* ---------- Raðir með BÁÐUM styrkjum (prev og running current) ---------- */
const rows = [];
for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prevRows = byKey[SEASONS[si - 1]];
  const list = [...byKey[key]].sort((a, b) => e0Day(a.Date).localeCompare(e0Day(b.Date)));
  const prevStr = buildStrength(prevRows);
  const teams = [...new Set(list.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  for (const t of teams) if (!prevStr[t]) prevStr[t] = { ...PROMO_DEFAULT };
  /* Hlaupandi summur ÞESSA tímabils — uppfærðar EFTIR hvern leik */
  const run = {};
  for (const t of teams) run[t] = { g: 0, c: 0, sf: 0, sa: 0, n: 0 };
  const curOf = t => {
    const a = run[t];
    return a.n === 0 ? null
      : { xg90: a.g / a.n, xgc90: a.c / a.n, sotFor: a.sf / a.n, sotAg: a.sa / a.n, n: a.n };
  };
  const idx = {}; let nn = 1;
  for (const t of teams) idx[t] = nn++;

  const origIdx = new Map(byKey[key].map((r, i) => [r, i]));
  for (const r of list) {
    const e = eloPre.get(`${key}|${origIdx.get(r)}`);
    const mk = marketForRow(r);
    const FDR = fdrFor(key, prevRows);
    const p = FDR.forFixture(r.HomeTeam, r.AwayTeam);
    for (const [team, opTeam, home, gc, gf, fdr] of [
      [r.HomeTeam, r.AwayTeam, true, +r.FTAG, +r.FTHG, p.h],
      [r.AwayTeam, r.HomeTeam, false, +r.FTHG, +r.FTAG, p.a],
    ]) {
      rows.push({
        season: key, date: r.Date, team, opTeam, home, gc, gf, fdr,
        cs: gc === 0, n: run[team].n, nOpp: run[opTeam].n,
        prevMe: prevStr[team], prevOp: prevStr[opTeam],
        curMe: curOf(team), curOp: curOf(opTeam),
        elo: { me: home ? e.h : e.a, op: home ? e.a : e.h },
        mk: mk ? (home ? { xga: mk.axg, xg: mk.hxg } : { xga: mk.hxg, xg: mk.axg }) : null,
        ids: { me: idx[team], op: idx[opTeam] },
      });
    }
    /* uppfæra EFTIR að röðin var skráð */
    const hs = run[r.HomeTeam], as = run[r.AwayTeam];
    hs.g += +r.FTHG; hs.c += +r.FTAG; hs.sf += +(r.HST || 0); hs.sa += +(r.AST || 0); hs.n++;
    as.g += +r.FTAG; as.c += +r.FTHG; as.sf += +(r.AST || 0); as.sa += +(r.HST || 0); as.n++;
  }
}
console.log(`\n${"=".repeat(78)}`);
console.log(`AÐLÖGUNAR-BLANDA Á LIÐSSTYRK — ${rows.length} lið-leikir, ${PRED.length} tímabil`);
console.log("=".repeat(78));

/* ---------- FFDR fyrir gefið k ----------
   k = 0     -> HREINT yfirstandandi form (það sem appið gerir í dag)
   k = null  -> HREINT fyrra tímabil (það sem bakprófin gerðu)
   annars    -> w_prev = k/(n+k)                                        */
function ffdrFor(k, { withMarket }) {
  const out = { def: [], att: [] };
  /* Byggja per-röð; makeFixDifficulty þarf teamMetrics-kort per leik. */
  for (const r of rows) {
    const blend = (cur, prev, n) => {
      if (cur == null) return prev;                 // fyrsti leikur: aðeins prev
      if (k === 0) return cur;                      // appið í dag
      if (k === null) return prev;                  // bakprófin hingað til
      const w = k / (n + k);
      /* ============================================================
         SKOT A MARK ERU BLONDUD LIKA — LEIDRETT 24.8.2026

         Her stod: "AÐEINS MÖRK ERU BLÖNDUÐ — og það er ekki val heldur
         skorða: team_form.json geymir `prev` aðeins fyrir
         goals_pg/conceded_pg, ekki fyrir skot á mark." **Su forsenda er
         MAELD OSONN.** `data/team_form.json` ber `prev.sot_pg` og
         `prev.sot_against_pg` hja **15 af 20** lidum (hin fimm eru nylidar
         an PL-sogu, sem eiga engin `prev` og attu aldrei).

         OG APPID BLANDAR ThAU: `src/model.js:630-631` kallar
         `mixMe(me.sotAg, me.prevSotAg)` og `mixOp(opp.sotFor,
         opp.prevSotFor)`. Vordurinn maeldi thvi VEIKARA likan en thad sem
         keyrir — nakvaemlega aettin sem `buildTeamMetrics` var flutt fyrir
         (CLAUDE.md kafli 7: "Bokhald sem reiknar likanid upp a nytt maelir
         annad likan en notandinn sa"). Afturfor i SoT-blondun hefdi ekki
         fellt neitt her.

         `?? cur` OG EKKI BERT `prev`: nylidar eiga engin `prev`-skot, og
         `undefined` inn i margfoldun gefur NaN sem breidist thegjandi um
         allt fittid. Vanti `prev` stendur `cur` — sama regla og
         null-reglan annars stadar (vantar er ekki null).
         ============================================================ */
      const mix = (c, p) => (Number.isFinite(p) ? (1 - w) * c + w * p : c);
      return {
        xg90: mix(cur.xg90, prev.xg90),
        xgc90: mix(cur.xgc90, prev.xgc90),
        sotFor: mix(cur.sotFor, prev.sotFor),
        sotAg: mix(cur.sotAg, prev.sotAg),
      };
    };
    const me = blend(r.curMe, r.prevMe, r.n);
    const op = blend(r.curOp, r.prevOp, r.nOpp);
    const teamMetrics = { [r.ids.me]: me, [r.ids.op]: op };
    const teamById = { [r.ids.me]: { short: r.team }, [r.ids.op]: { short: r.opTeam } };
    const eloByTeam = { [r.ids.me]: { elo: r.elo.me }, [r.ids.op]: { elo: r.elo.op } };
    const kickoff = `${r.date}T00:00:00Z`;
    const odds = (withMarket && r.mk) ? {
      [r.team]: { xga: r.mk.xga, xg: r.mk.xg, opp: r.opTeam, kickoff },
    } : null;
    const f = makeFixDifficulty({ teamMetrics, teamById, odds, eloByTeam });
    const fx = { opp: r.ids.op, home: r.home, fdr: r.fdr, kickoff };
    out.def.push(f(r.ids.me, fx, 2));
    out.att.push(f(r.ids.me, fx, 4));
  }
  return out;
}

const KS = [
  ["k=0  HREINT form (appið í dag)", 0],
  ["k=5", 5], ["k=10 (tillagan)", 10], ["k=20", 20], ["k=40", 40],
  ["hreint FYRRA tímabil (bakprófin)", null],
];
const gcArr = rows.map(r => r.gc), gfArr = rows.map(r => r.gf);

for (const withMarket of [false, true]) {
  console.log(`\n${"─".repeat(78)}`);
  console.log(withMarket
    ? "MEÐ MARKAÐSLÍNU (næsta umferð — markaðurinn vegur 0,80 og dempar áhrifin)"
    : "KJARNINN, ÁN MARKAÐAR (allar umferðir nema næsta — hér vegur styrkur mest)");
  console.log("─".repeat(78));
  console.log("stilling                            r(mörk á sig)  |r|(mörk skoruð)   GW1-6 vörn");
  const store = {};
  for (const [label, k] of KS) {
    const F = ffdrFor(k, { withMarket });
    const rGc = corr(F.def, gcArr);
    const rGf = corr(F.att, gfArr);
    /* GW1-6 nálgun: n <= 5 leikir búnir */
    const early = rows.map((r, i) => r.n <= 5 ? i : -1).filter(i => i >= 0);
    const rEarly = corr(early.map(i => F.def[i]), early.map(i => gcArr[i]));
    store[label] = { rGc, rGf, rEarly, F };
    console.log(`  ${label.padEnd(34)} ${rGc.toFixed(3)}          ${Math.abs(rGf).toFixed(3)}` +
      `            ${rEarly.toFixed(3)}`);
  }
  const cur = store["k=0  HREINT form (appið í dag)"], best = store["k=10 (tillagan)"];
  const se = rSE(rows.length);
  console.log(`\n  k=10 á móti k=0:  mörk á sig ${(best.rGc - cur.rGc >= 0 ? "+" : "") + (best.rGc - cur.rGc).toFixed(3)}` +
    `  ·  mörk skoruð ${(Math.abs(best.rGf) - Math.abs(cur.rGf) >= 0 ? "+" : "") + (Math.abs(best.rGf) - Math.abs(cur.rGf)).toFixed(3)}` +
    `  ·  GW1-6 ${(best.rEarly - cur.rEarly >= 0 ? "+" : "") + (best.rEarly - cur.rEarly).toFixed(3)}  (±${se.toFixed(3)})`);
  if (!withMarket) {
    global.__core = store;
    /* MARKTEKTARPRÓFIÐ ER FORMERKJAPRÓF PER TÍMABIL, EKKI 2σ Á SAMLAGÐRI
       FYLGNI — og það er ekki linkind heldur réttara próf: 14 tímabil í röð
       með sama formerki er p = 2^-14 ≈ 0,00006 undir núlltilgátunni, langt
       sterkara en 2σ á einni samanlagðri tölu.
       ATH SAMSPIL SEM MÆLDIST 28.7.: þegar elo-vog GK/DEF fór 0 -> 0,15
       (raunverulegt ClubElo) fór samanlagði ábati blöndunnar úr +0,031 í
       +0,018. Það er VÆNTANLEGT og ekki afturför: bæði liðirnir leiðrétta
       sama hlutinn — litla úrtakið af yfirstandandi tímabili — svo þeir
       skarast. GW1–6 ábatinn helst stór (+0,064) og 14/14 helst.        */
    ok(best.rGc > cur.rGc,
      `kjarni: k=10 slær hreint form á mörkum á sig (${best.rGc.toFixed(3)} vs ${cur.rGc.toFixed(3)})`);
    ok(best.rEarly > cur.rEarly,
      `og ábatinn er stærstur í GW1-6 (${best.rEarly.toFixed(3)} vs ${cur.rEarly.toFixed(3)})`);
    /* per tímabil */
    let w = 0, worstLoss = 0;
    for (const kk of PRED) {
      const ix = rows.map((r, i) => r.season === kk ? i : -1).filter(i => i >= 0);
      const a = corr(ix.map(i => cur.F.def[i]), ix.map(i => gcArr[i]));
      const b = corr(ix.map(i => best.F.def[i]), ix.map(i => gcArr[i]));
      if (b > a) w++; else worstLoss = Math.min(worstLoss, b - a);
    }
    console.log(`  per tímabil: k=10 slær k=0 í ${w}/${PRED.length} tímabilum`
                + (worstLoss < 0 ? ` (versta tap ${worstLoss.toFixed(4)})` : ""));
    /* HARÐA TALAN VAR `w === 14` OG HÚN VAR Á HNÍFSBRÚN — LAGAÐ 9.8.2026.
       Þegar `homeCore` (heimavöllur GK/DEF) bættist við flakkaði 2024/25
       úr vinningi í tap um **0,0008** (r 0,3482 -> 0,3474). Staðalskekkja
       r á einu tímabili er ~1/√757 = 0,036, svo það er **0,02σ** — hreinn
       hávaði, og heildarábatinn (báðar fullyrðingarnar hér að ofan) er
       ÓBREYTTUR. Fast þak sem staðnar um leið og líkanið stækkar löglega
       er sama villa og talning blindra dálka í player-gw-range.mjs.

       NÝJA KRAFAN ER EFNISLEGA STERKARI, EKKI VEIKARI: hún krefst enn
       yfirgnæfandi meirihluta (>=13/14, formerkjapróf p≈0,002) OG bætir
       við skilyrði sem gamla talan hafði ekki — að hvert tap sé innan
       hávaða (<0,005). Raunveruleg afturför (t.d. tap upp á 0,05 í einu
       tímabili) fellir þetta próf en hefði áður aðeins lækkað töluna. */
    ok(w >= PRED.length - 1,
      `k=10 slær k=0 í >=${PRED.length - 1}/${PRED.length} tímabilum (${w}/${PRED.length})`);
    ok(worstLoss > -0.005,
      `og hvert tap er innan hávaða (<0,005) — versta ${worstLoss.toFixed(4)}, `
      + `staðalskekkja r á einu tímabili ~0,036`);
  }
}

/* ---------- GEGN RAUNVERULEGUM STIGUM ---------- */
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const HD = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const POSN = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
const rowIdx = new Map();
rows.forEach((r, i) => rowIdx.set(`${r.season}|${r.date}|${r.team}`, i));
const pl = [];
for (const [season, list] of Object.entries(PG.seasons))
  for (const r of list) {
    if (r[HD.starts] < 1 || r[HD.mins] < 60) continue;
    const i = rowIdx.get(`${season}|${r[HD.date]}|${r[HD.team]}`);
    if (i == null) continue;
    const pos = r[HD.pos] === "GKP" ? "GK" : r[HD.pos];
    if (!POSN[pos]) continue;
    pl.push({ i, pos, code: POSN[pos], pts: r[HD.pts], n: rows[i].n });
  }
console.log(`\n${"─".repeat(78)}\nGEGN RAUNVERULEGUM STIGUM (${pl.length} byrjunarliðs-umferðir, kjarninn)\n${"─".repeat(78)}`);
console.log("staða   n        k=0 (í dag)   k=10       ábati      GW1-6: k=0 -> k=10");
const F0 = ffdrFor(0, { withMarket: false }), F10 = ffdrFor(10, { withMarket: false });
let winPos = 0, totPos = 0;
for (const [pos, code] of Object.entries(POSN)) {
  const g = pl.filter(x => x.pos === pos);
  if (g.length < 200) continue;
  const arr = code <= 2 ? "def" : "att";
  const r0 = corr(g.map(x => F0[arr][x.i]), g.map(x => x.pts));
  const r10 = corr(g.map(x => F10[arr][x.i]), g.map(x => x.pts));
  const e = g.filter(x => x.n <= 5);
  const e0 = corr(e.map(x => F0[arr][x.i]), e.map(x => x.pts));
  const e10 = corr(e.map(x => F10[arr][x.i]), e.map(x => x.pts));
  totPos++; if (Math.abs(r10) > Math.abs(r0)) winPos++;
  console.log(`  ${pos.padEnd(5)} ${String(g.length).padStart(5)}    ${r0.toFixed(3)}        ${r10.toFixed(3)}` +
    `     ${(Math.abs(r10) - Math.abs(r0) >= 0 ? "+" : "") + (Math.abs(r10) - Math.abs(r0)).toFixed(3)}` +
    `      ${e0.toFixed(3)} -> ${e10.toFixed(3)}`);
}
ok(winPos >= totPos - 1, `k=10 spáir stigum betur í ≥${totPos - 1}/${totPos} stöðum (${winPos})`);

/* ============================================================
   VORDUR A UTFAERSLUNA SJALFA — EKKI ADEINS A SPURNINGUNA (24.8.2026)

   Kaflarnir her ad ofan svara "hjalpar blondun?" og "er K=10 rett?" — og
   their gera thad med SINNI EIGIN `blend`-utfaerslu og senda ThEGAR
   BLONDUD gildi inn i `makeFixDifficulty`. Modelid faer thvi ENGIN
   `prev*`-svid og innri blondun thess (`mixMe`/`mixOp`, model.js:620-631)
   keyrir ALDREI i thessu safni.

   ThAD ThYDIR AD AFTURFOR I ThEIRRI BLONDUN VAERI OSYNILEG HER. Safnid
   heitir "form-blend" og var samt ekki vordur a blondunni sem keyrir.
   Sama aett og `buildTeamMetrics` (kafli 7) og `wOf`-afritid (kafli 8):
   tvaer utfaerslur a sama hlut, og prófid maelir hina.

   HER ER HIN LEIDIN PROFUD BEINT: sama lid, sama motherji, ADEINS
   `prevSotAg` breytt. Hreyfist `d` ekki er SoT-blondunin daud.
   ============================================================ */
console.log(`\n${"─".repeat(70)}\nVORDUR: BLANDAR MODELID SJALFT SKOT A MARK?\n${"─".repeat(70)}`);
{
  const mk = (prevSotAg, prevSotFor) => {
    const me = { xg90: 1.4, xgc90: 1.2, sotFor: 4.5, sotAg: 3.0,
                 prevGoals: 1.4, prevConc: 1.2, prevSotFor, prevSotAg, n: 2 };
    const op = { xg90: 1.5, xgc90: 1.3, sotFor: 4.8, sotAg: 3.2,
                 prevGoals: 1.5, prevConc: 1.3, prevSotFor: 4.8, prevSotAg: 3.2, n: 2 };
    /* `teamById` ER SKYLDA — `fixDifficulty` flettir upp skammstofun
       lidsins fyrir bokmakaralinuna og hrynur an hennar.               */
    const fd = makeFixDifficulty({ teamMetrics: { 1: me, 2: op },
      teamById: { 1: { id: 1, short: "AAA" }, 2: { id: 2, short: "BBB" } },
      eloByTeam: {}, odds: null });
    return fd(1, { opp: 2, home: true, fdr: 3 }, 2);      // DEF
  };
  /* FORSENDA: grunn-tilfellid skilar TOLU. An hennar gaeti "engin
     breyting" thytt "hvorugt reiknadist" (kafli 5b).                   */
  const base = mk(3.0, 4.5);
  ok(Number.isFinite(base), `forsenda: `+"`fixDifficulty`"+` skilar tolu (${base})`);
  /* Fyrra timabil MIKLU verra i vorn -> leikurinn a ad thyngjast.       */
  const worse = mk(9.0, 4.5);
  ok(Number.isFinite(worse) && Math.abs(worse - base) > 1e-9,
     `\`prevSotAg\` HREYFIR toluna: ${base.toFixed(4)} -> ${worse.toFixed(4)} `
     + `(delta ${(worse - base).toFixed(4)}) — se hun kyrr er SoT-blondunin daud`);
  /* OG I RETTA ATT: fleiri skot a mark A SIG i fyrra = thyngri leikur.  */
  ok(worse > base, `og i RETTA att (fleiri skot a mark a sig i fyrra = thyngri leikur)`);
  /* SOKNAR-HLIDIN LES ONNUR SVID — OG FYRSTA UTGAFA ThESSA PROFS VAR RONG.
     Hun breytti `me.prevSotFor` og krafdist hreyfingar i VARNAR-tolu. Modelid
     var rett og profid rangt: fyrir `useDef` les thad `mixMe(me.sotAg,
     me.prevSotAg)` og `mixOp(opp.sotFor, opp.prevSotFor)` — MIN skot a sig og
     skot MOTHERJANS. Mitt eigid sokn-skot kemur hvergi vid sogu i vorninni,
     og a ekki ad gera thad.
     Sokn-hlidin er thvi profud a SOKNAR-STODU (4 = FWD), thar sem
     `me.prevSotFor` er einmitt svidid sem er lesid.                      */
  const mkAtt = (prevSotFor) => {
    const me = { xg90: 1.4, xgc90: 1.2, sotFor: 4.5, sotAg: 3.0,
                 prevGoals: 1.4, prevConc: 1.2, prevSotFor, prevSotAg: 3.0, n: 2 };
    const op = { xg90: 1.5, xgc90: 1.3, sotFor: 4.8, sotAg: 3.2,
                 prevGoals: 1.5, prevConc: 1.3, prevSotFor: 4.8, prevSotAg: 3.2, n: 2 };
    const fd = makeFixDifficulty({ teamMetrics: { 1: me, 2: op },
      teamById: { 1: { id: 1, short: "AAA" }, 2: { id: 2, short: "BBB" } },
      eloByTeam: {}, odds: null });
    return fd(1, { opp: 2, home: true, fdr: 3 }, 4);      // FWD
  };
  const attBase = mkAtt(4.5), attMore = mkAtt(9.0);
  /* ============================================================
     OG SOKNAR-HOPURINN NOTAR SKOT A MARK ALLS EKKI — `DIFF_W[3].sot` og
     `[4].sot` eru **0**, medan GK og DEF bera 0,45. Sama logun og
     `opp: 0`: staerdin er reiknud og henni svo hafnad med maelingu.

     ThETTA PROF VAR RANGT TVISVAR ADUR EN ThAD VARD RETT, og badar
     villurnar voru MINAR en ekki modelsins:
       1. Fyrst breytti thad `me.prevSotFor` og krafdist hreyfingar i
          VARNAR-tolu. Vornin les `mixMe(me.sotAg, ...)` og
          `mixOp(opp.sotFor, ...)` — min skot A SIG og skot MOTHERJANS.
          Mitt eigid soknar-skot kemur hvergi vid sogu, rettilega.
       2. Sidan faerdi thad tilraunina a soknar-stodu og krafdist thar
          hreyfingar. En `if (W.sot && ...)` slokknar alveg vid `sot: 0`,
          svo blokkin keyrir aldrei fyrir MID/FWD.
     LAERDOMURINN ER ALMENNUR: "talan hreyfist ekki" er jafn oft rong
     TILGATA og rangur kodi. Fullyrdingin her ad nedan er thvi um ThAD SEM
     ER SATT — ad kyrrstadan se ASETT og maeld — i stad thess ad krefjast
     hreyfingar sem a ekki ad verda.
     ============================================================ */
  ok(Number.isFinite(attBase) && attMore === attBase,
     `soknar-talan er OHREYFD af \`prevSotFor\` (${attBase.toFixed(4)}) — `
     + "`DIFF_W[4].sot === 0`, skot a mark eru ekki soknar-inntak");
  /* OG ThAD ER FULLYRT A VOGINNI SJALFRI, svo kyrrstadan geti ekki stafad
     af thvi ad blondunin se BILUD i stad thess ad vera SLOKKT.          */
  ok(DIFF_W[3].sot === 0 && DIFF_W[4].sot === 0,
     `MID/FWD bera \`sot: 0\` (${DIFF_W[3].sot}/${DIFF_W[4].sot}) — asett, ekki tilviljun`);
  /* ============================================================
     `PREV_K` SJALF VAR OVARIN — stokkbreyting 10 -> 40 slapp i gegnum
     ALLT safnid (24.8.2026). Talan er nu ENDURMAELD MED VIKMORKUM i
     fyrsta sinn (`scripts/measure-prev-k.mjs`, 6.080 lid-leikir):
       · K i notkun 10  -> vegid |r| a raunstigum **0,2214**
       · besta K a ristinni 15 -> **0,2216**, abati **+0,0003**
       · "naer eitthvad K marki a stigum (badir klasar, CI utilokar 0)?"
         -> **NEI**. Hvert einasta glugga-delta inniheldur null, t.d.
         n=4-6 STIG d=+0,0054 CI [-0,0016, +0,0137].
       · Med markadslinu eru K=0/10/20/inf oadgreinanleg (0,3929-0,3945).
     Til samanburdar var sjounda threpid hafnad vid +0,00085 og
     "sleppa oheppnis-lidnum" vid P=74%. +0,0003 er langt undir theim bar.
     **K=10 STENDUR** — og er nu vardad, thvi tala sem enginn ver er tala
     sem einhver breytir.
     ============================================================ */
  ok(PREV_K === 10,
     `\`PREV_K\` er 10 (${PREV_K}) — endurmaelt 24.8.2026, besta K a ristinni `
     + "gaf +0,0003 og ekkert K nadi marki a stigum");
  /* OG FORMID: vogin verdur ad FALLA med fleiri leikjum — annars er
     "blondun" ekki blondun heldur fasti.                               */
  ok(prevWeight(0) === 1 && prevWeight(10) === 0.5 && prevWeight(30) < prevWeight(10),
     `vogin fellur: n=0 -> ${prevWeight(0)}, n=10 -> ${prevWeight(10)}, `
     + `n=30 -> ${prevWeight(30).toFixed(3)}`);
  ok(DIFF_W[1].sot > 0 && DIFF_W[2].sot > 0,
     `GK/DEF bera \`sot > 0\` (${DIFF_W[1].sot}/${DIFF_W[2].sot}) — thess vegna BITUR `
     + "vordurinn her ad ofan");
}

console.log(`\nFORM-BLANDA: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
