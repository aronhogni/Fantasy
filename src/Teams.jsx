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
import { buildTeamRows, TEAM_STAT_DEFS, TEAM_GROUPS, sortTeamRows } from "./teamstats.js";

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

export default function Teams({ teams, teamForm, luck, teamShots }) {
  const [group, setGroup] = useState("keeper");
  const [sort, setSort] = useState({ key: "sot_against_pg", dir: "asc" });

  const rows = useMemo(
    () => buildTeamRows({ teams, teamForm, luck, teamShots }),
    [teams, teamForm, luck, teamShots]);

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
      style={{ ...S.th, ...(right ? S.thRight : null), ...(sort.key === key ? S.thOn : null) }}
      onClick={() => setSort(s => s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: TEAM_STAT_DEFS.find(d => d.key === key)?.hi === false ? "asc" : "desc" })}>
      {label}{sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  const missing = !teamForm && !luck && !teamShots;
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
      <p style={S.warn}>
        <b>{"Big chances faced are not here, and will not be."}</b>{" They need expected goals "}
        {"per individual shot, and no reachable source provides it (FBref and SofaScore both "}
        {"return 403, Understat no longer serves shot data, FotMob is gated). "}
        <b>{"Close-range faced"}</b>{" is what the data does support — shots from the six-yard "}
        {"area, counted by ESPN itself. It is a measured stand-in, not the same number, so it "}
        {"carries its own name."}
      </p>

      {missing ? (
        <p style={S.note}>{"Team data has not loaded."}</p>
      ) : (
        <>
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
                    <td style={S.tdName}>
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
              {"lower is better — except long shots faced, where higher is better."}
            </span>
          </div>

          <div style={S.srcRow}>
            {teamForm && <span style={S.src}>{"Shots, goals, cards, clean sheets — football-data E0, 380 matches"}</span>}
            {luck && <span style={S.src}>{"xG and xGC — FPL player totals, roughly 19% short (players who left the league)"}</span>}
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
  tdName: { display: "flex", alignItems: "center", gap: 5, padding: "4px 7px",
    borderBottom: "1px solid #f4f4f6", whiteSpace: "nowrap" },
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
};
