/* ============================================================
   PLAYERLIST.JSX — flipinn "Leikmenn": ALLIR leikmenn, sianlegir,
   radanlegir, yfir fjogur timabil.

   EIN UPPSPRETTA DALKA. Dalkarnir eru STAT_DEFS ur src/stats.js — sama
   skra sem stigataflan og prófin nota. Annar dalkalisti hefdi farið ur
   samhengi vid hana innan viku, svo hann er EKKI skrifadur.

   TIMABILID STYRIR ALLT (maelt 29.7.2026: finished_gw = 0):
   Fyrir GW1 eru OLL arstidarsvid i players.json NULL — total_points,
   form, minutes, xG. Listi sem radar 563 nullum lítur ut eins og bilun.
   Thess vegna:
     finished_gw === 0 -> sjalfgefid timabil er SIDASTA LOKNA (2025/26)
                          og hausinn segir hvers vegna.
     finished_gw >= 1  -> 2026/27 verdur sjalfgefid.
   Thetta er LESID ur events.json i hverri hledslu, aldrei hardkodad.

   NULL ER EKKI NULL:
     null  (gogn vantar)        -> "—" gratt
     0     (raunverulegt null)  -> "0"
   Dalkur sem er tomur fyrir ALLA i voldu timabili er FALINN, ekki
   syndur sem sull af strikum — nema notandinn kveiki a honum.

   VAKTLISTI OG "MITT LID": stjarnan (vistud i localStorage) og graen rond.
   RONDIN ER A FROSNA NAFNA-HOLFINU, EKKI A RODINNI — rodin skrunar larett
   og bordi a henni hefdi horfid vid fyrsta larett skrun. Samanburdar-liturinn
   var faerdur ur graenum i ljosfjolublaan svo GRAENT thydi adeins eignarhald.

   VERD OG STADA ERU ALLTAF UR NUVERANDI players.json, lika thegar
   soguleg tolur eru syndar: thu kaupir a verdi DAGSINS, ekki a verdi
   2023/24. Sami rok fyrir stodu og tiltækileika.
   ============================================================ */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { interp } from "./interp.js";
import { RAW } from "./dataUrl.js";
import { STAT_DEFS, STAT_GROUPS, STAT_BY_KEY, fmtStat, num, normName, nameScore,
  indexImminentByTeam, matchImminent, sumGwRange, gwBlindKeys,
         startRisk, moScore, aoScore, inImminentPool } from "./stats.js";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c", greenBg:"#e6f9f0",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const POS = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };
const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };

/* Mynd med stafa-fallback VID VILLU, ekki adeins thegar code vantar —
   premierleague.com skilar 404 fyrir nyflutta menn og an onError birtist
   brotid-myndar-tak i rodinni. Sama regla og PlayerImg i App.jsx.       */
function RowPhoto({ src, name }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span style={S.imgFb}>{(name || "?").slice(0, 1)}</span>;
  return <img src={src} alt="" style={S.img} loading="lazy" onError={() => setOk(false)} />;
}
const POS_TABS = [["all","All"],["1","GK"],["2","DEF"],["3","MID"],["4","FWD"]];

/* FASTIR DALKAR — birtir vinstra megin i OLLUM flokkum thvi thu tekur
   engan akvordun an theirra. Their eru THVI SLEPPT ur flokka-dalkunum:
   adur voru their BAEDI fastir OG i "Grunni", svo "Price" birtist tvisvar
   i somu toflu — vid hlidina a Threat i Grunni (notandinn, 8.8.2026).
   Skra-legur samastadur theirra er obreyttur (stigataflan radar eftir
   theim og filter-valarinn finnur thau).                              */
const PINNED = new Set(["now_cost", "selected_by_percent"]);
const ROW_H = 34;          // fost haed -> synadarvaeding er einfold
const OVERSCAN = 12;
/* HAUSINN ER TVEGGJA THREPA (FFS-lagid, sja BANDS nedar): spannandi
   bands-rod ofan a heitunum. Haedirnar eru fastar thvi radirnar eru
   absolute-stadsettar undir hausnum — ein tala, einn stadur.          */
const BAND_H = 17;
const LABEL_H = 30;
const HEAD_H = BAND_H + LABEL_H;

/* ---- Sniðgrunnur fyrir "min/max"-siur: hvada dalkar eru tolulegir ---- */
const numericDefs = () => STAT_DEFS.filter(d => !d.pos || d.pos.length);

/* ============================================================
   STATPICKER — leitanlegur dalkavalari

   AF HVERJU EKKI <select>: dalkarnir eru 108 i 12 flokkum. Native-select
   getur adeins hoppad a fyrsta staf, svo ad finna "Vaentar assist" thydir
   ad skruna gegnum allan listann. Notandinn bad um leit.

   LEITIN ER BROTTFELLD A BRODDSTOFUM: "vaent" verdur ad finna "Væntar",
   "throskuldur" ad finna "Þröskuldur". Islenskt vidmot thar sem leitin
   krefst broddstafa er leit sem virkar ekki i reynd.
   Leitad er i BAEDI dalksheiti OG flokksheiti, svo "vorn" gefur allan
   varnar-flokkinn.
   ============================================================ */
const fold = t => String(t ?? "").toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/þ/g, "th").replace(/ð/g, "d").replace(/æ/g, "ae").replace(/ø|ö/g, "o");

function StatPicker({ value, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const cur = STAT_BY_KEY[value];

  /* Flatur listi MED flokks-skilum svo orvalyklar hoppi rett — ad radast
     eftir flokkum en fletjast fyrir lyklabord er thad sem gerir hann
     nothaefan an mus.                                                    */
  const items = useMemo(() => {
    const f = fold(q);
    const out = [];
    for (const g of STAT_GROUPS) {
      /* Leitad er i THRENNU: dalksheiti, flokksheiti OG `key`. Lyklarnir eru
         a ENSKU (threat, creativity, bps, ict_index) og thad er thad sem
         FPL-folk slaer inn — islenska heitid a "threat" er "Ogn", svo an
         lykla-leitar gaefi "threat" ENGA nidurstodu. Maelt: 108 -> 12 fyrir
         "vaent", 5 fyrir "spjold", og "threat" fann ekkert fyrr en nu.     */
      /* Leitad er i FIMM: dalksheiti, HAUS-heiti (`short`), band, flokkur
         OG `key`. `short` var vidbot 8.8.2026 — hausinn segir "CBI" og thad
         er thad sem notandinn slaer inn, en fulla heitid er
         "Clearances/blocks/int". Lykla-leitin var thegar naudsynleg af sömu
         aestaedu i íslenska vidmotinu og heldur ser: FPL-folk slaer "bps".  */
      const ds = STAT_DEFS.filter(d => d.group === g.key)
        .filter(d => !f || fold(d.label).includes(f) || fold(g.label).includes(f)
                        || fold(d.short).includes(f) || fold(d.band).includes(f)
                        || fold(d.key).replace(/_/g, " ").includes(f)
                        || fold(d.key).includes(f));
      if (!ds.length) continue;
      out.push({ grp: g.label });
      for (const d of ds) out.push({ d, grp: g.label });
    }
    return out;
  }, [q]);
  const pickable = items.filter(i => i.d);

  useEffect(() => { setHi(0); }, [q]);
  useEffect(() => {
    if (!open) return;
    const away = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  /* Halda upplystu atridi i sjonmali — annars leidir orvalyklarnir
     valid ut ur skrunglugganum og notandinn ser ekkert gerast.          */
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector('[data-hi="1"]');
    if (el?.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  const commit = i => { const it = pickable[i]; if (!it) return;
                        onChange(it.d.key); setOpen(false); setQ(""); };
  const key = e => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(v => Math.min(v + 1, pickable.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(v => Math.max(v - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); commit(hi); }
    else if (e.key === "Escape") { setOpen(false); setQ(""); }
  };

  return (
    <div ref={boxRef} style={{ ...S.pkWrap, ...(style || {}) }}>
      <input style={S.pkInput} role="combobox" aria-expanded={open}
        aria-label={"Search for a stat"}
        placeholder={cur?.label || "pick a stat"}
        value={open ? q : (cur?.label || "")}
        onFocus={() => setOpen(true)}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={key} />
      <span style={S.pkCaret} aria-hidden="true">▾</span>
      {open && (
        <div ref={listRef} style={S.pkList} role="listbox">
          {!pickable.length ? <div style={S.pkNone}>{"no stat matches \""}{q}“</div> : null}
          {items.map((it, i) => it.d ? (
            <div key={it.d.key} role="option"
              aria-selected={it.d.key === value}
              data-hi={pickable.indexOf(it) === hi ? "1" : "0"}
              style={{ ...S.pkOpt,
                       ...(pickable.indexOf(it) === hi ? S.pkOptHi : {}),
                       ...(it.d.key === value ? S.pkOptSel : {}) }}
              onMouseEnter={() => setHi(pickable.indexOf(it))}
              onMouseDown={e => { e.preventDefault(); commit(pickable.indexOf(it)); }}
              title={it.d.note || ""}>
              {it.d.label}
              {/* HAUS-HEITID BIRT MED — annars getur notandinn ekki tengt
                  "Clearances/blocks/int" hér vid "CBI" i toflunni.       */}
              {it.d.short && it.d.short !== it.d.label
                ? <span style={S.pkShort}>{it.d.short}</span> : null}
              {it.d.live_only ? <span style={S.pkLive} title={"Does NOT follow the selected season"}>{"now"}</span> : null}
            </div>
          ) : <div key={"g" + i} style={S.pkGrp}>{it.grp}</div>)}
        </div>
      )}
    </div>
  );
}

export default function PlayerList({ players, teams, teamById, events, seasonsFile,
                                     imminent, shotsFile, fixtures, odds, defcon, defconHist, consist,
                                     photoUrl, Crest, onPickPlayer, onCompare, cmpIds,
                                     watch, onWatch, mineIds }) {
  /* ---------- SIMI: 380 px er profunar-breiddin ----------
     Frosni nafnadalkurinn var 196 px af 380 px — meira en helmingur
     skjasins, svo tolurnar fengu naerri ekkert. Og bordinn + siur + 12
     flokkahnappar ýttu toflunni undir fold. Baedi lagfaert her.        */
  const [narrow, setNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 560 : false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 559px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  const [showInfo, setShowInfo] = useState(false);

  /* ---------- timabil ---------- */
  const finishedGw = useMemo(
    () => (events || []).filter(e => e.finished).length, [events]);
  const currentLabel = useMemo(() => {
    const d = (events || []).find(e => e.id === 1)?.deadline_time;
    const y = d ? new Date(d).getFullYear() : null;
    return y ? `${y}/${String((y + 1) % 100).padStart(2, "0")}` : "this year";
  }, [events]);
  const olderSeasons = seasonsFile?.seasons || [];
  const seasonOpts = [currentLabel, ...olderSeasons];
  const [season, setSeason] = useState(null);
  useEffect(() => {
    if (season != null) return;
    setSeason(finishedGw >= 1 ? currentLabel : (olderSeasons[0] || currentLabel));
  }, [season, finishedGw, currentLabel, olderSeasons]);
  const isLive = season === currentLabel;

  /* ---------- UMFERDAR-BIL ----------
     null = HEILT timabil. Bilid gildir adeins um samlagningarhaefar tolur;
     verd, eignarhald og FPL-saeti eru ARSTIDARTOLUR og fylgja EKKI — their
     eru merktir i vidmotinu, thvi thogul rong tala er verri en synilega
     vantandi tala. Skrarnar eru LETIHLADNAR: 1,2-1,5 MB per timabil og
     thad er tilgangslaust ad hlada theim ef bilid er ekki notad.         */
  const [gwRange, setGwRange] = useState(null);      // [fra, til] eda null
  const [gwFile, setGwFile] = useState(null);        // { key, data }
  const [gwLoading, setGwLoading] = useState(false);
  const [gwErr, setGwErr] = useState(null);

  /* "2025/26" -> "2526". Skrarnar heita player_gw_{key}.json. */
  const seasonKey = useMemo(() => {
    const m = String(season || "").match(/^(\d{4})\/(\d{2})$/);
    return m ? m[1].slice(2) + m[2] : null;
  }, [season]);

  /* Hledur ADEINS thegar bil er raunverulega valid. Bilid er nullstillt
     thegar timabili er skipt — annars sæti GW30-38 eftir a nyju timabili
     og notandinn saei tolur fyrir bil sem hann valdi ekki thar.          */
  useEffect(() => { setGwRange(null); setGwErr(null); }, [season]);
  /* HVADA TIMABIL EIGA PER-UMFERDAR GOGN? `consistency.json` er BYGGD
     UR NAKVAEMLEGA thessum skram (player_gw_{s}.json), svo lyklar hennar
     eru sjalfvirk og sjalfvidhaldandi skra yfir thad sem er til.
     VILLAN SEM ThETTA LAGAR (7.8.2026): 2026/27 er obyrjad og a enga
     slika skra. Appid reyndi samt ad saekja hana, og raw.githubusercontent
     skilar 404 AN CORS-hausa — svo vafrinn hafnar kallinu og notandinn sa
     "gogn vantar: Failed to fetch" i stad thess ad fa ad vita ad
     timabilid eigi einfaldlega engar umferdar-tolur enn.               */
  const gwSeasons = useMemo(() => new Set(Object.keys(consist?.seasons || {})),
    [consist]);
  const gwAvailable = !consist || gwSeasons.size === 0 || gwSeasons.has(season);

  useEffect(() => {
    if (!gwRange || !seasonKey) return;
    if (!gwAvailable) { setGwErr(null); return; }   // ekkert ad saekja
    if (gwFile?.key === seasonKey) return;
    let dead = false;
    setGwLoading(true); setGwErr(null);
    /* TVAER TILRAUNIR. Skrarnar eru 1,3-1,6 MB og notandinn fekk
       "Failed to fetch" 7.8.2026 — netvilla, ekki 404 (allar skrarnar
       svara 200). Ein bilun skildi hann eftir med villu OG ENGA leid til
       baka nema skipta um timabil og til baka. Ein sjalfvirk endurtilraun
       eftir 800 ms tekur venjulegan hiksta; mistakist hun lika birtist
       "reyna aftur"-hnappur i stad hrarrar villu.                      */
    const load = (attempt = 0) =>
      fetch(`${RAW}/player_gw_${seasonKey}.json`)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(data => { if (!dead) { setGwFile({ key: seasonKey, data }); setGwLoading(false); } })
        .catch(e => {
          if (dead) return;
          if (attempt === 0) { setTimeout(() => { if (!dead) load(1); }, 800); return; }
          setGwErr(String(e.message || e)); setGwLoading(false);
        });
    load();
    return () => { dead = true; };
  }, [gwRange, seasonKey, gwFile, gwAvailable]);

  const gwActive = !!(gwRange && gwFile?.key === seasonKey && gwFile?.data);
  /* LEITT UT ur STAT_DEFS, ekki handskrifad — sja gwBlindKeys i stats.js.
     Fyrsta utgafa var handskrifadur lyklalisti og 13 af 22 lyklum voru
     RANGIR, svo merkingin birtist hvergi.                               */
  const blindKeys = useMemo(() => gwBlindKeys(), []);

  /* ---------- sior ---------- */
  const [pos, setPos] = useState("all");
  const [q, setQ] = useState("");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [teamSel, setTeamSel] = useState([]);
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [hidePicked, setHidePicked] = useState(false);
  const [onlyWatch, setOnlyWatch] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [group, setGroup] = useState("core");
  /* THROSKULDAR — LIFA UTAN FLOKKS OG UTAN TIMABILS.
     Thetta er kjarninn i beidninni 8.8.2026: "smelli a 90%, breyti i 85%,
     fer svo i naesta flokk (threat) og held afram ad filtera thar."
     Thess vegna er `thresholds` EINN listi sem engin flokka-skipti hreyfa,
     og hver lidur er RITANLEGUR a sinum stad (sja FilterChip) i stad thess
     ad thurfa ad setja hann inn upp a nytt.                            */
  const [thresholds, setThresholds] = useState([]);   // [{key, op, val}]
  /* Sidasti throskuldur sem VARD TIL vid smell a tolu — reiturinn hans
     faer fokus og textinn valinn, svo "85" komi beint i stad "90".     */
  const [freshTh, setFreshTh] = useState(null);       // "key|op"
  const [sortKey, setSortKey] = useState("total_points");
  const [sortDir, setSortDir] = useState("desc");
  const [thKey, setThKey] = useState("expected_goal_involvements_per_90");
  const [thOp, setThOp] = useState(">=");
  const [thVal, setThVal] = useState("");

  /* ---------- "cook": ein umferd yfir gognin ----------
     Allt sem radun og sia thurfa er reiknad HER, einu sinni. Enginn
     utreikningur og engin JSON-uppfletting inni i render.              */
  const rows = useMemo(() => {
    const t0 = (typeof performance !== "undefined" ? performance.now() : 0);
    /* PORUN VID imminent.json: hun geymir FULLT nafn ("Cole Palmer") en
       players.json web_name ("Palmer"), svo bein nafna-uppfletting skilar
       ENGU — allur "Byrjar"-dalkurinn vard "—". Nota orda-skorun + LID,
       sama adferd og matchShotsToPlayers, med othraeddum sigurvegara.     */
    /* Porunin sjalf er i src/stats.js svo skipta-glugginn i App.jsx noti
       NAKVAEMLEGA sama kod — tvaer utfaerslur gaefu tomar tolur a einum
       stad og fylltar a odrum an ad prof felli.                          */
    const immByTeam = indexImminentByTeam(imminent);
    const findImm = p => matchImminent(p, immByTeam, teamById?.[p.team]?.short);

    /* ---- LIDS-SAMTOLUR: xG liðsins (fyrir "hlutur af xG liðsins") ---- */
    const teamXg = {};
    for (const p of players || []) {
      const v = num(p.expected_goals);
      if (v != null) teamXg[p.team] = (teamXg[p.team] ?? 0) + v;
    }

    /* ---- ESPN-SKOT sidustu umferdar, porad a nafn+lid ---- */
    const shotByTeam = {};
    for (const sp of shotsFile?.players || []) (shotByTeam[sp.team] ||= []).push(sp);
    const findShot = (p) => {
      const cands = shotByTeam[teamById?.[p.team]?.short] || [];
      let best = null, bs = 0, second = 0;
      for (const c of cands) {
        const sc = Math.max(nameScore(p.web_name, c.name),
                            nameScore(`${p.first_name} ${p.second_name}`, c.name));
        if (sc > bs) { second = bs; bs = sc; best = c; }
        else if (sc > second) second = sc;
      }
      return (best && bs >= 1 && bs > second) ? best : null;
    };

    /* ---- LEIKIR FRAMUNDAN: naestu sex UMFERDIR fra naestu ospiluðu ----
       Talið per UMFERD, ekki per leik: `fix6 < 6` er auð umferd og
       `> 6` er tvofold. Thad er spurningin sem notandinn hefur.        */
    const nextGw = (events || []).find(e => e.is_next)?.id
                ?? ((events || []).filter(e => e.finished).length + 1);
    const fixAgg = {};
    for (const f of fixtures || []) {
      if (f.event == null || f.event < nextGw || f.event > nextGw + 5) continue;
      for (const [team, isHome, diff] of [[f.team_h, true, f.team_h_difficulty],
                                          [f.team_a, false, f.team_a_difficulty]]) {
        const a = fixAgg[team] || (fixAgg[team] = { n:0, fdr:0, home:0, gws:new Set() });
        a.n++; a.fdr += (num(diff) ?? 3); if (isHome) a.home++; a.gws.add(f.event);
      }
    }
    const csByShort = odds || {};
    const dcById = defcon?.opportunity || {};
    /* DC-hittni per leikmann. TVAER HEIMILDIR:
         · yfirstandandi timabil -> defcon.json (lyklad a fpl_id)
         · sogulegt timabil      -> defcon_history.json (lyklad a `code`,
           sem er FAST yfir timabil ólíkt id)
       Valid raedur hvor er lesin, svo dalkarnir FYLGJA timabilinu eins og
       adrar tolur i toflunni. DefCon er ny stigagjof fra 2025/26; eldri
       timabil eru EKKI i skranni og fa "—" (VANTAR), ekki 0.           */
    const dcHitById = {};
    for (const r of defcon?.players || []) dcHitById[r.fpl_id] = r;
    const dcHistBySeason = isLive ? null : (defconHist?.seasons?.[season] || null);
    /* ARON-STUDULL: alltaf ur consistency.json og FYLGIR voldu timabili.
       Lykladur a `code` eins og hin sogulegu gognin. Fyrir 2026/27 (ekki
       byrjad) er ekkert til og dalkarnir syna "—" — sem er rett.       */
    const consBySeason = consist?.seasons?.[season] || null;

    const out = (players || []).map(p => {
      /* UMFERDAR-BIL kemur I STAD arstidar-rodarinnar. Skilar FPL-nefndum
         svidum, svo allir 108 dalkar — lika afleiddu — virka obreyttir.  */
      const gwEntry = gwActive ? gwFile.data.players?.[String(p.code)] : null;
      const ranged = gwEntry ? sumGwRange(gwEntry, gwFile.data, gwRange[0], gwRange[1]) : null;
      const hist = isLive ? null
                 : (gwActive ? ranged
                             : seasonsFile?.players?.[String(p.code)]?.[season]);
      /* GAGNAHLUTURINN sem dalkarnir lesa: soguleg rod ef timabil er valid,
         annars lifandi. VERD og STADA koma ALLTAF ur lifandi gognum.      */
      const src = isLive ? p : (hist ? { ...hist, now_cost: p.now_cost,
                                         selected_by_percent: p.selected_by_percent } : null);
      const im = findImm(p);
      const risk = im?.start_feats ? startRisk(im.start_feats) : null;
      const sh = findShot(p);
      const fa = fixAgg[p.team];
      const short = teamById?.[p.team]?.short;

      /* AUDGADIR REITIR — allir med `_` forskeyti svo their blandist ekki
         vid FPL-svid. STAT_DEFS med live_only:true lesa thessa.          */
      if (src) Object.assign(src, {
        _team_xg: teamXg[p.team] ?? null,
        _espn_shots: sh?.shots ?? null, _espn_sot: sh?.on_target ?? null,
        _espn_in_box: sh?.in_box ?? null, _espn_woodwork: sh?.woodwork ?? null,
        _espn_created: sh?.chances_created ?? null, _espn_cross: sh?.cross_created ?? null,
        _espn_through: sh?.through_balls ?? null,
        _w_minutes: im?.window?.minutes ?? null, _w_xg: im?.window?.xg ?? null,
        _w_xa: im?.window?.xa ?? null, _w_threat: im?.window?.threat ?? null,
        _w_creativity: im?.window?.creativity ?? null,
        _mo: im && inImminentPool(im.window) ? moScore(im.window) : null,
        _ao: im && inImminentPool(im.window) ? aoScore(im.window) : null,
        _start_p: risk?.p ?? null,
        _fdr6: fa && fa.n ? +(fa.fdr / fa.n).toFixed(2) : null,
        _home6: fa?.home ?? null, _fix6: fa?.n ?? null,
        _team_cs: short && csByShort[short] ? num(csByShort[short].cs) : null,
        /* VILLA SEM VAR: dcById[p.team] er HLUTUR ({own_xgc90, ...}) og
           num(hlutur) er null — dalkurinn "DefCon lids" var thvi ALLTAF
           tomur og faldi sig sjalfur sem tomur dalkur. Fannst 4.8.2026
           thegar sama tenging var skrifud fyrir DC-hittni.              */
        _team_dc: num(dcById[p.team]?.defcon_opportunity),
        ...(() => {
          const h = dcHistBySeason ? dcHistBySeason[String(p.code)]
                                   : dcHitById[p.id];
          const k = consBySeason?.[String(p.code)];
          return { _dc_hit_adj: num(h?.hit_rate_adj),
                   _dc_hit_raw: num(h?.hit_rate),
                   _dc_starts:  num(h?.starts),
                   _aron:       num(k?.aron),
                   _hit4:       num(k?.hit4_pct),
                   _blank:      num(k?.blank_pct),
                   _cgames:     num(k?.games) };
        })(),
      });

      return {
        p, src, hist: !!hist,
        team: teamById?.[p.team],
        search: normName(`${p.web_name} ${p.first_name} ${p.second_name} `
                       + `${teamById?.[p.team]?.name || ""} ${teamById?.[p.team]?.short || ""}`),
        cost: (num(p.now_cost) ?? 0) / 10,
        own: num(p.selected_by_percent) ?? 0,
        avail: p.status === "a",
        startP: risk?.p ?? null, startLevel: risk?.level ?? null,
        mo: im && inImminentPool(im.window) ? moScore(im.window) : null,
        ao: im && inImminentPool(im.window) ? aoScore(im.window) : null,
      };
    });
    if (typeof performance !== "undefined" && import.meta.env?.DEV)
      console.log(`[Leikmenn] cook ${out.length} radir: ${(performance.now()-t0).toFixed(1)} ms`);
    return out;
  }, [players, teamById, seasonsFile, season, isLive, imminent, shotsFile, fixtures, events,
      odds, defcon, defconHist, consist, gwActive, gwFile, gwRange]);

  /* ---------- dalkar valda flokksins ----------
     live_only-dalkar eru NUTIMA-gogn (ESPN sidustu umferdar, form-gluggi,
     leikir framundan, spyrnu-rod) og eru SYNDIR ALLTAF — timabils-valid
     styrir adeins ARSTIDAR-SUMMUM. AD FELA tha i sogulegu timabili gerdi
     tha ONAANLEGA, thvi 2026/27 er tomt.

     TOMIR DALKAR ERU LIKA SYNDIR og "fela toma"-hnappurinn er FARINN
     (beidni 8.8.2026): sjalfvirk felun faldi dalka sem notandinn VEIT ad
     eiga ad vera tomir (DC-hittni fyrir GW1) og gerdi thad ovist hvort
     dalkurinn vaeri til yfirleitt — hun faldi lika RAUNVERULEGA VILLU
     eina, dauda "Team DefCon"-dalkinn (kafli 6l). Dalkur sem er tomur
     segir "engin gogn"; dalkur sem er horfinn segir ekkert.            */
  const visibleCols = useMemo(
    () => STAT_DEFS.filter(d => d.group === group && !PINNED.has(d.key)),
    [group]);

  const watchSet = useMemo(() => new Set(watch || []), [watch]);
  const mineSet = useMemo(
    () => (mineIds instanceof Set ? mineIds : new Set(mineIds || [])), [mineIds]);

  /* ---------- sia ---------- */
  const filtered = useMemo(() => {
    const t0 = (typeof performance !== "undefined" ? performance.now() : 0);
    const needle = normName(q);
    const lo = parseFloat(String(minCost).replace(",", "."));
    const hi = parseFloat(String(maxCost).replace(",", "."));
    const teamSet = new Set(teamSel.map(Number));
    const picked = new Set(cmpIds || []);
    const out = rows.filter(r => {
      if (pos !== "all" && r.p.element_type !== +pos) return false;
      if (teamSet.size && !teamSet.has(r.p.team)) return false;
      if (onlyAvail && !r.avail) return false;
      if (hidePicked && picked.has(r.p.id)) return false;
      if (onlyWatch && !watchSet.has(r.p.id)) return false;
      if (onlyMine && !mineSet.has(r.p.id)) return false;
      if (Number.isFinite(lo) && r.cost < lo) return false;
      if (Number.isFinite(hi) && r.cost > hi) return false;
      if (needle && !r.search.includes(needle)) return false;
      for (const t of thresholds) {
        /* HALFSKRIFAD GILDI SIAR EKKI. Reiturinn i chip-inu er ritanlegur,
           svo `val` er tomur strengur eitt augnablik medan notandinn skiptir
           90 fyrir 85 — og `5 >= ""` er TRUE i JS (tomur strengur verdur 0),
           svo an thessarar vardar hefdi sian hoppad i "minnst 0" og listinn
           blikkad i fulla lengd vid hvern innslatt.                       */
        if (!Number.isFinite(t.val)) continue;
        const d = STAT_BY_KEY[t.key];
        const v = d && r.src ? d.get(r.src) : null;
        if (v == null) return false;                 // "vantar" fellur ut ur throskuldi
        if (t.op === ">=" && !(v >= t.val)) return false;
        if (t.op === "<=" && !(v <= t.val)) return false;
      }
      return true;
    });
    if (typeof performance !== "undefined" && import.meta.env?.DEV)
      console.log(`[Leikmenn] sia -> ${out.length}: ${(performance.now()-t0).toFixed(1)} ms`);
    return out;
  }, [rows, pos, q, minCost, maxCost, teamSel, onlyAvail, hidePicked, thresholds, cmpIds,
      onlyWatch, onlyMine, watchSet, mineSet]);

  /* ---------- rodun ----------
     NULL ALLTAF SIDAST, i BADAR attir. Thetta er algengasta villan:
     tom gildi fljota upp i "asc" og fylla toppinn.                     */
  const sorted = useMemo(() => {
    const t0 = (typeof performance !== "undefined" ? performance.now() : 0);
    const def = STAT_BY_KEY[sortKey];
    const special = { __name: r => r.p.web_name, __team: r => r.team?.short,
                      __cost: r => r.cost, __own: r => r.own,
                      __start: r => r.startP, __mo: r => r.mo, __ao: r => r.ao };
    const get = special[sortKey] || (r => (r.src && def ? def.get(r.src) : null));
    const isText = sortKey === "__name" || sortKey === "__team";
    const dir = sortDir === "asc" ? 1 : -1;
    const out = filtered.slice().sort((a, b) => {
      const va = get(a), vb = get(b);
      const na = va == null || va === "" || (typeof va === "number" && !Number.isFinite(va));
      const nb = vb == null || vb === "" || (typeof vb === "number" && !Number.isFinite(vb));
      if (na && nb) return a.p.code - b.p.code;
      if (na) return 1;                              // vantar -> nidur, ohad att
      if (nb) return -1;
      if (isText) return dir * String(va).localeCompare(String(vb), "is");
      return dir * (va - vb) || a.p.code - b.p.code; // stodug rodun
    });
    if (typeof performance !== "undefined" && import.meta.env?.DEV)
      console.log(`[Leikmenn] rodun ${out.length}: ${(performance.now()-t0).toFixed(1)} ms`);
    return out;
  }, [filtered, sortKey, sortDir]);

  /* ---------- synadarvaeding (fost radahæd) ---------- */
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  /* LARETT SKRUN ER LIKA STAT — sja S.frozenShadow. Notandinn sa "texti fer
     undir nofnin og myndir af kollum" thegar skrunad var langt til haegri:
     frosni dalkurinn ER ogagnsaer (maelt i Chrome) og hylur tolurnar rett,
     en thad var ENGIN DYPTAR-VISBENDING um ad thaer faeru undir hann — og
     haus-heitin, sem eru haegri-jofnud, birtust hálf ("ice chg (GW)") thett
     upp vid "Player". Skuggi a kantinum segir "hér er brún, efnid heldur
     afram undir" og hann er birtur AÐEINS thegar raunverulega er skrunad. */
  const [scrolledX, setScrolledX] = useState(false);
  const [viewH, setViewH] = useState(620);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => { setScrollTop(el.scrollTop); setScrolledX(el.scrollLeft > 2); };
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => setViewH(el.clientHeight || 620)) : null;
    ro?.observe(el);
    setViewH(el.clientHeight || 620);
    return () => { el.removeEventListener("scroll", onScroll); ro?.disconnect(); };
  }, []);
  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const last = Math.min(sorted.length, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN);
  const window_ = sorted.slice(first, last);

  /* Breiddir eftir skja. Nafnadalkur 196 -> 124 og tolur 88 -> 66 i sima. */
  const wName = narrow ? 140 : 200;   // +18 px fyrir stjornuna
  const cName = { ...S.cName, width: wName, minWidth: wName,
                  ...(scrolledX ? S.frozenShadow : {}) };
  /* BREIDD PER DALK, EKKI EIN FOST BREIDD FYRIR ALLA.
     Fasta breiddin var 88 px af thvi ad LENGSTA heitid ("Byrjunarhlutfall")
     thurfti thad — svo "xG" fekk lika 88 px og notandinn thurfti ad skruna
     langt til hlidar ad engu gagni. Nu er breiddin reiknud ur heitinu og
     ur thvi hve breid TALAN getur ordid (`dec`), klippt i [46, 88].
     Mælt: 108 dalkar foru ur 9.504 px i 6.010 px = 37% styttri skrunleid. */
  /* HAUSINN MA BROTNA I TVAER LINUR — thad er thad sem gefur sparnadinn.
     Med EINNI linu stjorna islensku heitin breiddinni ("Byrjunarhlutfall")
     og 17 dalkar lentu i thakinu; maelt gaf thad adeins 21,6%. Med tveimur
     linum stjornar TALAN breiddinni og sparnadurinn verdur 36,5%
     (9.504 px -> 6.031 px yfir alla 108 dalka). Hausinn er EIN rod, svo
     ha0 hans er einskiptis-kostnadur — ekki per rod.
     Nedri morkin eru LENGSTA ORDID i heitinu, ekki heitid deilt i tvo:
     annars vaeri ord klippt i midju thott plass vaeri til.               */
  /* MAELT 6.8.2026 (canvas.measureText a 700 10.5px ui-monospace i Chrome):
     stafur er 6,32 px, EKKI 5,9 — gamla matid var 1-8 px of naumt og ENSK
     heiti brotnudu i MIDJU ORDI ("Point/s", "Minute/s") og "Team of the
     week" fell i thrjar linur sem klipptust vid 30px haus-haedina.
     Notandinn sa thetta ("utlitid er serstakt a sumum stodum").
     TVAER breytingar, badar maeldar:
       1. 5,9 -> 6,35 px/staf (maelt 6,32 + oryggismork).
       2. ceil(len/2)-agiskunin vek fyrir NAKVAEMRI tveggja-linu skiptingu:
          minnsta breidd thar sem ordin skiptast i tvaer samfelldar linur.
          Agiskunin vanmat heiti med ojofnum ordum ("Mins per xGI" tharf
          "Mins per"/"xGI", ekki 6 stafi per linu) — 15 heiti brotnudu.   */
  /* EIN LINA A HVERT HEITI (beidni notanda 7.8.2026 med skjamynd).
     Adur brotnudu heitin i tvaer linur til ad spara skrunleid (36,5%
     maelt i kafla 6j) en thad gerdi hausinn ojafnan: "Owned %" i tveimur
     linum vid hlidina a "Points" i einni, og "Team of the week" i thremur.
     Nu raedur FULL BREIDD heitisins: hver dalkur er nogu breidur fyrir
     sitt heiti a EINNI linu (klippt i [46, 136]).
     KOSTNADUR SEM ER VITAD AF: skrunleidin fer ur ~6.030 px i ~9.380 px
     yfir alla dalka. Thad er ASETT skipti — notandinn valdi laesileika.
     6,35 px/staf er MAELT (canvas.measureText a 700 10.5px ui-monospace,
     6,32 + oryggismork), sja kafla 6m atridi 4.                        */
  /* HAUSINN LES `short`, EKKI `label` (8.8.2026). Full heiti eiga
     hvergi heima i 46-142 px haus — "Clearances/blocks/int" passar aldrei
     en "CBI" gerir thad, og SKYRINGIN er thar sem hun a ad vera: i
     tooltip-inu, sem hver dalkur hefur nu (krafa i stats.js). Bands-rodin
     fyrir ofan gefur stuttum heitum samhengid: "/90" eitt er radgata,
     "/90" undir "Goals" er thad ekki.                                   */
  const PXC = 6.35;
  const hLabel = d => String(d?.short ?? d?.label ?? "");
  const wOf = d => {
    const label = hLabel(d);
    /* PLASS FYRIR MERKI SEM BAETAST VID HEITID I HAUSNUM:
         †  afleidd tala (7 px)
         ↓  rodunar-orin — BIRTIST A THEIM DALKI SEM ER RADAD EFTIR.
       Orin var EKKI talin og thad klippti heitid: hausinn er haegri-
       jafnadur og `nowrap`, svo yfirflaedi hverfur VINSTRA megin —
       "Points ↓" birtist sem "oints ↓" (maelt 7.8.2026). Plassid er
       tekid frá A OLLUM dalkum thvi rodunin faerist milli theirra.     */
    const marker = (d?.derived ? 7 : 0) + 9;       // † + rodunar-or
    const lab = label.length * PXC + marker + 13;   // 10 padding + 1 bord + 2 svigrum
    const dec = d?.dec ?? 0;
    const val = (4 + (dec ? dec + 1 : 0)) * 6.2 + 12; // tala (11px mono)
    return Math.round(Math.max(46, Math.min(142, Math.max(lab, val))));
  };
  /* Fostu dalkarnir (Verd, Eign %) sátu i 88 px thott heitin seu stutt. */
  const wNum = narrow ? 60 : wOf({ short: "Owned %", dec: 1 });
  const cNum  = { ...S.cNum,  width: wNum,  minWidth: wNum, maxWidth: wNum };
  const wCol = d => (narrow ? Math.min(66, wOf(d)) : wOf(d));
  const cFor = d => {
    const w = wCol(d);
    return { ...S.cNum, width: w, minWidth: w, maxWidth: w };
  };

  /* ---------- BANDS: SPANNANDI HAUSROD (FFS-lagid) ----------
     FFS birtir 100+ tolur i einni toflu og gerir thad laesilegt med tveimur
     threpum: "Goals | Shots | Big Chances" spannar yfir stutt undirheiti
     ("Tot In Out H M/G"). THAD ER THETTA sem gerir stytt heiti nothaef —
     annars vaeri "/90" radgata. Bandid er `band` i STAT_DEFS og dalkarnir
     eru i skra-rod, svo band-hlutar eru SAMFELLDIR (vordur i prófinu).
     Ein breidd-utreikningur, tvaer radir: bands-rodin leggur saman
     breiddir sinna dalka svo threpin geti ekki rekid i sundur.          */
  const bands = useMemo(() => {
    const out = [];
    for (const d of visibleCols) {
      const b = d.band || "";
      const last = out[out.length - 1];
      /* SAMA FALL sem holfin nota (`wCol`), ekki afrit af formulunni:
         tvo threp sem reikna breidd sitt i hvoru lagi reka i sundur og tha
         stendur bandid ekki lengur yfir sinum dalkum — nakvaemlega sama
         afturfor sem `boxSizing` olli i einu threpi (kafli 6j).          */
      const w = wCol(d);
      if (last && last.band === b) { last.w += w; last.n++; }
      else out.push({ band: b, w, n: 1 });
    }
    return out;
  }, [visibleCols, narrow]);   // eslint-disable-line react-hooks/exhaustive-deps

  const sortOn = (key, higherBetter = true) => {
    if (sortKey === key) { setSortDir(d => d === "asc" ? "desc" : "asc"); return; }
    setSortKey(key); setSortDir(higherBetter ? "desc" : "asc");
  };
  const arrow = k => sortKey !== k ? "" : (sortDir === "asc" ? " ↑" : " ↓");
  const aria = k => sortKey !== k ? "none" : (sortDir === "asc" ? "ascending" : "descending");

  /* ---------- SMELLUR A TOLU = THROSKULDUR ----------
     Beidnin, orðrett: "ef ég smelli á ákveðið stat, t.d. start prósentu
     90%, þá poppar það upp sem filter möguleiki sem ég get svo breytt".
     Attin er LEIDD UT UR `hi` og ekki gefin: a "Verd" og "Min/framlag" er
     LAEGRA betra, svo smellur thar setur HAM ("mest 5,4") — annars vaeri
     smellurinn ad sia burt einmitt tha sem hann var ad benda a.
     Talan er tekin EINS OG HUN BIRTIST (`dec`), ekki hra: notandinn smellti
     a "90%", ekki a 0,8967 — throskuldur sem sier hann sjalfan ut er villa. */
  const filterOnValue = (d, v) => {
    if (v == null || !Number.isFinite(v)) return;
    const op = d.hi === false ? "<=" : ">=";
    const val = +v.toFixed(d.dec ?? 0);
    setThresholds(t => [...t.filter(x => !(x.key === d.key && x.op === op)),
                        { key: d.key, op, val }]);
    setFreshTh(`${d.key}|${op}`);
  };
  const setThAt = (i, patch) =>
    setThresholds(t => t.map((x, j) => j === i ? { ...x, ...patch } : x));
  const dropThAt = i => setThresholds(t => t.filter((_, j) => j !== i));
  /* HVADA DALKAR ERU UNDIR SIU — merkt i hausnum OG a flokkahnappnum, svo
     sian se synileg thott hun se i ODRUM flokki en theim sem er opinn.  */
  const thByKey = useMemo(() => {
    const m = {};
    thresholds.forEach(t => (m[t.key] ||= []).push(t));
    return m;
  }, [thresholds]);
  const thPerGroup = useMemo(() => {
    const m = {};
    for (const t of thresholds) {
      const g = STAT_BY_KEY[t.key]?.group;
      if (g) m[g] = (m[g] ?? 0) + 1;
    }
    return m;
  }, [thresholds]);

  /* Einfoldu sirnar (stada, leit, verd, gatmerki) — chip sem hreinsar sig. */
  const chips = [];
  if (pos !== "all") chips.push([POS[+pos], () => setPos("all")]);
  if (q) chips.push([`“${q}”`, () => setQ("")]);
  if (minCost !== "") chips.push([`price min £${minCost}`, () => setMinCost("")]);
  if (maxCost !== "") chips.push([`price max £${maxCost}`, () => setMaxCost("")]);
  teamSel.forEach(id => chips.push([teamById?.[id]?.short || id,
    () => setTeamSel(v => v.filter(x => x !== id))]));
  if (onlyAvail) chips.push(["fit to play", () => setOnlyAvail(false)]);
  if (hidePicked) chips.push(["hide selected", () => setHidePicked(false)]);
  if (onlyWatch) chips.push(["★ watchlist", () => setOnlyWatch(false)]);
  if (onlyMine) chips.push(["my squad", () => setOnlyMine(false)]);
  const filterCount = chips.length + thresholds.length;

  if (!players?.length) {
    return <section style={S.card}><div style={S.muted}>{"Fetching player data…"}</div></section>;
  }

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <h2 style={S.h2}>{"Players"}</h2>
          <div style={S.sub}>
            {sorted.length} {"of"} {players.length} · {season}
            {!isLive && <span style={S.histTag}>{"historical numbers"}</span>}
          </div>
        </div>
        <div style={S.headCtl}>
          <select style={S.sel} value={season ?? ""} onChange={e => setSeason(e.target.value)}>
            {seasonOpts.map(s => (
              <option key={s} value={s}>
                {s}{s === currentLabel && finishedGw === 0 ? " (not started)" : ""}
              </option>
            ))}
          </select>
          {filterCount > 0 &&
            <button style={S.clearAll} onClick={() => {
              setPos("all"); setQ(""); setMinCost(""); setMaxCost(""); setTeamSel([]);
              setOnlyAvail(false); setHidePicked(false); setThresholds([]);
              setOnlyWatch(false); setOnlyMine(false);
            }}>{"clear all"}</button>}
        </div>
      </div>

      {/* ---------- SJONRAENT UMFERDAR-BIL ----------
          38 kassar; smellur setur upphaf, naesti smellur setur endann.
          Thad er einfaldara en tveir fellilistar og synir SAMTIMIS hvad er
          valid — spurningin "hvad var hann ad gera i lokin" er sjonræn.
          Bilid er sleppt fyrir yfirstandandi timabil sem er EKKI hafid:
          thar eru engar loknar umferdir og valarinn vaeri 38 dauðir kassar. */}
      {!(isLive && finishedGw === 0) && seasonKey && (
        <div style={S.gwWrap}>
          <div style={S.gwTop}>
            <span style={S.gwLbl}>{"Gameweeks:"}</span>
            {/* FORSTILLINGARNAR ("allt timabilid / 30-38 / fyrri hluti"...)
                voru fjarlaegdar 7.8.2026 ad beidni: kassa-valarinn gerir
                thad sama og meira, svo tvaer leidir ad somu stillingu voru
                bara hávaði. "Hreinsa" dugar til ad fara til baka.       */}
            {gwRange && (
              <button style={S.gwPreset} onClick={() => setGwRange(null)}>
                {"whole season"}
              </button>
            )}
            {gwRange && (
              <span style={S.gwNow}>
                GW {gwRange[0]}–{gwRange[1]}
                {!gwAvailable
                  ? ` · ${interp("no gameweek data for {0} — pick a finished season", [season])}`
                  : gwLoading ? ` · ${"loading…"}` : ""}
                {gwAvailable && gwErr ? <>
                  {` · ${"data missing"}: ${gwErr} `}
                  <button style={S.gwRetry} onClick={() => { setGwErr(null); setGwFile(null); }}>
                    {"retry"}
                  </button>
                </> : null}
              </span>
            )}
          </div>
          <div style={S.gwBar} role="group" aria-label={"Select gameweek range"}>
            {Array.from({ length: 38 }, (_, i) => i + 1).map(n => {
              const on = gwRange && n >= gwRange[0] && n <= gwRange[1];
              const edge = gwRange && (n === gwRange[0] || n === gwRange[1]);
              return (
                <button key={n} title={`GW ${n}`} aria-pressed={!!on}
                  style={{ ...S.gwCell, ...(on ? S.gwOn : {}), ...(edge ? S.gwEdge : {}) }}
                  onClick={() => setGwRange(r => {
                    /* Fyrsti smellur = nytt upphaf. Annar smellur = endi.
                       Ef smellt er FYRIR upphafid snýst bilid vid i stad
                       thess ad gera ekkert — annars virkar valarinn "bara
                       til haegri" og thad er ekki thad sem notandinn gerir. */
                    if (!r || r[0] !== r[1]) return [n, n];
                    return n < r[0] ? [n, r[0]] : [r[0], n];
                  })}>
                  {n}
                </button>
              );
            })}
          </div>
          {gwRange && (
            <div style={S.gwNote}>
              {"The range applies to numbers that can be SUMMED. Price, ownership, form, ICT and FPL ranks are season figures and do NOT follow the range — those columns are marked"}
              {" "}<span style={S.blindTag}>{"season"}</span>{" "}
              {"and show the season total."}
            </div>
          )}
        </div>
      )}

      {finishedGw === 0 && isLive && (
        <div style={S.warn}>
          <b>{currentLabel} {"has not started"}</b> {"— every season field is zero for all"}
          {" "}{players.length} {"players, so this view has no numbers to sort. Pick"} <b>{olderSeasons[0] || "an earlier season"}</b> {"in the dropdown."}
        </div>
      )}
      {finishedGw === 0 && !isLive && (
        narrow && !showInfo ? (
          <button style={S.noteMini} onClick={() => setShowInfo(true)}>
            {currentLabel} {"not started — showing"} {season} · <b>{"why?"}</b>
          </button>
        ) : (
          <div style={S.note}>
            <b>{currentLabel} {"has not started"}</b>{", so the list shows"} <b>{season}</b>{". Price, position and ownership are still"} <b>{"from today's data"}</b> {"— you buy at today's price, not at the price of"} {season}.
            {narrow && <> <button style={S.link} onClick={() => setShowInfo(false)}>{"hide"}</button></>}
          </div>
        )
      )}

      {!isLive && (() => {
        const liveCols = STAT_DEFS.filter(d => d.group === group && d.live_only).length;
        if (!liveCols) return null;
        return (
          <div style={{ ...S.mixNote, ...(narrow ? S.mixMini : {}) }}>
            <b>{"This group shows CURRENT data"}</b> {"— not"} {season}{". It is based on the last finished gameweek, the form window or upcoming fixtures, so it does not change when you pick another season. The season totals (Basics, Attack, Defence …) do follow"} {season}.
          </div>
        );
      })()}

      {/* ---------- sior ---------- */}
      <div style={S.filters}>
        <div style={S.posRow}>
          {POS_TABS.map(([v, l]) => (
            <button key={v} style={{ ...S.posBtn, ...(pos === v ? S.posOn : {}) }}
              onClick={() => setPos(v)}>{l}</button>
          ))}
        </div>
        <input style={S.search} placeholder={"Search — name or team"} value={q}
          onChange={e => setQ(e.target.value)} />
        <label style={S.costWrap} title={"Price range in millions"}>
          <span style={S.costLbl}>£</span>
          <input style={S.costIn} type="number" step="0.1" placeholder={"from"}
            value={minCost} onChange={e => setMinCost(e.target.value)} />
          <span style={S.costLbl}>–</span>
          <input style={S.costIn} type="number" step="0.1" placeholder={"to"}
            value={maxCost} onChange={e => setMaxCost(e.target.value)} />
        </label>
        <select style={S.sel} value="" onChange={e => {
          const id = +e.target.value;
          if (id) setTeamSel(v => v.includes(id) ? v : [...v, id]);
        }}>
          <option value="">{"+ team"}</option>
          {(teams || []).slice().sort((a, b) => String(a.short).localeCompare(String(b.short)))
            .map(t => <option key={t.id} value={t.id}>{t.short}</option>)}
        </select>
        {/* "available only" SAGDI EKKI HVAD THAD GERIR — notandinn spurdi
            hvort thad vaeri "bara their sem eg hef efni a". Thad er FPL
            `status === "a"`: heilbrigdur og leikheimill. Verd kemur thessu
            ekkert vid; verd-bilid vid hlidina gerir thad.               */}
        <label style={S.check}
          title={"Hides injured, suspended and doubtful players (FPL status other than \"available\"). Nothing to do with price — use the £ range for that."}>
          <input type="checkbox" checked={onlyAvail}
            onChange={e => setOnlyAvail(e.target.checked)} />{"fit to play"}
        </label>
        <label style={S.check} title={"Starred players only"}>
          <input type="checkbox" checked={onlyWatch}
            onChange={e => setOnlyWatch(e.target.checked)} />{"★ watchlist ("}{watchSet.size})
        </label>
        {mineSet.size > 0 && (
          <label style={S.check} title={"Only players in my squad"}>
            <input type="checkbox" checked={onlyMine}
              onChange={e => setOnlyMine(e.target.checked)} />{"my squad ("}{mineSet.size})
          </label>
        )}
        {!!(cmpIds || []).length && (
          <label style={S.check}>
            <input type="checkbox" checked={hidePicked}
              onChange={e => setHidePicked(e.target.checked)} />{"hide selected ("}{cmpIds.length})
          </label>
        )}
      </div>

      {/* ---------- almennur throskuldur a HVAÐA tolu sem er ----------
          Thrjatiu sliderar a skja i einu eru onothaefir; thetta gefur
          sama kraft i einu chipi.                                      */}
      <div style={S.thRow}>
        <span style={S.thLbl}>{"Threshold:"}</span>
        <StatPicker value={thKey} onChange={setThKey} />
        {/* ORD, EKKI TAKN. "≥" og "≤" eru vanaspurning: notandinn tharf ad
            muna hvor bogi opnast hvert, og thad er ekki thess vert i einu
            filter-vidmoti. "minnst 5" og "mest 5" lesast rett i fyrstu
            tilraun og thurfa engan lykil.                                */}
        <select style={S.selOp} value={thOp} onChange={e => setThOp(e.target.value)}>
          <option value=">=">{"min"}</option>
          <option value="<=">{"max"}</option>
        </select>
        <input style={S.thVal} type="number" step="any" placeholder={"number"}
          value={thVal} onChange={e => setThVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addTh(); }} />
        <button style={S.addBtn} onClick={addTh}>{"add"}</button>
      </div>

      {/* ---------- VIRKAR SIUR ----------
          EIGIN RAMMI MED TOLU, EKKI LAUS CHIP-ROD. Beidnin var ad "hafa
          augljost hvada filteringar eru i gangi": throskuldur getur legid a
          dalki i ODRUM flokki en theim sem er opinn, svo lista sem er auðvelt
          ad missa ur augsyn er ekki nog. Hver throskuldur er RITANLEGUR HER
          — tala, atti og eyding — svo enginn thurfi ad setja hann inn upp a
          nytt til ad breyta 90 i 85.                                      */}
      {filterCount > 0 && (
        <div style={S.filterBar}>
          <span style={S.filterHd}>{"Filters"} <span style={S.filterN}>{filterCount}</span></span>
          {thresholds.map((t, i) => {
            const d = STAT_BY_KEY[t.key];
            return (
              <span key={t.key + t.op} style={S.thChip}>
                {/* Heitid er HNAPPUR: hann opnar flokkinn sem dalkurinn er i,
                    svo hægt se ad SJA toluna sem er sídad eftir.          */}
                <button style={S.thChipName}
                  title={`${d?.label || t.key} — click to show this column${d?.note ? "\n\n" + d.note : ""}`}
                  onClick={() => d && setGroup(d.group)}>
                  {d?.short || d?.label || t.key}
                </button>
                <button style={S.thChipOp}
                  title={"Switch between a minimum and a maximum"}
                  onClick={() => setThAt(i, { op: t.op === ">=" ? "<=" : ">=" })}>
                  {t.op === ">=" ? "min" : "max"}
                </button>
                <input style={S.thChipVal} type="number" step="any" value={t.val}
                  aria-label={`${d?.label || t.key} ${t.op === ">=" ? "minimum" : "maximum"}`}
                  autoFocus={freshTh === `${t.key}|${t.op}`}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const v = parseFloat(String(e.target.value).replace(",", "."));
                    setThAt(i, { val: Number.isFinite(v) ? v : e.target.value });
                  }} />
                {d?.pct ? <span style={S.thChipUnit}>%</span> : null}
                <button style={S.thChipX} aria-label={"Remove filter"}
                  onClick={() => dropThAt(i)}>✕</button>
              </span>
            );
          })}
          {chips.map(([label, clear], i) => (
            <button key={i} style={S.chip} onClick={clear}>{label} ✕</button>
          ))}
        </div>
      )}

      {/* ---------- flokkar ----------
           BROTNA A BORDI, SKRUNA I SIMA. Rodin var alltaf nowrap+auto med
           `scrollbarWidth:none` — thad er RETT i sima (fingur strjuka og
           fjorar linur af hnoppum aeta skjainn, kafli 6i) en a bordi var
           ENGIN visbending um ad meira vaeri til hægra: maelt 7.8.2026
           voru 289 px af 1.539 px utan skjas og tveir flokkar ("FPL rank",
           "Cards and penalties") osynilegir — og thad var MITT verk ad
           baeta 13. flokknum vid (DC-hittni). A bordi er lodrett plass
           odyrt, svo thar brotnar rodin i tvaer linur og allir flokkar
           sjast; i sima helst strjuk-rodin obreytt.                      */}
      <div style={{ ...S.groupRow, ...(narrow ? {} : S.groupRowWide) }}>
        {STAT_GROUPS.map(g => (
          <button key={g.key} style={{ ...S.groupBtn, ...(group === g.key ? S.groupOn : {}) }}
            onClick={() => setGroup(g.key)}>
            {g.label}
            {/* TALAN A HNAPPNUM ER SVARID VID "hann eltir ef eg skipti um
                flokk": sian a Threat helst thegar Sokn er opnud, og hun
                SEGIR FRA SER hérna i stad thess ad thegja i lokuðum flokki. */}
            {thPerGroup[g.key]
              ? <span style={S.groupBadge}
                  title={interp("{0} filter(s) on columns in this group", [thPerGroup[g.key]])}>
                  {thPerGroup[g.key]}
                </span>
              : null}
          </button>
        ))}
      </div>

      {/* ---------- tafla ---------- */}
      {!sorted.length ? (
        <div style={S.empty}>
          <b>{"No player matches."}</b> {"Active filters:"} {filterCount
            ? [...thresholds.map(t => `${STAT_BY_KEY[t.key]?.label || t.key} `
                + `${t.op === ">=" ? "min" : "max"} ${t.val}`),
               ...chips.map(([l]) => l)].join(" · ")
            : "none"}.
          {filterCount > 0 && <> <button style={S.link} onClick={() => {
            setThresholds([]); setMinCost(""); setMaxCost("");
          }}>{"clear thresholds and price range"}</button></>}
        </div>
      ) : (
        <div ref={scrollRef} style={S.scroll}>
          <div style={{ height: sorted.length * ROW_H + HEAD_H, position: "relative", minWidth: "max-content" }}>
            {/* ---------- HAUS: TVO THREP ----------
                Bands-rodin ofan a heitunum. Frosnu hólfin (nafn, verd,
                eign) eru sett i BADAR radirnar hvor fyrir sig — sticky
                gildir per holf, svo hausinn getur ekki verið eitt
                samfellt holf yfir bædi threp.                          */}
            <div style={{ ...S.hStick, width: "100%" }}>
              <div style={S.bandRow}>
                <div style={{ ...S.bandCell, ...cName, ...S.bandFrozen }}>{group === "core" ? "" : ""}</div>
                <div style={{ ...S.bandCell, width: wNum * 2, minWidth: wNum * 2 }}>{"Today"}</div>
                {bands.map((b, i) => (
                  <div key={i} style={{ ...S.bandCell, width: b.w, minWidth: b.w, maxWidth: b.w,
                                        ...(b.band ? S.bandOn : {}) }}
                    title={b.band}>{b.band}</div>
                ))}
                <div style={{ ...S.bandCell, ...S.cAct }} />
              </div>
              <div style={S.hRow}>
                <div style={{ ...S.hCell, ...cName, ...S.hName }} role="columnheader" aria-sort={aria("__name")}
                  tabIndex={0} onClick={() => sortOn("__name", false)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortOn("__name", false); } }}>
                  {/* Stjarnan i hausnum er SIA, ekki rodun. stopPropagation
                      thvi smellur a hausinn sjalfan radar eftir nafni.       */}
                  <button style={{ ...S.starHead, ...(onlyWatch ? S.starOn : {}) }}
                    aria-pressed={onlyWatch}
                    title={onlyWatch ? "Show all" : "Show watchlist only"}
                    onClick={e => { e.stopPropagation(); setOnlyWatch(v => !v); }}>
                    {onlyWatch ? "★" : "☆"}
                  </button>
                  {"Player"}{arrow("__name")}
                </div>
                <div style={{ ...S.hCell, ...cNum }} aria-sort={aria("__cost")} tabIndex={0}
                  title={"Current price — always today's price, also for a historical season"}
                  onClick={() => sortOn("__cost", false)}>{"Price"}{arrow("__cost")}</div>
                <div style={{ ...S.hCell, ...cNum }} aria-sort={aria("__own")} tabIndex={0}
                  title={"Share of all FPL squads that own him right now"}
                  onClick={() => sortOn("__own")}>{"Owned %"}{arrow("__own")}</div>
                {visibleCols.map(d => (
                  <div key={d.key} style={{ ...S.hCell, ...cFor(d),
                         ...(gwActive && blindKeys.has(d.key) ? S.hBlind : {}),
                         ...(thByKey[d.key] ? S.hFiltered : {}) }}
                    title={`${d.label}${d.short && d.short !== d.label ? ` (${d.short})` : ""}`
                         + `${d.derived ? " · computed by us from FPL fields" : ""}`
                         + `\n\n${d.note || ""}`
                         + `\n\nClick the header to sort. Click any value in the column to filter on it.`
                         + (gwActive && blindKeys.has(d.key)
                            ? `\n\nSEASON FIGURE: does not follow the gameweek range, shows the total.` : "")}
                    aria-sort={aria(d.key)} tabIndex={0}
                    onClick={() => sortOn(d.key, d.hi !== false)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortOn(d.key, d.hi !== false); } }}>
                    {thByKey[d.key] ? <span style={S.hFunnel} title={"filtered"}>▼</span> : null}
                    {hLabel(d)}{d.derived ? "†" : ""}
                    {/* Merking a dalkinum sjalfum, ekki adeins i skyringu:
                        notandinn les tofluna, ekki fotnotur. */}
                    {gwActive && blindKeys.has(d.key)
                      ? <span style={S.blindMark} title={"season figure"}>∑</span> : null}
                    {arrow(d.key)}
                  </div>
                ))}
                <div style={{ ...S.hCell, ...S.cAct }}>+</div>
              </div>
            </div>

            {window_.map((r, i) => {
              const idx = first + i;
              const inCmp = (cmpIds || []).includes(r.p.id);
              const isWatched = watchSet.has(r.p.id);
              const isMine = mineSet.has(r.p.id);
              return (
                <div key={r.p.code} style={{
                  ...S.row, top: HEAD_H + idx * ROW_H,
                  ...(idx % 2 ? S.rowAlt : {}),
                  ...(isMine ? S.rowMine : {}), ...(inCmp ? S.rowPicked : {}),
                }}>
                  {/* TVEIR SKUGGAR A SAMA HOLFI: graena rondin ("mitt lid",
                      inset) og kant-skugginn thegar skrunad er larett. Their
                      MEGA EKKI skrifa hvor yfir annan — `cellMine` var
                      spread-ad EFTIR `cName` og hefdi thurrkað kantinn ut,
                      svo rondin hefdi horfid um leid og skrunad var.       */}
                  <div style={{ ...S.cell, ...cName,
                    boxShadow: [isMine ? S.cellMine.boxShadow : "",
                                scrolledX ? S.frozenShadow.boxShadow : ""]
                               .filter(Boolean).join(", ") || undefined }}>
                    {/* BORDINN ER A HOLFINU, EKKI RODINNI. Rodin skrunar
                        larett; bordi a henni hefdi horfid vid fyrsta skrun.
                        Frosna holfid er alltaf synilegt.                   */}
                    <button style={{ ...S.star, ...(isWatched ? S.starOn : {}) }}
                      aria-pressed={isWatched}
                      aria-label={isWatched ? interp("Remove {0} from the watchlist", [r.p.web_name])
                                            : interp("Add {0} to the watchlist", [r.p.web_name])}
                      title={isWatched ? "On the watchlist — click to remove" : "Add to the watchlist"}
                      onClick={e => { e.stopPropagation(); onWatch?.(r.p.id); }}>
                      {isWatched ? "★" : "☆"}
                    </button>
                    <button style={S.nameBtn} onClick={() => onPickPlayer?.(r.p.id)}
                      title={r.p.news || `${r.p.first_name} ${r.p.second_name}`}>
                      {!narrow && (photoUrl && r.p.code
                        ? <RowPhoto src={photoUrl(r.p.code)} name={r.p.web_name} />
                        : <span style={S.imgFb}>{r.p.web_name.slice(0, 1)}</span>)}
                      <span style={{ ...S.dot, background: POS_COLOR[r.p.element_type] }} />
                      <span style={S.nm}>{r.p.web_name}</span>
                      <span style={S.teamTag}>
                        {Crest && r.team ? <Crest team={r.team} size={11} /> : null}
                        {r.team?.short}
                      </span>
                      {!r.avail && <span style={S.flag} title={r.p.news || "Not available"}>!</span>}
                      {!isLive && !r.hist && <span style={S.noHist} title={interp("No data in {0}", [season])}>—</span>}
                    </button>
                  </div>
                  <div style={{ ...S.cell, ...cNum, ...S.strong }}>£{r.cost.toFixed(1)}</div>
                  <div style={{ ...S.cell, ...cNum }}>{r.own.toFixed(1)}</div>
                  {visibleCols.map(d => {
                    const v = r.src ? d.get(r.src) : null;
                    /* SMELLUR A TOLU SETUR SIU A HANA. Tomt holf er EKKI
                       smellanlegt: "engin gogn" er ekki tala og throskuldur
                       ur henni vaeri tilbuningur.
                       BYRJUNAR-LIKUR FA LIT — thad var eini dalkurinn sem
                       hafdi hann adur (i tvitekna hola dalknum lengst til
                       haegri, sem er nu farinn) og hann a hann skilid:
                       "start prob" er einmitt talan sem a ad hropa.        */
                    const isSp = d.key === "start_prob";
                    return (
                      <div key={d.key} style={{ ...S.cell, ...cFor(d),
                        ...(v == null ? S.miss : S.cellHit),
                        ...(isSp && v != null ? {
                          fontWeight: 700,
                          color: r.startLevel === "safe" ? "#046b41"
                               : r.startLevel === "trap" ? C.red
                               : r.startLevel === "mid" ? C.amber : C.text3 } : {}) }}
                        title={v == null ? interp("{0}: no data", [d.label])
                          : (isSp && r.startLevel === "trap"
                             ? `${d.label}: ${fmtStat(d, v)} — started last time but is at risk of the bench.`
                               + `\nClick to filter on this value.`
                             : `${d.label}: ${fmtStat(d, v)}`
                               + `\nClick to filter (${d.hi === false ? "max" : "min"} ${(+v.toFixed(d.dec ?? 0))}).`)}
                        onClick={v == null ? undefined : () => filterOnValue(d, v)}>
                        {v == null ? "—" : fmtStat(d, v)}
                      </div>
                    );
                  })}
                  <div style={{ ...S.cell, ...S.cAct }}>
                    <button style={{ ...S.addSm, ...(inCmp ? S.addSmOn : {}) }}
                      title={inCmp ? "In the comparison" : "Add to the comparison"}
                      onClick={() => onCompare?.(r.p.id)}>{inCmp ? "✓" : "⇄"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={S.legend}>
        <b>{"Click any value to filter on it"}</b> {"— it becomes an editable chip above the table that stays with you when you switch column group. Click a header to sort, a name to open the card,"} <b>⇄</b> {"to compare. Hover any header for what the number is and what counts as good."}
        {" "}<b>†</b> {"= computed by us from FPL fields."} <b>—</b> {"= data missing (not zero) and always sorts"} <b>{"last"}</b>{", in both directions; a column that is empty for everyone in"}
        {" "}{season} {"is still shown, because \"no data\" is information too."}
        {" "}<b style={{ color:"#e8a71c" }}>★</b> {"adds to the watchlist (saved between visits); the star in the header shows the watchlist only."}
        {" "}<b style={{ color:C.green }}>{"A green stripe"}</b> {"= a player in your squad — the stripe is on the name cell because the row scrolls sideways."}
      </div>
    </section>
  );

  function addTh() {
    const v = parseFloat(String(thVal).replace(",", "."));
    if (!Number.isFinite(v) || !STAT_BY_KEY[thKey]) return;
    setThresholds(t => [...t.filter(x => !(x.key === thKey && x.op === thOp)),
                        { key: thKey, op: thOp, val: v }]);
    setThVal("");
  }
}

const S = {
  /* ---- sjonraent umferdar-bil ---- */
  gwRetry:{ border:`1px solid ${C.border}`, background:"#fff", borderRadius:5,
            padding:"1px 7px", fontSize:10.5, cursor:"pointer", color:C.purple, fontWeight:700 },
  gwWrap:{ display:"flex", flexDirection:"column", gap:4, padding:"7px 0 2px" },
  gwTop:{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" },
  gwLbl:{ fontSize:11, fontWeight:700, color:C.text2 },
  gwPresets:{ display:"flex", gap:3, flexWrap:"wrap" },
  gwPreset:{ border:`1px solid ${C.border}`, background:"#fff", color:C.text2,
             borderRadius:5, padding:"2px 7px", fontSize:11, cursor:"pointer" },
  gwPresetOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}`, fontWeight:600 },
  gwNow:{ fontFamily:mono, fontSize:11, color:C.purple, fontWeight:700 },
  gwBar:{ display:"flex", gap:1, flexWrap:"nowrap", overflowX:"auto" },
  /* ALLIR 38 KASSAR BERA NU TOLU (adur adeins 1,5,10...). Tveggja-stafa
     tolur tharfnast meira plass: minWidth 14 -> 19 og letur 8,5 -> 9.
     38 x 19 px + bil = ~760 px og roðin er ~1.250 px, svo thad passar.  */
  gwCell:{ flex:"1 1 0", minWidth:19, height:18, border:`1px solid ${C.border}`,
           background:"#fafafb", color:C.text3, borderRadius:2, cursor:"pointer",
           fontSize:9, padding:0, lineHeight:"16px", fontFamily:mono },
  gwOn:{ background:"#e8e2ee", color:C.purple, borderColor:"#cdbcd8" },
  gwEdge:{ background:C.purple, color:"#fff", borderColor:C.purple, fontWeight:700 },
  gwNote:{ fontSize:10.5, color:C.text3, lineHeight:1.35 },
  blindTag:{ fontSize:9, fontWeight:700, background:"#f0eef4", color:"#4a3d5c",
             borderRadius:3, padding:"0 3px" },
  hBlind:{ background:"#faf7fb", color:"#8b7d9b" },
  blindMark:{ fontSize:9, color:"#9a8aa8", marginLeft:1 },

  /* ---- leitanlegur dalkavalari (108 dalkar; select var oskrunanlegur) ---- */
  pkWrap:{ position:"relative", minWidth:150, flex:"0 1 190px" },
  pkInput:{ width:"100%", boxSizing:"border-box", font:"inherit", fontSize:12,
            padding:"4px 18px 4px 7px", border:`1px solid ${C.border}`,
            borderRadius:6, background:"#fff", color:C.text },
  pkCaret:{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)",
            fontSize:9, color:C.text3, pointerEvents:"none" },
  pkList:{ position:"absolute", zIndex:40, top:"calc(100% + 2px)", left:0,
           minWidth:"100%", width:"max-content", maxWidth:300, maxHeight:290,
           overflowY:"auto", background:"#fff", border:`1px solid ${C.border}`,
           borderRadius:8, boxShadow:"0 10px 28px rgba(0,0,0,0.16)", padding:3 },
  pkGrp:{ fontSize:9.5, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase",
          color:C.text3, padding:"6px 6px 2px" },
  pkOpt:{ fontSize:12, padding:"4px 7px", borderRadius:5, cursor:"pointer",
          color:C.text, display:"flex", alignItems:"center", gap:5,
          whiteSpace:"nowrap" },
  pkOptHi:{ background:"#f0eef4" },
  pkOptSel:{ fontWeight:700, color:C.purple },
  pkLive:{ fontSize:8.5, fontWeight:700, color:"#0a7d4f", background:"#e6f7ef",
           borderRadius:3, padding:"0 3px" },
  pkShort:{ fontSize:9, fontFamily:mono, color:C.text3, background:"#f2f2f5",
            borderRadius:3, padding:"0 3px", marginLeft:"auto" },
  pkNone:{ fontSize:12, color:C.text3, padding:"8px 7px" },

  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 },
  head:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  sub:{ fontSize:11.5, color:C.text2, marginTop:3, display:"flex", alignItems:"center", gap:6 },
  histTag:{ fontSize:9.5, background:C.cardAlt, border:`1px solid ${C.border}`,
            borderRadius:4, padding:"1px 5px", color:C.text3 },
  headCtl:{ display:"flex", alignItems:"center", gap:6 },
  sel:{ border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 7px", fontSize:11.5, maxWidth:200 },
  selOp:{ font:"inherit", fontSize:12, padding:"4px 6px", border:`1px solid ${C.border}`,
          borderRadius:6, background:"#fff", color:C.text },
  selNarrow:{ border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 5px", fontSize:12 },
  clearAll:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2,
             borderRadius:6, padding:"3px 9px", fontSize:11, cursor:"pointer" },
  warn:{ fontSize:11.5, color:"#7a5600", background:C.amberBg, border:"1px solid #f0dcae",
         borderRadius:6, padding:"7px 9px", margin:"10px 0", lineHeight:1.5 },
  note:{ fontSize:11.5, color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`,
         borderRadius:6, padding:"7px 9px", margin:"10px 0", lineHeight:1.5 },
  muted:{ fontSize:11.5, color:C.text3 },
  noteMini:{ display:"block", width:"100%", textAlign:"left", fontSize:10.5,
             color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`,
             borderRadius:6, padding:"5px 8px", margin:"8px 0 0", cursor:"pointer" },
  mixMini:{ fontSize:10, padding:"5px 8px", lineHeight:1.45 },
  mixNote:{ fontSize:11, color:"#0a5c3e", background:C.greenBg, border:"1px solid #b9e8d0",
            borderRadius:6, padding:"6px 9px", margin:"8px 0 0", lineHeight:1.5 },

  filters:{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center", margin:"10px 0 7px" },
  posRow:{ display:"flex", gap:3 },
  posBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:5,
           padding:"3px 9px", fontSize:11.5, fontWeight:600, cursor:"pointer" },
  posOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  search:{ border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 8px", fontSize:11.5,
           flex:"1 1 170px", minWidth:130 },
  costWrap:{ display:"inline-flex", alignItems:"center", gap:3, border:`1px solid ${C.border}`,
             borderRadius:6, padding:"2px 6px", background:C.card },
  costLbl:{ fontSize:11, color:C.text3 },
  costIn:{ width:48, border:"none", outline:"none", fontSize:11.5, fontFamily:mono,
           background:"transparent", color:C.text },
  check:{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.text2, cursor:"pointer" },

  thRow:{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginBottom:7 },
  thLbl:{ fontSize:11, color:C.text3 },
  thVal:{ width:70, border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 6px",
          fontSize:11.5, fontFamily:mono },
  addBtn:{ border:"none", background:C.purple, color:"#fff", borderRadius:6,
           padding:"4px 10px", fontSize:11, fontWeight:600, cursor:"pointer" },
  chipRow:{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 },
  chip:{ border:`1px solid #d9c7dc`, background:"#f6f1f7", color:C.purple, borderRadius:12,
         padding:"2px 8px", fontSize:10.5, cursor:"pointer" },

  /* ---- VIRKAR SIUR: eigin rammi, ekki laus chip-rod ----
     Rammi + tala + eigin bakgrunnur svo "hvad er i gangi" se lesid i einu
     augnakasti. Chip-in eru RITANLEG (tala, atti, eyding) — thad var
     beidnin: breyta gildi an ad setja siuna inn upp a nytt.             */
  filterBar:{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center",
              background:"#f8f5f9", border:`1px solid #e4d8e7`, borderRadius:8,
              padding:"6px 8px", marginBottom:8 },
  filterHd:{ fontSize:10, fontWeight:700, letterSpacing:0.6, textTransform:"uppercase",
             color:C.purple, display:"flex", alignItems:"center", gap:4 },
  filterN:{ background:C.purple, color:"#fff", borderRadius:9, minWidth:14,
            textAlign:"center", padding:"0 4px", fontSize:9.5, letterSpacing:0 },
  thChip:{ display:"inline-flex", alignItems:"center", gap:0,
           border:`1px solid #cdb5d2`, background:"#fff", borderRadius:12,
           overflow:"hidden", height:22 },
  thChipName:{ border:"none", background:"transparent", color:C.purple, fontWeight:700,
               fontSize:10.5, padding:"0 6px", cursor:"pointer", height:"100%",
               maxWidth:110, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  thChipOp:{ border:"none", borderLeft:"1px solid #ecdff0", background:"#faf6fb",
             color:C.text2, fontSize:9.5, padding:"0 5px", cursor:"pointer", height:"100%" },
  thChipVal:{ width:46, border:"none", borderLeft:"1px solid #ecdff0", outline:"none",
              fontFamily:mono, fontSize:11, textAlign:"right", padding:"0 3px",
              height:"100%", color:C.text, background:"#fff",
              /* number-spinnerarnir eta 16 px af 46 og gera reitinn ólæsilegan */
              MozAppearance:"textfield" },
  thChipUnit:{ fontSize:9.5, color:C.text3, paddingRight:2 },
  thChipX:{ border:"none", borderLeft:"1px solid #ecdff0", background:"#faf6fb",
            color:C.text3, fontSize:10, padding:"0 5px", cursor:"pointer", height:"100%" },
  groupBadge:{ marginLeft:4, background:C.purple, color:"#fff", borderRadius:8,
               fontSize:8.5, fontWeight:700, padding:"0 4px", verticalAlign:"middle" },

  groupRow:{ display:"flex", gap:4, marginBottom:8, overflowX:"auto",
             borderBottom:`1px solid ${C.border}`, paddingBottom:7,
             scrollbarWidth:"none", WebkitOverflowScrolling:"touch" },
  /* Bord: brotna i stad ad skruna (sja skyringu vid notkun). rowGap svo
     tvaer linur klessist ekki saman.                                     */
  groupRowWide:{ flexWrap:"wrap", overflowX:"visible", rowGap:4 },
  groupBtn:{ border:"none", background:"transparent", color:C.text2, borderRadius:5,
             padding:"4px 9px", fontSize:11.5, fontWeight:600, cursor:"pointer",
             whiteSpace:"nowrap", flex:"0 0 auto" },
  groupOn:{ background:"#f1e9f2", color:C.purple },

  scroll:{ overflow:"auto", maxHeight:"min(66vh, 620px)", border:`1px solid ${C.border}`,
           borderRadius:8, position:"relative" },
  /* TVO THREP: `hStick` er sticky-umgjordin, `bandRow` og `hRow` eru
     radirnar inni i henni. Sticky-vinstri gildir PER HOLF, svo frosnu
     holfin eru sett i badar radir hvor fyrir sig — eitt holf getur ekki
     spannad bædi threpin.                                               */
  hStick:{ position:"sticky", top:0, zIndex:3, display:"flex", flexDirection:"column",
           background:C.cardAlt, borderBottom:`1px solid ${C.borderStrong || C.border}` },
  bandRow:{ display:"flex", height:BAND_H, background:"#f2f0f5" },
  bandCell:{ boxSizing:"border-box", display:"flex", alignItems:"center",
             justifyContent:"center", fontSize:9.5, fontWeight:700,
             letterSpacing:0.4, textTransform:"uppercase", color:C.text3,
             padding:"0 4px", whiteSpace:"nowrap", overflow:"hidden",
             borderRight:"1px solid #e6e4ec" },
  bandOn:{ color:"#5a4a66", background:"#eae6f0" },
  bandFrozen:{ position:"sticky", left:0, zIndex:2, background:"#f2f0f5",
               borderRight:`1px solid ${C.border}` },
  hRow:{ display:"flex", height:LABEL_H },
  /* Frosni HAUS-dalkurinn er VINSTRI-jafnadur (allir adrir haegri).
     Adur var "Player" haegri-jafnad, svo thad sat thett upp vid naesta
     haus-heiti sem er klippt vinstra megin thegar skrunad er — tvo hálf
     ord i beinni rod, sem las eins og bilun ("Player" + "ice chg (GW)"). */
  /* BAKGRUNNURINN VERDUR AD VERA BEINN, EKKI `inherit`.
     THETTA VAR VILLAN SEM NOTANDINN SA ("þegar ég skrolla langt til hægri
     fer texti undir nöfnin og myndir af köllum"): `cName` ber
     `background:"inherit"`, sem virkar i GAGNARODUNUM thvi rodin sjalf
     setur lit — en i hausnum sat liturinn a sticky-UMGJORDINNI og
     haus-rodin sjalf var gagnsae, svo frosna "Player"-holfid var gagnsaett
     og haus-heitin skrunudu SYNILEGA undir thad ("s/xGIPlayer xGI/£m").
     Maelt i Chrome: bakgrunnur holfsins var rgba(0,0,0,0).
     Beinn litur her + `frozenShadow` a kantinum = holfid hylur og THAD
     SEST ad efnid heldur afram undir thvi.                              */
  hName:{ justifyContent:"flex-start", textAlign:"left", background:C.cardAlt },
  hFiltered:{ background:"#f3eaf5", color:C.purple },
  hFunnel:{ fontSize:7.5, color:C.purple, marginRight:2 },
  frozenShadow:{ boxShadow:"6px 0 8px -6px rgba(0,0,0,0.28)" },
  /* whiteSpace:"normal" + 2 linur: sja wOf. `lineHeight` er sett svo tvaer
     linur passi i haus-hædina an ad ýta rodunum nidur.                   */
  /* boxSizing:"border-box" A BADUM — HAUS OG HOLFI.
     AFTURFOR SEM MAELDIST: an thess var haus-holfid 2 px SMAERRA en
     gagna-holfid (60 a moti 62) thvi bordid og padding logdust UTAN a
     uppgefna breidd i einu en ekki i odru. Skekkjan HLADST UPP: dalkur 1
     var 2 px af, dalkur 9 var 16 px af, og tha situr heitid ekki lengur
     yfir sinum dalki. Med border-box er uppgefin breidd HEILDARBREIDDIN
     og haus og holf geta ekki rekid i sundur.
     fontSize 10,5 (var 9,5): heitin voru ordin of smá vid tveggja-linu
     brotid. Breiddar-formulan (wOf) notar 5,9 px/staf til samraemis.     */
  /* EIN LINA (`nowrap`) og HAEGRI-JOFNUN svo haus standi yfir sinni tolu:
     gildin eru haegri-jofnud (cNum) en hausinn var flex-start, svo stutt
     heiti sátu vinstra megin og long til haegri — thad var ojafnan sem
     notandinn sa. `justifyContent:flex-end` samraemir thetta.          */
  hCell:{ boxSizing:"border-box", display:"flex", alignItems:"center",
          justifyContent:"flex-end", textAlign:"right",
          fontSize:10.5, fontWeight:700, color:C.text2,
          padding:"0 5px", cursor:"pointer", userSelect:"none",
          whiteSpace:"nowrap", lineHeight:1.14,
          borderRight:"1px solid #eeeef1", overflow:"hidden" },
  /* BAKGRUNNURINN ER SKILYRDI, EKKI SKRAUT: frosna nafnaholfid (`cName`)
     erfir bakgrunn RADARINNAR (`background:"inherit"`). Vaeri rodin
     gagnsae — eins og hun var — skruna tolurnar SYNILEGA UNDIR nafninu
     ("6*Gabriel +GBP1.3"). Maelt i Chrome: bakgrunnur bædi radar og holfs
     var rgba(0,0,0,0). Litur ma ekki fjarlaegjast her.                   */
  row:{ position:"absolute", left:0, right:0, display:"flex", height:ROW_H,
        alignItems:"center", background:C.card,
        borderBottom:"1px solid #f4f4f6" },
  rowAlt:{ background:"#fcfcfd" },
  /* GRAENT THYDIR ADEINS "MITT LID". Samanburdur var adur greenBg — sami
     litur — svo hann er faerdur i ljosfjolublaan. Einn litur, ein merking. */
  rowPicked:{ background:"#f7f2f8" },
  rowMine:{ background:"#effaf4" },
  cellMine:{ boxShadow:`inset 3px 0 0 ${C.green}` },
  star:{ border:"none", background:"transparent", cursor:"pointer", padding:0,
         fontSize:13, lineHeight:1, color:"#c9c9d0", flex:"0 0 14px", width:14 },
  starHead:{ border:"none", background:"transparent", cursor:"pointer", padding:0,
             fontSize:12, lineHeight:1, color:"#c9c9d0", flex:"0 0 14px", width:14,
             marginRight:2 },
  starOn:{ color:"#e8a71c" },
  cell:{ boxSizing:"border-box", display:"flex", alignItems:"center", padding:"0 5px", fontSize:11.5,
         whiteSpace:"nowrap", borderRight:"1px solid #f6f6f8" },
  /* Tola sem MA smella a til ad sia. Bendillinn er eina visbendingin sem
     kostar ekkert sjonraent suð i 100-dalka toflu — tinting a hverju holfi
     hefdi gert tofluna oleaesilega.                                      */
  cellHit:{ cursor:"pointer" },
  cName:{ position:"sticky", left:0, zIndex:2, width:196, minWidth:196,
          background:"inherit", borderRight:`1px solid ${C.border}` },
  cNum:{ width:88, minWidth:88, maxWidth:88, justifyContent:"flex-end", fontFamily:mono, color:C.text2 },
  cAct:{ width:36, minWidth:36, justifyContent:"center" },
  strong:{ color:C.text, fontWeight:700 },
  miss:{ color:"#c4c4cc" },

  nameBtn:{ display:"flex", alignItems:"center", gap:4, border:"none", background:"transparent",
            cursor:"pointer", padding:0, width:"100%", textAlign:"left", overflow:"hidden" },
  img:{ width:20, height:25, objectFit:"contain", flex:"0 0 20px" },
  imgFb:{ width:20, height:25, display:"flex", alignItems:"center", justifyContent:"center",
          background:"#efeff2", borderRadius:3, fontSize:10, color:C.text3, flex:"0 0 20px" },
  dot:{ width:5, height:5, borderRadius:"50%", flex:"0 0 5px" },
  nm:{ fontSize:11.5, color:C.text, overflow:"hidden", textOverflow:"ellipsis", flex:1, minWidth:0 },
  teamTag:{ display:"flex", alignItems:"center", gap:2, fontSize:9, color:C.text3 },
  flag:{ fontSize:10, fontWeight:700, color:C.red },
  noHist:{ fontSize:9, color:C.text3 },
  addSm:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:4,
          fontSize:10, cursor:"pointer", padding:"1px 4px", lineHeight:1.3 },
  addSmOn:{ background:C.green, color:"#fff", border:`1px solid ${C.green}` },

  empty:{ fontSize:12, color:C.text2, padding:"18px 4px", lineHeight:1.6 },
  link:{ border:"none", background:"transparent", color:C.purple, fontSize:12,
         textDecoration:"underline", cursor:"pointer", padding:0 },
  legend:{ fontSize:10.5, color:C.text3, marginTop:9, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.55 },
};
