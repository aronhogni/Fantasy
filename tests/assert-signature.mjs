/* ============================================================
   ok() — TVAER VIXLADAR SIGNATURUR, OG ThAER BUA TIL PROF SEM GETUR
   ALDREI FALLID

   MAELT 25.8.2026 a ollum profaskram i `tests/` og `nfl/tests/`:
   **68 skrar** skilgreina `ok(cond, name)` og **35** skilgreina
   `ok(name, cond)`. Baðar fjolskyldur eru laesilegar hvor fyrir sig;
   haettan er MILLI theirra.

   Afriti einhver linu ur skra i annarri fjolskyldu verdur skilyrdid
   STRENGUR — og strengur er alltaf truthy, svo fullyrdingin STENST
   ALLTAF. Hun litur ut eins og thekja, prentar graent tikk, og maelir
   ekkert. Thad er nakvaemlega versta utkoman i thessu repo-i
   (CLAUDE.md 5b: "tom fullyrding" · kafli 13: "fullyrding sem stenst
   stokkbreytinguna sem hun heitir eftir er verri en engin").

   ThAD ER EKKI TILGATA AD ThETTA GERIST: hofundur thessa safns var
   sjalfur i thann veginn ad skrifa `ok(cond, name)` inn i
   `untrusted-input.mjs`, sem er name-first skra, i somu lotu og
   safnid var smiðad.

   HVERS VEGNA GREINING EN EKKI SAMEINING:
   Ein sameiginleg `tests/lib/assert.mjs` vaeri retta endastodin, en hun
   snertir 103 skrar i einni ferd — og su breyting er sjalf nakvaemlega
   su tegund sem thetta repo krefst profs fyrir. Vordurinn er odyr,
   virkar STRAX, og heldur afram ad virka MEDAN sameiningin ferist
   skra fyrir skra. Hann fellur ekki vid sameininguna; hann verdur
   bara smam saman aðgerdalaus.

   HVAD ER FLAGGAD (adeins ThAD SEM GETUR ALDREI FALLID — engar
   smekks-athugasemdir):
     · cond-first skra:  ok("strengur", …)      -> skilyrdid er strengur
     · name-first skra:  ok(…, "strengur")      -> skilyrdid er strengur

   Keyrsla:  node tests/assert-signature.mjs
   ============================================================ */
import { readdirSync, readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

console.log(`\n${"=".repeat(84)}`);
console.log("ok()-SIGNATURUR — ENGIN FULLYRDING MA VERA ALLTAF SONN");
console.log("=".repeat(84));

/* ---------- textagreining sem THEKKIR strengi og athugasemdir ----------
   Naiv `indexOf("ok(")` dygdi ekki: bædi athugasemdir og strengir bera
   thetta mynstur, og athugasemdir i thessu repo-i vitna ordrett i kodann
   sem thaer utskyra (CLAUDE.md 13 — "athugasemd uppfyllti textaleit"). */
function stripCommentsAndTemplates(src) {
  let out = "", i = 0, n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2);
      i = e < 0 ? n : e + 2; out += " "; continue; }
    if (c === "/" && d === "/") { const e = src.indexOf("\n", i);
      i = e < 0 ? n : e; out += " "; continue; }
    if (c === '"' || c === "'" || c === "`") {
      /* Strengir eru VARDVEITTIR (vid thurfum ad sja ad their seu strengir)
         en innihaldid er maskad svo `ok(` inni i streng se ekki talid.   */
      const q = c; let j = i + 1, depth = 0;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (q === "`" && src[j] === "$" && src[j + 1] === "{") { depth++; j += 2; continue; }
        if (q === "`" && depth > 0 && src[j] === "}") { depth--; j++; continue; }
        if (src[j] === q && depth === 0) break;
        j++;
      }
      out += q + "".repeat(Math.max(0, j - i - 1)) + q;
      i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

/** Fyrstu tvo vidfong `ok(` sem byrjar a `at`. Skilar null se ojafnvaegi. */
function argsAt(s, at) {
  let i = at, depth = 0, start = -1, args = [];
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === "(" || c === "[" || c === "{") { if (depth === 0 && c === "(") start = i + 1; depth++; }
    else if (c === ")" || c === "]" || c === "}") {
      depth--;
      if (depth === 0) { args.push(s.slice(start, i)); return args; }
    } else if (c === "," && depth === 1) { args.push(s.slice(start, i)); start = i + 1; }
    if (args.length >= 3) return args;
  }
  return null;
}

const isStringLiteral = (a) => {
  const t = (a || "").trim();
  if (!t) return false;
  /* EITT samfellt strengja-bokstafsgildi — ekki `"a" + x`, ekki `x ? "a" : "b"`.
     Samsetning ("a" + n) er RETTMAETT nafn og ma ekki flaggast.          */
  if (!/^["'`]/.test(t) || !/["'`]$/.test(t)) return false;
  const q = t[0];
  /* Endar fyrsti strengurinn a SIDASTA stafnum? Ef ekki er thetta segd. */
  let j = 1;
  while (j < t.length) {
    if (t[j] === "\\") { j += 2; continue; }
    if (t[j] === q) break;
    j++;
  }
  return j === t.length - 1;
};

const FAMILY_RE = /const\s+ok\s*=\s*\(\s*(\w+)\s*,\s*(\w+)/;
const COND_NAMES = /^(c|cond|condition|v|x|b|bool|test)$/;
const NAME_NAMES = /^(n|name|m|msg|message|label|t|title|desc)$/;

const files = [];
for (const dir of ["tests", "nfl/tests"]) {
  for (const f of readdirSync(new URL(`../${dir}`, import.meta.url))) {
    if (f.endsWith(".mjs")) files.push(`${dir}/${f}`);
  }
}

let condFirst = 0, nameFirst = 0, unknown = [], offenders = [], scanned = 0;

for (const rel of files) {
  const raw = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
  const m = raw.match(FAMILY_RE);
  if (!m) continue;                       // skra an eigin `ok` — sleppt
  const first = m[1];
  const family = COND_NAMES.test(first) ? "cond"
               : NAME_NAMES.test(first) ? "name" : null;
  if (!family) { unknown.push(`${rel} (ok(${m[1]}, ${m[2]}))`); continue; }
  family === "cond" ? condFirst++ : nameFirst++;

  const s = stripCommentsAndTemplates(raw);
  /* Skilgreiningin sjalf er ekki kall. */
  const defAt = s.search(FAMILY_RE);
  for (const call of s.matchAll(/\bok\s*\(/g)) {
    const at = call.index + call[0].length - 1;
    if (defAt >= 0 && Math.abs(at - defAt) < 20) continue;
    const args = argsAt(s, at);
    if (!args || args.length < 2) continue;
    scanned++;
    const condArg = family === "cond" ? args[0] : args[1];
    if (isStringLiteral(condArg)) {
      const line = raw.slice(0, at).split("\n").length;
      offenders.push(`${rel}:${line} — ${family}-first skra en skilyrdid er STRENGUR`);
    }
  }
}

console.log(`\n  ·    ${condFirst} skrar med ok(cond, name) · ${nameFirst} med ok(name, cond)`);
console.log(`  ·    ${scanned} kall skodud i ${condFirst + nameFirst} skram`);

/* ThEKJA ER FULLYRDING, EKKI LOGGA (CLAUDE.md 5b regla 1). Fyndi
   greiningin skyndilega ekkert vaeri hun thogul og graen.            */
ok(condFirst + nameFirst >= 90,
  `FORSENDA: safnid finnur skrarnar (${condFirst + nameFirst} af ${files.length})`);
ok(scanned >= 2000, `og kollin i theim (${scanned})`);
ok(unknown.length === 0,
  `hver skra fellur i adra hvora fjolskylduna${unknown.length ? ": " + unknown.join(", ") : ""}`);

ok(offenders.length === 0,
  offenders.length
    ? `${offenders.length} fullyrding(ar) sem GETA ALDREI FALLID:\n      ` + offenders.join("\n      ")
    : "ENGIN fullyrding ber streng thar sem skilyrdi a ad vera");

/* ---------- SJALFSPROF: greiningin verdur ad SJA vixlunina ----------
   An thessa vaeri "0 fundnir" jafn-gott merki um bilada greiningu og um
   heilbrigdan koda — sami vandi og `react-warnings.mjs` hafdi thegar hun
   heimsotti 0 af 22 vidmotum og var graen.                            */
{
  const probeCond = `const ok = (c, n) => {};\nok("thetta er nafn, ekki skilyrdi", x > 1);\n`;
  const probeName = `const ok = (n, c) => {};\nok(x > 1, "thetta er nafn a skilyrdis-stad");\n`;
  const probeGood = `const ok = (c, n) => {};\nok(x > 1, "rett rod");\nok(a === b, \`nafn \${x}\`);\n`;
  const scan = (src, fam) => {
    const s = stripCommentsAndTemplates(src);
    let hits = 0;
    const defAt = s.search(FAMILY_RE);
    for (const call of s.matchAll(/\bok\s*\(/g)) {
      const at = call.index + call[0].length - 1;
      if (defAt >= 0 && Math.abs(at - defAt) < 20) continue;
      const args = argsAt(s, at);
      if (!args || args.length < 2) continue;
      if (isStringLiteral(fam === "cond" ? args[0] : args[1])) hits++;
    }
    return hits;
  };
  ok(scan(probeCond, "cond") === 1, "SJALFSPROF: vixlun i cond-first skra ER FUNDIN");
  ok(scan(probeName, "name") === 1, "SJALFSPROF: vixlun i name-first skra ER FUNDIN");
  ok(scan(probeGood, "cond") === 0, "SJALFSPROF: rett rod er EKKI flogguð (engin fals-jakvaed)");
  /* Samsett nafn ("a" + n) er RETTMAETT og ma ekki flaggast — annars
     yrdi vordurinn slokktur innan viku, eins og `no-icelandic` ordalistinn. */
  ok(scan(`const ok = (c, n) => {};\nok("a" + b, n);\n`, "cond") === 0,
    "SJALFSPROF: samsett segd er EKKI strengja-bokstafsgildi");
}

console.log(`\nok()-SIGNATURUR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
