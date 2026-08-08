/* ============================================================
   LIDA-TOLUR — HREINT, EKKERT REACT (sama regla og model.js/stats.js:
   profin keyra NAKVAEMLEGA sama kodann og vidmotid birtir).

   SPURNINGIN SEM THETTA SVARAR er onnur en leikmannalistinn svarar:
   ekki "hver er godur?" heldur "HVERNIG ER LIDID SJALFT AD SPILA?" —
   og saerstaklega VID HVERJU MARKVORDUR MA BUAST. Markvordur faer stig
   fyrir vorslur og hreint blad, svo thad sem skiptir mali er ekki bara
   HVE MORG skot hann faer heldur HVADAN.

   THRJAR HEIMILDIR, HVER MED SITT SVID — ENGIN THEIRRA ER ENDURREIKNUD:

   | heimild            | hvad                          | thekja      |
   |--------------------|-------------------------------|-------------|
   | team_form.json     | skot, skot a mark, mork,      | E0, HEILT   |
   |  (fdcouk_e0)       | horn, spjold, hreint blad     | 380 leikir  |
   | bsd_teams.json     | xG og xGC (per-skot xG)       | BSD, 380    |
   |  (bzzoiro)         |                               | 2025/26 EITT|
   | luck.json          | RAUNMORK (goals/conceded)     | E0+FPL      |
   | team_shots.json    | SVAEDI skotanna (teigur,      | ESPN, 380   |
   |  (espn_commentary) | naerfaeri, langskot)          | leikir      |

   TVENNT SEM MA ALDREI FELA:

   1. xG/xGC KOMA UR BSD OG NA YFIR EITT TIMABIL (2025/26).
      ThAU KOMU ADUR UR FPL-SUMMU og su tala var ekki bara "~19% of lag"
      heldur BYGGINGARLEGA BILUD: lids-xGC var tekid ur
      `expected_goals_conceded` EINS markvardar, svo lid sem skipti um
      markvord fekk storlega ranga tolu. Leeds maeldist med 0,70 xGC a
      leik medan raunveruleg mork a sig voru 1,47 — og fekk thvi graena
      "besta vornin"-merkingu sem var hreinn tilbuningur.
      Maelt 8.8.2026 gegn raunmorkum, 17 lid: r 0,369 -> 0,818 (vorn) og
      0,667 -> 0,749 (sokn), MAE ~45% laegra. Sja buildTeamRows.
      Dalkarnir eru `season_locked` og TOMIR i odrum timabilum — engin
      FPL-varaleid, thvi lakari tala undir betri merkimida er verri en
      tomur dalkur.

   2. BIG CHANCES ERU EKKI I THESSARI TOFLU — ENN. Svaedin her koma ur
      ESPN, sem gefur STADSETNINGU hvers skots en ENGA xG-tolu fyrir
      thad, svo ekkert her getur greint gott faeri fra vonarskoti.
      Naerfaeri (`close_against_pg`) er thad sem ESPN-gognin leyfa: skot
      ur markteig, talin af ESPN sjalfu. Thad er SKYLD tala en ekki sama
      talan, og hun heitir thvi sinu retta nafni.

      **ThAD ER HINS VEGAR EKKI LENGUR OFAANLEGT.** BSD (kafli 6t) gefur
      per-skot xG i ollum 380 leikjum 2025/26 OG raunverulegt lids-svid
      `big_chances` i `/events/{id}/stats/` (0-8 per lid-leik, maelt).
      "Big chances a sig" = talan hja MOTHERJANUM i hverjum leik, og hun
      er thvi BEIN TALNING en ekki afleidsla. Tvennt vantar adur en hun
      fer inn: (a) eigin sokn a lids-stats-endapunktinn (bsd_players.json
      er per LEIKMANN og ber hana ekki), og (b) medvitund um ad BSD naer
      YFIR EITT TIMABIL — dalkurinn vaeri thvi tomur i ollum odrum.
      Ordalagid i vidmotinu ma ekki segja "ofaanlegt"; thad var rett
      medan ESPN var eina skot-heimildin og er thad ekki lengur.

   LAEGRA-ER-BETRA ER EKKI SKRAUT (`hi:false`): fyrir markvard er HAERRI
   skotafjoldi a sig verri, og tafla sem litar haestu toluna graena vaeri
   RONG MYND. Sama regla og i Compare.jsx (CLAUDE.md 6j).
   ============================================================ */

const num = v => (typeof v === "number" && Number.isFinite(v) ? v : null);
const div = (a, b) => (num(a) != null && num(b) ? +(a / b).toFixed(3) : null);

/* Ein rod per lid. `t` ber somu reiti hvadan sem their koma, svo
   dalkarnir thurfa ekki ad vita hvada skra atti hvad.                  */
export function buildTeamRows({ teams = [], teamForm = null, luck = null, teamShots = null,
                                bsdTeams = null } = {}) {
  const list = Array.isArray(teams) ? teams : (teams?.teams || []);
  const formById = {}, luckById = {}, shotsById = {};
  for (const t of teamForm?.teams || []) if (t.fpl_id != null) formById[t.fpl_id] = t;
  for (const t of luck?.teams || []) if (t.fpl_id != null) luckById[t.fpl_id] = t;
  for (const t of teamShots?.teams || []) if (t.fpl_id != null) shotsById[t.fpl_id] = t;
  const bsdById = {};
  for (const t of bsdTeams?.teams || []) if (t.fpl_id != null) bsdById[t.fpl_id] = t;

  return list.map(t => {
    const f = formById[t.id] || {}, l = luckById[t.id] || {}, s = shotsById[t.id] || {};
    const b = bsdById[t.id] || {};
    const m = num(l.matches) || num(f.matches) || null;
    /* ---------- xG/xGC KOMA NU UR BSD, EKKI UR FPL-SUMMUNNI ----------
       MAELT 8.8.2026 a theim 17 lidum sem attu PL-rod 2025/26, gegn
       RAUNVERULEGUM morkum sama timabils:

         | heimild | r vid raunmork | MAE  |
         | FPL xGC | 0,369          | 0,212|
         | BSD xGC | 0,818          | 0,116|
         | FPL xG  | 0,667          | 0,246|
         | BSD xG  | 0,749          | 0,148|

       Orsok gomlu skekkjunnar var BYGGINGARLEG, ekki tilviljun: lids-xGC
       var tekid ur `expected_goals_conceded` EINS markvardar (haesta
       minututalan), svo lid sem skipti um markvord — eda thar sem hann
       for ur deildinni og hvarf ur bootstrap — fekk storlega ranga tolu.
       Leeds: raunveruleg mork a sig 1,47/leik, FPL xGC 0,70, BSD 1,48.

       ENGIN FPL-VARALEID. Maelt: BSD naer YFIR NAKVAEMLEGA somu 17 lid og
       FPL-summan; hin thrju (COV/HUL/IPS) attu enga PL-rod og hafa hvorugt.
       Enginn tapar tolu. Vaeri varaleidin holl eftir myndi lakari talan
       lauma ser inn undir merkimida betri heimildar — og ONAKVAEM TALA
       UNDIR RONGU NAFNI er verri en tomur dalkur (kafli 8i).
       BSD naer adeins yfir 2025/26, svo dalkarnir eru `season_locked`. */
    const bsdXg = num(b.xg_pg), bsdXgc = num(b.xgc_pg);
    const xgTot  = bsdXg  != null && m ? +(bsdXg  * m).toFixed(1) : null;
    const xgcTot = bsdXgc != null && m ? +(bsdXgc * m).toFixed(1) : null;
    return {
      id: t.id, short: t.short, name: t.name, team: t,
      matches: m,
      /* --- vorn --- */
      shots_against_pg:  num(f.shots_against_pg),
      sot_against_pg:    num(f.sot_against_pg),
      box_against_pg:    num(s.in_box_against_pg),
      close_against_pg:  num(s.close_against_pg),
      long_against_pg:   num(s.outside_against_pg),
      long_share:        num(s.outside_share_against),
      conceded_pg:       num(f.conceded_pg),
      xgc:               xgcTot,
      xgc_pg:            bsdXgc,
      cs_pct:            num(f.clean_sheet_pct),
      /* GAEDI SKOTANNA sem lidid gefur fra ser: xGC a hvert skot a sig.
         12 skot a sig segja litid ef ollum er skotid ad utan — hlutfallid
         er gaedin, talan er magnid. Thetta er NAESTA sem gognin leyfa vid
         "big chances faced" og heitir thvi ekki thvi nafni.             */
      xgc_per_shot:      div(xgcTot, f.shots_against_pg && m ? f.shots_against_pg * m : null),
      sot_share_against: div(f.sot_against_pg, f.shots_against_pg),
      /* --- sokn --- */
      goals_pg:          num(f.goals_pg),
      shots_pg:          num(f.shots_pg),
      sot_pg:            num(f.sot_pg),
      box_pg:            num(s.in_box_pg),
      close_pg:          num(s.close_pg),
      long_pg:           num(s.outside_pg),
      xg:                xgTot,
      xg_pg:             bsdXg,
      conversion:        num(f.conversion),
      /* --- annad --- */
      corners_pg:        num(f.corners_pg),
      fouls_pg:          num(f.fouls_pg),
      yellows_pg:        num(f.yellows_pg),
      /* ENDURREIKNAD UR BSD, EKKI LESID UR luck.json. Hefdu thessir tveir
         haldid FPL-afleidslunni vaeru their MISMUNUR TVEGGJA OLIKRA
         HEIMILDA — birt xG ur BSD en "G-xG" reiknad ur FPL-xG — og dalkarnir
         hefdu stangast a innbyrdis an thess ad nokkud syndi thad.
         Mork/mork a sig eru raunverulegar (E0-heil) og haldast.          */
      goals_minus_xg:    (num(l.goals) != null && xgTot != null)
                           ? +(l.goals - xgTot).toFixed(1) : null,
      conceded_minus_xgc: (num(l.conceded) != null && xgcTot != null)
                           ? +(l.conceded - xgcTot).toFixed(1) : null,
      /* --- BSD-skotakortid: EINA heimildin med xG PER SKOT --- */
      bc_against_pg:  num(b.bc_against_pg),
      bc_pg:          num(b.bc_pg),
      xg_per_shot_against: num(b.xg_per_shot_against),
      bsd_matches:    num(b.matches),
    };
  });
}

export const TEAM_GROUPS = [
  { key: "keeper", label: "What the keeper faces" },
  { key: "defence", label: "Defence" },
  { key: "attack", label: "Attack" },
  { key: "other", label: "Discipline and set pieces" },
];

/* `hi` = haerra er betra. Fyrir ALLT sem lidid faer A SIG er thad FALSE. */
export const TEAM_STAT_DEFS = [
  /* ---- markvorslu-sjonarhornid ---- */
  { key: "shots_against_pg", label: "Shots faced per match", short: "Shots", group: "keeper",
    dec: 2, hi: false, src: "E0",
    note: "Shots faced per match (E0, full season). Volume — not quality. A keeper who faces many shots gets more saves but also more goals.",
    get: r => r.shots_against_pg },
  { key: "sot_against_pg", label: "On target faced per match", short: "SoT", group: "keeper",
    dec: 2, hi: false, src: "E0",
    note: "Shots on target faced per match. This is the number that turns into saves — an off-target shot is worth nothing to a keeper.",
    get: r => r.sot_against_pg },
  { key: "box_against_pg", label: "In-box shots faced", short: "In box", group: "keeper",
    dec: 2, hi: false, src: "ESPN",
    note: "Shots faced from inside the penalty area (ESPN zone text, full season).",
    get: r => r.box_against_pg },
  { key: "close_against_pg", label: "Close-range faced", short: "Close", group: "keeper",
    dec: 2, hi: false, src: "ESPN",
    note: "Shots faced from very close range (the six-yard area). This is the closest the available data gets to \"big chances faced\" — big chances need per-shot xG, which no reachable source provides, so this is a measured stand-in and not the same number.",
    get: r => r.close_against_pg },
  { key: "long_against_pg", label: "Long shots faced", short: "Long", group: "keeper",
    dec: 2, hi: true, src: "ESPN",
    note: "Shots faced from outside the box. HIGHER IS BETTER here: long shots are the cheapest shots to concede — they rarely go in and they still count as saves.",
    get: r => r.long_against_pg },
  { key: "long_share", label: "Share faced from distance", short: "Long %", group: "keeper",
    dec: 3, hi: true, pct: true, src: "ESPN",
    note: "Of every shot the team faces, the fraction taken from outside the box. A high share means the defence keeps opponents out — the same shot count is far less dangerous.",
    get: r => r.long_share },
  /* BIG CHANCES A SIG — ThAD SEM SPURT VAR UM. Talid ur BSD-skotakorti:
     hvert skot ber sina eigin xG og skot yfir 0,18 telst big chance
     (throskuldurinn var FITTADUR gegn lids-svidinu `big_chances` sem BSD
     birtir sjalft: MAE 0,746, r 0,774 a 748 lid-leikjum).
     EITT TIMABIL: BSD hefur skotakort i 2025/26 og engin eldri, svo
     dalkurinn er TOMUR i odrum timabilum — og thad er rett, "engin gogn"
     er ekki "engin big chance".                                        */
  { key: "bc_against_pg", label: "Big chances faced", short: "BigC", group: "keeper",
    dec: 2, hi: false, src: "BSD", season_locked: true,
    note: "Big chances faced per match — shots against with an expected-goals value of 0.18 or more, counted from the BSD shot map. This is the number a goalkeeper actually has to survive: two teams can concede the same shot count and face completely different danger. Only 2025/26 has a shot map, so this is empty for other seasons.",
    get: r => r.bc_against_pg },
  { key: "xg_per_shot_against", label: "xG per shot faced", short: "xG/shot", group: "keeper",
    dec: 3, hi: false, src: "BSD", season_locked: true,
    note: "The average expected-goals value of a shot faced. Quality rather than volume — a low number means the defence gives up hopeful efforts, a high one means it gives up chances. Only 2025/26 has a shot map.",
    get: r => r.xg_per_shot_against },
  { key: "sot_share_against", label: "On target share faced", short: "SoT %", group: "keeper",
    dec: 3, hi: false, pct: true, src: "E0",
    note: "Of the shots faced, the fraction on target.",
    get: r => r.sot_share_against },

  /* ---- vornin i heild ---- */
  { key: "conceded_pg", label: "Goals conceded per match", short: "GC", group: "defence",
    dec: 2, hi: false, src: "E0", note: "Goals conceded per match (E0, full season).",
    get: r => r.conceded_pg },
  { key: "xgc_pg", label: "xGC per match", short: "xGC", group: "defence",
    dec: 2, hi: false, src: "BSD", season_locked: true,
    note: "Expected goals conceded per match, summed from per-shot xG for every shot faced. Measured against real goals conceded it tracks at r 0.82 (the old FPL-summed version managed 0.37, because it took the whole team's xGC from a single goalkeeper's record). BSD covers 2025/26 only, so this is empty for other seasons.",
    get: r => r.xgc_pg },
  { key: "conceded_minus_xgc", label: "Conceded minus xGC", short: "GC−xGC", group: "defence",
    dec: 1, hi: false, src: "BSD", season_locked: true,
    note: "Goals conceded minus xGC over the season. Positive = conceded more than the chances faced warranted (bad keeping, or bad luck). Goals are real (E0); xGC is summed per shot.",
    get: r => r.conceded_minus_xgc },
  { key: "cs_pct", label: "Clean sheet %", short: "CS %", group: "defence",
    dec: 0, hi: true, src: "E0", note: "Share of matches with a clean sheet (E0, full season).",
    get: r => r.cs_pct },

  /* ---- soknin ---- */
  { key: "goals_pg", label: "Goals per match", short: "Goals", group: "attack",
    dec: 2, hi: true, src: "E0", note: "Goals scored per match (E0, full season).",
    get: r => r.goals_pg },
  { key: "xg_pg", label: "xG per match", short: "xG", group: "attack",
    dec: 2, hi: true, src: "BSD", season_locked: true,
    note: "Expected goals per match, summed from the per-shot xG of every shot taken. Measured against real goals it tracks at r 0.75 (FPL-summed: 0.67) and its level is right rather than ~19% short. BSD covers 2025/26 only, so this is empty for other seasons.",
    get: r => r.xg_pg },
  { key: "shots_pg", label: "Shots per match", short: "Shots", group: "attack",
    dec: 2, hi: true, src: "E0", note: "Shots taken per match (E0, full season).",
    get: r => r.shots_pg },
  { key: "sot_pg", label: "On target per match", short: "SoT", group: "attack",
    dec: 2, hi: true, src: "E0", note: "Shots on target per match.", get: r => r.sot_pg },
  { key: "box_pg", label: "In-box shots", short: "In box", group: "attack",
    dec: 2, hi: true, src: "ESPN", note: "Shots taken from inside the box (ESPN zone text).",
    get: r => r.box_pg },
  { key: "close_pg", label: "Close-range shots", short: "Close", group: "attack",
    dec: 2, hi: true, src: "ESPN", note: "Shots taken from very close range (six-yard area).",
    get: r => r.close_pg },
  { key: "bc_pg", label: "Big chances created", short: "BigC", group: "attack",
    dec: 2, hi: true, src: "BSD", season_locked: true,
    note: "Big chances the team creates per match — shots worth 0.18 expected goals or more, from the BSD shot map. Only 2025/26 has a shot map.",
    get: r => r.bc_pg },
  { key: "conversion", label: "Shot conversion", short: "Conv.", group: "attack",
    dec: 3, hi: true, pct: true, src: "E0", note: "Goals per shot taken.",
    get: r => r.conversion },
  { key: "goals_minus_xg", label: "Goals minus xG", short: "G−xG", group: "attack",
    dec: 1, hi: true, src: "BSD", season_locked: true,
    note: "Goals scored minus xG over the season. Positive = finishing above the chances created. Goals are real (E0); xG is summed per shot.",
    get: r => r.goals_minus_xg },

  /* ---- annad ---- */
  { key: "corners_pg", label: "Corners per match", short: "Corners", group: "other",
    dec: 2, hi: true, src: "E0", note: "Corners won per match.", get: r => r.corners_pg },
  { key: "fouls_pg", label: "Fouls per match", short: "Fouls", group: "other",
    dec: 2, hi: false, src: "E0", note: "Fouls committed per match.", get: r => r.fouls_pg },
  { key: "yellows_pg", label: "Yellows per match", short: "YC", group: "other",
    dec: 2, hi: false, src: "E0", note: "Yellow cards per match.", get: r => r.yellows_pg },
];

export const TEAM_STAT_BY_KEY = Object.fromEntries(TEAM_STAT_DEFS.map(d => [d.key, d]));

/* Rodun: NULL RADAST ALLTAF SIDAST i BADAR attir. Tomt gildi sem flytur
   upp i "asc" fyllir toppinn og er algengasta villan i svona toflum
   (sama regla og i leikmannalistanum, CLAUDE.md 6i).                    */
export function sortTeamRows(rows, key, dir = "desc") {
  const d = TEAM_STAT_BY_KEY[key];
  const val = r => (key === "__name" ? r.short : d ? d.get(r) : null);
  return rows.slice().sort((a, b) => {
    const x = val(a), y = val(b);
    if (typeof x === "string" || typeof y === "string")
      return dir === "asc" ? String(x).localeCompare(String(y)) : String(y).localeCompare(String(x));
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return dir === "asc" ? x - y : y - x;
  });
}
