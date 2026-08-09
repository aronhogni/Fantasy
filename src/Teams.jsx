/* ============================================================
   LIDA-TOLUR — FLIPINN

   BIRTING EINGONGU. Hver tala kemur ur `src/teamstats.js` (hreint,
   ekkert React) af somu astaedu og `model.js` og `stats.js`: profin
   keyra sama kodann og skjarinn synir.

   AF HVERJU SER FLIPI OG EKKI DALKAR I LEIKMANNALISTANUM: rodin er
   LIDID, ekki leikmadurinn. Ad haengja 20 lida-tolur a 572 leikmenn
   vaeri ad endurtaka somu tuttugu raedirnar 28 sinnum hverja, og
   rodun eftir theim vaeri rodun a lidum i dulargervi.
   ============================================================ */
import React, { useMemo, useState, useEffect } from "react";
import ShotMap from "./ShotMap.jsx";
import { buildTeamRows, TEAM_STAT_DEFS, TEAM_GROUPS, sortTeamRows, TEAM_STAT_BY_KEY } from "./teamstats.js";

/* Engin sameiginleg thema-eining er til i thessu repo-i — hver eining ber
   sina eigin `C` (sbr. PlayerList.jsx og Leagues.jsx). Afritad viljandi
   fremur en ad bua til nyja sameign i midri lotu thar sem onnur lota er
   ad breyta somu skram.                                                 */
const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c", greenBg:"#e6f9f0",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

export default function Teams({ teams, teamForm, luck, teamShots, bsdTeams, shotIndex, Crest }) {
  /* UMFERDAR-BIL — EN AÐEINS FYRIR ThAD SEM ThAD GETUR HREYFT.
     ENGIN lids-skra i repo-inu ber tolur per umferd: team_form, luck,
     team_shots og bsd_teams eru ALLAR timabils-summur. Thad eina sem er
     til per umferd eru SKOTIN (bsd_shots.json ber nu `gw` a hverju skoti),
     svo bilid hreyfir skot-dalkana og ekkert annad. Hinir eru merktir
     `season` — sama regla og i Player stats: thogull dalkur sem hreyfist
     ekki er verri en dalkur sem segir ad hann geri thad ekki.          */
  const [gwRange, setGwRange] = useState(null);       // [fra, til] eda null
  const [gwOpen, setGwOpen] = useState(false);
  const [group, setGroup] = useState("keeper");
  /* Valid lid fyrir skotakortin. null = ekkert valid.               */
  const [pick, setPick] = useState(null);
  const [sort, setSort] = useState({ key: "sot_against_pg", dir: "asc" });

  const base = useMemo(
    () => buildTeamRows({ teams, teamForm, luck, teamShots, bsdTeams }),
    [teams, teamForm, luck, teamShots, bsdTeams]);

  /* Skot-dalkarnir endurreiknadir ur SIUDUM skotum. Somu formulur og
     scripts/fetch-bsd-teams.mjs notar (per leik, xg/skot, big chance =
     xg >= 0,18) — annars gaefu taflan og skran sitt hvad.              */
  const rows = useMemo(() => {
    if (!gwRange || !shotIndex?.byTeam) return base;
    const [lo, hi] = gwRange;
    const F = shotIndex.fields || {};
    const inRange = sh => { const g = sh[F.gw]; return g != null && g >= lo && g <= hi; };
    const agg = short => {
      const ti = shotIndex.teams.indexOf(short);
      if (ti < 0) return null;
      const forr = (shotIndex.byTeam.get(ti) || []).filter(inRange);
      const agst = (shotIndex.byOpp.get(ti) || []).filter(inRange);
      const games = new Set();
      for (const sh of forr.concat(agst)) games.add(sh[F.gw]);
      const n = games.size || 0;
      if (!n) return null;
      const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
      const xgF = sum(forr, x => x[F.xg]), xgA = sum(agst, x => x[F.xg]);
      const BC = 0.18;
      return {
        xg_pg: +(xgF / n).toFixed(2), xgc_pg: +(xgA / n).toFixed(2),
        bc_pg: +(forr.filter(x => (x[F.xg] || 0) >= BC).length / n).toFixed(2),
        bc_against_pg: +(agst.filter(x => (x[F.xg] || 0) >= BC).length / n).toFixed(2),
        xg_per_shot: forr.length ? +(xgF / forr.length).toFixed(3) : null,
        xg_per_shot_against: agst.length ? +(xgA / agst.length).toFixed(3) : null,
      };
    };
    return base.map(r => {
      const a = agg(r.short);
      /* Lid an skota i bilinu fa null — EKKI 0. "Spiladi ekki" og
         "skaut ekki" eru ekki sama hlutid (6i).                       */
      if (!a) return { ...r, xg_pg: null, xgc_pg: null, bc_pg: null,
                       bc_against_pg: null, xg_per_shot: null, xg_per_shot_against: null,
                       goals_minus_xg: null, conceded_minus_xgc: null };
      return { ...r, ...a, goals_minus_xg: null, conceded_minus_xgc: null };
    });
  }, [base, gwRange, shotIndex]);

  const defs = useMemo(() => TEAM_STAT_DEFS.filter(d => d.group === group), [group]);
  /* Ef skipt er um flokk og radad var eftir dalki sem er ekki lengur a
     skjanum, situr rodunin i ONSYNILEGRI tolu og taflan litur handahofs-
     kennt ut. Tha er fallid aftur a fyrsta dalk flokksins.              */
  useEffect(() => {
    if (sort.key !== "__name" && !defs.some(d => d.key === sort.key))
      setSort({ key: defs[0]?.key || "__name", dir: defs[0]?.hi === false ? "asc" : "desc" });
  }, [group, defs, sort.key]);

  const sorted = useMemo(() => sortTeamRows(rows, sort.key, sort.dir), [rows, sort]);

  /* BESTA OG VERSTA GILDID i hverjum dalki — litud, thvi 20 raedir af
     tveggja aukastafa tolum eru olæsilegar an akkeris. `hi` raedur hvor
     endinn er graenn; an thess vaeri myndin ROng fyrir allt sem lidid
     faer A SIG (haerra = verra). Sama regla og i Compare.jsx.           */
  const ext = useMemo(() => {
    const o = {};
    for (const d of defs) {
      const vals = rows.map(d.get).filter(v => typeof v === "number");
      if (vals.length < 3) continue;
      o[d.key] = { min: Math.min(...vals), max: Math.max(...vals) };
    }
    return o;
  }, [defs, rows]);

  const cellStyle = (d, v) => {
    /* OFULLKOMNIR DALKAR FA ENGA BESTA/VERSTA MERKINGU.
       Merkingin er FULLYRDING ("thetta er besta vornin i deildinni") og
       xG/xGC geta ekki borid hana: theim vantar ~19% og undirtalningin er
       MISJOFN milli lida, thvi hun raest af thvi hve margir foru ur
       deildinni fra hverju lidi. Maelt daemi: Leeds maelist med LAEGSTA
       xGC i deildinni (0,70) medan raunveruleg mork a sig eru 1,47 —
       graen merking thar hefdi sagt notandanum ad Leeds hefdi att bestu
       vaentu vornina, sem er gervi.
       Tolurnar standa afram (thaer eru gagnlegar i samanburdi og
       gula haus-merkingin segir fra fyrirvaranum); thad er FULLYRDINGIN
       sem er tekin ut. Villandi mynd er verri en engin mynd.           */
    if (d.incomplete) return null;
    const e = ext[d.key];
    if (e == null || typeof v !== "number" || e.max === e.min) return null;
    const good = d.hi === false ? e.min : e.max;
    const bad = d.hi === false ? e.max : e.min;
    if (v === good) return S.best;
    if (v === bad) return S.worst;
    return null;
  };

  const fmt = (d, v) => {
    if (v == null) return "—";
    if (d.pct) return `${(v * 100).toFixed(d.dec >= 3 ? 1 : 0)}%`;
    return v.toFixed(d.dec ?? 2);
  };

  const head = (key, label, title, right = true) => (
    <th key={key} title={title}
      style={{ ...S.th, ...(right ? S.thRight : S.thName),
               ...(TEAM_STAT_BY_KEY[key]?.incomplete ? S.thIncomplete : null),
               ...(sort.key === key ? S.thOn : null) }}
      onClick={() => setSort(s => s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: TEAM_STAT_DEFS.find(d => d.key === key)?.hi === false ? "asc" : "desc" })}>
      {label}{sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  const missing = !teamForm && !luck && !teamShots && !bsdTeams;
  /* NYLIDAR EIGA ENGA ROD I ENSKU URVALSDEILDINNI I FYRRA, svo hver einasta
     tala theirra er "—". Autt an skyringar les eins og NULL SKOT A SIG, sem
     vaeri versta mislesturinn i thessari toflu einmitt af thvi ad hun a ad
     velja markvord. Nofnin eru leidd UT UR GOGNUNUM, ekki handskrifud —
     annars staðnar listinn vid naestu uppfaerslu deildarinnar.            */
  const promoted = useMemo(
    () => rows.filter(r => TEAM_STAT_DEFS.every(d => d.get(r) == null)).map(r => r.short),
    [rows]);

  return (
    <section style={S.card}>
      <div style={S.headRow}>
        <div>
          <h2 style={S.h2}>{"Teams"}</h2>
          <div style={S.sub}>
            {teamForm?.season ? `${teamForm.season} · ` : ""}
            {rows.length} {"teams · full season"}
          </div>
        </div>
      </div>

      <p style={S.note}>
        {"How the teams themselves play — the numbers behind a goalkeeper or defence pick. "}
        <b>{"Shots faced"}</b>{" is volume; "}<b>{"where they come from"}</b>{" is danger. "}
        {"A team that concedes 12 shots from distance is a far better keeper pick than one that concedes 9 from inside the box."}
      </p>
      {bsdTeams ? (
        <p style={S.note}>
          <b>{"Big chances faced"}</b>{" is counted from the BSD shot map, where every shot "}
          {"carries its own expected-goals value: a shot worth 0.18 or more counts. That "}
          {"threshold was fitted against the big-chance count BSD publishes itself, so it is "}
          {"measured rather than chosen. Only 2025/26 has a shot map, so the column is empty "}
          {"for every other season — and empty means no data, not no chances."}
        </p>
      ) : (
        <p style={S.warn}>
          <b>{"Big chances faced is not filled in yet."}</b>{" The zones in this table come from "}
          {"ESPN, which gives the position of every shot but no expected-goals value for it, so "}
          {"nothing here can separate a good chance from a hopeful one. "}
          <b>{"Close-range faced"}</b>{" is the measured stand-in and carries its own name. "}
          {"The real column is one fetch away — "}<code style={S.code}>{"BSD_KEY=… node scripts/fetch-bsd-teams.mjs"}</code>
          {" writes it from the BSD shot map, which does carry per-shot expected goals."}
        </p>
      )}

      {missing ? (
        <p style={S.note}>{"Team data has not loaded."}</p>
      ) : (
        <>
          {/* UMFERDAR-BIL. Hreyfir SKOT-dalkana (xG, big chances, xG/skot)
              — thad eru einu lids-tolurnar sem eru til per umferd. Hinir
              eru timabils-summur og bera `season`.                      */}
          <div style={S.gwBar}>
            <button style={S.gwToggle} aria-expanded={gwOpen}
              onClick={() => setGwOpen(v => !v)}>
              <span style={{ transform: gwOpen ? "none" : "rotate(-90deg)", display:"inline-block",
                             fontSize:9, transition:"transform 120ms" }}>▾</span>
              {" Gameweeks"}
            </button>
            {gwRange && (
              <>
                <span style={S.gwNow}>GW {gwRange[0]}–{gwRange[1]}</span>
                <button style={S.gwClear} onClick={() => setGwRange(null)}>{"whole season"}</button>
              </>
            )}
            {gwRange && (
              <span style={S.gwWarn}>
                {"only the shot columns follow the range — the rest are season totals"}
              </span>
            )}
          </div>
          {gwOpen && (
            <div style={S.gwBoxes} role="group" aria-label={"Select gameweeks"}>
              {Array.from({ length: 38 }, (_, i) => i + 1).map(n => {
                const on = gwRange && n >= gwRange[0] && n <= gwRange[1];
                return (
                  <button key={n} title={`GW ${n}`} aria-pressed={!!on}
                    style={{ ...S.gwBox, ...(on ? S.gwBoxOn : {}) }}
                    onClick={() => setGwRange(r => {
                      if (!r || r[0] !== r[1]) return [n, n];
                      return n < r[0] ? [n, r[0]] : [r[0], n];
                    })}>{n}</button>
                );
              })}
            </div>
          )}

          <div style={S.groupRow}>
            {TEAM_GROUPS.map(g => (
              <button key={g.key} type="button"
                style={{ ...S.groupBtn, ...(group === g.key ? S.groupOn : null) }}
                onClick={() => setGroup(g.key)}>{g.label}</button>
            ))}
          </div>

          <div style={S.scroll}>
            <table style={S.table}>
              <thead>
                <tr>
                  {head("__name", "Team", "Sort by team", false)}
                  {defs.map(d => head(d.key, d.short, `${d.label}\n\n${d.note}\n\nSource: ${d.src}${d.incomplete ? " (incomplete — see note)" : ""}`))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.id}>
                    <td style={{ ...S.tdName, ...(shotIndex ? { cursor: "pointer" } : null),
                                 ...(pick === r.short ? { boxShadow: "inset 3px 0 0 #7b2d8e" } : null) }}
                        onClick={shotIndex ? () => setPick(pick === r.short ? null : r.short) : undefined}
                        title={shotIndex ? "Show this team's shot maps" : undefined}>
                      {Crest ? <Crest team={r} size={14} /> : null}
                      <span style={S.short}>{r.short}</span>
                      <span style={S.name}>{r.name || ""}</span>
                    </td>
                    {defs.map(d => {
                      const v = d.get(r);
                      return (
                        <td key={d.key} style={{ ...S.td, ...(cellStyle(d, v) || {}) }}>
                          {fmt(d, v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SKOTAKORT LIDSINS — BADAR HLIDAR.
              Taflan segir HVE MORG skot lidid faer; kortid segir HVADAN.
              "A sig"-kortid er thad sem raedur markvardar-/varnarvali og er
              thvi fyrst: 12 langskot og 9 teigsskot eru sami dalkur i
              toflunni en gerolikt mal a vellinum — nakvaemlega thad sem
              skyringin efst i thessum flipa heldur fram.                */}
          {shotIndex && pick && (() => {
            const ti = shotIndex.teams.indexOf(pick);
            if (ti < 0) return null;
            const against = shotIndex.byOpp.get(ti) || [];
            const forr = shotIndex.byTeam.get(ti) || [];
            if (!against.length && !forr.length) return null;
            const row = sorted.find(r => r.short === pick);
            return (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e6e6ea" }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  {row?.name || pick}{" — shot maps "}
                  <span style={{ fontWeight: 400, opacity: 0.65, fontSize: 12 }}>
                    {"2025/26 · bubble size = xG · goal at top"}</span>
                </div>
                <div style={{ fontSize: 12, color: "#6a6a72", marginBottom: 10 }}>
                  {"Faced is the keeper-and-defence question; taken is the attack. "}
                  {"Only 2025/26 has a shot map, so a promoted side has none — and none means no data."}
                </div>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{"Shots faced"}</div>
                    <ShotMap shots={against} calib={shotIndex.calib} width={300} label={`${pick} faced`} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{"Shots taken"}</div>
                    <ShotMap shots={forr} calib={shotIndex.calib} width={300} label={`${pick} taken`} />
                  </div>
                </div>
              </div>
            );
          })()}

          {promoted.length > 0 && (
            <p style={S.note}>
              <b>{promoted.join(", ")}</b>{promoted.length > 1 ? " have " : " has "}
              {"no row here: they did not play in the Premier League last season, so "}
              {"every number is missing rather than zero. Their first numbers arrive once "}
              {"the season is under way."}
            </p>
          )}

          <div style={S.legend}>
            <span style={{ ...S.chip, ...S.best }}>{"best"}</span>
            <span style={{ ...S.chip, ...S.worst }}>{"worst"}</span>
            <span style={S.legendTxt}>
              {"Best and worst follow the column, not the size: for everything a team concedes, "}
              {"lower is better — except long shots faced, where higher is better. "}
              <b style={{ color: "#8a6100" }}>{"Amber headers"}</b>
              {" mark numbers that are known to be incomplete — compare them between teams, "}
              {"do not read them as absolute."}
            </span>
          </div>

          <div style={S.srcRow}>
            {teamForm && <span style={S.src}>{"Shots, goals, cards, clean sheets — football-data E0, 380 matches"}</span>}
            {luck && <span style={S.src}>{"xG and xGC — FPL player totals, roughly 19% short (players who left the league)"}</span>}
            {bsdTeams && <span style={S.src}>
              {`Big chances and xG per shot — BSD shot map, ${bsdTeams.matches || 0} matches (2025/26 only)`}
            </span>}
            {teamShots && <span style={S.src}>
              {`Shot zones — ESPN commentary, ${teamShots.matches || 0} matches`}
              {teamShots.no_zone ? ` (${teamShots.no_zone} shots carried no zone text and are counted in the totals only)` : ""}
            </span>}
          </div>
        </>
      )}
    </section>
  );
}

const S = {
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 12 },
  headRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  h2: { margin: 0, fontSize: 16, fontWeight: 700, color: C.text },
  sub: { fontSize: 11.5, color: C.text3, marginTop: 2 },
  note: { fontSize: 11.5, color: C.text2, background: C.cardAlt, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "8px 10px", margin: "10px 0 0", lineHeight: 1.45 },
  warn: { fontSize: 11.5, color: "#7a5600", background: C.amberBg, border: "1px solid #f0dcae",
    borderRadius: 8, padding: "8px 10px", margin: "8px 0 0", lineHeight: 1.45 },
  groupRow: { display: "flex", gap: 4, flexWrap: "wrap", margin: "12px 0 8px" },
  groupBtn: { border: "none", background: "transparent", color: C.text2, borderRadius: 5,
    padding: "4px 9px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  groupOn: { background: "#f1e9f2", color: C.purple },
  scroll: { overflowX: "auto" },
  table: { borderCollapse: "separate", borderSpacing: 0, width: "100%", fontSize: 11.5 },
  th: { position: "sticky", top: 0, background: C.cardAlt, fontSize: 10.5, fontWeight: 700,
    color: C.text2, padding: "5px 7px", cursor: "pointer", userSelect: "none",
    whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}`, textAlign: "left" },
  thRight: { textAlign: "right" },
  thOn: { color: C.purple },
  /* OFULLKOMIN TALA VERDUR AD SJAST SEM SLIK A SKJANUM, ekki adeins i
     tooltip-i. xG og xGC eru kerfisbundid ~19% of lag (leikmenn sem foru
     ur deildinni vantar i FPL-summuna) og tala sem er ROng i thekktri att
     ma ekki lita eins ut og tala sem er rett. Litur en EKKI nytt tákn:
     †-merkid var tekid ut samdaegurs ad beidni notandans, svo ad baeta
     vid odru tákni vaeri ad ganga til baka i sama vanda.                */
  thIncomplete: { color: "#8a6100" },
  /* LIDID VERDUR AD HALDAST A SKJANUM. Taflan ber 22 dalka og skrunar
     larett innan sins kassa; an frysts fyrsta dalks veit madur ekki hvada
     rod hann er ad lesa thegar hann er kominn ut i "langskot a sig" —
     og thad er einmitt dalkurinn sem madur skrunar ad.

     BAKGRUNNURINN ER SKILYRDI, EKKI SKRAUT: `background:"inherit"` a
     frystu holfi erfir GAGNSAETT fra rod sem hefur engan eigin lit, og
     tha skruna tolurnar SYNILEGA UNDIR lidsheitinu. Su villa var maeld i
     leikmannalistanum 8.8.2026 ("6*Gabriel +GBP1.3") — hún er ekki
     endurtekin hér: liturinn er GEFINN BEINT.                            */
  thName: { position: "sticky", left: 0, zIndex: 2, background: C.cardAlt },
  tdName: { position: "sticky", left: 0, zIndex: 1, background: C.card,
    display: "flex", alignItems: "center", gap: 5, padding: "4px 7px",
    borderBottom: "1px solid #f4f4f6", whiteSpace: "nowrap",
    borderRight: `1px solid ${C.border}` },
  short: { fontFamily: mono, fontWeight: 700, fontSize: 11.5, color: C.text },
  name: { fontSize: 11, color: C.text3 },
  td: { textAlign: "right", fontFamily: mono, padding: "4px 7px", color: C.text2,
    borderBottom: "1px solid #f4f4f6", whiteSpace: "nowrap" },
  best: { background: C.greenBg, color: "#0a5c3e", fontWeight: 700 },
  worst: { background: "#fdecee", color: "#8f2230", fontWeight: 700 },
  legend: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 10 },
  chip: { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 6px" },
  legendTxt: { fontSize: 11, color: C.text3 },
  srcRow: { display: "flex", flexDirection: "column", gap: 2, marginTop: 8 },
  src: { fontSize: 10.5, color: C.text3 },
  code: { fontFamily: mono, fontSize: 10.5, background: "#fff", padding: "1px 4px",
    borderRadius: 3, border: `1px solid ${C.border}` },
};
