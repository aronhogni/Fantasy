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
      const pcts = [r.hit4_pct, r.hit6_pct, r.blank_pct];
      if (pcts.some(v => typeof v !== "number" || v < 0 || v > 1)) { bad = `${s}/${code} hlutfall utan [0,1]`; break; }
      if (typeof r.aron !== "number" || r.aron < -1 || r.aron > 1) { bad = `${s}/${code} aron=${r.aron}`; break; }
      if (r.hit4 > r.games || r.hit6 > r.games || r.blank > r.games) { bad = `${s}/${code} hits > games`; break; }
      if (r.hit6 > r.hit4) { bad = `${s}/${code} 6+ fleiri en 4+ (omogulegt)`; break; }
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
ok(/EKKI SPA|LYSING A FORTID/i.test(C.note || ""),
  "nótan segir berum orðum að þetta sé lýsing á fortíð, ekki spá");
ok(/0,90|0\.90/.test(C.note || ""), "nótan ber mælda fylgnina við stig/leik (r=0,90)");
ok(/VERD|verði/i.test(C.note || ""), "nótan nefnir að verð sé stjórnað fyrir");

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
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const rs = app.indexOf("const rank = rankScore({");
  const call = rs > 0 ? app.slice(rs, app.indexOf("});", rs)) : "";
  ok(!/aron|_hit4|_blank/i.test(call), "kallið á rankScore í App.jsx sendir ekki jöfnuð inn");
}

console.log(`\nARON-STUÐULL: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
