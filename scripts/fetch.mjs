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

import { mkdir, writeFile, readFile } from "node:fs/promises";
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
  const ESPN_CODES = discovered.length
    ? [...new Set([...discovered.filter(c => /uefa|^eng\.(fa|league_cup|charity)|fifa\.cwc/i.test(c)), ...CANDIDATES])]
    : CANDIDATES;
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
  let stale = 0;
  for (const m of matches) {
    // HARÐUR FILTER: sleppa öllu sem er í fortíðinni. Heimildir skila stundum
    // síðasta tímabili þegar nýtt er ekki dregið — þau gögn eru verri en engin.
    if (!m.date || m.date.slice(0, 10) < today) { stale++; continue; }
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

/* ========== MAIN ========== */
async function main() {
  await mkdir(DATA, { recursive: true });
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
                      try { await fetchPromotedBaseline(); } catch (e) { record("promoted_baseline", false, 0, e.message); } }
  if (FLAGS.weather){ try { await fetchWeather(); }          catch (e) { record("weather", false, 0, e.message); } }
  if (FLAGS.understat){ try { await fetchUnderstat(); }      catch (e) { record("understat_season", false, 0, e.message); } }
  if (FLAGS.euro)   { try { await fetchEuro(); }              catch (e) { record("euro_fixtures", false, 0, e.message); } }

  await writeJSON("status.json", status);
  console.log("\n=== status.json ===");
  console.log(JSON.stringify(status, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
