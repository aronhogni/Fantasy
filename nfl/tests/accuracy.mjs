/* ============================================================
   nfl-accuracy.mjs — ver MAELINGUNA sjalfa.

   KAFLI 3 ER PROFSTEINNINN og hann er hér af sömu astaedu og
   spegilprofið i `rotation.mjs` i FPL-verkefninu: hermun sem er
   ekki naem fyrir GAEDUM bords er ekki maeling heldur skraut sem
   framleidir sannfaerandi tolur.

   Hermunin FELLDI THETTA PROF i fyrstu utgafu. Tha var stodu-thak
   adeins lagt a OKKAR lid en ekki motherjana, og afleidingin var ad
   fullkomid bord (raunveruleg lokarod) TAPADI stundum fyrir
   samsteypunni — thvi thad draftadi thrja leikstjornendur sem enginn
   getur stillt upp. Profid er nakvaemlega thad sem greip thad.
   ============================================================ */

import {
  spearman, topMae, positionHitRate, simulateDraft, simulateAllSlots,
  startersPoints, startersRaw, weekPoints, scoreBoard, rankExperts,
  roundRobin, leagueRecords, playoffChampion, simulateSeason, scoreLeague,
  DEFAULT_LEAGUE,
} from "../src/accuracy.js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const DATA = path.join(path.resolve(new URL(".", import.meta.url).pathname, ".."), "data");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const near = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m} (${a} ~ ${b})`);

/* ---------- tilbuinn heimur ----------
   200 leikmenn med THEKKTA lokarod. Thad thydir ad "fullkomid bord"
   er skilgreint og haegt er ad bera allt vid thad.                 */
function world(seed = 1) {
  let a = seed >>> 0;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const actual = new Map();
  const POS = ["RB", "RB", "WR", "WR", "WR", "QB", "TE"];
  const list = [];
  for (let i = 0; i < 220; i++) {
    const pos = POS[i % POS.length];
    /* Stig falla med rod en med havada — annars vaeri hvert bord sem
       radar rett fullkomid og profid einskis virdi. */
    const pts = Math.max(10, 340 - i * 1.4 + (rnd() - 0.5) * 40);
    list.push({ key: `p${i}`, pos, pts });
  }
  list.sort((x, y) => y.pts - x.pts);
  list.forEach((p, i) => { p.overallRank = i + 1; });
  const byPos = {};
  for (const p of list) {
    (byPos[p.pos] = byPos[p.pos] || []).push(p);
  }
  for (const l of Object.values(byPos)) l.forEach((p, i) => { p.posRank = i + 1; });
  for (const p of list) actual.set(p.key, p);
  return { actual, list };
}

const boardFrom = (keys) => new Map(keys.map((k, i) => [k, i + 1]));

/* ---------- 1. FYLGNI OG VILLA ---------- */
console.log("\n1. fylgni og villa");
{
  const perfect = [1, 2, 3, 4, 5].map((x) => ({ pred: x, actual: x }));
  near(spearman(perfect), 1, 1e-9, "fullkomin rod gefur rho = 1");
  const reversed = [1, 2, 3, 4, 5].map((x, i) => ({ pred: x, actual: 5 - i }));
  near(spearman(reversed), -1, 1e-9, "ofug rod gefur rho = -1");
  ok(spearman([{ pred: 1, actual: 1 }]) === null, "of litid urtak gefur null");

  /* Jafntefli fa MEDALROD. An thess skekkist rho um leid og tveir
     leikmenn eru med somu stig — sem gerist i hverri viku. */
  const ties = [{ pred: 1, actual: 5 }, { pred: 2, actual: 5 },
                { pred: 3, actual: 5 }, { pred: 4, actual: 1 }];
  ok(spearman(ties) !== null && Number.isFinite(spearman(ties)),
    "jafntefli fella ekki utreikninginn");

  const pairs = [{ pred: 1, actual: 11 }, { pred: 2, actual: 12 },
                 { pred: 3, actual: 13 }, { pred: 4, actual: 14 },
                 { pred: 5, actual: 15 }, { pred: 300, actual: 1 }];
  near(topMae(pairs, 50), 10, 0.01,
    "MAE-50 telur ADEINS efstu 50 — sæti 300 dregur hana ekki upp");
}

/* ---------- 2. HITTNI ---------- */
console.log("\n2. hittni a stodu");
{
  /* LAUGIN VERDUR AD VERA STAERRI EN N. Med nakvaemlega 24 i laug og
     topp-24 er hittnin 1,000 hvad sem bordid gerir — sem er ekki
     maeling heldur talning a lengd listans. */
  const p = [];
  for (let i = 1; i <= 48; i++) p.push({ key: `k${i}`, pred: i, actual: i, pos: "RB" });
  near(positionHitRate(p, "RB", 24), 1, 1e-9, "fullkomid bord hittir 100%");

  /* Efstu 12 rettir, naestu 12 rangir (falla nidur fyrir saeti 24). */
  const shifted = p.map((x, i) => ({
    ...x, actual: i < 12 ? x.actual : (i < 24 ? x.actual + 24 : x.actual - 12),
  }));
  near(positionHitRate(shifted, "RB", 24), 0.5, 1e-9,
    "helmingurinn rettur gefur 50%");

  const thin = [];
  for (let i = 1; i <= 25; i++) thin.push({ key: `t${i}`, pred: i, actual: i, pos: "RB" });
  ok(positionHitRate(thin, "RB", 24) === null,
    "of grunn laug skilar null i stad falskra 100%");
}

/* ---------- 3. PROFSTEINNINN: BETRA BORD VERDUR AD VINNA ---------- */
console.log("\n3. PROFSTEINNINN — spegilprof a herminum");
{
  const { actual, list } = world(7);
  const field = boardFrom(list.map((p) => p.key));      // markadurinn = rett rod

  /* FULLKOMID BORD er nakvaemlega rett lokarod. Thad getur ekki
     tapad fyrir markadinum nema hermunin se biluð. */
  const perfect = boardFrom(list.map((p) => p.key));

  /* HANDAHOFSBORD — algjörlega tilviljanakennd rod. */
  const shuffled = list.slice();
  let a = 99;
  const rnd = () => { a = (a * 1103515245 + 12345) >>> 0; return a / 4294967296; };
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const random = boardFrom(shuffled.map((p) => p.key));

  const sPerfect = simulateAllSlots({ board: perfect, fieldBoard: field, actual });
  const sRandom = simulateAllSlots({ board: random, fieldBoard: field, actual });

  console.log(`     fullkomid ${sPerfect.mean}  ·  handahof ${sRandom.mean}`);
  ok(sPerfect.mean > sRandom.mean,
    `fullkomid bord slaer handahof (${sPerfect.mean} > ${sRandom.mean})`);

  /* Munurinn verdur ad vera STAERRI EN HAVADINN milli saeta.
     Vaeri hann minni gaeti profid stadist fyrir tilviljun. */
  const se = sRandom.sd / Math.sqrt(sRandom.bySlot.length);
  ok(sPerfect.mean - sRandom.mean > 4 * se,
    `og munurinn er > 4 stadalvillur (${(sPerfect.mean - sRandom.mean).toFixed(1)} > ${(4 * se).toFixed(1)})`);

  /* HALF-GOTT bord verdur ad lenda A MILLI. Thetta er thad sem
     greinir maelingu fra tvistoduprofi: hun verdur ad rada gaedum
     i rettri ROD, ekki bara greina svart fra hvitu. */
  const half = list.slice();
  for (let i = 0; i < half.length; i += 2) {
    const j = Math.min(half.length - 1, i + 1 + Math.floor(rnd() * 20));
    [half[i], half[j]] = [half[j], half[i]];
  }
  const sHalf = simulateAllSlots({ board: boardFrom(half.map((p) => p.key)),
    fieldBoard: field, actual });
  console.log(`     halfgott ${sHalf.mean}`);
  ok(sHalf.mean < sPerfect.mean && sHalf.mean > sRandom.mean,
    `halfgott bord lendir a milli (${sRandom.mean} < ${sHalf.mean} < ${sPerfect.mean})`);
}

/* ---------- 4. ALLIR DRAFTA EFTIR SOMU REGLUM ---------- */
console.log("\n4. samsteypan er rett nulllina");
{
  const { actual, list } = world(3);
  const field = boardFrom(list.map((p) => p.key));

  /* Bord SEM ER MARKADURINN a ad fa nakvaemlega markadsutkomuna.
     Ef stodu-thak gilti adeins um okkur vaeri thetta ekki satt —
     vid myndum vikja af bordinu thegar hinir gera thad ekki, og
     samsteypan vaeri ROMMUD sem laklegt bord. Thad var villan. */
  const s = simulateDraft({ board: field, fieldBoard: field, actual, slot: 3 });
  const roster = s.roster.map((k) => actual.get(k));
  const qbs = roster.filter((p) => p.pos === "QB").length;
  const tes = roster.filter((p) => p.pos === "TE").length;
  ok(qbs <= DEFAULT_LEAGUE.maxPos.QB,
    `stodu-thak heldur um okkar lid (${qbs} QB <= ${DEFAULT_LEAGUE.maxPos.QB})`);
  ok(tes <= DEFAULT_LEAGUE.maxPos.TE, `og um TE (${tes})`);

  /* Motherjarnir eru undir SOMU reglu. Thad sest a thvi ad thegar
     bordid er thad sama fyrir alla er utkoman a hverju saeti jofn
     og fyrirsjaanleg — enginn safnar 6 leikstjornendum. */
  const all = simulateAllSlots({ board: field, fieldBoard: field, actual });
  ok(all.sd < all.mean * 0.20,
    `dreifing milli saeta er hofleg thegar allir drafta eins (sd ${all.sd})`);

  ok(!roster.some((p) => DEFAULT_LEAGUE.excludePos.includes(p.pos)),
    "spyrnumenn og varnir eru utan hermunarinnar");
}

/* ---------- 5. BYRJUNARLIDS-STIG ---------- */
console.log("\n5. stig byrjunarlids");
{
  const actual = new Map([
    ["qb1", { pos: "QB", pts: 300 }], ["qb2", { pos: "QB", pts: 250 }],
    ["rb1", { pos: "RB", pts: 200 }], ["rb2", { pos: "RB", pts: 190 }],
    ["rb3", { pos: "RB", pts: 180 }],
    ["wr1", { pos: "WR", pts: 170 }], ["wr2", { pos: "WR", pts: 160 }],
    ["wr3", { pos: "WR", pts: 150 }], ["wr4", { pos: "WR", pts: 140 }],
    ["te1", { pos: "TE", pts: 100 }],
  ]);
  const roster = [...actual.keys()];
  const pts = startersPoints(roster, actual);
  /* QB1 300 + RB 200+190 + WR 170+160+150 + TE 100 + FLEX(besti
     afgangur = RB3 180) = 1450. QB2 er a bekknum og telur EKKI. */
  near(pts, 1450, 0.01, "byrjunarlid talid rett, bekkurinn ekki med");

  const withoutFlex = startersPoints(roster, actual,
    { ...DEFAULT_LEAGUE, starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 0 } });
  near(withoutFlex, 1270, 0.01, "an flex fellur besti afgangur ut");
}

/* ============================================================
   5b. VIKULEGA BYRJUNARLIDID — EIN UTFAERSLA, EKKI THRJAR
   ============================================================
   `weekly-lab.mjs` og `bye-lab.mjs` baru HVOR SITT afrit af thessari
   reglu, hardkodad a QB1/RB2/WR3/TE1/FLEX1. Bædi afritin voru rett en
   bædi voru BLIND a deildarlogun, svo 10-lida deild notandans med TVO
   FLEX var ekki vikulega maelanleg yfirleitt. Reglan var flutt i
   `startersRaw`/`weekPoints` 14.8.2026.

   PROFID BER HANA VID GOMLU REGLUNA ORDRETT. Vaeri hun aðeins profuð
   vid sjalfa sig gaeti hun rekið i sundur fra thvi sem `weekly_check_*`
   og `bye_*` a diskinum voru maeld med — og thaer tolur eru bokadar i
   README.                                                            */
console.log("\n5b. vikulegt byrjunarlid — ein utfaersla");
{
  /* GAMLA REGLAN, ordrett eins og hun stod i weekly-lab.mjs. */
  const legacyWeekPoints = (roster, byWeek, week) => {
    const by = { QB: [], RB: [], WR: [], TE: [] };
    for (const id of roster) {
      const w = byWeek.get(`${id}|${week}`);
      if (w && by[w.pos]) by[w.pos].push(w.pts);
    }
    for (const k in by) by[k].sort((a, b) => b - a);
    let sum = 0;
    const take = (pos, n) => { sum += by[pos].splice(0, n).reduce((a, b) => a + b, 0); };
    take("QB", 1); take("RB", 2); take("WR", 3); take("TE", 1);
    const flex = [...by.RB, ...by.WR, ...by.TE].sort((a, b) => b - a);
    if (flex.length) sum += flex[0];
    return sum;
  };
  let a = 4242;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  const POS = ["QB", "RB", "WR", "TE", "K"];
  const byWeek = new Map();
  const ids = [];
  for (let i = 0; i < 60; i++) {
    const id = `x${i}`, pos = POS[Math.floor(rnd() * POS.length)];
    ids.push(id);
    for (let w = 1; w <= 17; w++) {
      /* Sumar vikur vantar VILJANDI — thad er aud vika, og hun er
         nakvaemlega thad sem summan sér ekki. */
      if (rnd() < 0.12) continue;
      byWeek.set(`${id}|${w}`, { pos, pts: Math.round(rnd() * 400) / 10 });
    }
  }
  let mismatch = 0, checked = 0, sawNonZero = 0;
  const LG = { ...DEFAULT_LEAGUE, teams: 12, rounds: 14 };
  for (let trial = 0; trial < 200; trial++) {
    const roster = [];
    for (let i = 0; i < 14; i++) roster.push(ids[Math.floor(rnd() * ids.length)]);
    for (let w = 1; w <= 17; w++) {
      const x = legacyWeekPoints(roster, byWeek, w);
      const y = weekPoints(roster, byWeek, w, LG);
      checked++;
      if (x > 0) sawNonZero++;
      if (Math.abs(x - y) > 1e-9) mismatch++;
    }
  }
  /* THEKJA ER FULLYRDING: hefdi `byWeek` verid tomt vaeri "0 mismunir"
     satt og einskis virdi. */
  ok(sawNonZero > checked * 0.9,
    `${sawNonZero} af ${checked} vikum bera raunveruleg stig (annars profar thetta ekkert)`);
  ok(mismatch === 0,
    `sameinada utfaerslan er ORDRETT sama tala og gamla afritid (${checked} vikur)`);

  /* OG HUN LES DEILDINA. Gamla afritid gat thetta ekki.
     TVEIR OLIKIR THAETTIR eru profadir SITT I HVORU LAGI: fjoldi FLEX
     og fjoldi FASTRA saeta. Fyrsta utgafan profadi bara logun sem
     breytti BADUM, og stokkbreyting sem hardkodadi FOSTU saetin slapp
     thvi i gegn — FLEX-lidurinn einn dugdi til ad tolurnar skildu. */
  const wide = { ...DEFAULT_LEAGUE, teams: 10,
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 } };
  const wr2 = { ...DEFAULT_LEAGUE,
    starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 } };   // SAMA flex, faerri WR
  let differs = 0, differsFixed = 0;
  for (let trial = 0; trial < 60; trial++) {
    const roster = [];
    for (let i = 0; i < 15; i++) roster.push(ids[Math.floor(rnd() * ids.length)]);
    for (let w = 1; w <= 14; w++) {
      if (weekPoints(roster, byWeek, w, wide) !== weekPoints(roster, byWeek, w, LG)) differs++;
      if (weekPoints(roster, byWeek, w, wr2) !== weekPoints(roster, byWeek, w, LG)) differsFixed++;
    }
  }
  ok(differs > 0,
    `tveggja-FLEX logunin gefur ADRA tolu en WR3-lognin (${differs} vikur)`);
  ok(differsFixed > 0,
    `og WR2 gefur ADRA tolu en WR3 vid OBREYTT flex (${differsFixed} vikur) ` +
    "— annars vaeru fostu saetin hardkodud");

  /* `by` VELUR, `pts` TELUR. Thad er munurinn a "uppstillt med
     fullkominni vitneskju" og "uppstillt ur spa". */
  const two = new Map([
    ["a", { pos: "RB", pts: 5 }], ["b", { pos: "RB", pts: 30 }],
  ]);
  const one = { ...DEFAULT_LEAGUE, starters: { QB: 0, RB: 1, WR: 0, TE: 0, FLEX: 0 } };
  near(startersRaw(["a", "b"], (k) => two.get(k), one), 30, 1e-9,
    "an `by` er valid eftir stigum vikunnar");
  near(startersRaw(["a", "b"], (k) => ({ ...two.get(k), by: k === "a" ? 99 : 1 }), one),
    5, 1e-9, "med `by` velur spain — og STIGIN eru afram raunstigin");
}

/* ============================================================
   5c. DEILDIN — SKRA, STADA OG URSLITAKEPPNI
   ============================================================
   VIKULEG VIDUREIGN VAR OMAELD I OLLU VERKEFNINU. `h2h-lab.mjs` maelir
   hana og thessi kafli ver vélina sem hun stendur a. Nullprofid sjalft
   (bord gegn sjalfu ser -> nakvaemlega 50%) er I LABINU og er HLID thar;
   hér eru bygginga-fullyrdingarnar sem thad hlid getur ekki sed, thvi
   speglunin fellir tha ut.                                            */
console.log("\n5c. deildin — skra, stada, urslitakeppni");
{
  for (const teams of [8, 10, 12, 14]) {
    const sched = roundRobin(teams, 14, null);
    let bad = 0;
    ok(sched.length === 14, `${teams} lid: 14 umferdir`);
    for (const wk of sched) {
      const seen = new Set();
      if (wk.length !== teams / 2) bad++;
      for (const [a, b] of wk) {
        if (a === b || seen.has(a) || seen.has(b)) bad++;
        seen.add(a); seen.add(b);
      }
      if (seen.size !== teams) bad++;
    }
    ok(bad === 0, `${teams} lid: hver vika er FULLKOMIN porun (0 villur)`);
  }

  /* Skrain ma ekki vera sama umferdin 14 sinnum — tha vaeri hver deild
     ad spila sama leikinn allt timabilid. */
  const s12 = roundRobin(12, 14, null);
  const uniq = new Set(s12.map((wk) => JSON.stringify(wk)));
  ok(uniq.size >= 11, `12 lid: ${uniq.size} olikar umferdir af 14`);

  /* --- stada --- */
  {
    const teams = 4;
    const schedule = [[[1, 2], [3, 4]], [[1, 3], [2, 4]], [[1, 4], [2, 3]]];
    const scores = [null,
      [0, 100, 100, 100],       // lid 1 vinnur allt
      [0, 50, 90, 90],
      [0, 90, 50, 90],
      [0, 90, 90, 50]];
    const { rec, seeds } = leagueRecords({ scores, schedule });
    ok(rec[1].w === 3 && rec[1].l === 0, "lid 1 er 3-0");
    ok(seeds[0] === 1, "og er efst i rodun");
    const sw = rec.slice(1).reduce((a, x) => a + x.w, 0);
    const sl = rec.slice(1).reduce((a, x) => a + x.l, 0);
    ok(sw === sl, `sigrar (${sw}) = tôp (${sl}) — bokhaldid gengur upp`);
    ok(rec.slice(1).every((x) => x.w + x.l + x.t === 3), "hvert lid spilar 3 leiki");

    /* JAFNTEFLI ER JAFNTEFLI, og stig skera ur i rodun. */
    const tied = [null, [0, 100], [0, 100], [0, 80], [0, 60]];
    const one = [[[1, 2], [3, 4]]];
    const t2 = leagueRecords({ scores: tied, schedule: one });
    ok(t2.rec[1].t === 1 && t2.rec[2].t === 1, "jafnt skor -> jafntefli hja badum");
    ok(t2.rec[1].w === 0 && t2.rec[1].l === 0, "og hvorki sigur ne tap");
  }

  /* --- urslitakeppnin --- */
  {
    /* Saeti 1..6, og efra saetid skorar alltaf meira: efsta saetid
       VERDUR ad vinna. Falli thad er brackettid rangt tengt. */
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const scores = [null];
    for (let t = 1; t <= 8; t++) scores.push([0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 100 - t, 100 - t, 100 - t]);
    const po = playoffChampion({ seeds, scores, weeks: [15, 16, 17], size: 6 });
    ok(po.champion === 1, "efsta saetid vinnur thegar thad skorar mest");
    ok(po.rounds.length === 3, `thrjar umferdir (${po.rounds.length})`);
    ok(po.rounds[0].byes.length === 2, "saeti 1 og 2 sitja fyrstu vikuna");
    ok(po.rounds[0].pairs.some(([a, b]) => a === 3 && b === 6) &&
       po.rounds[0].pairs.some(([a, b]) => a === 4 && b === 5),
      "3v6 og 4v5 i fyrstu umferd");
    ok(!po.rounds.flatMap((r) => r.pairs).flat().includes(7),
      "saeti 7 kemst ekki i urslitakeppnina");

    /* ENDURRODUN: efsta saetid a ad maeta THVI LAEGSTA sem eftir er. */
    ok(po.rounds[1].pairs.some(([a, b]) => a === 1 && b === 4),
      "endurrodad i undanurslitum: 1 gegn laegsta saeti sem eftir er");

    /* SNUID VID: neðsta saetid skorar mest og VERDUR ad vinna. Vaeri
       niðurstadan alltaf saeti 1 vaeri brackettid ad lesa rodun en
       ekki stig. */
    const rev = [null];
    for (let t = 1; t <= 8; t++) rev.push([0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 90 + t, 90 + t, 90 + t]);
    ok(playoffChampion({ seeds, scores: rev, weeks: [15, 16, 17], size: 6 }).champion === 6,
      "sjotta saetid vinnur thegar THAD skorar mest");

    /* Fjogurra-lida bracket er tvaer umferdir, ekki thrjar. */
    const po4 = playoffChampion({ seeds, scores, weeks: [16, 17], size: 4 });
    ok(po4.rounds.length === 2, `fjogur lid -> tvaer umferdir (${po4.rounds.length})`);
    ok(po4.champion === 1, "og efsta saetid vinnur");
  }

  /* --- heil deild: draftid, vikurnar og titillinn hanga saman --- */
  {
    const { actual, list } = world(21);
    const byWeek = new Map();
    /* Vikustigin eru timabils-stigin deild a 17 med hávaða, svo betri
       leikmadur se raunverulega betri i vikutalningunni lika. */
    let a = 77;
    const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    for (const p of list) {
      for (let w = 1; w <= 17; w++) {
        byWeek.set(`${p.key}|${w}`, { pos: p.pos, pts: Math.max(0, p.pts / 17 * (0.4 + rnd() * 1.2)) });
      }
    }
    const league = { ...DEFAULT_LEAGUE, teams: 12, rounds: 14 };
    const field = boardFrom(list.map((p) => p.key));
    const schedule = roundRobin(12, 14, null);
    const boards = new Array(13).fill(field);
    const S = simulateSeason({ boards, fieldBoard: field, actual, byWeek,
      league, schedule, regWeeks: 14, playoffWeeks: [15, 16, 17], playoffTeams: 6 });
    ok(S.rec.slice(1).every((r) => r.w + r.l + r.t === 14),
      "hvert lid spilar nakvaemlega 14 leiki");
    ok(S.champion != null && S.champion >= 1 && S.champion <= 12,
      `nakvaemlega einn meistari (lid ${S.champion})`);
    ok(S.seeds.length === 12 && new Set(S.seeds).size === 12,
      "rodun ber oll lidin, hvert einu sinni");
    ok(S.rec.slice(1).every((r) => r.pf > 0), "hvert lid skorar stig");

    /* SAMA DEILD, ONNUR SKRA -> onnur rod, SOMU stig. Thad sannar ad
       skrain radi vidureignum en ekki hopum. */
    const S2 = scoreLeague({ rosters: S.rosters, byWeek, league,
      schedule: roundRobin(12, 14, (() => { let b = 5;
        return () => { b = (b * 1664525 + 1013904223) >>> 0; return b / 4294967296; }; })()),
      regWeeks: 14, playoffWeeks: [15, 16, 17], playoffTeams: 6 });
    const pf1 = S.rec.slice(1).map((r) => Math.round(r.pf * 100));
    const pf2 = S2.rec.slice(1).map((r) => Math.round(r.pf * 100));
    ok(JSON.stringify(pf1) === JSON.stringify(pf2),
      "onnur skra breytir ENGU um stigin sem lidin skora");
    ok(JSON.stringify(S.rec.slice(1).map((r) => r.w)) !==
       JSON.stringify(S2.rec.slice(1).map((r) => r.w)),
      "en hun breytir SIGRUNUM — annars vaeri skrain ekki i notkun");

    /* PER-SAETIS BORD OG AAETLANIR. `boards`/`plans` VERDA ad virka per
       saeti, annars getur h2h-labid ekki haft tvo arma i somu deild. */
    const only = new Array(13).fill(null);
    only[5] = [["QB"], ...Array(13).fill(null)];
    const S3 = simulateSeason({ boards, plans: only, fieldBoard: field, actual,
      byWeek, league, schedule, regWeeks: 14 });
    const qb5 = S3.rosters[5].map((k) => actual.get(k)).filter((p) => p.pos === "QB").length;
    const qb6 = S3.rosters[6].map((k) => actual.get(k)).filter((p) => p.pos === "QB").length;
    ok(actual.get(S3.rosters[5][0]).pos === "QB",
      "aaetlun saetis 5 thvingadi QB i 1. umferd");
    ok(qb5 >= 1 && actual.get(S3.rosters[6][0]).pos !== "QB",
      `og saeti 6 er OSNORTID (${qb6} QB, fyrsta val ${actual.get(S3.rosters[6][0]).pos})`);

    /* ============================================================
       NULL-EIGINLEIKI HERMISINS — SAMA BORD I BADUM ORMUM
       ============================================================
       `h2h-lab.mjs` hvilir a thessu og hefur thad sem HLID: se sama
       bordid sett i bada arma og fruman spegluð (medferd i saeti i og
       vidmid i j, sidan ofugt) VERDA sigrar, stig og titlar ad
       standast a UPP A NULL. Gerist thad ekki hallar herminn a arm og
       hver tala i labinu er merkingarlaus.

       ATH: thetta er nakvaemt AD BYGGINGU (spegillinn skiptir ormunum)
       og verndar thvi ARM-bokhaldid, ekki saetis-skekkju. Saetis-
       skekkjan er raunveruleg og STOR — hun er maeld i labinu (N3) og
       er einmitt astaedan fyrir spegluninni. Profid hér er ad ganga ur
       skugga um ad speglunin se raunverulega framkvaemd i vélinni sem
       labid kallar.                                                  */
    let dw = 0, dp = 0, dc = 0, cells = 0;
    for (let i = 1; i <= 12; i++) {
      const j = i % 12 + 1;
      let wT = 0, wC = 0, pT = 0, pC = 0, cT = 0, cC = 0;
      for (const swapArm of [false, true]) {
        const ti = swapArm ? j : i, ci = swapArm ? i : j;
        const b = new Array(13).fill(field);
        b[ti] = field; b[ci] = field;            // SAMA bordid i badum ormum
        const R = simulateSeason({ boards: b, fieldBoard: field, actual, byWeek,
          league, schedule, regWeeks: 14, playoffWeeks: [15, 16, 17], playoffTeams: 6 });
        wT += R.rec[ti].w + R.rec[ti].t / 2; wC += R.rec[ci].w + R.rec[ci].t / 2;
        pT += R.rec[ti].pf; pC += R.rec[ci].pf;
        cT += R.champion === ti ? 1 : 0; cC += R.champion === ci ? 1 : 0;
      }
      cells++;
      dw = Math.max(dw, Math.abs(wT - wC));
      dp = Math.max(dp, Math.abs(pT - pC));
      dc = Math.max(dc, Math.abs(cT - cC));
    }
    ok(cells === 12, `${cells} spegladar frumur profadar`);
    ok(dw === 0, `NULL: staersti munur a sigrum er ${dw} (verdur ad vera 0)`);
    ok(dp === 0, `NULL: staersti munur a stigum er ${dp}`);
    ok(dc === 0, `NULL: staersti munur a titlum er ${dc}`);
  }
}

/* ---------- 6. HEILDARMATID ---------- */
console.log("\n6. scoreBoard og rodun");
{
  const { actual, list } = world(11);
  const field = boardFrom(list.map((p) => p.key));
  const s = scoreBoard({ board: field, fieldBoard: field, actual });
  ok(s && s.draft && s.rho != null, "scoreBoard skilar ollum maelikvordum");
  ok(s.draft.bySlot.length === DEFAULT_LEAGUE.teams,
    `hermt fra ollum ${DEFAULT_LEAGUE.teams} saetum, ekki einu`);

  ok(scoreBoard({ board: new Map([["p1", 1]]), fieldBoard: field, actual }) === null,
    "of litid bord skilar null i stad tolu sem litur ut eins og maeling");

  const ranked = rankExperts([
    { id: "a", draft: { mean: 100, sd: 10, bySlot: [1, 2] } },
    { id: "b", draft: { mean: 120, sd: 10, bySlot: [1, 2] } },
  ]);
  ok(ranked[0].id === "b", "radad eftir hermuninni, haest fyrst");
  ok(ranked[0].gap === 0 && ranked[1].gap === -20,
    "`gap` syar hversu langt fra besta bordi — i stigum, ekki saetum");
  ok(ranked[0].se != null, "stadalvilla fylgir hverri rod");
}

/* ---------- 7. ENDURGERANLEIKI ---------- */
console.log("\n7. endurgeranleiki");
{
  const { actual, list } = world(5);
  const field = boardFrom(list.map((p) => p.key));
  const a = simulateAllSlots({ board: field, fieldBoard: field, actual });
  const b = simulateAllSlots({ board: field, fieldBoard: field, actual });
  ok(JSON.stringify(a.bySlot) === JSON.stringify(b.bySlot),
    "somu inntok gefa NAKVAEMLEGA somu utkomu — engin Math.random i herminum");
}

/* ============================================================
   TIMABILS-SUMMAN GEGN VIKULEGRI TALNINGU
   ============================================================
   ALLT I THESSU VERKEFNI HVILIR A EINNI FORSENDU sem var aldrei
   profud: `startersPoints` leggur saman TIMABILS-SUMMU og velur
   byrjunarlid graduglega ur henni. Raunveruleg fantasy er 17
   adskildar vikulegar akvardanir, thar sem aud vika kostar, meidsli i
   viku 6 eydileggja seinni helminginn, og DYPT hefur gildi sem
   summan sér alls ekki.

   `weekly-lab.mjs` keyrir SAMA DRAFTID og telur stigin baðar leidir.
   Maelt yfir 2019-2025 a badum spaheimildum:
       fylgni adferdanna r = 0,987 · 0,906 · 0,889
   Baðar segja somu soguna, med somu formerki hvert ar.

   Falli thetta er timabils-summan haett ad vera nothaef nalgun og
   ALLAR hinar maelingarnar eru ad svara rangri spurningu.          */
console.log("\ntimabils-summa gegn vikulegri talningu");
{
  const files = ["weekly_check_ppr_sleeper", "weekly_check_ppr_fftoday",
                 "weekly_check_standard_sleeper", "weekly_check_standard_fftoday"];
  let seen = 0;
  for (const f of files) {
    const p = path.join(DATA, `${f}.json`);
    if (!existsSync(p)) continue;
    seen++;
    const j = JSON.parse(readFileSync(p, "utf8"));
    ok(j.correlation > 0.7,
      `${f.replace("weekly_check_", "")}: adferdirnar fylgjast ad (r=${j.correlation})`);
    ok((j.seasonTotal.mean > 0) === (j.weekly.mean > 0),
      `${f.replace("weekly_check_", "")}: sama formerki ` +
      `(${j.seasonTotal.mean} og ${j.weekly.mean})`);
    ok(j.seasons.length >= 5, `${f.replace("weekly_check_", "")}: ${j.seasons.length} timabil`);
  }
  ok(seen >= 2, `${seen} vikulegar stadfestingar lesnar af diski`);
}

/* ============================================================
   DEILDARLOGUN — GILDIR THETTA I FLEIRI EN EINNI DEILD?
   ============================================================
   Allt annad var maelt i 12-lida deild med einum leikstjornanda.
   `shape-lab.mjs` keyrdi 16 logunum (8-16 lid, tvofaldur flex,
   superflex, 2QB) yfir baðar stigagjafir.

   OG THAD AFHJUPADI HVAD NIDURSTADAN HVILIR A. Med spa Sleeper slaer
   A-Ranking ADP i 16 af 16 logunum (+169 til +322). Med FFToday i
   adeins 4 af 16. Skyringin er maeld a NAKVAEMLEGA SOMU 839 rodum:

     vs raunstig   sleeper 0,696 · fftoday 0,628 · ADP 0,452
     per stodu er FFToday varla betri en ADP (RB 0,596/0,589,
     TE 0,451/0,453 — thar VERRI)

   Thad er ekkert umfram markadinn til ad umreikna. VBD bregst ekki;
   inntakid ber ekkert. Appid notar Sleeper, sterkari heimildina.  */
console.log("\ndeildarlogun");
{
  const p = path.join(DATA, "shapes_sleeper.json");
  if (!existsSync(p)) {
    console.log("  (shapes_sleeper.json vantar — keyrdu scripts/shape-lab.mjs)");
  } else {
    const S = JSON.parse(readFileSync(p, "utf8"));
    const rows = Object.values(S.shapes);
    ok(rows.length >= 12, `${rows.length} deildarlogun maeldar`);

    /* Logunin sem appid er sjalfgefid stillt a VERDUR ad vera med. */
    for (const k of ["ppr|12-std", "standard|12-std", "ppr|12-sflex", "ppr|10-std"]) {
      ok(S.shapes[k] != null, `${k} er maeld`);
    }

    /* Kjarna-fullyrdingin sem vidmotid birtir. */
    /* ADEINS GILDU LOGUNIN eru taldar — sogulegt ADP er ur eins-QB
       deildum, svo superflex/2QB-samanburdurinn maelir mistok vallarins
       en ekki gaedi bordsins. Ad telja thau med vaeri ad styrkja
       nidurstoduna med tolu sem vid vitum ad er ogild. */
    ok(S.summary.validShapes < rows.length,
      `${rows.length - S.summary.validShapes} logun merkt ogild gegn ADP`);
    ok(rows.filter((r) => r.adpValid === false)
        .every((r) => /eins-QB/.test(r.adpNote || "")),
      "hver ogild logun ber skyringu, ekki bara flagg");
    ok(S.summary.beatsAdp >= S.summary.validShapes * 0.75,
      `slaer ADP i ${S.summary.beatsAdp} af ${S.summary.validShapes} GILDUM logunum`);
    ok(S.summary.beatsRaw >= rows.length * 0.6,
      `slaer hra spa-rod i ${S.summary.beatsRaw} af ${rows.length}`);

    /* Varamanns-threpid VERDUR ad vaxa med deildarstaerd — annars er
       `replacementRanks` ekki ad lesa deildina og allar tolurnar hér
       eru sama maelingin endurtekin. */
    const t8 = S.shapes["ppr|8-std"], t16 = S.shapes["ppr|16-std"];
    if (t8 && t16) {
      ok(t16.replacement.RB > t8.replacement.RB * 1.5,
        `varamanns-threp RB vex med deild (8 lid: ${t8.replacement.RB}, ` +
        `16 lid: ${t16.replacement.RB})`);
    }
    /* Og superflex VERDUR ad faera QB-threpid nidur (fleiri QB byrja). */
    const sf = S.shapes["ppr|12-sflex"], st = S.shapes["ppr|12-std"];
    if (sf && st) {
      /* MAELT, EKKI GISKAD: `superflex-lab.mjs` taldi 1.488 superflex-
         saeti yfir 124 vikur — QB fyllir 86,0% theirra. I 12-lida deild
         faerir thad threpid ur 12 i 22. Adur var thad 12 i BADUM
         sniðum og leikstjornendur thvi storlega vanmetnir i superflex. */
      ok(sf.replacement.QB >= st.replacement.QB + 8,
        `superflex dypkar QB-threpid marktaekt (${st.replacement.QB} -> ${sf.replacement.QB})`);
    }
  }
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
