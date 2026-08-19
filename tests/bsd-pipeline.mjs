/* ============================================================
   BSD-PIPELINE — KODINN SEM KVIKNAR FYRST 21. AGUST

   Sama astaeda og kafli 0 i `mins-trend.mjs` og allt `defcon-shrink.mjs`:
   `fetchBsdLineups` og `fetchBsdOdds` keyra i forleik og skila RETTILEGA
   engu (glugginn er ~13 klst / ~4 dagar). Kodinn kviknar thvi fyrst einn
   morgun i agust, og OMAELDUR kodi sem fer i gang mannlaus er ekki
   asaettanlegur.

   ThAD SEM ER VARID HER:
   1. `mergeLineupSnapshot` — EINA REGLAN SEM SKIPTIR MALI er ad eldra
      skot MEGI ALDREI HVERFA. BSD geymir ekki spar afturvirkt (loknir
      leikir skila `confirmed`), svo spa sem tapast er topud ad eilifu.
   2. Ad skriftan se raunverulega TENGD vid hradа keyrsluna. Prof sem les
      adeins kodann sagdi eitt sinn "ja" medan `fetch-fast.yml` hafdi
      engan `env`-blokk og fallid var sleppt thegjandi (CLAUDE.md 7.1).
   ============================================================ */
import { readFileSync } from "node:fs";
import { mergeLineupSnapshot } from "../src/bsd.js";

const ROOT = new URL("../", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); }
                       else { fail++; console.log("  ✗ " + m); } };
const H = t => { console.log(`\n${"─".repeat(84)}\n${t}\n${"─".repeat(84)}`); };

const XI = n => ({ team: "T", formation: "4-3-3", confidence: 0.65,
                   xi: Array.from({ length: 11 }, (_, i) => ({ n: `p${i}${n}`, pos: "M", ai: 0.5 })) });
const ev = (status, at, tag = "a") => ({
  eventId: 900, fixture: "A v B", kickoff: "2026-08-21T19:00:00Z",
  status, at, lineups: { home: XI(tag), away: XI(tag) },
});

/* ---------- 1. ELDRA SKOT MA ALDREI HVERFA ---------- */
H("1. SPAR TAPAST ALDREI (BSD geymir thaer ekki afturvirkt)");
{
  let s = {};
  s = mergeLineupSnapshot(s, ev("predicted", "2026-08-21T06:00:00Z"));
  ok(s["900"].snapshots.length === 1, "fyrsta spa vistast");

  /* Sama stada aftur -> ekkert nytt skot (spain uppfaerist oft).      */
  s = mergeLineupSnapshot(s, ev("predicted", "2026-08-21T09:00:00Z"));
  ok(s["900"].snapshots.length === 1, "sama stada baetir ekki vid skoti (engin ruslsofnun)");

  /* Stada BREYTIST -> nytt skot, EN thad gamla stendur.               */
  s = mergeLineupSnapshot(s, ev("confirmed", "2026-08-21T17:45:00Z", "b"));
  ok(s["900"].snapshots.length === 2, "stodubreyting baetir vid skoti");
  ok(s["900"].snapshots[0].status === "predicted",
     "SPAIN STENDUR EFTIR ad stadfest lid kom — thetta er allur tilgangurinn");
  ok(s["900"].snapshots[1].status === "confirmed", "stadfesta lidid er sidasta skotid");
  ok(s["900"].snapshots[0].home.xi[0].n === "p0a",
     "innihald gomlu spainnar er obreytt (ekki yfirskrifad af thvi nyja)");
}
{
  /* Onnur leikur ma ekki hrofla vid theim fyrri.                      */
  let s = mergeLineupSnapshot({}, ev("predicted", "t1"));
  s = mergeLineupSnapshot(s, { ...ev("predicted", "t2"), eventId: 901 });
  ok(Object.keys(s).length === 2 && s["900"].snapshots.length === 1,
     "nyr leikur snertir ekki thann fyrri");
}
{
  /* HREINT FALL: inntakid ma ekki breytast.                           */
  const before = mergeLineupSnapshot({}, ev("predicted", "t1"));
  const snapshot = JSON.stringify(before);
  mergeLineupSnapshot(before, ev("confirmed", "t2"));
  ok(JSON.stringify(before) === snapshot,
     "fallid er HREINT — inntakid er ekki breytt (annars taepast skot vid endurkeyrslu)");
}

/* ---------- 2. TENGINGIN VID PIPELINE ---------- */
H("2. ER ThETTA RAUNVERULEGA TENGT? (kodi + workflow, sbr. 7.1)");
const fetchSrc = readFileSync(ROOT + "scripts/fetch.mjs", "utf8");
ok(/FLAGS\.bsd/.test(fetchSrc) && /bsd:\s*!!process\.env\.BSD_KEY/.test(fetchSrc),
   "FLAGS.bsd er leitt af BSD_KEY");
{
  /* Bædi follin verda ad vera kollud UR fetchFast, ekki daglegu
     keyrslunni: glugginn er ~13 klst og daglega keyrslan er kl. 05 UTC.
     Nakvaemlega thessi villa gerdi fetchLineups ad daudum koda (7.1).  */
  const fast = fetchSrc.slice(fetchSrc.indexOf("async function fetchFast()"),
                              fetchSrc.indexOf("/* ========== BSD"));
  ok(/fetchBsdLineups\(\)/.test(fast), "fetchBsdLineups er kallad UR fetchFast (30 min), ekki daglegu");
  ok(/fetchBsdOdds\(\)/.test(fast), "fetchBsdOdds er kallad UR fetchFast");
}
ok(/AbortSignal\.timeout/.test(fetchSrc.slice(fetchSrc.indexOf("async function bsdGet"),
                                              fetchSrc.indexOf("async function bsdCurrentSeason"))),
   "bsdGet hefur timamork (undici sjalfgildi er ~300 s = HENGJA i cron)");
ok(!/season_id=(337|1058)\b/.test(fetchSrc.slice(fetchSrc.indexOf("/* ========== BSD"))),
   "timabils-id er LESID (is_current), ekki hardkodad — thad breytist arlega");

/* Workflowid verdur ad GEFA lykilinn, annars er fallid sleppt thegjandi. */
{
  let yml = "";
  try { yml = readFileSync(ROOT + ".github/workflows/fetch-fast.yml", "utf8"); } catch {}
  ok(/BSD_KEY/.test(yml),
     "fetch-fast.yml gefur BSD_KEY — an thess vaeri FLAGS.bsd false og follin daud");
}

/* ---------- 3. VARALEIDIN MA EKKI VERDA ADALLEID ---------- */
H("3. BSD-ODDAR ERU VARALEID, EKKI UTSKIPTING");
ok(/fetchOdds\(\)/.test(fetchSrc), "Odds-API leidin er ohreyfd");
{
  const bsdBlock = fetchSrc.slice(fetchSrc.indexOf("async function fetchBsdOdds"));
  ok(/writeJSON\("bsd_odds\.json"/.test(bsdBlock),
     "BSD skrifar i SINA skra (bsd_odds.json), ekki ofan i odds.json");
  ok(!/writeJSON\("odds\.json"/.test(bsdBlock),
     "BSD skrifar ALDREI odds.json — markadslinan er staersta validerada merkid (kafli 3)");
}

/* ============================================================
   BSD-SOKNIN — SVARBOLURINN VERDUR AD FYLGJA VILLUNNI

   MAELT 19.8.2026: BSD fell a hverri keyrslu fra adfaranott 18.8. og tok
   `bsd_live`, `bsd_lineups` og `bsd_odds` med ser. Stadan sagdi
   `BSD HTTP 400 /leagues/1/seasons/?limit=5` — sem segir EKKERT um hvad
   var ad. Svarbolurinn sagdi thad hins vegar berum ordum:
     {"detail":"Unknown query parameter(s): limit.","accepted_parameters":[]}
   Vid hentum honum. Endapunkturinn haetti ad taka vid `limit`; `/events/`
   tekur hana AFRAM (profad: 30, 200+offset og an hennar skila oll 200),
   svo thetta var endapunkts-bundid.
   ============================================================ */
{
  const src = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
  const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, " ");
  const code = strip(src);

  /* 1. Timabils-kallid ma ekki bera fyrirspurnar-breytu. */
  const seasonCall = code.match(/bsdGet\(`\/leagues\/\$\{BSD_LEAGUE\}\/seasons\/([^`]*)`\)/);
  ok(!!seasonCall, "timabils-kallid finnst i fetch.mjs");
  ok(seasonCall && seasonCall[1] === "",
     `\`/seasons/\` ber ENGA fyrirspurnar-breytu (fann "${seasonCall?.[1] ?? "?"}")`);

  /* 2. `/events/` MA bera hana — annars vaeri reglan ofurtharfleg og
        einhver myndi fjarlaegja hana thar lika. */
  ok(/bsdGet\(`\/events\/\?[^`]*limit=/.test(code),
     "`/events/` ber `limit` AFRAM (reglan er endapunkts-bundin, ekki almenn)");

  /* 3. Villan verdur ad bera svarbolinn — profad a HEGDUN, ekki texta. */
  const a = src.indexOf("async function bsdGet(");
  const b = src.indexOf("\n}", a) + 2;
  const decl = src.slice(a, b);
  const mkGet = (status, body) => {
    const f = new Function("fetch", "AbortSignal", "process", "BSD_API",
      `${decl}\nreturn bsdGet;`);
    return f(async () => ({ ok: status < 400, status,
                            text: async () => body, json: async () => ({}) }),
             { timeout: () => null }, { env: { BSD_KEY: "x" } }, "");
  };
  let msg = "";
  try { await mkGet(400, '{"detail":"Unknown query parameter(s): limit."}')("/p"); }
  catch (e) { msg = e.message; }
  ok(/BSD HTTP 400/.test(msg), "villan ber HTTP-stoduna");
  ok(/Unknown query parameter/.test(msg),
     `og SVARBOLINN, sem ber greininguna: "${msg.slice(0, 70)}"`);
  /* Forsenda: an bols ma hun ekki hrynja ne baeta vid ruslinu. */
  let msg2 = "";
  try { await mkGet(500, "")("/p"); } catch (e) { msg2 = e.message; }
  ok(/BSD HTTP 500/.test(msg2) && !/—\s*$/.test(msg2),
     "tomur bolur gefur hreina villu, ekki hangandi bandstrik");
}

console.log(`\nBSD-PIPELINE: ${pass} stodust, ${fail} féllu`);
if (fail) process.exit(1);
