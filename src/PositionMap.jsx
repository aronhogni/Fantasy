/* ============================================================
   MEDALSTADA PER LEIK — OG ThAD ER EKKI HEATMAP

   BSD SKJALAR `PlayerStat.heatmap` ("list of {x,y} touch coordinates,
   0-100 scale") EN SKILAR HENNI ALDREI: 0 af 15.189 rodum bera reitinn,
   hvorki i /events/{id}/player-stats/ ne /players/{id}/stats/. Skjalfest
   svid sem er ekki afhent — somu aettar og `big_chance_created` (alltaf
   null). Snerti-thettleiki er thvi EKKI til og verdur ekki teiknadur.

   ThAD SEM ER RAUNVERULEGT er `average_positions`: EINN medalpunktur per
   leikmann per leik, 380/380 leikir. Yfir timabil verda thad allt ad 38
   punktar — sky sem synir HVAR hann spilar og HVE BREYTILEGT thad er.
   Thad svarar spurningunni "hvar er hann a vellinum" a theirri upplausn
   sem gognin leyfa, og heitir thvi ThAD sem thad er.

   **X-ASINN ER ANDSTAEDUR VID SKOTAKORTID.** Hér er 0 = EIGID mark og
   100 = mark motherjans (maelt: GK 11,3 · DEF 41,3 · MID 54,1 · FWD 61,6).
   I ShotMap er 0 = markid sem SOTT er ad. Ad rugla theim saman gefur
   spegilmynd sem litur retta ut — nakvaemlega sami flokkur villu og
   ESPN-kvardinn (CLAUDE.md 6b). Sokn er UPP i badum kortum, en thad
   naest med ANDSTAEDRI umbreytingu.
   ============================================================ */
import React, { useMemo } from "react";

const RATIO = 68 / 105;          // breidd : lengd, rett hlutfoll
const C = {
  turf: "#f4f6f4", line: "#c8d2c8", ink: "#2a2f2a", muted: "#8a938a",
  dot: "#7b2d8e", mean: "#37003c",
};

export default function PositionMap({ positions, width = 300, label }) {
  const pts = useMemo(() => (positions || []).filter(
    p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])), [positions]);
  if (pts.length < 5) return null;          // undir 5 leikjum er thetta havadi

  const W = width, H = Math.round(width / RATIO);
  /* Sokn UPP: x=100 (mark motherjans) er EFST, x=0 (eigid mark) nedst. */
  const px = y => (y / 100) * W;
  const py = x => H - (x / 100) * H;

  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  /* Stadalfrávik = HVE FAST hann heldur stodunni. Lítið sd = fastur i
     sinni stodu; hatt sd = faerist mikid milli leikja.                 */
  const sd = Math.sqrt(pts.reduce((s, p) => s + (p[0] - mx) ** 2 + (p[1] - my) ** 2, 0) / pts.length);

  const box = { x: px(21.1), w: px(78.9) - px(21.1) };   // vitateigur: 40,3 m af 68
  const bxD = (16.5 / 105) * H;                          // dypt teigs

  return (
    <div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Average position${label ? " — " + label : ""} over ${pts.length} matches`}
           style={{ display: "block", borderRadius: 6, background: C.turf,
                    border: `1px solid ${C.line}` }}>
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke={C.line} strokeWidth="1" />
        <circle cx={W / 2} cy={H / 2} r={px(9.15)} fill="none" stroke={C.line} strokeWidth="1" />
        {/* teigar: efst = mark motherjans (sokn), nedst = eigid mark */}
        <rect x={box.x} y={0} width={box.w} height={bxD} fill="none" stroke={C.line} />
        <rect x={box.x} y={H - bxD} width={box.w} height={bxD} fill="none" stroke={C.line} />

        {pts.map((p, i) => (
          <circle key={i} cx={px(p[1])} cy={py(p[0])} r="2.6"
                  fill={C.dot} fillOpacity="0.28" />
        ))}
        {/* Medaltalid ofan a — thad er svarid, punktarnir eru dreifingin. */}
        <circle cx={px(my)} cy={py(mx)} r="5.5" fill={C.mean} fillOpacity="0.9" />
        <circle cx={px(my)} cy={py(mx)} r="9" fill="none" stroke={C.mean} strokeOpacity="0.35" />
      </svg>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6,
                    fontSize: 11, color: C.muted, alignItems: "center" }}>
        <span><b style={{ color: C.ink }}>{pts.length}</b> matches</span>
        <span>spread <b style={{ color: C.ink }}>{sd.toFixed(1)}</b></span>
        <span style={{ marginLeft: "auto" }}>one dot = one match · attacking upward</span>
      </div>
    </div>
  );
}
