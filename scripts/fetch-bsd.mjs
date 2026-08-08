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

const KEY = process.env.BSD_KEY;
if (!KEY) {
  console.error("BSD_KEY vantar. Keyrsla: BSD_KEY=... node scripts/fetch-bsd.mjs");
  process.exit(1);
}
const API = "https://sports.bzzoiro.com/api/v2";
const LEAGUE = 1;                       // Premier League
const SEASON = process.argv[2] || "337"; // 337 = 2025/26 (lokid)

/* MAELDIR FASTAR — sja hausinn. Ekki breyta an nyrrar maelingar. */
export const BIG_CHANCE_XG = 0.18;
export const IN_BOX_X = 17;

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
/* SUMMANLEG svid. Daud svid (sja haus) eru VILJANDI EKKI hér.        */
const SUM = [
  "minutes_played", "goals", "goal_assist", "total_shots", "shots_on_target",
  "key_pass", "total_cross", "accurate_cross", "touches",
  "total_contest", "won_contest", "duel_won", "duel_lost", "aerial_won", "aerial_lost",
  "total_pass", "accurate_pass", "total_long_balls", "accurate_long_balls",
  "dispossessed", "possession_lost", "was_fouled", "fouls",
  "blocked_scoring_attempt", "total_tackle", "won_tackle", "interception",
  "total_clearance", "ball_recovery", "saves", "punches", "goals_conceded",
  "yellow_card", "red_card",
];
const agg = new Map();   // bsd player_id -> tolur
const P = id => {
  let o = agg.get(id);
  if (!o) {
    o = { apps: 0, team_id: null, rating_sum: 0, rating_n: 0,
          shots: 0, xg: 0, big_chances: 0, shots_in_box: 0, shots_out_box: 0 };
    for (const k of SUM) o[k] = 0;
    agg.set(id, o);
  }
  return o;
};

let done = 0, noShot = 0;
await pool(finished, 6, async (e) => {
  const [ps, st] = await Promise.all([
    get(`/events/${e.id}/player-stats/`).catch(() => null),
    get(`/events/${e.id}/stats/`).catch(() => null),
  ]);
  for (const r of (ps?.player_stats || [])) {
    const o = P(r.player_id);
    o.apps++; o.team_id = r.team_id ?? o.team_id;
    for (const k of SUM) if (typeof r[k] === "number") o[k] += r[k];
    if (typeof r.rating === "number") { o.rating_sum += r.rating; o.rating_n++; }
  }
  const sm = st?.shotmap || [];
  if (!sm.length) noShot++;
  for (const s of sm) {
    if (s.player_id == null) continue;
    const o = P(s.player_id);
    o.shots++;
    if (typeof s.xg === "number") {
      o.xg += s.xg;
      if (s.xg >= BIG_CHANCE_XG) o.big_chances++;
    }
    const x = s.pos?.x;
    if (typeof x === "number") (x <= IN_BOX_X ? o.shots_in_box++ : o.shots_out_box++);
  }
  if (++done % 50 === 0) console.log(`  leikir ${done}/${finished.length}`);
});
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
const FPL_POS = { 1: "G", 2: "D", 3: "M", 4: "F" };

const TRANS = { "ß": "ss", "ı": "i", "ø": "o", "đ": "d", "ð": "d", "þ": "th", "æ": "ae", "œ": "oe", "ł": "l" };
const norm = s => {
  let t = String(s || "").toLowerCase();
  for (const [a, b] of Object.entries(TRANS)) t = t.split(a).join(b);
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean).join(" ");
};
const toks = s => norm(s).split(" ").filter(w => w.length > 1);
const score = (a, b) => {
  const ta = toks(a), tb = toks(b);
  if (!ta.length || !tb.length) return 0;
  let hit = 0;
  for (let i = 0; i < ta.length; i++) {
    if (ta.indexOf(ta[i]) !== i) continue;      // de-dupe an Set (sbr. 6i)
    if (tb.includes(ta[i])) hit++;
  }
  return hit / Math.min(new Set(ta).size, new Set(tb).size);
};

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
   SAMA timabils (2025/26), svo thaer eru gild sonnunargogn hér (og
   AÐEINS hér: players.json-minutur eru yfirstandandi timabils og eru
   0 i forleik). Minutu-samraemi er lagt VID nafnaskorid, svo thad
   sker adeins ur thegar nofnin eru jofn.                              */
let baseMin = new Map();
try {
  const b = JSON.parse(readFileSync(new URL("../data/season_baseline.json", import.meta.url), "utf8"));
  if (b.label === (SEASON === "337" ? "2025/26" : null))
    baseMin = new Map((b.players || []).map(p => [p.id, p.minutes]));
} catch { /* skran ma vanta — tha raedur nafnid eitt */ }
const minAgree = (bsdMin, fplId) => {
  const fm = baseMin.get(fplId);
  if (fm == null || (!bsdMin && !fm)) return 0;
  return 1 - Math.abs(bsdMin - fm) / Math.max(bsdMin, fm, 1);
};

/* EITT-A-EITT: oll pör skorud, haesta fyrst, hvor adili notadur einu sinni. */
const cands = [];
for (const [bid, o] of agg) {
  const short = BSD_TEAM[o.team_id];
  const ft = short ? teamByShort[short] : null;
  const m = meta.get(bid);
  if (!ft || !m) continue;
  for (const fp of (fplByTeam.get(ft.id) || [])) {
    const full = `${fp.first_name || ""} ${fp.second_name || ""}`;
    const s = Math.max(score(m.name, full), score(m.name, fp.web_name), score(m.short_name, fp.web_name));
    if (s >= 0.6 && (FPL_POS[fp.element_type] === m.position || s >= 0.99))
      cands.push([s + 0.5 * minAgree(o.minutes_played, fp.id), bid, fp]);
  }
}
cands.sort((a, b) => b[0] - a[0]);
const pairBsd = new Map(), usedFpl = new Set();
for (const [, bid, fp] of cands) {
  if (pairBsd.has(bid) || usedFpl.has(fp.id)) continue;
  pairBsd.set(bid, fp); usedFpl.add(fp.id);
}

/* ---- 5) skrifa ---- */
const players = [];
for (const [bid, o] of agg) {
  const m = meta.get(bid), fp = pairBsd.get(bid) || null;
  const short = BSD_TEAM[o.team_id] || null;
  /* TOM GILDI ERU null, EKKI 0 — "spiladi ekki" og "0 tacklingar" er
     ekki sama hlutid (CLAUDE.md 6i: NULL ER EKKI NULL).             */
  const per = v => (o.apps ? v : null);
  players.push({
    bsd_id: bid,
    name: m?.name ?? null,
    pos: m?.position ?? null,
    team: short,
    fpl_id: fp?.id ?? null,
    code: fp?.code ?? null,
    apps: o.apps,
    minutes: per(o.minutes_played),
    rating: o.rating_n ? +(o.rating_sum / o.rating_n).toFixed(2) : null,
    goals: per(o.goals), assists: per(o.goal_assist),
    shots: o.shots || null,
    xg: o.shots ? +o.xg.toFixed(3) : null,
    xg_per_shot: o.shots ? +(o.xg / o.shots).toFixed(4) : null,
    big_chances: o.shots ? o.big_chances : null,
    shots_in_box: o.shots ? o.shots_in_box : null,
    shots_out_box: o.shots ? o.shots_out_box : null,
    key_pass: per(o.key_pass),
    crosses: per(o.total_cross), crosses_acc: per(o.accurate_cross),
    touches: per(o.touches),
    dribbles: per(o.total_contest), dribbles_won: per(o.won_contest),
    duels_won: per(o.duel_won), duels_lost: per(o.duel_lost),
    aerial_won: per(o.aerial_won), aerial_lost: per(o.aerial_lost),
    passes: per(o.total_pass), passes_acc: per(o.accurate_pass),
    long_balls: per(o.total_long_balls), long_balls_acc: per(o.accurate_long_balls),
    dispossessed: per(o.dispossessed), possession_lost: per(o.possession_lost),
    was_fouled: per(o.was_fouled), fouls: per(o.fouls),
    blocks: per(o.blocked_scoring_attempt),
    tackles: per(o.total_tackle), tackles_won: per(o.won_tackle),
    interceptions: per(o.interception), clearances: per(o.total_clearance),
    recoveries: per(o.ball_recovery),
    saves: per(o.saves), punches: per(o.punches), goals_conceded: per(o.goals_conceded),
    yellow: per(o.yellow_card), red: per(o.red_card),
  });
}
players.sort((a, b) => (b.minutes || 0) - (a.minutes || 0));
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
