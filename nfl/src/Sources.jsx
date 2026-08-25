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
import { when } from "./reltime.js";
import { clearState } from "./data.js";
import { POS_ELASTICITY, DEF_WEIGHT, FLEX_SPLIT, IMPLIED_BASE } from "./model.js";

export default function Sources({ status, meta, calibration, built }) {
  const src = (status && status.sources) || [];
  const bad = src.filter((s) => !s.ok);
  /* STADAR RADIR ERU EKKI FERSKAR RADIR. Pipeline-id keyrir i threpum
     (`--stage=core|history|experts`) og sameinar `status.json` a heiti,
     svo rod sem thetta threp snerti ekki helst inni med `stale: true`.
     Adur var thad ekki synt — 21 af 50 rodum voru gamlar og litu
     nakvaemlega eins ut og ferskar. Heimild sem enginn ser bilar
     hljodlega, og heimild sem litur ferskari ut en hun er, er verri. */
  const stale = src.filter((s) => s.stale);

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
        {stale.length > 0 && (
          <div className="note">
            <b>{stale.length} of {src.length} rows are carried over</b> from an earlier
            stage and were not refreshed by the last run
            {status && status.stage ? ` (${status.stage})` : ""}. Their data is still on
            disk and still valid — the timestamp tells you how old it is.
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
                    {s.stale && <span className="badge warn" style={{ marginLeft: 6 }}>carried over</span>}
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

        {/* ============================================================
            ÞESSI NOTA OFFULLYRTI OG HUN VAR LOGUD 18.8.2026
            ============================================================
            Hun sagdi "measured" og "nearly double" og ekkert um HVADA
            DEILD talan var maeld i. Hun var maeld i 12-lida deild med
            WR3 og EINU flexi; HVORUG deild notandans er su logun, og
            sama talningin gefur TE 0,073 / 0,083 i theim. Uttekt rakti
            OLL TOLF staerstu kaup-merkin a bordinu til thessarar tolu.

            TALAN STENDUR — sveipud 0 -> 0,40 a stigum OG sigrum,
            0 af 102 frumum standast bar repo-sins (README 4l) — en
            notan verdur ad segja hvad hun er og hvad hun er ekki.
            Sama regla og `DEF_WEIGHT`-notan hér fyrir ofan fylgir:
            "any interface that let it reorder players would be selling
            it as more than it measured".                            */}
        <div className="note">
          <b>Flex split — RB {FLEX_SPLIT.RB} · WR {FLEX_SPLIT.WR} · TE {FLEX_SPLIT.TE}.</b>{" "}
          Measured by counting who actually lands in the weekly top-12 flex, 2020–2025 —
          but measured in a <b>12-team, WR3, one-flex</b> league, which is not the shape
          either of your leagues uses. The same count gives TE <b>0.073</b> and{" "}
          <b>0.083</b> in your two leagues, and the season-to-season range is 0.130–0.352.
          <br />
          It was swept from 0 to 0.40 on both of your shapes, on season points and on
          weekly wins: <b>none of the 102 cells beat 0.193</b> at the bar used everywhere
          else here, and going <i>deeper</i> is measurably worse — so the figure stays.
          <br />
          What that leaves unsettled is the <b>cross-position</b> comparison: tight ends
          carry the largest &quot;value vs market&quot; gaps on the board, and that gap is
          neither confirmed nor refuted by measurement. <b>Read the tight-end buy signals
          as unverified rather than as the strongest ones.</b>
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


