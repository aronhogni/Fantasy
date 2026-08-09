/* ============================================================
   BSD — LIDS-TOLUR UR SKOTAKORTI (big chances A SIG og FYRIR)

   AF HVERJU SER SKRIFTA VID HLIDINA A `fetch-bsd.mjs`: su skrifta er
   PER LEIKMANN (`bsd_players.json`) og getur ekki svarad "hvad faer
   thetta LID a sig" — leikmanna-summa yfir timabil veit ekkert um hver
   motherjinn var i hverjum leik. Faced-tolur krefjast thess ad hvert
   skot se eignad LIDI og hinu lidinu talid a moti, per leik.

   ThAD SEM ThETTA GEFUR OG EKKERT ANNAD I REPO-INU GEFUR:
     big chances A SIG   — thad sem markvordur ma raunverulega buast vid
     big chances FYRIR   — soknar-hlidin a sama maelikvarda
     xG a hvert skot a sig — GAEDI faeranna, ekki magnid

   TVAER TOLUR, EKKI EIN — OG ThAD ER ASETT:
     `bc_*_derived`  = skot med xg >= BIG_CHANCE_XG (0,18), okkar talning
     `bc_*_reported` = lids-svidid `big_chances` ur /events/{id}/stats/,
                       sem BSD birtir sjalft
   Their eru geymdar BADAR svo haegt se ad bera thaer saman i hverri
   keyrslu. Fastinn 0,18 var fittadur gegn thvi svidi (MAE 0,746, r
   0,774 a 748 lid-leikjum, sja fetch-bsd.mjs) og se hann rekinn af
   leid — nytt timabil, nytt xG-likan hja BSD — sest thad STRAX i
   mismuninum i stad thess ad okkar tala reki thogult.

   ThEKJAN ER EITT TIMABIL — ENDURMAELT 8.8.2026 A FLEIRI SYNUM.
   BSD skrair 35 timabil af ensku urvalsdeildinni, en skotakortid nær
   adeins yfir 2025/26 (season_id 337). Maelt med ATTA leikjum DREIFDUM
   yfir hvert timabil (ekki thremur fyrstu, sem hefdu getad verid
   byrjunar-skekkja):

     2024/25   skotakort 0/8   lids-big_chances 0/8
     2023/24   skotakort 0/8   lids-big_chances 0/8
     2021/22   skotakort 0/8   lids-big_chances 0/8
     2017/18   skotakort 0/8   lids-big_chances 0/8

   ThAD ER EKKI ADEINS SKOTAKORTID SEM VANTAR heldur LIKA lids-svidid
   `big_chances`, svo eldri timabil eru ekki nytileg her eftir neinni
   leid. Skran ma thvi ALDREI faeda bakprof — thau krefjast 8-15
   timabila — og dalkarnir sem lesa hana eru tomir i odrum timabilum.

   SKRAN ER SAMT LYKLUD A TIMABIL. 2026/27 (season_id 1058) er i BSD med
   200 leiki, alla `notstarted`. Thegar hun fer af stad slaest hun inn
   vid hlidina a 2025/26 an thess ad thurrka hana ut — sja ad nedan.

   Keyrsla:  BSD_KEY=... node scripts/fetch-bsd-teams.mjs
             BSD_KEY=... node scripts/fetch-bsd-teams.mjs 337
   ============================================================ */
import { writeFileSync, readFileSync } from "node:fs";

const API = "https://sports.bzzoiro.com/api/v2";
const LEAGUE = 1;
export const BIG_CHANCE_XG = 0.18;   // MAELDUR — sja fetch-bsd.mjs
export const IN_BOX_X = 17;          // MAELDUR — hlutfall af FULLUM velli

/* HANDSTADFEST lidatafla (afrit ur fetch-bsd.mjs — fuzzy pörun felldi
   Man United inn i Man City, thvi badir verda "manchester" eftir
   normaliseringu, og thogul RONG pörun er verri en engin).            */
const BSD_TEAM = {
  18: "ARS", 3: "AVL", 2: "BOU", 16: "BRE", 5: "BHA", 13: "CHE", 203: "COV",
  14: "CRY", 20: "EVE", 6: "FUL", 204: "HUL", 200: "IPS", 19: "LEE", 1: "LIV",
  12: "MCI", 17: "MUN", 4: "NEW", 15: "NFO", 9: "TOT", 7: "SUN",
};

/* ============================================================
   HREINA FALLID — allt sem er haegt ad profa an lykils.

   `matches` er fylki af { home, away, shots, reported } thar sem
     home/away  = BSD team_id
     shots      = [{ team_id, xg, x }]   (x = pos.x, ma vanta)
     reported   = { [team_id]: { big_chances } }  (ma vanta)

   ThRJAR REGLUR SEM ERU AKVARDANIR:
     1. SKOT AN LIDS ER SLEPPT, ekki eignad heimalidinu. Rong eignun
        telur BADUM megin rangt (fyrir hja einu, a sig hja hinu) og er
        thvi tvofold villa.
     2. SKOT AN xG telst i `shots` en EKKI i xG ne big chances. Ad lata
        thad gilda 0 myndi thynna medaltalid thogult.
     3. LEIKUR AN SKOTAKORTS TELST EKKI SEM LEIKUR. Annars deildum vid
        med haerri leikjafjolda en gognin na yfir og hver einasta
        per-leik tala yrdi of lag.
   ============================================================ */
export function aggregateTeamShots(matches, { bigChanceXg = BIG_CHANCE_XG, inBoxX = IN_BOX_X } = {}) {
  const T = {};
  const get = id => T[id] || (T[id] = {
    team_id: id, matches: 0,
    for:     { shots: 0, xg: 0, bc: 0, in_box: 0, bc_reported: 0, reported_n: 0 },
    against: { shots: 0, xg: 0, bc: 0, in_box: 0, bc_reported: 0, reported_n: 0 },
  });
  let noTeam = 0, noXg = 0, noShotmap = 0;

  for (const m of matches || []) {
    const sides = [m.home, m.away].filter(v => v != null);
    if (sides.length !== 2) continue;
    const shots = Array.isArray(m.shots) ? m.shots : [];
    if (!shots.length) { noShotmap++; continue; }      // regla 3
    for (const s of sides) get(s).matches++;

    for (const sh of shots) {
      const side = sh?.team_id;
      if (side == null || !sides.includes(side)) { noTeam++; continue; }   // regla 1
      const other = sides[0] === side ? sides[1] : sides[0];
      const f = get(side).for, a = get(other).against;
      f.shots++; a.shots++;
      if (typeof sh.xg === "number") {
        f.xg += sh.xg; a.xg += sh.xg;
        if (sh.xg >= bigChanceXg) { f.bc++; a.bc++; }
      } else noXg++;                                    // regla 2
      if (typeof sh.x === "number" && sh.x <= inBoxX) { f.in_box++; a.in_box++; }
    }

    /* BSD-BIRTA TALAN — geymd vid hlidina, ALDREI i stad okkar. */
    for (const side of sides) {
      const rep = m.reported?.[side]?.big_chances;
      if (typeof rep !== "number") continue;
      const other = sides[0] === side ? sides[1] : sides[0];
      get(side).for.bc_reported += rep;      get(side).for.reported_n++;
      get(other).against.bc_reported += rep; get(other).against.reported_n++;
    }
  }

  const per = (n, m) => (m ? +(n / m).toFixed(3) : null);
  const teams = Object.values(T).map(t => ({
    team_id: t.team_id, short: BSD_TEAM[t.team_id] || null, matches: t.matches,
    bc_pg:            per(t.for.bc, t.matches),
    bc_against_pg:    per(t.against.bc, t.matches),
    bc_reported_pg:         t.for.reported_n ? per(t.for.bc_reported, t.matches) : null,
    bc_reported_against_pg: t.against.reported_n ? per(t.against.bc_reported, t.matches) : null,
    xg_pg:            per(t.for.xg, t.matches),
    xgc_pg:           per(t.against.xg, t.matches),
    /* GAEDIN, EKKI MAGNID: 12 skot a sig segja litid ef ollum er skotid
       ad utan. xG a hvert skot a sig er einmitt su tala.               */
    xg_per_shot_against: t.against.shots ? +(t.against.xg / t.against.shots).toFixed(4) : null,
    xg_per_shot:         t.for.shots ? +(t.for.xg / t.for.shots).toFixed(4) : null,
    shots_pg:         per(t.for.shots, t.matches),
    shots_against_pg: per(t.against.shots, t.matches),
    in_box_pg:         per(t.for.in_box, t.matches),
    in_box_against_pg: per(t.against.in_box, t.matches),
  })).sort((a, b) => (a.bc_against_pg ?? 99) - (b.bc_against_pg ?? 99));

  return { teams, no_team: noTeam, no_xg: noXg, no_shotmap: noShotmap };
}

/* ============================================================
   SOKNIN — krefst BSD_KEY. Allt her ad ofan er profad an hans.
   ============================================================ */
if (import.meta.url === `file://${process.argv[1]}`) {
  /* LYKILLINN: `process.env` fyrst (thad er thad sem GitHub Actions gefur),
     annars `.env.local` sem er i `.gitignore`. Sidari leidin er til svo
     lykillinn thurfi ALDREI ad standa i skipanalinu — skipanalinur rata i
     sogu skeljarinnar og i afrit af spjallinu, og repo-id er PUBLIC.
     ENGIN dependency: `fetch.mjs` les adeins `process.env` og thad er
     asett (CLAUDE.md kafli 9), svo hér er lesid handvirkt i sex linum
     fremur en ad draga dotenv inn i pipeline sem hefur engar.           */
  const readEnvLocal = () => {
    try {
      const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
      for (const line of txt.split("\n")) {
        const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    } catch { /* skran ma vanta */ }
  };
  readEnvLocal();
  const KEY = process.env.BSD_KEY;
  if (!KEY) {
    console.error("BSD_KEY missing. Two ways:");
    console.error("  1) echo 'BSD_KEY=<key>' >> .env.local     (in .gitignore, best)");
    console.error("  2) BSD_KEY=<key> node scripts/fetch-bsd-teams.mjs");
    process.exit(1);
  }
  const SEASON = process.argv[2] || "337";
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const get = async (path, tries = 3) => {
    for (let i = 0; i < tries; i++) {
      try {
        const r = await fetch(API + path, {
          headers: { Authorization: `Token ${KEY}`, "user-agent": "fantasy-tool" },
          signal: AbortSignal.timeout(45000),
        });
        if (r.ok) return await r.json();
        if (r.status === 429 || r.status >= 500) { await sleep(1500 * (i + 1)); continue; }
        throw new Error(`HTTP ${r.status} ${path}`);
      } catch (e) { if (i === tries - 1) throw e; await sleep(800 * (i + 1)); }
    }
  };
  const pool = async (items, n, fn) => {
    let i = 0;
    await Promise.all(Array.from({ length: n }, async () => {
      while (i < items.length) { const k = i++; try { await fn(items[k]); } catch { /* talid nedar */ } }
    }));
  };

  const events = [];
  for (const off of [0, 200]) {
    const d = await get(`/events/?league_id=${LEAGUE}&season_id=${SEASON}&limit=200&offset=${off}`);
    events.push(...(d.results || []));
  }
  const finished = events.filter(e => e.status === "finished");
  console.log(`BSD season ${SEASON}: ${finished.length} matches finished`);

  const matches = [];
  const missed = [];
  let done = 0;
  const grabOne = async (e) => {
    const [st, ps] = await Promise.all([
      get(`/events/${e.id}/stats/`).catch(() => null),
      get(`/events/${e.id}/player-stats/`).catch(() => null),
    ]);
    /* ThOGULT GAGNATAP ER VERRA EN ENGIN SKRA — sama regla og i
       fetch-bsd.mjs: mistekin koll eru TALIN og keyrslan deyr fremur
       en ad skrifa hluta-timabil sem litur ut eins og heilt.          */
    if (!st || !ps) { missed.push(e.id); return; }
    const teamOfPlayer = {};
    for (const r of ps.player_stats || []) if (r.player_id != null) teamOfPlayer[r.player_id] = r.team_id;
    const shots = (st.shotmap || []).map(s => ({
      team_id: s.team_id ?? teamOfPlayer[s.player_id] ?? null,
      xg: typeof s.xg === "number" ? s.xg : null,
      x: s.pos?.x,
    }));
    /* SNIÐIÐ ER MAELT, EKKI TEKID UR SKJOLUN: `st.stats` er HLUTUR med
       `home`/`away`, ekki fylki af lidum. Fyrsta utgafan las
       `st.statistics || st.teams` (fylki) og fann thvi ekkert — talan
       var null i heilli keyrslu OG krossprofunin thagdi med henni.
       Thess vegna er MAE-talan skrifud i skrana: se hun null aftur er
       sniðið breytt og thad sest STRAX.                                */
    const home = e.home_team_id ?? e.home?.id, away = e.away_team_id ?? e.away?.id;
    const reported = {};
    for (const [side, id] of [["home", home], ["away", away]]) {
      const bc = st.stats?.[side]?.big_chances;
      if (id != null && typeof bc === "number") reported[id] = { big_chances: bc };
    }
    matches.push({ event_id: e.id, home, away, shots, reported });
    if (++done % 50 === 0) console.log(`  matches ${done}/${finished.length}`);
  };
  await pool(finished, 6, grabOne);

  /* ONNUR ATRENNA A THA SEM DUTTU — RADBUNDID OG ROLEGA.
     Fyrsta atrennan keyrir 6 samhlida og BSD dettur stundum a einstaka
     kalli undir thvi alagi (maelt: 4 af 380). Ad deyja a thvi vaeri
     ovirding vid 756 heppnud koll; ad skrifa an theirra vaeri thogult
     gagnatap. Thess vegna: reyna aftur, EINN i einu, og deyja fyrst ef
     eitthvad stendur enn eftir. Sama regla og i fetch-bsd.mjs.        */
  if (missed.length) {
    console.log(`${missed.length} matches dropped — second attempt, sequential`);
    const still = [];
    for (const id of missed) {
      const e = finished.find(x => x.id === id);
      await sleep(400);
      try { await grabOne(e); } catch { still.push(id); }
      if (!matches.some(m => m.event_id === id)) still.push(id);
    }
    if (still.length) {
      console.error(`${still.length} matches STILL failed — NOT WRITING A PARTIAL SEASON.`);
      process.exit(1);
    }
  }

  /* TOM KEYRSLA MA ALDREI ThURRKA UT GOD GOGN.
     2026/27 er i BSD med 200 leiki og ENGAN lokinn. An thessa vardar
     hefdi `node fetch-bsd-teams.mjs 1058` skrifad skra med NULL lidum
     ofan a heilt 2025/26 — og hun hefdi litid ut eins og maeling
     ("engin big chances"), sem er nakvaemlega gildran sem kafli 3 og 6n
     fordast. Keyrslan deyr thvi fremur en ad skrifa tomt timabil.      */
  if (!matches.length) {
    console.error(`Season ${SEASON}: NO match has a shot map. `
      + `WRITING NOTHING — an empty file on top of good data is worse than no run at all.`);
    console.error(`(BSD only has shot maps for 2025/26, season_id 337 — measured 8.8.2026.)`);
    process.exit(2);
  }

  const agg = aggregateTeamShots(matches);

  /* PORUN VID FPL — sama regla og annars stadar: opörud lid fa null,
     ALDREI 0, og eru NEFND svo hvarfid se synilegt.                   */
  let fplTeams = [];
  try {
    const raw = JSON.parse(readFileSync(new URL("../data/teams.json", import.meta.url), "utf8"));
    fplTeams = Array.isArray(raw) ? raw : (raw.teams || []);
  } catch { /* skran ma vanta */ }
  const byShort = {};
  for (const t of fplTeams) byShort[String(t.short).toUpperCase()] = t;
  for (const t of agg.teams) {
    const f = t.short ? byShort[t.short] : null;
    t.fpl_id = f?.id ?? null;
    t.name = f?.name ?? null;
  }

  /* KROSSPROFUN I HVERRI KEYRSLU: okkar talning gegn BSD-birtu tolunni. */
  const pairs = agg.teams.filter(t => t.bc_pg != null && t.bc_reported_pg != null);
  const mae = pairs.length
    ? +(pairs.reduce((a, t) => a + Math.abs(t.bc_pg - t.bc_reported_pg), 0) / pairs.length).toFixed(3)
    : null;

  /* NAFN TIMABILSINS ER SOTT, EKKI HARDKODAD: "2025/26" var fast i
     skranni og hefdi login um leid og annad timabil vaeri sott.        */
  let seasonName = String(SEASON);
  try {
    const ls = await get(`/leagues/${LEAGUE}/seasons/`);
    const hit = (ls.seasons || []).find(x => String(x.id) === String(SEASON));
    if (hit?.year) seasonName = `${hit.year}/${String((hit.year + 1) % 100).padStart(2, "0")}`;
  } catch { /* nafnid ma vanta — id-id dugar */ }

  const payload = {
    updated: new Date().toISOString(),
    source: "bsd_shotmap", league_id: LEAGUE, season_id: SEASON, season: seasonName,
    matches: matches.length,
    big_chance_xg: BIG_CHANCE_XG, in_box_x: IN_BOX_X,
    derived_vs_reported_mae: mae,
    note: "Big chances against and for, derived from the BSD shot map (per-shot xG, "
        + "threshold 0.18, fitted against the club-level field `big_chances`). "
        + "BOTH figures are kept — our own count (bc_*) and the BSD published figure "
        + "(bc_reported_*) — so drift shows up IMMEDIATELY instead of our figure "
        + "drift silently. COVERAGE IS ONE SEASON: BSD has shot maps for all "
        + "380 matches in 2025/26 and NONE in earlier seasons, so this file must "
        + "NEVER feed a backtest, and the columns are empty in other seasons.",
    no_team: agg.no_team, no_xg: agg.no_xg, no_shotmap: agg.no_shotmap,
    unmatched_to_fpl: agg.teams.filter(t => t.fpl_id == null).map(t => t.short || t.team_id),
    teams: agg.teams,
  };
  /* SAMEINAD, EKKI YFIRSKRIFAD. Onnur timabil sem hafa verid sott
     halda ser; adeins thad sem var keyrt nuna er endurskrifad. Efsta
     lagid speglar NYJASTA timabilid sem hefur gogn, svo vidmot sem les
     skrana beint (og profin) haldast obreytt.                          */
  const dest = new URL("../data/bsd_teams.json", import.meta.url).pathname;
  let bySeason = {};
  try {
    const old = JSON.parse(readFileSync(dest, "utf8"));
    bySeason = old.seasons || (old.season ? { [old.season]: old } : {});
  } catch { /* fyrsta keyrsla */ }
  bySeason[seasonName] = payload;
  const newest = Object.values(bySeason)
    .sort((a, b) => String(b.season).localeCompare(String(a.season)))[0];
  writeFileSync(dest, JSON.stringify({ ...newest, seasons: bySeason }, null, 1));
  console.log(`\nskrifad ${dest}`);
  console.log(`lid ${agg.teams.length} · an lids ${agg.no_team} · an xG ${agg.no_xg} `
            + `· without a shot map ${agg.no_shotmap} · MAE ours-vs-published ${mae}`);
}
