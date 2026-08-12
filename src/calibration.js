/* ============================================================
   KVORDUN — HELDUR MAELINGIN ENN?

   `scripts/snapshot-predictions.mjs` skrifar nidur hvad vid SPADUM fyrir
   umferd, adur en hun er spilud. Thetta fall ber thad vid ThAD SEM GERDIST.

   HREINT OG UTAN REACT af somu astaedu og `model.js`/`market.js`: profin
   verda ad keyra NAKVAEMLEGA sama kodann og skyrslan birtir, annars maelir
   skyrslan eitt og profid annad.

   ============================================================
   REGLAN SEM STJORNAR HVERRI TOLU HER: FAAR MAELINGAR -> ENGIN TALA
   ============================================================
   Kvordun a EINNI umferd er havadi. Hvert svid skilar `null` + `why` thegar
   urtakid er of litid — ALDREI tolu sem litur ut eins og maeling. Thad er
   sama reglan sem allt repo-id fylgir (CLAUDE.md 8: omaeld tala faer ekki
   reit), og hun er HARDARI her en annars stadar: tala ur einni umferd sem
   les eins ut og tala ur atta timabilum vaeri versta utkoman i skjolun sem
   byggir a maelingum.

   VIDMIDIN ERU SKJALFEST VID HVERJA TOLU, ekki i haus — svo drift sjaist a
   somu linu og talan:
     FFDR       CS% i lettasta sjottungi 44,9% og thyngsta 7,8% (10 timabil)
     rankScore  topp-15 5,13 stig/val · FPL-eigid xP 4,48 · appid 4,70
     start_prob Brier 0,089 (a moti 0,118 fyrir "byrjadi sidast"),
                laegsti tiundarhluti fangar 42-49% theirra sem falla a bekk
   ============================================================ */

/* Hlutfall med talningu — `null` thegar urtakid ber thad ekki. */
function rate(hits, n, minN, label) {
  if (!n || n < minN) return { value: null, n, why: `${label}: ${n} sýni, þarf ${minN}` };
  return { value: +(hits / n).toFixed(4), n, why: null };
}

/* ---------------------------------------------------------------
   1. FFDR -> HREIN BLOD
   Threpin eru ALGILD (afstæd voru maeld og hofnud), svo thau eru talin
   sem thau eru: threp 0-1 = lettast, TIER_MAX = thyngst.
   --------------------------------------------------------------- */
export function ffdrVsCleanSheets({ snapshots, results, minN = 20 }) {
  const byTier = new Map();
  let matched = 0;
  for (const snap of snapshots) {
    for (const row of (snap.ffdr || [])) {
      if (row.def_tier == null) continue;
      const r = results.find(x => x.fixture === row.fixture && x.team === row.team);
      if (!r || r.conceded == null) continue;
      matched++;
      const t = byTier.get(row.def_tier) || { cs: 0, n: 0 };
      t.n++; if (r.conceded === 0) t.cs++;
      byTier.set(row.def_tier, t);
    }
  }
  const tiers = [...byTier.entries()].sort((a, b) => a[0] - b[0])
    .map(([tier, t]) => ({ tier, ...rate(t.cs, t.n, minN, `þrep ${tier}`) }));
  const light = tiers.find(t => t.value != null);
  const heavy = [...tiers].reverse().find(t => t.value != null);
  /* MONOTONI ER PROFID, EKKI STOK PROSENTA: FFDR heldur ef LETTARI threp
     gefa FLEIRI hrein blod. Ein prosenta getur flakkad; rodin ma ekki.  */
  const usable = tiers.filter(t => t.value != null);
  return {
    matched, tiers,
    spread: (light && heavy && light.tier !== heavy.tier)
      ? { light: light.value, heavy: heavy.value, lightTier: light.tier, heavyTier: heavy.tier }
      : null,
    monotone: usable.length < 2 ? null
      : usable.every((t, i) => i === 0 || usable[i - 1].value >= t.value),
    documented: { lightest: 0.449, heaviest: 0.078, seasons: 10 },
    why: matched < minN ? `aðeins ${matched} lið-leikir með úrslitum` : null,
  };
}

/* ---------------------------------------------------------------
   2. RODUNIN -> RAUNSTIG
   Topp-N eftir `score_avail` (thad er rodin sem NOTANDINN ser) borid vid
   topp-N eftir FPL-eigin `ep_next` — hardasta vidmidid, thvi FPL hefur
   gogn sem vid hofum ekki.
   --------------------------------------------------------------- */
export function rankVsPoints({ snapshots, points, n = 15, minN = 10 }) {
  const pick = (rows, key) => rows.filter(r => r[key] != null)
    .slice().sort((a, b) => b[key] - a[key]).slice(0, n);
  const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  let ours = [], fpl = [], all = [], gws = 0;
  for (const snap of snapshots) {
    const got = points.get(snap.gw);
    if (!got || !got.size) continue;
    gws++;
    const scored = (snap.rank || []).map(r => ({ ...r, pts: got.get(r.id) }))
      .filter(r => r.pts != null);
    if (!scored.length) continue;
    ours.push(...pick(scored, "score_avail").map(r => r.pts));
    fpl.push(...pick(scored, "ep_next").map(r => r.pts));
    all.push(...scored.map(r => r.pts));
  }
  const enough = ours.length >= minN;
  return {
    gws, picks: ours.length,
    ours: enough ? +mean(ours).toFixed(3) : null,
    fplXp: enough ? +mean(fpl).toFixed(3) : null,
    average: all.length ? +mean(all).toFixed(3) : null,
    beatsFpl: enough && fpl.length ? mean(ours) > mean(fpl) : null,
    documented: { ours: 5.13, fplXp: 4.48, appMethod: 4.70 },
    why: enough ? null : `aðeins ${ours.length} val, þarf ${minN}`,
  };
}

/* ---------------------------------------------------------------
   3. BYRJUNAR-LIKUR -> BRIER + BEKKJAR-GILDRAN
   Skjolunin er skyr um hvad er ABATINN: nakvaemnin er SU SAMA og hja
   "byrjadi sidast" (88,0%). Thad sem gildir er Brier og hvort laegsti
   tiundarhlutinn fangi thá sem falla a bekk. Thess vegna er nakvaemni EKKI
   maeld her — hun vaeri tala sem litur vel ut og segir ekkert.
   --------------------------------------------------------------- */
export function startProbCalibration({ snapshots, minutes, minN = 100 }) {
  const rows = [];
  for (const snap of snapshots) {
    const got = minutes.get(snap.gw);
    if (!got) continue;
    for (const r of (snap.rank || [])) {
      if (r.start_prob == null) continue;
      const mins = got.get(r.id);
      if (mins == null) continue;
      rows.push({ p: r.start_prob, started60: mins >= 60 ? 1 : 0 });
    }
  }
  if (rows.length < minN)
    return { n: rows.length, brier: null, baseline: null, bottomDecileBenched: null,
             documented: { brier: 0.089, baselineBrier: 0.118, benchCapture: [0.42, 0.49] },
             why: `aðeins ${rows.length} sýni, þarf ${minN}` };
  const brier = rows.reduce((a, r) => a + (r.p - r.started60) ** 2, 0) / rows.length;
  const base = rows.reduce((a, r) => a + r.started60, 0) / rows.length;
  /* Vidmidid er GRUNNTIDNIN — spa sem slaer hana ekki er verri en ad giska
     a medaltalid, og thad verdur ad sjast.                              */
  const baseBrier = rows.reduce((a, r) => a + (base - r.started60) ** 2, 0) / rows.length;
  const sorted = rows.slice().sort((a, b) => a.p - b.p);
  const dec = Math.max(1, Math.floor(sorted.length / 10));
  const bottom = sorted.slice(0, dec);
  const benchedAll = rows.filter(r => !r.started60).length;
  return {
    n: rows.length,
    brier: +brier.toFixed(4),
    baseline: +baseBrier.toFixed(4),
    beatsBaseline: brier < baseBrier,
    bottomDecileBenched: benchedAll
      ? +(bottom.filter(r => !r.started60).length / benchedAll).toFixed(4) : null,
    documented: { brier: 0.089, baselineBrier: 0.118, benchCapture: [0.42, 0.49] },
    why: null,
  };
}

/* ---------------------------------------------------------------
   URSLIT UR LEIKJASKRA — mork a sig per (leikur, lid)
   --------------------------------------------------------------- */
export function resultsFromFixtures(fixtures) {
  const out = [];
  for (const f of (fixtures || [])) {
    /* ADEINS LOKNIR LEIKIR. Leikur i gangi hefur hlutastodu og hun myndi
       telja sem urslit — sama regla og Teams-flipinn fylgir.            */
    if (!f?.finished) continue;
    if (f.team_h_score == null || f.team_a_score == null) continue;
    out.push({ fixture: f.id, team: f.team_h, conceded: f.team_a_score, scored: f.team_h_score });
    out.push({ fixture: f.id, team: f.team_a, conceded: f.team_h_score, scored: f.team_a_score });
  }
  return out;
}
