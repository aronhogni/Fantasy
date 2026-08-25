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

/* ============================================================
   GRASUGAN BORIN VID TAEMANDI LEIT
   ============================================================
   `optimalLineup` fyllir throngstu saetin fyrst og tekur alltaf besta
   mann. Su rok eru RETT — saetamengin eru hreidrud eda sundurlaeg
   (QB ⊂ SUPERFLEX, RB ⊂ FLEX ⊂ SUPERFLEX, QB ∩ FLEX = ∅) — en rok eru
   ekki sonnun. Hér er bakspors-leit sem finnur SANNANLEGA bestu
   uppstillinguna, borin vid grasuguna a slembnum hopum.

   Og hitt sem skiptir mali: krafan sjalf. Enginn a bekknum ma skora
   meira en sa sem situr i saeti sem hann VAR gjaldgengur i.

   MAELT: 6.000 slembin lid, 15 deildarform (thar med superflex,
   tvofaldur flex, WR/TE-flex) — grasugan var optimal i ollum og engin
   bekkjarbrot. Prófid keyrir 1.500 til ad halda safninu snoggu.  */
console.log("\ngrasugan gegn taemandi leit");
{
  const POS = ["QB", "RB", "WR", "TE", "K", "DST"];
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  const brute = (players, slots) => {
    const pool = players.map((p) => ({ ...p,
      ev: p.bye ? 0 : (p.proj == null ? null : p.proj * (p.avail == null ? 1 : p.avail)) }));
    let best = 0;
    const used = new Set();
    (function rec(i, sum) {
      if (i === slots.length) { if (sum > best) best = sum; return; }
      rec(i + 1, sum);                              // saetid ma standa autt
      for (const p of pool) {
        if (used.has(p.id) || p.ev == null || p.bye) continue;
        if (p.avail != null && p.avail <= 0) continue;
        if (!slots[i].pos.includes(p.pos)) continue;
        used.add(p.id); rec(i + 1, sum + p.ev); used.delete(p.id);
      }
    })(0, 0);
    return best;
  };

  const SHAPES = [
    { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 },
    { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, K: 1, DST: 1 },
    { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, SUPERFLEX: 1 },
    { QB: 2, RB: 2, WR: 3, TE: 1, FLEX: 1 },
    { QB: 1, RB: 1, WR: 1, TE: 1, FLEX: 3 },
  ];
  let suboptimal = 0, benchViolations = 0, n = 0;
  for (const starters of SHAPES) {
    for (const flexPos of [["RB", "WR", "TE"], ["WR", "TE"], ["RB", "WR"]]) {
      const slots = slotsFor({ starters, flexPos });
      for (let t = 0; t < 100; t++) {
        const roster = [];
        const size = 8 + Math.floor(rnd() * 10);
        for (let i = 0; i < size; i++) {
          const r = rnd();
          roster.push({ id: "p" + i, name: "P" + i,
            pos: POS[Math.floor(rnd() * POS.length)],
            proj: r < 0.10 ? null : Math.round(rnd() * 280) / 10,
            avail: rnd() < 0.15 ? Math.round(rnd() * 10) / 10 : null,
            bye: rnd() < 0.10 });
        }
        const got = optimalLineup(roster, slots);
        const raw = got.starters.reduce((a, s) => a + (s.player ? s.player.ev : 0), 0);
        n++;
        if (raw < brute(roster, slots) - 1e-9) suboptimal++;

        const startIds = new Set(got.starters.filter((s) => s.player).map((s) => s.player.id));
        for (const b of roster) {
          if (startIds.has(b.id) || b.bye || b.proj == null) continue;
          if (b.avail != null && b.avail <= 0) continue;
          const bev = b.proj * (b.avail == null ? 1 : b.avail);
          for (const s of got.starters) {
            if (!s.eligible.includes(b.pos)) continue;
            const sev = s.player ? s.player.proj * (s.player.avail == null ? 1 : s.player.avail) : -1;
            if (bev > sev + 1e-9) benchViolations++;
          }
        }
      }
    }
  }
  ok(suboptimal === 0, `${n} slembin lid, 15 deildarform — grasugan alltaf best (${suboptimal} tap)`);
  ok(benchViolations === 0,
    `enginn a bekk skorar meira en gjaldgengt byrjunarsaeti (${benchViolations} brot)`);
}

/* ============================================================
   SKIPTI ERU PORUD EFTIR SAETI, EKKI VISITOLU
   ============================================================
   `lineupAdvice` pardi adur `shouldStart[i]` vid `shouldSit[i]` — tvo
   OSKYLD fylki i theirri rod sem thau raktust upp. Utkoman gat verid
   "settu inn mottakara, taktu ut leikstjornanda", sem er ekki skipti
   heldur tvaer adskildar tillogur limdar saman; notandi sem fylgdi
   henni hefdi endad med TOMT QB-SAETI.

   Og `gain` bar vaent gildi ad fradregnu HRAU gildi — tvaer olikar
   einingar i sama fradraetti.                                       */
console.log("\nlineupAdvice: skipti eru sambaerileg");
{
  const slots = slotsFor({ starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } });
  const roster = [
    { id: "qb1", pos: "QB", proj: 22 }, { id: "qb2", pos: "QB", proj: 18 },
    { id: "rb1", pos: "RB", proj: 18 }, { id: "rb2", pos: "RB", proj: 15 },
    { id: "rb3", pos: "RB", proj: 14 },
    { id: "wr1", pos: "WR", proj: 17 }, { id: "wr2", pos: "WR", proj: 16 },
    { id: "wr3", pos: "WR", proj: 13 }, { id: "wr4", pos: "WR", proj: 12 },
    { id: "te1", pos: "TE", proj: 11 },
  ];
  /* Uppstilling thar sem TVEIR eru rangir — og their eru a SITTHVORRI
     stodu, sem er nakvaemlega tilfellid sem gamla porunin klufi. */
  const current = ["qb2", "rb1", "rb3", "wr1", "wr2", "wr4", "te1", "rb2"];
  const adv = lineupAdvice(current, roster, slots);

  ok(adv.changes.length > 0, `${adv.changes.length} skipti logd til`);
  for (const c of adv.changes) {
    if (!c.out) continue;
    /* Sa sem fer ut verdur ad vera gjaldgengur i saetid sem losnar. */
    const slot = adv.optimal.starters.find((s) => s.slot === c.slot);
    ok(slot && slot.eligible.includes(c.out.pos),
      `${c.in.pos} inn i ${c.slot} <-> ${c.out.pos} ut (gjaldgengur i saetid)`);
    /* Og abatinn ma ekki blanda einingum: hann er ev - ev, svo hann
       verdur ad vera jakvaedur thegar skiptin eru raunveruleg bot. */
    ok(c.gain == null || c.gain > 0,
      `abatinn er jakvaedur eda null, ekki blanda (${c.gain})`);
  }
  /* Enginn ma vera logdur til TVISVAR — hann getur adeins farid ut einu sinni. */
  const outs = adv.changes.map((c) => c.out && c.out.id).filter(Boolean);
  ok(new Set(outs).size === outs.length,
    `enginn logdur til ut oftar en einu sinni (${outs.join(", ") || "engir"})`);
}

/* ============================================================
   AUD VIKA — TENGD VID RAUNVERULEGA VIKU, EKKI HARDKODUD
   ============================================================
   `MyTeam` sendi `bye: false` fyrir ALLA, sem thydir "enginn er
   nokkurn timann i frii". Uppstillingartolid hefdi thvi sett mann i
   byrjunarlid a theirri viku sem hann spilar EKKI — null stig i saeti
   sem atti ad bera tolf.

   `lineup.js` sjalft for alltaf rett med `bye`; villan var i thvi sem
   var SENT inn. Thess vegna profar thetta HVORT TVEGGJA: ad tolid
   virdi flaggid, og ad reglan sem býr thad til se rett.            */
console.log("\naud vika");
{
  const slots = slotsFor({ starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 } });

  /* 1. Tolid sjalft: sa sem er i frii kemst ekki inn, thott hann spai haest. */
  const roster = [
    { id: "qb", pos: "QB", proj: 20 },
    { id: "rb1", pos: "RB", proj: 30, bye: true },   // haestur EN i frii
    { id: "rb2", pos: "RB", proj: 12 },
    { id: "rb3", pos: "RB", proj: 11 },
    { id: "wr1", pos: "WR", proj: 14 }, { id: "wr2", pos: "WR", proj: 13 },
    { id: "wr3", pos: "WR", proj: 12 }, { id: "wr4", pos: "WR", proj: 10 },
    { id: "te", pos: "TE", proj: 9 },
  ];
  const out = optimalLineup(roster, slots);
  const ids = out.starters.map((s2) => s2.player && s2.player.id);
  ok(!ids.includes("rb1"), "sa sem er i frii kemst ekki i byrjunarlid thott hann spai haest");
  ok(ids.includes("rb2") && ids.includes("rb3"), "hinir tveir taka RB-saetin");

  /* 2. REGLAN sem MyTeam notar: `bye === curWeek`, og ADEINS a
        timabilinu. Herma badar greinar. */
  const byeFlag = (seasonType, week, playerBye) => {
    const curWeek = (seasonType === "regular" || seasonType === "post") ? week : null;
    return curWeek != null && playerBye != null && playerBye === curWeek;
  };
  ok(byeFlag("regular", 7, 7) === true, "vika 7 og bye 7 -> i frii");
  ok(byeFlag("regular", 7, 8) === false, "vika 7 og bye 8 -> spilar");
  ok(byeFlag("regular", 7, null) === false, "engin bye-vika skrad -> spilar");
  /* Forleikur: `week` er 1 og MA EKKI vera borid saman vid bye-viku.
     Enginn ber bye 1 i ar, svo villan vaeri THOGUL thangad til
     deildin faerist — thess vegna er skilyrdid a seasonType. */
  ok(byeFlag("pre", 1, 1) === false, "forleikur: vika 1 er EKKI borin vid bye 1");
  ok(byeFlag("off", 1, 1) === false, "utan timabils: sama");
}

/* ============================================================
   `benchRegret` ER OTENGD — OG VORDURINN SEFUR ThANGAD TIL HANN MA VAKNA
   ============================================================
   Fallid er skrifad og profad hér ad ofan, en ENGIN skra i `src/` kallar
   thad. Bædi `App.jsx` og `MyTeam.jsx` sogdu samt ad thad "birtist thegar
   vikan er lidin" — loford sem kodinn gat ekki efnt. Skjalad skilyrdi
   sem kodinn uppfyllir ekki er verra en ekkert: thad les eins og thekja.

   ThRENNT VANTAR, OG ThAU ERU OLIK:
     1. `matchups`-endapunktur — hvad var i saetunum I VIKU N. `rosters`
        ber adeins `starters` EINS OG ThEIR ERU NUNA.
     2. `data/weekly/{ar}.json` fyrir `actual`.
     3. Lokin vika.

   VORDURINN ER TVIStAETTUR og thad er allur tilgangurinn (sama form og
   `gw1-checklist.mjs` i FPL):
     · MEDAN vikuskrana vantar: krafan er ad SKJOLIN LJUGI EKKI.
     · UM LEID OG hun verdur til: krafan snyst vid og heimtar ad
       `benchRegret` se raunverulega kollud. Tha getur "otengd" ekki
       ordid varanlegt astand i thogn.
   ============================================================ */
/* ============================================================
   `weekRegret` — INNTOKIN, A TILBUNUM GOGNUM ThAR SEM SVARID ER ThEKKT
   ============================================================
   Fjorar heimildir maetast hér og thaer bera ThRJU olik audkenni
   (Sleeper-id, GSIS-id, okkar spa). Hvert einasta hlid er "null er
   svar", svo profid verdur ad sanna BADT: ad rett inntak gefi RETTA
   TOLU, og ad hvert vantandi inntak gefi `null` — ekki 0.

   TALAN ER REIKNUD I HAUSNUM HER:
     byrjunarlid  A 20 · B  2      = 22 raunstig
     bekkur       C 30 · D  1
     bestu 2 af ollum: C 30 + A 20 = 50   -> `perfect`
     spain radlagdi A og C (haest proj)   -> `advised` = 50
     left = 50 - 22 = 28 · avoidable = 28 · luck = 0
   Þ.e. ÖLL eftirsjain var fyrirsjaanleg — spain sa C. Þad er villa,
   ekki oheppni, og profid ver ad tolurnar tvaer greini thad ad.      */
console.log("\nweekRegret: inntokin i benchRegret");
{
  const { weekRegret } = await import("../src/lineup.js");
  /* `id` ER SKYLDA I SAETI — sja `DEFAULT_SLOTS`/`slotsFor`, sem setja
     hann alltaf. Fyrsta utgafa thessarar fixturu sleppti honum og TVO
     saeti med `id: undefined` letu `optimalLineup` telja SAMA MANNINN
     tvisvar: `advised` maeldist 60 thar sem haesta moguleg summa allra
     fjogurra er 53. Fixturan bar forsenduna sem var villan — nakvaemlega
     mynstrid sem kafli 7 i handover varar vid. Kodinn var rettur. */
  const SLOTS = [{ id: "RB1", pos: ["RB"] }, { id: "RB2", pos: ["RB"] }];

  const rows = [
    { id: "1", gsisId: "00-A", name: "A", pos: "RB", proj: 200 },
    { id: "2", gsisId: "00-B", name: "B", pos: "RB", proj: 100 },
    { id: "3", gsisId: "00-C", name: "C", pos: "RB", proj: 190 },
    { id: "4", gsisId: "00-D", name: "D", pos: "RB", proj: 50 },
  ];
  const weekly = [
    { id: "00-A", week: 6, ppr: 20, half: 20, std: 20 },
    { id: "00-B", week: 6, ppr: 2, half: 2, std: 2 },
    { id: "00-C", week: 6, ppr: 30, half: 30, std: 30 },
    { id: "00-D", week: 6, ppr: 1, half: 1, std: 1 },
    /* ONNUR VIKA — ma ALDREI blandast inn. */
    { id: "00-C", week: 7, ppr: 999, half: 999, std: 999 },
  ];
  const matchups = [
    { roster_id: 9, starters: ["1", "2"], players: ["1", "2", "3", "4"] },
    { roster_id: 3, starters: ["3", "4"], players: ["3", "4"] },
  ];
  const base = { matchups, rosterId: 9, rows, weeklyRows: weekly, week: 6,
                 scoring: "ppr", slots: SLOTS };

  const r = weekRegret(base);
  ok(r != null, "rett inntak gefur nidurstodu");
  ok(r.yours === 22, `thin stig = 22 (maelt ${r && r.yours})`);
  ok(r.perfect === 50, `fullkomid = 50 (maelt ${r && r.perfect})`);
  ok(r.left === 28, `eftirsja alls = 28 (maelt ${r && r.left})`);
  ok(r.avoidable === 28, `thar af fyrirsjaanlegt = 28 (maelt ${r && r.avoidable})`);
  ok(r.luck === 0, `oheppni = 0 — spain SA C (maelt ${r && r.luck})`);
  ok(r.startedN === 2 && r.benchN === 2 && r.scored === 4,
    `2 byrjudu, 2 a bekk, 4 med raunstig (${r && r.startedN}/${r && r.benchN}/${r && r.scored})`);

  /* VIKAN ER UTILOKANDI — vika 7 ma ekki leka inn. Vaeri hun talin
     yrdi `perfect` 999 og eftirsjain hrein skaldskapur. */
  ok(r.perfect < 100, "vika 7 lekur EKKI inn i viku 6 (annars vaeri fullkomid 999)");

  /* --- SLEEPER SKRIFAR "0" I TOMT SAETI --- */
  const withHole = weekRegret({ ...base,
    matchups: [{ roster_id: 9, starters: ["1", "0"], players: ["1", "0", "3"] }] });
  ok(withHole != null && withHole.startedN === 1,
    `"0" i saeti er EKKI leikmadur (${withHole && withHole.startedN} byrjunarmadur, ekki 2)`);

  /* --- HVERT VANTANDI INNTAK GEFUR `null`, EKKI 0 --- */
  ok(weekRegret({ ...base, weeklyRows: [] }) === null,
    "engin vikuskra -> null (0 vaeri 'thu spiladir fullkomlega')");
  ok(weekRegret({ ...base, week: 9 }) === null,
    "vika sem er ekki i skranni -> null");
  ok(weekRegret({ ...base, rosterId: 42 }) === null,
    "hopurinn minn finnst ekki -> null");
  ok(weekRegret({ ...base, scoring: "te-premium" }) === null,
    "omaeld stigagjof -> null");
  ok(weekRegret({ ...base, matchups: null }) === null, "ekkert svar -> null");
  ok(weekRegret({ ...base, week: null }) === null, "engin vika -> null");
  ok(weekRegret({ ...base,
    matchups: [{ roster_id: 9, starters: [], players: ["1"] }] }) === null,
    "tom uppstilling -> null");

  /* --- LYKILLINN ER `gsisId`, EKKI `id` --- */
  const noGsis = weekRegret({ ...base, rows: rows.map((r2) => ({ ...r2, gsisId: null })) });
  ok(noGsis === null,
    "an `gsisId` finnst EKKERT raunstig -> null (rangur lykill skilar thogult 'engin eftirsja')");

  /* --- STIGAGJOFIN ER LESIN, EKKI GEFIN SER --- */
  const half = weekRegret({ ...base, scoring: "half-ppr",
    weeklyRows: weekly.map((w) => ({ ...w, half: w.ppr / 2 })) });
  ok(half != null && half.yours === 11,
    `half-PPR les `+"`half`"+`-svidid (11, maelt ${half && half.yours})`);
}

console.log("\nbenchRegret: tengd via weekRegret, og vordurinn vaktar hana");
{
  const { readFileSync: rf, existsSync: ex, readdirSync: rd } = await import("node:fs");
  const P = await import("node:path");
  const ROOT2 = P.resolve(new URL(".", import.meta.url).pathname, "..");
  const srcDir = P.join(ROOT2, "src");

  const files = rd(srcDir).filter((f) => /\.(js|jsx)$/.test(f));
  /* KEDJAN ER `Dashboard -> weekRegret -> benchRegret`, svo leitin er ad
     `weekRegret` en ekki ad `benchRegret`: sidara nafnid er kallad INNI i
     `lineup.js`, sem er skilgreiningarskrain. Fyrsta utgafa thessa
     kafla leitadi ad `benchRegret(` og fann 0 kallendur EFTIR ad
     tengingin var komin — hun maldi ranga hlekkinn. */
  const strip = (f) => rf(P.join(srcDir, f), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const callers = files.filter((f) =>
    f !== "lineup.js" && /\bweekRegret\s*\(/.test(strip(f)));
  /* Og hlekkurinn sjalfur verdur ad vera heill. */
  ok(/\bbenchRegret\(\{/.test(strip("lineup.js")),
    "`weekRegret` kallar `benchRegret` — kedjan er heil");
  ok(files.length > 20, `THEKJA: ${files.length} skrar i src/ skannadar`);

  /* Er vikuskra yfirstandandi timabils til? */
  let season = null;
  try { season = JSON.parse(rf(P.join(ROOT2, "data", "meta.json"), "utf8")).season; } catch { /* */ }
  const weeklyFile = season != null
    ? P.join(ROOT2, "data", "weekly", `${season}.json`) : null;
  const haveWeekly = !!(weeklyFile && ex(weeklyFile));

  if (!haveWeekly) {
    /* --- SOFANDI ARMUR: skjolin verda ad segja satt --- */
    /* SOFANDI ARMURINN KREFST NU TENGINGAR LIKA — kedjan er
       `Dashboard -> weekRegret -> benchRegret`, og hun a ad vera til
       ADUR en vikuskrain kemur, svo hun kvikni sjalf. Ad bida med
       tenginguna thangad til gognin birtast er nakvaemlega hvernig
       `usageblend` sat otengd i tvaer vikur. */
    const dash = rf(P.join(srcDir, "Dashboard.jsx"), "utf8");
    ok(/weekRegret\(/.test(dash),
      "SEFUR en ER TENGD: `Dashboard` kallar `weekRegret` (kedjan er til fyrir viku 1)");
    ok(callers.length === 1 && callers[0] === "Dashboard.jsx",
      `og ADEINS thadan (${callers.length}: ${callers.join(", ") || "engir"})`);
    const app = rf(P.join(srcDir, "App.jsx"), "utf8");
    const my = rf(P.join(srcDir, "MyTeam.jsx"), "utf8");
    /* Forsendan: badar skrar nefna hana yfirleitt. An thess vaeru
       neikvaedu krofurnar hér ad nedan tomar. */
    ok(/benchRegret/.test(app) && /benchRegret/.test(my),
      "FORSENDA: badar skrarnar nefna `benchRegret`");
    /* BADAR VERDA AD BENDA A FORSIDUNA. Thaer sogdu adur ad hun birtist
       i `MyTeam`; hun er thar ekki og verdur thad ekki. */
    ok(/EKKI HER/.test(app) && /EKKI HER/.test(my),
      "og BADAR segja ad hun se EKKI i MyTeam");
    ok(/Dashboard/.test(app) && /Dashboard/.test(my),
      "og badar visa a forsiduna, thar sem hun ER");
  } else {
    /* --- VAKNADUR ARMUR --- */
    ok(callers.length > 0,
      `VAKNADUR: \`data/weekly/${season}.json\` er til, svo \`benchRegret\` VERDUR ad vera kollud ` +
      `(fann ${callers.length} kallendur: ${callers.join(", ") || "ENGA"})`);
  }
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
