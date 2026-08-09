/* ============================================================
   nfl-names.mjs — nafna-porunin.

   HUN ER SIDASTA URRAEDI en hun er samt notud a ~105 leikmonnum, og
   thogul rong porun er verri en engin porun. Profid er byggt a
   RAUNVERULEGUM NFL-jadartilfellum, ekki tilbunum.

   Kafli 4 er sa sem skiptir mali: TVIRAEDIR lyklar verda ad skila
   ENGU. "Sidasti vinnur" er thogla ronga porunin sem allt hitt er
   til ad forðast.
   ============================================================ */

import {
  normName, looseKey, initialKey, dstKey, buildIndexes, matchByName,
  normTeam, NFL_TEAMS, TEAM_ALIAS,
} from "../src/names.js";

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const same = (a, b, m) => ok(normName(a) === normName(b), `${m}: "${a}" = "${b}"`);
const diff = (a, b, m) => ok(normName(a) !== normName(b), `${m}: "${a}" != "${b}"`);

/* ---------- 1. NORMALISERING ---------- */
console.log("\n1. normalisering");
{
  same("A.J. Brown", "AJ Brown", "punktar i upphafsstofum");
  same("A. J. Brown", "AJ Brown", "punktar OG bil");
  same("Marvin Harrison Jr.", "Marvin Harrison", "aettlida-vidskeyti");
  same("Kenneth Walker III", "Kenneth Walker", "romverskt vidskeyti");
  same("Odell Beckham Jr", "Odell Beckham JR.", "vidskeyti an punkts");
  same("Amon-Ra St. Brown", "Amon Ra St Brown", "bandstrik og punktur i einu nafni");
  same("D'Andre Swift", "DAndre Swift", "urfelling");
  same("Ja'Marr Chase", "JaMarr Chase", "urfelling i midju nafni");
  same("José Núñez", "Jose Nunez", "broddstafir felldir");
  same("  Puka   Nacua  ", "Puka Nacua", "aukabil");
  same("BRIAN THOMAS", "Brian Thomas", "hastafir");

  /* THAD SEM MA EKKI RENNA SAMAN. Tveir olikir menn med lik nofn
     eru raunverulegt vandamal i NFL og porun sem sameinar tha er
     verri en engin. */
  diff("Michael Thomas", "Mike Thomas", "stytt fornafn er EKKI sami madur");
  diff("Josh Allen", "Keenan Allen", "sama eftirnafn dugir ekki");
  diff("Justin Jefferson", "Van Jefferson", "sama eftirnafn, olikir menn");
  ok(normName("") === "", "tomur strengur helst tomur");
  ok(normName(null) === "", "null fellir ekki");
}

/* ---------- 2. LOSARI LYKLAR ---------- */
console.log("\n2. losari lyklar");
{
  ok(looseKey("Marvin Harrison Jr.") === looseKey("Marvin Harrison"),
    "loose: vidskeyti skipta ekki mali");
  ok(looseKey("Amon-Ra St. Brown") === "amon brown",
    `loose tekur fyrsta og sidasta ord (${looseKey("Amon-Ra St. Brown")})`);
  ok(initialKey("Kenneth Walker III") === initialKey("Ken Walker"),
    "initial: Kenneth og Ken renna saman");
  ok(initialKey("Kenneth Walker") !== initialKey("Jonathan Walker"),
    "initial: olikur upphafsstafur adskilur");

  ok(dstKey("Houston Texans") === "texans", "DST: fullt heiti -> gaelunafn");
  ok(dstKey("Texans D/ST") === "texans", "DST: med vidskeyti");
  ok(dstKey("Texans Defense") === "texans", "DST: 'Defense' fellt");
}

/* ---------- 3. PORUN I THREPUM ---------- */
console.log("\n3. porun i threpum");
{
  const list = [
    { name: "Ja'Marr Chase", pos: "WR", team: "CIN", id: 1 },
    { name: "Marvin Harrison Jr.", pos: "WR", team: "ARI", id: 2 },
    { name: "Kenneth Walker III", pos: "RB", team: "SEA", id: 3 },
    { name: "Amon-Ra St. Brown", pos: "WR", team: "DET", id: 4 },
  ];
  const idx = buildIndexes(list);

  ok(matchByName(idx, "JaMarr Chase", "WR").item.id === 1, "exact eftir normaliseringu");
  ok(matchByName(idx, "Marvin Harrison", "WR").item.id === 2, "vidskeyti sleppt");
  ok(matchByName(idx, "Ken Walker", "RB", "SEA").item.id === 3,
    "initial-threp med rettu lidi");

  /* THREP 3 KREFST LIDS. An thess vaeri thad agiskun. */
  const wrongTeam = matchByName(idx, "Ken Walker", "RB", "BUF");
  ok(!wrongTeam || wrongTeam.via !== "initial",
    "initial-threp er EKKI notad thegar lidid stemmir ekki");

  /* STADA VERDUR AD PASSA. Sami madur getur ekki verid RB og WR. */
  ok(matchByName(idx, "Ja'Marr Chase", "RB") === null,
    "rong stada gefur enga porun");

  ok(matchByName(idx, "Nobody Here", "WR") === null, "othekkt nafn gefur null");

  /* `via` er ALLTAF skilad svo haegt se ad greina orugga porun fra
     agiskun sidar. */
  const m = matchByName(idx, "JaMarr Chase", "WR");
  ok(m.via === "exact", "porunin ber hvernig hun var gerd");
}

/* ---------- 4. TVIRAEDNI — PROFSTEINNINN ---------- */
console.log("\n4. TVIRAEDNI: giskar ekki");
{
  /* Tveir menn, sama stada, sami loose-lykill. */
  const list = [
    { name: "Michael Thomas", pos: "WR", team: "NO", id: 1 },
    { name: "Michael Thomas", pos: "WR", team: "NYJ", id: 2 },
  ];
  const idx = buildIndexes(list);
  const m = matchByName(idx, "Michael Thomas", "WR");
  ok(m === null,
    "tviraeður lykill skilar ENGU — 'sidasti vinnur' er thogla ronga porunin");

  /* En olik STADA adskilur theim. */
  const list2 = [
    { name: "Michael Thomas", pos: "WR", team: "NO", id: 1 },
    { name: "Michael Thomas", pos: "TE", team: "NYJ", id: 2 },
  ];
  const idx2 = buildIndexes(list2);
  ok(matchByName(idx2, "Michael Thomas", "WR").item.id === 1,
    "stada adskilur nafna");
  ok(matchByName(idx2, "Michael Thomas", "TE").item.id === 2, "og hinn faest lika");
}

/* ---------- 5. LIDSHEITI ---------- */
console.log("\n5. lidsheiti");
{
  ok(normTeam("LA") === "LAR", "LA -> LAR");
  ok(normTeam("STL") === "LAR", "soguleg flutt lid: STL -> LAR");
  ok(normTeam("OAK") === "LV", "OAK -> LV");
  ok(normTeam("SD") === "LAC", "SD -> LAC");
  /* WAS/WSH og JAX/JAC eru BÆDI i notkun i lifandi heimildum i dag. */
  ok(normTeam("WSH") === "WAS", "WSH -> WAS (badir i notkun i dag)");
  ok(normTeam("JAC") === "JAX", "JAC -> JAX");
  ok(normTeam("KC") === "KC", "thegar-rett heiti helst obreytt");
  ok(normTeam("kc") === "KC", "lagstafir samraemdir");
  ok(normTeam(null) === null, "null helst null");

  ok(NFL_TEAMS.length === 32, "32 lid i listanum");
  ok(new Set(NFL_TEAMS).size === 32, "engin tvitekning");
  /* Hvert samheiti VERDUR ad benda a gilt lid — annars byr
     normaliseringin til 33. lidid thegjandi. */
  const bad = Object.values(TEAM_ALIAS).filter((t) => !NFL_TEAMS.includes(t));
  ok(bad.length === 0, `oll samheiti benda a gild lid (${bad.join(", ") || "hrein"})`);
}

/* ---------- 6. HRADI ---------- */
console.log("\n6. hradi");
{
  const big = [];
  for (let i = 0; i < 5000; i++) {
    big.push({ name: `First${i} Last${i}`, pos: "WR", team: "KC", id: i });
  }
  const t0 = Date.now();
  const idx = buildIndexes(big);
  for (let i = 0; i < 5000; i++) matchByName(idx, `First${i} Last${i}`, "WR");
  const ms = Date.now() - t0;
  /* Thak, ekki maeling: porunin keyrir i pipeline-inu a hverjum degi
     og i vafranum vid hverja endurbyggingu rada. */
  ok(ms < 500, `5.000 porunum lokid a ${ms} ms (thak 500)`);
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
