/* ============================================================
   ELO-SOKNIN — ENDURTILRAUNIR OG SKILABOD

   HVERS VEGNA ThETTA PROF ER TIL: `eloFetch` snertir NETID og var thvi
   omaeld ad ollu leyti. Hun brast a HVERRI EINUSTU keyrslu fra ~14.8.2026
   og stadan sagdi eitt ord: "The operation was aborted due to timeout".
   Thad ord adgreinir EKKI throttlun (allar tilraunir falla a timamorkum)
   fra biludum thjoni (429/5xx) eda snids-breytingu (tom svor) — og
   notandinn stadfesti sjalfur ad ClubElo VAERI UPPI medan stadan sagdi
   "timeout". An munstursins var ekkert haegt ad alykta.

   `eloFetch` er DREGID UT UR `scripts/fetch.mjs` (raunverulegur texti,
   ekki eftirliking) og keyrt a hermdum `fetch` — sama mynstur og
   `defcon-shrink.mjs` og `mins-trend.mjs` kafli 0. Svefninn er hermdur
   lika, svo profid tekur millisekundur en ekki 6,5 minutur.

   Keyrsla:  node tests/elo-fetch.mjs
   ============================================================ */
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (c, n, x = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                 : (fail++, console.log(`  ✗ ${n} ${x}`)); };

const src = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
const a = src.indexOf("async function eloFetch(");
ok(a > 0, "eloFetch finnst i scripts/fetch.mjs");
const b = src.indexOf("\nasync function fetchElo()", a);
ok(b > a, "endir fallsins finnst");
const decl = src.slice(a, b);

/* `setTimeout` er skipt ut fyrir fall sem keyrir STRAX — annars taeki
   profid ~6,5 min af hreinni bid. Bidin sjalf er profud a TEXTANUM nedar. */
const mk = (impl) => {
  const calls = [];
  const fakeFetch = async (u, o) => { calls.push(u); return impl(calls.length, u, o); };
  const factory = new Function("fetch", "UA", "setTimeout", "AbortSignal",
    `${decl}\nreturn eloFetch;`);
  return { fn: factory(fakeFetch, "UA", (f) => f(), { timeout: () => null }), calls };
};

console.log(`\n${"=".repeat(84)}`);
console.log("ELO-SOKNIN — ENDURTILRAUNIR OG SKILABOD");
console.log("=".repeat(84));

{
  const { fn, calls } = mk(() => ({ ok: true, status: 200, text: async () => "x".repeat(50) }));
  const t = await fn("http://x");
  ok(t.length === 50 && calls.length === 1, "eitt kall thegar allt er i lagi");
}

{
  let n = 0;
  const { fn, calls } = mk(() => { n++; return n < 3 ? { ok: false, status: 503 }
    : { ok: true, status: 200, text: async () => "y".repeat(50) }; });
  const t = await fn("http://x");
  ok(t.length === 50, "naer i gegn eftir tvo 5xx-fall");
  ok(calls.length === 3, `thrjar tilraunir, ekki fleiri (${calls.length})`);
}

{
  const { fn, calls } = mk(() => { throw new Error("The operation was aborted due to timeout"); });
  let msg = "";
  try { await fn("http://x"); } catch (e) { msg = e.message; }
  ok(calls.length === 6, `SEX tilraunir adur en gefist er upp (${calls.length})`);
  ok(/6 attempts over \d+s all failed/.test(msg), "skilabodin bera FJOLDA og TIMA");
  ok((msg.match(/#\d/g) || []).length >= 3, "hver tilraun er talin upp, ekki adeins su sidasta");
  /* ThETTA ER FULLYRDINGIN SEM FANN VILLU I EIGIN LAGFAERINGU: fyrsta
     utgafan klippti hverja tilraun i 34 stafi, en skilabodin eru 40, svo
     ordid TIMEOUT — thad eina sem adgreinir throttlun — datt burt.     */
  ok(/timeout/i.test(msg), `tegund bilunarinnar helst i skilabodunum: "${msg.slice(0, 56)}"`);
}

{
  const { fn } = mk(() => ({ ok: true, status: 200, text: async () => "" }));
  let msg = "";
  try { await fn("http://x"); } catch (e) { msg = e.message; }
  ok(/empty response/.test(msg), "tomt svar telst bilun, ekki gild gogn");
}

/* BIDIN OG SNIDID ERU PROFUD A TEXTANUM — thau eru ekki keyranleg her
   (svefninn er hermdur) en mega ekki hverfa thegjandi.                */
ok(/\[5000, 20000, 45000, 90000, 120000\]/.test(decl),
   "dreifd bid (5/20/45/90/120 s) — throttlun hverfur ekki a 70 s");
ok(/http:\/\/api\.clubelo\.com|\$\{url\}|url/.test(decl) && !/https:\/\/api\.clubelo\.com/.test(src.slice(a, b + 400)),
   "ENN `http`, ekki `https` — https hengur (maelt 9.8.2026), ekki 'uppfaera'");

console.log(`\nELO-SOKN: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
