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
import { TIER_BG, TIER_FG, TIER_NAME } from "./model.js";
import { t as tx } from "./i18n.js";
import { useLang } from "./useLang.js";
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
        title={tx("Auð umferð — leikmaðurinn spilar ekki og fær 0 stig")}>–</td>
  );
  const t = cell.tier ?? 2;
  const label = cell.fxs.map(f => {
    const o = teamById?.[f.opp];
    return `${o?.short || "?"}${f.home ? "" : tx(" (ú)")}`;
  }).join(" + ");
  return (
    <td style={{ ...S.cell, background:TIER_BG[t], color:TIER_FG[t],
                 outline: hard ? `2px solid ${C.red}` : "none", outlineOffset:-2 }}
        title={tx("{0} — FFDR {1} ({2})", [label, cell.ffdr?.toFixed(2), tx(TIER_NAME[t])]) +
               (cell.dbl ? tx("\nTVÖFÖLD UMFERÐ") : "")}>
      {label}{cell.dbl ? " ⧫" : ""}
    </td>
  );
}

/* Val a sjondeildarhring. Sjalfgildi 6 (thad sem notandinn bad um) en
   listinn nær alla leid — horizonGws() klippir vid sidustu umferd, svo
   "allar" er ohaett i hvada umferd sem er. Taflan skrunar sjalf (S.scroll). */
export const HORIZONS = [3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 38];

export default function Rotation({
  targetIds, players, teamById, fixByTeamGw, fixDifficulty, gwNow, maxGw = 38,
  squadIds, Crest, onToggleTarget, onClear, onClose,
}) {
  const lang = useLang();   /* tungumal i dep-listum, sja useLang.js */
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [onlyMine, setOnlyMine] = useState(false);
  const [capExtra, setCapExtra] = useState(20);          // í tíundum: +£2,0
  /* Hvad telst "erfitt". Sjalfgildi 3 (dokkgult+) er thad sem maelt var.
     2 = "hlutlaust+": hvitur leikur er ekki VONDUR en hann er UPPFAERANLEGUR
     ef annar madur a graenan leik i somu umferd. Tha þarf frambjodandinn
     ad vera GRAENN til ad theka (coversNeed krefst threps UNDIR throskuldi). */
  const [hardFrom, setHardFrom] = useState(HARD_TIER_MIN);

  const owned = useMemo(() => new Set(squadIds || []), [squadIds, lang]);
  const targets = useMemo(
    () => (targetIds || [])
      .map(id => (players || []).find(p => p.id === id))
      .filter(Boolean).slice(0, 2)
      .map(p => ({ p, teamId: p.team })),
    [targetIds, players, lang]);

  const anyGk = targets.some(t => t.p.element_type === 1);
  /* Þakið hangir á DÝRASTA valda manninum — sé VVD (£6,5) og Salah
     (£14,5) valdir saman þarf þakið að leyfa Salah-klassa mann.        */
  const baseTenths = targets.reduce((a, t) => Math.max(a, t.p.now_cost || 0), 0);
  const maxTenths = capExtra === "off" ? null : baseTenths + Number(capExtra);

  const pool = useMemo(() => {
    const base = onlyMine ? (players || []).filter(p => owned.has(p.id)) : players;
    return candidatePool(base, targets);
  }, [players, targets, onlyMine, owned, lang]);

  const R = useMemo(() => findRotationPartners({
    targets, candidates: pool, gwFrom: gwNow, horizon, maxGw,
    fixByTeamGw, fixDifficulty, ownedIds: owned, limit: 12, maxTenths, hardFrom,
  }), [targets, pool, gwNow, horizon, maxGw, fixByTeamGw, fixDifficulty, owned,
       maxTenths, hardFrom, lang]);

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
    [players, owned, targetIds, anyGk, lang]);

  return (
    <div style={S.wrap} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        <div style={S.head}>
          <h2 style={S.h2}>{tx("FFDR-samanburður — róterings-par")}</h2>
          <div style={S.headCtl}>
            <label style={S.lbl}>{tx("Umferðir")}
              <select style={S.sel} value={horizon}
                onChange={e => setHorizon(Number(e.target.value))}>
                {HORIZONS.map(n => (
                  <option key={n} value={n}>{n === 38 ? tx("allar") : n}</option>
                ))}
              </select>
            </label>
            <label style={S.lbl}>{tx("Verðþak")}
              <select style={S.sel} value={capExtra}
                onChange={e => setCapExtra(e.target.value === "off" ? "off" : Number(e.target.value))}>
                <option value={0}>{tx("sama verð")}</option>
                <option value={10}>+£1,0</option>
                <option value={20}>+£2,0</option>
                <option value={50}>+£5,0</option>
                <option value="off">{tx("ekkert þak")}</option>
              </select>
            </label>
            <label style={S.lbl}>{tx("Erfitt frá")}
              <select style={S.sel} value={hardFrom}
                onChange={e => setHardFrom(Number(e.target.value))}>
                <option value={3}>{tx("dökkgult")}</option>
                <option value={2}>{tx("hlutlaust (hvítt)")}</option>
              </select>
            </label>
            <label style={{ ...S.lbl, cursor:"pointer" }}>
              <input type="checkbox" checked={onlyMine}
                onChange={e => setOnlyMine(e.target.checked)} /> {tx("aðeins mitt lið")}
            </label>
            <button style={S.close} onClick={onClose} title={tx("Loka")}>✕</button>
          </div>
        </div>

        {!targets.length ? (
          <div style={S.empty}>
            {tx("Enginn valinn. Opnaðu leikmann á vellinum og smelltu á")} <b>↻</b>.
          </div>
        ) : (
          <>
            <div style={S.note}>
              {tx("Finnur mann sem á")} <b>{tx("léttar umferðir NÁKVÆMLEGA þar sem þínir eru þungir")}</b>{tx(". Þetta er annað en FFDR-taflan: maður með betri 6 umferðir í heild er gagnslaus sem par ef hann er þungur í sömu umferðunum.")}
              {anyGk
                ? tx(" Markmaður valinn — því eru aðeins markmenn í boði.")
                : tx(" Allar stöður nema markmenn eru í boði.")}
            </div>

            <div style={S.scroll}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={S.thK}>{tx("Leikmaður")}</th>
                    {gws.map(gw => (
                      <th key={gw} style={{ ...S.th, ...(hardSet.has(gw) ? S.thHard : {}) }}
                        title={hardSet.has(gw)
                          ? tx("Erfið umferð — þyngd {0}", [R.hard.find(h => h.gw === gw)?.need])
                          : tx("Í lagi")}>
                        {gw}{hardSet.has(gw) ? " !" : ""}
                      </th>
                    ))}
                    <th style={S.thNum} title={tx("Hlutfall þyngdarinnar í erfiðu umferðunum sem hann mætir með hlutlausum leik eða betri")}>{tx("Þekja")}</th>
                    <th style={S.thNum} title={tx("Vænt stig hans mínus vænt stig þess sem hann kemur inn fyrir, lagt saman yfir erfiðu umferðirnar")}>{tx("Vinn.")}</th>
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
                          <button style={S.rm} title={tx("Taka úr samanburði")}
                            onClick={() => onToggleTarget && onToggleTarget(t.p.id)}>✕</button>}
                      </td>
                      {t.cells.map((cell, i) => (
                        <Cell key={gws[i]} cell={cell} teamById={teamById}
                          hard={needOf(cell, hardFrom) > 0} />
                      ))}
                      <td style={S.tdNum} colSpan={2}>
                        {(() => {
                          const n = t.cells.filter(c => needOf(c, hardFrom) > 0).length;
                          return `${n} ${n === 1 ? tx("erfið") : tx("erfiðar")}`;
                        })()}
                      </td>
                    </tr>
                  ))}

                  {/* BÆTA ÖÐRUM VIÐ */}
                  {(targetIds || []).length < 2 && !!addable.length && (
                    <tr>
                      <td style={S.tdAdd} colSpan={gws.length + 3}>
                        <label style={S.addLbl}>
                          {tx("Bæta öðrum við:")}
                          <select style={S.sel} value=""
                            onChange={e => e.target.value &&
                              onToggleTarget && onToggleTarget(Number(e.target.value))}>
                            <option value="">{tx("— veldu —")}</option>
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
                    <tr><td style={S.tdEmpty} colSpan={gws.length + 3}>
                      {tx("Engar erfiðar umferðir næstu")} {horizon} {tx("— ekkert að leysa. Þessi maður má vera inni.")}
                    </td></tr>
                  ) : !R.results.length ? (
                    <tr><td style={S.tdEmpty} colSpan={gws.length + 3}>
                      {tx("Enginn þekur þessar umferðir innan þaksins")}
                      {onlyMine ? tx(" í liðinu þínu") : ""}{tx(". Hækkaðu verðþakið")}
                      {onlyMine ? tx(" eða slepptu „aðeins mitt lið“") : ""}.
                    </td></tr>
                  ) : (
                    <>
                      <tr><td style={S.grp} colSpan={gws.length + 3}>
                        {tx("BESTU PÖR — raðað eftir vinningi í erfiðu umferðunum")}
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
                              {c.owned && <span style={S.mine} title={tx("Þegar í liðinu þínu — engin skipti")}>{tx("í liðinu")}</span>}
                              {!!c.others?.length && (
                                <span style={S.others}
                                  title={tx("Sömu leikir — FFDR er eiginleiki LIÐSINS:\n")
                                    + c.others.map(o => `${POS[o.element_type]} ${o.web_name} £${((o.now_cost||0)/10).toFixed(1)}`).join("\n")}>
                                  +{c.others.length}
                                </span>
                              )}
                            </td>
                            {cells.map((cell, j) => (
                              <Cell key={gws[j]} cell={cell} teamById={teamById}
                                hard={false} />
                            ))}
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
              <b>!</b> {tx("= umferð sem þinn maður á erfiða (dökkgult, ljósrautt, rautt) eða")} <b>{tx("auða")}</b>{tx("; auð umferð telst þyngst því hún gefur 0 stig. Rauður rammi merkir þær.")}
              {" "}<b>⧫</b> {tx("= tvöföld umferð.")} {" "}
              <b>{tx("Þekja")}</b> {tx("er FFDR-svarið: hversu miklu af erfiðleikunum hann mætir með hlutlausum leik eða betri.")} <b>{tx("Vinn.")}</b> {tx("er ákvörðunin: vænt stig hans mínus þess sem hann kemur inn fyrir, aðeins í erfiðu umferðunum. Raðað eftir vinningi — hrein þekja setur menn í slökum liðum á toppinn.")}
              {" "}{tx("Ein röð per LIÐ — FFDR er eiginleiki liðsins, svo allir varnarmenn sama félags eiga sömu leiki;")} <b>+N</b> {tx("eru hinir í sama liði.")}
              {" "}{tx("Verðþak")} {maxTenths == null ? tx("ekkert") : `£${(maxTenths / 10).toFixed(1)}`}.
              {hardFrom <= 2 && tx(" Hlutlausir (hvítir) leikir teljast með, og þá þarf parið að vera GRÆNT.")}
              <button style={S.clearAll} onClick={onClear}>{tx("Hreinsa val")}</button>
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
