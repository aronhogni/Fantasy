/* ============================================================
   model.js — HREINT reiknilikan. Ekkert React, engin netkoll.
   Appid OG profin flytja thetta inn — sama koda, sama utkoma.

   FJORAR AKVARDANIR SEM ALLT HVILIR A, OG HVERS VEGNA:

   1. VID BUUM EKKI TIL SPA FRA GRUNNI ÞEGAR MARKADURINN ER TIL.
      Sleeper, ESPN og ~200 serfraedingar spa thegar. Maelingin i
      `accuracy.js` segir okkur AD ENGINN theirra sla hina afgerandi
      og ad **samsteypan er betri en 43% theirra**. Rett vidbrogd vid
      thvi eru ad BLANDA, ekki ad bæta vid 201. skodun og lata hana
      raeda.

   2. VOGIRNAR ERU MAELDAR, EKKI VALDAR. `blendWeights` kemur ur
      `accuracy.json` — bord sem maeldist betur fær meiri vog. Ef
      maelingin vantar er blandan JOFN, og thad er sagt.

   3. VIKULEGA LIKANID BYGGIR A VEDBANKALINUNNI. Vaent stigaskor lids
      = total/2 - spread/2 er sterkasta einstaka inntakid sem til er
      i NFL og thad er OKEYPIS i `schedule.json`. Sama rok og
      markadslidurinn i FPL-appinu: bokmakarinn hefur thegar unnid
      vinnuna.

   4. VBD ER AKVORDUNIN, EKKI STIGIN. 300 stig fra QB og 300 fra RB
      eru EKKI jafnverdmæt thvi 12. besti QB skorar naerri theim 1.
      en 12. besti RB ekki. Allt draft-lagid er thvi reiknad sem
      VIRDI YFIR VARAMANNI, ekki sem hrastig.
   ============================================================ */

/* ============================================================
   1. BLONDUN SPAA
   ============================================================ */

/**
 * Blandar spam ur morgum heimildum i eina tolu.
 * `sources` = [{ key, value, weight }]. Vantandi gildi eru SLEPPT,
 * ekki sett i 0 — heimild sem thegir er ekki heimild sem spair 0.
 * Vogirnar eru endurnormalisadar a thaer sem raunverulega maettu.
 */
export function blend(sources) {
  const live = sources.filter((s) => s.value != null && Number.isFinite(s.value)
                                     && s.weight > 0);
  if (!live.length) return { value: null, used: [], coverage: 0 };
  const wsum = live.reduce((a, s) => a + s.weight, 0);
  const value = live.reduce((a, s) => a + s.value * s.weight, 0) / wsum;
  return {
    value: Math.round(value * 10) / 10,
    used: live.map((s) => s.key),
    coverage: live.length / sources.length,
    /* DREIFING HEIMILDA er birt vid hlidina a blondunni. Hun er
       jafn mikilvaeg og talan: 250 stig thar sem allar heimildir
       segja 250 er ALLT ANNAD mal en 250 thar sem ein segir 180 og
       onnur 320. Sidara tilvikid er thar sem draft vinnast og tapast. */
    spread: live.length > 1
      ? Math.round((Math.max(...live.map((s) => s.value)) -
                    Math.min(...live.map((s) => s.value))) * 10) / 10
      : null,
  };
}

/**
 * Vogir ur maeldri nakvaemni. `accuracy` er `data-nfl/accuracy.json`.
 *
 * REGLAN: vog er fall af thvi hversu langt YFIR NULLDREIFINGUNNI
 * heimildin maeldist, ekki af rodinni. Sa sem er nr. 1 og sa sem er
 * nr. 2 geta verid jafngodir; sa sem er undir nullinu er ekki
 * heimild heldur havadi og fær vog 0.
 *
 * Ef `accuracy` vantar (t.d. adur en maelingin hefur keyrt) skilast
 * JOFN vog og `measured: false`. Appid VERDUR ad birta thann mun —
 * jofn vog sem litur ut eins og maeld vog er versta utkoman.
 */
export function blendWeights(accuracy, { topN = 20 } = {}) {
  if (!accuracy || !accuracy.experts || !accuracy.nullDist) {
    return { measured: false, weights: {}, note: "engin maeling til — jofn vog" };
  }
  const { mean, sd } = accuracy.nullDist;
  const weights = {};
  for (const e of accuracy.experts) {
    if (!e.draft || e.kind === "benchmark") continue;
    const z = sd ? (e.draft.mean - mean) / sd : 0;
    weights[e.id] = z > 0 ? Math.round(z * 100) / 100 : 0;
  }
  const ranked = Object.entries(weights)
    .filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1]).slice(0, topN);
  return {
    measured: true,
    weights: Object.fromEntries(ranked),
    nullMean: mean, nullSd: sd,
    note: `${ranked.length} bord yfir nulldreifingu af ${accuracy.experts.length}`,
  };
}

/* ============================================================
   2. VIRDI YFIR VARAMANNI (VBD / VOR)
   ============================================================ */

/**
 * Varamanns-threp per stodu fyrir gefid deildarsnid.
 * Thetta er ekki fasti heldur FALL AF DEILDINNI: i 10-lida deild med
 * 2 RB i byrjunarlidi er varamadurinn RB20; i 14-lida med FLEX er hann
 * RB40. Ad nota fastan lista vaeri ad reikna ranga deild.
 *
 * FLEX-saetum er DREIFT a stodurnar i hlutfalli vid hve oft hver
 * stada endar i flex I RAUN. Maelt i `calibrate.mjs` a ollum vikum
 * 2020-2025: hverjir lenda utan fastra saeta (RB25+, WR37+, TE13+ i
 * 12-lida deild) en komast samt i topp-12 flex theirrar viku.
 *
 * MAELT:  RB 0,330 · WR 0,477 · TE 0,193
 * AGISKAD (fyrsta utgafa): RB 0,35 · WR 0,55 · TE 0,10
 *
 * TE-VILLAN VAR STOR og hun skekkti VBD beint: med 0,10 var
 * varamanns-threpid fyrir TE reiknad of hatt (TE13 i stad TE14+) og
 * allir tight endar fengu of lagt VBD. Thett-endar komast i flex
 * TVOFALT oftar en agiskad var.
 */
export const FLEX_SPLIT = { RB: 0.330, WR: 0.477, TE: 0.193 };

export function replacementRanks(league) {
  const t = league.teams || 12;
  const st = league.starters || { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 };
  const flex = (st.FLEX || 0) * t;
  const out = {};
  for (const pos of ["QB", "RB", "WR", "TE", "K", "DST"]) {
    const base = (st[pos] || 0) * t;
    const extra = FLEX_SPLIT[pos] ? Math.round(flex * FLEX_SPLIT[pos]) : 0;
    out[pos] = base + extra;
  }
  return out;
}

/**
 * VBD fyrir hvern leikmann: spa - spa varamanns a sinni stodu.
 * `players` tharf { pos, proj }. Skilar nyju fylki med `vbd` og
 * `posRank`. Leikmenn an spar fa `vbd: null` — EKKI 0. Null er
 * "vitum ekki", 0 er "nakvaemlega a varamannsgildi".
 */
export function computeVbd(players, league) {
  const repl = replacementRanks(league);
  const byPos = {};
  for (const p of players) {
    if (p.proj == null) continue;
    (byPos[p.pos] = byPos[p.pos] || []).push(p);
  }
  const baseline = {};
  for (const [pos, list] of Object.entries(byPos)) {
    list.sort((a, b) => b.proj - a.proj);
    list.forEach((p, i) => { p.posRank = i + 1; });
    const r = repl[pos] || list.length;
    /* Varamanns-gildid er MEDALTAL threggja i kringum threpid, ekki
       ein tala. Ein tala gerir allt VBD haad einum leikmanni sem gaeti
       verid meiddur eda utlagi. */
    const around = list.slice(Math.max(0, r - 2), r + 1).map((p) => p.proj);
    baseline[pos] = around.length
      ? around.reduce((a, b) => a + b, 0) / around.length
      : (list.length ? list[list.length - 1].proj : 0);
  }
  return players.map((p) => ({
    ...p,
    vbd: p.proj != null && baseline[p.pos] != null
      ? Math.round((p.proj - baseline[p.pos]) * 10) / 10 : null,
    replacement: baseline[p.pos] != null
      ? Math.round(baseline[p.pos] * 10) / 10 : null,
  }));
}

/* ============================================================
   3. THREP (TIERS)
   ============================================================ */

/**
 * Threpaskipting eftir BILUM i spanni, ekki eftir fostum fjolda.
 *
 * HVERS VEGNA BIL EN EKKI "12 I HVERJU THREPI": threpin eru til ad
 * svara EINNI spurningu — "ef ég bíð fram að næsta vali, fæ ég
 * sambaerilegan mann?" Fastur fjoldi svarar henni ekki; hann skiptir
 * jafnri brekku i tilviljanakennd threp og bytur upp raunveruleg
 * stokk thar sem thau eru.
 *
 * `gapSd` er hversu stort bil telst threpaskil, maelt i stadalfravikum
 * bilanna sjalfra. 1,0 er sjalfgefid og er MAELT — sja
 * `tests/nfl-tiers.mjs` sem krefst thess ad threpin sem koma ut seu
 * hvorki eitt threp med ollum ne threp per mann.
 */
export function tierize(values, { gapSd = 1.0, minTier = 2, maxTiers = 14 } = {}) {
  const xs = values.filter((v) => v != null).slice().sort((a, b) => b - a);
  /* Snemmbuna utgangan verdur ad skila EINU GILDI PER INNTAKI og
     halda null-um. Fyrsta utgafan skiladi `xs.map(...)` — fylki af
     lengd SIADA mengisins — svo threpin foru ur takti vid rodirnar
     um leid og einn leikmadur var an spar. Sá afleikur birtist ekki
     sem villa heldur sem RANGT THREP a rongum manni. */
  if (xs.length < 4) return values.map((v) => (v == null ? null : 1));
  const gaps = [];
  for (let i = 1; i < xs.length; i++) gaps.push(xs[i - 1] - xs[i]);
  const m = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - m) ** 2, 0) / gaps.length);
  const cut = m + gapSd * sd;

  const tiers = new Map();
  let t = 1, sinceBreak = 0;
  tiers.set(xs[0], 1);
  for (let i = 1; i < xs.length; i++) {
    sinceBreak++;
    if (gaps[i - 1] >= cut && sinceBreak >= minTier && t < maxTiers) {
      t++; sinceBreak = 0;
    }
    tiers.set(xs[i], t);
  }
  return values.map((v) => (v == null ? null : tiers.get(v) ?? t));
}

/* ============================================================
   4. VIRDI GEGN MARKADI
   ============================================================ */

/**
 * Hvad er leikmadurinn thess virdi MIDAD VID thad sem hann kostar?
 * `adp` er thar sem markadurinn tekur hann, `rank` er okkar rod.
 * Jakvaett = hann fellur lengra en hann aetti ad gera (kaup).
 *
 * TALAN ER I UMFERDUM, EKKI SAETUM. "18 saetum ódyrari" segir ekkert
 * an deildarstaerdar; "einni og halfri umferd" er thad sem notandinn
 * getur raunverulega notad thegar hann situr og vebur.
 */
export function valueVsMarket(rank, adp, teams = 12) {
  if (rank == null || adp == null) return null;
  return Math.round(((adp - rank) / teams) * 100) / 100;
}

/* ============================================================
   5. VIKULEGA LIKANID
   ============================================================ */

/**
 * Vaent stigaskor lids ur vedbankalinunni.
 * `spread` er UR SJONARHORNI HEIMALIDS og jakvaett = heimalid favorit
 * (nflverse-konvensjon — sja notu i `sources/nflverse.mjs`).
 *
 *   heimalid = total/2 + spread/2
 *   utilid   = total/2 - spread/2
 */
export function impliedTeamTotals(total, spread) {
  if (total == null || spread == null) return { home: null, away: null };
  return {
    home: Math.round((total / 2 + spread / 2) * 10) / 10,
    away: Math.round((total / 2 - spread / 2) * 10) / 10,
  };
}

/**
 * Margfaldari a spa vikunnar ut fra vaentu stigaskori lidsins.
 * Grunnlina er MEDAL-STIGASKOR i NFL (~22,5). Lid sem er vaent til
 * ad skora 30 gefur meiri fantasy-framleidslu en lid sem er vaent
 * til ad skora 15 — en EKKI i rettu hlutfalli, thvi hluti
 * framleidslunnar (magn) er ohaður arangri.
 *
 * Teygnin er MAELD i `scripts/nfl/calibrate.mjs` a **25.160
 * leikmanna-vikum 2020-2025** med leave-one-out grunnlinu, fittud
 * gegnum nullpunkt: log(stig/grunnlina) = e * log(vaent/22,5).
 *
 * MAELDAR TOLUR — OG THAER ERU MIKLU LAEGRI EN INNSAEID SEGIR:
 *
 *   stada   e      se     t      n
 *   QB    0,229  0,079   2,9   2.814
 *   RB    0,356  0,069   5,2   6.134
 *   WR    0,069  0,048   1,4   9.165   <- EKKI MARKTAEK
 *   TE    0,211  0,068   3,1   4.231
 *
 * FYRSTA UTGAFA THESSARAR SKRAR HAFDI 0,55 A ALLA OG 0,70 A RB.
 * Thad var AGISKUN sem leit ut eins og maeling. Raunverulega talan
 * er um thridjungur af thvi.
 *
 * WR-LIDURINN ER NULL OG THAD ER NIDURSTADAN, EKKI VANDAMAL.
 * Sendingamottakarar hagnast ekki maelanlega a thvi ad lidid se
 * vaent til ad skora mikid — thvi lid sem er UNDIR sendir meira og
 * baetir thad upp. Ad gefa WR sama margfaldara og RB (eins og fyrsta
 * utgafan gerdi) vaeri ad flytja vorn a alla, sem var staersta
 * einstaka villan i hlidstaeda FPL-verkefninu.
 *
 * VARNAGLI SEM MA EKKI FALLA UT: LOSO a RB gefur 0,278-0,467
 * (bil 0,189) — liðurinn er **ostodugur milli ara**. Hann er thvi
 * hafdur INNI en SMAR, og vidmotid syar hann sem "gameScript" i
 * sundurlidun svo notandinn sjai hve litlu hann raedur.
 *
 * SKEKKJA SEM ER VITUD: vikur med 0 stig eru sleppt (log tekur ekki
 * 0) og thaer eru oftar i leikjum med lagt vaent skor. Maelingin
 * VANMETUR thvi teygnina. Talan er varfaerin, sem er retta attin.
 */
export const IMPLIED_BASE = 22.5;
export const ELASTICITY = 0.22;          // sameiginlegt bakfall

export function gameScriptMult(impliedPoints, pos) {
  if (impliedPoints == null) return 1;
  const ratio = impliedPoints / IMPLIED_BASE;
  const e = POS_ELASTICITY[pos] ?? ELASTICITY;
  return clamp(Math.pow(ratio, e), 0.65, 1.45);
}

/**
 * Teygni per stodu — MAELDAR TOLUR (sja toflu ad ofan).
 * K og DST voru EKKI MAELD (thau eru ekki i vikulega fylkinu okkar)
 * og fa thvi sameiginlega bakfallid, ekki eigin tolu. Ad gefa theim
 * serstaka tolu vaeri omaeld tala i reit — CLAUDE.md kafli 8.
 */
export const POS_ELASTICITY = {
  QB: 0.229, RB: 0.356, WR: 0.069, TE: 0.211,
  K: ELASTICITY, DST: ELASTICITY,
};

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * Motstodu-margfaldari ur "vorn gegn stodu" (`defense.json`).
 *
 * VOGIN ER MAELD UTAN URTAKS: vornin er reiknud ur vikum < w og
 * profud a viku w, yfir 2020-2025. Ferillinn:
 *
 *   w      RMSE
 *   0,00  0,77300     <- an lidarins
 *   0,10  0,77200
 *   0,20  0,77200     <- best
 *   0,30  0,77200
 *   0,50  0,77400
 *   1,00  0,78500     <- hraur lidur er VERRI en enginn lidur
 *
 * TVAER NIDURSTODUR OG BADAR SKIPTA MALI:
 *   (a) HRAR "vorn gegn stodu" (w=1) GERIR SPANA VERRI en ad sleppa
 *       henni. Thad er alveg ondvert vid thad sem tolfraedin i
 *       fantasy-umraedu gefur i skyn.
 *   (b) Besta vogin baetir RMSE um **0,13%**. Thad er raunverulegt
 *       en ORSMATT.
 *
 * LIDURINN ER HAFDUR INNI A 0,20 EN VIDMOTID MA ALDREI SELJA HANN
 * SEM MEIRA EN HANN ER. "Erfid vidureign" a ekki ad breyta rod
 * leikmanna nema thegar allt annad er jafnt — og med thessari vog
 * gerir hun thad ekki heldur. Thad er RETT.
 */
export const DEF_WEIGHT = 0.20;

export function defenseMult(adj, leagueMean) {
  if (adj == null || !leagueMean) return 1;
  const raw = adj / leagueMean;
  return clamp(1 + (raw - 1) * DEF_WEIGHT, 0.80, 1.25);
}

/**
 * Full vikuleg spa fyrir einn leikmann.
 *
 * `base`    stig per leik ur timabils-spanni (blandan deilt med leikjum)
 * `implied` vaent stigaskor HANS lids i thessari viku
 * `def`     { adj, leagueMean } vorn andstaedingsins gegn hans stodu
 * `avail`   0..1 tiltaekileiki (meidsli/hvild)
 *
 * AUD VIKA (`bye`) SKILAR 0, EKKI NULL. Thar er munur: null er
 * "vitum ekki", 0 er "hann spilar ekki og thu faerd 0 stig". Sama
 * regla og aud umferd i FPL-appinu.
 */
export function weeklyProjection({ base, pos, implied, def, avail = 1, bye = false }) {
  if (bye) return { pts: 0, bye: true, parts: null };
  if (base == null) return { pts: null, bye: false, parts: null };
  const gs = gameScriptMult(implied, pos);
  const dm = defenseMult(def ? def.adj : null, def ? def.leagueMean : null);
  const pts = base * gs * dm * clamp(avail, 0, 1);
  return {
    pts: Math.round(pts * 10) / 10,
    bye: false,
    /* Thaettirnir eru SKILADIR svo vidmotid geti sagt HVERS VEGNA
       talan er thad sem hun er. Spa an skyringar er ekki nothaef
       til akvardana — thu getur ekki verid osammala henni. */
    parts: { base: Math.round(base * 10) / 10, gameScript: round3(gs),
             defense: round3(dm), avail: round3(avail) },
  };
}

const round3 = (x) => Math.round(x * 1000) / 1000;

/* ============================================================
   6. TILTAEKILEIKI
   ============================================================ */

/**
 * Meidslastada -> tiltaekileiki 0..1.
 * TOLURNAR ERU KVORDUN, EKKI VEFRETT. Their eru grofar og eiga ad
 * vera thad: "Questionable" i NFL er notad um allt fra "spilar
 * orugglega" til "spilar ekki", og engin heimild sem vid hofum
 * greinir thar a milli fyrir GW1. Ad gefa 0,73 i stad 0,75 vaeri
 * fals-nakvaemni.
 *
 * FPL-REGLAN GILDIR HER LIKA: opinber stada raedur. BSD-jafngildid i
 * hinu verkefninu skeikadi i ranga att og var hafnad; hér er thad
 * FPL-stadan sem er `status`/`injury` fra Sleeper, og adrar heimildir
 * mega AUDGA hana en aldrei skipta henni ut.
 */
export const AVAIL = {
  Out: 0, IR: 0, PUP: 0, Suspended: 0, NA: 0, "Injured Reserve": 0,
  Doubtful: 0.25,
  Questionable: 0.75,
  Probable: 0.95,
  Active: 1, null: 1, undefined: 1,
};

export function availability(status, injury) {
  if (injury && AVAIL[injury] != null) return AVAIL[injury];
  if (status && AVAIL[status] != null) return AVAIL[status];
  return 1;
}
