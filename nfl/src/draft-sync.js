/* ============================================================
   draft-sync.js — HRADI OG ENDURTEIKNING I LIFANDI DRAFTI. HREIN.

   Tvaer akvardanir sem voru inni i `DraftBoard.jsx` og voru thess
   vegna OPROFANLEGAR nema med jsdom, fokum klukkum og heilu
   vidmotinu. Thaer eru her sem follt af thvi ad tha profa profin
   NAKVAEMLEGA sama kodann og appid keyrir — sama regla og annars
   stadar i thessu verkefni.

   BADAR SPRUTTU UR SOMU ATHUGASEMD NOTANDANS: "eg prufadi ad mock
   drafta og thad updateast of haegt hja mer leikmannalistinn."
   ============================================================ */

/**
 * Fingrafar svarsins fra Sleeper.
 *
 * HVERS VEGNA THETTA ER TIL: pollunin sendi NYTT fylki i foreldrid i
 * hverri umferd, lika thegar ekkert hafdi gerst. Foreldrid byggdi tha
 * nytt `Set`, `available` reiknadist upp a nytt og 200 rada tafla,
 * tillagan, skortstadan og markadskassinn endurteiknudust — a 5
 * sekundna fresti, allt draftid, fyrir engar upplysingar.
 *
 * FJOLDINN EINN DUGAR EKKI. Tvo val geta komid milli tveggja pollana
 * an ad talan segi fra (bordid thekkir ekki alla leikmenn Sleeper, svo
 * eitt thekkt og eitt othekkt val getur haldid `ids.length` föstu
 * medan innihaldid breytist). Thess vegna er innihaldid sjalft i
 * fingrafarinu, og `mine` lika — saetið getur ratast inn eftir a
 * (`draft_order` er oft dregid EFTIR ad tengt er) og tha breytist
 * hverjir eru minir an thess ad `ids` haggist.
 *
 * ============================================================
 * `unknown` VANTADI OG ÞAD KOSTADI VALNUMERID (fundid 14.8.2026)
 * ============================================================
 * `offBoard` — vol sem bordid kann ekki ad para — berst foreldrinu
 * ADEINS gegnum `onPicks`, og `onPicks` er adeins kallad thegar
 * fingrafarid breytist. Vol a manni sem er utan `players.json`
 * baetir ENGU vid `ids` ne `mine`, svo fingrafarid stod kyrrt og
 * `offBoard` var afram 0. Maelt i lifandi hermun: atta thekkt vol +
 * THRJU oporud gafu valnumer **9 i stad 12**.
 *
 * Þad er nakvaemlega villan sem `offBoard` var smiðad til ad laga —
 * talan var reiknud rett og komst aldrei ut. Hlidid sem atti ad
 * spara endurteikningu var lika hlid a upplysingunni.
 */
export function pickSignature(ids, mine, unknown = 0) {
  return `${(ids || []).length}|${(ids || []).join(",")}|${(mine || []).join(",")}` +
         `|${Number(unknown) || 0}`;
}

/** Sjalfgefnu tolurnar, a einum stad svo profin geti lesid thaer. */
export const POLL = { fast: 1500, slow: 5000, window: 25000 };

/**
 * Hve langt a ad bida fram ad naestu pollun.
 *
 * `lastMoveAt` er tiskuklukkan thegar SIDAST barst nytt val (0 ef
 * ekkert hefur borist). `now` er gefid inn — fallið les aldrei
 * klukkuna sjalft, svo profin geti stjornad henni.
 *
 * MAELT? NEI — OG THAD SKAL STANDA. Thetta er ekki spa heldur
 * hradastilling, og hun er valin ur EINNI stadreynd: Sleeper-mock
 * med botum gefur 1-3 sekundur a val medan raundraft gefur 30-90.
 * Gamla fasta talan (5000) var valin ut fra raundraftinu einu og var
 * thess vegna ROMG i mock — ekki oheppileg, heldur byggd a forsendu
 * sem gildir bara i helmingi tilvika.
 *
 * Se nytt val komid a sidustu `window` ms er draftid a hreyfingu og
 * vid spyrjum ort. Annars fellur thad i gamla hradann: bidstada milli
 * umferda a ekki ad kosta koll.
 */
export function pollDelay(lastMoveAt, now, opts = {}) {
  const { fast, slow, window } = { ...POLL, ...opts };
  const since = now - (lastMoveAt || 0);
  /* Framtid (klukkan gekk til baka, eda `lastMoveAt` er skakkt) telst
     HREYFING, ekki bidstada: ad giska a haega hradann thegar vid vitum
     ekkert er nakvaemlega villan sem thetta fall er til ad laga. */
  return since < window ? fast : slow;
}
