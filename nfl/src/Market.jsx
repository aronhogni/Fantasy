/* ============================================================
   Market.jsx — hvad bokmakarinn heldur, og hvad thad thydir fyrir thig.

   HVERS VEGNA MARKADURINN A EIGIN FLIPA: i maelingunni i
   `model-lab.mjs` var markadurinn STERKASTA einstaka inntakid —
   sterkara en oll tolfraedi til samans. Thad er ekki skodun heldur
   nidurstada, og hun rettlaetir ad hann fai sitt eigid pláss frekar
   en ad vera einn dalkur.

   THRJAR NOTKUNIR OG THAER KOMA A OLIKUM TIMA:
     NUNA (draft)    hvada soknir skora, hvada varnir eru lelegar,
                     og hvernig vikur 15-17 lita ut — thaer eru
                     urslitakeppnin og thu draftar fyrir thaer lika
     A TIMABILI      vaent stig vikunnar -> byrjunarlid og skipti
     A TIMABILI      marka-likur per leikmann (Anytime TD)

   Sidustu tvaer eru byggdar en BIDA verdlagningar. Thad er sagt
   berum ordum i stad thess ad syna tomt bord sem litur ut eins og
   bilun.
   ============================================================ */

import React, { useMemo, useState } from "react";
/* ============================================================
   IMPLIED-TOLURNAR KOMA UR `model.js`, EKKI UR AFRITI HER (25.8.2026)

   Thessi tafla reiknadi sjalf `g.total / 2 + g.spread / 2`. Sian ofar
   krefst adeins `total != null`, og i JS er **`null / 2 === 0`**, svo
   leikur MED total en AN spreads fekk `44,5/2 ± 0` = 22,3 a BADA dalka
   — jofn tala sem les eins og bokmakarinn hafi kallad leikinn jafnan.
   Hann gerdi thad ekki; hann gaf enga linu. Thetta brytur grunnreglu
   appsins sjalfs: NULL ER EKKI NULL.

   ThAD ER RAUNVERULEGT I DAG, EKKI TILGATA: maelt 25.8.2026 i
   `market.json` — MIN @ TB i viku 3 ber `total: 44.5, spread: null`,
   ein rod af 272.

   `impliedTeamTotals` i `model.js` HEFUR thessa vorn (`spread == null
   -> { home: null, away: null }`) og `Schedule.jsx` notar hana. Thessi
   tafla afritadi formuluna og missti vornina i leidinni — nakvaemlega
   `buildTeamMetrics`-aettin. Nu er ein utfaersla og tvo kollstodur.
   ============================================================ */
import { impliedTeamTotals } from "./model.js";

export default function Market({ market, rows, meta, history }) {
  const [tab, setTab] = useState("teams");

  if (!market || !market.teams || !market.teams.length) {
    return (
      <div className="panel">
        <h2>Market</h2>
        <div className="note warn">
          <code>market.json</code> did not load. Nothing is shown rather than a
          table built from a stale schedule.
        </div>
      </div>
    );
  }

  const priced = market.withLine || 0;
  const total = (market.lines || []).length;

  return (
    <>
      <div className="panel">
        <h2>What the market says</h2>
        <div className="sub">
          DraftKings lines for <b>{priced}</b> of {total} games this season, straight
          from ESPN — no key, no quota. A team's implied points are{" "}
          <code>total/2 ± spread/2</code>.
        </div>
        <div className="chips">
          <button className={`chip${tab === "teams" ? " on" : ""}`}
            onClick={() => setTab("teams")}>Offence and defence</button>
          <button className={`chip${tab === "playoff" ? " on" : ""}`}
            onClick={() => setTab("playoff")}>Fantasy playoffs (wk 15–17)</button>
          <button className={`chip${tab === "week" ? " on" : ""}`}
            onClick={() => setTab("week")}>This week</button>
          <button className={`chip${tab === "futures" ? " on" : ""}`}
            onClick={() => setTab("futures")}>Futures</button>
          <button className={`chip${tab === "history" ? " on" : ""}`}
            onClick={() => setTab("history")}>Does it actually work?</button>
        </div>
      </div>

      {tab === "teams" && <Teams market={market} />}
      {tab === "playoff" && <Playoffs market={market} rows={rows} />}
      {tab === "week" && <ThisWeek market={market} meta={meta} />}
      {tab === "futures" && <Futures market={market} />}
      {tab === "history" && <History history={history} />}
    </>
  );
}

/* ============================================================
   SOKN OG VORN
   ============================================================ */
function Teams({ market }) {
  const [sort, setSort] = useState("allowed");
  const teams = useMemo(() => market.teams.slice().sort((a, b) =>
    sort === "allowed" ? b.allowed - a.allowed : b.scored - a.scored),
  [market, sort]);

  const worst = market.teams.slice().sort((a, b) => b.allowed - a.allowed).slice(0, 5);
  const best = market.teams.slice().sort((a, b) => a.allowed - b.allowed).slice(0, 5);

  return (
    <>
      <div className="panel">
        <div className="row" style={{ alignItems: "flex-start", gap: 24 }}>
          <div className="grow">
            <div className="k dim" style={{ fontSize: 11, textTransform: "uppercase",
              letterSpacing: ".6px", marginBottom: 6 }}>Softest defences — attack these</div>
            {worst.map((t, i) => (
              <div key={t.team} style={{ display: "flex", gap: 8, alignItems: "center",
                fontSize: 13, padding: "2px 0" }}>
                <span className="dimmer" style={{ width: 18 }}>{i + 1}</span>
                <b style={{ width: 44 }}>{t.team}</b>
                <span className="bar" style={{ width: Math.round(t.allowed * 5),
                  background: "var(--good)" }} />
                <span className="mono good">{t.allowed.toFixed(1)}</span>
              </div>
            ))}
          </div>
          <div className="grow">
            <div className="k dim" style={{ fontSize: 11, textTransform: "uppercase",
              letterSpacing: ".6px", marginBottom: 6 }}>Toughest defences — avoid</div>
            {best.map((t, i) => (
              <div key={t.team} style={{ display: "flex", gap: 8, alignItems: "center",
                fontSize: 13, padding: "2px 0" }}>
                <span className="dimmer" style={{ width: 18 }}>{i + 1}</span>
                <b style={{ width: 44 }}>{t.team}</b>
                <span className="bar" style={{ width: Math.round(t.allowed * 5),
                  background: "var(--bad)" }} />
                <span className="mono bad">{t.allowed.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="note">
          <b>What this is and is not.</b> "Points allowed" here is what bookmakers
          expect a team's <i>opponents</i> to score, averaged over the season. It is a
          forecast, not a record — it already prices in the schedule, personnel changes
          and everything else the market knows in August.
          <br /><br />
          It is <b>not</b> broken down by position. A defence can be soft against the
          run and stingy against the pass, and this number cannot see that. Use it to
          pick between two similar players, not to override a projection.
        </div>
      </div>

      <div className="tablewrap">
        <table className="data">
          <thead><tr className="cols">
            <th className="txt frozen">Team</th>
            <th onClick={() => setSort("scored")}
              title="Implied points the team scores, per game">Offence{sort === "scored" ? " ↓" : ""}</th>
            <th onClick={() => setSort("allowed")}
              title="Implied points its opponents score — higher means a softer defence">Defence{sort === "allowed" ? " ↓" : ""}</th>
            <th title="Offence minus defence">Margin</th>
            <th title="Implied points allowed in weeks 15-17">Playoff D</th>
            <th title="Games with a posted line">Games</th>
          </tr></thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.team}>
                <td className="txt frozen"><b>{t.team}</b></td>
                <td className={`mono ${t.scored >= 25 ? "good" : t.scored <= 20 ? "bad" : ""}`}>
                  {t.scored.toFixed(1)}
                </td>
                <td className={`mono ${t.allowed >= 24.5 ? "good" : t.allowed <= 21.5 ? "bad" : ""}`}>
                  {t.allowed.toFixed(1)}
                </td>
                <td className={`mono ${t.margin > 2 ? "good" : t.margin < -2 ? "bad" : ""}`}>
                  {t.margin > 0 ? "+" : ""}{t.margin.toFixed(1)}
                </td>
                <td className="mono dim">
                  {t.playoffAllowed == null ? <span className="null">—</span>
                    : t.playoffAllowed.toFixed(1)}
                </td>
                <td className="mono dimmer">{t.games}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dim" style={{ padding: "8px 2px", fontSize: 12 }}>
        Green on the defence column means <b>soft</b> — good to face. The colouring
        follows the fantasy question, not the football one.
      </div>
    </>
  );
}

/* ============================================================
   URSLITAKEPPNIN — vikur 15-17
   ============================================================ */
function Playoffs({ market, rows }) {
  const teams = useMemo(() => market.teams
    .filter((t) => t.playoffAllowed != null)
    .slice().sort((a, b) => b.playoffAllowed - a.playoffAllowed), [market]);

  const byTeam = useMemo(() => {
    const m = new Map();
    for (const r of rows || []) {
      if (!r.team || r.aRank == null || r.aRank > 120) continue;
      (m.get(r.team) || m.set(r.team, []).get(r.team)).push(r);
    }
    for (const list of m.values()) list.sort((a, b) => a.aRank - b.aRank);
    return m;
  }, [rows]);

  return (
    <>
      <div className="panel">
        <h2>Weeks 15–17</h2>
        <div className="sub">
          The three weeks that decide most leagues. Sorted by how much the market
          expects their opponents to score in those weeks.
        </div>
        <div className="note">
          <b>Use this as a tie-breaker, not a reason to reach.</b> Four months of
          roster churn, injuries and trades sit between the draft and week 15, and the
          lines for those weeks are the least informed of the season. A player is not
          worth a round of draft capital because of a December matchup.
        </div>
      </div>
      <div className="tablewrap">
        <table className="data">
          <thead><tr className="cols">
            <th className="txt frozen">Team</th>
            <th title="Implied points its opponents score in weeks 15-17">Playoff D</th>
            <th title="Season-long figure, for comparison">Season D</th>
            <th title="Difference — positive means the playoff run is softer than the season">Δ</th>
            <th className="txt">Weeks 15–17</th>
            <th className="txt" title="Your highest-ranked players on this team">Top players</th>
          </tr></thead>
          <tbody>
            {teams.map((t) => {
              const d = t.playoffAllowed - t.allowed;
              const wks = (t.weeks || []).filter((w) => w.week >= 15 && w.week <= 17);
              const players = (byTeam.get(t.team) || []).slice(0, 3);
              return (
                <tr key={t.team}>
                  <td className="txt frozen"><b>{t.team}</b></td>
                  <td className={`mono ${t.playoffAllowed >= 25 ? "good" : t.playoffAllowed <= 21 ? "bad" : ""}`}>
                    {t.playoffAllowed.toFixed(1)}
                  </td>
                  <td className="mono dim">{t.allowed.toFixed(1)}</td>
                  <td className={`mono ${d > 1.5 ? "good" : d < -1.5 ? "bad" : ""}`}>
                    {d > 0 ? "+" : ""}{d.toFixed(1)}
                  </td>
                  <td className="txt dim mono">
                    {wks.map((w) => `${w.opp} ${w.allowed.toFixed(0)}`).join(" · ") || "—"}
                  </td>
                  <td className="txt dim">
                    {players.length
                      ? players.map((p) => p.name.split(" ").slice(-1)[0]).join(", ")
                      : <span className="null">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ============================================================
   VIKAN — byrjunarlid, skipti og waiver
   ============================================================ */
function ThisWeek({ market, meta }) {
  const preseason = !meta || meta.seasonType === "pre" || meta.seasonType === "off";
  const week = preseason ? 1 : (meta.week || 1);
  const games = (market.lines || []).filter((g) => g.week === week && g.total != null);

  return (
    <>
      <div className="panel">
        <h2>Week {week}{preseason ? " (preseason — showing the opener)" : ""}</h2>
        <div className="sub">
          Implied points per team. In season this is the first thing to look at for
          start/sit and for who is worth a waiver claim.
        </div>
        {preseason && (
          <div className="note warn">
            <b>The weekly tools are built but have never run on a live week.</b>{" "}
            Anytime-touchdown prices, which are the direct answer to "who is likely to
            score", are not posted this far out: measured on 9 August, every game
            listed 24 players and <b>none of them had a price</b>. They appear a few
            days before kickoff. Nothing is shown in their place.
          </div>
        )}
      </div>
      <div className="tablewrap">
        <table className="data">
          <thead><tr className="cols">
            <th className="txt frozen">Game</th>
            <th title="Bookmaker total">O/U</th>
            <th title="Positive means the home team is favoured">Spread</th>
            <th>Away pts</th>
            <th>Home pts</th>
            <th className="txt">Line</th>
          </tr></thead>
          <tbody>
            {games.sort((a, b) => (b.total ?? 0) - (a.total ?? 0)).map((g) => {
              const { home, away } = impliedTeamTotals(g.total, g.spread);
              return (
                <tr key={g.id}>
                  <td className="txt frozen"><b>{g.away}</b> <span className="dim">@</span> <b>{g.home}</b></td>
                  <td className={`mono ${g.total >= 48 ? "good" : g.total <= 41 ? "bad" : ""}`}>
                    {g.total}
                  </td>
                  {/* VANTANDI SPREAD ER "—", EKKI "+0". Bert `0` her vaeri
                      sama luginn og reiknudu dalkarnir baru: jafntefli sem
                      bokmakarinn kalladi aldrei.                          */}
                  <td className="mono dim">
                    {g.spread == null ? "—" : `${g.spread > 0 ? "+" : ""}${g.spread}`}
                  </td>
                  <td className={`mono ${away == null ? "" : away >= 26 ? "good" : away <= 18 ? "bad" : ""}`}>
                    {away == null ? "—" : away.toFixed(1)}
                  </td>
                  <td className={`mono ${home == null ? "" : home >= 26 ? "good" : home <= 18 ? "bad" : ""}`}>
                    {home == null ? "—" : home.toFixed(1)}
                  </td>
                  <td className="txt dimmer">{g.details || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ============================================================
   FRAMTIDARMARKADIR
   ============================================================ */
function Futures({ market }) {
  const sb = (market.futures || []).find((f) => /super bowl/i.test(f.market));
  const rest = (market.futures || []).filter((f) => !/super bowl/i.test(f.market));

  return (
    <>
      <div className="panel">
        <h2>Futures</h2>
        <div className="sub">
          The market's view of each team before a snap has been played. Probabilities
          are de-vigged — raw bookmaker prices sum to well over 100%.
        </div>
        <div className="note">
          These are a <b>team</b> signal, and the measurement in the Model lab found
          team strength on its own to be close to worthless for ranking individual
          players. Read them as background, not as a reason to move anyone up a board.
        </div>
      </div>
      {sb && (
        <div className="tablewrap">
          <table className="data">
            <thead><tr className="cols">
              <th className="txt frozen">Team</th>
              <th>Super Bowl</th>
              <th className="txt">{sb.provider || ""}</th>
            </tr></thead>
            <tbody>
              {sb.teams.map((t, i) => (
                <tr key={t.team}>
                  <td className="txt frozen"><span className="dimmer"
                    style={{ marginRight: 8 }}>{i + 1}</span><b>{t.team}</b></td>
                  <td className="mono">{(t.prob * 100).toFixed(1)}%</td>
                  <td className="txt">
                    <span className="bar" style={{ width: Math.round(t.prob * 400) }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="dim" style={{ padding: "10px 2px", fontSize: 12 }}>
        {rest.length} more team markets loaded (divisions and conferences).
      </div>
    </>
  );
}

/* ============================================================
   VIRKAR THETTA? — 20 ARA MAELING
   ============================================================
   Flipinn ma ekki lita ut fyrir ad markadurinn se toframedal. Hann
   ER sterkasta inntakid i DRAFT-rodun, en fyrir EINA VIKU, thegar thu
   veist thegar hver leikmadurinn er, ber hann innan vid halft prosent.
   Bædi er satt og bædi verda ad standa.
   ============================================================ */
function History({ history }) {
  if (!history || !history.signals) {
    return (
      <div className="panel">
        <h2>Historical test</h2>
        <div className="note warn">
          <code>market_history.json</code> is not loaded. Run{" "}
          <code>scripts/market-lab.mjs</code>.
        </div>
      </div>
    );
  }
  const POS = ["QB", "RB", "WR", "TE"];
  const best = {};
  for (const p of POS) {
    const b = history.signals
      .filter((s) => s.pos[p] && s.pos[p].lift != null)
      .sort((a, c) => c.pos[p].lift - a.pos[p].lift)[0];
    if (b) best[p] = b;
  }
  const h2h = history.defenseHeadToHead || {};
  const years = Object.keys(history.byYear || {});

  return (
    <>
      <div className="panel">
        <h2>Twenty seasons, {history.sampleSize.toLocaleString()} player-weeks</h2>
        <div className="sub">
          {history.seasons[0]}–{history.seasons[1]}. For every player-week we take his
          own season average excluding that week, then ask how much each market number
          explains of what is left over. Coefficients are fitted on earlier seasons only.
        </div>
        <div className="kpis">
          {POS.map((p) => best[p] && (
            <div className="kpi" key={p} style={{ minWidth: 190 }}>
              <div className="k"><span className={`pos ${p}`}>{p}</span> best signal</div>
              <div className="v" style={{ fontSize: 15 }}>
                {best[p].label.replace(/^(Implied points for his own team|Win probability from the moneyline)$/,
                  (m) => (m.startsWith("Implied") ? "Implied team total" : "Moneyline win prob."))}
              </div>
              <div className="dimmer" style={{ fontSize: 11 }}>
                removes {(best[p].pos[p].lift * 100).toFixed(2)}% of squared error
              </div>
            </div>
          ))}
        </div>
        <div className="note warn">
          <b>Read those percentages carefully.</b> The best market signal removes
          between <b>0.03% and 0.42%</b> of a weekly projection's squared error. That
          is real, it is stable, and it is <b>tiny</b>.
          <br /><br />
          This is not a contradiction of the Model lab, where the market was the
          strongest input of all. There, the question is <i>who is this player</i> —
          and draft position answers that better than any statistic. Here the question
          is <i>what will he do this Sunday, given we already know who he is</i>, and
          the game line only carries context, which is a small slice of the variance.
        </div>
      </div>

      <div className="tablewrap">
        <table className="data">
          <thead><tr className="cols">
            <th className="txt frozen">Market number</th>
            {POS.map((p) => <th key={p} title="Correlation with the residual">{p} r</th>)}
            {POS.map((p) => <th key={p + "l"} title="Out-of-sample squared-error removed">{p} lift</th>)}
          </tr></thead>
          <tbody>
            {history.signals.slice().sort((a, b) =>
              (b.pos.RB ? b.pos.RB.lift : -9) - (a.pos.RB ? a.pos.RB.lift : -9)).map((s) => (
              <tr key={s.key}>
                <td className="txt frozen" title={s.note}>{s.label}</td>
                {POS.map((p) => (
                  <td key={p} className="mono dim">
                    {s.pos[p] ? s.pos[p].r.toFixed(3) : <span className="null">—</span>}
                  </td>
                ))}
                {POS.map((p) => (
                  <td key={p + "l"} className={`mono ${s.pos[p] && s.pos[p].lift > 0.002 ? "good"
                    : s.pos[p] && s.pos[p].lift < 0 ? "bad" : ""}`}>
                    {s.pos[p] && s.pos[p].lift != null
                      ? (s.pos[p].lift * 100).toFixed(2) + "%" : <span className="null">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <h2>Three things the twenty years settled</h2>
        <div className="note">
          <b>1. Receivers do not care about the game line.</b> Every market number is
          within noise of zero for wide receivers (lift 0.03% at best). A team that is
          behind throws more and makes up for what the script took away. Any tool that
          downgrades a receiver for a low team total is selling you something that has
          never been measurable.
        </div>
        <div className="note">
          <b>2. For running backs it is the spread, not the total.</b> Win probability
          and spread beat the implied team total ({best.RB ? (best.RB.pos.RB.lift * 100).toFixed(2) : "0.42"}%
          against 0.29%), and the game total on its own is worthless
          (−0.05%). What matters is whether his team will be <i>ahead</i>, not whether
          the game will be high-scoring. The opponent's implied points carry a{" "}
          <b>negative</b> sign for backs, which is the same fact seen from the other
          side: a dangerous opponent means his team is chasing, and chasing teams stop
          running.
        </div>
        {h2h["market: opponent implied points"] != null && (
          <div className="note">
            <b>3. For "is this a good defence to face", statistics beat the market —
            and both are almost nothing.</b> Points the defence has actually allowed to
            that position so far scores r={" "}
            <b>{h2h["stats: points that defence has allowed this position so far"]}</b>,
            the market's opponent total scores{" "}
            <b>{h2h["market: opponent implied points"]}</b>. Neither is strong enough to
            move a player in a ranking. The market number even carries the wrong sign,
            because it mixes defensive quality with game script.
          </div>
        )}
        {years.length > 0 && (
          <div className="note">
            <b>And it has not changed.</b> The signal averaged{" "}
            {avgOf(history.byYear, (y) => +y <= 2015).toFixed(3)} across 2006–2015 and{" "}
            {avgOf(history.byYear, (y) => +y > 2015).toFixed(3)} across 2016–2025 — the
            interval does not exclude zero. Twenty years of sharper betting markets have
            not made them a stronger fantasy signal.
          </div>
        )}
      </div>
    </>
  );
}

function avgOf(byYear, pred) {
  const v = Object.keys(byYear).filter(pred).map((y) => byYear[y]);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}
