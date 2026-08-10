/* ============================================================
   BESTOFBEST.JSX — flipinn "Best of the best" (koronu-ikon)

   HVAD THETTA SYNIR: hvad 1.000 SANNREYNDIR sérfraedingar gerdu i thessari
   umferd — hverja their keyptu, hverja their seldu, hvern their gerdu ad
   fyrirlida og hvada chip their spiludu.

   HVERNIG HOPURINN VAR VALINN og hvers vegna hann er 1.000 manns en ekki 10:
   sja langa athugasemd i `src/pros.js`. Stutta utgafan: valid er maelt a
   77.000+ raunverulegum FPL-ferlum, og topp-3 eftir fyrri ferli standa sig
   VERR en medaltal topp-100 (afturhvarf til medaltals). Med 10 monnum er
   60/40 skipting ekki adgreinanleg fra hlutkesti.

   ---------------------------------------------------------------------------
   THETTA ER MAELING, EKKI RAD. Engin tala hedan fer i `rankScore`,
   `expPointsFor` eda FFDR. Astaedan er MAELD: sama profun a ALMENNA
   markadnum (4 timabil, 104.160 leikmanna-umferdir) syndi ad skipta-hreyfing
   fjoldans baetir ENGU ofan a `ep_next` (r = -0,0005) og er NEIKVAED medal
   theirra sem spiludu i raun (-0,111). Hvort THESSI hopur se odruvisi er
   OSVARAD — thad verdur maelt eftir ~10 umferdir, med somu adferd. Thangad
   til er thetta upplysing a skja, ekki inntak i likan.
   ============================================================ */

import React, { useMemo, useState } from "react";
import { eo, movers, differential, coverageOk, marginPct, chipTimeline,
         MIN_PANEL_RESPONSE } from "./pros.js";
import { CrownIcon } from "./Icons.jsx";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c", blue:"#2563eb",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const POS = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };
const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };
const CHIP_LABEL = { wildcard:"Wildcard", freehit:"Free Hit", bboost:"Bench Boost", "3xc":"Triple Captain" };

const S = {
  wrap:{ display:"flex", flexDirection:"column", gap:14 },
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px" },
  h:{ margin:"0 0 8px", fontSize:14, fontWeight:700, color:C.text,
      display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" },
  sub:{ fontSize:11.5, color:C.text2, fontWeight:400 },
  note:{ fontSize:11.5, color:C.text2, margin:"6px 0 0", lineHeight:1.5 },
  grid:{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:12 },
  scroll:{ overflowX:"auto" },
  table:{ width:"100%", borderCollapse:"collapse", fontSize:12.5 },
  th:{ textAlign:"right", padding:"5px 6px", color:C.text3, fontWeight:600,
       fontSize:11, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" },
  thL:{ textAlign:"left" },
  td:{ textAlign:"right", padding:"5px 6px", borderBottom:`1px solid #f0f0f3`,
       fontFamily:mono, whiteSpace:"nowrap" },
  tdL:{ textAlign:"left", fontFamily:"inherit" },
  pill:{ fontSize:10, fontWeight:700, padding:"1px 5px", borderRadius:4, color:"#fff" },
  stat:{ display:"flex", flexDirection:"column", gap:2, minWidth:96 },
  statV:{ fontSize:17, fontWeight:700, fontFamily:mono, color:C.text },
  statL:{ fontSize:10.5, color:C.text3 },
  warn:{ background:C.amberBg, border:`1px solid ${C.amber}`, borderRadius:8,
         padding:"8px 10px", fontSize:12, color:"#6b4d00" },
  empty:{ padding:"22px 14px", textAlign:"center", color:C.text2, fontSize:13, lineHeight:1.6 },
  bar:{ height:6, borderRadius:3, background:"#eceef2", overflow:"hidden" },
};

/* "—" fyrir null, tala fyrir 0. NULL ER EKKI NULL (CLAUDE.md kafla 8). */
const num = (v, d = 0) => (v == null || !Number.isFinite(v) ? "—" : v.toFixed(d));
const pc = (v, d = 0) => (v == null || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(d)}%`);

function Name({ p, onPick }) {
  if (!p) return <span style={{ color:C.text3 }}>{"unknown"}</span>;
  return (
    <button onClick={() => onPick && onPick(p.id)}
      style={{ background:"none", border:"none", padding:0, cursor:onPick ? "pointer" : "default",
               font:"inherit", color:C.text, textAlign:"left" }}>
      {p.web_name}
    </button>
  );
}

function MoveTable({ rows, byId, teamById, onPick, mine, label, tint }) {
  if (!rows.length) return <p style={S.note}>{"No transfers recorded for this gameweek."}</p>;
  const max = rows[0].count || 1;
  return (
    <div style={S.scroll}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, ...S.thL }}>{label}</th>
            <th style={S.th}>{"Managers"}</th>
            <th style={S.th}>{"Share"}</th>
            <th style={S.th}>{"Net"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const p = byId[r.id];
            const t = p && teamById ? teamById[p.team] : null;
            return (
              <tr key={r.id}>
                <td style={{ ...S.td, ...S.tdL }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    {p ? <span style={{ ...S.pill, background:POS_COLOR[p.element_type] || C.text3 }}>
                           {POS[p.element_type] || "?"}</span> : null}
                    <Name p={p} onPick={onPick} />
                    <span style={{ fontSize:10.5, color:C.text3 }}>{t?.short || ""}</span>
                    {/* GRAENT = I MINU LIDI. Fastur litakodi i ollu appinu
                        (CLAUDE.md kafla 8, "Litir og merki") — ekki finna upp nyjan. */}
                    {mine && mine.has(r.id)
                      ? <span title="In your squad" style={{ width:6, height:6, borderRadius:3,
                                                             background:C.green, display:"inline-block" }} />
                      : null}
                  </div>
                  <div style={{ ...S.bar, marginTop:3 }}>
                    <div style={{ width:`${Math.round(100 * r.count / max)}%`, height:"100%", background:tint }} />
                  </div>
                </td>
                <td style={S.td}>{r.count}</td>
                <td style={S.td}>{pc(r.share, 1)}</td>
                {/* `net` adgreinir mann sem 90 kaupa og 80 selja fra manni sem
                    90 kaupa og enginn selur — bert kaup feldi thann mun.   */}
                <td style={{ ...S.td, color: r.net > 0 ? C.green : r.net < 0 ? C.red : C.text3 }}>
                  {r.net > 0 ? `+${r.net}` : r.net}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function BestOfBest({ pros, panelFile, players, teamById, onPickPlayer,
                                    mineIds = [] }) {
  /* Valin umferd. `null` = nyjasta. Notandinn vill geta litid til baka:
     "hvad gerdu their i GW7?" er jafn gild spurning og "hvad nuna?".   */
  const [pickedGw, setPickedGw] = useState(null);
  const byId = useMemo(() => {
    const m = {};
    for (const p of players || []) m[p.id] = p;
    return m;
  }, [players]);

  const panelSize = pros?.panel_size || panelFile?.panel?.length || 0;
  const gws = useMemo(() =>
    Object.keys(pros?.gw || {}).map(Number).filter(Number.isFinite).sort((a, b) => a - b),
    [pros]);
  const latest = gws.length ? gws[gws.length - 1] : null;
  const gw = pickedGw != null && gws.includes(pickedGw) ? pickedGw : latest;
  const agg = gw != null ? pros.gw[gw] : null;

  const mine = useMemo(() => new Set(mineIds || []), [mineIds]);

  const ins  = useMemo(() => (agg ? movers(agg, "in", 15) : []), [agg]);
  const outs = useMemo(() => (agg ? movers(agg, "out", 15) : []), [agg]);

  const capts = useMemo(() => {
    if (!agg?.n) return [];
    return Object.keys(agg.capt || {})
      .map(id => ({ id:+id, count:agg.capt[id], share:agg.capt[id] / agg.n }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
  }, [agg]);

  /* Munurinn a hopnum og fjoldanum. Bara their sem HOPURINN a — annars
     vaeri listinn 700 raðir af nullum.                                    */
  const diffs = useMemo(() => {
    if (!agg?.n) return { up:[], down:[] };
    const rows = Object.keys(agg.own || {}).map(id => {
      const p = byId[+id];
      const d = differential(agg, +id, p?.selected_by_percent);
      return d == null ? null : { id:+id, d, elite:eo(agg, +id), crowd:+p.selected_by_percent };
    }).filter(Boolean);
    rows.sort((a, b) => b.d - a.d);
    return { up: rows.slice(0, 10), down: rows.slice(-10).reverse() };
  }, [agg, byId]);

  /* Hlutfall hopsins sem spiladi SKIPTA-chip (wildcard/free hit) — thau
     tvo eru einu chipin sem breyta skipta-tolunum.                       */
  const chipShare = useMemo(() => {
    if (!agg?.n) return 0;
    return ((agg.chips?.wildcard || 0) + (agg.chips?.freehit || 0)) / agg.n;
  }, [agg]);

  const chipRows = useMemo(() =>
    (pros?.gw ? chipTimeline(pros.gw, Object.keys(CHIP_LABEL)) : []), [pros]);

  /* TOMT ASTAND ER EKKI HVITUR SKJAR (data-resilience.mjs). I forleik er
     thetta RETT astand, ekki bilun — og textinn segir hvenaer thad breytist. */
  if (!agg || !agg.n) {
    /* TOMT ASTAND MA EKKI VERA TVAER LINUR. Fyrsta utgafan var thad og
       `data-resilience.mjs` felldi hana: flipinn skiladi 298 stofum medan
       adrir flipar skila 2.700-3.900. Tveggja lina skjar les eins og BILUN,
       ekki eins og "timabilid er ekki byrjad" — og i forleik er thetta
       EINA sem notandinn faer ad sja her i tvaer vikur.                    */
    return (
      <div style={S.wrap}>
        <div style={S.card}>
          <h3 style={S.h}>
            <CrownIcon size={15} title="" />{"Best of the best"}
            <span style={S.sub}>{"what proven managers actually did"}</span>
          </h3>
          <div style={S.empty}>
            {panelSize
              ? `The panel of ${panelSize} proven managers is ready. No gameweek has been played yet.`
              : "The expert panel has not been built yet."}
            <br />
            {"Transfers, captains and chips appear here within minutes of the first deadline."}
          </div>
        </div>

        <div style={S.card}>
          <h3 style={S.h}>{"What you will see here"}</h3>
          <ul style={{ ...S.note, paddingLeft: 18, margin: "4px 0 0" }}>
            <li>{"Bought and sold — the players the panel moved on this gameweek, with how many of them did it."}</li>
            <li>{"Captains — how the armband was split, with a margin of error next to every share."}</li>
            <li>{"Chips — the share of the panel that has played each chip, gameweek by gameweek. "
                 + "This season has two full chip sets (GW1–19 and GW20–38)."}</li>
            <li>{"Experts vs the crowd — effective ownership against global ownership, so you can see "
                 + "where the panel is deliberately different."}</li>
            <li>{"Panel averages — transfers made, hits taken, squad value and median overall rank."}</li>
          </ul>
        </div>

        <div style={S.card}>
          <h3 style={S.h}>{"How the panel was chosen"}</h3>
          <p style={S.note}>
            {"Every manager here was selected by measurement, not reputation. Career records were scored "
             + "with a recency-weighted average of finishing percentile, and that rule was tested "
             + "out of sample against the alternatives before it was used."}
          </p>
          <p style={S.note}>
            {"The panel is deliberately large. Picking the very best few is worse, not better: the top of "
             + "any historical ranking is partly luck, and a handful of managers cannot tell a 60/40 split "
             + "from a coin flip. A panel of this size gives shares accurate to a couple of points."}
          </p>
          <p style={S.note}>
            {"Winning the game outright is close to a lottery even among these managers, so nothing here "
             + "is presented as a way to win. It is a record of what consistently strong managers did, "
             + "and it does not feed the ranking model until it has been measured against expected points."}
          </p>
        </div>
      </div>
    );
  }

  const cov = panelSize ? agg.n / panelSize : null;
  const thin = panelSize ? !coverageOk(agg, panelSize) : false;

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <h3 style={S.h}>
          <CrownIcon size={15} title="" />
          {"Best of the best"}
          <span style={S.sub}>{`${agg.n} of ${panelSize} experts`}</span>
          {gws.length > 1 ? (
            <select value={gw} onChange={e => setPickedGw(+e.target.value)}
              aria-label="Gameweek"
              style={{ marginLeft:"auto", font:"inherit", fontSize:12, padding:"2px 6px",
                       border:`1px solid ${C.border}`, borderRadius:6, background:C.card }}>
              {gws.slice().reverse().map(g => (
                <option key={g} value={g}>{`Gameweek ${g}`}</option>
              ))}
            </select>
          ) : <span style={S.sub}>{`Gameweek ${gw}`}</span>}
        </h3>

        {thin ? (
          <div style={S.warn}>
            {`Only ${pc(cov, 0)} of the panel could be read for this gameweek `
             + `(threshold ${pc(MIN_PANEL_RESPONSE, 0)}). Percentages below are still shown, `
             + `but treat them as provisional.`}
          </div>
        ) : null}

        <div style={{ display:"flex", gap:22, flexWrap:"wrap", marginTop:10 }}>
          <div style={S.stat}>
            <span style={S.statV}>{num(agg.transfers, 2)}</span>
            <span style={S.statL}>{"Transfers each"}</span>
          </div>
          <div style={S.stat}>
            <span style={S.statV}>{pc(agg.hitShare, 0)}</span>
            <span style={S.statL}>{"Took a hit"}</span>
          </div>
          <div style={S.stat}>
            <span style={S.statV}>{num(agg.hitCost, 1)}</span>
            <span style={S.statL}>{"Points spent on hits"}</span>
          </div>
          <div style={S.stat}>
            <span style={S.statV}>{agg.value == null ? "—" : `£${(agg.value / 10).toFixed(1)}`}</span>
            <span style={S.statL}>{"Squad value"}</span>
          </div>
          <div style={S.stat}>
            <span style={S.statV}>{agg.bank == null ? "—" : `£${(agg.bank / 10).toFixed(1)}`}</span>
            <span style={S.statL}>{"In the bank"}</span>
          </div>
          <div style={S.stat}>
            <span style={S.statV}>
              {agg.rankMedian == null ? "—" : agg.rankMedian.toLocaleString("en-GB")}
            </span>
            <span style={S.statL}>{"Median overall rank"}</span>
          </div>
        </div>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <h3 style={S.h}>{"Bought"}<span style={S.sub}>{"most transferred in"}</span></h3>
          <MoveTable rows={ins} byId={byId} teamById={teamById} onPick={onPickPlayer}
                     mine={mine} label={"Player"} tint={C.green} />
        </div>
        <div style={S.card}>
          <h3 style={S.h}>{"Sold"}<span style={S.sub}>{"most transferred out"}</span></h3>
          <MoveTable rows={outs} byId={byId} teamById={teamById} onPick={onPickPlayer}
                     mine={mine} label={"Player"} tint={C.red} />
        </div>      </div>

      {/* WILDCARD OG FREE HIT ERU INNI I THESSUM TOLUM og thad verdur ad
          segja: a wildcard-viku gerir einn madur 10+ skipti, svo "keyptir"
          rykur upp an thess ad thad se ny skodun a leikmanninum. Free Hit
          gengur meira ad segja TIL BAKA eftir umferdina. Vid siumn thau
          EKKI burt — their velja samt thessa menn — en tala an thessarar
          skyringar vaeri villandi.                                        */}
      {chipShare > 0.02 ? (
        <p style={{ ...S.note, marginTop:-4 }}>
          {`${pc(chipShare, 0)} of the panel played a transfer chip this gameweek, `
           + "so the counts above include wildcard and free-hit moves. "
           + "Free-hit transfers are reversed after the gameweek."}
        </p>
      ) : null}

      <div style={S.grid}>
        <div style={S.card}>
          <h3 style={S.h}>{"Captains"}<span style={S.sub}>{`out of ${agg.n} experts`}</span></h3>
          <div style={S.scroll}>
            <table style={S.table}>
              <thead><tr>
                <th style={{ ...S.th, ...S.thL }}>{"Player"}</th>
                <th style={S.th}>{"Managers"}</th>
                <th style={S.th}>{"Share"}</th>
                <th style={S.th}>{"± 95%"}</th>
              </tr></thead>
              <tbody>
                {capts.map(r => (
                  <tr key={r.id}>
                    <td style={{ ...S.td, ...S.tdL }}><Name p={byId[r.id]} onPick={onPickPlayer} /></td>
                    <td style={S.td}>{r.count}</td>
                    <td style={S.td}>{pc(r.share, 1)}</td>
                    {/* Vikmorkin eru HER svo 62% ur 12 monnum liti ekki eins ut
                        og 62% ur 1.000. Hlutfall an urtaksstaerdar er fullyrding
                        sem thykist vera maeling.                              */}
                    <td style={{ ...S.td, color:C.text3 }}>{num(marginPct(r.share, agg.n), 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={S.card}>
          <h3 style={S.h}>{"Chips"}<span style={S.sub}>{"share of the panel, by gameweek"}</span></h3>
          <div style={S.scroll}>
            <table style={S.table}>
              <thead><tr>
                <th style={{ ...S.th, ...S.thL }}>{"GW"}</th>
                {Object.keys(CHIP_LABEL).map(k => <th key={k} style={S.th}>{CHIP_LABEL[k]}</th>)}
              </tr></thead>
              <tbody>
                {chipRows.map(r => (
                  <tr key={r.gw}>
                    <td style={{ ...S.td, ...S.tdL }}>{r.gw}</td>
                    {Object.keys(CHIP_LABEL).map(k => (
                      <td key={k} style={{ ...S.td, color: r[k] ? C.text : C.text3 }}>
                        {r[k] == null ? "—" : pc(r[k], 1)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={S.note}>
            {"Two full chip sets are available this season (GW1–19 and GW20–38), so each chip can appear twice."}
          </p>
        </div>
      </div>

      <div style={S.card}>
        <h3 style={S.h}>
          {"Experts vs the crowd"}
          <span style={S.sub}>{"effective ownership minus global ownership"}</span>
        </h3>
        <div style={S.grid}>
          {[["Experts own more", diffs.up, C.green], ["Experts own less", diffs.down, C.red]].map(([t, rows, tint]) => (
            <div key={t}>
              <div style={{ fontSize:11.5, fontWeight:700, color:C.text2, marginBottom:4 }}>{t}</div>
              <div style={S.scroll}>
                <table style={S.table}>
                  <thead><tr>
                    <th style={{ ...S.th, ...S.thL }}>{"Player"}</th>
                    <th style={S.th}>{"Experts"}</th>
                    <th style={S.th}>{"Crowd"}</th>
                    <th style={S.th}>{"Diff"}</th>
                  </tr></thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id}>
                        <td style={{ ...S.td, ...S.tdL }}><Name p={byId[r.id]} onPick={onPickPlayer} /></td>
                        <td style={S.td}>{pc(r.elite, 1)}</td>
                        <td style={S.td}>{`${r.crowd.toFixed(1)}%`}</td>
                        <td style={{ ...S.td, color:tint }}>
                          {`${r.d > 0 ? "+" : ""}${r.d.toFixed(1)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <p style={S.note}>
          {"Effective ownership counts a captain twice, so it can exceed 100%. "
           + "This table is an observation of what the panel did — it is not advice, "
           + "and nothing here feeds the ranking model until it has been measured against expected points."}
        </p>
      </div>
    </div>
  );
}
