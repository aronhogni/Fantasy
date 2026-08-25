/* ============================================================
   nfl-market.mjs — ver MARKADSLAGID.

   KAFLI 1 ER SA SEM SKIPTIR MALI. ESPN og nflverse nota ANDSTAETT
   formerki a forgjofinni, og snuist thad vid les allt vikulega
   likanid ofugt — sterku lidin faengju LAGT vaent skor — an thess ad
   nokkud brotni synilega. Thad er nakvaemlega su tegund villu sem
   thetta verkefni er byggt til ad hindra.
   ============================================================ */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { teamMarketStrength, americanToDecimal, ESPN_TEAM_ID }
  from "../scripts/sources/espnodds.mjs";
import { impliedTeamTotals } from "../src/model.js";
import { NFL_TEAMS } from "../src/names.js";

const DATA = path.resolve(new URL(".", import.meta.url).pathname, "..", "data");
let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const near = (a, b, e, m) => ok(Math.abs(a - b) <= e, `${m} (${a} ~ ${b})`);

/* ---------- 1. FORMERKID — PROFSTEINNINN ---------- */
console.log("\n1. FORMERKID a forgjofinni");
{
  /* Eftir normaliseringu i `gameLines` gildir nflverse-konvensjonin:
     JAKVAETT spread = HEIMALIDID er favorit.
     ESPN sendir -3.5 thegar heimalidid er favorit, svo merkid er
     snuid vid inntoku. Hér er profad ad `impliedTeamTotals` lesi
     normaliseraða gildid rett. */
  const im = impliedTeamTotals(44.5, 3.5);
  ok(im.home > im.away,
    `jakvaett spread -> heimalid faer HAERRA vaent skor (${im.home} > ${im.away})`);
  near(im.home, 24, 0.01, "24,0 fyrir heimalid");
  near(im.away, 20.5, 0.01, "20,5 fyrir utilid");
  near(im.home + im.away, 44.5, 0.01, "summan er heildarlinan");

  const flip = impliedTeamTotals(44.5, -3.5);
  ok(flip.away > flip.home, "neikvaett spread -> utilidid er favorit");

  /* SPEGLUN: sama leik med ofugum formerkjum verdur ad gefa ofuga
     nidurstodu. Vaeri kodinn ad hunsa formerkid faeri thetta i gegn
     med somu tolu badum megin. */
  ok(im.home === flip.away && im.away === flip.home,
    "spegilprof: ad snua formerkinu vixlar lidunum nakvaemlega");
}

/* ---------- 2. AMERISKIR STUDLAR ---------- */
console.log("\n2. ameriskir studlar");
{
  near(americanToDecimal("+550"), 6.5, 1e-9, "+550 -> 6,50");
  near(americanToDecimal("-200"), 1.5, 1e-9, "-200 -> 1,50");
  near(americanToDecimal("+100"), 2, 1e-9, "+100 -> 2,00");
  near(americanToDecimal("-110"), 1 + 100 / 110, 1e-9, "-110 -> 1,909");
  near(americanToDecimal("EVEN"), 2, 1e-9, "EVEN -> 2,00");
  ok(americanToDecimal("abc") === null, "rusl -> null");
  ok(americanToDecimal(null) === null, "null -> null");
  ok(americanToDecimal("550") === null, "an formerkis -> null (ekki agiskun)");

  /* Studull ma ALDREI gefa likur > 1. */
  for (const v of ["+100", "-10000", "-110", "+50"]) {
    const d = americanToDecimal(v);
    ok(d > 1 && 1 / d <= 1, `${v}: likur innan [0,1] (${(1 / d).toFixed(3)})`);
  }
}

/* ---------- 3. LIDSTOLUR UR LINUM ---------- */
console.log("\n3. lidstolur ur linum");
{
  const lines = [
    { week: 1, home: "KC", away: "BUF", spread: 3, total: 50 },
    { week: 2, home: "BUF", away: "KC", spread: 1, total: 46 },
    { week: 15, home: "KC", away: "ARI", spread: 10, total: 48 },
  ];
  const t = teamMarketStrength(lines);
  const kc = t.find((x) => x.team === "KC");
  const buf = t.find((x) => x.team === "BUF");

  /* KC: heima 26,5 · uti 22,5 · heima 29 -> medaltal 26,0
     a sig: 23,5 · 23,5 · 19 -> 22,0 */
  near(kc.scored, 26, 0.01, "KC skorar 26,0 ad medaltali");
  near(kc.allowed, 22, 0.01, "KC gefur 22,0 a sig");
  near(kc.margin, 4, 0.01, "og markatalan er +4,0");
  ok(kc.games === 3, "thrir leikir taldir");

  /* BOKHALDID VERDUR AD GANGA UPP: thad sem eitt lid skorar er
     nakvaemlega thad sem hitt gefur a sig, i hverjum einasta leik.
     Summan yfir OLL lid verdur thvi ad vera jofn beggja vegna.
     Falli thetta er einhver leikur talinn odru megin en ekki hinu. */
  const totScored = t.reduce((a, x) => a + x.scored * x.games, 0);
  const totAllowed = t.reduce((a, x) => a + x.allowed * x.games, 0);
  near(totScored, totAllowed, 1e-9, "skorud stig = stig a sig, yfir oll lid");
  near(totScored, 144, 1e-9, "og summan er heildarlinurnar (50+46+48)");

  /* URSLITAKEPPNIN er talin ser og ADEINS ur vikum 15-17. */
  near(kc.playoffAllowed, 19, 0.01, "urslitakeppnis-vorn ur viku 15 einni");
  ok(kc.playoffGames === 1, "einn leikur i glugganum");
  ok(buf.playoffAllowed === null, "lid an leiks i glugganum faer null, EKKI 0");

  /* VIKUR AN LINU ERU SLEPPT, ekki fylltar. */
  const partial = teamMarketStrength([
    { week: 1, home: "KC", away: "BUF", spread: 3, total: 50 },
    { week: 2, home: "KC", away: "DEN", spread: null, total: null },
  ]);
  ok(partial.find((x) => x.team === "KC").games === 1,
    "leikur an linu er ekki talinn med");
  ok(!partial.find((x) => x.team === "DEN"),
    "lid sem a engan verdlagdan leik birtist ekki med agiskadri tolu");

  /* RODUNIN: 1 = mest gefid a sig = BESTA vidureign fyrir sokn.
     Snuist hun vid myndi vidmotid maela med thvi ad rada gegn bestu
     vornunum. */
  const ranked = teamMarketStrength([
    { week: 1, home: "AAA", away: "BBB", spread: 0, total: 60 },
    { week: 2, home: "CCC", away: "DDD", spread: 0, total: 30 },
  ]);
  const soft = ranked.find((x) => x.allowedRank === 1);
  ok(soft.allowed === 30, "rod 1 er lidid sem gefur MEST a sig (30 af 60-leiknum)");
}

/* ---------- 4. LIDSNUMERA-TAFLAN ---------- */
console.log("\n4. lidsnumer ESPN");
{
  const vals = Object.values(ESPN_TEAM_ID);
  ok(vals.length === 32, `32 lid i toflunni (${vals.length})`);
  ok(new Set(vals).size === 32, "engin tvitekning");
  const bad = vals.filter((t) => !NFL_TEAMS.includes(t));
  ok(bad.length === 0, `oll benda a gild lid (${bad.join(", ") || "hrein"})`);
}

/* ---------- 5. RAUNGOGNIN ---------- */
console.log("\n5. raungognin");
if (existsSync(path.join(DATA, "market.json"))) {
  const M = JSON.parse(readFileSync(path.join(DATA, "market.json"), "utf8"));
  ok(M.lines.length > 250, `${M.lines.length} leikir sottir`);
  ok(M.withLine > 200, `${M.withLine} med verdlagda linu`);
  ok(M.teams.length === 32, `${M.teams.length} lid med markadstolur`);

  /* Vaent stig verda ad vera i raunhaefu bili. Vaeri formerkid
     snuid eda linan misskilin lentu tolur utan thess. */
  const bad = M.teams.filter((t) => t.scored < 12 || t.scored > 34 ||
                                    t.allowed < 12 || t.allowed > 34);
  ok(bad.length === 0,
    `oll lid i raunhaefu bili 12-34 stig (${bad.map((t) => t.team).join(", ") || "hrein"})`);

  /* Deildin i heild verdur ad vera i jafnvaegi: thad sem er skorad
     er thad sem er gefid a sig. Munur yfir 0,5 stigi thydir ad
     einhver leikur er talinn odru megin en ekki hinu. */
  const sScored = M.teams.reduce((a, t) => a + t.scored * t.games, 0);
  const sAllowed = M.teams.reduce((a, t) => a + t.allowed * t.games, 0);
  ok(Math.abs(sScored - sAllowed) < 1,
    `skorud stig = stig a sig yfir deildina (${sScored.toFixed(1)} vs ${sAllowed.toFixed(1)})`);

  /* Framtidarmarkadir: afvigadar likur leggjast i 1. */
  for (const f of M.futures) {
    const sum = f.teams.reduce((a, t) => a + t.prob, 0);
    ok(Math.abs(sum - 1) < 0.01,
      `${f.market.slice(0, 34)}: afvigadar likur leggjast i 1 (${sum.toFixed(3)})`);
  }

  /* Spread-formerkid i raungognunum: leikur thar sem `details` nefnir
     heimalidid sem favorit VERDUR ad hafa jakvaett spread. */
  let checked = 0, wrong = 0;
  for (const g of M.lines) {
    if (!g.details || g.spread == null || !g.home) continue;
    const fav = g.details.split(" ")[0];
    if (fav !== g.home && fav !== g.away) continue;
    checked++;
    const homeFav = fav === g.home;
    if (homeFav !== g.spread > 0) wrong++;
  }
  ok(checked > 100 && wrong === 0,
    `formerkid stemmir vid \`details\` i ollum ${checked} leikjum (${wrong} rong)`);
} else {
  console.log("  (market.json vantar — slepp)");
}

/* ---------- 6. 20-ARA MAELINGIN ---------- */
console.log("\n6. soguleg maeling a markadinum");
if (existsSync(path.join(DATA, "market_history.json"))) {
  const H = JSON.parse(readFileSync(path.join(DATA, "market_history.json"), "utf8"));
  ok(H.sampleSize > 50000, `${H.sampleSize} leikmanna-vikur i urtaki`);
  ok(H.seasons[1] - H.seasons[0] >= 15,
    `${H.seasons[0]}-${H.seasons[1]} — nogu langt til ad segja eitthvad`);

  const get = (k) => H.signals.find((s) => s.key === k);
  const imp = get("implied"), tot = get("total"), wp = get("winProb"), oppI = get("impliedOpp");
  ok(imp && tot && wp, "oll thrju kjarna-merkin eru maeld");

  /* MAELDAR NIDURSTODUR SEM VIDMOTID FULLYRDIR. Falli thaer ma
     textinn ekki standa. */
  ok(imp.pos.WR.lift < 0.001,
    `WR: markadurinn ber nanast ekkert (${(imp.pos.WR.lift * 100).toFixed(2)}%)`);
  ok(wp.pos.RB.lift > imp.pos.RB.lift,
    `RB: sigurlikur sla vaent stig (${(wp.pos.RB.lift * 100).toFixed(2)}% > ${(imp.pos.RB.lift * 100).toFixed(2)}%)`);
  ok(tot.pos.RB.lift < wp.pos.RB.lift,
    "RB: hrein heildarlina er verri en leikstadan");
  ok(oppI.pos.RB.r < 0,
    `RB: vaent stig ANDSTAEDINGS bera NEIKVAETT formerki (${oppI.pos.RB.r})`);

  /* ENGIN LYFTING MA VERA STOR. Vaeri hun thad hefdi eitthvad lekid. */
  const maxLift = Math.max(...H.signals.flatMap((s) =>
    Object.values(s.pos).map((p) => p.lift ?? 0)));
  ok(maxLift < 0.05,
    `haesta lyfting er ${(maxLift * 100).toFixed(2)}% — engin merki um leka`);
  ok(maxLift > 0.001, "en hun er tho maelanlega yfir null");

  ok(!H.stability || !H.stability.excludesZero,
    "merkid hefur ekki breyst marktaekt milli timabila");
} else {
  console.log("  (market_history.json vantar — slepp)");
}

/* ============================================================
   VANTANDI SPREAD MA ALDREI VERDA JAFNTEFLI — `null / 2 === 0`
   (25.8.2026)

   `Market.jsx` reiknadi sjalf `g.total / 2 + g.spread / 2` og sian ofar
   krefst adeins `total != null`. I JS er `null / 2` **0**, svo leikur
   MED total en AN spreads fekk somu tolu a bada dalka — jofn tala sem
   les eins og bokmakarinn hafi kallad leikinn jafnan. Hann gaf enga
   linu. Grunnregla appsins: NULL ER EKKI NULL.

   ThETTA ER EKKI TILGATA: kaflinn maelir `market.json` sjalfa og segir
   hve margar radir eru i thessu astandi. Radirnar mega vera NULL — tha
   sefur kaflinn — en formulan er profud ohað thvi.
   ============================================================ */
console.log("\nVANTANDI SPREAD: implied-tolur mega ekki verda 0");
{
  /* (a) FORMULAN SJALF — hun er sameiginlega utfaerslan sem badar sýnir lesa. */
  const none = impliedTeamTotals(44.5, null);
  ok(none.home === null && none.away === null,
    `total an spreads -> null/null, EKKI 22,25/22,25 (${JSON.stringify(none)})`);
  ok(impliedTeamTotals(null, 3).home === null, "spread an total -> null lika");
  const real = impliedTeamTotals(52.5, 3);
  ok(real.home === 27.8 && real.away === 24.8,
    `POSITIV FORSENDA: alvoru lina reiknast afram (${JSON.stringify(real)})`);
  /* Vaeri `?? 0` sett aftur inn faeri thetta i 22,25/22,25 — jofn tala. */
  ok(none.home !== none.away || none.home === null,
    "og vantandi lina gefur ALDREI tvaer jafnar tolur");

  /* (b) BIRTINGIN LES SAMEIGINLEGU UTFAERSLUNA, EKKI AFRIT.
         `Market.jsx` afritadi formuluna og MISSTI vornina i leidinni;
         texta-fullyrdingin er thvi um innflutninginn sjalfan.        */
  const mkRaw = readFileSync(new URL("../src/Market.jsx", import.meta.url), "utf8");
  /* ATHUGASEMDIR ERU STRIPPADAR FYRST — OG ThAD ER EKKI SNYRTING.
     Fyrsta utgafa thessa kafla fell a SINNI EIGIN athugasemd i
     Market.jsx, sem vitnar i gomlu formuluna ordrétt til ad utskyra
     hana. Texta-fullyrding sem athugasemd getur uppfyllt (eda fellt)
     maelir ekki kodann — CLAUDE.md 13.                              */
  const mk = mkRaw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(/impliedTeamTotals/.test(mkRaw),
    "FORSENDA: skrain nefnir `impliedTeamTotals` yfirleitt");
  ok(/import\s*\{[^}]*impliedTeamTotals[^}]*\}\s*from\s*"\.\/model\.js"/.test(mk),
    "Market.jsx flytur `impliedTeamTotals` inn (afritud formula missti vornina)");
  ok(!/g\.total\s*\/\s*2\s*[+-]\s*g\.spread\s*\/\s*2/.test(mk),
    "og reiknar hana EKKI sjalf lengur (athugasemdir strippadar fyrst)");

  /* (c) HVE MARGAR RADIR ERU RAUNVERULEGA I ThESSU ASTANDI I DAG? */
  const mp = path.join(DATA, "market.json");
  if (existsSync(mp)) {
    const lines = JSON.parse(readFileSync(mp, "utf8")).lines || [];
    const bad = lines.filter(g => g.total != null && g.spread == null);
    console.log(`  ·    ${bad.length} af ${lines.length} radum bera total AN spreads`
      + (bad.length ? ` (t.d. ${bad[0].away} @ ${bad[0].home}, vika ${bad[0].week})` : ""));
    ok(true, "talan er logguð, ekki fullyrt — hun er 0 sumar vikur og thad er i lagi");
  }
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
