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
import { interp } from "./interp.js";
import { PenaltyIcon, FreeKickIcon, CornerIcon } from "./Icons.jsx";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const POS = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };
const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };

/* Merkin sem lika birtast a leikmannaspjoldum — eitt satt um taknin.

   TEIKNUD IKON, EKKI TAKN (8.8.2026). Sagan er skjalfest her fyrir nedan af
   thvi ad hun er lærdomurinn: taknin ⚽ / ◎ / ⌾ voru OGREINANLEG i 13px
   (thau tvo sidari eru naer eins hringir), svo 31.7. var theim skipt ut
   fyrir BOKSTAF med lit (P/F/C). Bokstafurinn er laesilegur en merkingar-
   laus — madur les "C" og verdur ad VITA ad thad se corner.
   Nu eru thad SVG-ikon (src/Icons.jsx) sem eru byggd a thremur olikum
   SILHUETTUM, thvi i smarri staerd er silhuettan allt. `short` heldur ser
   sem texta-fallback (aria/title og prof).                              */
export const SP_KINDS = [
  { key:"pen", field:"penalties_order",                      Icon:PenaltyIcon,  tint:"#b3261e", label: "Penalties",  short:"P" },
  { key:"fk",  field:"direct_freekicks_order",               Icon:FreeKickIcon, tint:"#1b5e9c", label: "Free kicks", short:"F" },
  { key:"ck",  field:"corners_and_indirect_freekicks_order", Icon:CornerIcon,   tint:"#0a7a4a", label: "Corners",    short:"C" },
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

/* HVERSU MARGAR TEGUNDIR TEKUR HANN FYRSTUR?
   Sa sem tekur BAEDI viti og horn er annad slag i fantasy en sa sem
   tekur adeins horn: hann er a fleiri en einni leid ad stigum og missir
   thaer ekki allar thott ein hverfi. Thess vegna er hann FEITLETRADUR i
   lida-spjaldinu — talan var THEGAR a skjanum (thrjar linur) en hun var
   ekki LAESILEG fyrr en hun var merkt.

   Talid a RODUN INNAN LIDS (rank === 1), ekki a FPL-tolunni: horn na
   aldrei 1 (sja ofar), svo `order === 1` hefdi talid hornin ur.        */
function setPieceCount(p, ranks) {
  const list = ranks?.get?.(p?.id);
  if (!list) return 0;
  return list.filter(b => b.rank === 1).length;
}

/* Ikon-rod fyrir eitt spjald. `ranks` ur setPieceRanks; an hennar er
   ekkert birt — betra en ad birta rangt (sbr. hornin ofar).            */
export function setPieceBadges(p, ranks, { maxRank = 2 } = {}) {
  const list = ranks?.get?.(p?.id);
  if (!list) return null;
  const out = list.filter(b => b.rank <= maxRank);
  return out.length ? out : null;
}

/* HVER OGNAR UR FOSTUM LEIKATRIDUM — hin helmingurinn af spurningunni.
   Flipinn hefur svarad "hver TEKUR hornid" en ekki "hver kemst a endann
   a thvi", og fyrir fantasy er sidari spurningin oftar peningana virdi:
   hornatakarinn skorar ekki, midverdirnir gera thad.
   Talan er `sp_xg` ur bsd_players.json — xG UR FOSTUM LEIKATRIDUM eingongu
   (horn, aukaspyrnur, fost innkost), MAELT: 31,2% allra skota koma thadan.
   ThRoSKULDUR 1,0: undir thvi er rodun hrein tilviljun a einu timabili.  */
const SP_XG_MIN = 1.0;
function threatByTeam(bsd) {
  const best = {};
  for (const p of (bsd?.players || [])) {
    if (!p.team || !(p.sp_xg >= SP_XG_MIN)) continue;
    const cur = best[p.team];
    if (!cur || p.sp_xg > cur.sp_xg) best[p.team] = p;
  }
  return best;
}

export default function SetPieces({ players, teams, teamById, Crest, notes, onPickPlayer, bsd }) {
  /* Lyklad a FPL-skammstofun eins og lidin sjalf. AÐEINS 2025/26 — BSD
     hefur engin eldri skotakort, svo nyliðar fa EKKERT (ekki null-tolu). */
  const threat = useMemo(() => threatByTeam(bsd), [bsd]);
  const byId = useMemo(() => {
    const m = new Map();
    for (const p of players || []) m.set(p.id, p);
    return m;
  }, [players]);

  /* EITT SPJALD PER LID, ENGIR UNDIRFLIPAR (31.7.2026).
     Adur voru thrir flipar (viti / aukaspyrnur / horn) og notandinn thurfti
     ad fletta THRISVAR gegnum 20 lid til ad sja eitt lid. Spurningin sem
     spjaldid svarar er "hver tekur hvad hja THESSU lidi", svo lidid er
     rettur rammi og tegundin er IKON innan hans.
     ADEINS FYRSTI TAKI: rodun 2-5 skiptir ekki mali fyrir fantasy-val og
     hun tvofaldadi haedina a hverju spjaldi.                             */
  const ranks = useMemo(() => setPieceRanks(players), [players]);
  /* Reiknad EINU SINNI fyrir alla, ekki per rod: annars vaeri thetta
     20 lid x 3 tegundir uppflettingar i hverri teiknun.                */
  const multi = useMemo(() => {
    const m = new Map();
    for (const p of players || []) {
      const n = setPieceCount(p, ranks);
      if (n > 1) m.set(p.id, n);
    }
    return m;
  }, [players, ranks]);

  const primary = useMemo(() => {
    const m = {};                       // teamId -> { pen, fk, ck }
    for (const p of players || []) {
      for (const b of (ranks.get(p.id) || [])) {
        if (b.rank !== 1) continue;
        (m[p.team] ||= {})[b.key] = { p, order: b.order };
      }
    }
    return m;
  }, [players, ranks]);

  /* Thekja per tegund — birt svo tomur reitur lesist sem "FPL hefur ekki
     skrad", ekki sem "tolan er ekki til hja okkur".                      */
  const cover = useMemo(() => {
    const c = {};
    for (const k of SP_KINDS) c[k.key] = Object.values(primary).filter(e => e[k.key]).length;
    return c;
  }, [primary]);

  const sorted = (teams || []).slice().sort((a, b) => String(a.short).localeCompare(String(b.short)));
  const nTeams = teams?.length ?? 0;

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <h2 style={S.h2}>{"Set pieces"}</h2>
          <div style={S.sub}>
            {"First taker for each team — from FPL, updates automatically with the daily data fetch."}
            {notes?.last_updated && interp(" Updated {0}.", [String(notes.last_updated).slice(0, 10)])}
          </div>
        </div>
        <div style={S.keyRow}>
          {SP_KINDS.map(k => (
            <span key={k.key} style={S.keyItem} title={`${k.label} — ${cover[k.key] ?? 0}/${nTeams} ${"teams"}`}>
              <k.Icon size={15} color={k.tint} title={k.label} />{k.label}
              <span style={S.keyN}>{cover[k.key] ?? 0}/{nTeams}</span>
            </span>
          ))}
        </div>
      </div>

      <div style={S.note}>
        <b>{"Captains (the armband) are not here."}</b> {"Neither the FPL API nor the ESPN feed says who wears the armband, so we do not show it rather than guess. What is"}
        <i> {"measured"}</i> {"— and matters most for fantasy — is the set-piece order: the no. 1 penalty taker is the strongest single captaincy hint the data holds."}
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
                    <span style={{ ...S.icon, color:k.tint }} title={k.label}>
                      <k.Icon size={15} title={k.label} />
                    </span>
                    {!hit ? (
                      <span style={S.none} title={"FPL has no order recorded for this team"}>—</span>
                    ) : (
                      <button style={S.pick} onClick={() => onPickPlayer && onPickPlayer(hit.p.id)}
                        title={`${hit.p.web_name} — ${k.label}, ${"FPL order"} ${hit.order}`
                          + (multi.has(hit.p.id) ? ` · first taker for ${multi.get(hit.p.id)} set-piece types` : "")}>
                        <span style={{ ...S.nm, ...(multi.has(hit.p.id) ? S.nmMulti : null) }}>
                          {hit.p.web_name}
                        </span>
                        <span style={{ ...S.pos, color: POS_COLOR[hit.p.element_type] }}>
                          {POS[hit.p.element_type]}
                        </span>
                        <span style={S.cost}>£{((hit.p.now_cost ?? 0) / 10).toFixed(1)}</span>
                      </button>
                    )}
                  </div>
                );
              })}
              {/* HVER OGNAR — birtist adeins thegar talan er raunveruleg.
                  Tomur reitur vaeri verri en enginn: hann laesist eins og
                  "enginn ognar", en thydir "engin skotakort" (nyliðar).  */}
              {(() => {
                const th = threat[t.short];
                if (!th) return null;
                const fp = th.fpl_id != null ? byId.get(th.fpl_id) : null;
                const share = th.sp_xg_share != null ? Math.round(th.sp_xg_share * 100) : null;
                return (
                  <div style={S.threat}
                    title={`${th.name} had the most set-piece xG at ${t.short} in 2025/26: `
                         + `${th.sp_xg.toFixed(2)} xG from corners, free kicks and set-piece throws`
                         + (share != null ? `, which is ${share}% of all his xG` : "")
                         + `. Last season's shot map — it says who threatened, not who will.`}>
                    <span style={S.threatK}>{"aerial threat"}</span>
                    {fp && onPickPlayer ? (
                      <button style={S.threatBtn} onClick={() => onPickPlayer(fp.id)}>
                        {fp.web_name}
                      </button>
                    ) : (
                      <span style={S.threatNm}>{th.name}</span>
                    )}
                    <span style={S.threatV}>{th.sp_xg.toFixed(1)}{" xG"}</span>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      <div style={S.legend}>
        {"The icons:"}{" "}
        <span style={S.legIcon}><PenaltyIcon size={13} color="#b3261e" title="Penalties" /> {"penalties"}</span> ·{" "}
        <span style={S.legIcon}><FreeKickIcon size={13} color="#1b5e9c" title="Free kicks" /> {"free kicks"}</span> ·{" "}
        <span style={S.legIcon}><CornerIcon size={13} color="#0a7a4a" title="Corners" /> {"corners"}</span>.
        {" "}<b>{"\"First taker\" is the team's LOWEST FPL order, not the number 1."}</b>{" "}
        {"Measured on real data: penalties and free kicks are numbered 1–5, but corners"}
        {" "}<b>{"4–10 and never reach 1"}</b>{" "}
        {"— FPL uses a different base there. An older version required the number 1 and so never showed a corner taker."}
        {" "}{"The order is hand-entered by FPL and can be stale early in the season — verify against recent matches before basing a captaincy pick on it."}
      </div>
    </section>
  );
}

const S = {
  keyRow:{ display:"flex", gap:9, flexWrap:"wrap", alignItems:"center" },
  keyItem:{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.text2 },
  /* "Hver ognar" — adskilid fra takara-linunum med haarfinni linu svo
     thad lesist sem ONNUR spurning, ekki fjorda tegundin af fostu
     leikatridi.                                                        */
  threat: { display:"flex", alignItems:"center", gap:6, marginTop:6, paddingTop:6,
            borderTop:"1px dashed #e3e3e8", fontSize:11 },
  threatK: { color:"#8b8b95", textTransform:"uppercase", letterSpacing:.3, fontSize:9.5 },
  threatBtn: { border:0, background:"none", padding:0, cursor:"pointer", font:"inherit",
               fontWeight:600, color:"#1d1d20", textAlign:"left" },
  threatNm: { fontWeight:600 },
  threatV: { marginLeft:"auto", fontVariantNumeric:"tabular-nums", color:"#0a7a4a", fontWeight:600 },
  legIcon:{ display:"inline-flex", alignItems:"center", gap:3, verticalAlign:"middle" },
  keyN:{ fontFamily:mono, fontSize:10, color:C.text3 },
  line:{ display:"flex", alignItems:"center", gap:6, padding:"2px 0",
         borderTop:`1px solid #f4f4f6` },
  /* RAMMINN VAR TEKINN AF: hann var thar til ad gera BOKSTAFINN ad merki.
     Teiknad ikon er thegar merki, og kassi utan um thad aetir 2 px af 15 og
     kepptir vid silhuettuna sem er allt sem madur les i thessari staerd.  */
  icon:{ display:"flex", alignItems:"center", justifyContent:"center",
         width:16, flexShrink:0 },
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
  /* FEITLETRAD = tekur FLEIRI EN EINA tegund. Adeins thyngd, enginn nyr
     litur: litirnir i spjaldinu bera THEGAR merkingu (raudur = viti, blar
     = aukaspyrna, graenn = horn) og fjordi liturinn hefdi keppt vid tha i
     stad thess ad baeta vid.                                            */
  nmMulti:{ fontWeight:800, color:C.text },
  pos:{ fontSize:8.5, fontWeight:700 },
  cost:{ fontSize:10, fontFamily:mono, color:C.text2 },
  legend:{ fontSize:10.5, color:C.text3, marginTop:10, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.5 },
};
