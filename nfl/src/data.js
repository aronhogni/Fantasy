/* ============================================================
   data.js — hledsla gagna. HREIN (engin React-hook), svo profin
   geti keyrt somu leid og appid an thess ad byggja DOM.

   SAMA MYNSTUR OG FPL-APPID: gognin eru sott BEINT af
   raw.githubusercontent — enginn bakendi, engin bygging tharf ad
   fylgja gagnauppfaerslu. Pipeline-id skrifar `data/` i repo-id
   og appid ser thad innan minutu.

   ÞUNGU SKRARNAR ERU LETIHLADAR. `players.json` (1,4 MB) tharf
   strax; `experts.json` (3,9 MB) og vikuleg saga (2 MB per ar) eru
   sottar THEGAR flipinn er opnadur. Ad saekja allt vid raesingu vaeri
   8 MB adur en fyrsta talan birtist.
   ============================================================ */

import { parseSleeperInput } from "./sleeper-league.js";

const RAW = "https://raw.githubusercontent.com/aronhogni/Fantasy/main/nfl/data";

/* I THROUN eru skrarnar a disknum og Vite thjonar theim ur rot
   verkefnisins. Ad lesa RAW i throun vaeri ad profa gogn sem eru
   ekki enn committud — madur breytir pipeline-inu og ser engan mun,
   sem er versta throunarlykkjan sem til er.

   `import.meta.env` er Vite-serstakt; profin keyra thessa skra an
   Vite og tha er thad `undefined`, svo uppflettingin er vardin. */
const DEV = typeof import.meta.env !== "undefined" && import.meta.env.DEV;

/* Slodin verdur ad bera `BASE_URL` — Vite thjonar undir `/Fantasy/`
   eins og GitHub Pages gerir, svo bert "/data" gefur 404. */
const DEV_BASE = DEV ? `${import.meta.env.BASE_URL}data`.replace(/\/\/+/g, "/") : null;

export let BASE = DEV_BASE || RAW;

const cache = new Map();

/**
 * Saekir eina skra. Skyndiminni per lotu — ad saekja `players.json`
 * tvisvar thvi tveir flipar tharfnast hennar er hrein soun.
 *
 * SKILAR `null` VID VILLU, HENDIR ALDREI: eitt bilad svid ma ekki
 * fella appid. Sa sem kallar VERDUR ad medhondla null, og
 * `Sources`-flipinn gerir thad synilegt.
 *
 * ENGINN `AbortSignal` — OG THAD ER MELDAD AF BITTRI REYNSLU.
 * Fyrsta utgafan tok vid `signal` fra theim sem kalladi og geymdi
 * loforðið i SAMEIGINLEGU skyndiminni. React StrictMode i throun
 * mountar, AFMOUNTAR (sem kallar abort) og mountar aftur — svo
 * seinni mountid fekk eitrada loforðid ur fyrsta mountinu og appid
 * hekk a "Loading…" AD EILIFU.
 *
 * Villan sast EKKI i jsdom-profinu thvi thad rendrar `App` beint an
 * StrictMode. Hun fannst med thvi ad KEYRA APPID OG HORFA A THAD —
 * nakvaemlega sami laerdomur og islensku strengirnir i FPL-verkefninu
 * 31.7.: AST-prof les koda, ekki skjainn.
 *
 * Skyndiminni sem er deilt ma ekki vera haad lifi eins notanda. Sa
 * sem kallar hunsar sein svor med `alive`-flaggi i stad thess.
 *
 * ============================================================
 * TVAER LAGFAERINGAR 25.8.2026 — BADAR UM ThOGLA BILUN
 *
 * (1) TIMAMORK. Ekkert kall hafdi thau, og undici hefur ~300 s
 *     sjalfgildi — sem eru ekki timamork heldur HENGJA. Stodvud
 *     TCP-tenging (daemigert a lelegu wifi i midju drafti) skildi
 *     `load` eftir i naer-eilifri bid. Verst i `DraftBoard`:
 *     poll-lykkjan er `await pull()` -> `setTimeout(tick)`, svo
 *     naesta tikk er ALDREI bokad, engin villa er sett, og
 *     stoduljosid segir afram "les pikk i rauntima" medan bordid er
 *     frosid — a versta mogulega tima.
 *
 *     ThETTA STANGAST EKKI A VID VIDVORUNINA HER AD OFAN. Sa
 *     eiturbyrlari var `signal` FRA THEIM SEM KALLADI, bundinn lifi
 *     eins React-mounts, geymdur i SAMEIGINLEGU skyndiminni.
 *     `AbortSignal.timeout` er buinn til HER INNI, er ohadur ollum
 *     notendum og deyr med kallinu sjalfu. Skyndiminnid verdur thvi
 *     aldrei haad lifi eins notanda — sem var allt malid.
 *
 * (2) MISLUKKUD SOKN MA EKKI SITJA I SKYNDIMINNI ALLA LOTUNA.
 *     `null` var sett i cache og LA THAR: eitt augnabliks nethiksti
 *     vid hleðslu `players.json` skildi flipann eftir tomann thar til
 *     SIDAN var endurhladin. Skyndiminni a ad geyma SVOR, ekki
 *     BILANIR — bilun er astand sem lagast, og fostun a henni er
 *     sama aett og geymda API-Sports-uppsognin i FPL-pipeline-inu
 *     ("geymsla sem thaggar nidur GODAR frettir er ekki geymsla").
 *     Faerslan er ThVI FJARLAEGD vid villu, svo naesta kall — eda
 *     "Refresh"-hnappur — reyni raunverulega aftur.
 *
 *     Loforðid sjalft er afram thad sem er geymt (ekki nidurstadan),
 *     svo samtimis kallendur deili EINNI sokn. Hreinsunin gerist
 *     eftir a og fjarlaegir ADEINS thetta loforð (`cache.get(name)
 *     === p`), svo ny sokn sem er thegar farin af stad se ekki
 *     hent ut undan ser.
 */
const LOAD_TIMEOUT_MS = 8000;

export async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const p = (async () => {
    try {
      const r = await fetch(`${BASE}/${name}`, { signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch {
      return null;
    }
  })();
  cache.set(name, p);
  p.then(v => { if (v == null && cache.get(name) === p) cache.delete(name); });
  return p;
}

/** Skrarnar sem raesingin tharf. Allt annad er letihladid. */
export async function loadCore() {
  const [meta, players, teams, schedule, status, market] = await Promise.all([
    load("meta.json"), load("players.json"), load("teams.json"),
    load("schedule.json"), load("status.json"), load("market.json"),
  ]);
  return { meta, players, teams, schedule, status, market };
}

export const loadExperts = () => load("experts.json");
export const loadAccuracy = () => load("accuracy.json");
export const loadSeasons = () => load("seasons.json");
export const loadDefense = () => load("defense.json");
export const loadTeamForm = () => load("team_form.json");
export const loadCalibration = () => load("calibration.json");
export const loadAdp = () => load("adp.json");
export const loadMarketHistory = () => load("market_history.json");
export const loadNews = () => load("news.json");

/* Maelistofan. `standard` og `ppr` eru SITTHVOR skrain thvi
   nidurstodurnar eru EKKI thaer somu — RB-thungar stefnur vinna i
   standard en ekki i PPR. Ad birta eina tolu fyrir badar vaeri rangt. */
export const loadEval = (scoring) => load(`model_eval_${scoring}.json`);
export const loadStrategy = (scoring) => load(`strategy_${scoring}.json`);
export const loadArank = (scoring) => load(`arank_${scoring}.json`);
/* SAMA MAELING A OHADRI SPAHEIMILD. FFToday naer aftur til 2015 (11
   timabil a moti 5 hja Sleeper) og fer gegnum sama leka-hlid. Thetta
   er endurtekningarprofid — sja notu i ModelLab. */
export const loadArankFf = (scoring) => load(`arank_${scoring}_fftoday.json`);
/* Spyrnumenn: eina maelda reglan sem til er um saeti sem A-Ranking
   raðar ekki. Letihladin med draft-flipanum. */
export const loadKickers = () => load("kickers.json");
/* ============================================================
   VIKULEG GOGN YFIRSTANDANDI TIMABILS — LETIHLADIN
   ============================================================
   ÞETTA VANTADI OG THAD BLOKKADI TVAER MAELDAR NIDURSTODUR:

     · `usage-lab`: notkun-til-thessa lokar **12,25%** af
       start/sit-bilinu fra viku 10 (a moti 5,83% hja
       `weeklyProjection`), per-leikmanns CI [2,54 · 8,49] i OLLUM
       thremur snidum — fyrsta hugmyndin sem stodst thann throskuld.
     · `waiver-lab`: rest-of-season gjaldmidill slaer timabils-VBD um
       **+13,2 stig/timabil** (t=2,97, 6/7 ar).

   Baðar tharfnast thess sem hefur GERST i thessu timabili, og appid
   hafdi enga leid ad na i thad. `data/weekly/{ar}.json` var til fyrir
   2019-2025 en engin loader las hana, og pipeline-id skrifadi ekki
   yfirstandandi timabil (hardkodad `HISTORY`).

   HUN ER LETIHLADIN OG THAD ER EKKI SMAATRIDI: skrain er ~1,4 MB fyrir
   lokid timabil. Hun er sott ADEINS thegar forsidan er opnud a
   timabilinu, aldrei vid raesingu — sama regla og `experts.json`.

   `null` I FORLEIK ER RETT SVAR, EKKI BILUN. Skrain er ekki til fyrr en
   fyrsta vika er spilud, og `load()` skilar `null` vid 404. Sa sem
   kallar VERDUR ad greina "engin vika spilud" fra "gogn brustu" — thad
   fyrra er astandid i agust og ma ekki lesast eins og villa.          */
export const loadWeekly = (season) => load(`weekly/${season}.json`);

/* Hvada deildarlogun eru MAELDAR. Notandi i 14-lida superflex a rett a
   ad vita hvort tolurnar hans voru nokkurn timann profadar. */
export const loadShapes = () => load("shapes_sleeper.json");

/* ============================================================
   BEIN DRAFT-TENGING VID SLEEPER
   ============================================================
   Sleeper-API-id sendir CORS-hausa, svo vafrinn ma kalla thad BEINT
   — enginn proxy tharf (olikt FPL-API-inu i hinu verkefninu).
   Thad er astaedan fyrir thvi ad lifandi draft-fylgni er yfirleitt
   moguleg hér.                                                     */

const SLEEPER = "https://api.sleeper.app/v1";

/* ============================================================
   VILLUBOÐIN ERU **ENSK** — THAU ERU VIDMOT, EKKI ROKSTUDNINGUR
   ============================================================
   Þau voru islensk ("Deild fannst ekki (404)") og thad var i skjoli thess
   ad thau saust sjaldan: gamla spjaldid lagdi thau i litla nota nedst.
   Stoduljosid ber thau nu berum ordum vid hlidina a "Disconnected", svo
   thau eru thad FYRSTA sem notandinn les thegar eitthvad brestur. Sama
   regla og gildir um pipeline-strengina i FPL-appinu: vidmot og gogn a
   ensku, rokstudningur (athugasemdir) a islensku.                     */
/* ============================================================
   EITT KALL-FALL FYRIR SLEEPER — TIMAMORK OG EIN UTFAERSLA (25.8.2026)

   ATTA NAER-EINS `fetch`-koll voru her, ekkert theirra med timamork.
   undici hefur ~300 s sjalfgildi, sem eru ekki timamork heldur HENGJA,
   og hun er ThOGUL a versta mogulega stad: `DraftBoard` pollar med
   `await pull()` -> `setTimeout(tick)`, svo stodvud tenging (daemigert
   a lelegu wifi i midju drafti) thydir ad NAESTA TIKK ER ALDREI BOKAD.
   Engin villa er sett, stoduljosid segir afram "les pikk i rauntima",
   og bordid er frosid. Frosid bord sem SEGIST vera lifandi er verri
   utkoma en synileg villa.

   Timamorkin eru buin til HER INNI (ekki tekin fra theim sem kallar),
   sama rok og vid `load`: skyndiminni og sameiginleg koll mega ekki
   vera haad lifi eins React-mounts.

   ATTA AFRIT VORU LIKA ATTA TAEKIFAERI TIL AD GLEYMA EINU — reglan sem
   var lagfaerd a einum stad og gleymdist a odrum er raudi thradurinn i
   thessari kodarýni. Nu er hun ein.
   ============================================================ */
const SLEEPER_TIMEOUT_MS = 8000;

/* ============================================================
   BORDID VAR FROSID I FIMM MINUTUR OG POLLUNIN VAR SAKLAUS (27.8.2026)
   ============================================================
   Notandinn: "eg er ad mock drafta en ekkert gerist, kallarnir
   updateast ekki og eg thurfti ad haetta thvi eg fell ut a tima" —
   og sidan, upp ur thurru: "svo allt i einu poppadi upp pick 53".

   ÞAD ER EKKI HAEG POLLUN. Bordid stod a **6 picks made**, og su tala
   kemur ur `setInfo(shape)` sem er skrifud i HVERRI pollun, an nokkurs
   fingrafars-hlids. Stod hun kyrr fekk pollunin thvi SAMA SVARID aftur
   og aftur — eda var aldrei kollud. `pull()` er heil inni i try/catch
   og `pollDelay` gefur 1.500/5.000 ms, svo hvorugt getur frosid.

   MAELT A LIFANDI ENDAPUNKTI, EKKI ALYKTAD:

     GET /v1/draft/{id}         -> cache-control: public, s-maxage=300,
     GET /v1/draft/{id}/picks      stale-while-revalidate=300,
                                   stale-if-error=600
     thrjar radir a somu slod   -> cf-cache-status: HIT, HIT, HIT
                                   **age: 103, 103, 103**

   Somu baetin, sami aldur, thrisvar. Cloudflare-jadarinn fer EKKI til
   upprunans innan `s-maxage`, svo pollun a 1,5 sek fresti fekk fimm
   minutna gamla mynd af draftinu — 1,5 sek af FERSKLEIKA er tala sem
   vid akvadum og hun var aldrei til. Med `stale-while-revalidate` er
   versta tilfellid 300+300 = **tiu minutur**.

   Þetta er nakvaemlega thad sem notandinn sa: sex vol, ekkert i fimm
   minutur medan botarnir toku 47 vol, og svo allt i einu 53.

   LAUSNIN ER EINKVAEMUR CACHE-LYKILL. Jadarinn lyklar a slodina MED
   fyrirspurnarstreng, svo `?_=<tiskuklukka>` gefur MISS. Maelt a somu
   slod: `?_=<ts>` -> **cf-cache-status: MISS** og API-id skilar
   nakvaemlega sama farmi (okunn svid eru virt ad vettugi).
   `cache: "no-store"` er thar fyrir vafra-minnid sjalft; einkvaem slod
   utilokar thad hvort ed er, en hun a ekki ad fylla thad ad ganslausu.

   AÐEINS DRAFT-SLODIRNAR TVAER FA THETTA og thad er akvordun:
   `/players/nfl` (14,6 MB), deildin, notendur og hopar eru sott EINU
   SINNI eda a mannlegum hrada, og thar er jadar-minnid GAGN — vid erum
   gestir hja Sleeper. Kostnadurinn af thessu er 2 koll a 1,5 sek medan
   draft er i gangi (~80 a minutu), sem er langt undir theim 1.000 a
   minutu sem Sleeper nefnir.

   AÐ POLLA ORAR HEFDI EKKI LAGAD NEITT — thad er thess vert ad muna,
   thvi thad var fyrsta agiskunin sidast (`pollDelay`, 5.000 -> 1.500).
   Hradari pollun a jadar-minni er sami frosni ramminn, oftar.
   Vordur: `draft-live.mjs` kafli 23.                                 */
export function bustCache(path, stamp) {
  return `${path}${path.includes("?") ? "&" : "?"}_=${stamp}`;
}

/* KLUKKAN EIN ER EKKI EINKVAEM LYKILL. `Date.now()` hefur upplausn i
   millisekundum og tveir kollar geta lent i somu — `pull()` sendir bada
   i einu `Promise.all` (ekki vandamal, oliker slodir) EN profin stytta
   pollunar-bidina i 6 ms og raunverulegur vafri getur skilad somu tolu
   tvisvar. Vaxandi teljari gerir einkvaemnina BYGGINGARLEGA i stad
   thess ad vera hlutfall: tvaer pollanir geta ekki fengid sama
   jadar-lykil. Klukkan er hofd MED svo lykillinn se lika einkvaemur
   milli hledslna (nyr flipi byrjar teljarann a 0).                    */
let stampSeq = 0;
export function nextStamp(now = Date.now()) { return `${now}.${++stampSeq}`; }

async function sleeperGet(path, whenNotOk, opts = {}) {
  const url = opts.fresh ? bustCache(path, nextStamp()) : path;
  let r;
  try {
    r = await fetch(`${SLEEPER}${url}`, {
      signal: AbortSignal.timeout(SLEEPER_TIMEOUT_MS),
      ...(opts.fresh ? { cache: "no-store" } : null),
    });
  } catch (e) {
    /* TIMAMORK OG NET-BILUN ERU EITT FYRIR NOTANDANN: "Sleeper svaradi
       ekki". Bodin eru ENSK — thau eru vidmot (sja hausinn ofar).      */
    throw new Error(e?.name === "TimeoutError"
      ? "Sleeper did not answer within 8s — check your connection"
      : `Could not reach Sleeper (${e?.message || "network error"})`);
  }
  if (!r.ok) throw new Error(whenNotOk(r.status));
  return r.json();
}

export async function sleeperUser(name) {
  return sleeperGet(`/user/${encodeURIComponent(name)}`,
    s => `Sleeper user not found (${s})`);
}

/* ============================================================
   TIMABILID VERDUR AD VERA TALA — OG SLEEPER SVARAR 200 A RUSLI
   ============================================================
   `App.jsx` gerir `const meta = core.meta || {}`, svo bresti
   `meta.json` er `meta.season` **`undefined`** — og badir kallendur
   (`DraftBoard.jsx:1526`, `MyTeam.jsx:217`) senda hana hingad obreytta.

   TILKYNNT VAR AD NOTANDINN FENGI HRATT 404. ÞAD ER RANGT, OG
   RAUNVERULEIKINN ER VERRI. Maelt 25.8.2026 a lifandi endapunkti:

     /user/{id}/leagues/nfl/undefined   ->  HTTP **200**, farmur `[]`
     /user/{id}/leagues/nfl/2026        ->  HTTP 200, 10.964 baeti

   404 hefdi verid SYNILEG bilun. `[]` er thad ekki: appid segir
   "thu att engar deildir" — sjalfsoruggt, rangt og fullkomlega
   truverdugt svar — og notandinn fer ad leita ad vandamalinu i
   Sleeper-reikningnum sinum. Orsokin er hins vegar OKKAR: `meta.json`
   hladst ekki.

   Þess vegna er hlidid HER og ekki hja kallendunum: eitt hlid ber bada,
   og bodin nefna RETTA ORSOK i stad thess ad endursegja HTTP-stodu sem
   var 200 hvort sem er.                                              */
export async function sleeperLeagues(userId, season) {
  /* `Number(null)` er 0 og `Number("")` er 0, svo `Number.isFinite`
     eitt hleypir badum i gegn sem ari 0. Sama gildra og `num()`-verdirnir
     annars stadar i thessu repo. */
  const yr = season == null || season === "" ? null : Number(season);
  if (!Number.isFinite(yr) || yr < 2000 || yr > 2100) {
    throw new Error(
      "Could not read the current season from our own data (meta.json), " +
      "so your leagues cannot be looked up. This is not a Sleeper problem — " +
      "reload, and if it persists check the Sources tab.");
  }
  return sleeperGet(`/user/${userId}/leagues/nfl/${yr}`,
    s => `Could not read your leagues (${s})`);
}

/** Deildin sjalf — REGLURNAR. Stigagjof, saeti, lidafjoldi, draft-id. */
export async function sleeperLeague(leagueId) {
  return sleeperGet(`/league/${leagueId}`, s => `League not found (${s})`);
}

/** Notendur i deild — thadan koma LIDSHEITIN sem saetavalid byggir a. */
export async function sleeperLeagueUsers(leagueId) {
  return sleeperGet(`/league/${leagueId}/users`,
    s => `Could not read the league members (${s})`);
}

/** Hopar allra lida i deild — thadan kemur THINN hopur. */
export async function sleeperRosters(leagueId) {
  return sleeperGet(`/league/${leagueId}/rosters`,
    s => `Could not read the rosters (${s})`);
}

/* ============================================================
   UPPSTILLINGIN EINS OG HUN VAR — EKKI EINS OG HUN ER
   ============================================================
   `sleeperRosters` ber `starters` EINS OG THEIR ERU NUNA. Thad er
   ONNUR STAERD en "hvad var i saetunum i viku 6", og munurinn er allur
   tilgangur `benchRegret`: spurningin er hvad ThU gerdir tha, ekki hvad
   thu ert med i dag. Notandi sem lagadi uppstillinguna a manudegi
   maeldist med fullkomna viku ef nuverandi rostur vaeri lesinn.

   `/league/{id}/matchups/{week}` ber `starters` (rod audkenna, i
   saeta-rod) og `players` (allur hopurinn) EINS OG THAU VORU i theirri
   viku — Sleeper geymir thad. Bekkurinn er `players` minus `starters`.

   VIKAN ER SKYLDA I SLODINNI, svo hvert kall er um EINA viku og getur
   ekki skilad "sidustu" viku thegjandi.                              */
export async function sleeperMatchups(leagueId, week) {
  return sleeperGet(`/league/${leagueId}/matchups/${week}`,
    s => `Could not read week ${week} lineups (${s})`);
}

export async function sleeperDrafts(leagueId) {
  return sleeperGet(`/league/${leagueId}/drafts`, s => `Draft not found (${s})`);
}

/* ÞESSAR TVAER ERU POLLADAR I BEINNI — theim ma ekki svara ur
   jadar-minni. Sja `bustCache`. `fresh` er ekki valkostur kallandans:
   badar leidir (tenging OG pollun) vilja ferskt svar, og valkostur sem
   annar kallandi getur gleymt er sama villan aftur.                   */
export async function sleeperDraft(draftId) {
  return sleeperGet(`/draft/${draftId}`, s => `Draft not found (${s})`,
    { fresh: true });
}

export async function sleeperPicks(draftId) {
  return sleeperGet(`/draft/${draftId}/picks`, s => `Could not read the picks (${s})`,
    { fresh: true });
}

/* ============================================================
   EIN SLOD -> ALLT SEM DEILDIN GEFUR
   ============================================================
   Notandinn limir inn thad sem hann HEFUR i vafranum, sem er nanast
   alltaf deildarslodin (`/leagues/{id}/predraft`). Gamla reitið tok
   adeins vid draft-id og gamla `extractDraftId` kalladi FYRSTA
   tolustrenginn draft-id — svo deildarslod gaf `/draft/{leagueId}`
   og 404 fyrir slod sem var alveg rett.

   Bert audkenni er TVIRAETT (deildar- og draft-id eru bædi 19 stafa
   snjokorn og ekki adgreinanleg a forminu), svo tha er DEILDIN reynd
   fyrst og draftid til vara. Deildin fyrst thvi hun ber reglurnar OG
   `draft_id`, svo su leid gefur allt i tveimur kollum.

   `users`/`rosters` MEGA BRESTA an thess ad allt falli: their eru til
   fyrir saetavalið eitt. Reglurnar eru komnar an theirra.           */
export async function sleeperResolve(input) {
  const { kind, id } = parseSleeperInput(input);
  if (!id) throw new Error("No Sleeper id in that text");

  let league = null, draft = null;

  /* `r.ok` er EKKI eina hlidid. Sleeper svarar 404 med bodinu `null`
     fyrir audkenni sem er ekki til (mælt 12.8.2026), en 200 med tomum
     hlut er lika moguleiki — og tomur hlutur er `truthy`, svo hann
     hefdi lesist eins og deild sem fannst og allt nedar hefdi bygt a
     honum. Svarid gildir adeins ef thad ber SITT EIGID audkenni. */
  const isLeague = (x) => !!(x && typeof x === "object" && x.league_id);
  const isDraft = (x) => !!(x && typeof x === "object" && x.draft_id);

  if (kind === "league" || kind === "id") {
    try {
      const got = await sleeperLeague(id);
      if (isLeague(got)) league = got;
      else if (kind === "league") throw new Error("That league could not be found");
    } catch (e) { if (kind === "league") throw e; }
  }
  if (!league && (kind === "draft" || kind === "id")) {
    const got = await sleeperDraft(id);
    if (isDraft(got)) draft = got;
    else throw new Error("No league or draft could be found with that id");
    if (draft.league_id) {
      try {
        const lg = await sleeperLeague(draft.league_id);
        if (isLeague(lg)) league = lg;
      } catch { /* draft an deildar (mock draft) — thad er gilt */ }
    }
  }

  if (league && !draft) {
    /* `league.draft_id` er thad sem Sleeper-vidmotid sjalft notar.
       `/league/{id}/drafts` er varaleid fyrir deildir sem bera fleiri
       en eitt draft (t.d. endurtekid mock). */
    if (league.draft_id) {
      try {
        const got = await sleeperDraft(league.draft_id);
        if (isDraft(got)) draft = got;
      } catch { /* naest */ }
    }
    if (!draft) {
      try {
        const ds = await sleeperDrafts(league.league_id || id);
        draft = (Array.isArray(ds) ? ds : []).find(isDraft) || null;
      } catch { /* draft er ekki til enn */ }
    }
  }

  let users = null, rosters = null;
  const lid = league && league.league_id ? league.league_id : null;
  if (lid) {
    [users, rosters] = await Promise.all([
      sleeperLeagueUsers(lid).catch(() => null),
      sleeperRosters(lid).catch(() => null),
    ]);
  }

  return { league, draft, users, rosters };
}

/* ============================================================
   VISTUN NOTANDA-STILLINGA
   ============================================================
   Deildarsnid, vaktlisti og draft-id eru NOTANDA-GOGN. Their fara i
   `localStorage` undir `nfl_*` og ALDREI i neitt kall ut — sama
   regla og `fpl_*` i hinu appinu.                                  */

const KEY = "nfl_";

export function loadState(name, fallback) {
  try {
    const raw = localStorage.getItem(KEY + name);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    /* Snidid ma breytast milli utgafna. Ef vistada gildid er ekki af
       somu tegund og sjalfgefna gildid er thvi HENT, ekki bland.
       `loadState` sem les oheilt blob beint i state felldi hitt appid
       vid HVERJA hledslu — sja CLAUDE.md kafla 8. */
    if (v == null) return fallback;
    if (Array.isArray(fallback) !== Array.isArray(v)) return fallback;
    if (typeof v !== typeof fallback) return fallback;
    return v;
  } catch { return fallback; }
}

export function saveState(name, value) {
  try { localStorage.setItem(KEY + name, JSON.stringify(value)); }
  catch { /* fullt geymslurými ma ekki fella appid */ }
}

/* ============================================================
   ASTAND SEM ER BUNDID EINNI DEILD
   ============================================================
   `taken`, `myPicks` og `sync` eru EKKI global. Their tilheyra EINU
   drafti. Notandi med thrjar deildir sem deildi theim mengjum saei
   leikmenn sem hann tok i deild A strikada ut i deild B — og "hvern a
   ad taka naest" myndi telja hop sem hann eigir ekki. Thess vegna er
   lyklunum skeytt vid audkenni — DEILDAR fyrir handvirka skraningu,
   DEILDAR OG DRAFTS thegar draft er tengt (sja `boardScope` nedar).

   ÞAU ERU EKKI I DEILDARFAERSLUNNI SJALFRI af asettu radi: `taken`
   staekkar i ~150 audkenni og breytist vid HVERT val, svo hun myndi
   endurskrifa allan deildarlistann i hverjum tikk. Faerslan ber thad
   sem er LITID og fast (reglur, lidsheiti, saeti); mengin bua ser.  */
export const scoped = (name, leagueId) => `${name}:${leagueId || "local"}`;

/* ============================================================
   OG DEILDIN VAR EKKI NOG — VOLIN TILHEYRA DRAFTINU (16.8.2026)
   ============================================================
   Athugasemdin hér ad ofan sagdi thegar "their tilheyra EINU drafti".
   Kodinn skoradi thau vid DEILDINA. Thad er ekki sama hlutur, og
   munurinn er allur i agust: EITT mock a eftir odru i somu deild.

   MAELT (`draft-live.mjs` kafli 15, endurgerd ur lysingu notandans):
   mock A med 59 volum, sidan F5, sidan tengt vid nytt mock B med
   THREMUR volum -> bordid syndi **62** og "Pick 63". Med tomu mock B
   (thad sem hann sa) syndi thad 59 og **"Pick 60 - take this"** a
   drafti sem var rett ad byrja.

   MEKANISMINN ER TVITHAETTUR og bædi tharf til:
     1. `taken` var vistad a DEILDINNI, svo mock B las mengi mock A.
     2. `lastSync` — vidmidid sem mismunar-reglan i `onPicks` dregur
        fra — er `useRef`, svo hun byrjar TOM vid hverja hledslu.
        Fyrsta pollun eftir mount hefur thvi `gone = tomt mengi` og
        GETUR EKKERT ANNAD EN BAETT VID. Mismunurinn sem var smiðadur
        til ad hleypa Sleeper ad taka til baka fellur nidur i sammengi
        thvert yfir hledslu.

   Ad festa (2) eina vaeri ekki nog: handvirk vol eru VILJANDI utan
   mismunarins (their eru thin skraning, ekki Sleepers), svo thau lakau
   afram milli drafta i SOMU lotu — maelt: 3 handvirk + 3 ny = 6.
   Skorðunin sjalf er thvi lagfaeringin, ekki refin.

   MOCK-DRAFT AN DEILDAR fellur undir `local`, eins og adur; thad sem
   greinir thau ad er draft-audkennid, sem er einkvaemt hja Sleeper.

   AUDKENNID VERDUR AD LITA HEILT UT. Notandinn slaer/limir i reitinn,
   og hvert innslattar-atvik gefur nytt gildi — "1", "13", "138"… Vaeri
   hvert theirra sitt bord myndi bordid tæmast i hverjum staf og skilja
   eftir hálfskrifud bord i geymslunni. Sleeper-audkenni eru 18-19
   stafa tolu-snjokorn, svo krafan er BER TALA af raunhaefri lengd;
   allt annad (thar med talid gamla `sync`-astandid ur profum og
   handskrifad rusl) fellur a deildina eins og adur. Vordurinn gegn
   hálfskrifudum bordum er samt EKKI thessi krafa heldur `saveScoped`
   hér nedar — ein regla sem gildir hvad sem sniðinu lidur.           */
const DRAFT_ID_RE = /^[0-9]{6,32}$/;
export const boardScope = (leagueId, draftId) => {
  const base = leagueId || "local";
  const d = typeof draftId === "string" ? draftId.trim() : "";
  return DRAFT_ID_RE.test(d) ? `${base}@${d}` : base;
};

/**
 * Vistar lista undir skoruðum lykli — EN BYR ALDREI TIL TOMAN LYKIL.
 *
 * Ad skrifa `[]` a lykil sem er ekki til er merkingarlaust (`loadState`
 * skilar sjalfgefna gildinu hvort sem er) og thad er OSKAÐLEGT: medan
 * draft-audkenni er slegid inn faerist bordid gegnum hvert millistig
 * audkennisins, og an thessarar reglu aetti notandinn eitt tomt bord i
 * geymslunni fyrir hvern staf sem hann slo.
 *
 * ÞVI ER SNUID VID THEGAR LYKILLINN ER TIL: tom vistun a lykil sem er
 * til er EKKI hunsud. "Reset" hreinsar bordid og thad VERDUR ad rata i
 * geymsluna, annars kaemi thad aftur vid naestu hledslu.
 */
export function saveScoped(key, list) {
  try {
    const arr = Array.isArray(list) ? list : [];
    if (!arr.length && localStorage.getItem(KEY + key) == null) return;
  } catch { /* geymsla ekki laesileg — latum `saveState` um thad */ }
  saveState(key, list);
}

/**
 * Flytur gamla olyklada astandid inn a fyrstu deildina. AN THESSA
 * TAPAR NOTANDI SEM ER I MIDJU DRAFTI ollu sem hann hafdi valid um
 * leid og uppfaerslan kemur — mengid er i vafranum og fer hvergi, en
 * appid myndi hætta ad leita ad thvi.
 *
 * Gamli lykillinn er EKKI eyddur. Hann er nokkur kilobaet og eyding er
 * oafturkræf; se eitthvad ad vorpuninni er frumgagnid enn til.
 */
export function migrateScopedState(leagueId) {
  for (const name of ["taken", "myPicks", "sync"]) {
    try {
      const legacy = localStorage.getItem(KEY + name);
      const target = KEY + scoped(name, leagueId);
      if (legacy != null && localStorage.getItem(target) == null) {
        localStorage.setItem(target, legacy);
      }
    } catch { /* full geymsla ma ekki fella appid */ }
  }
}

/**
 * Hendir astandi eins bords thegar thvi er lokad.
 *
 * TEKUR VID BAEDI DEILD OG BORDI. Se `id` deild (`local`) fara LIKA oll
 * bord hennar (`local@123…`) — annars saeti hvert draft sem deildin
 * hafdi tengst eftir sem munadarlaus lykill thegar deildinni er lokad,
 * og theim fjolgar med hverju mock-i. Prefix-leitin getur ekki hitt a
 * ADRA deild: skilin eru `@`, sem kemur hvergi fyrir i deildar-audkenni.
 */
export function dropScopedState(id) {
  const base = id || "local";
  for (const name of ["taken", "myPicks", "sync"]) {
    try { localStorage.removeItem(KEY + scoped(name, base)); } catch { /* ekkert */ }
    try {
      const pre = `${KEY}${name}:${base}@`;
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(pre)) doomed.push(k);
      }
      for (const k of doomed) localStorage.removeItem(k);
    } catch { /* ekkert ad gera */ }
  }
}

/**
 * Skrair bord sem var opnad og HENDIR THEIM ELSTU.
 *
 * Hvert mock-draft er sitt bord (sja `boardScope`), svo agust-vikan ein
 * getur skilid eftir tugi theirra. Hvert er ~1-2 KB, sem er engin
 * kreppa — en "safnast ad eilifu" er samt rangt svar, og geymslan er
 * sameiginleg med ollu odru sem appid vistar.
 *
 * SIDAST-NOTAD ROD, EKKI TIMASTIMPILL: rodin i listanum ER upplysingin
 * og hun getur ekki skekkst thott klukka notandans hoppi.
 *
 * ADEINS DRAFT-BORD (`@`) eru talin. Deildar-bordid sjalft — handvirka
 * skraningin — ma ALDREI detta ut af aldri; thad er eina eintakid af
 * volum sem enginn Sleeper-endapunktur getur skilad aftur.
 *
 * ============================================================
 * OG BORD SEM HEFUR ENGIN VOL FAER ENGAN SESS (19.8.2026)
 * ============================================================
 * ÞETTA VAR VERSTA VILLAN I APPINU og hun eyddi bordi i midju drafti:
 * **ad slá eda lima draft-audkenni I HENDI eyddi ollum vistudum
 * bordum, thar med thvi sem var i gangi.**
 *
 * KEDJAN, OG HVERT HLEKKUR ER RETTUR I SINU LAGI:
 *   1. `DRAFT_ID_RE` tekur 6-32 tolustafi (hér ad ofan).
 *   2. Reiturinn i `DraftBoard` uppfaerir `sync.draftId` VID HVERN
 *      INNSLATT — thad er rett, annars vaeri reiturinn ekki stýrdur.
 *   3. Hver breyting a `scope` kallar hingad.
 *
 * Raunverulegt Sleeper-audkenni er 19 stafa snjokorn, svo ad slá thad
 * gefur **14 millistig** sem OLL standast regexid ("140000000000",
 * "1400000000000", …). Hvert theirra tok sess i listanum, listinn
 * fylltist (8 sess) og MAELT (`repro`, 19 stafa audkenni):
 * bord med 59 volum -> **0 vol, lykillinn eyddur**, og listinn bar
 * atta halfslegin audkenni sem enginn hafdi nokkurn timann draftad i.
 *
 * ÞAD SEM VAR RANGT VAR EKKI REGEXID HELDUR HVER FAER SESS. Ad threngja
 * regexid vaeri agiskun um snid sem Sleeper akvedur (og feilar i attina
 * ad gomlu villunni: tvo mock deila bordi), og thad naegir ekki heldur —
 * 19 stafa audkenni ber enn millistig 16, 17 og 18. Reglan sem GILDIR
 * hvad sem sniðinu lidur er su sama og `saveScoped` beitir a lyklana:
 *
 *   **BORD SEM ENGIN VOL ERU I ER EKKERT VIRDI. Þad tekur engan sess
 *   og getur thvi ekki ytt neinu ut.** Millistig audkennis fær aldrei
 *   val, svo thad kemur aldrei inn i listann. Bord sem FAER sitt fyrsta
 *   val skrair sig tha — sja `hasPicks` i `DraftBoard`.
 *
 * OG GRISJUNIN SJALF ER TAKMORKUD VID EITT BORD I KALLI. Med reglunni
 * hér ad ofan getur listinn adeins vaxid um eitt per kall, svo eitt er
 * allt sem tharf. Se listinn samt EINHVERN VEGINN lengri (eldri
 * utgafa, `max` laekkad) er hann STYTTUR AN EYDINGAR: lykill sem
 * lifir af er 2 KB sem ma sopa sidar (`dropScopedState` a deildina,
 * `clearState`), en bord sem er eytt kemur ekki til baka. Vordur:
 * `draft-live.mjs` kafli 15c, `saved-state.mjs` kafli 8f.
 */
function boardHasPicks(scope) {
  for (const name of ["taken", "myPicks"]) {
    const v = loadState(scoped(name, scope), []);
    if (Array.isArray(v) && v.length > 0) return true;
  }
  return false;
}

export function touchBoardScope(scope, max = 8) {
  try {
    if (typeof scope !== "string" || !scope.includes("@")) return;
    if (!boardHasPicks(scope)) return;
    const prev = loadState("boards", []);
    const list = (Array.isArray(prev) ? prev : [])
      .filter((s) => typeof s === "string" && s !== scope);
    list.push(scope);
    const over = Math.max(0, list.length - max);
    /* Eitt bord ma eydast, ekki fleiri — sja hausinn. Hin sem eru
       stytt af listanum halda lyklum sinum. */
    const trimmed = list.splice(0, over);
    if (trimmed.length) dropScopedState(trimmed[0]);
    saveState("boards", list);
  } catch { /* full geymsla ma ekki fella appid */ }
}

/** Hreinsar OLL `nfl_*` — valid, ekki harðkodadur listi. */
export function clearState() {
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY)) doomed.push(k);
    }
    for (const k of doomed) localStorage.removeItem(k);
  } catch { /* ekkert ad gera */ }
}
