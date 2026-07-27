/* ============================================================
   STATS.JS — hreint gagnalag fyrir UMFERÐARSKYRSLU og STIGATOFLU

   AF HVERJU SER SKRA (sama rok og model.js): hver tala sem birtist i
   flipunum "Umferdin" og "Stigatafla" er reiknud hér, an React, svo
   prófin i tests/stats.test.mjs keyri NAKVAEMLEGA sama kóda og appid.
   Engin formula endurtekin inni i JSX.

   HEIMILDIR — MAELT 27.7.2026, EKKI GISKAD:
     data/last_gw.json       FPL-tolur per leikmann i SIDUSTU LOKNU umferd
       (mork, assist, xG, xA, xGI, xGC, minutur, bonus, bps, vorslur,
       spjold, DefCon, ICT) + leikir + lida-tolur ur football-data.co.uk E0
       (skot, skot a mark, hornspyrnur, brot).
     data/last_gw_shots.json ESPN site-API: HVERT SKOT med hnitum, tegund
       (mark / a mark / framhjá / blokkad / I STONG) skyttu, svaedi og
       likamshluta, auk lida-tolna (possession, sendingar, tacklingar) og
       byrjunarlids-uppstillingar.
     data/players.json       uppsafnad timabil fyrir stigatofluna.

   HVAD VANTAR ENN — og hvers vegna ekkert her latir sem svo:
     xG PER SKOT: ESPN gefur hana ekki, svo "big chances" (xG>0,30 per skot)
       eru EKKI reiknud. Skyrslan birtir xG per LEIKMANN ur FPL i stadinn og
       kallar hana ekki big chances.
     TOUCHES I TEIG og MEDALSTADSETNING: engin heimild sem vid naum i.
       Vid birtum thad sem ER maelt: skot i teig (ur svaedis-texta ESPN) og
       skot-stadsetningar. Uppstillingin (formation) er birt sem UPPSTILLING,
       ekki sem maeld medalstadsetning.
     Sagan: Understat var eina von um skotstig en faerdi skot-gognin ur
       HTML-inu (leikjasidur skila adeins match_info; league-sidur byte-eins
       18.645 b skel i 5/5 tilraunum, oll timabil). vaastav-speglunin hafdi
       aldrei skotstig og stodvadist eftir 2024-25. FBref og SofaScore skila
       403. ESPN svaradi — thess vegna er hun heimildin.
   ============================================================ */

export const num = v => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const per90 = (v, mins) => (!mins || mins <= 0 || v == null ? null : (v / mins) * 90);
const safeDiv = (a, b) => (b == null || b === 0 || a == null ? null : a / b);

/* ============================================================
   1. STAT-SKRAIN — eitt satt um hverja tolu

   Hver posts: key, label (islenskt), get(p) -> tala eða null,
   dec (tugabrot), hi (true = haerra er betra), group, pos (stodur sem
   talan er merkingarbaer fyrir, null = allar), note (birt i tooltip).

   `derived: true` merkir tolu sem VID reiknum ur FPL-svidum, ekki svid
   sem FPL birtir sjalft — svo hun se ekki misskilin sem opinber tala.
   ============================================================ */

export const STAT_GROUPS = [
  { key: "core",    label: "Grunnur" },
  { key: "attack",  label: "Sokn" },
  { key: "expect",  label: "Vaentingar (xG/xA)" },
  { key: "defence", label: "Vorn" },
  { key: "bonus",   label: "Bonus og ICT" },
  { key: "value",   label: "Verd og eignarhald" },
  { key: "disc",    label: "Ogn og refsingar" },
];

export const STAT_DEFS = [
  /* ---- Grunnur ---- */
  { key:"total_points", label:"Stig", group:"core", dec:0, hi:true, get:p=>num(p.total_points) },
  { key:"points_per_game", label:"Stig/leik", group:"core", dec:1, hi:true, get:p=>num(p.points_per_game) },
  { key:"pts_per_90", label:"Stig/90", group:"core", dec:2, hi:true, derived:true,
    note:"Stig deilt a spiladar minutur x 90. Refsar ekki fyrir litla spilun eins og stig/leik.",
    get:p=>per90(num(p.total_points), num(p.minutes)) },
  { key:"minutes", label:"Minutur", group:"core", dec:0, hi:true, get:p=>num(p.minutes) },
  { key:"starts", label:"Byrjunarlid", group:"core", dec:0, hi:true, get:p=>num(p.starts) },
  { key:"form", label:"Form", group:"core", dec:1, hi:true, note:"FPL-form: medalstig sidustu 30 daga.",
    get:p=>num(p.form) },
  { key:"dreamteam_count", label:"Lid vikunnar", group:"core", dec:0, hi:true,
    note:"Hversu oft leikmadurinn hefur komist i FPL-lid vikunnar.", get:p=>num(p.dreamteam_count) },

  /* ---- Sokn ---- */
  { key:"goals_scored", label:"Mork", group:"attack", dec:0, hi:true, get:p=>num(p.goals_scored) },
  { key:"assists", label:"Assist", group:"attack", dec:0, hi:true, get:p=>num(p.assists) },
  { key:"gi", label:"Mork + assist", group:"attack", dec:0, hi:true, derived:true,
    get:p=>(num(p.goals_scored)??0)+(num(p.assists)??0) },
  { key:"gi_per_90", label:"M+A /90", group:"attack", dec:2, hi:true, derived:true,
    get:p=>per90((num(p.goals_scored)??0)+(num(p.assists)??0), num(p.minutes)) },
  { key:"mins_per_gi", label:"Min/framlag", group:"attack", dec:0, hi:false, derived:true,
    note:"Minutur per mark eda assist. Laegra er betra. Tomt ef ekkert framlag.",
    get:p=>{ const gi=(num(p.goals_scored)??0)+(num(p.assists)??0); return gi>0?safeDiv(num(p.minutes),gi):null; } },

  /* ---- Vaentingar ---- */
  { key:"expected_goals", label:"xG", group:"expect", dec:2, hi:true, get:p=>num(p.expected_goals) },
  { key:"expected_assists", label:"xA", group:"expect", dec:2, hi:true, get:p=>num(p.expected_assists) },
  { key:"expected_goal_involvements", label:"xGI", group:"expect", dec:2, hi:true,
    get:p=>num(p.expected_goal_involvements) },
  { key:"expected_goals_per_90", label:"xG/90", group:"expect", dec:2, hi:true, get:p=>num(p.expected_goals_per_90) },
  { key:"expected_assists_per_90", label:"xA/90", group:"expect", dec:2, hi:true, get:p=>num(p.expected_assists_per_90) },
  { key:"expected_goal_involvements_per_90", label:"xGI/90", group:"expect", dec:2, hi:true,
    get:p=>num(p.expected_goal_involvements_per_90) },
  { key:"goals_minus_xg", label:"Mork - xG", group:"expect", dec:2, hi:true, derived:true, signed:true,
    note:"Yfir nulli = skorar meira en faerin gefa (klinisk nyting eda heppni). Undir nulli = kludrar faerum.",
    get:p=>{ const g=num(p.goals_scored), x=num(p.expected_goals); return (g==null||x==null)?null:g-x; } },
  { key:"assists_minus_xa", label:"Assist - xA", group:"expect", dec:2, hi:true, derived:true, signed:true,
    get:p=>{ const a=num(p.assists), x=num(p.expected_assists); return (a==null||x==null)?null:a-x; } },
  { key:"gi_minus_xgi", label:"Framlog - xGI", group:"expect", dec:2, hi:true, derived:true, signed:true,
    note:"Heildarmunur a raunverulegum framlogum og vaentum. Sterkasta einstaka merkid um oheppni/heppni.",
    get:p=>{ const gi=(num(p.goals_scored)??0)+(num(p.assists)??0), x=num(p.expected_goal_involvements);
             return x==null?null:gi-x; } },

  /* ---- Vorn ---- */
  { key:"clean_sheets", label:"Hreint blad", group:"defence", dec:0, hi:true, pos:[1,2,3], get:p=>num(p.clean_sheets) },
  { key:"cs_pct", label:"Hreint blad %", group:"defence", dec:0, hi:true, pos:[1,2,3], derived:true, pct:true,
    note:"Hreint blad deilt a byrjunarlids-leiki.",
    get:p=>{ const r=safeDiv(num(p.clean_sheets), num(p.starts)); return r==null?null:r*100; } },
  { key:"goals_conceded", label:"Mork a sig", group:"defence", dec:0, hi:false, pos:[1,2,3], get:p=>num(p.goals_conceded) },
  { key:"expected_goals_conceded", label:"xGC", group:"defence", dec:2, hi:false, pos:[1,2,3],
    get:p=>num(p.expected_goals_conceded) },
  { key:"gc_minus_xgc", label:"Mork a sig - xGC", group:"defence", dec:2, hi:false, pos:[1,2,3], derived:true, signed:true,
    note:"Undir nulli = vornin (eda markvordurinn) heldur betur en faerin gefa.",
    get:p=>{ const g=num(p.goals_conceded), x=num(p.expected_goals_conceded); return (g==null||x==null)?null:g-x; } },
  { key:"saves", label:"Vorslur", group:"defence", dec:0, hi:true, pos:[1], get:p=>num(p.saves) },
  { key:"saves_per_90", label:"Vorslur/90", group:"defence", dec:2, hi:true, pos:[1], derived:true,
    get:p=>per90(num(p.saves), num(p.minutes)) },
  { key:"save_pct", label:"Vorsluhlutfall %", group:"defence", dec:0, hi:true, pos:[1], derived:true, pct:true,
    note:"Vorslur / (vorslur + mork a sig). Groft — FPL telur ekki skot a mark per markvord.",
    get:p=>{ const s=num(p.saves), g=num(p.goals_conceded);
             if (s==null||g==null||(s+g)===0) return null; return (s/(s+g))*100; } },
  { key:"penalties_saved", label:"Vitavorslur", group:"defence", dec:0, hi:true, pos:[1], get:p=>num(p.penalties_saved) },
  { key:"defensive_contribution", label:"Varnarframlag (DC)", group:"defence", dec:0, hi:true,
    note:"FPL DefCon-stig. Athugid: DC er VILJANDI utan FFDR — sja kafla 3 i CLAUDE.md.",
    get:p=>num(p.defensive_contribution) },
  { key:"dc_per_90", label:"DC/90", group:"defence", dec:2, hi:true, derived:true,
    get:p=>per90(num(p.defensive_contribution), num(p.minutes)) },
  { key:"clearances_blocks_interceptions", label:"Frakost/blokk/rof", group:"defence", dec:0, hi:true,
    get:p=>num(p.clearances_blocks_interceptions) },
  { key:"tackles", label:"Tacklingar", group:"defence", dec:0, hi:true, get:p=>num(p.tackles) },
  { key:"recoveries", label:"Endurheimtur", group:"defence", dec:0, hi:true, get:p=>num(p.recoveries) },

  /* ---- Bonus og ICT ---- */
  { key:"bonus", label:"Bonus", group:"bonus", dec:0, hi:true, get:p=>num(p.bonus) },
  { key:"bps", label:"BPS", group:"bonus", dec:0, hi:true, get:p=>num(p.bps) },
  { key:"bps_per_90", label:"BPS/90", group:"bonus", dec:1, hi:true, derived:true,
    get:p=>per90(num(p.bps), num(p.minutes)) },
  { key:"ict_index", label:"ICT-vísitala", group:"bonus", dec:1, hi:true, get:p=>num(p.ict_index) },
  { key:"influence", label:"Ahrif", group:"bonus", dec:1, hi:true, get:p=>num(p.influence) },
  { key:"creativity", label:"Skopun", group:"bonus", dec:1, hi:true, get:p=>num(p.creativity) },
  { key:"threat", label:"Haetta", group:"bonus", dec:1, hi:true,
    note:"FPL-maeling a hversu haettulegar stodur leikmadurinn kemst i.", get:p=>num(p.threat) },

  /* ---- Verd og eignarhald ---- */
  { key:"now_cost", label:"Verd", group:"value", dec:1, hi:false, money:true, get:p=>{ const c=num(p.now_cost); return c==null?null:c/10; } },
  { key:"pts_per_million", label:"Stig per milljon", group:"value", dec:1, hi:true, derived:true,
    note:"Heildarstig deilt a nuverandi verd. Klassiska verdmaeta-talan.",
    get:p=>{ const c=num(p.now_cost); return (c==null||c===0)?null:safeDiv(num(p.total_points), c/10); } },
  { key:"selected_by_percent", label:"Eignarhald %", group:"value", dec:1, hi:true, pct:true,
    get:p=>num(p.selected_by_percent) },
  { key:"cost_change_start", label:"Verdbreyting", group:"value", dec:1, hi:true, signed:true, money:true,
    note:"Breyting fra byrjun timabils.",
    get:p=>{ const c=num(p.cost_change_start); return c==null?null:c/10; } },
  { key:"net_transfers_event", label:"Nettoflutningar", group:"value", dec:0, hi:true, signed:true, derived:true,
    note:"Inn minus ut i yfirstandandi umferd.",
    get:p=>{ const i=num(p.transfers_in_event)??0, o=num(p.transfers_out_event)??0; return i-o; } },

  /* ---- Ogn og refsingar ---- */
  { key:"yellow_cards", label:"Gul spjold", group:"disc", dec:0, hi:false, get:p=>num(p.yellow_cards) },
  { key:"red_cards", label:"Raud spjold", group:"disc", dec:0, hi:false, get:p=>num(p.red_cards) },
  { key:"own_goals", label:"Sjalfsmork", group:"disc", dec:0, hi:false, get:p=>num(p.own_goals) },
  { key:"penalties_missed", label:"Kludrud viti", group:"disc", dec:0, hi:false, get:p=>num(p.penalties_missed) },
];

export const STAT_BY_KEY = Object.fromEntries(STAT_DEFS.map(d => [d.key, d]));

/* Snyrtileg birting einnar tolu samkvaemt skra-lysingunni. */
export function fmtStat(def, v) {
  if (v == null || !Number.isFinite(v)) return "—";
  const body = v.toFixed(def.dec ?? 0);
  const sign = def.signed && v > 0 ? "+" : "";
  if (def.money) return `${sign}£${body}`;
  if (def.pct) return `${body}%`;
  return sign + body;
}

/* ============================================================
   2. STIGATAFLA

   minMinutes ver toluna gegn ruslsaeti: einn leikmadur med 12 minutur
   og eitt mark faer annars 7,50 mork/90 og trónir a toppnum. Sjalfgefid
   thak er hlutfall af MESTU spiludu minutum i safninu — svo það virki
   jafnt i GW3 og GW38 an handstillingar.
   ============================================================ */

export function minutesFloor(players, fraction = 0.25) {
  const max = players.reduce((m, p) => Math.max(m, num(p.minutes) ?? 0), 0);
  return Math.round(max * fraction);
}

export function buildLeaderboard({
  players, statKey, pos = "all", minMinutes = 0, limit = 50,
  teamId = "all", search = "", onlyAvailable = false,
}) {
  const def = STAT_BY_KEY[statKey];
  if (!def) return { def: null, rows: [], skipped: 0 };
  const q = (search || "").trim().toLowerCase();
  let skipped = 0;

  const rows = [];
  for (const p of players || []) {
    if (pos !== "all" && p.element_type !== +pos) continue;
    if (teamId !== "all" && p.team !== +teamId) continue;
    if (def.pos && !def.pos.includes(p.element_type)) continue;
    if (onlyAvailable && p.status !== "a") continue;
    if (q) {
      const hay = `${p.web_name} ${p.first_name} ${p.second_name}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    const mins = num(p.minutes) ?? 0;
    const v = def.get(p);
    if (v == null || !Number.isFinite(v)) continue;
    // minutu-thak gildir adeins um hlutfallstolur (/90, %) — heildartolur
    // eins og "mork" eru sjalfkrafa ovarnar gegn litilli spilun.
    const rateLike = /_per_90$|_pct$|^pts_per_90$|^mins_per_gi$/.test(def.key) || def.pct;
    if (rateLike && mins < minMinutes) { skipped++; continue; }
    rows.push({ p, v });
  }

  rows.sort((a, b) => (def.hi ? b.v - a.v : a.v - b.v) ||
                      (num(b.p.total_points) ?? 0) - (num(a.p.total_points) ?? 0));

  // saeti med jafnteflis-medferd (sama tala = sama saeti)
  let rank = 0, prev = null;
  rows.forEach((r, i) => { if (prev === null || r.v !== prev) rank = i + 1; prev = r.v; r.rank = rank; });

  return { def, rows: rows.slice(0, limit), total: rows.length, skipped };
}

/* ============================================================
   3. UMFERDARSKYRSLA

   Inntok eru TVAER SJALFSTAEDAR skrar ur pipeline:
     data/last_gw.json        FPL-tolur per leikmann + leikir + E0 lida-tolur
     data/last_gw_shots.json  ESPN-skot med hnitum + lida-tolur + uppstilling

   BADAR eru sjalfstaedar (bera sin eigin nofn og lid) thvi FPL endurnytir
   element-id milli timabila — safn-skyrsla purd vid players.json a id
   myndi birta vitlaus nofn. Sja hausinn a deriveLastGwReport i fetch.mjs.

   PORUN MILLI SKRANNA er a `fixture` (FPL-fixture-id) fyrir leiki og a
   NAFNI fyrir leikmenn. Nafna-porun er ohja komin: ESPN notar fullt nafn
   ("Mohamed Salah") og FPL web_name ("M.Salah"), svo hun er NORMALISERUD
   og OPARADIR ERU TALDIR (matchStats.unmatched) i stad thess ad horfa.
   ============================================================ */

export const POS_ORDER = { GK:1, DEF:2, MID:3, FWD:4 };

/* Samtala umferdarinnar — thad sem "gerdist" i tolum. */
export function gwTotals(rows) {
  const t = { players:0, goals:0, assists:0, cs:0, saves:0, yellow:0, red:0, og:0,
              pens_saved:0, pens_missed:0, bonus:0, xg:0, xa:0, points:0, minutes:0,
              blanks:0, hauls:0 };
  for (const r of rows || []) {
    t.players++;
    t.goals += r.goals ?? 0;   t.assists += r.assists ?? 0;
    t.cs += r.cs ?? 0;         t.saves += r.saves ?? 0;
    t.yellow += r.yellow ?? 0; t.red += r.red ?? 0;   t.og += r.og ?? 0;
    t.pens_saved += r.pens_saved ?? 0; t.pens_missed += r.pens_missed ?? 0;
    t.bonus += r.bonus ?? 0;
    t.xg += r.xg ?? 0;         t.xa += r.xa ?? 0;
    t.points += r.points ?? 0; t.minutes += r.minutes ?? 0;
    if ((r.minutes ?? 0) >= 60 && (r.points ?? 0) <= 2) t.blanks++;
    if ((r.points ?? 0) >= 10) t.hauls++;
  }
  t.xg = +t.xg.toFixed(2); t.xa = +t.xa.toFixed(2);
  t.avg_points = t.players ? +(t.points / t.players).toFixed(2) : null;
  return t;
}

/* Afleiddar tolur per rod — reiknadar EINU SINNI, notadar allsstadar. */
export function withDerived(rows) {
  return (rows || []).map(r => {
    const gi = (r.goals ?? 0) + (r.assists ?? 0);
    return {
      ...r, gi,
      gi_minus_xgi: r.xgi == null ? null : +(gi - r.xgi).toFixed(2),
      g_minus_xg:   r.xg  == null ? null : +((r.goals ?? 0) - r.xg).toFixed(2),
      a_minus_xa:   r.xa  == null ? null : +((r.assists ?? 0) - r.xa).toFixed(2),
      gc_minus_xgc: (r.xgc == null || r.gc == null) ? null : +((r.gc) - r.xgc).toFixed(2),
    };
  });
}

/* Rodun innan umferdarinnar eftir hvadan svidi sem er. */
export function gwTop(rows, key, n = 10, { hi = true, minMinutes = 0 } = {}) {
  return (rows || [])
    .filter(r => (r.minutes ?? 0) >= minMinutes && r[key] != null && Number.isFinite(r[key]))
    .sort((a, b) => (hi ? b[key] - a[key] : a[key] - b[key]) || (b.points ?? 0) - (a.points ?? 0))
    .slice(0, n);
}

/* Lid vikunnar — besta leyfilega XI ur umferdinni.
   FPL-formasjon: 1 GK, 3-5 VORN, 2-5 MIDJA, 1-3 SOKN, alls 11.
   Lagmorkin eru tryggd FYRST, svo er fyllt gráðugt i thad sem eftir er —
   annars gaeti 11 stigahaestu verid 6 midjumenn og ekkert leyfilegt lid. */
export function bestXi(rows) {
  const MIN = { GK:1, DEF:3, MID:2, FWD:1 }, MAX = { GK:1, DEF:5, MID:5, FWD:3 };
  const byPos = { GK:[], DEF:[], MID:[], FWD:[] };
  for (const r of rows || []) if (byPos[r.pos]) byPos[r.pos].push(r);
  const score = (a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.bps ?? 0) - (a.bps ?? 0);
  Object.values(byPos).forEach(l => l.sort(score));

  const pick = [], count = { GK:0, DEF:0, MID:0, FWD:0 };
  for (const pos of ["GK","DEF","MID","FWD"]) {
    for (let i = 0; i < MIN[pos] && i < byPos[pos].length; i++) { pick.push(byPos[pos][i]); count[pos]++; }
  }
  const rest = [];
  for (const pos of ["GK","DEF","MID","FWD"]) rest.push(...byPos[pos].slice(count[pos]));
  rest.sort(score);
  for (const r of rest) {
    if (pick.length >= 11) break;
    if (count[r.pos] >= MAX[r.pos]) continue;
    pick.push(r); count[r.pos]++;
  }
  pick.sort((a, b) => (POS_ORDER[a.pos] ?? 9) - (POS_ORDER[b.pos] ?? 9) || score(a, b));
  return { xi: pick, count, points: pick.reduce((s, r) => s + (r.points ?? 0), 0) };
}

/* ---- NAFNA-PORUN FPL <-> ESPN ----
   FPL web_name er stytt ("M.Salah", "Gabriel", "Joao Pedro"); ESPN gefur
   fullt nafn. Vid normaliserum (broddstafir af, punktar/bandstrik ut) og
   krefjumst ad LIDID passi lika — annars parast algeng eftirnofn milli lida.
   Reglan sem virkar a flestum: eftirnafn + lid. Oparadir eru TALDIR.       */
export const normName = s => (s || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();

export function matchShotsToPlayers(rows, shotPlayers) {
  const byTeamLast = {};
  for (const sp of shotPlayers || []) {
    const parts = normName(sp.name).split(" ");
    const last = parts[parts.length - 1];
    (byTeamLast[`${sp.team}|${last}`] ||= []).push(sp);
  }
  let matched = 0, unmatched = 0;
  const out = (rows || []).map(r => {
    const parts = normName(r.name).split(" ");
    const last = parts[parts.length - 1];
    const cand = byTeamLast[`${r.team}|${last}`];
    if (cand && cand.length === 1) { matched++; return { ...r, shot: cand[0] }; }
    unmatched++;
    return { ...r, shot: null };
  });
  return { rows: out, matched, unmatched };
}

/* ---- SKOT-KORT ----
   Skilar AÐEINS skotum med nothaefum hnitum. Hin eru talin i `excluded`
   svo birtingin geti sagt fra theim i stad thess ad thegja um thau.       */
export function shotsFor(shots, { fixture = null, team = null, player = null } = {}) {
  const all = (shots || []).filter(s =>
    (fixture == null || s.fixture === fixture) &&
    (team == null || s.team === team) &&
    (player == null || s.player === player));
  return { usable: all.filter(s => s.usable), excluded: all.filter(s => !s.usable).length, all };
}

export const SHOT_KINDS = [
  { key:"goal",       label:"Mark",        color:"#00b96b" },
  { key:"on_target",  label:"Á mark",      color:"#2563eb" },
  { key:"woodwork",   label:"Í stöng/slá", color:"#c98a00" },
  { key:"off_target", label:"Framhjá",     color:"#8b8b95" },
  { key:"blocked",    label:"Blokkað",     color:"#d92d3c" },
  { key:"own_goal",   label:"Sjálfsmark",  color:"#37003c" },
];

export function shotSummary(shots) {
  const s = { total:0, goal:0, on_target:0, off_target:0, blocked:0, woodwork:0, own_goal:0,
              in_box:0, outside:0, left:0, right:0, head:0 };
  for (const x of shots || []) {
    s.total++;
    if (s[x.kind] != null) s[x.kind]++;
    if (x.in_box === true) s.in_box++; else if (x.in_box === false) s.outside++;
    if (x.foot && s[x.foot] != null) s[x.foot]++;
  }
  // "skot a mark" i knattspyrnu-merkingu: mork + varin skot (+ stong ekki med)
  s.on_target_total = s.goal + s.on_target;
  s.accuracy = s.total ? +((s.on_target_total / s.total) * 100).toFixed(0) : null;
  return s;
}

/* Leikirnir i umferdinni — urslit, lida-tolur ur BADUM heimildum, stjarna. */
export function gwFixtureReports({ report, shotsFile }) {
  const rows = withDerived(report?.players || []);
  const shotFxById = {};
  for (const f of shotsFile?.fixtures || []) shotFxById[f.fixture] = f;

  return (report?.fixtures || [])
    .slice()
    .sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)))
    .map(f => {
      const mine = rows.filter(r => r.fixture === f.id);
      const sorted = mine.slice().sort((a, b) =>
        (b.points ?? 0) - (a.points ?? 0) || (b.bps ?? 0) - (a.bps ?? 0));
      const sf = shotFxById[f.id] || null;
      const fxShots = (shotsFile?.shots || []).filter(s => s.fixture === f.id);
      return {
        fx: f, players: sorted, star: sorted[0] || null,
        e0: f.stats || null,                    // skot/skot a mark/horn ur E0
        espn: sf?.team_stats || null,           // possession/sendingar/tacklingar
        formation_h: sf?.formation_h || null, formation_a: sf?.formation_a || null,
        shots: fxShots,
        shots_h: shotSummary(fxShots.filter(s => s.team === f.h)),
        shots_a: shotSummary(fxShots.filter(s => s.team === f.a)),
        xg_h: sumBy(mine.filter(r => r.team === f.h), "xg"),
        xg_a: sumBy(mine.filter(r => r.team === f.a), "xg"),
      };
    });
}
function sumBy(rows, key) {
  let s = null;
  for (const r of rows) if (r[key] != null) s = (s ?? 0) + r[key];
  return s == null ? null : +s.toFixed(2);
}

/* Er umferdin raunverulega lokin? */
export function lastFinishedGw(events) {
  let last = null;
  for (const e of events || []) if (e.finished && (last == null || e.id > last)) last = e.id;
  return last;
}
