/* ============================================================
   nfl-lineup.mjs — ver byrjunarlids-valid.

   KAFLI 3 ER PROFSTEINNINN: graduga lausnin er borin vid TAEMANDI
   LEIT a smaum tilvikum. Krafan er JAFNAÐUR, ekki "naerri lagi".
   Se hun brotin er einhver a bekknum sem aetti ad spila — nakvaemlega
   thad sem tolid er til ad hindra.
   ============================================================ */

import { optimalLineup, lineupAdvice, benchRegret, slotsFor, DEFAULT_SLOTS }
  from "../src/lineup.js";

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const near = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m} (${a} ~ ${b})`);

const P = (id, pos, proj, extra = {}) => ({ id, name: id, pos, proj, ...extra });

/* ---------- 1. GRUNNTILVIK ---------- */
console.log("\n1. grunntilvik");
{
  const roster = [
    P("qb1", "QB", 20), P("qb2", "QB", 18),
    P("rb1", "RB", 18), P("rb2", "RB", 15), P("rb3", "RB", 14),
    P("wr1", "WR", 17), P("wr2", "WR", 16), P("wr3", "WR", 12), P("wr4", "WR", 11),
    P("te1", "TE", 10), P("te2", "TE", 4),
    P("k1", "K", 8), P("d1", "DST", 7),
  ];
  const r = optimalLineup(roster);
  const ids = r.starters.map((s) => s.player && s.player.id);

  ok(ids.includes("qb1") && !ids.includes("qb2"), "besti QB spilar, hinn a bekk");
  ok(ids.includes("rb1") && ids.includes("rb2"), "tveir bestu RB i fostum saetum");
  ok(ids.includes("wr1") && ids.includes("wr2") && ids.includes("wr3"),
    "thrir bestu WR i fostum saetum");
  /* FLEX: besti afgangur ur RB/WR/TE er rb3 (14) — ekki wr4 (11)
     og ekki te2 (4). */
  const flex = r.starters.find((s) => s.slot === "FLEX");
  ok(flex && flex.player && flex.player.id === "rb3",
    `flex tekur besta afgang (${flex && flex.player && flex.player.id})`);
  ok(r.unfilled.length === 0, "oll saeti fyllt");

  /* KJARNAKRAFAN: enginn a bekknum ma vera betri en einhver sem
     spilar A SOMU STODU sem hann gaeti tekid. */
  for (const b of r.bench) {
    for (const s of r.starters) {
      if (!s.player || !s.eligible.includes(b.pos)) continue;
      ok(!(b.ev > s.player.ev),
        `bekkur ${b.id} (${b.ev}) er ekki betri en ${s.slot} ${s.player.id} (${s.player.ev})`);
    }
  }
}

/* ---------- 2. NULL, AUD VIKA OG MEIDSLI ---------- */
console.log("\n2. null er ekki null");
{
  const roster = [
    P("qb1", "QB", null),              // engin spa
    P("qb2", "QB", 12),
    P("rb1", "RB", 20, { bye: true }), // aud vika
    P("rb2", "RB", 10),
    P("rb3", "RB", 9),
    P("wr1", "WR", 14), P("wr2", "WR", 13), P("wr3", "WR", 12),
    P("te1", "TE", 8),
  ];
  const r = optimalLineup(roster);
  const ids = r.starters.map((s) => s.player && s.player.id);

  ok(ids.includes("qb2"), "leikmadur AN SPAR er ekki settur i byrjunarlid …");
  ok(r.unknown.includes("qb1"), "… og hann er MERKTUR sem ospadur, ekki thagad um hann");
  ok(!ids.includes("rb1"), "leikmadur i AUDRI VIKU spilar ekki thott spain se haest");
  ok(ids.includes("rb2") && ids.includes("rb3"), "hinir tveir RB taka saetin");

  /* Tiltaekileiki: 20 stig med 40% likum a ad spila er verra en
     12 stig med vissu. Ad hunsa `avail` vaeri ad stilla upp meiddum
     manni af thvi ad spa hans er ha. */
  const r2 = optimalLineup([
    P("a", "TE", 20, { avail: 0.4 }),
    P("b", "TE", 12, { avail: 1 }),
    P("qb", "QB", 10), P("r1", "RB", 5), P("r2", "RB", 5),
    P("w1", "WR", 5), P("w2", "WR", 5), P("w3", "WR", 5),
  ]);
  const te = r2.starters.find((s) => s.slot === "TE");
  ok(te.player.id === "b",
    `20 stig x 40% (8,0) tapar fyrir 12 stigum x 100% (${te.player.id})`);

  /* Out = 0 tiltaekileiki -> alls ekki valkostur. */
  const r3 = optimalLineup([
    P("a", "TE", 30, { avail: 0 }), P("b", "TE", 3),
    P("qb", "QB", 10), P("r1", "RB", 5), P("r2", "RB", 5),
    P("w1", "WR", 5), P("w2", "WR", 5), P("w3", "WR", 5),
  ]);
  ok(r3.starters.find((s) => s.slot === "TE").player.id === "b",
    "leikmadur med tiltaekileika 0 er ekki valkostur, hversu ha sem spain er");
}

/* ---------- 3. PROFSTEINNINN: TAEMANDI LEIT ---------- */
console.log("\n3. PROFSTEINNINN — gradugt gegn taemandi leit");
{
  /* Smatt snid svo taemandi leit se raunhaef. */
  const slots = [
    { id: "QB", pos: ["QB"] },
    { id: "RB1", pos: ["RB"] }, { id: "RB2", pos: ["RB"] },
    { id: "WR1", pos: ["WR"] }, { id: "WR2", pos: ["WR"] },
    { id: "FLEX", pos: ["RB", "WR", "TE"] },
  ];

  /* Deterministiskt slembi — sama profa i hvert sinn. */
  let seed = 424242;
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };

  let worst = 0, cases = 0;
  for (let trial = 0; trial < 400; trial++) {
    const roster = [];
    let n = 0;
    for (const [pos, cnt] of [["QB", 2], ["RB", 4], ["WR", 4], ["TE", 2]]) {
      for (let i = 0; i < cnt; i++) {
        roster.push(P(`p${n++}`, pos, Math.round(rnd() * 250) / 10));
      }
    }
    const greedy = optimalLineup(roster, slots).projected;
    const brute = exhaustive(roster, slots);
    cases++;
    worst = Math.max(worst, brute - greedy);
    if (brute - greedy > 1e-9) {
      console.log(`     MISMUNUR tilvik ${trial}: gradugt ${greedy}, taemandi ${brute}`);
    }
  }
  ok(worst < 1e-9,
    `gradugt jafnar taemandi leit i ollum ${cases} tilvikum (versta frav. ${worst})`);
}

/** Taemandi leit: prufar allar loglegar uthlutanir. */
function exhaustive(roster, slots) {
  let best = 0;
  const used = new Set();
  const rec = (i, sum) => {
    if (i === slots.length) { best = Math.max(best, sum); return; }
    let any = false;
    for (const p of roster) {
      if (used.has(p.id) || !slots[i].pos.includes(p.pos)) continue;
      any = true;
      used.add(p.id);
      rec(i + 1, sum + p.proj);
      used.delete(p.id);
    }
    if (!any) rec(i + 1, sum);
  };
  rec(0, 0);
  return Math.round(best * 10) / 10;
}

/* ---------- 4. RADGJOF A EXISTANDI UPPSTILLINGU ---------- */
console.log("\n4. radgjof");
{
  const roster = [
    P("qb", "QB", 20), P("rb1", "RB", 18), P("rb2", "RB", 15),
    P("rb3", "RB", 14), P("wr1", "WR", 17), P("wr2", "WR", 16),
    P("wr3", "WR", 12), P("te", "TE", 10), P("k", "K", 8), P("d", "DST", 7),
  ];
  const optIds = optimalLineup(roster).starters
    .map((s) => s.player && s.player.id).filter(Boolean);

  const good = lineupAdvice(optIds, roster);
  ok(good.isOptimal, "optimal uppstilling faer engar tillogur");
  ok(good.changes.length === 0, "og engar breytingar");

  /* Setjum verri mann inn viljandi. */
  const bad = optIds.filter((id) => id !== "rb3").concat("wr3");
  const advice = lineupAdvice(bad, roster.map((p) => p));
  ok(!advice.isOptimal, "gollud uppstilling er greind");
  ok(advice.changes.length > 0, "og tillaga gefin");
}

/* ---------- 5. EFTIR A: BEKKJAR-EFTIRSJA ---------- */
console.log("\n5. bekkjar-eftirsja");
{
  const started = [P("a", "RB", 15), P("b", "WR", 12)];
  const bench = [P("c", "RB", 8)];
  const slots = [{ id: "RB", pos: ["RB"] }, { id: "WR", pos: ["WR"] }];
  const projected = { a: 15, b: 12, c: 8 };

  /* Tilvik 1: bekkjarmadurinn sprakk. Spain sa thad EKKI. */
  const luck = benchRegret({ started, bench, slots,
    actual: { a: 5, b: 12, c: 30 }, projected });
  near(luck.yours, 17, 0.01, "thin stig talin rett");
  ok(luck.left > 0, `stig satu a bekknum (${luck.left})`);
  ok(luck.avoidable === 0,
    "en EKKERT af thvi var fyrirsjaanlegt — spain radlagdi somu uppstillingu");
  ok(luck.luck > 0, `allt tapid flokkast sem oheppni (${luck.luck})`);

  /* Tilvik 2: thu spiladir mann sem spain sagdi lakari. */
  const err = benchRegret({
    started: [P("c", "RB", 8), P("b", "WR", 12)],
    bench: [P("a", "RB", 15)], slots,
    actual: { a: 20, b: 12, c: 6 }, projected });
  ok(err.avoidable > 0,
    `hér VAR tapid fyrirsjaanlegt (${err.avoidable}) — spain sagdi rett`);

  /* Tilvik 3: fullkomin uppstilling. */
  const perfect = benchRegret({ started, bench, slots,
    actual: { a: 15, b: 12, c: 3 }, projected });
  near(perfect.left, 0, 0.01, "ekkert tap thegar uppstillingin var rett");
}

/* ---------- 6. DEILDARSNID ---------- */
console.log("\n6. deildarsnid");
{
  const s10 = slotsFor({ starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 } });
  ok(s10.length === 10, `stadlad snid gefur 10 saeti (${s10.length})`);
  ok(s10.some((x) => x.id === "FLEX"), "flex-saeti er til");

  const sf = slotsFor({ superflex: true,
    starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } });
  const sflex = sf.find((x) => x.id === "SUPERFLEX");
  ok(sflex && sflex.pos.includes("QB"), "superflex tekur leikstjornanda");

  /* Tvo flex-saeti fa einkvaem heiti — annars glatast annad theirra
     i uppflettingu eftir `slot`. */
  const two = slotsFor({ starters: { RB: 2, WR: 2, FLEX: 2 } });
  const ids = two.map((x) => x.id);
  ok(new Set(ids).size === ids.length, `oll saetaheiti einkvaem (${ids.join(",")})`);
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
