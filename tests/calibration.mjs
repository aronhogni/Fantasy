/* ============================================================
   KVORDUNIN — MAELIR HUN ThAD SEM HUN SEGIR?

   `src/calibration.js` ber spa-bokhaldid (`data/predictions/gw{N}.json`) vid
   thad sem GERDIST og segir hvort maelingarnar haldi. Hun getur ekki keyrt a
   raungognum fyrr en fyrsta umferd er lokin — 21. agust 2026.

   ThVI ER HUN PROFUD A TILBUNUM GOGNUM NUNA. Thad er ekki varuð heldur regla:
   "Omældur kóði sem fer í gang einn morgun er ekki ásættanlegt" (CLAUDE.md
   kafli 5). Sama mynstur og `mins-trend.mjs` kafli 0, `defcon-shrink.mjs` og
   `bsd-pipeline.mjs`.

   TILBUNU GOGNIN ERU BYGGD SVO SVARID SE ThEKKT FYRIRFRAM. Fullyrding sem
   segir adeins "skilar tolu" er ekki maeling a kvordun; hun er maeling a thvi
   ad kodinn hafi keyrt. Hvert tilfelli her hefur RETTA SVARID reiknad i
   hausnum og profad gegn thvi.

   OG SIDASTI KAFLINN SEFUR: se ekkert bokhald til (forleikur) prentar hann
   thad og fellur EKKI. Dagurinn sem hann faer gogn er dagurinn sem hann fer
   ad segja eitthvad — sama hegdun og `gw1-checklist.mjs`.
   ============================================================ */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { ffdrVsCleanSheets, rankVsPoints, startProbCalibration, resultsFromFixtures }
  from "../src/calibration.js";

const D = new URL("../data/", import.meta.url).pathname;
const P = D + "predictions/";
let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                    : (fail++, console.log(`  ✗ ${n}${extra ? "   " + extra : ""}`)); };

/* ---------------------------------------------------------------
   1. FFDR -> HREIN BLOD, MED ThEKKTU SVARI
   --------------------------------------------------------------- */
console.log("\n1) FFDR gegn hreinum blodum (tilbuin gogn, thekkt svar)");
{
  /* 40 lid-leikir i threpi 0 thar sem 30 halda hreinu -> 0,75.
     40 i threpi 5 thar sem 4 halda hreinu -> 0,10.
     Threpin eru thvi EINRAEN og bilid er 0,75 / 0,10.                   */
  const snapshots = [{ gw: 1, ffdr: [] }];
  const results = [];
  let fx = 1;
  const add = (tier, n, cs) => {
    for (let i = 0; i < n; i++, fx++) {
      snapshots[0].ffdr.push({ fixture: fx, team: 1, opp: 2, home: true, def: 1 + tier, def_tier: tier });
      results.push({ fixture: fx, team: 1, conceded: i < cs ? 0 : 2, scored: 1 });
    }
  };
  add(0, 40, 30); add(5, 40, 4);
  const r = ffdrVsCleanSheets({ snapshots, results, minN: 20 });
  ok(`pöruð ${r.matched} lið-leikir`, r.matched === 80, String(r.matched));
  const t0 = r.tiers.find(t => t.tier === 0), t5 = r.tiers.find(t => t.tier === 5);
  ok(`þrep 0 -> 0,75 (${t0?.value})`, t0?.value === 0.75);
  ok(`þrep 5 -> 0,10 (${t5?.value})`, t5?.value === 0.10);
  ok("bilid er skrad (lettast a moti thyngst)", r.spread?.light === 0.75 && r.spread?.heavy === 0.10);
  ok("einraeni greind", r.monotone === true);
  ok("skjalfesta vidmidid fylgir tolunni", r.documented?.lightest === 0.449);

  /* SNUID VID: thyngri threp gefa FLEIRI hrein blod -> einraeni BROTIN.
     Thetta er tilfellid sem a ad vekja mann, svo thad verdur ad greinast. */
  const snap2 = { gw: 1, ffdr: [] }, res2 = [];
  fx = 1;
  for (const [tier, cs] of [[0, 5], [5, 35]]) {
    for (let i = 0; i < 40; i++, fx++) {
      snap2.ffdr.push({ fixture: fx, team: 1, opp: 2, home: true, def: 1 + tier, def_tier: tier });
      res2.push({ fixture: fx, team: 1, conceded: i < cs ? 0 : 2, scored: 1 });
    }
  }
  ok("SNUID merki -> einraeni BROTIN (greinist)",
     ffdrVsCleanSheets({ snapshots: [snap2], results: res2, minN: 20 }).monotone === false);

  /* FAAR MAELINGAR -> ENGIN TALA. */
  const thin = ffdrVsCleanSheets({ snapshots: [{ gw: 1, ffdr: [
    { fixture: 1, team: 1, opp: 2, home: true, def: 1, def_tier: 0 }] }],
    results: [{ fixture: 1, team: 1, conceded: 0 }], minN: 20 });
  ok("1 syni -> null, ekki 100%", thin.tiers[0].value === null);
  ok("og notan segir hvers vegna", /sýni/.test(thin.tiers[0].why || ""), thin.tiers[0].why);
}

/* ---------------------------------------------------------------
   2. RODUNIN -> RAUNSTIG, MED ThEKKTU SVARI
   --------------------------------------------------------------- */
console.log("\n2) Rodunin gegn raunstigum (tilbuin gogn, thekkt svar)");
{
  /* 20 leikmenn. `score_avail` radar theim ordrett i rod stiga (20..1), svo
     topp-15 okkar = stig 20..6 -> medaltal 13.
     `ep_next` radar THVERT A MOTI (1..20), svo topp-15 FPL = stig 1..15 ->
     medaltal 8. Okkar a thvi ad SLA FPL, og tolurnar eru fyrirfram thekktar. */
  const rank = [], pts = new Map();
  for (let i = 0; i < 20; i++) {
    const id = i + 1, actual = 20 - i;
    rank.push({ id, score_avail: 20 - i, ep_next: i + 1 });
    pts.set(id, actual);
  }
  const r = rankVsPoints({ snapshots: [{ gw: 1, rank }], points: new Map([[1, pts]]), n: 15, minN: 10 });
  ok(`15 val ur 1 umferd (${r.picks}, gws ${r.gws})`, r.picks === 15 && r.gws === 1);
  ok(`okkar topp-15 = 13,000 (${r.ours})`, r.ours === 13);
  ok(`FPL-xP topp-15 = 8,000 (${r.fplXp})`, r.fplXp === 8);
  ok(`medal-leikmadur = 10,500 (${r.average})`, r.average === 10.5);
  ok("okkar slaer FPL", r.beatsFpl === true);
  ok("skjalfestu vidmidin fylgja (5,13 / 4,48)",
     r.documented?.ours === 5.13 && r.documented?.fplXp === 4.48);

  /* Se rodun okkar VERRI en FPL verdur thad ad sjast — annars er talan skraut. */
  const bad = rankVsPoints({ snapshots: [{ gw: 1,
    rank: rank.map(x => ({ ...x, score_avail: x.ep_next, ep_next: x.score_avail })) }],
    points: new Map([[1, pts]]), n: 15, minN: 10 });
  ok("VERRI rodun -> beatsFpl false (greinist)", bad.beatsFpl === false);

  /* Umferd an urslita telur EKKI — engin stig, engin tala. */
  const none = rankVsPoints({ snapshots: [{ gw: 7, rank }], points: new Map(), n: 15, minN: 10 });
  ok("engin urslit -> null + skyring", none.ours === null && /val/.test(none.why || ""));
}

/* ---------------------------------------------------------------
   3. BYRJUNAR-LIKUR: BRIER OG BEKKJAR-GILDRAN
   --------------------------------------------------------------- */
console.log("\n3) Byrjunar-likur (tilbuin gogn, thekkt svar)");
{
  /* FULLKOMIN spa: p=1 fyrir alla sem spila 90, p=0 fyrir alla sem spila 0.
     Brier a tha ad vera NAKVAEMLEGA 0 og grunntidnin verri.              */
  const rank = [], mins = new Map();
  for (let i = 0; i < 200; i++) {
    const id = i + 1, plays = i < 140;
    rank.push({ id, start_prob: plays ? 1 : 0 });
    mins.set(id, plays ? 90 : 0);
  }
  const r = startProbCalibration({ snapshots: [{ gw: 1, rank }], minutes: new Map([[1, mins]]), minN: 100 });
  ok(`200 syni (${r.n})`, r.n === 200);
  ok(`fullkomin spa -> Brier 0 (${r.brier})`, r.brier === 0);
  ok(`grunntidni verri (${r.baseline})`, r.baseline > 0 && r.beatsBaseline === true);
  /* BEKKJAR-GILDRAN: laegsti tiundarhluti (20 menn, allir p=0) eru allir a
     bekknum. 60 falla a bekk i heild -> 20/60 = 0,3333.                  */
  ok(`laegsti tiundarhluti fangar 20 af 60 = 0,3333 (${r.bottomDecileBenched})`,
     r.bottomDecileBenched === 0.3333);

  /* VITLAUS spa (snuid vid) verdur ad vera VERRI en grunntidnin.          */
  const flip = startProbCalibration({ snapshots: [{ gw: 1,
    rank: rank.map(x => ({ ...x, start_prob: 1 - x.start_prob })) }],
    minutes: new Map([[1, mins]]), minN: 100 });
  ok("SNUID spa -> slaer EKKI grunntidnina (greinist)", flip.beatsBaseline === false);

  const thin = startProbCalibration({ snapshots: [{ gw: 1, rank: rank.slice(0, 10) }],
    minutes: new Map([[1, mins]]), minN: 100 });
  ok("10 syni -> null, ekki Brier", thin.brier === null && /sýni/.test(thin.why || ""));
}

/* ---------------------------------------------------------------
   4. URSLIT UR LEIKJASKRA
   --------------------------------------------------------------- */
console.log("\n4) Urslit ur leikjaskra");
{
  const fx = [
    { id: 1, finished: true, team_h: 1, team_a: 2, team_h_score: 2, team_a_score: 0 },
    { id: 2, finished: false, team_h: 3, team_a: 4, team_h_score: 1, team_a_score: 1 },
    { id: 3, finished: true, team_h: 5, team_a: 6, team_h_score: null, team_a_score: null },
  ];
  const r = resultsFromFixtures(fx);
  ok(`adeins LOKNIR leikir med stodu (${r.length} radir = 1 leikur x 2 lid)`, r.length === 2);
  ok("heimalid: 0 a sig (hreint blad)", r.find(x => x.team === 1)?.conceded === 0);
  ok("utilid: 2 a sig", r.find(x => x.team === 2)?.conceded === 2);
  ok("leikur I GANGI telur EKKI (hlutastada er ekki urslit)", !r.some(x => x.team === 3));
  ok("lokinn leikur AN stodu telur ekki", !r.some(x => x.team === 5));
}

/* ---------------------------------------------------------------
   5. RAUNGOGN — SEFUR I FORLEIK
   --------------------------------------------------------------- */
console.log("\n5) Raungogn: bokhald + urslit");
{
  const files = existsSync(P) ? readdirSync(P).filter(f => /^gw\d+\.json$/.test(f)) : [];
  const snapshots = files.map(f => JSON.parse(readFileSync(P + f, "utf8")));
  const fixtures = (() => { try {
    const j = JSON.parse(readFileSync(D + "fixtures.json", "utf8"));
    return Array.isArray(j) ? j : (j.fixtures || []);
  } catch { return []; } })();
  const results = resultsFromFixtures(fixtures);
  const scoredGws = new Set(results.map(r => r.fixture)
    .map(id => fixtures.find(f => f.id === id)?.event).filter(x => x != null));
  const ready = snapshots.filter(s => scoredGws.has(s.gw));

  console.log(`     bokhald: ${snapshots.length} umferdir · loknar umferdir: ${scoredGws.size}`
            + ` · kvardanlegar: ${ready.length}`);

  if (!ready.length) {
    /* SEFUR. Dagurinn sem thetta faer gogn er dagurinn sem thad borgar sig —
       sama hegdun og gw1-checklist.mjs. Ekkert fall, engin tilbuin tala.  */
    console.log("     FORLEIKUR/BID: engin umferd hefur BADI bokhald OG urslit.");
    console.log("     Kvordunin sefur; kaflar 1-4 hafa sannreynt vélina a tilbunum gognum.");
    ok("kvordunin sefur an ad falla (ekkert bokhald enn)", true);
    ok("og vélin er samt sannreynd (kaflar 1-4 keyrdu)", pass > 15);
  } else {
    const r1 = ffdrVsCleanSheets({ snapshots: ready, results });
    console.log(`     FFDR: ${r1.matched} lid-leikir · einraeni ${r1.monotone}`);
    for (const t of r1.tiers) console.log(`        threp ${t.tier}: CS ${t.value ?? "—"} (n=${t.n})`);
    ok("FFDR-kvordun skilar threpum", r1.tiers.length > 0);
    /* Einraeni er PROFID um leid og urtakid ber thad. Falli hun er thad EKKI
       endilega villa — en thad er thad sem madur VILL vita.               */
    if (r1.monotone !== null)
      ok(`FFDR er einraen i threpum (${r1.monotone})`, r1.monotone === true,
         "letttari threp gefa EKKI fleiri hrein blod — skoda strax");
  }
}

console.log(`\nKVORDUN: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
