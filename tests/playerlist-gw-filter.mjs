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

/* ============================================================
   UMFERDAR-BIL ER ADEINS TIL A LOKNU TIMABILI — VALID ER NU VILJANDI
   (22.8.2026)

   Allur thessi kafli spyr "hvad segir appid thegar bil er valid og dalkur
   getur ekki fylgt thvi?". Bilid VIRKAR adeins thegar per-umferdar skrain
   (`player_gw_<key>.json`) er til, og hun er EKKI til fyrir yfirstandandi
   timabil. Appid segir thad sjalft i valaranum ("no gameweek data for
   2026/27 — pick a finished season") — thad er RETT hegdun og hun er ekki
   thad sem thessi kafli maelir.

   Kaflinn ERFDI arkivid ur sjalfgildinu. Sjalfgildid faerdist a
   yfirstandandi timabil um leid og GW1-fresturinn leid (`startedGw > 0`),
   og tha var `gwActive` false: NULL merki, NULL bordi, thrjar fullyrdingar
   sem maeldu ekkert (maelt 22.8.2026: 0 merkt haus-holf af 7).
   Timabilid er thvi VALID her, og talan LEIDD ur `player_seasons.json`
   (sama skra og `olderSeasons` i PlayerList) svo hun ureldist ekki naesta
   agust.
   ============================================================ */
{
  /* Fast bid er ekki maeling a thvi ad teikningu se lokid (600 radir x
     124 dalkar endur-eldast); bedid er thangad til textinn haettir ad
     vaxa — sama adferd og `settleOn` i `data-resilience.mjs`.           */
  const settleOn = async () => {
    let last = -1, stable = 0;
    for (let i = 0; i < 40; i++) {
      await settle(25);
      const n = text().length;
      if (n === last) { if (++stable >= 2) break; } else { stable = 0; last = n; }
    }
  };
  const ARCHIVE = J("player_seasons.json").seasons[0];
  const sel = () => document.querySelector("select");
  ok("timabils-valid er addressanlegt", !!sel());
  sel().value = ARCHIVE;
  await act(async () => { sel().dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  await settleOn();
  ok(`listinn stendur a ${ARCHIVE} (valid tok, ekki erft)`,
     sel()?.value === ARCHIVE, String(sel()?.value));
}

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

/* ============================================================
   3c. `live_only`-DALKAR — BORDINN ThAGDI YFIR ThEIM I TVO DAGA

   MAELT 16.8.2026 med GW30-38 virkt a "Upcoming fixtures":
     HAUS   [Player, Price, Owned %, FDR6, Home, Games, CS next, Team DC]
     MERKI  []
     bordi  enginn
   Fimm dalkar syndu DAGSINS framsyni medan hausinn sagdi GW 30-38 og
   EKKERT a skjanum sagdi fra. Orsokin var ein lina: `rangeBanner` profadi
   `blind` EITT, og `gwBlindKeys` sleppir `live_only`-dalkum VILJANDI a
   theim forsendum ad their "beri eigid now-merki" — sem their gera EKKI:
   merkid er adeins til i dalkavalaranum, aldrei i haus toflunnar.
   `rangeAwareGroupsOf` hafdi ThEGAR verid lagfaert fyrir somu gildru og bar
   hana skrifada i athugasemd sinni; bordinn sat eftir. Tvo skilyrdi um sama
   hlut er hvernig thau fara i sundur — thau eru nu EITT (`rangeBlind`).

   AF HVERJU BORDI EN EKKI MERKI I HAUSNUM: merkid var maelda leidin sem var
   HAFNAD — hausbreiddin er maeld i px og merki sem baettist vid an thess ad
   breiddin vissi af thvi klippti 25 haus-heiti (kafli 3a hér ad ofan).

   OG RESTIN SEM STENDUR EFTIR, SOGD BERUM ORDUM: "Set pieces and cards" ber
   LIKA `live_only`-dalka (`fk_order`, `ck_order`) en ThAR er bordinn
   RETTILEGA thogull, thvi hinir thrir dalkarnir (spjold) fylgja bilinu i
   alvoru. Their tveir eru thvi syndir omerktir medan hausinn segir GW 30-38.
   Vidbotar-bordi fyrir "sumt fylgir bilinu" var ekki settur inn: hann
   kviknar tha lika i Grunni (`start_prob` er live_only) og bordi sem sest
   alltaf er ekki lengur upplysing. Samsetningin er FULLYRT hér ad nedan svo
   hun geti ekki breyst thegjandi.
   ============================================================ */
{
  const { STAT_BY_KEY } = await import("../src/stats.js");
  const PL = await import(new URL("src/PlayerList.jsx", REPO).href);
  const fx = STAT_DEFS.filter(d => d.group === "fixtures");
  /* FORSENDAN FYRST — an hennar maelir kaflinn ekkert: thad ER hopur thar
     sem `blind` eitt hefdi thagad.                                       */
  ok(`"Upcoming fixtures" er ${fx.filter(d => d.live_only).length}/${fx.length} live_only og ${fx.filter(d => blind.has(d.key)).length}/${fx.length} blindur — `
     + "`blind` eitt hefdi thagad",
     fx.length > 0 && fx.every(d => d.live_only) && fx.every(d => !blind.has(d.key)));
  ok("...og `rangeBlind` telur tha ALLA ofaera um ad fylgja bilinu",
     fx.every(d => PL.rangeBlind(d, blind)));

  await click(btn("Upcoming fixtures"));
  await settle(400);
  const t = text();
  /* STERKA FULLYRDINGIN: bordinn er a skjanum og NEFNIR bilid.           */
  ok("UPCOMING FIXTURES: bordinn segir ad ekkert a skjanum fylgi GW 30-38",
     /(?:not|follows) GW\s*30[–-]38/i.test(t),
     "fimm framsynir dalkar an nokkurs merkis — thetta var bilunin");
  /* ORDALAGID MA EKKI LJUGA I HINA ATTINA. Strengurinn "season totals, not
     GW" er SANNANLEGA TIL — kafli 3a hér ad ofan krefst hans ordrett i
     Consistency — svo thessi neikvaeda fullyrding er ekki tom (CLAUDE.md 5b). */
  ok("...an thess ad kalla FDR6 og CS next 'season totals'",
     !/season totals, not GW/i.test(t));
  /* ENGINN LIFANDI DALKUR MA VERA ThOGULL: annadhvort ber hausinn merki eda
     bordinn tekur hann. Ordad sem VALKOSTUR svo hin leidin (merki i haus)
     falli ekki a profinu ef hun verdur einhvern tima maeld nothaef.      */
  const badged = [...document.querySelectorAll("[aria-sort]")]
    .filter(h => /season/.test(h.textContent)).length;
  ok(`hver framsynn dalkur er annadhvort merktur (${badged}) eda undir bordanum`,
     badged === fx.length || /(?:not|follows) GW\s*30[–-]38/i.test(t));

  /* SET PIECES: samsetningin sem skyrir thognina thar — LEIDD, ekki talin. */
  const sp = STAT_DEFS.filter(d => d.group === "setp");
  const spLive = sp.filter(d => d.live_only).map(d => d.key);
  const spAware = sp.filter(d => !PL.rangeBlind(d, blind)).map(d => d.key);
  ok(`"Set pieces and cards" ber BAEDI live_only (${spLive.join(",")}) og bils-faera dalka (${spAware.join(",")})`,
     spLive.length > 0 && spAware.length > 0);
  await click(btn("Set pieces and cards"));
  await settle(300);
  ok("...svo bordinn thegir thar RETTILEGA — sumt a skjanum fylgir bilinu",
     !/(?:not|follows) GW\s*30[–-]38/i.test(text()));
}

/* --- 3b. BASICS: her A talan ad geta breyst, svo advorunin ma EKKI birtast --- */
await click(btn("Basics"));
await settle(300);
ok("BASICS: engin 'season totals'-advorun (thar fylgja dalkar bilinu)",
   !/season totals, not GW/i.test(text()));

/* ============================================================
   4. SIURNAR SEM VORU TEKNAR UT — OG SMELLURINN SEM SIADI SJALFUR

   TILKYNNT AF NOTANDA 17.8.2026: "nuna smelli eg a listann og filteringin
   dettur sjalfkrafa inn." ENDURGERT I JSDOM ADUR EN NOKKUD VAR FJARLAEGT:
   einn smellur a holfid "239" (Points, Haaland) for listann ur
   **587 af 587 i 1 af 587** og holfid bar `title` "Points: 239 / Click to
   filter (min 239)". Mekanisminn var ekki fokus- eda render-villa heldur
   `onClick={() => filterOnValue(d, v)}` A HVERJU EINASTA TOLU-HOLFI: sian
   var sett a SAMSTUNDIS, svo smellur til ad LESA rod beitti henni.

   Fjarlaegt ad beidni: throskuldar-sian ("Threshold: ▾" + smellurinn),
   verd-bilid, lida-sian, "fit to play" og "my squad".
   Eftir standa stada, leit, vaktlisti og "hide selected".

   SMELL-A-TOLU KOM AFTUR 21.8.2026 SEM ALT-SMELLUR og thessi kafli er
   ThVI ENN VORDURINN sem gildir: hann fullyrdir ad BER smellur siar ekki
   og ad "Threshold: ▾"-rodin, verd-bilid, lida-sian og gatmerkin tvo seu
   AFRAM horfin. Nyja hegdunin (alt-smellur, chip, hreinsun, null-vordurinn)
   er profud i `playerlist-live-cols.mjs` kafla 5.

   TVAER FULLYRDINGAR, OG HVORUG DUGAR AN HINNAR:
     · stjornbordin eru horfin ur DOM (annars er thetta bara falid)
     · RADA-TALNINGIN er full (annars gaeti sia lifad afram i `filtered`
       an nokkurs stjornbords — thad vaeri VERRA en sian sjalf)
   ============================================================ */
H("4. SIURNAR SEM VORU TEKNAR UT (17.8.2026)");
{
  await click(btn("Basics"));
  await settle(200);
  const t0 = text();
  const gone = [["Threshold:", /Threshold:/], ["fit to play", /fit to play/],
                ["my squad", /my squad/], ["+ team", /\+ team/]];
  for (const [name, re] of gone)
    ok(`stjornbordid "${name}" er horfid ur vidmotinu`, !re.test(t0));
  /* Verd-reitirnir: number-innslattur med "from"/"to" er ekki lengur til. */
  const priceIn = [...document.querySelectorAll("input")]
    .filter(i => i.type === "number" && /from|to/.test(i.placeholder || ""));
  ok("verd-bilid (fra/til) er horfid", priceIn.length === 0, `fann ${priceIn.length}`);

  /* ---- RADA-TALNINGIN: ekkert threngir listann osynilega ---- */
  const shownOf = () => (text().match(/Players(\d+) of (\d+)/) || [])
    .slice(1).map(Number);
  const [shown, total] = shownOf();
  ok(`listinn er OSIADUR vid opnun: ${shown} af ${total}`, shown === total,
     "sia sem lifir i `filtered` an stjornbords er verri en sian sjalf");

  /* ANTI-TOMLEIKI: talan GETUR hreyfst — annars saannar hun ekkert.
     Stodu-flipinn er ein af sunum sem VORU EKKI teknar ut.            */
  await click(btn("GK")); await settle(200);
  const [gk, tot2] = shownOf();
  ok(`stodu-sian virkar enn (GK: ${gk} af ${tot2}) — talan er ekki fost`,
     gk > 0 && gk < tot2);
  await click(btn("All")); await settle(200);
  ok("...og 'All' skilar ollum aftur", shownOf()[0] === total);

  /* ---- SMELLURINN SJALFUR: ENDURGERDIN, NU SEM VORDUR ---- */
  const dataRows = () => [...document.querySelectorAll("div")].filter(d => {
    const f = d.children[0];
    return f && f.tagName === "DIV" &&
           [...f.children].some(c => c.tagName === "BUTTON" && /^[☆★]$/.test(c.textContent.trim()));
  });
  const bodyRows = () => dataRows().filter(d => !/Player/.test(d.children[0]?.textContent || ""));
  const row = bodyRows()[0];
  ok("gagna-rod fannst (forsenda smellsins)", !!row);
  if (row) {
    const cell = [...row.children][3];
    const val = (cell?.textContent || "").trim();
    /* FORSENDAN SONNUD FYRST: holfid ber TOLU. An hennar vaeri smellurinn
       a tomt holf og fullyrdingin haetti ad maela (CLAUDE.md 5b).      */
    ok(`smellt er a holf sem ber raunverulega tolu ("${val}")`,
       Number.isFinite(parseFloat(val)));
    /* ============================================================
       LOFORDID I TITLINUM — ThRJAR UTGAFUR, OG SU SEM STOD HER VARDI
       AFTURFORINA (leidrett 22.8.2026)

       LESTU ThETTA ADUR EN ThU SNYRD ThVI VID:
         · 17.8.2026 sagdi holfid "Click to filter (min 239)" OG ber
           smellur BEITTI siunni samstundis. Kvortun notandans var ekki
           "smellur ma ekki sia" heldur: **smellur til ad LESA rod ma
           ekki beita siu i thogn.**
         · 21.8.2026 var svarid ad krefjast `altKey`, og THESSI FULLYRDING
           NEGLDI ThAD FAST: hun krafdist ordanna "Alt-click to filter" og
           BANNADI "Click to filter". Notandinn felldi tha utgafu i thridja
           sinn — "eg get ekki enn ytt a akvedid stats til ad filtera eftir
           thvi" — thvi modifier sem hvergi er nefndur er ofinnanlegur, og
           `cellHit` setti `cursor:pointer` a hvert tolu-holf svo bendillinn
           lofadi smell sem gerdi ekkert.
         · 22.8.2026: BER SMELLUR OPNAR TILLOGU. Hann svarar (utgafa 2 fell
           a thvi) en breytir engu af sjalfu ser (utgafa 1 fell a thvi).

       SVARID VID KVORTUNINNI ER TILLAGAN, EKKI DAUDUR SMELLUR — thess
       vegna eru BADAR krofur fullyrtar her i einum og sama smelli, svo
       thaer geti ekki verid teknar i sundur aftur:
         A) titillinn lofar BERUM smelli og nefnir ENGAN modifier
         B) smellurinn opnar tillogu (hann svarar)
         C) listinn haggast ekki og enginn Filters-rammi kviknar
       Innihald tillogunnar sjalfrar — att, ritreitur, Apply/Cancel/Esc,
       verd sem MAX — er profad i `playerlist-live-cols.mjs` kafla 5.
       ============================================================ */
    const ti = cell?.getAttribute("title") || "";
    ok("holfid lofar BERUM smelli (`Click to filter`), an modifier-s",
       /Click to filter/.test(ti) && !/Alt-click|Shift-click|Ctrl-click/i.test(ti),
       JSON.stringify(ti));
    await click(cell);
    /* B) HANN SVARAR. An thessarar linu vaeri "siar ekki" aftur uppfyllt af
       DAUDUM smelli — nakvaemlega afturforin sem var felld thrisvar.     */
    const pop = () => [...document.querySelectorAll('[role="dialog"]')]
      .find(d => /Filter on this value/i.test(d.getAttribute("aria-label") || ""));
    ok("...og smellurinn SVARAR: tillaga ad siu opnast", !!pop(),
       "daudur smellur er utgafa 2, sem var felld");
    const applyBtn = [...(pop()?.querySelectorAll("button") || [])]
      .find(b => /Apply filter/i.test(b.textContent || ""));
    ok("tillagan ber `Apply filter` — ekkert gerist fyrr en ytt er a hann", !!applyBtn);
    /* C) OG HUN BREYTIR ENGU MEDAN HUN ER OPIN.                          */
    const [after, tot3] = shownOf();
    ok(`smellur a tolu SIAR EKKI: ${after} af ${tot3} (var 1 af 587 fyrir lagfaeringu)`,
       after === tot3);
    ok("...og enginn Filters-rammi kviknar af smellinum", !/Filters\d/.test(text()));
    /* Loka henni svo hun hangi ekki yfir naesta kafla.                   */
    const cancel = [...(pop()?.querySelectorAll("button") || [])]
      .find(b => /^Cancel$/i.test((b.textContent || "").trim()));
    if (cancel) await click(cancel);
    ok("Cancel lokar tillogunni an thess ad beita henni",
       !pop() && shownOf()[0] === tot3);
  }
}

/* ============================================================
   5. NAMUNDUNARREGLAN — FEATURE-ID ER FARID, FALLID ER ThAD EKKI

   Kaflinn var "SIAN OG TAFLAN MEGA ALDREI SEGJA SITTHVAD" (14.8.2026):
   notandinn siadi "start prob >= 90" og Ampadu og Botman duttu ut medan
   holfid sagdi 90 (0,897 -> 89,7, `dec: 0`).
   SIAN VAR TEKIN UT 17.8.2026 og `passesThreshold` stod thа eftir an
   notanda; hun KOM AFTUR 21.8.2026 sem alt-smellur og fallid er thvi
   notad ur `PlayerList.jsx` a nyjan leik. Reglan (namundun ad `dec` adur
   en borid er saman) er profud HER, a fallinu; hegdunin sem hun styrir er
   profud a DOM-inu (kafli 4 her og kafli 5 i `playerlist-live-cols.mjs`).
   Ad afrita regluna inn i `PlayerList.jsx` — thar sem hun VAR — er thad
   sem gerdi hana oprofanlega: stokkbreyting sem fjarlaegdi namundunina
   slapp i gegn.
   ============================================================ */
H("5. NAMUNDUNARREGLAN (`passesThreshold`) — FALLID STENDUR, NOTANDINN ER FARINN");
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
}

console.log(`\nUMFERDAR-BIL: ${pass} stodust, ${fail} fellu`);
process.exit(fail ? 1 : 0);
