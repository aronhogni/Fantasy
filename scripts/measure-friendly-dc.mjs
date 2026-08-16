/* ============================================================
   DEFCON I AEFINGALEIKJUM — HANDVIRK MAELING (14.8.2026)

   EKKI I `npm test`, EKKI I PIPELINE, ENGIR LYKLAR. Keyrsla:
       node scripts/measure-friendly-dc.mjs
       node scripts/measure-friendly-dc.mjs --json [SLOD]  (sjalfgefid tmpdir/fpl-measure/)

   SPURNINGIN: hvada leikmadur faer mest DefCon per leik i aefingaleikjum?
   FPL birtir EKKERT ur aefingaleikjum (`data/` ber 0 loknar umferdir og
   `defcon.json` er tom i forleik), svo svarid verdur ad koma annars stadar
   fra — og ThAD ThARF FIMM SVID: clearances, blocks, interceptions, tackles
   og recoveries. Kannad 14.8.2026:

     ESPN  (`club.friendly`)  LIDS-tolur ERU til en per-leikmanns-blokkin ber
                              14 svid og EKKERT theirra er varnar-tala.
                              STADFEST ad thetta er ESPN-vitt, ekki serstakt
                              fyrir aefingaleiki: sami 14-svida listi kemur ur
                              alvoru PL-leik (`eng.1`, event 740963).
     SofaScore                403, lika med fullum vafra-hausum.
     BSD                      401 an lykils; BSD_KEY er write-only i Secrets.
     FBref                    403 (CLAUDE.md 6).
     API-Sports               tackles/blocks/interceptions EN ENGAR clearances
                              og ENGAR recoveries -> hvorki CBIT ne CBIRT.
     **FotMob**               **VIRKAR — og CLAUDE.md 6 er UREALD um hana.**
                              Skjalid segir "404/gated"; ThAD ER SLODIN SEM
                              BREYTTIST. `/api/matchDetails` svarar 404 en
                              **`/api/data/matchDetails?matchId=`** svarar 200,
                              og `/api/data/matches?date=YYYYMMDD` skilar
                              deildinni "Club Friendlies".
                              Per leikmann: Tackles · Blocks · Clearances ·
                              Interceptions · Recoveries · Minutes played —
                              nakvaemlega inntok DefCon.

   STODUR KOMA UR FPL, EKKI FOTMOB. Threpin (10 fyrir vorn, 12 fyrir midju og
   sokn) eru FPL-regla, svo stadan verdur ad vera FPL-stadan. Leikmenn eru
   pardir vid `players.json` med MAELDA nafna-pornum ur `src/stats.js`
   (`nameScore`), SKORDUD VID LIDID — sama vord og annars stadar i repo-inu:
   thogul rong porun er verri en engin (CLAUDE.md 6).

   ThRIR VARNAGLAR SEM GILDA UM NIDURSTODUNA:
     1. AEFINGALEIKIR ERU EKKI DEILDARLEIKIR. Skiptingar eru 11 i halfleik,
        andstaedingar ur fjorum deildum, alagid valid. Talan LYSIR thvi sem
        gerdist; hun spair engu. CLAUDE.md 4 skrair "DefCon i rodun" sem
        maelt-og-fellt og ThAD STENDUR — thetta er lysing, ekki merki.
     2. MINUTUR RADA OLLU. Sa sem spilar 90 faer tvofalt taekifaeri a vid thann
        sem spilar 45. Thess vegna er BAEDI per leik OG per 90 birt, og per 90
        er adeins reiknad yfir minutu-golfi.
     3. ThREPID ER FPL-REGLA UM DEILDARLEIKI, notud her a annad samhengi.
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { nameScore } from "../src/stats.js";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
         + "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const FM = "https://www.fotmob.com/api/data";
const D = new URL("../data/", import.meta.url).pathname;
const WRITE_JSON = process.argv.includes("--json");

/* ============================================================
   `--json` SKRIFADI I ANNARRAR LOTU SCRATCHPAD (lagad 16.8.2026)

   Her stod HARDKODUD slod:
       /private/tmp/claude-501/-Users-.../15a4c5c8-.../scratchpad/friendly-dc.json
   Thad er lotu-bundin mappa hja EINNI Claude-lotu a EINNI macOS-vel. Hun
   hverfur thegar lotan er hreinsud og er ekki til a neinni annarri vel, svo
   `--json` felli med ENOENT (og `writeFileSync` bjo ekki einu sinni til
   mopuna). Skrifta sem skrifar i horfna mappu er ekki "handvirkt tol", hun
   er bilud — og hun bilar ThEGAR MADUR ThARF HANA, ekki fyrr.

   NU: `--json [SLOD]`. An slodar er skrifad i `os.tmpdir()/fpl-measure/`,
   sem er til a hverri vel og mengar ekki repo-id (rannsoknar-uttak, ekki
   nidurstada — sbr. `scripts/.boxtouch-cache/`). Moppan er buin til.
   ============================================================ */
function jsonTarget(argv, fallbackName) {
  const i = argv.indexOf("--json");
  const next = i >= 0 ? argv[i + 1] : null;
  const given = next && !next.startsWith("-") ? next : null;
  return given ? resolve(process.cwd(), given) : join(tmpdir(), "fpl-measure", fallbackName);
}

/* ENDURTILRAUNIR ERU NAUDSYNLEGAR, EKKI SKRAUT: fyrsta keyrslan (14.8.2026)
   naadi ADEINS 29 af 71 leikjum og hin 42 "brugdust" — an thess ad nokkud
   segdi HVERS VEGNA, thvi `catch` gleypti allt eins. Handvirk profun a einum
   theirra gaf HTTP 200 thrisvar i rod, svo thetta var TIMABUNDID (throttlun
   eda tenging), ekki vantandi gogn. Thogul 60% thekja er verri en engin tala:
   hun litur ut eins og heill listi. Nu er reynt aftur og AF HVERJU er talid. */
const errs = {};
const get = async (url, tries = 4) => {
  let last = "";
  for (let a = 0; a < tries; a++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, referer: "https://www.fotmob.com/",
                                              accept: "application/json" },
                                   signal: AbortSignal.timeout(30000) });
      if (r.ok) return r.json();
      last = `HTTP ${r.status}`;
      if (r.status === 404) break;                 // ekki til; ekki reyna aftur
    } catch (e) { last = e.name === "TimeoutError" ? "timeout" : e.message; }
    await new Promise(r => setTimeout(r, 600 * (a + 1)));
  }
  errs[last] = (errs[last] || 0) + 1;
  throw new Error(last);
};

/* ---------- PL-lidin ur repo-inu, ekki hardkodud ---------- */
const teams = JSON.parse(readFileSync(D + "teams.json", "utf8")).teams;
const players = JSON.parse(readFileSync(D + "players.json", "utf8")).players;
/* FotMob-nofn eru stutt ("Man United", "Nottm Forest"); FPL-nofn onnur.
   HANDSTADFEST tafla — fuzzy felldi Man Utd inn i Man City i BSD.        */
const FM_TEAM = {
  "arsenal":"ARS", "aston villa":"AVL", "bournemouth":"BOU", "afc bournemouth":"BOU",
  "brentford":"BRE", "brighton":"BHA", "brighton & hove albion":"BHA",
  "chelsea":"CHE", "coventry":"COV", "coventry city":"COV", "crystal palace":"CRY",
  "everton":"EVE", "fulham":"FUL", "hull city":"HUL", "hull":"HUL",
  "ipswich":"IPS", "ipswich town":"IPS", "leeds":"LEE", "leeds united":"LEE",
  "liverpool":"LIV", "man city":"MCI", "manchester city":"MCI",
  "man united":"MUN", "manchester united":"MUN", "man utd":"MUN",
  "newcastle":"NEW", "newcastle united":"NEW", "nottm forest":"NFO",
  "nottingham forest":"NFO", "tottenham":"TOT", "tottenham hotspur":"TOT",
  "spurs":"TOT", "sunderland":"SUN",
};
const plShort = n => FM_TEAM[String(n || "").toLowerCase().trim()] || null;
const byShort = Object.fromEntries(teams.map(t => [t.short, t]));
const missing = teams.map(t => t.short).filter(s => !Object.values(FM_TEAM).includes(s));
if (missing.length) console.log(`WARNING: no FotMob name mapped for ${missing.join(",")}`);

/* FPL-leikmenn per lid, fyrir stodu-uppflettingu. */
const fplByTeam = {};
for (const p of players) (fplByTeam[p.team] ||= []).push(p);

/* ---------- 1. LEIKIRNIR ---------- */
const DATES = [];
for (const [mon, days] of [[6, 30], [7, 31], [8, 14]]) {
  for (let d = 1; d <= days; d++)
    DATES.push(`2026${String(mon).padStart(2, "0")}${String(d).padStart(2, "0")}`);
}
console.log(`1) FINDING FRIENDLIES  (${DATES[0]} - ${DATES.at(-1)})`);
const matches = [];
for (const date of DATES) {
  let j;
  try { j = await get(`${FM}/matches?date=${date}`); } catch { continue; }
  for (const l of j.leagues || []) {
    if (!/friendl/i.test(l.name || "")) continue;
    for (const m of l.matches || []) {
      const h = plShort(m.home?.name), a = plShort(m.away?.name);
      if (!h && !a) continue;
      const st = m.status || {};
      if (!st.finished && !/FT|Pen|AET/i.test(st.reason?.short || st.scoreStr || "")) continue;
      matches.push({ id: m.id, date, home: m.home?.name, away: m.away?.name, h, a });
    }
  }
  await new Promise(r => setTimeout(r, 60));
}
console.log(`   finished friendlies involving a PL club: ${matches.length}`);

/* ---------- 2. DC PER LEIKMANN ---------- */
const val = (grp, key) => {
  const s = grp?.stats?.[key]?.stat;
  const v = s && typeof s === "object" ? s.value : s;
  return Number.isFinite(+v) ? +v : 0;
};
/* Pardu FotMob-nafn vid FPL-leikmann INNAN LIDSINS. Krafan er sú sama og i
   `matchImminent`: besta skorid verdur ad vera >= 1 OG strangt haerra en
   naestbesta, annars er thad ekki porun heldur agiskun.                   */
const matchFpl = (name, short) => {
  const pool = fplByTeam[byShort[short]?.id] || [];
  let best = null, bs = 0, second = 0;
  for (const p of pool) {
    const sc = Math.max(nameScore(p.web_name, name),
                        nameScore(`${p.first_name ?? ""} ${p.second_name ?? ""}`, name));
    if (sc > bs) { second = bs; bs = sc; best = p; }
    else if (sc > second) second = sc;
  }
  return (best && bs >= 1 && bs > second) ? best : null;
};

const agg = new Map();
/* ThRJAR UTKOMUR, EKKI TVAER: sott · SOTT EN AN LEIKMANNA-TALNA · brast.
   Fyrsta utgafan taldi tvaer sidustu saman sem "brugdust" og prentadi tomann
   astaedu-lista, sem las eins og net-bilun. RETTA skyringin er onnur og hun
   er EIGINLEIKI HEIMILDARINNAR: FotMob hefur lidsuppstillingu fyrir marga
   aefingaleiki en ENGAR per-leikmanns-tolur (stadfest a Nottm Forest v
   Leverkusen og Malaga v Fulham). Tala sem er kolluð bilun thegar hun er
   thekjuskortur sendir maelinguna i vitlausa att.                        */
let done = 0, failed = 0, noStats = 0, unmatched = new Set();
console.log("2) FETCHING PLAYER STATS");
for (const m of matches) {
  let j;
  try { j = await get(`${FM}/matchDetails?matchId=${m.id}`); }
  catch { failed++; continue; }
  const ps = j.content?.playerStats;
  if (!ps || !Object.keys(ps).length) { noStats++; continue; }
  for (const pl of Object.values(ps)) {
    const short = plShort(pl.teamName);
    if (!short) continue;                            // adeins PL-lid
    if (pl.isGoalkeeper) continue;                   // markmenn fa ekki DC
    const groups = pl.stats || [];
    const def = groups.find(g => g.title === "Defense");
    const top = groups.find(g => g.title === "Top stats");
    if (!def) continue;                              // spiladi ekki / engar tolur
    const mins = val(top, "Minutes played");
    if (!mins) continue;
    const fpl = matchFpl(pl.name, short);
    if (!fpl) { unmatched.add(`${short}:${pl.name}`); continue; }
    if (fpl.element_type === 1) continue;            // markmadur skv. FPL
    const isDef = fpl.element_type === 2;
    const cbi = val(def, "Clearances") + val(def, "Blocks") + val(def, "Interceptions");
    const tk  = val(def, "Tackles");
    const rec = val(def, "Recoveries");
    const dc  = cbi + tk + (isDef ? 0 : rec);
    const thr = isDef ? 10 : 12;
    const k = String(fpl.id);
    const a = agg.get(k) || { id: fpl.id, name: fpl.web_name, team: short,
                              pos: ["", "GK", "DEF", "MID", "FWD"][fpl.element_type],
                              price: (fpl.now_cost ?? 0) / 10,
                              games: 0, mins: 0, dc: 0, hits: 0, best: 0,
                              clr: 0, blk: 0, int: 0, tkl: 0, rec: 0 };
    a.games++; a.mins += mins; a.dc += dc; a.hits += dc >= thr ? 1 : 0;
    a.best = Math.max(a.best, dc);
    a.clr += val(def, "Clearances"); a.blk += val(def, "Blocks");
    a.int += val(def, "Interceptions"); a.tkl += tk; a.rec += rec;
    agg.set(k, a);
  }
  done++;
  process.stdout.write(`\r   ${done}/${matches.length} matches`);
  await new Promise(r => setTimeout(r, 250));
}
console.log(`\n   with player stats: ${done} · no player stats in FotMob: ${noStats} · `
          + `fetch failed: ${failed} · unmatched names: ${unmatched.size}`);
if (failed) console.log(`   reasons: ${Object.entries(errs).map(([k, v]) => k + " x" + v).join(", ")}`);
/* ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b). Undir 85% er listinn
   ekki "topplisti" heldur urtak, og thad verdur ad standa a honum.       */
const cover = matches.length ? done / matches.length : 0;
if (cover < 0.85) console.log(`   WARNING: coverage ${(cover * 100).toFixed(0)}% - this list is a SAMPLE, not complete.`);

/* ---------- 3. RODUNIN ---------- */
const MIN_MINS = 90;
const rows = [...agg.values()]
  .map(a => ({ ...a, per_game: a.dc / a.games, per90: a.dc * 90 / a.mins,
               hit_rate: a.hits / a.games }))
  .sort((x, y) => y.per_game - x.per_game);
const q = rows.filter(a => a.mins >= MIN_MINS);

const line = a => `  ${a.name.slice(0, 18).padEnd(18)} ${a.team} ${a.pos.padEnd(3)} `
  + `${String(a.games).padStart(2)} ${String(a.mins).padStart(4)} ${String(a.dc).padStart(4)} `
  + `${a.per_game.toFixed(1).padStart(6)} ${a.per90.toFixed(1).padStart(6)} `
  + `${String(a.hits + "/" + a.games).padStart(5)} ${String(a.best).padStart(4)}  `
  + `${a.clr}/${a.blk}/${a.int}/${a.tkl}/${a.rec}`;

console.log(`\n3) DC IN FRIENDLIES - ${q.length} players with >= ${MIN_MINS} min\n`);
console.log("  player             clb pos  M  min   DC /match    /90  hits  best  clr/blk/int/tkl/rec");
q.slice(0, 30).forEach(a => console.log(line(a)));

console.log(`\n   ALL (including under ${MIN_MINS} min), top 10 by DC/match:`);
rows.slice(0, 10).forEach(a => console.log(line(a)));

if (WRITE_JSON) {
  const out = jsonTarget(process.argv, "friendly-dc.json");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ matches, rows, unmatched: [...unmatched] }, null, 1));
  console.log(`\n   written ${out}`);
}
console.log("\nCAVEATS: friendlies are not league matches (wholesale substitutions, opponents");
console.log("from four divisions, chosen workload). The figure DESCRIBES, it does not predict -");
console.log("CLAUDE.md 4 records DefCon-in-ranking as measured and rejected, and that stands.");
console.log("The 10/12 threshold is an FPL league rule applied here to a different context.");
