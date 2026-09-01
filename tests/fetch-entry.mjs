/* ============================================================
   tests/fetch-entry.mjs — MAIN-VORDURINN I `scripts/fetch.mjs`

   `scripts/fetch.mjs` kallar `main()` adeins thegar hun er keyrd BEINT
   (21.8.2026). Adur var kallid oskilyrt, svo hver innflutningur keyrdi
   alla pipeline-una — og thess vegna var hvert hreint fall i skranni
   oprofanlegt nema med thvi ad LESA TEXTANN og byggja thad upp aftur
   (`tests/elo-fetch.mjs:25`), sem profar AFRIT en ekki kodann sem keyrir.

   AF HVERJU ThETTA PROF ER NAUDSYNLEGT OG EKKI SKRAUT: bilun i skilyrdinu
   er ThOGUL. Pipeline-an myndi ljuka a sekundubroti med utgangsstodu 0 og
   engum skrifum — GRAEN keyrsla sem gerir EKKERT. Tha er engin raud rod til
   ad taka eftir og `data/` frystist a theim degi sem thad gerdist. Texta-
   leit i `fetch.mjs` gaeti ekki fellt thetta: athugasemdin vid vordinn
   nefnir sjalf `main()` og `invokedDirectly` (kafli 5b — athugasemd sem
   uppfyllir fullyrdinguna).

   ThESS VEGNA ER PROFID A RAUNVERULEGU AFRITI, KEYRDU I NYJU FERLI, BADAR
   LEIDIR: beint (`node afrit.mjs` -> a ad kalla) og innflutt
   (`import("afrit.mjs")` -> a EKKI ad kalla). `main()` er skipt ut i
   afritinu fyrir eina prentun, svo ENGIN net-koll og ENGIN skrif verda —
   afritid liggur i `scripts/` svo afstaedu innflutningarnir leysist.

   Keyrsla:  node tests/fetch-entry.mjs
   ============================================================ */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const ROOT = new URL("../", import.meta.url).pathname;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); }
                       else { fail++; console.log("  ✗ " + m); } };

const SRC = ROOT + "scripts/fetch.mjs";
const src = readFileSync(SRC, "utf8");

/* ---- 1. FORSENDA: skilyrdid er thar, og thad er EITT ---- */
console.log("\n-- 1. FORSENDA --");
const calls = src.match(/^\s*(if \(invokedDirectly\) )?main\(\)/gm) || [];
ok(calls.length === 1, `nakvaemlega EITT `+"`main()`"+`-kall i skranni (${calls.length})`);
ok(/if \(invokedDirectly\) main\(\)/.test(src),
   "og thad er skilyrt vid `invokedDirectly`");
/* OSKILYRT KALL MA ALDREI SLAEDAST INN AFTUR — thetta er einmitt
   afturforin sem vordurinn snyst um.                                   */
ok(!/^main\(\)/m.test(src), "ekkert OSKILYRT `main()` a linubyrjun");

/* ---- 2. AFRITID: `main` skipt ut fyrir prentun ---- */
const MARK = "__FETCH_MAIN_RAN__";
const copy = ROOT + "scripts/.fetch-entry-probe.mjs";
/* Vid skiptum ut LIKAMANUM a `main`, ekki kallinu — thannig er skilyrdid
   sjalft OBREYTT og thad er thad sem er til profs.                     */
const bodyAt = src.indexOf("async function main(");
if (bodyAt < 0) { console.log("  ✗ `async function main(` finnst ekki"); process.exit(1); }
const braceAt = src.indexOf("{", bodyAt);
let depth = 0, end = -1;
for (let i = braceAt; i < src.length; i++) {
  if (src[i] === "{") depth++;
  else if (src[i] === "}") { depth--; if (!depth) { end = i + 1; break; } }
}
ok(end > 0, "likami `main()` var thattadur (svigar jafnir)");
const stub = `async function main() { console.log("${MARK}"); }`;
writeFileSync(copy, src.slice(0, bodyAt) + stub + src.slice(end));

try {
  /* ---- 3. BEIN KEYRSLA -> A AD KALLA ---- */
  console.log("\n-- 2. BEIN KEYRSLA --");
  const direct = spawnSync(process.execPath, [copy], { encoding: "utf8", timeout: 60000 });
  ok(direct.status === 0, `beint kall lykur an villu (status ${direct.status})`
     + (direct.status ? ` :: ${String(direct.stderr).slice(0, 200)}` : ""));
  ok(direct.stdout.includes(MARK),
     "`main()` VAR kolluð thegar skrain er keyrd beint");

  /* ---- 4. INNFLUTNINGUR -> A EKKI AD KALLA ---- */
  console.log("\n-- 3. INNFLUTNINGUR --");
  const impSrc = `import("file://${copy}").then(m => { `
    + `console.log("EXPORTS=" + Object.keys(m).length); });`;
  const imported = spawnSync(process.execPath, ["-e", impSrc],
                             { encoding: "utf8", timeout: 60000 });
  ok(imported.status === 0, `innflutningur lykur an villu (status ${imported.status})`
     + (imported.status ? ` :: ${String(imported.stderr).slice(0, 300)}` : ""));
  ok(!imported.stdout.includes(MARK),
     "`main()` var EKKI kolluð vid innflutning — thetta er kjarninn");
  /* OG SKRAIN VERDUR AD BERA UTFLUTNING, annars er innflutningur gagnslaus
     jafnvel thott hann se hljodur.                                      */
  const n = +(imported.stdout.match(/EXPORTS=(\d+)/)?.[1] ?? 0);
  ok(n >= 5, `innflutt skra ber utflutning sem prof geta lesid (${n})`);

  /* ---- 5. WORKFLOW-IN KALLA HANA ENN BEINT ----
     Skilyrdid er ADEINS rett svo lengi sem pipeline-an er keyrd sem
     skrifta. Kalladi workflow hana med `node -e "import(...)"` yrdi
     thogla bilunin sem thetta prof er til vegna.                       */
  console.log("\n-- 4. WORKFLOW-IN --");
  for (const wf of ["fetch.yml", "fetch-fast.yml"]) {
    const y = readFileSync(ROOT + ".github/workflows/" + wf, "utf8");
    const line = y.split("\n").find(l => l.includes("scripts/fetch.mjs"));
    ok(!!line && /^\s*run:\s*node scripts\/fetch\.mjs/.test(line),
       `${wf} keyrir hana BEINT: ${JSON.stringify((line || "").trim())}`);
  }
} finally {
  if (existsSync(copy)) unlinkSync(copy);
}

/* ============================================================
   TIMABILS-GRUNNURINN — REGLAN SEM VER OENDURHEIMTANLEG GOGN

   `season_baseline.json` ber LOKATOLUR fyrra timabils og er sú EINA
   heimild fyrir "i ar vs. i fyrra"-toluna. Gatid var
   `!events.some(ev => ev.finished)`, en GW1 er `finished: false` i ~3 daga
   eftir ad fresturinn lidur — og FPL nullstillir uppsofnudu tolurnar VID
   frestinn. Keyrsla 21.8. kl. 23:28 skrifadi thvi **600 radir med max
   starts 1** ofan a **599 radir med max starts 38**.

   OG HUN VAR ThOGUL: `label` er leitt af ari frestarins og stod afram
   "2025/26"; radafjoldinn for ur 599 i 600. Vordurinn sem var til
   (`gw1-checklist.mjs`) skodadi `label` og `players.length > 400` — BADIR
   lifdu klobburinn. **Fullyrding sem lifir thad sem hun a ad verja er
   verri en engin** (kafli 5b), og her hefdi hun kostad gogn sem verda ekki
   endurgerd eftir a.

   Profad hér a TILBUNUM inntokum thar sem svarid er thekkt fyrirfram —
   `seasonBaselineDecision` er hreint fall, sem er astaedan fyrir main-
   vordinum hér ofan.
   ============================================================ */
{
  console.log("\n-- 5. TIMABILS-GRUNNURINN --");
  const { seasonBaselineDecision } = await import("file://" + SRC);
  const done  = [{ starts: 38 }, { starts: 31 }, { starts: 0 }];   // lokid timabil
  const fresh = [{ starts: 1 },  { starts: 1 },  { starts: 0 }];   // nytt timabil

  /* 1. Forleikur, ekkert spilad, engin skra -> skrifa.                  */
  const a = seasonBaselineDecision({ fixtures: [{ started: false }], candidate: done, existing: null });
  ok(a.write === true, `forleikur an skrar -> skrifar (${a.why})`);

  /* 2. KJARNATILFELLID: leikur byrjadur, tolurnar nullstilltar. Gamla
     gatid (`some(ev => ev.finished)`) var OPID her.                     */
  const b = seasonBaselineDecision({ fixtures: [{ started: true, finished: false }],
                                     candidate: fresh, existing: done });
  ok(b.write === false, `leikur byrjadur -> SKRIFAR EKKI (${b.why})`);
  ok(/season under way/.test(b.why), "og notan segir hvers vegna");

  /* 3. SEINNA HLIDID, SEM ER ThAD SEM VER: jafnvel thott klukkan segdi
     "forleikur" ma verri skra ekki fara ofan a betri. Thetta er reglan
     sem stendur thott FPL breyti thvi hvenaer tolurnar nullstillast.    */
  const c = seasonBaselineDecision({ fixtures: [{ started: false }],
                                     candidate: fresh, existing: done });
  ok(c.write === false, `enginn leikur byrjadur EN tolurnar verri -> heldur gomlu (${c.why})`);
  ok(/max starts 38 against 1/.test(c.why),
     "notan ber BADAR tolurnar, svo hun se lesanleg an thess ad opna skrana");

  /* 4. Jafnt er ekki afturfor — sama timabil skrifad tvisvar sama dag.  */
  const d = seasonBaselineDecision({ fixtures: [], candidate: done, existing: done });
  ok(d.write === true, "jafn-lokid skra -> skrifar (endurskrif sama dag er ekki afturfor)");

  /* 5. BETRI skra ofan a verri MA fara i gegn — annars frystist skra sem
     var skrifud i miðju timabili og næsti forleikur gaeti ekki laknad.  */
  const e = seasonBaselineDecision({ fixtures: [], candidate: done, existing: fresh });
  ok(e.write === true, "betri skra ofan a verri fer i gegn (skran getur laknad)");

  /* 6. `finished_provisional` telst spilad — hun kviknar fyrir `finished`. */
  const f = seasonBaselineDecision({ fixtures: [{ finished_provisional: true }],
                                     candidate: done, existing: null });
  ok(f.write === false, "`finished_provisional` telst spilad");

  /* 7. Vantandi/oleysanleg `starts` ma ekki verda NaN og hleypa ollu i gegn. */
  const g = seasonBaselineDecision({ fixtures: [], candidate: [{ starts: null }, {}],
                                     existing: done });
  ok(g.write === false, `oleysanleg \`starts\` telst 0, ekki NaN (${g.why})`);

  /* 8. OG RAUNSKRAIN I REPO-INU: hun VERDUR ad bera lokid timabil. Thetta
     er fullyrdingin sem gw1-checklist gat ekki gert — `label` og
     radafjoldi lifdu klobburinn, `starts` ekki.                         */
  const sb = JSON.parse(readFileSync(ROOT + "data/season_baseline.json", "utf8"));
  const ms = Math.max(0, ...(sb.players || []).map(r => Number(r?.starts)).filter(Number.isFinite));
  ok(ms >= 20, `data/season_baseline.json ber LOKID timabil: max starts ${ms} (>= 20)`);
  ok((sb.players || []).length > 400, `og ${(sb.players || []).length} radir`);
}
ok(!existsSync(copy), "afritid var fjarlaegt");

/* ============================================================
   VERDBREYTINGA-SVIDIN — DAUTT SVID MA EKKI RATA I SKRANA

   FPL ber nu opinber framvindu-svid (`price_change_percent` o.fl.), en
   thau eru **0 hja ollum 600** medan verd eru fryst fram yfir fyrstu
   umferd. Vaeru thau skrifud sem 0 fengi hver leikmadur "0% framvinda" a
   `hi:true` dalki — tilbuin maeling, allir jafnir a toppnum. Sama regla og
   BSD-svidin (CLAUDE.md kafli 6) og "NULL ER EKKI NULL" (kafli 8).

   PROFSTEINNINN ER TVIHLIDA: hlidid verdur ad vera LOKAD i dag OG ad opnast
   sjalft. Vordur sem profar adeins lokada astandid frystist med thvi.
   ============================================================ */
{
  console.log("\n-- 6. VERDBREYTINGA-SVIDIN --");
  const { priceChangeSignal, PRICE_CHANGE_FIELDS } = await import("file://" + SRC);
  const zero = n => Array.from({ length: n }, () => ({
    cost_change_start: 0, cost_change_event: 0,
    price_change_percent: "0", price_change_hourly_rate: 0 }));

  const off = priceChangeSignal(zero(600));
  ok(off.live === false, `600 nullur -> svidunum SLEPPT (${off.why.slice(0, 54)}…)`);
  ok(/OMITTED|omitted/.test(off.why), "og notan segir ad theim se sleppt, ekki bara ad thau seu 0");

  /* Hlidid opnast a HVERJU merki fyrir sig — ad krefjast allra myndi halda
     thvi lokudu thann dag sem thau vakna.                                */
  const bump = (k, v) => { const a = zero(3); a[1][k] = v; return priceChangeSignal(a).live; };
  ok(bump("cost_change_start", 1), "einn madur haekkadi i verdi -> hlidid opnast");
  ok(bump("cost_change_start", -1), "og laekkun telst lika hreyfing");
  ok(bump("cost_change_event", 1), "hreyfing innan umferdar telst lika");
  ok(bump("price_change_percent", "47.2"), "tala i framvindu-svidinu ein og ser opnar hlidid");
  ok(bump("price_change_percent", "-83"), "negatif framvinda lika (leid nidur)");
  ok(bump("price_change_hourly_rate", 0.4), "hradinn einn og ser opnar hlidid");

  /* Strengur "0" ma ekki lesast sem merki — FPL sendir prosentuna sem
     STRENG, svo truthy-profun a henni vaeri alltaf sonn.                 */
  ok(priceChangeSignal([{ price_change_percent: "0" }]).live === false,
     'strengurinn "0" er EKKI merki (svidid kemur sem strengur, ekki tala)');
  ok(priceChangeSignal([]).live === false, "tomt fylki -> ekkert merki");
  ok(priceChangeSignal(null).live === false, "null -> ekkert merki, ekki hrun");

  ok(PRICE_CHANGE_FIELDS.length >= 3 && PRICE_CHANGE_FIELDS.includes("price_change_calibrating"),
     `svida-listinn ber `+"`calibrating`"+` (${PRICE_CHANGE_FIELDS.length} svid) — an hennar `
     + "vaeri ekki haegt ad greina 'engin framvinda' fra 'FPL treystir ekki tolunni'");

  /* OG RAUNVERULEGA SKRAIN: hun ma ALDREI bera svidid med 0 hja ollum.
     Thetta er hlidin sem hefdi verid brotin ef svidin hefdu verid skrifud
     hugsunarlaust — og hun vaknar sjalf thegar verd fara ad hreyfast.    */
  const pl = JSON.parse(readFileSync(ROOT + "data/players.json", "utf8")).players || [];
  const carry = pl.filter(p => p.price_change_percent !== undefined);
  const nonzero = carry.filter(p => Number.parseFloat(p.price_change_percent) !== 0);
  ok(carry.length === 0 || nonzero.length > 0,
     `players.json: ${carry.length} radir bera svidid, thar af ${nonzero.length} med tolu `
     + "— annadhvort ENGIN rod eda einhver med raunverulegt gildi, aldrei 600 nullur");
}

/* ============================================================
   `odds.gw` — MERKIMIDI UM INNIHALD, EKKI UM FREST

   Gatid skilar umferd NAESTA FRESTAR og su tala var stimplud a skrana. En
   bokmakarinn gefur linur a ThA LEIKI sem eru oleiknir, og thad fer i
   sundur i hvert sinn sem frestur lidur adur en umferdin klarast:
   MAELT 22.8.2026 bar `odds.json` **gw: 2** medan **18 af 18 rodum voru
   GW1-leikir**, tiu theirra thegar byrjadir.
   ============================================================ */
{
  console.log("\n-- 7. ODDS-UMFERDIN --");
  const { oddsGwCoverage } = await import("file://" + SRC);
  const fx = [
    { event: 1, kickoff_time: "2026-08-22T11:30:00Z" },
    { event: 1, kickoff_time: "2026-08-22T14:00:00Z" },
    { event: 2, kickoff_time: "2026-08-29T19:00:00Z" },
  ];
  const one = oddsGwCoverage({ A: { kickoff: "2026-08-22T11:30:00Z" },
                               B: { kickoff: "2026-08-22T14:00:00Z" } }, fx);
  ok(one.gw === 1 && one.gws.join() === "1",
     `radir ur GW1 -> gw 1 (${JSON.stringify(one)})`);
  /* KJARNATILFELLID: thetta er nakvaemlega astandid sem stimplinum skeikadi
     um — leikir GW1 sottir eftir ad GW1-fresturinn leid.                */
  ok(one.gw !== 2, "og ALDREI umferd naesta frestar bara af thvi hann er naestur");

  const two = oddsGwCoverage({ A: { kickoff: "2026-08-22T11:30:00Z" },
                               B: { kickoff: "2026-08-29T19:00:00Z" } }, fx);
  ok(two.gws.join() === "1,2" && two.gw === 1,
     `radir ur TVEIMUR umferdum -> `+"`gws`"+` ber badar og `+"`gw`"+` er su laegsta `
     + `(${JSON.stringify(two)})`);
  /* Engin ein tala getur verid sonn um tvaer umferdir — thess vegna er
     `gws` til og thess vegna ma `gw` ekki lata eins og hun se ein.      */
  ok(two.gws.length === 2, "og `gws` felur ekki hina umferdina");

  ok(oddsGwCoverage({}, fx).gw === null, "engar radir -> null, ekki 1");
  ok(oddsGwCoverage({ A: { opp: "X" } }, fx).gw === null,
     "rod an `kickoff` telst ekki med (hun getur ekki sannad umferd)");
  ok(oddsGwCoverage({ A: { kickoff: "1999-01-01T00:00:00Z" } }, fx).gw === null,
     "kickoff sem passar vid ENGAN leik -> null, ekki agiskun");
  ok(oddsGwCoverage(null, null).gw === null, "null inntok -> null, ekki hrun");

  /* RAUNSKRAIN: hun ma bera GAMLA merkimidann (skrifud fyrir lagfaeringu)
     en thekjan verdur ad vera reiknanleg — annars er fallid gagnslaust a
     theim gogunum sem thad var smidad fyrir.                            */
  const realOdds = JSON.parse(readFileSync(ROOT + "data/odds.json", "utf8"));
  const realFx = JSON.parse(readFileSync(ROOT + "data/fixtures.json", "utf8"));
  const cov = oddsGwCoverage(realOdds.teams, realFx);
  ok(Object.keys(realOdds.teams || {}).length === 0 || cov.matched > 0,
     `raunskra: ${Object.keys(realOdds.teams || {}).length} radir -> `
     + `thekja GW[${cov.gws.join(",")}] (merkimidi skrarinnar: ${realOdds.gw})`);
}

/* ============================================================
   API-SPORTS: KOSTNADAR-ThAKID VAR BLINT ThEGAR MEST A REYNDI

   Notandinn spurdi: "afhverju endar thetta alltaf svona, eru of morg koll?"
   Svarid er ja, og mekanisminn er tvithaettur:

   1. `haveFx` man adeins ThAD SEM TOKST — hun er byggd ur `prevAll.players`.
      Leikur sem MISTOKST er thvi sottur aftur i HVERRI keyrslu. A leikdegi
      gengur `fetch-fast` a 15 min fresti i 12 klst (48 keyrslur), auk
      halftima-cron allan solarhringinn. Ein keyrsla med 10 leiki + dagsetningu
      er 11 koll -> **~530 koll a dag** a threpi sem gefur **100**.
   2. Throskuldurinn sem atti ad stoðva thetta (`API_MIN_REMAINING`) les
      `x-ratelimit-requests-remaining` UR SVARINU. Villusvor bera hann ekki
      alltaf, svo `apiRemaining` helst `null` og skilyrdid
      `apiRemaining != null && ...` verdur ALDREI satt. Vordurinn slokknar
      nakvaemlega thegar hann a ad gripa — sama logun og "tomt gildi er ekki
      null": VANTANDI TALA VAR LESIN SEM "ekkert ad".

   Tvennt lagad: sjalf-talid thak per keyrslu (ohað thjoninum) og HORD
   STODVUN a adgangs-villu — hun er um REIKNINGINN, ekki um thetta eina
   kall, svo naestu tiu koll fa sama svar.
   ============================================================ */
{
  console.log("\n-- 8. API-SPORTS KOSTNADUR --");
  const src8 = readFileSync(SRC, "utf8");
  const noC = src8.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  /* Thakid er til OG er lesid i KODANUM, ekki bara skilgreint. Athugasemdir
     eru strippadar thvi thessi skra er full af theim og thaer nefna heitid. */
  ok(/const API_MAX_PER_RUN\s*=\s*(\d+)/.test(noC),
     `sjalf-talid thak er skilgreint (API_MAX_PER_RUN = ${noC.match(/API_MAX_PER_RUN\s*=\s*(\d+)/)?.[1]})`);
  ok(/apiCalls\s*>=\s*API_MAX_PER_RUN/.test(noC),
     "og thad er PROFAD adur en kallad er (ekki adeins skilgreint)");
  ok(/apiCalls\+\+/.test(noC), "og tellarinn haekkar i hverju kalli");

  /* HORD STODVUN A ADGANGS-VILLU. Prófsteinninn er ad hun setji `apiBlocked`
     — thad er breytan sem naesta kall les.                                */
  const gate = noC.slice(noC.indexOf("async function apiSports"),
                         noC.indexOf("async function fetchInjuries"));
  /* FULLYRDINGIN VERDUR AD BINDA ThETTA TVENNT SAMAN, EKKI FINNA HVORT I
     SINU LAGI. Fyrsta utgafan var `/errors\.access/ && /apiBlocked =/` a
     ollu fallinu — og `apiBlocked =` er LIKA i thaks-greininni, svo
     stokkbreyting sem tok adgangs-stodvunina ALVEG UT slapp i gegn.
     Vid tokum thvi greinina sjalfa og krefjumst thess ad hun setji hana.  */
  const accIf = gate.indexOf("if (acc)");
  const accBlock = accIf >= 0 ? gate.slice(accIf, gate.indexOf("}", accIf)) : "";
  ok(accIf >= 0, "forsenda: `if (acc)`-greinin er til i `apiSports`");
  ok(/apiBlocked\s*=/.test(accBlock),
     `adgangs-villan SJALF setur \`apiBlocked\` (${accBlock.split("\n")[1]?.trim().slice(0, 56)}…)`);
  /* OG HUN VERDUR AD NA YFIR FLEIRA EN `access`: sama vandamal kemur sem
     `token` (rangur lykill) og `plan` (threp). Einn strengur er ein vorn.  */
  ok(/errors\.token/.test(gate) && /errors\.plan/.test(gate),
     "og hun tekur lika `token` (rangur lykill) og `plan` (threp)");

  /* ThAKID VERDUR AD VERA STAERRA EN VERSTA EDLILEGA TILFELLID, annars
     skerum vid af okkur sjalfum: 10 leikir + 1 dagsetning + 1 rannsokn.   */
  const cap = +(noC.match(/API_MAX_PER_RUN\s*=\s*(\d+)/)?.[1] ?? 0);
  ok(cap >= 12, `thakid (${cap}) rumar versta EDLILEGA tilfellid: 10 leikir `
     + "+ dagsetning + rannsokn = 12");
  /* ...OG MINNA EN DAGSKVOTINN, annars ver thad ekkert. Fria threpid er 100
     og keyrslurnar eru tugir a dag.                                       */
  ok(cap < 100, `og minna en dagskvotinn 100 (${cap}) — annars vaeri thad ekkert thak`);
}

/* ============================================================
   7. ATOMISK SKRIF — HALFSKRIFUD SKRA MA ALDREI SITJA A COMMITTADRI SLOD

   `writeJSON` var beint `writeFile`, sem skrifar A STADNUM. Deyi keyrslan
   i midju skrifi situr TRUNKUD JSON-skra eftir — og appid les `data/`
   BEINT af raw.githubusercontent.com, an bakenda, svo hun faeri oleidrett
   i vafra notandans.

   FULLYRDINGIN ER UM HEGDUN, EKKI UM TEXTA. Texta-leit ("nefnir hun
   `rename`?") vaeri uppfyllt af athugasemdinni sjalfri — nakvaemlega
   gildran i CLAUDE.md 5b. Vid KEYRUM thvi raunverulegt afrit af fallinu:
     (a) heilbrigt skrif skilar heilli skra OG skilur ENGA `.tmp` eftir
     (b) skrif sem BREGST (obundinn hlutur -> JSON.stringify kastar)
         skilur GOMLU skrana eftir OSNERTA — thad er allur tilgangurinn —
         hreinsar `.tmp` og KASTAR afram (thogul bilun vaeri graen keyrsla
         sem skrifadi ekkert).
   ============================================================ */
console.log("\n=== 7. ATOMISK SKRIF (writeJSON) ===");
{
  const { mkdtemp, readFile: rf, readdir: rd, writeFile: wf } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");

  const wStart = src.indexOf("async function writeJSON(");
  ok(wStart > 0, "writeJSON finnst i scripts/fetch.mjs");
  const wEnd = src.indexOf("\n}\n", wStart);
  const wDecl = src.slice(wStart, wEnd + 3);
  ok(/rename\(/.test(wDecl), "FORSENDA: fallid nefnir `rename` (annars maelum vid rangt fall)");

  const { mkdir: mk, writeFile: wF, rename: rn, unlink: ul } = await import("node:fs/promises");
  const dir = await mkdtemp(join(tmpdir(), "aw-"));
  const factory = new Function("mkdir", "writeFile", "rename", "unlink", "DATA", "process",
    `${wDecl}\nreturn writeJSON;`);
  const writeJSON = factory(mk, wF, rn, ul, dir, { pid: 4242 });

  await writeJSON("t.json", { a: 1 });
  ok(JSON.parse(await rf(join(dir, "t.json"), "utf8")).a === 1, "heilbrigt skrif skilar heilli skra");
  ok((await rd(dir)).every(f => !f.endsWith(".tmp")),
    `og engin .tmp situr eftir (${JSON.stringify(await rd(dir))})`);

  /* ============================================================
     BILUNIN SEM ER HERMD VERDUR AD VERA SU RETTA — FYRSTA UTGAFA MIN
     VAR ThAD EKKI OG STOKKBREYTINGIN SLAPP I GEGN.

     Eg lét fyrst `JSON.stringify` kasta (hringtilvisun). Su villa
     verdur til ADUR EN nokkud er skrifad, svo gamla skrain lifir
     hvort sem skrifid er atomiskt EDA a stadnum — fullyrdingin gat
     ekki greint utfaerslurnar i sundur og var thvi tautologia
     (CLAUDE.md 13). Stokkbreyting i beint `writeFile` STODST hana.

     RETTA HERMUNIN er ad `writeFile` SJALFT deyi eftir ad hafa skrifad
     hluta — thad er nakvaemlega OOM/SIGKILL-tilfellid. Hun er
     inndaelanleg thvi fallid tekur `writeFile` sem breytu.
     ============================================================ */
  let threw = null;
  const halfWrite = async (path, data) => {
    await wf(path, String(data).slice(0, 5));      // TRUNKUD skrif...
    throw new Error("ENOSPC: simulated death mid-write");   // ...og svo daudi
  };
  const dying = new Function("mkdir", "writeFile", "rename", "unlink", "DATA", "process",
    `${wDecl}\nreturn writeJSON;`)(mk, halfWrite, rn, ul, dir, { pid: 4242 });
  try { await dying("t.json", { a: 2 }); } catch (e) { threw = e; }
  ok(threw !== null, "misheppnad skrif KASTAR afram (thogul bilun vaeri graen keyrsla an skrifa)");
  const after = await rf(join(dir, "t.json"), "utf8");
  ok(after === '{"a":1}',
    `GAMLA SKRAIN ER OSNERT, EKKI TRUNKUD — thetta er allur tilgangurinn (${after})`);
  ok(JSON.parse(after).a === 1, "og hun er enn thattanleg JSON");
  ok((await rd(dir)).every(f => !f.endsWith(".tmp")),
    `og .tmp-skrain er hreinsud (${JSON.stringify(await rd(dir))})`);

  /* UNDIRMOPPUR (data/live/, data/history/) fara sama veg. */
  await writeJSON("live/gw1.json", { ok: true });
  ok(JSON.parse(await rf(join(dir, "live/gw1.json"), "utf8")).ok === true,
    "undirmoppur (live/, history/) fara sama veg");
}

/* ============================================================
   8. ThRALAT RAUD HEIMILD FAER ALDUR (25.8.2026)

   `status.json` skrar ADEINS daginn i dag, svo raud rod litur eins ut
   hvort hun er klukkutima gomul eda viku. Baedi fjolddaga-atvikin sem
   eru skjaladh i thessu repo-i (elo frosin 14.-20.8., BSD 400 i fjora
   daga 18.-19.8.) voru SYNILEG allan timann og enginn tok eftir. Thad
   sem vantadi var ekki merkid heldur ALDURINN a thvi.

   Fallid er hreint og tekur DAGSETNINGU sem breytu — ekki `new Date()`
   — svo haegt se ad spila marga daga i rod. Kodinn sem thetta ver
   kviknar annars adeins thegar heimild hefur verid raud i tvo daga,
   sem er astand sem ekkert prof gaeti bedid eftir.
   ============================================================ */
console.log("\n=== 8. ThRALAT RAUD HEIMILD ===");
{
  const { redStreaks, streakDays } = await import(SRC);
  const red = ok_ => ({ elo: { ok: ok_ }, fpl: { ok: true } });

  let st = {};
  st = redStreaks(st, red(false), "2026-08-20");
  ok(streakDays(st.elo, "2026-08-20") === 1, `fyrsti raudi dagur = 1 (${streakDays(st.elo, "2026-08-20")})`);
  ok(st.fpl === undefined, "graen heimild fær ENGA faerslu");

  st = redStreaks(st, red(false), "2026-08-21");
  st = redStreaks(st, red(false), "2026-08-22");
  ok(streakDays(st.elo, "2026-08-22") === 3, `thrir dagar i rod = 3 (${streakDays(st.elo, "2026-08-22")})`);
  ok(st.elo.since === "2026-08-20", `og upphafsdagurinn helst (${st.elo.since})`);

  /* HRADA KEYRSLAN GENGUR A 30 MIN FRESTI, OG TALAN ER ONAEM FYRIR ThVI
     MED BYGGINGU — hun er LEIDD af `since` og `today`, ekki talin upp.
     ATH: fyrsta utgafa min geymdi `last` og bar ser-vord um thetta. Su
     vord var DAUD (stokkbreyting sem fjarlaegdi hana STODST profid),
     thvi `streakDays` las `last` aldrei. Svidid var fjarlaegt i stad
     thess ad styrkja vordina. Fullyrdingin hér er thvi um ThAD SEM
     GERIR HANA ONAEMA: fjolda-keyrsla sama dag skilar somu tolu, OG
     faerslan ber ekkert svid sem gaeti rekist a vid hana.            */
  let same = st;
  for (let i = 0; i < 48; i++) same = redStreaks(same, red(false), "2026-08-22");
  ok(streakDays(same.elo, "2026-08-22") === 3,
     `48 keyrslur sama dag gefa afram 3 (${streakDays(same.elo, "2026-08-22")})`);
  ok(JSON.stringify(same.elo) === JSON.stringify({ since: "2026-08-20" }),
     `og faerslan ber ADEINS \`since\` (${JSON.stringify(same.elo)}) — ekkert svid sem er skrifad an thess ad vera lesid`);

  /* ============================================================
     OSKRAD ER EKKI GRAENT — TILFELLID SEM LYKKJAN GAT EKKI SED
     ============================================================
     Til 25.8.2026 gekk `redStreaks` yfir `sources` DAGSINS EINAR, svo
     heimild sem hvarf ur skranni tapadi `since` og naesti raudi dagur
     byrjadi i 1. Braut sem er raunveruleg: `fetchInjuries` er gatad a
     `FLAGS.apisports`, svo an lykils er `apisports_injuries` HVORKI
     graen NE raud — hun er einfaldlega ekki thar. Og `App.jsx` teiknar
     enga rod fyrir heimild sem vantar, svo notandinn ser thad ekki.
     ThRIGGJA-ASTANDA PROF: raudur -> OSKRADUR -> raudur aftur.       */
  {
    let g = {};
    g = redStreaks(g, { elo: { ok: false } }, "2026-08-20");
    g = redStreaks(g, {}, "2026-08-21");            // heimildin er EKKI skrad
    ok(g.elo?.since === "2026-08-20",
       `OSKRAD dag 2 tapar EKKI streakinu (${JSON.stringify(g.elo)})`);
    g = redStreaks(g, { elo: { ok: false } }, "2026-08-22");
    ok(streakDays(g.elo, "2026-08-22") === 3,
       `og dagur 3 telur fra UPPHAFINU, ekki fra endurkomunni (${streakDays(g.elo, "2026-08-22")})`);
    /* OG HUN MA SAMT HREINSAST VID SKYRT GRAENT — annars vaeri
       lagfaeringin ad bua til hina villuna (streak sem deyr aldrei). */
    const gone = redStreaks(g, { elo: { ok: true } }, "2026-08-23");
    ok(gone.elo === undefined, "en SKYRT graent hreinsar hana afram");
  }

  /* GRAEN ROD HREINSAR. An thess vaeri "6 dagar" satt um heimild sem
     lagadist i gaer — sama villa i hina attina, og hun er verri thvi
     hun kennir manni ad hunsa teljarann.                            */
  const healed = redStreaks(st, red(true), "2026-08-23");
  ok(healed.elo === undefined, "graen rod HREINSAR teljarann");
  /* og hun byrjar upp a nytt, ekki thar sem frá var horfid */
  const again = redStreaks(healed, red(false), "2026-08-24");
  ok(streakDays(again.elo, "2026-08-24") === 1,
     `ny bilun byrjar a 1, ekki 4 (${streakDays(again.elo, "2026-08-24")})`);

  /* Ologleg/vantandi inntok mega ekki gefa NaN a skjainn. */
  ok(streakDays(null, "2026-08-24") === 0, "vantandi faersla -> 0, ekki NaN");
  ok(streakDays({ since: "rusl" }, "2026-08-24") === 0, "ologleg dagsetning -> 0, ekki NaN");
  ok(Object.keys(redStreaks(null, null, "2026-08-24")).length === 0, "tom inntok hrynja ekki");
}

/* ============================================================
   9. ESPN SKIPTI UM HNITA-KVARDA 25.8.2026 (0-1 -> 0-100)

   Hnitin voru tekin HRA ur `fieldPositionX/Y` og allt sem les thau
   (ShotMap.jsx, `IN_BOX_X`, kvordunartolurnar) gerir rad fyrir
   HLUTFALLI af hálfum velli.

   MAELT a committudum snapshotum af `data/last_gw_shots.json`:
     ... 5d3e307  max x = 0.96
         a816e02  max x = 0.96
         d9dd6a8  max x = 0.96
         da66d92  max x = 0.96
         15a42e3  max x = 0.96
         cb99d34  max x = 98.80   <- 25.8.2026
   Enginn kodi okkar breyttist thann dag; VEITAN skipti um kvarda.

   Thetta er ESPN-kvardavillan ur CLAUDE.md kafla 6 i HINA attina: tha
   margfaldadi OKKAR kodi med 105 og setti hvert skot i tvofalda
   fjarlaegd; nu senda ThEIR hundradfalda tolu og kortid faeri 100x ut
   fyrir vollinn.

   REGLAN ER LEIDD, EKKI HARDKODUD: 0-1 kvardi getur ALDREI farid yfir
   1, svo gildi > 1 ER hundrads-kvardi. Hun lagar sig thvi sjalf i BADAR
   attir — sem er allt malid, thvi veitan getur skipt aftur.
   ============================================================ */
console.log("\n=== 9. ESPN-HNITAKVARDI ===");
{
  const src = readFileSync(SRC.replace("file://", ""), "utf8");
  const body = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(/newGrid \? \+\(\(1 - rawX \/ 100\) \* 2\)/.test(body),
     "vorpunin er i pipeline-unni (ekki i birtingunni)");
  ok(/rescaled\+\+/.test(body), "og skiptin eru TALIN, svo thau gerist ekki thegjandi");

  /* HEGDUNIN SJALF — texti einn vaeri uppfylltur af athugasemdinni.
     ESPN skipti um BAEDI kvarda OG vidmidun: nyja kerfid er heill
     vollur fra EIGIN marki med y speglad; thad gamla (sem allt nedar
     les) er halfur vollur sem fjarlaegd FRA SOTTA MARKINU.          */
  const conv = (rx, ry) => {
    const n = rx > 1 || ry > 1;
    return [rx == null ? null : (n ? +((1 - rx / 100) * 2).toFixed(4) : rx),
            ry == null ? null : (n ? +(1 - ry / 100).toFixed(4) : ry)];
  };
  const [ox, oy] = conv(0.21, 0.48);
  ok(ox === 0.21 && oy === 0.48, `GAMALT snid fer OBREYTT i gegn (${ox}, ${oy})`);
  const [nx, ny] = conv(84.2, 58.0);
  ok(Math.abs(nx - 0.316) < 1e-9, `NYTT snid: x 84,2 -> ${nx} (naerri marki, i teig)`);
  ok(Math.abs(ny - 0.42) < 1e-9, `og y 58,0 -> ${ny} (speglad)`);
  /* ATTIN ER ThAD SEM SKIPTIR MALI: i nyja kerfinu er HAERRA x NAER
     markinu, i thvi gamla er LAEGRA x naer. Snuist thetta vid vaeri
     kortid spegilmynd af sjalfu ser og engin talna-vord saei thad.  */
  ok(conv(95, 50)[0] < conv(70, 50)[0],
     `skot naer marki (95) faer LAEGRA gamalt x en fjarlaegt (70): `
     + `${conv(95, 50)[0]} < ${conv(70, 50)[0]}`);
  ok(conv(null, null)[0] === null, "vantandi hnit helst null, ekki 0");

  /* AFTURFOR-VORDUR A RAUNGOGNUM: skrain sem er committud NUNA ma ekki
     bera hundrads-kvarda. Hun gerir thad i dag (cb99d34), svo thetta
     fellur ThANGAD TIL pipeline-an keyrir aftur — sem er RETT: gognin
     ERU rong og vordurinn a ad segja thad.                          */
  try {
    const shots = JSON.parse(readFileSync(new URL("../data/last_gw_shots.json", import.meta.url), "utf8"));
    const xs = [];
    (function walk(o) { if (!o || typeof o !== "object") return;
      if (typeof o.x === "number") xs.push(o.x);
      Object.values(o).forEach(walk); })(shots);
    if (xs.length) {
      /* ============================================================
         SKOT UR EIGIN VALLARHELMINGI ER TIL (lagad 31.8.2026)

         Krafan var `max <= 1`, sem segir ad enginn skjoti lengra en fra
         midlinu. GW2 bar mottilfellid: Liam Millar (HUL) a x = 1,052, og
         ESPN-textinn segir sjalfur "shot from more than 40 yards". Ein
         rod af 275. Vordurinn er til ad taka HUNDRADS-KVARDA (x ~ 34
         i stad 0,34) og MARGFOLDUN (x ~ 2 i stad 1) — hvorugt lifir
         thakid 2 eda thekjukrofuna hér. Sama lagfaering og i
         `stats.test.mjs` sama dag; tvo eintok af somu krofu voru
         hoftud, thvi thau LESA sama svid.
         ============================================================ */
      const mx = Math.max(...xs);
      ok(mx <= 2, `committud last_gw_shots.json er a rettum kvarda (max ${mx.toFixed(3)})`
         + (mx > 2 ? " — VEITAN SKIPTI UM KVARDA; keyrdu pipeline-una" : ""));
      const beyond = xs.filter(v => v > 1).length;
      ok(beyond / xs.length < 0.05,
         `nanast oll skot eru innan hals vallar (${beyond} af ${xs.length}) `
         + "— hlutfall sem springur er kvardavilla, ekki langskot");
    }
  } catch { /* skrain er ekki alltaf til */ }
}

console.log(`\nFETCH-ENTRY: ${pass} stodust, ${fail} féllu`);
if (fail) process.exit(1);
