/* ============================================================
   STATS-PRÓF — flipana "Umferðin" og "Stigatafla"

   Prófin lesa RAUNVERULEG data/-gögn (ekki gervi-sýni) svo þau
   fangi bæði formúlu-villur OG breytingar á heimildunum.

   1. Skrárnar sjálfar: lögun, sjálfstæði, heiðarleg merking
   2. STAT_DEFS — hver tala í stigatöflunni
   3. buildLeaderboard — röðun, mínútu-þak, síur
   4. gwTotals / gwTop / withDerived
   5. bestXi — FPL-formasjónarreglur
   6. ESPN-skot: hnitakerfið, woodwork, teig-flokkun
   7. Nafna-pörun FPL <-> ESPN
   8. VÖRÐUR: mörk í skýrslunni verða að stemma við úrslitin
   ============================================================ */
import { readFileSync, existsSync } from "node:fs";
import {
  STAT_DEFS, STAT_GROUPS, STAT_BY_KEY, buildLeaderboard, fmtStat, minutesFloor,
  PTS_PER_START_MIN,
  gwTotals, gwTop, withDerived, bestXi, gwFixtureReports,
  shotsFor, shotSummary, SHOT_KINDS, matchShotsToPlayers, normName, nameScore,
  num, POS_ORDER, sumGwRange,
  moScore, aoScore, inImminentPool, imminentBoard,
  startFeatures, startProbability, startRisk, START_MODEL,
  MO_WEIGHTS, IMMINENT_MAX_GI, IMMINENT_MIN_MINUTES, makeEnricher, gwBlindKeys, BSD_XGS_MIN_SHOTS,
  SCOPE_NOTES, FIELDS_READ, readsFields,
} from "../src/stats.js";

const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

/* PlayerList.jsx ER FLUTT INN, EKKI SPEGLAD. Tvo af thremur kofum hér ad
   nedan (haus-rumfraedin og umferdar-bils-bordinn) profa rokfraedi sem BJO
   i JSX; afrit af henni i profinu var graent i tvo daga medan skjarinn var
   klipptur. jsx-loaderinn er skradur her svo skrain se innflytjanleg an
   thess ad safnid thurfi ad vera merkt `true` i SUITES.                  */
const { register } = await import("node:module");
register(new URL("./jsx-loader.mjs", import.meta.url).href);
const PL = await import(new URL("../src/PlayerList.jsx", import.meta.url).href);
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const eq = (a, b, n) => ok(a === b, `${n} (${JSON.stringify(a)}${a === b ? "" : " ≠ " + JSON.stringify(b)})`);
const near = (a, b, tol, n) => ok(Math.abs(a - b) <= tol, `${n} (${a} vs ${b} ±${tol})`);

const players = J("players.json").players;
const hasReport = existsSync(D + "last_gw.json");
const hasShots  = existsSync(D + "last_gw_shots.json");
const report = hasReport ? J("last_gw.json") : null;
const shotsF = hasShots ? J("last_gw_shots.json") : null;

/* ================= 1. SKRÁRNAR ================= */
console.log("\n=== 1. SKRÁRNAR — lögun og heiðarleg merking ===");
ok(hasReport, "data/last_gw.json er til (pipeline: deriveLastGwReport)");
if (report) {
  ok(Array.isArray(report.players) && report.players.length > 0, `players-listi (${report.players?.length})`);
  ok(Array.isArray(report.fixtures) && report.fixtures.length > 0, `fixtures-listi (${report.fixtures?.length})`);
  ok(typeof report.gw === "number" && report.gw >= 1, `gw er tala (${report.gw})`);
  ok(typeof report.season === "string" && /^\d{4}\/\d{2}$/.test(report.season), `season-merking "${report.season}"`);

  /* SJÁLFSTÆÐI: skýrslan má EKKI hanga á players.json-id, því FPL
     endurnýtir element-id milli tímabila. Safn-skýrsla á að hafa id:null. */
  const anyId = report.players.some(p => p.id != null);
  if (report.archive) {
    ok(!anyId, "SAFN: id er null á öllum (má ekki parast við players.json)");
    ok(report.players.every(p => p.name && p.team && p.pos),
      "SAFN: hver rað hefur eigin nafn, lið og stöðu");
  } else {
    ok(anyId, "Í TÍMABILI: id fylgir (sama tímabil, pörun óhætt)");
  }
  ok(typeof report.note === "string" && report.note.length > 20, "note skýrir hvaðan gögnin koma");
  ok(report.missing && report.missing.shot_map && report.missing.big_chances,
    "missing-blokkin skráir hvað VANTAR (svo framendinn þegi ekki um það)");

  // stodur eru af thekktu mengi
  const posSet = new Set(report.players.map(p => p.pos));
  ok([...posSet].every(p => POS_ORDER[p]), `stöður úr þekktu mengi (${[...posSet].join(",")})`);
}

/* ================= 2. STAT_DEFS ================= */
console.log("\n=== 2. STAT-SKRÁIN — hver tala í stigatöflunni ===");
ok(STAT_DEFS.length >= 40, `${STAT_DEFS.length} tölur skilgreindar`);
ok(new Set(STAT_DEFS.map(d => d.key)).size === STAT_DEFS.length, "engir tvítekiðir lyklar");
ok(STAT_DEFS.every(d => d.label && typeof d.get === "function"), "hver hefur label og get()");
ok(STAT_DEFS.every(d => STAT_GROUPS.some(g => g.key === d.group)), "hver tilheyrir gildum flokki");
ok(STAT_GROUPS.every(g => STAT_DEFS.some(d => d.group === g.key)), "enginn flokkur er tómur");

// get() ma ALDREI kasta, jafnvel a tomum hlut eða vitlausri logun
let threw = null;
for (const d of STAT_DEFS) {
  for (const junk of [{}, { minutes: 0 }, { minutes: "x", total_points: null }]) {
    try { d.get(junk); } catch (e) { threw = `${d.key}: ${e.message}`; }
  }
}
ok(!threw, `get() þolir tóm/vitlaus inntök${threw ? " — " + threw : ""}`);

// afleiddar tolur reiknast rett a thekktum inntokum
const fake = { goals_scored: 5, expected_goals: "3.20", assists: 2, expected_assists: "1.80",
               expected_goal_involvements: "5.00", minutes: 900, total_points: 60,
               now_cost: 75, clean_sheets: 4, starts: 10, saves: 30, goals_conceded: 10 };
near(STAT_BY_KEY.goals_minus_xg.get(fake), 1.8, 1e-9, "Mörk − xG = 5 − 3,20");
near(STAT_BY_KEY.gi_minus_xgi.get(fake), 2.0, 1e-9, "Framlög − xGI = 7 − 5,00");
near(STAT_BY_KEY.pts_per_90.get(fake), 6.0, 1e-9, "Stig/90 = 60/900×90");
/* pts_per_million kemur nu ur OPINBERU FPL-svidi (`value_season`), ekki
   okkar utreikningi. Profid speglar thad OG sannreynir ad FPL-talan se
   raunverulega total_points/verd a RAUNGOGNUM — annars vaerum vid ad
   birta tolu sem vid skiljum ekki.                                      */
eq(STAT_BY_KEY.pts_per_million.get({ ...fake, value_season: "8.0" }), 8,
  "Stig/milljón kemur úr FPL value_season");
eq(STAT_BY_KEY.pts_per_million.get(fake), null,
  "ekkert value_season → null (við reiknum það EKKI sjálf lengur)");
{
  const withVal = players.filter(p => num(p.value_season) != null && num(p.now_cost) > 0
                                   && num(p.total_points) > 0);
  const off = withVal.filter(p => {
    const mine = num(p.total_points) / (num(p.now_cost) / 10);
    return Math.abs(mine - num(p.value_season)) > 0.06;
  });
  ok(withVal.length > 100 && off.length === 0,
    `FPL value_season = stig/verð á öllum ${withVal.length} raungögnum`
    + (off.length ? ` — ${off.length} víkja, t.d. ${off[0].web_name}` : ""));
}
near(STAT_BY_KEY.cs_pct.get(fake), 40, 1e-9, "Hreint blað % = 4/10");
near(STAT_BY_KEY.save_pct.get(fake), 75, 1e-9, "Vörsluhlutfall = 30/(30+10)");
eq(STAT_BY_KEY.pts_per_90.get({ minutes: 0, total_points: 5 }), null, "0 mínútur → null, ekki Infinity");
eq(STAT_BY_KEY.mins_per_gi.get({ minutes: 900, goals_scored: 0, assists: 0 }), null,
  "ekkert framlag → null, ekki deiling með núlli");

/* NYJAR OPINBERAR TOLUR — sannreyna ad thaer komi ur rettum svidum.
   MINUTUR ERU NU HLUTI FORSENDUNNAR (16.8.2026). Thessar fjorar lesa FPL-svid
   BEINT, og FPL geymir thar `0` fyrir leikmann sem hefur ALDREI SPILAD — tala
   sem er ekki maeling. Maelt: 54 leikmenn med `minutes: 0` synduU "0.00" i
   thessum dalkum medan systkini theirra i SOMU ROD (`cbi_per_90`,
   `tackles_per_90`, `recoveries_per_90`, sem fara gegnum `per90of`) syndu
   rettilega "—". Tvaer reglur um sama hlut i sama vidmoti.
   Verra: `gc_per_90` og `xgc_per_90` eru `hi:false`, svo thessi fals-null
   sat EFST — 164 leikmenn sem hafa aldrei spilad, taldir bestir.
   Profgognin baru engar minutur og STADFESTU thvi gomlu hegdunina; nu bera
   thau thaer, og null-tilfellid er profad VID HLIDINA svo fullyrdingin
   se tvihlida (sbr. kafla 5b: fullyrding sem tharf tvennt til ad bregdast). */
eq(STAT_BY_KEY.saves_per_90.get({ minutes: 900, saves_per_90: 1.62 }), 1.62, "Vörslur/90 úr FPL saves_per_90");
eq(STAT_BY_KEY.dc_per_90.get({ minutes: 900, defensive_contribution_per_90: 3.4 }), 3.4, "DC/90 úr FPL-sviði");
eq(STAT_BY_KEY.cs_per_90.get({ minutes: 900, clean_sheets_per_90: 0.51 }), 0.51, "Hreint blað/90 úr FPL-sviði");
eq(STAT_BY_KEY.starts_per_90.get({ minutes: 900, starts_per_90: 1 }), 1, "Byrjunarhlutfall úr FPL-sviði");
for (const [k, f] of [["saves_per_90","saves_per_90"], ["dc_per_90","defensive_contribution_per_90"],
                      ["cs_per_90","clean_sheets_per_90"], ["starts_per_90","starts_per_90"],
                      ["gc_per_90","goals_conceded_per_90"], ["xgc_per_90","expected_goals_conceded_per_90"]])
  eq(STAT_BY_KEY[k].get({ minutes: 0, [f]: 0 }), null,
     `${k}: 0 minutur -> null, ekki FPL-nullid`);

/* FPL-SAETI-DALKARNIR VORU FJARLAEGDIR 7.8.2026 (beidni notanda: "hvad er
   thetta ad segja okkur?"). Attta dalkar syndu ROD FPL a somu tolum og eru
   thegar i toflunni (stig/leik, form, ICT...) — taflan radar sjalf, svo
   thetta var tvitekin upplysing. Vordurinn er nu OFUGUR: enginn dalkur ma
   lesa `_rank_type` an thess ad flokkur se til fyrir hann.              */
{
  const rankCols = STAT_DEFS.filter(d => /_rank_type/.test(String(d.get)));
  eq(rankCols.length, 0,
    `engir FPL-saeti dalkar eftir${rankCols.length ? " — " + rankCols[0].key : ""}`);
}

// fmtStat
eq(fmtStat(STAT_BY_KEY.now_cost, 7.5), "£7.5", "verð birt með £");
eq(fmtStat(STAT_BY_KEY.goals_minus_xg, 1.8), "+1.80", "formerki á signed tölum");
eq(fmtStat(STAT_BY_KEY.goals_minus_xg, -1.8), "-1.80", "neikvætt formerki");
eq(fmtStat(STAT_BY_KEY.cs_pct, 40), "40%", "prósent birt með %");
eq(fmtStat(STAT_BY_KEY.total_points, null), "—", "null birtist sem strik");
/* NEIKVAED UPPHAED: FORMERKID FYRIR FRAMAN GJALDMIDILINN (17.8.2026).
   `£-0.2` las eins og gjaldmidillinn heiti "£-". FULLYRDINGIN ER TVIHLIDA:
   fyrst ad neikvaeda formid se rett, SVO ad thad jakvaeda hafi ekki
   brotnad — og loks ad thetta se raunverulegt tilfelli og ekki jadar:
   311 af 459 rodum i "Chg season" (2025/26) eru neikvaedar.             */
eq(fmtStat(STAT_BY_KEY.cost_change_start, -0.2), "-£0.2", "neikvæð upphæð: −£0,2, ekki £-0,2");
eq(fmtStat(STAT_BY_KEY.cost_change_start, 0.3), "+£0.3", "jákvæð upphæð heldur + og £");
eq(fmtStat(STAT_BY_KEY.cost_change_event, -1.5), "-£1.5", "sama regla á GW-verðbreytingu");
/* ASCII-MINUS, EKKI U+2212 — OG ThAD ER MAELT, EKKI SMEKKUR. Profin sem lesa
   tolur AF SKJANUM (playerlist-sort.mjs) svipta burt `[£%,+]` og
   `parseFloat`-a afganginn; U+2212 lifir tha af og gefur NaN. Toluhlutinn
   kemur auk thess fra `toFixed`, sem er ASCII, svo tvo tákn fyrir sama
   formerki i somu toflu vaeri ny osamkvaemni.                            */
{
  const s = fmtStat(STAT_BY_KEY.cost_change_start, -0.2);
  ok(!/−/.test(s) && Number.isFinite(parseFloat(s.replace(/[£%,+]/g, ""))),
    `neikvæð upphæð er þáttanleg eins og skjá-prófin gera það (${s} -> ${parseFloat(s.replace(/[£%,+]/g,""))})`);
}
{
  const rows = J("player_seasons.json").players;
  let neg = 0, n = 0;
  for (const seas of Object.values(rows)) {
    const h = seas["2025/26"]; if (!h || h.cost_change_start == null) continue;
    n++; if (+h.cost_change_start < 0) neg++;
  }
  ok(neg > n / 3, `neikvæð verðbreyting er meirihluti dálksins, ekki jaðartilfelli (${neg}/${n})`);
}

/* ================= 3. buildLeaderboard ================= */
console.log("\n=== 3. STIGATAFLAN — röðun, þak og síur ===");
const lbPts = buildLeaderboard({ players, statKey: "total_points", limit: 20 });
ok(lbPts.rows.length > 0, `stigatafla skilar röðum (${lbPts.rows.length})`);
ok(lbPts.rows.every((r, i, a) => i === 0 || a[i-1].v >= r.v), "hæst-fyrst röðun (hi:true)");
eq(lbPts.rows[0].rank, 1, "fyrsta sæti er 1");

const lbCost = buildLeaderboard({ players, statKey: "now_cost", limit: 10 });
ok(lbCost.rows.every((r, i, a) => i === 0 || a[i-1].v <= r.v), "lægst-fyrst þegar hi:false (verð)");

// jafnteflis-saeti: sama tala -> sama saeti
const tie = buildLeaderboard({ players, statKey: "red_cards", limit: 40 });
const tiedSameRank = tie.rows.every((r, i, a) => i === 0 || (r.v === a[i-1].v ? r.rank === a[i-1].rank : r.rank > a[i-1].rank));
ok(tiedSameRank, "jafntefli fá sama sæti");

// stodu-sia
const gkOnly = buildLeaderboard({ players, statKey: "saves", pos: "1", limit: 50 });
ok(gkOnly.rows.every(r => r.p.element_type === 1), "stöðu-sía heldur (aðeins markverðir)");
// tolur sem eru merktar pos: birtast ekki fyrir adrar stodur
const savesFwd = buildLeaderboard({ players, statKey: "saves", pos: "4", limit: 10 });
eq(savesFwd.rows.length, 0, "vörslur eru ekki í boði fyrir framherja (def.pos)");

// minutu-thakid gildir a hlutfallstolur en EKKI a heildartolur
const floor = minutesFloor(players, 0.25);
ok(floor >= 0, `mínútu-þak reiknað úr mestu spiluðu mínútum (${floor})`);
const rate = buildLeaderboard({ players, statKey: "pts_per_90", minMinutes: floor, limit: 30 });
ok(rate.rows.every(r => (num(r.p.minutes) ?? 0) >= floor), "hlutfallstala hlýðir mínútu-þaki");
const total = buildLeaderboard({ players, statKey: "goals_scored", minMinutes: floor, limit: 30 });
eq(total.skipped, 0, "heildartala (mörk) hlýðir EKKI mínútu-þaki");

// leit og lids-sia
const one = players.find(p => p.web_name);
const searched = buildLeaderboard({ players, statKey: "total_points", search: one.web_name, limit: 50 });
ok(searched.rows.some(r => r.p.id === one.id), `leit finnur "${one.web_name}"`);
const teamF = buildLeaderboard({ players, statKey: "total_points", teamId: String(one.team), limit: 100 });
ok(teamF.rows.every(r => r.p.team === one.team), "liðs-sía heldur");
eq(buildLeaderboard({ players, statKey: "engin_svona_tala" }).rows.length, 0, "óþekktur lykill hrynur ekki");

/* ================= 4. gwTotals / gwTop / withDerived ================= */
if (report) {
  console.log("\n=== 4. UMFERÐARTÖLUR ===");
  const rows = withDerived(report.players);
  eq(rows.length, report.players.length, "withDerived breytir ekki fjölda raða");
  const t = gwTotals(rows);
  eq(t.players, rows.length, "totals telja allar raðir");

  // handreiknad: summa marka verdur ad passa
  const sumGoals = report.players.reduce((s, p) => s + (p.goals || 0), 0);
  eq(t.goals, sumGoals, `mörk lögð saman (${sumGoals})`);
  const sumPts = report.players.reduce((s, p) => s + (p.points || 0), 0);
  eq(t.points, sumPts, "stig lögð saman");
  near(t.avg_points, sumPts / rows.length, 0.01, "meðalstig");

  // gwTop
  const topPts = gwTop(rows, "points", 5);
  ok(topPts.length <= 5 && topPts.every((r, i, a) => i === 0 || a[i-1].points >= r.points),
    "gwTop raðar hæst-fyrst");
  const topLow = gwTop(rows, "points", 5, { hi: false });
  ok(topLow.every((r, i, a) => i === 0 || a[i-1].points <= r.points), "gwTop hi:false raðar lægst-fyrst");
  ok(gwTop(rows, "points", 5, { minMinutes: 60 }).every(r => r.minutes >= 60), "minMinutes heldur");
  eq(gwTop(rows, "svid_sem_er_ekki_til", 5).length, 0, "óþekkt svið skilar tómu, hrynur ekki");

  // afleiddar tolur
  const withXg = rows.find(r => r.xg != null && r.xgi != null);
  if (withXg) {
    near(withXg.g_minus_xg, (withXg.goals || 0) - withXg.xg, 0.011, "Mörk − xG per rað");
    near(withXg.gi_minus_xgi, withXg.gi - withXg.xgi, 0.011, "Framlög − xGI per rað");
  }
}

/* ================= 5. bestXi ================= */
console.log("\n=== 5. LIÐ VIKUNNAR — FPL-formasjónarreglur ===");
if (report) {
  const { xi, count, points } = bestXi(withDerived(report.players));
  eq(xi.length, 11, "ellefu leikmenn");
  eq(count.GK, 1, "nákvæmlega 1 markvörður");
  ok(count.DEF >= 3 && count.DEF <= 5, `vörn 3–5 (${count.DEF})`);
  ok(count.MID >= 2 && count.MID <= 5, `miðja 2–5 (${count.MID})`);
  ok(count.FWD >= 1 && count.FWD <= 3, `sókn 1–3 (${count.FWD})`);
  eq(points, xi.reduce((s, r) => s + (r.points || 0), 0), "stigasumma stemmir");
  ok(xi.every((r, i, a) => i === 0 || (POS_ORDER[a[i-1].pos] <= POS_ORDER[r.pos])),
    "raðað eftir stöðu (markv. fyrst)");
}
// synthetiskt: gradug rodun ma ekki brjota lagmorkin
const synth = [
  ...Array.from({ length: 8 }, (_, i) => ({ name:`m${i}`, pos:"MID", points: 20 - i, bps: 0 })),
  ...Array.from({ length: 4 }, (_, i) => ({ name:`d${i}`, pos:"DEF", points: 2, bps: 0 })),
  { name:"gk", pos:"GK", points: 1, bps: 0 },
  { name:"f", pos:"FWD", points: 1, bps: 0 },
];
const sx = bestXi(synth);
eq(sx.xi.length, 11, "synth: 11 valdir þótt miðjumenn séu stigahæstir");
eq(sx.count.MID, 5, "synth: miðja stoppar í 5 (þak virt)");
eq(sx.count.GK, 1, "synth: markvörður tekinn þótt hann sé stigalægstur");
ok(sx.count.DEF >= 3, "synth: lágmark 3 í vörn virt");
eq(bestXi([]).xi.length, 0, "tómt inntak skilar tómu liði");

/* ================= 6. ESPN-SKOT ================= */
console.log("\n=== 6. ESPN-SKOT — hnitakerfi, woodwork, teigur ===");
ok(hasShots, "data/last_gw_shots.json er til (pipeline: fetchEspnShots)");
if (shotsF) {
  const sh = shotsF.shots;
  ok(Array.isArray(sh) && sh.length > 50, `skot-listi (${sh.length})`);
  eq(shotsF.gw, report?.gw, "sama umferð og last_gw.json");
  eq(shotsF.season, report?.season, "sama tímabil og last_gw.json");
  ok(shotsF.caveats?.no_xg, "caveats segja að xG per skot VANTI (engar big chances)");
  ok(shotsF.caveats?.excluded && shotsF.caveats?.scale,
    "caveats telja hnitalaus skot OG skjalfesta kvarðann (52,5 m)");

  const usable = sh.filter(s => s.usable);
  ok(usable.every(s => s.x >= 0 && s.x <= 1), "X er 0–1 (hlutfall af hálfum velli)");
  ok(usable.every(s => s.y >= 0 && s.y <= 1), "Y er 0–1 þvert yfir völlinn");
  ok(usable.every(s => !(s.x === 0 && s.y === 0)), "(0,0) er talið óskráð, ekki hornið");
  ok(sh.filter(s => !s.usable).every(s => s.x == null || (s.x === 0 && s.y === 0)),
    "aðeins hnitalaus skot eru merkt usable:false");

  /* ===== KVORDUNAR-VORDUR — sterkasta profid a skot-kortinu =====
     x er hlutfall af HALFUM velli (52,5 m). Thad var ekki gefid: fyrsta
     utgafan notadi 105 m og setti hvert skot i TVOFALDA fjarlaegd, svo mork
     birtust vid midjulinu. Villan var ekki synileg i neinu profi.

     Vordurinn kvardar hnitin gegn SVAEDIS-TEXTA ESPN, sem er OHAD
     hnitunum ("from the centre of the box" vs "outside the box"). Ef
     ESPN skiptir um einingu (eda um kvarda) hrynur samsvorunin og thetta
     prof fellur — i stad thess ad kortid ljugi thegjandi.                */
  const M_HALF = 52.5, BOX = 16.5, SIX = 5.5;
  const xs = z => sh.filter(s => s.usable && s.zone === z).map(s => s.x);
  const inBoxX  = sh.filter(s => s.usable && s.in_box === true).map(s => s.x);
  const outBoxX = sh.filter(s => s.usable && s.in_box === false).map(s => s.x);
  const mx = a => Math.max(...a), mn = a => Math.min(...a);

  ok(mx(xs("close_range")) <= (SIX / M_HALF) * 1.15,
    `markteigs-skot innan markteigs: max x ${mx(xs("close_range")).toFixed(3)} vs 5,5/52,5 = ${(SIX/M_HALF).toFixed(3)}`);
  ok(mx(inBoxX) <= (BOX / M_HALF) * 1.10,
    `teig-skot innan teigs: max x ${mx(inBoxX).toFixed(3)} vs 16,5/52,5 = ${(BOX/M_HALF).toFixed(3)}`);
  ok(mn(outBoxX) >= (BOX / M_HALF) * 0.95,
    `skot utan teigs eru utan teigs: min x ${mn(outBoxX).toFixed(3)} vs ${(BOX/M_HALF).toFixed(3)}`);
  ok(mx(inBoxX) < mn(outBoxX) * 1.05,
    "teigur og utan-teigs skarast ekki (svæðis-texti og hnit eru samstiga)");
  // 105 m kvardinn MA EKKI passa — annars er vordurinn gagnslaus
  ok(!(mx(inBoxX) <= BOX / 105),
    `105 m kvardinn er UTILOKADUR (teigmork vaeru 0,157, en teig-skot na ${mx(inBoxX).toFixed(3)})`);

  // y: teigbreidd 40,3 af 68 m -> 0,204..0,796. Vinstri/midja/haegri i rod.
  const ys = z => sh.filter(s => s.usable && s.zone === z).map(s => s.y);
  ok(mx(ys("box_left")) < mn(ys("box_centre")) &&
     mx(ys("box_centre")) < mn(ys("box_right")),
    "y-ásinn: vinstri < miðja < hægri í teignum, án skörunar");
  const inBoxY = sh.filter(s => s.usable && s.in_box === true).map(s => s.y);
  ok(mn(inBoxY) >= 0.204 * 0.85 && mx(inBoxY) <= 0.796 * 1.15,
    `teig-skot innan teigbreiddar: y ${mn(inBoxY).toFixed(3)}–${mx(inBoxY).toFixed(3)} vs 0,204–0,796`);
  // mork eiga ad vera NAER markinu en skot ad medaltali
  const goalX = usable.filter(s => s.kind === "goal").map(s => s.x);
  const otherX = usable.filter(s => s.kind !== "goal").map(s => s.x);
  if (goalX.length && otherX.length) {
    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    ok(avg(goalX) < avg(otherX),
      `mörk skoruð nær marki en önnur skot (${avg(goalX).toFixed(3)} < ${avg(otherX).toFixed(3)})`);
  }

  // tegundir
  const kinds = new Set(sh.map(s => s.kind));
  ok([...kinds].every(k => SHOT_KINDS.some(x => x.key === k)), `allar tegundir þekktar (${[...kinds].join(",")})`);
  ok(sh.some(s => s.kind === "woodwork"), "WOODWORK er til í gögnunum (ESPN 'Shot Hit Woodwork')");
  // woodwork-textinn a ad stydja flokkunina
  const wood = sh.filter(s => s.kind === "woodwork");
  const woodOk = wood.filter(s => /post|bar|woodwork/i.test(s.text || "")).length;
  ok(woodOk >= Math.ceil(wood.length * 0.5),
    `texti styður woodwork-flokkun (${woodOk}/${wood.length} nefna stöng/slá)`);

  // teigur kemur ur TEXTA ESPN, ekki ur hnitum — svo hann ma ekki vera getinn
  ok(sh.some(s => s.in_box === true) && sh.some(s => s.in_box === false), "teig-flokkun bæði true og false");
  ok(sh.every(s => s.in_box === null || typeof s.in_box === "boolean"), "in_box er boolean eða null (ekki getið)");

  // skyttan og lidid
  ok(sh.filter(s => s.player).length / sh.length > 0.95, "skytta þekkt á >95% skota");
  const noTeam = sh.filter(s => !s.team && s.kind !== "own_goal");
  eq(noTeam.length, 0, "hvert skot (nema sjálfsmörk) hefur lið");

  // shotSummary
  const sum = shotSummary(sh);
  eq(sum.total, sh.length, "shotSummary telur öll skot");
  eq(sum.on_target_total, sum.goal + sum.on_target, "skot á mark = mörk + varin");
  ok(sum.accuracy >= 0 && sum.accuracy <= 100, `nýtingarhlutfall 0–100 (${sum.accuracy}%)`);
  eq(shotSummary([]).total, 0, "tómt inntak hrynur ekki");

  // shotsFor-siur
  const f0 = shotsF.fixtures[0];
  const perFx = shotsFor(sh, { fixture: f0.fixture });
  ok(perFx.all.length > 0 && perFx.all.every(s => s.fixture === f0.fixture), "sía á leik heldur");
  eq(perFx.usable.length + perFx.excluded, perFx.all.length, "usable + excluded = allt");
  const t0 = sh.find(s => s.team)?.team;
  ok(shotsFor(sh, { team: t0 }).all.every(s => s.team === t0), "sía á lið heldur");
}

/* ================= 7. NAFNA-PÖRUN ================= */
console.log("\n=== 7. NAFNA-PÖRUN FPL <-> ESPN ===");
eq(normName("Mohamed Salah"), "mohamed salah", "normName: einfalt nafn");
eq(normName("João Palhinha"), "joao palhinha", "normName: broddstafir fjarlægðir");
eq(normName("M.Salah"), "m salah", "normName: punktur verður bil");
eq(normName("Wan-Bissaka"), "wan bissaka", "normName: bandstrik verður bil");
eq(normName(null), "", "normName þolir null");
eq(normName("Pascal Groß"), "pascal gross", "normName: ß -> ss (var 'gro' og braut pörun)");
eq(normName("Ferdi Kadıoğlu"), "ferdi kadioglu", "normName: punktlaust ı (var 'kad oglu')");
ok(nameScore("Diego Gómez Amarilla", "Diego Gómez") >= 2, "samsett eftirnafn parast (orða-skörun)");
ok(nameScore("Santiago Ignacio Bueno", "Santiago Bueno") >
   nameScore("Santiago Ignacio Bueno", "Hugo Bueno"),
  "rétti Bueno vinnur yfir samherja með sama eftirnafni");
eq(nameScore("Mohamed Salah", "Erling Haaland"), 0, "ólík nöfn skora 0");

/* ============================================================
   ÓGILD RÖÐ MÁ EKKI HLIÐRA PÖRUNINNI — ÞÖGUL RANGFÆRSLA

   `matchShotsToPlayers` byggði kandídata úr SÍUÐU fylki (`rowsOf` hendir
   null/ógildum röðum) en sótti sigurvegarann úr HRÁA fylkinu. Ein null-röð
   fremst hliðraði því öllum vísitölum á eftir henni og leikmenn fengu
   skot-tölur ANNARS MANNS. Mælt: Salah fékk NULL og Gakpo fékk 111 skot
   Salah — nákvæmlega villan sem fallið er til að koma í veg fyrir.

   Raungögnin hafa engar ógildar raðir í dag (0 af 206 og 0 af 393), svo
   prófið HÉR verður að nota tilbúin gögn: án þeirra er þetta jarðsprengja
   sem enginn stígur á fyrr en heimildin skilar einni null-röð.
   ============================================================ */
{
  const SHOTS = [
    null,                                            // síuð burt -> hliðrun
    { name: "Mohamed Salah", team: "LIV", shots: 111 },
    { name: "Cody Gakpo",    team: "LIV", shots: 55 },
  ];
  const ROWS = [{ name: "Mohamed Salah", team: "LIV" },
                { name: "Cody Gakpo",    team: "LIV" }];
  const m = matchShotsToPlayers(ROWS, SHOTS);
  const got = Object.fromEntries(m.rows.map(r => [r.name, r.shot?.name ?? null]));
  ok(got["Mohamed Salah"] === "Mohamed Salah" && got["Cody Gakpo"] === "Cody Gakpo",
     `ógild röð hliðrar EKKI pöruninni (${JSON.stringify(got)})`);
  ok(m.rows.every(r => !r.shot || r.shot.name === r.name),
     "enginn fær skot-tölur annars manns");
  /* Og fleiri ógildar gerðir en null — sama sía, sama hætta. */
  const m2 = matchShotsToPlayers(ROWS, ["strengur", 42, ...SHOTS.slice(1)]);
  ok(m2.rows.every(r => !r.shot || r.shot.name === r.name),
     "strengur/tala i skyttulista hliðrar ekki heldur");
}

if (report && shotsF) {
  const m = matchShotsToPlayers(withDerived(report.players), shotsF.players);
  eq(m.rows.length, report.players.length, "pörun breytir ekki fjölda raða");
  eq(m.matched + m.unmatched, report.players.length, "matched + unmatched = allt");
  // OPARADIR FA null, EKKI null-i BREYTT I 0 — annars birtist "0 skot" sem stadreynd
  ok(m.rows.filter(r => !r.shot).every(r => r.shot === null), "ópöraðir fá null (ekki 0 skot)");
  // ekkert lek milli lida
  ok(m.rows.filter(r => r.shot).every(r => r.shot.team === r.team), "pörun aldrei þvert á lið");
  // engin ESPN-skytta ma parast vid TVO FPL-menn
  const usedNames = m.rows.filter(r => r.shot).map(r => r.shot.name);
  eq(usedNames.length, new Set(usedNames).size, "hver ESPN-skytta parast við mest EINN FPL-mann");

  /* VORDUR A PORUNARHLUTFALLI. Maelt 27.7.2026: 161/162 = 99% eftir
     (a) TRANSLIT-toflu, (b) orða-skorun i stad sidasta ords og
     (c) EITT-A-EITT porun. Var 80% med sidasta-ords-porun, og 5 skyttur
     voru tvi-eignaðar adur en eitt-a-eitt kom inn.
     Sa EINI sem eftir stendur er Brasiliumadur thar sem ESPN notar
     gaelunafn og FPL logheiti — krefdist gaelunafna-toflu, ekki villa.
     Ef thetta fellur undir 90% hefur heimild breytt nafnaformi.         */
  const rate = 1 - m.shotsUnmatched / shotsF.players.length;
  ok(rate >= 0.90,
    `ESPN-skyttur paraðar: ${shotsF.players.length - m.shotsUnmatched}/${shotsF.players.length}`
    + ` = ${(rate*100).toFixed(0)}% (þak 90%)`);
  console.log(`     (${m.matched} FPL-raðir pöruðust · ${m.shotsUnmatched} skytta án FPL-manns)`);
}

/* ================= 8. VÖRÐUR: MÖRK VERÐA AÐ STEMMA ================= */
console.log("\n=== 8. VÖRÐUR — skýrslan verður að stemma við úrslitin ===");
if (report) {
  // Summa marka i urslitum leikjanna vs summa marka i leikmanna-rodunum.
  // Thetta er STERKASTA profid a badar heimildir i einu: ef pipeline
  // parar vitlausa leiki eða tvitelur tvofalda umferd, fellur thetta.
  const scored = report.fixtures.reduce((s, f) => s + (f.h_score ?? 0) + (f.a_score ?? 0), 0);
  const byPlayers = report.players.reduce((s, p) => s + (p.goals || 0), 0);
  const ownGoals = report.players.reduce((s, p) => s + (p.og || 0), 0);
  ok(scored > 0, `úrslit leikjanna gefa ${scored} mörk`);
  eq(byPlayers + ownGoals, scored, `mörk leikmanna (${byPlayers}) + sjálfsmörk (${ownGoals}) = úrslit (${scored})`);

  if (shotsF) {
    // Sama vordur a ESPN-hlidinni.
    const espnGoals = shotsF.shots.filter(s => s.kind === "goal").length;
    const espnOwn   = shotsF.shots.filter(s => s.kind === "own_goal").length;
    eq(espnGoals + espnOwn, scored, `ESPN-mörk (${espnGoals}+${espnOwn} sjálfsm.) = úrslit (${scored})`);
    // og leikirnir sjalfir
    eq(shotsF.fixtures.length, report.fixtures.length, "sami fjöldi leikja í báðum skrám");
    const fxIds = new Set(report.fixtures.map(f => f.id));
    ok(shotsF.fixtures.every(f => fxIds.has(f.fixture)), "hver ESPN-leikur parast við FPL-fixture-id");
  }

  // engin rad ma vera tom-tolulaus
  ok(report.players.every(p => Number.isFinite(p.minutes) && Number.isFinite(p.points)),
    "hver rað hefur mínútur og stig sem tölur");

  // gwFixtureReports
  const fr = gwFixtureReports({ report, shotsFile: shotsF });
  eq(fr.length, report.fixtures.length, "fixture-skýrslur fyrir hvern leik");
  ok(fr.every(f => f.players.every(p => p.fixture === f.fx.id)), "leikmenn lenda í rétta leiknum");
  ok(fr.every(f => !f.star || f.players[0] === f.star), "stjarna er stigahæsti leikmaður leiksins");
  ok(fr.every((f, i, a) => i === 0 || String(a[i-1].fx.kickoff) <= String(f.fx.kickoff)),
    "leikir raðast í tímaröð");
}



/* ================= 10. MO / AO — "ohjakvaemilegt" ================= */
console.log("\n=== 10. MÓ / AÓ — óhjákvæmilegt ===");
const hasImm = existsSync(D + "imminent.json");
ok(hasImm, "data/imminent.json er til (pipeline: deriveImminent)");

// formulan sjalf a thekktum inntokum
const w = { minutes: 320, goals: 0, assists: 1, xg: 2.0, xa: 0.4, threat: 100, creativity: 90 };
/* MAGNLIDURINN ER xGI (xg+xa), ENDURMAELT 29.7.2026: markmid mo er
   mork+ASSIST, svo inntakid verdur ad innihalda upplagshlutann. xG eitt
   gaf lyftingu 2,379, xGI gefur 2,498 (3/4 timabil, 4 timabil maeld).   */
near(moScore(w), 0.8*(2.0 + 0.4) + 0.3*(100/25) + 0.2*2.0, 1e-6,
  "mó = xGI·0,8 + threat/25·0,3 + óheppni·0,2");
ok(moScore({ ...w, xa: 1.2 }) > moScore({ ...w, xa: 0 }),
  "xA hækkar mó — upplagsmadur er lika \"a tima\" (var ekki svo fyrir 29.7.)");
near(aoScore(w), (90/320)*90, 0.01, "aó = creativity/90 (bert — samsetning féll)");

/* "Oheppni" telur ADEINS thegar leikmadurinn er UNDIR xG. Sa sem hefur
   skorad MEIRA en xG segir til um a ekki ad fa bonus fyrir thad.        */
near(moScore({ ...w, goals: 3, xg: 2.0 }), 0.8*(2.0 + 0.4) + 0.3*4, 1e-6,
  "yfir-frammistaða gefur EKKI neikvæðan óheppnis-lið (klippt við 0)");
/* Oheppnis-lidurinn er EIGIN daudafaeri (xg-mork), EKKI xgi-gi. Maelt jafnt
   (2,493 a moti 2,498) svo hugtakid ræður: samherji sem klúðrar færi sem
   thu lagdir upp er ekki THIN oheppni.                                   */
near(moScore({ minutes:320, goals:0, assists:0, xg:0, xa:1.0, threat:0 }),
  0.8*1.0, 1e-6, "xA eitt gefur engan óheppnis-lið");
ok(moScore({ ...w, goals: 0 }) > moScore({ ...w, goals: 2 }),
  "sá sem hefur klúðrað sömu færum skorar hærra en sá sem nýtti þau");
eq(moScore(null), null, "null-öruggt");
eq(aoScore({ minutes: 0, creativity: 50 }), null, "0 mínútur → null, ekki Infinity");

// markhopurinn
ok(inImminentPool({ minutes: 300, goals: 1, assists: 0 }), "0–1 framlag og 180+ mín = í markhóp");
ok(!inImminentPool({ minutes: 300, goals: 1, assists: 1 }),
  `2 framlög = UTAN markhóps (þak ${IMMINENT_MAX_GI})`);
ok(!inImminentPool({ minutes: 100, goals: 0, assists: 0 }),
  `undir ${IMMINENT_MIN_MINUTES} mín = of lítið úrtak`);

if (hasImm) {
  const imm = J("imminent.json");
  ok(Array.isArray(imm.players) && imm.players.length > 100, `leikmenn í glugga (${imm.players?.length})`);
  /* TVEIR GLUGGAR NU: `gws` er hvad var SOTT (5, fyrir byrjunar-likur) en
     `window` er mo-glugginn (4, sem valideringin er bundin vid).          */
  eq(imm.gws.length, imm.start_window,
    `sóttar umferðir = byrjunar-gluggi (${imm.gws.join(",")})`);
  eq(imm.window, 4, "mó-gluggi er 4 umferðir — óháður sóknar-glugganum");
  ok(imm.measured?.mo && imm.measured?.ao, "mæling skjalfest í skránni");

  /* VÖRÐUR: `xa` VERÐUR AÐ VERA Í GLUGGANUM — annars er xGI-liðurinn DAUÐUR.
     Frá 29.7. les moScore (xg + xa). Ef pipeline hætti að skrifa `xa` læsi
     formúlan 0 og bætingin (+0,119 lyfting) væri horfin ÞÖGULT — appið birti
     áfram tölu, bara verri. Þetta er sama gildran sem kostaði viku þegar
     markaðsliðurinn var dauður í `odds.json` og öll prófin voru græn: þau
     prófuðu formúluna, ekki hvort gögnin sem hún fær séu nýtileg.         */
  const wins = (imm.players || []).map(p => p.window).filter(Boolean);
  ok(wins.length > 100, `nógu margir gluggar til að mæla (${wins.length})`);
  ok(wins.every(w => "xa" in w), "HVER gluggi hefur xa-svið (ekki bara flestir)");
  const xaLive = wins.filter(w => (w.xa ?? 0) > 0).length;
  ok(xaLive / wins.length > 0.10,
     `xa er RAUNVERULEGA fyllt, ekki allt núll (${xaLive}/${wins.length} = ` +
     `${Math.round(xaLive/wins.length*100)}%)`);
  /* Og að hún hafi ÁHRIF á tölu sem er birt: einhver í markhópnum verður að
     fá hærra mó út af xA en hann hefði fengið af xG einni.                */
  const pool = wins.filter(w => inImminentPool(w));
  const moved = pool.filter(w => moScore(w) > moScore({ ...w, xa: 0 })).length;
  ok(moved > 0, `xA hreyfir mó hjá raunverulegum leikmönnum (${moved} af ${pool.length})`);
  ok(/0/.test(String(imm.measured.ao)) && /creativity/i.test(String(imm.measured.ao)),
    "AÓ-skýringin segir að samsetningin hafi FALLIÐ (0/3) — ekki falin");

  const board = imminentBoard(imm.players, "mo", 20);
  ok(board.length > 0 && board.length <= 20, `mó-tafla skilar röðum (${board.length})`);
  ok(board.every(p => inImminentPool(p.window)), "AÐEINS leikmenn í markhóp komast á töfluna");
  ok(board.every((p, i, a) => i === 0 || a[i-1].score >= p.score), "raðað hæst-fyrst");
  ok(board.every(p => (p.window.goals + p.window.assists) <= IMMINENT_MAX_GI),
    "enginn á töflunni hefur þegar sprungið út (>1 framlag)");
  const aboard = imminentBoard(imm.players, "ao", 20);
  ok(aboard.length > 0, `aó-tafla skilar röðum (${aboard.length})`);
  // MO og AO eiga ad rada OLIKT — annars er annar theirra tilgangslaus
  const top5mo = board.slice(0,5).map(p => p.name).join("|");
  const top5ao = aboard.slice(0,5).map(p => p.name).join("|");
  ok(top5mo !== top5ao, "mó og aó raða ekki eins (ólík merki, ekki sama talan tvisvar)");
}


/* ================= 11. ILLGJARNT INNTAK ================= */
/* Skrarnar koma UTAN UR NETI. Ef ein er half-skrifud eda skemmd ma
   framendinn birta MINNA en aldrei hrynja. Thetta profar HVERT utflutt
   fall gegn 27 skemmdum logunum — thar med `[null]` (null-rad inni i
   giltu fylki, sem faerdi bestXi nidur adur) og hlut i stad fylkis
   (`players` sem hlutur — sem hefur GERST i thessu repo adur).        */
console.log("\n=== 11. ILLGJARNT INNTAK (engin undantekning, ekkert NaN) ===");
{
  const HOSTILE = [
    undefined, null, {}, [], 0, -1, "", "abc", NaN, Infinity, -Infinity,
    { minutes: null }, { minutes: "x" }, { minutes: 0 }, { minutes: -5 },
    { minutes: NaN, goals: NaN }, { window: null }, { window: {} },
    { series: null }, { players: null }, { fixtures: null },
    { players: [], fixtures: [] }, { players: [{}], fixtures: [{}] },
    [null], [undefined], [{}], [{ pos: null }],
  ];
  const M = await import("../src/stats.js");
  const FUNCS = [
    ["num", a => M.num(a)], ["normName", a => M.normName(a)],
    ["nameScore", a => M.nameScore(a, a)], ["moScore", a => M.moScore(a)],
    ["aoScore", a => M.aoScore(a)], ["inImminentPool", a => M.inImminentPool(a)],
    ["teamsWithCleanSheet", a => M.teamsWithCleanSheet(a)],
    ["minutesFloor", a => M.minutesFloor(a)],
    ["isIncoherent", a => M.isIncoherent(a, "goals_scored", 5)],
    ["fmtStat", a => M.fmtStat(a, 1.5)],
    ["withDerived", a => M.withDerived(a)], ["gwTotals", a => M.gwTotals(a)],
    ["bestXi", a => M.bestXi(a)], ["shotSummary", a => M.shotSummary(a)],
    ["shotsFor", a => M.shotsFor(a)], ["gwTop", a => M.gwTop(a, "points")],
    ["imminentBoard", a => M.imminentBoard(a, "mo")],
    ["matchShotsToPlayers", a => M.matchShotsToPlayers(a, a)],
    ["buildLeaderboard", a => M.buildLeaderboard({ players: a, statKey: "total_points" })],
    ["gwFixtureReports", a => M.gwFixtureReports({ report: a, shotsFile: a })],
  ];
  let threw = [], leaked = [];
  for (const [name, fn] of FUNCS) {
    for (const h of HOSTILE) {
      let out;
      try { out = fn(h); }
      catch (e) { threw.push(`${name}: ${e.message.slice(0, 40)}`); continue; }
      let flat = "";
      try { flat = JSON.stringify(out ?? null) || ""; } catch { flat = ""; }
      if (/(NaN|Infinity)/.test(flat)) leaked.push(`${name} -> ${flat.slice(0, 40)}`);
      if (typeof out === "number" && !Number.isFinite(out)) leaked.push(`${name} -> ${out}`);
    }
  }
  ok(threw.length === 0,
    `ekkert fall kastar á skemmdu inntaki${threw.length ? " — " + threw[0] : ` (${FUNCS.length} föll × ${HOSTILE.length} lögun)`}`);
  ok(leaked.length === 0,
    `ekkert NaN/Infinity lekur út${leaked.length ? " — " + leaked[0] : ""}`);
  // og enn RETT a giltu inntaki eftir throlgardana
  eq(M.fmtStat(M.STAT_BY_KEY.total_points, 42), "42", "þolgarðar breyta ekki réttri útkomu");
  eq(M.bestXi([{ pos:"GK", points:5 }, null, { pos:"DEF", points:3 }]).xi.length, 2,
    "null-rað er sleppt en gildar raðir haldast");
}


/* ================= 12. BYRJUNAR-LIKUR ================= */
console.log("\n=== 12. BYRJUNAR-LÍKUR (bekkjar-hætta) ===");
{
  const M = START_MODEL.measured;
  ok(M.samples > 60000 && M.seasons === 3, `mæling skjalfest (${M.samples} sýni, ${M.seasons} tímabil)`);
  ok(M.brier < M.brier_baseline,
    `betur kvarðað en grunnreglan (Brier ${M.brier} < ${M.brier_baseline})`);
  ok(M.trap_lift >= 1.8, `bekkjar-lyfting ${M.trap_lift}× skjalfest`);

  // eiginleikar ur minutu-rod
  const f = startFeatures([90, 90, 90, 90, 90], 75);
  eq(f.starts5, 1, "fastamaður: starts5 = 1");
  eq(f.started_last, 1, "byrjaði síðast");
  eq(f.mins5, 90, "mins5 = 90");
  const f2 = startFeatures([0, 0, 0, 0, 90], 45);
  eq(f2.started_last, 1, "bakvörður sem spilaði síðasta leik: started_last = 1");
  near(f2.starts5, 0.2, 1e-9, "en starts5 aðeins 0,2");

  /* KJARNINN: sami leikmadur, EINI munurinn er sagan a undan.
     Likanid verdur ad greina thetta ad — annars er thad gagnslaust.      */
  const pSafe = startProbability(startFeatures([90,90,90,90,90], 75));
  const pTrap = startProbability(startFeatures([0,0,0,0,90], 45));
  ok(pSafe > 0.8, `fastamaður fær háar líkur (${pSafe})`);
  ok(pTrap < 0.5, `sá sem byrjaði EINU SINNI fær lágar líkur (${pTrap})`);
  ok(pSafe - pTrap > 0.4, "líkanið greinir þessa tvo skýrt að");

  // haettuflokkun
  eq(startRisk(startFeatures([90,90,90,90,90], 75)).level, "safe", "fastamaður = safe");
  eq(startRisk(startFeatures([0,0,0,0,90], 45)).level, "trap",
    "byrjaði síðast en lágar líkur = TRAP (þetta er flokkurinn sem stuðullinn er til fyrir)");
  eq(startRisk(startFeatures([0,10,0,25,15], 45)).level, "low", "skiptimaður = low");

  // throl
  eq(startProbability(null), null, "null-öruggt");
  eq(startFeatures([], 50), null, "tóm mínútu-röð → null");
  eq(startFeatures([90], 50), null, "ein umferð er of lítið → null");
  eq(startProbability({ starts5: 1 }), null, "vantandi eiginleiki → null, ekki NaN");
  ok(startProbability(startFeatures([90,90,90,90,90], null)) != null,
    "vantandi verð fellur á meðaltal, hrynur ekki");

  // likur verda ALLTAF a [0,1]
  const extremes = [[0,0,0,0,0],[90,90,90,90,90],[120,120,120,120,120],[-5,-5,0,0,90]];
  ok(extremes.every(m => { const p = startProbability(startFeatures(m, 200)); return p >= 0 && p <= 1; }),
    "líkur alltaf á [0,1], líka við öfgagildi");
}

if (existsSync(D + "imminent.json")) {
  const imm = J("imminent.json");
  ok(imm.start_window === 5, `byrjunar-gluggi er 5 umferðir (${imm.start_window})`);
  ok(imm.window === 4, `mó-gluggi HELDUR sér í 4 (${imm.window}) — validering bundin við það`);
  ok(imm.fetched_gws.length === 5, `5 umferðir sóttar (${imm.fetched_gws?.join(",")})`);
  const withF = imm.players.filter(p => p.start_feats);
  ok(withF.length > 500, `${withF.length} leikmenn með byrjunar-eiginleika`);
  // mo-gluggi ma ALDREI vera lengri en 4 umferdir
  ok(imm.players.every(p => !p.mo_gws || p.mo_gws.length <= 4),
    "mó-gluggi aldrei lengri en 4 umferðir (5-umferða sókn má ekki leka í mó)");
  // allar likur gildar
  const probs = withF.map(p => startProbability(p.start_feats)).filter(v => v != null);
  ok(probs.length === withF.length, "líkur reiknast fyrir alla með eiginleika");

  /* ============================================================
     PIPELINE VERDUR AD NOTA `startFeatures`, EKKI EIGID AFRIT

     `fetch.mjs` hafdi EIGIN utfaerslu af sama reikningi og hun var ThEGAR
     farin ad reka: afritid skrifadi `value: r.now_cost ?? null` medan
     `startFeatures` fellur a MEDALTALID (48,69). `startProbability`
     skilar null um leid og EINN lidur er null — svo leikmadur an verds
     hefdi thagnad um byrjunar-likur i stad thess ad fa varfaerid mat.
     Enginn slikur i gognunum (0 af 840), svo thetta var LEYND rek.

     Vordurinn er tvennskonar: (a) skrain kallar a fallid, lesid ur koda,
     og (b) gildin i `imminent.json` VERDA ad vera thau somu og fallid
     gefur — thad er sterkara, thvi thad fellur lika ef einhver kallar a
     fallid en breytir nidurstodunni a eftir.                          */
  {
    /* ATHUGASEMDIR BURT ADUR EN LEITAD ER. Fyrsta utgafan leitadi i hraum
       texta og FELL a sjalfri ser: athugasemdin sem ég skrifadi vid
       lagfaeringuna VITNAR i gamla kodann (`value: r.now_cost ?? null`),
       svo "er gamla afritid farid?" svaradi NEI thott thad vaeri farid.
       Sama gildra og i workflow-vardinum (`yml.includes`) — fullyrding
       sem athugasemd getur uppfyllt eda fellt er einskis virdi.        */
    const srcRaw = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
    const src = srcRaw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    ok(/import \{[^}]*startFeatures[^}]*\} from "\.\.\/src\/stats\.js"/.test(src),
       "fetch.mjs flytur inn `startFeatures` ur src/stats.js");
    ok(/startFeatures\(mins,/.test(src), "og kallar a hana i stad eigin afrits");
    ok(!/value:\s*r\.now_cost\s*\?\?\s*null/.test(src),
       "gamla afritid (`value: r.now_cost ?? null`) er farid");

    /* Gildin sjalf: endurreikna ur `start_minutes` og bera vid skrana.  */
    const bad = [];
    for (const p of withF.slice(0, 200)) {
      const f = startFeatures(p.start_minutes, p.start_feats.value);
      if (!f) continue;
      const want = { starts5: +f.starts5.toFixed(3), mins5: +f.mins5.toFixed(1),
                     trend: +f.trend.toFixed(1), started_last: f.started_last };
      for (const k of Object.keys(want))
        if (Math.abs((p.start_feats[k] ?? NaN) - want[k]) > 1e-9)
          bad.push(`${p.name || p.code}.${k}: skra ${p.start_feats[k]} vs fall ${want[k]}`);
    }
    ok(bad.length === 0, `skrain ber somu tolur og fallid (200 syni)`, bad.slice(0, 3).join(" | "));
    /* `value` ma ALDREI vera null — thad er einmitt lidurinn sem drap
       likurnar i gomlu utgafunni.                                       */
    ok(withF.every(p => typeof p.start_feats.value === "number"),
       "`value` er alltaf tala (aldrei null — thad skilar null-likum)");
  }
  ok(probs.every(v => v >= 0 && v <= 1), "allar líkur á [0,1]");
  // TVOFOLD UMFERD: minutur lagdar saman, svo 180 er leyfilegt en 5 stok
  ok(withF.every(p => (p.start_minutes || []).length <= 5),
    "mínútu-röð aldrei fleiri en 5 stök (tvöföld umferð lögð saman)");
  ok(imm.measured?.start_prob && /2,09|2\.09/.test(String(imm.measured.start_prob)),
    "lyftingin skjalfest í skránni");
  /* Enskt eftir thydinguna 9.8.2026; badar ritanir leyfdar thvi
     committud gogn geta enn borid gomlu notuna.                     */
  ok(/hvild|Hvild|\bRest\b/i.test(String(imm.measured.start_prob)),
    "skráin segir að hvíld hafi verið prófuð og HAFNAÐ");
}


/* ================= 13. LEIKMANNALISTINN — 108 DALKAR ================= */
console.log("\n=== 13. LEIKMANNALISTINN (dálkaskráin) ===");
{
  ok(STAT_DEFS.length >= 100, `${STAT_DEFS.length} dálkar skilgreindir`);
  eq(new Set(STAT_DEFS.map(d => d.key)).size, STAT_DEFS.length, "engir tvítekiðir lyklar");
  ok(STAT_DEFS.every(d => STAT_BY_KEY[d.key] === d),
    "STAT_BY_KEY nær yfir ALLA dálka (endurbyggt eftir viðbætur)");
  ok(STAT_DEFS.every(d => STAT_GROUPS.some(g => g.key === d.group)),
    "hver dálkur tilheyrir gildum flokki");
  ok(STAT_GROUPS.every(g => STAT_DEFS.some(d => d.group === g.key)), "enginn flokkur tómur");
  /* HAUSINN LES `short`, EKKI `label` (8.8.2026). Full heiti eru vísvitandi
     LÝSANDI — þau fara í dálkavalarann, filter-chip og tooltip — og passa
     þar af leiðandi ekki í 46-142 px haus. Prófið á að mæla ÞAÐ SEM ER BIRT.
     `hLabel` hér er sama fall og í PlayerList.jsx.                        */
  const hLabel = d => String(d.short ?? d.label);
  ok(STAT_DEFS.every(d => hLabel(d).length <= 12),
    `ekkert HAUS-heiti lengra en 12 stafir (lengst: "${
      STAT_DEFS.map(hLabel).sort((a,b)=>b.length-a.length)[0]}")`);
  ok(STAT_DEFS.every(d => d.label.length <= 32), "engin FULL heiti óhóflega löng");

  /* TVEIR DALKAR MED SAMA HEITI ERU EINN DALKUR I AUGUM NOTANDANS.
     MAELT 17.8.2026: Sokn bar TVO holf merkt `Shots` (BSD, arstidartala) og
     TVO merkt `In box`, 30 dalka a milli, ur sitthvorri heimildinni og yfir
     sitthvort timabilid — a rod Danso las thad `Shots 11 … In box 11 …
     Shots 4 … In box 4`. Verra: `label` sjalft rakst a i tveimur porum
     ("Chances created", "Hit the woodwork"), og LABEL er thad sem stendur i
     dalkavalaranum, i sia-chip-inu og i tooltip — thar er EKKERT band til
     ad greina thau ad.

     "/90" MA ENDURTAKA SIG OG ThAD ER ASETNINGUR, ekki undantekning sem
     thurfti ad skra: thad er ekki heiti heldur VIDSKEYTI sem er lesid MED
     bandinu ("Goals · /90"). Fullyrdingin normaliserar thvi eftir REGLU —
     heiti sem byrjar a "/" er lesid sem band + heiti — i stad thess ad
     halda undanthagulista, sem myndi stadna.                            */
  {
    /* NORMALISERAD SAMANBURDUR — HRAR STRENGIR HLEYPTU TVITEKNINGU I GEGN.
       Sannad 18.8.2026: tvitekning sem var EINGONGU adgreind med
       AFTANLIGGJANDI BILI (`short:"/90 "`, `label:"Goals per 90 "`) slapp
       gegnum alla thrja verdina medan hausinn birti "Goals · /90" TVISVAR.
       Auga notandans ser ekki bilid, svo vordurinn ma thad ekki heldur:
       bil eru felld saman og klippt af, og samanburdurinn er hastafa-blindur
       (tveir dalkar sem heita "Shots" og "SHOTS" eru sami hausinn a skja). */
    const norm = x => String(x ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    const ident = d => { const sh = String(d.short ?? d.label);
                         return norm(sh.startsWith("/") ? `${d.band} ${sh}` : sh); };
    const dupOf = (fn) => {
      const m = new Map();
      for (const d of STAT_DEFS) { const k = fn(d); m.set(k, [...(m.get(k) || []), d.key]); }
      return [...m].filter(([, v]) => v.length > 1);
    };
    /* FORSENDA SONNUD FYRST (CLAUDE.md 5b regla 2): "/90" VERDUR ad vera
       raunverulega endurtekid, annars er normaliseringin ad verja ekkert. */
    const slash = STAT_DEFS.filter(d => String(d.short ?? d.label).startsWith("/"));
    ok(slash.length > 1 && new Set(slash.map(d => d.short)).size < slash.length,
      `"/90" er raunverulega endurtekid haus-heiti (${slash.length} dálkar) — normaliseringin ver eitthvað`);
    const dupShort = dupOf(ident), dupLabel = dupOf(d => norm(d.label));
    eq(dupShort.length, 0,
      `ekkert HAUS-heiti tvítekið (band les "/90")${dupShort.length ? " — " + JSON.stringify(dupShort[0]) : ""}`);
    eq(dupLabel.length, 0,
      `ekkert FULLT heiti tvítekið${dupLabel.length ? " — " + JSON.stringify(dupLabel[0]) : ""}`);
    /* Og innan flokks lika — thad er threngra tilfellid sem notandinn sa. */
    const dupInGroup = dupOf(d => `${d.group}|${ident(d)}`);
    eq(dupInGroup.length, 0, "og ekkert tvítekið innan sama flokks");
  }

  /* ---- 13b. SAMHENGIS-NOTURNAR ERU LEIDDAR, EKKI HANDSKRIFADAR ----
     "2025/26 only" stod i 5 af 24 BSD-dalkum og "one gameweek" i 1 af 8
     ESPN-dalkum; 76%-golfid stod i 1 af 3 dalkum sem koma UR SAMA REGEXI.
     Reglurnar bua nu i `SCOPE_NOTES` og eru lagdar a eftir thvi HVADA REITI
     getterinn les (Proxy-konnun) og hvada bandi dalkurinn er i.
     ThRIR HLUTIR ERU PROFADIR, og saman geta their ekki verid tomir:
       1. hver regla verdur ad na til raunverulegs hops (annars er hun daud)
       2. textinn stendur NAKVAEMLEGA EINU SINNI i hverri notu sem hun tekur til
       3. og HVERGI i notu sem hun tekur ekki til — annars vaeri afrit komid
          aftur inn handvirkt og reglan yrdi skraut.                       */
  {
    ok(SCOPE_NOTES.length >= 4, `${SCOPE_NOTES.length} samhengis-reglur skilgreindar`);
    const counts = {};
    for (const s of SCOPE_NOTES) {
      const hit = STAT_DEFS.filter(s.applies);
      counts[s.id] = hit.length;
      ok(hit.length > 0 && hit.length < STAT_DEFS.length,
        `regla "${s.id}" nær til ${hit.length} dálka af ${STAT_DEFS.length} (hvorki tóm né allt)`);
      const once = hit.filter(d => d.note.split(s.text).length - 1 === 1);
      eq(hit.length - once.length, 0,
        `"${s.id}": textinn stendur nákvæmlega einu sinni í hverri nótu sem hún tekur til`);
      const leaked = STAT_DEFS.filter(d => !s.applies(d) && d.note.includes(s.text));
      eq(leaked.length, 0,
        `"${s.id}": og hvergi annars staðar${leaked.length ? " — " + leaked[0].key : ""}`);
    }
    /* HOPARNIR SJALFIR ERU MAELDIR — annars gaeti `applies` skropid saman i
       einn dalk og allt her ad ofan verid graent afram. OG THAD ER MAELT:
       fullyrding a bord vid `counts.bsd >= 20` SLAPP i stokkbreytingu sem
       tok EINN dalk ut ur reglunni (`&& d.key !== "bsd_rating"`). Krafan er
       thvi ekki a REGLUNA heldur a UTKOMUNA: hver dalkur sem les reit ur
       heimildinni VERDUR ad bera fyrirvarann, hvernig sem reglan er skrifud. */
    const byPrefix = pre => STAT_DEFS.filter(d =>
      [...(FIELDS_READ.get(d.key) || [])].some(k => k.startsWith(pre)));
    for (const [pre, id] of [["_b_", "bsd"], ["_espn_", "espn"]]) {
      const fed = byPrefix(pre), text = SCOPE_NOTES.find(s => s.id === id).text;
      const silent = fed.filter(d => !d.note.includes(text));
      ok(fed.length > 5, `${fed.length} dálkar lesa ${pre}-reit (forsendan er ekki tóm)`);
      eq(silent.length, 0,
        `HVER dálkur sem les ${pre}-reit ber fyrirvarann${silent.length ? " — " + silent.map(d=>d.key).join(",") : ""}`);
    }
    eq(counts.espn, 8, "allir átta ESPN-dálkarnir bera umferðar-fyrirvarann");
    eq(counts["espn-floor"], 3,
      "og öll ÞRJÚ sem koma úr sama regexi bera 76%-gólfið (var 1 af 3)");
    /* UTKOMU-FULLYRDING, EKKI GOLF (lagad 18.8.2026).
       `counts.per90 >= 20` var NAKVAEMLEGA sama lagun og `counts.bsd >= 20`
       sem thegar hafdi slappt einni stokkbreytingu: dalkarnir eru 22, svo
       regla sem missir TVO fer i 20 og stenst — og skilabodin prenta tha
       "naer yfir alla 20", sem er ordid osatt. Golf sem er laegra en
       thydid maelir ekki thekju. Nu er spurt beint: HVER dalkur sem er
       hlutfall per 90 verdur ad bera fyrirvarann, hvernig sem reglan er
       ordud, og listinn er LEIDDUR ur STAT_DEFS en ekki talinn.        */
    const per90Defs = STAT_DEFS.filter(d => /_per_90$/.test(d.key));
    ok(per90Defs.length >= 20, `forsenda: ${per90Defs.length} /90-dalkar til ad verja`);
    const per90Missing = per90Defs.filter(d => !String(d.note).includes("no minutes floor"));
    eq(per90Missing.length, 0,
      `hver /90-dalkur ber fyrirvarann (${per90Defs.length} dalkar)`
      + (per90Missing.length ? ` — vantar: ${per90Missing.map(d => d.key).join(", ")}` : ""));
    /* KONNUNIN SJALF: `FIELDS_READ` verdur ad vera SAMA taflan og `readsFields`
       gefur — vaeri hun byggd fyrir mistok a einu probe-gildi myndu heilar
       greinar hverfa og reglurnar naedu til faerri dalka THOGULT.        */
    const drift = STAT_DEFS.filter(d => {
      const a = [...(FIELDS_READ.get(d.key) || [])].sort().join(",");
      const b = [...readsFields(d)].sort().join(",");
      return a !== b && !b.includes("element_type");   // pos-umbudirnar bæta honum við
    });
    eq(drift.length, 0,
      `FIELDS_READ er sama könnun og readsFields${drift.length ? " — " + drift[0].key : ""}`);
    ok([...(FIELDS_READ.get("bsd_xg_per_shot") || [])].includes("_b_xgs"),
      "könnunin sér reitinn sem getterinn les í raun (_b_xgs)");
  }

  /* ---- 13c. NAKVAEMNIN MA EKKI VERA MEIRI EN HEIMILDIN BER ----
     `value_form` bar `dec: 2` en FPL sendir EINN aukastaf og ekkert annad.
     Annar aukastafurinn var thvi alltaf "0" sem VID bjuggum til — omaeld
     nakvaemni sem litur ut eins og maeling. Maelt a BADUM heimildum
     (lifandi players.json og ollum fimm timabilunum i player_seasons.json). */
  {
    const decOf = v => { const s = String(v); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };
    const vals = [];
    for (const p of players) if (p.value_form != null) vals.push(p.value_form);
    for (const seas of Object.values(J("player_seasons.json").players))
      for (const h of Object.values(seas)) if (h.value_form != null) vals.push(h.value_form);
    const maxDec = Math.max(...vals.map(decOf));
    ok(vals.length > 500, `${vals.length} value_form-gildi mæld (fullyrðingin er ekki tóm)`);
    eq(STAT_BY_KEY.value_form.dec, maxDec,
      `"Form per £m" birtir ekki fleiri aukastafi en heimildin ber (var 2)`);
  }

  /* ---- 13d. "Games" TALDI UMFERDIR, EKKI LEIKI ----
     `consistency.json` er byggt ur `player_gw_*.json` thar sem TVOFOLD
     UMFERD ER LOGD SAMAN I EINA FAERSLU, svo `games` er UMFERDAFJOLDI.
     Fullyrdingin er tvihlida: fyrst er munurinn MAELDUR a raungognum
     (annars gaeti heitid verid hvad sem er), svo er krafist ad heitid og
     notan segi "gameweek" en ekki "games played".                       */
  {
    const cons = J("consistency.json").seasons?.["2025/26"] || {};
    const seas = J("player_seasons.json").players;
    let n = 0, fewer = 0, worst = null;
    for (const [code, rows] of Object.entries(seas)) {
      const h = rows["2025/26"], c = cons[code];
      if (!h || !c || h.starts == null) continue;
      n++;
      if (c.games < h.starts) { fewer++;
        if (!worst || h.starts - c.games > worst.d) worst = { code, d: h.starts - c.games, n: c.games, s: h.starts }; }
    }
    ok(n > 100 && fewer > 0,
      `MÆLT: ${fewer} af ${n} eiga færri "games" en byrjanir (tvöfaldar umferðir)`
      + (worst ? ` — verst n=${worst.n} við ${worst.s} byrjanir` : ""));
    const d = STAT_BY_KEY.aron_games;
    ok(/gameweek/i.test(d.label) || /gameweek/i.test(d.short ?? ""),
      `heitið segir GAMEWEEK, ekki "Games" ("${d.label}" / "${d.short}")`);
    ok(/GAMEWEEKS/.test(d.note) && /double gameweek/i.test(d.note),
      "og nótan segir að tvöföld umferð sé lögð saman í eina");
  }

  /* ---- 13e. AFTURVIRKNIN ER NEFND A OLLUM ThREMUR, EKKI EINUM ----
     `hit4_pct` OG `blank_pct` fara BADAR gegnum (x + K·p0)/(n + K) i
     fetch.mjs, og `aron` ER mismunur theirra. Nótan sagdi thad adeins a
     einum theirra. Fullyrdingin les FORMULUNA ur pipeline-skranni svo hun
     geti ekki verid graenn texti um koda sem er haettur ad afturvirkja.   */
  {
    const src = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url).pathname, "utf8");
    ok(/hit4_pct\s*=[^\n]*K \* p4/.test(src) && /blank_pct\s*=[^\n]*K \* pb/.test(src),
      "pipeline afturvirkjar BÁÐAR hlutfallstölurnar (k=10)");
    for (const k of ["aron_hit4", "aron_blank", "aron_net"])
      ok(/shrunk|shrink/i.test(STAT_BY_KEY[k].note) && /k=10/i.test(STAT_BY_KEY[k].note),
        `${k}: nótan nefnir afturvirknina (k=10)`);
  }

  /* SKYRING A HVERJUM DALKI ER SKYLDA. Stytt haus-heiti ("CBI", "GA−xGI",
     "/90") er RADGATA an tooltip-s, svo styttingin og skyringin eru ein og
     sama akvordunin: annad ma ekki koma an hins.                          */
  const noNote = STAT_DEFS.filter(d => !d.note || String(d.note).length < 12);
  eq(noNote.length, 0,
    `hver dálkur hefur skýringu í tooltip${noNote.length ? " — " + noNote[0].key : ""}`);

  /* BANDS (spannandi hausrod, FFS-lagid) verda ad vera SAMFELLD innan
     flokks: bands-rodin leggur saman breiddir samliggjandi dalka, svo
     dalkur sem lendir utan sins hluta myndi kljufa bandið i tvo og
     hausinn faeri UR SAMHENGI vid tolurnar undir honum.                  */
  {
    const seen = new Set(); let prev = null; const split = [];
    for (const d of STAT_DEFS) {
      const k = `${d.group}|${d.band}`;
      if (k !== prev) { if (seen.has(k)) split.push(k); seen.add(k); prev = k; }
    }
    eq(split.length, 0, `hvert band er samfellt${split.length ? " — " + split[0] : ""}`);
    ok(STAT_DEFS.every(d => d.band), "hver dálkur á band");
  }

  /* HAUS-BROT — NOTAR `headWidth` UR PlayerList.jsx, SPEGLAR HANN EKKI.
     Fra 7.8.2026 er hausinn EIN LINA (`nowrap`) og haegri-jafnadur, svo
     yfirflaedi hverfur VINSTRA megin: "Points ↓" birtist sem "oints ↓".
     Breiddin verdur thvi ad rumu heitid AUK ALLS SEM ER TEIKNAD MED THVI:
     rodunar-orinnar (↓, 9 px, tekin fra a OLLUM dalkum thvi rodunin faerist
     milli theirra) OG "season"-merkisins thegar umferdar-bil er virkt.
     †-merkid var her lika (7 px) en var TEKID UT 8.8.2026 og plassid
     med thvi — dalkur sem heldur plassi fyrir tákn sem er ekki teiknad
     er 7 px of breidur ad eilifu.
     6,35 px/staf er MAELT (canvas.measureText, 700 10.5px ui-monospace).

     ThESSI KAFLI VAR OFAER UM AD FALLA TIL 16.8.2026. Hann bar AFRIT af
     `wOf` med sinu eigin `const marker = 9`, svo thegar "season"-merkid
     baettist i hausinn 14.8. maeldi hann tofluna eins og hun var ADUR EN
     merkid kom: 43 dalkar voru klipptir a skjanum — 25 theirra sydu ekkert
     nema brot ur ordinu "season" — og prófid var graent. Nu er reikningurinn
     FLUTTUR INN og BADAR stodur eru prófadar (merki a / merki af).       */
  {
    const GLYPH = 6.32, CAP = 142;
    const blind = gwBlindKeys();
    const inner = w => w - 11;                      // 10 padding + 1 bord
    const bad = [], badBadge = [];
    for (const d of STAT_DEFS) {
      const label = hLabel(d);
      /* (a) an merkis — hversdags-astandid (ekkert umferdar-bil valid). */
      const need = label.length * GLYPH + PL.HEAD_ARROW_W;
      if (need > inner(PL.headWidth(d, false)) + 0.5)
        bad.push(`${d.key}: "${label}" tharf ${Math.round(need)} px en faer ${inner(PL.headWidth(d, false))}`);
      /* (b) MED merki — astandid sem klipptist. Reiknad fyrir hvern dalk
             sem BER thad i raun (`headBadge`), ekki fyrir agiskadan lista. */
      const badge = PL.headBadge(d, { gwActive: true, blind, narrow: false });
      if (!badge) continue;
      const needB = label.length * GLYPH + PL.HEAD_ARROW_W + PL.BADGE_W;
      const gotB = inner(PL.headWidth(d, true));
      if (needB > gotB + 0.5)
        badBadge.push(`${d.key}: "${label}"+merki tharf ${Math.round(needB)} px en faer ${gotB}`);
    }
    eq(bad.length, 0,
      `hvert heiti + or passar i EINA linu${bad.length ? " — " + bad[0] : ""}`);
    /* FORSENDA SONNUD FYRST (CLAUDE.md 5b regla 2): ef enginn dalkur baeri
       merkid vaeri fullyrdingin haer ad nedan tóm.                        */
    const badged = STAT_DEFS.filter(d =>
      PL.headBadge(d, { gwActive: true, blind, narrow: false }));
    ok(badged.length > 30,
       `${badged.length} dalkar bera "season"-merkid thegar umferdar-bil er virkt (af ${blind.size} blindum)`);
    eq(badBadge.length, 0,
      `og heitid passar ENN thegar merkid baetist vid${badBadge.length ? " — " + badBadge[0] : ""}`);
    /* Thakid ma ekki bita: 142 px er hart hamark, svo dalkur sem THARF meira
       fengi klippingu aftur an thess ad reikningurinn segdi neitt.        */
    ok(badged.every(d => PL.headWidth(d, true) < CAP),
       `enginn merktur dalkur rekst i 142 px thakid (breidasti ${Math.max(...badged.map(d => PL.headWidth(d, true)))})`);
    /* MERKID KOSTAR PLASS — OG ADEINS THAR SEM THAD ER TEIKNAD. Fastur
       kostnadur a alla 124 dalkana vaeri sama villa og †-merkid.         */
    const noBadge = STAT_DEFS.filter(d =>
      !PL.headBadge(d, { gwActive: true, blind, narrow: false }));
    /* FYRRI HELMINGURINN VAR TATOLOGIA (lagad 19.8.2026):
       `headWidth(d,false) === headWidth(d,false)` ber segd saman vid SJALFA
       SIG og er alltaf sonn — thremur linum fra kaflanum sem var skrifadur
       um nakvaemlega thennan villuklasa. AETLUNIN var ad omerktir dalkar
       fai EKKI aukaplassid, sem er profad rett med thvi ad bera thá vid
       BADAR stodur merkisins: fyrir thá a talan ad vera SU SAMA.        */
    ok(noBadge.length > 0 && badged.length > 0,
       `forsenda: ${noBadge.length} omerktir og ${badged.length} merktir dalkar`);
    /* OG ThESSAR TVAER VORU LIKA OF VEIKAR, ThOTT THAER SEU EKKI TATOLOGIUR
       (endurskrifad 20.8.2026). Thaer baru `headWidth(d,true)` a moti
       `headWidth(d,false) + BADGE_W` — sem er REIKNINGURINN I headWidth
       SJALFUM, og heldur thvi fyrir HVERN dalk, merktan sem omerktan.
       Thaer maeldu skilyrdinguna aldrei; hun er i KOLLARANUM, ekki i
       breiddar-fallinu. Fullyrdingin er thvi tviskipt her: annars vegar
       reikningurinn (rett heiti a thvi sem hann ER), hins vegar TENGINGIN.
       Merkid er ekki i takmarkadri haed heldur i BREIDD sem klippir: 44
       dalkar toldu thad ekki 14.-16.8. og 25 theirra misstu heitid AD
       FULLU; og fastur kostnadur a alla 124 er sama villan og †-merkid
       sem var tekid ut 8.8. Baedi endar hafa thvi kostad, svo hvorugur
       ma standa ovardur.                                              */
    ok(STAT_DEFS.every(d => PL.headWidth(d, true) >= PL.headWidth(d, false)),
       "headWidth eydir merkja-plassinu ThEGAR ThAD ER BEDID UM ThAD "
       + "(reikningurinn — heldur fyrir hvern dalk, ekki bara merkta)");

    /* TENGINGIN: `wOf` VERDUR ad kalla `headWidth(d, showBadge(d))`.
       Se annad inntakid harkodad springur annad hvort thakid eda heitid:
         `true`  -> 43 px a alla 124 dalka (†-villan aftur, raunverulegt
                    skrun sem notandinn taldi upp)
         `false` -> 44 klippt heiti (villan fra 14.8.)
       Prófid les UPPRUNANN thvi akvordunin er tekin inni i React-hluta
       sem thetta safn keyrir ekki — DOM-profin (`playerlist-live-cols`,
       `playerlist-narrow`) maela breiddirnar, en hvorugt ber thau vid
       BADAR stodur merkisins, svo harkodun slyppi thar i gegn.       */
    const PLSRC = readFileSync(new URL("../src/PlayerList.jsx", import.meta.url), "utf8");
    const calls = [...PLSRC.matchAll(/headWidth\(([^)]*)\)/g)]
      .map(m => m[1].trim())
      .filter(a => !/^d,\s*badge\b/.test(a));          // skilgreiningin sjalf
    ok(calls.length > 0, `forsenda: ${calls.length} kollum a headWidth i PlayerList.jsx`);
    const literal = calls.filter(a => /,\s*(true|false)\s*$/.test(a));
    eq(literal.length, 0,
       "ENGINN kollur a headWidth ber harkodad merkja-flagg"
       + (literal.length ? ` — ${literal[0]}` : ""));
    ok(calls.some(a => /,\s*showBadge\(/.test(a)),
       "og breiddin er reiknud ur AKVORDUNINNI (`showBadge(d)`), ekki ur fasta");
    /* Og breiddin sjalf er LEIDD af mældu stafbreiddinni, ekki valin tala. */
    near(PL.BADGE_W,
         "season".length * (6.35 * 9 / 10.5 + 0.2) + 9, 1,
         "BADGE_W er leidd af mældu 6,35 px/staf (9px letur + padding + margin)");
  }


  /* live_only MA ALDREI SITJA A ARSTIDAR-SUMMU — thad myndi fela hana
     ranglega. ADUR var thetta prófad eftir FLOKKI, en 7.8.2026 voru
     flokkarnir sameinadir (mo/ao/byrjunar-likur fluttust i Sokn og Grunn)
     svo flokkur segir ekki lengur til um thetta. Nu er listinn BEINN:
     hver live_only dalkur er talinn upp med nafni. Baetist nyr vid an
     thess ad vera skradur her fellur profid — sem er tilgangurinn.     */
  const LIVE_OK = new Set([
    "espn_shots","espn_sot","espn_accuracy","espn_in_box","espn_woodwork",
    "espn_created","espn_cross","espn_through",          // ESPN, sidasta umferd
    "mo","ao","start_prob",                               // lifandi gluggi
    "fdr6","home6","fix6","team_cs_prob","team_dc",       // leikir framundan
    "pen_order","fk_order","ck_order",                    // spyrnu-rod dagsins
    "xg_share",
  ]);
  const badLive = STAT_DEFS.filter(d => d.live_only && !LIVE_OK.has(d.key));
  eq(badLive.length, 0, `hver live_only dálkur er skráður${badLive.length ? " — " + badLive[0].key : ""}`);

  // hvert get() ma ALDREI kasta, lika a audgudum reitum sem vantar
  let threw = null;
  for (const d of STAT_DEFS) {
    for (const junk of [{}, { minutes: 0 }, { minutes: "x" },
                        { _espn_shots: null, _w_xg: null, _fdr6: null, _team_xg: 0 }]) {
      try { d.get(junk); } catch (e) { threw = `${d.key}: ${e.message}`; }
    }
  }
  ok(!threw, `öll ${STAT_DEFS.length} get() þola tóm inntök${threw ? " — " + threw : ""}`);

  // afleiddar tolur sem eru NYJAR: rett a thekktum inntokum
  const f = { goals_scored: 6, expected_goals: 4.0, assists: 3, expected_assists: 2.0,
              minutes: 900, bonus: 12, bps: 400, total_points: 60, now_cost: 75,
              yellow_cards: 3, red_cards: 1, clearances_blocks_interceptions: 90,
              ict_index: 180, threat: 450, creativity: 270,
              expected_goal_involvements: 6.0, _team_xg: 40 };
  near(STAT_BY_KEY.goals_per_90.get(f), 0.6, 1e-9, "Mörk/90 = 6/900×90");
  near(STAT_BY_KEY.conversion.get(f), 1.5, 1e-9, "Nýting mörk = 6/4,0");
  /* "Bonus-hlutur" var fjarlaegdur 7.8.2026: hann svaradi "hve sveiflu-
     kennd eru stigin hans" sem JOFNUDUR (Aron) svarar nu beint og betur,
     og hann radadi eins og Bon/100 BPS (maelt r=0,972).            */
  near(STAT_BY_KEY.bonus_per_bps.get(f), 3, 1e-9, "Bónus per 100 BPS = 12/(400/100)");
  near(STAT_BY_KEY.cards_per_90.get(f), 0.4, 1e-9, "Spjöld/90 = (3+1)/900×90");
  near(STAT_BY_KEY.xgi_per_million.get(f), 0.8, 1e-9, "xGI per m = 6,0/7,5");
  /* xG-HLUTUR LES NU BADAR HLIDAR UR LIFANDI RODINNI (16.8.2026).
     Adur var teljarinn `p.expected_goals` — sem i sogulegu timabili er
     ARSTIDAR-talan — medan nefnarinn `_team_xg` er summa yfir tha sem eru
     I DAG skradir hja felaginu. Tvaer olikar heimildir i sama brotinu gafu
     Ogbene 148% (rett 10%), Lukic 74% (rett 5%) og Isak 40% fyrir timabil
     thar sem rett var 31% — hann var hja Newcastle en deilt var med
     lidsstyrk Liverpool. Dalkurinn er `live_only` og notan segir "does not
     follow the selected season", svo LEIDRETTINGIN ER AD STANDA VID THAD:
     `_live_xg` kemur ur somu lifandi rod og nefnarinn.
     Profid ber thvi baedi hlidar sem AUDGUNIN setur, ekki hrat FPL-svid. */
  near(STAT_BY_KEY.xg_share.get({ ...f, _live_xg: 4.0 }), 10, 1e-9, "xG-hlutur = 4,0/40 (badar hlidar lifandi)");
  eq(STAT_BY_KEY.xg_share.get(f), null,
     "arstidar-xG EIN og ser gefur EKKERT — teljarinn verdur ad vera lifandi");
  near(STAT_BY_KEY.cbi_per_90.get(f), 9, 1e-9, "Hreins/blokk /90");

  /* NYTING kraefst xG >= 0,5 — annars er hun merkingarlaus (1 mark ur
     0,04 xG gaefi 25x og trónaði a toppnum).                            */
  eq(STAT_BY_KEY.conversion.get({ goals_scored: 1, expected_goals: 0.04 }), null,
    "nýting krefst xG ≥ 0,5 (verndar gegn 25× rusli)");
  eq(STAT_BY_KEY.bonus_per_bps.get({ bonus: 3, bps: 10 }), null,
    "bónus/BPS krefst BPS ≥ 50");
  eq(STAT_BY_KEY.xg_share.get({ expected_goals: 2, _team_xg: 0 }), null,
    "xG-hlutur með 0 í liðs-xG → null, ekki Infinity");

  // lifandi gogn: dalkarnir lesa raunveruleg svid
  eq(STAT_BY_KEY.espn_shots.get({ _espn_shots: 4 }), 4, "ESPN-skot úr auðguðum reit");
  eq(STAT_BY_KEY.mo.get({ _mo: 2.5 }), 2.5, "mó úr auðguðum reit");
  eq(STAT_BY_KEY.start_prob.get({ _start_p: 0.87 }), 87, "byrjunar-líkur → prósent");
  eq(STAT_BY_KEY.pen_order.get({ penalties_order: 1 }), 1, "víta-röð úr FPL-sviði");
  ok(STAT_BY_KEY.pen_order.hi === false, "víta-röð: LÆGRA er betra (1 = fyrsti taki)");
  ok(STAT_BY_KEY.fdr6.hi === false, "FDR næstu 6: lægra er léttara");

  /* RAUNGOGN: hve margir dalkar virka a lifandi leikmanni og a sogulegri
     rod. Vordur gegn thvi ad soguleg syn tæmist.                        */
  const live = players.find(p => /Haaland/.test(p.web_name)) || players[0];
  const liveOk = STAT_DEFS.filter(d => !d.live_only && d.get(live) != null).length;
  ok(liveOk >= 20, `lifandi leikmaður: ${liveOk} árstíðar-dálkar með gildi`);
  if (existsSync(D + "player_seasons.json")) {
    const ps = J("player_seasons.json");
    const hist = ps.players[String(live.code)]?.[ps.seasons[0]];
    if (hist) {
      const histOk = STAT_DEFS.filter(d => !d.live_only && d.get(hist) != null).length;
      ok(histOk >= 40, `söguleg röð ${ps.seasons[0]}: ${histOk} dálkar með gildi (SEASON_CARRY)`);
      eq(hist.defensive_contribution_per_90 == null, ps.seasons[0] !== "2025/26",
        "DC/90 aðeins frá 2025/26 — null (VANTAR) fyrir eldri, ekki 0");
    }
  }
}

/* ================= 14. AUDGUNIN — EIN UTFAERSLA =================
   Vorðurinn gegn theirri villu sem kostadi 20 tóma kassa i stigatoflunni:
   `live_only`-dalkarnir lesa `_`-reiti sem `makeEnricher` setur saman. Ef
   audgunin er ekki notud (eða hun hættir ad skila reit) verda their dalkar
   tomir — og TOMUR DALKUR ER EKKI VILLA I SJALFU SER, svo ekkert felldi
   thad adur. Herna er thad maelt: HRAT players.json a ad gefa NULL i
   live_only-dalka, og AUDGUD rod a ad gefa gildi.                       */
console.log("\n=== 14. AUDGUNIN (makeEnricher) ===");
if (existsSync(D + "players.json") && existsSync(D + "imminent.json")) {
  const pl = J("players.json").players || J("players.json");
  const teamsRaw = J("teams.json");
  const teams = Array.isArray(teamsRaw) ? teamsRaw : (teamsRaw.teams || []);
  const teamById = Object.fromEntries(teams.map(t => [t.id, t]));
  const imm = J("imminent.json");
  const shots = existsSync(D + "last_gw_shots.json") ? J("last_gw_shots.json") : null;
  const fx = existsSync(D + "fixtures.json") ? J("fixtures.json") : [];
  const ev = existsSync(D + "events.json") ? (J("events.json").events || []) : [];
  const dc = existsSync(D + "defcon.json") ? J("defcon.json") : null;

  const LIVE = STAT_DEFS.filter(d => d.live_only);
  ok(LIVE.length > 10, `${LIVE.length} live_only dálkar til að verja`);

  /* MAELT SEM DELTA, EKKI SEM UPPTALNING. Fyrsta utgafa profsins krafdist
     thess ad HRAT players.json gaefi ENGAN live_only dalk — og thad var
     RANGT: `pen_order`/`fk_order`/`ck_order` eru live_only af thvi ad thau
     eru RÖÐ DAGSINS (fylgja ekki voldu timabili), en thau lesa vanaleg
     FPL-svid og eru thvi til i hrau skranni. Listi yfir undantekningar hefdi
     stadnad; deltan gerir thad ekki: audgunin verdur ad FYLLA dalka sem hrata
     rodin skilar tomum, og talan segir hve marga.                        */
  const e = makeEnricher({ players: pl, teamById, imminent: imm, shotsFile: shots,
                           fixtures: fx, events: ev, defcon: dc, isLive: true });
  const rows = pl.map(p => ({ ...p, ...e(p).fields }));
  const rawFilled = LIVE.filter(d => pl.some(p => d.get(p) != null)).length;
  const encFilled = LIVE.filter(d => rows.some(p => d.get(p) != null)).length;
  ok(encFilled - rawFilled >= 8,
    `audgunin fyllir ${encFilled - rawFilled} live_only dálka sem hrá röð skilar tómum `
    + `(${rawFilled} -> ${encFilled} af ${LIVE.length})`);
  /* Nafna-porunin sjalf: byrjunar-likur eiga ad naest fyrir MEIRIHLUTA. */
  const withStart = rows.filter(p => p._start_p != null).length;
  ok(withStart > 300, `byrjunar-líkur á ${withStart} leikmönnum (nafna-pörun virkar)`);
  /* Reitur sem VANTAR ma vera null — ALDREI 0 (sbr. 6i). */
  ok(rows.every(p => p._dc_hit_adj === null || typeof p._dc_hit_adj === "number"),
    "vantandi audgun er null, ekki 0");

  /* ---- 14c. xG-HLUTUR MA ALDREI FARA YFIR 100% ----------------------
     Einkennid sem notandinn sa: Ogbene 148%, Szmodics 114%, Lukic 74%.
     Teljarinn fylgdi arstidinni en nefnarinn deginum i dag, svo brotid
     bar tvo olik timabil — og hja nyliðafelogunum var nefnarinn 0.
     Leikmadur er HLUTI af summu lidsins, svo hlutur yfir 100% er ekki
     "ha tala" heldur SONNUN um ad hlidarnar komi ur sitthvorri heimild.
     Fullyrdingin er tvihlida: fyrst ad dalkurinn REIKNIST yfirleitt
     (annars vaeri "0 yfir 100%" graent af thvi ad hann er tomur).      */
  const shares = rows.map(p => STAT_BY_KEY.xg_share.get(p)).filter(v => v != null);
  const over = shares.filter(v => v > 100);
  ok(shares.length === 0 || over.length === 0,
     `xG-hlutur fer aldrei yfir 100% (${over.length} af ${shares.length})`,
     over.length ? `haest: ${Math.max(...over).toFixed(1)}%` : "");
  /* I forleik er lifandi xG ~0 hja ollum, svo tom skra ER rett svar —
     en hun ma ekki thegja um thad. Talan er PRENTUD, ekki fullyrt a. */
  console.log(`     (xG-hlutur: ${shares.length} leikmenn med tolu i dag`
    + `${shares.length ? `, haest ${Math.max(...shares).toFixed(1)}%` : " — forleikur, lifandi xG er 0"})`);

  /* ---- 14b. `_team_cs` — BOKMAKARALINAN VERDUR AD EIGA VID NAESTA LEIK ----
     `csFor` (App.jsx) sannreynir linuna gegn MOTHERJA OG DAGSETNINGU adur en
     hun er notud; `_team_cs`-dalkurinn gerdi thad EKKI — hann fletti upp a
     lids-skammstofun EINNI. I dag meinlaust (odds.json er `window:"plan"`,
     `gw:1`), EN sokninni er sleppt thegar hun var nyleg ("skipped: plan
     window already fetched 23h ago"), svo um leid og timabilid byrjar og
     skrain dregst aftur ur hefdi dalkurinn birt linu fyrir leik SEM ER
     ThEGAR BUINN, an nokkurs merkis. "Gomul gogn birt sem ny" (kafli 3).

     PROFID ER AFTURVIRKT, EKKI LYSANDI: fyrst er STADFEST ad dalkurinn se
     fylltur i dag (annars gaeti "0 eftir spillingu" lesid sem graent af
     thvi ad hann var alltaf tomur — sbr. kafla 5b), og SIDAN er sama
     odds-skra spillt a badar vegu og krafist NULLS.                     */
  if (existsSync(D + "odds.json")) {
    const oddsRaw = J("odds.json");
    const odds = oddsRaw.teams || oddsRaw;
    const teamCs = o => {
      const en = makeEnricher({ players: pl, teamById, fixtures: fx, events: ev, odds: o });
      return pl.map(p => en(p).fields._team_cs).filter(v => v != null);
    };
    const live = teamCs(odds);
    // FORSENDAN — an hennar getur hvorug neikvæda fullyrdingin brugdist.
    ok(live.length > 400,
      `_team_cs er FYLLTUR i dag: ${live.length}/${pl.length} leikmenn `
      + `(${new Set(live).size} olik gildi)`);
    const bend = f => Object.fromEntries(Object.entries(odds).map(([k, v]) => [k, f(v)]));
    ok(teamCs(bend(v => ({ ...v, kickoff: "2020-01-01T00:00:00Z" }))).length === 0,
      "URELT kickoff (leikur thegar buinn) -> 0 leikmenn bera toluna");
    ok(teamCs(bend(v => ({ ...v, opp: "ZZZ" }))).length === 0,
      "RANGUR motherji (skrain er fyrir adra umferd) -> 0 leikmenn bera toluna");
    /* Vantandi dagsetning er EKKI sonnun um osamraemi — sama regla og i
       `csFor`, svo hun ma ekki fella toluna burt.                       */
    ok(teamCs(bend(v => ({ ...v, kickoff: null }))).length === live.length,
      "vantandi kickoff fellir EKKI toluna (motherji einn dugar, sbr. csFor)");
  }
}

/* ============================================================
   GOLF A "STIG PER BYRJUN" — smaurtaks-vorn

   Notandinn sa Chiesa bera 37,0 stig per byrjun. Talan var RETT reiknud:
   37 stig, 317 minutur, EIN byrjun — nanast oll af BEKKNUM. Maelt a
   2025/26: 17 af efstu 20 attu faerri en 5 byrjanir, svo dalkurinn radadi
   hreinum havada.

   Vordurinn er ekki "talan er 6" heldur REGLAN: undir golfi er reiturinn
   TOMUR (of faar byrjanir til ad segja), ekki 0 og ekki stor tala.
   ============================================================ */
console.log(`\n${"─".repeat(72)}\nGOLF A STIG PER BYRJUN\n${"─".repeat(72)}`);
{
  const d = STAT_BY_KEY.pts_per_start;
  ok(!!d, "dalkurinn er til");
  ok(PTS_PER_START_MIN >= 3 && PTS_PER_START_MIN <= 10,
     `golfid er a vitraenu bili (${PTS_PER_START_MIN} byrjanir)`);
  /* Chiesa-tilfellid sjalft. */
  ok(d.get({ starts: 1, total_points: 37 }) == null,
     "1 byrjun med 37 stig gefur TOMT — thetta var 37,0 a skjanum");
  ok(d.get({ starts: PTS_PER_START_MIN - 1, total_points: 40 }) == null,
     "rett undir golfi er enn tomt");
  const v = d.get({ starts: PTS_PER_START_MIN, total_points: 30 });
  ok(v != null && Math.abs(v - 30 / PTS_PER_START_MIN) < 1e-9,
     `a golfinu reiknast talan rett (${v})`);
  ok(d.get({}) == null && d.get({ starts: 0, total_points: 0 }) == null,
     "tomt/0 byrjanir hrynur ekki og skilar null");
  /* Og a RAUNGOGNUM: enginn i toflunni ma bera fjarstaedu-tolu.        */
  try {
    const base = JSON.parse(readFileSync(new URL("../data/season_baseline.json", import.meta.url), "utf8"));
    const vals = (base.players || []).map(p => d.get(p)).filter(v => v != null);
    ok(vals.length > 100, `raungogn: ${vals.length} leikmenn na golfinu`);
    ok(Math.max(...vals) < 12,
       `haesta gildi a raungognum er truverdugt (${Math.max(...vals).toFixed(1)} — var 37,0)`);
  } catch { ok(true, "season_baseline.json vantar — raungagna-hluti sleppt"); }
}

/* ============================================================
   GOLF A "MINUTUR PER xGI" — SAMA AETT OG CHIESA-VILLAN

   `mins_per_xgi` deildi minutum med xGI AN golfs. xGI er birt med tveimur
   aukastofum, svo 0,01 er UPPLAUSNARMORK gagnanna og ekki maeling. Maelt a
   sogulegum gognum: Pope 2022/23 bar 3.261 minutur / 0,01 xGI = **326.100**,
   og ALLAR 83 markmanns-radirnar med >=450 min voru undir 0,5 xGI. Varnar-
   menn naedu 23.740. Talan var RETT reiknud og gagnslaus — nakvaemlega
   Chiesa-mynstrid einu dalki ofar.

   Throskuldurinn 0,5 er EKKI nyr fasti: `conversion` og `assist_conversion`
   bera hann thegar af somu astaedu, svo thetta er samraemi en ekki val.
   ============================================================ */
console.log(`\n${"─".repeat(72)}\nGOLF A MINUTUR PER xGI\n${"─".repeat(72)}`);
{
  const d = STAT_BY_KEY.mins_per_xgi;
  ok(!!d, "dalkurinn er til");
  ok(d.get({ minutes: 3261, expected_goal_involvements: 0.01 }) == null,
     "Pope-tilfellid (3.261 min / 0,01 xGI) gefur TOMT — var 326.100");
  ok(d.get({ minutes: 3420, expected_goal_involvements: 0.49 }) == null,
     "rett undir golfi er enn tomt");
  const v = d.get({ minutes: 1000, expected_goal_involvements: 2 });
  ok(v != null && Math.abs(v - 500) < 1e-9, `ofan golfs reiknast talan rett (${v})`);
  ok(d.get({}) == null && d.get({ minutes: 900, expected_goal_involvements: 0 }) == null,
     "tomt/0 xGI hrynur ekki og skilar null");
  /* Raungogn: ekkert gildi ma vera fjarstaeda, og markmenn eiga ad hverfa. */
  try {
    const seasons = JSON.parse(readFileSync(new URL("../data/player_seasons.json", import.meta.url), "utf8"));
    const rows = [];
    for (const byS of Object.values(seasons.players || {}))
      for (const r of Object.values(byS)) if ((+r.minutes || 0) >= 450) rows.push(r);
    const vals = rows.map(r => d.get(r)).filter(v => v != null);
    ok(vals.length > 300, `raungogn: ${vals.length} radir na golfinu`);
    ok(Math.max(...vals) < 10000,
       `haesta gildi er truverdugt (${Math.round(Math.max(...vals))} — var 326.100)`);
    const gk = rows.filter(r => r.element_type === 1 && d.get(r) != null);
    ok(gk.length === 0, `enginn markmadur ber toluna (${gk.length}) — xGI maelir sokn`);
  } catch { ok(true, "player_seasons.json vantar — raungagna-hluti sleppt"); }
}

/* ============================================================
   15. `pos` ER VIRT — OG BADAR TOFLUR SEGJA ThAD SAMA

   MAELT 14.8.2026: 12 dalkar bera `pos` og `buildLeaderboard` virdi thad,
   en leikmannataflan HVERGI. Framherjar birtu `Clean sheet %: 32%`,
   `Goals conceded: 36` og `xGC per 90: 1.26` (70 framherjar med
   `clean_sheets`, 39 med `cs_pct`) medan stigataflan hafdi 0 i somu dalkum.
   Markmenn baru `_mo`/`_ao` — 10 birtu `0.00` — thott notan a dalknum segdi
   "goalkeepers never get it".
   Kaflinn er ALMENNUR viljandi: hann telur sig EKKI til 12 dalka heldur
   leidir listann UT UR `STAT_DEFS`, svo nyr `pos`-dalkur er sjalfkrafa
   varinn. Sama regla og "blindir dalkar eru LEIDDIR UT, ekki handskrifadir"
   (CLAUDE.md 8) — handskrifadur listi staðnar.
   ============================================================ */
/* ============================================================
   `no_heat` — FLAGG SEM ER LESID, EKKI ADEINS SKILGREINT

   `heatScale` kann adeins tvennt: haerra betra eda laegra betra
   (`invert`). `starts_per_90` er hvorugt — nota dalksins segir sjalf ad
   ~1,0 se kjorid og ad BADIR endar seu verri en midjan. Med `hi:true`
   malaði hitakortid sterkasta graena a 1-byrjunar leikmann (2,37 ur 38
   minutum) og kalladi hann besta mann toflunnar.

   VORDURINN ER A TENGINGUNNI, EKKI A GILDINU: `team_dc` var skilgreindur
   dalkur sem var DAUDUR fra faedingu og faldi sig sem toman (kafli 6l).
   Flagg sem `PlayerList.jsx` les aldrei vaeri nakvaemlega thad aftur.
   ============================================================ */
{
  console.log("\n15c) `no_heat` er LESID i PlayerList, ekki bara skilgreint");
  const flagged = STAT_DEFS.filter(d => d.no_heat);
  ok(flagged.length > 0, `forsenda: einhver dalkur ber \`no_heat\` (${flagged.length})`);
  ok(flagged.some(d => d.key === "starts_per_90"),
     "starts_per_90 ber hann — dalkurinn an einhalla 'betra'");
  /* TEXTAPROF DUGDI EKKI OG ThAD VAR SANNAD 18.8.2026.
     Fyrri utgafa strippadi ADEINS `/* *​/` og leitadi svo ad `no_heat`.
     Stokkbreyting sem fjarlaegdi `if (d.no_heat) continue;` UR heatScale
     og setti `// no_heat: viljandi hunsad` i stadinn hélt ollum fjorum
     fullyrdingunum GRAENUM — fullyrding sem segir sjalf "ekki adeins nefnt
     i athugasemd" var uppfyllt af athugasemd. Nu er hegdunin maeld:
     `heatScale` er keyrd og dalkurinn ma EKKI fa kvarda.               */
  const plSrc = readFileSync(new URL("../src/PlayerList.jsx", import.meta.url), "utf8");
  const m = plSrc.match(/const heatScale = useMemo\(\(\) => \{([\s\S]*?)\n  \}, \[/);
  ok(!!m, "heatScale-smiðin fannst i PlayerList.jsx");
  if (m) {
    const body = m[1];
    const fn = new Function("visibleCols","pinnedKeys","filtered","STAT_BY_KEY",
      `const m={};${body.replace(/^\s*const m = \{\};/m,"")}\nreturn m;`);
    /* Tveir dalkar, badir med naegar tolur: annar ber `no_heat`, hinn ekki.
       Sa merkti ma ekki fa kvarda; hinn VERDUR ad fa hann (annars vaeri
       fullyrdingin uppfyllt af thvi ad heatScale skilar alltaf tomu).  */
    const rows = Array.from({ length: 30 }, (_, i) => ({ src: { v: i + 1 } }));
    const marked   = { key:"m_marked",   no_heat:true,  hi:true, get:p=>p.v };
    const unmarked = { key:"m_unmarked",               hi:true, get:p=>p.v };
    let out = null;
    try { out = fn([marked, unmarked], new Set(), rows, {}); } catch (e) { out = { __err: e.message }; }
    ok(out && !out.__err, `heatScale keyrdi a tilbunum dolkum${out?.__err ? " — " + out.__err : ""}`);
    ok(out && out.m_unmarked, "forsenda: OMERKTUR dalkur FAER kvarda (annars maelir naesta ekkert)");
    ok(out && !out.m_marked, "MERKTUR dalkur (`no_heat`) fær ENGAN kvarda");
  }
}

/* ============================================================
   `bsd_xg_per_shot` — MAELT URTAKS-GOLF (18.8.2026)

   An golfs voru thrir EFSTU i dalknum MARKMENN med eitt skot hver
   (0,93 · 0,90 · 0,86) — horn sem their foru upp i — a dalki sem a ad
   adgreina markarottu fra langskyttu. Golfid er 8 skot og thad er MAELT:
   split-half a 9.544 skotum gefur 0,577 vid 6 en 0,690 vid 8 (staersta
   stokkid), og topp-5 er sa sami vid 8, 12 og 20.
   ============================================================ */
{
  console.log("\n14d) `bsd_xg_per_shot` — maelt urtaks-golf");
  const d = STAT_BY_KEY.bsd_xg_per_shot;
  ok(BSD_XGS_MIN_SHOTS === 8, `golfid er 8 skot (${BSD_XGS_MIN_SHOTS})`);
  eq(d.get({ _b_xgs: 0.93, _b_shots: 1 }), null, "einn skot -> ekkert gildi");
  eq(d.get({ _b_xgs: 0.30, _b_shots: 7 }), null, "sjo skot -> enn undir golfi");
  eq(d.get({ _b_xgs: 0.30, _b_shots: 8 }), 0.30, "atta skot -> gildi (golfid er >=)");
  /* RAUNGOGN: enginn markmadur ma sitja a toppnum lengur, OG dalkurinn
     verdur ad hafa nog gildi eftir — annars vaeri "engir markmenn" graent
     af thvi ad hann er tomur.                                          */
  if (existsSync(D + "bsd_players.json")) {
    const bp = JSON.parse(readFileSync(D + "bsd_players.json", "utf8")).players || [];
    const vals = bp.map(p => ({ p, v: d.get({ _b_xgs: p.xg_per_shot, _b_shots: p.shots }) }))
                   .filter(x => x.v != null);
    ok(vals.length > 150, `${vals.length} leikmenn halda tolu (75% af 316)`);
    const top5 = vals.sort((a, b) => b.v - a.v).slice(0, 5);
    ok(top5.every(x => x.p.pos !== "G"),
       `enginn markmadur i topp-5 (${top5.map(x => x.p.pos).join(",")})`);
    ok(top5.every(x => (x.p.shots ?? 0) >= BSD_XGS_MIN_SHOTS),
       `topp-5 hafa allir >= ${BSD_XGS_MIN_SHOTS} skot (${top5.map(x => x.p.shots).join(",")})`);
  }
}

/* ============================================================
   start_prob MA EKKI MOTSEGJA FPL (20.8.2026)

   `startProbability` er MINUTU-likan: hun les `starts5`, `mins5`, `trend`,
   `started_last`, `value` — og hefur ENGAN adgang ad status ne
   `chance_of_playing`. Leikmadur sem spiladi hverja minutu ThANGAD TIL hann
   meiddist fær thvi haa tolu.
   MAELT a lifandi gognum: 12 flaggadir baru start_prob >= 50%, og SEX
   theirra medan FPL sagdi 0% ad spila — Garner 90%, Fofana 73% i BANNI til
   6. sept., Minteh 56% ut til 28. nov. "90% ad byrja" um mann sem getur
   ekki spilad er OSONN fullyrding, ekki blaebrigdi. Kafli 6: FPL-status
   raedur tiltaekileika, punktur.
   ============================================================ */
{
  console.log("\n14e) start_prob motsegir ekki FPL-status");
  const isZero = v => v !== null && v !== undefined && v !== "" && Number(v) === 0;
  /* Eigin laug og audgun — kafli 14 er i sinni eigin blokk. */
  const pl2 = J("players.json").players || J("players.json");
  const tRaw2 = J("teams.json");
  const tById2 = Object.fromEntries(((Array.isArray(tRaw2) ? tRaw2 : tRaw2.teams) || [])
    .map(t => [t.id, t]));
  const e2 = makeEnricher({ players: pl2, teamById: tById2, imminent: J("imminent.json"),
    fixtures: J("fixtures.json").fixtures ?? J("fixtures.json"),
    events: J("events.json").events, odds: J("odds.json").teams ?? J("odds.json"),
    isLive: true });
  const zeroChance = pl2.filter(p => isZero(p.chance_of_playing_next_round));
  ok(zeroChance.length > 0, `forsenda: ${zeroChance.length} leikmenn med chance = 0`);
  const rows2 = pl2.map(p => ({ p, f: e2(p).fields }));
  const contra = rows2.filter(r => isZero(r.p.chance_of_playing_next_round)
                                && r.f._start_p != null && r.f._start_p > 0);
  ok(contra.length === 0,
     `enginn med 0% chance ber start_prob > 0 (${contra.length})`,
     contra.slice(0,3).map(r => `${r.p.web_name}=${r.f._start_p}`).join(" "));
  /* FORSENDA: dalkurinn ma ekki vera tomur — annars vaeri "engin motsogn"
     graent af thvi ad hann reiknast aldrei.                             */
  const withVal = rows2.filter(r => r.f._start_p != null && r.f._start_p > 0);
  ok(withVal.length > 200, `heilbrigdir bera hana ENN (${withVal.length} med > 0)`);
  /* OG 25/50/75 ER LATID STANDA — thad er asetningur, ekki gloppa. */
  const partial = rows2.filter(r => [25,50,75].includes(Number(r.p.chance_of_playing_next_round))
                                 && r.f._start_p != null);
  ok(partial.length === 0 || partial.some(r => r.f._start_p > 0),
     `hlutfalls-chance (25/50/75) heldur likans-tolunni (${partial.length} tilfelli)`);
}

console.log("\n15) `pos` er virt i BADUM lesmatum");
{
  const P = JSON.parse(readFileSync(new URL("../data/players.json", import.meta.url), "utf8")).players;
  const posDefs = STAT_DEFS.filter(d => Array.isArray(d.pos) && d.pos.length);
  ok(posDefs.length >= 10, `${posDefs.length} dalkar bera \`pos\` (forsenda kaflans)`);

  /* Audgunin eins og appid setur hana upp fyrir SOGULEGT timabil. */
  const rd = f => { try { return JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8")); }
                    catch { return null; } };
  const teamsF = rd("teams.json");
  const teamById2 = Object.fromEntries(((Array.isArray(teamsF) ? teamsF : teamsF?.teams) || [])
    .map(t => [t.id, t]));
  const seasons = rd("player_seasons.json");
  const enrich2526 = makeEnricher({
    players: P, teamById: teamById2, imminent: rd("imminent.json"),
    fixtures: rd("fixtures.json")?.fixtures ?? rd("fixtures.json"),
    events: rd("events.json")?.events ?? rd("events.json"),
    odds: rd("odds.json")?.teams ?? rd("odds.json"),
    defcon: rd("defcon.json"), defconHist: rd("defcon_history.json"),
    consist: rd("consistency.json"), bsd: [rd("bsd_players.json")],
    season: "2025/26", isLive: false,
  });

  let leaks = 0, leakEx = [];
  for (const d of posDefs) {
    const bad = P.filter(p => !d.pos.includes(p.element_type) && d.get(p) != null);
    if (bad.length) { leaks++; leakEx.push(`${d.key}:${bad.length}`); }
  }
  ok(leaks === 0, `enginn pos-dalkur lekur ut fyrir stodu sina`, leakEx.join(" "));

  /* Og ad talan se ENN TIL innan stodunnar — vordur ma ekki tæma dalkinn.
     ThESSI HELMINGUR LES AUDGADAR RADIR, EKKI HRAT `players.json` (16.8.2026).
     Astaedan er maeld: thegar `pos:[2,3,4]` var sett a DefCon-dalkana fimm
     (markmenn baru "0% af 36" fyrir stig sem their geta ekki unnid) fellu
     `dc_hit_adj`, `dc_hit_raw` og `dc_starts` HER — ekki af thvi ad
     lagfaeringin taemdi tha, heldur af thvi ad their lesa `_dc_*`-reiti sem
     AUDGUNIN setur og hra rodin ber aldrei. Fullyrdingin var thvi ad maela
     annad en skjarinn synir. Undanthagulistinn (`!live_only`) hefdi thurft
     ad vaxa i hvert sinn sem `pos` baettist a audgadan dalk — handskrifadur
     listi sem stadnar (CLAUDE.md 8). Audgadar radir leysa thad i eitt skipti.
     `isLive:false` + 2025/26 er notad thvi `defcon.json.players` er TOM i
     forleik; sagan (`defcon_history.json`) er thar sem tolurnar bua.     */
  const encRows = P.map(p => {
    const hist = seasons?.players?.[String(p.code)]?.["2025/26"];
    const base = hist ? { ...hist, now_cost: p.now_cost, element_type: p.element_type } : p;
    return { ...base, ...enrich2526(p).fields };
  });
  let empty = 0, emptyEx = [];
  for (const d of posDefs.filter(x => !x.live_only)) {
    const inPos = encRows.filter(p => d.pos.includes(p.element_type) && d.get(p) != null);
    if (!inPos.length) { empty++; emptyEx.push(d.key); }
  }
  ok(empty === 0, "hver pos-dalkur ber ENN tolur innan sinnar stodu", emptyEx.join(" "));
  /* Og lekinn ma ekki koma aftur inn um audgunina heldur. */
  let encLeak = 0, encLeakEx = [];
  for (const d of posDefs) {
    const bad = encRows.filter(p => !d.pos.includes(p.element_type) && d.get(p) != null);
    if (bad.length) { encLeak++; encLeakEx.push(`${d.key}:${bad.length}`); }
  }
  ok(encLeak === 0, "enginn pos-dalkur lekur ut fyrir stodu sina I AUDGUDUM RODUM",
     encLeakEx.join(" "));

  /* SAMA SVAR I BADUM LESMATUM — thetta er sjalft einkennid sem kom upp. */
  const lb = buildLeaderboard({ players: P, season: "2025/26", limit: 5 });
  const groups = Array.isArray(lb) ? lb : (lb?.groups || []);
  let mismatch = 0;
  for (const g of groups) for (const c of (g.cols || g.items || [])) {
    const d = STAT_BY_KEY[c.key];
    if (!d || !Array.isArray(d.pos)) continue;
    const rows = c.rows || c.top || [];
    const outOf = rows.filter(r => r.element_type != null && !d.pos.includes(r.element_type));
    if (outOf.length) mismatch++;
  }
  ok(mismatch === 0, "stigataflan ber engan leikmann ut fyrir stodu-svid dalksins", String(mismatch));

  /* MARKMENN OG mo/ao — beint a audguninni, ekki adeins a getternum, thvi
     omaeld tala a ekki ad VERDA TIL (sja `makeEnricher`).                */
  const T = JSON.parse(readFileSync(new URL("../data/teams.json", import.meta.url), "utf8")).teams;
  const teamById = Object.fromEntries(T.map(t => [t.id, t]));
  const IM = JSON.parse(readFileSync(new URL("../data/imminent.json", import.meta.url), "utf8"));
  const en = makeEnricher({ players: P, teamById, imminent: IM, season: "2025/26" });
  let gkMo = 0, outMo = 0;
  for (const p of P) {
    const f = en(p).fields;
    if (p.element_type === 1) { if (f._mo != null || f._ao != null) gkMo++; }
    else if (f._mo != null) outMo++;
  }
  ok(gkMo === 0, `enginn markmadur faer mo/ao ur audguninni (${gkMo}, var 17)`);
  /* NEIKVAED FULLYRDING MED SANNADRI FORSENDU (CLAUDE.md 5b regla 2):
     utileikmenn VERDA ad hafa toluna, annars er "0 hja markmonnum"
     einskis virdi — tha vaeri hun 0 hja ollum.                          */
  ok(outMo > 50, `utileikmenn bera hana ENN (${outMo}) — annars maelir fullyrdingin ofan ekkert`);
  /* Og notan a dalknum verdur ad segja thad sem kodinn gerir. */
  ok(/goalkeepers never get it/i.test(STAT_BY_KEY.mo.note)
     && /goalkeepers never get it/i.test(STAT_BY_KEY.ao.note),
     "notan segir enn ad markmenn fai hana ekki");
  ok(STAT_BY_KEY.mo.pos?.join() === "2,3,4" && STAT_BY_KEY.ao.pos?.join() === "2,3,4",
     "og dalkarnir bera pos:[2,3,4] svo vordurinn se i skranni, ekki adeins i audguninni");
}

/* ============================================================
   15b. STODU-HLIDID A ROÐINNI SEM LEIKMANNATAFLAN BYGGIR — EKKI A `players.json`

   KAFLI 15 GAT EKKI FALLID A ThESSU. Hann sior `players.json`-radir, og
   thaer bera ALLTAF `element_type`, svo stodu-hlidid i stats.js
   (`p?.element_type != null && !allowed.includes(...)`) er alltaf spurt thar.
   Rodin sem taflan les i UMFERDAR-BILS-HAM kemur hins vegar ur `sumGwRange`,
   sem skilar ADEINS FPL-summum og /90-tolum — ENGRI stodu. Hlidid var thvi
   slokkt: null-reglan (othekkt stada utilokar aldrei) hleypti ollu i gegn.
   MAELT 16.8.2026 (2025/26, GW1-38, 459 radir med gogn): 410 radir baru
   1.535 stodu-laest gildi — DEF 150 radir, MID 207, FWD 53 — og Gyokeres
   (FWD) syndi 11, thar a medal "Clean sheet % 46,2" og "Saves 0".
   Sama aett og Meslier-villan (CLAUDE.md 3): hlidid virtist virka, thad var
   einfaldlega aldrei spurt.

   LYKLARNIR ERU LESNIR UR PlayerList.jsx, EKKI HANDSKRIFADIR. Handskrifadur
   listi her hefdi stadid oskertur eftir ad lagfaeringin vaeri fjarlaegd og
   fullyrdingin ordid tóm — sama villa og `gwBlindKeys` var leidd ut til ad
   forðast (13 af 22 lyklum rangir). Skannin fellur prófid ef hun finnur
   ekkert: thekja er FULLYRDING, ekki logga (CLAUDE.md 5b regla 1).
   ============================================================ */
console.log("\n15b) stodu-hlidid a umferdar-bils-rodinni (rodin sem taflan byggir)");
{
  const src = readFileSync(new URL("../src/PlayerList.jsx", import.meta.url), "utf8");
  /* Blokkin sem byggir `src`-hlutinn: fra `const src = isLive ? p :` ad
     naesta `: null);`. Lesin sem TEXTI a milli theirra tveggja akkera —
     engin reglusegd yfir gaesalappir (sja no-icelandic kafla D).         */
  const from = src.indexOf("const src = isLive ? p :");
  const to = from >= 0 ? src.indexOf(": null);", from) : -1;
  ok(from >= 0 && to > from, "fann `src`-blokkina i PlayerList.jsx (forsenda kaflans)");
  const block = from >= 0 && to > from ? src.slice(from, to) : "";
  /* Hvada svid eru afritud UR LIFANDI `p` inn i sogulegu rodina.        */
  const carried = [...block.matchAll(/(\w+)\s*:\s*p\.(\w+)/g)].map(m => [m[1], m[2]]);
  ok(carried.length >= 2,
     `${carried.length} svid afritud ur lifandi p (${carried.map(c => c[0]).join(", ")})`);

  const G = existsSync(D + "player_gw_2526.json") ? J("player_gw_2526.json") : null;
  ok(!!G, "player_gw_2526.json er til (umferdar-bils-hamurinn)");
  const posDefs2 = STAT_DEFS.filter(d => Array.isArray(d.pos) && d.pos.length);

  /* Byggir rodina NAKVAEMLEGA eins og PlayerList gerir: summa bilsins plus
     thau svid sem blokkin afritar ur lifandi `p`.                        */
  const buildRow = (p, hist, keys) => {
    const r = { ...hist };
    for (const [dst, srcKey] of keys) r[dst] = p[srcKey];
    return r;
  };
  const countLeaks = keys => {
    let rows = 0, vals = 0, worst = null;
    for (const p of players) {
      const e = G?.players?.[String(p.code)];
      const hist = e ? sumGwRange(e, G, 1, 38) : null;
      if (!hist) continue;
      const row = buildRow(p, hist, keys);
      let n = 0;
      for (const d of posDefs2)
        if (!d.pos.includes(p.element_type) && d.get(row) != null) n++;
      if (n) { rows++; vals += n; if (!worst || n > worst.n) worst = { n, w: p.web_name }; }
    }
    return { rows, vals, worst };
  };

  if (G) {
    /* FORSENDAN SONNUD FYRST (CLAUDE.md 5b regla 2): an stodunnar LEKUR
       thetta raunverulega. An thessarar linu vaeri "0 leki" mögulega bara
       "engar radir".                                                     */
    const bare = countLeaks(carried.filter(([dst]) => dst !== "element_type"));
    ok(bare.rows > 100 && bare.vals > 500,
       `an stodu lekur rodin raunverulega: ${bare.rows} radir, ${bare.vals} gildi `
       + `(verst ${bare.worst?.w} med ${bare.worst?.n}) — maelt 410/1535`);
    /* OG SVO ThAD SEM APPID BYGGIR I DAG.                                */
    const real = countLeaks(carried);
    ok(real.rows === 0 && real.vals === 0,
       `rodin sem PlayerList byggir lekur ENGU: ${real.rows} radir, ${real.vals} gildi`
       + (real.worst ? ` (verst ${real.worst.w} med ${real.worst.n})` : ""));
  }

  /* TIMABILS-HAMURINN LEKUR AF HINNI ASTAEDUNNI: arkiv-rodin ber stodu
     ThESS timabils, en sian og stodu-merkid lesa lifandi stodu. Lifandi
     stadan verdur thvi ad SKRIFAST YFIR tha sogulegu.                    */
  if (existsSync(D + "player_seasons.json")) {
    const PS = J("player_seasons.json");
    let moved = 0, leakSeason = 0, leakFixed = 0;
    for (const p of players) {
      const hist = PS.players?.[String(p.code)]?.["2025/26"];
      if (!hist || hist.element_type == null) continue;
      if (+hist.element_type === +p.element_type) continue;
      moved++;
      const bare = { ...hist };                       // an yfirskriftar
      const row = buildRow(p, hist, carried);         // eins og appid byggir
      for (const d of posDefs2) {
        if (d.pos.includes(p.element_type)) continue;
        if (d.get(bare) != null) leakSeason++;
        if (d.get(row) != null) leakFixed++;
      }
    }
    ok(moved > 0, `${moved} leikmenn skiptu um stodu milli arkivs og dagsins (forsenda)`);
    ok(leakSeason > 0,
       `an yfirskriftar leka their ${leakSeason} stodu-laest gildi (maelt 16)`);
    ok(leakFixed === 0,
       `lifandi stadan skrifast yfir tha sogulegu: ${leakFixed} gildi leka`);
  }
}

/* ============================================================
   16. UMFERDAR-BILS-BORDINN SEGIR SATT

   TILKYNNT/MAELT 16.8.2026. Bordinn fra 14.8. sagdi "Every column in
   <flokkur> is a whole-season figure, so changing the gameweek range cannot
   change them" — og i BYGGINGA-HAM (custom) var hvert einasta ord rangt:
     · hann nefndi `group`, sem er FROSINN i "core" thar, svo med dalkana
       Shots/xG/Big chances a skjanum sagdi hann "Basics";
     · hann taldi adeins VALDA dalka, en "Points" er FASTUR i custom og for
       ur 98 i 18 vid umferdar-skipti — a medan bordinn sagdi ad ekkert gaeti
       breyst;
     · og hann maelti med "Basics" i somu andra og hann lysti Basics
       arstidar-toflu.
   Rokfraedin er nu HREINT FALL (`rangeBanner`) og listinn yfir flokka sem
   fylgja bilinu er LEIDDUR UT (`rangeAwareGroupsOf`) — handskrifadi listinn
   i textanum var THEGAR ordinn rangur: hann sleppti "Set pieces and cards".
   ============================================================ */
console.log("\n16) umferdar-bils-bordinn — rokfraedi og orðalag");
{
  /* PL er fluttur inn efst i skranni — RAUNVERULEGA fallid, ekki afrit. */
  ok(typeof PL.rangeBanner === "function" && typeof PL.rangeAwareGroupsOf === "function",
     "PlayerList flytur ut rokfraedina (rangeBanner + rangeAwareGroupsOf)");

  const blind = gwBlindKeys();

  /* FOSTU DALKARNIR ERU LESNIR UR SKRANNI, EKKI HANDSKRIFADIR HER —
     annars maeldi profid sina eigin hugmynd um tofluna.                  */
  const plSrc = readFileSync(new URL("../src/PlayerList.jsx", import.meta.url), "utf8");
  const keysIn = re => {
    const m = plSrc.match(re);
    return m ? [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]) : [];
  };
  const pinnedGroups = keysIn(/const PINNED = new Set\(\[([^\]]*)\]\)/);
  const pinnedCustom = keysIn(/mode === "custom"\s*\?\s*new Set\(\[([^\]]*)\]\)/);
  ok(pinnedGroups.length >= 2 && pinnedCustom.length >= 2,
     `fostu dalkarnir lesnir ur skranni: flokka-hamur [${pinnedGroups}] · custom [${pinnedCustom}]`);
  const defsOf = keys => keys.map(k => STAT_BY_KEY[k]).filter(Boolean);

  /* ---- (a) FLOKKA-HAMUR: hegdunin fra 14.8.2026 verdur ad standa ---- */
  const aron = STAT_DEFS.filter(d => d.group === "aron");
  ok(aron.length > 0 && aron.every(d => blind.has(d.key)),
     `"Consistency (Aron)" er enn 100% blindur (${aron.length}/${aron.length}) — tilvikid sem bordinn var smidadur fyrir`);
  ok(PL.rangeBanner({ mode: "groups", shown: [...defsOf(pinnedGroups), ...aron],
                      picked: aron, blind }) === "all",
     "flokka-hamur med Consistency: bordinn birtist ENN (\"all\")");
  const core = STAT_DEFS.filter(d => d.group === "core" && !pinnedGroups.includes(d.key));
  ok(PL.rangeBanner({ mode: "groups", shown: [...defsOf(pinnedGroups), ...core],
                      picked: core, blind }) === null,
     "flokka-hamur med Basics: enginn bordi (dalkar thar fylgja bilinu)");

  /* ---- (b) BYGGINGA-HAMUR: tilvikid sem LAUG ---- */
  const picks = ["bsd_shots", "bsd_xg", "bsd_big"].map(k => STAT_BY_KEY[k]).filter(Boolean);
  ok(picks.length === 3 && picks.every(d => blind.has(d.key)),
     "tilvikid ur tilkynningunni: Shots/xG/Big chances (BSD) eru allir blindir");
  const shownCustom = [...defsOf(pinnedCustom), ...picks];
  ok(shownCustom.some(d => !blind.has(d.key)),
     `fastur dalkur i custom fylgir bilinu (${shownCustom.filter(d => !blind.has(d.key)).map(d => d.key)})`);
  /* ThETTA ER FULLYRDINGIN SEM FELL FYRIR LAGFAERINGUNA: bordinn sagdi
     "ekkert getur breyst" medan Points a skjanum breyttist.              */
  ok(PL.rangeBanner({ mode: "custom", shown: shownCustom, picked: picks, blind }) !== "all",
     "custom: bordinn fullyrdir EKKI ad ekkert geti breyst (Points er a skjanum)");
  ok(PL.rangeBanner({ mode: "custom", shown: shownCustom, picked: picks, blind }) === "picked",
     "custom: en hann segir samt fra thvi ad VALDU dalkarnir seu arstidar-tolur");
  const mixed = [...picks, STAT_BY_KEY.minutes];
  ok(PL.rangeBanner({ mode: "custom", shown: [...defsOf(pinnedCustom), ...mixed],
                      picked: mixed, blind }) === null,
     "custom med einn bils-dalk valinn: enginn bordi");
  ok(PL.rangeBanner({ mode: "custom", shown: defsOf(pinnedCustom), picked: [], blind }) === null,
     "custom an valinna dalka: enginn bordi (engin fullyrding um ekkert)");

  /* ---- (c) OG TALAN SJALF: Points FYLGIR BILINU I RAUN ----
     An thessarar linu vaeri (b) adeins rokfraedi um rokfraedi. Fullyrdingin
     sem bordinn gerdi var TOLULEG og hun var rong a raungognum.          */
  if (existsSync(D + "player_gw_2526.json")) {
    const G = J("player_gw_2526.json");
    let moved = 0, ex = null;
    for (const p of players) {
      const e = G.players?.[String(p.code)]; if (!e) continue;
      const full = sumGwRange(e, G, 1, 38), part = sumGwRange(e, G, 1, 10);
      if (!full || !part) continue;
      if (full.total_points !== part.total_points) {
        moved++;
        if (!ex || full.total_points > ex.full) ex = { w: p.web_name, full: full.total_points, part: part.total_points };
      }
    }
    ok(moved > 200,
       `"Points" fylgir bilinu i raun: ${moved} leikmenn breytast milli GW1-38 og GW1-10 `
       + `(t.d. ${ex?.w} ${ex?.full} -> ${ex?.part})`);
  }

  /* ---- (d) TILLAGAN ER LEIDD UT, EKKI HANDSKRIFUD ---- */
  const rec = PL.rangeAwareGroupsOf(blind).map(g => g.key);
  ok(rec.includes("core") && rec.includes("attack") && rec.includes("defence"),
     `tillagan ber grunn-flokkana (${rec.join(", ")})`);
  ok(rec.includes("setp"),
     "og \"Set pieces and cards\" — spjalda-dalkarnir fylgja bilinu, en handskrifadi listinn sleppti theim");
  /* `fixtures` er GILDRAN: 0 blindir en 5 af 5 `live_only`, svo listi sem
     leiddur vaeri af `blind` einum hefdi maelt med honum — og hann horfir
     FRAM og getur aldrei fylgt bili sem er lidid.                        */
  ok(!rec.includes("fixtures"),
     "\"Upcoming fixtures\" er EKKI i tillogunni (0 blindir en allir live_only)");
  ok(!rec.includes("aron"), "\"Consistency (Aron)\" er ekki i tillogunni (4/4 blindir)");
  const awareIn = k => STAT_DEFS.filter(d => d.group === k && !blind.has(d.key) && !d.live_only).length;
  ok(rec.every(k => awareIn(k) > 0) && STAT_GROUPS.filter(g => awareIn(g.key) > 0).length === rec.length,
     `hver flokkur i tillogunni ber a.m.k. einn bils-dalk og enginn slikur vantar (${rec.map(k => `${k}:${awareIn(k)}`).join(" ")})`);
}

console.log(`\nSTATS-PRÓF: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
