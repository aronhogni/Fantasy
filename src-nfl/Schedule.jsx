/* ============================================================
   Schedule.jsx — leikjaskra, vaent stigaskor og bye-vikur.

   VAENT STIGASKOR ER ADALTALAN, ekki hver spilar vid hvern.
   total/2 +/- spread/2 er thad sem bokmakarinn heldur ad lidid skori,
   og thad er sterkasta einstaka inntakid i vikulega framleidslu.

   I FORLEIK ER LINA A MINNIHLUTA LEIKJA (337 af 557 thegar thetta er
   skrifad). Leikur an linu fær "—", EKKI medaltal. "Vitum ekki" er
   ekki "medal-erfitt", og ad fylla i eydurnar med medaltali gerdi
   toluna gagnslausa nakvaemlega thar sem hun a ad segja mest.
   ============================================================ */

import React, { useMemo, useState } from "react";
import { impliedTeamTotals } from "./model.js";

export default function Schedule({ schedule, teams, season }) {
  const [week, setWeek] = useState(1);

  const games = useMemo(
    () => (schedule || []).filter((g) => g.season === season && g.type === "REG"),
    [schedule, season]);

  const weeks = useMemo(
    () => [...new Set(games.map((g) => g.week))].sort((a, b) => a - b),
    [games]);

  const byes = useMemo(() => {
    const playing = new Map();
    for (const g of games) {
      (playing.get(g.week) || playing.set(g.week, new Set()).get(g.week)).add(g.home);
      playing.get(g.week).add(g.away);
    }
    const all = new Set(games.flatMap((g) => [g.home, g.away]));
    const out = new Map();
    for (const [w, s] of playing) {
      for (const t of all) if (!s.has(t)) (out.get(t) ?? out.set(t, w).get(t));
    }
    return out;
  }, [games]);

  const withLine = games.filter((g) => g.total != null).length;
  const wk = games.filter((g) => g.week === week);

  if (!games.length) {
    return <div className="panel"><div className="empty">No schedule loaded.</div></div>;
  }

  return (
    <>
      <div className="panel">
        <h2>{season} schedule</h2>
        <div className="sub">
          {games.length} regular-season games · <b>{withLine}</b> already have a
          betting line ({Math.round((100 * withLine) / games.length)}%)
        </div>
        {withLine < games.length * 0.9 && (
          <div className="note warn">
            Most games do not have a line yet — books post them close to the season.
            Games without one show <b>—</b> rather than a league-average filler, because
            "unknown" and "average" are not the same claim.
          </div>
        )}
        <div className="chips" style={{ marginTop: 10 }}>
          {weeks.map((w) => (
            <button key={w} className={`chip${w === week ? " on" : ""}`}
              onClick={() => setWeek(w)}>W{w}</button>
          ))}
        </div>
      </div>

      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr className="cols">
              <th className="txt frozen">Game</th>
              <th className="txt">Day</th>
              <th title="Bookmaker total">O/U</th>
              <th title="Spread from the home team's view; positive = home favoured">Spread</th>
              <th title="Implied points for the away team">Away pts</th>
              <th title="Implied points for the home team">Home pts</th>
              <th className="txt">Roof</th>
              <th title="Days of rest, away">Rest A</th>
              <th title="Days of rest, home">Rest H</th>
            </tr>
          </thead>
          <tbody>
            {wk.map((g) => {
              const im = impliedTeamTotals(g.total, g.spread);
              return (
                <tr key={g.id}>
                  <td className="txt frozen">
                    <b>{g.away}</b> <span className="dim">@</span> <b>{g.home}</b>
                  </td>
                  <td className="txt dim">{g.weekday || "—"}</td>
                  <td className="mono">{g.total ?? <span className="null">—</span>}</td>
                  <td className="mono dim">{g.spread == null ? <span className="null">—</span>
                    : (g.spread > 0 ? "+" : "") + g.spread}</td>
                  <td className={`mono ${hot(im.away)}`}>
                    {im.away ?? <span className="null">—</span>}</td>
                  <td className={`mono ${hot(im.home)}`}>
                    {im.home ?? <span className="null">—</span>}</td>
                  <td className="txt dim">{g.roof || "—"}</td>
                  <td className="mono dim">{g.awayRest ?? "—"}</td>
                  <td className="mono dim">{g.homeRest ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <h2>Bye weeks</h2>
        <div className="sub">Stacking two starters on the same bye is a lineup hole you draft for yourself.</div>
        <div className="chips">
          {[...byes.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
            .map(([t, w]) => (
              <span key={t} className="chip" style={{ cursor: "default" }}>
                {t} <span className="dim">W{w}</span>
              </span>
            ))}
        </div>
      </div>
    </>
  );
}

const hot = (v) => (v == null ? "" : v >= 26 ? "good" : v <= 18 ? "bad" : "");
