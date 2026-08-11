/* ============================================================
   DraftBoard.jsx — verkfaerid sem er notad i agust.

   THRJAR HUGMYNDIR SEM GERA THETTA AD MEIRU EN LISTA:

   1. THREPIN, EKKI RODIN, RADA AKVORDUNINNI. Spurningin vid hvert
      val er aldrei "hver er bestur" heldur "hver er bestur SEM VERDUR
      FARINN THEGAR ROÐIN KEMUR AFTUR AD MER". Thess vegna er talid
      hve margir eru eftir i hverju threpi og hve morg val eru thangad
      til thu velur naest.

   2. BEIN TENGING VID SLEEPER. Sleeper-API-id sendir CORS-hausa svo
      vafrinn ma kalla thad beint. Thu limir inn draft-slodina, appid
      pollar `/draft/{id}/picks` og strikar ut tha sem eru farnir —
      i beinni, an thess ad thu skrair neitt handvirkt.

   3. SKORPU RODIN VID HLIDINA A SAMSTEYPUNNI. `sharpDelta` syar
      hvad thau bord sem MAELDUST BETUR EN HANDAHOF i fyrra segja
      umfram medaltalid. Thad er eina rodin i appinu sem hefur maelt
      umbod.
   ============================================================ */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as D from "./data.js";
import { recommend, MEASURED } from "./advice.js";
import { signed } from "./columns.js";

export default function DraftBoard({ rows, meta, league, season, accuracy, kickers }) {
  const [taken, setTaken] = useState(() => new Set(D.loadState("taken", [])));
  const [myPicks, setMyPicks] = useState(() => new Set(D.loadState("myPicks", [])));
  const [posFilter, setPosFilter] = useState([]);
  const [sync, setSync] = useState(() => D.loadState("sync", { draftId: "", slot: null }));

  /* ============================================================
     VISTUN FYLGIR ASTANDINU, EKKI KOLLUNUM
     ============================================================
     Adur var `persist(t, m)` kallad i hverri adgerd med THEIM mengjum
     sem adgerdin bjó til. Thad virkar adeins ef adgerdin veit rett
     astand — og pollunin gerdi thad EKKI (sja `onPicks`). Nidurstadan
     var ad afturforin var ekki bara syn heldur VISTUD.

     Effect a mengin sjalf getur ekki skeikad: hvad sem breytir theim,
     og hvadan sem thad kemur, er thad SIDASTA astand sem er skrifad. */
  useEffect(() => { D.saveState("taken", [...taken]); }, [taken]);
  useEffect(() => { D.saveState("myPicks", [...myPicks]); }, [myPicks]);

  /* Bordid radar THEIM SEM A-RANKING NAER YFIR. K og DST eru utan
     hennar (sja notu i build.js) og eru syndir ser nedar. */
  const available = useMemo(
    () => rows.filter((r) => r.aRank != null && !taken.has(r.id))
              .sort((a, b) => a.aRank - b.aRank),
    [rows, taken]);
  const kdst = useMemo(
    () => rows.filter((r) => r.aRank == null && r.vbd != null && !taken.has(r.id))
              .sort((a, b) => b.vbd - a.vbd),
    [rows, taken]);

  const shown = useMemo(
    () => (posFilter.length ? available.filter((r) => posFilter.includes(r.pos)) : available),
    [available, posFilter]);

  /* Hve margir eru eftir i hverju threpi per stodu.
     NOTAR `posTier`, EKKI `tier`: threp thvert a stodur svara ekki
     spurningunni "hve margir RB1 eru eftir" — thau byrjudu QB-listann
     i threpi 7 og TE i threpi 6, sem er merkingarlaust her. */
  const scarcity = useMemo(() => {
    const m = {};
    for (const r of available) {
      const k = r.pos;
      m[k] = m[k] || { tiers: new Map(), total: 0 };
      m[k].total++;
      if (r.posTier != null) m[k].tiers.set(r.posTier, (m[k].tiers.get(r.posTier) || 0) + 1);
    }
    return m;
  }, [available]);

  const myRoster = useMemo(
    () => rows.filter((r) => myPicks.has(r.id)), [rows, myPicks]);

  /* ============================================================
     ALLAR BREYTINGAR ERU FOLL AF FYRRA ASTANDI, EKKI AF MYND AF THVI
     ============================================================
     ÞETTA VAR ALVARLEGASTA VILLAN I nfl/ OG HUN TOK FIMM SEKUNDUR AD
     BIRTAST: notandinn smellti, sá rett, og sidan hvarf thad.

     `onPicks` var orva-fall sem var buid til i hverri teikningu og
     lokadist um `taken`/`myPicks` EINS OG THAU VORU THA. Pollunar-
     effectid ber `[live, sync.draftId, sync.slot, byId]` i deps — EKKI
     `onPicks` — svo `setInterval` helt afram ad kalla GOMLU utgafuna,
     og vid hvern tikk var mengid endurbyggt ur urveltri mynd:

         const t = new Set([...taken, ...ids]);   // `taken` er gamalt

     Handvirkt val sem kom EFTIR ad effectid keyrdi var thvi ekki i
     `taken` og hvarf — og `persist` skrifadi afturforina, svo hun lifdi
     endurhledslu.

     Foll af fyrra astandi geta ekki skeikad thannig: React gefur theim
     alltaf NUVERANDI gildi, oháð thvi hvenaer lokunin vard til. Thess
     vegna er `onPicks` lika `useCallback` med tomum deps — hun tharf
     ekki ad endurnyjast, og tha getur ekkert i henni orðið gamalt.

     Vordur: `tests/sleeper.mjs` kafli 2c bidur raunverulegar 5,5
     sekundur og krefst thess ad handvirkt val lifi pollunar-tikk. */
  const onPicks = useCallback((ids, mineIds) => {
    setTaken((prev) => new Set([...prev, ...ids]));
    setMyPicks((prev) => new Set([...prev, ...mineIds]));
  }, []);

  const take = (r, mine) => {
    setTaken((prev) => new Set(prev).add(r.id));
    if (mine) setMyPicks((prev) => new Set(prev).add(r.id));
  };
  const undo = (r) => {
    setTaken((prev) => { const t = new Set(prev); t.delete(r.id); return t; });
    setMyPicks((prev) => { const m = new Set(prev); m.delete(r.id); return m; });
  };
  const reset = () => { setTaken(new Set()); setMyPicks(new Set()); };

  return (
    <>
      <SleeperSync sync={sync} setSync={(s) => { setSync(s); D.saveState("sync", s); }}
        season={season} rows={rows} taken={taken}
        onPicks={onPicks} />

      <NextPick available={available} roster={myRoster} taken={taken}
        league={league} sync={sync} />

      <ScarcityBar scarcity={scarcity} league={league} />

      <div className="panel">
        <div className="row">
          <div className="chips">
            {["QB", "RB", "WR", "TE", "K", "DST"].map((p) => (
              <button key={p} className={`chip${posFilter.includes(p) ? " on" : ""}`}
                onClick={() => setPosFilter((f) =>
                  f.includes(p) ? f.filter((x) => x !== p) : [...f, p])}>{p}</button>
            ))}
            {posFilter.length > 0 && (
              <button className="chip" onClick={() => setPosFilter([])}>clear</button>
            )}
          </div>
          <div className="spacer" />
          <span className="dim" style={{ fontSize: 12.5 }}>
            {taken.size} drafted · {myPicks.size} yours
          </span>
          <button className="act" onClick={reset} disabled={!taken.size}>Reset board</button>
        </div>

        {!meta.sharpMeasured && (
          <div className="note warn">
            <b>Sharp rankings are not available.</b> The accuracy measurement has not
            run, so every source is weighted equally. Columns marked <i>Sharp</i> are
            blank rather than showing an unmeasured number that would look measured.
          </div>
        )}
      </div>

      <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
        <div className="grow">
          <BoardTable rows={shown.slice(0, 200)} onTake={take} taken={taken} />
        </div>
        <MyRoster roster={myRoster} league={league} onUndo={undo} />
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <h2>Kickers and defences</h2>
        <div className="sub">
          Listed separately, and last, on purpose.
        </div>
        <div className="note warn">
          <b>Every simulation in this app excluded them.</b> The ordering that beats
          ADP and Sleeper was measured on quarterbacks, backs, receivers and tight
          ends only, so putting a defence into that list would be an unmeasured number
          sitting next to measured ones. Value over replacement would place the top
          defence around pick 77 — nobody drafts that way, because defences swing
          wildly week to week and can be swapped every Tuesday, which the projection
          cannot see.
        </div>
        {/* ============================================================
            EINA MAELDA REGLAN UM THESSI TVO SAETI
            ============================================================
            A-Ranking radar theim ekki og a ekki ad gera thad. En thogn
            er ekki hlutleysi thegar akvordunin er ohjakvaemileg —
            notandinn VERDUR ad taka spyrnumann. `kicker-lab.mjs` maeldi
            tvaer reglur (adeins tvaer, svo engin thung leidretting fyrir
            fjolda samanburda thurfi) og onnur theirra virkar. */}
        {kickers && kickers.rules && (
          <div className="note" style={{ marginTop: 10 }}>
            <b>If you want a rule for the kicker: take one of last season's top five.</b>
            {" "}Measured on {kickers.seasons.length} seasons — worth{" "}
            <b>{kickers.rules.top5.gain > 0 ? "+" : ""}{kickers.rules.top5.gain} points
            over a season</b> ({(kickers.rules.top5.gain / 17).toFixed(2)} a week) against
            another starting kicker, positive in {kickers.rules.top5.wins} of{" "}
            {kickers.rules.top5.years} seasons.
            {" "}Picking the kicker on last year's best offence is <b>not</b> worth
            anything ({kickers.rules.bestOffence.gain > 0 ? "+" : ""}
            {kickers.rules.bestOffence.gain} points, {kickers.rules.bestOffence.wins} of{" "}
            {kickers.rules.bestOffence.years} seasons).
            <br /><br />
            Keep the size in mind before spending a pick: a kicker's season carries over
            to the next one barely at all (<b>r = {kickers.persistence.K.r}</b>, against{" "}
            {kickers.persistence.RB.r} for backs and {kickers.persistence.WR.r} for
            receivers), and even with perfect hindsight the gap from the best kicker to
            the twelfth is only {kickers.hindsightGain} points a season —{" "}
            {(kickers.hindsightGain / 17).toFixed(2)} a week. <b>It is a last-round pick.</b>
          </div>
        )}
        <div className="chips">
          {kdst.slice(0, 16).map((r) => (
            <button key={r.id} className="chip" onClick={() => take(r, true)}
              title={`VBD ${r.vbd == null ? "—" : r.vbd.toFixed(1)}`}>
              {r.pos} {r.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ============================================================
   SKORTSTADAN
   ============================================================ */
function ScarcityBar({ scarcity, league }) {
  const order = ["QB", "RB", "WR", "TE"];
  return (
    <div className="panel">
      <h2>Positional scarcity</h2>
      <div className="sub">
        How many players are left in each remaining tier. A tier that is down to its
        last one or two is the reason to reach; a tier with twelve left is the reason
        to wait.
      </div>
      <div className="kpis">
        {order.map((pos) => {
          const s = scarcity[pos];
          if (!s) return null;
          const tiers = [...s.tiers.entries()].sort((a, b) => a[0] - b[0]).slice(0, 4);
          return (
            <div className="kpi" key={pos} style={{ minWidth: 150 }}>
              <div className="k"><span className={`pos ${pos}`}>{pos}</span>
                {" "}{s.total} left</div>
              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                {tiers.map(([t, n]) => (
                  <div key={t} style={{ display: "flex", gap: 6, alignItems: "center",
                    fontSize: 12 }}>
                    <span className="dim" style={{ width: 46 }}>tier {t}</span>
                    <span className="bar" style={{ width: Math.min(72, n * 6) }} />
                    <span className={n <= 2 ? "bad mono" : "mono"}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   BORDID
   ============================================================ */
function BoardTable({ rows, onTake }) {
  return (
    <div className="tablewrap">
      <table className="data">
        <thead>
          <tr className="cols">
            <th className="txt frozen">Player</th>
            <th className="txt">Pos</th>
            <th className="txt">Tm</th>
            <th>Bye</th>
            <th title="Value over replacement in your league">VBD</th>
            <th title="Blended projection">Proj</th>
            <th title="Tier by gaps in VBD">Tier</th>
            <th title="Average draft position in your format">ADP</th>
            <th title="Rounds later the market takes him than our rank. Positive = value.">Value</th>
            <th title="Expert consensus rank">ECR</th>
            <th title="Consensus of only the boards that beat random last year">Sharp Δ</th>
            <th title="2025 points per game">PPG 25</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const brk = i > 0 && rows[i - 1].tier !== r.tier;
            return (
              <tr key={r.id} className={brk ? "tierline" : ""}>
                <td className="txt frozen">
                  {r.name}
                  {r.rookie && <span className="badge" style={{ marginLeft: 6 }}>R</span>}
                  {r.injury && r.injury !== "Active" && (
                    <span className={`badge ${r.injury === "Out" || r.injury === "IR" ? "bad" : "warn"}`}
                      style={{ marginLeft: 6 }}>{r.injury}</span>
                  )}
                </td>
                <td className="txt"><span className={`pos ${r.pos}`}>{r.pos}</span></td>
                <td className="txt dim">{r.team || "—"}</td>
                <td className="mono dim">{r.bye ?? <span className="null">—</span>}</td>
                <td className="mono"><b>{r.vbd?.toFixed(1)}</b></td>
                <td className="mono">{n(r.proj)}</td>
                <td className="mono dim">{r.tier ?? "—"}</td>
                <td className="mono dim">{n(r.adp)}</td>
                <td className={`mono ${r.value > 0.5 ? "good" : r.value < -0.5 ? "bad" : ""}`}>
                  {r.value == null ? <span className="null">—</span> : signed(r.value)}
                </td>
                <td className="mono dim">{r.ecr ?? <span className="null">—</span>}</td>
                <td className={`mono ${r.sharpDelta > 3 ? "good" : r.sharpDelta < -3 ? "bad" : ""}`}>
                  {r.sharpDelta == null ? <span className="null">—</span>
                    : signed(r.sharpDelta, 0)}
                </td>
                <td className="mono">{n(r.lastPpg)}</td>
                <td className="txt" style={{ whiteSpace: "nowrap" }}>
                  <button className="act" style={{ padding: "2px 8px", fontSize: 11.5 }}
                    onClick={() => onTake(r, true)}>mine</button>
                  <button className="act" style={{ padding: "2px 8px", fontSize: 11.5, marginLeft: 4 }}
                    onClick={() => onTake(r, false)}>gone</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const n = (v) => (v == null || !Number.isFinite(v)
  ? <span className="null">—</span> : v.toFixed(1));

/* `signed` bjo hér adur. Hun var flutt i columns.js thvi leikmanna-
   listinn tharf hana lika og erfdi hana ekki — sja notuna thar. */

/* ============================================================
   MITT LID
   ============================================================ */
function MyRoster({ roster, league, onUndo }) {
  const byPos = {};
  for (const r of roster) (byPos[r.pos] = byPos[r.pos] || []).push(r);
  const need = league.starters || {};
  const total = roster.reduce((a, r) => a + (r.proj || 0), 0);

  return (
    <div className="panel" style={{ width: 300, flexShrink: 0 }}>
      <h2>My team</h2>
      <div className="sub">
        {roster.length} picks · {total ? total.toFixed(0) : 0} projected points
      </div>
      {!roster.length && (
        <div className="dim" style={{ fontSize: 12.5 }}>
          Press <b>mine</b> on the board, or connect a Sleeper draft above and it
          fills itself.
        </div>
      )}
      {["QB", "RB", "WR", "TE", "K", "DST"].map((pos) => {
        const list = byPos[pos] || [];
        if (!list.length && !need[pos]) return null;
        return (
          <div key={pos} style={{ marginBottom: 8 }}>
            <div className="dimmer" style={{ fontSize: 10.5, letterSpacing: ".8px",
              textTransform: "uppercase" }}>
              {pos} <span className={list.length < (need[pos] || 0) ? "warn" : ""}>
                {list.length}/{need[pos] || 0}
              </span>
            </div>
            {list.map((r) => (
              <div key={r.id} style={{ display: "flex", gap: 6, alignItems: "center",
                fontSize: 12.5, padding: "1px 0" }}>
                <span className="grow" style={{ overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                <span className="mono dim">{r.proj != null ? r.proj.toFixed(0) : "—"}</span>
                <button className="act" style={{ padding: "0 5px", fontSize: 11 }}
                  onClick={() => onUndo(r)}>✕</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   BEIN TENGING VID SLEEPER-DRAFT
   ============================================================
   Sleeper sendir CORS-hausa svo thetta gengur BEINT ur vafranum —
   enginn proxy, enginn lykill. Thad er astaedan fyrir thvi ad
   lifandi fylgni er moguleg hér en ekki gagnvart ESPN eda Yahoo.

   PORUN VID OKKAR RODIR er a `sleeperId`, sem ER audkenni okkar
   leikmannarada (`players.json` er byggð Sleeper-midjad). Thess
   vegna er engin nafna-porun i thessu ferli — hun vaeri sidasta
   thad sem madur vill i beinni med 30 sekundur a klukkunni.
   ============================================================ */
function SleeperSync({ sync, setSync, season, rows, onPicks }) {
  const [user, setUser] = useState("");
  /* Audkenni notandans er MUNAD thegar hann finnst. Thad er lykillinn
     ad sjalfvirku saeti — sja `applyDraft`. */
  const [userId, setUserId] = useState(null);
  const [leagues, setLeagues] = useState(null);
  const [slotAuto, setSlotAuto] = useState(false);
  const [status, setStatus] = useState(null);
  const [live, setLive] = useState(false);
  const [info, setInfo] = useState(null);
  /* Val sem bordid thekkir ekki — talid, ekki hent thegjandi. */
  const [unmatched, setUnmatched] = useState(null);
  const timer = useRef(null);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const findLeagues = async () => {
    setStatus("leita…");
    try {
      const u = await D.sleeperUser(user.trim());
      setUserId(u.user_id || null);
      const ls = await D.sleeperLeagues(u.user_id, season);
      setLeagues(ls || []);
      setStatus(ls && ls.length ? null : "engar deildir a thessu timabili");
    } catch (e) { setStatus(String(e.message || e)); setLeagues(null); }
  };

  /* ============================================================
     SAETID ER LESID UR DRAFTINU, EKKI SLEGID INN
     ============================================================
     ÞETTA VAR GATID SEM GERDI TENGINGUNA HALFA. An saetis strikadi
     appid ut tha sem voru farnir — en hopurinn THINN fylltist aldrei,
     svo "hvern a ad taka naest" vissi ekki hvad thu attir thegar. Rad
     an vitneskju um hopinn er ekki rad.

     Sleeper ber `draft_order` a draftinu sjalfu: `{ user_id: saeti }`.
     Vid vitum `user_id` um leid og notandinn finnst, svo saetid er
     LESID. Handvirki reiturinn stendur afram fyrir tha sem lima inn
     slod an thess ad slá inn notandanafn — og fyrir tilfellid thegar
     `draft_order` er null, sem Sleeper gerir adur en rodin er dregin.

     `slotAuto` greinir a milli "vid lasum thetta" og "thu slóst thad
     inn", thvi thad fyrra ma yfirskrifast vid naesta draft og thad
     sidara ekki. */
  const applyDraft = (d, uid) => {
    const order = d && d.draft_order;
    const slot = order && uid != null ? order[uid] : null;
    const next = { ...sync, draftId: d.draft_id };
    if (slot != null && Number.isFinite(Number(slot))) {
      next.slot = Number(slot);
      setSlotAuto(true);
    }
    setSync(next);
    return slot != null;
  };

  const useLeague = async (lg) => {
    setStatus("saeki draft…");
    try {
      const ds = await D.sleeperDrafts(lg.league_id);
      const d = (ds || [])[0];
      if (!d) { setStatus("ekkert draft i thessari deild"); return; }
      /* `/league/{id}/drafts` ber ekki alltaf `draft_order`; sæki tha
         draftid sjalft. Eitt aukakall er thess virdi — an saetis er
         radgjofin blind a thinn eigin hop. */
      let full = d;
      if (!d.draft_order && d.draft_id) {
        try { full = await D.sleeperDraft(d.draft_id); } catch { full = d; }
      }
      const got = applyDraft(full, userId);
      setStatus(got ? null : "fann draftid — sláðu inn saetid thitt");
      setLeagues(null);
    } catch (e) { setStatus(String(e.message || e)); }
  };

  const pull = async (id) => {
    try {
      const [d, picks] = await Promise.all([D.sleeperDraft(id), D.sleeperPicks(id)]);
      setInfo({ type: d.type, teams: d.settings ? d.settings.teams : null,
                rounds: d.settings ? d.settings.rounds : null,
                status: d.status, picks: (picks || []).length });
      /* Rodin er oft dregin EFTIR ad tengt er. Se saetid enn ekki komid
         og `draft_order` bætist vid i millitidinni tokum vid thad. */
      if (sync.slot == null && userId != null && d.draft_order) {
        const s2 = d.draft_order[userId];
        if (s2 != null && Number.isFinite(Number(s2))) {
          setSlotAuto(true);
          setSync((prev) => ({ ...prev, slot: Number(s2) }));
        }
      }
      /* VAL SEM BORDID THEKKIR EKKI MA EKKI HVERFA THEGJANDI.
         Bordid ber ~1.130 leikmenn af ~11.400 hja Sleeper, svo djupt
         val getur verid utan thess. Ad sleppa thvi ur `ids` er rett —
         thad var hvort ed er ekki i tillogunum. En ad sleppa thvi ur
         `mine` er thad EKKI: tha vantar mann i thinn eigin hop og
         ekkert segir fra thvi. Nu er thad talid og synt. */
      const ids = [], mine = [];
      let unknown = 0, unknownMine = 0;
      for (const p of picks || []) {
        const pid = String(p.player_id);
        const known = byId.has(pid);
        const isMine = sync.slot != null && p.draft_slot === Number(sync.slot);
        if (known) { ids.push(pid); if (isMine) mine.push(pid); }
        else { unknown++; if (isMine) unknownMine++; }
      }
      setUnmatched({ total: unknown, mine: unknownMine,
        names: (picks || []).filter((p) => !byId.has(String(p.player_id)))
          .slice(0, 6)
          .map((p) => (p.metadata &&
            [p.metadata.first_name, p.metadata.last_name].filter(Boolean).join(" ")) ||
            String(p.player_id)) });
      onPicks(ids, mine);
      setStatus(null);
    } catch (e) { setStatus(String(e.message || e)); }
  };

  useEffect(() => {
    if (!live || !sync.draftId) return;
    pull(sync.draftId);
    /* 5 sekundur er valid af thvi ad snakk-draft gefur 30-90 sek a
       val; hradara vaeri ad spyrja um ekkert. Sleeper setur ekki
       kvota a thetta en vid erum gestir. */
    timer.current = setInterval(() => pull(sync.draftId), 5000);
    return () => clearInterval(timer.current);
  }, [live, sync.draftId, sync.slot, byId]);

  return (
    <div className="panel">
      <h2>Connect your Sleeper draft</h2>
      <div className="sub">
        Picks are pulled live and struck off the board. Nothing is sent anywhere —
        the call goes from your browser straight to Sleeper.
      </div>

      <div className="row">
        <label className="field">
          Sleeper username
          <input type="text" value={user} onChange={(e) => setUser(e.target.value)}
            placeholder="username" onKeyDown={(e) => e.key === "Enter" && findLeagues()} />
        </label>
        <button className="act" onClick={findLeagues} disabled={!user.trim()}>
          Find leagues
        </button>

        <span className="dim" style={{ margin: "0 6px" }}>or</span>

        <label className="field">
          Draft ID / URL
          <input type="text" value={sync.draftId} style={{ minWidth: 230 }}
            placeholder="https://sleeper.com/draft/nfl/123456789"
            onChange={(e) => setSync({ ...sync, draftId: extractDraftId(e.target.value) })} />
        </label>
        <label className="field">
          Your slot{slotAuto && sync.slot != null &&
            <span className="good" style={{ fontSize: 11, marginLeft: 5 }}>read from Sleeper</span>}
          <input type="number" min="1" max="16" value={sync.slot ?? ""}
            style={{ width: 70 }}
            onChange={(e) => { setSlotAuto(false);
              setSync({ ...sync, slot: e.target.value === "" ? null
                : Number(e.target.value) }); }} />
        </label>
        <button className={`act${live ? "" : " primary"}`}
          disabled={!sync.draftId}
          onClick={() => setLive((v) => !v)}>
          {live ? "Stop syncing" : "Start live sync"}
        </button>
      </div>

      {leagues && leagues.length > 0 && (
        <div className="chips" style={{ marginTop: 10 }}>
          {leagues.map((l) => (
            <button key={l.league_id} className="chip" onClick={() => useLeague(l)}>
              {l.name} · {l.total_rosters} teams
            </button>
          ))}
        </div>
      )}

      {status && <div className="note warn" style={{ marginTop: 10 }}>{status}</div>}

      {info && (
        <div className="dim" style={{ marginTop: 10, fontSize: 12.5 }}>
          {info.type} draft · {info.teams} teams · {info.rounds} rounds ·
          {" "}status <b>{info.status}</b> · {info.picks} picks made
          {live && <span className="good"> · live</span>}
          {sync.slot == null && (
            <span className="warn"> · set your slot to auto-fill your roster</span>
          )}
        </div>
      )}

      {unmatched && unmatched.total > 0 && (
        <div className={`note ${unmatched.mine > 0 ? "warn" : ""}`} style={{ marginTop: 8 }}>
          <b>{unmatched.total} pick{unmatched.total > 1 ? "s" : ""} are not on this board</b>
          {unmatched.mine > 0
            ? ` — ${unmatched.mine} of them yours, so your roster below is short by that many.`
            : " — deep picks outside the draftable pool, which is expected."}
          {unmatched.names.length > 0 && (
            <span className="dim"> {unmatched.names.join(", ")}
              {unmatched.total > unmatched.names.length ? " …" : ""}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** Tekur vid heilli slod eda beru audkenni. */
function extractDraftId(s) {
  const m = String(s).match(/(\d{6,})/);
  return m ? m[1] : String(s).trim();
}


/* ============================================================
   NAESTA VAL — thad sem allar tolurnar eru til fyrir
   ============================================================
   Bordid radar leikmonnum. Thessi kassi svarar spurningunni sem thu
   stendur raunverulega frammi fyrir: hvern a ad taka NUNA, og hverja
   ma bida eftir.

   RODIN ER A-RANKING. Sja `advice.js`: bradanauðsyn — ad rada eftir
   thvi hversu bratt stadan versnar — var maeld og hun TAPAR
   (marktaekt i standard). Lifunarlikur eru birtar sem upplysing.
   ============================================================ */
function NextPick({ available, roster, taken, league, sync }) {
  const pick = (taken ? taken.size : 0) + 1;
  const rec = useMemo(() => {
    if (!available.length) return null;
    try {
      return recommend({
        available: available.map((r) => ({
          id: r.id, name: r.name, pos: r.pos, vbd: r.vbd,
          adp: r.adp, adpSd: r.adpSd, tier: r.tier, proj: r.proj,
        })),
        roster, pick, league,
      });
    } catch { return null; }
  }, [available, roster, pick, league]);

  if (!rec || !rec.picks.length) return null;
  const top = rec.picks.slice(0, 5);
  const differs = rec.urgencyPick && rec.urgencyPick.id !== rec.picks[0].id;

  return (
    <div className="panel">
      <h2>Pick {pick} — take this</h2>
      <div className="sub">
        {sync && sync.draftId
          ? `Pick ${pick} by the board below. `
          : `Assuming you are on the clock at pick ${pick}. `}
        Your next pick is <b>{rec.nextPick}</b>, {rec.wait} picks away.
      </div>

      {/* K og DST eru utan A-Ranking af maeldri astaedu, en tha ma ekki
          thegja um: annars endar draftid med tvo tom byrjunarsaeti. */}
      {/* ============================================================
          AUDAR VIKUR ERU SYNDAR, EN THAER RADA ENGU
          ============================================================
          MAELT (scripts/bye-lab.mjs, VIKULEG talning yfir 2019-2025 a
          badum spaheimildum — timabils-summan er BLIND a audar vikur
          og gat aldrei svarad thessu):

            fftoday, 7 ar   +5,7 til +28,2 stig · besta t = 1,29
            sleeper, 5 ar   +15,5 til +37,6 stig · besta t = 1,80

          TIU AF TIU VOGUM JAKVAEDAR, a tveimur ohadum heimildum — en
          8 af 12 arum og teiknaprof p vel yfir 0,05. Merkid er thvi
          sterkara en null og veikara en maeling.

          Ad setja thad i RODUNINA vaeri ad lata omaelda tolu faera menn
          til; sama akvordun og Evruálagid i FPL-verkefninu, sem er
          synt sem samhengi en fer hvergi inn i rodun. Talan sem RADAR
          er afram hrein VBD.                                        */}
      {rec.byeClash && rec.byeClash.length > 0 && (
        <div className="note" style={{ marginTop: 8 }}>
          <b>Bye overlap in your roster:</b>{" "}
          {rec.byeClash.map((c) => `${c.n} ${c.pos} in week ${c.bye}`).join(" · ")}.
          {" "}This does <b>not</b> move anyone in the list below — measured across
          2019–2025 on both projections it is worth somewhere between nothing and
          about thirty points a season, and the interval includes zero. It is here
          because it is the one thing a season-long ranking cannot see for you.
        </div>
      )}

      {rec.mustFill && rec.mustFill.length > 0 && (
        <div className={`note ${rec.mustFillUrgent ? "warn" : ""}`} style={{ marginTop: 8 }}>
          <b>Still to fill: {rec.mustFill.map((m) =>
            `${m.short} ${m.pos}`).join(", ")}.</b>{" "}
          {rec.mustFillUrgent
            ? `You have ${rec.picksLeft} picks left — take them now or start the season a player short.`
            : `These never appear in the list below: they were excluded from every
               simulation that validates the order, so ranking them would be a guess
               dressed as a measurement. Take them late, from the K and DST table.`}
        </div>
      )}

      <div className="tablewrap" style={{ marginTop: 10 }}>
        <table className="data">
          <thead><tr className="cols">
            <th className="txt frozen">Player</th>
            <th className="txt">Pos</th>
            <th title="Value over replacement — this is what decides the order">VBD</th>
            <th title="Chance he is still there at your next pick">Lasts?</th>
            <th title="Best VBD his position should still offer at your next pick">Next best</th>
            <th className="txt">Why</th>
          </tr></thead>
          <tbody>
            {top.map((p, i) => (
              <tr key={p.id} style={i === 0
                ? { background: "rgba(53,196,122,.10)" } : undefined}>
                <td className="txt frozen">
                  {i === 0 && <span className="badge on" style={{ marginRight: 6 }}>take</span>}
                  {p.name}
                </td>
                <td className="txt"><span className={`pos ${p.pos}`}>{p.pos}</span></td>
                <td className="mono"><b>{p.vbd == null ? "—" : p.vbd.toFixed(1)}</b></td>
                <td className={`mono ${p.survive != null && p.survive < 0.25 ? "bad"
                  : p.survive != null && p.survive > 0.7 ? "good" : ""}`}>
                  {p.survive == null ? <span className="null">—</span>
                    : `${Math.round(p.survive * 100)}%`}
                </td>
                <td className="mono dim">{p.expectedNext == null ? "—" : p.expectedNext}</td>
                <td className="txt dim" style={{ fontSize: 12 }}>
                  {p.reasons.slice(0, 2).map((r) => r.text).join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {differs && (
        <div className="note">
          <b>A note on scarcity.</b> If you ranked by how steeply each position
          falls off before your next pick, this would say{" "}
          <b>{rec.urgencyPick.name}</b> instead. It does not, because that rule was
          measured: a team drafting on positional urgency finished{" "}
          <b>{Math.abs(MEASURED.urgencyVsARank.standard.diff)} points behind</b> one
          that simply took the best player, in standard scoring, losing all four
          seasons tested. It trades away points you can never get back for a cliff
          that flattens out anyway.
        </div>
      )}

      <div className="dim" style={{ marginTop: 8, fontSize: 12 }}>
        "Lasts?" uses each player's ADP <i>and its spread</i> — a player at ADP 30
        with a standard deviation of 3 is a very different bet from one at 30 with a
        deviation of 20. Where a bookmaker figure is missing we fall back to{" "}
        <code>{MEASURED.sdRule}</code>, fitted on {MEASURED.sdRuleSample.toLocaleString()}{" "}
        player-seasons.
      </div>
    </div>
  );
}
