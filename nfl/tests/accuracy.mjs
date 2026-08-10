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
  startersPoints, scoreBoard, rankExperts, DEFAULT_LEAGUE,
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
