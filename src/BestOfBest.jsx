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
    /* SUNDURLAEGAR TOFLUR, EKKI SKARANDI SNEIDAR. `slice(0,10)` og
       `slice(-10)` skarast thegar faerri en 20 leikmenn eru i talningunni —
       maelt 10.8.2026: med 3 eigendum birtust ALLIR THRIR i BADUM toflum,
       thar med i einni sem segir "experts own MORE" og annarri sem segir
       "own LESS". Sama flokkur og "liturinn verdur ad segja thad sama og
       talan" (CLAUDE.md kafla 3): skjarinn ma ekki fullyrda tvennt gagnstaett.
       Skilyrdid er nu MERKI mismunarins, sem er lika rett merking.        */
    return { up: rows.filter(r => r.d > 0).slice(0, 10),
             down: rows.filter(r => r.d < 0).slice(-10).reverse() };
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
          {/* UNDIRTITILLINN ("what proven managers actually did") FOR
              20.8.2026 — hann sagdi thad sem flipa-heitid og innihaldid segja
              thegar. Fyllta astandid setur TOLU i thennan sama `S.sub`-reit
              ("950 of 1000 experts"), svo reiturinn er ekki daudur: hann
              berst tolu um leid og umferd er lokid.                        */}
          <h3 style={S.h}>
            <CrownIcon size={15} title="" />{"Best of the best"}
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

        {/* HER STOD SPJALDID "How the panel was chosen" — thrjar malsgreinar,
            fjarlaegdar 20.8.2026. RAKSEMDIN TAPADIST EKKI: hun bjo aldrei i
            thessum texta heldur i `src/pros.js` (helmingunartimi 3 timabil
            maeldur ut fyrir urtak, N=1000 a moti 1/3/5/10, jofn vog) og i
            hausnum a THESSARI skra. Textinn var endursogn a theim
            athugasemdum i prosa — tolurnar sjalfar voru hvergi i honum.
            TOMA ASTANDID VERDUR SAMT AD BERA EFNI: `data-resilience.mjs`
            felldi tveggja-linu utgafu thessa flipa (298 stafir a moti
            2.700-3.900 i odrum flipum) og thakid er 400 stafir. Spjaldid
            "What you will see here" ber thad nu eitt, svo ThAD ma ekki
            hverfa lika an thess ad maela thekjuna aftur.                  */}
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

        {/* VIDMID. Tala an vidmids er merkingarlaus: "bekkurinn kostar
            17,0" segir ekkert fyrr en madur veit hvad ALMENNUR stjornandi
            gerir. `control` er FASTUR slembinn hopur af somu staerd.     */}
        {agg.control ? (
          <div style={{ ...S.scroll, marginTop:10 }}>
            <table style={S.table}>
              <thead><tr>
                <th style={{ ...S.th, ...S.thL }}>{"This gameweek"}</th>
                <th style={S.th}>{"The best"}</th>
                <th style={S.th}>{"Average manager"}</th>
                <th style={S.th}>{"Difference"}</th>
              </tr></thead>
              <tbody>
                {[
                  ["Points", agg.points, agg.control.points, 1, ""],
                  ["Points left on bench", agg.benchPoints, agg.control.benchPoints, 1, ""],
                  ["Transfers made", agg.transfers, agg.control.transfers, 2, ""],
                  ["Points spent on hits", agg.hitCost, agg.control.hitCost, 1, ""],
                  ["Squad value", agg.value, agg.control.value, 1, "money"],
                  ["Bench cost", agg.benchCost, agg.control.benchCost, 1, "money"],
                  ["Auto subs used", agg.autoSubs, agg.control.autoSubs, 2, ""],
                  ["Minutes before deadline", agg.transferMinsMedian, agg.control.transferMinsMedian, 0, ""],
                ].map(([lab, a, b, dp, kind]) => {
                  const f = v => (v == null || !Number.isFinite(v) ? "—"
                                  : kind === "money" ? `£${(v / 10).toFixed(1)}` : v.toFixed(dp));
                  const d = (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b))
                    ? null : a - b;
                  /* Fyrir "stig a bekk" og "stig i hits" er LAEGRA betra, svo
                     liturinn ma ekki radast af formerki eingongu — sama regla
                     og `hi` i dalkaskranni (CLAUDE.md kafla 8).           */
                  const lower = lab === "Points left on bench" || lab === "Points spent on hits";
                  const good = d == null ? null : (lower ? d < 0 : d > 0);
                  return (
                    <tr key={lab}>
                      <td style={{ ...S.td, ...S.tdL }}>{lab}</td>
                      <td style={{ ...S.td, fontWeight:700 }}>{f(a)}</td>
                      <td style={{ ...S.td, color:C.text3 }}>{f(b)}</td>
                      <td style={{ ...S.td, color: good == null ? C.text3 : good ? C.green : C.red }}>
                        {d == null ? "—"
                          : (kind === "money"
        /* FORMERKID VAR INNAN I GJALDMIDLINUM (lagad 25.8.2026):
           `${d>0?"+":""}£${(d/10).toFixed(1)}` bældi "+" fyrir neikvaeda
           tolu og let `toFixed` skila sinu eigin "-" A EFTIR pundamerkinu
           -> **"£-1.2"**. Skrain setur sina eigin reglu tveimur linum
           ofar (`f`, sem ber `£` fremst) og braut hana hér. Neikvaedur
           munur er ekki jadartilfelli: tveir daemigerdir dalkar
           (hopsvirdi, bekkjar-kostnadur) liggja undir medaltalinu. */
        ? `${d < 0 ? "\u2212" : "+"}£${(Math.abs(d) / 10).toFixed(1)}`
                                              : `${d > 0 ? "+" : ""}${d.toFixed(dp)}`)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={S.note}>
              {`Against ${agg.control.size || "—"} randomly chosen active managers, `
               + "the same cohort all season so week-to-week change is behaviour and not a new sample. "
               + "Ownership already had a baseline from FPL; formation, bench cost, price points "
               + "and transfer timing did not."}
            </p>
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

      <div style={S.card}>
        <h3 style={S.h}>
          {"Most owned"}
          <span style={S.sub}>{`what ${agg.n} of the best actually hold`}</span>
        </h3>
        <div style={S.scroll}>
          <table style={S.table}>
            <thead><tr>
              <th style={{ ...S.th, ...S.thL }}>{"Player"}</th>
              <th style={S.th}>{"Owned"}</th>
              <th style={S.th}>{"Share"}</th>
              <th style={S.th}>{"Captained"}</th>
              <th style={S.th}>{"Crowd"}</th>
            </tr></thead>
            <tbody>
              {Object.keys(agg.own || {})
                .map(id => ({ id:+id, c:agg.own[id] }))
                .sort((a, b) => b.c - a.c).slice(0, 20)
                .map(r => {
                  const p = byId[r.id];
                  const t = p && teamById ? teamById[p.team] : null;
                  return (
                    <tr key={r.id}>
                      <td style={{ ...S.td, ...S.tdL }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          {p ? <span style={{ ...S.pill, background:POS_COLOR[p.element_type] || C.text3 }}>
                                 {POS[p.element_type] || "?"}</span> : null}
                          <Name p={p} onPick={onPickPlayer} />
                          {/* `short`, EKKI `short_name` (25.8.2026). `teams.json` ber `short`
                              ("ARS") og hefur alltaf gert; `short_name` er ekki til a
                              rodinni, svo thetta var FAST tomur strengur og lidid sast
                              aldrei i thessari toflu. Systur-taflan 300 linum ofar
                              (`MoveTable`) las rett gildi allan timann — sama skra, tvo
                              svor. Thogul birtingar-villa: engin villa, bara tomt.   */}
                          <span style={{ fontSize:10.5, color:C.text3 }}>{t?.short || ""}</span>
                          {mine.has(r.id)
                            ? <span title="In your squad" style={{ width:6, height:6, borderRadius:3,
                                                                   background:C.green, display:"inline-block" }} />
                            : null}
                        </div>
                      </td>
                      <td style={S.td}>{r.c}</td>
                      <td style={S.td}>{pc(r.c / agg.n, 1)}</td>
                      <td style={S.td}>{agg.capt?.[r.id] ? pc(agg.capt[r.id] / agg.n, 1) : "—"}</td>
                      <td style={{ ...S.td, color:C.text3 }}>
                        {p?.selected_by_percent == null ? "—" : `${(+p.selected_by_percent).toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* LIDSSKIPAN — leikstodukerfi, bekkur og verd-uppbygging.
          Thetta er spurningin "hvernig setja their upp lidid?" og hun er
          adeins svaranleg thvi lidsskipan er REIKNUD VID SOFNUN, med theim
          verdum sem giltu tha (verd breytast i hverri viku).            */}
      {agg.shapeN ? (
        <div style={S.card}>
          <h3 style={S.h}>
            {"Squad shape"}
            <span style={S.sub}>{`how ${agg.shapeN} of them set the team up`}</span>
          </h3>
          <div style={S.grid}>
            <div>
              <div style={{ fontSize:11.5, fontWeight:700, color:C.text2, marginBottom:4 }}>
                {"Formation"}
              </div>
              <div style={S.scroll}>
                <table style={S.table}>
                  <thead><tr>
                    <th style={{ ...S.th, ...S.thL }}>{"DEF-MID-FWD"}</th>
                    <th style={S.th}>{"Managers"}</th>
                    <th style={S.th}>{"Share"}</th>
                  </tr></thead>
                  <tbody>
                    {Object.entries(agg.formations || {})
                      .sort((a, b) => b[1] - a[1]).slice(0, 8)
                      .map(([f, c]) => (
                        <tr key={f}>
                          <td style={{ ...S.td, ...S.tdL }}>{f}</td>
                          <td style={S.td}>{c}</td>
                          <td style={S.td}>{pc(c / agg.shapeN, 1)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div style={{ fontSize:11.5, fontWeight:700, color:C.text2, marginBottom:4 }}>
                {"Where the money goes"}
              </div>
              <div style={S.scroll}>
                <table style={S.table}>
                  <thead><tr>
                    <th style={{ ...S.th, ...S.thL }}>{"Line"}</th>
                    <th style={S.th}>{"Mean spend"}</th>
                    <th style={S.th}>{"Of XI"}</th>
                  </tr></thead>
                  <tbody>
                    {[[1, "Goalkeeper"], [2, "Defence"], [3, "Midfield"], [4, "Attack"]].map(([k, lab]) => {
                      const v = agg.byPos?.[k];
                      return (
                        <tr key={k}>
                          <td style={{ ...S.td, ...S.tdL }}>
                            <span style={{ ...S.pill, background:POS_COLOR[k] }}>{POS[k]}</span>
                            {" " + lab}
                          </td>
                          <td style={S.td}>{v == null ? "—" : `£${(v / 10).toFixed(1)}`}</td>
                          <td style={S.td}>
                            {v == null || !agg.startCost ? "—" : pc(v / agg.startCost, 0)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td style={{ ...S.td, ...S.tdL, fontWeight:700 }}>{"Bench (4)"}</td>
                      <td style={{ ...S.td, fontWeight:700 }}>
                        {agg.benchCost == null ? "—" : `£${(agg.benchCost / 10).toFixed(1)}`}
                      </td>
                      <td style={S.td}>{"—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* VERD-PUNKTAR: "4,5 markmadur eda 4,0?" er ekki svaranleg med
              medaltali — 4,25 er ekki verd sem er til.                   */}
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:11.5, fontWeight:700, color:C.text2, marginBottom:4 }}>
              {"Price points they actually use"}
            </div>
            <div style={S.scroll}>
              <table style={S.table}>
                <thead><tr>
                  <th style={{ ...S.th, ...S.thL }}>{"Line"}</th>
                  <th style={{ ...S.th, ...S.thL }}>{"Starting XI (most common first)"}</th>
                  <th style={{ ...S.th, ...S.thL }}>{"Bench"}</th>
                </tr></thead>
                <tbody>
                  {[[1, "GK"], [2, "DEF"], [3, "MID"], [4, "FWD"]].map(([k, lab]) => {
                    const fmt = src => Object.entries(src?.[k] || {})
                      .map(([c, n]) => ({ c:+c, n }))
                      .sort((a, b) => b.n - a.n).slice(0, 5)
                      .map(x => `£${(x.c / 10).toFixed(1)} (${Math.round(100 * x.n / (agg.shapeN || 1))}%)`)
                      .join("  ");
                    return (
                      <tr key={k}>
                        <td style={{ ...S.td, ...S.tdL }}>
                          <span style={{ ...S.pill, background:POS_COLOR[k] }}>{lab}</span>
                        </td>
                        <td style={{ ...S.td, ...S.tdL, fontFamily:mono, fontSize:11.5 }}>
                          {fmt(agg.priceStart) || "—"}
                        </td>
                        <td style={{ ...S.td, ...S.tdL, fontFamily:mono, fontSize:11.5 }}>
                          {fmt(agg.priceBench) || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* HVAD STOD SIG BEST. `outcome` er adeins til fyrir umferdir sem
              NAESTA umferd hefur verid sott fyrir — rodun tharf badum megin. */}
          {agg.outcome?.n ? (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:11.5, fontWeight:700, color:C.text2, marginBottom:4 }}>
                {"How each formation actually did"}
              </div>
              <div style={S.scroll}>
                <table style={S.table}>
                  <thead><tr>
                    <th style={{ ...S.th, ...S.thL }}>{"Formation"}</th>
                    <th style={S.th}>{"Managers"}</th>
                    <th style={S.th}>{"Rank move"}</th>
                    <th style={S.th}>{"vs panel"}</th>
                  </tr></thead>
                  <tbody>
                    {Object.entries(agg.outcome.byFormation || {})
                      .filter(([, v]) => v.n >= 10)
                      .sort((a, b) => a[1].delta - b[1].delta)
                      .map(([f, v]) => {
                        const rel = v.delta - (agg.outcome.panelDelta ?? 0);
                        return (
                          <tr key={f}>
                            <td style={{ ...S.td, ...S.tdL }}>{f}</td>
                            <td style={S.td}>{v.n}</td>
                            <td style={{ ...S.td, color: v.delta < 0 ? C.green : v.delta > 0 ? C.red : C.text3 }}>
                              {v.delta > 0 ? `+${v.delta.toLocaleString("en-GB")}` : v.delta.toLocaleString("en-GB")}
                            </td>
                            <td style={{ ...S.td, color: rel < 0 ? C.green : rel > 0 ? C.red : C.text3 }}>
                              {rel > 0 ? `+${rel.toLocaleString("en-GB")}` : rel.toLocaleString("en-GB")}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <p style={S.note}>
                {"Negative is better — the median rank move of the managers who lined up that way, "
                 + "over the gameweek they used it. Shown against the whole panel's move, because "
                 + "rank change is mostly driven by what everyone did that week. "
                 + "Formations with fewer than 10 managers are omitted: who USES a shape is not "
                 + "the same question as how it PERFORMED."}
              </p>
            </div>
          ) : null}

          <p style={S.note}>
            {"Spend is the price at this deadline, recorded when the squads were read — "
             + "prices move every week, so it cannot be reconstructed afterwards. "
             + "A cheap bench means more of the budget is on the pitch."}
          </p>
        </div>
      ) : null}

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
