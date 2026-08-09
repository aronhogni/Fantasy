/* ============================================================
   SÖGULEGT CLUBELO — scripts/fetch-clubelo-history.mjs

   AF HVERJU: appið notar RAUNVERULEGT ClubElo (data/elo.json) sem inntak
   í FFDR (vog 0,15 fyrir MID/FWD). Bakprófin höfðu það ekki og notuðu
   NÁLGUN: eigin walk-forward Elo reiknað úr úrslitum (eloWalkForward í
   tests/lib/e0.mjs). Sú nálgun mældist VEIK:

     r(Elo-munur, markamunur) á 9.325 leikjum
       bókmakaralínan (afvigtuð 1X2)   0,471
       raunverulegt ClubElo            0,448
       okkar walk-forward nálgun       0,133   <- 3,4x lakari

   Þar með var elo-vogin í FFDR mæld MEÐ VONDU INNTAKI — sama tegund
   villu sem fannst 27.7. þegar sóknarhópurinn fékk varnar-markaðsstærð:
   rétt mæling á röngu inntaki gefur rétt svar við rangri spurningu.

   HEIMILD: xgabora/Club-Football-Match-Data-2000-2025 (GitHub-spegill sem
   safnar football-data.co.uk + ClubElo). Ein 42 MB CSV; hér er AÐEINS
   E0 og aðeins Elo-gildin dregin út (~9.400 leikir).

   LEKAPRÓF SEM VAR GERT ÁÐUR EN ÞETTA VAR TEKIÐ INN (og skiptir máli):
   1. Ógilt próf sem ég gerði fyrst: "spáir Elo leik t betur en t+1?"
      Það gaf +0,226 og ég hélt að það væri leki. ÞAÐ VAR ARTEFAKT —
      Elo-MUNUR er bundinn við mótherjann í leik t, svo hann spáir
      eðlilega verr um leik t+1 gegn ÖÐRUM mótherja. Ekki nota það próf.
   2. Gilt próf: seinka Elo um einn leik (nota gildi liðsins úr síðasta
      leik). Ef gildið innihéldi úrslit þessa leiks myndi óseinkaða
      útgáfan spá betur. Hún gerði það EKKI: 0,448 á móti 0,447.
   3. Gilt próf: ekkert pre-match má slá LOKALÍNU markaðarins. Markaðurinn
      0,471 > Elo 0,448, og hlutfylgni Elo við markamun EFTIR að
      markaðurinn er tekinn út er 0,007 — þ.e. markaðurinn gleypir Elo
      alveg. Þetta er nákvæmlega undirskrift HREINS fyrir-leik mælikvarða.

   Keyrt EINU SINNI; lokin tímabil breytast ekki.
   ============================================================ */
import { writeFile } from "node:fs/promises";

const URL_ = "https://raw.githubusercontent.com/xgabora/Club-Football-Match-Data-2000-2025/main/data/Matches.csv";
const UA = "Mozilla/5.0 (compatible; FPL-data-collector/1.0; +github-actions)";

/* Nafn xgabora -> nafn football-data.co.uk (okkar E0). Aðeins eitt víkur. */
const NAME = { "Nottm Forest": "Nott'm Forest" };

/* Tímabil úr dagsetningu. ÞRÖSKULDUR ER ÁGÚST, EKKI JÚLÍ: COVID ýtti
   2019/20 fram í 26. júlí 2020, og með júlí-þröskuldi lentu þeir leikir
   ranglega í 2020/21 (sem fékk þá 446 leiki og 2019/20 aðeins 314).    */
const seasonOf = d => {
  const y = +d.slice(0, 4), m = +d.slice(5, 7);
  const a = m >= 8 ? y : y - 1;
  return `${String(a % 100).padStart(2, "0")}${String((a + 1) % 100).padStart(2, "0")}`;
};

function parseCsv(text) {
  const lines = text.split("\n");
  const header = lines[0].replace(/\r$/, "").split(",");
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i].replace(/\r$/, "");
    if (!l) continue;
    const c = l.split(",");
    const o = {};
    for (let j = 0; j < header.length; j++) o[header[j]] = c[j];
    out.push(o);
  }
  return out;
}

console.log("Fetching 42 MB CSV …");
const text = await (await fetch(URL_, { headers: { "User-Agent": UA },
  signal: AbortSignal.timeout(20000) })).text();
const rows = parseCsv(text).filter(r => r.Division === "E0");
console.log(`E0 rows: ${rows.length}`);

const seasons = {};
let skipped = 0;
for (const r of rows) {
  const he = parseFloat(r.HomeElo), ae = parseFloat(r.AwayElo);
  if (!Number.isFinite(he) || !Number.isFinite(ae)) { skipped++; continue; }
  const s = seasonOf(r.MatchDate);
  const h = NAME[r.HomeTeam] || r.HomeTeam, a = NAME[r.AwayTeam] || r.AwayTeam;
  (seasons[s] ||= {})[`${h}|${a}`] = [Math.round(he * 10) / 10, Math.round(ae * 10) / 10];
}
const counts = Object.fromEntries(Object.entries(seasons)
  .map(([s, v]) => [s, Object.keys(v).length]).sort());
console.log("matches per season:", JSON.stringify(counts));
const total = Object.values(seasons).reduce((a, v) => a + Object.keys(v).length, 0);

await writeFile("data/clubelo_history.json", JSON.stringify({
  updated: new Date().toISOString(),
  source: "xgabora/Club-Football-Match-Data-2000-2025 (speglar football-data.co.uk + ClubElo)",
  note: "REAL pre-match ClubElo. Key: 'HomeTeam|AwayTeam' (E0 names) -> [homeElo, awayElo]. Leak test in scripts/fetch-clubelo-history.mjs.",
  seasons,
}));
console.log(`\nWrote data/clubelo_history.json — ${total} matches, ${Object.keys(seasons).length} seasons` +
  (skipped ? ` (${skipped} rows without Elo)` : ""));
