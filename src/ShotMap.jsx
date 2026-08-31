/* ============================================================
   SKOTAKORT PER LEIKMANN — BSD, 2025/26

   ThETTA ER FYRSTA SKOTAKORTID I REPO-INU MED xG PER SKOT. ESPN-kortid i
   Umferdinni (6b) hefur hnit EN ENGA xG, sem er einmitt talan sem gerir
   skotakort ad upplysingum i stad punktaskys.

   KVORDUNIN KEMUR UR GOGNUNUM, EKKI UR REGLUGERD.
   Vollurinn er teiknadur eftir `calib` i `bsd_shots.json`, sem er MAELT
   ur somu skotum og eru teiknud ofan a hann:
     vitapunktur x 11,5  — MEDALTAL 92 vitaspyrna (y = 50,00 hja OLLUM)
     teigur      x 17    — fittad gegn `shots_inside_box`, MAE 0,133
     teigsbreidd y 20,4-79,6 — 99,5% teigsskota falla thar innan
   Astaedan er villan sem ESPN-kortid hafdi (6b): fyrsta utgafan margfaldadi
   med 105 i stad 52,5 og setti HVERT SKOT i tvofalda fjarlaegd — mork birtust
   uppi vid midjulinu. Teikni madur vollinn eftir SOMU tolum og punktarnir
   nota getur thad ekki gerst.

   **BSD-x ER ANNAR KVARDI EN ESPN-x** (hlutfall af FULLUM velli, 105 m, a
   moti halfum). Ekki flytja reglur milli theirra — sja 6t.
   ============================================================ */
import { useMemo } from "react";

/* Teiknum fra marklinu og 40 einingar ut (=42 m af 105) — thar liggja
   99,5% skota. Rett hlutfoll: 68 m breidd a moti 42 m dypt.          */
const DEPTH = 40;
const RATIO = 42 / 68;

const C = {
  turf: "#f4f6f4", line: "#c8d2c8", ink: "#2a2f2a", muted: "#8a938a",
  goal: "#1f9d55", post: "#d98324", other: "#9aa39a", ring: "#5b655b",
};

export default function ShotMap({ shots, calib, width = 300, label }) {
  const W = width, H = Math.round(width * RATIO);
  const cal = calib || {};
  const boxX = cal.box_x ?? 17;
  const [byLo, byHi] = cal.box_y ?? [20.4, 79.6];
  const [syLo, syHi] = cal.six_yard_y ?? [36.5, 63.5];
  const sixX = cal.six_yard_x ?? 5.5;
  const penX = cal.pen_spot_x ?? 11.5;

  /* y (breidd 0-100) -> lárétt · x (fjarlaegd fra marki) -> lóðrétt.
     Markid er UPPI, eins og i ESPN-kortinu — sami lestur fyrir notandann. */
  const px = y => (y / 100) * W;
  const py = x => (Math.min(x, DEPTH) / DEPTH) * H;

  const pts = useMemo(() => {
    if (!Array.isArray(shots)) return [];
    return shots
      .filter(s => Array.isArray(s) && s.length >= 3)
      .map(([x, y, xg, t]) => ({ x, y, xg, t }))
      .filter(s => Number.isFinite(s.x) && Number.isFinite(s.y))
      /* Stór skot UNDIR theim smáu svo litlu punktarnir hverfi ekki. */
      .sort((a, b) => (b.xg ?? 0) - (a.xg ?? 0));
  }, [shots]);

  if (!pts.length) return null;

  const goals = pts.filter(s => s.t === 0).length;
  const posts = pts.filter(s => s.t === 4).length;
  const totXg = pts.reduce((s, p) => s + (p.xg ?? 0), 0);
  /* Radíus ber xG: sá sem les kortid a ad sja GAEDIN, ekki bara magnid.
     Kvadratrot svo FLATARMAL se i hlutfalli vid xG, ekki thvermalid —
     annars líta 0,5 og 0,25 út eins og fjórfaldur munur.              */
  const r = xg => 2.2 + Math.sqrt(Math.max(xg ?? 0, 0)) * 9;

  const goalW = 7.32 / 68 * 100;   // markbreidd sem hlutfall af vallarbreidd

  return (
    <div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Shot map${label ? " — " + label : ""}: ${pts.length} shots, ${goals} goals`}
           style={{ display: "block", borderRadius: 6, background: C.turf,
                    border: `1px solid ${C.line}` }}>
        {/* vitateigur */}
        <rect x={px(byLo)} y={0} width={px(byHi) - px(byLo)} height={py(boxX)}
              fill="none" stroke={C.line} strokeWidth="1" />
        {/* markteigur */}
        <rect x={px(syLo)} y={0} width={px(syHi) - px(syLo)} height={py(sixX)}
              fill="none" stroke={C.line} strokeWidth="1" />
        {/* markid sjalft */}
        <line x1={px(50 - goalW / 2)} y1={1} x2={px(50 + goalW / 2)} y2={1}
              stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
        {/* vitapunktur — MAELDUR, ekki nominal */}
        <circle cx={px(50)} cy={py(penX)} r="1.6" fill={C.line} />

        {pts.map((s, i) => {
          const isGoal = s.t === 0, isPost = s.t === 4;
          return (
            <circle key={i} cx={px(s.y)} cy={py(s.x)} r={r(s.xg)}
              fill={isGoal ? C.goal : isPost ? C.post : "none"}
              fillOpacity={isGoal ? 0.85 : isPost ? 0.5 : 0}
              stroke={isGoal ? C.goal : isPost ? C.post : C.other}
              strokeWidth={isGoal ? 1 : 1.1} strokeOpacity={isGoal ? 1 : 0.75}>
              <title>{`xG ${(s.xg ?? 0).toFixed(2)}${isGoal ? " — GOAL" : isPost ? " — woodwork" : ""}`}</title>
            </circle>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6,
                    fontSize: 11, color: C.muted, alignItems: "center" }}>
        <span><b style={{ color: C.ink }}>{pts.length}</b> shots</span>
        <span><b style={{ color: C.goal }}>{goals}</b> goals</span>
        {posts > 0 && <span><b style={{ color: C.post }}>{posts}</b> woodwork</span>}
        <span><b style={{ color: C.ink }}>{totXg.toFixed(1)}</b> xG</span>
        <span style={{ marginLeft: "auto" }}>bubble = xG · goal at top</span>
      </div>
    </div>
  );
}
