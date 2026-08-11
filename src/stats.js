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

   EIN ROD, I THEIRRI ROD SEM TAFLAN BIRTIR. Adur var skrain i tveimur
   hlutum (grunn-fylki + `STAT_DEFS.push(...)` langt nidri i skranni) og
   thad var ORSOK THESS ad /90-dalkur endadi tugum dalka fra sinni
   grunntolu: ICT i Grunni, ICT/90 i push-blokkinni. Nu er ein rod og
   birtingar-rodin ER skra-rodin.

   SVIDIN:
     key     lykill (FPL-svidsheiti thegar thad er til)
     label   FULLT heiti. Notad i dalkavalaranum, filter-chip-um, tooltip
             og stigatoflunni — ma og A ad vera lysandi.
     short   HEITID I TOFLUHAUSNUM (sjalfgefid = label). Hausinn hefur
             ~46-142 px; "Clearances/blocks/int" passar aldrei thar en
             "CBI" gerir thad. Skyringin er i tooltip, ekki i hausnum.
     band    UNDIRFLOKKUR — spannandi hausrod fyrir ofan dalkana, sama
             hugmynd sem FFS notar ("Goals: Tot | In | Out | H | M/G").
             THAD ER BANDID SEM GERIR STUTT HEITI LAESILEG: "/90" eitt er
             radgata, "/90" undir "Goals" er thad ekki.
     note    SKYLDA — hver dalkur hefur skyringu (vordur i stats.test.mjs
             kafla 13). Stytt heiti AN skyringar er verra en langt heiti.
     dec, hi (true = haerra betra), pct, money, signed, pos, derived,
     live_only — obreytt fra adur.

   `derived: true` merkir tolu sem VID reiknum ur FPL-svidum, ekki svid
   sem FPL birtir sjalft — svo hun se ekki misskilin sem opinber tala.
   ============================================================ */

const per90of = (key) => (p) => per90(num(p[key]), num(p.minutes));

export const STAT_GROUPS = [
  /* 7 flokkar. ENDURSKIPULAGT 7.8.2026 (faerri og breidari) og svo 8.8.
     ad beidni: ICT/ogn/skopun/ahrif foru UR Grunni I SOKN — their maela
     sokn, ekki grunn-upplysingar um leikmann, og i Grunni voru their
     komnir a milli verds og eignarhalds.                              */
  { key: "core",    label: "Basics" },
  { key: "attack",  label: "Attack" },
  { key: "defence", label: "Defence" },
  { key: "aron",    label: "Consistency (Aron)" },
  { key: "fixtures",label: "Upcoming fixtures" },
  { key: "setp",    label: "Set pieces and cards" },
];

/* LAGMARKS-BYRJANIR FYRIR "stig per byrjun".
   MAELT 9.8.2026 a 2025/26: an golfs var toppurinn Chiesa 37,0 (1 byrjun,
   37 stig — nanast oll af BEKKNUM), og 17 af efstu 20 attu faerri en 5
   byrjanir. Med golfi 5 verdur toppurinn Osula 9,5 · Ngumoha 8,6 ·
   Zirkzee 8,4, og vid 10 er hann Nmecha 7,3 · Cherki 7,1 · Haaland 7,0.
   Fimm er valid af somu astaedu og `xG >= 0,5` a nytingu og `BPS >= 50`
   a bonus-hlutfalli (6i): naegilega hatt til ad drepa fjarstaeduna, ekki
   svo hatt ad thad henda raunverulegum monnum.                         */
export const PTS_PER_START_MIN = 5;

export const STAT_DEFS = [
  /* ================= GRUNNUR ================= */
  /* --- band: Points --- */
  { key:"total_points", label:"Points", short:"Total", group:"core", band:"Points",
    dec:0, hi:true, note:"Total FPL points in the selected season.",
    get:p=>num(p.total_points) },
  { key:"points_per_game", label:"Points per match", short:"Per match", group:"core", band:"Points",
    dec:1, hi:true,
    note:"Official FPL figure. Divides by MATCHES HE PLAYED, not by gameweeks — a player who missed ten weeks is not punished for the weeks he was out.",
    get:p=>num(p.points_per_game) },
  { key:"pts_per_start", label:"Points per start", short:"Per start", group:"core", band:"Points",
    dec:1, hi:true, derived:true,
    note:"Points divided by STARTS — what he returns in the games he actually starts, where points per match is dragged down by substitute cameos. NEEDS AT LEAST 5 STARTS. Without that floor the column is nonsense: Chiesa took 37 points off the bench with ONE start and read 37.0 per start, and 17 of the top 20 had fewer than 5 starts. Empty below the floor, which means \"too few starts to say\", not zero.",
    get:p=>{ const s=num(p.starts);
             return s >= PTS_PER_START_MIN ? safeDiv(num(p.total_points), s) : null; } },
  { key:"pts_per_90", label:"Points per 90", short:"Per 90", group:"core", band:"Points",
    dec:2, hi:true, derived:true,
    note:"Points divided by minutes played × 90. Rewards output per minute — it flatters a substitute who scores in cameos, so read it next to Minutes.",
    get:p=>per90(num(p.total_points), num(p.minutes)) },

  /* --- band: Minutes --- */
  { key:"minutes", label:"Minutes", short:"Mins", group:"core", band:"Minutes",
    dec:0, hi:true, note:"Minutes played in the selected season. The single most important number in FPL: everything else is worthless if he does not play.",
    get:p=>num(p.minutes) },
  { key:"starts", label:"Starts", group:"core", band:"Minutes",
    dec:0, hi:true, note:"Number of matches he started (FPL `starts`).",
    get:p=>num(p.starts) },
  { key:"starts_per_90", label:"Starts per 90 mins", short:"Starts/90", group:"core", band:"Minutes",
    dec:2, hi:true,
    note:"Official FPL starts_per_90 = starts ÷ (minutes ÷ 90). IT IS NOT THE SHARE OF GAMES STARTED, so it goes ABOVE 1.00 — measured: 186 of 365 players are over 1, up to 2.37 (1 start in 38 minutes). Above 1 = he starts but comes off early, or the sample is tiny. Around 1.0 = starts and plays the full match — that is the ideal. Below 1 = much of his time comes off the bench (1 start in 351 minutes = 0.26). For \"will he start the NEXT one?\" use Start prob, not this.",
    get:p=>num(p.starts_per_90) },
  { key:"start_prob", label:"Start probability", short:"Start prob", group:"core", band:"Minutes",
    dec:0, hi:true, pct:true, live_only:true, derived:true,
    note:"OUR MEASURED MODEL, not an FPL field: probability of 60+ minutes in the NEXT gameweek, from starts and minutes over the last 5 finished gameweeks. Measured on 65,557 samples — the model is no more accurate than \"he started last time\" (88%) but far better CALIBRATED (Brier −24%), so the RANKING is what it is for: the lowest decile catches 2.09× the bench drops. Live figure — it does not follow the selected season.",
    get:p=>{ const v=num(p._start_p); return v==null?null:v*100; } },

  /* --- band: Form --- */
  { key:"form", label:"Form", group:"core", band:"Form",
    dec:1, hi:true, note:"FPL form: average points over the last 30 days.",
    get:p=>num(p.form) },
  { key:"dreamteam_count", label:"Team of the week (TOTW)", short:"TOTW", group:"core", band:"Form",
    dec:0, hi:true,
    note:"How many times he has made the FPL Team of the Week (the official dream team, the best XI of the gameweek).",
    get:p=>num(p.dreamteam_count) },

  /* --- band: Bonus --- */
  { key:"bonus", label:"Bonus points", short:"Bonus", group:"core", band:"Bonus",
    dec:0, hi:true, note:"Bonus points won (the 3/2/1 handed to the top BPS scorers in each match).",
    get:p=>num(p.bonus) },
  { key:"bonus_per_90", label:"Bonus per 90", short:"/90", group:"core", band:"Bonus",
    dec:2, hi:true, derived:true, note:"Bonus points per 90 minutes played.",
    get: per90of("bonus") },
  { key:"bps", label:"BPS", group:"core", band:"Bonus",
    dec:0, hi:true, note:"Bonus Points System — the raw score FPL ranks players on inside each match. High BPS with low bonus means he is often 4th in his own match.",
    get:p=>num(p.bps) },
  { key:"bonus_per_bps", label:"Bonus per 100 BPS", short:"Bon/100", group:"core", band:"Bonus",
    dec:2, hi:true, derived:true,
    note:"How well BPS converts into real bonus — high = he is usually in the top 3 of his match, not 4th. Needs BPS ≥ 50 to mean anything.",
    get:p=>{ const b=num(p.bps); if (!b||b<50) return null;
             return safeDiv(num(p.bonus) ?? 0, b/100); } },

  /* --- band: Value --- */
  /* OPINBER FPL-TALA, ekki okkar utreikningur: `value_season` er
     nakvaemlega total_points/verd (Raya 162/6,0 = 27,0). Betra ad birta
     theirra tolu en ad verja okkar eigin eins tolu.                    */
  { key:"pts_per_million", label:"Points per £m", short:"Pts/£m", group:"core", band:"Value",
    dec:1, hi:true,
    note:"FPL's own value figure (value_season): total points ÷ current price. Cheap players win it by default, so use it to compare inside a price bracket, not across the whole list.",
    get:p=>num(p.value_season) },
  { key:"value_form", label:"Form per £m", short:"Form/£m", group:"core", band:"Value",
    dec:2, hi:true, note:"FPL's own value_form: form ÷ price — value at CURRENT form rather than over the whole season.",
    get:p=>num(p.value_form) },

  /* --- band: Price and ownership ---
     VERD OG EIGNARHALD ERU FASTIR DALKAR i leikmannalistanum (PINNED) og
     eru THVI SLEPPT ur skrunanlegu dalkunum thar. Their eru samt i
     skranni: stigataflan radar eftir theim og filter/valari nota thau.
     ADUR birtust their TVISVAR i toflunni — "verd aftur vid hlidina a
     Threat" (notandinn, 8.8.2026). Sja PINNED i PlayerList.jsx.        */
  { key:"now_cost", label:"Price", group:"core", band:"Price and ownership",
    dec:1, hi:false, money:true, note:"Current price. Always today's price, also when a historical season is selected — you buy at today's price.",
    get:p=>{ const c=num(p.now_cost); return c==null?null:c/10; } },
  { key:"selected_by_percent", label:"Ownership %", short:"Owned %", group:"core", band:"Price and ownership",
    dec:1, hi:true, pct:true, note:"Share of all FPL squads that own him right now.",
    get:p=>num(p.selected_by_percent) },
  { key:"cost_change_start", label:"Price change (season)", short:"Chg season", group:"core",
    band:"Price and ownership", dec:1, hi:true, signed:true, money:true,
    note:"Price change since the start of the season.",
    get:p=>{ const c=num(p.cost_change_start); return c==null?null:c/10; } },
  { key:"cost_change_event", label:"Price change (GW)", short:"Chg GW", group:"core",
    band:"Price and ownership", dec:1, hi:true, signed:true, money:true,
    note:"Price change inside the current gameweek.",
    get:p=>{ const c=num(p.cost_change_event); return c==null?null:c/10; } },
  { key:"net_transfers_event", label:"Net transfers (GW)", short:"Net trans", group:"core",
    band:"Price and ownership", dec:0, hi:true, signed:true, derived:true,
    note:"Transfers in minus transfers out in the current gameweek — what drives the price change.",
    get:p=>{ const i=num(p.transfers_in_event)??0, o=num(p.transfers_out_event)??0; return i-o; } },

  /* ================= SOKN ================= */
  /* --- band: Goals --- */
  { key:"goals_scored", label:"Goals", group:"attack", band:"Goals",
    dec:0, hi:true, note:"Goals scored.", get:p=>num(p.goals_scored) },
  { key:"goals_per_90", label:"Goals per 90", short:"/90", group:"attack", band:"Goals",
    dec:2, hi:true, derived:true, note:"Goals per 90 minutes played.",
    get: per90of("goals_scored") },

  /* --- band: Assists --- */
  { key:"assists", label:"Assists", group:"attack", band:"Assists",
    dec:0, hi:true, note:"Assists as FPL counts them — a wider definition than Opta's (FPL gives an assist for winning a penalty that is scored).",
    get:p=>num(p.assists) },
  { key:"assists_per_90", label:"Assists per 90", short:"/90", group:"attack", band:"Assists",
    dec:2, hi:true, derived:true, note:"Assists per 90 minutes played.",
    get: per90of("assists") },

  /* --- band: G+A --- */
  { key:"gi", label:"Goals + assists", short:"G+A", group:"attack", band:"G+A",
    dec:0, hi:true, derived:true, note:"Goal involvements: goals plus assists.",
    get:p=>(num(p.goals_scored)??0)+(num(p.assists)??0) },
  { key:"gi_per_90", label:"Goals + assists per 90", short:"/90", group:"attack", band:"G+A",
    dec:2, hi:true, derived:true, note:"Goal involvements per 90 minutes played.",
    get:p=>per90((num(p.goals_scored)??0)+(num(p.assists)??0), num(p.minutes)) },
  { key:"mins_per_gi", label:"Minutes per G+A", short:"Mins/GA", group:"attack", band:"G+A",
    dec:0, hi:false, derived:true,
    note:"How long you wait for a goal or an assist. LOWER IS BETTER. Empty if he has no involvement at all.",
    get:p=>{ const gi=(num(p.goals_scored)??0)+(num(p.assists)??0); return gi>0?safeDiv(num(p.minutes),gi):null; } },

  /* --- band: Expected --- */
  { key:"expected_goals", label:"xG (expected goals)", short:"xG", group:"attack", band:"Expected",
    dec:2, hi:true, note:"Expected goals: the sum of the quality of the chances he took. More stable than goals themselves.",
    get:p=>num(p.expected_goals) },
  { key:"expected_goals_per_90", label:"xG per 90", short:"xG/90", group:"attack", band:"Expected",
    dec:2, hi:true, note:"Official FPL figure (expected_goals_per_90).",
    get:p=>num(p.expected_goals_per_90) },
  { key:"expected_assists", label:"xA (expected assists)", short:"xA", group:"attack", band:"Expected",
    dec:2, hi:true, note:"Expected assists: the quality of the chances he created for others.",
    get:p=>num(p.expected_assists) },
  { key:"expected_assists_per_90", label:"xA per 90", short:"xA/90", group:"attack", band:"Expected",
    dec:2, hi:true, note:"Official FPL figure (expected_assists_per_90).",
    get:p=>num(p.expected_assists_per_90) },
  { key:"expected_goal_involvements", label:"xGI (expected G+A)", short:"xGI", group:"attack",
    band:"Expected", dec:2, hi:true, note:"Expected goal involvements: xG + xA. The best single underlying number for an attacker.",
    get:p=>num(p.expected_goal_involvements) },
  { key:"expected_goal_involvements_per_90", label:"xGI per 90", short:"xGI/90", group:"attack",
    band:"Expected", dec:2, hi:true, note:"Official FPL figure (expected_goal_involvements_per_90).",
    get:p=>num(p.expected_goal_involvements_per_90) },
  { key:"mins_per_xgi", label:"Minutes per xGI", short:"Mins/xGI", group:"attack", band:"Expected",
    dec:0, hi:false, derived:true, note:"Minutes per unit of expected involvement. LOWER IS BETTER — the underlying twin of Minutes per G+A, and less noisy than it. Needs xGI > 0.5: below that the divisor is rounding noise and the ratio explodes (measured: keepers reach 326,100, i.e. 0.01 xGI in 3,261 minutes).",
    get:p=>{ const x=num(p.expected_goal_involvements); if (x==null||x<0.5) return null;
             return safeDiv(num(p.minutes), x); } },
  { key:"xgi_per_million", label:"xGI per £m", short:"xGI/£m", group:"attack", band:"Expected",
    dec:2, hi:true, derived:true, note:"Expected involvements per million — value of the UNDERLYING rather than of points already banked.",
    get:p=>{ const c=num(p.now_cost); return (c==null||c===0)?null
             : safeDiv(num(p.expected_goal_involvements), c/10); } },
  { key:"xg_share", label:"Share of team xG", short:"xG share", group:"attack", band:"Expected",
    dec:0, hi:true, pct:true, derived:true, live_only:true,
    note:"How much of his team's expected goals comes from him. Normalises for team strength — 25% in a weak side can beat 10% in a strong one. Live figure, does not follow the selected season.",
    get:p=>{ const t=num(p._team_xg); if (!t) return null;
             const v=num(p.expected_goals); return v==null?null:(v/t)*100; } },

  /* --- band: Over/under --- */
  { key:"goals_minus_xg", label:"Goals − xG", short:"G−xG", group:"attack", band:"Over/under",
    dec:2, hi:true, derived:true, signed:true,
    note:"Above zero = he scores more than the chances imply (clinical, or lucky). Below zero = he wastes chances. Measured across seasons: this does NOT persist, so a big negative is usually a buy signal rather than a flaw.",
    get:p=>{ const g=num(p.goals_scored), x=num(p.expected_goals); return (g==null||x==null)?null:g-x; } },
  { key:"conversion", label:"Goal conversion (goals/xG)", short:"G/xG", group:"attack", band:"Over/under",
    dec:2, hi:true, derived:true,
    note:"The same thing as a ratio: above 1.00 = scores more than the chances imply. Needs xG > 0.5 — otherwise one goal from 0.04 xG would read as 25× and top the table.",
    get:p=>{ const x=num(p.expected_goals); if (x==null||x<0.5) return null;
             return safeDiv(num(p.goals_scored) ?? 0, x); } },
  { key:"assists_minus_xa", label:"Assists − xA", short:"A−xA", group:"attack", band:"Over/under",
    dec:2, hi:true, derived:true, signed:true,
    note:"Above zero = his team-mates finish the chances he creates. Depends more on others than Goals − xG does.",
    get:p=>{ const a=num(p.assists), x=num(p.expected_assists); return (a==null||x==null)?null:a-x; } },
  { key:"assist_conversion", label:"Assist conversion (assists/xA)", short:"A/xA", group:"attack",
    band:"Over/under", dec:2, hi:true, derived:true,
    note:"Assists ÷ xA. Needs xA > 0.5 to mean anything.",
    get:p=>{ const x=num(p.expected_assists); if (x==null||x<0.5) return null;
             return safeDiv(num(p.assists) ?? 0, x); } },
  { key:"gi_minus_xgi", label:"G+A − xGI", short:"GA−xGI", group:"attack", band:"Over/under",
    dec:2, hi:true, derived:true, signed:true,
    note:"The total gap between real and expected involvements — the single strongest luck signal. A big negative is the classic \"due\" player; that is exactly what the IG score is built on.",
    get:p=>{ const gi=(num(p.goals_scored)??0)+(num(p.assists)??0), x=num(p.expected_goal_involvements);
             return x==null?null:gi-x; } },

  /* --- band: Shot quality ---
     UR BSD (sports.bzzoiro.com), maelt 8.8.2026. ThETTA ER I FYRSTA SINN
     SEM REPO-ID HEFUR PER-SKOT xG: Understat er gagnalaus, FBref og
     SofaScore skila 403 og ESPN gefur hnit EN ENGA xG (CLAUDE.md 6b/6e).
     Skrain nær AÐEINS yfir 2025/26 — onnur timabil syna "—" (VANTAR).
     Stadfest gegn FPL: mork r=0,9998 (389/391 nakvaem), xG r=0,995.    */
  { key:"bsd_shots", label:"Shots (BSD)", short:"Shots", group:"attack", band:"Shot quality",
    dec:0, hi:true,
    note:"Total shots in the season, counted from BSD's shot map. Not an FPL field. 2025/26 only — other seasons are empty because the source does not go back further.",
    get:p=>num(p._b_shots) },
  { key:"bsd_xg", label:"xG from shot map", short:"xG (shots)", group:"attack", band:"Shot quality",
    dec:2, hi:true,
    note:"xG summed from individual shots, an independent measurement of FPL's own xG. Measured agreement across 391 matched players: r = 0.995. Where the two disagree, they are different xG models, not an error.",
    get:p=>num(p._b_xg) },
  { key:"bsd_npxg", label:"npxG (penalties removed)", short:"npxG", group:"attack", band:"Shot quality",
    dec:2, hi:true,
    note:"xG with penalties taken out. A penalty is worth 0.788 xG on average and says nothing about creating chances — it says he is the designated taker, which is shown separately under set pieces. Measured here: Bruno Fernandes falls from 10.9 xG to 6.1 npxG (43% was penalties), Palmer 10.6 to 5.8, Le Fée 5.2 to 2.0. Without this the xG column ranks penalty takers, not shot creators.",
    get:p=>num(p._b_npxg) },
  { key:"bsd_xg_per_shot", label:"xG per shot", short:"xG/shot", group:"attack", band:"Shot quality",
    dec:3, hi:true,
    note:"Average quality of the chances he gets. High = he shoots from good positions; low = he shoots from distance. This is the number that separates a poacher from a long-range shooter, and no FPL field carries it.",
    get:p=>num(p._b_xgs) },
  { key:"bsd_big", label:"Big chances (derived)", short:"Big ch.", group:"attack", band:"Shot quality",
    dec:0, hi:true, derived:true,
    note:"DERIVED, NOT AN OPTA COUNT. BSD's own per-player big-chance field exists but is ALWAYS ZERO, so it is not used. Instead this counts shots with xG ≥ 0.18 — a threshold fitted against BSD's real TEAM-level big-chance totals over 748 team-matches (MAE 0.75, r 0.77). The obvious guess of 0.35 measured almost twice as badly (MAE 1.39).",
    get:p=>num(p._b_big) },
  { key:"bsd_in_box", label:"Shots inside the box", short:"In box", group:"attack", band:"Shot quality",
    dec:0, hi:true,
    note:"Shots taken inside the penalty area, from shot coordinates. The box edge was fitted against BSD's own team-level inside-box counts over 760 team-matches (MAE 0.13). BSD's x axis is a share of the FULL pitch, a different scale from ESPN's — measured here rather than carried over.",
    get:p=>num(p._b_inbox) },

  /* --- band: Set-piece threat ---
     MAELT 8.8.2026: 31,2% allra skota koma ur fostum leikatridum (horn
     17,6% · set-piece 5,9% · innkast-fast 5,1% · aukaspyrna 2,6%). Thad er
     ADGREINANLEGT per leikmann og er raunverulegt FPL-forskot: "hver ognar
     ur hornum" er onnur spurning en "hver skorar mest". Andlitsprof:
     efstu menn i hlutfalli eru Thiaw 98%, van Dijk 97%, Gabriel 97% —
     nakvaemlega hornamidverdirnir.
     Vitaspyrnur maelast med medal-xG 0,788, sem er thekkta vitahlutfallid
     og thar med sjalfstaed stadfesting a xG-likani BSD.                  */
  { key:"bsd_sp_xg", label:"Set-piece xG", short:"SP xG", group:"attack", band:"Set-piece threat",
    dec:2, hi:true,
    note:"xG from dead-ball situations only — corners, free kicks, set-piece throws. Measured: 31.2% of all shots come from these. This is the number that finds a centre-back who is a genuine corner threat.",
    get:p=>num(p._b_sp_xg) },
  { key:"bsd_sp_share", label:"Set-piece share of xG", short:"SP %", group:"attack",
    band:"Set-piece threat", dec:0, hi:true, pct:true, derived:true,
    note:"What share of his xG comes from dead balls. Near 100% means he is ONLY a set-piece threat (typical centre-back); a forward around 25% gets most of his chances in open play. High share plus low total is a corner specialist, not a goal source.",
    get:p=>num(p._b_sp_share) },
  { key:"bsd_op_xg", label:"Open-play xG", short:"OP xG", group:"attack", band:"Set-piece threat",
    dec:2, hi:true,
    note:"xG from open play only (assisted, regular and fast-break shots). Read against set-piece xG: open play is far more repeatable, because it does not depend on keeping the set-piece role.",
    get:p=>num(p._b_op_xg) },
  { key:"bsd_head_xg", label:"Headed xG", short:"Head xG", group:"attack", band:"Set-piece threat",
    dec:2, hi:true, note:"xG from headers. 18.7% of all shots are headed. Aerial goal threat, which no FPL field carries.",
    get:p=>num(p._b_head_xg) },
  { key:"bsd_head", label:"Headed shots", short:"Headers", group:"attack", band:"Set-piece threat",
    dec:0, hi:true, note:"Number of headed attempts across the season (BSD).",
    get:p=>num(p._b_head) },
  { key:"bsd_wood", label:"Hit the woodwork", short:"Woodwork", group:"attack",
    band:"Set-piece threat", dec:0, hi:true,
    note:"Shots that struck the post or bar — BSD reports it as its own outcome type. The repo has carried woodwork as permanently empty since Understat died (see 6b); this is the first real count. Pure bad luck, so it belongs next to Goals − xG rather than being read on its own.",
    get:p=>num(p._b_wood) },

  /* --- band: Creation ---
     `key_pass` er RAUNVERULEG tala fyrir "faeri skopud". ESPN-dalkurinn i
     Ogn er lesinn UR TEXTA og er GOLF (76% skota nefna upplegg, 6f).   */
  { key:"bsd_key_pass", label:"Chances created", short:"Chances", group:"attack", band:"Creation",
    dec:0, hi:true,
    note:"Passes that led directly to a shot — the real count, not the text-derived estimate in the Threat group. FPL has no equivalent field: Creativity is an index, not a count. 2025/26 only.",
    get:p=>num(p._b_kp) },
  { key:"bsd_crosses", label:"Crosses", short:"Cross", group:"attack", band:"Creation",
    dec:0, hi:true, note:"Total crosses attempted in the season (BSD). 2025/26 only.",
    get:p=>num(p._b_cross) },
  { key:"bsd_crosses_acc", label:"Crosses completed", short:"Cross ok", group:"attack", band:"Creation",
    dec:0, hi:true, note:"Crosses that found a team-mate. Read next to total crosses — a high total with a low completion is volume, not creation.",
    get:p=>num(p._b_crossa) },
  { key:"bsd_touches", label:"Touches", short:"Touches", group:"attack", band:"Creation",
    dec:0, hi:true, note:"Total touches of the ball across the season (BSD). A volume measure of involvement, not of quality.",
    get:p=>num(p._b_touch) },
  { key:"bsd_dribbles", label:"Dribbles won", short:"Dribbles", group:"attack", band:"Creation",
    dec:0, hi:true, note:"Take-ons completed (BSD). 2025/26 only.",
    get:p=>num(p._b_drib) },
  { key:"bsd_fouled", label:"Times fouled", short:"Fouled", group:"attack", band:"Creation",
    dec:0, hi:true, note:"How often he was fouled — a proxy for how much he is targeted, and it feeds set pieces in dangerous areas.",
    get:p=>num(p._b_fouled) },
  { key:"bsd_rating", label:"Match rating (BSD)", short:"Rating", group:"attack", band:"Creation",
    dec:2, hi:true,
    note:"Average per-match rating from BSD across the season. It is THEIR model's opinion, not a measured FPL quantity — useful as a second view, never as a reason on its own.",
    get:p=>num(p._b_rating) },

  /* --- band: Indexes ---
     FLUTT UR GRUNNI 8.8.2026 ad beidni notanda. ICT, ahrif, skopun og ogn
     eru SOKNAR-tolur (threat er bokstaflega staðsetningar-haetta i teig) og
     i Grunni sátu thaer a milli verds og eignarhalds. Hver /90 stendur nu
     VID SINA grunntolu — thad var onnur beidni i somu ferd.             */
  { key:"ict_index", label:"ICT index", short:"ICT", group:"attack", band:"Indexes",
    dec:1, hi:true, note:"FPL's combined Influence + Creativity + Threat index. A summary of everything he does, not just returns.",
    get:p=>num(p.ict_index) },
  { key:"ict_per_90", label:"ICT index per 90", short:"ICT/90", group:"attack", band:"Indexes",
    dec:2, hi:true, derived:true, note:"ICT index per 90 minutes played — comparable between a starter and a substitute.",
    get: per90of("ict_index") },
  { key:"influence", label:"Influence", short:"Infl", group:"attack", band:"Indexes",
    dec:1, hi:true, note:"FPL's Influence: how much he affects the result — goals, assists, saves, decisive defensive actions.",
    get:p=>num(p.influence) },
  { key:"influence_per_90", label:"Influence per 90", short:"Infl/90", group:"attack", band:"Indexes",
    dec:1, hi:true, derived:true, note:"Influence per 90 minutes played.",
    get: per90of("influence") },
  { key:"creativity", label:"Creativity", short:"Creat", group:"attack", band:"Indexes",
    dec:1, hi:true, note:"FPL's Creativity: chance creation, passes into danger, crosses. This is the raw material behind the IA score.",
    get:p=>num(p.creativity) },
  { key:"creativity_per_90", label:"Creativity per 90", short:"Creat/90", group:"attack", band:"Indexes",
    dec:1, hi:true, derived:true, note:"Creativity per 90 minutes played. This is exactly what the IA score uses — measured as the best form of the question \"who creates chances without getting the assist?\"",
    get: per90of("creativity") },
  { key:"threat", label:"Threat", group:"attack", band:"Indexes",
    dec:1, hi:true, note:"FPL's Threat: how dangerous the positions he gets into are — shot volume and shot location. High threat with few goals is the most common \"due\" pattern.",
    get:p=>num(p.threat) },
  { key:"threat_per_90", label:"Threat per 90", short:"Threat/90", group:"attack", band:"Indexes",
    dec:1, hi:true, derived:true, note:"Threat per 90 minutes played.",
    get: per90of("threat") },

  /* --- band: Imminent --- */
  { key:"mo", label:"Imminent goal (IG)", short:"IG", group:"attack", band:"Imminent",
    dec:2, hi:true, live_only:true, derived:true,
    note:"OUR MEASURED SCORE: xGI × 0.8 + threat/25 × 0.3 + bad luck × 0.2 over the last 4 finished gameweeks. Only for players with 0–1 involvements in that window — the point is \"he is about to score\". Measured: the top decile returns 2.89× the average over the next four gameweeks. Live figure; goalkeepers never get it (never measured for them).",
    get:p=>num(p._mo) },
  { key:"ao", label:"Imminent assist (IA)", short:"IA", group:"attack", band:"Imminent",
    dec:1, hi:true, live_only:true, derived:true,
    note:"OUR MEASURED SCORE: plain creativity/90 over the form window. A composite version was tested and LOST in 0 of 3 seasons, so the plain figure stands. Live figure; goalkeepers never get it.",
    get:p=>num(p._ao) },

  /* --- band: Penalties --- */
  { key:"pen_order", label:"Penalty order", short:"Order", group:"attack", band:"Penalties",
    dec:0, hi:false, live_only:true,
    note:"1 = first penalty taker at his club. LOWER IS BETTER. The strongest single captaincy signal in the data. Today's order — it does not follow the selected season.",
    get:p=>num(p.penalties_order) },
  { key:"penalties_missed", label:"Penalties missed", short:"Missed", group:"attack", band:"Penalties",
    dec:0, hi:false, note:"Penalties missed (−2 points each).",
    get:p=>num(p.penalties_missed) },

  /* ================= VORN ================= */
  /* --- band: Clean sheets --- */
  /* --- OGN (ESPN, sidasta lokna umferd) ---
     FLUTT UR EIGIN FLIPA INN I SOKN 8.8.2026 ad beidni. Thetta eru
     soknartolur og attu aldrei heima i serflokki; serflokkurinn thydi
     bara ad notandinn thurfti ad skipta um flokk til ad sja skot vid
     hlidina a xG. Bondin halda ser (ESPN, ein umferd) og bera thad
     sjalf i heiti og note.
     ROÐIN SKIPTIR MALI: bond verda ad vera SAMFELLD innan flokks, svo
     blokkin er flutt LIKAMLEGA hingad — ekki bara merkt upp a nytt. */
  { key:"espn_shots", label:"Shots", group:"attack", band:"Shots",
    dec:0, hi:true, live_only:true,
    note:"Shots in the LAST FINISHED gameweek, read from ESPN's match feed. One gameweek only — it is a snapshot, not a season total.",
    get:p=>num(p._espn_shots) },
  { key:"espn_sot", label:"Shots on target", short:"On target", group:"attack", band:"Shots",
    dec:0, hi:true, live_only:true, note:"Shots on target in the last finished gameweek (ESPN).",
    get:p=>num(p._espn_sot) },
  { key:"espn_accuracy", label:"Shot accuracy", short:"Accuracy", group:"attack", band:"Shots",
    dec:0, hi:true, pct:true, live_only:true, derived:true,
    note:"Shots on target ÷ shots. This is ACCURACY, not finishing — ESPN gives no xG per shot, so we cannot say how good the chances were.",
    get:p=>{ const s=num(p._espn_shots); if (!s) return null;
             return safeDiv(num(p._espn_sot) ?? 0, s)*100; } },
  { key:"espn_in_box", label:"Shots in the box", short:"In box", group:"attack", band:"Shots",
    dec:0, hi:true, live_only:true,
    note:"Shots from inside the penalty area, taken from ESPN's own zone text (not from a coordinate rule). Location beats volume: a shot in the box is worth several from distance.",
    get:p=>num(p._espn_in_box) },
  { key:"espn_woodwork", label:"Hit the woodwork", short:"Wood", group:"attack", band:"Shots",
    dec:0, hi:true, live_only:true,
    note:"Shots that hit the post or the bar — its own event type at ESPN. The purest bad-luck signal there is.",
    get:p=>num(p._espn_woodwork) },

  /* --- band: Chance creation --- */
  { key:"espn_created", label:"Chances created", short:"Created", group:"attack", band:"Chance creation",
    dec:0, hi:true, live_only:true,
    note:"How often he set up a shot in the last finished gameweek, read out of ESPN's commentary (\"Assisted by X …\"). 76% of shots name their assist, so this is a floor, not an exact count. NOT the same thing as Big Chances — see the note on Shot accuracy.",
    get:p=>num(p._espn_created) },
  { key:"espn_cross", label:"Crosses → shots", short:"Crosses", group:"attack", band:"Chance creation",
    dec:0, hi:true, live_only:true,
    note:"Crosses that LED TO A SHOT — not raw cross counts. A raw cross number rewards hopeful balls into the box; this one only counts when it worked.",
    get:p=>num(p._espn_cross) },
  { key:"espn_through", label:"Through balls", short:"Through", group:"attack", band:"Chance creation",
    dec:0, hi:true, live_only:true, note:"Passes described as a through ball that led to a shot (ESPN commentary).",
    get:p=>num(p._espn_through) },

  /* ================= JOFNUDUR (ARON-STUDULL) ================= */
  { key:"clean_sheets", label:"Clean sheets", short:"CS", group:"defence", band:"Clean sheets",
    dec:0, hi:true, pos:[1,2,3],
    note:"Clean sheets he was credited with. FPL's rule is 60+ minutes without conceding WHILE HE IS ON THE PITCH, so it is counted per player and not per team.",
    get:p=>num(p.clean_sheets) },
  { key:"cs_per_90", label:"Clean sheets per 90", short:"CS/90", group:"defence", band:"Clean sheets",
    dec:2, hi:true, pos:[1,2,3], note:"Official FPL figure (clean_sheets_per_90) — divides by minutes, unlike CS % which divides by starts.",
    get:p=>num(p.clean_sheets_per_90) },
  { key:"cs_pct", label:"Clean sheet %", short:"CS %", group:"defence", band:"Clean sheets",
    dec:0, hi:true, pos:[1,2,3], derived:true, pct:true,
    note:"Clean sheets ÷ starts — the share of his starts that ended in a clean sheet.",
    get:p=>{ const r=safeDiv(num(p.clean_sheets), num(p.starts)); return r==null?null:r*100; } },

  /* --- band: Conceded --- */
  { key:"goals_conceded", label:"Goals conceded", short:"GC", group:"defence", band:"Conceded",
    dec:0, hi:false, pos:[1,2,3], note:"Goals conceded while he was on the pitch. LOWER IS BETTER — defenders and keepers lose a point per two conceded.",
    get:p=>num(p.goals_conceded) },
  { key:"gc_per_90", label:"Conceded per 90", short:"GC/90", group:"defence", band:"Conceded",
    dec:2, hi:false, pos:[1,2,3], note:"Official FPL figure (goals_conceded_per_90). LOWER IS BETTER.",
    get:p=>num(p.goals_conceded_per_90) },
  { key:"expected_goals_conceded", label:"xGC (expected conceded)", short:"xGC", group:"defence",
    band:"Conceded", dec:2, hi:false, pos:[1,2,3],
    note:"Expected goals conceded — the quality of the chances his team gave away. LOWER IS BETTER, and it is a far better guide to future clean sheets than goals conceded.",
    get:p=>num(p.expected_goals_conceded) },
  { key:"xgc_per_90", label:"xGC per 90", short:"xGC/90", group:"defence", band:"Conceded",
    dec:2, hi:false, pos:[1,2,3], note:"Official FPL figure (expected_goals_conceded_per_90). LOWER IS BETTER.",
    get:p=>num(p.expected_goals_conceded_per_90) },
  { key:"gc_minus_xgc", label:"Conceded − xGC", short:"GC−xGC", group:"defence", band:"Conceded",
    dec:2, hi:false, pos:[1,2,3], derived:true, signed:true,
    note:"Below zero = the defence (or the keeper) holds up better than the chances imply. Above zero = they have been unlucky or the keeper is at fault, and clean sheets should come.",
    get:p=>{ const g=num(p.goals_conceded), x=num(p.expected_goals_conceded); return (g==null||x==null)?null:g-x; } },

  /* --- band: Goalkeeping --- */
  { key:"saves", label:"Saves", group:"defence", band:"Goalkeeping",
    dec:0, hi:true, pos:[1], note:"Saves made. Every third save is a point, so a busy keeper in a weak side can out-score a quiet one.",
    get:p=>num(p.saves) },
  { key:"saves_per_90", label:"Saves per 90", short:"Saves/90", group:"defence", band:"Goalkeeping",
    dec:2, hi:true, pos:[1], note:"Official FPL figure (saves_per_90).",
    get:p=>num(p.saves_per_90) },
  { key:"save_pct", label:"Save %", group:"defence", band:"Goalkeeping",
    dec:0, hi:true, pos:[1], derived:true, pct:true,
    note:"Saves ÷ (saves + goals conceded). ROUGH: FPL does not publish shots on target per keeper, so a deflected goal counts against him the same as a howler.",
    get:p=>{ const s=num(p.saves), g=num(p.goals_conceded);
             if (s==null||g==null||(s+g)===0) return null; return (s/(s+g))*100; } },
  { key:"penalties_saved", label:"Penalty saves (PS)", short:"PS", group:"defence", band:"Goalkeeping",
    dec:0, hi:true, pos:[1], note:"Penalties saved — 5 points each, the biggest single bonus available to a goalkeeper.",
    get:p=>num(p.penalties_saved) },

  /* --- band: DefCon ---
     DC ER VILJANDI UTAN FFDR (kafli 3 i CLAUDE.md): hun maelir vinnualag
     varnar og fylgir oft THYNGRI leikjum, svo hun dregur i gagnstaeda att
     vid hreint blad. Hun lifir a spjoldum og i thessari toflu.          */
  { key:"defensive_contribution", label:"DefCon total", short:"DC", group:"defence", band:"DefCon",
    dec:0, hi:true, note:"FPL DefCon points earned. DC is DELIBERATELY outside our FFDR difficulty model: it tracks defensive WORKLOAD, which rises in HARDER matches, so blending it with clean-sheet difficulty would make the two signals eat each other.",
    get:p=>num(p.defensive_contribution) },
  { key:"dc_per_90", label:"DefCon per 90", short:"DC/90", group:"defence", band:"DefCon",
    dec:2, hi:true, note:"Official FPL figure (defensive_contribution_per_90).",
    get:p=>num(p.defensive_contribution_per_90) },
  { key:"dc_hit_adj", label:"DC hit % (adjusted)", short:"DC hit%", group:"defence", band:"DefCon",
    dec:0, hi:true, pct:true, derived:true,
    note:"Share of his starts that reached the DefCon threshold (10 for defenders, 12 for midfielders and forwards), SHRUNK for sample size (empirical Bayes, k=10 towards the position mean). USE THIS ONE, not the raw figure — and read the games column next to it.",
    get:p=>{ const v=num(p._dc_hit_adj); return v==null?null:v*100; } },
  { key:"dc_hit_raw", label:"DC hit % (raw)", short:"DC raw%", group:"defence", band:"DefCon",
    dec:0, hi:true, pct:true, derived:true,
    note:"Raw hit rate (hits ÷ starts). IT OVERESTIMATES on small samples — measured against an external benchmark, 75% at n=12 turned out to be about 30% in truth. Shown for transparency only; the adjusted figure is the one that counts.",
    get:p=>{ const v=num(p._dc_hit_raw); return v==null?null:v*100; } },
  { key:"dc_starts", label:"DC games (n)", short:"DC n", group:"defence", band:"DefCon",
    dec:0, hi:true, derived:true, note:"How many games sit behind the hit rate. Small n means the raw percentage says very little.",
    get:p=>num(p._dc_starts) },

  /* --- band: Defensive actions --- */
  { key:"clearances_blocks_interceptions", label:"Clearances/blocks/int", short:"CBI",
    group:"defence", band:"Defensive actions", dec:0, hi:true,
    note:"Clearances, blocks and interceptions added together — the bulk of a defender's DefCon count.",
    get:p=>num(p.clearances_blocks_interceptions) },
  { key:"cbi_per_90", label:"CBI per 90", short:"CBI/90", group:"defence", band:"Defensive actions",
    dec:2, hi:true, derived:true, note:"Clearances, blocks and interceptions per 90 minutes played.",
    get: per90of("clearances_blocks_interceptions") },
  { key:"tackles", label:"Tackles", short:"Tack", group:"defence", band:"Defensive actions",
    dec:0, hi:true, note:"Tackles. Counts towards DefCon for midfielders and forwards.",
    get:p=>num(p.tackles) },
  { key:"tackles_per_90", label:"Tackles per 90", short:"Tack/90", group:"defence",
    band:"Defensive actions", dec:2, hi:true, derived:true, note:"Tackles per 90 minutes played.",
    get: per90of("tackles") },
  { key:"recoveries", label:"Recoveries", short:"Recov", group:"defence", band:"Defensive actions",
    dec:0, hi:true, note:"Ball recoveries. Counts towards DefCon for midfielders and forwards, and it is the term that decides most of their hit rate.",
    get:p=>num(p.recoveries) },
  { key:"recoveries_per_90", label:"Recoveries per 90", short:"Recov/90", group:"defence",
    band:"Defensive actions", dec:2, hi:true, derived:true, note:"Ball recoveries per 90 minutes played.",
    get: per90of("recoveries") },

  /* --- band: Defensive detail ---
     FPL bundlar hreinsanir, stodvanir og stodvud skot i EINA tolu (CBI).
     BSD heldur theim ADSKILDUM, svo hér sest HVAD madurinn gerir — midjumadur
     med 60 stodvanir og 5 hreinsanir er annar leikmadur en oful sama tala i
     hina attina. 2025/26 eingongu.                                        */
  { key:"bsd_tackles", label:"Tackles (BSD)", short:"Tack (B)", group:"defence",
    band:"Defensive detail", dec:0, hi:true,
    note:"Tackles as counted by BSD. Shown next to the FPL tackle count deliberately: two independent sources for the same action, so a gap is visible rather than hidden.",
    get:p=>num(p._b_tack) },
  { key:"bsd_interceptions", label:"Interceptions", short:"Intercept", group:"defence",
    band:"Defensive detail", dec:0, hi:true,
    note:"Interceptions on their own. FPL only publishes them inside the combined CBI total, so this is the first time the term can be read separately.",
    get:p=>num(p._b_int) },
  { key:"bsd_clearances", label:"Clearances", short:"Clear", group:"defence",
    band:"Defensive detail", dec:0, hi:true,
    note:"Clearances on their own, split out of FPL's combined CBI total. High clearances usually means a defender under sustained pressure, which pulls against clean sheets.",
    get:p=>num(p._b_clr) },
  { key:"bsd_blocks", label:"Blocked shots", short:"Blocks", group:"defence",
    band:"Defensive detail", dec:0, hi:true,
    note:"Opposition shots he blocked, split out of FPL's combined CBI total.",
    get:p=>num(p._b_blk) },
  { key:"bsd_aerial", label:"Aerial duels won", short:"Aerials", group:"defence",
    band:"Defensive detail", dec:0, hi:true,
    note:"Aerial duels won across the season (BSD). No FPL field carries this at all.",
    get:p=>num(p._b_aer) },

  /* ================= OGN (ESPN, sidasta lokna umferd) ================= */
  /* --- band: Shots --- */
  { key:"aron_net", label:"Consistency (Aron)", short:"Aron", group:"aron", band:"Consistency",
    dec:2, hi:true, signed:true, derived:true,
    note:"ARON COEFFICIENT: share of games with 4+ points MINUS share with 2 or fewer. Higher = steady 4–6 every week instead of 2-2-2-then-11. MEASURED AND DOCUMENTED: it DESCRIBES THE PAST and does not predict — the hit rate tracks points/match at r=0.90, and once you control for points AND price inside a position no persistent residual is left. So compare players in the SAME POSITION at a SIMILAR PRICE. Never used in any ranking.",
    get:p=>num(p._aron) },
  { key:"aron_hit4", label:"4+ points %", short:"4+ pts", group:"aron", band:"Consistency",
    dec:0, hi:true, pct:true, derived:true,
    note:"Share of GAMES PLAYED with 4+ points, shrunk for sample size (k=10). The threshold 4 is measured, not chosen: 5 and 6 are worse, because the explosive 2-2-2-then-11 player clears 6 in his spikes, so a high threshold counts spikes rather than consistency.",
    get:p=>{ const v=num(p._hit4); return v==null?null:v*100; } },
  { key:"aron_blank", label:"2 points or fewer %", short:"≤2 pts", group:"aron", band:"Consistency",
    dec:0, hi:false, pct:true, derived:true,
    note:"Share of games played that returned 2 points or fewer. This is the downside term — LOWER IS BETTER, and it is what makes the coefficient more than a restatement of points per match.",
    get:p=>{ const v=num(p._blank); return v==null?null:v*100; } },
  { key:"aron_games", label:"Games (n)", short:"n", group:"aron", band:"Consistency",
    dec:0, hi:true, derived:true, note:"Games played behind the percentages. Small n means little.",
    get:p=>num(p._cgames) },

  /* ================= LEIKIR FRAMUNDAN ================= */
  { key:"fdr6", label:"FDR next 6", short:"FDR6", group:"fixtures", band:"Next 6 gameweeks",
    dec:2, hi:false, live_only:true,
    note:"Average official FPL difficulty over the next six matches. LOWER IS EASIER. Note that averaging over six weeks washes most of the signal out — measured, a fixture term is worth about 0.1 points out of 19 over that horizon.",
    get:p=>num(p._fdr6) },
  { key:"home6", label:"Home games in next 6", short:"Home", group:"fixtures", band:"Next 6 gameweeks",
    dec:0, hi:true, live_only:true, note:"How many of the next six matches are at home.",
    get:p=>num(p._home6) },
  { key:"fix6", label:"Matches in next 6", short:"Games", group:"fixtures", band:"Next 6 gameweeks",
    dec:0, hi:true, live_only:true,
    note:"Counted per GAMEWEEK, not per match: below 6 = a blank gameweek is coming, above 6 = a double. A blank is worse than any hard fixture, because it is a guaranteed zero.",
    get:p=>num(p._fix6) },
  { key:"team_cs_prob", label:"Team clean sheet prob.", short:"Team CS", group:"fixtures",
    band:"Team, next match", dec:0, hi:true, pct:true, live_only:true,
    note:"Probability of a clean sheet in the next match, from the bookmaker line (odds.json) — not from our model. The market is the single strongest input we have for defensive difficulty.",
    get:p=>num(p._team_cs) },
  { key:"team_dc", label:"Team DefCon chance", short:"Team DC", group:"fixtures",
    band:"Team, next match", dec:0, hi:true, live_only:true,
    note:"How much defensive work his team is likely to have in the next match — the opportunity side of DefCon. High means a busy defence, which is good for DC points and bad for a clean sheet.",
    get:p=>num(p._team_dc) },

  /* ================= FOST LEIKATRIDI OG SPJOLD ================= */
  { key:"fk_order", label:"Free-kick order", short:"FK", group:"setp", band:"Set-piece order",
    dec:0, hi:false, live_only:true, note:"1 = first direct free-kick taker at his club. LOWER IS BETTER. Today's order — it does not follow the selected season.",
    get:p=>num(p.direct_freekicks_order) },
  { key:"ck_order", label:"Corner order", short:"Corners", group:"setp", band:"Set-piece order",
    dec:0, hi:false, live_only:true,
    note:"Corner and indirect free-kick order. MEASURED: FPL numbers corners on a different scale — the range is 4–10 and NO club has a 1, so \"first taker\" here means the lowest number at that club, not the number 1.",
    get:p=>num(p.corners_and_indirect_freekicks_order) },
  { key:"yellow_cards", label:"Yellow cards", short:"Yellow", group:"setp", band:"Cards",
    dec:0, hi:false, note:"Yellow cards (−1 point each). LOWER IS BETTER.",
    get:p=>num(p.yellow_cards) },
  { key:"red_cards", label:"Red cards", short:"Red", group:"setp", band:"Cards",
    dec:0, hi:false, note:"Red cards (−3 points, plus the suspension that follows). LOWER IS BETTER.",
    get:p=>num(p.red_cards) },
  { key:"cards_per_90", label:"Cards per 90", short:"Cards/90", group:"setp", band:"Cards",
    dec:2, hi:false, derived:true, note:"Yellow and red cards per 90 minutes played. LOWER IS BETTER — this is the honest form of the question, since a card count rewards players who barely play.",
    get:p=>per90((num(p.yellow_cards) ?? 0) + (num(p.red_cards) ?? 0), num(p.minutes)) },
  { key:"own_goals", label:"Own goals", short:"OG", group:"setp", band:"Cards",
    dec:0, hi:false, note:"Own goals (−2 points each). LOWER IS BETTER.",
    get:p=>num(p.own_goals) },
];

/* MAELT-OG-FJARLAEGT 8.8.2026 (beidni notanda): `bps_per_90`,
   `mins_per_million` og `bonus_per_million`. Thaer voru afleiddar tolur
   sem engin akvordun hvildi a — BPS/90 er nanast einræn i `bonus_per_90`,
   og badar per-milljon tolurnar erfa thann sama galla sem maeldist a
   `aron/verd` (kafli 6o): verd er sjalft mjog stodugt, svo hlutfall
   erfir stodugleikann AN ThESS ad upplysingar baetist vid, og radar
   odyrum monnum efst. `pts_per_million` er eftir thvi ad hun er
   OPINBER FPL-tala (value_season) sem notendur bera saman vid annad.  */

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
/* VERDBREYTING KREFST ENGRA MINUTNA. `cost_change_start` var her en
   `cost_change_event` gleymdist: 0-minutna leikmadur sem HAEKKAR i verdi i
   yfirstandandi umferd (daemigert: nyr leikmadur i kastljosi) datt thvi ut
   af "Price change (GW)"-stigatoflunni og taldist `isIncoherent` — sem er
   fyrirvarinn um ad HEIMILDIN LJUGI. Hun lygur ekki hér; verd hreyfast an
   thess ad spilad se.                                                    */
const MINUTES_INDEPENDENT = new Set([
  "minutes", "now_cost", "selected_by_percent", "cost_change_start",
  "cost_change_event", "net_transfers_event", "pts_per_million",
]);

export function isIncoherent(p, statKey, v) {
  if (!p || typeof p !== "object") return false;
  if (v == null || v <= 0 || !Number.isFinite(v)) return false;
  if (MINUTES_INDEPENDENT.has(statKey)) return false;
  return (num(p.minutes) ?? 0) === 0;
}

/* ============================================================
   LIFANDI TIMABILS-ROD — EIN UTFAERSLA (11.8.2026)

   Thetta fall var skilgreint TVISVAR, i tveimur birtingar-skram:
     src/Compare.jsx    `liveRow(p)`      — samanburdar-taflan
     src/PlayerPanel.jsx `liveRecord(p)`  — timabils-taflan a spjaldinu
   Baedi bjuggu til SOMU rod ur sama FPL-leikmanni, og thau HOFDU ThEGAR
   REKID I SUNDUR a thremur stodum:
     1. `points_per_90`  — adeins i PlayerPanel
     2. `rank`/`rank_of` — adeins i PlayerPanel (alltaf null)
     3. `dc_per_start`   — PlayerPanel NAMUNDADI (toFixed 2), Compare ekki

   ThRIDJA ATRIDID ER EKKI REK HELDUR ASETNINGUR, og thad er astaedan
   fyrir thvi ad thetta fall skilar **ONAMUNDUDUM** tolum:
   PlayerPanel setur lifandi timabilid VID HLID eldri timabila sem koma ur
   `player_seasons.json`, og thau eru geymd med TVEIMUR aukastofum (maelt:
   10.16 · 4.31 · 8.32). Namundunin thar er thvi til ad lifandi dalkurinn
   hafi SOMU nakvaemni og dalkarnir vid hlidina — ekki tilviljun.
   Compare namundar sjalft i birtingu (`dec:1`).

   ThVI ER REGLAN: KJARNINN SKILAR HRAU, HVER NOTANDI SNIDUR SITT.
   Hefdi namundunin verid flutt hingad inn hefdi Compare fengid
   TVOFALDA namundun (2 aukastafir -> 1), sem getur breytt birtri tolu
   i jadartilfellum (1,049 -> "1,0" verdur 1,05 -> "1,1").

   `points_per_90` og `rank` eru EKKI her heldur: thau eru snid
   PlayerPanel-taflunnar, ekki eiginleikar leikmannsins.
   ============================================================ */
export function liveSeasonRow(p) {
  const mins = num(p.minutes) ?? 0, starts = num(p.starts) ?? 0;
  const dc = num(p.defensive_contribution);
  return {
    total_points: num(p.total_points), minutes: mins, starts,
    goals_scored: num(p.goals_scored), assists: num(p.assists),
    expected_goals: num(p.expected_goals), expected_goals_per_90: num(p.expected_goals_per_90),
    expected_assists: num(p.expected_assists), expected_assists_per_90: num(p.expected_assists_per_90),
    expected_goal_involvements: num(p.expected_goal_involvements),
    expected_goals_conceded: num(p.expected_goals_conceded),
    clean_sheets: num(p.clean_sheets), goals_conceded: num(p.goals_conceded),
    saves: num(p.saves), bonus: num(p.bonus), bps: num(p.bps),
    yellow_cards: num(p.yellow_cards), red_cards: num(p.red_cards),
    defensive_contribution: dc,
    dc_per_start: (dc != null && starts > 0) ? dc / starts : null,
    now_cost: num(p.now_cost),
  };
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
/* NORMUNIN OG TAKNUNIN BUA I src/names.js (11.8.2026) — thaer voru
   skilgreindar HER OG I src/bsd.js, badar `export`-adar undir nafninu
   `normName`, og BADAR poradar vid somu FPL-nofn. Munurinn var
   urfellingarmerkid ("matt oriley" a moti "matt o riley"). Maelt: 11 nofn
   af 1.185 skildu, EN 0 porun af 284 breytist, thvi bædi hlidin fara
   gegnum sama normolara. Sjá skyringuna i names.js.

   ThAER ERU ENDURFLUTTAR UT HER VILJANDI: tests/name-match.mjs flytur
   `normName`/`nameTokens` inn UR ThESSARI SKRA og ber thaer vid sjalfstaeda
   vidmids-utfaerslu a 9.464 raunporum. Endurflutningurinn heldur theim
   vordi virkum an afritunar.

   `nameScore` FYLGDI EKKI MED — sja names.js: hun er viljandi olik
   utgafunni i bsd.js og maelir annad.                                   */
export { normName, nameTokens } from "./names.js";
import { normName, nameTokens } from "./names.js";

/* Skor = fjoldi sameiginlegra orda, +0,5 ef SIDASTA ordid er sameiginlegt
   (eftirnafn a ad vega thyngra en fornafn).                               */
export function nameScore(a, b) {
  const ta = nameTokens(a), tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  /* EKKERT Set: nofn hafa 2-4 tokn og tvaer Set-uthlutanir per kall voru
     staersti kostnadurinn sem eftir stod (25.000 koll per cook-umferd).
     `ta.indexOf(t) !== i` gerir NAKVAEMLEGA thad sem `new Set(ta)` gerdi:
     telur hvert EINKVAEMT tak einu sinni. Sama skor, engin uthlutun.     */
  let shared = 0;
  for (let i = 0; i < ta.length; i++) {
    const t = ta[i];
    if (ta.indexOf(t) !== i) continue;
    if (tb.indexOf(t) !== -1) shared++;
  }
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

  /* HLUTURINN FYLGIR MED, EKKI VISITALAN — OG ThAD SKIPTIR MALI.
     `i` er visitala i SIUDU fylki (`rowsOf` hendir null/ogildum rodum) en
     uthlutunin las UR HRAA fylkinu (`shotPlayers[si]`). EIN null-faersla i
     `bsd_players.json`/`last_gw_shots.json` hlidradi thvi ollum visitolum
     a eftir henni og leikmenn fengu skot-tolur ANNARS MANNS — thogult.
     Maelt 10.8.2026 med einni null-rod fremst: Salah fekk NULL og Gakpo
     fekk 111 skot Salah. Thad er nakvaemlega villan sem athugasemdin hér
     ad ofan segir ad thetta fall se til ad koma i veg fyrir (Gomes-parid).
     Raungogn hafa engar null-radir i dag (0 af 206 og 0 af 393) svo thetta
     var LEYND jardsprengja, ekki virk villa — en hun springur vid fyrstu
     ogildu rod og hefdi ekki sest a skjanum.                            */
  const pairs = [];
  const R = rowsOf(rows);
  R.forEach((r, ri) => {
    for (const { sp, i } of (byTeam[r.team] || [])) {
      const sc = nameScore(r.name, sp.name);
      if (sc >= 1) pairs.push({ ri, si: i, sp, sc });
    }
  });
  // haesta skor fyrst; stodug rodun svo utkoman se endurtakanleg
  pairs.sort((a, b) => b.sc - a.sc || a.ri - b.ri || a.si - b.si);

  const takenRow = new Set(), takenShot = new Set(), assign = new Map();
  for (const { ri, si, sp } of pairs) {      // sc er thegar notad i rodun
    if (takenRow.has(ri) || takenShot.has(si)) continue;
    takenRow.add(ri); takenShot.add(si); assign.set(ri, sp);
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
  { key:"goal",       label: "Goal",        color:"#00b96b" },
  { key:"on_target",  label: "On target",      color:"#2563eb" },
  { key:"woodwork",   label: "Woodwork", color:"#c98a00" },
  { key:"off_target", label: "Off target",     color:"#8b8b95" },
  { key:"blocked",    label: "Blocked",     color:"#d92d3c" },
  { key:"own_goal",   label: "Own goal",  color:"#37003c" },
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

   ---- ENDURMAELT 29.7.2026: MAGNID ER xGI, EKKI xG ----
   `tests/mo-candidates.mjs`, FJOGUR timabil (2223-2526) ur
   data/fpl_player_gw.json. 2223 hefur xG og var timabil sem vogtolurnar
   HOFDU ALDREI SED — hreint ut-af-urtaki ofan a thad sem gert var 28.7.

   INNTAKID PASSADI EKKI VID MARKMIDID. Markmid mo er mork + ASSIST
   naestu 4 umferdir, en inntakid taldi adeins xG. xA var hvergi, thott
   utkoman sem vid maelum innihaldi assist. Sama aett af villu og
   markads-sóknarlidurinn i kafla 3.2 i CLAUDE.md: rett maelt a rongu
   inntaki gefur rett svar vid rangri spurningu.

   LAGAD: magnlidurinn er nu (xg + xa), sama vog (0,8). ENGIR NYIR STIKAR.

   lyfting efsta tiundarhlutans, 4 timabil:
     markmid                 xG (var)   xGI (er)   abati
     mork+assist naestu 4      2,379      2,498    +0,119  (3/4 timabil)
     STIG naestu 4             1,268      1,311    +0,043  (3/4 timabil)

   AD THETTA SE MERKI OG EKKI FITT — thrjar odhadar staðfestingar:
     1. LOSO-tun (vogir valdar a 3 timabilum, maelt a hinu) velur xa-vog
        0,8 / 1,0 / 1,0 / 1,0 — STODUG i ollum fjorum brotum. Vogir sem
        eru havadi hoppa og skipta formerki (sbr. def/att-blondun i kafla 3).
     2. Tunada thakid er 2,504; thessi utgafa AN nyrra stika naer 2,498 —
        99,8% af abatanum fæst an thess ad fitta nokkud.
     3. xA EITT er 1,945 — VERRA en xG eitt (2,130). Abatinn er samlegd
        milli theirra, ekki ad annad inntak hafi verid skipt ut fyrir betra.

   HVAR ABATINN ER: DEF +0,226 (1,170 -> 1,395, +19%) · FWD +0,081 ·
   MID +0,059. Rokrett: framlog varnarmanna eru ohlutfallslega ASSIST og
   xG eitt sa thau naestum ekki.
   FYRIRVARI SEM MA EKKI FELA: innan FWD eingongu er lyftingin ~1,0 baedi
   fyrir og eftir (n=973) — mo greinir EKKI milli framherja. Hun virkar
   thegar borid er saman thvert a stodur.

   SKARAST MO OG AO NUNA? Skorun efstu tiundarhluta ferr 21% -> 30%.
   Their eru enn adgreindir listar. AO er OBREYTT: xA baetir engu ofan a
   creativity (maelt 28.7., xA-vog valdist alltaf 0) — thad stangast ekki
   a, thvi creativity kodar thegar faera-sköpun en xG gerir thad ekki.

   PROFAD OG HAFNAD i somu maelingu:
     mo x BYRJUNARLIKUR: vinnur a STIGUM (4/4, +0,045) en TAPAR a
       mork+assist (-0,040). LOSO velur veldi 1-2 fyrir stig en 0 fyrir
       mork — ekki einratt yfir markmid, svo thad fer EKKI inn. Byrjunar-
       likur eru birtar SER (Bekkjar-hætta og eigin dalkur), sem er
       gagnsaerra en ad blanda theim inn i mo.
     mo / min (per 90): 2,294 — VERRI. Magn i glugganum er thad sem gildir.
     mo an oheppnis-lidar: 2,379 — jafnt. Lidurinn ber engan abata a
       thessum gluggum en gerir engan skada; haldid til ad brjota ekki
       skjalfesta hegdun ad ósekju.
     oheppni ur xGI i stad xG (max(0, xgi-gi)): 2,493 a moti 2,498 — jafnt.
       Haldid xG-utgafunni: "oheppni" er EIGIN klúdur i daudafaerum, ekki
       samherja-klúdur i faerum sem hann lagdi upp.
   ============================================================ */

/* Vogir: xGI-summa (xG+xA), threat/25, og "oheppni" (adeins jakvaed att).
   Threat er deilt med 25 svo lidirnir seu a svipudum kvarda.
   `xg`-vogin liggur a (xg + xa) — sja hausinn: markmidid er mork+ASSIST,
   svo magnlidurinn verdur ad innihalda upplagshlutann lika.            */
export const MO_WEIGHTS = { xg: 0.8, threat: 0.3, unlucky: 0.2, threat_scale: 25 };
/* GLUGGINN SJALFUR ER EKKI HER. Hann er `IMM_WINDOW` i scripts/fetch.mjs, sem
   BYGGIR `imminent.json`; appid les gluggann sem pipeline skrifadi og velur
   hann ekki. Her stod afrit (`IMMINENT_WINDOW = 4`) sem EKKERT las — talan
   var maeld (mo/ao eru validerud vid 4 umferdir) og leit thvi ut fyrir ad
   vera virk, svo breyting a henni hefdi engu skilad. Tvo eintok af maeldri
   tolu, annad daudt, er nakvaemlega rekid sem CLAUDE.md fordast. */
export const IMMINENT_MAX_GI = 1;      // markhopur: 0-1 framlog i glugganum
export const IMMINENT_MIN_MINUTES = 180;

/* w: samtala gluggans { minutes, goals, assists, xg, xa, threat, creativity } */
export function moScore(w) {
  if (!w) return null;
  const xg = num(w.xg) ?? 0, xa = num(w.xa) ?? 0;
  const thr = num(w.threat) ?? 0, g = num(w.goals) ?? 0;
  const xgi = xg + xa;                            // MAGNID (maelt 29.7.: xGI > xG)
  const unlucky = Math.max(0, xg - g);            // adeins UNDIR vaentingum telur,
                                                  // og adeins EIGIN daudafaeri
  return +(MO_WEIGHTS.xg * xgi
         + MO_WEIGHTS.threat * (thr / MO_WEIGHTS.threat_scale)
         + MO_WEIGHTS.unlucky * unlucky).toFixed(3);
}

/* ============================================================
   UMFERDAR-BIL — "bara GW 30-38 sidasta timabil"

   Skilar rod med FPL-SVIDAHEITUM (total_points, expected_goals, ...) ur
   thjoppudu per-umferdar skranni. Thad er ASETT: STAT_DEFS lesa FPL-heiti,
   svo ALLIR 108 dalkar — lika afleiddu (per-90, hlutfoll, nyting) — virka
   OBREYTTIR a bilinu. Ef eg hefdi buid til ny heiti hefdi thurft annad
   dalkasett fyrir bila-syn, og tha vaeru tvaer dalkaskrar (sja 6i: einmitt
   thad sem a ekki ad gerast).

   HVAD ER **EKKI** HER OG HVERS VEGNA:
     verd, eignarhald, FPL-saeti, value_season, form, ICT, draumalid —
     thaer eru ARSTIDARTOLUR eda astand, ekki summur. Their eru EKKI settar
     i 0 heldur skildar eftir OSKILGREINDAR, svo `get()` skili null og
     dalkurinn birti "—" (VANTAR). Ad setja 0 vaeri ad birta ranga tolu.
   ============================================================ */
export const GW_SUM_TO_FPL = {
  mins: "minutes", starts: "starts", pts: "total_points",
  goals: "goals_scored", assists: "assists", cs: "clean_sheets",
  gc: "goals_conceded", saves: "saves", bonus: "bonus", bps: "bps",
  xg: "expected_goals", xa: "expected_assists", xgc: "expected_goals_conceded",
  dc: "defensive_contribution", cbit: "clearances_blocks_interceptions",
  threat: "threat", creat: "creativity", infl: "influence",
  recov: "recoveries", tack: "tackles", yc: "yellow_cards", rc: "red_cards",
};

/* entry: { t, p, gw } ur player_gw_{season}.json · file: skrain sjalf */
export function sumGwRange(entry, file, from, to) {
  if (!entry?.gw || !Array.isArray(file?.stats)) return null;
  const ix = {}; file.stats.forEach((k, i) => ix[k] = i);
  const scale = file.scale || {};
  const lo = Math.min(from, to), hi = Math.max(from, to);
  const sum = {};
  let apps = 0, rounds = 0;
  for (let r = lo; r <= hi; r++) {
    const arr = entry.gw[r] || entry.gw[String(r)];
    if (!arr) continue;
    rounds++;
    const mins = arr[ix.mins] ?? 0;
    if (mins > 0) apps++;
    for (const k of file.stats) sum[k] = (sum[k] ?? 0) + (arr[ix[k]] ?? 0) / (scale[k] || 1);
  }
  if (!rounds) return null;
  const out = {};
  for (const [k, fpl] of Object.entries(GW_SUM_TO_FPL))
    if (sum[k] != null) out[fpl] = +sum[k].toFixed(2);
  /* Afleiddar tolur sem FPL birtir sjalf a arstid — reiknadar ur summunum
     svo dalkarnir seu ekki tomir ad ósekju.                              */
  const mins = out.minutes ?? 0;
  const per90 = v => (mins > 0 && v != null) ? +((v / mins) * 90).toFixed(2) : null;
  /* xGI VAR TILBUID SEM 0,00 ThEGAR BADA INNTOKIN VANTADI (lagad 11.8.2026).
     `(xG ?? 0) + (xA ?? 0)` gefur `0.00` fyrir umferdar-bil sem BER ENGIN
     xG-gogn — og "0,00" er stadhaefing: hun segir "hann atti engar vaentar
     thatttokur", ekki "vid vitum ekki". Sama regla og allt annad i thessari
     skra fylgir (CLAUDE.md kafla 8: NULL ER EKKI NULL, tomt gildi er SLEPPT
     og fer sidast i baðar attir).
     Se annad inntakid til er summan raunveruleg — tha telst hitt sem 0, thvi
     "engin xA i bilinu" ER maeling ef vid hofum xG ur sama bili.          */
  out.expected_goal_involvements =
    (out.expected_goals == null && out.expected_assists == null)
      ? null
      : +(((out.expected_goals ?? 0) + (out.expected_assists ?? 0))).toFixed(2);
  out.expected_goals_per_90 = per90(out.expected_goals);
  out.expected_assists_per_90 = per90(out.expected_assists);
  out.expected_goal_involvements_per_90 = per90(out.expected_goal_involvements);
  out.expected_goals_conceded_per_90 = per90(out.expected_goals_conceded);
  out.saves_per_90 = per90(out.saves);
  out.clean_sheets_per_90 = per90(out.clean_sheets);
  out.goals_conceded_per_90 = per90(out.goals_conceded);
  out.defensive_contribution_per_90 = per90(out.defensive_contribution);
  out.starts_per_90 = per90(out.starts);
  /* points_per_game deilir med LEIKJUM SEM HANN SPILADI (mins>0), eins og
     FPL gerir — ekki med fjolda umferda i bilinu. Annars fengi sa sem var
     meiddur halft bilid ranglega lagt medaltal.                          */
  out.points_per_game = apps > 0 ? +((out.total_points ?? 0) / apps).toFixed(1) : null;
  out._gw_apps = apps;
  out._gw_rounds = rounds;
  return out;
}

/* ============================================================
   HVADA DALKAR FYLGJA EKKI UMFERDAR-BILINU — LEITT UT, EKKI HANDSKRIFAD

   Fyrsta utgafa var HANDSKRIFADUR listi af lyklum. 13 af 22 voru
   RANGIR — eg giskadi a heitin i stad thess ad lesa thau — svo merkingin
   birtist hvergi. Handskrifadur listi rekur auk thess fra STAT_DEFS um
   leid og dalki er baett vid.

   Nu er thad MAELT: hver dalkur er kalladur a tveimur profunar-rodum sem
   eru EINS nema summanlegu svidin hafa ólík gildi. Dalkur sem skilar SOMU
   tolu i badum tilvikum les ekki summurnar og fylgir thvi ekki bilinu.

   MARGFALDARARNIR ERU OLIKIR PER SVID, EKKI ALLIR x2: med jafnri
   tvofoldun halda HLUTFOLL ser ("stig per minutu" breytist ekki thott
   badir lidir tvofaldist) og slikir dalkar hefdu ranglega verid taldir
   blindir. Med olikum margfoldurum breytast hlutfoll lika.
   ============================================================ */
export function gwBlindKeys(defs = STAT_DEFS) {
  /* EINKVAEM GILDI PER SVID i BADUM profunum. Fyrsta utgafa notadi
     `10 + (i % 7)` og TVAER svid fengu sama margfaldara — tha vard
     mismunur eins og "Mork - xG" taldist RANGLEGA blindur. Einkvaem,
     obrotin gildi (i*1,37) utiloka baedi mismuna- og hlutfalls-tilviljanir. */
  const base = {}, alt = {};
  let i = 0;
  for (const fpl of Object.values(GW_SUM_TO_FPL)) {
    i++;
    /* GILDIN VERDA AD VERA STOR NOG TIL AD KLARA THROSKULDANA.
       Nokkrir dalkar hafa lagmark til ad forðast rugl-tolur ("bonus/BPS"
       krefst BPS >= 50, "nyting" krefst xG >= 0,5). Med litlum profgildum
       skiladi `bonus_per_bps` null i BADUM profunum og taldist ranglega
       blindur. Storu gildin klara throskuldana; einkvaemnin er ohreyfd.  */
    base[fpl] = 120 + i * 13.7;
    alt[fpl] = 60 + i * 21.1;
  }
  /* Svid sem koma UR LIFANDI gognum og eiga ad vera EINS i badum — thau
     eru einmitt thad sem gerir dalk blindan.                            */
  for (const k of ["now_cost", "selected_by_percent", "form", "value_form",
                   "ict_index", "influence", "creativity", "threat"]) {
    if (base[k] == null) { base[k] = 50; alt[k] = 50; }
  }
  const derive = r => {
    const m = r.minutes || 1;
    const o = { ...r };
    o.expected_goal_involvements = (r.expected_goals ?? 0) + (r.expected_assists ?? 0);
    for (const [f, src] of [["expected_goals_per_90", "expected_goals"],
                            ["expected_assists_per_90", "expected_assists"],
                            ["expected_goals_conceded_per_90", "expected_goals_conceded"],
                            ["saves_per_90", "saves"], ["clean_sheets_per_90", "clean_sheets"],
                            ["goals_conceded_per_90", "goals_conceded"],
                            ["defensive_contribution_per_90", "defensive_contribution"],
                            ["starts_per_90", "starts"]])
      o[f] = ((r[src] ?? 0) / m) * 90;
    o.expected_goal_involvements_per_90 = (o.expected_goal_involvements / m) * 90;
    o.points_per_game = (r.total_points ?? 0) / Math.max(1, (r.starts ?? 1));
    return o;
  };
  const A = derive(base), B = derive(alt);
  const blind = new Set();
  for (const d of defs) {
    if (!d.key || typeof d.get !== "function") continue;
    if (d.live_only) continue;              // their bera thegar eigin merki
    let a, b;
    try { a = d.get(A); b = d.get(B); } catch { continue; }
    const same = (a == null && b == null) || String(a) === String(b);
    if (same) blind.add(d.key);
  }
  return blind;
}

/* ============================================================
   PORUN VID imminent.json — EIN UTFAERSLA

   imminent.json geymir FULLT nafn ("Cole Palmer") en players.json `web_name`
   ("Palmer"), svo bein nafna-uppfletting skilar ENGU. Nota orda-skorun +
   LID med othraeddum sigurvegara — sama adferd sem matchShotsToPlayers.

   HVERS VEGNA HER OG EKKI I PlayerList: thegar skipta-glugginn (App.jsx)
   fór ad birta somu tolur var thetta ad verda ONNUR utfaersla a sama hlut.
   Tvaer utfaerslur a nafnaporun thydir ad "Byrjar"-dalkurinn getur virkad i
   listanum og verid tomur i skiptaglugganum, an ad neitt prof falli.
   ============================================================ */
export function indexImminentByTeam(imminent) {
  const by = {};
  for (const ip of rowsOf(imminent?.players)) (by[ip.team] ||= []).push(ip);
  return by;
}

/* p: FPL-leikmadur · idx: ur indexImminentByTeam · teamShort: "ARS" o.s.frv. */
export function matchImminent(p, idx, teamShort) {
  const cands = (idx && idx[teamShort]) || [];
  let best = null, bs = 0, second = 0;
  for (const c of cands) {
    const sc = Math.max(nameScore(p?.web_name, c.name),
                        nameScore(`${p?.first_name ?? ""} ${p?.second_name ?? ""}`, c.name));
    if (sc > bs) { second = bs; bs = sc; best = c; }
    else if (sc > second) second = sc;
  }
  return (best && bs >= 1 && bs > second) ? best : null;
}

/* ============================================================
   AO ER BERT creativity/90 — OG THAD STENDUR (akvedid 31.7.2026)

   Samsetning med xA fell ut af urtaki 28.7. (2,179 a moti 2,206, tapadi i
   0/3 timabilum, xA-vogin valdist ALLTAF 0).

   ENDURSKODAD 31.7.: profad hvort AO aetti ad vera HRA creativity-SUMMA
   gluggans i stad creativity/90. Punktmat OG bootstrap studdu thad:
     assist naestu 4:  summa 2,421  a moti  /90 2,297   CI [0,027 0,246] P=99%
     stig naestu 4:    summa 1,294  a moti  /90 1,225   CI [0,047 0,100] P=100%
   EN THAD VAR EKKI TEKID UPP, og astaedan er malid sjalft: innan
   MINUTU-THRIDJUNGA hrynur abatinn i +0,105 / +0,013 / +0,003. Med fastar
   minutur er summa = hlutfall x fasti, svo rodunin er nanast sama. Abatinn
   kemur thvi ur SAMANBURDI THVERT A MINUTUHOPA — thad er ad hygla theim sem
   spila meira, ekki "magn slaer hlutfall".

   THAD ER MERKINGAR-AKVORDUN, EKKI TAEKNILEG: AO svarar "hver leggur upp
   faeri an ad fa assist" og /90 er RETTA formid a theirri spurningu.
   "Hver spilar mest OG leggur upp faeri" er onnur spurning, og minutur eru
   thegar syndar i eigin dalki og i byrjunar-likunum (6h). Ad blanda theim
   inn i AO gerdi visinn tvitradann.

   xA er hins vegar KOMID INN i MO (sja hausinn) thvi thar var inntakid
   raunverulega rangt: markmidid er mork + ASSIST.
   ============================================================ */
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
       ENGIN ahrif (n=10.448). Vegna thessarar maelingar var "<4 daga
       hvild"-talningin TEKIN UT ur rotation-status 29.7.2026; hun las eins
       og hættumerki. `rest_days` er geymt sem UPPLYSING, ekki sem vog —
       sama regla og ferdalengd.
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
  if (p >= 0.75) return { p, level: "safe",  label: "Likely to start" };
  if (p >= 0.45) return { p, level: "mid",   label: "Uncertain" };
  return { p, level: startedLast ? "trap" : "low",
           label: startedLast ? "Bench risk despite having started" : "Unlikely to start" };
}


/* ============================================================
   7. AUDGUNIN — EIN UTFAERSLA FYRIR ALLA LESMATA

   `live_only`-dalkarnir i STAT_DEFS lesa reiti med `_`-forskeyti (`_mo`,
   `_espn_shots`, `_fdr6`, `_dc_hit_adj` ...). Their reitir eru ekki i
   players.json — their eru SETTIR SAMAN ur sex odrum skram, og thad var
   gert INNI I cook-skrefinu i PlayerList.jsx.

   VILLAN SEM THETTA LEYSIR (maeld 8.8.2026): stigataflan fekk HRAT
   players.json og bjó thvi til **20 varanlega tóma kassa** —
   Ogn 8/8, Leikir framundan 5/5, Jofnudur 4/4 og einn i hverjum af
   Grunni/Sokn/Vorn. Thrir HEILIR flokkar sem sogdu "No numbers" i hverjum
   kassa. Talan var ekki bilud og skran ekki tóm; audgunin var einfaldlega
   ekki til nema a einum stad.

   Thess vegna er hun HER: eitt satt, tveir notendur (leikmannataflan og
   stigataflan). Nakvaemlega sama rok og `model.js` og `market.js` — ef
   formulan er a tveimur stodum getur onnur dáið thogult.

   NOTKUN:
     const e = makeEnricher(ctx);        // byggir uppflettitoflurnar EINU SINNI
     Object.assign(src, e(p).fields);    // per leikmann
     const { risk } = e(p);              // byrjunar-likur, ef tharf
   ============================================================ */
export function makeEnricher({
  players, teamById, imminent, shotsFile, fixtures, events, odds,
  defcon, defconHist, consist, bsd, season, isLive = true,
} = {}) {
  /* PORUN VID imminent.json: hun geymir FULLT nafn ("Cole Palmer") en
     players.json `web_name` ("Palmer"), svo bein uppfletting skilar ENGU. */
  const immByTeam = indexImminentByTeam(imminent);

  /* LIDS-SAMTALA: xG lidsins, fyrir "hlutur af xG lidsins". */
  const teamXg = {};
  for (const p of players || []) {
    const v = num(p.expected_goals);
    if (v != null) teamXg[p.team] = (teamXg[p.team] ?? 0) + v;
  }

  /* ESPN-skot sidustu umferdar, porad a nafn + lid med othraeddum sigurvegara. */
  const shotByTeam = {};
  for (const sp of shotsFile?.players || []) (shotByTeam[sp.team] ||= []).push(sp);
  const findShot = (p) => {
    const cands = shotByTeam[teamById?.[p.team]?.short] || [];
    let best = null, bs = 0, second = 0;
    for (const c of cands) {
      const sc = Math.max(nameScore(p.web_name, c.name),
                          nameScore(`${p.first_name} ${p.second_name}`, c.name));
      if (sc > bs) { second = bs; bs = sc; best = c; }
      else if (sc > second) second = sc;
    }
    return (best && bs >= 1 && bs > second) ? best : null;
  };

  /* LEIKIR FRAMUNDAN — talid per UMFERD, ekki per leik: `fix6 < 6` er auð
     umferd og `> 6` tvofold. Thad er spurningin sem notandinn hefur.     */
  const nextGw = (events || []).find(e => e.is_next)?.id
              ?? ((events || []).filter(e => e.finished).length + 1);
  const fixAgg = {};
  for (const f of fixtures || []) {
    if (f.event == null || f.event < nextGw || f.event > nextGw + 5) continue;
    for (const [team, isHome, diff] of [[f.team_h, true, f.team_h_difficulty],
                                        [f.team_a, false, f.team_a_difficulty]]) {
      const a = fixAgg[team] || (fixAgg[team] = { n:0, fdr:0, home:0 });
      a.n++; a.fdr += (num(diff) ?? 3); if (isHome) a.home++;
    }
  }

  const csByShort = odds || {};
  const dcById = defcon?.opportunity || {};
  const dcHitById = {};
  for (const r of defcon?.players || []) dcHitById[r.fpl_id] = r;
  /* DC-hittni: yfirstandandi timabil -> defcon.json (lyklad a fpl_id),
     sogulegt -> defcon_history.json (lyklad a `code`, sem er FAST yfir
     timabil olikt id). DefCon er ny stigagjof fra 2025/26; eldri timabil
     eru ekki i skranni og fa "—" (VANTAR), ekki 0.                       */
  const dcHistBySeason = isLive ? null : (defconHist?.seasons?.[season] || null);
  const consBySeason = consist?.seasons?.[season] || null;
  /* BSD er EITT lokid timabil, svo hun er lesin ADEINS thegar thad timabil
     er valid — annars saust 2025/26-tolur undir hausnum "2024/25".      */
  /* TVAER BSD-SKRAR: `bsd_players.json` er FROSID 2025/26 og
     `bsd_live.json` er yfirstandandi timabil. Su sem passar vid VALIÐ
     timabil raedur; hin er hunsud. An thessa yrdu allir BSD-dalkarnir
     tomir um leid og notandinn velur 2026/27.                          */
  const files = Array.isArray(bsd) ? bsd.filter(Boolean) : (bsd ? [bsd] : []);
  const pick = files.find(f => f && f.season === season) || null;
  const bsdByCode = (pick)
    ? Object.fromEntries((pick.players || []).map(r => [String(r.code), r]))
    : null;

  return function enrich(p) {
    const im = matchImminent(p, immByTeam, teamById?.[p.team]?.short);
    const risk = im?.start_feats ? startRisk(im.start_feats) : null;
    const sh = findShot(p);
    const fa = fixAgg[p.team];
    const short = teamById?.[p.team]?.short;
    const h = dcHistBySeason ? dcHistBySeason[String(p.code)] : dcHitById[p.id];
    const k = consBySeason?.[String(p.code)];
    const b = bsdByCode?.[String(p.code)];
    return {
      im, risk,
      fields: {
        _team_xg: teamXg[p.team] ?? null,
        _espn_shots: sh?.shots ?? null, _espn_sot: sh?.on_target ?? null,
        _espn_in_box: sh?.in_box ?? null, _espn_woodwork: sh?.woodwork ?? null,
        _espn_created: sh?.chances_created ?? null, _espn_cross: sh?.cross_created ?? null,
        _espn_through: sh?.through_balls ?? null,
        _w_minutes: im?.window?.minutes ?? null, _w_xg: im?.window?.xg ?? null,
        _w_xa: im?.window?.xa ?? null, _w_threat: im?.window?.threat ?? null,
        _w_creativity: im?.window?.creativity ?? null,
        _mo: im && inImminentPool(im.window) ? moScore(im.window) : null,
        _ao: im && inImminentPool(im.window) ? aoScore(im.window) : null,
        _start_p: risk?.p ?? null,
        _fdr6: fa && fa.n ? +(fa.fdr / fa.n).toFixed(2) : null,
        _home6: fa?.home ?? null, _fix6: fa?.n ?? null,
        _team_cs: short && csByShort[short] ? num(csByShort[short].cs) : null,
        /* dcById[p.team] er HLUTUR og num(hlutur) er null — thess vegna
           `.defcon_opportunity`. Sá dalkur var DAUDUR fra faedingu og
           faldi sig sjalfur sem tomur (kafli 6l).                       */
        _team_dc: num(dcById[p.team]?.defcon_opportunity),
        _dc_hit_adj: num(h?.hit_rate_adj),
        _dc_hit_raw: num(h?.hit_rate),
        _dc_starts:  num(h?.starts),
        _aron:       num(k?.aron),
        _hit4:       num(k?.hit4_pct),
        _blank:      num(k?.blank_pct),
        _cgames:     num(k?.games),
        /* Tomt = null (VANTAR), aldrei 0 — sbr. 6i. */
        _b_xg:       num(b?.xg),
        _b_npxg:     num(b?.np_xg),
        _b_shots:    num(b?.shots),
        _b_xgs:      num(b?.xg_per_shot),
        _b_big:      num(b?.big_chances),
        _b_inbox:    num(b?.shots_in_box),
        _b_kp:       num(b?.key_pass),
        _b_cross:    num(b?.crosses),
        _b_crossa:   num(b?.crosses_acc),
        _b_rating:   num(b?.rating),
        _b_touch:    num(b?.touches),
        _b_drib:     num(b?.dribbles_won),
        _b_aer:      num(b?.aerial_won),
        _b_tack:     num(b?.tackles),
        _b_int:      num(b?.interceptions),
        _b_clr:      num(b?.clearances),
        _b_blk:      num(b?.blocks),
        _b_fouled:   num(b?.was_fouled),
        _b_mins:     num(b?.minutes),
        _b_sp_xg:    num(b?.sp_xg),
        _b_sp_share: num(b?.sp_xg_share) == null ? null : num(b.sp_xg_share) * 100,
        _b_op_xg:    num(b?.op_xg),
        _b_head_xg:  num(b?.head_xg),
        _b_head:     num(b?.head_shots),
        _b_wood:     num(b?.woodwork),
      },
    };
  };
}
