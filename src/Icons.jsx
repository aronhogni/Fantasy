/* ============================================================
   ICONS.JSX — FOST LEIKATRIDI SEM TEIKNUD IKON

   AF HVERJU EKKI EMOJI/TAKN: adur voru thetta ⚽ / ◎ / ⌾ og
   SetPieces.jsx bar sjalft skjalfestinguna a thvi ad thad VIRKADI EKKI —
   "⚽ / ◎ / ⌾ eru OGREINANLEG i raunstaerd, thau tvo sidari eru naer eins
   hringir i 13px". Lausnin thar var ad skipta taknunum ut fyrir BOKSTAF
   (P/F/C), sem er laesilegt en segir ekkert: madur les "C" og verdur ad
   vita ad thad se corner.

   REGLAN SEM THESSI SKRA FYLGIR: I SMARRI STAERD ER SILHUETTAN ALLT.
   Tvo ikon sem eru bædi "hringur med smaatridum" verda eins vid 13px,
   hvad sem smaatridin eru. Thess vegna er hvert ikon byggt a ANNARRI
   grunnform-samsetningu:

     VITI       knottur + FLATUR DEPILL undir   (lodrett tvennd)
     AUKASPYRNA knottur + THRJAR STANGIR vid hlid (larett tvennd)
     HORN       FANI a stong + knottur           (skálína)

   Their thrir eru greinanlegir i 11px — PROFAD SJONRAENT i Chrome vid
   11 / 13 / 15 / 20 / 28 px, ekki agiskad. Tvennt var TEIKNAD UPP A NYTT
   eftir theirri profun (vita-depillinn og hornaboginn); sja skyringarnar
   a theim stodum. Ikon sem er "rett teiknad" getur samt verid vitlaus mynd,
   og thad sest adeins i raunstaerd.

   TEIKNIREGLUR (svo thau seu EIN heild og ekki thrjar teikningar):
     · 16x16 grid, allt teiknad a hálfum pixlum svo linur seu skarpar
     · EIN linuthykkt (1,5 vid 16px) sem SKALAST med staerdinni
     · `currentColor` sjalfgefid — ikonid erfir lit foreldris, svo
       tint-liturinn i SP_KINDS heldur ser an serstakrar leidar
     · strokeLinecap/-join "round" — mjukt vid smaa staerd, engin skoro
     · ENGIN fyllt flotur nema thar sem hun BER merkingu (vitadepillinn,
       fanadukurinn): fyllt smaatridi eru thad sem lifir nidur i 11px
   ============================================================ */

import React from "react";

/* Sameiginleg umgjord. `size` er BAEDI breidd og haed. Linuthykktin er 1,5
   i 16-grid-inu og skalast thvi MED staerdinni (1,03 px vid 11px, 1,88 vid
   20px) — thad er rett hegdun: ikon sem heldur fastri pixla-thykkt vid
   allar staerdir verdur ofurthunnt i storri staerd og klessa i smarri.  */
function Svg({ size = 16, color, title, children, strokeScale = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" role={title ? "img" : "presentation"}
      aria-label={title || undefined} aria-hidden={title ? undefined : "true"}
      style={{ display: "block", flexShrink: 0, color: color || undefined }}
      fill="none" stroke="currentColor" strokeWidth={1.5 * strokeScale}
      strokeLinecap="round" strokeLinejoin="round">
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* Knottur — SAMA teikning i ollum thremur ikonum svo thau lesist sem
   sama malid. Tvo pentagon-strik eru NOG til ad lesast sem knottur; fleiri
   verda ad grarri klessu undir 14px.                                    */
function Ball({ cx, cy, r }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} />
      <path d={`M${cx - r * 0.52} ${cy - r * 0.34} L${cx} ${cy + r * 0.1} L${cx + r * 0.52} ${cy - r * 0.34}`} />
      <path d={`M${cx} ${cy + r * 0.1} L${cx} ${cy + r * 0.85}`} />
    </>
  );
}

/* ---- VITI: knottur a vitapunkti ----
   FYRSTA UTGAFAN HAFDI BOGA (vitateigs-bogann) YFIR knettinum og hun VAR
   PROFUD A SKJA VID 15px: boginn plus pentagon-strikin inni i knettinum lásu
   sem HORN a andliti. Thad er kjarninn i thvi ad ikon verdur ad profa i
   raunstaerd — teikningin var "rett" og myndin vitlaus.
   Nu tvo stok: knottur + vitadepill undir honum. Silhuettan er lodrett
   tvennd (hringur yfir depli), sem hvorugt hinna er, og depillinn er thad
   eina sem tharf: hann ER vitid.                                        */
export function PenaltyIcon({ size, color, title = "Penalties" }) {
  return (
    <Svg size={size} color={color} title={title}>
      <Ball cx={8} cy={6.6} r={3.5} />
      {/* SPORBAUGUR, EKKI HRINGUR. Hringlaga deplinn undir knettinum las
          eins og STADSETNINGAR-NAEL (kula med totu); flatur sporbaugur
          les eins og punktur A JORDU, sem er thad sem vitapunkturinn er. */}
      <ellipse cx={8} cy={13.1} rx={2.7} ry={1.15} fill="currentColor" stroke="none" />
    </Svg>
  );
}

/* ---- AUKASPYRNA: knottur vinstra megin, VARNARVEGGUR haegra ----
   Veggurinn (thrjar stangir) er thad sem gerir silhuettuna larettA og thvi
   ogreinanlega fra vitanum. Ferillinn er STRIKALINA — hann er hugmynd um
   spyrnuna, ekki maeld ferd, og strikin segja thad.                     */
export function FreeKickIcon({ size, color, title = "Free kicks" }) {
  return (
    <Svg size={size} color={color} title={title}>
      <Ball cx={4.1} cy={11.4} r={2.9} />
      <path d="M9.6 7.2 L9.6 14.2" />
      <path d="M12.1 6.2 L12.1 14.2" />
      <path d="M14.6 7.2 L14.6 14.2" />
      <path d="M3.4 6.6 Q7.2 0.9 13.4 3.4" strokeDasharray="2 1.7" />
    </Svg>
  );
}

/* ---- HORN: fani a stong + knottur ----
   Fanadukurinn er FYLLTUR thriangull: skálinan i honum er eina skálinan i
   settinu, svo hornaikonid er greinanlegt i 11px thott hitt tvennt sé
   THAD ekki.                                                           */
export function CornerIcon({ size, color, title = "Corners" }) {
  return (
    <Svg size={size} color={color} title={title}>
      <path d="M2.4 14.4 L2.4 2.2" />
      <path d="M2.4 2.6 L8.4 4.3 L2.4 6.4 Z" fill="currentColor" stroke="currentColor" />
      {/* HORNABOGINN VAR HER OG VAR TEKINN UT eftir skja-profun i 11-28px:
          hann var teiknadur ljos (opacity 0.55) svo hann yfirgnaefdi ekki, og
          vid 20px+ las hann thvi sem STOK SKÁSTRIK undir knettinum sem
          tengdist engu. Faninn er hvort sem er thad sem gerir ikonid einkvaemt
          — hann er eina skálinan i settinu — svo boginn bar enga merkingu sem
          var ekki thegar komin. Faerra er skarpara.                        */}
      <Ball cx={9.7} cy={11.3} r={2.8} />
    </Svg>
  );
}

/* ---- FLIPA-IKON: dautt bolta-spark ----
   Nav-flipinn bar "⚽️" sem er SAMA taknid sem "⚽ Planner" bar — tveir
   flipar med sama tákni. Herna er knottur MED strikadri ferd i markid,
   sem er thad sem oll thrju fostu leikatridin eiga sameiginlegt.       */
export function SetPieceIcon({ size = 16, color, title }) {
  return (
    <Svg size={size} color={color} title={title}>
      <path d="M9.6 2.4 L14.6 2.4 L14.6 7.2 L9.6 7.2 Z" opacity="0.75" />
      <path d="M11.2 2.4 L11.2 7.2" opacity="0.45" />
      <path d="M13 2.4 L13 7.2" opacity="0.45" />
      <path d="M3.1 11.4 Q5.4 5.9 10.4 5.2" strokeDasharray="2 1.7" />
      <Ball cx={3.4} cy={12.7} r={2.7} />
    </Svg>
  );
}

/* ---- KORONA: flipinn "Best of the best" ----
   SILHUETTAN ER ALLT I 13-14 PX (sja CLAUDE.md kafla 8, "Ikon"). Koronan er
   valin thvi hun deilir engri grunnform-samsetningu med hinum ikonunum:
   PenaltyIcon er lodrett tvennd, FreeKickIcon larett tvennd, CornerIcon
   skalina — koronan er ZIKK-ZAKK-LINA ofan a lareottum grunni, sem er
   ogleymanleg silhuetta jafnvel thegar toppapunktarnir renna saman.
   FYLLT, ekki bara strikud: i smarri staerd les strikud korona eins og
   opinn kassi. Grunnstrikid er adskilid svo thad haldi ser sem "band".  */
export function CrownIcon({ size = 16, color, title = "Best of the best" }) {
  return (
    <Svg size={size} color={color} title={title}>
      <path d="M2.4 5.2 L5 8.6 L8 3.6 L11 8.6 L13.6 5.2 L12.6 11.4 L3.4 11.4 Z"
            fill="currentColor" stroke="currentColor" strokeWidth={1.1} />
      <path d="M3.6 13.4 H12.4" />
    </Svg>
  );
}
