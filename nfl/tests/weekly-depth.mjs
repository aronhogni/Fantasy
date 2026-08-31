/* ============================================================
   weekly-depth.mjs — VORDUR A VIKULEGA MAELIKVARDANUM

   `weekly-depth-lab.mjs` er eina maelingin i repo-inu thar sem
   BEKKJARMADUR GETUR SKORAD. Hun er thess vegna su eina sem getur
   svarad "borgar dypt sig?", og hun er lika su sem er audveldast ad
   hafa ranga an thess ad nokkur sjai: talning sem sleppir manni ur
   byrjunarlidi thegar hann ER tiltaekur, eda tekur hann inn thegar hann
   er thad EKKI, gefur samt sannfaerandi tolu.

   ÞESS VEGNA ER HUN PROFUD A TILBUNUM GOGNUM ÞAR SEM SVARID ER ÞEKKT
   FYRIRFRAM — sama regla og gildir um kvordunar-velina i FPL-hlutanum.
   ============================================================ */
import { weeklyPoints } from "../scripts/weekly-depth-lab.mjs";

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

/* Litil deild: 1 QB, 1 RB, 1 flex(RB/WR). Ekkert annad, svo hvert stig
   se rekjanlegt i hendi. */
const SLOTS = { QB: 1, RB: 1, FLEX: 1 };
const FLEX = ["RB", "WR"];
const posOf = new Map([["q", "QB"], ["r1", "RB"], ["r2", "RB"], ["w1", "WR"]]);
/* Forleiks-rod: r1 er talinn betri en r2, w1 sidastur. */
const order = new Map([["q", 1], ["r1", 2], ["r2", 3], ["w1", 4]]);
const mk = (rows) => new Map(rows.map(([id, w, v]) => [`${id}|${w}`, v]));

console.log("\n1. tiltaekileiki raedur, ekki utkoma");
{
  /* Vika 1: allir spila. r1 (10) og w1 (5) taka RB og FLEX. */
  const wk = mk([["q", 1, 20], ["r1", 1, 10], ["r2", 1, 9], ["w1", 1, 5]]);
  const t = weeklyPoints(["q", "r1", "r2", "w1"], wk, order, posOf, SLOTS, FLEX, 1);
  ok(t === 20 + 10 + 9,
    `bestu eftir FORLEIKS-ROD fylla saetin (${t} = 20+10+9, r2 i flex thvi hann er nr. 3)`);
}

console.log("\n2. bekkjarmadur skorar ThEGAR byrjunarmadur er ekki tiltaekur");
{
  /* r1 a ENGA rod i viku 2 — meiddur eda i audri viku. r2 tekur saetid. */
  const wk = mk([["q", 2, 20], ["r2", 2, 9], ["w1", 2, 5]]);
  const withBench = weeklyPoints(["q", "r1", "r2", "w1"], wk, order, posOf, SLOTS, FLEX, 2);
  const noBench = weeklyPoints(["q", "r1", "w1"], wk, order, posOf, SLOTS, FLEX, 2);
  ok(withBench === 20 + 9 + 5, `med bekkjarmann: ${withBench} = 20+9+5`);
  ok(noBench === 20 + 5, `an hans: ${noBench} = 20+5 — RB-saetid stendur TOMT`);
  ok(withBench - noBench === 9,
    "og munurinn er NAKVAEMLEGA stig bekkjarmannsins — thad er thad sem arstidar-summan ser ekki");
}

console.log("\n3. ENGIN eftira-vitneskja (thetta er profsteinninn)");
{
  /* r2 skorar 40 og r1 skorar 1 i somu viku. Talning MED vitneskju
     myndi taka r2; okkar tekur r1 thvi forleiks-rodin setur hann ofar.
     Vaeri thetta ofugt vaeri maelingin ad verdlauna sveiflu — nakvaemlega
     thad sem `risk-lab.mjs` varar vid. */
  const wk = mk([["q", 1, 20], ["r1", 1, 1], ["r2", 1, 40]]);
  const t = weeklyPoints(["q", "r1", "r2"], wk, order, posOf, SLOTS, FLEX, 1);
  ok(t === 20 + 1 + 40,
    `badir RB komast ad (RB + FLEX), svo summan er ${t} — sætin, ekki valid`);
  /* Med adeins EITT RB-saeti og engan flex ser munurinn: */
  const t2 = weeklyPoints(["q", "r1", "r2"], wk, order, posOf, { QB: 1, RB: 1 }, [], 1);
  ok(t2 === 20 + 1,
    `an flex-saetis er r1 valinn (1 stig), EKKI r2 (40) — engin eftira-vitneskja (${t2})`);
}

console.log("\n4. maelikvardinn hrynur ekki a raunverulegum jaðartilfellum");
{
  const wk = mk([["q", 1, 20]]);
  ok(weeklyPoints([], wk, order, posOf, SLOTS, FLEX, 1) === 0, "tomur hopur -> 0");
  ok(weeklyPoints(["zz"], wk, order, posOf, SLOTS, FLEX, 1) === 0,
    "othekkt audkenni -> 0, ekki NaN");
  const t = weeklyPoints(["q"], wk, order, posOf, SLOTS, FLEX, 3);
  ok(t === 20, `vikur an gagna telja 0 (${t}) — audar vikur eru ekki NaN`);
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
