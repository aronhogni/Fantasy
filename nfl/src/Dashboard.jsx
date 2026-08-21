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
import { currentWeek, weekContext, weekRows, onByeThisWeek,
         weeklyEdgeNote, dstStream, dstStreamNote,
         compareOppImplied } from "./weekview.js";
import { freeAgents, pickupAdvice } from "./waivers.js";
import { newsForRoster, injuredOn } from "./newsmatch.js";

export default function Dashboard({ entries, rows, meta, schedule, defense, news,
                                    sleeperUser }) {
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
  /* `season` ER SKYLDA, EKKI SKRAUT: `defense.json` ber sjo timabil undir
     sama lidi og stodu, svo an arsins var uppflettingin "sidasta rod i
     skranni vinnur" (sja skjolun vid `weekContext`). */
  const ctx = useMemo(
    () => weekContext({ schedule, defense, week, season: meta && meta.season }),
    [schedule, defense, week, meta]);

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
          week={week} ctx={ctx} news={news} sleeperUser={sleeperUser} busy={busy} />
      ))}
    </>
  );
}

/* ============================================================
   EIN DEILD
   ============================================================ */
function LeagueCard({ entry, rows, live, week, ctx, news, sleeperUser, busy }) {
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

  /* ============================================================
     DST — BIRT ADEINS I DEILD SEM BYRJAR VORN
     ============================================================
     Notandinn spilar i TVEIMUR deildum og adeins onnur ber `DEF` i
     `roster_positions`. Ad syna listann i badum vaeri rad um saeti sem
     er ekki til, og su tegund havada er nakvaemlega thad sem
     keeper-vidvorunin i `sleeper-league.js` kostadi: kassi sem kviknar
     a venjulegri deild er lærður sem eitthvad sem madur hunsar, og tha
     er raunverulegt rad jafn gagnslaust og ekkert.                  */
  const dstTeams = useMemo(
    () => (rows || []).filter((r) => r && r.pos === "DST")
      .map((r) => ({ team: r.team || r.id, name: r.name })), [rows]);
  const dstTaken = useMemo(() => {
    if (!Array.isArray(rosters)) return null;   // NULL, ekki tomt mengi
    const s = new Set();
    for (const r of rosters) {
      for (const p of (r && r.players) || []) {
        if (dstTeams.some((t) => t.team === String(p))) s.add(String(p));
      }
    }
    return s;
  }, [rosters, dstTeams]);
  const myDst = useMemo(() => {
    const r = (myRows || []).find((x) => x && x.pos === "DST");
    return r ? (r.team || r.id) : null;
  }, [myRows]);
  const dst = useMemo(() => (league.starters && league.starters.DST
    ? dstStream({ ctx, teams: dstTeams, taken: dstTaken, mine: myDst }) : null),
    [ctx, dstTeams, dstTaken, myDst, league.starters]);

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
      <RosterNews roster={myRows} news={news} />
      {/* `defSeason`/`defRows` FARA MED: setningin "weeks already played
          only" er birt HER inni, svo hun verdur ad geta sagt hvada ar
          vornin kom ur — eda ad hun se ekki til. `ctx` sjalf er ekki send
          (thetta er birting, ekki reikningur). */}
      <StartSit lineup={lineup} advice={advice} bye={bye} week={week}
        myRows={myRows} mineId={mineId} scoring={league.scoring}
        defSeason={ctx ? ctx.defSeason : null} defRows={ctx ? ctx.defRows : null}
        season={ctx ? ctx.seasonAsked : null} />
      <DstStream dst={dst} rostersRead={Array.isArray(rosters)} />
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
   1b. MEIDSLI OG FRETTIR A HOPNUM
   ============================================================
   Notandinn: „this season stats verda mjog relevant … i sambandi vid
   frettir sem utskyra thá stats".

   ÞETTA ER SAMHENGI OG ÞAÐ ER MERKT SEM SAMHENGI. Fréttir eru BIRTAR,
   EKKI TULKADAR — sama regla og i `MyTeam.jsx`: „tolid les thaer ekki
   og breytir engri tolu vegna theirra; ad lata malgreiningu faera spa
   vaeri omaeld tala i reit". Ekkert her hreyfir `proj`, `vbd` ne rod.

   MEIDSLI: opinber Sleeper-status raedur tiltaekileika, PUNKTUR. Allt
   annad ma auðga hann, aldrei skipta honum ut (FPL-reglan, sem gildir
   her lika).

   NAFNA-BAKLEIDIN ER SYND. `newsmatch.js` telur hvad var parad a
   audkenni og hvad a nafni; hafi nafna-parun verid notud er thad SAGT,
   thvi „thogul rong parun er verri en engin" (BSD-liða-vorpunin, thar
   sem fuzzy felldi Man United inn i Man City).                       */
function RosterNews({ roster, news }) {
  const m = useMemo(() => newsForRoster({ roster, news }), [roster, news]);
  const hurt = useMemo(() => injuredOn(roster || []), [roster]);
  if (!roster || !roster.length) return null;
  if (!hurt.length && !m.items.length) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <Head>Injuries &amp; news</Head>

      {hurt.length > 0 && (
        <div className="note warn" style={{ marginTop: 6 }}>
          <b>{hurt.length} flagged on your roster:</b>{" "}
          {hurt.map((r) => `${r.name} (${r.injury})`).join(", ")}.
          <span className="dim"> Official status decides availability —
            everything else may inform it, never replace it.</span>
        </div>
      )}

      {m.items.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {m.items.slice(0, 4).map((a) => (
            <div key={a.id} style={{ fontSize: 12.5, marginBottom: 3 }}>
              <span className="dim">{a.who}</span>{" "}
              <a href={a.url} target="_blank" rel="noreferrer"
                style={{ color: "var(--text)" }}>{a.headline}</a>
              {a.matchedBy === "name" && (
                <span className="warn" title="Matched on name, not on id — this player carries no espnId"> ·
                  name match</span>
              )}
            </div>
          ))}
          <div className="dim" style={{ fontSize: 11.5, marginTop: 3 }}>
            {m.items.length} of the latest stories mention someone on your roster
            {m.viaName > 0 && <span className="warn"> · {m.viaName} matched on
              name rather than id</span>}
            {m.ambiguous > 0 && <span className="warn"> · {m.ambiguous} skipped as
              ambiguous</span>}.
            <b> News is shown, never interpreted</b> — nothing here moves a
            projection or a rank.
          </div>
        </div>
      )}
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
function StartSit({ lineup, advice, bye, week, myRows, mineId, scoring,
                    defSeason, defRows, season }) {
  const edge = useMemo(() => weeklyEdgeNote(scoring), [scoring]);
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

      {/* ============================================================
          SVIDID HET `swaps` OG ER TIL HVERGI — EINA EIGINLEIKINN SEM
          NOTANDINN BAD UM MED NAFNI HAFDI ALDREI VIRKAD
          ============================================================
          `lineupAdvice` skilar `{ optimal, changes, isOptimal }`.
          Hér stod `advice.swaps`, sem er `undefined` i hverri einustu
          teikningu — svo sanna greinin var ONAANLEG og HVER uppstilling
          fekk skilabodin "already optimal … there is no change that
          raises expected points". `git log -S'swaps'` segir ad thad hafi
          verid svona i FYRSTA commit-i forsidunnar.

          Beidnin var ordrett: "eg vill ekki fa stig a bekk sem eru
          fleiri en hja manni sem er ad spila". Verkfaerid svaradi henni
          alltaf med "allt er i lagi". Þad er verri utkoma en ad hafa
          engan kassa: kassi sem segir alltaf "i lagi" er ekki thogull,
          hann LYGUR.

          Maelt i jsdom med raunverulegu bordi og fimm verstu monnum af
          tiu i byrjunarlidi: skjarinn sagdi "already optimal" medan
          `lineupAdvice` a SAMA hop skilaði `changes.length = 5`,
          `isOptimal = false` og heildarabata **+29,0** ("start Gibbs
          over Kenneth Walker +21,2").

          THRJU ATRIDI SEM SVIDA-NAFNID FALDI:

          1. `isOptimal` ER NU LESID. Þad var med NULL lesendur i ollu
             `src/` — modulinn kvad upp dominn og enginn hlustadi. Þad er
             `isOptimal` sem stjornar greininni, EKKI `changes.length`:
             modulnum ber ad segja hvort uppstillingin se rett, ekki
             vidmotinu ad leida thad ut ur lengd fylkis. (Thau eru jofn
             ad byggingu — `changes` ber eina rod per `shouldStart` og
             `isOptimal` er `shouldStart.length === 0` — og `dashboard.mjs`
             kafli 3c fullyrdir ad thau lesist EINS a skjanum.)

          2. `out: null` ER LOGLEG ROD OG MA EKKI VERDA TOMT NAFN.
             Ef saetið sem losnar hefur ENGAN gjaldgengan mann i
             byrjunarlidinu (t.d. thu attir engan QB i uppstillingu) er
             thetta ekki SKIPTI heldur INNKOMA i TOMT saeti. Gamla
             utgafan hefdi teiknad "Start X over " med berum
             feitletrudum tomum reit — sem les eins og bilun.

          3. `gain: null` MED `out` ER LIKA LOGLEGT: sa sem situr hefur
             enga spa (`ev == null`), svo munurinn er OTHEKKTUR, ekki
             null. Ómæld tala fær ekki reit (CLAUDE.md 8) — thvi er
             ASTAEDAN sogd i stad tolu. Og engin NY tala er reiknud hér:
             abatinn af innkomu i tomt saeti er `in.ev`, en `lineup.js`
             skilar honum ASETT sem `null`, og vidmotid ma ekki finna
             upp tolu sem hreina rokfraedin hafnadi.              */}
      {!advice ? (
        <div className="dim" style={{ fontSize: 11.5, marginTop: 6 }}>
          Sleeper has no lineup set for you yet, so this is the best lineup rather
          than a list of corrections.
        </div>
      ) : advice.isOptimal ? (
        <div className="note" style={{ marginTop: 6 }}>
          <b>Your lineup is already optimal</b> against these projections — there is
          no change that raises expected points.
        </div>
      ) : (
        <div className="note warn" style={{ marginTop: 6 }}>
          <b>{advice.changes.length} change{advice.changes.length > 1 ? "s" : ""} would
            raise your projected points:</b>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {advice.changes.map((c, i) => (
              <li key={i}>
                {c.out ? (
                  <>
                    Start <b>{c.in.name}</b> over <b>{c.out.name}</b>
                    {c.gain != null
                      ? <span className="good"> (+{c.gain.toFixed(1)})</span>
                      : <span className="warn"> (gain unknown — {c.out.name} has
                          no projection)</span>}
                    {c.slot && <span className="dim"> at {c.slot}</span>}
                  </>
                ) : (
                  <>
                    Start <b>{c.in.name}</b> — your <b>{c.slot}</b> slot is empty and
                    no one you are starting is eligible for it, so this is not a swap
                    but a player added to an empty slot.
                  </>
                )}
              </li>
            ))}
          </ul>
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
        /* ============================================================
           TALAN ER PER STIGAGJOF, EKKI EIN TALA FYRIR ALLAR DEILDIR
           ============================================================
           Adur stod "maelt 5,8% (t=4,33, 7/7)" a BADUM deildum. Sú tala
           er PPR-talan. `mktweek-lab` maeldi incumbent-inn i ollum
           thremur snidum 12.8.2026 — thad hafdi aldrei verid gert — og
           i half-PPR er hun **3,199% med t=1,908 og adeins 5 af 7
           timabilum jakvaed**, sem er EKKI marktaekt.

           Notandinn spilar i baðum. Ad bera PPR-toluna a half-deildina
           var ad lata omarktaeka tolu lesast eins og maelda. */
        <div className="dim" style={{ fontSize: 11.5, marginTop: 5 }}>
          <b>Sleeper</b> is their projection, season number over 17.{" "}
          <b>Ours</b> is that same number adjusted by the team's implied total from
          the betting line and the opponent's defence against the position.{" "}
          <span className={edge.significant ? "good" : "warn"}>{edge.text}</span>{" "}
          It has never run on a live week, so treat week 1 as its first real test.{" "}
          {/* ============================================================
              "WEEKS ALREADY PLAYED ONLY" VAR PROSA SEM KODINN STODST EKKI
              ============================================================
              `edge.text` endar a theirri setningu. Hun var OSONN i viku 1:
              `defense.json` ber engar radir fyrir thetta timabil fyrr en
              fyrsta vikan er spiluð, og gamla uppflettingin (an ars) tok
              tha SIDUSTU rod i skranni — vorn fyrra timabils i heilu lagi.
              Nu er kortid tomt og talan ber ENGAN varnarlid; thad er
              rettara, en thad ma ekki vera thogult heldur. Sama regla og
              thrjar tegundir af engu i DST-listanum. */}
          {defSeason == null
            ? <span className="warn">No defence-vs-position rows exist for{" "}
                {season != null ? season : "this season"} yet, so &quot;Ours&quot;
                carries the betting line only — the defence term is absent, not
                zero. It appears once a week has been played.</span>
            : <span className="dim">Defence is from {defSeason} ({defRows}{" "}
                team-position rows).</span>}
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
/* ============================================================
   3b. VORNIN — MATCHUP-LISTI, EKKI ROD
   ============================================================
   ÞETTA SAETI VAR ORADLAGT. Deildin byrjar vorn og appid sagdi ekkert
   um hana; eitt af niu byrjunarsaetum var utan tolunnar.

   OG THAD SEM ER BIRT ER THAD SEM MAELDIST, EKKI THAD SEM VAR BEDID UM.
   Fyrsta beidnin var „rod a vornunum". Labid (`scripts/dst-lab.mjs`)
   maeldi hana FYRST og hun fell: +0,77 stig a viku (t=1,16, 3/6 ar) og
   **-0,82 medal theirra sem eru raunverulega lausir** (0/6 ar).
   Streymi eftir motherja gefur +3,82 (t=5,75, 6/6). Þess vegna er
   thetta VIKULEGUR LISTI og thess vegna er ENGIN season-rod her — hun
   vaeri omaeld tala vid hlidina a maeldri, sem er versta utkoman i
   thessu repo-i.

   `Gain` er ekki birt per vorn og thad er asett: labid maelir hvad
   EFSTI kosturinn skorar umfram medaltal, ekki hvad HVER vorn skorar.
   Ad hengja +3,82 a hverja rod vaeri ad selja hopmaelingu sem
   einstaklingsspa.                                                  */
function DstStream({ dst, rostersRead }) {
  /* Atttin er STYRD OG SYNILEG. Sjalfgefid er „laegst best" thvi thad
     er tillagan; hitt er til svo notandinn geti sed versta leikinn
     lika — og svo ad null-medferdin se profanleg i BADAR attir, sem er
     eina leidin til ad vita ad hun se rett. */
  const [dir, setDir] = useState("asc");
  if (!dst) return null;
  const note = dstStreamNote();
  const rows = dst.rows.slice().sort((a, b) => compareOppImplied(a, b, dir) ||
    String(a.team).localeCompare(String(b.team)));

  return (
    <div style={{ marginTop: 14 }}>
      <Head>Defence this week</Head>

      {dst.why ? (
        <div className="note" style={{ marginTop: 6 }}>{dst.why}</div>
      ) : (
        <div className="dim" style={{ fontSize: 11.5, marginTop: 4 }}>
          Start the defence facing the lowest expected opponent score
          {dst.best.length > 0 && <>: <b>{dst.best.map((r) => r.team).join(" · ")}</b></>}
        </div>
      )}
      {!rostersRead && (
        <div className="note warn" style={{ marginTop: 6 }}>
          <b>Rosters were not read</b>, so we cannot say which defences are already
          owned. Every row below is shown as if it were free, which it is not.
        </div>
      )}

      <div className="tablewrap" style={{ marginTop: 6 }}>
        <table className="data">
          <thead>
            <tr className="cols">
              <th className="txt frozen">Defence</th>
              <th className="txt">Opponent</th>
              <th
                title="Points the opponent is expected to score, from the betting line (total and spread). Lower is better for your defence."
                style={{ cursor: "pointer" }}
                onClick={() => setDir(dir === "asc" ? "desc" : "asc")}>
                Opp. pts {dir === "asc" ? "↑" : "↓"}
              </th>
              <th className="txt">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.team} className={r.mine ? "reach-hi" : ""}>
                <td className="txt frozen">
                  {r.team} <span className="dim">{r.name}</span>
                </td>
                <td className="txt dim">
                  {/* BYE ER EKKI „ANDSTAEDINGUR OKUNNUR". Lid i frii
                      spilar ekki; lina sem er ekki opnud thydir ad vid
                      vitum thad ekki enn. Tvo olik svor, tvo olik ord. */}
                  {r.bye ? "bye" : r.opp}
                </td>
                <td className="mono">
                  {r.oppImplied == null
                    ? <span className="null">—</span>
                    : <b className={r.rank != null && r.rank <= 5 ? "good" : ""}>
                        {r.oppImplied.toFixed(1)}
                      </b>}
                </td>
                <td className="txt dim">
                  {r.mine ? "yours" : r.taken ? "rostered" : "free"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dim" style={{ fontSize: 11, marginTop: 6, whiteSpace: "normal" }}>
        {note.text}
      </div>
    </div>
  );
}

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
                    {/* HEITID SEGIR HVAD TALAN ER, ORDRETT UR MAELINGUNNI.
                        Þad sagdi "across the rest of the season", sem er
                        NAKVAEMLEGA su mynt sem `WAIVER_CAL.currency.note`
                        segir ad se **maeld betri en ekki nothaef** (+13,2
                        stig/tímabil en tharf vikurnar sem eftir eru).
                        Talan sem er birt er SEASON VBD — og hun stendur
                        vid hlidina a vikulegum tolum a stærd 4-7, svo
                        `+336` las eins og vikuleg spa hefdi sprungid.
                        Rong mynt i tooltip er ekki ordalag: hun laetur
                        notandann bera saman tvaer olikar staerdir. */}
                    <th title="Gain in season-long value over replacement for this league — NOT weekly points, and not rest-of-season. See Model lab.">Gain</th>
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

          {/* ============================================================
              FOTNOTAN NEFNDI RANGA ORSOK — LAGFAERT 14.8.2026
              ============================================================
              Hér stod ad rodir sem eru ekki graenar hvili "partly on the
              gain floor (a conservative guess)". Þad er OSATT um hverja
              einustu rod sem er a skjanum: `pickupAdvice` siar eftir
              golfinu ADUR en rod verdur til (`gain < floor -> continue`),
              svo HVER birt rod hefur thegar stadid thad — og `confidenceOf`
              profar thad viljandi ekki, thvi skilyrdi sem getur ekki
              brugdist er ekki skilyrdi.

              Astaedan er ALLTAF ein af threm: undir varamanns-threpi,
              ESPN-bakfall i stad Sleeper-spar, eda ekki heill. Og hun er
              thegar SOGD i `why` per rod, svo fotnotan a ad segja HVERJAR
              thaer eru — ekki nefna tolu sem kemur thessu ekki vid.

              Sami flokkur og fals-vidvorunin i `edgeSentence`: vidvorun sem
              nefnir orsok sem notandinn getur sannad ranga kennir honum ad
              hunsa vidvaranir.                                          */}
          {picks && picks.some((p) => !p.confident) && (
            <div className="dim" style={{ fontSize: 11.5, marginTop: 5 }}>
              Rows not in green fail one of the three inputs behind the gain: the
              player projects below your league's replacement level, his projection is
              the ESPN fallback rather than Sleeper's own, or he is not fully
              available. Each such row says which, in Why. The minimum-gain floor is
              not one of them — every row here has already cleared it.
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
