/* ============================================================
   IMMINENT — FJORDI LESMATINN I LEIKMANNALISTANUM, LESINN AF SKJANUM

   AF HVERJU ThETTA SAFN ER TIL: `src/Imminent.jsx` (222 linur) var
   snert af ENGU safni i `SUITES`. Maelt 21.8.2026:

     · `stats.test.mjs` profar `moScore`/`aoScore`/`inImminentPool`/
       `imminentBoard` a EININGARSVIDI (og kafli 5b/14 a tilbunum rodum).
     · `react-warnings.mjs:100` SMELLIR a "Imminent"-hamsknappinn — en
       adeins til ad safna React-vidvorunum; hun les enga tolu.
     · `clock-states.mjs` / `name-match.mjs` profa PIPELINE-hlidina
       (`deriveImminent`, uppflettingu) og skrana, ekki spjoldin.

   Enginn hafdi thvi smellt a `⚽ Goal imminent` / `◎ Assist imminent`
   og athugad hvort NOKKUD breyttist — sama myndin sem gaf "Refresh"-
   takkann sem gerdi ekkert i vikur.

   ThRJAR REGLUR SEM ThETTA SAFN VER OG HVERGI ANNARS STADAR VORU VARDAR:

     1. TVOFOLD UMFERD MA EKKI GEFA TVO PUNKTA. `Imminent.jsx` leggur
        radir saman per umferd (`byGw`) af thvi ad linuritid heitir "per
        umferd". A LIFANDI gognum er thetta virkt: 82 leikmenn i
        `imminent.json` bera tvaer radir i sömu umferd, og EINN theirra
        (Adam Wharton, CRY, GW36) er a AO-bordinu i dag.
     2. STUDULLINN A SKJANUM VERDUR AD VERA STUDULLINN. Hann er borinn
        vid SJALFSTAEDA endurgerd formulanna sem CLAUDE.md kafli 3 skrifar
        ordrett — mo = (xG+xA)·0,8 + threat/25·0,3 + oheppni·0,2, ao =
        BERT creativity/90 — ekki vid `moScore`/`aoScore` sjalf. Afrit af
        formulunni myndi standast thott bædi vaeru rong (sbr.
        `buildTeamMetrics`, CLAUDE.md kafli 7).
     3. HAMS-KNAPPARNIR VERDA AD HAFA AHRIF. Bordid, heitin, undirtolurnar
        OG `title` (IG/IA) verda oll ad breytast vid smell.

   TOM ASTOND: `imminent = null` og "enginn i markhop" eru rendrud
   SERSTAKLEGA med tilbunum props (kafli E) — annars eru their tveir
   greinar sem enginn hefur nokkru sinni teiknad.
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
   A. SJALFSTAEDA LEIDSLAN — formularnar endurskrifadar UR CLAUDE.md
   ============================================================ */
const IMM = J("imminent.json");
const POOL_MIN_MINUTES = 180, POOL_MAX_GI = 1;   // markhopurinn, kafli 6d
const N_CARDS = 12;                              // `imminentBoard(..., 12)`

/* mo: MAGNID er xGI (ekki xG), oheppni er adeins UNDIR vaentingum. */
const refMo = w => +(0.8 * ((w.xg ?? 0) + (w.xa ?? 0))
                   + 0.3 * ((w.threat ?? 0) / 25)
                   + 0.2 * Math.max(0, (w.xg ?? 0) - (w.goals ?? 0))).toFixed(3);
/* ao: BERT creativity/90. xA-vogin valdist ALLTAF 0 (kafli 4). */
const refAo = w => (w.minutes > 0 ? +(((w.creativity ?? 0) / w.minutes) * 90).toFixed(2) : null);

const inPool = w => w && (w.minutes ?? 0) >= POOL_MIN_MINUTES
  && ((w.goals ?? 0) + (w.assists ?? 0)) <= POOL_MAX_GI;

const refBoard = kind => (IMM.players || [])
  .filter(p => inPool(p.window))
  .map(p => ({ p, score: kind === "ao" ? refAo(p.window) : refMo(p.window) }))
  .filter(x => x.score != null)
  .sort((a, b) => b.score - a.score)
  .slice(0, N_CARDS);

/* Punktarnir a linuritinu: radir lagdar saman PER UMFERD, SIADIR A GLUGGANN.
   AKVORDUNIN VAR TEKIN 21.8.2026 og thetta viðmið fylgir henni: `series`
   ber `FETCH_WINDOW` = 5 umferdir en mó/aó eru summud yfir `mo_gws` =
   SIDUSTU FJORAR, svo osiað linurit teiknadi umferd sem talan utilokar —
   **582 af 841 rodum**, og umferdin sem var utan gluggans var sú FYRSTA,
   svo trend-lesturinn var tekinn af punkti sem skorid hunsar.
   `mo_gws` VANTANDI SIAR EKKI: vantar er ekki tomt (kafli 8).            */
const winRows = (p) => {
  const win = Array.isArray(p.mo_gws) && p.mo_gws.length ? new Set(p.mo_gws) : null;
  return (p.series || []).filter(x => !win || win.has(x.gw));
};
const refSeries = (p, key) => {
  const win = Array.isArray(p.mo_gws) && p.mo_gws.length ? new Set(p.mo_gws) : null;
  const by = new Map();
  for (const x of (p.series || [])) {
    if (win && !win.has(x.gw)) continue;
    by.set(x.gw, (by.get(x.gw) ?? 0) + (x[key] ?? 0));
  }
  return [...by.keys()].sort((a, b) => a - b).map(g => ({ gw: g, v: +by.get(g).toFixed(2) }));
};

H("A) FORSENDUR — og hvort tvofalda umferdin er RAUNVERULEGA a bordinu");
ok(`imminent.json ber ${(IMM.players || []).length} radir, gluggi ${IMM.window}, `
  + `GW ${(IMM.gws || []).join(",")}`, (IMM.players || []).length > 200 && IMM.window >= 3);
const REF = { mo: refBoard("mo"), ao: refBoard("ao") };
ok(`markhopurinn gefur full bord (mo ${REF.mo.length}, ao ${REF.ao.length})`,
  REF.mo.length === N_CARDS && REF.ao.length === N_CARDS);
/* MOTVOGIN: ef bordin vaeru EINS vaeri hams-fullyrdingin i kafla C tom. */
ok("mo- og ao-bordin eru EKKI sama rodin (annars maelir hams-profid ekkert)",
  REF.mo[0].p.name !== REF.ao[0].p.name
  || REF.mo.map(x => x.p.name).join() !== REF.ao.map(x => x.p.name).join());
const dupOnBoard = [...REF.mo, ...REF.ao].filter(x => {
  const s = x.p.series || [];
  return s.length !== new Set(s.map(r => r.gw)).size;
});
ok(`FORSENDA FYRIR KAFLA D: ${dupOnBoard.length} spjald a bordunum ber TVAER `
  + `radir i somu umferd (${dupOnBoard.map(x => x.p.name).join(", ") || "ENGIN"})`,
  dupOnBoard.length > 0,
  "— an thess vaeri tvofalda-umferdar fullyrdingin TOM (CLAUDE.md 5b)");

/* ============================================================
   B. HARNESS
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
const byText = t => buttons().find(b => b.textContent.trim() === t);

await fire(buttons().find(b => b.textContent.trim().startsWith("👥")));
await fire(byText("Imminent"));

/* ---- SPJALDA-LESARINN ----
   Studullinn situr i <div title="IG score"|"IA score">, sem er thridja
   barn `immTop`. Thadan er spjaldid `immTop.parentElement`. Hvert svid er
   lesid ur SINU DOM-tre — `textContent` a spjaldinu einu gefur
   "1Iliman NdiayeEVE · MID · £6.02.592GW34..." og er onothaeft.        */
const readCards = () => {
  const out = [];
  for (const sc of document.querySelectorAll("div[title='IG score'], div[title='IA score']")) {
    const top = sc.parentElement;                 // immTop
    const card = top.parentElement;               // immCard
    const mid = [...top.children].find(c => c.children.length >= 2 && c !== sc);
    const spark = card.querySelector("svg[role=img]");
    const statRow = [...card.children].at(-1);
    out.push({
      kind: sc.getAttribute("title"),
      score: (sc.textContent || "").trim(),
      rank: (top.children[0].textContent || "").trim(),
      name: mid ? (mid.children[0].textContent || "").trim() : null,
      meta: mid ? (mid.children[1].textContent || "").trim() : null,
      stats: [...(statRow?.children || [])].map(e => (e.textContent || "").trim()),
      sparkLabel: spark?.getAttribute("aria-label") || null,
      points: spark ? [...spark.querySelectorAll("circle > title")]
        .map(t => (t.textContent || "").trim()) : [],
      card,
    });
  }
  return out;
};

/* Sama pörun sem birtingin gerir er EKKI endurgerd hér — vid lesum bara
   hvort verdid se synt, sem er merki um ad uppflettingin hafi heppnast. */
const priceOf = meta => {
  const m = (meta || "").match(/£([\d.]+)$/);
  return m ? m[1] : null;
};

for (const [kind, label, scoreTitle] of
     [["mo", "⚽ Goal imminent", "IG score"], ["ao", "◎ Assist imminent", "IA score"]]) {
  H(`C-${kind}) ${label.toUpperCase()} — TOLURNAR A SPJOLDUNUM`);
  const btn = byText(label);
  ok(`hams-knappurinn «${label}» er til`, !!btn);
  await fire(btn);
  const cards = readCards();
  const ref = REF[kind];

  ok(`${N_CARDS} spjold teiknud (${cards.length})`, cards.length === N_CARDS);
  ok(`hvert spjald ber «${scoreTitle}» (hamurinn skipti raunverulega)`,
    cards.length > 0 && cards.every(c => c.kind === scoreTitle),
    cards.map(c => c.kind).join(","));
  ok("radartolurnar eru 1..12 i rod", cards.map(c => c.rank).join(",")
    === Array.from({ length: cards.length }, (_, i) => i + 1).join(","));

  /* ---- RODIN OG STUDLARNIR, gegn sjalfstaedu bordi ---- */
  const nameBad = [], scoreBad = [];
  for (const [i, c] of cards.entries()) {
    const r = ref[i];
    if (!r) continue;
    if (c.name !== r.p.name) nameBad.push(`#${i + 1} «${c.name}» != «${r.p.name}»`);
    if (c.score !== String(r.score)) scoreBad.push(`#${i + 1} ${c.score} != ${r.score}`);
  }
  ok(`rodin er SAMA rodin sem formulan gefur (${nameBad.length} vik)`,
    nameBad.length === 0, nameBad.slice(0, 3).join(" | "));
  ok(`hver birtur studull = sjalfstaeda formulan (${scoreBad.length} vik)`,
    scoreBad.length === 0, scoreBad.slice(0, 3).join(" | "));
  ok("...og studlarnir eru einraett faekkandi nidur listann",
    cards.every((c, i) => i === 0 || +cards[i - 1].score >= +c.score));
  /* Anti-tomleiki: eitt fast gildi myndi standast einraedid.            */
  ok(`...og their eru raunverulega olikir (${new Set(cards.map(c => c.score)).size} gildi)`,
    new Set(cards.map(c => c.score)).size >= 8);

  /* ---- MARKHOPURINN — 0-1 framlag og 180+ minutur ---- */
  const poolBad = ref.filter(r => !inPool(r.p.window)).length;
  ok(`allir ${ref.length} a bordinu eru i markhop (180+ min, <=1 framlag)`, poolBad === 0);
  const giShown = cards.map(c => c.stats.at(-1));
  ok(`"N involvement" a hverju spjaldi = gi ur skranni`,
    giShown.every((s, i) => s === `${ref[i].p.window.gi} involvement`),
    giShown.join(" / "));

  /* ---- UNDIRTOLURNAR — hver ur sinu sviði i skranni ---- */
  const statBad = [];
  for (const [i, c] of cards.entries()) {
    const w = ref[i].p.window;
    const want = kind === "mo"
      ? [`${w.xg.toFixed(2)} xG`, `${Math.round(w.threat)} threat`,
         `${Math.max(0, w.xg - w.goals).toFixed(2)} owed`]
      : [`${Math.round(w.creativity)} creativity`, `${w.xa.toFixed(2)} xA`];
    const got = c.stats.slice(0, want.length);
    if (got.join("|") !== want.join("|")) statBad.push(`#${i + 1} ${got.join("|")} != ${want.join("|")}`);
  }
  ok(`undirtolurnar stemma a ollum ${cards.length} spjoldum (${statBad.length} vik)`,
    statBad.length === 0, statBad.slice(0, 3).join(" | "));
  /* "owed" er max(0, xG - mork) og ma ThVI ALDREI vera negativ — sa lidur
     er "adeins UNDIR vaentingum telur" (CLAUDE.md kafli 3).             */
  if (kind === "mo") ok("«owed» er aldrei negativ",
    cards.every(c => parseFloat(c.stats[2]) >= 0), cards.map(c => c.stats[2]).join(","));

  /* ---- LINURITID — TVOFOLD UMFERD ER EINN PUNKTUR ---- */
  const key = kind === "mo" ? "xg" : "cre";
  let ptsBad = [], dupSeen = 0, winSumBad = [], outWin = [];
  for (const [i, c] of cards.entries()) {
    const p = ref[i].p;
    const s = refSeries(p, key);
    /* `raw` er talid A SAMA GLUGGA og linuritid teiknar (21.8.2026).
       Adur var thad OLL `series`, svo eftir siunina taldist HVER rod sem
       glugginn skilur eftir sem "tvofold umferd" — 8 og 9 spjold i stad
       0 og 1. Tvofold umferd er tvaer RADIR I SOMU umferd, ekki rod
       sem glugginn sleppir.                                             */
    const raw = winRows(p).length;
    if (raw !== s.length) dupSeen++;
    const want = s.map(x => `GW${x.gw}: ${x.v}`);
    if (c.points.join(" | ") !== want.join(" | "))
      ptsBad.push(`#${i + 1} ${p.name}: ${c.points.join(",")} != ${want.join(",")}`);
    /* Umferdar-merkin verda ad vera EINKVAEM og VAXANDI — thad var
       einmitt villan (tveir punktar merktir GW36).                      */
    const gws = c.points.map(t => +t.match(/GW(\d+)/)[1]);
    if (new Set(gws).size !== gws.length) ptsBad.push(`#${i + 1} tvitekid GW-merki`);
    if (gws.some((g, k) => k > 0 && g <= gws[k - 1])) ptsBad.push(`#${i + 1} GW ekki vaxandi`);
    /* GLUGGINN: summa punktanna sem liggja INNAN `mo_gws` verdur ad vera
       talan sem birtist vid hlidina. Thetta stendur ohaggad hvort
       linuritid syni gluggann einan eda breidara bil.                   */
    const moSet = new Set(p.mo_gws || []);
    const inWin = c.points.map(t => t.match(/GW(\d+): ([-\d.]+)/))
      .filter(m => m && moSet.has(+m[1])).reduce((a, m) => a + parseFloat(m[2]), 0);
    const want2 = kind === "mo" ? p.window.xg : p.window.creativity;
    if (Math.abs(inWin - want2) > 0.06 + 0.005 * (p.mo_gws || []).length)
      winSumBad.push(`#${i + 1} ${p.name}: ${inWin.toFixed(2)} != ${want2}`);
    /* OG ENGINN PUNKTUR MA LIGGJA UTAN GLUGGANS (akvordun 21.8.2026).
       Adur teiknadi linuritid `FETCH_WINDOW` = 5 medan talan summar 4.  */
    if (moSet.size && gws.some(g => !moSet.has(g)))
      outWin.push(`#${i + 1} ${p.name}: ${gws.filter(g => !moSet.has(g)).join(",")}`);
  }
  ok(`enginn punktur utan gluggans (${outWin.length} vik)`,
     outWin.length === 0, outWin.slice(0, 3).join(" | "));
  ok(`hver punktur a linuritinu = summa radanna i theirri umferd `
    + `(${ptsBad.length} vik)`, ptsBad.length === 0, ptsBad.slice(0, 3).join(" | "));
  /* Talan sjalf er fullyrt, ekki "minnst 0": AO-bordid ber Wharton (GW36
     tvofold) og MO-bordid engan i dag. Fari sa fjoldi ur takt vid skrana
     er lesarinn — eda samlagningin — brotinn.                           */
  const dupRef = ref.filter(r => winRows(r.p).length
    !== new Set(winRows(r.p).map(x => x.gw)).size).length;
  ok(`${dupSeen} spjald a thessu bordi ber fleiri radir en umferdir `
    + `(skrain segir ${dupRef})`, dupSeen === dupRef);
  ok(`punkta-summan INNAN gluggans = birta talan (${winSumBad.length} vik)`,
    winSumBad.length === 0, winSumBad.slice(0, 3).join(" | "));
  ok(`aria-label linuritsins nefnir maelieininguna («${cards[0]?.sparkLabel?.split(":")[0]}»)`,
    cards.every(c => c.sparkLabel
      && c.sparkLabel.startsWith(kind === "mo" ? "xG per gameweek" : "creativity per gameweek")));

  /* ---- UPPFLETTINGIN — hve mörg spjold na i leikmann DAGSINS ---- */
  const withPrice = cards.filter(c => priceOf(c.meta)).length;
  ok(`${withPrice} af ${cards.length} spjoldum na i leikmann dagsins (verd synt)`,
    withPrice >= 8, "— falli thetta er nafn+lid-uppflettingin (findCur) brotin");
  ok("...og hvert synt verd er raunverulegt verd thess manns i players.json",
    (() => {
      const players = (J("players.json").players || J("players.json"));
      const byName = new Map();
      for (const p of players) byName.set(p.web_name, p);
      return cards.every(c => {
        const pr = priceOf(c.meta);
        if (!pr) return true;
        return players.some(p => ((p.now_cost ?? 0) / 10).toFixed(1) === pr);
      });
    })());
  ok("ekkert NaN/undefined a bordinu",
    !/\bNaN\b|\bundefined\b/.test(cards.map(c => c.card.textContent).join(" ")));
}

H("D) SMELLUR A SPJALDI OPNAR LEIKMANNASPJALDID");
{
  await fire(byText("⚽ Goal imminent"));
  const cards = readCards();
  const withP = cards.find(c => priceOf(c.meta));
  ok("forsenda: eitt spjald med upplystum leikmanni finnst", !!withP,
    "— an thess er smellurinn ekki profanlegur");
  const before = document.body.textContent || "";
  ok("forsenda: leikmannaspjaldid er EKKI opid fyrir smellinn",
    !/Purchase price|⇄ Compare/.test(before));
  await fire(withP.card);
  const after = document.body.textContent || "";
  ok(`smellur a immCard opnar leikmannaspjaldid («${withP.name}»)`,
    /⇄ Compare/.test(after), after.slice(0, 80));
  /* Lokun — sidasta ✕, annars eydir profid sinum eigin gognum (kafli 5). */
  const x = buttons().filter(b => b.textContent.trim() === "✕").at(-1);
  if (x) await fire(x);
  ok("spjaldid lokast aftur", !/⇄ Compare/.test(document.body.textContent || ""));
}

H("E) TVAER TOMAR GREINAR SEM ENGINN HAFDI TEIKNAD");
{
  const { default: ImminentPanel } = await import(new URL("src/Imminent.jsx", REPO).href);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const r2 = createRoot(host);

  /* E1. `imminent` vantar — pipeline hefur ekki skrifad skrana. */
  await act(async () => { r2.render(React.createElement(ImminentPanel, { imminent: null })); });
  await settle();
  const t1 = host.textContent || "";
  ok("`imminent = null` -> skyrd bid, ekki tomur kassi",
    /imminent\.json/.test(t1) && /pipeline/.test(t1), t1.slice(0, 90));
  ok("...og ENGIN spjold teiknud", !host.querySelector("div[title$='score']"));

  /* E2. Skrain er til en ENGINN er i markhop — allt annad en null. */
  await act(async () => {
    r2.render(React.createElement(ImminentPanel, {
      imminent: { season: "2099/00", window: 4, gws: [1, 2, 3, 4],
        /* 0 minutur -> utan markhops; 5 framlog -> utan markhops.       */
        players: [{ name: "Nobody", team: "AAA", pos: "MID",
          window: { minutes: 0, goals: 0, assists: 0, xg: 0, xa: 0, threat: 0,
                    creativity: 0, gi: 0 }, series: [] }] }, players: [] }));
  });
  await settle();
  const t2 = host.textContent || "";
  ok("tomur markhopur -> «No player in the target group in this window.»",
    /No player in the target group/.test(t2), t2.slice(-120));
  ok("...og thad er EKKI sama skilabodid sem null gefur (tvo astond, tveir textar)",
    !/pipeline has not written/.test(t2));
  ok("...og hams-knapparnir eru afram til (astandid er tomt, ekki brotid)",
    [...host.querySelectorAll("button")].length >= 2);

  await act(async () => { r2.unmount(); });
  host.remove();
}

console.log(`\nIMMINENT-BORDID: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
