import React, { useState, useEffect, useMemo } from "react";

/* ============================================================
   FPL PLÖNUN — v2
   Byggt á gögnum úr samtalinu (verð, spár, leikir, verðbreytingar)
   + LIFANDI bókmakera-CS% frá The Odds API gegnum Netlify-proxy.

   PROXY_URL: settu slóðina á Netlify-fallið þitt hér að neðan.
   Ef tómt eða ótengt notar appið sáðu FDR-gögnin (virkar áfram).
   CS%-litur:  grænt ≥50%, gult 30–49%, rautt <30%.
   ============================================================ */
const PROXY_URL = "https://mellifluous-hummingbird-565c85.netlify.app/.netlify/functions/odds"; // Netlify-fallið þitt

// CS% -> litur fyrir leikja-flís og varnar-CS
function csColor(pct) {
  if (pct == null) return null;
  if (pct >= 50) return "#1B7A3D";      // grænt: líklegt hreint
  if (pct >= 30) return "#E0A500";      // gult: í járnum
  return "#C62828";                      // rautt: ólíklegt
}

// ---- Leikjadagskrá GW1–8: [andstæðingur, heima?, FDR 1(létt)–5(þungt)] ----
// GW1 staðfest af notanda. GW2–8 lesin af FFS ticker (staðfestist gegn lifandi gögnum).
const FIX = {
  TOT: [["BRE",false,3],["NEW",true,3],["NFO",false,2],["EVE",true,3],["AVL",false,3],["MUN",true,3],["COV",true,2],["CHE",false,4]],
  ARS: [["COV",true,1],["FUL",false,3],["CHE",true,4],["SUN",false,2],["BHA",true,3],["LEE",false,2],["NFO",true,2],["EVE",false,3]],
  LIV: [["NEW",false,3],["IPS",true,1],["BOU",false,3],["FUL",true,2],["BHA",false,3],["MCI",true,4],["CHE",false,4],["BRE",false,3]],
  MUN: [["HUL",false,1],["CRY",true,3],["EVE",false,3],["MCI",true,4],["FUL",false,3],["TOT",false,3],["LEE",true,2],["BOU",true,3]],
  SUN: [["IPS",false,1],["FUL",true,3],["BRE",false,3],["ARS",true,5],["MCI",false,5],["BHA",true,3],["BOU",false,3],["LEE",true,2]],
  MCI: [["BOU",true,2],["WHU",false,2],["COV",true,1],["MUN",false,4],["SUN",true,1],["LIV",false,4],["IPS",true,1],["AVL",false,3]],
  EVE: [["CRY",true,3],["BOU",false,3],["MUN",true,4],["TOT",false,3],["HUL",true,1],["ARS",true,4],["FUL",false,3],["ARS",true,4]],
  LEE: [["NFO",false,2],["BRE",true,3],["BHA",false,3],["NEW",true,3],["CRY",false,3],["ARS",true,4],["MUN",false,4],["COV",false,2]],
  COV: [["ARS",false,5],["HUL",true,1],["MCI",false,5],["BHA",true,3],["NFO",false,2],["NEW",true,3],["TOT",false,3],["FUL",true,3]],
  HUL: [["MUN",true,4],["COV",false,2],["NEW",true,3],["CHE",false,4],["MCI",true,5],["EVE",false,3],["FUL",true,3],["BOU",false,3]],
  NFO: [["LEE",true,2],["LIV",false,4],["TOT",true,3],["COV",false,2],["BRE",true,3],["CRY",false,3],["ARS",false,4],["IPS",true,2]],
  CRY: [["EVE",false,3],["MUN",false,3],["LEE",true,2],["AVL",false,3],["LEE",true,2],["NFO",true,3],["BHA",false,3],["WHU",true,2]],
  CHE: [["FUL",true,2],["BHA",false,3],["ARS",false,4],["HUL",true,1],["AVL",false,3],["BOU",true,2],["LIV",true,4],["TOT",true,3]],
  BRE: [["TOT",true,3],["LEE",false,3],["SUN",true,2],["BOU",false,3],["NFO",false,3],["AVL",true,3],["WHU",false,2],["LIV",true,4]],
  BOU: [["MCI",false,4],["EVE",true,3],["LIV",true,4],["BRE",true,3],["WHU",false,2],["CHE",false,3],["SUN",true,2],["MUN",false,3]],
  NEW: [["LIV",true,3],["TOT",false,3],["HUL",false,1],["LEE",false,2],["FUL",true,2],["COV",false,2],["AVL",true,3],["BHA",false,3]],
  IPS: [["SUN",true,2],["LIV",false,5],["FUL",true,3],["WHU",true,2],["BHA",false,3],["AVL",true,3],["MCI",false,5],["NFO",false,2]],
  FUL: [["CHE",false,3],["ARS",true,4],["IPS",false,2],["LIV",false,4],["NEW",false,3],["MUN",true,3],["EVE",true,3],["COV",false,2]],
  BHA: [["AVL",true,3],["CHE",true,3],["LEE",true,2],["COV",false,2],["ARS",false,4],["SUN",false,2],["CRY",true,3],["NEW",true,3]],
  AVL: [["BHA",false,3],["WHU",true,2],["FUL",false,3],["CRY",true,3],["CHE",true,3],["IPS",false,2],["NEW",false,3],["MCI",true,4]],
  WHU: [["MCI",true,4],["AVL",false,3],["BOU",true,3],["IPS",false,2],["BOU",true,3],["BRE",true,2],["BRE",false,2],["CRY",false,3]],
};

// ---- Leikmannagrunnur (sáð úr samtalinu). momentum: -100 (fer að lækka) .. +100 (fer að hækka) ----
const DB = [
  // Núverandi lið notanda (15)
  { id:"kinsky", n:"Kinsky", t:"TOT", pos:"GK", price:4.5, proj:135, mom:15 },
  { id:"dubravka", n:"Dúbravka", t:"TOT", pos:"GK", price:4.0, proj:25, mom:-5 },
  { id:"mosquera", n:"Mosquera", t:"ARS", pos:"DEF", price:5.5, proj:105, mom:20 },
  { id:"vvd", n:"Van Dijk", t:"LIV", pos:"DEF", price:6.5, proj:165, mom:30 },
  { id:"shaw", n:"Shaw", t:"MUN", pos:"DEF", price:4.5, proj:100, mom:45 },
  { id:"thomas", n:"Thomas", t:"COV", pos:"DEF", price:4.0, proj:100, mom:35 },
  { id:"hughes", n:"Hughes", t:"HUL", pos:"DEF", price:4.0, proj:88, mom:25 },
  { id:"lefee", n:"Le Fée", t:"SUN", pos:"MID", price:6.0, proj:132, mom:-25 },
  { id:"semenyo", n:"Semenyo", t:"MCI", pos:"MID", price:8.5, proj:164, mom:-40 },
  { id:"bruno", n:"Fernandes", t:"MUN", pos:"MID", price:12.0, proj:200, mom:55 },
  { id:"garner", n:"Garner", t:"EVE", pos:"MID", price:6.0, proj:148, mom:20 },
  { id:"szobo", n:"Szoboszlai", t:"LIV", pos:"MID", price:7.0, proj:166, mom:40 },
  { id:"haaland", n:"Haaland", t:"MCI", pos:"FWD", price:15.5, proj:235, mom:85 },
  { id:"dcl", n:"Calvert-Lewin", t:"LEE", pos:"FWD", price:6.0, proj:152, mom:30 },
  { id:"egeli", n:"Walle Egeli", t:"IPS", pos:"FWD", price:4.5, proj:68, mom:-10 },
  // Skiptamarkmið
  { id:"rice", n:"Rice", t:"ARS", pos:"MID", price:7.5, proj:170, mom:35 },
  { id:"mbeumo", n:"Mbeumo", t:"MUN", pos:"MID", price:8.0, proj:180, mom:60 },
  { id:"ndiaye", n:"Ndiaye", t:"EVE", pos:"MID", price:6.0, proj:138, mom:25 },
  { id:"palmer", n:"Palmer", t:"CHE", pos:"MID", price:9.5, proj:185, mom:30 },
  { id:"guehi", n:"Guéhi", t:"MCI", pos:"DEF", price:6.0, proj:168, mom:20 },
  { id:"gabriel", n:"Gabriel", t:"ARS", pos:"DEF", price:8.0, proj:170, mom:25 },
  { id:"senesi", n:"Senesi", t:"TOT", pos:"DEF", price:6.0, proj:150, mom:15 },
  { id:"mitchell", n:"Mitchell", t:"CRY", pos:"DEF", price:4.5, proj:135, mom:20 },
  { id:"williams", n:"N. Williams", t:"NFO", pos:"DEF", price:5.0, proj:140, mom:40 },
  { id:"raya", n:"Raya", t:"ARS", pos:"GK", price:6.0, proj:154, mom:20 },
  { id:"kelleher", n:"Kelleher", t:"BRE", pos:"GK", price:5.0, proj:140, mom:15 },
  { id:"isak", n:"Isak", t:"LIV", pos:"FWD", price:9.0, proj:170, mom:20 },
  { id:"thiago", n:"Igor Thiago", t:"BRE", pos:"FWD", price:8.0, proj:175, mom:35 },
  { id:"mateta", n:"Mateta", t:"CRY", pos:"FWD", price:7.5, proj:162, mom:20 },
];
const byId = Object.fromEntries(DB.map(p => [p.id, p]));

// Grunnlið: 15 menn með byrjunarliðs-röð (3-5-2) og bekk
const BASE_SQUAD = [
  { id:"kinsky", starter:true,  order:0 },
  { id:"mosquera",starter:true,  order:1 },
  { id:"vvd",     starter:true,  order:2 },
  { id:"shaw",    starter:true,  order:3 },
  { id:"lefee",   starter:true,  order:4 },
  { id:"semenyo", starter:true,  order:5 },
  { id:"bruno",   starter:true,  order:6 },
  { id:"garner",  starter:true,  order:7 },
  { id:"szobo",   starter:true,  order:8 },
  { id:"haaland", starter:true,  order:9 },
  { id:"dcl",     starter:true,  order:10 },
  { id:"dubravka",starter:false, order:11 },
  { id:"thomas",  starter:false, order:12 },
  { id:"hughes",  starter:false, order:13 },
  { id:"egeli",   starter:false, order:14 },
];
const BASE_BANK = 1.5;
const START_ID = "haaland"; // fyrirliði

const FDR = { 1:"#1B7A3D", 2:"#43A047", 3:"#8593A0", 4:"#E5736F", 5:"#C62828" };
const POS_COLOR = { GK:"#E8C15A", DEF:"#35C46A", MID:"#5AA9E6", FWD:"#E5484D" };
const POS_LABEL = { GK:"Markv.", DEF:"Vörn", MID:"Miðja", FWD:"Sókn" };

// ---- Persistence (fellur á minni ef window.storage ekki til) ----
async function saveState(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch (e) {}
}
async function loadState(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch (e) { return null; }
}

export default function App() {
  const [entryId, setEntryId] = useState(null);
  const [urlInput, setUrlInput] = useState("");
  const [gw, setGw] = useState(1);
  const [plan, setPlan] = useState([]); // {gw, outId, inId}
  const [captain, setCaptain] = useState(START_ID);
  const [toast, setToast] = useState(null);
  const [draft, setDraft] = useState({ gw:3, outId:"", inId:"" });
  const [loaded, setLoaded] = useState(false);
  const [odds, setOdds] = useState(null);      // { TEAM: {cs, xg, opp, home} }
  const [oddsState, setOddsState] = useState("idle"); // idle|loading|ok|off|error

  // Sækja lifandi bókmakera-CS% gegnum proxy (næstu umferðir sem hafa markaði)
  useEffect(() => {
    if (!PROXY_URL) { setOddsState("off"); return; }
    (async () => {
      setOddsState("loading");
      try {
        const r = await fetch(`${PROXY_URL}?path=odds`);
        const d = await r.json();
        if (d.error || !d.games?.length) { setOddsState(d.games?.length ? "ok" : "off"); }
        const map = {};
        (d.games||[]).forEach(g => {
          map[g.home] = { cs:g.homeCS, xg:g.homeXG, opp:g.away, home:true, exp:g.expTotalGoals };
          map[g.away] = { cs:g.awayCS, xg:g.awayXG, opp:g.home, home:false, exp:g.expTotalGoals };
        });
        setOdds(map);
        setOddsState(d.games?.length ? "ok" : "off");
      } catch { setOddsState("error"); }
    })();
  }, []);

  // Sækja vistað ástand
  useEffect(() => {
    (async () => {
      const s = await loadState("fpl_planner_v1");
      if (s) { setEntryId(s.entryId ?? null); setPlan(s.plan ?? []); setCaptain(s.captain ?? START_ID); }
      setLoaded(true);
    })();
  }, []);
  // Vista við breytingar
  useEffect(() => { if (loaded) saveState("fpl_planner_v1", { entryId, plan, captain }); }, [entryId, plan, captain, loaded]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  function connect() {
    const m = urlInput.match(/entry\/(\d+)/) || urlInput.match(/(\d{5,})/);
    if (m) { setEntryId(m[1]); flash(`Lið tengt (ID ${m[1]}). Sótti þitt vistaða lið.`); }
    else flash("Fann ekki lið-ID í hlekknum. Límdu FPL 'Points'/'entry' hlekkinn þinn.");
  }

  // Reikna lið EINS OG ÞAÐ VERÐUR í valdri GW (beitir öllum skiptum með gw <= valin)
  const { squad, bank, appliedThisGw } = useMemo(() => {
    let sq = BASE_SQUAD.map(s => ({ ...s }));
    let b = BASE_BANK;
    const applied = [];
    const ordered = [...plan].sort((a,z) => a.gw - z.gw);
    for (const tr of ordered) {
      if (tr.gw > gw) continue;
      const idx = sq.findIndex(s => s.id === tr.outId);
      if (idx === -1) continue;
      b += (byId[tr.outId]?.price ?? 0) - (byId[tr.inId]?.price ?? 0);
      sq[idx] = { ...sq[idx], id: tr.inId };
      if (tr.gw === gw) applied.push(tr);
    }
    return { squad: sq, bank: Math.round(b*10)/10, appliedThisGw: applied };
  }, [plan, gw]);

  const squadIds = new Set(squad.map(s => s.id));
  const teamCounts = useMemo(() => {
    const c = {}; squad.forEach(s => { const t = byId[s.id].t; c[t] = (c[t]||0)+1; }); return c;
  }, [squad]);

  const projTotal = useMemo(() => squad.filter(s=>s.starter)
    .reduce((a,s)=> a + (byId[s.id].proj/38) * (s.id===captain?2:1), 0), [squad, captain]);

  const starters = squad.filter(s => s.starter).sort((a,z)=>a.order-z.order);
  const bench = squad.filter(s => !s.starter).sort((a,z)=>a.order-z.order);
  const rows = { GK:[], DEF:[], MID:[], FWD:[] };
  starters.forEach(s => rows[byId[s.id].pos].push(s));

  function addTransfer() {
    if (!draft.outId || !draft.inId) { flash("Veldu bæði leikmann út og inn."); return; }
    const outP = byId[draft.outId], inP = byId[draft.inId];
    if (outP.pos !== inP.pos) { flash("Skiptin verða að vera í sömu stöðu."); return; }
    setPlan(p => [...p, { gw:draft.gw, outId:draft.outId, inId:draft.inId }]);
    setDraft(d => ({ ...d, outId:"", inId:"" }));
    flash(`Skipti sett á GW${draft.gw}: ${outP.n} → ${inP.n}`);
  }
  function removeTransfer(i) { setPlan(p => p.filter((_,j)=>j!==i)); }
  function loadRecommended() {
    setPlan([
      { gw:1, outId:"semenyo", inId:"mbeumo" },
      { gw:3, outId:"lefee", inId:"rice" },
    ]);
    setCaptain("haaland");
    flash("Hlóð ráðlögðu áætluninni: Semenyo→Mbeumo (GW1), Le Fée→Rice (GW3).");
  }

  // Lið-samsetning fyrir valda GW (til að byggja 'út' valmynd)
  const squadAtDraftGw = useMemo(() => {
    let sq = BASE_SQUAD.map(s=>({...s}));
    [...plan].sort((a,z)=>a.gw-z.gw).forEach(tr => {
      if (tr.gw >= draft.gw) return;
      const i = sq.findIndex(s=>s.id===tr.outId); if(i>=0) sq[i]={...sq[i],id:tr.inId};
    });
    return sq;
  }, [plan, draft.gw]);
  const outOptions = squadAtDraftGw.map(s=>byId[s.id]);
  const outPos = draft.outId ? byId[draft.outId].pos : null;
  const inOptions = DB.filter(p => p.pos===outPos && !squadAtDraftGw.some(s=>s.id===p.id));

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* Haus */}
      <header style={S.header}>
        <div>
          <div style={S.kicker}>Fantasy Premier League · 2026/27</div>
          <h1 style={S.h1}>Liðsplönun</h1>
        </div>
        <div style={S.connectBox}>
          <input
            style={S.input}
            placeholder="Límdu FPL lið-hlekkinn þinn…"
            value={urlInput}
            onChange={e=>setUrlInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&connect()}
          />
          <button style={S.saveBtn} onClick={connect}>Vista lið</button>
          {entryId && <span style={S.connected}>● ID {entryId}</span>}
        </div>
      </header>

      {/* Tímalína — undirskrift appsins */}
      <div style={S.timelineWrap}>
        <div style={S.timelineLabel}>Umferð</div>
        <div style={S.timeline}>
          <div style={S.track} />
          {Array.from({length:8},(_,i)=>i+1).map(n=>{
            const has = plan.some(t=>t.gw===n);
            const active = n===gw;
            return (
              <button key={n} onClick={()=>setGw(n)} style={{...S.node, ...(active?S.nodeActive:{})}}>
                <span style={S.nodeNum}>{n}</span>
                {has && <span style={{...S.nodeDot, ...(active?{background:"#0B1622"}:{})}} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mælaborð */}
      <div style={S.stats}>
        <Stat label={`Banki (GW${gw})`} value={`£${bank.toFixed(1)}`} tone={bank<0?"bad":"ok"} />
        <Stat label="Spá / vika" value={projTotal.toFixed(1)} sub="XI + fyrirliði ×2" />
        <Stat label="Skipti í áætlun" value={plan.length} sub={`${plan.filter(t=>t.gw<=gw).length} virk núna`} />
        <Stat label="Mest frá félagi" value={Math.max(...Object.values(teamCounts))+"/3"} tone={Math.max(...Object.values(teamCounts))>3?"bad":"ok"} />
      </div>

      <div style={S.oddsBar}>
        <span style={S.oddsDot(oddsState)} />
        {oddsState==="ok"   && <span>Bókmakera-CS% virkt — leikja-flísar litaðar eftir hreint-líkum (grænt ≥50%, gult 30–49%, rautt {"<"}30%).</span>}
        {oddsState==="loading" && <span>Sæki bókmakera-línur…</span>}
        {oddsState==="off"  && <span>Bókmakera-CS% óvirkt — sýni FDR + spá. Tengdu Netlify-proxy (PROXY_URL) til að kveikja á lifandi CS%.</span>}
        {oddsState==="error"&& <span>Náði ekki í bókmakera-línur. Athugaðu proxy-slóð og ODDS_API_KEY á Netlify.</span>}
        {oddsState==="idle" && <span>Bókmakera-CS% óvirkt.</span>}
      </div>

      {appliedThisGw.length>0 && (
        <div style={S.gwNote}>
          GW{gw}: {appliedThisGw.map(t=>`${byId[t.outId].n} → ${byId[t.inId].n}`).join(" · ")} — liðið að neðan sýnir stöðuna EFTIR skiptin.
        </div>
      )}

      <div style={S.main}>
        {/* Völlur */}
        <div style={S.pitch}>
          <div style={S.pitchInner}>
            {["GK","DEF","MID","FWD"].map(pos=>(
              <div key={pos} style={S.rowLine}>
                {rows[pos].map(s=>(
                  <PlayerCard key={s.id} p={byId[s.id]} gw={gw} captain={captain} odds={odds}
                    onCap={()=>setCaptain(s.id)} />
                ))}
              </div>
            ))}
          </div>
          <div style={S.benchWrap}>
            <div style={S.benchLabel}>Bekkur</div>
            <div style={S.benchRow}>
              {bench.map(s=>(
                <PlayerCard key={s.id} p={byId[s.id]} gw={gw} captain={captain} bench odds={odds}
                  onCap={()=>setCaptain(s.id)} />
              ))}
            </div>
          </div>
        </div>

        {/* Hliðarstika */}
        <div style={S.side}>
          {/* Skiptaplönun */}
          <section style={S.panel}>
            <div style={S.panelHead}>
              <h2 style={S.h2}>Framtíðar-skipti</h2>
              <button style={S.ghostBtn} onClick={loadRecommended}>Hlaða ráðlögðu</button>
            </div>

            <div style={S.transferForm}>
              <div style={S.formRow}>
                <label style={S.lbl}>Umferð</label>
                <select style={S.select} value={draft.gw} onChange={e=>setDraft(d=>({...d,gw:+e.target.value,outId:"",inId:""}))}>
                  {Array.from({length:8},(_,i)=>i+1).map(n=><option key={n} value={n}>GW{n}</option>)}
                </select>
              </div>
              <div style={S.formRow}>
                <label style={S.lbl}>Út</label>
                <select style={S.select} value={draft.outId} onChange={e=>setDraft(d=>({...d,outId:e.target.value,inId:""}))}>
                  <option value="">— veldu —</option>
                  {outOptions.map(p=><option key={p.id} value={p.id}>{p.n} ({POS_LABEL[p.pos]}, £{p.price})</option>)}
                </select>
              </div>
              <div style={S.formRow}>
                <label style={S.lbl}>Inn</label>
                <select style={S.select} value={draft.inId} onChange={e=>setDraft(d=>({...d,inId:e.target.value}))} disabled={!draft.outId}>
                  <option value="">{draft.outId?"— veldu —":"veldu 'út' fyrst"}</option>
                  {inOptions.map(p=><option key={p.id} value={p.id}>{p.n} (£{p.price}, spá {p.proj})</option>)}
                </select>
              </div>
              {draft.outId && draft.inId && (
                <div style={S.diffBox}>
                  <span>Kostn.breyt: <b style={{color: (byId[draft.outId].price-byId[draft.inId].price)>=0?"#35C46A":"#E5484D"}}>
                    £{(byId[draft.outId].price-byId[draft.inId].price).toFixed(1)}</b></span>
                  <span>Spá-breyt: <b style={{color:(byId[draft.inId].proj-byId[draft.outId].proj)>=0?"#35C46A":"#E5484D"}}>
                    {(byId[draft.inId].proj-byId[draft.outId].proj)>=0?"+":""}{byId[draft.inId].proj-byId[draft.outId].proj}</b></span>
                </div>
              )}
              <button style={S.addBtn} onClick={addTransfer}>Bæta skiptum við áætlun</button>
            </div>

            <div style={S.planList}>
              {[...plan].sort((a,z)=>a.gw-z.gw).map((t,i)=>{
                const realIdx = plan.indexOf(t);
                const inFix = FIX[byId[t.inId].t]?.[t.gw-1];
                return (
                  <div key={i} style={S.planItem}>
                    <span style={S.planGw}>GW{t.gw}</span>
                    <div style={S.planBody}>
                      <div><span style={{color:"#E5736F"}}>{byId[t.outId].n}</span> → <span style={{color:"#35C46A"}}>{byId[t.inId].n}</span></div>
                      {inFix && (
                        <div style={S.planFix}>
                          {byId[t.inId].n} GW{t.gw}: <FixChip fx={inFix} inline />
                        </div>
                      )}
                    </div>
                    <button style={S.rmBtn} onClick={()=>removeTransfer(realIdx)}>✕</button>
                  </div>
                );
              })}
              {plan.length===0 && <div style={S.empty}>Engin skipti í áætlun. Bættu við að ofan eða hlaðið ráðlögðu áætluninni.</div>}
            </div>
          </section>

          {/* Verðhækkunar-mælir */}
          <section style={S.panel}>
            <h2 style={S.h2}>Verðbreytingar — hversu nálægt?</h2>
            <div style={S.priceNote}>Speglar flöggin á opinberu FPL / verð-vöktun. Tengist lifandi gögnum þegar bakendi er á.</div>
            <div style={S.priceList}>
              {squad.map(s=>byId[s.id]).sort((a,b)=>b.mom-a.mom).map(p=>(
                <div key={p.id} style={S.priceRow}>
                  <span style={S.priceName}>{p.n}</span>
                  <span style={S.pricePr}>£{p.price.toFixed(1)}</span>
                  <MomentumGauge mom={p.mom} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <footer style={S.footer}>
        Gögn sáð úr greiningu okkar (verð, spár, leikir GW1–8, verðbreytinga-rök). GW1 staðfest; GW2–8 lesin af ticker.
        Lifandi verð/stig/leikir krefjast bakenda vegna CORS — plönunar-vélin virkar að fullu án hans.
      </footer>

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

function Stat({ label, value, sub, tone }) {
  return (
    <div style={S.statCard}>
      <div style={S.statLabel}>{label}</div>
      <div style={{...S.statValue, color: tone==="bad"?"#E5484D":tone==="ok"?"#EAF0F6":"#EAF0F6"}}>{value}</div>
      {sub && <div style={S.statSub}>{sub}</div>}
    </div>
  );
}

function PlayerCard({ p, gw, captain, bench, onCap, odds }) {
  const fx = FIX[p.t]?.[gw-1];
  const isCap = p.id===captain;
  const live = odds?.[p.t];                       // lifandi bókmakera-gögn fyrir lið mannsins
  const isDefensive = p.pos==="GK" || p.pos==="DEF";
  return (
    <div style={{...S.card, ...(bench?S.cardBench:{}), borderTopColor: POS_COLOR[p.pos]}}>
      <button style={{...S.capBtn, ...(isCap?S.capOn:{})}} onClick={onCap} title="Setja sem fyrirliða">
        {isCap?"C":"c"}
      </button>
      <div style={S.cardName}>{p.n}</div>
      <div style={S.cardMeta}>{p.t} · £{p.price.toFixed(1)}</div>
      {fx ? <FixChip fx={fx} live={live} /> : <div style={S.noFix}>—</div>}
      {live ? (
        isDefensive
          ? <div style={{...S.liveLine, color:csColor(live.cs)}}>CS {live.cs}%</div>
          : <div style={S.liveLine}>{live.xg} vænt mörk</div>
      ) : (
        <div style={S.cardProj}>{Math.round(p.proj/38*10)/10} spá/vika</div>
      )}
    </div>
  );
}

function FixChip({ fx, inline, live }) {
  const [opp, home, fdr] = fx;
  // Ef lifandi CS% er til fyrir þennan leik, litum eftir því; annars FDR.
  const bg = (live && live.cs != null) ? csColor(live.cs) : FDR[fdr];
  return (
    <span style={{...S.fixChip, background:bg, ...(inline?{padding:"1px 6px"}:{})}}>
      {opp}{home?" (H)":" (A)"}
    </span>
  );
}

function MomentumGauge({ mom }) {
  const pct = Math.min(100, Math.abs(mom));
  const rising = mom >= 0;
  const near = pct >= 75;
  return (
    <div style={S.gauge}>
      <div style={S.gaugeTrack}>
        <div style={S.gaugeCenter} />
        <div style={{
          position:"absolute", top:0, bottom:0,
          left: rising?"50%":`${50 - pct/2}%`,
          width:`${pct/2}%`,
          background: rising ? (near?"#F5A623":"#35C46A") : "#E5484D",
          borderRadius:2,
        }} />
      </div>
      <span style={{...S.gaugeLabel, color: rising?(near?"#F5A623":"#35C46A"):"#E5484D"}}>
        {near ? (rising?"Hækkar senn":"Lækkar senn") : (rising?"↑ "+pct+"%":"↓ "+pct+"%")}
      </span>
    </div>
  );
}

/* ================= STÍLL ================= */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap');
* { box-sizing: border-box; }
select, input, button { font-family: inherit; }
@media (prefers-reduced-motion: no-preference) {
  .fpl-fade { animation: fade .25s ease; }
}
@keyframes fade { from{opacity:0; transform:translateY(4px);} to{opacity:1; transform:none;} }
`;

const mono = "'IBM Plex Mono', ui-monospace, monospace";
const sans = "'Archivo', system-ui, -apple-system, sans-serif";

const S = {
  root: { fontFamily: sans, background:"#0B1622", color:"#EAF0F6", minHeight:"100vh", padding:"20px", maxWidth:1180, margin:"0 auto" },
  header: { display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:16, flexWrap:"wrap", marginBottom:18 },
  kicker: { fontFamily:mono, fontSize:11, letterSpacing:2, textTransform:"uppercase", color:"#5AA9E6", marginBottom:4 },
  h1: { fontFamily:sans, fontWeight:800, fontSize:34, margin:0, letterSpacing:-1, lineHeight:0.95 },
  connectBox: { display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" },
  input: { background:"#12212F", border:"1px solid #22384A", color:"#EAF0F6", padding:"9px 12px", borderRadius:8, width:240, fontSize:13, outline:"none" },
  saveBtn: { background:"#35C46A", color:"#06120A", border:"none", padding:"9px 16px", borderRadius:8, fontWeight:700, cursor:"pointer", fontSize:13 },
  connected: { fontFamily:mono, fontSize:12, color:"#35C46A" },

  timelineWrap: { display:"flex", alignItems:"center", gap:14, marginBottom:16, background:"#0E1B2A", border:"1px solid #1B2E3F", borderRadius:12, padding:"12px 16px" },
  timelineLabel: { fontFamily:mono, fontSize:11, letterSpacing:1.5, textTransform:"uppercase", color:"#7E93A3", whiteSpace:"nowrap" },
  timeline: { position:"relative", display:"flex", justifyContent:"space-between", flex:1, alignItems:"center" },
  track: { position:"absolute", left:14, right:14, height:2, background:"#22384A", top:"50%" },
  node: { position:"relative", width:38, height:38, borderRadius:"50%", border:"1px solid #22384A", background:"#12212F", color:"#7E93A3", cursor:"pointer", fontFamily:mono, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .18s" },
  nodeActive: { background:"#35C46A", color:"#06120A", borderColor:"#35C46A", transform:"scale(1.12)", boxShadow:"0 0 0 4px rgba(53,196,106,0.15)" },
  nodeNum: { fontSize:14 },
  nodeDot: { position:"absolute", bottom:4, width:5, height:5, borderRadius:"50%", background:"#F5A623" },

  stats: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 },
  statCard: { background:"#0E1B2A", border:"1px solid #1B2E3F", borderRadius:12, padding:"12px 14px" },
  statLabel: { fontFamily:mono, fontSize:10.5, letterSpacing:1, textTransform:"uppercase", color:"#7E93A3" },
  statValue: { fontFamily:mono, fontSize:24, fontWeight:600, marginTop:3 },
  statSub: { fontSize:11, color:"#7E93A3", marginTop:2 },

  gwNote: { background:"rgba(90,169,230,0.1)", border:"1px solid #234a63", color:"#9fc7e8", borderRadius:8, padding:"8px 12px", fontSize:12.5, marginBottom:14 },

  oddsBar: { display:"flex", alignItems:"center", gap:9, fontSize:12, color:"#9fb0bd", background:"#0E1B2A", border:"1px solid #1B2E3F", borderRadius:8, padding:"8px 12px", marginBottom:14 },
  oddsDot: (st) => ({ width:8, height:8, borderRadius:"50%", flexShrink:0,
    background: st==="ok"?"#35C46A":st==="loading"?"#E0A500":st==="error"?"#E5484D":"#5f7385",
    boxShadow: st==="ok"?"0 0 0 3px rgba(53,196,106,0.2)":"none" }),
  liveLine: { fontFamily:mono, fontSize:11, fontWeight:600, marginTop:5, color:"#9fb0bd" },

  main: { display:"grid", gridTemplateColumns:"1.35fr 1fr", gap:16, alignItems:"start" },

  pitch: { background:"linear-gradient(180deg,#0d2418,#0a1c13)", border:"1px solid #17402a", borderRadius:16, padding:"18px 14px" },
  pitchInner: { display:"flex", flexDirection:"column", gap:14 },
  rowLine: { display:"flex", justifyContent:"center", gap:8, flexWrap:"wrap" },
  card: { position:"relative", background:"#0E1B2A", border:"1px solid #22384A", borderTop:"3px solid #35C46A", borderRadius:10, padding:"8px 8px 7px", width:92, textAlign:"center" },
  cardBench: { opacity:0.9, width:86 },
  capBtn: { position:"absolute", top:5, right:5, width:18, height:18, borderRadius:"50%", border:"1px solid #22384A", background:"#0B1622", color:"#7E93A3", fontSize:10, fontWeight:700, cursor:"pointer", lineHeight:1, padding:0 },
  capOn: { background:"#E8C15A", color:"#3a2d05", borderColor:"#E8C15A" },
  cardName: { fontWeight:700, fontSize:12.5, lineHeight:1.1, marginTop:2 },
  cardMeta: { fontFamily:mono, fontSize:10, color:"#7E93A3", margin:"2px 0 5px" },
  fixChip: { display:"inline-block", fontFamily:mono, fontSize:10.5, fontWeight:600, color:"#fff", padding:"2px 7px", borderRadius:5 },
  noFix: { fontFamily:mono, fontSize:11, color:"#7E93A3" },
  cardProj: { fontFamily:mono, fontSize:9.5, color:"#5f7385", marginTop:5 },

  benchWrap: { marginTop:16, borderTop:"1px dashed #17402a", paddingTop:12 },
  benchLabel: { fontFamily:mono, fontSize:10.5, letterSpacing:1.5, textTransform:"uppercase", color:"#6f8a76", marginBottom:8, textAlign:"center" },
  benchRow: { display:"flex", justifyContent:"center", gap:8, flexWrap:"wrap" },

  side: { display:"flex", flexDirection:"column", gap:16 },
  panel: { background:"#0E1B2A", border:"1px solid #1B2E3F", borderRadius:14, padding:16 },
  panelHead: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 },
  h2: { fontFamily:sans, fontWeight:700, fontSize:16, margin:0 },
  ghostBtn: { background:"transparent", border:"1px solid #2f5a3e", color:"#35C46A", padding:"5px 10px", borderRadius:7, fontSize:11.5, cursor:"pointer", fontWeight:600 },

  transferForm: { display:"flex", flexDirection:"column", gap:8, marginBottom:14 },
  formRow: { display:"flex", alignItems:"center", gap:10 },
  lbl: { fontFamily:mono, fontSize:11, color:"#7E93A3", width:48, textTransform:"uppercase", letterSpacing:1 },
  select: { flex:1, background:"#12212F", border:"1px solid #22384A", color:"#EAF0F6", padding:"7px 9px", borderRadius:7, fontSize:12.5, outline:"none" },
  diffBox: { display:"flex", justifyContent:"space-between", fontFamily:mono, fontSize:12, color:"#9fb0bd", background:"#0B1622", padding:"7px 10px", borderRadius:7, border:"1px solid #1B2E3F" },
  addBtn: { background:"#5AA9E6", color:"#04121e", border:"none", padding:"9px", borderRadius:8, fontWeight:700, cursor:"pointer", fontSize:13, marginTop:2 },

  planList: { display:"flex", flexDirection:"column", gap:7 },
  planItem: { display:"flex", alignItems:"center", gap:10, background:"#0B1622", border:"1px solid #1B2E3F", borderRadius:8, padding:"8px 10px" },
  planGw: { fontFamily:mono, fontSize:11, fontWeight:600, color:"#F5A623", background:"rgba(245,166,35,0.12)", padding:"3px 7px", borderRadius:5, whiteSpace:"nowrap" },
  planBody: { flex:1, fontSize:13 },
  planFix: { fontFamily:mono, fontSize:10.5, color:"#7E93A3", marginTop:3, display:"flex", alignItems:"center", gap:5 },
  rmBtn: { background:"transparent", border:"none", color:"#5f7385", cursor:"pointer", fontSize:13, padding:4 },
  empty: { fontSize:12.5, color:"#7E93A3", fontStyle:"italic", textAlign:"center", padding:"10px 0" },

  priceNote: { fontSize:11.5, color:"#7E93A3", margin:"2px 0 12px", lineHeight:1.4 },
  priceList: { display:"flex", flexDirection:"column", gap:8 },
  priceRow: { display:"grid", gridTemplateColumns:"1fr auto 130px", gap:10, alignItems:"center" },
  priceName: { fontSize:12.5, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  pricePr: { fontFamily:mono, fontSize:11.5, color:"#9fb0bd" },
  gauge: { display:"flex", alignItems:"center", gap:7 },
  gaugeTrack: { position:"relative", flex:1, height:8, background:"#12212F", borderRadius:4, border:"1px solid #1B2E3F", overflow:"hidden" },
  gaugeCenter: { position:"absolute", left:"50%", top:0, bottom:0, width:1, background:"#3a4f60" },
  gaugeLabel: { fontFamily:mono, fontSize:10, fontWeight:600, whiteSpace:"nowrap", width:66, textAlign:"right" },

  footer: { marginTop:20, fontSize:11, color:"#5f7385", lineHeight:1.5, borderTop:"1px solid #1B2E3F", paddingTop:12 },
  toast: { position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", background:"#12212F", border:"1px solid #35C46A", color:"#EAF0F6", padding:"10px 18px", borderRadius:10, fontSize:13, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", zIndex:50 },
};
