/* ============================================================
   draft-sync.mjs — POLLUNIN: HVAD ER ENDURTEIKNAD OG HVE ORT.

   Baedi follin voru inni i `DraftBoard.jsx` og thess vegna adeins
   profanleg med jsdom, fokum klukkum og heilu vidmotinu. Nu eru thau
   hrein og profud her — sami kodi sem appid keyrir.

   ÞETTA SPRATT UR ATHUGASEMD NOTANDANS: "eg prufadi ad mock drafta og
   thad updateast of haegt hja mer leikmannalistinn." Tvaer orsakir,
   badar profadar her.
   ============================================================ */

import { pickSignature, pollDelay, POLL } from "../src/draft-sync.js";

let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? "ok  " : "FAIL"} ${m}`); if (!c) fail++; };

console.log("1. fingrafarid — obreytt svar ma ekki endurteikna");
{
  ok(pickSignature(["a", "b"], ["a"]) === pickSignature(["a", "b"], ["a"]),
    "sama svar gefur sama fingrafar");

  /* Kjarninn: THETTA er tilfellid sem sparar 200 rada endurteikningu
     a 5 sek fresti allt draftid. */
  const s = pickSignature(["a", "b", "c"], []);
  ok(s === pickSignature(["a", "b", "c"], []),
    "ny fylki med somu gildum gefa sama fingrafar (tilvisun raedur ekki)");

  ok(pickSignature(["a", "b"], []) !== pickSignature(["a", "b", "c"], []),
    "nytt val breytir fingrafarinu");

  /* FJOLDINN EINN DUGAR EKKI, og thad er ekki tilgata: bordid thekkir
     ~1.130 af ~11.400 leikmonnum Sleeper, svo eitt thekkt og eitt
     othekkt val i somu pollun heldur longdinni fastri medan
     innihaldid breytist. */
  ok(pickSignature(["a", "b"], []) !== pickSignature(["a", "c"], []),
    "sami fjoldi en annad innihald er ANNAD fingrafar");

  /* `mine` verdur ad vera inni: `draft_order` er oft dregid EFTIR ad
     tengt er, svo saetid ratast inn seinna og tha breytist hverjir eru
     minir an thess ad `ids` haggist. Vaeri `mine` utan fingrafarsins
     kaemi thinn eigin hopur aldrei fram. */
  ok(pickSignature(["a", "b"], []) !== pickSignature(["a", "b"], ["a"]),
    "sama val en nytt SAETI er annad fingrafar");

  ok(pickSignature(null, null) === pickSignature([], []),
    "null telst tomt, ekki hrun");
}

console.log("\n2. hradinn fylgir draftinu");
{
  const now = 1_000_000;

  ok(pollDelay(now - 1000, now) === POLL.fast,
    `val fyrir sekundu -> hradur (${POLL.fast} ms)`);
  ok(pollDelay(now - (POLL.window - 500), now) === POLL.fast,
    "innan glugga -> enn hradur");
  ok(pollDelay(now - (POLL.window + 500), now) === POLL.slow,
    `logn utan glugga -> haegur (${POLL.slow} ms)`);

  /* Gamla hegdunin var FOST 5000 ms, valin ut fra raundrafti (30-90
     sek a val). Mock med botum gefur 1-3 sek, svo talan var ekki
     oheppileg heldur byggd a forsendu sem gildir i helmingi tilvika.
     Thetta prof ver ad hradi mock-tilfellisins se RAUNVERULEGA
     hradari en gamla talan — ekki bara "einhver tala". */
  ok(POLL.fast < 5000, `hradi hamurinn er hradari en gamla fasta talan (${POLL.fast} < 5000)`);
  ok(POLL.slow === 5000, "og logn-hamurinn er ospillt gamla hegdunin (5000)");

  /* Aldrei sott -> haegur. Fyrsta pollun ma ekki hefja hradan ham a
     grundvelli thess ad `lastMove` se 0 og "0 er nylegt" i einhverri
     reikniskekkju. */
  ok(pollDelay(0, now) === POLL.slow, "ekkert val enn -> haegur");

  /* Klukka sem gengur til baka (notandinn stillti hana, eda vafrinn
     svaefdi flipann) telst HREYFING. Ad giska a haega haminn thegar vid
     vitum ekkert er nakvaemlega villan sem thetta fall lagar. */
  ok(pollDelay(now + 10_000, now) === POLL.fast,
    "framtidar-timastimpill telst hreyfing, ekki bidstada");

  /* Tolurnar eru stillanlegar — annars gaeti prof ekki sannad regluna
     an thess ad fara eftir sjalfgefnu gildunum sem thad er ad profa. */
  ok(pollDelay(now - 3000, now, { window: 1000, slow: 9999 }) === 9999,
    "gluggi og hradi eru stillanlegir (svo profid se ekki hringrok)");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
