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
      team: spans[0].textContent.trim(),
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

/* ---------- 5. THREPIN SJALF ---------- */
{
  ok("TIER_CUTS eru vaxandi", TIER_CUTS.every((c, i) => i === 0 || c > TIER_CUTS[i - 1]),
     TIER_CUTS.join(","));
  ok("tierOf skilar gildu threpi fyrir alla birta FFDR-tolu",
     rows.every(r => [r.def, r.att].every(v => v == null || (tierOf(v) >= 0 && tierOf(v) <= TIER_CUTS.length))));
}

console.log(`\nFFDR-TAFLA: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
