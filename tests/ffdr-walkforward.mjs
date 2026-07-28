/* ============================================================
   FFDR WALK-FORWARD — 8 TÍMABIL, FULL INNTÖK

   HVERS VEGNA ÞETTA TIL VIÐBÓTAR VIÐ ffdr-backtest.mjs:
   Það bakpróf svarar "halda LITIRNIR?" á einu tímabili (2025/26) og
   gerir það vel. En það hefur þrjú göt sem eru öll mæld hér:

     1. EITT TÍMABIL = 760 lið-leikir. Staðalfrávik á CS-hlutfalli per
        þrep er ~4pp, svo miðþrepin geta víxlast af hreinu suði. Hér eru
        ÁTTA tímabil (1819–2526) hvert spáð með styrk fyrra tímabils
        eingöngu -> 6.080 lið-leikir og r per tímabil, svo við sjáum
        hvort 2025/26 var dæmigert eða heppni.

     2. MARKAÐSLIÐURINN VAR ALDREI MÆLDUR. ffdr-backtest.mjs sendir
        `odds: null`, en mkt-vogin er 0,50 fyrir GK/DEF og 0,35 fyrir
        MID/FWD — um helmingur af þyngd varnarmanns. Hér er línan
        endurbyggð úr B365-oddsum allra tímabila með SÖMU umbreytingu
        sem pipeline notar (src/market.js), svo það sem er mælt er
        FFDR eins og notandinn sér hana, ekki skert útgáfa.

     3. SÓKNARHÓPURINN (MID/FWD, pos 3/4) VAR ALDREI BAKPRÓFAÐUR.
        Hann er önnur formúlan af tveimur (useDef:false, elo-vog 0,15)
        og hafði ekkert próf gegn raunverulegum úrslitum. Hér er hann
        mældur gegn mörkum SKORUÐUM.

   SPURNINGARNAR SEM ÞETTA SVARAR:
     A. Er FFDR betri en hrátt FDR? (yfir 8 tímabil, ekki 1)
     B. Er FFDR betri en BÓKMAKARALÍNAN EIN? Það er raunverulega
        samkeppnin: ef samsetningin slær ekki sitt besta inntak er
        hún flækja án ábata. Þetta hefur aldrei verið mælt.
     C. Er MEASURED-taflan rétt KVÖRÐUÐ (spáð CS% == raun CS%) eða
        aðeins rétt RAÐAÐ?
     D. Virkar sóknarhliðin?

   ENGINN LEKI: styrkur alltaf úr fyrra tímabili, Elo aðeins úr leikjum
   sem búnir voru, bókmakaralínan er fyrir-leik. Sjá tests/lib/e0.mjs.
   ============================================================ */
import { readFileSync } from "node:fs";
import {
  SEASONS, loadSeason, buildStrength, PROMO_DEFAULT, fdrFor,
  marketForRow, eloWalkForward, corr, rSE, brier,
} from "./lib/e0.mjs";
import { makeFixDifficulty, lookupPos, lookupMeasured, tierOf, TIER_NAME, toMeasuredScale } from "../src/model.js";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const pct = x => (x == null ? "  —  " : (100 * x).toFixed(1).padStart(5));

/* ---------- 1. Byggja heiminn ---------- */
const loaded = SEASONS.map(key => ({ key, rows: loadSeason(key) }));
const eloPre = eloWalkForward(loaded);
const byKey = Object.fromEntries(loaded.map(s => [s.key, s.rows]));

/* Spá-tímabilin: allt nema fyrsta (það hefur ekkert tímabil á undan) */
const PRED = SEASONS.slice(1);

const all = [];            // ein röð per lið-leik
const fdrSrc = {};         // tímabil -> "opinbert" | "nálgað"
let noMarket = 0;

for (let si = 1; si < SEASONS.length; si++) {
  const key = SEASONS[si], prevKey = SEASONS[si - 1];
  const rows = byKey[key], prevRows = byKey[prevKey];
  const strength = buildStrength(prevRows);
  /* OPINBERT FPL-FDR þegar það er til (1819+, data/fpl_fdr_history.json),
     annars nálgun. Appið notar opinbera talan, svo bakprófið verður að
     gera það líka — annars mælir það annan heim en appið keyrir í.     */
  const FDR = fdrFor(key, prevRows);
  fdrSrc[key] = FDR.source;

  const teams = [...new Set(rows.flatMap(r => [r.HomeTeam, r.AwayTeam]))];
  const promoted = teams.filter(t => !strength[t]);
  for (const t of promoted) strength[t] = { ...PROMO_DEFAULT };

  const ids = {}; let next = 1;
  for (const t of teams) ids[t] = next++;
  const teamMetrics = {}, teamById = {}, eloByTeam = {};
  for (const t of teams) { teamMetrics[ids[t]] = strength[t]; teamById[ids[t]] = { short: t }; }

  rows.forEach((r, i) => {
    const H = ids[r.HomeTeam], A = ids[r.AwayTeam];
    const e = eloPre.get(`${key}|${i}`);
    eloByTeam[H] = { elo: e.h };
    eloByTeam[A] = { elo: e.a };

    const mk = marketForRow(r);
    if (!mk) noMarket++;
    /* ODDS-KORTIÐ EINS OG APPIÐ HEFUR ÞAÐ: aðeins leikurinn sem er í
       vændum, með opp+kickoff til staðfestingar (model.js krefst þess). */
    const kickoff = `${r.Date}T00:00:00Z`;
    /* FULL odds-röð eins og pipeline skrifar hana: xga OG xg, svo
       model.js velji rétta stærð per hóp sjálft.                     */
    const odds = mk ? {
      [r.HomeTeam]: { xga: mk.axg, xg: mk.hxg, opp: r.AwayTeam, kickoff },
      [r.AwayTeam]: { xga: mk.hxg, xg: mk.axg, opp: r.HomeTeam, kickoff },
    } : null;
    /* GAMLA HEGÐUNIN til samanburðar: aðeins varnarstærðin, sem allar
       stöður fengu áður (ekkert xg -> model.js fellur á defDiff).     */
    const oddsWrong = mk ? {
      [r.HomeTeam]: { diff: mk.hDiff, opp: r.AwayTeam, kickoff },
      [r.AwayTeam]: { diff: mk.aDiff, opp: r.HomeTeam, kickoff },
    } : null;

    const withMkt = makeFixDifficulty({ teamMetrics, teamById, odds, eloByTeam });
    const wrongMkt = makeFixDifficulty({ teamMetrics, teamById, odds: oddsWrong, eloByTeam });
    const noMkt = makeFixDifficulty({ teamMetrics, teamById, odds: null, eloByTeam });

    const hg = +r.FTHG, ag = +r.FTAG;
    const fdrPair = FDR.forFixture(r.HomeTeam, r.AwayTeam);
    for (const [team, oppTeam, home, gf, ga, mDiff, fdrVal] of [
      [r.HomeTeam, r.AwayTeam, true, hg, ag, mk?.hDiff, fdrPair.h],
      [r.AwayTeam, r.HomeTeam, false, ag, hg, mk?.aDiff, fdrPair.a],
    ]) {
      const me = ids[team], op = ids[oppTeam];
      const fx = { opp: op, home, fdr: fdrVal, kickoff };
      all.push({
        season: key, team, promoted: promoted.includes(team),
        dDef: withMkt(me, fx, 2),            // GK/DEF-hópurinn, full inntök
        dAtt: withMkt(me, fx, 4),            // MID/FWD-hópurinn, full inntök
        dAttWrongMkt: wrongMkt(me, fx, 4),   // sókn með VARNAR-stærðinni (gamla hegðunin)
        dDefNoMkt: noMkt(me, fx, 2),         // sama án markaðar (gamla bakprófið)
        fdr: fx.fdr, realFdr: fdrPair.real,
        mDiff: mDiff ?? null,
        cs: ga === 0, ga, gf,
      });
    }
  });
}

console.log(`\nSpá-tímabil: ${PRED.join(", ")}  ·  ${all.length} lið-leikir`);
console.log(`Bókmakaralína endurbyggð fyrir ${all.length - noMarket * 2}/${all.length} raðir` +
  (noMarket ? ` (${noMarket} leikir án nýtilegrar línu)` : " (allir leikir)"));
ok(all.length === PRED.length * 760, `${PRED.length} tímabil × 760 = ${all.length} lið-leikir`);
ok(all.every(x => x.dDef >= 1 && x.dDef <= 5 && x.dAtt >= 1 && x.dAtt <= 5),
  "öll FFDR-gildi (vörn OG sókn) innan 1–5");
ok(noMarket === 0, `markaðslína til fyrir alla ${PRED.length * 380} leiki (vantaði ${noMarket})`);

/* ---------- 2. A + B: FFDR gegn sínum eigin inntökum ----------
   Þetta er kjarnaprófið. Ef samsetningin slær ekki besta inntakið sitt
   er hún flækja án ábata — og það á að koma í ljós hér, ekki í notkun. */
console.log("\n=== A/B. SPÁKRAFTUR Á MÖRK Á SIG (n=" + all.length + ") ===");
const ga = all.map(x => x.ga);
const cands = [
  ["FFDR (full inntök)",     all.map(x => x.dDef)],
  ["FFDR án markaðar",       all.map(x => x.dDefNoMkt)],
  ["markaðslínan EIN",       all.map(x => x.mDiff)],
  ["hrátt FDR eitt",         all.map(x => x.fdr)],
];
const rs = {};
for (const [name, xs] of cands) {
  rs[name] = corr(xs, ga);
  console.log(`  ${name.padEnd(22)} r = ${rs[name].toFixed(3)}`);
}
const se = rSE(all.length);
console.log(`  (staðalfrávik á r við þetta úrtak: ±${se.toFixed(3)})`);

ok(rs["FFDR (full inntök)"] > 0.15,
  `FFDR spáir mörkum á sig yfir 8 tímabil (r=${rs["FFDR (full inntök)"].toFixed(3)})`);
ok(rs["FFDR (full inntök)"] > rs["hrátt FDR eitt"] + 2 * se,
  `FFDR slær hrátt FDR MARKTÆKT (${rs["FFDR (full inntök)"].toFixed(3)} vs ${rs["hrátt FDR eitt"].toFixed(3)}, >2σ)`);
ok(rs["FFDR (full inntök)"] > rs["FFDR án markaðar"],
  `markaðsliðurinn bætir FFDR (${rs["FFDR (full inntök)"].toFixed(3)} vs ${rs["FFDR án markaðar"].toFixed(3)}) — hann er réttlættur`);

/* SPURNING B — sú óþægilega. Við gerum hana að UPPLÝSINGU ef FFDR er
   innan suðs frá markaðnum, en að FALLI ef markaðurinn slær FFDR
   MARKTÆKT: þá er samsetningin að skemma sitt besta inntak.          */
const dMkt = rs["FFDR (full inntök)"] - rs["markaðslínan EIN"];
console.log(`\n  FFDR − markaður = ${dMkt >= 0 ? "+" : ""}${dMkt.toFixed(3)} (±${se.toFixed(3)})`);
ok(dMkt > -2 * se,
  `samsetningin skemmir ekki markaðslínuna (${dMkt >= 0 ? "+" : ""}${dMkt.toFixed(3)} > −${(2*se).toFixed(3)})`);

/* ---------- 3. STÖÐUGLEIKI PER TÍMABIL ----------
   Eitt tímabil getur alltaf verið heppni. Krafan er að merkið sé til
   í HVERJU tímabili, ekki aðeins í meðaltalinu.                       */
console.log("\n=== STÖÐUGLEIKI: r per tímabil (mörk á sig) ===");
console.log("tímabil   FFDR    markaður  FDR     CS% raun");
const perSeason = PRED.map(key => {
  const g = all.filter(x => x.season === key);
  const r1 = corr(g.map(x => x.dDef), g.map(x => x.ga));
  const r2 = corr(g.map(x => x.mDiff), g.map(x => x.ga));
  const r3 = corr(g.map(x => x.fdr), g.map(x => x.ga));
  const cs = g.filter(x => x.cs).length / g.length;
  console.log(`  ${key}    ${r1.toFixed(3)}   ${r2.toFixed(3)}    ${r3.toFixed(3)}   ${pct(cs)}%`);
  return { key, r1, r2, r3, cs };
});
ok(perSeason.every(s => s.r1 > 0.10),
  `FFDR hefur merki í ÖLLUM ${PRED.length} tímabilum (lægst r=${Math.min(...perSeason.map(s=>s.r1)).toFixed(3)})`);
ok(perSeason.filter(s => s.r1 > s.r3).length >= PRED.length - 1,
  `FFDR slær hrátt FDR í ≥${PRED.length-1}/${PRED.length} tímabilum (${perSeason.filter(s=>s.r1>s.r3).length})`);

/* ---------- 4. C: KVÖRÐUN — er spáð CS% RÉTT, ekki bara rétt raðað? ----------
   Spjöldin birta CS% úr MEASURED_POS. Ef taflan er kerfisbundið of há
   birtist of bjartsýn tala á hverju korti. Þetta er önnur spurning en
   einrænni og hefur ekki verið mæld á 8 tímabilum.                    */
console.log("\n=== C. KVÖRÐUN MEASURED-TÖFLUNNAR (DEF, pos 2) ===");
console.log("tíund   n     FFDR-bil      spáð CS%  raun CS%  frávik");
const sorted = [...all].sort((a, b) => a.dDef - b.dDef);
const NB = 10;
const calib = [];
for (let i = 0; i < NB; i++) {
  const g = sorted.slice(Math.floor(i * sorted.length / NB), Math.floor((i + 1) * sorted.length / NB));
  const predCs = g.reduce((a, x) => a + lookupPos(2, "cs", x.dDef), 0) / g.length;
  const realCs = 100 * g.filter(x => x.cs).length / g.length;
  const sd = 100 * Math.sqrt((realCs / 100) * (1 - realCs / 100) / g.length);
  const lo = g[0].dDef, hi = g[g.length - 1].dDef;
  console.log(`  ${String(i + 1).padStart(2)}   ${String(g.length).padStart(4)}  ` +
    `${lo.toFixed(2)}–${hi.toFixed(2)}     ${predCs.toFixed(1).padStart(5)}%   ` +
    `${realCs.toFixed(1).padStart(5)}% (±${sd.toFixed(1)})  ${(realCs - predCs >= 0 ? "+" : "") + (realCs - predCs).toFixed(1)}pp`);
  calib.push({ predCs, realCs, sd, n: g.length });
}
const bias = calib.reduce((a, c) => a + (c.realCs - c.predCs), 0) / NB;
const mae = calib.reduce((a, c) => a + Math.abs(c.realCs - c.predCs), 0) / NB;
console.log(`\n  Kerfisbundinn halli: ${bias >= 0 ? "+" : ""}${bias.toFixed(1)}pp  ·  meðalfrávik: ${mae.toFixed(1)}pp`);
ok(Math.abs(bias) <= 5, `MEASURED-taflan er ekki kerfisbundið skekkt (${bias >= 0 ? "+" : ""}${bias.toFixed(1)}pp, ≤5pp)`);
ok(mae <= 6, `meðalfrávik spáðs CS% frá raun ≤6pp (${mae.toFixed(1)}pp)`);
ok(corr(calib.map(c => c.predCs), calib.map(c => c.realCs)) > 0.9,
  `spáð og raunverulegt CS% fylgjast (r=${corr(calib.map(c=>c.predCs), calib.map(c=>c.realCs)).toFixed(2)})`);

/* Brier — hörð tala á hvort CS-spáin sé nýtileg yfirleitt */
const csY = all.map(x => x.cs ? 1 : 0);
const base = csY.reduce((a, b) => a + b, 0) / csY.length;
const bFfdr = brier(all.map(x => lookupPos(2, "cs", x.dDef) / 100), csY);
const bBase = brier(csY.map(() => base), csY);
/* FDR-grunnlínan verður að fara gegnum SCALE_FIX líka, annars er hún
   lesin á öðrum kvarða en FFDR og samanburðurinn ósanngjarn. */
const bFdr = brier(all.map(x => lookupMeasured("cs", toMeasuredScale(x.fdr, true)) / 100), csY);
console.log(`\n  Brier: FFDR ${bFfdr.toFixed(4)} · grunnhlutfall ${bBase.toFixed(4)} · FDR-taflan ${bFdr.toFixed(4)}`);
console.log(`  Brier skill gegn grunnhlutfalli: ${(100 * (1 - bFfdr / bBase)).toFixed(1)}%`);
ok(bFfdr < bBase, `FFDR-CS-spáin slær það að spá alltaf meðaltalinu (${bFfdr.toFixed(4)} < ${bBase.toFixed(4)})`);

/* ---------- 5. D: SÓKNARHLIÐIN (pos 4) gegn mörkum SKORUÐUM ---------- */
console.log("\n=== D. SÓKNARHÓPURINN (MID/FWD) GEGN MÖRKUM SKORUÐUM ===");
const rAtt = corr(all.map(x => x.dAtt), all.map(x => x.gf));
const rAttFdr = corr(all.map(x => x.fdr), all.map(x => x.gf));
console.log(`  FFDR-sókn vs mörk skoruð:  r = ${rAtt.toFixed(3)}   (hrátt FDR: ${rAttFdr.toFixed(3)})`);
ok(rAtt < -0.15, `léttari sóknar-FFDR => FLEIRI mörk skoruð (r=${rAtt.toFixed(3)}, á að vera neikvætt)`);
ok(rAtt < rAttFdr, `sóknar-FFDR slær hrátt FDR (${rAtt.toFixed(3)} < ${rAttFdr.toFixed(3)})`);

/* VÖRÐUR: RÉTT MARKAÐSSTÆRÐ FYRIR SÓKN.
   Sóknarhópurinn fékk marketDiff(xga) — þyngd HREINS BLAÐS — í staðinn
   fyrir eigin vænt mörk. Þetta próf fellur ef nokkur snýr því til baka. */
const rAttWrong = corr(all.map(x => x.dAttWrongMkt), all.map(x => x.gf));
console.log(`  með RANGRI markaðsstærð (xga): r = ${rAttWrong.toFixed(3)}` +
  `  ->  rétta stærðin bætir ${Math.abs(rAtt - rAttWrong).toFixed(3)}`);
const winsAtt = PRED.filter(k => {
  const g = all.filter(x => x.season === k);
  return corr(g.map(x => x.dAtt), g.map(x => x.gf)) < corr(g.map(x => x.dAttWrongMkt), g.map(x => x.gf));
}).length;
ok(rAtt < rAttWrong,
  `eigin vænt mörk (xg) slá þyngd hreins blaðs (xga) fyrir sókn (${rAtt.toFixed(3)} < ${rAttWrong.toFixed(3)})`);
ok(winsAtt >= PRED.length - 1,
  `og gera það í ≥${PRED.length - 1}/${PRED.length} tímabilum (${winsAtt})`);

console.log("\nsextíll  n     dAtt-bil     mörk skoruð/leik");
const sa = [...all].sort((a, b) => a.dAtt - b.dAtt);
const attBins = [0, 1, 2, 3, 4, 5].map(i => {
  const g = sa.slice(Math.floor(i * sa.length / 6), Math.floor((i + 1) * sa.length / 6));
  const gf = g.reduce((a, x) => a + x.gf, 0) / g.length;
  console.log(`  ${i + 1}     ${String(g.length).padStart(4)}  ${g[0].dAtt.toFixed(2)}–${g[g.length-1].dAtt.toFixed(2)}    ${gf.toFixed(2)}`);
  return gf;
});
ok(attBins.every((v, i) => i === 0 || v <= attBins[i - 1] + 0.06),
  "mörk skoruð falla einrænt með þyngri sóknar-FFDR (±0,06 suð)");
ok(attBins[0] - attBins[5] >= 0.5,
  `léttasti sjöttungur skorar afgerandi meira: ${attBins[0].toFixed(2)} á móti ${attBins[5].toFixed(2)} mörk/leik`);

/* ---------- 6. LITAÞREPIN á 8 tímabilum (styrking á ffdr-backtest) ---------- */
/* ATH DREIFINGUNA: hér hefur HVER leikur markaðslínu, svo öll d liggja á
   markaðskvarðanum (meðaltal ~2,4). TIER_CUTS eru sextílar af RAUNDREIFINGU
   appsins, þar sem aðeins næsta umferð hefur línu — því lendir margfalt
   fleira í dökkgrænu hér en í appinu. Það er eiginleiki bakprófs-heimsins,
   ekki kvörðunarvilla; einrænnin er það sem er prófað, ekki hlutföllin.  */
console.log("\n=== LITAÞREP Á 8 TÍMABILUM (þekkt lið, full inntök) ===");
const known = all.filter(x => !x.promoted);
console.log("þrep         n      CS% raun (±suð)  mörk á sig");
const tiers = [0, 1, 2, 3, 4, 5].map(t => {
  const g = known.filter(x => tierOf(x.dDef) === t);
  if (!g.length) { console.log(`${TIER_NAME[t].padEnd(11)}     0        —`); return null; }
  const cs = 100 * g.filter(x => x.cs).length / g.length;
  const sd = 100 * Math.sqrt((cs / 100) * (1 - cs / 100) / g.length);
  const gaAvg = g.reduce((a, x) => a + x.ga, 0) / g.length;
  console.log(`${TIER_NAME[t].padEnd(11)} ${String(g.length).padStart(5)}   ${cs.toFixed(1).padStart(5)}% (±${sd.toFixed(1)})     ${gaAvg.toFixed(2)}`);
  return { t, cs, sd, ga: gaAvg, n: g.length };
}).filter(Boolean);
/* Með 6.080 lið-leikjum er suðið ~1,5pp per þrep — hér má KREFJAST
   einrænni án örlætis, ólíkt eins-tímabils prófinu.                  */
ok(tiers.every((b, i) => i === 0 || b.cs <= tiers[i - 1].cs + 1.0),
  "CS% fellur einrænt yfir öll þrep (þröng vikmörk, 8 tímabil)");
ok(tiers.every((b, i) => i === 0 || b.ga >= tiers[i - 1].ga - 0.05),
  "mörk á sig hækka einrænt yfir öll þrep");
ok(tiers[0].cs - tiers[tiers.length - 1].cs >= 20,
  `endarnir skildir að ≥20pp: ${tiers[0].cs.toFixed(0)}% á móti ${tiers[tiers.length-1].cs.toFixed(0)}%`);

/* ---------- 7. MARKAÐSKVÖRÐUNIN (MARKET_CALIB=0,959) ----------
   Sú tala var mæld á 380 leikjum. Heldur hún á 3.040?               */
const mkRows = all.filter(x => x.mDiff != null);
const impliedGa = mkRows.map(x => (x.mDiff - 1.0) / 1.55 + 0.5);   // andhverfa marketDiff
const mMean = impliedGa.reduce((a, b) => a + b, 0) / impliedGa.length;
const aMean = mkRows.reduce((a, x) => a + x.ga, 0) / mkRows.length;
console.log(`\n=== MARKAÐSKVÖRÐUN (MARKET_CALIB=0,959 var mælt á 380 leikjum) ===`);
console.log(`  vænt mörk á sig skv. línu: ${mMean.toFixed(3)}  ·  raun: ${aMean.toFixed(3)}  ·  ` +
  `halli ${((mMean / aMean - 1) * 100 >= 0 ? "+" : "") + ((mMean / aMean - 1) * 100).toFixed(1)}%`);
ok(Math.abs(mMean / aMean - 1) < 0.06,
  `markaðslínan er rétt kvörðuð innan 6% á ${mkRows.length} lið-leikjum (${((mMean/aMean-1)*100).toFixed(1)}%)`);

/* ---------- 8. VÖRÐUR: FDR-NÁLGUNIN MÁ EKKI REKA FRÁ FPL ----------
   Öll kvörðunarmæling hér hvílir á því að nálgaða FDR-ið hafi sömu
   jaðardreifingu og FPL notar í raun. Gamla nálgunin var 0,25 þyngri og
   skekkti líkanskjarnann; ef hún rekur aftur eiga tölurnar hér að falla. */
const fplFdr = JSON.parse(readFileSync(new URL("../data/fixtures.json", import.meta.url).pathname, "utf8"))
  .flatMap(f => [f.team_h_difficulty, f.team_a_difficulty]).filter(Number.isFinite);
const fplMean = fplFdr.reduce((a, b) => a + b, 0) / fplFdr.length;
const apxMean = all.reduce((a, x) => a + x.fdr, 0) / all.length;
console.log(`\n=== VÖRÐUR: FDR-NÁLGUN GEGN RAUNVERULEGU FPL-FDR ===`);
console.log(`  FPL 2026/27: meðaltal ${fplMean.toFixed(3)}  ·  nálgun bakprófsins: ${apxMean.toFixed(3)}`);
ok(Math.abs(apxMean - fplMean) < 0.1,
  `nálgað FDR er innan 0,1 af FPL-meðaltali (${Math.abs(apxMean - fplMean).toFixed(3)})`);

/* ---------- 9. KVARÐASAMRÆMI — VÖRÐUR EFTIR SCALE_FIX ----------
   GALLINN SEM VAR: `fdr`, `own` og `elo` eru á "1–5 kvarða með miðju í 3"
   en MEASURED-töflurnar eru á kvarða þar sem meðalleikur er ~2,5. Leikir
   ÁN markaðslínu — þ.e. allar umferðir nema næsta — fengu því d sem var
   ~0,5 of þungt og birt CS% var 6,7pp of svartsýnt.

   SCALE_FIX (model.js) leiðréttir það með affinu falli sem var FITTAÐ
   gegn raunverulegum úrslitum. Þetta próf er vörðurinn: báðir
   d-framleiðendurnir — kjarninn OG markaðurinn — verða að láta töfluna
   lesa nálægt raunveruleikanum, og kjarninn má ekki reka aftur.       */
console.log("\n=== KVARÐASAMRÆMI EFTIR SCALE_FIX (vörður) ===");
/* MÆLT AÐEINS Á TÍMABILUM MEÐ OPINBERU FDR. Elstu tímabilin (1112-1718)
   nota NÁLGAÐ FDR, sem er ~0,25 þyngra en FPL notar; kjarninn verður þar
   kerfisbundið þyngri og kvarða-samanburðurinn mælir þá heim sem appið er
   EKKI í. SCALE_FIX var líka fittað á opinberu tímabilin, svo vörðurinn á
   að vera á sama úrtaki og fittið.                                      */
const scaleRows = all.filter(x => x.realFdr);
const meanCore = scaleRows.reduce((a, x) => a + x.dDefNoMkt, 0) / scaleRows.length;
const meanMkt = scaleRows.reduce((a, x) => a + x.mDiff, 0) / scaleRows.length;
const realCsAll = 100 * scaleRows.filter(x => x.cs).length / scaleRows.length;
const tblOnCore = scaleRows.reduce((a, x) => a + lookupPos(2, "cs", x.dDefNoMkt), 0) / scaleRows.length;
const tblOnMkt = scaleRows.reduce((a, x) => a + lookupPos(2, "cs", x.mDiff), 0) / scaleRows.length;
console.log(`  (aðeins ${scaleRows.length} raðir með OPINBERU FDR af ${all.length})`);
console.log(`  raunverulegt CS% (n=${scaleRows.length}): ${realCsAll.toFixed(1)}%`);
console.log(`  taflan á LÍKANSKJARNA  (meðal-d ${meanCore.toFixed(2)}): ` +
  `${tblOnCore.toFixed(1)}%  -> skekkja ${(tblOnCore - realCsAll >= 0 ? "+" : "") + (tblOnCore - realCsAll).toFixed(1)}pp`);
console.log(`  taflan á MARKAÐSKVARÐA (meðal-d ${meanMkt.toFixed(2)}): ` +
  `${tblOnMkt.toFixed(1)}%  -> skekkja ${(tblOnMkt - realCsAll >= 0 ? "+" : "") + (tblOnMkt - realCsAll).toFixed(1)}pp`);
ok(Math.abs(tblOnCore - realCsAll) <= 3,
  `kjarninn lætur töfluna lesa rétt innan 3pp (${Math.abs(tblOnCore - realCsAll).toFixed(1)}pp — var 6,7pp fyrir SCALE_FIX)`);
/* Kvarðarnir tveir verða að vera SAMBÆRILEGIR, annars litast næsta umferð
   öðrum lit en seinni umferðir án að vera léttari. */
ok(Math.abs(tblOnCore - tblOnMkt) <= 4,
  `kjarni og markaður á sama kvarða innan 4pp (${Math.abs(tblOnCore - tblOnMkt).toFixed(1)}pp) — engin litastökk milli umferða`);
/* EFTIRSTÖÐVAR: marketDiff sjálf er ~2,4pp of bjartsýn. Skjalað í
   model.js og CLAUDE.md; sér yfirferð. Þetta próf heldur því í skefjum. */
ok(Math.abs(tblOnMkt - realCsAll) <= 4,
  `markaðskvarðinn innan 4pp (${Math.abs(tblOnMkt - realCsAll).toFixed(1)}pp — þekktar eftirstöðvar)`);

console.log(`\nWALK-FORWARD: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
