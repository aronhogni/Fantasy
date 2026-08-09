/* ============================================================
   Sources.jsx — hvadan hver tala kemur og hvort heimildin er a lifi.

   THESSI FLIPI ER EKKI SKRAUT. Reglan ur FPL-verkefninu gildir hér
   obreytt: **heimild sem enginn ser bilar hljodlega.** Markadslidurinn
   i hinu appinu var daudur i heila viku medan oll profin voru graen,
   thvi thau profudu formuluna en ekki hvort faedid vaeri nytilegt.

   Hér stendur lika KVORDUNIN — mældu fastarnir og hversu litlu their
   raeda. Notandi sem ser ad "vorn gegn stodu" baetir spana um 0,13%
   mun ekki ofmeta thann dalk, og thad er retta utkoman.
   ============================================================ */

import React from "react";
import { clearState } from "./data.js";
import { POS_ELASTICITY, DEF_WEIGHT, FLEX_SPLIT, IMPLIED_BASE } from "./model.js";

export default function Sources({ status, meta, calibration, built }) {
  const src = (status && status.sources) || [];
  const bad = src.filter((s) => !s.ok);

  return (
    <>
      <div className="panel">
        <h2>Data sources</h2>
        <div className="sub">
          {status
            ? `${status.ok} healthy, ${status.failed} failed · pipeline ran ${when(status.generated)} in ${status.seconds}s`
            : "status.json did not load"}
        </div>
        {bad.length > 0 && (
          <div className="note warn">
            <b>{bad.length} source{bad.length > 1 ? "s" : ""} failed.</b> Columns fed by
            them are blank, not guessed.
          </div>
        )}
        <div className="tablewrap" style={{ marginTop: 10 }}>
          <table className="data">
            <thead><tr className="cols">
              <th className="txt frozen">Source</th>
              <th className="txt">State</th>
              <th className="txt">Note</th>
              <th className="txt">Updated</th>
            </tr></thead>
            <tbody>
              {src.map((s) => (
                <tr key={s.name}>
                  <td className="txt frozen mono">{s.name}</td>
                  <td className="txt">
                    <span className={`badge ${s.ok ? "on" : "bad"}`}>{s.ok ? "ok" : "fail"}</span>
                  </td>
                  <td className="txt dim">{s.note}</td>
                  <td className="txt dimmer">{when(s.ts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h2>Coverage in what you are looking at</h2>
        <div className="sub">
          How many of the {built.rows.length} players actually carry each input.
        </div>
        <div className="kpis">
          <Kpi k="projection" v={built.meta.withProj} n={built.rows.length} />
          <Kpi k="ADP" v={built.meta.withAdp} n={built.rows.length} />
          <Kpi k="expert rank" v={built.meta.withEcr} n={built.rows.length} />
          <Kpi k="2025 data" v={built.meta.withLast} n={built.rows.length} />
        </div>
        <div className="note" style={{ marginTop: 12 }}>
          Coverage is not the same for every column, and a player missing an input gets
          <b> — </b> rather than a zero. A bar of length zero reads like a measured
          nothing; a dash reads like what it is.
        </div>
      </div>

      <div className="panel">
        <h2>Calibration</h2>
        <div className="sub">
          Every constant in the weekly model, and how much it is actually worth.
        </div>

        <div className="note">
          <b>Game-script elasticity.</b> How much a player's week moves with his team's
          implied points (baseline {IMPLIED_BASE}). Measured on{" "}
          {calibration ? calibration.sample.elasticityRows.toLocaleString() : "25,160"}{" "}
          player-weeks, 2020–2025, with a leave-one-out baseline.
          <div style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {["QB", "RB", "WR", "TE"].map((p) => {
              const c = calibration && calibration.elasticity && calibration.elasticity[p];
              const t = c && c.se ? c.beta / c.se : null;
              return (
                <span key={p} className="mono">
                  <span className={`pos ${p}`}>{p}</span>{" "}
                  {POS_ELASTICITY[p].toFixed(3)}
                  {t != null && (
                    <span className={Math.abs(t) < 2 ? "warn" : "dim"}>
                      {" "}(t {t.toFixed(1)}{Math.abs(t) < 2 ? ", not significant" : ""})
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          <div style={{ marginTop: 8 }}>
            The WR term is <b>not distinguishable from zero</b>, and that is the finding,
            not a gap. Receivers do not measurably gain from their team being favoured —
            a team that is behind throws more and makes up for it. An earlier version of
            this model applied one elasticity to every position; that was a guess wearing
            the clothes of a measurement.
          </div>
        </div>

        <div className="note">
          <b>Defence versus position — weight {DEF_WEIGHT}.</b> Tested out of sample:
          the defensive rating is built from weeks before the one being predicted.
          The best weight improves squared error by about <b>0.13%</b>, and taking the
          raw rating at full weight is <b>worse than leaving it out entirely</b>.
          <br />
          It stays in as a tie-breaker. Any interface that let it reorder players would
          be selling it as more than it measured.
        </div>

        <div className="note">
          <b>Flex split — RB {FLEX_SPLIT.RB} · WR {FLEX_SPLIT.WR} · TE {FLEX_SPLIT.TE}.</b>{" "}
          Measured by counting who actually lands in the weekly top-12 flex, 2020–2025.
          The first version guessed TE at 0.10; the measured figure is nearly double,
          and that error fed straight into every tight end's replacement level.
        </div>
      </div>

      <div className="panel">
        <h2>Your saved settings</h2>
        <div className="sub">
          League format, watchlist and draft state live in this browser only
          (<code>nfl_*</code> in localStorage). They are never sent anywhere.
        </div>
        <button className="act" onClick={() => {
          if (confirm("Clear all saved NFL settings and draft state?")) {
            clearState(); location.reload();
          }
        }}>Clear saved state</button>
      </div>
    </>
  );
}

function Kpi({ k, v, n }) {
  const p = n ? Math.round((100 * (v || 0)) / n) : 0;
  return (
    <div className="kpi">
      <div className="k">{k}</div>
      <div className="v">{v ?? 0}</div>
      <div className="dimmer" style={{ fontSize: 11 }}>{p}% of rows</div>
    </div>
  );
}

function when(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h}h ago`;
  return d.toISOString().slice(0, 10);
}
