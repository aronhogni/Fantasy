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

const UA = "Mozilla/5.0 (compatible; FPL-data-collector/1.0; +github-actions)";
const DATA = "data";
const today = new Date().toISOString().slice(0, 10);

const FLAGS = {
  understat:       (process.env.ENABLE_UNDERSTAT ?? "true")  === "true",
  understat_shots: (process.env.ENABLE_UNDERSTAT_SHOTS ?? "true") === "true",
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
    // ---- per-90 (betri samanburður en árstíðarsummur) ----
    expected_goals_per_90:e.expected_goals_per_90,
    expected_assists_per_90:e.expected_assists_per_90,
    expected_goal_involvements_per_90:e.expected_goal_involvements_per_90,
    expected_goals_conceded_per_90:e.expected_goals_conceded_per_90,
    clean_sheets_per_90:e.clean_sheets_per_90,
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
    note: "hit_rate = threshold_hits/starts. DEF þröskuldur 10 CBIT, MID/FWD 12 CBIRT. defcon_opportunity: vinnuálag varnar (hærra = fleiri CBIT-tækifæri) — AÐSKILINN mælikvarði frá CS%, ekki leggja saman." });
  record("defcon", true, out.length, `${Object.keys(opportunity).length} lið með tækifæris-mat`);
}

/* ========== 4. CLUB ELO — CSV, tvö köll (http + endurtekning v. yfirálags) ========== */
async function eloFetch(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.status === 429 || r.status >= 500) throw new Error(`${r.status} (yfirálag?)`);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      const text = await r.text();
      if (!text || text.length < 20) throw new Error("tómt svar");
      return text;
    } catch (e) {
      lastErr = e;
      console.warn(`ClubElo tilraun ${i + 1}/${tries} brást: ${e.message}`);
      await new Promise(r => setTimeout(r, 2000 * (i + 1))); // 2s, 4s, 6s
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
  // E0 yfirstandandi tímabil (leikjatölur + lokalínur)
  const { text } = await getText("https://www.football-data.co.uk/mmz4281/2627/E0.csv");
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
  const SEASONS = ["1718","1819","1920","2021","2122","2223","2324","2425","2526"];
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
    record("understat_shots", false, 0, "engin datesData — tímabil ekki byrjað?");
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
function poissonCleanSheet(oppExpectedGoals) {
  return Math.round(Math.exp(-oppExpectedGoals) * 100);
}
function impliedProb(dec) { return dec > 0 ? 1 / dec : 0; }
function devig(h, d, a) {
  const raw = [impliedProb(h), impliedProb(d), impliedProb(a)];
  const s = raw.reduce((x, y) => x + y, 0) || 1;
  return { home: raw[0] / s, draw: raw[1] / s, away: raw[2] / s };
}
function splitGoals(total, hWin, aWin) {
  const hShare = Math.min(0.85, Math.max(0.15, 0.5 + (hWin - aWin) * 0.35));
  const home = total * hShare;
  return { home, away: total - home };
}

async function fetchOdds() {
  const key = process.env.ODDS_API_KEY;
  if (!key) { record("odds", false, 0, "ODDS_API_KEY vantar"); return; }

  const url = `https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?apiKey=${key}`
    + `&regions=uk&markets=h2h,totals&oddsFormat=decimal&dateFormat=iso`;
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

    let totLine = 0, totN = 0, hO = 0, dO = 0, aO = 0, n = 0;
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
        if (over?.point) { totLine += over.point; totN++; }
      }
    }
    if (!n || !totN) continue;

    const p = devig(hO / n, dO / n, aO / n);
    const expTotal = totLine / totN + 0.2;
    const { home: hxg, away: axg } = splitGoals(expTotal, p.home, p.away);

    const hs = byNorm[norm(g.home_team)], as = byNorm[norm(g.away_team)];
    if (!hs) unmatched.add(g.home_team);
    if (!as) unmatched.add(g.away_team);
    if (!hs || !as) continue;
    games++;

    // LYKILATRIÐI: við geymum mótherja + kickoff svo framendinn geti staðfest
    // að línan gildi um RÉTTA leikinn (ekki notað á aðra umferð).
    teams[hs] = { cs: poissonCleanSheet(axg), xga: +axg.toFixed(1), xg: +hxg.toFixed(1),
      opp: as, home: true, kickoff: g.commence_time, books: pick.map(b => b.title) };
    teams[as] = { cs: poissonCleanSheet(hxg), xga: +hxg.toFixed(1), xg: +axg.toFixed(1),
      opp: hs, home: false, kickoff: g.commence_time, books: pick.map(b => b.title) };
  }
  if (unmatched.size) console.warn(`Odds: ópöruð nöfn: ${[...unmatched].join(" | ")}`);

  await writeJSON("odds.json", {
    updated: status.updated, requests_remaining: remaining ? +remaining : null,
    note: "CS% úr Poisson á væntum mörkum mótherja. 'opp' og 'kickoff' STAÐFESTA að línan gildi um réttan leik.",
    teams,
  });
  record("odds", true, games, `${Object.keys(teams).length} lið · ${remaining} kredit eftir`);
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
   er gerður — þangað til eru þau false, sem er rétt (engir leikir skráðir). */
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
  const short = out.filter(x => x.rest_days != null && x.rest_days < 4).length;
  await writeJSON("rotation.json", {
    updated: status.updated,
    note: "rest_days = dagar frá SÍÐASTA leik liðsins í hvaða keppni sem er (úr kickoff_time). euro_before/after = Evrópu-/bikarleikur 2-4 dögum fyrir/eftir.",
    rows: out,
  });
  record("rotation", true, out.length, `${short} m. <4 daga hvíld, ${flagged} m. Evrópu-nálægð`);
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
  if (FLAGS.elo)    { try { await fetchElo(); }              catch (e) { record("elo", false, 0, e.message); } }
  if (FLAGS.fdcouk) { try { await fetchFdcouk(); }           catch (e) { record("fdcouk_e0", false, 0, e.message); }
                      try { await fetchHistoricalE0(); }     catch (e) { record("fdcouk_history", false, 0, e.message); }
                      try { await fetchPromotedBaseline(); } catch (e) { record("promoted_baseline", false, 0, e.message); } }
  if (FLAGS.weather){ try { await fetchWeather(); }          catch (e) { record("weather", false, 0, e.message); } }
  if (FLAGS.understat){ try { await fetchUnderstat(); }      catch (e) { record("understat_season", false, 0, e.message); } }
  if (FLAGS.understat_shots){ try { await fetchUnderstatShots(); } catch (e) { record("understat_shots", false, 0, e.message); } }
  if (FLAGS.euro)   { try { await fetchEuro(); }              catch (e) { record("euro_fixtures", false, 0, e.message); } }
  if (FLAGS.odds_key){ try { await fetchOdds(); }              catch (e) { record("odds", false, 0, e.message); } }

  // ---- AFLEIDD LÖG (engin ný köll) — keyrð SÍÐAST því þau lesa skrárnar ofan ----
  if (FLAGS.travel)  { try { await deriveTravel(); }           catch (e) { record("travel", false, 0, e.message); } }
  if (FLAGS.derived) { try { await deriveGameweekShape(); }    catch (e) { record("gameweek_shape", false, 0, e.message); }
                       try { await deriveRotation(); }         catch (e) { record("rotation", false, 0, e.message); }
                       try { await deriveTeamForm(); }          catch (e) { record("team_form", false, 0, e.message); }
                       try { await deriveLuck(); }              catch (e) { record("luck", false, 0, e.message); }
                       try { await deriveFormFeatures(); }      catch (e) { record("form_features", false, 0, e.message); } }

  await writeJSON("status.json", status);
  console.log("\n=== status.json ===");
  console.log(JSON.stringify(status, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
