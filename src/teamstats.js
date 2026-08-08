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
   | luck.json          | xG og xGC                     | FPL-summa   |
   | team_shots.json    | SVAEDI skotanna (teigur,      | ESPN, 380   |
   |  (espn_commentary) | naerfaeri, langskot)          | leikir      |

   TVENNT SEM MA ALDREI FELA:

   1. xG/xGC ERU OFULLKOMIN. `luck.json` leggur saman FPL-leikmannatolur
      og leikmenn sem foru ur deildinni eru fjarlaegdir ur bootstrap —
      ~19% vantar (`xg_incomplete: true`). Talan er thvi KERFISBUNDID
      OF LAG og ma bera saman MILLI lida en ekki lesa sem absolut xG.
      Hun er merkt i vidmotinu.

   2. BIG CHANCES ERU EKKI HER. Their krefjast xG PER SKOT og engin
      naanleg heimild gefur hana (CLAUDE.md 6b/6e: FBref 403, SofaScore
      403, Understat gagnalaus, FotMob gated). Ad reikna thaer ur svaedi
      eingongu vaeri OKKAR likan sem litur ut eins og maeling.
      Naerfaeri (`close_against_pg`) er thad sem GOGNIN leyfa: skot ur
      markteig, talin af ESPN sjalfu. Thad er skyld tala en ekki sama
      talan, og hun heitir thvi sinu retta nafni.

   LAEGRA-ER-BETRA ER EKKI SKRAUT (`hi:false`): fyrir markvard er HAERRI
   skotafjoldi a sig verri, og tafla sem litar haestu toluna graena vaeri
   RONG MYND. Sama regla og i Compare.jsx (CLAUDE.md 6j).
   ============================================================ */

const num = v => (typeof v === "number" && Number.isFinite(v) ? v : null);
const div = (a, b) => (num(a) != null && num(b) ? +(a / b).toFixed(3) : null);

/* Ein rod per lid. `t` ber somu reiti hvadan sem their koma, svo
   dalkarnir thurfa ekki ad vita hvada skra atti hvad.                  */
export function buildTeamRows({ teams = [], teamForm = null, luck = null, teamShots = null } = {}) {
  const list = Array.isArray(teams) ? teams : (teams?.teams || []);
  const formById = {}, luckById = {}, shotsById = {};
  for (const t of teamForm?.teams || []) if (t.fpl_id != null) formById[t.fpl_id] = t;
  for (const t of luck?.teams || []) if (t.fpl_id != null) luckById[t.fpl_id] = t;
  for (const t of teamShots?.teams || []) if (t.fpl_id != null) shotsById[t.fpl_id] = t;

  return list.map(t => {
    const f = formById[t.id] || {}, l = luckById[t.id] || {}, s = shotsById[t.id] || {};
    const m = num(l.matches) || num(f.matches) || null;
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
      xgc:               num(l.xgc),
      xgc_pg:            m ? div(l.xgc, m) : null,
      cs_pct:            num(f.clean_sheet_pct),
      /* GAEDI SKOTANNA sem lidid gefur fra ser: xGC a hvert skot a sig.
         12 skot a sig segja litid ef ollum er skotid ad utan — hlutfallid
         er gaedin, talan er magnid. Thetta er NAESTA sem gognin leyfa vid
         "big chances faced" og heitir thvi ekki thvi nafni.             */
      xgc_per_shot:      div(l.xgc, f.shots_against_pg && m ? f.shots_against_pg * m : null),
      sot_share_against: div(f.sot_against_pg, f.shots_against_pg),
      /* --- sokn --- */
      goals_pg:          num(f.goals_pg),
      shots_pg:          num(f.shots_pg),
      sot_pg:            num(f.sot_pg),
      box_pg:            num(s.in_box_pg),
      close_pg:          num(s.close_pg),
      long_pg:           num(s.outside_pg),
      xg:                num(l.xg),
      xg_pg:             m ? div(l.xg, m) : null,
      conversion:        num(f.conversion),
      /* --- annad --- */
      corners_pg:        num(f.corners_pg),
      fouls_pg:          num(f.fouls_pg),
      yellows_pg:        num(f.yellows_pg),
      goals_minus_xg:    num(l.goals_minus_xg),
      conceded_minus_xgc: num(l.conceded_minus_xgc),
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
  { key: "sot_share_against", label: "On target share faced", short: "SoT %", group: "keeper",
    dec: 3, hi: false, pct: true, src: "E0",
    note: "Of the shots faced, the fraction on target.",
    get: r => r.sot_share_against },

  /* ---- vornin i heild ---- */
  { key: "conceded_pg", label: "Goals conceded per match", short: "GC", group: "defence",
    dec: 2, hi: false, src: "E0", note: "Goals conceded per match (E0, full season).",
    get: r => r.conceded_pg },
  { key: "xgc_pg", label: "xGC per match", short: "xGC", group: "defence",
    dec: 2, hi: false, src: "FPL", incomplete: true,
    note: "Expected goals conceded per match. Summed from FPL player numbers, which drop players who left the league — roughly 19% is missing, so the level is systematically low. Compare teams with it; do not read it as an absolute xGC.",
    get: r => r.xgc_pg },
  { key: "conceded_minus_xgc", label: "Conceded minus xGC", short: "GC−xGC", group: "defence",
    dec: 1, hi: false, src: "FPL", incomplete: true,
    note: "Goals conceded minus xGC over the season. Positive = conceded more than the chances warranted (bad keeping, or bad luck).",
    get: r => r.conceded_minus_xgc },
  { key: "cs_pct", label: "Clean sheet %", short: "CS %", group: "defence",
    dec: 0, hi: true, src: "E0", note: "Share of matches with a clean sheet (E0, full season).",
    get: r => r.cs_pct },

  /* ---- soknin ---- */
  { key: "goals_pg", label: "Goals per match", short: "Goals", group: "attack",
    dec: 2, hi: true, src: "E0", note: "Goals scored per match (E0, full season).",
    get: r => r.goals_pg },
  { key: "xg_pg", label: "xG per match", short: "xG", group: "attack",
    dec: 2, hi: true, src: "FPL", incomplete: true,
    note: "Expected goals per match, summed from FPL player numbers — the same roughly 19% undercount as xGC. Comparable across teams, not absolute.",
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
  { key: "conversion", label: "Shot conversion", short: "Conv.", group: "attack",
    dec: 3, hi: true, pct: true, src: "E0", note: "Goals per shot taken.",
    get: r => r.conversion },
  { key: "goals_minus_xg", label: "Goals minus xG", short: "G−xG", group: "attack",
    dec: 1, hi: true, src: "FPL", incomplete: true,
    note: "Goals scored minus xG over the season. Positive = finishing above the chances created.",
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
