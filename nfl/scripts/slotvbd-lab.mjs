/* ============================================================
   SLOTVBD-LAB — ER VBD-ID BLINT A ThINN EIGIN HOP? (4.9.2026)

   SPURNINGIN KEMUR UR RAUNVERULEGU DRAFTI. Notandinn: "appid var
   stundum ad maela med tveim i somu stodu — t.d. tveim TE thegar eg var
   buinn ad velja TE". Endurspilun a drafti hans (Sofahetjur, 12 lid,
   half-PPR) stadfesti thad: i 5 af 14 pikkum voru BADIR kostir i somu
   stodu, og i pikki 67 voru thad tveir TE medan hann atti thegar
   Trey McBride — og BRADANAUDSYNIN benti lika a TE.

   MEKANISMINN ER I `computeVbd(players, league)`: hun tekur DEILDINA en
   ALDREI HOPINN. Varamanns-threpid er thvi fast fyrir deildina, svo
   annar TE er metinn eins og hann leysi af TE-BYRJUNARMANN i medallagi —
   thott hann geti i raun adeins fyllt FLEX hja theim sem a thegar TE.
   Talan er ekki rong; hun svarar rangri spurningu.

   ThESSI SKRIFTA MAELIR LAGFAERINGUNA, HUN GERIR HANA EKKI. Bordid
   verdur FALL (harnessid styður thad thegar: `simulateDraft` gefur
   bordinu `taken`, `counts`, `round` og `roster`) og velur varamanns-
   threp eftir ThVI SAETI SEM LEIKMADURINN MYNDI RAUNVERULEGA FYLLA:

     · byrjunarsaeti stodunnar laust  -> threp stodunnar (obreytt)
     · fullt, en FLEX laust           -> FLEX-threp (RB/WR/TE saman)
     · allt fullt                     -> bekkjar-threp

   FLEX-ThREPID ER LEITT, EKKI VALID: thad er saeti
   `teams x (RB + WR + TE + FLEX)` i sameinudum RB/WR/TE-lista, sem er
   nakvaemlega skilgreiningin a "sidasti madur sem einhver byrjar".
   Bekkjar-threpid er `waiver level` ur `REPL_VARIANTS` — tala sem er
   thegar i skranni, ekki ny.

   MAELT EINS OG ANNAD I ThESSU REPO: beint einvigi i SOMU deild
   (`makeHeadToHead`), bootstrap klasad per timabil, tekna-prof a arum
   og t-prof med rettum frihedum.

   KEYRSLA:  node nfl/scripts/slotvbd-lab.mjs [--scoring=ppr|half|standard]
                                              [--proj=sleeper|fftoday] [--runs=N]
   Skrifar EKKERT nema med `--json <slod>`.
   ============================================================ */
import path from "node:path";
import { writeFileSync } from "node:fs";
import { loadWorld, vbdBoard, CURRENT_REPL, REPL_VARIANTS, makeHeadToHead }
  from "./lib/arank-world.mjs";
import { DEFAULT_LEAGUE } from "../src/accuracy.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const hit = argv.find(a => a.startsWith(`--${k}=`)); return hit ? hit.split("=")[1] : d; };
const scoring = arg("scoring", "ppr");
const proj = arg("proj", "sleeper");
const runs = +arg("runs", 12);
const dataDir = path.join(process.cwd(), "nfl", "data");

const league = DEFAULT_LEAGUE;
const teams = league.teams;
const st = league.starters;
const FLEXPOS = league.flexPos || ["RB", "WR", "TE"];
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);

/* Threp ur lista af spam: medaltal umhverfis saeti k (sama form og
   `vbdBoard` notar, svo tolurnar seu samanburdarhaefar). */
const baseAt = (vals, k) => {
  const i = Math.min(vals.length - 1, Math.max(0, k - 1));
  const around = vals.slice(Math.max(0, i - 1), i + 2);
  return around.length ? mean(around) : 0;
};

/** Bordid sem er i notkun i dag: fast threp per stodu. */
const staticBoard = pool => vbdBoard(pool, CURRENT_REPL);

/** Kandidatinn: threpid raest af thvi saeti sem madurinn myndi fylla.
    `mode`:
      "full"     — byrjun / FLEX / bekkur (hardasta utgafan)
      "flexOnly" — byrjun / FLEX, ENGIN bekkjar-refsing
      "teOnly"   — eins og "full" en ADEINS fyrir TE (tilfellid sem
                   notandinn lenti i); adrar stodur obreyttar.        */
function slotAwareBoard(pool, mode = "full") {
  const byPos = {};
  for (const p of pool) (byPos[p.pos] = byPos[p.pos] || []).push(p);
  const sorted = {};
  for (const [pos, list] of Object.entries(byPos))
    sorted[pos] = list.map(p => p.proj).sort((a, b) => b - a);
  /* FLEX-threpid: sameinadur RB/WR/TE listi, saeti teams x (RB+WR+TE+FLEX). */
  const flexVals = FLEXPOS.flatMap(p => sorted[p] || []).sort((a, b) => b - a);
  const flexRank = teams * ((st.RB || 0) + (st.WR || 0) + (st.TE || 0) + (st.FLEX || 0));
  const flexBase = baseAt(flexVals, flexRank);
  const posBase = {}, benchBase = {};
  for (const pos of Object.keys(sorted)) {
    posBase[pos] = baseAt(sorted[pos], CURRENT_REPL[pos] ?? 24);
    benchBase[pos] = baseAt(sorted[pos], REPL_VARIANTS["waiver level"][pos] ?? 48);
  }
  /* Fallid sem harnessid kallar i hverju pikki. `counts` er stodutalning
     ThESS lids sem er a klukkunni — thad er allt sem tharf. */
  return (taken, counts) => {
    const flexUsed = FLEXPOS.reduce((a, p) =>
      a + Math.max(0, (counts[p] || 0) - (st[p] || 0)), 0);
    const scored = [];
    for (const p of pool) {
      if (taken.has(p.id)) continue;
      const have = counts[p.pos] || 0;
      const starterOpen = have < (st[p.pos] || 0);
      const flexOpen = !starterOpen && FLEXPOS.includes(p.pos) && flexUsed < (st.FLEX || 0);
      const touched = mode === "teOnly" ? p.pos === "TE" : true;
      const base = !touched ? posBase[p.pos]
                 : starterOpen ? posBase[p.pos]
                 : flexOpen ? flexBase
                 : (mode === "flexOnly" ? flexBase : benchBase[p.pos]);
      scored.push([p.id, p.proj - base]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    return new Map(scored.map(([id], i) => [id, i + 1]));
  };
}

const { world, ys } = await loadWorld({ dataDir, scoring, proj });
console.log(`slotvbd-lab · ${scoring} · ${proj} · ${ys.length} timabil (${ys.join(", ")}) · runs=${runs}`);
console.log(`deild: ${teams} lid, ${league.rounds} umferdir, byrjunarlid `
  + Object.entries(st).map(([k, v]) => `${k}${v}`).join(" "));

const h2h = makeHeadToHead({ world, ys, league, teams, runs,
                             rivalOf: w => staticBoard(w.pool) });
const out = {};
for (const mode of ["full", "flexOnly", "teOnly"]) {
  const res = h2h(pool => slotAwareBoard(pool, mode));
  out[mode] = res;
  console.log(`\n=== ${mode.toUpperCase()} a moti fasta threpinu (beint einvigi) ===`);
  console.log(`  medaltal:      ${res.mean >= 0 ? "+" : ""}${res.mean} stig per timabil`);
  console.log(`  95% CI:        [${res.lo}, ${res.hi}]   t=${res.t}  ${res.significant ? "UTILOKAR NULL" : "inniheldur null"}`);
  console.log(`  ar unnin:      ${res.yearWins}/${res.years}   (tekna-prof p=${res.signP})`);
  console.log(`  einvigi unnin: ${(res.winRate * 100).toFixed(1)}%  af ${res.n}`);
  console.log(`  per ar:        ${Object.entries(res.byYear).map(([y, v]) => `${y}: ${v >= 0 ? "+" : ""}${v}`).join("  ")}`);
  console.log(`  NIDURSTADA:    ${res.significant && res.mean > 0 ? "STENST"
    : res.mean > 0 ? "fellur a marktaekni (CI inniheldur null)" : "FELLT"}`);
}
const res = out.full;

const ji = argv.indexOf("--json");
if (ji > -1 && argv[ji + 1]) {
  writeFileSync(argv[ji + 1], JSON.stringify({ scoring, proj, runs, league, results: out }, null, 1));
  console.log(`skrifad: ${argv[ji + 1]}`);
}
