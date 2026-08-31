/* ============================================================
   build.js — byggir rodirnar sem vidmotid birtir. HREIN.

   HVERS VEGNA THETTA ER UTAN REACT: nakvaemlega somu rodir eru
   notadar af (a) toflunni, (b) draft-bordinu, (c) profunum. Vaeri
   thetta inni i .jsx-skra gaetu profin ekki keyrt thad an DOM og
   thau myndu tha profa AFRIT af formulunni. Sama regla og
   `makeEnricher` i FPL-appinu, thar sem kostnaðurinn vid ad hafa
   hana inni i `cook` var 20 varanlega tomir kassar.
   ============================================================ */

import { computeVbd, tierize, valueVsMarket, blend, availability } from "./model.js";
import { normTeam } from "./names.js";
/* `normPos` ER EINA STADU-VORPUNIN — sja notuna vid `starters` nedar.
   `scoring.js` flytur EKKERT inn, svo thetta byr engan hring. */
import { normPos } from "./scoring.js";

/**
 * Deildarsnid. Sjalfgefid er algengasta uppsetningin.
 * `scoring` raedur HVADA ADP og HVADA spa er lesin — ekki bara
 * hvernig stig eru talin. Ad velja Half PPR en syna PPR-ADP vaeri
 * ad bera saman tvo olika heima.
 */
/**
 * STODURNAR SEM RODIN NAER YFIR — EIN SKRA, EKKI TVAER.
 *
 * Þessi listi var TVISVAR skrifadur inni i `buildRows`, sinn i hvorum
 * hluta fallsins, og thad var einmitt hvernig utilokunin gat verid HALF:
 * annar hlutinn sia0i K/DST ur `aRank` medan hinn sleppti theim inn i
 * threpin. Tvo afrit af sama lista er tvaer utgafur af somu reglu — sama
 * aett og "tvo olik sjalfgefin `rounds`" i advice.js. Ein skra, eitt
 * gildi, og hann er FLUTTUR UT svo profin geti spurt hann.
 */
export const RANKED_POS = ["QB", "RB", "WR", "TE"];

export const DEFAULT_LEAGUE = {
  teams: 12,
  scoring: "ppr",                 // ppr | half-ppr | standard
  starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 },
  superflex: false,
  /* ============================================================
     STODU-THAKID VERDUR AD FYLGJA MED INN I APPID.
     ============================================================
     THAD GERDI THAD EKKI, OG THAD ER VERSTA AETT AF VILLU SEM TIL
     ER HER: **thad sem var maelt var ekki thad sem for i loftid.**

     `scripts/advice-lab.mjs` stadfesti radgjofina i deild med
     `maxPos` (sja `DEFAULT_LEAGUE` i `accuracy.js`, thar sem rokin
     fyrir tolunum standa). Thessi hlutur — deildin sem appid raunve-
     rulega notar — bar hana ekki. `recommend()` sleppir thakinu
     thogult thegar thad vantar, svo lifandi radgjofin var ONNUR en su
     sem var profud.

     MAELT med thvi ad herma 14 umferdir fra saeti 7 a raunverulegu
     bordi dagsins i dag:

       an thaks (thad sem for i loftid)   RB1 WR4 TE5 QB0
       med thaki (thad sem var maelt)     RB3 WR7 TE2 QB2

     Fyrri hopurinn er ekki lakari — hann er ONOTHAEFUR. Fimm tight
     ends thar sem eitt saeti er, og enginn leikstjornandi.

     `rounds` fylgir af somu astaedu: an hennar veit radgjofin ekki
     hve morg vol eru eftir og getur ekki sagt ther ad thu eigir eftir
     ad taka spyrnumann og vorn.

     Vordur: `tests/advice.mjs` kafli 7 fellur ef thessi hlutur
     hættir ad bera somu tolur og hermunardeildin.                */
  maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
  rounds: 15,                     // Sleeper-sjalfgefid: 9 byrjun + 6 bekkur
};

/**
 * ÞVINGAR DEILDINA I GILT SNID — EINN ONYTUR REITUR KOSTAR BARA SIG.
 *
 * ÞETTA VAR RAUNVERULEG VILLA OG HUN VAR VARANLEG. Deildin er lesin
 * ur `localStorage` og DREIFT YFIR sjalfgefnu gildin:
 *
 *   { ...DEFAULT_LEAGUE, ...loadState("league", {}) }
 *
 * Gerdarvordurinn i `loadState` ber saman `typeof` og `Array.isArray`
 * — og HVER hlutur stenst thad prof, thvi sjalfgefna gildid er `{}`.
 * Svo `{"teams":"abc"}` yfirskrifadi goda talningu, `replacementRanks`
 * reiknadi `(st[pos]||0) * "abc"` og HVER EINASTA VBD-tala vard NaN.
 * Blobbid er i vafranum og fer hvergi, svo skjarinn syndi NaN vid
 * HVERJA hledslu — ad eilifu, thangad til notandinn hreinsadi geymslu
 * sem hann veit ekki ad se til.
 *
 * Sama aett og `benchSwaps` i FPL-verkefninu: `{"1":"x"}` er gildur
 * hlutur en `"x".forEach` fellur. **Ytri gerd dugar ekki thegar
 * hluturinn ber hluti.**
 *
 * LAUSNIN ER EKKI AD HENDA VISTUDU ASTANDI. Thad vaeri ad henda
 * raunverulegri deildarstillingu notandans i hvert sinn sem eitt svid
 * er skakkt. Hver reitur er thvingadur FYRIR SIG og fellur i
 * sjalfgefna gildid sitt eitt og ser.
 */
export function normalizeLeague(raw) {
  const L = { ...DEFAULT_LEAGUE };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return L;

  const int = (v, lo, hi) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
  };

  const teams = int(raw.teams, 4, 20);
  if (teams != null) L.teams = teams;

  if (["ppr", "half-ppr", "standard"].includes(raw.scoring)) L.scoring = raw.scoring;

  if (raw.starters && typeof raw.starters === "object" && !Array.isArray(raw.starters)) {
    const st = {};
    for (const [pos, n] of Object.entries(raw.starters)) {
      const v = int(n, 0, 6);
      /* ============================================================
         STODU-HEITID ER ThVINGAD LIKA, EKKI ADEINS TALAN — 20.8.2026
         ============================================================
         Hér stod `st[pos] = v` med heitid OSNERT, og thad var GAT af
         nakvaemlega theirri gerd sem CLAUDE.md kafli 8 lysir: "gilt
         JSON med rangri GERD for ospurt inn i state". Talan var
         thvinguð; heitid var thad ekki.

         AFLEIDINGIN ER ThOGUL OG HUN KOSTAR BYRJUNARSAETI. Deild sem
         ber `starters: { DEF: 1 }` — Sleeper-stafsetningin, sem er thad
         sem `roster_positions` raunverulega inniheldur og thad sem
         eldra vistad astand getur borid — gefur

             mustFill = [{ pos: "DEF", short: 1 }]

         medan HVER ROD i appinu ber `pos: "DST"` (maelt: `players.json`
         ber DST i ollum 32 lidum og ekkert annad). `NextPick` velur
         K/DST-manninn med
             kdst.find((r) => rec.mustFill.some((m) => m.pos === r.pos))
         sem finnur tha ALDREI neinn — svo urskurdurinn nefnir ALDREI
         vorn, `mustFillUrgent` stendur satt til draftsloka, og notandinn
         faer "you still need DEF" i hverju vali og endar med TOMT
         varnar-saeti. Ekkert hrynur og engin tala er rong: stodurnar
         tvaer eru einfaldlega ekki sama strengurinn.

         `normPos` (`scoring.js`) er vorpunin sem PIPELINE-ID SJALFT
         notar thegar thad SKRIFAR `players.json` — ellefu kallstadir i
         `scripts/` (`sources/sleeper.mjs`, `nflverse.mjs`, `adp.mjs`,
         `fantasypros.mjs` …). Ad LESA deildina med somu vorpun er thvi
         ekki ny regla heldur ad spyrja skrifarann. **Þetta er FYRSTI
         kallstadur hennar i `src/`** — hun var oll i pipeline-inu adur.

         OG ÞAD ER AFRIT UTI SEM ER EKKI LAGAD HER: `startersFromRoster`
         (`sleeper-league.js`) ber SINA EIGIN handskrifudu grein
         (`p === "DEF" || p === "DST" || p === "D/ST"`) og kallar EKKI
         `normPos`. Tvo afrit af somu vorpun er sama aett og "tvo olik
         sjalfgefin `rounds`" — thau geta rekid i sundur. Sleeper-leidin
         ber lika `FLEX_KINDS`/`BENCH_KINDS`/`IDP_KINDS` sem `normPos`
         veit ekkert um, svo sameiningin er eigin ferd. SKRAD, EKKI LAGAD.

         LAGT SAMAN, EKKI YFIRSKRIFAD: bæri blob bædi `DEF: 1` og
         `DST: 1` er svarid tvo saeti, sem er thad sama og
         `startersFromRoster` gefur (hun TELUR saetin i fylkinu).

         OG SUMMAN LYTUR SAMA THAKI OG LIDURINN: `int(n, 0, 6)` er
         thakid a EINU sviði, svo `DEF: 6 + DST: 6` verdur 6 — ekki 12.
         An klippingarinnar smygladi samlagningin ser fram hja marki sem
         reiturinn sjalfur setur, og `replacementRanks` margfaldar saeti
         med lidum (12 lid x 12 saeti = 144 DST-threp ur einu blobbi).
         Toluvorn sem gildir per svid en ekki per summu er engin vorn. */
      const key = normPos(pos) || pos;
      if (v != null) st[key] = Math.min(6, (st[key] || 0) + v);
    }
    /* Deild an nokkurs byrjunarsaetis er ekki deild. Fannst ekkert
       nothaeft er sjalfgefna snidid latid standa. */
    if (Object.values(st).some((v) => v > 0)) L.starters = st;
  }

  if (raw.maxPos && typeof raw.maxPos === "object" && !Array.isArray(raw.maxPos)) {
    const mp = {};
    for (const [pos, n] of Object.entries(raw.maxPos)) {
      const v = int(n, 1, 20);
      /* SAMA REGLA OG UM `starters`: thakid er lesid med `p.pos` ur
         rodunum (`advice.js`), svo heiti sem rodirnar bera ekki er thak
         sem bitur aldrei. Hér er thad hins vegar MAX og ekki summa —
         tvo thok a somu stodu er ekki tvofalt thak. */
      if (v != null) mp[normPos(pos) || pos] = Math.max(mp[normPos(pos) || pos] || 0, v);
    }
    if (Object.keys(mp).length) L.maxPos = mp;
  }

  if (Array.isArray(raw.flexPos) && raw.flexPos.every((p) => typeof p === "string")) {
    L.flexPos = raw.flexPos;
  }
  const rounds = int(raw.rounds, 1, 40);
  if (rounds != null) L.rounds = rounds;
  if (typeof raw.superflex === "boolean") L.superflex = raw.superflex;

  return L;
}

/**
 * Byggir leikmannarodirnar.
 *
 * `players`  data/players.json
 * `seasons`  data/seasons.json (valfrjalst — 2025-dalkar)
 * `accuracy` data/accuracy.json (valfrjalst — skorpu bordin)
 * `experts`  data/experts.json (valfrjalst — skorpu bordin)
 * `schedule` data/schedule.json (valfrjalst — SoS)
 */
export function buildRows({ players, seasons, accuracy, experts, schedule, market,
                            league = DEFAULT_LEAGUE, weights = null }) {
  if (!players || !players.length) return { rows: [], meta: { reason: "no data" } };

  const lastBy = indexSeason(seasons, 2025);
  const sharp = buildSharpBoard(accuracy, experts);
  const sos = buildSos(schedule, league, market);

  const scoringKey = league.scoring === "half-ppr" ? "half"
                   : league.scoring === "standard" ? "std" : "ppr";

  const rows = players.map((p) => {
    /* --- markadurinn i RETTU sniði --- */
    /* ============================================================
       ADP RAEDST AF STIGAGJOF, EKKI LIDAFJOLDA — MAELT
       ============================================================
       Lykillinn var `${scoring}_${teams}`, sem gerdi tvennt rangt:
       i 8- og 16-lida deild fannst ENGINN lykill og appid fell thegjandi
       aftur i Sleeper-ADP — tolu ur odru sniði, birta undir heitinu
       "ADP (your league format)".

       En dypri villan var forsendan sjalf. Maelt beint gegn FFC
       10.8.2026: `teams=8`, `10`, `12` og `14` skila NAKVAEMLEGA SOMU
       gognum — sami fjoldi drafta (5.614), sami fjoldi leikmanna (258)
       og somu ADP-tolur upp a aukastaf. `teams=16` skilar Error.
       Gognin a disknum stadfesta thad lika: `ppr_10`, `ppr_12` og
       `ppr_14` eru byte-eins.

       FFC HUNSAR LIDAFJOLDANN. Stigagjofin er hins vegar raunveruleg
       (Gibbs 1,7 i PPR gegn 1,6 i standard; Chase i 4. saeti i PPR en
       Taylor i standard). Lykillinn er thvi a stigagjof — og tha er
       ekkert tapad i 8- eda 16-lida deild, THVI THAR VAR ALDREI NEITT
       AD SAEKJA.

       Gamla snidid er lesid afram: skrar sem eru thegar a disknum bera
       `ppr_12`, og ny keyrsla skrifar `ppr`. */
    const ffcTable = p.adpFfc || {};
    const ffc = ffcTable[league.scoring]
      || ffcTable[`${league.scoring}_12`]
      || ffcTable[Object.keys(ffcTable).find((k) => k.startsWith(`${league.scoring}_`)) || ""]
      || null;
    const adpSleeper = scoringKey === "half" ? p.adpSleeperHalf
                     : scoringKey === "std" ? p.adpSleeperStd
                     : p.adpSleeper;
    /* ============================================================
       ADP: FFC, ANNARS SLEEPER. **ESPN ER EKKI LENGUR I KEDJUNNI.**
       ============================================================
       Rodin er ekki handahof: FFC ber urtaksstaerd (raunveruleg droft i
       rettri staerd), Sleeper er retti vettvangurinn.

       ESPN VAR THRIDJI HLEKKURINN OG HANN SKILADI ADEINS TILBUNINGI.
       ESPN gefur leikmanni sem ER ALDREI DRAFTADUR sinn eigin
       `averageDraftPosition` — sentinel um 170 med orlitlum flokti
       (169,88–170,96), thvi talan er MEDALTAL: madur sem er tekinn einu
       sinni og oskrifadur i 99 deildum lendir a 169,95.

       MAELT 18.8.2026 a `data/players.json`:
         · 982 leikmenn bera `adpEspn`; **799 (81%) liggja i [169, 171]**
         · thar a medal **Joe Flacco, Frank Gore, Philip Rivers,
           Marcedes Lewis, Justin Tucker** — menn sem eru ekki i NFL.
           Sentinel, ekki verd.
         · thettleikinn er 4–8 leikmenn per 5 stiga bil nedan vid 165 og
           **630 i bilinu 165–170**. Ekki throskuldur sem eg valdi;
           fasaskipti sem maelist.

       OG HLEKKURINN VAR TOMUR AF RAUNVERULEGU VERDI — ThAD ER RODIN SEM
       AFGREIDIR SPURNINGUNA AN ThROSKULDS. I badum deildarlogunum
       (10-lida PPR og 12-lida half) tok `adp` gildi ur ESPN i
       **654 / 677** rodum og **NULL af theim var undir 165**: hver
       leikmadur sem ESPN VEIT raunverulega draftstodu a er lika
       thekktur hja FFC eda Sleeper. Ad taka ESPN ut kostar thvi
       **nakvaemlega enga** raunverulega tolu og fjarlaegir 654
       tilbuningsverd.

       AFLEIDINGIN VAR RAUNVERULEG A SKJANUM: `valueVsMarket` las
       sentinel-inn sem markadsverd, svo **Darren Waller (TE) bar
       "+3,4 umferdir" KAUP** — og `adpSd` er `null` hja ollum
       ESPN-rodum (0 af 654), svo lifunarlikurnar keyrdu
       `1,08*sqrt(ADP)`-varaleidina a tilbuinni tolu og bordid litadi
       hann eftir henni.

       ThETTA ER SAMA HLID OG `sane()` I `scripts/sources/espn.mjs`:
       ESPN-spa yfir threfoldu meti er ekki lagfaerd heldur SLEPPT. Og
       Sleeper-hlidin er ThEGAR til — `adpSleeper`-nótan i columns.js
       segir "Tomgildi (999/400) eru fjarlaegd". Ein heimild var skoluð
       og hin ekki.

       `adpEspn` STENDUR AFRAM SEM SITT EIGID SVID og sinn eigin dalkur:
       thad er ESPN-talan orðrétt, undir nafni ESPN, og nótan segir nu
       ad sentinel-inn se i henni. Vordur: `tests/pipeline.mjs`.       */
    const adp = ffc ? ffc.adp : (adpSleeper ?? null);

    /* --- SPAIN: SLEEPER EIN, EKKI BLANDA ---

       MAELT (scripts/model-lab.mjs, walk-forward 2022-2025):
       Sleeper-spain er sterkasta einstaka heimildin sem til er —
       rho 0,695 a moti 0,458 hja ADP og 0,522 hja FantasyPros-ECR.

       OG SERHVER TILRAUN TIL AD BAETA HANA GERDI HANA VERRI:
         Sleeper ein                 1920,7
         Sleeper + tolfraedi         1831,1
         Sleeper + ADP (rodublanda)  1735,3
         ADP ein                     1747,9
       Fyrsta utgafa thessarar skrar blandadi Sleeper vid ESPN med
       vog 1,0/0,8. Su blanda var AGISKUN og maelingin segir ad hun
       thynni sterkasta merkid med veikara.

       ESPN er thvi ADEINS VARALEID thegar Sleeper thegir — ekki
       medvog. Thad er munur sem sest ekki i tolunni en sest i
       utkomunni.                                                    */
    const projSleeper = scoringKey === "half" ? p.projSleeperHalf
                      : scoringKey === "std" ? p.projSleeperStd
                      : p.projSleeper;
    const b = projSleeper != null
      ? { value: projSleeper, used: ["sleeper"], coverage: 1, spread: null }
      : blend([
          /* ESPN-spain er i THEIRRA stigagjof og er thvi adeins notud i
             PPR-sniði. Ad umreikna hana an hra-fylkja vaeri agiskun sem
             liti ut eins og maeling. */
          { key: "espn", value: scoringKey === "ppr" ? p.projEspn : null, weight: 1 },
        ]);

    const last = lastBy.get(p.gsisId) || null;
    const sh = sharp.ranks.get(p.fpId) ?? null;
    const s = sos.get(p.team) || null;

    return {
      id: p.id, gsisId: p.gsisId, fpId: p.fpId, espnId: p.espnId,
      name: p.name, pos: p.pos, team: p.team, bye: p.bye,
      age: p.age, exp: p.exp, headshot: p.headshot,
      rookie: p.rookie, depth: p.depth,
      /* MERKIMIDINN FYLGIR TOLUNNI: `availability` tekur nu THA
         STRANGARI af `status`/`injury` (sja notuna thar), svo
         merkimidinn verdur ad koma ur SOMU akvordun. Adur bar rodin
         "Questionable" medan talan var 0 — tvaer sogur um sama mann. */
      injury: (() => {
        const a = availability(p.status, p.injury);
        if (p.injury && p.status
            && availability(null, p.injury) !== a
            && availability(p.status, null) === a) return p.status;
        return p.injury || p.status || null;
      })(),
      injuryNote: p.injuryNote,
      avail: availability(p.status, p.injury),

      proj: b.value,
      projSpread: b.spread,
      projSources: b.used,
      projFallback: projSleeper == null && b.value != null,

      adp, adpSleeper, adpEspn: p.adpEspn,
      auctionEspn: p.auctionEspn, ownedEspn: p.ownedEspn,
      trendAdd: p.trendAdd, trendDrop: p.trendDrop,
      adpSd: ffc ? ffc.sd : null,
      adpHigh: ffc ? ffc.high : null, adpLow: ffc ? ffc.low : null,
      adpTimes: ffc ? ffc.times : null,

      /* ECR FYLGIR STIGAGJOFINNI, EINS OG ADP GERIR.
         Flata `ecr`-svidid er PPR; `ecrByScoring` ber hvert snid fyrir
         sig (sja notuna i fetch-nfl.mjs). Vantad snid fellur i flata
         svidid — eldri gagnaskra a disknum ber ekki toflunna enn, og
         tha er PPR-talan retta svarid fyrir PPR-deild og naesta besta
         fyrir hinar, tho hun se ekki nakvaem. */
      ...(() => {
        const key = league.scoring === "half-ppr" ? "half" : league.scoring;
        const e = (p.ecrByScoring && p.ecrByScoring[key]) || null;
        return {
          ecr: e ? e.ecr : p.ecr,
          ecrTier: e ? e.tier : p.ecrTier,
          ecrSd: e ? e.sd : p.ecrSd,
          ecrBest: e ? e.best : p.ecrBest,
          ecrWorst: e ? e.worst : p.ecrWorst,
          ecrPosRank: e ? e.posRank : p.ecrPosRank,
          ecrScoring: e ? key : (p.ecr != null ? "ppr" : null),
        };
      })(),
      sharpRank: sh,
      /* Jakvaett = skorpu bordin eru HAERRI a honum (laegri tala) en
         samsteypan. Ad snua thessu vid er audvelt og banvaent, thvi
         merkid les ofugt an thess ad nokkud brotni. */
      sharpDelta: sh != null && p.ecr != null
        ? Math.round((p.ecr - sh) * 10) / 10 : null,

      lastPpg: last ? last.ppg : null,
      lastPts: last ? last.ppr : null,
      lastGames: last ? last.g : null,
      lastBoom: last ? last.boom : null,
      lastBust: last ? last.bust : null,
      lastTgt: last ? last.tgt : null,
      lastTshare: last ? last.tshare : null,
      lastWopr: last ? last.wopr : null,
      lastTeam: last ? last.team : null,

      sos: s ? s.all : null,
      playoffSos: s ? s.playoff : null,
      teamScored: s ? (s.scored ?? null) : null,
      defRank: s ? (s.allowedRank ?? null) : null,
    };
  });

  /* --- VBD og threp, reiknad A SIADA MENGINU ---
     VBD er skilgreint gagnvart varamanni Í ÞINNI DEILD, svo thad
     verdur ad reiknast eftir ad deildarsnid er thekkt. Ad reikna
     thad i pipeline-inu vaeri ad negla eina deildarstaerd. */
  const withVbd = computeVbd(rows, league);

  /* ============================================================
     ÞVERSTODU-ÞREPIN VORU BLONDUD — UTILOKUNIN A K/DST VAR HALF
     ============================================================
     `aRank`, `rank` og `value` eru **null** hja K/DST (sja `RANKED_POS`
     nedar og rokin thar: their voru utan HVERRAR hermunar sem stadfestir
     rodina). En `tierize` var kolluð yfir OLL vbd-gildi, og threpaskilin
     eru reiknud UR DREIFINGU BILANNA (`cut = medaltal + sd`), svo 76
     K/DST-gildi i midjunni faerdu throskuldinn — og thar med threp
     raunverulegra leikmanna.

     MAELT 18.8.2026 a raunbordi i 10-lida PPR-deild notandans (sem HEFUR
     bædi K- og DST-saeti, svo hin lagfaeringin — README 4b, `repl[pos]
     === 0 -> null` — sneri ekki vid thessu):

       James Cook    aRank  8 · VBD 90,9 · threp **7** i stad **6**
       De'Von Achane aRank 10 · VBD 87,5 · threp **8** i stad **7**

     TVEIR AF 1.067, OG BADIR I TOPP TIU. Þad er ekki tilviljun: bilin
     eru staerst i toppnum, svo throskuldur sem hnikast hittir einmitt
     thar sem threpaskil eru raunverulega tekin alvarlega.

     HVERS VEGNA PROFID SA THETTA EKKI: `tests/model.mjs` kafli 8 (c)
     profadi threpa-hreinleikann ADEINS a deildar-logun AN K/DST — thar
     sem `vbd` theirra er hvort eð er null, svo threpid verdur null af
     sjalfu ser. Fullyrdingin gat ekki brugdist i thvi formi. Kafli (b)
     i sama prof byggir logun MED K/DST og profar VBD theirra, en ekki
     threpin. **Tvaer helftir sem hvorug spurdi.** Sama aett og
     `NextPick`-thakid, sem var graent i hverju profi thvi hvert prof gaf
     deild og drafti SOMU logun.

     LAGFAERINGIN ER SAMKVAEMNI, EKKI NY TALA: threp eru reiknud a somu
     laug og rodin sem their tilheyra, og K/DST fa **null** — eins og
     `rank`, `aRank` og `value`. `posTier` theirra stendur oskert (hann
     er INNAN stodu og smitast ekki), og thad er talan sem svarar
     einhverju um vorn.

     `computeVbd` ER RETT SEM HUN ER og ma ekki "lagfaerast" i somu att:
     varamanns-gildin eru PER STODU, svo K/DST hafa engin ahrif a VBD
     annarra (maelt: 0 leikmenn af 1.067 haggast se theim hent ur
     lauginni). Og deild sem HEFUR K-saeti hefur raunverulegan
     K-varamann; ad nulla thad vaeri ad henda stodu sem deildin ber.
     Vordur: `tests/model.mjs` kafli 8c-2.                            */
  const tierPool = withVbd.map((r) =>
    (RANKED_POS.includes(r.pos) ? r.vbd : null));
  const tiers = tierize(tierPool);
  withVbd.forEach((r, i) => { r.tier = tiers[i]; });

  /* THREP INNAN STODU — ONNUR SPURNING, ONNUR TALA.
     `tier` er thvert a stodur og er rett a draft-bordinu, thvi thar
     er valid thvert a stodur. En SKORTSTADAN spyr annars: "hve
     margir RB1 eru eftir?" Med thversto0u-threpum byrjadi QB-listinn
     i "threpi 7" og TE i "threpi 6", sem svarar engri spurningu sem
     nokkur draftari spyr.
     Threpad er per stodu ur VBD innan theirrar stodu. */
  for (const pos of ["QB", "RB", "WR", "TE", "K", "DST"]) {
    const inPos = withVbd.filter((r) => r.pos === pos);
    if (inPos.length < 4) { for (const r of inPos) r.posTier = null; continue; }
    const t = tierize(inPos.map((r) => r.vbd), { maxTiers: 10 });
    inPos.forEach((r, i) => { r.posTier = t[i]; });
  }

  /* ============================================================
     A-RANKING = spa Sleeper -> VIRDI YFIR VARAMANNI i THINNI deild.

     TVAER FULLYRDINGAR OG THAER HAFA OLIKAN STYRK. Thad ma ekki
     rugla saman.

     (1) GEGN ADP ER HUN MARKTAEKT BETRI.
         Walk-forward 2021-2025, 12-lida snakk, oll 12 saetin:
           A-Ranking 1988,6  ·  ADP 1755,0  =  +233,6
         Vinnur OLL FIMM arin. Bootstrap klosad per timabil utilokar
         null. Thetta er fullyrding sem stenst.

     (2) GEGN SLEEPER-RODINNI ER HUN LIKLEGA BETRI EN OSONNUD.
           adskilin droft      +75,7   vinnur 3/5 ar
           beint einvigi       +59,9   vinnur 3/5 ar, 57,2% af
                                       3.000 einvigum
         Punktmatid er JAKVAETT i hverri einustu hermun sem var
         reynd, en ars-sveiflan (+169, -50, -43, +48, +176) er
         margfalt staerri en munurinn. Vikmorkin utiloka EKKI null.

         MAELT I `arank-lab.mjs`: med thessari ahrifastaerd og thessu
         flakti thyrfti **13 timabil** til ad na marktaekni. Vid eigum
         FIMM — thau einu thar sem Sleeper-spain er ekki menguð af
         utkomunni (sja leka-hlidid i build-features).

     VIDMOTID VERDUR AD BERA THENNAN MUN. Fyrsta utgafa thessarar
     notu sagdi "slaer ADP um +228 OG Sleeper um +55, vinnur oll
     fjogur arin" i einum andardraetti, eins og badar fullyrdingar
     hefdu sama styrk. Su fyrri er maeld; su sidari er von.

     HVERS VEGNA THETTA VIRKAR: Sleeper spair STIGUM vel en radar
     eftir hrastigum. Draft snyst ekki um stig heldur um hvad thu
     faerd UMFRAM tha sem eru enn lausir a somu stodu. 300 stig fra
     leikstjornanda eru minna virdi en 300 fra hlaupara thvi
     QB-brekkan er flot. Umreikningurinn er allt framlagid — vid
     spaum ekki betur en Sleeper, vid spyrjum rettu spurningarinnar.

     TAKID EFTIR: rho A-Ranking er LAEGRA en hja Sleeper (0,604 a
     moti 0,695) en akvordunin er BETRI. Thad er sama regla og i
     FPL-verkefninu: haerri fylgni er ekki sama og betri akvordun.
     ============================================================ */
  /* SPYRNUMENN OG VARNIR ERU UTAN A-RANKING — OG THAD ER EKKI
     SMEKKUR HELDUR SAMKVAEMNI.

     Hermunin sem rettlaetir A-Ranking (`accuracy.js`, `model-lab.mjs`,
     `strategy-lab.mjs`) SLEPPTI K og DST alveg: `excludePos`. Ad rada
     theim sidan inn i sama lista vaeri ad birta tolu sem ENGIN maeling
     styður, vid hlidina a tolum sem eru maeldar, an thess ad greina
     thar a milli.

     Og talan yrdi rong i reynd. VBD segir DST1 vera i ~77. saeti
     (spa 106 gegn 87 hja DST12 = VBD 19), sem myndi thyda vorn i 7.
     umferd. Enginn draftar svona, og astaedan er utan likansins:
     varnir eru afar sveiflukenndar milli vikna og haegt er ad skipta
     um thaer vikulega, svo vaenta forskotid heldur ekki. VBD tekur
     spana sem vissu.

     Their eru thvi MED i skranni og fa sitt VBD, en `aRank` er
     **null** hja theim og radgjofin snertir tha ekki. Vidmotid ma
     birta tha ser — thad er RETT — en ekki i rodinni sem er maeld. */
  const ranked = withVbd.slice()
    .filter((r) => r.vbd != null && RANKED_POS.includes(r.pos))
    .sort((a, b) => b.vbd - a.vbd);
  const ourRank = new Map(ranked.map((r, i) => [r.id, i + 1]));
  for (const r of withVbd) {
    r.rank = ourRank.get(r.id) ?? null;
    r.aRank = r.rank;
    /* Merkt svo vidmotid geti sagt fra thvi frekar en ad syna eydu. */
    r.unranked = !RANKED_POS.includes(r.pos) ? "K and DST were excluded from every simulation that validates this order" : null;
    /* Hvad segir A-Ranking umfram hvora heimild fyrir sig? */
    r.vsSleeperRank = null;                 // fyllt ad nedan
  }

  /* `value` KREFST ANNARS UMFERDS — GRUNNURINN VAR SITTHVOR.
     Sja `valueColumn` nedar. `r.rank` verdur ad vera fyllt A OLLUM
     rodum adur en hann er talinn, svo thetta getur ekki verid i sama
     lykkju og rodin sjalf. */
  const valMap = valueColumn(withVbd, league.teams);
  /* ============================================================
     `valueOutside` — UTAN DROFTSINS. MAELT 24.8.2026.
     ============================================================
     Talan er RETT eftir grunn-lagfaeringuna, lika fyrir mann sem
     markadurinn tekur i vali 389 i drofti sem ber 168 vol. En "umferd
     25" er ekki til, og MAELT a raunbordinu i dag voru **8 af topp 20**
     kaupum i 10-lida deildinni og **12 af topp 20** i theirri 12-lida
     UTAN gluggans — nanast allt thettendar (Jonnu Smith, ADP 389, las
     "+5,25 umferdir KAUP").

     `scripts/valuecap-lab.mjs` maeldi hvort graena merkid eigi ser stod
     thar. Svarid er ThRIThAETT og thad skiptir mali:
       · INNAN gluggans stenst dalkurinn sitt eigid prof — delta gegn
         plasebo (SAMA `adp'`, umrodud rod) utilokar null i **3 af 3**
         frumum (+0,202 / +0,214 / +0,133).
       · UTAN hans er punktmatid HAERRA (+0,482 / +0,310 / +0,416) en
         **0 af 3** vikmarkabil utiloka null — laugin er 18-136 menn.
       · Thad er thvi hvorki "merkid er daudt" ne "merkid er gott",
         heldur VID GETUM EKKI SAGT.

     ADGERDIN SEM ThAD STYDUR: hvorki eyda tolunni (engin maeling segir
     hana ranga) ne mala hana graena (engin maeling styður
     fullyrdinguna). Talan stendur; FULLYRDINGIN er dregin til baka —
     nakvaemlega sama regla og `avail === 0` beitir thegar i
     `DraftBoard.jsx`.

     HRA FYLGNIN VAR VELRAEN OG FYRSTA UTGAFA LABSINS FELL A ThVI:
     `value` og raun-utkoman deila lidnum `adp'`, sem sveiflast miklu
     meira utan gluggans, svo hra `r` MAELDIST HAERRA UTAN (0,54 a moti
     0,51) — nidurstada sem hefdi lokad spurningunni rangt. Plasebo sem
     heldur `adp'` obreyttu og umrodar adeins okkar rod tekur mengunina
     ut.

     `rounds` ER LESID, EKKI VALID (`normalizeLeague`, Sleeper
     `settings.rounds`). Se thad sjalfgefna talan 15 er glugginn
     Sleeper-sjalfgefinn en ekki hans deild — OG ThAD ER OSKADLEGT HER,
     thvi adgerdin er ADEINS AD DRAGA FULLYRDINGU TIL BAKA. Rangur
     gluggi getur haldid aftur af graenu merki sem atti rett a ser; hann
     getur ALDREI buid til merki sem a thad ekki. Ottinn i uttektinni
     ("thak vid `rounds` er valin tala") a vid um ad EYDA tolunni, sem
     er einmitt thad sem er ekki gert.                                */
  const draftPicks = league.rounds != null ? league.teams * league.rounds : null;
  for (const r of withVbd) {
    r.value = valMap.get(r.id) ?? null;
    r.valueOutside = draftPicks != null && r.adp != null && r.adp > draftPicks;
  }

  /* Rod Sleeper eftir HRASTIGUM — til ad syna hvar VBD faerir mann. */
  const slpRanked = withVbd.slice()
    .filter((r) => r.proj != null && RANKED_POS.includes(r.pos))
    .sort((a, b) => b.proj - a.proj);
  const slpRank = new Map(slpRanked.map((r, i) => [r.id, i + 1]));
  for (const r of withVbd) {
    const s = slpRank.get(r.id);
    r.sleeperRank = s ?? null;
    r.vsSleeperRank = s != null && r.rank != null ? s - r.rank : null;
  }

  return {
    rows: withVbd,
    meta: {
      league,
      sharpMeasured: sharp.measured,
      sharpBoards: sharp.count,
      sharpRule: sharp.rule,
      withProj: withVbd.filter((r) => r.proj != null).length,
      withAdp: withVbd.filter((r) => r.adp != null).length,
      withEcr: withVbd.filter((r) => r.ecr != null).length,
      withLast: withVbd.filter((r) => r.lastPpg != null).length,
    },
  };
}

/* ============================================================
   `value` BAR TVAER RADIR A SITTHVORUM GRUNNI — MAELT 24.8.2026
   ============================================================
   Talan var `(adp - rank) / teams`, og thad ER retta formulan — en
   HUN VAR MATUD MED TVEIMUR TOLUM SEM TELJA EKKI THAD SAMA:

     `r.rank` er ThETT ROD yfir ADEINS thaer radir sem hafa BAEDI spa
       og stodu i `RANKED_POS` — **556 af 1.175**. K og DST eru utan
       (rokin eru fjorum tugum lina hér ofar), og skilamadur an spar
       fellur lika ut thvi `vbd` verdur null.
     `r.adp` er ALGJOR draftstada markadarins yfir ALLA — spyrnumenn,
       varnir og hvern skilamann sem einhver draftar, hvort sem vid
       rodum honum eda ekki.

   Hver leikmadur sem markadurinn verdleggur en rodin sleppir hlidrar
   thvi `adp` UPP an ad hlidra `rank`, og mismunurinn — sem er ALLTAF
   lesinn sem KAUP — vex um 1/teams af umferd fyrir hvern thann mann.

   MAELT A RAUNGOGNUM (`data/players.json`, 1.175 radir), badar
   deildirnar sem appid ber:

     237 radir bera ADP en enga rod. Their eru TVENNS KONAR:
       · 77 K/DST — utilokadir af `RANKED_POS` (DST fra ADP 89, K 130)
       · 160 skilamenn an Sleeper-spar — `proj` null -> `vbd` null
         (WR 69, RB 36, TE 35, QB 20; naer allir ADP 227+)

     MIDGILDI OFMATSINS      10-lida PPR      12-lida half
       ADP <= 120              **+0,00**        **+0,00**
       ADP > 120               **+2,80**        **+2,50**
       innan droftsins         **+0,00**        **+0,00**
         (<=150 / <=180 pikk)   (mest +1,40)     (mest +2,00)
       utan droftsins           +3,40            +3,33
       MEST                    **+20,90**       **+17,33**

   AF THVI SEST HVERS VEGNA THETTA LIFDI: innan droftsins er
   midgildid **NAKVAEMLEGA NULL** og haesta skekkjan 1,4 umferdir.
   Bilunin er OLL i djupinu — thar sem 70 af theim 160 spalausu
   liggja — og thangad horfir enginn fyrr en i 14. umferd.

   OG HUN LAUG UM STODU: gamla topp-8 kauplistinn i 10-lida deildinni
   var **sex TE-ar i ADP 224-251**, thad er ad segja menn sem ENGINN
   draftar i 150-pikka drofti. Colby Parkinson las **+5,34 umferdir
   KAUP**; a rettum grunni er hann **-1,16** — formerkid snyst.
   26 af 267 rodum snua formerki (33 af 255 i 12-lida). Eftir
   lagfaeringuna er topp-8 listinn Kincaid (ADP 149), LaPorta (100),
   Kittle (118), Andrews (127) — menn sem raunverulega eru draftadir.

   ThETTA ER SAMA GERD OG ESPN-SENTINELINN sem let Darren Waller bera
   "+3,4 umferdir KAUP" (sja notuna vid `adp` ofar): graent kaupmerki
   reiknad ur tolu sem er ekki verd. Thar var VERDID tilbuningur;
   hér er GRUNNURINN rangur. Bædi endar i sama graena dalki.

   LAGFAERINGIN ER GRUNNURINN, EKKI FORMULAN. `valueVsMarket` er
   ohreyfd (hun er rett, og `tests/model.mjs` ber sex fullyrdingar um
   hana): vid faerum MARKADSSTODUNA a grunn rodarinnar med thvi ad
   draga fra thann fjolda manna sem markadurinn tekur A UNDAN honum
   en rodin okkar rodar ekki. Talan segir tha ordrett: *hve morgum
   umferdum sidar en okkar rod tekur markadurinn hann, thegar BADAR
   radir telja adeins thad sem vid rodum.*

   HVERS VEGNA ALLIR 237 OG EKKI ADEINS K/DST: ad draga adeins
   spyrnumenn og varnir fra vaeri ad fullyrda ad hinir 160 spalausu
   sitji OFAN vid hann i okkar rod — og vid hofum enga spa um tha,
   svo thad er agiskun eins og hin. Ad draga tha ALLA fra er hins
   vegar fullyrding sem tharf enga agiskun: hun telur baedi radirnar
   yfir sama mengi. Talan verdur throngari; hun verdur ekki gisk.

   ThAD SEM ER **EKKI** LAGFAERT HER, OG ThAD ER ASETT: hvort `value`
   eigi ad vera **null** utan droftsins (ADP > teams x rounds). Eftir
   grunn-lagfaeringuna er talan thar RETT — Parkinson fellur virkilega
   fimm umferdum sidar en rodin segir — en "umferd 25" er ekki til i
   15-umferda drofti. Ad negla thak vid `rounds` er hins vegar VALIN
   tala (og `buildRows` er kallad an `rounds` i profunum), svo hun
   krefst sinnar eigin maelingar. Uttekt, atridi 5, stendur opid.

   VORDUR: `tests/audit.mjs` kafli 4 — SKILGREININGIN er flutt inn
   hédan, ekki afritud, OG thrju obundin akkeri: engin hlidrun undir
   fyrsta sleppta ADP-inu, hlidrunin er aldrei UPP, og hun BITUR.
   ============================================================ */
/**
 * `value` fyrir hverja rod, a EINUM grunni. Skilar Map(id -> tala|null).
 * `rows` verda ad hafa `rank` (og `adp`) thegar thetta er kallad.
 */
export function valueColumn(rows, teams = 12) {
  /* ADP-in sem markadurinn verdleggur en rodin sleppir, i rod.
     Fost rod (ADP, svo id) svo talningin se endurgeranleg. */
  const omitted = rows
    .filter((r) => r.adp != null && r.rank == null)
    .map((r) => r.adp)
    .sort((a, b) => a - b);
  /* Hve margir theirra fara A UNDAN `adp`? Helmingunarleit. */
  const aheadOf = (adp) => {
    let lo = 0, hi = omitted.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (omitted[m] < adp) lo = m + 1; else hi = m; }
    return lo;
  };
  const out = new Map();
  for (const r of rows) {
    out.set(r.id, r.rank == null || r.adp == null
      ? null
      : valueVsMarket(r.rank, r.adp - aheadOf(r.adp), teams));
  }
  return out;
}

/* ---------- hjalparfoll ---------- */

function indexSeason(seasons, year) {
  const m = new Map();
  if (!seasons) return m;
  for (const s of seasons) if (s.season === year) m.set(s.id, s);
  return m;
}

/**
 * Velur skorpu-hopinn UR FERLI, ekki ur einu ari.
 *
 * MAELT (`expert-persistence.mjs`, 11 ar, 2015-2025): rod
 * serfraedinga flyst milli ara med rho 0,370 og EKKERT af 10 parum
 * er neikvaett — hun er thvi raunveruleg, en veik. Eitt ar er thess
 * vegna slaemur valari: efsti madur eins ars er oft midlungs naesta.
 * Besta reglan sem maeldist er MIDGILDI percentila, lagmark 4 ar.
 *
 * ÞRJU SKILYRDI, OLL MAELD:
 *   1. >= MIN_YEARS ar af nakvaemni — annars er "ferillinn" eitt ar.
 *   2. Birti I FYRRA. Sa sem er haettur er onothaefur hversu godur
 *      sem hann var (Joseph Dolan a besta midgildi allra og birti
 *      sidast 2019). Thetta uppgotvadist thegar K=1 skiladi ENGU
 *      bordi i sex arum af sjo.
 *   3. Ad taka ut versta arid var maelt og er MAELANLEGA VERRA —
 *      midgildi ther thegar thad hlutverk. Ekki baeta thvi vid.
 *
 * FALLBACK: an sogu er gamla reglan notud (nulldreifing eins ars).
 * Hun er verri en hun er ekki rong, og hun heldur dalkinum lifandi
 * fyrstu keyrsluna eftir uppfaerslu adur en sagan er sott.
 */
const SHARP_MIN_YEARS = 4;
const SHARP_TOP = 15;

function pickSharpIds(accuracy, experts) {
  const hist = experts && experts.accuracyHistory;
  const years = hist ? Object.keys(hist).map(Number).sort((a, b) => a - b) : [];
  if (years.length >= SHARP_MIN_YEARS) {
    const last = years[years.length - 1];
    const active = new Set((hist[last] || []).map((r) => String(r.id)));
    const by = new Map();
    for (const y of years) {
      const rows = hist[y] || [];
      const n = rows.length || 1;
      for (const r of rows) {
        const k = String(r.id);
        if (!by.has(k)) by.set(k, []);
        /* Percentill, ekki hra rod: fjoldi serfraedinga breytist milli
           ara (60 -> 215), svo rod 20 er ekki sama frammistada 2016 og
           2025. Hra rod vaeri thvi ad verdlauna thann sem maetti thegar
           faerri kepptu. */
        by.get(k).push((r.r / n) * 100);
      }
    }
    const med = (a) => {
      const t = a.slice().sort((x, y) => x - y), h = t.length >> 1;
      return t.length % 2 ? t[h] : (t[h - 1] + t[h]) / 2;
    };
    const picked = [...by.entries()]
      .filter(([id, v]) => v.length >= SHARP_MIN_YEARS && active.has(id))
      .map(([id, v]) => [id, med(v)])
      .sort((a, b) => a[1] - b[1])
      .slice(0, SHARP_TOP)
      .map(([id]) => Number(id));
    if (picked.length >= 4) return { ids: picked, rule: "career" };
  }
  if (!accuracy || !accuracy.nullDist) return { ids: [], rule: "none" };
  const { mean, p95 } = accuracy.nullDist;
  const cut = p95 ?? mean;
  return {
    ids: (accuracy.experts || [])
      .filter((e) => e.kind !== "benchmark" && e.draft && e.draft.mean > cut)
      .map((e) => e.id),
    rule: "single-season",
  };
}

export function buildSharpBoard(accuracy, experts) {
  const empty = { ranks: new Map(), measured: false, count: 0, ids: [], rule: "none" };
  if (!experts || !experts.boards) return empty;

  const { ids: good, rule } = pickSharpIds(accuracy, experts);
  if (!good.length) return empty;

  const goodSet = new Set(good);
  const sum = new Map(), cnt = new Map();
  for (const b of experts.boards) {
    if (!goodSet.has(b.id)) continue;
    for (const [fp, rank] of Object.entries(b.ranks)) {
      sum.set(fp, (sum.get(fp) || 0) + rank);
      cnt.set(fp, (cnt.get(fp) || 0) + 1);
    }
  }
  const used = [...new Set([...cnt.keys()])];
  if (!used.length) return empty;

  /* Adeins leikmenn sem MEIRIHLUTI skorpu bordanna nefnir. Annars
     raedur eitt bord rod leikmanns sem hin slepptu — og tha er
     "skorpu samsteypan" bara sa eini serfraedingur. */
  const nBoards = experts.boards.filter((b) => goodSet.has(b.id)).length;
  const minCnt = Math.max(2, Math.ceil(nBoards * 0.5));
  const pairs = used
    .filter((fp) => cnt.get(fp) >= minCnt)
    .map((fp) => [fp, sum.get(fp) / cnt.get(fp)])
    .sort((a, b) => a[1] - b[1]);

  return {
    ranks: new Map(pairs.map(([fp], i) => [fp, i + 1])),
    measured: true,
    count: nBoards,
    ids: good,
    rule,
  };
}

/**
 * Motstodu-styrkur: medal vaent stigaskor ANDSTAEDINGANNA.
 *
 * VARNAGLI SEM VERDUR AD FYLGJA TOLUNNI ALLA LEID I VIDMOTID:
 * maelingin i `calibrate.mjs` syndi ad "vorn gegn stodu" baetir
 * ferskekkju um **0,13%**. SoS er thvi jafntefla-brjotur, ekki
 * rodunar-thattur. Dalkurinn er hafdur INNI thvi notendur spyrja um
 * hann, en notan segir hvad hann er.
 *
 * I FORLEIK ERU FLESTIR LEIKIR AN LINU (337 af 557 hofdu linu 9.8.).
 * Lid an lina fær `null`, EKKI medaltalid — "vitum ekki" er ekki
 * "medal-erfitt".
 */
export function buildSos(schedule, league, market = null) {
  const out = new Map();

  /* MARKADURINN FYRST, nflverse SEM VARALEID.
     nflverse-skrain ber adeins linur fyrir hluta leikja i forleik
     (337 af 557 maelt 9.8.2026) medan ESPN birtir DraftKings-linur
     fyrir 270 af 272 leikjum strax. Ad nota nflverse eina gaefi
     tveimur thridju lida `null` i motstodu-styrk akkurat thegar
     notandinn er ad drafta. */
  if (market && market.teams && market.teams.length >= 30) {
    for (const t of market.teams) {
      out.set(t.team, {
        all: t.allowed, playoff: t.playoffAllowed,
        games: t.games, scored: t.scored,
        allowedRank: t.allowedRank, scoredRank: t.scoredRank,
        source: "market",
      });
    }
    return out;
  }

  if (!schedule) return out;
  const season = Math.max(...schedule.map((g) => g.season));
  const games = schedule.filter((g) => g.season === season && g.type === "REG");

  const byTeam = new Map();
  for (const g of games) {
    if (g.total == null || g.spread == null) continue;
    const home = g.total / 2 + g.spread / 2;
    const away = g.total / 2 - g.spread / 2;
    /* SAMRAEMT VID LESTUR — `schedule.json` ber `LA` medan `players`
       ber `LAR`; sja notuna i `weekview.js`. Þessi leid er gátud af
       `market.teams` i dag, en varaleidin ma ekki vera gotótt: an
       thessa fengu ALLIR 22 Rams-leikmenn null SoS (maelt). */
    push(byTeam, normTeam(g.home), { week: g.week, oppImplied: away });
    push(byTeam, normTeam(g.away), { week: g.week, oppImplied: home });
  }
  for (const [team, list] of byTeam) {
    const all = list.map((x) => x.oppImplied);
    const po = list.filter((x) => x.week >= 15 && x.week <= 17).map((x) => x.oppImplied);
    out.set(team, {
      all: all.length ? round2(avg(all)) : null,
      playoff: po.length ? round2(avg(po)) : null,
      games: all.length, source: "nflverse",
    });
  }
  return out;
}

function push(m, k, v) { if (!k) return; (m.get(k) || m.set(k, []).get(k)).push(v); }
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round2 = (x) => Math.round(x * 100) / 100;
