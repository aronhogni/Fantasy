/* ============================================================
   MyTeam.jsx — HVERJA A AD SPILA THESSA VIKU, OG HVAD ER AD FRETTA.

   TVAER KROFUR NOTANDANS, OG THAER ERU EIN:
     "veldu bestu leikmennina hverju sinni og skildu hina eftir a
      bekknum — ég vil ekki fa stig a bekk sem eru fleiri en hja
      manni sem er ad spila"

   Fyrri hlutinn er reiknadur i `lineup.js` og er SONNANLEGA optimal
   midad vid spana (sja notu thar; profid ber hann vid taemandi leit).
   Sidari hlutinn er ekki haegt ad tryggja — vid vitum ekki utkomuna —
   en THAD ER HAEGT AD MAELA HANN EFTIR A og greina oheppni fra villu.
   Thad er `benchRegret`, og thad birtist hér thegar vikan er lidin.

   FRETTIRNAR ERU BIRTAR, EKKI TULKADAR. ESPN merkir hverja grein
   theim leikmonnum sem hun fjallar um, svo porunin er a audkenni en
   ekki nafnaleit i texta. Tolid les thaer ekki og breytir engri tolu
   vegna theirra — ad lata malgreiningu faera spa vaeri omaeld tala i
   reit.
   ============================================================ */

import React, { useMemo, useState } from "react";
import * as D from "./data.js";
import { optimalLineup, slotsFor } from "./lineup.js";

export default function MyTeam({ rows, league, news, meta }) {
  const [ids, setIds] = useState(() => new Set(D.loadState("myPicks", [])));
  const [sleeperRoster, setSleeperRoster] = useState(null);

  const roster = useMemo(() => {
    const want = sleeperRoster ? new Set(sleeperRoster) : ids;
    return rows.filter((r) => want.has(r.id));
  }, [rows, ids, sleeperRoster]);

  const slots = useMemo(() => slotsFor(league), [league]);
  const lineup = useMemo(() => optimalLineup(roster.map((r) => ({
    id: r.id, name: r.name, pos: r.pos, team: r.team,
    /* Vikuleg spa er ekki til i forleik — timabils-spain deilt med 17
       er thad sem vid hofum og thad er SAGT. */
    proj: r.proj != null ? r.proj / 17 : null,
    avail: r.avail, bye: false, injury: r.injury,
  })), slots), [roster, slots]);

  const preseason = !meta || meta.seasonType === "pre" || meta.seasonType === "off";

  return (
    <>
      <RosterSource rows={rows} ids={ids} setIds={setIds}
        season={meta && meta.season} onSleeper={setSleeperRoster}
        sleeperRoster={sleeperRoster} />

      {roster.length === 0 ? (
        <div className="panel"><div className="empty">
          No roster yet. Load a Sleeper league above, or mark players as
          <b> mine</b> on the Draft tab.
        </div></div>
      ) : (
        <>
          <Lineup lineup={lineup} slots={slots} preseason={preseason} />
          <Alerts roster={roster} news={news} />
        </>
      )}
    </>
  );
}

/* ============================================================
   HVADAN KEMUR HOPURINN
   ============================================================ */
function RosterSource({ rows, ids, setIds, season, onSleeper, sleeperRoster }) {
  const [user, setUser] = useState("");
  const [leagues, setLeagues] = useState(null);
  const [status, setStatus] = useState(null);

  const find = async () => {
    setStatus("looking…");
    try {
      const u = await D.sleeperUser(user.trim());
      const ls = await D.sleeperLeagues(u.user_id, season);
      setLeagues((ls || []).map((l) => ({ ...l, userId: u.user_id })));
      setStatus(ls && ls.length ? null : "no leagues on this season");
    } catch (e) { setStatus(String(e.message || e)); setLeagues(null); }
  };

  const load = async (lg) => {
    setStatus("loading roster…");
    try {
      const rs = await D.sleeperRosters(lg.league_id);
      const mine = (rs || []).find((r) => r.owner_id === lg.userId);
      if (!mine) { setStatus("could not find your team in that league"); return; }
      /* Sleeper skilar SINUM audkennum og `players.json` er byggð
         Sleeper-midjad, svo thetta er bein porun — engin nafnaleit. */
      onSleeper(mine.players || []);
      setStatus(null); setLeagues(null);
    } catch (e) { setStatus(String(e.message || e)); }
  };

  return (
    <div className="panel">
      <h2>Your roster</h2>
      <div className="sub">
        {sleeperRoster
          ? `${sleeperRoster.length} players loaded from Sleeper.`
          : `${ids.size} players marked on the draft board.`}
      </div>
      <div className="row">
        <label className="field">
          Sleeper username
          <input type="text" value={user} onChange={(e) => setUser(e.target.value)}
            placeholder="username" onKeyDown={(e) => e.key === "Enter" && find()} />
        </label>
        <button className="act primary" onClick={find} disabled={!user.trim()}>
          Load my league
        </button>
        {sleeperRoster && (
          <button className="act" onClick={() => onSleeper(null)}>
            Use draft board instead
          </button>
        )}
      </div>
      {leagues && leagues.length > 0 && (
        <div className="chips" style={{ marginTop: 10 }}>
          {leagues.map((l) => (
            <button key={l.league_id} className="chip" onClick={() => load(l)}>
              {l.name} · {l.total_rosters} teams
            </button>
          ))}
        </div>
      )}
      {status && <div className="note warn" style={{ marginTop: 10 }}>{status}</div>}
    </div>
  );
}

/* ============================================================
   BYRJUNARLIDID
   ============================================================ */
function Lineup({ lineup, slots, preseason }) {
  return (
    <>
      <div className="panel">
        <h2>Start these</h2>
        <div className="sub">
          Projected <b>{lineup.projected}</b> points from your starters.
        </div>
        {preseason && (
          <div className="note warn">
            <b>These are season projections divided by seventeen</b>, because no
            week has been played. Once the season starts each week gets its own
            number — opponent, the betting line and injury status all move it.
          </div>
        )}
        {lineup.unfilled.length > 0 && (
          <div className="note warn">
            No eligible player for: <b>{lineup.unfilled.join(", ")}</b>. Either the
            position is empty or everyone there is out.
          </div>
        )}
      </div>

      <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
        <div className="grow">
          <div className="tablewrap"><table className="data">
            <thead><tr className="cols">
              <th className="txt frozen">Slot</th>
              <th className="txt">Player</th>
              <th className="txt">Pos</th>
              <th title="Projection adjusted for the chance he plays">Proj</th>
              <th className="txt">Status</th>
            </tr></thead>
            <tbody>
              {lineup.starters.map((s) => (
                <tr key={s.slot}>
                  <td className="txt frozen"><b>{s.slot}</b></td>
                  <td className="txt">{s.player ? s.player.name
                    : <span className="null">— empty —</span>}</td>
                  <td className="txt">{s.player
                    ? <span className={`pos ${s.player.pos}`}>{s.player.pos}</span> : ""}</td>
                  <td className="mono">{s.player && s.player.ev != null
                    ? s.player.ev.toFixed(1) : <span className="null">—</span>}</td>
                  <td className="txt">
                    {s.player && s.player.injury && s.player.injury !== "Active" && (
                      <span className={`badge ${/out|ir/i.test(s.player.injury) ? "bad" : "warn"}`}>
                        {s.player.injury}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>

        <div className="panel" style={{ width: 330, flexShrink: 0 }}>
          <h2 style={{ fontSize: 14 }}>Bench</h2>
          <div className="sub">
            Nobody here outscores a starter they could replace — that is what the
            lineup above guarantees against the projections.
          </div>
          {lineup.bench.map((b) => (
            <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "center",
              fontSize: 12.5, padding: "2px 0" }}>
              <span className={`pos ${b.pos}`}>{b.pos}</span>
              <span className="grow" style={{ overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
              <span className="mono dim">
                {b.ev != null ? b.ev.toFixed(1) : <span className="null">—</span>}
              </span>
            </div>
          ))}
          {lineup.unknown.length > 0 && (
            <div className="note warn" style={{ marginTop: 10, fontSize: 12 }}>
              {lineup.unknown.length} player{lineup.unknown.length > 1 ? "s have" : " has"}{" "}
              no projection. They sit — but that is missing data, not a verdict on them.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ============================================================
   FRETTIR OG MEIDSLI — ADEINS UM THINA MENN
   ============================================================ */
function Alerts({ roster, news }) {
  const mine = useMemo(() => {
    if (!news || !news.articles) return [];
    const espnIds = new Set(roster.map((r) => r.espnId).filter(Boolean));
    const names = new Set(roster.map((r) => (r.name || "").toLowerCase()));
    return news.articles
      .map((a) => {
        const hit = (a.athletes || []).find((x) =>
          (x.espnId && espnIds.has(x.espnId)) ||
          (x.name && names.has(x.name.toLowerCase())));
        return hit ? { ...a, who: hit.name } : null;
      })
      .filter(Boolean)
      .sort((a, b) => String(b.published).localeCompare(String(a.published)));
  }, [roster, news]);

  const hurt = roster.filter((r) => r.injury && r.injury !== "Active");

  return (
    <>
      {hurt.length > 0 && (
        <div className="panel">
          <h2>Injury flags on your roster</h2>
          <div className="sub">
            Official status decides availability. Everything else may inform it,
            never replace it.
          </div>
          <div className="tablewrap" style={{ marginTop: 10 }}><table className="data">
            <thead><tr className="cols">
              <th className="txt frozen">Player</th><th className="txt">Pos</th>
              <th className="txt">Status</th>
              <th title="Multiplier applied to his projection">Availability</th>
              <th className="txt">Note</th>
            </tr></thead>
            <tbody>
              {hurt.map((r) => (
                <tr key={r.id}>
                  <td className="txt frozen">{r.name}</td>
                  <td className="txt"><span className={`pos ${r.pos}`}>{r.pos}</span></td>
                  <td className="txt">
                    <span className={`badge ${/out|ir/i.test(r.injury) ? "bad" : "warn"}`}>
                      {r.injury}
                    </span>
                  </td>
                  <td className="mono">{r.avail != null ? `${Math.round(r.avail * 100)}%` : "—"}</td>
                  <td className="txt dim" style={{ fontSize: 12 }}>
                    {r.injuryNote || <span className="null">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      <div className="panel">
        <h2>News about your players</h2>
        <div className="sub">
          {mine.length
            ? `${mine.length} of the latest ${news.articles.length} stories mention someone on your roster.`
            : "None of the latest stories mention your players."}
        </div>
        {mine.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {mine.slice(0, 12).map((a) => (
              <div key={a.id || a.headline} style={{ padding: "8px 0",
                borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span className="badge on">{a.who}</span>
                  <span className="dimmer mono" style={{ fontSize: 11 }}>
                    {String(a.published).slice(0, 10)}
                  </span>
                </div>
                <div style={{ marginTop: 4 }}>
                  {a.url
                    ? <a href={a.url} target="_blank" rel="noreferrer"
                        style={{ color: "var(--text)" }}>{a.headline}</a>
                    : a.headline}
                </div>
                {a.description && (
                  <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {a.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="note" style={{ marginTop: 12 }}>
          <b>Nothing here changes a number.</b> Stories are matched to players by
          ESPN's own tagging, not by searching the text, and they are shown next to
          your roster for you to read. Letting a headline move a projection would be
          an unmeasured adjustment wearing the clothes of a measurement.
        </div>
      </div>
    </>
  );
}
