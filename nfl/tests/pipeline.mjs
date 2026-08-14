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
      const weekly = { 2026: [
        { id: "TEST-A", week: 1, ppr: 10 },
        { id: "TEST-B", week: 1, ppr: 5 },     // a ENGA snap-rod
      ] };
      const snaps = new Array(120).fill(0)
        .map((_, i) => ({ pfrId: `Pfr${i}`, week: 1, snaps: 10, pct: 0.5 }));
      snaps.push({ pfrId: "PfrA", week: 1, snaps: 61, pct: 0.87 });
      const nv = {
        players: async () => [...bridgePlayers, { id: "TEST-A", pfrId: "PfrA" }],
        snapCounts: async () => snaps,
      };
      const { fn } = mkMerge(nv);
      await fn(weekly, [2026]);
      ok(weekly[2026][0].snaps === 61 && weekly[2026][0].snapPct === 0.87,
        "snap-hlutfall sameinast um pfr-bruna (61 snopp, 0,87)");
      /* NULL ER EKKI NULL: sa sem a enga snap-rod faer null, EKKI 0.
         Snap-hlutfall 0 thydir "spiladi ekki eitt snapp" og er allt
         annad mal en "vantar". */
      ok(weekly[2026][1].snaps === null && weekly[2026][1].snapPct === null,
        "rod an snap-gagna faer NULL, ekki 0");
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
      const { objects, str } = await import("../scripts/lib/csv.mjs");
      const { normPos } = await import("../src/scoring.js");
      const build = (text, log = []) => ({
        fn: new Function("getText", "objects", "str", "normPos", "numOrNull",
          "record", "WEEKLY_MIRROR",
          `${weSrc[0].replace(/^export /, "")}; return weeklyEcr;`)(
          async () => text, objects, str, normPos,
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

  /* ---------- G. LAGMORKIN I KODANUM ERU THAU SOMU OG HER ----------
     Sama vordur og adalkaflinn hefur a `writeJson`: annars ver profid
     tolur sem pipeline-id notar ekki. */
  const MINS = [
    ["news/", 20], ["adp-history/", 100], ["weekly-proj/", 100],
    ["weekly-ecr/", 100], ["depth/", 200],
  ];
  for (const [pfx, min] of MINS) {
    /* LEITAD FRA SLODINNI FRAM, EKKI FRA `writeOnce(` FRAM. Tveir af
       fimm kollum bera slodina i `const name = ...` og gefa hana svo
       afram (`writeOnce(name, ...)`), thvi `archived(name)` er spurt a
       undan — fyrsta utgafa thessa vardar krafdist thess ad slodin vaeri
       ORDRETT INNI I kallinu og fann thvi ekki `weekly-proj/` ne
       `depth/`. Hann sagdi "ekki finnanlegt" um kóda sem var rettur.
       Leitad er i `bare` (an athugasemda) svo dæmi i notu telji ekki. */
    const at = bare.indexOf(`\`${pfx}`);
    const win = at >= 0 ? bare.slice(at, at + 1200) : "";
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
                            ["depth", 200], ["trending", 20]]) {
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
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
