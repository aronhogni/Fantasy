import { useEffect, useMemo, useState } from "react";
import { planSwaps, BS_HORIZON } from "./buysell.js";
import { SWAP_TAU, SWAP_KMAX, SWAP_WEAK_NET } from "./swaptiming.js";
import { loadState, saveState } from "./storage.js";

/* ============================================================
   KAUP- OG SOLU-LISTINN — BIRTING EIN
   ============================================================
   Oll rokfraedi er i `buysell.js` og `swaptiming.js`; hér er ekkert
   reiknad nema snid. Sama skipting og gildir um allt repo-id: profin
   keyra somu formulu og skjarinn synir, thvi hun er a EINUM stad.

   SOLU-DALKURINN LES HOPINN, KAUP-DALKURINN ALLA DEILDINA. Thad er
   ekki thaegindi heldur reglan sjalf: madur getur ekki selt mann sem
   hann a ekki, svo listi sem byddi thad vaeri listi yfir skipti sem er
   ekki haegt ad framkvaema.
   ============================================================ */

const KEY = "fpl_buysell_v1";
const POS = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

/* VISTAD ASTAND ER OTRAUST INNTAK (CLAUDE.md kafli 8). Gilt JSON med
   rangri gerd felldi appid adur; her er hver hlid thvinguð i fylki af
   tolum og eitt onytt svid kostar adeins sig sjalft.                 */
const ids = v => (Array.isArray(v) ? v.map(Number).filter(Number.isFinite) : []);

/* FFDR-BRAUTIN FYRIR BADA — „ad appid horfi bædi a leikmann sem eg aetla ad
   selja og svo sem eg aetla ad kaupa serstaklega med tilliti til FFDR."
   A EININGARSVIDI, ekki inni i BuySell: komponent sem er skilgreindur inni
   i odrum er NY tegund i hverri teikningu og hver stafur i leitarreitnum
   endurmountadi thvi hverja braut — sama gildra sem hausinn lysir fyrir
   `Col` (10.9.2026).                                                    */
function Path({ id, label, pathOf, S }) {
  const path = typeof pathOf === "function" ? pathOf(id) : null;
  if (!Array.isArray(path) || !path.length) return null;
  return (
    <div style={S.bsPathRow}>
      <span style={S.bsPathLbl}>{label}</span>
      {path.map((c, i) => (
        <span key={i} style={{ ...S.bsCell, background: c.bg, color: c.fg }}
          title={c.title || ""}>{c.opp || "—"}</span>
      ))}
    </div>
  );
}

export default function BuySell({ players = [], squadIds = [], ep, pathOf,
                                  gw, maxGw = 38, freeTransfers = 1, S = {} }) {
  const [sell, setSell] = useState([]);
  const [buy, setBuy] = useState([]);
  const [qSell, setQSell] = useState("");
  const [qBuy, setQBuy] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { (async () => {
    const s = await loadState(KEY);
    setSell(ids(s?.sell)); setBuy(ids(s?.buy)); setLoaded(true);
  })(); }, []);
  useEffect(() => { if (loaded) saveState(KEY, { sell, buy }); }, [loaded, sell, buy]);

  const byId = useMemo(() => {
    const m = {};
    for (const p of players) if (p && p.id != null) m[p.id] = p;
    return m;
  }, [players]);

  const squad = useMemo(() => new Set(squadIds.map(Number)), [squadIds]);

  const plan = useMemo(() => planSwaps({
    sells: sell.map(id => byId[id]).filter(Boolean)
      .map(p => ({ id: p.id, pos: p.element_type })),
    buys: buy.map(id => byId[id]).filter(Boolean)
      .map(p => ({ id: p.id, pos: p.element_type })),
    ep, gw, maxGw, freeTransfers,
  }), [sell, buy, byId, ep, gw, maxGw, freeTransfers]);

  const nameOf = id => byId[id]?.web_name || `#${id}`;
  const posOf = id => POS[byId[id]?.element_type] || "—";

  /* ============================================================
     MEIDSLI VERDA AD SEGJA SIG SJALF — ANNARS ThEGIR ThOGNIN RANGT
     ============================================================
     Notandinn bad um ad radid „uppfaerist um leid og nyjar upplysingar
     koma. t.d. meidsli", og thad GERIST gegnum `expPointsFor`, sem ber
     tiltaekileika. En rasin ein er ekki nog: flaggadur madur faer
     laegri vaent stig, nettoid fellur undir throskuldinn og spjaldid
     segir „No change worth making" — SATT um toluna og VILLANDI um
     astaeduna. Notandinn les ad skiptin borgi sig ekki thegar rett svar
     er „hann er meiddur i dag".
     Sama aett og E0-nullin: rett tala, rong merking.
     FPL-STATUS RAEDUR (kafli 6) — hans svid, hans frett, engin
     audgun og engin agiskun.                                         */
  const flagOf = id => {
    const p = byId[id];
    if (!p || p.status === "a" || p.status == null) return null;
    const pct = p.chance_of_playing_next_round;
    return {
      code: p.status === "u" ? "GONE" : p.status === "s" ? "SUS"
          : p.status === "i" ? "INJ" : p.status === "d" ? "?" : "!",
      pct: Number.isFinite(pct) ? pct : null,
      news: p.news || "",
    };
  };
  const Flag = ({ id }) => {
    const f = flagOf(id);
    if (!f) return null;
    return (
      <span style={S.bsFlag} title={f.news || "FPL has this player flagged"}>
        {f.code}{f.pct != null ? ` ${f.pct}%` : ""}
      </span>
    );
  };

  /* Leitin skilar i mesta lagi 8 — listi sem er lengri en skjarinn er
     ekki listi heldur veggur.                                         */
  const hits = (q, onlySquad) => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return players.filter(p => p && (!onlySquad || squad.has(Number(p.id)))
      && String(p.web_name || "").toLowerCase().includes(s)).slice(0, 8);
  };

  const Col = ({ title, note, list, setList, q, setQ, onlySquad }) => (
    <div style={S.bsCol}>
      <div style={S.bsColHead}>{title}<span style={S.bsColNote}>{note}</span></div>
      <input style={S.bsInput} value={q} placeholder={"type a name…"}
        onChange={e => setQ(e.target.value)} />
      {hits(q, onlySquad).length > 0 && (
        <div style={S.bsHits}>
          {hits(q, onlySquad).map(p => (
            <button key={p.id} style={S.bsHit}
              onClick={() => { if (!list.includes(p.id)) setList([...list, p.id]); setQ(""); }}>
              {p.web_name}<span style={S.bsHitPos}>{POS[p.element_type]}</span>
            </button>
          ))}
        </div>
      )}
      <div style={S.bsChips}>
        {list.length === 0 && <span style={S.bsEmpty}>{"nobody yet"}</span>}
        {list.map(id => (
          <span key={id} style={S.bsChip}>
            {nameOf(id)}<span style={S.bsChipPos}>{posOf(id)}</span><Flag id={id} />
            <button style={S.bsX} title={"Remove"}
              onClick={() => setList(list.filter(x => x !== id))}>{"✕"}</button>
          </span>
        ))}
      </div>
    </div>
  );

  /* FFDR-BRAUTIN FYRIR BADA — thad var beinlinis thad sem var bedid um:
     „ad appid horfi bædi a leikmann sem eg aetla ad selja og svo sem eg
     aetla ad kaupa serstaklega med tilliti til FFDR."                  */

  const moves = plan?.moves || [];
  const weak = plan?.weak || [];

  return (
    <section style={S.card}>
      <div style={S.recHead}>
        <h2 style={S.h2}>{"Buy / sell — when to make the move"}</h2>
      </div>

      <div style={S.bsCols}>
        <Col title={"Selling"} note={"from your squad"} list={sell} setList={setSell}
          q={qSell} setQ={setQSell} onlySquad={squad.size > 0} />
        <Col title={"Buying"} note={"anyone"} list={buy} setList={setBuy}
          q={qBuy} setQ={setQBuy} onlySquad={false} />
      </div>

      {/* ENGIN TILLAGA ER LIKA SVAR — og hun verdur ad segja HVERS VEGNA.
          „Ekkert her" an astaedu les eins og bilun.                     */}
      {sell.length === 0 || buy.length === 0 ? (
        <div style={S.bsSay}>{"Put at least one player in each column. "
          + "A move is like-for-like, so the two sides must share a position."}</div>
      ) : moves.length === 0 && weak.length === 0 ? (
        <div style={S.bsSay}>{"No pair to rank yet — either the two columns share no "
          + "position, or expected points are missing for these gameweeks. "
          + "A missing number is left out rather than counted as zero."}</div>
      ) : null}

      {moves.length > 0 && (
        <div style={S.bsMoves}>
          {moves.map((m, i) => {
            const wait = m.timing.verdict === "wait";
            return (
              <div key={i} style={S.bsMove}>
                <div style={S.bsMoveHead}>
                  <span style={{ ...S.bsWeek, ...(wait ? S.bsWeekWait : S.bsWeekNow) }}>
                    {m.week == null ? "—" : `GW${m.week}`}
                  </span>
                  <b>{nameOf(m.outId)}</b><Flag id={m.outId} />{" → "}
                  <b>{nameOf(m.inId)}</b><Flag id={m.inId} />
                  <span style={S.bsPos}>{POS[m.pos]}</span>
                  <span style={{ flex: 1 }} />
                  <span style={S.bsNet} title={"Expected points gained over the "
                    + `${m.timing.horizon} gameweeks shown, in minus out. `
                    + "It does not subtract a −4: whether you take a hit is a separate call."}>
                    {m.net > 0 ? "+" : ""}{m.net.toFixed(1)}{" pts"}
                  </span>
                </div>
                <div style={S.bsWhy}>
                  {m.timing.verdict === "now"
                    ? (m.shifted
                      ? `Do it now on the fixtures — but GW${m.want} is already taken by a `
                        + `move worth more, so this one gets the free transfer in GW${m.week}.`
                      : "Do it now — waiting does not pay on these fixtures.")
                    : `Wait ${m.timing.k} gameweek${m.timing.k === 1 ? "" : "s"}`
                      + (m.timing.why === "noFreeTransfer"
                        ? " — you have no free transfer, so the move costs −4 today."
                        : ` — holding is worth about ${m.timing.gain.toFixed(1)} points, `
                          + "because the fixtures cross over.")}
                  {m.shifted && m.timing.verdict === "wait"
                    && " (pushed a week: another move already has that free transfer.)"}
                </div>
                <Path id={m.outId} label={"out"} pathOf={pathOf} S={S} />
                <Path id={m.inId} label={"in"} pathOf={pathOf} S={S} />
              </div>
            );
          })}
        </div>
      )}

      {/* VEIK SKIPTI — SER FLOKKUR, EKKI NEDSTA SAETID.
          „Best ad gera enga breytingu" var beinlinis bedid um, og thad
          er ONNUR nidurstada en „gerdu thetta seinna".                 */}
      {weak.length > 0 && (
        <div style={S.bsWeak}>
          <div style={S.bsWeakHead}>{"No change worth making"}</div>
          {weak.map((m, i) => (
            <div key={i} style={S.bsWeakRow}>
              <b>{nameOf(m.outId)}</b><Flag id={m.outId} />{" → "}
              <b>{nameOf(m.inId)}</b><Flag id={m.inId} />
              <span style={S.bsPos}>{POS[m.pos]}</span>
              <span style={{ flex: 1 }} />
              <span style={S.bsWeakNet}>{m.net > 0 ? "+" : ""}{m.net.toFixed(1)}{" pts"}</span>
            </div>
          ))}
          {weak.some(m => flagOf(m.outId) || flagOf(m.inId)) && (
            <div style={S.bsWeakFlag}>{"One of these is flagged by FPL. That is why "
              + "the number is low: availability multiplies expected points, so an "
              + "injury reads here as \"not worth it\". It is worth it again the day "
              + "he is fit — this line is not the fixtures talking."}</div>
          )}
          <div style={S.bsWeakNote}>{"Under about "}{SWAP_WEAK_NET}
            {" projected points over "}{BS_HORIZON}{" gameweeks the real outcome is a "
            + "coin flip (49–52% positive, against 65.9% above +5). Timing is not the "
            + "question when the move itself is not."}</div>
        </div>
      )}

      {(plan?.noMatch?.sell?.length > 0 || plan?.noMatch?.buy?.length > 0) && (
        <div style={S.bsSay}>
          {"No like-for-like partner: "}
          {[...plan.noMatch.sell, ...plan.noMatch.buy]
            .map(id => `${nameOf(id)} (${posOf(id)})`).join(", ")}
          {". A transfer swaps a player for one in the same position."}
        </div>
      )}

      <div style={S.dNote}>
        <b>{"What is measured here, and what is not."}</b>{" Timing was measured on 5 "
        + "seasons, 140 decision points and 8,400 pairs, with FFDR frozen at each point. "
        + "Waiting pays in 17.1% of pairs and is worth +1.14 points [0.68, 1.57] when it "
        + "does; on fixture difficulty alone, without blanks and doubles, 11.0% and +0.84 "
        + "[0.27, 1.35]. About 72% of the timing value is blanks and doubles — the colour "
        + "of the fixture contributes +0.07 [0.01, 0.15], real but thin. "}
        <b>{"There is no best-week number"}</b>{": the same oracle on shuffled weeks scores "
        + "as high, so it would be noise with a decimal point. The rule looks "}
        {SWAP_KMAX}{" gameweeks ahead and speaks only when holding beats moving by "}
        {SWAP_TAU}{" points — that threshold is a dial on how often it speaks, not a "
        + "measured constant. Injuries reach this through expected points, which carry "
        + "availability; the timing study itself ran with everyone fit."}
      </div>
    </section>
  );
}
