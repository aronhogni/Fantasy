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
import { t as tx } from "./i18n.js";
import { RAW } from "./dataUrl.js";
import { useLang } from "./useLang.js";
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
const POS_TABS = [["all","Allir"],["1","GK"],["2","DEF"],["3","MID"],["4","FWD"]];

/* Dalkar sem eru ALLTAF synilegir (ur nuverandi gognum, ekki timabili). */
const PINNED = ["now_cost", "selected_by_percent"];
const ROW_H = 34;          // fost haed -> synadarvaeding er einfold
const OVERSCAN = 12;

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
  const lang = useLang();   /* tungumal i dep-listum, sja useLang.js */
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
      const ds = STAT_DEFS.filter(d => d.group === g.key)
        .filter(d => !f || fold(d.label).includes(f) || fold(g.label).includes(f)
                        || fold(d.key).replace(/_/g, " ").includes(f)
                        || fold(d.key).includes(f));
      if (!ds.length) continue;
      out.push({ grp: g.label });
      for (const d of ds) out.push({ d, grp: g.label });
    }
    return out;
  }, [q, lang]);
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
        aria-label={tx("Leita að tölu")}
        placeholder={cur?.label || tx("veldu tölu")}
        value={open ? q : (cur?.label || "")}
        onFocus={() => setOpen(true)}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={key} />
      <span style={S.pkCaret} aria-hidden="true">▾</span>
      {open && (
        <div ref={listRef} style={S.pkList} role="listbox">
          {!pickable.length ? <div style={S.pkNone}>{tx("engin tala passar við „")}{q}“</div> : null}
          {items.map((it, i) => it.d ? (
            <div key={it.d.key} role="option"
              aria-selected={it.d.key === value}
              data-hi={pickable.indexOf(it) === hi ? "1" : "0"}
              style={{ ...S.pkOpt,
                       ...(pickable.indexOf(it) === hi ? S.pkOptHi : {}),
                       ...(it.d.key === value ? S.pkOptSel : {}) }}
              onMouseEnter={() => setHi(pickable.indexOf(it))}
              onMouseDown={e => { e.preventDefault(); commit(pickable.indexOf(it)); }}>
              {it.d.label}
              {it.d.live_only ? <span style={S.pkLive} title={tx("Fylgir EKKI valdu tímabili")}>{tx("nú")}</span> : null}
            </div>
          ) : <div key={"g" + i} style={S.pkGrp}>{it.grp}</div>)}
        </div>
      )}
    </div>
  );
}

export default function PlayerList({ players, teams, teamById, events, seasonsFile,
                                     imminent, shotsFile, fixtures, odds, defcon,
                                     photoUrl, Crest, onPickPlayer, onCompare, cmpIds,
                                     watch, onWatch, mineIds }) {
  const lang = useLang();   /* tungumal i dep-listum, sja useLang.js */
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
    () => (events || []).filter(e => e.finished).length, [events, lang]);
  const currentLabel = useMemo(() => {
    const d = (events || []).find(e => e.id === 1)?.deadline_time;
    const y = d ? new Date(d).getFullYear() : null;
    return y ? `${y}/${String((y + 1) % 100).padStart(2, "0")}` : tx("í ár");
  }, [events, lang]);
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
  }, [season, lang]);

  /* Hledur ADEINS thegar bil er raunverulega valid. Bilid er nullstillt
     thegar timabili er skipt — annars sæti GW30-38 eftir a nyju timabili
     og notandinn saei tolur fyrir bil sem hann valdi ekki thar.          */
  useEffect(() => { setGwRange(null); setGwErr(null); }, [season]);
  useEffect(() => {
    if (!gwRange || !seasonKey) return;
    if (gwFile?.key === seasonKey) return;
    let dead = false;
    setGwLoading(true); setGwErr(null);
    fetch(`${RAW}/player_gw_${seasonKey}.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { if (!dead) { setGwFile({ key: seasonKey, data }); setGwLoading(false); } })
      .catch(e => { if (!dead) { setGwErr(String(e.message || e)); setGwLoading(false); } });
    return () => { dead = true; };
  }, [gwRange, seasonKey, gwFile]);

  const gwActive = !!(gwRange && gwFile?.key === seasonKey && gwFile?.data);
  /* LEITT UT ur STAT_DEFS, ekki handskrifad — sja gwBlindKeys i stats.js.
     Fyrsta utgafa var handskrifadur lyklalisti og 13 af 22 lyklum voru
     RANGIR, svo merkingin birtist hvergi.                               */
  /* `lang` i dep-listanum: STAT_DEFS-heiti eru LAZY og fylgja tungumali,
     svo blindu-mengid verdur ad endurreiknast vid tungumalabreytingu.   */
  const blindKeys = useMemo(() => gwBlindKeys(), [lang]);

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
  const [thresholds, setThresholds] = useState([]);   // [{key, op, val}]
  const [sortKey, setSortKey] = useState("total_points");
  const [sortDir, setSortDir] = useState("desc");
  const [showEmpty, setShowEmpty] = useState(false);
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
    /* DC-hittni per leikmann (fpl_id -> rod). Tomt fram ad GW1.        */
    const dcHitById = {};
    for (const r of defcon?.players || []) dcHitById[r.fpl_id] = r;

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
        _dc_hit_adj: num(dcHitById[p.id]?.hit_rate_adj),
        _dc_hit_raw: num(dcHitById[p.id]?.hit_rate),
        _dc_starts: num(dcHitById[p.id]?.starts),
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
      odds, defcon, lang, gwActive, gwFile, gwRange]);

  /* ---------- hvada dalkar hafa GOGN i thessu timabili ---------- */
  const groupCols = useMemo(() => {
    /* live_only-dalkar eru NUTIMA-gogn (ESPN sidustu umferdar, form-gluggi,
       leikir framundan, spyrnu-rod) og eru SYNDIR ALLTAF — timabils-valid
       styrir adeins ARSTIDAR-SUMMUM.
       AD FELA tha i sogulegu timabili gerdi tha ONAANLEGA, thvi 2026/27 er
       tomt. Heiti flokkanna segja tímabilið sjalf ("sidasta umferd",
       "sidustu 4-5", "framundan") og bordinn hér fyrir ofan endurtekur thad. */
    const defs = STAT_DEFS.filter(d => d.group === group);
    return defs.map(d => {
      const withVal = rows.reduce((n, r) => n + (r.src && d.get(r.src) != null ? 1 : 0), 0);
      return { def: d, withVal };
    });
  }, [group, rows, lang]);
  const visibleCols = useMemo(
    () => groupCols.filter(c => showEmpty || c.withVal > 0).map(c => c.def),
    [groupCols, showEmpty, lang]);
  const emptyCount = groupCols.filter(c => c.withVal === 0).length;

  const watchSet = useMemo(() => new Set(watch || []), [watch, lang]);
  const mineSet = useMemo(
    () => (mineIds instanceof Set ? mineIds : new Set(mineIds || [])), [mineIds, lang]);

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
      onlyWatch, onlyMine, watchSet, mineSet, lang]);

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
  }, [filtered, sortKey, sortDir, lang]);

  /* ---------- synadarvaeding (fost radahæd) ---------- */
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(620);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
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
  const cName = { ...S.cName, width: wName, minWidth: wName };
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
  const PXC = 6.35;
  const twoLineInner = label => {
    const words = label.split(" ");
    if (words.length === 1) return label.length * PXC;
    let best = Infinity;
    for (let i = 0; i < words.length - 1; i++) {
      const l1 = words.slice(0, i + 1).join(" ").length;
      const l2 = words.slice(i + 1).join(" ").length;
      best = Math.min(best, Math.max(l1, l2) * PXC);
    }
    return best;
  };
  const wOf = d => {
    const label = String(d?.label ?? "");
    /* "-" telst ordaskil (CSS brytur eftir bandstriki), "/" og "→" EKKI. */
    const longestWord = Math.max(...label.split(/[ (-]+/).map(w => w.length)) * PXC;
    /* Afleidd merki (†) er BAETT VID heitid i haus-rennslinu — an thess i
       breiddar-mati fell "Clean sheet %†" i thridju linu um 0,4 px.      */
    const marker = d?.derived ? 7 : 0;
    const lab = Math.max(twoLineInner(label), longestWord) + marker + 12;
    const dec = d?.dec ?? 0;
    const val = (4 + (dec ? dec + 1 : 0)) * 6.2 + 12; // tala (11px mono)
    /* ThAKID VIKUR FYRIR ORDI SEM GETUR EKKI BROTNAD. Vid 76 brotnadi
       "Byrjunarlið" i "Byrjunarli/ð" og "Vítavörslur" i "Vítavörslu/r" —
       stakur stafur a seinni linu. Ord an brotstada faer breiddina sina
       (hard hamark 114: "Byrjunarhlutfall" maelist 101,1 px og innri
       breiddin er breidd − 10 padding − 1 border — 112 vantadi 0,1 px).
       Kostnadur: ~6 dalkar × 15-35 px af ~6000 px skrunleid.            */
    const cap = Math.max(76, Math.min(114, longestWord + marker + 13));
    return Math.round(Math.max(46, Math.min(cap, Math.max(lab, val))));
  };
  /* Fostu dalkarnir (Verd, Eign %) sátu i 88 px thott heitin seu stutt. */
  const wNum = narrow ? 60 : wOf({ label: "Eign %", dec: 1 });
  const cNum  = { ...S.cNum,  width: wNum,  minWidth: wNum, maxWidth: wNum };
  const cFor = d => {
    const w = narrow ? Math.min(66, wOf(d)) : wOf(d);
    return { ...S.cNum, width: w, minWidth: w, maxWidth: w };
  };

  const sortOn = (key, higherBetter = true) => {
    if (sortKey === key) { setSortDir(d => d === "asc" ? "desc" : "asc"); return; }
    setSortKey(key); setSortDir(higherBetter ? "desc" : "asc");
  };
  const arrow = k => sortKey !== k ? "" : (sortDir === "asc" ? " ↑" : " ↓");
  const aria = k => sortKey !== k ? "none" : (sortDir === "asc" ? "ascending" : "descending");

  const chips = [];
  if (pos !== "all") chips.push([tx(POS[+pos]), () => setPos("all")]);
  if (q) chips.push([`„${q}"`, () => setQ("")]);
  if (minCost !== "") chips.push([`≥ £${minCost}`, () => setMinCost("")]);
  if (maxCost !== "") chips.push([`≤ £${maxCost}`, () => setMaxCost("")]);
  teamSel.forEach(id => chips.push([teamById?.[id]?.short || id,
    () => setTeamSel(v => v.filter(x => x !== id))]));
  if (onlyAvail) chips.push([tx("aðeins leikhæfir"), () => setOnlyAvail(false)]);
  if (hidePicked) chips.push([tx("fela valda"), () => setHidePicked(false)]);
  if (onlyWatch) chips.push([tx("★ vaktlisti"), () => setOnlyWatch(false)]);
  if (onlyMine) chips.push([tx("mitt lið"), () => setOnlyMine(false)]);
  thresholds.forEach((t, i) => chips.push([
    `${STAT_BY_KEY[t.key]?.label || t.key} ${t.op === ">=" ? tx("minnst") : tx("mest")} ${t.val}`,
    () => setThresholds(v => v.filter((_, j) => j !== i))]));

  if (!players?.length) {
    return <section style={S.card}><div style={S.muted}>{tx("Sæki leikmannagögn…")}</div></section>;
  }

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <h2 style={S.h2}>{tx("Leikmenn")}</h2>
          <div style={S.sub}>
            {sorted.length} {tx("af")} {players.length} · {season}
            {!isLive && <span style={S.histTag}>{tx("söguleg tölur")}</span>}
          </div>
        </div>
        <div style={S.headCtl}>
          <select style={S.sel} value={season ?? ""} onChange={e => setSeason(e.target.value)}>
            {seasonOpts.map(s => (
              <option key={s} value={s}>
                {s}{s === currentLabel && finishedGw === 0 ? tx(" (ekki hafið)") : ""}
              </option>
            ))}
          </select>
          {chips.length > 0 &&
            <button style={S.clearAll} onClick={() => {
              setPos("all"); setQ(""); setMinCost(""); setMaxCost(""); setTeamSel([]);
              setOnlyAvail(false); setHidePicked(false); setThresholds([]);
              setOnlyWatch(false); setOnlyMine(false);
            }}>{tx("hreinsa allt")}</button>}
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
            <span style={S.gwLbl}>{tx("Umferðir:")}</span>
            <div style={S.gwPresets}>
              <button style={{ ...S.gwPreset, ...(!gwRange ? S.gwPresetOn : {}) }}
                onClick={() => setGwRange(null)}>{tx("allt tímabilið")}</button>
              {[[30, 38, "30–38"], [20, 29, "20–29"], [1, 19, tx("fyrri hluti")],
                [20, 38, tx("seinni hluti")]].map(([a, b, l]) => (
                <button key={l} style={{ ...S.gwPreset,
                    ...(gwRange && gwRange[0] === a && gwRange[1] === b ? S.gwPresetOn : {}) }}
                  onClick={() => setGwRange([a, b])}>{l}</button>
              ))}
            </div>
            {gwRange && (
              <span style={S.gwNow}>
                GW {gwRange[0]}–{gwRange[1]}
                {gwLoading ? ` · ${tx("hleð…")}` : ""}
                {gwErr ? ` · ${tx("gögn vantar")}: ${gwErr}` : ""}
              </span>
            )}
          </div>
          <div style={S.gwBar} role="group" aria-label={tx("Veldu umferðabil")}>
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
                  {n % 5 === 0 || n === 1 ? n : ""}
                </button>
              );
            })}
          </div>
          {gwRange && (
            <div style={S.gwNote}>
              {tx("Bilið gildir um tölur sem má LEGGJA SAMAN. Verð, eignarhald, form, ICT og FPL-sæti eru árstíðartölur og fylgja EKKI bilinu — þeir dálkar eru merktir")}
              {" "}<span style={S.blindTag}>{tx("árstíð")}</span>{" "}
              {tx("og sýna heildina.")}
            </div>
          )}
        </div>
      )}

      {finishedGw === 0 && isLive && (
        <div style={S.warn}>
          <b>{currentLabel} {tx("er ekki hafið")}</b> {tx("— öll árstíðarsvið eru núll fyrir alla")}
          {" "}{players.length} {tx("leikmenn, svo þessi sýn hefur engar tölur að raða. Veldu")} <b>{olderSeasons[0] || tx("eldra tímabil")}</b> {tx("í fellilistanum.")}
        </div>
      )}
      {finishedGw === 0 && !isLive && (
        narrow && !showInfo ? (
          <button style={S.noteMini} onClick={() => setShowInfo(true)}>
            {currentLabel} {tx("ekki hafið — sýnir")} {season} · <b>{tx("af hverju?")}</b>
          </button>
        ) : (
          <div style={S.note}>
            <b>{currentLabel} {tx("er ekki hafið")}</b>{tx(", svo listinn sýnir")} <b>{season}</b>{tx(". Verð, staða og eignarhlutfall eru samt")} <b>{tx("úr dagsins gögnum")}</b> {tx("— þú kaupir á verði dagsins, ekki á verði")} {season}.
            {narrow && <> <button style={S.link} onClick={() => setShowInfo(false)}>{tx("fela")}</button></>}
          </div>
        )
      )}

      {!isLive && (() => {
        const liveCols = STAT_DEFS.filter(d => d.group === group && d.live_only).length;
        if (!liveCols) return null;
        return (
          <div style={{ ...S.mixNote, ...(narrow ? S.mixMini : {}) }}>
            <b>{tx("Þessi flokkur sýnir NÚTÍMA-gögn")}</b> {tx("— ekki")} {season}{tx(". Hann byggir á síðustu loknu umferð, form-glugganum eða leikjum framundan, svo hann breytist ekki þótt þú veljir annað tímabil. Árstíðar-summurnar (Grunnur, Sókn, Vörn …) fylgja hins vegar")} {season}.
          </div>
        );
      })()}

      {/* ---------- sior ---------- */}
      <div style={S.filters}>
        <div style={S.posRow}>
          {POS_TABS.map(([v, l]) => (
            <button key={v} style={{ ...S.posBtn, ...(pos === v ? S.posOn : {}) }}
              onClick={() => setPos(v)}>{tx(l)}</button>
          ))}
        </div>
        <input style={S.search} placeholder={tx("Leita — nafn eða lið")} value={q}
          onChange={e => setQ(e.target.value)} />
        <label style={S.costWrap} title={tx("Verðbil í milljónum")}>
          <span style={S.costLbl}>£</span>
          <input style={S.costIn} type="number" step="0.1" placeholder={tx("frá")}
            value={minCost} onChange={e => setMinCost(e.target.value)} />
          <span style={S.costLbl}>–</span>
          <input style={S.costIn} type="number" step="0.1" placeholder={tx("til")}
            value={maxCost} onChange={e => setMaxCost(e.target.value)} />
        </label>
        <select style={S.sel} value="" onChange={e => {
          const id = +e.target.value;
          if (id) setTeamSel(v => v.includes(id) ? v : [...v, id]);
        }}>
          <option value="">{tx("+ lið")}</option>
          {(teams || []).slice().sort((a, b) => String(a.short).localeCompare(String(b.short)))
            .map(t => <option key={t.id} value={t.id}>{t.short}</option>)}
        </select>
        <label style={S.check}>
          <input type="checkbox" checked={onlyAvail}
            onChange={e => setOnlyAvail(e.target.checked)} />{tx("aðeins leikhæfir")}
        </label>
        <label style={S.check} title={tx("Aðeins stjörnumerktir")}>
          <input type="checkbox" checked={onlyWatch}
            onChange={e => setOnlyWatch(e.target.checked)} />{tx("★ vaktlisti (")}{watchSet.size})
        </label>
        {mineSet.size > 0 && (
          <label style={S.check} title={tx("Aðeins leikmenn í mínu liði")}>
            <input type="checkbox" checked={onlyMine}
              onChange={e => setOnlyMine(e.target.checked)} />{tx("mitt lið (")}{mineSet.size})
          </label>
        )}
        {!!(cmpIds || []).length && (
          <label style={S.check}>
            <input type="checkbox" checked={hidePicked}
              onChange={e => setHidePicked(e.target.checked)} />{tx("fela valda (")}{cmpIds.length})
          </label>
        )}
      </div>

      {/* ---------- almennur throskuldur a HVAÐA tolu sem er ----------
          Thrjatiu sliderar a skja i einu eru onothaefir; thetta gefur
          sama kraft i einu chipi.                                      */}
      <div style={S.thRow}>
        <span style={S.thLbl}>{tx("Þröskuldur:")}</span>
        <StatPicker value={thKey} onChange={setThKey} />
        {/* ORD, EKKI TAKN. "≥" og "≤" eru vanaspurning: notandinn tharf ad
            muna hvor bogi opnast hvert, og thad er ekki thess vert i einu
            filter-vidmoti. "minnst 5" og "mest 5" lesast rett i fyrstu
            tilraun og thurfa engan lykil.                                */}
        <select style={S.selOp} value={thOp} onChange={e => setThOp(e.target.value)}>
          <option value=">=">{tx("minnst")}</option>
          <option value="<=">{tx("mest")}</option>
        </select>
        <input style={S.thVal} type="number" step="any" placeholder={tx("tala")}
          value={thVal} onChange={e => setThVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addTh(); }} />
        <button style={S.addBtn} onClick={addTh}>{tx("bæta við")}</button>
      </div>

      {chips.length > 0 && (
        <div style={S.chipRow}>
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
            onClick={() => setGroup(g.key)}>{g.label}</button>
        ))}
        {emptyCount > 0 && (
          <button style={{ ...S.groupBtn, ...S.emptyBtn, ...(showEmpty ? S.groupOn : {}) }}
            title={tx("{0} dálkar hafa engin gögn í {1}", [emptyCount, season])}
            onClick={() => setShowEmpty(v => !v)}>
            {showEmpty ? tx("fela tóma") : tx("sýna tóma dálka ({0})", [emptyCount])}
          </button>
        )}
      </div>

      {/* ---------- tafla ---------- */}
      {!sorted.length ? (
        <div style={S.empty}>
          <b>{tx("Enginn leikmaður passar.")}</b> {tx("Virkar síur:")} {chips.length
            ? chips.map(([l]) => l).join(" · ") : tx("engar")}.
          {chips.length > 0 && <> <button style={S.link} onClick={() => {
            setThresholds([]); setMinCost(""); setMaxCost("");
          }}>{tx("hreinsa þröskulda og verðbil")}</button></>}
        </div>
      ) : (
        <div ref={scrollRef} style={S.scroll}>
          <div style={{ height: sorted.length * ROW_H + 30, position: "relative", minWidth: "max-content" }}>
            {/* haus */}
            <div style={{ ...S.hRow, width: "100%" }}>
              <div style={{ ...S.hCell, ...cName }} role="columnheader" aria-sort={aria("__name")}
                tabIndex={0} onClick={() => sortOn("__name", false)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortOn("__name", false); } }}>
                {/* Stjarnan i hausnum er SIA, ekki rodun. stopPropagation
                    thvi smellur a hausinn sjalfan radar eftir nafni.       */}
                <button style={{ ...S.starHead, ...(onlyWatch ? S.starOn : {}) }}
                  aria-pressed={onlyWatch}
                  title={onlyWatch ? tx("Sýna alla") : tx("Sýna aðeins vaktlista")}
                  onClick={e => { e.stopPropagation(); setOnlyWatch(v => !v); }}>
                  {onlyWatch ? "★" : "☆"}
                </button>
                {tx("Leikmaður")}{arrow("__name")}
              </div>
              <div style={{ ...S.hCell, ...cNum }} aria-sort={aria("__cost")} tabIndex={0}
                onClick={() => sortOn("__cost", false)}>{tx("Verð")}{arrow("__cost")}</div>
              <div style={{ ...S.hCell, ...cNum }} aria-sort={aria("__own")} tabIndex={0}
                onClick={() => sortOn("__own")}>{tx("Eign %")}{arrow("__own")}</div>
              {visibleCols.map(d => (
                <div key={d.key} style={{ ...S.hCell, ...cFor(d),
                       ...(gwActive && blindKeys.has(d.key) ? S.hBlind : {}) }}
                  title={`${d.label}${d.note ? " — " + d.note : ""}` +
                         (gwActive && blindKeys.has(d.key)
                          ? ` — ${tx("ÁRSTÍÐARTALA: fylgir ekki umferðabilinu, sýnir heildina")}` : "")}
                  aria-sort={aria(d.key)} tabIndex={0}
                  onClick={() => sortOn(d.key, d.hi !== false)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortOn(d.key, d.hi !== false); } }}>
                  {d.label}{d.derived ? "†" : ""}
                  {/* Merking a dalkinum sjalfum, ekki adeins i skyringu:
                      notandinn les tofluna, ekki fotnotur. */}
                  {gwActive && blindKeys.has(d.key)
                    ? <span style={S.blindMark} title={tx("árstíðartala")}>∑</span> : null}
                  {arrow(d.key)}
                </div>
              ))}
              <div style={{ ...S.hCell, ...cNum }} aria-sort={aria("__start")} tabIndex={0}
                title={tx("Byrjunar-líkur — mælt, sjá Bekkjar-hætta")}
                onClick={() => sortOn("__start")}>{tx("Byrjar")}{arrow("__start")}</div>
              <div style={{ ...S.hCell, ...S.cAct }}>+</div>
            </div>

            {window_.map((r, i) => {
              const idx = first + i;
              const inCmp = (cmpIds || []).includes(r.p.id);
              const isWatched = watchSet.has(r.p.id);
              const isMine = mineSet.has(r.p.id);
              return (
                <div key={r.p.code} style={{
                  ...S.row, top: 30 + idx * ROW_H,
                  ...(idx % 2 ? S.rowAlt : {}),
                  ...(isMine ? S.rowMine : {}), ...(inCmp ? S.rowPicked : {}),
                }}>
                  <div style={{ ...S.cell, ...cName, ...(isMine ? S.cellMine : {}) }}>
                    {/* BORDINN ER A HOLFINU, EKKI RODINNI. Rodin skrunar
                        larett; bordi a henni hefdi horfid vid fyrsta skrun.
                        Frosna holfid er alltaf synilegt.                   */}
                    <button style={{ ...S.star, ...(isWatched ? S.starOn : {}) }}
                      aria-pressed={isWatched}
                      aria-label={isWatched ? tx("Fjarlægja {0} af vaktlista", [r.p.web_name])
                                            : tx("Setja {0} á vaktlista", [r.p.web_name])}
                      title={isWatched ? tx("Á vaktlista — smelltu til að fjarlægja") : tx("Setja á vaktlista")}
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
                      {!r.avail && <span style={S.flag} title={r.p.news || tx("Ekki leikhæfur")}>!</span>}
                      {!isLive && !r.hist && <span style={S.noHist} title={tx("Engin gögn í {0}", [season])}>—</span>}
                    </button>
                  </div>
                  <div style={{ ...S.cell, ...cNum, ...S.strong }}>£{r.cost.toFixed(1)}</div>
                  <div style={{ ...S.cell, ...cNum }}>{r.own.toFixed(1)}</div>
                  {visibleCols.map(d => {
                    const v = r.src ? d.get(r.src) : null;
                    return (
                      <div key={d.key} style={{ ...S.cell, ...cFor(d),
                        ...(v == null ? S.miss : {}) }}>
                        {v == null ? "—" : fmtStat(d, v)}
                      </div>
                    );
                  })}
                  <div style={{ ...S.cell, ...cNum }}>
                    {r.startP == null ? <span style={S.miss}>—</span> : (
                      <span style={{ fontWeight: 700,
                        color: r.startLevel === "safe" ? "#046b41"
                             : r.startLevel === "trap" ? C.red
                             : r.startLevel === "mid" ? C.amber : C.text3 }}
                        title={r.startLevel === "trap"
                          ? tx("Byrjaði síðast en er í bekkjar-hættu") : undefined}>
                        {Math.round(r.startP * 100)}%
                      </span>
                    )}
                  </div>
                  <div style={{ ...S.cell, ...S.cAct }}>
                    <button style={{ ...S.addSm, ...(inCmp ? S.addSmOn : {}) }}
                      title={inCmp ? tx("Í samanburði") : tx("Bæta í samanburð")}
                      onClick={() => onCompare?.(r.p.id)}>{inCmp ? "✓" : "⇄"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={S.legend}>
        <b>†</b> {tx("= reiknað af okkur úr FPL-sviðum.")} <b>—</b> {tx("= gögn vantar (ekki núll) og raðast")} <b>{tx("alltaf síðast")}</b>{tx(", í báðar áttir. Dálkar sem eru tómir fyrir alla í")}
        {" "}{season} {tx("eru faldir — kveiktu á þeim með hnappnum. Smelltu á haus til að raða, á nafn til að opna spjaldið, á")} <b>⇄</b> {tx("til að bera saman.")}
        {" "}<b style={{ color:"#e8a71c" }}>★</b> {tx("setur á vaktlista (vistast milli heimsókna); stjarnan í hausnum sýnir aðeins vaktlistann.")}
        {" "}<b style={{ color:C.green }}>{tx("Græn rönd")}</b> {tx("= leikmaður í þínu liði — röndin er á nafna-hólfinu því röðin skrunar til hliðar.")}
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
  gwWrap:{ display:"flex", flexDirection:"column", gap:4, padding:"7px 0 2px" },
  gwTop:{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" },
  gwLbl:{ fontSize:11, fontWeight:700, color:C.text2 },
  gwPresets:{ display:"flex", gap:3, flexWrap:"wrap" },
  gwPreset:{ border:`1px solid ${C.border}`, background:"#fff", color:C.text2,
             borderRadius:5, padding:"2px 7px", fontSize:11, cursor:"pointer" },
  gwPresetOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}`, fontWeight:600 },
  gwNow:{ fontFamily:mono, fontSize:11, color:C.purple, fontWeight:700 },
  gwBar:{ display:"flex", gap:1, flexWrap:"nowrap", overflowX:"auto" },
  gwCell:{ flex:"1 1 0", minWidth:14, height:18, border:`1px solid ${C.border}`,
           background:"#fafafb", color:C.text3, borderRadius:2, cursor:"pointer",
           fontSize:8.5, padding:0, lineHeight:"16px" },
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
  emptyBtn:{ marginLeft:"auto", fontSize:10, color:C.text3 },

  scroll:{ overflow:"auto", maxHeight:"min(66vh, 620px)", border:`1px solid ${C.border}`,
           borderRadius:8, position:"relative" },
  hRow:{ position:"sticky", top:0, zIndex:3, display:"flex", height:30,
         background:C.cardAlt, borderBottom:`1px solid ${C.borderStrong || C.border}` },
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
  hCell:{ boxSizing:"border-box", display:"flex", alignItems:"center",
          fontSize:10.5, fontWeight:700, color:C.text2,
          padding:"0 5px", cursor:"pointer", userSelect:"none",
          whiteSpace:"normal", lineHeight:1.14, wordBreak:"break-word",
          borderRight:"1px solid #eeeef1", overflow:"hidden" },
  row:{ position:"absolute", left:0, right:0, display:"flex", height:ROW_H,
        alignItems:"center", borderBottom:"1px solid #f4f4f6" },
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
