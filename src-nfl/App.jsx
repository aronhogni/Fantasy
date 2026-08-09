/* ============================================================
   App.jsx — skelin. Flipar, deildarstillingar, gagnahledsla.
   ALLT reikni-vit er i `model.js` / `build.js` / `accuracy.js`.
   Thessi skra a ad vera BIRTING og ekkert annad.
   ============================================================ */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import * as D from "./data.js";
import { buildRows, DEFAULT_LEAGUE } from "./build.js";
import DraftBoard from "./DraftBoard.jsx";
import Experts from "./Experts.jsx";
import PlayerTable from "./PlayerTable.jsx";
import Schedule from "./Schedule.jsx";
import Sources from "./Sources.jsx";
import ModelLab from "./ModelLab.jsx";
import Market from "./Market.jsx";

const TABS = [
  ["draft", "🏈 Draft"],
  ["players", "👥 Players"],
  ["experts", "🧠 Experts"],
  ["market", "💰 Market"],
  ["lab", "🔬 Model lab"],
  ["schedule", "📅 Schedule"],
  ["sources", "🔌 Sources"],
];

export default function App() {
  const [view, setView] = useState(() => D.loadState("view", "draft"));
  const [league, setLeague] = useState(() => ({
    ...DEFAULT_LEAGUE, ...D.loadState("league", {}),
  }));
  const [core, setCore] = useState(null);
  const [err, setErr] = useState(null);
  const [extra, setExtra] = useState({});      // letihladnar skrar

  useEffect(() => { D.saveState("view", view); }, [view]);
  useEffect(() => { D.saveState("league", league); }, [league]);

  /* ---- kjarna-hledsla ----
     `alive`-flagg i stad AbortController. Skyndiminnid i `data.js`
     er DEILT milli allra sem kalla, svo loford sem er hætt vid er
     eitrað fyrir naesta lesanda — og React StrictMode kallar thessa
     lykkju TVISVAR i throun. Sja notuna vid `load()`. */
  useEffect(() => {
    let alive = true;
    D.loadCore()
      .then((c) => {
        if (!alive) return;
        if (!c.players) setErr("Could not load players.json — see Sources.");
        setCore(c);
      })
      .catch((e) => { if (alive) setErr(String(e)); });
    return () => { alive = false; };
  }, []);

  /* ---- letihledsla eftir flipa ----
     Flipinn segir hvad tharf. Ad saekja allt vid raesingu vaeri 8 MB
     adur en fyrsta talan birtist; svona kemur draft-bordid upp a
     1,4 MB og hitt bætist vid thegar spurt er um thad. */
  const need = useCallback(async (keys) => {
    const missing = keys.filter((k) => !(k in extra));
    if (!missing.length) return;
    const loaders = {
      seasons: D.loadSeasons, accuracy: D.loadAccuracy, experts: D.loadExperts,
      defense: D.loadDefense, teamForm: D.loadTeamForm, calibration: D.loadCalibration,
      adp: D.loadAdp,
      /* Vistud SEM FOLL, ekki kollud strax — `need()` kallar thau.
         Fyrsta utgafan skrifadi `D.loadEval("ppr")` sem er KALL og
         skiladi lofordi; `loaders[k]()` reyndi tha ad kalla lofordid
         sem fall og flipinn stod tomur. */
      marketHistory: () => D.loadMarketHistory(),
      evalPpr: () => D.loadEval("ppr"), evalStd: () => D.loadEval("standard"),
      stratPpr: () => D.loadStrategy("ppr"), stratStd: () => D.loadStrategy("standard"),
      arankPpr: () => D.loadArank("ppr"), arankStd: () => D.loadArank("standard"),
    };
    const got = await Promise.all(missing.map((k) => loaders[k]()));
    setExtra((prev) => {
      const next = { ...prev };
      missing.forEach((k, i) => { next[k] = got[i]; });
      return next;
    });
  }, [extra]);

  useEffect(() => {
    if (view === "draft") need(["seasons", "accuracy", "experts"]);
    else if (view === "players") need(["seasons", "accuracy", "experts"]);
    else if (view === "experts") need(["accuracy", "experts"]);
    else if (view === "schedule") need(["defense", "teamForm"]);
    else if (view === "sources") need(["calibration", "adp"]);
    else if (view === "market") need(["marketHistory"]);
    else if (view === "lab") need(["evalPpr", "evalStd", "stratPpr", "stratStd", "arankPpr", "arankStd"]);
  }, [view, need]);

  /* ---- rodirnar ---- */
  const built = useMemo(() => {
    if (!core || !core.players) return { rows: [], meta: {} };
    return buildRows({
      players: core.players,
      seasons: extra.seasons,
      accuracy: extra.accuracy,
      experts: extra.experts,
      schedule: core.schedule,
      market: core.market,
      league,
    });
  }, [core, extra.seasons, extra.accuracy, extra.experts, league]);

  if (err && !core) {
    return <div className="shell"><div className="empty">
      <h2>Gögnin hlóðust ekki</h2><p className="dim">{err}</p>
    </div></div>;
  }
  if (!core) {
    return <div className="shell"><div className="empty">Loading…</div></div>;
  }

  const meta = core.meta || {};
  const preseason = meta.seasonType === "pre" || meta.seasonType === "off";

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          NFL Fantasy
          <span>{meta.season} · {preseason ? "preseason" : `week ${meta.week}`}</span>
        </div>
        <div className="spacer" />
        <LeagueBar league={league} setLeague={setLeague} />
      </header>

      <nav className="tabs" style={{ marginBottom: 14 }}>
        {TABS.map(([k, lbl]) => (
          <button key={k} className={`tab${view === k ? " on" : ""}`}
            onClick={() => setView(k)}>{lbl}</button>
        ))}
        <a className="tab" href="../" style={{ textDecoration: "none" }}>⚽ FPL</a>
      </nav>

      {view === "draft" && (
        <DraftBoard rows={built.rows} meta={built.meta} league={league}
          season={meta.season} accuracy={extra.accuracy} />
      )}
      {view === "players" && (
        <PlayerTable rows={built.rows} meta={built.meta} league={league} />
      )}
      {view === "experts" && (
        <Experts accuracy={extra.accuracy} experts={extra.experts}
          rows={built.rows} meta={built.meta} />
      )}
      {view === "market" && (
        <Market market={core.market} rows={built.rows} meta={meta}
          history={extra.marketHistory} />
      )}
      {view === "lab" && (
        <ModelLab evalPpr={extra.evalPpr} evalStd={extra.evalStd}
          stratPpr={extra.stratPpr} stratStd={extra.stratStd} league={league}
          rows={built.rows} arankPpr={extra.arankPpr} arankStd={extra.arankStd} />
      )}
      {view === "schedule" && (
        <Schedule schedule={core.schedule} teams={core.teams}
          defense={extra.defense} teamForm={extra.teamForm} season={meta.season} />
      )}
      {view === "sources" && (
        <Sources status={core.status} meta={meta} calibration={extra.calibration}
          adp={extra.adp} built={built} />
      )}
    </div>
  );
}

/* ============================================================
   DEILDARSTILLINGAR — thaer eru EKKI skraut.
   Deildarstaerd og stigagjof breyta BADUM: hvada ADP er lesid OG
   hvar varamanns-threpid liggur. Ad hafa thaer fastar vaeri ad
   reikna adra deild en notandinn spilar i.
   ============================================================ */
function LeagueBar({ league, setLeague }) {
  const set = (k, v) => setLeague((l) => ({ ...l, [k]: v }));
  return (
    <div className="row" style={{ gap: 8 }}>
      <label className="field">
        Teams
        <select value={league.teams}
          onChange={(e) => set("teams", Number(e.target.value))}>
          {[8, 10, 12, 14, 16].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <label className="field">
        Scoring
        <select value={league.scoring} onChange={(e) => set("scoring", e.target.value)}>
          <option value="ppr">PPR</option>
          <option value="half-ppr">Half PPR</option>
          <option value="standard">Standard</option>
        </select>
      </label>
      <label className="field">
        Superflex
        <select value={league.superflex ? "1" : "0"}
          onChange={(e) => set("superflex", e.target.value === "1")}>
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
      </label>
    </div>
  );
}
