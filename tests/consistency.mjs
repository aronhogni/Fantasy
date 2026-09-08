/* ============================================================
   ARON-STUÐULL (JÖFNUÐUR) — data/consistency.json

   HVAÐ ÞETTA VER: talan svarar „hverjir fá alltaf 4–6 stig?" og hún er
   LÝSING Á FORTÍÐ. Mælingin sem liggur að baki (7.8.2026, 5 tímabil)
   sýndi ÞRENNT sem má ekki gleymast:
     · hit4 fylgir stigum/leik með r = 0,90 — sama talan að miklu leyti.
     · Enginn þröskuldur (≥3/4/5/6/7) gaf forspárgildi umfram stig/leik;
       ábatinn SKIPTI FORMERKI (+0,6 / +1,4 / −0,6 / +1,4 / −1,0).
     · VERÐ ræður miklu (r 0,43–0,66 við ppg) og þegar stjórnað er fyrir
       stigum OG verði innan stöðu er engin varanleg leif (DEF 0,12,
       MID 0,13, 2·SE 0,21–0,27, formerki flakka).
   ÞESS VEGNA: stuðullinn fer ALDREI í rankScore. Kafli 5 hér er vörður
   um það — ef einhver setur hann í röðunina fellur prófið.

   Keyrsla:  node tests/consistency.mjs
   ============================================================ */
import { readFileSync, existsSync } from "node:fs";
import { consistencyFromSlim } from "../scripts/fetch.mjs";

const D = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));
let pass = 0, fail = 0;
const ok = (c, n, extra = "") => {
  c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}${extra ? "   " + extra : ""}`));
};

console.log(`\n${"=".repeat(84)}`);
console.log("ARON-STUÐULL — jöfnuður");
console.log("=".repeat(84));

ok(existsSync(D + "consistency.json"), "consistency.json er til");
const C = J("consistency.json");
const seasons = Object.keys(C.seasons || {});
ok(seasons.length >= 4, `${seasons.length} tímabil í skránni (${seasons.join(", ")})`);

/* ---------- 1. SKEMA OG HEILINDI ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("1. HEILINDI — hlutföll á [0,1], stuðull á [-1,1], hits <= games");
console.log("─".repeat(84));
{
  let rows = 0, bad = null;
  for (const [s, players] of Object.entries(C.seasons)) {
    for (const [code, r] of Object.entries(players)) {
      rows++;
      const pcts = [r.hit4_pct, r.blank_pct];
      if (pcts.some(v => typeof v !== "number" || v < 0 || v > 1)) { bad = `${s}/${code} hlutfall utan [0,1]`; break; }
      if (typeof r.aron !== "number" || r.aron < -1 || r.aron > 1) { bad = `${s}/${code} aron=${r.aron}`; break; }
      if (r.hit4 > r.games || r.blank > r.games) { bad = `${s}/${code} hits > games`; break; }
      if (!r.games || r.games < 1) { bad = `${s}/${code} games=${r.games}`; break; }
    }
    if (bad) break;
  }
  ok(!bad, `${rows} raðir — engin gölluð`, bad || "");
}
{
  /* 4+ og <=2 eru ADSKILIN mengi (3 stig eru hvorugt), svo summan ma
     ALDREI fara yfir 1 — thad vaeri talningarvilla.                    */
  const over = [];
  for (const [s, players] of Object.entries(C.seasons))
    for (const [code, r] of Object.entries(players))
      if (r.hit4 + r.blank > r.games) over.push(`${s}/${code}`);
  ok(over.length === 0, "4+ og ≤2 skarast ALDREI (3 stig eru hvorugt)", over.slice(0, 3).join(" "));
}

/* ---------- 2. AFTURVIRKNIN ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("2. AFTURVIRKNI — lítil sýni dregin að stöðu-meðaltali");
console.log("─".repeat(84));
{
  const s = C.seasons[seasons.find(x => /2025/.test(x)) || seasons[0]];
  const rows = Object.values(s);
  const small = rows.filter(r => r.games <= 3), big = rows.filter(r => r.games >= 25);
  const dev = a => a.length ? a.reduce((x, r) => x + Math.abs(r.hit4 / r.games - r.hit4_pct), 0) / a.length : 0;
  const ds = dev(small), db = dev(big);
  ok(small.length > 5 && big.length > 20, `sýni til: ${small.length} með n<=3, ${big.length} með n>=25`);
  ok(ds > db * 2, `lítið sýni frásogast MEIRA (${ds.toFixed(3)} á móti ${db.toFixed(3)})`);
  /* Enginn med 1-2 leiki ma sitja i 100% — thad var allur tilgangurinn. */
  const perfect = rows.filter(r => r.games <= 3 && r.hit4_pct > 0.9);
  ok(perfect.length === 0, "enginn með <=3 leiki fær >90% hittni (afturvirknin heldur)");
}

/* ---------- 3. STUÐULLINN SJÁLFUR ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("3. STUÐULLINN = 4+ MÍNUS ≤2 (hugmyndin sjálf)");
console.log("─".repeat(84));
{
  const s = C.seasons[seasons.find(x => /2025/.test(x)) || seasons[0]];
  const rows = Object.values(s);
  const wrong = rows.filter(r => Math.abs(r.aron - (r.hit4_pct - r.blank_pct)) > 0.0015);
  ok(wrong.length === 0, "aron = hit4_pct − blank_pct fyrir hverja röð", `${wrong.length} röng`);
  /* Sá sem klúðrar oftar en hann skilar á að vera NEIKVÆÐUR. */
  const busts = rows.filter(r => r.games >= 20 && r.blank_pct > r.hit4_pct);
  ok(busts.length > 0 && busts.every(r => r.aron < 0),
    `${busts.length} menn með fleiri klúður en skil — allir með neikvæðan stuðul`);
}

/* ---------- 4. NÓTAN BER FYRIRVARANN ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("4. FYRIRVARINN — talan má ALDREI seljast sem spá");
console.log("─".repeat(84));
/* Notan var thydd a ensku 9.8.2026 — sja CLAUDE.md kafla 9. Bædi form
   eru leyfd svo profid falli ekki a gomlum committudum gognum medan
   pipeline hefur ekki keyrt aftur.                                   */
ok(/EKKI SPA|LYSING A FORTID|NOT A FORECAST|DESCRIPTION OF THE PAST/i.test(C.note || ""),
  "nótan segir berum orðum að þetta sé lýsing á fortíð, ekki spá");
ok(/0,90|0\.90/.test(C.note || ""), "nótan ber mælda fylgnina við stig/leik (r=0,90)");
ok(/VERD|verði|PRICE/i.test(C.note || ""), "nótan nefnir að verð sé stjórnað fyrir");

/* ---------- 5. VÖRÐUR: STUÐULLINN ER EKKI Í RÖÐUNINNI ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("5. VÖRÐUR — jöfnuður fer ALDREI í rankScore (mælt: ekkert forspárgildi)");
console.log("─".repeat(84));
{
  const model = readFileSync(new URL("../src/model.js", import.meta.url), "utf8");
  const i = model.indexOf("export function rankScore");
  const body = i > 0 ? model.slice(i, model.indexOf("\n}", i)) : "";
  ok(i > 0, "rankScore finnst í model.js");
  ok(!/aron|hit4|blank_pct|consist/i.test(body),
    "rankScore snertir HVORKI aron, hit4 NÉ blank — mælingin leyfir það ekki");
  /* ÞESSI VÖRÐUR VAR DAUÐUR OG CLAUDE.md KAFLI 4 NEFNIR HANN MEÐ NAFNI
     (fundið 21.8.2026). Hann stóð:
       const rs = app.indexOf("const rank = rankScore({");
       const call = rs > 0 ? app.slice(rs, app.indexOf("});", rs)) : "";
       ok(!/aron|_hit4|_blank/i.test(call), "kallið á rankScore í App.jsx ...")
     `rankScore` ER EKKI KALLAÐ Í App.jsx — `initial-squad.mjs:1084`
     fullyrðir það BERUM ORÐUM ("App.jsx KALLAR `rankScore` ALDREI —
     röðunin er flutt inn, ekki afrituð"). Uppflettingin gaf því `-1`,
     `call` varð TÓMUR STRENGUR og `!/.../.test("")` er satt að eilífu.
     Tvö söfn gengu þannig út frá gagnstæðum forsendum og bæði voru græn.
     Sannað með stökkbreytingu: `_hit4: 1, aron: 9` sett INN Í raunverulega
     kallið (`src/recommend.js`) — safnið hélst 15/0 grænt.

     RÖÐUNIN FLUTTIST: kallstaðirnir eru `src/recommend.js` (kaup/sölu-
     tillögur) og `src/advisor.js` (kaup-prósentan). BÁÐIR voru óvarðir.
     Fyrri hlutinn hér að ofan hefur `ok(i > 0, ...)` sem forsendu; þessi
     hafði hana EKKI, og það er einmitt gatið — akkeri sem hittir ekki
     verður að FELLA, ekki að slokkna (kafli 5b: þekja er fullyrðing). */
  for (const rel of ["../src/recommend.js", "../src/advisor.js"]) {
    const code = readFileSync(new URL(rel, import.meta.url), "utf8");
    const rs = code.indexOf("rankScore({");
    ok(rs > 0, `FORSENDA: kallið á rankScore finnst í ${rel.replace("../src/", "")}`);
    const call = rs > 0 ? code.slice(rs, code.indexOf("});", rs)) : "AKKERI FANNST EKKI";
    ok(!/aron|_hit4|_blank|consist/i.test(call),
      `kallið á rankScore í ${rel.replace("../src/", "")} sendir ekki jöfnuð inn`);
  }
}

/* ============================================================
   6. TVOFOLD UMFERD ER TVEIR LEIKIR (5.9.2026)
   ============================================================
   `computeConsistency` taldi UMFERDIR sem leiki og bar SUMMU beggja
   leikja ad throskuldum sem eru PER LEIK (>= 4 „hittur", <= 2 „blank").
   Badir DefCon-smidirnir baru somu villu og voru lagfaerdir 4.9.2026;
   thessi systkina-smiður var ekki sopadur med.
   MAELT a committudum gognum: 2021/22 taldi **9.788 leiki thar sem their
   voru 10.485** og bjó til **443 drauga-hitti** (2+2 = 4 talid sem einn
   4+ hittur). Stig/leik skrifadist 3,210 i stad ~2,99.
   OG VORDURINN GAT EKKI SED ThAD: hann endurreiknadi ur SOMU samanlogdu
   skra, svo baðir teljarar voru per umferd og heldust innbyrdis
   samkvaemir — afritid stadfesti afritid (CLAUDE.md 7).
   Reglan er nu HREINT FALL og profud a tolum thar sem svarid er thekkt.
   ============================================================ */
console.log("\n=== 6. TVOFOLD UMFERD — SUMMA ER EKKI EINN LEIKUR ===");
{
  const inv = { mins: 0, pts: 1, mp: 2 };
  const c = (mins, pts, mp) => consistencyFromSlim({ 1: [mins, pts, mp] }, inv);
  const eqj = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ok(eqj(c(90, 5, 1), { games: 1, hit4: 1, blank: 0, sum: 5, undecided: 0 }),
    "einfold umferd yfir throskuldi -> 1 leikur, 1 hittur");
  ok(eqj(c(90, 2, 1), { games: 1, hit4: 0, blank: 1, sum: 2, undecided: 0 }),
    "einfold umferd <= 2 -> blank");
  /* SUMMA TVEGGJA LEIKJA SKER ADEINS UR ThEGAR HUN ER <= 2: tha voru
     BADIR leikir <= 2 og hvorugur nadi 4.                            */
  ok(eqj(c(180, 2, 2), { games: 2, hit4: 0, blank: 2, sum: 2, undecided: 0 }),
    "tvofold med summu <= 2 -> TVEIR leikir, tvo blonk (akvardad)");
  /* 5 gaeti verid 5+0 (einn hittur) eda 3+2 (enginn) — thvi UT UR BADUM. */
  const amb = c(180, 5, 2);
  ok(amb.games === 0 && amb.hit4 === 0 && amb.undecided === 2,
    `tvofold med summu > 2 er OAKVARDAD og fer ut ur BADUM (${JSON.stringify(amb)})`,
    "— 2+2 talid sem 4+ hittur var gamla villan");
  ok(eqj(c(0, 9, 1), { games: 0, hit4: 0, blank: 0, sum: 0, undecided: 0 }),
    "engar minutur -> enginn leikur");
  /* AN `mp` FELLUR HUN A GOMLU HEGDUNINA og thad er RETT: eldri skrar
     bera ekki svidid, og ein umferd er tha besta agiskunin sem til er. */
  ok(eqj(consistencyFromSlim({ 1: [90, 5] }, { mins: 0, pts: 1 }),
        { games: 1, hit4: 1, blank: 0, sum: 5, undecided: 0 }),
    "skra an `mp` telur eina umferd sem einn leik (afturhaef)");
  /* OG `mp` ER RAUNVERULEGA I SKRANUM — annars vaeri allt hér ad ofan
     satt um svid sem er ekki til.                                     */
  const G = JSON.parse(readFileSync(new URL("../data/player_gw_2425.json", import.meta.url), "utf8"));
  const IX = Object.fromEntries(G.stats.map((k, i) => [k, i]));
  ok(IX.mp != null, "`mp` er i slim-skranni");
  let dgw = 0;
  for (const row of Object.values(G.players))
    for (const g of Object.values(row.gw || {})) if ((g[IX.mp] ?? 0) >= 2) dgw++;
  ok(dgw > 50, `og hun finnur raunverulegar tvofaldar umferdir (${dgw})`,
    "— agiskun ur `starts`/minutum MISSTI 22% theirra");
}

console.log(`\nARON-STUÐULL: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
