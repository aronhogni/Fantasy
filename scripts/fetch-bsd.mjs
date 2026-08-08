/* ============================================================
   BSD (sports.bzzoiro.com) — LEIKMANNATOLUR UR LOKNU TIMABILI

   KEYRT HANDVIRKT, EKKI I DAGLEGU PIPELINE. Astaedan er su sama og
   i `fetch-team-shots.mjs`: thetta eru ~1.400 koll (380 leikir x 2
   endapunktar + ~700 leikmanna-uppflettingar). Timabil sem er LOKID
   BREYTIST EKKI, svo skran er skrifud EINU SINNI og committud.

   Keyrsla:  BSD_KEY=... node scripts/fetch-bsd.mjs
             BSD_KEY=... node scripts/fetch-bsd.mjs 337        (annad timabil)

   ------------------------------------------------------------
   HVAD ThETTA GEFUR SEM EKKERT ANNAD I REPO-INU GEFUR
   ------------------------------------------------------------
   1. PER-SKOT xG. Maelt 8.8.2026: 100% skota i ollum 380 leikjum
      2025/26 bera `xg`. Understat er daudur, FBref/SofaScore 403 og
      ESPN gefur hnit EN ENGA xG (CLAUDE.md 6b/6e). Thetta er i fyrsta
      sinn sem repo-id hefur per-skot xG.
   2. RAUNVERULEG "faeri skopud" (`key_pass`). ESPN-talan er lesin ur
      TEXTA og er GOLF (76% skota nefna upplegg, CLAUDE.md 6f).
   3. GRANULAR VARNARTOLUR. FPL bundlar CBI i eina tolu; hér eru
      tacklingar, stodvanir, hreinsanir og endurheimtur ADSKILDAR.
   4. Einkunn (`rating`) per leik.

   ------------------------------------------------------------
   DAUD SVID — MAELD 8.8.2026, MEGA ALDREI RATA I SKRANA
   ------------------------------------------------------------
   Thessi svid eru TIL i svarinu, eru 100% non-null og ERU ALLTAF NULL.
   Svid sem er alltaf 0 LITUR UT EINS OG MAELING en thydir "gognin eru
   ekki til" — nakvaemlega gildran sem kafli 3 og 6n fordast:

     big_chance_created · big_chance_missed · expected_goals_on_target
     goals_prevented · keeper_save_value · *_value_normalized
     ball_carries_count · progressive_ball_carries_count · total_progression
     outfielder_block · error_lead_to_a_shot · error_lead_to_a_goal
     hit_woodwork · high_claims · good_high_claim · last_man_tackle
     clearance_off_line · total_offside · challenge_lost · unsuccessful_touch
     saved_shots_from_inside_the_box · accurate_keeper_sweeper
     total_keeper_sweeper · accurate/total_own_half_passes
     accurate/total_opposition_half_passes

   ThAD ThYDIR AD **BIG CHANCES PER LEIKMANN ERU EKKI TIL** hja BSD,
   thott svidid heiti thvi. Handoff №5 §B2 hefdi sent dalk af nullum.
   Team-svidid `big_chances` i /events/{id}/stats/ ER hins vegar RAUNVERULEGT
   (0-8 per lid-leik), svo big chances eru LEIDDAR UT UR SKOTUNUM —
   sja BIG_CHANCE_XG.

   ------------------------------------------------------------
   TVEIR MAELDIR FASTAR — EKKI GISKADIR, EKKI FLUTTIR
   ------------------------------------------------------------
   BIG_CHANCE_XG = 0,18. Fittad gegn RAUNVERULEGA lids-svidinu
   `big_chances` a 748 lid-leikjum: MAE 0,746 · r 0,774. Handoff №5 §B3
   lagdi til 0,35 — thad maelist MAE 1,385 / r 0,612, th.e. TVOFALT
   verri. Threpin: 0,15 → 0,841 · 0,18 → **0,746** · 0,20 → 0,785 ·
   0,25 → 0,985 · 0,35 → 1,385.

   IN_BOX_X = 17. Fittad gegn lids-svidinu `shots_inside_box` a 760
   lid-leikjum: MAE 0,133 (the. nanast nakvaemt).
   **KVARDINN ER ANNAR EN HJA ESPN.** BSD-`pos.x` er hlutfall af FULLUM
   velli (105 m): vitateigur 16,5 m = 15,7 og optimum maelist 16,5-17.
   ESPN-kvardinn (hlutfall af HALFUM velli, 52,5 m → 31,4) gefur
   MAE 4,079 og er thar med UTILOKADUR. Handoff №2 varadi vid ad flytja
   ESPN-regluna yfir — su vorun var rett og hér er malid maelt i stadinn.

   ------------------------------------------------------------
   VORPUN VID FPL
   ------------------------------------------------------------
   Lidin: HANDSTADFEST tafla (BSD_TEAM), 20↔20 gagntaek. Fuzzy pörun
   felldi Man United inn i Man City (badir "manchester" eftir
   normaliseringu) — thogul RONG pörun er verri en engin.
   Leikmenn: eitt-a-eitt pörun (haesta skor fyrst), skordud vid LID og
   stadfest med STODU. Oparadir fa `fpl_id: null`, ALDREI 0.
   ============================================================ */
import { writeFileSync, readFileSync } from "node:fs";
import { BIG_CHANCE_XG, IN_BOX_X, newAcc, addPlayerRow, addShot, resolveTeam,
         finalize, pairPlayers, FPL_POS } from "../src/bsd.js";

const KEY = process.env.BSD_KEY;
if (!KEY) {
  console.error("BSD_KEY vantar. Keyrsla: BSD_KEY=... node scripts/fetch-bsd.mjs");
  process.exit(1);
}
const API = "https://sports.bzzoiro.com/api/v2";
const LEAGUE = 1;                       // Premier League
const SEASON = process.argv[2] || "337"; // 337 = 2025/26 (lokid)

/* MAELDIR FASTAR eru i `src/bsd.js` — ein heimild, sja hausinn thar. */

/* HANDSTADFEST lidatafla: BSD team_id -> FPL short. */
const BSD_TEAM = {
  18: "ARS", 3: "AVL", 2: "BOU", 16: "BRE", 5: "BHA", 13: "CHE", 203: "COV",
  14: "CRY", 20: "EVE", 6: "FUL", 204: "HUL", 200: "IPS", 19: "LEE", 1: "LIV",
  12: "MCI", 17: "MUN", 4: "NEW", 15: "NFO", 9: "TOT", 7: "SUN",
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(path, tries = 3) {
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
}
/* keyrir `fn` yfir `items` med takmarkadri samhlida-vinnslu */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const k = i++;
      try { out[k] = await fn(items[k], k); } catch { out[k] = null; }
    }
  }));
  return out;
}

/* ---- 1) leikir timabilsins ---- */
const events = [];
for (const off of [0, 200]) {
  const d = await get(`/events/?league_id=${LEAGUE}&season_id=${SEASON}&limit=200&offset=${off}`);
  events.push(...(d.results || []));
}
const finished = events.filter(e => e.status === "finished");
console.log(`BSD timabil ${SEASON}: ${events.length} leikir, ${finished.length} lokid`);
if (!finished.length) { console.error("engir loknir leikir — er timabilid byrjad?"); process.exit(1); }

/* ---- 2) leikmannatolur + skotakort per leik ---- */
/* Uppsofnunin sjalf er i `src/bsd.js` — HREIN og profud. Hun er notud
   baedi hér og i `fetchBsdLive()` i pipeline-inu; tvaer utfaerslur myndu
   thyda ad lokna timabilid og thad lifandi gaetu reiknad SITT HVAD an
   thess ad nokkurt prof felli (sbr. `market.js`, CLAUDE.md kafli 1).   */
const agg = new Map();
const P = id => { let o = agg.get(id); if (!o) { o = newAcc(); agg.set(id, o); } return o; };

/* Skammstafanir svo skotaskrain se lítil — legend fylgir med i skranni
   sjalfri, svo hun se lesanleg an thess ad thekkja thennan kod.        */
const SHOT_TYPE = ["goal", "save", "miss", "block", "post"];
const SHOT_BODY = ["right-foot", "left-foot", "head", "other"];
const SHOT_SIT  = ["assisted", "regular", "corner", "fast-break", "set-piece",
                   "throw-in-set-piece", "free-kick", "penalty"];
const shotsBy = {};   // bsd player_id -> [[x, y, xg, type, body, sit], ...]

let done = 0, noShot = 0;
const missed = [];
/* SOTT SAMHLIDA, LAGT SAMAN I ROD.
   Fleytitolu-samlagning er EKKI vixlin, svo samhlida uppsofnun gaf
   Rodri einkunn 7,40 i einni keyrslu og 7,41 i annarri — somu gogn,
   onnur rod. I/O er thvi adskilid fra uppsofnuninni: kollin ganga
   samhlida, en summurnar eru lagdar saman i FASTRI event-id rod.      */
const fetched = new Map();
const grab = async (e) => {
  const [ps, st] = await Promise.all([
    get(`/events/${e.id}/player-stats/`).catch(() => null),
    get(`/events/${e.id}/stats/`).catch(() => null),
  ]);
  /* ThOGULT GAGNATAP ER VERRA EN ENGIN SKRA.
     `pool` gleypir villur, svo eitt mistekid kall let HEILAN LEIK hverfa
     an nokkurs merkis. Maelt: tvaer eins keyrslur gafu Harry Maguire 25
     og 26 leiki. Skra sem er thogult ohell litur ut eins og maeling —
     nakvaemlega thad sem kafli 3 fordast. Mistekin koll eru thvi TALIN
     og keyrslan DEYR fremur en ad skrifa hluta-timabil.                */
  if (!ps || !st) { missed.push(e.id); return; }
  fetched.set(e.id, { ps, st });
  if (++done % 50 === 0) console.log(`  leikir ${done}/${finished.length}`);
};
const ingest = (e) => {
  const got = fetched.get(e.id);
  if (!got) return;
  const { ps, st } = got;
  for (const r of (ps?.player_stats || [])) addPlayerRow(P(r.player_id), r);
  const sm = st?.shotmap || [];
  if (!sm.length) noShot++;
  for (const sh of sm) {
    if (sh.player_id == null) continue;
    addShot(P(sh.player_id), sh);
    /* HRA SKOTIN GEYMD LIKA — fyrir skotakortid a leikmannaspjaldinu.
       Their fara i SER SKRA (bsd_shots.json) sem er LETIHLADIN: 9.544 skot
       eru ~250 KB og eiga ekkert erindi i fyrstu hledslu appsins, sbr.
       player_gw_*.json (6j).                                            */
    const x = sh.pos?.x, y = sh.pos?.y;
    if (typeof x !== "number" || typeof y !== "number") continue;
    (shotsBy[sh.player_id] ||= []).push([
      +x.toFixed(1), +y.toFixed(1),
      typeof sh.xg === "number" ? +sh.xg.toFixed(3) : null,
      SHOT_TYPE.indexOf(sh.type), SHOT_BODY.indexOf(sh.body), SHOT_SIT.indexOf(sh.sit),
    ]);
  }
};
await pool(finished, 6, grab);
/* Onnur atrenna a tha sem duttu, rolegar (raðbundid). Standi eitthvad eftir
   er ThAD VILLA — vid skrifum ekki hluta-timabil.                        */
if (missed.length) {
  console.log(`  ${missed.length} leikir duttu — onnur atrenna`);
  const retry = finished.filter(e => missed.includes(e.id));
  missed.length = 0;
  for (const e of retry) await grab(e);
}
if (missed.length) {
  console.error(`\nVILLA: ${missed.length} leikir naðust ekki (${missed.slice(0, 8).join(", ")}...).`);
  console.error("Skrain er EKKI skrifud — hluta-timabil litur ut eins og maeling.");
  process.exit(1);
}
/* FOST ROD: event-id stigandi, ohad thvi i hvada rod svorin bárust. */
for (const e of [...finished].sort((a, b) => a.id - b.id)) ingest(e);

/* Flest-leikid lid raedur; jafntefli brotnar a laegsta team_id (i bsd.js). */
for (const o of agg.values()) resolveTeam(o);
console.log(`leikmenn med tolur: ${agg.size} · leikir an skotakorts: ${noShot}`);

/* ---- 3) nofn ---- */
const ids = [...agg.keys()];
const meta = new Map();
const metas = await pool(ids, 8, id => get(`/players/${id}/`).catch(() => null));
metas.forEach((m, i) => { if (m) meta.set(ids[i], m); });
/* Onnur atrenna a thau sem duttu — an nafns fæst engin FPL-pörun, svo
   2% tap i fyrstu ferd er 2% af leikmonnunum horfnir ur skránni.     */
const missing = ids.filter(id => !meta.has(id));
if (missing.length) {
  const again = await pool(missing, 3, id => get(`/players/${id}/`).catch(() => null));
  again.forEach((m, i) => { if (m) meta.set(missing[i], m); });
}
console.log(`nofn leyst: ${meta.size}/${ids.length}`);

/* ---- 4) vorpun vid FPL ---- */
const rawTeams = JSON.parse(readFileSync(new URL("../data/teams.json", import.meta.url), "utf8"));
const fplTeams = Array.isArray(rawTeams) ? rawTeams : (rawTeams.teams || []);
const teamByShort = Object.fromEntries(fplTeams.map(t => [t.short, t]));
const rawPl = JSON.parse(readFileSync(new URL("../data/players.json", import.meta.url), "utf8"));
const fplPlayers = Array.isArray(rawPl) ? rawPl : (rawPl.players || []);
const fplByTeam = new Map();
for (const p of fplPlayers) {
  if (!fplByTeam.has(p.team)) fplByTeam.set(p.team, []);
  fplByTeam.get(p.team).push(p);
}
/* MINUTUR SEM ONNUR, OHAD VISBENDING.
   Nafnid eitt SKAR EKKI ur um samnefninga i sama lidi: Jacob Murphy og
   Alex Murphy (badir NEW) VIXLUDUST, og Gabriel Martinelli lenti a
   Gabriel. Baedi pörin fa sama nafnaskor, svo rodin réd — thad er
   tilviljun, ekki pörun. `season_baseline.json` geymir FPL-minutur
   SAMA timabils, svo thaer eru gild sonnunargogn hér (og AÐEINS hér:
   players.json-minutur eru yfirstandandi timabils og eru 0 i forleik). */
let baseMin = null;
try {
  const b = JSON.parse(readFileSync(new URL("../data/season_baseline.json", import.meta.url), "utf8"));
  if (SEASON === "337" && b.label === "2025/26")
    baseMin = new Map((b.players || []).map(p => [p.id, p.minutes]));
} catch { /* skran ma vanta — tha raedur nafnid eitt */ }

/* Pörunin sjalf er i `src/bsd.js` (hrein og profud) — sja hausinn thar. */
const cands = [];
for (const [bid, o] of agg) {
  const short = BSD_TEAM[o.team_id];
  const ft = short ? teamByShort[short] : null;
  const m = meta.get(bid);
  if (!ft || !m) continue;
  cands.push({ bsd_id: bid, name: m.name, short_name: m.short_name, pos: m.position,
               minutes: o.minutes_played, pool: fplByTeam.get(ft.id) || [] });
}
const pairBsd = pairPlayers(cands, baseMin ? { minutesOf: id => baseMin.get(id) } : {});

/* ---- 5) skrifa ---- */
const players = [];
for (const [bid, o] of agg) {
  const m = meta.get(bid), fp = pairBsd.get(bid) || null;
  players.push(finalize(o, {
    bsd_id: bid, name: m?.name, pos: m?.position, team: BSD_TEAM[o.team_id] || null,
    fpl_id: fp?.id, code: fp?.code,
  }));
}
players.sort((a, b) => (b.minutes || 0) - (a.minutes || 0) || (a.bsd_id - b.bsd_id));
/* AÐEINS ThEIR SEM APPID GETUR BIRT fara i skrana. Leikmadur an `fpl_id`
   er osynilegur i toflunni (hun flettir upp a `code`), svo hann vaeri
   hreint burdargjald — 286 af 677 eru menn sem foru ur deildinni eftir
   2025/26. Nofn theirra eru geymd svo talan se rekjanleg og hvarfid se
   SYNILEGT, ekki thogult.                                             */
const matchedPlayers = players.filter(p => p.fpl_id != null);
const matched = matchedPlayers.length;
const droppedNames = players.filter(p => p.fpl_id == null)
  .map(p => `${p.name} (${p.team || "?"})`);

const payload = {
  updated: new Date().toISOString(),
  source: "bsd_v2",
  league_id: LEAGUE, season_id: +SEASON,
  season: SEASON === "337" ? "2025/26" : String(SEASON),
  matches: finished.length,
  measured: { big_chance_xg: BIG_CHANCE_XG, in_box_x: IN_BOX_X },
  note:
    "Per-skot xG ur BSD-skotakorti (100% thekja 2025/26). big_chances eru LEIDDAR "
    + `ut ur skotum med xg >= ${BIG_CHANCE_XG} — fittad gegn raunverulega lids-svidinu `
    + "big_chances a 748 lid-leikjum (MAE 0,746, r 0,774). PER-LEIKMANNS svidin "
    + "big_chance_created/missed eru TIL i API-inu en ALLTAF NULL og eru thvi EKKI hér. "
    + `Teigur = pos.x <= ${IN_BOX_X}; BSD-x er hlutfall af FULLUM velli (105 m), `
    + "ANNAR kvardi en ESPN (halfur vollur) — maelt, ekki fluttur. "
    + "Assist eru OPTA-skilgreining og eru ~29% faerri en FPL-assist (FPL gefur t.d. "
    + "assist fyrir unnid viti) — thaer eru til samanburdar, ekki til ad skipta ut FPL-tolunni.",
  players_total: players.length,
  players_matched_to_fpl: matched,
  unmatched: droppedNames.length,
  unmatched_names: droppedNames,
  players: matchedPlayers,
};
const dest = new URL("../data/bsd_players.json", import.meta.url).pathname;
writeFileSync(dest, JSON.stringify(payload));
console.log(`\nskrifad ${dest}`);
console.log(`leikmenn ${players.length} · parad vid FPL ${matched} · oparad ${players.length - matched}`);

/* ---- 6) SKOTAKORTID — SER SKRA, LETIHLADIN ----
   Lyklad a FPL `code` eins og onnur soguleg gogn (fast yfir timabil,
   olikt `id`). Adeins pöradir leikmenn: skot a manni sem appid getur
   ekki synt er hreint burdargjald.

   KVORDUNIN FYLGIR MED I SKRANNI. Hun er MAELD ur thessum somu gognum,
   ekki tekin ur reglugerd, svo teiknada vollinn geti ekki rekid fra
   punktunum — thad var einmitt villan sem ESPN-kortid hafdi (6b: fyrsta
   utgafan margfaldadi med 105 og setti hvert skot i tvofalda fjarlaegd).
     pen_spot 11,5 = MEDALTAL 92 vitaspyrna (y = 50,00 hja OLLUM)
     box_x    17   = fittad gegn lids-svidinu `shots_inside_box`, MAE 0,133
     box_y    20,4-79,6 = 99,5% teigsskota falla thar innan             */
const shotPayload = {
  updated: payload.updated, season: payload.season, source: "bsd_shotmap",
  legend: { type: SHOT_TYPE, body: SHOT_BODY, sit: SHOT_SIT,
            fields: ["x", "y", "xg", "type", "body", "sit"] },
  calib: { goal_line: 0, six_yard_x: 5.5, pen_spot_x: 11.5, box_x: IN_BOX_X,
           box_y: [20.4, 79.6], six_yard_y: [36.5, 63.5], big_chance_xg: BIG_CHANCE_XG },
  note: "Hnit ur BSD-skotakorti. x = fjarlaegd fra markinu sem sott er ad, "
      + "hlutfall af FULLUM velli (105 m) — ANNAR kvardi en ESPN (halfur "
      + "vollur). y = breidd 0-100, midja 50. Kvordunin i `calib` er MAELD "
      + "ur thessum gognum: vitaspyrnur liggja a x 11,5 og y 50,00 nakvaemlega. "
      + "2025/26 eingongu — engin eldri timabil hafa skotakort.",
  players: {},
};
let shotRows = 0;
for (const [bid, o] of agg) {
  const fp = pairBsd.get(bid);
  const arr = shotsBy[bid];
  if (!fp || !arr?.length) continue;
  shotPayload.players[String(fp.code)] = arr;
  shotRows += arr.length;
}
const dest2 = new URL("../data/bsd_shots.json", import.meta.url).pathname;
writeFileSync(dest2, JSON.stringify(shotPayload));
console.log(`skrifad ${dest2} — ${Object.keys(shotPayload.players).length} leikmenn, ${shotRows} skot`);
