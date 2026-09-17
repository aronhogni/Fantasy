/* ============================================================
   EVROPU-THATTTAKA — STJARNAN SEM VANTADI

   Notandinn: "Man Utd er i Evropu en er ekki med stjornu?????"
   Hann hafdi rett fyrir ser. `participation` i euro_fixtures.json bar
   ADEINS CL (6 ensk lid). Lykkjan i fetch.mjs bidur um CL, EL og ECL, en
   okeypis threp football-data.org gefur adeins CL — svo EL og ECL FELLU
   THEGJANDI: villan for i `console.log` og hvergi annad, `found` fekk enga
   faerslu og `status.json` vissi ekkert. Lid an stjornu gat thvi thytt
   annad hvort "ekki i Evropu" eda "vid vitum thad ekki", og notandinn
   gat ekki greint thar a milli.

   THETTA SAFN VER TVENNT:
     1. ad lykla-vorpunin nái YFIR ALLAR uefa-keppnir sem sottar eru. Min
        EIGIN fyrsta lagfaering skrifadi "uefa.conference_qual" thar sem
        listinn notar "uefa.conf_qual" — sama villa, i lagfaeringunni.
     2. ad thekjan se SKRAD i status.json, svo "engin stjarna" se aldrei
        thogult.
   ============================================================ */
import { readFileSync } from "node:fs";
import { carryParticipation } from "../scripts/fetch.mjs";

const src = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
let pass = 0, fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${extra ? "   " + extra : ""}`); }
};

console.log(`\n${"=".repeat(84)}`);
console.log("EVROPU-THATTTAKA");
console.log("=".repeat(84));

/* ESPN-listinn sjalfur — thad sem er RAUNVERULEGA sott. */
const listBlock = src.slice(src.indexOf('"uefa.champions"'), src.indexOf('"uefa.champions"') + 400);
const fetched = [...listBlock.matchAll(/"(uefa\.[a-z_.]+)"/g)].map(m => m[1]);
ok(`ESPN-listinn fannst (${fetched.length} keppnir)`, fetched.length >= 6, fetched.join(" "));

/* Vorpunin. */
const tagBlock = src.slice(src.indexOf("const COMP_TO_TAG = {"));
const tagged = new Set([...tagBlock.slice(0, tagBlock.indexOf("};"))
  .matchAll(/"(uefa\.[a-z_.]+)":/g)].map(m => m[1]));
ok(`vorpunin fannst (${tagged.size} lyklar)`, tagged.size >= 6);

/* 1. HVER SOTT KEPPNI VERDUR AD BERA MERKI — nema bikarar/ofurbikar sem
      eru ekki Evropukeppni i thessum skilningi.                        */
const NOT_A_EURO_RUN = new Set(["uefa.super_cup"]);
const missing = fetched.filter(c => !tagged.has(c) && !NOT_A_EURO_RUN.has(c));
ok(`hver sott uefa-keppni ber merki${missing.length ? " — VANTAR: " + missing.join(", ") : ""}`,
   missing.length === 0);

/* 2. Og ekkert merki ma visa a keppni sem er EKKI sott (stafsetningar-
      villa myndi lita ut eins og thekja).                              */
const ghost = [...tagged].filter(c => !fetched.includes(c));
ok(`ekkert merki visar a okunna keppni${ghost.length ? " — DRAUGAR: " + ghost.join(", ") : ""}`,
   ghost.length === 0);

/* 3. Thekjan verdur ad vera SKRAD. */
ok("thekjan er skrad i status.json (record euro_participation)",
   /record\("euro_participation"/.test(src));
ok("notan segir HVADA keppnir vantar",
   /only \$\{partOk\.join/.test(src) && /carry NO star/.test(src));

/* 4. Thatttaka er lika leidd ut ur ESPN-leikjunum sem vid sottum hvort
      ed er — annars vaeri EL/ECL alltaf tomt a okeypis threpinu.       */
ok("thatttaka er leidd ut ur leikjunum sjalfum", /part-from-fixtures/.test(src));
ok("hun er lesin ADUR en stale-sian keyrir",
   src.indexOf("COMP_TO_TAG") < src.indexOf("stale++"),
   "undankeppnir eru i fortidinni og myndu annars detta ut");

/* 5. RAUNGOGNIN EINS OG THAU ERU NUNA: skjalfest astand, svo naesta
      keyrsla syni breytinguna.                                        */
try {
  const eu = JSON.parse(readFileSync(new URL("../data/euro_fixtures.json", import.meta.url), "utf8"));
  const comps = new Set(Object.values(eu.participation || {}).flat());
  console.log(`  · nuverandi thatttaka: ${Object.keys(eu.participation || {}).length} lid, `
              + `keppnir: ${[...comps].join(", ") || "engar"}`);
  console.log("  · (CL eitt = gomlu gognin; naesta keyrsla a ad baeta vid EL/ECL)");
} catch { console.log("  · euro_fixtures.json ekki lesin"); }

/* ---- THATTTAKA SEM HEIMILDIN GETUR EKKI ENDURSTADFEST HELST (17.9.2026) ----
   Rauntilfellid: BOU/BHA/CRY/SUN misstu EL/ECL-merkid thegar ESPN-
   undankeppnisleikirnir runnu ut ur glugganum og football-data.org svarar
   EL/ECL med 403/404. Hlidid hafnadi dagskommitinu tvo daga i rod.       */
console.log("\n=== carryParticipation — borid afram innan timabils, ekki yfir i naesta ===");
{
  const prev = { updated: "2026-09-15T09:59:00Z", participation: { 1: ["CL"], 3: ["EL"], 5: ["ECL"], 20: ["EL"] } };
  const today = { 1: ["CL"], 2: ["CL"] };
  const n = carryParticipation(today, prev, ["CL"], 2026);
  ok(`EL/ECL ur fyrri skra eru borin afram thegar API-id stadfesti adeins CL (${n})`, n === 3 && today[3]?.[0] === "EL" && today[5]?.[0] === "ECL" && today[20]?.[0] === "EL");
  ok("stadfest keppni (CL) treystir listanum dagsins — ekkert borid afram i hana", !today[1].includes("EL") && today[1].length === 1);
  const t2 = { 1: ["CL"] };
  ok("klubbur sem HVARF ur stadfestri keppni er ekki borinn afram (raunverulegt fall)", carryParticipation(t2, { ...prev, participation: { 1: ["CL"], 7: ["CL"] } }, ["CL"], 2026) === 0 && !t2[7]);
  const t3 = { 1: ["CL"] };
  ok("fyrri skra ur FYRRA timabili ber ekkert afram — merkid lifir ekki yfir i naesta ar", carryParticipation(t3, { updated: "2025-09-15T09:59:00Z", participation: { 3: ["EL"] } }, ["CL"], 2026) === 0 && !t3[3]);
  ok("engin fyrri skra -> 0", carryParticipation({ 1: ["CL"] }, null, ["CL"], 2026) === 0);
}

console.log(`\nEVROPU-THATTTAKA: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
