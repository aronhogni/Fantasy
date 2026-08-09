/* ============================================================
   ModelLab.jsx — "hvad spair thvi hverjir verda godir?"

   THESSI FLIPI BIRTIR MAELINGAR, EKKI SKODANIR. Hver tala kemur ur
   `scripts/nfl/model-lab.mjs` og `strategy-lab.mjs`, sem keyra
   walk-forward yfir 2015-2025 og skora a raunverulegum stigum.

   ORDALAG SEM SKIPTIR MALI: allt sem er innan vikmarka er SAGT VERA
   innan vikmarka. Toflunni er ekki leyft ad lita ut fyrir ad skera
   ur um meira en hun gerir.
   ============================================================ */

import React, { useState } from "react";

export default function ModelLab({ evalPpr, evalStd, stratPpr, stratStd, league }) {
  const std = league.scoring === "standard";
  const ev = std ? evalStd : evalPpr;
  const st = std ? stratStd : stratPpr;
  const [tab, setTab] = useState("rank");

  if (!ev && !st) {
    return (
      <div className="panel">
        <h2>Model lab</h2>
        <div className="note warn">
          The measurement files have not been generated yet. Run{" "}
          <code>scripts/nfl/model-lab.mjs</code> and{" "}
          <code>scripts/nfl/strategy-lab.mjs</code>.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="panel">
        <h2>What actually predicts a good season?</h2>
        <div className="sub">
          Every ranking below was replayed as a real draft against the seasons that
          followed it. Showing <b>{std ? "standard" : "PPR"}</b> scoring — switch the
          format in the header and these numbers change with it.
        </div>
        <div className="chips">
          <button className={`chip${tab === "rank" ? " on" : ""}`}
            onClick={() => setTab("rank")}>Which ranking wins</button>
          <button className={`chip${tab === "signal" ? " on" : ""}`}
            onClick={() => setTab("signal")}>What carries the signal</button>
          <button className={`chip${tab === "order" ? " on" : ""}`}
            onClick={() => setTab("order")}>Draft order</button>
        </div>
      </div>

      {tab === "rank" && <Rankings ev={ev} />}
      {tab === "signal" && <Signal ev={ev} />}
      {tab === "order" && <Order st={st} std={std} />}
    </>
  );
}

/* ============================================================
   1. HVADA RODUN VINNUR?
   ============================================================ */
function Rankings({ ev }) {
  if (!ev) return <div className="panel"><div className="empty">No data.</div></div>;
  const rows = ev.models.filter((m) => m.draftCommon != null)
    .sort((a, b) => b.draftCommon - a.draftCommon);
  const adp = rows.find((m) => m.key === "adp");
  const slp = rows.find((m) => m.key === "sleeper");
  const a = rows.find((m) => m.key === "slp_vbd");
  /* Arin thar sem ALLAR heimildir eru til — eina mengid sem ma bera saman. */
  const common = adp && slp
    ? ev.testYears.filter((y) => adp.draftPerSeason[y] != null &&
                                 slp.draftPerSeason[y] != null) : [];

  return (
    <>
      {a && adp && slp && (
        <div className="panel">
          <h2>A-Ranking</h2>
          <div className="sub">Sleeper's projection, converted to value over replacement for your league.</div>
          <div className="kpis">
            <div className="kpi">
              <div className="k">A-Ranking</div>
              <div className="v">{a.draftCommon}</div>
              <div className="dimmer" style={{ fontSize: 11 }}>points a simulated team scored</div>
            </div>
            <div className="kpi">
              <div className="k">vs Sleeper</div>
              <div className="v good">+{(a.draftCommon - slp.draftCommon).toFixed(0)}</div>
              <div className="dimmer" style={{ fontSize: 11 }}>their raw projection order</div>
            </div>
            <div className="kpi">
              <div className="k">vs ADP</div>
              <div className="v good">+{(a.draftCommon - adp.draftCommon).toFixed(0)}</div>
              <div className="dimmer" style={{ fontSize: 11 }}>the market</div>
            </div>
            <div className="kpi">
              <div className="k">Seasons won</div>
              <div className="v">
                {Object.keys(a.draftPerSeason).filter((y) =>
                  a.draftPerSeason[y] > adp.draftPerSeason[y]).length}
                /{Object.keys(a.draftPerSeason).length}
              </div>
              <div className="dimmer" style={{ fontSize: 11 }}>against ADP</div>
            </div>
          </div>
          <div className="note">
            <b>Why this works, and what it is not.</b> We do not project better than
            Sleeper — we use their projection unchanged. What we change is the
            question: a draft is not about points, it is about points{" "}
            <i>above the next player still on the board at that position</i>. Three
            hundred points from a quarterback is worth less than three hundred from a
            running back, because the quarterback curve is flat.
            <br /><br />
            Note that A-Ranking's rank correlation is <b>lower</b> than Sleeper's
            ({a.rhoCommon} vs {slp.rhoCommon}) while its drafts score higher. That is
            the whole point: <b>higher correlation is not the same as a better decision.</b>
            <br /><br />
            <b>The honest caveat:</b> Sleeper's projections only exist back to 2022, so
            this is four seasons. It wins all four, but four is not many.
          </div>
        </div>
      )}

      <div className="tablewrap">
        <table className="data">
          <thead><tr className="cols">
            <th className="txt frozen">Ranking</th>
            <th title="Points the simulated team actually scored, averaged over 12 draft slots and the seasons shown">Draft pts</th>
            <th title="Difference from ADP">vs ADP</th>
            <th title="Rank correlation with actual finish">rho</th>
            <th title="Share of top-24 RB who finished top-24">RB hit</th>
            <th title="Share of top-36 WR who finished top-36">WR hit</th>
            <th className="txt" title="Which seasons it beat ADP">by season</th>
          </tr></thead>
          <tbody>
            {rows.slice(0, 18).map((m) => {
              const d = m.draftCommon - adp.draftCommon;
              const mine = m.key === "slp_vbd";
              return (
                <tr key={m.key} style={mine
                  ? { background: "rgba(53,196,122,.10)" } : undefined}>
                  <td className="txt frozen">
                    {mine && <span className="badge on" style={{ marginRight: 6 }}>ours</span>}
                    {m.label.replace(" (A-RANKING)", "")}
                  </td>
                  <td className="mono"><b>{m.draftCommon}</b></td>
                  <td className={`mono ${d > 20 ? "good" : d < -20 ? "bad" : ""}`}>
                    {d > 0 ? "+" : ""}{d.toFixed(0)}
                  </td>
                  <td className="mono dim">{m.rhoCommon ?? "—"}</td>
                  <td className="mono dim">{pct(m.hitRbCommon)}</td>
                  <td className="mono dim">{pct(m.hitWrCommon)}</td>
                  {/* ADEINS sameiginlegu arin. Ad syna oll ar hvers likans
                      gaefi rodum med 7 tákn vid hlidina a rodum med 4, og
                      thau vaeru ekki ad bera saman sama heim. */}
                  <td className="txt mono">
                    {common.map((y) => (
                      <span key={y} className={m.draftPerSeason[y] > adp.draftPerSeason[y]
                        ? "good" : "bad"} style={{ marginRight: 3 }}
                        title={`${y}: ${Math.round(m.draftPerSeason[y])} vs ADP ${Math.round(adp.draftPerSeason[y])}`}>
                        {m.draftPerSeason[y] > adp.draftPerSeason[y] ? "+" : "−"}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="dim" style={{ padding: "8px 2px", fontSize: 12 }}>
        Same seasons for every row ({common.join(", ")}) —
        comparing an eight-season average against a four-season one would not be a comparison.
      </div>
    </>
  );
}

const pct = (x) => (x == null ? "—" : `${Math.round(x * 100)}%`);

/* ============================================================
   2. HVAD BER MERKID?
   ============================================================ */
function Signal({ ev }) {
  if (!ev) return null;
  const only = ev.models.filter((m) => m.label.startsWith("only:"))
    .sort((a, b) => (b.draft ?? 0) - (a.draft ?? 0));
  const drops = ev.models.filter((m) => m.label.startsWith("all but"))
    .sort((a, b) => (b.draft ?? 0) - (a.draft ?? 0));
  const full = ev.models.find((m) => m.key === "r_all");

  return (
    <>
      <div className="panel">
        <h2>Each source on its own</h2>
        <div className="sub">
          One family of inputs at a time, nothing else. This answers the question
          directly: experts, statistics, or the team around him?
        </div>
        <div className="tablewrap" style={{ marginTop: 10 }}>
          <table className="data">
            <thead><tr className="cols">
              <th className="txt frozen">Input on its own</th>
              <th>Draft pts</th>
              <th>rho (RB)</th>
              <th>rho (WR)</th>
            </tr></thead>
            <tbody>
              {only.map((m) => (
                <tr key={m.key}>
                  <td className="txt frozen">{m.label.replace("only: ", "")}</td>
                  <td className="mono"><b>{m.draft}</b></td>
                  <td className="mono dim">{m.rho.RB ?? "—"}</td>
                  <td className="mono dim">{m.rho.WR ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="note">
          <b>The order is the answer.</b> The crowd's draft position carries more
          signal than any single statistic. Among the statistics, what a player{" "}
          <i>did</i> beats what he <i>got</i>, which beats how <i>efficiently</i> he
          used it — and team strength on its own is close to worthless for ranking
          individual players, even though it feels like it should matter.
          <br /><br />
          Durability and injury record measure something real but rank players poorly
          on their own: knowing who stays healthy does not tell you who is good.
        </div>
      </div>

      <div className="panel">
        <h2>What is lost by removing each one</h2>
        <div className="sub">
          Everything, minus one family. Compared against the full model
          ({full ? full.draft : "—"}).
        </div>
        <div className="tablewrap" style={{ marginTop: 10 }}>
          <table className="data">
            <thead><tr className="cols">
              <th className="txt frozen">Model</th>
              <th>Draft pts</th>
              <th title="Positive means removing it HELPED">Change</th>
            </tr></thead>
            <tbody>
              {drops.map((m) => {
                const d = full ? m.draft - full.draft : null;
                return (
                  <tr key={m.key}>
                    <td className="txt frozen">{m.label}</td>
                    <td className="mono">{m.draft}</td>
                    <td className={`mono ${d > 0 ? "warn" : ""}`}>
                      {d == null ? "—" : (d > 0 ? "+" : "") + d.toFixed(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="note warn">
          Rows with a <b>positive</b> change are families that made the combined model{" "}
          <i>worse</i> — they added noise, not information. That is a normal result
          and the reason the shipped ranking uses none of them.
        </div>
      </div>
    </>
  );
}

/* ============================================================
   3. DRAFT-ROD
   ============================================================ */
function Order({ st, std }) {
  if (!st) return <div className="panel"><div className="empty">No data.</div></div>;
  const bpa = st.strategies.find((s) => s.key === "bpa");
  const rows = st.strategies.slice().sort((a, b) => b.mean - a.mean);

  return (
    <>
      <div className="panel">
        <h2>Which position first?</h2>
        <div className="sub">
          {st.seasons.length} seasons, {st.teams} teams, every draft slot. The other
          teams draft off ADP; only your team follows the plan.
        </div>
        <div className="note">
          <b>Read this table for what it rules out, not what it crowns.</b> Almost
          every plan sits inside the error bars of simply taking the best player
          available — which is itself the finding. Two things are outside them
          {std ? "" : " in PPR"}: taking a quarterback in round one or two is
          measurably bad{std ? ", and so are Zero-RB and receiver-heavy openings" : ""}.
        </div>
      </div>

      <div className="tablewrap">
        <table className="data">
          <thead><tr className="cols">
            <th className="txt frozen">Plan</th>
            <th>Points</th>
            <th title="Difference from best-available">vs BPA</th>
            <th title="95% bootstrap interval, clustered by season">95% interval</th>
            <th title="Seasons it beat best-available">Wins</th>
            <th className="txt">Verdict</th>
          </tr></thead>
          <tbody>
            {rows.map((s) => {
              const v = s.vsBpa;
              const sig = v && v.excludesZero;
              return (
                <tr key={s.key} style={s.key === "bpa"
                  ? { background: "rgba(77,163,255,.07)" } : undefined}>
                  <td className="txt frozen">{s.label}</td>
                  <td className="mono"><b>{s.mean}</b></td>
                  <td className={`mono ${sig && v.diff > 0 ? "good" : sig ? "bad" : ""}`}>
                    {v ? (v.diff > 0 ? "+" : "") + v.diff.toFixed(0) : "—"}
                  </td>
                  <td className="mono dim">
                    {v ? `[${v.lo.toFixed(0)}, ${v.hi.toFixed(0)}]` : "—"}
                  </td>
                  <td className="mono dim">{s.winYears}/{s.years}</td>
                  <td className="txt">
                    {s.key === "bpa" ? <span className="badge">baseline</span>
                      : sig ? <span className={`badge ${v.diff > 0 ? "on" : "bad"}`}>
                          {v.diff > 0 ? "better" : "worse"}</span>
                      : <span className="dimmer">inside the noise</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <h2>First-round position, by draft slot</h2>
        <div className="sub">
          Forcing each position in round one, then best available after. Points the
          team finished with, averaged over {st.seasons.length} seasons.
        </div>
        <div className="tablewrap" style={{ marginTop: 10 }}>
          <table className="data">
            <thead><tr className="cols">
              <th className="txt frozen">Pos</th>
              {Object.keys(st.firstRoundBySlot[0].bySlot).map((s) => (
                <th key={s}>#{s}</th>
              ))}
            </tr></thead>
            <tbody>
              {st.firstRoundBySlot.map((r) => {
                const slots = Object.keys(r.bySlot);
                return (
                  <tr key={r.pos}>
                    <td className="txt frozen"><span className={`pos ${r.pos}`}>{r.pos}</span></td>
                    {slots.map((s) => {
                      const best = Math.max(...st.firstRoundBySlot.map((x) => x.bySlot[s]));
                      const isBest = r.bySlot[s] === best;
                      return (
                        <td key={s} className={`mono ${isBest ? "good" : ""}`}>
                          {isBest ? <b>{Math.round(r.bySlot[s])}</b> : Math.round(r.bySlot[s])}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="note warn">
          The gaps between running back and receiver here are small — often less than
          twenty points on a total near fourteen hundred — and they are not
          individually significant. <b>The one row that is clearly separated at every
          slot is the quarterback.</b> Take that as the finding; treat the
          running-back-versus-receiver ordering as a lean, not a rule.
        </div>
      </div>
    </>
  );
}
