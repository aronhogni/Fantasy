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

/* ---------- Actions-útgáfur ---------- */
console.log(`\n${"─".repeat(84)}`);
console.log("ACTIONS-ÚTGÁFUR");
console.log("─".repeat(84));
for (const file of ["fetch.yml", "fetch-fast.yml", "pages.yml"]) {
  const src = readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), "utf8");
  const old = src.match(/(actions\/(?:checkout|setup-node)@v[1-4])\b/g);
  ok(!old, `${file}: engin Node-20-afskrifuð action (${old ? old.join(", ") : "allt v5+"})`);
}

console.log(`\nPUSH-KAPPHLAUP: ${pass} stóðust, ${fail} féllu`);
process.exit(fail ? 1 : 0);
