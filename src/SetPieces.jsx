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
   hvorki FPL-API-ið ne ESPN-fædid gefa hver ber fyrirlidabandid. Vid
   birtum thad sem ER maelt (spyrnu-rodun) og latum hitt vera.

   OG SPYRNU-RODUN ER EKKI FYRIRLIDA-SKAMMLEID — MAELT OG HAFNAD.
   Flipinn bar thessa malsgrein A SKJANUM til 20.8.2026; hun var fjarlaegd
   (tolur, ekki ritgerdir) og MAELINGIN VERDUR THVI AD LIFA HER, i
   athugasemd, thvi hun er roksemd og roksemdir eru a islensku:
   vitaskyttu-yfirlag `(1 + w * takari)` ofan a MAELDA fyrirlida-rodun
   maelist NEIKVAETT vid ALLAR thrjar vogtolurnar sem voru profadar —
     w=0,10: -0,081 [-0,322 ; +0,121]
     w=0,25: -0,300 [-0,713 ; +0,052]
     w=0,50: -0,331 [-0,845 ; +0,213]
   og EKKERT vikmark utilokar null. Yfirlagid er thvi EKKI i skorinu.
   Tolurnar bua i `CAPTAIN_MEASURED.terms.penalties*` (`src/captain.js`)
   og `tests/captain.mjs` ENDURREIKNAR thaer ur `data/fpl_player_gw.json`,
   svo thaer geta ekki stadnad thegjandi. Sja lika CLAUDE.md kafla 4.

   BINDANDI TAKMORKUN SEM VERDUR AD FYLGJA TOLUNNI: committud saga ber
   ENGA `penalties_order`, svo eina lekalausa audkenningin sem gognin
   leyfa er "missti viti i fyrri umferd" — 59 leikmenn, 4.218 af 126.730
   rodum. Retta setningin er thess vegna ad yfirlagid maeldist EKKI hjalpa
   a theim takarahopi sem haegt er ad audkenna lekalaust, EKKI ad
   vitaspyrnur skipti ekki mali.

   ADUR STOD HER (fjarlaegt 18.8.2026): "the no. 1 penalty taker is the
   strongest single captaincy hint the data holds" — OMAELD fullyrding,
   skaletrud beint a eftir ordinu `measured`. Sama setning var tekin ur
   `stats.js` 17.8.2026 og hun lifdi hér; nu er hun maeld OG felld.
   ============================================================ */

import { useMemo } from "react";
/* Litapallettan er EIN og byr i appStyles.js — stadbundna afritid var
   hlutmengi hennar med somu gildum (sannreynt 10.9.2026).             */
import { C } from "./appStyles.js";
import { interp } from "./interp.js";
import { PenaltyIcon, FreeKickIcon, CornerIcon } from "./Icons.jsx";
import { SP_KINDS as SP_KINDS_BASE, setPieceRanks as ranksBase, spRanges as rangesBase,
         setPieceBadges, setPieceCount } from "./setpieces.js";
import { POS_LABEL as POS, POS_COLOR, fmtPrice } from "./stats.js";

const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

/* Merkin sem lika birtast a leikmannaspjoldum — eitt satt um taknin.

   TEIKNUD IKON, EKKI TAKN (8.8.2026). Sagan er skjalfest her fyrir nedan af
   thvi ad hun er lærdomurinn: taknin ⚽ / ◎ / ⌾ voru OGREINANLEG i 13px
   (thau tvo sidari eru naer eins hringir), svo 31.7. var theim skipt ut
   fyrir BOKSTAF med lit (P/F/C). Bokstafurinn er laesilegur en merkingar-
   laus — madur les "C" og verdur ad VITA ad thad se corner.
   Nu eru thad SVG-ikon (src/Icons.jsx) sem eru byggd a thremur olikum
   SILHUETTUM, thvi i smarri staerd er silhuettan allt. `short` heldur ser
   sem texta-fallback (aria/title og prof).                              */
/* Ikonin eru vidmot og bua her; rokfraedin (rodun, svid, merki) er i
   src/setpieces.js. `SP_KINDS` her er SAMA rodin med `Icon` baett vid,
   svo allir sem lesa `k.Icon` (flipinn, spjoldin) halda ser.           */
const ICON = { pen: PenaltyIcon, fk: FreeKickIcon, ck: CornerIcon };
export const SP_KINDS = SP_KINDS_BASE.map(k => ({ ...k, Icon: ICON[k.key] }));
export const setPieceRanks = (players) => ranksBase(players, SP_KINDS);
export const spRanges = (players) => rangesBase(players, SP_KINDS);
export { setPieceBadges, setPieceCount };

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
  /* `Array.isArray`, EKKI `|| []` — FUNDID 14.8.2026 AF NYRRI ATBURDARAS.
     `|| []` ver adeins null/undefined; HLUTUR thar sem fylki a ad vera
     (`players: {}`) sleppur gegn (`{} || []` er `{}`) og `for...of` kastar
     "object is not iterable", sem felldi ThENNAN flipa i ErrorBoundary.
     Fannst thegar "hlutur i stad fylkis" var bætt vid `data-resilience.mjs`;
     hun var utan theirra 16 atburdarasa sem safnid hafdi. Sama lagfaering og
     thrju stodin i `makeEnricher` (`rowsOf`), en hér er hun STADBUNDIN: flipinn
     a ekki ad thurfa ad flytja inn ur stats.js fyrir eina gerdar-vorn.   */
  for (const p of (Array.isArray(bsd?.players) ? bsd.players : [])) {
    if (!p || typeof p !== "object") continue;
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
  /* Svidin fyrir skyringuna nedst — reiknud, aldrei skrifad i texta (sja
     hausinn a spRanges). `rangeTxt` skilar "1-6" eda "—" se ekkert skrad. */
  const ranges = useMemo(() => spRanges(players), [players]);
  const rangeTxt = k => {
    const r = ranges[k];
    return r ? (r.min === r.max ? String(r.min) : `${r.min}–${r.max}`) : "—";
  };
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
          {/* SKYRINGARTEXTINN FOR 20.8.2026, DAGSETNINGIN EKKI: "first taker
              ... updates automatically" var ritgerd um hvad flipinn gerir,
              en `last_updated` er LIFANDI GAGN — rodunin er handslegin inn
              hja FPL og getur verid urelt, svo hvenaer hun var sott er tala
              sem notandinn tharf. Skilyrdid heldur: an dagsetningar er
              ENGINN reitur, ekki tomur reitur (CLAUDE.md kafla 8).        */}
          {notes?.last_updated ? (
            <div style={S.sub}>
              {interp("Updated {0}.", [String(notes.last_updated).slice(0, 10)])}
            </div>
          ) : null}
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

      {/* HER STOD FYRIRLIDA-MALSGREININ — FJARLAEGD 20.8.2026. Maelingin sem
          hun bar (vitaskyttu-yfirlag maelt og hafnad vid allar vogtolur,
          ekkert CI utan nulls) er OFAR I HAUSNUM a thessari skra, med
          tolunum sjalfum og tilvisun i `src/captain.js`. Textinn for af
          skjanum; roksemdin for EKKI ur kodanum.                        */}
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
                        <span style={S.cost}>{fmtPrice(hit.p.now_cost)}</span>
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
        {/* TOLURNAR ERU REIKNADAR UR GOGNUNUM SEM ERU A SKJANUM. Her stod
            "corners 4-10 and never reach 1" sem FOST TALA; FPL endurgrunnadi
            hornin 13.8.2026 og setningin vard OSONN a skjanum. Sja spRanges. */}
        {interp("Measured on today's data: penalties {0}, free kicks {1}, corners {2}.",
          [rangeTxt("pen"), rangeTxt("fk"), rangeTxt("ck")])}
        {ranges.ck?.teamsNoOne
          ? " " + interp("{0} of {1} clubs have no number 1 at all for corners, which is why the lowest order is what counts — an older version required the number 1 and so showed no corner taker for them.",
              [ranges.ck.teamsNoOne, ranges.ck.teams])
          : " " + "FPL has renumbered this base mid-season before, so the lowest order is what counts rather than the number 1."}
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
  /* `note` VAR HER — stillinn a fyrirlida-malsgreininni. Hun for 20.8.2026
     og stillinn med henni: skilgreindur-en-onotadur still er sama leifin og
     `langWrap`/`langBtn` eftir ad tungumalalagid var tekid ut (CLAUDE.md
     kafla 9), og hann lifir af thvi ad enginn tekur eftir honum.        */
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
