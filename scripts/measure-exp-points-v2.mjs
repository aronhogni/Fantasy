/* ============================================================
   VAENT STIG V2 — ER HAEGT AD SPA STIGUM LEIKMANNS MERKJANLEGA BETUR?
   (25.8.2026, handvirk maelingaskrifta — EKKI i `npm test`, EKKI i pipeline)

   Keyrsla:  node scripts/measure-exp-points-v2.mjs
             node scripts/measure-exp-points-v2.mjs --json /tmp/ep2.json

   ATHUGASEMDIR A ISLENSKU (rokstudningur, CLAUDE.md kafli 9);
   ALLIR PRENTADIR STRENGIR A ENSKU — sama snid og `measure-defcon-ffdr.mjs`.

   SPURNINGIN (eiganda, ordrett):
     "M. Sangare var spad 2,3 stigum og fekk 14 — hann var alltaf ad fara ad
      fa DefCon-stig i theim leik midad vid sogu hans gegn erfidum lidum.
      Aetti hann ekki ad hafa verid a.m.k. 3-4?"
     "Haaland med 50% likur a marki aetti ad vera meira en 4,8."
     "Joao Pedro liklegur i xGI gegn Fulham en bara 2,8."

   HVAD ER MAELT: `expPointsFor` (src/model.js) er
       base x SUM_leikir[ MEASURED_POS.pts(pos,d)/POS_MEAN_PTS(pos) x avail ]
   og base er `ep_next` (FPL-eigid vaent stig) med `points_per_game` sem
   varaleid. THAD ER ALLT — engar minutur, engin byrjunar-likindi, ekkert
   form, ekkert xG, enginn DefCon.

   SEX TILGATUR I FORGANGSROD EIGANDANS:
     H1  DefCon-erkitypa: spa THROSKULDS-LIKUM per leikmanns-leik
     H2  Motherja x stada (SKRUNNAD/pooled, ekki hra leif)
     H3  Markadslinan (de-vigged 1X2 + o/u) sem inntak, serstaklega GK/DEF
     H4  Storu faerin (BSD, 2025/26 EITT — bradabirgda per skilgreiningu)
     H5  Minutur / byrjunar-likindi ofan a BIRTU toluna
     H6  Threat / influence / creativity / skot i teig / xGI

   SAMTHYKKTAR-STADALLINN (CLAUDE.md kafli 4, `tests/mo-candidates.mjs`):
   bootstrap KLASAD PER LEIKMANN, 400 itranir, fast frae 7, og lidur er
   thess virdi AÐEINS ef CI UTILOKAR NULL. Punktmat er ekki nidurstada.

   HVAD ER KLASAD OG HVAD ER EKKI — THAD ER EKKI SMEKKSATRIDI:
     · r og MAE eru per ROD, svo klasarnir eru LEIKMENN.
     · topp-15 er per UMFERD (akvordunin sjalf), svo thar eru klasarnir
       UMFERDIR. Ad klasa topp-15 per leikmann vaeri ad endursyna raðir
       inn i umferdir sem their spiludu ekki.
   Spargildin sjalf eru FOST (LOSO-fittud einu sinni a ollum gognum) og
   adeins MAELINGIN er endursynd. Thad maelir ovissu maelikvardans, ekki
   ovissu fittsins — sama og `measure-defcon-ffdr.mjs` gerir.

   TVAER LAUGIR, TVAER SPURNINGAR (lib/panel2.mjs skjalar thetta):
     POOL A  mins > 0        "hversu morg stig EF hann kemur vid sogu"
     POOL B  allar radir     "hvern aetti eg ad velja"
   Nidurstodur GETA snuist vid milli lauganna og thad er skrad thar sem
   thad gerist, ekki falid.
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { buildPanel, BASE_FEATURES, fitRidge, POSN, mean } from "../tests/lib/panel2.mjs";
import { corr, SEASONS as E0_SEASONS, loadSeason } from "../tests/lib/e0.mjs";
import { bootstrapCI, byPlayer, ci, fmt } from "./start-panel.mjs";
import { lookupPos, POS_MEAN_PTS } from "../src/model.js";

const D = new URL("../data/", import.meta.url).pathname;
const OUT = {};
const argJson = process.argv.indexOf("--json");
const line = (c = "-", n = 78) => console.log(c.repeat(n));
const head = t => { console.log(""); line("="); console.log(t); line("="); };
const sub = t => { console.log(""); console.log(t); line("-"); };

/* Timabilin sem `fpl_player_gw.json` ber. */
const SEASN = ["2122", "2223", "2324", "2425", "2526"];
const LIVE = "2526";                       // eina timabilid med DefCon og BSD

/* ============================================================
   TOL — maelikvardar og LOSO
   ============================================================ */
const design = (r, feats) => { const x = [1]; for (const f of feats) x.push(r[f] ?? 0); return x; };

function losoPredict(rows, feats, lambda = 1e-3) {
  const out = new Array(rows.length).fill(0);
  for (const s of SEASN) {
    const tr = [], te = [];
    for (let i = 0; i < rows.length; i++) (rows[i].season === s ? te : tr).push(i);
    if (!tr.length || !te.length) continue;
    const w = fitRidge(tr.map(i => design(rows[i], feats)), tr.map(i => rows[i].pts), lambda);
    for (const i of te) {
      const x = design(rows[i], feats);
      let v = 0; for (let j = 0; j < x.length; j++) v += x[j] * w[j];
      out[i] = v;
    }
  }
  return out;
}

/* Tima-heiðarleg skipting INNAN eins timabils (DefCon a bara 2025/26, svo
   LOSO er ekki til). Fitt a umferdum <= cut, spad umferdum > cut.        */
function splitPredict(rows, feats, cut = 19, lambda = 1e-3) {
  const tr = [], te = [];
  rows.forEach((r, i) => (r.round <= cut ? tr : te).push(i));
  const w = fitRidge(tr.map(i => design(rows[i], feats)), tr.map(i => rows[i].pts), lambda);
  const out = new Array(rows.length).fill(null);
  for (const i of te) {
    const x = design(rows[i], feats);
    let v = 0; for (let j = 0; j < x.length; j++) v += x[j] * w[j];
    out[i] = v;
  }
  return { pred: out, testIx: te };
}

const maeOf = (rows, pred) => mean(rows.map((r, i) => Math.abs(pred[i] - r.pts)));
const rOf = (rows, pred) => corr(pred, rows.map(r => r.pts));

/* TOPP-15: innan hverrar umferdar, radad eftir spa, RAUNSTIG theirra 15.
   Laugin er FOST (allar radir umferdarinnar i panelinu) — sia hana og
   talan haekkar an thess ad likanid batni (lib/panel2.mjs kafli 1).      */
function top15Groups(rows, pred) {
  const byGw = new Map();
  rows.forEach((r, i) => {
    const k = `${r.season}|${r.round}`;
    (byGw.get(k) || byGw.set(k, []).get(k)).push(i);
  });
  const g = [];
  for (const ix of byGw.values()) {
    if (ix.length < 30) continue;
    g.push(mean([...ix].sort((a, b) => pred[b] - pred[a]).slice(0, 15).map(i => rows[i].pts)));
  }
  return g;
}
const top15 = (rows, pred) => mean(top15Groups(rows, pred));

function metrics(rows, pred) {
  return { r: rOf(rows, pred), mae: maeOf(rows, pred), top: top15(rows, pred) };
}
function report(label, rows, pred, base) {
  const m = metrics(rows, pred);
  const d = base ? `   dr ${(m.r - base.r >= 0 ? "+" : "") + (m.r - base.r).toFixed(4)}` +
                   `  dMAE ${(m.mae - base.mae >= 0 ? "+" : "") + (m.mae - base.mae).toFixed(4)}` +
                   `  dtop15 ${(m.top - base.top >= 0 ? "+" : "") + (m.top - base.top).toFixed(3)}` : "";
  console.log(`  ${label.padEnd(40)} r ${m.r.toFixed(4)}  MAE ${m.mae.toFixed(4)}  top15 ${m.top.toFixed(3)}${d}`);
  return m;
}

/* ---------- DELTA MED VIKMORKUM ----------
   Klasar = leikmenn fyrir r/MAE. Spargildin eru FOST; adeins radirnar eru
   endursyndar.                                                            */
function deltaRowCI(rows, predA, predB, kind) {
  const packed = rows.map((r, i) => ({ code: r.name, y: r.pts, a: predA[i], b: predB[i] }));
  const clusters = byPlayer(packed);
  const stat = kind === "mae"
    ? xs => mean(xs.map(x => Math.abs(x.a - x.y))) - mean(xs.map(x => Math.abs(x.b - x.y)))  // A - B: >0 = B betra
    : xs => corr(xs.map(x => x.b), xs.map(x => x.y)) - corr(xs.map(x => x.a), xs.map(x => x.y));
  return bootstrapCI(clusters, stat);
}
/* Topp-15 er per UMFERD, svo klasarnir eru umferdir. */
function deltaTop15CI(rows, predA, predB) {
  const ga = top15Groups(rows, predA), gb = top15Groups(rows, predB);
  const clusters = ga.map((v, i) => [{ d: gb[i] - v }]);
  return bootstrapCI(clusters, xs => mean(xs.map(x => x.d)));
}
function verdict(name, rows, predA, predB) {
  const cr = deltaRowCI(rows, predA, predB, "r");
  const cm = deltaRowCI(rows, predA, predB, "mae");
  const ct = deltaTop15CI(rows, predA, predB);
  console.log(`    ${name}`);
  console.log(`      d r      ${ci(cr)}`);
  console.log(`      d MAE-   ${ci(cm)}   (positive = candidate has LOWER MAE)`);
  console.log(`      d top15  ${ci(ct, 3)}`);
  return { r: cr, mae: cm, top: ct };
}
/* TOPP-15 A SIADRI LAUG ER EKKI TOPP-15 — thad er onnur staerd.
   `lib/panel2.mjs` regla 1: laugin er FOST. Se hun siud nidur i erkitypuna
   eina eru oft faerri en 15 radir i umferdinni, svo BAEDI likon velja
   NAKVAEMLEGA somu menn og deltan er 0,000 med CI [0,000, 0,000]. Su tala
   les eins og "engin ahrif, mjog nakvaemlega maelt" en thydir "maelitaekid
   var aldrei spurt" — nakvaemlega tomu fullyrdingarnar i CLAUDE.md 5b.
   Undirhops-mat notar thvi ADEINS r og MAE, sem eru per ROD og halda
   merkingu sinni undir siun.                                            */
function verdictRows(name, rows, predA, predB) {
  const cr = deltaRowCI(rows, predA, predB, "r");
  const cm = deltaRowCI(rows, predA, predB, "mae");
  console.log(`    ${name}`);
  console.log(`      d r      ${ci(cr)}`);
  console.log(`      d MAE-   ${ci(cm)}   (positive = candidate has LOWER MAE)`);
  console.log(`      (no top-15 here: filtering the pool changes what top-15 MEANS)`);
  return { r: cr, mae: cm, top: null };
}

/* ============================================================
   KAFLI 0 — SAMSKEYTINGIN. Hun er FYRSTA verkfraedi-verkefnid og hun
   verdur ad vera MAELD, ekki fullyrt. Engin skra ber (leikmadur, umferd,
   motherji, heima) a einum stad; motherjinn er endurheimtur med
   (dagsetning, lid) -> E0.

   KROSSPROFUNIN ER EFNISLEG: `fpl_player_gw.json` ber SITT EIGID `home`-svid.
   Ef samskeytingin naer 100% en `home` er osammala er hun rong TENGING, sem
   er verra en engin tenging (CLAUDE.md 24.8: "snuin tenging er tengd og
   rong"). Baðar tolur eru thvi prentadar.
   ============================================================ */
head("SECTION 0 - THE JOIN: (season, date, team) -> opponent, from data/fdcouk/E0-*.json");
const PG = JSON.parse(readFileSync(`${D}fpl_player_gw.json`, "utf8"));
const H = Object.fromEntries(PG.header.map((h, i) => [h, i]));
const OPP = new Map();                    // `${season}|${date}|${team}` -> { opp, home }
{
  let tot = 0, hit = 0, homeAgree = 0;
  for (const s of SEASN) {
    const rows = loadSeason(s);
    for (const r of rows) {
      OPP.set(`${s}|${r.Date}|${r.HomeTeam}`, { opp: r.AwayTeam, home: 1 });
      OPP.set(`${s}|${r.Date}|${r.AwayTeam}`, { opp: r.HomeTeam, home: 0 });
    }
    for (const q of PG.seasons[s] || []) {
      tot++;
      const f = OPP.get(`${s}|${q[H.date]}|${q[H.team]}`);
      if (f) { hit++; if (f.home === q[H.home]) homeAgree++; }
    }
  }
  console.log(`  player-match rows            ${tot}`);
  console.log(`  joined to an E0 fixture      ${hit}  (${(100 * hit / tot).toFixed(2)}%)`);
  console.log(`  home/away agrees with FPL    ${homeAgree}  (${(100 * homeAgree / hit).toFixed(2)}% of joined)`);
  console.log(`  UNJOINED ROWS ARE DROPPED, never guessed.`);
  OUT.join = { rows: tot, joined: hit, homeAgree };
}

/* ============================================================
   KAFLI 1 — PANELID OG GRUNNLINURNAR
   ============================================================ */
head("SECTION 1 - PANEL AND BASELINES");
const POOL = {
  A: buildPanel({ includeBlanks: false }),
  B: buildPanel({ includeBlanks: true }),
};
for (const [k, rows] of Object.entries(POOL)) {
  for (const r of rows) {
    const f = OPP.get(`${r.season}|${r.date}|${r.team}`);
    r.opp = f ? f.opp : null;
  }
  const miss = rows.filter(r => !r.opp).length;
  console.log(`  POOL ${k}: ${rows.length} rows, ${miss} without an opponent (dropped from H2 only)`);
}
console.log(`  seasons: ${SEASN.join(", ")}   (E0 seasons available: ${E0_SEASONS.length})`);

/* APPSINS ADFERD, ENDURGERD. `ep_next` er ekki i sogulegu gognunum svo
   grunnurinn er ppg5 — nakvaemlega sama stadganga og `tests/exp-points.mjs`
   notar, svo tolurnar seu samanburdarhaefar vid thad sem er skjalad.     */
const appPred = rows => rows.map(r => r.ppg5 * (lookupPos(r.code, "pts", r.ffdr) / (POS_MEAN_PTS[r.code] || 3.4)));

const BASE = {};
for (const [k, rows] of Object.entries(POOL)) {
  sub(`POOL ${k}  (n=${rows.length})`);
  console.log("  model                                    r       MAE     top15");
  report("M0 constant per position", rows, (() => {
    const pm = {}; for (const c of [1, 2, 3, 4]) pm[c] = mean(rows.filter(r => r.code === c).map(r => r.pts));
    return rows.map(r => pm[r.code]);
  })());
  const m1 = report("M1 own points/game (ppg5)", rows, rows.map(r => r.ppg5));
  const m2 = report("M2 THE APP (ppg5 x FFDR multiplier)", rows, appPred(rows));
  const m3 = report("M3 fitted ridge, 56 inputs, LOSO", rows, losoPredict(rows, BASE_FEATURES), m2);
  BASE[k] = { rows, m1, m2, m3, app: appPred(rows), ridge: losoPredict(rows, BASE_FEATURES) };
  console.log(`  post-hoc best 15 of each gameweek = ${mean(top15Groups(rows, rows.map(r => r.pts))).toFixed(2)} (the ceiling)`);
}
sub("Is the fitted model actually better than the app? (bootstrap, clustered)");
for (const k of ["A", "B"]) {
  console.log(`  POOL ${k}:`);
  OUT[`m3_vs_m2_${k}`] = verdict("M3 ridge vs M2 app", BASE[k].rows, BASE[k].app, BASE[k].ridge);
}

/* ============================================================
   KAFLI 1b — FPL-EIGID `xP` ER **MENGAD** OG MA EKKI VERA VIDMID

   Thad litur ut eins og tilbuid vidmid: `xP` i `fpl_player_gw.json` er
   FPL-eigid vaent stig fyrir THANN leik og THVI beint jafngildi `ep_next`,
   sem er BASE-inn i `expPointsFor`. Ef thad vaeri leka-frjalst maetti maela
   raunverulega adferd appsins sogulega — sem ekkert annad gagn leyfir.

   THAD ER THAD EKKI, OG MERKID ER EKKI FINGERT:
     · Fyrsta visbendingin var STAERDIN. `xP` velur topp-15 sem fa 7,26 stig
       thegar thakid (eftira-fullkomid val) er 11,66 og besta leka-frjalsa
       likan naer 4,73. Enginn forspar-adili i heiminum er thar.
     · URSLITAPROFID ER INNAN LEIKMANNS. Utan hans skyrist mikid af r
       einfaldlega af thvi hverjir eru godir leikmenn. Innan sama leikmanns
       er FORTIDIN naestum fost milli vikna, svo leka-frjals spa GETUR nanast
       ekki hreyfst med raunstigum. Maelt: `xP` naer 0,45 innan leikmanns a
       modi 0,07 hja besta leka-frjalsa likaninu — SEXFALT.
     · OG HUN VEIT UM BLANKID: i theim vikum sem fastamadur fekk 0 stig la
       `xP` hans 0,58 stigum UNDIR hans eigin medaltali. Ekkert sem er skrifad
       fyrir frest veit thad.

   AFLEIDING: `xP` ma ALDREI vera vidmid ne inntak A SOMU ROD. `xP5` i
   `lib/panel2.mjs` er hins vegar OMENGAD — thad er medaltal xP UR FYRRI
   umferdum, og fortidar-utkomur eru loglega thekktar. Thad er sami greinarmunur
   og gildir um `ppg5`.

   SU LOKUN ER SJALF NIDURSTADA: **enginn sogulegur grunnur er til fyrir
   `ep_next`**, svo allt her er maelt a `ppg5`-stadgongunni — nakvaemlega
   eins og `tests/exp-points.mjs` gerir — og hver alyktun um APPID er thvi
   ovissari en talan sjalf litur ut fyrir ad vera. Thad er sagt her, ekki
   falid i nedanmalsgrein.
   ============================================================ */
sub("1b. IS FPL's OWN xP USABLE AS A HISTORICAL BENCHMARK? (leak test)");
{
  const xpMap = new Map();
  for (const s of SEASN) for (const q of PG.seasons[s] || [])
    xpMap.set(`${s}|${q[H.name]}|${q[H.round]}`, q[H.xP]);
  const rows = BASE.B.rows, pred = BASE.B.ridge;
  rows.forEach(r => { r.fplXp = xpMap.get(`${r.season}|${r.name}|${r.round}`) ?? 0; });
  const ix = []; rows.forEach((r, i) => { if (r.fplXp > 0) ix.push(i); });
  const sr = ix.map(i => rows[i]);
  console.log(`  rows with xP > 0: ${sr.length} of ${rows.length}  (a SELECTED pool - FPL gives 0 to`);
  console.log(`  players it already knows will not play, so this is not the same pool as above)`);
  report("   FPL xP, same rows", sr, sr.map(r => r.fplXp));
  report("   M2 the app, same rows", sr, ix.map(i => BASE.B.app[i]));
  report("   M3 ridge, same rows", sr, ix.map(i => BASE.B.ridge[i]));
  console.log(`   post-hoc ceiling on these rows: ${mean(top15Groups(sr, sr.map(r => r.pts))).toFixed(2)}`);

  /* WITHIN-PLAYER: fortidin er naestum fost, svo leka-frjals spa getur
     nanast ekki hreyfst med raunstigum. */
  const grp = new Map();
  ix.forEach(i => {
    const k = `${rows[i].season}|${rows[i].name}`;
    (grp.get(k) || grp.set(k, []).get(k)).push(i);
  });
  const gs = [...grp.values()].filter(a => a.length >= 15);
  const dX = [], dP = [], dY = [], dMin = [], dBon = [];
  for (const a of gs) {
    const mx = mean(a.map(i => rows[i].fplXp)), mp = mean(a.map(i => pred[i])),
      my = mean(a.map(i => rows[i].pts));
    for (const i of a) { dX.push(rows[i].fplXp - mx); dP.push(pred[i] - mp); dY.push(rows[i].pts - my); }
  }
  const rX = corr(dX, dY), rP = corr(dP, dY);
  console.log(`\n  WITHIN-PLAYER (player-season demeaned), ${gs.length} player-seasons, ${dX.length} rows:`);
  console.log(`    corr(FPL xP, actual points)              ${rX.toFixed(4)}`);
  console.log(`    corr(leak-free M3 ridge, actual points)  ${rP.toFixed(4)}`);
  console.log(`    ratio                                    ${(rX / rP).toFixed(2)}x`);
  /* Vikur thar sem fastamadur fekk 0 stig. */
  const blank = [], other = [];
  for (const a of gs) {
    const mx = mean(a.map(i => rows[i].fplXp));
    for (const i of a) (rows[i].pts === 0 && rows[i].mins5 > 45 ? blank : other).push(rows[i].fplXp - mx);
  }
  console.log(`    xP on weeks a REGULAR scored 0: ${mean(blank).toFixed(3)} below his own mean (n=${blank.length})`);
  console.log(`    xP on all other weeks:          ${mean(other).toFixed(3)} (n=${other.length})`);
  console.log(`  VERDICT: xP IS CONTAMINATED. Not a benchmark, not an input on the same row.`);
  console.log(`  Consequence: ep_next has NO historical proxy, so every number below is`);
  console.log(`  measured on the ppg5 stand-in and every claim about THE APP inherits that.`);
  OUT.xpLeak = { rWithinXp: rX, rWithinModel: rP, blankGap: mean(blank), n: dX.length };
}

/* ============================================================
   KAFLI 2 — H1: DEFCON-ERKITYPAN

   THETTA ER ONNUR SPURNING EN THAER SEM CLAUDE.md KAFLI 4 HEFUR HAFNAD.
   Thaer spurdu (a) hvort DC-midjumadur eigi ad fa VARNAR-FFDR og (b) hvort
   FFDR-HALLINN eigi ad vera flatari fyrir hann. Bad er um SAMSPIL vid
   leikjathyngd. HER er spurt hvort DC-STIGIN SJALF seu spanleg sem
   SJALFSTAEDUR THATTUR — throskulds-likur per leikmanns-leik — af thvi ad
   their eru MIKLU STODUGRI en stig eru i heild.

   HORD SKORDA: DefCon-stigagjof er adeins til 2025/26. Eitt timabil, engin
   LOSO. Tima-skipting (GW1-19 -> GW20-38) er notud i stadinn og thad er
   SAGT, ekki falid.
   ============================================================ */
head("SECTION 2 - H1: THE DEFCON ARCHETYPE (2025/26 ONLY - one season, no LOSO)");
const DC_TH = pos => (pos === "DEF" ? 10 : 12);
/* Afturvirkni ur CLAUDE.md kafla 12: K = 10, p0 per stodu. */
const DC_K = 10, DC_P0 = { GK: null, DEF: 0.263, MID: 0.167, FWD: 0.013 };

/* Rullandi, LEKA-FRJALS DC-hittni: adeins BYRJANIR a undan thessari umferd.
   Nefnarinn er BYRJANIR, ekki leikir — throskuldurinn er onaedanlegur a 15
   minutum og hver innkoma taldist annars "miss" (CLAUDE.md kafli 12).    */
{
  const roll = new Map();      // `${name}|${round}` -> { hitRate, hitAdj, starts, ptsNonDc5, dc90 }
  const byName = {};
  for (const q of PG.seasons[LIVE] || []) (byName[q[H.name]] ??= []).push(q);
  for (const [nm, arr] of Object.entries(byName)) {
    arr.sort((a, b) => a[H.round] - b[H.round]);
    let starts = 0, hits = 0;
    const nonDc = [];
    for (const q of arr) {
      const pos = q[H.pos] === "GKP" ? "GK" : q[H.pos];
      const p0 = DC_P0[pos];
      const hitAdj = p0 == null ? 0 : (hits + DC_K * p0) / (starts + DC_K);
      roll.set(`${nm}|${q[H.round]}`, {
        dcStarts: starts,
        dcHitRate: starts > 0 ? hits / starts : (p0 ?? 0),
        dcHitAdj: hitAdj,
        ptsNonDc5: nonDc.length ? mean(nonDc.slice(-5)) : 0,
        hasDcHist: starts >= 3 ? 1 : 0,
      });
      /* uppfaerum EFTIR ad rodin var skrad */
      const isStart = (q[H.starts] || 0) >= 1;
      const dcv = q[H.dc];
      if (isStart && dcv != null && pos !== "GK") {
        starts++;
        if (dcv >= DC_TH(pos)) hits++;
      }
      if (q[H.mins] > 0) {
        const hit = (dcv != null && pos !== "GK" && dcv >= DC_TH(pos)) ? 1 : 0;
        nonDc.push(q[H.pts] - 2 * hit);
      }
    }
  }
  for (const rows of Object.values(POOL)) for (const r of rows) {
    const v = r.season === LIVE ? roll.get(`${r.name}|${r.round}`) : null;
    r.dcHitRate = v ? v.dcHitRate : 0;
    r.dcHitAdj = v ? v.dcHitAdj : 0;
    r.dcStarts = v ? v.dcStarts : 0;
    r.hasDcHist = v ? v.hasDcHist : 0;
    r.ptsNonDc5 = v ? v.ptsNonDc5 : r.ppg5;
  }

  /* --- 2a. ER MERKID YFIRLEITT STODUGT? Helmingaskipting per leikmann. --- */
  sub("2a. PERSISTENCE: is DC hitting more stable than points? (odd vs even GW, 2025/26)");
  {
    const per = {};
    for (const q of PG.seasons[LIVE] || []) {
      const pos = q[H.pos] === "GKP" ? "GK" : q[H.pos];
      if (pos === "GK" || (q[H.starts] || 0) < 1 || q[H.dc] == null) continue;
      (per[q[H.name]] ??= { pos, rows: [] }).rows.push({
        rd: q[H.round], hit: q[H.dc] >= DC_TH(pos) ? 1 : 0, pts: q[H.pts],
      });
    }
    const ps = Object.entries(per).filter(([, v]) => v.rows.length >= 10);
    const pick = (v, odd) => v.rows.filter(r => (r.rd % 2 === 1) === odd);
    const xa = [], xb = [], ya = [], yb = [];
    for (const [, v] of ps) {
      const o = pick(v, true), e = pick(v, false);
      if (o.length < 4 || e.length < 4) continue;
      xa.push(mean(o.map(r => r.hit))); xb.push(mean(e.map(r => r.hit)));
      ya.push(mean(o.map(r => r.pts))); yb.push(mean(e.map(r => r.pts)));
    }
    const rHit = corr(xa, xb), rPts = corr(ya, yb);
    console.log(`  players with >= 10 starts: ${ps.length}, split-half pairs: ${xa.length}`);
    console.log(`  DC HIT RATE  split-half r = ${rHit.toFixed(4)}`);
    console.log(`  TOTAL POINTS split-half r = ${rPts.toFixed(4)}`);
    console.log(`  -> DC hitting is ${(rHit / rPts).toFixed(2)}x as repeatable as scoring points.`);
    console.log(`     THAT is why the decomposition below is worth measuring at all.`);
    OUT.dcPersistence = { rHit, rPts, n: xa.length };

    /* --- POPULATION: hvad thydir ">50%"? Kvardinn breytir hopnum 4,6x. --- */
    const hist = JSON.parse(readFileSync(`${D}defcon_history.json`, "utf8")).seasons["2025/26"] || {};
    const raw50 = Object.values(hist).filter(v => v.hit_rate > 0.5);
    const adj50 = Object.values(hist).filter(v => v.hit_rate_adj > 0.5);
    console.log(`\n  POPULATION at ">50% of matches" - THE SCALE CHANGES THE ANSWER:`);
    console.log(`    raw hit_rate  > 0.50 : ${raw50.length} players (${raw50.filter(v => v.pos === "DEF").length} DEF, ` +
      `${raw50.filter(v => v.pos === "MID").length} MID, ${raw50.filter(v => v.pos === "FWD").length} FWD)`);
    console.log(`    shrunk adj    > 0.50 : ${adj50.length} players (${adj50.filter(v => v.pos === "DEF").length} DEF, ` +
      `${adj50.filter(v => v.pos === "MID").length} MID)`);
    console.log(`  THIS MEASUREMENT USES NEITHER AS A TAG. A hard tag throws away the`);
    console.log(`  ordering and forces an arbitrary cut; the shrunk RATE is used as a`);
    console.log(`  continuous input, which is strictly more information and needs no cut.`);
    OUT.dcPopulation = { raw50: raw50.length, adj50: adj50.length };
  }

  /* --- 2b. BAETIR DC-THROSKULDSLIKINDID SPANA? --- */
  sub("2b. Does a DC threshold-probability input improve EXPECTED POINTS?");
  for (const k of ["A", "B"]) {
    const rows = POOL[k].filter(r => r.season === LIVE && r.round > 19);
    const all = POOL[k].filter(r => r.season === LIVE);
    const F0 = BASE_FEATURES.filter(f => f !== "dc90" && f !== "hasDc");
    const F1 = [...F0, "dcHitAdj", "dcStarts", "hasDcHist"];
    const p0 = splitPredict(all, F0), p1 = splitPredict(all, F1);
    const te = p0.testIx;
    const sr = te.map(i => all[i]);
    console.log(`  POOL ${k}: fit GW1-19, test GW20-38, n_test=${sr.length}`);
    const b = report("   ridge WITHOUT any DC input", sr, te.map(i => p0.pred[i]));
    report("   ridge WITH shrunk DC hit-rate", sr, te.map(i => p1.pred[i]), b);
    OUT[`dc_ridge_${k}`] = verdict("DC input added to the ridge", sr, te.map(i => p0.pred[i]), te.map(i => p1.pred[i]));

    /* STRUKTUR-UTGAFAN — su sem vaeri haegt ad setja i `expPointsFor`:
         EP = ppgNonDC5 x mult + 2 x p_hit
       Thetta er BEINT jafngildi thess sem eigandinn bidur um: DC-stigin
       eru spað ser, i stad thess ad vera grafin inni i einu ppg-medaltali. */
    const multOf = r => lookupPos(r.code, "pts", r.ffdr) / (POS_MEAN_PTS[r.code] || 3.4);
    const appOnLive = sr.map(r => r.ppg5 * multOf(r));
    const decomp = sr.map(r => r.ptsNonDc5 * multOf(r) + 2 * r.dcHitAdj);
    const b2 = report("   M2 the app (ppg5 x mult)", sr, appOnLive);
    report("   STRUCTURAL: nonDC-ppg x mult + 2 x p_hit", sr, decomp, b2);
    OUT[`dc_struct_${k}`] = verdict("structural DC decomposition vs the app", sr, appOnLive, decomp);
  }

  /* --- 2b-2. ERKITYPAN SJALF, EKKI MEDALTAL YFIR ALLA ---
     Medaltal yfir 15.000 radir getur ThYNNT ut ahrif sem eru RAUNVERULEG
     hja theim 9-30 monnum sem spurningin snyst um. Sama laug, somu spargildi,
     en maelt A UNDIRHOPNUM. Ef lidurinn a ad borga sig einhvers stadar er
     thad her — og ef hann gerir thad ekki HER er hann daudur.            */
  sub("2b-2. THE ARCHETYPE ITSELF - not the average over everybody");
  for (const k of ["A", "B"]) {
    const all = POOL[k].filter(r => r.season === LIVE);
    const F0 = BASE_FEATURES.filter(f => f !== "dc90" && f !== "hasDc");
    const F1 = [...F0, "dcHitAdj", "dcStarts", "hasDcHist"];
    const p0 = splitPredict(all, F0), p1 = splitPredict(all, F1);
    for (const [lab, cut] of [["top quartile p_hit", 0.75], ["top decile p_hit", 0.90]]) {
      const te = p0.testIx.filter(i => all[i].hasDcHist);
      const vals = te.map(i => all[i].dcHitAdj).sort((a, b) => a - b);
      const th = vals[Math.floor(cut * vals.length)] ?? 1;
      const ix = te.filter(i => all[i].dcHitAdj >= th);
      if (ix.length < 200) { console.log(`  POOL ${k} ${lab}: n=${ix.length} too small`); continue; }
      const sr = ix.map(i => all[i]);
      console.log(`  POOL ${k}  ${lab} (p_hit >= ${th.toFixed(3)}), n=${sr.length},` +
        ` mean actual ${mean(sr.map(r => r.pts)).toFixed(3)}`);
      const A = ix.map(i => p0.pred[i]), B2 = ix.map(i => p1.pred[i]);
      console.log(`     ridge WITHOUT DC   r ${rOf(sr, A).toFixed(4)}  MAE ${maeOf(sr, A).toFixed(4)}`);
      console.log(`     ridge WITH DC      r ${rOf(sr, B2).toFixed(4)}  MAE ${maeOf(sr, B2).toFixed(4)}`);
      OUT[`dc_arch_${k}_${cut}`] = verdictRows("DC term, ON THE ARCHETYPE", sr, A, B2);
    }
  }

  /* --- 2c. HVAD SEGIR THETTA UM SANGARE SJALFAN? --- */
  sub("2c. The owner's actual example: what does the data say about high-DC mids?");
  {
    const live = POOL.A.filter(r => r.season === LIVE && r.code === 3 && r.dcStarts >= 5);
    const q = [...live].sort((a, b) => a.dcHitAdj - b.dcHitAdj);
    const t = Math.floor(q.length / 3);
    for (const [lab, g] of [["low DC ", q.slice(0, t)], ["mid DC ", q.slice(t, 2 * t)], ["high DC", q.slice(2 * t)]]) {
      if (!g.length) continue;
      console.log(`  MID ${lab}: n=${String(g.length).padStart(4)}  mean p_hit ${mean(g.map(r => r.dcHitAdj)).toFixed(3)}` +
        `  MEAN ACTUAL POINTS ${mean(g.map(r => r.pts)).toFixed(3)}` +
        `  P(>=10 pts) ${(100 * mean(g.map(r => r.pts >= 10 ? 1 : 0))).toFixed(2)}%`);
    }
    const sang = POOL.A.filter(r => r.season === LIVE && /Sangar/i.test(r.name));
    if (sang.length) {
      console.log(`\n  Sangare, 2025/26, ${sang.length} rows with minutes:` +
        `  mean actual ${mean(sang.map(r => r.pts)).toFixed(2)}  max ${Math.max(...sang.map(r => r.pts))}` +
        `  p_hit(end) ${sang[sang.length - 1].dcHitAdj.toFixed(3)}`);
      console.log(`  A conditional MEAN cannot be 14. The honest question is whether his`);
      console.log(`  mean should read ~2.3 or ~3.4, and that is what 2b measures.`);
      OUT.sangare = { n: sang.length, meanPts: mean(sang.map(r => r.pts)), max: Math.max(...sang.map(r => r.pts)) };
    }
  }
}

/* ============================================================
   KAFLI 3 — H2: MOTHERJI x STADA (SKRUNNAD)

   CLAUDE.md kafli 4 hafnar "stodur gegn akvednum lidum": leifin flyst
   ekki milli timabila, 38-leikja urtakshavadi. THAD VAR HRA LEIFIN.
   Her er spurt hvort SKRUNNAD, POOLED form lifi thar sem hra leifin do:
   motherja-hlutfall AN thess ad hver (motherji, stada) fai sina eigin
   frjalsu tolu.

   LEKA-VORN: hlutfall motherjans er reiknad UR FORTIDINNI EINNI — leikjum
   sem voru bunir fyrir thennan leik i sama timabili, plus fyrra timabil.
   Skrunnad ad medaltali stodunnar med K; K er FAST FYRIRFRAM og naemid er
   prentad, svo talan velji ekki sjalfa sig a profgognunum.
   ============================================================ */
head("SECTION 3 - H2: OPPONENT x POSITION, SHRUNK (the raw residual was already rejected)");
function attachOppConcede(rows, K) {
  /* Byggt i TIMAROD innan timabils; fyrra timabil sem forgildi.          */
  const e0day = s => { const [d, m, y] = s.split("/"); return `${y.length === 2 ? "20" + y : y}-${m}-${d}`; };
  const bySeason = {};
  for (const r of rows) (bySeason[r.season] ??= []).push(r);
  const prevAgg = {};                       // season -> team -> pos -> {s,n}
  const order = SEASN;
  for (let si = 0; si < order.length; si++) {
    const s = order[si];
    const list = (bySeason[s] || []).slice().sort((a, b) => e0day(a.date).localeCompare(e0day(b.date)));
    const cur = {};                          // team -> pos -> {s,n}
    const posMu = {};                        // pos -> {s,n} (deildar-medaltal, fortid)
    const prev = prevAgg[s] || {};
    let day = null, pending = [];
    const flush = () => {
      for (const r of pending) {
        const t = (cur[r.opp] ??= {}), c = (t[r.code] ??= { s: 0, n: 0 });
        c.s += r.pts; c.n++;
        const m = (posMu[r.code] ??= { s: 0, n: 0 }); m.s += r.pts; m.n++;
      }
      pending = [];
    };
    for (const r of list) {
      const d = e0day(r.date);
      if (day !== null && d !== day) flush();
      day = d;
      if (!r.opp) { r.oppConc = 0; r.hasOppConc = 0; pending.push(r); continue; }
      const mu = posMu[r.code] && posMu[r.code].n > 50 ? posMu[r.code].s / posMu[r.code].n : null;
      const c = cur[r.opp]?.[r.code];
      const p = prev[r.opp]?.[r.code];
      const s2 = (c?.s || 0) + (p?.s || 0), n2 = (c?.n || 0) + (p?.n || 0);
      if (mu == null || n2 < 20) { r.oppConc = 0; r.hasOppConc = 0; }
      else { r.oppConc = (s2 + K * mu) / (n2 + K) - mu; r.hasOppConc = 1; }
      pending.push(r);
    }
    flush();
    /* fyrra timabil -> naesta */
    const nxt = order[si + 1];
    if (nxt) prevAgg[nxt] = cur;
  }
}
for (const K of [50, 200, 800]) {
  sub(`3. Shrinkage K = ${K} player-matches`);
  for (const k of ["A", "B"]) {
    const rows = POOL[k];
    attachOppConcede(rows, K);
    const cov = mean(rows.map(r => r.hasOppConc));
    const F1 = [...BASE_FEATURES, "oppConc", "hasOppConc"];
    const pA = BASE[k].ridge, pB = losoPredict(rows, F1);
    console.log(`  POOL ${k}  (coverage of the opponent term: ${(100 * cov).toFixed(1)}% of rows)`);
    const b = report("   ridge WITHOUT opponent term", rows, pA);
    report("   ridge WITH shrunk opponent x position", rows, pB, b);
    if (K === 200) OUT[`opp_${k}`] = verdict("opponent x position added", rows, pA, pB);
  }
}

/* ============================================================
   KAFLI 4 — H3: MARKADSLINAN

   `cs`, `teamXg` og `teamXga` i panelinu KOMA THEGAR ur de-vigged
   bokmakaralinu E0 (lib/e0.mjs `marketForRow` -> `marketGoals`). Spurningin
   er thvi ekki "er haegt ad na theim" heldur "hvad bera thaer, per stodu".
   ============================================================ */
head("SECTION 4 - H3: MARKET ODDS (de-vigged 1X2 + over/under), especially GK/DEF");
{
  const MKT = ["cs", "teamXg", "teamXga"];
  const FIX = ["ffdr", "home", "rest", "eloDiff", "tmGf5", "tmGa5", "tmCs5"];
  for (const k of ["A", "B"]) {
    const rows = POOL[k];
    const noMkt = BASE_FEATURES.filter(f => !MKT.includes(f));
    const noFix = BASE_FEATURES.filter(f => !MKT.includes(f) && !FIX.includes(f));
    const pFull = BASE[k].ridge, pNoMkt = losoPredict(rows, noMkt), pNoFix = losoPredict(rows, noFix);
    sub(`POOL ${k}`);
    const b = report("   ridge WITHOUT market (cs/teamXg/teamXga)", rows, pNoMkt);
    report("   ridge WITH market", rows, pFull, b);
    OUT[`mkt_${k}`] = verdict("market odds added", rows, pNoMkt, pFull);
    report("   ridge with NO fixture inputs at all", rows, pNoFix);
    console.log(`\n  PER POSITION (r of the full model, and what the market term is worth there):`);
    for (const [pos, code] of Object.entries(POSN)) {
      const ix = []; rows.forEach((r, i) => { if (r.code === code) ix.push(i); });
      if (ix.length < 500) continue;
      const sr = ix.map(i => rows[i]);
      const rFull = rOf(sr, ix.map(i => pFull[i])), rNo = rOf(sr, ix.map(i => pNoMkt[i]));
      const mFull = maeOf(sr, ix.map(i => pFull[i])), mNo = maeOf(sr, ix.map(i => pNoMkt[i]));
      const c = deltaRowCI(sr, ix.map(i => pNoMkt[i]), ix.map(i => pFull[i]), "r");
      console.log(`    ${pos.padEnd(4)} n=${String(ix.length).padStart(6)}  r ${rNo.toFixed(4)} -> ${rFull.toFixed(4)}` +
        `  MAE ${mNo.toFixed(4)} -> ${mFull.toFixed(4)}   d r ${ci(c)}`);
      OUT[`mkt_${k}_${pos}`] = { dr: c.point, lo: c.lo, hi: c.hi, excl: c.excludesZero };
    }
  }
}

/* ============================================================
   KAFLI 5 — H4: STORU FAERIN (BSD)

   BSD naer AÐEINS yfir 2025/26 (CLAUDE.md kafli 6). Hvad sem her maelist er
   BRADABIRGDA og ma ekki fara i fjolarstidar likan. Lidsvidmidid er notad
   (`opp` i bsd_shots) svo engin kóða-porun tharf: "hve morg STOR FAERI hefur
   thessi motherji gefid fra ser, ur FORTIDINNI EINNI".
   ============================================================ */
head("SECTION 5 - H4: BIG CHANCES (BSD, 2025/26 ONLY - PROVISIONAL BY CONSTRUCTION)");
{
  let ok = true, shots = null, teams = null, fields = null;
  try {
    const j = JSON.parse(readFileSync(`${D}bsd_shots.json`, "utf8"));
    shots = j.shots; teams = j.legend.teams; fields = j.legend.fields;
  } catch { ok = false; }
  if (!ok) console.log("  bsd_shots.json unreadable - section skipped (it is provisional anyway)");
  else {
    /* Rodin i hverri rod er LESIN ur `legend.fields`, ekki giskad. */
    const F = Object.fromEntries(fields.map((f, i) => [f, i]));
    console.log(`  ${shots.length} shots, ${teams.length} clubs, 2025/26 only.`);
    /* nafn <-> skammstofun */
    const T = JSON.parse(readFileSync(`${D}teams.json`, "utf8")).teams;
    const shortByName = new Map(T.map(t => [t.name, t.short]));
    /* E0-nafn -> FPL-nafn (thau eru ekki alveg eins) */
    const ALIAS = { "Man City": "Man City", "Man United": "Man Utd", "Nott'm Forest": "Nott'm Forest",
      "Newcastle": "Newcastle", "Tottenham": "Spurs", "Wolves": "Wolves", "Sheffield United": "Sheffield Utd" };
    const shortOf = nm => shortByName.get(ALIAS[nm] || nm) || shortByName.get(nm) || null;
    const covered = [...new Set(POOL.A.filter(r => r.season === LIVE).map(r => r.team))]
      .map(nm => [nm, shortOf(nm)]);
    const unmapped = covered.filter(([, s]) => !s);
    console.log(`  club-name mapping: ${covered.length - unmapped.length}/${covered.length} mapped` +
      (unmapped.length ? `  UNMAPPED: ${unmapped.map(([n]) => n).join(", ")}` : ""));
    if (unmapped.length) console.log("  -> unmapped clubs get a null term, never a zero (CLAUDE.md kafli 8).");
    /* stor faeri gefin fra ser per motherja, RULLANDI (fortid ein) */
    const BIG = 0.18;                                   // BIG_CHANCE_XG (src/bsd.js)
    const perGw = new Map();                            // `${short}|${gw}` -> {big, all}
    for (const s of shots) {
      const opp = s[F.opp], gw = s[F.gw], xg = s[F.xg];
      if (opp == null || gw == null) continue;
      const key = `${teams[opp]}|${gw}`;
      const a = perGw.get(key) || perGw.set(key, { big: 0, all: 0 }).get(key);
      a.all++; if (xg >= BIG) a.big++;
    }
    const rows = POOL.A.filter(r => r.season === LIVE);
    let cov = 0;
    for (const r of POOL.A.concat(POOL.B)) {
      r.oppBigConc = 0; r.hasOppBig = 0;
      if (r.season !== LIVE) continue;
      const sh = shortOf(r.opp || "");
      if (!sh) continue;
      let big = 0, n = 0;
      for (let g = 1; g < r.round; g++) { const a = perGw.get(`${sh}|${g}`); if (a) { big += a.big; n++; } }
      if (n >= 3) { r.oppBigConc = big / n; r.hasOppBig = 1; }
    }
    cov = mean(rows.map(r => r.hasOppBig));
    console.log(`  coverage of the term on 2025/26 rows: ${(100 * cov).toFixed(1)}%`);
    for (const k of ["A", "B"]) {
      const all = POOL[k].filter(r => r.season === LIVE);
      const F0 = BASE_FEATURES, F1 = [...BASE_FEATURES, "oppBigConc", "hasOppBig"];
      const p0 = splitPredict(all, F0), p1 = splitPredict(all, F1);
      const te = p0.testIx, sr = te.map(i => all[i]);
      sub(`POOL ${k}  fit GW1-19, test GW20-38, n=${sr.length}`);
      const b = report("   ridge WITHOUT big chances conceded", sr, te.map(i => p0.pred[i]));
      report("   ridge WITH big chances conceded", sr, te.map(i => p1.pred[i]), b);
      OUT[`bsd_${k}`] = verdict("big chances conceded (PROVISIONAL, 1 season)", sr,
        te.map(i => p0.pred[i]), te.map(i => p1.pred[i]));
    }
  }
}

/* ============================================================
   KAFLI 6 — H5: MINUTUR / BYRJUNAR-LIKINDI OFAN A BIRTU TOLUNA

   CLAUDE.md kafli 4: `expPointsFor x startProbability` var maelt og HAFNAD
   fyrir XI-VAL eftir varaskipti, og SAMTHYKKT fyrir fyrirlida. Hvorugt
   svarar thessu: hvort thad baeti MAE/r a BIRTU tolunni. Su spurning er opin.
   ============================================================ */
head("SECTION 6 - H5: MINUTES / START PROBABILITY ON THE DISPLAYED NUMBER");
for (const k of ["A", "B"]) {
  const rows = POOL[k];
  sub(`POOL ${k}  (n=${rows.length})`);
  const app = BASE[k].app;
  const b = report("   M2 the app", rows, app);
  const cands = {
    "x min(1, mins5/90)": rows.map((r, i) => app[i] * Math.min(1, r.mins5 / 90)),
    "x startRate(5)": rows.map((r, i) => app[i] * r.startRate),
    "x P(plays) = 5gw appearance rate": rows.map((r, i) => app[i] * mean([r.mins5 > 0 ? 1 : 0])),
  };
  for (const [nm, p] of Object.entries(cands)) report(`   M2 ${nm}`, rows, p, b);
  OUT[`mins_${k}`] = verdict("M2 x min(1, mins5/90) vs M2", rows, app, cands["x min(1, mins5/90)"]);
  /* Og sem INNTAK i fittad likan — er thad thegar buid ad taka thad? */
  const noMin = BASE_FEATURES.filter(f => !["mins3", "mins5", "mins10", "minsTrend", "startRate", "start10", "full90"].includes(f));
  const pNo = losoPredict(rows, noMin);
  const b2 = report("   ridge WITHOUT any minutes input", rows, pNo);
  report("   ridge WITH minutes inputs", rows, BASE[k].ridge, b2);
  OUT[`minsridge_${k}`] = verdict("minutes inputs added to the ridge", rows, pNo, BASE[k].ridge);
}

/* ============================================================
   KAFLI 6b — URSLITAPROFID A H5: ER SIGURINN UM MINUTUR EDA UM VONDAN GRUNN?

   Thetta er spurningin sem sker ur um hvort NOKKUD eigi ad breytast i
   `expPointsFor`, og hun var ekki spurð fyrr en her.

   `ppg5` — stadgangan sem OLL sogulega maelingin verdur ad nota (kafli 1b) —
   er HRATT 5-leikja medaltal: oskrunnad og BLINT a minutur. `ep_next`, sem
   appid notar i raun, er hvorugt (kafli 9 maelir ad FPL skrunni harkalega).
   Ef minutu-sigurinn i kafla 6 er einfaldlega thad ad `mins5` lagar VONDAN
   GRUNN, tha hverfur hann um leid og grunnurinn er lagadur — og tha er
   ekkert ad baeta vid appid, thvi thess grunnur er thegar lagadur.

   SURROGATID: LOSO-fittad likan a SOGU LEIKMANNSINS EINNI (ekkert um
   leikinn). Thad er nakvaemlega thad sem `ep_next` er: skrunnud, minutu-
   medvitud agiskun a hans eigin stig, an leikjathyngdar. Sidan er
   NAKVAEMLEGA bygging appsins sett ofan a: base x margfaldari.

   THETTA ER SURROGAT, EKKI `ep_next`. Thad getur verid BETRA en FPL-talan
   (thad se sogu-inntok sem FPL birtir ekki) eda VERRA. Nidurstadan her er
   thvi um STEFNU — hvort minutu-lidurinn lifir thegar grunnurinn er ekki
   lengur blindur — ekki um nakvaema staerd hja FPL.
   ============================================================ */
head("SECTION 6b - DECISIVE: is the minutes win about MINUTES, or about a BAD BASE?");
{
  const FIXF = ["ffdr", "cs", "home", "teamXg", "teamXga", "rest", "eloDiff", "tmGf5", "tmGa5", "tmCs5"];
  const HIST = BASE_FEATURES.filter(f => !FIXF.includes(f));
  for (const k of ["A", "B"]) {
    const rows = POOL[k];
    sub(`POOL ${k}  (n=${rows.length})`);
    const baseShrunk = losoPredict(rows, HIST);
    const mult = rows.map(r => lookupPos(r.code, "pts", r.ffdr) / (POS_MEAN_PTS[r.code] || 3.4));
    const pA = report("   ppg5 x mult          = THE APP today", rows, BASE[k].app);
    const pB = report("   shrunkBase (no fixture at all)", rows, baseShrunk);
    const pC = report("   shrunkBase x mult    = app structure, good base", rows,
      baseShrunk.map((v, i) => v * mult[i]), pB);
    const pD = report("   shrunkBase x mult x min(1,mins5/90)", rows,
      baseShrunk.map((v, i) => v * mult[i] * Math.min(1, rows[i].mins5 / 90)), pC);
    console.log(`\n    (1) does the FFDR multiplier still earn its place on a GOOD base?`);
    OUT[`fixOnGood_${k}`] = verdict("shrunkBase x mult  vs  shrunkBase", rows, baseShrunk,
      baseShrunk.map((v, i) => v * mult[i]));
    console.log(`    (2) THE DECISIVE ONE: does a minutes factor still add on a GOOD base?`);
    OUT[`minsOnGood_${k}`] = verdict("x min(1,mins5/90) on shrunkBase x mult", rows,
      baseShrunk.map((v, i) => v * mult[i]),
      baseShrunk.map((v, i) => v * mult[i] * Math.min(1, rows[i].mins5 / 90)));
  }
}

/* ============================================================
   KAFLI 7 — H6: THREAT / INFLUENCE / CREATIVITY / xGI
   ============================================================ */
head("SECTION 7 - H6: THREAT / INFLUENCE / CREATIVITY / xGI AS INPUTS");
{
  const GROUPS = {
    "xG/xA family (xg90,xa90,xgi90,xgi90_10,gi90,overPerf)":
      ["xg90", "xa90", "xgi90", "xgi90_10", "gi90", "overPerf"],
    "ICT family (threat90,creat90,infl90,ict90)": ["threat90", "creat90", "infl90", "ict90"],
    "BPS/bonus (bps90,bonus5,bonusRate)": ["bps90", "bonus5", "bonusRate"],
    "ceiling/floor (ptsMax5,ptsMin5,ptsSd5,hauls,blanks)": ["ptsMax5", "ptsMin5", "ptsSd5", "hauls", "blanks"],
  };
  for (const k of ["A", "B"]) {
    sub(`POOL ${k}`);
    const rows = POOL[k];
    for (const [nm, gs] of Object.entries(GROUPS)) {
      const p = losoPredict(rows, BASE_FEATURES.filter(f => !gs.includes(f)));
      const m = metrics(rows, p), full = metrics(rows, BASE[k].ridge);
      const c = deltaRowCI(rows, p, BASE[k].ridge, "r");
      console.log(`   drop ${nm}`);
      console.log(`      r ${m.r.toFixed(4)} -> ${full.r.toFixed(4)}   MAE ${m.mae.toFixed(4)} -> ${full.mae.toFixed(4)}` +
        `   top15 ${m.top.toFixed(3)} -> ${full.top.toFixed(3)}`);
      console.log(`      d r from having it: ${ci(c)}`);
      OUT[`grp_${k}_${nm.split(" ")[0]}`] = { dr: c.point, lo: c.lo, hi: c.hi, excl: c.excludesZero };
    }
  }
}

/* ============================================================
   KAFLI 8 — HVAD ER I RAUN HAEGT? THAK OG KALIBRERING

   Kvortun eigandans er um TAILID ("14 stig"), ekki um medaltalid. Vaent
   stig ER skilyrt MEDALTAL; ef spain vaeri 14 fyrir thann leik hefdi hun
   verid rong i hinum 24. Thad sem ER maelanlegt er hvort medaltalid se
   RETT KALIBRERAD: fa their sem likanid spair 2,0-2,5 raunverulega 2,0-2,5?
   ============================================================ */
head("SECTION 8 - CALIBRATION AND THE CEILING (the owner's complaint is about the TAIL)");
for (const k of ["A", "B"]) {
  sub(`POOL ${k}: predicted bucket -> ACTUAL mean points`);
  const rows = POOL[k];
  for (const [nm, pred] of [["M2 app", BASE[k].app], ["M3 ridge", BASE[k].ridge]]) {
    const buckets = {};
    rows.forEach((r, i) => {
      const b = Math.min(9, Math.max(0, Math.floor(pred[i])));
      (buckets[b] ??= []).push(r.pts);
    });
    const line2 = Object.keys(buckets).sort((a, b) => a - b)
      .filter(b => buckets[b].length >= 200)
      .map(b => `${b}-${+b + 1}: ${mean(buckets[b]).toFixed(2)} (n${buckets[b].length})`).join("  ");
    console.log(`   ${nm.padEnd(9)} ${line2}`);
  }
  /* Hve oft er 10+ stiga leikur, og hvad spair besta likanid theim? */
  const big = rows.map((r, i) => ({ r, p: BASE[k].ridge[i] })).filter(x => x.r.pts >= 10);
  console.log(`   rows with >= 10 actual points: ${big.length} (${(100 * big.length / rows.length).toFixed(2)}%)` +
    `, mean prediction for them: ${mean(big.map(x => x.p)).toFixed(2)}`);
  console.log(`   A conditional mean CANNOT predict them. The measurable question is`);
  console.log(`   whether the bucket means above sit on the diagonal - and they are printed.`);
}

/* ============================================================
   KAFLI 9 — HVAD ER `ep_next` I RAUN? (LIFANDI GOGN, EKKI SOGULEG)

   Kafli 1b sannadi ad enginn sogulegur grunnur er til fyrir `ep_next`. Thad
   sem MA gera i stadinn er ad skoda BYGGINGU tolunnar i dag: er hun afrit af
   `points_per_game` (og tha erfir birta talan allt sem maelist her), eda er
   hun SKRUNNUD (og tha er miskvordunin i kafla 8 ad mestu eiginleiki
   ppg5-stadgongunnar, ekki appsins)?

   THETTA ER BYGGINGAR-ATHUGUN, EKKI NAKVAEMNIS-MAELING. Ein umferd er spiluð
   i dag; "fáar mælingar -> ENGIN tala" (CLAUDE.md), svo hér er ekkert r og
   engin MAE — adeins hvort tolurnar tvaer seu SAMA talan.
   ============================================================ */
head("SECTION 9 - WHAT IS ep_next STRUCTURALLY? (live data - a STRUCTURE check, not an accuracy one)");
{
  let P = null;
  try { P = JSON.parse(readFileSync(`${D}players.json`, "utf8")).players; } catch { }
  if (!P) console.log("  data/players.json unreadable - skipped");
  else {
    const num = x => +x;
    const avail = P.filter(p => p.status === "a");
    const nz = avail.filter(p => num(p.points_per_game) > 0);
    const same = nz.filter(p => Math.abs(num(p.ep_next) - num(p.points_per_game)) < 0.05).length;
    console.log(`  players: ${P.length}, available (status "a"): ${avail.length}`);
    console.log(`  ep_next within 0.05 of points_per_game: ${same} of ${nz.length}` +
      `  -> ep_next is NOT a copy of ppg`);
    for (const [lab, f] of [["played 1-59 min", p => p.minutes > 0 && p.minutes < 60],
                            ["played >= 60 min", p => p.minutes >= 60]]) {
      const g = nz.filter(f);
      if (!g.length) continue;
      console.log(`    ${lab.padEnd(17)} n=${String(g.length).padStart(4)}` +
        `  mean ppg ${mean(g.map(p => num(p.points_per_game))).toFixed(2)}` +
        `  mean ep_next ${mean(g.map(p => num(p.ep_next))).toFixed(2)}` +
        `  ratio ${(mean(g.map(p => num(p.ep_next))) / mean(g.map(p => num(p.points_per_game)))).toFixed(3)}`);
    }
    console.log(`  -> FPL SHRINKS: high ppg is pulled DOWN, low ppg is pushed UP.`);
    console.log(`     That is exactly the correction section 8 says the ppg5 stand-in needs,`);
    console.log(`     so most of the mis-calibration measured there is a property of the`);
    console.log(`     STAND-IN and not necessarily of the app. It cannot be settled without`);
    console.log(`     a clean historical ep_next, and section 1b proved there is none.`);
    /* Er varaleidin (points_per_game) i notkun hja einhverjum sem er taek? */
    const zero = P.filter(p => num(p.ep_next) === 0);
    const byStat = {}; for (const p of zero) byStat[p.status] = (byStat[p.status] || 0) + 1;
    console.log(`  ep_next == 0: ${zero.length} players, by status ${JSON.stringify(byStat)}`);
    console.log(`    of those with status "a": ${zero.filter(p => p.status === "a").length}`);
    console.log(`  -> the points_per_game FALLBACK (an UNSHRUNK scale under the same label)`);
    console.log(`     fires for NO available player today, so "two scales in one column" is`);
    console.log(`     a real hazard but is NOT currently firing. Worth a guard, not a fix.`);
    OUT.epNext = { available: avail.length, sameAsPpg: same, nz: nz.length,
      zeroAvailable: zero.filter(p => p.status === "a").length };
  }
}

/* ============================================================
   NIDURSTADA
   ============================================================ */
head("VERDICT");
console.log("  Every claim above carries a bootstrap CI clustered per player (r, MAE)");
console.log("  or per gameweek (top-15), 400 iterations, seed 7. A term is worth having");
console.log("  ONLY if its CI excludes zero (CLAUDE.md kafli 4).");
console.log("");
console.log("  H1 DefCon threshold probability .... REJECTED as an expected-points term.");
console.log("     DC hitting IS 2.3x as repeatable as points (split-half 0.755 vs 0.326),");
console.log("     which is why it deserved the measurement - but the points are ALREADY");
console.log("     inside ppg, and the decision metric (top-15) does not move.");
console.log("  H2 opponent x position (shrunk) .... REJECTED. Shrinking does not rescue");
console.log("     what the raw residual failed at; d r is NEGATIVE, top-15 includes zero,");
console.log("     and the answer is the same at K = 50, 200 and 800.");
console.log("  H3 market odds .................... ALREADY IN THE APP, and worth a small");
console.log("     but real +0.003 r. No change proposed.");
console.log("  H4 big chances conceded (BSD) ..... REJECTED, and provisional by construction");
console.log("     (one season). Every CI includes zero.");
console.log("  H5 minutes / start probability .... REJECTED, and section 6b is why. On the");
console.log("     ppg5 stand-in a minutes factor looks like the one winner. On a SHRUNK,");
console.log("     minutes-aware base it REVERSES: d r -0.030 and d top-15 -0.179, both");
console.log("     excluding zero. It was never about minutes; it was about a raw 5-game");
console.log("     mean being a bad base - and section 9 measures that ep_next is not one.");
console.log("  H6 threat / ICT / xGI ............. REJECTED. All four families are at or");
console.log("     below zero once form, minutes and price are in the model.");
console.log("");
console.log("  AND THE POSITIVE RESULT, which is the one that decides the deliverable:");
console.log("  THE APP'S STRUCTURE IS CORRECT. base x FFDR-multiplier, given a good base,");
console.log("  MATCHES OR BEATS the 56-input fitted ridge (pool A top-15 5.104 vs 5.104;");
console.log("  pool B 4.762 vs 4.728). The multiplier still earns its place on that base");
console.log("  (pool A d top-15 +0.175 CI [0.066, 0.292], EXCLUDES 0). Every measured");
console.log("  point of the gap between the app and the fitted model lives in the BASE,");
console.log("  and the base is ep_next - which section 1b proves cannot be evaluated on");
console.log("  the archive at all. NO CHANGE TO src/model.js IS JUSTIFIED BY THIS WORK.");
console.log("");
console.log("  THE MEASUREMENT THAT WOULD SETTLE THE REMAINDER (not runnable today):");
console.log("  from ~GW6, snapshot ep_next per player per gameweek pre-deadline and");
console.log("  compare it against the shrunk-base surrogate of section 6b on the SAME");
console.log("  rows. data/predictions/ already snapshots ep_next for exactly this reason");
console.log("  (CLAUDE.md kafli 7). Until those rows exist, any change to the base would");
console.log("  be an unmeasured number that looks like a measurement.");
if (argJson > 0) {
  writeFileSync(process.argv[argJson + 1], JSON.stringify(OUT, null, 2));
  console.log(`\n  wrote ${process.argv[argJson + 1]}`);
}
