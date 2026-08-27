/* ============================================================
   ENDURBYGGIR `data/odds.json` UR COMMITTADA HRAA SVARINU

   HVERS VEGNA (27.8.2026): `odds_raw/` geymir svar bokmakarans ORDRETT og
   er aldrei yfirskrifad — en ekkert gat lesid thad aftur, svo thegar villa
   fannst i umbreytingunni (`preferNextMatch`: naesti leikur, ekki sa
   sidasti) var eina leidin til ad lagfaera skrana AD SAEKJA HANA AFTUR.
   Sokn er kvotud (500 koll/manud) og hlidid hleypir adeins EINNI i hvorn
   glugga, svo skra sem er skokk daginn fyrir frest hefdi stadid thannig
   fram yfir frestinn. Arkiv sem ekki er haegt ad lesa aftur er arkiv ad
   nafninu til.

   ENGIN NETKOLL. Sama umbreyting og pipeline-an notar (`oddsTeamsFromRaw`
   + `oddsFileFrom` ur `fetch.mjs`) — ekkert endurritad, svo endurbyggd
   skra getur ekki verid annad en thad sem soknin hefdi skrifad.

   TIMASTIMPILLINN FYLGIR SVARINU, EKKI KLUKKUNNI: `shouldFetchOdds` gatar
   a aldri `updated`, svo "nuna" myndi loka glugganum i 30 klst til
   vidbotar fyrir gogn sem eru ekki ny.

   KEYRSLA:
       node scripts/rebuild-odds.mjs            (nyjasta arkiv-skrain)
       node scripts/rebuild-odds.mjs --file data/odds_raw/2026-08-27-sharp.json
       node scripts/rebuild-odds.mjs --dry      (skrifar ekkert)
   ============================================================ */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { oddsTeamsFromRaw, oddsFileFrom } from "./fetch.mjs";

const DATA = new URL("../data/", import.meta.url).pathname;
const J = f => JSON.parse(readFileSync(f, "utf8"));
const argv = process.argv.slice(2);
const arg = k => { const i = argv.indexOf(k); return i > -1 ? argv[i + 1] : null; };
const dry = argv.includes("--dry");

const file = arg("--file") || (() => {
  const files = readdirSync(DATA + "odds_raw").filter(f => f.endsWith(".json")).sort();
  if (!files.length) { console.error("odds_raw is empty - nothing to rebuild from"); process.exit(2); }
  return DATA + "odds_raw/" + files[files.length - 1];
})();

const archive = J(file);
const raw = archive.response;
if (!Array.isArray(raw) || !raw.length) {
  console.error(`${file} carries no response array - refusing to write an empty file`);
  process.exit(2);
}

/* `data/teams.json` BER `short`, EN SOKNIN VINNUR MED `short_name`.
   `fetch.mjs:1085` skrifar `short: t.short_name` thegar hun vistar skrana,
   svo hun er ENDURNEFND UTGAFA af bootstrap-rodinni. `clubIndex` les
   `t.short_name`, svo an thessarar vorpunar parast EKKERT felag — mælt:
   20 af 20 ,,unmatched" i fyrstu keyrslu. Vorpunin er skrifud her og
   HVERGI annars stadar: skriftan verdur ad gefa fallinu sama snid og
   soknin gefur thvi, annars er hun ad profa annan heim.               */
const teamsFile = J(DATA + "teams.json");
const teamsById = {};
for (const t of (Array.isArray(teamsFile) ? teamsFile : teamsFile.teams))
  teamsById[t.id] = { ...t, short_name: t.short_name ?? t.short };
let fixtures = [];
try { fixtures = J(DATA + "fixtures.json"); } catch {}

const out = oddsTeamsFromRaw(raw, teamsById);
if (out.unmatched.length) console.warn(`unmatched club names: ${out.unmatched.join(" | ")}`);
if (!out.games) { console.error("no matched games - refusing to overwrite good data"); process.exit(2); }

const built = oddsFileFrom({
  teams: out.teams, fixtures,
  updated: archive.updated, window: archive.window, gw: archive.gw ?? null,
  requestsRemaining: archive.requests_remaining ?? null,
});

let prev = null;
try { prev = J(DATA + "odds.json"); } catch {}
console.log(`source   ${file.split("/data/")[1]}  (${raw.length} matches, fetched ${archive.updated})`);
console.log(`before   gws ${JSON.stringify(prev?.gws ?? null)} · ${Object.keys(prev?.teams || {}).length} clubs`);
console.log(`after    gws ${JSON.stringify(built.gws)} · ${Object.keys(built.teams).length} clubs · `
  + `${out.games} priced${out.unpriced ? `, ${out.unpriced} unpriced` : ""}`);

/* AFTURFOR ER STODVUD: faerri felog en fyrir er merki um ad eitthvad se ad
   umbreytingunni, ekki um ad markadurinn hafi thagnad. Sama regla og
   "tom keyrsla ma aldrei thurrka ut god gogn" (CLAUDE.md 8e).          */
const before = Object.keys(prev?.teams || {}).length;
if (before && Object.keys(built.teams).length < before) {
  console.error(`refusing: ${Object.keys(built.teams).length} clubs against ${before} already on disk`);
  process.exit(2);
}
if (dry) { console.log("--dry: nothing written"); process.exit(0); }
writeFileSync(DATA + "odds.json", JSON.stringify(built, null, 1));
console.log("written  data/odds.json");
