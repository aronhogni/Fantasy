/* ============================================================
   COMPARE.JSX — samanburdur a leikmonnum hlid vid hlid

   VAL A TIMABILI, EKKI FRJALST GW-BIL — og thad er maeling, ekki leti:
   frjalst gameweek-bil krefst per-umferdar gagna fyrir HVERN leikmann i
   thvi bili. Their liggja adeins fyrir i data/live/gw{n}.json og thau eru
   TOM thangad til fyrsta umferd 2026/27 klarast. Timabila-samanburdur
   (data/player_seasons.json) virkar hins vegar STRAX og nær 3 ar aftur.
   Thegar live-skrarnar fyllast er haegt ad baeta GW-bili vid ofan a thetta.

   HVADA TOLUR: valdar ur FFS-listanum eftir thvi hvort thaer eru (a) til
   i okkar heimildum og (b) fantasy-relevant. Snertingar i teig, big
   chances, dribbles og aerial duels eru EKKI her thvi engin heimild sem
   vid naum i gefur thaer — sja kafla 6b i CLAUDE.md.
   ============================================================ */

import React, { useMemo, useState } from "react";
import { num } from "./stats.js";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", red:"#d92d3c", amberBg:"#fff6e0",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const POS = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };

const per90 = (v, m) => (!m || m <= 0 || v == null) ? null : (v / m) * 90;

/* Mynd sem HVERFUR vid 404 i stad brotins-myndar-taks. premierleague.com
   skilar 404 fyrir nyflutta menn; nafnid stendur hvort sem er fyrir nedan. */
function SafeImg({ src, style }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return <img src={src} alt="" style={style} loading="lazy" onError={() => setOk(false)} />;
}
const div = (a, b) => (b == null || b === 0 || a == null) ? null : a / b;

/* Radirnar. `hi:false` = laegra er betra. `fmt` styrir birtingu.        */
import { advise, contextFactors, ADVISOR_CAL } from "./advisor.js";
import { indexImminentByTeam, matchImminent, startRisk } from "./stats.js";

export const ROWS = [
  { grp: "Basics" },
  { k:"total_points", label: "FPL points",       hi:true,  get:r => r.total_points },
  { k:"minutes",      label: "Minutes",        hi:true,  get:r => r.minutes },
  { k:"starts",       label: "Starts",hi:true,  get:r => r.starts },
  { k:"pts90",        label: "Points / 90",      hi:true,  dec:2, get:r => per90(r.total_points, r.minutes) },
  { k:"minPerPt",     label: "Mins per point",  hi:false, dec:1,
    note: "Lower is better — how long he takes to earn a point",
    get:r => div(r.minutes, r.total_points) },
  { k:"cost",         label: "Price",           hi:false, dec:1, money:true,
    get:r => r.now_cost == null ? null : r.now_cost / 10 },
  { k:"ppm",          label: "Points per million", hi:true, dec:1,
    get:r => div(r.total_points, r.now_cost == null ? null : r.now_cost / 10) },

  { grp: "Attack" },
  { k:"goals_scored", label: "Goals",           hi:true,  get:r => r.goals_scored },
  { k:"assists",      label: "Assists",         hi:true,  get:r => r.assists },
  { k:"gi",           label: "Goals + assists",  hi:true,  get:r => (r.goals_scored ?? 0) + (r.assists ?? 0) },
  { k:"gi90",         label: "G+A / 90",       hi:true,  dec:2,
    get:r => per90((r.goals_scored ?? 0) + (r.assists ?? 0), r.minutes) },
  { k:"minPerGi",     label: "Mins per GI", hi:false, dec:0,
    get:r => { const gi = (r.goals_scored ?? 0) + (r.assists ?? 0); return gi ? div(r.minutes, gi) : null; } },

  { grp: "Expected" },
  { k:"expected_goals", label:"xG",           hi:true, dec:2, get:r => r.expected_goals },
  { k:"xg90",         label:"xG / 90",        hi:true, dec:2, get:r => r.expected_goals_per_90 },
  { k:"xgDelta",      label: "Goals − xG",      hi:true, dec:2, signed:true,
    note: "Above zero = clinical finishing or luck",
    get:r => (r.goals_scored == null || r.expected_goals == null) ? null : r.goals_scored - r.expected_goals },
  { k:"expected_assists", label:"xA",         hi:true, dec:2, get:r => r.expected_assists },
  { k:"xa90",         label:"xA / 90",        hi:true, dec:2, get:r => r.expected_assists_per_90 },
  { k:"xaDelta",      label: "Assists − xA",    hi:true, dec:2, signed:true,
    get:r => (r.assists == null || r.expected_assists == null) ? null : r.assists - r.expected_assists },
  { k:"expected_goal_involvements", label:"xGI", hi:true, dec:2, get:r => r.expected_goal_involvements },
  { k:"minPerXgi",    label: "Mins per xGI",   hi:false, dec:0,
    get:r => div(r.minutes, r.expected_goal_involvements) },

  { grp: "Defence", defOnly:true },
  { defOnly:true, k:"clean_sheets", label:"CS",             hi:true,  get:r => r.clean_sheets },
  { defOnly:true, k:"csPct",        label:"CS %",           hi:true,  dec:0, pct:true,
    get:r => { const v = div(r.clean_sheets, r.starts); return v == null ? null : v * 100; } },
  { defOnly:true, k:"goals_conceded", label:"GC",           hi:false, get:r => r.goals_conceded },
  { defOnly:true, k:"expected_goals_conceded", label:"xGC", hi:false, dec:2, get:r => r.expected_goals_conceded },
  { defOnly:true, k:"gcDelta",      label:"GC − xGC",       hi:false, dec:2, signed:true,
    note: "Below zero = defended better than the chances implied",
    get:r => (r.goals_conceded == null || r.expected_goals_conceded == null) ? null
             : r.goals_conceded - r.expected_goals_conceded },
  { defOnly:true, k:"defensive_contribution", label:"DC",   hi:true,  get:r => r.defensive_contribution },
  { defOnly:true, k:"dc_per_start", label: "DC per start",  hi:true,  dec:1, get:r => r.dc_per_start },
  { defOnly:true, gkOnly:true, k:"saves", label: "Saves", hi:true, get:r => r.saves },

  { grp: "Bonus and discipline" },
  { k:"bonus",        label: "Bonus points",      hi:true,  get:r => r.bonus },
  { k:"bps",          label:"BPS",            hi:true,  get:r => r.bps },
  { k:"bps90",        label:"BPS / 90",       hi:true,  dec:1, get:r => per90(r.bps, r.minutes) },
  { k:"yellow_cards", label: "Yellow cards",     hi:false, get:r => r.yellow_cards },
  { k:"red_cards",    label: "Red cards",    hi:false, get:r => r.red_cards },
];

/* ============================================================
   SJONRAENT SNID — parasulur per tolu

   HVERS VEGNA `hi` SKIPTIR OLLU: sulan ma ekki bara vera lengri thegar
   talan er haerri. Fyrir "Min. per stig", "Verd", "GC" og "gul spjold" er
   LAEGRA betra, svo lengsta sulan vaeri VERSTI leikmadurinn. Hver rod ber
   `hi` og forustan er reiknud ur henni — annars vaeri myndin beinlinis
   villandi, sem er verra en engin mynd.

   TVENNS KONAR KVARDI:
     venjuleg tala  -> sula fra 0 upp i max(theirra tveggja)
     `signed` tala  -> FRAVIKSSULA ut fra midju (Mork - xG ma vera < 0)
   Kvardinn er PER ROD, ekki per tafla: xG (0-20) og BPS (0-800) i sama
   kvarda gaefi ósýnilegar xG-sulur.

   VANTANDI GILDI ER EKKI NULL: null faer "—" og ENGA sulu. Sula af lengd 0
   laesist eins og maeld nulltala.
   ============================================================ */
export function barGeom(row, v, lo, hi) {
  if (v == null || !Number.isFinite(v)) return null;
  if (row.signed) {
    const m = Math.max(Math.abs(lo), Math.abs(hi), 1e-9);
    const half = 50 * (Math.abs(v) / m);
    return { left: v < 0 ? 50 - half : 50, width: half, diverge: true };
  }
  const top = Math.max(Math.abs(hi), Math.abs(lo), 1e-9);
  return { left: 0, width: 100 * (Math.max(0, v) / top), diverge: false };
}

function VisualRows({ cols, anyDef, anyGk }) {
  return (
    <div style={S.vis}>
      {ROWS.map((row, ri) => {
        if (row.grp) {
          if (row.defOnly && !anyDef) return null;
          return <div key={`g${ri}`} style={S.vGrp}>{row.grp}</div>;
        }
        if (row.defOnly && !anyDef) return null;
        if (row.gkOnly && !anyGk) return null;
        const vals = cols.map(c => (c.rec ? row.get(c.rec) : null));
        const nums = vals.filter(v => v != null && Number.isFinite(v));
        if (!nums.length) return null;              // engin tala -> engin rod
        const lo = Math.min(...nums, 0), hi = Math.max(...nums, 0);
        let best = null;
        if (nums.length > 1) {
          const b = row.hi ? Math.max(...nums) : Math.min(...nums);
          if (nums.filter(v => v === b).length === 1) best = b;
        }
        return (
          <div key={row.k} style={S.vRow}>
            <div style={S.vLbl} title={row.note || ""}>
              {row.label}
              {!row.hi ? <span style={S.vLo} title={"Lower is better"}>▼</span> : null}
            </div>
            <div style={S.vBars}>
              {vals.map((v, i) => {
                const g = barGeom(row, v, lo, hi);
                const lead = best != null && v === best;
                return (
                  <div key={i} style={S.vBarLine}>
                    <div style={S.vTrack}>
                      {row.signed ? <div style={S.vZero} /> : null}
                      {g ? (
                        <div style={{ ...S.vFill, left:`${g.left}%`, width:`${g.width}%`,
                                      background: lead ? C.green : PAL[i % PAL.length] }} />
                      ) : null}
                    </div>
                    <div style={{ ...S.vNum, ...(lead ? S.vNumLead : {}) }}>
                      {fmtVal(row, v)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Litir per leikmann thegar hvorugur leidir (jafntefli/eitt gildi).
   Graent er FRATEKID fyrir forustuna, sbr. toflusnidid.                */
const PAL = ["#7d6f97", "#9aa0b4", "#b08a6a", "#6f97a0"];

function fmtVal(row, v) {
  if (v == null || !Number.isFinite(v)) return "—";
  const body = v.toFixed(row.dec ?? 0);
  const sign = row.signed && v > 0 ? "+" : "";
  if (row.money) return `£${body}`;
  if (row.pct) return `${body}%`;
  return sign + body;
}

/* Lifandi rod ur bootstrap svo yfirstandandi timabil noti somu svid. */
function liveRow(p) {
  const mins = num(p.minutes) ?? 0, starts = num(p.starts) ?? 0;
  const dc = num(p.defensive_contribution);
  return {
    total_points:num(p.total_points), minutes:mins, starts,
    goals_scored:num(p.goals_scored), assists:num(p.assists),
    expected_goals:num(p.expected_goals), expected_goals_per_90:num(p.expected_goals_per_90),
    expected_assists:num(p.expected_assists), expected_assists_per_90:num(p.expected_assists_per_90),
    expected_goal_involvements:num(p.expected_goal_involvements),
    expected_goals_conceded:num(p.expected_goals_conceded),
    clean_sheets:num(p.clean_sheets), goals_conceded:num(p.goals_conceded),
    saves:num(p.saves), bonus:num(p.bonus), bps:num(p.bps),
    yellow_cards:num(p.yellow_cards), red_cards:num(p.red_cards),
    defensive_contribution:dc, dc_per_start:(dc != null && starts > 0) ? dc / starts : null,
    now_cost:num(p.now_cost),
  };
}


/* ============================================================
   RADGJOFIN — birting eingongu. Hver tala kemur ur src/advisor.js.

   ThRJAR BIRTINGAR-AKVARDANIR, ALLAR TIL AD TALAN LJUGI EKKI:
     1. PROSENTAN BER SINA EIGIN SKYRINGU A SKJANUM, ekki i tooltip-i:
        "af 306.653 samanburdum i fortidinni". An hennar les hun sem
        spadomur, sem hun er ekki.
     2. ThEGAR MUNURINN ER UNDIR 55% SEGIR HUN ThAD BERUM ORDUM. Gognin
        vita thad ekki, og verkfaeri sem thykist vissara en gognin er
        verra en ekkert.
     3. SAMHENGIS-TOLURNAR (DefCon, jofnudur, byrjunar-likur) eru i
        EIGIN kassa med sinum fyrirvara. Their eru THAR af thvi ad
        notandinn bad um "oll gogn" — en their eru UTAN talunnar af thvi
        ad maelingin hafnadi theim, og bædi verdur ad sjast.
   ============================================================ */
function Advisor({ picked, advisorById, imminent, defcon, consist, teamById, horizon }) {
  const immByTeam = useMemo(() => indexImminentByTeam(imminent), [imminent]);

  const input = useMemo(() => picked.map(p => {
    const a = advisorById?.[p.id];
    const im = matchImminent(p, immByTeam, teamById?.[p.team]?.short);
    const dcRec = defcon?.players?.[p.id] ?? defcon?.players?.[String(p.id)];
    const cRec = consist?.seasons
      ? Object.values(consist.seasons).map(sn => sn?.[String(p.code)]).filter(Boolean).pop()
      : null;
    return {
      id: p.id, name: p.web_name, pos: p.element_type, p,
      inputs: a?.inputs || {},
      available: a?.avail,
      /* SAMA UTFAERSLA OG LEIKMANNALISTINN NOTAR. Fyrsta utgafan las
         `im.start_prob` sem er EKKI til i skranni — reiturinn var thvi
         alltaf tomur og enginn hefdi tekid eftir thvi, thvi "engin gogn"
         er gild nidurstada. Talan er leidd ur `start_feats` gegnum
         `startRisk`, eins og dalkurinn i listanum.                     */
      startProb: im?.start_feats ? (startRisk(im.start_feats)?.p ?? null) : null,
      dc: num(dcRec?.defcon_opportunity),
      aron: num(cRec?.aron),
    };
  }), [picked, advisorById, immByTeam, defcon, consist, teamById]);

  const res = useMemo(() => advise(input), [input]);
  if (!res.ok) return null;

  const pct = v => `${Math.round(v * 100)}%`;
  const lead = res.lead;
  const risky = res.ranked.filter(r => (r.startProb != null && r.startProb < 0.5)
                                    || (r.available != null && r.available < 0.75));

  return (
    <div style={S.adv}>
      <div style={S.advHead}>
        <b style={S.advTitle}>{"Which one?"}</b>
        <span style={S.advSub}>
          {`over the next ${horizon || 5} gameweeks`}
        </span>
      </div>

      <div style={S.advBars}>
        {res.ranked.map(r => (
          <div key={r.id} style={S.advBarRow}>
            <span style={{ ...S.advName, ...(r.id === lead.id ? S.advNameLead : null) }}>
              {r.name}
            </span>
            <div style={S.advTrack}>
              <div style={{ ...S.advFill, width: `${Math.max(2, r.share * 100)}%`,
                            background: r.id === lead.id ? "#1b5e9c" : "#c3cbd6" }} />
            </div>
            <span style={{ ...S.advPct, ...(r.id === lead.id ? S.advPctLead : null) }}>
              {pct(r.share)}
            </span>
          </div>
        ))}
      </div>

      <p style={S.advWhat}>
        {res.close ? (
          <>
            <b>{"Too close to call."}</b>{" The measured gap between "}
            <b>{res.ranked[0].name}</b>{" and "}<b>{res.ranked[1].name}</b>
            {" puts the head-to-head at "}<b>{pct(res.decisiveProb)}</b>
            {" — barely better than a coin toss. On these numbers there is no real "}
            {"case for one over the other; decide on something the model does not see."}
          </>
        ) : (
          <>
            <b>{lead.name}</b>{" leads. Head to head against "}
            <b>{res.ranked[1].name}</b>{", the higher-rated player outscored the other in "}
            <b>{pct(res.decisiveProb)}</b>{" of comparable cases."}
          </>
        )}
      </p>

      <p style={S.advCal}>
        {"The percentage is not a probability that the transfer works out — nothing measures "}
        {"that. It is how often the better-rated player actually scored more, counted over "}
        <b>{"306,653 head-to-heads inside the same gameweek"}</b>{" across five seasons. "}
        {"The ceiling is real: even the widest gap in the data only reaches about 81%, "}
        {"because one gameweek of football is that noisy."}
      </p>

      {risky.length > 0 && (
        <p style={S.advWarn}>
          <b>{"The number above assumes they both play."}</b>{" "}
          {risky.map(r => `${r.name}: ${r.startProb != null
            ? `${Math.round(r.startProb * 100)}% to play 60+ minutes`
            : "flagged as doubtful"}`).join(" · ")}
          {". A player who does not start scores nothing, which is a harder problem than "}
          {"who scores more — so it sits here rather than inside the percentage."}
        </p>
      )}

      <div style={S.advCols}>
        {res.ranked.map(r => {
          const ctx = contextFactors(r);
          return (
            <div key={r.id} style={S.advCol}>
              <div style={S.advColHd}>{r.name}</div>
              <div style={S.advColSub}>{"What moves the score"}</div>
              {r.terms.filter(t => t.delta != null && Math.abs(t.delta) >= 0.01).map(t => (
                <div key={t.key} style={S.advTerm} title={`${t.label}: ${t.value}`}>
                  <span style={S.advTermL}>{t.label}</span>
                  <span style={{ ...S.advTermV,
                                 color: t.delta > 0 ? "#0a5c3e" : "#8f2230" }}>
                    {t.delta > 0 ? "+" : ""}{t.delta.toFixed(2)}
                  </span>
                </div>
              ))}
              {ctx.length > 0 && <div style={S.advColSub}>{"Shown, but not in the score"}</div>}
              {ctx.map(c => (
                <div key={c.key} style={S.advTerm} title={c.note}>
                  <span style={S.advTermL}>{c.label}</span>
                  <span style={S.advTermCtx}>
                    {c.fmt === "pct" ? `${Math.round(c.value * 100)}%`
                      : c.fmt === "signed" ? `${c.value > 0 ? "+" : ""}${c.value.toFixed(2)}`
                      : c.fmt === "int" ? String(Math.round(c.value)) : c.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <p style={S.advFoot}>
        {"The score behind this is the same one the buy recommendations are ranked by — "}
        {"five inputs (form, minutes, price, fixture difficulty, minutes trend), fitted on "}
        {"five seasons and validated season-by-season. It beats both the app's own expected "}
        {"points and "}<b>{"FPL's published xP"}</b>{". The numbers under each name are how "}
        {"much each input moved that player relative to the others in this comparison, so "}
        {"they add up to the gap rather than explaining it after the fact. "}
        <b>{"Price counts upwards on purpose"}</b>{": it is the market's own rating of a "}
        {"player, and it carries the ability our five numbers cannot see. That is why an "}
        {"expensive player starts ahead — the model is not rewarding the cost, it is "}
        {"reading what the cost implies."}
      </p>
    </div>
  );
}

export default function Compare({ ids, players, teamById, seasonsFile, photoUrl, Crest,
                                  currentLabel, seasonStarted, onRemove, onClear, onClose,
                                  advisorById, imminent, defcon, consist, horizon }) {
  const seasons = useMemo(() => {
    const older = (seasonsFile?.seasons || []);
    return [{ key: currentLabel, live: true }, ...older.map(s => ({ key: s }))];
  }, [seasonsFile, currentLabel]);
  const [season, setSeason] = useState(() => seasonStarted ? currentLabel
                                            : (seasonsFile?.seasons?.[0] || currentLabel));
  /* SJONRAENT ER SJALFGEFID THEGAR TVEIR ERU VALDIR — thad var bedin:
     "velja tvo leikmenn og bera stat theirra saman med sjonraenum haetti".
     Med thremur eda fjorum verdur taflan laesilegri (fjorar sulur per rod
     verda thunnar), svo hun er sjalfgefin tha. Notandinn getur skipt.     */
  const [visual, setVisual] = useState(() => (ids || []).length <= 2);

  const picked = (ids || []).map(id => (players || []).find(p => p.id === id)).filter(Boolean);
  const isLive = season === currentLabel;

  const cols = picked.map(p => {
    const rec = isLive
      ? (seasonStarted ? liveRow(p) : null)
      : (seasonsFile?.players?.[String(p.code)]?.[season] || null);
    return { p, rec: rec ? { ...rec, now_cost: rec.now_cost ?? num(p.now_cost) } : null };
  });

  const anyDef = picked.some(p => p.element_type <= 3);
  const anyGk  = picked.some(p => p.element_type === 1);

  return (
    <div style={S.wrap} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        <div style={S.head}>
          <h2 style={S.h2}>{"Comparison"}</h2>
          <div style={S.headCtl}>
            <select style={S.sel} value={season} onChange={e => setSeason(e.target.value)}>
              {seasons.map(s => (
                <option key={s.key} value={s.key}>
                  {s.key}{s.live && !seasonStarted ? " (not started)" : ""}
                </option>
              ))}
            </select>
            <div style={S.seg} role="group" aria-label={"Comparison layout"}>
              <button style={{ ...S.segBtn, ...(visual ? S.segOn : {}) }}
                aria-pressed={visual} onClick={() => setVisual(true)}>{"▤ Visual"}</button>
              <button style={{ ...S.segBtn, ...(!visual ? S.segOn : {}) }}
                aria-pressed={!visual} onClick={() => setVisual(false)}>{"≡ Table"}</button>
            </div>
            <button style={S.clear} onClick={onClear}>{"Clear"}</button>
            <button style={S.close} onClick={onClose}>✕</button>
          </div>
        </div>

        {!picked.length ? (
          <div style={S.empty}>
            {"None selected. Open a player and click"} <b>{"⇄ Compare"}</b> {"to add him."}
          </div>
        ) : (
          <>
            {isLive && !seasonStarted && (
              <div style={S.warn}>
                <b>{currentLabel} {"has not started"}</b> {"— no numbers exist. Pick an earlier season in the dropdown to compare."}
              </div>
            )}

            {/* RADGJOFIN STENDUR EFST. Hun er SVARID vid spurningunni sem
                madur opnadi gluggann til ad svara ("hvorn a eg ad taka?");
                taflan fyrir nedan er ROKSTUDNINGURINN. Vaeri hun nedst
                thyrfti madur ad skruna fram hja ollum tolunum til ad fa
                nidurstoduna, sem er ofug rod.                            */}
            <Advisor picked={picked} advisorById={advisorById} imminent={imminent}
              defcon={defcon} consist={consist} teamById={teamById} horizon={horizon} />

            <div style={S.note}>
              {"Compared over a"} <b>{"whole season"}</b>{", not an arbitrary gameweek range: per-gameweek numbers only exist in"} <code>live/gw*.json</code> {"and they only fill up once 2026/27 begins. Season comparison works right away and reaches 3 years back."}
            </div>

            {visual ? <VisualRows cols={cols} anyDef={anyDef} anyGk={anyGk} /> : (
            <div style={S.scroll}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={S.thK}></th>
                    {cols.map(({ p }) => {
                      const t = teamById?.[p.team];
                      return (
                        <th key={p.id} style={S.thP}>
                          <div style={S.pHead}>
                            {photoUrl && p.code
                              ? <SafeImg src={photoUrl(p.code)} style={S.img} />
                              : null}
                            <div style={S.pName}>{p.web_name}</div>
                            <div style={S.pMeta}>
                              {Crest && t ? <Crest team={t} size={11} /> : null}
                              {t?.short} · {POS[p.element_type]} · £{((p.now_cost ?? 0)/10).toFixed(1)}
                            </div>
                            <button style={S.rm} onClick={() => onRemove(p.id)}>{"remove"}</button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, ri) => {
                    if (row.grp) {
                      if (row.defOnly && !anyDef) return null;
                      return (
                        <tr key={`g${ri}`}>
                          <td colSpan={cols.length + 1} style={S.grp}>{row.grp}</td>
                        </tr>
                      );
                    }
                    /* VILLA SEM VAR: defOnly gilti adeins um HOPS-HAUSINN, svo
                       varnar-radirnar sjalfar birtust fyrir framherja (Haaland
                       med "CS 13" og "xGC 38,60"). Nu er sian a hverri rod.   */
                    if (row.defOnly && !anyDef) return null;
                    if (row.gkOnly && !anyGk) return null;
                    const vals = cols.map(c => c.rec ? row.get(c.rec) : null);
                    const nums = vals.filter(v => v != null && Number.isFinite(v));
                    // BESTA gildid merkt — adeins ef fleiri en einn og ekki jafntefli
                    let best = null;
                    if (nums.length > 1) {
                      const b = row.hi ? Math.max(...nums) : Math.min(...nums);
                      if (nums.filter(v => v === b).length === 1) best = b;
                    }
                    return (
                      <tr key={row.k} style={S.tr}>
                        <td style={S.tdK} title={row.note || ""}>{row.label}</td>
                        {vals.map((v, i) => (
                          <td key={i} style={{ ...S.td, ...(best != null && v === best ? S.tdBest : {}) }}>
                            {fmtVal(row, v)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

            <div style={S.legend}>
              <span style={S.tdBestInline}>{"Green"}</span> {"= the better value (only marked when one is unambiguously higher). In the visual layout,"} <b>{"bar length"}</b> {"is scaled"}
              <b> {"per row"}</b> {"(xG and BPS do not share a scale),"} <b>▼</b> {"marks a number where"} <b>{"lower is better"}</b>{", and signed numbers (Goals − xG) are"}
              <b> {"deviation bars from the centre"}</b>{". A missing number gets \"—\" and"} <b>{"no"}</b> {"bar — a bar of length 0 reads like a measured zero. Numbers FFS shows but no source of ours provides — touches in the box, big chances, dribbles, duels — are"} <b>{"not"}</b> {"here. See section 6b in CLAUDE.md."}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  /* ---- radgjofin ---- */
  adv:{ border:"1px solid #cfe0f0", background:"#f7fbff", borderRadius:9,
        padding:"11px 13px", marginBottom:10 },
  advHead:{ display:"flex", alignItems:"baseline", gap:8, marginBottom:8 },
  advTitle:{ fontSize:14, fontWeight:700, color:"#12456f" },
  advSub:{ fontSize:11, color:C.text3 },
  advBars:{ display:"flex", flexDirection:"column", gap:4 },
  advBarRow:{ display:"grid", gridTemplateColumns:"minmax(78px,132px) 1fr 44px",
              alignItems:"center", gap:8 },
  advName:{ fontSize:12, color:C.text2, overflow:"hidden", textOverflow:"ellipsis",
            whiteSpace:"nowrap" },
  advNameLead:{ fontWeight:700, color:C.text },
  advTrack:{ height:11, background:"#e7edf4", borderRadius:6, overflow:"hidden" },
  advFill:{ height:"100%", borderRadius:6 },
  advPct:{ fontFamily:mono, fontSize:12, textAlign:"right", color:C.text2 },
  advPctLead:{ fontWeight:700, color:"#12456f", fontSize:13 },
  advWhat:{ fontSize:12, color:C.text, lineHeight:1.5, margin:"9px 0 0" },
  advCal:{ fontSize:11, color:C.text2, lineHeight:1.45, margin:"6px 0 0" },
  advWarn:{ fontSize:11.5, color:"#7a5600", background:C.amberBg,
            border:"1px solid #f0dcae", borderRadius:7, padding:"7px 9px",
            margin:"8px 0 0", lineHeight:1.45 },
  advCols:{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 },
  advCol:{ flex:"1 1 150px", minWidth:140, background:"#fff",
           border:`1px solid ${C.border}`, borderRadius:7, padding:"7px 9px" },
  advColHd:{ fontSize:12, fontWeight:700, color:C.text, marginBottom:3 },
  advColSub:{ fontSize:9, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase",
              color:C.text3, margin:"6px 0 2px" },
  advTerm:{ display:"flex", justifyContent:"space-between", gap:6, fontSize:11,
            color:C.text2, padding:"1px 0" },
  advTermL:{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  advTermV:{ fontFamily:mono, fontWeight:700, flex:"0 0 auto" },
  advTermCtx:{ fontFamily:mono, color:C.text3, flex:"0 0 auto" },
  advFoot:{ fontSize:10.5, color:C.text3, lineHeight:1.45, margin:"9px 0 0" },
  /* ---- sjonraena snidid ---- */
  vis:{ display:"flex", flexDirection:"column", gap:2, marginTop:4 },
  vGrp:{ fontSize:10.5, fontWeight:700, letterSpacing:0.6, textTransform:"uppercase",
         color:C.text3, padding:"10px 0 3px", borderBottom:`1px solid ${C.border}`,
         marginBottom:3 },
  vRow:{ display:"grid", gridTemplateColumns:"minmax(96px, 150px) 1fr", gap:8,
         alignItems:"center", padding:"3px 0" },
  vLbl:{ fontSize:11.5, color:C.text2, display:"flex", alignItems:"center", gap:3,
         overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  vLo:{ fontSize:8, color:C.text3, flexShrink:0 },
  vBars:{ display:"flex", flexDirection:"column", gap:2, minWidth:0 },
  vBarLine:{ display:"grid", gridTemplateColumns:"1fr 54px", gap:6, alignItems:"center" },
  vTrack:{ position:"relative", height:11, background:C.cardAlt,
           border:`1px solid ${C.border}`, borderRadius:3, overflow:"hidden" },
  vZero:{ position:"absolute", left:"50%", top:0, bottom:0, width:1,
          background:C.border },
  vFill:{ position:"absolute", top:0, bottom:0, borderRadius:2, minWidth:1 },
  vNum:{ fontFamily:mono, fontSize:11, textAlign:"right", color:C.text2 },
  vNumLead:{ color:C.green, fontWeight:700 },
  seg:{ display:"flex", border:`1px solid ${C.border}`, borderRadius:7, overflow:"hidden" },
  segBtn:{ border:"none", background:"transparent", cursor:"pointer", padding:"4px 8px",
           fontSize:11, color:C.text2, whiteSpace:"nowrap" },
  segOn:{ background:C.purple, color:"#fff", fontWeight:600 },

  wrap:{ position:"fixed", inset:0, background:"rgba(20,20,25,0.5)", zIndex:70,
         display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" },
  panel:{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:14,
          width:"min(880px, 100%)", boxShadow:"0 20px 60px rgba(0,0,0,0.28)" },
  head:{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:8 },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  headCtl:{ display:"flex", alignItems:"center", gap:6 },
  sel:{ border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 7px", fontSize:12 },
  clear:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:6,
          padding:"3px 9px", fontSize:11.5, cursor:"pointer" },
  close:{ border:"none", background:"transparent", fontSize:16, color:C.text2, cursor:"pointer" },
  empty:{ fontSize:12.5, color:C.text2, padding:"18px 4px", lineHeight:1.6 },
  warn:{ fontSize:11.5, color:"#7a5600", background:"#fff6e0", border:"1px solid #f0dcae",
         borderRadius:6, padding:"7px 9px", marginBottom:8 },
  note:{ fontSize:11, color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`,
         borderRadius:6, padding:"7px 9px", marginBottom:9, lineHeight:1.55 },
  scroll:{ overflowX:"auto" },
  tbl:{ borderCollapse:"collapse", width:"100%", fontSize:12 },
  thK:{ width:150, borderBottom:`1px solid ${C.border}` },
  thP:{ padding:"4px 6px", borderBottom:`1px solid ${C.border}`, verticalAlign:"bottom", minWidth:110 },
  pHead:{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 },
  img:{ width:38, height:48, objectFit:"contain" },
  pName:{ fontSize:11.5, fontWeight:700, color:C.text, textAlign:"center" },
  pMeta:{ fontSize:9, color:C.text3, display:"flex", alignItems:"center", gap:3 },
  rm:{ border:"none", background:"transparent", color:C.text3, fontSize:9,
       textDecoration:"underline", cursor:"pointer", padding:0, marginTop:2 },
  grp:{ fontSize:10, fontWeight:700, color:C.purple, textTransform:"uppercase",
        letterSpacing:0.4, padding:"8px 6px 3px", borderBottom:`1px solid ${C.border}` },
  tr:{ borderBottom:"1px solid #f4f4f6" },
  tdK:{ padding:"3px 6px", fontSize:11, color:C.text2, whiteSpace:"nowrap" },
  td:{ padding:"3px 6px", textAlign:"center", fontFamily:mono, fontSize:11.5, color:C.text2 },
  tdBest:{ background:"#e6f9f0", color:"#046b41", fontWeight:700 },
  tdBestInline:{ background:"#e6f9f0", color:"#046b41", fontWeight:700, padding:"0 4px", borderRadius:3 },
  legend:{ fontSize:10.5, color:C.text3, marginTop:9, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.55 },
};
