/* ============================================================
   GWREPORT.JSX — flipinn "Umferðin"

   Skyrsla um SIDUSTU LOKNU umferd. Les tvaer sjalfstaedar skrar ur
   pipeline (data/last_gw.json + data/last_gw_shots.json) — engin porun
   vid players.json a element-id, thvi FPL endurnytir id milli timabila.

   SKOT-KORTID: X i ESPN-fædinu er FJARLAEGD FRA MARKI sem sott er ad
   (maelt — sja hausinn a fetchEspnShots i fetch.mjs), svo badir lid-
   helmingar leggjast a EINN vallarhelming. Thad er RETT framsetning
   fyrir thessi gogn, ekki einfoldun.

   KVARDINN ER MAELDUR, EKKI GISKADUR: x er hlutfall af HALFUM velli
   (52,5 m), svo metrar fra marki = x * 52,5. Sannreynt gegn svaedis-texta
   ESPN sem er ohað hnitunum — markteigs-skot (5,5 m) na x <= 0,110 og
   markteigurinn er 5,5/52,5 = 0,105; teig-skot (16,5 m) na x <= 0,336 og
   teigurinn er 16,5/52,5 = 0,314. Fyrsta utgafan notadi 105 m og setti
   thvi hvert skot i TVOFALDA fjarlaegd — mork lentu vid midjulinu.

   ENGIN FORMULA HER — allt kemur ur src/stats.js.
   ============================================================ */

import React, { useState, useMemo } from "react";
import {
  withDerived, gwTotals, gwTop, bestXi, gwFixtureReports,
  shotsFor, shotSummary, SHOT_KINDS, matchShotsToPlayers,
  teamsWithCleanSheet,
} from "./stats.js";

const POS_COLOR = { GK:"#8b5cf6", DEF:"#2563eb", MID:"#00b96b", FWD:"#d92d3c" };

export default function GwReport({ report, shotsFile, teamById, Crest }) {
  const [tab, setTab] = useState("overview");
  const [fxSel, setFxSel] = useState("all");     // skot-kort: leikur
  const [teamSel, setTeamSel] = useState("all"); // skot-kort: lid

  const rows = useMemo(() => withDerived(report?.players || []), [report]);
  const totals = useMemo(() => ({
    ...gwTotals(rows), teams_cs: teamsWithCleanSheet(report?.fixtures),
  }), [rows, report]);
  const xi = useMemo(() => bestXi(rows), [rows]);
  const fixtures = useMemo(() => gwFixtureReports({ report, shotsFile }), [report, shotsFile]);
  const joined = useMemo(
    () => matchShotsToPlayers(rows, shotsFile?.players || []), [rows, shotsFile]);

  if (!report) {
    /* TOMT ASTAND SEM SKYRIR SIG. Adur stod adeins "Saeki last_gw.json..."
       sem er ogreinanlegt fra "hangir ad eilifu" — notandinn gat ekki vitad
       hvort hann aetti ad bida, endurhlada eda keyra pipeline.              */
    return (
      <section style={S.card}>
        <h2 style={S.h2}>Umferðin</h2>
        <div style={S.blocked}>
          <b>Umferðarskýrslan er ekki komin.</b> Hún kemur úr <code>data/last_gw.json</code>,
          sem pipeline skrifar (<code>deriveLastGwReport</code> í <code>scripts/fetch.mjs</code>).
          <div style={{ marginTop: 6 }}>Þrjár ástæður, í líklegri röð:</div>
          <ol style={S.olTight}>
            <li><b>Skráin er ekki ýtt á GitHub enn.</b> Appið les
              <code> raw.githubusercontent.com/.../main/data/</code> — nýjar pipeline-skrár
              sjást ekki fyrr en þær eru committaðar og ýttar.</li>
            <li><b>Pipeline hefur ekki keyrt</b> síðan skrefið var bætt við.
              Keyrðu <code>node scripts/fetch.mjs</code> eða
              <code> gh workflow run fetch.yml</code>.</li>
            <li><b>Netið/GitHub svarar ekki</b> — endurhlaða síðuna.</li>
          </ol>
          Flipinn <b>Stigatafla</b> virkar óháð þessu, hann les
          <code> players.json</code>.
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
        <Tile k="Assist" v={totals.assists} sub="FPL-skilgreining" />
        <Tile k="Hrein blöð (leikmenn)" v={totals.cs}
          sub={`${totals.teams_cs} lið héldu hreinu`} />
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

      <div style={S.note}>
        <b>Hrein blöð eru talin per LEIKMANN, ekki per lið.</b> FPL veitir hreint blað þeim sem
        spilar 60+ mínútur án þess að fá á sig mark <i>á meðan hann er inni á</i> — svo leikmaður
        sem er tekinn af velli áður en mótherjinn skorar heldur sínu. Dæmi úr þessari umferð:
        Palace skoraði á 89. mínútu gegn Arsenal, og þrír Arsenal-menn sem fóru af velli á undan
        (83., 74. og 61. mín) fá hreint blað þótt liðið hafi fengið á sig mark.
        {" "}<b>Assist fylgja FPL-skilgreiningu</b>, sem er rýmri en Opta — FPL gefur t.d. assist
        fyrir að vinna víti sem er skorað. Í þessari umferð telur FPL {totals.assists} en ESPN 17.
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
  /* Hookar ATH: allir hookar verda ad kallast ADUR en snuid er til baka,
     annars brotnar hook-rodun milli render-a (React rules of hooks).      */
  const teams = useMemo(
    () => [...new Set((shotsFile?.shots || []).map(s => s.team).filter(Boolean))].sort(),
    [shotsFile]);

  if (!shotsFile) {
    return (
      <div style={S.blocked}>
        <b>Skot-gögn eru ekki komin.</b> Pipeline hefur ekki skrifað
        <code> last_gw_shots.json</code> enn (ESPN-hlutinn, <code>fetchEspnShots</code>).
      </div>
    );
  }

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
        <b>Lóðrétti ásinn er fjarlægð frá markinu sem sótt er að</b> — mælt, ekki gefið: í
        CRY 1–2 ARS liggja öll þrjú mörkin nálægt marki þótt sitt hvort liðið skoraði, svo
        bæði lið leggjast á sama vallarhelming. <b>Kvarðinn er kvarðaður</b> gegn svæðis-texta
        ESPN, sem er óháður hnitunum: markteigs-skot nema x≤0,110 og markteigurinn er
        5,5/52,5=0,105; teig-skot nema x≤0,336 og teigurinn er 16,5/52,5=0,314. Þess vegna
        er <b>metrafjöldi = x × 52,5</b>, ekki × 105.
        {sel.excluded > 0 && (
          <> <b style={{ color:"#c98a00" }}>{sel.excluded} skot eru ekki á kortinu</b> — ESPN
          skráði engin hnit fyrir þau (0,0).</>
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

/* VOLLUR — EINN HELMINGUR, i RETTUM STAERDARHLUTFOLLUM.

   ESPN gefur x = fjarlaegd fra markinu sem sott er ad (0..0,5 af vallarlengd)
   og y = thvert yfir vollinn (0..1). Helmingurinn er thvi 52,5 m LANGUR og
   68 m BREIDUR — BREIDARI en hann er langur.

   Thess vegna er MARKID UPPI og sott upp: y (breidd, 68 m) liggur a
   laretta asnum og x (fjarlaegd, 52,5 m) a lodretta. Fyrsta utgafa hafdi
   markid vinstra i 760x480 kassa, sem TOGADI x-asinn (thad synir 52,5 m
   sem 760 px en 68 m sem 480 px) og skot vird thvi fjaerlaegari marki en
   thau voru. Nu er 1 px = sama vegalengd i badar attir.

   Vitateigur: 16,5 m af 52,5 m = 31,4% af haed. Markteigur 5,5 m = 10,5%.
   Teigbreidd 40,3 m af 68 m = 59,3%; markteigsbreidd 18,3 m = 26,9%.     */
const PITCH_M = { half: 52.5, wide: 68, boxDeep: 16.5, boxWide: 40.3,
                  sixDeep: 5.5, sixWide: 18.3, spot: 11 };
function Pitch({ shots }) {
  const SC = 9;                                     // px per metra
  const W = PITCH_M.wide * SC, H = PITCH_M.half * SC;
  const mx = m => (m / PITCH_M.wide) * W;           // metrar thvert -> px
  const my = m => (m / PITCH_M.half) * H;           // metrar fra marki -> px
  /* hnit -> px. x er hlutfall af HALFUM velli (52,5 m) — KVARDAD gegn
     svaedis-texta ESPN, sja hausinn. Fyrsta utgafan margfaldadi med 105 og
     setti hvert skot i TVOFALDA fjarlaegd; mork lentu vid midjulinu.       */
  const px = s => mx(s.y * PITCH_M.wide);
  const py = s => my(s.x * PITCH_M.half);

  const boxX = mx((PITCH_M.wide - PITCH_M.boxWide) / 2);
  const sixX = mx((PITCH_M.wide - PITCH_M.sixWide) / 2);

  return (
    <div style={S.pitchWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} style={S.pitch} role="img"
        aria-label={`Skot-kort, ${shots.length} skot`}>
        <rect x="0" y="0" width={W} height={H} fill="#e9f5ee" />
        <g stroke="#ffffff" strokeWidth="2" fill="none">
          {/* marklina uppi, midlina nidri */}
          <line x1="0" y1="1" x2={W} y2="1" />
          <line x1="0" y1={H-1} x2={W} y2={H-1} strokeDasharray="7 7" />
          <rect x={boxX} y="0" width={mx(PITCH_M.boxWide)} height={my(PITCH_M.boxDeep)} />
          <rect x={sixX} y="0" width={mx(PITCH_M.sixWide)} height={my(PITCH_M.sixDeep)} />
          {/* markid sjalft (7,32 m) */}
          <line x1={mx((PITCH_M.wide - 7.32)/2)} y1="2" x2={mx((PITCH_M.wide + 7.32)/2)} y2="2"
            strokeWidth="5" stroke="#37003c" />
        </g>
        <circle cx={W/2} cy={my(PITCH_M.spot)} r="2.5" fill="#fff" />
        <text x="6" y={H-8} style={S.pitchLbl}>miðja vallar</text>
        <text x="6" y={16} style={S.pitchLbl}>mark</text>

        {/* mork sidast svo their liggi OFAN a hinum */}
        {shots.slice().sort((a, b) => (a.kind === "goal" ? 1 : 0) - (b.kind === "goal" ? 1 : 0))
          .map((s, i) => {
            const k = SHOT_KINDS.find(x => x.key === s.kind);
            const isGoal = s.kind === "goal";
            return (
              <circle key={i} cx={px(s)} cy={py(s)} r={isGoal ? 7 : 5}
                fill={k?.color || "#8b8b95"} fillOpacity={isGoal ? 0.95 : 0.55}
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
            {/* SKOPUN — lesid ur ESPN-texta ("Assisted by X with a cross").
                Thetta er thad sem Fable vildi fa ur FBref (sem svarar 403):
                faeri skopud, krossar og through balls sem LEIDDU TIL SKOTS. */}
            <th style={S.th} title="Færi sköpuð — hversu oft hann lagði upp skot (úr ESPN)">Færi</th>
            <th style={S.th} title="Krossar sem leiddu til skots (úr ESPN)">Kross</th>
            <th style={S.th} title="Through balls sem leiddu til skots (úr ESPN)">Þ.bolti</th>
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
                <td style={S.td}>{r.shot ? (r.shot.chances_created || 0) : "—"}</td>
                <td style={S.td}>{r.shot ? (r.shot.cross_created || 0) : "—"}</td>
                <td style={S.td}>{r.shot ? (r.shot.through_balls || 0) : "—"}</td>
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
  tabOn:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}` },
  archive:{ fontSize:11.5, color:"#7a5600", background:C.amberBg, border:"1px solid #f0dcae",
            borderRadius:6, padding:"7px 9px", margin:"10px 0", lineHeight:1.5 },
  muted:{ fontSize:11.5, color:C.text3, margin:"4px 0", lineHeight:1.45 },
  note:{ fontSize:11, color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`,
         borderRadius:6, padding:"7px 9px", margin:"8px 0", lineHeight:1.55 },
  blocked:{ fontSize:12, color:"#7a5600", background:C.amberBg, border:"1px solid #f0dcae",
            borderRadius:6, padding:"12px", lineHeight:1.6, marginTop:10 },
  olTight:{ margin:"4px 0 6px", paddingLeft:18, lineHeight:1.6 },
  hLbl:{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase",
         letterSpacing:0.4, margin:"14px 0 4px" },

  tiles:{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(112px, 1fr))", gap:6, marginTop:10 },
  tile:{ border:`1px solid ${C.border}`, borderRadius:7, background:C.cardAlt, padding:"6px 8px" },
  tileAmber:{ background:C.amberBg, border:"1px solid #f0dcae" },
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

  pitchWrap:{ marginTop:4, display:"flex", justifyContent:"center" },
  pitch:{ width:"100%", maxWidth:560, height:"auto", border:`1px solid ${C.border}`,
          borderRadius:8, display:"block" },
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
