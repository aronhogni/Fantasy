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
import { STAT_DEFS, STAT_GROUPS, STAT_BY_KEY, fmtStat, num, normName, nameScore,
         startRisk, moScore, aoScore, inImminentPool } from "./stats.js";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c", greenBg:"#e6f9f0",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const POS = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };
const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };
const POS_TABS = [["all","Allir"],["1","GK"],["2","DEF"],["3","MID"],["4","FWD"]];

/* Dalkar sem eru ALLTAF synilegir (ur nuverandi gognum, ekki timabili). */
const PINNED = ["now_cost", "selected_by_percent"];
const ROW_H = 34;          // fost haed -> synadarvaeding er einfold
const OVERSCAN = 12;

/* ---- Sniðgrunnur fyrir "min/max"-siur: hvada dalkar eru tolulegir ---- */
const numericDefs = () => STAT_DEFS.filter(d => !d.pos || d.pos.length);

export default function PlayerList({ players, teams, teamById, events, seasonsFile,
                                     imminent, shotsFile, fixtures, odds, defcon,
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
    return y ? `${y}/${String((y + 1) % 100).padStart(2, "0")}` : "í ár";
  }, [events]);
  const olderSeasons = seasonsFile?.seasons || [];
  const seasonOpts = [currentLabel, ...olderSeasons];
  const [season, setSeason] = useState(null);
  useEffect(() => {
    if (season != null) return;
    setSeason(finishedGw >= 1 ? currentLabel : (olderSeasons[0] || currentLabel));
  }, [season, finishedGw, currentLabel, olderSeasons]);
  const isLive = season === currentLabel;

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
    const immByTeam = {};
    for (const ip of imminent?.players || []) (immByTeam[ip.team] ||= []).push(ip);
    const findImm = (p) => {
      const cands = immByTeam[teamById?.[p.team]?.short] || [];
      let best = null, bs = 0, second = 0;
      for (const c of cands) {
        const sc = Math.max(nameScore(p.web_name, c.name),
                            nameScore(`${p.first_name} ${p.second_name}`, c.name));
        if (sc > bs) { second = bs; bs = sc; best = c; }
        else if (sc > second) second = sc;
      }
      return (best && bs >= 1 && bs > second) ? best : null;
    };

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

    const out = (players || []).map(p => {
      const hist = isLive ? null : seasonsFile?.players?.[String(p.code)]?.[season];
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
        _team_dc: dcById[p.team] != null ? num(dcById[p.team]) : null,
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
  }, [players, teamById, seasonsFile, season, isLive, imminent, shotsFile, fixtures, events, odds, defcon]);

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
  }, [group, rows]);
  const visibleCols = useMemo(
    () => groupCols.filter(c => showEmpty || c.withVal > 0).map(c => c.def),
    [groupCols, showEmpty]);
  const emptyCount = groupCols.filter(c => c.withVal === 0).length;

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
  const wName = narrow ? 140 : 214;   // +18 px fyrir stjornuna
  const wNum  = narrow ? 66 : 88;
  const cName = { ...S.cName, width: wName, minWidth: wName };
  const cNum  = { ...S.cNum,  width: wNum,  minWidth: wNum, maxWidth: wNum };

  const sortOn = (key, higherBetter = true) => {
    if (sortKey === key) { setSortDir(d => d === "asc" ? "desc" : "asc"); return; }
    setSortKey(key); setSortDir(higherBetter ? "desc" : "asc");
  };
  const arrow = k => sortKey !== k ? "" : (sortDir === "asc" ? " ↑" : " ↓");
  const aria = k => sortKey !== k ? "none" : (sortDir === "asc" ? "ascending" : "descending");

  const chips = [];
  if (pos !== "all") chips.push([POS[+pos], () => setPos("all")]);
  if (q) chips.push([`„${q}"`, () => setQ("")]);
  if (minCost !== "") chips.push([`≥ £${minCost}`, () => setMinCost("")]);
  if (maxCost !== "") chips.push([`≤ £${maxCost}`, () => setMaxCost("")]);
  teamSel.forEach(id => chips.push([teamById?.[id]?.short || id,
    () => setTeamSel(v => v.filter(x => x !== id))]));
  if (onlyAvail) chips.push(["aðeins leikhæfir", () => setOnlyAvail(false)]);
  if (hidePicked) chips.push(["fela valda", () => setHidePicked(false)]);
  if (onlyWatch) chips.push(["★ vaktlisti", () => setOnlyWatch(false)]);
  if (onlyMine) chips.push(["mitt lið", () => setOnlyMine(false)]);
  thresholds.forEach((t, i) => chips.push([
    `${STAT_BY_KEY[t.key]?.label || t.key} ${t.op} ${t.val}`,
    () => setThresholds(v => v.filter((_, j) => j !== i))]));

  if (!players?.length) {
    return <section style={S.card}><div style={S.muted}>Sæki leikmannagögn…</div></section>;
  }

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <h2 style={S.h2}>Leikmenn</h2>
          <div style={S.sub}>
            {sorted.length} af {players.length} · {season}
            {!isLive && <span style={S.histTag}>söguleg tölur</span>}
          </div>
        </div>
        <div style={S.headCtl}>
          <select style={S.sel} value={season ?? ""} onChange={e => setSeason(e.target.value)}>
            {seasonOpts.map(s => (
              <option key={s} value={s}>
                {s}{s === currentLabel && finishedGw === 0 ? " (ekki hafið)" : ""}
              </option>
            ))}
          </select>
          {chips.length > 0 &&
            <button style={S.clearAll} onClick={() => {
              setPos("all"); setQ(""); setMinCost(""); setMaxCost(""); setTeamSel([]);
              setOnlyAvail(false); setHidePicked(false); setThresholds([]);
              setOnlyWatch(false); setOnlyMine(false);
            }}>hreinsa allt</button>}
        </div>
      </div>

      {finishedGw === 0 && isLive && (
        <div style={S.warn}>
          <b>{currentLabel} er ekki hafið</b> — öll árstíðarsvið eru núll fyrir alla
          {" "}{players.length} leikmenn, svo þessi sýn hefur engar tölur að raða.
          Veldu <b>{olderSeasons[0] || "eldra tímabil"}</b> í fellilistanum.
        </div>
      )}
      {finishedGw === 0 && !isLive && (
        narrow && !showInfo ? (
          <button style={S.noteMini} onClick={() => setShowInfo(true)}>
            {currentLabel} ekki hafið — sýnir {season} · <b>af hverju?</b>
          </button>
        ) : (
          <div style={S.note}>
            <b>{currentLabel} er ekki hafið</b>, svo listinn sýnir <b>{season}</b>.
            Verð, staða og eignarhlutfall eru samt <b>úr dagsins gögnum</b> — þú kaupir á
            verði dagsins, ekki á verði {season}.
            {narrow && <> <button style={S.link} onClick={() => setShowInfo(false)}>fela</button></>}
          </div>
        )
      )}

      {!isLive && (() => {
        const liveCols = STAT_DEFS.filter(d => d.group === group && d.live_only).length;
        if (!liveCols) return null;
        return (
          <div style={{ ...S.mixNote, ...(narrow ? S.mixMini : {}) }}>
            <b>Þessi flokkur sýnir NÚTÍMA-gögn</b> — ekki {season}. Hann byggir á síðustu loknu
            umferð, form-glugganum eða leikjum framundan, svo hann breytist ekki þótt þú veljir
            annað tímabil. Árstíðar-summurnar (Grunnur, Sókn, Vörn …) fylgja hins vegar {season}.
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
        <input style={S.search} placeholder="Leita — nafn eða lið" value={q}
          onChange={e => setQ(e.target.value)} />
        <label style={S.costWrap} title="Verðbil í milljónum">
          <span style={S.costLbl}>£</span>
          <input style={S.costIn} type="number" step="0.1" placeholder="frá"
            value={minCost} onChange={e => setMinCost(e.target.value)} />
          <span style={S.costLbl}>–</span>
          <input style={S.costIn} type="number" step="0.1" placeholder="til"
            value={maxCost} onChange={e => setMaxCost(e.target.value)} />
        </label>
        <select style={S.sel} value="" onChange={e => {
          const id = +e.target.value;
          if (id) setTeamSel(v => v.includes(id) ? v : [...v, id]);
        }}>
          <option value="">+ lið</option>
          {(teams || []).slice().sort((a, b) => String(a.short).localeCompare(String(b.short)))
            .map(t => <option key={t.id} value={t.id}>{t.short}</option>)}
        </select>
        <label style={S.check}>
          <input type="checkbox" checked={onlyAvail}
            onChange={e => setOnlyAvail(e.target.checked)} />aðeins leikhæfir
        </label>
        <label style={S.check} title="Aðeins stjörnumerktir">
          <input type="checkbox" checked={onlyWatch}
            onChange={e => setOnlyWatch(e.target.checked)} />★ vaktlisti ({watchSet.size})
        </label>
        {mineSet.size > 0 && (
          <label style={S.check} title="Aðeins leikmenn í mínu liði">
            <input type="checkbox" checked={onlyMine}
              onChange={e => setOnlyMine(e.target.checked)} />mitt lið ({mineSet.size})
          </label>
        )}
        {!!(cmpIds || []).length && (
          <label style={S.check}>
            <input type="checkbox" checked={hidePicked}
              onChange={e => setHidePicked(e.target.checked)} />fela valda ({cmpIds.length})
          </label>
        )}
      </div>

      {/* ---------- almennur throskuldur a HVAÐA tolu sem er ----------
          Thrjatiu sliderar a skja i einu eru onothaefir; thetta gefur
          sama kraft i einu chipi.                                      */}
      <div style={S.thRow}>
        <span style={S.thLbl}>Þröskuldur:</span>
        <select style={S.sel} value={thKey} onChange={e => setThKey(e.target.value)}>
          {STAT_GROUPS.map(g => (
            <optgroup key={g.key} label={g.label}>
              {STAT_DEFS.filter(d => d.group === g.key)
                .map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </optgroup>
          ))}
        </select>
        <select style={S.selNarrow} value={thOp} onChange={e => setThOp(e.target.value)}>
          <option value=">=">≥</option><option value="<=">≤</option>
        </select>
        <input style={S.thVal} type="number" step="any" placeholder="tala"
          value={thVal} onChange={e => setThVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addTh(); }} />
        <button style={S.addBtn} onClick={addTh}>bæta við</button>
      </div>

      {chips.length > 0 && (
        <div style={S.chipRow}>
          {chips.map(([label, clear], i) => (
            <button key={i} style={S.chip} onClick={clear}>{label} ✕</button>
          ))}
        </div>
      )}

      {/* ---------- flokkar ---------- */}
      <div style={S.groupRow}>
        {STAT_GROUPS.map(g => (
          <button key={g.key} style={{ ...S.groupBtn, ...(group === g.key ? S.groupOn : {}) }}
            onClick={() => setGroup(g.key)}>{g.label}</button>
        ))}
        {emptyCount > 0 && (
          <button style={{ ...S.groupBtn, ...S.emptyBtn, ...(showEmpty ? S.groupOn : {}) }}
            title={`${emptyCount} dálkar hafa engin gögn í ${season}`}
            onClick={() => setShowEmpty(v => !v)}>
            {showEmpty ? "fela tóma" : `sýna tóma dálka (${emptyCount})`}
          </button>
        )}
      </div>

      {/* ---------- tafla ---------- */}
      {!sorted.length ? (
        <div style={S.empty}>
          <b>Enginn leikmaður passar.</b> Virkar síur: {chips.length
            ? chips.map(([l]) => l).join(" · ") : "engar"}.
          {chips.length > 0 && <> <button style={S.link} onClick={() => {
            setThresholds([]); setMinCost(""); setMaxCost("");
          }}>hreinsa þröskulda og verðbil</button></>}
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
                  title={onlyWatch ? "Sýna alla" : "Sýna aðeins vaktlista"}
                  onClick={e => { e.stopPropagation(); setOnlyWatch(v => !v); }}>
                  {onlyWatch ? "★" : "☆"}
                </button>
                Leikmaður{arrow("__name")}
              </div>
              <div style={{ ...S.hCell, ...cNum }} aria-sort={aria("__cost")} tabIndex={0}
                onClick={() => sortOn("__cost", false)}>Verð{arrow("__cost")}</div>
              <div style={{ ...S.hCell, ...cNum }} aria-sort={aria("__own")} tabIndex={0}
                onClick={() => sortOn("__own")}>Eign %{arrow("__own")}</div>
              {visibleCols.map(d => (
                <div key={d.key} style={{ ...S.hCell, ...cNum }}
                  title={`${d.label}${d.note ? " — " + d.note : ""}`}
                  aria-sort={aria(d.key)} tabIndex={0}
                  onClick={() => sortOn(d.key, d.hi !== false)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sortOn(d.key, d.hi !== false); } }}>
                  {d.label}{d.derived ? "†" : ""}{arrow(d.key)}
                </div>
              ))}
              <div style={{ ...S.hCell, ...cNum }} aria-sort={aria("__start")} tabIndex={0}
                title="Byrjunar-líkur — mælt, sjá Bekkjar-hætta"
                onClick={() => sortOn("__start")}>Byrjar{arrow("__start")}</div>
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
                      aria-label={`${isWatched ? "Fjarlægja" : "Setja"} ${r.p.web_name} ${isWatched ? "af" : "á"} vaktlista`}
                      title={isWatched ? "Á vaktlista — smelltu til að fjarlægja" : "Setja á vaktlista"}
                      onClick={e => { e.stopPropagation(); onWatch?.(r.p.id); }}>
                      {isWatched ? "★" : "☆"}
                    </button>
                    <button style={S.nameBtn} onClick={() => onPickPlayer?.(r.p.id)}
                      title={r.p.news || `${r.p.first_name} ${r.p.second_name}`}>
                      {!narrow && (photoUrl && r.p.code
                        ? <img src={photoUrl(r.p.code)} alt="" style={S.img} loading="lazy" />
                        : <span style={S.imgFb}>{r.p.web_name.slice(0, 1)}</span>)}
                      <span style={{ ...S.dot, background: POS_COLOR[r.p.element_type] }} />
                      <span style={S.nm}>{r.p.web_name}</span>
                      <span style={S.teamTag}>
                        {Crest && r.team ? <Crest team={r.team} size={11} /> : null}
                        {r.team?.short}
                      </span>
                      {!r.avail && <span style={S.flag} title={r.p.news || "Ekki leikhæfur"}>!</span>}
                      {!isLive && !r.hist && <span style={S.noHist} title={`Engin gögn í ${season}`}>—</span>}
                    </button>
                  </div>
                  <div style={{ ...S.cell, ...cNum, ...S.strong }}>£{r.cost.toFixed(1)}</div>
                  <div style={{ ...S.cell, ...cNum }}>{r.own.toFixed(1)}</div>
                  {visibleCols.map(d => {
                    const v = r.src ? d.get(r.src) : null;
                    return (
                      <div key={d.key} style={{ ...S.cell, ...cNum,
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
                          ? "Byrjaði síðast en er í bekkjar-hættu" : undefined}>
                        {Math.round(r.startP * 100)}%
                      </span>
                    )}
                  </div>
                  <div style={{ ...S.cell, ...S.cAct }}>
                    <button style={{ ...S.addSm, ...(inCmp ? S.addSmOn : {}) }}
                      title={inCmp ? "Í samanburði" : "Bæta í samanburð"}
                      onClick={() => onCompare?.(r.p.id)}>{inCmp ? "✓" : "⇄"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={S.legend}>
        <b>†</b> = reiknað af okkur úr FPL-sviðum. <b>—</b> = gögn vantar (ekki núll) og
        raðast <b>alltaf síðast</b>, í báðar áttir. Dálkar sem eru tómir fyrir alla í
        {" "}{season} eru faldir — kveiktu á þeim með hnappnum. Smelltu á haus til að raða,
        á nafn til að opna spjaldið, á <b>⇄</b> til að bera saman.
        {" "}<b style={{ color:"#e8a71c" }}>★</b> setur á vaktlista (vistast milli heimsókna);
        stjarnan í hausnum sýnir aðeins vaktlistann.
        {" "}<b style={{ color:C.green }}>Græn rönd</b> = leikmaður í þínu liði — röndin er á
        nafna-hólfinu því röðin skrunar til hliðar.
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
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 },
  head:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  sub:{ fontSize:11.5, color:C.text2, marginTop:3, display:"flex", alignItems:"center", gap:6 },
  histTag:{ fontSize:9.5, background:C.cardAlt, border:`1px solid ${C.border}`,
            borderRadius:4, padding:"1px 5px", color:C.text3 },
  headCtl:{ display:"flex", alignItems:"center", gap:6 },
  sel:{ border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 7px", fontSize:11.5, maxWidth:200 },
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
  groupBtn:{ border:"none", background:"transparent", color:C.text2, borderRadius:5,
             padding:"4px 9px", fontSize:11.5, fontWeight:600, cursor:"pointer",
             whiteSpace:"nowrap", flex:"0 0 auto" },
  groupOn:{ background:"#f1e9f2", color:C.purple },
  emptyBtn:{ marginLeft:"auto", fontSize:10, color:C.text3 },

  scroll:{ overflow:"auto", maxHeight:"min(66vh, 620px)", border:`1px solid ${C.border}`,
           borderRadius:8, position:"relative" },
  hRow:{ position:"sticky", top:0, zIndex:3, display:"flex", height:30,
         background:C.cardAlt, borderBottom:`1px solid ${C.borderStrong || C.border}` },
  hCell:{ display:"flex", alignItems:"center", fontSize:9.5, fontWeight:700, color:C.text2,
          padding:"0 6px", cursor:"pointer", userSelect:"none", whiteSpace:"nowrap",
          borderRight:"1px solid #eeeef1", overflow:"hidden", textOverflow:"ellipsis" },
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
  cell:{ display:"flex", alignItems:"center", padding:"0 6px", fontSize:11.5,
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
