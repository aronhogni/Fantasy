#!/usr/bin/env node
/* ============================================================
   usage-lab.mjs — BAETIR "ThAD SEM ER LIDID AF TIMABILINU"
                   VIKULEGA AKVORDUN?

     node scripts/usage-lab.mjs [--from=2019] [--boot=150]

   -> data/measure/usage.json

   ============================================================
   SPURNINGIN
   ============================================================
   `weeklyProjection()` byggir a TIMABILS-SPA DEILDRI A 17 og lagar
   hana med markadslinu (leikjaflaedi) og vorn andstaedingsins. Hun
   notar EKKERT af thvi sem hefur gerst i thessu timabili. I viku 10
   er agust-spain enn grunnurinn, thott tiu vikur af raunverulegri
   notkun liggi fyrir.

   Notandinn: "eg held ad this season stats verdi mjog relevant
   thegar season byrjar."

   Hér er thad maelt. Blandan er

       base' = w(k) * (timabils-spa / 17) + (1 - w(k)) * notkun-til-thessa

   thar sem `k` er FJOLDI LEIKJA sem madurinn hefur spilad (ekki
   vikunumerid — sa sem missti thrjar vikur a minna af gognum), og
   `w` fellur med `k` eftir feril sem er sjalfur maeldur.

   **NULL-TILGATAN ER `w = 1`** — timabils-spain ein, thad sem appid
   gerir i dag. Hun vinnur nema vikmorkin utiloki hana.

   ============================================================
   MAELIKVARDINN ER SA SAMI OG I `startsit-lab.mjs`
   ============================================================
   Hlutfall tiltaeka bilsins sem er lokad:

       (arm - flat) / (ceiling - flat)

   `flat` = timabils-spa/17 (thad sem appid gerir), `ceiling` =
   fullkomin vitneskja um vikuna. Hopar koma ur hermdum droftum eftir
   ADP, 12 saeti, og STIGIN ERU ALLTAF RAUNVERULEG — matid velur
   hverjir spila og gefur engin stig sjalft.

   TALAN SEM ThARF AD SLA: `weeklyProjection` lokar **5,831%** af
   bilinu i PPR (t = 4,328, 7/7 timabil) og **2,967%** i standard
   (t = 2,831, 6/7). Baedi eru endurreiknud hér og BORIN VID
   `data/startsit_*.json` — skriftan deyr ef thau stemma ekki, thvi
   tha er thetta ekki sami maelikvardi og talan sem er ad slast.

   ============================================================
   HVAD ER "NOTKUN"? OG HVERS VEGNA ThAD ER KJARNA-TILGATAN
   ============================================================
   Stig innihalda TD, sem eru havadi. Notkun (sendingar a mann,
   hlaup, target share, WOPR, loftyards) er STODUGRI innan timabils.
   Tilgatan er thvi ad `tshare` FLYTJIST thott stig geri thad ekki.

   Thad er nakvaemlega thad sem tharf ad maela, thvi bædi
   FPL-verkefnid (CLAUDE.md 6c: -4,52pp eftir mark, t=-5,26) og
   `feature_probe.json` (`first4` r = -0,134 gegn leif) segja ad
   FORM SE AFTURHVARF. Ef notkun hegdar sér eins og stig er thetta
   dautt; ef hun hegdar sér ODRUVISI er thad nidurstadan.

   BREYTURNAR: `pts` (stig per leik — vidmidid), `tshare`, `wopr`,
   `tgt`, `car`, `ay`, `opp` (= car + tgt, hrein taekifaeri). Ofan a
   thaer `constMean` (samdrattur, control), tvo orakel-akkeri og atta
   placeboa — sja skilyrdin 1 og 6.

   ============================================================
   HVERNIG NOTKUN VERDUR STIG — TVEIR VARPANIR, BADAR LEKAFRIAR
   ============================================================
   `tshare` er hlutfall, ekki stig, svo hana ma ekki blanda vid
   stiga-spa an vorpunar. Tvaer eru maeldar:

   `self`  Thvernsnid INNAN timabilsins, ADEINS ur vikum < w:
           stig-per-leik-til-thessa radast a z(notkun-til-thessa)
           innan stodu. Engin fyrri timabil nauðsynleg, svo ALLIR
           sjo arganger nyttast — og thetta er nakvaemlega thad sem
           appid gaeti gert i viku 5.

   `prior` Fittad a FYRRI TIMABILUM med RETTA markmidinu: stig i
           viku w gegn z(notkun fyrir viku w). Rettara markmid, en
           2019 hefur engin fyrri ar svo hun maelist a sex arum.

   Baedi eru ordrett walk-forward: `prior`-safnid er uppfaert EFTIR
   ad hvert timabil hefur verid maelt, svo thad getur ekki innihaldid
   arid sem er verid ad maela.

   ============================================================
   SEX SKILYRDI SEM ERU EKKI VALFRJALS
   ============================================================
   1. PLACEBO-FAMILIA. Atta ákveðnar havada-breytur gegnum SAMA net.
      I `opp-lab` nadi havadi einstoku holfi med |t| = 3,50 og
      +58,2 stig, og fyrsta 4-timabila keyrslan hafdi 10 af 11
      breytum jakvaedar. Thakid er throskuldurinn, ekki nullid.

      TVAER TEGUNDIR, OG ThAD ER ASETT: `placeboFit` faer sinn EIGIN
      fittada halla (heidarlegt null a ALLRI pipeline-unni), og
      `placeboScaled` faer MIDGILDI halla raunverulegu breytanna
      (sami kvardi, ekkert merki). **Haerra thakid er notad.**

      OG ThAD KOM I LJOS AD `placeboFit` ER EKKI HREINN HAVADI:
      fittadur halli a havada maelist ~0, svo eftir stendur
      SKURDPUNKTURINN = medaltal stodunnar. Thad er SAMDRATTUR, ekki
      havadi, og hann getur unnid af eigin verdleikum. Thess vegna er
      `constMean` (kind `control`) i netinu og maelir hann BERUM
      ORDUM: annars gaeti "placebo vann" thytt "samdrattur vann" an
      ad thad kaemi fram. Maelt: +0,65 pp (ppr), +2,91 (half),
      +3,77 (standard).

      THROSKULDURINN A `t` ER EINHLIDA OG ThAD ER MAELT, EKKI VALID.
      Fyrsta fulla keyrslan notadi `max |t|` yfir placebo-holfin og
      fekk **22,238** — medan BESTA havada-holf sama seeds gaf delta
      **-1,536 pp**. Holfid var `const0.9`: 10% havadi i hverja viku
      tapar litlu en tapar ALLTAF, svo dreifingin er orsmá og |t|
      risastórt. Tvihlida thak svarar "hve marktaekt getur havadi
      litid ut i HVORA att sem er"; spurningin er einhlida. Sama
      gildir um talninguna: 46 af 52 kvarda-samstilltum holfum voru
      "marktaek" af thvi ad thau voru marktaekt VERRI. Bædi tolur eru
      birtar, throskuldurinn er `maxPositiveT`.

   2. BOOTSTRAP KLASAD PER LEIKMANN. `vbdbase-lab`: 29 holf marktaek
      klasad eftir timabili, **0 af 153** klasad per leikmann. Badi
      eru birt; per-leikmanns raedur.

   3. WALK-FORWARD OG ENGINN LEKI INNAN TIMABILS. Vid viku w eru
      ADEINS vikur < w notadar — thad er hattulegasti lekinn hér.
      Ferillinn sjalfur er lika valinn walk-forward (val ur fyrri
      arum, maelt a arinu).

   4. NULL-TILGATAN ER `w = 1`. Hun er I NETINU sem ferill nr. 0 og
      hun er BORIN VID `startsit_*.json`.

   5. MAELIKVARDINN ER AKVORDUNIN, ekki MAE. `shrink-lab` fann 57
      holf thar sem MAE batnadi og akvordunin versnadi.

   6. ORAKEL-AKKERI. `agecurve-lab` synir hvers vegna: an thess er
      "fellur" tvirætt — annad hvort er merkid fjarverandi eda vélin
      getur ekki tjad thad. `oracleUsage` gefur blondunni FULLKOMNA
      vitneskju um tshare vikunnar og keyrir hana gegnum SOMU vorpun.
      Maelt: hun lokar **36,2% / 29,6% / 23,5%** af bilinu. Velin
      getur thvi unnid stort thegar merkid er til, og hvert
      null-svar hennar er svar um MERKID.

   ============================================================
   SJALFSPROF SEM FELLA KEYRSLUNA (skrifar EKKI)
   ============================================================
   · Ferill 0 + ctx AF verdur ad vera BITA-EINS og `flat` reiknad
     sjalfstaett -> hlutfall NAKVAEMLEGA 0.
   · Ferill 0 + ctx A verdur ad vera BITA-EINS og `weeklyProjection`
     reiknad sjalfstaett.
   · `oraclePts` + ferill `const0` + ctx AF verdur ad vera BITA-EINS
     og `ceiling`. Thetta er sterkasta profid: thad segir ad
     blondunar-velin geti tjad hvada mat sem er, upp i thad
     fullkomna. Vegna thessa naer matid lika yfir `k = 0`.
   · Hvert AR verdur ad stemma vid `startsit_ppr.json` /
     `startsit_standard.json` innan 0,01 pp — PER TIMABIL, ekki
     adeins a medaltalinu, thvi medaltal getur stemmt thott hvert ar
     se skakt (og per-timabils-profid keyrir a hlutmengi ara, sem
     medaltals-profid getur ekki).
   Tom maelingarskra er verri en engin (sja `lib/args.mjs`).
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { weeklyProjection, impliedTeamTotals } from "../src/model.js";
import { mean, bootstrapDiff } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const MEASURE = path.join(OUT, "measure");
const ARG = parseArgs(process.argv.slice(2), {
  from: "number", boot: "number", bootslots: "number",
});
const FROM = Number(ARG.from ?? 2019);
const BOOT = Number(ARG.boot ?? 150);
const BOOT_SLOTS = Number(ARG.bootslots ?? 12);

const TEAMS = 12, ROUNDS = 14;
const LEAGUE = { ...DEFAULT_LEAGUE, teams: TEAMS, rounds: ROUNDS };
const FORMATS = ["ppr", "half", "standard"];

const r1 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 100) / 100);
const r3 = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 1000) / 1000);
const sgn = (x) => (x == null ? "    -" : (x > 0 ? "+" : "") + x.toFixed(2));

/* Tvi-hlida t-mork vid p=0,05. Fjoldi ara er EKKI fasti (7 fyrir
   `self`, 6 fyrir `prior`, 4 i walk-forward) svo throskuldurinn ma
   ekki vera hardkodadur — sama regla og `vbdbase-lab.mjs`. Tvaer
   `df`-villur fundust thar og BADAR laekkudu throskuldinn. */
const T_CRIT = { 2: 12.706, 3: 4.303, 4: 3.182, 5: 2.776, 6: 2.571, 7: 2.447,
                 8: 2.365, 9: 2.306, 10: 2.262, 11: 2.228 };
const tCrit = (n) => T_CRIT[Math.min(11, Math.max(2, n))] ?? 2.228;

/* ============================================================
   1. BREYTURNAR
   ============================================================
   `pts` er vidmidid og hun ER LIKA markmid `self`-vorpunarinnar.
   Thess vegna er hun visvitandi i saeti 0: hvergi annars stadar i
   kodanum tharf ad vita hvar hun er.

   `opp` (= car + tgt) er hrein taekifaeri og hun er hér af thvi ad
   `opp-lab` fann ad merkid i `prevCarG` lifir i RB og QB en er ~0
   fyrir WR/TE — summan er thvi ekki sama breytan og hvor um sig. */
const METRICS = ["pts", "tshare", "wopr", "tgt", "car", "ay", "opp"];
const NOISE_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const NMET = METRICS.length + NOISE_SEEDS.length;      // 7 + 8 = 15
const MET_PTS = 0;
const USAGE_MET = [1, 2, 3, 4, 5, 6];                  // tshare..opp
const NOISE_MET0 = METRICS.length;                     // 7

/* Gluggarnir. `jump` er STOKK-GREININGIN: leikmadur sem fer ur 20% i
   60% target share er EKKI "medaltal 40%". Hun notar sidustu 3 leiki
   ef their vikja meira en 1 stadalfravik (thvert a stodu) fra
   thremur leikjunum a undan, annars allt timabilid til thessa.
   Throskuldurinn 1,0 er EITT gildi og thad er valid, ekki maelt —
   thess vegna er `jump` maeld GEGN `all` og `last3` og bædi thau eru
   birt. Se `jump` ekki betri en hvorugt er stokk-greiningin ekki
   thess virdi, og thad er svarid. */
const WINDOWS = [
  { key: "all", n: null },
  { key: "last3", n: 3 },
  { key: "last5", n: 5 },
  { key: "jump", n: null, jump: true },
];
const NWIN = WINDOWS.length;
const JUMP_SD = 1.0;

/* Arm-breyturnar: (maelikvardi x vorpun).
   FIMM TEGUNDIR og thaer eru medhondladar SITTHVORT:
     points   `ptsPG` — vidmidid innan tilraunarinnar
     usage    kjarna-tilgatan
     control  `constMean` — blondun ad MEDALTALI stodunnar, engin
              leikmanns-upplysing. Hun er hér af ThVI ad `placeboFit`
              hrynur i nakvaemlega thetta (fittadur halli a havada
              maelist ~0, svo eftir stendur skurdpunkturinn = medaltal
              hopsins). Vaeri hun ekki nefnd vaeri hun FALIN inni i
              placeboinu og "placebo vinnur" laesist eins og havadi
              vinni — thegar thad sem vann var SAMDRATTUR.
     placebo  havadi gegnum sama net
     oracle   FULLKOMIN VITNESKJA. Akkerid: se hofnun nidurstadan
              verdur ad vera vitad hvort NETID getur yfirhofud unnid
              thegar merkid er gefid. `agecurve-lab` gerdi thetta og
              thad var eina leidin ad greina "ekkert merki" fra
              "brotid maelitaeki". */
const ARM_VARS = [];
ARM_VARS.push({ key: "ptsPG", met: MET_PTS, map: "direct", kind: "points",
  label: "Points per game so far (no mapping needed — already in points)" });
for (const m of USAGE_MET) {
  ARM_VARS.push({ key: `${METRICS[m]}_self`, met: m, map: "self", kind: "usage",
    label: `${METRICS[m]} so far, mapped to points by within-season cross-section (weeks < w only)` });
  ARM_VARS.push({ key: `${METRICS[m]}_prior`, met: m, map: "prior", kind: "usage",
    label: `${METRICS[m]} so far, mapped to points by a fit on PRIOR seasons only` });
}
ARM_VARS.push({ key: "constMean", met: MET_PTS, map: "groupMean", kind: "control",
  label: "(control) blend toward the positional mean points per game — pure shrinkage, " +
    "carries no information about the individual player" });
ARM_VARS.push({ key: "oraclePts", met: MET_PTS, map: "oraclePts", kind: "oracle",
  label: "(oracle) the player's ACTUAL points in week w as the season-to-date estimate — " +
    "with w = 0 and no market context this must reproduce the ceiling exactly" });
ARM_VARS.push({ key: "oracleUsage", met: 1, map: "oracleUsage", kind: "oracle",
  label: "(oracle) the player's ACTUAL tshare in week w, mapped to points by the same " +
    "within-season cross-section the real usage arms use" });
for (let i = 0; i < 4; i++) {
  ARM_VARS.push({ key: `placeboFit${NOISE_SEEDS[i]}`, met: NOISE_MET0 + i, map: "self",
    kind: "placebo", label: `Placebo: deterministic noise, seed ${NOISE_SEEDS[i]}, own fitted slope` });
}
for (let i = 4; i < 8; i++) {
  ARM_VARS.push({ key: `placeboScaled${NOISE_SEEDS[i]}`, met: NOISE_MET0 + i, map: "scaled",
    kind: "placebo", label: `Placebo: deterministic noise, seed ${NOISE_SEEDS[i]}, scale matched to the median real slope` });
}
const NVAR = ARM_VARS.length;
const VAR_IDX = new Map(ARM_VARS.map((v, i) => [v.key, i]));
const IDX_ORACLE_PTS = VAR_IDX.get("oraclePts");
/* `real` er ADEINS points+usage. Ad lata orakel eda samdratt slaedast
   inn i "raunverulegu breyturnar" vaeri ad velja sigurvegara ur hopi
   sem inniheldur svindl — sama villa og `pos-vs-opponent` var vardur
   gegn i FPL-verkefninu. */
const REAL_KINDS = new Set(["points", "usage"]);

/* Ferlarnir. Ferill 0 ER NULL-TILGATAN og hun ma ekki vera nein
   onnur tala en 1 — hun er baedi vidmidid og sjalfsprofid. */
const CURVES = [
  { key: "null-w1", f: () => 1, label: "w = 1 — season projection only (current app behaviour)" },
  { key: "const0.9", f: () => 0.9 }, { key: "const0.75", f: () => 0.75 },
  { key: "const0.5", f: () => 0.5 }, { key: "const0.25", f: () => 0.25 },
  { key: "const0", f: () => 0, label: "w = 0 — season-to-date only, projection discarded" },
  { key: "bayes2", f: (k) => 2 / (2 + k) }, { key: "bayes4", f: (k) => 4 / (4 + k) },
  { key: "bayes6", f: (k) => 6 / (6 + k) }, { key: "bayes10", f: (k) => 10 / (10 + k) },
  { key: "linear4", f: (k) => Math.max(0, 1 - k / 4) },
  { key: "linear8", f: (k) => Math.max(0, 1 - k / 8) },
  { key: "linear12", f: (k) => Math.max(0, 1 - k / 12) },
  { key: "linear17", f: (k) => Math.max(0, 1 - k / 17) },
];
const NCURVE = CURVES.length;

/* Viku-bilin. Svarid er naestum orugglega olikt i viku 2 og viku 12,
   og FERILLINN er nidurstadan — thess vegna eru bilin ekki
   valfrjals vidbot heldur hluti af maelingunni. */
const BINS = [
  { key: "all", lo: 1, hi: 18 },
  { key: "w1-4", lo: 1, hi: 4 },
  { key: "w5-9", lo: 5, hi: 9 },
  /* HEITID SEGIR 18, ekki 17, thott spurningin hafi verid stillt a
     10-17: vikugognin bera viku 18 og `startsit-lab` telur hana med
     (`if (w.week > 18) continue`). Ad sleppa henni hér myndi rjufa
     samsvorunina vid tolun sem er ad slast, og heiti sem segir 17
     thegar 18 er inni er ómæld tala i dulargervi. */
  { key: "w10-18", lo: 10, hi: 18 },
];
const NBIN = BINS.length;
const binOf = (week) => (week <= 4 ? 1 : week <= 9 ? 2 : 3);

const POSITIONS = ["QB", "RB", "WR", "TE"];

/* ============================================================
   2. ARM-LISTINN
   ============================================================
   Hvert "arm" er ein akvordunarregla. `curve 0` er hofd EINU SINNI
   (hun er ohad breytu og glugga) svo netid beri hana ekki 84 sinnum
   og latist hafa 84 marktaek holf. */
function buildArms() {
  const arms = [];
  const add = (a) => { arms.push(a); return arms.length - 1; };
  const idxIncumbent = add({ varIdx: 0, winIdx: 0, curveIdx: 0, ctx: 1, pos: null,
    tag: "incumbent" });
  const idxFlat = add({ varIdx: 0, winIdx: 0, curveIdx: 0, ctx: 0, pos: null, tag: "flat" });

  let idxOracleIdentity = -1;
  for (let v = 0; v < NVAR; v++) {
    const kind = ARM_VARS[v].kind;
    const isPlacebo = kind === "placebo";
    const isOracle = kind === "oracle";
    /* Orakel-gildid er viku-w gildid sjalft og er thvi OHAD glugganum.
       Fjorir eins gluggar vaeru fjogur eins holf sem laetust vera
       fjogur — sama gildran og "ferill 0 x 84" hér fyrir ofan. */
    const wins = isOracle ? 1 : NWIN;
    for (let w = 0; w < wins; w++) {
      for (let c = 1; c < NCURVE; c++) {
        add({ varIdx: v, winIdx: w, curveIdx: c, ctx: 1, pos: null, tag: "grid",
          oracle: isOracle });
        /* ctx AF er haft med fyrir raunverulegar breytur eingongu:
           spurningin "kemur abatinn ur blondunni eda ur markads-
           lidnum?" er ekki spurd um havada. */
        if (!isPlacebo) {
          const ai = add({ varIdx: v, winIdx: w, curveIdx: c, ctx: 0, pos: null,
            tag: "gridNoCtx", oracle: isOracle });
          /* AKKERI-SJALFSPROFID: fullkomin vitneskja um stigin, w = 0,
             enginn markadslidur -> velur NAKVAEMLEGA sama lid og
             `ceiling`. Ef thetta holf er ekki bita-eins vid ceiling er
             blondunar-vélin biluð og hvert null-svar hennar er
             merkingarlaust. */
          if (v === IDX_ORACLE_PTS && CURVES[c].key === "const0") idxOracleIdentity = ai;
        }
      }
    }
  }
  /* Per stodu — "er ferillinn olikur per stodu?" Blandan er beitt
     ADEINS a eina stodu i einu, hinar halda w=1, svo hrifin seu
     eignud rettri stodu. Skammtad urval breyta/glugga: fullt net
     per stodu vaeri fjorfalt fleiri frigradur fyrir spurningu sem er
     LYSANDI, ekki akvardandi. */
  const posVars = ["ptsPG", "tshare_self", "wopr_self", "opp_self"];
  for (const vk of posVars) {
    const v = VAR_IDX.get(vk);
    for (const wk of ["all", "last3"]) {
      const w = WINDOWS.findIndex((x) => x.key === wk);
      for (let c = 1; c < NCURVE; c++) {
        for (const pos of POSITIONS) {
          add({ varIdx: v, winIdx: w, curveIdx: c, ctx: 1, pos, tag: "perPos" });
        }
      }
    }
  }
  if (idxOracleIdentity < 0) {
    console.error("  arm-listinn ber ekki orakel-akkerid — sjalfsprofid er ekki til.");
    process.exit(2);
  }
  return { arms, idxIncumbent, idxFlat, idxOracleIdentity };
}

/* ============================================================
   3. HAVADI — akvedinn, engin slembivel
   ============================================================
   Sama form og `opp-lab.mjs` en med VIKU i lyklinum: placeboinn a ad
   vera vikulegur maelikvardi eins og hinir, annars faeri hann gegnum
   annad net en thad sem hann a ad kvarda. */
function noiseValue(id, season, week, seed) {
  let h = (2166136261 ^ (seed * 16777619)) >>> 0;
  const s = `${id}|${season}|${week}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const u = ((h >>> 8) & 0xffff) / 65536, v = (h & 0xff) / 256;
  return u + v - 1;      // tvaer jafndreifdar -> naerri normal
}

/* ============================================================
   4. TOLFRAEDI
   ============================================================ */
function statsOf(per) {
  const ys = Object.keys(per).filter((y) => per[y] != null && Number.isFinite(per[y]))
    .sort();
  const vals = ys.map((y) => per[y]);
  if (vals.length < 2) {
    return { mean: r3(vals.length ? vals[0] : null), t: null, years: vals.length,
             wins: vals.filter((v) => v > 0).length, ci: null, significant: false };
  }
  const m = mean(vals);
  const sd = Math.sqrt(vals.reduce((s, x) => s + (x - m) ** 2, 0) / (vals.length - 1));
  const se = sd / Math.sqrt(vals.length);
  const tc = tCrit(vals.length);
  const t = se ? m / se : null;
  return {
    mean: r3(m), t: r3(t), years: vals.length,
    wins: vals.filter((v) => v > 0).length,
    ci: [r3(m - tc * se), r3(m + tc * se)],
    tCrit: tc,
    significant: t != null && Math.abs(t) > tc,
  };
}

/** Bootstrap klasad eftir TIMABILI — repo-stadallinn. */
function ciSeason(per) {
  const a = {}, z = {};
  for (const y of Object.keys(per)) {
    if (per[y] == null || !Number.isFinite(per[y])) continue;
    a[y] = per[y]; z[y] = 0;
  }
  const b = bootstrapDiff(a, z, 2000, 777);
  return b ? { lo: r3(b.lo), hi: r3(b.hi), excludesZero: b.excludesZero } : null;
}

const median = (a) => {
  const s = a.filter((x) => x != null && Number.isFinite(x)).sort((x, y) => x - y);
  if (!s.length) return null;
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

/* ============================================================
   5. UPPSTILLING VIKUNNAR — ORDRETT SAMA ADGERD OG `startsit-lab`
   ============================================================
   Afritud VILJANDI og thad er skjalfest: `startsit-lab` flytur hana
   ekki ut, og ad flytja hana ThANGAD myndi breyta skra sem onnur
   maeling a. Sjalfsprofid er vorn: talan sem thetta gefur fyrir
   ferill 0 er borin vid `startsit_*.json` og skriftan deyr ef hun
   stemmir ekki. Afrit sem er PROFAD gegn upprunanum er annad en
   afrit sem er treyst. */
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
  return picked.reduce((a, p) => a + (actualOf(p.id) ? actualOf(p.id).pts : 0), 0);
}

/* ============================================================
   6. LEIKJASAGA PER LEIKMANN — UPPSAFNADAR SUMMUR
   ============================================================
   Gluggamedaltol eru reiknud i FASTRI TID ur uppsofnudum summum.
   Ekki bara hradi: `all`-glugginn er lesinn 15 x 4 x per leikmann x
   per viku, og talning i lykkju gefur FLEYTITOLU-SUMMU I BREYTILEGRI
   ROD — sem er ekki vixlin. Fost rod = endurgeranlegt. */
function buildLogs(pool, weekly, fmt, season) {
  const byId = new Map();
  for (const w of weekly) {
    if (w.week > 18) continue;
    let L = byId.get(w.id);
    if (!L) byId.set(w.id, (L = []));
    L.push(w);
  }
  const logs = new Map();
  const wanted = new Set(pool.map((p) => p.id));
  for (const [id, rowsIn] of byId) {
    if (!wanted.has(id)) continue;
    const rows = rowsIn.slice().sort((a, b) => a.week - b.week);
    const G = rows.length;
    const cum = new Float64Array((G + 1) * NMET);
    const cnt = new Int32Array((G + 1) * NMET);
    const weeksArr = new Int32Array(G);
    for (let i = 0; i < G; i++) {
      const w = rows[i];
      weeksArr[i] = w.week;
      const vals = new Array(NMET);
      vals[0] = fmt === "ppr" ? w.ppr : fmt === "half" ? w.half : w.std;
      vals[1] = w.tshare; vals[2] = w.wopr; vals[3] = w.tgt; vals[4] = w.car;
      vals[5] = w.ay;
      vals[6] = (w.car == null && w.tgt == null) ? null : (w.car || 0) + (w.tgt || 0);
      for (let s = 0; s < NOISE_SEEDS.length; s++) {
        vals[NOISE_MET0 + s] = noiseValue(id, season, w.week, NOISE_SEEDS[s]);
      }
      for (let m = 0; m < NMET; m++) {
        const v = vals[m];
        const ok = v != null && Number.isFinite(v);
        cum[(i + 1) * NMET + m] = cum[i * NMET + m] + (ok ? v : 0);
        cnt[(i + 1) * NMET + m] = cnt[i * NMET + m] + (ok ? 1 : 0);
      }
    }
    /* `kAt[w]` = fjoldi leikja med viku < w. Uppflettitafla thvi hun
       er lesin milljon sinnum og tvistleit vaeri sama svar haegar. */
    const kAt = new Int32Array(20);
    for (let w = 0; w < 20; w++) {
      let k = 0;
      while (k < G && weeksArr[k] < w) k++;
      kAt[w] = k;
    }
    logs.set(id, { G, cum, cnt, kAt });
  }
  return logs;
}

function rangeMean(L, met, i0, i1) {
  if (i1 <= i0) return NaN;
  const s = L.cum[i1 * NMET + met] - L.cum[i0 * NMET + met];
  const c = L.cnt[i1 * NMET + met] - L.cnt[i0 * NMET + met];
  return c > 0 ? s / c : NaN;
}

/* ============================================================
   7. VORPUNAR-SAFNID (`prior`)
   ============================================================
   Lykill: stada | maelikvardi | gluggi. Geymir n, Sz, Sz2, Sy, Szy
   thar sem `y` er stig I VIKU w (framtidin fra sjonarholi z-sins) —
   RETTA markmidid. Safnid er uppfaert EFTIR ad timabil hefur verid
   maelt, svo thad getur ekki innihaldid arid sem er maelt. */
const newAcc = () => new Map();
function accAdd(acc, pos, met, win, z, y) {
  const k = `${pos}|${met}|${win}`;
  let a = acc.get(k);
  if (!a) acc.set(k, (a = new Float64Array(5)));
  a[0] += 1; a[1] += z; a[2] += z * z; a[3] += y; a[4] += z * y;
}
function accMerge(dst, src) {
  for (const [k, a] of src) {
    let d = dst.get(k);
    if (!d) dst.set(k, (d = new Float64Array(5)));
    for (let i = 0; i < 5; i++) d[i] += a[i];
  }
}
function accFit(acc, pos, met, win, minN = 200) {
  const a = acc.get(`${pos}|${met}|${win}`);
  if (!a || a[0] < minN) return null;
  const n = a[0], mz = a[1] / n, my = a[3] / n;
  const vz = a[2] / n - mz * mz;
  if (!(vz > 1e-9)) return null;
  const b = (a[4] / n - mz * my) / vz;
  return { a: my - b * mz, b, n };
}
/** Fylgni z(notkun fyrir viku w) vid stig I viku w — greiningartala. */
function accCorr(acc, pos, met, win, sdY) {
  const a = acc.get(`${pos}|${met}|${win}`);
  if (!a || a[0] < 200) return null;
  const n = a[0], mz = a[1] / n, my = a[3] / n;
  const vz = a[2] / n - mz * mz;
  if (!(vz > 1e-9) || !(sdY > 1e-9)) return null;
  return (a[4] / n - mz * my) / (Math.sqrt(vz) * sdY);
}

/* ============================================================
   8. MATID PER VIKA — Z, VORPUN, GLUGGAR
   ============================================================ */
function buildEstimates({ pool, logs, wk, wkRow, weeks, baseOf,
                         priorAcc, globalAcc, residAcc, yAcc }) {
  const seasonAcc = newAcc();
  const estByWeek = new Map();
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);

  for (const week of weeks) {
    const perId = new Map();
    for (const pos of Object.keys(byPos)) {
      if (!POSITIONS.includes(pos)) continue;
      const cand = [];
      for (const p of byPos[pos]) {
        const L = logs.get(p.id);
        if (!L) continue;
        /* `k = 0` ER HAFT MED, og thad er breyting sem tharf ad
           rettlaeta: menn an fyrri leikja hafa ENGA notkun-til-thessa
           og oll raunveruleg gluggagildi theirra verda NaN — their
           taka thvi ekki thatt i neinum z-, sd- eda fitt-utreikningi
           (thar er filtrad a `Number.isFinite`). Their eru hér ADEINS
           svo ORAKEL-AKKERID naí yfir alla sem spiludu; annars gaeti
           thad ekki verid bita-eins vid `ceiling` og sterkasta
           sjalfsprofid vaeri ekki til. */
        cand.push({ id: p.id, L, k: L.kAt[week] });
      }
      /* Undir 8 monnum er thvernsnid ekki thvernsnid. */
      if (cand.length < 8) continue;
      const N = cand.length;

      /* --- hra gluggagildi --- */
      const raw = [];      // raw[met][win] = Float64Array(N)
      for (let m = 0; m < NMET; m++) {
        raw.push([]);
        for (let w = 0; w < NWIN; w++) raw[m].push(new Float64Array(N).fill(NaN));
      }
      for (let i = 0; i < N; i++) {
        const { L, k } = cand[i];
        for (let m = 0; m < NMET; m++) {
          raw[m][0][i] = rangeMean(L, m, 0, k);
          raw[m][1][i] = rangeMean(L, m, Math.max(0, k - 3), k);
          raw[m][2][i] = rangeMean(L, m, Math.max(0, k - 5), k);
        }
      }
      /* --- stokk-greiningin: sd er thvert a STODU, ur `all` --- */
      const sdAll = new Float64Array(NMET);
      for (let m = 0; m < NMET; m++) {
        const v = [];
        for (let i = 0; i < N; i++) if (Number.isFinite(raw[m][0][i])) v.push(raw[m][0][i]);
        if (v.length < 3) { sdAll[m] = NaN; continue; }
        const mu = mean(v);
        sdAll[m] = Math.sqrt(v.reduce((s, x) => s + (x - mu) ** 2, 0) / v.length);
      }
      for (let i = 0; i < N; i++) {
        const { L, k } = cand[i];
        for (let m = 0; m < NMET; m++) {
          let v = raw[m][0][i];
          if (k >= 6 && Number.isFinite(sdAll[m]) && sdAll[m] > 1e-9) {
            const rec = rangeMean(L, m, k - 3, k);
            const prv = rangeMean(L, m, k - 6, k - 3);
            if (Number.isFinite(rec) && Number.isFinite(prv) &&
                Math.abs(rec - prv) > JUMP_SD * sdAll[m]) v = rec;
          }
          raw[m][3][i] = v;
        }
      }

      /* --- z og sjalfs-fitt per (maelikvardi, gluggi) --- */
      const z = [], selfA = [], selfB = [], zMu = [], zSd = [];
      for (let m = 0; m < NMET; m++) {
        z.push([]); selfA.push(new Float64Array(NWIN).fill(NaN));
        selfB.push(new Float64Array(NWIN).fill(NaN));
        /* mu/sd eru GEYMD, ekki reiknud aftur: orakel-notkunin tharf
           NAKVAEMLEGA sama kvarda, og endurreikningur inni i
           leikmanna-lykkjunni gerdi thetta O(N^2) per stodu-viku. */
        zMu.push(new Float64Array(NWIN).fill(NaN));
        zSd.push(new Float64Array(NWIN).fill(NaN));
        for (let w = 0; w < NWIN; w++) {
          const src = raw[m][w];
          const v = [];
          for (let i = 0; i < N; i++) if (Number.isFinite(src[i])) v.push(src[i]);
          const zz = new Float64Array(N).fill(NaN);
          if (v.length >= 8) {
            const mu = mean(v);
            const sd = Math.sqrt(v.reduce((s, x) => s + (x - mu) ** 2, 0) / v.length);
            zMu[m][w] = mu; zSd[m][w] = sd;
            if (sd > 1e-9) for (let i = 0; i < N; i++) {
              if (Number.isFinite(src[i])) zz[i] = (src[i] - mu) / sd;
            }
          }
          z[m].push(zz);
          /* Sjalfs-fittid: markmidid er STIG-PER-LEIK I SAMA GLUGGA.
             Sami gluggi baedi hjá inntaki og markmidi — annars vaeri
             verid ad bera sidustu 3 vikur af notkun vid allt
             timabilid af stigum og kalla thad kvordun. */
          const tgt = raw[MET_PTS][w];
          let n = 0, sz = 0, sz2 = 0, sy = 0, szy = 0;
          for (let i = 0; i < N; i++) {
            if (!Number.isFinite(zz[i]) || !Number.isFinite(tgt[i])) continue;
            n++; sz += zz[i]; sz2 += zz[i] * zz[i]; sy += tgt[i]; szy += zz[i] * tgt[i];
          }
          if (n >= 8) {
            const mz = sz / n, my = sy / n, vz = sz2 / n - mz * mz;
            if (vz > 1e-9) {
              selfB[m][w] = (szy / n - mz * my) / vz;
              selfA[m][w] = my - selfB[m][w] * mz;
            }
          }
        }
      }

      /* --- midgildi raunverulegs halla, fyrir kvarda-samstillta placeboa --- */
      const bMed = new Float64Array(NWIN).fill(NaN);
      for (let w = 0; w < NWIN; w++) {
        const md = median(USAGE_MET.map((m) => Math.abs(selfB[m][w])));
        if (md != null) bMed[w] = md;
      }

      /* --- medaltal stodunnar per gluggi, fyrir `constMean`-samdrattinn --- */
      const ptsMean = new Float64Array(NWIN).fill(NaN);
      for (let w = 0; w < NWIN; w++) {
        const v = [];
        for (let i = 0; i < N; i++) if (Number.isFinite(raw[MET_PTS][w][i])) v.push(raw[MET_PTS][w][i]);
        if (v.length >= 8) ptsMean[w] = mean(v);
      }

      /* --- matid sjalft --- */
      for (let i = 0; i < N; i++) {
        const id = cand[i].id;
        const row = wkRow ? wkRow.get(`${id}|${week}`) : null;
        const act = wk.get(`${id}|${week}`);
        const est = new Float64Array(NVAR * NWIN).fill(NaN);
        for (let v = 0; v < NVAR; v++) {
          const V = ARM_VARS[v];
          const isOracle = V.kind === "oracle";
          for (let w = 0; w < (isOracle ? 1 : NWIN); w++) {
            let val = NaN;
            if (V.map === "direct") {
              val = raw[V.met][w][i];
            } else if (V.map === "groupMean") {
              val = ptsMean[w];
            } else if (V.map === "oraclePts") {
              /* AKKERID. Ekkert golf i 0 hér — `ceiling` notar hrá stig
                 og negatif stig eru raunveruleg, svo klipping myndi
                 skekkja rodun theirra og bita-eins yrdi ekki bita-eins. */
              val = act && act.pts != null ? act.pts : NaN;
            } else if (V.map === "oracleUsage") {
              /* Viku-w notkun z-uð a SAMA kvarda og `all`-glugginn og
                 varpad med SOMU vorpun. Annars vaeri thetta annad tæki,
                 ekki sama tæki med betra inntaki. */
              const u = row ? row.tshare : null;
              const mu = zMu[V.met][0], sd = zSd[V.met][0];
              if (u != null && Number.isFinite(mu) && sd > 1e-9 &&
                  Number.isFinite(selfA[V.met][0]) && Number.isFinite(selfB[V.met][0])) {
                val = selfA[V.met][0] + selfB[V.met][0] * ((u - mu) / sd);
              }
            } else {
              const zz = z[V.met][w][i];
              if (!Number.isFinite(zz)) { /* engin z -> ekkert mat */ }
              else if (V.map === "self") {
                if (Number.isFinite(selfA[V.met][w]) && Number.isFinite(selfB[V.met][w])) {
                  val = selfA[V.met][w] + selfB[V.met][w] * zz;
                }
              } else if (V.map === "scaled") {
                if (Number.isFinite(selfA[V.met][w]) && Number.isFinite(bMed[w])) {
                  val = selfA[V.met][w] + bMed[w] * zz;
                }
              } else if (V.map === "prior") {
                const fit = accFit(priorAcc, pos, V.met, w);
                if (fit) val = fit.a + fit.b * zz;
              }
            }
            /* Negatift stigamat er ekki merkingarlaust (WR getur fengid
               -1 fyrir fumble) en thad er utan thess sem spa gerir.
               Golf i 0 er VAL og thad er skrad: an thess gefur
               langt-negatift z leikmann sem er sjalfkrafa a bekknum
               hvad sem raunhaefid segir. `oraclePts` er UNDANSKILID (sja
               ofar) thvi thad er akkeri, ekki spa. */
            est[v * NWIN + w] = !Number.isFinite(val) ? NaN
              : (V.map === "oraclePts" ? val : Math.max(0, val));
          }
        }
        perId.set(id, est);
      }

      /* --- safna fyrir `prior`-fittid og greiningartolurnar --- */
      for (let i = 0; i < N; i++) {
        const a = wk.get(`${cand[i].id}|${week}`);
        if (!a || a.pts == null) continue;
        yAcc.n++; yAcc.s += a.pts; yAcc.s2 += a.pts * a.pts;
        /* LEIFIN gegn spanni — thetta er vikulega utgafan af `first4`
           (r = -0,134 i `feature_probe.json`): spair god byrjun tho ad
           madurinn SLAI SPANNI SINNI, eda bara ad hann se godur?
           Fylgni vid hra stig getur ekki svarad thvi; hun endurspeglar
           bara ad godir menn skora meira. */
        const bse = baseOf ? baseOf.get(cand[i].id) : null;
        const resid = bse == null ? null : a.pts - bse;
        if (resid != null) {
          yAcc.rn++; yAcc.rs += resid; yAcc.rs2 += resid * resid;
        }
        for (let m = 0; m < NMET; m++) {
          for (let w = 0; w < NWIN; w++) {
            const zz = z[m][w][i];
            if (Number.isFinite(zz)) {
              accAdd(seasonAcc, pos, m, w, zz, a.pts);
              accAdd(globalAcc, pos, m, w, zz, a.pts);
              if (resid != null && residAcc) accAdd(residAcc, pos, m, w, zz, resid);
            }
          }
        }
      }
    }
    estByWeek.set(week, perId);
  }
  return { estByWeek, seasonAcc };
}

/* ============================================================
   9. HOPARNIR OG MAELINGIN
   ============================================================ */
function poolFor(fmt, y, byKey) {
  const out = [];
  const src = fmt === "standard" ? byKey.standard : byKey.ppr;
  for (const [k, a] of src) {
    if (!k.startsWith(`${y}|`)) continue;
    if (a.adp == null) continue;
    if (fmt === "half") {
      const b = byKey.standard.get(k);
      if (!b) continue;
      const pj = a.sleeperProj != null ? a.sleeperProj : a.ffProj;
      const sj = b.sleeperProj != null ? b.sleeperProj : b.ffProj;
      if (pj == null || sj == null) continue;
      const act = (a.pts == null || b.ptsStd == null) ? null : (a.pts + b.ptsStd) / 2;
      out.push({ id: a.id, pos: a.pos, proj: (pj + sj) / 2, adp: a.adp, actual: act });
    } else {
      const pj = a.sleeperProj != null ? a.sleeperProj : a.ffProj;
      if (pj == null) continue;
      out.push({ id: a.id, pos: a.pos, proj: pj,
        adp: a.adp, actual: fmt === "ppr" ? a.pts : a.ptsStd });
    }
  }
  return out;
}

function draftRosters(pool, slots = TEAMS) {
  const actual = new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual }]));
  const field = new Map(pool.slice().sort((a, b) => a.adp - b.adp).map((p, i) => [p.id, i + 1]));
  const rosters = [];
  for (let slot = 1; slot <= slots; slot++) {
    rosters.push(simulateDraft({ board: field, fieldBoard: field, actual,
      slot, league: LEAGUE }).roster);
  }
  return rosters;
}

/**
 * Keyrir arm-listann a gefnum hopum. Skilar summum per (arm, bin) og
 * sjalfstaett reiknudum flat/weekly/ceiling/floor.
 *
 * `idOf` breytir hopa-id i UPPRUNA-id. I bootstrappinu eru leikmenn
 * klonadir (`id#3`) og tha verdur uppflettingin ad fara a upprunann —
 * annars faeri klonud rod i tomt mat og maelingin maeldi thogn.
 */
function runArms({ arms, rosters, weeks, wk, projOf, estByWeek, implied, oppOf, dvp,
                   teamWk, season, idOf = (x) => x, seed = 1 }) {
  const A = arms.length;
  const sum = new Float64Array(A * NBIN);
  const ref = { flat: new Float64Array(NBIN), weekly: new Float64Array(NBIN),
                ceil: new Float64Array(NBIN), floor: new Float64Array(NBIN),
                n: new Int32Array(NBIN) };
  let rs = seed >>> 0;
  const rnd = () => (rs = (rs * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  for (const roster of rosters) {
    for (const week of weeks) {
      const actualOf = (id) => wk.get(`${idOf(id)}|${week}`) || null;
      const played = roster.filter((id) => actualOf(id));
      if (played.length < 9) continue;
      const b = binOf(week);
      ref.n[0]++; ref.n[b]++;

      /* Samhengid per leikmann er reiknad EINU SINNI, ekki per arm. */
      const info = new Map();
      const est = estByWeek.get(week);
      for (const id of played) {
        const src = idOf(id);
        const a = actualOf(id);
        const team = teamWk.get(`${src}|${week}`);
        const imp = team ? implied.get(`${team}|${week}`) : null;
        const opp = team ? oppOf.get(`${team}|${week}`) : null;
        const d = opp ? dvp.get(`${season}|${opp}|${a.pos}`) : null;
        const kAt = estByWeek.kOf.get(src);
        info.set(id, {
          base: (projOf.get(src) ?? 0) / 17,
          pos: a.pos, imp,
          def: d ? { adj: d.adj, leagueMean: d.leagueMean } : null,
          k: kAt ? kAt[week] : 0,
          est: est ? est.get(src) : null,
        });
      }

      /* --- sjalfstaedu vidmidin, ordrett ur `startsit-lab` --- */
      const vFlat = lineupFrom(roster, (id) => (projOf.get(idOf(id)) ?? 0) / 17, actualOf);
      const vCeil = lineupFrom(roster, (id) => (actualOf(id) ? actualOf(id).pts : null), actualOf);
      const vFloor = lineupFrom(roster, () => rnd(), actualOf);
      const vWeek = lineupFrom(roster, (id) => {
        const base = (projOf.get(idOf(id)) ?? 0) / 17;
        const a = actualOf(id);
        if (!a) return null;
        const team = teamWk.get(`${idOf(id)}|${week}`);
        const imp = team ? implied.get(`${team}|${week}`) : null;
        const opp = team ? oppOf.get(`${team}|${week}`) : null;
        const d = opp ? dvp.get(`${season}|${opp}|${a.pos}`) : null;
        const wp = weeklyProjection({ base, pos: a.pos, implied: imp,
          def: d ? { adj: d.adj, leagueMean: d.leagueMean } : null, avail: 1, bye: false });
        return wp && wp.pts != null ? wp.pts : base;
      }, actualOf);
      ref.flat[0] += vFlat; ref.flat[b] += vFlat;
      ref.ceil[0] += vCeil; ref.ceil[b] += vCeil;
      ref.floor[0] += vFloor; ref.floor[b] += vFloor;
      ref.weekly[0] += vWeek; ref.weekly[b] += vWeek;

      for (let ai = 0; ai < A; ai++) {
        const arm = arms[ai];
        const cf = CURVES[arm.curveIdx].f;
        const off = arm.varIdx * NWIN + arm.winIdx;
        const v = lineupFrom(roster, (id) => {
          const inf = info.get(id);
          if (!inf) return null;
          let base = inf.base;
          /* `k > 0` er skilyrdi fyrir RAUNVERULEGT mat: an fyrri leikja
             er ekkert "timabilid til thessa". Orakel-armarnir lesa viku
             w sjalfa og eru thvi undanskildir — annars naedi akkerid
             ekki yfir viku 1 og gaeti ekki verid bita-eins vid ceiling. */
          if (arm.curveIdx !== 0 && (arm.oracle || inf.k > 0) &&
              (!arm.pos || arm.pos === inf.pos) && inf.est) {
            const u = inf.est[off];
            if (Number.isFinite(u)) {
              const w = cf(inf.k);
              base = w * base + (1 - w) * u;
            }
          }
          if (!arm.ctx) return base;
          const wp = weeklyProjection({ base, pos: inf.pos, implied: inf.imp,
            def: inf.def, avail: 1, bye: false });
          return wp && wp.pts != null ? wp.pts : base;
        }, actualOf);
        sum[ai * NBIN + 0] += v;
        sum[ai * NBIN + b] += v;
      }
    }
  }
  return { sum, ref };
}

/* ============================================================
   10. MAIN
   ============================================================ */
async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));
  const sched = JSON.parse(await readFile(path.join(OUT, "schedule_history.json"), "utf8"));
  let defFile = [];
  try { defFile = JSON.parse(await readFile(path.join(OUT, "defense.json"), "utf8")); }
  catch { console.log("  (defense.json vantar — vornarlidurinn verdur hlutlaus)"); }
  const dvp = new Map();
  for (const d of defFile) dvp.set(`${d.season}|${d.team}|${d.pos}`, d);

  /* Vidmidid sem er ad slast — lesid AF DISKI, ekki afritad hingad. */
  const incumbentRef = {};
  for (const [fmt, file] of [["ppr", "startsit_ppr.json"], ["standard", "startsit_standard.json"]]) {
    try {
      const j = JSON.parse(await readFile(path.join(OUT, file), "utf8"));
      incumbentRef[fmt] = { pctOfGapClosed: j.totals.pctOfGapClosed, t: j.totals.t,
                            years: j.totals.years, perSeason: j.perSeason, file };
    } catch { incumbentRef[fmt] = null; }
  }

  const byKey = { ppr: new Map(), standard: new Map() };
  for (const r of feats.rows) {
    if (!byKey[r.scoring]) continue;
    byKey[r.scoring].set(`${r.season}|${r.id}`, r);
  }

  const { arms, idxIncumbent, idxFlat, idxOracleIdentity } = buildArms();
  console.log(`arm-listi: ${arms.length} reglur ` +
    `(${NVAR} breytur x <=${NWIN} gluggar x ${NCURVE - 1} ferlar x 2 ctx + per stodu)`);

  const allYears = [...new Set(feats.rows.map((r) => r.season))].sort()
    .filter((y) => y >= FROM && y <= 2025);

  const results = {};
  const selfTests = { rows: [], failures: [] };
  const diagnostics = {};
  const seasonsUsed = {};

  for (const fmt of FORMATS) {
    console.log(`\n${"=".repeat(72)}\n  ${fmt.toUpperCase()}\n${"=".repeat(72)}`);
    const priorAcc = newAcc();
    const globalAcc = newAcc();
    const residAcc = newAcc();
    const yAcc = { n: 0, s: 0, s2: 0, rn: 0, rs: 0, rs2: 0 };
    const perSeasonRaw = {};        // y -> { sum, ref }
    const keep = {};                // y -> gogn fyrir bootstrap
    /* `prior`-vorpunin er ekki TIL fyrsta arid (engin fyrri ar ad
       fitta a). Tha fellur arminn tilbaka a `base` og delta maelist
       NAKVAEMLEGA 0 — sem er ekki "engin breyting", thad er "engin
       maeling". Nulli sem laetst vera maeling er versta utkoman
       (CLAUDE.md kafli 3), svo arid er merkt og gert NULL. */
    const priorReady = {};

    for (const y of allYears) {
      let weekly;
      try { weekly = JSON.parse(await readFile(path.join(OUT, "weekly", `${y}.json`), "utf8")); }
      catch { continue; }
      const games = sched.games.filter((g) => g.season === y && g.type === "REG");
      if (!games.length) { console.log(`  ${y}: engir leikir i skra`); continue; }

      const implied = new Map(), oppOf = new Map();
      for (const g of games) {
        const t = impliedTeamTotals(g.total, g.spread);
        if (t) { implied.set(`${g.home}|${g.week}`, t.home); implied.set(`${g.away}|${g.week}`, t.away); }
        oppOf.set(`${g.home}|${g.week}`, g.away);
        oppOf.set(`${g.away}|${g.week}`, g.home);
      }

      const pool = poolFor(fmt, y, byKey);
      if (pool.length < 120) { console.log(`  ${y}: laug ${pool.length} < 120`); continue; }

      const wk = new Map(), wkRow = new Map(), teamWk = new Map(), weekSet = new Set();
      for (const w of weekly) {
        if (w.week > 18) continue;
        weekSet.add(w.week);
        wk.set(`${w.id}|${w.week}`, { pos: w.pos,
          pts: fmt === "ppr" ? w.ppr : fmt === "half" ? w.half : w.std });
        wkRow.set(`${w.id}|${w.week}`, w);
        if (w.team) teamWk.set(`${w.id}|${w.week}`, w.team);
      }
      const weeks = [...weekSet].sort((a, b) => a - b);

      const projOf = new Map(pool.map((p) => [p.id, p.proj]));
      const baseOf = new Map(pool.map((p) => [p.id, (p.proj ?? 0) / 17]));
      priorReady[y] = priorAcc.size > 0;

      const logs = buildLogs(pool, weekly, fmt, y);
      const { estByWeek, seasonAcc } = buildEstimates({ pool, logs, wk, wkRow, weeks,
        baseOf, priorAcc, globalAcc, residAcc, yAcc });
      /* `kOf` er hengt a matid svo `runArms` thurfi ekki adra
         uppflettingu — sama tafla, einn eigandi. */
      estByWeek.kOf = new Map([...logs].map(([id, L]) => [id, L.kAt]));

      const rosters = draftRosters(pool);
      const out = runArms({ arms, rosters, weeks, wk, projOf, estByWeek,
        implied, oppOf, dvp, teamWk, season: y, seed: y * 7919 });
      perSeasonRaw[y] = out;
      keep[y] = { pool, weeks, wk, projOf, estByWeek, implied, oppOf, teamWk };

      /* --- SJALFSPROF: ferill 0 verdur ad vera bita-eins --- */
      const tFlat = out.sum[idxFlat * NBIN] - out.ref.flat[0];
      const tWeek = out.sum[idxIncumbent * NBIN] - out.ref.weekly[0];
      /* AKKERID: fullkomin vitneskja + w = 0 + enginn markadslidur
         verdur ad vera BITA-EINS vid `ceiling`. Thetta profar
         blondunar-velina sjalfa, ekki merkid: ef hun getur EKKI unnid
         thegar hun faer rett svar upp i hendurnar er hvert null-svar
         hennar bilun i maelitaeki og ekki nidurstada. */
      const tOracle = out.sum[idxOracleIdentity * NBIN] - out.ref.ceil[0];
      selfTests.rows.push({ format: fmt, season: y,
        flatIdentityDelta: tFlat, incumbentIdentityDelta: tWeek,
        oracleCeilingIdentityDelta: tOracle, lineups: out.ref.n[0] });
      if (tFlat !== 0) selfTests.failures.push(`${fmt} ${y}: curve0/ctx-off is not bit-identical to flat (delta ${tFlat})`);
      if (tWeek !== 0) selfTests.failures.push(`${fmt} ${y}: curve0/ctx-on is not bit-identical to weeklyProjection (delta ${tWeek})`);
      if (tOracle !== 0) selfTests.failures.push(`${fmt} ${y}: oracle anchor (oraclePts, w=0, no context) ` +
        `is not bit-identical to the ceiling (delta ${tOracle}) — the blending machinery cannot ` +
        `express perfect knowledge, so any null result from it would be an instrument failure`);

      const gap = out.ref.ceil[0] - out.ref.flat[0];
      const pctW = gap > 0 ? (out.ref.weekly[0] - out.ref.flat[0]) / gap * 100 : null;
      /* SJALFSPROF 2: PER TIMABIL gegn `startsit_*.json`. Fyrri utgafa
         bar adeins MEDALTALID og gat thvi ekki keyrt a hlutmengi ara
         — og medaltal getur stemmt thott hvert ar se skakt. */
      if (incumbentRef[fmt] && incumbentRef[fmt].perSeason[y]) {
        const onDisk = incumbentRef[fmt].perSeason[y].pctOfGapClosed;
        const d = pctW == null ? null : Math.abs(pctW - onDisk);
        selfTests.rows.push({ format: fmt, season: y, check: "matches startsit per season",
          recomputed: r3(pctW), onDisk, delta: r3(d) });
        if (!(d != null && d <= 0.01)) {
          selfTests.failures.push(`${fmt} ${y}: recomputed incumbent ${r3(pctW)}% does not match ` +
            `${incumbentRef[fmt].file} (${onDisk}%) — not the same metric`);
        }
      }
      console.log(`  ${y}  n=${String(out.ref.n[0]).padStart(4)}` +
        `  flat ${(out.ref.flat[0] / out.ref.n[0]).toFixed(1)}` +
        ` · weekly ${(out.ref.weekly[0] / out.ref.n[0]).toFixed(1)}` +
        ` · ceiling ${(out.ref.ceil[0] / out.ref.n[0]).toFixed(1)}` +
        `  -> incumbent ${pctW == null ? "—" : pctW.toFixed(3)}%`);

      accMerge(priorAcc, seasonAcc);
    }

    const ys = Object.keys(perSeasonRaw).map(Number).sort();
    requireSeasons(ys, `timabil med vikugognum OG linum (${fmt})`);
    seasonsUsed[fmt] = ys;

    /* ---------- hlutfall bilsins per arm, per bin, per timabil ---------- */
    const pctOf = (ai, bin) => {
      const per = {};
      /* `prior`-armar hafa ENGA maelingu fyrsta arid — sja `priorReady`. */
      const needsPrior = ARM_VARS[arms[ai].varIdx].map === "prior";
      for (const y of ys) {
        if (needsPrior && !priorReady[y]) { per[y] = null; continue; }
        const o = perSeasonRaw[y];
        const gap = o.ref.ceil[bin] - o.ref.flat[bin];
        per[y] = gap > 0 ? (o.sum[ai * NBIN + bin] - o.ref.flat[bin]) / gap * 100 : null;
      }
      return per;
    };
    const incPct = {};
    for (let b = 0; b < NBIN; b++) incPct[b] = pctOf(idxIncumbent, b);
    const incStats = statsOf(incPct[0]);

    /* SJALFSPROF 3: medaltalid — ADEINS thegar arasettid er hid sama.
       Annars vaeri thetta samanburdur a sjo arum vid tvo og fall
       thess segdi ekkert um maelikvardann. */
    if (incumbentRef[fmt]) {
      const sameYears = Object.keys(incumbentRef[fmt].perSeason).map(Number).sort().join(",") ===
        ys.join(",");
      const d = Math.abs(incStats.mean - incumbentRef[fmt].pctOfGapClosed);
      selfTests.rows.push({ format: fmt, check: "matches startsit total",
        comparable: sameYears, recomputed: incStats.mean,
        onDisk: incumbentRef[fmt].pctOfGapClosed, delta: r3(d) });
      if (sameYears && !(d <= 0.01)) {
        selfTests.failures.push(`${fmt}: recomputed incumbent ${incStats.mean}% does not match ` +
          `${incumbentRef[fmt].file} (${incumbentRef[fmt].pctOfGapClosed}%) — not the same metric`);
      }
    }
    console.log(`  vidmid (`  + `weeklyProjection): ${incStats.mean}% · t=${incStats.t} · ` +
      `${incStats.wins}/${incStats.years}` +
      (incumbentRef[fmt] ? `  [a diski: ${incumbentRef[fmt].pctOfGapClosed}%]` : ""));

    /* ---------- tolfraedi per arm ---------- */
    const armStats = arms.map((arm, ai) => {
      const per = pctOf(ai, 0);
      const delta = {};
      for (const y of ys) {
        delta[y] = (per[y] == null || incPct[0][y] == null) ? null : per[y] - incPct[0][y];
      }
      const bins = {};
      for (let b = 1; b < NBIN; b++) {
        const pb = pctOf(ai, b);
        const db = {};
        for (const y of ys) db[y] = (pb[y] == null || incPct[b][y] == null) ? null : pb[y] - incPct[b][y];
        bins[BINS[b].key] = { abs: statsOf(pb), delta: statsOf(db) };
      }
      return { arm, ai, per, abs: statsOf(per), delta: statsOf(delta),
               ciSeasonAbs: ciSeason(per), ciSeasonDelta: ciSeason(delta), bins };
    });

    /* ---------- placebo-thakid ---------- */
    const isGrid = (s) => s.arm.tag === "grid" && s.arm.ctx === 1;
    const plc = armStats.filter((s) => isGrid(s) && ARM_VARS[s.arm.varIdx].kind === "placebo");
    const bySeed = {};
    for (const s of plc) {
      const k = ARM_VARS[s.arm.varIdx].key;
      if (!bySeed[k]) bySeed[k] = [];
      bySeed[k].push(s);
    }
    const seedBest = Object.entries(bySeed).map(([k, list]) => {
      const best = list.reduce((a, b) => ((b.delta.mean ?? -1e9) > (a.delta.mean ?? -1e9) ? b : a));
      return { seed: k, kind: k.startsWith("placeboScaled") ? "scaled" : "fitted",
        bestDeltaMean: best.delta.mean, bestDeltaT: best.delta.t,
        bestAbs: best.abs.mean,
        cell: `${WINDOWS[best.arm.winIdx].key}|${CURVES[best.arm.curveIdx].key}`,
        /* MAELITAEKIS-VILLA SEM FANNST VID FYRSTU FULLU KEYRSLU OG ER
           SKJALFEST HER SVO HUN VERDI EKKI SETT INN AFTUR:
           throskuldurinn var `max |t|` yfir oll placebo-holf og maeldist
           **22,238** — meðan BESTA havada-holf sama seeds gaf delta
           **-1,536 pp** (t = -1,318). Talan kom ur holfi thar sem
           havadinn EYDILEGGUR akvordunina afar aftanlega: `const0.9`
           blandar 10% havada inn i hverja viku, thad tapar litlu en
           tapar ALLTAF, svo dreifingin er orsmá og |t| risastórt.
           `max |t|` er thvi throskuldur fyrir "hve marktaekt getur
           havadi litid ut, i HVORA att sem er" — og spurningin er
           einhlida: hve mikinn SYNDARABATA getur havadi framkallad.
           Throskuldurinn er `maxPositiveT`. `maxAbsT` er birt afram
           sem greiningartala og MA EKKI vera throskuldur.
           Sama gildir um `cellsSignificant`: 46 af 52 holfum voru
           "marktaek" hja kvarda-samstilltum placeboum — af thvi ad
           thau voru marktaekt VERRI. Talan er klofin. */
        maxAbsT: Math.max(...list.map((s) => Math.abs(s.delta.t ?? 0))),
        maxPositiveT: Math.max(...list.map((s) => (s.delta.t == null ? -1e9 : s.delta.t))),
        cellsSignificantPositive: list.filter((s) => s.delta.significant && s.delta.mean > 0).length,
        cellsSignificantNegative: list.filter((s) => s.delta.significant && s.delta.mean < 0).length,
        cells: list.length };
    });
    const scaled = seedBest.filter((s) => s.kind === "scaled");
    const fitted = seedBest.filter((s) => s.kind === "fitted");
    const ceilingDelta = Math.max(...seedBest.map((s) => s.bestDeltaMean ?? -1e9));
    /* Einhlida thak — sja skyringuna vid `maxPositiveT`. */
    const ceilingT = Math.max(...seedBest.map((s) => s.maxPositiveT));
    const ceilingAbsT = Math.max(...seedBest.map((s) => s.maxAbsT));
    const ceilingAbs = Math.max(...seedBest.map((s) => s.bestAbs ?? -1e9));
    /* Thakid ur KVARDA-SAMSTILLTU seedunum eingongu. Thad er birt vid
       hlidina thvi `placeboFit` er ekki hreinn havadi i framkvaemd:
       fittadur halli a havada maelist ~0 og eftir stendur skurd-
       punkturinn, sem er MEDALTAL STODUNNAR — thad er samdrattur, ekki
       havadi. Vaeri adeins haerra thakid birt gaeti "placebo vann"
       thytt "samdrattur vann" an ad thad kaemi fram. `constMean`
       maelir samdrattinn beint svo lesandi geti skilid thetta i
       sundur. Throskuldurinn er samt HAERRA thakid — varfaerni. */
    const ceilingScaledOnly = Math.max(...scaled.map((s) => s.bestDeltaMean ?? -1e9));
    const plcMeans = seedBest.map((s) => s.bestDeltaMean).filter((x) => x != null);
    const plcMu = mean(plcMeans);
    const plcSd = Math.sqrt(plcMeans.reduce((a, x) => a + (x - plcMu) ** 2, 0) /
      Math.max(1, plcMeans.length - 1));
    const plcPI = [r3(plcMu - tCrit(plcMeans.length) * plcSd * Math.sqrt(1 + 1 / plcMeans.length)),
                   r3(plcMu + tCrit(plcMeans.length) * plcSd * Math.sqrt(1 + 1 / plcMeans.length))];
    console.log(`  placebo-thak: besta havada-holf +${r3(ceilingDelta)} pp yfir vidmidid ` +
      `(einhlida t <= ${r3(ceilingT)}; tvihlida |t| <= ${r3(ceilingAbsT)} og THAD ER EKKI ` +
      `throskuldurinn), forspárbil [${plcPI[0]}, ${plcPI[1]}]`);
    console.log(`    · kvarda-samstillt: ${scaled.map((s) => sgn(s.bestDeltaMean)).join(" ")}`);
    console.log(`    · eigid fitt:       ${fitted.map((s) => sgn(s.bestDeltaMean)).join(" ")}`);

    /* ---------- raunverulegu breyturnar ---------- */
    const real = armStats.filter((s) => isGrid(s) && REAL_KINDS.has(ARM_VARS[s.arm.varIdx].kind));
    const ctrl = armStats.filter((s) => isGrid(s) && ARM_VARS[s.arm.varIdx].kind === "control");
    const orc = armStats.filter((s) => isGrid(s) && ARM_VARS[s.arm.varIdx].kind === "oracle");
    const bestReal = real.reduce((a, b) => ((b.delta.mean ?? -1e9) > (a.delta.mean ?? -1e9) ? b : a));
    const bestAbsReal = real.reduce((a, b) => ((b.abs.mean ?? -1e9) > (a.abs.mean ?? -1e9) ? b : a));

    console.log(`\n  BESTA RAUNVERULEGA HOLFID (delta yfir vidmidid):`);
    const bk = (s) => `${ARM_VARS[s.arm.varIdx].key} · ${WINDOWS[s.arm.winIdx].key} · ${CURVES[s.arm.curveIdx].key}`;
    console.log(`    ${bk(bestReal)}  delta ${sgn(bestReal.delta.mean)} pp ` +
      `(t=${bestReal.delta.t}, ${bestReal.delta.wins}/${bestReal.delta.years}) ` +
      `-> alger ${bestReal.abs.mean}% af bilinu`);

    /* ---------- AKKERIN ----------
       Fjorir fastir punktar a somu kvarda: hending (floor), spa/17
       (0% eftir skilgreiningu), vidmidid, og fullkomin vitneskja
       (100%). Ofan a thau tvo ORAKEL-armar sem fara gegnum SAMA net
       og spa-armarnir og segja hvad netid gaeti unnid i besta falli,
       og `constMean` sem segir hvad hreinn samdrattur gefur.
       An thessa er "0,3 pp" tala an mælistiku. */
    const anchorFloor = {};
    for (const y of ys) {
      const o = perSeasonRaw[y];
      const gap = o.ref.ceil[0] - o.ref.flat[0];
      anchorFloor[y] = gap > 0 ? (o.ref.floor[0] - o.ref.flat[0]) / gap * 100 : null;
    }
    const bestOracle = orc.length
      ? orc.reduce((a, b) => ((b.abs.mean ?? -1e9) > (a.abs.mean ?? -1e9) ? b : a)) : null;
    const bestOracleUsage = orc.filter((s) => ARM_VARS[s.arm.varIdx].key === "oracleUsage");
    const bestOU = bestOracleUsage.length
      ? bestOracleUsage.reduce((a, b) => ((b.abs.mean ?? -1e9) > (a.abs.mean ?? -1e9) ? b : a)) : null;
    const bestCtrl = ctrl.length
      ? ctrl.reduce((a, b) => ((b.delta.mean ?? -1e9) > (a.delta.mean ?? -1e9) ? b : a)) : null;
    const anchors = {
      randomFloorPct: statsOf(anchorFloor),
      flatPct: 0, ceilingPct: 100,
      incumbentPct: { mean: incStats.mean, t: incStats.t, years: incStats.years },
      oracleBest: bestOracle ? { cell: bk(bestOracle), pctOfGapClosed: bestOracle.abs.mean,
        delta: bestOracle.delta.mean, t: bestOracle.delta.t } : null,
      oracleUsageBest: bestOU ? { cell: bk(bestOU), pctOfGapClosed: bestOU.abs.mean,
        delta: bestOU.delta.mean, t: bestOU.delta.t, years: bestOU.delta.years,
        wins: bestOU.delta.wins } : null,
      shrinkToMeanBest: bestCtrl ? { cell: bk(bestCtrl), pctOfGapClosed: bestCtrl.abs.mean,
        delta: bestCtrl.delta.mean, t: bestCtrl.delta.t, years: bestCtrl.delta.years,
        wins: bestCtrl.delta.wins } : null,
      note: "The oracle arms run through the identical blend/net. oracleUsage is the ceiling of " +
        "the mechanism this lab tests: perfect knowledge of THIS WEEK's target share, converted " +
        "by the same within-season mapping. If it gains and season-to-date does not, the mapping " +
        "works and the signal is absent; if it does not gain either, the mechanism is the limit.",
    };
    console.log(`  AKKERI: hending ${r2(anchors.randomFloorPct.mean)}% · flat 0% · ` +
      `vidmid ${incStats.mean}% · fullkomid 100%`);
    if (bestOU) {
      console.log(`    orakel-notkun (viku-w tshare, sama vorpun): ${bestOU.abs.mean}% ` +
        `(delta ${sgn(bestOU.delta.mean)} pp, t=${bestOU.delta.t}, ${bestOU.delta.wins}/${bestOU.delta.years})` +
        `   [${bk(bestOU)}]`);
    }
    if (bestCtrl) {
      console.log(`    samdrattur ad medaltali stodunnar: ${sgn(bestCtrl.delta.mean)} pp ` +
        `(t=${bestCtrl.delta.t}, ${bestCtrl.delta.wins}/${bestCtrl.delta.years})   [${bk(bestCtrl)}]`);
    }

    /* ---------- notkun a moti stigum ---------- */
    const bestPoints = real.filter((s) => ARM_VARS[s.arm.varIdx].kind === "points")
      .reduce((a, b) => ((b.delta.mean ?? -1e9) > (a.delta.mean ?? -1e9) ? b : a));
    const bestUsage = real.filter((s) => ARM_VARS[s.arm.varIdx].kind === "usage")
      .reduce((a, b) => ((b.delta.mean ?? -1e9) > (a.delta.mean ?? -1e9) ? b : a));
    const puPer = {};
    for (const y of ys) {
      puPer[y] = (bestUsage.per[y] == null || bestPoints.per[y] == null)
        ? null : bestUsage.per[y] - bestPoints.per[y];
    }
    const pointsVsUsage = { bestPoints: { cell: bk(bestPoints), ...bestPoints.delta },
      bestUsage: { cell: bk(bestUsage), ...bestUsage.delta },
      usageMinusPoints: statsOf(puPer), ci: ciSeason(puPer) };
    console.log(`  NOTKUN a moti STIGUM: notkun ${sgn(bestUsage.delta.mean)} · ` +
      `stig ${sgn(bestPoints.delta.mean)} · munur ${sgn(pointsVsUsage.usageMinusPoints.mean)} ` +
      `(t=${pointsVsUsage.usageMinusPoints.t})`);

    /* ---------- gluggarnir: stokk a moti slettu ---------- */
    const byWindow = {};
    for (const w of WINDOWS) {
      const sub = real.filter((s) => WINDOWS[s.arm.winIdx].key === w.key);
      const best = sub.reduce((a, b) => ((b.delta.mean ?? -1e9) > (a.delta.mean ?? -1e9) ? b : a));
      byWindow[w.key] = { bestCell: bk(best), delta: best.delta, abs: best.abs };
    }
    const jumpVsAll = {};
    {
      /* Pardur samanburdur: SAMA breyta, SAMI ferill, adeins glugginn
         olikur. Ad bera besta `jump`-holf vid besta `all`-holf vaeri
         ad bera tvo urtaksval saman. */
      const pairs = [];
      for (const s of real) {
        if (WINDOWS[s.arm.winIdx].key !== "jump") continue;
        const m = real.find((q) => q.arm.varIdx === s.arm.varIdx &&
          q.arm.curveIdx === s.arm.curveIdx && WINDOWS[q.arm.winIdx].key === "all");
        if (m && s.delta.mean != null && m.delta.mean != null) {
          pairs.push(s.delta.mean - m.delta.mean);
        }
      }
      jumpVsAll.cells = pairs.length;
      jumpVsAll.meanDelta = r3(mean(pairs));
      jumpVsAll.positive = pairs.filter((x) => x > 0).length;
    }
    const last3VsAll = {};
    {
      const pairs = [];
      for (const s of real) {
        if (WINDOWS[s.arm.winIdx].key !== "last3") continue;
        const m = real.find((q) => q.arm.varIdx === s.arm.varIdx &&
          q.arm.curveIdx === s.arm.curveIdx && WINDOWS[q.arm.winIdx].key === "all");
        if (m && s.delta.mean != null && m.delta.mean != null) pairs.push(s.delta.mean - m.delta.mean);
      }
      last3VsAll.cells = pairs.length;
      last3VsAll.meanDelta = r3(mean(pairs));
      last3VsAll.positive = pairs.filter((x) => x > 0).length;
    }
    console.log(`  GLUGGAR: jump - all = ${jumpVsAll.meanDelta} pp (${jumpVsAll.positive}/${jumpVsAll.cells} holf) · ` +
      `last3 - all = ${last3VsAll.meanDelta} pp (${last3VsAll.positive}/${last3VsAll.cells})`);

    /* ---------- ctx: kemur abatinn ur blondunni eda markadslidnum? ---------- */
    const ctxContrast = [];
    for (const s of real) {
      const m = armStats.find((q) => q.arm.tag === "gridNoCtx" &&
        q.arm.varIdx === s.arm.varIdx && q.arm.winIdx === s.arm.winIdx &&
        q.arm.curveIdx === s.arm.curveIdx);
      if (m && s.abs.mean != null && m.abs.mean != null) ctxContrast.push(s.abs.mean - m.abs.mean);
    }
    const ctxGain = { cells: ctxContrast.length, meanDelta: r3(mean(ctxContrast)),
      positive: ctxContrast.filter((x) => x > 0).length };

    /* ---------- WALK-FORWARD VAL ---------- */
    const wfOf = (cands) => {
      const per = {}, chosen = {};
      for (let i = 2; i < ys.length; i++) {
        const test = ys[i], prior = ys.slice(0, i);
        let best = null, bestM = -Infinity;
        for (const s of cands) {
          /* VALID ER A DELTA, ekki a algeru hlutfalli. Vidmidid sveiflast
             milli ara (1,27% arid 2020, 11,84% arid 2023), svo val a
             algerri tolu vegur ARIN i stad HOLFANNA — og thad er ekki
             sama spurning. Skiptir mali: fyrsta utgafan valdi a `per`. */
          const v = prior.map((y) => (s.per[y] == null || incPct[0][y] == null
            ? null : s.per[y] - incPct[0][y])).filter((x) => x != null && Number.isFinite(x));
          if (v.length < 2) continue;
          const m = mean(v);
          if (m > bestM) { bestM = m; best = s; }
        }
        if (!best || best.per[test] == null) continue;
        per[test] = best.per[test] - incPct[0][test];
        chosen[test] = bk(best);
      }
      return { per, chosen, stats: statsOf(per), ci: ciSeason(per) };
    };
    const wfReal = wfOf(real);
    const wfPlacebo = wfOf(plc);
    console.log(`  WALK-FORWARD val: raunverulegt ${sgn(wfReal.stats.mean)} pp ` +
      `(${wfReal.stats.wins}/${wfReal.stats.years}, t=${wfReal.stats.t}) · ` +
      `placebo ${sgn(wfPlacebo.stats.mean)} pp`);
    for (const y of Object.keys(wfReal.chosen)) {
      console.log(`      ${y}: valdi ${wfReal.chosen[y]}  -> ${sgn(wfReal.per[y])} pp`);
    }

    /* ---------- ferillinn og per stodu ---------- */
    const curveTable = {};
    for (const vkey of ["ptsPG", "tshare_self", "wopr_self", "opp_self", "car_self", "tgt_self"]) {
      const vi = VAR_IDX.get(vkey);
      curveTable[vkey] = {};
      for (const w of ["all", "last3"]) {
        const wi = WINDOWS.findIndex((x) => x.key === w);
        curveTable[vkey][w] = {};
        for (let c = 1; c < NCURVE; c++) {
          const s = real.find((q) => q.arm.varIdx === vi && q.arm.winIdx === wi &&
            q.arm.curveIdx === c);
          if (s) curveTable[vkey][w][CURVES[c].key] = { abs: s.abs.mean, delta: s.delta.mean,
            t: s.delta.t, wins: s.delta.wins, years: s.delta.years };
        }
      }
    }
    const perPos = {};
    for (const s of armStats) {
      if (s.arm.tag !== "perPos") continue;
      const vk = ARM_VARS[s.arm.varIdx].key, wk2 = WINDOWS[s.arm.winIdx].key;
      ((perPos[s.arm.pos] = perPos[s.arm.pos] || {})[vk] =
        perPos[s.arm.pos][vk] || {})[wk2] = perPos[s.arm.pos][vk][wk2] || {};
      perPos[s.arm.pos][vk][wk2][CURVES[s.arm.curveIdx].key] =
        { delta: s.delta.mean, t: s.delta.t, wins: s.delta.wins };
    }

    /* ---------- greiningartalan: flyst notkun thar sem stig gera ekki? ---------- */
    const sdY = yAcc.n > 1 ? Math.sqrt(yAcc.s2 / yAcc.n - (yAcc.s / yAcc.n) ** 2) : null;
    const corr = {};
    for (const pos of POSITIONS) {
      corr[pos] = {};
      for (let m = 0; m < METRICS.length; m++) {
        corr[pos][METRICS[m]] = { all: r3(accCorr(globalAcc, pos, m, 0, sdY)),
                                  last3: r3(accCorr(globalAcc, pos, m, 1, sdY)) };
      }
      const nz = [];
      for (let s = 0; s < NOISE_SEEDS.length; s++) {
        const c = accCorr(globalAcc, pos, NOISE_MET0 + s, 0, sdY);
        if (c != null) nz.push(Math.abs(c));
      }
      /* NULL, EKKI NULLTALA. Fyrsta utgafan skrifadi `x ?? 0` og TE
         (sem hafdi undir 200 leikmanna-vikur i eins-ars profkeyrslu)
         fekk "havadi <= 0" — sem les eins og MAELING um ad havadi hafi
         enga fylgni. Sama regla og i FPL-appinu: tomt gildi er slepp,
         ekki sett i 0. */
      corr[pos].noiseAbsMax = nz.length ? r3(Math.max(...nz)) : null;
    }
    /* SAMA FYLGNI GEGN LEIFINNI. Thetta er vikulega utgafan af `first4`
       (feature_probe.json: r = -0,134) og hun er ekki sami maelikvardi
       og fylgni vid hra stig: hra stig maela "er hann godur", leifin
       maelir "SLAER hann sinni eigin spa". `first4` var negatift —
       spurningin er hvort thad endurtaki sig i viku-glugganum og hvort
       thad se olikt fyrir NOTKUN og STIG. */
    const sdR = yAcc.rn > 1 ? Math.sqrt(yAcc.rs2 / yAcc.rn - (yAcc.rs / yAcc.rn) ** 2) : null;
    const corrR = {};
    for (const pos of POSITIONS) {
      corrR[pos] = {};
      for (let m = 0; m < METRICS.length; m++) {
        corrR[pos][METRICS[m]] = { all: r3(accCorr(residAcc, pos, m, 0, sdR)),
                                   last3: r3(accCorr(residAcc, pos, m, 1, sdR)) };
      }
      const nz = [];
      for (let s = 0; s < NOISE_SEEDS.length; s++) {
        const c = accCorr(residAcc, pos, NOISE_MET0 + s, 0, sdR);
        if (c != null) nz.push(Math.abs(c));
      }
      corrR[pos].noiseAbsMax = nz.length ? r3(Math.max(...nz)) : null;
    }
    diagnostics[fmt] = { weeklyPointsSd: r3(sdY), n: yAcc.n,
      residualSd: r3(sdR), nResidual: yAcc.rn,
      correlationWithNextWeekPoints: corr,
      correlationWithResidualVsProjection: corrR,
      residualNote: "residual = actual week-w points minus projection/17. This is the weekly " +
        "analogue of feature_probe.json's first4 (r = -0.134 against the residual over a full " +
        "season). Correlation with raw points only says 'good players score more'." };
    console.log(`\n  FYLGNI z(notkun fyrir viku w) VID STIG I VIKU w (${yAcc.n} leikmanna-vikur):`);
    for (const pos of POSITIONS) {
      console.log(`    ${pos}  ` + METRICS.map((m) => `${m} ${corr[pos][m].all == null ? " -  " : corr[pos][m].all.toFixed(3)}`).join(" · ") +
        `  | havadi <= ${corr[pos].noiseAbsMax == null ? "engin gogn" : corr[pos].noiseAbsMax}`);
    }
    console.log(`  SAMA GEGN LEIFINNI (raunstig - spa/17) — vikulega utgafan af first4 (-0,134):`);
    for (const pos of POSITIONS) {
      console.log(`    ${pos}  ` + METRICS.map((m) => `${m} ${corrR[pos][m].all == null ? " -  " : corrR[pos][m].all.toFixed(3)}`).join(" · ") +
        `  | havadi <= ${corrR[pos].noiseAbsMax == null ? "engin gogn" : corrR[pos].noiseAbsMax}`);
    }

    /* ---------- BOOTSTRAP KLASAD PER LEIKMANN ---------- */
    let bootRes = null;
    if (BOOT > 0) {
      const finalists = [];
      const pushF = (s, tag) => { if (s && !finalists.find((f) => f.ai === s.ai)) finalists.push({ ...s, tag }); };
      pushF(bestReal, "bestRealDelta");
      pushF(bestAbsReal, "bestRealAbsolute");
      pushF(bestUsage, "bestUsage");
      pushF(bestPoints, "bestPoints");
      /* Besta holfid I SEINNI HLUTA TIMABILSINS. Ferillinn segir ad
         merkid liggi thar, svo thad er thad holf sem tharf per-leikmanns
         vikmork — ekki adeins thad sem vinnur a samlaginu. */
      const lateKey = BINS[NBIN - 1].key;
      const bestLate = real.reduce((a, b) =>
        (((b.bins[lateKey].delta.mean ?? -1e9) > (a.bins[lateKey].delta.mean ?? -1e9)) ? b : a));
      pushF(bestLate, "bestLateSeason");
      const bestPlc = plc.reduce((a, b) => ((b.delta.mean ?? -1e9) > (a.delta.mean ?? -1e9) ? b : a));
      pushF(bestPlc, "bestPlacebo");
      console.log(`\n  bootstrap klasad per leikmann (${BOOT} itranir, ${finalists.length} holf) …`);
      bootRes = await playerBootstrap({ finalists, arms, ys, keep, dvp, incArmIdx: idxIncumbent });
      for (const f of bootRes) {
        const lb = f.bins[BINS[NBIN - 1].key];
        console.log(`    ${f.tag.padEnd(18)} ${f.cell.padEnd(38)} ` +
          `delta ${sgn(f.mean)} · 95% [${f.lo}, ${f.hi}] · ${f.excludesZero ? "UTILOKAR NULL" : "inniheldur null"}` +
          (lb ? `   | ${BINS[NBIN - 1].key} ${sgn(lb.mean)} [${lb.lo}, ${lb.hi}] ` +
            `${lb.excludesZero ? "UTILOKAR NULL" : "inniheldur null"}` : ""));
      }
    }

    /* ---------- utkoma ---------- */
    const grid = {};
    for (const s of real) {
      const vk = ARM_VARS[s.arm.varIdx].key, w = WINDOWS[s.arm.winIdx].key, c = CURVES[s.arm.curveIdx].key;
      ((grid[vk] = grid[vk] || {})[w] = grid[vk][w] || {})[c] = {
        pctOfGapClosed: s.abs.mean, pctT: s.abs.t,
        deltaVsIncumbent: s.delta.mean, t: s.delta.t,
        years: s.delta.years, wins: s.delta.wins,
        ciT: s.delta.ci, ciSeasonBootstrap: s.ciSeasonDelta,
        beatsPlaceboCeiling: (s.delta.mean ?? -1e9) > ceilingDelta &&
          (s.delta.t ?? -1e9) > ceilingT,
        beatsScaledPlaceboCeiling: (s.delta.mean ?? -1e9) > ceilingScaledOnly,
        bins: Object.fromEntries(Object.entries(s.bins).map(([k, v]) =>
          [k, { pctOfGapClosed: v.abs.mean, delta: v.delta.mean, t: v.delta.t,
                wins: v.delta.wins, years: v.delta.years }])),
      };
    }

    results[fmt] = {
      seasons: ys,
      lineupsPerSeason: Object.fromEntries(ys.map((y) => [y, perSeasonRaw[y].ref.n[0]])),
      incumbent: { pctOfGapClosed: incStats.mean, t: incStats.t, years: incStats.years,
        wins: incStats.wins, ci: incStats.ci, perSeason: Object.fromEntries(
          ys.map((y) => [y, r3(incPct[0][y])])),
        bins: Object.fromEntries(BINS.slice(1).map((b, i) =>
          [b.key, statsOf(incPct[i + 1]).mean])),
        onDisk: incumbentRef[fmt] ? incumbentRef[fmt].pctOfGapClosed : null },
      grid,
      curveTable,
      perPosition: perPos,
      anchors,
      placebo: { seeds: seedBest, ceilingDeltaVsIncumbent: r3(ceilingDelta),
        ceilingAbsPct: r3(ceilingAbs),
        ceilingMaxPositiveT: r3(ceilingT), ceilingMaxAbsT: r3(ceilingAbsT),
        ceilingDeltaScaledOnly: r3(ceilingScaledOnly),
        tThresholdNote: "ceilingMaxPositiveT is the threshold; ceilingMaxAbsT is NOT. On the " +
          "first full run the two-sided max reached |t| = 22.2 for a seed whose best gain was " +
          "-1.5 pp: the cell was const0.9, which blends 10% noise every week, loses a little and " +
          "loses it EVERY season, so the variance is tiny and |t| is huge. That is a threshold " +
          "for 'how significant can noise look in either direction', and the question is " +
          "one-sided. cellsSignificant is split for the same reason: 46 of 52 scaled-placebo " +
          "cells were significant because they were significantly WORSE.",
        predictionInterval: plcPI,
        note: "Two placebo kinds through the identical grid. 'scaled' carries the median real " +
          "slope (same magnitude, no information) and is the honest ceiling; 'fitted' fits its " +
          "own slope, which on noise measures ~0, so what survives is the INTERCEPT — the " +
          "positional mean. That is shrinkage, not noise, which is why the control arm " +
          "constMean measures it by name (see anchors.shrinkToMeanBest). The HIGHER ceiling is " +
          "the threshold; ceilingDeltaScaledOnly is reported so the two cannot be confused." },
      pointsVsUsage,
      windows: { byWindow, jumpVsAll, last3VsAll },
      contextGain: ctxGain,
      walkForward: { real: wfReal, placebo: wfPlacebo },
      bestCells: {
        byDelta: { cell: bk(bestReal), ...bestReal.delta, absolutePct: bestReal.abs.mean },
        byAbsolute: { cell: bk(bestAbsReal), pctOfGapClosed: bestAbsReal.abs.mean,
          delta: bestAbsReal.delta.mean, t: bestAbsReal.delta.t },
      },
      playerBootstrap: bootRes,
    };
  }

  /* ============================================================
     VERDICT — REIKNADUR UR TOLUNUM, ekki skrifadur ofan i thaer
     ============================================================ */
  const verdict = computeVerdict(results);
  console.log(`\n${"=".repeat(72)}`);
  console.log(`  ${verdict.headline}`);
  console.log("=".repeat(72));
  console.log(`  ${verdict.text.replace(/(.{100}?) /g, "$1\n  ")}`);

  if (selfTests.failures.length) {
    console.error(`\n  SJALFSPROF FELL — SKRIFA EKKERT:`);
    for (const f of selfTests.failures) console.error(`   · ${f}`);
    console.error(`\n  Tom eda ostadfest maelingarskra er verri en engin.\n`);
    process.exit(2);
  }
  console.log(`\n  sjalfsprof: ${selfTests.rows.length} atridi, 0 fell`);

  await mkdir(MEASURE, { recursive: true });
  await writeFile(path.join(MEASURE, "usage.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { from: 2019, boot: 150, bootslots: 12 },
      inputs: ["features.json", "schedule_history.json", "defense.json",
               "startsit_ppr.json", "startsit_standard.json",
               "weekly/2019.json", "weekly/2020.json", "weekly/2021.json",
               "weekly/2022.json", "weekly/2023.json", "weekly/2024.json",
               "weekly/2025.json"],
      dataDir: OUT }),
    question: "Does season-to-date usage improve the weekly start/sit decision on top of " +
      "weeklyProjection(), whose base is the preseason projection divided by 17?",
    metric: "percent of the available gap closed: (arm - flat) / (ceiling - flat), where flat " +
      "is projection/17 (what the app does today) and ceiling is perfect knowledge of the week. " +
      "Identical to scripts/startsit-lab.mjs.",
    nullHypothesis: "w = 1 — season projection only. It wins unless the intervals exclude it.",
    design: {
      arms: arms.length,
      variables: ARM_VARS.map((v) => ({ key: v.key, kind: v.kind, map: v.map, label: v.label })),
      windows: WINDOWS.map((w) => w.key),
      jumpThresholdSd: JUMP_SD,
      curves: CURVES.map((c) => ({ key: c.key, label: c.label || null })),
      weekBins: BINS.map((b) => b.key),
      league: { teams: TEAMS, rounds: ROUNDS, starters: LEAGUE.starters },
      leakGuards: [
        "at week w only weeks < w enter any estimate",
        "the self mapping is a within-season cross-section over weeks < w only",
        "the prior mapping accumulator is merged only AFTER a season has been measured",
        "the curve is also chosen walk-forward (selection on prior seasons, measured on the season)",
        "rosters come from ADP-simulated drafts; scores are always the real weekly points",
      ],
      binNote: "w10-18, not w10-17: the weekly files carry week 18 and startsit-lab counts it " +
        "(`if (w.week > 18) continue`). Dropping it here would break the correspondence with the " +
        "number being beaten, and a label saying 17 while 18 is inside is an unmeasured number " +
        "in disguise.",
      diagnosticNote: "diagnostics.correlation* pool ALL seasons and are descriptive, in-sample " +
        "numbers. They enter no arm. Only the prior mapping accumulator is used predictively, " +
        "and it is merged strictly after each season has been measured.",
    },
    seasons: seasonsUsed,
    selfTests,
    diagnostics,
    results,
    verdict,
  }, null, 1));
  console.log(`\n-> data/measure/usage.json`);
}

/* ============================================================
   11. BOOTSTRAP KLASAD PER LEIKMANN
   ============================================================
   Endursynir LAUGINA (med endurtekningu, klonud id eins og
   `vbdbase-lab`), draftar upp a nytt og maelir sama arm. Svarar
   "flokta LEIKMENNIRNIR?" — hefdi onnur teikning ur somu dreifingu
   gefid somu akvordun? `vbdbase-lab` fekk 29 holf marktaek klasad
   eftir timabili og **0 af 153** klasad per leikmann.

   ThAD SEM ER HALDID FOSTU OG ThAD ER SAGT: z, vorpunin og
   `estByWeek` eru reiknud a RAUNVERULEGU lauginni og haldin fostum.
   Vikmorkin maela thvi utkomu-ovissu vid gefna kvordun, ekki
   ovissu i kvordunni sjalfri — sama afmorkun og `vbdbase-lab` skrair
   um fittud saeti. */
async function playerBootstrap({ finalists, arms, ys, keep, dvp, incArmIdx }) {
  const armList = [arms[incArmIdx], ...finalists.map((f) => f.arm)];
  /* VIKMORKIN ERU TEKIN PER VIKU-BIL LIKA, ekki adeins a samlaginu.
     Ferillinn er nidurstadan og hann liggur i seinni bilunum — ef
     krafan "per-leikmanns vikmork utiloka null" er adeins profud a
     "all" er sterkasta fullyrdingin (vika 10+) OPROFUD med thvi
     maelitaeki sem `vbdbase-lab` sagdi ad vaeri hid raunverulega
     (29 marktaek eftir timabili, 0 af 153 per leikmann). */
  const out = finalists.map((f) => ({ tag: f.tag, ai: f.ai,
    cell: `${ARM_VARS[f.arm.varIdx].key} · ${WINDOWS[f.arm.winIdx].key} · ${CURVES[f.arm.curveIdx].key}`,
    samples: [], binSamples: BINS.map(() => []) }));

  for (let b = 0; b < BOOT; b++) {
    const perSeason = [];      // [ { deltaForEachFinalist } ]
    for (const y of ys) {
      const K = keep[y];
      let s = (y * 100003 + b * 7919 + 17) >>> 0;
      const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      const src = K.pool;
      const res = new Array(src.length);
      for (let i = 0; i < src.length; i++) {
        const p = src[Math.floor(rnd() * src.length)];
        res[i] = { ...p, id: `${p.id}#${i}`, origin: p.id };
      }
      const projOf = new Map(res.map((p) => [p.origin, p.proj]));
      const rosters = draftRosters(res, BOOT_SLOTS);
      const idOf = (id) => id.slice(0, id.indexOf("#"));
      const r = runArms({ arms: armList, rosters, weeks: K.weeks, wk: K.wk, projOf,
        estByWeek: K.estByWeek, implied: K.implied, oppOf: K.oppOf, dvp,
        teamWk: K.teamWk, season: y, idOf, seed: y * 7919 + b });
      const gap = r.ref.ceil[0] - r.ref.flat[0];
      if (!(gap > 0)) continue;
      const pctAt = (i, bin) => {
        const g = r.ref.ceil[bin] - r.ref.flat[bin];
        return g > 0 ? (r.sum[i * NBIN + bin] - r.ref.flat[bin]) / g * 100 : null;
      };
      const row = out.map((_, k) => BINS.map((_b, bin) => {
        const a = pctAt(k + 1, bin), i0 = pctAt(0, bin);
        return (a == null || i0 == null) ? null : a - i0;
      }));
      perSeason.push(row);
    }
    if (!perSeason.length) continue;
    for (let k = 0; k < out.length; k++) {
      out[k].samples.push(mean(perSeason.map((v) => v[k][0])));
      for (let bin = 0; bin < NBIN; bin++) {
        const v = perSeason.map((x) => x[k][bin]).filter((x) => x != null);
        if (v.length) out[k].binSamples[bin].push(mean(v));
      }
    }
  }
  const ci = (arr) => {
    if (!arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b);
    const lo = r3(s[Math.floor(s.length * 0.025)]), hi = r3(s[Math.floor(s.length * 0.975)]);
    return { iterations: s.length, mean: r3(mean(s)), lo, hi, excludesZero: lo > 0 || hi < 0 };
  };
  for (const o of out) {
    const top = ci(o.samples);
    o.iterations = top.iterations; o.mean = top.mean; o.lo = top.lo; o.hi = top.hi;
    o.excludesZero = top.excludesZero;
    o.bins = {};
    for (let bin = 1; bin < NBIN; bin++) o.bins[BINS[bin].key] = ci(o.binSamples[bin]);
    delete o.samples; delete o.binSamples; delete o.ai;
  }
  return out;
}

/* ============================================================
   12. VERDICT
   ============================================================
   Reiknadur ur tolunum svo hann geti ekki rekid fra sinni eigin
   skra — sama regla og `agecurve-lab.mjs`. */
function computeVerdict(results) {
  const rows = [];
  for (const fmt of Object.keys(results)) {
    const R = results[fmt];
    const best = R.bestCells.byDelta;
    const plcCeil = R.placebo.ceilingDeltaVsIncumbent;
    const plcT = R.placebo.ceilingMaxPositiveT;
    const boot = (R.playerBootstrap || []).find((f) => f.tag === "bestRealDelta");
    const beatsPlacebo = best.mean != null && best.mean > plcCeil &&
      (best.t ?? -1e9) > plcT;
    const wf = R.walkForward.real.stats;
    rows.push({ format: fmt,
      incumbent: R.incumbent.pctOfGapClosed,
      bestCell: best.cell, bestDelta: best.mean, bestT: best.t,
      bestAbsolutePct: best.absolutePct,
      years: best.years, wins: best.wins,
      placeboCeiling: plcCeil, placeboMaxPositiveT: plcT,
      placeboMaxAbsT: R.placebo.ceilingMaxAbsT,
      placeboCeilingScaledOnly: R.placebo.ceilingDeltaScaledOnly,
      beatsPlaceboCeiling: beatsPlacebo,
      parametricSignificant: !!best.significant,
      playerBootstrapExcludesZero: boot ? boot.excludesZero : null,
      walkForwardDelta: wf.mean, walkForwardT: wf.t,
      walkForwardPlacebo: R.walkForward.placebo.stats.mean,
      /* AKKERIN eru med i verdict-radinni svo "fellur" se laesilegt:
         hafi orakel-notkunin unnid er merkid fjarverandi; hafi hun
         EKKI unnid er thad vélin sem er thakid. Tvennt oliku sem
         litur eins ut a tolu og verdur ad greinast i sundur. */
      oracleUsagePct: R.anchors.oracleUsageBest ? R.anchors.oracleUsageBest.pctOfGapClosed : null,
      oracleUsageDelta: R.anchors.oracleUsageBest ? R.anchors.oracleUsageBest.delta : null,
      shrinkToMeanDelta: R.anchors.shrinkToMeanBest ? R.anchors.shrinkToMeanBest.delta : null,
      usageMinusPointsDelta: R.pointsVsUsage.usageMinusPoints.mean,
      usageMinusPointsT: R.pointsVsUsage.usageMinusPoints.t,
      passes: !!(beatsPlacebo && best.significant && boot && boot.excludesZero &&
        wf.mean != null && wf.mean > (R.walkForward.placebo.stats.mean ?? Infinity)),
    });
  }
  const passing = rows.filter((r) => r.passes);
  const headline = passing.length
    ? `SEASON-TO-DATE BEATS THE PROJECTION IN ${passing.length}/${rows.length} SCORING FORMATS`
    : "SEASON-TO-DATE DOES NOT BEAT THE PROJECTION — w = 1 STANDS";
  const parts = rows.map((r) =>
    `${r.format}: incumbent closes ${r.incumbent}% of the gap; the best season-to-date cell ` +
    `(${r.bestCell}) adds ${r.bestDelta} pp (t=${r.bestT}, ${r.wins}/${r.years} seasons) for ` +
    `${r.bestAbsolutePct}% total; placebo noise reaches ${r.placeboCeiling} pp through the ` +
    `identical grid with one-sided t up to ${r.placeboMaxPositiveT} ` +
    `(${r.placeboCeilingScaledOnly} pp for the scale-matched placebos alone); ` +
    `walk-forward selection gives ` +
    `${r.walkForwardDelta} pp against ${r.walkForwardPlacebo} pp for placebo walk-forward; ` +
    `per-player bootstrap ${r.playerBootstrapExcludesZero === null ? "not run" :
      r.playerBootstrapExcludesZero ? "excludes zero" : "INCLUDES ZERO"}; usage beats points by ` +
    `${r.usageMinusPointsDelta} pp (t=${r.usageMinusPointsT}); the oracle anchor — perfect ` +
    `knowledge of this week's target share through the same mapping — reaches ` +
    `${r.oracleUsagePct}% of the gap (${r.oracleUsageDelta} pp over the incumbent), and pure ` +
    `shrinkage to the positional mean gives ${r.shrinkToMeanDelta} pp.`);
  const text = (passing.length
    ? "All four pre-set conditions hold where marked. "
    : "The null hypothesis w = 1 is not rejected. The grid contains positive cells — a grid this " +
      "wide always does — but they do not clear the placebo ceiling, the per-player bootstrap, or " +
      "walk-forward selection, which are the three instruments that separated real from noise in " +
      "opp-lab and vbdbase-lab. ") +
    parts.join(" ") +
    " NOTHING IS WIRED INTO src/ ON THIS EVIDENCE.";
  return { headline, text, conditions: [
    "the best real cell beats the placebo ceiling in mean pp and in one-sided t",
    "the paired per-season t against the incumbent beats the two-sided 5% critical value",
    "the per-player clustered bootstrap CI excludes zero",
    "walk-forward selection beats placebo walk-forward selection",
  ], perFormat: rows };
}

main().catch((e) => { console.error(e); process.exit(1); });
