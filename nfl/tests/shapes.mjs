/* ============================================================
   shapes.mjs — INVARIANTAR YFIR SLEMBNAR DEILDARLAGANIR

   Oll onnur sofn profa EINA eda TVAER deildarlaganir: 12 lid, PPR,
   14-15 umferdir. Notandinn getur haft adra hverja — 10 lid, superflex,
   tvo flex-saeti, engan TE i byrjunarlidi — og logunin fer INN I
   nanast hverja tolu sem appid birtir (varamanns-threpid, VBD, tierin,
   `startableSlots`, snakk-rodin, hvad telst hola).

   ÞETTA SAFN SPYR ThVI ANNARRAR SPURNINGAR EN HIN: ekki "er thessi tala
   rett i thessari deild" heldur "eru reglurnar SJALFAR samkvaemar, i
   hvada deild sem er". Þad er eina profid i safninu sem getur fundid
   villu sem birtist adeins i 16-lida superflex-deild med tvo flex.

   ÞEKJA ER FULLYRDING: hver invariant ber teljara og kaflinn FELLUR ef
   eitthvad theirra var aldrei reynt — annars vaeri hann graenn af thvi
   ad astandid kom aldrei upp, sem er nakvaemlega tomu fullyrdingarnar
   sem thetta repo skjalar.
   ============================================================ */
process.argv[2] = process.argv[2] || "20260902";
process.argv[3] = process.argv[3] || "60";
const { bad, seen } = await import("./lib/shapes-core.mjs");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

console.log("\n1. invariantar halda i hverri logun");
for (const b of bad.slice(0, 20)) console.log(`     ${b}`);
ok(bad.length === 0, `engin brot a invariontum (${bad.length})`);

console.log("\n2. og astondin voru raunverulega reynd");
/* Þessi tolur eru GOLF, ekki maelingar: thau eru sett svo lagt ad
   slembin keyrsla nai theim alltaf, en yfir null — svo fullyrdingarnar
   ad ofan geti ekki verid tomar. */
const floors = { urgent: 1, byes: 1, above: 5, survive: 20,
                 superflex: 1, twoFlex: 1, mustFill: 1, empty: 1 };
for (const [k, floor] of Object.entries(floors)) {
  ok((seen[k] || 0) >= floor,
    `astandid "${k}" kom upp ${seen[k] || 0} sinnum (golf ${floor})`);
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
