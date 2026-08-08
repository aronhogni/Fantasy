/* ============================================================
   LEADERBOARD.JSX — flipinn "Stigatafla"

   Tvo lesmatar a somu skra (src/stats.js):
     YFIRLIT — top-5 tafla fyrir HVERJA tolu i voldum flokki, til ad
       skanna margt i einu. Thetta er sjalfgefid: spurningin er oftast
       "hver er bestur i einhverju", ekki "hver er 34. i xG".
     TAFLA  — ein tala, full rodun, med samhengis-dalkum.

   ENGIN FORMULA HER. Hver tala kemur ur STAT_DEFS[].get() svo prófin
   i tests/stats.test.mjs maeli somu tolu sem birtist a skjanum.
   ============================================================ */

import React, { useState, useMemo } from "react";
import { interp } from "./interp.js";
import { STAT_DEFS, STAT_GROUPS, STAT_BY_KEY, buildLeaderboard, fmtStat, minutesFloor, num,
         imminentBoard, nameScore, startRisk, START_MODEL } from "./stats.js";

/* Islensku heitin eru LYKLAR i orðabokinni (sja i18n.js) — thess vegna
   stendur `t()` a NOTKUNARSTADNUM og ekki her: fastar a einingarsvidi eru
   reiknadar EINU SINNI vid innflutning og hefdu thvi frosid a thvi
   tungumali sem var valid tha.                                         */
const POS_TABS = [["all","All"],["1","GK"],["2","Defence"],["3","Midfield"],["4","Attack"]];
const POS_LABEL = { 1:"GK", 2:"D", 3:"M", 4:"F" };
const POS_COLOR = { 1:"#8b5cf6", 2:"#2563eb", 3:"#00b96b", 4:"#d92d3c" };

export default function Leaderboard({ players, teams, teamById, Crest, onPickPlayer, seasonNote, imminent, photoUrl }) {
  const [mode, setMode] = useState("overview");     // "overview" | "table" | "imminent"
  const [group, setGroup] = useState("attack");
  const [statKey, setStatKey] = useState("total_points");
  const [pos, setPos] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [search, setSearch] = useState("");
  const [limitRate, setLimitRate] = useState(true);  // beita minutu-thaki a hlutfallstolur
  const [onlyAvail, setOnlyAvail] = useState(false);

  /* Minutu-thakid er HLUTFALL af mestu spiludu minutum, ekki fost tala —
     svo það virki eins i GW3 og GW38 an handstillingar. 25% valid: i
     fullu timabili (~3.400 min) gefur það ~850 min, sem er nogu lagt til
     ad hleypa hlutastarfs-leikmonnum ad en hendir 90-minutu urtokum ut. */
  const minMin = useMemo(() => (limitRate ? minutesFloor(players || [], 0.25) : 0), [players, limitRate]);

  const hasAnyMinutes = useMemo(
    () => (players || []).some(p => (num(p.minutes) ?? 0) > 0), [players]);

  const groupStats = useMemo(
    () => STAT_DEFS.filter(d => d.group === group), [group]);

  const table = useMemo(() => buildLeaderboard({
    players: players || [], statKey, pos, teamId, search,
    minMinutes: minMin, onlyAvailable: onlyAvail, limit: 200,
  }), [players, statKey, pos, teamId, search, minMin, onlyAvail]);

  if (!players?.length) {
    return <section style={S.card}><div style={S.muted}>{"Fetching player data…"}</div></section>;
  }

  return (
    <section style={S.card}>
      <div style={S.head}>
        <h2 style={S.h2}>{"Leaderboard"}</h2>
        <div style={S.modeRow}>
          <button style={{ ...S.modeBtn, ...(mode==="overview"?S.modeOn:{}) }}
            onClick={() => setMode("overview")}>{"Overview"}</button>
          <button style={{ ...S.modeBtn, ...(mode==="starts"?S.modeOn:{}) }}
            onClick={() => setMode("starts")} title={"Who is at risk of the bench despite having started"}>
            {"Bench risk"}
          </button>
          <button style={{ ...S.modeBtn, ...(mode==="imminent"?S.modeOn:{}) }}
            onClick={() => setMode("imminent")} title={"Who is about to score or assist"}>
            {"Imminent"}
          </button>
          <button style={{ ...S.modeBtn, ...(mode==="table"?S.modeOn:{}) }}
            onClick={() => {
              /* Flokkurinn verdur ad FYLGJA voldu tolunni. Annars sast
                 "Stig" i gildis-dalknum medan tolu-hnapparnir syndu Sokn —
                 ekkert virtist valid og notandinn sa ekki eftir hverju
                 var radad. */
              setMode("table");
              const g = STAT_BY_KEY[statKey]?.group;
              if (g) setGroup(g);
            }}>{"Table"}</button>
        </div>
      </div>

      {seasonNote && <div style={S.note}>{seasonNote}</div>}
      {!hasAnyMinutes && (
        <div style={S.warn}>
          {"No player has minutes played in this data — the season has not started. The tables fill up once GW1 is finished."}
        </div>
      )}

      {/* ---- Sameiginlegar síur (eiga ekki við í Óhjákvæmilegt) ---- */}
      {mode !== "imminent" && mode !== "starts" && <div style={S.filters}>
        <div style={S.posRow}>
          {POS_TABS.map(([v,l]) => (
            <button key={v} style={{ ...S.posBtn, ...(pos===v?S.posOn:{}) }}
              onClick={() => setPos(v)}>{l}</button>
          ))}
        </div>
        <select style={S.select} value={teamId} onChange={e => setTeamId(e.target.value)}>
          <option value="all">{"All teams"}</option>
          {(teams || []).slice().sort((a,b)=>String(a.short).localeCompare(String(b.short)))
            .map(t => <option key={t.id} value={t.id}>{t.short}</option>)}
        </select>
        <input style={S.input} placeholder={"Search for a player"} value={search}
          onChange={e => setSearch(e.target.value)} />
        <label style={S.check} title={interp("Skips players below {0} min in /90 and % figures. Guards against 12-minute samples.", [minMin])}>
          <input type="checkbox" checked={limitRate} onChange={e => setLimitRate(e.target.checked)} />
          {"min."} {minMin} {"min in rate figures"}
        </label>
        <label style={S.check}>
          <input type="checkbox" checked={onlyAvail} onChange={e => setOnlyAvail(e.target.checked)} />
          {"available only"}
        </label>
      </div>}

      {group === "rank" && mode !== "imminent" && (
        <div style={S.note}>
          <b>{"These are FPL ranks WITHIN the position"}</b>{", not among all players — so each position has its own no. 1. That is why four players show \"1\" when no position filter is set (best GK, best DEF, best MID, best FWD)."} <b>{"Lower is better."}</b> {"Example: Raya has 4.4 points/match → rank"} <b>3</b> {"among goalkeepers but 32nd overall."}
        </div>
      )}

      {/* ---- Flokka-val ---- */}
      {mode !== "imminent" && mode !== "starts" && <div style={S.groupRow}>
        {STAT_GROUPS.map(g => (
          <button key={g.key} style={{ ...S.groupBtn, ...(group===g.key?S.groupOn:{}) }}
            onClick={() => {
              setGroup(g.key);
              // i toflu-ham fylgir valda talan flokknum svo skiptin se ekki daud
              const first = STAT_DEFS.find(d => d.group === g.key);
              if (mode === "table" && first) setStatKey(first.key);
            }}>{g.label}</button>
        ))}
      </div>}

      {mode === "starts" ? (
        <StartRiskPanel imminent={imminent} players={players} teamById={teamById}
          Crest={Crest} photoUrl={photoUrl} onPickPlayer={onPickPlayer} />
      ) : mode === "imminent" ? (
        <ImminentPanel imminent={imminent} teamById={teamById} Crest={Crest}
          photoUrl={photoUrl} players={players} onPickPlayer={onPickPlayer} />
      ) : mode === "overview" ? (
        <div style={S.grid}>
          {groupStats.map(def => (
            <MiniBoard key={def.key} def={def} players={players} pos={pos} teamId={teamId}
              search={search} minMin={minMin} onlyAvail={onlyAvail}
              teamById={teamById} Crest={Crest} onPickPlayer={onPickPlayer}
              onOpen={() => { setStatKey(def.key); setMode("table"); }} />
          ))}
        </div>
      ) : (
        <>
          <div style={S.statRow}>
            {groupStats.map(def => (
              <button key={def.key} style={{ ...S.statBtn, ...(statKey===def.key?S.statOn:{}) }}
                onClick={() => setStatKey(def.key)} title={def.note || ""}>
                {def.label}{def.derived ? <i style={S.derived} title={"Computed by us from FPL fields"}>†</i> : null}
              </button>
            ))}
          </div>
          <FullTable table={table} teamById={teamById} Crest={Crest}
            onPickPlayer={onPickPlayer} minMin={minMin} />
        </>
      )}

      <div style={S.legend}>
        <b>†</b> {"= computed by us from FPL fields, not a field FPL publishes itself. Rate figures (/90, %) obey the minutes floor; totals do not."}
      </div>
    </section>
  );
}


/* ============================================================
   OHJAKVAEMILEGT — MO og AO med TREND-LINURITI

   Linuritid er ekki skraut: thad synir HVERT umferdar-gildi i glugganum,
   svo notandinn sjai hvort magnid er ad BYGGJAST UPP eða hvort ein umferd
   ber allt. Fjorar umferdir, hvert stak er raunveruleg maeling.

   Vogtolurnar og maelingin a bak vid MO/AO eru i src/stats.js.
   ============================================================ */
/* Mynd med stafa-fallback VID VILLU, ekki adeins thegar code vantar.
   premierleague.com skilar 404 fyrir nyja/nyflutta menn (Igor Jesus i
   agust 2026) og an onError birti vafrinn brotid-myndar-tak i stad
   stafsins — sama regla og PlayerImg i App.jsx.                        */
function ImmPhoto({ img, name }) {
  const [ok, setOk] = useState(true);
  if (!img || !ok) return <span style={S.immImgFb}>{(name || "?").slice(0, 1)}</span>;
  return <img src={img} alt="" style={S.immImg} loading="lazy" onError={() => setOk(false)} />;
}

function ImminentPanel({ imminent, teamById, Crest, photoUrl, players, onPickPlayer }) {
  const [kind, setKind] = useState("mo");
  const board = useMemo(
    () => imminent ? imminentBoard(imminent.players, kind, 12) : [], [imminent, kind]);
  /* SAFN-RADIR EIGA ENGAN `code` (sja deriveImminent) svo code-uppfletting
     ein og ser skilar engum myndum. Vid follum a NAFN + LID, sama adferd og
     matchShotsToPlayers notar — og krefjumst othraedds sigurvegara.        */
  const findCur = useMemo(() => {
    const byCode = {}, byTeam = {};
    for (const p of players || []) {
      if (p.code != null) byCode[String(p.code)] = p;
      (byTeam[teamById?.[p.team]?.short] ||= []).push(p);
    }
    return row => {
      if (row.code != null && byCode[String(row.code)]) return byCode[String(row.code)];
      const cands = byTeam[row.team] || [];
      let best = null, bs = 0, second = 0;
      for (const c of cands) {
        const sc = nameScore(row.name, c.web_name) ||
                   nameScore(row.name, `${c.first_name} ${c.second_name}`);
        if (sc > bs) { second = bs; bs = sc; best = c; }
        else if (sc > second) second = sc;
      }
      return (best && bs >= 1 && bs > second) ? best : null;
    };
  }, [players, teamById]);

  if (!imminent) {
    return <div style={S.warn}>{"Fetching"} <code>imminent.json</code>{"… the pipeline has not written it yet."}</div>;
  }
  const isMo = kind === "mo";
  const serieKey = isMo ? "xg" : "cre";

  return (
    <>
      <div style={S.immHead}>
        <div style={S.modeRow}>
          <button style={{ ...S.modeBtn, ...(isMo ? S.modeOn : {}) }}
            onClick={() => setKind("mo")}>{"⚽ Goal imminent"}</button>
          <button style={{ ...S.modeBtn, ...(!isMo ? S.modeOn : {}) }}
            onClick={() => setKind("ao")}>{"◎ Assist imminent"}</button>
        </div>
        <span style={S.muted}>
          {imminent.archive ? "ARCHIVE · " : ""}{imminent.season} · GW{imminent.gws?.join(", ")}
        </span>
      </div>

      <div style={S.note}>
        {isMo ? (
          <>
            <b>{"Who is about to score."}</b> {"Only players with"} <b>{"0–1 involvement"}</b> {"in the last"} {imminent.window} {"gameweeks — a player who has already exploded needs no forecast. The score is"} <code>{"xG·0.8 + threat/25·0.3 + bad luck·0.2"}</code>, <b>{"measured"}</b> {"on 13,273 samples over 3 seasons: the top decile scores"} <b>{"2.89×"}</b> {"the average, against 2.70 for xG alone and 2.78 for threat alone (out of sample, 2/3 seasons)."}
          </>
        ) : (
          <>
            <b>{"Who is about to assist."}</b> {"This is"} <b>{"plain creativity/90"}</b> {"— and that is a measured result, not laziness: a composite IA score (xA + creativity + bad luck) was tested and"} <b>{"failed"}</b>{", 2.18 against 2.21 for plain creativity, and lost in"}
            <b> {"0 of 3"}</b> {"seasons. The xA weight was always selected as 0. So we show what works."}
          </>
        )}
      </div>

      <div style={S.immGrid}>
        {board.map((p, i) => {
          const cur = findCur(p);
          const img = photoUrl && cur?.code ? photoUrl(cur.code) : null;
          const t = cur ? teamById?.[cur.team] : null;
          /* TVOFOLD UMFERD: leikmadur getur haft TVAER radir i somu umferd
             (GW36 2025/26 var tvofold fyrir CRY og MCI — 82 leikmenn).
             Gluggasumman a ad telja BADA leiki, en linuritid heitir
             "per umferd", svo thad verdur ad LEGGJA THA SAMAN i einn punkt.
             Annars birtust 5 punktar i 4-umferda glugga, tveir merktir GW36. */
          const byGw = new Map();
          for (const x of (p.series || [])) {
            byGw.set(x.gw, (byGw.get(x.gw) ?? 0) + (x[serieKey] ?? 0));
          }
          const gwList = [...byGw.keys()].sort((a, b) => a - b);
          const series = gwList.map(g => +byGw.get(g).toFixed(2));
          return (
            <div key={p.name + i} style={S.immCard}
              onClick={() => cur && onPickPlayer && onPickPlayer(cur.id)}>
              <div style={S.immTop}>
                <span style={S.immRank}>{i + 1}</span>
                <ImmPhoto img={img} name={p.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.immName}>{p.name}</div>
                  <div style={S.immMeta}>
                    {t ? <Crest team={t} size={11} /> : null} {p.team} · {p.pos}
                    {cur ? ` · £${((cur.now_cost ?? 0) / 10).toFixed(1)}` : ""}
                  </div>
                </div>
                <div style={S.immScore} title={isMo ? "IG score" : "IA score"}>
                  {p.score}
                </div>
              </div>

              <Spark values={series} label={isMo ? "xG per gameweek" : "creativity per gameweek"}
                gws={gwList} />

              <div style={S.immStats}>
                {isMo ? (
                  <>
                    <span><b>{p.window.xg.toFixed(2)}</b> xG</span>
                    <span><b>{Math.round(p.window.threat)}</b> threat</span>
                    <span title={"xG minus goals — how much he is owed"}>
                      <b>{Math.max(0, p.window.xg - p.window.goals).toFixed(2)}</b> {"owed"}</span>
                  </>
                ) : (
                  <>
                    <span><b>{Math.round(p.window.creativity)}</b> creativity</span>
                    <span><b>{p.window.xa.toFixed(2)}</b> xA</span>
                  </>
                )}
                <span style={S.immGi}>{p.window.gi} {"involvement"}</span>
              </div>
            </div>
          );
        })}
      </div>
      {!board.length && <div style={S.muted}>{"No player in the target group in this window."}</div>}
    </>
  );
}

/* Einfalt linurit — engin adkeypt eining, bara SVG. */
function Spark({ values, gws, label }) {
  if (!values?.length) return null;
  const W = 150, H = 34, PAD = 3;
  const max = Math.max(...values, 0.0001);
  const step = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => [PAD + i * step, H - PAD - (v / max) * (H - PAD * 2)]);
  const d = pts.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
  const area = `${d} L${pts[pts.length-1][0].toFixed(1)},${H-PAD} L${pts[0][0].toFixed(1)},${H-PAD} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={S.spark} role="img"
      aria-label={`${label}: ${values.join(", ")}`}>
      <path d={area} fill="#37003c" fillOpacity="0.08" />
      <path d={d} fill="none" stroke="#37003c" strokeWidth="1.6" strokeLinejoin="round" />
      {pts.map((q, i) => (
        <circle key={i} cx={q[0]} cy={q[1]} r="2.2" fill="#37003c">
          <title>{`GW${gws?.[i] ?? "?"}: ${values[i]}`}</title>
        </circle>
      ))}
    </svg>
  );
}


/* ============================================================
   BEKKJAR-HAETTA — leikmenn sem BYRJUDU sidast en likurnar segja annad.

   Thetta er eina spurningin sem "byrjadi sidast"-reglan getur ekki svarad,
   og hun er dyrust: 21,6% theirra sem byrjudu sidast spila EKKI 60+ naest.
   Maelt: laegsti tiundarhluti likansins fangar 42-49% theirra (2,09x).
   Nakvaemni likansins er EKKI betri en grunnreglan — kvordunin er.
   ============================================================ */
function StartRiskPanel({ imminent, players, teamById, Crest, photoUrl, onPickPlayer }) {
  const rows = useMemo(() => {
    if (!imminent?.players) return [];
    const byCodeName = {};
    for (const p of players || []) byCodeName[nameScore ? p.web_name : p.web_name] = p;
    return imminent.players
      .filter(p => p.start_feats)
      .map(p => ({ p, r: startRisk(p.start_feats) }))
      .filter(x => x.r)
      .sort((a, b) => a.r.p - b.r.p);
  }, [imminent, players]);

  const traps = rows.filter(x => x.r.level === "trap");
  const safe  = rows.filter(x => x.r.level === "safe").slice(-8).reverse();
  const m = START_MODEL.measured;

  if (!imminent) return <div style={S.warn}>{"Fetching"} <code>imminent.json</code>…</div>;

  return (
    <>
      <div style={S.note}>
        <b>{"Who is at risk of the bench despite having started last time."}</b> {"Of those who started last time,"} <b>{Math.round(m.trap_base_rate*100)}%</b> {"do NOT play 60+ minutes next — and that is the single most expensive mistake in FPL."}
        <div style={{ marginTop:5 }}>
          {"Measured on"} <b>{m.samples.toLocaleString("en-GB")}</b> {"samples over"} {m.seasons} {"seasons. The model is"} <b>{"not more accurate"}</b> {"than the rule \"started last time\" (88.0% against 88.2% across all players) — it would be dishonest to claim otherwise. The gain is elsewhere: it is"}
          <b>{"better calibrated"}</b> (Brier {m.brier} {"against"} {m.brier_baseline}{", −24%) so you can"}
          <i>{"rank"}</i> {"by risk, and the lowest decile captures"}
          {" "}<b>{Math.round(m.trap_lift*m.trap_base_rate*100)}%</b> {"of those who drop to the bench —"}
          <b>{m.trap_lift}{"× lift"}</b>{", consistent across all three seasons."}
          {" "}<i>{"Rest (<4 days) had no effect and is not in the model."}</i>
        </div>
      </div>

      <H2>{"Bench risk ("}{traps.length})</H2>
      {!traps.length ? <div style={S.muted}>{"Nobody in this group in the current window."}</div> : (
        <div style={S.srGrid}>
          {traps.map(({ p, r }) => (
            <div key={p.name} style={S.srCard} onClick={() => {
              const cur = (players || []).find(x => x.web_name === p.name);
              if (cur && onPickPlayer) onPickPlayer(cur.id);
            }}>
              <div style={S.srTop}>
                <span style={S.srP}>{Math.round(r.p * 100)}%</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={S.srName}>{p.name}</div>
                  <div style={S.srMeta}>{p.team} · {p.pos}</div>
                </div>
              </div>
              <div style={S.srMins}>
                {(p.start_minutes || []).map((v, i) => (
                  <span key={i} style={{ ...S.srMin, ...(v >= 60 ? S.srMinOn : {}) }}>{v}</span>
                ))}
              </div>
              <div style={S.srWhy}>{"minutes over the last"} {(p.start_minutes||[]).length} {"gameweeks"}</div>
            </div>
          ))}
        </div>
      )}

      <H2>{"Safest"}</H2>
      <div style={S.srGrid}>
        {safe.map(({ p, r }) => (
          <div key={p.name} style={{ ...S.srCard, ...S.srCardSafe }}>
            <div style={S.srTop}>
              <span style={{ ...S.srP, ...S.srPSafe }}>{Math.round(r.p * 100)}%</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={S.srName}>{p.name}</div>
                <div style={S.srMeta}>{p.team} · {p.pos}</div>
              </div>
            </div>
            <div style={S.srMins}>
              {(p.start_minutes || []).map((v, i) => (
                <span key={i} style={{ ...S.srMin, ...(v >= 60 ? S.srMinOn : {}) }}>{v}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
function H2({ children }) {
  return <div style={{ fontSize:11, fontWeight:700, color:"#37003c", textTransform:"uppercase",
                       letterSpacing:0.4, margin:"14px 0 6px" }}>{children}</div>;
}

/* ---- Top-5 kassi fyrir eina tolu ---- */
function MiniBoard({ def, players, pos, teamId, search, minMin, onlyAvail, teamById, Crest, onPickPlayer, onOpen }) {
  const { rows, total, skipped } = useMemo(() => buildLeaderboard({
    players, statKey: def.key, pos, teamId, search, minMinutes: minMin,
    onlyAvailable: onlyAvail, limit: 5,
  }), [players, def.key, pos, teamId, search, minMin, onlyAvail]);

  return (
    <div style={S.mini}>
      <button style={S.miniHead} onClick={onOpen} title={def.note || "Open the full table"}>
        <span style={S.miniTitle}>
          {def.label}{def.derived ? <i style={S.derived}>†</i> : null}
        </span>
        <span style={S.miniMore}>{def.hi ? "highest" : "lowest"} ›</span>
      </button>
      {!rows.length ? (
        <div style={S.miniEmpty}>{"No numbers"}</div>
      ) : rows.map(r => {
        const t = teamById?.[r.p.team];
        return (
          <button key={r.p.id} style={S.miniRow} onClick={() => onPickPlayer && onPickPlayer(r.p.id)}>
            <span style={S.miniRank}>{r.rank}</span>
            {Crest && t ? <Crest team={t} size={13} /> : null}
            <span style={S.miniName}>{r.p.web_name}</span>
            <span style={{ ...S.miniPos, color: POS_COLOR[r.p.element_type] }}>
              {POS_LABEL[r.p.element_type]}
            </span>
            <span style={S.miniVal}>{fmtStat(def, r.v)}</span>
          </button>
        );
      })}
      {skipped > 0 && (
        <div style={S.miniNote} title={interp("{0} players below {1} min are excluded", [skipped, minMin])}>
          {skipped} {"below the minutes floor"}
        </div>
      )}
      {total > 5 && <div style={S.miniNote}>{"of"} {total}</div>}
    </div>
  );
}

/* ---- Full tafla fyrir eina tolu, med samhengis-dalkum ---- */
function FullTable({ table, teamById, Crest, onPickPlayer, minMin }) {
  const { def, rows, total, skipped } = table;   // table.incoherent notad nedar
  if (!def) return null;
  const CTX = ["total_points","minutes","now_cost","selected_by_percent"]
    .filter(k => k !== def.key).map(k => STAT_BY_KEY[k]);

  return (
    <>
      {def.note && <div style={S.note}>{def.note}</div>}
      <div style={S.scroll}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, ...S.thRank }}>#</th>
              <th style={{ ...S.th, ...S.thName }}>{"Player"}</th>
              <th style={{ ...S.th, ...S.thVal }} title={def.note || ""}>{def.label}</th>
              {CTX.map(c => <th key={c.key} style={S.th}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const t = teamById?.[r.p.team];
              return (
                <tr key={r.p.id} style={S.tr}>
                  <td style={S.tdRank}>{r.rank}</td>
                  <td style={S.tdName}>
                    <button style={S.nameBtn} onClick={() => onPickPlayer && onPickPlayer(r.p.id)}>
                      {Crest && t ? <Crest team={t} size={14} /> : null}
                      <span style={S.nm}>{r.p.web_name}</span>
                      <span style={{ ...S.tag, color: POS_COLOR[r.p.element_type] }}>
                        {POS_LABEL[r.p.element_type]}
                      </span>
                      {r.p.status !== "a" && <span style={S.flag} title={r.p.news || "Not fully available"}>!</span>}
                    </button>
                  </td>
                  <td style={S.tdVal}>{fmtStat(def, r.v)}</td>
                  {CTX.map(c => <td key={c.key} style={S.td}>{fmtStat(c, c.get(r.p))}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!rows.length && <div style={S.muted}>{"No player has a number in this group."}</div>}
      <div style={S.muted}>
        {rows.length} {"of"} {total} {"shown."}
        {skipped > 0 && interp(" {0} skipped by the minutes floor ({1} min).", [skipped, minMin])}
        {table.incoherent > 0 && (
          <> {" "}<b style={{ color:"#c98a00" }}>{table.incoherent} {"removed"}</b> {"— the FPL API gives a number that is impossible given 0 minutes played."}</>
        )}
      </div>
    </>
  );
}



const SR_STYLES = {
  srGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:8 },
  srCard:{ border:"1px solid #f0dcae", background:"#fff6e0", borderRadius:8,
           padding:"7px 9px", cursor:"pointer" },
  srCardSafe:{ border:"1px solid #b9e8d0", background:"#e6f9f0", cursor:"default" },
  srTop:{ display:"flex", alignItems:"center", gap:7 },
  srP:{ fontSize:15, fontWeight:700, color:"#a33540",
        fontFamily:"ui-monospace, Menlo, monospace", minWidth:44 },
  srPSafe:{ color:"#046b41" },
  srName:{ fontSize:11.5, fontWeight:600, color:"#1d1d20", overflow:"hidden",
           textOverflow:"ellipsis", whiteSpace:"nowrap" },
  srMeta:{ fontSize:9.5, color:"#61616b" },
  srMins:{ display:"flex", gap:3, marginTop:5 },
  srMin:{ fontSize:9.5, fontFamily:"ui-monospace, Menlo, monospace", background:"#fff",
          border:"1px solid #e0e0e4", borderRadius:3, padding:"1px 4px", color:"#8b8b95" },
  srMinOn:{ color:"#1d1d20", fontWeight:700, borderColor:"#c9c9d0" },
  srWhy:{ fontSize:8.5, color:"#8b8b95", marginTop:3 },
};

const IMM_STYLES = {
  immHead:{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10,
            flexWrap:"wrap", marginBottom:8 },
  immGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(232px, 1fr))", gap:8 },
  immCard:{ border:"1px solid #e0e0e4", borderRadius:8, background:"#fafafb", padding:"7px 9px",
            cursor:"pointer" },
  immTop:{ display:"flex", alignItems:"center", gap:6 },
  immRank:{ fontSize:10, fontFamily:"ui-monospace, Menlo, monospace", color:"#8b8b95",
            width:14, flex:"0 0 14px" },
  immImg:{ width:30, height:38, objectFit:"contain", flex:"0 0 30px" },
  immImgFb:{ width:30, height:38, display:"flex", alignItems:"center", justifyContent:"center",
             background:"#efeff2", borderRadius:4, fontSize:13, color:"#61616b", flex:"0 0 30px" },
  immName:{ fontSize:11.5, fontWeight:600, color:"#1d1d20", overflow:"hidden",
            textOverflow:"ellipsis", whiteSpace:"nowrap" },
  immMeta:{ fontSize:9.5, color:"#8b8b95", display:"flex", alignItems:"center", gap:3 },
  immScore:{ fontSize:15, fontWeight:700, color:"#37003c",
             fontFamily:"ui-monospace, Menlo, monospace" },
  spark:{ width:"100%", height:34, display:"block", margin:"4px 0 2px" },
  immStats:{ display:"flex", gap:7, flexWrap:"wrap", fontSize:9.5, color:"#61616b" },
  immGi:{ marginLeft:"auto", color:"#8b8b95" },
};
const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

const S = {
  ...SR_STYLES,
  ...IMM_STYLES,
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 },
  head:{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:8 },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  modeRow:{ display:"flex", gap:4 },
  modeBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:6,
            padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer" },
  modeOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  note:{ fontSize:11.5, color:C.text2, lineHeight:1.45, margin:"0 0 8px" },
  warn:{ fontSize:11.5, color:C.amber, background:C.amberBg, border:`1px solid #f0dcae`,
         borderRadius:6, padding:"6px 8px", marginBottom:8, lineHeight:1.45 },
  muted:{ fontSize:11.5, color:C.text3, margin:"6px 0 0", lineHeight:1.45 },

  filters:{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:8 },
  posRow:{ display:"flex", gap:3 },
  posBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:5,
           padding:"3px 8px", fontSize:11.5, fontWeight:600, cursor:"pointer" },
  posOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  select:{ border:`1px solid ${C.border}`, borderRadius:5, padding:"3px 6px", fontSize:11.5, color:C.text },
  input:{ border:`1px solid ${C.border}`, borderRadius:5, padding:"3px 7px", fontSize:11.5, minWidth:120, flex:"0 1 160px" },
  check:{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:C.text2, cursor:"pointer" },

  groupRow:{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:10, borderBottom:`1px solid ${C.border}`, paddingBottom:8 },
  groupBtn:{ border:"none", background:"transparent", color:C.text2, borderRadius:5,
             padding:"4px 9px", fontSize:12, fontWeight:600, cursor:"pointer" },
  groupOn:{ background:"#f1e9f2", color:C.purple },

  grid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(215px, 1fr))", gap:8 },
  mini:{ border:`1px solid ${C.border}`, borderRadius:8, background:C.cardAlt, padding:6 },
  miniHead:{ display:"flex", width:"100%", alignItems:"center", justifyContent:"space-between",
             gap:6, border:"none", background:"transparent", cursor:"pointer", padding:"1px 2px 5px" },
  miniTitle:{ fontSize:11.5, fontWeight:700, color:C.text, textAlign:"left" },
  miniMore:{ fontSize:10, color:C.text3, whiteSpace:"nowrap" },
  miniRow:{ display:"flex", width:"100%", alignItems:"center", gap:5, border:"none",
            background:"transparent", cursor:"pointer", padding:"2px 2px", textAlign:"left" },
  miniRank:{ fontSize:10, color:C.text3, width:12, flex:"0 0 12px", fontFamily:mono },
  miniName:{ fontSize:11.5, color:C.text, flex:1, minWidth:0, overflow:"hidden",
             textOverflow:"ellipsis", whiteSpace:"nowrap" },
  miniPos:{ fontSize:9, fontWeight:700 },
  miniVal:{ fontSize:11.5, fontWeight:700, color:C.text, fontFamily:mono, whiteSpace:"nowrap" },
  miniEmpty:{ fontSize:11, color:C.text3, padding:"3px 2px" },
  miniNote:{ fontSize:9.5, color:C.text3, padding:"3px 2px 0" },

  statRow:{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 },
  statBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:5,
            padding:"3px 8px", fontSize:11.5, cursor:"pointer" },
  statOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  derived:{ fontStyle:"normal", fontSize:9, opacity:0.65, marginLeft:2 },

  scroll:{ overflowX:"auto" },
  table:{ borderCollapse:"collapse", width:"100%", fontSize:12 },
  th:{ textAlign:"right", padding:"5px 6px", fontSize:10, fontWeight:700, color:C.text2,
       borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" },
  thRank:{ textAlign:"left", width:28 },
  thName:{ textAlign:"left" },
  thVal:{ background:"#f6f1f7" },
  tr:{ borderBottom:`1px solid #f0f0f3` },
  td:{ textAlign:"right", padding:"4px 6px", color:C.text2, fontFamily:mono, whiteSpace:"nowrap" },
  tdRank:{ textAlign:"left", padding:"4px 6px", color:C.text3, fontFamily:mono, fontSize:11 },
  tdName:{ padding:"3px 6px" },
  tdVal:{ textAlign:"right", padding:"4px 6px", fontWeight:700, color:C.text,
          fontFamily:mono, background:"#faf7fb", whiteSpace:"nowrap" },
  nameBtn:{ display:"flex", alignItems:"center", gap:5, border:"none", background:"transparent",
            cursor:"pointer", padding:0, maxWidth:200 },
  nm:{ fontSize:12, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  tag:{ fontSize:9, fontWeight:700 },
  flag:{ fontSize:9, fontWeight:700, color:C.red },
  legend:{ fontSize:10.5, color:C.text3, marginTop:10, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.5 },
};
