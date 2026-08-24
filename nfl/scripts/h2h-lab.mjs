#!/usr/bin/env node
/* ============================================================
   h2h-lab.mjs — FANTASY VINNST EKKI A STIGUM HELDUR A VIKUM

     node scripts/h2h-lab.mjs [--runs=10] [--sruns=4] [--boot=2000]
                              [--from=2019]

   SJALFGEFNU GILDIN ERU THAU SEM BOKUDU TOLURNAR VORU MAELDAR MED,
   svo kall an vidfanga endurgeri skrana upp a stafi. `provenance`
   segir hvort gildi kom ur vidfangi eda sjalfgefid — sja lib/provenance.mjs
   um skrana sem sagdi `mean: 59,9` og var i raun onnur keyrsla.

   -> data/measure/h2h.json

   ============================================================
   HVERS VEGNA THETTA VANTADI — OG HVERS VEGNA THAD ER STAERSTA
   OMAELDA SPURNINGIN I VERKEFNINU
   ============================================================
   HVER EINASTA nidurstada i thessu repo-i er maeld i STIGUM:
   A-Ranking slaer ADP um +233,6 stig (`model_eval_ppr.json`), "WR
   fyrst" slaer BPA um +23,5 stig (`strategy_ppr.json`), bye-vogin
   gefur +28 stig. Fantasy vinnst ekki a stigum. Hun vinnst a
   VIKULEGUM VIDUREIGNUM og a urslitakeppni i vikum 15-17.

   BORD SEM SKORAR MEIRA GETUR TAPAD FLEIRI VIKUM — 2.000 stig sem
   koma i thremur 200-stiga vikum og ellefu 130-stiga vikum er verri
   deildarutkoma en 1.950 stig sem koma jafnt. Og ekkert i repo-inu
   hefdi tekid eftir thvi, thvi ENGIN maeling her hafdi motherja i
   viku.

   THESSI SKRIFTA TENGIR EKKERT INN I `src/`. Hun er MAELING og hun
   skrifar EINA skra.

   ============================================================
   REGLURNAR ERU LESNAR, EKKI VALDAR
   ============================================================
   Baðar deildir notandans svara Sleeper med `playoff_week_start: 15`
   og `playoff_teams: 6` (raunsvor, ordrett i `tests/standings.mjs`),
   og `fpts` i sama svari er sannanlega vikur 1-14 EINGONGU: rostur 1
   i Patriots 2025 ber 1815,34 en summa vikna 1-17 er 2268,18.

   Thess vegna: REGLULEGT TIMABIL = VIKUR 1-14, URSLITAKEPPNI = 15-17,
   SEX LID KOMAST INN. Engin af thessum thremur tolum er valin her.

   LOGUNIN sjalf (lid, byrjunarlid, umferdir) er NAKVAEMLEGA su sama og
   `half-lab`, `opp-lab`, `vbdbase-lab` og `waiver-lab` bera — og
   varamanns-threpid er BORID VID `data/measure/waiver.json`, sem
   thegar ber thad fyrir somu logunarheiti. Se thad ekki eins deyr
   skriftan: tvaer maelingar sem heita sama nafni og maela sitthvora
   deild eru verri en ein.

   ============================================================
   NULLPROFID ER HLID, EKKI SKRAUT
   ============================================================
   Bord sem spilar gegn SJALFU SER verdur ad gefa NAKVAEMLEGA 50%.
   Faest thad ekki er herminn bilaður og hver einasta tala undir honum
   merkingarlaus — tha er thad tilkynnt og keyrslan STOPPAR.

   OG THAD ER SAGT BERUM ORDUM HVERNIG NULLID ER FENGID: spegluninni
   (medferd i saeti A og vidmid i B, sidan vidmid i A og medferd i B)
   er BEINLINIS aetlad ad gera thad nakvaemt. Nullprofid er thvi
   NAKVAEMT AD BYGGINGU og thad ver ARM-bokhaldid — ekki
   SAETIS-skekkju, thvi armarnir skiptast a saetum. Thess vegna eru
   thrju onnur hlid:

     N2  BOKHALDID: sigrar = tôp i hverri deild, hvert lid spilar
         nakvaemlega 14 leiki, hver vika er fullkomin porun, og
         nakvaemlega EINN meistari.
     N3  SAETIS-DREIFINGIN OSPEGLUD: hve mikid munar a saetum thegar
         allir drafta eftir SAMA bordi. Su tala er astaedan fyrir
         spegluninni og hun er BIRT, ekki felld.
     N4  AKKERI I BADA ENDA: orakel-bord (raunstig timabilsins) verdur
         ad slá A-Ranking i SIGRUM, og andhverft ADP verdur ad tapa
         stort. "Pipan virkar" er sannad ur badum endum eda ekki.

   ============================================================
   BYRJUNARLID VIKUNNAR — BADAR LEIDIR, OG THAD ER EKKI VARFAERNI
   ============================================================
   README 5m: vikuleg talning sem velur byrjunarlid med FULLKOMINNI
   vitneskju um vikuna VERDLAUNAR SVEIFLU (0-0-40 kemst i lidid
   nakvaemlega thá viku sem hann skorar 40). Nidurstada sem stenst
   adeins thar er artefakt.

   Thess vegna er hver headline-fruma skoruð TVISVAR a SAMA DRAFTI:
     · `oracleLineup` — byrjunarlid valid af raunstigum vikunnar
     · `wfLineup`     — byrjunarlid valid af GANGANDI spa (vikur < w),
                        hrist ppg med k=4, skorad a raunstigum
   Baðar nota SAMA `startersRaw` i `src/accuracy.js`, svo thetta er
   ekki tvaer utfaerslur heldur eitt inntak i eina.

   ============================================================
   Q3 — BJARGAR SIGRA-MAELIKVARDINN HOFNUDU HUGMYNDINNI?
   ============================================================
   Q1 og Q2 spyrja hvort BOKUDU nidurstodurnar haldi i sigrum. Q3 spyr
   hins vegar hvort maelikvardinn BJARGI einhverju sem var HAFNAD a
   stigum. Eini frambjodandinn sem er nogu naerri morkunum til ad thad
   se ekki fyrirfram vitad er `prevCarG` (hlaup per leik, fyrra
   timabil) ur `opp-lab.mjs` — README 4d: +23,8 stig, t=2,286, 8/11 ar,
   en placebo-thakid var +21,3 svo hun slapp yfir um +2,5 EIN.

   THAD SEM ER PORTAD ER PLACEBO-FJOLSKYLDAN, EKKI BARA BREYTAN.
   `startersPoints` er graeðug best-ball rodun, svo HVER SEM ER
   truflun a stodu-blondu grunnbordsins getur lesid jakvaett. An
   nulldreifingar ur akvednu sudi er taflan olæsileg — thad stendur
   ordrett i `opp-lab.mjs` og i README 4d, og thad gildir NAKVAEMLEGA
   eins um sigra og um stig. Atta placeboar, sama deterministiska sudid,
   sama grid, sami walk-forward.

   TVEIR MAELIKVARDAR UR SOMU DROFTUM. Hver Q3-fruma skilar BAEDI
   sigra-mun OG stiga-mun (`seasonDiff`) ur NAKVAEMLEGA sama drafti, svo
   "bjargar sigra-maelikvardinn henni?" er PORUD spurning en ekki
   samanburdur a tveimur maelingum sem voru gerdar i sitthvorum heimi.
   ============================================================
   THAD SEM ER OMAELT HER OG HVERS VEGNA (sja `unmeasured`)
   ============================================================
   · WAIVER OG SKIPTI. Hoparnir eru fastir allt timabilid. `waiver-lab`
     maelir waiver-regluna og ad blanda thvi saman vid thetta vaeri ad
     maela tvennt i einu. Afleidingin er skrád: meiddur madur er 0 stig
     i 10 vikur og enginn getur skipt honum ut.
   · K OG DST. Utan draftsins (`excludePos`) og thvi TOM saeti hja
     OLLUM lidum i 10-lida deildinni — thau fella ut ur hverjum mun.
     `data/weekly/` ber enga DST yfirleitt.
   · SKRA-STYRKUR. Umferdaskrain er hringadferd med slembadri
     umferdarod, ekki deildir og ekki raunveruleg Sleeper-skra.
     Spegluninni er aetlad ad fella thad ut.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { simulateDraft, scoreLeague, roundRobin, startersPoints,
         DEFAULT_LEAGUE } from "../src/accuracy.js";
import { replacementRanks } from "../src/model.js";
import { mean, bootstrapDiff, spearman } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";
import { loadTeModels, TE_GRID, TE_SHIPPED, teKey } from "./lib/te-sweep.mjs";

const DATA = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2), {
  runs: "number", sruns: "number", boot: "number", from: "number",
  q3runs: "number", pboot: "number", q3var: "string", extra: "string",
  out: "string",
});
const DEFAULTS = { runs: 10, sruns: 4, boot: 2000, from: 2019,
                   q3runs: 2, pboot: 200, q3var: "prevCarG", extra: null,
                   out: "h2h.json" };
const RUNS  = Number(ARG.runs  ?? DEFAULTS.runs);    // fraekorn per (ar, fruma)
const SRUNS = Number(ARG.sruns ?? DEFAULTS.sruns);   // fraekorn i stefnu-toflunni
const BOOT  = Number(ARG.boot  ?? DEFAULTS.boot);
const FROM  = Number(ARG.from  ?? DEFAULTS.from);
const Q3RUNS = Number(ARG.q3runs ?? DEFAULTS.q3runs); // fraekorn per Q3-reit
const PBOOT  = Number(ARG.pboot  ?? DEFAULTS.pboot);  // per-leikmanns bootstrap
/* ============================================================
   --q3var / --extra — SAMA Q3-NET, ONNUR BREYTA (24.8.2026)
   ============================================================
   Q3 var byggt til ad spyrja "bjargar sigra-maelikvardinn hugmynd sem
   FELL a stigum?" og svarid fyrir `prevCarG` var nei. Spurningin um
   markadinn og serfraedingana er NAKVAEMLEGA sama spurning med annarri
   breytu, svo netid er obreytt og adeins breytan er skipt ut.

   `--q3var=<lykill>`  hvad er maelt (sjalfgefid `prevCarG`, bokada
                       talan i README 4d/5n — su keyrsla ma ekki
                       thurfa vidfang til ad endurtakast).
   `--extra=<skra>`    les `data/measure/<skra>` (bygging
                       `build-extra-features.mjs`) svo breytur sem eru
                       EKKI i `features.json` seu taekar.
   `--out=<skra>`      skrifar annad en `h2h.json` svo ny keyrsla eydi
                       ekki bokudu maelingunni.                        */
const Q3VAR = String(ARG.q3var ?? DEFAULTS.q3var);
const EXTRA_FILE = ARG.extra ? String(ARG.extra) : null;
const OUT_FILE = String(ARG.out ?? DEFAULTS.out);
let EXTRA = null, EXTRA_META = null;

/* ============================================================
   `--tesweep` — SVEIPUR A `FLEX_SPLIT.TE`, MAELDUR I SIGRUM
   ============================================================
   `vbdbase-lab --tesweep` maelir sama sveip i STIGUM. Thessi maelir
   hann i SIGRUM, og astaedan er sú sem thetta lab var skrifad ut a:
   bord sem skorar meira getur tapad fleiri vikum. Stig og sigrar
   fylgjast ad um 0,961-0,989 i bokudu tolunum, svo VAENTINGIN ER
   SAMHLJODA — og se hun ekki thad er thad merki um mælitækid, ekki
   uppgotvun (README 5n).

   NULLHLIDID ER HER NAKVAEMT AD BYGGINGU OG THVI HART: `arankBoard`
   faer varamanns-threpin sem VIDFANG, svo te = 0,193 UR PATCHADA
   AFRITINU verdur ad gefa NAKVAEMLEGA sama bord og sendi kodinn — og
   thvi NULL i sigrum, stigum og titlum. Se thad ekki 0 er patch-leidin
   ad maela annan heim og keyrslan DEYR.

   Sveipurinn keyrir EFTIR ollum fjorum nullhlidunum (N1-N4) og skrifar
   SINA EIGIN skra. `h2h.json` er thvi obreytt — bokud Q1/Q2/Q3-tala
   getur ekki haggast af thvi ad thetta flagg var til.
   ============================================================ */
if (ARG.tesweep !== undefined && ARG.tesweep !== true && ARG.tesweep !== "1") {
  console.error(`\n  --tesweep tekur ekkert gildi (eda =1), fekk ` +
    `${JSON.stringify(ARG.tesweep)}\n`);
  process.exit(2);
}
const TESWEEP = ARG.tesweep !== undefined;
const TERUNS = Number(ARG.teruns ?? 6);     // fraekorn per (ar, te-gildi)
const TEPBOOT = Number(ARG.tepboot ?? 120); // per-leikmanns itranir, 0 = sleppa

const REG_WEEKS = 14;                  // MAELT: `fpts` = vikur 1-14
const PO_WEEKS = [15, 16, 17];         // MAELT: playoff_week_start = 15
const PO_TEAMS = 6;                    // MAELT: playoff_teams = 6
const KPRIOR = 4;                      // sama hrista og waiver-lab

const POSES = ["QB", "RB", "WR", "TE"];
const r1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const sgn = (x, d = 2) => (x == null ? "-" : `${x > 0 ? "+" : ""}${x.toFixed(d)}`);

/* Fraekorn: LCG, sama utfaersla og i `waiver-lab`/`half-lab`/`bye-lab`
   svo havadinn se sambaerilegur milli maelinga. */
function rngOf(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const gaussOf = (rnd) => () => {
  const u = Math.max(1e-9, rnd()), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/* Pardur t yfir timabil — klasarnir eru ARIN, eins og annars stadar. */
function tOf(a) {
  const v = a.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
}

/* ============================================================
   1. LOGUNIN — RAUNVERULEGU DEILDIRNAR OG SU ALMENNA
   ============================================================
   Fyrstu tvaer eru deildirnar sem notandinn spilar i. Su thridja er
   `DEFAULT_LEAGUE` — logunin sem ALLT annad i verkefninu var maelt i,
   thar med talið +233,6 og stefnutaflan. An hennar vaeri thetta ekki
   endurmaeling a bokudu tolunum heldur maeling a annarri deild.       */
const SHAPES = [
  { key: "10-2flex", fmt: "ppr", label: "10 lid, 2 FLEX, PPR (Patriots)",
    league: { teams: 10, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 15,
              flexPos: ["RB", "WR", "TE"], superflex: false,
              excludePos: ["K", "DST"] } },
  { key: "12-2flex", fmt: "half", label: "12 lid, 2 FLEX, half-PPR (Sofahetjur)",
    league: { teams: 12, starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
              maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 }, rounds: 14,
              flexPos: ["RB", "WR", "TE"], superflex: false,
              excludePos: ["K", "DST"] } },
  { key: "12-1flex", fmt: "ppr", label: "12 lid, 1 FLEX, WR3, PPR (almenna lognin)",
    league: { ...DEFAULT_LEAGUE, teams: 12, rounds: 14 } },
];

/* HALF-PPR BER ENGA SOGULEGA ADP (half-lab). Thess vegna er
   markadsbordid maelt med BADUM sem vikmork thar sem thad er
   headline-talan, og adeins ppr-ADP thar sem taflan er stor. */
const ADP_SRC = { ppr: ["adpPpr"], half: ["adpPpr", "adpStd"], standard: ["adpStd"] };

/* ============================================================
   2. GOGNIN — LAUG UR VIKUSKRANUM, EKKI UR `features` EINGONGU
   ============================================================
   `features.json` ber 145-204 leikmenn a timabili en 12x14 draft tharf
   168 og 10x15 tharf 150. Vaeri laugin `features` eingongu myndu hopar
   verda TOMIR i sidustu umferdunum og tomt byrjunarlids-saeti gefur 0
   stig — havadi sem litur ut eins og utkoma. Sama lausn og
   `waiver-lab` skjalar: laugin er ALLIR sem eiga vikugogn og TAGLID a
   bordinu er radad eftir GANGANDI forgildi.

   FORGILDID SER ALDREI FRAMTIDINA:
     · spa arsins / leikir arsins   (thegar hun er til)
     · annars stig FYRRA timabils / 17 (per LEIK LIDSINS, svo meiddur
       madur se rettilega odyr)
     · nylidi an fyrra timabils: stodu-golf reiknad AF FYRRI ARUM
       EINGONGU. 2019 hefur engin fyrri vikugogn og thad er SAGT.      */
async function loadInputs() {
  const weekly = {}, seasons = [];
  for (let y = 2018; y <= 2025; y++) {
    try {
      weekly[y] = JSON.parse(await readFile(path.join(DATA, "weekly", `${y}.json`), "utf8"));
      if (y >= FROM) seasons.push(y);
    } catch { /* vantar -> sest i `seasons` */ }
  }
  const feats = JSON.parse(await readFile(path.join(DATA, "features.json"), "utf8"));
  let waiverDesign = null;
  try {
    waiverDesign = JSON.parse(await readFile(path.join(DATA, "measure", "waiver.json"), "utf8"));
  } catch { /* ekki til -> vordurinn segir thad */ }
  return { weekly, seasons, feats, waiverDesign };
}

const ptsOf = (row, fmt) => (fmt === "ppr" ? row.ppr : fmt === "half" ? row.half : row.std);
const gamesInSeason = (y) => (y <= 2020 ? 16 : 17);
const MAXW = 18;

function buildWorld(y, weekly, featIdx) {
  const rows = weekly[y], prev = weekly[y - 1] || null;

  /* --- leikmenn --- */
  const idx = new Map(), P = [];
  for (const r of rows) {
    if (!POSES.includes(r.pos)) continue;         // K utan (excludePos), engin DST i gognunum
    if (!idx.has(r.id)) { idx.set(r.id, P.length); P.push({ id: r.id, name: r.name, pos: r.pos }); }
  }
  const N = P.length;

  /* --- raunstig per viku, per snid --- */
  const FMTS = ["ppr", "half", "standard"];
  const byWeek = {}, totAll = {}, tot14 = {};
  for (const fmt of FMTS) {
    byWeek[fmt] = new Map();
    totAll[fmt] = new Float64Array(N);
    tot14[fmt] = new Float64Array(N);
  }
  for (const r of rows) {
    const i = idx.get(r.id);
    if (i == null || r.week > MAXW) continue;
    for (const fmt of FMTS) {
      const v = ptsOf(r, fmt);
      if (v == null) continue;
      byWeek[fmt].set(`${r.id}|${r.week}`, { pos: r.pos, pts: v });
      totAll[fmt][i] += v;
      if (r.week <= REG_WEEKS) tot14[fmt][i] += v;
    }
  }

  /* --- fyrra timabil og nylida-golf, BADI AF FYRRI ARUM EINGONGU --- */
  const prevPts = new Map();
  if (prev) for (const r of prev) {
    const v = ptsOf(r, "ppr");
    if (v != null) prevPts.set(r.id, (prevPts.get(r.id) || 0) + v);
  }
  const rookieFloor = {};
  for (const pos of POSES) {
    const vals = [];
    for (let py = 2019; py < y; py++) {
      const pr = weekly[py], pp = weekly[py - 1];
      if (!pr) continue;
      const had = new Set(pp ? pp.map((r) => r.id) : []);
      const tot = new Map();
      for (const r of pr) {
        if (r.pos !== pos || had.has(r.id)) continue;
        const v = ptsOf(r, "ppr");
        if (v != null) tot.set(r.id, (tot.get(r.id) || 0) + v);
      }
      for (const v of tot.values()) vals.push(v / 17);
    }
    rookieFloor[pos] = vals.length ? mean(vals) : 0;
  }

  /* --- forgildi, spa og ADP --- */
  const prior = new Float64Array(N);
  const priorFrom = new Array(N).fill("rookieFloor");
  const proj = { ppr: new Array(N).fill(null), half: new Array(N).fill(null),
                 standard: new Array(N).fill(null) };
  const adp = { adpPpr: new Array(N).fill(null), adpStd: new Array(N).fill(null) };
  const adpSd = new Array(N).fill(null);
  let projected = 0, withAdp = 0;
  for (let i = 0; i < N; i++) {
    const a = featIdx.get(`${y}|${P[i].id}|ppr`);
    const b = featIdx.get(`${y}|${P[i].id}|standard`);
    /* Spa: Sleeper thar sem hun er til, annars FFToday — sama rod og
       `half-lab`. HALF er ALGEBRA, ekki interpolun: half = std +
       mottokur/2 = (ppr + std)/2, upp a stig. */
    const pj = a ? (a.sleeperProj != null ? a.sleeperProj : a.ffProj) : null;
    const sj = b ? (b.sleeperProj != null ? b.sleeperProj : b.ffProj) : null;
    proj.ppr[i] = pj ?? null;
    proj.standard[i] = sj ?? null;
    proj.half[i] = pj != null && sj != null ? (pj + sj) / 2 : (pj ?? null);
    if (a && a.adp != null) { adp.adpPpr[i] = a.adp; adpSd[i] = a.adpSd ?? null; }
    if (b && b.adp != null) adp.adpStd[i] = b.adp;
    if (adp.adpPpr[i] != null || adp.adpStd[i] != null) withAdp++;

    if (proj.ppr[i] != null) { prior[i] = proj.ppr[i] / gamesInSeason(y); priorFrom[i] = "projection"; projected++; }
    else if (prevPts.has(P[i].id)) { prior[i] = prevPts.get(P[i].id) / 17; priorFrom[i] = "prevSeason"; }
    else prior[i] = rookieFloor[P[i].pos] || 0;
  }

  /* --- GANGANDI ppg fyrir naemnisprofid a byrjunarlidinu ---
     `wf[fmt]` er kort `${id}|${w}` -> hrist ppg ur vikum < w. Talningin
     er VIKUR SEM LIDNAR ERU, ekki leikir sem hann spiladi: aud vika er
     tha 0 stig, sem er nakvaemlega thad sem gerdist. Einfoldun gagnvart
     `waiver-lab` (sem telur leiki lidsins) og hun gildir EINS um bada
     arma, svo hun getur ekki halað hvorugum.                          */
  const wf = {};
  for (const fmt of FMTS) {
    const m = new Map();
    const cum = new Float64Array(N);
    for (let w = 1; w <= MAXW; w++) {
      for (let i = 0; i < N; i++) {
        m.set(`${P[i].id}|${w}`, (KPRIOR * prior[i] + cum[i]) / (KPRIOR + (w - 1)));
      }
      for (let i = 0; i < N; i++) {
        const r = byWeek[fmt].get(`${P[i].id}|${w}`);
        if (r) cum[i] += r.pts;
      }
    }
    wf[fmt] = m;
  }

  /* --- timabils-kort sem bordin og stodu-thakid lesa --- */
  const actual = {}, actual14 = {};
  for (const fmt of FMTS) {
    actual[fmt] = new Map(P.map((p, i) => [p.id, { pos: p.pos, pts: totAll[fmt][i] }]));
    actual14[fmt] = new Map(P.map((p, i) => [p.id, { pos: p.pos, pts: tot14[fmt][i] }]));
  }

  /* --- Q3-BREYTURNAR: `Q3_VAR` OG PLACEBOARNIR ---
     Maelda breytan er stigagjafar-obundin (hun er tolfraedi FYRRA
     timabils, eda lidseinkunn) og er thvi tekin ur ppr-rodinni —
     nakvaemlega eins og `opp-lab` gerir. Placeboarnir eru
     deterministiskt suð ur (id, timabil, fraekorn) og hafa thvi FULLA
     thekju medan raunbreytan hefur ~88-99%.
     Su osamhverfa er ARFUR UR `opp-lab` og er hoggvin i stein her:
     thettari truflun getur adeins gert placebo-thakid HAERRA, sem er
     rett attin — hun gerir throskuldinn fyrir raunverulegu breytuna
     erfidari, ekki audveldari. `coverage[Q3_VAR]` ber toluna.        */
  const feat = new Map();
  let carRows = 0, carHead = 0;
  for (let i = 0; i < N; i++) {
    const a = featIdx.get(`${y}|${P[i].id}|ppr`);
    /* Breytan er leitud FYRST i `features.json` og sidan i
       `--extra`-skranni. Rodin er asett: se sami lykill i badum a
       bokada heimildin ad vinna, annars gaeti ny skra breytt bokudu
       tolu thegjandi. */
    const x = EXTRA ? EXTRA.get(`${P[i].id}|${y}`) : null;
    let v = a && a[Q3_VAR] != null ? a[Q3_VAR] : null;
    if (v == null && x && x[Q3_VAR] != null) v = x[Q3_VAR];
    const f = { [Q3_VAR]: v };
    for (let k = 1; k <= 8; k++) f[`placebo${k}`] = placeboValue(P[i].id, y, k);
    feat.set(P[i].id, f);
    if (f[Q3_VAR] != null) { carRows++; if (proj.ppr[i] != null) carHead++; }
  }

  return { y, N, P, idx, prior, priorFrom, proj, adp, adpSd, byWeek, wf,
           actual, actual14, totAll, tot14, feat,
           coverage: { players: N, projected, withAdp,
                       /* Lyklarnir heita `prevCarG*` thegar breytan ER
                          `prevCarG` — bokada skrain ma ekki breyta
                          formi. Annars bera their nafn breytunnar. */
                       [Q3_VAR]: carRows, [`${Q3_VAR}InHead`]: carHead,
                       q3Var: Q3_VAR,
                       priorSource: prev ? "prevSeason+projection" : "projection only (engin fyrri vikugogn)" } };
}

/* ============================================================
   3. BORDIN
   ============================================================ */

/** A-RANKING: spa -> virdi yfir varamanni. Taglid radast eftir forgildi. */
function arankBoard(W, fmt, repl) {
  const byPos = {};
  for (let i = 0; i < W.N; i++) {
    const v = W.proj[fmt][i];
    if (v == null) continue;
    (byPos[W.P[i].pos] = byPos[W.P[i].pos] || []).push(v);
  }
  const base = {};
  for (const [pos, vals] of Object.entries(byPos)) {
    vals.sort((a, b) => b - a);
    const k = Math.min(vals.length - 1, (repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    base[pos] = around.length ? mean(around) : 0;
  }
  const scored = [];
  for (let i = 0; i < W.N; i++) {
    const v = W.proj[fmt][i];
    /* TAGLID: -1e5 + forgildi. Alltaf undir theim sem hafa spa, en
       radad innbyrdis eftir thvi sem vid VITUM a draft-degi. */
    scored.push([W.P[i].id, v != null ? v - (base[W.P[i].pos] ?? 0) : -1e5 + W.prior[i]]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** HRA SPA-ROD — engin umreikningur i VBD. Bokad forskot: +74,7 stig. */
function projBoard(W, fmt) {
  const scored = [];
  for (let i = 0; i < W.N; i++) {
    const v = W.proj[fmt][i];
    scored.push([W.P[i].id, v != null ? v : -1e5 + W.prior[i]]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** MARKADURINN: ADP. `noise=true` gefur eitt drátt af herberginu. */
function adpBoard(W, src, rnd = null) {
  const gauss = rnd ? gaussOf(rnd) : null;
  let maxAdp = 0;
  for (let i = 0; i < W.N; i++) if (W.adp[src][i] != null) maxAdp = Math.max(maxAdp, W.adp[src][i]);
  const scored = [];
  for (let i = 0; i < W.N; i++) {
    const a = W.adp[src][i];
    if (a != null) {
      /* Dreifingin er MAELD per leikmann (`adpSd` ur FFC). Vanti hana
         er 1,08*sqrt(adp) notad — sama varaleid og `bye-lab`. */
      const sd = W.adpSd[i] > 0 ? W.adpSd[i] : 1.08 * Math.sqrt(Math.max(1, a));
      scored.push([W.P[i].id, gauss ? a + gauss() * sd : a]);
    } else {
      /* Sa sem ADP-listinn ber ekki er DRAFTADUR SIDAST, i forgildisrod. */
      scored.push([W.P[i].id, maxAdp + 1 + Math.max(0, 60 - W.prior[i]) * 5]);
    }
  }
  scored.sort((a, b) => a[1] - b[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** ORAKEL: raunstig timabilsins. EFRA AKKERID — verdur ad vinna stort. */
function oracleBoard(W, fmt) {
  const scored = W.P.map((p, i) => [p.id, W.totAll[fmt][i]]);
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/** ANDHVERFT ADP. NEDRA AKKERID — verdur ad tapa stort. */
function reverseBoard(W, src) {
  const keys = [...adpBoard(W, src).keys()].reverse();
  return new Map(keys.map((k, i) => [k, i + 1]));
}

/* ============================================================
   3b. Q3-VELIN — TRUFLUD A-RANKING OG PLACEBO-FJOLSKYLDAN
   ============================================================
   Allt her ad nedan er PORTAD UR `opp-lab.mjs` og engu er breytt sem
   getur haggad tolunum: `placeboValue`, `zWithinPos`, vogar-gridid og
   svidin eru ordrett thau somu. Thad sem ER annad er MAELIKVARDINN
   (sigrar i stad stiga) og herminn (deildarhermir i stad tveggja
   lida) — og thad er nakvaemlega spurningin sem er verid ad spyrja.  */

/** Deterministiskt suð ur (id, timabil, fraekorn) — engin slembivél.
    ORDRETT ur `opp-lab.mjs`; se thessu breytt er nulldreifingin
    her ekki lengur sama nulldreifing og thar. */
function placeboValue(id, season, seed) {
  let h = (2166136261 ^ seed * 16777619) >>> 0;
  const s = `${id}|${season}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const u = ((h >>> 8) & 0xffff) / 65536, v = (h & 0xff) / 256;
  return u + v - 1;
}

const Q3_PLACEBOS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `placebo${i}`);
const Q3_VAR = Q3VAR;
const Q3_VARS = [Q3_VAR, ...Q3_PLACEBOS];

/* Vogar-gridid er ORDRETT gridid i `opp-lab`: tvihlida, -0,10 til
   +0,10 i tiu threpum. Tvihlida er ASETT — einhlida grid GEFUR SER
   attina ("meira taekifaeri er betra") og thad er akkurat thad sem
   `feature-probe` gat ekki stadfest. */
const Q3_WEIGHTS = [-0.10, -0.08, -0.06, -0.04, -0.02, 0,
                    0.02, 0.04, 0.06, 0.08, 0.10];
const Q3_NONZERO = Q3_WEIGHTS.filter((w) => w !== 0);
const Q3_MAGS = [0.02, 0.04, 0.06, 0.08, 0.10];
/* Svidin: `top50` er ~fjorar fyrstu umferdir i 12-lida deild, thar sem
   draftid raest. README 4d varnagli 1 sagdi einmitt ad abatinn a STIGUM
   vaeri EKKI thar — spurningin her er hvort sigrar segi annad. */
const Q3_SCOPES = [{ key: "all", n: null },
                   { key: "top100", n: 100 },
                   { key: "top50", n: 50 }];

/** Z-STODLUN INNAN STODU — ordrett regla `opp-lab`: stada med faerri en
    8 gildum ber engan z, vantandi gildi er 0 (hlutlaust). Taekifaeri er
    stodubundid i einingum (RB ~20 snertingar/leik, WR ~7 kost/leik) svo
    laugarvid z-stodlun myndi maela "draftadu fleiri RB", sem
    `strategy-lab` hefur thegar svarad. */
function zWithinPos(list, get) {
  const st = {};
  for (const p of list) {
    const v = get(p);
    if (v == null || !Number.isFinite(v)) continue;
    (st[p.pos] = st[p.pos] || []).push(v);
  }
  const par = {};
  let covered = 0;
  for (const [pos, vals] of Object.entries(st)) {
    if (vals.length < 8) continue;
    const m = mean(vals);
    const s = Math.sqrt(mean(vals.map((v) => (v - m) ** 2))) || 1;
    par[pos] = { m, s };
    covered += vals.length;
  }
  if (!covered) return null;
  const f = (p) => {
    const v = get(p), q = par[p.pos];
    return q == null || v == null || !Number.isFinite(v) ? 0 : (v - q.m) / q.s;
  };
  f.covered = covered;
  return f;
}

/**
 * A-RANKING TRUFLAD MED `w * z(breyta)`.
 *
 * KVARDINN ER SA SAMI OG I `opp-lab` OG THAD ER FORSENDA THESS AD
 * VOGIRNAR SEU SAMBAERILEGAR. `opp-lab` raðar eftir `z(VBD) + w*z(X)`;
 * `arankBoard` her raðar eftir HRAU VBD (stigum). Vaeri `w*z(X)` lagt
 * ofan a hrátt VBD vaeri w=0,10 hverfandi truflun — 0,1 stig — og
 * "maelingin" vaeri ad maela ekki neitt. Thess vegna er VBD z-stoðlad
 * her lika, YFIR HAUSINN (thá sem eiga spa) eins og laugin i `opp-lab`
 * er.
 *
 * Z-STODLUN A VBD ER EINRAEN UMBREYTING, svo rodin vid w=0 er
 * NAKVAEMLEGA rodin sem `arankBoard` gefur. Thad er ekki fullyrding
 * heldur profad i Q3-nullhlidinu: bordin eru borin saman LYKIL FYRIR
 * LYKIL og duellid verdur ad lesa nakvaemlega 0.
 *
 * TAGLID (their sem eiga enga spa) er ORHREYFT. Thad er rett: `opp-lab`
 * hefur ekkert tagl — laug hennar ER hausinn — og truflun a tagli sem
 * er hvort ed er draftad sidast maelir ekkert.
 */
function oppBoard(W, fmt, repl, varKey, w, scopeN) {
  /* baseline per stodu — ORDRETT sama adgerd og `arankBoard` */
  const byPos = {};
  for (let i = 0; i < W.N; i++) {
    const v = W.proj[fmt][i];
    if (v == null) continue;
    (byPos[W.P[i].pos] = byPos[W.P[i].pos] || []).push(v);
  }
  const base = {};
  for (const [pos, vals] of Object.entries(byPos)) {
    vals.sort((a, b) => b - a);
    const k = Math.min(vals.length - 1, (repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    base[pos] = around.length ? mean(around) : 0;
  }

  const head = [], tail = [];
  for (let i = 0; i < W.N; i++) {
    const v = W.proj[fmt][i];
    if (v == null) { tail.push([W.P[i].id, -1e5 + W.prior[i]]); continue; }
    head.push({ id: W.P[i].id, pos: W.P[i].pos, vbd: v - (base[W.P[i].pos] ?? 0) });
  }
  if (!head.length) return arankBoard(W, fmt, repl);

  const m = mean(head.map((h) => h.vbd));
  const sd = Math.sqrt(mean(head.map((h) => (h.vbd - m) ** 2))) || 1;

  let zf = null, inScope = null;
  if (w !== 0) {
    zf = zWithinPos(head, (h) => (W.feat.get(h.id) || {})[varKey]);
    if (scopeN != null) {
      /* Svidid er skorid ur GRUNNBORDINU (VBD-rodinni), ekki ur
         truflada bordinu — annars vaeri svidid sjalft had voginni. */
      const order = head.slice().sort((a, b) => b.vbd - a.vbd);
      inScope = new Set(order.slice(0, scopeN).map((h) => h.id));
    }
  }

  const scored = head.map((h) => {
    const z = (h.vbd - m) / sd;
    if (!zf || (inScope && !inScope.has(h.id))) return [h.id, z];
    return [h.id, z + w * zf(h)];
  });
  scored.sort((a, b) => b[1] - a[1]);
  tail.sort((a, b) => b[1] - a[1]);
  return new Map([...scored, ...tail].map(([id], i) => [id, i + 1]));
}

/**
 * ENDURSYND LAUG — KLASI ER LEIKMADURINN, EKKI TIMABILID.
 *
 * `bootstrapDiff` (repo-stadallinn og `boot()` her ad nedan) endursynir
 * ARIN og heldur leikmanna-lauginni FASTRI. README 4c er skyr um hvad
 * thad kostar: `vbdbase-lab` fekk 28 holf sem stodust ars-klasada
 * bootstrappid og **0 af 153** sem stodust hann klasadan per leikmann.
 * Thess vegna er hann keyrdur her lika.
 *
 * Sama klonunar-adferd og `vbdbase-lab` skjalar: leikmadur sem er
 * dreginn tvisvar faer nytt id (`id#i`) svo tvo lid geti "eignast"
 * hann. Thad er ekki raunverulegt draft — en THAD ER SAMA LAUGIN FYRIR
 * BADI BORDIN i hverri itrun, svo porunin heldur og munurinn er enn
 * munurinn a bordunum.
 */
function resampleWorld(W, fmt, seed) {
  const rnd = rngOf(seed);
  const N = W.N;
  const P = new Array(N);
  const prior = new Float64Array(N);
  const proj = { [fmt]: new Array(N).fill(null) };
  const adp = { adpPpr: new Array(N).fill(null), adpStd: new Array(N).fill(null) };
  const adpSd = new Array(N).fill(null);
  const byWeek = new Map(), actual = new Map(), feat = new Map();
  const src = W.byWeek[fmt], act = W.actual[fmt];
  for (let i = 0; i < N; i++) {
    const o = Math.floor(rnd() * N);
    const op = W.P[o], id = `${op.id}#${i}`;
    P[i] = { id, name: op.name, pos: op.pos };
    prior[i] = W.prior[o];
    proj[fmt][i] = W.proj[fmt][o];
    adp.adpPpr[i] = W.adp.adpPpr[o];
    adp.adpStd[i] = W.adp.adpStd[o];
    adpSd[i] = W.adpSd[o];
    feat.set(id, W.feat.get(op.id));
    actual.set(id, act.get(op.id));
    for (let k = 1; k <= MAXW; k++) {
      const r = src.get(`${op.id}|${k}`);
      if (r) byWeek.set(`${id}|${k}`, r);
    }
  }
  return { y: W.y, N, P, prior, proj, adp, adpSd, feat,
           byWeek: { [fmt]: byWeek }, actual: { [fmt]: actual } };
}

/** SLEMBIN ROD. Vidmid sem er hvorugt akkerid. */
function randomBoard(W, seed) {
  const rnd = rngOf(seed);
  const keys = W.P.map((p) => p.id);
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return new Map(keys.map((k, i) => [k, i + 1]));
}

/* ============================================================
   4. VELIN — EIN FRUMA = TVEIR ARMAR I SOMU DEILD, SPEGLADIR
   ============================================================
   MEDFERDIN sitúr i saeti i, VIDMIDID i saeti j, OLL ONNUR saeti drafta
   eftir markadinum. Bædi lidin lifa thvi SAMA arið, sama herbergid og
   naer sama skra — arsahávadinn (sd ~150 stig milli timabila) dregst UT
   og eftir stendur adeins munurinn a bordunum. Sama rok og `rival` i
   `accuracy.js` skjalar, adeins fart upp a deildarstig.

   SPEGLUN: hver fruma er keyrd i BADUM attum. Thad fjarlaegir
   saetis-skekkju OG gerir sjalfsprofid NAKVAEMT.
   ============================================================ */

function runCell({ shape, W, treat, ctrl, runs, seedBase, adpSrc,
                   poTeams = PO_TEAMS, poWeeks = PO_WEEKS, wf = false }) {
  const league = shape.league;
  const T = league.teams;
  const fmt = shape.fmt;
  const acc = {
    n: 0,
    winT: 0, winC: 0, tieGames: 0,
    wT: [], wC: [], pfT: [], pfC: [], ssT: [], ssC: [],
    champT: 0, champC: 0, poT: 0, poC: 0, topT: 0, topC: 0,
    wfWT: [], wfWC: [], wfPfT: [], wfPfC: [],
    weekWinT: 0, weekWinC: 0, weekTie: 0,
  };
  const boardT = treat.board(W);
  const boardC = ctrl.board(W);
  const planT = treat.plan ? padPlan(treat.plan, league.rounds) : null;
  const planC = ctrl.plan ? padPlan(ctrl.plan, league.rounds) : null;

  for (let r = 0; r < runs; r++) {
    const seed = (seedBase + W.y * 7919 + r * 104729) >>> 0;
    const field = adpBoard(W, adpSrc, rngOf(seed));
    const schedule = roundRobin(T, REG_WEEKS, rngOf(seed ^ 0x5bf03635));
    for (let i = 1; i <= T; i++) {
      const j = i % T + 1;
      for (const swap of [false, true]) {
        const ti = swap ? j : i, ci = swap ? i : j;
        const boards = new Array(T + 1).fill(field);
        boards[ti] = boardT; boards[ci] = boardC;
        let plans = null;
        if (planT || planC) {
          plans = new Array(T + 1).fill(null);
          plans[ti] = planT; plans[ci] = planC;
        }
        const draft = simulateDraft({ board: field, fieldBoard: field,
          actual: W.actual[fmt], slot: 1, league, boards, plans });
        const S = scoreLeague({ rosters: draft.rosters, byWeek: W.byWeek[fmt],
          league, schedule, regWeeks: REG_WEEKS, playoffWeeks: poWeeks,
          playoffTeams: poTeams });

        const A = S.rec[ti], B = S.rec[ci];
        acc.n++;
        acc.wT.push(A.w + A.t / 2); acc.wC.push(B.w + B.t / 2);
        acc.pfT.push(A.pf); acc.pfC.push(B.pf);
        acc.ssT.push(startersPoints(draft.rosters[ti], W.actual[fmt], league));
        acc.ssC.push(startersPoints(draft.rosters[ci], W.actual[fmt], league));
        acc.tieGames += A.t;
        if (S.champion === ti) acc.champT++;
        if (S.champion === ci) acc.champC++;
        if (S.seeds.indexOf(ti) < poTeams) acc.poT++;
        if (S.seeds.indexOf(ci) < poTeams) acc.poC++;
        if (S.seeds[0] === ti) acc.topT++;
        if (S.seeds[0] === ci) acc.topC++;
        /* VIKA MOT VIKU, OHAD SKRANNI: hvor skoradi meira i hverri af
           14 vikunum? Thad er hreinasta myndin af "vinnur hann vikuna"
           og hun er onaem fyrir thvi hvern skrain gaf theim.          */
        for (let w = 1; w <= REG_WEEKS; w++) {
          const a = S.scores[ti][w], b = S.scores[ci][w];
          if (a > b) acc.weekWinT++; else if (b > a) acc.weekWinC++; else acc.weekTie++;
        }

        if (wf) {
          const sel = (key, week) => W.wf[fmt].get(`${key}|${week}`) ?? 0;
          const S2 = scoreLeague({ rosters: draft.rosters, byWeek: W.byWeek[fmt],
            league, schedule, regWeeks: REG_WEEKS, playoffWeeks: poWeeks,
            playoffTeams: poTeams, selectBy: sel });
          const A2 = S2.rec[ti], B2 = S2.rec[ci];
          acc.wfWT.push(A2.w + A2.t / 2); acc.wfWC.push(B2.w + B2.t / 2);
          acc.wfPfT.push(A2.pf); acc.wfPfC.push(B2.pf);
        }
      }
    }
  }
  return acc;
}

/** Leggur saman tvaer frumur sem eru KEYRDAR MED OHADUM FRAEKORNUM. */
function mergeAcc(a, b) {
  const out = { n: a.n + b.n };
  for (const k of Object.keys(a)) {
    if (k === "n") continue;
    out[k] = Array.isArray(a[k]) ? a[k].concat(b[k]) : a[k] + b[k];
  }
  return out;
}

function padPlan(plan, rounds) {
  const out = plan.slice(0, rounds);
  while (out.length < rounds) out.push(null);
  return out;
}

/** Dregur eina frumu nidur i tolur sem eru sambaerilegar milli ara. */
function cellStats(acc) {
  const wd = acc.wT.map((v, i) => v - acc.wC[i]);
  return {
    leagues: acc.n,
    winsT: r3(mean(acc.wT)), winsC: r3(mean(acc.wC)), winsDiff: r3(mean(wd)),
    pfT: r1(mean(acc.pfT)), pfC: r1(mean(acc.pfC)), pfDiff: r1(mean(acc.pfT) - mean(acc.pfC)),
    seasonT: r1(mean(acc.ssT)), seasonC: r1(mean(acc.ssC)),
    seasonDiff: r1(mean(acc.ssT) - mean(acc.ssC)),
    champT: r3(acc.champT / acc.n), champC: r3(acc.champC / acc.n),
    poRateT: r3(acc.poT / acc.n), poRateC: r3(acc.poC / acc.n),
    topSeedT: r3(acc.topT / acc.n), topSeedC: r3(acc.topC / acc.n),
    weekWinRate: r3(acc.weekWinT / Math.max(1, acc.weekWinT + acc.weekWinC)),
    weekWinT: acc.weekWinT, weekWinC: acc.weekWinC, weekTie: acc.weekTie,
    tieGames: acc.tieGames,
    wfWinsT: acc.wfWT.length ? r3(mean(acc.wfWT)) : null,
    wfWinsC: acc.wfWC.length ? r3(mean(acc.wfWC)) : null,
    wfWinsDiff: acc.wfWT.length ? r3(mean(acc.wfWT) - mean(acc.wfWC)) : null,
    wfPfT: acc.wfPfT.length ? r1(mean(acc.wfPfT)) : null,
    wfPfC: acc.wfPfC.length ? r1(mean(acc.wfPfC)) : null,
  };
}

/** 8,43 sigrar af 14 -> "8,4-5,6". Talan sem notandinn les i deildinni. */
const recordOf = (w) => (w == null ? "-"
  : `${w.toFixed(1)}-${(REG_WEEKS - w).toFixed(1)}`);

/** Timabil -> tvo kort af tolum -> bootstrap klasadur PER TIMABIL. */
function boot(perYear, keyT, keyC) {
  const A = {}, B = {};
  for (const [y, c] of Object.entries(perYear)) {
    if (c[keyT] == null || c[keyC] == null) continue;
    A[y] = c[keyT]; B[y] = c[keyC];
  }
  const bd = bootstrapDiff(A, B, BOOT);
  const d = Object.keys(A).map((y) => A[y] - B[y]);
  return bd ? { ...bd, diff: r3(bd.diff), lo: r3(bd.lo), hi: r3(bd.hi),
                t: tOf(d), wins: d.filter((x) => x > 0).length, years: d.length }
            : { diff: r3(mean(d)), lo: null, hi: null, excludesZero: null,
                t: tOf(d), wins: d.filter((x) => x > 0).length, years: d.length,
                why: "faerri en 3 timabil — ENGIN vikmork" };
}

/** Ein timarod af MUNUM (medferd - vidmid) -> vikmork gegn nulli.
    Sami klasi og `boot()`: TIMABILID. `opp-lab.bootSeasons` gerir
    nakvaemlega thetta og talan er thvi sambaerileg. */
function bootZero(per, boot = BOOT) {
  const A = {}, Z = {};
  for (const [y, v] of Object.entries(per)) {
    if (v == null || !Number.isFinite(v)) continue;
    A[y] = v; Z[y] = 0;
  }
  const vals = Object.values(A);
  /* TOM ROD MA ALDREI LESA `0`. `mean([])` er 0 i `src/learn.js` (deilt
     med `xs.length || 1`), svo helmingur sem a ENGIN ar myndi birtast
     sem maeld nulltala. Su villa er nakvaemlega "omaeld tala sem litur
     ut eins og maeling". */
  if (!vals.length) {
    return { mean: null, t: null, wins: 0, years: 0, lo: null, hi: null,
             excludesZero: null, per: {}, why: "engin timabil" };
  }
  const b = bootstrapDiff(A, Z, boot, 777);
  return { mean: r2(mean(vals)), t: tOf(vals),
           wins: vals.filter((x) => x > 0).length, years: vals.length,
           lo: b ? r3(b.lo) : null, hi: b ? r3(b.hi) : null,
           excludesZero: b ? b.excludesZero : null,
           per: Object.fromEntries(Object.entries(A).map(([k, v]) => [k, r3(v)])) };
}

/* ============================================================
   5. STEFNURNAR — ORDRETT SOMU AAETLANIR OG `strategy-lab.mjs`
   ============================================================
   Afritad viljandi og ekki flutt: `strategy-lab` skrifar bokada
   toflunna og ma ekki fara ad lesa deildar-herminn. Se listinn
   breyttur a einum stad og ekki odrum eru toflurnar ekki
   sambaerilegar — og THAD er profad i `tests/accuracy.mjs`.          */
const ANY = null;
const S14 = (...p) => [...p, ...Array(Math.max(0, 14 - p.length)).fill(ANY)];
const STRATEGIES = [
  { key: "bpa", label: "Best available (no plan)", plan: null },
  { key: "rb_rb", label: "RB-RB (robust RB)", plan: S14(["RB"], ["RB"]) },
  { key: "rb_rb_rb", label: "RB-RB-RB", plan: S14(["RB"], ["RB"], ["RB"]) },
  { key: "rb_wr", label: "RB then WR", plan: S14(["RB"], ["WR"]) },
  { key: "wr_rb", label: "WR then RB", plan: S14(["WR"], ["RB"]) },
  { key: "wr_wr", label: "WR-WR", plan: S14(["WR"], ["WR"]) },
  { key: "wr_wr_wr", label: "WR-WR-WR", plan: S14(["WR"], ["WR"], ["WR"]) },
  { key: "hero_rb", label: "Hero RB (RB1, then no RB until R5)",
    plan: S14(["RB"], ["WR", "TE"], ["WR", "TE"], ["WR", "TE"]) },
  { key: "zero_rb", label: "Zero RB (no RB in rounds 1-4)",
    plan: S14(["WR", "TE"], ["WR", "TE"], ["WR", "TE"], ["WR", "TE"]) },
  { key: "zero_rb6", label: "Zero RB, extended (no RB in rounds 1-6)",
    plan: S14(["WR", "TE"], ["WR", "TE"], ["WR", "TE"], ["WR", "TE"],
              ["WR", "TE"], ["WR", "TE"]) },
  { key: "qb1", label: "QB in round 1", plan: S14(["QB"]) },
  { key: "qb2", label: "QB in round 2", plan: S14(ANY, ["QB"]) },
  { key: "qb3", label: "QB in round 3", plan: S14(ANY, ANY, ["QB"]) },
  { key: "qb_late", label: "QB not before round 9",
    plan: [...Array(8).fill(["RB", "WR", "TE"]), ...Array(6).fill(ANY)] },
  { key: "te1", label: "TE in round 1", plan: S14(["TE"]) },
  { key: "te2", label: "TE in round 2", plan: S14(ANY, ["TE"]) },
  { key: "te_late", label: "TE not before round 9",
    plan: [...Array(8).fill(["QB", "RB", "WR"]), ...Array(6).fill(ANY)] },
  { key: "balanced", label: "RB-WR-RB-WR", plan: S14(["RB"], ["WR"], ["RB"], ["WR"]) },
  { key: "wr_heavy", label: "WR-WR-RB-WR", plan: S14(["WR"], ["WR"], ["RB"], ["WR"]) },
];

/* ============================================================
   MAIN
   ============================================================ */
async function main() {
  const t0 = Date.now();
  const { weekly, seasons, feats, waiverDesign } = await loadInputs();
  requireSeasons(seasons, "timabil med vikugognum (data/weekly/*.json)");

  const featIdx = new Map();
  for (const r of feats.rows) featIdx.set(`${r.season}|${r.id}|${r.scoring}`, r);
  if (EXTRA_FILE) {
    const raw = JSON.parse(await readFile(path.join(DATA, "measure", EXTRA_FILE), "utf8"));
    EXTRA = new Map(raw.rows.map((r) => [`${r.id}|${r.season}`, r]));
    EXTRA_META = { file: EXTRA_FILE, provenance: raw.provenance, leak: raw.leak,
                   variables: raw.variables, coverage: raw.coverage };
    console.log(`--extra=${EXTRA_FILE}: ${EXTRA.size} radir · Q3-breyta \`${Q3_VAR}\``);
  }

  console.log(`timabil med vikugognum: ${seasons.join(", ")}`);
  const worlds = {};
  for (const y of seasons) worlds[y] = buildWorld(y, weekly, featIdx);

  /* --- er summan min sama tala og `features` ber? --- */
  const sumCheck = { pairs: 0, maxAbs: 0, worst: null };
  for (const y of seasons) {
    const W = worlds[y];
    for (let i = 0; i < W.N; i++) {
      const f = featIdx.get(`${y}|${W.P[i].id}|ppr`);
      if (!f || f.pts == null) continue;
      const d = Math.abs(f.pts - W.totAll.ppr[i]);
      sumCheck.pairs++;
      if (d > sumCheck.maxAbs) { sumCheck.maxAbs = r2(d); sumCheck.worst = `${W.P[i].name} ${y}`; }
    }
  }
  console.log(`timabils-summa min gegn features.pts: ${sumCheck.pairs} por, ` +
    `staersta frávik ${sumCheck.maxAbs} (${sumCheck.worst})`);
  console.log(`laugin per ari: ` + seasons.map((y) =>
    `${y} ${worlds[y].N}`).join(" · "));

  /* --- SPA-TIMABILIN: bokada +233,6 er 2021-2025 (Sleeper-spa) --- */
  const projYears = seasons.filter((y) => {
    let n = 0;
    for (const r of feats.rows) if (r.season === y && r.scoring === "ppr" && r.sleeperProj != null) n++;
    return n > 100;
  });
  console.log(`timabil med Sleeper-spa OG vikugognum: ${projYears.join(", ")}`);

  const repl = {};
  for (const sh of SHAPES) repl[sh.key] = replacementRanks({ ...sh.league, scoring: sh.fmt });

  /* ============================================================
     VORDUR: ER LOGUNIN SU SAMA SEM THEGAR ER MAELD?
     ============================================================
     `waiver.json` ber `design.replacementRanks` fyrir NAKVAEMLEGA somu
     logunarheiti. Se hun ekki eins er annad hvort labid ad maela adra
     deild en hitt, og tvaer maelingar undir sama nafni sem maela
     sitthvora deild eru verri en ein.

     EN MUNUR ER EKKI ALLTAF VILLA, og vordurinn verdur ad geta greint
     thad — annars er hann bara alarm sem einhver slekkur a. Hann
     keyrdi og fann `10-2flex.WR: 30 gegn 29`. Orsokin er SKJALFEST
     BREYTING A `replacementRanks` (14.8.2026): flex-saetum var deilt
     med `Math.round` per stodu, sem lét saetin summast i 21 fyrir 20 i
     NAKVAEMLEGA thessari logun (athugasemdin vid `apportion` i
     model.js nefnir hana med nafni). `waiver.json` var skrifud 12.8 og
     ber thvi GOMLU regluna.

     Thess vegna reiknar vordurinn GOMLU REGLUNA LIKA og krefst thess
     ad hun SKYRI hvern mun. Munur sem gamla reglan skyrir er skrádur
     sem `legacyDrift`; munur sem hun skyrir EKKI drepur keyrsluna.   */
  const legacyRepl = (league) => {
    /* Gamla reglan ordrett: `Math.round` per stodu, flexPos hunsad. */
    const t = league.teams || 12, st = league.starters || {};
    const flex = (st.FLEX || 0) * t;
    const SPLIT = { RB: 0.330, WR: 0.477, TE: 0.193 };
    const out = {};
    for (const pos of POSES) {
      out[pos] = (st[pos] || 0) * t + Math.round(flex * (SPLIT[pos] || 0));
    }
    return out;
  };
  const shapeGuard = { checked: 0, mismatches: [], legacyDrift: [] };
  if (waiverDesign && waiverDesign.design && waiverDesign.design.replacementRanks) {
    for (const sh of SHAPES) {
      const other = waiverDesign.design.replacementRanks[sh.key];
      if (!other) continue;
      shapeGuard.checked++;
      const legacy = legacyRepl(sh.league);
      for (const pos of POSES) {
        if (other[pos] == null || other[pos] === repl[sh.key][pos]) continue;
        const line = `${sh.key}.${pos}: waiver.json ${other[pos]} vs her ${repl[sh.key][pos]}`;
        if (other[pos] === legacy[pos]) {
          shapeGuard.legacyDrift.push(`${line} (gamla Math.round-reglan gefur ${legacy[pos]} ` +
            "— skyrt af apportion-lagfaeringunni 14.8.2026)");
        } else shapeGuard.mismatches.push(line);
      }
    }
  } else shapeGuard.note = "data/measure/waiver.json vantar — logunin er OBORIN";
  if (shapeGuard.mismatches.length) {
    console.error("\n  LOGUNIN STEMMIR EKKI VID data/measure/waiver.json:");
    for (const m of shapeGuard.mismatches) console.error(`    ${m}`);
    console.error("  Og gamla `replacementRanks`-reglan skyrir thad ekki. Skrifa EKKERT.\n");
    process.exit(2);
  }
  console.log(`logunar-vordur: ${shapeGuard.checked} logun borin vid waiver.json · ` +
    `${shapeGuard.mismatches.length} oskyrdir mismunir · ` +
    `${shapeGuard.legacyDrift.length} skyrdir af apportion-lagfaeringunni`);
  for (const d of shapeGuard.legacyDrift) console.log(`   ${d}`);

  /* ============================================================
     N1 — NULLPROFID. HLID.
     ============================================================ */
  console.log(`\n${"=".repeat(78)}`);
  console.log("  N1 NULLPROF (HLID) — BORD GEGN SJALFU SER VERDUR AD GEFA NAKVAEMLEGA 50%");
  console.log("=".repeat(78));
  const nullTest = { cells: [], maxAbsWins: 0, maxAbsChamp: 0, maxAbsPf: 0,
                     maxAbsWeekWinRate: 0, passed: true };
  for (const sh of SHAPES) {
    for (const y of projYears) {
      const W = worlds[y];
      const self = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) };
      const acc = runCell({ shape: sh, W, treat: self, ctrl: self, runs: 2,
        seedBase: 11, adpSrc: ADP_SRC[sh.fmt][0] });
      const c = cellStats(acc);
      const dw = Math.abs(c.winsT - c.winsC);
      const dc = Math.abs(c.champT - c.champC);
      const dp = Math.abs(c.pfT - c.pfC);
      const dr = Math.abs(c.weekWinRate - 0.5);
      nullTest.cells.push({ shape: sh.key, season: y, leagues: c.leagues,
        winsT: c.winsT, winsC: c.winsC, champT: c.champT, champC: c.champC,
        weekWinRate: c.weekWinRate });
      nullTest.maxAbsWins = Math.max(nullTest.maxAbsWins, dw);
      nullTest.maxAbsChamp = Math.max(nullTest.maxAbsChamp, dc);
      nullTest.maxAbsPf = Math.max(nullTest.maxAbsPf, dp);
      nullTest.maxAbsWeekWinRate = Math.max(nullTest.maxAbsWeekWinRate, dr);
    }
  }
  nullTest.passed = nullTest.maxAbsWins === 0 && nullTest.maxAbsChamp === 0 &&
                    nullTest.maxAbsPf === 0 && nullTest.maxAbsWeekWinRate === 0;
  console.log(`  ${nullTest.cells.length} frumur · ` +
    `${nullTest.cells.reduce((a, c) => a + c.leagues, 0)} hermdar deildir`);
  console.log(`  staersti munur a SIGRUM         ${nullTest.maxAbsWins}`);
  console.log(`  staersti munur a MEISTARATITLUM ${nullTest.maxAbsChamp}`);
  console.log(`  staersti munur a STIGUM         ${nullTest.maxAbsPf}`);
  console.log(`  vikuleg sigurprosenta fra 50%   ${nullTest.maxAbsWeekWinRate}`);
  console.log(`  -> ${nullTest.passed ? "STENST" : "FELLUR"}`);
  if (!nullTest.passed) {
    await writeOut({ gate: false, nullTest, note:
      "NULLPROFID FELL. Herminn hallar a arm og hver tala undir honum er " +
      "merkingarlaus. Engar nidurstodur eru reiknadar." });
    console.error(`\n  NULLPROFID FELL — engar nidurstodur reiknadar. Sja data/measure/${OUT_FILE}\n`);
    process.exit(3);
  }

  /* ============================================================
     N2 — BOKHALDID
     ============================================================ */
  const acct = { leagues: 0, bad: [] };
  for (const sh of SHAPES) {
    const W = worlds[projYears.at(-1)];
    const board = arankBoard(W, sh.fmt, repl[sh.key]);
    const T = sh.league.teams;
    for (let r = 0; r < 3; r++) {
      const seed = (7 + r * 999983) >>> 0;
      const field = adpBoard(W, ADP_SRC[sh.fmt][0], rngOf(seed));
      const schedule = roundRobin(T, REG_WEEKS, rngOf(seed ^ 0x5bf03635));
      /* skra: hver vika er fullkomin porun */
      for (let w = 0; w < schedule.length; w++) {
        const seen = new Set();
        for (const [a, b] of schedule[w]) {
          if (a === b) acct.bad.push(`${sh.key} vika ${w + 1}: lid gegn sjalfu ser`);
          if (seen.has(a) || seen.has(b)) acct.bad.push(`${sh.key} vika ${w + 1}: lid tvisvar`);
          seen.add(a); seen.add(b);
        }
        if (seen.size !== T) acct.bad.push(`${sh.key} vika ${w + 1}: ${seen.size} af ${T} lidum`);
      }
      const boards = new Array(T + 1).fill(field);
      boards[2] = board;
      const draft = simulateDraft({ board: field, fieldBoard: field,
        actual: W.actual[sh.fmt], slot: 1, league: sh.league, boards });
      const S = scoreLeague({ rosters: draft.rosters, byWeek: W.byWeek[sh.fmt],
        league: sh.league, schedule, regWeeks: REG_WEEKS,
        playoffWeeks: PO_WEEKS, playoffTeams: PO_TEAMS });
      acct.leagues++;
      const rec = S.rec.slice(1);
      const sw = rec.reduce((a, x) => a + x.w, 0), sl = rec.reduce((a, x) => a + x.l, 0);
      const st = rec.reduce((a, x) => a + x.t, 0);
      if (sw !== sl) acct.bad.push(`${sh.key}: sigrar ${sw} != tôp ${sl}`);
      if (sw + sl + st !== T * REG_WEEKS) {
        acct.bad.push(`${sh.key}: ${sw + sl + st} utkomur, aetti ad vera ${T * REG_WEEKS}`);
      }
      for (const x of rec) {
        if (x.w + x.l + x.t !== REG_WEEKS) acct.bad.push(`${sh.key}: lid ${x.team} spiladi ${x.w + x.l + x.t}`);
      }
      if (S.champion == null) acct.bad.push(`${sh.key}: enginn meistari`);
      if (S.playoff.rounds.length !== 3) acct.bad.push(`${sh.key}: ${S.playoff.rounds.length} umferdir i urslitakeppni`);
      if (new Set(S.seeds).size !== T) acct.bad.push(`${sh.key}: rodun ber ekki oll lid`);
    }
  }
  console.log(`\n  N2 bokhald: ${acct.leagues} deildir · ${acct.bad.length} villur`);
  for (const b of acct.bad.slice(0, 5)) console.log(`     ${b}`);
  if (acct.bad.length) {
    await writeOut({ gate: false, nullTest, accounting: acct, note:
      "BOKHALDID BRAST. Skra eda talning er biluð og tolur undir henni eru merkingarlausar." });
    process.exit(3);
  }

  /* ============================================================
     N3 — SAETIS-DREIFINGIN, OSPEGLUD
     ============================================================
     ALLIR a SAMA bordi. Tha er hvert saeti eins gott og hvert annad
     ad byggingu — og THAD ER THAD SAMT EKKI, thvi snakk-rodin gefur
     saeti 1 og saeti 10 gerolika leikmenn. Talan hér er astaedan
     fyrir spegluninni: hun er STAERRI en munurinn sem er verid ad
     maela, svo osplegluð fruma vaeri maeling a saetum.                */
  const seatSpread = {};
  for (const sh of SHAPES) {
    const T = sh.league.teams;
    const winsBySeat = Array.from({ length: T + 1 }, () => []);
    const pfBySeat = Array.from({ length: T + 1 }, () => []);
    for (const y of projYears) {
      const W = worlds[y];
      const board = arankBoard(W, sh.fmt, repl[sh.key]);
      for (let r = 0; r < 3; r++) {
        const seed = (23 + W.y * 7919 + r * 104729) >>> 0;
        const field = adpBoard(W, ADP_SRC[sh.fmt][0], rngOf(seed));
        const schedule = roundRobin(T, REG_WEEKS, rngOf(seed ^ 0x5bf03635));
        const boards = new Array(T + 1).fill(board);
        const draft = simulateDraft({ board, fieldBoard: field,
          actual: W.actual[sh.fmt], slot: 1, league: sh.league, boards });
        const S = scoreLeague({ rosters: draft.rosters, byWeek: W.byWeek[sh.fmt],
          league: sh.league, schedule, regWeeks: REG_WEEKS,
          playoffWeeks: PO_WEEKS, playoffTeams: PO_TEAMS });
        for (let t = 1; t <= T; t++) {
          winsBySeat[t].push(S.rec[t].w + S.rec[t].t / 2);
          pfBySeat[t].push(S.rec[t].pf);
        }
      }
    }
    const mw = winsBySeat.slice(1).map((a) => mean(a));
    const mp = pfBySeat.slice(1).map((a) => mean(a));
    seatSpread[sh.key] = {
      winsBySeat: mw.map((x) => r2(x)),
      winsRange: r2(Math.max(...mw) - Math.min(...mw)),
      pfRange: r1(Math.max(...mp) - Math.min(...mp)),
      note: "allir a SAMA bordi — thetta er saetis-skekkja og ekkert annad",
    };
    console.log(`  N3 ${sh.key}: saetis-bil i sigrum ${seatSpread[sh.key].winsRange} ` +
      `af ${REG_WEEKS} · i stigum ${seatSpread[sh.key].pfRange}`);
  }

  /* ============================================================
     N4 — AKKERI I BADA ENDA
     ============================================================ */
  console.log(`\n${"=".repeat(78)}`);
  console.log("  N4 AKKERI — PIPAN SONNUD UR BADUM ENDUM");
  console.log("=".repeat(78));
  const anchors = {};
  for (const sh of SHAPES) {
    const src = ADP_SRC[sh.fmt][0];
    const arank = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) };
    const list = [
      { key: "oracle", label: "orakel (raunstig timabilsins) gegn A-Ranking",
        treat: { board: (X) => oracleBoard(X, sh.fmt) }, ctrl: arank, gate: "up" },
      { key: "reverse", label: "andhverft ADP gegn A-Ranking",
        treat: { board: (X) => reverseBoard(X, src) }, ctrl: arank, gate: "down" },
      { key: "random", label: "slembin rod gegn A-Ranking",
        treat: { board: (X) => randomBoard(X, X.y * 31 + 7) }, ctrl: arank, gate: "down" },
    ];
    anchors[sh.key] = {};
    for (const a of list) {
      const perYear = {};
      for (const y of projYears) {
        perYear[y] = cellStats(runCell({ shape: sh, W: worlds[y], treat: a.treat,
          ctrl: a.ctrl, runs: 2, seedBase: 31, adpSrc: src }));
      }
      const wins = boot(perYear, "winsT", "winsC");
      const pts = boot(perYear, "seasonT", "seasonC");
      const champ = boot(perYear, "champT", "champC");
      const okGate = a.gate === "up"
        ? (wins.diff > 0 && wins.excludesZero === true)
        : (wins.diff < 0 && wins.excludesZero === true);
      anchors[sh.key][a.key] = { label: a.label, wins, points: pts, champ,
        gate: a.gate, passed: okGate, perYear };
      console.log(`  ${sh.key.padEnd(10)} ${a.key.padEnd(8)} sigrar ${sgn(wins.diff)} ` +
        `[${sgn(wins.lo)},${sgn(wins.hi)}] · stig ${sgn(pts.diff, 0)} · ` +
        `titlar ${sgn(champ.diff, 3)} -> ${okGate ? "OK" : "FELLUR"}`);
    }
  }
  const anchorFail = [];
  for (const [k, v] of Object.entries(anchors)) {
    for (const [a, r] of Object.entries(v)) if (!r.passed) anchorFail.push(`${k}/${a}`);
  }
  if (anchorFail.length) {
    console.error(`\n  AKKERI FELLU: ${anchorFail.join(", ")}\n` +
      "  Pipan breytir ekki gaedum i sigra og hofnun er tha EKKI nidurstada.\n");
    await writeOut({ gate: false, nullTest, accounting: acct, seatSpread, anchors,
      note: "AKKERI FELLU — pipan breytir ekki gaedum i sigra." });
    process.exit(3);
  }

  /* ============================================================
     TE-SVEIPURINN — `--tesweep`. EIGIN SKRA, EIGIN URSKURDUR.
     ============================================================
     Hann situr HER og ekki fyrr: N1-N4 verda ad hafa stadist adur en
     nokkur sveip-tala er lesin. Nullprofid sannar ad herminn hallar
     ekki a arm, bokhaldid ad skra og talning stemma, og akkerin ad
     pipan BREYTI gaedum i sigra — an theirra vaeri "0,193 er fin"
     ekki nidurstada heldur maelitaeki sem ser ekkert.                */
  if (TESWEEP) {
    const teModels = await loadTeModels();
    const teRepl = {};
    for (const sh of SHAPES) {
      for (const te of TE_GRID) {
        teRepl[`${sh.key}|${teKey(te)}`] =
          teModels.get(te).replacementRanks({ ...sh.league, scoring: sh.fmt });
      }
    }
    /* HART HLID: te = 0,193 UR PATCHADA AFRITINU verdur ad gefa
       BITAEINS somu threp og sendi kodinn. Se thad ekki er allt hitt
       maelt i odrum heimi. */
    const teAnchor = { checked: 0, mismatches: [] };
    for (const sh of SHAPES) {
      const a = teRepl[`${sh.key}|${teKey(TE_SHIPPED)}`], b = repl[sh.key];
      for (const pos of POSES) {
        teAnchor.checked++;
        if (a[pos] !== b[pos]) {
          teAnchor.mismatches.push(`${sh.key}.${pos}: patch ${a[pos]} vs sent ${b[pos]}`);
        }
      }
    }
    if (teAnchor.mismatches.length) {
      console.error(`\n  TE-AKKERID FELL: ${teAnchor.mismatches.join(" · ")}\n` +
        "  Patchada afritid gefur onnur varamanns-threp en `src/model.js`. Skrifa EKKERT.\n");
      process.exit(2);
    }

    console.log(`\n${"=".repeat(78)}`);
    console.log("  TE-SVEIPUR — FLEX_SPLIT.TE GEGN SENDU 0,193, MAELT I SIGRUM");
    console.log("=".repeat(78));
    console.log(`  akkeri: patchad te=0,193 == sent i ollum ${teAnchor.checked} ` +
      "(logun x stada)  OK");

    const teCells = {};
    for (const sh of SHAPES) {
      for (const src of ADP_SRC[sh.fmt]) {
        const ctrl = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) };
        for (const te of TE_GRID) {
          const vk = teKey(te);
          const treat = { board: (X) => arankBoard(X, sh.fmt, teRepl[`${sh.key}|${vk}`]) };
          const perYear = {};
          for (const y of projYears) {
            perYear[y] = cellStats(runCell({ shape: sh, W: worlds[y], treat, ctrl,
              runs: TERUNS, seedBase: 5501, adpSrc: src, wf: true }));
          }
          const lvl = (k) => r3(mean(Object.values(perYear).map((c) => c[k])));
          teCells[`${sh.key}|${src}|${vk}`] = {
            te, seat: teRepl[`${sh.key}|${vk}`],
            leagues: Object.values(perYear).reduce((a, c) => a + c.leagues, 0),
            level: { winsT: lvl("winsT"), winsC: lvl("winsC"),
                     recordT: recordOf(lvl("winsT")), recordC: recordOf(lvl("winsC")),
                     champT: lvl("champT"), champC: lvl("champC"),
                     poRateT: lvl("poRateT"), poRateC: lvl("poRateC") },
            wins: boot(perYear, "winsT", "winsC"),
            seasonPoints: boot(perYear, "seasonT", "seasonC"),
            champ: boot(perYear, "champT", "champC"),
            playoffs: boot(perYear, "poRateT", "poRateC"),
            wfWins: boot(perYear, "wfWinsT", "wfWinsC"),
            weekWinRate: r3(mean(Object.values(perYear).map((c) => c.weekWinRate))),
            perYear,
          };
        }
      }
    }

    /* HLID 2: nullid VERDUR ad vera nakvaemlega 0 i hverri frumu thar
       sem te = sent gildi. Talan er reiknud ur SOMU velinni, svo
       hvad sem gerist thar gerist lika i hinum frumunum. */
    const teNull = { cells: 0, bad: [] };
    for (const k of Object.keys(teCells)) {
      if (!k.endsWith(`|${teKey(TE_SHIPPED)}`)) continue;
      teNull.cells++;
      const c = teCells[k];
      if (c.wins.diff !== 0 || c.seasonPoints.diff !== 0 || c.champ.diff !== 0) {
        teNull.bad.push(`${k}: sigrar ${c.wins.diff} · stig ${c.seasonPoints.diff} · ` +
          `titlar ${c.champ.diff}`);
      }
    }
    if (teNull.bad.length) {
      console.error(`\n  TE-NULLHLIDID FELL — sent gildi gefur EKKI 0:\n   ` +
        `${teNull.bad.join("\n   ")}\n  Skrifa EKKERT.\n`);
      process.exit(2);
    }
    console.log(`  nullhlid: te=0,193 gefur nakvaemlega 0 i ollum ${teNull.cells} frumum  OK`);

    /* ---------- PER-LEIKMANNS BOOTSTRAP A SIGRA-MUNINN ----------
       Ars-klasad bootstrappid (`boot`) endursynir ARIN. README 4c:
       `vbdbase-lab` fekk 28 holf sem stodust thad og 0 af 153 sem
       stodust leikmanna-klasad. Bord-breyting sem birtir adeins
       ars-klasad bil er ad of-fullyrda, og thad gildir eins her.     */
    const tePlayerBoot = {};
    if (TEPBOOT > 0) {
      console.log(`\n  per-leikmanns bootstrap a sigrum (${TEPBOOT} itranir) …`);
      const t0 = Date.now();
      const acc = {};
      for (const sh of SHAPES) for (const te of TE_GRID) acc[`${sh.key}|${teKey(te)}`] = [];
      for (let b = 0; b < TEPBOOT; b++) {
        for (const sh of SHAPES) {
          const src = ADP_SRC[sh.fmt][0];
          const per = {};
          for (const te of TE_GRID) per[teKey(te)] = [];
          for (const y of projYears) {
            const RW = resampleWorld(worlds[y], sh.fmt, (y * 100003 + b * 7919 + 17) >>> 0);
            const ctrl = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) };
            for (const te of TE_GRID) {
              const vk = teKey(te);
              const c = cellStats(runCell({ shape: sh, W: RW,
                treat: { board: (X) => arankBoard(X, sh.fmt, teRepl[`${sh.key}|${vk}`]) },
                ctrl, runs: 1, seedBase: (8101 + b * 104729) >>> 0, adpSrc: src }));
              per[vk].push(c.winsDiff);
            }
          }
          for (const te of TE_GRID) acc[`${sh.key}|${teKey(te)}`].push(mean(per[teKey(te)]));
        }
        if (b === 0) {
          console.log(`     ~${Math.round((Date.now() - t0) / 1000 * TEPBOOT)} s aaetlad`);
        }
      }
      for (const [k, a] of Object.entries(acc)) {
        const d = a.slice().sort((x, z) => x - z);
        const lo = d[Math.floor(d.length * 0.025)], hi = d[Math.floor(d.length * 0.975)];
        tePlayerBoot[k] = { iters: d.length, lo: r3(lo), hi: r3(hi),
          median: r3(d[Math.floor(d.length * 0.5)]), excludesZero: lo > 0 || hi < 0 };
      }
    }

    /* ---------- TAFLAN ---------- */
    for (const sh of SHAPES) {
      const src = ADP_SRC[sh.fmt][0];
      console.log(`\n  ${sh.label}  ·  ADP ${src}`);
      console.log(`  ${"TE".padEnd(10)}${"saeti".padEnd(20)}${"sigrar".padStart(8)}` +
        `${"  ars-CI".padEnd(20)}${"  leikm.-CI".padEnd(20)}${"stig".padStart(8)}` +
        `${"urslitak.".padStart(11)}${"  an hindsight".padEnd(16)}`);
      for (const te of TE_GRID) {
        const c = teCells[`${sh.key}|${src}|${teKey(te)}`];
        const pb = tePlayerBoot[`${sh.key}|${teKey(te)}`];
        const ci = (x) => (x && x.lo != null
          ? `[${sgn(x.lo, 2)},${sgn(x.hi, 2)}]${x.excludesZero ? "*" : " "}` : "-");
        console.log(`  ${(String(te) + (te === TE_SHIPPED ? " SENT" : "")).padEnd(10)}` +
          `RB${String(c.seat.RB).padEnd(3)} WR${String(c.seat.WR).padEnd(3)} ` +
          `TE${String(c.seat.TE).padEnd(6)}${sgn(c.wins.diff).padStart(8)}` +
          `  ${ci(c.wins).padEnd(18)}  ${ci(pb).padEnd(18)}` +
          `${sgn(c.seasonPoints.diff, 0).padStart(8)}` +
          `${sgn(c.playoffs.diff, 3).padStart(11)}  ${sgn(c.wfWins.diff).padEnd(14)}`);
      }
    }

    /* ---------- URSKURDUR, REIKNADUR ---------- */
    const bar = [];
    for (const sh of SHAPES) {
      const src = ADP_SRC[sh.fmt][0];
      for (const te of TE_GRID) {
        if (te === TE_SHIPPED) continue;
        const c = teCells[`${sh.key}|${src}|${teKey(te)}`];
        const pb = tePlayerBoot[`${sh.key}|${teKey(te)}`];
        if (c.wins.diff > 0 && c.wins.excludesZero &&
            (TEPBOOT === 0 || (pb && pb.excludesZero))) {
          bar.push({ shape: sh.key, te, wins: c.wins.diff, ci: [c.wins.lo, c.wins.hi],
                     playerCi: pb ? [pb.lo, pb.hi] : null });
        }
      }
    }
    const nTe = SHAPES.length * (TE_GRID.length - 1);
    const teVerdict = bar.length === 0
      ? `NO TE SHARE BEATS THE SHIPPED 0.193 IN WINS AT THIS REPO'S BAR. ` +
        `${nTe} (shape x TE share) cells were measured as a paired head-to-head league — ` +
        `same seasons, same room, mirrored seats — and not one clears a positive win ` +
        `difference plus BOTH the season-clustered and the player-clustered 95% interval. ` +
        `The null gate is exact by construction here (the shipped share reads 0.000 wins in ` +
        `all ${teNull.cells} cells), so a flat table is measured indifference and not a ` +
        `blind harness: the same machine sees the oracle and reverse-ADP anchors move wins.`
      : `${bar.length} of ${nTe} cells clear a positive win difference plus both intervals: ` +
        bar.map((x) => `TE=${x.te} in ${x.shape} (${sgn(x.wins)} wins, ` +
          `season CI [${sgn(x.ci[0])},${sgn(x.ci[1])}])`).join("; ") +
        `. Read that against ${nTe} comparisons before wiring anything.`;
    console.log(`\n${"=".repeat(78)}\n  URSKURDUR\n${"=".repeat(78)}`);
    for (const p of teVerdict.split(". ")) console.log(`  ${p}.`);

    await mkdir(path.join(DATA, "measure"), { recursive: true });
    await writeFile(path.join(DATA, "measure", "tesplit_h2h.json"), JSON.stringify({
      generated: new Date().toISOString(),
      provenance: stamp({ argv: process.argv.slice(2),
        defaults: { ...DEFAULTS, teruns: 6, tepboot: 120 },
        inputs: ["features.json",
                 ...[2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y) => `weekly/${y}.json`)],
        dataDir: DATA }),
      question: "Draftar annad FLEX_SPLIT.TE en 0,193 BETUR — maelt i SIGRUM, ekki " +
        "i samraemi vid markadinn?",
      design: {
        metric: "pardur deildar-hermun: te-bordid i saeti i, SENDA bordid i saeti j, " +
          "oll onnur saeti eftir markadinum, hver fruma SPEGLUD",
        onlyChannel: "`FLEX_SPLIT` kemst inn i thetta lab EINGONGU gegnum " +
          "`replacementRanks` -> `arankBoard`. Ekkert annad les hana.",
        rbwrHeldFixed: "RB:WR = 0,330:0,477 innbyrdis; ADEINS TE er sveipad",
        patchNotCopy: "varamanns-threpin koma ur PATCHADA afriti af src/model.js " +
          "(lib/te-sweep.mjs), ekki ur afriti af `apportion` — sja notu thar",
        gates: "N1-N4 (nullprof, bokhald, saetis-dreifing, akkeri) PLUS te-akkerid " +
          "(patchad 0,193 == sent) og te-nullhlidid (0,193 gefur nakvaemlega 0)",
        runs: TERUNS, playerBootIters: TEPBOOT,
      },
      teGrid: TE_GRID, shipped: TE_SHIPPED,
      splits: Object.fromEntries(TE_GRID.map((te) => [teKey(te), teModels.get(te).split])),
      seats: teRepl,
      anchor: { ...teAnchor, passed: true },
      nullGate: { ...teNull, passed: true,
        note: "sent gildi VERDUR ad gefa nakvaemlega 0 — sama bord, sama frækorn" },
      nullTest, accounting: acct, seatSpread, anchors,
      cells: teCells,
      playerBootstrap: tePlayerBoot,
      standsAtBar: bar,
      verdict: teVerdict,
    }, null, 1));
    console.log(`\n-> data/measure/tesplit_h2h.json`);
    console.log(`  (${Math.round((Date.now() - t0) / 1000)} s)`);
    return;
  }

  /* ============================================================
     Q1 — A-RANKING GEGN HRARRI ADP, A SIGRUM
     ============================================================ */
  console.log(`\n${"=".repeat(78)}`);
  console.log("  Q1 BOKAD: A-RANKING GEGN ADP = +233,6 STIG (5/5). HELDUR THAD I SIGRUM?");
  console.log("=".repeat(78));
  const q1 = {};
  for (const sh of SHAPES) {
    q1[sh.key] = {};
    for (const src of ADP_SRC[sh.fmt]) {
      const arank = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) };
      const cells = {
        adp: { label: "hra ADP-rod", ctrl: { board: (X) => adpBoard(X, src) } },
        proj: { label: "hra spa-rod (engin VBD)", ctrl: { board: (X) => projBoard(X, sh.fmt) } },
      };
      q1[sh.key][src] = {};
      for (const [ck, cv] of Object.entries(cells)) {
        const perYear = {};
        for (const y of projYears) {
          perYear[y] = cellStats(runCell({ shape: sh, W: worlds[y], treat: arank,
            ctrl: cv.ctrl, runs: RUNS, seedBase: 101, adpSrc: src, wf: true }));
        }
        const lvl = (k) => r3(mean(Object.values(perYear).map((c) => c[k])));
        const out = {
          label: cv.label,
          leagues: Object.values(perYear).reduce((a, c) => a + c.leagues, 0),
          /* ABSOLUTU TOLURNAR LIKA. "+2,9 sigrar" er munur; notandinn
             spyr "hvad endar lidid mitt i?" og thad er 8-6 gegn 5-9. */
          level: {
            winsT: lvl("winsT"), winsC: lvl("winsC"),
            recordT: recordOf(lvl("winsT")), recordC: recordOf(lvl("winsC")),
            champT: lvl("champT"), champC: lvl("champC"),
            poRateT: lvl("poRateT"), poRateC: lvl("poRateC"),
            topSeedT: lvl("topSeedT"), topSeedC: lvl("topSeedC"),
          },
          wins: boot(perYear, "winsT", "winsC"),
          weekPoints: boot(perYear, "pfT", "pfC"),
          seasonPoints: boot(perYear, "seasonT", "seasonC"),
          champ: boot(perYear, "champT", "champC"),
          playoffs: boot(perYear, "poRateT", "poRateC"),
          topSeed: boot(perYear, "topSeedT", "topSeedC"),
          /* NAEMNI: byrjunarlid valid AN thess ad sja vikuna. */
          wfWins: boot(perYear, "wfWinsT", "wfWinsC"),
          wfWeekPoints: boot(perYear, "wfPfT", "wfPfC"),
          weekWinRate: r3(mean(Object.values(perYear).map((c) => c.weekWinRate))),
          perYear,
        };
        q1[sh.key][src][ck] = out;
        console.log(`  ${sh.key.padEnd(10)} ${src.padEnd(7)} ${ck.padEnd(5)} ` +
          `${out.level.recordT} gegn ${out.level.recordC} · ` +
          `sigrar ${sgn(out.wins.diff)} [${sgn(out.wins.lo)},${sgn(out.wins.hi)}]` +
          `${out.wins.excludesZero ? "*" : " "} ${out.wins.wins}/${out.wins.years} · ` +
          `vika-v-viku ${(out.weekWinRate * 100).toFixed(1)}% · ` +
          `titlar ${(out.level.champT * 100).toFixed(1)}% gegn ${(out.level.champC * 100).toFixed(1)}%` +
          `${out.champ.excludesZero ? "*" : ""} · stig ${sgn(out.seasonPoints.diff, 0)}`);
        console.log(`${" ".repeat(27)}an hindsight-uppstillingar: sigrar ` +
          `${sgn(out.wfWins.diff)} [${sgn(out.wfWins.lo)},${sgn(out.wfWins.hi)}]` +
          `${out.wfWins.excludesZero ? "*" : ""}`);
      }
    }
  }

  /* ============================================================
     Q2 — STEFNURNAR: BREYTIST RODIN?
     ============================================================ */
  console.log(`\n${"=".repeat(78)}`);
  console.log("  Q2 BOKAD: STEFNU-RODIN I STIGUM. BREYTIST HUN I SIGRUM?");
  console.log("=".repeat(78));
  const bookedPpr = JSON.parse(await readFile(path.join(DATA, "strategy_ppr.json"), "utf8"));
  const bookedOrder = bookedPpr.strategies.map((s) => s.key);

  /* ============================================================
     HVERS VEGNA RODIN HER ER EKKI ALVEG SU BOKADA — MAELT, EKKI GISKAD
     ============================================================
     Adur en nokkud er sagt um "rodin breyttist" tharf ad vita hve mikid
     af muninum er MAELIKVARDINN og hve mikid er HERMIRINN. Ein
     mælanleg orsok liggur i lauginni sjalfri: `strategy-lab` draftar UR
     `features.json` EINGONGU og 12x14 draft tharf 168 leikmenn. Se
     laugin minni en thad ganga hoparnir UPP og sidustu umferdirnar
     skila ENGUM manni — sem er nakvaemlega thar sem stodu-aaetlun a ad
     borga sig eda ekki. Thetta er talid her og birt.                  */
  const bookedPoolDepth = {};
  {
    const need = (bookedPpr.teams || 12) * (bookedPpr.rounds || 14);
    for (const y of bookedPpr.seasons || []) {
      const n = feats.rows.filter((r) => r.season === y && r.scoring === "ppr"
        && r.adp != null).length;
      bookedPoolDepth[y] = { pool: n, need, short: Math.max(0, need - n) };
    }
    const shortYears = Object.entries(bookedPoolDepth).filter(([, v]) => v.short > 0);
    console.log(`  bokada stefnutaflan: laugin dugdi EKKI i ${shortYears.length} af ` +
      `${Object.keys(bookedPoolDepth).length} arum ` +
      `(${shortYears.map(([y, v]) => `${y} vantar ${v.short}`).join(", ") || "-"})`);
  }

  const q2 = {};
  const strategyYears = seasons;             // 2019-2025, sama regla og strategy-lab
  for (const sh of SHAPES) {
    const src = ADP_SRC[sh.fmt][0];
    const bpa = STRATEGIES.find((s) => s.key === "bpa");
    const rows = [];
    for (const st of STRATEGIES) {
      const treat = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]), plan: st.plan };
      const ctrl = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]), plan: bpa.plan };
      const perYear = {}, halfA = {}, halfB = {};
      for (const y of strategyYears) {
        /* KLOFID FRAEKORN: fruman er keyrd i TVENNU LAGI med ohadum
           fraekornum. Adaltalan er theirra summa (ekkert tapast) og
           helmingarnir gefa OKEYPIS maelingu a thvi hve AREIDANLEG
           rodun malikvardans er vid sjalfa sig. Rodun sem er ekki
           sjalfsamkvaem getur ekki "breyst" a marktaekan hatt — thad
           er sama rok og "areidanleiki er ekki gagnsemi" i
           FPL-verkefninu, bara hinum megin fra.                      */
        const A = runCell({ shape: sh, W: worlds[y], treat, ctrl,
          runs: SRUNS, seedBase: 400001, adpSrc: src });
        const B = runCell({ shape: sh, W: worlds[y], treat, ctrl,
          runs: SRUNS, seedBase: 900007, adpSrc: src });
        halfA[y] = cellStats(A);
        halfB[y] = cellStats(B);
        perYear[y] = cellStats(mergeAcc(A, B));
      }
      rows.push({
        key: st.key, label: st.label,
        leagues: Object.values(perYear).reduce((a, c) => a + c.leagues, 0),
        winsAbs: r3(mean(Object.values(perYear).map((c) => c.winsT))),
        weekPtsAbs: r1(mean(Object.values(perYear).map((c) => c.pfT))),
        seasonPtsAbs: r1(mean(Object.values(perYear).map((c) => c.seasonT))),
        champAbs: r3(mean(Object.values(perYear).map((c) => c.champT))),
        vsBpaWins: boot(perYear, "winsT", "winsC"),
        vsBpaSeason: boot(perYear, "seasonT", "seasonC"),
        vsBpaWeek: boot(perYear, "pfT", "pfC"),
        vsBpaChamp: boot(perYear, "champT", "champC"),
        splitA: { wins: r3(mean(Object.values(halfA).map((c) => c.winsT))),
                  season: r1(mean(Object.values(halfA).map((c) => c.seasonT))) },
        splitB: { wins: r3(mean(Object.values(halfB).map((c) => c.winsT))),
                  season: r1(mean(Object.values(halfB).map((c) => c.seasonT))) },
        perYear,
      });
    }

    /* --- rodanir og fylgni theirra --- */
    const orderBy = (k, dir = -1) => rows.slice()
      .sort((a, b) => dir * (a[k] - b[k])).map((r) => r.key);
    const rankMap = (order) => new Map(order.map((k, i) => [k, i + 1]));
    const common = rows.map((r) => r.key).filter((k) => bookedOrder.includes(k));
    const rankOfBooked = rankMap(bookedOrder);
    const cmp = (aKey, bKeyOrder) => {
      const A = rankMap(orderBy(aKey));
      return r3(spearman(common.map((k) => A.get(k)), common.map((k) => bKeyOrder.get(k))));
    };
    const rWins = rankMap(orderBy("winsAbs"));
    const rSeason = rankMap(orderBy("seasonPtsAbs"));
    const rWeek = rankMap(orderBy("weekPtsAbs"));
    const rChamp = rankMap(orderBy("champAbs"));
    const rSplitA = rankMap(rows.slice().sort((a, b) => b.splitA.wins - a.splitA.wins).map((r) => r.key));
    const rSplitB = rankMap(rows.slice().sort((a, b) => b.splitB.wins - a.splitB.wins).map((r) => r.key));
    const sSplitA = rankMap(rows.slice().sort((a, b) => b.splitA.season - a.splitA.season).map((r) => r.key));
    const sSplitB = rankMap(rows.slice().sort((a, b) => b.splitB.season - a.splitB.season).map((r) => r.key));
    const sp = (A, B) => r3(spearman(common.map((k) => A.get(k)), common.map((k) => B.get(k))));

    q2[sh.key] = {
      seasons: strategyYears,
      rows: rows.sort((a, b) => b.winsAbs - a.winsAbs),
      order: { byWins: orderBy("winsAbs"), bySeasonPoints: orderBy("seasonPtsAbs"),
               byWeekPoints: orderBy("weekPtsAbs"), byChamp: orderBy("champAbs"),
               booked: bookedOrder },
      rho: {
        winsVsSeasonPoints: sp(rWins, rSeason),
        winsVsWeekPoints: sp(rWins, rWeek),
        winsVsChamp: sp(rWins, rChamp),
        winsVsBooked: sp(rWins, rankOfBooked),
        seasonPointsVsBooked: sp(rSeason, rankOfBooked),
        /* SJALFSAREIDANLEIKI: sama malikvardi, tvo odháð fraekorn. */
        winsSelfReliability: sp(rSplitA, rSplitB),
        seasonSelfReliability: sp(sSplitA, sSplitB),
      },
      top3: { byWins: orderBy("winsAbs").slice(0, 3),
              bySeasonPoints: orderBy("seasonPtsAbs").slice(0, 3),
              booked: bookedOrder.slice(0, 3) },
      significantOnWins: rows.filter((r) => r.vsBpaWins.excludesZero).map((r) => r.key),
      significantOnPoints: rows.filter((r) => r.vsBpaSeason.excludesZero).map((r) => r.key),
      /* NULLID INNAN SJALFRAR TOFLUNNAR: `bpa`-rodin er medferd == vidmid.
         Hun VERDUR ad lesa nakvaemlega 0 a ollum thremur malikvordum.
         Thetta er sama nullprof og N1 en thad keyrir i SJALFRI
         maelingunni, ekki i serstakri lykkju vid hlidina a henni. */
      bpaSelfNull: (() => {
        const b = rows.find((r) => r.key === "bpa");
        return { winsDiff: b.vsBpaWins.diff, seasonDiff: b.vsBpaSeason.diff,
                 weekDiff: b.vsBpaWeek.diff, champDiff: b.vsBpaChamp.diff,
                 passed: b.vsBpaWins.diff === 0 && b.vsBpaSeason.diff === 0 &&
                         b.vsBpaWeek.diff === 0 && b.vsBpaChamp.diff === 0 };
      })(),
    };

    const Q = q2[sh.key];
    console.log(`\n  ${sh.label}`);
    console.log(`     ${"stefna".padEnd(34)}${"sigrar".padStart(8)}${"vs BPA".padStart(9)}` +
      `${"stig".padStart(9)}${"vs BPA".padStart(9)}${"titlar".padStart(8)}`);
    for (const r of Q.rows) {
      console.log(`     ${r.label.slice(0, 33).padEnd(34)}${r.winsAbs.toFixed(2).padStart(8)}` +
        `${sgn(r.vsBpaWins.diff).padStart(9)}${r.seasonPtsAbs.toFixed(0).padStart(9)}` +
        `${sgn(r.vsBpaSeason.diff, 0).padStart(9)}${(r.champAbs * 100).toFixed(1).padStart(7)}%`);
    }
    console.log(`     rho(sigrar, timabils-stig) = ${Q.rho.winsVsSeasonPoints}` +
      ` · rho(sigrar, vikustig) = ${Q.rho.winsVsWeekPoints}`);
    console.log(`     rho(sigrar, bokud rod) = ${Q.rho.winsVsBooked}` +
      ` · rho(stig, bokud rod) = ${Q.rho.seasonPointsVsBooked}`);
    console.log(`     SJALFSAREIDANLEIKI: sigrar ${Q.rho.winsSelfReliability}` +
      ` · stig ${Q.rho.seasonSelfReliability}`);
    console.log(`     marktaek gegn BPA — a sigrum: ` +
      `${Q.significantOnWins.length ? Q.significantOnWins.join(", ") : "ENGIN"}` +
      ` · a stigum: ${Q.significantOnPoints.length ? Q.significantOnPoints.join(", ") : "ENGIN"}`);
    console.log(`     bpa-rodin (medferd == vidmid) les ${Q.bpaSelfNull.winsDiff} sigra / ` +
      `${Q.bpaSelfNull.seasonDiff} stig -> ${Q.bpaSelfNull.passed ? "NULL STENST" : "NULL FELLUR"}`);
    if (!Q.bpaSelfNull.passed) {
      console.error("\n  NULLID INNAN TOFLUNNAR FELL — taflan er merkingarlaus.\n");
      process.exit(3);
    }
  }

  /* ============================================================
     Q3 — BJARGAR SIGRA-MAELIKVARDINN `prevCarG`?
     ============================================================
     README 4d: `prevCarG` maeldist +23,8 stig, t=2,286, 8/11 ar, CI
     [+3,7, +42,4] — OG placebo-thakid var +21,3, svo hun slapp yfir um
     +2,5. Hun var EKKI tengd. Spurningin her er ein: er svarid annad
     thegar maelikvardinn er SIGRAR?

     THRJU SKILYRDI, OLL THRJU, og thau eru thau somu og repo-id notar
     nu thegar (README 4c og 4d):
       1  per-LEIKMANNS bootstrap utilokar null (ekki per timabil)
       2  slaer PLACEBO-THAKID (ekki nullid)
       3  heldur walk-forward (val a fyrri arum eingongu)
     ============================================================ */
    console.log(`\n${"=".repeat(78)}`);
  /* HEITID VERDUR AD KOMA UR `Q3_VAR`. Fyrsta utgafa `--q3var` skildi
     thennan streng harkodadan og loggið sagdi thvi `prevCarG` medan
     `mktOwnHonest` var maelt — NAKVAEMLEGA villan sem README kafli 5
     bokar ("textinn i Experts sagdi ANNAD VAL en bordid notadi").
     Bokada samanburdartalan fylgir adeins thegar breytan ER su bokada. */
  console.log(`  Q3 BJARGAR SIGRA-MAELIKVARDINN \`${Q3_VAR}\`?` +
    (Q3_VAR === "prevCarG" ? " (README 4d: +23,8 stig, plsb-thak +21,3)" : ""));
  console.log("=".repeat(78));

  const q3Years = seasons;                 // 2019-2025, sama regla og Q2
  console.log(`  thekja \`${Q3_VAR}\`: ` + q3Years.map((y) =>
    `${y} ${worlds[y].coverage[`${Q3_VAR}InHead`]}/${worlds[y].coverage.projected}`).join(" · "));

  /* --- 3b-1 NULLHLIDID: w=0 VERDUR AD VERA SAMA BORD, LYKIL FYRIR LYKIL ---
     Tvennt er profad og hvorugt daemir hitt: (a) bordin eru borin saman
     BEINT (rod fyrir rod) og (b) duellid er keyrt og verdur ad lesa
     nakvaemlega 0. (a) an (b) vaeri prof a kóda; (b) an (a) gaeti verid
     satt af thvi ad tvo ólik bord skila somu utkomu i thessum drofttum.

     OG THRIDJI LIDURINN ER SENTINELINN, thvi "0 = 0" er einskis virdi
     nema synt se ad velin GETI lesid annad en 0 (CLAUDE.md 5b: thekja
     er fullyrding, ekki logga).

     STOKKBREYTT OG STADFEST 15.8.2026 — thrjar breytingar, thrjar
     olikar nidurstodur, og THAER ERU EKKI ALLAR THAER SEM BUIST VAR VID:
       M1  `tail.sort` snuid vid       -> bordamunur 9, duel 0.
           Bordasamanburdurinn EINN sa thetta. Duellid gerdi thad ekki
           thvi taglid er sjaldan draftad — (a) an (b) hefdi thagad.
       M2  taglsgolfid -1e5 -> -100    -> HLIDID SAGDI EKKERT, OG THAD
           VAR RETT: hausinn er z-stoðladur (sd=1) svo -100+ppg liggur
           enn langt undir honum og bordid er obreytt. Stokkbreyting sem
           breytir ENGU er ekki bilun i hlidinu.
       M3  0,02*placebo3 laett i hausinn vid w=0
                                       -> bordamunur 9, max|sigrar|
           0,125, max|stig| 21,5. Baðir lidir fellu, exit 3.
       M4  bordid latid hunsa `w` alveg -> bordamunur 0, duel 0, en
           SENTINEL 0 og hlidid FELL. Thetta er tilfellid thar sem
           nullprofid er fullkomlega graent OG maelir ekkert.          */
  const q3Null = { boardMismatches: 0, cells: 0, maxAbsWins: 0, maxAbsPts: 0,
                   sentinelMaxAbsWins: 0, passed: false };
  for (const sh of SHAPES) {
    for (const y of q3Years) {
      const W = worlds[y];
      const a = arankBoard(W, sh.fmt, repl[sh.key]);
      const b = oppBoard(W, sh.fmt, repl[sh.key], Q3_VAR, 0, null);
      if (a.size !== b.size) q3Null.boardMismatches++;
      else for (const [id, r] of a) if (b.get(id) !== r) { q3Null.boardMismatches++; break; }
      const acc = runCell({ shape: sh, W,
        treat: { board: (X) => oppBoard(X, sh.fmt, repl[sh.key], Q3_VAR, 0, null) },
        ctrl: { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) },
        runs: 1, seedBase: 5501, adpSrc: ADP_SRC[sh.fmt][0] });
      const c = cellStats(acc);
      q3Null.cells++;
      q3Null.maxAbsWins = Math.max(q3Null.maxAbsWins, Math.abs(c.winsDiff));
      q3Null.maxAbsPts = Math.max(q3Null.maxAbsPts, Math.abs(c.seasonDiff));
    }
  }

  /* HELMINGURINN SEM ER ODYR ER PROFADUR STRAX — thad er engin astaeda
     til ad eyda fjorum minutum i grid sem er thegar merkingarlaust.
     Sentinel-helmingurinn tharf gridid og er profadur a eftir thvi.  */
  if (q3Null.boardMismatches || q3Null.maxAbsWins !== 0 || q3Null.maxAbsPts !== 0) {
    console.error(`\n  Q3-NULLHLIDID FELL STRAX: bordamunur ${q3Null.boardMismatches} · ` +
      `max|sigrar| ${q3Null.maxAbsWins} · max|stig| ${q3Null.maxAbsPts}`);
    await writeOut({ gate: false, nullTest, accounting: acct, seatSpread, anchors,
      q1, q2, q3: { nullGate: q3Null }, note:
      "Q3-NULLHLIDID FELL. w=0 er ekki sama bord og A-Ranking, svo hver Q3-tala " +
      "vaeri maeling a bordamun sem enginn bad um." });
    process.exit(3);
  }

  /* ============================================================
     Q3-GRIDID
     ============================================================
     9 breytur (1 raunveruleg + 8 placebo) x 10 vogir x 3 svid x 3
     lognun x 7 timabil. Hver reitur skilar BAEDI sigra-mun og
     stiga-mun ur SOMU drofttum.                                       */
  const q3grid = {};
  const q3Started = Date.now();
  let q3cells = 0;
  for (const sh of SHAPES) {
    const src = ADP_SRC[sh.fmt][0];
    q3grid[sh.key] = {};
    for (const sc of Q3_SCOPES) {
      q3grid[sh.key][sc.key] = {};
      for (const vk of Q3_VARS) {
        q3grid[sh.key][sc.key][vk] = {};
        for (const w of Q3_NONZERO) {
          const perW = {}, perP = {}, perC = {}, perPo = {};
          for (const y of q3Years) {
            const c = cellStats(runCell({ shape: sh, W: worlds[y],
              treat: { board: (X) => oppBoard(X, sh.fmt, repl[sh.key], vk, w, sc.n) },
              ctrl: { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) },
              runs: Q3RUNS, seedBase: 6607, adpSrc: src }));
            perW[y] = c.winsDiff; perP[y] = c.seasonDiff;
            perC[y] = c.champT - c.champC; perPo[y] = c.poRateT - c.poRateC;
            q3Null.sentinelMaxAbsWins = Math.max(q3Null.sentinelMaxAbsWins, Math.abs(c.winsDiff));
          }
          q3grid[sh.key][sc.key][vk][w] = { wins: perW, pts: perP, champ: perC, po: perPo };
          q3cells++;
        }
      }
    }
    console.log(`  ${sh.key} · ${q3cells} reitir · ${Math.round((Date.now() - q3Started) / 1000)} s`);
  }

  /* HLIDID SJALFT MA EKKI VERA TOMT. Segdi nullhlidid "0" af thvi ad
     VELIN les alltaf 0 vaeri thad tom fullyrding — nakvaemlega gildran
     sem CLAUDE.md 5b lysir. `sentinelMaxAbsWins` er staersti munur sem
     einhver vog OG einhver breyta naer i sama neti; se hann 0 getur
     nullhlidid ekki brugdist og keyrslan deyr. */
  q3Null.passed = q3Null.boardMismatches === 0 && q3Null.maxAbsWins === 0 &&
                  q3Null.maxAbsPts === 0 && q3Null.sentinelMaxAbsWins > 0;
  console.log(`  Q3-NULLHLID: ${q3Null.cells} frumur · bordamunur ${q3Null.boardMismatches} · ` +
    `max|sigrar| ${q3Null.maxAbsWins} · max|stig| ${q3Null.maxAbsPts} · ` +
    `sentinel (velin SER mun) ${r3(q3Null.sentinelMaxAbsWins)} -> ` +
    `${q3Null.passed ? "STENST" : "FELLUR"}`);
  if (!q3Null.passed) {
    await writeOut({ gate: false, nullTest, accounting: acct, seatSpread, anchors,
      q1, q2, q3: { nullGate: q3Null }, note:
      "Q3-NULLHLIDID FELL. w=0 er ekki sama bord og A-Ranking (eda velin ser " +
      "engan mun yfirleitt) og hver Q3-tala er merkingarlaus." });
    console.error("\n  Q3-NULLHLIDID FELL — skrifa EKKERT nema hlidid.\n");
    process.exit(3);
  }

  /* ---------- POOLING: OSAMHVERFI LIDURINN ----------
     `opp-lab` skjalar hvers vegna medaltal yfir ALLAR vogir er RANGT i
     tvihlida gridi: fyrir einraent merki eyda +w og -w hvor odrum.
     Retta sundurlidunin er
        samhverfur  = (E[w>0] + E[w<0]) / 2   — hvad truflunin SJALF gerir
        osamhverfur = (E[w>0] - E[w<0]) / 2   — ATTIN, eina talan sem
                                                getur verid merki       */
  const q3cellsOf = (vk, metric, keep) => {
    const acc = Object.fromEntries(q3Years.map((y) => [y, []]));
    for (const sh of SHAPES) for (const sc of Q3_SCOPES) for (const w of Q3_NONZERO) {
      if (keep && !keep({ shape: sh.key, scope: sc.key, w })) continue;
      const per = q3grid[sh.key][sc.key][vk][w][metric];
      for (const y of q3Years) if (per[y] != null) acc[y].push(per[y]);
    }
    const out = {};
    for (const y of q3Years) if (acc[y].length) out[y] = mean(acc[y]);
    return out;
  };
  const q3Directional = (vk, metric, keep) => {
    const pos = q3cellsOf(vk, metric, (c) => c.w > 0 && (!keep || keep(c)));
    const neg = q3cellsOf(vk, metric, (c) => c.w < 0 && (!keep || keep(c)));
    const out = {};
    for (const y of q3Years) if (pos[y] != null && neg[y] != null) out[y] = (pos[y] - neg[y]) / 2;
    return out;
  };

  /* ---------- PLACEBO-THAKID ----------
     Atta placebo-breytur gefa atta pooled osamhverf gildi. Thakid er
     FORSPABIL FYRIR EITT NYTT FRAEKAST, ekki stadalvilla medaltalsins:
     spurningin er hvort raunveruleg breyta se GREINANLEG fra einu
     kasti af sudi, ekki hvar sud-medaltalid liggur. Sama formula og
     `opp-lab` notar.                                                   */
  const T_TAB = { 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306 };
  const placeboCeiling = (metric, keep) => {
    const st = Q3_PLACEBOS.map((k) => bootZero(q3Directional(k, metric, keep)));
    const ms = st.map((q) => q.mean).filter((x) => x != null);
    if (ms.length < 3) return { n: ms.length, mean: null, sd: null, lo: null, hi: null,
      max: null, min: null, maxAbsT: null, significant: null, each: [],
      why: "faerri en 3 placebo-gildi — ENGIN nulldreifing" };
    const m = mean(ms);
    const sd = Math.sqrt(mean(ms.map((x) => (x - m) ** 2)) * ms.length /
                         Math.max(1, ms.length - 1));
    const tp = T_TAB[Math.max(3, Math.min(8, ms.length - 1))] || 2.306;
    const half = tp * sd * Math.sqrt(1 + 1 / ms.length);
    return { n: ms.length, mean: r3(m), sd: r3(sd),
             lo: r3(m - half), hi: r3(m + half),
             max: r3(Math.max(...ms)), min: r3(Math.min(...ms)),
             maxAbsT: r3(Math.max(...st.map((q) => Math.abs(q.t ?? 0)))),
             significant: st.filter((q) => q.excludesZero).length,
             each: st.map((q, i) => ({ key: Q3_PLACEBOS[i], mean: q.mean, t: q.t,
                                       wins: q.wins, years: q.years })) };
  };

  /* ---------- EIN TALA PER BREYTU, A BADUM MAELIKVORDUM ---------- */
  const q3StatOf = (vk) => {
    const dirW = bootZero(q3Directional(vk, "wins"));
    const dirP = bootZero(q3Directional(vk, "pts"));
    const byMag = Q3_MAGS.map((m) =>
      r3(bootZero(q3Directional(vk, "wins", (c) => Math.abs(c.w) === m)).mean));
    let mUp = 0;
    for (let i = 1; i < byMag.length; i++) if (Math.abs(byMag[i]) > Math.abs(byMag[i - 1])) mUp++;
    return {
      wins: dirW, points: dirP,
      champ: bootZero(q3Directional(vk, "champ")),
      playoffs: bootZero(q3Directional(vk, "po")),
      symmetricWins: bootZero(q3cellsOf(vk, "wins")),
      symmetricPoints: bootZero(q3cellsOf(vk, "pts")),
      byScope: Object.fromEntries(Q3_SCOPES.map((sc) =>
        [sc.key, bootZero(q3Directional(vk, "wins", (c) => c.scope === sc.key))])),
      byScopePoints: Object.fromEntries(Q3_SCOPES.map((sc) =>
        [sc.key, bootZero(q3Directional(vk, "pts", (c) => c.scope === sc.key))])),
      byShape: Object.fromEntries(SHAPES.map((sh) =>
        [sh.key, bootZero(q3Directional(vk, "wins", (c) => c.shape === sh.key))])),
      byMagnitude: Object.fromEntries(Q3_MAGS.map((m, i) => [m, byMag[i]])),
      magnitudeMonotoneSteps: mUp,
    };
  };
  const q3Var = q3StatOf(Q3_VAR);
  const q3Plc = Object.fromEntries(Q3_PLACEBOS.map((k) => [k, q3StatOf(k)]));
  const ceilWins = placeboCeiling("wins");
  const ceilPts = placeboCeiling("pts");
  const ceilByScope = Object.fromEntries(Q3_SCOPES.map((sc) =>
    [sc.key, placeboCeiling("wins", (c) => c.scope === sc.key)]));

  /* HEIMILDASKIPTINGIN — README 4d varnagli 2: `prevCarG` var omarktaek
     i theirri spaheimild sem appid raunverulega notar (Sleeper
     2021-25). Her eru adeins TVO FFToday-ar (2019-20) svo skiptingin er
     BIRT EN EKKI PROFUD — tvo ar bera engin vikmork og thad er sagt. */
  const subYears = (per, keep) => Object.fromEntries(
    Object.entries(per).filter(([y]) => keep(Number(y))));
  const dirWins = q3Directional(Q3_VAR, "wins");
  const dirPts = q3Directional(Q3_VAR, "pts");
  const q3Era = {
    sleeper: { wins: bootZero(subYears(dirWins, (y) => y >= 2021)),
               points: bootZero(subYears(dirPts, (y) => y >= 2021)) },
    fftoday: { wins: bootZero(subYears(dirWins, (y) => y < 2021)),
               points: bootZero(subYears(dirPts, (y) => y < 2021)) },
    note: "adeins 2019-2020 eru FFToday-ar her (vikugogn byrja 2019), svo " +
      "sa helmingur ber TVO ar og engin vikmork. BIRT SEM SAMHENGI.",
  };

  console.log(`\n  ${"breyta".padEnd(12)}${"sigrar".padStart(9)}${"t".padStart(8)}` +
    `${"ar".padStart(7)}${"95% CI (ars-klasad)".padStart(22)}${"stig".padStart(9)}${"t".padStart(8)}`);
  const showRow = (name, q) => console.log(`  ${name.padEnd(12)}` +
    `${sgn(q.wins.mean, 3).padStart(9)}${String(q.wins.t).padStart(8)}` +
    `${(q.wins.wins + "/" + q.wins.years).padStart(7)}` +
    `${`[${sgn(q.wins.lo, 3)}, ${sgn(q.wins.hi, 3)}]`.padStart(22)}` +
    `${sgn(q.points.mean, 1).padStart(9)}${String(q.points.t).padStart(8)}`);
  showRow(Q3_VAR, q3Var);
  for (const k of Q3_PLACEBOS) showRow(k, q3Plc[k]);
  console.log(`  PLACEBO-THAK (sigrar): medaltal ${sgn(ceilWins.mean, 3)} · sd ${ceilWins.sd} · ` +
    `haest ${sgn(ceilWins.max, 3)} · forspabil [${sgn(ceilWins.lo, 3)}, ${sgn(ceilWins.hi, 3)}] · ` +
    `haesta |t| ${ceilWins.maxAbsT} · ${ceilWins.significant} af 8 "marktaek"`);
  console.log(`  PLACEBO-THAK (stig)  : medaltal ${sgn(ceilPts.mean, 1)} · ` +
    `forspabil [${sgn(ceilPts.lo, 1)}, ${sgn(ceilPts.hi, 1)}] · haesta |t| ${ceilPts.maxAbsT}`);
  console.log(`  ${Q3_VAR} per svid (sigrar): ` + Q3_SCOPES.map((sc) =>
    `${sc.key} ${sgn(q3Var.byScope[sc.key].mean, 3)} (thak ${sgn(ceilByScope[sc.key].hi, 3)})`).join(" · "));
  console.log(`  ${Q3_VAR} heimildaskipting: sleeper 2021-25 ${sgn(q3Era.sleeper.wins.mean, 3)} ` +
    `(${q3Era.sleeper.wins.wins}/${q3Era.sleeper.wins.years}) · ` +
    `fftoday 2019-20 ${sgn(q3Era.fftoday.wins.mean, 3)} (${q3Era.fftoday.wins.wins}/${q3Era.fftoday.wins.years})`);

  /* ---------- WALK-FORWARD ----------
     Fyrir hvert ar er (vog, svid) valid A ARUNUM A UNDAN og beitt a
     arid sjalft. Keyrt TVISVAR: a raunverulegu breytunni og a
     PLACEBOUNUM EINGONGU — leit yfir gagnslaus afbrigdi getur lika
     "valid" eitthvad sem virkar naesta ar af tilviljun, og su tala er
     thad sem raunverulega breytan verdur ad sla.                      */
  const q3Wf = (vars, metric) => {
    const cands = [];
    for (const sh of SHAPES) for (const sc of Q3_SCOPES) for (const vk of vars)
      for (const w of Q3_NONZERO) {
        cands.push({ label: `${vk} w=${w} ${sc.key} ${sh.key}`,
                     per: q3grid[sh.key][sc.key][vk][w][metric] });
      }
    const per = {}, chosen = {};
    for (let i = 1; i < q3Years.length; i++) {
      const y = q3Years[i], prior = q3Years.slice(0, i);
      let best = null;
      for (const c of cands) {
        const vals = prior.map((p) => c.per[p]).filter((x) => x != null);
        if (vals.length < prior.length) continue;
        const m = mean(vals);
        if (best == null || m > best.m) best = { m, c };
      }
      if (!best || best.c.per[y] == null) continue;
      per[y] = best.c.per[y];
      chosen[y] = best.c.label;
    }
    return { ...bootZero(per), chosen, candidates: cands.length };
  };
  const wfVar = q3Wf([Q3_VAR], "wins");
  const wfPlc = q3Wf(Q3_PLACEBOS, "wins");
  const wfVarPts = q3Wf([Q3_VAR], "pts");
  const wfPlcPts = q3Wf(Q3_PLACEBOS, "pts");
  console.log(`  walk-forward (sigrar): ${Q3_VAR} ${sgn(wfVar.mean, 3)} ` +
    `(${wfVar.wins}/${wfVar.years}, t=${wfVar.t}) · placebo-leit ${sgn(wfPlc.mean, 3)} ` +
    `(${wfPlc.wins}/${wfPlc.years})`);
  console.log(`  walk-forward (stig)  : ${Q3_VAR} ${sgn(wfVarPts.mean, 1)} ` +
    `(${wfVarPts.wins}/${wfVarPts.years}) · placebo-leit ${sgn(wfPlcPts.mean, 1)} ` +
    `(${wfPlcPts.wins}/${wfPlcPts.years})`);

  /* ---------- PER-LEIKMANNS BOOTSTRAP ----------
     README 4c: ars-klasada bootstrappid endursynir ARIN en heldur
     leikmanna-lauginni fastri, svo thad getur ekki sed ad ollu
     nidurstadan hvili a thvi HVADA ~170 leikmenn voru draftanlegir.
     Her er laugin endursynd.

     HVAD ER KEYRT OG HVERS VEGNA EKKI ALLT: ein itrun med ollu gridinu
     (9 breytur x 10 vogir x 3 svid x 3 lognun x 7 ar) vaeri ~8.500
     deildir og keyrslan tharf hundrud itrana. Bootstrappid er thvi
     keyrt a HEADLINE-STILLINGUNNI: svid `all`, |w| = 0,10, osamhverfi
     lidurinn, pooled yfir badar lognur og oll ar — og THAD ER SAMA TALA
     og reiturinn `byScope.all` vid |w|=0,10 i toflunni ad ofan.
     Placebo1 fer gegnum NAKVAEMLEGA sama bootstrap svo synilegt se ad
     velin lesi ekki jakvaett a sudi.                                  */
  const pBootVars = [Q3_VAR, "placebo1"];
  const pAcc = Object.fromEntries(pBootVars.map((k) => [k, []]));
  const pPoint = {};
  for (const vk of pBootVars) {
    const per = {};
    for (const y of q3Years) {
      const vals = [];
      for (const sh of SHAPES) {
        const a = q3grid[sh.key].all[vk][0.10].wins[y];
        const b = q3grid[sh.key].all[vk][-0.10].wins[y];
        if (a != null && b != null) vals.push((a - b) / 2);
      }
      if (vals.length) per[y] = mean(vals);
    }
    pPoint[vk] = bootZero(per);
  }
  console.log(`\n  per-leikmanns bootstrap (${PBOOT} itranir, laugin endursynd) …`);
  const pT0 = Date.now();
  for (let b = 0; b < PBOOT; b++) {
    const acc = Object.fromEntries(pBootVars.map((k) => [k, []]));
    for (const sh of SHAPES) {
      const src = ADP_SRC[sh.fmt][0];
      for (const y of q3Years) {
        const RW = resampleWorld(worlds[y], sh.fmt, (y * 100003 + b * 7919 + 17) >>> 0);
        for (const vk of pBootVars) {
          const d = [];
          for (const w of [0.10, -0.10]) {
            const c = cellStats(runCell({ shape: sh, W: RW,
              treat: { board: (X) => oppBoard(X, sh.fmt, repl[sh.key], vk, w, null) },
              ctrl: { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) },
              runs: 1, seedBase: (7001 + b * 104729) >>> 0, adpSrc: src }));
            d.push(c.winsDiff);
          }
          acc[vk].push((d[0] - d[1]) / 2);
        }
      }
    }
    for (const vk of pBootVars) pAcc[vk].push(mean(acc[vk]));
    if (b === 0) {
      const est = Math.round((Date.now() - pT0) / 1000 * PBOOT);
      console.log(`     ~${est} s aaetlad`);
    }
  }
  const playerBoot = {};
  for (const vk of pBootVars) {
    const s = pAcc[vk].slice().sort((a, b) => a - b);
    const lo = s[Math.floor(s.length * 0.025)], hi = s[Math.floor(s.length * 0.975)];
    playerBoot[vk] = { point: pPoint[vk].mean, seasonClusteredCi: [pPoint[vk].lo, pPoint[vk].hi],
      seasonClusteredExcludesZero: pPoint[vk].excludesZero,
      iters: s.length, lo: r3(lo), hi: r3(hi), median: r3(s[Math.floor(s.length * 0.5)]),
      excludesZero: lo > 0 || hi < 0 };
    console.log(`     ${vk.padEnd(12)} punktur ${sgn(pPoint[vk].mean, 3)} · ` +
      `per-leikmanns 95% CI [${sgn(playerBoot[vk].lo, 3)}, ${sgn(playerBoot[vk].hi, 3)}]` +
      ` -> ${playerBoot[vk].excludesZero ? "UTILOKAR NULL" : "inniheldur null"}` +
      `  (ars-klasad [${sgn(pPoint[vk].lo, 3)}, ${sgn(pPoint[vk].hi, 3)}])`);
  }

  /* ---------- DOMURINN — REIKNADUR, EKKI SKRIFADUR ---------- */
  const q3Verdict = {
    criterion1_playerBootstrapExcludesZero: playerBoot[Q3_VAR].excludesZero,
    criterion2_beatsPlaceboCeiling: q3Var.wins.mean > ceilWins.hi,
    criterion3_walkForward: wfVar.mean > 0 && wfVar.mean > wfPlc.mean,
    marginOverCeiling: r3(q3Var.wins.mean - ceilWins.hi),
    rescued: false,
  };
  q3Verdict.rescued = q3Verdict.criterion1_playerBootstrapExcludesZero &&
                      q3Verdict.criterion2_beatsPlaceboCeiling &&
                      q3Verdict.criterion3_walkForward;
  console.log(`\n  DOMUR: (1) per-leikmanns CI ${q3Verdict.criterion1_playerBootstrapExcludesZero ? "JA" : "NEI"}` +
    ` · (2) yfir placebo-thaki ${q3Verdict.criterion2_beatsPlaceboCeiling ? "JA" : "NEI"}` +
    ` (bord ${sgn(q3Verdict.marginOverCeiling, 3)} sigrar)` +
    ` · (3) walk-forward ${q3Verdict.criterion3_walkForward ? "JA" : "NEI"}` +
    `  ->  ${q3Verdict.rescued ? "SIGRAR BJARGA HENNI" : "SIGRAR BJARGA HENNI EKKI"}`);

  const q3 = {
    question: "Bjargar thad ad skipta ur STIGUM i SIGRA einhverri hugmynd sem " +
      `var hafnad? Maeld breyta: \`${Q3_VAR}\`. Bokadi frambjodandinn er \`prevCarG\` ` +
      "(README 4d: +23,8 stig gegn placebo-thaki +21,3).",
    design: {
      treatment: `A-Ranking bordid endurradad eftir \`z(VBD) + w * z(${Q3_VAR})\`, ` +
        "z INNAN STODU fyrir breytuna og yfir hausinn fyrir VBD — ordrett " +
        "regla `opp-lab.mjs`. Taglid (their sem eiga enga spa) er ohreyft.",
      control: "hreint A-Ranking bordid. z-stodlun a VBD er einraen umbreyting " +
        "svo w=0 gefur NAKVAEMLEGA sama bord — profad lykil fyrir lykil.",
      weights: Q3_WEIGHTS,
      scopes: Q3_SCOPES.map((s) => s.key),
      seasons: q3Years,
      runsPerCell: Q3RUNS,
      leaguesPerCellSeason: "T x 2 (oll saetapor, spegluð) x runs",
      placebos: `${Q3_PLACEBOS.length} deterministiskar sud-breytur gegnum ` +
        "NAKVAEMLEGA sama grid — nulldreifingin er MAELD, ekki formula",
      pooling: "osamhverfi lidurinn (E[w>0] - E[w<0])/2 per timabili, medaltal " +
        "yfir vogir x svid x lognun. Samhverfi lidurinn er birtur ser: hann er " +
        "thad sem TRUFLUNIN SJALF gerir og hann er ekki merki.",
      ceiling: "forspabil fyrir EITT NYTT placebo-fraekast (medaltal +- t * sd * " +
        "sqrt(1+1/n)) — ekki stadalvilla medaltalsins",
      playerBootstrap: `${PBOOT} itranir, laugin endursynd MED ENDURTEKNINGU ` +
        "(klonun faer nytt id, sama laug fyrir BADI bordin) a headline-" +
        "stillingunni: svid `all`, |w|=0,10, badar lognur, oll ar",
    },
    nullGate: q3Null,
    coverage: Object.fromEntries(q3Years.map((y) => [y,
      { head: worlds[y].coverage.projected,
        withVariable: worlds[y].coverage[`${Q3_VAR}InHead`], variable: Q3_VAR }])),
    variable: q3Var, placebos: q3Plc,
    placeboCeiling: { wins: ceilWins, points: ceilPts, byScope: ceilByScope },
    era: q3Era,
    walkForward: { wins: wfVar, winsPlacebo: wfPlc, points: wfVarPts, pointsPlacebo: wfPlcPts },
    playerBootstrap: playerBoot,
    verdict: q3Verdict,
    /* GRIDID ER AUDITTRAILID og thad fer i skrana: hver pooled tala her ad
       ofan er leidd ur thvi og verdur ad vera endurreiknanleg. EN hráar
       fleytitolur (0,10416666666666667) threfalda skrana an thess ad baeta
       EINNI marktaekri tolu vid. Rundad a fjora aukastafi VID SKRIF; hver
       einasti utreikningur her ad ofan notar full nakvaemni.
       `opp-lab` skjalar hina hlidina a thessu: hun bar era-skiptingu PER REIT
       sem enginn las og skráin var 4 MB. Munurinn er ad gridid ER lesid. */
    grid: JSON.parse(JSON.stringify(q3grid, (k, v) =>
      (typeof v === "number" && !Number.isInteger(v) ? Math.round(v * 1e4) / 1e4 : v))),
  };

  /* ============================================================
     NAEMNI — FJOGUR LID I URSLITAKEPPNI I STAD SEX
     ============================================================ */
  const poSens = {};
  for (const sh of SHAPES) {
    const src = ADP_SRC[sh.fmt][0];
    const arank = { board: (X) => arankBoard(X, sh.fmt, repl[sh.key]) };
    const ctrl = { board: (X) => adpBoard(X, src) };
    const perYear = {};
    for (const y of projYears) {
      perYear[y] = cellStats(runCell({ shape: sh, W: worlds[y], treat: arank, ctrl,
        runs: 2, seedBase: 101, adpSrc: src, poTeams: 4, poWeeks: [16, 17] }));
    }
    poSens[sh.key] = { champ: boot(perYear, "champT", "champC"),
                       playoffs: boot(perYear, "poRateT", "poRateC"), perYear };
  }

  /* ============================================================
     RAUNVERULEIKA-AKKERI — ER HERMDA DEILDIN LIK RAUNVERULEGRI?
     ============================================================
     EINA lokna deildin sem vid EIGUM er Patriots 2025 (raunsvar
     Sleeper, ordrett i `tests/standings.mjs`). `ppts` i thvi svari er
     BESTA MOGULEGA byrjunarlidid, sem er nakvaemlega thad sem
     `oracleLineup` reiknar — thvi er thad sambaerilega talan, ekki
     `fpts`. Thetta er SAMHENGI OG EKKI HLID: hermda deildin ber hvorki
     spyrnumenn ne varnir og engan waiver, svo hun A ad liggja lagra.  */
  const realWins = [8, 7, 7, 5, 10, 8, 7, 6, 5, 7];
  const realPpts = [1987.64, 2022.62, 1780.06, 1777.26, 2291.40,
                    2126.94, 2094.02, 2010.26, 1940.94, 2131.66];
  const sdOf = (a) => Math.sqrt(mean(a.map((x) => (x - mean(a)) ** 2)));
  const simWinsSd = [], simPfMean = [], simPfSd = [];
  {
    const sh = SHAPES[0];                    // Patriots-lognin
    const T = sh.league.teams;
    for (const y of projYears) {
      const W = worlds[y];
      const board = arankBoard(W, sh.fmt, repl[sh.key]);
      const seed = (55 + W.y * 7919) >>> 0;
      const field = adpBoard(W, "adpPpr", rngOf(seed));
      const schedule = roundRobin(T, REG_WEEKS, rngOf(seed ^ 0x5bf03635));
      const boards = new Array(T + 1).fill(field);
      boards[3] = board;                     // eitt lid med A-Ranking, eins og i raun
      const draft = simulateDraft({ board: field, fieldBoard: field,
        actual: W.actual[sh.fmt], slot: 1, league: sh.league, boards });
      const S = scoreLeague({ rosters: draft.rosters, byWeek: W.byWeek[sh.fmt],
        league: sh.league, schedule, regWeeks: REG_WEEKS,
        playoffWeeks: PO_WEEKS, playoffTeams: PO_TEAMS });
      const w = S.rec.slice(1).map((x) => x.w + x.t / 2);
      const pf = S.rec.slice(1).map((x) => x.pf);
      simWinsSd.push(sdOf(w)); simPfMean.push(mean(pf)); simPfSd.push(sdOf(pf));
    }
  }
  /* HVE MIKID AF STIGA-BILINU ER SPYRNUMADURINN? Reiknad ur SOMU
     vikuskram — spyrnumenn eru i `data/weekly/`, thott their seu utan
     draftsins. K sem endar i saeti 10 a stigum yfir timabilid er sa
     sem 10-lida deild myndi eiga; medaltal hans per viku x 14 er
     framlagid sem hermda deildin ber EKKI. Vornina er ekki haegt ad
     reikna — `data/weekly/` ber enga DST — og thad er sagt.          */
  const kickerGap = (() => {
    const per = [];
    for (const y of projYears) {
      const tot = new Map();
      for (const r of weekly[y]) {
        if (r.pos !== "K" || r.week > REG_WEEKS) continue;
        tot.set(r.id, (tot.get(r.id) || 0) + (r.ppr ?? 0));
      }
      const sorted = [...tot.values()].sort((a, b) => b - a);
      per.push(mean(sorted.slice(0, 10)));       // 10 lid = 10 spyrnumenn
    }
    return r1(mean(per));
  })();
  const realism = {
    real: { league: "Patriots SB champs 2025 (raunsvar Sleeper, tests/standings.mjs)",
            wins: realWins, winsSd: r2(sdOf(realWins)),
            optimalPoints: { mean: r1(mean(realPpts)), sd: r1(sdOf(realPpts)),
                             min: r1(Math.min(...realPpts)), max: r1(Math.max(...realPpts)) },
            note: "`ppts` = besta mogulega byrjunarlid, vikur 1-14, MED K og DEF" },
    simulated: { winsSd: r2(mean(simWinsSd)), pointsMean: r1(mean(simPfMean)),
                 pointsSd: r1(mean(simPfSd)), seasons: projYears },
    pointsGap: r1(mean(realPpts) - mean(simPfMean)),
    kickerContribution: kickerGap,
    isGate: false,
    why: "hermda deildin ber hvorki K/DEF ne waiver-hreyfingu, svo hun A ad " +
         "liggja lagra i stigum. Spyrnumadurinn einn er maelanlegur ur somu " +
         "gognum; vornin er thad ekki (data/weekly ber enga DST). Bilid sem " +
         "eftir stendur er vorn + waiver og er EKKI fullyrding um hvorugt.",
  };
  console.log(`\n  raunveruleika-akkeri: sigra-sd raun ${realism.real.winsSd} ` +
    `gegn hermt ${realism.simulated.winsSd} · stig raun ` +
    `${realism.real.optimalPoints.mean} gegn hermt ${realism.simulated.pointsMean} ` +
    `(bil ${realism.pointsGap}, thar af spyrnumadur ${kickerGap})`);

  /* ============================================================
     SKRIFA
     ============================================================ */
  const secs = Math.round((Date.now() - t0) / 100) / 10;
  const verdict = buildVerdict({ q1, q2, anchors, q3 });
  console.log(`\n${"=".repeat(78)}`);
  for (const line of verdict.lines) console.log(`  ${line}`);
  console.log("=".repeat(78));

  await writeOut({
    gate: true, nullTest, accounting: acct, seatSpread, anchors,
    q1, q2, q3, playoffSensitivity: poSens, realism, verdict, bookedPoolDepth,
    coverage: Object.fromEntries(seasons.map((y) => [y, worlds[y].coverage])),
    sumCheck, shapeGuard, projYears, seasons, runtimeSec: secs,
  });
  /* SKRAARHEITID ER LESID UR `OUT_FILE`, ekki harkodad. Fyrsta utgafa
     `--out` skildi thennan streng eftir og loggið sagdi thvi
     "h2h.json" medan skrifad var i "h2h_mkt.json" — tala med rangri
     slod er osamanburdarhaef (sama regla og `DEAD_GAMES` i 4e). */
  console.log(`\n-> data/measure/${OUT_FILE}  (${secs} s)`);
}

function buildVerdict({ q1, q2, anchors, q3 }) {
  const lines = [];
  const q1cells = [];
  for (const [sk, byS] of Object.entries(q1)) {
    for (const [src, cells] of Object.entries(byS)) {
      const c = cells.adp;
      q1cells.push({ shape: sk, src, wins: c.wins, champ: c.champ,
                     points: c.seasonPoints });
    }
  }
  const winsPos = q1cells.filter((c) => c.wins.diff > 0).length;
  const winsSig = q1cells.filter((c) => c.wins.excludesZero).length;
  const champPos = q1cells.filter((c) => c.champ.diff > 0).length;
  lines.push(`Q1 A-Ranking gegn ADP: jakvaett a SIGRUM i ${winsPos} af ${q1cells.length} ` +
    `frumum, marktaekt i ${winsSig}. Titlar jakvaedir i ${champPos}.`);
  const orderChanged = [];
  for (const [sk, Q] of Object.entries(q2)) {
    const same = Q.order.byWins.join(",") === Q.order.bySeasonPoints.join(",");
    orderChanged.push(`${sk}: rho(sigrar,stig)=${Q.rho.winsVsSeasonPoints}` +
      `${same ? " (NAKVAEMLEGA sama rod)" : ""}` +
      `, sjalfsareidanleiki sigra ${Q.rho.winsSelfReliability}`);
  }
  lines.push(`Q2 stefnu-rodin: ${orderChanged.join(" | ")}`);

  /* ============================================================
     SAMANBURDUR SEM SKER UR — OG HANN ER SJALFUR MAELDUR
     ============================================================
     "Rodin breyttist" er merkingarlaust nema thrjar tolur seu bornar
     saman i einu:
       A  rho(sigrar, stig)  — I SOMU DROFTUM. Hreint metrik-áhrif.
       B  rho(stig, bokud rod) — SOMU stig, annar hermir. Hreint
          hermis-áhrif (og thad er EKKI null).
       C  sjalfsareidanleiki sigra — thakid a thvi hve mikid A getur
          verid ann annad en havadi.
     Se A HAERRA en B thá faerdi mælikvardinn rodina MINNA en munurinn
     a herminum gerdi, og "punktar voru nothaef nálgun" er nidurstada,
     ekki uppgjof.                                                    */
  const cmp = Object.entries(q2).map(([sk, Q]) => ({
    shape: sk,
    metricEffect: Q.rho.winsVsSeasonPoints,
    harnessEffect: Q.rho.seasonPointsVsBooked,
    ceiling: Q.rho.winsSelfReliability,
    metricMovesLess: Q.rho.winsVsSeasonPoints > Q.rho.seasonPointsVsBooked,
  }));
  const nLess = cmp.filter((c) => c.metricMovesLess).length;
  lines.push(`Q2 rho(sigrar,stig) er HAERRA en rho(stig,bokud) i ${nLess} af ` +
    `${cmp.length} logunum — thad ad skipta um MAELIKVARDA faerir rodina ` +
    "minna en thad ad skipta um HERMI.");
  /* HVAD ER MARKTAEKT, OG I HVORA ATT? Ad segja "ein stefna er
     marktaek" er ekki nog: se hver einasta marktaeka stefna NEIKVAED
     er nidurstadan "thad er haegt ad maela hvad ma EKKI gera, ekki
     hvad a ad gera" — og hun er allt onnur setning.               */
  const dirs = { posWins: [], posPoints: [], negWins: [], negPoints: [] };
  for (const [sk, Q] of Object.entries(q2)) {
    const rows = Object.fromEntries(Q.rows.map((r) => [r.key, r]));
    for (const k of Q.significantOnWins) {
      (rows[k].vsBpaWins.diff > 0 ? dirs.posWins : dirs.negWins).push(`${sk}/${k}`);
    }
    for (const k of Q.significantOnPoints) {
      (rows[k].vsBpaSeason.diff > 0 ? dirs.posPoints : dirs.negPoints).push(`${sk}/${k}`);
    }
  }
  lines.push(`Q2 marktaekar stefnur — a sigrum: ${dirs.posWins.length} jakvaedar, ` +
    `${dirs.negWins.length} neikvaedar. A stigum: ${dirs.posPoints.length} jakvaedar, ` +
    `${dirs.negPoints.length} neikvaedar.`);
  lines.push(dirs.posWins.length === 0 && dirs.posPoints.length === 0
    ? "Q2 ENGIN stefna slaer BPA marktaekt a HVORUGUM malikvardanum. Thad sem er " +
      "maelanlegt er hvad ma EKKI gera (zero-RB, QB snemma, WR-WR-WR) — og THAD " +
      "segja badir malikvardarnir eins."
    : "Q2 minnst ein stefna slaer BPA marktaekt — rodin er thvi ekki oll havadi.");
  /* ============================================================
     Q3 — OG HANN ER REIKNADUR UR TOLUNUM, EKKI SKRIFADUR
     ============================================================
     Se `rescued` falskt er thad NIDURSTADA og hun a ad standa berum
     ordum: sigra-maelikvardinn bjargar EKKI `prevCarG`. Alla-vega ma
     linan ekki verda "hun er naerri" — hun ber toluna.               */
  if (q3) {
    const V = q3.verdict, C = q3.placeboCeiling.wins;
    lines.push(`Q3 \`${Q3_VAR}\` a SIGRUM: osamhverft ${sgn(q3.variable.wins.mean, 3)} sigrar af ` +
      `${REG_WEEKS} (t=${q3.variable.wins.t}, ${q3.variable.wins.wins}/${q3.variable.wins.years}), ` +
      `placebo-thak ${sgn(C.hi, 3)} — bord ${sgn(V.marginOverCeiling, 3)}.`);
    lines.push(`Q3 skilyrdin thrju: per-leikmanns CI ` +
      `${V.criterion1_playerBootstrapExcludesZero ? "STENST" : "FELLUR"} · ` +
      `placebo-thak ${V.criterion2_beatsPlaceboCeiling ? "STENST" : "FELLUR"} · ` +
      `walk-forward ${V.criterion3_walkForward ? "STENST" : "FELLUR"} -> ` +
      `${V.rescued ? "SIGRAR BJARGA HENNI" : "SIGRAR BJARGA HENNI EKKI"}.`);
    lines.push(`Q3 stigin ur SOMU drofttum: ${sgn(q3.variable.points.mean, 1)} ` +
      `(t=${q3.variable.points.t}) gegn placebo-thaki ${sgn(q3.placeboCeiling.points.hi, 1)} — ` +
      "sami domur a badum malikvordum, sem er thad sem rho(sigrar,stig) 0,96-0,99 spair.");
  }

  return { lines, winsPositiveCells: winsPos, winsSignificantCells: winsSig,
           champPositiveCells: champPos, q1cellCount: q1cells.length,
           orderComparison: cmp, significantDirections: dirs,
           q3: q3 ? q3.verdict : null };
}

async function writeOut(body) {
  await mkdir(path.join(DATA, "measure"), { recursive: true });
  const inputs = ["features.json", "strategy_ppr.json", "model_eval_ppr.json",
    ...[2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y) => `weekly/${y}.json`)];
  await writeFile(path.join(DATA, "measure", OUT_FILE), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2), defaults: DEFAULTS,
      inputs: EXTRA_FILE ? [...inputs, `measure/${EXTRA_FILE}`] : inputs, dataDir: DATA }),
    /* Fingrafar `--extra`-skrarinnar fylgir MED, ekki i stad — annars
       gaetu tvaer keyrslur med sama vidfangi en olikri inntaksskra
       litid samanburdarhaefar ut. */
    extraInputs: EXTRA_META,
    q3Variable: Q3_VAR,
    question: "Fantasy vinnst a vikulegum vidureignum, ekki a stigum. " +
      "Halda tolurnar sem eru bokadar i stigum thegar thaer eru maeldar i SIGRUM?",
    design: {
      regularSeason: `vikur 1-${REG_WEEKS} (MAELT: \`fpts\` i raunsvari Sleeper er ` +
        "1815,34 = vikur 1-14, en vikur 1-17 gefa 2268,18)",
      playoffs: `vikur ${PO_WEEKS.join(",")} (MAELT: playoff_week_start = 15)`,
      playoffTeams: `${PO_TEAMS} (MAELT: playoff_teams = 6 i BADUM deildum notandans)`,
      schedule: "hringadferd med slembadri umferdarod per deild; hvert lid spilar " +
        "nakvaemlega einn leik i viku",
      seeding: "wins + ties/2, sidan stig (`pf`) — regla Sleeper; jafntefli i " +
        "urslitaleik: efra saeti kemst afram (deterministiskt)",
      arms: "medferdin i saeti i, vidmidid i saeti j, oll onnur saeti eftir markadinum; " +
        "hver fruma SPEGLUD (i<->j) svo saetis-skekkja falli ut og nullprofid se nakvaemt",
      lineup: "byrjunarlid vikunnar ur `startersRaw` i src/accuracy.js — ein utfaersla. " +
        "Headline-frumur skoradar TVISVAR: raunstig vikunnar (`oracleLineup`) og " +
        "gangandi spa (`wfLineup`, hrist ppg k=4, vikur < w)",
      pool: "allir sem eiga vikugogn (QB/RB/WR/TE); taglid a bordinu radast eftir " +
        "gangandi forgildi thvi features.json ber 145-204 menn en 12x14 draft tharf 168",
      excluded: "K og DST — utan draftsins, tom saeti hja OLLUM lidum, fella ut ur mun",
      clustering: "bootstrap KLASADUR PER TIMABIL (src/learn.js bootstrapDiff); " +
        "radir innan ars eru ekki ohadar",
      bootRuns: BOOT,
    },
    unmeasured: {
      waiver: "hoparnir eru fastir allt timabilid. `waiver-lab` maelir waiver-regluna; " +
        "ad blanda thvi hingad vaeri ad maela tvennt i einu. Meiddur madur er 0 stig " +
        "og enginn getur skipt honum ut.",
      trades: "engin skipti. Enginn gagnagrunnur ber tha sogulega.",
      scheduleStrength: "hringadferd, ekki raunveruleg Sleeper-skra og engar deildir. " +
        "Spegluninni er aetlad ad fella thad ut, ekki ad herma thad.",
      halfAdp: "sogulegt half-PPR ADP er ekki til (half-lab). 12-lida deildin er thvi " +
        "maeld med BADUM (ppr og std) sem vikmork.",
    },
    ...body,
  }, null, 1));
}

main().catch((e) => { console.error(e); process.exit(1); });
