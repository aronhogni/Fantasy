/* ============================================================
   interp — STIKU-INNSETNING. Thetta er ALLT sem eftir stendur af
   tungumalalaginu.

   Appid var tvityngt (islenska + enska, ordabok med 1.023 lyklum,
   `tx()` a 1.144 stodum, IS/EN-hnappur). Thad var tekid ut 7.8.2026:
   vidmotid er nu ENSKT OG BARA ENSKT, og hver strengur stendur a
   theim stad sem hann birtist a.

   EN STIKURNAR URDU AD LIFA. Nidjastrengir eins og
     "£{0}m short — transfer too expensive."
   voru ekki settir saman med + heldur med snidmati, af thvi ad
   ordarodin er hluti af setningunni. Ad breyta theim i samskeytingu
   vaeri 93 handbreytingar med raunverulegri hættu a ad tapa bili eda
   snua tolu vid — svo fallid heldur ser obreytt ad hegdun.

   HEITID: fyrsta utgafan het `fmt` og REKST A staðbundna talnasnidgerd
   i GwReport.jsx (`const fmt = v => ...`) — nakvaemlega sama gildran og
   `t` gegn `tx` var (sja CLAUDE.md 8b). Byggingin fell strax, en heitid
   er valid MAELT: `interp` kemur hvergi fyrir i src/, tests/ ne scripts/.

   `null`/`undefined` verdur AD TOMU, ekki "undefined": stikur eru
   oft valfrjalsar (`brk ? ... : null`) og "undefined" i vidmotinu er
   verra en tomt bil.
   ============================================================ */
export function interp(s, args) {
  if (!Array.isArray(args)) return s;
  return s.replace(/\{(\d+)\}/g, (m, i) => {
    const v = args[Number(i)];
    return v == null ? "" : String(v);
  });
}
