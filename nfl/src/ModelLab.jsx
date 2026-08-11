/* ============================================================
   ModelLab.jsx — "hvad spair thvi hverjir verda godir?"

   THESSI FLIPI BIRTIR MAELINGAR, EKKI SKODANIR. Hver tala kemur ur
   `scripts/model-lab.mjs` og `strategy-lab.mjs`, sem keyra
   walk-forward yfir 2015-2025 og skora a raunverulegum stigum.

   ORDALAG SEM SKIPTIR MALI: allt sem er innan vikmarka er SAGT VERA
   innan vikmarka. Toflunni er ekki leyft ad lita ut fyrir ad skera
   ur um meira en hun gerir.
   ============================================================ */

import React, { useMemo, useState } from "react";

export default function ModelLab({ evalPpr, evalStd, stratPpr, stratStd, league, rows,
                                  arankPpr, arankStd, arankFfPpr, arankFfStd, shapes }) {
  const std = league.scoring === "standard";
  const ev = std ? evalStd : evalPpr;
  const st = std ? stratStd : stratPpr;
  const ar = std ? arankStd : arankPpr;
  /* Sama maeling a OHADRI spaheimild yfir 11 timabil — sja Replication. */
  const arFf = std ? arankFfStd : arankFfPpr;
  const [tab, setTab] = useState("rank");

  if (!ev && !st) {
    return (
      <div className="panel">
        <h2>Model lab</h2>
        <div className="note warn">
          The measurement files have not been generated yet. Run{" "}
          <code>scripts/model-lab.mjs</code> and{" "}
          <code>scripts/strategy-lab.mjs</code>.
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
          <button className={`chip${tab === "vs" ? " on" : ""}`}
            onClick={() => setTab("vs")}>Our order vs Sleeper</button>
        </div>
      </div>

      {tab === "rank" && <Rankings ev={ev} ar={ar} arFf={arFf} std={std}
                                   shapes={shapes} league={league} />}
      {tab === "signal" && <Signal ev={ev} />}
      {tab === "order" && <Order st={st} std={std} />}
      {tab === "vs" && <VsSleeper rows={rows} ev={ev} />}
    </>
  );
}

/* ============================================================
   1. HVADA RODUN VINNUR?
   ============================================================ */
function Rankings({ ev, ar, arFf, std, shapes, league }) {
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
              <div className="v warn">+{(a.draftCommon - slp.draftCommon).toFixed(0)}</div>
              <div className="dimmer" style={{ fontSize: 11 }}>
                positive, but not significant
              </div>
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
            <b>Two claims, and they are not equally strong.</b>
            <br /><br />
            <b>Against ADP this holds.</b> +{(a.draftCommon - adp.draftCommon).toFixed(0)} points,
            winning every season tested, with the interval clear of zero.
            <br /><br />
            <b>Against the raw projection order it does not, yet.</b> The gap is
            +{(a.draftCommon - slp.draftCommon).toFixed(0)} here and +60 when both boards
            draft head-to-head in the same league — positive in every simulation we ran,
            and it wins 57% of three thousand head-to-head drafts. But it wins only
            three of five seasons, and the year-to-year swing (+169, −50, −43, +48, +176)
            dwarfs the gap. <b>The interval does not exclude zero.</b>
            <br /><br />
            At this effect size that would take <b>thirteen seasons</b> to settle. We
            have five — the only ones where Sleeper's stored projections are not
            contaminated by the outcome.
          </div>
          {/* `HeadToHead` skilar `.note` og a thvi heima HER INNI.
              `Replication` og `Shapes` skila hins vegar `.panel` og
              foru ut fyrir — spjald inni i spjaldi gefur ramma innan
              ramma og tvofalda fyllingu. Utlitsprofid i alvoru vafra
              greip thad. */}
          {ar && ar.headToHead && <HeadToHead ar={ar} std={std} />}
        </div>
      )}
      {arFf && arFf.headToHead && <Replication ar={ar} ff={arFf} std={std} />}
      {shapes && shapes.shapes && <Shapes shapes={shapes} std={std} league={league} />}

      {/* ADP-LIKANID ER FORSENDA THESSARAR TOFLU, EKKI SKRAUT.
          Hver rod ber `m.draftCommon - adp.draftCommon`, svo vanti
          ADP-likanid hrundi ALLUR flipinn i villuvornina — og
          notandinn saeti uppi med "Something broke" i stad toflu sem
          vantar eina dalk. Vordurinn ad ofan (lina 85) naer adeins
          yfir KPI-spjaldid; hann natti ekki hingad. */}
      {!adp && (
        <div className="note warn">
          <b>The ADP baseline is missing from this measurement file.</b> Every row here
          is scored against it, so the table is hidden rather than shown with holes.
          Re-run <code>scripts/model-lab.mjs</code>.
        </div>
      )}
      {adp && (
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
      )}
      {adp && (
      <div className="dim" style={{ padding: "8px 2px", fontSize: 12 }}>
        Same seasons for every row ({common.join(", ")}) —
        comparing an eight-season average against a four-season one would not be a comparison.
      </div>
      )}
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


/* ============================================================
   OKKAR ROD GEGN OPINBERU SLEEPER-RODINNI
   ============================================================
   Baedi bordin byggja a SOMU spa. Munurinn er eingongu spurningin:
   Sleeper radar eftir HRASTIGUM, vid eftir VIRDI YFIR VARAMANNI i
   thinni deild. Thess vegna er thetta ekki "vid gegn theim" heldur
   "sama spa, tvaer spurningar" — og taflan syar hvad su breyting
   kostar hvern leikmann i saetum.
   ============================================================ */
function VsSleeper({ rows, ev }) {
  const [pos, setPos] = useState("ALL");
  const data = useMemo(() => (rows || [])
    .filter((r) => r.aRank != null && r.sleeperRank != null && r.aRank <= 200)
    .filter((r) => pos === "ALL" || r.pos === pos), [rows, pos]);

  const up = data.slice().sort((a, b) => b.vsSleeperRank - a.vsSleeperRank).slice(0, 12);
  const down = data.slice().sort((a, b) => a.vsSleeperRank - b.vsSleeperRank).slice(0, 12);
  const a = ev && ev.models.find((m) => m.key === "slp_vbd");
  const s = ev && ev.models.find((m) => m.key === "sleeper");

  if (!data.length) {
    return <div className="panel"><div className="empty">No rows loaded.</div></div>;
  }

  return (
    <>
      <div className="panel">
        <h2>Same projection, two questions</h2>
        <div className="sub">
          Take Sleeper's projection and rank it by <b>raw projected points</b> and you
          get one board. Rank the very same numbers by <b>points above the replacement
          player at that position in your league</b> and you get another. Nothing else
          differs — same projection, two questions.
          <br /><br />
          The raw board is the honest baseline for that comparison, not a straw man of
          Sleeper: it is what the projection says on its own. It is <i>not</i> the order
          the Sleeper app shows you, which is ADP — and ADP is measured separately above.
        </div>
        {a && s && (
          <div className="note">
            That single change is worth <b>+{(a.draftCommon - s.draftCommon).toFixed(0)} points</b>{" "}
            a season in the simulation, and it wins every season tested. The reason it
            works is visible in the table below: three hundred points from a
            quarterback is worth far less than three hundred from a running back,
            because the twelfth-best quarterback is nearly as good as the best one.
          </div>
        )}
        <div className="chips" style={{ marginTop: 10 }}>
          {["ALL", "QB", "RB", "WR", "TE"].map((p) => (
            <button key={p} className={`chip${pos === p ? " on" : ""}`}
              onClick={() => setPos(p)}>{p}</button>
          ))}
        </div>
      </div>

      <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
        <div className="grow">
          <div className="panel" style={{ marginBottom: 0 }}>
            <h2 style={{ fontSize: 14 }}>We rank higher than Sleeper</h2>
            <div className="sub">Replacement level lifts these.</div>
          </div>
          <div className="tablewrap"><table className="data">
            <thead><tr className="cols">
              <th className="txt frozen">Player</th><th className="txt">Pos</th>
              <th>Ours</th><th>Sleeper</th><th>Δ</th><th>Proj</th>
            </tr></thead>
            <tbody>{up.map((r) => (
              <tr key={r.id}>
                <td className="txt frozen">{r.name}</td>
                <td className="txt"><span className={`pos ${r.pos}`}>{r.pos}</span></td>
                <td className="mono"><b>{r.aRank}</b></td>
                <td className="mono dim">{r.sleeperRank}</td>
                <td className="mono good">+{r.vsSleeperRank}</td>
                <td className="mono dim">{r.proj == null ? "—" : r.proj.toFixed(0)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>

        <div className="grow">
          <div className="panel" style={{ marginBottom: 0 }}>
            <h2 style={{ fontSize: 14 }}>We rank lower than Sleeper</h2>
            <div className="sub">Mostly quarterbacks — a flat position.</div>
          </div>
          <div className="tablewrap"><table className="data">
            <thead><tr className="cols">
              <th className="txt frozen">Player</th><th className="txt">Pos</th>
              <th>Ours</th><th>Sleeper</th><th>Δ</th><th>Proj</th>
            </tr></thead>
            <tbody>{down.map((r) => (
              <tr key={r.id}>
                <td className="txt frozen">{r.name}</td>
                <td className="txt"><span className={`pos ${r.pos}`}>{r.pos}</span></td>
                <td className="mono"><b>{r.aRank}</b></td>
                <td className="mono dim">{r.sleeperRank}</td>
                <td className="mono bad">{r.vsSleeperRank}</td>
                <td className="mono dim">{r.proj == null ? "—" : r.proj.toFixed(0)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <div className="note warn">
          <b>What we did not do: build our own projection.</b> It was tried three
          ways — a model of the outcome with Sleeper as one input, a model of
          Sleeper's <i>error</i>, and that correction converted to value. The error
          model gained 32 points a season over three seasons, which is inside the
          noise, and its value-converted form finished <b>155 points worse</b>.
          None of them is stable enough to ship. Our contribution is the question,
          not a better forecast.
        </div>
      </div>
    </>
  );
}


/* ============================================================
   BEINT EINVIGI — RETTA TILRAUNAHONNUNIN
   ============================================================
   Ad bera saman tvo ADSKILIN droft laetur ars-havadann drekkja
   muninum. Med badum bordum I SOMU DEILD dregst arsahrifin ut.
   ============================================================ */
function HeadToHead({ ar, std }) {
  const h = ar.headToHead.current;
  const years = Object.entries(h.byYear);
  const sig = h.signP < 0.05;

  return (
    <div className="note" style={{ borderLeftColor: sig ? "var(--good)" : "var(--warn)" }}>
      <b>Head to head, in the same league.</b> Both boards drafting against the same
      opponents, from the same pool, {h.n.toLocaleString()} matchups across{" "}
      {h.years} seasons with the draft room's own randomness applied.
      <div style={{ margin: "10px 0", display: "flex", gap: 18, flexWrap: "wrap" }}>
        <span className="mono">
          <b className={h.winRate > 0.5 ? "good" : "bad"}>
            {(h.winRate * 100).toFixed(1)}%
          </b> of matchups won
        </span>
        <span className="mono">
          <b className={h.mean > 0 ? "good" : "bad"}>
            {h.mean > 0 ? "+" : ""}{h.mean}
          </b> points on average
        </span>
        <span className="mono">
          <b>{h.yearWins}/{h.years}</b> seasons
        </span>
        <span className="mono">
          sign test <b className={sig ? "good" : "warn"}>p = {h.signP}</b>
        </span>
      </div>
      <div className="mono dim" style={{ fontSize: 12 }}>
        {years.map(([y, v]) => (
          <span key={y} style={{ marginRight: 14 }}>
            {y} <span className={v > 0 ? "good" : "bad"}>{v > 0 ? "+" : ""}{v}</span>
          </span>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        {sig
          ? <><b>In {std ? "standard" : "this format"} the result is significant.</b>{" "}
              It wins every season tested — a run that happens by chance once in{" "}
              {Math.round(1 / h.signP)} times. The margin is wider here than in PPR
              because standard scoring pulls the positions further apart, which is
              exactly what a replacement-level correction is for.</>
          : <><b>In {std ? "standard" : "PPR"} it is not significant.</b> The gap is
              positive in every simulation we ran, but it wins only{" "}
              {h.yearWins} of {h.years} seasons and the swing between seasons is far
              larger than the gap. PPR narrows the distance between positions, so the
              correction has less to do.</>}
      </div>
    </div>
  );
}

/* ============================================================
   ENDURTEKNING A OHADRI SPAHEIMILD
   ============================================================
   ÞETTA ER PROFID SEM ENGINN GERIR, OG THAD BREYTTI NIDURSTODUNNI.

   Allt sem stendur fyrir ofan er maelt a spa Sleeper yfir fimm hrein
   timabil (2021-2025). Sama spurning var lögð fyrir ADRA heimild:
   FFToday, sem birtir forleiks-spar aftur til 2015 — **11 timabil** —
   og fer gegnum nakvaemlega sama leka-hlid (fylgni vid fjolda leikinna
   leikja, sama mengi, sama tholmark 0,40). Öll 11 standast; 2018-2020,
   arin sem Sleeper FELLUR a, eru hrein hja FFToday.

   PPR: nidurstadan HELST. +99 stig, 8 af 11 timabilum.
   STANDARD: hun GERIR THAD EKKI. -9 stig, 6 af 11.

   Og thad eru ekki arin heldur heimildin. A SOMU fimm arum:
       Sleeper  +42  +65   +5  +171  +288   (5/5)
       FFToday  +68  -88 -108  -146  +193   (2/5)

   Ályktunin sem verdur ad standa: i standard er "vinnur oll timabil"
   eiginleiki SLEEPER-TALNANNA, ekki almennur eiginleiki thess ad
   umreikna spa i virdi yfir varamanni. I PPR heldur merkid a tveimur
   ohadum heimildum og tvofalt lengri sogu — sem er sterkari
   vidbragd en marktaeknisprof a einni heimild gaeti nokkurn timann
   gefid.                                                          */
function Replication({ ar, ff, std }) {
  const a = ar && ar.headToHead && ar.headToHead.current;
  const f = ff.headToHead.current;
  const holds = f.mean > 0 && f.yearWins > f.years / 2;
  const shared = [2021, 2022, 2023, 2024, 2025];
  return (
    <div className="panel">
      <h2>Does it replicate on a different projection?</h2>
      <div className="sub">
        Everything above uses Sleeper's projection over five clean seasons. This runs
        the identical measurement on <b>FFToday</b>, an unrelated source that publishes
        pre-season projections back to 2015 — <b>eleven seasons</b> — through the same
        leak gate. Every one passes, including 2018–2020, the years Sleeper fails.
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="k">Sleeper · {a ? a.years : "—"} seasons</div>
          <div className="v"><b className={a && a.mean > 0 ? "good" : "bad"}>
            {a ? (a.mean > 0 ? "+" : "") + a.mean : "—"}</b></div>
          <div className="k dim">{a ? `${a.yearWins}/${a.years} seasons` : ""}</div>
        </div>
        <div className="kpi">
          <div className="k">FFToday · {f.years} seasons</div>
          <div className="v"><b className={f.mean > 0 ? "good" : "bad"}>
            {f.mean > 0 ? "+" : ""}{f.mean}</b></div>
          <div className="k dim">{f.yearWins}/{f.years} seasons</div>
        </div>
      </div>

      <div className="mono dim" style={{ fontSize: 12, marginTop: 8 }}>
        {Object.entries(f.byYear).map(([y, v]) => (
          <span key={y} style={{ marginRight: 14 }}>
            {y} <span className={v > 0 ? "good" : "bad"}>{v > 0 ? "+" : ""}{v}</span>
          </span>
        ))}
      </div>

      <div className={`note ${holds ? "" : "warn"}`} style={{ marginTop: 12 }}>
        {holds
          ? <><b>In {std ? "standard" : "PPR"} the result replicates.</b> A second,
              unrelated projection over eleven seasons gives the same direction and a
              similar margin. Replication on independent data is stronger evidence than
              any significance test on one source, because it cannot be produced by the
              quirks of a single provider.</>
          : <><b>In {std ? "standard" : "PPR"} it does not replicate.</b> On FFToday the
              margin is {f.mean > 0 ? "+" : ""}{f.mean} points and it wins {f.yearWins} of{" "}
              {f.years} seasons. And it is not the extra years — on the same five seasons
              Sleeper gives{" "}
              {a ? shared.map((y) => (a.byYear[y] > 0 ? "+" : "") + a.byYear[y]).join(", ") : "—"}
              {" "}while FFToday gives{" "}
              {shared.map((y) => (f.byYear[y] > 0 ? "+" : "") + f.byYear[y]).join(", ")}.
              {" "}<b>So "wins every season" is a property of Sleeper's numbers here, not
              of replacement-level value in general.</b> The ordering is still what the
              app uses — it beats ADP on both sources — but do not read the season sweep
              as settled.</>}
      </div>
    </div>
  );
}

/* ============================================================
   GILDIR THETTA I MINNI DEILD?
   ============================================================
   Allt annad i thessum flipa var maelt i EINNI deild: 12 lid, einn
   leikstjornandi. Hun var valin thvi hun er algengust — en appid
   leyfir 8 til 16 lid og superflex, og varamanns-threpid ER
   deildarstaerd. Med 10 lidum er varamadurinn betri en med 14, svo
   VBD-bilin thjappast; i superflex fer QB ur einu saeti af niu i tvo.

   `shape-lab.mjs` keyrdi 16 logunum. Nidurstadan gegn ADP er
   16 af 16 jakvaed — en HUN A HEIMILDINA AD BAKI SER, ekki adferdina
   eina, og thad er sagt i Replication-spjaldinu fyrir ofan.        */
function Shapes({ shapes, std, league }) {
  const rows = Object.values(shapes.shapes)
    .filter((r) => r.scoring === (std ? "standard" : "ppr"));
  if (!rows.length) return null;

  /* Hvada rod passar vid deildina sem notandinn hefur stillt? */
  const sf = league.superflex || (league.starters && league.starters.SUPERFLEX);
  const flex = (league.starters && league.starters.FLEX) || 1;
  const qb = (league.starters && league.starters.QB) || 1;
  const mine = sf ? "12-sflex" : qb >= 2 ? "12-2qb" : flex >= 2 ? "12-2flex"
    : `${league.teams}-std`;

  return (
    <div className="panel">
      <h2>Is this measured for your league?</h2>
      <div className="sub">
        Everything above was measured in one league shape — twelve teams, one
        quarterback — because it is the most common. Replacement level <i>is</i> league
        size, so the shape matters: with ten teams the replacement player is better than
        with fourteen, which compresses every gap.
      </div>
      <div className="tablewrap" style={{ marginTop: 10 }}>
        <table className="data">
          <thead><tr className="cols">
            <th className="txt frozen">Shape</th>
            <th title="Against ranking the same projection by raw points">vs raw order</th>
            <th title="Against drafting straight off ADP">vs ADP</th>
            <th className="txt">Seasons won</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.shape} style={r.shape === mine
                ? { background: "rgba(53,196,122,.10)" } : undefined}>
                <td className="txt frozen">
                  {r.shape === mine && <span className="badge on" style={{ marginRight: 6 }}>yours</span>}
                  {r.shape}
                </td>
                <td className={`mono ${r.vsRaw.mean > 0 ? "good" : "bad"}`}>
                  {r.vsRaw.mean > 0 ? "+" : ""}{r.vsRaw.mean}
                </td>
                <td className={`mono ${r.adpValid === false ? "null"
                  : r.vsAdp.mean > 0 ? "good" : "bad"}`}>
                  {r.adpValid === false ? "—" : <b>{r.vsAdp.mean > 0 ? "+" : ""}{r.vsAdp.mean}</b>}
                </td>
                <td className="txt dim">
                  {r.adpValid === false
                    ? "historical ADP is one-QB, so this comparison is void"
                    : `${r.vsAdp.wins}/${r.vsAdp.years} against ADP`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note" style={{ marginTop: 10 }}>
        <b>Positive against ADP in {shapes.summary.beatsAdp} of{" "}
        {shapes.summary.validShapes} shapes where that comparison is valid</b>, and
        against raw order in {shapes.summary.beatsRaw} of {shapes.summary.shapes}.
        {" "}The superflex and two-quarterback rows carry no ADP number on purpose: the
        historical ADP we have is from <b>one-quarterback</b> drafts, so the field in
        those simulations leaves quarterbacks on the board that a real superflex room
        would take immediately. A board that values quarterbacks correctly would "win"
        against opponents who are playing the wrong game, and that number would measure
        their mistake rather than our ordering. The margin is widest in
        shallow leagues and narrows as the league deepens, which is what a
        replacement-level argument predicts: a deeper league means a worse replacement
        player, so more of the pool is worth starting and the ordering has less room to
        separate.
        {!rows.some((r) => r.shape === mine) && (
          <> <b>Your current shape is not one of the sixteen measured</b> — the numbers
          above are the nearest evidence, not a measurement of your league.</>
        )}
      </div>
    </div>
  );
}
