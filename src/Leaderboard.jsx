/* ============================================================
   LEADERBOARD.JSX — flipinn "Stigatafla"

   Tvo lesmatar a somu skra (src/stats.js):
     YFIRLIT — top-5 tafla fyrir HVERJA tolu i voldum flokki, til ad
       skanna margt i einu. Thetta er sjalfgefid: spurningin er oftast
       "hver er bestur i einhverju", ekki "hver er 34. i xG".
     TAFLA  — ein tala, full rodun, med samhengis-dalkum.

   ENGIN FORMULA HER. Hver tala kemur ur STAT_DEFS[].get() svo prófin
   i tests/stats.test.mjs maeli somu tolu sem birtist a skjanum.
   ============================================================ */

import React, { useState, useMemo } from "react";
import { STAT_DEFS, STAT_GROUPS, STAT_BY_KEY, buildLeaderboard, fmtStat, minutesFloor, num } from "./stats.js";

const POS_TABS = [["all","Allir"],["1","Markv."],["2","Vörn"],["3","Miðja"],["4","Sókn"]];
const POS_LABEL = { 1:"MV", 2:"V", 3:"M", 4:"S" };
const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };

export default function Leaderboard({ players, teams, teamById, Crest, onPickPlayer, seasonNote }) {
  const [mode, setMode] = useState("overview");     // "overview" | "table"
  const [group, setGroup] = useState("attack");
  const [statKey, setStatKey] = useState("total_points");
  const [pos, setPos] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [search, setSearch] = useState("");
  const [limitRate, setLimitRate] = useState(true);  // beita minutu-thaki a hlutfallstolur
  const [onlyAvail, setOnlyAvail] = useState(false);

  /* Minutu-thakid er HLUTFALL af mestu spiludu minutum, ekki fost tala —
     svo það virki eins i GW3 og GW38 an handstillingar. 25% valid: i
     fullu timabili (~3.400 min) gefur það ~850 min, sem er nogu lagt til
     ad hleypa hlutastarfs-leikmonnum ad en hendir 90-minutu urtokum ut. */
  const minMin = useMemo(() => (limitRate ? minutesFloor(players || [], 0.25) : 0), [players, limitRate]);

  const hasAnyMinutes = useMemo(
    () => (players || []).some(p => (num(p.minutes) ?? 0) > 0), [players]);

  const groupStats = useMemo(
    () => STAT_DEFS.filter(d => d.group === group), [group]);

  const table = useMemo(() => buildLeaderboard({
    players: players || [], statKey, pos, teamId, search,
    minMinutes: minMin, onlyAvailable: onlyAvail, limit: 200,
  }), [players, statKey, pos, teamId, search, minMin, onlyAvail]);

  if (!players?.length) {
    return <section style={S.card}><div style={S.muted}>Sæki leikmannagögn…</div></section>;
  }

  return (
    <section style={S.card}>
      <div style={S.head}>
        <h2 style={S.h2}>Stigatafla</h2>
        <div style={S.modeRow}>
          <button style={{ ...S.modeBtn, ...(mode==="overview"?S.modeOn:{}) }}
            onClick={() => setMode("overview")}>Yfirlit</button>
          <button style={{ ...S.modeBtn, ...(mode==="table"?S.modeOn:{}) }}
            onClick={() => setMode("table")}>Tafla</button>
        </div>
      </div>

      {seasonNote && <div style={S.note}>{seasonNote}</div>}
      {!hasAnyMinutes && (
        <div style={S.warn}>
          Enginn leikmaður hefur spilaðar mínútur í þessum gögnum — tímabilið er ekki byrjað.
          Töflurnar fyllast þegar GW1 er lokið.
        </div>
      )}

      {/* ---- Sameiginlegar síur ---- */}
      <div style={S.filters}>
        <div style={S.posRow}>
          {POS_TABS.map(([v,l]) => (
            <button key={v} style={{ ...S.posBtn, ...(pos===v?S.posOn:{}) }}
              onClick={() => setPos(v)}>{l}</button>
          ))}
        </div>
        <select style={S.select} value={teamId} onChange={e => setTeamId(e.target.value)}>
          <option value="all">Öll lið</option>
          {(teams || []).slice().sort((a,b)=>String(a.short).localeCompare(String(b.short)))
            .map(t => <option key={t.id} value={t.id}>{t.short}</option>)}
        </select>
        <input style={S.input} placeholder="Leita að leikmanni" value={search}
          onChange={e => setSearch(e.target.value)} />
        <label style={S.check} title={`Sleppir leikmönnum undir ${minMin} mín í /90- og %-tölum. Verndar gegn 12-mínútna úrtökum.`}>
          <input type="checkbox" checked={limitRate} onChange={e => setLimitRate(e.target.checked)} />
          mín. {minMin} mín í hlutfallstölum
        </label>
        <label style={S.check}>
          <input type="checkbox" checked={onlyAvail} onChange={e => setOnlyAvail(e.target.checked)} />
          aðeins leikhæfir
        </label>
      </div>

      {/* ---- Flokka-val ---- */}
      <div style={S.groupRow}>
        {STAT_GROUPS.map(g => (
          <button key={g.key} style={{ ...S.groupBtn, ...(group===g.key?S.groupOn:{}) }}
            onClick={() => {
              setGroup(g.key);
              // i toflu-ham fylgir valda talan flokknum svo skiptin se ekki daud
              const first = STAT_DEFS.find(d => d.group === g.key);
              if (mode === "table" && first) setStatKey(first.key);
            }}>{g.label}</button>
        ))}
      </div>

      {mode === "overview" ? (
        <div style={S.grid}>
          {groupStats.map(def => (
            <MiniBoard key={def.key} def={def} players={players} pos={pos} teamId={teamId}
              search={search} minMin={minMin} onlyAvail={onlyAvail}
              teamById={teamById} Crest={Crest} onPickPlayer={onPickPlayer}
              onOpen={() => { setStatKey(def.key); setMode("table"); }} />
          ))}
        </div>
      ) : (
        <>
          <div style={S.statRow}>
            {groupStats.map(def => (
              <button key={def.key} style={{ ...S.statBtn, ...(statKey===def.key?S.statOn:{}) }}
                onClick={() => setStatKey(def.key)} title={def.note || ""}>
                {def.label}{def.derived ? <i style={S.derived} title="Reiknað af okkur úr FPL-sviðum">†</i> : null}
              </button>
            ))}
          </div>
          <FullTable table={table} teamById={teamById} Crest={Crest}
            onPickPlayer={onPickPlayer} minMin={minMin} />
        </>
      )}

      <div style={S.legend}>
        <b>†</b> = reiknað af okkur úr FPL-sviðum, ekki svið sem FPL birtir sjálft.
        Hlutfallstölur (/90, %) hlýða mínútu-þakinu; heildartölur ekki.
      </div>
    </section>
  );
}

/* ---- Top-5 kassi fyrir eina tolu ---- */
function MiniBoard({ def, players, pos, teamId, search, minMin, onlyAvail, teamById, Crest, onPickPlayer, onOpen }) {
  const { rows, total, skipped } = useMemo(() => buildLeaderboard({
    players, statKey: def.key, pos, teamId, search, minMinutes: minMin,
    onlyAvailable: onlyAvail, limit: 5,
  }), [players, def.key, pos, teamId, search, minMin, onlyAvail]);

  return (
    <div style={S.mini}>
      <button style={S.miniHead} onClick={onOpen} title={def.note || "Opna fulla töflu"}>
        <span style={S.miniTitle}>
          {def.label}{def.derived ? <i style={S.derived}>†</i> : null}
        </span>
        <span style={S.miniMore}>{def.hi ? "hæst" : "lægst"} ›</span>
      </button>
      {!rows.length ? (
        <div style={S.miniEmpty}>Engar tölur</div>
      ) : rows.map(r => {
        const t = teamById?.[r.p.team];
        return (
          <button key={r.p.id} style={S.miniRow} onClick={() => onPickPlayer && onPickPlayer(r.p.id)}>
            <span style={S.miniRank}>{r.rank}</span>
            {Crest && t ? <Crest team={t} size={13} /> : null}
            <span style={S.miniName}>{r.p.web_name}</span>
            <span style={{ ...S.miniPos, color: POS_COLOR[r.p.element_type] }}>
              {POS_LABEL[r.p.element_type]}
            </span>
            <span style={S.miniVal}>{fmtStat(def, r.v)}</span>
          </button>
        );
      })}
      {skipped > 0 && (
        <div style={S.miniNote} title={`${skipped} leikmenn undir ${minMin} mín eru ekki með`}>
          {skipped} undir mínútu-þaki
        </div>
      )}
      {total > 5 && <div style={S.miniNote}>af {total}</div>}
    </div>
  );
}

/* ---- Full tafla fyrir eina tolu, med samhengis-dalkum ---- */
function FullTable({ table, teamById, Crest, onPickPlayer, minMin }) {
  const { def, rows, total, skipped } = table;
  if (!def) return null;
  const CTX = ["total_points","minutes","now_cost","selected_by_percent"]
    .filter(k => k !== def.key).map(k => STAT_BY_KEY[k]);

  return (
    <>
      {def.note && <div style={S.note}>{def.note}</div>}
      <div style={S.scroll}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, ...S.thRank }}>#</th>
              <th style={{ ...S.th, ...S.thName }}>Leikmaður</th>
              <th style={{ ...S.th, ...S.thVal }} title={def.note || ""}>{def.label}</th>
              {CTX.map(c => <th key={c.key} style={S.th}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const t = teamById?.[r.p.team];
              return (
                <tr key={r.p.id} style={S.tr}>
                  <td style={S.tdRank}>{r.rank}</td>
                  <td style={S.tdName}>
                    <button style={S.nameBtn} onClick={() => onPickPlayer && onPickPlayer(r.p.id)}>
                      {Crest && t ? <Crest team={t} size={14} /> : null}
                      <span style={S.nm}>{r.p.web_name}</span>
                      <span style={{ ...S.tag, color: POS_COLOR[r.p.element_type] }}>
                        {POS_LABEL[r.p.element_type]}
                      </span>
                      {r.p.status !== "a" && <span style={S.flag} title={r.p.news || "Ekki fullkomlega leikhæfur"}>!</span>}
                    </button>
                  </td>
                  <td style={S.tdVal}>{fmtStat(def, r.v)}</td>
                  {CTX.map(c => <td key={c.key} style={S.td}>{fmtStat(c, c.get(r.p))}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!rows.length && <div style={S.muted}>Enginn leikmaður með tölu í þessum flokki.</div>}
      <div style={S.muted}>
        {rows.length} af {total} sýndir.
        {skipped > 0 && ` ${skipped} sleppt vegna mínútu-þaks (${minMin} mín).`}
      </div>
    </>
  );
}

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

const S = {
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 },
  head:{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:8 },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  modeRow:{ display:"flex", gap:4 },
  modeBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:6,
            padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer" },
  modeOn:{ background:C.purple, color:"#fff", borderColor:C.purple },
  note:{ fontSize:11.5, color:C.text2, lineHeight:1.45, margin:"0 0 8px" },
  warn:{ fontSize:11.5, color:C.amber, background:C.amberBg, border:`1px solid #f0dcae`,
         borderRadius:6, padding:"6px 8px", marginBottom:8, lineHeight:1.45 },
  muted:{ fontSize:11.5, color:C.text3, margin:"6px 0 0", lineHeight:1.45 },

  filters:{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:8 },
  posRow:{ display:"flex", gap:3 },
  posBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:5,
           padding:"3px 8px", fontSize:11.5, fontWeight:600, cursor:"pointer" },
  posOn:{ background:C.purple, color:"#fff", borderColor:C.purple },
  select:{ border:`1px solid ${C.border}`, borderRadius:5, padding:"3px 6px", fontSize:11.5, color:C.text },
  input:{ border:`1px solid ${C.border}`, borderRadius:5, padding:"3px 7px", fontSize:11.5, minWidth:120, flex:"0 1 160px" },
  check:{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.text2, cursor:"pointer" },

  groupRow:{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10, borderBottom:`1px solid ${C.border}`, paddingBottom:8 },
  groupBtn:{ border:"none", background:"transparent", color:C.text2, borderRadius:5,
             padding:"4px 9px", fontSize:12, fontWeight:600, cursor:"pointer" },
  groupOn:{ background:"#f1e9f2", color:C.purple },

  grid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(215px, 1fr))", gap:8 },
  mini:{ border:`1px solid ${C.border}`, borderRadius:8, background:C.cardAlt, padding:6 },
  miniHead:{ display:"flex", width:"100%", alignItems:"center", justifyContent:"space-between",
             gap:6, border:"none", background:"transparent", cursor:"pointer", padding:"1px 2px 5px" },
  miniTitle:{ fontSize:11.5, fontWeight:700, color:C.text, textAlign:"left" },
  miniMore:{ fontSize:10, color:C.text3, whiteSpace:"nowrap" },
  miniRow:{ display:"flex", width:"100%", alignItems:"center", gap:5, border:"none",
            background:"transparent", cursor:"pointer", padding:"2px 2px", textAlign:"left" },
  miniRank:{ fontSize:10, color:C.text3, width:12, flex:"0 0 12px", fontFamily:mono },
  miniName:{ fontSize:11.5, color:C.text, flex:1, minWidth:0, overflow:"hidden",
             textOverflow:"ellipsis", whiteSpace:"nowrap" },
  miniPos:{ fontSize:9, fontWeight:700 },
  miniVal:{ fontSize:11.5, fontWeight:700, color:C.text, fontFamily:mono, whiteSpace:"nowrap" },
  miniEmpty:{ fontSize:11, color:C.text3, padding:"3px 2px" },
  miniNote:{ fontSize:9.5, color:C.text3, padding:"3px 2px 0" },

  statRow:{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 },
  statBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:5,
            padding:"3px 8px", fontSize:11.5, cursor:"pointer" },
  statOn:{ background:C.purple, color:"#fff", borderColor:C.purple },
  derived:{ fontStyle:"normal", fontSize:9, opacity:0.65, marginLeft:2 },

  scroll:{ overflowX:"auto" },
  table:{ borderCollapse:"collapse", width:"100%", fontSize:12 },
  th:{ textAlign:"right", padding:"5px 6px", fontSize:10, fontWeight:700, color:C.text2,
       borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" },
  thRank:{ textAlign:"left", width:28 },
  thName:{ textAlign:"left" },
  thVal:{ background:"#f6f1f7" },
  tr:{ borderBottom:`1px solid #f0f0f3` },
  td:{ textAlign:"right", padding:"4px 6px", color:C.text2, fontFamily:mono, whiteSpace:"nowrap" },
  tdRank:{ textAlign:"left", padding:"4px 6px", color:C.text3, fontFamily:mono, fontSize:11 },
  tdName:{ padding:"3px 6px" },
  tdVal:{ textAlign:"right", padding:"4px 6px", fontWeight:700, color:C.text,
          fontFamily:mono, background:"#faf7fb", whiteSpace:"nowrap" },
  nameBtn:{ display:"flex", alignItems:"center", gap:5, border:"none", background:"transparent",
            cursor:"pointer", padding:0, maxWidth:200 },
  nm:{ fontSize:12, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  tag:{ fontSize:9, fontWeight:700 },
  flag:{ fontSize:9, fontWeight:700, color:C.red },
  legend:{ fontSize:10.5, color:C.text3, marginTop:10, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.5 },
};
