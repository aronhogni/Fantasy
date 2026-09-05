/* ============================================================
   !! ThESSI SKRA KEYRIR VID INNFLUTNING — HUN HEFUR ENGA `main()`
   ============================================================
   Bolurinn er a EFSTA STIGI, svo `await import("./fetch-player-gw.mjs")`
   SAEKIR AF NETINU og SKRIFAR i `data/` — hun ljuger engu, hun bara gerir
   thad strax. Eg gekk sjalfur i thetta 25.8.2026 vid ad sannreyna
   innflutning eftir ad `parseCsv` var flutt i `scripts/csv.mjs`: eitt
   `import()` endurskrifadi SEX gagnaskrar (`fpl_player_gw.json` og fimm
   `player_gw_*.json`).

   ENGIN GOGN TOPUDUST og thad er MAELT, ekki vonad: `seasons` og `header`
   voru BYTE-EINS eftir a — adeins `updated` (timastimpill) og `note`
   breyttust. Sem aukaverkun er thad besta stadfestingin sem til er a thvi
   ad flutningur `parseCsv` i sameiginlegu skrana se HEGDUNAR-HLUTLAUS:
   139.039 rodir gegnum nyja thattarann gafu sama JSON og gamli.

   GILDRAN ER SAMT RAUNVERULEG OG HUN ER SNUIN: CLAUDE.md kafli 2 §4
   RADLEGGUR `await import()` a skra til ad sannreyna nafna-leysingu eftir
   flutning (thvi esbuild leysir ekki nofn). Su radlegging er RETT — og
   her kostar hun netkoll og skrif. `scripts/fetch.mjs` var lagfaerd
   vegna nakvaemlega thessa (kafli 7: `if (invokedDirectly) main()`).

   ThESSI SKRA ER EKKI LAGFAERD EINS OG STENDUR, thvi hun er HANDVIRK og
   keyrd einu sinni per timabil (kafli 7, taflan). Se hun einhvern tima
   flutt i pipeline-una — eda se skrifad prof sem flytur hana inn —
   VERDUR hun ad fa somu vord. Thangad til: EKKI `import()` hana. Notadu
   `node scripts/fetch-player-gw.mjs` viljandi, eda lestu `csv.mjs` beint.
   ============================================================ */
/* ============================================================
   PER-UMFERÐAR LEIKMANNAGÖGN — scripts/fetch-player-gw.mjs

   AF HVERJU: allar FFDR-mælingar hingað til hafa notað LIÐ-útkomur
   (mörk á sig, hreint blað, mörk skoruð). En FFDR er til til að spá
   STIGUM LEIKMANNS. Það hafði aldrei verið mælt, því FPL birtir ekki
   sögulegar per-umferðar tölur — þær eru í afriti vaastav/Fantasy-
   Premier-League (`data/{tímabil}/gws/merged_gw.csv`).

   Þetta opnar þrennt sem var ómögulegt:
     1. FFDR gegn RAUNVERULEGUM stigum per stöðu (rétta markmiðið).
     2. Varnarsinnaðir miðjumenn (Rice, Caicedo): fá þeir réttari
        leikjaþyngd úr VARNAR-formúlunni en sóknar-formúlunni?
     3. Leikmanna-trend: er mark í leik N vísbending um mark í N+1?

   SNIÐ: columnar (header + fylki af fylkjum) svo skráin sé lítil —
   hlutasnið með 20 lyklum per röð væri margfalt stærra. Aðeins raðir
   með mínútum > 0 eru geymdar; hinar segja ekkert um leikjaþyngd.

   PÖRUN VIÐ E0: leikmannaröð veit dagsetningu + liðsnafn. Lið spilar
   í mesta lagi einn leik á dag, svo (dagsetning, lið) er einkvæmt og
   við þurfum ENGA mótherja-id-vörpun. Liðsnöfn eru normalíseruð yfir
   í E0-nöfn og ÓPÖRUÐ NÖFN ERU TALIN OG PRENTUÐ — ef sú tala er há
   hefur nafnaform breyst og mælingin er ekki traust.
   ============================================================ */
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { rowsToObjects } from "./csv.mjs";

const UA = "Mozilla/5.0 (compatible; FPL-data-collector/1.0; +github-actions)";
const RAW = "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data";
const SEASONS = { "2122": "2021-22", "2223": "2022-23", "2324": "2023-24",
                  "2425": "2024-25", "2526": "2025-26" };

/* FPL-liðsnafn -> E0-liðsnafn. Aðeins þau sem ERU ólík; hin fara óbreytt. */
const TEAM_MAP = {
  "Man City": "Man City", "Manchester City": "Man City",
  "Man Utd": "Man United", "Manchester Utd": "Man United", "Man United": "Man United",
  "Spurs": "Tottenham", "Tottenham": "Tottenham",
  "Nott'm Forest": "Nott'm Forest", "Nottingham Forest": "Nott'm Forest",
  "Sheffield Utd": "Sheffield United", "Sheffield United": "Sheffield United",
  "Newcastle": "Newcastle", "Wolves": "Wolves", "Leicester": "Leicester",
  "Leeds": "Leeds", "Luton": "Luton", "Ipswich": "Ipswich", "Southampton": "Southampton",
  "Brighton": "Brighton", "Bournemouth": "Bournemouth", "West Ham": "West Ham",
  "Sunderland": "Sunderland", "Burnley": "Burnley",
};

/* ThATTUNIN BYR I `scripts/csv.mjs` (25.8.2026) — hun var afrituð i
   ThREMUR skram. Kjarninn var SANNADUR jafngildur a sjo inntokum adur en
   hann var sameinadur (gaesalappa-svid MED kommu, tvofaldar gaesalappir,
   CRLF, engin lokalina, tom svid, linubrot innan gaesalappa).
   SIAN FYLGIR HER EFTIR SEM ADUR: vaastav-CSV eru breid (20+ dalkar) og
   rod med 1-3 svidum er RUSL. Sian er ThEKKING A ThESSU gagnasetti og var
   ekki su sama i hinum afritunum — thess vegna er hun breyta.        */
const parseCsv = text => rowsToObjects(text, { minFields: 4 });
/* Sömu 20 tölur fyrir hverja röð — sjá HEADER. */
/* `dc` (defensive_contribution) og `cbit` eru AÐEINS til frá 2025/26 —
   DefCon er ný stigagjöf. Eldri tímabil fá null, EKKI 0: núll myndi lesast
   sem "hann vann engar varnaraðgerðir" í stað "talan var ekki til".     */
/* `dc`/`cbit`/`recov`/`tackles` eru AÐEINS til frá 2025/26 (DefCon er ný
   stigagjöf) -> null, EKKI 0, fyrir eldri tímabil.
   `xP` er FPL-EIGIÐ VÆNT STIG þeirrar umferðar — sögulega jafngildi
   `ep_next` sem appið notar sem grunn. Það er til í ÖLLUM tímabilum og
   gerir kleift að mæla RAUNVERULEGA aðferð appsins, ekki staðgengil.  */
const HEADER = ["round", "date", "team", "pos", "home", "mins", "starts", "pts",
  "goals", "assists", "cs", "gc", "saves", "bonus", "bps", "xg", "xa", "xgc",
  "value", "name", "dc", "cbit",
  "xP", "ict", "infl", "creat", "threat", "sel", "tIn", "tOut",
  "yc", "rc", "pMiss", "pSave", "recov", "tack"];
const num = v => { const n = +v; return Number.isFinite(n) ? n : 0; };

/* ---- THJAPPADA SNIDID: samlagningarhaefar tolur eingongu ----
   Maelt 31.7.: oll 5 timabil i thessu sniði eru 7,3 MB (0,87 MB gzip) og
   EITT timabil 1,6 MB (0,21 MB gzip). Upprunalega fpl_player_gw.json er
   19 MB og thvi onothaef i vafra — thess vegna er hun EKKI notud i appinu
   og thessi skrifud per timabil, letihladin.                           */
const SLIM_STATS = ["mins","starts","pts","goals","assists","cs","gc","saves",
  "bonus","bps","xg","xa","xgc","dc","cbit","threat","creat","infl",
  "recov","tack","yc","rc"];
const SLIM_SRC = { mins:"minutes", pts:"total_points", goals:"goals_scored",
  cs:"clean_sheets", gc:"goals_conceded", xg:"expected_goals",
  xa:"expected_assists", xgc:"expected_goals_conceded",
  dc:"defensive_contribution", cbit:"clearances_blocks_interceptions",
  creat:"creativity", infl:"influence", recov:"recoveries", tack:"tackles",
  yc:"yellow_cards", rc:"red_cards" };
const SLIM_SCALE = { xg:100, xa:100, xgc:100, creat:10, infl:10, threat:1 };

const out = {}, slimOut = {}, report = [];
for (const [key, dir] of Object.entries(SEASONS)) {
  const e0Path = `data/fdcouk/E0-${key}.json`;
  if (!existsSync(e0Path)) { report.push(`${key}: E0 missing — skipped`); continue; }
  const e0 = JSON.parse(await readFile(e0Path, "utf8")).rows
    .filter(r => r.HomeTeam && r.FTHG !== "" && r.FTHG != null);
  const e0Names = new Set(e0.flatMap(r => [r.HomeTeam, r.AwayTeam]));
  /* (dagsetning, lið) -> leikur. Lið spilar aldrei tvo leiki sama dag. */
  const e0Day = s => { const [d, m, y] = s.split("/"); return `${y.length === 2 ? "20" + y : y}-${m}-${d}`; };
  const byDayTeam = new Map();
  for (const r of e0) {
    byDayTeam.set(`${e0Day(r.Date)}|${r.HomeTeam}`, r);
    byDayTeam.set(`${e0Day(r.Date)}|${r.AwayTeam}`, r);
  }

  /* element -> CODE. `element` er FPL-id INNAN timabils og FPL endurnytir
     id milli timabila; `code` er FAST yfir oll timabil og er thad sem
     players.json ber. Nafna-porun yfir fimm timabil vaeri brothaett
     (samsett eftirnofn, broddstafir, tvinefni) — code er nakvaemt.       */
  const codeOf = new Map();
  {
    const pr = await fetch(`${RAW}/${dir}/players_raw.csv`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    if (pr.ok) {
      for (const r of parseCsv(await pr.text())) {
        const id = +r.id, code = +r.code;
        if (Number.isFinite(id) && Number.isFinite(code)) codeOf.set(id, code);
      }
    } else report.push(`${key}: players_raw.csv HTTP ${pr.status} — no code mapping`);
  }

  const res = await fetch(`${RAW}/${dir}/gws/merged_gw.csv`,
    { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) { report.push(`${key}: merged_gw.csv HTTP ${res.status} — skipped`); continue; }
  const rows = parseCsv(await res.text());

  const rowsOut = [];
  const slim = {};                       // code -> { t, p, gw: { round: [tolur] } }
  /* ============================================================
     SVID SEM ER EKKI TIL ALLT TIMABILID VERDUR AD VERA `null`
     (4.9.2026)
     ============================================================
     `fill(0)` og „vantar -> 0 i summu" eru RETT fyrir staka rod sem
     vantar gildi i timabili thar sem svidid ER til: madur sem gerdi
     enga stodsendingu leggur 0 til summunnar.
     ThAU ERU RONG ThEGAR SVIDID ER EKKI TIL YFIR HOFUD. `dc`, `cbit`,
     `recov` og `tack` eru ekki i FPL-gognum 2019-20 til 2024-25 (FPL
     bar thau 2016-19, felldi thau ut og tok thau upp aftur 2025-26 —
     staðfest a vaastav-speglinum), svo ALLAR radir theirra timabila
     baru 0. Thad er nakvaemlega gildran sem CLAUDE.md kafli 8 skjalar:
     *„dc var geymt sem 0, ekki null -> hver leikmadur hefdi fengid
     hittni 0,000"*. Hun er meinlaus i dag ADEINS af thvi ad
     `defcon_history` gatar a timabils-lista — thad er hlif, ekki
     lagfaering, og hun fellur um leid og einhver les skrana beint.

     REGLAN ER LEIDD, EKKI HANDSKRIFUD: svid sem BAR ALDREI GILDI i
     thessu timabili er sett i `null` i ollum rodum. Enginn
     timabils-listi, engin nofn — sama form og `gwBlindKeys` og
     `liveOnlyRawFields` (kafli 8), thvi handskrifadur listi staðnar.
     ============================================================ */
  const seenStat = new Array(SLIM_STATS.length).fill(false);
  /* Svid a HRASKRANNI sem FPL hefur baett vid eda fellt ut i tímans rás.
     Listinn er ekki tæmandi yfir skrána — hann nefnir thau svid thar sem
     0 og „ekki til" eru raunverulega olik, og hann er STADFESTUR i
     `defcon-shrink.mjs` kafla 7b, svo ny svid i sömu stodu komi fram. */
  const WIDE_WATCH = ["starts", "expected_goals", "expected_assists",
                      "expected_goals_conceded", "xP"];
  const seenWide = {}, firstRound = {};
  const unmatchedTeam = new Set();
  let noFixture = 0, kept = 0, noCode = 0, dupSkipped = 0;
  for (const r of rows) {
    /* 0-MÍNÚTU RAÐIR ERU NÚ MEÐ (29.7.2026). Þær voru sleppt áður og það
       var afmörkun sem skipti máli: "spilar hann?" er STÆRSTA einstaka
       tellið um stig (mins5 vann mikilvægis-mælinguna), en það var ekki
       mælanlegt því raðir án mínútna vantaði. Tillögu-vélin raðar ÖLLUM
       leikmönnum, líka þeim sem spila ekki, svo þetta er raunverulega
       verkefnið. ATH: að hafa þær með LÆKKAR topp-15 töluna (fleiri vondir
       kandídatar í lauginni) — það er ekki afturför heldur raunsærri laug. */
    if (num(r.minutes) < 0) continue;
    const raw = (r.team || "").trim();
    const team = TEAM_MAP[raw] || raw;
    if (!e0Names.has(team)) { unmatchedTeam.add(raw); continue; }
    const day = (r.kickoff_time || "").slice(0, 10);
    /* Leikur getur fallið á næsta dag milli tímasvæða — reynum ±1. */
    const shift = d => { const t = new Date(day + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); };
    const fx = byDayTeam.get(`${day}|${team}`) || byDayTeam.get(`${shift(-1)}|${team}`) || byDayTeam.get(`${shift(1)}|${team}`);
    if (!fx) { noFixture++; continue; }
    const home = fx.HomeTeam === team;
    /* SOMU REGLU BEITT A HRASKRANA — sja `seenStat` og athugasemdina
       vid slim-rodina. `num()` breytir vantandi gildi i 0, sem er RETT
       fyrir staka rod en RANGT thegar svidid er ekki til allt timabilid.
       MAELT: `starts` var 0 i OLLUM 10.485 leiknum rodum 2021/22 og i
       52,7% rada 2022/23 (dalkurinn kom inn a midju timabili), svo
       `startRate` i `panel2.mjs` var **fast 0 fyrir heilt timabil** og
       oll afbrigdi sem lasu hann voru maeld a menguðum gognum.
       Sami galli og i slim-skranum, bara a hinni leidinni.            */
    for (const f of WIDE_WATCH) {
      const raw = r[f];
      if (raw != null && raw !== "" && +raw !== 0) {
        seenWide[f] = true;
        const rd = num(r.round);
        if (firstRound[f] == null || rd < firstRound[f]) firstRound[f] = rd;
      }
    }
    rowsOut.push([
      num(r.round), fx.Date, team, r.position || "", home ? 1 : 0,
      num(r.minutes), num(r.starts), num(r.total_points),
      num(r.goals_scored), num(r.assists), num(r.clean_sheets), num(r.goals_conceded),
      num(r.saves), num(r.bonus), num(r.bps),
      +num(r.expected_goals).toFixed(2), +num(r.expected_assists).toFixed(2),
      +num(r.expected_goals_conceded).toFixed(2),
      num(r.value), r.name || "",
      r.defensive_contribution == null || r.defensive_contribution === "" ? null : num(r.defensive_contribution),
      r.clearances_blocks_interceptions == null || r.clearances_blocks_interceptions === "" ? null : num(r.clearances_blocks_interceptions),
      +num(r.xP).toFixed(2), +num(r.ict_index).toFixed(1), +num(r.influence).toFixed(1),
      +num(r.creativity).toFixed(1), +num(r.threat).toFixed(1),
      num(r.selected), num(r.transfers_in), num(r.transfers_out),
      num(r.yellow_cards), num(r.red_cards), num(r.penalties_missed), num(r.penalties_saved),
      r.recoveries == null || r.recoveries === "" ? null : num(r.recoveries),
      r.tackles == null || r.tackles === "" ? null : num(r.tackles),
    ]);
    /* ---- THJAPPADA SNIDID (fyrir umferdar-bil i appinu) ----
       ADEINS SAMLAGNINGARHAEFAR TOLUR. Verd, eignarhald, FPL-saeti og
       value_season eru ARSTIDARTOLUR — thaer ma EKKI leggja saman yfir
       bil og eru thvi ekki her. Tvofold umferd LEGGST SAMAN i somu
       umferd (spurningin er um UMFERD, ekki stakan leik) — sama regla
       sem gildir i byrjunar-likunum (kafli 6h).
       DESIMALAR ERU HEILTOLU-KVARDADIR (xg*100 o.s.frv.) svo skrain se
       lítil; `scale` i skranni segir hvernig lesa skal.                 */
    kept++;                       // radir i HRASKRANNI (afmorkun gildir adeins um slim)
    const code = codeOf.get(num(r.element));
    if (!code) noCode++;
    else {
      const e = slim[code] || (slim[code] = { t: team, p: r.position || "", gw: {}, _seen: new Set() });
      e.t = team; e.p = r.position || e.p;
      const rd = num(r.round);
      /* AFMORKUN A (code, umferd, DAGSETNING) — MAELT NAUDSYNLEG.
         FPL a stundum TVO `element` fyrir sama mann (nytt skrasetningar-
         numer a midju timabili) og badir varpast a sama `code`. Tha koma
         TVAER EINS radir i somu umferd og summan tviteldi: Junior Kroupi
         fekk 1826 minutur i stad 1663 (umferdir 1-9 tvitaldar).
         DAGSETNINGIN er rétta skilyrdid, EKKI umferdin ein: i umferd 33
         hafdi hann tvo raunverulega leiki (18/04 og 22/04) — tvofold
         umferd — og THEIR eiga BADIR ad teljast. Ad afmarka a umferd
         eingongu hefdi thagt yfir tvofaldar umferdir hja ollum.          */
      const fxKey = `${rd}|${fx.Date}`;
      if (e._seen.has(fxKey)) { dupSkipped++; continue; }
      e._seen.add(fxKey);
      const v = e.gw[rd] || (e.gw[rd] = new Array(SLIM_STATS.length).fill(0));
      for (let i = 0; i < SLIM_STATS.length; i++) {
        const f = SLIM_STATS[i];
        const raw = r[SLIM_SRC[f] || f];
        if (raw == null || raw === "") continue;      // vantar -> 0 i summu
        seenStat[i] = true;                            // svidid ER til thetta timabil
        v[i] += Math.round(num(raw) * (SLIM_SCALE[f] || 1));
      }
    }
  }
  /* NULLA UT SVID SEM BAR ALDREI GILDI ThETTA TIMABIL — sja ad ofan. */
  const WIDE_IDX = { starts: 6, expected_goals: 15, expected_assists: 16,
                     expected_goals_conceded: 17, xP: 22 };
  const absentWide = WIDE_WATCH.filter(f => !seenWide[f]);
  for (const f of absentWide) for (const row of rowsOut) row[WIDE_IDX[f]] = null;
  /* ============================================================
     OG SUM SVID KOMU INN A MIDJU TIMABILI (4.9.2026)
     ============================================================
     „Ekki til allt timabilid" var of grof regla. MAELT: `starts` birtist
     fyrst i UMFERD 16 i 2022/23 — umferdir 1-15 bera 0 i ollum ~4.000
     leiknum rodum, sem er dalkur sem var ekki til, ekki 4.000 menn sem
     komu af bekknum. (FPL baetti honum vid um HM-hleid.)
     Reglan er thvi PER UMFERD og hun er LEIDD: fyrsta umferd med
     gildi > 0 markar upphafid; allt a undan verdur `null`.
     FORSENDAN SEM ThETTA HVILIR A ER SOGD: hver umferd hefur ~220
     byrjunarlidsmenn og fjolda leikmanna med xG > 0, svo umferd thar sem
     ENGIN rod ber gildi getur ekki verid raunveruleg nulltala. Su
     forsenda gildir um ThESSI svid og er astaedan fyrir thvi ad listinn
     er stuttur og handvalinn en ekki „oll svid".
     ============================================================ */
  const lateWide = [];
  for (const f of WIDE_WATCH) {
    const from = firstRound[f];
    if (from == null || from <= 1) continue;
    let n = 0;
    for (const row of rowsOut) if (num(row[0]) < from) { row[WIDE_IDX[f]] = null; n++; }
    lateWide.push(`${f} from GW${from} (${n} earlier rows nulled)`);
  }
  const absent = SLIM_STATS.map((f, i) => (seenStat[i] ? null : i)).filter(i => i != null);
  if (absent.length) {
    for (const e of Object.values(slim))
      for (const row of Object.values(e.gw)) for (const i of absent) row[i] = null;
  }
  out[key] = rowsOut;
  slimOut[key] = slim;
  const pos = {};
  for (const r of rowsOut) pos[r[3]] = (pos[r[3]] || 0) + 1;
  report.push(`${key}: ${kept} rows (min>0) · ${Object.entries(pos).map(([k, v]) => k + " " + v).join(" ")}` +
    `${absent.length ? ` · SLIM ABSENT (null, not 0): ${absent.map(i => SLIM_STATS[i]).join(", ")}` : ""}` +
    `${absentWide.length ? ` · WIDE ABSENT (null, not 0): ${absentWide.join(", ")}` : ""}` +
    `${lateWide.length ? ` · WIDE ARRIVED MID-SEASON: ${lateWide.join("; ")}` : ""}` +
    `${unmatchedTeam.size ? ` · ÓPÖRUÐ LIÐ: ${[...unmatchedTeam].join(", ")}` : ""}` +
    `${noFixture ? ` · ${noFixture} rows without a match` : ""}` +
    `${noCode ? ` · ${noCode} without a code` : ""}` +
    `${dupSkipped ? ` · ${dupSkipped} DUPLICATES (same code+gameweek+date)` : ""}`);
}

/* SAMA REGLA: 5,5 MB af per-umferdar sogu ma ekki hverfa thott ein
   keyrsla finni ekkert (rong moppa, vaastav nidri).                      */
if (!Object.keys(out).length) {
  console.error("0 seasons collected — WRITING NOTHING.");
  process.exit(2);
}
await writeFile("data/fpl_player_gw.json", JSON.stringify({
  updated: new Date().toISOString(),
  source: "vaastav/Fantasy-Premier-League — data/{season}/gws/merged_gw.csv",
  note: "Columnar. ALL rows (including 0 minutes, since 29.7.2026). Paired with E0 on (date, club).",
  header: HEADER, seasons: out,
}));
/* Ein skra PER TIMABIL: appid hledur adeins thad timabil sem er valid.
   Oll fimm i einni skra vaeri 7,3 MB ad thatta thott gzip se 0,87 MB —
   thattingin er kostnadurinn, ekki nidurhalid.                          */
for (const [key, slim] of Object.entries(slimOut)) {
  const label = SEASONS[key].replace("-", "/").replace(/^(\d{4})\/(\d{2})$/, "$1/$2");
  await writeFile(`data/player_gw_${key}.json`, JSON.stringify({
    updated: new Date().toISOString(),
    season: key, label,
    source: "vaastav/Fantasy-Premier-League — merged_gw.csv + players_raw.csv (code)",
    note: "Keyed on FPL `code` (fixed across seasons). ONLY additive "
        + "figures — price, ownership and FPL rank are season-level and are NOT here. "
        + "A double gameweek is summed into the same gameweek. Decimals are integer-scaled, "
        + "see `scale`.",
    stats: SLIM_STATS, scale: SLIM_SCALE,
    /* `_seen` er afmorkunar-hjalp og a ekki i skrana. */
    players: Object.fromEntries(Object.entries(slim)
      .map(([c, e]) => [c, { t: e.t, p: e.p, gw: e.gw }])),
  }));
}
console.log(report.join("\n"));
const total = Object.values(out).reduce((a, r) => a + r.length, 0);
console.log(`\nWrote data/fpl_player_gw.json — ${total} rows, ${Object.keys(out).length} seasons`);
