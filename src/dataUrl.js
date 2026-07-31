/* ============================================================
   EIN SKILGREINING A GAGNA-SLODINNI

   Adur var hun inni i App.jsx. Leikmannalistinn tharf hana lika (til ad
   letihlada per-umferdar skrarnar), og ad flytja hana inn UR App.jsx hefdi
   gefid HRINGTILVISUN: App -> PlayerList -> App. Thess vegna eigin eining.
   Ekki afrita thessa slod inn i adra skra.
   ============================================================ */
export const RAW = import.meta.env?.DEV
  ? `${import.meta.env.BASE_URL}data`      // base er /Fantasy/ — ma ekki fara framhja
  : "https://raw.githubusercontent.com/aronhogni/Fantasy/main/data";
