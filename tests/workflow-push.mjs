/* ============================================================
   PUSH-KAPPHLAUPIÐ Í PIPELINE-INU — vörður

   ÞETTA FÉLL Í RAUN 29.7.2026 kl. 07:40 UTC. `fetch-fast` pushaði 12
   sekúndum á undan `fetch-data`, svo pushi dagsins var HAFNAÐ
   ("! [rejected] main -> main (fetch first)") og heill dagur af sóttum
   gögnum fór í ruslið. Keyrslan varð rauð en ekkert sagði hvað tapaðist.

   `fetch.yml` hafði ENGA `git pull`. `fetch-fast.yml` hafði pull en ÁÐUR
   en hún committaði — sem lokar minni glugga en ekki þeim sem felldi hana.

   ÞETTA PRÓF DREGUR SHELL-BLOKKINA ÚR .github/workflows/*.yml (raunverulegan
   texta, ekki eftirlíkingu) og keyrir hana á ALVÖRU git-hirslum þar sem
   kapphlaupið er þvingað fram. Þrjár aðstæður:
     A. enginn áreksur          -> pushar í fyrstu tilraun
     B. fjarlæg grein hreyfðist  -> hafnað, endurstillir, pushar, BÁÐAR
                                    breytingar varðveitast
     C. sama skrá á báðum stöðum -> OKKAR fersk sókn vinnur (-X theirs)

   C er mikilvægast og það sem `-X theirs` er til fyrir: data/ er
   endurmyndað í heild í hverri keyrslu, svo nýrri sókn er alltaf réttari.
   ============================================================ */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log(`  ✓ ${n}`)) : (fail++, console.log(`  ✗ ${n}`)); };

console.log(`\n${"=".repeat(84)}`);
console.log("PUSH-KAPPHLAUP Í PIPELINE (.github/workflows)");
console.log("=".repeat(84));

/* ---------- Draga blokkina út úr YAML-inu ---------- */
function extractBlock(file) {
  const src = readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), "utf8");
  const lines = src.split("\n");
  const start = lines.findIndex(l => /^\s+run: \|\s*$/.test(l) &&
    lines[lines.indexOf(l) - 1]?.includes("Committa"));
  if (start < 0) return null;
  const body = [];
  const indent = (lines[start + 1].match(/^\s*/) || [""])[0].length;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "") { body.push(""); continue; }
    if ((l.match(/^\s*/) || [""])[0].length < indent) break;
    body.push(l.slice(indent));
  }
  return body.join("\n");
}

const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/* Umhverfi sem hermir eftir Actions-keyrslu: bare "remote", pipeline-klón
   og annar klón sem pushar á milli.                                      */
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "wfpush-"));
  const remote = join(root, "remote.git");
  mkdirSync(remote);
  git(remote, "init", "--bare", "-b", "main");
  const seed = join(root, "seed");
  git(root, "clone", remote, "seed");
  mkdirSync(join(seed, "data"));
  writeFileSync(join(seed, "data", "a.json"), '{"v":0}\n');
  writeFileSync(join(seed, "data", "b.json"), '{"v":0}\n');
  git(seed, "config", "user.email", "t@t"); git(seed, "config", "user.name", "t");
  git(seed, "add", "-A"); git(seed, "commit", "-m", "seed"); git(seed, "push", "origin", "main");
  const pipe = join(root, "pipe"), other = join(root, "other");
  git(root, "clone", remote, "pipe");
  git(root, "clone", remote, "other");
  for (const d of [pipe, other]) {
    git(d, "config", "user.email", "t@t"); git(d, "config", "user.name", "t");
  }
  return { root, remote, pipe, other };
}

/* Keyra blokkina eins og Actions gerir: bash -e, cwd = hirslan */
function runBlock(block, cwd) {
  try {
    const out = execFileSync("bash", ["-c", block], { cwd, encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

for (const file of ["fetch.yml", "fetch-fast.yml"]) {
  const block = extractBlock(file);
  console.log(`\n${"─".repeat(84)}`);
  console.log(file);
  console.log("─".repeat(84));
  ok(!!block && block.includes("git push"), "commit/push-blokkin fannst í YAML-inu");
  if (!block) continue;
  ok(/for i in 1 2 3 4 5/.test(block), "endurtilraunalykkja er til (var ekki 29.7. og það kostaði dag)");
  ok(/rebase -X theirs origin\/main/.test(block), "endurstillir ofan á origin/main með okkar gögn í forgangi");
  ok(/git fetch origin main/.test(block), "sækir fjarlægu greinina áður en endurstillt er");

  /* ---- A. enginn árekstur ---- */
  {
    const S = sandbox();
    writeFileSync(join(S.pipe, "data", "a.json"), '{"v":1}\n');
    const r = runBlock(block, S.pipe);
    ok(r.code === 0, `A: enginn árekstur -> keyrslan grænn (kóði ${r.code})`);
    ok(/pushað í tilraun 1/.test(r.out), "A: pushað í FYRSTU tilraun, engin óþörf endurstilling");
    ok(git(S.remote, "show", "main:data/a.json").includes('"v":1'), "A: gögnin komust á remote");
    rmSync(S.root, { recursive: true, force: true });
  }

  /* ---- B. kapphlaupið sjálft: annað push lendir á milli ---- */
  {
    const S = sandbox();
    writeFileSync(join(S.pipe, "data", "a.json"), '{"v":2}\n');       // okkar sókn
    writeFileSync(join(S.other, "data", "b.json"), '{"fast":1}\n');   // fetch-fast
    git(S.other, "add", "-A"); git(S.other, "commit", "-m", "fast");
    git(S.other, "push", "origin", "main");                           // 12 sek a undan
    const r = runBlock(block, S.pipe);
    ok(r.code === 0, `B: push hafnað fyrst en keyrslan endar GRÆN (kóði ${r.code})`);
    ok(/push hafnað \(tilraun 1\)/.test(r.out), "B: hafnanir eru SKRÁÐAR, ekki þagðar í hel");
    ok(/pushað í tilraun 2/.test(r.out), "B: nær í gegn í annarri tilraun");
    ok(git(S.remote, "show", "main:data/a.json").includes('"v":2'),
      "B: OKKAR gögn töpuðust EKKI (þetta er villan sem féll 29.7.)");
    ok(git(S.remote, "show", "main:data/b.json").includes('"fast":1'),
      "B: hinnar keyrslunnar gögn töpuðust ekki heldur");
    rmSync(S.root, { recursive: true, force: true });
  }

  /* ---- C. sama skrá á báðum stöðum: okkar fersk sókn vinnur ---- */
  {
    const S = sandbox();
    writeFileSync(join(S.pipe, "data", "a.json"), '{"v":"okkar-ferska"}\n');
    writeFileSync(join(S.other, "data", "a.json"), '{"v":"eldri"}\n');
    git(S.other, "add", "-A"); git(S.other, "commit", "-m", "fast");
    git(S.other, "push", "origin", "main");
    const r = runBlock(block, S.pipe);
    ok(r.code === 0, `C: árekstur í SÖMU skrá -> samt grænn (kóði ${r.code})`);
    const final = git(S.remote, "show", "main:data/a.json");
    ok(final.includes("okkar-ferska"),
      `C: NÝRRI sóknin vinnur áreksturinn (fékk ${final.trim()})`);
    ok(!/rebase brast/.test(r.out), "C: ekkert rebase-hrun — engin handvirk lausn þarf í Actions");
    rmSync(S.root, { recursive: true, force: true });
  }

  /* ---- D. engar breytingar -> engin commit, engin villa ---- */
  {
    const S = sandbox();
    const r = runBlock(block, S.pipe);
    ok(r.code === 0 && /Engar breytingar/.test(r.out),
      "D: engar breytingar -> sleppir commit og endar grænn");
    ok(git(S.remote, "rev-list", "--count", "main") === "1",
      "D: engin tóm commit skrifuð á remote");
    rmSync(S.root, { recursive: true, force: true });
  }
}

/* ---------- LYKLAR SEM WORKFLOWIN VERDA AD GEFA ----------
   fetch-fast.yml hafdi ENGAN env-blokk og thad gerdi fetchLineups (stadfest
   byrjunarlid) ad daudum koda: FLAGS.apisports var false, svo fallid var
   sleppt thegjandi — prof graen, status graenn, aldrei eitt byrjunarlid.
   Fannst 31.7. med thvi ad RAESA workflowid og sja ad rannsakandi kallid
   kom aldrei i logid. Vordur: lineups eru sott i HRADA keyrslunni, svo
   lykillinn VERDUR ad vera thar.                                        */
console.log(`\n${"─".repeat(84)}`);
console.log("LYKLAR I WORKFLOWUM");
console.log("─".repeat(84));
{
  const fast = readFileSync(new URL("../.github/workflows/fetch-fast.yml", import.meta.url), "utf8");
  const daily = readFileSync(new URL("../.github/workflows/fetch.yml", import.meta.url), "utf8");
  const fetchSrc = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
  const inFast = fetchSrc.slice(fetchSrc.indexOf("async function fetchFast("));
  const fastBody = inFast.slice(0, inFast.indexOf("\n}\n"));
  const fastNeedsApiSports = /fetchLineups\(\)/.test(fastBody);
  ok(fastNeedsApiSports,
    "fetchFast kallar a fetchLineups (annars er thessi vordur ekki timabaer)");
  if (fastNeedsApiSports)
    ok(/API_SPORTS_KEY:\s*\$\{\{\s*secrets\.API_SPORTS_KEY/.test(fast),
      "fetch-fast.yml GEFUR API_SPORTS_KEY — annars er fetchLineups daudur kodi");
  ok(/API_SPORTS_KEY:\s*\$\{\{\s*secrets\.API_SPORTS_KEY/.test(daily),
    "fetch.yml gefur API_SPORTS_KEY (meidsla-tegund)");
}

/* ---------- Actions-útgáfur ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("ACTIONS-ÚTGÁFUR");
console.log("─".repeat(84));
for (const file of ["fetch.yml", "fetch-fast.yml", "pages.yml"]) {
  const src = readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), "utf8");
  const old = src.match(/(actions\/(?:checkout|setup-node)@v[1-4])\b/g);
  ok(!old, `${file}: engin Node-20-afskrifuð action (${old ? old.join(", ") : "allt v5+"})`);
}

/* ============================================================
   LYKLARNIR SEM `FLAGS` LES VERDA AD VERA I ThVI WORKFLOWI SEM KEYRIR
   FALLID — ANNARS ER KODINN DAUDUR OG STADAN GRAEN

   ThETTA HEFUR NU GERST TVISVAR, I SITTHVORA ATTINA:
     31.7.2026  `fetch-fast.yml` gaf ekki API_SPORTS_KEY -> FLAGS.apisports
                false -> `fetchLineups` sleppt ThEGJANDI (CLAUDE.md 7.1).
     10.8.2026  `fetch.yml` gaf ekki BSD_KEY -> FLAGS.bsd false i DAGLEGU
                keyrslunni, sem er EINA stadurinn thar sem `fetchBsdLive()`
                er kallad ("DAGLEGA, EKKI --fast") -> bsd_live.json var
                aldrei skrifud i CI.

   Bædi tilvikin voru osynileg: fallid er til, kallid er til, profin lesa
   KODANN og eru graen. Eina leidin til ad sja thetta er ad bera saman
   TVAER SKRAR — hvad `FLAGS` les og hvad workflow-id gefur.

   VID KREFJUMST EKKI ThESS AD OLL KEYRSLAN HAFI ALLA LYKLA. `--fast`
   keyrir fa foll og tharf ekki EURO_API_KEY. Krafan er ThRENGRI og thvi
   raunhaef: se fall kallad i keyrslu, verdur lykillinn sem kveikir a thvi
   ad vera i ThEIRRI keyrslu.
   ============================================================ */
console.log(`\n${"─".repeat(72)}\nLYKLAR: FLAGS A MOTI WORKFLOW-UNUM\n${"─".repeat(72)}`);
{
  const fetchSrc = readFileSync(new URL("../scripts/fetch.mjs", import.meta.url), "utf8");
  const envOf = f => readFileSync(new URL(`../.github/workflows/${f}`, import.meta.url), "utf8");

  /* Hvada FLAGS-svid les hvada umhverfisbreytu? Lesid UR KODANUM.     */
  const flagBlock = fetchSrc.match(/const FLAGS = \{([\s\S]*?)\n\};/)?.[1] || "";
  const flagKey = {};
  for (const m of flagBlock.matchAll(/(\w+)\s*:\s*[^,\n]*process\.env\.(\w+)/g))
    flagKey[m[1]] = m[2];
  ok(Object.keys(flagKey).length >= 8,
     `FLAGS-svid lesin ur fetch.mjs (${Object.keys(flagKey).length})`);

  /* Hvada foll eru kolluð undir hvaða flaggi, og i hvorri keyrslunni?
     `--fast` greinin er `fetchFast()`; hitt er daglega keyrslan.       */
  const fastBody = fetchSrc.match(/async function fetchFast\(\)[\s\S]*?\n\}/)?.[0] || "";
  const mainBody = fetchSrc.match(/async function main\(\)[\s\S]*?\n\}/)?.[0] || "";
  ok(fastBody.length > 200 && mainBody.length > 200, "fetchFast() og main() fundust");

  const flagsUsedIn = body => new Set(
    [...body.matchAll(/FLAGS\.(\w+)/g)].map(m => m[1]));

  for (const [file, body, label] of [
    ["fetch.yml", mainBody, "dagleg keyrsla"],
    ["fetch-fast.yml", fastBody, "--fast"],
  ]) {
    const yml = envOf(file);
    const need = [...flagsUsedIn(body)]
      .map(f => flagKey[f])
      .filter(k => k && /_KEY$/.test(k));           // adeins leyndarmal, ekki ENABLE_*
    /* LEITAD AD RAUNVERULEGRI STILLINGU, EKKI AD ORDINU.
       Fyrsta utgafan gerdi `yml.includes(k)` — og stokkbreytingin (ad
       fjarlaegja `BSD_KEY:` linuna) SLAPP, thvi ordid "BSD_KEY" stod enn
       i ATHUGASEMDINNI sem eg skrifadi vid hlidina a henni. Fullyrding
       sem athugasemd getur uppfyllt er einskis virdi. Krafan er thvi
       `LYKILL: ${{ secrets… }}` a eigin linu.                          */
    const assigned = k =>
      new RegExp(`^\\s*${k}\\s*:\\s*\\$\\{\\{\\s*secrets\\.`, "m").test(yml);
    const missing = [...new Set(need)].filter(k => !assigned(k));
    ok(need.length > 0, `${label}: les ${new Set(need).size} lykil-flogg`);
    ok(missing.length === 0,
       `${file} gefur alla lykla sem ${label} tharf${missing.length ? " — VANTAR: " + missing.join(", ") : ""}`);

    /* ============================================================
       ENABLE_* ER LIKA BORID SAMAN — VID KODANN, EKKI ADEINS VID SIG.
       Sian hér fyrir ofan sleppir `ENABLE_*` viljandi (thau eru ekki
       leyndarmal), og i thvi skjoli lifdi ThOGUL MOTSOGN: `fetch.yml` setti
       `ENABLE_ESPN: "false"` medan `FLAGS.espn` var skilgreind og ALDREI
       lesin, svo ESPN var sott i hverri keyrslu. Uppsetningin sagdi eitt og
       kodinn gerdi annad — og HVORUGT var rautt.
       Tvaer attir, og badar tharf:
         (a) `ENABLE_X` i workflow sem ENGIN `FLAGS`-lina les  -> dautt.
         (b) `FLAGS`-flagg sem kodinn LES en workflow nefnir ekki -> reidir
             sig thogult a sjalfgildid.
       ============================================================ */
    const enableInYml = [...new Set([...yml.matchAll(/^\s*(ENABLE_[A-Z_]+)\s*:/gm)].map(m => m[1]))];
    const enableInCode = new Set([...fetchSrc.matchAll(/process\.env\.(ENABLE_[A-Z_]+)/g)].map(m => m[1]));
    const dead = enableInYml.filter(k => !enableInCode.has(k));
    ok(dead.length === 0,
       `${file}: engin ENABLE_* sem kodinn les ekki${dead.length ? " — DAUD: " + dead.join(", ") : ""}`);
  }
}

console.log(`\nPUSH-KAPPHLAUP: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
