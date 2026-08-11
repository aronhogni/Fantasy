/* ============================================================
   KYRRSTODU-TENGINGAR — TVEIR VILLUFLOKKAR SEM ENGIN VORN SA

   Notandinn fann TVAER villur i rod sem eg hefdi att ad finna:
     1. Umferdar-valarinn i Teams teiknadist sem ber texti
        ("1234567891011…38") thvi SJO stila-lyklar — S.gwBar, S.gwBox,
        S.gwBoxOn, S.gwToggle, S.gwNow, S.gwClear, S.gwWarn — voru NOTADIR
        en HVERGI SKILGREINDIR.
     2. Man Utd bar enga Evropu-stjornu thvi `participation` naedi adeins
        yfir CL (sja tests/euro-participation.mjs).

   Fyrri villan er KYRRSTODU-GREINANLEG og hefdi att ad finnast an thess ad
   nokkur opnadi appid:
     - `S.gwBox` er GILD uppfletting sem skilar `undefined`
     - `{...undefined}` er LOGLEG JS
     - esbuild og `npm run build` eru thvi GRAEN
     - `data-resilience` telur STAFI, og 38 tolur an stila eru jafn margir
       stafir og 38 med stilum
     - `react-warnings` kvartar ekki: React segir ekkert um style={undefined}

   Thetta safn breytir theim flokki ur "notandinn finnur hann" i "profid
   fellur". Thad les KODANN, ekki DOM-inn, svo thad naer lika vidmotum sem
   ekkert jsdom-prof heimsaekir.
   ============================================================ */
import { readFileSync, readdirSync } from "node:fs";

const SRC = new URL("../src/", import.meta.url).pathname;
const files = readdirSync(SRC).filter(f => f.endsWith(".jsx") || f.endsWith(".js"));
const all = files.map(f => [f, readFileSync(SRC + f, "utf8")]);

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${extra ? "   " + extra : ""}`); }
};

console.log(`\n${"=".repeat(84)}`);
console.log("KYRRSTODU-TENGINGAR — stila-lyklar og props");
console.log("=".repeat(84));

/* ---------- 1. STILA-LYKLAR SEM ERU NOTADIR EN EKKI TIL ---------- */
console.log("\n1) hver `S.x` sem er notadur verdur ad vera skilgreindur");
{
  /* Adferdir a fylkjum/strengjum lita eins ut og stila-lyklar i regexi
     (`arr.filter`, `s.replace`), svo their eru undanskildir. Listinn er
     VILJANDI langur: falskt jakvaett svar i thessum verdi gerir hann
     omarktaekan og hann verdur slokktur innan viku.                    */
  const NOT_STYLE = new Set(["filter","map","find","every","some","slice","sort","length",
    "join","includes","reduce","concat","flat","indexOf","forEach","keys","values","entries",
    "at","push","split","replace","trim","toFixed","test","match","has","get","set","add",
    "size","startsWith","endsWith","toLowerCase","toUpperCase","padEnd","padStart","reverse",
    "findIndex","flatMap","repeat","charAt","toLocaleString","json","then","catch","from"]);
  let bad = 0, checked = 0;
  for (const [f, s] of all) {
    const i = s.indexOf("const S = {");
    if (i < 0) continue;
    checked++;
    const rest = s.slice(i);
    const end = rest.search(/\n};/);
    const body = rest.slice(0, end < 0 ? rest.length : end);
    const defined = new Set([...body.matchAll(/^\s{2}([A-Za-z0-9_]+)\s*:/gm)].map(m => m[1]));
    const used = [...s.matchAll(/\bS\.([A-Za-z0-9_]+)/g)].map(m => m[1]);
    const missing = [...new Set(used)].filter(k => !defined.has(k) && !NOT_STYLE.has(k));
    if (missing.length) { bad++; console.log(`     ${f}: ${missing.join(", ")}`); }
  }
  ok(`engir oskilgreindir stila-lyklar (${checked} skrar med S-hlut)`, bad === 0);
  ok("safnid skodadi raunverulega einhverjar skrar", checked >= 5,
     "ef `const S = {` snidid breytist thegir vordurinn — thad er tom fullyrding");
}

/* ---------- 2. PROPS SEM ERU LESIN EN ALDREI SEND ---------- */
console.log("\n2) hvert prop sem vidmot les verdur ad berast (eda hafa sjalfgildi)");
{
  /* TAG-ENDINN ER FUNDINN MED SVIGATALNINGU. Fyrsta utgafa thessa skanna
     notadi `<Comp[^>]*>` og fekk 14 FALS-JAKVAED svor, thvi ör-foll
     (`onWatch={id => ...}`) bera `>` inni i gildi og skaru tagid i sundur.
     Skanni sem hropar ulfur er verri en enginn skanni.                 */
  const tagBody = (src, start) => {
    let i = start, depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) return src.slice(start, i);
      i++;
    }
    return "";
  };
  let bad = 0, checked = 0;
  for (const [f, s] of all) {
    if (!f.endsWith(".jsx")) continue;
    const comp = f.replace(".jsx", "");
    const m = s.match(/export default function\s+\w+\s*\(\s*\{([^}]*)\}/s);
    if (!m) continue;
    /* Props MED sjalfgildi eru viljandi valfrjals — `width = 300`. */
    const required = m[1].split(",")
      .map(x => x.trim())
      /* `children` er INNBYGGT React-prop og berst sem born i JSX, aldrei
         sem eiginleiki — thad ma ekki teljast otengt.                    */
      .filter(x => x && !x.startsWith("...") && !x.includes("=") && x !== "children")
      .map(x => x.split(":")[0].trim());
    const passedTo = new Set();
    let rendered = false;
    for (const [, s2] of all) {
      for (const cm of s2.matchAll(new RegExp("<" + comp + "\\b", "g"))) {
        rendered = true;
        for (const pm of tagBody(s2, cm.index + cm[0].length).matchAll(/(\w+)\s*=\s*[{"]/g))
          passedTo.add(pm[1]);
      }
    }
    if (!rendered) continue;
    checked++;
    const never = required.filter(p => !passedTo.has(p));
    if (never.length) { bad++; console.log(`     ${comp}: ${never.join(", ")}`); }
  }
  ok(`engin props lesin an thess ad berast (${checked} vidmot)`, bad === 0);
  ok("safnid skodadi raunverulega einhver vidmot", checked >= 5);
}

/* ---------- 3. GAGNASKRAR SEM ERU SOTTAR EN ALDREI NOTADAR ---------- */
console.log("\n3) hver skra sem er sott verdur ad rata i vidmot");
{
  const app = all.find(([f]) => f === "App.jsx")[1];
  /* `setX(await j("y.json"))` og letihledslur — hvad er sott. */
  const setters = [...app.matchAll(/set([A-Z]\w+)\(await j\("([^"]+)"\)\)/g)]
    .map(m => ({ state: m[1][0].toLowerCase() + m[1].slice(1), file: m[2] }));
  const unused = setters.filter(({ state }) => {
    /* Notad ef thad er sent sem prop, lesid i useMemo, eda birt. */
    /* MORKIN ERU EITT, EKKI TVO. `const [x, setX] = useState()` gefur
       EINA tilvik af `x`; hver raunveruleg notkun baetir vid. Fyrsta
       utgafan notadi `<= 2` og flaggadi `spNotes` sem er RAUNVERULEGA
       sent i SetPieces — falskt jakvaett svar sem hefdi ordid til thess
       ad einhver slokkti a verdinum.                                    */
    const uses = [...app.matchAll(new RegExp("\\b" + state + "\\b", "g"))].length;
    return uses <= 1;                    // adeins useState-lysingin = ONOTAD
  });
  ok(`engin sott skra er onotud${unused.length ? " — " + unused.map(u => u.file).join(", ") : ""}`,
     unused.length === 0);
  ok(`fann sottar skrar (${setters.length})`, setters.length >= 10);
}

console.log(`\nKYRRSTODU-TENGINGAR: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
