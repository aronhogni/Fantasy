/* ============================================================
   Experts.jsx — "hverjum er haegt ad treysta?"

   THESSI FLIPI VERDUR AD BERA VARNAGLANA JAFN AFERANDI OG LISTANN.
   Tafla sem radar 205 serfraedingum er sannfaerandi hvort sem hun
   maelir haefni eda heppni, og lesandinn getur ekki greint thar a
   milli af tolunum einum. Thess vegna stendur nulldreifingin OFAN
   VID listann, ekki i neðanmalsgrein.
   ============================================================ */

import React, { useMemo, useState } from "react";
/* SAMA FUNKTION SEM BORDID NOTAR — sja notuna i `Disagreement`. Ad
   endurskrifa valregluna hér vaeri onnur utfaersla sem gaeti rekid i
   sundur vid hana; thad er nakvaemlega villan sem var verid ad laga. */
import { buildSharpBoard } from "./build.js";

export default function Experts({ accuracy, experts, rows }) {
  const [tab, setTab] = useState("board");

  if (!accuracy) {
    return (
      <div className="panel">
        <h2>Expert accuracy</h2>
        <div className="note warn">
          The measurement has not been run yet (<code>data/accuracy.json</code> is
          missing). Nothing is shown rather than a placeholder ranking — an unmeasured
          leaderboard that looks measured is worse than no leaderboard.
        </div>
      </div>
    );
  }

  const nd = accuracy.nullDist || {};
  const v = accuracy.verdict || {};
  const list = (accuracy.experts || []).filter((e) => e.draft);
  const benches = list.filter((e) => e.kind === "benchmark");
  const people = list.filter((e) => e.kind !== "benchmark");

  return (
    <>
      <div className="panel">
        <h2>How this is measured</h2>
        <div className="sub">
          Every board is replayed as an actual draft against the {accuracy.measuredSeason} season.
        </div>
        <div className="note">
          For each of <b>{people.length}</b> expert boards published before the{" "}
          {accuracy.measuredSeason} season, we simulate a{" "}
          {accuracy.league?.teams}-team snake draft from <b>all {accuracy.league?.teams} slots</b>,
          where the other teams draft off the consensus and everyone follows the same
          roster rules. The score is what that team <b>actually scored</b> in {accuracy.measuredSeason}.
          <br /><br />
          Rank correlation is shown too, but the simulation is the headline for a
          reason: a board can be excellent about players 150–300 and win on correlation
          while changing nothing about your team, because you never draft them.
          <b> Higher correlation is not the same as a better decision.</b>
        </div>

        <div className="kpis" style={{ marginTop: 12 }}>
          <div className="kpi">
            <div className="k">Random baseline</div>
            <div className="v">{nd.mean}</div>
            <div className="dimmer" style={{ fontSize: 11 }}>±{nd.sd} · p95 {nd.p95}</div>
          </div>
          <div className="kpi">
            <div className="k">Beat random</div>
            <div className="v">{pct(v.expertsAboveNullMean, v.expertCount)}</div>
            <div className="dimmer" style={{ fontSize: 11 }}>
              {v.expertsAboveNullMean} of {v.expertCount}
            </div>
          </div>
          <div className="kpi">
            <div className="k">Clearly beat it</div>
            <div className="v">{pct(v.expertsAboveNullP95, v.expertCount)}</div>
            <div className="dimmer" style={{ fontSize: 11 }}>above the 95th pct</div>
          </div>
          <div className="kpi">
            <div className="k">Consensus (ECR)</div>
            <div className="v">{v.consensusMean}</div>
            <div className="dimmer" style={{ fontSize: 11 }}>
              {v.consensusMean > nd.mean ? "above" : "below"} random
            </div>
          </div>
          {accuracy.splitHalf && (
            <div className="kpi">
              <div className="k">Is it skill?</div>
              <div className="v">{accuracy.splitHalf.corrected}</div>
              <div className="dimmer" style={{ fontSize: 11 }}>split-half reliability</div>
            </div>
          )}
        </div>

        {accuracy.splitHalf && (
          <div className={`note${accuracy.splitHalf.rho > 0.3 ? "" : " warn"}`}>
            <b>Split-half test.</b> Each board was scored separately against weeks 1–9
            and weeks 10–18. The two halves correlate at{" "}
            <b>rho {accuracy.splitHalf.rho}</b> ({accuracy.splitHalf.corrected} corrected
            for a full season, n={accuracy.splitHalf.n}).
            {accuracy.splitHalf.rho > 0.3
              ? " Board quality is consistent within a season, so the ordering below is signal rather than a lucky half."
              : " Board quality is not consistent even within one season, so treat the ordering below as noise."}
            <br /><br />
            <b>What this still cannot tell you:</b> whether the same names repeat next
            year. That needs a second measured season, and the {accuracy.measuredSeason + 1} boards
            have not been played yet.
          </div>
        )}
      </div>

      <div className="panel">
        <div className="chips">
          <button className={`chip${tab === "board" ? " on" : ""}`}
            onClick={() => setTab("board")}>Leaderboard</button>
          <button className={`chip${tab === "split" ? " on" : ""}`}
            onClick={() => setTab("split")}>Where they disagree</button>
        </div>
      </div>

      {tab === "board"
        ? <Leaderboard people={people} benches={benches} nd={nd} />
        : <Disagreement rows={rows} accuracy={accuracy} experts={experts} />}
    </>
  );
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "—");

function Leaderboard({ people, benches, nd }) {
  const [n, setN] = useState(30);
  const all = [...benches, ...people].sort(
    (a, b) => b.draft.mean - a.draft.mean);

  return (
    <>
      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr className="cols">
              <th className="txt frozen">Expert</th>
              <th title="Points the simulated team actually scored, averaged over every draft slot">Draft pts</th>
              <th title="Standard error across draft slots">±</th>
              <th title="Standard deviations above the random-within-tier baseline">z</th>
              <th title="Spearman rank correlation with actual finish">rho</th>
              <th title="Mean rank error over their top 50">MAE 50</th>
              <th title="Share of their top-24 RB who finished top-24">RB hit</th>
              <th title="Share of their top-36 WR who finished top-36">WR hit</th>
              <th title="Share of their top-12 TE who finished top-12">TE hit</th>
              <th title="Players on the board">Size</th>
              <th className="txt" title="FantasyPros' own draft-accuracy rank">FP rank</th>
            </tr>
          </thead>
          <tbody>
            {all.slice(0, n).map((e) => {
              const z = nd.sd ? (e.draft.mean - nd.mean) / nd.sd : null;
              const bench = e.kind === "benchmark";
              return (
                <tr key={e.id} style={bench
                  ? { background: "rgba(77,163,255,.07)" } : undefined}>
                  <td className="txt frozen">
                    {bench && <span className="badge" style={{ marginRight: 6 }}>base</span>}
                    {e.name}
                  </td>
                  <td className="mono"><b>{e.draft.mean}</b></td>
                  <td className="mono dim">{e.se}</td>
                  <td className={`mono ${z > 1.65 ? "good" : z < 0 ? "bad" : ""}`}>
                    {z == null ? "—" : z.toFixed(1)}
                  </td>
                  <td className="mono dim">{e.rho ?? "—"}</td>
                  <td className="mono dim">{e.mae50 ?? "—"}</td>
                  <td className="mono">{hitPct(e.hit?.RB)}</td>
                  <td className="mono">{hitPct(e.hit?.WR)}</td>
                  <td className="mono">{hitPct(e.hit?.TE)}</td>
                  <td className="mono dim">{e.boardSize}</td>
                  <td className="txt dim">{e.fpDraftRank ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {n < all.length && (
        <div style={{ padding: "10px 2px" }}>
          <button className="act" onClick={() => setN(n + 50)}>
            Show more ({all.length - n} left)
          </button>
        </div>
      )}
    </>
  );
}

const hitPct = (x) => (x == null ? <span className="null">—</span>
  : `${Math.round(x * 100)}%`);

/* ============================================================
   HVAR ERU THEIR OSAMMALA?
   ============================================================
   Thetta er hagnytari en listinn fyrir thann sem er ad drafta:
   ekki "hver er godur" heldur "hvar viкur skorpu hopurinn fra
   markadinum". Thad eru leikmennirnir sem skila mun.
   ============================================================ */
function Disagreement({ rows, accuracy, experts }) {
  const list = useMemo(() => rows
    .filter((r) => r.sharpDelta != null && r.ecr != null && r.ecr <= 200)
    .sort((a, b) => Math.abs(b.sharpDelta) - Math.abs(a.sharpDelta))
    .slice(0, 60), [rows]);

  /* ============================================================
     REGLAN ER SPURD, EKKI SKRIFUD UPP EFTIR MINNI
     ============================================================
     Hér stod: "Only the boards that finished above the 95th percentile
     of the random baseline are in the sharp group." Su regla ER i
     `pickSharpIds` — en hun er **VARALEIDIN** (`rule: "single-season"`),
     sem er adeins notud finnist ENGIN ferils-saga. Lifandi gogn 17.8.2026
     segja `rule: "career"`: midgildi percentila yfir >= 4 ar OG ad hann
     hafi birt i fyrra.

     Textinn lysti thvi RONGU vali — og verra: hann lysti ODRU vali en
     bordid notadi, i flipanum sem er til thess ad bera varnaglana. Sami
     flokkur og "thogul prof": setning sem enginn bar vid kodann.

     NU ER HUN LEIDD AF SOMU FUNKTION SEM BORDID KALLAR
     (`buildSharpBoard`), svo hun getur ekki rekid i sundur vid hana.
     URTAKSSTAERDIN FYLGIR MED af thvi ad hun er BINDANDI i agust: 15
     eru valdir en adeins their sem hafa BIRT bord i ar telja, og 17.8.
     voru thad **7 af 15**. Tafla sem heitir "sharp" og hvilir a sjo
     bordum a ad segja thad sjalf.                                    */
  const sharp = useMemo(
    () => buildSharpBoard(accuracy, experts), [accuracy, experts]);

  if (!list.length) {
    return <div className="panel"><div className="note warn">
      No sharp board is available, so there is nothing to compare against the consensus.
    </div></div>;
  }

  return (
    <>
      <div className="panel">
        <h2>Sharp boards vs the consensus</h2>
        <div className="sub">
          {sharp.rule === "career" ? (
            <>
              The sharp group is the <b>{sharp.ids.length}</b> experts with the best
              median accuracy percentile across <b>4 or more</b> seasons who also
              published last year — a career, not a single good year. Positive means
              they rank him higher than the field does.
            </>
          ) : (
            <>
              No multi-season history was available, so the fallback rule is in use:
              only boards that finished above the <b>95th percentile</b> of the random
              baseline last season are in the sharp group. Positive means they rank him
              higher than the field does.
            </>
          )}
        </div>
        {/* URTAKSSTAERDIN ER FULLYRDING, EKKI NEDANMALSGREIN. */}
        <div className={`note ${sharp.count < sharp.ids.length / 2 ? "warn" : ""}`}>
          This rests on <b>{sharp.count}</b> board{sharp.count === 1 ? "" : "s"} of the{" "}
          <b>{sharp.ids.length}</b> experts selected: the rest have not posted a board
          for this season yet. A player is ranked only if a majority of those{" "}
          {sharp.count} boards name him, so the deep end of this table is thinner than
          the top.
        </div>
      </div>
      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr className="cols">
              <th className="txt frozen">Player</th>
              <th className="txt">Pos</th>
              <th className="txt">Tm</th>
              <th>ECR</th>
              <th title="Consensus of measured-accurate boards only">Sharp</th>
              <th title="ECR minus sharp rank. Positive = the sharp group likes him more.">Δ</th>
              <th title="Spread of expert opinion">ECR sd</th>
              <th>Best</th>
              <th>Worst</th>
              <th>ADP</th>
              <th>PPG 25</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td className="txt frozen">{r.name}</td>
                <td className="txt"><span className={`pos ${r.pos}`}>{r.pos}</span></td>
                <td className="txt dim">{r.team || "—"}</td>
                <td className="mono dim">{r.ecr}</td>
                <td className="mono">{r.sharpRank}</td>
                <td className={`mono ${r.sharpDelta > 0 ? "good" : "bad"}`}>
                  {(r.sharpDelta > 0 ? "+" : "") + r.sharpDelta.toFixed(0)}
                </td>
                <td className="mono dim">{r.ecrSd ?? "—"}</td>
                <td className="mono dimmer">{r.ecrBest ?? "—"}</td>
                <td className="mono dimmer">{r.ecrWorst ?? "—"}</td>
                <td className="mono dim">{r.adp == null ? "—" : r.adp.toFixed(1)}</td>
                <td className="mono dim">{r.lastPpg == null ? "—" : r.lastPpg.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
