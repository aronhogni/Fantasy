/* ============================================================
   probe-bsd-order.mjs — TEKUR `/events/` VID RODUN?

   Keyrsla:  node scripts/probe-bsd-order.mjs      (tharf BSD_KEY)
   Keyrt i Actions gegnum `.github/workflows/probe-bsd.yml`, thvi
   lykillinn er i Secrets og er ekki lesanlegur staðbundið.

   ============================================================
   SPURNINGIN
   ============================================================
   `fetchBsdLineups` og `fetchBsdOdds` bidja um `limit=30` / `limit=20`
   AN RODUNAR. `status_fast.json` sagdi thess vegna
   **"nearest in 6303.1h"** (262 dagar, ~mai 2027) medan `fixtures.json`
   bar naesta leik eftir **67,6 klst**. Reikningurinn er RETTUR — hann
   tekur minnstu framtidar-dagsetningu UR SVARINU — en svarid er 30 af
   ~380 leikjum, og se rodunin ekki eftir dagsetningu er "naesti" i raun
   "naesti af theim sem vid fengum".

   Se thad rett, tha er `bsd_lineups` ekki ad missa af glugganum af thvi
   ad hann se ekki opinn, heldur af thvi ad leikirnir sem eru NAEST OKKUR
   eru alls ekki i farminum. Su villa er thogul: notan bydur godkynja
   skyringu ("glugginn er ekki opinn enn") a astandi sem er urtaks-galli.

   ============================================================
   HVERS VEGNA ThETTA ER SJALF-SVARANDI
   ============================================================
   BSD hafnar OThEKKTUM fyrirspurnar-breytum og SEGIR HVERJAR HANN TEKUR
   (skjalad i `bsdGet`, 19.8.2026):
     {"detail":"Unknown query parameter(s): limit.",
      "unknown_parameters":["limit"], "accepted_parameters":[]}
   Vid thurfum thvi ekki ad giska: hver tilraun skilar annad hvort
   RODUDUM farmi eda LISTA yfir their breytur sem eru leyfdar.

   ============================================================
   ThETTA PRENTAR ALDREI LYKILINN
   ============================================================
   Slodir eru prentadar AN haussins, og lykillinn fer eingongu i
   `Authorization`. Actions-log thessa repos er OPINBER (repo-id er
   public), svo ekkert her ma bera leyndarmal. Prentad er adeins LOGUN
   svarsins: staða, fjoldi, elsta/yngsta dagsetning.
   ============================================================ */
/* GRUNNURINN ER `/api/v2` — fyrsta utgafa mín notadi `/api` og fekk
   404 med JSON-bol (ekki 401, svo lykillinn var alltaf i lagi). */
const BSD_API = "https://sports.bzzoiro.com/api/v2";
const LEAGUE = 1;

if (!process.env.BSD_KEY) {
  console.log("BSD_KEY is not set — this probe must run inside GitHub Actions.");
  process.exit(1);
}

async function get(path) {
  const r = await fetch(BSD_API + path, {
    headers: { Authorization: `Token ${process.env.BSD_KEY}`, "user-agent": "fantasy-tool" },
    signal: AbortSignal.timeout(30000),
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ekki JSON */ }
  return { ok: r.ok, status: r.status, json, text: text.slice(0, 240) };
}

/* Hvada timabil er i gangi? Sama leid og `bsdCurrentSeason`. */
const seasons = await get(`/leagues/${LEAGUE}/seasons/`);
if (!seasons.ok) { console.log("seasons ->", seasons.status, seasons.text); process.exit(1); }
/* Svarid ber `seasons` og markar thad rétta med `is_current` — sama og
   `bsdCurrentSeason` gerir. `/leagues/{id}/seasons/` tekur ENGA
   fyrirspurnar-breytu (skjalad i `fetch.mjs`), svo hun er ekki send. */
const rows = seasons.json?.seasons || [];
const cur = rows.find(s => s.is_current) || rows[0];
const SEASON = cur?.id;
console.log(`season: id=${SEASON} name=${cur?.name ?? "?"}\n`);

const base = `/events/?league_id=${LEAGUE}&season_id=${SEASON}&status=notstarted`;

/* Hve margir eru their i raun? Ef `limit` er haekkanlegt faum vid
   heildina og getum sed hvort 30 var urtak eda allt mengid. */
const CANDIDATES = [
  ["no ordering (current behaviour)", `${base}&limit=30`],
  ["limit=400",                      `${base}&limit=400`],
  ["order=event_date",               `${base}&limit=30&order=event_date`],
  ["ordering=event_date",            `${base}&limit=30&ordering=event_date`],
  ["sort=event_date",                `${base}&limit=30&sort=event_date`],
  ["order_by=event_date",            `${base}&limit=30&order_by=event_date`],
  ["sort_by=event_date",             `${base}&limit=30&sort_by=event_date`],
  ["date_from (filter instead of order)", `${base}&limit=30&date_from=${new Date().toISOString().slice(0, 10)}`],
];

const now = Date.now();
const summarise = (j) => {
  const res = j?.results || (Array.isArray(j) ? j : []);
  const ts = res.map(e => Date.parse(e.event_date)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!ts.length) return `n=${res.length} (no dates)`;
  const soonest = ts.find(t => t > now);
  return `n=${res.length} · first ${new Date(ts[0]).toISOString().slice(0, 10)}`
    + ` · last ${new Date(ts[ts.length - 1]).toISOString().slice(0, 10)}`
    + ` · soonest ahead ${soonest ? ((soonest - now) / 3600e3).toFixed(1) + "h" : "none"}`;
};

for (const [label, path] of CANDIDATES) {
  const r = await get(path);
  if (r.ok) {
    console.log(`OK   ${label.padEnd(34)} ${summarise(r.json)}`);
  } else {
    const acc = r.json?.accepted_parameters;
    console.log(`${String(r.status).padEnd(4)} ${label.padEnd(34)} ${r.json?.detail || r.text}`
      + (Array.isArray(acc) && acc.length ? `  [accepted: ${acc.join(", ")}]` : ""));
  }
}

console.log("\nHOW TO READ THIS: if 'no ordering' shows a FAR soonest-ahead while any"
  + " ordering variant (or limit=400) shows a NEAR one, then the 6303h figure is a"
  + " sampling artefact and fetchBsdLineups/fetchBsdOdds should ask for an order or a date filter.");
