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

// SAMSETT varnar-einkunn: CS% er kjölfestan, xGA (vænt mörk á sig) gefur
// hóflega ±12 leiðréttingu. Meðal-xGA ~1.4: betri vörn = bónus, verri = refsing.
// Grænt ≥38, gult 24–37, rautt <24 á samsettu.
function defScore(cs, xga) {
  if (cs == null) return null;
  if (xga == null) return cs;
  const adj = Math.max(-12, Math.min(12, (1.4 - xga) * 20));
  return Math.round(cs + adj);
}
function defColor(cs, xga) {
  const s = defScore(cs, xga);
  if (s == null) return null;
  if (s >= 38) return "#1B7A3D";   // grænt: sterk vörn (CS% + lágt xGA)
  if (s >= 24) return "#E0A500";   // gult: eðlilegt
  return "#C62828";                 // rautt: veik vörn (lágt CS% og/eða hátt xGA)
}
// CS% -> litur (notað þar sem aðeins CS% á við). Mörk notanda: 40/25.
function csColor(pct) {
  if (pct == null) return null;
  if (pct >= 40) return "#1B7A3D";
  if (pct >= 25) return "#E0A500";
  return "#C62828";
}

// ---- Félagslitir: [aðal, auka, mynstur] fyrir teiknaðar treyjur (löglegt: bara litir) ----
const KIT = {
  ARS:["#EF0107","#FFFFFF","sleeves"], MCI:["#6CABDD","#1C2C5B","plain"],
  LIV:["#C8102E","#FFFFFF","plain"],   MUN:["#DA020E","#000000","plain"],
  TOT:["#FFFFFF","#132257","plain"],   CHE:["#034694","#FFFFFF","plain"],
  ARS2:["#EF0107","#FFFFFF","sleeves"],NEW:["#241F20","#FFFFFF","stripes"],
  SUN:["#EB172B","#FFFFFF","stripes"], EVE:["#003399","#FFFFFF","plain"],
  LEE:["#FFFFFF","#1D428A","plain"],   NFO:["#DD0000","#FFFFFF","plain"],
  COV:["#4B92DB","#FFFFFF","plain"],   HUL:["#F5A12D","#000000","stripes"],
  IPS:["#3A64A3","#FFFFFF","plain"],   BOU:["#D31F26","#000000","stripes"],
  CRY:["#1B458F","#C4122E","stripes"], BHA:["#0057B8","#FFFFFF","stripes"],
  FUL:["#FFFFFF","#000000","plain"],   BRE:["#E30613","#FFFFFF","stripes"],
  AVL:["#95BFE5","#670E36","plain"],   WHU:["#7A263A","#1BB1E7","plain"],
};

function Kit({ team, size=34 }) {
  const [main, accent, pattern] = KIT[team] || ["#556","#889","plain"];
  const w = size, h = size*0.9;
  return (
    <svg width={w} height={h} viewBox="0 0 40 36" style={{display:"block"}}>
      {/* treyju-form */}
      <path d="M13 3 L20 6 L27 3 L34 8 L31 14 L28 12 L28 33 L12 33 L12 12 L9 14 L6 8 Z"
        fill={main} stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" strokeLinejoin="round"/>
      {pattern==="stripes" && [15,19,23].map(x=>(
        <rect key={x} x={x} y="12" width="2" height="21" fill={accent} opacity="0.9"/>
      ))}
      {pattern==="sleeves" && <>
        <path d="M13 3 L9 14 L6 8 Z" fill={accent}/>
        <path d="M27 3 L31 14 L34 8 Z" fill={accent}/>
      </>}
      {/* kragi */}
      <path d="M17 4 L20 7 L23 4" fill="none" stroke={accent} strokeWidth="1.2"/>
    </svg>
  );
}

// ---- Leikjadagskrá GW1–8: [andstæðingur, heima?, FDR 1(létt)–5(þungt)] ----
// GW1 staðfest af notanda. GW2–8 lesin af FFS ticker (staðfestist gegn lifandi gögnum).
// Landsleikjahlé: hlé kemur Á EFTIR þessum umferðum (staðfest gegn opinberri dagskrá).
// 2026/27: hlé eftir GW3 (sept) og GW7 (okt) á fyrstu 8 umferðunum.
const INTL_BREAK_AFTER = [3, 7];

// Chips: hver má nota einu sinni (á fyrri helmingi tímabils). label + stutt ikon + litur.
const CHIPS = {
  wildcard: { label:"Wildcard",     short:"WC", color:"#E5484D", desc:"Ótakmörkuð skipti, engin refsing" },
  freehit:  { label:"Free Hit",     short:"FH", color:"#5AA9E6", desc:"Lið eina viku, fer svo til baka" },
  bboost:   { label:"Bench Boost",  short:"BB", color:"#35C46A", desc:"Bekkurinn skorar líka" },
  "3xc":    { label:"Triple Captain",short:"TC", color:"#E8C15A", desc:"Fyrirliði ×3 í stað ×2" },
};

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

// ---- FPL félagsmerki-kóðar (stöðugir 'code' úr bootstrap teams). Merki-slóð frá opinberu FPL-CDN. ----
const CREST_CODE = {
  ARS:3, AVL:7, BOU:91, BRE:94, BHA:36, CHE:8, CRY:31, EVE:11, FUL:54,
  LIV:14, MCI:43, MUN:1, NEW:4, NFO:17, TOT:6, WHU:21, SUN:56,
  COV:96, HUL:88, IPS:40, LEE:2,
};
function crestUrl(team) {
  const c = CREST_CODE[team];
  return c ? `https://resources.premierleague.com/premierleague/badges/50/t${c}.png` : null;
}
// Leikmannamynd: þarf FPL element 'code' (fyllt úr bootstrap þegar lifandi tenging er á).
function photoUrl(code) {
  return code ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png` : null;
}

// ---- Alias: nákvæm FPL web_name afbrigði fyrir hvern leikmann (öryggisnet fyrir pörun) ----
// Lið+staða eru þegar hörð sía; þetta grípur nafna-afbrigði (styttingar, upphafsstafi, rithátt).
const ALIAS = {
  vvd:["Van Dijk","Virgil"], bruno:["B.Fernandes","Fernandes","Bruno Fernandes"],
  dcl:["Calvert-Lewin","Calvert Lewin"], lefee:["Le Fée","Le Fee"],
  guehi:["Guéhi","Guehi"], szobo:["Szoboszlai"], egeli:["Egeli","Walle Egeli","W.Egeli"],
  thomas:["B.Thomas","Thomas"], hughes:["C.Hughes","Hughes"], williams:["N.Williams","Williams"],
  thiago:["I.Thiago","Thiago","Igor Thiago"], kinsky:["Kinský","Kinsky"], dubravka:["Dúbravka","Dubravka"],
  mitchell:["Mitchell"], mateta:["Mateta"], ndiaye:["Ndiaye","I.Ndiaye"],
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
  const [sellGw, setSellGw] = useState(1);   // í hvaða umferð skiptin gerast
  const [selling, setSelling] = useState(null); // dbId leikmanns sem á að selja (opnar leitarglugga)
  const [searchQ, setSearchQ] = useState("");   // leitartexti
  const [loaded, setLoaded] = useState(false);
  const [odds, setOdds] = useState(null);      // { TEAM: {cs, xg, opp, home} }
  const [oddsState, setOddsState] = useState("idle"); // idle|loading|ok|off|error
  const [benchSwaps, setBenchSwaps] = useState({}); // { gw: [[starterId, benchId], ...] }
  const [dragId, setDragId] = useState(null);       // hvaða spjald er dregið
  const [vice, setVice] = useState(null);           // varafyrirliði (dbId)
  const [actualPts, setActualPts] = useState(null); // raun-stig liðsins í valdri GW (úr FPL entry)
  const [livePts, setLivePts] = useState(null);     // live stig meðan leikir standa
  const [chips, setChips] = useState({});           // { gw: "wildcard"|"bboost"|"3xc"|"freehit" }

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
          // xGA (vænt mörk á sig) = vænt mörk ANDSTÆÐINGSINS
          map[g.home] = { cs:g.homeCS, xg:g.homeXG, xga:g.awayXG, opp:g.away, home:true, exp:g.expTotalGoals };
          map[g.away] = { cs:g.awayCS, xg:g.awayXG, xga:g.homeXG, opp:g.home, home:false, exp:g.expTotalGoals };
        });
        setOdds(map);
        setOddsState(d.games?.length ? "ok" : "off");
      } catch { setOddsState("error"); }
    })();
  }, []);

  // Sækja FPL bootstrap: lifandi verð + leikmannamynd-kóðar (paraðir við DB eftir nafni+liði)
  const [live, setLive] = useState({}); // { dbId: { photo, price } }
  const [liveState, setLiveState] = useState("idle");
  useEffect(() => {
    if (!PROXY_URL) { setLiveState("off"); return; }
    (async () => {
      setLiveState("loading");
      try {
        const r = await fetch(`${PROXY_URL}?path=fpl-bootstrap`);
        const d = await r.json();
        if (!d.elements) { setLiveState("off"); return; }
        // FPL team id -> okkar kóði
        const teamCode = {}; (d.teams||[]).forEach(t => { teamCode[t.id] = t.short_name; });
        const norm = s => (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"");
        // FPL staða: 1=GK 2=DEF 3=MID 4=FWD -> okkar
        const posMap = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };
        const map = {};
        for (const p of DB) {
          const targets = [norm(p.n), ...(ALIAS[p.id]||[]).map(norm)]; // nafn + handvirk alias
          // HÖRÐ sía: sama lið OG sama staða. Kemur í veg fyrir rangan 'Fernandes'/'Thomas'.
          const pool = d.elements.filter(e => teamCode[e.team]===p.t && posMap[e.element_type]===p.pos);
          let cand = null;
          // 1) nákvæm pörun á web_name
          cand = pool.find(e => targets.includes(norm(e.web_name)));
          // 2) web_name inniheldur eða er innihaldið í markmiði
          if (!cand) cand = pool.find(e => targets.some(t => norm(e.web_name).includes(t) || t.includes(norm(e.web_name))));
          // 3) fullt nafn inniheldur markmið (síðasta úrræði, en lið+staða þrengja)
          if (!cand) cand = pool.find(e => targets.some(t => norm(e.first_name+e.second_name).includes(t)));
          // 4) ef aðeins EINN leikmaður er eftir í pool (t.d. eini FWD hjá nýliða) — treystu því
          if (!cand && pool.length===1) cand = pool[0];
          if (cand) map[p.id] = { photo: photoUrl(cand.code), price: cand.now_cost/10, matched: cand.web_name };
          else map[p.id] = { photo: null, price: null, matched: null }; // enginn fundinn -> fallback treyja
        }
        setLive(map);
        setLiveState("ok");
      } catch { setLiveState("error"); }
    })();
  }, []);

  // Sækja raun-stig liðsins fyrir valda GW (úr FPL picks) þegar lið er tengt
  useEffect(() => {
    if (!PROXY_URL || !entryId) { setActualPts(null); setLivePts(null); return; }
    (async () => {
      try {
        const r = await fetch(`${PROXY_URL}?path=fpl-picks&id=${entryId}&gw=${gw}`);
        const d = await r.json();
        const pts = d?.entry_history?.points;
        setActualPts(pts != null ? pts : null);
        setLivePts(pts != null ? pts : null);
      } catch { setActualPts(null); setLivePts(null); }
    })();
  }, [entryId, gw]);

  // Sækja vistað ástand
  useEffect(() => {
    (async () => {
      const s = await loadState("fpl_planner_v1");
      if (s) { setEntryId(s.entryId ?? null); setPlan(s.plan ?? []); setCaptain(s.captain ?? START_ID); setBenchSwaps(s.benchSwaps ?? {}); setVice(s.vice ?? null); setChips(s.chips ?? {}); }
      setLoaded(true);
    })();
  }, []);
  // Vista við breytingar
  useEffect(() => { if (loaded) saveState("fpl_planner_v1", { entryId, plan, captain, benchSwaps, vice, chips }); }, [entryId, plan, captain, benchSwaps, vice, chips, loaded]);

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
    // handvirk bekkjar-skipti (drag-and-drop) fyrir þessa GW
    (benchSwaps[gw]||[]).forEach(([aId, bId]) => {
      const a = sq.find(s=>s.id===aId), b = sq.find(s=>s.id===bId);
      if (a && b) { const t=a.starter; a.starter=b.starter; b.starter=t; const o=a.order; a.order=b.order; b.order=o; }
    });
    return { squad: sq, bank: Math.round(b*10)/10, appliedThisGw: applied };
  }, [plan, gw, benchSwaps]);

  const squadIds = new Set(squad.map(s => s.id));

  const projTotal = useMemo(() => squad.filter(s=>s.starter)
    .reduce((a,s)=> a + (byId[s.id].proj/38) * (s.id===captain?2:1), 0), [squad, captain]);

  const starters = squad.filter(s => s.starter).sort((a,z)=>a.order-z.order);
  const bench = squad.filter(s => !s.starter).sort((a,z)=>a.order-z.order);
  const rows = { GK:[], DEF:[], MID:[], FWD:[] };
  starters.forEach(s => rows[byId[s.id].pos].push(s));

  // Er uppstilling lögleg eftir bekkjar-skipti? (1 GK, 3-5 DEF, min 2 MID, min 1 FWD, 11 alls)
  function formationOK(starterIds) {
    const c = { GK:0, DEF:0, MID:0, FWD:0 };
    starterIds.forEach(id => c[byId[id].pos]++);
    return c.GK===1 && c.DEF>=3 && c.DEF<=5 && c.MID>=2 && c.MID<=5 && c.FWD>=1 && c.FWD<=3
      && (c.GK+c.DEF+c.MID+c.FWD)===11;
  }
  // Skipta byrjunarmanni og bekkjarmanni (drag-and-drop). Ver ólöglega uppstillingu.
  function swapStarterBench(starterId, benchId) {
    if (starterId===benchId) return;
    const sPos = byId[starterId].pos, bPos = byId[benchId].pos;
    if ((sPos==="GK") !== (bPos==="GK")) { flash("Markvörð má aðeins skipta við markvörð."); return; }
    const nextStarterIds = starters.map(s=>s.id).filter(id=>id!==starterId).concat(benchId);
    if (!formationOK(nextStarterIds)) { flash("Ólögleg uppstilling — þarf 1 GK, 3–5 vörn, 2–5 miðju, 1–3 sókn."); return; }
    setBenchSwaps(bs => ({ ...bs, [gw]: [...(bs[gw]||[]), [starterId, benchId]] }));
    flash(`${byId[starterId].n} ↔ ${byId[benchId].n}`);
  }

  function commitTransfer(outId, inId) {
    const outP = byId[outId], inP = byId[inId];
    if (outP.pos !== inP.pos) { flash("Skiptin verða að vera í sömu stöðu."); return; }
    setPlan(p => [...p, { gw:sellGw, outId, inId }]);
    setSelling(null); setSearchQ("");
    flash(`Skipti sett á GW${sellGw}: ${outP.n} → ${inP.n}`);
  }
  function removeTransfer(i) { setPlan(p => p.filter((_,j)=>j!==i)); }
  // Velja/afvelja chip í tiltekinni umferð. Sami chip aðeins einu sinni; ein chip per vika.
  function setChipForGw(g, chip) {
    setChips(prev => {
      const next = { ...prev };
      if (!chip) { delete next[g]; return next; }         // afvelja
      // fjarlægja þennan chip úr annarri viku (má bara nota einu sinni)
      for (const k of Object.keys(next)) if (next[k]===chip) delete next[k];
      next[g] = chip;                                      // ein chip per vika (skrifar yfir)
      return next;
    });
  }
  function loadRecommended() {
    setPlan([
      { gw:1, outId:"semenyo", inId:"mbeumo" },
      { gw:3, outId:"lefee", inId:"rice" },
    ]);
    setCaptain("haaland");
    flash("Hlóð ráðlögðu áætluninni: Semenyo→Mbeumo (GW1), Le Fée→Rice (GW3).");
  }

  // Lið-samsetning fyrir valda sölu-GW (hvaða menn eru í liðinu þá)
  const squadAtSellGw = useMemo(() => {
    let sq = BASE_SQUAD.map(s=>({...s}));
    [...plan].sort((a,z)=>a.gw-z.gw).forEach(tr => {
      if (tr.gw > sellGw) return;
      const i = sq.findIndex(s=>s.id===tr.outId); if(i>=0) sq[i]={...sq[i],id:tr.inId};
    });
    return sq;
  }, [plan, sellGw]);
  const squadAtSellIds = new Set(squadAtSellGw.map(s=>s.id));
  // Leitarniðurstöður: sama staða og seldi maðurinn, ekki þegar í liði, passar við leit
  const sellPos = selling ? byId[selling].pos : null;
  const searchResults = useMemo(() => {
    if (!selling) return [];
    const q = searchQ.toLowerCase().trim();
    return DB.filter(p => p.pos===sellPos && !squadAtSellIds.has(p.id) &&
      (!q || p.n.toLowerCase().includes(q) || p.t.toLowerCase().includes(q)))
      .sort((a,b)=>b.proj-a.proj);
  }, [selling, searchQ, sellPos, squadAtSellIds]);

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
            const breakAfter = INTL_BREAK_AFTER.includes(n);
            return (
              <React.Fragment key={n}>
                <button onClick={()=>setGw(n)} style={{...S.node, ...(active?S.nodeActive:{})}}>
                  <span style={S.nodeNum}>{n}</span>
                  {has && <span style={{...S.nodeDot, ...(active?{background:"#0B1622"}:{})}} />}
                  {chips[n] && <span style={{...S.nodeChip, background:CHIPS[chips[n]].color}}>{CHIPS[chips[n]].short}</span>}
                </button>
                {breakAfter && <span style={S.intlBreak} title="Landsleikjahlé á eftir þessari umferð">🌐</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mælaborð */}
      <div style={S.stats}>
        <Stat icon="💰" label={`Banki (GW${gw})`} value={`£${bank.toFixed(1)}`} tone={bank<0?"bad":"ok"} />
        <Stat icon="✅" label="Stig (raun)" value={actualPts==null?"—":actualPts} sub={entryId?`GW${gw}`:"tengdu lið"} />
        <Stat icon="🔴" label="Live stig" value={livePts==null?"—":livePts} sub={livePts==null?"í leik":"uppfærist"} />
      </div>

      <div style={S.oddsBar}>
        <span style={S.oddsDot(oddsState)} />
        {oddsState==="ok"   && <span>Bókmakera-gögn virk — varnarmenn litaðir eftir SAMSETTRI einkunn (CS% + vænt mörk á sig). Grænt = sterk vörn, gult = eðlileg, rautt = veik.</span>}
        {oddsState==="loading" && <span>Sæki bókmakera-línur…</span>}
        {oddsState==="off"  && <span>Bókmakera-CS% óvirkt — sýni FDR + spá. Tengdu Netlify-proxy (PROXY_URL) til að kveikja á lifandi CS%.</span>}
        {oddsState==="error"&& <span>Náði ekki í bókmakera-línur. Athugaðu proxy-slóð og ODDS_API_KEY á Netlify.</span>}
        {oddsState==="idle" && <span>Bókmakera-CS% óvirkt.</span>}
      </div>

      {liveState==="ok" && <div style={S.liveBar}>
        <span style={S.oddsDot("ok")} />
        <span>Lifandi FPL-gögn tengd — raunverð og leikmannamyndir/merki frá opinberu FPL.</span>
      </div>}

      {appliedThisGw.length>0 && (
        <div style={S.gwNote}>
          GW{gw}: {appliedThisGw.map(t=>`${byId[t.outId].n} → ${byId[t.inId].n}`).join(" · ")} — liðið að neðan sýnir stöðuna EFTIR skiptin.
        </div>
      )}

      <div style={S.main}>
        {/* Völlur */}
        <div style={S.pitch}>
          <div style={S.capBar}>
            <div style={S.capSelect}>
              <span style={S.capLbl}><span style={S.statIcon}>©</span>Fyrirliði</span>
              <select style={S.capDropdown} value={captain} onChange={e=>{ if(e.target.value===vice) setVice(null); setCaptain(e.target.value); }}>
                {starters.map(s=><option key={s.id} value={s.id}>{byId[s.id].n}</option>)}
              </select>
            </div>
            <div style={S.capSelect}>
              <span style={S.capLbl}><span style={S.statIcon}>Ⓥ</span>Varafyrirliði</span>
              <select style={S.capDropdown} value={vice||""} onChange={e=>setVice(e.target.value||null)}>
                <option value="">— enginn —</option>
                {starters.filter(s=>s.id!==captain).map(s=><option key={s.id} value={s.id}>{byId[s.id].n}</option>)}
              </select>
            </div>
          </div>
          <div style={S.pitchHint}>
            <span>Smelltu á leikmann til að skipta honum út í GW{sellGw} · dragðu til að breyta byrjunarliði</span>
            {(benchSwaps[gw]?.length>0) &&
              <button style={S.resetBtn} onClick={()=>setBenchSwaps(bs=>{const n={...bs}; delete n[gw]; return n;})}>Núllstilla</button>}
          </div>
          <div style={S.pitchInner}>
            {["GK","DEF","MID","FWD"].map(pos=>(
              <div key={pos} style={S.rowLine}>
                {rows[pos].map(s=>(
                  <PlayerCard key={s.id} p={byId[s.id]} gw={gw} captain={captain} viceId={vice} odds={odds} livePlayer={live[s.id]} onSell={()=>{setSellGw(gw); setSelling(s.id); setSearchQ("");}}
                    draggable dragId={dragId} setDragId={setDragId}
                    onDropPlayer={(fromId)=>swapStarterBench(s.id, fromId)} zone="pitch" />
                ))}
              </div>
            ))}
          </div>
          <div style={S.benchWrap}
            onDragOver={e=>{ if(dragId) e.preventDefault(); }}
            onDrop={e=>{ e.preventDefault(); const from=dragId; if(from && starters.some(s=>s.id===from)){
              // dregið af velli á bekkjarsvæði -> skipta við fyrsta löglega bekkjarmann
              const cand = bench.find(b=>formationOK(starters.map(s=>s.id).filter(id=>id!==from).concat(b.id)) && ((byId[from].pos==="GK")===(byId[b.id].pos==="GK")));
              if (cand) swapStarterBench(from, cand.id); else flash("Fann engan löglegan bekkjarmann til að víxla við.");
            } setDragId(null); }}>
            <div style={S.benchLabel}>Bekkur</div>
            <div style={S.benchRow}>
              {bench.map(s=>(
                <PlayerCard key={s.id} p={byId[s.id]} gw={gw} captain={captain} viceId={vice} bench odds={odds} livePlayer={live[s.id]} onSell={()=>{setSellGw(gw); setSelling(s.id); setSearchQ("");}}
                  draggable dragId={dragId} setDragId={setDragId}
                  onDropPlayer={(fromId)=>swapStarterBench(fromId, s.id)} zone="bench" />
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

            <div style={S.sellGwRow}>
              <label style={S.lbl}>Skipta í</label>
              <select style={S.select} value={sellGw} onChange={e=>setSellGw(+e.target.value)}>
                {Array.from({length:8},(_,i)=>i+1).map(n=><option key={n} value={n}>GW{n}</option>)}
              </select>
              <span style={S.sellHint}>← veldu umferð, smelltu svo á leikmann á vellinum</span>
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

          {/* Chips */}
          <section style={S.panel}>
            <h2 style={S.h2}>Chips</h2>
            <div style={S.priceNote}>Veldu í hvaða umferð þú notar hverja chip. Hver má nota einu sinni; ein chip per vika.</div>
            <div style={S.chipGrid}>
              {Object.entries(CHIPS).map(([key, c])=>{
                const usedGw = Object.keys(chips).find(g=>chips[g]===key);
                return (
                  <div key={key} style={S.chipRow}>
                    <span style={{...S.chipTag, background:c.color}}>{c.short}</span>
                    <div style={S.chipInfo}>
                      <div style={S.chipName}>{c.label}</div>
                      <div style={S.chipDesc}>{c.desc}</div>
                    </div>
                    <select style={S.chipSelect} value={usedGw||""}
                      onChange={e=>{ const g=e.target.value; if(usedGw) setChipForGw(+usedGw,null); if(g) setChipForGw(+g,key); }}>
                      <option value="">— ekki notuð —</option>
                      {Array.from({length:8},(_,i)=>i+1).map(n=>{
                        const taken = chips[n] && chips[n]!==key; // önnur chip þegar í þeirri viku
                        return <option key={n} value={n} disabled={taken}>GW{n}{taken?` (upptekin: ${CHIPS[chips[n]].short})`:""}</option>;
                      })}
                    </select>
                  </div>
                );
              })}
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

      {liveState==="ok" && (() => {
        const missed = DB.filter(p => live[p.id] && !live[p.id].photo);
        if (!missed.length) return <div style={S.matchOk}>✓ Allir {DB.length} leikmenn paraðir við FPL-gögn — myndir og merki tengd.</div>;
        return <div style={S.matchWarn}>
          ⚠️ {missed.length} leikmenn náðu ekki FPL-mynd (nota treyju): {missed.map(p=>`${p.n} (${p.t})`).join(", ")}.
          Segðu mér hvað FPL kallar þá og ég bæti í alias.
        </div>;
      })()}

      <footer style={S.footer}>
        Gögn sáð úr greiningu okkar (verð, spár, leikir GW1–8, verðbreytinga-rök). GW1 staðfest; GW2–8 lesin af ticker.
        Lifandi FPL-gögn (verð, myndir, merki) tengd þegar proxy er á. Bókmakera-CS% cache-að í 12 klst.
      </footer>

      {selling && (
        <div style={S.modalOverlay} onClick={()=>{setSelling(null); setSearchQ("");}}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHead}>
              <input autoFocus style={S.searchInputHead} placeholder="Leita að leikmanni eða liði…"
                value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
              <button style={S.modalClose} onClick={()=>{setSelling(null); setSearchQ("");}}>✕</button>
            </div>
            <div style={S.searchList}>
              {searchResults.map(p=>{
                const lp = live[p.id];
                const photo = lp?.photo, crest = crestUrl(p.t), price = lp?.price ?? p.price;
                const diff = byId[selling].price - price;
                return (
                  <button key={p.id} style={S.searchItem} onClick={()=>commitTransfer(selling, p.id)}>
                    <div style={S.searchPortrait}>
                      {photo ? <img src={photo} alt={p.n} style={S.searchPhoto} loading="lazy" /> : <Kit team={p.t} size={26} />}
                      {crest && <img src={crest} alt={p.t} style={S.searchCrest} loading="lazy" />}
                    </div>
                    <div style={S.searchInfo}>
                      <div style={S.searchName}>{p.n}</div>
                      <div style={S.searchMeta}>{p.t} · spá {p.proj}</div>
                    </div>
                    <div style={S.searchRight}>
                      <div style={S.searchPrice}>£{price.toFixed(1)}</div>
                      <div style={{...S.searchDiff, color: diff>=0?"#35C46A":"#E5484D"}}>{diff>=0?"+":""}£{diff.toFixed(1)}</div>
                    </div>
                  </button>
                );
              })}
              {searchResults.length===0 && <div style={S.empty}>Enginn {POS_LABEL[byId[selling].pos].toLowerCase()}-leikmaður fannst. Prófaðu annað leitarorð.</div>}
            </div>
          </div>
        </div>
      )}

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

function Stat({ label, value, sub, tone, icon }) {
  return (
    <div style={S.statCard}>
      <div style={S.statLabel}>{icon && <span style={S.statIcon}>{icon}</span>}{label}</div>
      <div style={{...S.statValue, color: tone==="bad"?"#E5484D":tone==="ok"?"#EAF0F6":"#EAF0F6"}}>{value}</div>
      {sub && <div style={S.statSub}>{sub}</div>}
    </div>
  );
}

function PlayerCard({ p, gw, captain, viceId, bench, odds, livePlayer, draggable, dragId, setDragId, onDropPlayer, zone, onSell }) {
  const fx = FIX[p.t]?.[gw-1];
  const isCap = p.id===captain;
  const isVice = p.id===viceId;
  const live = odds?.[p.t];
  const isDefensive = p.pos==="GK" || p.pos==="DEF";
  const isDragging = dragId===p.id;
  const [imgOk, setImgOk] = React.useState(true);
  const photo = livePlayer?.photo;
  const price = livePlayer?.price ?? p.price;   // lifandi verð ef til, annars sáð
  const crest = crestUrl(p.t);
  return (
    <div
      draggable={!!draggable}
      onDragStart={e=>{ setDragId?.(p.id); e.dataTransfer.effectAllowed="move"; }}
      onDragEnd={()=>setDragId?.(null)}
      onDragOver={e=>{ if(dragId && dragId!==p.id) e.preventDefault(); }}
      onDrop={e=>{ e.preventDefault(); if(dragId && dragId!==p.id) onDropPlayer?.(dragId); setDragId?.(null); }}
      onClick={()=>{ if(!isDragging) onSell?.(); }}
      title="Smelltu til að skipta út"
      style={{...S.card, ...(bench?S.cardBench:{}), borderTopColor: POS_COLOR[p.pos],
        opacity:isDragging?0.4:1, cursor:draggable?"pointer":"default"}}>
      {isCap && <span style={{...S.armband, background:"#E8C15A", color:"#3a2d05"}}>C</span>}
      {isVice && <span style={{...S.armband, background:"#9fb0bd", color:"#0B1622"}}>V</span>}
      <div style={S.portrait}>
        {photo && imgOk
          ? <img src={photo} alt={p.n} style={S.photoImg} onError={()=>setImgOk(false)} loading="lazy" />
          : <Kit team={p.t} size={30} />}
        {crest
          ? <img src={crest} alt={p.t} style={S.crestImg} loading="lazy" />
          : <span style={S.kitCode}>{p.t}</span>}
      </div>
      <div style={S.cardName}>{p.n}</div>
      <div style={S.cardMeta}>£{price.toFixed(1)}</div>
      {fx ? <FixChip fx={fx} live={live} isDef={isDefensive} /> : <div style={S.noFix}>—</div>}
      {live ? (
        isDefensive
          ? <div style={S.liveDefBox}>
              <span style={{color:defColor(live.cs, live.xga), fontWeight:700, fontFamily:mono, fontSize:11}}>CS {live.cs}%</span>
              <span style={S.xgaLine} title="Vænt mörk á sig (xGA) — lægra er betra">{live.xga} á sig</span>
            </div>
          : <div style={S.liveLine}>{live.xg} vænt mörk</div>
      ) : (
        <div style={S.cardProj}>{Math.round(p.proj/38*10)/10} spá/vika</div>
      )}
    </div>
  );
}

function FixChip({ fx, inline, live, isDef }) {
  const [opp, home, fdr] = fx;
  // Varnarmenn: samsettur CS%+xGA litur. Aðrir: CS% ef til, annars FDR.
  let bg = FDR[fdr];
  if (live && live.cs != null) {
    bg = isDef ? defColor(live.cs, live.xga) : csColor(live.cs);
  }
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
  nodeChip: { position:"absolute", top:-7, right:-7, fontFamily:mono, fontSize:8, fontWeight:700, color:"#0B1622", padding:"1px 3px", borderRadius:4, lineHeight:1.3 },
  intlBreak: { fontSize:13, opacity:0.85, margin:"0 -2px", alignSelf:"center" },
  chipGrid: { display:"flex", flexDirection:"column", gap:8 },
  chipRow: { display:"flex", alignItems:"center", gap:10, background:"#0B1622", border:"1px solid #1B2E3F", borderRadius:8, padding:"8px 10px" },
  chipTag: { fontFamily:mono, fontSize:11, fontWeight:700, color:"#0B1622", padding:"3px 6px", borderRadius:5, minWidth:26, textAlign:"center", flexShrink:0 },
  chipInfo: { flex:1, minWidth:0 },
  chipName: { fontSize:13, fontWeight:600, color:"#EAF0F6" },
  chipDesc: { fontSize:10.5, color:"#7E93A3" },
  chipSelect: { background:"#12212F", border:"1px solid #22384A", color:"#EAF0F6", padding:"5px 7px", borderRadius:6, fontSize:12, outline:"none", flexShrink:0 },

  stats: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 },
  statCard: { background:"#0E1B2A", border:"1px solid #1B2E3F", borderRadius:12, padding:"12px 14px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center" },
  statLabel: { fontFamily:mono, fontSize:10.5, letterSpacing:1, textTransform:"uppercase", color:"#7E93A3" },
  statIcon: { marginRight:5, fontSize:12 },
  armband: { position:"absolute", top:5, right:5, minWidth:16, height:16, padding:"0 3px", borderRadius:8, fontSize:9.5, fontWeight:700, fontFamily:mono, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1, zIndex:2 },
  capBar: { display:"flex", gap:10, marginBottom:12 },
  capSelect: { flex:1, display:"flex", flexDirection:"column", gap:4, background:"#0B1622", border:"1px solid #1B2E3F", borderRadius:8, padding:"7px 10px" },
  capLbl: { fontFamily:mono, fontSize:10, letterSpacing:0.5, textTransform:"uppercase", color:"#7f9d88", display:"flex", alignItems:"center" },
  capDropdown: { background:"#12212F", border:"1px solid #22384A", color:"#EAF0F6", padding:"5px 7px", borderRadius:6, fontSize:12.5, outline:"none", width:"100%" },
  statValue: { fontFamily:mono, fontSize:24, fontWeight:600, marginTop:3 },
  statSub: { fontSize:11, color:"#7E93A3", marginTop:2 },

  gwNote: { background:"rgba(90,169,230,0.1)", border:"1px solid #234a63", color:"#9fc7e8", borderRadius:8, padding:"8px 12px", fontSize:12.5, marginBottom:14 },

  oddsBar: { display:"flex", alignItems:"center", gap:9, fontSize:12, color:"#9fb0bd", background:"#0E1B2A", border:"1px solid #1B2E3F", borderRadius:8, padding:"8px 12px", marginBottom:14 },
  liveBar: { display:"flex", alignItems:"center", gap:9, fontSize:12, color:"#9fb0bd", background:"#0E1B2A", border:"1px solid #1B2E3F", borderRadius:8, padding:"8px 12px", marginBottom:14 },
  oddsDot: (st) => ({ width:8, height:8, borderRadius:"50%", flexShrink:0,
    background: st==="ok"?"#35C46A":st==="loading"?"#E0A500":st==="error"?"#E5484D":"#5f7385",
    boxShadow: st==="ok"?"0 0 0 3px rgba(53,196,106,0.2)":"none" }),
  liveLine: { fontFamily:mono, fontSize:11, fontWeight:600, marginTop:5, color:"#9fb0bd" },
  liveDefBox: { display:"flex", flexDirection:"column", gap:1, marginTop:5, alignItems:"center" },
  xgaLine: { fontFamily:mono, fontSize:9, color:"#7E93A3" },

  main: { display:"grid", gridTemplateColumns:"1.35fr 1fr", gap:16, alignItems:"start" },

  pitch: { background:"linear-gradient(180deg,#0d2418,#0a1c13)", border:"1px solid #17402a", borderRadius:16, padding:"18px 14px" },
  pitchHint: { display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:"#7f9d88", marginBottom:14, fontFamily:mono },
  resetBtn: { background:"transparent", border:"1px solid #2f5a3e", color:"#7fcf9a", padding:"3px 9px", borderRadius:6, fontSize:11, cursor:"pointer" },
  kitWrap: { position:"relative", display:"flex", justifyContent:"center", marginBottom:2, marginTop:2 },
  kitCode: { position:"absolute", bottom:-2, right:14, fontFamily:mono, fontSize:8, fontWeight:700, color:"#9fb0bd", background:"#0B1622", padding:"0 3px", borderRadius:3, border:"1px solid #22384A" },
  portrait: { position:"relative", display:"flex", justifyContent:"center", alignItems:"flex-end", height:38, marginBottom:3, marginTop:2 },
  photoImg: { height:38, width:"auto", objectFit:"contain", filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.4))" },
  crestImg: { position:"absolute", bottom:-1, right:10, width:15, height:15, objectFit:"contain", background:"#0B1622", borderRadius:3, padding:1 },
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
  matchOk: { fontSize:12, color:"#7fcf9a", background:"rgba(53,196,106,0.08)", border:"1px solid #2f5a3e", borderRadius:8, padding:"8px 12px", marginTop:16 },
  matchWarn: { fontSize:12, color:"#e8c15a", background:"rgba(232,193,90,0.08)", border:"1px solid #6a5a2a", borderRadius:8, padding:"8px 12px", marginTop:16, lineHeight:1.5 },
  toast: { position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", background:"#12212F", border:"1px solid #35C46A", color:"#EAF0F6", padding:"10px 18px", borderRadius:10, fontSize:13, boxShadow:"0 8px 30px rgba(0,0,0,0.4)", zIndex:50 },

  sellGwRow: { display:"flex", alignItems:"center", gap:8, marginBottom:14 },
  sellHint: { fontSize:11, color:"#7E93A3", flex:1 },

  modalOverlay: { position:"fixed", inset:0, background:"rgba(4,10,18,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20 },
  modal: { background:"#0E1B2A", border:"1px solid #22384A", borderRadius:14, width:"100%", maxWidth:420, maxHeight:"80vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.5)" },
  modalHead: { display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, padding:"14px 14px 10px" },
  searchInputHead: { flex:1, background:"#12212F", border:"1px solid #22384A", color:"#EAF0F6", padding:"9px 12px", borderRadius:8, fontSize:13.5, outline:"none" },
  modalClose: { background:"transparent", border:"none", color:"#7E93A3", fontSize:16, cursor:"pointer", padding:4, flexShrink:0 },
  searchList: { overflowY:"auto", padding:"0 8px 12px", display:"flex", flexDirection:"column", gap:4 },
  searchItem: { display:"flex", alignItems:"center", gap:10, background:"transparent", border:"1px solid transparent", borderRadius:9, padding:"7px 8px", cursor:"pointer", textAlign:"left", width:"100%" },
  searchPortrait: { position:"relative", width:34, height:34, flexShrink:0, display:"flex", alignItems:"flex-end", justifyContent:"center" },
  searchPhoto: { height:34, width:"auto", objectFit:"contain" },
  searchCrest: { position:"absolute", bottom:-2, right:-4, width:14, height:14, objectFit:"contain", background:"#0E1B2A", borderRadius:3, padding:1 },
  searchInfo: { flex:1, minWidth:0 },
  searchName: { fontSize:13.5, fontWeight:600, color:"#EAF0F6", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  searchMeta: { fontFamily:mono, fontSize:11, color:"#7E93A3" },
  searchRight: { textAlign:"right", flexShrink:0 },
  searchPrice: { fontFamily:mono, fontSize:13, color:"#EAF0F6", fontWeight:600 },
  searchDiff: { fontFamily:mono, fontSize:10.5 },
};
