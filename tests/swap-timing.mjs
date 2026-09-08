/* ============================================================
   HVENAER A AD GERA SKIPTIN — VORDUR (5.9.2026)
   ============================================================
   Reglan sjalf og maelingarnar eru skjaladar i `src/swaptiming.js`.
   Thessi kafli ver ThRENNT sem maelingin getur ekki:
     (a) formuluna a tolum thar sem svarid er reiknad i hondunum,
     (b) ad hun THEGI thar sem hun a ad thegja — „skiptu nuna" er RETTA
         svarid i 78-92% tilfella og regla sem talar alltaf er verri en
         engin,
     (c) ad hun geri ENGA fullyrdingu sem maelingin bannar (ekkert
         orakel-thak, engin meidsla-fullyrding).

   Keyrsla:  node tests/swap-timing.mjs
   ============================================================ */
import { readFileSync } from "node:fs";
import { swapTiming, SWAP_KMAX, SWAP_TAU, SWAP_WEAK_NET } from "../src/swaptiming.js";

let pass = 0, fail = 0;
const ok = (m, c, extra = "") => { c ? pass++ : fail++;
  console.log(`  ${c ? "✓" : "✗"} ${m}${extra && !c ? " — " + extra : ""}`); };

console.log("=== 1. FORMULAN A TOLUM ThAR SEM SVARID ER ThEKKT ===");
{
  const flat = [3, 3, 3, 3, 3, 3];
  /* Sami leikjaferill, betri madur -> engin astaeda til ad bida.      */
  const a = swapTiming({ epOut: flat, epIn: [5, 5, 5, 5, 5, 5], freeTransfers: 1 });
  ok(`jafn ferill -> „nuna" (${a.verdict})`, a.verdict === "now" && a.k === 0);
  /* KROSSUN: sa sem fer ut skorar meira i tvaer vikur, sa sem kemur inn
     eftir thad. Handreiknad: valueOf(2) = 6+6 + 7*4 = 40, valueOf(0) =
     1+1+7+7+7+7 = 30, svo k = 2 og avinningur 10.                     */
  const b = swapTiming({ epOut: [6, 6, 2, 2, 2, 2], epIn: [1, 1, 7, 7, 7, 7], freeTransfers: 1 });
  ok(`krossun -> bida i 2 umferdir (k=${b.k}, avinningur ${b.gain})`,
    b.verdict === "wait" && b.k === 2 && Math.abs(b.gain - 10) < 1e-9);
  /* ThAKID ER MAELT: nested val velur k3 i ollum fimm foldum.          */
  const c = swapTiming({ epOut: [9, 9, 9, 9, 1, 1], epIn: [1, 1, 1, 1, 9, 9], freeTransfers: 1 });
  ok(`bidin er ThOKUD vid ${SWAP_KMAX} umferdir (k=${c.k})`, c.k <= SWAP_KMAX);
  ok("og thakid er 3 — maelt, ekki valid", SWAP_KMAX === 3);
}

console.log("\n=== 2. HUN ThEGIR ThAR SEM HUN A AD ThEGJA ===");
{
  /* VEIKT SKIPTI: undir kvordunar-throskuldinum er raunutkoman
     hlutkesti (49-52%), svo reglan segir ekkert um TIMASETNINGU.      */
  const w = swapTiming({ epOut: [3, 3, 3, 3, 3, 3], epIn: [3.2, 3.2, 3.2, 3.2, 3.2, 3.2],
                         freeTransfers: 1 });
  ok(`veikt skipti -> „weak", ekki timasetning (${w.verdict})`,
    w.verdict === "weak" && w.k === null);
  ok("og astaedan er um SKIPTIN, ekki um vikuna", w.why === "netGainBelowThreshold");
  ok(`throskuldurinn er kvordun (${SWAP_WEAK_NET}), ekki throskuldur ur leit`,
    SWAP_WEAK_NET === 3);
  /* ENGIN FRISKIPTI: hrein reikningsdaemi. Likan sem velur gefur
     NAKVAEMLEGA sama og „bida alltaf" (delta 0,000 CI [-0,022, +0,027]). */
  const f0 = swapTiming({ epOut: [3, 3, 3, 3, 3, 3], epIn: [9, 9, 9, 9, 9, 9], freeTransfers: 0 });
  ok(`engin friskipti -> bida eina viku, an likans (${f0.k})`,
    f0.verdict === "wait" && f0.k === 1 && f0.why === "noFreeTransfer");
  /* TAU ER STILLING: haerra tau -> reglan talar SJALDNAR. Profad a
     hegdun, ekki a tolunni.                                           */
  /* NETTO VERDUR AD VERA YFIR VEIKA THROSKULDINUM, ANNARS SKER `weak`
     UR ADUR EN `tau` KEMST AD — fyrsta utgafa thessarar fullyrdingar bar
     „weak -> weak" og profadi thvi EKKERT um `tau`. Handreiknad:
     valueOf(0) = 4+4+6+6+6+6 = 32
     valueOf(1) = 5 + (4+6+6+6+6)  = 33
     valueOf(2) = 5+5 + (6+6+6+6)  = 34  <- best, avinningur 2
     (Fyrsta utgafan mín reiknadi 33 og gleymdi ad bera k=2 saman —
     profid greip mina eigin reiknivillu, ekki kodann.)               */
  const near = { epOut: [5, 5, 3, 3, 3, 3], epIn: [4, 4, 6, 6, 6, 6], freeTransfers: 1 };
  const loose = swapTiming({ ...near, tau: 0 });
  const tight = swapTiming({ ...near, tau: 5 });
  ok(`forsenda: skiptid er sterkt nog til ad `+"`tau`"+` fai ad rada (netto ${loose.net})`,
    loose.verdict !== "weak" && tight.verdict !== "weak");
  ok(`lagt tau -> hun TALAR (k=${loose.k}, avinningur ${loose.gain})`,
    loose.verdict === "wait" && loose.k === 2 && Math.abs(loose.gain - 2) < 1e-9);
  ok(`haerra tau -> hun ThEGIR (${tight.verdict})`, tight.verdict === "now");
}

console.log("\n=== 3. RUSL-INNTAK FELLIR HANA EKKI ===");
{
  ok("engin fylki -> null", swapTiming({ epOut: null, epIn: null }) === null);
  ok("tomt fylki -> null", swapTiming({ epOut: [], epIn: [] }) === null);
  ok("ein umferd -> null (of stutt til ad tala um timasetningu)",
    swapTiming({ epOut: [3], epIn: [5] }) === null);
  const r = swapTiming({ epOut: [3, null, "x", 3, 3, 3], epIn: [5, 5, 5, 5, 5, 5], freeTransfers: 1 });
  ok(`rusl innan fylkis fellir hana ekki (${r && r.verdict})`, !!r && Number.isFinite(r.net));
}

console.log("\n=== 4. ThAD SEM HUN MA EKKI FULLYRDA ===");
{
  const src = readFileSync(new URL("../src/swaptiming.js", import.meta.url), "utf8");
  /* MAELINGIN BANNAR ThRENNT — sja hausinn a skranni.                 */
  ok("skrain nefnir ad orakel-thakid se HAVADI",
    /100% havadi|stokkudum vikum/i.test(src),
    "— besta vikan maelist +3,08 en +3,12 a stokkudum vikum");
  ok("og ad ~72% virdisins seu blank/tvofaldar, ekki liturinn",
    /72%/.test(src));
  ok("og ad ENGIN fullyrding se gerd um meidsli",
    /ENGIN fullyrding um meidsli|ENGIN fullyrding um meidsl|ENGIN fullyrding|avail = 1/i.test(src));
  /* TAU MA ALDREI BIRTAST SEM MAELD TALA.                             */
  ok("`tau` er MERKT sem stilling en ekki maeldur fasti",
    /STILLING/.test(src) && /ma thvi ALDREI birtast sem maeld tala/.test(src));
  /* OG HUN BAETIR ENGRI NYRRI STIGA-FORMULU VID.                      */
  ok("engin ny stiga-formula — hun raðar adeins i tima",
    !/lookupPos|POS_MEAN_PTS|calibrateExp|pointsBase/.test(src),
    "— vaent stig koma ADFLUTT fra kallandanum");
}

console.log(`\nSKIPTA-TIMASETNING: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
