/* ============================================================
   entry.mjs — HLEDUR SIDAN RETTA APPID?

   VILLAN SEM THETTA VER, OG HUN SAST BARA I NOTKUN. NFL-hlekkurinn i
   FPL-appinu virkadi i framleidslu en EKKI staðbundid: `nfl/index.html`
   bar `src="/src/main.jsx"`, sem er ALGILD slod og a thvi vid rot THESS
   vefthjons sem svarar. FPL-dev-thjonninn i rot repo-sins ber fram
   `nfl/index.html` (hun liggur inni i honum), og thar leystist hun i
   `/Fantasy/src/main.jsx` — INNGANG FPL-APPSINS.

   Utkoman: slodin breyttist, titillinn sagdi "NFL Fantasy", og
   FPL-appid teiknadist. Fyrir notandann leit thad ut EINS OG EKKERT
   GERDIST. Engin villa, engin vidvorun, ekkert i console.

   TVAER FULLYRDINGAR, OG HVORUG ER UPPFYLLANLEG MED ATHUGASEMD:
     1. HTML-skrarnar sjalfar bera afstaeda inngangsslod.
     2. BYGGDA skrain visar a bunt sem inniheldur NFL-kodann og EKKI
        FPL-kodann — thad er lesid ur skraarinnihaldi, ekki ur texta
        sem einhver skrifadi.
   ============================================================ */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DIST = path.resolve(ROOT, "..", "dist", "nfl");

let fail = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };

/* ---------- 1. INNGANGSSLODIN ER AFSTAED ---------- */
console.log("\n1. inngangsslod i HTML");
{
  const htmls = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  ok(htmls.length > 0, `${htmls.length} HTML-skrar i nfl/`);
  for (const f of htmls) {
    const src = readFileSync(path.join(ROOT, f), "utf8");
    /* Athugasemdir skornar burt fyrst — su sem utskyrir thessa reglu
       NEFNIR "/src/main.jsx" og myndi annars fella profid, eda verra,
       uppfylla thad. */
    const code = src.replace(/<!--[\s\S]*?-->/g, "");
    const entries = [...code.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
    ok(entries.length > 0, `${f}: finn inngang (${entries.join(", ")})`);
    const absolute = entries.filter((e) => e.startsWith("/"));
    ok(absolute.length === 0,
      `${f}: engin ALGILD inngangsslod (${absolute.join(", ") || "hrein"}) — ` +
      "algild slod a vid rot THESS thjons sem svarar, ekki thessa apps");
  }
}

/* ---------- 2. BYGGDA SKRAIN VISAR A NFL-BUNTINN ---------- */
console.log("\n2. byggda skrain hledur NFL-appinu");
if (!existsSync(path.join(DIST, "index.html"))) {
  console.log("  (dist/nfl vantar — keyrdu npm run build)");
} else {
  const html = readFileSync(path.join(DIST, "index.html"), "utf8");
  const assets = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
  ok(assets.length === 1, `einn inngangs-bunt (${assets.join(", ")})`);

  /* Slodin i HTML ber grunnslodina ("/Fantasy/nfl/..."); a disknum
     liggur eignin undir dist/nfl. Tokum thvi hlutann fra "assets/". */
  const rel = assets[0].slice(assets[0].indexOf("assets/"));
  const file = path.join(DIST, rel);
  ok(existsSync(file), `buntinn er til (${assets[0]})`);
  if (existsSync(file)) {
    const js = readFileSync(file, "utf8");
    /* Strengir sem eru ADEINS til i sinu appi. Their eru lesnir UR
       BUNTINUM, svo thetta er ekki haegt ad uppfylla med athugasemd. */
    const nflOnly = ["Connect your Sleeper draft", "Value over replacement"];
    /* "Leaderboard" var fyrsta valid og thad var RANGT: NFL-appid ber
       thad ord lika (Experts-flipinn). Profid felldi mig a thvi, sem
       er retta hegdunin — einkenni verdur ad vera SANNANLEGA einkvaemt.
       Thessi thrju eru 0 i ollum nfl/src-skram, stadfest med grep. */
    const fplOnly = ["FFDR", "Wildcard", "Free Hit"];
    const hasNfl = nflOnly.filter((s) => js.includes(s));
    const hasFpl = fplOnly.filter((s) => js.includes(s));
    ok(hasNfl.length === nflOnly.length,
      `buntinn ber NFL-vidmotid (${hasNfl.length}/${nflOnly.length})`);
    ok(hasFpl.length === 0,
      `og EKKI FPL-vidmotid (${hasFpl.join(", ") || "hreint"})`);
  }

  /* Titillinn ma ekki hafa fylgt roðinni — hann var RETTUR i villunni
     og thad var einmitt thad sem gerdi hana osynilega. */
  ok(/NFL Fantasy/.test(html), "titillinn nefnir NFL");
}

/* ---------- 3. GRUNNSLODIN ER SU SEM SIDAN ER BORIN FRAM A ---------- */
console.log("\n3. grunnslod");
{
  const cfg = readFileSync(path.join(ROOT, "vite.config.js"), "utf8");
  const m = /base:\s*"([^"]+)"/.exec(cfg);
  ok(m && m[1] === "/Fantasy/nfl/",
    `base er "${m ? m[1] : "?"}" — verdur ad passa vid slodina a GitHub Pages`);
  const out = /outDir:\s*"([^"]+)"/.exec(cfg);
  ok(out && out[1].includes("dist/nfl"),
    `outDir er "${out ? out[1] : "?"}" — FPL-byggingin tæmir dist/, svo NFL ` +
    "verdur ad byggja i sina eigin undirmoppu OG a eftir henni");
}

console.log(fail ? `\n${fail} PROF FELLU` : "\noll prof graen");
process.exit(fail ? 1 : 0);
