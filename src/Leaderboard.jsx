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
import { STAT_DEFS, STAT_GROUPS, STAT_BY_KEY, buildLeaderboard, fmtStat, minutesFloor, num,
         imminentBoard, moScore, aoScore, MO_WEIGHTS, nameScore } from "./stats.js";

const POS_TABS = [["all","Allir"],["1","Markv."],["2","Vörn"],["3","Miðja"],["4","Sókn"]];
const POS_LABEL = { 1:"MV", 2:"V", 3:"M", 4:"S" };
const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };

export default function Leaderboard({ players, teams, teamById, Crest, onPickPlayer, seasonNote, imminent, photoUrl }) {
  const [mode, setMode] = useState("overview");     // "overview" | "table" | "imminent"
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
          <button style={{ ...S.modeBtn, ...(mode==="imminent"?S.modeOn:{}) }}
            onClick={() => setMode("imminent")} title="Hverjir eru við það að skora eða leggja upp">
            Óhjákvæmilegt
          </button>
          <button style={{ ...S.modeBtn, ...(mode==="table"?S.modeOn:{}) }}
            onClick={() => {
              /* Flokkurinn verdur ad FYLGJA voldu tolunni. Annars sast
                 "Stig" i gildis-dalknum medan tolu-hnapparnir syndu Sokn —
                 ekkert virtist valid og notandinn sa ekki eftir hverju
                 var radad. */
              setMode("table");
              const g = STAT_BY_KEY[statKey]?.group;
              if (g) setGroup(g);
            }}>Tafla</button>
        </div>
      </div>

      {seasonNote && <div style={S.note}>{seasonNote}</div>}
      {!hasAnyMinutes && (
        <div style={S.warn}>
          Enginn leikmaður hefur spilaðar mínútur í þessum gögnum — tímabilið er ekki byrjað.
          Töflurnar fyllast þegar GW1 er lokið.
        </div>
      )}

      {/* ---- Sameiginlegar síur (eiga ekki við í Óhjákvæmilegt) ---- */}
      {mode !== "imminent" && <div style={S.filters}>
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
      </div>}

      {/* ---- Flokka-val ---- */}
      {mode !== "imminent" && <div style={S.groupRow}>
        {STAT_GROUPS.map(g => (
          <button key={g.key} style={{ ...S.groupBtn, ...(group===g.key?S.groupOn:{}) }}
            onClick={() => {
              setGroup(g.key);
              // i toflu-ham fylgir valda talan flokknum svo skiptin se ekki daud
              const first = STAT_DEFS.find(d => d.group === g.key);
              if (mode === "table" && first) setStatKey(first.key);
            }}>{g.label}</button>
        ))}
      </div>}

      {mode === "imminent" ? (
        <ImminentPanel imminent={imminent} teamById={teamById} Crest={Crest}
          photoUrl={photoUrl} players={players} onPickPlayer={onPickPlayer} />
      ) : mode === "overview" ? (
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


/* ============================================================
   OHJAKVAEMILEGT — MO og AO med TREND-LINURITI

   Linuritid er ekki skraut: thad synir HVERT umferdar-gildi i glugganum,
   svo notandinn sjai hvort magnid er ad BYGGJAST UPP eða hvort ein umferd
   ber allt. Fjorar umferdir, hvert stak er raunveruleg maeling.

   Vogtolurnar og maelingin a bak vid MO/AO eru i src/stats.js.
   ============================================================ */
function ImminentPanel({ imminent, teamById, Crest, photoUrl, players, onPickPlayer }) {
  const [kind, setKind] = useState("mo");
  const board = useMemo(
    () => imminent ? imminentBoard(imminent.players, kind, 12) : [], [imminent, kind]);
  /* SAFN-RADIR EIGA ENGAN `code` (sja deriveImminent) svo code-uppfletting
     ein og ser skilar engum myndum. Vid follum a NAFN + LID, sama adferd og
     matchShotsToPlayers notar — og krefjumst othraedds sigurvegara.        */
  const findCur = useMemo(() => {
    const byCode = {}, byTeam = {};
    for (const p of players || []) {
      if (p.code != null) byCode[String(p.code)] = p;
      (byTeam[teamById?.[p.team]?.short] ||= []).push(p);
    }
    return row => {
      if (row.code != null && byCode[String(row.code)]) return byCode[String(row.code)];
      const cands = byTeam[row.team] || [];
      let best = null, bs = 0, second = 0;
      for (const c of cands) {
        const sc = nameScore(row.name, c.web_name) ||
                   nameScore(row.name, `${c.first_name} ${c.second_name}`);
        if (sc > bs) { second = bs; bs = sc; best = c; }
        else if (sc > second) second = sc;
      }
      return (best && bs >= 1 && bs > second) ? best : null;
    };
  }, [players, teamById]);

  if (!imminent) {
    return <div style={S.warn}>Sæki <code>imminent.json</code>… pipeline hefur ekki skrifað hana enn.</div>;
  }
  const isMo = kind === "mo";
  const serieKey = isMo ? "xg" : "cre";

  return (
    <>
      <div style={S.immHead}>
        <div style={S.modeRow}>
          <button style={{ ...S.modeBtn, ...(isMo ? S.modeOn : {}) }}
            onClick={() => setKind("mo")}>⚽ Mark óhjákvæmilegt</button>
          <button style={{ ...S.modeBtn, ...(!isMo ? S.modeOn : {}) }}
            onClick={() => setKind("ao")}>◎ Assist óhjákvæmilegt</button>
        </div>
        <span style={S.muted}>
          {imminent.archive ? "SAFN · " : ""}{imminent.season} · GW{imminent.gws?.join(", ")}
        </span>
      </div>

      <div style={S.note}>
        {isMo ? (
          <>
            <b>Hverjir eru við það að skora.</b> Aðeins leikmenn með <b>0–1 framlag</b> í
            síðustu {imminent.window} umferðum — sá sem er þegar sprunginn út þarf enga spá.
            Stuðullinn er <code>xG·0,8 + threat/25·0,3 + óheppni·0,2</code>, <b>mældur</b> á
            13.273 sýnum yfir 3 tímabil: efsti tíundarhlutinn skorar <b>2,89×</b> meðaltalið,
            á móti 2,70 fyrir xG eitt og 2,78 fyrir threat eitt (út af úrtaki, 2/3 tímabil).
          </>
        ) : (
          <>
            <b>Hverjir eru við það að leggja upp.</b> Þetta er <b>bert creativity/90</b> — og það
            er niðurstaða mælingar, ekki leti: samsettur aó-stuðull (xA + creativity + óheppni)
            var prófaður og <b>féll</b>, 2,18 á móti 2,21 fyrir bert creativity, og tapaði í
            <b> 0 af 3</b> tímabilum. xA-vogin valdist alltaf 0. Við birtum því það sem virkar.
          </>
        )}
      </div>

      <div style={S.immGrid}>
        {board.map((p, i) => {
          const cur = findCur(p);
          const img = photoUrl && cur?.code ? photoUrl(cur.code) : null;
          const t = cur ? teamById?.[cur.team] : null;
          const series = (p.series || []).map(x => x[serieKey] ?? 0);
          return (
            <div key={p.name + i} style={S.immCard}
              onClick={() => cur && onPickPlayer && onPickPlayer(cur.id)}>
              <div style={S.immTop}>
                <span style={S.immRank}>{i + 1}</span>
                {img
                  ? <img src={img} alt="" style={S.immImg} loading="lazy" />
                  : <span style={S.immImgFb}>{(p.name || "?").slice(0, 1)}</span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.immName}>{p.name}</div>
                  <div style={S.immMeta}>
                    {t ? <Crest team={t} size={11} /> : null} {p.team} · {p.pos}
                    {cur ? ` · £${((cur.now_cost ?? 0) / 10).toFixed(1)}` : ""}
                  </div>
                </div>
                <div style={S.immScore} title={isMo ? "mó-stuðull" : "aó-stuðull"}>
                  {p.score}
                </div>
              </div>

              <Spark values={series} label={isMo ? "xG per umferð" : "creativity per umferð"}
                gws={(p.series || []).map(x => x.gw)} />

              <div style={S.immStats}>
                {isMo ? (
                  <>
                    <span><b>{p.window.xg.toFixed(2)}</b> xG</span>
                    <span><b>{Math.round(p.window.threat)}</b> threat</span>
                    <span title="xG mínus mörk — hversu mikið hann á inni">
                      <b>{Math.max(0, p.window.xg - p.window.goals).toFixed(2)}</b> á inni</span>
                  </>
                ) : (
                  <>
                    <span><b>{Math.round(p.window.creativity)}</b> creativity</span>
                    <span><b>{p.window.xa.toFixed(2)}</b> xA</span>
                  </>
                )}
                <span style={S.immGi}>{p.window.gi} framlag</span>
              </div>
            </div>
          );
        })}
      </div>
      {!board.length && <div style={S.muted}>Enginn leikmaður í markhóp í þessum glugga.</div>}
    </>
  );
}

/* Einfalt linurit — engin adkeypt eining, bara SVG. */
function Spark({ values, gws, label }) {
  if (!values?.length) return null;
  const W = 150, H = 34, PAD = 3;
  const max = Math.max(...values, 0.0001);
  const step = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [PAD + i * step, H - PAD - (v / max) * (H - PAD * 2)]);
  const d = pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
  const area = `${d} L${pts[pts.length-1][0].toFixed(1)},${H-PAD} L${pts[0][0].toFixed(1)},${H-PAD} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={S.spark} role="img"
      aria-label={`${label}: ${values.join(", ")}`}>
      <path d={area} fill="#37003c" fillOpacity="0.08" />
      <path d={d} fill="none" stroke="#37003c" strokeWidth="1.6" strokeLinejoin="round" />
      {pts.map((q, i) => (
        <circle key={i} cx={q[0]} cy={q[1]} r="2.2" fill="#37003c">
          <title>{`GW${gws?.[i] ?? "?"}: ${values[i]}`}</title>
        </circle>
      ))}
    </svg>
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
  const { def, rows, total, skipped } = table;   // table.incoherent notad nedar
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
        {table.incoherent > 0 && (
          <> {" "}<b style={{ color:"#c98a00" }}>{table.incoherent} tekinn út</b> — FPL-API-ið
          gefur tölu sem er ómöguleg miðað við 0 spilaðar mínútur.</>
        )}
      </div>
    </>
  );
}


const IMM_STYLES = {
  immHead:{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10,
            flexWrap:"wrap", marginBottom:8 },
  immGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(232px, 1fr))", gap:8 },
  immCard:{ border:"1px solid #e0e0e4", borderRadius:8, background:"#fafafb", padding:"7px 9px",
            cursor:"pointer" },
  immTop:{ display:"flex", alignItems:"center", gap:6 },
  immRank:{ fontSize:10, fontFamily:"ui-monospace, Menlo, monospace", color:"#8b8b95",
            width:14, flex:"0 0 14px" },
  immImg:{ width:30, height:38, objectFit:"contain", flex:"0 0 30px" },
  immImgFb:{ width:30, height:38, display:"flex", alignItems:"center", justifyContent:"center",
             background:"#efeff2", borderRadius:4, fontSize:13, color:"#61616b", flex:"0 0 30px" },
  immName:{ fontSize:11.5, fontWeight:600, color:"#1d1d20", overflow:"hidden",
            textOverflow:"ellipsis", whiteSpace:"nowrap" },
  immMeta:{ fontSize:9.5, color:"#8b8b95", display:"flex", alignItems:"center", gap:3 },
  immScore:{ fontSize:15, fontWeight:700, color:"#37003c",
             fontFamily:"ui-monospace, Menlo, monospace" },
  spark:{ width:"100%", height:34, display:"block", margin:"4px 0 2px" },
  immStats:{ display:"flex", gap:7, flexWrap:"wrap", fontSize:9.5, color:"#61616b" },
  immGi:{ marginLeft:"auto", color:"#8b8b95" },
};
const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

const S = {
  ...IMM_STYLES,
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 },
  head:{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:8 },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  modeRow:{ display:"flex", gap:4 },
  modeBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:6,
            padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer" },
  modeOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  note:{ fontSize:11.5, color:C.text2, lineHeight:1.45, margin:"0 0 8px" },
  warn:{ fontSize:11.5, color:C.amber, background:C.amberBg, border:`1px solid #f0dcae`,
         borderRadius:6, padding:"6px 8px", marginBottom:8, lineHeight:1.45 },
  muted:{ fontSize:11.5, color:C.text3, margin:"6px 0 0", lineHeight:1.45 },

  filters:{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:8 },
  posRow:{ display:"flex", gap:3 },
  posBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:5,
           padding:"3px 8px", fontSize:11.5, fontWeight:600, cursor:"pointer" },
  posOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
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
  statOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
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
