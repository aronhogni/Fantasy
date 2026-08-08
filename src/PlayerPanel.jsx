/* ============================================================
   PLAYERPANEL.JSX — efsti hluti og tímabila-töflur á leikmannaspjaldi

   TVENNT SEM ER VILJANDI:

   1. PORAD A `code`, EKKI `id`. FPL endurnytir element-id milli timabila,
      svo tafla sem parar fyrri timabil a id syndi VITLAUSAN leikmann.
      data/player_seasons.json er lyklad a `code` (fast aevilangt).

   2. YFIRSTANDANDI TIMABIL ER TOMT THANGAD TIL THAD BYRJAR. Fyrir GW1
      birtir FPL-bootstrap enn LOKATOLUR fyrra timabils (Raya 162 stig i
      juli 2026). Ad setja thaer i dalkinn "2026/27" vaeri hrein osannindi
      — tvitekning a 2025/26 undir rongu artali. Thess vegna eru strik og
      skyring thangad til fyrsta umferd er lokin.

   Saeti ("3 af 412") eru reiknud i pipeline, ekki her — sja
   fetchPlayerSeasons i scripts/fetch.mjs.
   ============================================================ */

import React, { useState } from "react";
import { interp } from "./interp.js";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c", greenBg:"#e6f9f0",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

const n = v => { const x = typeof v === "number" ? v : parseFloat(v); return Number.isFinite(x) ? x : null; };
const f1 = v => v == null ? "—" : (+v).toFixed(1);
const f2 = v => v == null ? "—" : (+v).toFixed(2);
const i0 = v => v == null ? "—" : String(Math.round(v));

/* ============================================================
   1. EFSTI HLUTI — sex tolur sem skipta mestu, 2026/27
   ============================================================ */
export function PlayerHeadline({ p, buyTenths, sellTenths_, inSquad, onEditPrice, seasonStarted }) {
  if (!p) return null;
  const cost = n(p.now_cost);
  const buy = inSquad ? buyTenths : null;
  const sell = inSquad ? sellTenths_ : null;

  return (
    <div style={S.headGrid}>
      <div style={{ ...S.hTile, ...S.hTilePrice }}>
        <div style={S.hVal}>
          £{cost == null ? "—" : (cost / 10).toFixed(1)}
          {/* EITT lettur popup i stad heillar verd-blokkar med morgum glugga */}
          <button style={S.editBtn} title={"Edit the purchase price"}
            onClick={e => { e.stopPropagation(); onEditPrice && onEditPrice(); }}>✎</button>
        </div>
        <div style={S.hKey}>{"Price"}</div>
        {inSquad && buy != null && (
          <div style={S.hSub}>
            {"bought £"}{(buy / 10).toFixed(1)}
            {sell != null && <> {"· sell £"}{(sell / 10).toFixed(1)}</>}
          </div>
        )}
      </div>

      <Tile v={seasonStarted ? i0(n(p.total_points)) : "—"} k={"Total points"}
        sub={seasonStarted ? null : "not started"} />
      <Tile v={seasonStarted ? f1(n(p.points_per_game)) : "—"} k={"Pts/match"}
        sub={seasonStarted ? null : "not started"} />
      <Tile v={seasonStarted ? i0(n(p.bonus)) : "—"} k={"Bonus points"}
        sub={seasonStarted ? null : "not started"} />
      <Tile v={f1(n(p.form))} k="Form" sub={"rolling 30 days"} />
      <Tile v={`${p.selected_by_percent ?? "—"}%`} k={"Ownership"} />
    </div>
  );
}
function Tile({ v, k, sub }) {
  return (
    <div style={S.hTile}>
      <div style={S.hVal}>{v}</div>
      <div style={S.hKey}>{k}</div>
      {sub && <div style={S.hSub}>{sub}</div>}
    </div>
  );
}

/* ============================================================
   2. TIMABILA-TAFLA — 2026/27 efst, svo eldri, minni

   Trend-merking: borid vid NAESTA ELDRA timabil sem hefur toluna.
   Upp = feitletrad graent, nidur = rautt. `rev` snyr thvi vid (xGC, GC:
   laegra er BETRA, svo laekkun er jakvaed).
   ============================================================ */

const RANK = (rec, key) => {
  const r = rec?.rank?.[key], of = rec?.rank_of?.[key];
  return r ? interp("{0} of {1}", [r, of]) : null;
};

/* Ein rod i toflunni. `get(rec)` skilar { v (birt), num (til samanburdar) } */
function makeRows(pos, live, seasonStarted) {
  const isFwd = pos === 4;
  const defensive = !isFwd;             // "Varnarstats tharf ekki fyrir soknarmenn"

  const rows = [
    { label: "Total points", key: "total_points", rank: "total_points",
      get: r => ({ num: r.total_points, v: i0(r.total_points) }) },

    { label: "Starts / points 90", key: "starts",
      note: "Starts and points per 90 minutes",
      get: r => ({ num: r.points_per_90,
                   v: `${i0(r.starts)} / ${f2(r.points_per_90)}` }),
      rank: "points_per_90" },

    { label: "Minutes", key: "minutes", rank: "minutes",
      get: r => ({ num: r.minutes, v: i0(r.minutes) }) },

    { label: "Goals / xG / xG90", key: "goals_scored", rank: "expected_goals",
      get: r => ({ num: r.goals_scored,
                   v: `${i0(r.goals_scored)} / ${f2(r.expected_goals)} / ${f2(r.expected_goals_per_90)}` }) },

    { label: "Assists / xA / xA90", key: "assists", rank: "expected_assists",
      get: r => ({ num: r.assists,
                   v: `${i0(r.assists)} / ${f2(r.expected_assists)} / ${f2(r.expected_assists_per_90)}` }) },

    { label: "xGI", key: "expected_goal_involvements", rank: "expected_goal_involvements",
      get: r => ({ num: r.expected_goal_involvements, v: f2(r.expected_goal_involvements) }) },

    { label: "YC / RC", key: "yellow_cards", rev: true,
      get: r => ({ num: r.yellow_cards, v: `${i0(r.yellow_cards)} / ${i0(r.red_cards)}` }) },
  ];

  if (defensive) {
    rows.push(
      { label: "CS", key: "clean_sheets", rank: "clean_sheets",
        get: r => ({ num: r.clean_sheets, v: i0(r.clean_sheets) }) },
      /* xGC: LAEGRA ER BETRA. rev:true snyr baedi trend-litnum og saetinu
         (saetid kemur thegar rev-radad ur pipeline).                      */
      { label: "GC / xGC", key: "goals_conceded", rank: "expected_goals_conceded", rev: true,
        note: "Goals conceded and expected goals conceded — lower is better",
        get: r => ({ num: r.goals_conceded,
                     v: `${i0(r.goals_conceded)} / ${f2(r.expected_goals_conceded)}` }) },
      { label: "DC / DC%Start", key: "defensive_contribution", rank: "defensive_contribution",
        note: "Defensive contribution in total and per start. First appeared in 2025/26.",
        get: r => ({ num: r.defensive_contribution,
                     v: r.defensive_contribution == null ? "—"
                        : `${i0(r.defensive_contribution)} / ${f1(r.dc_per_start)}` }) },
    );
    if (pos === 1) rows.push(
      { label: "Saves", key: "saves", rank: "saves",
        get: r => ({ num: r.saves, v: i0(r.saves) }) });
  }

  rows.push({ label: "BP / BPS", key: "bonus", rank: "bps",
    get: r => ({ num: r.bps, v: `${i0(r.bonus)} / ${i0(r.bps)}` }) });

  return rows;
}

/* Bua til "rod" ur LIFANDI bootstrap svo yfirstandandi timabil noti somu
   uppsetningu og tofluraðirnar ur player_seasons.json.                    */
function liveRecord(p) {
  const mins = n(p.minutes) ?? 0, starts = n(p.starts) ?? 0;
  const tp = n(p.total_points), dc = n(p.defensive_contribution);
  return {
    total_points: tp, minutes: mins, starts,
    points_per_90: mins > 0 ? +(((tp ?? 0) / mins) * 90).toFixed(2) : null,
    goals_scored: n(p.goals_scored), assists: n(p.assists),
    expected_goals: n(p.expected_goals), expected_goals_per_90: n(p.expected_goals_per_90),
    expected_assists: n(p.expected_assists), expected_assists_per_90: n(p.expected_assists_per_90),
    expected_goal_involvements: n(p.expected_goal_involvements),
    expected_goals_conceded: n(p.expected_goals_conceded),
    clean_sheets: n(p.clean_sheets), goals_conceded: n(p.goals_conceded),
    saves: n(p.saves), bonus: n(p.bonus), bps: n(p.bps),
    yellow_cards: n(p.yellow_cards), red_cards: n(p.red_cards),
    defensive_contribution: dc,
    dc_per_start: (dc != null && starts > 0) ? +(dc / starts).toFixed(2) : null,
    rank: null, rank_of: null,           // lifandi saeti eru ekki reiknud
  };
}

export function SeasonTable({ p, seasonsFile, currentLabel, seasonStarted }) {
  if (!p) return null;
  const byCode = seasonsFile?.players?.[String(p.code)] || {};
  const older = (seasonsFile?.seasons || []).filter(s => s !== currentLabel);
  const rows = makeRows(p.element_type, p, seasonStarted);

  /* Dalkar: yfirstandandi fyrst (storst), svo eldri.
     Yfirstandandi er TOMUR thangad til timabilid byrjar — sja hausinn.   */
  const cols = [
    { label: currentLabel, rec: seasonStarted ? liveRecord(p) : null, cur: true },
    ...older.map(s => ({ label: s, rec: byCode[s] || null })),
  ];

  const anyOlder = older.some(s => byCode[s]);

  return (
    <>
      <div style={S.secLbl}>
        {"Season"}
        <span style={S.secNote}>
          {anyOlder ? "the rank is among everyone who played that season"
                    : "no earlier seasons on record for this player"}
        </span>
      </div>

      {!seasonStarted && (
        <div style={S.warn}>
          <b>{currentLabel} {"has not started."}</b> {"FPL still shows last season's final numbers in these fields, so they are"} <b>{"not"}</b> {"shown under"} {currentLabel} {"— that would duplicate"} {older[0] || "last season"} {"under the wrong year. The column fills up once GW1 is finished."}
        </div>
      )}

      <div style={S.scroll}>
        <table style={S.tbl}>
          <thead>
            <tr>
              <th style={S.thK}></th>
              {cols.map(c => (
                <th key={c.label} style={{ ...S.th, ...(c.cur ? S.thCur : {}) }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label} style={S.tr}>
                <td style={S.tdK} title={r.note || ""}>{r.label}</td>
                {cols.map((c, ci) => {
                  if (!c.rec) return <td key={c.label} style={{ ...S.td, ...(c.cur ? S.tdCur : {}) }}>—</td>;
                  const cell = r.get(c.rec);
                  // trend: bera vid naesta ELDRA dalk sem a tolu
                  let trend = null;
                  for (let j = ci + 1; j < cols.length; j++) {
                    const prev = cols[j].rec;
                    if (!prev) continue;
                    const pv = r.get(prev).num;
                    if (pv == null || cell.num == null) break;
                    if (cell.num !== pv) trend = (cell.num > pv) !== !!r.rev ? "up" : "down";
                    break;
                  }
                  const rankTxt = r.rank ? RANK(c.rec, r.rank) : null;
                  return (
                    <td key={c.label} style={{ ...S.td, ...(c.cur ? S.tdCur : {}) }}>
                      <span style={trend === "up" ? S.up : trend === "down" ? S.down : undefined}>
                        {cell.v}
                      </span>
                      {rankTxt && <span style={S.rank}>{rankTxt}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={S.legend}>
        <b style={S.up}>{"Bold green"}</b> {"= higher than the season before ·"}
        <span style={S.down}> {"red"}</span> {"= lower. For"} <i>GC / xGC</i> {"and"} <i>YC / RC</i> {"this is reversed — lower is better. The rank is among everyone who played that season."}
      </div>
    </>
  );
}

/* ============================================================
   3. VERD-POPUP — einn lettur gluggi i stad heillar blokkar
   ============================================================ */
export function PriceEditor({ p, valueTenths, onSave, onClose }) {
  const [txt, setTxt] = useState(valueTenths != null ? (valueTenths / 10).toFixed(1) : "");
  const parsed = Math.round(parseFloat(String(txt).replace(",", ".")) * 10);
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed < 200;
  return (
    <div style={S.popWrap} onClick={onClose}>
      <div style={S.pop} onClick={e => e.stopPropagation()}>
        <div style={S.popHead}>{"Purchase price —"} {p.web_name}</div>
        <div style={S.popNote}>
          {"The sell price is derived from this: purchase price + 50% of the profit, rounded down to the nearest 0.1."}
        </div>
        <div style={S.popRow}>
          <span style={S.popPfx}>£</span>
          <input autoFocus style={S.popInput} value={txt}
            onChange={e => setTxt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && valid) { onSave(parsed); onClose(); }
                              if (e.key === "Escape") onClose(); }} />
          <button style={{ ...S.popBtn, opacity: valid ? 1 : 0.4 }} disabled={!valid}
            onClick={() => { onSave(parsed); onClose(); }}>{"Save"}</button>
        </div>
        <div style={S.popActions}>
          <button style={S.popLink} onClick={() => { onSave(null); onClose(); }}>
            {"Clear (use the current price)"}
          </button>
          <button style={S.popLink} onClick={onClose}>{"Cancel"}</button>
        </div>
      </div>
    </div>
  );
}

const S = {
  headGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(96px, 1fr))",
             gap:6, marginBottom:12 },
  hTile:{ border:`1px solid ${C.border}`, borderRadius:8, background:C.cardAlt, padding:"7px 9px" },
  hTilePrice:{ background:"#f6f1f7", borderColor:"#e2d5e5" },
  hVal:{ fontSize:18, fontWeight:700, color:C.text, fontFamily:mono, lineHeight:1.15,
         display:"flex", alignItems:"center", gap:5 },
  hKey:{ fontSize:10, color:C.text2, marginTop:2 },
  hSub:{ fontSize:9, color:C.text3, marginTop:1 },
  editBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, cursor:"pointer",
            borderRadius:4, fontSize:10, lineHeight:1, padding:"2px 4px" },

  secLbl:{ display:"flex", alignItems:"baseline", gap:7, fontSize:12.5, fontWeight:700,
           color:C.purple, marginBottom:6, paddingTop:6, borderTop:`1px solid ${C.border}` },
  secNote:{ fontSize:10, fontWeight:400, color:C.text3 },
  warn:{ fontSize:11, color:"#7a5600", background:C.amberBg, border:"1px solid #f0dcae",
         borderRadius:6, padding:"6px 8px", marginBottom:8, lineHeight:1.5 },

  scroll:{ overflowX:"auto" },
  tbl:{ borderCollapse:"collapse", width:"100%", fontSize:11.5 },
  th:{ textAlign:"right", padding:"4px 6px", fontSize:10, fontWeight:700, color:C.text3,
       borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" },
  thCur:{ fontSize:11.5, color:C.purple, background:"#f6f1f7" },
  thK:{ borderBottom:`1px solid ${C.border}` },
  tr:{ borderBottom:"1px solid #f4f4f6" },
  tdK:{ padding:"3px 6px", color:C.text2, fontSize:10.5, whiteSpace:"nowrap" },
  td:{ textAlign:"right", padding:"3px 6px", fontFamily:mono, color:C.text2,
       whiteSpace:"nowrap", fontSize:10.5 },
  tdCur:{ background:"#faf7fb", color:C.text, fontSize:11.5 },
  rank:{ display:"block", fontSize:8.5, color:C.text3, fontFamily:"inherit" },
  up:{ fontWeight:700, color:"#046b41" },
  down:{ color:C.red },
  legend:{ fontSize:10, color:C.text3, marginTop:6, lineHeight:1.5 },

  popWrap:{ position:"fixed", inset:0, background:"rgba(20,20,25,0.45)", zIndex:80,
            display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  pop:{ background:C.card, borderRadius:10, padding:14, width:"min(340px, 94vw)",
        border:`1px solid ${C.border}`, boxShadow:"0 16px 40px rgba(0,0,0,0.22)" },
  popHead:{ fontSize:13.5, fontWeight:700, color:C.purple, marginBottom:4 },
  popNote:{ fontSize:10.5, color:C.text3, lineHeight:1.45, marginBottom:9 },
  popRow:{ display:"flex", alignItems:"center", gap:6 },
  popPfx:{ fontSize:14, color:C.text2, fontFamily:mono },
  popInput:{ flex:1, border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 8px",
             fontSize:14, fontFamily:mono },
  popBtn:{ border:"none", background:C.purple, color:"#fff", borderRadius:6,
           padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer" },
  popActions:{ display:"flex", justifyContent:"space-between", marginTop:9 },
  popLink:{ border:"none", background:"transparent", color:C.text3, fontSize:10.5,
            cursor:"pointer", padding:0, textDecoration:"underline" },
};
