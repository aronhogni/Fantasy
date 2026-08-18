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
/* VIKU-VORPUNIN VAR DREGIN UT I `weekview.js` 12.8.2026 — forsidan
   (`Dashboard.jsx`) tharf NAKVAEMLEGA sama reikning fyrir badar deildir
   notandans, og afrit hefdi verid onnur utfaersla af somu formulu. Sja
   hausinn a `weekview.js` fyrir tvo skjolud tilfelli af thvi hvad thad
   kostar (`buildTeamMetrics` og `makeEnricher` i FPL-appinu). */
import { currentWeek, weekContext, weekRows, onByeThisWeek } from "./weekview.js";
import { newsForRoster, injuredOn } from "./newsmatch.js";

export default function MyTeam({ rows, league, news, meta, market, schedule, defense,
                                 leagueKey, sleeperUser }) {
  /* HOPURINN ER BUNDINN DEILDINNI — sja `scoped` i `data.js`. Deildu
     tvaer deildir sama `myPicks` vaeri uppstillingin reiknud ur
     leikmonnum sem thu eigir i ANNARRI deild, og hun vaeri trulega
     gild i badar. `App.jsx` endurraesir thennan hlut vid svissun. */
  const [ids, setIds] = useState(() => new Set(D.loadState(D.scoped("myPicks", leagueKey), [])));
  const [sleeperRoster, setSleeperRoster] = useState(null);

  const roster = useMemo(() => {
    const want = sleeperRoster ? new Set(sleeperRoster) : ids;
    return rows.filter((r) => want.has(r.id));
  }, [rows, ids, sleeperRoster]);

  const slots = useMemo(() => slotsFor(league), [league]);

  /* ============================================================
     AUD VIKA VAR HARDKODUD SEM `false`
     ============================================================
     `bye: false` thydir "enginn er nokkurn timann i frii", svo
     uppstillingartolid hefdi sett mann i byrjunarlid a THEIRRI VIKU
     SEM HANN SPILAR EKKI. Thad er ekki namundun heldur NULL STIG i
     saeti sem atti ad bera 12 — og thad er einmitt sa flokkur villu
     sem tolid er til ad hindra.

     Gognin voru til allan timann: `r.bye` liggur a hverri rod og
     `meta.week` segir hvada vika er i gangi. Tengingin vantadi.

     VIKAN ER ADEINS LESIN A TIMABILINU. `meta.seasonType` er "pre" i
     forleik og tha er `week` 1 — sem vaeri BORID SAMAN vid bye-viku 1
     og gaefi ranga utkomu ef einhver baeri hana. Enginn ber viku 1
     (fyrsta auda vikan er 5), svo villan vaeri thogul i ar og birtist
     fyrst thegar deildin faerist. Skilyrdid er thvi a `seasonType`,
     ekki a thvi hvort talan lítur ut fyrir ad passa.               */
  const curWeek = currentWeek(meta);

  /* ============================================================
     VIKULEG SPA — MAELD ADUR EN HUN VAR TENGD
     ============================================================
     `weeklyProjection()` var skrifad fra upphafi og LA OTENGT, thvi
     husreglan segir ad omaeldur kodi fari ekki i loftid. Thad var ekki
     haegt ad maela fyrr en markadslinur per viku voru sottar aftur i
     timann (1.960 leikir 2019-2025, 100% med total og spread).

     `startsit-lab.mjs` maeldi thad thannig ad spurningin vaeri RETT:
     ekki "er spain nakvaem" heldur "BREYTIR HUN VALINU". Vikuleg spa
     sem radar ollum eins er einskis virdi i start/sit — thu setur sama
     lidid a vollinn. Maelikvardinn er thvi STIGIN sem lidid skoradi.

       PPR       lokar 5,8% af bilinu upp i fullkomna vitneskju,
                 7/7 ar jakvaed, t = 4,33, 95% [2,8%; 8,8%]
                 = +0,70 stig per uppstillingu = ~12 a timabili
       standard  3,0%, 6/7 ar, t = 2,83, 95% [0,6%; 5,3%]

     5,8% hljomar litid og thad ER litid — en bilid sjalft er ~12 stig
     per viku og megnid af thvi er OVITANLEGT. Talan segir hve mikid af
     THVI SEM VAR HAEGT vannst, sem er eina heidarlega framsetningin.

     I FORLEIK ER ENGIN VIKA og engin lina; tha fellur thetta i
     timabils-spána deilda med 17, eins og adur.                    */
  /* `season` ER SKYLDA, EKKI SKRAUT: `schedule.json` ber tvo timabil og
     `defense.json` sjo, bædi undir sama lykli, svo an arsins vann SIDASTA
     ROD I SKRANNI. Sja skjolun vid `weekContext` — maelt 18.8.2026 gaf 514
     ranga motherja og 30 menn i frii settir i byrjunarlid. */
  const weekly = useMemo(
    () => weekContext({ schedule, defense, week: curWeek, season: meta && meta.season }),
    [schedule, defense, curWeek, meta]);

  const lineup = useMemo(
    () => optimalLineup(weekRows(roster, weekly), slots),
    [roster, slots, weekly]);

  const preseason = !meta || meta.seasonType === "pre" || meta.seasonType === "off";

  /* Hverjir eru i frii THESSA viku — synt sem upplysing, ekki fald. */
  const onBye = onByeThisWeek(roster, curWeek);

  return (
    <>
      {onBye.length > 0 && (
        <div className="note warn">
          <b>{onBye.length} on bye in week {curWeek}:</b>{" "}
          {onBye.map((r) => `${r.name} (${r.team})`).join(", ")}.
          {" "}They score nothing this week, so the lineup below leaves them out —
          a player on bye is not a low projection, he is no projection.
        </div>
      )}
      <RosterSource rows={rows} ids={ids} setIds={setIds}
        season={meta && meta.season} onSleeper={setSleeperRoster}
        sleeperRoster={sleeperRoster} sleeperUser={sleeperUser} />

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
function RosterSource({ rows, ids, setIds, season, onSleeper, sleeperRoster,
                        sleeperUser }) {
  /* NOTANDANAFNID BYR I `App.jsx` OG ÞESSI FLIPI VISSI ÞAD EKKI.
     `sleeperUser` var hift upp i `App` svo forsidan gaeti vitad hvert af
     tiu lidum er mitt, og `Dashboard` og `DraftBoard` fengu thad — en
     `MyTeam` ekki. Flipinn bad thvi notandann ad sla inn thad sem appid
     GEYMDI ÞEGAR: hann sagdi "No roster yet. Load a Sleeper league
     above" medan forsidan birti raunverulega hopinn fyrir somu deild.

     Þetta er falinn flipi, en thad er nakvaemlega astaedan fyrir thvi ad
     hann var faldur og EKKI fjarlaegdur (`App.jsx`: hann ber
     `benchRegret`, sem er ekki a forsidunni). MAELING SEM ER VARDVEITT I
     FLIPA SEM ER OTENGDUR ER VARDVEITT I ORDI EN EKKI I VERKI.

     `useState(sleeperUser || "")` og ekki `value={sleeperUser}`: reiturinn
     er afram STYRDUR AF NOTANDANUM — hann ma sla inn annad nafn hér an
     thess ad thad breyti thvi sem forsidan notar. Gefna nafnid er
     UPPHAFSGILDI, ekki las. */
  const [user, setUser] = useState(sleeperUser || "");
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
  /* PORUNIN VAR DREGIN UT I `newsmatch.js` 12.8.2026 — forsidan tharf
     nakvaemlega somu parun fyrir badar deildir, og afrit hefdi verid
     onnur utfaersla af somu reglu.

     OG UTDRATTURINN HERTI HANA: gamla utgafan hér leitadi a `espnId`
     EDA nafni fyrir HVERN leikmann. Sa sem bar audkenni gat thvi
     parast a NAFNI vid annan mann med sama nafn — "Josh Allen" (BUF,
     QB) og "Josh Allen" (JAX, LB) eru sami strengur. Nu er nafnid
     adeins reynt fyrir tha 39 sem bera EKKERT audkenni, og bakleidin
     er TALIN svo hun geti ekki vaxid i thogn. */
  const matched = useMemo(() => newsForRoster({ roster, news }), [roster, news]);
  const mine = matched.items;
  const hurt = injuredOn(roster);

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
