/* ============================================================
   GWREPORT.JSX — flipinn "Umferðin"

   Skyrsla um SIDUSTU LOKNU umferd. Les tvaer sjalfstaedar skrar ur
   pipeline (data/last_gw.json + data/last_gw_shots.json) — engin porun
   vid players.json a element-id, thvi FPL endurnytir id milli timabila.

   SKOT-KORTID: X i ESPN-fædinu er FJARLAEGD FRA MARKI sem sott er ad
   (maelt — sja hausinn a fetchEspnShots i fetch.mjs), svo badir lid-
   helmingar leggjast a EINN vallarhelming. Thad er RETT framsetning
   fyrir thessi gogn, ekki einfoldun.

   Skot med otraustum hnitum (X>0,5, oll langskot) eru EKKI plottud og
   EKKI spegluð — thau eru TALIN og talan birt. Ad spegla thau vaeri
   agiskun um hnitakerfi sem vid staðfestum ekki.

   ENGIN FORMULA HER — allt kemur ur src/stats.js.
   ============================================================ */

import React, { useState, useMemo } from "react";
import {
  withDerived, gwTotals, gwTop, bestXi, gwFixtureReports,
  shotsFor, shotSummary, SHOT_KINDS, matchShotsToPlayers, POS_ORDER,
} from "./stats.js";

const POS_COLOR = { GK:"#8b5cf6", DEF:"#2563eb", MID:"#00b96b", FWD:"#d92d3c" };
const POS_IS = { GK:"Markv.", DEF:"Vörn", MID:"Miðja", FWD:"Sókn" };

export default function GwReport({ report, shotsFile, teamById, Crest }) {
  const [tab, setTab] = useState("overview");
  const [fxSel, setFxSel] = useState("all");     // skot-kort: leikur
  const [teamSel, setTeamSel] = useState("all"); // skot-kort: lid

  const rows = useMemo(() => withDerived(report?.players || []), [report]);
  const totals = useMemo(() => gwTotals(rows), [rows]);
  const xi = useMemo(() => bestXi(rows), [rows]);
  const fixtures = useMemo(() => gwFixtureReports({ report, shotsFile }), [report, shotsFile]);
  const joined = useMemo(
    () => matchShotsToPlayers(rows, shotsFile?.players || []), [rows, shotsFile]);

  if (!report) {
    return (
      <section style={S.card}>
        <h2 style={S.h2}>Umferðin</h2>
        <div style={S.muted}>
          Sæki <code>last_gw.json</code>… Ef hún kemur ekki hefur pipeline ekki keyrt
          <b> deriveLastGwReport</b> enn.
        </div>
      </section>
    );
  }

  const TABS = [
    ["overview", "Yfirlit"],
    ["shots", `Skot-kort${shotsFile ? ` (${shotsFile.shots?.length ?? 0})` : ""}`],
    ["players", "Leikmenn"],
    ["matches", `Leikirnir (${fixtures.length})`],
  ];

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <h2 style={S.h2}>
            Umferðin — GW{report.gw}
            <span style={S.season}>{report.season}</span>
          </h2>
          <div style={S.sub}>
            {totals.players} leikmenn með tölur · {totals.goals} mörk · {totals.assists} assist ·
            {" "}{totals.cs} hrein blöð · meðalstig {totals.avg_points}
          </div>
        </div>
        <div style={S.tabs}>
          {TABS.map(([k, l]) => (
            <button key={k} style={{ ...S.tabBtn, ...(tab === k ? S.tabOn : {}) }}
              onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {report.archive && (
        <div style={S.archive}>
          <b>Þetta er síðasta LOKNA umferðin, ekki yfirstandandi.</b> {report.note}
        </div>
      )}

      {tab === "overview" && <Overview totals={totals} rows={rows} xi={xi}
        teamById={teamById} Crest={Crest} shotsFile={shotsFile} />}

      {tab === "shots" && <ShotTab shotsFile={shotsFile} fixtures={fixtures}
        fxSel={fxSel} setFxSel={setFxSel} teamSel={teamSel} setTeamSel={setTeamSel}
        teamById={teamById} Crest={Crest} />}

      {tab === "players" && <PlayerTab joined={joined} teamById={teamById} Crest={Crest} />}

      {tab === "matches" && <MatchTab fixtures={fixtures} teamById={teamById} Crest={Crest} />}
    </section>
  );
}

/* ================= YFIRLIT ================= */
function Overview({ totals, rows, xi, teamById, Crest, shotsFile }) {
  const shotSum = useMemo(() => shotSummary(shotsFile?.shots || []), [shotsFile]);
  const over  = gwTop(rows, "gi_minus_xgi", 6, { hi: true,  minMinutes: 30 });
  const under = gwTop(rows, "gi_minus_xgi", 6, { hi: false, minMinutes: 30 });

  return (
    <>
      <div style={S.tiles}>
        <Tile k="Mörk" v={totals.goals} sub={`${totals.og} sjálfsmörk`} />
        <Tile k="Assist" v={totals.assists} />
        <Tile k="Hrein blöð" v={totals.cs} />
        <Tile k="Vörslur" v={totals.saves} />
        <Tile k="Spjöld" v={`${totals.yellow}G / ${totals.red}R`} />
        <Tile k="Bónus gefinn" v={totals.bonus} />
        <Tile k="xG samtals" v={totals.xg.toFixed(1)} sub={`raun ${totals.goals}`} />
        <Tile k="xA samtals" v={totals.xa.toFixed(1)} sub={`raun ${totals.assists}`} />
        <Tile k="10+ stiga leikir" v={totals.hauls} />
        <Tile k="Blönk (60+ mín, ≤2 stig)" v={totals.blanks} />
        {shotsFile && <>
          <Tile k="Skot" v={shotSum.total} sub={`${shotSum.in_box} í teig`} />
          <Tile k="Skot á mark" v={shotSum.on_target_total} sub={`${shotSum.accuracy}% nýting`} />
          <Tile k="Í stöng/slá" v={shotSum.woodwork} tone="amber" />
          <Tile k="Blokkuð skot" v={shotSum.blocked} />
        </>}
      </div>

      <H>Lið vikunnar — {xi.points} stig</H>
      <div style={S.muted}>
        Besta leyfilega FPL-uppstilling úr umferðinni (1 markv. · 3–5 vörn · 2–5 miðja · 1–3 sókn).
        Ekki FPL-„Dream Team“ heldur reiknað úr sömu tölum.
      </div>
      <div style={S.xiWrap}>
        {["GK","DEF","MID","FWD"].map(pos => {
          const line = xi.xi.filter(r => r.pos === pos);
          if (!line.length) return null;
          return (
            <div key={pos} style={S.xiLine}>
              {line.map(r => <XiCard key={r.name + r.fixture} r={r} teamById={teamById} Crest={Crest} />)}
            </div>
          );
        })}
      </div>

      <div style={S.two}>
        <div>
          <H>Yfir væntingum</H>
          <div style={S.muted}>Mörk + assist mínus xGI. Klínísk nýting eða heppni.</div>
          <RankList rows={over} val={r => signed(r.gi_minus_xgi)} teamById={teamById} Crest={Crest} />
        </div>
        <div>
          <H>Undir væntingum</H>
          <div style={S.muted}>Færin voru þarna en fóru ekki inn.</div>
          <RankList rows={under} val={r => signed(r.gi_minus_xgi)} teamById={teamById} Crest={Crest} />
        </div>
      </div>

      <div style={S.two}>
        <div>
          <H>Stigahæstir</H>
          <RankList rows={gwTop(rows, "points", 8)} val={r => r.points} teamById={teamById} Crest={Crest} />
        </div>
        <div>
          <H>BPS — bónus-stigin</H>
          <div style={S.muted}>BPS ræður hverjir fá 3/2/1 bónus.</div>
          <RankList rows={gwTop(rows, "bps", 8)} val={r => r.bps}
            extra={r => `${r.bonus} bónus`} teamById={teamById} Crest={Crest} />
        </div>
      </div>

      <div style={S.two}>
        <div>
          <H>Varnarframlag (DC)</H>
          <RankList rows={gwTop(rows, "dc", 8)} val={r => r.dc} teamById={teamById} Crest={Crest} />
        </div>
        <div>
          <H>Vörslur</H>
          <RankList rows={gwTop(rows, "saves", 8)} val={r => r.saves} teamById={teamById} Crest={Crest} />
        </div>
      </div>
    </>
  );
}

/* ================= SKOT-KORT ================= */
function ShotTab({ shotsFile, fixtures, fxSel, setFxSel, teamSel, setTeamSel, teamById, Crest }) {
  if (!shotsFile) {
    return (
      <div style={S.blocked}>
        <b>Skot-gögn eru ekki komin.</b> Pipeline hefur ekki skrifað
        <code> last_gw_shots.json</code> enn (ESPN-hlutinn, <code>fetchEspnShots</code>).
      </div>
    );
  }
  const teams = useMemo(
    () => [...new Set((shotsFile.shots || []).map(s => s.team).filter(Boolean))].sort(),
    [shotsFile]);

  const sel = shotsFor(shotsFile.shots, {
    fixture: fxSel === "all" ? null : +fxSel,
    team: teamSel === "all" ? null : teamSel,
  });
  const sum = shotSummary(sel.all);

  return (
    <>
      <div style={S.filters}>
        <select style={S.select} value={fxSel} onChange={e => setFxSel(e.target.value)}>
          <option value="all">Allir leikir</option>
          {fixtures.map(f => (
            <option key={f.fx.id} value={f.fx.id}>
              {f.fx.h} {f.fx.h_score}–{f.fx.a_score} {f.fx.a}
            </option>
          ))}
        </select>
        <select style={S.select} value={teamSel} onChange={e => setTeamSel(e.target.value)}>
          <option value="all">Öll lið</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div style={S.legendRow}>
          {SHOT_KINDS.filter(k => sum[k.key] > 0).map(k => (
            <span key={k.key} style={S.legItem}>
              <i style={{ ...S.dot, background: k.color }} />{k.label} {sum[k.key]}
            </span>
          ))}
        </div>
      </div>

      <Pitch shots={sel.usable} />

      <div style={S.note}>
        <b>X-ásinn er fjarlægð frá markinu sem sótt er að</b> — mælt, ekki gefið: í CRY 1–2 ARS
        liggja öll þrjú mörkin á lágu X þótt sitt hvort liðið skoraði. Þess vegna leggjast bæði
        lið á sama vallarhelming; það er rétt framsetning fyrir þessi gögn.
        {sel.excluded > 0 && (
          <> <b style={{ color:"#c98a00" }}>{sel.excluded} skot eru ekki á kortinu</b> — hnitin
          voru ótraust (X&gt;0,5, öll langskot). Þau eru <b>ekki</b> speglað inn, því það væri
          ágiskun um hnitakerfi sem við staðfestum ekki.</>
        )}
      </div>

      <div style={S.tiles}>
        <Tile k="Skot" v={sum.total} />
        <Tile k="Á mark" v={sum.on_target_total} sub={`${sum.accuracy ?? "—"}% nýting`} />
        <Tile k="Mörk" v={sum.goal} />
        <Tile k="Í stöng/slá" v={sum.woodwork} tone="amber" />
        <Tile k="Blokkuð" v={sum.blocked} />
        <Tile k="Framhjá" v={sum.off_target} />
        <Tile k="Í teig" v={sum.in_box} sub={`${sum.outside} fyrir utan`} />
        <Tile k="Hægri / vinstri / haus" v={`${sum.right}/${sum.left}/${sum.head}`} />
      </div>

      <H>Skotin</H>
      <div style={S.scroll}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.thL}>Mín</th><th style={S.thL}>Lið</th><th style={S.thL}>Leikmaður</th>
            <th style={S.thL}>Útkoma</th><th style={S.thL}>Svæði</th><th style={S.thL}>Fótur</th>
            <th style={S.th}>X</th><th style={S.th}>Y</th>
          </tr></thead>
          <tbody>
            {sel.all.slice(0, 120).map((s, i) => {
              const k = SHOT_KINDS.find(x => x.key === s.kind);
              return (
                <tr key={i} style={S.tr}>
                  <td style={S.tdL}>{s.minute || "—"}</td>
                  <td style={S.tdL}>{s.team || "—"}</td>
                  <td style={S.tdL}>{s.player || "—"}</td>
                  <td style={{ ...S.tdL, color: k?.color, fontWeight:600 }}>{k?.label || s.kind}</td>
                  <td style={S.tdL}>{ZONE_IS[s.zone] || "—"}</td>
                  <td style={S.tdL}>{FOOT_IS[s.foot] || "—"}</td>
                  <td style={{ ...S.td, opacity: s.usable ? 1 : 0.45 }}>
                    {s.x == null ? "—" : s.x.toFixed(3)}{!s.usable && "*"}
                  </td>
                  <td style={{ ...S.td, opacity: s.usable ? 1 : 0.45 }}>
                    {s.y == null ? "—" : s.y.toFixed(3)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sel.all.length > 120 && <div style={S.muted}>Fyrstu 120 af {sel.all.length} sýnd.</div>}
      <div style={S.muted}>* ótraust hnit — ekki á kortinu.</div>
    </>
  );
}

const ZONE_IS = {
  box_centre:"Miðja teigs", box_left:"Vinstri teig", box_right:"Hægri teig",
  close_range:"Nærfæri", penalty_spot:"Vítapunktur", outside:"Utan teigs", far:"35+ yardar",
};
const FOOT_IS = { left:"Vinstri", right:"Hægri", head:"Haus" };

/* Vollur: EINN helmingur. x=0 er markid sem sott er ad -> vid setjum
   markid VINSTRA og latum x vaxa til haegri. y er thvert yfir vollinn. */
function Pitch({ shots }) {
  const W = 760, H = 480, PAD = 8;
  const px = s => PAD + (s.x / 0.5) * (W - PAD * 2);   // 0..0.5 -> full breidd
  const py = s => PAD + s.y * (H - PAD * 2);
  return (
    <div style={S.pitchWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} style={S.pitch} role="img"
        aria-label={`Skot-kort, ${shots.length} skot`}>
        <rect x="0" y="0" width={W} height={H} fill="#e9f5ee" />
        {/* markteigur og vitateigur, malad fra vinstri (markid) */}
        <g stroke="#ffffff" strokeWidth="2" fill="none">
          <rect x={PAD} y={PAD} width={W - PAD*2} height={H - PAD*2} />
          <rect x={PAD} y={H*0.21} width={(W-PAD*2)*0.33} height={H*0.58} />
          <rect x={PAD} y={H*0.36} width={(W-PAD*2)*0.12} height={H*0.28} />
          <line x1={W-PAD} y1={PAD} x2={W-PAD} y2={H-PAD} strokeDasharray="6 6" />
          <circle cx={(W-PAD*2)*0.22} cy={H/2} r="3" fill="#fff" stroke="none" />
        </g>
        <text x={PAD+6} y={H-14} style={S.pitchLbl}>mark</text>
        <text x={W-PAD-90} y={H-14} style={S.pitchLbl}>miðja vallar</text>
        {shots.map((s, i) => {
          const k = SHOT_KINDS.find(x => x.key === s.kind);
          const isGoal = s.kind === "goal";
          return (
            <circle key={i} cx={px(s)} cy={py(s)} r={isGoal ? 8 : 5.5}
              fill={k?.color || "#8b8b95"} fillOpacity={isGoal ? 0.95 : 0.6}
              stroke={isGoal ? "#02402a" : "none"} strokeWidth={isGoal ? 2 : 0}>
              <title>{`${s.minute || ""} ${s.player || ""} (${s.team || ""}) — ${k?.label || s.kind}`
                + `${s.zone ? " · " + (ZONE_IS[s.zone] || s.zone) : ""}`
                + `${s.foot ? " · " + (FOOT_IS[s.foot] || s.foot) : ""}`}</title>
            </circle>
          );
        })}
      </svg>
      {!shots.length && <div style={S.muted}>Engin skot með nothæfum hnitum í þessu vali.</div>}
    </div>
  );
}

/* ================= LEIKMENN ================= */
function PlayerTab({ joined, teamById, Crest }) {
  const [sort, setSort] = useState("points");
  const COLS = [
    ["points","Stig"], ["minutes","Mín"], ["goals","M"], ["assists","A"],
    ["xg","xG"], ["xa","xA"], ["gi_minus_xgi","M+A−xGI"],
    ["bps","BPS"], ["bonus","Bón"], ["dc","DC"], ["saves","Vörsl"],
  ];
  const rows = useMemo(() => joined.rows.slice().sort((a,b) =>
    (b[sort] ?? -1e9) - (a[sort] ?? -1e9)), [joined, sort]);

  return (
    <>
      <div style={S.muted}>
        Skot-dálkarnir koma úr ESPN og eru paraðir við FPL á eftirnafni + liði.
        <b> {joined.matched}</b> leikmenn pöruðust, <b>{joined.unmatched}</b> ekki
        (þeir hafa engar skot-tölur, ekki núll).
      </div>
      <div style={S.scroll}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.thL}>Leikmaður</th><th style={S.thL}>Lið</th><th style={S.thL}>Á móti</th>
            {COLS.map(([k,l]) => (
              <th key={k} style={{ ...S.th, cursor:"pointer", color: sort===k ? "#37003c" : undefined }}
                onClick={() => setSort(k)}>{l}</th>
            ))}
            <th style={S.th} title="Úr ESPN">Skot</th>
            <th style={S.th} title="Úr ESPN">Á mark</th>
            <th style={S.th} title="Úr ESPN">Stöng</th>
            <th style={S.th} title="Úr ESPN">Í teig</th>
          </tr></thead>
          <tbody>
            {rows.slice(0, 250).map((r, i) => (
              <tr key={i} style={S.tr}>
                <td style={S.tdL}>
                  <span style={{ ...S.posTag, color: POS_COLOR[r.pos] }}>{r.pos}</span> {r.name}
                </td>
                <td style={S.tdL}>{r.team}</td>
                <td style={S.tdL}>{r.opp}{r.home ? "" : " (ú)"}</td>
                {COLS.map(([k]) => <td key={k} style={S.td}>{fmt(r[k])}</td>)}
                <td style={S.td}>{r.shot ? r.shot.shots : "—"}</td>
                <td style={S.td}>{r.shot ? r.shot.on_target : "—"}</td>
                <td style={S.td}>{r.shot ? (r.shot.woodwork || 0) : "—"}</td>
                <td style={S.td}>{r.shot ? r.shot.in_box : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 250 && <div style={S.muted}>Fyrstu 250 af {rows.length}.</div>}
    </>
  );
}

/* ================= LEIKIRNIR ================= */
function MatchTab({ fixtures, teamById, Crest }) {
  return (
    <div style={S.mGrid}>
      {fixtures.map(f => {
        const e0 = f.e0, eh = f.espn?.h, ea = f.espn?.a;
        return (
          <div key={f.fx.id} style={S.mCard}>
            <div style={S.mHead}>
              <b>{f.fx.h}</b>
              <span style={S.mScore}>{f.fx.h_score}–{f.fx.a_score}</span>
              <b>{f.fx.a}</b>
            </div>
            {(f.formation_h || f.formation_a) && (
              <div style={S.mForm}>{f.formation_h || "?"} · uppstilling · {f.formation_a || "?"}</div>
            )}
            <MRow l="xG (úr FPL, lagt saman)" h={f.xg_h?.toFixed(2)} a={f.xg_a?.toFixed(2)} />
            <MRow l="Skot" h={f.shots_h.total} a={f.shots_a.total} />
            <MRow l="Á mark" h={f.shots_h.on_target_total} a={f.shots_a.on_target_total} />
            <MRow l="Í teig" h={f.shots_h.in_box} a={f.shots_a.in_box} />
            <MRow l="Í stöng/slá" h={f.shots_h.woodwork} a={f.shots_a.woodwork} />
            {e0 && <>
              <div style={S.mSrc}>úr E0</div>
              <MRow l="Skot (E0)" h={e0.shots_h} a={e0.shots_a} />
              <MRow l="Á mark (E0)" h={e0.sot_h} a={e0.sot_a} />
              <MRow l="Hornspyrnur" h={e0.corners_h} a={e0.corners_a} />
              <MRow l="Brot" h={e0.fouls_h} a={e0.fouls_a} />
              {e0.referee && <div style={S.mRef}>Dómari: {e0.referee}</div>}
            </>}
            {eh && <>
              <div style={S.mSrc}>úr ESPN</div>
              <MRow l="Vald á bolta %" h={eh.possessionPct} a={ea?.possessionPct} />
              <MRow l="Sendingar" h={eh.totalPasses} a={ea?.totalPasses} />
              <MRow l="Nákvæmni %" h={pct(eh.passPct)} a={pct(ea?.passPct)} />
              <MRow l="Krossar" h={eh.totalCrosses} a={ea?.totalCrosses} />
              <MRow l="Tacklingar" h={eh.totalTackles} a={ea?.totalTackles} />
              <MRow l="Rof" h={eh.interceptions} a={ea?.interceptions} />
              <MRow l="Hreinsanir" h={eh.totalClearance} a={ea?.totalClearance} />
              <MRow l="Rangstöður" h={eh.offsides} a={ea?.offsides} />
            </>}
            {f.star && (
              <div style={S.mStar}>
                Stjarna: <b>{f.star.name}</b> ({f.star.team}) — {f.star.points} stig, {f.star.bps} BPS
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
function MRow({ l, h, a }) {
  const hv = h == null || h === "" ? "—" : h, av = a == null || a === "" ? "—" : a;
  const hi = Number.isFinite(+h) && Number.isFinite(+a);
  return (
    <div style={S.mLine}>
      <span style={{ ...S.mNum, fontWeight: hi && +h > +a ? 700 : 400 }}>{hv}</span>
      <span style={S.mLbl}>{l}</span>
      <span style={{ ...S.mNum, fontWeight: hi && +a > +h ? 700 : 400 }}>{av}</span>
    </div>
  );
}
const pct = v => v == null ? null : (v <= 1 ? Math.round(v * 100) : Math.round(v));

/* ================= smaahlutar ================= */
const fmt = v => v == null || !Number.isFinite(v) ? "—"
  : Number.isInteger(v) ? String(v) : v.toFixed(2);
const signed = v => v == null ? "—" : (v > 0 ? "+" : "") + v.toFixed(2);

function H({ children }) { return <div style={S.hLbl}>{children}</div>; }
function Tile({ k, v, sub, tone }) {
  return (
    <div style={{ ...S.tile, ...(tone === "amber" ? S.tileAmber : {}) }}>
      <div style={S.tileV}>{v ?? "—"}</div>
      <div style={S.tileK}>{k}</div>
      {sub && <div style={S.tileS}>{sub}</div>}
    </div>
  );
}
function XiCard({ r, teamById, Crest }) {
  return (
    <div style={S.xiCard} title={`${r.name} — ${r.points} stig, ${r.bps} BPS`}>
      <div style={{ ...S.xiPos, background: POS_COLOR[r.pos] }}>{r.pos}</div>
      <div style={S.xiName}>{r.name}</div>
      <div style={S.xiTeam}>{r.team} {r.home ? "v" : "@"} {r.opp}</div>
      <div style={S.xiPts}>{r.points}</div>
    </div>
  );
}
function RankList({ rows, val, extra, teamById, Crest }) {
  if (!rows?.length) return <div style={S.muted}>Engar tölur.</div>;
  return (
    <div style={S.rl}>
      {rows.map((r, i) => (
        <div key={r.name + i} style={S.rlRow}>
          <span style={S.rlN}>{i + 1}</span>
          <span style={{ ...S.posTag, color: POS_COLOR[r.pos] }}>{r.pos}</span>
          <span style={S.rlName}>{r.name}</span>
          <span style={S.rlTeam}>{r.team}</span>
          {extra && <span style={S.rlExtra}>{extra(r)}</span>}
          <span style={S.rlVal}>{val(r)}</span>
        </div>
      ))}
    </div>
  );
}

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", amberBg:"#fff6e0", red:"#d92d3c",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

const S = {
  card:{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:12 },
  head:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple, display:"flex", alignItems:"center", gap:8 },
  season:{ fontSize:11, fontWeight:600, color:C.text2, background:C.cardAlt,
           border:`1px solid ${C.border}`, borderRadius:4, padding:"1px 6px" },
  sub:{ fontSize:11.5, color:C.text2, marginTop:4 },
  tabs:{ display:"flex", gap:4, flexWrap:"wrap" },
  tabBtn:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:6,
           padding:"4px 10px", fontSize:12, fontWeight:600, cursor:"pointer" },
  tabOn:{ background:C.purple, color:"#fff", borderColor:C.purple },
  archive:{ fontSize:11.5, color:"#7a5600", background:C.amberBg, border:"1px solid #f0dcae",
            borderRadius:6, padding:"7px 9px", margin:"10px 0", lineHeight:1.5 },
  muted:{ fontSize:11.5, color:C.text3, margin:"4px 0", lineHeight:1.45 },
  note:{ fontSize:11, color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`,
         borderRadius:6, padding:"7px 9px", margin:"8px 0", lineHeight:1.55 },
  blocked:{ fontSize:12, color:"#7a5600", background:C.amberBg, border:"1px solid #f0dcae",
            borderRadius:6, padding:"12px", lineHeight:1.6, marginTop:10 },
  hLbl:{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase",
         letterSpacing:0.4, margin:"14px 0 4px" },

  tiles:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(112px, 1fr))", gap:6, marginTop:10 },
  tile:{ border:`1px solid ${C.border}`, borderRadius:7, background:C.cardAlt, padding:"6px 8px" },
  tileAmber:{ background:C.amberBg, borderColor:"#f0dcae" },
  tileV:{ fontSize:17, fontWeight:700, color:C.text, fontFamily:mono, lineHeight:1.1 },
  tileK:{ fontSize:9.5, color:C.text2, marginTop:2, lineHeight:1.25 },
  tileS:{ fontSize:9, color:C.text3, marginTop:1 },

  xiWrap:{ display:"flex", flexDirection:"column", gap:6, marginTop:6 },
  xiLine:{ display:"flex", gap:6, flexWrap:"wrap" },
  xiCard:{ flex:"1 1 120px", minWidth:110, border:`1px solid ${C.border}`, borderRadius:7,
           background:C.cardAlt, padding:"5px 7px", position:"relative" },
  xiPos:{ position:"absolute", top:5, right:6, color:"#fff", fontSize:8, fontWeight:700,
          borderRadius:3, padding:"1px 4px" },
  xiName:{ fontSize:11.5, fontWeight:600, color:C.text, paddingRight:26,
           overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  xiTeam:{ fontSize:9.5, color:C.text3, marginTop:1 },
  xiPts:{ fontSize:14, fontWeight:700, color:C.green, fontFamily:mono },

  two:{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:14 },
  rl:{ display:"flex", flexDirection:"column", gap:1, marginTop:2 },
  rlRow:{ display:"flex", alignItems:"center", gap:5, padding:"2px 0",
          borderBottom:"1px solid #f4f4f6" },
  rlN:{ fontSize:10, color:C.text3, width:14, fontFamily:mono },
  rlName:{ fontSize:11.5, color:C.text, flex:1, minWidth:0, overflow:"hidden",
           textOverflow:"ellipsis", whiteSpace:"nowrap" },
  rlTeam:{ fontSize:9.5, color:C.text3 },
  rlExtra:{ fontSize:9.5, color:C.text3 },
  rlVal:{ fontSize:11.5, fontWeight:700, color:C.text, fontFamily:mono, minWidth:44, textAlign:"right" },
  posTag:{ fontSize:8.5, fontWeight:700, minWidth:22 },

  filters:{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", margin:"10px 0 8px" },
  select:{ border:`1px solid ${C.border}`, borderRadius:5, padding:"3px 6px", fontSize:11.5 },
  legendRow:{ display:"flex", gap:8, flexWrap:"wrap", marginLeft:"auto" },
  legItem:{ display:"flex", alignItems:"center", gap:3, fontSize:10, color:C.text2 },
  dot:{ width:8, height:8, borderRadius:"50%", display:"inline-block" },

  pitchWrap:{ marginTop:4 },
  pitch:{ width:"100%", height:"auto", border:`1px solid ${C.border}`, borderRadius:8, display:"block" },
  pitchLbl:{ fontSize:11, fill:"#8b8b95" },

  scroll:{ overflowX:"auto", marginTop:4 },
  table:{ borderCollapse:"collapse", width:"100%", fontSize:11.5 },
  th:{ textAlign:"right", padding:"4px 5px", fontSize:9.5, fontWeight:700, color:C.text2,
       borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" },
  thL:{ textAlign:"left", padding:"4px 5px", fontSize:9.5, fontWeight:700, color:C.text2,
        borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" },
  tr:{ borderBottom:"1px solid #f4f4f6" },
  td:{ textAlign:"right", padding:"3px 5px", fontFamily:mono, color:C.text2, whiteSpace:"nowrap" },
  tdL:{ textAlign:"left", padding:"3px 5px", color:C.text, whiteSpace:"nowrap" },

  mGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(268px, 1fr))", gap:8, marginTop:10 },
  mCard:{ border:`1px solid ${C.border}`, borderRadius:8, background:C.cardAlt, padding:"8px 10px" },
  mHead:{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6,
          fontSize:12.5, color:C.text, paddingBottom:4, borderBottom:`1px solid ${C.border}` },
  mScore:{ fontFamily:mono, fontWeight:700, fontSize:14, color:C.purple },
  mForm:{ fontSize:9.5, color:C.text3, textAlign:"center", padding:"3px 0" },
  mLine:{ display:"flex", alignItems:"center", gap:6, padding:"1px 0" },
  mNum:{ fontFamily:mono, fontSize:11, color:C.text, minWidth:38, textAlign:"center" },
  mLbl:{ flex:1, fontSize:10, color:C.text2, textAlign:"center" },
  mSrc:{ fontSize:8.5, color:C.text3, textTransform:"uppercase", letterSpacing:0.5,
         marginTop:5, paddingTop:3, borderTop:"1px dashed #e4e4e8" },
  mRef:{ fontSize:9.5, color:C.text3, marginTop:3 },
  mStar:{ fontSize:10, color:C.text2, marginTop:6, paddingTop:5,
          borderTop:`1px solid ${C.border}` },
};
