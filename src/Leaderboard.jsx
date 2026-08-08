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
import { interp } from "./interp.js";
import { STAT_DEFS, STAT_GROUPS, buildLeaderboard, fmtStat, minutesFloor,
         num } from "./stats.js";

/* Islensku heitin eru LYKLAR i orðabokinni (sja i18n.js) — thess vegna
   stendur `t()` a NOTKUNARSTADNUM og ekki her: fastar a einingarsvidi eru
   reiknadar EINU SINNI vid innflutning og hefdu thvi frosid a thvi
   tungumali sem var valid tha.                                         */
const POS_TABS = [["all","All"],["1","GK"],["2","Defence"],["3","Midfield"],["4","Attack"]];
const POS_LABEL = { 1:"GK", 2:"D", 3:"M", 4:"F" };
const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };

export default function Leaderboard({ players, teams, teamById, Crest, onPickPlayer, seasonNote }) {
  /* EINN LESMATI EFTIR — YFIRLIT (8.8.2026). Thrennt fluttist eda for:
       · "Table"       -> undir Player stats sem "Build table". Su gat adeins
                          EINA tolu i einu; beidnin var ad velja MARGAR og
                          bera saman, sem er thad sem taflan gerir nu.
       · "Imminent"    -> undir Player stats (src/Imminent.jsx).
       · "Bench risk"  -> TEKID UT. Hun birti somu maeldu toluna sem
                          `Start prob`-dalkurinn birtir, ur somu skra.
     Thad sem YFIRLITID gerir og hvorugt hinna gerir er ad syna topp-5 i
     TUTTUGU tolum i einu — skonnun, ekki rodun. Thess vegna er thad eftir. */
  const [group, setGroup] = useState("attack");
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

  if (!players?.length) {
    return <section style={S.card}><div style={S.muted}>{"Fetching player data…"}</div></section>;
  }

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <h2 style={S.h2}>{"Leaderboard"}</h2>
          <div style={S.sub}>{"Top 5 in every stat of the chosen category"}</div>
        </div>
      </div>

      {seasonNote && <div style={S.note}>{seasonNote}</div>}
      {!hasAnyMinutes && (
        <div style={S.warn}>
          {"No player has minutes played in this data — the season has not started. The tables fill up once GW1 is finished."}
        </div>
      )}

      {/* ---- Sameiginlegar síur (eiga ekki við í Óhjákvæmilegt) ---- */}
      {<div style={S.filters}>
        <div style={S.posRow}>
          {POS_TABS.map(([v,l]) => (
            <button key={v} style={{ ...S.posBtn, ...(pos===v?S.posOn:{}) }}
              onClick={() => setPos(v)}>{l}</button>
          ))}
        </div>
        <select style={S.select} value={teamId} onChange={e => setTeamId(e.target.value)}>
          <option value="all">{"All teams"}</option>
          {(teams || []).slice().sort((a,b)=>String(a.short).localeCompare(String(b.short)))
            .map(t => <option key={t.id} value={t.id}>{t.short}</option>)}
        </select>
        <input style={S.input} placeholder={"Search for a player"} value={search}
          onChange={e => setSearch(e.target.value)} />
        <label style={S.check} title={interp("Skips players below {0} min in /90 and % figures. Guards against 12-minute samples.", [minMin])}>
          <input type="checkbox" checked={limitRate} onChange={e => setLimitRate(e.target.checked)} />
          {"min."} {minMin} {"min in rate figures"}
        </label>
        <label style={S.check}>
          <input type="checkbox" checked={onlyAvail} onChange={e => setOnlyAvail(e.target.checked)} />
          {"available only"}
        </label>
      </div>}

      {group === "rank" && (
        <div style={S.note}>
          <b>{"These are FPL ranks WITHIN the position"}</b>{", not among all players — so each position has its own no. 1. That is why four players show \"1\" when no position filter is set (best GK, best DEF, best MID, best FWD)."} <b>{"Lower is better."}</b> {"Example: Raya has 4.4 points/match → rank"} <b>3</b> {"among goalkeepers but 32nd overall."}
        </div>
      )}

      {/* ---- Flokka-val ---- */}
      {<div style={S.groupRow}>
        {STAT_GROUPS.map(g => (
          <button key={g.key} style={{ ...S.groupBtn, ...(group===g.key?S.groupOn:{}) }}
            onClick={() => setGroup(g.key)}>{g.label}</button>
        ))}
      </div>}

      <div style={S.grid}>
        {groupStats.map(def => (
          <MiniBoard key={def.key} def={def} players={players} pos={pos} teamId={teamId}
            search={search} minMin={minMin} onlyAvail={onlyAvail}
            teamById={teamById} Crest={Crest} onPickPlayer={onPickPlayer} />
        ))}
      </div>

      <div style={S.legend}>
        <b>†</b> {"= computed by us from FPL fields, not a field FPL publishes itself. Rate figures (/90, %) obey the minutes floor; totals do not."}
      </div>
    </section>
  );
}

/* ---- Top-5 kassi fyrir eina tolu ---- */
function MiniBoard({ def, players, pos, teamId, search, minMin, onlyAvail, teamById, Crest, onPickPlayer }) {
  const { rows, total, skipped, incoherent } = useMemo(() => buildLeaderboard({
    players, statKey: def.key, pos, teamId, search, minMinutes: minMin,
    onlyAvailable: onlyAvail, limit: 5,
  }), [players, def.key, pos, teamId, search, minMin, onlyAvail]);

  return (
    <div style={S.mini}>
      <div style={S.miniHead} title={def.note || ""}>
        <span style={S.miniTitle}>
          {def.label}{def.derived ? <i style={S.derived}>†</i> : null}
        </span>
        <span style={S.miniMore}>{def.hi ? "highest" : "lowest"}</span>
      </div>
      {!rows.length ? (
        <div style={S.miniEmpty}>{"No numbers"}</div>
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
        <div style={S.miniNote} title={interp("{0} players below {1} min are excluded", [skipped, minMin])}>
          {skipped} {"below the minutes floor"}
        </div>
      )}
      {total > 5 && <div style={S.miniNote}>{"of"} {total}</div>}
      {/* OTRULEGA TALAN — VORDURINN SEM MATTI EKKI TAPAST.
          FPL skilar t.d. `goals_scored: 11` med `minutes: 0` (Meslier,
          2025/26 — 1 af 563). `isIncoherent` i buildLeaderboard tekur hana
          UT og TELUR hana, og talan var birt i "Table"-hamnum sem er nu
          farinn. Hun er thvi birt HER — annars hefdi vordurinn haldid afram
          ad virka i throfum en engum sagt fra ser, sem er sama gildran og
          dauði markadslidurinn (CLAUDE.md kafli 3).                       */}
      {incoherent > 0 && (
        <div style={{ ...S.miniNote, color:"#c98a00" }}
          title={"The FPL API reports a value that is impossible with 0 minutes played. Removed from this board and counted here."}>
          {incoherent} {"impossible"}
        </div>
      )}
    </div>
  );
}

/* `C` og `mono` bjuggu MILLI theirra tveggja stila-blokka sem foru (rett
   fyrir `const S`), svo their fylgdu theim ut — thess vegna er skran hér
   fyrir nedan endurreist. Litirnir eru their somu.                      */
const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

/* SR_STYLES og IMM_STYLES eru FARIN med sinum spjoldum (bekkjar-haetta ut,
   IG/IA i src/Imminent.jsx). Spread-in a thau stodu eftir og hentu
   `ReferenceError: SR_STYLES is not defined` — HVITAN SKJA a stigatoflunni.
   ATH: `npx esbuild` sa thetta EKKI (hann thattar, hann leysir ekki nofn),
   svo syntax-tekk er ekki nog eftir ad blokkir eru fluttar milli skraa.
   Thad sem sa thad var appid i vafra og tests/data-resilience.mjs, sem
   opnar hvern flipa og krefst thess ad hann birti eitthvad marktaekt.   */
const S = {
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 },
  head:{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:8 },
  sub:{ fontSize:11, color:C.text3, marginTop:2 },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
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

  derived:{ fontStyle:"normal", fontSize:9, opacity:0.65, marginLeft:2 },

  nameBtn:{ display:"flex", alignItems:"center", gap:5, border:"none", background:"transparent",
            cursor:"pointer", padding:0, maxWidth:200 },
  nm:{ fontSize:12, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  tag:{ fontSize:9, fontWeight:700 },
  flag:{ fontSize:9, fontWeight:700, color:C.red },
  legend:{ fontSize:10.5, color:C.text3, marginTop:10, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.5 },
};
