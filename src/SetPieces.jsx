/* ============================================================
   SETPIECES.JSX — flipinn "Föst leikatriði"

   HEIMILD: FPL-bootstrap gefur THRJAR rodunartolur per leikmann —
     penalties_order                        vitaskyttu-rod
     direct_freekicks_order                 aukaspyrnu-rod (bein)
     corners_and_indirect_freekicks_order   horn og obeinar

   Thetta eru RODUNARTOLUR (1 = fyrsti), ekki likur. FPL setur thaer
   handvirkt og their geta verid ureltar snemma timabils — thess vegna
   fylgir dagsetning `set_piece_notes.json` med.

   FYRIRLIDAR (armbandid) ERU EKKI HER OG THAD ER EKKI GLEYMSKA:
   hvorki FPL-API-ið ne ESPN-fædid gefa hver ber fyrirlidabandid.
   Vid birtum thad sem ER maelt (spyrnu-rodun) og segjum fra hinu.
   ============================================================ */

import React, { useMemo, useState } from "react";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const POS = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };
const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };

/* Merkin sem lika birtast a leikmannaspjoldum — eitt satt um taknin. */
export const SP_KINDS = [
  { key:"pen", field:"penalties_order",                       icon:"⚽", label:"Víti",        short:"P" },
  { key:"fk",  field:"direct_freekicks_order",                icon:"◎", label:"Aukaspyrnur", short:"F" },
  { key:"ck",  field:"corners_and_indirect_freekicks_order",  icon:"⌾", label:"Horn",        short:"C" },
];

/* Ikon-rod fyrir eitt spjald. Skilar null ef leikmadurinn tekur ekkert. */
export function setPieceBadges(p, { max = 3 } = {}) {
  const out = [];
  for (const k of SP_KINDS) {
    const o = p?.[k.field];
    if (o != null && o <= max) out.push({ ...k, order: o });
  }
  return out.length ? out : null;
}

export default function SetPieces({ players, teams, teamById, Crest, notes, onPickPlayer }) {
  const [kind, setKind] = useState("pen");
  const [onlyFirst, setOnlyFirst] = useState(false);
  const def = SP_KINDS.find(k => k.key === kind);

  const byTeam = useMemo(() => {
    const m = {};
    for (const p of players || []) {
      const o = p[def.field];
      if (o == null) continue;
      if (onlyFirst && o !== 1) continue;
      (m[p.team] ||= []).push({ p, order: o });
    }
    Object.values(m).forEach(l => l.sort((a, b) => a.order - b.order));
    return m;
  }, [players, def, onlyFirst]);

  const covered = Object.keys(byTeam).length;
  const sorted = (teams || []).slice().sort((a, b) => String(a.short).localeCompare(String(b.short)));

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <h2 style={S.h2}>Föst leikatriði</h2>
          <div style={S.sub}>
            Röðun úr FPL — hver tekur víti, aukaspyrnur og horn.
            {notes?.last_updated && ` Uppfært ${String(notes.last_updated).slice(0, 10)}.`}
          </div>
        </div>
        <div style={S.tabs}>
          {SP_KINDS.map(k => (
            <button key={k.key} style={{ ...S.tabBtn, ...(kind === k.key ? S.tabOn : {}) }}
              onClick={() => setKind(k.key)}>{k.icon} {k.label}</button>
          ))}
        </div>
      </div>

      <div style={S.note}>
        <b>Fyrirliðar (armbandið) eru ekki hér.</b> Hvorki FPL-API-ið né ESPN-fæðið gefur
        hver ber fyrirliðabandið, svo við sýnum það ekki frekar en að giska. Það sem er
        <i> mælt</i> — og skiptir mestu fyrir fantasy — er spyrnu-röðunin hér að neðan:
        víta­skytta nr. 1 er sterkasta einstaka fyrirliða-vísbendingin sem gögnin geyma.
      </div>

      <div style={S.filters}>
        <label style={S.check}>
          <input type="checkbox" checked={onlyFirst} onChange={e => setOnlyFirst(e.target.checked)} />
          aðeins fyrsti taki
        </label>
        <span style={S.muted}>{covered} af {teams?.length ?? 0} liðum með skráða röðun</span>
      </div>

      <div style={S.grid}>
        {sorted.map(t => {
          const list = byTeam[t.id] || [];
          return (
            <div key={t.id} style={S.tCard}>
              <div style={S.tHead}>
                {Crest ? <Crest team={t} size={15} /> : null}
                <b>{t.short}</b>
                <span style={S.tName}>{t.name}</span>
              </div>
              {!list.length ? (
                <div style={S.empty}>Engin röðun skráð</div>
              ) : list.map(({ p, order }) => (
                <button key={p.id} style={S.row} onClick={() => onPickPlayer && onPickPlayer(p.id)}>
                  <span style={{ ...S.ord, ...(order === 1 ? S.ordFirst : {}) }}>{order}</span>
                  <span style={S.nm}>{p.web_name}</span>
                  <span style={{ ...S.pos, color: POS_COLOR[p.element_type] }}>{POS[p.element_type]}</span>
                  <span style={S.cost}>£{((p.now_cost ?? 0) / 10).toFixed(1)}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div style={S.legend}>
        <b>1</b> = fyrsti taki. Röðunin er handskráð hjá FPL og getur verið úrelt snemma
        tímabils — sannreyndu gegn síðustu leikjum áður en þú byggir fyrirliða-val á henni.
      </div>
    </section>
  );
}

const S = {
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 },
  head:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  sub:{ fontSize:11.5, color:C.text2, marginTop:3 },
  tabs:{ display:"flex", gap:4, flexWrap:"wrap" },
  tabBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:6,
           padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer" },
  tabOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  note:{ fontSize:11.5, color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`,
         borderRadius:6, padding:"7px 9px", margin:"10px 0 8px", lineHeight:1.55 },
  filters:{ display:"flex", alignItems:"center", gap:12, marginBottom:8, flexWrap:"wrap" },
  check:{ display:"flex", alignItems:"center", gap:4, fontSize:11.5, color:C.text2, cursor:"pointer" },
  muted:{ fontSize:11, color:C.text3 },
  grid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:8 },
  tCard:{ border:`1px solid ${C.border}`, borderRadius:8, background:C.cardAlt, padding:"7px 9px" },
  tHead:{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:C.text,
          paddingBottom:5, marginBottom:4, borderBottom:`1px solid ${C.border}` },
  tName:{ fontSize:9.5, color:C.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  row:{ display:"flex", alignItems:"center", gap:6, width:"100%", border:"none",
        background:"transparent", cursor:"pointer", padding:"2px 0", textAlign:"left" },
  ord:{ fontSize:9.5, fontFamily:mono, color:C.text3, width:14, flex:"0 0 14px" },
  ordFirst:{ color:"#fff", background:C.purple, borderRadius:3, textAlign:"center", fontWeight:700 },
  nm:{ flex:1, minWidth:0, fontSize:11.5, color:C.text, overflow:"hidden",
       textOverflow:"ellipsis", whiteSpace:"nowrap" },
  pos:{ fontSize:8.5, fontWeight:700 },
  cost:{ fontSize:10, fontFamily:mono, color:C.text2 },
  empty:{ fontSize:10.5, color:C.text3, padding:"3px 0" },
  legend:{ fontSize:10.5, color:C.text3, marginTop:10, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.5 },
};
