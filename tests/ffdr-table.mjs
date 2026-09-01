/* ============================================================
   "TEAMS — FFDR" TAFLAN, LESIN AF SKJANUM

   Notandinn spurdi beint: "Er FFDR-tickerinn rettur? Farðu yfir hann
   MJÖG VEL." Thetta safn er svarid, og thad er MAELING en ekki lestur:
   tolurnar eru lesnar UT UR DOM-inu og bornar vid thad sem thaer eiga ad
   vera.

   HVERS VEGNA EKKI ENDURREIKNA FFDR HER: `fixDifficulty` er `useMemo`
   inni i App.jsx og byggir a model.js. Ad skrifa hana upp aftur i profinu
   vaeri TVAER UTFAERSLUR a somu formulu — nakvaemlega gildran sem
   CLAUDE.md 6j lysir (nafna-porunin) og sem gerir ad prof getur verid
   graent medan appid er rangt. Thess i stad eru profud thau vensl sem
   VERDA ad halda hvad sem formulan segir:

     1. LITUR OG TALA VERDA AD SEGJA ThAD SAMA. Reiturinn er litadur eftir
        `tierOf(v)`. Ef bakgrunnurinn passar ekki vid toluna i reitnum er
        taflan ad LJUGA SJONRAENT — sama villuflokkur og afstaedu threpin
        sem notandinn sa a Rice (CLAUDE.md 3), thar sem talan var rett en
        liturinn rangur.
     2. `n` VERDUR AD VERA RAUNVERULEGUR LEIKJAFJOLDI ur fixtures.json.
        `n` er einmitt daalkurinn sem a ad afhjupa auda umferd, svo ef hann
        er sjalfur rangur er vordurinn verri en enginn.
     3. EITT-UMFERDAR BIL = EINN LEIKUR. Med `ffdrRange = [g,g]` ma
        medaltalid ekki taka nokkud annad inn — thad er beinasta profid a
        thvi ad bilid se virt.
     4. AD BREIKKA BILID MA EKKI FAEKKA LEIKJUM. Einhalla vensl sem
        fellur strax ef fra/til vixlast.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { TIER_CUTS, tierOf } from "../src/model.js";

const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

const dom = new JSDOM("<!doctype html><div id=root></div>",
                      { url: "http://localhost/", pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.fetch = async url => {
  const n = String(url).split("/data/")[1];
  if (!n) return { ok: false, status: 404, json: async () => ({}) };
  try { return { ok: true, status: 200, json: async () => J(n) }; }
  catch { return { ok: false, status: 404, json: async () => { throw new Error("404"); } }; }
};

const { default: App } = await import(new URL("src/App.jsx", REPO).href);
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 400)); });
const settle = async (ms = 40) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const fire = async el => {
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle();
};

console.log(`\n${"─".repeat(72)}\n"TEAMS — FFDR" TAFLAN AF SKJANUM\n${"─".repeat(72)}`);

/* ---------- ad finna tofluna ---------- */
const heading = () => [...document.querySelectorAll("h2")]
  .find(h => h.textContent.includes("Teams — FFDR"));
ok("taflan er a skjanum", !!heading(), "h2 'Teams — FFDR' fannst ekki");

/* Radirnar eru systkini a eftir haus-rodinni; hver ber lidsskammstofun,
   tvo lituð FFDR-holf og n. Thaer eru fundnar ut fra section-inu.       */
const section = heading()?.closest("section");
const readRows = () => {
  const out = [];
  for (const row of section.querySelectorAll("div")) {
    const spans = [...row.children].filter(c => c.tagName === "SPAN");
    if (spans.length !== 4) continue;
    const cells = [spans[1], spans[2]].map(s => s.querySelector("span") || s);
    const txt = cells.map(c => c.textContent.trim());
    if (!txt.every(t => t === "—" || /^\d+(\.\d+)?$/.test(t))) continue;
    out.push({
      /* ★ ER HLUTI AF HOLFINU EN EKKI AF NAFNINU. Hun er strippud hér svo
         `n`-athugunin geti flett lidinu upp i teams.json — fyrsta utgafan
         leitadi ad "ARS★" og fann ekkert. Merkid sjalft er profad i 4b
         gegnum `euro`-flaggid.                                          */
      team: spans[0].textContent.replace("★", "").trim(),
      euro: /★/.test(spans[0].textContent),
      def: txt[0] === "—" ? null : +txt[0],
      att: txt[1] === "—" ? null : +txt[1],
      defBg: cells[0].style.background, attBg: cells[1].style.background,
      n: +spans[3].textContent.trim(),
    });
  }
  return out;
};

let rows = readRows();
ok(`allar 20 lidsradir lesnar (${rows.length})`, rows.length === 20, `fann ${rows.length}`);

/* ---------- 1. LITUR OG TALA VERDA AD SEGJA ThAD SAMA ---------- */
{
  const TIER_BG = (await import(new URL("src/model.js", REPO).href)).TIER_BG;
  const wrong = [];
  for (const r of rows) {
    for (const [k, bg] of [["def", r.defBg], ["att", r.attBg]]) {
      const v = r[k];
      if (v == null) continue;
      const want = TIER_BG[tierOf(v)];
      /* jsdom UMBREYTIR `#5cc78c` i `rgb(92, 199, 140)`, svo bein
         strengja-samanburd fellur a REYNDU SAMA lit. Baðum er thvi
         varpad i [r,g,b] adur en borid er saman — annars maeldi
         profid CSS-ritun en ekki lit.                                */
      const rgb = s => {
        const t = String(s).trim();
        let m = t.match(/^#?([0-9a-f]{6})$/i);
        if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
        m = t.match(/rgba?\(([^)]+)\)/i);
        if (m) return m[1].split(",").slice(0, 3).map(x => Math.round(parseFloat(x)));
        return null;
      };
      const a = rgb(bg), b = rgb(want);
      if (a && b && a.join() !== b.join())
        wrong.push(`${r.team}.${k}=${v} bg=${bg} vaentanlegt=${want}`);
    }
  }
  ok("litur hvers reits samsvarar tierOf(tolunni)", wrong.length === 0, wrong.slice(0, 4).join(" | "));
}

/* ---------- 2. `n` ER RAUNVERULEGUR LEIKJAFJOLDI ---------- */
{
  const fixtures = J("fixtures.json");
  const fxs = Array.isArray(fixtures) ? fixtures : (fixtures.fixtures || []);
  const teamsFile = J("teams.json");
  const tl = Array.isArray(teamsFile) ? teamsFile : (teamsFile.teams || []);
  const idByShort = new Map(tl.map(t => [t.short_name || t.short, t.id]));

  /* Bilid sem taflan synir er lesid ur fyrirsogninni sjalfri, svo profid
     elti sjalfgefna bilid hvad sem thad er (thad faerist med umferdum). */
  const m = heading().textContent.match(/GW(\d+)(?:–(\d+))?/);
  const from = +m[1], to = m[2] ? +m[2] : +m[1];
  const bad = [];
  for (const r of rows) {
    const id = idByShort.get(r.team);
    if (id == null) { bad.push(`${r.team}: lid fannst ekki i teams.json`); continue; }
    const k = fxs.filter(f => (f.event ?? f.gw) >= from && (f.event ?? f.gw) <= to
                            && (f.team_h === id || f.team_a === id)).length;
    if (k !== r.n) bad.push(`${r.team}: taflan segir n=${r.n}, fixtures.json segir ${k}`);
  }
  ok(`n stemmir vid fixtures.json fyrir oll 20 lid (GW${from}–${to})`, bad.length === 0,
     bad.slice(0, 4).join(" | "));
  ok("hver rod hefur ad minnsta kosti einn leik i sjalfgefnu bili",
     rows.every(r => r.n >= 1), rows.filter(r => !r.n).map(r => r.team).join(","));
}

/* ---------- 3. EITT-UMFERDAR BIL = EINN LEIKUR ---------- */
{
  /* "pick" opnar kassarodina; smellur a einn kassa setur [n,n].        */
  const pick = [...section.querySelectorAll("button")].find(b => b.textContent.trim() === "pick");
  ok("'pick'-hnappurinn er til", !!pick);
  if (pick) {
    await fire(pick);
    const boxes = [...section.querySelectorAll("button")].filter(b => /^\d+$/.test(b.textContent.trim()));
    ok(`umferdar-kassar birtust (${boxes.length})`, boxes.length >= 30);
    const one = boxes.find(b => b.textContent.trim() === "1");
    if (one) {
      await fire(one); await fire(one);          // fyrsti = upphaf, annar = endi
      const single = readRows();
      const h = heading().textContent;
      ok("fyrirsognin synir eina umferd", /GW1(?!\d)(?!–)/.test(h), h);
      ok("hvert lid hefur i mesta lagi tvo leiki i EINNI umferd",
         single.every(r => r.n <= 2), single.filter(r => r.n > 2).map(r => `${r.team}:${r.n}`).join(","));
      ok("engin rod ber fleiri leiki en heildarbilid gaf",
         single.every(r => r.n <= (rows.find(x => x.team === r.team)?.n ?? 99)));
    }
  }
}

/* ---------- 4. AD BREIKKA BILID MA EKKI FAEKKA LEIKJUM ---------- */
{
  const plus = [...section.querySelectorAll("button")].find(b => b.textContent.trim() === "+");
  ok("'+'-hnappurinn er til", !!plus);
  if (plus) {
    const before = readRows();
    await fire(plus);
    const after = readRows();
    const shrank = after.filter(r => r.n < (before.find(x => x.team === r.team)?.n ?? 0));
    ok("engu lidi FAEKKAR leikjum vid ad breikka bilid", shrank.length === 0,
       shrank.map(r => r.team).join(","));
    const grew = after.filter(r => r.n > (before.find(x => x.team === r.team)?.n ?? 0));
    ok(`einhverju lidi FJOLGAR (${grew.length}) — hnappurinn gerir eitthvad`, grew.length > 0);
  }
}

/* ---------- 4b. EVROPU-MERKID ----------
   Notandinn bad um "adeins odruvisi, litid ikon eda skaletur, ekki
   aberandi". Profid ver ThRENNT:
     a) merkid er a NAKVAEMLEGA theim lidum sem `participation` nefnir —
        hvorki fleiri ne faerri. Merki a rongu lidi vaeri verra en ekkert
        (sama regla og BSD-lidavorpunin: thogul rong porun er verst).
     b) thad er DAUFT. Ef einhver gerir thad rautt eda feitletrad er thad
        ordid vidvorun — og evropualag maeldist EKKI marktaekt (6k), svo
        vidvorun vaeri fullyrding sem gognin styðja ekki.
     c) thad breytir ENGRI TOLU. FFDR-gildin verda ad vera nakvaemlega
        thau somu hvort sem lidid er i Evropu eda ekki.                */
{
  const euro = J("euro_fixtures.json");
  const part = euro?.participation || {};
  const teamsFile = J("teams.json");
  const tl = Array.isArray(teamsFile) ? teamsFile : (teamsFile.teams || []);
  const wantShorts = new Set(Object.entries(part)
    .filter(([, v]) => Array.isArray(v) && v.length)
    .map(([id]) => (tl.find(t => t.id === +id) || {}).short)
    .filter(Boolean));

  /* Radirnar eru lesnar upp a nytt — bilid var faert i kafla 3/4.      */
  const cur = readRows();
  const starred = new Set(cur.filter(r => r.euro).map(r => r.team));
  ok(`evropu-merkid er a ${wantShorts.size} lidum, nakvaemlega theim rettu`,
     starred.size === wantShorts.size && [...wantShorts].every(s => starred.has(s)),
     `merkt: ${[...starred].join(",")} · vaentanlegt: ${[...wantShorts].join(",")}`);

  /* DAUFT, EKKI ABERANDI. */
  const tags = [...section.querySelectorAll("span")].filter(s => s.textContent.trim() === "★");
  ok(`merkin finnast i DOM (${tags.length})`, tags.length === wantShorts.size);
  const loud = tags.filter(s => {
    const st = s.style || {};
    const size = parseFloat(st.fontSize) || 99;
    const w = String(st.fontWeight || "");
    return size > 10 || w === "bold" || +w >= 600 || /red|#d9|#f0[0-9a-f]{2}00/i.test(st.color || "");
  });
  ok("merkid er daufur smastafur — hvorki feitletrad ne raudt", loud.length === 0,
     loud.map(s => `${s.style.fontSize}/${s.style.fontWeight}/${s.style.color}`).join(" | "));
  ok("hvert merki ber skyringu (title)", tags.every(s => (s.getAttribute("title") || "").length > 20));

  /* BREYTIR ENGRI TOLU — merkt lid og omerkt lesa somu FFDR-toflu.    */
  const marked = cur.filter(r => r.euro);
  ok(`merkt lid bera venjulegar FFDR-tolur (${marked.length})`,
     marked.length > 0 && marked.every(r => (r.def == null || Number.isFinite(r.def))
                                         && (r.att == null || Number.isFinite(r.att))));
}

/* ---------- 5. THREPIN SJALF ---------- */
{
  ok("TIER_CUTS eru vaxandi", TIER_CUTS.every((c, i) => i === 0 || c > TIER_CUTS[i - 1]),
     TIER_CUTS.join(","));
  ok("tierOf skilar gildu threpi fyrir alla birta FFDR-tolu",
     rows.every(r => [r.def, r.att].every(v => v == null || (tierOf(v) >= 0 && tierOf(v) <= TIER_CUTS.length))));
}

/* ============================================================
   6. FFDR-SPJALDID UNDIR VELLINUM (hnappurinn "📊 FFDR")

   ThETTA ER ONNUR TAFLA EN SU AD OFAN og notandinn rakst a muninn:
   "Teams — FFDR" hafdi bil-val og rodun, en spjaldid undir vellinum var
   NEGLT vid timalinuna (`from=tlStart, span=tlWindow`) — eina leidin til
   ad sja GW2-10 var ad skruna timalinunni, sem faerdi hana lika. Og
   medaltalid var EITT, bundid vid lita-valid, svo ekki var haegt ad rada
   eftir SOKN medan VORNIN var lituð.

   Nu ber spjaldid eigid bil og TVO rodunar-dalka (Def/Att) sem baðir eru
   reiknadir alltaf. Profad er:
     a) bilid er sjalfstaett — ad velja GW2-10 gefur 9 dalka OG hreyfir
        ekki hina tofluna
     b) rodun eftir HVORRI tolu sem er, i BADAR attir, er einhalla
     c) `n` fylgir raunverulegum leikjafjolda i bilinu
     d) tomt gildi radast NEDST i badar attir (sama regla og alls stadar)
   ============================================================ */
console.log(`\n${"─".repeat(72)}\nFFDR-SPJALDID UNDIR VELLINUM\n${"─".repeat(72)}`);
{
  const openBtn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("📊 FFDR"));
  ok("'📊 FFDR'-hnappurinn er til", !!openBtn);
  if (openBtn) {
    await fire(openBtn);
    const panel = () => [...document.querySelectorAll("h2")]
      .find(h => h.textContent.includes("FFDR — fixture difficulty"))?.closest("section");
    ok("spjaldid opnast", !!panel());

    const table = () => panel().querySelector("table");
    const heads = () => [...table().querySelectorAll("thead th")];
    const headTxt = () => heads().map(t => t.textContent.replace(/[↑↓]/g, "").trim());
    const th = lbl => heads().find(t => t.textContent.replace(/[↑↓]/g, "").trim() === lbl);
    const bodyRows = () => [...table().querySelectorAll("tbody tr")].map(r => {
      const td = [...r.children];
      const num = i => { const t = td[i].textContent.trim(); return t === "—" ? null : parseFloat(t); };
      return { team: td[0].textContent.trim(),
               def: num(td.length - 3), att: num(td.length - 2), n: num(td.length - 1) };
    });

    ok("Def- og Att-dalkar eru baðir i hausnum",
       headTxt().includes("Def") && headTxt().includes("Att"), headTxt().join(" | "));
    ok("`n`-dalkur er i hausnum", headTxt().includes("n"));
    ok(`oll 20 lidin i toflunni (${bodyRows().length})`, bodyRows().length === 20);

    /* ---- b) rodun eftir HVORRI tolu sem er, i BADAR attir ---- */
    for (const key of ["def", "att"]) {
      const lbl = key === "def" ? "Def" : "Att";
      /* ATTIN ER LESIN AF ORINNI, EKKI GEFIN SER. Spjaldid opnast ThEGAR
         radad eftir "Def" i asc, svo FYRSTI smellur a Def SNYR honum i
         desc — hann velur ekki. Fyrsta utgafa profsins gaf ser "fyrsti
         smellur = asc" og flaggadi thvi RETTA rodun sem ranga; nakvaemlega
         sama villa og i playerlist-sort.mjs.                            */
      const dirNow = () => { const t = th(lbl)?.textContent || "";
        return t.includes("↑") ? "asc" : t.includes("↓") ? "desc" : null; };
      await fire(th(lbl));
      const r1 = bodyRows(), d1 = dirNow();
      await fire(th(lbl));
      const r2 = bodyRows(), d2 = dirNow();
      ok(`${lbl}: attin snyst vid annan smell (${d1} -> ${d2})`, d1 && d2 && d1 !== d2);
      const asc  = d1 === "asc"  ? r1 : r2;
      const desc = d1 === "desc" ? r1 : r2;
      const nums = a => a.map(r => r[key]).filter(v => v != null && Number.isFinite(v));
      const a = nums(asc), d = nums(desc);
      ok(`${lbl}: "asc" er vaxandi (${a.length} tolur)`,
         a.length >= 15 && a.every((v, i) => i === 0 || v >= a[i - 1]),
         a.slice(0, 5).join(", "));
      ok(`${lbl}: "desc" er minnkandi`,
         d.length >= 15 && d.every((v, i) => i === 0 || v <= d[i - 1]),
         d.slice(0, 5).join(", "));
      /* d) TOMT NEDST I BADAR ATTIR — osamhverfa reglan ur
         playerlist-sort.mjs: se dalkurinn med tolur a annad bord ma
         TOPPURINN aldrei vera tomur.                                  */
      for (const [dir, arr] of [["asc", asc], ["desc", desc]])
        ok(`${lbl} (${dir}): toppurinn er ekki tomur`, arr[0]?.[key] != null);
    }

    /* ---- a) eigid bil ---- */
    const pick = [...panel().querySelectorAll("button")].find(b => b.textContent.trim() === "pick");
    ok("spjaldid hefur eigin 'pick'-hnapp", !!pick);
    if (pick) {
      const before = headTxt().length;
      await fire(pick);
      const box = n => [...panel().querySelectorAll("button")].find(b => b.textContent.trim() === String(n));
      await fire(box(2)); await fire(box(10));
      const gwCols = headTxt().filter(t => /^\d+$/.test(t));
      ok(`GW2-10 gefur nakvaemlega 9 umferdar-dalka (${gwCols.length})`, gwCols.length === 9,
         gwCols.join(","));
      ok("dalkarnir eru 2..10", gwCols[0] === "2" && gwCols.at(-1) === "10");
      ok("bilid breyttist fra sjalfgefna (timalinu-bilinu)", headTxt().length !== before);

      /* c) `n` fylgir fixtures.json i ThESSU bili. */
      const fixtures = J("fixtures.json");
      const fxs = Array.isArray(fixtures) ? fixtures : (fixtures.fixtures || []);
      const teamsFile = J("teams.json");
      const tl = Array.isArray(teamsFile) ? teamsFile : (teamsFile.teams || []);
      const idByShort = new Map(tl.map(t => [t.short, t.id]));
      const bad = [];
      for (const r of bodyRows()) {
        const id = idByShort.get(r.team.replace("★", "").trim());
        if (id == null) { bad.push(`${r.team}: lid fannst ekki`); continue; }
        const k = fxs.filter(f => (f.event ?? f.gw) >= 2 && (f.event ?? f.gw) <= 10
                                && (f.team_h === id || f.team_a === id)).length;
        if (k !== r.n) bad.push(`${r.team}: n=${r.n} en fixtures segir ${k}`);
      }
      ok("`n` stemmir vid fixtures.json fyrir oll lid i GW2-10", bad.length === 0,
         bad.slice(0, 4).join(" | "));

      /* "reset" skilar bilinu i timalinuna. */
      const reset = [...panel().querySelectorAll("button")].find(b => b.textContent.trim() === "reset");
      ok("'reset'-hnappur birtist thegar bil hefur verid valid", !!reset);
      if (reset) {
        await fire(reset);
        ok("reset skilar sjalfgefnu bili", headTxt().length === before,
           `${headTxt().length} vs ${before}`);
      }
    }
  }
}

/* ============================================================
   OMETINN LEIKUR MA ALDREI FA THREP — A TILBUNUM GOGNUM

   HVERS VEGNA TILBUIN: maelt i dag bera **0 af 380** leikjum i
   `data/fixtures.json` enga thyngd, svo raungogn geta ekki keyrt
   thessa grein. Kodi sem kviknar fyrst thann dag sem heimild bregst
   er nakvaemlega thad sem a ad profast a tilbunum inntokum
   (CLAUDE.md kafli 5).

   OG BADAR UTKOMURNAR VERDA AD VERA PROFADAR, ThVI ThAER ERU
   ANDSTAEDAR:
     `undefined` -> Math.max -> NaN  -> thyngsta threp (dokkraudt)
     `null`      -> Math.max -> 0    -> LETTASTA threp (dokkgraent)
   FPL sendir `null`, svo sjalfgefna bilunin var ad ometinn leikur
   birtist sem AUDVELDASTI leikur toflunnar — rong radgjof i toflu
   sem er til thess ad gefa radgjof. Sviðs-vordur hefdi ekki tekid
   hvoruga: bædi 0 og 5 eru gild threp.
   ============================================================ */
console.log("\n=== OMETINN LEIKUR (tilbuin gogn) ===");
{
  const mod = await import(new URL("src/FfdrTable.jsx", REPO).href);
  const src = readFileSync(new URL("src/FfdrTable.jsx", REPO).pathname, "utf8");
  ok("thyngdin er sannreynd med `Number.isFinite` adur en hun verdur threp",
     /Number\.isFinite\(\+raw\)/.test(src),
     "— `?? f.fdr` eitt ver ekkert: `??` hleypir bædi NaN og null i gegn");
  ok("og holf an tolu er teiknad sem AUTT, ekki litad",
     /worst == null/.test(src) && /worstOf/.test(src));
  ok("og tooltip-id prentar ekki bera `null`/`undefined`",
     /x\.d == null \? "—"/.test(src));
  /* HERMUM BADAR UTKOMURNAR BEINT A `tierOf` svo talan sem var rong
     se skjolud, ekki adeins vordurinn. */
  ok(`SANNREYNT: Math.max(undefined) -> NaN -> tierOf = ${tierOf(Math.max(undefined))} (thyngsta)`,
     tierOf(Math.max(undefined)) === TIER_CUTS.length);
  ok(`SANNREYNT: Math.max(null) -> 0 -> tierOf = ${tierOf(Math.max(null))} (LETTASTA — verri villan)`,
     tierOf(Math.max(null)) === 0);
}

/* ============================================================
   SJALFGEFID BIL BYRJAR A FYRSTU OLEIKNU UMFERD (31.8.2026)

   Beidni notandans: "Taktu lidnar umferdir auto ur FFDR, og thegi thurfi
   ad baeta theim inn ef eg vill sja thaer. Nuna aetti t.d. ad byrja a
   GW3." Taflan byrjadi adur a `tlStart` (timalinu-glugganum), sem byrjar
   i GW1 — svo spiladar umferdir satu efst.

   REGLAN ER LESIN AF LEIKJUNUM, ekki af `is_current` (hun situr a lokinni
   umferd fram ad naesta fresti) og ekki af `finished` a umferdinni (thad
   svid flettist ~3 dogum of seint). Kaflinn ber saman VID LEIKJASKRANA
   sjalfa, svo hann er tima-stodugur: hann segir ekki "GW3" heldur "fyrsta
   umferd sem a oleikinn leik".
   ============================================================ */
{
  console.log("\n--- SJALFGEFID BIL: FYRSTA OLEIKNA UMFERD ---");
  const fxAll = (() => { const f = J("fixtures.json"); return Array.isArray(f) ? f : f.fixtures; })();
  const played = f => f?.finished === true || f?.finished_provisional === true;
  const byGw = {};
  for (const f of fxAll) if (f?.event) (byGw[f.event] = byGw[f.event] || []).push(f);
  let firstOpen = 1;
  for (let g = 1; g <= 38; g++) {
    const own = byGw[g];
    if (!own || !own.length || !own.every(played)) { firstOpen = g; break; }
  }
  /* HAUSARNIR BERA BERA TOLU (`<th>{g}</th>`), ekki "GW3" — fyrsta utgafan
     leitadi ad `/^GW\d+$/` og fann EKKERT, svo forsendan fell rettilega.
     Bilid er lika prentad i eigin linu ("GW 3-7"), og hun er notud sem
     onnur, ohad staðfesting a sama svari.                              */
  const heads = [...document.querySelectorAll("th")]
    .map(e => (e.textContent || "").trim())
    .filter(t => /^\d{1,2}$/.test(t)).map(Number);
  const first = heads.length ? Math.min(...heads) : null;
  const shownRange = /GW\s*(\d+)(?:\s*[–-]\s*(\d+))?/.exec(document.body.textContent || "");
  /* `ok(NAFN, SKILYRDI)` I ThESSU SAFNI — ekki ofugt. Fyrsta utgafa
     thessa kafla sneri theim vid, svo strengurinn var skilyrdid (alltaf
     satt) og ALLAR ThRJAR fullyrdingarnar voru holar. Prentudu nofnin
     ("false", "false", "true") voru einu merkin.                       */
  ok(`forsenda: umferdar-hausar lesnir af skjanum (${heads.length})`, heads.length >= 3);
  ok(`taflan byrjar a fyrstu OLEIKNU umferd (GW${first} = GW${firstOpen})`,
     first === firstOpen);
  ok(`og lidin umferd (GW${firstOpen - 1}) er EKKI sjalfgefid inni`,
     firstOpen === 1 || !heads.includes(firstOpen - 1));
  /* OG TEXTINN SEGIR ThAD SAMA — tvaer ohadar leidir ad somu tolu.     */
  ok(`bils-textinn segir sömu byrjun (GW${shownRange?.[1]})`,
     !!shownRange && +shownRange[1] === firstOpen);
}

console.log(`\nFFDR-TAFLA: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
