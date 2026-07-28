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
const HEADER = ["round", "date", "team", "pos", "home", "mins", "starts", "pts",
  "goals", "assists", "cs", "gc", "saves", "bonus", "bps", "xg", "xa", "xgc",
  "value", "name", "dc", "cbit"];
const num = v => { const n = +v; return Number.isFinite(n) ? n : 0; };

const out = {}, report = [];
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

  const res = await fetch(`${RAW}/${dir}/gws/merged_gw.csv`, { headers: { "User-Agent": UA } });
  if (!res.ok) { report.push(`${key}: merged_gw.csv HTTP ${res.status} — sleppt`); continue; }
  const rows = parseCsv(await res.text());

  const rowsOut = [];
  const unmatchedTeam = new Set();
  let noFixture = 0, kept = 0;
  for (const r of rows) {
    if (num(r.minutes) <= 0) continue;                 // ekkert að læra af 0 mín
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
    ]);
    kept++;
  }
  out[key] = rowsOut;
  const pos = {};
  for (const r of rowsOut) pos[r[3]] = (pos[r[3]] || 0) + 1;
  report.push(`${key}: ${kept} raðir (mín>0) · ${Object.entries(pos).map(([k, v]) => k + " " + v).join(" ")}` +
    `${unmatchedTeam.size ? ` · ÓPÖRUÐ LIÐ: ${[...unmatchedTeam].join(", ")}` : ""}` +
    `${noFixture ? ` · ${noFixture} raðir án leiks` : ""}`);
}

await writeFile("data/fpl_player_gw.json", JSON.stringify({
  updated: new Date().toISOString(),
  source: "vaastav/Fantasy-Premier-League — data/{season}/gws/merged_gw.csv",
  note: "Columnar. Adeins radir med minutum > 0. Parad vid E0 a (dagsetning, lid).",
  header: HEADER, seasons: out,
}));
console.log(report.join("\n"));
const total = Object.values(out).reduce((a, r) => a + r.length, 0);
console.log(`\nSkrifað data/fpl_player_gw.json — ${total} raðir, ${Object.keys(out).length} tímabil`);
