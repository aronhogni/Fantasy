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
import { NFL_TEAMS, normTeam } from "../src-nfl/names.js";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DATA = path.join(ROOT, "data-nfl");
const read = (f) => JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
const has = (f) => existsSync(path.join(DATA, f));

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

if (!has("players.json")) {
  console.log("  data-nfl vantar — keyrdu scripts/nfl/fetch-nfl.mjs");
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

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
