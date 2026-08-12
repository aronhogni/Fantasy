/* ============================================================
   Dashboard.jsx — FORSIDAN. BADAR DEILDIR, EIN SIDA.

   Notandinn, ordrett: "eg vill ad forsidan se thannig med badum
   deildunum minum syni upplysingar um standings. og start og sit
   advise og hvada leikmenn (ef einhverja a ad pikka upp af weiver)"
   og sidar: "eg mun bara vilja sja Draft og svo dashbordid sem synir
   sit og bench og hvern a ad pikka upp og droppa i stadin".

   ÞRENNT PER DEILD, i theirri rod sem hann nefndi thau:
     1. stada (`standings.js`)
     2. start/sit (`lineup.js` + `weekview.js`)
     3. pikka upp / droppa (`waivers.js`)

   ============================================================
   ÞETTA ER BIRTING OG EKKERT ANNAD
   ============================================================
   Hver einasta tala her kemur ur HREINNI einingu sem er profud ser:
   `standingsFrom`, `myRosterId`, `recordLine`, `optimalLineup`,
   `lineupAdvice`, `weekRows`, `freeAgents`, `pickupAdvice`. Þessi skra
   reiknar EKKERT sjalf — ekki eina rod, ekki eitt threp, ekki eina
   summu. Vaeri formula her gaetu profin adeins profad AFRIT af henni,
   og repo-id ber tvo skjolud tilfelli af thvi hvad thad kostar (sja
   hausinn a `weekview.js`).

   ============================================================
   BADAR DEILDIR I EINU — OG THAD ER ODRUVISI EN ADRIR FLIPAR
   ============================================================
   Draft-flipinn vinnur med VIRKU deildinni; hann er verkfaeri fyrir
   eitt draft. Forsidan er hins vegar yfirlit, og notandinn bad um
   BADAR. Thess vegna lykkjar hun yfir `entries` og notar deildina i
   hverri itrun — hun les EKKI `league`-eiginleikann, thvi hann er
   virka deildin ein. Reglurnar per deild eru gerolikar (10 lid PPR med
   K og DEF a moti 12 lida half-PPR an theirra), svo hver hluti verdur
   ad vera reiknadur ur SINNI deild.

   ============================================================
   HVENAER ER SOTT — OG HVERS VEGNA EKKI VID RAESINGU
   ============================================================
   `tests/sleeper.mjs` kafli 4 krefst NULL Sleeper-kalla vid raesingu:
   "notandinn hefur ekki bedid um thad, og pollun sem enginn kveikti a
   er baedi ovaent og donaleg vid gestgjafann". Sa vordur er ASETTUR og
   hann a ad standa.

   Ad OPNA thennan flipa er hins vegar notanda-adgerd sem thydir
   nakvaemlega "syndu mer stoduna i deildunum minum", svo tha er sott.
   Sjalfgefni flipinn er `draft`, svo raesing snertir thetta ekki.
   Hnappurinn "Refresh" er thar samt, thvi stada breytist a sunnudegi og
   notandinn a ekki ad thurfa ad endurhlada siduna.
   ============================================================ */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import * as D from "./data.js";
import { standingsFrom, myRosterId, recordLine } from "./standings.js";
import { optimalLineup, lineupAdvice, slotsFor } from "./lineup.js";
import { currentWeek, weekContext, weekRows, onByeThisWeek } from "./weekview.js";
import { freeAgents, pickupAdvice } from "./waivers.js";

export default function Dashboard({ entries, rows, meta, schedule, defense, sleeperUser }) {
  /* Eitt svar per deild: `{ rosters, users, error }`. Lyklad a
     deildar-audkenni svo tvaer deildir geti ekki blandast — sama regla
     og `scoped` i `data.js`. */
  const [live, setLive] = useState({});
  const [busy, setBusy] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);

  /* Deildir sem VORU FLUTTAR INN. Sjalfgefni "My league"-hlekkurinn ber
     ekkert Sleeper-audkenni, svo ekkert er til ad saekja fyrir hann —
     og ad reyna vaeri 404 sem las eins og bilun. */
  const real = useMemo(
    () => (entries || []).filter((e) => e && e.imported && e.imported.leagueId),
    [entries]);

  const load = useCallback(async () => {
    if (!real.length) return;
    setBusy(true);
    const out = {};
    /* Allar deildir samhliða — tvaer deildir eru fjogur koll og thad er
       eitt hopp, ekki tvo. */
    await Promise.all(real.map(async (e) => {
      const id = e.imported.leagueId;
      try {
        const [rosters, users] = await Promise.all([
          D.sleeperRosters(id), D.sleeperLeagueUsers(id),
        ]);
        out[id] = { rosters, users, error: null };
      } catch (err) {
        /* BILUN ER SYNILEG, EKKI THOGUL. Deild sem svarar ekki ma ekki
           lesast eins og deild sem er tom — thad fyrra er net, thad
           sidara er stada. */
        out[id] = { rosters: null, users: null, error: String(err.message || err) };
      }
    }));
    setLive(out);
    setFetchedAt(Date.now());
    setBusy(false);
  }, [real]);

  useEffect(() => { load(); }, [load]);

  const week = currentWeek(meta);
  /* Viku-samhengid er NFL-vikan, ekki deildin — reiknad EINU SINNI og
     notad fyrir badar deildir. */
  const ctx = useMemo(
    () => weekContext({ schedule, defense, week }), [schedule, defense, week]);

  if (!real.length) {
    return (
      <div className="panel">
        <h2>Your leagues</h2>
        <div className="note warn">
          <b>No league connected yet.</b> Open the Draft tab and paste your
          Sleeper league link — the standings, start/sit and waiver advice on this
          page all come from your actual league rules, so there is nothing to show
          until one is read.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 10, alignItems: "baseline" }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>
          Your {real.length === 1 ? "league" : `${real.length} leagues`}
        </h2>
        <div className="spacer" />
        {fetchedAt != null && (
          <span className="dim" style={{ fontSize: 11.5 }}>
            read from Sleeper just now
          </span>
        )}
        <button className="act" onClick={load} disabled={busy}>
          {busy ? "Reading…" : "Refresh"}
        </button>
      </div>

      {real.map((e) => (
        <LeagueCard key={e.id} entry={e} rows={rows} live={live[e.imported.leagueId]}
          week={week} ctx={ctx} sleeperUser={sleeperUser} busy={busy} />
      ))}
    </>
  );
}

/* ============================================================
   EIN DEILD
   ============================================================ */
function LeagueCard({ entry, rows, live, week, ctx, sleeperUser, busy }) {
  const league = entry.rules;
  const rosters = live && live.rosters;
  const users = live && live.users;

  /* MINN HOPUR. Þrjar leidir, i thessari rod:
       1. `sleeperUser` — notandanafnid sem var slegid inn i Draft
       2. saetid sem var valid (`sync.slot`) -> `roster_id` um
          `slot_to_roster_id`, sem er thegar leyst i `entry.teams`
       3. ekkert — og tha er thad SAGT, ekki giskad
     Leid 2 er astaedan fyrir thvi ad `entry.teams` er vistad: notandinn
     smellti a lidid sitt i draft-flipanum og thad svar a ad gilda hér
     lika. */
  const mineId = useMemo(() => {
    const direct = myRosterId({ rosters, users, userId: sleeperUser });
    if (direct != null) return direct;
    const slot = entry.sync && entry.sync.slot;
    if (slot == null) return null;
    const t = (entry.teams || []).find((x) => x.slot === slot);
    if (!t || !t.userId) return null;
    return myRosterId({ rosters, users, userId: t.userId });
  }, [rosters, users, sleeperUser, entry.sync, entry.teams]);

  const table = useMemo(
    () => standingsFrom({ rosters, users, league: entry.imported, userId: sleeperUser }),
    [rosters, users, entry.imported, sleeperUser]);

  /* Hopurinn minn sem RODIR af bordinu. `players` fra Sleeper eru
     audkenni; `rows` eru okkar radir og audkennin ERU Sleeper-audkenni
     (`players.json` er byggd Sleeper-midjad), svo engin nafna-porun. */
  const myRows = useMemo(() => {
    if (!Array.isArray(rosters) || mineId == null) return null;
    const r = rosters.find((x) => x && Number(x.roster_id) === Number(mineId));
    const ids = r && Array.isArray(r.players) ? new Set(r.players.map(String)) : null;
    if (!ids) return null;
    return (rows || []).filter((x) => ids.has(String(x.id)));
  }, [rosters, mineId, rows]);

  const slots = useMemo(() => slotsFor(league), [league]);
  const wr = useMemo(() => weekRows(myRows || [], ctx), [myRows, ctx]);
  const lineup = useMemo(
    () => (myRows && myRows.length ? optimalLineup(wr, slots) : null), [myRows, wr, slots]);
  const advice = useMemo(() => {
    if (!myRows || !myRows.length) return null;
    /* Nuverandi byrjunarlid er OTHEKKT fyrir okkur — Sleeper ber
       `starters` a rostrinum, svo thad er lesid thadan og EKKI giskad.
       An thess er "hvad er ad hja mer" osvaranlegt og tha er birt
       optimal uppstilling eina, sem er onnur spurning. */
    const r = (rosters || []).find((x) => x && Number(x.roster_id) === Number(mineId));
    const cur = r && Array.isArray(r.starters)
      ? r.starters.filter((id) => id && id !== "0").map(String) : null;
    if (!cur || !cur.length) return null;
    return lineupAdvice(cur, wr, slots);
  }, [myRows, rosters, mineId, wr, slots]);

  const fa = useMemo(
    () => freeAgents({ rows, rosters, myRosterId: mineId }), [rows, rosters, mineId]);
  const picks = useMemo(() => {
    if (!fa || fa.pool == null) return null;
    return pickupAdvice({ pool: fa.pool, mine: fa.mine, league, week });
  }, [fa, league, week]);

  const bye = onByeThisWeek(myRows || [], week);

  return (
    <div className="panel">
      <div className="row" style={{ alignItems: "baseline" }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>{entry.name}</h2>
        <span className="dim" style={{ fontSize: 12 }}>
          {league.teams} teams ·{" "}
          {league.scoring === "half-ppr" ? "Half PPR"
            : league.scoring === "standard" ? "Standard" : "PPR"}
          {week != null ? ` · week ${week}` : " · preseason"}
        </span>
      </div>

      {live && live.error && (
        <div className="note warn" style={{ marginTop: 8 }}>
          <b>Sleeper did not answer for this league:</b> {live.error}. Nothing below
          is missing — it was never read. Press Refresh.
        </div>
      )}
      {!live && busy && <div className="dim" style={{ marginTop: 8 }}>Reading…</div>}

      <Standings table={table} mineId={mineId} />
      <StartSit lineup={lineup} advice={advice} bye={bye} week={week}
        myRows={myRows} mineId={mineId} />
      <Waivers fa={fa} picks={picks} league={league} />
    </div>
  );
}

/* ============================================================
   1. STADAN
   ============================================================
   `complete: false` THYDIR AD TAFLAN MA EKKI BIRTAST SEM ROD.
   `standings.js` skilar `rank: null` a ollum og `why` i stadinn thegar
   engir leikjir eru spiladir — og i forleik er thad ASTANDID: hvert
   `wins` og hvert `fpts` er 0 i badum deildum notandans. Tafla sem
   radar tiu lidum 1-10 eftir engum leikjum er TILBUNINGUR MED UTLIT
   MAELINGAR, sem er versta utkoman i thessu repo-i.

   Thess vegna er `why` birt i stad toflunnar, ekki vid hlidina a henni.
   `playoffTeams` er samt birt: thad er deildar-REGLA, ekki maeling.  */
function Standings({ table, mineId }) {
  if (!table || !Array.isArray(table.rows) || !table.rows.length) return null;

  if (!table.complete) {
    return (
      <div style={{ marginTop: 12 }}>
        <Head>Standings</Head>
        <div className="note" style={{ marginTop: 6 }}>
          {table.why}
          {table.playoffTeams != null && (
            <span className="dim"> Top {table.playoffTeams} make the playoffs.</span>
          )}
        </div>
        <div className="chips" style={{ marginTop: 6 }}>
          {table.rows.map((r) => (
            <span key={r.rosterId}
              className={`chip${Number(r.rosterId) === Number(mineId) ? " on" : ""}`}>
              {r.name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <Head>Standings</Head>
      <div className="tablewrap" style={{ marginTop: 6 }}>
        <table className="data">
          <thead>
            <tr className="cols">
              <th className="txt frozen">#</th>
              <th className="txt">Team</th>
              <th>W-L-T</th>
              <th title="Points for">PF</th>
              <th title="Points against">PA</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r.rosterId}
                className={Number(r.rosterId) === Number(mineId) ? "reach-hi" : ""}>
                <td className="txt frozen mono">
                  {r.rank == null ? <span className="null">—</span> : r.rank}
                  {r.inPlayoffs && <span className="good" title="in playoff spot"> ●</span>}
                </td>
                <td className="txt">{r.name}</td>
                <td className="mono">{recordLine(r) || <span className="null">—</span>}</td>
                <td className="mono">{num(r.pointsFor)}</td>
                <td className="mono dim">{num(r.pointsAgainst)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   2. START / SIT
   ============================================================
   TVAER OLIKAR SPURNINGAR OG THAER MA EKKI BLANDA:
     · `optimalLineup` — "hver er besta uppstillingin?"
     · `lineupAdvice`  — "hvad er ad hja MINNI uppstillingu?"
   Sidari spurningin er adeins svaranleg thegar vid VITUM hvad notandinn
   stillti upp, sem kemur ur `starters` a rostrinum. Vitum vid thad ekki
   er birt su fyrri EIN og thad er sagt — ekki latid lesast eins og
    radgjof um skipti.

   `unfilled` og `unknown` eru BIRT. Saeti sem ekki tokst ad fylla er
   upplysing (vantar leikmann, eda allir a bekk meiddir/i frii) og
   leikmadur an spar er a bekk EN THAD ER EKKI DOMUR UM HANN.        */
function StartSit({ lineup, advice, bye, week, myRows, mineId }) {
  if (mineId == null) {
    return (
      <div style={{ marginTop: 14 }}>
        <Head>Start / sit</Head>
        <div className="note warn" style={{ marginTop: 6 }}>
          <b>We do not know which team is yours in this league.</b> Open the Draft
          tab, connect the league and click your team — the slot is remembered, and
          this page uses it. Guessing would put someone else's roster here.
        </div>
      </div>
    );
  }
  if (!myRows || !myRows.length) {
    return (
      <div style={{ marginTop: 14 }}>
        <Head>Start / sit</Head>
        <div className="note" style={{ marginTop: 6 }}>
          Your roster is empty on Sleeper — nothing has been drafted yet, so there
          is no lineup to set. This fills in during the draft.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <Head>Start / sit</Head>
      {week == null && (
        <div className="dim" style={{ fontSize: 11.5, marginTop: 4 }}>
          Preseason — there is no week to project, so this is the season projection
          divided by 17. It is not a weekly number and it does not pretend to be.
        </div>
      )}

      {bye.length > 0 && (
        <div className="note warn" style={{ marginTop: 6 }}>
          <b>{bye.length} on bye in week {week}:</b>{" "}
          {bye.map((r) => `${r.name} (${r.team})`).join(", ")}.
        </div>
      )}

      {advice && advice.swaps && advice.swaps.length > 0 ? (
        <div className="note warn" style={{ marginTop: 6 }}>
          <b>{advice.swaps.length} change{advice.swaps.length > 1 ? "s" : ""} would
            raise your projected points:</b>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {advice.swaps.map((s, i) => (
              <li key={i}>
                Start <b>{s.in && s.in.name}</b> over <b>{s.out && s.out.name}</b>
                {s.gain != null && <span className="good"> (+{s.gain.toFixed(1)})</span>}
                {s.slot && <span className="dim"> at {s.slot}</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : advice ? (
        <div className="note" style={{ marginTop: 6 }}>
          <b>Your lineup is already optimal</b> against these projections — there is
          no change that raises expected points.
        </div>
      ) : (
        <div className="dim" style={{ fontSize: 11.5, marginTop: 6 }}>
          Sleeper has no lineup set for you yet, so this is the best lineup rather
          than a list of corrections.
        </div>
      )}

      {lineup && (
        <div className="row" style={{ marginTop: 8, alignItems: "flex-start", gap: 18 }}>
          <div>
            <div className="dim" style={{ fontSize: 11, marginBottom: 3 }}>
              START · projected <b>{lineup.projected}</b>
            </div>
            {/* ============================================================
                TVEIR EINS DALKAR ERU VERRI EN EINN
                ============================================================
                I FORLEIK er engin vika, engin markadslina og enginn
                motherji — svo `weeklyProjection` hefur ekkert ad laga og
                "Ours" er NAKVAEMLEGA jofn "Sleeper". Tveir eins dalkar
                hlid vid hlid FULLYRDA ad vid vitum eitthvad sem Sleeper
                missir, og su fullyrding er osonn thangad til vikan er til.
                Þetta fannst i profinu: fullyrdingin "tolurnar eru ekki
                eins" fell, og appid var rett — dalkurinn var thad ekki.
                Fra timabilinu eru BADIR birtir og tha er munurinn
                raunverulegur. */}
            <table className="data" style={{ marginTop: 2 }}>
              <thead>
                <tr className="cols">
                  <th className="txt frozen">Slot</th>
                  <th className="txt">Player</th>
                  {week == null ? (
                    <th title="Sleeper's season projection divided by 17. There is no week to adjust to yet, so ours would be the same number.">Proj</th>
                  ) : (
                    <>
                      <th title="Sleeper's own projection, season number divided by 17">Sleeper</th>
                      <th title="Ours: the same number after the team's market line and the opponent defence">Ours</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {lineup.starters.map((s) => (
                  <tr key={s.slot}>
                    <td className="txt frozen dim">{s.slot}</td>
                    <td className="txt">
                      {s.player
                        ? <>{s.player.name} <span className="dim">{s.player.pos}</span></>
                        : <span className="warn">— unfilled</span>}
                    </td>
                    {week == null ? (
                      <td className="mono">
                        {s.player ? <b>{num(s.player.ev)}</b> : <span className="null">—</span>}
                      </td>
                    ) : (
                      <>
                        <td className="mono dim">
                          {s.player ? num(s.player.projSleeper) : <span className="null">—</span>}
                        </td>
                        <td className="mono">
                          {s.player ? <b>{num(s.player.ev)}</b> : <span className="null">—</span>}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="dim" style={{ fontSize: 11, marginBottom: 3 }}>BENCH</div>
            {lineup.bench.length === 0 && <div className="dim" style={{ fontSize: 12.5 }}>—</div>}
            {lineup.bench.slice(0, 10).map((p) => (
              <div key={p.id} style={{ fontSize: 12.5 }} className="dim">
                {p.name} {p.pos}
                {p.bye ? <span className="warn"> bye</span>
                  : p.ev != null ? ` · ${p.ev.toFixed(1)}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {lineup && week != null && (
        <div className="dim" style={{ fontSize: 11.5, marginTop: 5 }}>
          <b>Sleeper</b> is their projection, season number over 17.{" "}
          <b>Ours</b> is that same number adjusted by the team's implied total from
          the betting line and the opponent's defence against the position —{" "}
          <b>measured</b> at 5.8% of the available gap (t = 4.33, 7 of 7 seasons).
          It has never run on a live week, so treat week 1 as its first real test.
        </div>
      )}

      {lineup && lineup.unknown && lineup.unknown.length > 0 && (
        <div className="dim" style={{ fontSize: 11.5, marginTop: 6 }}>
          {lineup.unknown.length} on your roster have no projection, so they are
          benched here. That is missing data, not a verdict on them.
        </div>
      )}
    </div>
  );
}

/* ============================================================
   3. PIKKA UPP / DROPPA
   ============================================================
   `pool == null` THYDIR "VID VITUM EKKI HVERJIR ERU TEKNIR" og thad ma
   ALDREI lesast eins og "enginn er tekinn" — annars vaeri hér listi sem
   bydur ther 300 leikmenn sem allir eru i eigu einhvers. `waivers.js`
   skilar `null` af theirri astaedu og hér er thad SAGT.

   TOMUR LISTI ER GILT SVAR og hann er birtur sem svar, ekki sem tomt
   svaedi: verkfaeri sem finnur ALLTAF skipti er gagnslaust.

   `confident: false` er MERKT. Thad er ekki likindatala — thad thydir
   ad eitt inntakid se utan thess sem var maelt (`minGain` er ekki
   maeld tala, hun er varfaerid golf).                                */
function Waivers({ fa, picks, league }) {
  return (
    <div style={{ marginTop: 14 }}>
      <Head>Waiver wire</Head>

      {(!fa || fa.pool == null) ? (
        <div className="note warn" style={{ marginTop: 6 }}>
          <b>Rosters were not read, so the free-agent pool is unknown.</b> This is
          deliberately blank rather than a list of everyone — most of those players
          are on someone's roster, and a list that ignores that is worse than none.
        </div>
      ) : fa.mine == null ? (
        /* Vitum ekki hvada lid er mitt -> engin skipti eru reiknanleg.
           Adur sagdi thetta "nobody beats anyone on your roster", sem er
           fullyrding um hop sem vid hofdum ekki. */
        <div className="note warn" style={{ marginTop: 6 }}>
          <b>{fa.pool.length} free agents</b>, but we do not know which team is
          yours, so there is nothing to compare them against. Connect the league in
          the Draft tab and click your team.
        </div>
      ) : fa.mine.length === 0 ? (
        /* ============================================================
           FYRIR DRAFT ER ENGINN WAIVER-LISTI — OG THAD SAST A SKJANUM
           ============================================================
           Adur stod hér "Nobody on waivers beats anyone on your roster"
           meðan hopurinn var TOMUR og allir 1.043 leikmenn voru lausir.
           Su setning er FULLYRDING um samanburd sem var aldrei gerdur:
           hun les eins og yfirveguð nidurstada ("vid skodudum, thad er
           ekkert") thegar sannleikurinn er "thad er ekkert til ad skoda
           enn". Talan 1.043 var rett og RAMMINN var rangur.

           Start/sit-hlutinn hafdi thegar retta orðalagið fyrir sama
           astand; waiver-hlutinn hafdi thad ekki. Fannst med thvi ad
           HORFA A SIDUNA, ekki i talningu.                            */
        <div className="note" style={{ marginTop: 6 }}>
          <b>Nothing drafted yet, so there is no waiver wire.</b> All{" "}
          {fa.pool.length} players are still unowned — that is the draft pool, not a
          list of pickups. This becomes useful once the season starts and rosters
          have holes in them.
        </div>
      ) : (
        <>
          <div className="dim" style={{ fontSize: 11.5, marginTop: 4 }}>
            {fa.pool.length} free agents · {fa.rosteredCount} rostered
            {fa.unknownRostered > 0 && (
              <span> · {fa.unknownRostered} rostered player
                {fa.unknownRostered > 1 ? "s are" : " is"} outside our board
                {fa.myUnknown > 0 ? `, ${fa.myUnknown} of them yours` : ""}</span>
            )}
          </div>

          {picks && picks.length > 0 ? (
            <div className="tablewrap" style={{ marginTop: 6 }}>
              <table className="data">
                <thead>
                  <tr className="cols">
                    <th className="txt frozen">Add</th>
                    <th className="txt">Drop</th>
                    <th title="Gain in value over replacement, across the rest of the season">Gain</th>
                    <th className="txt">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {picks.slice(0, 6).map((p, i) => (
                    <tr key={i}>
                      <td className="txt frozen">
                        {p.add.name} <span className="dim">{p.add.pos}</span>
                      </td>
                      <td className="txt dim">
                        {p.drop.name} <span className="dim">{p.drop.pos}</span>
                      </td>
                      <td className="mono">
                        {p.gain == null ? <span className="null">—</span>
                          : <b className={p.confident ? "good" : ""}>+{p.gain.toFixed(1)}</b>}
                      </td>
                      <td className="txt dim" style={{ whiteSpace: "normal", maxWidth: 420 }}>
                        {(p.why || []).map((w) => w.text).join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="note" style={{ marginTop: 6 }}>
              <b>Nobody on waivers beats anyone on your roster.</b> That is the
              answer, not an empty screen — doing nothing is usually right, and a
              tool that always finds a move is useless.
            </div>
          )}

          {picks && picks.some((p) => !p.confident) && (
            <div className="dim" style={{ fontSize: 11.5, marginTop: 5 }}>
              Rows not in green rest on at least one input that was never measured
              (the minimum-gain floor is a conservative guess, not a fitted number),
              so treat those as a nudge rather than a recommendation.
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- smaatriði ---------- */
function Head({ children }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: ".7px", textTransform: "uppercase",
                  color: "var(--dimmer)", fontWeight: 600 }}>
      {children}
    </div>
  );
}

/** NULL ER EKKI NULL: vantandi tala er "—" og grá, ekki 0. */
function num(v) {
  if (v == null || !Number.isFinite(Number(v))) return <span className="null">—</span>;
  return Number(v).toFixed(1);
}
