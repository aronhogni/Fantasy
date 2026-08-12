/* ============================================================
   nfl-learn.mjs — ver TOLFRAEDINA sem allar niðurstodurnar hvila a.

   Ef ridge-fittid, krossprofunin eda bootstrappid er rangt tha eru
   allar tolur i Model-lab-flipanum rangar OG truverdugar. Thess vegna
   er hver adgerd profud gegn TILVIKI THAR SEM SVARID ER THEKKT
   FYRIRFRAM, ekki bara gegn sjalfri ser.

   Kafli 4 er mikilvaegastur: bootstrappid VERDUR ad vera klosad per
   timabil. Vaeri thad klosad per rod yrdu vikmorkin margfalt of throng
   og hver einasti munur liti ut fyrir ad vera marktaekur.
   ============================================================ */

import {
  solve, standardize, designMatrix, ridgeFit, ridgePredict, pickLambda,
  spearman, rankArray, mae, rmse, hitRate, mean, bootstrapDiff,
} from "../src/learn.js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const DATA = path.join(path.resolve(new URL(".", import.meta.url).pathname, ".."), "data");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const near = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m} (${a} ~ ${b})`);

/* ---------- 1. LINULEG ALGEBRA ---------- */
console.log("\n1. jofnuhneppi");
{
  const x = solve([[2, 1], [1, 3]], [5, 10]);
  near(x[0], 1, 1e-9, "leysir 2x+y=5, x+3y=10 -> x=1");
  near(x[1], 3, 1e-9, "…y=3");

  /* Sinngult hneppi ma EKKI skila tolum. Vaeri skilad NaN faeri thad
     thogult i gegnum allt likanid og birtist sem "—" i toflu. */
  ok(solve([[1, 2], [2, 4]], [1, 2]) === null, "sinngult hneppi skilar null");

  /* Snuningur: fyrsta stodid er 0 og verdur ad vixlast. */
  const y = solve([[0, 1], [1, 0]], [2, 3]);
  near(y[0], 3, 1e-9, "hlutasnuningur virkar thegar stod er 0");
}

/* ---------- 2. RIDGE ---------- */
console.log("\n2. ridge");
{
  /* Thekkt tilvik: y = 3*x1 + 0*x2 + havadi-laust. Med lambda -> 0
     a studullinn ad naest hitta 3 (a stodludum kvarda). */
  const n = 200;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const x1 = (i % 20) - 10, x2 = ((i * 7) % 13) - 6;
    rows.push({ x1, x2, y: 3 * x1 + 50 });
  }
  const cols = ["x1", "x2"];
  const stats = standardize(rows, cols);
  const X = designMatrix(rows, cols, stats, { missingFlags: false });
  const y = rows.map((r) => r.y);

  const m0 = ridgeFit(X, y, 1e-6);
  const pred = ridgePredict(m0, X);
  near(rmse(pred, y), 0, 1e-6, "havadalaust samband er fittad nakvaemlega");
  near(m0.intercept, mean(y), 1e-9, "skurdpunktur er medaltal y");
  ok(Math.abs(m0.beta[0]) > Math.abs(m0.beta[1]) * 100,
    "studull a merkjandi breytu er margfalt staerri en a havada");

  /* HAERRA LAMBDA VERDUR AD SKREPPA. Ef thad gerir thad ekki er
     refsingin ekki ad virka og offitting er ovarid. */
  const mBig = ridgeFit(X, y, 1e6);
  ok(Math.abs(mBig.beta[0]) < Math.abs(m0.beta[0]),
    "haerra lambda skreppir studlana");

  ok(pickLambda(X, y).valueOf() <= 1000, "lambda-valid skilar gildi ur netinu");

  /* Vantandi gildi: fara i medaltal OG fa eigin vitisbreytu. */
  const withNull = [{ x1: null, x2: 1 }, { x1: 5, x2: 2 }];
  const D = designMatrix(withNull, cols, stats);
  ok(D[0].length === 4, "vitisbreytur baetast vid (2 dalkar -> 4)");
  ok(D[0][0] === 0, "vantandi gildi verdur 0 a stodludum kvarda (= medaltal)");
  ok(D[0][2] === 1 && D[1][2] === 0, "vitisbreyta merkir HVAR gildid vantadi");
}

/* ---------- 3. MAELIKVARDAR ---------- */
console.log("\n3. maelikvardar");
{
  near(spearman([1, 2, 3, 4], [1, 2, 3, 4]), 1, 1e-9, "fullkomin rod -> 1");
  near(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1, 1e-9, "ofug rod -> -1");
  ok(spearman([1, 2], [1, 2]) === null, "of litid urtak -> null");

  const r = rankArray([10, 10, 20]);
  near(r[0], 1.5, 1e-9, "jafntefli fa MEDALROD");
  near(r[1], 1.5, 1e-9, "…badir");
  near(r[2], 3, 1e-9, "…og sa haesti faer 3");

  near(mae([1, 2, 3], [2, 2, 2]), 2 / 3, 1e-9, "MAE rett");
  near(rmse([0, 0], [3, 4]), Math.sqrt(12.5), 1e-9, "RMSE rett");

  /* Hittni krefst laugar sem er STAERRI en N — annars er "topp N"
     allir og talan er 1,000 hvernig sem radad er. */
  ok(hitRate([5, 4, 3], [5, 4, 3], 3) === null,
    "of grunn laug skilar null i stad falskra 100%");
  const p = Array.from({ length: 20 }, (_, i) => 20 - i);
  near(hitRate(p, p, 10), 1, 1e-9, "fullkomin rod hittir 100%");
  near(hitRate(p, p.slice().reverse(), 10), 0, 1e-9, "ofug rod hittir 0%");
}

/* ---------- 4. BOOTSTRAP — PROFSTEINNINN ---------- */
console.log("\n4. BOOTSTRAP: klosad per timabil");
{
  /* Tvo likon thar sem A er ALLTAF 100 stigum betra. Vikmorkin eiga
     ad utiloka null. */
  const A = { 2019: 1100, 2020: 1200, 2021: 1150, 2022: 1300, 2023: 1250 };
  const B = { 2019: 1000, 2020: 1100, 2021: 1050, 2022: 1200, 2023: 1150 };
  const d = bootstrapDiff(A, B);
  near(d.diff, 100, 1e-9, "punktmat er raunverulegi munurinn");
  ok(d.excludesZero, "stodugur munur -> vikmorkin utiloka null");
  ok(d.lo > 0 && d.hi > 0, "badar vikmarka-hlidar jakvaedar");

  /* Likon sem skiptast a ad vinna med stórum sveiflum: EKKI marktaekt. */
  const C = { 2019: 1300, 2020: 900, 2021: 1250, 2022: 950, 2023: 1200 };
  const D2 = { 2019: 900, 2020: 1300, 2021: 950, 2022: 1250, 2023: 1000 };
  const d2 = bootstrapDiff(C, D2);
  ok(!d2.excludesZero,
    `sveiflukenndur munur er EKKI marktaekur (${d2.lo.toFixed(0)}..${d2.hi.toFixed(0)})`);

  /* ENDURGERANLEIKI: fast fraekorn -> sama svar i hvert sinn. */
  const a1 = bootstrapDiff(A, B), a2 = bootstrapDiff(A, B);
  ok(a1.lo === a2.lo && a1.hi === a2.hi,
    "somu inntok gefa somu vikmork — ekkert Math.random");

  ok(bootstrapDiff({ 2019: 1 }, { 2019: 0 }) === null,
    "of fa ar -> null i stad tolu sem litur ut eins og maeling");

  /* KJARNINN: vikmorkin verda ad VIDA thegar arin eru faerri.
     Vaeri klosad per ROD i stad per ARI yrdu thau nanast engin.

     ATH: munurinn VERDUR ad sveiflast milli ara. Vaeri hann nakvaemlega
     sami i hverju ari gaefi hver einasta endurtekt sama svar og bædi
     vikmork yrdu 0 breid — profid vaeri tha ad bera saman tvo null og
     stadfesta ekkert. Fyrsta utgafan gerdi einmitt thad. */
    const mkPair = (diffs) => {
      const a = {}, b = {};
      Object.entries(diffs).forEach(([y, d]) => { a[y] = 1000 + d; b[y] = 1000; });
      return [a, b];
    };
    const [fA, fB] = mkPair({ 2022: 40, 2023: 160, 2024: 100 });
    const [mA, mB] = mkPair({ 2018: 40, 2019: 160, 2020: 100, 2021: 60,
                              2022: 140, 2023: 90, 2024: 110, 2025: 80 });
    const few = bootstrapDiff(fA, fB);
    const many = bootstrapDiff(mA, mB);
    ok((few.hi - few.lo) > (many.hi - many.lo),
      `faerri ar gefa VIDARI vikmork (${(few.hi - few.lo).toFixed(0)} > ${(many.hi - many.lo).toFixed(0)})`);
}


/* ============================================================
   TILRAUNIRNAR SEM VORU GERDAR OG FELLDAR
   ============================================================
   `board-lab.mjs` og `dynamic-lab.mjs` profudu sjo fjolskyldur af
   breytingum a rodinni yfir tvaer stigagjafir og TVAER OHADAR
   spaheimildir (Sleeper 5 timabil, FFToday 11). Ekkert stodst.

   Thetta profa er ekki ad endurmaela — thad ver ad NIDURSTODURNAR A
   DISKNUM SEGI ENN THAD SAMA. Hlaupi einhver til og skrifi "ADP-blondun
   baetir rodina" verdur hann ad hafa keyrt rannsoknina aftur og fengid
   adra tolu, og tha fellur thetta.

   THRJU ATRIDI SEM MA ALDREI GLEYMA:

   1. NULLTILGATAN VERDUR AD VERA HLUTLAUS. Bord gegn sjalfu ser skal
      gefa NAKVAEMLEGA 0. Gefi thad thad ekki er hermunin osamhverf og
      hver einasta tala hér er merkingarlaus. Thetta er profad fyrst.

   2. WALK-FORWARD ER TALAN SEM GILDIR, ekki besta utkoman i leitinni.
      Aldurs-fjolskyldan var BEST i hrau leitinni i hverri einustu
      keyrslu — og fell i walk-forward i hverri einustu keyrslu.

   3. LEIDRETT MORK. 42 afbrigdi voru profud; vid svo marga samanburdi
      er besta utkoman vaentanleg af tilviljun einni.                */
console.log("\ntilraunir sem voru felldar (bord-rodun)");
{
  const BOARD = ["board_ppr_sleeper", "board_ppr_fftoday",
                 "board_standard_sleeper", "board_standard_fftoday"];
  let seen = 0;
  for (const f of BOARD) {
    const p = path.join(DATA, `${f}.json`);
    if (!existsSync(p)) continue;
    seen++;
    const j = JSON.parse(readFileSync(p, "utf8"));

    const zero = j.variants.find((v) => v.w === 0);
    ok(zero && Math.abs(zero.mean) < 0.05,
      `${f}: bord gegn sjalfu ser er hlutlaust (${zero ? zero.mean : "vantar"})`);

    ok(j.best && j.best.passesCorrected === false,
      `${f}: besta afbrigdid (${j.best.family} w=${j.best.w}) fellur a leidrettum morkum`);

    ok(j.walkForwardMean <= 0,
      `${f}: walk-forward gefur enga baetingu (${j.walkForwardMean} stig)`);
  }
  ok(seen >= 2, `${seen} bord-tilraunir lesnar af diski`);

  /* Kvikt VBD — sama saga, ur hinni skriftunni. */
  let dyn = 0, better = 0;
  for (const f of ["dynamic_ppr_sleeper", "dynamic_ppr_fftoday",
                   "dynamic_standard_sleeper", "dynamic_standard_fftoday"]) {
    const p = path.join(DATA, `${f}.json`);
    if (!existsSync(p)) continue;
    dyn++;
    const j = JSON.parse(readFileSync(p, "utf8"));
    ok(Math.abs(j.selfTest.mean) < 0.05,
      `${f}: heilbrigdisprofid er hlutlaust (${j.selfTest.mean})`);
    for (const mode of ["remaining", "nextpick"]) {
      if (Math.abs(j[mode].t) > j.tCrit && j[mode].mean > 0) better++;
    }
  }
  ok(dyn >= 2, `${dyn} kvik-VBD tilraunir lesnar af diski`);
  ok(better === 0,
    `kvikt VBD er hvergi marktaek baeting (${better} af ${dyn * 2} frumum)`);
}

/* ============================================================
   HEITT UPPHAF — STERKASTA MERKID I LEIFINNI, OG THAD DUGDI EKKI
   ============================================================
   `feature-probe` profadi 14 breytur gegn leif spar Sleeper. Allt var
   undir |r| = 0,14 og jointLift var NEIKVAETT (-0,071). Einn reitur
   stod eftir: "fyrstu 4 leikir sidasta timabils" gegn leifinni,
   **r = -0,224 hja hlaupurum** — sa sem byrjadi heitt stendur UNDIR
   spanni sinni, sem er afturhvarf til medaltals sem spain hefur ekki
   melt.

   Su tilgata var profud a REKSTRAR-maelikvardanum, ekki fylgninni:

     fftoday  best +30,9 stig, t=0,70 · og w=0,15 gefur -144,6 (t=-2,12)
     sleeper  HVER EINASTA vog tapar, 0/5 ar, t = -3,2

   Merkid er ekki bara gagnslaust heldur SKADLEGT thegar thvi er beitt.
   Einn reitur af 56 sem litur sterkur ut er vaentanlega sterkur af
   tilviljun — og fylgni i toflu er tilgata, ekki nidurstada.        */
console.log("\nheitt upphaf: sterkasta leifar-merkid");
{
  let seen = 0;
  for (const f of ["first4_ppr_sleeper", "first4_ppr_fftoday"]) {
    const p = path.join(DATA, `${f}.json`);
    if (!existsSync(p)) continue;
    seen++;
    const j = JSON.parse(readFileSync(p, "utf8"));
    ok(Math.abs(j.selfTest.mean) < 0.05,
      `${f}: w=0 er hlutlaust (${j.selfTest.mean})`);
    ok(j.verdict === "FELLUR",
      `${f}: leidrettingin fellur (best ${j.best.mean} stig, t=${j.best.t})`);
    /* Og hun ma ekki laumast inn bakdyramegin: se HAESTA vogin jakvaed
       vaeri einhver freistadur til ad nota hana. */
    const heavy = j.variants.filter((v) => v.w >= 0.15);
    ok(heavy.every((v) => v.mean <= 0),
      `${f}: haestu vogirnar eru allar neikvaedar (${heavy.map((v) => v.mean).join(", ")})`);
  }
  ok(seen >= 1, `${seen} heitt-upphaf tilraunir lesnar af diski`);
}

/* ============================================================
   AUDAR VIKUR — MAELINGIN SEM RETTLAETIR AD RADA THEIM EKKI
   ============================================================
   Fyrsta spurningin i thessu verkefni sem TIMABILS-SUMMAN GAT EKKI
   SVARAD: thrir hlauparar med bye i viku 7 skila nakvaemlega somu
   arssummu og thrir med bye i viku 5, 9 og 11. Bordid gat hvorki
   verid verdlaunad ne refsad, svo spurningin var osvaranleg thangad
   til vikulega talningin var byggd.

   Nidurstadan er millistig og hun er sogd sem slik: tiu af tiu vogum
   jakvaedar a tveimur ohadum heimildum, en 8 af 12 arum og vikmorkin
   innihalda null. Thess vegna SÉST hun og RÆÐUR ENGU.

   Falli thetta profa hefur einhver annadhvort endurmælt (og tha ma
   endurskoda birtinguna) eda breytt maelingunni an thess ad segja fra. */
console.log("\naudar vikur: maelingin sjalf");
{
  let seen = 0, allPositive = true, anySignificant = false;
  for (const f of ["bye_ppr_sleeper", "bye_ppr_fftoday"]) {
    const p = path.join(DATA, `${f}.json`);
    if (!existsSync(p)) continue;
    seen++;
    const j = JSON.parse(readFileSync(p, "utf8"));

    ok(j.scoredWeekly === true,
      `${f}: talid VIKULEGA (timabils-summa er blind a audar vikur)`);
    ok(Math.abs(j.selfTest.mean) < 0.05,
      `${f}: w=0 er hlutlaust (${j.selfTest.mean})`);
    if (!j.variants.every((v) => v.mean > 0)) allPositive = false;
    if (j.verdict === "STENST") anySignificant = true;
  }
  ok(seen >= 1, `${seen} bye-maelingar lesnar af diski`);
  ok(allPositive,
    "hver einasta vog er jakvaed — thad er astaedan fyrir ad SYNA hana");
  ok(!anySignificant,
    "en engin stenst leidrett mork — thad er astaedan fyrir ad RADA henni ekki");
}

/* ============================================================
   AHAETTA VID VALID — RADID SEM OLL DRAFT-RIT GEFA, OG THAD MAELIST EKKI
   ============================================================
   "Taktu oruggan mann snemma og sveiflukenndan seint" er radlegging
   sem er gefin alls stadar. `risk-lab.mjs` maeldi hana med THREMUR
   ahaettumatum sem oll eru til a draft-degi (adpSd, ecrSd og
   sveiflustudull vikustiga i fyrra) og FJORUM hattum, thar med talid
   umferdarhada — sem thurfti ad bordid vissi hvada umferd vaeri, geta
   sem var nyleg.

   NIDURSTADA: 0 af 24 standast, a BADUM heimildum. Og thau sem NA
   marktaekni eru oll NEIKVAED: ad sækjast eftir osamkomulagi
   serfraedinga kostar 77 stig a timabils-summu og 130 vikulega.

   TALID VAR BADAR LEIDIR AF ASETTU RADI. Vikulega talningin velur
   byrjunarlid med FULLKOMINNI vitneskju um vikuna og VERDLAUNAR thvi
   sveiflu — madur sem skorar 0-0-40 kemst i lid nakvaemlega tha viku
   sem hann skorar 40. Raunveruleg fantasy velur fyrirfram og faer thad
   ekki. Nidurstada sem stenst ADEINS vikulegu er thvi artefakt, og
   profid greinir thaer ad. I fftoday-keyrslunni var nakvaemlega ein
   slik — hun var flogguð og ekki send.                             */
console.log("\nahaetta vid valid");
{
  let seen = 0;
  for (const f of ["risk_ppr_sleeper", "risk_ppr_fftoday"]) {
    const p = path.join(DATA, `${f}.json`);
    if (!existsSync(p)) continue;
    seen++;
    const j = JSON.parse(readFileSync(p, "utf8"));
    ok(j.scoredBothWays === true,
      `${f}: talid BADAR leidir (summa OG vikulega)`);
    ok(Math.abs(j.selfTest.season.mean) < 0.05 && Math.abs(j.selfTest.weekly.mean) < 0.05,
      `${f}: w=0 er hlutlaust i badum talningum`);
    ok(j.verdict === "FELLUR",
      `${f}: ekkert afbrigdi stenst (${j.passesBoth.length} af ${j.variants.length})`);

    /* Thyngstu vogirnar mega ekki vera jakvaedar — vaeru thaer thad
       hefdi einhver freistast til ad nota thaer. */
    const heavy = j.variants.filter((v) => v.w >= 15);
    const heavyPos = heavy.filter((v) => v.season.mean > 20);
    ok(heavyPos.length <= 1,
      `${f}: thyngstu vogirnar eru ekki jakvaedar (${heavyPos.length} af ${heavy.length})`);
  }
  ok(seen >= 1, `${seen} ahaettu-maelingar lesnar af diski`);
}

/* ============================================================
   START/SIT — MAELT ADUR EN THAD VAR TENGT
   ============================================================
   `weeklyProjection()` la OTENGT fra upphafi thvi husreglan segir ad
   omaeldur kodi fari ekki i loftid. Thad var ekki haegt ad maela fyrr
   en markadslinur per viku voru sottar aftur i timann.

   `startsit-lab.mjs` spurdi rettu spurninguna: ekki "er spain nakvaem"
   heldur BREYTIR HUN VALINU. Vikuleg spa sem radar ollum eins er
   einskis virdi i start/sit. Maelikvardinn er STIGIN sem lidid skoradi,
   og talan er HLUTFALL BILSINS upp i fullkomna vitneskju — hratt
   stiga-tal vaeri merkingarlaust, thvi megnid af bilinu er ovitanlegt.

   Falli thetta hefur einhver breytt maelingunni eda vikulega spain
   haett ad virka — og tha a hun ad fara UR vidmotinu aftur.        */
console.log("\nstart/sit");
{
  let seen = 0;
  for (const f of ["startsit_ppr", "startsit_standard"]) {
    const p = path.join(DATA, `${f}.json`);
    if (!existsSync(p)) continue;
    seen++;
    const j = JSON.parse(readFileSync(p, "utf8"));
    const T = j.totals;

    ok(T.verdict === "STENST",
      `${f}: stenst (${T.pctOfGapClosed}% af bilinu, t=${T.t})`);
    ok(T.positive >= T.years - 1,
      `${f}: ${T.positive}/${T.years} ar jakvaed`);
    ok(T.pointsPerLineup > 0,
      `${f}: +${T.pointsPerLineup} stig per uppstillingu (${T.pointsPerSeason} a timabili)`);

    /* MORKIN VERDA AD HALDA I HVERJU ARI: hendingu radid er ALLTAF
       verst og fullkomin vitneskja ALLTAF best. Bregdist thad er
       hermunin ekki ad maela thad sem hun heldur. */
    for (const y of j.seasons) {
      const s2 = j.perSeason[y];
      ok(s2.floor < s2.flat, `${f} ${y}: hending (${s2.floor}) er verst`);
      ok(s2.ceiling > s2.flat && s2.ceiling > s2.weekly,
        `${f} ${y}: fullkomin vitneskja (${s2.ceiling}) er best`);
    }

    /* VIKULEGA SPAIN MA TAPA EINSTOKU ARI — hun gerir thad (standard
       2019: 82,2 gegn 82,4). Ad krefjast thess ad hun vinni OLL ar
       vaeri strangari krafa en maelingin sjalf gerir, og profid faeri
       tha ad fullyrda meira en gognin segja. Krafan er ad ARAFJOLDINN
       PASSI VID ThAD SEM SKRAIN SEGIR. */
    const wonYears = j.seasons.filter((y) =>
      j.perSeason[y].weekly >= j.perSeason[y].flat).length;
    ok(wonYears === T.positive,
      `${f}: ${wonYears} ar thar sem vikuleg >= flat, og skrain segir ${T.positive}`);
  }
  ok(seen >= 1, `${seen} start/sit maelingar lesnar af diski`);
}

/* ============================================================
   FERSKLEIKI GEGN ADP — HUGMYNDIN VAR RETT, MERKID ER ThEGAR INNI
   ============================================================
   Spurningin: ADP er gomul, frettir og aefingabudir bera nyrri
   upplysingar, ma ekki nyta thad?

   STRUKTURINN STENST OG HANN ER LESINN, EKKI GISKADUR: `adp.json`
   segir 5.789 droft fra 4. til 11. agust — SJO DAGA MEDALTAL. Frett
   sem berst i dag er ~3,5 daga ad sla i gegn. Bilid er raunverulegt.

   MERKID SJALFT VAR PROFAD i theirri mynd sem ER bakprofanleg: fravik
   milli TVEGGJA ADP-heimilda (FFC gegn Sleeper), sem er stadgengill
   fyrir "onnur hlid markadarins veit eitthvad". Hrátt ber thad merki
   (r = 0,11 i PPR) — EN ThEGAR STJORNAD ER FYRIR ADP OG SPANA BER ThAD
   EKKERT: r = -0,025 (PPR) og +0,019 (standard). Spa Sleeper ber
   r = 0,47 til 0,67 gegn somu leif, fjorum til niu sinnum sterkari.

   Merkid var thvi ekki hafnad af thvi ad thad se ekki til, heldur af
   thvi ad ThAD ER ThEGAR I SPANNI SEM VID NOTUM.

   Beina utgafan — frettir og trending gegn utkomu — er OMAELANLEG enn:
   Sleeper geymir enga sogu og ESPN gefur adeins 50 nyjustu greinar.
   Vistun hofst 11.8.2026; hun gerir spurninguna svaranlega i oktober.
   Thess vegna er trending SYNT i vidmotinu en raedur engu.         */
console.log("\nferskleiki gegn ADP");
{
  const p = path.join(DATA, "adp.json");
  if (!existsSync(p)) {
    console.log("  (adp.json vantar — slepp)");
  } else {
    const A = JSON.parse(readFileSync(p, "utf8"));
    const set = (A.ffc || []).find((s) => s.scoring === "ppr");
    ok(set && set.from && set.to, "ADP-settid segir hvada glugga thad naer yfir");
    if (set && set.from && set.to) {
      const days = (new Date(set.to) - new Date(set.from)) / 864e5;
      ok(days >= 2,
        `ADP er medaltal yfir ${days} daga — thad ER gamalt, og thad er forsendan`);
    }

    /* Trending verdur ad vera a bordinu til ad vidmotid geti synt thad. */
    const P = JSON.parse(readFileSync(path.join(DATA, "players.json"), "utf8"));
    const withTrend = P.filter((x) => x.trendAdd != null && x.trendAdd > 0);
    ok(withTrend.length >= 20,
      `${withTrend.length} leikmenn bera trending-add`);

    /* KJARNINN: hluti theirra hefur ENGA ADP. Se su tala null er bilid
       horfid og spjaldid a ekkert erindi. */
    const unpriced = withTrend.slice()
      .sort((a, b) => b.trendAdd - a.trendAdd).slice(0, 40)
      .filter((x) => x.adpSleeper == null || x.adpSleeper >= 400).length;
    ok(unpriced > 0,
      `${unpriced} af 40 mest saektu hafa enga ADP — bilid sem spjaldid synir`);
  }
}

/* ============================================================
   BORD BESTU SPAMANNANNA — HAEFILEIKINN ER RAUNVERULEGUR,
   AVINNINGURINN ER ThAD EKKI
   ============================================================
   Tvennt var maelt i rod og thau segja EKKI thad sama:

   1. `expert-persistence.mjs`: rod serfraedinga FLYST. rho 0,370 yfir
      tiu arapor, NULL neikvaed, topp-10 i fyrra lendir i 34,5.
      hundradshluta i ar. Haefileiki er raunverulegur og maelanlegur.

   2. `sharp-lab.mjs`: bord theirra slaer samt EKKI markadinn.
        gegn ADP             +48,9 stig · 4/7 ar · t=1,42  (ekki marktaekt)
        gegn FLATRI samsteypu -32,8    · 2/7    · t=-1,81
        gegn A-Ranking       -116,1    · 3/7    · t=-1,42

   MIDJU-TALAN ER SU SEM SKIPTIR MALI OG HUN ER OVAENT: ad velja
   FIMMTAN BESTU gerir bordid VERRA en ad medaltala alla sextiu. Rodun
   theirra flyst — en samsteypa margra jafnar ut einstaklingsvillur
   betur en samsteypa faerri godra. Vitund fjoldans slaer haefileikann.

   VARNAGLI SEM MA EKKI FALLA UT: adeins 7 til 13 af 15 voldum attu
   bord hvert ar, svo skorpu-bordid medaltalar ~9 menn gegn ~60 i thvi
   flata. Hluti munarins gaeti verid URTAKSSTAERD fremur en val. Thad
   breytir ekki nidurstodunni gagnvart A-Ranking, sem er skyr.

   Valid var WALK-FORWARD: fyrir ar Y voru menn valdir ur arum < Y
   eingongu. Ad velja thá sem reyndust bestir yfir allt timabilid og
   herma sidan vaeri ad vita utkomuna fyrirfram.                    */
console.log("\nbord bestu spamannanna");
{
  const p = path.join(DATA, "sharp_ppr.json");
  if (!existsSync(p)) {
    console.log("  (sharp_ppr.json vantar — keyrdu scripts/sharp-lab.mjs)");
  } else {
    const S = JSON.parse(readFileSync(p, "utf8"));
    ok(S.seasons.length >= 5, `${S.seasons.length} timabil hermd`);
    ok(S.K >= 10 && S.K <= 20, `K=${S.K} — innan thess bils sem maeldist sterkast`);

    /* Kjarninn: thad SLAER EKKI A-Ranking. Snuist thad vid a ad
       endurskoda hvort skorpu-bordid eigi ad rada. */
    ok(!S.vsArank.significant || S.vsArank.mean < 0,
      `slaer ekki A-Ranking (${S.vsArank.mean} stig, ${S.vsArank.wins}/${S.vsArank.years})`);

    /* Og valid baetir ekki flotu samsteypuna — thad er nidurstadan sem
       kom a ovart og hun a ad standa thangad til hun er endurmæld. */
    ok(S.vsFlat == null || S.vsFlat.mean < 20,
      `vegid bord baetir ekki flata samsteypu (${S.vsFlat ? S.vsFlat.mean : "—"})`);

    /* Urtaksstaerdin verdur ad vera synileg — hun er varnaglinn. */
    const withBoard = Object.values(S.selection || {}).map((v) => v.withBoard);
    ok(withBoard.length > 0 && Math.min(...withBoard) >= 4,
      `hvert ar byggir a minnst ${withBoard.length ? Math.min(...withBoard) : 0} bordum`);
  }
}

/* ============================================================
   SAMHLJODA OSAETTI VID ADP — MERKID ER RAUNVERULEGT, ROD ER THAD EKKI
   ============================================================
   Thetta er hardasta profid i thessari skra thvi thad ver TVAER
   ANDSTAEDAR nidurstodur i einu, og freistingin er ad muna adra en
   ekki hina:

     (a) HLUTFYLGNIN ER JAKVAED I OLLUM ARUM. Vik skorpu-mannanna fra
         ADP ber merki ofan a okkar EIGID vik. Falli thad ver profid
         ad einhver hafi thagad merkid nidur.
     (b) OG SAMT TAPADI THAD I DROTT-HERMUN. Baedi blandan og markvissa
         hopa-reglan. Falli THAD ver profid ad einhver hafi vírad
         thessu inn i rodina og kallad thad maelt.

   Fylgni er ekki akvordun. Thad er sama lexia og `aron/verd` i
   FPL-verkefninu, og hun a ad kosta prof ef hun gleymist. */
console.log("\nsamhljoda osaetti vid ADP");
{
  const p = path.join(DATA, "measure", "disagree_ppr.json");
  if (!existsSync(p)) {
    console.log("  (disagree_ppr.json vantar — keyrdu scripts/disagree-lab.mjs)");
  } else {
    const D = JSON.parse(readFileSync(p, "utf8"));
    const ys = Object.keys(D.perYear);
    ok(ys.length >= 5, `${ys.length} timabil maeld`);

    const part = ys.map((y) => D.perYear[y].rPartial).filter((x) => x != null);
    ok(part.length === ys.length && part.every((x) => x > 0),
      `hluta-fylgni jakvaed i ollum ${part.length} arum (min ${Math.min(...part)})`);

    /* Urtakid verdur ad vera synilegt her lika — hluta-fylgni reiknud
       ur 20 monnum vaeri tala an innihalds. */
    const ranked = ys.map((y) => D.perYear[y].ranked);
    ok(Math.min(...ranked) >= 100,
      `faest ${Math.min(...ranked)} radadir leikmenn a ari`);

    /* OG AKVORDUNIN. `blendGain`/`groupGain` eru t-tolur walk-forward
       hagnadar gegn hreinu A-Ranking. Faeru thaer yfir throskuldinn
       (2,9 med tveimur tilraunum) vaeri thetta ordid rod, ekki
       samhengi — og THA a thetta prof ad falla svo einhver taki
       akvordunina med opnum augum. */
    const bg = D.summary.blendGain, gg = D.summary.groupGain;
    ok(bg == null || bg < 2.9,
      `blanda vid A-Ranking baetir ekki drottid (t=${bg})`);
    /* `groupGain` er null thegar hopa-reglan velur P=0 i hverju ari —
       thad er RETTA nidurstadan (engin refsing bætti fyrri ar) en
       `null < 2.9` er fullyrding sem getur ekki brugdist. Thess vegna
       er lika fullyrt um hagnadinn sjalfan, sem er alltaf tala. */
    const pg = (D.walkForwardGroups || []).map((r) => r.gain);
    ok(gg == null || gg < 2.9, `hopa-reglan: t=${gg}`);
    ok(pg.length >= 5 && pg.reduce((a, b) => a + b, 0) / pg.length <= 0,
      `hopa-reglan baetir ekki drottid (medaltal ${pg.length ? (pg.reduce((a, b) => a + b, 0) / pg.length).toFixed(1) : "—"})`);

    /* Og dalkurinn ma ekki fara i rodina — profad a KODANUM, thvi
       maelingin ein stodvar engan. `aRank` er reiknud ur `vbd`; se
       `sharpDelta` eda `sharpRank` komid thangad inn er thetta ordin
       rod og profid a ad segja thad. */
    const build = readFileSync(path.join(DATA, "..", "src", "build.js"), "utf8");
    /* Akkerid er KODI (`RANKED_POS`), ekki ordid "aRank" — thad kemur
       fyrst fyrir inni i athugasemd og fullyrding sem athugasemd getur
       uppfyllt er einskis virdi. */
    const a0 = build.indexOf("const RANKED_POS");
    ok(a0 > 0, "fann A-Ranking-utreikninginn i build.js");
    const arankBlock = build.slice(a0, build.indexOf("ourRank", a0) + 200);
    ok(!/sharp/i.test(arankBlock),
      "sharpDelta er hvergi i A-Ranking-utreikningnum");
  }
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
