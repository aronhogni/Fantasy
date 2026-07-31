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

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows[0];
  return rows.slice(1).filter(r => r.length > 3)
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

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
  if (!existsSync(e0Path)) { report.push(`${key}: E0 vantar — sleppt`); continue; }
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
    const pr = await fetch(`${RAW}/${dir}/players_raw.csv`, { headers: { "User-Agent": UA } });
    if (pr.ok) {
      for (const r of parseCsv(await pr.text())) {
        const id = +r.id, code = +r.code;
        if (Number.isFinite(id) && Number.isFinite(code)) codeOf.set(id, code);
      }
    } else report.push(`${key}: players_raw.csv HTTP ${pr.status} — engin code-vorpun`);
  }

  const res = await fetch(`${RAW}/${dir}/gws/merged_gw.csv`, { headers: { "User-Agent": UA } });
  if (!res.ok) { report.push(`${key}: merged_gw.csv HTTP ${res.status} — sleppt`); continue; }
  const rows = parseCsv(await res.text());

  const rowsOut = [];
  const slim = {};                       // code -> { t, p, gw: { round: [tolur] } }
  const unmatchedTeam = new Set();
  let noFixture = 0, kept = 0, noCode = 0;
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
      if (e._seen.has(fxKey)) continue;
      e._seen.add(fxKey);
      const v = e.gw[rd] || (e.gw[rd] = new Array(SLIM_STATS.length).fill(0));
      for (let i = 0; i < SLIM_STATS.length; i++) {
        const f = SLIM_STATS[i];
        const raw = r[SLIM_SRC[f] || f];
        if (raw == null || raw === "") continue;      // vantar -> 0 i summu
        v[i] += Math.round(num(raw) * (SLIM_SCALE[f] || 1));
      }
    }
    kept++;
  }
  out[key] = rowsOut;
  slimOut[key] = slim;
  const pos = {};
  for (const r of rowsOut) pos[r[3]] = (pos[r[3]] || 0) + 1;
  report.push(`${key}: ${kept} raðir (mín>0) · ${Object.entries(pos).map(([k, v]) => k + " " + v).join(" ")}` +
    `${unmatchedTeam.size ? ` · ÓPÖRUÐ LIÐ: ${[...unmatchedTeam].join(", ")}` : ""}` +
    `${noFixture ? ` · ${noFixture} raðir án leiks` : ""}`);
}

await writeFile("data/fpl_player_gw.json", JSON.stringify({
  updated: new Date().toISOString(),
  source: "vaastav/Fantasy-Premier-League — data/{season}/gws/merged_gw.csv",
  note: "Columnar. ALLAR radir (lika 0 minutur, fra 29.7.2026). Parad vid E0 a (dagsetning, lid).",
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
    note: "Lyklad a FPL `code` (fast yfir timabil). ADEINS samlagningarhaefar "
        + "tolur — verd, eignarhald og FPL-saeti eru arstidartolur og eru EKKI her. "
        + "Tvofold umferd er logd saman i somu umferd. Desimalar heiltolu-kvardadir, "
        + "sja `scale`.",
    stats: SLIM_STATS, scale: SLIM_SCALE,
    /* `_seen` er afmorkunar-hjalp og a ekki i skrana. */
    players: Object.fromEntries(Object.entries(slim)
      .map(([c, e]) => [c, { t: e.t, p: e.p, gw: e.gw }])),
  }));
}
console.log(report.join("\n"));
const total = Object.values(out).reduce((a, r) => a + r.length, 0);
console.log(`\nSkrifað data/fpl_player_gw.json — ${total} raðir, ${Object.keys(out).length} tímabil`);
