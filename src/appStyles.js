/* ============================================================
   APPSTYLES — LITASPJALDID OG STILARNIR UR App.jsx

   AF HVERJU SER SKRA (11.8.2026): `App.jsx` var 4.636 linur og `S`-hluturinn
   einn var **438 af theim**. Hann er HREIN GOGN — engin rok, engin React —
   og hann la a milli vidmotanna og gerdi thau omoguleg ad finna.

   ThETTA ER BIRTING, EKKI LIKAN. Engin tala her er maeld; tolurnar sem ERU
   maeldar bua i `model.js`/`stats.js` og koma hingad ALDREI.

   `S` er haed a `C`, `mono` og `sans` — og ENGU ODRU (staðfest: kodinn i
   S-blokkinni, athugasemdir skornar burt, nefnir nakvaemlega thessi thrju
   nofn og ekkert annad). Thess vegna er thetta oruggur flutningur: hann
   getur ekki tekid rok med ser.

   VARUD SEM GILDIR UM ALLA ThESSA UPPSKIPTINGU (CLAUDE.md kafla 2):
   `npx esbuild` ThATTAR en LEYSIR EKKI NOFN. Flutningur ur Leaderboard.jsx
   skildi eftir thrjar tilvisanir i horfin nofn og gaf HVITAN SKJA medan
   esbuild var graent. Eftir hvert skref: `await import()` a skrana OG
   profin sem OPNA flipana (data-resilience, player-cards, ffdr-table, smoke).
   ============================================================ */

const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const sans = "system-ui, -apple-system, 'Segoe UI', sans-serif";

/* ---- Þema: ljóst, í stíl við fantasy.premierleague.com ---- */
const C = {
  page: "#f2f2f4", card: "#ffffff", cardAlt: "#fafafb",
  border: "#e0e0e4", borderStrong: "#c9c9d0",
  text: "#1d1d20", text2: "#61616b", text3: "#8b8b95",
  purple: "#37003c", purple2: "#4a0050",
  green: "#00b96b", greenBg: "#e6f9f0",
  amber: "#c98a00", amberBg: "#fff6e0",
  red: "#d92d3c", redBg: "#fdecee",
  pitch: "#e9f5ee", pitchLine: "#ffffff",
};

export { C, mono, sans };

export const S = {
  shell: { fontFamily:sans, background:C.page, color:C.text, minHeight:"100vh", padding:"14px 16px 40px", maxWidth:1280, margin:"0 auto" },
  loading: { padding:40, textAlign:"center", color:C.text2, fontFamily:mono },
  errBox: { padding:20, background:C.redBg, border:`1px solid ${C.red}`, borderRadius:10, color:"#7a1520" },

  head: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:14, flexWrap:"wrap" },
  headRight: { display:"flex", gap:8, alignItems:"center" },
  connMsg: { margin:"6px 0 0", padding:"5px 9px", borderRadius:6, fontSize:11.5,
    lineHeight:1.5, maxWidth:"100%" },
  connHint: { opacity:0.85, fontFamily:mono, fontSize:10.5 },
  urlInput: { background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 11px", fontSize:13, color:C.text, width:210, outline:"none" },
  searchBtn: { background:C.card, border:`1px solid ${C.borderStrong}`, borderRadius:8, padding:"8px 12px", fontSize:12.5, color:C.text, cursor:"pointer", whiteSpace:"nowrap" },
  connectBtn: { background:C.purple, color:"#fff", border:"none", borderRadius:8, padding:"9px 14px", fontSize:13, fontWeight:600, cursor:"pointer" },
  /* AFTENGING ER EKKI SAMA ADGERD OG TENGING, SVO HUN LITUR EKKI EINS UT
     (21.8.2026). `connectBtn` er fyllt fjolublatt — kall til adgerdar.
     Aftenging er AFTURKOLLUN og hun er utlinud, sama form sem `searchBtn`
     ber: hann er ekki ad velja hana i hvert skipti sem hann opnar appid.
     ThAD ER SAMT EKKI VIDVORUNARRAUTT: adgerdin er algerlega afturkraef
     (tengja aftur skilar hopnum) og rautt vaeri fullyrding um haettu sem
     ekki er their — sama regla sem gerir Evropu-merkid GRATT og ekki
     rautt (CLAUDE.md kafli 4).                                          */
  discBtn: { background:C.card, border:`1px solid ${C.borderStrong}`, borderRadius:8,
             padding:"8px 12px", fontSize:12.5, color:C.text2, cursor:"pointer",
             whiteSpace:"nowrap" },

  cmpFab: { position:"fixed", right:16, bottom:16, zIndex:60, border:"none",
            background:C.purple, color:"#fff", borderRadius:22, padding:"10px 16px",
            fontSize:13, fontWeight:600, cursor:"pointer",
            boxShadow:"0 6px 20px rgba(55,0,60,0.35)" },
  viewTabs: { display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" },
  viewTab: { border:`1px solid ${C.border}`, background:C.card, color:C.text2,
             borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, cursor:"pointer" },
  viewTabOn: { background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  /* Ikonid stendur thar sem emoji-in stada i hinum flipunum: sama bil (6px)
     svo hausrodin lesist jofn thott eitt taknid se teiknad og fjogur ekki. */
  viewTabIcon: { display:"inline-flex", alignItems:"center", gap:6 },
  tlWrap: { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:12 },
  // lína gegnum hnútana — teiknuð sem bakgrunnur á röðinni
  tlOuter: { display:"flex", alignItems:"flex-end", gap:6 },
  tlArrow: { width:22, height:26, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:15, lineHeight:1, cursor:"pointer", background:C.cardAlt, color:C.purple,
    border:`1px solid ${C.border}`, borderRadius:7, padding:0, marginBottom:1 },
  tlArrowOff: { opacity:0.3, cursor:"default", color:C.text3 },
  /* Röðin FYLLIR breiddina og hnútarnir deila henni jafnt (flex:1 á nodeCol).
     Þannig spannar línan allan skjáinn í staðinn fyrir að hanga vinstra megin. */
  tlRow: { flex:1, minWidth:0, position:"relative", display:"flex", alignItems:"flex-end", gap:3 },
  tlLine: { position:"absolute", left:0, right:0, bottom:15, height:2, background:C.border, borderRadius:1, zIndex:0 },
  nodeCol: { flex:"1 1 0", minWidth:0, position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 },
  chipSlotAbove: { height:17, display:"flex", alignItems:"center" },
  chipAbove: { display:"flex", alignItems:"center", gap:2, color:"#fff", borderRadius:5, padding:"1px 4px", lineHeight:1.3, boxShadow:"0 1px 3px rgba(0,0,0,0.18)" },
  chipAboveIcon: { fontFamily:mono, fontSize:9, fontWeight:700 },
  chipAboveTxt: { fontFamily:mono, fontSize:8.5, fontWeight:700, letterSpacing:0.2 },
  // width:100% -> hnúturinn fyllir kólumnuna sína, svo röðin nær yfir allan skjáinn
  node: { position:"relative", zIndex:1, width:"100%", minWidth:26, height:32, borderRadius:8,
    border:`1px solid ${C.border}`, background:C.cardAlt, cursor:"pointer", fontFamily:mono,
    fontSize:12, color:C.text2, padding:0 },
  nodeOn: { background:C.purple, color:"#fff", border:`1px solid ${C.purple}`, fontWeight:700 },
  nodeNum: { position:"relative", zIndex:1 },
  nodeDot: { position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background:"#f59e0b" },
  intl: { flexShrink:0, position:"relative", zIndex:2, display:"inline-flex", alignItems:"center", alignSelf:"flex-end", marginBottom:5 },
  globe: { display:"inline-flex", alignItems:"center", justifyContent:"center", width:18, height:18, borderRadius:"50%", background:C.card, border:`1px solid ${C.border}`, fontSize:10, boxShadow:`0 0 0 3px ${C.card}` },
  /* EVROPUVIKA. Sama grunnform og hnotturinn (18 px hringur a hvitum
     skugga) svo rodin haldist, EN stjarnan er annad silhouette og
     liturinn er daufur — thetta er samhengi, ekki vidvorun. Rautt eda
     fyllt takn hefdi lesid eins og "haetta", sem vaeri RANGT: alagid
     maeldist ekki marktaekt (MAELINGAR 6k).                            */
  euroStar: { display:"inline-flex", alignItems:"center", justifyContent:"center", width:18, height:18, borderRadius:"50%", background:C.card, border:`1px solid ${C.border}`, fontSize:9, lineHeight:1, color:C.text3, boxShadow:`0 0 0 3px ${C.card}` },
  /* Sama takn i FFDR-toflunni, an hringsins — thar er thad vidhengi vid
     nafn en ekki merki a tidalinu. 8 px og C.text3: sest thegar leitad
     er, hverfur thegar lesid er nidur dalkinn.                          */
  euroTag: { fontSize:8, lineHeight:1, color:C.text3, flexShrink:0, cursor:"help" },
  /* Skyringarlinan undir stikunni. Daufari en `deadline` — hun er lesin
     EINU SINNI og a ekki ad keppa vid frestinn um athyglina.            */
  tlLegend: { display:"flex", flexWrap:"wrap", gap:12, alignItems:"center",
              fontSize:9.5, color:C.text3, marginTop:2 },
  tlLegendItem: { display:"inline-flex", alignItems:"center", gap:4 },
  globeMini: { fontSize:9, lineHeight:1 },
  euroMini: { fontSize:9, lineHeight:1, color:C.text3 },
  resetAllRow: { marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}` },
  resetBtn: { marginLeft:10, fontFamily:sans, fontSize:9.5, cursor:"pointer",
    background:C.cardAlt, color:C.text2, border:`1px solid ${C.border}`,
    borderRadius:6, padding:"2px 7px" },
  resetConfirm: { marginLeft:10, display:"inline-flex", alignItems:"center", gap:5,
    fontSize:9.5, color:"#a01f2b", background:C.redBg, border:`1px solid ${C.red}`,
    borderRadius:6, padding:"2px 6px" },
  resetYes: { fontFamily:sans, fontSize:9.5, fontWeight:700, cursor:"pointer",
    background:C.red, color:"#fff", border:"none", borderRadius:4, padding:"1px 7px" },
  resetNo: { fontFamily:sans, fontSize:9.5, cursor:"pointer",
    background:C.card, color:C.text2, border:`1px solid ${C.border}`, borderRadius:4, padding:"1px 7px" },
  deadline: { marginTop:9, fontSize:12, color:C.text2, fontFamily:mono },

  tcFree: { marginLeft:8, color:"#0a7a4a", fontWeight:600 },
  tcOk: { marginLeft:8, color:C.text2 },
  tcHit: { marginLeft:8, color:C.red, fontWeight:700 },
  /* `preSeasonBar` VAR FJARLAEGD MED MALSGREININNI (20.8.2026). Skilgreindur
     en onotadur still er sama leif og `langWrap`/`langBtn` (CLAUDE.md 9) —
     hann lofar birtingu sem er ekki til. Ekki setja hann inn aftur an notanda. */
  nodeHit: { position:"absolute", bottom:-7, left:"50%", transform:"translateX(-50%)", fontFamily:mono, fontSize:8, fontWeight:700, color:"#fff", background:C.red, padding:"0 3px", borderRadius:3, lineHeight:1.4 },
  planFh: { fontFamily:mono, fontSize:8.5, fontWeight:700, color:"#fff", background:"#2563eb",
    borderRadius:4, padding:"1px 4px" },
  planGwHit: { background:C.redBg, border:`1px solid ${C.red}`, color:"#a01f2b", fontWeight:700 },
  stats: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 },
  statCard: { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"11px 12px", textAlign:"center" },
  statLbl: { fontFamily:mono, fontSize:10, letterSpacing:0.8, textTransform:"uppercase", color:C.text3 },
  statVal: { fontFamily:mono, fontSize:23, fontWeight:700, marginTop:2 },
  statSub: { fontSize:10.5, color:C.text3, marginTop:1 },


  main: { display:"grid", gridTemplateColumns:"minmax(0,1fr) 320px", gap:14, alignItems:"start" },
  // völlur + leikir hlið við hlið; völlurinn MINNI en áður
  searchBtnOn: { background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  ffdrPos: { display:"flex", gap:3 },
  ffdrPosBtn: { fontFamily:mono, fontSize:9, fontWeight:700, letterSpacing:0.3, cursor:"pointer",
    padding:"3px 7px", background:C.cardAlt, color:C.text2, border:`1px solid ${C.border}`, borderRadius:6 },
  ffdrPosOn: { background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  ffdrScroll: { overflowX:"auto", marginTop:8, paddingBottom:2 },
  /* BORDERSPACING VAR 2 OG ER NU 0 MED 1px GAGNSAEUM RAMMA A HVERJU HOLFI.
     Rumfraedin er ONBREYTT (1+1 = somu 2px milli holfa) en graeni ramminn
     um graena runu verdur SAMFELLDUR: raendur naest-liggjandi holfa
     SNERTAST i stad thess ad hafa 2px gat, sem hefdi litid ut eins og
     strikalina en ekki rammi. `backgroundClip:"padding-box"` heldur
     lit-flotinu innan vid rammann.
     BREIDDIN ER 2px (bil milli holfa = 4px, var 2). Med 1px var taflan
     of thett thegar graeni ramminn baettist ofan a hana — holfin i runu
     lasust sem EINN klumpur i stad thriggja leikja. Bilid er thad sem
     gerir rununa laesilega, ekki ramminn einn.                          */
  ffdrTable: { borderCollapse:"separate", borderSpacing:0, fontSize:9.5, width:"100%" },
  ffdrTh: { fontFamily:mono, fontSize:8.5, fontWeight:700, color:C.text3, textAlign:"center",
    padding:"1px 3px", minWidth:34, borderWidth:2, borderStyle:"solid", borderTopColor:"transparent", borderRightColor:"transparent", borderBottomColor:"transparent", borderLeftColor:"transparent", backgroundClip:"padding-box" },
  ffdrThTeam: { textAlign:"left", minWidth:58, position:"sticky", left:0, background:C.card, zIndex:1 },
  ffdrTeamCell: { position:"sticky", left:0, background:C.card, zIndex:1, padding:0 },
  ffdrTeamBtn: { display:"flex", alignItems:"center", gap:4, width:"100%", cursor:"pointer",
    fontFamily:mono, fontSize:10, fontWeight:700, color:C.text, background:"none", border:"none", padding:"2px 3px" },
  ffdrOpp: { display:"block" },
  ffdrAway: { fontStyle:"normal", fontSize:7, opacity:0.7, marginLeft:1 },
  ffdrDouble: { display:"block", fontSize:7, opacity:0.8 },
  ffdrBlank: { textAlign:"center", padding:"3px 2px", borderTopLeftRadius:5, borderTopRightRadius:5, borderBottomLeftRadius:5, borderBottomRightRadius:5, background:C.cardAlt,
    color:C.text3, fontFamily:mono, fontSize:9,     borderWidth:2, borderStyle:"solid", borderTopColor:"transparent", borderRightColor:"transparent", borderBottomColor:"transparent", borderLeftColor:"transparent", backgroundClip:"padding-box" },
  ffdrAvg: { textAlign:"center", padding:"3px 4px", fontFamily:mono, fontSize:9.5, fontWeight:700,
    color:C.text2, background:C.cardAlt, borderTopLeftRadius:5, borderTopRightRadius:5, borderBottomLeftRadius:5, borderBottomRightRadius:5,     borderWidth:2, borderStyle:"solid", borderTopColor:"transparent", borderRightColor:"transparent", borderBottomColor:"transparent", borderLeftColor:"transparent", backgroundClip:"padding-box" },
  /* RODUNAR-HAUSAR i FFDR-toflunni. Bendillinn segir ad thad megi smella;
     `ffdrThOn` merkir dalkinn sem STJORNAR rodinni — an hans er ekki haegt
     ad sja hvor talan raedur thegar baðar eru synilegar.               */
  ffdrThSort: { cursor:"pointer", userSelect:"none", minWidth:38 },
  ffdrThOn: { color:C.purple },
  ffdrAvgOn: { color:C.purple, background:"#f1e9f2" },
  ffdrLegend: { display:"flex", gap:4, flexWrap:"wrap", marginTop:8, paddingTop:7, borderTop:`1px solid ${C.border}` },
  ffdrChip: { fontFamily:mono, fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:4 },
  /* Breiddin kemur úr grid-dálki pitchSplit — flex/minWidth hér áður
     YFIRFLÆDDI 164px dálkinn (leifar frá því þetta var flexbox). */
  /* ============================================================
     `position:sticky` VAR HER OG FOR AD MALA OFAN A NAGRANNANN (20.8.2026)
     ============================================================
     Notandinn: „Thessi gluggi endar undir fixtures, sja mynd og birtist
     furdulega". Efsta rodin i „Never in your XI" var klippt — hun sat
     UNDIR nedri kanti leikjakassans.

     ORSOKIN: `gfWrap` var eina barnid i `S.side` thegar sticky-id var sett
     a hann. Thegar „Never in your XI" faerdist thangad undir (20.8.) fekk
     hann SYSTKINI. Sticky-element heldur plassi sinu i flaedi en ThYDIST
     nidur vid skrun, og thad er `position`-ad svo thad malast OFAN A
     ostadsett systkini — sem er nakvaemlega thad sem sast.
     `.gf-wrap { position: static !important }` i styles.css (760px) var
     hlutalausn fyrir sima og duldi thetta a stórum skjá.

     LAUSNIN ER AD FAERA STICKY-ID UPP A SULUNA SJALFA (`pitchSide`), ekki
     ad taka thad ut: tha limast BADIR kassarnir sem EIN blokk og geta ekki
     skarast. Og hun slokknar SJALF a einni sulu — `pitchSide` er
     grid-atridi, svo innihalds-kassinn er grid-svaedid; i einni sulu er
     svaedid nakvaemlega jafn hatt og atridid, sem gefur sticky NULL
     ferdalengd. Engin media query tharf ad muna eftir henni.
     Vordur: `initial-squad.mjs` kafli G.                                */
  gfWrap: { boxSizing:"border-box", minWidth:0,
    background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
    padding:"12px 13px" },
  gfHead: { display:"flex", alignItems:"center", gap:6, fontFamily:mono, fontSize:9.5, textTransform:"uppercase", letterSpacing:0.7, color:C.purple, fontWeight:700, marginBottom:7 },
  gfCount: { fontWeight:400, color:C.text3, letterSpacing:0, marginLeft:"auto" },
  gfDay: { marginTop:7 },
  gfDayLbl: { fontFamily:mono, fontSize:9.5, textTransform:"uppercase", letterSpacing:0.6,
    color:C.text3, padding:"4px 0 4px", borderTop:`1px solid ${C.border}` },
  /* Röðin er grid: [heimapilla → hægri] [tími] [útipilla ← vinstri].
     Áður þandi hvor "hlið" sig yfir hálfa breiddina með lit — leit út
     eins og málningarklessur. Nú situr liturinn á pillunni sjálfri. */
  gfMatch: { display:"grid", gridTemplateColumns:"1fr 58px 1fr", alignItems:"center",
    gap:4, padding:"2px 0" },
  gfCellL: { display:"flex", justifyContent:"flex-end", minWidth:0 },
  gfCellR: { display:"flex", justifyContent:"flex-start", minWidth:0 },
  gfPill: { display:"inline-flex", alignItems:"center", gap:4, cursor:"pointer",
    background:C.cardAlt, border:"none", borderRadius:6, padding:"3px 7px" },
  gfShort: { fontFamily:mono, fontSize:12.5, fontWeight:700 },
  gfMid: { minWidth:54, textAlign:"center", fontFamily:mono, fontSize:12, fontWeight:600,
    color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:5,
    padding:"2px 3px", cursor:"default" },
  gfMidLive: { background:C.redBg, color:"#a01f2b", fontWeight:700, border:`1px solid ${C.red}` },
  gfMidOpen: { cursor:"pointer", color:C.purple },
  gfDetail: { gridColumn:"1 / -1", marginTop:2, fontSize:8.5, lineHeight:1.5, color:C.text2 },
  gfEmpty: { fontSize:11, color:C.text3, padding:"6px 0" },
  /* Völlur + leikjalisti hlið við hlið. Seinni dálkurinn VERÐUR að rúma
     gfWrap — fastur 164px dálkur með minWidth:280 á innihaldinu olli
     yfirflæði sem braut útlitið. Á smáum skjám brotnar þetta í eina
     súlu í src/styles.css.                                                */
  pitchSplit: { display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(280px,340px)", gap:10, alignItems:"start", marginBottom:12 },
  // Völlurinn fyllir dálkinn sinn (ekkert þak lengur — skelin breikkaði í
  // 1280 og leikjalistinn fékk sinn fasta dálk, svo þeir slást ekki um pláss).
  pitchCol: { minWidth:0 },
  side: { display:"flex", flexDirection:"column", gap:12 },
  /* HINN DALKURINN i `pitchSplit` — leikirnir OG „Never in your XI" sem EIN
     limd blokk. Ser still og ekki `S.side` med yfirskrift: `S.side` er lika
     hlidarstika appsins (`.app-side`) og hun a ekkert ad limast.
     Sja langa athugasemdina vid `gfWrap`.                                */
  pitchSide: { display:"flex", flexDirection:"column", gap:12, minWidth:0,
    position:"sticky", top:8 },

  capBar: { display:"flex", gap:8, alignItems:"center", marginBottom:9 },
  capBox: { display:"flex", alignItems:"center", gap:6, background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px" },
  capBadge: { width:20, height:20, borderRadius:"50%", background:"#ffd23f", color:"#4a3800", fontFamily:mono, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  capSel: { border:"none", background:"transparent", fontSize:12.5, color:C.text, outline:"none", maxWidth:120 },
  ghost: { background:"transparent", border:`1px solid ${C.border}`, borderRadius:7, padding:"6px 10px", fontSize:11.5, color:C.text2, cursor:"pointer" },
  /* SLOKKTUR `ghost`. `cursor:"default"` og EKKI `not-allowed`: takkinn er
     ekki bannadur heldur MERKINGARLAUS i thessari umferd, og merkimidinn
     segir thad sjalfur. */
  ghostOff: { opacity:0.55, cursor:"default", color:C.text3 },
  /* `bestXiNote` VAR HER OG ER FARINN (21.8.2026). Hann bar synilegu
     linuna „sets who starts, not bench order" undir Pick-best-XI-takkanum;
     notandinn bad um ad taka hana ut og fyrirvarinn faerdist i `title` a
     takkanum sjalfum (sja App.jsx). Stillinn er ekki skilinn eftir
     ONOTADUR: `langWrap`/`langBtn`/`langOn` sátu skilgreindir og onotadir
     eftir ad tungumalalagid for og voru fjarlaegdir af nakvaemlega thessari
     astaedu (CLAUDE.md kafli 9) — still an notanda er lygi um ad eitthvad
     se teiknad.                                                        */

  /* Raðirnar deila plássinu jafnt; völlurinn vex ef þarf (sjá Pitch.jsx) */
  rowsArea: { flex:"1 0 auto", display:"flex", flexDirection:"column",
    justifyContent:"space-evenly", gap:6, padding:"10px 6px 12px" },
  /* WRAP, EKKI SKREPPA (20.8.2026). Bench Boost setur ALLA 15 a vollinn,
     svo lengsta rodin verdur FIMM (2 GK · 5 DEF · 5 MID · 3 FWD) — sama
     hamark og 5-manna vorn gefur i dag, og fimm spjold a 17,5% komast
     fyrir an ad skreppa. `nowrap` + `flexShrink:1` a `pCard` hefdi samt
     ThJAPPAD theim undir 62px lasgolfid a smaum skjai i stad thess ad
     brjota rodina; `wrap` kviknar SJALFT og adeins tha. Skorun er
     omoguleg thvi vollurinn vex (Pitch.jsx, aspectRatio er LAGMARK).   */
  pitchRowFlex: { display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap", padding:"0 2px" },
  benchArea: { flex:"0 0 auto", background:"rgba(9,24,15,0.78)",
    borderTop:"1.6px dashed rgba(234,243,236,0.35)", padding:"7px 8px 10px" },
  benchLabel: { fontFamily:mono, fontSize:9, letterSpacing:1, textTransform:"uppercase",
    color:"rgba(234,243,236,0.55)", marginBottom:4 },
  /* BENCH BOOST: skyringin sem stendur thar sem spjoldin voru. Ljos a
     dokkum borda eins og `benchLabel`, en full setning svo tomur borði
     lesi ekki eins og bilun.                                            */
  bbNote: { fontSize:11, lineHeight:1.5, color:"rgba(234,243,236,0.82)" },

  pCard: { position:"relative", width:"clamp(62px, 17.5%, 100px)", background:C.card,
    border:`1px solid rgba(255,255,255,0.5)`, borderRadius:9, padding:"6px 4px 6px",
    textAlign:"center", cursor:"pointer", boxShadow:"0 2px 6px rgba(0,0,0,0.28)",
    flexShrink:1, minWidth:0 },
  /* ============================================================
     BEKKJAR-SKUGGINN VAR 13 I RGB — UNDIR ThRESKULDI SEM REPO-ID
     SETUR SJALFT (maelt 20.8.2026)
     ============================================================
     Notandinn: „thad eru bara 2 kort sem eru lighter — ekki 4 eins og
     aetti ad vera" og „Somu mennirnir hanga gegnsaeir eda grair, thegar
     eg set tha a bekk i gameweek 2".

     MENGID VAR ALLTAF RETT. `bench={!sq.starter}` les `squadAt` sem er
     `squadForGw(gw)` og beitir `benchSwaps[gw]` — thad er thegar PER
     UMFERD, og profid taldi rettilega 4. Thad sem brast var LITURINN:
       pCard       #ffffff                       -> (255,255,255)
       pCardBench  rgba(255,255,255,0.94) a torfi (37,107,62)
                                                 -> (242,246,243)
       mesta rasa-munur: 13
     CLAUDE.md kafli 3 setur >= 20 i RGB sem thann mun sem nagrannathrep
     VERDA ad hafa til ad vera sjonraent adgreind. 13 er thvi „sama sem
     ekkert merki" — nakvaemlega ikon-lardomurinn i kafla 8: tvo merki sem
     lita eins ut i raunstaerd eru thad sama og engin merki.

     OG ThVI VAR TALAN TVEIR: spjoldin sem SYNILEGA doufnudu voru doufud af
     `opacity: 0.62` fra `isSellHint`, og `recommend.js:330` er
     `sorted.slice(0, 2)` — ALLTAF nakvaemlega tveir, og hun les EKKI
     umferdina sem er skodud. Thess vegna „hanga somu mennirnir grair"
     thegar hann bekkjar adra i GW2. Bordinn sagdi „The lighter cards are
     your bench" um tvo menn sem voru hvorugur a bekknum.

     ------------------------------------------------------------
     ORDID ER FARID AFTUR OG SKUGGINN BER MERKID EINN (25.8.2026)
     ------------------------------------------------------------
     Beidni notandans: „takid BENCH-ordid ut og grayid bekkjarmennina
     meira ut i stadinn". ThAD ER SAMA AKVORDUN OG VAR SNUID VID 20.8.,
     svo hun ma adeins standa ef GREYINGIN BER MERKID SJALF — og thad er
     MAELT, ekki metid.

     ThRENNT BREYTTIST I MEKANISMANUM OG HVERT ER ASETT:

     1. LITURINN ER OGEGNSAER, EKKI GEGNSAER. Gamla villan (13 i RGB) VAR
        gegnsæid: `rgba(255,255,255,α)` gefur ekki EINN lit heldur einn
        per bakgrunn, og `bench` er satt a TVEIMUR bokgrunnum — torfinu
        (Bench Boost, allir 15 a vellinum) og dokka bekkjarbordanum
        (`benchArea`, rgba(9,24,15,0.78) a torfi -> (15,42,25)). Tala sem
        er maeld a odrum theirra er agiskun um hinn. Ogegnsær litur hefur
        eitt gildi og maelingin er thvi ein tala fyrir bada staði.
     2. TALAN ER MAELD A BADUM BOKGRUNNUM OG ER 76 (`#b3bbc0` = 179,187,192
        a moti `pCard` #ffffff; mesti rasa-munur 255-179 = 76). Til
        samanburdar: gamli 0,94-skugginn 13,1 · 0,74-skugginn 56,7 a torfi
        og 62,4 a bordanum. ThRESKULDUR REPO-SINS ER 20 (CLAUDE.md kafli 3,
        sjonræn adgreining nagrannathrepa), svo 76 er threfalt yfir honum —
        og thad er ASTAEDAN fyrir thvi ad ordid ma fara: 20.8. var
        greyingin ein UNDIR throskuldi, nu er hun langt yfir.
     3. TEXTINN OG ANDLITSMYNDIN FYLGJA (`pNameBench`, `pPriceBench`,
        `pPortraitBench`). Their eru STYRKING, EKKI MERKID — merkid er
        bakgrunnurinn og hann einn er maeldur. Their eru taldir upp her svo
        enginn haldi ad their beri fullyrdinguna.

     ENGIN BER `opacity`. Sama regla og felldi `isSellHint`-doufnunina
     (`opacity: 0.62`) 20.8.: omerkt doufnun les sem „bekkur" og rekst tha
     a bekkjar-merkinguna sjalfa. `filter: saturate()` a myndinni er ekki
     doufnun — spjaldid er jafn ogegnsætt og adur, myndin missir bara lit.

     OG LITA-AREKSTURINN ER OBREYTTUR-LEYSTUR: graenn = i lidinu,
     ljosfjolublatt = i samanburdi, blatt = valinn dalkur (kafli 8).
     HLUTLAUST GRATT er ekkert theirra, svo skugginn getur ekki verid
     mislesinn sem eitt af hinum thremur.
     Vordur: `initial-squad.mjs` kaflar E og F.                          */
  pCardBench: { background:"#b3bbc0" },
  /* STYRKING, EKKI MERKID — sja lidi 3 her ad ofan. `pName` og `pPrice`
     bera annars erfdan/`text2` lit sem er kvardadur a HVITT spjald.     */
  pNameBench: { color:"#3f474d" },
  pPriceBench: { color:"#5b656b" },
  pPortraitBench: { filter:"saturate(0.15)" },
  /* SOLU-ABENDINGIN VAR OMERKT DOFNUN — NU MERKI (20.8.2026).
     `opacity: 0.62` a spjaldinu var sterkasta sjonraena merkid a vellinum
     og bar ENGA skyringu, svo thad las eins og bekkur (og felldi thar med
     bekkjar-skyringuna, sja `pCardBench`). Tillagan sjalf er OBREYTT —
     `recommendations.sellIds` er sami reikningur — hun er adeins ORDUD nu,
     eins og hvert annad merki i `sigRow`.                               */
  sigSell: { fontFamily:mono, fontSize:7.5, fontWeight:700, padding:"1px 3px",
    borderRadius:3, background:"#fde8e8", color:"#9b1c1c" },
  /* VERDFALL — FPL-s EIGIN FRAMVINDUTALA (25.8.2026). Annar litur en
     `sigSell` (raudur a ljosraudu) thvi thetta er ONNUR fullyrding:
     `sellIds` er OKKAR likan, thetta er FPL sjalft. Gulbrunt er hlutlaust
     gagnvart thremur merkingar-litunum i kafla 8 (graent = i lidinu,
     ljosfjolublatt = i samanburdi, blatt = valinn dalkur).             */
  sigDrop: { fontFamily:mono, fontSize:7.5, fontWeight:700, padding:"1px 3px",
    borderRadius:3, background:"#fff1d6", color:"#8a4b00" },
  pcIcons: { position:"absolute", top:2, right:2, display:"flex", gap:2, zIndex:3 },
  /* WRAP, EKKI CLIP (20.8.2026). Rodin ber nu FJOGUR atridi i versta
     tilfelli — C/V · i · ↻ · meidsla-merki (C og V utiloka hvort annad) —
     og RODIN SKIPTIR MALI: thad sem brotnar i naestu linu lendir OFAN A
     ANDLITSMYNDINNI, svo fyrsta saetid er thad eina sem er trygglega i
     efsta vinstra horninu. Thess vegna er C/V fyrst (25.8.2026, sja
     App.jsx). Spjaldid er adeins
     clamp(62px, 17.5%, 100px). Med `nowrap` hefdi fjorda atridid farid ut
     fyrir spjaldid; `maxWidth` + `wrap` lætur thad falla i næstu linu i
     stad thess ad klippast. Sama regla og `pFix` (FixStrip) ver.        */
  pcIconsL: { position:"absolute", top:2, left:2, display:"flex", gap:2, zIndex:3,
    flexWrap:"wrap", maxWidth:"calc(100% - 4px)" },
  pcIcon: { width:15, height:15, padding:0, display:"flex", alignItems:"center", justifyContent:"center",
    fontFamily:mono, fontSize:9, fontWeight:700, lineHeight:1, cursor:"pointer",
    background:"rgba(255,255,255,0.92)", color:C.text2, border:`1px solid ${C.border}`,
    borderRadius:4, boxShadow:"0 1px 2px rgba(0,0,0,0.10)" },
  pcIconSwap: { color:C.purple, border:"1px solid #d9c8f5", fontSize:10 },
  /* FFDR-samanburdur: gron umgjord svo hun se ekki misskilin sem skipti. */
  pcIconRot: { color:"#046b41", border:"1px solid #b7e6cd", fontSize:10 },
  /* Sama utlit og `band` en I FLAEDI (pcIconsL) i stad absolute — thannig
     getur merkid ekki lent undir odru ikoni. Sja skyringu vid notkun.  */
  bandFlow: { minWidth:15, height:15, borderRadius:8, fontFamily:mono, fontSize:9,
    fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center",
    flexShrink:0, boxShadow:"0 1px 2px rgba(0,0,0,0.10)" },
  pPortrait: { position:"relative", height:34, display:"flex", alignItems:"flex-end", justifyContent:"center", marginBottom:2 },
  pCrest: { position:"absolute", bottom:-3, right:4, width:18, height:18, objectFit:"contain",
    background:"#fff", borderRadius:"50%", padding:1,
    boxShadow:"0 0 0 1.5px #fff, 0 1px 3px rgba(0,0,0,0.28)" },
  pName: { fontSize:11, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  pPrice: { fontFamily:mono, fontSize:10.5, color:C.text2 },
  pEp: { fontFamily:mono, fontSize:12, fontWeight:700, color:C.purple },
  pCsSmall: { fontFamily:mono, fontSize:8.5, fontWeight:700, marginLeft:4 },
  /* WRAP, EKKI CLIP — og thad er kjarninn. Fyrsta utgafa hafdi
     flexWrap:"nowrap" + overflow:"hidden": i simabreidd (spjald 73px) fóru
     flisarnar i 16px thott "NEW" thurfi 21px, svo SIDASTI STAFURINN VAR
     KLIPPTUR AF OLLUM NIU flisum sem maeldar voru. Yfirflaedi-profid sagdi
     "ekkert yfirflaedi" thvi klipping ER ekki yfirflaedi — thad fannst
     adeins med thvi ad bera scrollWidth vid clientWidth per flis.
     Nu vefjast thaer i tvaer linur i stad thess ad klippast, og
     overflow:hidden er FARID svo thogul klipping se ekki moguleg aftur.  */
  fixStrip: { display:"flex", gap:2, justifyContent:"center", alignItems:"center",
    margin:"4px 0 1px", flexWrap:"wrap", rowGap:2 },
  fixMini: { fontFamily:mono, fontSize:8.5, fontWeight:700, padding:"2px 2px",
    borderRadius:4, whiteSpace:"nowrap", flex:"0 0 auto" },
  fixBlank: { background:"#f1f1f4", color:C.text3 },
  noFix: { fontFamily:mono, fontSize:10, color:C.text3, margin:"4px 0" },

  card: { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px" },
  h2: { fontSize:13.5, fontWeight:700, margin:"0 0 8px", color:C.purple },
  muted: { fontSize:11, color:C.text3, marginBottom:8, lineHeight:1.5 },

  planItem: { display:"flex", alignItems:"center", gap:8, fontSize:12.5, padding:"6px 0", borderTop:`1px solid ${C.border}` },
  planGw: { fontFamily:mono, fontSize:10.5, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:5, padding:"2px 5px", color:C.text2 },
  planTotal: { fontFamily:mono, fontSize:12 },
  planCalc: { fontFamily:mono, fontSize:10.5, color:C.text3, minWidth:32, textAlign:"right" },
  planHitVal: { fontFamily:mono, fontSize:10.5, color:C.red, minWidth:22, textAlign:"right" },
  planNet: { fontFamily:mono, fontSize:12, fontWeight:700, minWidth:34, textAlign:"right" },
  rm: { background:"transparent", border:"none", color:C.text3, cursor:"pointer", fontSize:12 },
  /* UPPHAFSLIDS-KAFLINN i skiptaaetluninni. Ser haus svo „net X pts" og
     „The hit is subtracted" geti ekki lesist sem fullyrdingar um hann.  */
  planSecHead: { display:"flex", alignItems:"baseline", gap:7, marginTop:12,
    paddingTop:9, borderTop:`1px solid ${C.border}` },
  planSecFirst: { marginTop:0, paddingTop:0, borderTop:"none" },
  planSecTag: { fontFamily:mono, fontSize:9, textTransform:"uppercase",
    letterSpacing:0.8, color:C.text3, fontWeight:700 },
  /* EIN TALA A UPPHAFSLIDS-ROD, OG HUN ER UM MANNINN SEM KEMUR INN EINAN.
     Grá og med merkimida („ep"), aldrei med formerki: `+` eda `-` laesi
     eins og delta, sem er nakvaemlega talan sem ma ekki vera thar.      */
  planPickEp: { fontFamily:mono, fontSize:10.5, color:C.text3, minWidth:46,
    textAlign:"right" },
  /* ============================================================
     „ROD SEM VAR EKKI BEITT" — GULT, EKKI RAUTT (21.8.2026)
     ============================================================
     Sami litur sem `conn.picks === false` ber i hausnum (#fff6e0/#7a5600):
     spurningin er su sama — „thetta virkadi ekki alveg" — og tveir litir
     a somu spurningu eru tveir kvardar (CLAUDE.md 8). Rautt er villa sem
     verdur ad leysa; her er `plan` hans OSKERTUR og ekkert brotid, adeins
     rod sem breytir engu.
     RAMMINN ER SKRIFADUR MED `border`-STYTTINGU EINNI og ENGRI langritun
     ofan a: kassinn KEMUR OG FER i hverri umferd, og blondud stytting og
     langritun a sama hlut er nakvaemlega thad sem gaf 14 React-
     vidvaranir i FFDR-toflunni. Ein stytting er OHAETT; thad var
     BLONDUNIN sem var villan.                                          */
  planWarn: { background:"#fff6e0", color:"#7a5600", borderRadius:6,
    border:"1px solid #f0d79a", padding:"6px 9px", marginBottom:8,
    fontSize:11, lineHeight:1.5 },
  /* MERKID A RODINNI. `planSecTag` var ekki nothaeft: hann er grar og
     „in place of X" ber hann thegar a SOMU rod, svo tvo eins merki hefdu
     lesist sem eitt (sama roksemd sem gerir hvert ikon ad annarri
     grunnform-samsetningu).                                            */
  planSkipTag: { fontFamily:mono, fontSize:9, textTransform:"uppercase",
    letterSpacing:0.8, color:"#7a5600", fontWeight:700 },

  chipHalfLbl: { display:"flex", alignItems:"baseline", gap:6, fontFamily:mono, fontSize:9.5, textTransform:"uppercase", letterSpacing:0.7, color:C.purple, fontWeight:700, marginTop:10, paddingTop:6, borderTop:`1px solid ${C.border}` },
  chipExpiry: { fontWeight:400, letterSpacing:0, color:C.text3, marginLeft:"auto", fontSize:9 },
  chipExpired: { color:C.red, fontWeight:700 },
  chipHalfRange: { fontWeight:400, color:C.text3, letterSpacing:0 },
  chipRow: { display:"flex", alignItems:"center", gap:9, padding:"6px 0" },
  chipIcon: { width:24, height:24, borderRadius:6, color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontFamily:mono },
  chipName: { fontSize:12.5, fontWeight:600 },
  chipDesc: { fontSize:10, color:C.text3 },
  chipSel: { background:C.card, border:`1px solid ${C.border}`, borderRadius:7, padding:"4px 6px", fontSize:11.5, color:C.text, outline:"none" },

  moveRow: { display:"flex", alignItems:"center", gap:6, fontSize:12, padding:"4px 0", borderTop:`1px solid ${C.border}` },
  moveName: { flex:1, minWidth:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  moveTeam: { fontFamily:mono, fontSize:9.5, color:C.text3 },
  moveNet: { fontFamily:mono, fontSize:11, color:C.green, minWidth:44, textAlign:"right" },
  moveChg: { fontFamily:mono, fontSize:10, minWidth:44, textAlign:"right" },
  movePredict: { fontFamily:mono, fontSize:9.5, fontWeight:700, color:C.green },
  moveSep: { fontFamily:mono, fontSize:10, textTransform:"uppercase", letterSpacing:0.8, color:C.text3, marginTop:9, paddingTop:6, borderTop:`1px solid ${C.border}` },

  rivalAddRow: { display:"flex", gap:6, marginBottom:8 },
  rivalBlock: { borderTop:`1px solid ${C.border}`, padding:"7px 0" },
  rivalRow: { display:"flex", alignItems:"center", gap:7 },
  rivalName: { fontWeight:700, fontSize:12.5, flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  rivalPts: { fontFamily:mono, fontSize:10.5, color:C.text2, flexShrink:0 },
  rivalMeta: { fontSize:10.5, color:C.text3, marginTop:2 },
  rivalDiff: { display:"flex", alignItems:"center", gap:4, flexWrap:"wrap", marginTop:4 },
  rivalDiffLbl: { fontFamily:mono, fontSize:8.5, textTransform:"uppercase", letterSpacing:0.5, color:C.text3, marginRight:2 },
  rivalChip: { fontSize:10.5, fontWeight:600, background:C.cardAlt, border:`1px solid ${C.border}`,
    borderRadius:5, padding:"1px 6px", cursor:"pointer" },
  srcRow: { display:"flex", alignItems:"center", gap:7, fontSize:11.5, color:C.text2, padding:"3px 0",
    flexWrap:"wrap", rowGap:3 },
  /* ============================================================
     HOLFIN I `srcRow` BERA **EKKI** `S.muted` (lagad 20.8.2026)
     ============================================================
     `S.muted` er blokka-still fyrir malsgreinar undir hausum og hefur
     `marginBottom: 8`. I flex-rod med `alignItems:"center"` er ytri
     kassinn — MARGIN INNIFALIN — midjusettur, svo thau 8px LYFTU
     lids/verd-textanum um 4px medan nafnid vid hlidina sat kyrrt.
     Notandinn sa thad sem "lid og verd eru miklu ofar en nofnin".
     `marginBottom:0` VERDUR ThVI AD VERA BER OG SYNILEG HER, ekki
     yfirskrifud a stadnum: yfirskrift a notkunarstad hverfur i naestu
     endurritun a JSX-inu og villan kemur thegjandi til baka.
     `lineHeight:1.35` er sama tala i ollum thremur svo grunnlinurnar
     lendi saman — tvaer lineHeight i sama rod eru tvaer linur.        */
  srcName: { fontWeight:700, cursor:"pointer", lineHeight:1.35, marginBottom:0, minWidth:0 },
  /* „When to sell" — holfin sitja i `srcRow` og bera thvi SOMU reglu:
     `marginBottom:0` og SAMA `lineHeight` i ollum thremur. Sja langa
     athugasemdina vid `srcName` fyrir hvers vegna hvorugt ma vanta. */
  sellWhenHead: { fontSize:12, fontWeight:700, color:C.text, marginBottom:4 },
  sellWhenRun: { fontWeight:700, color:C.text, lineHeight:1.35, marginBottom:0, whiteSpace:"nowrap" },
  sellWhenFig: { fontFamily:mono, fontSize:10.5, color:C.red, lineHeight:1.35, marginBottom:0 },
  sellWhenSum: { fontSize:10.5, color:C.text3, lineHeight:1.35, marginBottom:0 },
  /* `run: null` — `why` ORDRETT. Ekki grar smair stafir sem lesast eins og
     fotnota: thetta er SVARID fyrir thann leikmann. */
  sellWhenWhy: { fontSize:11, color:C.text2, lineHeight:1.45, padding:"3px 0" },
  srcMeta: { fontSize:11, color:C.text3, lineHeight:1.35, marginBottom:0, whiteSpace:"nowrap" },
  srcFrees: { color:C.amber, fontWeight:700, lineHeight:1.35, marginBottom:0, whiteSpace:"nowrap" },
  /* ============================================================
     „Replace"-HNAPPURINN FOR UT FYRIR KASSANN (20.8.2026)
     ============================================================
     Notandinn: „einn takkinn fer utfyrir". Rodin var `nowrap` flex med
     ThREMUR ohreyfanlegum holfum (`srcMeta`, `srcFrees` bera bædi
     `whiteSpace:"nowrap"`) og einum hnappi. `srcName` hafdi ekkert
     `minWidth:0`, svo sjalfgefid `min-width:auto` = min-content = LANGSTA
     ORDID: „Muharemovic" gat ekki skropplad. Summa min-content-breidda
     for thvi yfir 280px dalkinn og flexbox atti engan ad kreista —
     yfirflaedid lenti a SIDASTA barninu, hnappnum.

     WRAP, EKKI CLIP (sama regla og `pFix`, `pcIconsL`): rodin ma brotna.
     `srcAct` heldur tolunni OG hnappnum saman sem EINNI oskiptanlegri
     blokk (`flexShrink:0`) svo their fari NIDUR i naestu linu SAMAN i stad
     thess ad hnappurinn slitni fra tolunni sinni. `marginLeft:"auto"` i
     stad `<span style={{flex:1}}/>`-fyllingar: auto-margin haegri-jafnar
     blokkina a BADUM linum, medan flex-fylling helst a fyrstu linunni og
     hefdi skilid hnappinn vinstri-jafnadan eftir i annarri.             */
  srcAct: { display:"flex", alignItems:"center", gap:7, flexShrink:0,
    marginLeft:"auto" },
  /* NOTKUNAR-TALAN. `whiteSpace:nowrap` svo „1 of 6 in XI" brotni ekki i
     midju; rodin sjalf ma brotna (`srcRow`), holfid ekki.               */
  srcUse: { fontFamily:mono, fontSize:9.5, color:C.text2, lineHeight:1.35,
    marginBottom:0, whiteSpace:"nowrap" },
  /* `srcSwap` VAR FJARLAEGT 25.8.2026 — enginn notandi (0 tilvik i
     ollu `src/`). ATH: `srcSwapName` HER FYRIR NEDAN ER LIFANDI
     (App.jsx:~4356) og adliggjandi lyklar med sama forskeyti eru
     audvelt ad henda i einu — thess vegna er thetta skrifad.       */
  srcSwapName: { color:C.green, fontWeight:700, cursor:"pointer" },
  /* ATT-MERKID A „Not in your XI"-kossunum (21.8.2026). Tveir kassar geta
     verid a skjanum samtimis — AAETLUN (framvirkt) og STADREYND
     (afturvirkt) — og thad er nakvaemlega vegna thess ad thau eru TVAER
     spurningar sem tolurnar theirra ma ekki leggja saman. Merkid er thvi
     EKKI skraut: an thess vaeru tveir eins kassar med ymsum tolum.
     ThAD ER LINA, EKKI MALSGREIN, og thad er allur punkturinn — notandinn
     bad um „minni og einfaldari texta", svo `S.muted` (blokka-still med
     `marginBottom: 8`, sja `srcName`) er RANGI stillinn her.            */
  unusedDir: { fontFamily:mono, fontSize:9, color:C.text3, letterSpacing:0.2,
    lineHeight:1.35, marginBottom:5 },
  dotErr: { width:6, height:6, borderRadius:"50%", background:C.red, flex:"0 0 6px" },
  dotOk: { width:7, height:7, borderRadius:"50%", background:C.green, flexShrink:0 },
  tblHead: { display:"flex", alignItems:"center", gap:4, fontFamily:mono, fontSize:9, textTransform:"uppercase", letterSpacing:0.6, color:C.text3, paddingBottom:4, borderBottom:`1px solid ${C.border}` },
  tblRow: { display:"flex", alignItems:"center", gap:4, padding:"3px 0", borderBottom:`1px solid ${C.page}` },
  // ffdrCell = <span> í leikmanns-yfirliti (inline-block)
  ffdrBar:{ display:"flex", alignItems:"center", gap:5, margin:"7px 0 4px" },
  ffdrStep:{ border:`1px solid ${C.border}`, background:C.card, borderRadius:5,
             width:20, height:20, lineHeight:1, cursor:"pointer", fontSize:12,
             color:C.text2, padding:0 },
  ffdrNow:{ fontSize:11, fontWeight:700, color:C.text, display:"flex",
            alignItems:"center", gap:4 },
  ffdrN:{ fontSize:9, fontWeight:700, background:C.cardAlt, color:C.text3,
          borderRadius:4, padding:"1px 4px" },
  ffdrPick:{ border:0, background:"none", cursor:"pointer", fontSize:10.5,
             color:C.purple, textDecoration:"underline", padding:0, marginLeft:"auto" },
  ffdrBoxes:{ display:"flex", flexWrap:"wrap", gap:2, marginBottom:6 },
  ffdrBox:{ border:`1px solid ${C.border}`, background:C.card, borderRadius:3,
            minWidth:19, height:17, fontSize:9, lineHeight:1, cursor:"pointer",
            color:C.text3, padding:0 },
  /* HEIL `border`-ritun, EKKI `borderColor`: grunnstillingin setur
     `border` (styttingu) og React vardar vid ad blanda theim — thegar
     kassinn slokknar er `borderColor` fjarlaegt medan `border` situr
     eftir, sem er odefinerad rod og getur skilid eftir rangan ramma.
     Sama lagfaering a fjorum odrum stodum (gwOn/gwEdge/tglOn/hTilePrice). */
  ffdrBoxOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}`, fontWeight:700 },
  tblN:{ width:22, textAlign:"right", fontSize:10, fontVariantNumeric:"tabular-nums" },
  ffdrCell: { display:"inline-block", minWidth:32, textAlign:"center", fontFamily:mono,
    fontSize:10, fontWeight:700, padding:"1px 4px", borderRadius:4 },
  // ffdrTd = <td> í FFDR-töflunni. MÁ EKKI vera inline-block — brýtur töfluna.
  /* FJORIR LANGRITADIR LITIR, EKKI `border`-STYTTINGIN.
     Graena runan (greenRuns) setur `borderTopColor` o.s.frv. a EINSTAKAR
     hlidar. Med `border:"2px solid transparent"` i grunni er thad blondun
     styttingar og langritunar — React vardar vid henni og fjarlaegir
     litina i odefinerаdri rod thegar runan hverfur. Thad kom ekki fram
     medan bilid var FAST, en um leid og haegt var ad velja umferdir
     birtust 14 vidvaranir: runur koma og fara vid hverja breytingu.
     Grunnurinn skrifar thvi allar fjorar hlidar berum ordum og
     yfirskriftin snertir somu eiginleika — engin blondun.              */
  ffdrTd: { textAlign:"center", padding:"3px 2px", borderTopLeftRadius:5, borderTopRightRadius:5, borderBottomLeftRadius:5, borderBottomRightRadius:5, fontFamily:mono,
    fontSize:9, fontWeight:700, whiteSpace:"nowrap", lineHeight:1.25,
    borderWidth:2, borderStyle:"solid",
    borderTopColor:"transparent", borderRightColor:"transparent",
    borderBottomColor:"transparent", borderLeftColor:"transparent",
    backgroundClip:"padding-box" },
  tblNum: { width:46, textAlign:"right", fontFamily:mono, fontSize:11, color:C.text2, position:"relative" },
  /* `availBadge` VAR ABSOLUTE MED HANDREIKNADRI `left` (21 / 38) SEM FOR
     EFTIR FJOLDA IKONA I VINSTRI RODINNI. Thridja ikonid (↻, flutt thangad
     20.8.2026) gerdi bada tolurnar rangar OG ThOGULT — merkid hefdi legid
     ofan a ikoni i stad thess ad sitja vid hlid thess. Nu er thad i FLAEDI
     innan `pcIconsL`, eins og `bandFlow`, svo engin tala tharf ad fylgja
     fjolda ikona og thad getur ekki lent undir odru.
     fontSize 8,5 -> 10 og hvitur baugur svo merkid lesist yfir myndinni. */
  availFlow: { fontFamily:mono, fontSize:10, fontWeight:800, padding:"1px 4px",
    borderRadius:4, lineHeight:1.35, flexShrink:0, whiteSpace:"nowrap",
    boxShadow:"0 0 0 1.5px #fff, 0 1px 2px rgba(0,0,0,0.25)" },
  sAvail: { fontFamily:mono, fontSize:8.5, fontWeight:700, padding:"1px 4px", borderRadius:4, marginLeft:5 },
  sPen: { fontFamily:mono, fontSize:8, fontWeight:700, padding:"1px 3px", borderRadius:4, background:"#e6f9f0", color:"#0a7a4a", marginLeft:4 },
  okBox: { background:C.greenBg, color:"#0a7a4a", borderRadius:8, padding:"8px 10px", fontSize:12 },
  riskRow: { display:"flex", alignItems:"center", gap:7, padding:"5px 0", borderTop:`1px solid ${C.border}`, fontSize:11.5 },
  riskTag: { fontFamily:mono, fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:4, flexShrink:0, whiteSpace:"nowrap" },
  riskName: { fontWeight:600, flexShrink:0 },
  riskNews: { color:C.text3, fontSize:10, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  pMain: { marginTop:2 },
  sigRow: { display:"flex", gap:3, justifyContent:"center", flexWrap:"wrap", marginTop:3, minHeight:11 },
  confBadge: { position:"absolute", left:2, right:2, bottom:2, color:"#fff",
    fontFamily:mono, fontSize:8.5, fontWeight:800, letterSpacing:0.3,
    textAlign:"center", borderRadius:3, padding:"1px 0", zIndex:4 },
  sigDc:  { fontFamily:mono, fontSize:7.5, fontWeight:700, padding:"1px 3px", borderRadius:3, background:"#eef2ff", color:"#3730a3" },
  sigCard:{ fontFamily:mono, fontSize:7.5, fontWeight:700, padding:"1px 3px", borderRadius:3, background:"#fff6e0", color:"#8a5f00" },
  sigRot: { fontFamily:mono, fontSize:7.5, fontWeight:700, padding:"1px 3px", borderRadius:3, background:"#eeeef1", color:"#61616b" },

  detail: { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, width:"100%", maxWidth:520, maxHeight:"88vh", overflowY:"auto", padding:"14px 16px 16px", boxShadow:"0 18px 50px rgba(0,0,0,0.24)" },
  dHead: { display:"flex", alignItems:"center", gap:11, marginBottom:10 },
  dPortrait: { width:52, height:52, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  dName: { fontSize:17, fontWeight:700, color:C.purple },
  dSub: { fontSize:11.5, color:C.text2, fontFamily:mono, marginTop:1 },
  dAlert: { borderRadius:8, padding:"8px 10px", fontSize:12, marginBottom:9 },
  dGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(88px,1fr))", gap:7, marginBottom:12 },
  dStat: { background:C.cardAlt, borderRadius:8, padding:"7px 9px" },
  dStatK: { fontFamily:mono, fontSize:8.5, textTransform:"uppercase", letterSpacing:0.5, color:C.text3 },
  dStatV: { fontFamily:mono, fontSize:15, fontWeight:700, marginTop:1 },
  dStatS: { fontSize:9, color:C.text3 },
  dGroupHead: { display:"flex", alignItems:"baseline", gap:6, fontSize:12, fontWeight:700,
    color:C.text, marginBottom:6, marginTop:2, paddingTop:8, borderTop:`1px solid ${C.border}` },
  dGroupDot: { width:8, height:8, borderRadius:"50%", flexShrink:0, alignSelf:"center" },
  dGroupSub: { fontFamily:mono, fontSize:9, fontWeight:400, color:C.text3, letterSpacing:0.2 },
  dSectionLbl: { display:"flex", alignItems:"baseline", gap:7, fontSize:12.5, fontWeight:700, color:C.purple, marginBottom:6, paddingTop:4, borderTop:`1px solid ${C.border}` },
  dSectionNote: { fontFamily:mono, fontSize:9.5, fontWeight:400, color:C.text3 },
  dFixList: { display:"flex", flexDirection:"column", gap:2, marginBottom:12 },
  dFixRow: { display:"flex", alignItems:"center", gap:7, padding:"4px 0", borderBottom:`1px solid ${C.page}`, fontSize:11.5 },
  dFixCup: { display:"flex", alignItems:"center", gap:7, padding:"4px 0", borderBottom:`1px solid ${C.page}`, fontSize:11.5, background:"#faf7ff" },
  dFixGw: { fontFamily:mono, fontSize:10, color:C.text3, width:36, flexShrink:0 },
  dFixOpp: { fontFamily:mono, fontSize:10.5, fontWeight:700, padding:"2px 6px", borderRadius:5, minWidth:44, textAlign:"center" },
  dFixComp: { fontFamily:mono, fontSize:10, fontWeight:700, color:"#5b21b6", background:"#f1e9ff", padding:"2px 6px", borderRadius:5 },
  dFixFdr: { fontFamily:mono, fontSize:9.5, color:C.text3 },
  dFixHome: { fontFamily:mono, fontSize:9, color:C.text3 },
  dFixCs: { fontFamily:mono, fontSize:10, color:C.text2 },
  dFixTravel: { fontFamily:mono, fontSize:9, color:C.text3 },
  dFixTravelLong: { color:"#8a5f00", background:"#fff6e0", borderRadius:4, padding:"0 4px", fontWeight:700 },
  dFixDate: { fontFamily:mono, fontSize:9.5, color:C.text3, flexShrink:0 },
  dSubLbl: { fontFamily:mono, fontSize:9.5, textTransform:"uppercase", letterSpacing:0.6, color:C.text3, marginBottom:4 },
  dExList: { display:"flex", flexDirection:"column", gap:1, marginBottom:10 },
  dExRow: { display:"flex", alignItems:"center", gap:7, fontSize:11.5, padding:"3px 0", borderBottom:`1px solid ${C.page}` },
  dExName: { flex:1, color:C.text2 },
  dExVal: { fontFamily:mono, fontSize:10, color:C.text3 },
  dExPts: { fontFamily:mono, fontSize:11.5, fontWeight:700, minWidth:26, textAlign:"right" },
  injSrc: { fontFamily:mono, fontSize:8.5, opacity:0.75 },
  dNote: { background:C.cardAlt, borderRadius:8, padding:"8px 10px", fontSize:10.5, color:C.text2, lineHeight:1.5, marginBottom:10 },
  pSell: { fontFamily:mono, fontSize:8.5, color:C.red, marginLeft:2 },
  dActions: { display:"flex", gap:6, flexWrap:"wrap", paddingTop:8, borderTop:`1px solid ${C.border}` },
  dBtn: { background:C.card, border:`1px solid ${C.borderStrong}`, borderRadius:7, padding:"7px 11px", fontSize:12, color:C.text, cursor:"pointer", fontWeight:500 },
  dotWait: { width:7, height:7, borderRadius:"50%", background:"#f59e0b", flexShrink:0 },

  recHead: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" },
  recCtl: { display:"flex", gap:6 },
  recBlock: { marginTop:10 },
  recPosLbl: { display:"flex", alignItems:"center", gap:6, fontFamily:mono, fontSize:10.5, textTransform:"uppercase", letterSpacing:0.8, color:C.text2, marginBottom:6 },
  // `flexShrink:0`: 8px hringur an texta hefur min-content 0 og hefdi
  // skroppid i EKKERT undir thrystingi i `srcRow` — hann er stodu-liturinn.
  posDot: { width:8, height:8, borderRadius:"50%", flexShrink:0 },
  recGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:8 },
  recCard: { background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:10, padding:"9px 10px", cursor:"pointer" },
  recTop: { display:"flex", alignItems:"center", gap:8 },
  recPortrait: { position:"relative", width:32, height:32, display:"flex", alignItems:"flex-end", justifyContent:"center", flexShrink:0 },
  recName: { fontSize:12.5, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  recMaxWrap: { display:"inline-flex", alignItems:"center", gap:3, border:`1px solid ${C.border}`,
                borderRadius:6, padding:"2px 6px", background:C.card },
  recMaxLbl: { fontSize:10, color:C.text3, whiteSpace:"nowrap" },
  recMaxInput: { width:46, border:"none", outline:"none", fontSize:11.5, fontFamily:mono,
                 background:"transparent", color:C.text },
  recMaxClear: { border:"none", background:"transparent", color:C.text3, cursor:"pointer",
                 fontSize:10, padding:0, lineHeight:1 },
  recChip: { display:"inline-flex", alignItems:"baseline", gap:3, background:C.cardAlt,
             border:`1px solid ${C.border}`, borderRadius:4, padding:"1px 5px", whiteSpace:"nowrap" },
  recChipK: { fontSize:8.5, color:C.text3, textTransform:"uppercase", letterSpacing:0.3 },
  recChipV: { fontSize:10.5, fontWeight:700, color:C.text, fontFamily:mono },
  recWhy: { fontFamily:mono, fontSize:8.5, color:C.purple, fontWeight:700, marginTop:4, lineHeight:1.4 },
  recMeta: { fontFamily:mono, fontSize:10, color:C.text3 },
  recScore: { fontFamily:mono, fontSize:13, fontWeight:700, color:C.purple, flexShrink:0 },
  recFix: { display:"flex", gap:3, marginTop:7, flexWrap:"wrap" },
  recFixChip: { fontFamily:mono, fontSize:9, fontWeight:700, padding:"2px 4px", borderRadius:4 },
  recExtra: { display:"flex", flexWrap:"wrap", gap:4, marginTop:5 },

  overlay: { position:"fixed", inset:0, background:"rgba(20,20,25,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:18 },
  modal: { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, width:"100%", maxWidth:440, maxHeight:"82vh", display:"flex", flexDirection:"column", boxShadow:"0 18px 50px rgba(0,0,0,0.22)" },
  modalHead: { display:"flex", gap:8, alignItems:"center", padding:"13px 13px 9px" },
  search: { flex:1, background:C.cardAlt, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 11px", fontSize:13, color:C.text, outline:"none" },
  close: { background:"transparent", border:"none", color:C.text3, fontSize:15, cursor:"pointer", padding:4 },
  searchList: { overflowY:"auto", padding:"0 7px 11px", display:"flex", flexDirection:"column", gap:2 },
  sItem: { display:"flex", alignItems:"center", gap:9, background:"transparent", border:"none", borderRadius:8, padding:"6px 7px", cursor:"pointer", textAlign:"left", width:"100%" },
  sPortrait: { position:"relative", width:32, height:32, display:"flex", alignItems:"flex-end", justifyContent:"center", flexShrink:0 },
  crestFallback: { fontFamily:mono, fontWeight:700, color:C.text3, background:C.cardAlt, borderRadius:3, padding:"0 2px", lineHeight:1.4, display:"inline-block" },
  sCrest: { position:"absolute", bottom:-2, right:-3, width:13, height:13, objectFit:"contain" },
  sName: { fontSize:13, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  sMeta: { fontFamily:mono, fontSize:10, color:C.text3 },
  /* ---- maeldu merkin i skipta-glugganum ---- */
  sSig:{ display:"flex", alignItems:"center", gap:4, marginTop:3, flexWrap:"wrap" },
  sigPill:{ fontSize:9.5, fontWeight:700, borderRadius:3, padding:"0 3px", lineHeight:"14px" },
  sigOk:{ background:"#e6f7ef", color:"#0a7d4f" },
  sigWarn:{ background:"#fff5e0", color:"#8a5a00" },
  sigBad:{ background:"#fde8ea", color:"#a3202c" },
  sigFfdr:{ fontSize:9.5, fontWeight:700, borderRadius:3, padding:"0 4px",
            lineHeight:"14px", fontFamily:mono },
  sigMo:{ fontSize:9.5, fontWeight:600, borderRadius:3, padding:"0 3px",
          lineHeight:"14px", background:"#f0eef4", color:"#4a3d5c" },
  sigUp:{ fontSize:9.5, fontWeight:700, borderRadius:3, padding:"0 3px",
          lineHeight:"14px", background:"#e6f7ef", color:"#0a7d4f" },
  sigDown:{ fontSize:9.5, fontWeight:700, borderRadius:3, padding:"0 3px",
            lineHeight:"14px", background:"#fde8ea", color:"#a3202c" },
  sPrice: { fontFamily:mono, fontSize:12.5, fontWeight:700 },
  sItemBlocked: { opacity:0.45 },
  sBlock: { fontFamily:mono, fontSize:9, color:C.red, fontWeight:700 },
  sDiff: { fontFamily:mono, fontSize:10 },
  /* MINUS-BANKI I LEITARLISTANUM. VILJANDI EKKI `sItemBlocked` (opacity
     0,45): raudur texti er UPPLYSING, dofid spjald er HINDRUN, og verd er
     ekki lengur hindrun (sja `commitTransfer`). Sami litur og `sBlock` en
     an fontWeight svo thad se sjonraent laegra sett en "3 per club".    */
  sOver: { fontFamily:mono, fontSize:9, color:C.red },

  toast: { position:"fixed", bottom:18, left:"50%", transform:"translateX(-50%)", background:C.purple, color:"#fff", padding:"10px 16px", borderRadius:9, fontSize:12.5, zIndex:200, boxShadow:"0 6px 22px rgba(0,0,0,0.25)" },
};
