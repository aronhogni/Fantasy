/* ============================================================
   experts.mjs — EIN UPPBYGGING A SERFRAEDINGA-VALINU.

   Bædi `sharp-lab.mjs` (er bord theirra betra en A-Ranking?) og
   `disagree-lab.mjs` (borgar sig ad hlusta thegar their eru
   SAMHLJODA osammala ADP?) thurfa NAKVAEMLEGA sama hop. Vaeri hvor
   med sina utgafu gaeti onnur maelt annan hop en hin og badar virst
   graenar medan svorin eru osamanburdarhaef — sama rok og fyrir
   `tests/lib/e0.mjs` i FPL-hlutanum.

   VALREGLAN SJALF ER MAELD (`expert-persistence.mjs`):
   midgildi percentila, lagmark 4 ar, og sa sem er HAETTUR er
   onothaefur hversu godur sem hann var. Ad taka ut versta arid var
   maelt og er MAELANLEGA VERRA — ekki taka thad upp aftur.
   ============================================================ */

const UA = "Mozilla/5.0 (compatible; fantasy-tools/1.0)";

export const median = (a) => {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y), h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

/** Sker ut svigajafnvaegan JSON-bút ur HTML frá tilteknum stad. */
export function sliceBalanced(s, at) {
  let d = 0, inStr = false, esc = false;
  for (let i = at; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "[" || c === "{") d++;
    else if (c === "]" || c === "}") { d--; if (!d) return s.slice(at, i + 1); }
  }
  return s.slice(at);
}

/** Nakvaemniskor FantasyPros fyrir eitt ar, eda null. */
export async function accuracyFor(year) {
  const html = await (await fetch(
    `https://www.fantasypros.com/nfl/accuracy/draft.php?year=${year}`,
    { headers: { "user-agent": UA } })).text();
  /* Arid a sidunni VERDUR ad passa — annars vaerum vid ad maela sama
     arid vid sjalft sig og fa fullkomna fylgni. */
  if (String((html.match(/<title>\s*(\d{4})/) || [])[1]) !== String(year)) return null;
  const at = html.indexOf('"rows":[');
  if (at < 0) return null;
  try {
    return JSON.parse(sliceBalanced(html, at + '"rows":'.length))
      .map((r) => ({ id: String(r.id), name: (r.expert && r.expert.label) || null,
                     rank: Number(r.rank) }))
      .filter((r) => r.id && r.rank);
  } catch { return null; }
}

/** Saekir nakvaemni 2015..2025. Skilar { acc, years }. */
export async function loadAccuracy(from = 2015, to = 2025, log = () => {}) {
  const acc = {};
  for (let y = from; y <= to; y++) {
    const r = await accuracyFor(y);
    if (r) acc[y] = r;
    await new Promise((s) => setTimeout(s, 300));
  }
  const years = Object.keys(acc).map(Number).sort((a, b) => a - b);
  log(`  ${years.length} ar af nakvaemni`);
  return { acc, years };
}

/**
 * Velur K bestu serfraedinga fyrir ar `y` — UR FYRRI ARUM EINGONGU.
 * Krefst >=4 ara ferils OG ad hann hafi birt i fyrra (sja notu ofar).
 */
export function pickExperts(acc, accYears, y, K) {
  const prior = accYears.filter((p) => p < y);
  if (prior.length < 2) return [];
  const hist = {};
  for (const p of prior) {
    for (const r of acc[p]) {
      (hist[r.id] = hist[r.id] || { name: r.name, p: [] })
        .p.push(r.rank / acc[p].length * 100);
    }
  }
  const lastYear = prior[prior.length - 1];
  const activeLast = new Set(acc[lastYear].map((r) => r.id));
  return Object.entries(hist)
    .filter(([id, v]) => v.p.length >= Math.min(4, prior.length) && activeLast.has(id))
    .map(([id, v]) => ({ id, name: v.name, mid: median(v.p) }))
    .sort((a, b) => a.mid - b.mid).slice(0, K);
}
