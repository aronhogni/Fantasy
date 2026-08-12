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
    "calib_standard_fftoday.json": "kvordun a spa-kvarda fyrir VBD — felld, studullinn flyst ekki",
    "bye_ppr_sleeper.json": "audar vikur, vikuleg talning — synt sem samhengi, raedur engu",
    "bye_ppr_fftoday.json": "sama a ohadri heimild",
    "risk_ppr_sleeper.json": "ahaetta vid valid — 0 af 24 standast",
    "risk_ppr_fftoday.json": "sama a ohadri heimild",
    "expert_persistence.json": "rod serfraedinga 2015-2025 — rho 0,370, 0 neikvaed por",
    "schedule_history.json": "linur 2019-2025; forsenda start/sit-bakprofsins",
    "startsit_standard.json": "standard-helmingur start/sit — vordur les ppr og standard",
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

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
