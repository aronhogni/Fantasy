import React from "react";

/* ============================================================
   PITCH — leikvangs-bakgrunnur

     <Pitch>{spjold}</Pitch>

   Börnin lenda í lagi sem spannar allan rammann. Staðsettu raðir
   með position:absolute og prósentum af hæð.

   ------------------------------------------------------------
   VIÐMIÐ (% af hæð rammans)
   ------------------------------------------------------------
     marklína          7,13
     markteigur fram  13,02
     vítapunktur      18,92
     vítateigur fram  24,82
     miðlína          63,42
     bekkjarskil      75,99
   ------------------------------------------------------------

   Props:
     bench      hlutfall hæðar fyrir bekk (sjálfgefið 0.24)
     goalScale  stærð marksins, 1 = metrískt (sjálfgefið 1.5)

   ------------------------------------------------------------
   ÞETTA ER VILJANDI FLÖT GRUNNMYND
   ------------------------------------------------------------
   Fyrri útgáfur reyndu sjónhverfingu, fyrst með CSS rotateX (sem
   virkaði ekki og flatnaði út) og svo með punktvörpun reiknaðri inn
   í SVG-hnitin (sem virkaði en gerði völlinn að fleyg með dökkum
   hornum og keppti við spjöldin).

   Bakgrunnur á að sitja á bak við fimmtán spjöld og ekki draga
   augað til sín. Flöt grunnmynd gerir það, fyllir rammann af torfi,
   og hefur þann kost að ALLT verður rétt af sjálfu sér: hringur er
   hringur, teigur er rétthyrningur, rendur eru jafnar. Engin
   forskekking, engin leiðréttingartöfl, ekkert sem getur farið
   úr takti.

   Skalinn er 14,294 px á metra á BÁÐUM ásum, svo hver merking er
   mæld. Völlurinn er 68 m breiður og sýnir 64,2 m af lengd, frá
   marklínu og rétt fram yfir miðju.
   ============================================================ */

const W = 1000;
const H = 1333;
const U = 14.294; // px á metra, sami skali á báðum ásum
const CX = W / 2;
const GL = 95; // marklína
const X0 = 14; // hliðarlínur
const X1 = 986;

const m = (v) => v * U; // metrar -> px
const yAt = (v) => GL + m(v);
const R_CIRCLE = m(9.15);
const D_HALF = Math.sqrt(R_CIRCLE ** 2 - m(16.5 - 11.0) ** 2);

export default function Pitch({
  bench = 0.24,
  goalScale = 1.5,
  className = "",
  children,
}) {
  const benchY = H * (1 - bench);
  const gw = (m(7.32) * goalScale) / 2;
  const gd = m(2.0) * goalScale;

  return (
    <div
      className={`fpl-pitch ${className}`}
      style={{ position: "relative", width: "100%", aspectRatio: "3 / 4" }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          borderRadius: 20,
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="fp-turf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d5733" />
            <stop offset="38%" stopColor="#256b3e" />
            <stop offset="100%" stopColor="#1b4e2f" />
          </linearGradient>

          {/* mow-stripes: 5 m bönd, jöfn því myndin er flöt */}
          <pattern
            id="fp-mow"
            width={W}
            height={m(10)}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(0 ${GL})`}
          >
            <rect width={W} height={m(5)} fill="#ffffff" fillOpacity=".028" />
          </pattern>

          <filter id="fp-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="4"
              seed="7"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>

          <radialGradient id="fp-flood" cx="50%" cy="26%" r="62%">
            <stop offset="0%" stopColor="#c8ffdd" stopOpacity=".15" />
            <stop offset="100%" stopColor="#c8ffdd" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="fp-vig" cx="50%" cy="38%" r="74%">
            <stop offset="45%" stopColor="#061409" stopOpacity="0" />
            <stop offset="100%" stopColor="#041008" stopOpacity=".62" />
          </radialGradient>

          <pattern
            id="fp-net"
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 0 H7 M0 0 V7"
              stroke="#e6f3ea"
              strokeOpacity=".42"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* torf fyllir allan rammann — engin dökk horn */}
        <rect width={W} height={H} fill="url(#fp-turf)" />
        <rect width={W} height={H} fill="url(#fp-mow)" />
        <rect
          width={W}
          height={H}
          filter="url(#fp-grain)"
          opacity=".13"
          style={{ mixBlendMode: "overlay" }}
        />

        {/* merkingar — allar mældar, ekkert forskekkt */}
        <g
          fill="none"
          stroke="#eaf3ec"
          strokeOpacity=".30"
          strokeWidth="2.8"
          strokeLinejoin="round"
        >
          <path d={`M${X0} ${GL} H${X1}`} />
          <path d={`M${X0} ${GL} V${H}`} />
          <path d={`M${X1} ${GL} V${H}`} />
          <rect
            x={CX - m(20.16)}
            y={GL}
            width={m(40.32)}
            height={m(16.5)}
          />
          <rect x={CX - m(9.16)} y={GL} width={m(18.32)} height={m(5.5)} />
          <path
            d={`M${CX - D_HALF} ${yAt(16.5)} A${R_CIRCLE} ${R_CIRCLE} 0 0 0 ${
              CX + D_HALF
            } ${yAt(16.5)}`}
          />
          <path d={`M${X0} ${yAt(52.5)} H${X1}`} />
          <circle cx={CX} cy={yAt(52.5)} r={R_CIRCLE} />
          <path
            d={`M${X0} ${GL + m(1)} A${m(1)} ${m(1)} 0 0 0 ${X0 + m(1)} ${GL}`}
          />
          <path
            d={`M${X1} ${GL + m(1)} A${m(1)} ${m(1)} 0 0 1 ${X1 - m(1)} ${GL}`}
          />
        </g>
        <circle
          cx={CX}
          cy={yAt(11)}
          r="3.6"
          fill="#eaf3ec"
          fillOpacity=".42"
        />
        <circle
          cx={CX}
          cy={yAt(52.5)}
          r="3.6"
          fill="#eaf3ec"
          fillOpacity=".42"
        />

        {/* markið: netkassi ofan marklínu, botninn Á línunni */}
        <g>
          <rect
            x={CX - gw}
            y={GL - gd}
            width={gw * 2}
            height={gd}
            fill="#0b1c11"
            fillOpacity=".46"
          />
          <rect
            x={CX - gw}
            y={GL - gd}
            width={gw * 2}
            height={gd}
            fill="url(#fp-net)"
          />
          <path
            d={`M${CX - gw} ${GL} V${GL - gd} H${CX + gw} V${GL}`}
            fill="none"
            stroke="#f7fbf8"
            strokeOpacity=".92"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>

        <rect width={W} height={H} fill="url(#fp-flood)" />
        <rect width={W} height={H} fill="url(#fp-vig)" />

        {/* bekkur */}
        <rect
          y={benchY}
          width={W}
          height={H - benchY}
          fill="#09180f"
          fillOpacity=".76"
        />
        <path
          d={`M0 ${benchY} H${W}`}
          stroke="#eaf3ec"
          strokeOpacity=".18"
          strokeWidth="1.6"
          strokeDasharray="8 8"
          fill="none"
        />
      </svg>

      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>{children}</div>
    </div>
  );
}
