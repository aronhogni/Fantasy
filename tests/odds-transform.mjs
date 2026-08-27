/* ============================================================
   UMBREYTING BOKMAKARA-SVARSINS — OG HVERS VEGNA HUN VAR OPROFUD

   `odds.json` ber EINA rod per felag. Hun var skrifud med "sidasti
   vinnur" i lykkju yfir svarid, og svarid SPANNAR OFT TVAER UMFERDIR
   (bokmakarinn verdlegger viku fram i timann). Utkoman 27.8.2026: skrain
   bar GW3 hja ollum 20 felogum daginn fyrir GW2-frestinn, svo CS% og
   markadslidurinn — sterkasta einstaka inntakid i FFDR — voru TOM fyrir
   umferdina sem verid var ad skipuleggja. Ekki rong tala heldur engin:
   `csFor` sannreynir motherja OG dagsetningu.

   Villan lifdi af thvi ad umbreytingin bjo INNI i `fetchOdds`, sem gerir
   HTTP-kallid sjalft — hun var thvi ekki profanleg an API-lykils. Nu er
   hun hreint fall (`oddsTeamsFromRaw`) og thetta safn keyrir hana a
   RAUNVERULEGA svarinu sem er committad i `data/odds_raw/`.

   FULLYRDINGIN ER TIMA-STODUG OG ThAD ER ASETT: hun er um EIGINLEIKA
   umbreytingarinnar (hver rod er FYRSTI leikur felagsins i svarinu), ekki
   um dagatalid. "Naesti oleikni leikur" hefdi verid satt i dag og osatt i
   naestu viku, og tha hefdi safnid fallid an thess ad neitt vaeri ad.

   Keyrsla:  node tests/odds-transform.mjs
   ============================================================ */
import { readFileSync, readdirSync } from "node:fs";
import { oddsTeamsFromRaw, oddsFileFrom, preferNextMatch } from "../scripts/fetch.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗"} ${m}`); };
const DATA = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(f, "utf8"));

const teamsFile = J(DATA + "teams.json");
const teamsById = {};
for (const t of (Array.isArray(teamsFile) ? teamsFile : teamsFile.teams))
  teamsById[t.id] = { ...t, short_name: t.short_name ?? t.short };

const files = readdirSync(DATA + "odds_raw").filter(f => f.endsWith(".json")).sort();
console.log(`=== 1. ARKIVID ER LESID (${files.length} skrar) ===`);
ok(files.length > 0, `arkiv-skrar finnast (${files.length})`);

/* ThEKJA ER FULLYRDING: safnid tharf svar sem SPANNAR TVAER UMFERDIR,
   annars getur "sidasti vinnur" ekki brugdist og profid maelir ekkert. */
let spanning = null;
for (const f of files.slice().reverse()) {
  const a = J(DATA + "odds_raw/" + f);
  const raw = Array.isArray(a.response) ? a.response : [];
  if (!raw.length) continue;
  const days = new Set(raw.map(g => String(g.commence_time).slice(0, 10)));
  const span = Math.max(...raw.map(g => Date.parse(g.commence_time)))
             - Math.min(...raw.map(g => Date.parse(g.commence_time)));
  if (span > 5 * 864e5) { spanning = { f, a, raw, days }; break; }
}
ok(!!spanning, spanning
  ? `svar sem spannar meira en 5 daga fannst: ${spanning.f} (${spanning.raw.length} leikir)`
  : "ekkert arkiv-svar spannar tvaer umferdir — ThETTA SAFN MAELIR EKKERT (sja hausinn)");
if (!spanning) { console.log(`\nODDS-UMBREYTING: ${pass} stóðust, ${fail} féllu`); process.exit(1); }

const { raw } = spanning;

console.log("\n=== 2. HVER ROD ER FYRSTI LEIKUR FELAGSINS I SVARINU ===");
{
  const { teams, unmatched, games } = oddsTeamsFromRaw(raw, teamsById);
  ok(unmatched.length === 0, `oll felagsnofn parast (${unmatched.length} oparud)`);
  ok(games >= 10, `nogu margir leikir verdlagdir til ad maela (${games})`);
  ok(Object.keys(teams).length >= 15, `radir skrifadar fyrir ${Object.keys(teams).length} felog`);

  /* Fyrir hvert felag: FYRSTI kickoff sem thad kemur fyrir i svarinu. */
  const norm = s => String(s || "");
  const firstOf = {};
  for (const g of raw) {
    const t = Date.parse(g.commence_time);
    for (const side of [g.home_team, g.away_team]) {
      const k = norm(side);
      if (!(k in firstOf) || t < firstOf[k]) firstOf[k] = t;
    }
  }
  /* Vorpun felagsnafns -> stuttnefni gegnum sama fall og umbreytingin
     notar: vid berum saman a TIMANUM, sem er einkvaemur per felag her. */
  let checked = 0, wrong = 0;
  for (const [short, row] of Object.entries(teams)) {
    const t = Date.parse(row.kickoff);
    const earliest = Math.min(...Object.entries(firstOf)
      .filter(([name]) => raw.some(g =>
        (g.home_team === name || g.away_team === name) && Date.parse(g.commence_time) === t))
      .map(([, v]) => v));
    checked++;
    if (Number.isFinite(earliest) && t > earliest) wrong++;
  }
  ok(checked >= 15, `radir skodadar (${checked})`);
  ok(wrong === 0, `engin rod ber SEINNI leik felagsins (${wrong} af ${checked})`);
}

console.log("\n=== 3. STOKKBREYTINGIN 'SIDASTI VINNUR' VERDUR AD FALLA ===");
{
  /* Hermum gomlu hegdunina: sami hlutur an `preferNextMatch`. Profum a
     TOLUNNI sem skiptir — hversu morg felog sitja med SEINNI leikinn.  */
  const { teams } = oddsTeamsFromRaw(raw, teamsById);
  const lastWins = {};
  for (const g of raw) {
    for (const side of ["home_team", "away_team"]) {
      const name = g[side];
      const cur = Object.entries(teams).find(([, r]) =>
        raw.some(x => (x.home_team === name || x.away_team === name)
          && Date.parse(x.commence_time) === Date.parse(r.kickoff)));
      if (cur) lastWins[name] = Date.parse(g.commence_time);   // sidasti vinnur
    }
  }
  const fixedLater = Object.entries(teams).filter(([, r]) => {
    const t = Date.parse(r.kickoff);
    return Object.values(lastWins).some(v => v > t);
  }).length;
  ok(fixedLater > 0,
    `svarid ber raunverulega seinni leiki sem "sidasti vinnur" hefdi tekid (${fixedLater})`);

  /* OG BEINT A FALLINU SJALFU — thad er thad sem ver reglunni.        */
  const early = { kickoff: "2026-08-29T14:00:00Z", opp: "EVE" };
  const late = { kickoff: "2026-09-05T14:00:00Z", opp: "FUL" };
  ok(preferNextMatch(late, early).opp === "EVE", "preferNextMatch: fyrri leikur vinnur yfir seinni");
  ok(preferNextMatch(early, late).opp === "EVE", "og seinni yfirskrifar EKKI fyrri");
  ok(preferNextMatch(undefined, late).opp === "FUL", "tomur reitur tekur vid hverju sem er");
  ok(preferNextMatch(early, { opp: "X" }).opp === "EVE", "rod an dagsetningar tekur ekki yfir");
  ok(preferNextMatch(undefined, undefined) === undefined, "tvo tom gefa tomt, ekki hrun");
}

console.log("\n=== 4. SKRAIN SEM ER SKRIFUD ===");
{
  const { teams } = oddsTeamsFromRaw(raw, teamsById);
  let fixtures = [];
  try { fixtures = J(DATA + "fixtures.json"); } catch {}
  const built = oddsFileFrom({ teams, fixtures, updated: spanning.a.updated,
    window: spanning.a.window, gw: spanning.a.gw ?? null, requestsRemaining: 7 });
  ok(built.updated === spanning.a.updated,
    "`updated` FYLGIR SOKNINNI, ekki klukkunni (hlidid gatar a aldri hennar)");
  ok(Array.isArray(built.gws) && built.gws.length > 0,
    `\`gws\` er leidd af innihaldinu (${JSON.stringify(built.gws)})`);
  ok(built.gw_deadline === (spanning.a.gw ?? null),
    "`gw_deadline` heldur tolu soknarinnar undir sinu eigin nafni");
  ok(/opp' and 'kickoff' CONFIRM/.test(built.note), "notan segir hvad sannreynir rodina");
  ok(Object.keys(built.teams).length === Object.keys(teams).length, "felogin komast oll i skrana");
}

console.log(`\nODDS-UMBREYTING: ${pass} stóðust, ${fail} féllu`);
if (fail) process.exit(1);
