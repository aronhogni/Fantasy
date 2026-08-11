/* ============================================================
   ROTATION.JSX — FFDR-SAMANBURÐUR / RÓTERINGS-PAR

   "VVD á City á útivelli og Arsenal tveimur umferðum seinna — hver kemur
   inn fyrir hann í þeim umferðum?"

   Reikningurinn er ALLUR í src/rotation.js (hreint, prófað í
   tests/rotation.mjs). Hér er aðeins birting og stillingar.

   ÞRJÁR STILLINGAR OG HVERS VEGNA ÞÆR ERU HÉR:
     UMFERÐIR   sjálfgildi 6 (það sem notandinn bað um), 4-10 í boði.
     VERÐÞAK    sjálfgildi = verð dýrasta valda mannsins + £2,0. ÁN þaks
                raðast Haaland á toppinn hjá hverjum varnarmanni — hann er
                rétta svarið við "hver skorar mest?" en ranga svarið við
                "hver kemur inn af bekknum?".
     MITT LIÐ   rótering af bekknum krefst ENGRA skipta og er því oftast
                svarið sem notandinn getur notað í dag.

   LITIRNIR eru sömu ALGILDU þrepin og leikjaflísarnar á spjöldunum
   (TIER_BG úr model.js) — ekkert afstætt innan liðs, sjá kafla 8.
   ============================================================ */

import React, { useMemo, useState } from "react";
import { interp } from "./interp.js";
import { TIER_BG, TIER_FG, TIER_NAME } from "./model.js";
import {
  DEFAULT_HORIZON, HARD_TIER_MIN, candidatePool, findRotationPartners, gwCell,
  horizonGws, needOf,
} from "./rotation.js";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b", red:"#d92d3c",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const POS = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };

/* Ein leikjafrumsa: litur = algilt FFDR-þrep, texti = andstæðingur.     */
function Cell({ cell, teamById, hard }) {
  if (!cell || cell.blank) return (
    <td style={{ ...S.cell, background:"#f1f1f4", color:C.text3,
                 outline: hard ? `2px solid ${C.red}` : "none", outlineOffset:-2 }}
        title={"Blank gameweek — the player does not play and gets 0 points"}>–</td>
  );
  const t = cell.tier ?? 2;
  const label = cell.fxs.map(f => {
    const o = teamById?.[f.opp];
    return `${o?.short || "?"}${f.home ? "" : " (a)"}`;
  }).join(" + ");
  return (
    <td style={{ ...S.cell, background:TIER_BG[t], color:TIER_FG[t],
                 outline: hard ? `2px solid ${C.red}` : "none", outlineOffset:-2 }}
        title={interp("{0} — FFDR {1} ({2})", [label, cell.ffdr?.toFixed(2), TIER_NAME[t]]) +
               (cell.dbl ? "\nDOUBLE GAMEWEEK" : "")}>
      {label}{cell.dbl ? " ⧫" : ""}
    </td>
  );
}

/* Val a sjondeildarhring. Sjalfgildi 6 (thad sem notandinn bad um) en
   listinn nær alla leid — horizonGws() klippir vid sidustu umferd, svo
   "allar" er ohaett i hvada umferd sem er. Taflan skrunar sjalf (S.scroll). */
const HORIZONS = [3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 38];

export default function Rotation({
  targetIds, players, teamById, fixByTeamGw, fixDifficulty, gwNow, maxGw = 38,
  squadIds, Crest, onToggleTarget, onClear, onClose, startProbOf = null,
}) {
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [onlyMine, setOnlyMine] = useState(false);
  const [capExtra, setCapExtra] = useState(20);          // í tíundum: +£2,0
  /* Hvad telst "erfitt". Sjalfgildi 3 (dokkgult+) er thad sem maelt var.
     2 = "hlutlaust+": hvitur leikur er ekki VONDUR en hann er UPPFAERANLEGUR
     ef annar madur a graenan leik i somu umferd. Tha þarf frambjodandinn
     ad vera GRAENN til ad theka (coversNeed krefst threps UNDIR throskuldi). */
  const [hardFrom, setHardFrom] = useState(HARD_TIER_MIN);

  const owned = useMemo(() => new Set(squadIds || []), [squadIds]);
  const targets = useMemo(
    () => (targetIds || [])
      .map(id => (players || []).find(p => p.id === id))
      .filter(Boolean).slice(0, 2)
      .map(p => ({ p, teamId: p.team })),
    [targetIds, players]);

  const anyGk = targets.some(t => t.p.element_type === 1);
  /* Þakið hangir á DÝRASTA valda manninum — sé VVD (£6,5) og Salah
     (£14,5) valdir saman þarf þakið að leyfa Salah-klassa mann.        */
  const baseTenths = targets.reduce((a, t) => Math.max(a, t.p.now_cost || 0), 0);
  const maxTenths = capExtra === "off" ? null : baseTenths + Number(capExtra);

  const pool = useMemo(() => {
    const base = onlyMine ? (players || []).filter(p => owned.has(p.id)) : players;
    return candidatePool(base, targets);
  }, [players, targets, onlyMine, owned]);

  const R = useMemo(() => findRotationPartners({
    targets, candidates: pool, gwFrom: gwNow, horizon, maxGw,
    fixByTeamGw, fixDifficulty, ownedIds: owned, limit: 12, maxTenths, hardFrom,
    startProbOf,
  }), [targets, pool, gwNow, horizon, maxGw, fixByTeamGw, fixDifficulty, owned,
       maxTenths, hardFrom, startProbOf]);

  const gws = horizonGws(gwNow, horizon, maxGw);
  const hardSet = new Set(R.hard.map(h => h.gw));
  /* Rúta frambjóðanda YFIR ALLAN hringinn — modúllinn reiknar aðeins
     erfiðu umferðirnar (það er ákvörðunin), en grindin verður læsileg
     þegar allar umferðir sjást. Aðeins ~12 menn, svo þetta er ódýrt.   */
  const rowCells = (c) => gws.map(gw => gwCell({
    teamId: c.teamId, pos: c.p.element_type, gw, fixByTeamGw, fixDifficulty }));

  const addable = useMemo(() => (players || [])
    .filter(p => owned.has(p.id) && !(targetIds || []).includes(p.id))
    .filter(p => anyGk ? p.element_type === 1 : true)
    .sort((a, b) => a.element_type - b.element_type ||
                    (b.now_cost || 0) - (a.now_cost || 0)),
    [players, owned, targetIds, anyGk]);

  return (
    <div style={S.wrap} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        <div style={S.head}>
          <h2 style={S.h2}>{"FFDR comparison — rotation pair"}</h2>
          <div style={S.headCtl}>
            <label style={S.lbl}>{"Gameweeks"}
              <select style={S.sel} value={horizon}
                onChange={e => setHorizon(Number(e.target.value))}>
                {HORIZONS.map(n => (
                  <option key={n} value={n}>{n === 38 ? "all" : n}</option>
                ))}
              </select>
            </label>
            <label style={S.lbl}>{"Price cap"}
              <select style={S.sel} value={capExtra}
                onChange={e => setCapExtra(e.target.value === "off" ? "off" : Number(e.target.value))}>
                <option value={0}>{"same price"}</option>
                <option value={10}>+£1,0</option>
                <option value={20}>+£2,0</option>
                <option value={50}>+£5,0</option>
                <option value="off">{"no cap"}</option>
              </select>
            </label>
            <label style={S.lbl}>{"Hard from"}
              <select style={S.sel} value={hardFrom}
                onChange={e => setHardFrom(Number(e.target.value))}>
                <option value={3}>{"dark yellow"}</option>
                <option value={2}>{"neutral (white)"}</option>
              </select>
            </label>
            <label style={{ ...S.lbl, cursor:"pointer" }}>
              <input type="checkbox" checked={onlyMine}
                onChange={e => setOnlyMine(e.target.checked)} /> {"my squad only"}
            </label>
            <button style={S.close} onClick={onClose} title={"Close"}>✕</button>
          </div>
        </div>

        {!targets.length ? (
          <div style={S.empty}>
            {"None selected. Open a player on the pitch and click"} <b>↻</b>.
          </div>
        ) : (
          <>
            <div style={S.note}>
              {"Finds a player with"} <b>{"easy gameweeks EXACTLY where yours are hard"}</b>{". This is a different question from the FFDR table: a player with better 6 gameweeks overall is useless as a pair if he is hard in the same gameweeks."}
              {anyGk
                ? " A goalkeeper is selected — so only goalkeepers are offered."
                : " Every position except goalkeeper is offered."}
            </div>

            <div style={S.scroll}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={S.thK}>{"Player"}</th>
                    {gws.map(gw => (
                      <th key={gw} style={{ ...S.th, ...(hardSet.has(gw) ? S.thHard : {}) }}
                        title={hardSet.has(gw)
                          ? interp("Hard gameweek — weight {0}", [R.hard.find(h => h.gw === gw)?.need])
                          : "Fine"}>
                        {gw}{hardSet.has(gw) ? " !" : ""}
                      </th>
                    ))}
                    <th style={S.thNum} title={"His average FFDR in the HARD gameweeks — lower = easier schedule. The list is sorted by this number."}>FFDR</th>
                    <th style={S.thNum} title={"The share of the weight in the hard gameweeks that he meets with a neutral fixture or better"}>{"Cover"}</th>
                    <th style={S.thNum} title={"His expected points minus those of the player he replaces, summed over the hard gameweeks"}>{"Gain"}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ÞÍNIR MENN */}
                  {R.targets.map(t => (
                    <tr key={t.p.id} style={S.trT}>
                      <td style={S.tdK}>
                        <span style={S.dot} />
                        {Crest && <Crest team={teamById?.[t.teamId]} size={13} />}
                        <b>{t.p.web_name}</b>
                        <span style={S.pos}>{POS[t.p.element_type]}</span>
                        <span style={S.price}>£{((t.p.now_cost || 0) / 10).toFixed(1)}</span>
                        {(targetIds || []).length > 1 &&
                          <button style={S.rm} title={"Remove from the comparison"}
                            onClick={() => onToggleTarget && onToggleTarget(t.p.id)}>✕</button>}
                      </td>
                      {t.cells.map((cell, i) => (
                        <Cell key={gws[i]} cell={cell} teamById={teamById}
                          hard={needOf(cell, hardFrom) > 0} />
                      ))}
                      <td style={S.tdNum} colSpan={3}>
                        {(() => {
                          const n = t.cells.filter(c => needOf(c, hardFrom) > 0).length;
                          return `${n} hard`;
                        })()}
                      </td>
                    </tr>
                  ))}

                  {/* BÆTA ÖÐRUM VIÐ */}
                  {(targetIds || []).length < 2 && !!addable.length && (
                    <tr>
                      <td style={S.tdAdd} colSpan={gws.length + 4}>
                        <label style={S.addLbl}>
                          {"Add another:"}
                          <select style={S.sel} value=""
                            onChange={e => e.target.value &&
                              onToggleTarget && onToggleTarget(Number(e.target.value))}>
                            <option value="">{"— select —"}</option>
                            {addable.map(p => (
                              <option key={p.id} value={p.id}>
                                {POS[p.element_type]} · {p.web_name} · £{((p.now_cost || 0) / 10).toFixed(1)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </td>
                    </tr>
                  )}

                  {/* TILLÖGUR */}
                  {!R.hard.length ? (
                    <tr><td style={S.tdEmpty} colSpan={gws.length + 4}>
                      {"No hard gameweeks in the next"} {horizon} {"— nothing to solve. This player can stay in."}
                    </td></tr>
                  ) : !R.results.length ? (
                    <tr><td style={S.tdEmpty} colSpan={gws.length + 4}>
                      {"Nobody covers these gameweeks within the cap"}
                      {onlyMine ? " in your squad" : ""}{". Raise the price cap"}
                      {onlyMine ? " or drop \"my squad only\"" : ""}.
                    </td></tr>
                  ) : (
                    <>
                      <tr><td style={S.grp} colSpan={gws.length + 4}>
                        {"BEST PAIRS — sorted by easiest schedule (FFDR) in the hard gameweeks"}
                      </td></tr>
                      {R.results.map((c, i) => {
                        const cells = rowCells(c);
                        return (
                          <tr key={c.p.id} style={i === 0 ? S.trBest : S.tr}>
                            <td style={S.tdK}>
                              {Crest && <Crest team={teamById?.[c.teamId]} size={13} />}
                              {c.p.web_name}
                              <span style={S.pos}>{POS[c.p.element_type]}</span>
                              <span style={S.price}>£{((c.p.now_cost || 0) / 10).toFixed(1)}</span>
                              {/* Byrjunar-likur (6h-likanid). Undir 15% kemst
                                  madur ALDREI hingad (golf i rotation.js) —
                                  merkid synir hvers vegna rodin er eins og
                                  hun er, t.d. 47% a hvildum adalmanni.     */}
                              {c.startP != null &&
                                <span style={S.startP}
                                  title={"Start probability (measured model, window = last 5 finished gameweeks). The gain is weighted by this number; below 15% nobody makes the list."}>
                                  ▶{Math.round(c.startP * 100)}%
                                </span>}
                              {c.owned && <span style={S.mine} title={"Already in your squad — no transfer needed"}>{"in squad"}</span>}
                              {!!c.others?.length && (
                                <span style={S.others}
                                  title={"Same fixtures — FFDR is a property of the TEAM:\n"
                                    + c.others.map(o => `${POS[o.element_type]} ${o.web_name} £${((o.now_cost||0)/10).toFixed(1)}`).join("\n")}>
                                  +{c.others.length}
                                </span>
                              )}
                            </td>
                            {cells.map((cell, j) => (
                              <Cell key={gws[j]} cell={cell} teamById={teamById}
                                hard={false} />
                            ))}
                            <td style={{ ...S.tdNum, fontWeight:700 }}>
                              {c.ffdr == null ? "—" : c.ffdr.toFixed(2)}
                            </td>
                            <td style={{ ...S.tdNum, fontWeight:700,
                                         color: c.cover >= 67 ? "#046b41" : c.cover >= 34 ? C.text2 : C.text3 }}>
                              {c.cover}%
                            </td>
                            <td style={{ ...S.tdNum, fontWeight:700,
                                         color: c.gain > 0 ? "#046b41" : C.text3 }}>
                              +{c.gain.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div style={S.legend}>
              <b>!</b> {"= a gameweek your player has hard (dark yellow, light red, red) or"} <b>{"blank"}</b>{"; a blank counts heaviest because it gives 0 points. A red outline marks them."}
              {" "}<b>⧫</b> {"= double gameweek."} {" "}
              <b>{"Cover"}</b> {"is the FFDR answer: how much of the difficulty he meets with a neutral fixture or better."} <b>{"Gain"}</b> {"is the decision: his expected points minus those of the player he replaces, in the hard gameweeks only. Sorted by FFDR (the easiest schedule) — bear in mind that easy fixtures alone put players in weak teams near the top, so read the gain alongside."}
              {" "}{"One row per TEAM — FFDR is a property of the team, so every defender at the same club has the same fixtures;"} <b>+N</b> {"are the others at that team."}
              {" "}{"Price cap"} {maxTenths == null ? "none" : `£${(maxTenths / 10).toFixed(1)}`}.
              {hardFrom <= 2 && " Neutral (white) fixtures count too, and then the pair has to be GREEN."}
              <button style={S.clearAll} onClick={onClear}>{"Clear selection"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  wrap:{ position:"fixed", inset:0, background:"rgba(20,20,25,0.5)", zIndex:72,
         display:"flex", alignItems:"flex-start", justifyContent:"center",
         padding:"24px 12px", overflowY:"auto" },
  panel:{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:14,
          width:"min(1000px, 100%)", boxShadow:"0 20px 60px rgba(0,0,0,0.28)" },
  head:{ display:"flex", justifyContent:"space-between", alignItems:"center",
         gap:10, marginBottom:8, flexWrap:"wrap" },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  headCtl:{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" },
  lbl:{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.text2 },
  sel:{ border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 6px", fontSize:11.5 },
  close:{ border:"none", background:"transparent", fontSize:16, color:C.text2, cursor:"pointer" },
  empty:{ fontSize:12.5, color:C.text2, padding:"18px 4px", lineHeight:1.6 },
  note:{ fontSize:11.5, color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`,
         borderRadius:6, padding:"7px 9px", marginBottom:9, lineHeight:1.55 },
  scroll:{ overflowX:"auto" },
  tbl:{ borderCollapse:"collapse", width:"100%", fontSize:11.5 },
  thK:{ textAlign:"left", padding:"4px 6px", fontSize:10.5, color:C.text3,
        borderBottom:`1px solid ${C.border}`, minWidth:190 },
  th:{ padding:"4px 3px", fontSize:10.5, color:C.text3, textAlign:"center",
       borderBottom:`1px solid ${C.border}`, minWidth:52 },
  thHard:{ color:C.red, fontWeight:800 },
  thNum:{ padding:"4px 5px", fontSize:10.5, color:C.text3, textAlign:"right",
          borderBottom:`1px solid ${C.border}`, minWidth:46 },
  trT:{ background:"#f7f4f8", borderBottom:`1px solid ${C.border}` },
  tr:{ borderBottom:"1px solid #f4f4f6" },
  trBest:{ borderBottom:"1px solid #f4f4f6", background:"#f2fbf6" },
  tdK:{ padding:"3px 6px", display:"flex", alignItems:"center", gap:4,
        whiteSpace:"nowrap", color:C.text },
  dot:{ width:5, height:5, borderRadius:3, background:C.purple, flex:"0 0 auto" },
  pos:{ fontSize:9, color:C.text3, border:`1px solid ${C.border}`,
        borderRadius:3, padding:"0 3px" },
  price:{ fontSize:9.5, color:C.text3, fontFamily:mono },
  mine:{ fontSize:9, color:"#046b41", background:"#e6f9f0", borderRadius:3, padding:"0 4px" },
  startP:{ fontSize:9, color:"#5b5470", background:"#efedf4", borderRadius:3, padding:"0 4px",
           cursor:"help" },
  others:{ fontSize:9, color:C.text3, background:C.cardAlt, border:`1px solid ${C.border}`,
           borderRadius:3, padding:"0 3px", cursor:"help" },
  rm:{ border:"none", background:"transparent", color:C.text3, fontSize:10,
       cursor:"pointer", padding:0 },
  cell:{ padding:"3px 2px", textAlign:"center", fontSize:9.5, fontWeight:600,
         borderRight:"1px solid rgba(255,255,255,0.55)", whiteSpace:"nowrap" },
  tdNum:{ padding:"3px 5px", textAlign:"right", fontFamily:mono, fontSize:11, color:C.text2 },
  tdAdd:{ padding:"5px 6px", borderBottom:`1px solid ${C.border}`, background:C.cardAlt },
  addLbl:{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:C.text2 },
  tdEmpty:{ padding:"14px 6px", fontSize:12, color:C.text2, lineHeight:1.6 },
  grp:{ fontSize:10, fontWeight:700, color:C.purple, textTransform:"uppercase",
        letterSpacing:0.4, padding:"9px 6px 3px", borderBottom:`1px solid ${C.border}` },
  legend:{ fontSize:10.5, color:C.text3, marginTop:9, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.6 },
  clearAll:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2,
             borderRadius:6, padding:"2px 8px", fontSize:10.5, cursor:"pointer", marginLeft:8 },
};
