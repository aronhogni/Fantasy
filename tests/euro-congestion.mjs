/* ============================================================
   EKKI I `npm test` — A-EFTIRSPURN MAELING (krefst nets)

   Hun saekir ~65 skrar af GitHub og API-kvotinn an audkenningar er 60 koll
   a klst. Vid endurteknar keyrslur kom HTTP 403 og safnid FELL — ekki thvi
   maelingin vaeri rong heldur thvi kvotinn var tomur. Oll onnur profasofn
   lesa COMMITTUD `data/`-skrar og eru thvi stodug; thetta er RANNSOKN, ekki
   vordur, og var thvi tekid ur keyraranum. Sama medferd sem greiningarnar i
   kafla 6c/6d (keyrdar einu sinni, nidurstadan skjolud).

   KEYRSLA:
     node --import "data:text/javascript,import{register}from\"node:module\";\
       register(\"./tests/jsx-loader.mjs\",\"file://$(pwd)/\")" \
       tests/euro-congestion.mjs

   NIDURSTADA 31.7.2026 (2025/26, eina timabilid med By-Tournament gognum):
     2.154 Evropu-byrjanir · 941 poruð (77%) · 188 leikmenn i badum hopum
     hratt   : 45,0% byrja EPL eftir Evropu-start, 46,4% annars
     INNAN LEIKMANNS: -1,37pp · t = -0,82 · 95% CI [-4,67pp, +1,92pp]
   NULL ER INNAN CI => P7.4 VERDUR EKKI BYGGT.
   Samhljoda hvildar-maelingunni i 6h (-0,3pp) — nu maelt a RETTA inntakinu
   (Evropuleikjunum sjalfum, ekki hvild milli EPL-leikja).

   P7.4 — "START I EVROPU/BIKAR => OLIKLEGRI I NAESTA EPL-START"?

   Handoff №1 (kafli P7.4) leggur til ad merkja leikmenn FEITLETRADA sem
   byrjudu i Evropu/bikar, thvi their seu ólíklegri i naesta EPL-start.
   Adur en thad er BYRT tharf ad MAELA thad — ad birta omælt merki er thad
   sem thetta repo a ad forðast (sbr. "Vaent stig" og verdspa i kafla 3).

   TENGSL VID EIDRI MAELINGU: kafli 6h maeldi "<4 daga hvild" og fann
   ENGIN ahrif (27,0% a moti 27,3%, n=10.448). Thad er EKKI sama maeling:
   thar var hvildin milli TVEGGJA EPL-LEIKJA, svo midvikudags-leikur i
   Evropu kom aldrei fram i tolunni. Thess vegna er thetta maelt sér.

   HEIMILD: olbauday/FPL-Core-Insights, data/2025-2026/By Tournament/
     {Champions,Europa,Conference} League + EFL Cup / GW{n}/
       fixtures.csv  -> `gameweek` (FPL-umferdin sem leikurinn tilheyrir)
       lineups.csv   -> `is_starting`, `player_name`, `team_side`, `match_id`
   `player_id` og `team_code` eru TOM i skranni, svo lidid er leitt ut ur
   `match_id` ("25-26-champions-league-arsenal-vs-slavia-prague") + team_side
   og porun vid FPL er nafna-skorun MED LIDI — sama adferd sem
   matchShotsToPlayers (99% i kafla 6b).

   INNAN-LEIKMANNS SAMANBURDUR ER SKILYRDI, EKKI SKRAUT:
   hrar tolur maela ad EVROPULID eiga fastamenn — sa sem spilar i Evropu er
   ad meðaltali BYRJUNARLIDSMADUR i sterku lidi og byrjar OFTAR i EPL. Thad
   er andstæð átt vid tilgátuna. Thess vegna er hver leikmadur borinn saman
   vid SITT EIGID grunn-hlutfall, eins og i kafla 6c.
   ============================================================ */
import { readFileSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const UA = "Mozilla/5.0 (compatible; FPL-data-collector/1.0)";
const GH = "https://raw.githubusercontent.com/olbauday/FPL-Core-Insights/main/data/2025-2026/By%20Tournament";
const API = "https://api.github.com/repos/olbauday/FPL-Core-Insights/contents/data/2025-2026/By%20Tournament";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => {
  if (typeof n !== "string") throw new Error("ok(): heiti verdur ad vera strengur");
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${x ? "   " + x : ""}`); }
};

/* --- CSV med gaesalappum (sama gildra sem i fetch.mjs) --- */
function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
             else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const head = rows[0] || [];
  return rows.slice(1).filter(r => r.length > 1)
    .map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const jget = async u => {
  const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
  return r.json();
};
const tget = async u => {
  const r = await fetch(u, { headers: { "User-Agent": UA } });
  if (!r.ok) return null;
  return r.text();
};

/* --- lid ur match_id + team_side ---
   `match_id` er "25-26-{keppni}-{heima}-vs-{uti}". Fyrsta utgafa notadi
   OGRADUGT regex ([a-z-]+?) yfir keppnina og thad gleypti of litid: ur
   "25-26-champions-league-arsenal-vs-slavia-prague" kom "league-arsenal"
   sem lid. Thad felldi 131 af 181 lyklum — og THAR MED foru byrjanir hja
   Arsenal, Chelsea og Man City UT UR URTAKINU. Maelingin hefdi thvi verid
   a skekktu urtaki thott hun hefdi "virkad".
   Nu er keppnis-slaufan fjarlaegd med THEKKTUM forskeytum.              */
const TOURN_SLUGS = ["champions-league", "europa-league", "conference-league",
                     "efl-cup", "fa-cup", "premier-league"];
const teamFromMatch = (mid, side) => {
  let t = String(mid || "").replace(/^\d\d-\d\d-/, "");
  for (const sl of TOURN_SLUGS) if (t.startsWith(sl + "-")) { t = t.slice(sl.length + 1); break; }
  const i = t.indexOf("-vs-");
  if (i < 0) return null;
  return side === "home" ? t.slice(0, i) : t.slice(i + 4);
};

console.log("\n=== 1. HEIMILDIN ===");
let tournaments = [];
try { tournaments = (await jget(API)).filter(x => x.type === "dir").map(x => x.name); }
catch (e) { console.log(`  ! heimild onaanleg: ${e.message}`); }
ok(`keppnir fundnar (${tournaments.join(", ")})`, tournaments.length >= 3, String(tournaments.length));
const NON_PL = tournaments.filter(t => !/premier league/i.test(t));
ok(`keppnir UTAN EPL: ${NON_PL.length}`, NON_PL.length >= 2);

/* --- safna: (nafn, lid) sem BYRJADI i keppni utan EPL, per FPL-umferd --- */
console.log("\n=== 2. BYRJUNARLID UTAN EPL ===");
const startedEuro = new Map();     // "gw|team" -> Set(nafn)
let files = 0, lineRows = 0;
for (const t of NON_PL) {
  let gws = [];
  try { gws = (await jget(`${API}/${encodeURIComponent(t)}`)).filter(x => x.type === "dir").map(x => x.name); }
  catch { continue; }
  for (const gw of gws) {
    const base = `${GH}/${encodeURIComponent(t)}/${gw}`;
    const [fx, lu] = await Promise.all([tget(`${base}/fixtures.csv`), tget(`${base}/lineups.csv`)]);
    if (!fx || !lu) continue;
    files++;
    /* `gameweek` i fixtures.csv er FPL-umferdin sem leikurinn tilheyrir. */
    const gwOf = new Map();
    for (const r of parseCsv(fx)) {
      const g = Math.round(+r.gameweek);
      if (Number.isFinite(g) && r.match_id) gwOf.set(r.match_id, g);
    }
    for (const r of parseCsv(lu)) {
      lineRows++;
      if (String(r.is_starting).toLowerCase() !== "true") continue;
      const g = gwOf.get(r.match_id);
      const team = teamFromMatch(r.match_id, r.team_side);
      if (!g || !team || !r.player_name) continue;
      const key = `${g}|${team}`;
      if (!startedEuro.has(key)) startedEuro.set(key, new Set());
      startedEuro.get(key).add(r.player_name);
    }
  }
}
ok(`skrar lesnar (${files} umferdar-mappur, ${lineRows} lineup-radir)`, files >= 10, String(files));
const euroStarts = [...startedEuro.values()].reduce((a, s) => a + s.size, 0);
ok(`byrjunarlids-tilvik utan EPL: ${euroStarts}`, euroStarts > 300, String(euroStarts));

/* --- EPL-gogn: byrjadi hann naestu umferd? --- */
console.log("\n=== 3. PORUN VID EPL-GOGNIN ===");
const gwFile = JSON.parse(readFileSync(D + "player_gw_2526.json", "utf8"));
const ix = {}; gwFile.stats.forEach((k, i) => ix[k] = i);
const M = await import(new URL("src/stats.js", REPO).href);
const ps = JSON.parse(readFileSync(D + "player_seasons.json", "utf8"));

/* lids-heiti i match_id ("real-madrid") -> lid i EPL-gognunum ("Man City") */
const norm = s => String(s || "").toLowerCase().replace(/[^a-z]/g, "");
const eplTeams = new Set(Object.values(gwFile.players).map(e => e.t));
const teamAlias = {};
for (const t of eplTeams) teamAlias[norm(t)] = t;
/* Handvirkar undantekningar thar sem heitin stangast a. */
Object.assign(teamAlias, {
  manchestercity: "Man City", manchesterunited: "Man United",
  tottenham: "Tottenham", tottenhamhotspur: "Tottenham",
  newcastle: "Newcastle", newcastleunited: "Newcastle",
  wolverhampton: "Wolves", wolverhamptonwanderers: "Wolves",
  nottinghamforest: "Nott'm Forest", brighton: "Brighton",
  brightonhovealbion: "Brighton", westham: "West Ham",
  westhamunited: "West Ham", leeds: "Leeds", leedsunited: "Leeds",
});
let mappedTeams = 0, unmappedTeams = new Set();
for (const key of startedEuro.keys()) {
  const team = key.split("|")[1];
  if (teamAlias[norm(team)]) mappedTeams++; else unmappedTeams.add(team);
}
ok(`lids-heiti poruð (${mappedTeams} af ${startedEuro.size})`,
   mappedTeams / Math.max(1, startedEuro.size) > 0.5,
   `oporud: ${[...unmappedTeams].slice(0, 8).join(", ")}`);

/* Nafna-porun MED LIDI, othraeddur sigurvegari — sama adferd sem 6b. */
const byTeam = {};
for (const [code, e] of Object.entries(gwFile.players)) {
  (byTeam[e.t] ||= []).push({ code, e, name: ps.players?.[code]?.["2025/26"]?.web_name || "",
    full: [ps.players?.[code]?.["2025/26"]?.first_name,
           ps.players?.[code]?.["2025/26"]?.second_name].filter(Boolean).join(" ") });
}
const findPlayer = (euroName, eplTeam) => {
  const cands = byTeam[eplTeam] || [];
  let best = null, bs = 0, second = 0;
  for (const c of cands) {
    const sc = Math.max(M.nameScore(c.name, euroName), M.nameScore(c.full, euroName));
    if (sc > bs) { second = bs; bs = sc; best = c; } else if (sc > second) second = sc;
  }
  return (best && bs >= 1 && bs > second) ? best : null;
};

/* --- MAELINGIN: innan leikmanns --- */
console.log("\n=== 4. MAELING — INNAN LEIKMANNS ===");
const per = new Map();   // code -> { euroN, euroStart, othN, othStart }
let matched = 0, unmatched = 0;
for (const [key, names] of startedEuro) {
  const [gwS, team] = key.split("|");
  const g = +gwS;
  const eplTeam = teamAlias[norm(team)];
  if (!eplTeam) continue;
  for (const nm of names) {
    const hit = findPlayer(nm, eplTeam);
    if (!hit) { unmatched++; continue; }
    matched++;
    const arr = hit.e.gw[g] || hit.e.gw[String(g)];
    const started = arr ? (arr[ix.starts] > 0 ? 1 : 0) : 0;
    const r = per.get(hit.code) || { euroN: 0, euroStart: 0, othN: 0, othStart: 0, name: hit.name };
    r.euroN++; r.euroStart += started;
    per.set(hit.code, r);
  }
}
ok(`nafna-porun: ${matched} poruð, ${unmatched} oporud (${Math.round(100*matched/Math.max(1,matched+unmatched))}%)`,
   matched / Math.max(1, matched + unmatched) > 0.75, `${unmatched} oporud`);

/* Grunn-hlutfall SAMA leikmanns i umferdum THAR SEM HANN SPILADI EKKI i Evropu */
for (const [code, r] of per) {
  const e = gwFile.players[code]; if (!e) continue;
  const euroGws = new Set();
  for (const [key, names] of startedEuro) {
    const [gwS, team] = key.split("|");
    const eplTeam = teamAlias[norm(team)];
    if (eplTeam !== e.t) continue;
    if ([...names].some(nm => findPlayer(nm, eplTeam)?.code === code)) euroGws.add(+gwS);
  }
  for (const [rd, arr] of Object.entries(e.gw)) {
    if (euroGws.has(+rd)) continue;
    r.othN++; r.othStart += arr[ix.starts] > 0 ? 1 : 0;
  }
}
const useful = [...per.values()].filter(r => r.euroN >= 2 && r.othN >= 5);
ok(`leikmenn med nog gogn i BADA hopa (${useful.length})`, useful.length >= 30, String(useful.length));

const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const diffs = useful.map(r => (r.euroStart / r.euroN) - (r.othStart / r.othN));
const dm = mean(diffs);
const sd = Math.sqrt(mean(diffs.map(d => (d - dm) ** 2)) * useful.length / Math.max(1, useful.length - 1));
const se = sd / Math.sqrt(useful.length);
const tstat = dm / (se || 1e-9);

const rawEuro = mean(useful.map(r => r.euroStart / r.euroN));
const rawOth = mean(useful.map(r => r.othStart / r.othN));
console.log(`\n     HRAR TOLUR (sami hopur leikmanna):`);
console.log(`       byrjar EPL eftir Evropu-start : ${(rawEuro * 100).toFixed(1)}%`);
console.log(`       byrjar EPL i odrum umferdum   : ${(rawOth * 100).toFixed(1)}%`);
console.log(`\n     INNAN LEIKMANNS (hver borinn vid SITT eigid hlutfall):`);
console.log(`       munur = ${(dm * 100).toFixed(2)}pp   t = ${tstat.toFixed(2)}   n = ${useful.length}`);
console.log(`       95% CI = [${((dm - 1.96 * se) * 100).toFixed(2)}pp, ${((dm + 1.96 * se) * 100).toFixed(2)}pp]`);

/* Vordurinn: EKKI ad ahrifin seu til, heldur ad NIDURSTADAN se skjolud.
   Ef merkid verdur marktaekt (|t|>=2 OG >=3pp) er tilefni til ad byggja
   P7.4 — og tha a THETTA prof ad falla svo einhver taki eftir.          */
const significant = Math.abs(tstat) >= 2 && Math.abs(dm) >= 0.03;
console.log(`\n     NIDURSTADA: ${significant ? "MARKTAEKT — tilefni til ad byggja P7.4"
                                             : "EKKI marktaekt — P7.4 verdur EKKI byggt"}`);
ok("Evropu-start hefur ENGIN marktaek ahrif a naesta EPL-start (P7.4 ekki byggt)",
   !significant, `t=${tstat.toFixed(2)} munur=${(dm*100).toFixed(2)}pp`);

console.log(`\nP7.4 EVROPU-ALAG: ${pass}/${pass + fail} graen`);
process.exit(fail ? 1 : 0);
