/* ============================================================
   IMMINENT.JSX — "hver er ad fara ad skora / leggja upp"

   FLUTT UR Leaderboard.jsx 8.8.2026 ad beidni notandans: hann notar
   leikmanna-tofluna sem sitt adalverkfaeri, svo thetta a ad vera thar og
   ekki i annarri flipa. Skran er SU SAMA og var i stigatoflunni — engin
   formula var endurskrifud, thvi maelingin a bak vid IG/IA (kafli 6d) er
   sama maelingin og hun byggir a src/stats.js (`imminentBoard`).

   AF HVERJU EIGIN SKRA OG EKKI AFRIT INNI I PlayerList.jsx: tvo afrit af
   sama spjaldi eru tvaer utfaerslur a somu tolu, og thad er nakvaemlega
   gildran sem kostadi viku thegar markadslidurinn dó thogult (CLAUDE.md
   kafli 3). Ein skra, einn innflutningur.
   ============================================================ */

import React, { useState, useMemo } from "react";
import { imminentBoard, nameScore } from "./stats.js";
import { photoNext } from "./Crest.jsx";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c",
  amber:"#c98a00", amberBg:"#fff6e0",
};

/* ============================================================
   OHJAKVAEMILEGT — MO og AO med TREND-LINURITI

   Linuritid er ekki skraut: thad synir HVERT umferdar-gildi i glugganum,
   svo notandinn sjai hvort magnid er ad BYGGJAST UPP eða hvort ein umferd
   ber allt. Fjorar umferdir, hvert stak er raunveruleg maeling.

   Vogtolurnar og maelingin a bak vid MO/AO eru i src/stats.js.
   ============================================================ */
/* Mynd med stafa-fallback VID VILLU, ekki adeins thegar code vantar.
   premierleague.com skilar 404 fyrir nyja/nyflutta menn (Igor Jesus i
   agust 2026) og an onError birti vafrinn brotid-myndar-tak i stad
   stafsins — sama regla og PlayerImg i App.jsx.                        */
function ImmPhoto({ img, name }) {
  const [ok, setOk] = useState(true);
  if (!img || !ok) return <span style={S.immImgFb}>{(name || "?").slice(0, 1)}</span>;
  /* TVAER FOTUR — sja maelinguna i Crest.jsx. Stafurinn kemur fyrst ef
     BADAR bregdast, ekki eftir fyrstu.                                  */
  return <img src={img} alt="" style={S.immImg} loading="lazy"
    onError={e => { const n = photoNext(e.target.src); if (n) e.target.src = n; else setOk(false); }} />;
}

export default function ImminentPanel({ imminent, teamById, Crest, photoUrl, players, onPickPlayer }) {
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
    return <div style={S.warn}>{"Fetching"} <code>imminent.json</code>{"… the pipeline has not written it yet."}</div>;
  }
  const isMo = kind === "mo";
  const serieKey = isMo ? "xg" : "cre";

  return (
    <>
      <div style={S.immHead}>
        <div style={S.modeRow}>
          <button style={{ ...S.modeBtn, ...(isMo ? S.modeOn : {}) }}
            onClick={() => setKind("mo")}>{"⚽ Goal imminent"}</button>
          <button style={{ ...S.modeBtn, ...(!isMo ? S.modeOn : {}) }}
            onClick={() => setKind("ao")}>{"◎ Assist imminent"}</button>
        </div>
        <span style={S.muted}>
          {imminent.archive ? "ARCHIVE · " : ""}{imminent.season} · GW{imminent.gws?.join(", ")}
        </span>
      </div>

      <div style={S.note}>
        {isMo ? (
          <>
            <b>{"Who is about to score."}</b> {"Only players with"} <b>{"0–1 involvement"}</b> {"in the last"} {imminent.window} {"gameweeks — a player who has already exploded needs no forecast. The score is"} <code>{"xG·0.8 + threat/25·0.3 + bad luck·0.2"}</code>, <b>{"measured"}</b> {"on 13,273 samples over 3 seasons: the top decile scores"} <b>{"2.89×"}</b> {"the average, against 2.70 for xG alone and 2.78 for threat alone (out of sample, 2/3 seasons)."}
          </>
        ) : (
          <>
            <b>{"Who is about to assist."}</b> {"This is"} <b>{"plain creativity/90"}</b> {"— and that is a measured result, not laziness: a composite IA score (xA + creativity + bad luck) was tested and"} <b>{"failed"}</b>{", 2.18 against 2.21 for plain creativity, and lost in"}
            <b> {"0 of 3"}</b> {"seasons. The xA weight was always selected as 0. So we show what works."}
          </>
        )}
      </div>

      <div style={S.immGrid}>
        {board.map((p, i) => {
          const cur = findCur(p);
          const img = photoUrl && cur?.code ? photoUrl(cur.code) : null;
          const t = cur ? teamById?.[cur.team] : null;
          /* TVOFOLD UMFERD: leikmadur getur haft TVAER radir i somu umferd
             (GW36 2025/26 var tvofold fyrir CRY og MCI — 82 leikmenn).
             Gluggasumman a ad telja BADA leiki, en linuritid heitir
             "per umferd", svo thad verdur ad LEGGJA THA SAMAN i einn punkt.
             Annars birtust 5 punktar i 4-umferda glugga, tveir merktir GW36. */
          const byGw = new Map();
          for (const x of (p.series || [])) {
            byGw.set(x.gw, (byGw.get(x.gw) ?? 0) + (x[serieKey] ?? 0));
          }
          const gwList = [...byGw.keys()].sort((a, b) => a - b);
          const series = gwList.map(g => +byGw.get(g).toFixed(2));
          return (
            <div key={p.name + i} style={S.immCard}
              onClick={() => cur && onPickPlayer && onPickPlayer(cur.id)}>
              <div style={S.immTop}>
                <span style={S.immRank}>{i + 1}</span>
                <ImmPhoto img={img} name={p.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.immName}>{p.name}</div>
                  <div style={S.immMeta}>
                    {t ? <Crest team={t} size={11} /> : null} {p.team} · {p.pos}
                    {cur ? ` · £${((cur.now_cost ?? 0) / 10).toFixed(1)}` : ""}
                  </div>
                </div>
                <div style={S.immScore} title={isMo ? "IG score" : "IA score"}>
                  {p.score}
                </div>
              </div>

              <Spark values={series} label={isMo ? "xG per gameweek" : "creativity per gameweek"}
                gws={gwList} />

              <div style={S.immStats}>
                {isMo ? (
                  <>
                    <span><b>{p.window.xg.toFixed(2)}</b> xG</span>
                    <span><b>{Math.round(p.window.threat)}</b> threat</span>
                    <span title={"xG minus goals — how much he is owed"}>
                      <b>{Math.max(0, p.window.xg - p.window.goals).toFixed(2)}</b> {"owed"}</span>
                  </>
                ) : (
                  <>
                    <span><b>{Math.round(p.window.creativity)}</b> creativity</span>
                    <span><b>{p.window.xa.toFixed(2)}</b> xA</span>
                  </>
                )}
                <span style={S.immGi}>{p.window.gi} {"involvement"}</span>
              </div>
            </div>
          );
        })}
      </div>
      {!board.length && <div style={S.muted}>{"No player in the target group in this window."}</div>}
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

const S = {
  immImg:{ width:30, height:38, objectFit:"contain", flex:"0 0 30px" },
  immImgFb:{ width:30, height:38, display:"flex", alignItems:"center", justifyContent:"center",
             background:"#efeff2", borderRadius:4, fontSize:13, color:"#61616b", flex:"0 0 30px" },
  immHead:{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10,
            flexWrap:"wrap", marginBottom:8 },
  immGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(232px, 1fr))", gap:8 },
  immCard:{ border:"1px solid #e0e0e4", borderRadius:8, background:"#fafafb", padding:"7px 9px",
            cursor:"pointer" },
  immTop:{ display:"flex", alignItems:"center", gap:6 },
  immRank:{ fontSize:10, fontFamily:"ui-monospace, Menlo, monospace", color:"#8b8b95",
            width:14, flex:"0 0 14px" },
  immName:{ fontSize:11.5, fontWeight:600, color:"#1d1d20", overflow:"hidden",
            textOverflow:"ellipsis", whiteSpace:"nowrap" },
  immMeta:{ fontSize:9.5, color:"#8b8b95", display:"flex", alignItems:"center", gap:3 },
  immScore:{ fontSize:15, fontWeight:700, color:"#37003c",
             fontFamily:"ui-monospace, Menlo, monospace" },
  immStats:{ display:"flex", gap:7, flexWrap:"wrap", fontSize:9.5, color:"#61616b" },
  immGi:{ marginLeft:"auto", color:"#8b8b95" },
  spark:{ width:"100%", height:34, display:"block", margin:"4px 0 2px" },
  muted:{ fontSize:11.5, color:C.text3, margin:"6px 0 0", lineHeight:1.45 },

  warn:{ fontSize:11.5, color:C.amber, background:C.amberBg, border:`1px solid #f0dcae`,
         borderRadius:6, padding:"6px 8px", marginBottom:8, lineHeight:1.45 },
  note:{ fontSize:11.5, color:C.text2, lineHeight:1.45, margin:"0 0 8px" },
  modeRow:{ display:"flex", gap:4 },
  modeBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:6,
            padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer" },
  modeOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
};
