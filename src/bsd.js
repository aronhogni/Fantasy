/* ============================================================
   BSD — UPPSOFNUN UR SKOTAKORTI OG LEIKMANNATOLUM (hreint, ekkert React)

   AF HVERJU SER SKRA: thessi logik er notud a ThREMUR stodum —
   `scripts/fetch-bsd.mjs` (lokid timabil, handvirkt), `fetchBsdLive()` i
   `scripts/fetch.mjs` (yfirstandandi timabil, daglega) og profunum.
   Vaeri hun afrituð i pipeline-ið yrdi hun OPROFANLEG thar, nakvaemlega
   sama villa og `market.js` var stofnad til ad laga (CLAUDE.md kafli 1):
   markadsformulan bar 0,80 af vog varnarmanns og var samt oprofud af thvi
   ad hun bjó inni i `fetch.mjs`.

   **EKKI AFRITA ThESSAR FORMULUR TIL BAKA INN I `fetch.mjs`.**

   Fastarnir eru MAELDIR, ekki valdir — sja CLAUDE.md 6t:
     BIG_CHANCE_XG 0,18 · fittad gegn RAUNVERULEGA lids-svidinu
       `big_chances` a 748 lid-leikjum. MAE 0,746 · r 0,774.
       Tillagan 0,35 ur handoffi №5 maelist MAE 1,385 — tvofalt verri.
     IN_BOX_X 17 · fittad gegn `shots_inside_box` a 760 lid-leikjum,
       MAE 0,133. BSD-x er hlutfall af FULLUM velli (105 m) — ANNAR
       kvardi en ESPN (halfur vollur, 31,4), sem gefur MAE 4,079 og er
       thar med utilokadur.
   ============================================================ */

export const BIG_CHANCE_XG = 0.18;
export const IN_BOX_X = 17;

/* SUMMANLEG svid ur /events/{id}/player-stats/.
   DAUD SVID ERU VILJANDI EKKI HER. Maelt 8.8.2026 a 15.189 leikmanna-
   leikjum: `big_chance_created`, `big_chance_missed`,
   `expected_goals_on_target`, `goals_prevented`, `keeper_save_value`,
   oll `*_value_normalized`, ball-carry/progression, `outfielder_block`,
   `error_lead_to_a_shot/goal`, `hit_woodwork`, `high_claims`,
   `last_man_tackle`, `clearance_off_line`, `total_offside` og
   halfvallar-sendingar eru 100% NON-NULL og ALLTAF NULL.
   Svid sem er alltaf 0 LITUR UT EINS OG MAELING en thydir "gognin eru
   ekki til" — gildran sem kafli 3 og 6n fordast.                      */
const SUM_FIELDS = [
  "minutes_played", "goals", "goal_assist", "total_shots", "shots_on_target",
  "key_pass", "total_cross", "accurate_cross", "touches",
  "total_contest", "won_contest", "duel_won", "duel_lost", "aerial_won", "aerial_lost",
  "total_pass", "accurate_pass", "total_long_balls", "accurate_long_balls",
  "dispossessed", "possession_lost", "was_fouled", "fouls",
  "blocked_scoring_attempt", "total_tackle", "won_tackle", "interception",
  "total_clearance", "ball_recovery", "saves", "punches", "goals_conceded",
  "yellow_card", "red_card",
];

/* SKOT-SUNDURLIDUN — maeld 8.8.2026, `sit` og `body` eru 100% fyllt og
   RAUNVERULEGIR flokkar: assisted 47,7% · corner 17,6% · regular 13,1% ·
   fast-break 6,9% · set-piece 5,9% · throw-in-set-piece 5,1% ·
   free-kick 2,6% · penalty 1,0% (medal-xG 0,788 = thekkta vitahlutfallid,
   sjalfstaed stadfesting a xG-likaninu). Skallar 18,7%.                */
const SET_PIECE = new Set(["corner", "set-piece", "throw-in-set-piece", "free-kick"]);
const OPEN_PLAY = new Set(["assisted", "regular", "fast-break"]);

/** Tomur safnari fyrir einn leikmann. */
export function newAcc() {
  const o = {
    apps: 0, team_id: null, teams: new Map(), rating_sum: 0, rating_n: 0,
    shots: 0, xg: 0, big_chances: 0, shots_in_box: 0, shots_out_box: 0,
    sp_shots: 0, sp_xg: 0, op_xg: 0, head_shots: 0, head_xg: 0,
    pen_shots: 0, woodwork: 0,
  };
  for (const k of SUM_FIELDS) o[k] = 0;
  return o;
}

/** Ein rod ur `player_stats` inn i safnara. */
export function addPlayerRow(acc, r) {
  /* LIDID ER ThAD SEM HANN SPILADI FLESTA LEIKI FYRIR, ekki thad sem
     vardst SIDAST unnid ur — "sidasti vinnur" gaf leikmanni sem skipti
     um lid a midju timabili ROSANDI lid milli keyrslna (sja resolveTeam). */
  acc.apps++;
  if (r.team_id != null) acc.teams.set(r.team_id, (acc.teams.get(r.team_id) || 0) + 1);
  for (const k of SUM_FIELDS) if (typeof r[k] === "number") acc[k] += r[k];
  if (typeof r.rating === "number") { acc.rating_sum += r.rating; acc.rating_n++; }
}

/** Eitt skot ur `shotmap` inn i safnara. */
export function addShot(acc, s) {
  acc.shots++;
  const xg = typeof s.xg === "number" ? s.xg : 0;
  if (typeof s.xg === "number") {
    acc.xg += s.xg;
    if (s.xg >= BIG_CHANCE_XG) acc.big_chances++;
  }
  const x = s.pos?.x;
  if (typeof x === "number") (x <= IN_BOX_X ? acc.shots_in_box++ : acc.shots_out_box++);
  if (SET_PIECE.has(s.sit)) { acc.sp_shots++; acc.sp_xg += xg; }
  else if (OPEN_PLAY.has(s.sit)) { acc.op_xg += xg; }
  if (s.sit === "penalty") acc.pen_shots++;
  if (s.body === "head") { acc.head_shots++; acc.head_xg += xg; }
  /* TREVERK — `luck.json` hefur borid woodwork: null sidan Understat do
     (6b) og 6e taldi thad oendurheimtanlegt. BSD skilar thvi sem EIGIN
     utkomu-tegund: 211 skot 2025/26.                                   */
  if (s.type === "post") acc.woodwork++;
}

/** Flest-leikid lid; jafntefli brotnar a laegsta id svo thetta se FAST. */
export function resolveTeam(acc) {
  let best = null, bn = -1;
  for (const [tid, n] of [...acc.teams].sort((a, b) => a[0] - b[0]))
    if (n > bn) { bn = n; best = tid; }
  acc.team_id = best;
  return best;
}

/** Safnari -> birt rod. TOM GILDI ERU null, ALDREI 0 (CLAUDE.md 6i). */
export function finalize(acc, { bsd_id, name, pos, team, fpl_id, code }) {
  const per = v => (acc.apps ? v : null);
  const s = acc.shots;
  return {
    bsd_id, name: name ?? null, pos: pos ?? null, team: team ?? null,
    fpl_id: fpl_id ?? null, code: code ?? null,
    apps: acc.apps,
    minutes: per(acc.minutes_played),
    rating: acc.rating_n ? +(acc.rating_sum / acc.rating_n).toFixed(2) : null,
    goals: per(acc.goals), assists: per(acc.goal_assist),
    shots: s || null,
    xg: s ? +acc.xg.toFixed(3) : null,
    xg_per_shot: s ? +(acc.xg / s).toFixed(4) : null,
    big_chances: s ? acc.big_chances : null,
    shots_in_box: s ? acc.shots_in_box : null,
    shots_out_box: s ? acc.shots_out_box : null,
    sp_shots: s ? acc.sp_shots : null,
    sp_xg: s ? +acc.sp_xg.toFixed(3) : null,
    op_xg: s ? +acc.op_xg.toFixed(3) : null,
    sp_xg_share: acc.xg > 0 ? +(acc.sp_xg / acc.xg).toFixed(3) : null,
    head_shots: s ? acc.head_shots : null,
    head_xg: s ? +acc.head_xg.toFixed(3) : null,
    pen_shots: s ? acc.pen_shots : null,
    woodwork: s ? acc.woodwork : null,
    key_pass: per(acc.key_pass),
    crosses: per(acc.total_cross), crosses_acc: per(acc.accurate_cross),
    touches: per(acc.touches),
    dribbles: per(acc.total_contest), dribbles_won: per(acc.won_contest),
    duels_won: per(acc.duel_won), duels_lost: per(acc.duel_lost),
    aerial_won: per(acc.aerial_won), aerial_lost: per(acc.aerial_lost),
    passes: per(acc.total_pass), passes_acc: per(acc.accurate_pass),
    long_balls: per(acc.total_long_balls), long_balls_acc: per(acc.accurate_long_balls),
    dispossessed: per(acc.dispossessed), possession_lost: per(acc.possession_lost),
    was_fouled: per(acc.was_fouled), fouls: per(acc.fouls),
    blocks: per(acc.blocked_scoring_attempt),
    tackles: per(acc.total_tackle), tackles_won: per(acc.won_tackle),
    interceptions: per(acc.interception), clearances: per(acc.total_clearance),
    recoveries: per(acc.ball_recovery),
    saves: per(acc.saves), punches: per(acc.punches), goals_conceded: per(acc.goals_conceded),
    yellow: per(acc.yellow_card), red: per(acc.red_card),
  };
}

/* ---------- SPAD BYRJUNARLID: SKOT-SAFN ----------
   BSD GEYMIR EKKI SPAR AFTURVIRKT. Maelt 8.8.2026: leikur sem er buinn
   skilar `lineup_status: "confirmed"`, ekki thvi sem spad var adur. Spa
   sem er ekki soft fyrir leik er thvi TOPUD AD EILIFU — og hun er einmitt
   thad sem a ad maela sidar gegn 6h-likaninu.

   ThESS VEGNA ER ThETTA VIDBOT, ALDREI YFIRSKRIFT. Fallid er hreint svo
   su eina regla se profanleg: eldra skot ma ALDREI hverfa.            */
export function mergeLineupSnapshot(prev, { eventId, fixture, kickoff, lineups, status, at }) {
  const out = { ...prev };
  const key = String(eventId);
  const rec = out[key]
    ? { ...out[key], snapshots: [...(out[key].snapshots || [])] }
    : { fixture, kickoff, snapshots: [] };
  const last = rec.snapshots[rec.snapshots.length - 1];
  /* Eitt skot per STODU. `predicted` getur uppfaerst oft an thess ad
     breytast; thegar `confirmed` kemur viljum vid EIGA badar til
     samanburdar, svo stodu-breyting er thad sem kallar a nytt skot.   */
  if (!last || last.status !== status) {
    rec.snapshots.push({ at, status, home: lineups?.home ?? null, away: lineups?.away ?? null });
  }
  out[key] = rec;
  return out;
}

/* ---------- NAFNA-PORUN VID FPL ---------- */
const TRANS = { "ß": "ss", "ı": "i", "ø": "o", "đ": "d", "ð": "d", "þ": "th", "æ": "ae", "œ": "oe", "ł": "l" };
export function normName(s) {
  let t = String(s || "").toLowerCase();
  for (const [a, b] of Object.entries(TRANS)) t = t.split(a).join(b);
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean).join(" ");
}
export function nameTokens(s) { return normName(s).split(" ").filter(w => w.length > 1); }
/** Hlutfall sameiginlegra takna. De-dupe an `Set` (sbr. 6i-hagraedinguna). */
export function nameScore(a, b) {
  const ta = nameTokens(a), tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  let hit = 0;
  for (let i = 0; i < ta.length; i++) {
    if (ta.indexOf(ta[i]) !== i) continue;
    if (tb.includes(ta[i])) hit++;
  }
  return hit / Math.min(new Set(ta).size, new Set(tb).size);
}

export const FPL_POS = { 1: "G", 2: "D", 3: "M", 4: "F" };

/**
 * EITT-A-EITT PORUN, skordud vid LID og stadfest med STODU.
 * `minutesOf(fplId)` er valfrjals onnur visbending — nafnid eitt vixladi
 * Jacob og Alex Murphy (badir NEW) og setti Gabriel Martinelli a Gabriel.
 * Skilar Map: bsdId -> fplPlayer.
 */
export function pairPlayers(cands, { minutesOf } = {}) {
  const scored = [];
  for (const c of cands) {
    for (const fp of c.pool) {
      const full = `${fp.first_name || ""} ${fp.second_name || ""}`;
      const s = Math.max(nameScore(c.name, full), nameScore(c.name, fp.web_name),
                         nameScore(c.short_name, fp.web_name));
      if (s < 0.6) continue;
      if (FPL_POS[fp.element_type] !== c.pos && s < 0.99) continue;
      let score = s;
      if (minutesOf) {
        const fm = minutesOf(fp.id);
        if (fm != null && (c.minutes || fm))
          score += 0.5 * (1 - Math.abs((c.minutes || 0) - fm) / Math.max(c.minutes || 0, fm, 1));
      }
      scored.push([score, c.bsd_id, fp]);
    }
  }
  /* STODUG ROD — jafntefli eru raunveruleg (samnefningar i sama lidi) og
     verda ad brotna a EINHVERJU FOSTU, annars er skrain ekki endurgeranleg. */
  scored.sort((a, b) => (b[0] - a[0]) || (a[1] - b[1]) || (a[2].id - b[2].id));
  const out = new Map(), usedFpl = new Set();
  for (const [, bid, fp] of scored) {
    if (out.has(bid) || usedFpl.has(fp.id)) continue;
    out.set(bid, fp); usedFpl.add(fp.id);
  }
  return out;
}
