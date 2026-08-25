/* ============================================================
   nfl-pipeline.mjs — ver GOGNIN sjalf, ekki formulurnar.

   ASTAEDAN ER LAERDOMUR UR FPL-VERKEFNINU: markadslidurinn thar var
   DAUDUR I HEILA VIKU medan oll profin voru graen — thau profudu
   formuluna en ekki hvort faedid sem hun faer se nytilegt. Hér er
   thad profad.

   Kafli 1  audkennisbruin — nafna-porun MA EKKI taka yfir
   Kafli 2  tomgildi — 999/400 i ADP mega ALDREI birtast sem tolur
   Kafli 3  hvert birt svid verdur ad hafa RAUNVERULEGA DREIFINGU
   Kafli 4  lidsheiti — engin porun ma bua til 33. lidid
   Kafli 5  stigareikningur borinn vid THEKKTAR tolur
   Kafli 6  heimildaskrain nefnir hverja heimild sem gogn koma fra
   ============================================================ */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { NFL_TEAMS, normTeam } from "../src/names.js";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = path.join(ROOT, "data");
const read = (f) => JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
const has = (f) => existsSync(path.join(DATA, f));

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

/** Pearson-fylgni — notud i leka-hlidinu. */
function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let s = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const u = a[i] - ma, v = b[i] - mb;
    s += u * v; da += u * u; db += v * v;
  }
  return da && db ? s / Math.sqrt(da * db) : 0;
}

if (!has("players.json")) {
  console.log("  data/ vantar — keyrdu scripts/fetch-nfl.mjs");
  process.exit(1);
}

const players = read("players.json");
const schedule = has("schedule.json") ? read("schedule.json") : [];
const status = has("status.json") ? read("status.json") : null;

/* ---------- 1. AUDKENNISBRUIN ---------- */
console.log("\n1. audkennisbruin");
{
  const via = (k) => {
    const c = {};
    for (const p of players) { const v = (p.matchedVia && p.matchedVia[k]) || "none"; c[v] = (c[v] || 0) + 1; }
    return c;
  };
  const nv = via("nflverse"), es = via("espn");
  const byName = (c) => Object.entries(c)
    .filter(([k]) => k.startsWith("name:")).reduce((a, [, n]) => a + n, 0);
  const byId = (c) => Object.entries(c)
    .filter(([k]) => k !== "none" && !k.startsWith("name:")).reduce((a, [, n]) => a + n, 0);

  console.log(`     nflverse: ${JSON.stringify(nv)}`);
  console.log(`     espn:     ${JSON.stringify(es)}`);

  /* NAFNA-PORUN ER SIDASTA URRAEDI OG VERDUR AD VERA THAD.
     Fyrsta utgafan reiddi sig a Sleeper sem bru; Sleeper hafdi
     hætt ad senda gsis_id (162 af 989 virkum) og nafna-porun tok
     yfir 732 leikmenn an thess ad nokkud brotnadi. Thetta profa er
     vordurinn: fari hlutfallid upp aftur fellur thad. */
  ok(byName(es) < byId(es) * 0.35,
    `ESPN: nafna-porun (${byName(es)}) er langt undir audkennis-porun (${byId(es)})`);
  ok(byId(nv) > players.length * 0.5,
    `nflverse: meirihluti paradur um audkenni (${byId(nv)} af ${players.length})`);

  const dupe = new Set(); let dupes = 0;
  for (const p of players) { if (dupe.has(p.id)) dupes++; dupe.add(p.id); }
  ok(dupes === 0, "engin tvitekin leikmanna-audkenni");
}

/* ---------- 2. TOMGILDI ---------- */
console.log("\n2. tomgildi eru NULL, ekki tolur");
{
  /* Sleeper skrifar 999 (og 400) fyrir "ekki draftadur". Vaeri thad
     latid standa yrdi hver einasti leikmadur med "ADP" og sian sem
     heldur skranni vid draftanlega menn hleypti ollum i gegn — thad
     var raunveruleg villa hér (3.083 radir i stad 1.130). */
  const bad = players.filter((p) =>
    [p.adpSleeper, p.adpSleeperHalf, p.adpSleeperStd, p.adpEspn]
      .some((v) => v != null && v >= 400));
  ok(bad.length === 0,
    `engin ADP-tomgildi (999/400) i skranni (fann ${bad.length})`);

  const withAdp = players.filter((p) => p.adpSleeper != null).length;
  ok(withAdp > 50 && withAdp < players.length * 0.8,
    `ADP a hofulegum hluta (${withAdp} af ${players.length}) — hvorki ollum ne engum`);

  /* NULL ER EKKI NULL: leikmadur an spar ma ekki bera 0. */
  const zeroProj = players.filter((p) => p.projSleeper === 0).length;
  const nullProj = players.filter((p) => p.projSleeper == null).length;
  ok(nullProj > 0, `${nullProj} leikmenn bera null-spa (ekki 0)`);
  console.log(`     spa: ${players.length - nullProj} med tolu, ${nullProj} null, ${zeroProj} nakvaemlega 0`);
}

/* ---------- 3. HVERT BIRT SVID BER RAUNVERULEGA DREIFINGU ---------- */
console.log("\n3. dreifing i birtum svidum");
{
  /* Regla ur BSD-hluta FPL-verkefnisins: ekkert daudt svid ma rata i
     skrana. Svid sem er alltaf sama gildid er ekki gagn heldur
     platsfyllir sem litur ut eins og gagn. */
  const fields = ["adpSleeper", "adpEspn", "ecr", "ecrSd", "projSleeper",
    "ownedEspn", "auctionEspn", "bye"];
  for (const f of fields) {
    const vals = players.map((p) => p[f]).filter((v) => v != null && Number.isFinite(v));
    const uniq = new Set(vals).size;
    ok(vals.length > 20 && uniq > 5,
      `${f}: ${vals.length} gildi, ${uniq} einkvaem`);
  }

  /* `adpFfc` er hlutur per leikmann — hann ma ekki vera tomur hja ollum. */
  const withFfc = players.filter((p) => p.adpFfc && Object.keys(p.adpFfc).length).length;
  ok(withFfc > 100, `${withFfc} leikmenn med FFC-ADP i minnsta kosti einu sniði`);
}

/* ---------- 4. LIDSHEITI ---------- */
console.log("\n4. lidsheiti");
{
  const teams = new Set(players.map((p) => p.team).filter(Boolean));
  const unknown = [...teams].filter((t) => !NFL_TEAMS.includes(t));
  /* Porun ma ALDREI bua til 33. lidid. Vaeri "LA" og "LAR" badir i
     skranni yrdi "vorn gegn stodu" reiknud a tvo lid fyrir Rams og
     hvorugt faengi rett urtak. */
  ok(unknown.length === 0,
    `oll lidsheiti eru af theim 32 (othekkt: ${unknown.join(", ") || "engin"})`);
  ok(teams.size >= 30, `${teams.size} lid i skranni`);

  if (schedule.length) {
    const sTeams = new Set(schedule.flatMap((g) => [g.home, g.away]).filter(Boolean));
    const sUnknown = [...sTeams].filter((t) => !NFL_TEAMS.includes(normTeam(t)));
    ok(sUnknown.length === 0,
      `leikjaskrain ber adeins gild lidsheiti (${sUnknown.join(", ") || "hrein"})`);
  }
}

/* ---------- 5. STIGAREIKNINGUR ---------- */
console.log("\n5. stigareikningur borinn vid thekkt gildi");
if (has("seasons.json")) {
  const seasons = read("seasons.json");
  const y25 = seasons.filter((s) => s.season === 2025);
  ok(y25.length > 300, `${y25.length} leikmenn med 2025-timabil`);

  /* PPR > half > standard fyrir HVERN mottakara. Snuist thetta vid
     er stigagjofin rong og allar rodanir med henni. */
  const recv = y25.filter((s) => ["WR", "RB", "TE"].includes(s.pos) && s.rec > 20);
  const wrong = recv.filter((s) => !(s.ppr > s.half && s.half > s.std));
  ok(wrong.length === 0,
    `PPR > half > standard hja ollum ${recv.length} mottakurum med >20 grip`);

  /* Munurinn ER nakvaemlega fjoldi gripa (PPR - std = rec). */
  const gapWrong = recv.filter((s) => Math.abs((s.ppr - s.std) - s.rec) > 0.5);
  ok(gapWrong.length === 0,
    "munur PPR og standard er nakvaemlega fjoldi gripa");

  /* Efsti RB 2025 a ad vera i raunhaefu bili. Threpid er breitt
     viljandi — thetta er skynsemishlid, ekki kvordun. */
  const topRb = y25.filter((s) => s.pos === "RB").sort((a, b) => b.ppr - a.ppr)[0];
  ok(topRb && topRb.ppr > 300 && topRb.ppr < 500,
    `efsti RB 2025 i raunhaefu bili: ${topRb && topRb.name} ${topRb && topRb.ppr}`);

  const negPpg = y25.filter((s) => s.ppg < -5).length;
  ok(negPpg === 0, "engin ovaent neikvaed medaltol");

  /* Boom/bust maelt: their mega ekki vera alltaf 0 (threp of hatt)
     ne alltaf hair (threp of lagt). */
  const starters = y25.filter((s) => s.g >= 10);
  const boomZero = starters.filter((s) => s.boom === 0).length / starters.length;
  ok(boomZero > 0.2 && boomZero < 0.9,
    `boom-threpid greinir (${(boomZero * 100).toFixed(0)}% eiga enga boom-viku)`);
} else {
  console.log("  (seasons.json vantar — slepp)");
}

/* ---------- 5b. MAELISTOFAN — leka-hlid a spa-heimildunum ---------- */
console.log("\n5b. maelistofan");
if (has("features.json") && has("model_eval_ppr.json")) {
  const F = read("features.json");
  const E = read("model_eval_ppr.json");

  ok(F.rows.length > 3000, `${F.rows.length} leikmanna-timabil i maeliskra`);

  /* ADP-GLUGGINN VERDUR AD ENDA FYRIR FYRSTA LEIK. Vaeri hann eftir
     tha bæri "spain" upplysingar ur viku 1 og allur samanburdurinn
     vaeri merkingarlaus i thagu markadarins. */
  let leaky = 0;
  for (const [k, w] of Object.entries(F.adpWindows || {})) {
    const yr = Number(k.split("|")[0]);
    if (w.to && new Date(w.to) > new Date(`${yr}-09-12`)) leaky++;
  }
  ok(leaky === 0, `enginn ADP-gluggi nær inn i timabilid (${leaky})`);

  /* SLEEPER-SPAIN MA EKKI VERA UTKOMA I DULARGERVI. Vaeri hun
     uppfaerd eftir a myndi hun fylgja LEIKJUM SPILUDUM sterkt —
     hun veit ekki hverjir meiddust. Maelt: r ~ 0,09-0,21, sama og
     hja ADP. */
  const withSlp = F.rows.filter((r) => r.scoring === "ppr" && r.sleeperProj != null);
  if (withSlp.length > 300) {
    const r = pearson(withSlp.map((x) => x.sleeperProj), withSlp.map((x) => x.g));
    const rAdp = pearson(withSlp.map((x) => -Math.log(x.adp)), withSlp.map((x) => x.g));
    ok(r < 0.45,
      `Sleeper-spa fylgir EKKI leikjum spiludum (r=${r.toFixed(3)}, ADP ${rAdp.toFixed(3)}) — engin leki`);
  }

  /* A-RANKING VERDUR AD SLA BADAR HEIMILDIR A SOMU ARUM.
     Falli thetta er fullyrdingin i vidmotinu ekki lengur sonn og
     hun VERDUR ad hverfa thadan lika. */
  const g = (k) => E.models.find((m) => m.key === k);
  const a = g("slp_vbd"), adp = g("adp"), slp = g("sleeper");
  ok(a && adp && slp, "likonin thrju eru i skranni");
  if (a && adp && slp) {
    ok(a.draftCommon > adp.draftCommon,
      `A-Ranking slaer ADP (${a.draftCommon} > ${adp.draftCommon})`);
    ok(a.draftCommon > slp.draftCommon,
      `A-Ranking slaer hra Sleeper-rod (${a.draftCommon} > ${slp.draftCommon})`);
    const yrs = Object.keys(a.draftPerSeason)
      .filter((y) => adp.draftPerSeason[y] != null);
    const wins = yrs.filter((y) => a.draftPerSeason[y] > adp.draftPerSeason[y]).length;
    ok(wins === yrs.length,
      `A-Ranking vinnur ADP i OLLUM arum (${wins}/${yrs.length})`);
    /* Fylgni A-Ranking er LAEGRI en Sleeper og thad er RETT — hun
       radar eftir virdi, ekki stigum. Profid festir thad svo enginn
       "lagfaeri" thad seinna. */
    ok(a.rhoCommon < slp.rhoCommon,
      `og rho er LAEGRA en hja Sleeper (${a.rhoCommon} < ${slp.rhoCommon}) — virdi, ekki stig`);
  }
} else {
  console.log("  (features/model_eval vantar — slepp)");
}

/* ---------- 5d. STYRKUR FULLYRDINGANNA ----------
   TVAER FULLYRDINGAR MED OLIKAN STYRK, OG APPID MA EKKI RUGLA THEIM
   SAMAN. Gegn ADP er A-Ranking marktaekt betri; gegn Sleeper-rodinni
   er hun jakvaed en osonnud i PPR og marktaek (tekna-prof) i standard.
   Falli thetta profa ma ordalagid i vidmotinu ekki standa obreytt. */
console.log("\n5d. styrkur fullyrdinganna");
if (has("arank_ppr.json") && has("arank_standard.json")) {
  for (const sc of ["ppr", "standard"]) {
    const A = read(`arank_${sc}.json`);
    const h = A.headToHead.current;
    ok(A.seasons.length >= 5, `${sc}: ${A.seasons.length} hrein timabil`);
    ok(h.n >= 1000, `${sc}: ${h.n} einvigi hermd`);
    ok(h.mean > 0, `${sc}: punktmat A-Ranking er jakvaett (${h.mean})`);
    ok(h.winRate > 0.5, `${sc}: vinnur meirihluta einviga (${(h.winRate * 100).toFixed(1)}%)`);

    if (sc === "standard") {
      /* Su fullyrding sem VIDMOTID kallar marktaeka. */
      ok(h.yearWins === h.years,
        `standard: vinnur OLL timabilin (${h.yearWins}/${h.years})`);
      ok(h.signP < 0.05,
        `standard: tekna-prof er marktaekt (p = ${h.signP})`);
    } else {
      /* Og su sem thad kallar OSONNADA. Profid ver ad hun se ekki
         seld sem meira en hun er. */
      ok(h.signP >= 0.05,
        `ppr: tekna-prof er EKKI marktaekt (p = ${h.signP}) — vidmotid verdur ad segja thad`);
    }
  }
} else {
  console.log("  (arank-skrar vantar — slepp)");
}

/* ---------- 5c. DRAFT-STEFNUR ---------- */
console.log("\n5c. draft-stefnur");
if (has("strategy_ppr.json") && has("strategy_standard.json")) {
  for (const sc of ["ppr", "standard"]) {
    const S = read(`strategy_${sc}.json`);
    ok(S.strategies.length > 10, `${sc}: ${S.strategies.length} stefnur maeldar`);
    ok(S.seasons.length >= 8, `${sc}: ${S.seasons.length} timabil`);
    const bpa = S.strategies.find((x) => x.key === "bpa");
    const qb1 = S.strategies.find((x) => x.key === "qb1");
    ok(bpa && qb1, `${sc}: vidmid og QB-1 eru til`);
    /* MAELD NIDURSTADA SEM VIDMOTID FULLYRDIR: leikstjornandi i 1.
       umferd er MARKTAEKT verri. Falli thetta ma fullyrdingin ekki
       standa i vidmotinu. */
    if (bpa && qb1) {
      ok(qb1.mean < bpa.mean,
        `${sc}: QB i 1. umferd er verri en besti lausi (${qb1.mean} < ${bpa.mean})`);
      ok(qb1.vsBpa && qb1.vsBpa.excludesZero,
        `${sc}: og munurinn er MARKTAEKUR [${qb1.vsBpa.lo.toFixed(0)}, ${qb1.vsBpa.hi.toFixed(0)}]`);
    }
    /* Fyrsta-umferdar taflan verdur ad na yfir oll saeti. */
    ok(S.firstRoundBySlot.length === 4, `${sc}: fjorar stodur i fyrstu-umferdar toflu`);
    ok(Object.keys(S.firstRoundBySlot[0].bySlot).length === S.teams,
      `${sc}: oll ${S.teams} saetin hermd`);
  }
} else {
  console.log("  (strategy-skrar vantar — slepp)");
}

/* ---------- 6. HEIMILDASKRAIN ---------- */
console.log("\n6. heimildaskrain");
if (status) {
  const names = new Set((status.sources || []).map((s) => s.name));
  /* Heimild sem gogn koma fra en er EKKI i skranni er osynileg
     thegar hun brotnar. Thess vegna er krafist ad hver kjarna-heimild
     skrai sig. */
  for (const need of ["sleeper_players", "nflverse_players", "espn_players",
                      "idmap", "join_players", "nflverse_schedules"]) {
    ok(names.has(need), `${need} skrair sig i status.json`);
  }
  ok((status.sources || []).every((s) => s.note && s.note.length > 5),
    "hver heimild ber skyringu");
  ok(status.generated && !Number.isNaN(Date.parse(status.generated)),
    "timastimpill er gildur");
} else {
  console.log("  (status.json vantar — slepp)");
}

/* ============================================================
   TOM KEYRSLA MA ALDREI THURRKA UT GOD GOGN
   ============================================================
   Reglan stod i haus `fetch-nfl.mjs` og var BROTIN i verki. Vordurinn
   taldi `Object.keys(data).length`, svo hlut-farmur eins og
   `market.json` — sex lyklar, oháð innihaldi — bar ALLTAF 6 radir.

   9.8.2026 kl. 21:25 skilaði ESPN engum linum. Skrain for ur 272 linum
   og 32 lidum nidur i NULL, vordurinn hleypti thvi i gegn (6 >= 3),
   workflow-id sagdi "success" og Market-flipinn var tomur i appinu.

   Regla sem hvilir a athugasemd er engin regla. Herman her keyrir
   TALNINGUNA SJALFA a nakvaemlega theim formum sem pipeline-id skrifar. */
console.log("\ntom keyrsla ma ekki thurrka ut god gogn");
{
  /* Sama utfaersla og i fetch-nfl.mjs. Hun er endurtekin viljandi:
     profid a ad falla ef HEGDUNIN breytist, ekki ef nafn breytist. */
  const rowCount = (d, depth = 0) => {
    if (Array.isArray(d)) {
      /* Fylki af UMBUÐUM skilar fjolda umbudanna, ekki farmsins —
         `adp.json` er `{ ffc: [5 sett] }` med 258 leikmenn i hverju,
         og talning sem stoppar a 5 hafnar skrifum sem eru i lagi. */
      let best = d.length;
      if (depth < 4) for (const v of d) {
        const n = rowCount(v, depth + 1); if (n > best) best = n;
      }
      return best;
    }
    if (!d || typeof d !== "object") return 0;
    let best = 0;
    if (depth < 4) for (const v of Object.values(d)) {
      const n = rowCount(v, depth + 1); if (n > best) best = n;
    }
    return best || Object.keys(d).length;
  };

  const CASES = [
    { name: "market.json",   min: 200,
      empty: { season: 2026, generated: "x", lines: [], futures: [], teams: [], withLine: 0 },
      full:  { season: 2026, generated: "x", lines: new Array(272), futures: new Array(11),
               teams: new Array(32), withLine: 272 } },
    { name: "news.json",     min: 20,
      empty: { season: 2026, generated: "x", articles: [], injuries: [] },
      full:  { season: 2026, generated: "x", articles: new Array(50), injuries: new Array(800) } },
    /* ECR er HREIDRAD: 515 leikmenn liggja undir `ppr.players`. Grunn
       leit i efsta lagi hefdi gefid 4 og daemt heila skra toma. */
    { name: "ecr.json",      min: 100,
      empty: { season: 2026, ppr: { players: [], experts: [] },
               half: { players: [] }, standard: { players: [] } },
      full:  { season: 2026, ppr: { players: new Array(515), experts: new Array(95) },
               half: { players: new Array(815) }, standard: { players: new Array(501) } } },
    { name: "players.json",  min: 300,
      empty: [], full: new Array(1130) },
    { name: "teams.json",    min: 30,
      empty: [], full: new Array(32) },
    { name: "schedule.json", min: 200,
      empty: [], full: new Array(557) },
    /* Fylki af umbuðum: `ffc` ber fimm sett og hvert sett 258 leikmenn.
       Talning sem stoppar a ytra fylkinu segir 5 og hafnar skrifum sem
       eru i fullkomnu lagi. */
    { name: "adp.json", min: 100,
      empty: { season: 2026, ffc: [{ players: [] }], generated: "x" },
      full: { season: 2026, generated: "x",
              ffc: [{ players: new Array(258) }, { players: new Array(210) }] } },
    /* ATTA LYKLAR ERU EKKI ATTA RADIR. `experts.json` bar `minRows: 1`
       til 21.8.2026 — eina skrain i settinu an maelds golfs, og su
       staersta (4,1 MB). Falli FantasyPros alveg (allar fjorar leidirnar
       eru SAMI hostur) er farmurinn atta lyklar med tomum fylkjum, svo
       `rowCount` fellur i lyklafjolda og skilar 8. Med golfinu 1 hefdi
       thad verid skrifad ofan i bordin, nakvaemnissoguna og samsteypuna.
       Sama gildra og `market.json` bar (sex lyklar, alltaf 6). */
    { name: "experts.json", min: 100,
      empty: { season: 2026, accuracy: [], accuracyWeekly: [],
               accuracyHistory: {}, boards: [], boardsPrev: [],
               consensus: null, generated: "x" },
      full: { season: 2026, accuracy: new Array(215), accuracyWeekly: new Array(10),
              accuracyHistory: { 2025: new Array(215) },
              boards: [{ ranks: Object.fromEntries(
                new Array(300).fill(0).map((_, i) => [i, i])) }],
              boardsPrev: [], consensus: { players: new Array(520) },
              generated: "x" } },
  ];
  for (const c of CASES) {
    ok(rowCount(c.empty) < c.min,
      `${c.name}: tom keyrsla HAFNAD (${rowCount(c.empty)} < ${c.min})`);
    ok(rowCount(c.full) >= c.min,
      `${c.name}: heil keyrsla skrifud (${rowCount(c.full)} >= ${c.min})`);
  }

  /* Og lagmorkin i kodanum verda ad vera thau somu og hér. Annars ver
     profid form sem pipeline-id notar ekki. */
  const src = readFileSync(path.join(ROOT, "scripts", "fetch-nfl.mjs"), "utf8");
  for (const c of CASES) {
    const m = new RegExp(`writeJson\\("${c.name.replace(".", "\\.")}"[\\s\\S]{0,400}?minRows:\\s*(\\d+)`)
      .exec(src);
    ok(m && Number(m[1]) === c.min,
      `${c.name}: minRows i kodanum er ${m ? m[1] : "ekki finnanlegt"} (a ad vera ${c.min})`);
  }

  /* Skrarnar a disknum verda LIKA ad standast sin eigin lagmork —
     annars er tomt astand thegar komid inn og enginn tekur eftir. */
  for (const c of CASES) {
    const f = path.join(DATA, c.name);
    if (!existsSync(f)) continue;
    const n = rowCount(JSON.parse(readFileSync(f, "utf8")));
    ok(n >= c.min, `${c.name} a disknum ber ${n} radir (lagmark ${c.min})`);
  }
}

/* ============================================================
   VIDFONG RATA EKKI OSTADFEST I SKRAARNAFN
   ============================================================
   Thrjar skrar med BILUM i nafni urdu til i data/. Rotin sest i
   `provenance`-blokkinni sem thaer baru sjalfar:
     argv: ["--scoring=ppr sleeper", "--proj=", "--runs=8"]
   — skel sem klofnadi ekki rett, og skriftan limdi gildid OSTADFEST
   inn i utkomunafnid. Verra: thad fann NULL RADIR og skriftan skrifadi
   SAMT, med `seasons: []`.

   ÞETTA PROFA LES SKRAAKERFID, EKKI KODATEXTA. Astaedan er beinlinis
   su ad athugasemdin i `lib/args.mjs` NEFNIR skraarheitin — leit i
   kodatexta hefdi fundid thau thar. Fullyrding sem athugasemd getur
   uppfyllt er einskis virdi.                                        */
console.log("\nskraarnofn i data/");
{
  const { readdirSync } = await import("node:fs");
  const files = readdirSync(DATA);
  const spaced = files.filter((f) => /\s/.test(f));
  ok(spaced.length === 0, `ekkert skraarnafn ber bil (${spaced.join(", ") || "hreint"})`);

  const empty = [];
  for (const f of files.filter((x) => x.endsWith(".json"))) {
    let j;
    try { j = JSON.parse(readFileSync(path.join(DATA, f), "utf8")); } catch { continue; }
    if (j && Array.isArray(j.seasons) && j.seasons.length === 0) empty.push(f);
  }
  ok(empty.length === 0, `engin maelingarskra med tomu seasons (${empty.join(", ") || "hreint"})`);

  const labs = readdirSync(path.join(ROOT, "scripts")).filter((f) => /-lab\.mjs$/.test(f));
  const loose = [];
  for (const f of labs) {
    /* Athugasemdir skornar burt ADUR en leitad er — sja ad ofan. */
    const src = readFileSync(path.join(ROOT, "scripts", f), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    if (!/ARG\.scoring|ARG\.proj/.test(src)) continue;
    if (!/parseArgs\(/.test(src)) loose.push(f);
  }
  ok(loose.length === 0, `hver rannsokn stadfestir vidfong sin (an: ${loose.join(", ") || "engin"})`);
}

/* ============================================================
   TRENDING-SAGAN ER OENDURHEIMTANLEG — OG SKRIFUD, OLESIN
   ============================================================
   `/players/nfl/trending/{add|drop}` svarar fyrir SIDUSTU 24 KLST og
   geymir enga sogu. Hvergi — hvorki hja Sleeper ne annars stadar — er
   haegt ad na i hvad var saekt i gaer. Hver dagur an vistunar er
   tapadur ad eilifu.

   Skrarnar eru ENN OLESNAR af appinu, nakvaemlega eins og
   `data/history/` i FPL-verkefninu, og af somu astaedu: thaer eru
   hraefni i waiver-rodun sem VERDUR ekki haegt ad bakprofa an theirra.
   Prof sem krefdist thess ad einhver LAESI thaer myndi thvinga fram
   omaelda notkun; thetta profa krefst thess i stadinn ad thaer seu
   SKRIFADAR og ad enginn hafi eytt theim i hreinsun.               */
console.log("\ntrending-sagan");
{
  const { readdirSync, existsSync: ex } = await import("node:fs");
  const dir = path.join(DATA, "trending");
  if (!ex(dir)) {
    ok(false, "data/trending/ er ekki til — vistunin er haett ad keyra");
  } else {
    const days = readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
    ok(days.length >= 1, `${days.length} daglegar myndir vistadar`);

    const newest = days.sort().at(-1);
    const snap = JSON.parse(readFileSync(path.join(dir, newest), "utf8"));
    ok(Array.isArray(snap.add) && snap.add.length >= 20,
      `${newest}: ${(snap.add || []).length} i "add"`);
    ok(Array.isArray(snap.drop) && snap.drop.length >= 20,
      `${newest}: ${(snap.drop || []).length} i "drop"`);
    ok(snap.captured && snap.lookbackHours,
      "myndin ber timastimpil og hve langt aftur hun naer");

    /* Skriftan verdur ad skrifa thaer — ekki bara ad thaer seu til.
       Athugasemdir skornar burt fyrst: su sem utskyrir regluna nefnir
       slodina og myndi annars uppfylla profid sjalf. */
    const src = readFileSync(path.join(ROOT, "scripts", "fetch-nfl.mjs"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    ok(/trending\/\$\{day\}\.json|trending\/\$\{/.test(src),
      "pipeline-id skrifar daglega mynd (lesid ur kodanum an athugasemda)");
  }
}

/* ============================================================
   SKRAR SEM ENGINN LES — OG THAD ER AKVORDUN, EKKI GLEYMSKA
   ============================================================
   Uttektin kalladi thessar "munadarlausar" og spurdi hvort ætti ad
   eyda theim. Svarid er NEI, og astaedan er su sama og fyrir
   `data/history/` i FPL-verkefninu: **maeling sem ekki er haegt ad
   endurgera er ekki maeling.**

   Tvennt liggur her og thad er ekki thad sama:

     INNTAK   ecr_history · fftoday_projections · wayback_projections
              · projector_sites — sogulegar spar sem voru sottar einu
              sinni og eru forsenda thess ad bakprofin seu endurgeranleg.
              Sumt af thessu er EKKI haegt ad saekja aftur (Wayback-
              myndir hverfa, FFToday getur breytt sniði).

     UTKOMA   feature_probe · projectors_* · arank_search_ppr ·
              superflex_split — nidurstodur sem README og vidmotid
              VITNA I. Ad eyda theim vaeri ad eyda sonnunargagninu
              fyrir fullyrdingu sem stendur afram a skjanum.

   ÞESSI LISTI ER TIL SVO THAER SEU EKKI FJARLAEGDAR I "HREINSUN" —
   og svo ad NY olesin skra vekji spurningu i stad thess ad laumast
   inn. Baetist skra vid sem enginn les fellur thetta profa og tha er
   thad AKVORDUN: annadhvort er hun notud eda hun fer a listann med
   rokstudningi.                                                     */
/* ============================================================
   DALKUR SEM HEIMILDIN TOK UT MA EKKI HVERFA I THOGN
   ============================================================
   `objects(text, pick)` sleppir thogult dalki sem er ekki i hausnum. Su
   thogn hefur kostad tvisvar og badar bilanir skradu sig **`ok`**:

     `depthCharts(2026)`  nflverse skipti um snid; af 15 dolkum lifdi
                          `gsis_id` einn. Fallid skiladi 0 rodum og
                          skradi `ok` (skjalad i haus `depthCharts`).
     `players.csv` 21.8.  `draft_club` -> `draft_team` og `sleeper_id`
                          tekid ut. `draftTeam` var null a ollum 25.049
                          leikmonnum og `nvBySleeper` var TOM Map.

   `missingCols` + `parse()` gera thognina ad raudri rod i `status.json`.
   ThETTA PROFA MAELIR MEKANISMANN, EKKI LIFANDI SKEMA nflverse, og thad
   er akvordun: hard fullyrding um ytra skema hefdi stoppad gogn i hvert
   sinn sem nflverse endurnefnir dalk sem enginn les — sama stiflan sem
   felldi thrjar keyrslur a draftdegi 21.8. Skemad er SYNILEGT
   (rod i Sources); profid ver ad thad SE synilegt.

   Fjorar fullyrdingar:
     (a) `missingCols` finnur dalk sem vantar og THEGIR thegar allt er a
         sinum stad (baedi attir — annars gaeti hun alltaf skilad tomu)
     (b) hun er RAUNVERULEGA notud: hver `objects(txt, [...])` i
         `scripts/sources/` liggur i falli sem einnig kallar `missingCols`
     (c) `parse()` skrair `record(..., false)` — ekki `true`
     (d) `players.csv` bidur um dalka sem HAUSINN A DISKNUM ber, thegar
         mynd af hausnum er til
   ============================================================ */
/* ============================================================
   HOSTUR ER BILUNARPUNKTUR — OG ThESSI EINI VAR ThAD I VERKI
   ============================================================
   `site.api.espn.com` skilar **403 ur GitHub Actions** medan
   `lm-api-reads.fantasy.espn.com` og `sports.core.api.espn.com` skila
   200 ur SOMU keyrslu; lokalt svara allir thrir. Kostnadurinn var
   maeldur 21.8.2026: 18 radir `espn_lines_w{n} failed: HTTP 403` og
   frettasafnid HAFNAD fimm daga i rod — og thad safn er dagsett, svo
   their dagar eru oendurheimtanlegir (ESPN-glugginn er ~22 klst).

   `site.web.api.espn.com` ber SOMU SLODIR og gaf 21.8.2026 svid fyrir
   svid EINS svar (/teams, /injuries, /news, /scoreboard). `getJSONFirst`
   reynir hostana i rod.

   ThRJAR FULLYRDINGAR:
     (a) hvert ESPN-site-kall gengur gegnum hosta-listann, ekki gegnum
         fastan streng (thekja, talin)
     (b) listinn ber FLEIRI EN EINN host — annars er "fallback" heiti
         an hegdunar
     (c) varahostur sem svarar SKRAIR SIG. Graen keyrsla sem thegir um
         ad adalhosturinn se fallinn er thogla bilunin sem allt thetta
         repo er varnaglar gegn.
   ============================================================ */
console.log("\nESPN-site: tveir hostar, og varahostur thegir ekki");
{
  const espnSrc = readFileSync(
    path.join(ROOT, "scripts", "sources", "espn.mjs"), "utf8");
  const oddsSrc = readFileSync(
    path.join(ROOT, "scripts", "sources", "espnodds.mjs"), "utf8");
  /* `//` I `https://` ER EKKI ATHUGASEMD. Fyrsta utgafa thessa profs
     notadi regluna "tveir skastrik og lina ut" og strippadi thvi HVERT
     einasta slodarheiti i burtu — svo hosta-listinn maeldist TOMUR og profid felldi rettan
     kod. Fullyrding sem thurrkar ut thad sem hun a ad maela er verri en
     engin. Skilyrdid er thvi "`//` sem er EKKI a eftir `:`". */
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  for (const [label, src] of [["espn.mjs", strip(espnSrc)],
                              ["espnodds.mjs", strip(oddsSrc)]]) {
    const m = /const SITES = \[([\s\S]*?)\]/.exec(src);
    ok(!!m, `${label}: SITES er listi, ekki einn strengur`);
    if (m) {
      const hosts = [...m[1].matchAll(/https:\/\/([^/"]+)/g)].map((x) => x[1]);
      ok(hosts.length >= 2,
        `${label}: ${hosts.length} hostar i listanum (${hosts.join(", ")})`);
      ok(hosts[0] === "site.api.espn.com",
        `${label}: adalhosturinn er afram site.api.espn.com`);
      ok(new Set(hosts).size === hosts.length,
        `${label}: engir tvitekningar — tvitekinn hostur er tvofold bid, ekki varaleid`);
    }
    /* (a) ThEKJA. Fastur `site.api...`-strengur UTAN `SITES` er kall sem
       fer aldrei i varaleidina. */
    const outside = (src.match(/https:\/\/site\.api\.espn\.com/g) || []).length -
      ((m && (m[1].match(/https:\/\/site\.api\.espn\.com/g) || []).length) || 0);
    ok(outside === 0,
      `${label}: engin sloð framhja hosta-listanum (${outside})`);
    const viaFirst = (src.match(/getJSONFirst\(/g) || []).length +
                     (src.match(/\bsite\(/g) || []).length;
    ok(viaFirst >= 1, `${label}: ${viaFirst} kall gegnum hosta-listann`);
  }

  /* (c) Rodin verdur ad vera skrad — og hun ma EKKI vera skrad thegar
     adalhosturinn svarar, thvi "allt eins og venjulega" er ekki frett. */
  const httpSrc = strip(readFileSync(
    path.join(ROOT, "scripts", "lib", "http.mjs"), "utf8"));
  const fn = /export async function getJSONFirst[\s\S]*?\n\}/.exec(httpSrc);
  ok(!!fn, "`getJSONFirst` finnst i lib/http.mjs");
  ok(fn && /if \(i > 0\)/.test(fn[0]) && /record\(`host:\$\{tag\}`/.test(fn[0]),
    "og hun skrair ADEINS thegar varahostur svarar (i > 0)");

  /* HEGDUNIN SJALF, A HERMDUM HOSTUM. Kodalestur segir ekkert um hvort
     lykkjan virkar; hér er hun keyrd med `fetch` sem hafnar fyrsta
     hostinum og svarar odrum. */
  {
    /* SKYNDIMINNID ER SLEGID AF FYRIR ThETTA. `getBuf` skrifar hvert svar
       a disk og LES thad naest; an thessa vaeri "hve oft var kallad" ekki
       maelanlegt i annarri keyrslu — profid myndi hitta cache og segja 1
       kall thar sem thad voru 4. Slodirnar eru auk thess einkvaemar per
       keyrslu, svo hvorug leidin geti hitt gamalt svar. */
    process.env.NFL_NO_CACHE = "1";
    const stamp = Date.now();
    const realFetch = globalThis.fetch;
    const seen = [];
    globalThis.fetch = async (u) => {
      seen.push(String(u));
      if (String(u).includes("primary.example")) return { ok: false, status: 403 };
      return { ok: true, status: 200, headers: new Map(),
               arrayBuffer: async () => new TextEncoder().encode('{"n":7}').buffer };
    };
    try {
      const mod = await import("../scripts/lib/http.mjs");
      const before = mod.sourceReport().length;
      const got = await mod.getJSONFirst("probe",
        [`https://primary.example/x?${stamp}`, `https://backup.example/x?${stamp}`]);
      ok(got && got.n === 7, "varahostur svarar thegar adalhosturinn 403-ar");
      ok(seen.length === 4,
        `og adalhosturinn var reyndur adur (${seen.length} koll: 3 tilraunir + 1)`);
      const rows = mod.sourceReport().slice(before);
      ok(rows.some((r) => r.name === "host:probe"),
        "og skiptin er SKRAD i heimildaskrana");
      /* Og thegar adalhosturinn svarar er ENGIN rod skrad. */
      const b2 = mod.sourceReport().length;
      await mod.getJSONFirst("probe2", [`https://ok.example/y?${stamp}`]);
      ok(mod.sourceReport().length === b2,
        "en engin rod thegar adalhosturinn svarar (thognin er rett thar)");
    } finally { globalThis.fetch = realFetch; }
  }
}

console.log("\nskema-drift verdur synileg, ekki thogul");
{
  const { missingCols } = await import("../scripts/lib/csv.mjs");

  /* (a) BADAR ATTIR. Fullyrding sem adeins profar "hun finnur thad sem
     vantar" er sonn hja falli sem skilar OLLUM dolkum alltaf. */
  ok(missingCols("a,b,c\n1,2,3\n", ["a", "b", "c"]).length === 0,
    "missingCols thegir thegar allir dalkar eru a sinum stad");
  const m1 = missingCols("a,b,c\n1,2,3\n", ["a", "zz", "c"]);
  ok(m1.length === 1 && m1[0] === "zz",
    `missingCols finnur dalkinn sem vantar (${JSON.stringify(m1)})`);
  /* Hausar med kommu innan gaesalappa — sama astaeda og `rows()` er til. */
  ok(missingCols('"a,x",b\n1,2\n', ["a,x", "b"]).length === 0,
    "og hun thattar gaesalappadan haus rett");
  ok(missingCols("a,b\r\n1,2\r\n", ["a", "b"]).length === 0,
    "og CRLF fellir hana ekki");

  /* (b) TENGINGIN. `missingCols` sem er skilgreind en okollud er
     nakvaemlega su thogla eining sem thetta profa er til vegna. */
  const { readdirSync } = await import("node:fs");
  const srcDir = path.join(ROOT, "scripts", "sources");
  /* ATHUGASEMDIR ERU FJARLAEGDAR FYRST. Bædi thessi skra og
     `sources/nflverse.mjs` NEFNA `objects(txt, pick)` i skyringum, svo
     leit i hraum texta myndi telja skyringuna sem kallstad — fullyrding
     sem athugasemd getur uppfyllt er einskis virdi (sami lærdomur og i
     "skraarnofn i data/" hér fyrir nedan). */
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  let withPicks = 0; const unguarded = [];
  for (const f of readdirSync(srcDir).filter((x) => x.endsWith(".mjs"))) {
    const txt = strip(readFileSync(path.join(srcDir, f), "utf8"));
    /* `objects(txt)` AN lista er ekki hér: thar er enginn dalkur til ad
       tapa, thvi hausinn sjalfur verdur lyklarnir. */
    if (!/\bobjects\(\s*\w+\s*,/.test(txt)) continue;
    withPicks++;
    if (!/\bmissingCols\(/.test(txt)) unguarded.push(f);
  }
  ok(withPicks >= 3,
    `ThEKJA: ${withPicks} skrar i scripts/sources/ lesa CSV med dalkalista`);
  ok(unguarded.length === 0,
    `og hver theirra kallar missingCols (an: ${unguarded.join(", ") || "engin"})`);

  /* OG I ThEIRRI SKRA SEM DRIFTADI TVISVAR VERDUR HVER LESTUR AD FARA
     GEGNUM `parse()`. Talan er thekjufullyrding: falli hun hefur einhver
     bætt vid ovoktudum lestri (maelt 21.8.2026: sex). */
  const nvStripped = strip(readFileSync(path.join(srcDir, "nflverse.mjs"), "utf8"));
  const viaParse = (nvStripped.match(/\bparse\(\s*[`"]/g) || []).length;
  ok(viaParse >= 6,
    `nflverse.mjs: ${viaParse} CSV-lestrar fara gegnum parse()`);

  /* (c) ROD SEM SEGIR `ok` UM TYNDAN DALK ER VERRI EN ENGIN ROD. */
  const nvSrc = readFileSync(path.join(srcDir, "nflverse.mjs"), "utf8");
  const parseFn = /function parse\(tag, txt, cols[\s\S]*?\n\}/.exec(nvSrc);
  ok(!!parseFn, "`parse()` finnst i sources/nflverse.mjs");
  ok(parseFn && /record\(`schema:\$\{tag\}`,\s*false/.test(parseFn[0]),
    "og hun skrair skema-drift sem VILLU, ekki sem ok");

  /* (d) OG ThAD SEM RAUNVERULEGA BROTNADI: dalkaheitin i `players()`
     verda ad vera thau sem hausinn a disknum ber. Mynd af hausnum er
     geymd i profinu svo thetta krefjist ekki netkalls; hun er tekin ur
     lifandi skra 21.8.2026 (39 dalkar). */
  const PLAYERS_HEAD = ["gsis_id", "display_name", "common_first_name",
    "first_name", "last_name", "short_name", "football_name", "suffix",
    "esb_id", "nfl_id", "pfr_id", "pff_id", "otc_id", "espn_id", "smart_id",
    "birth_date", "position_group", "position", "ngs_position_group",
    "ngs_position", "height", "weight", "headshot", "college_name",
    "college_conference", "jersey_number", "rookie_season", "last_season",
    "latest_team", "status", "ngs_status", "ngs_status_short_description",
    "years_of_experience", "pff_position", "pff_status", "draft_year",
    "draft_round", "draft_pick", "draft_team"];
  const askedM = /parse\("players", txt, \[([\s\S]*?)\]/.exec(nvSrc);
  ok(!!askedM, "`players()` pick-listinn er finnanlegur");
  if (askedM) {
    const asked = [...askedM[1].matchAll(/"([a-z0-9_]+)"/g)].map((x) => x[1]);
    ok(asked.length > 20, `ThEKJA: ${asked.length} dalkar bednir um`);
    const gone = asked.filter((c) => !PLAYERS_HEAD.includes(c));
    ok(gone.length === 0,
      `og hver theirra er i hausnum a players.csv (${gone.join(", ") || "allir"})`);
    ok(asked.includes("draft_team") && !asked.includes("draft_club"),
      "dalkurinn heitir `draft_team` — `draft_club` var endurnefnt");
  }
}

console.log("\nolesnar skrar eru asettar");
{
  const KNOWN_UNREAD = {
    "ecr_history.json": "soguleg ECR 2016-2019, sott einu sinni (DynastyProcess + partners API)",
    "fftoday_projections.json": "forleiks-spar 2015-2025, inntak i endurtekningarprofid",
    "wayback_projections.json": "Wayback-myndir — EKKI haegt ad saekja aftur ef thaer hverfa",
    "projector_sites.json": "hvada spamenn voru skodadir og hverjir foru gegnum leka-hlidid",
    "feature_probe.json": "14 breytur gegn leif spar — nidurstadan sem README vitnar i",
    "projectors_ppr.json": "rodun spamanna, PPR",
    "projectors_standard.json": "rodun spamanna, standard",
    "arank_search_ppr.json": "422-afbrigda leitin — sonnun fyrir ad leitin finni havada",
    "superflex_split.json": "86,0% QB i superflex — talan sem `SUPERFLEX_SPLIT` byggir a",

    /* LESNAR UM SMIDAD HEITI. Thessar eru NOTADAR — appid kallar
       `loadArankFf(scoring)` og `loadEval(scoring)`, sem byggja heitid
       ur stigagjofinni. Bokstaflega heitid kemur thvi hvergi fyrir i
       kodanum og einfold leit finnur thaer ekki. Ad smida skanna sem
       thenur ut sniðmat er haegt en hann verdur sjalfur ad giska; ad
       telja thaer upp hér er nakvaemt og segir satt. */
    "arank_ppr_fftoday.json": "lesin um loadArankFf(\"ppr\") — Replication-spjaldid",
    "arank_standard_fftoday.json": "lesin um loadArankFf(\"standard\")",
    "model_eval_standard.json": "lesin um loadEval(\"standard\")",

    /* SKRIFADAR AF RANNSOKN, LESNAR AF SYSTURSKRA SINNI. Vordurinn i
       learn.mjs les `advice_standard`, ekki `_ppr`; sa i accuracy.mjs
       les `shapes_sleeper`, ekki `_fftoday`. Baðar eru samt maelingin
       sjalf og eiga ad liggja vid hlidina a systur sinni — annars vaeri
       adeins onnur helmingur samanburdarins geymdur. */
    "advice_ppr.json": "PPR-helmingur bradanauðsynar-maelingarinnar (vordur les standard)",
    "shapes_fftoday.json": "FFToday-helmingur deildarlagna — synir ad forskotid a ADP endurtekst EKKI",
    "first4_standard_fftoday.json": "standard-fruma heitt-upphaf tilraunarinnar",

    /* KVORDUNARTILRAUNIN. Hun var svar vid "hvernig lagum vid
       Standard/FFToday -5,0%?" — greiningin var rett (thjoppun er
       OJOFN milli stada og heimildirnar tvaer hafa OFUGAR skekkjur) en
       lagfaeringin er EKKI LAERANLEG: studullinn flyst ekki milli ara
       (RB rho = -0,358). Skrain er sonnunargagnid fyrir thvi ad
       tilraunin var GERD og felld, svo hun verdi ekki endurtekin. */
    "bye_ppr_sleeper.json": "audar vikur, vikuleg talning — synt sem samhengi, raedur engu",
    "bye_ppr_fftoday.json": "sama a ohadri heimild",
    "risk_ppr_sleeper.json": "ahaetta vid valid — 0 af 24 standast",
    "risk_ppr_fftoday.json": "sama a ohadri heimild",
    "expert_persistence.json": "rod serfraedinga 2015-2025 — rho 0,370, 0 neikvaed por",
    "schedule_history.json": "linur 2019-2025; forsenda start/sit-bakprofsins",
    "startsit_standard.json": "standard-helmingur start/sit — vordur les ppr og standard",
    "sharp_ppr.json": "bord topp-15 spamanna — slaer hvorki flata samsteypu ne A-Ranking",
    "calib_standard_fftoday.json": "kvordun a spa-kvarda — felld, studullinn flyst ekki",
  };

  const { readdirSync } = await import("node:fs");
  const readAll = (d) => readdirSync(path.join(ROOT, d))
    .filter((f) => /\.(js|jsx|mjs)$/.test(f))
    .map((f) => readFileSync(path.join(ROOT, d, f), "utf8")).join("\n");
  const code = readAll("src") + readAll("tests") + readAll("scripts");

  /* Lesid = heitid kemur fyrir, med eda an endingar. Sniðmat (t.d.
     `arank_${scoring}.json`) eru ekki talin hér — thau eru profud
     annars stadar; hér er spurningin adeins hvort einhver NEFNI hana. */
  const files = readdirSync(DATA).filter((f) => f.endsWith(".json"));
  const unread = files.filter((f) =>
    !code.includes(f) && !code.includes(f.replace(/\.json$/, "")));

  const undocumented = unread.filter((f) => !KNOWN_UNREAD[f]);
  ok(undocumented.length === 0,
    `hver olesin skra ber rokstudning (an: ${undocumented.join(", ") || "engin"})`);

  /* Og listinn ma ekki standa eftir thegar skra er farin — annars
     safnast upp rokstudningur fyrir skrar sem eru ekki til. */
  const stale = Object.keys(KNOWN_UNREAD).filter((f) => !files.includes(f));
  ok(stale.length === 0,
    `listinn nefnir engar horfnar skrar (${stale.join(", ") || "hreinn"})`);

  console.log(`     ${unread.length} olesnar, allar rokstuddar sem maelingar-heimild`);
}

/* ============================================================
   ADP PER SNIDI VERDUR AD KOMA FRA SAMA MANNI
   ============================================================
   `stageAdp` bar `sleeperProj[p.id]` — en `sl.projections()` SKILAR
   FYLKI, ekki ordabok a Sleeper-audkenni, svo thetta var VISITALA i
   fylkid. `stageCore` gerdi thad rett (Map a `sleeperId`); ADP-threpid
   gerdi thad ekki, og svidid heitir auk thess `adpPpr` en ekki `adp`,
   svo PPR-linan hafdi ALDREI keyrt.

   MAELT 12.8.2026 gegn lifandi API: fylkid er 3.300 radir, svo 77 af
   1.043 leikmonnum attu audkenni SEM LENDIR INNAN thess og fimm theirra
   hefdu fengid ADP fra OSKYLDUM manni — thar a medal **Matt Prater,
   41 ara spyrnumadur, sem hefdi fengid half-ADP 5,7 fra Christian
   McCaffrey.** Hinir 966 fengu `undefined` og THOGDU.

   ============================================================
   FYRSTA UTGAFA THESSA VARDAR VAR SJALF RONG — OG THAD ER LAERDOMURINN
   ============================================================
   Hun krafdist thess ad spyrnumenn hefdu SAMA ADP i half og ppr, med
   theim rokum ad "spyrnumenn fa engar mottokur". Hun FELL a raunverulegum
   gognum: 15 af 66 spyrnumonnum/vornum bera half-ADP ~40-55 saetum LAEGRA
   en PPR-ADP (Boswell 183,9 a moti 239,4; Lutz 201,2 a moti 253,3) — og
   thad er KERFISLAEGT, ekki handahof. Handahofs-spilling myndi gefa
   handahofs-tolur.

   VILLAN I ROKUNUM: **ADP MAELIR HEGDUN, EKKI VIRDI.** Hun segir hvenaer
   FOLK draftar mann, ekki hvad hann er verdur. Half-PPR-urtakid hja
   Sleeper er minna og dregid af odrum hop, svo djupir leikmenn faerast
   kerfislaegt. Ad krefjast jafngildis var ad leggja virdi og hegdun ad
   jofnu — nakvaemlega sami flokkur og "NULL ER EKKI NULL".

   VORDURINN ER THVI A UNDIRSKRIFT VILLUNNAR, ekki a jafngildi: rangur
   madur gefur ADP ur ALLT ODRUM staerdargrod. Spyrnumadur i topp 100 i
   einu snidi og fyrir utan 150 i odru er ekki urtaksmunur — thad er
   annar madur. Prater (5,7 / 239) fellur; Boswell (183,9 / 239,4) ekki.  */
console.log("\nADP per snidi kemur fra sama manni");
{
  const fmts = (p) => [p.adpSleeper, p.adpSleeperHalf, p.adpSleeperStd]
    .filter((v) => v != null);

  /* K/DST eru aldrei raunverulegt topp-100 val i neinu sniði. Beri einn
     theirra topp-100 ADP i EINU sniði en djupt i odru er thad annar
     madur, ekki urtaksmunur. */
  const noRec = players.filter((p) => (p.pos === "K" || p.pos === "DST") &&
    fmts(p).length >= 2);
  const impossible = noRec.filter((p) => {
    const v = fmts(p);
    return Math.min(...v) < 100 && Math.max(...v) > 150;
  });
  for (const p of impossible.slice(0, 5)) {
    console.log(`     ${p.name} (${p.pos}, id ${p.id}): ${fmts(p).join(" / ")}`);
  }
  ok(impossible.length === 0,
    `enginn spyrnumadur/vorn med ADP ur tveimur staerdargrodum ` +
    `(${impossible.length} af ${noRec.length})`);

  /* Sama undirskrift hja OLLUM: topp-12 val i einu sniði og utan 150 i
     odru er ekki snid-munur heldur onnur manneskja. Vikmorkin eru rúm
     viljandi — raunverulegur snid-munur er tugir saeta, ekki hundrud. */
  const all = players.filter((p) => fmts(p).length >= 2);
  const wild = all.filter((p) => {
    const v = fmts(p);
    return Math.min(...v) < 12 && Math.max(...v) > 150;
  });
  for (const p of wild.slice(0, 5)) {
    console.log(`     ${p.name} (${p.pos}): ${fmts(p).join(" / ")}`);
  }
  ok(wild.length === 0,
    `enginn leikmadur med topp-12 ADP i einu sniði og >150 i odru ` +
    `(${wild.length} af ${all.length})`);

  /* ÞEKJA ER FULLYRDING: baðar fullyrdingarnar hér ofan eru sannar um
     TOM gogn, svo talan verdur ad fella profid. */
  ok(noRec.length >= 10,
    `og thetta var raunverulega maelt a ${noRec.length} spyrnumonnum/vornum`);
  ok(all.length >= 100, `og a ${all.length} leikmonnum med fleiri en eitt snid`);
}

/* ============================================================
   VIKULEG GOGN YFIRSTANDANDI TIMABILS — KEDJAN VERDUR AD VERA HEIL
   ============================================================
   TVAER MAELDAR NIDURSTODUR voru obrukanlegar af sömu astaedu, og hun
   var ekki likan heldur PLUMBING:

     · `usage-lab`: notkun-til-thessa lokar **12,25%** af
       start/sit-bilinu fra viku 10 (a moti 5,83%), per-leikmanns CI
       [2,54 · 8,49] i ollum thremur snidum
     · `waiver-lab`: rest-of-season gjaldmidill slaer timabils-VBD um
       **+13,2 stig/timabil** (t=2,97, 6/7 ar)

   Baðar tharfnast `weekly/{yfirstandandi ar}.json`. Kedjan hefur THRJA
   hlekki og ALLIR voru brotnir:
     1. `HISTORY` var hardkodad `[2019..2025]` — 2026 var aldrei sott
     2. `minRows: 1000` hefdi HAFNAD viku 1 (~390 radir)
     3. `history` var ekki i cron-inu, svo skrain hefdi aldrei komid
   Og fjordi: `data.js` bar engan `loadWeekly`.

   ============================================================
   FOLLIN ERU DREGIN UT OG KEYRD, EKKI FLUTT INN
   ============================================================
   `fetch-nfl.mjs` KEYRIR pipeline-id vid innflutning (thad hefur enga
   main-vord), svo `import` af henni i profi saekir net og fellur. Foll
   eru thess vegna dregin UT UR SKRANNI og keyrd — nakvaemlega sama
   adferd og `workflow-push.mjs` i FPL-hlutanum notar til ad draga
   shell-blokkina ut ur `.github/workflows/*.yml` og keyra hana a
   alvoru git-hirslum. Textaleit ein hefdi adeins sagt "linan er thar";
   hun hefdi ekki sagt hvad hun GERIR.                                 */
console.log("\nvikuleg gogn — kedjan");
{
  const srcPath = path.join(DATA, "..", "scripts", "fetch-nfl.mjs");
  const src = readFileSync(srcPath, "utf8");

  /* --- 1. `HISTORY` er LEIDD, ekki hardkodud --- */
  ok(!/const HISTORY = \[\s*2019[\s\S]{0,80}2025\s*\]/.test(src),
    "`HISTORY` er EKKI lengur hardkodadur listi sem endar 2025");

  const hy = /function historyYears\(\)\s*\{[\s\S]*?\n\}/.exec(src);
  ok(!!hy, "`historyYears()` finnst i skranni");
  if (hy) {
    /* Keyrt med hermdu `readFileSync` sem skilar raunverulegri
       `meta.json`, svo profid maeli somu leid og pipeline-id fer. */
    const meta = readFileSync(path.join(DATA, "meta.json"), "utf8");
    const fn = new Function("readFileSync", "path", "OUT", "HISTORY_FROM",
      `${hy[0]}; return historyYears();`);
    const years = fn(() => meta, path, DATA, 2019);
    const m = JSON.parse(meta);
    ok(Array.isArray(years) && years.length > 0, `skilar ari-lista (${years.length})`);
    ok(years[0] === 2019, `byrjar 2019 (${years[0]})`);
    ok(years[years.length - 1] === Number(m.season),
      `OG ENDAR A YFIRSTANDANDI TIMABILI ${m.season} (${years[years.length - 1]})`);
    ok(years.includes(Number(m.season)),
      "svo `weekly/{yfirstandandi}.json` verdur skrifud");
  }

  /* --- 2. `minRows` hleypir viku 1 i gegn en ver lokin ar --- */
  const wm = /function weeklyMinRows\([\s\S]*?\n\}/.exec(src);
  ok(!!wm, "`weeklyMinRows()` finnst");
  if (wm) {
    const f = new Function(`${wm[0]}; return weeklyMinRows;`)();
    /* Maelt: vika 1 arid 2025 ber 390 radir, vika 2 ber 385. */
    ok(f(2026, 2026) <= 390,
      `yfirstandandi ar hleypir viku 1 i gegn (${f(2026, 2026)} <= 390 radir)`);
    ok(f(2025, 2026) === 1000,
      `en lokid ar heldur throskuldinum (${f(2025, 2026)})`);
    ok(f(2019, 2026) === 1000, "og gamalt ar lika");
    /* Golfid ma ekki vera svo lagt ad tomt svar sleppi. */
    ok(f(2026, 2026) >= 50,
      `og thad er samt golf, ekki 0 (${f(2026, 2026)})`);
  }

  /* --- 3. cron-id keyrir `history` a timabilinu --- */
  const wf = readFileSync(path.join(DATA, "..", "..", ".github", "workflows",
    "nfl-data.yml"), "utf8");
  const weekly = /- cron: "0 12 \* \* 2"/.test(wf);
  ok(weekly, "vikulegt cron er i workflow-inu");
  ok(/"0 12 \* \* 2"[\s\S]{0,600}?history/.test(wf),
    "og thad kortlagast a threp sem inniheldur `history`");
  /* `core` VERDUR ad fylgja: `historyYears()` les timabilid ur
     `meta.json`, og i januar er dagsetningar-arid EKKI timabilid. */
  ok(/"0 12 \* \* 2"[\s\S]{0,600}?core,history/.test(wf),
    "og `core` fylgir svo `meta.json` se fersk");

  /* ---- 3b. RODIN I WORKFLOW-INU: PROFID KEYRIR EFTIR COMMIT ----
     ThRJAR CI-KEYRSLUR TOPUDUST A DRAFT-DAGINN af thvi ad thetta prof
     var HLID A UNDAN `git add`: stepid felldi keyrsluna, workflow-id
     stoppadi, og gognin sem hofdu verid sott — ThAR MED DAGSMYNDIN SEM
     VORDURINN VAR AD VERJA — voru hent med runner-inum.

     Rodin var snuid vid 24.8.2026. Þessi fullyrding er vordurinn a
     thvi: fari profid aftur a undan commit-inu er kaskadinn kominn til
     baka og enginn myndi sja thad fyrr en naest tapast dagur.

     BAÐAR STADSETNINGAR ERU MAELDAR, EKKI GEFNAR SER — ef annad hvort
     step finnst ekki er thad BILUN, ekki "sleppt": prof sem finnur
     ekkert og heldur afram er tomma fullyrdingin ur CLAUDE.md 5b.    */
  const iCommit = wf.indexOf("name: Committa ef eitthvad breyttist");
  const iTest = wf.indexOf("name: Profa ad gognin seu nytileg");
  ok(iCommit >= 0, "commit-stepid finnst i workflow-inu");
  ok(iTest >= 0, "og profa-stepid lika");
  ok(iCommit >= 0 && iTest >= 0 && iTest > iCommit,
    "og PROFID KEMUR EFTIR COMMIT-INU — annars hendir vordur theim " +
    "dagsmyndum sem hann ver (thrjar keyrslur toputust svona 21.8.2026)");
  /* Og thad ma EKKI vera thagad nidur: `continue-on-error` a thvi stepi
     vaeri ad slokkva a vordinum i stad thess ad faera hann. */
  const testStep = iTest >= 0 ? wf.slice(iTest, iTest + 300) : "";
  ok(!/continue-on-error/.test(testStep),
    "og thad ber EKKERT `continue-on-error` — vordurinn var faerdur, ekki slokktur");

  /* --- 4. appid hefur loader --- */
  const dj = readFileSync(path.join(DATA, "..", "src", "data.js"), "utf8");
  ok(/export const loadWeekly\s*=/.test(dj), "`data.js` ber `loadWeekly`");
  ok(/weekly\/\$\{season\}\.json/.test(dj),
    "og hun bidur um yfirstandandi timabil, ekki fast ar");
}

/* ============================================================
   TRENDING-VORDURINN — DAGURINN I DAG, EKKI "EINHVER DAGUR"
   ============================================================
   Kaflinn "trending-sagan" ad ofan spyr hvort **einhver** dagsmynd se til
   og hvort NYJASTA myndin se heilbrigd. Þad er ekki nog og thad er maelt:
   `days.length >= 1` er satt i eilifd eftir ad vistunin haettir ad keyra,
   og `newest` er tha alltaf sami gamli dagurinn — sem LES EINS OG ALLT SE
   I LAGI. Nakvaemlega thogla tomma fullyrdingin ur CLAUDE.md 5b: prof sem
   finnur eitthvad og heldur afram.

   Vordurinn hér spyr um **daginn i dag** og hann er tengdur vid cron-id:
   `core` keyrir 09:00 UTC og hefur i verki lokid **09:53-09:56** (maelt a
   fjorum keyrslum: 09:54, 09:55, 09:56, 09:53). Eftir 10:00 UTC er skra
   dagsins thvi komin — eda eitthvad er brotid.

   ============================================================
   HANN SEFUR UTAN AGUST-JANUAR, OG THAD ER FORSENDA
   ============================================================
   `/players/nfl/trending` er waiver-maelir. I mars er engin waiver-hreyfing
   og enginn draftar; skra sem vantar tha er ekki bilun. Vaeri vordurinn
   virkur allt arid yrdi hann flokkandi i sex manudi — og "flöktandi prof
   er verra en ekkert" (README 6d). Flökt kennir manni ad slokkva a
   profinu, og tha er thad slokkt i agust lika.

   ÞRJAR GREINAR OG THAER PRENTA ALLAR HVERS VEGNA. Vordur sem sefur an
   thess ad segja thad er ekki adgreinanlegur fra vordi sem er farinn.  */
console.log("\ntrending-vordurinn (dagurinn i dag)");
{
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const hour = now.getUTCHours();
  const day = now.toISOString().slice(0, 10);
  /* Agust (8) -> januar (1). Timabilid byrjar i september og NFL-vikan
     endar a manudagskvoldi, svo januar er inni; drafttidin er agust. */
  const inSeason = month >= 8 || month === 1;

  if (!inSeason) {
    console.log(`  ·    manudur ${month} er utan agust-januar — vordurinn SEFUR`);
  } else if (hour < 10) {
    console.log(`  ·    ${hour}:xx UTC er fyrir 10:00 — 09:00-cron-id er ekki lent`);
  } else {
    const file = path.join(DATA, "trending", `${day}.json`);
    ok(existsSync(file),
      `dagsmynd ${day} er til (kl. ${hour}:xx UTC, cron var kl. 09:00)`);
    if (existsSync(file)) {
      const snap = JSON.parse(readFileSync(file, "utf8"));
      /* Skra sem er til en tom er verri en skra sem vantar: hun slekkur
         a hlidinu ad ofan OG a hlidinu i `writeJson`. */
      ok(Array.isArray(snap.add) && snap.add.length >= 20,
        `og hun ber ${(snap.add || []).length} i "add" (24-klst gluggi)`);
      ok(snap.date === day, `og hun segist vera fra ${day} (${snap.date})`);
    }
  }
}

/* ============================================================
   OG HINAR DAGSETTU SERIURNAR — VORDURINN NADI ADEINS YFIR `trending`
   ============================================================
   Vordurinn ad ofan spyr um `trending/` og ekkert annad. FJORAR seriur eru
   DAGLEGAR, og thad kostadi raunveruleg gogn: `news/` **tapadi fimm dogum
   i rod** (2026-08-15 til 08-19) medan `trending/`, `adp-history/` og
   `depth/` voru heil — og ekkert prof sagdi neitt.

   OG ThAD VAR EKKI ThOGULT I `status.json`: thar stod
   `archive:news/2026-08-1X.json | REFUSED: 4 rows (minimum 20)` FYRIR
   HVERN EINASTA DAG. Hlidid vann, `Sources` birti thad — og fimm dagar
   toputust samt, thvi ENGIN FULLYRDING breytti thvi i bilun. Thess vegna
   er "skrad hofnun" EKKI nog sem undanthaga hér: hofnun sem endurtekur
   sig er ekki flökt heldur brotin serie.

   RAUNORSOKIN (maeld 19.8.2026): `site.api.espn.com` skilar **403 i
   GitHub Actions** medan `lm-api-reads.fantasy.espn.com` og
   `sports.core.api.espn.com` svara 200 UR SOMU KEYRSLU. Frettirnar koma
   ur theim fyrsta, svo `newsFeed` var TOMT og `rowCount` skilaði
   lyklafjolda umbudanna (4), ekki fjolda greina.

   ============================================================
   VORDURINN SPYR "ER HUN BROTIN NUNA", EKKI "VAR HUN EINHVERN TIMA"
   ============================================================
   Gatid 08-15..08-18 er OENDURHEIMTANLEGT og verdur aldrei fyllt. Vordur
   sem fullyrti um alla soguna gaeti thvi ALDREI ordid graen aftur — og
   "flökt kennir manni ad slokkva a profinu" (sami rokstudningur og
   svefninn ad ofan). Hann telur thvi ADEINS OSLITNA RUNU SEM ENDAR I DAG.
   Einn dagur er flökt (cron sleppt, augnabliks-403); **thrir i rod eru
   brotin serie** og tha hefdi thetta fallid 17. agust, tveimur dogum
   fyrr en uttektin fann thad.

   `weekly-ecr/` og `weekly-proj/` eru VILJANDI UTAN: hin fyrri er lyklud
   a `scrape_date` (ny skra adeins thegar FantasyPros skrapar upp a nytt)
   og hin sidari er VIKULEG med 72-tima glugga. Ad krefja thaer um daglega
   skra vaeri fullyrding um hegdun sem thaer hafa aldrei haft.         */
console.log("\ndagsettu seriurnar — oslitin runa sem endar i dag");
{
  const DAILY = ["trending", "news", "adp-history", "depth"];
  const MAX_GAP = 3;
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const hour = now.getUTCHours();
  const inSeason = month >= 8 || month === 1;

  if (!inSeason) {
    console.log(`  ·    manudur ${month} er utan agust-januar — vordurinn SEFUR`);
  } else if (hour < 10) {
    console.log(`  ·    ${hour}:xx UTC er fyrir 10:00 — 09:00-cron-id er ekki lent`);
  } else {
    const { readdirSync } = await import("node:fs");
    /* ThEKJA ER FULLYRDING: finnist engin mappa er vistunin haett og
       lykkjan nedan yrdi tom (CLAUDE.md 5b regla 1). */
    const present = DAILY.filter((s) => existsSync(path.join(DATA, s)));
    ok(present.length === DAILY.length,
      `allar ${DAILY.length} daglegu seriurnar eiga moppu (${present.join(", ")})`);

    for (const s of present) {
      const have = new Set(readdirSync(path.join(DATA, s))
        .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(0, 10)));
      /* Serie sem er alveg tom er annad mal og er hulin af kaflanum
         "dagsettu seriurnar" nedar; hér er runan sem ENDAR I DAG. */
      if (!have.size) { ok(false, `${s}/: ENGIN dagsett skra`); continue; }
      let gap = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
        if (have.has(d)) break;
        gap++;
      }
      ok(gap < MAX_GAP,
        `${s}/: ${gap} dag(a) oslitid gat sem endar i dag (thak ${MAX_GAP}) — ` +
        `${have.size} dagsettar skrar`);
    }
  }
}

/* ============================================================
   OG `market/` — SAMA SPURNING, ANDSTAEDUR GLUGGI
   ============================================================
   Serian ad ofan er AGUST-JANUAR. `market/` er ThAD GAGNSTAEDA: hun er
   FORLEIKS-SERIA og hun a ad STOPPA thegar timabilid byrjar, thvi ESPN
   fjarlaegir `odds` af loknum leikjum (maelt: 2025 vika 1 skilar 16
   leikjum og 0 med odds). Vaeri hun sett i `DAILY`-lykkjuna ad ofan
   myndi vordurinn falla HVERN DAG timabilsins fyrir retta hegdun — og
   "flökt kennir manni ad slokkva a profinu" er sama rok og svefninn thar.

   Þess vegna eigin blokk med eigin glugga. Hann er ekki agiskadur heldur
   LESINN UR `schedule.json` — sama akkeri og pipeline-id notar, svo their
   geta ekki reikad i sundur.

   GLUGGINN LOKAST SJALFUR OG ThAD ER VILJANDI: eftir 9.9.2026 sefur
   thessi vordur ad eilifu og serian er FULLGERD (16 dagsmyndir). Vordur
   sem sefur AN AD SEGJA ThAD er ekki adgreinanlegur fra vordi sem er
   farinn, svo baðar greinar prenta hvers vegna.

   ============================================================
   TIMABILID VERDUR AD VERA SIAD — FYRSTA UTGAFA ThESSA VARDAR SVAF
   ============================================================
   `schedule.json` ber **TVO timabil** (maelt: 272 REG-leikir i 2025 OG
   272 i 2026, 557 radir alls). Fyrsta utgafan sidadi adeins a
   `type === "REG"` og fekk thvi `2025-09-04` sem "fyrsta leik" — dagsetning
   sem er ThEGAR LIDIN, svo vordurinn svaf STRAX og hefdi sofid AD EILIFU.
   Hann var skrifadur i dag og var thegar daudur.

   `firstRegKickoffMs` i pipeline-inu sidar a timabil og var alltaf rett;
   ThAD VAR PROFID SEM VAR RANGT. Þess vegna er timabilid tekid ur
   `meta.json` (sama heimild og `historyYears()` notar, og i januar er
   dagsetningar-arid EKKI timabilid) OG fullyrt um ad dagsetningin sem
   fannst tilheyri thvi timabili — annars getur sama villa endurtekid sig
   thegjandi.                                                          */
console.log("\nmarket-vordurinn (forleiks-serian)");
{
  const now = new Date();
  const hour = now.getUTCHours();
  const day = now.toISOString().slice(0, 10);
  const meta = has("meta.json") ? read("meta.json") : null;
  const season = meta && Number.isFinite(Number(meta.season))
    ? Number(meta.season) : null;
  /* ThEKJA ER FULLYRDING: an timabils getur vordurinn ekki spurt, og
     thad ma ekki lesast eins og "allt i lagi". */
  ok(season != null, `timabilid er lesid ur meta.json (${season})`);
  const reg = (schedule || [])
    .filter((g) => Number(g.season) === season && g.type === "REG" && g.date)
    .map((g) => g.date).sort();
  const first = reg.length ? reg[0] : null;
  /* OG ThETTA ER VORDURINN A VILLUNNI SEM VAR HER: dagsetningin verdur ad
     tilheyra yfirstandandi timabili. Færi sian ut myndi hun skila
     2025-09-04 og thessi rod felli — i stad thess ad vordurinn svaefi. */
  ok(first == null || first.startsWith(String(season)) ||
     first.startsWith(String(season + 1)),
    `fyrsti leikur (${first}) tilheyrir timabilinu ${season}, ` +
    `ekki fyrra ari (schedule.json ber BAÐI)`);

  if (!first) {
    console.log("  ·    engin REG-leikjaskra — vordurinn getur ekki spurt");
  } else if (day >= first) {
    console.log(`  ·    ${day} >= fyrsti leikur ${first} — serian er FULLGERD, ` +
                "vordurinn SEFUR (ESPN ber engin odds a loknum leikjum)");
  } else if (hour < 10) {
    console.log(`  ·    ${hour}:xx UTC er fyrir 10:00 — 09:00-cron-id er ekki lent`);
  } else {
    const dir = path.join(DATA, "market");
    ok(existsSync(dir), `data/market/ er til (forleikur, fyrsti leikur ${first})`);
    if (existsSync(dir)) {
      const { readdirSync } = await import("node:fs");
      const have = new Set(readdirSync(dir)
        .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(0, 10)));
      /* Sama MAX_GAP og hinar daglegu: einn dagur er flökt (sleppt cron),
         thrir i rod eru brotin serie. Glugginn er adeins ~16 dagar, svo
         hver tapadur dagur er 6% af serunni — thakid er ekki rumt. */
      let gap = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
        if (have.has(d)) break;
        gap++;
      }
      ok(gap < 3,
        `market/: ${gap} dag(a) oslitid gat sem endar i dag (thak 3) — ` +
        `${have.size} dagsmynd(ir) fyrir fyrsta snapp`);
    }
  }
}

/* ============================================================
   DAGSETTU SERIURNAR — SEX HEIMILDIR SEM VORU ALDREI KALLADAR
   ============================================================
   `sl.projections(season, week)`, `nv.snapCounts`, `nv.depthCharts`,
   `fp.WEEKLY_MIRROR`, frettasafnid og FFC-ADP voru OLL til i kodanum og
   **enginn kalladi thau**. Prof sem laesi adeins "er fallid rett?" hefdi
   verid graent allan thann tima — thad er `wiring.mjs`-gatid i sinni
   hreinustu mynd, faert yfir a pipeline-id.

   ÞETTA ER KEYRT A TILBUNUM GOGNUM, EKKI A LIFANDI SVORUM. Astaedan er
   maeld: `snap_counts_2026.csv` er **404** i dag (timabilid er ekki byrjad)
   og gluggi vikulegu spárinnar opnast ekki fyrr en **6.9.2026**. Hvorug
   leidin er thvi keyranleg i beinni i agust, og "kodi sem kviknar fyrst
   einn morgun er ekki asaettanlegur omaeldur" (CLAUDE.md kafli 5).

   FOLLIN ERU DREGIN UT UR SKRANNI, EINS OG KAFLINN "vikuleg gogn" GERIR:
   `fetch-nfl.mjs` keyrir pipeline-id vid innflutning, svo `import` saekir
   net og fellur.                                                        */
console.log("\ndagsettar seriur — hlidin, a tilbunum gognum");
{
  const { mkdtempSync, existsSync: ex, writeFileSync, readFileSync: rf,
          mkdirSync, readdirSync: rd } = await import("node:fs");
  const os = await import("node:os");
  const srcPath = path.join(ROOT, "scripts", "fetch-nfl.mjs");
  const src = readFileSync(srcPath, "utf8");
  const bare = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  /* Sama `rowCount` og adalkaflinn notar — hun er endurtekin thar
     viljandi svo profid falli ef HEGDUNIN breytist. */
  const rowCount = (d, depth = 0) => {
    if (Array.isArray(d)) {
      let best = d.length;
      if (depth < 4) for (const v of d) {
        const n = rowCount(v, depth + 1); if (n > best) best = n;
      }
      return best;
    }
    if (!d || typeof d !== "object") return 0;
    let best = 0;
    if (depth < 4) for (const v of Object.values(d)) {
      const n = rowCount(v, depth + 1); if (n > best) best = n;
    }
    return best || Object.keys(d).length;
  };

  /* ---------- A. `writeOnce` — thrju hlid, hvert fyrir sig ---------- */
  const woSrc = /async function writeOnce\([\s\S]*?\n\}/.exec(src);
  ok(!!woSrc, "`writeOnce()` finnst i skranni");
  if (woSrc) {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "nfl-archive-"));
    const logged = [];
    const { mkdir, writeFile, stat } = await import("node:fs/promises");
    const make = () => new Function("stat", "mkdir", "writeFile", "path", "OUT",
      "rowCount", "record", `${woSrc[0]}; return writeOnce;`)(
      stat, mkdir, writeFile, path, tmp, rowCount,
      (name, ok2, note) => { logged.push({ name, ok: ok2, note }); });

    const writeOnce = make();
    const FULL = { add: new Array(100).fill(0).map((_, i) => ({ id: i })) };

    /* HLID 3 — heil gogn skrifast. */
    const wrote = await writeOnce("probe/2026-01-01.json", FULL, { minRows: 20 });
    ok(wrote === true, "heil gogn: skrifud (true)");
    ok(ex(path.join(tmp, "probe/2026-01-01.json")), "og skrain er a disknum");

    /* HLID 1 — skra sem er TIL er ONEMANDI og ma ekki skrifast ofan i. */
    const before = rf(path.join(tmp, "probe/2026-01-01.json"), "utf8");
    logged.length = 0;
    const again = await writeOnce("probe/2026-01-01.json",
      { add: new Array(999).fill(0).map((_, i) => ({ id: i })) }, { minRows: 20 });
    const after = rf(path.join(tmp, "probe/2026-01-01.json"), "utf8");
    ok(again === false, "skra sem er til: EKKERT skrifad (false)");
    ok(before === after,
      "OG INNIHALDID ER OBREYTT — endurskrifud saga er retro-fitting");
    /* ONEMANDI: engin rod i `status.json`. Dagur sem er thegar vistadur
       er ekki adgerd og ma ekki fylla heimildaskrana. */
    ok(logged.length === 0, "og hun skrair sig EKKI (onemandi, ekki villa)");

    /* HLID 2 — thunn gogn: ekkert skrifad, OG thad ER skrad. */
    logged.length = 0;
    const thin = await writeOnce("probe/2026-01-02.json",
      { add: [{ id: 1 }, { id: 2 }] }, { minRows: 20 });
    ok(thin === false, "thunn gogn: ekkert skrifad");
    ok(!ex(path.join(tmp, "probe/2026-01-02.json")),
      "og EKKERT skilid eftir — halfskrifud dagsmynd er verri en engin");
    ok(logged.length === 1 && logged[0].ok === false,
      "en hun ER skrad sem villa (thogn hér vaeri bilunin)");
    ok(logged.length === 1 && /REFUSED/.test(logged[0].note || ""),
      `og notan segir hvers vegna ("${(logged[0] || {}).note || ""}")`);

    /* Og su tholu-mynd sem THETTA repo maeldi: 13.8.2026 skilaði ESPN
       3 greinum. Sama tala, sama hlid. */
    logged.length = 0;
    const espn = await writeOnce("probe/2026-01-03.json",
      { articles: [{ h: 1 }, { h: 2 }, { h: 3 }] }, { minRows: 20 });
    ok(espn === false,
      "ESPN-dagurinn (3 greinar, maelt 13.8.2026) hefdi EKKI verid fryst rangur");
  }

  /* ---------- B. `upcomingWeek` — glugginn ---------- */
  const uwSrc = /function upcomingWeek\([\s\S]*?\n\}/.exec(src);
  ok(!!uwSrc, "`upcomingWeek()` finnst i skranni");
  /* Glugginn er LESINN UR KODANUM, ekki endurritadur hér. Faeri hann ur
     72 klst i 24 myndi "thrju taekifaeri"-fullyrdingin nedar falla — sem
     er retta hegdunin, thvi hun er astaedan fyrir tolunni. */
  const pw = /const PROJ_WINDOW_H = (\d+);/.exec(src);
  ok(!!pw, `\`PROJ_WINDOW_H\` er fasti i skranni (${pw ? pw[1] : "?"} klst)`);
  const WINDOW_H = pw ? Number(pw[1]) : 72;
  ok(WINDOW_H >= 48,
    `og hann er >= 48 klst — daglegur cron tharf fleiri en eitt taekifaeri (${WINDOW_H})`);
  if (uwSrc) {
    const upcomingWeek = new Function("PROJ_WINDOW_H",
      `${uwSrc[0]}; return upcomingWeek;`)(WINDOW_H);
    /* Tilbuin leikjaskra: thrjar vikur, viku-bil eins og i raunveruleikanum. */
    const games = [
      { season: 2026, week: 1, type: "REG", date: "2026-09-09" },
      { season: 2026, week: 1, type: "REG", date: "2026-09-13" },
      { season: 2026, week: 2, type: "REG", date: "2026-09-17" },
      { season: 2026, week: 3, type: "REG", date: "2026-09-24" },
      /* Annad timabil OG annad snid mega ekki smitast inn. */
      { season: 2025, week: 5, type: "REG", date: "2025-10-05" },
      { season: 2026, week: 1, type: "PRE", date: "2026-08-01" },
    ];
    const ms = (s) => Date.parse(s);

    const far = upcomingWeek(games, 2026, ms("2026-08-14T09:00:00Z"));
    ok(far && far.week === 1, `14.8.: naesta vika er 1 (${far && far.week})`);
    ok(far && far.inWindow === false,
      "OG VID ERUM UTAN GLUGGANS — 26 dagar fyrir leik skrifar EKKERT");

    /* 72 klst fyrir akkerid (midnaetti UTC a 9.9.) = 6.9. kl. 00:00. */
    const justBefore = upcomingWeek(games, 2026, ms("2026-09-05T09:00:00Z"));
    ok(justBefore && justBefore.inWindow === false,
      "5.9. kl. 09 er enn utan (glugginn opnar 6.9. kl. 00)");
    const inside = upcomingWeek(games, 2026, ms("2026-09-06T09:00:00Z"));
    ok(inside && inside.week === 1 && inside.inWindow === true,
      "6.9. kl. 09 er INNAN gluggans -> vika 1 er vistud");
    /* THRJU TAEKIFAERI — thad er kjarninn i thvi ad velja 72 klst med
       daglegum cron. Eitt sleppt cron ma ekki kosta vikuna. */
    const chances = ["2026-09-06", "2026-09-07", "2026-09-08"]
      .filter((d) => (upcomingWeek(games, 2026, ms(`${d}T09:00:00Z`)) || {}).inWindow);
    ok(chances.length === 3,
      `og 09:00-cron-id faer ${chances.length} taekifaeri (thrju)`);

    /* Vika sem ER BYRJUD ma ALDREI vera valin — thad vaeri leki. */
    const during = upcomingWeek(games, 2026, ms("2026-09-11T09:00:00Z"));
    ok(during && during.week === 2,
      `eftir upphaf viku 1 faerist akkerid a viku 2 (${during && during.week})`);
    /* Sidasta vikan lidin -> null, ekki hrun og ekki vika 1 aftur. */
    const over = upcomingWeek(games, 2026, ms("2026-12-01T09:00:00Z"));
    ok(over === null, "timabilid buid -> null (engin skra, ekkert hrun)");
    /* Akkerid er MIDNAETTI UTC a leikdegi — viljandi ~24 klst FYRR en
       raunverulegt upphaf (20:20 ET = 00:20 UTC naesta dag). Skekkjan
       ma adeins vera i thessa att. */
    ok(inside && inside.anchor === ms("2026-09-09T00:00:00Z"),
      "akkerid er midnaetti UTC a leikdegi (varfaerin att)");
    ok(inside.anchor < ms("2026-09-10T00:20:00Z"),
      "og thad er FYRIR raunverulegt upphaf — engin spa eftir kickoff");
  }

  /* ---------- C. `mergeSnapCounts` — tom sokn ma ekki thurrka ut ---------- */
  const msSrc = /async function mergeSnapCounts\([\s\S]*?\n\}/.exec(src);
  ok(!!msSrc, "`mergeSnapCounts()` finnst i skranni");
  if (msSrc) {
    const mkMerge = (nv, log = []) => ({
      fn: new Function("nv", "record", `${msSrc[0]}; return mergeSnapCounts;`)(
        nv, (n, o, note) => log.push({ n, ok: o, note })),
      log,
    });
    /* Bru af raunhaefri staerd — fallid hafnar thynnri bru viljandi. */
    const bridgePlayers = new Array(1500).fill(0)
      .map((_, i) => ({ id: `00-000${i}`, pfrId: `Pfr${i}` }));

    /* C1 — venjulega tilfellid.
       AUDKENNIN ERU VILJANDI UTAN `00-000*`-bilsins sem fylli-brun notar:
       fyrsta utgafa thessa profs let `00-0002` renna saman vid fylli-rod
       (`00-000${i}` fyrir i=2) og MADURINN SEM ATTI AD VERA AN SNAP-GAGNA
       fekk snoppin ur fyllingunni. Profid felldi tha rettan kóda. */
    {
      /* HLUTFALLID I THESSU FIXTURE VAR 1 AF 2 (50%) OG VARD MARKTAEKT
         19.8.2026: hlidid nedan er nu HLUTFALLSLEGT (golf 0,90) i stad
         `byKey.size < 100`, svo 50% fixture hefdi verid HAFNAD og profid
         hefdi fallid a fixture-inu og ekki a hegduninni.
         Fixture-id ber nu RAUNHAEFT hlutfall: 19 af 20 parast (95%), sem
         er innan maelda bilsins (99,8-100,0% a sjo arum) — og fullyrdingin
         sem mali skiptir er OBREYTT: sa EINI sem a enga snap-rod faer
         null, ekki 0.                                                   */
      const weekly = { 2026: [
        ...new Array(19).fill(0).map((_, i) => ({ id: `TEST-A${i}`, week: 1, ppr: 10 })),
        { id: "TEST-B", week: 1, ppr: 5 },     // a ENGA snap-rod
      ] };
      const snaps = new Array(120).fill(0)
        .map((_, i) => ({ pfrId: `Pfr${i}`, week: 1, snaps: 10, pct: 0.5 }));
      for (let i = 0; i < 19; i++) {
        snaps.push({ pfrId: `PfrA${i}`, week: 1, snaps: 61, pct: 0.87 });
      }
      const nv = {
        players: async () => [...bridgePlayers,
          ...new Array(19).fill(0).map((_, i) => ({ id: `TEST-A${i}`, pfrId: `PfrA${i}` }))],
        snapCounts: async () => snaps,
      };
      const { fn } = mkMerge(nv);
      await fn(weekly, [2026]);
      ok(weekly[2026][0].snaps === 61 && weekly[2026][0].snapPct === 0.87,
        "snap-hlutfall sameinast um pfr-bruna (61 snopp, 0,87)");
      /* NULL ER EKKI NULL: sa sem a enga snap-rod faer null, EKKI 0.
         Snap-hlutfall 0 thydir "spiladi ekki eitt snapp" og er allt
         annad mal en "vantar". */
      ok(weekly[2026][19].snaps === null && weekly[2026][19].snapPct === null,
        "rod an snap-gagna faer NULL, ekki 0");
    }

    /* ============================================================
       C1b — HALFSOTT SNAP-SKRA MA EKKI SKRIFA NULL YFIR THOLUR
       ============================================================
       ThETTA HLID VAR I VERKI OVIRKT. Thad stod `byKey.size < 100` medan
       raunveruleg staerd er **23.829-26.573** (maelt a ollum sjo arum), svo
       thad la vid ~0,4% og gat ekki fallid. Og lykkjan skrifar `null` yfir
       HVERJA rod sem ekki parast, svo halfsott skra hefdi thurrkad ut
       ~3.600 raunverulegar tholur i 6.637-rada ari — nakvaemlega thad sem
       C2 ver gegn i 404-tilfellinu, en gegnum hurd sem stod opin.

       Herman: 20 vikulegar radir sem ALLAR bera snopp thegar, en snap-skran
       kemur adeins med 10 (50%). Golfid er 0,90, svo arinu er sleppt OSNERTU.
       Sja `SNAP_FLOOR` i fetch-nfl.mjs fyrir maelinguna sem valdi 0,90.   */
    {
      const weekly = { 2026: new Array(20).fill(0)
        .map((_, i) => ({ id: `HALF-${i}`, week: 1, ppr: 10, snaps: 61, snapPct: 0.87 })) };
      const snaps = new Array(120).fill(0)
        .map((_, i) => ({ pfrId: `Pfr${i}`, week: 1, snaps: 10, pct: 0.5 }));
      for (let i = 0; i < 10; i++) {                       // ADEINS HALF SKRAIN
        snaps.push({ pfrId: `PfrH${i}`, week: 1, snaps: 5, pct: 0.11 });
      }
      const nv = {
        players: async () => [...bridgePlayers,
          ...new Array(20).fill(0).map((_, i) => ({ id: `HALF-${i}`, pfrId: `PfrH${i}` }))],
        snapCounts: async () => snaps,
      };
      const { fn, log } = mkMerge(nv);
      await fn(weekly, [2026]);
      const untouched = weekly[2026].filter((r) => r.snaps === 61).length;
      ok(untouched === 20,
        `HALFSOTT SKRA (50%): allar 20 radir OSNERTAR (${untouched}) — ` +
        "engin thola thurrkud ut");
      ok(weekly[2026].every((r) => r.snaps !== null),
        "og EKKERT null skrifad ofan i tholu sem var til");
      ok(log.some((l) => l.ok === false && /floor is 90%/.test(l.note || "")),
        "og hofnunin er skrad MED hlutfallinu og golfinu");
    }

    /* C2 — ÞETTA ER PROFSTEINNINN. `snap_counts_2026.csv` er 404 i dag.
       Tom sokn ma ekki skrifa null yfir tholu sem er thegar til. */
    {
      const weekly = { 2026: [{ id: "00-0001", week: 1, ppr: 10, snaps: 61, snapPct: 0.87 }] };
      const nv = {
        players: async () => bridgePlayers,
        snapCounts: async () => [],            // 404, maelt 14.8.2026
      };
      const { fn, log } = mkMerge(nv);
      await fn(weekly, [2026]);
      ok(weekly[2026][0].snaps === 61 && weekly[2026][0].snapPct === 0.87,
        "TOM SNAP-SOKN (404): tholur sem voru til STANDA OSNERTAR");
      ok(log.some((l) => /no snap file/.test(l.note || "")),
        "og thad er skrad hvad var sleppt (ekki thogult)");
    }

    /* C3 — thunn bru: ekkert audgad, allt latid i frid. */
    {
      const weekly = { 2026: [{ id: "00-0001", week: 1, snaps: 61 }] };
      const nv = {
        players: async () => [{ id: "00-0001", pfrId: "PfrA" }],   // 1 rod
        snapCounts: async () => [{ pfrId: "PfrA", week: 1, snaps: 5, pct: 0.1 }],
      };
      const { fn, log } = mkMerge(nv);
      await fn(weekly, [2026]);
      ok(weekly[2026][0].snaps === 61,
        "thunn bru (1 audkenni): radirnar eru EKKI audgadar");
      ok(log.some((l) => l.ok === false && /thin bridge/.test(l.note || "")),
        "og hofnunin er skrad");
    }

    /* C4 — bruin sjalf brestur (nflverse nidri). */
    {
      const weekly = { 2026: [{ id: "00-0001", week: 1, snaps: 61 }] };
      const nv = {
        players: async () => { throw new Error("HTTP 500"); },
        snapCounts: async () => { throw new Error("skal ekki kallast"); },
      };
      const { fn, log } = mkMerge(nv);
      await fn(weekly, [2026]);
      ok(weekly[2026][0].snaps === 61, "bru sem brestur: radirnar OSNERTAR");
      ok(log.some((l) => l.ok === false && /bridge unavailable/.test(l.note || "")),
        "og bilunin er skrad, ekki gleypt");
    }
  }

  /* ---------- D. `depthCharts` — TVO SNID, og thad gamla las 0 radir ----------
     nflverse skipti um snid milli 2024 og 2025 og gamli lesturinn skiladi
     **0 rodum sem `ok`**. Herman keyrir thattarann a BADUM hausum. */
  {
    const nvSrc = readFileSync(path.join(ROOT, "scripts", "sources", "nflverse.mjs"), "utf8");
    const dcSrc = /export async function depthCharts\([\s\S]*?\n\}/.exec(nvSrc);
    ok(!!dcSrc, "`depthCharts()` finnst i nflverse.mjs");
    if (dcSrc) {
      const { rows: csvRows } = await import("../scripts/lib/csv.mjs");
      const { num, str } = await import("../scripts/lib/csv.mjs");
      const { normPos } = await import("../src/scoring.js");
      const { normTeam: nt } = await import("../src/names.js");
      const build = (text, log = []) => ({
        fn: new Function("getText", "csvRows", "num", "str", "normPos", "normTeam",
          "record", "REL", `${dcSrc[0].replace(/^export /, "")}; return depthCharts;`)(
          async () => text, csvRows, num, str, normPos, nt,
          (n, o, note) => log.push({ n, ok: o, note }), "http://x"),
        log,
      });

      /* D1 — NYJA snidid (2025+). Tvaer dagsmyndir svo `latestOnly` se profud. */
      const NEW = [
        "dt,team,player_name,espn_id,gsis_id,pos_grp_id,pos_grp,pos_id,pos_name,pos_abb,pos_slot,pos_rank",
        "2026-08-13T08:15:32Z,ARI,Gamli Madur,111,00-0000111,11,3WR 1TE,1,Quarterback,QB,9,1",
        "2026-08-14T08:10:38Z,ARI,Kyler Murray,222,00-0000222,11,3WR 1TE,1,Quarterback,QB,9,1",
        "2026-08-14T08:10:38Z,ARI,Trey McBride,333,00-0000333,11,3WR 1TE,2,Tight End,TE,10,1",
        "2026-08-14T08:10:38Z,ARI,Spyrnu Madur,444,00-0000444,17,Special Teams,3,Place Kicker,PK,1,1",
        "2026-08-14T08:10:38Z,ARI,Full Bakki,555,00-0000555,11,3WR 1TE,4,Fullback,FB,5,2",
        "2026-08-14T08:10:38Z,ARI,Vinstri Kantur,666,00-0000666,16,Base 4-3 D,5,Left Defensive End,LDE,1,1",
        "2026-08-14T08:10:38Z,ARI,Enginn Gsis,777,NA,11,3WR 1TE,6,Wide Receiver,WR,1,3",
        "",
      ].join("\n");
      /* ============================================================
         VAENTINGIN ER LEIDD AF `normPos`, EKKI HARDKODUD — OG THAD ER
         EKKI VARKARNI HELDUR NAUDSYN
         ============================================================
         Radirnar hér eru 7: 5 fantasy-stodur, 1 varnarstada (LDE) og
         1 an `gsis_id` (fellur alltaf). Hvort LDE-rodin kemur ut
         raedst ALGERLEGA af `normPos` i `src/scoring.js` — og thad fall
         er I MIDRI BREYTINGU A NAKVAEMLEGA THESSU: notan thar segir ad
         staða utan fantasy fari OBREYTT ut og "MA EKKI VERDA `: null`",
         medan kodinn i somu breytingu ER `: null`.
         Hardkodud tala hér vaeri thvi prof sem fellur (eda staest) af
         astaedu sem hefur EKKERT ad gera med thattarann sem er profadur.
         Spurningin sem THESSI kafli eigi ad svara er "les thattarinn
         nyja snidid?", ekki "hvad gerir `normPos` vid LDE?".            */
      const defOut = normPos("LDE") ? 1 : 0;
      {
        const { fn, log } = build(NEW);
        const all = await fn(2026);
        ok(all.length === 5 + defOut,
          `nyja snidid: ${5 + defOut} radir lesnar ur 7 ` +
          `(ein an gsis fellur; varnarstada ${defOut ? "kemur ut" : "siast burt"} ` +
          `— normPos("LDE") = ${JSON.stringify(normPos("LDE"))}) — fekkst ${all.length}`);
        /* Fantasy-radirnar eru THAER SEM VISTUNIN GEYMIR og thaer eru
           OHAGGADAR af theirri spurningu. Fullyrding a theim er thvi
           sterkari en a heildartolunni. */
        const fanOnly = all.filter((r) => ["QB", "RB", "WR", "TE", "K"].includes(r.pos));
        ok(fanOnly.length === 5,
          `og fantasy-radirnar eru 5 hvernig sem normPos leysist (${fanOnly.length})`);
        /* ÞETTA ER VILLAN SEM VAR: 0 radir og `ok`. */
        ok(all.length > 0 && log[0] && log[0].ok === true,
          "og hun skrair sig sem `ok` MED radir (adur: 0 radir OG `ok`)");
        ok(/new schema/.test((log[0] || {}).note || ""),
          "notan nefnir hvort snidid var lesid");
        const qb = all.find((r) => r.name === "Kyler Murray");
        ok(qb && qb.pos === "QB" && qb.depth === 1 && qb.slot === 9,
          "`pos_rank` -> `depth` (dyptar-rod) og `pos_slot` -> `slot` (leikskipulag)");
        ok(qb && qb.week === null && qb.dt === "2026-08-14T08:10:38Z",
          "`week` er null i nyja snidinu og `dt` ber timastimpilinn — hvorugt logid");
        /* `pos` VAR OSKRIFAD I FYRSTU UTGAFU THESSA THATTARA og sian
           notadi thad samt, svo utkoman bar 975 radir MED `pos:
           undefined`. Fullyrding sem nefnir svidid berum orðum. */
        ok(all.every((r) => r.pos != null),
          "HVER rod ber `pos` (fyrsta utgafan sleppti thvi ur utkomunni)");
        ok(all.some((r) => r.pos === "K"), "PK -> K");
        ok(all.some((r) => r.pos === "RB"), "FB -> RB");
        const latest = await fn(2026, { latestOnly: true });
        ok(latest.length === 4 + defOut,
          `latestOnly skilar ADEINS nyjustu myndinni ` +
          `(${latest.length} af ${5 + defOut})`);
        ok(!latest.some((r) => r.name === "Gamli Madur"),
          "og gaerdagurinn er ekki i henni");
        ok(latest.every((r) => r.dt === "2026-08-14T08:10:38Z"),
          "og HVER rod i henni ber sama `dt` — thess vegna ma hann strippast");
      }

      /* D2 — GAMLA snidid (<= 2024) verdur ad halda afram ad lesast. */
      const OLD = [
        "season,club_code,week,game_type,depth_team,last_name,first_name,football_name,formation,gsis_id,jersey_number,position,elias_id,depth_position,full_name",
        "2024,ATL,1,REG,1,Lindstrom,Christopher,Chris,Offense,00-0035630,63,G,LIN451080,RG,Chris Lindstrom",
        "2024,ATL,3,REG,2,Dwelley,Ross,Ross,Offense,00-0034073,85,TE,DWE123456,TE,Ross Dwelley",
        "",
      ].join("\n");
      {
        const { fn, log } = build(OLD);
        const all = await fn(2024);
        ok(all.length >= 1, `gamla snidid les afram (${all.length} radir)`);
        const te = all.find((r) => r.name === "Ross Dwelley");
        ok(te && te.pos === "TE" && te.week === 3 && te.depth === 2,
          "og `week`/`depth_team` koma rett ut (vika 3, dypt 2)");
        ok(te && te.dt === null, "`dt` er null i gamla snidinu");
        ok(/legacy schema/.test((log[0] || {}).note || ""),
          "notan segir ad thetta se gamla snidid");
      }

      /* D3 — skra sem er BARA HAUS ma ekki lesast sem "i lagi". */
      {
        const { fn, log } = build(
          "dt,team,player_name,espn_id,gsis_id,pos_grp_id,pos_grp,pos_id,pos_name,pos_abb,pos_slot,pos_rank\n");
        const all = await fn(2027);
        ok(all.length === 0 && log[0] && log[0].ok === false,
          "haus an rada -> 0 radir OG skrad sem VILLA");
      }
    }
  }

  /* ---------- E. `weeklyEcr` — lyklud a `scrape_date`, ekki a i dag ---------- */
  {
    const fpSrc = readFileSync(path.join(ROOT, "scripts", "sources", "fantasypros.mjs"), "utf8");
    const weSrc = /export async function weeklyEcr\([\s\S]*?\n\}/.exec(fpSrc);
    ok(!!weSrc, "`weeklyEcr()` finnst i fantasypros.mjs");
    if (weSrc) {
      const { objects, missingCols, str } = await import("../scripts/lib/csv.mjs");
      const { normPos } = await import("../src/scoring.js");
      const build = (text, log = []) => ({
        fn: new Function("getText", "objects", "missingCols", "str", "normPos",
          "numOrNull", "record", "WEEKLY_MIRROR",
          `${weSrc[0].replace(/^export /, "")}; return weeklyEcr;`)(
          async () => text, objects, missingCols, str, normPos,
          (v) => { if (v == null || v === "" || v === "-") return null;
                   const x = Number(v); return Number.isFinite(x) ? x : null; },
          (n, o, note) => log.push({ n, ok: o, note }), "http://x"),
        log,
      });
      const CSV = [
        '"page","page_pos","scrape_date","fantasypros_id","player_name","pos","team","rank","ecr","sd","best","worst","player_bye_week","player_owned_avg","player_opponent","player_ecr_delta","recommendation","pos_rank","start_sit_grade","r2p_pts"',
        '"qb","QB",2025-12-30,"19196","Joe Burrow","QB","CIN",1,1.42,0.7,1,4,"10",96.5,"vs. ARI",NA,"start","QB1","A+","22.1"',
        '"qb","QB",2025-12-23,"23046","Drake Maye","QB","NE",2,2.03,1,1,6,"14",97.5,"at NYJ",2,"start","QB2","A","21.3"',
        "",
      ].join("\n");
      const { fn } = build(CSV);
      const w = await fn();
      ok(w && w.players.length === 2, `2 radir lesnar (${w && w.players.length})`);
      /* ÞETTA ER KJARNINN: heitid kemur ur GOGNUNUM. I dag ber lifandi
         skrain `2025-12-30` — sidustu viku FYRRA timabils. Vaeri hun
         vistud undir dagsetningu dagsins hefdum vid skrifad ~60 EINS
         skrar sem allar heita eitt en innihalda annad. */
      ok(w && w.scrapeDate === "2025-12-30",
        `lykillinn er NYJASTA scrape_date ur gognunum (${w && w.scrapeDate})`);
      ok(w && w.scrapeDate !== new Date().toISOString().slice(0, 10),
        "og hann er EKKI dagurinn i dag (maelt: speglunin er fra 2025-12-30)");
      const b = w.players[0];
      ok(b.grade === "A+" && b.posRank === "QB1" && b.ecr === 1.42,
        "start/sit-einkunn, stodu-rod og ECR koma med");
      /* Tom/thunn skra -> null, ekki hlutur med tomu fylki. Kallandinn
         hleypir tha engu i `writeOnce`. */
      const empty = build('"page","scrape_date","fantasypros_id","player_name"\n');
      ok((await empty.fn()) === null, "tom skra -> null (ekkert vistad)");
      ok(empty.log.some((l) => l.ok === false), "og thad er skrad");
    }
  }

  /* ---------- F. ERU THAU RAUNVERULEGA KOLLUD? ----------
     Follin voru rett ADUR — thau voru bara aldrei kollud. Athugasemdir
     eru skornar burt fyrst: hver einasta notu hér nefnir slodina sem
     hun utskyrir og myndi annars uppfylla profid sjalf. */
  ok(/archiveDaily\(/.test(bare), "`archiveDaily` er KOLLUD, ekki bara skilgreind");
  ok(/sl\.projections\(\s*season\s*,\s*up\.week\s*\)/.test(bare),
    "`sl.projections` er kollud MED VIKU (adur: adeins arstidar-summa)");
  ok(/nv\.snapCounts\(/.test(bare), "`nv.snapCounts` er kollud");
  ok(/mergeSnapCounts\(\s*weekly/.test(bare),
    "og sameiningin er kollud UR `stageHistory` med vikulegu rodunum");
  ok(/nv\.depthCharts\(/.test(bare), "`nv.depthCharts` er kollud");
  ok(/fp\.weeklyEcr\(/.test(bare), "`fp.weeklyEcr` er kollud (WEEKLY_MIRROR var kallandalaus)");
  /* ============================================================
     GLUGGINN VERDUR AD VERA SPURDUR, EKKI BARA REIKNADUR
     ============================================================
     `upcomingWeek` er profud i kafla B og hun er RETT — en kafli B kallar
     hana BEINT. Hyrfi `if (!up.inWindow)` ur `archiveDaily` yrdi kafli B
     AFRAM GRAENN medan vikuleg spa vaeri fryst 26 dogum fyrir leik, sem er
     nakvaemlega villan sem glugginn er til ad hindra (GW1-rodin i FPL,
     skrifud 222 klst fyrir frest). Þetta er `wiring.mjs`-gatid: hreint
     fall getur verid fullkomlega profad og samt aldrei kallad — eda
     kallad og svarid hunsad.                                            */
  ok(/if\s*\(\s*!up\.inWindow\s*\)/.test(bare),
    "og SVARID ER SPURT — `!up.inWindow` stydur soknina");
  ok(/upcomingWeek\(\s*games/.test(bare),
    "og hun er kollud med leikjaskranni (ekki `state.week`)");
  /* Dyra soknin (8,5 MB) ma ekki fara fram ef dagurinn er thegar vistadur. */
  ok(/archived\(name\)/.test(bare),
    "`archived()` er spurt A UNDAN dyru soknunum (8,5 MB dyptartafla)");

  ok(/news\/\$\{day\}\.json/.test(bare), "frettasafnid er skrifad");
  ok(/adp-history\/\$\{/.test(bare), "ADP-serian er skrifud");
  /* ADP-serian verdur ad vera i BADUM threpum: `--stage=adp` keyrir
     00,03,06,12,15,18 UTC i agust-september en `core` adeins kl. 09. */
  const adpHits = (bare.match(/adp-history\/\$\{/g) || []).length;
  ok(adpHits >= 2,
    `og i BADUM threpum (${adpHits} kallstadir — core kl. 09, adp kl. 00 o.s.frv.)`);

  /* ---------- F2. VIKULEG SPA: `minRows` MA EKKI VERA TOM FULLYRDING ----------
     Maelt: vika 1 2026 ber 3.300 radir en adeins 580 med `pts_ppr`.
     Vaeru allar radirnar vistadar yrdi `rowCount` **alltaf 3.300** og
     golfid `minRows: 100` gaeti ALDREI fallid — thad myndi frysta viku
     med 3.300 nullum sem "i lagi". Sama gildra og `market.json` ("rod er
     farmur, ekki umbudir"), einu lagi innar. */
  {
    const mk = (n) => new Array(n).fill(0).map((_, i) => ({ sleeperId: `${i}`, ppr: null }));
    const allNull = { season: 2026, week: 1, players: mk(3300) };
    ok(rowCount(allNull) === 3300,
      `3.300 radir af nullum bera rowCount ${rowCount(allNull)} — golfid 100 SER THAER EKKI`);
    const filtered = { season: 2026, week: 1, players: mk(3300).filter((r) => r.ppr != null) };
    ok(rowCount(filtered) < 100,
      `sidud er talan ${rowCount(filtered)} og golfid FELLUR — thess vegna er siad`);
    /* Og kodinn verdur ad vista thad siada, ekki hrau radirnar. */
    ok(/players:\s*withPts/.test(bare),
      "`weekly-proj` vistar `withPts`, EKKI allar 3.300 radirnar");
    ok(/rowsFromSource:\s*rows\.length/.test(bare),
      "og upprunalega talan er geymd svo hlutfallid se lesid, ekki agiskad");
  }

  /* ---------- F3. MARKA-PROP: LISTUD ER EKKI VERDLOGD ----------
     `mk.tdProps` var til og enginn kalladi hana — `espn_td_props` hafdi
     ALDREI birst i status.json. Hun er tengd 21.8.2026 sem dagsett
     serie, thvi vedbankalina er OENDURHEIMTANLEG: hun hverfur eftir
     leikinn og `sports.core.api` geymir enga sogu.

     GILDRAN ER SU SAMA OG I F2 OG HUN ER STAERRI HER. Maelt 21.8.2026 a
     opnunarleiknum NE@SEA: 5 sidur, 111 prop, **22 "Anytime Touchdown
     Scorer", 0 med verd**. Yfir alla 16 leiki vikunnar: **83 listud, 0
     verdlogd**. Vaeru listadar radir vistadar bæri skrain 83 radir og
     golfid 50 hleypti henni i gegn — fryst viku af NULLUM ad eilifu,
     merkta sem markadsmynd.

     ThRJAR FULLYRDINGAR:
       (a) `tdProps` skilar ADEINS verdlogdum rodum (hlidid i heimildinni)
       (b) fetch-nfl skrifar EKKERT thegar engin rod er verdlogd, og
           skrair thad sem `ok` — bokmakarar sem hafa ekki opnad markad
           eru ekki bilun
       (c) glugginn er SA SAMI fasti og vikuleg spa notar, svo tvaer
           dagsettar seriur geti ekki reikad i sundur                */
  {
    const oddsSrc = readFileSync(
      path.join(ROOT, "scripts", "sources", "espnodds.mjs"), "utf8");
    const tdFn = /export async function tdProps\([\s\S]*?\n\}/.exec(oddsSrc);
    ok(!!tdFn, "`tdProps` finnst i sources/espnodds.mjs");
    ok(tdFn && /return out\.filter\(\(r\) => r\.decimal != null\)/.test(tdFn[0]),
      "(a) hun skilar ADEINS rodum med verdi — golfid maelir thvi VERD, ekki uppskriftir");
    /* Talningin sem gerir "0 verdlogd" laesilegt verdur ad vera i notunni. */
    ok(tdFn && /\$\{priced\} with a posted price/.test(tdFn[0]),
      "og notan segir hve morg BERA verd, ekki bara hve morg voru listud");

    const tdAt = bare.indexOf("`td-props/");
    ok(tdAt >= 0, "(b) `td-props/` er vistud i fetch-nfl.mjs");
    const win = tdAt >= 0 ? bare.slice(tdAt - 400, tdAt + 2600) : "";
    ok(/if \(!rows\.length\)/.test(win),
      "og hun spyr hvort NOKKUR rod se verdlogd adur en skrifad er");
    /* SKRAD SEM `ok`, EKKI VILLA — sama rok og "utan gluggans". */
    const noPrice = /if \(!rows\.length\) \{\s*record\(\s*"archive:td-props",\s*true/.exec(win);
    ok(!!noPrice,
      "og 0 verdlogd er skrad sem `ok` (rautt hér kennir manni ad hunsa spjaldid)");
    /* (c) OG ThAD ER EKKI NOG AD `PROJ_WINDOW_H` SE NEFNT I NOTUNNI.
       `upcomingWeek(games, season, now, window)` tekur fjorda vidfang;
       vaeri thad gefid hér faerum vid annan glugga en vikuleg spa medan
       notan segdi afram `${PROJ_WINDOW_H}h`. Fullyrdingin er thvi um
       KALLID: thrju vidfong, engin yfirtaka. */
    ok(/PROJ_WINDOW_H/.test(win),
      "(c) glugginn er SAMI fasti og vikuleg spa notar, ekki eigin tala");
    const call = /upcomingWeek\(\s*games,\s*season,\s*Date\.now\(\)\s*\)/.exec(win);
    ok(!!call,
      "og `upcomingWeek` er kollud MED THREM vidfongum — enginn eigin gluggi");
  }

  /* ---------- G. LAGMORKIN I KODANUM ERU THAU SOMU OG HER ----------
     Sama vordur og adalkaflinn hefur a `writeJson`: annars ver profid
     tolur sem pipeline-id notar ekki. */
  /* GLUGGINN ER PER SERIU OG HANN ER MAELDUR, EKKI VALINN. Fjarlaegdin
     fra sloð-strengnum ad `minRows:` i `bare` (maelt 21.8.2026):
       news/ 118 · adp-history/ 119 · weekly-ecr/ 184 · depth/ 598 ·
       weekly-proj/ 912 · td-props/ 1487
     Fastur 1200-gluggi sagdi thvi "ekki finnanlegt" um `td-props/` sem
     var rett skrifad — nakvaemlega sama villa og notan hér fyrir nedan
     lysir, i sama vordi. Talan er hámark + syn, ekki agiskun. */
  const MINS = [
    ["news/", 20, 400], ["adp-history/", 100, 400], ["weekly-proj/", 100, 1200],
    ["weekly-ecr/", 100, 400], ["depth/", 200, 900], ["td-props/", 50, 1900],
    ["market/", 260, 1500],
  ];
  for (const [pfx, min, span] of MINS) {
    /* LEITAD FRA SLODINNI FRAM, EKKI FRA `writeOnce(` FRAM. Tveir af
       fimm kollum bera slodina i `const name = ...` og gefa hana svo
       afram (`writeOnce(name, ...)`), thvi `archived(name)` er spurt a
       undan — fyrsta utgafa thessa vardar krafdist thess ad slodin vaeri
       ORDRETT INNI I kallinu og fann thvi ekki `weekly-proj/` ne
       `depth/`. Hann sagdi "ekki finnanlegt" um kóda sem var rettur.
       Leitad er i `bare` (an athugasemda) svo dæmi i notu telji ekki. */
    const at = bare.indexOf(`\`${pfx}`);
    const win = at >= 0 ? bare.slice(at, at + span) : "";
    const m = /minRows:\s*(\d+)/.exec(win);
    ok(at >= 0 && m && Number(m[1]) === min,
      `${pfx}: minRows i kodanum er ${m ? m[1] : "ekki finnanlegt"} (a ad vera ${min})`);
  }

  /* ---------- H. ÞAER SEM ERU KOMNAR A DISKINN STANDAST SIN EIGIN MORK ----------
     ÞEKJA ER FULLYRDING: serie sem er ekki byrjud er sleppt med skyringu,
     en serie sem ER byrjud og ber thunna skra er bilun sem enginn saei. */
  const started = [];
  for (const [dir, min] of [["news", 20], ["adp-history", 100],
                            ["weekly-proj", 100], ["weekly-ecr", 100],
                            ["depth", 200], ["trending", 20],
                            ["td-props", 50], ["market", 260]]) {
    const p = path.join(DATA, dir);
    if (!ex(p)) continue;
    const files = rd(p).filter((f) => f.endsWith(".json"));
    if (!files.length) continue;
    started.push(`${dir}(${files.length})`);
    let worst = null;
    for (const f of files) {
      const n = rowCount(JSON.parse(rf(path.join(p, f), "utf8")));
      if (worst == null || n < worst.n) worst = { f, n };
    }
    ok(worst.n >= min,
      `${dir}/: thynnsta skra ber ${worst.n} radir (lagmark ${min}, ${worst.f})`);
  }
  console.log(`     seriur byrjadar: ${started.join(", ") || "engin enn"}`);

  /* ---------- I. `market/` — ARSTIDAR-LESTURINN, OG GOLFID SEM ER EKKI
       TOM FULLYRDING ----------
     Serian geymir domm markadarins um HVERN LEIK adur en eitt snapp er
     spilad. Hun er OENDURHEIMTANLEG og thad var maelt, ekki alyktad:
     `scoreboard?dates=2025&seasontype=2&week=1` skilar 16 leikjum og
     **0 med `odds`** ur BAÐUM hostum — blokkin er fjarlaegd af loknum
     leikjum.

     ThESSI KAFLI PROFAR ThRJAR OLIKAR LEIDIR TIL AD GOLF GETI LOGID, OG
     ThAER ERU EKKI SAMA HLIDID:
       (a) TOMUR FARMUR SKILAR LYKLAFJOLDA, EKKI 0. Þetta hefur BITID
           ThETTA REPO TVIVEGIS (`market.json` 6 lyklar >= 3 og
           `weekly-proj` 3.300 tomar radir). Fullyrdingin er ekki "golfid
           er hatt" heldur "golfid fellir RAUNVERULEGA toman farm".
       (b) RADIR AN VERDS ERU UMBUD. 272 linur med `total: null` gefa
           `rowCount` 272 og hefdu farid i gegn um hvad sem er <= 272.
           Sian er thvi BURDARVIRKI.
       (c) HEIL VIKA SEM FELLUR ER 16 LEIKIR. 18 radir
           `espn_lines_w{n} failed: HTTP 403` maeldust 20.8.2026, svo
           thetta er MAELD bilun og golfid er lagt vid hana.            */
  {
    const MARKET_MIN = 260;
    const line = (priced) => ({
      id: "1", week: 1, date: "2026-09-09T00:20Z", home: "SEA", away: "NE",
      spread: priced ? -3.5 : null, total: priced ? 43.5 : null,
      provider: "Draft Kings", details: priced ? "SEA -3.5" : null,
    });
    /* Farmurinn er byggdur EINS og `archiveDaily` byggir hann — somu niu
       lyklar. Væri hann skrifadur oðruvisi hér profadi kaflinn annad
       en pipeline-id gerir. */
    const payload = (games, futures) => ({
      season: 2026, date: "2026-08-24", captured: "2026-08-24T09:39:13Z",
      gamesFromSource: 272, priced: games.length,
      futuresMarkets: futures.length, superBowlTeams: 32,
      games, futures,
    });

    /* (a) GENUINELY EMPTY — ekki "thunnt", heldur TOMT. */
    const empty = payload([], []);
    const emptyRows = rowCount(empty);
    ok(emptyRows === Object.keys(empty).length,
      `tomur farmur skilar LYKLAFJOLDA (${emptyRows}), ekki 0 — gildran sjalf`);
    ok(emptyRows < MARKET_MIN,
      `og golfid ${MARKET_MIN} FELLIR hann (${emptyRows} < ${MARKET_MIN}) — ` +
      `golf 1 hefdi hleypt honum i gegn`);

    /* (b) 272 RADIR AN VERDS — sian er astaedan, ekki staerdin. */
    const unpriced = new Array(272).fill(0).map(() => line(false));
    ok(rowCount(payload(unpriced, [])) === 272,
      "272 verdlausar linur gefa rowCount 272 — golf <= 272 gaeti ALDREI fallid");
    ok(unpriced.filter((g) => g.total != null && g.spread != null).length === 0,
      "og sian sem pipeline-id notar skilar 0 af theim — hun er burdarvirki");

    /* (c) HEIL VIKA TOPUD = 16 LEIKIR (maeld 403-bilun). */
    const full = new Array(271).fill(0).map(() => line(true));
    ok(rowCount(payload(full, [])) >= MARKET_MIN,
      `heil mynd (271 verdlogd, maelt 24.8.2026) fer i gegn`);
    ok(271 - 16 < MARKET_MIN,
      `en ein topud vika (271-16 = ${271 - 16}) er HAFNAD — hola i ` +
      `arstidar-lestrinum ma ekki frjosa`);

    /* KODINN SJALFUR — golfid, sian og fjarvera `teams`. */
    const at = bare.indexOf("`market/");
    ok(at >= 0, "`market/` er skrifud i `fetch-nfl.mjs`");
    const win = at >= 0 ? bare.slice(at, at + 1500) : "";
    ok(/g\.total != null && g\.spread != null/.test(win),
      "og ADEINS verdlogd radir eru geymdar (`total != null && spread != null`)");
    /* `teams` er byte-eins vid `teamMarketStrength(games)` (maelt: 32.476
       stafir = 32.476), svo thad er afleidd tala og ma ekki afritast inn.
       Fullyrdingin er neikvaed og hun NEFNIR streng sem er sannanlega i
       farminum tveimur linum ofar (`games:`) — sja CLAUDE.md 5b regla 2. */
    ok(/games: priced/.test(win),
      "farmurinn ber `games: priced` (jakvaeda akkerid fyrir naestu rod)");
    ok(!/\bteams: /.test(win),
      "og hann ber EKKERT `teams`-svid — thad er byte-eins tvitekning " +
      "af `teamMarketStrength(games)`");

    /* SERIAN STOPPAR SJALF ThEGAR TIMABILID BYRJAR, OG SKRAR SIG `ok`.
       Vaeri thetta hlid fjarlaegt yrdi `archive:market` RAUD rod hvern
       einasta dag timabilsins — rod sem hreinsast aldrei kennir manni ad
       hunsa spjaldid, sem er nakvaemlega thad sem spjaldid ma ekki gera. */
    ok(/firstRegKickoffMs/.test(win),
      "fyrsti deildarleikur er spurdur ADUR en vistad er (serian stoppar sjalf)");
    const okGate = /record\("archive:market",\s*true/.test(win);
    ok(okGate,
      "og stoppid er skrad `ok`, EKKI villa (rautt hér vaeri rangt allt timabilid)");

    /* `firstRegKickoffMs` a TILBUNUM leikjaskram thar sem svarid er thekkt. */
    const fkSrc = /function firstRegKickoffMs\([\s\S]*?\n\}/.exec(src);
    ok(!!fkSrc, "`firstRegKickoffMs()` finnst i skranni");
    if (fkSrc) {
      const f = new Function(`${fkSrc[0]}; return firstRegKickoffMs;`)();
      const g = [
        { season: 2026, type: "PRE", date: "2026-08-01" },   // annad snid
        { season: 2025, type: "REG", date: "2025-09-04" },   // annad timabil
        { season: 2026, type: "REG", date: "2026-09-13" },
        { season: 2026, type: "REG", date: "2026-09-09" },   // rettur
        { season: 2026, type: "REG", date: null },           // onyt dagsetning
      ];
      ok(f(g, 2026) === Date.parse("2026-09-09T00:00:00Z"),
        "hann finnur 2026-09-09 og hvorki forleik, 2025 ne null");
      ok(f([], 2026) === null,
        "og tom leikjaskra skilar `null`, ekki 0 — 0 vaeri 1970 og ThA ER " +
        "TIMABILID BYRJAD (serian myndi aldrei vistast)");
    }

    /* A DISKNUM: hver vistud dagsmynd verdur ad standast sinar eigin
       fullyrdingar — annars er sian brotin an ad nokkur segi neitt. */
    const mp = path.join(DATA, "market");
    if (ex(mp)) {
      const files = rd(mp).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
      ok(files.length > 0, `data/market/ ber ${files.length} dagsmynd(ir)`);
      for (const f of files) {
        const d = JSON.parse(rf(path.join(mp, f), "utf8"));
        const bad = (d.games || []).filter(
          (g) => g.total == null || g.spread == null).length;
        ok(bad === 0, `${f}: 0 af ${(d.games || []).length} rodum an verds (${bad})`);
        ok(d.priced === (d.games || []).length,
          `${f}: priced (${d.priced}) === games.length (${(d.games || []).length})`);
        ok(d.teams === undefined,
          `${f}: engin teams-tvitekning i skranni`);
        ok(Number.isFinite(d.gamesFromSource) && d.gamesFromSource >= d.priced,
          `${f}: gamesFromSource ${d.gamesFromSource} >= priced ${d.priced} ` +
          `— hlutfallid er LESID, ekki agiskad`);
      }
    } else {
      console.log("     ·    data/market/ er ekki byrjud — kaflinn a tilbunum gognum stendur");
    }
  }
}

/* ============================================================
   TIMABILS-MERKID A VIKULEGRI ECR — A TILBUNUM DAGSETNINGUM
   ============================================================
   `weekly-ecr/2025-12-30.json` bar `"season": 2026`: svidid var
   `season` keyrslunnar en gognin eru vika 17 af 2025. Prófid les
   BAEDI (a) formuluna, keyrda a dagsetningum thar sem svarid er
   thekkt fyrirfram, og (b) skrarnar sem thegar liggja a disknum.

   (b) er thad sem hefdi fundid villuna: formulan var aldrei til, svo
   prof a henni einni hefdi verid graent i tomarumi. Sama mynstur og
   `mins-trend.mjs` kafli 0 — kodi sem kviknar seinna er dreginn UT og
   keyrdur a tilbunum gognum, en TENGINGIN vid diskinn er profud lika. */
console.log("\ntimabils-merkid a vikulegri ECR");
{
  const src = readFileSync(path.join(ROOT, "scripts", "fetch-nfl.mjs"), "utf8");
  const seasonSrc = /function seasonOfScrape\([\s\S]*?\n\}/.exec(src);
  ok(!!seasonSrc, "`seasonOfScrape()` finnst i skranni");
  if (seasonSrc) {
    const seasonOfScrape = new Function(`${seasonSrc[0]}; return seasonOfScrape;`)();

    /* Timabil Y = sept Y -> feb Y+1. Mork bæði megin eru profud. */
    const CASES = [
      ["2025-12-30", 2025, "desember tilheyrir sinu eigin ari"],
      ["2026-01-05", 2025, "JANUAR tilheyrir FYRRA ari (urslitakeppni)"],
      ["2026-02-08", 2025, "februar lika (Super Bowl)"],
      ["2026-03-01", 2026, "mars er fyrsta manad nyja timabilsins"],
      ["2026-08-16", 2026, "agust — drafttid"],
      ["2026-09-10", 2026, "vika 1"],
    ];
    for (const [d, want, why] of CASES) {
      ok(seasonOfScrape(d) === want, `${d} -> ${want} (${why}); fekkst ${seasonOfScrape(d)}`);
    }
    /* ONYT DAGSETNING -> null, EKKI agiskun. "Vid vitum ekki" er rett
       svar; tala sem er buin til er thad ekki. */
    for (const bad of [null, "", "2026-08", "hvad sem er", "2026-13-01"]) {
      ok(seasonOfScrape(bad) === null, `onyt dagsetning ${JSON.stringify(bad)} -> null`);
    }
    /* Og hun ma ALDREI vera einfaldlega "arid i nafninu" — thad var
       gamla hegdunin i dulargervi. Neikvaeda fullyrdingin nefnir
       tilfelli sem VAR sannanlega rangt adur. */
    ok(seasonOfScrape("2026-01-05") !== 2026,
      "og hun er ekki bara arid ur nafninu (2026-01-05 er IKKI 2026)");
  }

  /* TENGINGIN: skrarnar a disknum verda ad bera rett merki. */
  const dir = path.join(DATA, "weekly-ecr");
  if (existsSync(dir)) {
    const { readdirSync } = await import("node:fs");
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    ok(files.length >= 1, `weekly-ecr/ ber ${files.length} skrar (thekja > 0)`);
    for (const f of files) {
      const j = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
      const want = seasonSrc
        ? new Function(`${seasonSrc[0]}; return seasonOfScrape;`)()(j.scrapeDate)
        : null;
      ok(j.season === want,
        `${f}: season ${j.season} = ${want} (scrapeDate ${j.scrapeDate})`);
    }
  }
}

/* ============================================================
   ESPN-SENTINEL MA ALDREI VERDA MARKADSVERD
   ============================================================
   ESPN gefur leikmanni sem er ALDREI DRAFTADUR sinn eigin
   `averageDraftPosition` — sentinel um 170 med orlitlu flokti, thvi
   talan er MEDALTAL (tekinn einu sinni, oskrifadur i 99 deildum ->
   169,95). Hann komst i `adp` gegnum thridja hlekkinn i kedjunni og
   `valueVsMarket` las hann sem verd: **Darren Waller "+3,4 umferdir"
   KAUP**, byggt a tolu sem thydir "hann var ekki draftadur".

   MAELT 18.8.2026 og ThAD ER RODIN SEM AFGREIDIR SPURNINGUNA AN
   ThROSKULDS: i BADUM deildarlogunum tok `adp` gildi ur ESPN i 654 /
   677 rodum og **NULL af theim var undir 165** — hver leikmadur sem
   ESPN VEIT draftstodu a er lika thekktur hja FFC eda Sleeper. ESPN
   var thvi hlekkur sem skiladi ADEINS sentinel.

   ThRJAR FULLYRDINGAR, OG ThEKJAN ER FYRST:
     (a) skran BER sentinel-inn (annars maelir kaflinn ekkert og vaeri
         samt graenn — CLAUDE.md 5b)
     (b) ESPN ER EKKI HLEKKUR: leikmadur sem ADEINS ESPN thekkir
         ADP a ber ekkert `adp` — og hvert `adp` sem er birt er
         RAKID til FFC eda Sleeper
     (c) og `value` er null hja theim, i stad tolu med formerki

   ============================================================
   (b) VAR MAELD A GILDINU OG ThAD VAR FLOKT — LAGFAERT 21.8.2026
   ============================================================
   Fyrri utgafa (b) spurdi `Math.abs(p.adpEspn - r.adp) < 1e-9`, the.
   "er birt ADP SAMA TALA og ESPN-talan". Su fullyrding maelir
   TILVILJUN, ekki uppruna, og hun FELL A DRAFTDEGI:

     CI 21.8.2026 kl. 09:28 — `FAIL 12-lida half: ekkert ADP er
     ESPN-talan (1: Jahmyr Gibbs 1.5)`

   Gibbs er fyrsta val i deildinni. FFC half-ppr gaf honum 1,5 og
   ESPN gaf honum 1,5 — TVAER OHADAR heimildir um besta leikmann
   deildarinnar voru sammala upp a einn aukastaf, og profid las thad
   sem "sentinel-inn er i verdinu". Kl. 16:18 sama dag var ESPN-talan
   1,49 og profid var graent aftur; hun er MEDALTAL og flokrar.

   ThAD ER EKKI JADARTILFELLI HELDUR ThETTLEIKI: maelt 21.8.2026 bera
   **141 af 979** ESPN-gildum nakvaemlega einn aukastaf, svo hvert
   theirra getur hitt a FFC-tolu leikmannsins. Ofar a bordinu er
   hittnin mest — thad eru einmitt leikmennirnir sem allir eru
   sammala um.

   OG KOSTNADURINN VAR ALLUR DAGURINN, EKKI EIN RAUD ROD. `tests/
   pipeline.mjs` VAR ThA HLID A UNDAN commit-inu i `nfl-data.yml`, svo
   09:00-keyrslan skrifadi oll gognin i runner-inn og henti theim.
   Dagsmynd `trending/2026-08-21.json` var thar med aldrei committud,
   og "trending-vordurinn (dagurinn i dag)" felldi thvi 12:19- og
   15:20-keyrslurnar lika: ThRJAR keyrslur, ekkert ADP, a draftdegi.
   Vordur sem flokrar er ekki bara hávaði — hann er stiflan.

   > **ROÐIN I WORKFLOW-INU VAR SNUID VID 24.8.2026 VEGNA ThESSA** og
   > thessi malsgrein er thvi SAGA, ekki nuverandi hegdun: profid keyrir
   > nu EFTIR commit+push, svo vordur getur ekki lengur hent theim
   > gognum sem hann var ad verja. Rokstudningurinn og hvad skiptin
   > kostar er i `nfl-data.yml` vid stepid sjalft; hlidid a vond gogn er
   > `writeJson`/`writeOnce`, sem eru PER SKRA og vid heimildina.
   > Vordur: kafli 3 hér fyrir ofan ("rodin i workflow-inu").

   NYJA FORMID MAELIR UPPRUNA OG GETUR ThVI EKKI HITT A TILVILJUN:
     `adp` i `src/build.js` er `ffc ? ffc.adp : (adpSleeper ?? null)`.
     ESPN er hvergi i kedjunni. Thad er PROFAD i tveimur attum —
     (b1) 609 leikmenn sem ADEINS ESPN a ADP a bera `adp == null`,
     (b2) hvert birt `adp` er JAFNT einhverju FFC- eda Sleeper-gildi
          SAMA leikmanns.
   Setti einhver ESPN aftur i kedjuna felli (b1) a ~609 rodum og (b2)
   a theim somu — margfalt sterkari stokkbreytingar-naemi en ein rod
   sem gat komid ur tilviljun. Og hvorug getur fallid af thvi ad
   tvaer heimildir seu sammala.
   ============================================================ */
console.log("\nESPN-sentinel verdur aldrei markadsverd");
{
  const f = path.join(DATA, "players.json");
  if (!existsSync(f)) {
    console.log("  (players.json vantar)");
  } else {
    const players = JSON.parse(readFileSync(f, "utf8"));
    const { buildRows } = await import("../src/build.js");

    /* (a) ThEKJA — sentinel-inn ER i skranni. */
    const withE = players.filter((p) => p.adpEspn != null);
    const clustered = withE.filter((p) => p.adpEspn >= 169 && p.adpEspn <= 171);
    ok(withE.length > 100, `ThEKJA: ${withE.length} leikmenn bera adpEspn`);
    ok(clustered.length > withE.length * 0.5,
      `ThEKJA: ${clustered.length} af ${withE.length} liggja i [169,171] — sentinel-inn er thar`);
    /* Og hann inniheldur menn sem geta ekki verid draftadir. Nafna-frjals
       proof: leikmadur an lids OG an Sleeper-spar. */
    const ghosts = clustered.filter((p) => !p.team && p.projSleeper == null);
    ok(ghosts.length > 0,
      `ThEKJA: ${ghosts.length} theirra hafa hvorki lid ne Sleeper-spa (t.d. ${
        ghosts.slice(0, 3).map((p) => p.name).join(", ")})`);

    /* (b) + (c) i BADUM deildarlogunum sem notandinn notar. */
    const shapes = [
      ["10-lida PPR", { teams: 10, scoring: "ppr", rounds: 15,
        starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
        superflex: false, maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 } }],
      ["12-lida half", { teams: 12, scoring: "half-ppr", rounds: 14,
        starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
        superflex: false, maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 } }],
    ];
    for (const [label, L] of shapes) {
      const { rows } = buildRows({ players, league: L });
      const raw = new Map(players.map((p) => [p.id, p]));
      /* ThEKJA innan logunar: bordid ber raunverulegt ADP a einhverjum,
         annars vaeri (b) satt af thvi ad ekkert ADP er til. */
      const withAdp = rows.filter((r) => r.adp != null);
      ok(withAdp.length > 100, `${label}: ThEKJA — ${withAdp.length} rader bera ADP`);

      /* (b1) ESPN EINN ER ENGIN HEIMILD. Leikmadur sem ESPN a ADP a en
         hvorki FFC ne Sleeper ma ekki bera birt `adp`. Thetta er sama
         spurning og gamla (b) svaradi — "er ESPN hlekkur i kedjunni?" —
         en spurd um UPPRUNA, svo tvaer heimildir sem eru sammala geta
         ekki fellt hana. */
      const espnAlone = rows.filter((r) => {
        const p = raw.get(r.id);
        if (!p || p.adpEspn == null) return false;
        const anyFfc = Object.values(p.adpFfc || {}).some((v) => v && v.adp != null);
        return !anyFfc && p.adpSleeper == null &&
               p.adpSleeperHalf == null && p.adpSleeperStd == null;
      });
      ok(espnAlone.length > 200,
        `${label}: ThEKJA — ${espnAlone.length} leikmenn sem ADEINS ESPN a ADP a`);
      const leaked = espnAlone.filter((r) => r.adp != null);
      ok(leaked.length === 0,
        `${label}: og ekkert theirra ber birt ADP (${leaked.length}: ${
          leaked.slice(0, 3).map((r) => `${r.name} ${r.adp}`).join(", ") || "engir"})`);

      /* (b2) OG HVERT BIRT ADP ER RAKID. Gildid verdur ad vera til i
         FFC-settunum eda i Sleeper-ADP SAMA leikmanns. Tala sem er
         hvergi i faedinu getur ekki hafa komid ur thvi. */
      const untraceable = withAdp.filter((r) => {
        const p = raw.get(r.id);
        if (!p) return true;
        const cands = [p.adpSleeper, p.adpSleeperHalf, p.adpSleeperStd,
          ...Object.values(p.adpFfc || {}).map((v) => v && v.adp)]
          .filter((v) => v != null);
        return !cands.some((v) => Math.abs(v - r.adp) < 1e-9);
      });
      ok(untraceable.length === 0,
        `${label}: hvert birt ADP er rakid til FFC eda Sleeper (${
          untraceable.length}: ${untraceable.slice(0, 3)
          .map((r) => `${r.name} ${r.adp}`).join(", ") || "engir"})`);

      /* Og enginn theirra sem ADEINS ESPN thekkir ber virdi gegn markadi. */
      const espnOnly = rows.filter((r) => {
        const p = raw.get(r.id);
        return p && p.adpEspn != null && r.adp == null;
      });
      ok(espnOnly.length > 50,
        `${label}: ThEKJA — ${espnOnly.length} rader hafa ADEINS ESPN-tolu`);
      ok(espnOnly.every((r) => r.value == null),
        `${label}: og engin theirra ber "value" (${
          espnOnly.filter((r) => r.value != null).length} med tolu)`);
    }
  }
}

/* ============================================================
   ESPN-UPPBODSVERD 0 ER TOMGILDI, EKKI NULL DOLLARAR
   ============================================================
   Sama aett og sentinel-kaflinn ad ofan og hun fannst i somu heimild.
   MAELT 21.8.2026 a `players.json`, 979 radir med svidinu:

     nakvaemlega 0                        **654**
     og af theim: adpEspn i [169,171]     **654**  <- ALLAR

   Sami fjoldi og ADP-sentinel-inn, thvi thad er SAMA FAERSLAN: bæði
   svidin koma ur `ownership` hja manni sem ENGINN DRAFTADI. Talan
   thydir "ESPN a ekkert uppbodsverd", ekki "hann kostar 0".

   OG SNIDID SEGIR ThAD: ESPN tjair raunveruleg undir-dollara medaltol
   med tveimur aukastofum — **0,01 a 42 rodum, 0,02 a 23**. Nakvaemlega
   0 er thvi SERSTAKT astand, ekki namundun. Madur sem er tekinn einu
   sinni fyrir dollar i 99 deildum faer 0,01.

   Dalkurinn birti "0" med notunni "i dollurum af 200", hefur EKKI
   `hi: false` (svo haekkandi rodun setti 654 nullur a toppinn), og **45
   af theim 654 eru draftanlegir annars stadar** (FFC/Sleeper-ADP) —
   Graham Gano, D'Onta Foreman, Mike Boone — svo nullid sat vid hlidina
   a raunverulegu ADP og las eins og "frir".

   ThRJAR FULLYRDINGAR:
     (a) ThEKJA — svidid er raunverulega i skranni og ber raunveruleg gildi
     (b) ENGIN rod ber nakvaemlega 0 (stokkbreytingar-naema fullyrdingin)
     (c) og undir-dollara gildin eru OSNERT — hlidid ma ekki hafa henta
         theim med, thvi tha vaeri thad ad eyda maelingu i stad tomgildis
   ============================================================ */
console.log("\nESPN-uppbodsverd 0 er tomgildi, ekki null dollarar");
{
  const f = path.join(DATA, "players.json");
  if (!existsSync(f)) {
    console.log("  (players.json vantar)");
  } else {
    const players = JSON.parse(readFileSync(f, "utf8"));
    const withA = players.filter((p) => p.auctionEspn != null);
    ok(withA.length > 100, `(a) ThEKJA: ${withA.length} leikmenn bera auctionEspn`);
    const zeros = withA.filter((p) => p.auctionEspn === 0);
    ok(zeros.length === 0,
      `(b) engin rod ber nakvaemlega 0 (${zeros.length}: ${
        zeros.slice(0, 3).map((p) => p.name).join(", ") || "engir"})`);
    const sub = withA.filter((p) => p.auctionEspn > 0 && p.auctionEspn < 1);
    ok(sub.length > 10,
      `(c) undir-dollara gildin standa (${sub.length} radir, laegst ${
        Math.min(...withA.map((p) => p.auctionEspn))})`);
    /* Og hlidid er i HEIMILDINNI, ekki i vidmotinu — annars myndi hver ny
       lesandi fa nullid oskolad. */
    const espnSrc = readFileSync(
      path.join(ROOT, "scripts", "sources", "espn.mjs"), "utf8");
    ok(/auction: auctionValue\(own\.auctionValueAverage\)/.test(espnSrc),
      "og hlidid situr i sources/espn.mjs, ekki i birtingunni");
    ok(/if \(x === 0\) \{ auctionZeroed\+\+; return null; \}/.test(espnSrc),
      "og nullin eru TALIN, svo hlutfallid se lesid og ekki agiskad");
    ok(/zeroes dropped \(no ESPN auction price, not \$0\)/.test(espnSrc),
      "og talan birtist i heimildaskranni");
  }
}

/* ============================================================
   `sos` MA EKKI LOFA STODU-SUNDURLIDUN SEM ER EKKI TIL
   ============================================================
   Notan sagdi "medal vaent stigaskor andstaedinganna GEGN HANS STODU".
   MAELT 18.8.2026: allar 30 ARI-radirnar (QB..DST) bera sama gildid og
   **0 af 32 lidum** bera fleiri en eitt. Ordalagid var tekid ad lani
   ur `DEF_WEIGHT` (vikulegi thatturinn) og lofadi tolu sem er hvergi
   reiknud.

   ThETTA ER PROFAD I BADAR ATTIR: (a) talan ER lids-tala — se stodu-
   sundurlidun einhvern tima reiknud a thetta ad falla og verda skodad,
   ekki thagna; (b) notan ma ekki bera loforðið aftur.               */
console.log("\n`sos` er lids-tala og notan segir thad");
{
  const need = ["players.json", "schedule.json", "market.json"];
  if (!need.every((f) => existsSync(path.join(DATA, f)))) {
    console.log("  (gagnaskra vantar)");
  } else {
    const rd = (f) => JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
    const { buildRows } = await import("../src/build.js");
    const { COL } = await import("../src/columns.js");
    const { rows } = buildRows({
      players: rd("players.json"), schedule: rd("schedule.json"),
      market: rd("market.json"),
      league: { teams: 10, scoring: "ppr", rounds: 15,
                starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
                superflex: false, maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 } },
    });
    const withSos = rows.filter((r) => r.sos != null && r.team);
    ok(withSos.length > 300, `ThEKJA: ${withSos.length} radir bera sos`);
    const byTeam = new Map();
    for (const r of withSos) {
      if (!byTeam.has(r.team)) byTeam.set(r.team, new Set());
      byTeam.get(r.team).add(r.sos);
    }
    ok(byTeam.size >= 30, `ThEKJA: ${byTeam.size} lid i talningunni`);
    /* Og hvert lid verdur ad bera FLEIRI EN EINA stodu, annars vaeri
       "eitt gildi per lid" satt af tomum astaedum. */
    const posPerTeam = new Map();
    for (const r of withSos) {
      if (!posPerTeam.has(r.team)) posPerTeam.set(r.team, new Set());
      posPerTeam.get(r.team).add(r.pos);
    }
    ok([...posPerTeam.values()].every((s) => s.size >= 3),
      `ThEKJA: hvert lid ber >=3 stodur (min ${Math.min(...[...posPerTeam.values()].map((s) => s.size))})`);
    const multi = [...byTeam.entries()].filter(([, s]) => s.size > 1);
    ok(multi.length === 0,
      `(a) sos er EIN tala per lid (${multi.length} lid med fleiri: ${
        multi.slice(0, 3).map(([t, s]) => `${t}:${s.size}`).join(", ") || "engin"})`);

    /* (b) notan ma ekki lofa sundurlidun sem (a) segir ad se ekki til. */
    for (const key of ["sos", "playoffSos"]) {
      const n = COL[key].note;
      ok(!/gegn hans stodu/i.test(n),
        `(b) ${key}-notan lofar ekki "gegn hans stodu"`);
      ok(/lids-tala/i.test(n), `og hun segir berum ordum ad thetta se lids-tala`);
    }
  }
}

/* ============================================================
   MEIDSLA-SERIAN — OG HLIDID SEM ER A SOKNINNI, EKKI A SVARINU
   ============================================================
   `nv.injuries()` var skrifud, profud og ALDREI KOLLUD. Hun er nu i
   `archiveDaily`, en HUN MA EKKI KALLA I FORLEIK: maelt 25.8.2026 svarar
   `injuries_2026.csv` **404** medan `injuries_2025.csv` svarar **200 med
   6.069 rodum` — skyrslan verdur ekki til fyrr en vika 1 er skrad.
   Vaeri sott hvort sem er faeri RAUÐ ROD i `status.json` daglega i
   margar vikur, og notandinn laerir a viku ad hunsa kassann.

   OG ThETTA VAR OPROFANLEGT ThANGAD TIL NUNA: `fetch-nfl.mjs` kalladi
   `main()` OSKILYRT og bar NULL utflutninga, svo hver innflutningur
   keyrdi alla pipeline-una. Nu er kallid skilyrt (`invokedDirectly`,
   `realpathSync` badum megin) — sama lagfaering og FPL-hlidin gerdi
   21.8.2026 — og hlidid er profad a TILBUNUM gognum.                 */
console.log("\nmeidsla-serian og innflutnings-hlidid");
{
  /* --- 1. INNFLUTNINGUR MA EKKI KEYRA PIPELINE-UNA ---
     Bilun i thessu skilyrdi vaeri ThOGUL: keyrslan lyki a sekundubroti
     med utgangsstodu 0 og engum skrifum. Graen keyrsla sem gerir ekkert
     er verri en hrun. Fullyrdingin er thvi TVIThAETT: hun ma hvorki
     taka langan tima (netkoll) NE snerta `status.json`. */
  const mod = await import("../scripts/fetch-nfl.mjs");
  ok(typeof mod.seasonUnderway === "function",
    "skrain flytur ut `seasonUnderway` (adur voru utflutningarnir NULL)");

  /* TIMAMAELING A INNFLUTNINGI DUGAR EKKI OG ThAD VAR MAELT.
     Fyrsta utgafa mín var `await import(...)` og krafdist "< 3000 ms".
     Hun SLAPP i gegnum stokkbreytinguna `if (true) main()` — thvi `main`
     er ASYNC: einingin skilar strax og lofordid er aldrei bedid, svo
     innflutningurinn tok 3 ms i BADUM tilfellum. Fullyrding sem stenst
     stokkbreytinguna sem hun heitir eftir er verri en engin.

     Retta profid keyrir RAUNVERULEGT AFRIT i NYJU FERLI, badar leidir,
     med `main` skipt ut fyrir eina prentun — svo engin netkoll og engin
     skrif verda. Sama adferd og `fetch-entry.mjs` i FPL-verkefninu. */
  {
    const { writeFileSync, unlinkSync } = await import("node:fs");
    const { execFileSync } = await import("node:child_process");

    const raw = readFileSync(path.join(ROOT, "scripts", "fetch-nfl.mjs"), "utf8");
    ok(/\nasync function main\(\) \{/.test(raw),
      "FORSENDA: `main` er skilgreind sem `async function main() {`");
    const stubbed = raw.replace("\nasync function main() {",
      '\nasync function main() { console.log("MAIN_RAN"); return; }\n' +
      "async function __unused_real_main() {");

    /* AFRITID SITUR I `scripts/` SJALFRI og thad er asett: skrain flytur
       inn BADI `./sources/...` OG `../src/names.js`, svo afrit i /tmp
       thyrfti sloda-endurritun — og fyrsta utgafa min gerdi hana adeins
       fyrir `./`, svo `../src/names.js` fannst ekki og BEINA keyrslan
       hrundi adur en `main` var kollud. Profid las thad sem "main
       keyrdi ekki", sem er RETT SVAR VID RANGRI SPURNINGU. Sama stadur
       = sama upplausn = engin endurritun. */
    const copy = path.join(ROOT, "scripts", "__entry-probe.mjs");
    const run = (args) => {
      try {
        return String(execFileSync(process.execPath, args,
          { encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] }));
      } catch (e) { return String((e.stdout || "") + (e.stderr || "")); }
    };
    let direct = "", imported = "";
    try {
      writeFileSync(copy, stubbed);
      direct = run([copy, "--stage=core"]);
      imported = run(["--input-type=module", "-e",
        `await import(${JSON.stringify("file://" + copy)});`]);
    } finally {
      try { unlinkSync(copy); } catch { /* buid ad eyda */ }
    }

    ok(/MAIN_RAN/.test(direct),
      `BEINT kall keyrir \`main()\` — annars gerdi pipeline-an EKKERT og skiladi 0` +
      (/MAIN_RAN/.test(direct) ? "" : ` [utkoma: ${direct.slice(0, 200)}]`));
    ok(!/MAIN_RAN/.test(imported),
      "en INNFLUTNINGUR gerir thad EKKI (annars keyrdi hvert prof alla pipeline-una)");
  }

  /* --- 2. HLIDID A TILBUNUM GOGNUM, ThAR SEM SVARID ER ThEKKT --- */
  const g = (season, date, type = "REG") => ({ season, date, type, week: 1 });
  const NOW = Date.parse("2026-08-25T00:00:00Z");
  const su = mod.seasonUnderway;

  ok(su([g(2026, "2026-09-10")], 2026, NOW) === false,
    "leikur framundan -> timabilid er EKKI byrjad");
  ok(su([g(2026, "2026-08-24")], 2026, NOW) === true,
    "leikur ad baki -> ThAD ER byrjad");
  ok(su([], 2026, NOW) === false, "engin leikjaskra -> ekki byrjad (ekki hrun)");
  ok(su(null, 2026, NOW) === false, "null leikjaskra -> ekki byrjad");
  /* ThRJU TILFELLI SEM MEGA EKKI TELJAST MED, og hvert theirra er
     raunveruleg rod i `schedule.json`. */
  ok(su([g(2025, "2025-09-10")], 2026, NOW) === false,
    "leikur FYRRA ARS telst ekki (arid er sitt eigid skilyrdi)");
  ok(su([g(2026, "2026-08-10", "PRE")], 2026, NOW) === false,
    "AEFINGALEIKUR telst ekki — meidsla-skyrslan er REG-skjal");
  ok(su([{ season: 2026, type: "REG", date: null }], 2026, NOW) === false,
    "rod an dagsetningar telst ekki (og fellir ekki)");
  ok(su([g(2026, "rusl")], 2026, NOW) === false, "rusl i dagsetningu telst ekki");

  /* --- 3. STEPID ER RAUNVERULEGA VIRAD OG GATAD --- */
  const src = readFileSync(path.join(ROOT, "scripts", "fetch-nfl.mjs"), "utf8");
  ok(/nv\.injuries\(season\)/.test(src),
    "`archiveDaily` kallar `nv.injuries(season)` (hun var aldrei kollud adur)");
  ok(/if \(!seasonUnderway\(games, season, Date\.now\(\)\)\)/.test(src),
    "og kallid er GATAD a `seasonUnderway` — hlid a sokninni, ekki sia a svarinu");
  ok(/writeOnce\(`injuries\/\$\{day\}\.json`/.test(src),
    "og skrifar dagsetta serie `injuries/{dagur}.json`");
  ok(/record\("archive:injuries", true,/.test(src),
    "og forleikur skrair GRAENA rod (bidur), ekki rauda");

  /* --- 4. WORKFLOW-ID KALLAR SKRANA AFRAM BEINT ---
     Skilyrta `main()` er gagnslaus ef enginn kallar hana. Textaleit a
     `.yml` af thvi ad thad er ANNAD skjal en kodinn — profid sem las
     BARA kodann var einmitt thad sem let `fetch-fast.yml` an
     `env`-blokkar sleppa i FPL-verkefninu. */
  const wf = readFileSync(path.join(ROOT, "..", ".github", "workflows", "nfl-data.yml"), "utf8");
  ok(/node scripts\/fetch-nfl\.mjs/.test(wf),
    "`nfl-data.yml` kallar `scripts/fetch-nfl.mjs` BEINT (annars threytir skilyrta `main()` hana)");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
