/* Kannar hvort invariantar haldi yfir SLEMBNAR deildarlaganir. */
import { readFileSync } from "node:fs";
import path from "node:path";
const ROOT = new URL("../..", import.meta.url).pathname;
const { buildRows, normalizeLeague } = await import(ROOT + "/src/build.js");
const { replacementRanks, computeVbd } = await import(ROOT + "/src/model.js");
const { recommend, startableSlots, nextOwnPick, picksUntilNext } = await import(ROOT + "/src/advice.js");
const { optimalLineup, slotsFor } = await import(ROOT + "/src/lineup.js");
const j = (f) => JSON.parse(readFileSync(path.join(ROOT, "data", f), "utf8"));
const P = j("players.json"); const players = Array.isArray(P) ? P : P.players;
const core = { players, seasons: j("seasons.json"), accuracy: j("accuracy.json"),
  experts: j("experts.json"), schedule: j("schedule.json"), market: j("market.json") };

let seed = Number(process.argv[2] || 20260902);
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const bad = [];
/* ============================================================
   ThEKJA ER FULLYRDING, EKKI LOGGA
   ============================================================
   Eiginleika-prof sem keyrir 200 laganir og lendir ALDREI i thvi
   astandi sem fullyrdingin lysir er graent af tomri astaedu. Hver
   invariant hér ber thvi TELJARA, og kaflinn fellur ef eitthvad
   theirra var aldrei reynt. */
const seen = { forced: 0, urgent: 0, byes: 0, above: 0, survive: 0,
               superflex: 0, noTe: 0, twoFlex: 0, mustFill: 0, empty: 0 };
const check = (c, m) => { if (!c) bad.push(m); };

for (let it = 0; it < Number(process.argv[3] || 40); it++) {
  const teams = pick([8, 10, 12, 14, 16]);
  const scoring = pick(["ppr", "half-ppr", "standard"]);
  const rounds = pick([12, 13, 14, 15, 16, 18]);
  const sf = rnd() < 0.25;
  const starters = { QB: sf ? 1 : pick([1, 1, 2]), RB: pick([1, 2, 2, 3]),
    WR: pick([2, 3, 3, 4]), TE: pick([0, 1, 1]), FLEX: pick([0, 1, 1, 2, 3]),
    K: pick([0, 1]), DST: pick([0, 1]) };
  if (sf) { starters.SUPERFLEX = 1; seen.superflex++; }
  if (!starters.TE) seen.noTe++;
  if ((starters.FLEX || 0) >= 2) seen.twoFlex++;
  const raw = { teams, scoring, rounds, starters };
  const league = normalizeLeague(raw);
  const tag = `${teams}t ${scoring} ${rounds}r ${JSON.stringify(starters)}`;

  const { rows } = buildRows({ ...core, league });
  check(rows.length > 100, `${tag}: adeins ${rows.length} radir`);
  for (const r of rows) {
    for (const k of ["proj", "vbd", "adp", "aRank", "tier", "value"]) {
      const v = r[k];
      if (v != null && !Number.isFinite(v)) { check(false, `${tag}: ${r.name}.${k} = ${v}`); break; }
    }
  }
  /* 1. varamanns-threpin summast i saetafjolda deildarinnar */
  const repl = replacementRanks(league);
  const flexN = (starters.FLEX || 0) + (starters.SUPERFLEX || 0);
  const want = teams * (["QB","RB","WR","TE"].reduce((a,p)=>a+(starters[p]||0),0) + flexN);
  const got = ["QB","RB","WR","TE"].reduce((a,p)=>a+(repl[p]||0),0);
  check(got === want, `${tag}: threp summast i ${got}, aetti ad vera ${want}`);

  /* 2. posRank samfelldur og vbd einraent minnkandi innan stodu */
  for (const pos of ["QB","RB","WR","TE"]) {
    const list = rows.filter((r) => r.pos === pos && r.vbd != null)
      .sort((a, b) => a.posRank - b.posRank);
    for (let i = 1; i < list.length; i++) {
      if (list[i].vbd > list[i-1].vbd + 1e-9) {
        check(false, `${tag}: ${pos} vbd vex vid posRank ${list[i].posRank}`); break;
      }
    }
  }
  /* 3. K/DST bera aldrei aRank */
  const kdstRanked = rows.filter((r) => (r.pos === "K" || r.pos === "DST") && r.aRank != null);
  check(kdstRanked.length === 0, `${tag}: ${kdstRanked.length} K/DST bera aRank`);

  /* 4. startableSlots >= starters, og aldrei meira en hopurinn */
  const st = startableSlots(league);
  for (const pos of ["QB","RB","WR","TE"]) {
    check((st[pos] ?? 0) >= (starters[pos] || 0), `${tag}: startable ${pos} < starters`);
  }
  /* 5. radgjofin: invariantar yfir throun draftsins */
  const avail = rows.filter((r) => r.vbd != null && r.pos !== "K" && r.pos !== "DST")
    .map((r) => ({ id: r.id, name: r.name, pos: r.pos, vbd: r.vbd, adp: r.adp,
      adpSd: r.adpSd, tier: r.tier, proj: r.proj, avail: r.avail, injury: r.injury, bye: r.bye }));
  const roster = [];
  const slot = 1 + Math.floor(rnd() * teams);
  for (let rd = 1; rd <= rounds; rd++) {
    const pickNo = (rd - 1) * teams + slot;
    const nx = nextOwnPick(pickNo, teams, slot, rounds, "snake");
    if (nx != null) check(nx > pickNo, `${tag}: naesta val ${nx} <= ${pickNo}`);
    const gone = new Set(roster.map((r) => r.id));
    const left = avail.filter((r) => !gone.has(r.id));
    const rec = recommend({ available: left, roster: roster.map((r) => ({ pos: r.pos, bye: r.bye })),
      pick: pickNo, league, nextPick: nx });
    if (!rec) { check(rd > rounds - 2, `${tag}: engin radgjof i umferd ${rd}`); break; }
    check(rec.picksLeft >= 0, `${tag}: picksLeft ${rec.picksLeft} < 0`);
    /* thvingun kallar alltaf a advorun — annars vaeri hun thogul */
    if (rec.holesForced) seen.forced++;
    if (rec.holesUrgent) seen.urgent++;
    if ((rec.emptyStarters || []).length) seen.empty++;
    if ((rec.mustFill || []).length) seen.mustFill++;
    check(!rec.holesForced || rec.holesUrgent, `${tag}: holesForced an holesUrgent`);
    /* naesta val: merkid verdur ad segja satt um hvadan talan kom */
    if (nx != null) check(rec.nextPickFrom === "seat",
      `${tag}: nextPickFrom "${rec.nextPickFrom}" thott saeti se gefid`);
    /* audar vikur: radad eftir fjolda, haest fyrst */
    if ((rec.byeWeeks || []).length > 1) seen.byes++;
    for (let i = 1; i < (rec.byeWeeks || []).length; i++) {
      check(rec.byeWeeks[i - 1].n >= rec.byeWeeks[i].n,
        `${tag}: byeWeeks ekki radad (${rec.byeWeeks[i - 1].n} < ${rec.byeWeeks[i].n})`);
    }
    /* lifunarlikur eru likur */
    for (const p of rec.picks) {
      if (p.survive != null) seen.survive++;
      if (p.survive != null) check(p.survive >= 0 && p.survive <= 1,
        `${tag}: survive ${p.survive} utan [0,1]`);
    }
    /* aboveRepl VERDUR ad vera talan sem rodin byggir a */
    if (rec.choice) {
      const adj = rec.picks.filter((p) => p.vbd != null
        && (p.vbd - (p.needPenalty || 0)) > 0).length;
      if (rec.choice.aboveRepl > 0) seen.above++;
      check(rec.choice.aboveRepl === adj,
        `${tag}: aboveRepl ${rec.choice.aboveRepl} gegn ${adj} a leidrettum kvarda`);
    }
    check(rec.holes >= 0 && Number.isFinite(rec.holes), `${tag}: holes ${rec.holes}`);
    const c0 = rec.choice && rec.choice.list && rec.choice.list[0];
    if (c0) {
      check(rec.picks.some((p) => p.id === c0.id), `${tag}: urskurdur ekki i picks`);
      check((c0.needPenalty || 0) >= 0, `${tag}: neikvaedur fradrattur`);
      const c1 = rec.choice.list[1];
      if (c1) check(c1.behind == null || c1.behind >= -0.051,
        `${tag}: varamadur "${c1.behind}" a undan theim fyrsta`);
      /* mustFill ma ADEINS nefna stodur sem rodin naer ekki til */
      for (const m of rec.mustFill) {
        check(!["QB","RB","WR","TE"].includes(m.pos),
          `${tag}: mustFill nefnir ${m.pos} sem rodin naer til`);
      }
      /* emptyStarters ma ADEINS nefna raunverulega holu */
      const cnt = {}; for (const r of roster) cnt[r.pos] = (cnt[r.pos] || 0) + 1;
      for (const m of rec.emptyStarters) {
        check((starters[m.pos] || 0) - (cnt[m.pos] || 0) === m.short,
          `${tag}: emptyStarters ${m.pos} ${m.short} passar ekki vid hopinn`);
      }
      roster.push(left.find((r) => r.id === c0.id));
    }
  }
  /* 6. besta byrjunarlid: enginn tvisvar, engin saeti umfram */
  const lu = optimalLineup(roster.filter(Boolean).map((r) => ({ ...r, proj: r.proj })), slotsFor(league));
  if (lu && lu.starters) {
    const ids = lu.starters.map((s) => s && s.player && s.player.id).filter(Boolean);
    check(new Set(ids).size === ids.length, `${tag}: sami madur tvisvar i byrjunarlidi`);
  }
}
export { bad, seen };
