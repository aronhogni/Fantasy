/* ============================================================
   usageblend.js — NOTKUN THAD SEM ER LIDID AF TIMABILINU. HREIN.

   Ekkert React, ekkert `fetch`, engin `import` onnur en engin. Tekur
   vid viku-rodum (`data/weekly/{season}.json` gegnum `D.loadWeekly`) og
   skilar (a) notkun-til-thessa an leka, (b) VOGINNI a hana, og (c)
   blondudu arstidar-spanni thegar vorpunin er til.

   ============================================================
   HVERS VEGNA HUN ER TIL
   ============================================================
   `weekview.js` byggir a arstidar-spa deildri a 17 og notar EKKERT af
   thvi sem hefur gerst i thessu timabili. `usage-lab.mjs` maeldi hvad
   thad kostar (`data/measure/usage.json`, 12.8.2026, 2.342 arm x 7
   timabil): notkun-til-thessa lokar allt ad threfalt staerri hluta af
   bilinu milli "spa/17" og fullkominnar vitneskju.

   Sigurvegarinn er `opp_prior` — **HLAUP + SENDINGAR** (`car + tgt`),
   varpad i stig gegnum fitt a FYRRI timabilum. THAD ER MAGN
   TAEKIFAERA, ekki hlutdeild: `tshare` og `wopr` maelast VERRI (besta
   holf per breytu: opp_prior +6,40/+8,64/+7,09 a moti tshare_prior
   +3,05/+4,13/+4,97 og wopr_prior +1,55/+4,42/+4,48). Thessi akvordun
   er vardud i `tests/usageblend.mjs` og henni ma ekki vikja an
   maelingar.

   ============================================================
   THRJU ATRIDI SEM MEGA EKKI GLEYMAST VID LESTUR
   ============================================================
   1. FERILLINN ER NIDURSTADAN, EKKI TALAN — OG THETTA ATRIDI BAR
      FJORDA AFRITID AF RANGRI TOLU (leidrett 14.8.2026, sja `CURVE`).
      Her stod "i w1-4 maelist EKKERT og krofug blondun THAR er
      SKADLEG — `const0.5` tapar 3,9-8,1 pp og `const0` 11-20 pp".
      A SENDA ARMINU (`opp_prior · last3`, gegn VIDMIDINU) er hvorugt
      alveg rett:
        · sendi ferillinn (`bayes10`) i w1-4:  +0,8 (t 0,62) /
          +5,1 (t 2,34) / +1,8 (t 1,37) — MARKTAEKT JAKVAETT i half,
          svo "maelist EKKERT" er ekki rett um oll thrju snidin;
        · `const0.5` i w1-4:  -3,9 (t -1,1) / +2,0 (t 0,3) /
          +4,2 (t 1,3) — tap ADEINS i ppr og hvergi marktaekt, svo
          "SKADLEG" stendur ekki;
        · `const0` (spain hent) tapar 11,4-19,7 pp og THAD stendur —
          thess vegna a VOGIN sjalf rett a ser.
      DAUDA SVIDID (`DEAD_GAMES = 4`) er thvi EKKI stutt af maelingu
      sem gagnleg adgerd; thad er VAL innan bands og gognin benda
      helst gegn thvi. Sja `CURVE.deadBasis` — thar er thad skrifad
      berum ordum i stad thess ad vera rokstutt med tolu sem var
      tekin ur odru armi.
   2. VORPUNIN opp -> STIG ER **EKKI** I `usage.json`. Skran ber
      samantektir (delta, t, vikmork, ferla) en ENGA fitt-stika. Thess
      vegna tekur `blendedSeasonProj` vid `toDatePerGame` — thegar
      hana vantar skilar hun `null`, ALDREI spanni thegjandi og aldrei
      `usage.ppg` i stadinn (thad vaeri annad arm, `ptsPG`, sem var
      maelt SERSTAKLEGA og er lakara: +1,71/+1,72/+2,08 undir `opp`).
      Sja `USAGE_BLEND.mapping`.
   3. `usageToDate` MA EKKI SJA VIKUNA SEM ER SPAD. `throughWeek` er
      UTILOKANDI. Thad er haettulegasti lekinn i verkefninu: leikur i
      viku w i "notkun til thessa" fyrir viku w gefur arm sem litur ut
      eins og spa en er orakel. `usage-lab` byggir toluna sina a
      `kAt[w]` = fjoldi leikja med viku < w, og thetta er sama regla.
   ============================================================ */

/* ============================================================
   MAELDA TAFLAN — BOKUD, OG PROFID BER HANA VID DISKINN
   ============================================================
   Tolurnar bua i `data/measure/usage.json` en eru bakadar hingad af
   somu astaedu og `WEEKLY_MEASURED` i `weekview.js` og `HALF_LAB` i
   `rulebasis.js`: vidmotid les thaer i hverri teikningu og ny gagnaskra
   i lestrarleidinni tharf sina eigin throlni-vord. `tests/usageblend.mjs`
   ber toffluna vid skrana a diski og FELLUR ef hun rekur — svo hun
   getur ekki ordid urelt i thogn. Endurkeyrsla labsins sem breytir
   tolunum fellir profid; tha uppfaerir madur TOFLUNA, ekki profid.

   INCUMBENT-TALAN ER EKKI HER. Hun byr i `weekview.WEEKLY_MEASURED`
   (5,831 / 3,199 / 2,967) og tvo afrit af somu tolu i tveimur skram
   er hvernig toflur reka i sundur. Profid ber `pct` her vid labid, og
   labid ber incumbent-inn — thau maetast a diski, ekki i koda.        */

/** Sa tilraunar-reitur sem thessi eining IMPLEMENTERAR. */
const ARM = {
  variable: "opp_prior",
  window: "last3",
  curve: "bayes10",
  cell: "opp_prior · last3 · bayes10",
  metric: "opp = car + tgt (mean per game over the window)",
  source: "data/measure/usage.json · usage-lab.mjs · 2026-08-12T20:31Z",
};

/* ============================================================
   HVERS VEGNA EITT HOLF FYRIR OLL THRJU SNIDIN
   ============================================================
   Besta holfid er EKKI thad sama i ollum snidum:

     ppr       opp_prior · last3 · bayes10   +6,399
     half      opp_prior · jump  · const0.5  +8,642
     standard  opp_prior · last3 · const0.5  +7,094

   Ad senda thrjar olikar reglur vaeri ad velja sigurvegara ur 52 holfum
   thrisvar — nakvaemlega thad sem placebo-thakid i labinu er til ad
   vara vid (havadi naer +2,03/+3,93/+4,40 gegnum sama net). THAD er
   rokid fyrir EINU holfi og thad stendur eitt og ohaggad.

   HER STOD ANNAD ROK OFAN A THAD OG THAD VAR AFTURKALLAD 14.8.2026:
   "OG BADIR `const0.5`-reitirnir eru DAEMDIR UR LEIK af atridi 1 her
   ofar: fost 50% vog tapar i vikum 1-4." Su fullyrding var `ptsPG`-tala
   (sja `CURVE.deadBasis`): a senda arminu tapar `const0.5` i w1-4
   ADEINS i ppr (-3,93, t -1,14) og er JAKVAED i half (+2,04) og
   standard (+4,16). `const0.5` er thvi EKKI daemd ur leik af nokkurri
   maelingu — hun er einfaldlega ekki holfid sem var valid, og
   fjolsamanburdar-rokid stendur thvi EITT undir akvordunni.

   THETTA ER FIMMTA AFRITID af somu afturkolludu tolu i thessari skra
   og thad var EKKI i listanum sem var tilkynntur. Thess vegna skannar
   `usageblend.mjs` kafli 9 nu HRAAN SKRARTEXTA og ekki adeins
   `deadBasis` — afrit i athugasemd er jafn skadlegt og afrit i svidi.

   `last3 · bayes10` er thvi valid sem EITT holf, og thad er maelt
   jakvaett i OLLUM THREMUR med timabila-bootstrap sem UTILOKAR NULL:

     ppr       +6,399  t 2,561  5/6  [1,63 · 10,53]
     half      +7,134  t 3,298  5/6  [3,09 · 10,37]
     standard  +4,747  t 2,130  5/6  [0,95 ·  8,96]

   THAD KOSTAR OG KOSTNADURINN ER SKRADUR: half tapar 1,51 pp og
   standard 2,35 pp a moti sinu eigin besta holfi, og i standard er
   `tshare_prior` NAFNBOTARLEGA 0,07 pp ofar i THESSU holfi
   (+4,815 a moti +4,747) thott `opp` vinni med 0,15 pp thegar hvor
   breyta faer sitt besta holf. Su tala er innan havada og hun snyr
   EKKI akvordunni um magn a moti hlutdeild — en hun a ad standa her,
   ekki i minninu a theim sem las skrana.                             */

/** Reitur `opp_prior · last3 · bayes10` — THAD SEM ER SENT. */
const SHIPPED = {
  ppr: {
    pct: 12.249, delta: 6.399, t: 2.561, years: 6, wins: 5,
    seasonBootstrap: [1.629, 10.526], seasonBootstrapExcludesZero: true,
    beatsPlaceboCeiling: true, beatsScaledPlaceboCeiling: true,
    bins: { "w1-4": { delta: 0.835, t: 0.624, wins: 4 },
            "w5-9": { delta: 2.025, t: 0.354, wins: 4 },
            "w10-18": { delta: 12.281, t: 4.211, wins: 6 } },
    measured: true,
    note: "opp_prior · last3 · bayes10 closes 12.249% of the gap in PPR " +
      "(+6.399 pp over the weekly model, t = 2.561, positive in 5 of 6 seasons, " +
      "season bootstrap [1.63, 10.53]) and it clears the placebo ceiling (+2.034 pp, t 2.076).",
  },
  "half-ppr": {
    pct: 9.241, delta: 7.134, t: 3.298, years: 6, wins: 5,
    seasonBootstrap: [3.09, 10.368], seasonBootstrapExcludesZero: true,
    /* FELLUR A PLACEBO-THAKINU I HALF og thad er ekki smaatridi:
       thakid thar er t = 3,611 (haesta EINHLIDA t sem akvedinn
       havadi naer gegnum sama net) og thetta holf hefur t = 3,298.
       Deltan sjalf (7,134) er yfir delta-thakinu (3,928) og
       kvarda-samstillta thakid (1,36) er slegid — svo thetta er
       "liklega raunverulegt merki sem naer ekki throskuldinum",
       ekki "havadi". Vidmotid ma EKKI birta half sem jafn-sannad
       og ppr. */
    beatsPlaceboCeiling: false, beatsScaledPlaceboCeiling: true,
    bins: { "w1-4": { delta: 5.125, t: 2.34, wins: 5 },
            "w5-9": { delta: 2.968, t: 0.962, wins: 4 },
            "w10-18": { delta: 10.182, t: 3.759, wins: 5 } },
    measured: true,
    note: "In half-PPR the same rule closes 9.241% (+7.134 pp, t = 3.298, 5 of 6 seasons) " +
      "but it does NOT clear the full placebo ceiling (t threshold 3.611) — " +
      "treat it as measured, not as proven.",
  },
  standard: {
    pct: 8.414, delta: 4.747, t: 2.13, years: 6, wins: 5,
    seasonBootstrap: [0.945, 8.958], seasonBootstrapExcludesZero: true,
    /* Sama saga: thakid i standard er t = 2,302 og thetta holf er
       2,130. Besta holf standard (`last3 · const0.5`, t 2,742) SLAER
       thakid.

       HER STOD "— en thad er `const0.5`, sem er daemt ur leik" og THAD
       VAR AFTURKALLAD 14.8.2026 (sjotta afritid af somu tolu). Ekkert
       daemir `const0.5` ur leik: i standard er hun +4,16 pp i w1-4, sem
       er BETRA en sendi ferillinn (+1,81). Rett lesning er ohagstaedari
       fyrir okkur og hun a ad standa: i STANDARD er sendi reiturinn
       maelanlega lakari en toppholfid (4,747 a moti 7,094) og naer ekki
       placebo-thakinu, medan toppholfid naer thvi. Vid sendum hann samt,
       og astaedan er FJOLSAMANBURDUR — eitt holf fyrir oll snid — ekki
       galli i `const0.5`. Sja blokkina "HVERS VEGNA EITT HOLF". */
    beatsPlaceboCeiling: false, beatsScaledPlaceboCeiling: true,
    bins: { "w1-4": { delta: 1.807, t: 1.372, wins: 4 },
            "w5-9": { delta: 2.35, t: 0.44, wins: 3 },
            "w10-18": { delta: 9.032, t: 3.111, wins: 6 } },
    measured: true,
    note: "In standard the same rule closes 8.414% (+4.747 pp, t = 2.130, 5 of 6 seasons) " +
      "but it does NOT clear the full placebo ceiling (t threshold 2.302) — " +
      "treat it as measured, not as proven.",
  },
};

/** Besta holfid per snid — TALAN SEM README BIRTIR. Ekki thad sem er sent. */
const HEADLINE = {
  ppr: { cell: "opp_prior · last3 · bayes10", pct: 12.249, delta: 6.399, t: 2.561,
    years: 6, wins: 5, playerBootstrap: [2.538, 8.49], sameAsShipped: true },
  "half-ppr": { cell: "opp_prior · jump · const0.5", pct: 10.749, delta: 8.642, t: 2.261,
    years: 6, wins: 5, playerBootstrap: [0.612, 7.863], sameAsShipped: false },
  standard: { cell: "opp_prior · last3 · const0.5", pct: 10.761, delta: 7.094, t: 2.742,
    years: 6, wins: 6, playerBootstrap: [0.599, 8.037], sameAsShipped: false },
};

/** Placebo-thakid per snid — hve gott getur AKVEDINN HAVADI litid ut. */
const PLACEBO_CEILING = {
  ppr: { delta: 2.034, t: 2.076, scaledOnlyDelta: -1.012 },
  "half-ppr": { delta: 3.928, t: 3.611, scaledOnlyDelta: 1.36 },
  standard: { delta: 4.399, t: 2.302, scaledOnlyDelta: 1.251 },
};

/* ============================================================
   FERILLINN
   ============================================================
   `bayes10` i labinu er vog a SPANNA: `wProj(k) = 10 / (10 + k)`, thar
   sem `k` = fjoldi leikja med viku < w. Vogin a TIMABILID er thvi
   `1 - wProj = k / (10 + k)`. `K = 10` er MAELT: `bayes10` er
   sigur-ferillinn i ppr og fyrir `opp_prior · last3` er hun besti
   bayes-ferillinn i ollum thremur snidum.

   DAUDA SVIDID (`DEAD_GAMES = 4`) ER VALID, EKKI MAELT — og eftir
   thrjar tilraunir til ad boka rokin fyrir thvi er nidurstadan ad
   MAELINGIN STYDUR THAD EKKI. Thad er skrifad her, ekki fjarlaegt:

     ============================================================
     THRIDJA VILLAN A SOMU FULLYRDINGU — LEIDRETT 14.8.2026
     ============================================================
     Fullyrdingin "krofug blondun i w1-4 er SKADLEG" hefur nu verid
     bokud thrisvar og verid rong thrisvar:

       1. UPPHAFLEGA: "`const0.5` tapar 3,9-8,1 pp og `const0`
          11,4-20,1 pp" — an slodar og an armis.
       2. "LEIDRETTINGIN" 13.8.: fljutt yfir i
          `grid.ptsPG.last3.<ferill>.bins["w1-4"]` og bokad
          `const0.5` -9,35/-4,64/-4,80 og `const0`
          -25,56/-21,05/-23,33. Slodin var loks skrifud nidur — en
          hun benti a `ptsPG`, sem er ANNAD ARM. Sent er `opp_prior`
          (`ARM.variable`). Talan var thvi RETT LESIN ur RANGRI TOFLU:
          nakvaemlega sama villa sem threpi ofar hafdi verid skjolud
          sama dag, gerd i sjalfri skjoluninni.
       3. HER (14.8.): re-akkerad a SENDA ARMID.

     A SENDA ARMINU (`opp_prior · last3`), `.bins["w1-4"]`, i pp gegn
     VIDMIDINU:

       snid      bayes10 (sent)     const0,5            const0
       ppr        +0,84 (t 0,62)    -3,93 (t -1,14)   -19,70 (t -5,37)
       half       +5,13 (t 2,34)    +2,04 (t  0,34)   -11,41 (t -1,29)
       standard   +1,81 (t 1,37)    +4,16 (t  1,26)   -13,51 (t -2,39)

     TVAER NIDURSTODUR SEM SNUA ROKUNUM VID:

     (a) "`const0.5` er SKADLEG i w1-4" ER OSONN a senda arminu. Hun
         tapar ADEINS i ppr (-3,93) og thar ekki marktaekt (t -1,14);
         i half og standard er hun JAKVAED. Bokada bilid "-4,6 til
         -9,4" var `ptsPG`-tala og lysir engu holfi sem vid sendum.
         `const0` tapar hins vegar 11,4-19,7 pp og er marktaekt i
         ppr og standard — svo VOGIN sjalf a rett a ser. Thad var
         alltaf hid rettmaeta rok og thad stendur oskert.

     (b) VIDSNUNINGURINN SEINT A TIMABILINU VAR MAELIKVARDA-VILLA,
         EKKI MERKI. Hér stod ad `const0.5` "SLAER bayes-ferilinn" i
         `w10-18` i ollum thremur snidum, byggt a +7,96/+8,21/+6,02.
         Thaer tolur eru POSITIFAR GEGN VIDMIDINU — sem er ekki thad
         sama og ad slá `bayes10`. `bins[...].delta` er skilgreint i
         `usage-lab.mjs` (~lina 1290) sem `arm - INCUMBENT` per ari,
         og vidmidid er `weeklyProjection` (spa/17), EKKI sendi
         ferillinn. Ad bera einn positifan delta vid null svarar
         "slaer hun spana?", ekki "slaer hun okkar ferl?".
         Rett samanburdur dregur toluna fra tolu senda ferilsins:

           w10-18, `const0.5` - `bayes10`   ppr -0,95 · half -0,49 · standard +1,49
           w1-4,   `const0.5` - `bayes10`   ppr -4,77 · half -3,09 · standard +2,35

         `const0.5` SLAER thvi senda ferilinn ADEINS i standard, og
         ekki i ppr ne half. "Merkid snyst vid i ollum thremur" var
         aldrei satt — ekki heldur a `ptsPG`, thar sem sama fradrattur
         gefur +0,94 / -0,21 / +1,64 (tvo af thremur).
         ATH: thessi fradrattur er PUNKTMAT. Bootstrap-id i skranni er
         arm-gegn-vidmidi, ekki arm-gegn-armi, svo ENGIN vikmork eda
         t-gildi eru til fyrir muninn og hann ma ekki bokast marktaekur.

     HVAD ÞETTA GERIR VID `DEAD_GAMES = 4`:

     Daudasvidid setur `w = 0` fyrir `k <= 4`. Vikubilid `w1-4` hefur
     `k = 0..3` (`kAt[w]` = leikir med viku < w), svo daudasvidid
     nullar UT NAKVAEMLEGA thad bil — appid endurtekur vidmidid i
     vikum 1-5. Talan sem svidid FLEYGIR er thvi w1-4-delta senda
     ferilsins sjalfs: **+0,84 / +5,13 / +1,81**, og i half er hun
     MARKTAEKT JAKVAED (t 2,34) — eina marktaeka holfid i bilinu.
     `bayes10` i labinu ER `10/(10+k)` an daudasvids (`CURVES` i
     `usage-lab.mjs`), svo sendi ferillinn er EKKI maeldi ferillinn;
     svidid er omaeld vidbot ofan a hann.

     Rokin sem eftir stoda eru thvi: (i) laesileiki/varkarni — vog a
     tvo leiki er hávaði sem notandinn a erfitt med ad rettlaeta, og
     (ii) `const0` tapar stort, svo einhver form-hemill a vera. Hvorugt
     er MAELING a ad `DEAD_GAMES = 4` bæti spána. Þess vegna stendur
     `deadMeasured: false` — og nu af RETTRI astaedu: ekki "val innan
     jafnteflis-bands" heldur "val sem gognin benda helst GEGN".

     TILLAGA, EKKI BREYTING: `DEAD_GAMES = 0` (eda 2) er thad sem
     thessi tafla stydur, og half-PPR er holfid sem borgar fyrir 4.
     Talan er EKKI breytt her — sendi ferillinn med daudasvidi var
     aldrei i netinu, svo bæði 4 og 0 thurfa MAELINGU (nyr ferill i
     `usage-lab.mjs`) adur en vogin er hreyfd. Ad skipta ur omaeldri
     4 i omaelda 0 vaeri sama tegund af akvordun, i adra att.

     HVERS VEGNA THETTA LIFDI THRJAR UMFERDIR: engin fullyrding las
     tolurnar. Thaer voru rokstudningur i athugasemd — thad eina i
     thessu repo-i sem ekkert prof getur fellt — og thegar prof var
     loks skrifad (kafli 9) las thad SLODINA SEM VAR BOKUD, sem var
     `ptsPG`. Prof sem sannreynir bokada tolu gegn diski en tekur
     ARMID sem gefid getur ekki sed thessa villu. Thess vegna ber
     `deadClaim` nu `variable` og profid flettir upp EFTIR THVI SVIDI,
     og kafli 9 skannar `JSON.stringify(USAGE_BLEND)` OG hraan
     skrartexta — thvi tvo afritin sem lifdu (haus skrarinnar og
     `rejected.constantWeight`) voru bædi utan `deadBasis`.

   Vogin er thvi `w(k) = kEff / (K + kEff)`, `kEff = max(0, k - 4)`:

     k    0-4     5      6      7      8     10     13     17
     w    0    0,091  0,167  0,231  0,286  0,375  0,474  0,565

   Einraen, bundin vid [0, 1), og NUL fram ad 5 leikjum — sem er thad
   sem "naestum engin vog fyrr en ~6 leikir eru komnir" tydir i tolum.  */
/* Lab-lyklarnir i theirri rod sem ollum trioum i thessari skra er
   skrifad i. `LAB_KEY` her nidri vorpar app-lyklum a thessa. */
const DEAD_FMT = ["ppr", "half", "standard"];

/* Tala med formerki, einn aukastafur. TRIO ER DREGID UT UR BOKUDU
   TOFLUNNI, ALDREI AFRITAD I TEXTA: sex afrit af somu afturkolludu tolu
   (haus, tvaer athugasemdir, `deadBasis`, `USAGE_BLEND.note`,
   `rejected.constantWeight`) lifdu tvaer "leidrettingar" af thvi hvert
   afrit var sjalfstaedur strengur. Strengur sem er BYGGDUR ur toflunni
   getur ekki rekid fra henni.                                          */
const sgn1 = (v) => `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(1)}`;
const trioOf = (o) => DEAD_FMT.map((f) => sgn1(o[f])).join("/");

/* App-lyklarnir i SOMU ROD og `DEAD_FMT`, svo `SHIPPED` (app-lyklar) og
   bokada taflan (lab-lyklar) megi maetast an annarrar vorpunar-toflu. */
const DEAD_FMT_APP = ["ppr", "half-ppr", "standard"];

/* `arm - sendi ferillinn` per snid, REIKNAD.
   Bokada taflan ber `arm - VIDMID` (thad er thad sem `bins[].delta` er),
   svo samanburdur vid senda ferilinn ER FRADRATTUR og ma ekki lesast af
   formerki einu — thad var maelikvarda-villan sem bjo til "merkid snyst
   vid seint". Talan er reiknud her og ALDREI skrifud i texta.          */
const sgn2 = (v) => `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(2)}`;
const diffTrio = (booked, bin) => DEAD_FMT
  .map((f, i) => sgn2(booked[f] - SHIPPED[DEAD_FMT_APP[i]].bins[bin].delta))
  .join(" / ");

/* ============================================================
   ROKSTUDNINGURINN FYRIR `DEAD_GAMES`, RE-AKKERADUR A SENDA ARMID
   ============================================================
   `variable` ER NYTT SVID OG THAD ER ATRIDID. Fyrri utgafa bar
   `source`, `bin`, `window` og `against` — en EKKI breytuna, svo
   profid las `grid.ptsPG[...]` (harkodad i profinu) og gat ekki sed
   ad bokunin var akkerud a ANNAD ARM en thad sem er sent. Nu flettir
   profid upp eftir `variable` LIKA, svo bokun a rangt arm fellur.

   `against` ER LIKA LEIDRETT. Hun sagdi "bayes10 (the shipped curve)"
   og thad var ROG: `bins[...].delta` er `arm - INCUMBENT` (sja
   `usage-lab.mjs` ~1290), thar sem incumbent er `weeklyProjection`
   (spa/17). Ad lesa positifa tolu sem "slaer senda ferilinn" var
   maelikvarda-villan sem bjo til "merkid snyst vid seint" — sja
   athugasemdina ofar.                                                 */
const DEAD_CLAIM = {
  /* SLODIN I HEILD MED BREYTUNNI. Slod an breytu er ekki slod. */
  source: 'data/measure/usage.json -> results.<scoring>.grid.opp_prior.last3' +
          '.<curve>.bins["w1-4"].{delta,t}',
  variable: "opp_prior",
  window: "last3",
  bin: "w1-4",
  lateBin: "w10-18",
  shippedCurve: "bayes10",
  against: "the incumbent (weeklyProjection = season projection / 17). NOT bayes10: " +
    "bins[].delta is arm minus incumbent, so a positive value means 'beats the " +
    "projection', not 'beats our curve'.",

  /* --- w1-4, delta gegn vidmidinu, i pp --- */
  const05: { ppr: -3.934, half: 2.037, standard: 4.156 },
  const05T: { ppr: -1.139, half: 0.345, standard: 1.259 },
  const0: { ppr: -19.696, half: -11.409, standard: -13.514 },
  const0T: { ppr: -5.374, half: -1.295, standard: -2.385 },

  /* --- w10-18, delta gegn vidmidinu, i pp --- */
  const05Late: { ppr: 11.329, half: 9.695, standard: 10.522 },
  const05LateT: { ppr: 3.81, half: 3.735, standard: 3.89 },

  /* SENDI FERILLINN SJALFUR ER EKKI BOKADUR HER — hann er thegar i
     `SHIPPED[snid].bins` og profid les hann THADAN. Sjounda afritid af
     somu tolu vaeri nakvaemlega sjukdomurinn sem thetta commit laeknar. */

  /* --- ALYKTANIRNAR, OG THAER FYLGJA TOLUNUM ---
     Flogg fyrir `const0.5 - bayes10` i badum bilum. Tolurnar sjalfar eru
     REIKNADAR (`diffTrio`) og eru thvi ekki skrifadar hér — sjounda
     afritid vaeri sami sjukdomur. THAU ERU PUNKTMOT: bootstrap-id i
     skranni er arm-gegn-VIDMIDI, svo ENGIN vikmork eru til fyrir muninn
     a tveimur armum og hann ma ekki bokast marktaekur.                  */
  beatsShippedCurveEarly: { ppr: false, half: false, standard: true },
  beatsShippedCurveLate: { ppr: false, half: false, standard: true },
  armDiffHasNoInterval: true,

  /* BADAR THESSAR VORU `true` OG BADAR VORU RANGAR. */
  constantBlendingHurtsEarly: false,
  constantBlendingHelpsLate: false,

  /* THAD SEM DAUDA SVIDID FLEYGIR: w1-4-delta senda ferilsins sjalfs.
     `w1-4` hefur `k = 0..3`, svo `kEff = max(0, k-4) = 0` yfir allt
     bilid — appid endurtekur vidmidid i vikum 1-5. Talan er lesin ur
     `SHIPPED[...].bins["w1-4"]` af profinu, ekki bokud aftur her. */
  deadZoneDiscardsShippedGain: true,
  deadZoneDiscardsSignificantGain: "half-ppr",
  evidenceSupportsDeadZone: false,
  recommendation: "DEAD_GAMES = 0 (or 2) is what this table supports; 4 is not. " +
    "NOT CHANGED HERE: the shipped curve WITH a dead zone was never in the grid " +
    "(usage-lab's bayes10 is 10/(10+k), no dead zone), so both 4 and 0 are " +
    "unmeasured. Swapping one unmeasured number for another is the same kind of " +
    "decision in the other direction; it needs a new curve in usage-lab.mjs first.",
};

const CURVE = {
  form: "w(k) = kEff / (K + kEff), kEff = max(0, k - DEAD_GAMES)",
  K: 10,
  DEAD_GAMES: 4,
  KMeasured: true,
  KBasis: "bayes10 = 10/(10+k) is the winning curve in usage.json (ppr) and the best " +
    "bayes curve for opp_prior · last3 in all three formats",

  /* `false` STENDUR — EN AF ANNARRI ASTAEDU EN ADUR.
     Fram til 14.8.2026 stod her ad svidid saeti "inni i maeldu
     jafnteflis-bandi", rokstutt med `ptsPG`-tolum. A senda arminu er
     lesningin ohagstaedari: bilid sem svidid nullar UT ber MARKTAEKT
     JAKVAETT merki i half-PPR (+5,13, t 2,34). `false` er thvi ekki
     "val innan jafnteflis" heldur "val sem maelingin stydur EKKI".
     Ad setja thetta i `true` vaeri versta utkoman i thessu repo-i. */
  deadMeasured: false,

  /* TEXTINN ER BYGGDUR UR `DEAD_CLAIM`, EKKI SKRIFADUR OFAN I HANA. */
  deadBasis:
    "upper edge of the w1-4 week bin. THE MEASUREMENT DOES NOT SUPPORT THIS ZONE " +
    "and that is recorded rather than papered over. On the SHIPPED arm " +
    `(${DEAD_CLAIM.variable} · ${DEAD_CLAIM.window}), vs the incumbent, in w1-4: ` +
    `const0.5 is ${trioOf(DEAD_CLAIM.const05)} pp ` +
    `(t ${trioOf(DEAD_CLAIM.const05T)}) — a loss in PPR only and significant nowhere, ` +
    "so constant blending is NOT harmful there. What IS measured is that const0 " +
    `loses ${trioOf(DEAD_CLAIM.const0)} pp (t ${trioOf(DEAD_CLAIM.const0T)}), ` +
    "so the weight itself belongs. THE LATE SIGN REVERSAL WAS A METRIC ERROR: " +
    "const0.5 is positive in w10-18 against the INCUMBENT, which is not the same as " +
    "beating bayes10 — subtracting the two gives " +
    `${diffTrio(DEAD_CLAIM.const05Late, DEAD_CLAIM.lateBin)}, so it beats ` +
    "the shipped curve in standard only (point estimate; the file carries no " +
    `interval for an arm-vs-arm difference; in w1-4 the same subtraction is ` +
    `${diffTrio(DEAD_CLAIM.const05, DEAD_CLAIM.bin)}). AND THE ZONE HAS A MEASURED COST: it ` +
    "zeroes the whole w1-4 bin (k = 0..3), discarding the shipped curve's own gain " +
    "there, which is significantly POSITIVE in half-PPR (t 2.34). DEAD_GAMES = 4 is " +
    "therefore a CHOICE the evidence leans against, kept only because the shipped " +
    "curve with a dead zone was never itself measured; see deadClaim.recommendation.",

  deadClaim: DEAD_CLAIM,
};

/**
 * ARSTIDIN ER 17 LEIKIR. Ekki maeld tala — thad er lengd
 * leikjaskrarinnar — en hun ER forsenda thess ad blondun a
 * arstidar-kvarda se sama adgerd og blondun a viku-kvarda:
 *   17 * (wProj*proj/17 + w*toDate) = wProj*proj + w*17*toDate.
 * `weekview.weekRows` deilir med somu tolu (`r.proj / 17`) og
 * `usage-lab` maeldi flata arminn sem `proj / 17`. Breytist hun a
 * einum stad tharf hun ad breytast a badum.
 */
export const GAMES_IN_SEASON = 17;

/** Gluggar sem VORU MAELDIR. Fleiri eru ekki i bodi. */
const WINDOW_N = { all: null, last3: 3, last5: 5 };

/** Stigagjafar-svid i viku-rodunum. Lykill appsins -> svid i `weekly/*.json`. */
const POINTS_FIELD = { ppr: "ppr", "half-ppr": "half", standard: "std" };

/** Lykill labsins per snid — profid ber tofluna vid skrana med thessu. */
const LAB_KEY = { ppr: "ppr", "half-ppr": "half", standard: "standard" };

/* Trio ur `SHIPPED[...].bins` fyrir eitt vikubil — DREGID UT, EKKI
   AFRITAD. `USAGE_BLEND.note` bar "+12,3/+12,1/+9,0" fyrir w10-18 og
   MIDJUTALAN VAR UR ODRU HOLFI: 12,142 er `opp_prior · jump · const0.5`
   (toppholf half i README-toflunni), ekki senda armid, sem gefur 10,182.
   Tvaer rettar tolur ur sitthvoru holfi, settar i somu rod, laesast eins
   og ein maeling. Nu er rodin BYGGD ur senda arminu og getur ekki
   blandast.                                                            */
const shippedBinTrio = (bin) =>
  Object.keys(LAB_KEY).map((f) => sgn1(SHIPPED[f].bins[bin].delta)).join("/");

export const USAGE_BLEND = {
  arm: ARM,
  shipped: SHIPPED,
  headline: HEADLINE,
  placeboCeiling: PLACEBO_CEILING,
  curve: CURVE,
  labKey: LAB_KEY,
  gamesInSeason: GAMES_IN_SEASON,
  measured: true,
  /* TRIOIN ERU BYGGD UR `SHIPPED[...].bins`, ekki skrifud. Baedi voru
     ROKID SEM ROKSTUDDI DAUDA SVIDID og bædi voru skekkt: w10-18-rodin
     blandadi tveimur holfum og "nothing in weeks 1-4" var osatt um half. */
  note: "Season-to-date opportunity (carries + targets) beats the season projection " +
    "from about week 6 on. Measured in usage.json (2.342 arms, 7 seasons); on the " +
    `shipped arm the gain is concentrated in weeks 10-18 (${shippedBinTrio("w10-18")} pp) ` +
    `and is small in weeks 1-4 (${shippedBinTrio("w1-4")} pp) — small, but NOT nothing: ` +
    "in half-PPR that early bin is significantly positive (t 2.34), and the dead zone " +
    "in the curve discards it. See curve.deadBasis.",

  /* ============================================================
     VORPUNIN — THAD SEM VANTAR, OG THAD BIDUR TENGINGARINNAR
     ============================================================
     `opp_prior` thydir: `est = a + b * z`, thar sem
       z = (opp i glugganum - mu) / sd  yfir THVERSNID stodunnar i
           theirri viku (adeins leikmenn med gogn), og
       (a, b) = OLS a FYRRI TIMABILUM af (z, stig i viku w).

     HVORUGT er i `usage.json`. Skran ber `deltaVsIncumbent`, `t`,
     vikmork og ferla — enga stika. `grep slope` i skranni gefur adeins
     placebo-MERKIMIDA ("own fitted slope"), engar tolur.

     Thess vegna BYR EKKI THESSI EINING TIL VORPUN. Tvaer leidir eru
     til og BADAR eru akvordun sem eg tek ekki her:

       (1) LATA LABID SKRIFA FITTID. `accFit(priorAcc, pos, met, win)`
           i `scripts/usage-lab.mjs` skilar `{a, b, n}` per
           (stada, maelikvardi, gluggi). Vaeri hun skrifud i
           `usage.json` fyrir `(pos, opp, last3)` — 4 stodur x 2 tolur —
           gaeti hun verid bokud her eins og allt annad og profid gaeti
           bori hana vid skrana. `mu`/`sd` verda samt ad vera reiknud
           i appinu; thau eru THVERSNID THESSARAR VIKU og geta ekki
           verid bokud.
       (2) SKIPTA UM ARM. `opp_self` notar THVERSNID YFIRSTANDANDI
           TIMABILS (vikur < w) i stad fyrri ara og tharf ENGA bokada
           stika — hvorki (a,b) ne mu/sd — thvi allt er reiknad ur
           theim vikum sem eru lidnar. Hun maelist +4,866 / +6,302 /
           +5,515 i thessu holfi (`last3 · bayes10`) a moti +6,399 /
           +7,134 / +4,747 fyrir `opp_prior`: LAKARI i ppr og half,
           BETRI i standard. Su leid krefst thess ad appid reikni OLS
           yfir hopinn i hverri viku — thad er kodi, ekki maeling.

     THANGAD TIL skilar `blendedSeasonProj` `null` nema kallandinn
     gefi `toDatePerGame` a STIGA-KVARDA. Thad er asett: tala sem er
     buin til ur engu og litur ut eins og maeling er versta utkoman.  */
  mapping: {
    available: false,
    needs: "prior-season OLS (a, b) per (position, opp, last3) plus the current week's " +
      "cross-sectional mu/sd for the position",
    inFile: false,
    why: "usage.json stores deltas, t values, intervals and curves — no fit parameters. " +
      "usage-lab.mjs computes them in accFit() and discards them.",
    routes: ["persist accFit(priorAcc, pos, opp, last3) from usage-lab.mjs",
             "switch the arm to opp_self, which needs no baked parameters " +
             "(+4.866/+6.302/+5.515 instead of +6.399/+7.134/+4.747)"],
  },

  /* MAELT OG HAFNAD — hlutdeild i stad magns. Besta holf per breytu:
     opp_prior +6,399/+8,642/+7,094 · tshare_prior +3,054/+4,126/+4,968 ·
     wopr_prior +1,548/+4,420/+4,484. Profid reiknar thetta UT UR
     skranni og fellur ef hlutdeild fer fram ur magni.               */
  rejected: {
    tshare: { bestDelta: { ppr: 3.054, "half-ppr": 4.126, standard: 4.968 } },
    wopr: { bestDelta: { ppr: 1.548, "half-ppr": 4.42, standard: 4.484 } },
    constantWeight: {
      /* THRIDJA AFRITID AF AFTURKOLLUDU BILUNUM og thad lifdi BADAR
         fyrri "leidrettingar" af thvi kafli 9 skannadi adeins
         `deadBasis`. Textinn er nu BYGGDUR ur `CURVE.deadClaim`, svo
         hann getur ekki rekid fra henni; profid skannar auk thess
         `JSON.stringify(USAGE_BLEND)` OG hraan skrartexta.

         OG ATHUGID HVAD LEIDRETTINGIN 13.8. GERDI: gamla `const0`-bilid
         "11,4-20,1" VAR RETT a senda arminu (-11,41 til -19,70). Thad var
         "leidrett" i 21,1-25,6 — `ptsPG`-bilid — og kallad "vanmat um
         naestum helming". Leidrettingin faerdi RETTA tolu i ranga. */
      note: "NOT withdrawn but RE-ANCHORED: a constant weight is not uniformly worse " +
        `than the shipped curve in weeks 1-4. On the shipped arm (${DEAD_CLAIM.variable} · ` +
        `${DEAD_CLAIM.window}, vs the incumbent) const0.5 is ${trioOf(DEAD_CLAIM.const05)} pp ` +
        `(t ${trioOf(DEAD_CLAIM.const05T)}) — a loss in PPR only, significant nowhere. ` +
        `What IS rejected is const0 (season-to-date only), which loses ` +
        `${trioOf(DEAD_CLAIM.const0)} pp (t ${trioOf(DEAD_CLAIM.const0T)}) and is ` +
        "significant in PPR and standard. That is the measured case for having a weight " +
        "at all; it is NOT a case for the dead zone. See curve.deadBasis.",
      const05RejectedEarly: false,
      const0RejectedEarly: true,
    },
    pointsPerGame: {
      note: "ptsPG (points per game so far) needs no mapping but is measured below opp: " +
        "usage minus points is +1.713/+1.716/+2.080 pp.",
      caveat: "None of those three differences excludes zero on its own " +
        "(t 0.962 / 0.756 / 2.158) — opp is ahead, not proven ahead.",
    },
  },
};

/* ============================================================
   HJALPARFOLL
   ============================================================ */

/**
 * Tala eda `null`. STRENGUR ER RUSL, EKKI TALA.
 *
 * `Number("5")` er 5 og freistingin er ad taka thad — en svid sem BER
 * streng i JSON-i sem a ad bera tolu er skemmt gagn, og ad umbreyta
 * thvi thegjandi er ad fela bilun i pipunni. `car: "abc"` verdur
 * `null`, ekki `NaN` og ekki 0.
 */
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Svid i rodinni: `null` = VANTAR (telst ekki med), `undefined` = RUSL
 * (rodin er slept fyrir thennan maelikvarda).
 *
 * Greinarmunurinn er naudsynlegur fyrir `opp`: labid telur rod med
 * `car: null, tgt: 3` sem `opp = 3` (vantandi hlaup eru raunverulega
 * engin hlaup), en `car: "abc"` VEIT vid ekkert um — hun ma ekki lesast
 * sem 0 thvi thad vanmaeti taekifaerin thegjandi.
 */
function cell(row, key) {
  const v = row[key];
  if (v === null || v === undefined) return null;
  return (typeof v === "number" && Number.isFinite(v)) ? v : undefined;
}

/** Vika sem heiltala 1..18, annars `null`. Labid sleppir viku > 18. */
function weekOf(row) {
  const w = row.week;
  if (typeof w !== "number" || !Number.isInteger(w)) return null;
  return (w >= 1 && w <= 18) ? w : null;
}

/* Stigagjof appsins -> lykill i toflunum her. Othekkt -> `null`.

   EKKI UTFLUTT VILJANDI. `rulebasis.scoringKeyOf(league)` er THEGAR til
   og skilar LAB-lyklunum ("half"), medan thessi skilar APP-lyklunum
   ("half-ppr"). Tvo utflutt foll med naestum sama nafni sem skila
   OLIKUM strengjum fyrir sama inntak er hvernig kallandi faer `undefined`
   ur toflu og heldur ad taflan se tom. Kallandinn gefur `league.scoring`
   beint inn i `blendWeight`/`blendedSeasonProj` og thau vorpa sjalf.  */
function scoringKey(scoring) {
  if (scoring === "ppr" || scoring === "standard") return scoring;
  if (scoring === "half-ppr" || scoring === "half") return "half-ppr";
  /* "std" er heitid i README-toflunni; appid notar "standard". */
  if (scoring === "std") return "standard";
  return null;
}

/* ============================================================
   1. NOTKUN TIL THESSA — OG `throughWeek` ER UTILOKANDI
   ============================================================ */

/**
 * Notkun leikmanns THAD SEM ER LIDID, an leka.
 *
 * @param weeklyRows radir ur `data/weekly/{season}.json` (ALLIR
 *        leikmenn — sian er her svo kallandinn thurfi ekki ad byggja
 *        visa fyrir hvern mann).
 * @param opts.playerId `id` i rodunum (`"00-0034844"`). Borid saman
 *        sem STRENGUR: viku-skrarnar bera GSIS-id sem er strengur og
 *        tolulegur samanburdur a `"00-0034844"` er alltaf falskur.
 * @param opts.throughWeek vikan sem er SPAD — **UTILOKANDI**. Leikur i
 *        viku `w` telst EKKI thegar spad er viku `w`.
 * @param opts.window `"last3"` (maeld sjalfgefin), `"last5"` eda
 *        `"all"`. Othekktur gluggi -> `null`, ekki thogul sjalfgefning.
 * @param opts.scoring stigagjof, ADEINS fyrir `ppg`. An hennar er
 *        `ppg` `null` — `ppr`, `half` og `std` eru thrjar olikar tolur
 *        og ad velja eina thegjandi vaeri ad birta ranga.
 *
 * @returns `{ games, windowGames, window, car, tgt, opp, ppg,
 *            throughWeek, playerId }` eda `null`.
 *
 * `games` ER HEILDARFJOLDI LEIKJA fyrir `throughWeek` — thad er
 * inntakid i `blendWeight` — en `car`/`tgt`/`opp`/`ppg` eru MEDALTOL
 * PER LEIK YFIR GLUGGANN (`windowGames` leikir). Thaer tvaer tolur eru
 * ekki sama talan og maelingin notar BADAR: ferillinn les fjoldann,
 * matid les gluggann.
 *
 * NULL ER SVAR. Enginn leikur fyrir `throughWeek` -> `null`, ekki
 * nullur. Kallandinn verdur ad greina "engin gogn" fra "engin notkun":
 * varamadur sem hefur spilad 4 leiki an snertingar er `opp: 0`, madur
 * sem hefur ekki spilad er `null`, og sa munur er allt sem uppstillingin
 * hefur til ad fara eftir.
 */
export function usageToDate(weeklyRows, opts) {
  const o = opts || {};
  if (!Array.isArray(weeklyRows)) return null;
  if (o.playerId === null || o.playerId === undefined || o.playerId === "") return null;

  const through = num(o.throughWeek);
  if (through == null) return null;

  const window = o.window === undefined ? ARM.window : o.window;
  if (!Object.prototype.hasOwnProperty.call(WINDOW_N, window)) return null;

  const pid = String(o.playerId);
  const kept = [];
  for (const r of weeklyRows) {
    if (!r || typeof r !== "object") continue;
    if (String(r.id) !== pid) continue;
    const wk = weekOf(r);
    if (wk == null) continue;
    /* HERNA ER LEKINN VARINN. `<` og aldrei `<=`. */
    if (wk >= through) continue;
    kept.push({ wk, r });
  }
  /* Fost rod: eldsta fyrst. Baedi svo `last3` se raunverulega SIDUSTU
     THRIR og svo summan se logd saman i somu rod i hverri keyrslu —
     fleytitolu-samlagning er ekki vixlin (sama regla og `fetch-bsd`). */
  kept.sort((a, b) => a.wk - b.wk);

  const games = kept.length;
  if (!games) return null;

  const n = WINDOW_N[window] == null ? games : Math.min(games, WINDOW_N[window]);
  const use = kept.slice(games - n);

  /* Hver maelikvardi hefur SINA talningu — rod sem vantar `tgt` en
     hefur `car` telst i `car`-medaltalinu. Sama og `cnt` per
     maelikvarda i labinu. */
  const acc = { car: [0, 0], tgt: [0, 0], opp: [0, 0], pts: [0, 0] };
  const ptsField = POINTS_FIELD[scoringKey(o.scoring)] || null;

  for (const { r } of use) {
    const car = cell(r, "car");
    const tgt = cell(r, "tgt");
    if (car !== undefined && car !== null) { acc.car[0] += car; acc.car[1]++; }
    if (tgt !== undefined && tgt !== null) { acc.tgt[0] += tgt; acc.tgt[1]++; }
    /* `opp` eins og labid: null i BADUM -> engin rod; annars er
       vantandi svid 0. Rusl i hvorugu -> rodin er slept. */
    if (car !== undefined && tgt !== undefined && !(car === null && tgt === null)) {
      acc.opp[0] += (car || 0) + (tgt || 0); acc.opp[1]++;
    }
    if (ptsField) {
      const p = cell(r, ptsField);
      if (p !== undefined && p !== null) { acc.pts[0] += p; acc.pts[1]++; }
    }
  }
  const mean = (a) => (a[1] > 0 ? a[0] / a[1] : null);

  return {
    playerId: pid,
    throughWeek: through,
    window,
    games,
    windowGames: n,
    car: mean(acc.car),
    tgt: mean(acc.tgt),
    opp: mean(acc.opp),
    ppg: ptsField ? mean(acc.pts) : null,
  };
}

/* ============================================================
   2. VOGIN
   ============================================================ */

/**
 * Vog A TIMABILID (0 = notadu spana eina, 1 = spain hent).
 *
 * `0` er NULL-TILGATAN og hun er rett svar: fyrir 5 leiki er hun
 * maelda svarid (bilid w1-4 er ogreinanlegt fra nulli) og fyrir
 * omaelda stigagjof er hun eina heidarlega svarid — sama regla og
 * `weeklyEdgeNote`: omaeld stigagjof faer enga tolu.
 *
 * @param gamesPlayed leikir SPILADIR fyrir vikuna sem er spad
 *        (`usageToDate(...).games`).
 * @param scoring `"ppr"` | `"half-ppr"` | `"standard"`. Othekkt -> 0.
 */
export function blendWeight(gamesPlayed, scoring) {
  if (scoringKey(scoring) == null) return 0;
  const k = num(gamesPlayed);
  if (k == null || k <= 0) return 0;
  const eff = Math.max(0, k - CURVE.DEAD_GAMES);
  if (eff <= 0) return 0;
  const w = eff / (CURVE.K + eff);
  /* Bundid berum ordum. Formulan getur ekki farid ut fyrir [0,1) fyrir
     k >= 0, en klippingin er odyr og hun er thad sem ver kallandann
     gegn oheilu inntaki (`gamesPlayed: 1e308`). */
  return w < 0 ? 0 : w > 1 ? 1 : w;
}

/* ============================================================
   3. BLONDUNIN
   ============================================================ */

/**
 * Arstidar-spa blondud med notkun-til-thessa.
 *
 * @param seasonProj arstidar-spa i STIGUM (sama tala og
 *        `weekview.weekRows` deilir med 17).
 * @param usage utkoma `usageToDate` — notud fyrir `games` thegar
 *        `gamesPlayed` er ekki gefid.
 * @param scoring stigagjof deildarinnar.
 * @param gamesPlayed yfirskrifar `usage.games`.
 * @param toDatePerGame **matid a STIGA-KVARDA** ur notkun-til-thessa,
 *        tha VORPUN sem er ekki i `usage.json` (sja
 *        `USAGE_BLEND.mapping`). Vantar hana -> `null`.
 *
 * @returns blondud arstidar-spa, eda `null`.
 *
 * THRJAR UTKOMUR OG THAER ERU OLIKAR:
 *   · `null`  — vid getum ekki svarad (engin spa, enginn leikja-fjoldi,
 *               eda vog > 0 en engin vorpun).
 *   · `seasonProj` obreytt — vogin er 0. THAD ER SVAR, ekki bilun:
 *               fyrir viku 6 er maelda svarid "notadu spana eina".
 *   · blondud tala.
 *
 * ENGIN THOGUL VARALEID. Freistingin er ad nota `usage.ppg` thegar
 * vorpunina vantar — thad er ANNAD ARM (`ptsPG`), maelt serstaklega og
 * lakara, og ad setja thad inn undir nafni `opp` vaeri ad birta eina
 * maelingu sem adra.
 */
export function blendedSeasonProj(args) {
  const a = args || {};
  const proj = num(a.seasonProj);
  if (proj == null) return null;

  const u = a.usage && typeof a.usage === "object" ? a.usage : null;
  const k = num(a.gamesPlayed) != null ? num(a.gamesPlayed)
          : (u ? num(u.games) : null);
  if (k == null) return null;

  const w = blendWeight(k, a.scoring);
  if (w === 0) return proj;

  const td = num(a.toDatePerGame);
  if (td == null) return null;

  return (1 - w) * proj + w * GAMES_IN_SEASON * td;
}

/* ============================================================
   VORPUNIN — ATTA TOLUR SEM LABID REIKNADI OG HENTI
   ============================================================
   `opp_prior` er `est = a + b·z` i STIGUM PER LEIK, thar sem `z` er
   thversnids-z-skor stodunnar a window-`opp` thá viku. `(a, b)` var
   reiknad i `accFit()` i `usage-lab.mjs` og HENT — skrain bar deltas,
   t-gildi og ferla en engar fit-breytur, svo `blendedSeasonProj` gat
   ekki keyrt og skiladi `null`.

   Labid vistar thau nu: `results.{snid}.priorFit.forward.byPosition`.
   Taflan hér er TEKIN UR SKRANNI (ekki afrituð ur samantekt) og
   `usageblend.mjs` PINNAR hana svid fyrir svid — endurkeyrsla labsins
   sem breytir tolu FELLIR profid, og tha uppfaerir madur TOFLUNA.

   HVER FIT ER THETTA? Appid spair 2026, thar sem OLL fyrri timabil eru
   thekkt, svo rettur fit er sa sem er fittadur a 2019-2025. Thad er
   EKKI neitt af walk-forward fittunum (hvert theirra sleppir einu ari
   og er til fyrir maelinguna sjalfa). `walkForward.*` er thess vegna
   VILJANDI EKKI bakad.

   STODUGLEIKI, MAELDUR: `b` skiptir ALDREI formerki — 0 af **69** fittum.

   ÞETTA STOD SEM "72" OG ÞAD VAR REIKNAD, EKKI TALID. 4 stodur x 3 snid
   x 6 walk-forward ar = 72, sem er retta reikningurinn og rangt svar:
   TE hefur adeins **5** fit i hverju sniði (2021-2025, ekki 2020-2025).
   Astaedan er `minN: 200` — `accFit` skilar `null` undir 200 uppsofnudum
   leikmanna-vikum, og TE naer thvi ekki thegar 2020 er haldid ut. Talan
   er thvi 3x6 + 3x6 + 3x6 + 3x5 = 69.

   ÞAD SEM SKIPTIR MALI ER AD `null` ER TALID SEM FJARVERA, EKKI SEM FIT.
   Hefdi labid skrifad `{a: 0, b: 0}` i stad `null` vaeri talan 72 og
   fullyrdingin "b skiptir aldrei formerki" hefdi verid STYRKT af holfi
   sem var aldrei fittad. Nakvaemlega su gildra sem `minNNote` a diski
   varar vid berum ordum. Vordur: `tests/usageblend.mjs` kafli 10 TELUR
   fittin ur skranni i stad thess ad reikna thau.
   Drift milli sidasta walk-forward fits (2019-2024) og thessa (2019-2025):
   RB/WR/TE 0,2-3,7% i ollum snidum, en QB **5,9% (ppr), 14,8% (half),
   14,1% (standard)**.

   QB ER OSTODUGASTA OG SAMTIMIS AHRIFALAUSASTA STODAN, og thad er engin
   tilviljun: `b ~ 1,3` a skurdpunkti 18,3 thydir ad ±1σ af taekifaeri
   faerir leikstjornanda um ~7%. Labid maelir sama: `opp -> stig` fylgni
   er 0,171 hja QB a moti 0,445 RB / 0,352 WR / 0,252 TE. Vorpunin gerir
   nanast ekkert fyrir QB hvort ed er, svo osodugleikinn kostar litid —
   en hann er SKRIFADUR hér i stad thess ad vera thagad um.            */
export const PRIOR_FIT = {
  "ppr": {
    QB: { a: 18.298, b: 1.355, n: 2226 },   /* drift 5.9%, formerki fast: ja */
    RB: { a: 11.199, b: 3.906, n: 5159 },   /* drift 2.5%, formerki fast: ja */
    WR: { a: 11.836, b: 2.882, n: 6027 },   /* drift 3.7%, formerki fast: ja */
    TE: { a: 10.385, b: 2.11, n: 1722 },   /* drift 0.9%, formerki fast: ja */
  },
  "half-ppr": {
    QB: { a: 18.541, b: 1.288, n: 2041 },   /* drift 14.8%, formerki fast: ja */
    RB: { a: 10.272, b: 3.591, n: 4761 },   /* drift 1.0%, formerki fast: ja */
    WR: { a: 10.266, b: 2.079, n: 5348 },   /* drift 0.3%, formerki fast: ja */
    TE: { a: 8.693, b: 1.601, n: 1458 },   /* drift 1.3%, formerki fast: ja */
  },
  "standard": {
    QB: { a: 18.432, b: 1.275, n: 2142 },   /* drift 14.1%, formerki fast: ja */
    RB: { a: 8.922, b: 3.359, n: 4961 },   /* drift 0.3%, formerki fast: ja */
    WR: { a: 7.981, b: 1.606, n: 5503 },   /* drift 0.2%, formerki fast: ja */
    TE: { a: 6.479, b: 1.16, n: 1581 },   /* drift 1.6%, formerki fast: ja */
  },};

/* Skurdpunktur og halli eru i STIGUM PER LEIK — sami skali og
   `projection/17`, sem er thad sem blondan skiptir ut.

   (`export const PRIOR_FIT_SCALE = "points per game"` stod hér og var
   flaggad daudur i FJORUM handover-um. Fjarlaegd 19.8.2026: strengurinn
   var ekki lesinn af neinum — hvorki `src/`, `scripts/`, `tests/` ne
   README — svo hann var skjolun sem let sem hun vaeri kodi. Skalinn er
   sagdur hér i athugasemd, sem er thar sem hann atti ad vera.)        */

/**
 * `est = max(0, a + b·z)`.
 *
 * GOLFID VID 0 ER AKVORDUN LABSINS OG VERDUR AD ENDURGERAST. An thess
 * gefur mjog negatift `z` leikmann med NEGATIF stig, sem `optimalLineup`
 * setur sjalfkrafa a bekk sama hvad spain segir — og thad vaeri OMAELD
 * hegdun sem laeddist inn med formulunni.
 *
 * `null` thegar stodan er ekki i toflunni (K/DST — vorpunin var aldrei
 * maeld fyrir thau) eda `z` er ekki tala. `null` er "vitum ekki", og sa
 * sem kallar VERDUR ad falla i spána, ekki i 0.
 */
export function estimateFromZ({ pos, scoring, z } = {}) {
  const tbl = PRIOR_FIT[scoring];
  if (!tbl) return null;
  const f = tbl[pos];
  if (!f) return null;
  if (typeof z !== "number" || !Number.isFinite(z)) return null;
  return Math.max(0, f.a + f.b * z);
}

/**
 * Þversnidid: `mu` og `sd` yfir `values`.
 *
 * ÞRENNT SEM VERDUR AD VERA EINS OG I LABINU, annars er `z` onnur tala
 * sem LITUR NAKVAEMLEGA EINS UT:
 *   · `sd` er ÞYDIS-stadalfravik (deilt med N, ekki N-1)
 *   · lagmark 8 endanleg gildi, annars ekkert `z`
 *   · `sd <= 1e-9` -> ekkert `z` (allir eins; z vaeri deiling med ~0)
 *
 * Þversnidid i labinu er **stada × vika × timabil** innan draftanlegu
 * laugarinnar. Sa sem kallar velur laugina og VERDUR ad gera thad eins
 * — sja notuna vid `MAPPING_RISK`.
 */
export function crossSection(values, { minFinite = 8 } = {}) {
  const xs = (Array.isArray(values) ? values : [])
    .filter((v) => typeof v === "number" && Number.isFinite(v));
  if (xs.length < minFinite) return null;
  const mu = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, v) => a + (v - mu) ** 2, 0) / xs.length);
  if (!(sd > 1e-9)) return null;
  return { mu, sd, n: xs.length };
}

/** `z` ur einu gildi og thversnidi. `null` vid hvad sem er ovist. */
export function zOf(value, cross) {
  if (!cross || typeof value !== "number" || !Number.isFinite(value)) return null;
  return (value - cross.mu) / cross.sd;
}

/* ============================================================
   HAND-OFF AHAETTAN, SKRIFUD SVO HUN SE EKKI THOGUL
   ============================================================
   Labid skilgreinir laugina sem "hver leikmadur i `features.json` fyrir
   thad timabil sem ber BAEDI ADP og timabils-spa". Appid hefur ekki
   `features.json` i vafranum — thad hefur `rows` ur `buildRows`, sem er
   byggt a `players.json`.

   LAUGIN ER THVI EKKI NAKVAEMLEGA SU SAMA, og THAD BREYTIR `mu`/`sd`.
   Vidari eda threngri hopur gefur annad `z` SEM LITUR EINS UT. Þetta er
   eina thekkta frávikid milli maelingar og appsins og thad er EKKI
   maelanlegt afturvirkt — `players.json` i dag er ekki `players.json`
   arid 2021.

   Naesta jafngildi sem appid getur gert: leikmenn i sama sniði sem bera
   BAEDI `adp` og `proj`, innan stodunnar, i thessari viku. Það er sama
   SKILYRDI, onnur SKRA. Frávikid er skrifad hér svo sa sem les tolurnar
   viti ad thaer eru naest-besta jafngildi og ekki endurgerd.          */
export const MAPPING_RISK = {
  poolDiffers: true,
  labPool: "every player in features.json for that season carrying BOTH an ADP " +
           "and a season projection (for half-ppr, both a ppr and a standard row)",
  appPool: "players in the built rows carrying BOTH adp and proj, within the " +
           "position, for the current week",
  measured: false,
  note: "SAME CONDITION, DIFFERENT FILE. mu and sd are computed over the pool, so " +
        "a wider or narrower pool gives a different z that looks identical. This " +
        "cannot be measured backwards: today's players.json is not the 2021 one. " +
        "It is the one known deviation between the measurement and the app.",
};
