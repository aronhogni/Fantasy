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
       KVARDI: x = hlutfall af HALFUM velli, metrar fra marki = x * 52,5.
       Kvardad gegn svaedis-texta ESPN (markteigur 0,105 / vitateigur 0,314);
       105 m kvardinn er utilokadur i tests/stats.test.mjs kafla 6.
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

/* ---- THOLGARDAR VID ILLGILT INNTAK ----
   Skrarnar koma UTAN UR NETI (raw.githubusercontent). Ef ein er hálf-skrifud
   eda skemmd getur `players` verid hlutur i stad fylkis, eda fylki med null
   inni. Framendinn a tha ad BIRTA MINNA, ekki hrynja med hvitum skjá — sama
   regla og hledslan i App.jsx fylgir ("verja gegn ovaentri logun").
   Maelt med illgjornu inntaki: 27 logunum x hvert utflutt fall.            */
const rowsOf = v => Array.isArray(v) ? v.filter(x => x != null && typeof x === "object") : [];
const str = v => typeof v === "string" ? v : (v == null ? "" : String(v));
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
  { key: "attack",  label: "Sókn" },
  { key: "expect",  label: "Væntingar (xG/xA)" },
  { key: "defence", label: "Vörn" },
  { key: "bonus",   label: "Bónus og ICT" },
  { key: "value",   label: "Verð og eignarhald" },
  { key: "rank",    label: "FPL-sæti (innan stöðu)" },
  { key: "disc",    label: "Spjöld og refsingar" },
];

export const STAT_DEFS = [
  /* ---- Grunnur ---- */
  { key:"total_points", label:"Stig", group:"core", dec:0, hi:true, get:p=>num(p.total_points) },
  { key:"points_per_game", label:"Stig/leik", group:"core", dec:1, hi:true, get:p=>num(p.points_per_game) },
  { key:"pts_per_90", label:"Stig/90", group:"core", dec:2, hi:true, derived:true,
    note:"Stig deilt á spilaðar mínútur × 90. Refsar ekki fyrir litla spilun eins og stig/leik.",
    get:p=>per90(num(p.total_points), num(p.minutes)) },
  { key:"minutes", label:"Mínútur", group:"core", dec:0, hi:true, get:p=>num(p.minutes) },
  { key:"starts", label:"Byrjunarlið", group:"core", dec:0, hi:true, get:p=>num(p.starts) },
  { key:"starts_per_90", label:"Byrjunarhlutfall", group:"core", dec:2, hi:true,
    note:"Opinber FPL-tala (starts_per_90) — 1,0 = byrjar alltaf þegar hann spilar.",
    get:p=>num(p.starts_per_90) },
  { key:"form", label:"Form", group:"core", dec:1, hi:true, note:"FPL-form: meðalstig síðustu 30 daga.",
    get:p=>num(p.form) },
  { key:"dreamteam_count", label:"Lið vikunnar", group:"core", dec:0, hi:true,
    note:"Hversu oft leikmaðurinn hefur komist í FPL-lið vikunnar.", get:p=>num(p.dreamteam_count) },

  /* ---- Sokn ---- */
  { key:"goals_scored", label:"Mörk", group:"attack", dec:0, hi:true, get:p=>num(p.goals_scored) },
  { key:"assists", label:"Assist", group:"attack", dec:0, hi:true, get:p=>num(p.assists) },
  { key:"gi", label:"Mörk + assist", group:"attack", dec:0, hi:true, derived:true,
    get:p=>(num(p.goals_scored)??0)+(num(p.assists)??0) },
  { key:"gi_per_90", label:"M+A /90", group:"attack", dec:2, hi:true, derived:true,
    get:p=>per90((num(p.goals_scored)??0)+(num(p.assists)??0), num(p.minutes)) },
  { key:"mins_per_gi", label:"Mín/framlag", group:"attack", dec:0, hi:false, derived:true,
    note:"Mínútur per mark eða assist. Lægra er betra. Tómt ef ekkert framlag.",
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
  { key:"goals_minus_xg", label:"Mörk − xG", group:"expect", dec:2, hi:true, derived:true, signed:true,
    note:"Yfir núlli = skorar meira en færin gefa (klínísk nýting eða heppni). Undir núlli = klúðrar færum.",
    get:p=>{ const g=num(p.goals_scored), x=num(p.expected_goals); return (g==null||x==null)?null:g-x; } },
  { key:"assists_minus_xa", label:"Assist − xA", group:"expect", dec:2, hi:true, derived:true, signed:true,
    get:p=>{ const a=num(p.assists), x=num(p.expected_assists); return (a==null||x==null)?null:a-x; } },
  { key:"gi_minus_xgi", label:"Framlög − xGI", group:"expect", dec:2, hi:true, derived:true, signed:true,
    note:"Heildarmunur á raunverulegum framlögum og væntum. Sterkasta einstaka merkið um óheppni/heppni.",
    get:p=>{ const gi=(num(p.goals_scored)??0)+(num(p.assists)??0), x=num(p.expected_goal_involvements);
             return x==null?null:gi-x; } },

  /* ---- Vorn ---- */
  { key:"clean_sheets", label:"Hreint blað", group:"defence", dec:0, hi:true, pos:[1,2,3], get:p=>num(p.clean_sheets) },
  { key:"cs_pct", label:"Hreint blað %", group:"defence", dec:0, hi:true, pos:[1,2,3], derived:true, pct:true,
    note:"Hreint blað deilt á byrjunarliðs-leiki.",
    get:p=>{ const r=safeDiv(num(p.clean_sheets), num(p.starts)); return r==null?null:r*100; } },
  { key:"goals_conceded", label:"Mörk á sig", group:"defence", dec:0, hi:false, pos:[1,2,3], get:p=>num(p.goals_conceded) },
  { key:"expected_goals_conceded", label:"xGC", group:"defence", dec:2, hi:false, pos:[1,2,3],
    get:p=>num(p.expected_goals_conceded) },
  { key:"gc_minus_xgc", label:"Mörk á sig − xGC", group:"defence", dec:2, hi:false, pos:[1,2,3], derived:true, signed:true,
    note:"Undir núlli = vörnin (eða markvörðurinn) heldur betur en færin gefa.",
    get:p=>{ const g=num(p.goals_conceded), x=num(p.expected_goals_conceded); return (g==null||x==null)?null:g-x; } },
  { key:"saves", label:"Vörslur", group:"defence", dec:0, hi:true, pos:[1], get:p=>num(p.saves) },
  { key:"saves_per_90", label:"Vörslur/90", group:"defence", dec:2, hi:true, pos:[1],
    note:"Opinber FPL-tala (saves_per_90).", get:p=>num(p.saves_per_90) },
  { key:"save_pct", label:"Vörsluhlutfall %", group:"defence", dec:0, hi:true, pos:[1], derived:true, pct:true,
    note:"Vörslur / (vörslur + mörk á sig). Gróft — FPL telur ekki skot á mark per markvörð.",
    get:p=>{ const s=num(p.saves), g=num(p.goals_conceded);
             if (s==null||g==null||(s+g)===0) return null; return (s/(s+g))*100; } },
  { key:"penalties_saved", label:"Vítavörslur", group:"defence", dec:0, hi:true, pos:[1], get:p=>num(p.penalties_saved) },
  { key:"defensive_contribution", label:"Varnarframlag (DC)", group:"defence", dec:0, hi:true,
    note:"FPL DefCon-stig. Athugið: DC er VILJANDI utan FFDR — sjá kafla 3 í CLAUDE.md.",
    get:p=>num(p.defensive_contribution) },
  { key:"dc_per_90", label:"DC/90", group:"defence", dec:2, hi:true,
    note:"Opinber FPL-tala (defensive_contribution_per_90).",
    get:p=>num(p.defensive_contribution_per_90) },
  { key:"cs_per_90", label:"Hreint blað /90", group:"defence", dec:2, hi:true, pos:[1,2,3],
    note:"Opinber FPL-tala (clean_sheets_per_90) — ólíkt CS% sem deilir á byrjunarliðs-leiki.",
    get:p=>num(p.clean_sheets_per_90) },
  { key:"gc_per_90", label:"Mörk á sig /90", group:"defence", dec:2, hi:false, pos:[1,2,3],
    note:"Opinber FPL-tala (goals_conceded_per_90).", get:p=>num(p.goals_conceded_per_90) },
  { key:"xgc_per_90", label:"xGC /90", group:"defence", dec:2, hi:false, pos:[1,2,3],
    note:"Opinber FPL-tala (expected_goals_conceded_per_90).",
    get:p=>num(p.expected_goals_conceded_per_90) },
  { key:"clearances_blocks_interceptions", label:"Hreinsanir/blokk/rof", group:"defence", dec:0, hi:true,
    get:p=>num(p.clearances_blocks_interceptions) },
  { key:"tackles", label:"Tacklingar", group:"defence", dec:0, hi:true, get:p=>num(p.tackles) },
  { key:"recoveries", label:"Endurheimtur", group:"defence", dec:0, hi:true, get:p=>num(p.recoveries) },

  /* ---- Bonus og ICT ---- */
  { key:"bonus", label:"Bónus", group:"bonus", dec:0, hi:true, get:p=>num(p.bonus) },
  { key:"bps", label:"BPS", group:"bonus", dec:0, hi:true, get:p=>num(p.bps) },
  { key:"bps_per_90", label:"BPS/90", group:"bonus", dec:1, hi:true, derived:true,
    get:p=>per90(num(p.bps), num(p.minutes)) },
  { key:"ict_index", label:"ICT-vísitala", group:"bonus", dec:1, hi:true, get:p=>num(p.ict_index) },
  { key:"influence", label:"Áhrif", group:"bonus", dec:1, hi:true, get:p=>num(p.influence) },
  { key:"creativity", label:"Sköpun", group:"bonus", dec:1, hi:true, get:p=>num(p.creativity) },
  { key:"threat", label:"Hætta", group:"bonus", dec:1, hi:true,
    note:"FPL-mæling á hversu hættulegar stöður leikmaðurinn kemst í.", get:p=>num(p.threat) },

  /* ---- Verd og eignarhald ---- */
  { key:"now_cost", label:"Verð", group:"value", dec:1, hi:false, money:true, get:p=>{ const c=num(p.now_cost); return c==null?null:c/10; } },
  /* OPINBER FPL-TALA, ekki okkar utreikningur: FPL `value_season` er
     nakvaemlega total_points/verd (Raya 162/6,0 = 27,0 = value_season).
     Betra ad birta theirra tolu en ad verja okkar eigin eins tolu.      */
  { key:"pts_per_million", label:"Stig per milljón", group:"value", dec:1, hi:true,
    note:"FPL-eigin verðmæta-tala (value_season): heildarstig deilt á núverandi verð.",
    get:p=>num(p.value_season) },
  { key:"value_form", label:"Form per milljón", group:"value", dec:2, hi:true,
    note:"FPL-eigin value_form: form deilt á verð — verðmæti í NÚVERANDI formi.",
    get:p=>num(p.value_form) },
  { key:"selected_by_percent", label:"Eignarhald %", group:"value", dec:1, hi:true, pct:true,
    get:p=>num(p.selected_by_percent) },
  { key:"cost_change_start", label:"Verðbreyting", group:"value", dec:1, hi:true, signed:true, money:true,
    note:"Breyting frá byrjun tímabils.",
    get:p=>{ const c=num(p.cost_change_start); return c==null?null:c/10; } },
  { key:"cost_change_event", label:"Verðbreyting í umferð", group:"value", dec:1, hi:true,
    signed:true, money:true, note:"Verðbreyting í yfirstandandi umferð.",
    get:p=>{ const c=num(p.cost_change_event); return c==null?null:c/10; } },
  { key:"net_transfers_event", label:"Nettóflutningar", group:"value", dec:0, hi:true, signed:true, derived:true,
    note:"Inn mínus út í yfirstandandi umferð.",
    get:p=>{ const i=num(p.transfers_in_event)??0, o=num(p.transfers_out_event)??0; return i-o; } },

  /* ---- FPL-SAETI INNAN STODU ----
     FPL gefur TVO saeti fyrir hverja tolu: `_rank` (medal ALLRA leikmanna)
     og `_rank_type` (medal leikmanna I SOMU STODU). Hid sidara er thad sem
     skiptir mali i fantasy — 3. besti markvordur er allt annad en 32. besti
     leikmadur i heild. Maelt: Raya ppg 4,4 -> rank_type 3, rank 32.
     Vid birtum STODU-saetid. LAEGRA er betra.                            */
  { key:"ppg_rank_type", label:"Stig/leik — sæti", group:"rank", dec:0, hi:false,
    note:"Sæti í stig/leik innan stöðunnar (FPL points_per_game_rank_type).",
    get:p=>num(p.points_per_game_rank_type) },
  { key:"form_rank_type", label:"Form — sæti", group:"rank", dec:0, hi:false,
    get:p=>num(p.form_rank_type) },
  { key:"ict_rank_type", label:"ICT — sæti", group:"rank", dec:0, hi:false,
    get:p=>num(p.ict_index_rank_type) },
  { key:"influence_rank_type", label:"Áhrif — sæti", group:"rank", dec:0, hi:false,
    get:p=>num(p.influence_rank_type) },
  { key:"creativity_rank_type", label:"Sköpun — sæti", group:"rank", dec:0, hi:false,
    get:p=>num(p.creativity_rank_type) },
  { key:"threat_rank_type", label:"Hætta — sæti", group:"rank", dec:0, hi:false,
    get:p=>num(p.threat_rank_type) },
  { key:"selected_rank_type", label:"Eignarhald — sæti", group:"rank", dec:0, hi:false,
    note:"Sæti í eignarhaldi innan stöðunnar — lágt sæti = mikið eignað.",
    get:p=>num(p.selected_rank_type) },
  { key:"cost_rank_type", label:"Verð — sæti", group:"rank", dec:0, hi:false,
    note:"Sæti í verði innan stöðunnar — 1 = dýrastur.",
    get:p=>num(p.now_cost_rank_type) },

  /* ---- Ogn og refsingar ---- */
  { key:"yellow_cards", label:"Gul spjöld", group:"disc", dec:0, hi:false, get:p=>num(p.yellow_cards) },
  { key:"red_cards", label:"Rauð spjöld", group:"disc", dec:0, hi:false, get:p=>num(p.red_cards) },
  { key:"own_goals", label:"Sjálfsmörk", group:"disc", dec:0, hi:false, get:p=>num(p.own_goals) },
  { key:"penalties_missed", label:"Klúðruð víti", group:"disc", dec:0, hi:false, get:p=>num(p.penalties_missed) },
];

export const STAT_BY_KEY = Object.fromEntries(STAT_DEFS.map(d => [d.key, d]));

/* Snyrtileg birting einnar tolu samkvaemt skra-lysingunni. */
export function fmtStat(def, v) {
  if (!def) return "—";
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
  const max = rowsOf(players).reduce((m, p) => Math.max(m, num(p.minutes) ?? 0), 0);
  return Math.round(max * fraction);
}

/* ---- SAMKVAEMNI-VORDUR A HEIMILDINNI ----
   FPL-API-ID SJALFT getur skilad omogulegum tolum. MAELT 28.7.2026:
   element 3 (Meslier) kemur med goals_scored:11 en minutes:0 OG
   total_points:0. Ellefu mork gaefu minnst 66 stig, svo TVO svid segja
   ad hann hafi ekki spilad og EITT segir annad -> markatalan er ruslid.
   Hann var 1 af 563 og trónaði a toppi "Mork" fyrir markverdi.

   Vid þegjum ekki og skrifum ekki yfir i 0 (thad myndi FELA vandann i
   heimildinni). Talan er TEKIN UT og TALIN, eins og minutu-thakid.

   REGLAN ER ALMENN, ekki Meslier-undantekning: tala sem KREFST spilunar
   getur ekki verid >0 thegar minutur eru 0. Adeins verd, eignarhald og
   flutningar eru oháð spilun.                                            */
const MINUTES_INDEPENDENT = new Set([
  "minutes", "now_cost", "selected_by_percent", "cost_change_start",
  "net_transfers_event", "pts_per_million",
]);

export function isIncoherent(p, statKey, v) {
  if (!p || typeof p !== "object") return false;
  if (v == null || v <= 0 || !Number.isFinite(v)) return false;
  if (MINUTES_INDEPENDENT.has(statKey)) return false;
  return (num(p.minutes) ?? 0) === 0;
}

export function buildLeaderboard({
  players, statKey, pos = "all", minMinutes = 0, limit = 50,
  teamId = "all", search = "", onlyAvailable = false,
}) {
  const def = STAT_BY_KEY[statKey];
  if (!def) return { def: null, rows: [], skipped: 0, incoherent: 0 };
  const q = (search || "").trim().toLowerCase();
  let skipped = 0, incoherent = 0;

  const rows = [];
  for (const p of rowsOf(players)) {
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
    // HEIMILDIN getur logid — sja isIncoherent. Tekid ut OG talid.
    if (isIncoherent(p, def.key, v)) { incoherent++; continue; }
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

  return { def, rows: rows.slice(0, limit), total: rows.length, skipped, incoherent };
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
  for (const r of rowsOf(rows)) {
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

/* Hve morg LID heldu hreinu — allt annad en cs-summan, sem er per LEIKMANN.
   45 leikmanna-hrein blod i 10 leikjum leit rangt ut thangad til thetta var
   sett vid hlidina: 4 lid heldu hreinu (4 x ~11 leikmenn = 42) og thrir til
   vidbotar voru teknir af velli ADUR en motherjinn skoradi (FPL-reglan er
   60+ min AN thess ad fa a sig mark MEDAN madur er inni a). */
export function teamsWithCleanSheet(fixtures) {
  let n = 0;
  for (const f of rowsOf(fixtures)) {
    if (f.a_score === 0) n++;
    if (f.h_score === 0) n++;
  }
  return n;
}

/* Afleiddar tolur per rod — reiknadar EINU SINNI, notadar allsstadar. */
export function withDerived(rows) {
  return rowsOf(rows).map(r => {
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
  return rowsOf(rows)
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
  for (const r of rowsOf(rows)) if (byPos[r.pos]) byPos[r.pos].push(r);
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
   FPL gefur stytt nafn i timabili ("M.Salah") og fullt nafn i safni
   ("Diego Gomez Amarilla"); ESPN gefur sina eigin utgafu ("Diego Gomez").

   TVAER VILLUR SEM MAELDUST og eru lagfaerdar her (porun var 80%):
   1. NFD-normalisering leysir EKKI upp alla bokstafi. "Grohs" (sharp-s)
      vard "gro" a moti ESPN "Gross", og "Kadioglu" vard "kad oglu" thvi
      punktlaust i (U+0131) er ekki [a-z] og vard bil. Thess vegna kemur
      TRANSLIT-tafla A UNDAN NFD.
   2. Porun a SIDASTA ordi brast a samsettum eftirnofnum: FPL
      "Diego Gomez Amarilla" -> "amarilla" en ESPN "Diego Gomez" -> "gomez".
      Nu er porad a ORDA-SKORUN i stad sidasta ords.

   REGLAN: sama lid + flest sameiginleg ord, og BESTA parid verdur ad vera
   STRANGARA en naesta besta — annars er thad tvirætt og fer i unmatched.
   Thad ver gegn "Hugo Bueno" vs "Santiago Ignacio Bueno" i sama lidi.
   OPARADIR FA null, EKKI 0 — "0 skot" vaeri stadhaefing sem vid eigum ekki. */
const TRANSLIT = {
  "ß":"ss", "ı":"i", "ø":"o", "ł":"l", "đ":"d",
  "ð":"d", "þ":"th", "æ":"ae", "œ":"oe", "ħ":"h",
  "ŋ":"n", "ŧ":"t", "ĸ":"k", "'":"", "’":"",
};
const TRANSLIT_RE = new RegExp("[" + Object.keys(TRANSLIT).join("") + "]", "g");

export const normName = s => str(s)
  .toLowerCase()
  .replace(TRANSLIT_RE, c => TRANSLIT[c] ?? c)
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();

const nameTokens = s => normName(s).split(" ").filter(t => t.length >= 2);

/* Skor = fjoldi sameiginlegra orda, +0,5 ef SIDASTA ordid er sameiginlegt
   (eftirnafn a ad vega thyngra en fornafn).                               */
export function nameScore(a, b) {
  const ta = nameTokens(a), tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  const setB = new Set(tb);
  let shared = 0;
  for (const t of new Set(ta)) if (setB.has(t)) shared++;
  if (!shared) return 0;
  return shared + (ta[ta.length - 1] === tb[tb.length - 1] ? 0.5 : 0);
}

export function matchShotsToPlayers(rows, shotPlayers) {
  /* EITT-A-EITT PORUN, GRADUG A SKORI (maelt: nauðsynlegt).
     Fyrri utgafa valdi BESTA parid fyrir hverja FPL-rod sjalfstaett og
     leyfdi thannig TVEIMUR FPL-monnum ad hirda SOMU ESPN-skyttu:
       ESPN "Rodrigo Gomes" (WOL) var eignud Toti Gomes (1,5),
       Angel Gomes (1,5) OG Rodrigo Martins Gomes (2,5).
     Tveir theirra hefdu fengid skot-tolur annars manns. Nu er porad
     hnattraent: sterkustu por fyrst, hver skytta og hver rod nyttar
     MEST EINU SINNI. Hinir Gomes-arnir fa null — sem er rett, thvi
     ESPN skradi thau ekki a skot.                                        */
  const byTeam = {};
  rowsOf(shotPlayers).forEach((sp, i) => (byTeam[sp.team] ||= []).push({ sp, i }));

  const pairs = [];
  const R = rowsOf(rows);
  R.forEach((r, ri) => {
    for (const { sp, i } of (byTeam[r.team] || [])) {
      const sc = nameScore(r.name, sp.name);
      if (sc >= 1) pairs.push({ ri, si: i, sc });
    }
  });
  // haesta skor fyrst; stodug rodun svo utkoman se endurtakanleg
  pairs.sort((a, b) => b.sc - a.sc || a.ri - b.ri || a.si - b.si);

  const takenRow = new Set(), takenShot = new Set(), assign = new Map();
  for (const { ri, si } of pairs) {          // sc er thegar notad i rodun
    if (takenRow.has(ri) || takenShot.has(si)) continue;
    takenRow.add(ri); takenShot.add(si); assign.set(ri, shotPlayers[si]);
  }

  let matched = 0, unmatched = 0;
  const out = R.map((r, ri) => {
    const sp = assign.get(ri) || null;
    if (sp) matched++; else unmatched++;
    return { ...r, shot: sp };
  });
  // hve margar skyttur fundu ekki sinn mann (t.d. gaelunofn: Savinho)
  const shotsUnmatched = rowsOf(shotPlayers).length - takenShot.size;
  return { rows: out, matched, unmatched, shotsUnmatched };
}


/* ---- SKOT-KORT ----
   Skilar AÐEINS skotum med nothaefum hnitum. Hin eru talin i `excluded`
   svo birtingin geti sagt fra theim i stad thess ad thegja um thau.       */
export function shotsFor(shots, { fixture = null, team = null, player = null } = {}) {
  const all = rowsOf(shots).filter(s =>
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
  for (const x of rowsOf(shots)) {
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
  for (const f of rowsOf(shotsFile?.fixtures)) shotFxById[f.fixture] = f;

  return rowsOf(report?.fixtures)
    .slice()
    .sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)))
    .map(f => {
      const mine = rows.filter(r => r.fixture === f.id);
      const sorted = mine.slice().sort((a, b) =>
        (b.points ?? 0) - (a.points ?? 0) || (b.bps ?? 0) - (a.bps ?? 0));
      const sf = shotFxById[f.id] || null;
      const fxShots = rowsOf(shotsFile?.shots).filter(s => s.fixture === f.id);
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
  for (const e of rowsOf(events)) if (e.finished && (last == null || e.id > last)) last = e.id;
  return last;
}

/* ============================================================
   4. "OHJAKVAEMILEGT" — MO (mark) og AO (assist)

   MARKMID: finna leikmenn ADUR en their springa ut. Thess vegna er
   markhopurinn ADEINS their sem hafa 0-1 mark+assist i glugganum —
   sa sem er thegar buinn ad skora tvisvar tharf enga spa.

   MAELT A 3 TIMABILUM (2023-24, 2024-25, 2025-26), 114 umferdum,
   13.273 synishornum (leikmadur x umferd). Gluggi 4 umferdir aftur,
   markmid: mork/assist naestu 4 umferdir. Malikvardi: LYFTING =
   medaltal efsta tiundarhlutans deilt med medaltali allra.

   MO — SAMSETTUR STUDULL STENST PROFID:
     vogir valdar a 2 timabilum, profadar a thvi THRIDJA (ut af urtaki):
       2023-24 haldid eftir: 2,711  (xG eitt 2,449 · threat eitt 2,711)
       2024-25 haldid eftir: 3,059  (xG eitt 2,844 · threat eitt 2,995)
       2025-26 haldid eftir: 2,895  (xG eitt 2,794 · threat eitt 2,631)
       MEDALTAL 2,888 a moti 2,696 (xG) og 2,779 (threat)
     Vinnur i 2/3 og jafnar i thvi thridja. Hoflegur en RAUNVERULEGUR ábati.

   AO — SAMSETTI STUDULLINN FELL OG ER THVI EKKI NOTADUR:
     sama profun gaf 2,179 a moti 2,206 fyrir BERA creativity —
     hann tapadi i 0/3 timabilum, thad er i OLLUM. xA-vogin valdist
     ALLTAF 0, sem segir ad xA baeti engu ofan a creativity fyrir
     thennan markhop. Thess vegna er AO einfaldlega creativity/90.
     Ad birta samsettan AO-studul vaeri skraut sem maelingin hafnadi.

   LAERDOMUR SEM ER VERT AD MUNA: "oheppni" (xG - mork) EIN OG SER er
   VEIKARA merki (lyfting 2,27) en hreint MAGN (xG 2,70 / threat 2,78).
   Sa sem klúðrar faerum er ekki jafn liklegur og sa sem BYR THAU TIL.
   ============================================================ */

/* Vogir: xG-summa, threat/25, og "oheppni" (adeins jakvaed att).
   Threat er deilt med 25 svo lidirnir seu a svipudum kvarda. */
export const MO_WEIGHTS = { xg: 0.8, threat: 0.3, unlucky: 0.2, threat_scale: 25 };
export const IMMINENT_WINDOW = 4;      // umferdir aftur i timann
export const IMMINENT_MAX_GI = 1;      // markhopur: 0-1 framlog i glugganum
export const IMMINENT_MIN_MINUTES = 180;

/* w: samtala gluggans { minutes, goals, assists, xg, xa, threat, creativity } */
export function moScore(w) {
  if (!w) return null;
  const xg = num(w.xg) ?? 0, thr = num(w.threat) ?? 0, g = num(w.goals) ?? 0;
  const unlucky = Math.max(0, xg - g);            // adeins UNDIR vaentingum telur
  return +(MO_WEIGHTS.xg * xg
         + MO_WEIGHTS.threat * (thr / MO_WEIGHTS.threat_scale)
         + MO_WEIGHTS.unlucky * unlucky).toFixed(3);
}

/* AO er BERT creativity/90 — samsetning fell ut af urtaki (sja hausinn). */
export function aoScore(w) {
  if (!w) return null;
  const mins = num(w.minutes) ?? 0;
  if (mins <= 0) return null;
  return +(((num(w.creativity) ?? 0) / mins) * 90).toFixed(2);
}

/* Er leikmadurinn i markhopnum? Utan hans er studullinn MERKINGARLAUS. */
export function inImminentPool(w) {
  if (!w) return false;
  if (typeof w !== "object") return false;
  const gi = (num(w.goals) ?? 0) + (num(w.assists) ?? 0);
  return (num(w.minutes) ?? 0) >= IMMINENT_MIN_MINUTES && gi <= IMMINENT_MAX_GI;
}

/* Radar leikmonnum eftir studli. Skilar ADEINS theim sem eru i markhop. */
export function imminentBoard(players, kind = "mo", limit = 20) {
  const fn = kind === "ao" ? aoScore : moScore;
  return rowsOf(players)
    .filter(p => inImminentPool(p.window))
    .map(p => ({ ...p, score: fn(p.window) }))
    .filter(p => p.score != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ============================================================
   5. BYRJUNAR-LIKUR — "spilar hann 60+ minutur naest?"

   AF HVERJU THETTA OG EKKI ANNAD: allt annad i appinu er verdlaust ef
   leikmadurinn spilar ekki. Dyrasta einstaka mistokin i FPL eru ad stilla
   upp manni sem endar a bekknum, og forsendan sem allir nota — "hann
   byrjadi sidast, hann byrjar naest" — er RETT i 88,2% tilvika en THEGIR
   um hin 11,8%.

   MAELT 28.7.2026 a 65.557 synishornum (3 timabil, 114 umferdir), LOSO:

     NAKVAEMNI ER *EKKI* ABATINN. Grunnreglan "byrjadi sidast" gefur 88,2%
     og likanid 88,0% — jafnt. Ad selja thetta sem betri spa vaeri osatt.

     ABATINN ER TVENNS KONAR:
     1. KVORDUN. Brier 0,1176 -> 0,0888 (-24%). Likanid gefur LIKUR, ekki
        ja/nei, svo haegt er ad RADA leikmonnum eftir hættu.
     2. BEKKJAR-GILDRAN. Af theim sem byrjudu SIDAST spila 21,6% EKKI 60+
        naest. Laegsti tiundarhluti likansins fangar 42-49% theirra —
        LYFTING 2,09x, samhljoda i ollum threm timabilum [2,05 · 2,15 · 2,07].
        Thad er notagildid: "af theim sem thu telur oruggan er thetta
        tiundarhlutinn sem er i raun i hættu — naerri helmingur theirra
        fellur a bekk".

   PROFAD OG HAFNAD (ekki endurtaka):
     HVILD/LEIKJAALAG: <4 daga hvild gefur 27,0% a moti 27,3% annars —
       ENGIN ahrif. Athugid: `rotation.json` i thessu repo flaggar "<4 daga
       hvild" sem rotasjon-hættu; sú flögg hefur EKKERT forspargildi um
       minutur skv. thessari maelingu.
     STADA (GK/DEF/FWD-dummy): +0,03x lyfting = sud. Sleppt; einfaldara er
       betra og ver okkur gegn ofurfittun.

   Vogtolurnar eru logistisk aðhvarfsgreining thjalfud a ollum 3 timabilum.
   Normalisering (mu/sd) er FEST med vogunum — annars faerist kvardinn.
   ============================================================ */

export const START_MODEL = {
  bias: -1.5912,
  terms: [
    { key: "starts5",      w:  0.3573, mu:  0.2737, sd:  0.3772 },
    { key: "mins5",        w:  1.1780, mu: 26.1879, sd: 33.2789 },
    { key: "trend",        w:  0.2884, mu: -0.2012, sd: 25.5384 },
    { key: "started_last", w:  0.4887, mu:  0.2725, sd:  0.4453 },
    { key: "value",        w:  0.1445, mu: 48.6898, sd: 10.4912 },
  ],
  window: 5,
  measured: { samples: 65557, seasons: 3, brier: 0.0888, brier_baseline: 0.1176,
              trap_lift: 2.09, trap_base_rate: 0.216 },
};

/* w: { minutes:[5 sidustu umferdir], value } eða thegar reiknad
   { starts5, mins5, trend, started_last, value }.                        */
export function startFeatures(mins, value) {
  const m = (Array.isArray(mins) ? mins : []).map(v => num(v) ?? 0);
  if (m.length < 2) return null;
  const n = m.length;
  const half = Math.max(1, Math.floor(n / 2));
  const late = m.slice(-half).reduce((a, b) => a + b, 0) / half;
  const early = m.slice(0, half).reduce((a, b) => a + b, 0) / half;
  return {
    starts5: m.filter(v => v >= 60).length / n,
    mins5: m.reduce((a, b) => a + b, 0) / n,
    trend: late - early,
    started_last: m[m.length - 1] >= 60 ? 1 : 0,
    value: num(value) ?? START_MODEL.terms[4].mu,
  };
}

export function startProbability(f) {
  if (!f || typeof f !== "object") return null;
  let z = START_MODEL.bias;
  for (const t of START_MODEL.terms) {
    const v = num(f[t.key]);
    if (v == null) return null;
    z += t.w * ((v - t.mu) / t.sd);
  }
  const p = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
  return +p.toFixed(3);
}

/* HAETTU-FLOKKUN. Threpin eru valin ut fra MAELDA grunnhlutfallinu (21,6%
   theirra sem byrjudu sidast falla a bekk) — ekki ut fra tilfinningu.
   "trap" = byrjadi sidast EN likurnar eru lagar: thetta er hopurinn sem
   maelingin segir ad naerri helmingur falli a bekk.                       */
export function startRisk(f) {
  const p = startProbability(f);
  if (p == null) return null;
  const startedLast = (num(f.started_last) ?? 0) >= 1;
  if (p >= 0.75) return { p, level: "safe",  label: "Byrjar líklega" };
  if (p >= 0.45) return { p, level: "mid",   label: "Óvíst" };
  return { p, level: startedLast ? "trap" : "low",
           label: startedLast ? "Bekkjar-hætta þrátt fyrir að hafa byrjað" : "Byrjar ólíklega" };
}
