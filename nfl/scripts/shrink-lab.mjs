#!/usr/bin/env node
/* ============================================================
   shrink-lab.mjs — A AD DRAGA SPANA AD FORGILDI I HLUTFALLI VID OVISSU?

     node scripts/shrink-lab.mjs [--runs=3] [--boot=2000] [--from=2015]

   -> data/measure/shrink.json

   SPURNINGIN. Sleeper-spain er sterkasta einstaka heimildin sem til er
   (r 0,696 gegn raunstigum, slaer ADP og serfraedinga) — en hun er
   PUNKTMAT og hun er JAFN-VISS UM ALLA. Nyliði an eins NFL-leiks og
   sjo-ara byrjunarmadur med 100 leiki fa bædi eina tolu an vikmarka.
   Stein-lik hnignun segir ad punktmat med lítið urtak eigi ad dragast
   ad forgildi:

       proj_shrunk = w * proj + (1 - w) * prior(pos)
       w           = 1 - k * u                     u i [0,1]

   `u` er OVISSA leikmannsins, `k` er hve fast er dregid. **k = 0 er
   nulltilgatan og hun ER NUVERANDI HEGDUN** (w = 1 fyrir alla, engin
   hnignun). Hun er i toflunni og hun vinnur nema vikmorkin utiloki
   hana.

   ============================================================
   THETTA ER NASKYLD HUGMYND OG NASKYLD HUGMYND VAR THEGAR FELLD
   ============================================================
   THRJAR MAELINGAR SEM LIGGJA FYRIR OG SEM THESSI SKRIFTA MA EKKI
   ENDURTAKA I DULARGERVI:

   1. FPL-verkefnid, CLAUDE.md kafli 4: "Stodu-forgildi i stad
      `ep_next` fyrir nyliða". Skekkjan var RAUNVERULEG en **hver
      leidretting gerdi spana VERRI** a lauginni sem appid beitir henni
      a (MAE 0,848 -> 0,873). Vordurinn `exp-points.mjs` fellur ef
      BLINT forgildi er sett inn. Su saga er advorun, ekki hvatning.

   2. `board-lab.mjs`, fjolskyldan `adpShrink`: spain dregin ad thvi
      sem ADP-saeti hans gefur til kynna innan stodunnar, med FASTRI
      vog. Nidurstada: **flatt, oll |t| < 0,75.**

   3. `arank-lab.mjs`, vidfangid `shrink`: hver spa faerd hlutfallslega
      ad medaltali stodunnar med FASTRI vog. Leitin fann +109 en
      walk-forward gaf +46 og vann 3 af 4 — havadi, ekki merki.

   HVAD ER NYTT HER OG HVERS VEGNA THAD ER ONNUR SPURNING: i (2) og (3)
   er `w` FASTI. Her er `w` FALL af ovissu. Sa greinarmunur er ekki
   orðaleikur: fost hnignun faerir ALLA jafnt og getur thvi adeins
   breytt bilunum milli threpanna, medan ovissu-hád hnignun faerir
   nyliðann meira en byrjunarmanninn og BREYTIR ROÐINNI milli theirra.
   Thess vegna er `uniform` (u = 1 fyrir alla) med sem MOTVIÐMIÐ i
   hverri einustu keyrslu: nái ovissu-maelir ekki ad slá `uniform` er
   ovissan sjalf ekki ad bera neitt, og thá er thetta bara (2) og (3)
   aftur.

   ============================================================
   MAELIKVARDINN ER AKVORDUNIN, EKKI MAE
   ============================================================
   Hnignun BAETIR MAE nanast alltaf — thad er hvad hun er til. Hun
   dregur sposta ad medaltali og medaltalid er alltaf naer. Og hun
   getur SAMT eyðilagt ROÐINA, sem er thad eina sem draft les. Sama
   nidurstada og `aron/verd` i FPL-verkefninu (thrautseigja upp,
   stig/leik nidur) og `sharpDelta` her (fylgni 0,105 i 7/7 arum, og
   ræður samt engu).

   Thess vegna er draft-hermunin adaltalan og MAE/rho eru birt VID
   HLIDINA. **Batni MAE en akvordunin versni er svarid NEI** og thad er
   skrad berum orðum i `verdict`.

   ============================================================
   HONNUN
   ============================================================
   - BEINT EINVIGI i somu deild: hnignaða bordid a moti hreinu VBD,
     bædi undir sama ADP-velli, badar attir a hverju saetapari. Sama rok
     og `arank-lab`: ars-havaðinn (sd ~150 stig) drekkir mun sem er ~50.
   - NEUTRALITETS-PROFID FYRST: k = 0 er bord gegn sjalfu ser og VERDUR
     ad gefa nakvaemlega 0. Gerdi thad thad ekki vaeri hermunin
     osamhverf og hver tala her merkingarlaus (5h regla 1).
   - WALK-FORWARD: `k` og forgildid valin a arum FYRIR profarinu. Hra
     leitin er birt LIKA, en hun er LEIT og er merkt sem slik — aldur
     vann hra leitina 4/4 og fell walk-forward 4/4.
   - BOOTSTRAP KLASAD PER TIMABIL (`learn.js` -> `bootstrapDiff`).
     ATH: verkefnid ber ekki per-leikmanns klosun A THESSUM MAELIKVARDA
     og thad er ekki afsokun heldur stadreynd um mælieininguna —
     utkoma drafts er EIN tala per (timabil, saeti, keyrsla) og engin
     leikmanns-rod er til ad klasa. Per-timabils klosun er thvi FINSTA
     rétta klosunin og hun er lika ihaldssamasta (5 eda 11 klasar).
   - TVAER SPAHEIMILDIR: `sleeper` (5 hrein timabil) og `fftoday`
     (11). Gildi FFToday er ENDURTEKNINGIN, ekki samlagningin
     (README 5h) — se merkid raunverulegt eiga bædi ad sja thad.
   - LEKA-HLIDID: hnignada spain fer gegnum SAMA hlid og
     `build-features` setur a hraspana — fylgni vid LEIKI SPILADA ma
     ekki fara yfir 0,40. Hun getur ekki tapad thvi profi (öll inntok
     eru draft-dags) og thess vegna er thad ODYRT ad keyra hana samt.

   HALF-PPR: PPR = STANDARD + mottokur, svo HALF = (STD + PPR)/2 upp a
   stig — algebra, ekki interpolun. Sama leid og `half-lab.mjs`.

   KJARNASPURNINGIN sem notandinn spurdi: er besta `k` OLIKT milli PPR
   og half? Tilgatan er efnisleg: mottokur eru fleiri tilvik per leik
   en TD, svo PPR-utkoma aetti ad vera minna havaðasom og hnignun aetti
   thvi ad THURFA ad vera MEIRI i standard/half. Thad er porud
   spurning — somu ar, somu leikmenn — svo hun er profud sem porud
   tvi-syni per timabili, ekki med tveimur ohadum medaltolum.
   ============================================================ */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { simulateDraft, DEFAULT_LEAGUE } from "../src/accuracy.js";
import { replacementRanks } from "../src/model.js";
import { mean, bootstrapDiff, spearman } from "../src/learn.js";
import { stamp } from "./lib/provenance.mjs";
import { parseArgs, requireSeasons } from "./lib/args.mjs";

const OUT = path.resolve(process.cwd(), "data");
const ARG = parseArgs(process.argv.slice(2),
  { runs: "number", boot: "number", from: "number" });
const RUNS = Number(ARG.runs || 3);
const BOOT = Number(ARG.boot || 2000);
const FROM = Number(ARG.from || 2015);

const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);

/** t-prof a medaltali ara. Frigradur = ar - 1. */
const tOf = (a) => {
  const v = a.filter((x) => x != null);
  if (v.length < 2) return null;
  const m = mean(v);
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
  return sd ? r3(m / (sd / Math.sqrt(v.length))) : null;
};
/* TVIHLIDA t-MORK VID 0,05 EFTIR FRIGRADUM.
   TEKUR `df`, EKKI FJOLDA ARA — fyrsta utgafan tok fjolda og fletti
   upp `n - 1`, og hun var kolluð bædi med `years + 1` og med
   walk-forward-arafjolda i stad in-sample-arafjolda. Bædi villurnar
   gafu 2,228 (sjalfgefna gildid) thar sem retta talan var 2,776 eda
   3,182 — thaer LEKKUDU throskuldinn og hefðu latid fleira lita
   marktaekt ut en er. Vidfangid heitir `df` nuna svo kallstadur geti
   ekki verid tvirad. */
const T_CRIT = (df) => ({ 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228 }[df] || 2.228);

const pearson = (a, b) => {
  const n = a.length;
  if (n < 3) return null;
  const ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : null;
};

/* ============================================================
   LOGUNIN — TVAER RAUNVERULEGAR DEILDIR OG EITT ALMENNT SNID
   ============================================================
   `12-1flex` er lognin sem ALLT ANNAD i verkefninu var maelt i
   (`DEFAULT_LEAGUE`) og hun er her svo talan se samanburdarhaef vid
   arank-lab og board-lab. Hinar tvaer eru deildirnar sem notandinn
   spilar i og thaer hafa BADAR tvo flex — sem `shape-lab` maeldi
   adeins i 12-lida sniði.                                         */
const SHAPES = {
  "12-1flex": { label: "12 teams, 1 FLEX (repo baseline)",
    league: { ...DEFAULT_LEAGUE, teams: 12, rounds: 14 } },
  "10-2flex": { label: "10 teams, 2 FLEX (Patriots, PPR)",
    league: { teams: 10, rounds: 15,
      starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
      maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
      flexPos: ["RB", "WR", "TE"], superflex: false, excludePos: ["K", "DST"] } },
  "12-2flex": { label: "12 teams, 2 FLEX (Sofahetjur, half-PPR)",
    league: { teams: 12, rounds: 14,
      starters: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2 },
      maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
      flexPos: ["RB", "WR", "TE"], superflex: false, excludePos: ["K", "DST"] } },
};

/* THRJU SNID i grunnlogninni (kjarnaspurningin: er `k` olikt milli
   theirra?) og svo raundeildirnar i SINU sniði. Ad keyra allar
   9 samsetningar vaeri 9/5 kostnadur fyrir frumur sem enginn spilar. */
/* ADP-VOLLURINN: ppr-ADP fyrir ppr og half, std-ADP fyrir standard.
   SOGULEGT HALF-ADP ER EKKI TIL (sja half-lab.mjs) og thess vegna er
   half-frumurnar keyrdar TVISVAR — einu sinni med hvorum velli — sem
   VIKMORK. `light` frumurnar keyra faekkad afbrigda-mengi thvi thaer
   eru NAEMNIPROF a nidurstodunni, ekki nidurstadan sjalf.
   ATH ad einvigid setur BADA borðin undir SAMA voll, svo vollurinn er
   sameiginlegur suðthattur; naemniprofid er samt keyrt thvi hann er
   ekki ALVEG hlutlaus (hann raedur hverjir eru enn lausir). */
const CELLS = [
  { key: "12-1flex|ppr", shape: "12-1flex", fmt: "ppr", adpKey: "ppr" },
  { key: "12-1flex|half", shape: "12-1flex", fmt: "half", adpKey: "ppr" },
  { key: "12-1flex|standard", shape: "12-1flex", fmt: "standard", adpKey: "standard" },
  { key: "10-2flex|ppr", shape: "10-2flex", fmt: "ppr", adpKey: "ppr" },
  { key: "12-2flex|half", shape: "12-2flex", fmt: "half", adpKey: "ppr" },
  { key: "12-1flex|half@adpStd", shape: "12-1flex", fmt: "half",
    adpKey: "standard", light: true },
  { key: "12-2flex|half@adpStd", shape: "12-2flex", fmt: "half",
    adpKey: "standard", light: true },
];

/* Faekkada mengid i naemniprofunum: motvidmidid, thrir sterkustu
   ovissu-maelararnir a priori og hin omaelda spurningin. */
const LIGHT_UNCS = ["uniform", "prevG", "rookie", "adpSdRel", "srcDisagree"];
const LIGHT_PRIORS = ["posMean", "adpCurve"];

const SOURCES = { fftoday: "ffProj", sleeper: "sleeperProj" };
const ALT_OF = { fftoday: "sleeperProj", sleeper: "ffProj" };

/* K-GRIDID. k = 0 er nulltilgatan (engin hnignun). k = 1 thydir ad
   OVISSASTI leikmadurinn er ad FULLU skiptur ut fyrir forgildid —
   thad er nakvaemlega "blint forgildi" sem FPL-verkefnid felldi, og
   thad er her svo endapunkturinn se maeldur og ekki agiskad um hann. */
const KS = [0, 0.1, 0.2, 0.35, 0.5, 0.75, 1.0];

/* ============================================================
   OVISSU-MAELARNIR
   ============================================================
   Hver skilar HRAGILDI og segir hvort HATT gildi thydi MEIRI ovissu.
   `binary` sleppir percentil-umbreytingunni.

   TVAER AKVARDANIR SEM THARF AD RETTLAETA:

   1. PERCENTIL INNAN (ar x stada), EKKI HRAGILDI. Einingarnar eru
      osambaerilegar (leikir, saeti, stig, hlutfoll) og hrat gildi
      hefdi latid `k` thyda sitt i hverri rod. Percentil gerir `k`
      SAMBERANLEGT milli maelara — thad er forsenda toflunnar.
      OG INNAN STODU, EKKI YFIR LAUGINA: vaeri thad yfir laugina
      myndi hnignunin faera heilar stodur (QB bera haerri prevPpgStd
      en TE af thvi ad their skora meira) og vid vaerum ad maela
      stodu-faerslu i dulargervi ovissu — nakvaemlega thad sem
      "afstaed threp innan lids" var fellt fyrir i FPL-verkefninu.

   2. VANTANDI GILDI = MESTA OVISSA (u = 1), ekki medaltal. Nyliði ber
      `prevG: null` af thvi ad hann A ENGIN URTAK — thad ER ovissan
      sem verid er ad maela, ekki gat i gognunum. Ad setja hann i
      medaltal vaeri ad fullyrda ad hann se medal-viss, sem er thad
      gagnstaeda vid tilgatuna. AFLEIDING SEM VERDUR AD NEFNAST:
      `prevG`, `prevVol`, `durability` og `missed2y` verda thar med
      SAMFYLGNI vid `rookie` — nyliðar fa u = 1 i theim ollum. Thess
      vegna er `rookie` maeldur SER, svo haegt se ad sja hvort merkid
      (se thad til) komi fra nyliðunum eda fra litlu urtaki almennt. */
const UNCS = {
  /* MOTVIÐMIÐ: engin ovissu-adgreining. Thetta ENDURGERIR `shrink` i
     arank-lab og `adpShrink` i board-lab og er thvi bædi innra
     samraemispróf OG thad sem hver ovissu-maelir verdur ad sla. */
  uniform: { label: "control: same shrink for everyone", get: () => 1, binary: true },

  /* Leikir i fyrra. Litid urtak = meiri ovissa. */
  prevG: { label: "games played last season (low = uncertain)",
    get: (p) => p.prevG, highIsUncertain: false },

  /* Nyliði. Thad er ekki "litid urtak" heldur EKKERT urtak, og thad
     er staðurinn thar sem tilgátan er sterkust. */
  rookie: { label: "rookie (exp === 0)", get: (p) => (p.exp === 0 ? 1 : 0), binary: true },

  /* Reynsla i arum, threpud. `rookie` er endapunkturinn a thessum
     kvarda; bædi eru med thvi ad thau eru EKKI sama tilgatan (ein
     segir "nyliðar", onnur "ferillinn er samfelldur kvardi"). */
  exp: { label: "years of experience (low = uncertain)",
    get: (p) => p.exp, highIsUncertain: false },

  /* Markadurinn segir sjalfur hve osattur hann er. */
  adpSd: { label: "ADP standard deviation, raw",
    get: (p, c) => p.adpSd[c.adpKey], highIsUncertain: true },

  /* OG SAMA TALA AFSTAEÐ. `adpSd` HRA er ruglud vid ADP sjalft — saeti
     200 hefur storra sd en saeti 2 hvad sem ovissunni lidur, svo hrai
     maelirinn faerir SEINNI leikmenn ad forgildinu og thad er
     kerfisbundin faersla, ekki ovissa. Vaentanleg sd vid gefid ADP er
     1,082*sqrt(ADP) og su tala er MAELD (`advice-lab.mjs`, 1.882
     leikmanna-ar) — ekki valin her. */
  adpSdRel: { label: "ADP sd relative to measured 1.082*sqrt(ADP)",
    get: (p, c) => {
      const adp = p.adp[c.adpKey], sd = p.adpSd[c.adpKey];
      if (adp == null || sd == null || adp <= 0) return null;
      return sd / (1.082 * Math.sqrt(adp));
    }, highIsUncertain: true },

  /* Serfraedingar osattir. Adgreint fra mannfjoldanum viljandi —
     `risk-lab` maeldi ad SAEKJAST eftir ecrSd kostar 77-130 stig, en
     thad er onnur adgerd en ad DRAGA hann ad forgildi. */
  ecrSd: { label: "expert (ECR) standard deviation",
    get: (p, c) => p.ecrSd[c.adpKey], highIsUncertain: true },

  /* Flokt innan timabils, sem SVEIFLUSTUDULL. Hrat sd skalast med
     stigafjolda (20-stiga madur hefur storra sd en 8-stiga) og vaeri
     thvi bara "hann er godur" i dulargervi ovissu. */
  prevVol: { label: "last-season weekly volatility (sd / ppg)",
    get: (p) => (p.prevPpgStd == null || p.prevPpg == null || p.prevPpg <= 1
      ? null : p.prevPpgStd / p.prevPpg), highIsUncertain: true },

  /* Nytt lid = fyrra samhengi horfid. */
  teamChange: { label: "changed team since last season",
    get: (p) => (p.teamChange == null ? null : (p.teamChange ? 1 : 0)), binary: true },

  /* Meiddur adur = ovissara hvort hann spilar. */
  missed2y: { label: "games missed over two seasons",
    get: (p) => p.missed2y, highIsUncertain: true },
  durability: { label: "share of games available (low = uncertain)",
    get: (p) => p.durability, highIsUncertain: false },

  /* HVE OSATTAR ERU HEIMILDIRNAR? Thetta er hin OMAELDA spurning.
     README 5h fellir FFToday sem FORGILDI (blondun er einraen nidur a
     vid), en "hve mikid eru spar tveggja ohaðra heimilda osammala" er
     ANNAD spurning og hun hefur ekki verid maeld. Maelt sem |z-munur|
     innan stodu, thvi heimildirnar hafa ekki sama kvarda. */
  srcDisagree: { label: "|z(source) - z(other source)| within position",
    get: (p, c) => {
      const a = p.proj[c.source] && p.proj[c.source][c.fmt];
      const b = p.projAlt[c.source] && p.projAlt[c.source][c.fmt];
      return a == null || b == null ? null : { a, b };  // parad sidar (tharf z)
    }, highIsUncertain: true, needsAlt: true, paired: true },
};

/* ============================================================
   FORGILDIN
   ============================================================
   Hvert skilar Map(id -> forgildi) fyrir EINA stodu innan eins ars.
   ALLT er draft-dags: engin utkoma, ekkert ur timabilinu sjalfu.   */
const PRIORS = {
  /* Stodu-medaltal draftanlega hopsins. Einfaldasta forgildid sem til
     er og thad sem Stein-hnignun gerir rad fyrir. */
  posMean: { label: "position mean projection (draftable pool)",
    build: (list, c) => {
      const vals = list.map((p) => projOf(p, c)).filter((v) => v != null);
      if (!vals.length) return null;
      const m = mean(vals);
      return new Map(list.map((p) => [p.id, m]));
    } },

  /* ADP-BYGGD FERILL. Sa sem er ADP-nr k innan stodu "aetti" ad bera
     k-ta haesta spa-gildid. Thetta er forgildi mannfjoldans og er
     TOLUVERT upplýsandi forgildi — ekki flatt eins og posMean.
     ATH: nakvaemlega sama umbreyting og `adpShrink` i board-lab, thar
     med FASTRI vog; hér er hun ovissu-hád. */
  adpCurve: { label: "projection implied by ADP rank within position",
    build: (list, c) => {
      const withBoth = list.filter((p) => projOf(p, c) != null && p.adp[c.adpKey] != null);
      if (withBoth.length < 5) return null;
      const projSorted = withBoth.map((p) => projOf(p, c)).sort((a, b) => b - a);
      const byAdp = withBoth.slice().sort((a, b) => a.adp[c.adpKey] - b.adp[c.adpKey]);
      const m = new Map(byAdp.map((p, i) => [p.id, projSorted[i]]));
      return m;
    } },

  /* ONNUR SPAHEIMILDIN, KVARDAD YFIR. FFToday sem forgildi er
     LIKLEGA DAUTT — README 5h maeldi ad blondun Sleeper og FFToday er
     einraen NIDUR a vid — en su maeling var a FASTRI vog yfir alla, og
     "notadu hana adeins thar sem Sleeper er ovis" er ekki sama
     adgerdin. Hun er maeld hér til ad loka spurningunni.
     KVORDUNIN ER SKYLDA: FFToday-summur eru a odrum kvarda, svo an
     endurkvordunar vaeri thetta KERFISBUNDIN FAERSLA innan stodu og
     thvert a stodur — ekki hnignun. Kvardad a medaltal OG stadalfravik
     stodunnar i grunnheimildinni. */
  /* ============================================================
     RUGLANDI THATTUR SEM FANNST I KEYRSLU OG SEM FELLDI FYRSTU
     UTGAFU THESSARAR MAELINGAR — LESID THETTA ADUR EN THVI ER SLEPPT.
     ============================================================
     `altProj` er LEYFT ADEINS THEGAR GRUNNHEIMILDIN ER SLEEPER.

     Fyrsta keyrslan gaf `uniform|altProj` **+364 stig, 3/3 ar,
     CI [37, 671]** a `fftoday` — sem litur ut eins og storsigur fyrir
     hnignun og er thad EKKI. Med `source = fftoday` er `altProj`
     Sleeper-spain, og vid k = 1 og u = 1 er w = 0 fyrir alla: bordid
     ER thá Sleeper-bordid. Maelingin var thvi ekki "hnignun virkar"
     heldur "Sleeper slaer FFToday", sem er THEGAR maelt (README 5k:
     rho 0,696 a moti 0,628) og er THEGAR akvordun appsins.

     Og hun stadfestir bara 5h fra hinni hlidinni: blondun Sleeper ->
     FFToday er einraen NIDUR a vid, svo FFToday -> Sleeper er einraen
     UPP a vid. Ekkert nytt.

     RETTA ATTIN ER SU EINA SEM ER OMAELD: draga STERKUSTU heimildina
     ad theirri lakari, og ADEINS thar sem hun er ovis. Thess vegna
     `onlySource`. */
  altProj: { label: "other projection source, rescaled within position",
    needsAlt: true, onlySource: "sleeper",
    build: (list, c) => {
      const pairs = list.map((p) => [p.id, projOf(p, c), altOf(p, c)])
        .filter(([, a, b]) => a != null && b != null);
      if (pairs.length < 10) return null;
      const A = pairs.map((x) => x[1]), B = pairs.map((x) => x[2]);
      const mA = mean(A), mB = mean(B);
      const sA = Math.sqrt(mean(A.map((v) => (v - mA) ** 2))) || 1;
      const sB = Math.sqrt(mean(B.map((v) => (v - mB) ** 2))) || 1;
      return new Map(pairs.map(([id, , b]) => [id, mA + (b - mB) * (sA / sB)]));
    } },
};

const projOf = (p, c) => (p.proj[c.source] ? p.proj[c.source][c.fmt] : null);
const altOf = (p, c) => (p.projAlt[c.source] ? p.projAlt[c.source][c.fmt] : null);

/* ============================================================
   HJALPARFOLL
   ============================================================ */

/**
 * Percentil-umbreyting a ovissu innan (ar x stada) -> u i [0,1].
 * Skilar `null` ef thekjan er undir 50% — thá er maelirinn ekki til
 * fyrir thad ar og THAD AR ER SLEPPT. Ad lata hann falla i u = 1 fyrir
 * alla vaeri ad birta `uniform` undir odru nafni og kalla thad
 * maelingu (t.d. `srcDisagree` fyrir 2015-2020 thar sem Sleeper er
 * ekki til).
 */
function uMap(list, unc, c) {
  const raw = new Map();
  let have = 0;
  if (unc.paired) {
    /* Pordu maelararnir (heimilda-osammaeli) tharfnast z innan stodu
       ADUR en munurinn er tekinn — annars vaeri kvardinn a
       heimildunum sjalfum i mismuninum. */
    const pairs = list.map((p) => [p.id, unc.get(p, c)]).filter(([, v]) => v != null);
    if (pairs.length) {
      const A = pairs.map(([, v]) => v.a), B = pairs.map(([, v]) => v.b);
      const mA = mean(A), mB = mean(B);
      const sA = Math.sqrt(mean(A.map((v) => (v - mA) ** 2))) || 1;
      const sB = Math.sqrt(mean(B.map((v) => (v - mB) ** 2))) || 1;
      for (const [id, v] of pairs) {
        raw.set(id, Math.abs((v.a - mA) / sA - (v.b - mB) / sB)); have++;
      }
    }
  } else {
    for (const p of list) {
      const v = unc.get(p, c);
      if (v != null && Number.isFinite(v)) { raw.set(p.id, v); have++; }
    }
  }
  if (have < list.length * 0.5) return null;

  const out = new Map();
  if (unc.binary) {
    /* Tvigildur maelir: percentil er merkingarlaust (tvo gildi), og
       hann er notadur SEM HANN ER. Vantandi = 1 (mesta ovissa). */
    for (const p of list) out.set(p.id, raw.has(p.id) ? (raw.get(p.id) ? 1 : 0) : 1);
    return out;
  }
  const vals = [...raw.values()].sort((a, b) => a - b);
  const pct = (v) => {
    /* Midpunkts-percentil (jafntefli fa sama gildi). */
    let lo = 0, hi = vals.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (vals[m] < v) lo = m + 1; else hi = m; }
    let up = lo;
    while (up < vals.length && vals[up] === v) up++;
    return (lo + up) / 2 / vals.length;
  };
  for (const p of list) {
    if (!raw.has(p.id)) { out.set(p.id, 1); continue; }   // vantar = mesta ovissa
    const q = pct(raw.get(p.id));
    out.set(p.id, unc.highIsUncertain ? q : 1 - q);
  }
  return out;
}

/**
 * Hnignada spain fyrir alla laugina. Skilar `null` ef ovissu-maelir
 * eda forgildi vantar i einhverri stodu — halfmaeld laug vaeri
 * annad urtak.
 */
function shrunkProj(pool, unc, prior, k, c) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const out = new Map();
  for (const list of Object.values(byPos)) {
    if (list.length < 5) {
      for (const p of list) { const v = projOf(p, c); if (v != null) out.set(p.id, v); }
      continue;
    }
    const u = uMap(list, unc, c);
    const pri = prior.build(list, c);
    if (!u || !pri) return null;
    for (const p of list) {
      const v = projOf(p, c);
      if (v == null) continue;
      const pv = pri.get(p.id);
      if (pv == null) { out.set(p.id, v); continue; }
      const w = 1 - k * u.get(p.id);
      out.set(p.id, w * v + (1 - w) * pv);
    }
  }
  return out;
}

/** Mean `w` yfir laugina — talan sem lesandi vill sja, ekki bara `k`. */
function meanW(pool, unc, prior, k, c) {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const ws = [];
  for (const list of Object.values(byPos)) {
    if (list.length < 5) continue;
    const u = uMap(list, unc, c);
    if (!u) return null;
    for (const p of list) ws.push(1 - k * u.get(p.id));
  }
  return ws.length ? r3(mean(ws)) : null;
}

/** VBD-bord ur spakorti. Sama utfaersla og half-lab / arank-lab. */
function vbdBoard(pool, projMap, repl) {
  const byPos = {};
  for (const p of pool) if (projMap.has(p.id)) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const scored = [];
  for (const [pos, list] of Object.entries(byPos)) {
    const vals = list.map((p) => projMap.get(p.id)).sort((a, b) => b - a);
    if (!vals.length) continue;
    const k = Math.min(vals.length - 1, (repl[pos] ?? 24) - 1);
    const around = vals.slice(Math.max(0, k - 1), k + 2);
    const base = around.length ? mean(around) : 0;
    for (const p of list) scored.push([p.id, projMap.get(p.id) - base]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return new Map(scored.map(([id], i) => [id, i + 1]));
}

/* ============================================================
   MAIN
   ============================================================ */
async function main() {
  const feats = JSON.parse(await readFile(path.join(OUT, "features.json"), "utf8"));

  /* ---------- porun ppr <-> standard (half er algebra) ---------- */
  const byKey = { ppr: new Map(), standard: new Map() };
  for (const r of feats.rows) if (byKey[r.scoring]) byKey[r.scoring].set(`${r.season}|${r.id}`, r);
  let paired = 0, unpaired = 0;
  for (const k of byKey.ppr.keys()) (byKey.standard.has(k) ? paired++ : unpaired++);
  console.log(`porun ppr<->standard: ${paired} por, ${unpaired} oporud`);

  const allYears = [...new Set(feats.rows.map((r) => r.season))].sort()
    .filter((y) => y >= FROM && y <= 2025);

  /* ---------- laugin per ar ---------- */
  const pools = {};
  for (const y of allYears) {
    const rows = [];
    for (const [k, a] of byKey.ppr) {
      if (!k.startsWith(`${y}|`)) continue;
      const b = byKey.standard.get(k);
      if (!b || a.adp == null || b.adp == null) continue;
      if (a.pts == null || b.ptsStd == null) continue;
      const three = (pp, ss) => ({ ppr: pp, standard: ss,
        half: pp != null && ss != null ? (pp + ss) / 2 : null });
      rows.push({
        id: a.id, name: a.name, pos: a.pos,
        adp: { ppr: a.adp, standard: b.adp },
        adpSd: { ppr: a.adpSd, standard: b.adpSd },
        ecrSd: { ppr: a.ecrSd, standard: b.ecrSd },
        prevG: a.prevG, prevPpg: a.prevPpg, prevPpgStd: a.prevPpgStd,
        exp: a.exp, teamChange: a.teamChange, missed2y: a.missed2y,
        durability: a.durability,
        proj: { sleeper: three(a.sleeperProj, b.sleeperProj),
                fftoday: three(a.ffProj, b.ffProj) },
        projAlt: { sleeper: three(a.ffProj, b.ffProj),
                   fftoday: three(a.sleeperProj, b.sleeperProj) },
        actual: three(a.pts, b.ptsStd),
        g: a.g,
      });
    }
    if (rows.length >= 120) pools[y] = rows;
  }
  const ys = Object.keys(pools).map(Number).sort((a, b) => a - b);
  requireSeasons(ys, "timabil med ADP, spa og utkomu");
  console.log(`${ys.length} timabil · ${r1(mean(ys.map((y) => pools[y].length)))} leikmenn ad medaltali`);

  /* ---------- hristur vollur ----------
     Raunveruleg droft eru ekki afradin. Eitt ADP-draft per ar er EITT
     syni og allt flakt blandast. `1.082*sqrt(ADP)` er MAELD varaleid
     thegar `adpSd` vantar (advice-lab, 1.882 leikmanna-ar) — fyrsta
     utgafa thess fasta var 0,55, helmingur af rettu gildinu. */
  const noisyField = (pool, adpKey, seed) => {
    let a = seed >>> 0;
    const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    const gauss = () => {
      const u = Math.max(1e-9, rnd()), v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return new Map(pool.map((p) => {
      const adp = p.adp[adpKey];
      const sd = p.adpSd[adpKey] > 0 ? p.adpSd[adpKey] : 1.082 * Math.sqrt(Math.max(1, adp));
      return [p.id, adp + gauss() * sd];
    }).sort((x, z) => x[1] - z[1]).map(([id], i) => [id, i + 1]));
  };

  /* ---------- keyrslan ---------- */
  const results = {};        // [source][cell][unc][prior]
  const walkForward = {};    // [source][cell] -> talan sem GILDIR
  const side = {};           // [source][fmt][unc][prior][k] -> MAE/rho (ohad logun)
  const neutrality = {};     // k=0 verdur ad gefa nakvaemlega 0
  const leakGate = {};       // fylgni hnignadrar spar vid LEIKI SPILADA
  const meanWs = {};         // [source][cell][unc][k] -> mean w
  const perTables = {};      // [source][cell] -> full per-ars tafla (pordu profin)
  const baseline = {};       // [source][fmt] -> MAE/rho a HRARI spa (k = 0)

  const variantList = [];
  for (const un of Object.keys(UNCS)) for (const pr of Object.keys(PRIORS)) variantList.push([un, pr]);

  for (const source of Object.keys(SOURCES)) {
    results[source] = {}; side[source] = {}; meanWs[source] = {};
    walkForward[source] = {}; perTables[source] = {}; baseline[source] = {};
    leakGate[source] = { max: 0, worst: null };

    /* Ar sem heimildin naer yfir. `fftoday` = 11, `sleeper` = 5 (hin
       sex voru felld af leka-hlidinu i build-features). */
    const srcYears = ys.filter((y) => pools[y].filter(
      (p) => p.proj[source].ppr != null).length >= 120);
    console.log(`\n${"=".repeat(78)}\n  HEIMILD: ${source}  ·  timabil: ${srcYears.join(", ")}\n${"=".repeat(78)}`);

    for (const cell of CELLS) {
      const shape = SHAPES[cell.shape];
      const league = shape.league;
      const repl = replacementRanks(league);
      const adpKey = cell.adpKey;
      const c0 = { source, fmt: cell.fmt, adpKey };
      const vars = (cell.light
        ? variantList.filter(([un, pr]) => LIGHT_UNCS.includes(un) && LIGHT_PRIORS.includes(pr))
        : variantList)
        /* `onlySource` — sja langa notuna vid `altProj`. */
        .filter(([, pr]) => !PRIORS[pr].onlySource || PRIORS[pr].onlySource === source);

      /* Grunnur per ar: laug, utkoma, vellir, hreint VBD-bord. */
      const W = {};
      for (const y of srcYears) {
        const pool = pools[y].filter((p) => projOf(p, c0) != null);
        if (pool.length < 120) continue;
        const projRaw = new Map(pool.map((p) => [p.id, projOf(p, c0)]));
        W[y] = {
          pool, projRaw,
          actual: new Map(pool.map((p) => [p.id, { pos: p.pos, pts: p.actual[cell.fmt] }])),
          base: vbdBoard(pool, projRaw, repl),
          fields: [new Map(pool.slice().sort((a, b) => a.adp[adpKey] - b.adp[adpKey])
            .map((p, i) => [p.id, i + 1]))],
        };
        for (let r = 1; r < RUNS; r++) W[y].fields.push(noisyField(pool, adpKey, y * 1000 + r * 7919));
      }
      const cy = Object.keys(W).map(Number).sort((a, b) => a - b);
      if (cy.length < 3) continue;

      /* Einvigid: hnignada bordid gegn hreinu VBD i somu deild. */
      const duelYear = (y, board) => {
        const w = W[y], d = [];
        for (let r = 0; r < RUNS; r++) {
          for (let i = 1; i <= league.teams; i++) {
            const j = (i % league.teams) + 1;
            for (const swap of [false, true]) {
              const res = simulateDraft({
                board, fieldBoard: w.fields[r], actual: w.actual,
                slot: swap ? j : i, league,
                rival: { slot: swap ? i : j, board: w.base },
              });
              d.push(res.points - res.rivalPoints);
            }
          }
        }
        return mean(d);
      };

      /* ---------- NEUTRALITETS-PROFID (5h regla 1) ----------
         Bord gegn sjalfu ser VERDUR ad gefa nakvaemlega 0. Gerdi thad
         thad ekki er hermunin osamhverf og hver tala her er
         merkingarlaus. Thetta er FYRSTA profid, ekki thad sidasta. */
      const neu = cy.map((y) => r3(duelYear(y, W[y].base)));
      neutrality[`${source}|${cell.key}`] = neu;
      if (neu.some((v) => v !== 0)) {
        console.error(`  !! NEUTRALITET BROTID i ${source}|${cell.key}: ${neu.join(", ")}`);
        process.exit(3);
      }

      results[source][cell.key] = {};
      meanWs[source][cell.key] = {};
      side[source][cell.fmt] = side[source][cell.fmt] || {};

      /* GRUNNLINAN FYRIR HLIDARTOLURNAR — hra spain, k = 0. An hennar
         er "MAE batnadi" ekki fullyrding heldur tala an vidmids. */
      if (!cell.light && baseline[source][cell.fmt] == null) {
        const m = [], rh = [], mr = [], nr = [];
        for (const y of cy) {
          const w = W[y];
          const ids = w.pool.filter((p) => w.projRaw.has(p.id));
          const P = ids.map((p) => w.projRaw.get(p.id));
          const A = ids.map((p) => p.actual[cell.fmt]);
          m.push(mean(P.map((v, i) => Math.abs(v - A[i]))));
          rh.push(spearman(P, A));
          const rk = ids.filter((p) => p.exp === 0);
          if (rk.length >= 5) {
            mr.push(mean(rk.map((p) => Math.abs(w.projRaw.get(p.id) - p.actual[cell.fmt]))));
            nr.push(rk.length);
          }
        }
        baseline[source][cell.fmt] = { mae: r3(mean(m)),
          rho: r4(mean(rh.filter((v) => v != null))),
          maeRookie: mr.length ? r3(mean(mr)) : null,
          nRookie: nr.length ? Math.round(mean(nr)) : null, years: cy.length };
      }

      console.log(`\n  ${shape.label} · ${cell.fmt}   (${cy.length} ar, ` +
        `${r1(mean(cy.map((y) => W[y].pool.length)))} leikmenn)`);
      console.log(`  ${"uncertainty".padEnd(13)}${"prior".padEnd(10)}` +
        KS.slice(1).map((k) => `k=${k}`.padStart(9)).join("") + "   best");

      /* FULL PER-ARS TAFLA FYRIR HVERT (un, pr, k).
         Hun er FORSENDA thess ad walk-forward geti valid ur ALLRI
         grid-inu. Vaeri adeins geymt thad k sem hra leitin valdi vaeri
         valid a ollum arum og walk-forward vaeri LEKI i dulargervi. */
      const perAll = {};

      for (const [un, pr] of vars) {
        const unc = UNCS[un], prior = PRIORS[pr];
        results[source][cell.key][un] = results[source][cell.key][un] || {};
        meanWs[source][cell.key][un] = meanWs[source][cell.key][un] || {};
        side[source][cell.fmt][un] = side[source][cell.fmt][un] || {};
        side[source][cell.fmt][un][pr] = side[source][cell.fmt][un][pr] || {};

        const byK = {};
        for (const k of KS) {
          if (k === 0) continue;                     // nulltilgatan = 0 per constructionem
          const per = {}, maeRow = [], rhoRow = [], maeRk = [], nRk = [];
          for (const y of cy) {
            const w = W[y];
            const sp = shrunkProj(w.pool, unc, prior, k, c0);
            if (!sp) continue;                       // maelir/forgildi vantar thetta ar
            per[y] = r1(duelYear(y, vbdBoard(w.pool, sp, repl)));

            /* HLIDARTOLURNAR — MAE og rho. Thaer eru EKKI mælikvardinn
               (sja haus) en thaer eru nauðsynlegar til ad geta sagt
               hvort MAE hafi batnad MEDAN akvordunin versnadi. */
            const ids = w.pool.filter((p) => sp.has(p.id));
            const P = ids.map((p) => sp.get(p.id)), A = ids.map((p) => p.actual[cell.fmt]);
            maeRow.push(mean(P.map((v, i) => Math.abs(v - A[i]))));
            rhoRow.push(spearman(P, A));
            const rk = ids.filter((p) => p.exp === 0);
            if (rk.length >= 5) {
              maeRk.push(mean(rk.map((p) => Math.abs(sp.get(p.id) - p.actual[cell.fmt]))));
              nRk.push(rk.length);
            }
            /* LEKA-HLIDID — sama hlid og build-features setur a
               hraspana: fylgni vid LEIKI SPILADA ma ekki fara yfir
               0,40. Hnignun getur ekki brotid thad (öll inntok eru
               draft-dags) og thess vegna er thad odyrt ad keyra hana. */
            const rr = pearson(ids.map((p) => sp.get(p.id)), ids.map((p) => p.g ?? 0));
            if (rr != null && Math.abs(rr) > leakGate[source].max) {
              leakGate[source].max = r3(Math.abs(rr));
              leakGate[source].worst = `${cell.key}|${un}|${pr}|k=${k}|${y}`;
            }
          }
          const vals = cy.map((y) => per[y]).filter((x) => x != null);
          if (vals.length < 3) continue;
          perAll[`${un}|${pr}|k=${k}`] = per;
          const zero = Object.fromEntries(Object.keys(per).map((y) => [y, 0]));
          const boot = bootstrapDiff(per, zero, BOOT, 12345);
          byK[k] = { mean: r1(mean(vals)), t: tOf(vals),
            wins: vals.filter((x) => x > 0).length, years: vals.length,
            ci: boot ? [r1(boot.lo), r1(boot.hi)] : null,
            excludesZero: boot ? boot.excludesZero : null, per };
          /* MAE og rho eru OHAD LOGUN (thau maela spana, ekki draftid),
             svo fyrsti ritari a hvert (heimild, snid) gildir og hinir
             myndu adeins skrifa somu tolu aftur. Naemniprof-frumurnar
             (adpKey = standard fyrir half) skrifa ALDREI — thau eru
             annad inntak og maettu ekki lita eins ut. */
          if (!cell.light && side[source][cell.fmt][un][pr][k] == null) {
            side[source][cell.fmt][un][pr][k] = {
              mae: r3(mean(maeRow)), rho: r4(mean(rhoRow.filter((v) => v != null))),
              maeRookie: maeRk.length ? r3(mean(maeRk)) : null,
              nRookie: nRk.length ? Math.round(mean(nRk)) : null,
            };
          }
          meanWs[source][cell.key][un][k] =
            meanW(W[cy[0]].pool, unc, prior, k, c0);
        }
        if (!Object.keys(byK).length) { delete results[source][cell.key][un][pr]; continue; }

        /* `bestW` er valid A ALLRI SOGUNNI og er thvi LEIT, ekki
           nidurstada. Walk-forward talan nedar er sú sem gildir.
           Thetta er nakvaemlega gildran sem aldurs-liðurinn i
           board-lab fell i: hann vann hra leitina 4/4 og fell
           walk-forward 4/4. */
        const bestK = Object.keys(byK).map(Number)
          .sort((a, b) => byK[b].mean - byK[a].mean)[0];
        results[source][cell.key][un][pr] = {
          byK: Object.fromEntries(Object.entries(byK).map(([k, v]) => [k,
            { mean: v.mean, t: v.t, wins: v.wins, years: v.years,
              ci: v.ci, excludesZero: v.excludesZero }])),
          bestK, bestW: meanWs[source][cell.key][un][bestK] ?? null,
          best: { ...byK[bestK] },
          n: Math.round(mean(cy.map((y) => W[y].pool.length))),
        };

        console.log(`  ${un.padEnd(13)}${pr.padEnd(10)}` +
          KS.slice(1).map((k) => (byK[k]
            ? `${byK[k].mean > 0 ? "+" : ""}${byK[k].mean}` : "—").padStart(9)).join("") +
          `   k=${bestK} ${byK[bestK].mean > 0 ? "+" : ""}${byK[bestK].mean} ` +
          `(${byK[bestK].wins}/${byK[bestK].years}, t=${byK[bestK].t})` +
          (byK[bestK].excludesZero ? " CI-EXCL-0" : ""));
      }

      /* ---------- WALK-FORWARD ----------
         Talan sem gildir. Fyrir hvert profar er (ovissu-maelir x
         forgildi x k) valid a ARUM A UNDAN eingongu og beitt a arið.
         Fyrsta arið hefur enga sogu og er thvi ekki maelt. */
      /* ---------- WALK-FORWARD (A) PER AFBRIGDI: adeins `k` valid ----
         THETTA ER SU TALA SEM SVARAR SPURNINGUNNI SEM VAR SPURD.
         Ad velja UR OLLUM 216 afbrigdum a einu til tveimur fyrri arum
         er offitting a havada — og thad er einmitt gildran sem
         board-lab skjalfesti (aldur vann hra leitina 4/4 og fell
         walk-forward 4/4). Hér er (ovissu-maelir x forgildi) FEST og
         adeins `k` valid a fyrri arum: sex frambjodendur, ekki 216.
         Spurningin er thá "ef eg tek thennan maeli og thetta forgildi,
         slaer walk-forward-valid `k` thá w = 1?" */
      const wfVar = {};
      for (const [un, pr] of vars) {
        const keys = KS.slice(1).map((k) => `${un}|${pr}|k=${k}`).filter((kk) => perAll[kk]);
        if (!keys.length) continue;
        const gains = {};
        for (let i = 1; i < cy.length; i++) {
          const y = cy[i], hist = cy.slice(0, i);
          let pick = null;
          for (const kk of keys) {
            const seen = hist.map((p) => perAll[kk][p]).filter((v) => v != null);
            if (seen.length < Math.max(2, Math.ceil(hist.length / 2))) continue;
            const m = mean(seen);
            if (Number.isFinite(m) && (pick == null || m > pick.m)) pick = { m, kk };
          }
          if (pick && perAll[pick.kk][y] != null) gains[y] = perAll[pick.kk][y];
        }
        const g = Object.values(gains);
        if (g.length < 3) continue;
        const b = bootstrapDiff(gains, Object.fromEntries(Object.keys(gains).map((y) => [y, 0])),
          BOOT, 12345);
        wfVar[`${un}|${pr}`] = { mean: r1(mean(g)), t: tOf(g),
          wins: g.filter((v) => v > 0).length, years: g.length,
          ci: b ? [r1(b.lo), r1(b.hi)] : null, excludesZero: b ? b.excludesZero : null,
          perYear: gains };
      }

      /* ---------- WALK-FORWARD (B) UR OLLU GRIDINU ----------
         Birt til samanburðar og MERKT sem offittud: 216 frambjodendur
         a 1-10 arum af sogu. Hun er ekki nidurstada, hun er maeling a
         thvi hvad leit gerir. */
      const cands = Object.entries(perAll);
      const wf = {};
      for (let i = 1; i < cy.length; i++) {
        const y = cy[i], hist = cy.slice(0, i);
        let pick = null;
        for (const [key, per] of cands) {
          const seen = hist.map((p) => per[p]).filter((v) => v != null);
          /* Afbrigdi sem hefur ENGA sogu ma ekki vera valid — thad
             vaeri val an forsendu (t.d. `srcDisagree` a fftoday fyrir
             2021, thar sem Sleeper er ekki til fyrir 2015-2020). */
          if (seen.length < Math.max(2, Math.ceil(hist.length / 2))) continue;
          const m = mean(seen);
          if (Number.isFinite(m) && (pick == null || m > pick.m)) pick = { m, key, per };
        }
        wf[y] = { chosen: pick ? pick.key : null,
          gain: pick && pick.per[y] != null ? pick.per[y] : null };
      }
      const wfVals = Object.values(wf).map((v) => v.gain).filter((v) => v != null);
      const wfPer = Object.fromEntries(Object.entries(wf)
        .filter(([, v]) => v.gain != null).map(([y, v]) => [y, v.gain]));
      const wfBoot = Object.keys(wfPer).length >= 3
        ? bootstrapDiff(wfPer, Object.fromEntries(Object.keys(wfPer).map((y) => [y, 0])), BOOT, 12345)
        : null;
      const bestVar = Object.entries(wfVar).sort((a, b) => b[1].mean - a[1].mean)[0] || null;
      walkForward[source][cell.key] = {
        /* `byVariant` er talan sem gildir; `wholeGrid` er birt vid
           hlidina og er OFFITTUD ad honnun. */
        byVariant: wfVar,
        bestByVariant: bestVar ? { variant: bestVar[0], ...bestVar[1], perYear: undefined } : null,
        positiveVariants: Object.values(wfVar).filter((v) => v.mean > 0).length,
        totalVariants: Object.keys(wfVar).length,
        significantVariants: Object.values(wfVar).filter((v) => v.excludesZero).length,
        significantNegative: Object.values(wfVar)
          .filter((v) => v.excludesZero && v.mean < 0).length,
        wholeGrid: { perYear: wf, mean: r1(mean(wfVals)), t: tOf(wfVals),
          wins: wfVals.filter((v) => v > 0).length, years: wfVals.length,
          ci: wfBoot ? [r1(wfBoot.lo), r1(wfBoot.hi)] : null,
          excludesZero: wfBoot ? wfBoot.excludesZero : null },
      };
      perTables[source][cell.key] = perAll;
      const wfq = walkForward[source][cell.key];
      console.log(`  WALK-FORWARD per afbrigdi (k valid a fyrri arum): ` +
        `${wfq.positiveVariants}/${wfq.totalVariants} jakvaed · ` +
        `marktaek ${wfq.significantVariants} (thar af ${wfq.significantNegative} NEIKVAED)`);
      if (bestVar) {
        console.log(`    best: ${bestVar[0]} -> ${bestVar[1].mean > 0 ? "+" : ""}${bestVar[1].mean} ` +
          `stig · ${bestVar[1].wins}/${bestVar[1].years} ar · t=${bestVar[1].t} · ` +
          `CI [${bestVar[1].ci}]${bestVar[1].excludesZero ? " EXCLUDES 0" : " includes 0"}`);
      }
      console.log(`    (leit ur ollu gridinu, OFFITTUD: ` +
        `${wfq.wholeGrid.mean > 0 ? "+" : ""}${wfq.wholeGrid.mean} stig, ` +
        `${wfq.wholeGrid.wins}/${wfq.wholeGrid.years} ar)`);
    }
  }

  /* ============================================================
     1. FJOLDI SAMANBURDA — hra leitin er LEIT
     ============================================================ */
  const multiplicity = {};
  for (const source of Object.keys(results)) {
    for (const [ck, cellRes] of Object.entries(results[source])) {
      let tried = 0;
      for (const un of Object.keys(cellRes)) {
        for (const pr of Object.keys(cellRes[un])) tried += Object.keys(cellRes[un][pr].byK).length;
      }
      let best = null;
      for (const un of Object.keys(cellRes)) {
        for (const pr of Object.keys(cellRes[un])) {
          const R = cellRes[un][pr];
          const b = R.byK[R.bestK];
          if (best == null || b.mean > best.mean) {
            best = { unc: un, prior: pr, k: R.bestK, w: R.bestW, ...b };
          }
        }
      }
      if (!best) continue;
      /* FRIGRADUR ERU IN-SAMPLE ARIN, ekki walk-forward arin — `best.t`
         er reiknad ur `byK`, sem naer yfir OLL ar heimildarinnar. */
      const tCrit = T_CRIT(Math.max(1, best.years - 1));
      /* Sama leidretting og board-lab notar: Bonferroni-lik, mild,
         og hun er birt VID HLIDINA a hrau tolunni — hun er ekki i stad
         hennar. */
      const corrected = tCrit * Math.sqrt(Math.log(Math.max(2, tried)) / Math.log(2)) * 0.6
        + tCrit * 0.4;
      multiplicity[`${source}|${ck}`] = { tried, df: best.years - 1,
        tCrit: r3(tCrit), corrected: r3(corrected),
        best, passesRaw: best && best.t != null && Math.abs(best.t) > tCrit,
        passesCorrected: best && best.t != null && Math.abs(best.t) > corrected };
    }
  }

  /* ============================================================
     2. KJARNASPURNINGIN — ER `k` OLIKT MILLI PPR OG HALF?
     ============================================================
     Tvennt maelt, thvi thau svara ekki sama:
     (a) HVAR TOPPAR `k`? Dreifing besta k yfir oll (un, pr) afbrigdi i
         hverju sniði. Vaeri hnignun raunverulega NAUÐSYNLEGRI i
         standard/half aetti dreifingin ad faerast UPP.
     (b) PORUD TVI-SYNI: gain(half) − gain(ppr) vid SAMA (un, pr, k),
         paruð per timabili. Somu ar, somu leikmenn — thvi paruð.     */
  const formatContrast = {};
  for (const source of Object.keys(results)) {
    const cells = { ppr: "12-1flex|ppr", half: "12-1flex|half", standard: "12-1flex|standard" };
    const kDist = {};
    for (const [fmt, ck] of Object.entries(cells)) {
      if (!results[source][ck]) continue;
      const d = {};
      for (const un of Object.keys(results[source][ck])) {
        for (const pr of Object.keys(results[source][ck][un])) {
          const k = results[source][ck][un][pr].bestK;
          d[k] = (d[k] || 0) + 1;
        }
      }
      kDist[fmt] = d;
    }
    const paired = {};
    for (const [a, b] of [["half", "ppr"], ["half", "standard"], ["ppr", "standard"]]) {
      const A = perTables[source][cells[a]] || {}, B = perTables[source][cells[b]] || {};
      const rows = [];
      for (const key of Object.keys(A)) {
        if (!B[key]) continue;
        const yrs = Object.keys(A[key]).filter((y) => B[key][y] != null);
        if (yrs.length < 3) continue;
        const d = yrs.map((y) => A[key][y] - B[key][y]);
        rows.push({ variant: key, mean: r1(mean(d)), t: tOf(d), years: d.length,
          wins: d.filter((x) => x > 0).length });
      }
      /* MEDALTAL YFIR AFBRIGDI er lyst SEM YFIRLIT, ekki sem prof —
         afbrigdin eru ekki ohað (sama grunnbord, samfylgnir maelarar).
         Talan sem ma prófa er `sig`: hve morg afbrigdi eru marktaek og
         i hvora attina. */
      paired[`${a}-${b}`] = {
        variants: rows.length,
        meanOfMeans: r1(mean(rows.map((r) => r.mean))),
        sigPositive: rows.filter((r) => r.t != null && r.t > T_CRIT(r.years - 1)).length,
        sigNegative: rows.filter((r) => r.t != null && r.t < -T_CRIT(r.years - 1)).length,
        rows: rows.sort((x, z) => z.mean - x.mean).slice(0, 8),
      };
    }
    formatContrast[source] = { bestKDistribution: kDist, pairedFormatDiff: paired };
  }

  /* ============================================================
     3. BATNADI MAE MEDAN AKVORDUNIN VERSNADI?
     ============================================================
     Thetta er laerdomurinn sem repo-id vill skjaladan (`aron/verd` i
     FPL). Talid berum orðum: hve morg afbrigdi baeta MAE og TAPA samt
     stigum, og hve morg gera bædi.                                  */
  const maeVsDecision = {};
  for (const source of Object.keys(side)) {
    maeVsDecision[source] = {};
    for (const fmt of Object.keys(side[source])) {
      const base = baseline[source][fmt];
      const ck = Object.keys(results[source]).find((k) => k.endsWith(`|${fmt}`));
      if (!base || !ck) continue;
      let maeBetterPtsWorse = 0, maeBetterPtsBetter = 0, maeWorse = 0, total = 0;
      const examples = [];
      for (const un of Object.keys(side[source][fmt])) {
        for (const pr of Object.keys(side[source][fmt][un])) {
          for (const [k, s] of Object.entries(side[source][fmt][un][pr])) {
            const R = results[source][ck][un] && results[source][ck][un][pr];
            const d = R && R.byK[k];
            if (!d || s.mae == null) continue;
            total++;
            const maeBetter = s.mae < base.mae;
            if (!maeBetter) { maeWorse++; continue; }
            if (d.mean < 0) {
              maeBetterPtsWorse++;
              examples.push({ unc: un, prior: pr, k: Number(k),
                mae: s.mae, maeBase: base.mae, points: d.mean, rho: s.rho, rhoBase: base.rho });
            } else maeBetterPtsBetter++;
          }
        }
      }
      examples.sort((a, b) => (a.mae - a.maeBase) - (b.mae - b.maeBase));
      maeVsDecision[source][fmt] = { baseline: base, total,
        maeBetterPointsWorse: maeBetterPtsWorse, maeBetterPointsBetter: maeBetterPtsBetter,
        maeWorse, worstExamples: examples.slice(0, 6) };
    }
  }

  /* ============================================================
     4. NYLIDAR — thar er ovissan mest og forgildid var THEGAR fellt
        i FPL-verkefninu. Gildir thad sama her?
     ============================================================ */
  const rookies = {};
  for (const source of Object.keys(side)) {
    rookies[source] = {};
    for (const fmt of Object.keys(side[source])) {
      const base = baseline[source][fmt];
      const ck = Object.keys(results[source]).find((k) => k.endsWith(`|${fmt}`));
      if (!base || !ck || !results[source][ck].rookie) continue;
      const rows = [];
      for (const pr of Object.keys(results[source][ck].rookie)) {
        const R = results[source][ck].rookie[pr];
        for (const [k, d] of Object.entries(R.byK)) {
          const s = (side[source][fmt].rookie[pr] || {})[k] || {};
          rows.push({ prior: pr, k: Number(k), points: d.mean, t: d.t,
            wins: d.wins, years: d.years, ci: d.ci,
            maeRookie: s.maeRookie ?? null, maeRookieBase: base.maeRookie,
            nRookie: s.nRookie ?? base.nRookie });
        }
      }
      rookies[source][fmt] = { baselineMaeRookie: base.maeRookie,
        nRookiePerYear: base.nRookie, rows };
    }
  }

  /* ============================================================
     5. VERDICT — a ENSKU, og hun ma ekki vera myndraedri en tolurnar
     ============================================================ */
  const wfAll = [];
  for (const source of Object.keys(walkForward)) {
    for (const [ck, v] of Object.entries(walkForward[source])) {
      wfAll.push({ source, cell: ck,
        positive: v.positiveVariants, total: v.totalVariants,
        sig: v.significantVariants, sigNeg: v.significantNegative,
        best: v.bestByVariant, wholeGrid: v.wholeGrid.mean });
    }
  }

  /* ============================================================
     SAMKVAEMNI YFIR FRUMUR — OG HVERS VEGNA "BEST I HVERRI FRUMU"
     ER EKKI VERDICT
     ============================================================
     Fyrsta utgafa verdictsins spurdi "er BESTA afbrigdid i hverri
     frumu jakvaett?" og fekk ja i 14/14 — sem er einskis virdi:
     hamark yfir 36 afbrigdi er jakvaett af tilviljun einni. Thad er
     sama villa og board-lab skjalfesti (hra leit finnur havada) og
     sami lærdomur og "sterkasti reiturinn i 56-reita toflu er
     vaentanlega sterkur af tilviljun" (5j).

     RETTA SPURNINGIN er hvort SAMA (ovissu-maelir x forgildi) haldi
     yfir frumur OG YFIR BADAR SPAHEIMILDIR. Endurtekningin a annarri,
     ohaðri heimild er thad sem greinir merki fra leit.               */
  const consistency = {};
  for (const source of Object.keys(walkForward)) {
    for (const [ck, v] of Object.entries(walkForward[source])) {
      if (ck.includes("@")) continue;                 // naemniprof, ekki fruma
      for (const [key, q] of Object.entries(v.byVariant)) {
        const c = consistency[key] = consistency[key] ||
          { cells: 0, positive: 0, significant: 0, sigNegative: 0, means: [], bySource: {} };
        c.cells++;
        if (q.mean > 0) c.positive++;
        if (q.excludesZero) { c.significant++; if (q.mean < 0) c.sigNegative++; }
        c.means.push(q.mean);
        const s = c.bySource[source] = c.bySource[source] ||
          { cells: 0, positive: 0, significant: 0, means: [] };
        s.cells++; if (q.mean > 0) s.positive++; if (q.excludesZero) s.significant++;
        s.means.push(q.mean);
      }
    }
  }
  for (const c of Object.values(consistency)) {
    c.meanOfCells = r1(mean(c.means)); delete c.means;
    for (const s of Object.values(c.bySource)) { s.meanOfCells = r1(mean(s.means)); delete s.means; }
    /* SKILYRDIN: jakvaett i OLLUM frumum, marktaekt i minnst helmingi,
       og jakvaett a BADUM heimildum. Thad er throskuldurinn sem
       `bye-lab` (10/10 vogir jakvaedar) fell a og hann er sami her. */
    c.holdsEverywhere = c.positive === c.cells;
    c.holdsOnBothSources = Object.keys(c.bySource).length >= 2 &&
      Object.values(c.bySource).every((s) => s.positive === s.cells);
    c.qualifies = c.holdsEverywhere && c.holdsOnBothSources && c.significant >= c.cells / 2;
  }
  const winners = Object.entries(consistency).filter(([, c]) => c.qualifies)
    .sort((a, b) => b[1].meanOfCells - a[1].meanOfCells);
  const nearMiss = Object.entries(consistency)
    .filter(([, c]) => !c.qualifies && c.holdsEverywhere && c.holdsOnBothSources)
    .sort((a, b) => b[1].meanOfCells - a[1].meanOfCells);

  const wfPositive = wfAll.filter((v) => v.best && v.best.mean > 0).length;
  const wfSig = wfAll.filter((v) => v.best && v.best.mean > 0 && v.best.excludesZero).length;
  const wfSigNeg = wfAll.reduce((a, v) => a + v.sigNeg, 0);
  const anyCorrected = Object.values(multiplicity).filter((m) => m.passesCorrected).length;
  const maeTrap = Object.values(maeVsDecision).flatMap((o) => Object.values(o))
    .reduce((a, v) => a + v.maeBetterPointsWorse, 0);
  const maeTotal = Object.values(maeVsDecision).flatMap((o) => Object.values(o))
    .reduce((a, v) => a + v.total, 0);

  const verdict = {
    headline: winners.length
      ? `SHRINKAGE WINS for ${winners.length} uncertainty x prior combination(s) — positive in every cell, ` +
        `on BOTH projection sources, with the per-season bootstrap excluding zero in at least half the cells. ` +
        `Best: ${winners[0][0]} at ${winners[0][1].meanOfCells} points.`
      : (nearMiss.length
        ? `NO — nothing qualifies. ${nearMiss.length} combination(s) are positive in every cell on both ` +
          `sources but never clear the bootstrap (best: ${nearMiss[0][0]}, ${nearMiss[0][1].meanOfCells} points). ` +
          "Positive-and-not-significant is the same decision as no: leave w = 1. Same call as the bye-week " +
          "measurement, where 10 of 10 weights were positive on two independent sources and it still rules nothing."
        : "NO — uncertainty-proportional shrinkage does not improve the draft decision. No uncertainty measure " +
          "and prior is even consistently positive across the league shapes and both projection sources. " +
          "The null hypothesis w = 1 (current behaviour) stands."),
    qualifyingCombinations: winners.map(([k, c]) => ({ variant: k, ...c })),
    positiveEverywhereButNotSignificant: nearMiss.slice(0, 6).map(([k, c]) => ({ variant: k, ...c })),
    bestPerCellIsNotAVerdict:
      "Every cell has a positive 'best' variant because a maximum over ~36 variants is positive by chance. " +
      "That number is reported for completeness and it is NOT the verdict. The verdict requires the SAME " +
      "(uncertainty x prior) to hold across shapes and across both projection sources.",
    nullHypothesis: "w = 1 for everyone, i.e. the raw projection. It is the rival board in every duel and it wins unless a confidence interval excludes it.",
    walkForwardPositiveCells: `${wfPositive}/${wfAll.length} (best variant per cell, k chosen on prior years only)`,
    walkForwardSignificantCells: `${wfSig}/${wfAll.length}`,
    walkForwardSignificantlyNegativeVariants: wfSigNeg,
    rawSearchPassesCorrectedThreshold: `${anyCorrected}/${Object.keys(multiplicity).length}`,
    affineInvariance:
      "MEASURED FACT, not an assumption: constant shrinkage toward the position mean cannot change " +
      "A-Ranking at all. VBD = proj - baseline, and if proj' = (1-k)*proj + k*m_pos then baseline' = " +
      "(1-k)*baseline + k*m_pos, so VBD' = (1-k)*VBD for EVERY position — one global positive rescale, " +
      "identical ranking. The harness shows it: uniform x posMean is exactly 0.0 at every k < 1. " +
      "This is why 'shrink everyone' and 'shrink the uncertain ones' are different questions, and it is " +
      "also the neutrality proof for the simulator (5h rule 1). At k = 1 every VBD collapses to 0 and the " +
      "board becomes arbitrary, which is why that column is catastrophic rather than merely flat.",
    maeTrap: `${maeTrap} of ${maeTotal} variant-cells improve MAE while LOSING draft points. ` +
      "Shrinkage almost always improves MAE — that is what it is for — and MAE is not the metric. " +
      "If MAE improves while the decision gets worse the answer is NO.",
    significanceIsNotCalibratedAtThreeClusters:
      "READ THIS BEFORE QUOTING ANY 'EXCLUDES 0' ON THE SLEEPER SOURCE. Sleeper has 5 clean seasons, so " +
      "walk-forward leaves 3 test years and the per-season bootstrap resamples 3 clusters. The run supplies " +
      "its own evidence that this is not calibrated: in sleeper|12-1flex|ppr several variants are positive " +
      "AND 'exclude zero', while in sleeper|12-1flex|half FOURTEEN variants exclude zero and ALL FOURTEEN " +
      "are negative — the same variants, the same players, a format that differs only by half a point per " +
      "reception. An interval that fires in both directions on near-identical data is measuring the " +
      "smallness of the sample, not an effect. Only the FFToday source (11 seasons, 9-10 walk-forward " +
      "years) carries usable intervals, and there nothing qualifies either.",
    clustering: "Bootstrap is clustered per SEASON, not per player. A draft outcome is one number per " +
      "(season, slot, run); there is no player-level unit to cluster on for this metric. Per-season " +
      "clustering is both the finest correct clustering and the most conservative (5 or 11 clusters).",
    leakGate: "Shrunk projections were put through the same gate build-features.mjs puts the raw " +
      "projection through: |r(projection, games played)| must stay under 0.40 on the drafted pool.",
    rookieNote:
      "The two sources give OPPOSITE signs on rookies, and that resolves the question rather than muddying " +
      "it. On FFToday, shrinking rookies toward the ADP curve or the position mean gains points (up to +86 " +
      "in standard). On SLEEPER — the source the app actually uses — every rookie variant LOSES points " +
      "(-28 to -139). The FFToday gain is therefore not 'shrinkage works', it is 'FFToday's rookie numbers " +
      "are worse than the market', which is the same finding as README 5k: FFToday carries nothing above " +
      "ADP. Sleeper's rookie projections are already good enough that pulling them toward a prior destroys " +
      "information. And the direction of the MAE evidence is exactly inverted: rookie|altProj improves " +
      "rookie MAE from 55.49 to 53.73 on Sleeper PPR while losing 28-53 draft points. That is the FPL " +
      "'position prior instead of ep_next' result reproduced on NFL data, in the same subgroup.",
    priorNote: "adpCurve is the most informative prior (the crowd), posMean the flattest, altProj the " +
      "independent source. README 5h already measured that blending Sleeper with FFToday is monotonically " +
      "downhill at a FIXED weight; altProj here asks the different question of using it only where " +
      "Sleeper is uncertain.",
    controlNote: "The `uniform` row is the control: the same shrink for everyone. It reproduces " +
      "arank-lab's `shrink` and board-lab's `adpShrink`. An uncertainty measure that does not beat " +
      "`uniform` is not carrying uncertainty information — it is those two measurements again.",
    notMeasured: [
      "True historical half-PPR ADP does not exist (FFC serves half-ppr_12 only for the current season). " +
      "Half cells are therefore run under both ppr-ADP and standard-ADP as bounds.",
      "Per-week decisions: everything here is scored on season totals (README 5i shows correlation 0.89-0.99 " +
      "with weekly counting, so the approximation holds, but a shrinkage rule that only pays off through " +
      "depth would be invisible here).",
      "Sleeper covers 5 clean seasons. README 5b says thirteen would be needed to settle a PPR difference " +
      "of this effect size; FFToday's 11 seasons are the repetition, not extra power on Sleeper itself.",
    ],
  };

  /* ---------- utprentun ---------- */
  console.log(`\n${"=".repeat(78)}\n  SAMANTEKT\n${"=".repeat(78)}`);
  for (const v of wfAll) {
    const b = v.best;
    console.log(`  ${`${v.source}|${v.cell}`.padEnd(30)}` +
      `jakv ${String(v.positive).padStart(2)}/${v.total} · marktaek ${v.sig} (neikv ${v.sigNeg}) · ` +
      `best ${b ? `${b.variant} ${b.mean > 0 ? "+" : ""}${b.mean} (${b.wins}/${b.years}, t=${b.t}, CI [${b.ci}])` : "—"}`);
  }
  console.log(`\n  SAMKVAEMNI YFIR FRUMUR (sama afbrigdi verdur ad halda BADUM heimildum):`);
  const shown = (winners.length ? winners : nearMiss).slice(0, 8);
  if (!shown.length) console.log("    ekkert afbrigdi er jakvaett i ollum frumum a badum heimildum");
  for (const [k, c] of shown) {
    console.log(`    ${k.padEnd(26)}jakv ${c.positive}/${c.cells} · marktaek ${c.significant} ` +
      `(neikv ${c.sigNegative}) · medaltal ${c.meanOfCells > 0 ? "+" : ""}${c.meanOfCells} · ` +
      `badar heimildir: ${c.holdsOnBothSources ? "JA" : "nei"} · ${c.qualifies ? "STENST" : "fellur"}`);
  }
  console.log(`\n  hra leit stenst leidrett mork i ${anyCorrected}/${Object.keys(multiplicity).length} frumum`);
  console.log(`  MAE-gildran: ${maeTrap}/${maeTotal} afbrigda baeta MAE og TAPA stigum`);
  for (const source of Object.keys(formatContrast)) {
    console.log(`\n  ${source} — dreifing besta k per sniði (hra leit, ekki nidurstada):`);
    for (const [fmt, d] of Object.entries(formatContrast[source].bestKDistribution)) {
      console.log(`    ${fmt.padEnd(10)}${Object.entries(d).sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([k, n]) => `k=${k}:${n}`).join("  ")}`);
    }
    for (const [pair, q] of Object.entries(formatContrast[source].pairedFormatDiff)) {
      console.log(`    ${pair.padEnd(18)} medaltal ${q.meanOfMeans > 0 ? "+" : ""}${q.meanOfMeans} · ` +
        `marktaek + ${q.sigPositive} / − ${q.sigNegative} af ${q.variants}`);
    }
  }
  for (const source of Object.keys(leakGate)) {
    const g = leakGate[source];
    console.log(`\n  leka-hlid ${source}: max |r(proj, leikir)| = ${g.max} ` +
      `(${g.worst}) -> ${g.max > 0.4 ? "FELLUR" : "stenst (< 0,40)"}`);
    if (g.max > 0.4) { console.error("  !! LEKI — skrifa EKKERT"); process.exit(4); }
  }
  console.log(`\n  ${verdict.headline}`);

  /* ---------- skrifa ----------
     TOFLURNAR ERU THJAPPADAR I FYLKI MED SKRADRI LEGEND.
     Ekki af snyrtimennsku: gridið er 12 ovissu-maelarar x 3 forgildi x
     6 vogir x 14 frumur x 2 heimildir og skrain var **884 KB** med
     hlutum, thar sem naerri allt var lyklaheiti endurtekid 3.000
     sinnum. Legend-in er i `resolved.byKFields` / `resolved.sideFields`
     og hun er SKYLDA — thjoppuð fylki an legend eru ekki maeling
     heldur ratsja. */
  const packK = (byK) => Object.fromEntries(Object.entries(byK).map(([k, v]) =>
    [k, [v.mean, v.t, v.wins, v.years, v.ci ? v.ci[0] : null, v.ci ? v.ci[1] : null]]));
  const resultsOut = {};
  for (const [source, cells] of Object.entries(results)) {
    resultsOut[source] = {};
    for (const [ck, uncs] of Object.entries(cells)) {
      resultsOut[source][ck] = {};
      for (const [un, prs] of Object.entries(uncs)) {
        if (!Object.keys(prs).length) continue;
        resultsOut[source][ck][un] = {};
        for (const [pr, R] of Object.entries(prs)) {
          resultsOut[source][ck][un][pr] = { byK: packK(R.byK), bestK: R.bestK,
            bestW: R.bestW, n: R.n, bestPerSeason: R.best.per };
        }
      }
    }
  }
  const sideOut = {};
  for (const [source, fmts] of Object.entries(side)) {
    sideOut[source] = {};
    for (const [fmt, uncs] of Object.entries(fmts)) {
      sideOut[source][fmt] = {};
      for (const [un, prs] of Object.entries(uncs)) {
        sideOut[source][fmt][un] = {};
        for (const [pr, ks] of Object.entries(prs)) {
          sideOut[source][fmt][un][pr] = Object.fromEntries(Object.entries(ks)
            .map(([k, s]) => [k, [s.mae, s.rho, s.maeRookie, s.nRookie]]));
        }
      }
    }
  }

  await mkdir(path.join(OUT, "measure"), { recursive: true });
  await writeFile(path.join(OUT, "measure", "shrink.json"), JSON.stringify({
    generated: new Date().toISOString(),
    provenance: stamp({ argv: process.argv.slice(2),
      defaults: { runs: 3, boot: 2000, from: 2015 },
      inputs: ["features.json"], dataDir: OUT }),
    resolved: {
      halfIsExact: "half = (ppr + standard) / 2, algebra — same as half-lab.mjs",
      shrinkage: "proj_shrunk = w*proj + (1-w)*prior, w = 1 - k*u, u = uncertainty percentile within (season x position)",
      nullHypothesis: "k = 0 (w = 1) — current behaviour, the rival board in every duel",
      kGrid: KS, formats: ["ppr", "half", "standard"],
      cells: CELLS.map((c) => c.key), sources: Object.keys(SOURCES),
      uncertainties: Object.fromEntries(Object.entries(UNCS).map(([k, v]) => [k, v.label])),
      priors: Object.fromEntries(Object.entries(PRIORS).map(([k, v]) => [k, v.label])),
      missingUncertainty: "missing input = MAXIMUM uncertainty (u = 1); a rookie has no sample, which IS the uncertainty",
      bootstrapClustering: "per season",
      lightCells: "cells marked @adpStd run a reduced variant set; they are a sensitivity bound, not the result",
      byKFields: ["mean", "t", "wins", "years", "ciLo", "ciHi"],
      sideFields: ["mae", "rho", "maeRookie", "nRookie"],
    },
    seasons: ys, pairing: { paired, unpaired },
    neutrality, leakGate, baseline,
    results: resultsOut, walkForward, consistency, multiplicity, formatContrast,
    maeVsDecision, rookies, side: sideOut,
    verdict,
  }, null, 1));
  console.log(`\n-> data/measure/shrink.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
