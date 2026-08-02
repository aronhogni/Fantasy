/* ============================================================
   FPL GAGNASÖFNUN — scripts/fetch.mjs
   Node 20, global fetch, ENGAR dependencies.
   Keyrt af .github/workflows/fetch.yml (cron 1x/dag).
   Hver heimild í sínu try/catch; AÐEINS FPL-brestur fellir keyrsluna.
   Skrifar data/*.json inn í repo-ið; framendi les þær sömu-origin
   (eða frá raw.githubusercontent).

   ÓSTAÐFEST (þarf logg úr fyrstu keyrslu — sjá console + status.json):
   - merking defensive_contribution (aðgerðir vs þröskulds-leikir)
   - kolónuheiti á api.clubelo.com/Fixtures
   - breytuheiti á Understat-síðum
   - nafnastafsetning nýliða hjá ClubElo
   ============================================================ */

import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
/* Markaðs-umbreytingin (odds -> vænt mörk -> FFDR-þyngd) er FLUTT í
   src/market.js svo bakprófið keyri nakvaemlega sama kóða og pipeline.
   Hún var áður staðbundin hér og þar með óprófanleg — samt með vog 0,50
   í FFDR fyrir GK/DEF. Sjá tests/ffdr-walkforward.mjs.                  */
import { poissonCleanSheet, marketDiff, marketGoals, devig, devig2 } from "../src/market.js";

const UA = "Mozilla/5.0 (compatible; FPL-data-collector/1.0; +github-actions)";
const DATA = "data";
const today = new Date().toISOString().slice(0, 10);

const FLAGS = {
  apisports: !!process.env.API_SPORTS_KEY,
  /* UNDERSTAT ER SLOKKT SJALFGEFID (28.7.2026). Ekki bilun sem lagast:
     Understat FJARLAEGDI gognin ur HTML-inu. league-sidur skila byte-eins
     18.645 b skel i 5/5 tilraunum og fyrir OLL timabil; leikjasidur hafa
     adeins `var match_info`. Skot-kortid kemur nu ur ESPN (fetchEspnShots).
     Kveikt aftur med ENABLE_UNDERSTAT=true ef their skila gognum a ny.     */
  understat:       (process.env.ENABLE_UNDERSTAT ?? "false") === "true",
  understat_shots: (process.env.ENABLE_UNDERSTAT_SHOTS ?? "false") === "true",
  elo:             (process.env.ENABLE_ELO ?? "true")        === "true",
  fdcouk:          (process.env.ENABLE_FDCOUK ?? "true")     === "true",
  weather:         (process.env.ENABLE_WEATHER ?? "true")    === "true",
  espn:            (process.env.ENABLE_ESPN ?? "false")      === "true",
  euro:            (process.env.ENABLE_EURO ?? "true")       === "true",
  travel:          (process.env.ENABLE_TRAVEL ?? "true")     === "true",
  derived:         (process.env.ENABLE_DERIVED ?? "true")    === "true",
  odds_key:        process.env.ODDS_API_KEY || "",
};

const status = { updated: new Date().toISOString(), sources: {} };
function record(name, ok, count, note) {
  status.sources[name] = { ok, count: count ?? null, note: note ?? null };
  console.log(`[${ok ? "OK " : "ERR"}] ${name} — ${count ?? "?"} ${note ? "· " + note : ""}`);
}

async function writeJSON(path, obj) {
  const full = `${DATA}/${path}`;
  await mkdir(full.split("/").slice(0, -1).join("/"), { recursive: true });
  await writeFile(full, JSON.stringify(obj));
}
async function getText(url, opts = {}) {
  const r = await fetch(url, { headers: { "User-Agent": UA, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return { text: await r.text(), res: r };
}
async function getJSON(url, opts = {}) {
  const { text } = await getText(url, opts);
  return JSON.parse(text);
}
// einföld CSV -> fylki af hlutum (skilar líka hráu haus-línunni til að logga)
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const rows = lines.slice(1).map(l => {
    const cells = l.split(",");
    const o = {}; header.forEach((h, i) => o[h] = cells[i]); return o;
  });
  return { header, rows };
}

/* ---- Leikvangahnit, lyklað á FPL short_name (aðeins notuð fyrir lið í bootstrap) ---- */
const COORDS = {
  ARS:[51.5549,-0.1084], AVL:[52.5092,-1.8848], BOU:[50.7348,-1.8391], BRE:[51.4907,-0.2889],
  BHA:[50.8616,-0.0837], BUR:[53.7890,-2.2300], CHE:[51.4817,-0.1910], COV:[52.4480,-1.4956],
  CRY:[51.3983,-0.0855], EVE:[53.4180,-3.0080], FUL:[51.4749,-0.2217], HUL:[53.7460,-0.3676],
  IPS:[52.0553,1.1450],  LEE:[53.7778,-1.5722], LIV:[53.4308,-2.9608], MCI:[53.4831,-2.2004],
  MUN:[53.4631,-2.2913], NEW:[54.9756,-1.6217], NFO:[52.9400,-1.1327], SUN:[54.9145,-1.3882],
  TOT:[51.6043,-0.0665], WHU:[51.5387,-0.0166], WOL:[52.5903,-2.1303],
};
/* ---- Nafnavörpun eftir kerfi, lyklað á FPL short_name ---- */
const NAMES = {
  ARS:{clubelo:"Arsenal",fdcouk:"Arsenal",understat:"Arsenal"},
  AVL:{clubelo:"AstonVilla",fdcouk:"Aston Villa",understat:"Aston Villa"},
  BOU:{clubelo:"Bournemouth",fdcouk:"Bournemouth",understat:"Bournemouth"},
  BRE:{clubelo:"Brentford",fdcouk:"Brentford",understat:"Brentford"},
  BHA:{clubelo:"Brighton",fdcouk:"Brighton",understat:"Brighton"},
  BUR:{clubelo:"Burnley",fdcouk:"Burnley",understat:"Burnley"},
  CHE:{clubelo:"Chelsea",fdcouk:"Chelsea",understat:"Chelsea"},
  COV:{clubelo:"Coventry",fdcouk:"Coventry",understat:"Coventry"},
  CRY:{clubelo:"CrystalPalace",fdcouk:"Crystal Palace",understat:"Crystal Palace"},
  EVE:{clubelo:"Everton",fdcouk:"Everton",understat:"Everton"},
  FUL:{clubelo:"Fulham",fdcouk:"Fulham",understat:"Fulham"},
  HUL:{clubelo:"Hull",fdcouk:"Hull",understat:"Hull"},
  IPS:{clubelo:"Ipswich",fdcouk:"Ipswich",understat:"Ipswich"},
  LEE:{clubelo:"Leeds",fdcouk:"Leeds",understat:"Leeds"},
  LIV:{clubelo:"Liverpool",fdcouk:"Liverpool",understat:"Liverpool"},
  MCI:{clubelo:"ManCity",fdcouk:"Man City",understat:"Manchester City"},
  MUN:{clubelo:"ManUnited",fdcouk:"Man United",understat:"Manchester United"},
  NEW:{clubelo:"Newcastle",fdcouk:"Newcastle",understat:"Newcastle United"},
  NFO:{clubelo:"Forest",fdcouk:"Nott'm Forest",understat:"Nottingham Forest"},
  SUN:{clubelo:"Sunderland",fdcouk:"Sunderland",understat:"Sunderland"},
  TOT:{clubelo:"Tottenham",fdcouk:"Tottenham",understat:"Tottenham"},
  WHU:{clubelo:"WestHam",fdcouk:"West Ham",understat:"West Ham"},
  WOL:{clubelo:"Wolves",fdcouk:"Wolves",understat:"Wolverhampton Wanderers"},
};

/* ========== 1. FPL — kjarninn, fellir keyrsluna ef hann brestur ========== */
const FPL = "https://fantasy.premierleague.com/api";
let bootstrap, teamsById = {}, shortById = {};

async function fetchFPL() {
  bootstrap = await getJSON(`${FPL}/bootstrap-static/`);
  const teams = bootstrap.teams || [];
  const events = bootstrap.events || [];
  const els = bootstrap.elements || [];

  // teams.json + teams_map.json
  teams.forEach(t => { teamsById[t.id] = t; shortById[t.id] = t.short_name; });
  const teamsOut = teams.map(t => ({ id:t.id, name:t.name, short:t.short_name, code:t.code,
    strength:t.strength, strength_overall_home:t.strength_overall_home,
    strength_overall_away:t.strength_overall_away,
    strength_attack_home:t.strength_attack_home, strength_attack_away:t.strength_attack_away,
    strength_defence_home:t.strength_defence_home, strength_defence_away:t.strength_defence_away }));
  await writeJSON("teams.json", { updated: status.updated, teams: teamsOut });
  // chips (nöfn/ikon fyrir framenda) ef til í bootstrap
  if (bootstrap.chips) await writeJSON("chips.json", bootstrap.chips);

  const map = {};
  for (const t of teams) {
    const sn = t.short_name;
    const coord = COORDS[sn];
    const nm = NAMES[sn];
    if (!coord) console.warn(`VIÐVÖRUN: engin hnit fyrir ${sn} (${t.name})`);
    if (!nm)    console.warn(`VIÐVÖRUN: engin nafnavörpun fyrir ${sn} (${t.name})`);
    map[t.id] = {
      fpl: t.name, short: sn,
      clubelo: nm?.clubelo ?? null, fdcouk: nm?.fdcouk ?? null, understat: nm?.understat ?? null,
      lat: coord?.[0] ?? null, lon: coord?.[1] ?? null, badge: null,
    };
  }
  await writeJSON("teams_map.json", map);

  // players.json — valið svið (ekki hrátt 2MB)
  const pick = els.map(e => ({
    id:e.id, web_name:e.web_name, first_name:e.first_name, second_name:e.second_name,
    team:e.team, element_type:e.element_type, code:e.code,
    now_cost:e.now_cost, cost_change_start:e.cost_change_start, cost_change_event:e.cost_change_event,
    selected_by_percent:e.selected_by_percent, transfers_in_event:e.transfers_in_event,
    transfers_out_event:e.transfers_out_event, total_points:e.total_points,
    points_per_game:e.points_per_game, form:e.form, ep_next:e.ep_next, minutes:e.minutes,
    goals_scored:e.goals_scored, assists:e.assists, clean_sheets:e.clean_sheets,
    goals_conceded:e.goals_conceded, bonus:e.bonus, bps:e.bps,
    expected_goals:e.expected_goals, expected_assists:e.expected_assists,
    expected_goals_conceded:e.expected_goals_conceded,
    expected_goal_involvements:e.expected_goal_involvements, ict_index:e.ict_index,
    defensive_contribution:e.defensive_contribution,
    clearances_blocks_interceptions:e.clearances_blocks_interceptions,
    tackles:e.tackles, recoveries:e.recoveries,
    status:e.status, chance_of_playing_next_round:e.chance_of_playing_next_round,
    chance_of_playing_this_round:e.chance_of_playing_this_round, news:e.news,
    news_added:e.news_added,
    // ---- spjöld og bönn (bann-hætta) ----
    yellow_cards:e.yellow_cards, red_cards:e.red_cards,
    // ---- byrjunarlið / skiptingar-hætta ----
    starts:e.starts, starts_per_90:e.starts_per_90,
    // ---- fastaleikir: vítatakarar og hornaspyrnur ----
    penalties_order:e.penalties_order,
    corners_and_indirect_freekicks_order:e.corners_and_indirect_freekicks_order,
    direct_freekicks_order:e.direct_freekicks_order,
    penalties_saved:e.penalties_saved, penalties_missed:e.penalties_missed,
    /* ---- OPINBERAR FPL-TOLUR SEM VID REIKNADUM SJALF ADUR ----
       FPL gefur thessar tolur sjalft. Ad reikna thaer sjalf var tvitekning
       sem vid thurftum ad verja; nu birtum vid theirra tolu.
       (Prof: value_season == total_points/verd a ollum raungognum.)      */
    value_season:e.value_season, value_form:e.value_form,
    saves_per_90:e.saves_per_90,
    defensive_contribution_per_90:e.defensive_contribution_per_90,
    clean_sheets_per_90:e.clean_sheets_per_90,
    goals_conceded_per_90:e.goals_conceded_per_90,
    expected_goals_conceded_per_90:e.expected_goals_conceded_per_90,
    /* cost_change_event er THEGAR ofar i listanum (lina ~154).            */
    /* ---- FPL-SAETI INNAN STODU (`_rank_type`) ----
       `_rank` er medal ALLRA leikmanna; `_rank_type` er medal leikmanna I
       SOMU STODU og er thad sem skiptir mali i fantasy.
       Maelt: Raya stig/leik 4,4 -> rank_type 3 (3. besti GK) en rank 32.  */
    points_per_game_rank_type:e.points_per_game_rank_type,
    form_rank_type:e.form_rank_type,
    ict_index_rank_type:e.ict_index_rank_type,
    influence_rank_type:e.influence_rank_type,
    creativity_rank_type:e.creativity_rank_type,
    threat_rank_type:e.threat_rank_type,
    selected_rank_type:e.selected_rank_type,
    now_cost_rank_type:e.now_cost_rank_type,
    // ---- per-90 (betri samanburður en árstíðarsummur) ----
    expected_goals_per_90:e.expected_goals_per_90,
    expected_assists_per_90:e.expected_assists_per_90,
    expected_goal_involvements_per_90:e.expected_goal_involvements_per_90,
    /* xGC/90 og CS/90 eru THEGAR i "OPINBERAR FPL-TOLUR"-blokkinni ad ofan —
       ekki endurtaka their her (esbuild varar vid tviteknum lyklum).       */
    // ---- ICT-þættir og raðir ----
    influence:e.influence, creativity:e.creativity, threat:e.threat,
    form_rank:e.form_rank, points_per_game_rank:e.points_per_game_rank,
    selected_rank:e.selected_rank, now_cost_rank:e.now_cost_rank,
    dreamteam_count:e.dreamteam_count,
    saves:e.saves, own_goals:e.own_goals,
  }));
  await writeJSON("players.json", { updated: status.updated, players: pick });

  // events.json (umferðir)
  await writeJSON("events.json", { updated: status.updated, events: events.map(ev => ({
    id:ev.id, name:ev.name, deadline_time:ev.deadline_time, finished:ev.finished,
    is_current:ev.is_current, is_next:ev.is_next, average_entry_score:ev.average_entry_score })) });

  record("fpl_bootstrap", true, els.length, `${teams.length} lið, ${events.length} umferðir`);

  // fixtures.json
  const fixtures = await getJSON(`${FPL}/fixtures/`);
  await writeJSON("fixtures.json", fixtures.map(f => ({
    id:f.id, event:f.event, kickoff_time:f.kickoff_time, finished:f.finished,
    started:f.started, minutes:f.minutes, finished_provisional:f.finished_provisional,
    team_h:f.team_h, team_a:f.team_a, team_h_score:f.team_h_score, team_a_score:f.team_a_score,
    team_h_difficulty:f.team_h_difficulty, team_a_difficulty:f.team_a_difficulty })));
  record("fpl_fixtures", true, fixtures.length);

  // dagleg verðmynd -> data/history/YYYY-MM-DD.json (byggir verðbreytinga-tímaröð)
  const snap = els.map(e => ({ id:e.id, now_cost:e.now_cost, cost_change_event:e.cost_change_event,
    selected_by_percent:e.selected_by_percent, transfers_in_event:e.transfers_in_event,
    transfers_out_event:e.transfers_out_event, total_points:e.total_points }));
  await writeJSON(`history/${today}.json`, snap);
  record("fpl_history_snapshot", true, snap.length, today);

  // ---- TÍMABILS-GRUNNUR fyrir "í fyrra"-dálkinn í yfirlitinu ----
  // FYRIR tímabil eru uppsöfnuðu tölurnar í bootstrap LOKATÖLUR fyrra
  // tímabils. Við skrifum þær daglega MEÐAN engin umferð er lokin; um
  // leið og GW1 klárast hættum við að skrifa -> skráin FRÝS sem
  // 2025/26-lokatölurnar og appið getur sýnt "í ár vs. í fyrra".
  if (!events.some(ev => ev.finished)) {
    const y = new Date(events[0]?.deadline_time || Date.now()).getFullYear();
    await writeJSON("season_baseline.json", {
      updated: status.updated,
      label: `${y - 1}/${String(y).slice(-2)}`,
      note: "Lokatölur fyrra tímabils. Skrifað daglega FRAM AÐ GW1, frýs svo.",
      players: els.map(e => ({
        id: e.id, total_points: e.total_points, minutes: e.minutes,
        points_per_game: e.points_per_game, starts: e.starts,
        goals_scored: e.goals_scored, assists: e.assists,
        expected_goals: e.expected_goals, expected_assists: e.expected_assists,
        clean_sheets: e.clean_sheets, yellow_cards: e.yellow_cards, red_cards: e.red_cards,
      })),
    });
    record("season_baseline", true, els.length, "fyrir tímabil — uppfært daglega");
  } else {
    record("season_baseline", true, 0, "frosið (tímabil hafið)");
  }

  // event/{gw}/live/ fyrir LOKNAR umferðir. Fyrsta keyrsla: allar. Eftir það: nýjustu.
  const finished = events.filter(ev => ev.finished).map(ev => ev.id);
  let liveCount = 0;
  for (const gw of finished) {
    const path = `live/gw${gw}.json`;
    if (existsSync(`${DATA}/${path}`)) continue; // þegar sótt (loknar umferðir breytast ekki)
    try {
      const live = await getJSON(`${FPL}/event/${gw}/live/`);
      // geymum explain ÓSKERT + tölfræði
      await writeJSON(path, live);
      liveCount++;
    } catch (e) { console.warn(`live gw${gw} brást: ${e.message}`); }
  }
  // núverandi umferð (gæti verið hálfnuð) — alltaf endursækja
  const cur = events.find(ev => ev.is_current);
  if (cur) { try { const live = await getJSON(`${FPL}/event/${cur.id}/live/`); await writeJSON(`live/gw${cur.id}.json`, live); liveCount++; } catch (e) { console.warn(e.message); } }
  record("fpl_live", true, liveCount, `${finished.length} loknar umferðir`);

  // set-piece notes (víta/horn)
  try {
    const sp = await getJSON(`${FPL}/team/set-piece-notes/`);
    await writeJSON("set_piece_notes.json", sp);
    record("fpl_set_piece", true, (sp.teams||sp||[]).length);
  } catch (e) { record("fpl_set_piece", false, 0, e.message); }

  return { events, els };
}

/* ========== 2. DEFCON — afleitt úr live, umferð fyrir umferð ========== */
async function computeDefcon(events, els) {
  // þröskuldar: DEF 10 CBIT, MID/FWD 12 CBIRT. Hámark 2 stig/leik.
  // element_type: 1 GK, 2 DEF, 3 MID, 4 FWD
  const finished = events.filter(ev => ev.finished).map(ev => ev.id);
  const agg = {}; // id -> { starts, hits, cbit, cbirt }
  const posOf = {}; els.forEach(e => posOf[e.id] = e.element_type);

  for (const gw of finished) {
    const path = `${DATA}/live/gw${gw}.json`;
    if (!existsSync(path)) continue;
    let live;
    try { live = JSON.parse(await readFile(path, "utf8")); } catch { continue; }
    for (const el of (live.elements || [])) {
      const id = el.id;
      const st = el.stats || {};
      const minutes = st.minutes || 0;
      if (minutes <= 0) continue;
      const pos = posOf[id];
      const a = agg[id] || (agg[id] = { starts:0, hits:0, cbit:0, cbirt:0 });
      a.starts++;
      // ÓSTAÐFEST: notum defensive_contribution stigin úr explain sem sanngildi ef til,
      // annars reiknum úr cbi+tackles(+recoveries). Loggum fyrsta þekkta manninn til að staðfesta.
      const cbi = st.clearances_blocks_interceptions ?? 0;
      const tk  = st.tackles ?? 0;
      const rec = st.recoveries ?? 0;
      const cbit = cbi + tk;
      const cbirt = cbi + tk + rec;
      a.cbit += cbit; a.cbirt += cbirt;
      const threshold = pos === 2 ? 10 : 12; // DEF vs MID/FWD (GK teljum sem DEF-lík)
      const metric = pos === 2 ? cbit : cbirt;
      // staðfesta má gegn 'defensive_contribution' stigum í explain
      if (metric >= threshold) a.hits++;
    }
  }
  const out = Object.entries(agg).map(([id, a]) => ({
    fpl_id: Number(id), position: posOf[id], starts: a.starts, threshold_hits: a.hits,
    hit_rate: a.starts ? +(a.hits / a.starts).toFixed(3) : 0,
    cbit_per_90: a.starts ? +(a.cbit / a.starts).toFixed(2) : 0,
    cbirt_per_90: a.starts ? +(a.cbirt / a.starts).toFixed(2) : 0,
  }));

  /* ---- AFTURVIRKJUD HITTNI (hit_rate_adj) — TERMINAL_HANDOFF_4 §2 ----
     Hra hittni ofmaelist a litlum synum: okkar GW20+ maelingar (n=10-15)
     foru upp i 75-80% medan ytra vidmid (FFS-timabilsspa, ~470 leikmenn)
     hefur ENGAN leikmann yfir ~57%. Fravikin voru staerst thar sem synid
     var litid OG hittnin ha; thar sem synid var stort vorum vid innan
     8 prosentustiga — klassisk ofmaeling a litlum synum.
     Logun: empirisk Bayes-afturvirkni ad sama formi og prevWeight,
       hittni_adj = (hits + K*p0) / (starts + K),  K = 10
     p0 = STODU-meðaltal ur somu gognum (heildar-hits/heildar-starts per
     stodu), med fostum vara-gildum medan laugin er litil (fyrstu umferdir).
     Dæmi ur handoffinu: 9/12 hratt = 75% -> (9+10*0,32)/22 = 56%.
     HRAA TALAN OG n HALDA SER — afturvirknin er VIDBOT, ekki yfirskrift. */
  const DC_K = 10;
  const DC_P0_FALLBACK = { 1: 0.02, 2: 0.27, 3: 0.17, 4: 0.10 };
  const pool = {};
  for (const p of out) {
    const q = pool[p.position] || (pool[p.position] = { hits: 0, starts: 0 });
    q.hits += p.threshold_hits; q.starts += p.starts;
  }
  for (const p of out) {
    const q = pool[p.position];
    const p0 = q && q.starts >= 50 ? q.hits / q.starts
                                   : (DC_P0_FALLBACK[p.position] ?? 0.17);
    p.p0 = +p0.toFixed(3);
    p.hit_rate_adj = +((p.threshold_hits + DC_K * p0) / (p.starts + DC_K)).toFixed(3);
  }

  // ---- DefCon-TÆKIFÆRI per lið ----
  // Rök: fleiri skot/mörk á sig -> fleiri hreinsanir/blokkeringar -> fleiri CBIT.
  // Það eru EKKI bestu varnirnar sem skora DefCon, heldur þær sem hafa mest að gera.
  // Reiknað úr opinberum FPL-gögnum: xGC liðsins (sl. tímabil) + sóknarstyrkur andstæðinga
  // í komandi leikjum. Sjálfstætt frá CS% — má EKKI leggja saman (sjá SCHEMA.md).
  const teamAtt = {}, teamDef = {};
  for (const e of els) {
    const t = e.team;
    teamAtt[t] = (teamAtt[t] || 0) + parseFloat(e.expected_goal_involvements || 0);
    if (e.element_type === 1) {
      const mins = e.minutes || 0;
      if (mins > 400) {
        const per90 = parseFloat(e.expected_goals_conceded || 0) / (mins / 90);
        if (!teamDef[t] || mins > teamDef[t].mins) teamDef[t] = { xgc90: +per90.toFixed(2), mins };
      }
    }
  }
  let fixturesArr = [];
  try { fixturesArr = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8")); } catch {}
  const opportunity = {};
  for (const tid of Object.keys(teamAtt)) {
    const own = teamDef[tid]?.xgc90 ?? 1.4;
    const upcoming = fixturesArr.filter(f => !f.finished && (f.team_h === +tid || f.team_a === +tid)).slice(0, 6);
    let oppAttSum = 0;
    upcoming.forEach(f => {
      const opp = f.team_h === +tid ? f.team_a : f.team_h;
      oppAttSum += (teamAtt[opp] || 50) / 38; // sóknar-xGI andstæðings per leik
    });
    const oppAttAvg = upcoming.length ? oppAttSum / upcoming.length : 1.4;
    // 0-100 kvarði: hærra = meira að gera fyrir varnarmenn = fleiri DefCon-tækifæri
    const raw = own * 22 + oppAttAvg * 20;
    opportunity[tid] = {
      own_xgc90: own,
      opp_attack_avg: +oppAttAvg.toFixed(2),
      defcon_opportunity: Math.max(0, Math.min(100, Math.round(raw))),
      fixtures_used: upcoming.length,
    };
  }

  await writeJSON("defcon.json", { updated: status.updated, players: out, opportunity,
    note: "hit_rate = threshold_hits/starts (HRÁ — ofmælist á litlum sýnum). hit_rate_adj = (hits + 10·p0)/(starts + 10), p0 = stöðu-meðaltal — notið HANA til birtingar, alltaf með starts við hlið. DEF þröskuldur 10 CBIT, MID/FWD 12 CBIRT. defcon_opportunity: vinnuálag varnar (hærra = fleiri CBIT-tækifæri) — AÐSKILINN mælikvarði frá CS%, ekki leggja saman." });
  record("defcon", true, out.length, `${Object.keys(opportunity).length} lið með tækifæris-mat`);
}

/* ========== 3b. PER-UMFERÐAR LEIKMANNASAGA — mínútuþróun ==========
   ENGIN NÝ KÖLL: leitt úr data/live/gw{n}.json sem pipeline skrifar þegar
   fyrir hverja lokna umferð. Árstölur (`minutes/gamesPlayed`) geta ekki
   greint sess sem VEX frá sessi sem RÝRNAR — þetta getur.

   Raðirnar eru PER UMFERÐ, ekki per leikinn leik: sá sem sat á bekknum
   fær 0 og telur með. (Fyrri mæling sem sleppti 0-röðum lét bekkjarmenn
   virðast í formi — sjá tests/rank-model.mjs.)                          */
async function computePlayerForm(events, els) {
  const finished = events.filter(ev => ev.finished).map(ev => ev.id).sort((a, b) => a - b);
  const hist = {};                        // id -> [{gw, mins, pts, starts}]
  els.forEach(e => hist[e.id] = []);

  for (const gw of finished) {
    const path = `${DATA}/live/gw${gw}.json`;
    if (!existsSync(path)) continue;
    let live;
    try { live = JSON.parse(await readFile(path, "utf8")); } catch { continue; }
    for (const el of (live.elements || [])) {
      if (!hist[el.id]) hist[el.id] = [];
      const st = el.stats || {};
      hist[el.id].push({ gw, mins: st.minutes || 0, pts: st.total_points || 0,
                         starts: st.starts || 0 });
    }
  }

  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const out = {};
  let withTrend = 0;
  for (const [id, rows] of Object.entries(hist)) {
    if (!rows.length) continue;
    rows.sort((a, b) => a.gw - b.gw);
    const l5 = rows.slice(-5);
    const m5 = l5.map(r => r.mins);
    /* þróun: síðustu 2 umferðir MÍNUS þær 3 þar á undan. Þarf >=4 raðir,
       annars er "þar á undan" sama gluggi og "síðustu" og talan er 0.   */
    const recent = mean(m5.slice(-2));
    const before = l5.length >= 4 ? mean(m5.slice(0, -2)) : recent;
    const trend = recent - before;
    if (trend !== 0) withTrend++;
    out[id] = {
      gws: rows.length,
      mins5: +mean(m5).toFixed(1),
      mins_trend: +trend.toFixed(1),
      ppg5: +mean(l5.map(r => r.pts)).toFixed(2),
      start_rate5: +mean(l5.map(r => r.starts >= 1 ? 1 : 0)).toFixed(2),
    };
  }

  await writeJSON("player_form.json", {
    updated: status.updated, gws_used: finished.length, players: out,
    note: "Per-umferdar sogu leitt ur data/live/gw{n}.json — ENGIN ny koll. "
        + "mins_trend = min/umferd sidustu 2 minus thriggja thar a undan (raðir per UMFERD, 0 talid med). "
        + "Notad i rankScore (vog 0,01; maelt +0,066 topp-15, 5/5 timabil). "
        + "Toemt fyrir GW4 — tha er trend 0 og skorid er eins og adur.",
  });
  record("player_form", true, Object.keys(out).length,
    finished.length ? `${finished.length} umferdir, ${withTrend} med minututhroun`
                    : "engin lokin umferd (preseason) — throunin kviknar vid GW4");
}

/* ========== 3c. STADFEST BYRJUNARLID — /fixtures/lineups ==========
   VERDMAETASTA VIDBOTIN skv. CLAUDE.md kafla 7.1: lidin birtast 40-60 min
   fyrir leik. Med fetch-fast (30 min) naest thvi "byrjar EKKI"-flagg a mina
   menn adur en seinni leikir dagsins byrja — thad er dyrasta einstaka
   mistokin i FPL ad stilla upp manni sem endar a bekknum.

   TVO KOLL PER LEIKDAG-LOTU, EKKI EITT:
   FPL-fixture-id og API-Sports-fixture-id eru ONNUR NUMER. Thvi tharf
   /fixtures?league=39&date=... fyrst (1 kall) til ad fa their id og para
   thau vid FPL-leikina eftir LIDUM, og svo /fixtures/lineups per leik.
   ~11 koll a leikdegi af 100/dag.

   HEIMILDIN A FRIA THREPINU ER OSTADFEST — OG THAD ER MAELT, EKKI GISKAD:
   hvorki notandinn ne eg getum profad hana staðbundid thvi lykillinn er
   adeins i GitHub Secrets (`curl` an hans skilar
   {"errors":{"token":"Missing application key"}} — profad 31.7.).
   Thess vegna er RANNSAKANDI KALL innbyggt: se enginn leikur i glugganum
   er gert EITT kall a thekkt fixture-id og `errors` LOGGAD OSKERT. Actions-
   keyrslan hefur lykilinn, svo logid svarar spurningunni i naestu keyrslu.
   Svarid fer lika i status.json, svo thad se ekki bundid vid eitt log.

   ENGIN AGISKUN UM SVARSNIDID: umslagid ({get,errors,results,response})
   er STADFEST gegn lifandi hostinum, og er thad sama sem fetchInjuries
   les thegar. Innihald `response[]` er skjalfest v3-snid:
     [{ team:{id,name}, formation:"4-3-3", startXI:[{player:{id,name,pos}}],
        substitutes:[{player:{...}}] }]
   Se snidid annad fellur EKKERT — vid skrifum tha 0 leikmenn og skraum thad. */
async function fetchLineups() {
  const errTxt = o => (o.errors && (Array.isArray(o.errors) ? o.errors.join("; ")
                                    : JSON.stringify(o.errors))) || "";
  /* GLUGGINN: leikir sem eru ad byrja (innan 2 klst) eda nybyrjadir (3 klst).
     Utan hans er ekkert ad hafa og engin koll eru notud.                  */
  let fx = [];
  try {
    const all = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
    const now = Date.now();
    fx = all.filter(f => f.kickoff_time && !f.finished_provisional && !f.finished)
      .filter(f => { const d = new Date(f.kickoff_time).getTime() - now;
                     return d < 2 * 3600e3 && d > -3 * 3600e3; });
  } catch (e) { record("api_lineups", false, 0, `fixtures.json: ${e.message}`); return; }

  if (!fx.length) {
    /* RANNSAKANDI KALL — svarar AÐEINS "leyfir threpid endapunktinn?"
       OG ThAD ER SPURNING SEM ThARF AD SVARA EINU SINNI, EKKI 48x A DAG.
       VILLA SEM EG SETTI INN 31.7. OG MAELDI 2.8.: kallid var gert i HVERRI
       hradri keyrslu. Cron gengur a 30 min fresti, svo 48 keyrslur a dag = 48 koll a dag af
       100 i fria threpinu — helmingur dagskvotans i greiningu sem var thegar
       svarad (31.7.: http=200, errors=[], threp LEYFIR endapunktinn).
       2.8. skiladi hun {"access":"Your account is suspended"}. Eg get ekki
       fullyrt ad kollin min hafi valdid thvi — uppsogn er venjulega
       reikningsatridi — en ad brenna helming kvotans i vordur er villa
       oháð thvi.
       NU: svarid er GEYMT i lineups.json og endurtekid adeins ef thad er
       eldra en PROBE_TTL_DAYS. Vid leikdag er thetta hvort sem er ekki
       notad — tha eru raunveruleg kall gerd.                             */
    const PROBE_TTL_DAYS = 7;
    let prev = null;
    try { prev = JSON.parse(await readFile(`${DATA}/lineups.json`, "utf8")).probe; } catch {}
    const prevAge = prev?.at ? (Date.now() - Date.parse(prev.at)) / 864e5 : Infinity;
    if (prev && prevAge < PROBE_TTL_DAYS) {
      await writeJSON("lineups.json", { updated: status.updated, gws: [], teams: [],
        players: [], probe: prev,
        note: "Stadfest byrjunarlid ur API-Sports /fixtures/lineups. TOMT utan "
            + "leikdags-glugga. `probe` er GEYMT svar (endurtekid a "
            + `${PROBE_TTL_DAYS} daga fresti) — ekki nytt kall i hverri keyrslu.` });
      record("api_lineups", true, 0,
        `enginn leikur i glugga; geymt svar ${prevAge.toFixed(1)} daga gamalt`
        + (prev.gated ? " — ENDAPUNKTUR LOKADUR" : ""));
      return;
    }
    const probe = await apiSports("/fixtures/lineups?fixture=1035037");
    const err = errTxt(probe);
    console.log(`API-Sports /fixtures/lineups RANNSOKN: http=${probe.http} ` +
                `results=${probe.results} errors=${JSON.stringify(probe.errors ?? null)}`);
    /* SNIDID LOGGAD LIKA. Rannsoknin 31.7. gaf http=200, errors=[] og
       results=2 — th.e. threpid LEYFIR endapunktinn. Tha er naesta spurning
       hvort `response[]` se i thvi sniði sem vid lesum, og thad er odyrt ad
       svara: logga lyklana i stad thess ad treysta skjolun.              */
    const first = (probe.response || [])[0];
    if (first) console.log("  SNID response[0]: lyklar=" + JSON.stringify(Object.keys(first))
      + ` team=${JSON.stringify(first.team?.name ?? null)}`
      + ` formation=${JSON.stringify(first.formation ?? null)}`
      + ` startXI=${Array.isArray(first.startXI) ? first.startXI.length : "VANTAR"}`
      + ` substitutes=${Array.isArray(first.substitutes) ? first.substitutes.length : "VANTAR"}`
      + ` player0=${JSON.stringify(first.startXI?.[0]?.player ?? null)}`);
    /* "suspended" VANTADI HER og thad kostadi ranga stodu: 2.8.2026 var
       reikningurinn UPPSAGDUR ("Your account is suspended") en `gated` vard
       false, svo stodan sagdi "endapunktur svarar an plan-villu" — sem er
       ordrett rett og alvarlega misvisandi. Adgangsleysi er adgangsleysi
       hvort sem thad heitir plan, threp eda uppsogn.                     */
    const gated = /plan|subscription|not allowed|upgrade|suspend|access/i.test(err);
    record("api_lineups", true, 0,
      gated ? `ENDAPUNKTUR LOKADUR a fria threpinu: ${err.slice(0, 120)}`
            : err ? `enginn leikur i glugga; rannsokn gaf: ${err.slice(0, 120)}`
                  : "enginn leikur i glugga (bidur leikdags) — endapunktur svarar an plan-villu");
    await writeJSON("lineups.json", { updated: status.updated, gws: [], teams: [], players: [],
      probe: { at: status.updated, http: probe.http, errors: probe.errors ?? null, gated },
      note: "Stadfest byrjunarlid ur API-Sports /fixtures/lineups. TOMT utan "
          + "leikdags-glugga (leikur innan 2 klst eda nybyrjadur). `probe` "
          + "geymir svarid vid thvi hvort fria threpid leyfi endapunktinn." });
    return;
  }

  /* 1. API-fixture-id per dagsetning, parad vid FPL-leiki eftir lidum */
  const tmap = JSON.parse(await readFile(`${DATA}/teams_map.json`, "utf8"));
  const teamsJs = JSON.parse(await readFile(`${DATA}/teams.json`, "utf8")).teams;
  const players = JSON.parse(await readFile(`${DATA}/players.json`, "utf8")).players;
  const norm = x => (x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  const teamIdByNorm = {};
  for (const [id, t] of Object.entries(tmap))
    for (const v of [t.fpl, t.fdcouk, t.clubelo, t.understat, t.short])
      if (v) teamIdByNorm[norm(v)] = +id;
  teamsJs.forEach(t => { teamIdByNorm[norm(t.name)] = t.id; });

  /* Dagsetningar-kall er ekki gert se ALLT thegar til — annars kostadi hver
     keyrsla 1 kall til einskis medan glugginn er opinn.                   */
  let prevPeek = null;
  try { prevPeek = JSON.parse(await readFile(`${DATA}/lineups.json`, "utf8")); } catch {}
  const havePeek = new Set((prevPeek?.players || []).map(x => x.fixture));
  const missing = fx.filter(f => !havePeek.has(f.id));
  const dates = [...new Set(missing.map(f => f.kickoff_time.slice(0, 10)))];
  const apiFx = [];
  let calls = 0, errs = [];
  for (const dt of dates) {
    const r = await apiSports(`/fixtures?league=39&date=${dt}`); calls++;
    if (errTxt(r)) errs.push(`fixtures ${dt}: ${errTxt(r)}`);
    for (const it of (r.response || [])) {
      const h = teamIdByNorm[norm(it.teams?.home?.name)];
      const a = teamIdByNorm[norm(it.teams?.away?.name)];
      if (it.fixture?.id && h && a) apiFx.push({ apiId: it.fixture.id, h, a });
    }
  }
  /* 2. Lineups per leik sem vid getum parad vid FPL-leik */
  const fplByTeam = {};
  for (const p of players) {
    const keys = new Set([norm(p.web_name), norm(`${p.first_name} ${p.second_name}`),
      norm(p.second_name), norm(`${(p.first_name || "")[0] || ""} ${p.second_name}`)]);
    (fplByTeam[p.team] ??= []).push({ id: p.id, keys });
  }
  const matchFpl = (nm, teamId) => {
    const n = norm(nm), last = n.split(" ").pop();
    const c = fplByTeam[teamId] || [];
    let hit = c.find(x => x.keys.has(n));
    if (!hit) { const bl = c.filter(x => x.keys.has(last)); if (bl.length === 1) hit = bl[0]; }
    return hit?.id ?? null;
  };
  /* GEYMSLA PER LEIK: byrjunarlid breytist ekki eftir ad thad er birt, en
     glugginn er opinn i 5 klst og keyrslan gengur a 30 min fresti — an
     thessa voru SOMU lidin sott allt ad 10 sinnum. Vid berum afram thad sem
     vid hofum thegar og spyrjum adeins um leiki sem vantar.               */
  let prevAll = null;
  try { prevAll = JSON.parse(await readFile(`${DATA}/lineups.json`, "utf8")); } catch {}
  const haveFx = new Set((prevAll?.players || []).map(x => x.fixture));
  const outPlayers = [], outTeams = [], unmatched = [];
  let reused = 0;
  for (const f of fx) {
    if (haveFx.has(f.id)) {
      outPlayers.push(...(prevAll.players || []).filter(x => x.fixture === f.id));
      outTeams.push(...(prevAll.teams || []).filter(x => x.fixture === f.id));
      reused++;
      continue;
    }
    const m = apiFx.find(x => (x.h === f.team_h && x.a === f.team_a));
    if (!m) continue;
    const r = await apiSports(`/fixtures/lineups?fixture=${m.apiId}`); calls++;
    if (errTxt(r)) { errs.push(`lineups ${m.apiId}: ${errTxt(r)}`); continue; }
    for (const side of (r.response || [])) {
      const teamId = teamIdByNorm[norm(side.team?.name)];
      if (!teamId) continue;
      outTeams.push({ fpl_team: teamId, gw: f.event, formation: side.formation ?? null,
                      fixture: f.id });
      const add = (arr, started) => {
        for (const e of (arr || [])) {
          const nm = e.player?.name;
          const id = matchFpl(nm, teamId);
          if (id == null) { unmatched.push(`${nm} (${side.team?.name})`); continue; }
          outPlayers.push({ fpl_id: id, fpl_team: teamId, gw: f.event, fixture: f.id,
                            started, pos: e.player?.pos ?? null, name_api: nm });
        }
      };
      add(side.startXI, true);
      add(side.substitutes, false);
    }
  }
  await writeJSON("lineups.json", { updated: status.updated,
    gws: [...new Set(fx.map(f => f.event))], calls,
    teams: outTeams, players: outPlayers, unmatched, errors: errs,
    note: "Stadfest byrjunarlid (started=true) og bekkur (false) ur API-Sports "
        + "/fixtures/lineups fyrir leiki innan gluggans. FPL-status raedur "
        + "aframhaldandi tiltækileika; thetta er STADFESTING, ekki spa." });
  const started = outPlayers.filter(p => p.started).length;
  record("api_lineups", !errs.length || !!outPlayers.length, outPlayers.length,
    errs.length ? `${calls} koll (${reused} endurnyttir), ${started} byrja, villur: ${errs[0].slice(0, 90)}`
                : `${calls} koll (${reused} leikir endurnyttir), ${outTeams.length} lid, `
                  + `${started} byrja, ${unmatched.length} oparadir`);
}

/* ========== 4. CLUB ELO — CSV, tvö köll (http + endurtekning v. yfirálags) ========== */
async function eloFetch(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      /* TIMAMORK — VANTADI ALVEG. undici hefur ~300 s sjalfgildi, sem er
         ekki timamork i cron heldur HENGJA: thrjar tilraunir gefa 15 min af
         bid adur en keyrslan gefst upp. Maelt 31.7.2026: elo BRAST i raun
         thann dag ("fetch failed") og appid keyrdi FFDR a Elo fra 30.7. an
         ad nokkud saegdi thad — sama mynstur sem gerdi markadslidinn daudan
         i viku (kafli 3). 20 s er rifleg mork fyrir eina CSV.            */
      const r = await fetch(url, { headers: { "User-Agent": UA },
                                   signal: AbortSignal.timeout(20000) });
      if (r.status === 429 || r.status >= 500) throw new Error(`${r.status} (yfirálag?)`);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      const text = await r.text();
      if (!text || text.length < 20) throw new Error("tómt svar");
      return text;
    } catch (e) {
      lastErr = e;
      console.warn(`ClubElo tilraun ${i + 1}/${tries} brást: ${e.message}`);
      /* ekki sofa eftir SIDUSTU tilraun — thad voru 6 s af hreinni bid */
      if (i < tries - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastErr;
}
async function fetchElo() {
  // ClubElo notar http (ekki https) — https gefur oft "fetch failed"
  const text = await eloFetch(`http://api.clubelo.com/${today}`);
  const { header, rows } = parseCSV(text);
  console.log(`ClubElo dags-haus: ${header.join(",")}`);
  const eng = rows.filter(r => r.Country === "ENG" && (r.Level === "1" || r.Level === "2"));
  // LOGGA öll ensk nöfn — þannig þarf aldrei að giska á stafsetningu aftur
  console.log(`ClubElo ENG L1+L2 nöfn (${eng.length}): ${eng.map(r => r.Club).join(" | ")}`);

  // normaliserað: lágstafir, aðeins bókstafir/tölur (þolir bil, punkta, úrfellingar)
  const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const byNorm = {};
  eng.forEach(r => { byNorm[norm(r.Club)] = r; });

  // mörg möguleg nöfn per lið (ClubElo notar bil í fjölorða nöfnum)
  const CAND = {
    ARS:["Arsenal"], AVL:["Aston Villa","AstonVilla","Villa"], BOU:["Bournemouth","AFC Bournemouth"],
    BRE:["Brentford"], BHA:["Brighton"], CHE:["Chelsea"], COV:["Coventry","Coventry City"],
    CRY:["Crystal Palace","CrystalPalace","Palace"], EVE:["Everton"], FUL:["Fulham"],
    HUL:["Hull","Hull City"], IPS:["Ipswich","Ipswich Town"], LEE:["Leeds","Leeds United"],
    LIV:["Liverpool"], MCI:["Man City","ManCity","Manchester City"],
    MUN:["Man United","ManUnited","Man Utd","Manchester United"],
    NEW:["Newcastle","Newcastle United"], NFO:["Forest","Nottingham","Nott'm Forest","Nottingham Forest"],
    SUN:["Sunderland"], TOT:["Tottenham","Spurs"], WOL:["Wolves"], BUR:["Burnley"], WHU:["West Ham"],
  };
  const eloByFpl = {};
  const teams = [];
  for (const [id, t] of Object.entries(teamsById)) {
    const cands = CAND[t.short_name] || [t.name];
    let row = null;
    for (const c of cands) { const hit = byNorm[norm(c)]; if (hit) { row = hit; break; } }
    if (row) {
      const rec = { fpl_id: Number(id), short: t.short_name, elo: +row.Elo,
        rank: row.Rank ? +row.Rank : null, level: +row.Level, clubelo_name: row.Club };
      teams.push(rec); eloByFpl[row.Club] = Number(id);
    } else {
      console.warn(`ClubElo: fann ekki ${t.short_name} (${t.name}) — prófaði: ${cands.join(", ")}`);
    }
  }
  await writeJSON("elo.json", { updated: status.updated, teams });
  record("elo", true, teams.length, `af ${eng.length} ENG L1+L2`);

  // /Fixtures: kolónur STAÐFESTAR = Date,Country,Home,Away,GD<-5..GD>5,R:0-0..R:6-0
  // Úr úrslitalíkindum má reikna hreint blað og sigurlíkur — ókeypis, engin Odds-credit.
  try {
    const ft = await eloFetch("http://api.clubelo.com/Fixtures");
    const { header: fh, rows: fr } = parseCSV(ft);
    const engFx = fr.filter(r => r.Country === "ENG");
    const scoreCols = fh.filter(h => h.startsWith("R:"));
    const out = engFx.map(r => {
      let csHome = 0, csAway = 0, pHome = 0, pDraw = 0, pAway = 0, xgH = 0, xgA = 0;
      for (const col of scoreCols) {
        const m = col.match(/^R:(\d+)-(\d+)$/); if (!m) continue;
        const h = +m[1], a = +m[2], p = parseFloat(r[col] || 0);
        if (!p) continue;
        if (a === 0) csHome += p;      // andstæðingur skorar ekki -> heimalið heldur hreinu
        if (h === 0) csAway += p;
        if (h > a) pHome += p; else if (h === a) pDraw += p; else pAway += p;
        xgH += h * p; xgA += a * p;
      }
      return {
        date: r.Date, home: r.Home, away: r.Away,
        home_fpl: eloByFpl[r.Home] ?? null, away_fpl: eloByFpl[r.Away] ?? null,
        cs_home: +(csHome * 100).toFixed(1), cs_away: +(csAway * 100).toFixed(1),
        p_home: +(pHome * 100).toFixed(1), p_draw: +(pDraw * 100).toFixed(1), p_away: +(pAway * 100).toFixed(1),
        xg_home: +xgH.toFixed(2), xg_away: +xgA.toFixed(2),
      };
    });
    await writeJSON("elo_fixtures.json", { updated: status.updated, fixtures: out });
    record("elo_fixtures", true, out.length, `${engFx.length} ENG af ${fr.length}`);
  } catch (e) { record("elo_fixtures", false, 0, e.message); }
}

/* ========== 5. FOOTBALL-DATA.CO.UK — CSV ========== */
async function fetchFdcouk() {
  /* E0 yfirstandandi timabil. FYRIR TIMABIL ER SKRAIN EKKI TIL og
     football-data skilar 404 — thad er EDLILEGT astand, ekki bilun, og a
     ekki ad birtast sem raud villa i Gagnaheimildum. Vid greinum a milli:
     404 = "bidur timabils", allt annad = raunveruleg villa.               */
  let text;
  try {
    ({ text } = await getText("https://www.football-data.co.uk/mmz4281/2627/E0.csv"));
  } catch (e) {
    if (/^404 /.test(e.message)) {
      record("fdcouk_e0", true, 0, "bíður tímabils — E0 2026/27 verður til við fyrstu umferð");
      return;
    }
    throw e;
  }
  const { header, rows } = parseCSV(text);
  console.log(`fdcouk E0 kolónur: ${header.slice(0, 20).join(",")}…`);
  await writeJSON("fdcouk/E0-2627.json", { header, rows });
  record("fdcouk_e0", true, rows.length);
}

/* ========== 5b. SÖGULEG E0 — H2H, dómarar, heima/úti, lokalínur ==========
   Sama heimild sem þegar er notuð (football-data.co.uk), en söguleg tímabil.
   Leikjatölur eru til frá 2017/18. Þetta gefur gögn NÚNA, óháð tímabilsbyrjun:
   - innbyrðis viðureignir liða
   - dómara-tilhneiging til spjalda (áhrif á bann-hættu)
   - heima/úti-mynstur
   - lokalínur (skarpasta fría líkindaspáin)
   SÆKT EINU SINNI — skrárnar breytast ekki eftir að tímabil er lokið.        */
async function fetchHistoricalE0() {
  /* 15 TÍMABIL (28.7.2026) = 14 SPÁÐ; fyrsta er aðeins styrk-heimild.
     Leikjatölur (HST/AST) eru til frá 1112 svo liðsstyrkur er heill alla
     leið; yfir/undir og asískt handicap koma úr Betbrain-meðaltölum
     (BbAv>2.5 / BbAHh) fyrir 2019 og úr B365/Avg eftir það — fallröðin
     í tests/lib/e0.mjs marketForRow() sér um það. */
  const SEASONS = ["1112","1213","1314","1415","1516","1617","1718","1819","1920","2021","2122","2223","2324","2425","2526"];
  const allRows = [];
  let fetchedSeasons = 0;
  for (const ss of SEASONS) {
    const path = `fdcouk/E0-${ss}.json`;
    if (existsSync(`${DATA}/${path}`)) {
      try { allRows.push(...JSON.parse(await readFile(`${DATA}/${path}`, "utf8")).rows); } catch {}
      continue;
    }
    try {
      const { text } = await getText(`https://www.football-data.co.uk/mmz4281/${ss}/E0.csv`);
      const { header, rows } = parseCSV(text);
      // VARÚÐ frá football-data.co.uk: Pinnacle-fæðið (PS*/PSC*) er óáreiðanlegt
      // frá 23.07.2025 og ekki lengur notað í meðaltöl. Merkjum það.
      const untrusted = header.filter(h => /^PSC?[HDA]$/.test(h));
      await writeJSON(path, { season: ss, header, rows,
        untrusted_columns: untrusted,
        untrusted_note: "Pinnacle-línur óáreiðanlegar frá 2025-07-23 — ekki nota í meðaltöl." });
      allRows.push(...rows);
      fetchedSeasons++;
      console.log(`fdcouk E0-${ss}: ${rows.length} leikir`);
      await new Promise(r => setTimeout(r, 600));
    } catch (e) { console.warn(`fdcouk E0-${ss}: ${e.message}`); }
  }
  if (!allRows.length) { record("fdcouk_history", false, 0, "engin söguleg gögn"); return; }

  // ---- Dómara-tilhneiging: spjöld per leik ----
  const refs = {};
  for (const r of allRows) {
    const ref = (r.Referee || "").trim();
    if (!ref) continue;
    const y = (+r.HY || 0) + (+r.AY || 0);
    const rd = (+r.HR || 0) + (+r.AR || 0);
    const f = (+r.HF || 0) + (+r.AF || 0);
    const a = refs[ref] || (refs[ref] = { games:0, yellow:0, red:0, fouls:0 });
    a.games++; a.yellow += y; a.red += rd; a.fouls += f;
  }
  const refOut = {};
  const leagueAvgY = Object.values(refs).reduce((s,a)=>s+a.yellow,0) /
                     Math.max(1, Object.values(refs).reduce((s,a)=>s+a.games,0));
  for (const [ref, a] of Object.entries(refs)) {
    if (a.games < 20) continue; // of lítið úrtak
    refOut[ref] = {
      games: a.games,
      yellow_pg: +(a.yellow / a.games).toFixed(2),
      red_pg: +(a.red / a.games).toFixed(3),
      fouls_pg: +(a.fouls / a.games).toFixed(1),
      // hlutfall á móti meðaltali: 1.2 = 20% fleiri spjöld en meðal-dómari
      card_index: +((a.yellow / a.games) / (leagueAvgY || 1)).toFixed(2),
    };
  }
  await writeJSON("fdcouk/referees.json", {
    updated: status.updated, seasons: SEASONS, league_avg_yellow_pg: +leagueAvgY.toFixed(2),
    note: "card_index > 1 = fleiri spjöld en meðal-dómari. Nýtist í bann-hættu leikmanna.",
    referees: refOut,
  });

  // ---- Innbyrðis viðureignir (H2H) per liðapar ----
  const h2h = {};
  for (const r of allRows) {
    const h = (r.HomeTeam || "").trim(), a = (r.AwayTeam || "").trim();
    if (!h || !a) continue;
    const key = `${h}|${a}`;
    const o = h2h[key] || (h2h[key] = {
      games:0, home_w:0, draw:0, away_w:0, gf:0, ga:0, btts:0, over25:0,
      cs_home:0, cs_away:0, // TELJUM hrein blöð beint — ekki afleiða úr BTTS
    });
    o.games++;
    const hg = +r.FTHG || 0, ag = +r.FTAG || 0;
    o.gf += hg; o.ga += ag;
    if (r.FTR === "H") o.home_w++; else if (r.FTR === "D") o.draw++; else o.away_w++;
    if (hg > 0 && ag > 0) o.btts++;
    if (hg + ag > 2.5) o.over25++;
    if (ag === 0) o.cs_home++;   // heimalið hélt hreinu = úti skoraði 0
    if (hg === 0) o.cs_away++;   // útilið hélt hreinu = heima skoraði 0
  }
  const h2hOut = {};
  for (const [k, o] of Object.entries(h2h)) {
    if (o.games < 2) continue;
    h2hOut[k] = {
      games: o.games, home_w: o.home_w, draw: o.draw, away_w: o.away_w,
      home_w_pct: Math.round(o.home_w / o.games * 100),
      cs_home_pct: Math.round(o.cs_home / o.games * 100),
      cs_away_pct: Math.round(o.cs_away / o.games * 100),
      avg_goals: +((o.gf + o.ga) / o.games).toFixed(2),
      goals_home_pg: +(o.gf / o.games).toFixed(2),
      goals_away_pg: +(o.ga / o.games).toFixed(2),
      btts_pct: Math.round(o.btts / o.games * 100),
      over25_pct: Math.round(o.over25 / o.games * 100),
    };
  }
  await writeJSON("fdcouk/h2h.json", {
    updated: status.updated, seasons: SEASONS,
    note: "Lyklað 'HomeTeam|AwayTeam' með fdcouk-nöfnum. Sögulegt mynstur, ekki spá.",
    pairs: h2hOut,
  });

  record("fdcouk_history", true, allRows.length,
    `${fetchedSeasons} ný tímabil · ${Object.keys(refOut).length} dómarar · ${Object.keys(h2hOut).length} liðapör`);
}

/* ========== 6. NÝLIÐA-GRUNNLÍNA — B-deild 2025/26, EINU SINNI ========== */
async function fetchPromotedBaseline() {
  const path = `${DATA}/promoted_baseline.json`;
  if (existsSync(path)) { record("promoted_baseline", true, 0, "þegar til — sleppt"); return; }
  const { text } = await getText("https://www.football-data.co.uk/mmz4281/2526/E1.csv");
  const { rows } = parseCSV(text);
  const promoted = ["Coventry", "Hull", "Ipswich"];
  const agg = {};
  const bump = (team, isHome, r) => {
    const a = agg[team] || (agg[team] = { games:0, shots:0, sot:0, goals:0, sh_ag:0, sot_ag:0, goals_ag:0 });
    a.games++;
    a.shots += +(isHome ? r.HS : r.AS) || 0;
    a.sot   += +(isHome ? r.HST : r.AST) || 0;
    a.goals += +(isHome ? r.FTHG : r.FTAG) || 0;
    a.sh_ag += +(isHome ? r.AS : r.HS) || 0;
    a.sot_ag+= +(isHome ? r.AST : r.HST) || 0;
    a.goals_ag += +(isHome ? r.FTAG : r.FTHG) || 0;
  };
  for (const r of rows) {
    if (promoted.includes(r.HomeTeam)) bump(r.HomeTeam, true, r);
    if (promoted.includes(r.AwayTeam)) bump(r.AwayTeam, false, r);
  }
  const out = {};
  for (const [team, a] of Object.entries(agg)) {
    out[team] = { source: "championship_proxy", games: a.games,
      shots_pg: +(a.shots/a.games).toFixed(2), sot_pg: +(a.sot/a.games).toFixed(2),
      goals_pg: +(a.goals/a.games).toFixed(2), conv: a.shots? +(a.goals/a.shots).toFixed(3):0,
      shots_against_pg: +(a.sh_ag/a.games).toFixed(2), sot_against_pg: +(a.sot_ag/a.games).toFixed(2),
      goals_against_pg: +(a.goals_ag/a.games).toFixed(2) };
  }
  await writeJSON("promoted_baseline.json", out);
  record("promoted_baseline", true, Object.keys(out).length, "championship_proxy");
}

/* ========== 7. OPEN-METEO — veður fyrir óspilaða leiki ========== */
async function fetchWeather() {
  const fixtures = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
  const teamsMap = JSON.parse(await readFile(`${DATA}/teams_map.json`, "utf8"));
  const upcoming = fixtures.filter(f => !f.finished && f.kickoff_time);
  const out = [];
  for (const f of upcoming) {
    const home = teamsMap[f.team_h];
    if (!home || home.lat == null) continue;
    const d = f.kickoff_time.slice(0, 10);
    // spá nær ~16 daga; lengra fær null
    const daysAhead = (new Date(d) - new Date(today)) / 86400000;
    if (daysAhead > 16) { out.push({ fixture_id: f.id, kickoff: f.kickoff_time, temp_c: null, precip_mm: null, wind_kmh: null, gust_kmh: null }); continue; }
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${home.lat}&longitude=${home.lon}`
        + `&hourly=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m&start_date=${d}&end_date=${d}&timezone=UTC`;
      const w = await getJSON(u);
      const hour = f.kickoff_time.slice(11, 13) + ":00";
      const idx = (w.hourly?.time || []).findIndex(t => t.slice(11, 16) === hour);
      const i = idx >= 0 ? idx : 15; // fallback ~kickoff hádegi
      out.push({ fixture_id: f.id, kickoff: f.kickoff_time,
        temp_c: w.hourly?.temperature_2m?.[i] ?? null,
        precip_mm: w.hourly?.precipitation?.[i] ?? null,
        wind_kmh: w.hourly?.wind_speed_10m?.[i] ?? null,
        gust_kmh: w.hourly?.wind_gusts_10m?.[i] ?? null });
      await new Promise(r => setTimeout(r, 300));
    } catch (e) { console.warn(`veður fixture ${f.id}: ${e.message}`); }
  }
  await writeJSON("weather.json", { updated: status.updated, fixtures: out });
  record("weather", true, out.length);
}

/* ========== 3. UNDERSTAT — árstíðarsummur (sjálf-greinandi) ========== */
async function fetchUnderstat() {
  const decode = s => s.replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  // Understat tímabils-númer = byrjunarár. 2026/27 -> "2026". Prófum líka 2025 til vara.
  let text, usedUrl;
  for (const yr of ["2026", "2025"]) {
    try {
      const r = await fetch(`https://understat.com/league/EPL/${yr}`, { headers: { "User-Agent": UA } });
      if (!r.ok) { console.warn(`Understat /${yr}: HTTP ${r.status}`); continue; }
      text = await r.text(); usedUrl = yr;
      if (text.includes("JSON.parse")) break;
    } catch (e) { console.warn(`Understat /${yr}: ${e.message}`); }
  }
  if (!text) { record("understat_season", false, 0, "náði engri síðu"); return; }

  // logga hvaða JSON.parse-breytur eru á síðunni (þetta segir okkur sannleikann)
  const found = [...text.matchAll(/(?:var\s+)?(\w+)\s*=\s*JSON\.parse/g)].map(m => m[1]);
  console.log(`Understat (/${usedUrl}) JSON.parse breytur: ${found.length ? found.join(", ") : "ENGAR"}`);
  if (!found.length) {
    const snippet = text.slice(0, 500).replace(/\s+/g, " ");
    console.log(`Understat hrátt (fyrstu 500): ${snippet}`);
    record("understat_season", false, 0, "engar JSON.parse breytur — sjá logg");
    return;
  }
  const grab = (varName) => {
    const re = new RegExp(varName + "\\s*=\\s*JSON\\.parse\\(\\s*'([^']*)'\\s*\\)");
    const m = text.match(re);
    if (!m) return null;
    try { return JSON.parse(decode(m[1])); } catch (e) { console.warn(`Understat ${varName} parse-villa: ${e.message}`); return null; }
  };
  const teamsData = grab("teamsData");
  const playersData = grab("playersData");
  const datesData = grab("datesData");
  await writeJSON("understat/season.json", { updated: status.updated, season: usedUrl,
    teams: teamsData ?? null, players: playersData ?? null, dates: datesData ?? null, vars_found: found });
  const n = (playersData?.length) ?? 0;
  record("understat_season", !!(teamsData || playersData), n, `/${usedUrl} · [${found.join(",")}]`);
}

/* ========== 3b. UNDERSTAT SKOT PER LEIK — grunnur fyrir "big chances" ==========
   Skot-gögn gefa það sem FPL birtir EKKI: npxG, fastaleikja-hættu, og
   BIG CHANCES MISSED (skot með xG > 0.30 sem fór ekki inn).
   Sæktu match-síður, EKKI player/{id} (700 köll). Hámark 1 kall/sek.        */
const BIG_CHANCE_XG = 0.30;

async function fetchUnderstatShots() {
  const decode = s => s.replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const grab = (text, varName) => {
    const m = text.match(new RegExp(varName + "\\s*=\\s*JSON\\.parse\\(\\s*'([^']*)'\\s*\\)"));
    if (!m) return null;
    try { return JSON.parse(decode(m[1])); } catch { return null; }
  };

  // Leikjalisti tímabilsins fæst úr datesData á lið-síðum, eða af league-síðu.
  // Við lesum season.json sem þegar var skrifað (vars_found segir hvað er í boði).
  let season = null;
  try { season = JSON.parse(await readFile(`${DATA}/understat/season.json`, "utf8")); } catch {}
  const dates = season?.dates;
  if (!dates || !Array.isArray(dates)) {
    /* SKILABODIN VORU OSONN. Adur stod "tímabil ekki byrjað?" sem gaf i skyn
       ad thetta myndi leysast i agust. MAELT 27.7.2026: Understat hefur
       FJARLAEGT skot-gognin ur HTML-inu. league-sidur skila BYTE-EINS
       18.645 b skel i 5/5 tilraunum og fyrir OLL timabil (2019, 2024, 2025);
       leikjasidur hafa adeins `var match_info` — `shotsData` og `rostersData`
       eru horfin. Thetta batnar thvi EKKI af sjalfu ser.
       Skot-kortid kemur nu ur ESPN i stadinn (sja fetchEspnShots).          */
    record("understat_shots", false, 0,
      "Understat birtir ekki lengur shotsData (maelt 27.7.2026, 5/5 tilraunir) — ESPN kom i stadinn");
    return;
  }

  // aðeins LOKNIR leikir sem við höfum ekki þegar sótt
  const done = dates.filter(d => d.isResult);
  let fetched = 0, bigMissed = {}, shotsTotal = 0;
  for (const d of done) {
    const path = `understat/match/${d.id}.json`;
    if (existsSync(`${DATA}/${path}`)) continue;
    try {
      const r = await fetch(`https://understat.com/match/${d.id}`, { headers: { "User-Agent": UA } });
      if (!r.ok) { console.warn(`Understat match ${d.id}: HTTP ${r.status}`); continue; }
      const text = await r.text();
      const shots = grab(text, "shotsData");
      if (!shots) { console.warn(`Understat match ${d.id}: engin shotsData`); continue; }
      await writeJSON(path, shots);
      fetched++;
      // afleiða big chances missed jafnóðum
      for (const side of ["h", "a"]) {
        for (const sh of (shots[side] || [])) {
          shotsTotal++;
          const xg = parseFloat(sh.xG || 0);
          if (xg > BIG_CHANCE_XG && sh.result !== "Goal") {
            const key = sh.player_id;
            bigMissed[key] = bigMissed[key] || { player: sh.player, missed: 0, xg_sum: 0 };
            bigMissed[key].missed++;
            bigMissed[key].xg_sum = +(bigMissed[key].xg_sum + xg).toFixed(2);
          }
        }
      }
      await new Promise(r => setTimeout(r, 1100)); // hámark 1 kall/sek
    } catch (e) { console.warn(`Understat match ${d.id}: ${e.message}`); }
  }
  if (Object.keys(bigMissed).length) {
    await writeJSON("understat/big_chances.json", {
      updated: status.updated, threshold_xg: BIG_CHANCE_XG,
      note: "Skot með xG yfir þröskuldi sem fóru EKKI inn. Understat player_id — parast við FPL gegnum understat_id_map.",
      players: bigMissed,
    });
  }
  record("understat_shots", true, fetched, `${shotsTotal} skot · ${Object.keys(bigMissed).length} leikm. m. klúðruð stórfæri`);
}

/* ========== 9b. EVRÓPULEIKIR — álag/rótasjón (sjálf-greinandi) ==========
   FPL-API-ið veit ekkert um Evrópukeppnir. Tveir kostir:
   (a) ESPN almenna API — enginn lykill, nær yfir allar UEFA-keppnir, en ÓFORMLEGT
   (b) football-data.org — Meistaradeild frí "forever", þarf frían lykil (EURO_API_KEY)
   Slóðir/keppnikóðar eru ÓSTAÐFESTIR: við prófum nokkra og LOGGUM hvað svarar.
   ATH: UEFA-keppnir byrja um 16. sept 2026 -> GW1-4 hafa engin Evrópuleiki.       */
async function fetchEuro() {
  const found = [];
  const matches = [];
  const seen = new Set();

  // --- Varpa liðanöfnum á FPL-id (normaliserað, þolir mismunandi stafsetningu) ---
  const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "")
    .replace(/^afc/, "").replace(/fc$/, "").replace(/^the/, "");
  const fplByNorm = {};
  for (const [id, t] of Object.entries(teamsById)) {
    fplByNorm[norm(t.name)] = Number(id);
    fplByNorm[norm(t.short_name)] = Number(id);
    // algeng löng nöfn sem ESPN/fd.org nota
    const LONG = {
      ARS:["Arsenal"], AVL:["Aston Villa"], BOU:["Bournemouth","AFC Bournemouth"],
      BRE:["Brentford"], BHA:["Brighton & Hove Albion","Brighton and Hove Albion"],
      CHE:["Chelsea"], COV:["Coventry City"], CRY:["Crystal Palace"], EVE:["Everton"],
      FUL:["Fulham"], HUL:["Hull City"], IPS:["Ipswich Town"], LEE:["Leeds United"],
      LIV:["Liverpool"], MCI:["Manchester City"], MUN:["Manchester United"],
      NEW:["Newcastle United"], NFO:["Nottingham Forest"], SUN:["Sunderland"],
      TOT:["Tottenham Hotspur"],
    }[t.short_name] || [];
    LONG.forEach(n => fplByNorm[norm(n)] = Number(id));
  }


  // --- (0) UPPGÖTVUN: spyrja ESPN hvaða keppnir eru til í fótbolta.
  // Í stað þess að giska á kóða loggum við þá sem raunverulega eru í boði.
  // Loggið úr þessu skrefi gerir næstu útgáfu nákvæma.
  let discovered = [];
  for (const durl of [
    "https://site.api.espn.com/apis/site/v2/sports/soccer",
    "https://site.api.espn.com/apis/site/v2/sports/soccer/leagues",
  ]) {
    try {
      const r = await fetch(durl, { headers: { "User-Agent": UA } });
      if (!r.ok) { console.log(`Evrópa uppgötvun ${durl.slice(-30)}: HTTP ${r.status}`); continue; }
      const j = await r.json();
      // ESPN skilar ýmsum formum — grípum öll 'slug'/'id' sem líkjast keppnikóða
      const codes = new Set();
      const walk = o => {
        if (!o || typeof o !== "object") return;
        if (typeof o.slug === "string" && o.slug.includes(".")) codes.add(o.slug);
        if (typeof o.id === "string" && o.id.includes(".")) codes.add(o.id);
        Object.values(o).forEach(walk);
      };
      walk(j);
      discovered = [...codes];
      const relevant = discovered.filter(c => /uefa|^eng\.|fifa\.cwc/i.test(c));
      console.log(`Evrópa uppgötvun: ${discovered.length} kóðar, viðeigandi (${relevant.length}): ${relevant.join(", ")}`);
      // Æfingarleikir: LOGGA en EKKI nota. Þeir mega ekki skekkja álagsreikning
      // (falskar tvöfaldar umferðir). Sjá FRIENDLY_BLOCK neðar.
      const friendlyCodes = discovered.filter(c => /friendly|friendlies|preseason|pre_season/i.test(c));
      if (friendlyCodes.length) console.log(`Æfingarleikja-kóðar (EKKI notaðir): ${friendlyCodes.join(", ")}`);
      if (discovered.length) break;
    } catch (e) { console.log(`Evrópa uppgötvun brást: ${e.message}`); }
  }

  // --- (a) ESPN: nota uppgötvaða kóða ef til, annars kandídata ---
  // UEFA + innlendar bikarkeppnir + forkeppnir. Kóðar ÓSTAÐFESTIR — prófum og loggum.
  const CANDIDATES = [
    "uefa.champions", "uefa.europa", "uefa.europa.conf", "uefa.super_cup",
    "uefa.champions_qual", "uefa.europa_qual", "uefa.conf_qual",
    "eng.fa", "eng.league_cup", "eng.charity", "fifa.cwc",
  ];
  // VÖRN: æfingarleikir og vinamót eru útilokuð. Þeir eru ekki keppnisleikir og
  // myndu skekkja álag/rótasjón (og búa til falskar tvöfaldar umferðir).
  const FRIENDLY_BLOCK = /friendly|friendlies|preseason|pre_season|testimonial|trophy\.pre/i;
  const ESPN_CODES = (discovered.length
    ? [...new Set([...discovered.filter(c => /uefa|^eng\.(fa|league_cup|charity)|fifa\.cwc/i.test(c)), ...CANDIDATES])]
    : CANDIDATES).filter(c => !FRIENDLY_BLOCK.test(c));
  console.log(`Evrópa: prófa ${ESPN_CODES.length} kóða`);
  const d1 = today.replace(/-/g, "");
  const end = new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10).replace(/-/g, "");
  for (const code of ESPN_CODES) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${d1}-${end}`;
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (!r.ok) { console.log(`Evrópa ESPN ${code}: HTTP ${r.status}`); continue; }
      const j = await r.json();
      const evs = j.events || [];
      console.log(`Evrópa ESPN ${code}: OK, ${evs.length} viðureignir`);
      if (evs.length) found.push(`espn:${code}(${evs.length})`);
      for (const e of evs) {
        const comp = (e.competitions || [])[0];
        const teams = (comp?.competitors || []).map(c => c.team?.displayName || c.team?.name).filter(Boolean);
        if (teams.length !== 2) continue;
        const key = `${e.date}|${teams.join("|")}`;
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push({ comp: code, date: e.date, home: teams[0], away: teams[1] });
      }
      await new Promise(r => setTimeout(r, 350));
    } catch (e) { console.log(`Evrópa ESPN ${code}: ${e.message}`); }
  }

  // --- (b) football-data.org (aðeins ef lykill er til) ---
  const euroKey = process.env.EURO_API_KEY || "";
  if (euroKey) {
    for (const comp of ["CL", "EL"]) {
      try {
        // MIKILVÆGT: án dateFrom/dateTo skilar fd.org NÝJASTA tímabili sem það hefur
        // (t.d. 2025/26 áður en dráttur 2026/27 er gerður) -> úreltar dagsetningar.
        const dTo = new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10);
        const r = await fetch(
          `https://api.football-data.org/v4/competitions/${comp}/matches?dateFrom=${today}&dateTo=${dTo}`,
          { headers: { "X-Auth-Token": euroKey, "User-Agent": UA } });
        if (!r.ok) { console.log(`Evrópa fd.org ${comp}: HTTP ${r.status}`); continue; }
        const j = await r.json();
        const ms = j.matches || [];
        console.log(`Evrópa fd.org ${comp}: OK, ${ms.length} leikir`);
        found.push(`fdorg:${comp}(${ms.length})`);
        for (const m of ms) {
          const h = m.homeTeam?.shortName || m.homeTeam?.name, a = m.awayTeam?.shortName || m.awayTeam?.name;
          if (!h || !a) continue;
          const key = `${m.utcDate}|${h}|${a}`;
          if (seen.has(key)) continue;
          seen.add(key);
          matches.push({ comp, date: m.utcDate, home: h, away: a });
        }
      } catch (e) { console.log(`Evrópa fd.org ${comp}: ${e.message}`); }
    }
  } else {
    console.log("Evrópa: EURO_API_KEY vantar — sleppi football-data.org (ESPN reynt samt)");
  }

  // --- (c) ÞÁTTTAKA 2026/27: hverjir eru í Evrópu, þótt leikir séu ódregnir.
  // Þetta er nothæft fyrir álagsplönun MÁNUÐUM áður en dráttur er gerður.
  const participation = {};
  if (euroKey) {
    for (const comp of ["CL", "EL", "ECL"]) {
      try {
        const r = await fetch(`https://api.football-data.org/v4/competitions/${comp}/teams`,
          { headers: { "X-Auth-Token": euroKey, "User-Agent": UA } });
        if (!r.ok) { console.log(`Þátttaka ${comp}: HTTP ${r.status}`); continue; }
        const j = await r.json();
        const season = j.season?.startDate ? j.season.startDate.slice(0, 4) : "?";
        const tms = j.teams || [];
        let eng = 0;
        for (const t of tms) {
          const nm = t.shortName || t.name;
          const id = fplByNorm[norm(nm)] ?? fplByNorm[norm(t.name)] ?? null;
          if (id) {
            (participation[id] = participation[id] || []).push(comp);
            eng++;
          }
        }
        console.log(`Þátttaka ${comp}: tímabil ${season}, ${tms.length} lið, ${eng} ensk`);
        found.push(`part:${comp}(${eng}eng)`);
      } catch (e) { console.log(`Þátttaka ${comp}: ${e.message}`); }
    }
  }

  // Aðeins leikir sem varða ensk lið (það er allt sem hefur áhrif á FPL-álag)
  const out = [];
  const unmatched = new Set();
  let stale = 0, friendlySkipped = 0;
  for (const m of matches) {
    // HARÐUR FILTER: sleppa öllu sem er í fortíðinni. Heimildir skila stundum
    // síðasta tímabili þegar nýtt er ekki dregið — þau gögn eru verri en engin.
    if (!m.date || m.date.slice(0, 10) < today) { stale++; continue; }
    // Auka-vörn: ef keppnin er æfingarleikur, sleppa (á ekki að gerast en tryggjum).
    if (/friendly|preseason|testimonial/i.test(m.comp)) { friendlySkipped++; continue; }
    const hId = fplByNorm[norm(m.home)] ?? null;
    const aId = fplByNorm[norm(m.away)] ?? null;
    if (!hId && !aId) {
      if (/united|city|arsenal|chelsea|liverpool|tottenham|villa|forest|newcastle|brighton/i.test(`${m.home} ${m.away}`))
        unmatched.add(`${m.home} v ${m.away}`);
      continue;
    }
    out.push({ comp: m.comp, date: m.date, home: m.home, away: m.away, home_fpl: hId, away_fpl: aId });
  }
  if (stale) console.log(`Evrópa: sleppti ${stale} úreltum leikjum (dagsetning fyrir ${today})`);
  if (friendlySkipped) console.log(`Evrópa: sleppti ${friendlySkipped} æfingarleikjum (ekki keppnisleikir)`);
  if (unmatched.size) console.log(`Evrópa: ópöruð ensk-lík nöfn: ${[...unmatched].slice(0,8).join(" | ")}`);

  // Álag per lið: fjöldi Evrópuleikja og dagsetningar (framendinn parar við FPL-umferðir)
  const byTeam = {};
  out.forEach(m => {
    [m.home_fpl, m.away_fpl].forEach(id => {
      if (!id) return;
      (byTeam[id] = byTeam[id] || []).push({ comp: m.comp, date: m.date });
    });
  });

  const COMP_LABEL = {
    "uefa.champions":"Meistaradeild", "uefa.europa":"Evrópudeild",
    "uefa.europa.conf":"Sambandsdeild", "uefa.super_cup":"Ofurbikar",
    "eng.fa":"FA Cup", "eng.league_cup":"Ligubikar", "eng.charity":"Community Shield",
    "uefa.champions_qual":"Meistarad. forkeppni", "uefa.europa_qual":"Evrópud. forkeppni",
    "uefa.conf_qual":"Sambandsd. forkeppni",
    "fifa.cwc":"HM félagsliða", CL:"Meistaradeild", EL:"Evrópudeild",
  };
  out.forEach(m => { m.comp_label = COMP_LABEL[m.comp] || m.comp; });
  Object.values(byTeam).forEach(arr => arr.forEach(x => { x.comp_label = COMP_LABEL[x.comp] || x.comp; }));

  await writeJSON("euro_fixtures.json", {
    updated: status.updated, sources_ok: found,
    fixtures: out, by_team: byTeam, participation,
    note: "Evrópu- og bikarleikir enskra liða. by_team lyklað á FPL team id. participation = hvaða keppni lið er í 2026/27 (nothæft þótt leikir séu ódregnir).",
  });
  record("euro_fixtures", true, out.length,
    `${stale} úreltum sleppt · ${found.length ? found.join(",") : "engin heimild svaraði"}`);
}

/* ========== 8. THE ODDS API — bókmakara-CS% (FÆRT ÚR NETLIFY Á CRON) ==========
   Var áður Netlify-function (kostaði credit við hverja opnun appsins).
   Nú: cron sækir 1x/dag, skrifar data/odds.json, appið les frítt frá GitHub.
   Kvóti: markets(2) × regions(1) = 2 kredit/dag = ~60/mán af 500. Óhætt.
   Lykill: process.env.ODDS_API_KEY (GitHub Secret) — ALDREI í kóða.          */
/* poissonCleanSheet · MARKET_CALIB · lambdaFromOver · devig · devig2 ·
   splitGoals · marketGoals · marketDiff eru NÚ Í src/market.js (sjá
   import að ofan). Ekki afrita þau hingað aftur — bakprófið mælir
   markaðsliðinn með sömu skrá.                                         */

/* ---- HVENÆR Á AÐ SÆKJA ODDS? ----
   Daglega = 30 köll x 3 kredit = 90/mán. Óþarfi: lína á þriðjudegi hefur
   ekkert að segja um ákvörðun sem er tekin á föstudegi.
   TVISVAR PER UMFERÐ er betur stillt við ákvörðunarpunkta OG 72% ódýrara:
     1) "skörp" sókn innan 36 klst fyrir frest — línan er sem næst lokalínu
     2) "plönunar" sókn 6-8 dögum fyrir frest — fyrir framtíðar-skipti
   ~8,4 köll/mán x 3 = ~25 kredit af 500.                                  */
async function shouldFetchOdds() {
  let events = [];
  try { events = JSON.parse(await readFile(`${DATA}/events.json`, "utf8")).events; } catch { return { go: true, why: "engin events" }; }
  const next = events.find(e => e.deadline_time && new Date(e.deadline_time) > new Date());
  if (!next) return { go: false, why: "engin umferð framundan" };
  const hrs = (new Date(next.deadline_time) - new Date()) / 3600000;
  const inSharp = hrs > 0 && hrs <= 36;
  const inPlan  = hrs >= 144 && hrs <= 192;      // 6-8 dagar
  if (!inSharp && !inPlan) return { go: false, why: `${Math.round(hrs)} klst í frest GW${next.id} — utan glugga` };
  // ekki sækja tvisvar í sama glugga
  try {
    const prev = JSON.parse(await readFile(`${DATA}/odds.json`, "utf8"));
    const age = (new Date() - new Date(prev.updated)) / 3600000;
    const win = inSharp ? "sharp" : "plan";
    if (prev.window === win && age < 30)
      return { go: false, why: `${win}-gluggi þegar sóttur f. ${Math.round(age)} klst` };
  } catch {}
  return { go: true, why: inSharp ? "sharp" : "plan", window: inSharp ? "sharp" : "plan", gw: next.id };
}

/* ========== API-SPORTS (api-football.com v3) — MEIÐSLI ==========
   FPL-fréttirnar segja "knock — 75%" en ekki HVAÐ er að. /injuries
   gefur TEGUND (Hamstring, Knee, Illness...) og hvaða leik hún tengist.

   FYRIRVARI SEM VERÐUR AÐ PRÓFA EMPÍRÍSKT: frítt þrep er "limited in
   terms of available seasons" — ef season=2026 er læst reynum við
   date-leiðina í staðinn og skráum hráu villuna í status.json svo
   sannleikurinn sjáist eftir fyrstu keyrslu.

   Kvóti: /status er FRÍTT (telst ekki), gagnakallið er 1/dag = 1% af
   100 kalla dagskvótanum.                                            */
const APIS = "https://v3.football.api-sports.io";
/* KVOTA-VORDUR. Fria threpid er 100 koll/dag og REIKNINGURINN VAR UPPSAGDUR
   2.8.2026 ("Status: Suspended" a dashboard). Eg get ekki fullyrt hvad orsakadi
   thad, en tvennt i thessum koda var raunveruleg hætta og er nu lokad:
     (a) rannsakandi kallid var gert i HVERRI hradri keyrslu = 48/dag (lagad
         med geymslu, 7 daga TTL)
     (b) a leikdegi var glugginn opinn i 5 klst og hrada keyrslan gengur a 30
         min fresti, svo SOMU byrjunarlidin voru sott allt ad 10 sinnum:
         60 koll a fjolmennasta GW1-degi, og 110 a 10-leikja midvikudegi
         — YFIR THAKI.
   Threnn vorn: geymsla per leik (sja fetchLineups), og THESSI hardi throskuldur
   sem notar `x-ratelimit-requests-remaining` sem API-id sendir sjalft. Vid
   hangum ekki a eigin talningu — vid hlustum a thjoninn.                  */
const API_MIN_REMAINING = 15;      // hættum thegar sva marg eru eftir
let apiRemaining = null, apiBlocked = null;
async function apiSports(path) {
  if (apiBlocked) return { http: 0, blocked: apiBlocked, errors: { budget: apiBlocked }, response: [] };
  if (apiRemaining != null && apiRemaining <= API_MIN_REMAINING) {
    apiBlocked = `kvoti at throtum (${apiRemaining} eftir) — stodvad adur en threpid loka∂i`;
    console.warn(`API-Sports: ${apiBlocked}`);
    return { http: 0, blocked: apiBlocked, errors: { budget: apiBlocked }, response: [] };
  }
  const r = await fetch(`${APIS}${path}`, {
    headers: { "x-apisports-key": process.env.API_SPORTS_KEY, "User-Agent": UA },
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json();
  const rem = r.headers.get("x-ratelimit-requests-remaining");
  if (rem != null && Number.isFinite(+rem)) apiRemaining = +rem;
  return { http: r.status, remaining: rem, ...j };
}

async function fetchInjuries() {
  // hvaða þrep erum við á? (frítt kall)
  let plan = "?";
  try {
    const st = await apiSports("/status");
    plan = `${st.response?.subscription?.plan} · ${st.response?.requests?.current}/${st.response?.requests?.limit_day} köll í dag`;
    console.log(`API-Sports: ${plan}`);
  } catch (e) { console.warn("API-Sports /status:", e.message); }

  /* EMPÍRÍSKT MÆLT (keyrsla 2026-07-26): season=2026 er LÆST á fría
     þrepinu; date-leiðin virkar villulaust en `date` síar eftir LEIKDEGI
     leiksins sem meiðslin tengjast. Rétta spurningin er því um KOMANDI
     leikdaga — nákvæmlega dagana sem skipta máli fyrir frest-ákvarðanir.
     Við spyrjum um allt að 6 næstu leikdaga (úr fixtures.json) = ≤6 köll
     af 100 dagskvótanum. Season-leiðin er samt reynd fyrst svo uppfærsla
     í borgað þrep virki sjálfkrafa (1 kall í stað 6).                   */
  const errTxt = o => (o.errors && (Array.isArray(o.errors) ? o.errors.join("; ") : JSON.stringify(o.errors))) || "";
  const seasonYear = 2026;
  let d = await apiSports(`/injuries?league=39&season=${seasonYear}`);
  let via = `league+season=${seasonYear}`;
  if (!d.response?.length) {
    if (errTxt(d)) console.warn(`API-Sports injuries (${via}): ${errTxt(d)} — nota leikdaga-leiðina`);
    /* EMPÍRÍSKT MÆLT (keyrsla 2): fría þrepið leyfir aðeins ±1 DAGS
       glugga kringum daginn í dag ("try from <í gær> to <á morgun>").
       Við spyrjum því AÐEINS um leikdaga innan þess glugga — í reynd:
       daglega keyrslan grípur meiðslin fyrir leiki dagsins og morgun-
       dagsins, sem er nákvæmlega glugginn sem skiptir máli við frest.
       Fyrir tímabil er listinn eðlilega tómur (0 köll notuð).          */
    let dates = [];
    try {
      const fixtures = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
      const day = t => t.toISOString().slice(0, 10);
      const win = new Set([-1, 0, 1].map(o => day(new Date(Date.now() + o * 864e5))));
      dates = [...new Set(fixtures
        .filter(f => f.kickoff_time && !f.finished && win.has(f.kickoff_time.slice(0, 10)))
        .sort((a, b) => a.kickoff_time.localeCompare(b.kickoff_time))
        .map(f => f.kickoff_time.slice(0, 10)))];
    } catch {}
    const merged = []; const errs = [];
    for (const dt of dates) {
      const r = await apiSports(`/injuries?league=39&date=${dt}`);
      if (errTxt(r)) errs.push(`${dt}: ${errTxt(r)}`);
      merged.push(...(r.response || []));
      d = r;   // heldur remaining-hausnum af síðasta kalli
    }
    d = { ...d, response: merged };
    via = dates.length ? `leikdagar ${dates.join(", ")} (${dates.length} köll)` : "engir leikdagar innan frí-þreps gluggans (±1 dagur)";
    if (errs.length && !merged.length) {
      await writeJSON("injuries.json", { updated: status.updated, plan, via,
        error: errs.join(" | ").slice(0, 200), players: [], unmatched: [] });
      record("apisports_injuries", false, 0, errs[0].slice(0, 70));
      return;
    }
  }

  // para API-nöfn við FPL-id: normalíserað fullt nafn + "F. Eftirnafn"
  // + web_name, ALLT skorðað við liðið (annars ranganir á algengum nöfnum)
  const tmap = JSON.parse(await readFile(`${DATA}/teams_map.json`, "utf8"));
  const players = JSON.parse(await readFile(`${DATA}/players.json`, "utf8")).players;
  const teamsJs = JSON.parse(await readFile(`${DATA}/teams.json`, "utf8")).teams;
  const norm = x => (x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  // API-liðanafn -> FPL team id (leit í öllum nafna-afbrigðum teams_map)
  const teamIdByNorm = {};
  for (const [id, t] of Object.entries(tmap))
    for (const v of [t.fpl, t.fdcouk, t.clubelo, t.understat, t.short])
      if (v) teamIdByNorm[norm(v)] = +id;
  teamsJs.forEach(t => { teamIdByNorm[norm(t.name)] = t.id; });
  const fplByTeam = {};
  for (const p of players) {
    const keys = new Set([norm(p.web_name), norm(`${p.first_name} ${p.second_name}`),
      norm(p.second_name), norm(`${(p.first_name || "")[0] || ""} ${p.second_name}`)]);
    (fplByTeam[p.team] ??= []).push({ id: p.id, keys });
  }
  const matchFpl = (apiName, teamId) => {
    const n = norm(apiName);
    const last = n.split(" ").pop();
    const cands = fplByTeam[teamId] || [];
    let hit = cands.find(c => c.keys.has(n));
    if (!hit) { const byLast = cands.filter(c => c.keys.has(last)); if (byLast.length === 1) hit = byLast[0]; }
    return hit?.id ?? null;
  };

  const out = [], unmatched = [];
  const seen = new Set();
  for (const it of (d.response || [])) {
    const teamId = teamIdByNorm[norm(it.team?.name)];
    const fplId = teamId ? matchFpl(it.player?.name, teamId) : null;
    const key = `${it.player?.id}|${it.fixture?.id}`;
    if (seen.has(key)) continue; seen.add(key);
    const rec = { name_api: it.player?.name, team_api: it.team?.name,
      type: it.player?.type ?? it.type ?? null,      // "Missing Fixture" / "Questionable"
      reason: it.player?.reason ?? it.reason ?? null, // "Knee Injury", "Illness"...
      fixture_date: it.fixture?.date ?? null };
    if (fplId) out.push({ fpl_id: fplId, ...rec });
    else unmatched.push(`${rec.name_api} (${rec.team_api})`);
  }
  await writeJSON("injuries.json", { updated: status.updated, plan, via,
    note: "Tegund og ástæða meiðsla úr API-Sports /injuries fyrir komandi leikdaga. FPL-status ræður áfram tiltækileika; þetta AUÐGAR hann. Fyrir tímabil (engir leikdagar framundan innan glugga) er listinn eðlilega tómur.",
    players: out, unmatched });
  /* "0 paraðir" er RETT utkoma fyrir timabil, ekki bilun — sja hlid 2 i
     kafla 6e i CLAUDE.md. Merkjum thad svo enginn fjarlaegi tenginguna
     a theim forsendum ad hun se brotin.                                  */
  record("apisports_injuries", true, out.length,
    out.length === 0 && /leikdag/i.test(via)
      ? `${via} — RETT preseason-utkoma, 0 koll notud (fyrsta raunprofun 20.-21. agust)`
      : `${via} · ${out.length} paraðir · ${unmatched.length} óparaðir · ${d.remaining ?? "?"} köll eftir í dag`);
}

async function fetchOdds() {
  const key = process.env.ODDS_API_KEY;
  if (!key) { record("odds", false, 0, "ODDS_API_KEY vantar"); return; }
  const gate = await shouldFetchOdds();
  console.log(`Odds-hlið: ${gate.go ? "SÆKI" : "sleppi"} — ${gate.why}`);
  if (!gate.go) { record("odds", true, 0, `sleppt: ${gate.why}`); return; }

  const url = `https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?apiKey=${key}`
    + `&regions=uk&markets=h2h,totals,spreads&oddsFormat=decimal&dateFormat=iso`;
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  const remaining = r.headers.get("x-requests-remaining");
  const used = r.headers.get("x-requests-used");
  console.log(`Odds API: eftir=${remaining} notað=${used}`);
  if (!r.ok) { record("odds", false, 0, `HTTP ${r.status}`); return; }
  const raw = await r.json();

  // Nafnavörpun Odds API -> FPL short_name (normaliserað)
  const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const byNorm = {};
  for (const [id, t] of Object.entries(teamsById)) {
    byNorm[norm(t.name)] = t.short_name;
    byNorm[norm(t.short_name)] = t.short_name;
    const LONG = {
      ARS:["Arsenal"], AVL:["Aston Villa"], BOU:["Bournemouth","AFC Bournemouth"],
      BRE:["Brentford"], BHA:["Brighton and Hove Albion","Brighton & Hove Albion","Brighton"],
      CHE:["Chelsea"], COV:["Coventry City","Coventry"], CRY:["Crystal Palace"],
      EVE:["Everton"], FUL:["Fulham"], HUL:["Hull City","Hull"],
      IPS:["Ipswich Town","Ipswich"], LEE:["Leeds United","Leeds"], LIV:["Liverpool"],
      MCI:["Manchester City","Man City"], MUN:["Manchester United","Man Utd","Man United"],
      NEW:["Newcastle United","Newcastle"], NFO:["Nottingham Forest","Nott'm Forest"],
      SUN:["Sunderland"], TOT:["Tottenham Hotspur","Tottenham","Spurs"],
    }[t.short_name] || [];
    LONG.forEach(n => byNorm[norm(n)] = t.short_name);
  }

  const PREFERRED = ["bet365", "williamhill", "betfair_ex_uk", "skybet", "paddypower"];
  const teams = {};
  const unmatched = new Set();
  let games = 0;

  for (const g of (raw || [])) {
    const books = (g.bookmakers || []).filter(b =>
      b.markets?.some(m => m.key === "h2h") && b.markets?.some(m => m.key === "totals"));
    const pick = books.sort((a, b) =>
      (PREFERRED.indexOf(a.key) + 1 || 99) - (PREFERRED.indexOf(b.key) + 1 || 99)).slice(0, 3);
    if (!pick.length) continue;

    let totLine = 0, totOver = 0, totUnder = 0, totN = 0, hO = 0, dO = 0, aO = 0, n = 0;
    let ahPoint = 0, ahN = 0;
    for (const b of pick) {
      const h2h = b.markets.find(m => m.key === "h2h");
      const tot = b.markets.find(m => m.key === "totals");
      if (h2h) {
        const ho = h2h.outcomes.find(o => o.name === g.home_team)?.price;
        const ao = h2h.outcomes.find(o => o.name === g.away_team)?.price;
        const dr = h2h.outcomes.find(o => o.name === "Draw")?.price;
        if (ho && ao && dr) { hO += ho; aO += ao; dO += dr; n++; }
      }
      if (tot) {
        const over = tot.outcomes.find(o => o.name === "Over");
        const under = tot.outcomes.find(o => o.name === "Under");
        if (over?.point && over?.price && under?.price) {
          totLine += over.point; totOver += over.price; totUnder += under.price; totN++;
        }
      }
      // SPREADS = asískt handicap. Punkturinn á heimaliðinu er handicap-ið.
      const spr = b.markets.find(m => m.key === "spreads");
      if (spr) {
        const hs = spr.outcomes.find(o => o.name === g.home_team);
        if (hs?.point != null) { ahPoint += hs.point; ahN++; }
      }
    }
    if (!n || !totN) continue;

    const p = devig(hO / n, dO / n, aO / n);
    // λ úr LÍKUM, ekki línunni sjálfri (línan er viðmið, ekki vænting)
    const line = totLine / totN;
    const pOver = devig2(totOver / totN, totUnder / totN);
    /* SAMEIGINLEGA UMBREYTINGIN (src/market.js) — asískt handicap notað
       þegar það er til (nákvæmara), annars 1X2-skipting. Spreads-punktur
       á heimaliði er +N þegar heimalið FÆR forgjöf.                      */
    const { hxg, axg, lambda, method } = marketGoals({
      pHome: p.home, pAway: p.away, line, pOver,
      ah: ahN ? ahPoint / ahN : null,
    });

    const hs = byNorm[norm(g.home_team)], as = byNorm[norm(g.away_team)];
    if (!hs) unmatched.add(g.home_team);
    if (!as) unmatched.add(g.away_team);
    if (!hs || !as) continue;
    games++;

    // LYKILATRIÐI: við geymum mótherja + kickoff svo framendinn geti staðfest
    // að línan gildi um RÉTTA leikinn (ekki notað á aðra umferð).
    // MARKAÐS-ÞYNGD (marketDiff) er á sama 1-5 kvarða sem framendinn notar.
    teams[hs] = { cs: poissonCleanSheet(axg), xga: +axg.toFixed(2), xg: +hxg.toFixed(2),
      diff: marketDiff(axg), opp: as, home: true, kickoff: g.commence_time,
      method, lambda: +lambda.toFixed(2), books: pick.map(b => b.title) };
    teams[as] = { cs: poissonCleanSheet(hxg), xga: +hxg.toFixed(2), xg: +axg.toFixed(2),
      diff: marketDiff(hxg), opp: hs, home: false, kickoff: g.commence_time,
      method, lambda: +lambda.toFixed(2), books: pick.map(b => b.title) };
  }
  if (unmatched.size) console.warn(`Odds: ópöruð nöfn: ${[...unmatched].join(" | ")}`);

  await writeJSON("odds.json", {
    updated: status.updated, window: gate.window || null, gw: gate.gw || null,
    requests_remaining: remaining ? +remaining : null,
    note: "CS% úr Poisson á væntum mörkum mótherja. 'opp' og 'kickoff' STAÐFESTA að línan gildi um réttan leik.",
    teams,
  });
  record("odds", true, games, `${gate.window} · ${Object.keys(teams).length} lið · ${remaining} kredit eftir`);
}

/* ========== HRAÐUR HAMUR (--fast) ==========
   Keyrt oft (á 30 mín). Sækir AÐEINS bootstrap og skrifar litla skrá með
   fljótandi sviðum: meiðsli, líkur á að spila, fréttir, verð, flutningar.
   Ástæða: FPL uppfærir meiðslafréttir allan daginn eftir fréttamannafundi.
   Full players.json er þung (400KB) — hún fer áfram í daglegu keyrsluna.
   ÞETTA KOSTAR EKKERT: GitHub Actions er frítt fyrir opinber repo.        */
async function fetchFast() {
  const bs = await getJSON(`${FPL}/bootstrap-static/`);
  const els = bs.elements || [];
  const events = bs.events || [];

  // aðeins það sem breytist innan dags
  const volatile = els
    .filter(e => e.status !== "a" || e.cost_change_event !== 0 || (e.news || "").trim())
    .map(e => ({
      id: e.id, status: e.status, news: e.news, news_added: e.news_added,
      chance_this: e.chance_of_playing_this_round,
      chance_next: e.chance_of_playing_next_round,
      now_cost: e.now_cost, cost_change_event: e.cost_change_event,
      transfers_in_event: e.transfers_in_event, transfers_out_event: e.transfers_out_event,
      selected_by_percent: e.selected_by_percent,
    }));

  // verðbreytingar í dag (allir, en aðeins 3 svið — létt)
  const prices = els
    .filter(e => e.cost_change_event !== 0)
    .map(e => ({ id: e.id, now_cost: e.now_cost, chg: e.cost_change_event }));

  const cur = events.find(e => e.is_current);
  const next = events.find(e => e.is_next);

  await writeJSON("news.json", {
    updated: new Date().toISOString(),
    current_gw: cur?.id ?? null, next_gw: next?.id ?? null,
    next_deadline: next?.deadline_time ?? null,
    note: "Fljótandi svið uppfærð á 30 mín. Framendinn leggur þetta OFAN Á players.json.",
    players: volatile, price_changes: prices,
  });

  // fixtures eru léttar og geta breyst (frestun, leiktímar)
  try {
    const fx = await getJSON(`${FPL}/fixtures/`);
    await writeJSON("fixtures.json", fx.map(f => ({
      id:f.id, event:f.event, kickoff_time:f.kickoff_time, finished:f.finished,
      started:f.started, minutes:f.minutes, finished_provisional:f.finished_provisional,
      team_h:f.team_h, team_a:f.team_a, team_h_score:f.team_h_score, team_a_score:f.team_a_score,
      team_h_difficulty:f.team_h_difficulty, team_a_difficulty:f.team_a_difficulty })));
  } catch (e) { console.warn(`fast fixtures: ${e.message}`); }

  /* STADFEST BYRJUNARLID TILHEYRIR HRADA KEYRSLUNNI, EKKI DAGLEGU.
     Thetta var MIN VILLA fyrst: eg tengdi fetchLineups adeins vid daglegu
     keyrsluna, sem gengur kl. 05 UTC. Leikir byrja 12-19 UTC, svo glugginn
     (leikur innan 2 klst) hefdi NANAST ALDREI opnast og eiginleikinn hefdi
     verid daudur kodi sem virtist virka. 30-minutna keyrslan er einmitt su
     sem naer lidunum 40-60 min fyrir leik — sja CLAUDE.md kafla 7.1.
     Utan gluggans kostar thetta 1 kall (rannsokn) eda 0.               */
  if (FLAGS.apisports) {
    try { await fetchLineups(); }
    catch (e) { record("api_lineups", false, 0, e.message); }
  }

  console.log(`HRAÐUR: ${volatile.length} leikmenn m. frétt/vafa/verðbreytingu, ${prices.length} verðbreytingar`);
  record("fast_news", true, volatile.length, `${prices.length} verðbreytingar`);
  await writeJSON("status_fast.json", status);
}

/* ========== 10. AFLEIDD LÖG — engin ný köll, engir kvótar ==========
   Allt hér er reiknað úr gögnum sem eru ÞEGAR sótt. Kostar ekkert.
   Hvert lag í sínu try/catch og telur raðir í status.json.              */

const LONG_TRIP_KM = 300;   // þröskuldur fyrir "langt ferðalag"

// Haversine — fjarlægð milli leikvanga í km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/* ---- 5. FERÐALENGD ----
   Hnitin eru þegar í teams_map.json (sótt fyrir veðrið). Sama borð gefur
   ferðalengd útiliðsins — breyta sem nánast enginn reiknar.              */
async function deriveTravel() {
  const fixtures = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
  const tmap = JSON.parse(await readFile(`${DATA}/teams_map.json`, "utf8"));
  const out = [];
  let missing = 0;
  for (const f of fixtures) {
    const h = tmap[f.team_h], a = tmap[f.team_a];
    if (!h?.lat || !a?.lat) { missing++; continue; }
    const km = haversineKm(a.lat, a.lon, h.lat, h.lon);
    out.push({
      fixture_id: f.id, event: f.event, kickoff_time: f.kickoff_time,
      home_fpl_id: f.team_h, away_fpl_id: f.team_a,
      km, is_long_trip: km > LONG_TRIP_KM,
    });
  }
  if (missing) console.warn(`Ferðalengd: ${missing} leikir án hnita`);
  await writeJSON("travel.json", {
    updated: status.updated, long_trip_km: LONG_TRIP_KM,
    note: "km = haversine milli leikvanga. Gildir um ÚTILIÐIÐ (away_fpl_id).",
    fixtures: out,
  });
  const longs = out.filter(x => x.is_long_trip).length;
  record("travel", true, out.length, `${longs} löng ferðalög (>${LONG_TRIP_KM} km)`);
}

/* ---- 6. UMFERÐAFORM: auðar og tvöfaldar umferðir ----
   Leitt úr fixtures.json. Lið með 0 leiki = auð umferð, 2+ = tvöföld.
   ATH SEM ER OFT MISSKILIN: lið sem fer ÚR bikar snemma fær TRYGGARI
   mínútur, ekki verri — þess vegna cup_exited-sviðið.                    */
async function deriveGameweekShape() {
  const fixtures = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
  const teams = JSON.parse(await readFile(`${DATA}/teams.json`, "utf8")).teams;
  const events = JSON.parse(await readFile(`${DATA}/events.json`, "utf8")).events;
  // bikarleikir (úr euro_fixtures.json ef til) til að meta cup_exited
  let extra = {};
  try {
    const eu = JSON.parse(await readFile(`${DATA}/euro_fixtures.json`, "utf8"));
    extra = eu.by_team || {};
  } catch {}

  const count = {};
  fixtures.forEach(f => {
    if (!f.event) return;
    [f.team_h, f.team_a].forEach(t => {
      count[t] = count[t] || {};
      count[t][f.event] = (count[t][f.event] || 0) + 1;
    });
  });

  const shape = events.map(ev => {
    const playing = [], blanks = [], doubles = [];
    teams.forEach(t => {
      const n = count[t.id]?.[ev.id] || 0;
      if (n === 0) blanks.push(t.id);
      else { playing.push(t.id); if (n >= 2) doubles.push(t.id); }
    });
    return { event: ev.id, teams_playing: playing, blanks, doubles };
  });

  // cup_exited: lið sem hafa ENGA bikar-/Evrópuleiki skráða framvegis.
  // Fyrir tímabil er þetta óþekkt — merkjum null, ekki false (ekki ljúga).
  const anyExtra = Object.keys(extra).length > 0;
  const cupStatus = {};
  teams.forEach(t => {
    const games = extra[t.id] || extra[String(t.id)] || [];
    cupStatus[t.id] = anyExtra ? { extra_games: games.length, cup_exited: games.length === 0 }
                               : { extra_games: 0, cup_exited: null };
  });

  await writeJSON("gameweek_shape.json", {
    updated: status.updated,
    note: "blanks = lið með 0 leiki í umferð, doubles = 2+. cup_exited null = óþekkt (bikarar ódregnir).",
    cup_status: cupStatus, shape,
  });
  const nB = shape.reduce((a, s) => a + s.blanks.length, 0);
  const nD = shape.reduce((a, s) => a + s.doubles.length, 0);
  record("gameweek_shape", true, shape.length, `${nB} auðar, ${nD} tvöfaldar`);
}

/* ---- 1b. HVÍLDARDAGAR ----
   rest_days úr KICKOFF-TÍMA (ekki dagsetningu eingöngu), yfir ALLAR
   keppnir sem við höfum. euro_before/after fyllast þegar Evrópudráttur
   er gerður — þangað til eru þau false, sem er rétt (engir leikir skráðir).

   „<4 DAGA HVÍLD"-FLAGGIÐ VAR TEKIÐ ÚT 29.7.2026 — MÆLT ÓNÝTT.
   Það var talið í status og las eins og rótasjón-hætta. Mæling á 65.557
   leikmanna-umferðum (3 tímabil): eftir <4 daga hvíld spila 27,0% af
   leikmönnum 60+ mínútur, á móti 27,3% annars (10.448 leikir með skammri
   hvíld). Það er EKKERT forspárgildi um mínútur, svo talan mátti ekki
   birtast við hlið raunverulegra hættu-merkja.
   `rest_days` sjálft er GEYMT sem UPPLÝSING — sama regla og ferðalengd
   (kafli 3 í CLAUDE.md): mælt ómarktækt => birt, ekki vegið. */
async function deriveRotation() {
  const fixtures = JSON.parse(await readFile(`${DATA}/fixtures.json`, "utf8"));
  const teams = JSON.parse(await readFile(`${DATA}/teams.json`, "utf8")).teams;
  let extra = {};
  try {
    const eu = JSON.parse(await readFile(`${DATA}/euro_fixtures.json`, "utf8"));
    extra = eu.by_team || {};
  } catch {}

  const out = [];
  for (const t of teams) {
    // allir leikir liðsins: deild + Evrópa/bikar, tímaraðaðir
    const pl = fixtures
      .filter(f => (f.team_h === t.id || f.team_a === t.id) && f.kickoff_time)
      .map(f => ({ when: new Date(f.kickoff_time), event: f.event, comp: "PL" }));
    const ex = (extra[t.id] || extra[String(t.id)] || [])
      .filter(x => x.date)
      .map(x => ({ when: new Date(x.date), event: null, comp: x.comp_label || x.comp }));
    const all = [...pl, ...ex].sort((a, b) => a.when - b.when);

    for (let i = 0; i < all.length; i++) {
      const g = all[i];
      if (g.comp !== "PL" || !g.event) continue;      // aðeins PL-umferðir
      const prev = all[i - 1];
      const next = all[i + 1];
      const dayDiff = (x, y) => Math.round((y - x) / 86400000 * 10) / 10;
      const restDays = prev ? dayDiff(prev.when, g.when) : null;
      const beforeGap = prev && prev.comp !== "PL" ? dayDiff(prev.when, g.when) : null;
      const afterGap = next && next.comp !== "PL" ? dayDiff(g.when, next.when) : null;
      out.push({
        fpl_id: t.id, event: g.event, kickoff_time: g.when.toISOString(),
        rest_days: restDays,
        euro_before: beforeGap != null && beforeGap >= 2 && beforeGap <= 4,
        euro_after: afterGap != null && afterGap >= 2 && afterGap <= 4,
        euro_competition: (beforeGap != null && beforeGap <= 4) ? prev.comp
                        : (afterGap != null && afterGap <= 4) ? next.comp : null,
      });
    }
  }
  const flagged = out.filter(x => x.euro_before || x.euro_after).length;
  await writeJSON("rotation.json", {
    updated: status.updated,
    note: "rest_days = dagar frá SÍÐASTA leik liðsins í hvaða keppni sem er (úr kickoff_time). euro_before/after = Evrópu-/bikarleikur 2-4 dögum fyrir/eftir.",
    /* Mælt 29.7.2026: hvíld hefur ekkert forspárgildi um mínútur (27,0% á
       móti 27,3% spila 60+ eftir <4 daga hvíld, n=10.448). Talningin var
       tekin úr status svo hún lesist ekki sem hætta. Evrópu-nálægð er
       ÓMÆLD og heldur sér. */
    rest_measured: { short_rest_60plus: 0.270, other_60plus: 0.273,
                     samples: 10448, verdict: "engin ahrif — ekki hættumerki" },
    rows: out,
  });
  record("rotation", true, out.length, `${flagged} m. Evrópu-nálægð (hvíld mæld ónýt, ekki flagguð)`);
}

/* ---- 4b. HEPPNISMÆLIR ÚR UNDERSTAT ----
   HHW/AHW voru aldrei til í E0 (staðfest í 9 tímabilum). Understat-skot hafa
   'result'-svið og ShotOnPost er BETRA merki: það er á SKOT, ekki á leik,
   svo við fáum það per LEIKMANN.
   ENUM-gildin eru ÓSTAÐFEST — við loggum öll ólík gildi sem koma.           */
async function deriveLuck() {
  // 1) lesa öll skot sem eru sótt
  const seen = new Set();
  const teamAgg = {}, playerAgg = {};
  let files = 0, shots = 0;
  let dir = [];
  try { dir = (await readdir(`${DATA}/understat/match`)).filter(f => f.endsWith(".json")); } catch {}
  for (const f of dir) {
    let sh;
    try { sh = JSON.parse(await readFile(`${DATA}/understat/match/${f}`, "utf8")); } catch { continue; }
    files++;
    for (const side of ["h", "a"]) {
      const opp = side === "h" ? "a" : "h";
      for (const s of (sh[side] || [])) {
        shots++;
        seen.add(s.result);                       // LOGGA öll ENUM-gildi
        const tName = s.h_a === "h" ? sh.h_team : sh.a_team;  // óstaðfest svið, þolum vöntun
        const key = s.player_id;
        const xg = parseFloat(s.xG || 0);
        const isGoal = s.result === "Goal";
        const isPost = /post|woodwork|bar/i.test(s.result || "");
        const isPen = s.situation === "Penalty";
        const p = playerAgg[key] || (playerAgg[key] = {
          understat_id: key, player: s.player, shots: 0, woodwork: 0,
          goals: 0, xg: 0, npxg: 0, penalties_taken: 0, penalties_scored: 0,
          freekicks_taken: 0, corners: 0,
        });
        p.shots++; p.xg += xg;
        if (!isPen) p.npxg += xg;
        if (isGoal) p.goals++;
        if (isPost) p.woodwork++;
        if (isPen) { p.penalties_taken++; if (isGoal) p.penalties_scored++; }
        if (s.situation === "DirectFreekick") p.freekicks_taken++;
        if (s.situation === "FromCorner") p.corners++;
      }
    }
  }
  Object.values(playerAgg).forEach(p => {
    p.xg = +p.xg.toFixed(2); p.npxg = +p.npxg.toFixed(2);
    p.goals_minus_xg = +(p.goals - p.xg).toFixed(2);
  });

  if (seen.size) console.log(`Understat result-ENUM (STAÐFEST): ${[...seen].sort().join(", ")}`);
  else console.log("Understat: engin skot-gögn enn — heppnismælir bíður leikja");

  // 2) LIÐ-STIG: mörk vs xG úr E0 (heilt) + xGC úr FPL-markverði
  const teams = JSON.parse(await readFile(`${DATA}/teams.json`, "utf8")).teams;
  const tmap = JSON.parse(await readFile(`${DATA}/teams_map.json`, "utf8"));
  const fd2fpl = {};
  Object.entries(tmap).forEach(([id, v]) => { if (v.fdcouk) fd2fpl[v.fdcouk] = Number(id); });
  let e0rows = [];
  try { e0rows = JSON.parse(await readFile(`${DATA}/fdcouk/E0-2526.json`, "utf8")).rows; } catch {}

  const e0 = {};
  for (const r of e0rows) {
    const pairs = [
      [r.HomeTeam, +r.FTHG || 0, +r.FTAG || 0],
      [r.AwayTeam, +r.FTAG || 0, +r.FTHG || 0],
    ];
    for (const [nm, gf, ga] of pairs) {
      const fid = fd2fpl[nm]; if (!fid) continue;
      const d = e0[fid] || (e0[fid] = { matches: 0, gf: 0, ga: 0 });
      d.matches++; d.gf += gf; d.ga += ga;
    }
  }
  // xG/xGC úr FPL (ATH: 19% vantar v. leikmanna sem fóru — merkjum það)
  const players = JSON.parse(await readFile(`${DATA}/players.json`, "utf8")).players;
  const fplAgg = {};
  players.forEach(p => {
    const a = fplAgg[p.team] || (fplAgg[p.team] = { xg: 0, gkMins: 0, xgc: 0 });
    a.xg += parseFloat(p.expected_goals || 0);
    if (p.element_type === 1 && (p.minutes || 0) > a.gkMins) {
      a.gkMins = p.minutes; a.xgc = parseFloat(p.expected_goals_conceded || 0);
    }
  });
  // nýliða-staðgengill
  let pb = {};
  try { pb = JSON.parse(await readFile(`${DATA}/promoted_baseline.json`, "utf8")); } catch {}

  const teamOut = teams.map(t => {
    const d = e0[t.id], f = fplAgg[t.id] || {};
    if (d) {
      return {
        fpl_id: t.id, short: t.short, matches: d.matches,
        goals: d.gf, conceded: d.ga,
        xg: +(f.xg || 0).toFixed(1), xgc: +(f.xgc || 0).toFixed(1),
        goals_minus_xg: f.xg ? +(d.gf - f.xg).toFixed(1) : null,
        conceded_minus_xgc: f.xgc ? +(d.ga - f.xgc).toFixed(1) : null,
        woodwork_for: null, woodwork_against: null,   // fyllist með skot-gögnum
        source: "e0+fpl",
        xg_incomplete: true,   // FPL-summa vantar leikmenn sem fóru úr deildinni
      };
    }
    // nýliðar án PL-sögu: B-deildar-staðgengill. STANGARSKOT ERU EKKI TIL -> null
    const key = t.name.replace(/ (City|Town|United)$/, "");
    const b = pb[key] || pb[t.name];
    return {
      fpl_id: t.id, short: t.short,
      matches: b?.games ?? null,
      goals: b ? Math.round(b.goals_pg * (b.games || 46)) : null,
      conceded: b ? Math.round(b.goals_against_pg * (b.games || 46)) : null,
      xg: null, xgc: null, goals_minus_xg: null, conceded_minus_xgc: null,
      woodwork_for: null, woodwork_against: null,      // EKKI núll — ekki til
      source: b ? "championship_proxy" : "none",
      xg_incomplete: null,
    };
  });

  await writeJSON("luck.json", {
    updated: status.updated,
    result_enum_seen: [...seen].sort(),
    note: "woodwork úr Understat 'ShotOnPost' (per SKOT, svo per leikmaður). " +
          "goals úr E0 (heilt), xg úr FPL-summu sem VANTAR ~19% (leikmenn sem fóru úr deildinni) " +
          "-> xg_incomplete:true. Nýliðar: championship_proxy, woodwork null (EKKI núll).",
    teams: teamOut,
    players: Object.values(playerAgg),
  });
  record("luck", true, teamOut.length,
    `${Object.keys(playerAgg).length} leikmenn · ${shots} skot úr ${files} leikjum · ENUM: ${seen.size || "engin"}`);
}

/* ---- 3b. LIÐ-FORM ÚR E0 — HEILT, engin vöntun ----
   FPL-summur vantar ~19% (leikmenn sem fóru úr deildinni eru fjarlægðir úr
   bootstrap). E0 hefur alla 380 leiki, svo lið-mælikvarðar héðan eru heilir.
   Framendinn á að nota ÞETTA fyrir lið-styrk, og FPL fyrir leikmanna-tölur.  */
async function deriveTeamForm() {
  const teams = JSON.parse(await readFile(`${DATA}/teams.json`, "utf8")).teams;
  const tmap = JSON.parse(await readFile(`${DATA}/teams_map.json`, "utf8"));
  const fd2fpl = {};
  Object.entries(tmap).forEach(([id, v]) => { if (v.fdcouk) fd2fpl[v.fdcouk] = Number(id); });
  let rows = [], header = [], rowsPrev = [];
  try {
    const j = JSON.parse(await readFile(`${DATA}/fdcouk/E0-2526.json`, "utf8"));
    rows = j.rows; header = j.header;
  } catch { record("team_form", false, 0, "E0-2526 vantar"); return; }
  // FYRRA tímabil líka — MÆLING sýnir að 2-tímabila blöndun bætir miðjumanna-spá
  // um +0,014 í fylgni (45% vog á tímabilið á undan).
  try { rowsPrev = JSON.parse(await readFile(`${DATA}/fdcouk/E0-2425.json`, "utf8")).rows; } catch {}

  // REGLA: prenta raunverulega header-röð, ekki treysta lista
  console.log(`E0-2526 header (${header.length} kolónur): ${header.join(",")}`);

  const agg = {};
  for (const r of rows) {
    const sets = [
      [r.HomeTeam, true,  +r.FTHG||0, +r.FTAG||0, +r.HS||0, +r.AS||0, +r.HST||0, +r.AST||0, +r.HC||0, +r.HF||0, +r.HY||0, +r.HR||0],
      [r.AwayTeam, false, +r.FTAG||0, +r.FTHG||0, +r.AS||0, +r.HS||0, +r.AST||0, +r.HST||0, +r.AC||0, +r.AF||0, +r.AY||0, +r.AR||0],
    ];
    for (const [nm, home, gf, ga, sf, sa, stf, sta, cor, foul, yel, red] of sets) {
      const fid = fd2fpl[nm]; if (!fid) continue;
      const d = agg[fid] || (agg[fid] = { n:0, gf:0, ga:0, sf:0, sa:0, stf:0, sta:0, cor:0, foul:0, yel:0, red:0, cs:0, h:0 });
      d.n++; d.gf+=gf; d.ga+=ga; d.sf+=sf; d.sa+=sa; d.stf+=stf; d.sta+=sta;
      d.cor+=cor; d.foul+=foul; d.yel+=yel; d.red+=red;
      if (ga === 0) d.cs++;
      if (home) d.h++;
    }
  }
  // sama uppsöfnun fyrir fyrra tímabil
  const aggPrev = {};
  for (const r of rowsPrev) {
    const sets = [
      [r.HomeTeam, +r.FTHG||0, +r.FTAG||0, +r.HST||0, +r.AST||0],
      [r.AwayTeam, +r.FTAG||0, +r.FTHG||0, +r.AST||0, +r.HST||0],
    ];
    for (const [nm, gf, ga, stf, sta] of sets) {
      const fid = fd2fpl[nm]; if (!fid) continue;
      const d = aggPrev[fid] || (aggPrev[fid] = { n:0, gf:0, ga:0, stf:0, sta:0 });
      d.n++; d.gf+=gf; d.ga+=ga; d.stf+=stf; d.sta+=sta;
    }
  }

  const out = teams.map(t => {
    const d = agg[t.id];
    if (!d) return { fpl_id: t.id, short: t.short, matches: 0, source: "none" };
    const p = aggPrev[t.id];
    const per = v => +(v / d.n).toFixed(2);
    return {
      fpl_id: t.id, short: t.short, matches: d.n, source: "fdcouk_e0",
      goals_pg: per(d.gf), conceded_pg: per(d.ga),
      shots_pg: per(d.sf), shots_against_pg: per(d.sa),
      sot_pg: per(d.stf), sot_against_pg: per(d.sta),
      corners_pg: per(d.cor), fouls_pg: per(d.foul),
      yellows_pg: per(d.yel), reds_pg: +(d.red / d.n).toFixed(3),
      clean_sheet_pct: Math.round(d.cs / d.n * 100),
      conversion: d.sf ? +(d.gf / d.sf).toFixed(3) : null,
      sot_conversion: d.stf ? +(d.gf / d.stf).toFixed(3) : null,
      // fyrra tímabil (fyrir 2-tímabila blöndun í framenda)
      prev: p ? { matches: p.n, goals_pg: +(p.gf/p.n).toFixed(2), conceded_pg: +(p.ga/p.n).toFixed(2),
                  sot_pg: +(p.stf/p.n).toFixed(2), sot_against_pg: +(p.sta/p.n).toFixed(2) } : null,
    };
  });
  await writeJSON("team_form.json", {
    updated: status.updated, season: "2025-26", header_columns: header.length,
    note: "ÚR E0, HEILT (380 leikir). Notið þetta fyrir LIÐ-styrk — FPL-summur " +
          "vantar ~19% því leikmenn sem fóru úr deildinni eru fjarlægðir úr bootstrap.",
    teams: out,
  });
  const withData = out.filter(x => x.matches > 0).length;
  record("team_form", true, withData, `${out.length - withData} lið án PL-sögu (nýliðar)`);
}

/* ---- 7. RÚLLANDI EIGINLEIKAR — fyrir fittaða stigalíkanið ----
   Reiknað UMFERÐ FYRIR UMFERÐ úr live-gögnunum, ekki úr uppsöfnuðum
   minutes-sviðinu í players.json.
   MÆLT ÚT-AF-ÚRTAKI á 2025/26 (19.448 sýni): mins5 er RÍKJANDI þáttur
   (stöðluð áhrif +4,6 til +5,1 stig/5 umferðir). FDR mælist ~0.            */
async function deriveFormFeatures() {
  const events = JSON.parse(await readFile(`${DATA}/events.json`, "utf8")).events;
  const finished = events.filter(e => e.finished).map(e => e.id).sort((a, b) => a - b);
  if (!finished.length) {
    await writeJSON("form_features.json", {
      updated: status.updated, gws_used: 0, mode: "preseason",
      note: "Engar loknar umferðir — fittaða líkanið þarf ~5 umferðir. Framendinn notar fyrir-tímabils-ham.",
      players: [],
    });
    record("form_features", true, 0, "engar loknar umferðir (fyrir tímabil)");
    return;
  }
  // hlaða live-gögnum
  const perGw = {};
  for (const g of finished) {
    try {
      const d = JSON.parse(await readFile(`${DATA}/live/gw${g}.json`, "utf8"));
      perGw[g] = {};
      for (const el of (d.elements || [])) perGw[g][el.id] = el.stats || {};
    } catch {}
  }
  const gws = Object.keys(perGw).map(Number).sort((a, b) => a - b);
  const last5 = gws.slice(-5), last10 = gws.slice(-10);
  const ids = new Set();
  gws.forEach(g => Object.keys(perGw[g]).forEach(id => ids.add(+id)));

  const out = [];
  for (const id of ids) {
    const g5 = last5.map(g => perGw[g][id]).filter(Boolean);
    const g10 = last10.map(g => perGw[g][id]).filter(Boolean);
    if (!g5.length) continue;
    const mins5 = g5.reduce((a, s) => a + (s.minutes || 0), 0) / g5.length;
    const pts5  = g5.reduce((a, s) => a + (s.total_points || 0), 0) / g5.length;
    const starts5 = g5.reduce((a, s) => a + (s.starts || 0), 0) / g5.length;
    const tm = g10.reduce((a, s) => a + (s.minutes || 0), 0);
    const xgi90 = tm ? g10.reduce((a, s) => a + parseFloat(s.expected_goal_involvements || 0), 0) * 90 / tm : 0;
    const bps90 = tm ? g10.reduce((a, s) => a + (s.bps || 0), 0) * 90 / tm : 0;
    const dc90  = tm ? g10.reduce((a, s) => a + parseFloat(s.defensive_contribution || 0), 0) * 90 / tm : 0;
    const over60 = g5.filter(s => (s.minutes || 0) >= 60).length / g5.length;
    out.push({
      fpl_id: id,
      mins5: +mins5.toFixed(1), pts5: +pts5.toFixed(2),
      start_rate: +starts5.toFixed(2), over60_rate: +over60.toFixed(2),
      xgi90: +xgi90.toFixed(3), bps90: +bps90.toFixed(2), dc90: +dc90.toFixed(2),
      samples: g5.length, minutes_window: tm,
    });
  }
  await writeJSON("form_features.json", {
    updated: status.updated, gws_used: gws.length,
    window_5: last5, window_10: last10,
    mode: gws.length >= 5 ? "fitted" : "warmup",
    note: "Rúllandi eiginleikar úr live-gögnum, umferð fyrir umferð. " +
          "mins5 er ríkjandi þáttur skv. mælingu út-af-úrtaki (2025/26, 19.448 sýni). " +
          "mode:'warmup' þýðir undir 5 umferðir — framendinn á að lækka confidence.",
    players: out,
  });
  record("form_features", true, out.length, `${gws.length} umferðir · mode=${gws.length >= 5 ? "fitted" : "warmup"}`);
}

/* ========== 12. UMFERDARSKYRSLA — data/last_gw.json ==========
   Ein SJALFSTAED skra fyrir flipann "Umferdin": sidasta LOKNA umferd,
   leikmenn + leikir + lida-tolur, alt uppleyst i nofn og stutt-kodun.

   AF HVERJU SJALFSTAED (ekki bara vísun i live/gw{n}.json): FPL endurnytir
   element-id milli timabila. Skyrsla fyrir 2025/26 sem vaeri pörud vid
   players.json 2026/27 eftir id myndi birta VITLAUS NOFN. Skrain berur
   thvi sin eigin nofn, stodur og lid.

   TVAER LEIDIR, sama utkomu-logun:
     (a) I TIMABILI — data/live/gw{n}.json (FPL) + fixtures.json + E0-2627.
     (b) FYRIR TIMABIL — engin lokin umferd i 2026/27 til. Tha er sidasta
         lokna umferdin GW38 2025/26. Hun kemur ur vaastav-speglun FPL-gagna
         (raw.githubusercontent.com — engin Cloudflare, enginn lykill) og
         lida-tolurnar ur E0-2526 sem vid hofum thegar staðbundid.
         MERKT archive:true svo framendinn ljugi ekki um artalid.

   MAELT 27.7.2026: porun speglunar-leikja vid E0-2526 gaf 10/10 i GW38.

   HVAD ER *EKKI* HER: skot-hnit, medalstadsetning, touches i teig,
   big chances, woodwork. Understat faerdi skot-gognin ur HTML-inu
   (leikjasidur skila adeins match_info; league-sidur byte-eins 18.645 b
   skel i 5/5 tilraunum, oll timabil) og speglunin hafdi ALDREI skotstig
   — adeins leikja-samantektir per leikmann — og stodvadist eftir 2024-25.
   FBref skilar 403. Thess vegna er hvergi latid sem svo ad thetta se til. */

const MIRROR = "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data";
const ARCHIVE_SEASON = "2025-26";      // sidasta LOKNA timabilid
const POS_FROM_TYPE = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };

/* E0-leikir -> uppflettitafla a (dagsetning, heimalid, utilid) i fdcouk-nofnum. */
function e0Index(rows) {
  const idx = {};
  for (const m of rows || []) {
    const d = String(m.Date || "").split("/");
    if (d.length !== 3) continue;
    const iso = `${d[2].length === 2 ? "20" + d[2] : d[2]}-${d[1]}-${d[0]}`;
    idx[`${iso}|${m.HomeTeam}|${m.AwayTeam}`] = m;
  }
  return idx;
}
const e0Num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
function e0Stats(m) {
  if (!m) return null;
  return {
    shots_h: e0Num(m.HS), shots_a: e0Num(m.AS),
    sot_h: e0Num(m.HST),  sot_a: e0Num(m.AST),
    corners_h: e0Num(m.HC), corners_a: e0Num(m.AC),
    fouls_h: e0Num(m.HF),  fouls_a: e0Num(m.AF),
    yellow_h: e0Num(m.HY), yellow_a: e0Num(m.AY),
    red_h: e0Num(m.HR),    red_a: e0Num(m.AR),
    ht_h: e0Num(m.HTHG),   ht_a: e0Num(m.HTAG),
    referee: m.Referee || null,
  };
}

async function deriveLastGwReport() {
  const jread = async p => JSON.parse(await readFile(`${DATA}/${p}`, "utf8"));
  let events = [];
  try { events = (await jread("events.json")).events || []; } catch {}
  const finished = events.filter(e => e.finished).map(e => e.id);
  const curGw = finished.length ? Math.max(...finished) : null;

  if (curGw != null) {
    const built = await buildLiveGwReport(curGw);
    if (built) { record("last_gw", true, built.players.length, `GW${curGw} ${built.season} · ur live/gw${curGw}.json`); return; }
  }
  await buildArchiveGwReport();
}

/* ---- (a) I TIMABILI: ur okkar eigin live-skra ---- */
async function buildLiveGwReport(gw) {
  const jread = async p => JSON.parse(await readFile(`${DATA}/${p}`, "utf8"));
  let live, players, fixtures, teams;
  try {
    live     = await jread(`live/gw${gw}.json`);
    players  = (await jread("players.json")).players;
    fixtures = await jread("fixtures.json");
    teams    = (await jread("teams.json")).teams;
  } catch (e) { console.warn(`last_gw: live-leid brast (${e.message}) — fell a safn`); return null; }
  if (!live?.elements?.length) return null;

  const tById = {}; teams.forEach(t => tById[t.id] = t);
  const pById = {}; players.forEach(p => pById[p.id] = p);
  const fxById = {}; fixtures.forEach(f => fxById[f.id] = f);

  let e0 = null;
  try { e0 = e0Index((await jread("fdcouk/E0-2627.json")).rows); } catch {}

  const gwFx = fixtures.filter(f => f.event === gw);
  const outFx = gwFx.map(f => {
    const h = tById[f.team_h], a = tById[f.team_a];
    const key = `${String(f.kickoff_time).slice(0,10)}|${NAMES[h?.short]?.fdcouk}|${NAMES[a?.short]?.fdcouk}`;
    return {
      id: f.id, h: h?.short || null, a: a?.short || null,
      h_score: f.team_h_score, a_score: f.team_a_score,
      kickoff: f.kickoff_time, stats: e0Stats(e0?.[key]),
    };
  });

  const outPl = [];
  for (const el of live.elements) {
    const p = pById[el.id];
    if (!p) continue;
    const st = el.stats || {};
    if (!(st.minutes > 0) && !(st.total_points !== 0)) continue;
    const myFx = gwFx.filter(f => f.team_h === p.team || f.team_a === p.team);
    for (const f of (myFx.length ? myFx : [null])) {
      const home = f ? f.team_h === p.team : null;
      const oppId = f ? (home ? f.team_a : f.team_h) : null;
      outPl.push(normPlayerRow({
        id: p.id, name: p.web_name, pos: POS_FROM_TYPE[p.element_type],
        team: tById[p.team]?.short, opp: oppId ? tById[oppId]?.short : null,
        home, fixture: f?.id ?? null, value: p.now_cost, src: st,
        // tvofold umferd: FPL gefur samtolur, ekki per leik — deilum EKKI,
        // heldur merkjum rodina svo framendinn tvitelji ekki.
        multi: myFx.length > 1,
      }));
    }
  }

  const label = await seasonLabelFromEvents();
  await writeJSON("last_gw.json", {
    updated: status.updated, season: label, gw, archive: false,
    source: "fpl-live", note: "Ur FPL event/{gw}/live/ um pipeline. Lida-tolur (skot, skot a mark) ur football-data.co.uk E0.",
    missing: MISSING_NOTE, fixtures: outFx, players: outPl,
  });
  return { season: label, players: outPl };
}

/* ---- (b) FYRIR TIMABIL: sidasta lokna umferd fyrra timabils ur speglun ---- */
async function buildArchiveGwReport() {
  const seasonLabel = ARCHIVE_SEASON.replace("-", "/20");   // "2025-26" -> "2025/2026"
  const nice = `${ARCHIVE_SEASON.slice(0,4)}/${ARCHIVE_SEASON.slice(5)}`; // "2025/26"

  const { text: tTeams } = await getText(`${MIRROR}/${ARCHIVE_SEASON}/teams.csv`);
  const teamRows = parseCSV(tTeams).rows;
  const shortById = {}, shortByName = {};
  for (const t of teamRows) { shortById[t.id] = t.short_name; shortByName[t.name] = t.short_name; }

  // finna HAESTU umferd sem er til i speglun (skrarnar heita gw1..gw38)
  let gw = null, rows = null;
  for (let g = 38; g >= 1; g--) {
    try {
      const { text } = await getText(`${MIRROR}/${ARCHIVE_SEASON}/gws/gw${g}.csv`);
      const parsed = parseCSV(text).rows.filter(r => r.element);
      if (parsed.length) { gw = g; rows = parsed; break; }
    } catch { /* naesta nidur */ }
  }
  if (!gw) { record("last_gw", false, 0, `engin gw-skra i speglun fyrir ${ARCHIVE_SEASON}`); return; }

  let e0 = null;
  const e0File = `fdcouk/E0-${ARCHIVE_SEASON.slice(2,4)}${ARCHIVE_SEASON.slice(5)}.json`; // E0-2526.json
  try { e0 = e0Index(JSON.parse(await readFile(`${DATA}/${e0File}`, "utf8")).rows); } catch {}

  // leikir endurbyggdir ur leikmanna-rodunum sjalfum (was_home + skor)
  const fxMap = {};
  for (const r of rows) {
    const f = fxMap[r.fixture] || (fxMap[r.fixture] = { id: +r.fixture, h:null, a:null,
      h_score:null, a_score:null, kickoff:r.kickoff_time, stats:null });
    const s = shortByName[r.team] || r.team;
    if (String(r.was_home) === "True") { f.h = s; f.h_score = +r.team_h_score; f.a_score = +r.team_a_score; }
    else f.a = s;
    if (r.kickoff_time) f.kickoff = r.kickoff_time;
  }
  let matched = 0;
  const outFx = Object.values(fxMap).sort((x,y) => String(x.kickoff).localeCompare(String(y.kickoff)));
  for (const f of outFx) {
    const key = `${String(f.kickoff).slice(0,10)}|${NAMES[f.h]?.fdcouk}|${NAMES[f.a]?.fdcouk}`;
    f.stats = e0Stats(e0?.[key]);
    if (f.stats) matched++;
  }

  const outPl = rows.map(r => normPlayerRow({
    id: null,                                   // VILJANDI: id fyrra timabils parast EKKI
    name: r.name, pos: r.position,
    team: shortByName[r.team] || r.team,
    opp: shortById[r.opponent_team] || null,
    home: String(r.was_home) === "True",
    fixture: +r.fixture, value: r.value ? +r.value : null, src: r, multi: false,
  })).filter(p => p.minutes > 0 || p.points !== 0);

  await writeJSON("last_gw.json", {
    updated: status.updated, season: nice, gw, archive: true,
    source: "vaastav-mirror",
    note: `Tímabilið 2026/27 er ekki byrjað — engin lokin umferð til. Þetta er `
        + `SÍÐASTA LOKNA umferðin, GW${gw} ${nice}, úr speglun FPL-gagna á GitHub. `
        + `Liða-tölur (skot, skot á mark, hornspyrnur, brot) úr football-data.co.uk E0.`,
    missing: MISSING_NOTE,
    fixtures: outFx, players: outPl,
  });
  record("last_gw", true, outPl.length,
    `SAFN GW${gw} ${nice} · ${outFx.length} leikir · E0-porun ${matched}/${outFx.length}`);
}

/* Skilabodin um thad sem VANTAR fylgja SKRANNI, ekki bara kodanum — svo
   framendinn geti birt astaeduna i stad thess ad skilja eftir tomt plass. */
const MISSING_NOTE = {
  shot_map: "Skot-hnit (x/y) fást ekki: Understat færði skot-gögnin úr HTML-inu (leikjasíður skila aðeins match_info), speglunin hafði aldrei skotstig og stöðvaðist eftir 2024-25, FBref svarar 403.",
  avg_position: "Meðalstaðsetning á velli er ekki í neinni heimild sem við náum í.",
  touches_in_box: "Touches í teig krefjast Opta-gagna (FBref) sem svara 403.",
  big_chances: "Big chances eru Opta-skilgreining og fást ekki. Understat-nálgunin (xG>0,30 per skot) þarf skotstig sem eru horfin.",
  woodwork: "Woodwork þarf 'result'-svið per skot (ShotOnPost) sem er horfið úr Understat.",
  measured: "2026-07-27",
};

async function seasonLabelFromEvents() {
  // artalid reiknad ur GW1-fresti eins og framendinn gerir
  try {
    const ev = JSON.parse(await readFile(`${DATA}/events.json`, "utf8")).events || [];
    const y = new Date(ev[0]?.deadline_time).getUTCFullYear();
    return Number.isFinite(y) ? `${y}/${String((y + 1) % 100).padStart(2, "0")}` : "";
  } catch { return ""; }
}

/* Ein rod, sama logun ur badum leidum. `src` er hrátt hlut (live stats eda CSV-rod). */
function normPlayerRow({ id, name, pos, team, opp, home, fixture, value, src, multi }) {
  const n = k => { const v = parseFloat(src[k]); return Number.isFinite(v) ? v : null; };
  const i = k => { const v = parseInt(src[k], 10); return Number.isFinite(v) ? v : 0; };
  return {
    id, name, pos, team, opp, home, fixture, multi: !!multi,
    value: value == null ? null : +value,
    minutes: i("minutes"), points: i("total_points"), starts: i("starts"),
    goals: i("goals_scored"), assists: i("assists"),
    cs: i("clean_sheets"), gc: i("goals_conceded"), og: i("own_goals"),
    saves: i("saves"), pens_saved: i("penalties_saved"), pens_missed: i("penalties_missed"),
    yellow: i("yellow_cards"), red: i("red_cards"),
    bonus: i("bonus"), bps: i("bps"),
    xg: n("expected_goals"), xa: n("expected_assists"),
    xgi: n("expected_goal_involvements"), xgc: n("expected_goals_conceded"),
    dc: n("defensive_contribution"), tackles: n("tackles"),
    recoveries: n("recoveries"), cbi: n("clearances_blocks_interceptions"),
    influence: n("influence"), creativity: n("creativity"),
    threat: n("threat"), ict: n("ict_index"),
    xp: n("xP"),
  };
}

/* ========== 13. SKOT-KORT UR ESPN — data/last_gw_shots.json ==========
   ESPN's ooppinbera site-API gefur thad sem VID leitudum ad annars stadar
   og fannst ekki. MAELT 27.7.2026 a ollum 10 leikjum GW38 2025/26:

     commentary[].play  -> HVERT SKOT med:
       fieldPositionX/Y  hnit (0-1)
       type.text         Goal | Goal - Header | Goal - Volley | Goal - Free-kick
                         | Penalty - Scored | Shot On Target | Shot Off Target
                         | Shot Blocked | SHOT HIT WOODWORK | Own Goal
       participants[0]   SKYTTAN — 109/109 fundust i rosters, svo lids-porun
                         gegnum roster er areidanleg (play.team er ALLTAF tomt)
       text              likamshluti ("left footed"/"right footed"/"header") og
                         SVAEDI ("the centre of the box", "outside the box", ...)
     boxscore.teams[].statistics -> possession, pass-nakvaemni, krossar,
       langar sendingar, blokkud skot, tacklingar, rof, hreinsanir, rangstodur
     rosters[].formation + roster[].formationPlace -> byrjunarlids-uppstilling
     rosters[].roster[].stats -> totalShots og shotsOnTarget PER LEIKMANN

   HNITAKERFID — MAELT, EKKI GISKAD: X er fjarlaegd fra marki sem SOTT er ad,
   ekki absolut stada. Prof: i CRY 1-2 ARS liggja OLL thrju morkin a lagu X
   (0,262 / 0,264 / 0,128) thott sitt hvort lidid skoradi. Absolut kerfi
   hefdi sett thau a gagnstaeda enda. Thess vegna er kortid EINN VALLARHELMINGUR.

   KVORDUN — X ER HLUTFALL AF HALFUM VELLI (52,5 m), EKKI AF 105 m.
   Thetta var MAELT gegn svaedis-textanum ESPN sem er ohað hnitunum:
     close_range  (markteigur, 5,5 m)  x <= 0,110   5,5/52,5  = 0,105  PASSAR
     i teig       (vitateigur, 16,5 m) x <= 0,336  16,5/52,5  = 0,314  PASSAR
     utan teigs                        x >= 0,340
   Med 105 m kvarda hefdi teigmarkid att ad vera 0,157 — thad passar EKKI.
   Y er hlutfall af breidd (68 m); box_left 0,241-0,368 / box_centre
   0,370-0,622 / box_right 0,634-0,766 — ostyttandi og i rettri rod.

   Metrar fra marki = x * 52,5. Fyrsta utgafan margfaldadi med 105 og setti
   thvi HVERT SKOT I TVOFALDA FJARLAEGD — mork lentu vid midjulinu.
   ENGIN hnit eru "otraust": x-svidid er 0,040-0,964 = 2-51 m, allt gilt.

   ENGIN xG HER. ESPN gefur hana ekki, svo "big chances" (xG>0,30 per skot)
   er EKKI reiknad. Umferdarskyrslan birtir xG PER LEIKMANN ur FPL i stadinn
   og kallar hana ekki big chances.

   SofaScore var skodad (per-match shotmap MED xG og post-flaggi) en skilar
   HTTP 403 herna og datacenter-IP i Actions faer verri medferd — onothaeft.  */

const ESPN_SOCCER = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1";
/* ESPN-stuttkodun -> FPL short. AÐEINS tvaer vikja (maelt a 20 lidum). */
const ESPN_SHORT = { MAN:"MUN", MNC:"MCI" };
const espnShort = ab => ESPN_SHORT[ab] || ab;

const SHOT_TYPE = {
  "Goal":"goal", "Goal - Header":"goal", "Goal - Volley":"goal",
  "Goal - Free-kick":"goal", "Penalty - Scored":"goal",
  "Shot On Target":"on_target", "Shot Off Target":"off_target",
  "Shot Blocked":"blocked", "Shot Hit Woodwork":"woodwork",
};
const ZONE_RE = [
  [/the centre of the box/i, "box_centre"],
  [/the left side of the box/i, "box_left"],
  [/the right side of the box/i, "box_right"],
  [/very close range/i, "close_range"],
  [/the penalty spot/i, "penalty_spot"],
  [/more than 35 yards/i, "far"],
  [/outside the box/i, "outside"],
];
const IN_BOX = new Set(["box_centre","box_left","box_right","close_range","penalty_spot"]);

function shotZone(text) {
  for (const [re, z] of ZONE_RE) if (re.test(text)) return z;
  return null;
}
/* ---- UPPLOGN UR ESPN-TEXTA ----
   ESPN skrifar: "Attempt saved. X (Team) right footed shot from the centre of
   the box is saved. Assisted by Y with a cross following a corner."
   Thar med fæst thad sem Fable vildi fa ur FBref (403):
     chances created  = hversu oft leikmadur er nefndur sem UPPLEGGJARI
     crosses          = "with a cross"      (adeins their sem SKOPUDU faeri)
     through balls    = "with a through ball"
     set-piece skopun = "following a corner / set piece / direct free kick"
   MAELT a GW38 2025/26: 219 af 290 skotum (76%) nefna upplegg —
   pass 144 · cross 54 · following a corner 33 · through ball 12 ·
   set piece 10 · headed pass 9 · fast break 8 · direct free kick 3.
   ATH: thetta eru krossar sem SKOPUDU SKOT, ekki hrar krossatolur. Fable
   vildi vega hra krossa LAEGRA thvi their "geta verid lelegir" — hér er
   sian innbyggd: krossinn tarf ad hafa leitt til skots.                   */
const ASSIST_RE = /Assisted by ([^.,]+?)(?: with an? ([a-z ]+?))?(?: following ([^.]+?))?\./;
function parseAssist(text) {
  const m = ASSIST_RE.exec(text || "");
  if (!m) return null;
  const how = (m[2] || "pass").trim();
  return {
    by: m[1].trim(),
    how: /through ball/.test(how) ? "through_ball"
       : /cross/.test(how)        ? "cross"
       : /headed/.test(how)       ? "headed_pass"
       : "pass",
    context: m[3] ? m[3].trim().replace(/^a /, "") : null,
  };
}

function shotFoot(text) {
  if (/header/i.test(text)) return "head";
  if (/left footed/i.test(text)) return "left";
  if (/right footed/i.test(text)) return "right";
  return null;
}

async function fetchEspnShots() {
  let base;
  try { base = JSON.parse(await readFile(`${DATA}/last_gw.json`, "utf8")); } catch {
    record("espn_shots", false, 0, "last_gw.json vantar — keyrdu deriveLastGwReport fyrst");
    return;
  }
  const dates = [...new Set((base.fixtures || []).map(f => String(f.kickoff).slice(0,10)).filter(Boolean))];
  if (!dates.length) { record("espn_shots", false, 0, "engar dagsetningar i last_gw.json"); return; }

  /* 1) finna ESPN-event-id fyrir hvern leik gegnum scoreboard voldu daganna */
  const espnByPair = {};
  for (const d of dates) {
    try {
      const sb = await getJSON(`${ESPN_SOCCER}/scoreboard?dates=${d.replace(/-/g,"")}`);
      for (const ev of sb.events || []) {
        const cs = ev.competitions?.[0]?.competitors || [];
        const h = cs.find(c => c.homeAway === "home"), a = cs.find(c => c.homeAway === "away");
        if (!h || !a) continue;
        espnByPair[`${espnShort(h.team.abbreviation)}|${espnShort(a.team.abbreviation)}`] = ev.id;
      }
    } catch (e) { console.warn(`espn scoreboard ${d}: ${e.message}`); }
    await new Promise(r => setTimeout(r, 300));
  }

  /* 2) sumary per leik -> skot, lida-tolur, uppstilling */
  const shots = [], outFx = [], playerAgg = {};
  let excluded = 0, matchedFx = 0;
  for (const f of base.fixtures || []) {
    const eid = espnByPair[`${f.h}|${f.a}`];
    if (!eid) { console.warn(`espn: fann ekki ${f.h} v ${f.a}`); continue; }
    let d;
    try { d = await getJSON(`${ESPN_SOCCER}/summary?event=${eid}`); }
    catch (e) { console.warn(`espn summary ${eid}: ${e.message}`); continue; }
    matchedFx++;

    // nafn -> lid, ur rosters (play.team er alltaf tomt)
    const teamOf = {}, formation = {}, perPlayer = {};
    for (const r of d.rosters || []) {
      const sh = espnShort(r.team?.abbreviation);
      formation[r.homeAway === "home" ? "h" : "a"] = r.formation || null;
      for (const pl of r.roster || []) {
        const nm = pl.athlete?.displayName;
        if (!nm) continue;
        teamOf[nm] = sh;
        const st = {}; (pl.stats || []).forEach(s => st[s.name] = s.displayValue);
        perPlayer[nm] = {
          name: nm, team: sh, pos: pl.position?.abbreviation || null,
          starter: !!pl.starter, formation_place: pl.formationPlace ? +pl.formationPlace : null,
          shots: +st.totalShots || 0, sot: +st.shotsOnTarget || 0,
          fouls: +st.foulsCommitted || 0, fouled: +st.foulsSuffered || 0,
          saves: +st.saves || 0, shots_faced: +st.shotsFaced || 0,
        };
      }
    }

    // lida-tolur
    const tstats = {};
    for (const t of d.boxscore?.teams || []) {
      const o = {}; (t.statistics || []).forEach(s => {
        const v = parseFloat(s.displayValue);
        o[s.name] = Number.isFinite(v) ? v : s.displayValue;
      });
      tstats[espnShort(t.team?.abbreviation) === f.h ? "h" : "a"] = o;
    }

    // SKOT ur commentary — dedup a play-id (commentary tvitekur radir)
    const seen = new Set();
    for (const c of d.commentary || []) {
      const p = c.play;
      if (!p) continue;
      const label = p.type?.text || "";
      const kind = SHOT_TYPE[label];
      const own  = label === "Own Goal";
      if (!kind && !own) continue;
      const pid = p.id ?? `${label}|${c.sequence}`;
      if (seen.has(pid)) continue;
      seen.add(pid);

      const text = String(c.text || p.text || "");
      const shooter = p.participants?.[0]?.athlete?.displayName || null;
      const x = typeof p.fieldPositionX === "number" ? p.fieldPositionX : null;
      const y = typeof p.fieldPositionY === "number" ? p.fieldPositionY : null;
      /* (0,0) er "ekki skrad", ekki hornid — thad er EINA astaedan til ad
         sleppa skoti. Adur var hér lika `x <= 0.5` af thvi ad vid hofdum
         KVARDANN RANGAN (sja KVORDUN i hausnum): vid toldum x vera hlutfall
         af 105 m, svo 19 skot med x>0,5 virtust vera 53-100 m fra marki og
         voru "otraust". Med rettum kvarda (52,5 m) eru thau 27-51 m — allt
         venjuleg langskot, og OLL merkt "outside the box" af ESPN sjalfu.
         Their voru aldrei rusl; kvardinn okkar var rangur.                 */
      const usable = x != null && y != null && !(x === 0 && y === 0);
      if (!usable) excluded++;
      const zone = shotZone(text);

      const asst = parseAssist(text);
      shots.push({
        fixture: f.id, espn_event: eid,
        team: own ? null : (shooter ? teamOf[shooter] || null : null),
        player: shooter, kind: own ? "own_goal" : kind,
        minute: p.clock?.displayValue || null, period: p.period?.number ?? null,
        x, y, usable, zone, in_box: zone ? IN_BOX.has(zone) : null,
        foot: shotFoot(text), text: text || null,
        assist_by: asst?.by ?? null, assist_type: asst?.how ?? null,
        assist_context: asst?.context ?? null,
      });

      /* UPPLEGGJARINN faer skopunar-tolur. Hann er annar leikmadur en
         skyttan, svo hann fer i sama playerAgg gegnum eigid nafn.        */
      if (asst?.by) {
        const c = playerAgg[asst.by] || (playerAgg[asst.by] = {
          name: asst.by, team: teamOf[asst.by] || null,
          shots:0, on_target:0, off_target:0, blocked:0, woodwork:0, goals:0, in_box:0,
          chances_created:0, cross_created:0, through_balls:0, setpiece_created:0 });
        c.chances_created = (c.chances_created || 0) + 1;
        if (asst.how === "cross")        c.cross_created  = (c.cross_created || 0) + 1;
        if (asst.how === "through_ball") c.through_balls  = (c.through_balls || 0) + 1;
        if (asst.context && /corner|set piece|free kick/.test(asst.context))
          c.setpiece_created = (c.setpiece_created || 0) + 1;
      }

      if (shooter && !own) {
        const a = playerAgg[shooter] || (playerAgg[shooter] = {
          name: shooter, team: teamOf[shooter] || null,
          shots:0, on_target:0, off_target:0, blocked:0, woodwork:0, goals:0, in_box:0,
          chances_created:0, cross_created:0, through_balls:0, setpiece_created:0 });
        a.shots++;
        if (kind === "goal") { a.goals++; a.on_target++; }
        else if (kind === "on_target") a.on_target++;
        else if (kind === "off_target") a.off_target++;
        else if (kind === "blocked") a.blocked++;
        else if (kind === "woodwork") a.woodwork++;
        if (zone && IN_BOX.has(zone)) a.in_box++;
      }
    }

    outFx.push({
      fixture: f.id, espn_event: eid, h: f.h, a: f.a,
      h_score: f.h_score, a_score: f.a_score,
      formation_h: formation.h || null, formation_a: formation.a || null,
      team_stats: tstats,
      lineup: Object.values(perPlayer).filter(p => p.starter || p.shots || p.saves),
    });
    await new Promise(r => setTimeout(r, 350));
  }

  await writeJSON("last_gw_shots.json", {
    updated: status.updated, season: base.season, gw: base.gw, archive: !!base.archive,
    source: "espn-site-api",
    note: "Skot med hnitum ur ESPN commentary. X er FJARLAEGD FRA MARKI sem sott er ad "
        + "(maelt: oll mork i CRY-ARS a lagu X thott badir skoruðu) — kortid er EINN vallarhelmingur. "
        + "Woodwork er eigin skot-tegund hja ESPN ('Shot Hit Woodwork'). Svaedi og likamshluti "
        + "eru lesin ur texta ESPN, ekki agiskud.",
    caveats: {
      no_xg: "ESPN gefur ekki xG per skot, svo BIG CHANCES eru ekki reiknud. Umferdarskyrslan birtir xG per leikmann ur FPL i stadinn.",
      excluded: `${excluded} skot voru an hnita (0,0 = oskrad hja ESPN) og eru merkt usable:false.`,
      scale: "x er hlutfall af HALFUM velli: metrar fra marki = x * 52,5. Kvardad gegn svaedis-texta ESPN (markteigur 0,105 / vitateigur 0,314).",
      no_touches: "Touches i teig og medalstadsetning eru ekki i ESPN-fædinu.",
      created: "chances_created / cross_created / through_balls / setpiece_created eru LESIN UR TEXTA ESPN "
             + "('Assisted by X with a cross following a corner') — 219 af 290 skotum (76%) nefna upplegg i GW38. "
             + "Thetta eru krossar/through balls sem SKOPUDU SKOT, ekki hrar tolur.",
    },
    fixtures: outFx, shots, players: Object.values(playerAgg),
  });
  record("espn_shots", true, shots.length,
    `${matchedFx}/${(base.fixtures||[]).length} leikir · ${shots.length} skot · ${excluded} an hnita`);
}

/* ========== 14. FYRRI TIMABIL PER LEIKMANN — data/player_seasons.json ==========
   Spjold leikmanna syna "i ar vs i fyrra vs hitteðfyrra". Til thess tharf
   LOKATOLUR fyrri timabila per leikmann — sem FPL-API-ið birtir EKKI
   (thad man adeins yfirstandandi timabil).

   PORUNARLYKILLINN ER `code`, EKKI `id`. FPL endurnytir element-id milli
   timabila en `code` er fast a leikmanni aevilangt. Maelt 28.7.2026:
   af 563 nuverandi leikmonnum eiga 456 gogn i 2025-26, 348 i 2024-25 og
   277 i 2023-24 (hinir voru ekki i deildinni).

   SAETI ERU REIKNUD HER, ekki i framendanum: 563 leikmenn x ~16 tolur x
   3 timabil er ekki vinna sem a ad gerast i React vid hverja opnun.
   Sætin eru innan TIMABILSINS og adeins medal theirra sem SPILUDU
   (minutur > 0) — annars vaeri "1 af 800" thar sem 300 spiludu aldrei.

   defensive_contribution kom FYRST 2025/26. Fyrir eldri timabil er hun
   EKKI 0 heldur VANTAR — sja field_availability. Framendinn a ad birta
   strik, ekki null-i breytt i nullu.                                     */

const SEASON_DIRS = ["2025-26", "2024-25", "2023-24"];
const seasonLabel = d => `${d.slice(0, 4)}/${d.slice(5)}`;

/* CSV med gaesalappa-studningi. parseCSV (naiv) dugar fyrir E0 en players_raw
   hefur `news` sem inniheldur kommur inni i gaesalöppum. */
function parseCSVQuoted(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  const t = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift() || [];
  return rows.filter(r => r.length > 1)
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

/* Tolur sem fa SAETI. `rev:true` = LAEGRA er betra (xGC). */
const SEASON_STATS = [
  { k: "total_points" }, { k: "minutes" }, { k: "starts" },
  { k: "goals_scored" }, { k: "assists" },
  { k: "expected_goals" }, { k: "expected_goals_per_90" },
  { k: "expected_assists" }, { k: "expected_assists_per_90" },
  { k: "expected_goal_involvements" }, { k: "expected_goal_involvements_per_90" },
  { k: "expected_goals_conceded", rev: true },
  { k: "clean_sheets" }, { k: "goals_conceded", rev: true },
  { k: "saves" }, { k: "bonus" }, { k: "bps" },
  { k: "defensive_contribution" },
  { k: "points_per_90", derived: true }, { k: "dc_per_start", derived: true },
];

/* SVID SEM ERU BARA BORIN AFRAM (engin saeti) — svo SOMU dalkarnir virki i
   leikmannalistanum yfir OLL timabil. Adur virkudu adeins 31 af 65 STAT_DEFS
   a sogulegri rod. Svid sem vantar i eldra timabili verda null (VANTAR),
   EKKI 0 — sja field_availability i skranni.                              */
const SEASON_CARRY = [
  "points_per_game", "form", "ict_index", "influence", "creativity", "threat",
  "selected_by_percent", "yellow_cards", "red_cards", "own_goals",
  "penalties_missed", "penalties_saved", "dreamteam_count",
  "clearances_blocks_interceptions", "tackles", "recoveries",
  "starts_per_90", "saves_per_90", "clean_sheets_per_90",
  "goals_conceded_per_90", "expected_goals_conceded_per_90",
  "defensive_contribution_per_90", "value_season", "value_form",
  "cost_change_start",
];

async function fetchPlayerSeasons() {
  const out = {};                       // code -> { "2025/26": {...} }
  const availability = {};              // svid -> [timabil sem hafa thad]
  const counts = {};
  for (const dir of SEASON_DIRS) {
    const label = seasonLabel(dir);
    let rows;
    try {
      const { text } = await getText(`${MIRROR}/${dir}/players_raw.csv`);
      rows = parseCSVQuoted(text);
    } catch (e) { console.warn(`player_seasons ${dir}: ${e.message}`); continue; }
    if (!rows.length) continue;

    const has = new Set(Object.keys(rows[0]));
    for (const s of SEASON_STATS) {
      if (s.derived || has.has(s.k)) (availability[s.k] ||= []).push(label);
    }
    for (const k of SEASON_CARRY) if (has.has(k)) (availability[k] ||= []).push(label);

    // 1) grunn-rod per leikmann
    const recs = rows.map(r => {
      const n = k => { const v = parseFloat(r[k]); return Number.isFinite(v) ? v : null; };
      const mins = n("minutes") ?? 0, starts = n("starts") ?? 0;
      const rec = {
        code: r.code, id: n("id"), element_type: n("element_type"),
        web_name: r.web_name || `${r.first_name || ""} ${r.second_name || ""}`.trim(),
        now_cost: n("now_cost"),
      };
      for (const s of SEASON_STATS) {
        if (s.derived) continue;
        rec[s.k] = has.has(s.k) ? n(s.k) : null;       // VANTAR != 0
      }
      for (const k of SEASON_CARRY) {
        if (!has.has(k)) { rec[k] = null; continue; }  // VANTAR != 0
        const v = parseFloat(r[k]);
        rec[k] = Number.isFinite(v) ? v : (r[k] === "" || r[k] == null ? null : r[k]);
      }
      rec.points_per_90 = mins > 0 ? +(((n("total_points") ?? 0) / mins) * 90).toFixed(2) : null;
      rec.dc_per_start  = (rec.defensive_contribution != null && starts > 0)
        ? +(rec.defensive_contribution / starts).toFixed(2) : null;
      rec.played = mins > 0;
      return rec;
    });

    // 2) SAETI innan timabilsins, adeins medal theirra sem spiludu
    const pool = recs.filter(r => r.played);
    counts[label] = pool.length;
    for (const s of SEASON_STATS) {
      const vals = pool.filter(r => r[s.k] != null)
        .sort((a, b) => s.rev ? a[s.k] - b[s.k] : b[s.k] - a[s.k]);
      let rank = 0, prev = null;
      vals.forEach((r, i) => {
        if (prev === null || r[s.k] !== prev) rank = i + 1;
        prev = r[s.k];
        (r.rank ||= {})[s.k] = rank;
      });
      // hversu margir eiga tolu i thessari staerd (nefnarinn i "3 af 412")
      const n = vals.length;
      vals.forEach(r => { (r.rank_of ||= {})[s.k] = n; });
    }

    for (const r of recs) {
      if (!r.code) continue;
      (out[r.code] ||= {})[label] = r;
    }
  }

  /* SIA A LEIKMENN SEM ERU I DEILDINNI NUNA.
     Framendinn flettir ALLTAF upp med `code` ur players.json, svo saga
     leikmanns sem er farinn ur deildinni er ONOTHAEF — hun getur ekki
     birst. Maelt: 935 af 1420 (66%) voru horfnir og bnru 1,22 MB af
     2,52 MB. Skrain er sott UR NETI vid hverja opnun, svo thetta er
     baedi minna repo OG hradari hledsla. Pipeline keyrir daglega, svo ef
     leikmadur kemur til baka birtist saga hans aftur naesta dag.        */
  let kept = out, dropped = 0;
  try {
    const cur = JSON.parse(await readFile(`${DATA}/players.json`, "utf8")).players || [];
    const live = new Set(cur.map(p => String(p.code)));
    if (live.size > 100) {
      kept = {};
      for (const [code, v] of Object.entries(out)) {
        if (live.has(String(code))) kept[code] = v; else dropped++;
      }
    }
  } catch (e) { console.warn(`player_seasons: sia brast (${e.message}) — skrifa allt`); }

  const seasons = SEASON_DIRS.map(seasonLabel).filter(l => counts[l]);
  await writeJSON("player_seasons.json", {
    updated: status.updated, seasons, pool_sizes: counts,
    key: "code",
    note: "Lokatolur fyrri timabila per leikmann ur vaastav-speglun FPL-gagna. "
        + "PORAD A `code` (fast a leikmanni), EKKI `id` sem FPL endurnytir milli timabila. "
        + "Saeti eru innan timabils og adeins medal theirra sem spiludu (minutur>0).",
    field_availability: availability,
    missing_note: "defensive_contribution kom fyrst 2025/26. Fyrir eldri timabil er hun null = VANTAR, ekki 0.",
    players: kept,
  });
  record("player_seasons", true, Object.keys(kept).length,
    `${seasons.join(", ")} · ${seasons.map(s => `${s}:${counts[s]}`).join(" ")}`
    + (dropped ? ` · ${dropped} utan deildar sleppt` : ""));
}

/* ========== 15. MO / AO — data/imminent.json ==========
   "Mark ohjakvaemilegt" og "Assist ohjakvaemilegt": hverjir eru ad byggja
   upp faeri en hafa ekki skorad enn. Formulan og MAELINGIN a bak vid hana
   eru i src/stats.js — her er adeins GLUGGINN reiknadur.

   Gluggi = sidustu 4 LOKNU umferdir. I timabili koma thaer ur
   data/live/gw{n}.json; fyrir timabil (engar loknar) er sami
   safn-hattur og i last_gw: sidustu 4 umferdir fyrra timabils ur
   vaastav-speglun, MERKT archive:true.                                    */

const IMM_WINDOW = 4;      // mo/ao — VALIDERAD vid 4 umferdir
const START_WINDOW = 5;    // byrjunar-likur — VALIDERAD vid 5 umferdir
const FETCH_WINDOW = Math.max(IMM_WINDOW, START_WINDOW);

async function deriveImminent() {
  const jread = async p => JSON.parse(await readFile(`${DATA}/${p}`, "utf8"));
  let events = [];
  try { events = (await jread("events.json")).events || []; } catch {}
  const finished = events.filter(e => e.finished).map(e => e.id).sort((a, b) => a - b);

  let rows = [], season, gws, archive;
  if (finished.length >= 1) {
    // ---- i timabili: ur okkar eigin live-skram ----
    gws = finished.slice(-FETCH_WINDOW);
    season = await seasonLabelFromEvents();
    archive = false;
    let players = [];
    try { players = (await jread("players.json")).players; } catch {}
    const pById = {}; players.forEach(p => pById[p.id] = p);
    const acc = {};
    for (const gw of gws) {
      let live;
      try { live = await jread(`live/gw${gw}.json`); } catch { continue; }
      for (const el of live.elements || []) {
        const st = el.stats || {}, p = pById[el.id];
        if (!p) continue;
        const a = acc[el.id] || (acc[el.id] = {
          code: p.code, name: p.web_name, team: p.team, pos: POS_FROM_TYPE[p.element_type],
          now_cost: p.now_cost, window: blankWindow(), series: [] });
        addWindow(a.window, st);
        a.series.push(gwPoint(gw, st));
      }
    }
    rows = Object.values(acc);
  } else {
    // ---- fyrir timabil: safn ur speglun ----
    archive = true;
    const nice = `${ARCHIVE_SEASON.slice(0,4)}/${ARCHIVE_SEASON.slice(5)}`;
    season = nice;
    const { text: tTeams } = await getText(`${MIRROR}/${ARCHIVE_SEASON}/teams.csv`);
    const shortByName = {};
    for (const t of parseCSV(tTeams).rows) shortByName[t.name] = t.short_name;

    // finna haestu tiltaeku umferdina og taka 4 aftur fra henni
    let top = 0;
    for (let g = 38; g >= 1; g--) {
      try { await getText(`${MIRROR}/${ARCHIVE_SEASON}/gws/gw${g}.csv`); top = g; break; } catch {}
    }
    if (!top) { record("imminent", false, 0, "engin gw-skra i speglun"); return; }
    gws = [];
    for (let g = Math.max(1, top - FETCH_WINDOW + 1); g <= top; g++) gws.push(g);

    const acc = {};
    for (const g of gws) {
      let csv;
      try { ({ text: csv } = await getText(`${MIRROR}/${ARCHIVE_SEASON}/gws/gw${g}.csv`)); }
      catch { continue; }
      for (const r of parseCSVQuoted(csv)) {
        if (!r.element) continue;
        const key = r.element;
        const a = acc[key] || (acc[key] = {
          code: null, name: r.name, team: shortByName[r.team] || r.team,
          pos: r.position, now_cost: r.value ? +r.value : null, window: blankWindow(), series: [] });
        addWindow(a.window, r);
        a.series.push(gwPoint(g, r));
      }
    }
    rows = Object.values(acc);
  }

  const num_ = v => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
  /* TVEIR GLUGGAR UR EINNI SOKN.
     mo/ao voru validerud vid 4 umferdir og byrjunar-likur vid 5, svo vid
     saekjum 5 og LEIDUM mo-gluggann ut ur seriunni (sidustu 4 umferdir).
     Ad breyta mo i 5 vaeri ad kasta valideringunni.                       */
  rows.forEach(r => {
    (r.series || []).sort((a, b) => a.gw - b.gw);
    const uniqGws = [...new Set((r.series || []).map(x => x.gw))].sort((a, b) => a - b);
    const moGws = new Set(uniqGws.slice(-IMM_WINDOW));
    const w = blankWindow();
    for (const x of (r.series || [])) {
      if (!moGws.has(x.gw)) continue;
      w.minutes += x.min; w.goals += x.g; w.assists += x.a;
      w.xg += x.xg; w.xa += x.xa;
      w.threat += x.thr; w.creativity += x.cre;
    }
    ["xg","xa","threat","creativity"].forEach(k => { w[k] = +w[k].toFixed(3); });
    w.xgi = r.window.xgi; w.bps = r.window.bps; w.starts = r.window.starts;
    w.gi = w.goals + w.assists;
    r.window = w;
    r.mo_gws = [...moGws].sort((a, b) => a - b);

    /* BYRJUNAR-LIKUR: minutur per umferd yfir ALLAR 5. Tvofold umferd er
       LOGD SAMAN i eina umferd — spurningin er "spilar hann 60+ i naestu
       UMFERD", ekki i naesta leik.                                        */
    const byGw = new Map();
    for (const x of (r.series || [])) byGw.set(x.gw, (byGw.get(x.gw) ?? 0) + x.min);
    const mins = uniqGws.map(g => byGw.get(g) ?? 0);
    r.start_minutes = mins;
    if (mins.length >= 2) {
      const half = Math.max(1, Math.floor(mins.length / 2));
      const late = mins.slice(-half).reduce((a, b) => a + b, 0) / half;
      const early = mins.slice(0, half).reduce((a, b) => a + b, 0) / half;
      r.start_feats = {
        starts5: +(mins.filter(v => v >= 60).length / mins.length).toFixed(3),
        mins5: +(mins.reduce((a, b) => a + b, 0) / mins.length).toFixed(1),
        trend: +(late - early).toFixed(1),
        started_last: mins[mins.length - 1] >= 60 ? 1 : 0,
        value: r.now_cost ?? null,
      };
    }
  });

  await writeJSON("imminent.json", {
    updated: status.updated, season, archive, gws,
    window: IMM_WINDOW, start_window: START_WINDOW, fetched_gws: gws,
    note: "Gluggi = sidustu " + IMM_WINDOW + " loknu umferdir. Studlarnir sjalfir eru reiknadir i "
        + "src/stats.js (moScore/aoScore) svo profin keyri sama kóda og appid.",
    measured: {
      samples: 13273, seasons: 3, gameweeks: 114,
      mo: "Samsettur studull (xGI 0,8 + threat/25 0,3 + oheppni 0,2). Magnlidurinn "
        + "var xG eitt fram ad 29.7.2026; xGI maeldist betri a 4 timabilum "
        + "(lyfting 2,498 a moti 2,379 fyrir mork+assist, 3/4 timabil, engir nyir "
        + "stikar). Ut af urtaki 2,888 "
        + "a moti 2,696 (xG einn) og 2,779 (threat einn) — vinnur i 2/3 timabilum, jafnar i thvi thridja.",
      ao: "BERT creativity/90. Samsettur AO-studull VAR profadur og FELL: 2,179 a moti 2,206 "
        + "fyrir bera creativity, tapadi i 0/3 timabilum. xA-vogin valdist alltaf 0.",
      pool: "Adeins leikmenn med 0-1 mark+assist i glugganum og 180+ minutur.",
      start_prob: "start_feats/start_minutes eru fyrir BYRJUNAR-LIKUR (5 umferdir). "
        + "MAELT a 65.557 synum: nakvaemni 88,0% a moti 88,2% fyrir 'byrjadi sidast' (JAFNT), "
        + "en Brier 0,0888 a moti 0,1176 (-24%) og BEKKJAR-GILDRAN: laegsti tiundarhluti "
        + "fangar 42-49% theirra sem falla a bekk thratt fyrir ad hafa byrjad (lyfting 2,09x). "
        + "Hvild (<4 dagar) hafdi ENGIN ahrif og er thvi EKKI i likaninu.",
    },
    players: rows,
  });
  record("imminent", true, rows.length,
    `${archive ? "SAFN " : ""}${season} GW${gws[0]}-${gws[gws.length-1]}`);
}

/* Ein umferd i rodinni — nog til ad teikna trend an thess ad blasa upp skrana. */
function gwPoint(gw, r) {
  const f = k => { const v = parseFloat(r[k]); return Number.isFinite(v) ? +v.toFixed(2) : 0; };
  return { gw: +gw, min: f("minutes"), xg: f("expected_goals"), xa: f("expected_assists"),
           thr: f("threat"), cre: f("creativity"),
           g: f("goals_scored"), a: f("assists") };
}
function blankWindow() {
  return { minutes:0, goals:0, assists:0, xg:0, xa:0, xgi:0, threat:0, creativity:0, bps:0, starts:0 };
}
function addWindow(w, r) {
  const f = k => { const v = parseFloat(r[k]); return Number.isFinite(v) ? v : 0; };
  w.minutes   += f("minutes");
  w.goals     += f("goals_scored");
  w.assists   += f("assists");
  w.xg        += f("expected_goals");
  w.xa        += f("expected_assists");
  w.xgi       += f("expected_goal_involvements");
  w.threat    += f("threat");
  w.creativity+= f("creativity");
  w.bps       += f("bps");
  w.starts    += f("starts");
  ["xg","xa","xgi","threat","creativity"].forEach(k => { w[k] = +w[k].toFixed(3); });
}

/* ========== MAIN ========== */
async function main() {
  await mkdir(DATA, { recursive: true });

  // --fast: aðeins fljótandi gögn (meiðsli, verð, fixtures). Keyrt á 30 mín.
  if (process.argv.includes("--fast")) {
    try { await fetchFast(); }
    catch (e) { record("fast_news", false, 0, e.message); await writeJSON("status_fast.json", status); process.exit(1); }
    return;
  }

  let events, els;
  try {
    ({ events, els } = await fetchFPL());
  } catch (e) {
    record("fpl_bootstrap", false, 0, e.message);
    await writeJSON("status.json", status);
    console.error("FPL brást — fell keyrslu (allt annað hangir á þessu).");
    process.exit(1);
  }

  try { await computeDefcon(events, els); } catch (e) { record("defcon", false, 0, e.message); }
  try { await computePlayerForm(events, els); } catch (e) { record("player_form", false, 0, e.message); }
  if (FLAGS.apisports) { try { await fetchLineups(); } catch (e) { record("api_lineups", false, 0, e.message); } }
  if (FLAGS.elo)    { try { await fetchElo(); }              catch (e) { record("elo", false, 0, e.message); } }
  if (FLAGS.fdcouk) { try { await fetchFdcouk(); }           catch (e) { record("fdcouk_e0", false, 0, e.message); }
                      try { await fetchHistoricalE0(); }     catch (e) { record("fdcouk_history", false, 0, e.message); }
                      try { await fetchPromotedBaseline(); } catch (e) { record("promoted_baseline", false, 0, e.message); } }
  if (FLAGS.weather){ try { await fetchWeather(); }          catch (e) { record("weather", false, 0, e.message); } }
  if (FLAGS.understat){ try { await fetchUnderstat(); }      catch (e) { record("understat_season", false, 0, e.message); } }
  if (FLAGS.understat_shots){ try { await fetchUnderstatShots(); } catch (e) { record("understat_shots", false, 0, e.message); } }
  if (FLAGS.euro)   { try { await fetchEuro(); }              catch (e) { record("euro_fixtures", false, 0, e.message); } }
  if (FLAGS.odds_key){ try { await fetchOdds(); }              catch (e) { record("odds", false, 0, e.message); } }
  if (FLAGS.apisports){ try { await fetchInjuries(); }          catch (e) { record("apisports_injuries", false, 0, e.message); } }

  // ---- AFLEIDD LÖG (engin ný köll) — keyrð SÍÐAST því þau lesa skrárnar ofan ----
  if (FLAGS.travel)  { try { await deriveTravel(); }           catch (e) { record("travel", false, 0, e.message); } }
  if (FLAGS.derived) { try { await deriveGameweekShape(); }    catch (e) { record("gameweek_shape", false, 0, e.message); }
                       try { await deriveRotation(); }         catch (e) { record("rotation", false, 0, e.message); }
                       try { await deriveTeamForm(); }          catch (e) { record("team_form", false, 0, e.message); }
                       try { await deriveLuck(); }              catch (e) { record("luck", false, 0, e.message); }
                       try { await deriveFormFeatures(); }      catch (e) { record("form_features", false, 0, e.message); }
                       try { await deriveLastGwReport(); }      catch (e) { record("last_gw", false, 0, e.message); }
                       try { await fetchEspnShots(); }          catch (e) { record("espn_shots", false, 0, e.message); }
                       try { await fetchPlayerSeasons(); }      catch (e) { record("player_seasons", false, 0, e.message); }
                       try { await deriveImminent(); }          catch (e) { record("imminent", false, 0, e.message); } }

  await writeJSON("status.json", status);
  console.log("\n=== status.json ===");
  console.log(JSON.stringify(status, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
