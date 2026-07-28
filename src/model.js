/* ============================================================
   MODEL.JS — hreina reiknilíkanið, dregið út úr App.jsx

   AF HVERJU SÉR SKRÁ: prófin (tests/) og bakprófunin þurfa að keyra
   NÁKVÆMLEGA sama kóða og appið birtir notandanum — ekki eftirlíkingu
   sem getur rekið frá raunverulegu formúlunni. Hér er ekkert React,
   engin state, aðeins hrein föll: sömu inntök gefa alltaf sömu útkomu.

   Allar mælingar-athugasemdir fylgja föllunum sem þær eiga við.
   ============================================================ */

import { marketDiff, marketAttackDiff } from "./market.js";

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---- FPL SÖLUVERÐ (50%-hagnaðarreglan) ----
   Þú fær kaupverðið + 50% af hagnaði, NIÐURJAFNAÐ á næstu 0,1.
   Tap: þú fær fullt núverandi verð (engin vörn).
   Dæmi: kaup 7,0 -> verð 7,5 gefur 7,2 (ekki 7,5).
   Verð eru heiltölur x10 í API-inu, svo við reiknum í tíundum.       */
export function sellTenths(purchase10, current10) {
  if (current10 == null) return 0;
  if (purchase10 == null || current10 <= purchase10) return current10;
  return purchase10 + Math.floor((current10 - purchase10) / 2);
}

/* ---- SÉR-LEIKJAÞYNGD PER STÖÐU (FFDR) ----
   TVEIR HÓPAR (GK+DEF = varnar-umbreyting, MID+FWD = sóknar) — mælt
   betra en fjórar stöður á 7 tímabilum (fylgni 0,238 á móti 0,236).
   Vogtölur úr grid-leit + krossprófun, 2.720 lið-leikir, ekkert leki
   (liðsstyrkur alltaf úr FYRRA tímabili).                              */
/* FERÐALENGD ER VILJANDI EKKI HÉR: mælt á 3.420 útileikjum yfir 9
   tímabil (parað innan liðs-tímabils, mótherja-leiðrétt) — áhrifin eru
   ógreinanleg frá núlli (t=−0,42 · r=−0,037). Varðprófið í
   tests/travel-measure.mjs endurmælir þetta og fellur ef það breytist.
   Ferðin birtist sem UPPLÝSING á leikjaröðum, ekki sem vog.             */
/* MKT-VOGIN, MÆLD 2026-07-27 á 6.080 lið-leikjum (8 tímabil, walk-forward,
   leave-one-season-out — tests/ffdr-walkforward.mjs):

   GK/DEF gegn mörkum á sig, r:
     mkt  0,00   0,20   0,35   0,50   0,70   0,80   0,90   1,00
     r   0,290  0,333  0,358  0,376  0,389  0,393  0,394  0,394
   Einræn upp að ~0,8 og 0,8 slær 0,50 í 8/8 tímabilum. Gamla 0,50
   skildi eftir mælanlegan ábata. HÆKKAÐ 0,50 -> 0,80.
   Síðustu 0,2 eru VILJANDI EFTIR og það er dómur, ekki mæling: línan
   kemur úr fáum bókmökurum per leik og ein úrelt/skekkt lína myndi
   annars ráða þyngdinni alveg. 0,80 nær 97% af mælda ábatanum.

   MID/FWD gegn mörkum SKORUÐUM, r (með RÉTTRI markaðsstærð, sjá neðar):
     mkt  0,35   0,50   0,65   0,80   1,00
     r  −0,367 −0,377 −0,384 −0,388 −0,390
   Einræn og flöt eftir 0,8; sama 0,80 valið og fyrir vörn, sama röksemd.

   ATH SÖGUNA — HÚN ER LÆRDÓMUR: fyrsta mælingin sagði að 0,35 væri
   optimum fyrir MID/FWD og að hækkun væri suð (0,50 gaf −0,3404 á móti
   −0,3403, 4/8 tímabil). Það var RÉTT MÆLT en á RÖNGU INNTAKI:
   sóknarhópurinn fékk þá marketDiff(xga), þ.e. þyngd þess að halda hreinu
   blaði. Þegar rétta stærðin (eigin vænt mörk) kom í staðinn varð vogin
   allt í einu einræn upp í 0,8. Mæling á röngu inntaki gefur rétt svar
   við rangri spurningu.                                                 */
export const DIFF_W = {
  1: { fdr:0.45, own:0.55, opp:0, useDef:true, home:0, sot:0.45, elo:0, mkt:0.8 },
  2: { fdr:0.45, own:0.55, opp:0, useDef:true, home:0, sot:0.45, elo:0, mkt:0.8 },
  3: { fdr:0.45, own:0.55, opp:0, useDef:false, home:0.12, sot:0, elo:0.15, mkt:0.8 },
  4: { fdr:0.45, own:0.55, opp:0, useDef:false, home:0.12, sot:0, elo:0.15, mkt:0.8 },
};

/* ---- AÐLÖGUNAR-BLANDA Á LIÐSSTYRK (28.7.2026) ----
   `prev`-vogin VAR FÖST 0,00 í DIFF_W, svo `mix()` skilaði alltaf
   yfirstandandi tímabili og reitirnir prevGoals/prevConc — sem voru
   lagðir alla leið úr team_form.json — voru ALDREI notaðir. Afleiðingin
   var að í GW3 hvíldi leikjaþyngd á ÞREMUR leikjum af hávaða.

   NÚ ER VOGIN KVIK: w_prev = k/(n+k), n = leikir liðsins á yfirstandandi
   tímabili, k=10. n=0 -> allt fyrra tímabil · n=10 -> 50/50 · n=38 -> 21%.
   Þetta er venjuleg Bayes-hnignun: lítið úrtak hnígur að fyrra þekkingu.

   MÆLT á 10.640 lið-leikjum (14 tímabil, kjarninn án markaðar):
     stilling                 r(mörk á sig)  r(mörk skoruð)  GW1–6 vörn
     k=0 (hreint form, ÁÐUR)     0,285          0,335          0,222
     k=10 (nú)                   0,316          0,358          0,314
     k=20                        0,317          0,359          0,317
     hreint fyrra tímabil        0,297          0,347          0,303
   +0,031 í heild, +0,093 Í GW1–6, og k=10 slær k=0 í 14/14 TÍMABILUM.
   Hámarkið er FLATT (k=10–40), svo valið er ekki á hnífsbrún.
   Gegn raunverulegum stigum leikmanna batnar spáin í öllum fjórum
   stöðum, og GW1–6 mest: DEF −0,187 -> −0,302 · GK −0,125 -> −0,188.

   TVENNT SEM MÁ EKKI MISSKILJA:
   1. ÞETTA ER EKKI "FORM" Í MERKINGU HEITRA LEIKMANNA. Sú tilgáta var
      mæld og hrakin (sjá tests/ffdr-player-points.mjs kafla F: sjálffylgni
      innan leikmanns er −0,06). Hér er ekkert spáð um straeti — aðeins
      hversu mikið á að TRÚA litlu úrtaki af yfirstandandi tímabili.
   2. Áhrifin eru lítil MEÐ markaðslínu (+0,002) því markaðurinn vegur
      0,80 og hann veit þetta þegar. Ábatinn er á kjarnanum, þ.e. í öllum
      umferðum nema næstu — sem er einmitt þar sem skipulagning gerist. */
export const PREV_K = 10;
export function prevWeight(matchesThisSeason) {
  const n = Number.isFinite(matchesThisSeason) ? Math.max(0, matchesThisSeason) : 0;
  return PREV_K / (n + PREV_K);
}
export const ELO_SCALE = 150;   // Elo-stig sem svara ~1 þrepi í þyngd

/* ---- KVARÐALEIÐRÉTTING — TVEIR KVARÐAR SEM STÖNGUÐUST Á ----
   GALLINN (mældur 27.7.2026, var skjalaður í CLAUDE.md kafla 7.0):
   `fdr`, `own` og `elo` eru öll á "1–5 kvarða með miðju í 3" — meðalleikur
   fékk d ~3,0. En MEASURED-töflurnar, sem CS% og vænt stig á spjöldunum
   koma úr, eru á kvarða þar sem meðalleikur er ~2,5 (taflan setur raun-
   tíðnina 26,1% CS við d=2,51). Markaðsþyngdin er á TÖFLUKVARÐANUM
   (marketDiff(1,43)=2,44). Kjarninn var því ~0,5 of þungur og
   MEASURED-taflan var lesin á röngum stað: birt CS% fyrir leiki ÁN
   markaðslínu — þ.e. ALLAR umferðir nema næstu — var 6,7pp of svartsýnt,
   og næsta umferð litaðist grænni en seinni umferðir án að vera léttari.

   LEIÐRÉTTINGIN er affin og FITTUÐ, ekki valin. Hún var fittuð GEGN
   RAUNVERULEGUM ÚRSLITUM, ekki gegn markaðnum: markmiðið er Brier á
   CS%-inu sem TAFLAN BIRTIR (lookupPos(2,"cs",d)) á móti því hvort
   hreint blað varð í raun, á 6.080 lið-leikjum. Fyrsta tilraunin
   kvarðaði kjarnann á markaðinn og erfði þá +2,4pp bjartsýni hans —
   úrslitin eru rétta viðmiðið, markaðurinn er milliliður.
   Affin umbreyting haggar EKKI fylgni, svo spákraftur er óbreyttur —
   hún færir aðeins d þangað sem taflan á að vera lesin.

   MÆLT (GK/DEF, LOSO-krossprófað):
     kvörðunarhalli  +6,7pp -> +0,3pp   ·  meðalfrávik 6,7pp -> 1,1pp
     birt CS%        19,4%  -> ~26%     (raun 26,1%)
     Brier           0,1902 -> 0,1850   (grunnhlutfall 0,1928)
   Fittið er stöðugt yfir LOSO: center í [2,49, 2,56], spread í [1,14, 1,28].

   ATH: spread > 1 fyrir vörn er ekki villa. Kjarninn er UNDIR-spenntur af
   því að fdr-liðurinn er grófur (heiltölur 2–5); markaðurinn hefur sd 0,79
   á móti 0,50, svo réttur halli teygir hann.

   SÓKNARHÓPURINN er fittaður með aðhvarfi á markaðs-sóknarþyngdina, ekki
   á úrslit: það er engin tvíkosta útkoma fyrir sókn (mörk skoruð eru ekki
   0/1) svo Brier er ekki í boði. Staðfest með sjálfsamræmi: taflan gefur
   meðal-pts ~POS_MEAN_PTS[4] á kvarðaða dreifinguna.

   EFTIRSTÖÐVAR, SKJALAÐAR (sjá CLAUDE.md 7.0): marketDiff sjálf lætur
   töfluna lesa ~2,4pp OF BJARTSÝNT. Það er fjórðungur af upphaflega
   gallanum og var EKKI lagað hér: fittið á markaðnum lenti á
   grid-jaðrinum (center 3,1 = jaðar) svo það er ekki traust, og
   MARKET_CALIB var mælt sérstaklega annars staðar. Sér yfirferð.

   Sett fram í miðjuðu formi (d − 3) svo það sé lesanlegt hvað er gert:
   færa miðjuna úr 3 í ~2,5 og stilla spennuna.                        */
/* ENDURFITTAÐ 28.7.2026 Á OPINBERA FPL-FDR-IÐ. Fyrsta fittið notaði
   NÁLGAÐ sögulegt FDR (FPL birtir aðeins yfirstandandi tímabil). Nú er
   raunverulega talan til í data/fpl_fdr_history.json og með henni er
   kjarninn 0,090 léttari að meðaltali en nálgunin gaf — appið keyrir á
   opinbera FDR-inu, svo fittið varð að gera það líka.
     def  2,54/1,22 -> 2,63/1,20   ·   att  2,57/0,89 -> 2,62/0,87
   Kvörðunarhalli varnar: −1,0pp -> +0,2pp (meðalfrávik 2,2 -> 2,0pp).
   ATH: LOSO-Brier batnar aðeins í 3/8 tímabilum — breytingin er
   KVÖRÐUN (hvar taflan er lesin), ekki aðgreining, og það er einmitt
   hlutverk SCALE_FIX. Fittið er stöðugt: def center 2,58–2,66 /
   spread 1,16–1,38, att center 2,61–2,64 / spread 0,86–0,88.          */
export const SCALE_FIX = {
  def: { center: 2.63, spread: 1.20 },   // GK + DEF (pos 1, 2) — fittað á úrslit
  att: { center: 2.62, spread: 0.87 },   // MID + FWD (pos 3, 4) — fittað á markaðs-sóknarþyngd
};
export const toMeasuredScale = (d, useDef) => {
  const S = useDef ? SCALE_FIX.def : SCALE_FIX.att;
  return S.center + S.spread * (d - 3);
};
export const LG_SOT = 4.4;      // deildarmeðaltal skota á mark per leik (mælt úr E0)
export const LG_XG = 1.45;      // deildarmeðaltal marka per lið-leik

/* MÆLD TAFLA PER STÖÐU — 3.808 lið-leikir, 7 tímabil, á SAMA FFDR-kvarða
   sem appið notar. pts = raunveruleg meðalstig per leikmann í einum leik. */
export const MEASURED_POS = {
  1: [{d:1.99,pts:4.03,cs:38.9}, {d:2.40,pts:3.79,cs:29.4}, {d:2.70,pts:3.51,cs:26.4}, {d:3.04,pts:3.33,cs:21.6}, {d:3.68,pts:2.80,cs:10.5}],
  2: [{d:1.81,pts:4.12,cs:38.6}, {d:2.21,pts:3.59,cs:30.9}, {d:2.50,pts:3.08,cs:26.2}, {d:2.86,pts:2.59,cs:19.9}, {d:3.58,pts:1.93,cs:10.9}],
  3: [{d:1.94,pts:4.23,cs:38.8}, {d:2.40,pts:3.69,cs:30.7}, {d:2.70,pts:3.26,cs:24.1}, {d:3.03,pts:3.17,cs:22.1}, {d:3.65,pts:2.79,cs:10.9}],
  4: [{d:1.82,pts:4.96,cs:36.5}, {d:2.41,pts:4.73,cs:29.5}, {d:2.74,pts:3.85,cs:24.2}, {d:3.10,pts:3.72,cs:21.7}, {d:3.77,pts:3.42,cs:12.4}],
};
export function lookupPos(pos, key, d) {
  const T = MEASURED_POS[pos] || MEASURED_POS[3];
  const x = clamp(d, T[0].d, T[T.length-1].d);
  for (let i = 0; i < T.length - 1; i++) {
    if (x >= T[i].d && x <= T[i+1].d) {
      const t = (x - T[i].d) / (T[i+1].d - T[i].d);
      return T[i][key] + (T[i+1][key] - T[i][key]) * t;
    }
  }
  return T[T.length-1][key];
}
/* Meðalstig stöðu — jafnvegið meðaltal pts-dálksins í MEASURED_POS.
   Notað sem nefnari í expPoints-margfaldaranum; prófað í tests/.       */
export const POS_MEAN_PTS = { 1: 3.492, 2: 3.062, 3: 3.428, 4: 4.136 };

/* MÆLT Á SAMSETTA KVARÐANUM — 2.720 lið-leikir, 5 tímabil.

   d-HNITIN ENDURMERKT 2026-07-27, MÆLDU TÖLURNAR ÓBREYTTAR.
   Þessi tafla var á LEGACY-kvarðanum (miðja í ~3,0): gömlu hnitin
   2,00/2,40/2,80/3,20/4,00 settu meðalleik í ~2,97. MEASURED_POS er hins
   vegar á kvarða þar sem meðalleikur er ~2,51 — TÖFLURNAR TVÆR VORU Á
   SITT HVORUM KVARÐA, sem enginn hafði tekið eftir því hvorug var
   bakprófuð gegn hinni.
   Eftir SCALE_FIX skilar FFDR nú 2,5-miðjuðum d, svo App.jsx:1016
   (`lookupMeasured("ga", d2)` — birt mörk á sig) las töfluna á röngum
   stað og gaf ~19% of lág mörk á sig. Hnitin eru því færð með SÖMU affinu
   umbreytingu sem SCALE_FIX.def notar, d_nýtt = center + spread*(d_gamalt − 3).
   ENDURREIKNAÐ 28.7. með fittinu á opinbera FDR-ið (2,63/1,20):
     LEGACY-hnit:  2,00   2,40   2,80   3,20   4,00
     -> NÚVERANDI: 1,43   1,91   2,39   2,87   3,83
   Þetta er ENDURMERKING, ekki endurmæling: cs/ga/def/gk/att haggast ekki,
   aðeins hvar á FFDR-kvarðanum þau eru lesin. EF SCALE_FIX.def BREYTIST
   AFTUR VERÐUR ÞETTA AÐ FYLGJA — annars les appið mörk á sig á röngum stað
   og ekkert próf grípur það sjálfkrafa (það er engin sjálfstæð heimild um
   birt mörk á sig; sjá vörðinn í model.test.mjs kafla 4b).               */
export const MEASURED = [
  { d: 1.43, cs: 40.2, ga: 1.00, def: 18.8, gk: 4.2, att: 31.2 },
  { d: 1.91, cs: 30.3, ga: 1.11, def: 17.3, gk: 4.2, att: 29.9 },
  { d: 2.39, cs: 28.5, ga: 1.28, def: 15.1, gk: 3.8, att: 28.0 },
  { d: 2.87, cs: 22.8, ga: 1.53, def: 13.9, gk: 3.5, att: 26.3 },
  { d: 3.83, cs: 13.0, ga: 1.99, def: 10.2, gk: 3.0, att: 22.8 },
];
/* LEGACY-hnitin, geymd svo endurmerkingin sé endurreiknanleg og ekki
   ágiskun ef SCALE_FIX breytist: MEASURED_LEGACY_D[i] er d-hnit rað i
   á upprunalega 3-miðjaða kvarðanum. Vörðurinn í model.test.mjs
   endurreiknar MEASURED[i].d úr þessu og fellur ef þau reka í sundur. */
export const MEASURED_LEGACY_D = [2.00, 2.40, 2.80, 3.20, 4.00];
/* ---- HREINT BLAÐ SEM LÍKINDALÍKAN (FALLBACK-LEIÐIN) ----
   VANDAMÁLIÐ: þegar bókmakaralína vantar — þ.e. í ÖLLUM umferðum nema
   næstu — reiknaði appið CS% með `lookupPos(2,"cs", FFDR)`. Það er
   tvöföld þjöppun: mörg inntök -> eitt d á 1–5 kvarða -> 5-punkta tafla.
   Mælt á 10.640 lið-leikjum (14 tímabil, LOSO): halli +2,3pp og
   meðalfrávik 2,3pp, skill aðeins 3,91%.

   LAUSNIN: logistic-líkan beint á inntökin, sem er rétt form fyrir
   líkindi. λ er væntanleg mörk á sig úr MARGFÖLDUN (eigin vörn ×
   sóknarstyrkur mótherja / deildarmeðaltal), eins og Poisson gerir ráð
   fyrir — ekki summa.

     leið                              Brier     skill   halli   frávik
     taflan (appið áður)               0,19040   3,91%   +2,3pp  2,3pp
     logistic(λ, heima)                0,18848   4,88%   +0,0pp  1,1pp
     logistic(λ, heima, elo, fdr)      0,18637   5,94%   +0,0pp  1,1pp   <- valið
   ΔBrier gegn töflunni: +0,00569, bootstrap-öryggisbil
   [+0,00555, +0,00584] — hvergi nærri núlli. MARKTÆKT.

   SJÁLFSTÆÐ STAÐFESTING: Fable-lota mældi sama form á ÖÐRU úrtaki
   (24 tímabil, 9.410 leikir úr GitHub-spegli af football-data.co.uk) og
   fékk stuðla sigmoid(+0,171 − 1,066·λ + 0,514·heima). Þeir stuðlar,
   ÓBREYTTIR, gefa 4,93% skill á okkar gögnum — nánast sama og okkar eigið
   fitt (4,88%). Tvær óskyldar mælingar á sama fyrirbæri.

   ATH — MARKAÐSLEIÐIN ER EKKI BREYTT og það er mælt: fyrir leiki MEÐ línu
   er e^−λ þegar optimalt (skill 7,14%, frávik 0,7pp) og logistic-lag ofan
   á það gefur ΔBrier −0,00001, þ.e. EKKERT. Fable mældi +0,0023 þar, en
   það var (a) gegn krúðari λ (1X2-skiptingu í stað totals+spreads sem við
   notum) og (b) áður en MARKET_CALIB var lagað í 1,0 í dag — sú skekkja
   sem logistic-lagið átti að éta er þegar farin við rótina.
   Sjá tests/cs-logistic.mjs.                                            */
export const CS_FALLBACK_COEF = {
  intercept: -0.3383, lam: -0.3713, home: 0.3990, eloDiff: -0.1581, fdr: -0.1370,
};
/* λ úr liðsstyrk: margföldun, ekki summa (Poisson-form). LG_XG er nefnari
   beggja þátta svo talan sé í mörkum, ekki í hlutfalli.                  */
export function lambdaFromStrength(ownXgc, oppXg) {
  return (ownXgc / LG_XG) * (oppXg / LG_XG) * LG_XG;
}
/* Skilar líkindum 0–1. eloDiff = (elo mótherja − eigið elo) / 100.
   Öll inntök valfrjáls nema ownXgc/oppXg; vantandi elo/fdr fara í 0 /
   deildarmeðaltal, sem er hlutlaust.                                     */
export function cleanSheetProb({ ownXgc, oppXg, home = false, eloDiff = 0, fdr = 3 }) {
  if (!Number.isFinite(ownXgc) || !Number.isFinite(oppXg)) return null;
  const C = CS_FALLBACK_COEF;
  const z = C.intercept
    + C.lam * lambdaFromStrength(ownXgc, oppXg)
    + C.home * (home ? 1 : 0)
    + C.eloDiff * (Number.isFinite(eloDiff) ? eloDiff : 0)
    + C.fdr * (Number.isFinite(fdr) ? fdr : 3);
  return 1 / (1 + Math.exp(-z));
}

export function lookupMeasured(key, d) {
  const x = clamp(d, MEASURED[0].d, MEASURED[MEASURED.length-1].d);
  for (let i = 0; i < MEASURED.length - 1; i++) {
    const a = MEASURED[i], b = MEASURED[i+1];
    if (x >= a.d && x <= b.d) {
      const t = (x - a.d) / (b.d - a.d);
      return a[key] + (b[key] - a[key]) * t;
    }
  }
  return MEASURED[MEASURED.length-1][key];
}

/* SEX LITAÞREP — mörkin eru SEXTÍLAR raunverulegrar FFDR-dreifingar
   tímabilsins 2026/27 (1.520 lið-leikir × 2 hópar, reiknað með
   nákvæmlega inntökum appsins í tests/model.test.mjs).

   ENDURKVÖRÐUN 2026-07 (fyrri): gömlu mörkin (2,11/2,41/2,66/2,94/3,35)
   komu úr 7-tímabila safni og gáfu 3,8% dökkgrænt en 26% rautt — kvarðinn
   "hallaði á rautt" og nær allt leit þungt út.

   ENDURKVÖRÐUN 2026-07-28 (c): aðlögunar-blandan (prevWeight) blandar 21%
   af tímabilinu 2024/25 inn í forleiks-styrkinn (n=38 -> w=0,21), svo
   dreifingin færðist um ~0,05. Mörkin fylgja.

   ENDURKVÖRÐUN 2026-07-28: SCALE_FIX var endurfittað á OPINBERA FPL-FDR-ið
   (var nálgað), sem færði dreifinguna um ~0,05 upp -> mörkin fylgja.
   Gömlu mörkin (1,92/2,30/2,46/2,75/3,03) gáfu 9,3% dökkgrænt og 23% rautt.

   ENDURKVÖRÐUN 2026-07-27: SCALE_FIX færði alla FFDR-dreifinguna
   um ~0,5 niður (miðja úr ~3,0 í ~2,5), svo gömlu mörkin gáfu 48,8%
   dökkgrænt. Mörkin hér eru sextílar NÝJU dreifingarinnar, reiknaðir úr
   data/ með nákvæmlega inntökum appsins. ÞETTA ER AFLEIÐING, EKKI
   SJÁLFSTÆÐ ÁKVÖRÐUN: litirnir eru afstæð kvörðun og fylgja hvaða kvarða
   sem d er á. Prófið sem felldi þau (kafli 6 í model.test.mjs) gerði
   nákvæmlega það sem það átti að gera.
   Tölurnar sjálfar (CS%, vænt stig) koma áfram úr mældu töflunum á
   samfellda d-gildinu — og eru NÚ rétt kvarðaðar, sem var tilgangurinn.
   Prófið endurreiknar sextílana úr data/ og fellur ef þeir reka
   >0,12 frá þessum mörkum — þá er kominn tími á endurkvörðun.        */
export const TIER_CUTS = [1.98, 2.33, 2.51, 2.75, 3.06];
export function tierOf(d) {
  for (let i = 0; i < TIER_CUTS.length; i++) if (d < TIER_CUTS[i]) return i;
  return TIER_CUTS.length;  // þyngst — MÁ EKKI vera harðkóðað (var 5, svo
}                           // sjöunda þrep hefði aldrei verið hægt að nota)
/* LITIRNIR ENDURHANNAÐIR 28.7.2026 — GRÁTT MIÐÞREP.
   VAND MÁLIÐ: grænt (#d8f5e4) og ljósgult (#fdf6d8) voru nánast eins á
   skjá. Miðjan var því ólæsileg og notandinn gat ekki greint "ágætur
   leikur" frá "hlutlausum".
   LAUSNIN: ljósgula þrepið verður HLUTLAUST GRÁTT. Þá þarf paletta ekki
   að þræða sex liti gegnum sama græn-gula sviðið, svo dökkgrænt og
   dökkgult verða afgerandi mettuð. Augað fær þrjá hópa: grænt = sækja,
   grátt = hlutlaust, gult/rautt = forðast.
   FJÖLDI ÞREPA ER ÓBREYTTUR (sex, sextílar) svo TIER_CUTS haggast ekki —
   aðeins litirnir. Prófin verja bæði hlutleysi miðþrepsins og að
   nágranna-þrep séu sjónrænt aðgreind.                                 */
export const TIER_BG   = ["#5cc78c", "#b3e8cc", "#ecedf1", "#f5c95f", "#f9b8bf", "#ec8b95"];
export const TIER_FG   = ["#01301d", "#04613a", "#4c515c", "#5f3d00", "#93202b", "#6e0b14"];
export const TIER_NAME = ["dökkgrænt", "grænt", "hlutlaust", "dökkgult", "ljósrautt", "rautt"];
/* HLUTLAUSA ÞREPIÐ — grátt, "hvorki gott né vont". Vísað til í prófum svo
   staðsetning þess sé skjöluð og megi ekki reka óviljandi.              */
export const TIER_NEUTRAL = 2;
/* Fjöldi þrepa á EINUM stað — App.jsx reiknar afstæð þrep innan liðs og
   má ekki harðkóða 6 (það gerði það og hefði sleppt sjöunda litnum).   */
export const TIER_COUNT = TIER_BG.length;

/* ---- FFDR-VERKSMIÐJAN ----
   Skilar fixDifficulty(teamId, fx, pos) fyrir gefin gögn. App.jsx OG
   prófin kalla á þetta sama fall — engin tvítekning á formúlunni.

   Inntök:
     teamMetrics  { [teamId]: { xg90, xgc90, sotFor, sotAg, matches,
                                prevGoals, prevConc, prevSotFor, prevSotAg } }
                  `matches` = leikir liðsins á YFIRSTANDANDI tímabili og
                  stýrir aðlögunar-vog prevWeight(); vanti hún er n=0,
                  þ.e. full trú á fyrra tímabil (varfærið sjálfgildi).
     teamById     { [teamId]: { short, ... } }
     odds         { [short]: { diff, opp, kickoff, ... } } | null
     eloByTeam    { [teamId]: { elo } } | {}
   fx: { opp, home, fdr, kickoff? }                                     */
export function makeFixDifficulty({ teamMetrics, teamById, odds, eloByTeam }) {
  return function fixDifficulty(teamId, fx, pos) {
    if (!fx) return null;
    const me = teamMetrics[teamId], opp = teamMetrics[fx.opp];
    if (!me || !opp) return fx.fdr;
    const W = DIFF_W[pos] || DIFF_W[3];
    /* 2-tímabila blöndun með KVIKRI vog per liði — hvert lið hefur sína
       eigin leikjatölu (frestaðir leikir gera þær ólíkar). Sjá prevWeight. */
    const mixWith = m => {
      const w = prevWeight(m?.matches);
      return (cur, prv) => (prv == null || !Number.isFinite(prv)) ? cur : (1 - w) * cur + w * prv;
    };
    const mixMe = mixWith(me), mixOp = mixWith(opp);
    const mg = W.useDef ? mixMe(me.xgc90, me.prevConc)  : mixMe(me.xg90, me.prevGoals);
    const og = W.useDef ? mixOp(opp.xg90, opp.prevGoals) : mixOp(opp.xgc90, opp.prevConc);
    // sóknar-umbreyting: LÍNULEG (mælt betri en gagnstæð)
    let own  = W.useDef ? (mg / LG_XG) : (2 - mg / LG_XG);
    let them = W.useDef ? (og / LG_XG) : (2 - og / LG_XG);
    if (W.sot && me.sotFor != null && opp.sotFor != null) {
      /* Skot á mark blandast með SÖMU kviku vog — team_form.prev geymir
         sot_pg/sot_against_pg, svo þetta er til. Mælt: blandað sot gefur
         0,316 á móti 0,312 þegar aðeins mörk eru blönduð.               */
      const ms = W.useDef ? mixMe(me.sotAg, me.prevSotAg) : mixMe(me.sotFor, me.prevSotFor);
      const os = W.useDef ? mixOp(opp.sotFor, opp.prevSotFor) : mixOp(opp.sotAg, opp.prevSotAg);
      const ownS  = W.useDef ? (ms / LG_SOT) : (LG_SOT / Math.max(1.5, ms));
      const themS = W.useDef ? (os / LG_SOT) : (LG_SOT / Math.max(1.5, os));
      own  = (1 - W.sot) * own  + W.sot * ownS;
      them = (1 - W.sot) * them + W.sot * themS;
    }
    /* MARKAÐS-ÞYNGD TEKUR FORGANG þegar hún gildir um RÉTTA leikinn —
       staðfest gegn mótherja + dagsetningu. Mælt sterkasta einstaka
       inntakið: r=0,394 við mörk á sig á 6.080 lið-leikjum, á móti 0,245
       fyrir hrátt FDR (tests/ffdr-walkforward.mjs).

       ÞYNGDIN ER REIKNUÐ ÚR xga ÞEGAR `diff` VANTAR. Þetta er ekki
       skraut: `diff` var bætt í pipeline 2026-07-25 kl. 20:29 en
       data/odds.json var síðast skrifuð kl. 17:30 sama dag og odds eru
       aðeins sótt tvisvar per umferð — svo skráin í notkun hafði ALDREI
       `diff`, bkValid var alltaf falskt og markaðsliðurinn (helmingur
       af vog varnarmanns) var í reynd dauður í appinu án þess að neitt
       birti það. `xga` er einmitt inntakið í marketDiff, svo þetta er
       sama talan, ekki nálgun — og appið þolir nú útgáfuskekkju milli
       sín og pipeline. Vörður: tests/model.test.mjs krefst þess að
       hver röð í odds.json sé NÝTILEG (diff eða xga + opp + kickoff). */
    /* RÉTT MARKAÐSSTÆRÐ PER HÓP: varnarhópurinn (useDef) spyr hvað
       MÓTHERJINN skorar (xga -> marketDiff); sóknarhópurinn spyr hvað
       LIÐIÐ skorar (xg -> marketAttackDiff). Áður fengu allar stöður
       varnarstærðina, sem var ranga spurningin fyrir MID/FWD — sjá
       marketAttackDiff í market.js fyrir mælinguna.                    */
    const short_ = teamById[teamId]?.short;
    const bk = odds && short_ && odds[short_];
    const defDiff = !bk ? null
      : bk.diff != null ? bk.diff
      : bk.xga != null ? marketDiff(bk.xga)
      : null;
    const bkDiff = !bk ? null
      : W.useDef ? defDiff
      : bk.xg != null ? marketAttackDiff(bk.xg)
      : defDiff;                         // eldri odds.json án xg: fell á gamla hegðun
    const bkValid = bk && bkDiff != null &&
      teamById[fx.opp]?.short === bk.opp &&
      (!fx.kickoff || !bk.kickoff || fx.kickoff.slice(0,10) === bk.kickoff.slice(0,10));

    /* RÖÐIN SKIPTIR MÁLI OG ER MÆLD:
       1) fdr + own + elo blandast á 3-MIÐJAÐA kvarðanum. Elo er líka
          3-miðjað ((op−me)/150 + 3) svo það tilheyrir þeim kvarða; það
          var ÁÐUR blandað EFTIR markaðnum og dró útkomuna aftur í átt
          að 3, sem hélt hluta kvarðagallans inni.
       2) Kvarðaleiðréttingin færir þá blöndu á MEASURED-kvarðann.
       3) Markaðurinn blandast SÍÐAST því hann er þegar á rétta kvarðanum
          og er best kvarðaða inntakið — hann á ekki að þynnast eftir á. */
    let core = fx.fdr * W.fdr + (own * 3) * W.own + (them * 3) * W.opp;
    if (W.elo) {
      const me_e = eloByTeam[teamId]?.elo, op_e = eloByTeam[fx.opp]?.elo;
      if (me_e && op_e) {
        const eScore = clamp((op_e - me_e) / ELO_SCALE + 3, 1, 5);
        core = (1 - W.elo) * core + W.elo * eScore;
      }
    }
    core = toMeasuredScale(core, W.useDef);
    if (bkValid && W.mkt) {
      core = W.mkt * bkDiff + (1 - W.mkt) * core;
    }
    const homeAdj = (W.home || 0) * (fx.home ? 1 : -1);
    return +clamp(core - homeAdj, 1, 5).toFixed(2);
  };
}

/* ---- SKIPTA-KOSTNAÐUR per umferð ----
   FPL-reglur 2026/27: 1 frítt skipti á umferð, safnast upp í 5.
   Hvert aukalegt = −4 stig. Wildcard og Free Hit: ótakmörkuð skipti og
   SÖFNUÐU skiptin HALDAST og halda áfram að safnast (+1 næstu umferð,
   þak 5) — regla frá 2024/25 sem eldri útgáfa braut með ft=1.
   GW1 fyrir frest: ótakmörkuð, og allir byrja með 1 FT í GW2.          */
export function computeTransferCost({ plan, chipAt, maxGw, preSeason }) {
  const made = {};
  plan.forEach(t => { made[t.gw] = (made[t.gw] || 0) + 1; });
  const out = {};
  let ft = 1;
  for (let g = 1; g <= maxGw; g++) {
    const n = made[g] || 0;
    const chip = chipAt(g);
    const isGw1Free = (g === 1 && preSeason);
    const unlimited = isGw1Free || chip === "wildcard" || chip === "freehit";
    if (unlimited) {
      out[g] = { made: n, free: n, hits: 0, points: 0, unlimited: true, chip, ftAvailable: ft };
      // GW1: allir byrja tímabilið með 1 FT. WC/FH: söfnuð skipti
      // HALDAST og +1 bætist við eins og venjulega (þak 5).
      ft = isGw1Free ? 1 : Math.min(5, ft + 1);
    } else {
      const used = Math.min(n, ft);
      const extra = n - used;
      out[g] = { made: n, free: used, hits: extra, points: extra * -4, unlimited: false, ftAvailable: ft };
      ft = Math.min(5, ft - used + 1);
    }
  }
  return out;
}

/* ---- VÆNT STIG per leik ----
   EIN aðferð allar umferðir: grunnur (ep_next ef til, annars stig/leik)
   × margfaldari (mæld stig við FFDR leiksins / meðaltal stöðunnar)
   × tiltækileiki. Tvöföld umferð leggst saman; auð umferð = 0.         */
export function expPointsFor({ p, fxs, fixDifficulty, teamId }) {
  if (!p || !fxs?.length) return 0;
  const avail = p.status === "a" ? 1 : (p.chance_of_playing_next_round ?? 0) / 100;
  const pos = p.element_type;
  const ep = parseFloat(p.ep_next);
  const ppg = parseFloat(p.points_per_game || 0);
  const base = Number.isFinite(ep) && ep > 0 ? ep : ppg;
  if (!base) return 0;
  const mean = POS_MEAN_PTS[pos] || 3.4;
  let mult = 0;
  for (const f of fxs) {
    const d = fixDifficulty(teamId, f, pos);
    const pts = d != null ? lookupPos(pos, "pts", d) : null;
    mult += Number.isFinite(pts) ? pts / mean : 1;
  }
  return base * mult * avail;
}

/* ---- VERÐSPÁ (nálgun) ----
   FPL birtir ekki verðbreytingaformúluna; þekkta mynstrið er að nettó-
   flutningar þurfi að ná þröskuldi sem SKALAST með eignarhaldi (fjölda-
   maður þarf fleiri flutninga til að hreyfast). Við notum kvaðratrótar-
   skölun á selected_by_percent með 60k grunn — gróf en gagnleg nálgun,
   MERKT sem spurning ("í nótt?") en aldrei sem vissa.
   Skilar "up" / "down" / null. chg != 0 = búinn að hreyfast í dag
   (FPL hreyfir verð að hámarki einu sinni á dag) -> engin spá.          */
export function priceMovePrediction({ net, selectedByPct, chg }) {
  if (chg) return null;
  const pct = Math.max(0.3, parseFloat(selectedByPct) || 0.3);
  const threshold = 60000 * Math.sqrt(pct / 5);
  if (net > threshold) return "up";
  if (net < -threshold) return "down";
  return null;
}
