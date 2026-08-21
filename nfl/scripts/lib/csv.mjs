/* ============================================================
   csv.mjs — RFC4180-thattari fyrir nflverse-skrarnar.

   HVERS VEGNA EIGIN THATTARI EN EKKI split(","):
   nflverse-skrarnar bera reiti med kommu INNAN gaesalappa
   (t.d. `fg_made_list` = "23,41,55" og leikmannanofn eins og
   "Smith, Jr."). Naive split gaf ROD-VILLU sem faerdist til:
   dalkur 8 (week) las "REG" i sumum rodum og "2025" i odrum.
   Thad sast beint i konnun 9.8.2026 og er astaedan fyrir thessu.

   Skilar RODUM SEM FYLKI (ekki hlutum) ur `rows()`, og
   `objects()` byggir hluti ofan a thad. Fylkis-leidin er notud
   thar sem skrain er stor (play-by-play) svo vid buum ekki til
   milljon hluti ad tharflausu.
   ============================================================ */

/** Thattar CSV-texta i fylki af fylkjum. Sidasta lina ma vera tom. */
export function rows(text) {
  const out = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += c; i++; continue;
    }

    if (c === '"') { quoted = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); out.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field !== "" || row.length) { row.push(field); out.push(row); }
  return out;
}

/**
 * Thattar i hluti med hausinn sem lykla.
 * `pick` (valfrjalst) er fylki dalkaheita — tha eru ADEINS their lesnir.
 * Thad skiptir mali: stats_player_week er 140 dalkar og 8,5 MB; ad lesa
 * 25 dalka i stad 140 sparar ~80% af minninu i pipeline-keyrslunni.
 */
export function objects(text, pick = null) {
  const r = rows(text);
  if (!r.length) return [];
  const head = r[0];
  const idx = pick
    ? pick.map((k) => [k, head.indexOf(k)]).filter(([, j]) => j >= 0)
    : head.map((k, j) => [k, j]);

  const out = new Array(r.length - 1);
  for (let i = 1; i < r.length; i++) {
    const src = r[i];
    if (src.length === 1 && src[0] === "") { out[i - 1] = null; continue; }
    const o = {};
    for (const [k, j] of idx) o[k] = src[j];
    out[i - 1] = o;
  }
  return out.filter(Boolean);
}

/* ============================================================
   HVAD BAD ThATTARINN UM SEM HEIMILDIN BER EKKI LENGUR?
   ============================================================
   `objects(text, pick)` SLEPPIR ThOGULT dalki sem er ekki i hausnum
   (`.filter(([, j]) => j >= 0)`). Thad er RETT hegdun — annars felli
   ein tyndur dalkur heila keyrslu — en hun er ThOGUL, og su thogn
   hefur nu kostad tvisvar:

     1. `depthCharts(2026)`: nflverse skipti um snid og af 15 dolkum sem
        listinn bad um var `gsis_id` sa EINI sem lifdi. `r.position` vard
        undefined, sian henti hverri rod, og fallid skradi sig **`ok`
        med "0 rows"**. (Skjalad i haus `depthCharts`.)
     2. `players.csv` 21.8.2026: `draft_club` var endurnefnt `draft_team`
        og `sleeper_id` **tekid ut alveg**. `players()` bad um bada.
        `draftTeam` hefur thvi verid null a ollum 25.049 leikmonnum, og
        `nvBySleeper` — varaleidin ad nflverse-rod thegar audkennisbruin
        thegir — hefur verid TOM Map. Baedi skradu sig `ok`.

   ThETTA FALL GERIR ThOGNINA HAVAERA. Þad er hreint (skilar bara
   listanum); kallandinn skrair rodina i `status.json` med `record`, svo
   drift birtist sem RAUD rod i Sources i stad thess ad hverfa.

   ADEINS FYRSTA LINAN ER ThOTTUD — hausar bera engar linuskiptingar
   innan gaesalappa, og skrarnar eru upp i 43 MB.                    */
export function missingCols(text, pick) {
  if (!pick || !pick.length) return [];
  const nl = text.indexOf("\n");
  const first = nl < 0 ? text : text.slice(0, nl);
  const head = (rows(first)[0] || []);
  return pick.filter((k) => !head.includes(k));
}

/**
 * Tala ur CSV-reit. `""` og `"NA"` verda **null, ekki 0**.
 * Sama regla og i FPL-appinu (CLAUDE.md kafli 8): NULL ER EKKI NULL.
 * nflverse skrifar "NA" fyrir R-NA og thad er gagna-skortur, ekki maeling.
 */
export function num(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "" || s === "NA" || s === "NaN" || s === "null") return null;
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}

/** Tala thar sem vantandi gildi ER raunverulegt null -> 0 (talningar). */
export function num0(v) {
  const x = num(v);
  return x == null ? 0 : x;
}

/** Strengur, tomur/NA -> null. */
export function str(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" || s === "NA" ? null : s;
}
