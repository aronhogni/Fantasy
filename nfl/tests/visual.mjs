/* ============================================================
   visual.mjs — UTLITID MAELT I ALVORU VAFRA.

   ÞETTA ER PROFID SEM `layout.mjs` GETUR EKKI VERID. jsdom reiknar
   ekkert utlit: breiddir eru null, ekkert brotnar, ekkert skarast og
   `matchMedia` er ekki til. Graent utlitsprof i jsdom er thvi engin
   sonnun um utlit — thad er sonnun um DOM.

   Hér er keyrdur Chrome i headless-ham (`tests/lib/chrome.mjs`, engir
   nyir pakkar) og maelt thad sem notandinn ser:

     · skrunar sidan larett? — a FJORUM breiddum, ollum flipum
     · komast haus-heiti fyrir i sinum dalki, eda eru thau klippt?
     · felst efsta rodin bak vid fasta hausinn?
     · skarast spjold?
     · er eitthvad UTAN skjas til vinstri (negativ x)?
     · villur i console vid raunverulega hledslu

   REGLAN SEM GILDIR HER: mælt, ekki skodad. Skjamynd sannar ekkert
   sjalf — hun er til svo haegt se ad SKODA thad sem maelingin flaggar.
   ============================================================ */

import path from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { launch, serve, chromeAvailable } from "./lib/chrome.mjs";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DIST = path.resolve(ROOT, "..", "dist", "nfl");
const DATA = path.join(ROOT, "data");
const SHOTS = path.join(ROOT, "..", "dist", "shots");

let fail = 0, notes = 0;
const ok = (c, m) => { if (c) console.log(`  ok   ${m}`); else { console.log(`  FAIL ${m}`); fail++; } };
const note = (m) => { console.log(`  ·    ${m}`); notes++; };

if (!chromeAvailable()) {
  console.log("  Chrome fannst ekki — utlitsprofid er SLEPPT.");
  console.log("  (Thad er ekki thad sama og ad utlitid se i lagi.)");
  process.exit(0);
}

/* ============================================================
   BYGGINGIN VERDUR AD VERA TIL ADUR EN VID KENNUM APPINU UM
   ============================================================
   ÞETTA FLOKTI OG GREININGIN VAR RONG THANGAD TIL MAELIRINN SAGDI
   SATT. Profid sagdi "appid hledst ekki" — en thegar skjatextinn var
   prentadur stod thar:

     HTTP ERROR 404 · No webpage was found for .../Fantasy/nfl/

   Thad var MINN EIGIN profthjonn ad skila 404, thvi `dist/nfl/index.html`
   var ekki til i thad skiptid. Astaedan er utan thessa verkefnis:
   FPL-hlutinn byggir i SOMU `dist/`-moppu og `emptyOutDir` thurrkar
   hana, og tvaer lotur vinna a thessu vinnutre samtimis.

   VILLA I UMHVERFINU MA EKKI LITA UT EINS OG VILLA I APPINU. Nu er
   byggingin stadfest fyrst, endurbyggd EINU SINNI ef hun vantar, og
   se hun enn ekki til er thvi SLEPPT med skyringu — sem er annad en
   ad segja ad utlitid se i lagi.                                    */
if (!existsSync(path.join(DIST, "index.html"))) {
  console.log("  dist/nfl vantar — bygg einu sinni…");
  spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: "ignore" });
}
if (!existsSync(path.join(DIST, "index.html"))) {
  console.log("  BYGGINGIN VANTAR ENN (dist/nfl/index.html).");
  console.log("  Thad er UMHVERFID, ekki utlitid: FPL-hlutinn byggir i somu");
  console.log("  dist/-moppu og emptyOutDir thurrkar hana. Profinu er SLEPPT.");
  process.exit(0);
}

const site = await serve(DIST, DATA);
const b = await launch({ width: 1440, height: 900 });

/* Bidum eftir ad flipar seu komnir — `#root` med born dugar ekki,
   thad er satt um leid og skelin teiknast. */
const ready = async () => {
  /* 30 s. Undir alagi (threttan sofn a undan) tekur bædi Chrome-raesing
     og fyrsta teikning lengri tima, og of stuttur bidtimi gaf floktandi
     "appid hledst ekki" sem var RONG greining. */
  let last = null, err = null;
  for (let i = 0; i < 120; i++) {
    try {
      last = await b.eval("return document.querySelectorAll('button.tab').length");
    } catch (e) { err = String(e.message).slice(0, 120); }
    /* ÞRIR, EKKI SEX — OG ÞAÐ ER EKKI LINUN.
       Fra 12.8.2026 eru sex flipar FALDIR (notandinn bad um adeins
       Draft + forsiduna), svo appid teiknar retteilega 3 hnappa:
       Draft, My team og "More". Þessi lykkja spyr EINGONGU "teiknadist
       flipastikan?" — thekjuna sjalfa ber `REAL.length >= 6` HÉR A
       EFTIR, eftir ad "More" hefur verid opnad. Tvaer olikar
       spurningar sem deildu einni tolu; nu eru thaer adskildar. Vaeri
       throskuldurinn her einfaldlega laekkadur OG hinn fjarlaegdur
       hefdi thekjan horfid thogult. */
    if (last >= 3) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  const dump = await b.eval(
    "return (document.body.innerText || '').slice(0, 240)").catch(() => "(ekkert)");
  const url = await b.eval("return location.href").catch(() => "?");
  console.log(`     (sidasta talning: ${last}, villa: ${err || "engin"})`);
  console.log(`     (slod: ${url})`);
  console.log(`     (a skjanum: ${JSON.stringify(dump)})`);
  return false;
};

await b.goto(site.url);
ok(await ready(), "appid hledst og flipastikan teiknast");

/* ============================================================
   FALDIR FLIPAR VERDA AD VERA OPNADIR ADUR EN THAD ER TALID
   ============================================================
   Frá 12.8.2026 eru sex flipar FALDIR (notandinn bad um ad sja adeins
   Draft og forsiduna). Their eru afram til, afram virkir og afram
   letihladnir — en their eru ekki i DOM fyrr en "More" er smellt.

   AN THESSA HEFDI THEKJAN HRUNID UR 8 I 2 og lykkjurnar hér a eftir
   hefdu skodad tvo flipa i stad atta. Talningin `REAL.length >= 6`
   hefdi fellt profid, sem er RETT hegdun — en rett svar er ad OPNA
   thá, ekki ad laekka throskuldinn. Ad laekka hann vaeri ad henda
   thekju til ad halda profinu graenu.                              */
const revealed = await b.eval(`
  const more = [...document.querySelectorAll('button.tab')]
    .find(t => /More/.test(t.textContent || ''));
  if (more) { more.click(); await new Promise(r => setTimeout(r, 250)); return true; }
  return false;`);
console.log(`  ${revealed ? "faldir flipar opnadir (\"More\")" : "engir faldir flipar"}`);

const TABS = await b.eval(
  "return [...document.querySelectorAll('button.tab')].map(t => t.textContent.trim())");
const REAL = TABS.filter((t) => !/FPL/.test(t) && !/More/.test(t));

/* ============================================================
   ÞEKJA ER FULLYRDING, EKKI LOGGA
   ============================================================
   ÞETTA VAR GAT I ThESSU PROFI SJALFU. Thegar `ready()` brast vard
   `REAL` TOMUR — og tha lykkja kaflar 1 til 4b yfir ekkert og prenta
   "ok" fyrir hverja breidd. Safnid sagdi "ekkert larett yfirflaedi"
   THEGAR THAD HAFDI EKKI SKODAD EINN EINASTA FLIPA.

   Nakvaemlega bilunin sem CLAUDE.md 5b lysir: prof sem finnur ekkert
   og heldur bara afram er graent og maelir EKKERT. Talan verdur ad
   FELLA profid.                                                    */
ok(REAL.length >= 6,
  `${REAL.length} flipar til ad skoda — allt sem a eftir kemur lykkjar yfir thennan lista`);
if (REAL.length < 6) {
  console.log("\n  Flipalistinn er tomur eda of stuttur; allt sem a eftir kemur");
  console.log("  vaeri lettvaegt graent. Haetti hér.");
  b.close(); site.server.close();
  process.exit(1);
}

/** Smellir a flipa eftir texta og bidur eftir teikningu. */
const openTab = async (label) => {
  await b.eval(`
    const t = [...document.querySelectorAll('button.tab')]
      .find(x => x.textContent.includes(${JSON.stringify(label.slice(0, 6))}));
    if (t) t.click();
    return true;`);
  await new Promise((r) => setTimeout(r, 900));
};

/* ============================================================
   1. LARETT SKRUN — A FJORUM BREIDDUM
   ============================================================
   Reglan i styles.css: "Sidan skrunar HVERGI larett. Breidar toflur
   fa sinn eigin skrun-kassa." `overflow-x: hidden` a `body` FELUR
   yfirflaedid en lagar thad ekki — thess vegna er maelt a `.shell`
   OG a hverju spjaldi, ekki bara a `documentElement`.            */
console.log("\n1. larett skrun");
const WIDTHS = [[1440, 900, "skjar"], [1024, 800, "spjaldtolva"],
                [768, 900, "litil spjaldtolva"], [390, 844, "simi"]];
for (const [w, h, name] of WIDTHS) {
  await b.resize(w, h);
  await new Promise((r) => setTimeout(r, 400));
  const bad = [];
  for (const tab of REAL) {
    await openTab(tab);
    const r = await b.eval(`
      const de = document.documentElement;
      const shell = document.querySelector('.shell');
      /* Hvad stendur ut fyrir? Adeins thad sem er EKKI i skrunkassa. */
      const over = [...document.querySelectorAll('.panel, .shell, .row, .kpis')]
        .filter(el => !el.closest('.tablewrap'))
        .filter(el => el.scrollWidth > el.clientWidth + 2)
        .map(el => el.className + ' (' + el.scrollWidth + '>' + el.clientWidth + ')');
      return { page: de.scrollWidth - de.clientWidth,
               shell: shell ? shell.scrollWidth - shell.clientWidth : 0,
               over: over.slice(0, 3) };`);
    if (r.page > 1 || r.shell > 1 || r.over.length) {
      bad.push(`${tab} [${w}px] sida+${r.page} skel+${r.shell} ${r.over.join(", ")}`);
    }
  }
  ok(bad.length === 0, `${name} (${w}px): ekkert larett yfirflaedi` +
    (bad.length ? ` — ${bad.slice(0, 2).join(" · ")}` : ""));
}

/* ============================================================
   2. HAUS-HEITI KLIPPAST
   ============================================================
   FPL-lærdómurinn: stafamatid 5,9 px lifdi i thrjar vikur af thvi ad
   thad var *naerri* rettu (6,32) og braut 34 haus-heiti. Hér er
   ekkert giskad — vafrinn segir hvad komst fyrir.                */
console.log("\n2. haus-heiti komast fyrir");
await b.resize(1440, 900);
{
  const clipped = [];
  for (const tab of REAL) {
    await openTab(tab);
    const r = await b.eval(`
      const out = [];
      for (const th of document.querySelectorAll('table.data thead th')) {
        if (!th.textContent.trim()) continue;
        /* nowrap + minni clientWidth en scrollWidth = klippt heiti. */
        if (th.scrollWidth > th.clientWidth + 1) {
          out.push(th.textContent.trim() + ' (' + th.clientWidth + '<' + th.scrollWidth + ')');
        }
      }
      return out;`);
    if (r.length) clipped.push(`${tab}: ${r.slice(0, 4).join(", ")}`);
  }
  ok(clipped.length === 0,
    `engin klippt haus-heiti${clipped.length ? " — " + clipped.slice(0, 3).join(" · ") : ""}`);
}

/* ============================================================
   3. EFSTA RODIN BAK VID FASTA HAUSINN
   ============================================================
   Nakvaemlega villan sem athugasemdin i styles.css lysir: an
   `.banded` skildi hausinn eftir 22 px gat og leikmadur nr. 1 var
   ekki synilegur. Hér er thad MAELT: efsta gagnarodin verdur ad
   byrja nedan vid nedri brun hausrodarinnar.                     */
console.log("\n3. efsta rodin er synileg");
{
  const hidden = [];
  for (const tab of REAL) {
    await openTab(tab);
    const r = await b.eval(`
      const out = [];
      for (const t of document.querySelectorAll('table.data')) {
        const head = t.querySelector('thead');
        const first = t.querySelector('tbody tr');
        if (!head || !first) continue;
        const hb = head.getBoundingClientRect().bottom;
        const ft = first.getBoundingClientRect().top;
        /* Sticky-haus situr ofan a; se efsta rodin OFAR en nedri brun
           hausins er hun undir honum. 1 px vikmork fyrir namundun. */
        if (ft < hb - 1) out.push(Math.round(hb - ft) + 'px falid');
      }
      return out;`);
    if (r.length) hidden.push(`${tab}: ${r.join(", ")}`);
  }
  ok(hidden.length === 0,
    `engin tafla felur efstu rodina${hidden.length ? " — " + hidden.join(" · ") : ""}`);
}

/* ============================================================
   4. SKORUN OG UTAN-SKJAS
   ============================================================ */
console.log("\n4. skorun spjalda");
{
  const problems = [];
  for (const [w, h, name] of [[1440, 900, "skjar"], [390, 844, "simi"]]) {
    await b.resize(w, h);
    await new Promise((r) => setTimeout(r, 300));
    for (const tab of REAL) {
      await openTab(tab);
      const r = await b.eval(`
        const els = [...document.querySelectorAll('.panel')];
        const bad = [];
        for (let i = 0; i < els.length; i++) {
          if (els[i].getBoundingClientRect().left < -1) {
            bad.push('spjald utan skjas til vinstri');
          }
          for (let j = i + 1; j < els.length; j++) {
            /* HREIDRUN ER EKKI SKORUN. Fyrsta utgafa thessa profs
               taldi spjald-i-spjaldi sem "skorun" og gaf falskt
               jakvaett. Innihald er eðlilegt; thad sem er villa er
               tvennt ANNAD, og thad er profad ser: */
            if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
            const a = els[i].getBoundingClientRect();
            const c = els[j].getBoundingClientRect();
            const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left);
            const oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
            if (ox > 4 && oy > 4) {
              bad.push('tvo osjalfstaed spjold skarast ' + Math.round(ox) + 'x' + Math.round(oy));
            }
          }
        }
        return [...new Set(bad)];`);
      if (r.length) problems.push(`${tab} [${name}]: ${r.slice(0, 2).join(", ")}`);
    }
  }
  ok(problems.length === 0,
    `ekkert skarast eda fer ut fyrir${problems.length ? " — " + problems.slice(0, 3).join(" · ") : ""}`);
}

/* ============================================================
   4b. SPJALD INNI I SPJALDI
   ============================================================
   `.panel` ber sinn eigin ramma, bakgrunn og fyllingu. Spjald inni i
   spjaldi gefur thvi RAMMA INNAN RAMMA og tvofalda fyllingu — thad
   litur ut eins og bilun tho ekkert skarist.

   ÞETTA GERDIST: `Replication` og `Shapes` (baedi ny) skiluðu `.panel`
   en voru sett inn i spjaldid sem `HeadToHead` byr i. `HeadToHead`
   skilar `.note` og a heima thar; hin tvo attu heima UTAN. Fyrsta
   utgafa profsins flaggadi thetta sem "skorun", sem var rett merki af
   rangri astaedu — hreidrun er ekki skorun. Nu er thad sin eigin
   regla og hun segir hvad er ad.                                  */
console.log("\n4b. spjald inni i spjaldi");
{
  await b.resize(1440, 900);
  const nested = [];
  for (const tab of REAL) {
    await openTab(tab);
    const r = await b.eval(`
      return [...document.querySelectorAll('.panel .panel')]
        .map(p => (p.querySelector('h2')?.textContent || '(an fyrirsagnar)').slice(0, 40));`);
    if (r.length) nested.push(`${tab}: ${r.join(", ")}`);
  }
  ok(nested.length === 0,
    `ekkert spjald inni i odru${nested.length ? " — " + nested.join(" · ") : ""}`);
}

/* ============================================================
   5. SIMAHAMUR — RAUNVERULEG matchMedia
   ============================================================
   FPL-verkefnid komst ad thvi ad `narrow` var FAST FALSE i ollum
   profum thvi jsdom hefur enga `matchMedia`. Hér er hun raunveruleg,
   svo baðar greinar keyra.                                       */
console.log("\n5. simahamur (390px)");
{
  await b.resize(390, 844);
  await new Promise((r) => setTimeout(r, 500));
  const m = await b.eval(`
    return { innerWidth: window.innerWidth,
             matchMedia: typeof window.matchMedia === 'function',
             narrowQuery: window.matchMedia('(max-width: 560px)').matches };`);
  ok(m.matchMedia && m.innerWidth === 390,
    `raunveruleg matchMedia og innerWidth ${m.innerWidth}`);
  ok(m.narrowQuery, "simafyrirspurnin er virk (max-width: 560px)");

  /* Flipastikan ma brjota sig en ekki hverfa ne rydja. */
  const tabs = await b.eval(`
    const bar = document.querySelector('.tabs');
    const r = bar.getBoundingClientRect();
    return { visible: r.height > 0, right: Math.round(r.right),
             count: bar.querySelectorAll('button.tab').length,
             overflow: bar.scrollWidth - bar.clientWidth };`);
  ok(tabs.visible && tabs.count >= 6, `flipastikan synileg med ${tabs.count} flipum`);
  ok(tabs.overflow <= 1, `flipastikan rydur ekki (yfirflaedi ${tabs.overflow}px)`);

  /* Tofluhausar mega ekki vera breidari en skjarinn ÁN skrunkassa. */
  const t = await b.eval(`
    const w = document.querySelector('.tablewrap');
    if (!w) return null;
    return { wrapWidth: Math.round(w.clientWidth),
             tableWidth: Math.round(w.querySelector('table')?.scrollWidth || 0),
             scrollable: w.scrollWidth > w.clientWidth };`);
  if (t) {
    ok(t.wrapWidth <= 390, `skrunkassinn er innan skjas (${t.wrapWidth}px)`);
    ok(t.scrollable, `og taflan skrunar INNAN hans (tafla ${t.tableWidth}px)`);
  }
}

/* ============================================================
   6. VILLUR I CONSOLE VID RAUNVERULEGA HLEDSLU
   ============================================================ */
console.log("\n6. console vid raunverulega hledslu");
{
  const errs = b.events
    .filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")
    .map((e) => e.params.entry.text);
  const exceptions = b.events
    .filter((e) => e.method === "Runtime.exceptionThrown")
    .map((e) => e.params.exceptionDetails.exception?.description || "");
  for (const t of [...errs, ...exceptions].slice(0, 5)) console.log(`     ${t.slice(0, 160)}`);
  /* 404 a gagnaskram sem eru letihladdar ur RAW-slodinni eru ekki
     appvilla — skrarnar eru sottar af GitHub i framleidslu. */
  const real = [...errs, ...exceptions].filter((t) => !/404|Failed to load resource/.test(t));
  ok(real.length === 0, `engar raunverulegar villur (${real.length})`);
}

/* ============================================================
   6b. NEIKVAETT NULL A SKJANUM
   ============================================================
   `(-0.04).toFixed(1)` gefur "-0.0". I dalki sem heitir "Value" les
   thad eins og eigid gildi vid hlidina a "0.0" — thad segir "adeins
   undir markadi" thegar retta svarid er "a markadsverdi".

   ÞETTA VAR THEGAR LEYST i `DraftBoard.jsx`, med rettri utfaerslu og
   rettri athugasemd. En hun var STOK THAR, svo leikmannalistinn erfdi
   hana ekki og fjorir leikmenn i topp-tiu baru "-0.0". Lærdómur sem er
   lærdur a einum stad og ekki fluttur er ekki lærdur — thess vegna
   leitar thetta profa a ollum flipum, ekki i einni skra.

   Sama gildir um "+0.0", sem er jafn merkingarlaust.               */
console.log("\n6b. neikvaett null");
{
  await b.resize(1440, 900);
  const found = [];
  for (const tab of REAL) {
    await openTab(tab);
    const r = await b.eval(`
      const bad = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walk.nextNode())) {
        const t = n.nodeValue.trim();
        if (/^[-−+]0[.,]0+$/.test(t)) {
          const cell = n.parentElement?.closest('td,th,span,div');
          bad.push(t + ' i "' + (cell?.className || cell?.tagName || '?') + '"');
        }
      }
      return [...new Set(bad)].slice(0, 5);`);
    if (r.length) found.push(`${tab}: ${r.join(", ")}`);
  }
  ok(found.length === 0,
    `hvergi "-0.0" ne "+0.0"${found.length ? " — " + found.join(" · ") : ""}`);
}

/* ============================================================
   7. SKJAMYNDIR — TIL AD SKODA, EKKI TIL AD SANNA
   ============================================================ */
console.log("\n7. skjamyndir");
{
  await mkdir(SHOTS, { recursive: true });
  await b.resize(1440, 900);
  let n = 0;
  for (const tab of REAL) {
    await openTab(tab);
    const png = await b.screenshot();
    const name = tab.replace(/[^\w]/g, "").toLowerCase() || `tab${n}`;
    await writeFile(path.join(SHOTS, `${name}.png`), png);
    n++;
  }
  await b.resize(390, 844);
  await openTab(REAL[0]);
  await writeFile(path.join(SHOTS, "simi.png"), await b.screenshot());
  note(`${n + 1} skjamyndir i dist/shots/ — thaer sanna ekkert, thaer eru til ad SKODA`);
}

b.close();
site.server.close();

console.log(`\n${fail ? `${fail} PROF FELLU` : "oll prof graen"}` +
  (notes ? `  ·  ${notes} athugasemdir` : ""));
process.exit(fail ? 1 : 0);
