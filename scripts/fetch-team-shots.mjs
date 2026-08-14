/* ============================================================
   LIDA-SKOT UR ESPN — EITT TIMABIL, KEYRT HANDVIRKT

   AF HVERJU SER SKRIFTA OG EKKI I `fetch.mjs`: thetta eru ~660 kold
   (einn scoreboard per DAG + eitt summary per LEIK) og daglega pipeline
   ma ekki bera thann kostnad. Timabil sem er lokid BREYTIST EKKI, svo
   skran er skrifud EINU SINNI og committud.

   HVAD ThETTA GEFUR SEM EKKERT ANNAD I REPO-INU GEFUR:
   `team_form.json` (E0) hefur skot og skot a mark a sig, en E0 veit
   EKKERT um hvadan skotid kom. ESPN skrifar svædid i textann ("from
   outside the box", "from very close range") og gefur hnit, svo hér
   faest thad sem raedur hvort MARKVORDUR er godur kostur:

     langskot a sig      — skot ad utan eru miklu ologlegri mork
     naerfaeri a sig      — skot ur markteig eru naestum alltaf mork
     skot i teig a sig    — millibilid

   BIG CHANCES ERU EKKI HER OG VERDA THAD EKKI. Their krefjast xG PER
   SKOT og engin naanleg heimild gefur hana (CLAUDE.md 6b og 6e: FBref
   403, SofaScore 403, Understat gagnalaus, FotMob gated). Naerfaeris-
   talan er MAELD nalgun a sama hlut og er merkt sem thad — hun er ekki
   big chance og ma ekki heita thad.

   KVARDINN: x er hlutfall af HALFUM velli (52,5 m) fra markinu sem er
   sott ad — sja KVORDUN i CLAUDE.md 6b. Vid notum SVAEDIS-TEXTANN, ekki
   hnitin, thvi hann er ohad kvardanum og ESPN skrifar hann sjalft.

   Keyrsla:  node scripts/fetch-team-shots.mjs 2025-08-15 2026-05-25
   ============================================================ */
import { writeFileSync, readFileSync } from "node:fs";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1";
const SHOT_TYPE = {
  "Goal": "goal", "Goal - Header": "goal", "Goal - Volley": "goal",
  "Goal - Free-kick": "goal", "Penalty - Scored": "goal",
  "Shot On Target": "on_target", "Shot Off Target": "off_target",
  "Shot Blocked": "blocked", "Shot Hit Woodwork": "woodwork",
};
const ZONE_RE = [
  [/the centre of the box/i, "box_centre"],
  [/the left side of the box/i, "box_left"],
  [/the right side of the box/i, "box_right"],
  [/very close range/i, "close_range"],
  [/the penalty spot/i, "penalty_spot"],
  [/more than 35 yards/i, "far"],
  [/outside the box/i, "outside"],
];
const IN_BOX = new Set(["box_centre", "box_left", "box_right", "close_range", "penalty_spot"]);
const zoneOf = t => { for (const [re, z] of ZONE_RE) if (re.test(t)) return z; return null; };

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0 fantasy-tool" },
        signal: AbortSignal.timeout(30000),
      });
      if (r.ok) return await r.json();
      if (r.status === 429) { await sleep(2000 * (i + 1)); continue; }
      throw new Error(`HTTP ${r.status}`);
    } catch (e) { if (i === tries - 1) throw e; await sleep(600 * (i + 1)); }
  }
  /* SAMA GAT OG I BSD-SKRIFTUNUM: sidasta tilraun sem var 429 `continue`-adi
     ut ur lykkjunni og fallid skilaði `undefined`. Hrunid kom tha vid
     `d.header?.competitions` — langt fra upprunanum og litur ut eins og
     gagnavilla i stad throttlingar.                                     */
  throw new Error(`ESPN gave up after ${tries} attempts: ${url}`);
}

const [, , FROM = "2025-08-15", TO = "2026-05-25"] = process.argv;
const days = [];
for (let d = new Date(FROM + "T12:00:00Z"); d <= new Date(TO + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1))
  days.push(d.toISOString().slice(0, 10).replace(/-/g, ""));

console.log(`ESPN eng.1 — ${days.length} dagar (${FROM} .. ${TO})`);

/* ---- 1) finna leiki ---- */
const events = [];
for (let i = 0; i < days.length; i++) {
  try {
    const sb = await getJSON(`${ESPN}/scoreboard?dates=${days[i]}`);
    for (const e of sb.events || []) events.push(e.id);
  } catch (e) { console.warn(`  dagur ${days[i]}: ${e.message}`); }
  if (i % 30 === 0) console.log(`  days ${i}/${days.length} · matches ${events.length}`);
}
const eventIds = [...new Set(events)];
console.log(`matches found: ${eventIds.length}`);

/* ---- 2) skot per leik ---- */
const teams = {};                       // short -> talnasafn
const T = s => teams[s] || (teams[s] = {
  short: s, matches: 0,
  for: { shots: 0, on_target: 0, in_box: 0, close: 0, outside: 0, goals: 0 },
  against: { shots: 0, on_target: 0, in_box: 0, close: 0, outside: 0, goals: 0 },
});
let noZone = 0, noTeam = 0, done = 0;

for (const eid of eventIds) {
  let d;
  try { d = await getJSON(`${ESPN}/summary?event=${eid}`); }
  catch (e) { console.warn(`  event ${eid}: ${e.message}`); continue; }

  /* lid leiksins og leikmanna-taflan (skyttan er nefnd med nafni, ekki lidi) */
  const comps = d.header?.competitions?.[0]?.competitors || [];
  if (comps.length !== 2) continue;
  const shortOf = {}, sides = [];
  for (const c of comps) {
    const s = c.team?.abbreviation || c.team?.shortDisplayName;
    if (!s) continue;
    sides.push(s); shortOf[c.id] = s;
  }
  if (sides.length !== 2) continue;
  const teamOf = {};
  for (const r of d.rosters || []) {
    const s = shortOf[r.team?.id] || r.team?.abbreviation;
    for (const p of r.roster || []) {
      const n = p.athlete?.displayName;
      if (n && s) teamOf[n] = s;
    }
  }
  for (const s of sides) T(s).matches++;

  const seen = new Set();
  for (const c of d.commentary || []) {
    const p = c.play; if (!p) continue;
    const label = p.type?.text || "";
    const kind = SHOT_TYPE[label];
    const own = label === "Own Goal";
    if (!kind && !own) continue;
    const pid = p.id ?? `${label}|${c.sequence}`;
    if (seen.has(pid)) continue;
    seen.add(pid);

    const text = String(c.text || p.text || "");
    const shooter = p.participants?.[0]?.athlete?.displayName || null;
    /* SJALFSMORK ERU SLEPPT: skyttan tilheyrir lidinu sem FAER markid, svo
       "fyrir/gegn" snyst vid og talan yrdi rong i BADAR attir.           */
    if (own) continue;
    const side = shooter ? teamOf[shooter] : null;
    if (!side) { noTeam++; continue; }
    const other = sides[0] === side ? sides[1] : sides[0];

    const z = zoneOf(text);
    if (!z) noZone++;
    const add = (o) => {
      o.shots++;
      if (kind === "on_target" || kind === "goal") o.on_target++;
      if (kind === "goal") o.goals++;
      if (z && IN_BOX.has(z)) o.in_box++;
      if (z === "close_range") o.close++;
      if (z === "outside" || z === "far") o.outside++;
    };
    add(T(side).for);
    add(T(other).against);
  }
  if (++done % 40 === 0) console.log(`  matches ${done}/${eventIds.length}`);
}

/* ---- 3) pora vid FPL-lidin ---- */
let fplTeams = [];
try {
  const raw = JSON.parse(readFileSync(new URL("../data/teams.json", import.meta.url), "utf8"));
  fplTeams = Array.isArray(raw) ? raw : (raw.teams || []);
}
catch { /* skran ma vanta — skran er tha an fpl_id */ }
const byShort = {};
for (const t of fplTeams) byShort[String(t.short).toUpperCase()] = t;
/* ESPN-skammstafanir eru ekki alltaf thaer somu og FPL-ar. Adeins thau sem
   VIRKILEGA skilja á milli eru talin upp; hin pörast beint.             */
/* ESPN-skammstafanir eru MAELDAR ur svorunum, ekki gitskadar: MAN = Man
   United og MNC = Man City (ESPN notar ekki MUN/MCI). Lid sem PORAST EKKI
   eru ekki villa — teams.json er lidalisti YFIRSTANDANDI timabils, svo
   fallin lid ur 2025/26 eiga thar ekkert heima og fa fpl_id null.       */
const ALIAS = { MAN: "MUN", MNC: "MCI", NOT: "NFO" };

const out = [];
for (const t of Object.values(teams)) {
  const key = (ALIAS[t.short.toUpperCase()] || t.short).toUpperCase();
  const fpl = byShort[key] || null;
  const per = (n) => t.matches ? +(n / t.matches).toFixed(2) : null;
  out.push({
    short: t.short, fpl_id: fpl?.id ?? null, name: fpl?.name ?? null, matches: t.matches,
    shots_pg: per(t.for.shots), sot_pg: per(t.for.on_target),
    in_box_pg: per(t.for.in_box), close_pg: per(t.for.close), outside_pg: per(t.for.outside),
    shots_against_pg: per(t.against.shots), sot_against_pg: per(t.against.on_target),
    in_box_against_pg: per(t.against.in_box), close_against_pg: per(t.against.close),
    outside_against_pg: per(t.against.outside),
    /* HLUTFOLL ERU ThAD SEM SEGIR SOGUNA: 12 skot a sig segja lítid ef
       ollum er skotid ad utan. Hlutfallid er GAEDIN, talan er magnid.  */
    outside_share_against: t.against.shots ? +(t.against.outside / t.against.shots).toFixed(3) : null,
    box_share_against: t.against.shots ? +(t.against.in_box / t.against.shots).toFixed(3) : null,
  });
}
out.sort((a, b) => (a.shots_against_pg ?? 99) - (b.shots_against_pg ?? 99));

const unmatched = out.filter(t => t.fpl_id == null).map(t => t.short);
const payload = {
  updated: new Date().toISOString(),
  season: "2025/26", source: "espn_commentary",
  matches: eventIds.length,
  note: `${eventIds.length} matches. Zones come FROM THE ESPN TEXT, not from the coordinates — `
      + `the text is independent of the scale. Own goals skipped (the shooter belongs to the WRONG club). `
      + `BIG CHANCES ARE NOT HERE: they need per-shot xG and no reachable source `
      + `provides it. Proximity (close_*) is a measured approximation of the same thing, not a big chance. `
      + `CROSS-CHECKED AGAINST E0 (an independent source, team_form.json) 8.8.2026: all 17 clubs `
      + `present in BOTH files agree within 0.71 shots/match, mean deviation -0.47 (shots) and `
      + `-0.43 (on target). ESPN counts SYSTEMATICALLY ~3.5% fewer — the same sign across all `
      + `clubs, which is a difference between sources (the commentary omits some blocked shots) but `
      + `not an error in the extraction. Use the E0 figures for VOLUME and ESPN for ZONES.`,
  no_zone: noZone, no_team: noTeam,
  unmatched_to_fpl: unmatched,
  teams: out,
};
const dest = new URL("../data/team_shots.json", import.meta.url).pathname;
/* ============================================================
   TOM KEYRSLA MA ALDREI ThURRKA UT GOD GOGN (baett vid 14.8.2026).
   Fimm systur-skriftur hafa thennan vord — `fetch-bsd.mjs`,
   `fetch-bsd-teams.mjs`, `fetch-clubelo-history.mjs`, `fetch-fdr-history.mjs`
   og `fetch-player-gw.mjs` — en ThESSI EIN skrifadi skilyrdislaust: hver
   villubraut hér ad ofan er `console.warn` + `continue`, svo throttlun hja
   ESPN, rangt dagsetningarbil eda net-bilun hefdi skilad `teams: []` og
   skrifad thad YFIR heilt tímabil (8.986 b, 17 fellog). Skriftan er handvirk
   og keyrd sjaldan — thad gerir thetta VERRA, ekki betra: tapid uppgotvast
   ekki fyrr en einhver opnar flipann.
   Reglan er su sama og i `fetch-bsd-teams.mjs`: DEYJA fremur en ad skrifa
   tomt ofan a heilt (CLAUDE.md 6, "BSD — reglurnar sem gilda um hana").
   ============================================================ */
if (!out.length) {
  console.error(`REFUSING TO WRITE: the run produced 0 clubs (${noZone} without a zone, ${noTeam} without a club).`);
  console.error(`${dest} is UNTOUCHED - the previous data stands.`);
  process.exit(2);
}
try {
  const before = JSON.parse(readFileSync(dest, "utf8"));
  const had = Array.isArray(before?.teams) ? before.teams.length : 0;
  if (had > out.length) {
    console.error(`REFUSING TO WRITE: the file has ${had} clubs but this run produced ${out.length}.`);
    console.error("A worse run must not overwrite a better one - re-run, or delete the file deliberately.");
    process.exit(2);
  }
} catch { /* engin fyrri skra: fyrsta keyrsla, ekkert ad verja */ }
writeFileSync(dest, JSON.stringify(payload, null, 1));
console.log(`\nskrifad ${dest}`);
console.log(`clubs: ${out.length} · without a zone: ${noZone} · without a club: ${noTeam} · unmatched: ${unmatched.join(",") || "none"}`);
