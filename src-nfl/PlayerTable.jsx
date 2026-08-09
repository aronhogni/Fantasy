/* ============================================================
   PlayerTable.jsx — stora taflan. Les `COLUMNS` og EKKERT ANNAD;
   dalkur sem er tekinn ut ur skranni hverfur hedan sjalfkrafa.
   ============================================================ */

import React, { useMemo, useState, useRef, useCallback } from "react";
import { COLUMNS, COL, DEFAULT_COLS } from "./columns.js";
import * as D from "./data.js";

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"];

export default function PlayerTable({ rows, meta, league }) {
  const [sort, setSort] = useState(() => D.loadState("sort", { key: "vbd", dir: -1 }));
  const [cols, setCols] = useState(() => D.loadState("cols", DEFAULT_COLS));
  const [pos, setPos] = useState(() => D.loadState("posFilter", []));
  const [q, setQ] = useState("");
  const [picker, setPicker] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const wrapRef = useRef(null);

  const save = (k, v, setter) => { setter(v); D.saveState(k, v); };

  const shown = useMemo(() => {
    let out = rows;
    if (pos.length) out = out.filter((r) => pos.includes(r.pos));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      out = out.filter((r) => r.name.toLowerCase().includes(needle) ||
                              (r.team || "").toLowerCase().includes(needle));
    }
    return sortRows(out, sort);
  }, [rows, pos, q, sort]);

  /* Hitakort kvardast INNAN siada hopsins og a P10-P90, ekki min-max.
     Min-max gerir kvardann onothaefan um leid og einn utlagi er i
     mengínu — nakvaemlega sama villa og Haaland olli i FPL-appinu. */
  const scales = useMemo(() => buildScales(shown, cols), [shown, cols]);

  const onScroll = useCallback((e) => {
    setScrolled(e.currentTarget.scrollLeft > 2);
  }, []);

  const activeCols = cols.map((k) => COL[k]).filter(Boolean);

  return (
    <>
      <div className="panel">
        <div className="row">
          <input type="search" placeholder="Search player or team…"
            value={q} onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 220 }} />
          <div className="chips">
            {POSITIONS.map((p) => (
              <button key={p} className={`chip${pos.includes(p) ? " on" : ""}`}
                onClick={() => save("posFilter",
                  pos.includes(p) ? pos.filter((x) => x !== p) : [...pos, p], setPos)}>
                {p}
              </button>
            ))}
            {pos.length > 0 && (
              <button className="chip" onClick={() => save("posFilter", [], setPos)}>
                clear
              </button>
            )}
          </div>
          <div className="spacer" />
          <button className="act" onClick={() => setPicker((v) => !v)}>
            Columns ({cols.length})
          </button>
        </div>

        {picker && (
          <ColumnPicker cols={cols}
            onToggle={(k) => save("cols",
              cols.includes(k) ? cols.filter((x) => x !== k) : [...cols, k], setCols)}
            onReset={() => save("cols", DEFAULT_COLS, setCols)} />
        )}

        <div className="dim" style={{ marginTop: 10, fontSize: 12.5 }}>
          {shown.length} players · {meta.withProj || 0} with a projection ·
          {" "}{meta.withEcr || 0} with expert rank ·
          {" "}{meta.withLast || 0} with 2025 data ·
          {" "}VBD is computed for <b>{league.teams}-team {league.scoring.toUpperCase()}</b>
        </div>
      </div>

      <div className={`tablewrap${scrolled ? " scrolled" : ""}`}
        ref={wrapRef} onScroll={onScroll}>
        <table className="data banded">
          <thead>
            <BandRow cols={activeCols} />
            <tr className="cols">
              {activeCols.map((c) => (
                <th key={c.key} className={`${c.type === "text" ? "txt" : ""}${c.frozen ? " frozen" : ""}`}
                  title={c.note}
                  onClick={() => setSort((s) => nextSort(s, c.key))}>
                  {c.short}{sort.key === c.key ? (sort.dir < 0 ? " ↓" : " ↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 400).map((r, i) => (
              <Row key={r.id} r={r} cols={activeCols} scales={scales}
                prevTier={i > 0 ? shown[i - 1].tier : null} />
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > 400 && (
        <div className="dim" style={{ padding: "8px 2px", fontSize: 12 }}>
          Showing first 400 of {shown.length}. Filter or search to narrow.
        </div>
      )}
    </>
  );
}

/* ---------- hausrod med bondum ---------- */
function BandRow({ cols }) {
  const bands = [];
  for (const c of cols) {
    const last = bands[bands.length - 1];
    if (last && last.band === c.band) last.n++;
    else bands.push({ band: c.band, n: 1 });
  }
  return (
    <tr className="bands">
      {bands.map((b, i) => (
        <th key={i} colSpan={b.n} className={i === 0 ? "frozen" : ""}>{b.band}</th>
      ))}
    </tr>
  );
}

/* ---------- ein rod ---------- */
function Row({ r, cols, scales, prevTier }) {
  const tierBreak = prevTier != null && r.tier != null && r.tier !== prevTier;
  return (
    <tr className={tierBreak ? "tierline" : ""}>
      {cols.map((c) => (
        <Cell key={c.key} c={c} r={r} scale={scales[c.key]} />
      ))}
    </tr>
  );
}

function Cell({ c, r, scale }) {
  const v = r[c.key];

  if (c.key === "name") {
    return (
      <td className="txt frozen">
        <span>{r.name}</span>
        {r.rookie && <span className="badge" style={{ marginLeft: 6 }}>R</span>}
        {r.injury && r.injury !== "Active" && (
          <span className={`badge ${r.injury === "Out" || r.injury === "IR" ? "bad" : "warn"}`}
            style={{ marginLeft: 6 }} title={r.injuryNote || ""}>{r.injury}</span>
        )}
      </td>
    );
  }
  if (c.key === "pos") return <td className="txt"><span className={`pos ${r.pos}`}>{r.pos}</span></td>;
  if (c.type === "text") {
    return <td className="txt">{v == null || v === "" ? <span className="null">—</span> : v}</td>;
  }

  /* NULL ER EKKI NULL — "—" gratt, og rodunin setur thad alltaf
     sidast i BADAR attir (sja `sortRows`). */
  if (v == null || !Number.isFinite(v)) {
    return <td className="mono"><span className="null">—</span></td>;
  }

  const bg = scale ? heat(v, scale, c.hi !== false) : null;
  const cls = c.key === "value" || c.key === "sharpDelta"
    ? (v > 0.5 ? "good" : v < -0.5 ? "bad" : "")
    : "";
  return (
    <td className={`mono ${cls}`} style={bg ? { background: bg } : undefined}>
      {fmt(v, c.key)}
    </td>
  );
}

function fmt(v, key) {
  if (key === "lastTshare" || key === "lastWopr") return v.toFixed(3);
  if (key === "value" || key === "sharpDelta") return (v > 0 ? "+" : "") + v.toFixed(1);
  if (key === "ownedEspn") return v.toFixed(0) + "%";
  if (key === "trendAdd") return v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v);
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

/* ---------- rodun ---------- */
function nextSort(s, key) {
  if (s.key !== key) {
    const c = COL[key];
    /* Sjalfgefna attin fylgir `hi`: dalkur thar sem laegra er betra
       byrjar i vaxandi rod. Ad byrja alltaf nidur a vid setur versta
       ADP-id efst og les eins og villa. */
    return { key, dir: c && c.hi === false ? 1 : -1 };
  }
  return { key, dir: -s.dir };
}

function sortRows(rows, { key, dir }) {
  const out = rows.slice();
  out.sort((a, b) => {
    const x = a[key], y = b[key];
    const xn = x == null || (typeof x === "number" && !Number.isFinite(x));
    const yn = y == null || (typeof y === "number" && !Number.isFinite(y));
    /* Tom gildi ALLTAF sidast, hvor attin sem er. Annars fljota thau
       upp i "asc" og fylla toppinn. */
    if (xn && yn) return 0;
    if (xn) return 1;
    if (yn) return -1;
    if (typeof x === "string") return dir * x.localeCompare(y);
    return dir * (x - y);
  });
  return out;
}

/* ---------- hitakort ---------- */
function buildScales(rows, cols) {
  const out = {};
  for (const key of cols) {
    const c = COL[key];
    if (!c || c.type === "text" || c.hi === null) continue;
    const vals = rows.map((r) => r[key]).filter((v) => v != null && Number.isFinite(v));
    if (vals.length < 12) continue;
    vals.sort((a, b) => a - b);
    out[key] = { lo: vals[Math.floor(vals.length * 0.10)],
                 hi: vals[Math.floor(vals.length * 0.90)] };
  }
  return out;
}

/**
 * ADEINS efsti og nedsti fjordungur eru litadir. Vaeri allt litad
 * yrdi taflan flis thar sem tonarnir benda ekki a neitt.
 * `higherBetter === false` SNYR kvardanum.
 */
function heat(v, { lo, hi }, higherBetter) {
  if (hi === lo) return null;
  let t = (v - lo) / (hi - lo);
  t = Math.max(0, Math.min(1, t));
  if (!higherBetter) t = 1 - t;
  if (t > 0.75) return `rgba(53,196,122,${(t - 0.75) * 0.62})`;
  if (t < 0.25) return `rgba(242,96,76,${(0.25 - t) * 0.62})`;
  return null;
}

/* ---------- dalkavalari ---------- */
function ColumnPicker({ cols, onToggle, onReset }) {
  const bands = [];
  for (const c of COLUMNS) {
    const last = bands[bands.length - 1];
    if (last && last.band === c.band) last.items.push(c);
    else bands.push({ band: c.band, items: [c] });
  }
  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
      {bands.map((b, i) => (
        <div key={i} style={{ marginBottom: 9 }}>
          <div className="dimmer" style={{ fontSize: 10.5, textTransform: "uppercase",
            letterSpacing: ".8px", marginBottom: 4 }}>{b.band || "Identity"}</div>
          <div className="chips">
            {b.items.map((c) => (
              <button key={c.key} className={`chip${cols.includes(c.key) ? " on" : ""}`}
                title={c.note} onClick={() => onToggle(c.key)}>{c.label}</button>
            ))}
          </div>
        </div>
      ))}
      <button className="act" onClick={onReset}>Reset to default</button>
    </div>
  );
}
