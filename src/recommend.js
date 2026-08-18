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
    return { byPos, sellIds, inSquadScores: Object.fromEntries(inSquad.map(r => [r.p.id, r.score])),
             /* ALLIR leikmenn, ekki adeins tillogurnar: samanburdurinn ma
                bera saman hvern sem er, lika tha sem eru i lidinu.      */
             advisorById: Object.fromEntries(all.map(r => [r.p.id,
               { inputs: r.rankInputs, avail: r.avail, ffdrAvg: r.ffdrAvg, fxs: r.fxs }])) };
}
