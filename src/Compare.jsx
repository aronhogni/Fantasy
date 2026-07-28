/* ============================================================
   COMPARE.JSX — samanburdur a leikmonnum hlid vid hlid

   VAL A TIMABILI, EKKI FRJALST GW-BIL — og thad er maeling, ekki leti:
   frjalst gameweek-bil krefst per-umferdar gagna fyrir HVERN leikmann i
   thvi bili. Their liggja adeins fyrir i data/live/gw{n}.json og thau eru
   TOM thangad til fyrsta umferd 2026/27 klarast. Timabila-samanburdur
   (data/player_seasons.json) virkar hins vegar STRAX og nær 3 ar aftur.
   Thegar live-skrarnar fyllast er haegt ad baeta GW-bili vid ofan a thetta.

   HVADA TOLUR: valdar ur FFS-listanum eftir thvi hvort thaer eru (a) til
   i okkar heimildum og (b) fantasy-relevant. Snertingar i teig, big
   chances, dribbles og aerial duels eru EKKI her thvi engin heimild sem
   vid naum i gefur thaer — sja kafla 6b i CLAUDE.md.
   ============================================================ */

import React, { useMemo, useState } from "react";
import { num } from "./stats.js";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", red:"#d92d3c",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const POS = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };

const f2 = v => v == null ? null : +(+v).toFixed(2);
const f1 = v => v == null ? null : +(+v).toFixed(1);
const per90 = (v, m) => (!m || m <= 0 || v == null) ? null : (v / m) * 90;
const div = (a, b) => (b == null || b === 0 || a == null) ? null : a / b;

/* Radirnar. `hi:false` = laegra er betra. `fmt` styrir birtingu.        */
const ROWS = [
  { grp:"Grunnur" },
  { k:"total_points", label:"FPL-stig",       hi:true,  get:r => r.total_points },
  { k:"minutes",      label:"Mínútur",        hi:true,  get:r => r.minutes },
  { k:"starts",       label:"Byrjaðir leikir",hi:true,  get:r => r.starts },
  { k:"pts90",        label:"Stig / 90",      hi:true,  dec:2, get:r => per90(r.total_points, r.minutes) },
  { k:"minPerPt",     label:"Mín. per stig",  hi:false, dec:1,
    note:"Lægra er betra — hversu lengi hann er að vinna sér inn stig",
    get:r => div(r.minutes, r.total_points) },
  { k:"cost",         label:"Verð",           hi:false, dec:1, money:true,
    get:r => r.now_cost == null ? null : r.now_cost / 10 },
  { k:"ppm",          label:"Stig per milljón", hi:true, dec:1,
    get:r => div(r.total_points, r.now_cost == null ? null : r.now_cost / 10) },

  { grp:"Sókn" },
  { k:"goals_scored", label:"Mörk",           hi:true,  get:r => r.goals_scored },
  { k:"assists",      label:"Assist",         hi:true,  get:r => r.assists },
  { k:"gi",           label:"Mörk + assist",  hi:true,  get:r => (r.goals_scored ?? 0) + (r.assists ?? 0) },
  { k:"gi90",         label:"M+A / 90",       hi:true,  dec:2,
    get:r => per90((r.goals_scored ?? 0) + (r.assists ?? 0), r.minutes) },
  { k:"minPerGi",     label:"Mín. per framlag", hi:false, dec:0,
    get:r => { const gi = (r.goals_scored ?? 0) + (r.assists ?? 0); return gi ? div(r.minutes, gi) : null; } },

  { grp:"Væntingar" },
  { k:"expected_goals", label:"xG",           hi:true, dec:2, get:r => r.expected_goals },
  { k:"xg90",         label:"xG / 90",        hi:true, dec:2, get:r => r.expected_goals_per_90 },
  { k:"xgDelta",      label:"Mörk − xG",      hi:true, dec:2, signed:true,
    note:"Yfir núlli = klínísk nýting eða heppni",
    get:r => (r.goals_scored == null || r.expected_goals == null) ? null : r.goals_scored - r.expected_goals },
  { k:"expected_assists", label:"xA",         hi:true, dec:2, get:r => r.expected_assists },
  { k:"xa90",         label:"xA / 90",        hi:true, dec:2, get:r => r.expected_assists_per_90 },
  { k:"xaDelta",      label:"Assist − xA",    hi:true, dec:2, signed:true,
    get:r => (r.assists == null || r.expected_assists == null) ? null : r.assists - r.expected_assists },
  { k:"expected_goal_involvements", label:"xGI", hi:true, dec:2, get:r => r.expected_goal_involvements },
  { k:"minPerXgi",    label:"Mín. per xGI",   hi:false, dec:0,
    get:r => div(r.minutes, r.expected_goal_involvements) },

  { grp:"Vörn", defOnly:true },
  { defOnly:true, k:"clean_sheets", label:"CS",             hi:true,  get:r => r.clean_sheets },
  { defOnly:true, k:"csPct",        label:"CS %",           hi:true,  dec:0, pct:true,
    get:r => { const v = div(r.clean_sheets, r.starts); return v == null ? null : v * 100; } },
  { defOnly:true, k:"goals_conceded", label:"GC",           hi:false, get:r => r.goals_conceded },
  { defOnly:true, k:"expected_goals_conceded", label:"xGC", hi:false, dec:2, get:r => r.expected_goals_conceded },
  { defOnly:true, k:"gcDelta",      label:"GC − xGC",       hi:false, dec:2, signed:true,
    note:"Undir núlli = varist betur en færin gáfu",
    get:r => (r.goals_conceded == null || r.expected_goals_conceded == null) ? null
             : r.goals_conceded - r.expected_goals_conceded },
  { defOnly:true, k:"defensive_contribution", label:"DC",   hi:true,  get:r => r.defensive_contribution },
  { defOnly:true, k:"dc_per_start", label:"DC per byrjun",  hi:true,  dec:1, get:r => r.dc_per_start },
  { defOnly:true, gkOnly:true, k:"saves", label:"Vörslur", hi:true, get:r => r.saves },

  { grp:"Bónus og agi" },
  { k:"bonus",        label:"Bónusstig",      hi:true,  get:r => r.bonus },
  { k:"bps",          label:"BPS",            hi:true,  get:r => r.bps },
  { k:"bps90",        label:"BPS / 90",       hi:true,  dec:1, get:r => per90(r.bps, r.minutes) },
  { k:"yellow_cards", label:"Gul spjöld",     hi:false, get:r => r.yellow_cards },
  { k:"red_cards",    label:"Rauð spjöld",    hi:false, get:r => r.red_cards },
];

function fmtVal(row, v) {
  if (v == null || !Number.isFinite(v)) return "—";
  const body = v.toFixed(row.dec ?? 0);
  const sign = row.signed && v > 0 ? "+" : "";
  if (row.money) return `£${body}`;
  if (row.pct) return `${body}%`;
  return sign + body;
}

/* Lifandi rod ur bootstrap svo yfirstandandi timabil noti somu svid. */
function liveRow(p) {
  const mins = num(p.minutes) ?? 0, starts = num(p.starts) ?? 0;
  const dc = num(p.defensive_contribution);
  return {
    total_points:num(p.total_points), minutes:mins, starts,
    goals_scored:num(p.goals_scored), assists:num(p.assists),
    expected_goals:num(p.expected_goals), expected_goals_per_90:num(p.expected_goals_per_90),
    expected_assists:num(p.expected_assists), expected_assists_per_90:num(p.expected_assists_per_90),
    expected_goal_involvements:num(p.expected_goal_involvements),
    expected_goals_conceded:num(p.expected_goals_conceded),
    clean_sheets:num(p.clean_sheets), goals_conceded:num(p.goals_conceded),
    saves:num(p.saves), bonus:num(p.bonus), bps:num(p.bps),
    yellow_cards:num(p.yellow_cards), red_cards:num(p.red_cards),
    defensive_contribution:dc, dc_per_start:(dc != null && starts > 0) ? dc / starts : null,
    now_cost:num(p.now_cost),
  };
}

export default function Compare({ ids, players, teamById, seasonsFile, photoUrl, Crest,
                                  currentLabel, seasonStarted, onRemove, onClear, onClose }) {
  const seasons = useMemo(() => {
    const older = (seasonsFile?.seasons || []);
    return [{ key: currentLabel, live: true }, ...older.map(s => ({ key: s }))];
  }, [seasonsFile, currentLabel]);
  const [season, setSeason] = useState(() => seasonStarted ? currentLabel
                                            : (seasonsFile?.seasons?.[0] || currentLabel));

  const picked = (ids || []).map(id => (players || []).find(p => p.id === id)).filter(Boolean);
  const isLive = season === currentLabel;

  const cols = picked.map(p => {
    const rec = isLive
      ? (seasonStarted ? liveRow(p) : null)
      : (seasonsFile?.players?.[String(p.code)]?.[season] || null);
    return { p, rec: rec ? { ...rec, now_cost: rec.now_cost ?? num(p.now_cost) } : null };
  });

  const anyDef = picked.some(p => p.element_type <= 3);
  const anyGk  = picked.some(p => p.element_type === 1);

  return (
    <div style={S.wrap} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        <div style={S.head}>
          <h2 style={S.h2}>Samanburður</h2>
          <div style={S.headCtl}>
            <select style={S.sel} value={season} onChange={e => setSeason(e.target.value)}>
              {seasons.map(s => (
                <option key={s.key} value={s.key}>
                  {s.key}{s.live && !seasonStarted ? " (ekki hafið)" : ""}
                </option>
              ))}
            </select>
            <button style={S.clear} onClick={onClear}>Hreinsa</button>
            <button style={S.close} onClick={onClose}>✕</button>
          </div>
        </div>

        {!picked.length ? (
          <div style={S.empty}>
            Enginn valinn. Opnaðu leikmann og smelltu á <b>⇄ Bera saman</b> til að bæta honum við.
          </div>
        ) : (
          <>
            {isLive && !seasonStarted && (
              <div style={S.warn}>
                <b>{currentLabel} er ekki hafið</b> — engar tölur til. Veldu eldra tímabil
                í fellilistanum til að bera saman.
              </div>
            )}

            <div style={S.note}>
              Borið saman yfir <b>heilt tímabil</b>, ekki frjálst umferðabil: per-umferðar
              tölur liggja aðeins fyrir í <code>live/gw*.json</code> og þær fyllast fyrst
              þegar 2026/27 byrjar. Tímabila-samanburður virkar strax og nær 3 ár aftur.
            </div>

            <div style={S.scroll}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={S.thK}></th>
                    {cols.map(({ p }) => {
                      const t = teamById?.[p.team];
                      return (
                        <th key={p.id} style={S.thP}>
                          <div style={S.pHead}>
                            {photoUrl && p.code
                              ? <img src={photoUrl(p.code)} alt="" style={S.img} loading="lazy" />
                              : null}
                            <div style={S.pName}>{p.web_name}</div>
                            <div style={S.pMeta}>
                              {Crest && t ? <Crest team={t} size={11} /> : null}
                              {t?.short} · {POS[p.element_type]} · £{((p.now_cost ?? 0)/10).toFixed(1)}
                            </div>
                            <button style={S.rm} onClick={() => onRemove(p.id)}>fjarlægja</button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, ri) => {
                    if (row.grp) {
                      if (row.defOnly && !anyDef) return null;
                      return (
                        <tr key={`g${ri}`}>
                          <td colSpan={cols.length + 1} style={S.grp}>{row.grp}</td>
                        </tr>
                      );
                    }
                    /* VILLA SEM VAR: defOnly gilti adeins um HOPS-HAUSINN, svo
                       varnar-radirnar sjalfar birtust fyrir framherja (Haaland
                       med "CS 13" og "xGC 38,60"). Nu er sian a hverri rod.   */
                    if (row.defOnly && !anyDef) return null;
                    if (row.gkOnly && !anyGk) return null;
                    const vals = cols.map(c => c.rec ? row.get(c.rec) : null);
                    const nums = vals.filter(v => v != null && Number.isFinite(v));
                    // BESTA gildid merkt — adeins ef fleiri en einn og ekki jafntefli
                    let best = null;
                    if (nums.length > 1) {
                      const b = row.hi ? Math.max(...nums) : Math.min(...nums);
                      if (nums.filter(v => v === b).length === 1) best = b;
                    }
                    return (
                      <tr key={row.k} style={S.tr}>
                        <td style={S.tdK} title={row.note || ""}>{row.label}</td>
                        {vals.map((v, i) => (
                          <td key={i} style={{ ...S.td, ...(best != null && v === best ? S.tdBest : {}) }}>
                            {fmtVal(row, v)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={S.legend}>
              <span style={S.tdBestInline}>Grænt</span> = betra gildi (aðeins merkt þegar
              einn er ótvírætt hærri). Tölur sem FFS birtir en engin heimild okkar gefur —
              snertingar í teig, big chances, dribbles, návígi — eru <b>ekki</b> hér.
              Sjá kafla 6b í CLAUDE.md.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  wrap:{ position:"fixed", inset:0, background:"rgba(20,20,25,0.5)", zIndex:70,
         display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" },
  panel:{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:14,
          width:"min(880px, 100%)", boxShadow:"0 20px 60px rgba(0,0,0,0.28)" },
  head:{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:8 },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  headCtl:{ display:"flex", alignItems:"center", gap:6 },
  sel:{ border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 7px", fontSize:12 },
  clear:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:6,
          padding:"3px 9px", fontSize:11.5, cursor:"pointer" },
  close:{ border:"none", background:"transparent", fontSize:16, color:C.text2, cursor:"pointer" },
  empty:{ fontSize:12.5, color:C.text2, padding:"18px 4px", lineHeight:1.6 },
  warn:{ fontSize:11.5, color:"#7a5600", background:"#fff6e0", border:"1px solid #f0dcae",
         borderRadius:6, padding:"7px 9px", marginBottom:8 },
  note:{ fontSize:11, color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`,
         borderRadius:6, padding:"7px 9px", marginBottom:9, lineHeight:1.55 },
  scroll:{ overflowX:"auto" },
  tbl:{ borderCollapse:"collapse", width:"100%", fontSize:12 },
  thK:{ width:150, borderBottom:`1px solid ${C.border}` },
  thP:{ padding:"4px 6px", borderBottom:`1px solid ${C.border}`, verticalAlign:"bottom", minWidth:110 },
  pHead:{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 },
  img:{ width:38, height:48, objectFit:"contain" },
  pName:{ fontSize:11.5, fontWeight:700, color:C.text, textAlign:"center" },
  pMeta:{ fontSize:9, color:C.text3, display:"flex", alignItems:"center", gap:3 },
  rm:{ border:"none", background:"transparent", color:C.text3, fontSize:9,
       textDecoration:"underline", cursor:"pointer", padding:0, marginTop:2 },
  grp:{ fontSize:10, fontWeight:700, color:C.purple, textTransform:"uppercase",
        letterSpacing:0.4, padding:"8px 6px 3px", borderBottom:`1px solid ${C.border}` },
  tr:{ borderBottom:"1px solid #f4f4f6" },
  tdK:{ padding:"3px 6px", fontSize:11, color:C.text2, whiteSpace:"nowrap" },
  td:{ padding:"3px 6px", textAlign:"center", fontFamily:mono, fontSize:11.5, color:C.text2 },
  tdBest:{ background:"#e6f9f0", color:"#046b41", fontWeight:700 },
  tdBestInline:{ background:"#e6f9f0", color:"#046b41", fontWeight:700, padding:"0 4px", borderRadius:3 },
  legend:{ fontSize:10.5, color:C.text3, marginTop:9, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.55 },
};
