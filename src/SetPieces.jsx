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
import { t as tx } from "./i18n.js";
import { useLang } from "./useLang.js";

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
  /* SHORT-BOKSTAFUR OG LITUR I STAD TAKNS I LISTANUM (31.7.2026).
     ⚽ / ◎ / ⌾ eru OGREINANLEG i raunstaerd — thau tvo sidari eru naer eins
     hringir i 13px, svo madur sem tekur allar thrjar las eins og tvitekning.
     Taknid heldur ser thar sem LABEL fylgir (tegunda-valid), en i listanum
     — thar sem taknid stendur EITT — kemur bokstafur med sinum lit.       */
  { key:"pen", field:"penalties_order",                       icon:"⚽", tint:"#b3261e", get label() { return tx("Víti"); },        short:"P" },
  { key:"fk",  field:"direct_freekicks_order",                icon:"◎", tint:"#1b5e9c", get label() { return tx("Aukaspyrnur"); }, short:"F" },
  { key:"ck",  field:"corners_and_indirect_freekicks_order",  icon:"⌾", tint:"#0a7a4a", get label() { return tx("Horn"); },        short:"C" },
];

/* ============================================================
   ROD INNAN LIDS — "FYRSTI TAKI" ER LAEGSTA RODUN LIDSINS, EKKI order===1

   MAELT 31.7.2026 a raungognum (data/players.json, 20 lid):
     penalties_order                        1-5   (1 hja 20/20 lidum)
     direct_freekicks_order                 1-5   (1 hja 20/20 lidum)
     corners_and_indirect_freekicks_order   4-10  (1 hja  0/20 lidum!)
   FPL notar ANNAN GRUNN fyrir horn. Daemi (Arsenal): Rice=5, Saka=6,
   Madueke=7, Odegaard=8 — Rice ER hornataki lidsins thott talan se 5.

   TVAER LIFANDI VILLUR SEM THETTA LEIDRETTIR:
     1. "adeins fyrsti taki" (order === 1) syndi EKKERT fyrir horn.
     2. setPieceBadges notadi `order <= 3`, svo HORNATAKAR FENGU ALDREI
        IKON a leikmannaspjaldi — Saka bar ekkert hornamerki.
   Bædi voru thogul: talan var til, hun var bara aldrei <= 3.

   Lausnin er ROD INNAN LIDS: rank 1 = sa sem tekur thau, hvad sem
   FPL-talan er. Thad er rett fyrir ALLAR THRJAR tegundir (fyrir viti og
   aukaspyrnur er laegsta talan 1 hvort sem er) og tholir ad FPL breyti
   grunninum.
   ============================================================ */
export function setPieceRanks(players) {
  const byId = new Map();
  for (const k of SP_KINDS) {
    const byTeam = new Map();
    for (const p of players || []) {
      const o = p?.[k.field];
      if (o == null) continue;
      if (!byTeam.has(p.team)) byTeam.set(p.team, []);
      byTeam.get(p.team).push({ p, order: o });
    }
    for (const list of byTeam.values()) {
      list.sort((a, b) => a.order - b.order);
      list.forEach((e, i) => {
        if (!byId.has(e.p.id)) byId.set(e.p.id, []);
        byId.get(e.p.id).push({ ...k, order: e.order, rank: i + 1 });
      });
    }
  }
  return byId;
}

/* Ikon-rod fyrir eitt spjald. `ranks` ur setPieceRanks; an hennar er
   ekkert birt — betra en ad birta rangt (sbr. hornin ofar).            */
export function setPieceBadges(p, ranks, { maxRank = 2 } = {}) {
  const list = ranks?.get?.(p?.id);
  if (!list) return null;
  const out = list.filter(b => b.rank <= maxRank);
  return out.length ? out : null;
}

export default function SetPieces({ players, teams, teamById, Crest, notes, onPickPlayer }) {
  const lang = useLang();   /* tungumal i dep-listum, sja useLang.js */

  /* EITT SPJALD PER LID, ENGIR UNDIRFLIPAR (31.7.2026).
     Adur voru thrir flipar (viti / aukaspyrnur / horn) og notandinn thurfti
     ad fletta THRISVAR gegnum 20 lid til ad sja eitt lid. Spurningin sem
     spjaldid svarar er "hver tekur hvad hja THESSU lidi", svo lidid er
     rettur rammi og tegundin er IKON innan hans.
     ADEINS FYRSTI TAKI: rodun 2-5 skiptir ekki mali fyrir fantasy-val og
     hun tvofaldadi haedina a hverju spjaldi.                             */
  const ranks = useMemo(() => setPieceRanks(players), [players, lang]);

  const primary = useMemo(() => {
    const m = {};                       // teamId -> { pen, fk, ck }
    for (const p of players || []) {
      for (const b of (ranks.get(p.id) || [])) {
        if (b.rank !== 1) continue;
        (m[p.team] ||= {})[b.key] = { p, order: b.order };
      }
    }
    return m;
  }, [players, ranks, lang]);

  /* Thekja per tegund — birt svo tomur reitur lesist sem "FPL hefur ekki
     skrad", ekki sem "tolan er ekki til hja okkur".                      */
  const cover = useMemo(() => {
    const c = {};
    for (const k of SP_KINDS) c[k.key] = Object.values(primary).filter(e => e[k.key]).length;
    return c;
  }, [primary, lang]);

  const sorted = (teams || []).slice().sort((a, b) => String(a.short).localeCompare(String(b.short)));
  const nTeams = teams?.length ?? 0;

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <h2 style={S.h2}>{tx("Föst leikatriði")}</h2>
          <div style={S.sub}>
            {tx("Fyrsti taki hjá hverju liði — úr FPL, uppfærist sjálfkrafa með daglegu gagnasækninni.")}
            {notes?.last_updated && tx(" Uppfært {0}.", [String(notes.last_updated).slice(0, 10)])}
          </div>
        </div>
        <div style={S.keyRow}>
          {SP_KINDS.map(k => (
            <span key={k.key} style={S.keyItem} title={`${k.label} — ${cover[k.key] ?? 0}/${nTeams} ${tx("lið")}`}>
              <span style={S.keyIcon}>{k.icon}</span>{k.label}
              <span style={S.keyN}>{cover[k.key] ?? 0}/{nTeams}</span>
            </span>
          ))}
        </div>
      </div>

      <div style={S.note}>
        <b>{tx("Fyrirliðar (armbandið) eru ekki hér.")}</b> {tx("Hvorki FPL-API-ið né ESPN-fæðið gefur hver ber fyrirliðabandið, svo við sýnum það ekki frekar en að giska. Það sem er")}
        <i> {tx("mælt")}</i> {tx("— og skiptir mestu fyrir fantasy — er spyrnu-röðunin: víta­skytta nr. 1 er sterkasta einstaka fyrirliða-vísbendingin sem gögnin geyma.")}
      </div>

      <div style={S.grid}>
        {sorted.map(t => {
          const e = primary[t.id] || {};
          return (
            <div key={t.id} style={S.tCard}>
              <div style={S.tHead}>
                {Crest ? <Crest team={t} size={15} /> : null}
                <b>{t.short}</b>
                <span style={S.tName}>{t.name}</span>
              </div>
              {SP_KINDS.map(k => {
                const hit = e[k.key];
                return (
                  <div key={k.key} style={S.line}>
                    <span style={{ ...S.icon, color:k.tint, borderColor:k.tint }}
                      title={k.label} aria-label={k.label}>{k.short}</span>
                    {!hit ? (
                      <span style={S.none} title={tx("FPL hefur ekki skráð röðun fyrir þetta lið")}>—</span>
                    ) : (
                      <button style={S.pick} onClick={() => onPickPlayer && onPickPlayer(hit.p.id)}
                        title={`${hit.p.web_name} — ${k.label}, ${tx("FPL-röðun")} ${hit.order}`}>
                        <span style={S.nm}>{hit.p.web_name}</span>
                        <span style={{ ...S.pos, color: POS_COLOR[hit.p.element_type] }}>
                          {POS[hit.p.element_type]}
                        </span>
                        <span style={S.cost}>£{((hit.p.now_cost ?? 0) / 10).toFixed(1)}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={S.legend}>
        {tx("Táknin:")} <b>⚽</b> {tx("víti")} · <b>◎</b> {tx("aukaspyrnur")} · <b>⌾</b> {tx("horn")}.
        {" "}<b>{tx("„Fyrsti taki\" er lægsta FPL-röðun liðsins, ekki talan 1.")}</b>{" "}
        {tx("Mælt á raungögnum: víti og aukaspyrnur eru númeruð 1–5, en horn")}
        {" "}<b>{tx("4–10 og ná aldrei 1")}</b>{" "}
        {tx("— FPL notar annan grunn þar. Eldri útgáfa krafðist talsins 1 og sýndi því aldrei hornataka.")}
        {" "}{tx("Röðunin er handskráð hjá FPL og getur verið úrelt snemma tímabils — sannreyndu gegn síðustu leikjum áður en þú byggir fyrirliða-val á henni.")}
      </div>
    </section>
  );
}

const S = {
  keyRow:{ display:"flex", gap:9, flexWrap:"wrap", alignItems:"center" },
  keyItem:{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.text2 },
  keyIcon:{ fontSize:13 },
  keyN:{ fontFamily:mono, fontSize:10, color:C.text3 },
  line:{ display:"flex", alignItems:"center", gap:6, padding:"2px 0",
         borderTop:`1px solid #f4f4f6` },
  icon:{ fontSize:9.5, fontWeight:800, width:15, textAlign:"center", flexShrink:0,
    border:"1px solid", borderRadius:3, lineHeight:1.5 },
  pick:{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:6,
         background:"transparent", border:"none", cursor:"pointer",
         padding:"2px 0", textAlign:"left", font:"inherit" },
  none:{ flex:1, fontSize:11, color:C.text3 },
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 },
  head:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  sub:{ fontSize:11.5, color:C.text2, marginTop:3 },
  note:{ fontSize:11.5, color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`,
         borderRadius:6, padding:"7px 9px", margin:"10px 0 8px", lineHeight:1.55 },
  grid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:8 },
  tCard:{ border:`1px solid ${C.border}`, borderRadius:8, background:C.cardAlt, padding:"7px 9px" },
  tHead:{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:C.text,
          paddingBottom:5, marginBottom:4, borderBottom:`1px solid ${C.border}` },
  tName:{ fontSize:9.5, color:C.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  nm:{ flex:1, minWidth:0, fontSize:11.5, color:C.text, overflow:"hidden",
       textOverflow:"ellipsis", whiteSpace:"nowrap" },
  pos:{ fontSize:8.5, fontWeight:700 },
  cost:{ fontSize:10, fontFamily:mono, color:C.text2 },
  legend:{ fontSize:10.5, color:C.text3, marginTop:10, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.5 },
};
