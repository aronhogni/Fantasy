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

/* ============================================================
   GLUGGA-NOTURNAR — TOM SVARROD MA EKKI LESAST EINS OG LOKADUR GLUGGI

   Thetta er kafli sem gat ekki verid til adur: noturnar voru byggdar a
   stadnum inni i net-follunum og kvikna adeins thegar BSD svarar, svo
   BSD-lykillinn (GitHub Secrets, write-only) var forsenda thess ad profa
   thaer. Nu eru thaer HREIN foll og svarid er thekkt fyrirfram.
   PROFSTEINNINN ER EKKI ORDALAGID heldur ad tvo ASTAND MED ANDSTAEDA
   ORSOK skili ANDSTAEDUM notum: `seen === 0` (tom rod -> rangt timabil eda
   BSD hefur leikina ekki) a ad segja "empty result", en `seen > 0` a ad
   segja "glugginn er ekki opinn enn". Nota sem er sú SAMA i badum
   tilfellum greinir thau ekki i sundur og er thvi ekki nota heldur fylling.
   MAELT 21.8.2026: badar noturnar sogdu "ekkert innan gluggans" thegar
   NIU oleiknir GW1-leikir stodu i `fixtures.json`, sa naesti eftir 12,7 klst.  */
{
  console.log("\n-- 9. BSD-GLUGGA-NOTURNAR (tilbuin inntok) --");
  const { bsdLineupNote, bsdOddsNote } = await import(ROOT + "scripts/fetch.mjs");

  const empty = bsdLineupNote({ seen: 0, nearestMs: null, season: 77 });
  const far   = bsdLineupNote({ seen: 9, nearestMs: 12.7 * 3600e3, season: 77 });
  ok(/empty result/i.test(empty) && /season 77/.test(empty),
     `tom rod nefnir BADA: ad hun se TOM og hvada timabil var spurt`);
  ok(/9 notstarted/.test(far) && /12\.7h/.test(far),
     `full rod nefnir FJOLDANN og hve langt i naesta leik: "${far.slice(0, 46)}…"`);
  /* HER ER FULLYRDINGIN SJALF: thaer verda ad vera OLIKAR. Vaeru thaer
     eins vaeri kaflinn hér ofan tautologia (kafli 13).                  */
  ok(empty !== far, "tom rod og full rod gefa SITTHVORA notu");
  ok(!/empty result/i.test(far),
     "full rod segir ALDREI 'empty result' — thad var einmitt villan");
  /* Vantandi timi ma ekki verda "NaNh" a skjanum. */
  ok(/nearest in \?h/.test(bsdLineupNote({ seen: 3, nearestMs: null, season: 1 })),
     "oleysanleg dagsetning gefur '?h', ekki NaN");

  const oEmpty = bsdOddsNote({ seen: 0, priced: 0, season: 77 });
  const oNone  = bsdOddsNote({ seen: 20, priced: 0, season: 77 });
  const oSome  = bsdOddsNote({ seen: 20, priced: 6, season: 77 });
  ok(/empty result/i.test(oEmpty), "odds: tom rod nefnir 'empty result'");
  ok(/NONE carried odds/.test(oNone) && !/empty/i.test(oNone),
     "odds: 20 leikir an odda er ANNAD en engir leikir");
  ok(/6 of 20/.test(oSome), `odds: hlutfallid er birt: "${oSome}"`);
  ok(new Set([oEmpty, oNone, oSome]).size === 3,
     "thrju astond -> thrjar OLIKAR notur");
  /* Og hvorug ma bera gomlu fullyrdinguna sem var giskun i notu-formi. */
  ok(![empty, far, oEmpty, oNone, oSome].some(n => /within (24h|the ~4 day)/.test(n)),
     "engin nota fullyrdir lengur 'within 24h' / 'within the ~4 day window'");

  /* ============================================================
     BILUD KEYRSLA ER FJORDA ASTANDID — OG ThAD VAR OSYNILEGT
     (25.8.2026)

     Per-leikja villur voru gleyptar (`catch { continue; }`) og EKKI
     taldar, svo keyrsla thar sem hvert einasta odda-kall brast bar
     NAKVAEMLEGA somu notu og rolegur dagur utan gluggans ("NONE
     carried odds ... expected further out"). Tvennt med andstaeda
     orsok og andstaeda lagfaeringu undir einni notu — sama villa og
     kaflinn her ad ofan var smiðadur gegn, i sama falli.
     ============================================================ */
  const oFail = bsdOddsNote({ seen: 20, priced: 0, season: 77, failed: 20, kept: false });
  const oKept = bsdOddsNote({ seen: 20, priced: 0, season: 77, failed: 20, kept: true });
  const oPart = bsdOddsNote({ seen: 20, priced: 6, season: 77, failed: 3 });
  ok(/failed/i.test(oFail) && !/expected further out/.test(oFail),
     `bilud koll eru ANNAD en roleg umferd: "${oFail.slice(0, 60)}…"`);
  ok(/KEPT/.test(oKept) && /erase good data/.test(oKept),
     `og thegar gomlu gognin eru varðveitt SEGIR notan thad: "${oKept.slice(0, 60)}…"`);
  ok(/3 odds call\(s\) failed/.test(oPart),
     `hlutabilun sest lika thegar eitthvad verdlagdist: "${oPart}"`);
  ok(new Set([oEmpty, oNone, oSome, oFail, oKept, oPart]).size === 6,
     "SEX astond -> SEX OLIKAR notur (fjogur voru thrju adur)");

  /* ============================================================
     OG REGLAN SJALF, LESIN UR KODANUM: `writeJSON` MA EKKI VERA
     SKILYRDISLAUS I `fetchBsdOdds`.

     Notan ein daegdi ekki: hun getur sagt "KEPT" medan skrifid
     gerist samt. Fullyrdingin er thvi um GREININA — og
     athugasemdir eru strippadar fyrst, thvi thaer vitna i regluna
     ordrett (CLAUDE.md 13).
     ============================================================ */
  const raw = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const i = src.indexOf("async function fetchBsdOdds(");
  const body = src.slice(i, src.indexOf("\n}\n", i));
  ok(i > 0, "FORSENDA: fetchBsdOdds finnst (an athugasemda)");
  ok(/failed\+\+/.test(body), "villur eru TALDAR, ekki gleyptar thegjandi");
  ok(/if \(!keep\)[\s\S]{0,80}writeJSON\("bsd_odds\.json"/.test(body),
     "og `writeJSON` er SKILYRT — tom keyrsla ma ekki thurrka ut verdlagda skra");
  ok(/priced === 0 && failed > 0 && prevEvents > 0/.test(body),
     "skilyrdid er throngt: adeins ekkert-verdlagt OG villa OG eldri gogn");

  /* ============================================================
     NAFNA-LYKKJAN SOTTI ALLA I HVERRI KEYRSLU (25.8.2026)

     `acc` er UPPSOFNUD timabils-summa, svo `Object.keys(acc)` vex allt
     timabilid — ~600 leikmenn um mitt timabil. Lykkjan sotti nafn HVERS
     theirra i hverri keyrslu sem hafdi nyjan leik, thott nofn breytist
     ekki. Hausinn a fallinu lofar "~20 kollum a viku"; raunin var ~600
     PER KEYRSLU. Nofn eru nu borin afram i `_names` og adeins okunn id
     sott.

     ThETTA ER TENGINGAR-FULLYRDING, EKKI HEGDUNAR — og hun er merkt sem
     slik. Lykkjan bydur inni i `fetchBsdLive`, sem tharf BSD-lykil, svo
     hana ma ekki keyra her. Fullyrdingin er hert eins og haegt er:
     athugasemdir eru STRIPPADAR (thaer vitna i regluna ordrett), og
     BADIR endar eru krafdir — ad lesa `_names` OG ad skrifa hana. Vaeri
     adeins annar profadur gaeti helmingurinn dottid ut thegjandi, sem er
     nakvaemlega `lineups.json`-villan (skrifad en aldrei lesid).
     ============================================================ */
  const bi = src.indexOf("async function fetchBsdLive(");
  const bbody = src.slice(bi, src.indexOf("\n}\n", bi));
  ok(bi > 0, "FORSENDA: fetchBsdLive finnst (an athugasemda)");
  ok(/prev\._names/.test(bbody), "les nofn ur fyrri skra (`prev._names`)");
  ok(/names\.has\(\+id\)\s*\)\s*continue/.test(bbody),
     "og SLEPPIR theim sem eru thegar thekkt — annars vaeri geymslan gagnslaus");
  ok(/_names:\s*Object\.fromEntries/.test(bbody),
     "og SKRIFAR thau aftur — skrifad-en-ekki-lesid og lesid-en-ekki-skrifad eru badar daudar");

  /* ============================================================
     VEDRID VAR GRAENT ThOTT HVERT KALL BRYSTI (25.8.2026)
     `record("weather", true, out.length)` var SKILYRDISLAUST og villur
     voru adeins `console.warn`, sem enginn les. Detti open-meteo ut yrdi
     stadan afram GRAEN med laekkandi tolu.
     ============================================================ */
  const wi = src.indexOf("async function fetchWeather(");
  const wbody = src.slice(wi, src.indexOf("\n}\n", wi));
  ok(wi > 0, "FORSENDA: fetchWeather finnst");
  ok(/wErr\+\+/.test(wbody), "villur eru TALDAR, ekki adeins loggadar");
  ok(!/record\("weather",\s*true\b/.test(wbody),
     "og `record` er EKKI hardkodad `true` lengur");
  ok(/record\("weather",\s*!\(wErr > 0 && withData === 0\)/.test(wbody),
     "rautt ADEINS thegar ekkert tokst — hluta-bilun fellir ekki heimildina");
}

/* ============================================================
   10. `team_matches` — LIDS-TOLURNAR SEM GERA xGC MOGULEGA (22.8.2026)

   KAERAN: "Afhverju fae eg ekki xGC a lid?" a yfirstandandi timabili.
   Utreikningurinn sjalfur er hreint fall (`matchShotTotals`, profad i
   `bsd.mjs`); ThAD SEM ER VARID HER er ad pipeline kalli hann, skrifi
   nidurstoduna — og ad BAKFYLLINGIN se rett bundin.

   BAKFYLLINGIN ER ThAR SEM HAETTAN ER OG HUN ER TVIHLIDA:
   (a) An hennar faer ENGINN theirra leikja sem thegar voru sottir nokkurn
       tima lids-tolu — sokinin er vidbotarleg og les hvern leik EINU SINNI
       — svo xGC hefdi vantad nakvaemlega thau mork sem thegar eru skorud,
       ad eilifu, og talan a skjanum hefdi litid rett ut.
   (b) Se hun latin sækja `/player-stats/` lika leggst hver leikmadur OFAN
       A `_acc` i annad sinn: minutur, mork og skot TVOFALDAST thogult.
       Fordaemid er skjalad i `fetch-bsd.mjs` ("tvaer eins keyrslur gafu
       Harry Maguire 25 og 26 leiki").
   ============================================================ */
{
  console.log("\n-- 10. LIDS-TOLUR PER LEIK (team_matches) --");
  const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const a = fetchSrc.indexOf("async function fetchBsdLive()");
  const b = fetchSrc.indexOf("/* ========== 10. AFLEIDD", a);
  ok(a > 0 && b > a, "fetchBsdLive finnst i fetch.mjs (forsenda)");
  const live = strip(fetchSrc.slice(a, b));

  /* 1. EIN UTFAERSLA — summan kemur ur src/bsd.js, ekki ur pipeline. */
  ok(/matchShotTotals\(/.test(live),
     "fetchBsdLive kallar `matchShotTotals` (samlagningin bur i src/bsd.js)");
  ok(/matchShotTotals[,\s}]/.test(strip(fetchSrc.slice(0, 2000))),
     "og hun er FLUTT INN, ekki skilgreind i skriftunni");
  /* Enginn eigin xG-teljari vid hlidina a henni. Vaeri hann thar vaeru
     tvaer utfaerslur af somu tolu — sama aett og `buildTeamMetrics`.   */
  ok(!/\bxg\s*\+=/.test(live) && !/\+=\s*sh\.xg/.test(live),
     "og pipeline summar EKKI xG sjalft vid hlidina a henni");

  /* 2. RODIN ER SKRIFUD. Utreikningur sem hvergi kemur ut er dautt svid. */
  ok(/team_matches:/.test(live), "`team_matches` er skrifad i bsd_live.json");
  ok(/sort\(\(a, b\) => a\.id - b\.id\)/.test(live),
     "og i FASTRI rod (event-id) — skrain verdur ad vera endurgeranleg");

  /* 3. BAKFYLLINGIN ER TIL OG HUN SNERTIR EKKI `_acc`. */
  const bf = live.indexOf("const backfill");
  ok(bf > 0, "bakfylling er til (leikir sottir adur en rodin var til)");
  const loop = live.slice(live.indexOf("for (const id of backfill)"),
                          live.indexOf("if (!added && !filled)"));
  ok(loop.length > 40, "bakfyllingar-lykkjan finnst (forsenda)");
  ok(/\/stats\/`\)/.test(loop),
     "hun saekir `/events/{id}/stats/` — skotakortid");
  ok(!/player-stats/.test(loop),
     "og ALDREI `/player-stats/` — thad myndi tvitelja hvern leikmann i `_acc`");
  ok(!/addPlayerRow|addShot\(/.test(loop),
     "hun snertir hvorugan safnarann (addPlayerRow / addShot)");

  /* 4. SNEMM-UTGANGAN MA EKKI LOKA BAKFYLLINGUNA UTI. Vaeri skilyrdid
        afram `if (!fresh.length)` einu ynni bakfyllingin ALDREI: i dag eru
        sex leikir sottir og engin ny umferd fyrr en 29.8.                */
  ok(/if \(!fresh\.length && !backfill\.length\)/.test(live),
     "snemm-utgangan spyr um BADA (nyja leiki OG bakfyllingu)");
  ok(live.indexOf("const backfill") < live.indexOf("if (!fresh.length"),
     "og bakfyllingar-listinn er reiknadur A UNDAN henni (annars er hann tomur)");

  /* 5. VANTANDI SKOTAKORT MA EKKI VERDA ROD AF NULLUM. */
  ok(/if \(!t\) \{ noMap\+\+; return; \}/.test(live),
     "leikur an skotakorts fær ENGA rod og er TALINN (noMap)");
  ok(/noMap \? `/.test(live) || /noMap \?/.test(live),
     "og talan ratar i `record(...)` svo hun sjaist i Data sources");
}

console.log(`\nBSD-PIPELINE: ${pass} stodust, ${fail} féllu`);
if (fail) process.exit(1);
