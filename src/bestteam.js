/* ============================================================
   BESTTEAM.JS — "PICK BEST TEAM": BESTA LEYFILEGA XI FYRIR EINA UMFERD

   HVAD ThETTA ER: LEITARVELIN. Hun velur EKKERT SKOR sjalf og hun
   reiknar ENGA tolu um leikmann. Skorid er ADFLUTT (dependency
   injection), nakvaemlega eins og `src/captain.js` flytur inn
   `expPointsFor` og `startProbability` i stad thess ad reikna thau.

   ------------------------------------------------------------
   HVERS VEGNA ENGIN NY VOG — OG HVERS VEGNA ThAD ER SVARID
   ------------------------------------------------------------
   Beidnin nefndi FFDR, heima/uti, CS%-markadslinu, xG/xGI og form.
   ThAU ERU ThEGAR INNI I `model.js:expPointsFor`, hvert a sinum stad:

     * FFDR sjalft er UTKOMAN ur ClubElo + xGC + markadslinunni
       (CLAUDE.md kafli 3 — thau eru INNTOK og eru viljandi ekki birt
       sem sjalfstaedir dalkar). Markadslinan er thar med inni, og
       CS%-hlidin lika: `MEASURED`/`MEASURED_POS` bera maeld mork a sig
       og CS% per threp.
     * HEIMA/UTI er `homeCore` inni i `DIFF_W` (0,20 fyrir DEF, 0 fyrir
       GK — MAELT, sja model.js).
     * FORM og xG/xGI eru inni i grunninum: `ep_next` (FPL-eigin spa,
       sem er thegar bunin ad verdleggja formid og frettirnar) og
       `points_per_game` til vara.
     * TILTAEKILEIKI er `availForKickoff` PER LEIK inni i somu lykkju.

   Ad leggja vegid samsull ofan a thetta vaeri OMAELD SAMSETNING —
   nakvaemlega thad sem CLAUDE.md kafli 4 er kirkjugardur yfir
   (mo x byrjunar-likur, xGChain, DefCon i rodun, domara-spjold,
   ferdalengd). Markmidid er thess vegna EITT: hamarka summu thess
   skors sem kallandinn gefur, sem i appinu er `expPointsFor`.

   ------------------------------------------------------------
   GRADUGA ROdUNIN ER SANNANLEGA BEST HER (og thess vegna er hun notud)
   ------------------------------------------------------------
   `stats.js:bestXi` sagdi "lagmorkin fyrst, svo fyllt gradugt" og bar
   engan rokstudning. Hann er thessi:

   Innan stodu er valid alltaf N STIGAHAESTU — hvad sem N verdur — svo
   akvordunin er BARA fjoldinn per stodu (nGK,nDEF,nMID,nFWD) med
   sum = 11 og bundin af MIN/MAX. Markmidid er thvi
       f(n) = SUM_pos topSum_pos(n_pos)
   sem er SUNDURGREINANLEGT og HVOLFT (concave) i hverri breytu:
   jaedarvinningurinn af (n+1)-ta manni i stodu er skor manns nr. n+1 i
   RADADRI rod, sem er alltaf <= skor manns nr. n. Fyrir sundurgreint
   hvolft markmid undir sum-skilyrdi og kassa-bondum er GRADUGT VAL A
   STAERSTA JAEDARVINNING ut fra MIN-punktinum ohagganlega besta
   losnin (klassisk skiptirok: hvert par sem vikur fra graduga valinu
   ma umbreyta i thad an ad minnka summuna).

   Thess vegna er velin GRADUG og ekki taemandi leit, og thad er EKKI
   flysjuskapur: taemandi leit yfir C(15,11)=1.365 er ovirk fyrir
   `bestXi`, sem keyrir a ~600 rodum (lid vikunnar). EIN utfaersla verdur
   ad thola BADA kallendur. `tests/best-team.mjs` kafli 1 SANNAR
   jafngildid med thvi ad telja UPP ALLAR leyfilegar XI a slembnum
   15-manna hopum og krefjast thess ad velin nai NAKVAEMLEGA hamarkinu.

   ------------------------------------------------------------
   NULL-REGLAN HER ER ONNUR EN I `captain.js`, OG ThAD ER ASETT
   ------------------------------------------------------------
   `rankCaptains` HENDIR theim sem faa skor 0 — fyrirlidi er VAL og
   `null` fyrirlidi er rett svar ur tomri laug. Byrjunarlid er hins
   vegar SKYLDA: FPL krefst 11 manna, svo skor 0 (aud umferd, meiddur,
   engin `ep_next`) MA ALDREI utiloka mann — hann sekkur bara nidur og
   endar a bekknum se nokkur annar til. Vantandi skor (`null`, NaN) er
   thvi lesid sem 0 I ROdUNINNI en BER MERKI (`scoreKnown:false`), thvi
   "0 vaent stig" og "engin gogn" eru tvennt (CLAUDE.md kafli 8).
   ============================================================ */

export const POS_ORDER = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
/* FPL-formasjonin. Somu tolur og `stats.js:bestXi` bar innbyggdar og
   somu tolur og `App.jsx:swapStarterBench` sannreynir vid smellu-skipti. */
export const XI_MIN = { GK: 1, DEF: 3, MID: 2, FWD: 1 };
export const XI_MAX = { GK: 1, DEF: 5, MID: 5, FWD: 3 };
export const XI_SIZE = 11;

const POS_KEYS = ["GK", "DEF", "MID", "FWD"];
/* `element_type` 1-4 <-> stodu-strengur. Vorpunin er handskrifud i SEX
   vidmots-skram (`const POS = {1:"GK",...}` i PlayerList, Compare,
   BuyWindows, BestOfBest, Rotation, SetPieces) og thess vegna tekur
   thessi vel VID BADUM — kallandi tharf ekki sjounda afritid.          */
const POS_BY_TYPE = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };
export function posKey(v) {
  if (typeof v === "number") return POS_BY_TYPE[v] ?? null;
  if (typeof v !== "string") return null;
  const t = v.trim().toUpperCase();
  if (POS_ORDER[t]) return t;
  const n = Number(t);
  return Number.isInteger(n) ? (POS_BY_TYPE[n] ?? null) : null;
}
/* Sjalfgefna stodu-uppflettingin. Saetin ur `App.jsx:squadForGw` bera
   ADEINS `{id, starter, order}` — stadan er i `byId[id].element_type` —
   svo kallandinn ma senda sina eigin (`posOf`) og velin byr engan
   afritadan leikmannalista til.                                        */
const defaultPosOf = r => posKey(r?.pos ?? r?.element_type);

const rowsOf = v => (Array.isArray(v) ? v.filter(x => x != null && typeof x === "object") : []);
/* ============================================================
   STRONG `num` — TEKUR EKKI VID TOLU-STRENGJUM, OG ThAD ER ASETT
   (skjalad 25.8.2026)

   KODARYNI-2026-08-24 lagdi til ad sameina thessa utgafu vid
   `stats.js:num`, sem gerir `parseFloat` og TEKUR vid tolu-strengjum
   ("3.0" -> 3). Su sameining var MAELD OG HAFNAD — hun myndi setja
   RUSL i tolu-svid:

     parseFloat("2026-08-25T05:28:14.061Z")  ->  2026
     parseFloat("2025-26")                   ->  2025

   MAELT a theim skram sem ThESSI skra les (`team_form.json`,
   `luck.json`, `fixtures.json`): 889 raunveruleg tolu-svid og 53
   strengir — og hver einasti strengur er DAGSETNING eda TIMABILS-MERKI
   (`updated`, `season`, `kickoff_time`). ENGINN theirra er tala i
   dulargervi. Strangi vordurinn hafnar theim rett; lausa utgafan
   myndi breyta theim i 2026 og 2025.

   `stats.js:num` er LAUS af jafn-godri astaedu: hun les FPL-svid, og
   FPL sendir tolur SEM STRENGI (`ep_next: "4.0"`, `points_per_game`,
   `selected_by_percent`, `form`, `expected_goals` — maelt: 6.710 slik
   svid i `players.json`). Vaeri hun strong yrdi hvert theirra `null`.

   ThAER ERU ThVI EKKI TVITEKNING SEM REK I SUNDUR HELDUR TVO RETT SVOR
   VID TVEIMUR OLIKUM INNTOKUM. Ekki sameina thaer an thess ad maela
   inntokin fyrst — og se thad gert VERDUR ein theirra rong.
   ============================================================ */
const num = v => (typeof v === "number" && Number.isFinite(v) ? v : null);

/* Leyfileg uppstilling? Sama profid og appid gerir vid handvirkt skipti.
   Utflutt svo thad se EIN utfaersla af reglunni og ekki thrjar.         */
export function legalFormation(count, { min = XI_MIN, max = XI_MAX, size = XI_SIZE } = {}) {
  let total = 0;
  for (const pos of POS_KEYS) {
    const n = count?.[pos] ?? 0;
    if (n < (min[pos] ?? 0) || n > (max[pos] ?? Infinity)) return false;
    total += n;
  }
  return total === size;
}

/* ------------------------------------------------------------------
   KJARNINN. `rows` er hvad sem er med stodu; `score` er fallid sem
   kallandinn gefur (i appinu: `expPointsFor` fyrir thessa umferd).

   `tiebreak` er SER BREYTA og ekki hluti af skorinu. Jafntefli VERDUR
   ad leysast eins i hvert einasta kall, annars gefur takkinn sitt hvort
   lidid i tveimur smellum an ad nokkur tala breytist — sama rokstudning
   og `rankCaptains` gefur fyrir nafna-jafnteflid.
   SJALFGEFID er RODIN I INNTAKINU (stodug rodun), svo `stats.js` geti
   framselt hingad an thess ad lid vikunnar breytist.

   ============================================================
   ATH: FRAMSALID ER EKKI KOMID — ThETTA ER SKILGREINING, EKKI LYSING
   A ASTANDINU (skyrt 25.8.2026)
   ============================================================
   Textinn hér ad nedan var skrifadur i nutid ("framsalid verdur ad
   bera...") og las thvi eins og `stats.js:bestXi` KALLI ThEGAR hingad.
   ThAD GERIR HUN EKKI: `bestXi` (stats.js:~1518) er enn sin eigin
   utfaersla og eini lesandi hennar er `GwReport.jsx:50` ("Team of the
   week"). `pickXi` her er kolluð adeins innan thessarar skraar.

   Hausinn lysir thvi FYRIRHUGADRI endastodu, ekki theirri sem er. Ad
   lata thad standa i nutid er sama tegund af rangri skjolun og
   athugasemdirnar sem voru fjarlaegdar ur `netlify/functions/odds.js`
   i dag: lysing a kóda sem er ekki tharna sendir naesta mann i ad leita
   ad utfaerslu sem hann finnur aldrei — eda, verra hér, ad alykta ad
   toflurnar tvaer seu ThEGAR samstilltar.

   SAMEININGIN SJALF ER OTEKIN AKVORDUN OG A AD VERA ThAD. Hun er EKKI
   hrein tiltekt: utfaerslurnar tvaer eru MAELDAR jafngodar a stigum
   (summan er su sama) en gefa SITTHVORA FORMASJONINA i 17 af 506
   tilvikum. Ad sameina er thvi ad VELJA formasjon fyrir notandann, og
   thad a ekki ad gerast sem hlidarverkun af tiltektarlotu.

   SE ThAD GERT, ThARF FRAMSALID AD BERA ThRJA LIDI:
       (b.bps ?? 0) - (a.bps ?? 0) || POS_ORDER[a.pos] - POS_ORDER[b.pos]
   Ekki bara `bps`. MAELT (tests/best-team.mjs kafli 8, 506 tilvik):
   an `POS_ORDER`-lidsins breytast 17 tilvik — summan er SU SAMA (jafntefli
   milli formasjona) en 1-5-2-3 verdur 1-4-3-3. Astaedan er ad gamla
   lykkjan byggir `rest` i stodu-rod (GK->DEF->MID->FWD) og `Array.sort`
   er stodug, svo jafntefli radast eftir STODU thar en eftir INNTAKS-rod
   her. Tveir stodugir raderar eru ekki sami raderi.

   OG VORDURINN VERDUR AD LIGGJA A FORMASJONINNI, EKKI A SUMMUNNI.
   Fullyrding um stig stenst BADAR utfaerslur — thad er nakvaemlega
   astaedan fyrir thvi ad thessi munur lifdi nogu lengi til ad verda
   skjaladur i stad thess ad fellast. `tests/best-team.mjs` kafli 8 ber
   506-tilvika grindina sem tharf; hun er thegar til og kostar nanast
   ekkert ad keyra aftur.
   ------------------------------------------------------------------ */
export function pickXi(rows, score, { min = XI_MIN, max = XI_MAX, size = XI_SIZE, tiebreak, posOf = defaultPosOf } = {}) {
  const byPos = { GK: [], DEF: [], MID: [], FWD: [] };
  rowsOf(rows).forEach((r, i) => {
    const pos = posOf(r);
    if (!byPos[pos]) return;              // othekkt stada: SLEPPT, ekki sett i ranga korfu
    const raw = typeof score === "function" ? score(r) : null;
    const s = num(raw);
    byPos[pos].push({ row: r, pos, i, score: s ?? 0, scoreKnown: s != null });
  });
  const cmp = (a, b) => (b.score - a.score)
    || (tiebreak ? tiebreak(a.row, b.row) : 0)
    || (a.i - b.i);
  POS_KEYS.forEach(p => byPos[p].sort(cmp));

  /* 1. LAGMORKIN — thau eru forsenda thess ad lidid se leyfilegt. */
  const count = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const pick = [];
  for (const pos of POS_KEYS) {
    for (let k = 0; k < (min[pos] ?? 0) && k < byPos[pos].length; k++) { pick.push(byPos[pos][k]); count[pos]++; }
  }
  /* 2. GRADUGT A JAEDARVINNINGI. Af thvi ad hver stodu-listi er RADADUR
     er "naesti tiltaeki i stodunni" alltaf STAERSTI jaedarvinningur
     hennar, svo ein rodud rod yfir alla thann sem eftir er GERIR
     nakvaemlega thad sem sonnunin i hausnum segir.                     */
  const rest = [];
  for (const pos of POS_KEYS) rest.push(...byPos[pos].slice(count[pos]));
  rest.sort(cmp);
  const benchPool = [];
  for (const e of rest) {
    if (pick.length >= size || count[e.pos] >= (max[e.pos] ?? Infinity)) { benchPool.push(e); continue; }
    pick.push(e); count[e.pos]++;
  }
  pick.sort((a, b) => (POS_ORDER[a.pos] ?? 9) - (POS_ORDER[b.pos] ?? 9) || cmp(a, b));
  benchPool.sort(cmp);
  const out = e => ({ ...e.row, pos: e.pos, score: e.score, scoreKnown: e.scoreKnown });
  return {
    xi: pick.map(out),
    bench: benchPool.map(out),
    count,
    total: pick.reduce((s, e) => s + e.score, 0),
    legal: legalFormation(count, { min, max, size }),
  };
}

/* ------------------------------------------------------------------
   BEKKJARRODIN — HLUTI AF SVARINU, EKKI EFTIRThANKI

   FPL setur inn af bekknum I ROD, og MARKVORDURINN ER SER SAETI: hann
   kemur adeins inn fyrir markvord, svo hann er hvorki fyrsti, annar ne
   thridji madur. Thess vegna er hann SKILINN UT (`benchGk`) og hinir
   thrir radadir eftir SAMA maelikvarda og XI-id (haest fyrst).

   EKKI FALIN VOG: rodin er ber vaent stig. FPL-autosub notar fyrsta
   bekkjarmann sem heldur uppstillingunni LEYFILEGRI, svo formasjonin
   getur i raun hlidrad theirri rod (byrji thu med 3 i vorn er
   varnarmadur a bekknum "oryggari" en midjumadur). Ad vega thad inn
   vaeri NY, OMAELD tala og hun er thess vegna EKKI her — hun er skrad
   sem athugun i skyrslunni.
   ------------------------------------------------------------------ */
function splitBench(bench) {
  const gks = bench.filter(b => b.pos === "GK");
  const rest = bench.filter(b => b.pos !== "GK");
  /* Fleiri en einn bekkjar-markvordur er OLOGLEGUR hopur (FPL leyfir 2
     markverdi alls). Se hann samt til fer besti i GK-saetid og hinir
     ALLRA SIDAST — their geta hvort eda hvad ekki komid inn fyrir
     utileikmann.                                                        */
  return { benchGk: gks[0] ?? null, bench: [...rest, ...gks.slice(1)] };
}

/* ------------------------------------------------------------------
   SWAP-RODIN. Appid geymir bekkjar-breytingar sem PORd VIXL
   (`benchSwaps[gw] = [[aId,bId], ...]`, sja App.jsx:squadForGw) sem
   skiptast a `starter`-flagginu — thess vegna skilar velin theim, ekki
   nyju saeta-fylki. `plan`/`START_SQUAD` er ALDREI snert.

   ThRENNT SEM VERDUR AD VERA RETT:
   1. ENGIN SJALFS-VIXL og ENGIN vixl ef lidid er thegar rett stillt.
      `[[411,411]]` er sannanleg null-adgerd en LAS SAMT eins og plonun
      i "you have planned N gameweeks"-bordanum (maelt 18.8.2026), svo
      tom breyting a ad skila TOMU fylki og `changed:false`.
   2. HVERT SKREF ma vera LEYFILEGT, ekki bara endastadan. Kallandinn
      getur kallad `swapStarterBench` einu sinni per par, og thad fall
      HAFNAR ologlegri milli-uppstillingu — svo rod sem er rett i lokin
      en ologleg i skrefi 2 vaeri thogul mistok.
   3. MARKVORDUR ER PARADUR VID MARKVORD, sem er thvingad af 1: hvert
      vixl GK<->utileikmanns gefur 0 eda 2 markverdi i byrjunarlidi.
   Leitin er taemandi (<=5 por, bakspor), svo hun finnur rod se hun til.
   ------------------------------------------------------------------ */
export function benchSwapPairs(seats, xiIds, opts = {}) {
  const posOf = opts.posOf ?? defaultPosOf;
  const cur = new Map();
  for (const s of rowsOf(seats)) {
    const pos = posOf(s);
    if (s.id == null || !pos) continue;
    cur.set(s.id, { pos, starter: !!s.starter });
  }
  const target = new Set(xiIds);
  const outs = [...cur.entries()].filter(([id, v]) => v.starter && !target.has(id)).map(([id]) => id);
  const ins  = [...cur.entries()].filter(([id, v]) => !v.starter && target.has(id)).map(([id]) => id);
  if (!outs.length && !ins.length) return { swaps: [], allLegal: true, changed: false };
  if (outs.length !== ins.length) return { swaps: [], allLegal: false, changed: false };

  const count = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const v of cur.values()) if (v.starter) count[v.pos]++;
  const seen = new Set();
  const solve = (o, i, c, acc) => {
    if (!o.length) return acc;
    const key = o.join(",") + "|" + i.join(",");
    if (seen.has(key)) return null;
    seen.add(key);
    for (let a = 0; a < o.length; a++) for (let b = 0; b < i.length; b++) {
      const pOut = cur.get(o[a]).pos, pIn = cur.get(i[b]).pos;
      const c2 = { ...c }; c2[pOut]--; c2[pIn]++;
      if (!legalFormation(c2, opts)) continue;
      const r = solve(o.filter((_, k) => k !== a), i.filter((_, k) => k !== b), c2,
        [...acc, [o[a], i[b]]]);
      if (r) return r;
    }
    return null;
  };
  const found = solve(outs, ins, count, []);
  /* Fannst engin leyfileg rod (t.d. thegar NUVERANDI uppstilling er
     sjalf ologleg) — tha er retta svarid PORIN og MERKI, ekki throng
     tilraun sem kallandinn getur ekki keyrt thegjandi.                 */
  return found
    ? { swaps: found, allLegal: true, changed: true }
    : { swaps: outs.map((id, k) => [id, ins[k]]), allLegal: false, changed: true };
}

/* ==================================================================
   VIDMOTID SEM TAKKINN KALLAR. Eitt kall, allt sem tharf til ad
   BEITA og AFTURKALLA: 11 id, bekkurinn i rod, markvordurinn ser,
   vixlin sem koma manni thangad, og summan sem var hamorkud.

   `seats`: [{ id, pos | element_type, starter, order }] — 15 saetin
            eins og `App.jsx:squadForGw(gw)` skilar theim.
   `score`: (seat) => vaent stig fyrir ThESSA umferd. I appinu
            `s => expPoints(s.id, gw)`, sem er `expPointsFor`.
   ================================================================== */
export function bestTeamPlan({ seats, score, min, max, size, tiebreak, posOf } = {}) {
  const opts = { min: min ?? XI_MIN, max: max ?? XI_MAX, size: size ?? XI_SIZE,
                 posOf: posOf ?? defaultPosOf };
  /* SJALFGEFNA JAFNTEFLID HER ER `id`, EKKI INNTAKSRODIN. Saeta-fylkid
     kemur ur React-state og rod thess er ekki trygging; med hreinni
     stodugri rodun gaefi HRIST inntak annad lid. `id` er einkvaemt i
     hop og gefur thvi sama svar ohad rod.                              */
  const tb = tiebreak ?? ((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
  const r = pickXi(seats, score, { ...opts, tiebreak: tb });
  const { benchGk, bench } = splitBench(r.bench);
  const sw = benchSwapPairs(seats, r.xi.map(x => x.id), opts);
  return {
    xi: r.xi, bench, benchGk,
    count: r.count, total: +r.total.toFixed(4), legal: r.legal,
    swaps: sw.swaps, swapsLegal: sw.allLegal, changed: sw.changed,
  };
}
