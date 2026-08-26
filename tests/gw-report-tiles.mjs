/* ============================================================
   UMFERDAR-FLIPINN (📊 Gameweek) — TOLURNAR LESNAR AF SKJANUM

   AF HVERJU ThETTA SAFN ER TIL: `GwReport.jsx` er 673 linur, ber FJORA
   undirflipa, ThRETTAN tolu-kassa i sjalfgefnu synini, tvo sior a
   skotakortinu og "Team of the week" — og ENGIN fullyrding i repoinu las
   EINA einustu tolu af honum. Maelt 21.8.2026 a `SUITES` (73 sofn):

     · `archive-gw-report.mjs` profar SMIDINN (`buildArchiveGwReport` i
       scripts/fetch.mjs) — pipeline-endann, ekki skjainn.
     · `stats.test.mjs` profar `gwTotals`/`bestXi`/`shotSummary` a
       EININGARSVIDI og a tilbunum rodum.
     · `data-resilience.mjs` OPNAR flipann i 16 bilunum en krefst adeins
       ad innihaldid se ekki tomt.
     · `no-icelandic` / `react-warnings` / `monkey` heimsaekja hann.

   Thad er nakvaemlega myndin sem CLAUDE.md kafli 5b lysir: RENDERING ER
   EKKI RETTLEIKI. Flipinn gat birt hvada tolu sem er — eda somu tolu
   fyrir allt — an thess ad nokkud yrdi raudt. Sama ætt sem gaf
   `defcon_opportunity` = 57 fyrir oll 20 lidin og GW-siuna i Teams sem
   hafdi ALDREI gefid tolu.

   ADFERDIN: hver birt tala er borin vid SJALFSTAEDA leidslu ur
   `data/last_gw.json` og `data/last_gw_shots.json` — bein talning i
   thessari skra, EKKERT kall i `gwTotals`, `shotSummary`, `bestXi` ne
   `shotsFor`. Annars vaeri thetta afrit af formulunni og myndi standast
   thott badar utfaerslur vaeru rangar (sbr. `buildTeamMetrics`-atvikid,
   CLAUDE.md kafli 7).

   Team of the week er sannreynt med **NAKVAEMU OHADU HAMARKI**: fyrir
   hverja leyfilega uppstillingu (1 GK · 3-5 DEF · 2-5 MID · 1-3 FWD) er
   summa N staerstu innan hverrar stodu reiknud og hamarkid tekid. Thad er
   annar algrimur en `bestXi` notar og hann er OSKEIKULL. Fullyrdingin er
   ekki tautologia: obundid topp-11 gefur **134** stig medan leyfilega
   hamarkid er **132**, svo skilyrdid BITUR.

   GLUGGA-GILDRAN (CLAUDE.md 8): `textContent` limir gildi saman —
   kassarnir gefa "23Goals1 own goals23Assists...". Thess vegna er hver
   kassi lesinn ur SINU DOM-TRE (`Tile` = <div><div>gildi</div>
   <div>heiti</div>[<div>undirtexti</div>]</div>), aldrei ur samfelldum
   texta.
   ============================================================ */
import { readFileSync } from "node:fs";
const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};
const H = t => console.log(`\n${"─".repeat(78)}\n${t}\n${"─".repeat(78)}`);

/* ============================================================
   0. SJALFSTAEDA LEIDSLAN — bein talning, engin innflutt formula
   ============================================================ */
const gwFile = J("last_gw.json");
const shFile = J("last_gw_shots.json");
const P = gwFile.players || [];
const FX = gwFile.fixtures || [];
const SH = shFile.shots || [];

const sum = f => P.reduce((a, p) => a + (Number(f(p)) || 0), 0);
const count = f => P.filter(f).length;

const REF = {
  players: P.length,
  goals: sum(p => p.goals),
  assists: sum(p => p.assists),
  cs: sum(p => p.cs),
  saves: sum(p => p.saves),
  yellow: sum(p => p.yellow),
  red: sum(p => p.red),
  og: sum(p => p.og),
  bonus: sum(p => p.bonus),
  xg: sum(p => p.xg),
  xa: sum(p => p.xa),
  points: sum(p => p.points),
  hauls: count(p => (p.points ?? 0) >= 10),
  blanks: count(p => (p.minutes ?? 0) >= 60 && (p.points ?? 0) <= 2),
  teams_cs: FX.reduce((a, f) => a + (f.a_score === 0 ? 1 : 0) + (f.h_score === 0 ? 1 : 0), 0),
};
REF.avg_points = REF.players ? +(REF.points / REF.players).toFixed(2) : null;

/* Skota-summur — talning per tegund, engin `shotSummary`.
   SJALFSMORK ERU EKKI SKOT (leidrett 26.8.2026): `total: rows.length`
   taldi `own_goal`-rodina med, sem er skot ANDSTAEDINGSINS og ber
   `team: null`. Reiturinn sagdi 276 medan leikja-spjoldin (sem sia a
   lidi) sogdu 275 — tvaer tolur um sama hlut. Vidmidid er afram
   SJALFSTAETT (engin `shotSummary`), thad er adeins sammala rettu
   skilgreiningunni nu. */
const shotRef = rows => {
  const r = { total: rows.filter(x => x.kind !== "own_goal").length,
              goal: 0, on_target: 0, off_target: 0, blocked: 0,
              woodwork: 0, own_goal: 0, in_box: 0, outside: 0, left: 0, right: 0, head: 0 };
  for (const s of rows) {
    if (r[s.kind] != null) r[s.kind]++;
    if (s.in_box === true) r.in_box++; else if (s.in_box === false) r.outside++;
    if (s.foot && r[s.foot] != null) r[s.foot]++;
  }
  r.on_target_total = r.goal + r.on_target;      // stong telst EKKI a mark
  r.accuracy = r.total ? +((r.on_target_total / r.total) * 100).toFixed(0) : null;
  return r;
};
const SHREF = shotRef(SH);

H("FORSENDUR — gognin sem allt hangir a (thekja er FULLYRDING, ekki logga)");
ok(`last_gw.json ber raunverulega umferd (GW${gwFile.gw} ${gwFile.season}, `
  + `${REF.players} leikmenn, ${FX.length} leikir)`,
  REF.players > 200 && FX.length >= 8 && gwFile.gw >= 1);
ok(`last_gw_shots.json ber skot (${SH.length})`, SH.length > 100);
/* An thessa vaeri hver "talan stemmir"-fullyrding nedar TOM: 0 = 0.      */
ok(`summurnar eru ekki-tomar (${REF.goals} mork, ${REF.assists} upplegg, `
  + `${REF.bonus} bonus)`, REF.goals > 0 && REF.assists > 0 && REF.bonus > 0);

/* ---- NAKVAEMT OHAD HAMARK FYRIR "Team of the week" ----
   Annar algrimur en `bestXi`: uppteljari yfir allar leyfilegar
   uppstillingar, topp-N innan hverrar stodu. Skilar OSKEIKULU hamarki.  */
const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
for (const p of P) if (byPos[p.pos]) byPos[p.pos].push(p);
for (const k of Object.keys(byPos))
  byPos[k].sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.bps ?? 0) - (a.bps ?? 0));
const lineSum = (arr, n) => arr.slice(0, n).reduce((a, x) => a + (x.points ?? 0), 0);
let xiBest = -1, xiShape = null;
for (let d = 3; d <= 5; d++) for (let m = 2; m <= 5; m++) for (let f = 1; f <= 3; f++) {
  if (1 + d + m + f !== 11) continue;
  if (!byPos.GK.length || byPos.DEF.length < d || byPos.MID.length < m || byPos.FWD.length < f) continue;
  const s = lineSum(byPos.GK, 1) + lineSum(byPos.DEF, d) + lineSum(byPos.MID, m) + lineSum(byPos.FWD, f);
  if (s > xiBest) { xiBest = s; xiShape = [d, m, f]; }
}
const top11 = P.slice().sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
  .slice(0, 11).reduce((a, x) => a + (x.points ?? 0), 0);
ok(`uppstillingar-skilyrdid BITUR — obundid topp-11 er ${top11}, leyfilegt `
  + `hamark ${xiBest} (${xiShape?.join("-")})`, top11 > xiBest,
  "— vaeru thau jofn myndi XI-fullyrdingin standast an thess ad profa neitt");

/* ============================================================
   1. HARNESS — appid i jsdom med RAUNVERULEGUM data/
   ============================================================ */
const { JSDOM } = await import("jsdom");
const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");

const dom = new JSDOM("<!doctype html><div id=root></div>",
  { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement; globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.fetch = async u => {
  const n = String(u).split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};
localStorage.setItem("fpl_planner_v3", JSON.stringify({ watch: [] }));

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 600)); });
const settle = async () => { await act(async () => { await new Promise(r => setTimeout(r, 150)); }); };
const fire = async el => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle();
};
const buttons = () => [...document.querySelectorAll("button")];
/* Smellt eftir IKON-forskeyti, ekki nakvaemu heiti — endurnefning a flipa
   felldi tvo prof adur (CLAUDE.md kafli 5).                             */
const tabBtn = pre => buttons().find(b => b.textContent.trim().startsWith(pre));

await fire(tabBtn("📊 Gameweek"));

/* ---- KASSA-LESARINN ----
   `Tile` er <div> med tveim eda thremur <div>-bornum: gildi, heiti,
   [undirtexti]. Vid finnum kassa med thvi ad leita ad barni #2 sem er
   NAKVAEMLEGA eitt af thekktum heitum — tha getur ytri div ekki
   ruglast saman vid kassann sjalfan.                                    */
const readTiles = () => {
  const out = new Map();
  for (const el of document.querySelectorAll("div")) {
    const kids = [...el.children].filter(c => c.tagName === "DIV");
    if (kids.length < 2 || kids.length > 3) continue;
    if (kids.some(c => c.children.length)) continue;      // kassinn er blad
    const label = (kids[1].textContent || "").trim();
    if (!label) continue;
    out.set(label, { v: (kids[0].textContent || "").trim(),
                     sub: kids[2] ? (kids[2].textContent || "").trim() : null });
  }
  return out;
};

H("1) SAMANTEKTAR-LINAN — fimm tolur, lesnar UR SINUM REIT");
{
  /* Linan er `{players} players with numbers · {goals} goals · ...` med
     BERUM bilum i JSX, svo hun ma regexast — en adeins innan sins eigin
     div, aldrei ur `document.body.textContent`.                         */
  const sub = [...document.querySelectorAll("div")]
    .filter(d => /players with numbers/.test(d.textContent || ""))
    .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
  ok("samantektar-linan finnst", !!sub);
  const t = sub ? sub.textContent : "";
  const m = t.match(/^\s*(\d+) players with numbers ·\s*(\d+) goals ·\s*(\d+) assists ·\s*(\d+) clean sheets · average points\s*([\d.]+)\s*$/);
  ok("linan er a thvi sniði sem hun segist vera (engin limd gildi)", !!m, JSON.stringify(t));
  if (m) {
    ok(`leikmenn: ${m[1]} = ${REF.players}`, +m[1] === REF.players);
    ok(`mork: ${m[2]} = ${REF.goals}`, +m[2] === REF.goals);
    ok(`upplegg: ${m[3]} = ${REF.assists}`, +m[3] === REF.assists);
    ok(`hrein blod (per LEIKMANN): ${m[4]} = ${REF.cs}`, +m[4] === REF.cs);
    ok(`medalstig: ${m[5]} = ${REF.avg_points}`, +m[5] === REF.avg_points);
    /* MOTVOGIN: hrein blod per LEIKMANN eru ekki per LID. Vaeri thessu
       vixlad myndi talan hér ad ofan enn "stemma" vid EITTHVAD, svo
       greiningin sjalf er fullyrt.                                      */
    ok(`...og hun er per LEIKMANN, ekki per LID (${REF.cs} != ${REF.teams_cs})`,
      +m[4] !== REF.teams_cs && REF.cs !== REF.teams_cs);
  }
}

H("2) THRETTAN TOLU-KASSAR I YFIRLITINU");
{
  const tiles = readTiles();
  /* Vaentu heitin OG vaenta gildid, hvert leitt sjalfstaett hér ad ofan. */
  const EXPECT = [
    ["Goals", String(REF.goals), `${REF.og} own goals`],
    ["Assists", String(REF.assists), "FPL definition"],
    ["Clean sheets (players)", String(REF.cs), `${REF.teams_cs} teams kept a clean sheet`],
    ["Saves", String(REF.saves), null],
    ["Cards", `${REF.yellow}Y / ${REF.red}R`, null],
    ["Bonus awarded", String(REF.bonus), null],
    ["xG total", REF.xg.toFixed(1), `actual ${REF.goals}`],
    ["xA total", REF.xa.toFixed(1), `actual ${REF.assists}`],
    ["10+ point hauls", String(REF.hauls), null],
    ["Blanks (60+ min, ≤2 pts)", String(REF.blanks), null],
    ["Shots", String(SHREF.total), `${SHREF.in_box} in the box`],
    ["Shots on target", String(SHREF.on_target_total), `${SHREF.accuracy}% on target`],
    ["Woodwork", String(SHREF.woodwork), null],
    ["Blocked shots", String(SHREF.blocked), null],
  ];
  let found = 0;
  for (const [k, v, s] of EXPECT) {
    const got = tiles.get(k);
    if (got) found++;
    ok(`«${k}» = ${v}`, !!got && got.v === v, got ? `fekk «${got.v}»` : "kassinn fannst EKKI");
    if (s != null) ok(`   undirtexti «${k}»: ${s}`, !!got && got.sub === s,
      got ? `fekk «${got.sub}»` : "");
  }
  /* THEKJA ER FULLYRDING: fyndust adeins tveir kassar vaeru 12 rod hér
     ad ofan raudar — en ef leitin sjalf brotnadi myndi HVER rod detta og
     thad er einmitt tilfellid sem thessi lina neglir nidur.             */
  ok(`allir ${EXPECT.length} kassarnir fundust a skjanum (${found})`, found === EXPECT.length);
  /* ...OG THEIR ERU EKKI ALLIR SAMA TALAN (`defcon_opportunity`-aettin). */
  const vals = new Set(EXPECT.map(([k]) => tiles.get(k)?.v).filter(Boolean));
  ok(`kassarnir bera ${vals.size} OLIK gildi — ekki eitt fasta`, vals.size >= 10);
}

H("3) TEAM OF THE WEEK — nakvaemt ohad hamark");
{
  const heads = [...document.querySelectorAll("*")]
    .filter(e => !e.children.length && /Team of the week/.test(e.textContent || ""));
  const hTxt = [...document.querySelectorAll("h3,h2,div")]
    .map(e => (e.textContent || "").trim())
    .find(t => /^Team of the week —\s*\d+\s*pts$/.test(t));
  ok("fyrirsognin ber SUMMUNA", !!hTxt, `heads=${heads.length}`);
  const shown = hTxt ? +hTxt.match(/(\d+)\s*pts/)[1] : null;
  ok(`birt summa ${shown} = nakvaemt leyfilegt hamark ${xiBest}`, shown === xiBest);

  /* Spjoldin sjalf: `XiCard` ber `title` = "{nafn} — {stig} pts, {bps} BPS". */
  const cards = [...document.querySelectorAll("div[title]")]
    .filter(e => / — \d+ pts, -?\d+ BPS$/.test(e.getAttribute("title") || ""));
  ok(`ellefu spjold teiknud (${cards.length})`, cards.length === 11);
  const parsed = cards.map(c => {
    const m = (c.getAttribute("title") || "").match(/^(.*) — (\d+) pts, (-?\d+) BPS$/);
    const kids = [...c.children];
    return { name: m?.[1], pts: +m?.[2], bps: +m?.[3],
             pos: (kids[0]?.textContent || "").trim(),
             shownPts: (kids[3]?.textContent || "").trim() };
  });
  ok(`summa spjaldanna = fyrirsognin (${parsed.reduce((a, x) => a + x.pts, 0)})`,
    parsed.reduce((a, x) => a + x.pts, 0) === shown);
  /* Sniddin ma ekki reka i sundur: `title` og synilega talan.          */
  ok("synilega stiga-talan a hverju spjaldi = talan i `title`",
    parsed.every(x => x.shownPts === String(x.pts)));
  /* Loglegt snid — ATH: 1/3-5/2-5/1-3 er REGLA APPSINS sem thad birtir
     sjalft, svo hun er fullyrt hér ordrett.                            */
  const c = pos => parsed.filter(x => x.pos === pos).length;
  ok(`snidid er logmaett: ${c("GK")} GK · ${c("DEF")} DEF · ${c("MID")} MID · ${c("FWD")} FWD`,
    c("GK") === 1 && c("DEF") >= 3 && c("DEF") <= 5 && c("MID") >= 2 && c("MID") <= 5
    && c("FWD") >= 1 && c("FWD") <= 3);
  /* Hvert stig a spjaldi verdur ad vera STIG THESS MANNS i skranni —
     annars gaeti summan verid rett af tilviljun.                       */
  let matched = 0, wrong = [];
  for (const x of parsed) {
    const cands = P.filter(p => p.name === x.name && p.pos === x.pos);
    if (!cands.length) continue;
    matched++;
    if (!cands.some(p => (p.points ?? 0) === x.pts)) wrong.push(`${x.name} ${x.pts}`);
  }
  ok(`allir ellefu fundust i last_gw.json a nafni+stodu (${matched})`, matched === 11);
  ok(`...og hvert birt stig er STIG THESS MANNS (${wrong.length} rong)`,
    wrong.length === 0, wrong.join(", "));
}

H("4) SKOTAKORTID — SIURNAR HAFA AHRIF (Refresh-aettin)");
{
  await fire(tabBtn("Shot map"));
  /* Vollurinn er EITT svg med `aria-label="Shot map, N shots"`. Adeins
     skot-hringirnir bera <title>, svo punkta-talningin er otvirad — spot-
     hringurinn og logo-hringirnir eru utan.                             */
  const pitch = () => [...document.querySelectorAll("svg[role=img]")]
    .find(s => /^Shot map, /.test(s.getAttribute("aria-label") || ""));
  const dots = () => { const p = pitch(); return p ? p.querySelectorAll("circle > title").length : -1; };
  const label = () => { const p = pitch(); return p ? +(p.getAttribute("aria-label").match(/(\d+)/)?.[1]) : -1; };

  ok("skotakortid teiknast", !!pitch());
  /* ============================================================
     KORTID TEIKNAR SKOT-ATBURDI; REITURINN TELUR SKOT LIDS
     ============================================================
     Thessar tvaer tolur voru bornar vid SOMU staerd og eru thad ekki:
     `own_goal`-rodin ER skot-atburdur (einhver skaut) og a heima a
     kortinu, en hun er EKKI skot lids i sokn — hun ber `team: null` og
     tilheyrir hvorugu lidinu sem SKAUT ad marki andstaedingsins.
     Reiturinn "Shots" telur thvi 275 medan kortid teiknar 276 punkta,
     og BADAR tolur eru rettar um sina spurningu.
     Fullyrdingin er thess vegna a SH.length (allir atburdir), ekki a
     `SHREF.total` (skot lids) — og munurinn er negldur hér ad nedan svo
     hann geti ekki thagnad nidur i eina tolu aftur. */
  ok(`"All matches" -> ${dots()} punktar = ${SH.length} skot-atburdir i skranni`,
     dots() === SH.length);
  ok(`...og aria-label segir SOMU tolu (${label()})`, label() === SH.length);
  ok(`og reiturinn telur SKOT LIDS, sem er einum faerra (${SHREF.total} = ${SH.length} - 1 sjalfsmark)`,
     SHREF.total === SH.length - SH.filter(x => x.kind === "own_goal").length);

  const selects = () => [...document.querySelectorAll("select")];
  ok("tvaer sior eru til: leikur og lid", selects().length === 2);
  const setSel = async (el, v) => {
    await act(async () => {
      const d = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, "value");
      d.set.call(el, v);
      el.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await settle();
  };

  /* ---- LEIKJA-SIAN, ALLIR TIU ----
     Sjalfstaeda vaentingin er bein talning per `fixture` i skranni.     */
  const perFx = new Map();
  for (const s of SH) perFx.set(s.fixture, (perFx.get(s.fixture) ?? 0) + 1);
  const fxOpts = [...selects()[0].options].filter(o => o.value !== "all");
  ok(`leikja-siann bydur ${fxOpts.length} leiki = ${FX.length} i skranni`,
    fxOpts.length === FX.length);
  let fxOk = 0, fxBad = [];
  const seen = new Set();
  for (const o of fxOpts) {
    await setSel(selects()[0], o.value);
    const want = perFx.get(+o.value) ?? 0;
    const got = dots();
    seen.add(got);
    if (got === want && label() === want) fxOk++; else fxBad.push(`${o.value}: ${got}!=${want}`);
  }
  ok(`hver einn af ${fxOpts.length} leikjum gefur SINA tolu (${fxOk} rettar)`,
    fxOk === fxOpts.length, fxBad.join(" "));
  /* MOTVOGIN: vaeru allar tolurnar eins vaeri fullyrdingin hér ad ofan
     satt um sia sem gerir EKKERT (Teams-GW-siann sem aldrei gaf tolu).  */
  ok(`...og tolurnar eru raunverulega OLIKAR (${seen.size} olik gildi)`, seen.size >= 5);

  /* ---- LIDA-SIAN, OG NULL-LIDID ----
     Eitt skot i skranni ber `team: null`. Appid sleppir thvi UR
     valmyndinni (`.filter(Boolean)`) en ThAD ER AFRAM TALID i "All
     teams". Baedi eru fullyrt: valmynd an tomrar radar, OG heildin sem
     inniheldur hana.                                                    */
  await setSel(selects()[0], "all");
  const teamsInFile = [...new Set(SH.map(s => s.team).filter(Boolean))].sort();
  const nullTeam = SH.filter(s => !s.team).length;
  const tOpts = [...selects()[1].options].filter(o => o.value !== "all").map(o => o.value);
  ok(`lida-siann bydur ${tOpts.length} lid = ${teamsInFile.length} i skranni`,
    tOpts.length === teamsInFile.length);
  ok("...engin tom/`null` rod i valmyndinni",
    tOpts.every(v => v && v !== "null" && v !== "undefined"));
  ok(`forsenda fyrir naestu rod: ${nullTeam} skot i skranni bera EKKERT lid`, nullTeam > 0);
  ok(`...og thau eru afram inni i "All teams" (${dots()} = ${SH.length}, `
    + `ekki ${SH.length - nullTeam})`, dots() === SH.length);

  const perTeam = new Map();
  for (const s of SH) if (s.team) perTeam.set(s.team, (perTeam.get(s.team) ?? 0) + 1);
  let tOk = 0, tSeen = new Set();
  for (const t of tOpts) {
    await setSel(selects()[1], t);
    const got = dots();
    tSeen.add(got);
    if (got === (perTeam.get(t) ?? 0)) tOk++;
  }
  ok(`hvert lid gefur SINA tolu (${tOk} af ${tOpts.length})`, tOk === tOpts.length);
  ok(`...og thaer eru olikar (${tSeen.size} gildi)`, tSeen.size >= 5);

  /* ---- SIURNAR VIRKA SAMAN, EKKI HVOR OFAN I ADRA ---- */
  {
    const t = tOpts[0];
    const fx = [...new Set(SH.filter(s => s.team === t).map(s => s.fixture))][0];
    await setSel(selects()[1], t);
    await setSel(selects()[0], String(fx));
    const want = SH.filter(s => s.team === t && s.fixture === fx).length;
    ok(`leikur + lid saman: ${t} i leik ${fx} -> ${dots()} = ${want}`, dots() === want);
    ok("...og thad er STRANGARI en hvor sia ein",
      want < (perTeam.get(t) ?? 0) + 1 && want <= (perFx.get(fx) ?? 0));
  }

  /* ---- ATTA KASSAR UNDIR KORTINU FYLGJA VALINU ---- */
  {
    const fx = +[...selects()[0].options].filter(o => o.value !== "all")[3].value;
    await setSel(selects()[1], "all");
    await setSel(selects()[0], String(fx));
    const r = shotRef(SH.filter(s => s.fixture === fx));
    const tl = readTiles();
    const EXP = [
      ["Shots", String(r.total), null],
      ["On target", String(r.on_target_total), `${r.accuracy}% on target`],
      ["Goals", String(r.goal), null],
      ["Woodwork", String(r.woodwork), null],
      ["Blocked", String(r.blocked), null],
      ["Off target", String(r.off_target), null],
      ["In the box", String(r.in_box), `${r.outside} outside`],
      ["Right / left / head", `${r.right}/${r.left}/${r.head}`, null],
    ];
    let n = 0;
    for (const [k, v, s] of EXP) {
      const got = tl.get(k);
      if (got) n++;
      ok(`leikur ${fx} — «${k}» = ${v}`, !!got && got.v === v,
        got ? `fekk «${got.v}»` : "kassinn fannst EKKI");
      if (s != null) ok(`   undirtexti «${k}»: ${s}`, !!got && got.sub === s, got ? `fekk «${got.sub}»` : "");
    }
    ok(`allir atta kassarnir fundust (${n})`, n === EXP.length);
    await setSel(selects()[0], "all");
  }
}

H("5) LEIKIRNIR — E0-tolur og urslit borin vid skrana");
{
  await fire(tabBtn("Matches"));
  const btn = tabBtn("Matches");
  ok(`flipa-heitid ber fjoldann: «${btn?.textContent.trim()}» = ${FX.length}`,
    btn?.textContent.trim() === `Matches (${FX.length})`);
  const body = document.body.textContent || "";
  /* Rodun: leikirnir eiga ad koma i KICKOFF-rod. Vid berum stodu fyrsta
     og sidasta heimalids i textanum vid rodun skrarinnar.               */
  const byKick = FX.slice().sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
  const posOf = f => body.indexOf(`${f.h}${f.h_score}–${f.a_score}${f.a}`);
  const idx = byKick.map(posOf);
  ok("hver leikur (urslit + lid) finnst a skjanum", idx.every(i => i >= 0),
    JSON.stringify(idx));
  ok("...og their eru i KICKOFF-rod", idx.every((v, i) => i === 0 || v > idx[i - 1]));

  /* ---- HVER RAD LESIN UR SINUM REIT, ALLIR TIU LEIKIR ----
     `MRow` er <div><span>heima</span><span>heiti</span><span>uti</span></div>.
     Ad leita "13" i `textContent` vaeri gagnslaust — "13Shots11" ber
     bæði "13" og "1311" — svo hvert spjald er tekid FYRIR SIG og radirnar
     lesnar ur thremur spans.                                            */
  const cards = [...document.querySelectorAll("div")].filter(el => {
    const t = (el.textContent || "");
    return [...el.children].some(c => c.tagName === "DIV"
      && /· formation ·|from E0/.test(c.textContent || "")) && t.length < 4000;
  });
  const cardOf = f => cards.filter(el =>
      (el.textContent || "").startsWith(`${f.h}${f.h_score}–${f.a_score}${f.a}`))
    .sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
  const rowsOfCard = el => {
    const m = new Map();
    for (const d of el.querySelectorAll("div")) {
      const sp = [...d.children].filter(c => c.tagName === "SPAN");
      if (sp.length !== 3) continue;
      m.set((sp[1].textContent || "").trim(),
        { h: (sp[0].textContent || "").trim(), a: (sp[2].textContent || "").trim(),
          hb: sp[0].style.fontWeight, ab: sp[2].style.fontWeight });
    }
    return m;
  };
  const sumFx = (id, home, key) => {
    let s = null;
    for (const p of P) if (p.fixture === id && !!p.home === home && p[key] != null)
      s = (s ?? 0) + p[key];
    return s == null ? null : +s.toFixed(2);
  };
  const nShots = (id, team, pred = () => true) =>
    SH.filter(s => s.fixture === id && s.team === team && pred(s)).length;

  let e0Rows = 0, e0Bad = [], boldBad = [], oneSided = 0, cardsFound = 0;
  for (const f of byKick) {
    const el = cardOf(f);
    if (!el) { e0Bad.push(`${f.h}-${f.a}: spjald fannst ekki`); continue; }
    cardsFound++;
    const R = rowsOfCard(el);
    const chk = (lbl, h, a) => {
      const r = R.get(lbl);
      if (!r) { e0Bad.push(`${f.h}-${f.a} «${lbl}» vantar`); return; }
      e0Rows++;
      const want = [h == null ? "—" : String(h), a == null ? "—" : String(a)];
      if (r.h !== want[0] || r.a !== want[1])
        e0Bad.push(`${f.h}-${f.a} «${lbl}» ${r.h}/${r.a} != ${want.join("/")}`);
    };
    /* E0 — hrátt ur `fixtures[].stats` i skranni. */
    const st = f.stats || {};
    chk("Shots (E0)", st.shots_h, st.shots_a);
    chk("On target (E0)", st.sot_h, st.sot_a);
    chk("Corners", st.corners_h, st.corners_a);
    chk("Fouls", st.fouls_h, st.fouls_a);
    /* FPL-summad xG — eigin summa yfir leikmenn thessa leiks, heima/uti. */
    const xh = sumFx(f.id, true, "xg"), xa = sumFx(f.id, false, "xg");
    chk("xG (from FPL, summed)", xh?.toFixed(2), xa?.toFixed(2));
    /* ESPN-skotin — eigin talning per lid i thessum leik. */
    chk("Shots", nShots(f.id, f.h), nShots(f.id, f.a));
    chk("In the box", nShots(f.id, f.h, s => s.in_box === true),
                      nShots(f.id, f.a, s => s.in_box === true));
    chk("Woodwork", nShots(f.id, f.h, s => s.kind === "woodwork"),
                    nShots(f.id, f.a, s => s.kind === "woodwork"));
    chk("On target", nShots(f.id, f.h, s => s.kind === "goal" || s.kind === "on_target"),
                     nShots(f.id, f.a, s => s.kind === "goal" || s.kind === "on_target"));
    if (st.referee && !(el.textContent || "").includes(st.referee))
      e0Bad.push(`${f.h}-${f.a}: domarinn (${st.referee}) vantar`);
    /* FEITLETRUNAR-REGLAN — haerri hlidin feit. Tilfellid "annad gildid
       vantar" er EKKI profad hér heldur i kafla 5b: maelt a thessum
       gognum er EKKI EIN rod med "—" a adra hlid (0 af 90), svo
       fullyrding um thad hér gaeti ALDREI fallid — nakvaemlega tóma
       fullyrdingin sem CLAUDE.md 5b lysir.                             */
    for (const [lbl, r] of R) {
      const hn = Number(r.h), an = Number(r.a);
      const numeric = r.h !== "—" && r.a !== "—"
        && Number.isFinite(hn) && Number.isFinite(an);
      if (!numeric) { oneSided++; continue; }
      const wantH = hn > an ? "700" : "400", wantA = an > hn ? "700" : "400";
      if (String(r.hb) !== wantH || String(r.ab) !== wantA)
        boldBad.push(`${f.h}-${f.a} «${lbl}» ${r.h}/${r.a} feitl. ${r.hb}/${r.ab}`);
    }
  }
  ok(`oll ${byKick.length} leikja-spjoldin fundust (${cardsFound})`, cardsFound === byKick.length);
  ok(`${e0Rows} tolu-radir lesnar ur sinum reit og RETTAR (${e0Bad.length} rangar)`,
    e0Bad.length === 0, e0Bad.slice(0, 4).join(" | "));
  ok(`...og thaer eru raunverulega margar (${e0Rows} >= 80)`, e0Rows >= 80,
    "— thekja er fullyrding, ekki logga");
  ok(`feitletrunin fylgir HAERRI tolunni i hverri rod (${boldBad.length} brot)`,
    boldBad.length === 0, boldBad.slice(0, 4).join(" | "));
  /* MAELINGIN SEM GERDI KAFLA 5b NAUDSYNLEGAN: engin rod a raunverulegum
     gognum ber "—" a adra hlid, svo tilfellid VERDUR ad koma ur tilbunum
     gognum.                                                             */
  console.log(`   (radir med vantandi hlid a raungognum: ${oneSided} — thess vegna kafli 5b)`);
}

H("5b) VANTANDI HLID — TILBUID TILFELLI ThAR SEM SVARID ER ThEKKT FYRIRFRAM");
{
  /* `MRow` er ekki flutt ut, svo vid renderum GwReport SJALFAN med
     tilbunum props. Villan sem thetta ver: `+null` er 0 og 0 ER endanleg
     tala, svo heima-hlidin var FEITLETRUD sem "sigurvegari" gegn engu.
     A raungognum er engin slik rod (0 af 90 hér ad ofan), svo an thessa
     kafla vaeri reglan hvergi profud.                                   */
  const { default: GwReport } = await import(new URL("src/GwReport.jsx", REPO).href);
  const synth = {
    season: "2099/00", gw: 1, archive: false,
    fixtures: [{ id: 1, h: "AAA", a: "BBB", h_score: 1, a_score: 0,
      kickoff: "2099-08-01T12:00:00Z",
      /* corners: HEIMA 7, UTI VANTAR. fouls: baedi til, uti haerra. */
      stats: { shots_h: 5, shots_a: 5, sot_h: 2, sot_a: 2,
               corners_h: 7, corners_a: null, fouls_h: 3, fouls_a: 9,
               referee: "R Efereeman" } }],
    players: [
      { name: "Hh", pos: "MID", team: "AAA", opp: "BBB", home: true, fixture: 1,
        minutes: 90, points: 6, goals: 1, assists: 0, cs: 0, xg: 0.5, xa: 0.1, bps: 20 },
      { name: "Aa", pos: "MID", team: "BBB", opp: "AAA", home: false, fixture: 1,
        minutes: 90, points: 2, goals: 0, assists: 0, cs: 0, xg: 0.2, xa: 0.0, bps: 8 },
    ],
  };
  const host = document.createElement("div");
  document.body.appendChild(host);
  const r2 = createRoot(host);
  await act(async () => { r2.render(React.createElement(GwReport, { report: synth, shotsFile: null })); });
  await settle();
  const mBtn = [...host.querySelectorAll("button")].find(b => /^Matches/.test(b.textContent.trim()));
  ok("tilbuni leikurinn gefur Matches-flipa", !!mBtn);
  await act(async () => { mBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle();
  const rows = new Map();
  for (const d of host.querySelectorAll("div")) {
    const sp = [...d.children].filter(c => c.tagName === "SPAN");
    if (sp.length !== 3) continue;
    rows.set((sp[1].textContent || "").trim(),
      { h: (sp[0].textContent || "").trim(), a: (sp[2].textContent || "").trim(),
        hb: String(sp[0].style.fontWeight), ab: String(sp[2].style.fontWeight) });
  }
  const corners = rows.get("Corners"), fouls = rows.get("Fouls");
  ok("«Corners» radin teiknast", !!corners, [...rows.keys()].join(","));
  ok(`vantandi hlid birtist sem «—» (fekk «${corners?.a}»)`, corners?.a === "—");
  ok(`...og talan sem ER til stendur ohreyfd (${corners?.h} = 7)`, corners?.h === "7");
  /* ThETTA ER FULLYRDINGIN: 7 gegn engu er EKKI sigur.                  */
  ok(`...og HVORUG hlidin er feitletrud (${corners?.hb}/${corners?.ab})`,
    corners?.hb !== "700" && corners?.ab !== "700");
  ok(`motvogin: rod med BADAR tolur feitletrar haerri (Fouls 3/9 -> ${fouls?.hb}/${fouls?.ab})`,
    fouls?.h === "3" && fouls?.a === "9" && fouls?.ab === "700" && fouls?.hb !== "700");
  await act(async () => { r2.unmount(); });
  host.remove();
}

H("6) LEIKMENN — porunin verdur ad vera FULL skipting");
{
  await fire(tabBtn("Players"));
  const body = document.body.textContent || "";
  const m = body.match(/(\d+) players matched, (\d+) did not/);
  ok("porunar-linan birtist", !!m, body.slice(0, 120));
  if (m) {
    /* Sjalfstaed fullyrding an thess ad endurgera nafna-porunina: hun er
       SKIPTING a leikmonnum umferdarinnar, svo summan VERDUR ad vera
       heildin. `?? 0` badum megin gaf 0 hja ollum adur i annarri leid
       (CLAUDE.md kafli 12) — hér neglir summan thad nidur.              */
    ok(`${m[1]} + ${m[2]} = ${REF.players} (engin rod tynist ne tvitelst)`,
      +m[1] + +m[2] === REF.players);
    ok(`...og porunin finnur RAUNVERULEGA menn (${m[1]} > 0)`, +m[1] > 0);
  }
}

console.log(`\nUMFERDAR-FLIPINN: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
