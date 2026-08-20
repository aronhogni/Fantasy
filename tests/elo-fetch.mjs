/* ============================================================
   ELO-SOKNIN — ENDURTILRAUNIR OG SKILABOD

   HVERS VEGNA ThETTA PROF ER TIL: `eloFetch` snertir NETID og var thvi
   omaeld ad ollu leyti. Hun brast a HVERRI EINUSTU keyrslu fra ~14.8.2026
   og stadan sagdi eitt ord: "The operation was aborted due to timeout".
   Thad ord adgreinir EKKI throttlun (allar tilraunir falla a timamorkum)
   fra biludum thjoni (429/5xx) eda snids-breytingu (tom svor) — og
   notandinn stadfesti sjalfur ad ClubElo VAERI UPPI medan stadan sagdi
   "timeout". An munstursins var ekkert haegt ad alykta.

   `eloFetch` er DREGID UT UR `scripts/fetch.mjs` (raunverulegur texti,
   ekki eftirliking) og keyrt a hermdum `fetch` — sama mynstur og
   `defcon-shrink.mjs` og `mins-trend.mjs` kafli 0. Svefninn er hermdur
   lika, svo profid tekur millisekundur en ekki 6,5 minutur.

   Keyrsla:  node tests/elo-fetch.mjs
   ============================================================ */
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (c, n, x = "") => { c ? (pass++, console.log(`  ✓ ${n}`))
                                 : (fail++, console.log(`  ✗ ${n} ${x}`)); };

const src = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
const a = src.indexOf("async function eloFetch(");
ok(a > 0, "eloFetch finnst i scripts/fetch.mjs");
const b = src.indexOf("\nasync function fetchElo()", a);
ok(b > a, "endir fallsins finnst");
const decl = src.slice(a, b);

/* `setTimeout` er skipt ut fyrir fall sem keyrir STRAX — annars taeki
   profid ~6,5 min af hreinni bid. Bidin sjalf er profud a TEXTANUM nedar. */
const mk = (impl) => {
  const calls = [];
  const fakeFetch = async (u, o) => { calls.push(u); return impl(calls.length, u, o); };
  const factory = new Function("fetch", "UA", "setTimeout", "AbortSignal",
    `${decl}\nreturn eloFetch;`);
  return { fn: factory(fakeFetch, "UA", (f) => f(), { timeout: () => null }), calls };
};

console.log(`\n${"=".repeat(84)}`);
console.log("ELO-SOKNIN — ENDURTILRAUNIR OG SKILABOD");
console.log("=".repeat(84));

{
  const { fn, calls } = mk(() => ({ ok: true, status: 200, text: async () => "x".repeat(50) }));
  const t = await fn("http://x");
  ok(t.length === 50 && calls.length === 1, "eitt kall thegar allt er i lagi");
}

{
  let n = 0;
  const { fn, calls } = mk(() => { n++; return n < 3 ? { ok: false, status: 503 }
    : { ok: true, status: 200, text: async () => "y".repeat(50) }; });
  const t = await fn("http://x");
  ok(t.length === 50, "naer i gegn eftir tvo 5xx-fall");
  ok(calls.length === 3, `thrjar tilraunir, ekki fleiri (${calls.length})`);
}

{
  const { fn, calls } = mk(() => { throw new Error("The operation was aborted due to timeout"); });
  let msg = "";
  try { await fn("http://x"); } catch (e) { msg = e.message; }
  ok(calls.length === 6, `SEX tilraunir adur en gefist er upp (${calls.length})`);
  ok(/6 attempts over \d+s all failed/.test(msg), "skilabodin bera FJOLDA og TIMA");
  /* GOLFID VAR SETT INNI I KLIPPINGUNNI (lagad 19.8.2026): `>= 3` stodst
     nakvaemlega thvi 150-stafa thakid hleypti thremur merkjum i gegn. Nu
     eru EINS bilanir thjappadar, svo talan sem skiptir mali er FJOLDINN
     i samantektinni — og hann verdur ad vera `tries`, ekki "minnst 3".  */
  ok(/^6 attempts/.test(msg), "fjoldi tilrauna er sagdur berum ordum");
  ok(/6x /.test(msg), `sex EINS bilanir eru thjappadar i "6x ..." — ${msg.slice(0, 60)}`);
  /* ThETTA ER FULLYRDINGIN SEM FANN VILLU I EIGIN LAGFAERINGU: fyrsta
     utgafan klippti hverja tilraun i 34 stafi, en skilabodin eru 40, svo
     ordid TIMEOUT — thad eina sem adgreinir throttlun — datt burt.     */
  ok(/timeout/i.test(msg), `tegund bilunarinnar helst i skilabodunum: "${msg.slice(0, 56)}"`);
}

{
  /* BLANDAD TILFELLI — ThAD SEM KLIPPINGIN FALDI. Fjorar timamork og tvo
     429 eiga BAEDI ad sjast; adur las thetta eins og hrein throttlun.   */
  let i = 0;
  const { fn } = mk(() => { i++; if (i <= 4) throw new Error("The operation was aborted due to timeout");
                            return { ok: false, status: 429 }; });
  let m = "";
  try { await fn("http://x"); } catch (e) { m = e.message; }
  ok(/timeout/i.test(m) && /429/.test(m),
     `blandad tilfelli synir BADAR tegundir: "${m.slice(0, 90)}"`);
  ok(/4x /.test(m), "og telur endurteknu tegundina");
}

{
  const { fn } = mk(() => ({ ok: true, status: 200, text: async () => "" }));
  let msg = "";
  try { await fn("http://x"); } catch (e) { msg = e.message; }
  ok(/empty response/.test(msg), "tomt svar telst bilun, ekki gild gogn");
}

/* BIDIN OG SNIDID ERU PROFUD A TEXTANUM — thau eru ekki keyranleg her
   (svefninn er hermdur) en mega ekki hverfa thegjandi.                */
ok(/\[5000, 20000, 45000, 90000, 120000\]/.test(decl),
   "dreifd bid (5/20/45/90/120 s) — throttlun hverfur ekki a 70 s");
ok(/http:\/\/api\.clubelo\.com|\$\{url\}|url/.test(decl) && !/https:\/\/api\.clubelo\.com/.test(src.slice(a, b + 400)),
   "ENN `http`, ekki `https` — https hengur (maelt 9.8.2026), ekki 'uppfaera'");

/* ============================================================
   VEF-VARALEIDIN — `parseClubEloWeb` A FRYSTU HTML-I

   HVERS VEGNA: `api.clubelo.com` er ONAAANLEG (0 baet, timeout a 12 s og
   25 s, http OG https, DNS 37.128.134.74) medan `clubelo.com` svarar 200 a
   0,11 s. `elo.json` var thvi frosin fra 14.8.2026 — og frosin Elo er EKKI
   hlutlaus: rekid 14.8. -> 20.8. var medaltal |14,4|, mest 58,8, og RODIN
   breyttist (ARS-MCI forskot 92,9 -> 13). Sja `parseClubEloWeb` i
   `scripts/fetch.mjs`.

   HTML-ID ER FRYST OG COMMITTAD, EKKI SOTT. Net i profasafninu er thad sem
   tok `euro-congestion.mjs` ut ur `npm test` (GitHub 403 a kvota) — safn
   sem fellur af astaedu sem hefur ekkert med maelinguna ad gera er verra en
   ekkert safn. Nyja mynd: `curl -s https://clubelo.com/ | gzip -9 -n > ...`
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("VEF-VARALEIDIN — parseClubEloWeb a frystu HTML-i");
console.log("─".repeat(84));

const { gunzipSync } = await import("node:zlib");
const FIX = new URL("./lib/frozen/clubelo-home-2026-08-20.html.gz", import.meta.url);
const HTML = gunzipSync(readFileSync(FIX)).toString("utf8");
ok(HTML.length > 400000, `frysta HTML-id er heil sida (${HTML.length} baet, maelt 595.036)`);

/* Blokkin er dregin UT UR upprunanum eins og allt annad her — `fetch.mjs`
   kallar `main()` a einingarsvidi og verdur thvi ekki flutt inn.        */
const fbA = src.indexOf("export const ELO_WEB_URL");
const fbB = src.indexOf("/* ---- END ELO WEB FALLBACK ---- */");
ok(fbA > 0 && fbB > fbA, "vef-varaleidin finnst i scripts/fetch.mjs");
const fbDecl = src.slice(fbA, fbB).replace(/^export /gm, "");
const mkParse = () => new Function("console",
  `${fbDecl}\nreturn { parseClubEloWeb, ELO_WEB, ELO_WEB_URL, CLUBELO_CAND, clubeloNorm };`)(
  { log: () => {}, warn: () => {} });
const { parseClubEloWeb, ELO_WEB, ELO_WEB_URL, CLUBELO_CAND } = mkParse();

{
  const rows = parseClubEloWeb(HTML);
  ok(rows.length === 48, `48 ensk lid ur toflunni (maelt 20.8.2026) — ${rows.length}`);
  /* SNIDID VERDUR AD VERA EINS OG CSV-ID GEFUR, annars vaeri porunin
     nidar i `fetchElo` tvaer utfaerslur i stad einnar.                 */
  ok(rows.every(r => typeof r.Club === "string" && r.Club.length > 2
       && Number.isFinite(r.Elo) && Number.isFinite(r.Rank)),
     "hver rod ber Club/Elo/Rank i CSV-sniðinu");
  /* NULL ER EKKI NULL. Vega-blobbid segir Brentford og Coventry "Level 2"
     thott badir seu i PL 2026/27, svo threpid er ekki maelanlegt her og
     ma ekki koma ut sem 0.                                             */
  ok(rows.every(r => r.Level === null), "Level er NULL, ekki 0 — vefurinn veit thad ekki");
  const by = {}; rows.forEach(r => by[r.Club] = r);
  ok(by["Arsenal"]?.Elo === 2005 && by["Arsenal"]?.Rank === 2,
     `Arsenal = 2005 i rod 2 (borid vid vefinn sjalfan) — ${JSON.stringify(by["Arsenal"])}`);
  /* HULL ER PROFSTEINNINN A HEIMILDINA. Hun er i rod 322, thad er UTAN
     hnattraena topp-50 blobsins, svo hefdi bara blobbid verid lesid hefdi
     vantad lid — og "19 af 20" er nakvaemlega utkoman sem thekjan bannar. */
  ok(by["Hull"]?.Elo === 1582 && by["Hull"]?.Rank === 322,
     `Hull = 1582 i rod 322 — utan topp-50, svo TOFLAN er heimildin, ekki blobbid`);
  ok(by["Man City"] && by["Crystal Palace"] && by["Forest"],
     "nofnin eru thau SOMU sem CSV-id gefur (`Man City`, `Crystal Palace`, `Forest`)");
}

/* ---------- STOKKBREYTT HTML VERDUR AD FALLA ---------- */
const rejects = (name, mutHtml, wantRe) => {
  let msg = "";
  try { parseClubEloWeb(mutHtml); } catch (e) { msg = e.message; }
  ok(!!msg && wantRe.test(msg), `${name} -> HAFNAD`, msg ? `(sagdi: ${msg.slice(0, 120)})` : "(fór í gegn!)");
};

/* 1) ARID 2026 I HVERRI ROD. Freistandi bilun thvi "2026" stendur a hverri
      sidu og NAIV 4-stafa regex tekur hana. Svid-profid tekur hana EKKI
      (2026 er innan [1300, 2200]) — sponnin og krossprofid taka hana.   */
rejects("hver rating verdur arid 2026", HTML.replace(/<td class="r">\d+<\/td>/g, '<td class="r">2026</td>'),
        /span only 0 points/);

/* 2) TOFLAN TAEMD. */
rejects("toflunni eytt", HTML.replace(/<tr><td class="l">/g, '<tr><td class="x">'),
        /ranking table has 0 rows/);

/* 3) RANGUR DALKUR — Golo-talan (1,03) i stad Elo. Namundud i heiltolu
      eins og hun kaemi ur toflunni.                                    */
rejects("rangur dalkur (Golo ~1)", HTML.replace(/<td class="r">\d+<\/td>/g, '<td class="r">1</td>'),
        /outside \[1300, 2200\]/);

/* 4) TVAER TOLUR VIXLADAR MILLI RADA — Wolves (rod 99) fær 1674 og
      Coventry (rod 124) fær 1692, svo Elo STIGUR med rodun. Svid, sponn
      og einkvaemni halda OLL, og hvorugt lidid er i hnattraena topp-50
      blobbinu svo KROSSPROFID snertir thau ekki heldur. EINRAENIN er thad
      EINA sem tekur thetta — og thess vegna er hun her.                */
{
  const mut = HTML.replace(/<tr><td class="l">(?:(?!<\/tr>).)*?<\/tr>/g, tr =>
      tr.includes('href="/Wolves"')   ? tr.replace(/<td class="r">\d+<\/td>/, '<td class="r">1674</td>')
    : tr.includes('href="/Coventry"') ? tr.replace(/<td class="r">\d+<\/td>/, '<td class="r">1692</td>')
    : tr);
  ok(mut !== HTML, "stokkbreytingin hitti raunverulega radirnar");
  rejects("tvaer tolur vixladar milli rada (Wolves/Coventry)", mut, /rates above rank/);
}

/* 5) KROSSPROFID SJALFT MA EKKI HORFA. Blobbid fjarlaegt -> engin onnur
      framsetning stydur toluna, og "engin motsogn" af thvi ad enginn
      spurdi er nakvaemlega tom fullyrding (kafli 5b).                  */
rejects("Vega-blobbid fjarlaegt", HTML.replace(/"FedURL"/g, '"FedX"'),
        /could be cross-checked/);

/* 6) BLOBBID OG TOFLAN OSAMMALA — toflu-tolur faerdar um 3 stig. Svid,
      sponn, einkvaemni og einraeni HALDA OLL; krossprofid er thad eina
      sem tekur thetta.                                                 */
rejects("toflan reikar 3 stig fra blobbinu",
        HTML.replace(/<td class="r">(\d+)<\/td>/g, (_, n) => `<td class="r">${+n + 3}</td>`),
        /disagree by 3\./);

/* 7) HLUTAFYLLING — 40 af 48 ensku rodunum fa somu tolu. Sponnin lifir a
      atta raunverulegum gildum, svo EINKVAEMNIN er vordurinn.          */
{
  let n = 0;
  const mut = HTML.replace(/(alt="ENG"(?:(?!<\/tr>).)*?<td class="r">)(\d+)(<\/td>)/g,
    (m, pre, num, post) => (++n > 8 ? `${pre}1700${post}` : m));
  rejects("40 af 48 ensku rodum fa somu tolu", mut, /distinct ratings/);
}

/* 7b) NAFNA-AREKSTUR YFIR LANDAMAERI — BADAR ATTIR.
       Krossprofid flettir upp EFTIR NAFNI, svo utlendur klubbur sem
       normaliserast eins og enskur gaeti kveikt FALSKA hofnun — og fols
       hofnun er DYR her: hun heldur frosnu skranni og segir "HTML-id
       breyttist". Thess vegna er blob-listinn sidadur a `FedURL === "ENG"`.
       Profad i BADAR ATTIR svo fullyrdingin geti raunverulega brugdist:
       SAMA innskotid med `"FedURL": "ENG"` VERDUR ad hafna.             */
{
  const inject = (fed) => HTML.replace("</head>",
    `<script>x = {"Colour":"#000","Elo":1234.5,"FedURL":"${fed}","Level":1,`
    + `"Name":"Arsenal","TLC":"ARS"};</script></head>`);
  let okMsg = "";
  try { parseClubEloWeb(inject("BRA")); } catch (e) { okMsg = e.message; }
  ok(!okMsg, `utlendur klubbur sem heitir "Arsenal" kveikir EKKI falska hofnun — ${okMsg.slice(0, 80)}`);
  rejects('sama innskot merkt "ENG" (svo fullyrdingin ofan getur brugdist)',
          inject("ENG"), /disagree by 77[01]\./);
}

/* 8) LANDS-MERKID BREYTIST. Toflan er hnattraen; ef `alt="ENG"` verdur
      eitthvad annad thattast 643 radir AGAETLEGA og engin theirra er ensk.
      "0 lid" ma ekki lesast eins og "engin ensk lid i deildinni".      */
rejects("lands-merkid breytist (alt=ENG)", HTML.replace(/alt="ENG"/g, 'alt="GBR"'),
        /only 0 English clubs/);

/* ============================================================
   `fetchElo` SJALF — SKRIFAR HUN, OG HVAD SEGIR STADAN?

   ThETTA ER PROFSTEINNINN sem thattarinn einn getur ekki gefid: HOFNUD
   THATTUN VERDUR AD HALDA GOMLU SKRANNI. `writeJSON` er hermd og profid
   fullyrdir ad hun se ALDREI kolluð thegar validering fellur — sama regla
   sem `fetch-bsd-teams.mjs` deyr med `exit 2` fyrir: tom keyrsla ma aldrei
   thurrka ut god gogn.
   ============================================================ */
console.log(`\n${"─".repeat(84)}`);
console.log("fetchElo — hvad er skrifad og hvad segir stadan");
console.log("─".repeat(84));

const feA = src.indexOf("async function fetchElo()");
const feDecl = src.slice(feA, src.indexOf("\n}\n", feA) + 3);
const csvA = src.indexOf("function parseCSV(text)");
const csvDecl = src.slice(csvA, src.indexOf("\n}\n", csvA) + 3);

const TEAMS = JSON.parse(readFileSync(new URL("../data/teams.json", import.meta.url), "utf8")).teams;
const teamsById = {};
for (const t of TEAMS) teamsById[t.id] = { id: t.id, name: t.name, short_name: t.short };
ok(Object.keys(teamsById).length === 20, `20 FPL-lid i stubbnum (${Object.keys(teamsById).length})`);

/* Raunverulegt CSV-svar fra api.clubelo.com — snidid er STADFEST i
   athugasemdinni i `fetchElo` (Club,Country,Level,Elo,Rank).           */
const API_CSV = "Rank,Club,Country,Level,Elo\n"
  + TEAMS.map((t, i) => `${i + 1},${(CLUBELO_CAND[t.short] || [t.name])[0]},ENG,1,${1900 - i}`).join("\n");

const runFetchElo = ({ apiOk = false, html = HTML }) => {
  const calls = [], writes = [], recs = [], warns = [], tries = [];
  const eloFetchStub = async (url, n) => {
    calls.push(url); tries.push([url, n]);
    if (/api\.clubelo\.com/.test(url)) {
      if (!apiOk || /Fixtures/.test(url)) throw new Error("6 attempts over 401s all failed: 6x The operation was aborted due to timeout");
      return API_CSV;
    }
    if (url === ELO_WEB_URL) return html;
    throw new Error(`unexpected url ${url}`);
  };
  const fn = new Function("eloFetch", "today", "parseCSV", "teamsById", "writeJSON",
    "status", "record", "console",
    `${fbDecl}\n${feDecl}\nreturn fetchElo;`)(
    eloFetchStub, "2026-08-20",
    new Function(`${csvDecl}\nreturn parseCSV;`)(),
    teamsById,
    async (p, o) => writes.push([p, o]),
    { updated: "2026-08-20T17:45:00.000Z", sources: {} },
    (n, o, c, note) => recs.push({ n, ok: o, count: c, note }),
    { log: () => {}, warn: m => warns.push(m) });
  return { fn, calls, writes, recs, warns, tries };
};

{ // API nidri, HTML i lagi -> skrifad, og stadan segir HVADAN
  const h = runFetchElo({ apiOk: false });
  let err = null;
  try { await h.fn(); } catch (e) { err = e; }
  ok(!err, `keyrslan gengur upp thott API-ID se nidri — ${err?.message || ""}`);
  const w = h.writes.find(([p]) => p === "elo.json");
  ok(!!w && w[1].teams.length === 20,
     `elo.json skrifud med OLLUM 20 lidum ur vefnum (${w?.[1]?.teams?.length})`);
  ok(!!w && w[1].source === "clubelo.com (website fallback)",
     `skrain sjalf segir hvadan talan kom — source="${w?.[1]?.source}"`);
  const rec = h.recs.filter(r => r.n === "elo").at(-1);
  /* ThETTA ER KRAFA 3: stadan MA EKKI lata sem API-ID hafi virkad. */
  ok(!!rec && /WEBSITE FALLBACK/.test(rec.note || ""),
     `notan segir BERUM ORDUM ad talan kom ur vefnum — "${rec?.note?.slice(0, 90)}"`);
  ok(!!rec && rec.ok === true && rec.count === 20,
     "`ok` er TRUE: skrain ER fersk og validerud (raud rod ofan a ferskri skra thjalfar i ad hunsa raudan lit)");
  const api = h.recs.filter(r => r.n === "elo_api").at(-1);
  ok(!!api && api.ok === false && /timeout/.test(api.note || ""),
     `adalleidin ber SINA EIGIN raudu rod — elo_api ok=${api?.ok}`);
  /* Snidid a hverri rod verdur ad vera obreytt fra CSV-leidinni.       */
  const ars = w[1].teams.find(t => t.short === "ARS");
  ok(ars && ars.fpl_id === 1 && ars.elo === 2005 && ars.rank === 2
     && ars.level === null && ars.clubelo_name === "Arsenal",
     `rod-snidid er obreytt (level NULL, ekki 0) — ${JSON.stringify(ars)}`);
  ok(w[1].teams.every(t => Number.isFinite(t.elo) && t.elo > 1400 && t.elo < 2200),
     "engin NaN og engin tala utan svids i skranni");
}

{ // API nidri, lid endurnefnt -> ENGIN skrif, gamla skrain stendur
  const h = runFetchElo({ apiOk: false,
    html: HTML.replace(/>Sunderland</g, ">Sunderland AFC<") });
  let err = null;
  try { await h.fn(); } catch (e) { err = e; }
  ok(!!err && /matched only 19 of 20/.test(err.message),
     `endurnefnt lid -> KASTAR og telur (${err?.message?.slice(0, 90)})`);
  ok(!!err && /SUN/.test(err.message),
     "og NEFNIR lidid sem vantar (ein lina i CLUBELO_CAND laeknar thad)");
  ok(!h.writes.some(([p]) => p === "elo.json"),
     "GOMLU SKRANNI ER HALDID — `writeJSON` var ALDREI kollud");
}

{ // API nidri, HTML stokkbreytt -> ENGIN skrif
  const h = runFetchElo({ apiOk: false,
    html: HTML.replace(/<td class="r">\d+<\/td>/g, '<td class="r">2026</td>') });
  let err = null;
  try { await h.fn(); } catch (e) { err = e; }
  ok(!!err && /scrape rejected/.test(err.message),
     `stokkbreytt HTML -> KASTAR (${err?.message?.slice(0, 80)})`);
  ok(!h.writes.some(([p]) => p === "elo.json"),
     "og engin skrif — talan sem litur truverdug ut kemst ekki inn");
}

{ // API UPPI -> vefurinn er ALDREI sottur og notan er su gamla
  const h = runFetchElo({ apiOk: true });
  let err = null;
  try { await h.fn(); } catch (e) { err = e; }
  ok(!err, `API-leidin gengur obreytt — ${err?.message || ""}`);
  ok(!h.calls.some(u => u === ELO_WEB_URL),
     "vefurinn er EKKI sottur thegar API-id svarar (varaleid, ekki onnur sokn)");
  const rec = h.recs.filter(r => r.n === "elo").at(-1);
  ok(!!rec && /ENG L1\+L2/.test(rec.note || "") && !/FALLBACK/.test(rec.note || ""),
     `API-notan er obreytt og nefnir ENGA varaleid — "${rec?.note}"`);
  const w = h.writes.find(([p]) => p === "elo.json");
  ok(!!w && w[1].source === "api.clubelo.com" && w[1].teams.length === 20,
     `API-leidin merkir sig sjalf (source="${w?.[1]?.source}", ${w?.[1]?.teams?.length} lid)`);
  ok(!!w && w[1].teams.every(t => t.level === 1),
     "og CSV-threpid (Level 1) helst — null-reglan gildir BARA um vefinn");
}

/* EIN NAFNA-PORUN, EKKI TVAER. `fetchElo` ma ekki skilgreina sina eigin
   toflu — thogul rong porun er verri en engin (BSD: fuzzy felldi Man
   United inn i Man City). Athugasemdir eru fjarlaegdar fyrst; hausinn a
   blokkinni VITNAR i nofnin og leit sem les athugasemdir er tom.       */
{
  const code = feDecl.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok(/CLUBELO_CAND/.test(code) && /clubeloNorm/.test(code),
     "fetchElo notar SAMA nafna-toflu og sama `norm` fyrir badar leidir");
  ok(!/const CAND = \{/.test(code) && !/const norm = /.test(code),
     "og skilgreinir hvorugt sjalf (afritud tafla er tvaer toflur sem reka i sundur)");
  ok(/if \(apiErr && missing\.length > ELO_WEB\.MAX_MISSING\)/.test(code),
     "thekjan er skilyrt vid VARALEIDINA — adalleidin er obreytt, omaeld strangleikabreyting er engin");
  /* MAELT I LIFANDI KEYRSLU: `fetchElo` tok 800 s thar sem 400 s voru
     dagsetta CSV-id og 400 s voru /Fixtures a SAMA daudum hosti.       */
  ok(/eloFetch\("http:\/\/api\.clubelo\.com\/Fixtures", apiErr \? 2 : 6\)/.test(code),
     "/Fixtures endurtekur EKKI fulla stigann a host sem var nybuid ad sanna daudan");
}
{
  /* Og thad er maelt a KOLLUNUM, ekki bara a textanum: tvaer tilraunir a
     /Fixtures thegar adalleidin fell, sex thegar hun virkadi.           */
  const down = runFetchElo({ apiOk: false });
  try { await down.fn(); } catch { /* /Fixtures fellur, thad er rett */ }
  const nDown = down.tries.find(([u]) => /Fixtures/.test(u))?.[1];
  ok(nDown === 2, `API nidri -> /Fixtures fær tries=2 (${nDown}), ekki sex`);
  const up = runFetchElo({ apiOk: true });
  try { await up.fn(); } catch { /* stubburinn latur /Fixtures falla viljandi */ }
  const nUp = up.tries.find(([u]) => /Fixtures/.test(u))?.[1];
  ok(nUp === 6, `API uppi -> /Fixtures heldur fullum stiganum, tries=${nUp}`);
}

console.log(`\nELO-SOKN: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
