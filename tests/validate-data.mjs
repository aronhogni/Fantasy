/* ============================================================
   HLIDID FYRIR COMMIT — OG HVERS VEGNA ThETTA PROF ER TIL (31.8.2026)

   `scripts/validate-data.mjs` var skrifud 25.8.2026 sem hlid sem HAFNAR
   commit-i thegar snapshot er skemmt. Hun var tengd ENGU: hvorki
   vinnuskram, `package.json` ne profum. Vordur sem keyrir ekki er ekki
   vordur (CLAUDE.md 5) — og thad var ekki fraedilegt: **nakvaemlega su
   bilun sem hun er til fyrir slapp i gegn 29.8.2026**, thegar
   `lineups.json` for ur 40 leikmonnum i 0 og var committud. Endurspilad
   a commit-sogunni hafnar reglan theirri breytingu ordrett:
       gws: 1 -> 0 · sources HVARF (1) · teams: 2 -> 0 · players: 40 -> 0

   REGLAN ER NU HREINT FALL (`regressions`) svo profid tharf enga
   git-hirslu, og tilfellin eru TILBUIN thar sem svarid er thekkt
   fyrirfram — sama mynstur og `defcon-shrink.mjs`.

   Keyrsla:  node tests/validate-data.mjs
   ============================================================ */
import { readFileSync } from "node:fs";
import { counts, regressions } from "../scripts/validate-data.mjs";
import { bsdOddsNote } from "../scripts/fetch.mjs";

let pass = 0, fail = 0;
const ok = (c, m, extra = "") => { c ? pass++ : fail++;
  console.log(`  ${c ? "✓" : "✗"} ${m}${extra && !c ? " — " + extra : ""}`); };

console.log("=== 1. AFTURFOR I NULL ===");
{
  const head = { gws: [2], sources: ["fotmob"], teams: [{ a: 1 }, { a: 2 }],
                 players: Array.from({ length: 40 }, (_, i) => ({ i })) };
  const wiped = { gws: [], teams: [], players: [] };
  const p = regressions(wiped, head, "lineups.json");
  ok(p.length >= 3, `tomd skra er HOFNUD (${p.length} vandamal)`, JSON.stringify(p));
  ok(p.some(x => /players.*40 -> 0/.test(x)), "og talan sjalf er nefnd (players 40 -> 0)",
     p.join(" | "));
  ok(p.some(x => /sources.*DISAPPEARED/.test(x)), "svid sem HVERFUR er lika vandamal");

  /* VIDBOT ER EKKI AFTURFOR — annars gaeti hlidid aldrei hleypt neinu i gegn. */
  const grew = { gws: [2], sources: ["fotmob"], teams: [{ a: 1 }, { a: 2 }, { a: 3 }],
                 players: Array.from({ length: 79 }, (_, i) => ({ i })) };
  ok(regressions(grew, head, "lineups.json").length === 0,
     "skra sem STAEKKAR fer i gegn (40 -> 79)");
  ok(regressions(head, head, "x").length === 0, "obreytt skra fer i gegn");

  /* TOMT I TOMT ER EKKI AFTURFOR: sviðið bar ekkert adur.               */
  ok(regressions({ players: [] }, { players: [] }, "x").length === 0,
     "tomt -> tomt er ekki afturfor (thad var ekkert ad tapa)");
  /* NY SVID MEGA BAETAST VID.                                           */
  ok(regressions({ players: [1], nytt: [1, 2] }, { players: [1] }, "x").length === 0,
     "nytt svid er ekki vandamal");
}

console.log("\n=== 1b. BOKHALD ER EKKI GOGN (status.json) ===");
{
  /* FYRSTA TENGDA KEYRSLAN HAFNADI COMMIT-I AF RETTRI ASTAEDU OG RANGRI
     NIDURSTODU (31.8.2026): tvaer leiddar heimildir voru teknar ur
     notkun, svo `status.json.sources.rotation` og `.gameweek_shape`
     hurfu — og hlidid las thad sem gagnatap. Heimildir koma og fara;
     `status.json` er bokhald um keyrsluna.                            */
  const head = { updated: "x", sources: { rotation: { ok: 1, count: 3, note: "n" },
                                          elo: { ok: 1, count: 20, note: "n" } } };
  const retired = { updated: "y", sources: { elo: { ok: 1, count: 20, note: "n" } } };
  ok(regressions(retired, head, "status.json").length === 0,
     "heimild sem er tekin ur notkun stodvar EKKI commit");
  ok(regressions(retired, head, "status_fast.json").length === 0,
     "sama gildir um status_fast.json");
  /* EN ThAD SEM MA ALDREI GERAST STENDUR: bokhaldid ma ekki tomast.   */
  const empty = { updated: "y", sources: {} };
  ok(regressions(empty, head, "status.json").length > 0,
     "TOMT bokhald er afram HOFNAD (pipeline haetti ad skra nokkud)");
  /* OG UNDANThAGAN MA EKKI LEKA A ADRAR SKRAR.                        */
  ok(regressions({ sources: {} }, { sources: { a: { x: 1 } } }, "lineups.json").length > 0,
     "undanthagan gildir EKKI um adrar skrar");
  ok(regressions({ teams: [] }, { teams: [1, 2], sources: { a: { x: 1 } } }, "status.json").length > 0,
     "og EKKI um onnur svid i status.json sjalfri");
}

console.log("\n=== 1c. LIFANDI GLUGGI ER EKKI GAGNATAP (bsd_odds / bsd_lineups) ===");
{
  /* ThETTA STOPPADI PIPELINE-UNA I FIMM KLST (4.9.2026). `bsd_odds.json`
     ber odda i ~4 daga glugga og lykillinn er LEIK-ID, svo leikur sem er
     buinn HVERFUR. Hlidid las `events.209545 (7 rows) DISAPPEARED` og
     hafnadi commit-inu i hverri einustu `fetch-fast`-keyrslu — `data/`
     frysti a GW1-mynd medan GW2 var buin.
     Vordur sem hafnar RETTUM gognum litur eins ut og bilud sokn.      */
  const head = { updated: "x", events: { 209545: { odds: [1, 2, 3] },
                                         209556: { odds: [1, 2] } } };
  const gone = { updated: "y", events: { 209556: { odds: [1, 2] } } };
  ok(regressions(gone, head, "bsd_odds.json").length === 0,
     "leikur sem er buinn ma hverfa ur glugganum");
  ok(regressions(gone, head, "bsd_lineups.json").length === 0,
     "sama gildir um bsd_lineups.json");
  ok(regressions({ updated: "y", events: {} }, head, "bsd_odds.json").length === 0,
     "TOMUR gluggi er lika rettur — landsleikjahle gefur engan leik innan 4 daga");
  /* OG ThAD ER EKKI SLAKI A REGLU 8e, ThVI SKRIFARINN VER HANA:
     bili OLL kollin er fyrri skra HALDIN, svo tom `events` sem NAER i
     skrana getur ekki verid bilud keyrsla. Sonnunin er ad astondin tvo
     beri SITTHVORA notu — annars vaeri undanthagan her ad treysta a
     vord sem er ekki til.                                            */
  ok(/KEPT/.test(bsdOddsNote({ seen: 9, priced: 0, season: 1, failed: 9, kept: true }))
     && !/KEPT/.test(bsdOddsNote({ seen: 0, priced: 0, season: 1 })),
     "og skrifarinn greinir BILADA keyrslu fra TOMUM glugga (regla 8e er varin thar)");
  /* OG UNDANThAGAN MA EKKI LEKA. */
  ok(regressions({ updated: "y" }, { updated: "x", teams: [1, 2] }, "bsd_odds.json").length > 0,
     "en ONNUR svid i SOMU skra lyta obreyttri reglu");
  ok(regressions(gone, head, "lineups.json").length > 0,
     "og `events` i ODRUM skram ma ekki hverfa");
  ok(regressions(gone, head, "bsd_shots.json").length > 0,
     "ekki heldur i systkina-skra sem er EKKI gluggi");
}

console.log("\n=== 2. `counts` SER OFAN I SNIDID SEM DATA/ NOTAR ===");
{
  const c = counts({ players: [1, 2, 3], teams: { ARS: {}, CHE: {} },
                     nested: { a: { x: 1 }, b: { y: 2 } } });
  ok(c.players === 3, `fylki er talid (${c.players})`);
  ok(c.teams === 2, `hlutur er talinn (${c.teams})`);
  ok(c["nested.a"] === 1 && c["nested.b"] === 1, "og eitt lag nidur i vidbot");
  ok(counts(null).players === undefined && Object.keys(counts(null)).length === 0,
     "null hrynur ekki");
  ok(Object.keys(counts("abc")).length === 0, "strengur hrynur ekki");
  ok(counts([1, 2])["(root)"] === 2, "fylki i rotinni faer nafn");
}

console.log("\n=== 3. HLIDID ER TENGT — BADAR VINNUSKRAR ===");
{
  const wf = f => readFileSync(new URL(`../.github/workflows/${f}`, import.meta.url), "utf8");
  for (const f of ["fetch.yml", "fetch-fast.yml"]) {
    const y = wf(f);
    ok(/node scripts\/validate-data\.mjs/.test(y), `${f} keyrir hlidid`);
    /* ROD SKIPTIR MALI: hlidid verdur ad koma A UNDAN commit-skrefinu,
       annars er thad umsogn eftir a i stad hlids.                       */
    /* LEITAD AD `run:`-LINUNNI, EKKI AD NAFNINU: skrefid ber langa
       athugasemd sem NEFNIR skriftuna, svo `indexOf("validate-data.mjs")`
       lenti inni i athugasemdinni og `lastIndexOf("- name:")` fann tha
       skrefid A UNDAN (spa-bokhaldid, sem BER `continue-on-error`).
       Fullyrdingin fell thvi a rongu skrefi.                          */
    const gate = y.indexOf("run: node scripts/validate-data.mjs");
    const commit = y.indexOf("git add data");
    ok(gate > -1 && commit > -1 && gate < commit,
       `${f}: hlidid er A UNDAN commit-skrefinu (${gate} < ${commit})`);
    /* OG ThAD MA EKKI VERA MED `continue-on-error` — tha vaeri thad
       skreyting. Skodum SKREFID sjalft, ekki alla skrana.              */
    const stepStart = y.lastIndexOf("- name:", gate);
    const step = y.slice(stepStart, gate);
    ok(!/continue-on-error:\s*true/.test(step),
       `${f}: hlidid ber EKKI continue-on-error (thad er tilgangurinn)`);
  }
}

console.log("\n=== 4. UNDIRMOPPUR ERU LESNAR (gatid sem hausinn nefndi) ===");
{
  const src = readFileSync(new URL("../scripts/validate-data.mjs", import.meta.url), "utf8");
  ok(/SUBDIRS\s*=\s*\[/.test(src), "listinn yfir undirmoppur er til");
  for (const d of ["live", "predictions", "history", "odds_raw"])
    ok(new RegExp(`"${d}"`).test(src), `${d}/ er i honum`);
  ok(/JSON\.parse\(readFileSync\(`\$\{DATA\}\/\$\{dir\}/.test(src),
     "og skrarnar eru RAUNVERULEGA thattadar, ekki bara taldar");
}

console.log(`\nHLID-FYRIR-COMMIT: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
