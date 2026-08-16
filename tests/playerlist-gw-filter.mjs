/* ============================================================
   UMFERDAR-BILID I LEIKMANNALISTANUM — VIRKAR ThAD, OG SEGIR ThAD SATT?

   TILKYNNT AF NOTANDA 14.8.2026: "thad filterast ekki eftir gameweeks —
   eg vel Consistency, breyti umferdum i 4-5 og EKKERT gerist."

   RANNSOKNIN LEIDDI I LJOS TVENNT, OG ThAU ERU OLIK:
     1. `sumGwRange` er RETT (mælt beint: kodi 17761 hefur 170 stig yfir
        timabilid, 34 i GW30-38, 38 i GW1-10) og dalkar sem GETA fylgt
        bilinu gera thad.
     2. EN 44 af 124 dalkum eru arstidar-tolur sem geta ekki fylgt bili —
        og Consistency er EINI flokkurinn thar sem ALLIR dalkar eru
        thannig (4 af 4). Notandinn valdi thvi versta mogulega flokkinn:
        ekkert a skjanum GAT breyst, og eina merkid var `∑` i 9 px, lit
        #9a8aa8 a bakgrunni #faf7fb — osynilegt i reynd.
        Maelt per flokk: core 9/21 · attack 21/60 · defence 9/28 ·
        aron 4/4 · fixtures 0/5 · setp 1/6.

   ThETTA SAFN VER BADAR HLIDAR, thvi hvor um sig er einskis virdi an
   hinnar: ad talan BREYTIST thegar hun a ad gera thad, OG ad appid SEGI
   fra thegar hun getur thad ekki. Vordurinn er a HEGDUN i DOM, ekki a
   kodanum — profin sem lasu kodann sau ekki ad merkid var olæsilegt.
   ============================================================ */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { STAT_DEFS, STAT_GROUPS, gwBlindKeys } from "../src/stats.js";

const REPO = new URL("../", import.meta.url);
const D = new URL("data/", REPO).pathname;
const J = f => JSON.parse(readFileSync(D + f, "utf8"));

let pass = 0, fail = 0;
const ok = (n, c, x = "") => {
  if (c) { pass++; console.log("  ✓ " + n); }
  else { fail++; console.log(`  ✗ ${n}${x ? "   " + x : ""}`); }
};
const H = t => console.log(`\n${"─".repeat(76)}\n${t}\n${"─".repeat(76)}`);

/* ---------- 1. FLOKKARNIR — HVER GETUR FYLGT BILINU? ---------- */
H("1. HVADA FLOKKAR GETA FYLGT UMFERDAR-BILI");
const blind = gwBlindKeys();
const byGroup = {};
for (const g of STAT_GROUPS) {
  const cols = STAT_DEFS.filter(d => d.group === g.key);
  byGroup[g.key] = { label: g.label, n: cols.length,
                     blind: cols.filter(d => blind.has(d.key)).length };
  console.log(`     ${g.key.padEnd(9)} ${byGroup[g.key].blind}/${cols.length} blindir`);
}
const allBlind = Object.entries(byGroup).filter(([, v]) => v.n > 0 && v.blind === v.n);
ok(`Consistency er 100% blindur (${byGroup.aron?.blind}/${byGroup.aron?.n}) — tilvikid sem var tilkynnt`,
   byGroup.aron?.n > 0 && byGroup.aron.blind === byGroup.aron.n);
/* FORSENDA fyrir hinum helmingnum: einhver flokkur VERDUR ad geta fylgt
   bilinu, annars vaeri eiginleikinn merkingarlaus i heild.             */
ok("minnst einn flokkur er ad mestu leyti EKKI blindur (annars er bilid gagnslaust)",
   Object.values(byGroup).some(v => v.n > 0 && v.blind / v.n < 0.5));

/* ---------- 2. SUMMURNAR SJALFAR ---------- */
H("2. `sumGwRange` SKILAR RAUNVERULEGA OLIKUM TOLUM");
{
  const { sumGwRange } = await import("../src/stats.js");
  const gw = J("player_gw_2526.json");
  /* Leikmadur med nogu morg stig til ad bilin geti verid olik. */
  const code = Object.keys(gw.players).find(c => {
    const full = sumGwRange(gw.players[c], gw, 1, 38);
    return (full?.total_points ?? 0) > 80;
  });
  ok("fannst leikmadur med > 80 stig (forsenda samanburdarins)", !!code, String(code));
  if (code) {
    const full = sumGwRange(gw.players[code], gw, 1, 38);
    const late = sumGwRange(gw.players[code], gw, 30, 38);
    const early = sumGwRange(gw.players[code], gw, 1, 10);
    console.log(`     kodi ${code}: 1-38 = ${full.total_points} · 30-38 = ${late.total_points} · 1-10 = ${early.total_points}`);
    ok("GW30-38 gefur LAEGRI stig en allt timabilid", late.total_points < full.total_points,
       `${late.total_points} vs ${full.total_points}`);
    ok("GW1-10 og GW30-38 eru EKKI somu tolur (bilid raedur raunverulega)",
       early.total_points !== late.total_points, `${early.total_points} vs ${late.total_points}`);
    ok("minutur fylgja lika bilinu", (late.minutes ?? 0) > 0 && late.minutes < full.minutes,
       `${late.minutes} vs ${full.minutes}`);
  }
}

/* ---------- 3. VIDMOTID — SEGIR ThAD FRA? ---------- */
H("3. APPID SEGIR FRA ThEGAR EKKERT GETUR BREYST (DOM)");
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
  catch { return { ok: false, status: 404, json: async () => ({}) }; }
};

const App = (await import(new URL("src/App.jsx", REPO).href)).default;
const root = createRoot(document.getElementById("root"));
await act(async () => { root.render(React.createElement(App)); });
await act(async () => { await new Promise(r => setTimeout(r, 400)); });
const settle = async (ms = 200) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const click = async el => {
  if (!el) return false;
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  await settle();
  return true;
};
const btn = txt => [...document.querySelectorAll("button")]
  .find(b => b.textContent.trim() === txt);
const text = () => document.body.textContent || "";

ok("Player stats-flipinn opnast",
   await click([...document.querySelectorAll("button")].find(b => /Player stats/.test(b.textContent))));

/* Opna umferdar-valarann og velja 30-38. Kassarnir eru hnappar med toluna
   eina; `Gameweeks` er samanbrots-hnappurinn.                            */
await click(btn("Gameweeks"));
const gwBtn = n => [...document.querySelectorAll("button")]
  .filter(b => b.textContent.trim() === String(n))
  .find(b => b.closest('[aria-label="Select gameweek range"]'));
ok("umferdar-strikid er a skjanum (38 kassar)", !!gwBtn(30) && !!gwBtn(38));
await click(gwBtn(30));
await click(gwBtn(38));
await settle(600);
ok("bilid sest sem GW 30–38", /GW\s*30[–-]38/.test(text()), text().slice(0, 0));

/* --- 3a. CONSISTENCY: ekkert getur breyst -> appid VERDUR ad segja thad --- */
await click(btn("Consistency (Aron)"));
await settle(300);
const warned = /season totals, not GW\s*30[–-]38/i.test(text());
ok("CONSISTENCY: appid segir beinum ordum ad thetta seu arstidar-tolur", warned,
   "engin skyring a skjanum — thetta er nakvaemlega bilunin sem var tilkynnt");
ok("...og bendir a flokk sem VIRKAR", warned && /Basics/.test(text()));
/* ============================================================
   MERKID VERDUR AD VERA LESANLEGT — OG "LESANLEGT" ER MAELING, EKKI ORD

   Her stod: ok("dalkarnir sjalfir bera lesanlegt 'season'-merki",
                /season/i.test(text()))
   Sú fullyrding sagdi LESANLEGT en sannadi adeins AD ORDID VAERI TIL i
   textContent — og klipping snertir textContent ekki. Hun var thvi graen
   allan timann sem hausinn var raunverulega olæsilegur: `wOf` tok fra 9 px
   fyrir rodunar-orina eina medan holfid teiknadi LIKA 43 px merki, og
   holfid er `nowrap` + `overflow:hidden` + haegri-jafnad, svo thad var
   HEITID sem hvarf (vinstra megin) en merkid stod eftir.
   MAELT 16.8.2026: 43 merktir dalkar, ALLIR of throngir um >= 23 px og 25
   theirra syndu ekkert nema brot ur ordinu "season" ("Aron" fekk 55 px thar
   sem tharf 89). Notandinn tilkynnti thetta sem "the Seasons thing in
   Player stats is unreadable".
   Nu er MAELT: breiddin sem holfid FAER (inline `style.width` — sama tala og
   vafrinn notar) verdur ad ruma heiti + or + merki. Reikningurinn er
   fluttur inn ur PlayerList.jsx; afrit her vaeri sama gildran og felldi
   `stats.test.mjs`.
   ============================================================ */
{
  const PL = await import(new URL("src/PlayerList.jsx", REPO).href);
  const GLYPH = 6.32;                       // maelt, sja PlayerList/CLAUDE.md
  const heads = [...document.querySelectorAll("[aria-sort]")];
  const isBadge = n => n.nodeType === 1 && n.textContent.trim() === "season";
  const badged = heads.filter(h => [...h.childNodes].some(isBadge));
  /* FORSENDA SONNUD FYRST: an merktra hausa maeldi kaflinn ekkert. */
  ok(`${badged.length} haus-holf bera "season"-merkid (forsenda maelingarinnar)`,
     badged.length >= 4, `heild: ${heads.length} haus-holf`);
  const tight = [];
  for (const h of badged) {
    const label = [...h.childNodes].filter(n => n.nodeType === 3)
      .map(n => n.textContent).join("").replace(/[↑↓]/g, "").trim();
    const w = parseFloat(h.style.width);
    const need = label.length * GLYPH + PL.HEAD_ARROW_W + PL.BADGE_W + 11;
    if (!(w + 0.5 >= need)) tight.push(`"${label}" faer ${w} px en tharf ${Math.round(need)}`);
  }
  ok("hvert merkt haus-holf rumar HEITID lika, ekki adeins merkid",
     tight.length === 0, `${tight.length} klippt: ${tight.slice(0, 3).join(" · ")}`);
  /* Og heitid er raunverulega thar — annars vaeri "rumar heitid" tomt. */
  ok("merktu hausarnir bera heiti, ekki adeins merkid",
     badged.every(h => [...h.childNodes].filter(n => n.nodeType === 3)
       .map(n => n.textContent).join("").replace(/[↑↓\s]/g, "").length > 0));
}

/* --- 3b. BASICS: her A talan ad geta breyst, svo advorunin ma EKKI birtast --- */
await click(btn("Basics"));
await settle(300);
ok("BASICS: engin 'season totals'-advorun (thar fylgja dalkar bilinu)",
   !/season totals, not GW/i.test(text()));

/* ============================================================
   4. SIAN OG TAFLAN MEGA ALDREI SEGJA SITTHVAD (tilkynnt 14.8.2026)

   Notandinn siadi "start prob >= 90" og Ampadu og Botman DUTTU UT — medan
   holfid vid hlidina sagdi 90. Baðir bera 0,897 -> 89,7 og dalkurinn hefur
   `dec: 0`, svo taflan namundadi i 90 en sian bar saman 89,7 >= 90.
   Notandinn giskadi rett: aukastafir.
   Vordurinn er a REGLUNNI (sian les somu tolu og augad), ekki a thessum
   tveimur monnum — their eru bara tilvikid sem afhjupadi hana.
   ============================================================ */
H("4. SIAN LES SOMU TOLU OG AUGAD");
{
  const { fmtStat, STAT_BY_KEY } = await import("../src/stats.js");
  const d = STAT_BY_KEY.start_prob;
  ok("start_prob-dalkurinn birtir HEILA tolu (dec 0) — forsenda tilviksins",
     d?.dec === 0, String(d?.dec));

  /* Nakvaemlega talan sem notandinn sa. */
  const raw = 89.7, thr = 90;
  ok("hrátt gildi 89,7 stenst EKKI \u003e= 90 (svona var villan)", !(raw >= thr));
  ok("namundad ad `dec` (90) STENDST — sian og taflan sammála",
     +raw.toFixed(d.dec) >= thr, String(+raw.toFixed(d.dec)));
  /* ATH: `fmtStat(def, v)` — SKILGREININGIN FYRST. Fyrsta utgafa thessa
     kafla sneri vidfongunum vid og fekk "—", sem leit ut eins og villa i
     appinu. Hun var i profinu. */
  ok("og taflan birtir raunverulega 90%", fmtStat(d, raw) === "90%", String(fmtStat(d, raw)));
  ok("...medan 89,4 birtist sem 89% (namundunin er ekki alltaf upp)",
     fmtStat(d, 89.4) === "89%", String(fmtStat(d, 89.4)));

  /* HIN ATTIN MA EKKI BROTNA: namundun ma ekki hleypa inn thvi sem er
     synilega FYRIR NEDAN throskuldinn.                                   */
  ok("89,4 -> birt 89 -> fellur RETTILEGA ut ur \u003e= 90", !(+(89.4).toFixed(0) >= 90));
  ok("90,4 -> birt 90 -> stenst \u003e= 90", +(90.4).toFixed(0) >= 90);
  ok("\u003c= virkar eins: 90,4 birt 90 stenst \u003c= 90", +(90.4).toFixed(0) <= 90);

  /* ============================================================
     A RAUNVERULEGA FALLINU, EKKI A TEXTANUM. Fyrsta utgafa thessa kafla
     las `PlayerList.jsx` og leitadi ad `toFixed(dec)` — og stokkbreyting
     sem skipti `shown` aftur ut fyrir `v` i SAMANBURDINUM SLAPP I GEGN,
     thvi linan sem bjo til `shown` stod eftir. Fullyrding sem hordir a
     kodann getur ekki sed hvad hann GERIR. Reglan var thvi flutt i
     `passesThreshold` og er nu KEYRD hér.
     ============================================================ */
  const { passesThreshold } = await import("../src/stats.js");
  ok("89,7 med dec 0 STENSTUR \u003e= 90 (tilvikid sem var tilkynnt)",
     passesThreshold(d, 89.7, ">=", 90) === true);
  ok("89,4 med dec 0 fellur RETTILEGA ut ur \u003e= 90",
     passesThreshold(d, 89.4, ">=", 90) === false);
  ok("90,4 birt 90 stenst \u003c= 90", passesThreshold(d, 90.4, "<=", 90) === true);
  ok("90,6 birt 91 fellur ut ur \u003c= 90", passesThreshold(d, 90.6, "<=", 90) === false);
  /* Dalkur med TVEIMUR aukastofum ma ekki erfa namundun heiltolu-dalks. */
  const d2 = { dec: 2 };
  ok("dec 2: 0,6449 birt 0,64 fellur ut ur \u003e= 0,65",
     passesThreshold(d2, 0.6449, ">=", 0.65) === false);
  ok("dec 2: 0,6451 birt 0,65 stenst \u003e= 0,65",
     passesThreshold(d2, 0.6451, ">=", 0.65) === true);
  /* NULL ER EKKI NULL og halfskrifad gildi siar ekki (CLAUDE.md 8). */
  ok("null fellur alltaf ut", passesThreshold(d, null, ">=", 0) === false);
  ok("halfskrifadur throskuldur siar EKKERT", passesThreshold(d, 5, ">=", NaN) === true);
  /* OG AD APPID NOTI ThETTA FALL — annars er kaflinn ad maela safn. */
  const src = readFileSync(new URL("../src/PlayerList.jsx", import.meta.url), "utf8");
  ok("PlayerList kallar `passesThreshold` (ekki sinn eigin samanburd)",
     /passesThreshold\(/.test(src) && !/t\.op === "\u003e=" && !\(v \u003e= t\.val\)/.test(src));
}

console.log(`\nUMFERDAR-BIL: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
