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

/**
 * Deildarsnid. Sjalfgefid er algengasta uppsetningin.
 * `scoring` raedur HVADA ADP og HVADA spa er lesin — ekki bara
 * hvernig stig eru talin. Ad velja Half PPR en syna PPR-ADP vaeri
 * ad bera saman tvo olika heima.
 */
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
      if (v != null) st[pos] = v;
    }
    /* Deild an nokkurs byrjunarsaetis er ekki deild. Fannst ekkert
       nothaeft er sjalfgefna snidid latid standa. */
    if (Object.values(st).some((v) => v > 0)) L.starters = st;
  }

  if (raw.maxPos && typeof raw.maxPos === "object" && !Array.isArray(raw.maxPos)) {
    const mp = {};
    for (const [pos, n] of Object.entries(raw.maxPos)) {
      const v = int(n, 1, 20);
      if (v != null) mp[pos] = v;
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
  if (!players || !players.length) return { rows: [], meta: { reason: "engin gogn" } };

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
    /* ADP er tekid ur FFC thegar thad er til (raunveruleg droft i
       rettri staerd), annars Sleeper, annars ESPN. Rodin er ekki
       handahof: FFC ber urtaksstaerd, Sleeper er retti vettvangurinn,
       ESPN er staerst en i odru sniði. */
    const adp = ffc ? ffc.adp : (adpSleeper ?? p.adpEspn ?? null);

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
      injury: p.injury || p.status || null,
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
  const tiers = tierize(withVbd.map((r) => r.vbd));
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
  const RANKED_POS = ["QB", "RB", "WR", "TE"];
  const ranked = withVbd.slice()
    .filter((r) => r.vbd != null && RANKED_POS.includes(r.pos))
    .sort((a, b) => b.vbd - a.vbd);
  const ourRank = new Map(ranked.map((r, i) => [r.id, i + 1]));
  for (const r of withVbd) {
    r.rank = ourRank.get(r.id) ?? null;
    r.aRank = r.rank;
    /* Merkt svo vidmotid geti sagt fra thvi frekar en ad syna eydu. */
    r.unranked = !RANKED_POS.includes(r.pos) ? "K and DST were excluded from every simulation that validates this order" : null;
    r.value = valueVsMarket(r.rank, r.adp, league.teams);
    /* Hvad segir A-Ranking umfram hvora heimild fyrir sig? */
    r.vsSleeperRank = null;                 // fyllt ad nedan
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
    push(byTeam, g.home, { week: g.week, oppImplied: away });
    push(byTeam, g.away, { week: g.week, oppImplied: home });
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
