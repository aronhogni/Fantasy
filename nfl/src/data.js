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
export function setBase(b) { BASE = b; }

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
 */
export async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const p = (async () => {
    try {
      const r = await fetch(`${BASE}/${name}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch {
      return null;
    }
  })();
  cache.set(name, p);
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
export const loadMarket = () => load("market.json");
export const loadMarketHistory = () => load("market_history.json");
export const loadNews = () => load("news.json");
export const loadWeekly = (year) => load(`weekly/${year}.json`);

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

export async function sleeperUser(name) {
  const r = await fetch(`${SLEEPER}/user/${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error(`Notandi fannst ekki (${r.status})`);
  return r.json();
}

export async function sleeperLeagues(userId, season) {
  const r = await fetch(`${SLEEPER}/user/${userId}/leagues/nfl/${season}`);
  if (!r.ok) throw new Error(`Deildir fundust ekki (${r.status})`);
  return r.json();
}

/** Hopar allra lida i deild — thadan kemur THINN hopur. */
export async function sleeperRosters(leagueId) {
  const r = await fetch(`${SLEEPER}/league/${leagueId}/rosters`);
  if (!r.ok) throw new Error(`Roster fannst ekki (${r.status})`);
  return r.json();
}

export async function sleeperDrafts(leagueId) {
  const r = await fetch(`${SLEEPER}/league/${leagueId}/drafts`);
  if (!r.ok) throw new Error(`Draft fannst ekki (${r.status})`);
  return r.json();
}

export async function sleeperDraft(draftId) {
  const r = await fetch(`${SLEEPER}/draft/${draftId}`);
  if (!r.ok) throw new Error(`Draft fannst ekki (${r.status})`);
  return r.json();
}

export async function sleeperPicks(draftId) {
  const r = await fetch(`${SLEEPER}/draft/${draftId}/picks`);
  if (!r.ok) throw new Error(`Val fundust ekki (${r.status})`);
  return r.json();
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
