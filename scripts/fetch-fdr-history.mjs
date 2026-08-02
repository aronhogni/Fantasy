/* ============================================================
   SÖGULEGT FPL-FDR — scripts/fetch-fdr-history.mjs

   AF HVERJU: bakprófin gátu ekki notað RAUNVERULEGT FPL-FDR því FPL
   birtir aðeins yfirstandandi tímabil (bootstrap-static). Þau NÁLGUÐU
   það því með röðun stiga fyrra tímabils. Nálgun er nógu góð til að
   mæla FFDR, en ekki til að SVARA "hversu miklu betri er FFDR en
   opinbera FDR-ið?" — þá þarf opinbera talan að vera sú rétta.

   HEIMILD: vaastav/Fantasy-Premier-League á GitHub geymir afrit af
   FPL-API-inu per tímabil, þar á meðal fixtures.csv með
   team_h_difficulty / team_a_difficulty. Til frá 2018/19.

   NAFNAPÖRUN ÁN teams.csv: sú skrá vantar fyrir 2018/19, svo lið eru
   PÖRUÐ EFTIR ÚRSLITUM — leikur með sömu dagsetningu (±1 dagur, tímasvæði)
   og sömu tölu gefur atkvæði um FPL-id -> E0-nafn. Meirihlutakosning yfir
   380 leiki, og útkoman er STAÐFEST: pörunin verður að vera gagntæk á 20
   liðum og öll 380 úrslit verða að stemma eftir vörpun. Ef hvorugt heldur
   fellur tímabilið út í stað þess að skila hljóðlega rangri töflu.

   SKRIFAR data/fpl_fdr_history.json — lykill "HomeTeam|AwayTeam" er
   einkvæmur innan tímabils (hver viðureign er einu sinni á hverjum velli).
   Keyrt EINU SINNI; lokin tímabil breytast ekki.
   ============================================================ */
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const UA = "Mozilla/5.0 (compatible; FPL-data-collector/1.0; +github-actions)";
const RAW = "https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data";
/* E0-lykill -> mappa í vaastav-safninu */
const SEASONS = {
  "1819": "2018-19", "1920": "2019-20", "2021": "2020-21", "2122": "2021-22",
  "2223": "2022-23", "2324": "2023-24", "2425": "2024-25", "2526": "2025-26",
};

/* CSV með gæsalöppuðum svæðum (stats-kolónan inniheldur kommur) */
function parseCsvQuoted(text) {
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
  return rows.slice(1).filter(r => r.length > 1)
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const dayOf = iso => iso.slice(0, 10);
const shift = (iso, d) => {
  const t = new Date(iso.slice(0, 10) + "T12:00:00Z");
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
};
/* E0-dagsetning er DD/MM/YY eða DD/MM/YYYY */
const e0Day = s => {
  const [d, m, y] = s.split("/");
  return `${y.length === 2 ? "20" + y : y}-${m}-${d}`;
};

const out = {}, report = [];
for (const [key, dir] of Object.entries(SEASONS)) {
  const e0Path = `data/fdcouk/E0-${key}.json`;
  if (!existsSync(e0Path)) { report.push(`${key}: E0 vantar — sleppt`); continue; }
  const e0 = JSON.parse(await readFile(e0Path, "utf8")).rows
    .filter(r => r.HomeTeam && r.FTHG !== "" && r.FTHG != null);

  const res = await fetch(`${RAW}/${dir}/fixtures.csv`,
    { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) { report.push(`${key}: fixtures.csv HTTP ${res.status} — sleppt`); continue; }
  const fx = parseCsvQuoted(await res.text())
    .filter(f => f.kickoff_time && f.team_h_score !== "" && f.team_h_difficulty);

  /* --- 1. ATKVÆÐI: id -> E0-nafn, út frá dagsetningu + úrslitum --- */
  const votes = {};                       // id -> { nafn: fjöldi }
  const bump = (id, name) => {
    (votes[id] = votes[id] || {})[name] = (votes[id][name] || 0) + 1;
  };
  for (const f of fx) {
    const days = [dayOf(f.kickoff_time), shift(f.kickoff_time, -1), shift(f.kickoff_time, 1)];
    const hits = e0.filter(e => days.includes(e0Day(e.Date)) &&
      +e.FTHG === +f.team_h_score && +e.FTAG === +f.team_a_score);
    if (hits.length === 1) { bump(f.team_h, hits[0].HomeTeam); bump(f.team_a, hits[0].AwayTeam); }
  }
  const map = {};
  for (const [id, tally] of Object.entries(votes)) {
    map[id] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
  }

  /* --- 2. STAÐFESTING: gagntæk á 20 liðum og öll úrslit stemma --- */
  const names = new Set(Object.values(map));
  if (Object.keys(map).length !== 20 || names.size !== 20) {
    report.push(`${key}: pörun ekki gagntæk (${Object.keys(map).length} id, ${names.size} nöfn) — SLEPPT`);
    continue;
  }
  const byPair = new Map(e0.map(e => [`${e.HomeTeam}|${e.AwayTeam}`, e]));
  let ok = 0, bad = 0;
  const season = {};
  for (const f of fx) {
    const k = `${map[f.team_h]}|${map[f.team_a]}`;
    const e = byPair.get(k);
    if (!e || +e.FTHG !== +f.team_h_score || +e.FTAG !== +f.team_a_score) { bad++; continue; }
    season[k] = [+f.team_h_difficulty, +f.team_a_difficulty];
    ok++;
  }
  if (bad > 0 || ok !== e0.length) {
    report.push(`${key}: ${ok} stemma, ${bad} stemma EKKI af ${e0.length} — SLEPPT`);
    continue;
  }
  out[key] = season;
  const vals = Object.values(season).flat();
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const hist = {};
  for (const v of vals) hist[v] = (hist[v] || 0) + 1;
  report.push(`${key}: ${ok}/${e0.length} leikir · FDR-meðaltal ${mean.toFixed(3)} · ` +
    Object.keys(hist).sort().map(k => `${k}:${(100 * hist[k] / vals.length).toFixed(0)}%`).join(" "));
}

await writeFile("data/fpl_fdr_history.json", JSON.stringify({
  updated: new Date().toISOString(),
  source: "vaastav/Fantasy-Premier-League (afrit af FPL-API), fixtures.csv",
  note: "RAUNVERULEGT FPL-FDR per leik. Lykill: 'HomeTeam|AwayTeam' (E0-nofn) -> [team_h_difficulty, team_a_difficulty]. Parad eftir dagsetningu+urslitum og stadfest gagntaekt.",
  seasons: out,
}));
console.log(report.join("\n"));
console.log(`\nSkrifað data/fpl_fdr_history.json — ${Object.keys(out).length} tímabil`);
