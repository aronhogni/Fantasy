/* ============================================================
   EINKA-DEILDIR (mini-leagues) + VERÐLAUNAPOTTUR

   TVENNT SEM ÞETTA GERIR OG APPIÐ GAT EKKI ÁÐUR:
     1. Fylgist með stöðunni í deildunum þínum (FPL classic leagues)
        — hver er á undan, hvað munar, hver hreyfðist í síðustu umferð.
     2. VERÐLAUN: deildir eru oft með peningapott. Þú skráir pottinn og
        skiptinguna og appið sýnir hver á HVAÐ eins og staðan er núna.

   HVERS VEGNA SÉR SKRÁ: þetta er ekki reiknilíkan heldur birting á
   ytri gögnum + notanda-stillingum. Ekkert hér má fara í `model.js`.

   GEYMSLA: deildar-ID og verðlaun eru NOTANDA-GÖGN og lifa í
   localStorage (`fpl_leagues`), eins og vaktlistinn — ekki í repo.
   Peningaupphæðir eru einkamál og fara ALDREI í nein köll út.

   HEIMILD: `fpl-league` í netlify/functions/odds.js (FPL-standings er
   CORS-lokað eins og allt annað FPL). CDN-cache 60 s.
   ============================================================ */
import React, { useEffect, useState } from "react";
import { interp } from "./interp.js";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b", red:"#d92d3c",
  gold:"#d9a520",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

/* Sjálfgefin skipting pottsins. FLESTAR deildir borga 1.-3. sæti; þetta
   er aðeins UPPHAFSGILDI og notandinn breytir því.                      */
export const DEFAULT_SPLIT = [50, 30, 20];

/* Hver fær hvað: `split` er prósenta per sæti. Skilar fylki jafnlöngu
   `split` með upphæð í heilum krónum (námundað niður svo summan fari
   ALDREI yfir pottinn — að lofa meiru en er til er verri villa en að
   eiga afgang).                                                        */
export function prizeFor(pot, split) {
  /* NEIKVAED GILDI ERU KLIPPT I NULL — MAELT 7.8.2026:
     an thess gaf `pot 10.000, split [50,-30]` fyrsta saeti **25.000**,
     thad er 2,5x ALLAN pottinn (summan vard 20, svo 50/20 = 2,5).
     Neikvaedur pottur gaf neikvaed verdlaun. Hvorugt ma gerast: thetta
     eru PENINGAR og notandinn slaer thetta inn i hondunum.
     Reglan: pottur >= 0, hver hlutur >= 0, og se summan 0 fa allir 0.  */
  const p = Math.max(0, Number(pot) || 0);
  const s = (split || []).map(x => Math.max(0, Number(x) || 0));
  const sum = s.reduce((a, b) => a + b, 0);
  if (!p || !sum) return s.map(() => 0);
  /* Namundad NIDUR: ad lofa meiru en er til er verri villa en afgangur. */
  return s.map(x => Math.floor(p * (x / sum)));
}

const fmtMoney = n => (n || 0).toLocaleString("en-GB");

export default function Leagues({ proxyUrl, entryId }) {
  const [leagues, setLeagues] = useState([]);      // [{id, name, pot, split}]
  const [data, setData] = useState({});            // id -> standings
  const [busy, setBusy] = useState({});
  const [input, setInput] = useState("");
  const [err, setErr] = useState(null);

  /* ---- geymsla ---- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fpl_leagues");
      if (raw) setLeagues(JSON.parse(raw) || []);
    } catch {}
  }, []);
  /* TEKUR BADI GILDI OG UPPFAERSLUFALL. Samhlida sóknir (ein per deild)
     skrifudu adur allar ur SAMA gamla afriti, svo nafn tapadist og
     notanda-breyting i midri sokn var afturkolluð. Med falli les hver
     uppfaersla NYJASTA astandid — og vistun i localStorage fer fram a
     ThVI SEM VARD TIL, ekki a thvi sem kallandinn hélt.                  */
  const save = next => {
    setLeagues(prev => {
      const val = typeof next === "function" ? next(prev) : next;
      try { localStorage.setItem("fpl_leagues", JSON.stringify(val)); } catch {}
      return val;
    });
  };

  /* ---- sækja stöðu ---- */
  const load = async id => {
    if (!proxyUrl) { setErr("Proxy missing — leagues are fetched through it."); return; }
    setBusy(b => ({ ...b, [id]: true })); setErr(null);
    try {
      const r = await fetch(`${proxyUrl}?path=fpl-league&id=${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (j?.error) throw new Error(String(j.error));
      setData(d => ({ ...d, [id]: j }));
      /* Nafnid kemur ur svarinu — notandinn a ekki ad thurfa ad skrifa thad */
      /* FUNKSJONAL UPPFAERSLA — `leagues` UR LOKUNINNI ER UREL.
         `load()` var kallad per deild og hver svarun skrifadi ALLAN listann
         ur sama gamla afriti: med tveimur deildum i einu tapadist nafn
         hinnar, og hafi notandinn breytt potti/skiptingu MEDAN sokn stod
         yfir var su breyting afturkolluð thegjandi. Nu er lesid ur `prev`.  */
      const nm = j?.league?.name;
      if (nm) save(prev => prev.map(l => l.id === id ? { ...l, name: nm } : l));
    } catch (e) {
      setErr(interp("Could not load league {0}: {1}", [id, String(e.message).slice(0, 60)]));
    } finally { setBusy(b => ({ ...b, [id]: false })); }
  };
  /* Saekja allar deildir vid fyrstu hledslu (og thegar nyrri baetist vid) */
  useEffect(() => {
    for (const l of leagues) if (!data[l.id] && !busy[l.id]) load(l.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagues.length, proxyUrl]);

  const add = () => {
    const m = String(input).match(/leagues\/(\d+)|^(\d+)$/);
    const id = m ? (m[1] || m[2]) : null;
    if (!id) { setErr("Enter a league ID or the league's FPL link."); return; }
    if (leagues.some(l => l.id === id)) { setErr("That league is already on the list."); return; }
    save([...leagues, { id, name: null, pot: 0, split: [...DEFAULT_SPLIT] }]);
    setInput(""); setErr(null);
  };
  const remove = id => { save(leagues.filter(l => l.id !== id)); setData(d => { const n = { ...d }; delete n[id]; return n; }); };
  const patch = (id, key, val) => save(leagues.map(l => l.id === id ? { ...l, [key]: val } : l));

  return (
    <section style={S.wrap}>
      <div style={S.head}>
        <h2 style={S.h2}>{"Mini-leagues"}</h2>
        <div style={S.addRow}>
          <input style={S.input} value={input} placeholder={"league ID or link"}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()} />
          <button style={S.btn} onClick={add}>{"Add"}</button>
        </div>
      </div>
      <div style={S.note}>
        {"Where you stand in your leagues. The prize pot is YOUR input — it is stored in your browser and never leaves it."}
      </div>
      {err && <div style={S.err}>{err}</div>}
      {!leagues.length && (
        <div style={S.empty}>
          {"No league added. The ID is in the league URL on fantasy.premierleague.com (…/leagues/"}<b>123456</b>/standings/).
        </div>
      )}

      {leagues.map(l => {
        const d = data[l.id];
        const rows = d?.standings?.results || [];
        const prizes = prizeFor(l.pot, l.split);
        return (
          <div key={l.id} style={S.card}>
            <div style={S.cardHead}>
              <div>
                <div style={S.name}>{l.name || d?.league?.name || `${"League"} ${l.id}`}</div>
                <div style={S.sub}>#{l.id}{rows.length ? ` · ${rows.length} ${"teams"}` : ""}
                  {busy[l.id] ? ` · ${"fetching…"}` : ""}</div>
              </div>
              <div style={S.potBox}>
                <label style={S.potLbl}>{"Pot"}
                  <input style={S.potIn} type="number" min="0" value={l.pot || ""}
                    onChange={e => patch(l.id, "pot", Number(e.target.value) || 0)} />
                </label>
                <label style={S.potLbl}>{"Split %"}
                  <input style={{ ...S.potIn, width:96 }} value={(l.split || []).join("/")}
                    title={"Percent per place, separated by /. Example: 50/30/20"}
                    onChange={e => patch(l.id, "split",
                      e.target.value.split("/").map(x => Number(x.trim()) || 0).filter((_, i) => i < 8))} />
                </label>
                <button style={S.rm} title={"Remove league"} onClick={() => remove(l.id)}>✕</button>
              </div>
            </div>

            {!!l.pot && (
              <div style={S.prizeRow}>
                {prizes.map((amt, i) => (
                  <span key={i} style={S.prize}>
                    <b>{i + 1}.</b> {fmtMoney(amt)}
                  </span>
                ))}
              </div>
            )}

            {rows.length > 0 && (
              /* EIGIN SKRUN-KASSI: breidd efni ma ALDREI ryðja SIDUNNI ut
                 (kafli 8). Toflan hefur fimm dalka og lidsnofn eru frjals
                 texti — a sima getur hun ordid breidari en skjarinn, og tha
                 a HUN ad skruna, ekki skelin.                            */
              <div style={S.tblWrap}>
              <table style={S.tbl}>
                <thead><tr>
                  <th style={S.thN}>#</th>
                  <th style={S.th}>{"Team"}</th>
                  <th style={S.thNum}>{"GW"}</th>
                  <th style={S.thNum}>{"Total"}</th>
                  <th style={S.thNum}>{"Prize"}</th>
                </tr></thead>
                <tbody>
                  {rows.slice(0, 25).map(r => {
                    const mine = entryId && String(r.entry) === String(entryId);
                    const mv = (r.last_rank || 0) - (r.rank || 0);
                    const prize = prizes[r.rank - 1] || 0;
                    return (
                      <tr key={r.entry} style={mine ? S.trMine : undefined}>
                        <td style={S.tdN}>
                          {r.rank}
                          {mv !== 0 && r.last_rank > 0 && (
                            <span style={{ ...S.mv, color: mv > 0 ? C.green : C.red }}>
                              {mv > 0 ? `▲${mv}` : `▼${-mv}`}
                            </span>)}
                        </td>
                        <td style={S.td}>
                          <b>{r.entry_name}</b>
                          <span style={S.mgr}> {r.player_name}</span>
                          {mine && <span style={S.you}>{"you"}</span>}
                        </td>
                        <td style={S.tdNum}>{r.event_total}</td>
                        <td style={{ ...S.tdNum, fontWeight:700 }}>{r.total}</td>
                        <td style={{ ...S.tdNum, color: prize ? C.gold : C.text3, fontWeight: prize ? 700 : 400 }}>
                          {prize ? fmtMoney(prize) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}
            {d && !rows.length && !busy[l.id] && (
              <div style={S.empty}>{"No standings yet — the league starts counting at the first gameweek."}</div>
            )}
          </div>
        );
      })}
    </section>
  );
}

const S = {
  wrap:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginTop:14 },
  head:{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" },
  h2:{ margin:0, fontSize:15, color:C.purple },
  addRow:{ display:"flex", gap:6 },
  input:{ border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 8px", fontSize:12, width:190 },
  btn:{ background:C.purple, color:"#fff", border:"none", borderRadius:6, padding:"5px 12px",
        fontSize:12, fontWeight:700, cursor:"pointer" },
  note:{ fontSize:11.5, color:C.text2, marginTop:6, lineHeight:1.45 },
  err:{ marginTop:8, background:"#fdeaea", color:"#8a1f1f", border:"1px solid #f3c2c2",
        borderRadius:6, padding:"6px 9px", fontSize:11.5 },
  empty:{ fontSize:12, color:C.text3, padding:"10px 2px" },
  card:{ border:`1px solid ${C.border}`, borderRadius:8, marginTop:12, overflow:"hidden" },
  cardHead:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
             gap:10, padding:"9px 11px", background:C.cardAlt, flexWrap:"wrap" },
  name:{ fontSize:13.5, fontWeight:700, color:C.text },
  sub:{ fontSize:11, color:C.text3, fontFamily:mono },
  potBox:{ display:"flex", gap:8, alignItems:"center" },
  potLbl:{ fontSize:10.5, color:C.text2, display:"flex", flexDirection:"column", gap:2 },
  potIn:{ border:`1px solid ${C.border}`, borderRadius:5, padding:"3px 6px", fontSize:12,
          width:80, fontFamily:mono },
  rm:{ border:"none", background:"transparent", color:C.text3, cursor:"pointer", fontSize:13, padding:4 },
  prizeRow:{ display:"flex", gap:10, padding:"7px 11px", borderTop:`1px solid ${C.border}`,
             background:"#fffdf5", flexWrap:"wrap" },
  prize:{ fontSize:12, fontFamily:mono, color:C.gold },
  tblWrap:{ overflowX:"auto", WebkitOverflowScrolling:"touch" },
  tbl:{ width:"100%", borderCollapse:"collapse", minWidth:340 },
  th:{ textAlign:"left", fontSize:10.5, color:C.text3, padding:"6px 8px", borderTop:`1px solid ${C.border}` },
  thN:{ textAlign:"right", fontSize:10.5, color:C.text3, padding:"6px 6px", width:52, borderTop:`1px solid ${C.border}` },
  thNum:{ textAlign:"right", fontSize:10.5, color:C.text3, padding:"6px 8px", borderTop:`1px solid ${C.border}` },
  td:{ padding:"5px 8px", fontSize:12, borderTop:`1px solid #f2f2f5` },
  tdN:{ padding:"5px 6px", fontSize:12, fontFamily:mono, textAlign:"right", borderTop:`1px solid #f2f2f5`, whiteSpace:"nowrap" },
  tdNum:{ padding:"5px 8px", fontSize:12, fontFamily:mono, textAlign:"right", borderTop:`1px solid #f2f2f5` },
  trMine:{ background:"#eefaf3" },
  mgr:{ color:C.text3, fontSize:11 },
  you:{ marginLeft:6, fontSize:9.5, background:C.green, color:"#fff", borderRadius:3, padding:"0 4px" },
  mv:{ fontSize:9, marginLeft:3 },
};
