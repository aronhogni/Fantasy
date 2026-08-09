/* ============================================================
   build.js — byggir rodirnar sem vidmotid birtir. HREIN.

   HVERS VEGNA THETTA ER UTAN REACT: nakvaemlega somu rodir eru
   notadar af (a) toflunni, (b) draft-bordinu, (c) profunum. Vaeri
   thetta inni i .jsx-skra gaetu profin ekki keyrt thad an DOM og
   thau myndu tha profa AFRIT af formulunni. Sama regla og
   `makeEnricher` i FPL-appinu, thar sem kostnaðurinn vid ad hafa
   hana inni i `cook` var 20 varanlega tomir kassar.
   ============================================================ */

import { computeVbd, tierize, valueVsMarket, blend, availability } from "./model.js";

/**
 * Deildarsnid. Sjalfgefid er algengasta uppsetningin.
 * `scoring` raedur HVADA ADP og HVADA spa er lesin — ekki bara
 * hvernig stig eru talin. Ad velja Half PPR en syna PPR-ADP vaeri
 * ad bera saman tvo olika heima.
 */
export const DEFAULT_LEAGUE = {
  teams: 12,
  scoring: "ppr",                 // ppr | half-ppr | standard
  starters: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, K: 1, DST: 1 },
  superflex: false,
};

/**
 * Byggir leikmannarodirnar.
 *
 * `players`  data-nfl/players.json
 * `seasons`  data-nfl/seasons.json (valfrjalst — 2025-dalkar)
 * `accuracy` data-nfl/accuracy.json (valfrjalst — skorpu bordin)
 * `experts`  data-nfl/experts.json (valfrjalst — skorpu bordin)
 * `schedule` data-nfl/schedule.json (valfrjalst — SoS)
 */
export function buildRows({ players, seasons, accuracy, experts, schedule,
                            league = DEFAULT_LEAGUE, weights = null }) {
  if (!players || !players.length) return { rows: [], meta: { reason: "engin gogn" } };

  const lastBy = indexSeason(seasons, 2025);
  const sharp = buildSharpBoard(accuracy, experts);
  const sos = buildSos(schedule, league);

  const scoringKey = league.scoring === "half-ppr" ? "half"
                   : league.scoring === "standard" ? "std" : "ppr";

  const rows = players.map((p) => {
    /* --- markadurinn i RETTU sniði --- */
    const ffcKey = `${league.scoring}_${league.teams}`;
    const ffc = p.adpFfc && p.adpFfc[ffcKey] ? p.adpFfc[ffcKey] : null;
    const adpSleeper = scoringKey === "half" ? p.adpSleeperHalf
                     : scoringKey === "std" ? p.adpSleeperStd
                     : p.adpSleeper;
    /* ADP er tekid ur FFC thegar thad er til (raunveruleg droft i
       rettri staerd), annars Sleeper, annars ESPN. Rodin er ekki
       handahof: FFC ber urtaksstaerd, Sleeper er retti vettvangurinn,
       ESPN er staerst en i odru sniði. */
    const adp = ffc ? ffc.adp : (adpSleeper ?? p.adpEspn ?? null);

    /* --- spain: blanda, vogud eftir maeldri nakvaemni --- */
    const projSleeper = scoringKey === "half" ? p.projSleeperHalf
                      : scoringKey === "std" ? p.projSleeperStd
                      : p.projSleeper;
    const b = blend([
      { key: "sleeper", value: projSleeper, weight: (weights && weights.sleeper) ?? 1 },
      /* ESPN-spain er i THEIRRA stigagjof og er thvi adeins notud i
         PPR-sniði. Ad umreikna hana an hra-fylkja vaeri agiskun sem
         liti ut eins og maeling. */
      { key: "espn", value: scoringKey === "ppr" ? p.projEspn : null,
        weight: (weights && weights.espn) ?? 0.8 },
    ]);

    const last = lastBy.get(p.gsisId) || null;
    const sh = sharp.ranks.get(p.fpId) ?? null;
    const s = sos.get(p.team) || null;

    return {
      id: p.id, gsisId: p.gsisId, fpId: p.fpId, espnId: p.espnId,
      name: p.name, pos: p.pos, team: p.team, bye: p.bye,
      age: p.age, exp: p.exp, headshot: p.headshot,
      rookie: p.rookie, depth: p.depth,
      injury: p.injury || p.status || null,
      injuryNote: p.injuryNote,
      avail: availability(p.status, p.injury),

      proj: b.value,
      projSpread: b.spread,
      projSources: b.used,

      adp, adpSleeper, adpEspn: p.adpEspn,
      auctionEspn: p.auctionEspn, ownedEspn: p.ownedEspn,
      trendAdd: p.trendAdd, trendDrop: p.trendDrop,
      adpSd: ffc ? ffc.sd : null,
      adpHigh: ffc ? ffc.high : null, adpLow: ffc ? ffc.low : null,
      adpTimes: ffc ? ffc.times : null,

      ecr: p.ecr, ecrTier: p.ecrTier, ecrSd: p.ecrSd,
      ecrBest: p.ecrBest, ecrWorst: p.ecrWorst, ecrPosRank: p.ecrPosRank,
      sharpRank: sh,
      /* Jakvaett = skorpu bordin eru HAERRI a honum (laegri tala) en
         samsteypan. Ad snua thessu vid er audvelt og banvaent, thvi
         merkid les ofugt an thess ad nokkud brotni. */
      sharpDelta: sh != null && p.ecr != null
        ? Math.round((p.ecr - sh) * 10) / 10 : null,

      lastPpg: last ? last.ppg : null,
      lastPts: last ? last.ppr : null,
      lastGames: last ? last.g : null,
      lastBoom: last ? last.boom : null,
      lastBust: last ? last.bust : null,
      lastTgt: last ? last.tgt : null,
      lastTshare: last ? last.tshare : null,
      lastWopr: last ? last.wopr : null,
      lastTeam: last ? last.team : null,

      sos: s ? s.all : null,
      playoffSos: s ? s.playoff : null,
    };
  });

  /* --- VBD og threp, reiknad A SIADA MENGINU ---
     VBD er skilgreint gagnvart varamanni Í ÞINNI DEILD, svo thad
     verdur ad reiknast eftir ad deildarsnid er thekkt. Ad reikna
     thad i pipeline-inu vaeri ad negla eina deildarstaerd. */
  const withVbd = computeVbd(rows, league);
  const tiers = tierize(withVbd.map((r) => r.vbd));
  withVbd.forEach((r, i) => { r.tier = tiers[i]; });

  /* THREP INNAN STODU — ONNUR SPURNING, ONNUR TALA.
     `tier` er thvert a stodur og er rett a draft-bordinu, thvi thar
     er valid thvert a stodur. En SKORTSTADAN spyr annars: "hve
     margir RB1 eru eftir?" Med thversto0u-threpum byrjadi QB-listinn
     i "threpi 7" og TE i "threpi 6", sem svarar engri spurningu sem
     nokkur draftari spyr.
     Threpad er per stodu ur VBD innan theirrar stodu. */
  for (const pos of ["QB", "RB", "WR", "TE", "K", "DST"]) {
    const inPos = withVbd.filter((r) => r.pos === pos);
    if (inPos.length < 4) { for (const r of inPos) r.posTier = null; continue; }
    const t = tierize(inPos.map((r) => r.vbd), { maxTiers: 10 });
    inPos.forEach((r, i) => { r.posTier = t[i]; });
  }

  /* Okkar heildarrod = VBD nidur a vid. Hun er GRUNNURINN ad
     `value`, sem er thad sem draft-bordid raunverulega notar. */
  const ranked = withVbd.slice()
    .filter((r) => r.vbd != null)
    .sort((a, b) => b.vbd - a.vbd);
  const ourRank = new Map(ranked.map((r, i) => [r.id, i + 1]));
  for (const r of withVbd) {
    r.rank = ourRank.get(r.id) ?? null;
    r.value = valueVsMarket(r.rank, r.adp, league.teams);
  }

  return {
    rows: withVbd,
    meta: {
      league,
      sharpMeasured: sharp.measured,
      sharpBoards: sharp.count,
      withProj: withVbd.filter((r) => r.proj != null).length,
      withAdp: withVbd.filter((r) => r.adp != null).length,
      withEcr: withVbd.filter((r) => r.ecr != null).length,
      withLast: withVbd.filter((r) => r.lastPpg != null).length,
    },
  };
}

/* ---------- hjalparfoll ---------- */

function indexSeason(seasons, year) {
  const m = new Map();
  if (!seasons) return m;
  for (const s of seasons) if (s.season === year) m.set(s.id, s);
  return m;
}

/**
 * SKORPU BORDIN: samsteypa ADEINS theirra sem maeldust yfir
 * nulldreifingunni 2025.
 *
 * HVERS VEGNA EKKI "TOPP 10": ad taka fasta tolu efstu gefur alltaf
 * tiu nofn, lika thegar enginn er betri en handahof. Threskuldurinn
 * er thvi NULLDREIFINGIN sjalf — sa sem er undir henni er ekki
 * heimild. Ef enginn kemst yfir hana er engin skorpu-rod til og
 * `measured: false` er skilad, sem vidmotid VERDUR ad birta.
 */
export function buildSharpBoard(accuracy, experts) {
  const empty = { ranks: new Map(), measured: false, count: 0, ids: [] };
  if (!accuracy || !accuracy.nullDist || !experts || !experts.boards) return empty;

  const { mean, p95 } = accuracy.nullDist;
  const cut = p95 ?? mean;
  const good = accuracy.experts
    .filter((e) => e.kind !== "benchmark" && e.draft && e.draft.mean > cut)
    .map((e) => e.id);
  if (!good.length) return empty;

  const goodSet = new Set(good);
  const sum = new Map(), cnt = new Map();
  for (const b of experts.boards) {
    if (!goodSet.has(b.id)) continue;
    for (const [fp, rank] of Object.entries(b.ranks)) {
      sum.set(fp, (sum.get(fp) || 0) + rank);
      cnt.set(fp, (cnt.get(fp) || 0) + 1);
    }
  }
  const used = [...new Set([...cnt.keys()])];
  if (!used.length) return empty;

  /* Adeins leikmenn sem MEIRIHLUTI skorpu bordanna nefnir. Annars
     raedur eitt bord rod leikmanns sem hin slepptu — og tha er
     "skorpu samsteypan" bara sa eini serfraedingur. */
  const nBoards = experts.boards.filter((b) => goodSet.has(b.id)).length;
  const minCnt = Math.max(2, Math.ceil(nBoards * 0.5));
  const pairs = used
    .filter((fp) => cnt.get(fp) >= minCnt)
    .map((fp) => [fp, sum.get(fp) / cnt.get(fp)])
    .sort((a, b) => a[1] - b[1]);

  return {
    ranks: new Map(pairs.map(([fp], i) => [fp, i + 1])),
    measured: true,
    count: nBoards,
    ids: good,
  };
}

/**
 * Motstodu-styrkur: medal vaent stigaskor ANDSTAEDINGANNA.
 *
 * VARNAGLI SEM VERDUR AD FYLGJA TOLUNNI ALLA LEID I VIDMOTID:
 * maelingin i `calibrate.mjs` syndi ad "vorn gegn stodu" baetir
 * ferskekkju um **0,13%**. SoS er thvi jafntefla-brjotur, ekki
 * rodunar-thattur. Dalkurinn er hafdur INNI thvi notendur spyrja um
 * hann, en notan segir hvad hann er.
 *
 * I FORLEIK ERU FLESTIR LEIKIR AN LINU (337 af 557 hofdu linu 9.8.).
 * Lid an lina fær `null`, EKKI medaltalid — "vitum ekki" er ekki
 * "medal-erfitt".
 */
export function buildSos(schedule, league) {
  const out = new Map();
  if (!schedule) return out;
  const season = Math.max(...schedule.map((g) => g.season));
  const games = schedule.filter((g) => g.season === season && g.type === "REG");

  const byTeam = new Map();
  for (const g of games) {
    if (g.total == null || g.spread == null) continue;
    const home = g.total / 2 + g.spread / 2;
    const away = g.total / 2 - g.spread / 2;
    push(byTeam, g.home, { week: g.week, oppImplied: away });
    push(byTeam, g.away, { week: g.week, oppImplied: home });
  }
  for (const [team, list] of byTeam) {
    const all = list.map((x) => x.oppImplied);
    const po = list.filter((x) => x.week >= 15 && x.week <= 17).map((x) => x.oppImplied);
    out.set(team, {
      all: all.length ? round2(avg(all)) : null,
      playoff: po.length ? round2(avg(po)) : null,
      games: all.length,
    });
  }
  return out;
}

function push(m, k, v) { if (!k) return; (m.get(k) || m.set(k, []).get(k)).push(v); }
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round2 = (x) => Math.round(x * 100) / 100;
