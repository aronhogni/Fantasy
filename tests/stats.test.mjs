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
  num, POS_ORDER,
  moScore, aoScore, inImminentPool, imminentBoard,
  startFeatures, startProbability, startRisk, START_MODEL,
  MO_WEIGHTS, IMMINENT_MAX_GI, IMMINENT_MIN_MINUTES, makeEnricher,
} from "../src/stats.js";

const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
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

/* NYJAR OPINBERAR TOLUR — sannreyna ad thaer komi ur rettum svidum. */
eq(STAT_BY_KEY.saves_per_90.get({ saves_per_90: 1.62 }), 1.62, "Vörslur/90 úr FPL saves_per_90");
eq(STAT_BY_KEY.dc_per_90.get({ defensive_contribution_per_90: 3.4 }), 3.4, "DC/90 úr FPL-sviði");
eq(STAT_BY_KEY.cs_per_90.get({ clean_sheets_per_90: 0.51 }), 0.51, "Hreint blað/90 úr FPL-sviði");
eq(STAT_BY_KEY.starts_per_90.get({ starts_per_90: 1 }), 1, "Byrjunarhlutfall úr FPL-sviði");

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

  /* HAUS-BROT — SPEGLAR wOf i PlayerList.jsx.
     Fra 7.8.2026 er hausinn EIN LINA (`nowrap`) og haegri-jafnadur, svo
     yfirflaedi hverfur VINSTRA megin: "Points ↓" birtist sem "oints ↓".
     Breiddin verdur thvi ad rumu heitid AUK rodunar-orinnar (↓, 9 px,
     tekid fra a OLLUM dalkum thvi rodunin faerist milli theirra).
     †-merkid var her lika (7 px) en var TEKID UT 8.8.2026 og plassid
     med thvi — dalkur sem heldur plassi fyrir tákn sem er ekki teiknad
     er 7 px of breidur ad eilifu.
     6,35 px/staf er MAELT (canvas.measureText, 700 10.5px ui-monospace).  */
  {
    const PXC = 6.35, GLYPH = 6.32, CAP = 142;
    const wOf = (label) => {
      const marker = 9;
      const lab = label.length * PXC + marker + 13;
      const dec = 2, val = (4 + dec + 1) * 6.2 + 12;
      return Math.round(Math.max(46, Math.min(CAP, Math.max(lab, val))));
    };
    const bad = [];
    for (const d of STAT_DEFS) {
      {
        const label = hLabel(d);
        const w = wOf(label);
        const inner = w - 11;                       // 10 padding + 1 bord
        const need = label.length * GLYPH + 9;
        if (need > inner + 0.5) bad.push(`${d.key}: "${label}" tharf ${Math.round(need)} px en fær ${inner}`);
      }
    }
    eq(bad.length, 0,
      `hvert heiti + merki passar i EINA linu a badum malum${bad.length ? " — " + bad[0] : ""}`);
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
  near(STAT_BY_KEY.xg_share.get(f), 10, 1e-9, "xG-hlutur = 4,0/40");
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

console.log(`\nSTATS-PRÓF: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
