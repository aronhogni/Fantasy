/* ============================================================
   TUNGUMAL — vordur um enska thyduna

   AF HVERJU THETTA PROF ER TIL: appid var skrifad a islensku i ~9.000
   linum og enskan er ORDABOK ofan a frumtextann (sja src/i18n.js).
   Sa hattur hefur EINN bilunarhatt: nyr islenskur strengur er skrifadur,
   `tx()` er sett um hann, en THYDINGIN er ekki skrifud. Tha birtist
   islenska i ensku vidmoti — og ENGIN onnur profun i thessu repo-i saer
   thad, thvi appid keyrir a islensku sjalfgefid og oll hin profin lika.

   Thetta er sama aett af gildru sem kostadi viku thegar markadslidurinn
   var daudur i `odds.json` og oll 144 profin voru graen: fallid var rett,
   inntakid vantadi. Thess vegna les profid KODANN, ekki bara ordabokina.

   SJO ATRIDI:
     1. HVER lykill sem tx(...) kallar a er i EN.
     2. Stikur ({0}, {1} ...) eru THAER SOMU i lykli og thydingu — mega
        endurradast, en ekki tynast (tha birtist tom tala i vidmotinu).
     3. Enginn DAUDUR lykill i EN (texti sem enginn kallar a).
     4. Ekkert islenskt UI-strengbrot UTAN tx() — leki ur nyjum kóda.
     5. `lang` er i HVERJUM useMemo/useCallback dep-lista. An thess yrdu
        vistud gildi sem BERA texta stod eftir tungumalsskipti.
     6. Tofluheiti (STAT_DEFS) <= 22 stafir a ENSKU lika — sami vordur
        sem islenskan hefur i stats.test.mjs, toflufhausinn er 88 px.
     7. Vidmotstoflur a einingarsvidi eru LAZY (getterar). Fost `label:"x"`
        i module-scope frysist vid innflutning og hefdi ALDREI skipt mali.
   ============================================================ */
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const SRC = new URL("../src/", import.meta.url).pathname;
const files = readdirSync(SRC).filter(f => /\.(jsx|js)$/.test(f));

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${extra ? "   " + extra : ""}`); }
};

const { EN } = await import(SRC + "i18n-en.js");
const i18n = await import(SRC + "i18n.js");

const ast = f => parse(readFileSync(SRC + f, "utf8"), { sourceType: "module", plugins: ["jsx"] });

/* ---------- 1. Hver lykill i kodanum er i ordabokinni ---------- */
console.log("\n=== 1. LYKLAR SEM KODINN KALLAR A ===");

/* Kallid heitir `tx` i vidmotsskrunum (`t` er UPPTEKID i thessu repo-i
   sem lid/threp — 51 stadbundin binding) og `t` inni i i18n.js sjalfri. */
const used = new Map();      // key -> "file:line"
for (const f of files) {
  if (f === "i18n-en.js") continue;
  const wanted = f === "i18n.js" ? "t" : "tx";
  traverse(ast(f), {
    CallExpression(p) {
      if (p.node.callee?.name !== wanted) return;
      const a = p.node.arguments[0];
      const lits = a?.type === "StringLiteral" ? [a]
        : a?.type === "ConditionalExpression"
          ? [a.consequent, a.alternate].filter(x => x.type === "StringLiteral") : [];
      for (const l of lits) if (!used.has(l.value)) used.set(l.value, `${f}:${l.loc.start.line}`);
    },
  });
}
ok(`${used.size} lyklar fundnir i kodanum`, used.size > 800, `${used.size}`);

const missing = [...used].filter(([k]) => EN[k] == null);
ok("hver lykill hefur enska thydingu", missing.length === 0,
   missing.slice(0, 6).map(([k, at]) => `${at} ${JSON.stringify(k.slice(0, 40))}`).join(" | ")
   + (missing.length > 6 ? ` (+${missing.length - 6})` : ""));
ok("engin thyding er tom", ![...used].some(([k]) => EN[k] === ""));

/* ---------- 2. Stikur tynast ekki ---------- */
console.log("\n=== 2. STIKUR ({0}, {1} ...) ===");
const slots = s => (String(s).match(/\{\d+\}/g) || []).slice().sort().join(",");
const badSlots = Object.entries(EN).filter(([k, v]) => slots(k) !== slots(v));
ok("sama stiku-mengi i lykli og thydingu", badSlots.length === 0,
   badSlots.slice(0, 5).map(([k]) => JSON.stringify(k.slice(0, 45))).join(" | "));

/* Stika sem er notud en engin rok gefin -> tom tala i vidmotinu */
console.log("\n=== 3. ROK VID STIKUR ===");
let slotNoArgs = [];
for (const f of files) {
  if (/^i18n/.test(f)) continue;
  traverse(ast(f), {
    CallExpression(p) {
      if (p.node.callee?.name !== "tx") return;
      const a = p.node.arguments[0];
      if (a?.type !== "StringLiteral") return;
      const n = (a.value.match(/\{\d+\}/g) || []).length;
      const args = p.node.arguments[1];
      if (n > 0 && !args) slotNoArgs.push(`${f}:${a.loc.start.line} ${a.value.slice(0, 40)}`);
    },
  });
}
ok("hver lykill med stiku faer rok", slotNoArgs.length === 0, slotNoArgs.slice(0, 4).join(" | "));

/* ---------- 4. Enginn daudur lykill ---------- */
console.log("\n=== 4. DAUDIR LYKLAR ===");
/* Lyklar sem eru kalladir med BREYTU (tx(TIER_NAME[t]), tx(l), tx(POS[..]))
   sjast ekki i statiskri skonnun. Their eru taldir upp her — listinn er
   skjolun a thvi hvar dynamisk lyklun er notud, og hann ma ekki vaxa
   ohindrad: hver vidbot verdur ad vera VITUD.                          */
const DYNAMIC = [
  /* model.js TIER_NAME — tx(TIER_NAME[t]) i App.jsx og Rotation.jsx */
  "dökkgrænt", "grænt", "hlutlaust", "dökkgult", "ljósrautt", "rautt",
  /* Leaderboard POS_TABS + POS_LABEL, PlayerList POS_TABS + POS */
  "Allir", "Markv.", "Vörn", "Miðja", "Sókn", "MV", "V", "M", "S",
  "GK", "DEF", "MID", "FWD",
];
const dead = Object.keys(EN).filter(k => !used.has(k) && !DYNAMIC.includes(k));
ok("engin thyding a streng sem enginn kallar a", dead.length === 0,
   dead.slice(0, 8).map(k => JSON.stringify(k.slice(0, 35))).join(" | ")
   + (dead.length > 8 ? ` (+${dead.length - 8})` : ""));
for (const k of DYNAMIC) if (EN[k] == null) ok(`dynamiskur lykill ${k} er i EN`, false);

/* ---------- 5. Ekkert islenskt UTAN tx() ---------- */
console.log("\n=== 5. LEKI — ISLENSKA UTAN tx() ===");
const IS_CHARS = /[þðæöáíéúýóÞÐÆÖÁÍÉÚÝÓ]/;
/* Viljandi undanskilid, hvert med astaedu:
     - console.warn/error og new Error: forritara-skilaboð, ekki vidmot
     - translit-tafla i stats.js: LYKLAR (ð/þ/æ), ekki texti
     - TIER_NAME og POS-toflur: islenski strengurinn ER lykillinn og
       tx() stendur a notkunarstadnum (sja DYNAMIC ad ofan)             */
const EXEMPT = [
  "kjarnagögn í óvæntri lögun",
  "FPL: hvorki localStorage né window.storage í boði — ástand vistast EKKI.",
  "FPL: vistun brást (", "FPL: lestur brást (",
  "ð", "þ", "æ",
  /* Tungumals-vixlarinn: aria-label er VILJANDI a badum malum. Sa sem
     lenti i rongu tungumali verdur ad geta fundid leidina til baka.   */
  "Language / Tungumál",
  "dökkgrænt", "grænt", "dökkgult", "ljósrautt",
  "Vörn", "Miðja", "Sókn",
];
const inCall = (p, name) => {
  let up = p.parentPath;
  while (up) {
    if (up.node.type === "CallExpression" &&
        (up.node.callee?.name === name ||
         /warn|error|log/.test(up.node.callee?.property?.name || ""))) return true;
    up = up.parentPath;
  }
  return false;
};
const leaks = [];
for (const f of files) {
  if (/^i18n/.test(f)) continue;
  const src = readFileSync(SRC + f, "utf8");
  traverse(ast(f), {
    StringLiteral(p) {
      const v = p.node.value;
      if (!IS_CHARS.test(v) || EXEMPT.includes(v)) return;
      if (inCall(p, "tx")) return;
      if (p.parent.type === "ImportDeclaration") return;
      leaks.push(`${f}:${p.node.loc.start.line} ${JSON.stringify(v.slice(0, 45))}`);
    },
    JSXText(p) {
      const v = p.node.value.replace(/\s+/g, " ").trim();
      if (!IS_CHARS.test(v)) return;
      leaks.push(`${f}:${p.node.loc.start.line} JSX ${JSON.stringify(v.slice(0, 45))}`);
    },
    TemplateElement(p) {
      const v = p.node.value.cooked ?? "";
      if (!IS_CHARS.test(v) || EXEMPT.some(e => v.includes(e))) return;
      if (inCall(p, "tx")) return;
      leaks.push(`${f}:${p.node.loc.start.line} TPL ${JSON.stringify(v.slice(0, 45))}`);
    },
  });
}
ok("enginn islenskur vidmotsstrengur utan tx()", leaks.length === 0,
   leaks.slice(0, 6).join(" | ") + (leaks.length > 6 ? ` (+${leaks.length - 6})` : ""));

/* ---------- 6. lang i dep-listum ---------- */
console.log("\n=== 6. lang I DEP-LISTUM (stod memo-gildi) ===");
const noLang = [];
let deps = 0;
for (const f of files) {
  if (/^i18n|^useLang/.test(f)) continue;
  traverse(ast(f), {
    CallExpression(p) {
      const n = p.node.callee?.name;
      if (n !== "useMemo" && n !== "useCallback") return;
      const d = p.node.arguments[1];
      if (d?.type !== "ArrayExpression") return;
      deps++;
      if (!d.elements.some(e => e?.type === "Identifier" && e.name === "lang"))
        noLang.push(`${f}:${p.node.loc.start.line} ${n}`);
    },
  });
}
ok(`${deps} dep-listar skodadir`, deps > 50, `${deps}`);
ok("hver useMemo/useCallback hefur lang i dep-lista", noLang.length === 0,
   noLang.slice(0, 5).join(" | "));

/* ---------- 7. Hegdun: skipting, vistun, lazy toflur ---------- */
console.log("\n=== 7. HEGDUN ===");
const { t, setLang, getLang } = i18n;

ok("sjalfgefid tungumal er islenska", getLang() === "is");
ok("islenska skilar LYKLINUM obreyttum (engin ordabok)", t("Bekkur") === "Bekkur");
ok("okunnugur lykill fellur a lykilinn, hrynur ekki", t("!!engin!!") === "!!engin!!");

setLang("en");
ok("setLang('en') virkar", getLang() === "en");
ok("enska thyding birtist", t("Bekkur") === "Bench", t("Bekkur"));
ok("stikur fyllast", t("{0} skipti", [3]) === "3 transfers", t("{0} skipti", [3]));
ok("stika an raka verdur tom, ekki 'undefined'",
   t("{0} skipti", []) === " transfers", JSON.stringify(t("{0} skipti", [])));
ok("okunnugur lykill i ensku fellur a islenskuna", t("!!engin2!!") === "!!engin2!!");
ok("okunnugur lykill er TALINN (missingKeys)", i18n.missingKeys().includes("!!engin2!!"));

/* rugl-tungumal ma ekki skilja appid eftir i tomu mali */
setLang("kl");
ok("okunnugt tungumal fellur a islensku", getLang() === "is");

/* --- lazy toflur: THETTA ER VORDURINN GEGN FROSNUM HEITUM --- */
const { STAT_DEFS, STAT_GROUPS } = await import(SRC + "stats.js");
const { ROWS } = await import(SRC + "Compare.jsx").catch(() => ({ ROWS: null }));
setLang("is");
const isLabel = STAT_DEFS.find(d => d.key === "total_points").label;
const isGroup = STAT_GROUPS.find(g => g.key === "attack").label;
setLang("en");
const enLabel = STAT_DEFS.find(d => d.key === "total_points").label;
const enGroup = STAT_GROUPS.find(g => g.key === "attack").label;
ok("STAT_DEFS-heiti er LAZY (fylgir tungumali)", isLabel === "Stig" && enLabel === "Points",
   `${isLabel} -> ${enLabel}`);
ok("STAT_GROUPS-heiti er LAZY", isGroup === "Sókn" && enGroup === "Attack",
   `${isGroup} -> ${enGroup}`);

/* ---------- 8. Heiti of long fyrir toflufhaus ---------- */
console.log("\n=== 8. LENGD TOFLUHEITA (88 px hólf) ===");
const tooLong = STAT_DEFS.filter(d => d.label.length > 22).map(d => `${d.key}=${d.label}`);
ok("engin ensk heiti yfir 22 stafi", tooLong.length === 0, tooLong.slice(0, 5).join(" | "));
const enGroups = STAT_GROUPS.map(g => g.label);
ok("hver flokkur hefur enskt heiti", enGroups.every(l => l && !IS_CHARS.test(l)),
   enGroups.filter(l => IS_CHARS.test(l)).join(" | "));
setLang("is");

console.log(`\nTUNGUMAL: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
