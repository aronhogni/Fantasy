/* ============================================================
   newsmatch.js — FRETTIR PARADAR VID HOP. HREIN.

   Ekkert React, ekkert `fetch`. Vorpunin var inni i `MyTeam.jsx`
   (`Alerts`) og forsidan (`Dashboard.jsx`) tharf NAKVAEMLEGA sama
   parun fyrir badar deildir notandans. Afrit hefdi verid onnur
   utfaersla af somu reglu — sja hausinn a `weekview.js` fyrir tvo
   skjolud tilfelli af theim kostnadi.

   ============================================================
   PORUN ER A `espnId` FYRST. NAFN ER SIDASTA URRAEDI OG THAD ER TALID
   ============================================================
   ESPN merkir hverja grein theim leikmonnum sem hun fjallar um
   (`athletes: [{ espnId, name }]`), og `players.json` ber `espnId` a
   **1.004 af 1.043** leikmonnum. Þess vegna er porunin a AUDKENNI i
   langflestum tilfellum og enginn agiskun.

   Nafna-porun er samt hofd sem BAKLEID, thvi 39 leikmenn bera ekkert
   `espnId` og grein um thann sem er meiddur er einmitt su sem madur
   vill ekki missa. En repo-id hefur skjaladan otta vid hana:
   liða-vorpunin i BSD-hlutanum var HANDSTADFEST tafla af thvi ad fuzzy
   parun felldi **Man United inn i Man City** — "thogul rong parun er
   verri en engin".

   Thess vegna skilar fallid `viaName` TALNINGU. Sa sem birtir getur
   thvi sagt "2 af 7 voru paradar a nafni" i stad thess ad lata rangan
   mann lita eins ut og rettan. Talningin er ekki skraut: hun er eina
   leidin til ad sja thegar bakleidin fer ad bera meira en hun aetti.

   ÞRJU NOFN ERU EKKI SNIÐIN AD PORUN: greinar nefna "Josh Allen"
   (BUF, QB) og "Josh Allen" (JAX, LB) — sami strengur, tveir menn.
   Nafna-bakleidin getur thvi paradad VITLAUST og hun getur EKKI vitad
   thad. Þess vegna er hun bundin vid leikmenn sem bera EKKERT
   `espnId`; hafi leikmadur audkenni og thad passar ekki, er nafnid
   EKKI reynt. Ad reyna baedi vaeri ad velja rangan mann i tilfelli
   thar sem vid hofdum retta svarid.
   ============================================================ */

/**
 * `{ roster, news }` -> `{ items, viaId, viaName, ambiguous }`
 *
 * `items` eru greinar sem nefna einhvern i hopnum, nyjasta fyrst, hver
 * med `who` (nafnid sem passadi) og `matchedBy` ("id" | "name").
 *
 * `news == null` -> TOMT, ekki hrun. Fréttaskráin er letihladin og
 * getur vantad; tha er svarid "vid vitum ekki", ekki "engar frettir".
 * Sa sem birtir verdur ad greina thau tvo — `loaded` segir hvort.
 */
export function newsForRoster({ roster, news } = {}) {
  const out = { items: [], viaId: 0, viaName: 0, ambiguous: 0, loaded: false };
  const articles = news && Array.isArray(news.articles) ? news.articles : null;
  if (!articles) return out;
  out.loaded = true;

  const list = Array.isArray(roster) ? roster.filter(Boolean) : [];
  const byId = new Map();
  for (const r of list) if (r.espnId) byId.set(String(r.espnId), r);

  /* Nafna-bakleidin er ADEINS fyrir tha sem bera ekkert audkenni.
     Hafi leikmadur `espnId` er nafnid hans ekki i thessu korti — annars
     gaeti "Josh Allen" (QB) parast vid grein um "Josh Allen" (LB) thott
     vid hofdum retta audkennid allan timann. */
  const byName = new Map();
  const dupNames = new Set();
  for (const r of list) {
    if (r.espnId) continue;
    const k = String(r.name || "").trim().toLowerCase();
    if (!k) continue;
    if (byName.has(k)) dupNames.add(k);
    else byName.set(k, r);
  }
  /* Tvo menn i SAMA hop med sama nafni — parun er omoguleg og talin.
     ÞETTA ER TVOFOLD VORN og hun er asett: hlidid i lykkjunni hér nedan
     () er thad sem TELUR tilfellid, og stokkbreyting
     stadfesti ad thad se vordurinn. Ad fjarlaegja nafnid HER LIKA er
     samt rett, thvi tha ber  einfaldlega ekki nafn sem ma ekki
     parast — gagnagrindin sjalf er rett i stad thess ad vera rett
     adeins vegna eftirlits a notkunarstad. Stokkbreyting a THESSARI
     linu einni fellir ekkert prof, og thad er vaentanlegt.          */
  for (const k of dupNames) byName.delete(k);

  for (const a of articles) {
    const ath = Array.isArray(a.athletes) ? a.athletes : [];
    let hit = null, how = null;
    for (const x of ath) {
      if (x && x.espnId && byId.has(String(x.espnId))) {
        hit = x; how = "id"; break;
      }
    }
    if (!hit) {
      for (const x of ath) {
        const k = String((x && x.name) || "").trim().toLowerCase();
        if (!k) continue;
        if (dupNames.has(k)) { out.ambiguous++; continue; }
        if (byName.has(k)) { hit = x; how = "name"; break; }
      }
    }
    if (!hit) continue;
    if (how === "id") out.viaId++; else out.viaName++;
    out.items.push({ ...a, who: hit.name, matchedBy: how });
  }

  /* Nyjasta fyrst. `published` er ISO-strengur, svo strengja-samanburdur
     er rettur og tharf enga dagsetningar-thattun. */
  out.items.sort((a, b) => String(b.published).localeCompare(String(a.published)));
  return out;
}

/**
 * Meiddir i hopnum. **FPL-REGLAN GILDIR HER LIKA:** opinber status
 * raedur tiltaekileika, allt annad ma auðga hann og aldrei skipta
 * honum ut. `injury` kemur ur Sleeper og er thad eina sem er treyst.
 *
 * "Active" er EKKI meidsli og ma ekki flaggast. `null` er ekki heldur
 * meidsli — thad er "engin frett", sem er annad.
 */
export function injuredOn(roster) {
  return (Array.isArray(roster) ? roster : [])
    .filter((r) => r && r.injury && r.injury !== "Active");
}
