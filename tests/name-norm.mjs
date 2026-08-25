/* ============================================================
   TVITEKNINGAR SEM MUNDU REKA I SUNDUR — VORDURINN

   HVERS VEGNA ThETTA SAFN VARD TIL (11.8.2026): fjorir hlutir voru
   skilgreindir a TVEIMUR eda ThREMUR stodum, og i thremur tilfellum voru
   afritin ThEGAR OLIK:

     1. `normName`      — src/stats.js OG src/bsd.js, BADAR `export`-adar
                          undir sama nafni, badar poradar vid somu FPL-nofn.
                          OLIKAR: "O'Riley" -> [oriley] a moti [riley].
     2. `BSD_TEAM`      — scripts/fetch-bsd.mjs, fetch-bsd-teams.mjs OG
                          fetch.mjs (`BSD_TEAM_SHORT`). Stafrett eins.
     3. MAELDU FASTARNIR `BIG_CHANCE_XG`/`IN_BOX_X` — src/bsd.js OG
                          fetch-bsd-teams.mjs, thratt fyrir ad hausinn a
                          src/bsd.js banni thad berum ordum. VERRA: profid
                          tests/team-stats.mjs flutti thá inn UR AFRITINU.
     4. lifandi timabils-rod — Compare.liveRow OG PlayerPanel.liveRecord.
                          OLIKAR a thremur svidum.

   ENGIN ThESSARA TVITEKNINGA GAT FALLID A NEINU PROFI. Thad er kjarni
   malsins: tvitekning er ekki villa i dag, hun er villa a ThEIM DEGI sem
   annad afritid er lagfaert og hitt ekki.

   ThRJAR REGLUR SEM ThETTA SAFN FYLGIR:

   A) ATHUGASEMDIR ERU SKORNAR BURT ADUR EN LEITAD ER. Thetta er ekki
      snyrtimennska heldur nauðsyn: hver lagfaering her skildi eftir
      athugasemd sem VITNAR I GAMLA KODANN ("adur stod her BSD_TEAM = {18:
      \"ARS\" …}"), svo leit i hrаum texta hefdi fundid sinn eigin
      rokstudning og stadist. Handoffid nefndi thetta sem gildru sem beit
      endurtekid: "FULLYRDING SEM ATHUGASEMD GETUR UPPFYLLT ER EINSKIS
      VIRDI."

   B) ThEKJA ER FULLYRDING, EKKI LOGGA. Hvert svid telur skrarnar sem thad
      las og FELLUR ef talan hrynur. Safn sem prentar "0 skrar skannadar"
      og skilar 0 maelir EKKERT.

   C) ThAD SEM ER VILJANDI OLIKT ER VARID LIKA. `nameScore` er TVO OLIK
      foll (hlutfall a moti fjolda+0,5) og namundunin i PlayerPanel er
      ASETT. Vordur sem heimtar "eitt af ollu" myndi thvinga fram
      sameiningu sem MAELINGIN HAFNAR — svo hann heimtar hid gagnstaeda thar.
   ============================================================ */
import { readFileSync, readdirSync } from "node:fs";

const R = new URL("../", import.meta.url).pathname;
const read = p => readFileSync(R + p, "utf8");

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ✓ " + msg); }
                            else { fail++; console.log("  ✗ " + msg); } };

/* Skerum athugasemdir burt — sja reglu A. Strengir eru latnir i fridi:
   their geta borid kóda-lik brot en engin skilgreining lifir i streng.  */
const strip = src => src
  .replace(/\/\*[\s\S]*?\*\//g, "")      // /* ... */
  .replace(/(^|[^:])\/\/[^\n]*/g, "$1"); // // ...  (":" hlifir "http://")

/* ---------------------------------------------------------------
   1. NORMNAME ER SKILGREINT A EINUM STAD
   --------------------------------------------------------------- */
console.log("\n=== 1. NAFNA-NORMUN: EIN SKILGREINING ===");
{
  const files = ["src/names.js", "src/stats.js", "src/bsd.js"];
  let scanned = 0;
  const defs = [];
  for (const f of files) {
    const s = strip(read(f));
    scanned++;
    /* Skilgreining = `const normName =` eda `function normName(`.
       ENDURFLUTNINGUR (`export { normName } from`) er EKKI skilgreining. */
    const isDef = /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+normName\s*=/.test(s)
               || /(?:^|\n)\s*(?:export\s+)?function\s+normName\s*\(/.test(s);
    if (isDef) defs.push(f);
  }
  ok(scanned === 3, `skannadi 3 skrar (${scanned})`);
  ok(defs.length === 1, `normName skilgreint a EINUM stad (${defs.length}: ${defs})`);
  ok(defs[0] === "src/names.js", `og thad er src/names.js (${defs[0]})`);

  const { normName: a } = await import("../src/stats.js");
  const { normName: b } = await import("../src/bsd.js");
  const { normName: c } = await import("../src/names.js");
  ok(a === c && b === c, "stats.js og bsd.js flytja SOMU fall-tilviljun inn");

  /* Hegdunin sem SKILDI thau ad — nu verdur hun ad vera eins. */
  const cases = ["Matt O'Riley", "O'Riley", "Jun'ai Byfield", "Dara O'Shea",
                 "Nico O'Reilly", "Luke O'Nien", "Jake O'Brien"];
  let same = 0;
  for (const x of cases) if (a(x) === b(x)) same++;
  ok(same === cases.length,
     `urfellingarmerki eins i badum (${same}/${cases.length})`);
  ok(a("Matt O'Riley") === "matt oriley",
     `"Matt O'Riley" -> "matt oriley" (fekk "${a("Matt O'Riley")}")`);
  ok(!a("O'Riley").includes(" "),
     "urfellingarmerki er FELLT UT, ekki sett i bil (annars tapast 'o'-taknid)");
}

/* ---------------------------------------------------------------
   1b. PIPELINE MA EKKI BERA SINN EIGIN NORMOLARA  (21.8.2026)

   ThRIDJA AFRITID FANNST — OG ThAD HAFDI ThEGAR KOSTAD PORUN. Kafli 1 ofan
   skannar adeins `src/`, svo `scripts/fetch.mjs` slapp: `apiNameIndex` bar
   sinn EIGIN normolara, stafrett eins og hinir tveir NEMA AN
   TRANSLIT-TOFLUNNAR. Afleidingin er nakvaemlega su sem taflan i
   src/names.js varar vid: NFD leysir EKKI upp `ø` (ne `ß`, `ı`, `ł`, `đ`,
   `þ`, `æ`), svo `[^a-z]` gerdi hann ad BILI og "Nørgaard" vard
   "n rgaard". 21.8.2026, fyrsta daginn sem API-Sports bar raungogn, tapadist
   "C. Norgaard (Everton)" ur meidsla-porunni af nakvaemlega thessari astaedu.

   Vordurinn er a LOGUNINNI, ekki a nafninu: afritid het `norm`, ekki
   `normName`, svo kafli 1 hefdi ekki fundid thad jafnvel med scripts/ i
   skonnun. Leitad er ad NFD-normun i nafna-samhengi.
   --------------------------------------------------------------- */
console.log("\n=== 1b. SCRIPTS/ BER ENGAN EIGIN NAFNA-NORMOLARA ===");
{
  const dir = R + "scripts/";
  const scripts = readdirSync(dir).filter(f => f.endsWith(".mjs"));
  ok(scripts.length >= 8, `skannadi pipeline-skriftur (${scripts.length})`);
  /* Lögunin: NFD + brottnam samsettra stafmerkja. Athugasemdir skornar
     burt (regla A) — thessi vordur er sjalfur skjaladur i fetch.mjs.   */
  const NFD_RE = /normalize\(\s*"NFD"\s*\)/;
  const own = scripts.filter(f => NFD_RE.test(strip(read("scripts/" + f))));
  ok(own.length === 0,
     `engin skrifta gerir sina eigin NFD-normun (fann ${own.length}: ${own})`);
  /* OG FULLYRDINGIN MA EKKI VERA TOM: mynstrid VERDUR ad hitta thar sem
     normolarinn BYR, annars maelir regexid ekkert (CLAUDE.md 5b regla 2). */
  ok(NFD_RE.test(strip(read("src/names.js"))),
     "mynstrid hittir i src/names.js — annars vaeri leitin ofan tom");

  /* Og pipeline VERDUR ad flytja hann inn, ekki bara sleppa ad skrifa hann. */
  const fx = strip(read("scripts/fetch.mjs"));
  ok(/import\s*\{[^}]*\bnormName\b[^}]*\}\s*from\s*["'][^"']*names\.js["']/.test(fx),
     "scripts/fetch.mjs flytur normName inn ur src/names.js");
  ok(/const\s+norm\s*=\s*normName\s*;/.test(fx),
     "og API-nafna-visirinn NOTAR hann (const norm = normName)");

  /* Hegdunin sem tapadist: `ø` verdur `o`, EKKI bil. Prófad a raunverulega
     manninum sem fell ur porun 21.8.2026.                              */
  const { normName } = await import("../src/names.js");
  ok(normName("Nørgaard") === "norgaard",
     `"Nørgaard" -> "norgaard" (fekk "${normName("Nørgaard")}")`);
  ok(normName("C. Nørgaard") === normName("C. Norgaard"),
     "API-form an stafmerkis og FPL-form med thvi normast EINS (thetta var villan)");
  /* Og gamli normolarinn — sa sem stod i fetch.mjs — a ad BREGDAST hér.
     An thessarar linu er fullyrdingin ofan "rett tala, engin maeling". */
  const OLD = x => (x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  ok(OLD("Nørgaard") !== normName("Nørgaard"),
     `gamla afritid gaf "${OLD("Nørgaard")}" — svo munurinn er RAUNVERULEGUR, ekki snyrtimennska`);
}

/* ---------------------------------------------------------------
   2. SKORUNAR-FOLLIN ERU VILJANDI TVO — REGLA C
   --------------------------------------------------------------- */
console.log("\n=== 2. nameScore ER VILJANDI TVO OLIK FOLL ===");
{
  const s = await import("../src/stats.js");
  const b = await import("../src/bsd.js");
  ok(s.nameScore !== b.nameScore, "thau eru EKKI sama fall (asett)");
  /* bsd skilar HLUTFALLI (0..1) thvi pairPlayers ber vid throskuldinn 0,6;
     stats skilar FJOLDA + 0,5 fyrir sameiginlegt eftirnafn.              */
  const bs = b.nameScore("Matt O'Riley", "Matt O'Riley");
  const ss = s.nameScore("Matt O'Riley", "Matt O'Riley");
  ok(bs === 1, `bsd.nameScore er hlutfall, fullt hus = 1 (${bs})`);
  ok(ss > 1, `stats.nameScore er fjoldi + eftirnafns-bonus, > 1 (${ss})`);
  ok(bs !== ss, "og thau skila SITTHVORU — ekki sameina thau");
}

/* ---------------------------------------------------------------
   3. LIDATAFLAN OG MAELDU FASTARNIR — EITT AFRIT
   --------------------------------------------------------------- */
console.log("\n=== 3. BSD_TEAM OG MAELDU FASTARNIR: EIN HEIMILD ===");
{
  const dir = R + "scripts/";
  const scripts = readdirSync(dir).filter(f => f.endsWith(".mjs"));
  ok(scripts.length >= 8, `fann pipeline-skriftur (${scripts.length})`);

  /* Bokstafleg tafla = rod sem parar BSD-id vid thristafa short.
     Leitad i KODA, ekki athugasemdum (regla A).                        */
  const TABLE_RE = /\b18\s*:\s*"ARS"/;
  const copies = [];
  let scanned = 0;
  for (const f of scripts) {
    scanned++;
    if (TABLE_RE.test(strip(read("scripts/" + f)))) copies.push("scripts/" + f);
  }
  ok(scanned === scripts.length, `skannadi allar (${scanned})`);
  ok(copies.length === 0,
     `ENGIN bokstafleg lidatafla i scripts/ (fann ${copies.length}: ${copies})`);

  const srcCopies = ["src/bsd.js", "src/stats.js", "src/names.js"]
    .filter(f => TABLE_RE.test(strip(read(f))));
  ok(srcCopies.length === 1 && srcCopies[0] === "src/bsd.js",
     `taflan bur i src/bsd.js og hvergi annars (${srcCopies})`);

  /* Maeldu fastarnir: engin skrifta ma skilgreina thá upp a nytt. */
  const constDefs = [];
  for (const f of scripts) {
    const s = strip(read("scripts/" + f));
    if (/(?:const|let|var)\s+(?:BIG_CHANCE_XG|IN_BOX_X)\s*=/.test(s))
      constDefs.push("scripts/" + f);
  }
  ok(constDefs.length === 0,
     `enginn skrifta skilgreinir BIG_CHANCE_XG/IN_BOX_X (fann ${constDefs})`);

  /* OG ThAD SEM VAR RAUNVERULEGA HAETTULEGT: profid las afritid. */
  const b = await import("../src/bsd.js");
  const t = await import("../scripts/fetch-bsd-teams.mjs");
  ok(t.BIG_CHANCE_XG === b.BIG_CHANCE_XG && t.IN_BOX_X === b.IN_BOX_X,
     `fetch-bsd-teams endurflytur SOMU fasta (${t.BIG_CHANCE_XG}, ${t.IN_BOX_X})`);
  ok(Object.keys(b.BSD_TEAM).length === 20, `taflan ber 20 lid (${Object.keys(b.BSD_TEAM).length})`);
  ok(b.BSD_TEAM[17] === "MUN" && b.BSD_TEAM[12] === "MCI",
     "Man United og Man City eru RETT skilin (fuzzy porun felldi thau saman)");
}

/* ---------------------------------------------------------------
   4. LIFANDI TIMABILS-ROD — EIN UTFAERSLA, EN NAMUNDUNIN HELDUR
   --------------------------------------------------------------- */
console.log("\n=== 4. liveSeasonRow: EIN UTFAERSLA ===");
{
  const cmp = strip(read("src/Compare.jsx"));
  const pan = strip(read("src/PlayerPanel.jsx"));
  const st  = strip(read("src/stats.js"));

  ok(/export function liveSeasonRow\s*\(/.test(st),
     "liveSeasonRow er skilgreint i stats.js");

  /* Hvorugt vidmotid ma BYGGJA rodina upp a nytt.
     FYRSTA UTGAFA ThESSARAR FULLYRDINGAR VAR ROENG og hun FELL — a rettum
     kodа. Hun taldi hvert skipti sem svid eins og `expected_goals_conceded`
     kom fyrir, og fekk 11 i Compare.jsx. Thau 11 eru DALKA-SKILGREININGAR
     (`get: r => r.expected_goals_conceded`) sem lesa UR RODINNI — einmitt
     thad sem thessi vidmot eiga ad gera.

     Tvitekningin sem a ad fella profid er ONNUR: ad byggja rodina UR HRAA
     leikmanninum, `num(p.<svid>)` / `n(p.<svid>)`. ThAD er mynstrid sem var
     afritad, og thad er thvi mynstrid sem er maelt.

     (Lardomurinn er CLAUDE.md 5b: fullyrding sem faellur a rettum koda er
     jafn gagnslaus og fullyrding sem stenst a ollum koda.)              */
  const BUILD_RE = /\b[a-z]+\(\s*p\.(?:expected_goals_conceded|expected_goal_involvements|yellow_cards|clean_sheets|goals_conceded)\b/g;
  const cmpBuild = (cmp.match(BUILD_RE) || []).length;
  const panBuild = (pan.match(BUILD_RE) || []).length;
  ok(cmpBuild === 0, `Compare.jsx byggir ekki rodina ur hraum leikmanni (${cmpBuild})`);
  ok(panBuild === 0, `PlayerPanel.jsx byggir ekki rodina ur hraum leikmanni (${panBuild})`);
  /* Og fullyrdingin ma ekki vera tóm: mynstrid VAR tharna adur (regla 2 i
     CLAUDE.md 5b — neikvaed fullyrding verdur ad nefna streng sem var
     sannanlega til). stats.js byggir rodina og verdur ThVI ad hitta.    */
  const stBuild = (st.match(BUILD_RE) || []).length;
  ok(stBuild >= 4,
     `mynstrid er raunverulegt og finnst i stats.js (${stBuild}) — annars maeldi profid ekkert`);
  ok(/liveSeasonRow/.test(cmp), "Compare.jsx notar liveSeasonRow");
  ok(/liveSeasonRow/.test(pan), "PlayerPanel.jsx notar liveSeasonRow");

  /* `num` ma ekki vera endurskilgreint i PlayerPanel. */
  ok(!/(?:const|let|var)\s+n\s*=\s*v\s*=>/.test(pan),
     "PlayerPanel skilgreinir EKKI sitt eigid `n` (var afrit af num)");

  /* REGLA C: KJARNINN SKILAR HRAU, PlayerPanel NAMUNDAR.
     Hefdi namundunin verid flutt i kjarnann fengi Compare TVOFALDA
     namundun. Thetta er thvi ekki stilspurning heldur talnaspurning.  */
  const { liveSeasonRow } = await import("../src/stats.js");
  const raw = liveSeasonRow({ minutes: 90, starts: 3, defensive_contribution: 3.145 });
  ok(raw.dc_per_start != null && String(raw.dc_per_start).length > 4,
     `kjarninn skilar ONAMUNDADRI dc_per_start (${raw.dc_per_start})`);
  ok(/toFixed\(2\)/.test(pan), "PlayerPanel namundar sjalft (parity vid geymd timabil)");

  /* Og geymdu timabilin sem namundunin er til ad passa vid. */
  let stored = null;
  try {
    const f = JSON.parse(read("data/player_seasons.json"));
    for (const byS of Object.values(f.players || {})) {
      for (const r of Object.values(byS || {}))
        if (r && typeof r.dc_per_start === "number" && r.dc_per_start % 1 !== 0) { stored = r.dc_per_start; break; }
      if (stored != null) break;
    }
  } catch { /* skrain ma vanta */ }
  ok(stored == null || String(stored).split(".")[1].length <= 2,
     `geymd timabil bera <=2 aukastafi (daemi ${stored}) — thvi namundar PlayerPanel`);
}

console.log(`\n========================================`);

/* ============================================================
   KLUBBA-NAFNAVORPUNIN — VAR TVISVAR, MED TVEIMUR NORMOLURUM OG
   TVEIMUR OLIKUM ORDABOKUM (25.8.2026)

   Thessi skra er til vegna thess ad `normName` (LEIKMANNA-nofn) var
   skilgreint tvisvar. KLUBBA-nofnin foru nakvaemlega somu leid an thess
   ad nokkur taeki eftir:
     ESPN-leidin strippadi `^afc`/`fc$`/`^the`; Odds-leidin gerdi thad EKKI
     -> "AFC Bournemouth" vard `bournemouth` odru megin, `afcbournemouth` hinu.
   Og ordabaekurnar voru ULIKAR, ekki afrit: stuttu formin ("Brighton",
   "Man City", "Spurs", "Leeds", "Hull", "Ipswich", "Coventry",
   "Newcastle") voru ADEINS i Odds-toflunni, svo ESPN-leidin hefdi skilad
   `unmatched` a theim — thogult.

   FULLYRDINGARNAR ERU UM HEGDUN, EKKI UM AD KODINN SE SAMEINADUR:
   textaleit ("er `CLUB_NORM` notad tvisvar?") vaeri uppfyllt af
   athugasemdinni sem utskyrir hana (CLAUDE.md 13). Vid KEYRUM vorpunina.
   ============================================================ */
console.log("\nKLUBBA-NAFNAVORPUN (CLUB_NORM / CLUB_ALIAS)");
{
  const { CLUB_NORM, CLUB_ALIAS, clubIndex } = await import("../scripts/fetch.mjs");
  const { readFileSync } = await import("node:fs");
  const teams = JSON.parse(readFileSync(new URL("../data/teams.json", import.meta.url), "utf8")).teams;
  /* FPL-bootstrap ber `short_name`; `data/teams.json` ber `short`. Vorpunin
     les `short_name`, svo profgognin eru faerd i ThAD form — annars maeldi
     kaflinn tomt kort og vaeri graenn af rangri astaedu.                */
  const teamsById = Object.fromEntries(teams.map(t => [t.id, { ...t, short_name: t.short }]));
  const idx = clubIndex(teamsById, (id, t) => t.short_name);

  /* GOLFID ER LEITT, EKKI VALID. Fyrsta utgafa min setti `>= 60` ur
     hausnum og raunin er 53 — talan var agiskun sem leit ut eins og
     krafa. Byggingarlega LAGMARKID er tvo lyklar per lid (fullt nafn +
     skammstofun, sem geta ekki verid eins), svo `teams.length * 2` er
     satt oháð thvi hve morg samheiti eru i toflunni.                 */
  ok(Object.keys(idx).length >= teams.length * 2,
     `FORSENDA: kortid er byggt (${Object.keys(idx).length} lyklar `
     + `>= ${teams.length * 2} = nafn+skammstofun per lid) — tomt kort vaeri graent af engu`);

  /* ============================================================
     1. LONGU FORMIN — ThAD ER ThAD SEM ORDABOKIN GERIR

     FYRSTA UTGAFA MIN PROFADI STUTTU FORMIN ("Brighton", "Man City",
     "Spurs") OG ThAER FULLYRDINGAR VORU TAUTOLOGIUR. FPL-svidid `name`
     ER stutta formid (maelt: BHA=Brighton, MCI=Man City, MUN=Man Utd,
     TOT=Spurs, LEE=Leeds, NEW=Newcastle, NFO=Nott'm Forest), svo thau
     leysast gegnum `t.name` hvort sem ordabokin er til eda TOM.
     Stokkbreyting sem TAEMDI samheitin STOD ThVI FULLYRDINGUNA — safnid
     var graent og maeldi ekkert (CLAUDE.md 5b).

     ThAD SEM ORDABOKIN LEGGUR TIL eru LONGU formin sem VEITURNAR senda
     og FPL a ekki: ESPN og bokmakarar segja "Brighton & Hove Albion",
     "Manchester City", "Tottenham Hotspur", "Nottingham Forest". An
     theirra vaeri hver einasti slikur leikur `unmatched`.
     ============================================================ */
  const longForms = [["Brighton & Hove Albion","BHA"],["Brighton and Hove Albion","BHA"],
    ["Manchester City","MCI"],["Manchester United","MUN"],["Tottenham Hotspur","TOT"],
    ["Nottingham Forest","NFO"],["Leeds United","LEE"],["Newcastle United","NEW"],
    ["AFC Bournemouth","BOU"],["Hull City","HUL"],["Ipswich Town","IPS"],
    ["Coventry City","COV"]];
  let checked = 0;
  for (const [name, want] of longForms) {
    if (!teams.some(t => t.short === want)) continue;   // nyliðar koma og fara
    checked++;
    ok(idx[CLUB_NORM(name)] === want,
       `LANGT form "${name}" -> ${want} (${idx[CLUB_NORM(name)]})`);
  }
  /* ThEKJA ER FULLYRDING: faelli deildin ut ur toflunni vaeri lykkjan tom. */
  ok(checked >= 8, `og thau voru raunverulega profud (${checked} af ${longForms.length})`);
  /* POSITIV FORSENDA fyrir ad thetta se ordabokin en ekki `t.name`:
     ekkert langt form ma vera JAFNT FPL-nafninu, annars vaeri kaflinn
     aftur ad maela `t.name`.                                          */
  const aliasOnly = longForms.filter(([n, w]) =>
    teams.some(t => t.short === w) &&
    !teams.some(t => t.short === w && CLUB_NORM(t.name) === CLUB_NORM(n)));
  /* MAELT: 8 af 12 longu formunum eru ORDABOKAR-EINGONGU; hin fjogur
     (Coventry City, Hull City, Ipswich Town, AFC Bournemouth) eru EINNIG
     FPL-nafnid — thau eru rettmaet en sanna ekkert um ordabokina.
     Fullyrdingin er thvi um ThAU SEM HUN EIN BER.                     */
  ok(aliasOnly.length >= 6,
     `${aliasOnly.length} af ${checked} longum formum leysast EINGONGU gegnum `
     + `ordabokina (ekki gegnum FPL-nafnid) — thau eru ekki tautologia`);
  for (const [n, w] of aliasOnly) {
    ok(idx[CLUB_NORM(n)] === w, `  ordabokar-eingongu: "${n}" -> ${w}`);
  }

  /* 2. `afc`/`fc`/`the`-STRIPPID GILDIR NU BADUM MEGIN. Thetta var
        MUNURINN a normolurunum tveimur og hann er hedan i fra einn.   */
  if (teams.some(t => t.short === "BOU")) {
    ok(CLUB_NORM("AFC Bournemouth") === CLUB_NORM("Bournemouth"),
       `"AFC Bournemouth" og "Bournemouth" normaliserast EINS (${CLUB_NORM("AFC Bournemouth")})`);
    ok(idx[CLUB_NORM("AFC Bournemouth")] === "BOU", "og bædi leysast a BOU");
  }

  /* 3. ENGIR AREKSTRAR — tvo felog mega ALDREI lenda a sama lykli.
        Vaeri svo vaeri sameiningin ad para menn a rangt lid, sem er
        verra en ad para thá ekki (CLAUDE.md 6: "thogul rong porun er
        verri en engin").                                              */
  const byKey = {};
  let collisions = 0;
  for (const t of teams) {
    for (const n of [t.name, t.short, ...(CLUB_ALIAS[t.short] || [])]) {
      const k = CLUB_NORM(n);
      if (byKey[k] && byKey[k] !== t.short) collisions++;
      byKey[k] = t.short;
    }
  }
  ok(collisions === 0, `engir arekstrar milli felaga (${collisions})`);

  /* 4. HVERT LID I DEILDINNI ER FINNANLEGT UNDIR FULLU NAFNI OG SKAMMSTOFUN. */
  const missing = teams.filter(t => idx[CLUB_NORM(t.name)] !== t.short
                                 || idx[CLUB_NORM(t.short)] !== t.short);
  ok(missing.length === 0,
     `oll ${teams.length} lid finnast undir fullu nafni OG skammstofun`
     + (missing.length ? ` — vantar: ${missing.map(t => t.short).join(", ")}` : ""));

  /* 5. NEIKVAED FULLYRDING MED SANNADA FORSENDU (5b regla 2): nafn sem er
        EKKI i deildinni ma ekki leysast. An #4 hér ad ofan gaeti thetta
        stadist einfaldlega af thvi ad kortid vaeri tomt.               */
  ok(idx[CLUB_NORM("Real Madrid")] === undefined, "utandeildar-nafn leysist EKKI");
  ok(idx[CLUB_NORM("")] === undefined, "tomur strengur leysist ekki");
}

console.log(`NIÐURSTAÐA: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
