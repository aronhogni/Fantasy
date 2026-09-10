/* ============================================================
   KLUBBA-NAFNATOFLURNAR — EIN VORDUR YFIR ThAER ALLAR (10.9.2026)

   Sjo toflur varpa klubbanofnum milli heimilda (NAMES, CLUBELO_CAND,
   CLUB_ALIAS, API_TEAM_ALIAS, FM_LONG_TO_FPL, TEAM_MAP, BSD_TEAM) og
   nylidar eru handskrifadir inn i hverja fyrir sig. Ad sameina thaer i eina
   var maelt og latid vera: heimildirnar stafsetja olikt af asettu radi og
   sumar toflurnar bera SOGULEG felog viljandi. Bilunin sem skiptir mali er
   onnur: (a) felag sem er i deildinni i dag en VANTAR i toflu — thogul
   oporun, oll rodin tynist; (b) samheiti sem stendur undir TVEIMUR
   skammstofunum — thogul rangporun (fuzzy felldi Man United inn i Man
   City, CLAUDE.md kafli 6). Bædi eru profud her a utfluttu toflunum og
   teams.json dagsins, svo profid fellur daginn sem nylidi er skrifadur i
   fjorar toflur af fimm.
   ============================================================ */
import { readFileSync } from "node:fs";
import { NAMES, CLUBELO_CAND, CLUB_ALIAS, CLUB_NORM, clubIndex } from "../scripts/fetch.mjs";
import { BSD_TEAM } from "../src/bsd.js";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };
const teams = JSON.parse(readFileSync(new URL("../data/teams.json", import.meta.url), "utf8")).teams;
const shorts = teams.map(t => t.short).sort();
ok(shorts.length === 20, `teams.json ber 20 felog (${shorts.length})`);

console.log("\n1) hvert felag i deildinni i dag a rod i hverri toflu sem a ad bera thau oll");
const missNames = shorts.filter(s => !NAMES[s]);
ok(missNames.length === 0, `NAMES (clubelo/fdcouk) vantar engan: ${missNames.join(",") || "-"}`);
const missCand = shorts.filter(s => !CLUBELO_CAND[s]?.length);
ok(missCand.length === 0, `CLUBELO_CAND vantar engan: ${missCand.join(",") || "-"}`);
const teamsById = {}; for (const t of teams) teamsById[t.id] = { id: t.id, name: t.name, short_name: t.short };
const idx = clubIndex(teamsById, (id) => +id);
const unresolved = teams.filter(t => idx[CLUB_NORM(t.name)] !== t.id || idx[CLUB_NORM(t.short)] !== t.id);
ok(unresolved.length === 0, `clubIndex leysir fullt nafn OG skammstofun allra 20: ${unresolved.map(t => t.short).join(",") || "-"}`);
const bsdShorts = new Set(Object.values(BSD_TEAM));
const missBsd = shorts.filter(s => !bsdShorts.has(s));
ok(missBsd.length === 0, `BSD_TEAM ber oll 20 (${missBsd.join(",") || "-"})`);

console.log("\n2) ekkert samheiti stendur undir tveimur skammstofunum — thogul rangporun");
const owner = new Map(); const clashes = [];
const claim = (name, short, table) => {
  const k = CLUB_NORM(name); if (!k) return;
  const prev = owner.get(k);
  if (prev && prev.short !== short) clashes.push(`"${name}" -> ${prev.short} (${prev.table}) og ${short} (${table})`);
  else owner.set(k, { short, table });
};
for (const [s, v] of Object.entries(NAMES)) { claim(v.clubelo, s, "NAMES"); claim(v.fdcouk, s, "NAMES"); }
for (const [s, arr] of Object.entries(CLUBELO_CAND)) arr.forEach(n => claim(n, s, "CLUBELO_CAND"));
for (const [s, arr] of Object.entries(CLUB_ALIAS)) arr.forEach(n => claim(n, s, "CLUB_ALIAS"));
for (const t of teams) { claim(t.name, t.short, "teams.json"); claim(t.short, t.short, "teams.json"); }
ok(clashes.length === 0, `engin arekstur yfir ${owner.size} samheiti${clashes.length ? ": " + clashes.join("; ") : ""}`);
/* STOKKBREYTINGAR-PROF A VERDINUM SJALFUM: fals-tafla med arekstri fellur. */
{ const o2 = new Map(); let hit = 0;
  for (const [n, s] of [["Man City", "MCI"], ["Man City", "MUN"]]) { const k = CLUB_NORM(n); if (o2.has(k) && o2.get(k) !== s) hit++; else o2.set(k, s); }
  ok(hit === 1, "vordurinn sjalfur finnur tilbuinn arekstur (Man City undir MCI og MUN)"); }

console.log(`\nKLUBBA-TOFLUR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
