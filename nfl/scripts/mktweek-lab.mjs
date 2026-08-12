#!/usr/bin/env node
/* ============================================================
   mktweek-lab.mjs — SEGIR MARKADURINN MEIRA EN EINA TOLU?

     node scripts/mktweek-lab.mjs [--boot=400] [--from=2019]

   -> data/measure/mktweek.json

   ============================================================
   SPURNINGIN
   ============================================================
   `weeklyProjection()` notar markadinn a EINN hatt: vaent stigaskor
   lidsins (`implied` = total/2 +- spread/2) sem margfaldara med
   `POS_ELASTICITY`. `impliedTeamTotals` THJAPPAR tvaer sjalfstaedar
   markadstolur — forgjof og heildarlinu — i eina, og eftir thad veit
   lidurinn ekkert nema summuna.

   Markadurinn segir meira, og thad er OMAELT:

     margin    forgjofin sjalf. Lid sem er langt UNDIR kastar, lid sem
               er langt YFIR hleypur ut klukkuna. Olik ahrif a olikar
               stodur — og io = T/2 + m/2 getur ekki greint thau ad.
     total     hagaeda leikur lyftir BADUM lidum, ohad thvi hvor er
               haerri.
     absMargin jafn leikur a moti blowout — RB i 3-stiga leik er ekki
               sami hlutur og RB i 14-stiga leik.
     dogBig    OSAMHVERFA: ad vera 10 undir er ekki spegilmynd af ad
     favBig    vera 10 yfir. Hnykkur, ekki linulegur lidur — maeldur i
               badum endum svo spegilmyndin se PROFUD, ekki gefin.
     oppImp    vaent stig ANDSTAEDINGSINS sem sjalfstaedur lidur
               (README 5c: negatift formerki hja RB, r = -0,043).
     elasLo    er `POS_ELASTICITY` rett kvordud i OFGUM? Hnykkir sem eru
     elasHi    adeins virkir undir implied 15 og yfir 30.
     flowPos   LEIKJAFLAEDID SJALFT, ORDAD SEM EIN TILGATA: RB upp thegar
               lidid er yfir, QB/WR/TE upp thegar thad er undir. Thad er
               folk-visdomurinn i einni breytu — hann a ad faa sitt eigid
               holf, ekki bara ad vera leiddur ut ur `margin` per stodu.

   Samspil vid stodu er ekki serstakur lidur heldur GRIDID SJALFT:
   hvert holf gildir fyrir EINA stodu (QB/RB/WR/TE) eda fyrir allar
   (ALL), svo "RB upp thegar lidid er yfir" og "WR upp thegar thad er
   undir" eru tvaer olikar maelingar, ekki ein.

   ============================================================
   MAELIKVARDINN ER AKVORDUNIN, OG HANN ER SA SAMI OG I startsit-lab
   ============================================================
   `lineupFrom` her er ORDRETT AFRIT ur `startsit-lab.mjs` (ad thvi
   einu vidbaettu ad hun skilar LIKA hverjir voru valdir, sem breytir
   engri tolu en gerir kleift ad rekja mun per leikmann).

     pctOfGapClosed = (adferd   - flat) / (ceiling - flat)
     deltaPct       = (afbrigdi - incumbent) / (ceiling - flat)

   Fyrri talan er borin vid **5,831%** (ppr) og **2,967%** (standard) —
   OG THAER TOLUR ERU LESNAR UR `startsit_*.json`, ekki afritadar
   hingad, thvi afritud tala rekur fra sinni heimild. Sidari talan er
   thad sem tharf ad utiloka null, thvi NULLTILGATAN ER
   `weeklyProjection` OBREYTT — ekki "enginn markadslidur".

   ============================================================
   SEX AKKERI, OG SKRIFTAN DEYR FREMUR EN AD SKRIFA
   ============================================================
   1. SJALFSPROF: w = 0 verdur ad gefa deltaPct NAKVAEMLEGA 0 og
      NAKVAEMLEGA SOMU UPPSTILLINGU i hverju holfi — og thad er maelt
      GEGNUM FULLA MARGFOLDUNARLEIDINA, ekki gegnum styttinguna.
      FYRRI UTGAFA THESSA AKKERIS VAR TOM FULLYRDING: hun let w = 0
      skila incumbent-uppstillingunni OBEINT (`if (w === 0) return
      incumbent`), svo profid gat ekki brugdist. Nuna keyrir thad
      margfaldarann (`1 + 0*fv`), og thad var STADFEST med stokkbreytingu:
      `v * clamp(w*fv, ...)` — margfaldari an `1 +`, sem er nakvaemlega
      thad sem manni misritast — er felld af nyja akkerinu og hefdi
      sloppid OSEET gegnum thad gamla.
   1a. LIDAGILDIN VERDA AD VERA TOLUR. Thetta er SER-AKKERI thvi
      sjalfsprofid naer thvi EKKI: `f[termKey] || 0` sest ut eins og vorn
      og er thad ekki — **NaN er FALSY i JS**, svo brotid lidagildi verdur
      THEGJANDI 0 = hlutleysi og holfid maelist "engin ahrif" i stad thess
      ad falla. Hausinn a thessari skra sagdi ADUR "NaN er truthy"; thad
      var agiskun sem las eins og maeling, og stokkbreyting sem setti
      `f.margin = NaN` fyrir alla RB SLAPP I GEGN (exit 0, skra skrifud)
      thangad til thetta akkeri var sett inn.
      (CLAUDE.md 5b: fullyrding sem getur ekki brugdist maelir ekkert.)
   2. ORAKEL-lidur (f = raunstig - incumbent) gegnum SAMA net verdur ad
      loka storu bili. Net sem getur ekki sed merki sem VEIT svarid
      getur ekki hafnad neinu — hofnun vaeri bilad maelitaeki, ekki
      nidurstada (sama regla og akkerin i `agecurve-lab`).
   3. FORMERKID A LINUNNI. README 5c segir ad thetta se staersta
      gildran i verkefninu og ad EKKERT BROTNI SYNILEGA se thvi snuid
      vid. Fylgni ein og ser er ONOG throskuldur (r = 0,458 og krafa
      "> 0,4" er tveir hlutir sem eru of naerri hvor odrum), svo akkerid
      er nu KVORDUN: hallatala raunverulegs markamunar a forgjofina
      verdur ad vera ~1 (maelt 1,049), skekkjan ~0 (-0,057), formerkja-
      samhljomur > 60% (66,4%) og fylgni vaentra stiga vid raunstig
      lidsins > 0,25 (0,400). Se formerkinu snuid vid verdur hallatalan
      -1,049 og samhljomurinn 33,6% — thrju skilyrdi fella thad, ekki
      eitt a jadrinum. Raunskorin eru notud HER OG ADEINS HER.
   4. Incumbent verdur ad endurgerast upp a 0,05 prosentustig i badum
      theim snidum sem `startsit_*.json` bera.
   5. NIDURBROTID VERDUR AD VERA EXAKT. Summa per-leikmanns framlaga
      verdur ad vera NAKVAEMLEGA medaltal per-ars deltanna (1e-9). Oll
      per-leikmanns vikmork hvila a thvi; vaeri nidurbrotid nalgun
      vaeru vikmorkin skodun.
   6. STYRKUR MAELITAEKISINS. Per-leikmanns vikmorkin eru
      URSLITAPROFID (README 4c) — thau eru thvi keyrd a INCUMBENT
      SJALFUM (5,831% gegn flat) og a ORAKLINUM. Utiloki incumbent
      ekki null i sinni eigin maelingu tha er "0 af 45 holfum standast"
      ad hluta yfirlysing um MAELITAEKID, ekki bara um markadinn — og
      thad verdur ad stada i skranni, ekki i minninu.

   ============================================================
   PLACEBO-FAMILIA ER SKYLDA, EKKI BONFERRONI
   ============================================================
   TIU akvednar havada-breytur fara gegnum NAKVAEMLEGA sama net (tiu,
   ekki atta, svo placebo-familian se AD MINNSTA KOSTI eins stor og
   raunverulega familian: 10x5 = 50 holf gegn 9x5 = 45 — annars vaeri
   thakid maelt a faerri hendingum en talan sem thad a ad throskulda).
   I `opp-lab` nadi havadinn einstoku holfi med |t| = 3,50 og +58,2
   stig, og 10 af 11 raunverulegum breytum voru jakvaedar i fyrstu
   keyrslu. Med thessum fjolda afbrigda hefdi Bonferroni krafist
   |t| > 5,4 og thar med hafnad ollu — thad maelir ekkert.
   PLACEBO-THAKID er throskuldurinn.

   ============================================================
   BOOTSTRAP: BADAR KLASANIR, PER-LEIKMANNS RAEDUR
   ============================================================
   `vbdbase-lab` fekk 29 holf marktaek klosud eftir TIMABILI og 0 af
   153 klosud PER LEIKMANN. Timabils-klosun endursynir ARIN en heldur
   leikmanna-lauginni fastri og of-fullyrdir thess vegna.

   Akvordunar-maelikvardi hefur ekki sjalfgefid per-leikmanns nidurbrot
   — en THESSI hefur thad NAKVAEMLEGA: munurinn a afbrigdi og incumbent
   i einni viku er MENGJAMUNUR a valda lidinu. Sa sem er settur INN
   gefur +raunstig sin, sa sem fer UT gefur -raunstig sin, og summan af
   theim ollum er munurinn upp a stig (akkeri 5 profar thad). Klasa-
   bootstrap yfir leikmenn er thvi logmaett a nidurbrotinu.

   ATH um leikmenn med framlag 0: their sem afbrigdid hreyfdi ALDREI
   eru ekki i klasa-menginu. Thad breytir vikmorkunum hverfandi og er
   ekki hentugleiki: sd(summu) = sqrt(Sx^2 - (Sx)^2/N), sem stefnir a
   sqrt(Sx^2) um leid og N vex — nullklasar baeta engri dreifni vid.

   ============================================================
   WALK-FORWARD
   ============================================================
   Hver vog er valin ur timabilum FYRIR thvi sem er maelt. 2019 er
   brennslu-ar (engin fyrri gogn) svo walk-forward maelir 2020-2025.
   w = 0 ER I NETINU og VINNUR JAFNTEFLI — nulltilgatan a ad vinna
   thegar fyrri arin skera ekki ur. Fyrri utgafa las WEIGHTS i rod og
   let -0,30 vinna jafntefli af thvi ad thad kom fyrst i fylkinu; thad
   er handahof sem litur ut eins og val.

   ============================================================
   ENGINN LEKI — OG EITT SEM ER VIDURKENNT
   ============================================================
   Markadslinan er thekkt FYRIR leikinn og er thvi gilt inntak.
   `schedule_history.json` kemur ur nflverse `schedules/games.csv`
   (`spread_line`/`total_line`) — linan sem gilti fyrir leikinn, ekki
   nein eftirakvordun ur utkomunni. Akkeri 3 stadfestir KVORDUNINA gegn
   raunskorum, en linan sjalf kemur aldrei ur theim.

   HEIDARLEGT DEBET: kvardi hvers lidar (`scales`) er reiknadur ur
   OLLUM leikjum allra timabila. Thad er SKALI EINN — engin utkoma
   kemur naerri honum — og hann er uppsogadur i `w`, sem er fittad
   walk-forward. Hann er skrifadur i skrana svo lesandi geti sed thad
   sjalfur i stad thess ad taka thad tradad.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { weeklyProjection, impliedTeamTotals } from "../src/model.js";
import { mean, bootstrapDiff, solve } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), { boot: "number", from: "number" });
const BOOT = Number(ARG.boot || 400);
const FROM = Number(ARG.from || 2019);
const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };

const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);

/* Vidmidin — LESIN UR SKRANUM, ekki afritud hingad. */
const INCUMBENT_FILE = { ppr: "startsit_ppr.json", standard: "startsit_standard.json" };

const METHOD = "startsit-lab decision metric (percent of the flat->ceiling gap closed), " +
  "verbatim lineup builder, market term applied multiplicatively on top of weeklyProjection";

/* ============================================================
   LIDIRNIR
   ============================================================
   `raw(io, ioo, T, m)` skilar OSTODLUDU gildi. `center: false` a
   HNYKKI: theirra nullpunktur er MERKINGARBAER (enginn hnykkur undir
   throskuldi) og ad midja tha vaeri ad breyta theim i hnattraenan
   margfaldara + hnykk. Linulegir lidir ERU midjadir, thvi annars vaeri
   w = 0 og "medal-leikur" ekki sami hlutur.                        */
const TERMS = [
  { key: "margin", center: true, label: "Own spread (favoured positive), points",
    raw: (io, ioo, T, m) => m },
  { key: "total", center: true, label: "Game total (over/under)",
    raw: (io, ioo, T) => T },
  { key: "absMargin", center: true, label: "Blowout-ness: absolute spread",
    raw: (io, ioo, T, m) => Math.abs(m) },
  { key: "dogBig", center: false, label: "Kink: underdog margin beyond 7 points",
    raw: (io, ioo, T, m) => Math.max(0, -m - 7) },
  { key: "favBig", center: false, label: "Kink: favourite margin beyond 7 points",
    raw: (io, ioo, T, m) => Math.max(0, m - 7) },
  { key: "oppImp", center: true, label: "Opponent implied team total",
    raw: (io, ioo) => ioo },
  { key: "elasLo", center: false, label: "Kink: log(implied/15), below 15 only",
    raw: (io) => (io > 0 ? Math.min(0, Math.log(io / 15)) : 0) },
  { key: "elasHi", center: false, label: "Kink: log(implied/30), above 30 only",
    raw: (io) => (io > 0 ? Math.max(0, Math.log(io / 30)) : 0) },
  /* LEIDD BREYTA — hun tharf stoduna og er thvi reiknud eftir a, ur
     STODLUDU `margin`. Formerkid ER tilgatan sjalf.
     ATH SEM LESANDI A AD SJA I LOGGUNNI: i EINSTAKRI stodu er `flowPos`
     nakvaemlega +/- `margin` og holfid er thvi SAMA MAELINGIN med snuinni
     vog (radirnar eru ordrett eins i toflunni, w med gagnstaedu formerki).
     Adeins `ALL` er sjalfstaed maeling. Hun er samt keyrd i ollum scope-um
     thvi ad fela tvitalninguna vaeri verra en ad syna hana: lesandi getur
     stadfest afleidsluna med thvi ad bera radirnar saman. */
  { key: "flowPos", center: false, derived: true,
    label: "Game script as one hypothesis: +margin for RB, -margin for QB/WR/TE " +
      "(at a single-position scope this is identically +/- margin; only ALL is new)" },
];

/* Formerkin sem folk-visdomurinn gefur: lid sem er undir kastar (QB/WR/TE
   upp), lid sem er yfir hleypur ut klukkuna (RB upp). Se thetta rangt a
   `flowPos` ad maelast NEGATIFT, ekki nulli — thad er upplysing lika. */
const FLOW_SIGN = { RB: 1, QB: -1, WR: -1, TE: -1 };

/* TIU FRAEKORN. Sama rok og i `opp-lab` (fjogur gefa nulldreifingu med
   thremur frigradum og hun er of thunn til ad bera throskuld) OG eitt
   nytt: placebo-familian ma ekki vera MINNI en raunverulega familian,
   annars er thakid maelt a faerri hendingum en talan sem thad
   throskuldar. 10 fraekorn x 5 scope = 50 holf gegn 9 x 5 = 45. */
const PLACEBOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => ({
  key: `placebo${i}`, placebo: true, seed: i,
  label: `Placebo: deterministic noise, seed ${i}`,
}));

/** Deterministiskt sud ur (id, timabili, viku, fraekorni) — engin
    slembivel, svo keyrslan er endurgeranleg upp a bita. Fjorar
    jafndreifdar tolur -> naerri normal, og sd er REIKNUD (sqrt(4/12)),
    ekki maeld, svo kvardinn se sambaerilegur vid stoduldu lidina. */
const PLACEBO_SD = Math.sqrt(4 / 12);
function placeboValue(id, season, week, seed) {
  let h = (2166136261 ^ (seed * 16777619)) >>> 0;
  const s = `${id}|${season}|${week}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let u = 0;
  for (let k = 0; k < 4; k++) {
    h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0;
    u += (h >>> 8) / 16777216;
  }
  return (u - 2) / PLACEBO_SD;
}

/* VOGIN ER TVIHLIDA OG THAD ER ASETT. Einhlida grid GEFUR SER ATTINA
   ("undir -> kastar meira"), sem er nakvaemlega thad sem a ad maelast.
   0 er NULLTILGATAN og hun vinnur nema vikmorkin utiloki hana. */
const WEIGHTS = [-0.30, -0.15, -0.06, 0, 0.06, 0.15, 0.30];
const SCOPES = ["QB", "RB", "WR", "TE", "ALL"];
const FORMATS = ["ppr", "half", "standard"];

/* Margfaldarinn er klipptur eins og hinir margfaldarar likansins
   (`gameScriptMult` 0,65-1,45 · `defenseMult` 0,80-1,25). An
   klippingar getur eitt utlaga-holf i linunni gefid margfaldara sem
   ekkert raunverulegt likan myndi bera. */
const MULT_LO = 0.55, MULT_HI = 1.75;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/* Flokkar fyrir LYSANDI toflurnar (ekki fyrir akvardanir). Forgjofin er
   UR SJONARHORNI HANS LIDS: negatift = lidid er undir. */
const MARGIN_BUCKETS = [
  { key: "dog10+", test: (m) => m <= -10, label: "underdog by 10+" },
  { key: "dog3to10", test: (m) => m > -10 && m <= -3, label: "underdog 3-10" },
  { key: "even", test: (m) => m > -3 && m < 3, label: "within 3" },
  { key: "fav3to10", test: (m) => m >= 3 && m < 10, label: "favourite 3-10" },
  { key: "fav10+", test: (m) => m >= 10, label: "favourite by 10+" },
];
const IMPLIED_BUCKETS = [
  { key: "lt17", test: (io) => io < 17, label: "implied < 17" },
  { key: "17to20", test: (io) => io >= 17 && io < 20, label: "17-20" },
  { key: "20to23", test: (io) => io >= 20 && io < 23, label: "20-23" },
  { key: "23to26", test: (io) => io >= 23 && io < 26, label: "23-26" },
  { key: "26to29", test: (io) => io >= 26 && io < 29, label: "26-29" },
  { key: "ge29", test: (io) => io >= 29, label: "implied >= 29" },
];

/* ============================================================
   UPPSTILLING VIKUNNAR — ORDRETT AFRIT UR startsit-lab.mjs
   ============================================================
   Eina breytingin er ad hun skilar LIKA `ids` (hverjir voru valdir),
   sem er forsenda per-leikmanns nidurbrotsins. Rodun, hreidrun saeta
   og — thad sem mestu skiptir — FJOLDI KALLA I `scoreOf` er obreytt,
   svo `floor`-adferdin (sem les slembitolur i sama kalla-rod) gefur
   somu tolu og i startsit-lab. Vaeri thessu "snyrt til" (sleppa
   scoreOf fyrir tha sem spiludu ekki) hyrfi samanburdarhaefnin
   THEGJANDI og talan 5,831% hefdi ekkert vidmid.                  */
function lineupFrom(roster, scoreOf, actualOf) {
  const pool = roster.map((id) => ({ id, s: scoreOf(id), pos: actualOf(id) && actualOf(id).pos }))
    .filter((p) => p.pos && p.s != null);
  const by = { QB: [], RB: [], WR: [], TE: [] };
  for (const p of pool) if (by[p.pos]) by[p.pos].push(p);
  for (const k in by) by[k].sort((a, b) => b.s - a.s);
  const picked = [];
  const take = (pos, n) => { picked.push(...by[pos].splice(0, n)); };
  take("QB", 1); take("RB", 2); take("WR", 3); take("TE", 1);
  const flex = [...by.RB, ...by.WR, ...by.TE].sort((a, b) => b.s - a.s);
  if (flex.length) picked.push(flex[0]);
  /* STIGIN ERU ALLTAF RAUNVERULEG. Matid velur hverjir spila; thad
     gefur engin stig sjalft. Ad skora uppstillinguna med matinu vaeri
     ad maela hvad spain heldur um sjalfa sig. */
  let pts = 0;
  const ids = [];
  for (const p of picked) {
    const a = actualOf(p.id);
    if (a) pts += a.pts;
    ids.push(p.id);
  }
  return { pts, ids };
}

/* ============================================================
   TOLFRAEDI
   ============================================================ */
function tStat(vals) {
  const v = vals.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? m / (sd / Math.sqrt(v.length)) : (m === 0 ? 0 : null);
}

/** Vikmork klosud eftir TIMABILI — endurnotar audit-fallid. */
function bootBySeason(per) {
  const ys = Object.keys(per).filter((y) => per[y] != null);
  if (ys.length < 3) return null;
  const A = Object.fromEntries(ys.map((y) => [y, per[y]]));
  const B = Object.fromEntries(ys.map((y) => [y, 0]));
  const b = bootstrapDiff(A, B, 2000, 777);
  return b ? { lo: r3(b.lo), hi: r3(b.hi), excludesZero: b.excludesZero,
               clusterUnit: "season" } : null;
}

/**
 * Vikmork klosud PER LEIKMANN a EXAKTA nidurbrotinu.
 * `attr` er Map(pid -> framlag i prosentum af bilinu). Summan er
 * nakvaemlega heildarmunurinn (akkeri 5 profar thad), svo endursyning
 * leikmanna er endursyning a thvi sem raunverulega bar nidurstoduna.
 */
function bootByPlayer(attr, iters, seed = 20260812) {
  const ids = [...attr.keys()];
  if (ids.length < 20) return null;
  const vals = ids.map((k) => attr.get(k));
  const n = ids.length;
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const outv = [];
  for (let it = 0; it < iters; it++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += vals[Math.floor(rnd() * n)];
    outv.push(sum);
  }
  outv.sort((a, b) => a - b);
  const lo = outv[Math.floor(iters * 0.025)], hi = outv[Math.floor(iters * 0.975)];
  return { lo: r3(lo), hi: r3(hi), excludesZero: lo > 0 || hi < 0,
           point: r3(vals.reduce((a, b) => a + b, 0)), players: n, iters,
           clusterUnit: "player" };
}

function corr(a, b) {
  const ma = mean(a), mb = mean(b);
  let s = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    const u = a[i] - ma, v = b[i] - mb;
    s += u * v; da += u * u; db += v * v;
  }
  return da && db ? s / Math.sqrt(da * db) : null;
}

/** Radir flokkadar per leikmann — grunnur allra klasa-bootstrappa her. */
function groupByPlayer(rows) {
  const byP = new Map();
  for (const r of rows) {
    let a = byP.get(r.pid);
    if (!a) { a = []; byP.set(r.pid, a); }
    a.push(r);
  }
  return byP;
}

/** Almennt klasa-bootstrap: `stat(rows)` reiknad a endursyndum leikmonnum. */
function bootClustered(rows, stat, iters, seed) {
  const byP = groupByPlayer(rows);
  const ids = [...byP.keys()];
  if (ids.length < 30) return null;
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const vals = [];
  for (let it = 0; it < iters; it++) {
    const samp = [];
    for (let i = 0; i < ids.length; i++) {
      const g = byP.get(ids[Math.floor(rnd() * ids.length)]);
      for (const r of g) samp.push(r);
    }
    const v = stat(samp);
    if (v != null && Number.isFinite(v)) vals.push(v);
  }
  if (vals.length < 10) return null;
  vals.sort((a, b) => a - b);
  const lo = vals[Math.floor(vals.length * 0.025)], hi = vals[Math.floor(vals.length * 0.975)];
  return { lo: r3(lo), hi: r3(hi), excludesZero: lo > 0 || hi < 0, players: ids.length,
           iters: vals.length };
}

/** Brotinn stafur: e = a + b*m + c*max(0,m). `c` ER OSAMHVERFAN. */
function brokenStick(rows) {
  const X = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], Y = [0, 0, 0];
  for (const r of rows) {
    const x = [1, r.m, Math.max(0, r.m)];
    for (let i = 0; i < 3; i++) {
      Y[i] += x[i] * r.e;
      for (let j = 0; j < 3; j++) X[i][j] += x[i] * x[j];
    }
  }
  const b = solve(X, Y);
  return b ? { intercept: b[0], slopeDog: b[1], kink: b[2], slopeFav: b[1] + b[2] } : null;
}

function die(msg) {
  console.error(`\n  AKKERI FELL — SKRIFA EKKERT.\n  ${msg}\n`);
  process.exit(3);
}

const sameIds = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

/* ============================================================
   MAIN
   ============================================================ */
const out = {
  scales: {}, pairing: null, anchors: {}, coverage: {},
  incumbent: {}, results: {}, walkForward: {}, placebo: {},
  mechanism: {}, flow: {}, asymmetry: {}, maeVsDecision: {}, seasons: {},
};

async function main() {
  const t0 = Date.now();
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const sched = JSON.parse(await readFile(path.join(OUT, "schedule_history.json"), "utf8"));
  let defFile = [];
  try { defFile = JSON.parse(await readFile(path.join(OUT, "defense.json"), "utf8")); }
  catch { console.log("  (defense.json vantar — vornarlidurinn verdur hlutlaus)"); }

  /* ---------- AKKERI 3: KVORDUN LINUNNAR ---------- */
  const reg = sched.games.filter((g) => g.type === "REG" && g.spread != null &&
    g.total != null && g.homeScore != null && g.awayScore != null);
  const spr = reg.map((g) => g.spread), marg = reg.map((g) => g.homeScore - g.awayScore);
  const signR = corr(spr, marg);
  const ms = mean(spr), mm = mean(marg);
  let sxy = 0, sxx = 0;
  for (let i = 0; i < reg.length; i++) { sxy += (spr[i] - ms) * (marg[i] - mm); sxx += (spr[i] - ms) ** 2; }
  const slope = sxx ? sxy / sxx : null;
  const bias = mm - ms;
  let agree = 0, nz = 0;
  for (let i = 0; i < reg.length; i++) {
    if (spr[i] !== 0 && marg[i] !== 0) { nz++; if (Math.sign(spr[i]) === Math.sign(marg[i])) agree++; }
  }
  const signAgree = nz ? agree / nz * 100 : null;
  const ix = [], iy = [];
  for (const g of reg) {
    const t = impliedTeamTotals(g.total, g.spread);
    ix.push(t.home, t.away); iy.push(g.homeScore, g.awayScore);
  }
  const impliedR = corr(ix, iy);
  out.anchors.lineCalibration = {
    games: reg.length, r: r3(signR), slope: r3(slope), bias: r3(bias),
    signAgreementPct: r3(signAgree), rImpliedVsActualTeamPoints: r3(impliedR),
    meanImplied: r3(mean(ix)), meanActualTeamPoints: r3(mean(iy)),
    requires: "slope in [0.7,1.3] AND signAgreement > 60% AND rImplied > 0.25",
    note: "positive spread must mean home favourite (nflverse convention). A flipped " +
      "sign gives slope ~ -1 and agreement ~34%, so three conditions fail at once " +
      "instead of one correlation sitting near an arbitrary cut. Real scores are used " +
      "HERE AND ONLY HERE, to validate the input.",
  };
  console.log(`akkeri 3 · kvordun linunnar: hallatala ${r3(slope)} · skekkja ${r3(bias)}` +
    ` · formerkja-samhljomur ${r3(signAgree)}% · r(implied, raunstig lids) ${r3(impliedR)}` +
    `  (n=${reg.length})`);
  if (!(slope > 0.7 && slope < 1.3)) {
    die(`hallatala raunverulegs markamunar a forgjofina er ${r3(slope)} en verdur ad vera ` +
        "~1. README 5c: ESPN og nflverse nota ANDSTAETT formerki og ekkert brotnar " +
        "synilega se thvi snuid vid.");
  }
  if (!(signAgree > 60)) die(`formerkja-samhljomur adeins ${r3(signAgree)}% — linan er snuin.`);
  if (!(impliedR > 0.25)) {
    die(`r(vaent stig lids, raunstig lids) = ${r3(impliedR)} — `+
        "`impliedTeamTotals` er tha ekki ad skila vaentum stigum thess lids.");
  }

  /* ---------- KVARDAR LIDANNA (skali einn, engin utkoma) ---------- */
  const rawByTerm = Object.fromEntries(TERMS.filter((t) => !t.derived).map((t) => [t.key, []]));
  let teamWeeks = 0, impLo = 0, impHi = 0;
  for (const g of sched.games) {
    if (g.type !== "REG") continue;
    const it = impliedTeamTotals(g.total, g.spread);
    if (it.home == null) continue;
    for (const [io, ioo, m] of [[it.home, it.away, g.spread], [it.away, it.home, -g.spread]]) {
      teamWeeks++;
      if (io < 15) impLo++;
      if (io > 30) impHi++;
      for (const t of TERMS) if (!t.derived) rawByTerm[t.key].push(t.raw(io, ioo, g.total, m));
    }
  }
  for (const t of TERMS) {
    if (t.derived) { out.scales[t.key] = { center: 0, sd: 1, centered: false, n: null,
      note: "derived from the standardized margin times a position sign" }; continue; }
    const xs = rawByTerm[t.key];
    const mu = mean(xs);
    const sd = Math.sqrt(mean(xs.map((x) => (x - mu) ** 2)));
    out.scales[t.key] = { center: t.center ? r4(mu) : 0, sd: r4(sd || 1),
      centered: !!t.center, n: xs.length };
  }
  for (const p of PLACEBOS) out.scales[p.key] = { center: 0, sd: 1, centered: false, n: null };
  /* HVERSU MIKID ER TIL I OFGUNUM? Thetta er svarid vid "er
     POS_ELASTICITY rett kvordud undir 15 og yfir 30" adur en nokkur
     vog er fittud: se svidid naestum tomt er spurningin
     KRAFTLAUS AF BYGGINGU, og tha a talan ad stada, ekki thognin. */
  out.coverage.impliedExtremes = { teamWeeks, below15: impLo, above30: impHi,
    below15Pct: r3(impLo / teamWeeks * 100), above30Pct: r3(impHi / teamWeeks * 100) };
  console.log(`kvardar (skali einn — uppsogadur i w):`);
  for (const t of TERMS) {
    console.log(`  ${t.key.padEnd(10)} midja ${String(out.scales[t.key].center).padStart(8)}` +
      ` · sd ${out.scales[t.key].sd}`);
  }
  console.log(`ofgar i linunni: ${teamWeeks} lid-vikur · implied < 15 i ${impLo}` +
    ` (${r3(impLo / teamWeeks * 100)}%) · > 30 i ${impHi} (${r3(impHi / teamWeeks * 100)}%)`);

  const ALL_TERMS = [...TERMS, ...PLACEBOS];

  /* Vorn gegn stodu — sama uppfletting og startsit-lab. */
  const dvp = new Map();
  for (const d of defFile) dvp.set(`${d.season}|${d.team}|${d.pos}`, d);

  /* ---------- Porun ppr <-> standard; half er ALGEBRA ---------- */
  const byKey = { ppr: new Map(), standard: new Map() };
  for (const r of feats.rows) {
    if (!byKey[r.scoring]) continue;
    byKey[r.scoring].set(`${r.season}|${r.id}`, r);
  }
  let paired = 0, unpaired = 0;
  for (const k of byKey.ppr.keys()) (byKey.standard.has(k) ? paired++ : unpaired++);
  out.pairing = { paired, unpaired };
  console.log(`porun ppr<->standard: ${paired} por, ${unpaired} oporud`);

  const allYears = [...new Set(feats.rows.map((r) => r.season))].sort()
    .filter((y) => y >= FROM && y <= 2025);

  for (const fmt of FORMATS) {
    await runFormat(fmt, { feats, sched, byKey, dvp, allYears, ALL_TERMS });
  }

  out.verdict = buildVerdict(out);
  console.log(`\n${"=".repeat(78)}\n  VERDICT (reiknadur ur tolunum)\n${"=".repeat(78)}`);
  for (const line of out.verdict.lines) console.log(`  - ${line}`);

  out.runtimeSec = Math.round((Date.now() - t0) / 1000);
  await mkdir(path.join(OUT, "measure"), { recursive: true });
  await writeFile(path.join(OUT, "measure", "mktweek.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { boot: 400, from: 2019 },
      inputs: ["features.json", "schedule_history.json", "defense.json",
        "startsit_ppr.json", "startsit_standard.json",
        ...allYears.map((y) => `weekly/${y}.json`)], dataDir: OUT }),
    method: METHOD,
    grid: { terms: TERMS.map((t) => ({ key: t.key, label: t.label, centered: !!t.center,
      derived: !!t.derived })),
      placebos: PLACEBOS.map((p) => p.key), weights: WEIGHTS, scopes: SCOPES,
      formats: FORMATS, multClamp: [MULT_LO, MULT_HI], bootIters: BOOT,
      flowSign: FLOW_SIGN },
    ...out,
  }, null, 1));
  console.log(`\n-> data/measure/mktweek.json  (${out.runtimeSec}s)`);
}

/* ============================================================
   EITT SNID
   ============================================================ */
async function runFormat(fmt, ctx) {
  const { feats, sched, byKey, dvp, allYears, ALL_TERMS } = ctx;
  console.log(`\n${"=".repeat(78)}\n  ${fmt.toUpperCase()}\n${"=".repeat(78)}`);
  const seasons = [];

  for (const y of allYears) {
    let weekly;
    try { weekly = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8")); }
    catch { continue; }
    const games = sched.games.filter((g) => g.season === y && g.type === "REG");
    if (!games.length) { console.log(`  ${y}: engir leikir i skra`); continue; }

    /* Laugin. Fyrir ppr/standard er hun BYGGD EINS og i startsit-lab
       (sama sia, sama rod) svo akkeri 4 geti kraft nakvaemrar
       endurgerdar. `half` er reiknud upp a stig ur badum snidum: spa =
       medaltal snidanna, raunstig = (pts + ptsStd)/2 — sama algebra og
       `half-lab` notar. ADP er UNDANTEKNINGIN (hegdun, ekki formula)
       og half-ADP er ekki i gognunum; ppr-ADP er notud, og thad er
       ANNARS FLOKKS her thvi BADIR — incumbent og afbrigdi — faa
       NAKVAEMLEGA somu hopa. Hopurinn er ekki mismunurinn. */
    const pool = [];
    if (fmt === "half") {
      for (const [k, a] of byKey.ppr) {
        if (!k.startsWith(`${y}|`)) continue;
        const b = byKey.standard.get(k);
        if (!b || a.adp == null) continue;
        const pj = a.sleeperProj != null ? a.sleeperProj : a.ffProj;
        const sj = b.sleeperProj != null ? b.sleeperProj : b.ffProj;
        if (pj == null || sj == null || a.pts == null || a.ptsStd == null) continue;
        pool.push({ id: a.id, pos: a.pos, proj: (pj + sj) / 2, adp: a.adp,
          actual: (a.pts + a.ptsStd) / 2 });
      }
    } else {
      const yr = feats.rows.filter((r) => r.scoring === fmt && r.season === y &&
        r.adp != null && (r.sleeperProj != null || r.ffProj != null));
      for (const r of yr) {
        pool.push({ id: r.id, pos: r.pos,
          proj: r.sleeperProj != null ? r.sleeperProj : r.ffProj,
          adp: r.adp, actual: fmt === "ppr" ? r.pts : r.ptsStd });
      }
    }
    if (pool.length < 120) continue;

    /* Vaent stig, andstaedingur og heildarlina per (lid, viku). */
    const implied = new Map(), oppOf = new Map(), totOf = new Map();
    for (const g of games) {
      const t = impliedTeamTotals(g.total, g.spread);
      if (t.home != null) {
        implied.set(`${g.home}|${g.week}`, t.home);
        implied.set(`${g.away}|${g.week}`, t.away);
      }
      oppOf.set(`${g.home}|${g.week}`, g.away);
      oppOf.set(`${g.away}|${g.week}`, g.home);
      totOf.set(`${g.home}|${g.week}`, g.total);
      totOf.set(`${g.away}|${g.week}`, g.total);
    }

    const ptsOf = (w) => (fmt === "ppr" ? w.ppr : fmt === "half" ? w.half : w.std);
    const wk = new Map(), teamWk = new Map(), weeks = new Set();
    for (const w of weekly) {
      if (w.week > 18) continue;
      weeks.add(w.week);
      wk.set(`${w.id}|${w.week}`, { pos: w.pos, pts: ptsOf(w) });
      if (w.team) teamWk.set(`${w.id}|${w.week}`, w.team);
    }
    const wl = [...weeks].sort((a, b) => a - b);

    const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }]));
    const field = new Map(pool.slice().sort((a, b) => a.adp - b.adp)
      .map((p, i) => [p.id, i + 1]));
    const rosters = [];
    for (let slot = 1; slot <= TEAMS; slot++) {
      rosters.push(simulateDraft({ board: field, fieldBoard: field, actual,
        slot, league: LEAGUE }).roster);
    }
    const projOf = new Map(pool.map((p) => [p.id, p.proj]));

    /* ---- fjorar grunnadferdir, ORDRETT eins og startsit-lab ---- */
    let sFloor = 0, sFlat = 0, sWeek = 0, sCeil = 0, n = 0;
    let seed = y * 7919;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

    const units = [];            // { roster, week, actualOf, incIds, incPts, flatIds }
    const wpOf = new Map();      // `id|week` -> incumbent-spa (null = spiladi ekki)
    const fOf = new Map();       // `id|week` -> { termKey -> stodlad gildi } + __raw
    const maeRows = [];          // { key, pos, est, act }

    for (const roster of rosters) {
      for (const week of wl) {
        const actualOf = (id) => wk.get(`${id}|${week}`) || null;
        const played = roster.filter((id) => actualOf(id));
        if (played.length < 9) continue;          // of thunnt til ad stilla upp
        n++;

        sFloor += lineupFrom(roster, () => rnd(), actualOf).pts;
        const flat = lineupFrom(roster, (id) => (projOf.get(id) ?? 0) / 17, actualOf);
        sFlat += flat.pts;
        sCeil += lineupFrom(roster, (id) => (actualOf(id) ? actualOf(id).pts : null),
          actualOf).pts;

        const inc = lineupFrom(roster, (id) => {
          const key = `${id}|${week}`;
          if (wpOf.has(key)) return wpOf.get(key);
          const base = (projOf.get(id) ?? 0) / 17;
          const a = actualOf(id);
          if (!a) { wpOf.set(key, null); return null; }
          const team = teamWk.get(key);
          const imp = team ? implied.get(`${team}|${week}`) : null;
          const opp = team ? oppOf.get(`${team}|${week}`) : null;
          const d = opp ? dvp.get(`${y}|${opp}|${a.pos}`) : null;
          const wp = weeklyProjection({ base, pos: a.pos, implied: imp,
            def: d ? { adj: d.adj, leagueMean: d.leagueMean } : null, avail: 1, bye: false });
          const v = wp && wp.pts != null ? wp.pts : base;
          wpOf.set(key, v);

          /* Lidagildin — reiknud EINU SINNI per (leikmadur, viku). */
          const T = team ? totOf.get(`${team}|${week}`) : null;
          const ioo = team && opp ? implied.get(`${opp}|${week}`) : null;
          const m = imp != null && ioo != null ? imp - ioo : null;
          const f = {};
          const haveLine = imp != null && ioo != null && T != null;
          for (const t of TERMS) {
            if (t.derived) continue;
            /* VANTANDI LINA -> 0, EKKI AGISKUN. Nulla er hlutleysi
               (margfaldarinn verdur 1), sem er retta bakfallid: leikur
               an linu a ekki ad faera mann til i hvoruga att. */
            f[t.key] = !haveLine ? 0
              : (t.raw(imp, ioo, T, m) - out.scales[t.key].center) / out.scales[t.key].sd;
          }
          f.flowPos = (FLOW_SIGN[a.pos] || 0) * f.margin;
          for (const p of PLACEBOS) f[p.key] = placeboValue(id, y, week, p.seed);
          f.__raw = haveLine ? { io: imp, ioo, T, m } : null;
          fOf.set(key, f);
          return v;
        }, actualOf);
        sWeek += inc.pts;

        units.push({ roster, week, actualOf, incIds: inc.ids, incPts: inc.pts,
          flatIds: flat.ids });
      }
    }
    if (!n) continue;
    const gap = sCeil - sFlat;
    if (!(gap > 0)) continue;

    /* MAE-lauginn: hvert (leikmadur, vika) sem VAR I HOPI og spiladi.
       Talid einu sinni per einstakt par, ekki 12 sinnum. */
    const seen = new Set();
    for (const u of units) {
      for (const id of u.roster) {
        const key = `${id}|${u.week}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const a = u.actualOf(id);
        const v = wpOf.get(key);
        if (a && v != null) maeRows.push({ key, pos: a.pos, est: v, act: a.pts });
      }
    }

    seasons.push({ y, n, sFloor, sFlat, sWeek, sCeil, gap, units, wpOf, fOf, wk, maeRows });
    console.log(`  ${y}  n=${String(n).padStart(4)}  flat ${(sFlat / n).toFixed(1)}` +
      ` · vikuleg ${(sWeek / n).toFixed(1)} · fullkomid ${(sCeil / n).toFixed(1)}` +
      `  -> ${((sWeek - sFlat) / gap * 100).toFixed(2)}% af bilinu`);
  }

  const ys = seasons.map((s) => s.y);
  requireSeasons(ys, `timabil med vikugognum OG linum (${fmt})`);
  out.seasons[fmt] = ys;

  /* ---------- INCUMBENT + AKKERI 4 ---------- */
  const incPer = {};
  for (const s of seasons) incPer[s.y] = (s.sWeek - s.sFlat) / s.gap * 100;
  const incVals = Object.values(incPer);
  const incMean = mean(incVals);
  out.incumbent[fmt] = {
    per: Object.fromEntries(Object.entries(incPer).map(([k, v]) => [k, r3(v)])),
    pctOfGapClosed: r3(incMean), t: r3(tStat(incVals)), years: ys.length,
    positive: incVals.filter((v) => v > 0).length,
    pointsPerLineup: r3(mean(seasons.map((s) => (s.sWeek - s.sFlat) / s.n))),
    perLineup: { floor: r1(mean(seasons.map((s) => s.sFloor / s.n))),
      flat: r1(mean(seasons.map((s) => s.sFlat / s.n))),
      weekly: r1(mean(seasons.map((s) => s.sWeek / s.n))),
      ceiling: r1(mean(seasons.map((s) => s.sCeil / s.n))) },
    lineups: seasons.reduce((a, s) => a + s.n, 0),
  };

  if (INCUMBENT_FILE[fmt]) {
    let ref = null;
    try { ref = JSON.parse(await readFile(path.join(OUT, INCUMBENT_FILE[fmt]), "utf8")); }
    catch { /* fellur i akkeris-villuna her nedan */ }
    const want = ref && ref.totals ? ref.totals.pctOfGapClosed : null;
    out.anchors[`incumbentReproduced_${fmt}`] = { mine: r3(incMean), reference: want,
      source: INCUMBENT_FILE[fmt], requires: "|diff| <= 0.05" };
    if (want == null) {
      die(`${INCUMBENT_FILE[fmt]} ber ekkert \`totals.pctOfGapClosed\` — maelikvardinn ` +
          "er tha ekki samanburdarhaefur og talan hefdi engin vidmid.");
    }
    if (Math.abs(incMean - want) > 0.05) {
      die(`incumbent i ${fmt} maelist ${r3(incMean)}% en ${INCUMBENT_FILE[fmt]} segir ` +
          `${want}%. Maelikvardinn er thvi EKKI sa sami og talan sem verid er ad sla ` +
          "— sja notuna vid `lineupFrom`.");
    }
    console.log(`  akkeri 4 · incumbent ${r3(incMean)}% gegn ${want}% i ` +
      `${INCUMBENT_FILE[fmt]}  OK`);
  } else {
    out.anchors[`incumbentReproduced_${fmt}`] = { mine: r3(incMean), reference: null,
      note: "no startsit reference exists for half — it is measured here for the first time" };
    console.log(`  incumbent ${r3(incMean)}%  (ekkert startsit-vidmid til fyrir half)`);
  }

  /* ============================================================
     EITT HOLF
     ============================================================
     Skilar { per (deltaPct per ari), attr (per leikmann), mae, moved }.
     `attr` er i PROSENTUM AF BILINU og deilt nidur a fjolda ara, svo
     summan yfir leikmenn er NAKVAEMLEGA mean(per) — sami maelikvardi,
     annad nidurbrot (akkeri 5 profar thad).

     `force` slaer af styttingunni fyrir w = 0. Styttingin er
     hradaakvordun (w = 0 er 1/7 af netinu og getur ekki breytt neinu),
     EN hun gerir sjalfsprofid tomt se hun latin gilda thar — sja
     akkeri 1 i haus.                                               */
  function runCell(termKey, scope, w, force = false) {
    const per = {}, attr = new Map();
    let maeSum = 0, maeN = 0, moved = 0;
    for (const s of seasons) {
      const scale = 100 / s.gap / seasons.length;
      let d = 0;
      for (const u of s.units) {
        let got;
        if (w === 0 && !force) {
          got = { pts: u.incPts, ids: u.incIds };
        } else {
          got = lineupFrom(u.roster, (id) => {
            const key = `${id}|${u.week}`;
            const v = s.wpOf.get(key);
            if (v == null) return null;
            if (scope !== "ALL") {
              const rec = s.wk.get(key);
              if (!rec || rec.pos !== scope) return v;
            }
            const f = s.fOf.get(key);
            const fv = f ? (f[termKey] || 0) : 0;
            return fv ? v * clamp(1 + w * fv, MULT_LO, MULT_HI) : v;
          }, u.actualOf);
        }
        if (sameIds(got.ids, u.incIds)) continue;
        moved++;
        d += got.pts - u.incPts;
        /* EXAKT NIDURBROT: mengjamunur. Inn -> +raunstig, ut -> -raunstig. */
        const inSet = new Set(got.ids), outSet = new Set(u.incIds);
        for (const id of got.ids) {
          if (outSet.has(id)) continue;
          const a = u.actualOf(id);
          if (a) attr.set(id, (attr.get(id) || 0) + a.pts * scale);
        }
        for (const id of u.incIds) {
          if (inSet.has(id)) continue;
          const a = u.actualOf(id);
          if (a) attr.set(id, (attr.get(id) || 0) - a.pts * scale);
        }
      }
      per[s.y] = d / s.gap * 100;
      for (const m of s.maeRows) {
        let e = m.est;
        if (w !== 0 && (scope === "ALL" || m.pos === scope)) {
          const f = s.fOf.get(m.key);
          const fv = f ? (f[termKey] || 0) : 0;
          if (fv) e = m.est * clamp(1 + w * fv, MULT_LO, MULT_HI);
        }
        maeSum += Math.abs(e - m.act); maeN++;
      }
    }
    return { per, attr, moved, mae: maeN ? maeSum / maeN : null };
  }

  /* ---------- AKKERI 1a: LIDAGILDIN VERDA AD VERA TOLUR ----------
     Sja hausinn: NaN er FALSY, svo `|| 0` gerir brotid lidagildi ad
     hlutleysi i thogn. Thetta er thvi ekki varudarkodi heldur eina
     leidin til ad sja mun a "lidurinn hafdi engin ahrif" og "lidurinn
     var biladur". Talid er a OLLUM skradum lyklum (TERMS + PLACEBOS);
     `__oracle` og `__raw` eru viljandi utan (fyrri er settur seinna,
     sidari er hlutur).                                              */
  const declaredKeys = [...TERMS.map((t) => t.key), ...PLACEBOS.map((p) => p.key)];
  let nonFinite = 0, firstBad = null, valuesChecked = 0;
  for (const s of seasons) {
    for (const [key, f] of s.fOf) {
      for (const k of declaredKeys) {
        valuesChecked++;
        if (!Number.isFinite(f[k])) {
          nonFinite++;
          if (!firstBad) firstBad = `${k} @ ${key} = ${String(f[k])}`;
        }
      }
    }
  }
  out.anchors[`termValuesFinite_${fmt}`] = { valuesChecked, nonFinite,
    keys: declaredKeys.length, requires: "0 non-finite",
    note: "NaN is FALSY in JS, so `f[key] || 0` would turn a broken term into silent " +
      "neutrality and the cell would read 'no effect' instead of failing. A mutation " +
      "setting f.margin = NaN for every RB passed with exit 0 before this anchor existed." };
  if (nonFinite) {
    die(`${nonFinite} af ${valuesChecked} lidagildum eru ekki tolur (fyrsta: ${firstBad}). ` +
        "`f[key] || 0` myndi gera thau ad THOGULU hlutleysi — NaN er falsy — svo holfid " +
        "laesi \"engin ahrif\" i stad thess ad falla.");
  }
  console.log(`  akkeri 1a · lidagildi: 0 af ${valuesChecked} onytileg  OK`);

  /* ---------- AKKERI 1: SJALFSPROF, FULL LEID, w = 0 ---------- */
  let worstZero = 0, checked = 0, movedAtZero = 0, active = 0;
  for (const scope of SCOPES) {
    for (const key of ["margin", "total", "dogBig", "flowPos", "placebo1"]) {
      const c = runCell(key, scope, 0, true);
      const m = mean(Object.values(c.per));
      checked++; movedAtZero += c.moved;
      worstZero = Math.max(worstZero, Math.abs(m));
      /* Fullyrdingin sem er EKKI tom: uppstillingarnar verda ad vera
         SOMU (moved === 0). Se margfaldarinn misritadur — t.d.
         `v * clamp(w*fv, ...)` an `1 +`, sem verdur 0,55 vid w = 0 —
         hlidrast radirnar og thetta fellur. Thad er FELLD STOKKBREYTING,
         ekki tilgata; gamla styttingin slapp hana OSEDDA. */
      if (m !== 0 || c.moved !== 0) {
        die(`sjalfsprof: w = 0 gaf deltaPct ${m} og ${c.moved} breyttar uppstillingar i ` +
            `holfi ${fmt}/${key}/${scope}. Med w = 0 er margfaldarinn nakvaemlega 1, svo ` +
            "hver uppstilling verdur ad vera SU SAMA. Brotin LIDAGILDI eru annad mal og " +
            "hafa sitt eigid akkeri (1a) — NaN er falsy og slyppi her framhja.");
      }
    }
  }
  /* Og lidirnir VERDA ad vera virkir — annars vaeri profid graent af thvi
     ad ekkert var reiknad. Talan sjalf er thvi fullyrding (CLAUDE.md 5b:
     thekja er fullyrding, ekki logga). */
  for (const s of seasons) {
    for (const f of s.fOf.values()) if (f.__raw) active++;
  }
  const scored = seasons.reduce((a, s) => a + s.fOf.size, 0);
  out.anchors[`selfTestZero_${fmt}`] = { maxAbsDeltaPct: worstZero, lineupsChanged: movedAtZero,
    cellsChecked: checked, forcedFullMultiplierPath: true,
    playerWeeksScored: scored, playerWeeksWithLine: active,
    requires: "exactly 0 delta AND 0 changed lineups AND >90% of player-weeks carry a line" };
  if (!(active > 0.9 * scored)) {
    die(`adeins ${active} af ${scored} leikmanna-vikum bera markadslinu — netid vaeri tha ` +
        "green af thvi ad ekkert var reiknad, ekki af thvi ad ekkert maeldist.");
  }
  console.log(`  akkeri 1 · sjalfsprof (full leid, w=0): 0 i ollum ${checked} holfum, ` +
    `0 breyttar uppstillingar · linu-thekja ${active}/${scored}  OK`);

  /* ---------- AKKERI 2: ORAKEL gegnum SAMA net ---------- */
  for (const s of seasons) {
    const diffs = [];
    for (const [key, v] of s.wpOf) {
      if (v == null) continue;
      const a = s.wk.get(key);
      if (a) diffs.push(a.pts - v);
    }
    const sd = Math.sqrt(mean(diffs.map((x) => x * x))) || 1;
    for (const [key, v] of s.wpOf) {
      if (v == null) continue;
      const a = s.wk.get(key), f = s.fOf.get(key);
      if (f) f.__oracle = a ? (a.pts - v) / sd : 0;
    }
  }
  const oracleCell = runCell("__oracle", "ALL", 0.30);
  const oracleMean = mean(Object.values(oracleCell.per));
  const oracleBoot = bootByPlayer(oracleCell.attr, BOOT);
  out.anchors[`oracle_${fmt}`] = { deltaPct: r3(oracleMean), w: 0.30,
    bootPlayer: oracleBoot, requires: "> +5 pct points AND per-player CI excludes zero",
    note: "the oracle term goes through the identical grid — if it cannot close a " +
      "large gap, a rejection would be a broken instrument, not a result. Its per-player " +
      "CI is reported for the same reason: the criterion that rules must be shown to be " +
      "reachable by SOMETHING." };
  console.log(`  akkeri 2 · orakel-lidur gegnum sama net: ${r3(oracleMean)}` +
    ` prosentustig af bilinu · per-leikmanns CI ` +
    `[${oracleBoot ? oracleBoot.lo : "—"}, ${oracleBoot ? oracleBoot.hi : "—"}]`);
  if (!(oracleMean > 5)) {
    die(`orakel-lidurinn nadi adeins ${r3(oracleMean)} prosentustigum. Net sem getur ` +
        "ekki sed merki sem VEIT svarid getur ekki hafnad neinu.");
  }
  if (!(oracleBoot && oracleBoot.excludesZero)) {
    die("per-leikmanns vikmork orakelsins utiloka EKKI null. Tha er urslitaprofid " +
        "oframkvaemanlegt og \"0 holf standast\" segir ekkert um markadinn.");
  }

  /* ---------- AKKERI 5 + 6: NIDURBROTID OG STYRKUR MAELITAEKISINS ----------
     Incumbent gegn flat er NAKVAEMLEGA sama tegund munar (mengjamunur a
     valdri uppstillingu), svo per-leikmanns vikmorkin ma reikna a
     HONUM. Utiloki 5,831% ekki null i sinni eigin maelingu tha er
     urslitaprofid strangara en talan sem verid er ad sla — og thad
     verdur ad stada i skranni.                                       */
  const incAttr = new Map();
  for (const s of seasons) {
    const scale = 100 / s.gap / seasons.length;
    for (const u of s.units) {
      if (sameIds(u.incIds, u.flatIds)) continue;
      const inSet = new Set(u.incIds), outSet = new Set(u.flatIds);
      for (const id of u.incIds) {
        if (outSet.has(id)) continue;
        const a = u.actualOf(id);
        if (a) incAttr.set(id, (incAttr.get(id) || 0) + a.pts * scale);
      }
      for (const id of u.flatIds) {
        if (inSet.has(id)) continue;
        const a = u.actualOf(id);
        if (a) incAttr.set(id, (incAttr.get(id) || 0) - a.pts * scale);
      }
    }
  }
  const incAttrSum = [...incAttr.values()].reduce((a, b) => a + b, 0);
  if (Math.abs(incAttrSum - incMean) > 1e-9) {
    die(`nidurbrotid er EKKI exakt: summa per-leikmanns framlaga er ${incAttrSum} en ` +
        `heildarmunurinn er ${incMean}. Oll per-leikmanns vikmork hvila a thessari ` +
        "jofnu; se hun ekki nakvaem eru vikmorkin skodun.");
  }
  const incBoot = bootByPlayer(incAttr, BOOT);
  out.anchors[`attributionExact_${fmt}`] = { sumOfPlayerContributions: r4(incAttrSum),
    meanOfPerSeasonDeltas: r4(incMean), maxAbsDiff: Math.abs(incAttrSum - incMean),
    requires: "identical to 1e-9" };
  out.anchors[`incumbentOwnPerPlayerCI_${fmt}`] = { pctOfGapClosed: r3(incMean),
    bootPlayer: incBoot, players: incBoot ? incBoot.players : null,
    note: "the criterion that rules (README 4c) applied to the incumbent's OWN effect. " +
      "If this does not exclude zero, then '0 of 45 cells pass' is partly a statement " +
      "about the instrument's power at this effect size, not only about the market." };
  console.log(`  akkeri 5 · nidurbrot exakt (${r4(incAttrSum)} = ${r4(incMean)})  OK`);
  console.log(`  akkeri 6 · incumbent SJALFUR per leikmann: ${r3(incMean)}% · CI ` +
    `[${incBoot ? incBoot.lo : "—"}, ${incBoot ? incBoot.hi : "—"}]` +
    ` -> utilokar null: ${incBoot ? incBoot.excludesZero : "—"}`);

  /* ---------- GRIDID ---------- */
  const cells = {}, attrOf = new Map(), maeOf = new Map();
  let done = 0;
  const total = ALL_TERMS.length * SCOPES.length * (WEIGHTS.length - 1);
  for (const t of ALL_TERMS) {
    for (const scope of SCOPES) {
      const g = {};
      for (const w of WEIGHTS) {
        const c = runCell(t.key, scope, w);
        const vals = Object.values(c.per);
        g[w] = { per: Object.fromEntries(Object.entries(c.per).map(([k, v]) => [k, r3(v)])),
          mean: r3(mean(vals)), t: r3(tStat(vals)),
          wins: vals.filter((v) => v > 0).length, years: vals.length, moved: c.moved };
        attrOf.set(`${t.key}|${scope}|${w}`, c.attr);
        maeOf.set(`${t.key}|${scope}|${w}`, c.mae);
        if (w !== 0 && ++done % 60 === 0) process.stdout.write(`\r  grid ${done}/${total}   `);
      }
      cells[`${t.key}|${scope}`] = g;
    }
  }
  process.stdout.write(`\r  grid ${done}/${total} — lokid\n`);
  const incMae = maeOf.get(`margin|ALL|0`);

  /* ---------- WALK-FORWARD ---------- */
  const wf = {};
  for (const t of ALL_TERMS) {
    for (const scope of SCOPES) {
      const g = cells[`${t.key}|${scope}`];
      const per = {}, chosen = {};
      for (let i = 1; i < ys.length; i++) {
        const y = ys[i], prior = ys.slice(0, i);
        /* NULLTILGATAN VINNUR JAFNTEFLI: byrjad a w = 0 og adeins
           STRANGT betri fyrri-ara medaltal skiptir henni ut. */
        let bestW = 0, bestV = mean(prior.map((py) => g[0].per[py]));
        for (const w of WEIGHTS) {
          if (w === 0) continue;
          const v = mean(prior.map((py) => g[w].per[py]));
          if (v > bestV) { bestV = v; bestW = w; }
        }
        chosen[y] = bestW;
        per[y] = g[bestW].per[y];
      }
      const vals = Object.values(per);
      wf[`${t.key}|${scope}`] = { per, chosen, mean: r3(mean(vals)), t: r3(tStat(vals)),
        wins: vals.filter((v) => v > 0).length, years: vals.length,
        bootSeason: bootBySeason(per) };
    }
  }
  out.walkForward[fmt] = wf;

  /* ---------- BESTA HOLF PER (LIDUR x SCOPE) + BADAR KLASANIR ---------- */
  const results = {};
  for (const t of ALL_TERMS) {
    for (const scope of SCOPES) {
      const key = `${t.key}|${scope}`;
      const g = cells[key];
      let bw = null, bv = -Infinity;
      for (const w of WEIGHTS) if (w !== 0 && g[w].mean > bv) { bv = g[w].mean; bw = w; }
      const attr = attrOf.get(`${t.key}|${scope}|${bw}`);
      const mae = maeOf.get(`${t.key}|${scope}|${bw}`);
      results[key] = {
        term: t.key, scope, placebo: !!t.placebo, label: t.label,
        grid: Object.fromEntries(WEIGHTS.map((w) => [w, { mean: g[w].mean, t: g[w].t,
          wins: g[w].wins, moved: g[w].moved }])),
        best: { w: bw, deltaPct: g[bw].mean, t: g[bw].t, wins: g[bw].wins,
          years: g[bw].years, per: g[bw].per, lineupsMoved: g[bw].moved,
          pctOfGapClosed: r3(incMean + g[bw].mean),
          bootSeason: bootBySeason(g[bw].per),
          bootPlayer: attr ? bootByPlayer(attr, BOOT) : null,
          mae: r4(mae), maeDelta: r4(mae != null && incMae != null ? mae - incMae : null) },
        walkForward: wf[key],
      };
    }
  }
  out.results[fmt] = results;

  /* ---------- PLACEBO-THAKID ---------- */
  const plc = Object.values(results).filter((r) => r.placebo);
  const real = Object.values(results).filter((r) => !r.placebo);
  const plcMax = Math.max(...plc.map((r) => r.best.deltaPct));
  const plcMaxAbsT = Math.max(...plc.map((r) => Math.abs(r.best.t ?? 0)));
  const plcWfMax = Math.max(...plc.map((r) => r.walkForward.mean));
  const plcSigSeason = plc.filter((r) => r.best.bootSeason &&
    r.best.bootSeason.excludesZero && r.best.deltaPct > 0).length;
  const plcSigPlayer = plc.filter((r) => r.best.bootPlayer &&
    r.best.bootPlayer.excludesZero && r.best.deltaPct > 0).length;
  out.placebo[fmt] = { cells: plc.length, realCells: real.length, maxDeltaPct: r3(plcMax),
    maxAbsT: r3(plcMaxAbsT), maxWalkForward: r3(plcWfMax),
    significantBySeason: plcSigSeason, significantByPlayer: plcSigPlayer,
    perSeed: plc.filter((r) => r.scope === "ALL")
      .map((r) => ({ term: r.term, best: r.best.deltaPct, wf: r.walkForward.mean })) };
  console.log(`\n  PLACEBO-THAK (${plc.length} holf gegn ${real.length} raunverulegum):` +
    ` besta deltaPct ${r3(plcMax)} · |t| upp i ${r3(plcMaxAbsT)}` +
    ` · walk-forward upp i ${r3(plcWfMax)}`);
  console.log(`  placebo-holf sem "standast": timabils-vikmork ${plcSigSeason}` +
    ` · per-leikmanns ${plcSigPlayer}`);

  /* ---------- TAFLAN ---------- */
  console.log(`\n  lidur      scope  bestaW  deltaPct  pctGap      t   ar` +
    `  CI(timabil)         CI(leikmadur)         wf`);
  for (const r of real.slice().sort((a, b) => b.best.deltaPct - a.best.deltaPct)) {
    const bs = r.best.bootSeason, bp = r.best.bootPlayer;
    const flag = bp && bp.excludesZero && r.best.deltaPct > plcMax &&
      r.walkForward.mean > plcWfMax ? "  <<<" : "";
    console.log(`  ${r.term.padEnd(10)} ${r.scope.padEnd(5)} ` +
      `${String(r.best.w).padStart(6)} ${String(r.best.deltaPct).padStart(9)} ` +
      `${String(r.best.pctOfGapClosed).padStart(7)} ${String(r.best.t).padStart(6)} ` +
      `${r.best.wins}/${r.best.years}  ` +
      `[${bs ? bs.lo : "—"}, ${bs ? bs.hi : "—"}]`.padEnd(21) +
      `[${bp ? bp.lo : "—"}, ${bp ? bp.hi : "—"}]`.padEnd(22) +
      `${String(r.walkForward.mean).padStart(7)}${flag}`);
  }

  /* ---------- LEIFARADIRNAR: grunnur mekanisma, flaedis og osamhverfu ----------
     e = raunstig - incumbent-spa fyrir hverja skorada leikmanna-viku.
     Thetta er LYSING, ekki akvordun — og thad er nakvaemlega thess vegna
     ad hun er hofd ser: `first4-lab` (README 5j) sannadi ad fylgni i
     toflu er tilgata, ekki nidurstada.                              */
  const resRows = { QB: [], RB: [], WR: [], TE: [] };
  for (const s of seasons) {
    for (const [key, v] of s.wpOf) {
      if (v == null) continue;
      const a = s.wk.get(key), f = s.fOf.get(key);
      if (!a || !f || !f.__raw || !resRows[a.pos]) continue;
      resRows[a.pos].push({ pid: key.slice(0, key.indexOf("|")), pos: a.pos,
        e: a.pts - v, est: v, act: a.pts,
        m: f.__raw.m, io: f.__raw.io, T: f.__raw.T, f });
    }
  }

  /* ---------- MEKANISMINN: fylgni lidar vid vikulega leif ---------- */
  const mech = {};
  for (const P of ["QB", "RB", "WR", "TE"]) {
    mech[P] = {};
    for (const t of TERMS) {
      const rows = resRows[P];
      if (rows.length < 200) { mech[P][t.key] = null; continue; }
      const x = rows.map((r) => r.f[t.key]), y = rows.map((r) => r.e);
      mech[P][t.key] = { r: r3(corr(x, y)), n: rows.length,
        ci: bootClustered(rows, (samp) => corr(samp.map((r) => r.f[t.key]),
          samp.map((r) => r.e)), Math.min(BOOT, 250), 424242) };
    }
  }
  out.mechanism[fmt] = mech;
  console.log(`\n  MEKANISMI — fylgni lidar vid vikulega leif (raun - incumbent),` +
    ` bootstrap klosud per leikmann`);
  console.log("  lidur      " + ["QB", "RB", "WR", "TE"].map((p) => p.padStart(14)).join(""));
  for (const t of TERMS) {
    console.log(`  ${t.key.padEnd(10)} ` + ["QB", "RB", "WR", "TE"].map((p) => {
      const c = mech[p][t.key];
      return (c ? `${c.r}${c.ci && c.ci.excludesZero ? "*" : " "}` : "—").padStart(14);
    }).join(""));
  }
  console.log("   * = 95% bootstrap-vikmork (klosud per leikmann) utiloka null");

  /* ---------- LEIKJAFLAEDID PER STODU: FLOKKA-TAFLA ----------
     Spurningin sem folk-visdomurinn svarar sjalfum ser: fer RB UPP thegar
     lidid er yfir og WR/QB UPP thegar thad er undir? Toflan er MEDALLEIF
     per flokki, med n — og mismunur ytri flokkanna med klasa-vikmorkum.
     Enginn hnykkur er fittadur her; thetta er thad sem gognin segja adur
     en nokkur vog kemur til.                                        */
  const flow = {};
  for (const P of ["QB", "RB", "WR", "TE"]) {
    const rows = resRows[P];
    const b = {};
    for (const bu of MARGIN_BUCKETS) {
      const sel = rows.filter((r) => bu.test(r.m));
      b[bu.key] = { label: bu.label, n: sel.length,
        meanResid: sel.length ? r3(mean(sel.map((r) => r.e))) : null,
        meanEst: sel.length ? r3(mean(sel.map((r) => r.est))) : null,
        meanAct: sel.length ? r3(mean(sel.map((r) => r.act))) : null };
    }
    const bi = {};
    for (const bu of IMPLIED_BUCKETS) {
      const sel = rows.filter((r) => bu.test(r.io));
      bi[bu.key] = { label: bu.label, n: sel.length,
        meanResid: sel.length ? r3(mean(sel.map((r) => r.e))) : null,
        meanEst: sel.length ? r3(mean(sel.map((r) => r.est))) : null,
        meanAct: sel.length ? r3(mean(sel.map((r) => r.act))) : null };
    }
    /* fav10+ minus dog10+: "hjalpar thad honum ad lidid se stort favorit?" */
    const diffStat = (samp) => {
      const A = samp.filter((r) => r.m >= 10), B = samp.filter((r) => r.m <= -10);
      return A.length && B.length ? mean(A.map((r) => r.e)) - mean(B.map((r) => r.e)) : null;
    };
    flow[P] = { byMargin: b, byImplied: bi,
      favMinusDog: r3(diffStat(rows)),
      favMinusDogCI: bootClustered(rows, diffStat, Math.min(BOOT, 250), 909090),
      n: rows.length };
  }
  out.flow[fmt] = flow;
  console.log(`\n  LEIKJAFLAEDI — medalleif (raunstig - incumbent) eftir forgjof lidsins`);
  console.log("  stada  " + MARGIN_BUCKETS.map((b) => b.key.padStart(12)).join("") +
    "     fav10+ - dog10+  (CI per leikmann)");
  for (const P of ["QB", "RB", "WR", "TE"]) {
    const f = flow[P];
    console.log(`  ${P.padEnd(6)} ` + MARGIN_BUCKETS.map((b) => {
      const c = f.byMargin[b.key];
      return `${c.meanResid == null ? "—" : c.meanResid}`.padStart(12);
    }).join("") + `     ${String(f.favMinusDog).padStart(6)}` +
      `  [${f.favMinusDogCI ? f.favMinusDogCI.lo : "—"}, ` +
      `${f.favMinusDogCI ? f.favMinusDogCI.hi : "—"}]`);
  }
  console.log("  n per flokki: " + MARGIN_BUCKETS.map((b) =>
    `${b.key} ${flow.RB.byMargin[b.key].n}`).join(" · ") + "  (RB)");
  console.log(`\n  OFGARNIR — medalleif eftir vaentum stigum lidsins (POS_ELASTICITY)`);
  console.log("  stada  " + IMPLIED_BUCKETS.map((b) => b.key.padStart(10)).join(""));
  for (const P of ["QB", "RB", "WR", "TE"]) {
    console.log(`  ${P.padEnd(6)} ` + IMPLIED_BUCKETS.map((b) => {
      const c = flow[P].byImplied[b.key];
      return `${c.meanResid == null ? "—" : c.meanResid}`.padStart(10);
    }).join(""));
  }
  console.log("  n (RB):" + IMPLIED_BUCKETS.map((b) =>
    String(flow.RB.byImplied[b.key].n).padStart(10)).join(""));

  /* ---------- OSAMHVERFAN ---------- */
  const asym = {};
  for (const scope of SCOPES) {
    const dog = results[`dogBig|${scope}`], fav = results[`favBig|${scope}`];
    const lin = results[`margin|${scope}`];
    /* Undir SAMHVERFU (hreinum linulegum margin-lid) aetti besta w
       fyrir dogBig ad vera -besta w fyrir favBig, og stordirnar ad vera
       spegilmyndir. THETTA ER DESCRIPTIVT PROF: w er valid post-hoc, svo
       thad er SVAKARA en thad litur ut fyrir ad vera. Placebo-parid er
       reiknad a somu hatt svo lesandi hafi vidmid. */
    const pairPer = ys.map((y) => (dog.best.per[y] ?? 0) - (fav.best.per[y] ?? 0));
    const half = PLACEBOS.length >> 1;
    const plcPair = PLACEBOS.slice(0, half).map((p, i) => {
      const A = results[`${p.key}|${scope}`], B = results[`${PLACEBOS[i + half].key}|${scope}`];
      return r3(mean(ys.map((y) => (A.best.per[y] ?? 0) - (B.best.per[y] ?? 0))));
    });
    asym[scope] = {
      dog: { w: dog.best.w, deltaPct: dog.best.deltaPct, t: dog.best.t,
        bootPlayer: dog.best.bootPlayer, wf: dog.walkForward.mean },
      fav: { w: fav.best.w, deltaPct: fav.best.deltaPct, t: fav.best.t,
        bootPlayer: fav.best.bootPlayer, wf: fav.walkForward.mean },
      linear: { w: lin.best.w, deltaPct: lin.best.deltaPct, wf: lin.walkForward.mean },
      mirroredWeights: dog.best.w === -fav.best.w,
      pairedDiff: r3(mean(pairPer)), pairedT: r3(tStat(pairPer)),
      placeboPairedDiffs: plcPair,
    };
  }
  /* OG PROFID SEM ER EKKI POST-HOC: brotinn stafur a leifinni. `kink`
     er osamhverfan sjalf — se hun null er forgjofin LINULEG i sinum
     ahrifum og "10 undir er spegilmynd af 10 yfir" er RETT. */
  const stick = {};
  for (const P of ["QB", "RB", "WR", "TE"]) {
    const rows = resRows[P];
    const fit = rows.length >= 200 ? brokenStick(rows) : null;
    stick[P] = fit ? {
      n: rows.length, slopeDog: r4(fit.slopeDog), slopeFav: r4(fit.slopeFav),
      kink: r4(fit.kink),
      kinkCI: bootClustered(rows, (samp) => {
        const b = brokenStick(samp); return b ? b.kink : null;
      }, Math.min(BOOT, 250), 515151),
    } : null;
  }
  out.asymmetry[fmt] = { byScope: asym, brokenStick: stick,
    note: "brokenStick fits e = a + b*m + c*max(0,m) on the weekly residual. `c` IS the " +
      "asymmetry and it is NOT chosen post-hoc, unlike the dogBig/favBig grid cells." };
  console.log(`\n  OSAMHVERFA — brotinn stafur a leifinni: e = a + b*m + c*max(0,m)`);
  console.log("  stada   hallatala(undir)  hallatala(yfir)      hnykkur c  CI(leikmadur)");
  for (const P of ["QB", "RB", "WR", "TE"]) {
    const s = stick[P];
    if (!s) { console.log(`  ${P.padEnd(6)}  —`); continue; }
    console.log(`  ${P.padEnd(6)} ${String(s.slopeDog).padStart(16)} ` +
      `${String(s.slopeFav).padStart(16)} ${String(s.kink).padStart(14)}  ` +
      `[${s.kinkCI ? s.kinkCI.lo : "—"}, ${s.kinkCI ? s.kinkCI.hi : "—"}]` +
      `${s.kinkCI && s.kinkCI.excludesZero ? "  *" : ""}`);
  }
  console.log(`  akvordunar-hlidin (ALL): dogBig ${asym.ALL.dog.deltaPct}` +
    ` (w=${asym.ALL.dog.w}) · favBig ${asym.ALL.fav.deltaPct} (w=${asym.ALL.fav.w})` +
    ` · pardur mismunur ${asym.ALL.pairedDiff} (t=${asym.ALL.pairedT})` +
    ` · placebo-por ${asym.ALL.placeboPairedDiffs.join(", ")}`);

  /* ---------- MAE BATNADI, AKVORDUN VERSNADI ---------- */
  const cnt = { real: { maeUpDecDown: 0, decUpMaeDown: 0, both: 0, tot: 0 },
    placebo: { maeUpDecDown: 0, decUpMaeDown: 0, both: 0, tot: 0 } };
  const examples = [];
  for (const t of ALL_TERMS) {
    for (const scope of SCOPES) {
      for (const w of WEIGHTS) {
        if (w === 0) continue;
        const mae = maeOf.get(`${t.key}|${scope}|${w}`);
        const dec = cells[`${t.key}|${scope}`][w].mean;
        if (mae == null || incMae == null) continue;
        const c = t.placebo ? cnt.placebo : cnt.real;
        c.tot++;
        const maeBetter = mae < incMae;
        if (maeBetter && dec < 0) {
          c.maeUpDecDown++;
          if (!t.placebo && examples.length < 15) {
            examples.push({ term: t.key, scope, w, mae: r4(mae),
              maeDelta: r4(mae - incMae), deltaPct: dec });
          }
        }
        if (!maeBetter && dec > 0) c.decUpMaeDown++;
        if (maeBetter && dec > 0) c.both++;
      }
    }
  }
  out.maeVsDecision[fmt] = { incumbentMae: r4(incMae),
    real: { cells: cnt.real.tot, maeBetterDecisionWorse: cnt.real.maeUpDecDown,
      decisionBetterMaeWorse: cnt.real.decUpMaeDown, bothBetter: cnt.real.both },
    placebo: { cells: cnt.placebo.tot, maeBetterDecisionWorse: cnt.placebo.maeUpDecDown,
      decisionBetterMaeWorse: cnt.placebo.decUpMaeDown, bothBetter: cnt.placebo.both },
    examples };
  console.log(`\n  MAE gegn AKVORDUN (${cnt.real.tot} raunverulegt holf): MAE batnadi OG ` +
    `akvordun versnadi i ${cnt.real.maeUpDecDown} · hid gagnstaeda i ` +
    `${cnt.real.decUpMaeDown} · baedi batnadi i ${cnt.real.both}` +
    `  (placebo: ${cnt.placebo.maeUpDecDown}/${cnt.placebo.tot})`);
}

/* ============================================================
   VERDICT — REIKNADUR UR TOLUNUM
   ============================================================
   `agecurve-lab` gerir thetta og astaedan er almenn: handskrifadur
   verdict rekur fra sinni eigin skra um leid og tolurnar breytast.
   Skilyrdin her eru thau sem brefid setti:
     1. deltaPct > 0 og pctOfGapClosed > incumbent
     2. walk-forward > placebo-thakid a walk-forward
     3. besta holf > placebo-thakid a deltaPct
     4. PER-LEIKMANNS vikmork utiloka null (thau RADA, sja 4c)
   ============================================================ */
function buildVerdict(o) {
  const lines = [];
  const perFormat = {};
  let anyPass = 0, weakInstrument = 0;
  for (const fmt of FORMATS) {
    const res = o.results[fmt], plc = o.placebo[fmt], inc = o.incumbent[fmt];
    if (!res || !plc) continue;
    const real = Object.values(res).filter((r) => !r.placebo);
    const pass = real.filter((r) => r.best.deltaPct > 0 &&
      r.best.deltaPct > plc.maxDeltaPct &&
      r.walkForward.mean > plc.maxWalkForward &&
      r.best.bootPlayer && r.best.bootPlayer.excludesZero);
    const beatsIncumbent = real.filter((r) => r.best.pctOfGapClosed > inc.pctOfGapClosed);
    const sigPlayerOnly = real.filter((r) => r.best.bootPlayer &&
      r.best.bootPlayer.excludesZero && r.best.deltaPct > 0);
    const sigSeasonOnly = real.filter((r) => r.best.bootSeason &&
      r.best.bootSeason.excludesZero && r.best.deltaPct > 0);
    const best = real.slice().sort((a, b) => b.best.deltaPct - a.best.deltaPct)[0];
    const ownCi = o.anchors[`incumbentOwnPerPlayerCI_${fmt}`];
    const incPasses = !!(ownCi && ownCi.bootPlayer && ownCi.bootPlayer.excludesZero);
    if (!incPasses) weakInstrument++;
    anyPass += pass.length;
    perFormat[fmt] = {
      incumbentPctOfGapClosed: inc.pctOfGapClosed,
      cells: real.length,
      cellsRawPositive: real.filter((r) => r.best.deltaPct > 0).length,
      cellsAbovePlaceboCeiling: real.filter((r) => r.best.deltaPct > plc.maxDeltaPct).length,
      cellsSignificantBySeason: sigSeasonOnly.length,
      cellsSignificantByPlayer: sigPlayerOnly.length,
      cellsPassingAll: pass.length,
      passing: pass.map((r) => ({ term: r.term, scope: r.scope, w: r.best.w,
        deltaPct: r.best.deltaPct, pctOfGapClosed: r.best.pctOfGapClosed,
        walkForward: r.walkForward.mean })),
      bestRawCell: best ? { term: best.term, scope: best.scope, w: best.best.w,
        deltaPct: best.best.deltaPct, pctOfGapClosed: best.best.pctOfGapClosed,
        walkForward: best.walkForward.mean } : null,
      cellsBeatingIncumbentRaw: beatsIncumbent.length,
      placeboCeilingDeltaPct: plc.maxDeltaPct,
      placeboCeilingWalkForward: plc.maxWalkForward,
      maeBetterDecisionWorse: o.maeVsDecision[fmt].real.maeBetterDecisionWorse,
      incumbentOwnPerPlayerCiExcludesZero: incPasses,
      oraclePerPlayerCiExcludesZero: !!(o.anchors[`oracle_${fmt}`] &&
        o.anchors[`oracle_${fmt}`].bootPlayer &&
        o.anchors[`oracle_${fmt}`].bootPlayer.excludesZero),
    };
    lines.push(`${fmt}: incumbent ${inc.pctOfGapClosed}% · ` +
      `${perFormat[fmt].cellsRawPositive}/${real.length} holf jakvaed hrat · ` +
      `${perFormat[fmt].cellsAbovePlaceboCeiling} yfir placebo-thakinu · ` +
      `${sigSeasonOnly.length} marktaek klosud eftir TIMABILI · ` +
      `${sigPlayerOnly.length} klosud PER LEIKMANN · ` +
      `${pass.length} standast OLL fjogur skilyrdin`);
    lines.push(`${fmt}: placebo-thak deltaPct ${plc.maxDeltaPct} · walk-forward ` +
      `${plc.maxWalkForward} · placebo-holf sem "standast" per leikmann ` +
      `${plc.significantByPlayer}`);
    if (best) {
      lines.push(`${fmt}: haesta hra holf er ${best.term}/${best.scope} w=${best.best.w} ` +
        `-> deltaPct ${best.best.deltaPct} (pctOfGap ${best.best.pctOfGapClosed}, ` +
        `wf ${best.walkForward.mean})`);
    }
    lines.push(`${fmt}: STYRKUR — incumbent (${inc.pctOfGapClosed}%) utilokar null per ` +
      `leikmann: ${incPasses} · orakel: ` +
      `${perFormat[fmt].oraclePerPlayerCiExcludesZero}`);
  }
  /* ---------- SAMKVAEMNI YFIR SNIDIN ----------
     README 4a setur throskuldinn: "0 af 36 samsetningum jakvaedar i ollum
     10 holfum". Sami maelikvardi her — holf sem er jakvaett i EINU snidi og
     negatift i odru er ekki merki, thad er val a snidi. Vogin verdur lika
     ad hafa SAMA FORMERKI, annars er "sama holf" tvaer gagnstaedar
     tilgatur sem badar heita eins.                                     */
  const first = o.results[FORMATS[0]] || {};
  const consistency = [];
  for (const k of Object.keys(first)) {
    if (first[k].placebo) continue;
    const rows = FORMATS.map((f) => (o.results[f] || {})[k]);
    if (rows.some((r) => !r)) continue;
    const deltas = rows.map((r) => r.best.deltaPct);
    const wfs = rows.map((r) => r.walkForward.mean);
    consistency.push({
      cell: k, deltas, wfs,
      minDelta: r3(Math.min(...deltas)), minWalkForward: r3(Math.min(...wfs)),
      weights: rows.map((r) => r.best.w),
      positiveInAll: deltas.every((d) => d > 0),
      aboveCeilingInAll: rows.every((r, i) => r.best.deltaPct > o.placebo[FORMATS[i]].maxDeltaPct),
      wfPositiveInAll: wfs.every((v) => v > 0),
      sameWeightSign: new Set(rows.map((r) => Math.sign(r.best.w))).size === 1,
      perPlayerCiExcludesZeroInAll: rows.every((r) => r.best.bootPlayer &&
        r.best.bootPlayer.excludesZero),
    });
  }
  consistency.sort((a, b) => b.minDelta - a.minDelta);
  const consPos = consistency.filter((c) => c.positiveInAll && c.sameWeightSign);
  const consCeil = consistency.filter((c) => c.aboveCeilingInAll && c.sameWeightSign);
  lines.push(`SAMKVAEMNI yfir thrju snid (${consistency.length} holf): ` +
    `${consPos.length} jakvaed i OLLUM thremur med sama formerki a w · ` +
    `${consCeil.length} yfir placebo-thakinu i ollum thremur · ` +
    `${consistency.filter((c) => c.perPlayerCiExcludesZeroInAll).length} med per-leikmanns ` +
    "vikmork sem utiloka null i ollum thremur");
  if (consPos.length) {
    const b = consPos[0];
    lines.push(`SAMKVAEMNI: sterkasta samkvaema holfid er ${b.cell} (w ` +
      `${b.weights.join("/")}) -> deltaPct ${b.deltas.join(" / ")}, laegsta ${b.minDelta}`);
  }

  const decision = anyPass > 0 ? "CANDIDATE" : "FELLUR";
  lines.push(decision === "FELLUR"
    ? "NIDURSTADA: FELLUR — nulltilgatan `weeklyProjection` obreytt stendur i ollum " +
      "thremur snidum. Ekkert holf slaer BADE placebo-thakid og per-leikmanns vikmorkin."
    : `NIDURSTADA: ${anyPass} holf stodust oll fjogur skilyrdin — FRAMBJODANDI, ` +
      "ekki breyting. Ekkert er tengt i src/ a thessari maelingu.");
  if (weakInstrument) {
    lines.push(`VARNAGLI: i ${weakInstrument} af ${FORMATS.length} snidum utilokar ` +
      "INCUMBENT SJALFUR ekki null i per-leikmanns vikmorkum. Urslitaprofid er thvi " +
      "strangara en hrifin sem verid er ad sla, og hofnunin hvilir a PLACEBO-THAKINU " +
      "(sem orakel-akkerid sannar ad se raunverulegur throskuldur, ekki golf).");
  }
  return { decision, anyPass, formatsWhereIncumbentFailsOwnTest: weakInstrument,
    perFormat, crossFormat: { cells: consistency.length,
      positiveInAllWithSameWeightSign: consPos.length,
      abovePlaceboCeilingInAll: consCeil.length,
      perPlayerCiExcludesZeroInAll:
        consistency.filter((c) => c.perPlayerCiExcludesZeroInAll).length,
      ranked: consistency },
    lines,
    criteria: ["deltaPct > 0", "deltaPct > placebo ceiling",
      "walk-forward > placebo walk-forward ceiling",
      "per-PLAYER bootstrap CI excludes zero (it rules — README 4c)"],
    note: "NOTHING IS WIRED INTO src/ ON THIS EVIDENCE. The null hypothesis is " +
      "weeklyProjection unchanged, and it wins unless the per-player CI excludes it." };
}

main().catch((e) => { console.error(e); process.exit(1); });
