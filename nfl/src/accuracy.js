/* ============================================================
   accuracy.js — HREIN maeling a thvi hver hafdi rett fyrir ser.
   Ekkert React, engin netkoll. Profin keyra thetta beint.

   SPURNINGIN SEM NOTANDINN SPURDI var "hverjum er haegt ad treysta
   og hver er klarastur i spa". Thad er MAELANLEG spurning og hun er
   maeld hér — hun er ekki svaraeð med thvi ad vitna i thann sem er
   fraegastur eda thann sem FantasyPros setur efst.

   FJORIR MAELIKVARDAR, OG THEIR ERU EKKI SAMMALA. Thad er ekki galli
   heldur nidurstadan sjalf:

   1. SPEARMAN (rho)       — radadi hann ollum rett i heild?
   2. TOPP-50 MAE          — hversu langt fra ser hann i fyrstu
                             fimm umferdunum, thar sem draftid raest?
   3. HITTNI a stodu       — af topp-24 RB hans, hve margir enduðu
                             i topp-24 RB?
   4. DRAFT-HERMUN         — ef thu hefdir draftad EFTIR HANS BORDI
                             i 12-lida snak, hve morg stig hefdi lidid
                             thitt skorad i raun?

   MAELIKVARDI 4 ER SA EINI SEM MAELIR AKVORDUNINA. Hinir thrir maela
   fylgni, og laerdomurinn ur FPL-verkefninu (kafli 6o) er skyr:
   **haerri fylgni er EKKI sama og betri akvordun.** Bord sem er
   frabaert a leikmonnum 150–300 vinnur a Spearman en breytir engu
   um lidid thitt, thvi thu draftar tha aldrei. Thess vegna er
   hermunin adalmaelikvardinn og hinir eru birtir vid hlidina.

   VARNAGLI SEM MA ALDREI FALLA UT: thetta er EITT TIMABIL (2025).
   Eitt timabil er ~200 leikmenn og haváðinn er STOR. Rodun
   serfraedinga eftir einu ari er ad staerstum hluta heppni. Thess
   vegna skilar `rankExperts` LIKA `noise` — dreifingu utkomunnar
   yfir draft-saeti — og appid VERDUR ad birta hana. Tafla an
   vikmarka segir "thessi er bestur" thegar gognin segja "thessi var
   heppnari".
   ============================================================ */

/* ---------- fylgni og villa ---------- */

import { spearman as spearmanArrays } from "./learn.js";

/** Spearman rho a pordum { pred, actual }. Jafntefli fa medalrod. */
export function spearman(pairs) {
  /* EIN UTFAERSLA A RODUN, EKKI TVAER. `ranksOf` bjo hér og `rankArray`
     i learn.js — sama algrim, sami jafntefla-medhondlun, tvo staðir ad
     halda i takt. Jafngildi var STADFEST a fimm tilfellum (thar med
     jafnteflum) adur en thessu var breytt; thaer gafu somu tolu upp a
     tolf aukastafi.

     Undirskriftirnar eru afram tvaer THVI THAER SVARA OLIKU: hér koma
     pordu gildin sem `{pred, actual}` (thad er formid sem bordin bera),
     i learn.js koma tvo fylki (thad er formid sem likanid ber). Ad
     thvinga eitt form upp a badar hefdi kostad umbreytingu a hverjum
     kallstad — rokin eru sameinud, ekki vidmotin. */
  if (!Array.isArray(pairs) || pairs.length < 3) return null;
  return spearmanArrays(pairs.map((p) => p.pred), pairs.map((p) => p.actual));
}

/* TVAER UTFAERSLUR A `mean` I REPO-INU, OG THAD ER ASETT — SKJALAD HER
   19.8.2026 THVI ROKIN BJUGGU ADEINS I PROFINU.

   `src/learn.js` ber `mean` sem skilar **null** fyrir tomt inntak; thessi
   skilar **0** (`xs.length || 1`). Su munur er EKKI oradinn afgangur af
   lagfaeringu sem gleymdist: hann er REGLAN, og `tests/learn.mjs` ber
   BYGGINGARLEGAN vord sem fellur ef nokkur skra i `src/` flytur inn
   `mean`/`mae`/`rmse` ur learn.js.

   ASTAEDAN (ordrett ur theim verdi): `null` sem raedst inn i reikning i
   birtingarlagi verdur **NaN a skja**, sem er VERRA en 0-id sem var
   fjarlaegt. `learn.js` er malaleid — thar er "engin maeling" rett svar
   og null er rett tákn. `accuracy.js` er a APP-LEIDINNI, og thar er
   thogult 0 skárra en NaN i toflu.

   UTTEKT 19.8.2026 LAGDI TIL AD SAMEINA THESSAR TVAER og kalladi thetta
   afrit sem hefdi verid missed. **Thad var reynt og VORDURINN FELLDI
   THAD** — nakvaemlega eins og hann atti ad gera. Sameiningin er thvi
   MAELD OG HOFNUD, ekki ogerd.

   OG HVERS VEGNA NULL-TILFELLID SKIPTIR HVORT ED ER EKKI MALI HER:
   badir kallstadir eru hlidadir a undan (`topMae` -> `top.length < 5`,
   `simulateAllSlots` -> `league.teams >= 1`), svo tomt fylki naer aldrei
   hingad. Fyrir OLL onull inntok eru formulurnar bitaeins jafngildar.  */
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

/**
 * Medal-rodarvilla a EFSTU N. Thetta er thar sem draftid raest:
 * ad vera 40 saetum af i saeti 250 kostar ekkert, ad vera 40 saetum
 * af i saeti 10 kostar timabilid.
 */
export function topMae(pairs, n = 50) {
  const top = pairs.filter((p) => p.pred <= n);
  if (top.length < 5) return null;
  return mean(top.map((p) => Math.abs(p.pred - p.actual)));
}

/**
 * Hittni: af theim sem hann setti i topp-N a stodu, hve margir
 * enduðu i topp-N a theirri stodu? Skilad sem hlutfall.
 */
export function positionHitRate(pairs, pos, n) {
  const inPos = pairs.filter((p) => p.pos === pos);
  /* KREFST 1,5n I LAUGINNI, EKKI n.
     Med nakvaemlega n leikmonnum i lauginni er "topp n" ALLIR, og
     hittnin verdur 1,000 hvernig sem bordid radar theim. Su tala er
     ekki bara gagnslaus heldur VILLANDI: hun gefur fullt hus theim
     bordum sem eru GRUNNUST. Fyrsta utgafan krafdist adeins n og
     profid greip thad. */
  if (inPos.length < n * 1.5) return null;
  const predTop = new Set(
    inPos.slice().sort((a, b) => a.pred - b.pred).slice(0, n).map((p) => p.key));
  const actTop = new Set(
    inPos.slice().sort((a, b) => a.actual - b.actual).slice(0, n).map((p) => p.key));
  let hit = 0;
  for (const k of predTop) if (actTop.has(k)) hit++;
  return hit / n;
}

/* ---------- draft-hermunin ---------- */

/**
 * Sjalfgefid snid: 12 lid, snakk, byrjunarlid QB/RB/RB/WR/WR/WR/TE/FLEX.
 * Thetta er algengasta uppsetningin og er valid THVI hun er algengust,
 * ekki thvi hun henti einhverju likani.
 */
export const DEFAULT_LEAGUE = {
  teams: 12,
  rounds: 14,
  starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 },
  flexPos: ["RB", "WR", "TE"],
  /**
   * STODU-THAK SEM GILDIR UM ALLA, LIKA MOTHERJANA.
   *
   * FYRSTA UTGAFAN LAGDI THAK ADEINS A OKKUR og let motherjana
   * drafta hreina rod. Su hermun var ROG og hun var TRUVERDUG:
   * samsteypan sjalf lenti i 124. saeti af 208 og TAPADI fyrir
   * bordi sem var HANDAHOF innan threpa (1.701 a moti 1.855).
   *
   * ORSOKIN sast um leid og hopurinn var prentadur: samsteypu-lidid
   * draftadi **Josh Allen i 2. umferd, Burrow i 4. og Fields i 9.**
   * — thrja leikstjornendur thar sem adeins einn er i byrjunarlidi.
   * Enginn draftar svona. Med thakid adeins a okkur var verid ad
   * maela "gefur bordid jafnt snid undir barnalegri best-available
   * reglu", ekki "hafdi hann rett fyrir ser".
   *
   * NU DRAFTA ALLIR EFTIR SOMU REGLUM. Thar med er samsteypu-lidid
   * ORDID markadurinn sjalfur og er retta nulllinan: bord sem slaer
   * hana gerdi thad med thvi ad vera NAKVAEMARA, ekki med thvi ad
   * vera odruvisi.
   */
  maxPos: { QB: 2, RB: 6, WR: 7, TE: 2 },
  /* Spyrnumenn og varnir eru UTAN hermunarinnar. Their eru teknir i
     sidustu umferdunum, hafa nanast enga dreifingu milli borda og
     baeta adeins vid havada. Ad hafa tha med vaeri ad thynna maelinguna
     med thvi sem enginn draftar eftir. */
  excludePos: ["K", "DST"],
};

/**
 * Hermir eitt draft og skilar RAUNVERULEGUM stigum byrjunarlidsins.
 *
 * `board`     Map(key -> rank)  bordid sem VID erum ad maela
 * `fieldBoard` Map(key -> rank) bordid sem HINIR draftar eftir
 *              (samsteypa/ADP — their eiga ad vera "markadurinn")
 * `actual`    Map(key -> { pos, pts })  thad sem raunverulega gerdist
 * `slot`      1..teams  hvar vid sitjum i fyrstu umferd
 *
 * HVERS VEGNA HINIR DRAFTA EFTIR SAMSTEYPUNNI: ef allir draftudu
 * eftir sama bordi og vid vaeri ekkert eftir ad maela — utkoman vaeri
 * bara "hver var efst i hans eigin rod". Med markadinn sem motherja
 * maelist thad sem raunverulega skiptir mali: hvar VIKUR hann fra
 * markadinum, og BORGADI su vik sig?
 */
/**
 * `rival` (valfrjalst) — { slot, board }: annad lid i SOMU deild sem
 * draftar eftir ODRU bordi. Skilar `rivalPoints`.
 *
 * HVERS VEGNA THETTA ER TIL: ad bera saman tvo ADSKILIN droft laetur
 * ars-havadann (sd ~150 stig milli timabila) drekkja mun sem er ~75.
 * Med badum bordum I SOMU DEILD dregst arsahrifin UT — bædi lidin
 * nutu goda arsins eda lidu fyrir thad slaema — og eftir stendur
 * adeins munurinn a bordunum. Thad er lika raunsaerra: i thinni deild
 * ertu ad keppa vid folkid i herberginu, ekki vid medaltal aranna.
 */
/**
 * `boards` (valfrjalst) — fylki/kort saeti -> bord fyrir OLL saetin.
 * Thad er sama vidmot og `rival` gefur, adeins almennara: h2h-lab tharf
 * heila deild thar sem hvert saeti getur haft sitt bord. Saeti sem
 * vantar i `boards` fellur a `fieldBoard`, svo gamla kallformid er
 * ohaggad og OLL bordin fara gegnum SOMU `bestAvailable`.
 */
export function simulateDraft({ board, fieldBoard, actual, slot,
                                league = DEFAULT_LEAGUE, plan = null,
                                rival = null, boards = null, plans = null }) {
  const { teams, rounds } = league;
  const taken = new Set();
  /* Hvert lid ber sina eigin stodutalningu — LIKA motherjarnir.
     Thad er breytingin sem gerir samsteypuna ad rettri nulllinu. */
  const counts = Array.from({ length: teams + 1 }, () => ({}));
  const rosters = Array.from({ length: teams + 1 }, () => []);

  // Snakk-rodin: umferd 1 er 1..N, umferd 2 er N..1, o.s.frv.
  for (let r = 0; r < rounds; r++) {
    const order = r % 2 === 0 ? range(1, teams) : range(1, teams).reverse();
    for (const t of order) {
      const mine = t === slot;
      /* BORD MA VERA FALL, EKKI ADEINS KORT.
         Kyrrstaett bord er rodun sem er akvedin fyrir draftid. Sumar
         hugmyndir eru THAD EKKI — kvikt VBD endurreiknar varamanns-
         threpid ur THEIM SEM ERU EFTIR i hvert sinn, svo rodin breytist
         eftir thvi hvernig herbergid hagar ser. Fall faer `taken` og
         stodutalningu lidsins og skilar kortinu sem gildir NUNA.
         Kyrrstaedu kortin virka obreytt. */
      /* Fallid faer LIKA hopinn sinn. Kyrrstaett bord tharf hann ekki,
         en bord sem metur bye-arekstra getur ekki reiknad thá an thess
         ad vita hverja lidid a THEGAR — og thad er nakvaemlega
         spurningin sem draftari spyr i sjottu umferd. */
      const resolve = (b) => (typeof b === "function"
        ? b(taken, counts[t], r, rosters[t]) : b);
      const own = boards ? (boards[t] || null) : null;
      const use = resolve(own || (mine ? board
        : (rival && t === rival.slot ? rival.board : fieldBoard)));
      /* `plan` er STODU-AAETLUN fyrir okkar lid: hvada stodur ma taka
         i hverri umferd. Notad af `strategy-lab.mjs` til ad maela
         "RB fyrst eda WR fyrst". Motherjarnir fylgja ALDREI aaetlun —
         their drafta eftir markadinum, sem er thad sem raunverulega
         gerist i herberginu. */
      /* `plans[t]` er stodu-aaetlun EINSTAKS saetis. Gamla `plan` gildir
         afram um `slot` eingongu; hun er hér thvi `strategy-lab` maelir
         eina aaetlun i einu, en deildar-hermunin tharf TVAER i somu
         deild (stefnan og vidmidid) og gat thad ekki. */
      const allow = (plans && plans[t]) ? plans[t][r]
        : (mine && plan ? plan[r] : null);
      let pick = bestAvailable(use, taken, actual, league, counts[t], allow);
      /* Aaetlun sem ekki er haegt ad uppfylla (staðan uppurin eda
         thak nad) MA EKKI stodva valid — tha vaeri verid ad maela
         "hvad gerist ef thu sleppir vali", sem enginn gerir. */
      if (!pick && allow) pick = bestAvailable(use, taken, actual, league, counts[t], null);
      if (!pick) continue;
      taken.add(pick);
      rosters[t].push(pick);
      const p = actual.get(pick);
      if (p) counts[t][p.pos] = (counts[t][p.pos] || 0) + 1;
    }
  }
  const myRoster = rosters[slot];
  return {
    points: startersPoints(myRoster, actual, league),
    roster: myRoster,
    rivalPoints: rival ? startersPoints(rosters[rival.slot], actual, league) : null,
    rivalRoster: rival ? rosters[rival.slot] : null,
    /* OLL saetin. Deildar-hermunin tharf tha alla — hun skorar hverja
       viku fyrir hvert lid — en thetta er VIDBOT: gomlu svidin eru
       ohreyfd og `rosters[0]` er tomt (saeti eru 1-vaeg). */
    rosters,
  };
}

function range(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; }

/** Besti lausi leikmadur sem lidid MA enn taka. */
function bestAvailable(board, taken, actual, league, posCount, allow = null) {
  for (const [key] of board) {                 // bordid er thegar radad
    if (taken.has(key)) continue;
    const p = actual.get(key);
    const pos = p ? p.pos : null;
    if (pos && league.excludePos && league.excludePos.includes(pos)) continue;
    if (allow && (!pos || !allow.includes(pos))) continue;
    const max = pos ? league.maxPos[pos] : null;
    if (max != null && (posCount[pos] || 0) >= max) continue;
    return key;
  }
  return null;
}

/**
 * Stig byrjunarlidsins ur hopnum — GRADUG BEST-BALL rodun.
 * Athugid: thetta er TIMABILS-summa, ekki vikuleg akvordun. Ad herma
 * vikulegar start/sit-akvardanir baetti vid hávaða sem maelir
 * lineup-hegdun frekar en draftid, og thad er onnur spurning.
 */
export function startersPoints(roster, actual, league = DEFAULT_LEAGUE) {
  return Math.round(startersRaw(roster, (k) => actual.get(k), league) * 10) / 10;
}

/**
 * KJARNI BYRJUNARLIDS-REGLUNNAR — EIN UTFAERSLA FYRIR ALLT REPO-ID.
 *
 * HVERS VEGNA THETTA VAR DREGID UT: `weekly-lab.mjs` og `bye-lab.mjs`
 * baru HVOR SITT afrit af nakvaemlega thessari reglu (`weekPoints`),
 * hardkodad a QB1/RB2/WR3/TE1/FLEX1. Tvo afrit af sama utreikningi er
 * sama aettin af villu og `buildTeamMetrics` i FPL-verkefninu, thar sem
 * afritid las `gf` sem skrain bar ekki og skrifadi NaN fyrir 17 lid —
 * merkt eins og maeling. Her voru afritin RETT en thau voru lika BLIND
 * a deildarlogun, svo 10-lida deildin med TVO FLEX gat ekki verid maeld
 * vikulega yfirleitt.
 *
 * `lookup(key)` skilar `{ pos, pts }` eda `null`. Beri hun LIKA `by`
 * er RODUNIN gerd eftir `by` en STIGIN logd saman ur `pts` — thad er
 * munurinn a "byrjunarlid valid med fullkominni vitneskju" og
 * "byrjunarlid valid ur spa og skorad a raunstigum". README 5m segir
 * hvers vegna thad skiptir mali: vikuleg talning med fullkominni
 * vitneskju VERDLAUNAR sveiflu, svo nidurstada sem stenst adeins thar
 * er artefakt. Baðar leidir eru maelanlegar ur SOMU utfaerslu.
 */
export function startersRaw(roster, lookup, league = DEFAULT_LEAGUE) {
  const byPos = {};
  for (const k of roster) {
    const p = lookup(k);
    if (!p) continue;
    (byPos[p.pos] = byPos[p.pos] || []).push(p);
  }
  const key = (p) => (p.by != null ? p.by : p.pts);
  for (const k of Object.keys(byPos)) byPos[k].sort((a, b) => key(b) - key(a));

  let total = 0;
  const used = {};
  for (const [pos, n] of Object.entries(league.starters)) {
    if (pos === "FLEX") continue;
    const list = byPos[pos] || [];
    for (let i = 0; i < n; i++) { total += list[i] ? list[i].pts : 0; }
    used[pos] = n;
  }
  // FLEX: besti afgangur ur leyfdum stodum
  const flexN = league.starters.FLEX || 0;
  const pool = [];
  for (const pos of league.flexPos) {
    const list = byPos[pos] || [];
    for (let i = used[pos] || 0; i < list.length; i++) pool.push(list[i]);
  }
  pool.sort((a, b) => key(b) - key(a));
  for (let i = 0; i < flexN; i++) total += pool[i] ? pool[i].pts : 0;
  return total;
}

/**
 * Stig byrjunarlids EINNAR VIKU. `byWeek` er kort a `${key}|${week}`
 * -> { pos, pts } — sama snid og vikuskrarnar i `data/weekly/` gefa og
 * sama lykill og `weekly-lab`/`bye-lab` notudu adur.
 *
 * ENGIN NAMUNDUN HER, viljandi: vikutolur eru lagdar saman i timabil og
 * namundun a hverri viku myndi hlada upp skekkju sem timabils-summan
 * hefur ekki. `startersPoints` namundar afram thvi hun er birt tala.
 */
export function weekPoints(roster, byWeek, week, league = DEFAULT_LEAGUE,
                           selectBy = null) {
  return startersRaw(roster, (k) => {
    const r = byWeek.get(`${k}|${week}`);
    if (!r) return null;
    if (!selectBy) return r;
    return { pos: r.pos, pts: r.pts, by: selectBy(k, week) };
  }, league);
}

/**
 * Keyrir hermunina fra OLLUM draft-saetum og skilar medaltali + dreifingu.
 * Ad herma eitt saeti vaeri ad maela heppni: saeti 1 og saeti 12 fa
 * gerolika leikmenn og munurinn a theim er STAERRI en munurinn a
 * godu og slaemu bordi.
 */
export function simulateAllSlots({ board, fieldBoard, actual,
                                   league = DEFAULT_LEAGUE, plan = null }) {
  const pts = [];
  for (let slot = 1; slot <= league.teams; slot++) {
    pts.push(simulateDraft({ board, fieldBoard, actual, slot, league, plan }).points);
  }
  const m = mean(pts);
  const sd = Math.sqrt(mean(pts.map((p) => (p - m) ** 2)));
  return {
    mean: Math.round(m * 10) / 10,
    sd: Math.round(sd * 10) / 10,
    min: Math.round(Math.min(...pts) * 10) / 10,
    max: Math.round(Math.max(...pts) * 10) / 10,
    bySlot: pts,
  };
}

/* ============================================================
   DEILDIN — VIKULEG VIDUREIGN OG URSLITAKEPPNI
   ============================================================
   STAERSTA OMAELDA SPURNINGIN I VERKEFNINU var thessi: allt her er
   maelt i STIGUM, en fantasy vinnst ekki a stigum heldur a VIKULEGUM
   VIDUREIGNUM. Bord sem skorar meira yfir timabilid getur tapad
   fleiri vikum, og ekkert i repo-inu hefdi tekid eftir thvi.

   REGLURNAR ERU LESNAR, EKKI VALDAR. Baðar deildir notandans svara
   `playoff_week_start: 15` og `playoff_teams: 6` (raunsvor Sleeper,
   sja `tests/standings.mjs`), og `fpts` i sama svari er sannanlega
   vikur 1-14 eingongu — 1815,34 a rostri 1, en 2268,18 yfir vikur
   1-17. Reglulega timabilid er thvi 14 vikur og urslitakeppnin
   vikur 15-17.

   HVERS VEGNA THETTA ER HER OG EKKI I LABINU: `weekPoints` var
   afritad i tvo lob, og eina vornin gegn thvi ad thridja afritid reki
   i sundur er ad byggingin bui a EINUM stad sem profin keyra.
   ============================================================ */

/**
 * Umferdaskra: hringadferdin (circle method). Skilar `weeks` umferdum
 * thar sem hvert lid spilar NAKVAEMLEGA einn leik i hverri umferd.
 *
 * 14 vikur i 10-lida deild er 9 + 5, svo sum lid maetast tvisvar og
 * onnur einu sinni. Thad er EKKI ohreinindi heldur raunsaett (raunverulegar
 * deildir hafa oskipulega skra), og spegluninni er nakvaemlega aetlad ad
 * fella ut hvad thad snyr ser. `rnd` slembar umferdaRODINA, svo hver
 * hermd deild fai sina skra en engin skra se ogild.
 */
export function roundRobin(teams, weeks, rnd = null) {
  if (teams % 2 !== 0) throw new Error("roundRobin: teams must be even");
  const ids = range(1, teams);
  const base = [];
  for (let r = 0; r < teams - 1; r++) {
    const pairs = [];
    for (let i = 0; i < teams / 2; i++) pairs.push([ids[i], ids[teams - 1 - i]]);
    base.push(pairs);
    ids.splice(1, 0, ids.pop());          // fyrsta lidid stendur, hin snuast
  }
  const out = [];
  while (out.length < weeks) {
    const order = base.map((_, i) => i);
    if (rnd) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    for (const i of order) {
      if (out.length >= weeks) break;
      out.push(base[i]);
    }
  }
  return out;
}

/**
 * Stada ur vikuskorum og skra. `scores[t][w]` er stig lids `t` i viku
 * `w` (saeti eru 1-vaeg). Skilar rod per lid OG rodun (`seeds`).
 *
 * JAFNTEFLI ER TALID SEM JAFNTEFLI, ekki hálfur sigur i `wins` —
 * Sleeper ber `wins`/`losses`/`ties` sem thrju svid og `recordLine` i
 * `standings.js` birtir thau thrju. Rodunin notar `wins + ties/2`,
 * sem er sama regla og vinningshlutfall.
 *
 * JAFNTEFLI I RODUN eru leyst med stigum (`pf`) — thad er regla
 * Sleeper og hun er MAELD: `fpts` er thad eina sem svarid ber til ad
 * skera ur. Sidan saetisnumer, svo rodunin se sannanlega deterministisk.
 */
export function leagueRecords({ scores, schedule }) {
  const teams = scores.length - 1;
  const rec = [null];
  for (let t = 1; t <= teams; t++) rec.push({ team: t, w: 0, l: 0, t: 0, pf: 0, pa: 0 });
  for (let i = 0; i < schedule.length; i++) {
    const week = i + 1;
    for (const [a, b] of schedule[i]) {
      const sa = scores[a][week], sb = scores[b][week];
      rec[a].pf += sa; rec[a].pa += sb;
      rec[b].pf += sb; rec[b].pa += sa;
      if (sa > sb) { rec[a].w++; rec[b].l++; }
      else if (sb > sa) { rec[b].w++; rec[a].l++; }
      else { rec[a].t++; rec[b].t++; }
    }
  }
  const seeds = rec.slice(1).slice().sort((x, y) =>
    (y.w + y.t / 2) - (x.w + x.t / 2) || y.pf - x.pf || x.team - y.team)
    .map((r) => r.team);
  return { rec, seeds };
}

/**
 * Urslitakeppnin. `seeds` er rodun (best fyrst), `scores[t][w]` stigin.
 *
 * SEX LID / THRJAR VIKUR (raunstillingin i badum deildum): saeti 1-2
 * sitja fyrstu vikuna, 3v6 og 4v5 spila. Endurrodun fyrir undanurslit —
 * sa sem er efstur maetir THEIM LAEGSTA sem eftir er, sem er reglan hja
 * Sleeper og i NFL sjalfu.
 *
 * FJOGUR LID / TVAER VIKUR er maelt sem NAEMNI, ekki sem valkostur:
 * `playoff_teams` er REGLA deildarinnar og svarid segir 6. Fjorir eru
 * med thvi ad fjoldinn er thad eina i thessari uppsetningu sem vid
 * hefdum getad valid, og tha a hann ad vera SYNILEGUR sem naemni.
 *
 * JAFNTEFLI I URSLITALEIK: efra saeti kemst afram. Thad er venjan og
 * thad er DETERMINISTISKT — myntkast baetti vid havada sem er ekki i
 * gognunum. Jafntefli a fleytitolum eru hvort sem er naer omoguleg.
 */
export function playoffChampion({ seeds, scores, weeks, size = 6 }) {
  const alive = seeds.slice(0, size);
  const seedOf = new Map(seeds.map((t, i) => [t, i + 1]));
  const game = (a, b, w) => {
    const sa = scores[a][w], sb = scores[b][w];
    if (sa > sb) return a;
    if (sb > sa) return b;
    return seedOf.get(a) < seedOf.get(b) ? a : b;
  };
  const rounds = [];
  let field = alive.slice();
  let wi = 0;
  /* Fyrsta umferd er adeins spiluð ef fleiri en helmingurinn af
     naestu tveggja-velda staerd eru med — 6 lid gefa tvo leiki og
     tvo hvildarsaeti, 4 lid gefa enga. */
  const byes = nextPow2(size) === size ? 0 : nextPow2(size) - size;
  if (byes > 0) {
    if (weeks.length < 1) return null;
    const w = weeks[wi++];
    const resting = field.slice(0, byes);
    const playing = field.slice(byes);
    const winners = [];
    const pairs = [];
    for (let i = 0; i < playing.length / 2; i++) {
      const a = playing[i], b = playing[playing.length - 1 - i];
      pairs.push([a, b]);
      winners.push(game(a, b, w));
    }
    rounds.push({ week: w, pairs, winners, byes: resting });
    field = [...resting, ...winners]
      .sort((x, y) => seedOf.get(x) - seedOf.get(y));
  }
  while (field.length > 1) {
    if (wi >= weeks.length) return null;
    const w = weeks[wi++];
    const winners = [], pairs = [];
    for (let i = 0; i < field.length / 2; i++) {
      const a = field[i], b = field[field.length - 1 - i];
      pairs.push([a, b]);
      winners.push(game(a, b, w));
    }
    rounds.push({ week: w, pairs, winners, byes: [] });
    field = winners.sort((x, y) => seedOf.get(x) - seedOf.get(y));
  }
  return { champion: field[0], rounds };
}

function nextPow2(n) { let p = 1; while (p < n) p *= 2; return p; }

/**
 * HEIL DEILD: draft -> vikuskor -> stada -> urslitakeppni.
 *
 * `boards[t]` er bord saetis `t` (fall eda kort, sama og `simulateDraft`
 * tekur). `byWeek` er `${key}|${week}` -> { pos, pts }. `actual` er
 * timabils-summan sem BORDIN og stodu-thakid lesa — hun er afram sama
 * kortid og allar adrar maelingar nota, svo draftid sjalft er
 * OBREYTT fra theim.
 *
 * `selectBy(key, week)` (valfrjalst) velur byrjunarlid ur odru en
 * raunstigum vikunnar — sja `startersRaw`.
 */
export function simulateSeason({ boards, plans = null, fieldBoard, actual, byWeek,
                                 league = DEFAULT_LEAGUE, schedule,
                                 regWeeks = 14, playoffWeeks = [15, 16, 17],
                                 playoffTeams = 6, selectBy = null }) {
  /* `board`/`slot` eru afram gefin (og eru markadsbordid) svo gamla
     leidin i `simulateDraft` se aldrei kolluð med `null`. Saeti sem
     `boards` sleppir draftar tha eftir markadinum, sem er retta
     sjalfgefna hegdunin. */
  const draft = simulateDraft({ board: fieldBoard, fieldBoard, actual, slot: 1,
    league, boards, plans });
  return { rosters: draft.rosters,
           ...scoreLeague({ rosters: draft.rosters, byWeek, league, schedule,
             regWeeks, playoffWeeks, playoffTeams, selectBy }) };
}

/**
 * Skorar HOPA sem thegar eru draftadir. Adskilid fra draftinu thvi
 * SAMA deildin er skoruð oftar en einu sinni: einu sinni med
 * byrjunarlidi vikunnar valdu af fullkominni vitneskju og einu sinni
 * valdu af GANGANDI spa (`selectBy`). Vaeri draftid endurtekid fyrir
 * hvora leid vaeri thad ekki sama deildin og naemnisprofid maeldi tvennt
 * i einu.
 */
export function scoreLeague({ rosters, byWeek, league = DEFAULT_LEAGUE, schedule,
                              regWeeks = 14, playoffWeeks = [15, 16, 17],
                              playoffTeams = 6, selectBy = null }) {
  const { teams } = league;
  const maxWeek = Math.max(regWeeks, ...playoffWeeks);
  const scores = [null];
  for (let t = 1; t <= teams; t++) {
    const row = new Float64Array(maxWeek + 1);
    for (let w = 1; w <= maxWeek; w++) {
      row[w] = weekPoints(rosters[t], byWeek, w, league, selectBy);
    }
    scores.push(row);
  }
  const { rec, seeds } = leagueRecords({ scores, schedule: schedule.slice(0, regWeeks) });
  const po = playoffChampion({ seeds, scores, weeks: playoffWeeks, size: playoffTeams });
  return { scores, rec, seeds, playoff: po, champion: po ? po.champion : null };
}

/* ---------- heildarmatid ---------- */

/**
 * Metur EITT bord gegn raunveruleikanum og skilar ollum fjorum
 * maelikvordunum.
 *
 * `board`  Map(key -> rank)
 * `actual` Map(key -> { pos, pts, posRank, overallRank })
 */
export function scoreBoard({ board, fieldBoard, actual, league = DEFAULT_LEAGUE }) {
  const pairs = [];
  for (const [key, rank] of board) {
    const a = actual.get(key);
    if (!a || a.overallRank == null) continue;
    pairs.push({ key, pred: rank, actual: a.overallRank, pos: a.pos });
  }
  if (pairs.length < 20) return null;

  const posPairs = (pos) => {
    const inPos = pairs.filter((p) => p.pos === pos);
    return inPos.map((p) => ({ ...p, actual: actual.get(p.key).posRank }));
  };

  const sim = fieldBoard
    ? simulateAllSlots({ board, fieldBoard, actual, league })
    : null;

  return {
    n: pairs.length,
    rho: round3(spearman(pairs)),
    mae50: round2(topMae(pairs, 50)),
    mae100: round2(topMae(pairs, 100)),
    hit: {
      RB: round3(positionHitRate(posPairs("RB"), "RB", 24)),
      WR: round3(positionHitRate(posPairs("WR"), "WR", 36)),
      TE: round3(positionHitRate(posPairs("TE"), "TE", 12)),
      QB: round3(positionHitRate(posPairs("QB"), "QB", 12)),
    },
    draft: sim,
  };
}

const round2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const round3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);

/**
 * Radar mörgum bordum og baetir vid VIKMORKUM sem eru raunveruleg.
 * `sd` ur hermuninni yfir draft-saeti er dreifing UTKOMUNNAR, ekki
 * ovissa um medaltalid — vikmorkin eru sd/sqrt(saeti).
 *
 * SKILAR LIKA `gap`: hversu langt fra BESTA bordi, i stigum. Thad er
 * talan sem svarar "skiptir thetta mali?" Ef bilid milli besta og
 * versta bords er minna en vikmorkin er svarid NEI, og thad a ad
 * standa i vidmotinu jafn skyrt og rodin sjalf.
 */
export function rankExperts(scored) {
  const withSim = scored.filter((s) => s.draft && s.draft.mean != null);
  if (!withSim.length) return scored;
  const best = Math.max(...withSim.map((s) => s.draft.mean));
  return scored
    .map((s) => ({
      ...s,
      gap: s.draft ? round2(s.draft.mean - best) : null,
      se: s.draft ? round2(s.draft.sd / Math.sqrt(s.draft.bySlot.length)) : null,
    }))
    .sort((a, b) => (b.draft ? b.draft.mean : -1e9) - (a.draft ? a.draft.mean : -1e9));
}
