/* ============================================================
   VELJA UMFERD I PROFI — EIN UTFAERSLA FYRIR OLL VIDMOTS-SOFNIN

   HVERS VEGNA ThETTA ER TIL (27.8.2026): fjogur sofn treystu a ad appid
   OPNADIST a umferd 1. Thad var satt medan `gw` var `is_current`, en su
   regla var villa — FPL heldur `is_current` a lokinni umferd thangad til
   naesti frestur lidur, svo skipuleggjarinn opnadist a umferd sem var
   BUIN (sja `planningGw` i src/availability.js). Um leid og thad var
   lagad felli 25 fullyrdingar i fimm sofnum — ekki af thvi ad appid vaeri
   bilad heldur af thvi ad ThAU SOGDU ALDREI HVADA UMFERD THAU MEINTU.

   Reglan sem leidir af thvi: prof sem er UM eina umferd a ad VELJA hana.
   Sjalfgefid gildi appsins er thess eigin akvordun og ma breytast.

   AKKERID ER `title`, EKKI TEXTINN: hnutarnir bera adeins toluna, svo
   `textContent === "1"` hefdi lika fundid hvern annan hnapp sem ber "1"
   (chip-teljara, sidutal). CLAUDE.md 5: "prof eiga ad profa hegdun, ekki
   ordalag" — og thegar akkeri tharf a thad ad vera stodugt.
   ============================================================ */
export function gwNode(doc, n) {
  return [...doc.querySelectorAll("button")]
    .find(b => b.getAttribute("title") === `Gameweek ${n}`) || null;
}

/* Skilar `true` ef hnuturinn fannst OG var smelltur. Kallandinn A AD
   fullyrda um thad — hljod bilun her vaeri nakvaemlega tomu fullyrdingin
   sem CLAUDE.md 5b lysir: safnid yrdi graent an thess ad hafa valid neitt. */
export async function selectGw(doc, n, click) {
  const node = gwNode(doc, n);
  if (!node) return false;
  await click(node);
  return true;
}
