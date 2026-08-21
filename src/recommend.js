/* ============================================================
   TILLOGU-KERFID — KAUP OG SALA

   Flutt ur `App.jsx` 18.8.2026 (C.1). Hreint: engin React, engin gogn sott,
   allar hadir INNSPYTTAR. Sama regla og `teamstats.js` og `availability.js`:
   profin keyra NAKVAEMLEGA sama koda og appid birtir.

   TVAER RADANIR, TVAER SPURNINGAR — og thaer eru EKKI sama likanid:
     KAUP  radast eftir `rankScore` (model.js) — maelt, LOSO, med orakel-thaki.
     SALA  radast eftir `score` (FIT-taflan her ad nedan) — OG THAD VAR MAELT,
           sja "SOLU-RODUNIN" nedar. CLAUDE.md kafli 3 segir "`rankScore` er
           thad sem RADAR tillogum, ekki `FIT`". Thad er RETT UM KAUP og
           SEGIR EKKERT UM SOLU; solu-leidin var hvergi nefnd i skjalinu.
   `score` er BIRT tala (spjaldid synir hana); `rank` er RODUNIN a kaupum.
   ThRIDJA SPURNINGIN — HVENAER a ad selja — er `sellTiming` i botni thessarar
   skrar. Hun RADAR ENGU og blandast EKKI vid `score`; sja hausinn thar.

   ---------------------------------------------------------------
   SOLU-RODUNIN — MAELD 18.8.2026, `score` HELDUR VELLI
   ---------------------------------------------------------------
   Spurningin: a ad rada solu eftir `score` eda eftir `rankScore`? Godur
   solu-maelikvardi setur tha sem munu skora ILLA NEDST, svo maelingin er
   BOTNINN, ekki toppurinn, og markmidid er RAUNSTIG naestu 5 umferdir
   (`recRange`), ekki ein umferd.

   Herming a RAUNVERULEGU LIDI (15 handahofskenndir ur 120 minutuhaestu
   hverrar umferdar, nedstu 2 valdir, 100 lid per umferd, 5 timabil):
     laug ALLIR     score 9,393  ·  rankScore 9,512  ·  delta -0,118
                    95% CI [-0,328, +0,088]  -> OGREINANLEGT
     laug SPILADIR  score 10,063 ·  rankScore 10,250 ·  delta -0,187
                    95% CI [-0,393, +0,009]  -> OGREINANLEGT
     per timabil skiptist 2/2 og 3/1 — engin stefna.
   Yfir ALLA deildina (ekki innan lids) vinnur `score`: nedstu 15 gefa
   0,291 stig a moti 0,766 hja rankScore, CI [0,341, 0,625].

   NIDURSTADA: ENGIN maeling stydur ad skipta solu yfir a `rankScore`.
   `score` heldur ser. Thetta er ekki "vid vissum ekki" heldur "vid
   maeldum og munurinn er ekki greinanlegur innan lids".

   ---------------------------------------------------------------
   HANDSETTU LIDIRNIR — MAELDIR 18.8.2026 (C.1), THRIR FELLDIR
   ---------------------------------------------------------------
   Panell: `tests/lib/panel.mjs`, 51.262 spiladar / 126.730 allar radir,
   5 timabil. Akvordunar-maelikvardi: raunstig naestu 5 umferda hja theim
   N sem likanid setti efst (N=4 er thad sem spjaldid synir per stodu).
   Bootstrap klasad per UMFERD, 400 itranir.

     LIDUR              NIDURSTADA                              ORLOG
     ep * 1,2           topp-15 +2,002 CI [1,608 , 2,385]       HELDUR
                        LOSO jakvaett i 5/5 timabilum
     vitaskytta +2,2    topp-4  +1,221 CI [0,680 , 1,739]       HELDUR
                        LOSO jakvaett i 4/4 timabilum
     mins > 400         throskuldur 0..1800 gefur SOMU akvordun  HELDUR
                        (22,146) — OVIRKUR, ekki maeldur         (yfirlyst)
     banPen -2,5/-1     topp-15 -0,143 CI [-0,249 , -0,057]     FELLDUR
                        MERKID SNYST VID: their sem eru naerri
                        banni skora MEIRA (13,09 a moti 11,21),
                        thvi gul spjold safnast a menn sem SPILA
                        ALLT. Sama undirskrift og DefCon i kafla 4.
     rotPen -2/-0,8     OLL CI innihalda null; LOSO vinnur 0/5   FELLDUR
                        Merkid ER til (safe 14,52 · high 9,91)
                        en `mins5` ber thad thegar — sama og
                        `full90 + start_rate5` i kafla 4.
     dcB (DefCon)       ENGIN NY MAELING: kafli 4 hafnadi        FELLDUR
                        "DefCon i rodun" thegar. Hann lifdi her
                        um bakdyrnar. Ad fjarlaegja hann er ad
                        FYLGJA hofnuninni, ekki ny akvordun.

   THRIR HANDSETTIR LIDIR VORU SAGDIR OMAELANLEGIR. TVEIR VORU THAD EKKI:
   `banRisk` les `yellow_cards` og `rotationRisk` les `starts`, og BADIR
   dalkar eru i `fpl_player_gw.json`, svo uppsofnud stada fyrir umferd t
   er reiknanleg og leka-frjals. Their voru maeldir og felldir (taflan).
   ADEINS tiltaekileika-fjolskyldan er raunverulega omaelanleg — sja
   `UNMEASURED_UI`.
   ============================================================ */
import { setPieceOf } from "./availability.js";
import { rankScore } from "./model.js";
import { interp } from "./interp.js";
import { ffdrSeries, hardestRun } from "./buywindow.js";

/* MAELDIR STUDLAR — sja tofluna i hausnum fyrir CI og LOSO. */
export const MEASURED_ADJ = {
  penTaker: 2.2,   // topp-4 +1,221 CI [0,680 , 1,739], LOSO 4/4
  epWeight: 1.2,   // topp-15 +2,002 CI [1,608 , 2,385], LOSO 5/5
};
/* OVIRKUR VARNAGLI, EKKI VOG. Kemur i veg fyrir ad 30 minutna timabil
   se deilt upp i /90-taxta (90/30 = x3 a hrat xGI). Maelt: ad faera hann
   ur 0 i 1800 breytir akvordunni EKKI (22,146 i ollum tilvikum), svo
   talan 400 er EKKI maeld — hun er bara nogu lag til ad vera meinlaus.
   Ef einhver vill breyta henni: thad tharf ekki maelingu, thvi hun maelist
   ekki. Ef hun FER AD maelast er thad merki um ad eitthvad annad breyttist. */
export const PER90_MIN_MINUTES = 400;
/* OMAELDAR UI-HEURISTIKUR — YFIRLYSTAR SEM SLIKAR, EKKI DULBUNAR MAELINGAR.
   Tiltaekileiki byggir a `status` / `chance_of_playing_next_round` / `news`,
   sem EIGA SER ENGA SOGU i `fpl_player_gw.json` (dalkarnir eru ekki til).
   Their eru thvi ekki maelanlegir a panelinum og verda thad aldrei ur
   theim gognum. Their eru samt HAFDIR, af tveimur astaedum:
     1. CLAUDE.md kafli 6: "FPL-status raedur tiltaekileika. Punktur."
     2. Ad fjarlaegja thetta endurvekur RAUNVERULEGA bilun sem notandi
        tilkynnti 7.8.2026 (J.Timber, meiddur, i 2. saeti yfir varnarmenn
        sem maelt var med ad kaupa).
   TOLURNAR SJALFAR ERU VALDAR, EKKI MAELDAR. Ekki vitna i thaer sem
   maelingu og ekki fella nedan a thaer nyja lidi.                       */
export const UNMEASURED_UI = {
  availFloor: 0.35,      // hversu mikid af skorinu lifir vid 0% likur
  availSlope: 0.65,      // afgangurinn skalast med likunum
  unknownChance: 0.5,    // `null` = "veit ekki", ekki "utilokadur"
};

/* ---- MÆLDAR VOGTÖLUR FYRIR STIGASPÁ ----
   FITTAÐ út-af-úrtaki á 2025/26 umferð-fyrir-umferð gögnum:
   19.448 sýni, lært á GW6-20, prófað á GW21-33. Markmið = stig næstu 5 umferðir.

   MAE á prófunarsetti:
     ekkert líkan (meðaltal)  6,70
     FPL-eigin xP             6,43
     mitt handvalda skor      5,00
     FITTAÐ                   3,66   <- 27% betra en handvalið

   RÍKJANDI ÞÁTTUR ER MÍNÚTUR (stöðluð áhrif +4,6 til +5,1 stig).
   FDR MÆLIST ~0 — það bætir engu við á NEINUM sjóndeildarhring (1 til 8
   umferðir, prófað). Það er samt haft með á sinni MÆLDU vog (lítilli),
   ekki handvalinni. Litakóðar á leikjum eru gagnlegt samhengi þótt
   forspárgildi þeirra sé lítið.                                            */
export const FIT = {
  1: { bias:-1.05, mins5:11.776, pts5:-0.344, bps90:0.179, price:2.092, fdr:-0.597, xgi90:0 },
  2: { bias:-2.31, mins5:11.571, pts5: 0.142, bps90:0.006, price:2.350, fdr:-1.769, xgi90:4.218 },
  3: { bias:-1.62, mins5:14.578, pts5: 0.180, bps90:0.003, price:0.984, fdr:-0.534, xgi90:2.403 },
  4: { bias:-1.98, mins5:13.869, pts5: 0.519, bps90:0.009, price:0.698, fdr:-0.881, xgi90:1.919 },
};

/* TILLOGU-KERFID. Allar hadir eru gefnar — engin les hnottinn.             */
export function buildRecommendations({
  players, fixtures, gw, maxGw, recRange, recMaxCost,
  fixByTeamGw, fixDifficulty, spRanks, seasonGames,
  squadIds, formFeat, playerForm,
}) {
    if (!players || !fixtures) return { byPos: {}, sellIds: new Set() };
    const N = recRange;
    const ff = {};
    (formFeat?.players || []).forEach(x => ff[x.fpl_id] = x);
    const haveForm = (formFeat?.mode === "fitted");

    const scoreOf = (p) => {
      const fxs = [];
      for (let g = gw; g < gw + N && g <= maxGw; g++) {
        (fixByTeamGw[p.team]?.[g] || []).forEach(f => fxs.push(f));
      }
      if (!fxs.length) return null;
      const fdrAvg = fxs.reduce((a, f) => a + f.fdr, 0) / fxs.length;
      const price = (p.now_cost || 0) / 10;
      /* VANTANDI LIKUR ERU EKKI 0%. `?? 0` gerdi stodu-"d" mann MED
         ochekktar likur ad 0 -> `rank x 0` -> hann hvarf ur tillogum
         alveg eins og meiddur madur. FPL skilar oft `null` einfaldlega
         thvi frett er ekki komin. Null = "veit ekki": tha er varfaerid
         mat 50%, ekki utilokun. Adeins RAUNVERULEG tala gildir sem hun er.  */
      const chance = p.chance_of_playing_next_round;
      const avail = p.status === "a" ? 1
        : (typeof chance === "number" && Number.isFinite(chance)) ? chance / 100
        : UNMEASURED_UI.unknownChance;
      const w = FIT[p.element_type] || FIT[3];

      let raw, mode;
      if (haveForm && ff[p.id]) {
        // MÆLT LÍKAN — mins5 er ríkjandi þáttur
        const f = ff[p.id];
        raw = w.bias
            + w.mins5 * (f.mins5 / 90)
            + w.pts5  * f.pts5
            + w.xgi90 * f.xgi90
            + w.bps90 * f.bps90
            + w.price * price
            + w.fdr   * fdrAvg;
        // skala úr 5-umferða kvarða í valinn sjóndeildarhring
        raw = raw * (N / 5);
        mode = "fitted";
      } else {
        // FYRIR TÍMABIL: mins5 er ekki til. Notum það sem er í boði og
        // MERKJUM lægra öryggi. Mæling sýnir að þetta er ~1,5 stigum verra.
        const ppg = parseFloat(p.points_per_game || 0);
        const ep = parseFloat(p.ep_next || 0);
        const mins = p.minutes || 0;
        const per90 = mins > PER90_MIN_MINUTES ? 90 / mins : 0;
        const xgi90 = parseFloat(p.expected_goal_involvements || 0) * per90;
        raw = w.bias
            + w.mins5 * Math.min(1, mins / (38 * 90))   // sl. tímabils mínútuhlutfall
            + w.pts5  * ppg
            + w.xgi90 * xgi90
            + w.price * price
            + w.fdr   * fdrAvg
            /* FPL-EIGIN SPA VEGUR INN — MAELD, ekki valin. Yfirlag a 5
               timabilum (n=52.743 radir med xP): topp-15 +2,002 stig,
               95% CI [1,608 , 2,385]; LOSO jakvaett i 5/5 timabilum.
               ATH: grid-leitin vill haerra (c=3 i 5/5 folds, +2,575), en su
               maeling er INNAN TIMABILS medan lidurinn byr i FORLEIKS-
               greininni, thar sem grunn-eiginleikarnir eru adrir (minutu-
               HLUTFALL i stad mins5). Ad flytja studul milli greina er
               nakvaemlega thad sem heimavallar-maelingin varadi vid: tvo
               markmid toppa a sitthvorum stad. 1,2 stendur; haerri tala
               tharf sina eigin maelingu a forleiks-lauginni.              */
            + ep * MEASURED_ADJ.epWeight;
        raw = raw * (N / 5);
        mode = "preseason";
      }

      /* VITASKYTTU-BONUS — MAELDUR (topp-4 +1,221, CI [0,680 , 1,739],
         LOSO jakvaett i 4/4 timabilum). Merkid er raunverulegt og STORT:
         vitaskyttur skora 17,28 stig a 5 umferdum a moti 11,16 hja odrum.
         Grid-leitin vill 4-6; munurinn a 2,2 og 4 er a havada-morkunum
         (topp-15 ALLIR: +0,133 CI [-0,073 , +0,318]), svo talan stendur.
         Merkid var maelt med FYRRA-timabils vitarod ur players_raw.csv —
         lokastada thess timabils notud a THAD NAESTA, thvi lokastada a
         SAMA timabili vaeri leki (sama gildra og `selected_by_percent`). */
      const spB = setPieceOf(p, spRanks)?.isPenTaker ? MEASURED_ADJ.penTaker : 0;

      /* THRIR LIDIR VORU HER OG ERU FARNIR 18.8.2026 — sja tofluna i
         hausnum. Ekki setja tha inn aftur an nyrrar maelingar:
           `banPen`  MERKID SNYST VID (naerri banni = FLEIRI stig), maeldist
                     -0,143 CI [-0,249 , -0,057] = SKADAR.
           `rotPen`  oll CI innihalda null, LOSO vinnur 0/5 = ekkert.
           `dcB`     CLAUDE.md kafli 4 hafnadi DefCon i rodun; hann var her
                     um bakdyrnar. Fjarlaeging FYLGIR hofnuninni.
         `banRisk` og `rotationRisk` lifa afram A SPJOLDUM og i dalkum —
         thau eru samhengi fyrir mann sem les, ekki vog i skori. Nakvaemlega
         sama skipting og DefCon hefur haft fra upphafi.                   */

      const score = (raw + spB)
        * (UNMEASURED_UI.availFloor + UNMEASURED_UI.availSlope * avail);

      /* HVAÐ DRÍFUR SKORIÐ — birt á kortinu svo talan sé ekki dulúð.
         Mælt: mínútur eru ríkjandi (+4,9 stöðluð áhrif), FFDR nær núll (−0,4).
         Þess vegna getur leikmaður með ÞUNGA leiki verið réttmæt tillaga.     */
      const drivers = [];
      if (haveForm && ff[p.id]) {
        drivers.push([interp("mins {0}′", [Math.round(ff[p.id].mins5)]), w.mins5 * (ff[p.id].mins5 / 90)]);
      } else {
        const mp = Math.min(1, (p.minutes || 0) / (38 * 90));
        drivers.push([interp("mins {0}%", [Math.round(mp * 100)]), w.mins5 * mp]);
      }
      drivers.push([`£${price.toFixed(1)}`, w.price * price]);
      drivers.push(["fixtures", w.fdr * fdrAvg]);
      drivers.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      const tot = drivers.reduce((a, x) => a + Math.abs(x[1]), 0) || 1;
      /* TVÆR PRÓSENTUR í sama streng var ólæsilegt: labelið getur sjálft
         innihaldið % ("mín 89%") og svo var HLUTDEILD driverins skeytt á
         eftir -> "mín 89% 44%", sem lestist sem ein tala. Hlutdeildin fer
         nú í sviga með orði, svo það sé ljóst hvað er hvað.              */
      const why = drivers.slice(0, 2)
        .map(([lbl, v]) => interp("{0} ({1}% of score)", [lbl, Math.round(100 * Math.abs(v) / tot)]))
        .join(" · ");

      // algilt meðal-FFDR yfir sviðið (til samanburðar milli liða)
      let fsum = 0, fn = 0;
      for (const f of fxs) { const d = fixDifficulty(p.team, f, p.element_type); if (d != null) { fsum += d; fn++; } }

      /* RÖÐUNARSKOR — mælt sér fyrir RÖÐUN, sjá rankScore í model.js.
         Tillögur eru RAÐAÐAR eftir þessu (topp-5 6,07 raunstig á móti
         5,29 hjá gamla skorinu og 5,20 hjá FPL-eigin xP, 5/5 tímabil).
         `score` heldur sér ÓBREYTT sem birt tala og drifkraftar (`why`)
         — mælingin sýndi að röðun og birt stærð eru tvö ólík störf og
         eiga ekki að deila einni tölu.                                  */
      const gamesSoFar = seasonGames || 38;      // forleikur: síðasta tímabil
      /* mínútuþróun kemur úr pipeline (player_form.json). Vantar hún —
         preseason eða <4 loknar umferðir — fer 0 inn og skorið er eins
         og áður. mins5 þar er RAUNVERULEGAR síðustu 5 umferðir og því
         betri en árs-meðaltalið; við notum hana þegar hún er til.       */
      const pf = playerForm?.players?.[p.id];
      /* TILTAEKILEIKI VANTADI I RODUNINA — FUNDID 7.8.2026 AF NOTANDA:
         J.Timber (ARS, `status:"i"`, chance_next 0, ep_next 0.0,
         "Groin injury") var i 2. saeti yfir varnarmenn sem MAELT ER MED
         AD KAUPA. rankScore metur form/minutur/verd/FFDR — hann veit
         EKKERT um meidsli, svo meiddur madur i lidi med letta leiki
         (ARS, FFDR 1,62) flaut upp. Birta talan (`score`) bar hins vegar
         tiltaekileikann (9,51 a moti 42,74 hja Gabriel) og THVI leit
         listinn ut fyrir ad vera oradadur — sami galli, tvo einkenni.
         Sama margfeldi og `score` notar er nu lagt a rodunina: 0% likur
         -> 0 og madurinn dettur af listanum, 25/50/75% skala hlutfallslega.
         Mælingin a rankScore (kafli 4) haggast ekki: hun snyst um ROD
         theirra sem GETA spilad.                                        */
      const rank = rankScore({
        form: parseFloat(p.form),
        minsPerGame: Number.isFinite(pf?.mins5) ? pf.mins5
                   : (p.minutes ?? 0) / Math.max(1, gamesSoFar),
        /* ENGIN SJALFGEFIN 4,5 HER. `rankScore` (model.js) ber sina eigin
           (`Number.isFinite(price) ? price : 4.5`) og thessi lina afritadi
           hana. Tveir stadir med somu sjalfgefnu tolu reka i sundur thogult;
           eigandinn er model.js. `undefined` fer inn og hann sér um thad.   */
        price: p.now_cost != null ? p.now_cost / 10 : undefined,
        ffdr: fn ? fsum / fn : null,
        minsTrend: pf?.mins_trend,
      }) * avail;
      /* HRAU INNTOKIN FYLGJA MED — samanburdar-radgjofin (src/advisor.js)
         verdur ad reikna a NAKVAEMLEGA somu tolum og tillogurnar, annars
         gaeti hun sagt annad en listinn og hvorug vaeri traustsins verd.
         Thau eru afhent, ekki endurreiknud.                             */
      const rankInputs = {
        form: parseFloat(p.form),
        minsPerGame: Number.isFinite(pf?.mins5) ? pf.mins5
                   : (p.minutes ?? 0) / Math.max(1, gamesSoFar),
        /* ENGIN SJALFGEFIN 4,5 HER. `rankScore` (model.js) ber sina eigin
           (`Number.isFinite(price) ? price : 4.5`) og thessi lina afritadi
           hana. Tveir stadir med somu sjalfgefnu tolu reka i sundur thogult;
           eigandinn er model.js. `undefined` fer inn og hann sér um thad.   */
        price: p.now_cost != null ? p.now_cost / 10 : undefined,
        ffdr: fn ? fsum / fn : null,
        minsTrend: pf?.mins_trend,
      };
      return { p, score: +score.toFixed(2), rank: +rank.toFixed(3),
               ease: +(5 - fdrAvg).toFixed(2), fxs, mode, avail, rankInputs,
               why, ffdrAvg: fn ? +(fsum / fn).toFixed(2) : null };
    };
    const all = players.map(scoreOf).filter(Boolean);
    /* VERDTHAK — sia adeins a TILLOGULISTANN, ekki a "skipta ut"-matid.
       Verdthak a ekki ad breyta thvi hver er verstur i thinu lidi.        */
    const maxT = (() => {
      const v = parseFloat(String(recMaxCost).replace(",", "."));
      return Number.isFinite(v) && v > 0 ? Math.round(v * 10) : null;
    })();
    const byPos = {};
    [1,2,3,4].forEach(pos => {
      byPos[pos] = all.filter(r => r.p.element_type === pos && !squadIds.has(r.p.id)
                                && (maxT == null || (r.p.now_cost ?? 0) <= maxT))
        .sort((a,b) => b.rank - a.rank).slice(0, 4);
    });
    // versti í liðinu = mælt með að skipta út
    const inSquad = all.filter(r => squadIds.has(r.p.id));
    /* SOLU-RODUNIN ER `score`, EKKI `rank` — OG THAD ER MAELT, ekki arfur.
       Sja "SOLU-RODUNIN" i hausnum: herming a raunverulegu lidi gefur
       -0,118 CI [-0,328 , +0,088] (allir) og -0,187 CI [-0,393 , +0,009]
       (spiladir), sem er OGREINANLEGT, og yfir alla deildina vinnur
       `score`. Ekki skipta yfir a `rank` an nyrrar maelingar.            */
    const sorted = [...inSquad].sort((a,b) => a.score - b.score);
    const sellIds = new Set(sorted.slice(0, 2).map(r => r.p.id));
    /* ============================================================
       `rankedByPos` — ALLIR gjaldgengir, RADADIR, EKKI SKORNIR (20.8.2026)
       ============================================================
       `byPos` er TILLOGULISTINN a skjanum: verdthak notandans er beitt og
       hann er skorinn i FJORA. Bordinn „Not been in your XI" tharf ANNAD:
       hann tharf ad sia eftir SOLUVERDI thess sem er ad fara + banka, eftir
       3-per-felag OG eftir stodu, og fyrst ThA taka einn eda tvo. Vaeri
       hann latinn nota `byPos` gaefi hann oftast EKKERT — fjorir dyrustu
       toppmenn per stodu eru sjaldan a fjarhagsaetlun eins bekkjarmanns.

       ROÐUNIN ER `rank` (thad er `rankScore` ur model.js) OG ThAD ER
       MAELINGIN: hun slær bædi eldri adferd appsins og FPL-eigid xP, og
       `rank-model.mjs` ber orakel-thak sem syn ad hærri tala vaeri LEKI.
       ATH: solu-rodun er `score`, EKKI `rank` (maelt ogreinanlegt,
       -0,118 CI [-0,328, +0,088]) — thetta er KAUP-tillaga, svo `rank`
       er retta talan. Ekki blanda theim.
       Verdthakid er VILJANDI ekki beitt hér: thad er UI-sia a tillogulistann
       og „hvad get eg keypt fyrir Ballard" er onnur spurning.           */
    const rankedByPos = {};
    [1,2,3,4].forEach(pos => {
      rankedByPos[pos] = all.filter(r => r.p.element_type === pos && !squadIds.has(r.p.id))
        .sort((a,b) => b.rank - a.rank);
    });
    return { byPos, rankedByPos, sellIds, inSquadScores: Object.fromEntries(inSquad.map(r => [r.p.id, r.score])),
             /* ALLIR leikmenn, ekki adeins tillogurnar: samanburdurinn ma
                bera saman hvern sem er, lika tha sem eru i lidinu.      */
             advisorById: Object.fromEntries(all.map(r => [r.p.id,
               { inputs: r.rankInputs, avail: r.avail, ffdrAvg: r.ffdrAvg, fxs: r.fxs }])) };
}

/* ============================================================
   SKIPTA-TILLAGA FYRIR ThANN SEM ER EKKI NOTADUR (20.8.2026)
   ============================================================
   Notandinn: „I statsinu sem horfir afturabak vill eg ad recommendi
   leikmann sem vaeri betra ad hafa i stadinn, einhvern sem a tha
   thaegilegri leiki thegar thessi a thad ekki".

   HREINT FALL OG ThAD ER MAELT NAUDSYNLEGT, EKKI STILSPURNING. Fyrsta
   utgafan var sia INNI I `App.jsx`-memo-unni og profud A RAUNGOGNUM. ATTA
   stokkbreytingar voru gerdar — verd-sian af, 3-per-felag af, onnur stada
   leyfd, 0%-tiltaekir leyfdir, an PL-minutna leyfdir, „thaegilegri leikir"
   af, soluverd -> 0 — og SJO AF ATTA SLUPPU GEGNUM SAFNID: toppmennirnir
   tveir eftir `rankScore` stodust hvort eda er allar siurnar, svo ad taka
   eina ur sambandi breytti EKKI thvi sem birtist. Fullyrding sem tharf
   tvennt til ad bregdast (sian OG frambjodanda sem hun ein utilokar) er
   veikari en hun litur ut fyrir ad vera — sama lardomur og
   `playerlist-sort.mjs` (CLAUDE.md 5b).
   Ur hreinu falli er hver sia profud A TILBUNU inntaki thar sem svarid er
   thekkt fyrirfram, og tha fellur hver stokkbreyting.

   RODUNIN ER GEFIN, EKKI REIKNUD HER: `ranked` kemur ur `rankedByPos`,
   sem er `rankScore` (`model.js`) — MAELDA kaup-rodunin. Thetta fall
   RADAR ENGU; thad SIAR og tekur `max` fyrstu. Thad er asett: hefdi thad
   sina eigin rodun vaeri thad onnur rodun i appinu.

   FJORAR HORDAR SIUR (ologleg tillaga er verri en engin) + ein model-sia:
     1. EKKI ThEGAR I HOPNUM
     2. A FJARHAGSAETLUN: `budget` = SOLUVERD hans + banki, i TIUNDUM
     3. ThRIR-PER-FELAG EFTIR SKIPTIN — salan opnar saeti hja HANS felagi,
        svo talningin dregur eitt fra thegar felagid er hid sama
     4. TILTAEKILEIKI: `avail === 0` UT · FPL-tala `chance === 0` UT
        (`avail` er 1 um leid og `status === "a"`, svo hun ein er ekki nog —
        MAELT: madur med status "a" OG chance 0 slapp gegnum hana) ·
        `chance == null` er „veit ekki" og utilokar EKKI · og sa sem hefur
        ENGAR PL-minutur er ut, thvi „ohekkt" ma ekki birtast eins og „gott"
        (195 leikmenn i theim flokki, sama regla og `st0%`)
     5. ThAEGILEGRI LEIKIR: `ffdrAvg < ownFfdr`. Bædi tolur koma ur
        `buildRecommendations`, sem kallar `fixDifficulty` MED STODUNNI —
        varnarmadur og framherji hja sama felagi fá ekki sömu tolu. Vanti
        hvora sem er er svarid ENGIN tillaga (vantar er ekki „jafngott").
   `max` ER UI-AFMORKUN eins og `MAX_WINDOWS` i `buywindow.js`.        */
export function swapCandidates({ ranked = [], outP = null, squadIds = null,
                                 perClub = {}, budget = 0, ownFfdr = null,
                                 max = 2 } = {}) {
  if (!Array.isArray(ranked) || !outP) return [];
  if (ownFfdr == null || !Number.isFinite(Number(ownFfdr))) return [];
  const has = id => (squadIds && typeof squadIds.has === "function") ? squadIds.has(id) : false;
  const out = [];
  for (const c of ranked) {
    const q = c?.p;
    if (!q || q.id == null) continue;
    if (q.element_type !== outP.element_type) continue;
    if (has(q.id)) continue;
    const cost = Number(q.now_cost);
    if (!Number.isFinite(cost) || cost > budget) continue;
    const n = (perClub[q.team] || 0) - (q.team === outP.team ? 1 : 0);
    if (n >= 3) continue;
    if (c.avail === 0) continue;
    const chance = q.chance_of_playing_next_round;
    if (typeof chance === "number" && Number.isFinite(chance) && chance === 0) continue;
    if (!(Number(q.minutes) > 0)) continue;
    if (c.ffdrAvg == null || !(Number(c.ffdrAvg) < Number(ownFfdr))) continue;
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

/* ============================================================
   HVENAER A AD SELJA — TIMASETNING, EKKI RODUN (21.8.2026)
   ============================================================
   Notandinn: „Eg vill svo baeta vid ad appid recommendi sell i akveðinni
   viku thegar leikmenn eiga erfida leiki framundan".

   Spurningin er ThRIDJA spurningin i thessari skra og hun bitur ekki i
   hinar tvaer:
     HVERN a eg ad kaupa?  ->  `rank` (`rankScore`, MAELT, LOSO + orakel)
     HVERN a eg ad selja?  ->  `score` (FIT-taflan, MAELT 18.8.2026:
                               `rankScore` gaf -0,118 CI [-0,328, +0,088]
                               og -0,187 CI [-0,393, +0,009] — OGREINANLEGT
                               i badum laugum, svo `score` heldur ser)
     HVENAER a eg ad selja hann?  ->  ThETTA FALL

   ThAD BLANDAR ENGU OG ThAD ER HORD REGLA, EKKI VARFAERNI. Samsett
   „solu-brad"-skor (`score` × runa, `score` + runa, hvad sem er) vaeri
   OMAELD samsetning tveggja talna sem eru a sitt hvorum kvarda — og
   CLAUDE.md kafli 4 er kirkjugardur nakvaemlega slikra hugmynda sem lita
   ut eins og innsæi og maelast sem hávaði (mó × byrjunar-likur · Aron-
   studull i rankScore · `aron/verd` sem rodun · DefCon i rodun). Verra:
   samsett tala VIRDIST maeld thvi baðir lidirnir eru maeldir hvor um sig.
   Fallid skilar thvi UPPLYSINGU vid hlidina a rodun sem er thegar til:
     · Thad tekur ENGA `score`, `rank` ne tillogulista inn.
     · Thad skilar korti (id -> runa). Kallandinn flettir upp.
     · Rod solu-tillagna er thvi BYTE-EINS med og an thessa falls.
       Vordur: `tests/recommend.mjs` kafli 9.
   BYGGINGIN SJALF ER FULLYRDINGIN: fall sem hefur ekki adgang ad `score`
   getur ekki blandad honum inn, hversu vel sem naesta lota meinar.

   REIKNAD ADEINS FYRIR ThA SEM ER SPURT UM (hopinn, 15 menn), ekki alla
   587: timasetning a solu er merkingarlaus fyrir mann sem thu att ekki —
   fyrir hann er spurningin „hvern a eg ad kaupa" og hun hefur sina eigin
   maeldu leid. Thad er lika thess vegna thetta er SER fall og ekki nyr
   reitur i `buildRecommendations` (sem gengur yfir alla og er memo-ad a
   morgum haðum).

   VELIN ER `hardestRun` I `src/buywindow.js` — SAMA leitin sem finnur
   kaup-gluggana, med attina speglaða. Ekkert er endurreiknad her.       */
export function sellTiming({ squad = [], gwNow = null, maxGw = 38,
                             fixByTeamGw = null, fixDifficulty = null,
                             minLen = undefined } = {}) {
  const out = {};
  if (!Array.isArray(squad) || !fixByTeamGw) return out;
  const to = Number.isFinite(Number(maxGw)) ? Number(maxGw) : 38;
  /* BILID BYRJAR A 1, EKKI A `gwNow` — OG ThAD ER MUNUR SEM SEST.
     `hardestRun` sneidir sjalf af thvi sem er bunid (`aheadOf`), svo
     medaltalid er reiknad UR AFGANGNUM. Vaeri sneidt HER lika vaeri
     sneitt tvisvar og hvorugur stadurinn baeri regluna einn.            */
  const from = 1;
  for (const p of squad) {
    if (!p || p.id == null || p.team == null) continue;
    const series = ffdrSeries({ teamId: p.team, pos: p.element_type,
                                fixByTeamGw, fixDifficulty, from, to });
    out[p.id] = hardestRun(series, { gwNow, ...(minLen == null ? {} : { minLen }) });
  }
  return out;
}
