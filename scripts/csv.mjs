/* ============================================================
   csv.mjs — EIN GAESALAPPA-MEDVITUD CSV-THATTUN

   HVERS VEGNA ThESSI SKRA VARD TIL (25.8.2026)
   Sama logmal og `src/names.js` (`normName` var skilgreint tvisvar) og
   `scripts/espn-zones.mjs` (`ZONE_RE` stod ordrett i tveimur skriftum og
   BAEDI afritin vantadi markteiginn). Gaesalappa-medvitadi thattarinn var
   afritadur i ThREMUR stodum:

     scripts/fetch-player-gw.mjs   (pipeline: vaastav per-umferdar CSV)
     scripts/start-panel.mjs       (maelingar: players_raw.csv)
     tests/euro-congestion.mjs     (maelinga-skyrsla)

   SANNAD ADUR EN SAMEINAD: kjarninn i fyrstu tveimur var keyrdur hlid vid
   hlid a sjo inntokum — venjulegri rod, gaesalappa-svidi MED KOMMU
   ("Knock, doubtful"), tvofoldum gaesalappum inni i svidi, CRLF, skra AN
   lokalinu, tomum svidum og LINUBROTI INNAN gaesalappa — og thau gefa
   NAKVAEMLEGA sama svar. Thetta er thvi hrein sameining, ekki val a milli
   tveggja hegdana.

   ============================================================
   EN SIURNAR ERU EKKI EINS OG ThAER VERDA AD LIFA
   ============================================================
   Utgafurnar voru EKKI byte-eins: hvor bar sina rod-siu.

     fetch-player-gw   `r.length > 3`   vaastav-CSV eru breid (20+ dalkar)
                                        og ragged rod med 1-3 svidum er
                                        RUSL, ekki gogn.
     start-panel       `r.length > 1`   `players_raw.csv` er mjorri.

   Siurnar eru thvi ekki tilviljun heldur ThEKKING A GAGNASETTINU, og ad
   steypa theim i eina tolu vaeri ad giska. `rowsToObjects` tekur hana
   thess vegna sem BREYTU og hver kallandi heldur SINNI.

   Sama lærdomur og `num` (fjorar skilgreiningar, tvaer RETTAR hegdanir)
   og klubba-nafnavorpunin (tvaer toflur sem voru OSAMMALA, ekki afrit):
   tvitekning og fravik lita eins ut vid fyrstu syn, og adeins maeling
   segir hvort thad se.

   ============================================================
   NAIVU ThATTARARNIR ERU EKKI SAMEINADIR HINGAD — OG ThAD ER AKVORDUN
   ============================================================
   `fetch.mjs:parseCSV`, `fetch-clubelo-history.mjs` og
   `measure-promoted-proxy.mjs` nota bert `split(",")`. Thad er hraedilegt
   fyrir gaesalappad CSV og fullkomlega i lagi fyrir toflur sem bera engar
   kommur i svidum. HVORT ThAU GERA ThAD ER EKKI HAEGT AD MAELA HER: engin
   CSV-skra er committud i thessu repo-i (thaer eru allar sottar i keyrslu),
   svo "thetta gagnasett ber aldrei kommu" vaeri agiskun. Auk thess PINNAR
   `tests/elo-fetch.mjs:262` heitid `function parseCSV(text)` i fetch.mjs
   med textaleit.
   Ad faera thau hingad an thess ad maela raunverulegu skrarnar vaeri
   nakvaemlega su tegund "tiltektar" sem thetta repo hefur thrisvar
   skjalad ad kosti gogn. Se thad gert: saektu skrarnar EINU SINNI, teldu
   linur sem bera `"`, og faerdu tha sem eru hreinar.
   ============================================================ */

/** Gaesalappa-medvitud tokun. Skilar fylki af fylkjum (hraum reitum). */
export function csvRows(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  /* SIDASTA RODIN AN LINUBROTS — skra sem endar an `\n` tapadi henni
     annars, og thad er algengt i sottum CSV.                          */
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/**
 * Fyrsta rodin er haus; skilar hlutum.
 * `minFields` er SIAN og hun er BREYTA af asettu radi — sja hausinn.
 *
 * HUN VAR `> minFields` (UTILOKANDI) TIL 25.8.2026 og er nu `>=`.
 * Hegdunin er OBREYTT — hver kallandi var faerdur upp um einn i somu
 * breytingu (3 -> 4, 1 -> 2, sjalfgildid 1 -> 2) — en NAFNID laug adur:
 * `minFields: 3` helt rodum med FJORUM sviðum. Naesti kallandi sem les
 * nafnid og velur tolu hefdi verid einum framhja, og su villa hefdi verid
 * thogul (of far raðir, engin skilaboð). Nafn sem segir "minnst N" a ad
 * thyda minnst N.
 */
export function rowsToObjects(text, { minFields = 2 } = {}) {
  const rows = csvRows(text);
  const head = rows[0] || [];
  return rows.slice(1)
    .filter(r => r.length >= minFields)
    .map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
