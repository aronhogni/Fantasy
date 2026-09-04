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

   ELO-VOGIN FYRIR GK/DEF: 0 -> 0,15 (28.7.2026). Hún hafði ALDREI verið
   mæld með nýtilegu Elo: bakprófin notuðu eigin walk-forward nálgun sem
   mældist 0,133 í fylgni við markamun á móti 0,448 fyrir raunverulegt
   ClubElo (bókmakaralínan 0,471). Nálgunin var 3,4x lakari, svo "elo
   bætir engu við vörn" var rétt mælt á ÖNÝTU inntaki — sama tegund villu
   sem fannst í sóknar-markaðsstærðinni.

   Með RAUNVERULEGU ClubElo (data/clubelo_history.json, 9.408 leikir),
   mælt á KJARNANUM (án markaðar, þ.e. allar umferðir nema næsta):
     elo-vog   mörk á sig   DEF-stig   GK-stig
     0,00       0,3164      −0,2655    −0,1715
     0,10       0,3291      −0,2673    −0,1731
     0,15       0,3336      −0,2673    −0,1732   <- valið
     0,20       0,3371      −0,2666    −0,1729
     0,30       0,3412      −0,2642    −0,1717
   Mörk á sig batna áfram upp í 0,30+, EN raunveruleg stig leikmanna
   toppa við 0,10–0,15 og lækka eftir það. Stigin eru markmiðið, svo
   0,15 er valið — ekki 0,30 sem myndi líta betur út á lið-útkomunni.

   MEÐ markaðslínu er þetta hlutlaust (0,3952 -> 0,3948, 0,04σ) því
   markaðurinn gleypir Elo alveg (hlutfylgni 0,007). Ábatinn er á
   kjarnanum, og kjarninn gildir um nær allar umferðir.

   SÓKNIN heldur 0,15: sveipunin er flöt/tvíbent þar — mörk skoruð toppa
   við ~0,30 og MID-stig hækka áfram, en FWD-stig LÆKKA. Að hækka hana
   væri að skipta MID út fyrir FWD án nettó-ábata.

   ATH SÖGUNA — HÚN ER LÆRDÓMUR: fyrsta mælingin sagði að 0,35 væri
   optimum fyrir MID/FWD og að hækkun væri suð (0,50 gaf −0,3404 á móti
   −0,3403, 4/8 tímabil). Það var RÉTT MÆLT en á RÖNGU INNTAKI:
   sóknarhópurinn fékk þá marketDiff(xga), þ.e. þyngd þess að halda hreinu
   blaði. Þegar rétta stærðin (eigin vænt mörk) kom í staðinn varð vogin
   allt í einu einræn upp í 0,8. Mæling á röngu inntaki gefur rétt svar
   við rangri spurningu.

   ---- `homeCore` — HEIMAVÖLLUR FYRIR GK/DEF (9.8.2026) ----
   `home` er dregið frá ALLTAF (MID/FWD). `homeCore` er dregið frá AÐEINS
   þegar (a) markaðslínan tók ekki við OG (b) Elo-liðurinn var notaður.

   VANDINN SEM ÞETTA LEYSTI: með `home: 0` hafði varnarhópurinn ENGA
   vallar-aðgreiningu nema gegnum FDR, og FPL gefur Arsenal-gegn-Liverpool
   sömu tölu (4) á báðum völlum — svo LIV ÚTI og LIV HEIMA voru NÁKVÆMLEGA
   EINS (2,14). Notandinn sá það.

   MÆLT á 10.640 lið-leikjum (14 tímabil) og á 28.355 byrjunarliðs-
   umferðum (5 tímabil), í KJARNANUM (án markaðar):
     h      GK |r| stig   DEF |r| stig   lið r(d,GA)
     0,00     0,1783        0,2629        0,3384
     0,10     0,1768        0,2661        0,3485
     0,15     0,1752        0,2661        0,3513
     0,20     0,1730        0,2652        0,3527   <- DEF
     0,30     0,1674        0,2609        0,3516

   GK = 0 ER MÆLT, EKKI GLEYMSKA: markvörður fellur EINRÆNT yfir allt
   sviðið meðan lið-mörkin batna. Skýringin er raunveruleg — hann fær stig
   fyrir VÖRSLUR jafnt og hreint blað, og útileikur gefur FLEIRI skot á
   markið. Sama gildra og elo-vogin lenti í hér að ofan: lið-útkoman og
   stig leikmanns toppa á SITTHVORUM stað, og STIGIN eru markmiðið.

   SKILYRÐIN TVÖ:
   1. EKKI MEÐ MARKAÐI — bókmakarinn verðleggur heimavöll þegar, svo eigin
      liður tvítelur og spáin VERSNAR (0,3942 -> 0,3864).
   2. EKKI ÁN ELO — án Elo er 0,20 of stór hliðrun fyrir grófara mat og
      einrænni þrepanna brotnar. Mælt, einrænni-próf á 14 tímabilum:
        engin Elo:  h=0 12/14  ->  h=0,20  8/14   (VERRA)
        með Elo:    h=0 13/14  ->  h=0,20 14/14   (BETRA)
      Liðurinn slokknar því SJÁLFUR ef ClubElo dettur út.

   DEF heldur 0,20 en ekki 0,15: munurinn er 0,0009 í stigum (0,0014 í
   mörkum, í hina áttina) og 0,15 vinnur aðeins 2/4 tímabil — hávaði á
   móti 14-tímabila LOSO sem valdi 0,20–0,25 í 14/14 brotum.
   TIER_CUTS voru endurreiknuð vegna breiðari dreifingar (sjá þau).      */
export const DIFF_W = {
  1: { fdr:0.45, own:0.55, opp:0, useDef:true, home:0, homeCore:0,    sot:0.45, elo:0.15, mkt:0.8 },
  2: { fdr:0.45, own:0.55, opp:0, useDef:true, home:0, homeCore:0.20, sot:0.45, elo:0.15, mkt:0.8 },
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

   ENDURKVÖRÐUN 2026-07-28 (d): elo-vog GK/DEF 0 -> 0,15 færði dreifinguna
   um ~0,03; mörkin fylgja.

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
   >0,12 frá þessum mörkum — þá er kominn tími á endurkvörðun.

   ENDURKVÖRÐUN 2026-08-09: `homeCore` (heimavöllur fyrir GK/DEF, sjá
   DIFF_W) bætir ±0,20 ósamhverfri hliðrun við varnarhópinn í öllum
   umferðum án markaðslínu. Dreifingin breikkar því og gömlu mörkin gáfu
   **12,4% á hlutlausa miðþrepið** — rétt ofan við 12%-gólf prófsins og á
   leið út. Mörkin hér eru sextílar NÝJU dreifingarinnar, reiknaðir með
   nákvæmlega inntökum appsins; mælt eftir: **16,4 / 16,9 / 16,0 / 17,2 /
   16,5 / 17,0%** — jafnir sjöttungar aftur.
   Sama afleiðing og 27.7.: litirnir eru afstæð kvörðun og elta d.      */
export const TIER_CUTS = [1.94, 2.29, 2.57, 2.80, 3.09];
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
export const TIER_NAME = ["dark green", "green", "neutral", "dark yellow", "light red", "red"];
/* HLUTLAUSA ÞREPIÐ — grátt, "hvorki gott né vont". Vísað til í prófum svo
   staðsetning þess sé skjöluð og megi ekki reka óviljandi.              */
export const TIER_NEUTRAL = 2;

/* GRAENAR RUNUR — 3+ LEIKIR I ROD I GRAENU THREPI.
   Svarar ANNARRI spurningu en threpid sjalft: threpid segir "er thessi
   leikur letttur?", runan segir "a thetta lid gott PROGRAM?" — og thad er
   sidari spurningin sem raedur thvi hvenaer madur kaupir inn i lid.

   TVAER REGLUR SEM ERU AKVARDANIR, EKKI SMEKKUR:
     1. GRAENT = threp UNDIR hlutlausa (dokkgraent og graent). Hlutlaust
        er hlutlaust — runa sem inniheldur thad vaeri ekki graen runa.
     2. AUD UMFERD SLITUR RUNU. Blank er 0 stig og thvi thyngra en hvada
        raudur leikur sem er (sama rok og i rotation.js, CLAUDE.md 3d).
        Runa sem spannar auda umferd vaeri login. ATH: `null >= 2` er
        FALSE i JS, svo naiv skilyrdi hleypir audri umferd i gegn — thess
        vegna er `!= null` prófad SERSTAKLEGA. Vordur: model.test.mjs.

   `tiers` er fylki threpa; `null` merkir auda umferd. Skilar fylki i somu
   lengd: `null` thar sem engin runa er, annars { first, last, len }.     */
export function greenRuns(tiers, minLen = 3) {
  const out = new Array(tiers.length).fill(null);
  for (let i = 0; i < tiers.length;) {
    if (tiers[i] == null || tiers[i] > TIER_NEUTRAL) { i++; continue; }
    let j = i;
    while (j < tiers.length && tiers[j] != null && tiers[j] < TIER_NEUTRAL) j++;
    if (j - i >= minLen)
      for (let k = i; k < j; k++) out[k] = { first: k === i, last: k === j - 1, len: j - i };
    /* `i = j` EITT SER ER OORUGGT: se ytra skilyrdid (hopp yfir) og innra
       skilyrdid (lengja runu) einhvern tima osamstaed, verdur j === i og
       lykkjan snyst ad eilifu. Thad gerdist i raun vid stokkbreytingar-
       profun (>= vs >) og hengdi profakeyrsluna i stad thess ad fella
       hana. Fallid ma ekki geta hengt vidmotid, hvad tha profid sem a ad
       finna villuna.                                                     */
    i = Math.max(j, i + 1);
  }
  return out;
}
/* Fjöldi þrepa á EINUM stað — App.jsx reiknar afstæð þrep innan liðs og
   má ekki harðkóða 6 (það gerði það og hefði sleppt sjöunda litnum).   */
export const TIER_COUNT = TIER_BG.length;

/* ============================================================
   UMFERÐA-BIL, LANDSLEIKJAHLÉ OG EVRÓPUVIKUR

   >>> ÞETTA ER BIRTING, EKKI LÍKAN. <<<
   Evrópuálag var MÆLT og HAFNAÐ sem inntaki í FFDR (docs/MAELINGAR.md
   6k): innan leikmanns −1,37pp með CI [−4,67; +1,92] — núll er inni í
   bilinu. Það er því EKKI vísbending um verri stig og má aldrei fara
   inn í `fixDifficulty`, `expPointsFor` né `rankScore`. Það sem það ER:
   samhengi fyrir MIG þegar ég vel umferð til að taka hit eða spila chip.
   Ef einhver vill nota þetta í spá þarf NÝJA mælingu, ekki þennan kóða.

   EIN SKILGREINING Á „BILI" FYRIR BÆÐI MERKIN. Landsleikjahléið og
   Evrópuvikan sitja á sama stað í umferðastikunni — milli hnúts n og
   n+1. Væru þau reiknuð sitt í hvoru lagi gætu þau verið ósammála um
   hvar bilið liggur og merkin lent á sitthvorum staðnum fyrir sama gap.
   Þess vegna reiknar `gwSpans` bilið einu sinni og bæði lesa hana.
   ============================================================ */

/* { [gw]: { min, max } } í ms — fyrsti og síðasti byrjunartími umferðar. */
export function gwSpans(fixtures) {
  const by = {};
  for (const f of fixtures || []) {
    if (f.event == null || !f.kickoff_time) continue;
    const t = Date.parse(f.kickoff_time);
    if (!Number.isFinite(t)) continue;
    const a = by[f.event] || (by[f.event] = { min: t, max: t });
    if (t < a.min) a.min = t;
    if (t > a.max) a.max = t;
  }
  return by;
}

/* 12 dagar skilja raunveruleg hlé (14–21 d) frá miðvikudagslausum
   vikum (7–9,8 d). Mælt úr fixtures.json — sjá athugasemd í App.jsx.  */
export const BREAK_MIN_DAYS = 12;

/* { [gw]: dagafjöldi } — hlé Á EFTIR þessari umferð.                  */
export function intlBreaks(fixtures) {
  const by = gwSpans(fixtures);
  const out = {};
  for (const k of Object.keys(by)) {
    const n = +k, next = by[n + 1];
    if (!next) continue;
    const days = (next.min - by[n].max) / 864e5;
    if (days >= BREAK_MIN_DAYS) out[n] = Math.round(days);
  }
  return out;
}

/* ---- KEPPNISHEITI Á ENSKU ----
   `euro_fixtures.json` ber `comp_label` Á ÍSLENSKU („Meistaradeild",
   „Ofurbikar", „Ligubikar") — það er leif frá því að viðmótið var
   tvítyngt. Viðmótið er ENSKT EINGÖNGU (kafli 9) og labelið er BIRT:
   leikjalistinn á leikmannaspjaldinu sýnir það. Mælt 9.8.2026: spjald
   Aston Villa-manns bar „Ofurbikar" í enskri töflu, og þegar dráttur
   riðlakeppninnar kemur verður „Meistaradeild" á sex félögum.

   ÞÝTT EFTIR `comp` (VÉLRÆNA AUÐKENNINU), EKKI EFTIR LABELINU. Auðkennið
   er stöðugt; labelið er texti sem pipeline má breyta. Þetta lagar því
   BÆÐI gögnin sem þegar eru committuð OG þau sem koma síðar, án þess að
   snerta pipeline — sem er rétt, því `comp_label` er líka notað í
   pipeline-nótum þar sem íslenska er í lagi (kafli 9).

   „Ofurbikar" ber ENGA broddstafi — þetta er nákvæmlega ASCII-íslenskan
   sem stafaskynjun getur ekki séð (kafli 9). Orðin eru því á lista
   `no-icelandic.mjs` kafla C.                                          */
export const COMP_EN = {
  "uefa.champions": "Champions League",
  "uefa.europa": "Europa League",
  "uefa.europa.conf": "Conference League",
  "uefa.super_cup": "Super Cup",
  "uefa.champions_qual": "UCL qualifying",
  "uefa.europa_qual": "UEL qualifying",
  "uefa.conf_qual": "UECL qualifying",
  "eng.fa": "FA Cup",
  "eng.league_cup": "League Cup",
  "eng.charity": "Community Shield",
  "fifa.cwc": "Club World Cup",
  /* Stuttkóðarnir úr `participation`. */
  CL: "Champions League", EL: "Europa League", UECL: "Conference League",
};
/* Fellur á `comp` (vélræna auðkennið, ASCII) EN EKKI á `comp_label` —
   labelið er einmitt það sem gæti verið íslenskt.                      */
export const compLabel = fx =>
  COMP_EN[typeof fx === "string" ? fx : fx?.comp] ||
  (typeof fx === "string" ? fx : fx?.comp) || "";

/* { [gw]: { comps:[...], teams:[...], n } } — evrópu-/bikarleikir sem
   falla í bilið Á EFTIR umferð n. `comps` ber VÉLRÆNU auðkennin; birting
   þýðir þau með `compLabel` svo líkanið haldist tungumálalaust.

   AÐEINS BILIÐ MILLI UMFERÐA. Evrópuleikir eru miðvikudagsleikir og
   lenda því í gapinu; leikur sem færi fram á sama sólarhring og
   deildarleikir telst ekki „evrópuvika" heldur er hann þegar sýnilegur
   í leikjalistanum á spjaldinu.

   TÓM ÚTKOMA ER RÉTT SVAR Í ÁGÚST. Dráttur riðlakeppninnar er ekki
   kominn, svo `euro_fixtures.json` ber aðeins Ofurbikarinn og
   Samfélagsskjöldinn — BÁÐA fyrir GW1. Fallið skilar þá {} og
   viðmótið á að segja það berum orðum frekar en að sýna ekkert.       */
export function euroWeeks(fixtures, euroFx) {
  const by = gwSpans(fixtures);
  const gws = Object.keys(by).map(Number).sort((a, b) => a - b);
  const out = {};
  for (const fx of (euroFx?.fixtures || [])) {
    const t = Date.parse(fx.date);
    if (!Number.isFinite(t)) continue;
    for (const n of gws) {
      const next = by[n + 1];
      if (!next) continue;
      if (t > by[n].max && t < next.min) {
        const e = out[n] || (out[n] = { comps: [], teams: [], n: 0 });
        e.n++;
        /* VELRAENA AUDKENNID, ekki labelid — sja compLabel().           */
        if (fx.comp && !e.comps.includes(fx.comp)) e.comps.push(fx.comp);
        for (const id of [fx.home_fpl, fx.away_fpl])
          if (id != null && !e.teams.includes(id)) e.teams.push(id);
        break;
      }
    }
  }
  return out;
}

/* Sett af FPL-liðs-id sem eru í Evrópukeppni í ár.
   `participation` er NOTHÆFT ÞÓTT LEIKIR SÉU ÓDREGNIR — það er einmitt
   ástæðan fyrir því að það er sérstakt svið í skránni og ekki leitt út
   úr `fixtures`. Í ágúst er þetta eina evrópu-merkið sem er til.      */
export function euroTeams(euroFx) {
  const p = euroFx?.participation;
  if (!p || typeof p !== "object") return new Map();
  const m = new Map();
  for (const [id, comps] of Object.entries(p)) {
    const list = Array.isArray(comps) ? comps.filter(c => typeof c === "string") : [];
    if (list.length) m.set(+id, list);
  }
  return m;
}

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
    /* SNEMM-UTGANGAN LYTUR SOMU REGLU OG SU NEDRI (25.8.2026): otaek
       tala er ENGIN tala. An thessa gat `fx.fdr` sjalft borid NaN her
       inn, og tha var vardan nedar gagnslaus — hun ver adra utgonguna
       af tveimur. Sama villa, tveir stadir.                          */
    if (!me || !opp) return Number.isFinite(+fx.fdr) ? fx.fdr : null;
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
    let usedElo = false;
    if (W.elo) {
      const me_e = eloByTeam[teamId]?.elo, op_e = eloByTeam[fx.opp]?.elo;
      if (me_e && op_e) {
        const eScore = clamp((op_e - me_e) / ELO_SCALE + 3, 1, 5);
        core = (1 - W.elo) * core + W.elo * eScore;
        usedElo = true;
      }
    }
    core = toMeasuredScale(core, W.useDef);
    const usedMarket = !!(bkValid && W.mkt);
    if (usedMarket) {
      core = W.mkt * bkDiff + (1 - W.mkt) * core;
    }
    /* `homeCore` KREFST ThESS AD ELO HAFI VERID NOTAD — sja DIFF_W.
       An Elo er thyngdarmatid of gruft til ad thola 0,20 hlidrun og
       einraenni threpanna brotnar (maelt: 8/14 a moti 12/14). Med Elo
       batnar hun (14/14 a moti 13/14). Lidurinn slokknar thvi SJALFUR
       ef ClubElo dettur ut, i stad thess ad skemma.                    */
    const homeAdj = ((W.home || 0)
                     + ((!usedMarket && usedElo) ? (W.homeCore || 0) : 0))
                    * (fx.home ? 1 : -1);
    /* ============================================================
       NaN MA ALDREI VERDA "ThYNGSTI LEIKUR DEILDARINNAR" (25.8.2026)

       Vanti `fx.fdr` verdur `core` NaN, og NaN SLEPPUR gegnum allar
       `d != null`-vardirnar i appinu (NaN er ekki null). Utkoman er
       ekki hlutlaus heldur skekkt i AKVEDNA att, thvi hver einasti
       lesandi fellur a sinn sidasta reit:
         `clamp(NaN, …)` -> NaN -> lykkjan i `lookupPos`/`lookupMeasured`
         finnur ekkert bil og skilar SIDUSTU rodinni (thyngsta threpi),
         og `tierOf(NaN)` skilar 5 — dokkraudu.
       MAELT: `lookupPos(3,"pts",NaN)` gefur 2,79, sem er nakvaemlega
       thyngsta threpid, og `tierOf(NaN)` gefur 5.

       Madurinn litur thvi ILLA ut i stad thess ad leikurinn se
       SLEPPT — og enginn dalkur segir fra. Vantandi inntak a ad gefa
       ENGA TOLU (kafli 8: "faar maelingar -> ENGIN tala"), aldrei
       verstu toluna.

       Vardan er a UTKOMUNNI, ekki a einu sviði: `own`, `them`, `bkDiff`
       og Elo geta oll borid NaN inn, og skilyrdi sem telur upp inntok
       gleymir alltaf einu (sama laerdomur og `gated`-regexid i
       fetch.mjs). MAELT 25.8.2026 a `fixtures.json`: 0 af 760 sviðum
       vantar i dag, svo thetta er DULIN villa — hun bidur eftir
       leikjaskra sem er hálfskrifud, ekki eftir venjulegum degi.
       ============================================================ */
    const out = clamp(core - homeAdj, 1, 5);
    if (!Number.isFinite(out)) return null;
    return +out.toFixed(2);
  };
}

/* ---- SKIPTA-KOSTNAÐUR per umferð ----
   FPL-reglur 2026/27: 1 frítt skipti á umferð, safnast upp í 5.
   Hvert aukalegt = −4 stig. Wildcard og Free Hit: ótakmörkuð skipti og
   SÖFNUÐU skiptin HALDAST og halda áfram að safnast (+1 næstu umferð,
   þak 5) — regla frá 2024/25 sem eldri útgáfa braut með ft=1.
   GW1 er UPPHAFSLIÐIÐ (aldrei skipti, sjá langa athugasemd neðar), og
   allir byrja með 1 FT í GW2.

   `unlimitedBy` SEGIR HVERS VEGNA, OG ÞAÐ ER EKKI SKRAUT: aðeins Wildcard
   og Free Hit gefa skipti. Bench Boost og Triple Captain gefa EKKI NEITT
   skiptatengt. Áður bar raðan `chip` eina — hvaða chip sem var plönuð í
   þeirri umferð — svo birtingin gat ekki greint „ótakmörkuð VEGNA chips"
   frá „ótakmörkuð af því að GW1-frestur er ekki runninn út". Í forleik með
   Bench Boost í GW1 varð úr því **„Bench Boost — ótakmörkuð skipti"**, sem
   er ósönn regla á skjánum. GW1 fyrir frest vinnur ALLTAF sem orsök, því
   hún gildir óháð chipi og getur því ekki eignað chipi ranga verkun.

   ============================================================
   GW1 ER UPPHAFSLIÐIÐ, ALDREI SKIPTI — `preSeason` VAR SKILYRÐI OG ÞAÐ
   VAR VILLA SEM BEIÐ DAGSETNINGAR (20.8.2026)
   ============================================================
   `isGw1Free` var `(g === 1 && preSeason)`. Það er rétt um regluna
   („ótakmörkuð frí skipti til GW1-frests") en RANGT um það sem notandinn
   er að gera: liðið sem hann velur í GW1 ER upphafsliðið, ekki skipti.
   Mælt á ÓBREYTTRI áætlun (5 val í GW1, eitt skipti í GW2), sama kall,
   aðeins `preSeason` víxlað:

     preSeason=true   GW1  made 5 · free 5 · hits 0 · points   0   totalHits   0
     preSeason=false  GW1  made 5 · free 1 · hits 4 · points −16   totalHits −16

   Ekkert í áætluninni breyttist — aðeins klukkan. Kl. 17:30 21.8. hefði
   appið því byrjað að reikna **−16 stig** á notandann fyrir að byggja
   upphafsliðið sitt, og talan hefði lekið inn í `totalHits`, í
   „net X pts" á skiptaáætluninni og í mælaborðið. Þetta er nákvæmlega
   ættin sem CLAUDE.md kafli 8 nefnir: *sama svið má ekki þýða sitthvað
   eftir því hvort tímabilið er byrjað.*

   Reglan er auk þess FPL-rétt í báðar áttir: GW1-skipti eru ekki til.
   Fyrir frest eru þau ótakmörkuð og frí; eftir frest er GW1 liðin og
   engin GW1-skipti eru möguleg — svo að refsa fyrir þau er að refsa
   fyrir aðgerð sem er ekki hægt að gera. `g === 1` er því ALLTAF frítt.

   `preSeason` heldur samt merkingu sinni í `unlimitedBy` (og er þar með
   enn lesin): fyrir frest er orsökin „preseason" (hann getur enn breytt),
   eftir frest er hún „initial" (upphafsliðið, ekki skipti). Sama tala,
   tvær ólíkar setningar á skjánum, og hvorug lýgur.
   Vörður: `model.test.mjs` kafli 2b.                                     */
export function computeTransferCost({ plan, chipAt, maxGw, preSeason }) {
  const made = {};
  plan.forEach(t => { made[t.gw] = (made[t.gw] || 0) + 1; });
  const out = {};
  let ft = 1;
  for (let g = 1; g <= maxGw; g++) {
    const n = made[g] || 0;
    const chip = chipAt(g);
    const isGw1Free = (g === 1);
    const chipGivesTransfers = chip === "wildcard" || chip === "freehit";
    const unlimited = isGw1Free || chipGivesTransfers;
    if (unlimited) {
      out[g] = { made: n, free: n, hits: 0, points: 0, unlimited: true, chip,
                 unlimitedBy: isGw1Free ? (preSeason ? "preseason" : "initial") : "chip",
                 ftAvailable: ft };
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

/* ============================================================
   UPPHAFSLIÐIÐ ER EKKI SKIPTI — EIN REGLA, ÞRÍR NOTENDUR (20.8.2026)
   ============================================================
   Sama villan kom upp á ÞREMUR stöðum sama daginn, og allir þrír höfðu
   sína eigin `gw === 1`-prófun (eða enga):

     1. KOSTNAÐURINN — `isGw1Free` var `(g === 1 && preSeason)`, svo kl.
        17:30 21.8. hefði appið byrjað að reikna −16 stig á notandann fyrir
        að byggja upphafsliðið. Lagað hér fyrir ofan (sjá langa
        athugasemdina við `computeTransferCost`).
     2. SKIPTAÁÆTLUNIN — GW1-valin voru birt sem `út → inn` raðir með
        „ávinningi" mældum gegn þeim sem HANDAHÓFI var í hópnum sem
        notandinn byrjaði frá. Notandinn: „Þetta transfer plan er ekki
        rétt. Er ekki neitt transfer, bara starting liðið mitt".
     3. GRÆNI RAMMINN — `plannedIn` var `plan.filter(t => t.gw <= gw)`, svo
        í GW2 báru GW1-mennirnir enn „nýkominn inn"-rammann. Notandinn:
        „Þegar ég er kominn í gameweek 2, er enn grænn border utan um
        kallana, eins og ég hafi verið að skipta þeim út."

   ÞRÍR NOTENDUR EINNAR REGLU = EIN ÚTFÆRSLA. Repo-ið hefur borgað fyrir
   afritin þrisvar: `buildTeamMetrics` skrifaði NaN á 17 lið og merkti það
   `src:"e0"` (CLAUDE.md 7), `headWidth`/`BADGE_W` voru grænir í prófinu
   meðan 25 hausar klipptust (kafli 8), `ZONE_RE` vantaði markteiginn í
   BÁÐUM afritum (kafli 12). Þess vegna er reglan HÉR, í hreinni rökfræði
   við hliðina á `computeTransferCost`, og hvergi annars staðar.

   AF HVERJU ER ENGIN TÍMA-PRÓFUN Í HENNI — OG ÞAÐ ER ÁKVÖRÐUN:
   GW1-skipti eru EKKI TIL á neinum tímapunkti. Fyrir frest er hópurinn
   valinn (ótakmarkað og frítt); eftir frest er GW1 liðin og ekkert
   GW1-skipti er mögulegt. Reglan er því ALGILD í tíma, nákvæmlega eins og
   `isGw1Free = (g === 1)` hér fyrir ofan.
   `preSeason` var mælt og HAFNAÐ sem skilyrði: hún víxlar kl. 17:30 21.8.
   og þá hefðu SÖMU vistuðu raðirnar hoppað aftur inn í „net X pts" —
   klukka sem breytir merkingu vistaðra gagna er einmitt gildran í kafla 8
   („sama svið má ekki þýða sitthvað eftir því hvort tímabilið er byrjað").
   `gw` (umferðin sem notandinn ER AÐ SKOÐA) var líka hafnað: hún er
   birtingar-ástand, svo áætlunin hefði breytt merkingu við smell á
   tímalínuna.

   SETNINGIN Á SKJÁNUM er hins vegar tíma-háð, og hún kemur ÚR
   `unlimitedBy` sem er þegar til: „preseason" (hann getur enn breytt
   hópnum) á móti „initial" (GW1 er liðin). Sama tala, tvær setningar,
   hvorug lýgur — og engin fjórða hugmynd um „hvað er GW1".

   Vörður: `initial-squad.mjs` (tenging OG hegðun) + `model.test.mjs` 2b. */
export const INITIAL_SQUAD_GW = 1;

/* Tekur RÖÐ úr áætluninni (`{ gw, outId, inId }`). Númerið er þvingað í
   tölu því `loadState` hleypir `gw:"1"` í gegn úr localStorage (sama
   gerðar-gildra og `tr.gw > g` bar strengja-samanburð, sjá App.jsx).   */
export function isInitialSquadPick(t) {
  return Number(t?.gw) === INITIAL_SQUAD_GW;
}

/* ============================================================
   AAETLUNIN LOGD A GRUNNINN — EIN UTFAERSLA, OG HUN SEGIR FRA
   ThVI SEM HUN SLEPPTI (21.8.2026)
   ============================================================
   Notandinn a opnunardegi: „segir Connected — 15 players fetched from FPL
   for gameweek 1, en rett lid kemur ekki."

   TVENNT VAR AD, OG ThAU ERU SITT HVOR HLID SOMU LYKKJU.

   1. UPPHAFSLIDS-VALIN VORU LOGD OFAN A RAUNLIDID UR FPL. Hann byggdi
      hopinn i appinu ADUR en hann tengdi (tiu GW1-radir a `START_SQUAD`).
      Thegar FPL-hopurinn kemur er hann UPPHAFSLIDID — valin eru thvi
      OFAUKIN med skilgreiningu, ekki „skipti sem eiga ad gilda lika".
      MAELT (jsdom, hans eigin 15 id + hans tiu GW1-radir): niu radir
      slokna thvi `outId` er ur `START_SQUAD` og er ekki i raunlidinu — en
      KEDJA innan GW1 (hann skipti um skodun: Mosquera -> White -> Saliba)
      hefur SEINNI hlekk sem `outId` ER i raunlidinu, svo hann LENDIR:
      vollurinn bar **Saliba i stad White** — mann sem FPL segir ad hann
      eigi ekki. Bankinn fylgdi med: **-1,5** i stad +0,5, thvi
      `sellOf(outId) - now_cost(inId)` var lagt vid fyrir hverja rod,
      lika thaer niu sem breyttu ENGU.
      GW2+ VERDA AD GILDA AFRAM — thad er allur punkturinn i ad plana
      fram i timann. Skilyrdid er thvi `isInitialSquadPick`, sami
      predikatinn sem fjorir adrir notendur hafa (aaetlunar-listinn,
      `plannedIn`, `resetAll`, `unusedPlan`), og ThESSI ER FIMMTI.

   2. `if (i >= 0)` FLEYGDI ROD SEM EKKI VAR HAEGT AD BEITA — ThOGULT.
      Thad er astaedan fyrir thvi ad villan les eins og „connected, 15
      fetched, rangt lid" i stad villuskilabod. `gw1-persistence.mjs` R6
      maelir thessa thogn berum orðum og kallar hana „verra". Fallid
      skilar thvi ThREMUR listum og kallandinn getur ekki thagad um thá
      nema hann velji thad: `applied` · `skipped` (outId er ekki i hopnum)
      · `redundant` (GW1-val ofan a raunlid).

   AF HVERJU ER ThETTA I `model.js` OG EKKI I `App.jsx`: lykkjan stod
   ThRISVAR i App.jsx (`squadForGw`, `bank`, og hefdi ordid fjorda afritid
   thegar talningin kom) og hun er nakvaemlega su aett sem repo-id hefur
   borgad fyrir threfalt — `buildTeamMetrics` skrifadi NaN a 17 lid og
   merkti thad `src:"e0"`, `headWidth` var graent i profinu medan 25
   hausar klipptust, `ZONE_RE` vantadi markteiginn i BADUM afritum.
   Vollurinn og bankinn LESA nu sama svar; their gatu adur rekid i sundur
   thegjandi (og GERDU thad: vollurinn slapp med niu, bankinn taldi tiu).

   `base` ER AFRITAD, EKKI BREYTT. Kallandinn geymir `squadOverride` /
   `START_SQUAD` i state og fasta — ritun i thau vaeri thogul spilling
   sem lifir thar til blodid er endurhladid.

   FH-REGLAN ER OBREYTT: skipti i Free Hit-umferd gilda ADEINS i theirri
   umferd. Rod sem er sleppt af theirri astaedu er HVORKI `skipped` ne
   `applied` — hun er ekki „mistok", hun er utan gluggans.
   ============================================================ */
export function applyPlan({ base, plan, gw, fhGws = null, official = false } = {}) {
  const seats = (Array.isArray(base) ? base : []).map(s => ({ ...s }));
  const applied = [], skipped = [], redundant = [];
  const g0 = Number(gw);
  /* TOLU-ThVINGUN A BADUM HLIDUM. `loadState` hleypir `gw:"1"` i gegn ur
     localStorage og `"10" > 9` er strengja-samanburdur i JS — sama
     gerdar-gildra sem `isInitialSquadPick` ber sjalfur.                 */
  const rows = (Array.isArray(plan) ? plan : [])
    .filter(t => t && Number.isFinite(Number(t.gw)))
    .sort((a, z) => Number(a.gw) - Number(z.gw));
  for (const tr of rows) {
    const g = Number(tr.gw);
    if (g > g0) continue;
    if (fhGws?.has?.(g) && g !== g0) continue;
    if (official && isInitialSquadPick(tr)) { redundant.push(tr); continue; }
    const i = seats.findIndex(s => s.id === tr.outId);
    if (i < 0) { skipped.push(tr); continue; }
    seats[i] = { ...seats[i], id: tr.inId };
    applied.push(tr);
  }
  return { seats, applied, skipped, redundant };
}

/* ---- VÆNT STIG per leik ----
   EIN aðferð allar umferðir: grunnur (ep_next ef til, annars stig/leik)
   × margfaldari (mæld stig við FFDR leiksins / meðaltal stöðunnar)
   × tiltækileiki. Tvöföld umferð leggst saman; auð umferð = 0.         */
/* ---- ENDURKOMU-DAGSETNING ÚR `news` (29.7. -> LAGAÐ 31.7.2026) ----
   VILLAN SEM VAR, OG HÚN SKEKKTI ÁKVARÐANIR:
   `avail` var reiknað úr `chance_of_playing_next_round` — EINU tölunni sem
   FPL gefur — og notað fyrir ALLAR umferðir. `expPoints(pid, g)` er samt
   kallað per umferð. Flaggaður leikmaður fékk því 0 vænt stig í GW2, 3, 4
   og 5 þótt hann sé kominn til baka, og `transferNet(tr, horizon = 5)`
   LEGGUR ÞESSI FIMM NÚLL SAMAN. Þetta var því ekki birtingarvilla heldur
   skekkja í skipta-tillögunum.
   Dæmi úr raungögnum: Garner (239) "Groin injury - Expected back 22 Aug",
   GW1-frestur er 21.8. — hann er til leiks frá GW2 en fékk 0 alla leið.

   MÆLT: 10 af 55 flögguðum hafa LESANLEGA dagsetningu, svo varaleiðin
   (óbreytt hegðun) er REGLAN, ekki undantekningin. Þrír eru bönn með
   nákvæmri lokadagsetningu — það er dagatal, ekki spá.

   HVE MIKIÐ SPILA ÞEIR EFTIR ENDURKOMU? MÆLT á 1.169 endurkomum
   (fpl_player_gw.json, 5 tímabil; fjarvera = 2+ umferðir með 0 mín, grunnur
   >=60 mín, 3+ leikir á undan):
     1. umferð eftir endurkomu   68,6% af fyrri mínútum
     2. umferð                   67,8%
     3. umferð                   66,1%
     60+ mín í fyrsta leik       51,0%
   RAMPINN ER FLATUR, EKKI STÍGANDI — þeir setjast í ~2/3 og hanga þar.
   Þess vegna er EKKERT ramp upp í 1,0: `injury` fær 0,69 í öllum umferðum
   eftir dagsetninguna.
   BÖNN fá 1,0: bann er reglu-atriði, ekki líkamlegt — maðurinn er í fullu
   formi þegar það rennur út. ATH þó að mælingin gat EKKI skilið bönn frá
   meiðslum (engin news-saga til), svo 1,0 er dómur um EÐLI banns, ekki
   mælt gildi. Það er skjalað hér vísvitandi.                            */
/* ---- FPL-SLOD -> LIDSNUMER ----
   HREINT FALL svo thad se profanlegt. Innslattur i STYRDA React-reiti er
   ótraustur i jsdom (kafli 4), svo ad profa thetta gegnum vidmotid maelir
   jsdom og ekki regluna. Reglan sjalf er thad sem getur brostid.
   Skilar { id } eda { error: "empty"|"league"|"none" }.                   */
export function parseEntryId(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return { error: "empty" };
  const m = t.match(/entry\/(\d+)/) || t.match(/^#?(\d+)$/);
  if (m) return { id: m[1] };
  /* Algengasta mistokin: deildar-slod i stad lids-slodar. Hun a ad fa
     SERTAEKA villu, annars leitar notandinn i tomu. */
  if (/leagues?\//i.test(t)) return { error: "league" };
  return { error: "none" };
}

export const RETURN_AVAIL = { ban: 1.0, injury: 0.69 };

/* ---- ALDUR A FFDR-INNTAKI (ThOGUL BILUN) ----
   elo.json er inntak i FFDR. 31.7.2026 var hun 1,5 daga gomul thvi ClubElo
   BRAST (`elo: {"ok":false,"note":"fetch failed"}` i status.json) — en
   ekkert i vidmotinu sagdi thad, adeins raud lina i heimildalistanum. Sama
   mynstur sem gerdi markadslidinn daudan i VIKU (kafli 3): formulan i lagi,
   gognin sem hun fekk ekki.
   HREINT FALL svo threpin seu profanleg — vafrinn getur ekki komid ser i
   'gamalt' stod ad vild, svo threpin verda ad vera maelanleg an hans.
   2 dagar: pipeline gengur daglega, svo eitt tapad skipti er ekki tidindi.
   5 dagar: nokkrar keyrslur i rod hafa brostid og thad er raunveruleg bilun. */
export const ELO_STALE_WARN = 2, ELO_STALE_BAD = 5;
export function eloStale(updated, nowTs = Date.now()) {
  const t = updated ? Date.parse(updated) : NaN;
  if (!Number.isFinite(t)) return null;               // engin dagsetning -> thegjum
  const days = (nowTs - t) / 864e5;
  if (days < ELO_STALE_WARN) return null;             // ferskt: engin truflun
  return { days, level: days >= ELO_STALE_BAD ? "bad" : "warn" };
}
const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
                 jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
/* "Groin injury - Expected back 22 Aug" -> { kind:"injury", ts }
   "Suspended until 29 Aug"              -> { kind:"ban",    ts }
   Ekkert lesanlegt -> null (og þá gildir gamla hegðunin).               */
export function parseReturn(news, nowTs = Date.now()) {
  const m = /(Expected back|Suspended until)\s+(\d{1,2})\s+([A-Za-z]{3})/i.exec(news || "");
  if (!m) return null;
  const mon = MONTHS[m[3].toLowerCase()];
  if (mon == null) return null;
  const day = +m[2];
  const now = new Date(nowTs);
  /* ÁRIÐ ER EKKI I TEXTANUM. Veljum það ár sem setur dagsetninguna innan
     næstu ~11 mánaða — annars yrði "Expected back 10 Jan" lesið sem
     dagsetning í fortíðinni og maðurinn talinn til leiks strax.          */
  /* ============================================================
     ARAMOTIN GENGU ADEINS I ADRA ATTINA (25.8.2026)

     Gamla reglan var `if (ts < nowTs - 30d) ts = y + 1` — hun leidretti
     desember-frett sem er lesin i januar SAMA ars, en EKKI januar-frett
     sem er lesin i desember. MAELT: "Expected back 25 Dec" lesid 5. jan
     2027 gaf **25. des 2027** — 354 dogum OF SEINT. Madurinn er tiltækur
     eftir ellefu daga og telst omogulegur i ellefu manudi.

     Ahrifin eru "ihaldssom" i theim skilningi ad thau ofmeta fjarveru, en
     thad er EKKI hlutlaust: `availForKickoff` notar `r.ts` til ad AKVEDA
     hvenaer madurinn kemur inn aftur, svo skekkjan slekkur a honum yfir
     allan gluggann — sama form af thogulli skekkju og NaN-threpid i
     `makeFixDifficulty`.

     RETTA REGLAN ER SYMMETRISK: arid er ekki i textanum, svo vid veljum
     thad ar sem setur dagsetninguna NAEST deginum i dag. Thrju ar eru
     skodud (i fyrra, i ar, ad ari) og thad naesta valid — engin
     ihaldssemi i hvoruga att, bara naesta lesning.
     ============================================================ */
  const y0 = now.getUTCFullYear();
  let ts = null;
  for (const y of [y0 - 1, y0, y0 + 1]) {
    const cand = Date.UTC(y, mon, day);
    if (ts == null || Math.abs(cand - nowTs) < Math.abs(ts - nowTs)) ts = cand;
  }
  return { kind: /Suspended/i.test(m[1]) ? "ban" : "injury", ts };
}
/* ============================================================
   VANTANDI LIKUR ERU EKKI 0% — EIN TALA FYRIR BADAR LEIDIR (25.8.2026)

   `recommend.js` lagadi thessa villu hja ser 7.8.2026 (`UNMEASURED_UI
   .unknownChance`) eftir raunverulega notenda-tilkynningu, og skrifadi
   rokstudninginn ut: FPL skilar OFT `chance_of_playing_next_round: null`
   einfaldlega thvi frettin er ekki komin, og `?? 0` ler tha thogninni
   merkinguna "utilokadur". `availForKickoff` — sem faedir `expPointsFor`,
   og thar med skiptanetid, Triple-Captain-timasetninguna og
   `captainScore` — bar somu villuna afram OSNERT. Tvo foll svorudu
   sitthvoru um SAMA hlut, sem er ættbogi `buildTeamMetrics` (CLAUDE.md 7).

   TALAN BYR HER OG `recommend.js` FLYTUR HANA INN, ekki ofugt: sa
   innflutningur er thegar til (`rankScore`) og hinn vaeri hringur.
   HUN ER VALIN, EKKI MAELD — `status`/`chance`/`news` eiga sér ENGA sogu
   i `fpl_player_gw.json`, svo thetta er ekki maelanlegt og a ekki ad
   vitna i sem maelingu. Sja hausinn a `UNMEASURED_UI`.

   ATH: ADEINS `null`/`undefined` faer hana. RAUNVERULEG tala gildir sem
   hun er — `chance: 0` er STADREYND um manninn (meiddur, bannadur) og
   ma aldrei hakka upp i 50%.
   ============================================================ */
export const UNKNOWN_CHANCE = 0.5;

/* ============================================================
   TVAER SKJALADAR REGLUR REKAST A — OG BADAR VORU OF BREIDAR

   `tests/best-team.mjs` fullyrdir: *status "d" an prosentu er 0, thvi
   FPL-STATUS ER EINRATT* (CLAUDE.md kafli 6).
   `src/recommend.js` fullyrdir: *VANTANDI LIKUR ERU EKKI 0% — null
   thydir "veit ekki", og tha er varfaerid mat 50%.*
   Baðar eru rettar um sitt tilfelli og baðar voru UTFAERDAR BREIDAR EN
   ThAER ERU ORDADAR:
     · `availForKickoff` gaf `?? 0` — svo "veit ekki" vard "utilokadur"
     · `recommend.js` gaf 0,5 a HVERN sem er ekki "a" — svo BANNADUR
       madur an prosentu vard 50% liklegur til ad spila

   ROKSTUDNINGUR BEGGJA NEFNIR STODU "d" ORDRETT ("stodu-'d' mann MED
   ochekktar likur"). Reglan sem thau bædi LYSA, en hvorugt utfaerdi, er
   thvi thessi:

     FPL-STODURNAR ERU EKKI JAFNGILDAR. "d" (doubtful) er FPL ad segja
     *vid vitum ekki*; "i" (injured), "s" (suspended), "u"
     (unavailable) og "n" (not in squad) eru FPL ad segja *hann spilar
     ekki*. Ad lesa thogn eins fyrir bada flokka er ad henda theirri
     upplysingu sem stadan sjalf ber.

   ThVI:
     · raunveruleg tala  -> hun gildir, oháð stodu (nakvaemasta stadreyndin)
     · "a"               -> 1
     · "d" an tolu       -> UNKNOWN_CHANCE (stadan SEGIR "ovist")
     · onnur an tolu     -> 0 (stadan segir "spilar ekki" — status raedur)

   ThETTA ER OMAELT OG ER YFIRLYST SEM SLIKT. `status`/`chance`/`news`
   eiga ser ENGA sogu i `fpl_player_gw.json`, svo thetta er ekki
   maelanlegt a panelinum og ma ALDREI vitna i sem maelingu (sja hausinn
   a `UNMEASURED_UI`). Nanasta MAELDA hlidstaedan studur thó attina:
   CLAUDE.md kafli 4 maeldi ad naift `expPts x sp` an `?? 1` bekkjar
   81,6% theirra sem eiga ENGA byrjunar-tolu og kostar -3,86 stig/umferd
   — "engin gogn" ma ekki verda ad lagri tolu.

   MAELT 25.8.2026 a `data/players.json`: **0 af 609** leikmonnum eru i
   thessu astandi i dag (a|null 461 · i|0 54 · a|100 30 · d|75 17 ·
   u|0 39 · s|0 3 · d|25 1 · d|50 4), svo thetta er DULID astand sem
   kviknar thegar frett lendir a undan prosentunni.
   ============================================================ */
export function availFromStatus(p) {
  const ch = p?.chance_of_playing_next_round;
  if (typeof ch === "number" && Number.isFinite(ch)) return ch / 100;
  if (p?.status === "a" || p?.status == null) return 1;
  return p.status === "d" ? UNKNOWN_CHANCE : 0;
}

/* Tiltækileiki fyrir EINN leik. `kickoff` er ISO-strengur leiksins.
   Fyrir dagsetninguna (eða ef hún vantar) gildir FPL-talan óbreytt.     */
export function availForKickoff(p, kickoff, nowTs = Date.now()) {
  const cur = availFromStatus(p);
  /* `p?.status === "a" ||` STOD HER OG BRAUT REGLU `availFromStatus`
     (lagad 25.8.2026). Fallid reiknar `cur` — sem gefur RAUNTOLUNNI
     forgang yfir stodu — og henti henni svo um leid og stadan var "a".
     Utkoman var TVAER TILTAEKILEIKA-TOLUR fyrir sama mann: `recommend.js`
     las 0,75 gegnum `availFromStatus` medan `expPointsFor` las 1,0
     gegnum thetta fall. `cur >= 1` einn ber sama verk og virdir tolulna.
     DORMANT I DAG OG ThAD ER MAELT: 0 af 610 i `players.json` og 0 af
     18.510 rodum i `data/history/` bera "a" MED tolu undir 100. Thad
     bitur thann dag sem FPL skilur mann eftir a "a" og lækkar
     prósentuna — "fréttin lendir a undan tolunni", sem haus
     `availFromStatus` skjalar sjalfur. */
  if (cur >= 1) return 1;
  const r = parseReturn(p?.news, nowTs);
  if (!r || !kickoff) return cur;
  const k = Date.parse(kickoff);
  if (!Number.isFinite(k) || k < r.ts) return cur;
  return Math.max(cur, RETURN_AVAIL[r.kind] ?? cur);
}

/* ============================================================
   GRUNNURINN — MAELDUR 4.9.2026, `scripts/measure-base.mjs`
   ============================================================
   Notandinn: „eg vill lika gera projected points betri, thad er ekkert
   ad marka thau."

   `ep_next` ER EKKI SPA I NEINUM ThEIM SKILNINGI SEM HEITID GEFUR I
   SKYN. Maelt a lifandi svari 26.8.2026: `ep_next === form` hja 94,2%
   theirra sem hofdu spilad — thad er 30-daga medaltal. Sangare fekk
   2,3 af thvi ad hann hafdi skorad litid, ekki af thvi ad leikurinn
   vaeri erfidur; sa sem blankadi tvisvar er spadur naestum null og sa
   sem hauladi einu sinni er spadur haerra en hann a skilid.

   MAELT A 134.711 LEIKMANNA-UMFERDUM (5 timabil, blonk medtalin, GW1
   utan thvi thar er engin innan-timabils saga). Hver frambjodandi fer
   gegnum SOMU byggingu appsins (grunnur x FFDR-margfaldari), svo thad
   er GRUNNURINN einn sem er borinn saman. Vidmidid er `ppg5` —
   stadgengill `ep_next` i sogunni, thvi FPL-eigid `xP` er REIKNAD EFTIR
   A og ma ekki vera vidmid (`tests/xp-contaminated.mjs`).

     grunnur      r        MAE      topp-15
     ppg5      0,4918   1,0756     4,293      <- thad sem appid gerdi
     ppgAll    0,4961   1,0924     4,404
     shrunk    0,5036   1,1366     4,535
     shrunkMin 0,4975   1,0243     4,433      <- thetta

   VALID ER A MAELIKVARDANUM SEM SPURNINGIN SNYST UM. `shrunk` (an
   minutna) raðar best en er VERRI a MAE i ollum thremur bilum — og
   MAE er nakvaemlega „er talan truverdug", sem var kaeran. `shrunkMin`
   vinnur MAE alls stadar (d MAE -0,0513 CI [-0,0615, -0,0361],
   utilokar null) og TAPAR HVERGI.

   OG I GW1-5 — ThAR SEM SARSAUKINN ER — VINNUR HANN BADAR ATTIR:
     d topp-15  +0,530  CI [+0,040, +0,976]   utilokar null
     d MAE      -0,1191 CI [-0,1478, -0,0886] utilokar null
   Astaedan er vélræn: eftir tvaer umferdir er `form` byggt a tveimur
   tolum og sveiflast fra 0 upp i 10; skrumpad per-90 gildi med fyrra
   timabil sem forgildi gerir thad ekki.

   K = 3 ER MAELT, EKKI VALID: LOSO valdi 3 i fjorum timabilum af fimm
   og ristin er FLOT (topp-15 4,449 · 4,461 · 4,504 · 4,489 · 4,484
   fyrir K = 1 · 2 · 3 · 5 · 8). K = 0 er urkynjad (enginn nefnari
   fyrstu umferdina).

   FORGILDIN eru medalstig per rod i hverri stodu, maeld a somu 5
   timabilum; LOSO-sveiflan er +-0,03, svo EIN tala per stodu er nog.
   Their eru gefnir sem STIG PER 90 med thvi ad deila med 60/90 —
   nakvaemlega sama umbreyting og maelingin notadi.

   HVENAER ER HANN EKKI NOTADUR (og `ep_next` heldur ser):
     · adur en timabilid byrjar (`seasonStarted !== true`) — tha bera
       `minutes`/`total_points` tolur FYRRA timabils (sama gildra og
       `season_baseline` klobburinn, sja CLAUDE.md 7.1), svo skrumpunin
       vaeri reiknud ur rongum heimi. SKILYRDID BYR I `pointsBase`
       SJALFRI, ekki i kallandanum — sja athugasemdina thar;
     · thegar `mins5` vantar (nyr leikmadur, `player_form` ekki komin) —
       „faar maelingar -> ENGIN tala", ekki agiskun.
   Vordur: `tests/exp-points.mjs` kafli 6.
   ============================================================ */
export const BASE_K = 8;
/* Vaegi fyrra timabils: thad tharf ~5 heila leiki (450 min) adur en eigin
   hlutfall leikmannsins raeður forgildinu. MAELT, sja leitina ad ofan. */
export const BASE_PRIOR_M90 = 5;
/* Medalstig per rod (blonk medtalin), 5 timabil, lyklad a element_type. */
export const BASE_POS_PRIOR = { 1: 0.8481, 2: 1.1033, 3: 1.2342, 4: 1.2888 };
/* Vidmidunar-minutur: forgildin ad ofan eru stig per ROD, og rod er ad
   medaltali ~60 min a velli. Umbreytingin i stig per 90 er thvi /(60/90)
   — nakvaemlega su sem maelingin notadi.                              */
const REF_MINS = 60;

export function pointsBase({ p, mins5, minsTrend, prevPts, prevMins,
                             matchesPlayed, seasonStarted }) {
  /* KLUKKAN ER HLUTI AF FORMULUNNI, EKKI AF KALLANDANUM. Fyrsta
     utgafan gataði hana i App.jsx og vordurinn var TEXTALEIT — sem
     stodst afram thegar skilyrdid var fjarlaegt, thvi `seasonStarted`
     stod eftir i deps-fylkinu tveimur linum nedar. Fullyrding sem
     stenst stokkbreytinguna sem hun heitir eftir er verri en engin
     (CLAUDE.md kafli 13). Reglan byr thvi HER og er profud a hegdun. */
  if (seasonStarted !== true) return null;
  if (!p) return null;
  /* `Number(null)` ER 0 OG ThAD ER EKKI VANTANDI TALA. Fyrsta utgafan
     notadi `Number(...)` og hleypti `null`/`undefined`/"" i gegn sem
     nulli — sama gildra og „NULL ER EKKI NULL" (CLAUDE.md kafli 8), her
     i talnabreytunni sjalfri.                                        */
  const num = v => (typeof v === "number" && Number.isFinite(v) ? v
    : (typeof v === "string" && v.trim() !== "" && Number.isFinite(+v) ? +v : null));
  const m5 = num(mins5);
  if (m5 == null) return null;
  const pts = num(p.total_points);
  if (pts == null) return null;
  const played = num(matchesPlayed);
  if (played == null || played <= 0) return null;
  const pos = p.element_type;

  /* FORGILDID ER SJALFT URTAK OG ER SKRUMPAD EFTIR ThVI. Leikmadur med
     12 stig a 88 minutum i fyrra ber 12,3 stig/90 — tala sem er
     truverdug og byggd a engu. `BASE_PRIOR_M90` dregur hana ad
     stodu-medaltalinu eftir hans EIGIN minutufjolda.                 */
  const posP90 = (BASE_POS_PRIOR[pos] ?? 1.2) / (REF_MINS / 90);
  const pp = num(prevPts), pm = num(prevMins);
  const prevM90 = pm != null && pm > 0 ? pm / 90 : 0;
  const prev90 = prevM90 > 0 && pp != null ? pp / prevM90 : null;
  const w = prevM90 / (prevM90 + BASE_PRIOR_M90);
  const prior90 = prev90 == null ? posP90 : w * prev90 + (1 - w) * posP90;

  /* NEFNARINN ER LEIKIR FELAGSINS, EKKI BYRJANIR. Blonk eru ThEGAR i
     talningunni — ad sleppa theim vaeri ad spyrja „hve morg stig EF hann
     spilar", sem er onnur spurning en „hvern a eg ad velja".         */
  const perMatch = (pts + BASE_K * prior90 * (REF_MINS / 90)) / (played + BASE_K);
  const exp = Math.max(0, Math.min(90, m5 + (num(minsTrend) ?? 0)));
  return perMatch * (exp / REF_MINS);
}

export function expPointsFor({ p, fxs, fixDifficulty, teamId, nowTs, basis }) {
  if (!p || !fxs?.length) return 0;
  const pos = p.element_type;
  const ep = parseFloat(p.ep_next);
  const ppg = parseFloat(p.points_per_game || 0);
  /* MAELDI GRUNNURINN ThEGAR HANN ER HAEGT AD REIKNA, annars `ep_next`.
     `basis` kemur fra kallandanum thvi `p` eitt ber hvorki `mins5` ne
     fyrra timabil — og hann er SLEPPT (ekki 0) thegar hann vantar.   */
  const measured = pointsBase({ p, ...basis });
  const base = Number.isFinite(measured) && measured > 0 ? measured
    : (Number.isFinite(ep) && ep > 0 ? ep : ppg);
  if (!base) return 0;
  const mean = POS_MEAN_PTS[pos] || 3.4;
  let mult = 0;
  for (const f of fxs) {
    const d = fixDifficulty(teamId, f, pos);
    const pts = d != null ? lookupPos(pos, "pts", d) : null;
    /* TILTAEKILEIKI ER PER LEIK, EKKI PER LEIKMANN. GW1 straekkar 21.-24.
       agust, svo madur sem er "back 22 Aug" getur spilad INNAN GW1 — thess
       vegna er thetta i leikja-lykkjunni og ekki fyrir utan hana.        */
    const av = availForKickoff(p, f?.kickoff ?? f?.kickoff_time, nowTs);
    mult += (Number.isFinite(pts) ? pts / mean : 1) * av;
  }
  return base * mult;
}

/* ============================================================
   LIKUR A DEFCON-STIGUM I VALINNI UMFERD (4.9.2026)
   ============================================================
   Notandinn: „eg vill baeta vid a player cardid hversu liklegt er ad
   leikmadur fai DC stig a moti naesta andstaedingi i vikunni sem eg er
   med valda."

   TVENNT AF ThRENNU ER MAELT OG ThAD ThRIDJA ER MAELT AD VERA NULL:

   1. HANS EIGIN HITTNI ER RAUNVERULEG OG ThRAUTSEIG. Split-half
      areidanleiki DC-hittni er **0,7551** a moti **0,3263** fyrir stig —
      **2,31x** (maelt 25.8.2026). Talan sem er notud er `hit_rate_adj`,
      AFTURVIRKJUD (`(hits + 10*p0)/(starts + 10)`); hraa hlutfallid
      ofmaelist a litlum synum og ma aldrei birtast eitt.

   2. BYRJUN ER SKILYRDID. DC-throskuldurinn er onaanlegur a 15
      minutum, svo hittnin er skilgreind PER BYRJUN — likurnar i
      umferdinni eru thvi `hittni x byrjunar-likur`.

   3. ANDSTAEDINGURINN HREYFIR ThETTA EKKI — OG ThAD ER MAELT, EKKI
      SLEPPT. A 3.580 MID-byrjunum 2025/26 gefur hvert FFDR-threp
      **+0,123 DC-adgerdir CI [0,032, 0,216]** — merkid er raunverulegt —
      en STIGA-RASIN er lokud af throskuldinum: DefCon-stig hreyfast
      **+0,007/threp CI [−0,032, +0,048]** og yfir allt threpasvidid er
      rasin **0,03 stig, i besta falli 0,24** (CLAUDE.md kafli 4).
      Ad thyngja toluna eftir motherja vaeri thvi OMAELD TALA SEM LITUR
      UT EINS OG MAELING — versta utkoman. Skjarinn SEGIR thetta i stad
      thess ad thegja, thvi thogn um lid sem vantar les eins og gleymska.

   TVOFOLD UMFERD: spurningin er „faer hann DC-stig i thessari viku",
   svo tveir leikir eru `1 - (1-p)^2`. Aud umferd -> engin tala.

   MARKMENN FA ENGA TOLU: maelt 25.8.2026 a `player_gw_2526.json` —
   757 leikja-umferdir, 750 byrjanir, **NULL DC-stig, hamark 0**.
   ============================================================ */
export function dcChance({ dcRow, startProb, fixtures }) {
  if (!dcRow || dcRow.position === 1) return null;
  const rate = dcRow.hit_rate_adj;
  const starts = dcRow.starts;
  if (!Number.isFinite(rate) || !Number.isFinite(starts) || starts <= 0) return null;
  const n = Array.isArray(fixtures) ? fixtures.length : 0;
  if (!n) return null;
  const sp = Number.isFinite(startProb) ? startProb : null;
  /* `startProb === null` ER EKKI 1. Ad margfalda med einum vaeri ad
     fullyrda ad hann byrji orugglega — af thvi ad okkur VANTAR gogn.
     Tha er per-byrjun talan birt undir SINU eigin heiti i stadinn
     (`p === null`), sem er sama regla og „faar maelingar -> ENGIN tala". */
  const per = sp == null ? null : rate * sp;
  return {
    perStart: 1 - (1 - rate) ** n,        // „ef hann byrjar alla leikina"
    p: per == null ? null : 1 - (1 - per) ** n,
    startProb: sp, rate, starts, n,
  };
}

/* ---- RÖÐUNARSKOR FYRIR TILLÖGUR (mælt 29.7.2026) ----
   AF HVERJU SÉR SKOR OG EKKI "VÆNT STIG": mælingar á 48.445
   leikmanna-umferðum (5 tímabil, LOSO) sýndu að RÖÐUN og STÆRÐ eru tvö
   ólík störf. Að auka leikja-næmið í expPointsFor bætti röðun en gaf
   13–27% NEGATÍF vænt stig og verri MAE. Þess vegna heldur birta talan
   (`≈4,8 stig`) sinni kvörðun og TILLÖGUR raðast eftir þessu skori.

   MÆLIKVARÐINN ER ÁKVÖRÐUNIN: raunstig þeirra sem skorið valdi.
     val         þetta skor   aðferð appsins   FPL-eigið xP   ORAKEL-ÞAK
     topp-15        5,13          4,70             4,48          5,62
     topp-5         6,07          5,29             5,20          6,54
   Slær bæði aðferð appsins OG FPL-eigið xP í 5/5 tímabilum.
   ORAKEL-ÞAKIÐ er það sem fæst með því að vita ÁRSTÍÐAR-MEÐALTAL hvers
   leikmanns fyrirfram (þ.e. framtíðina) — skorið nær 91–93% af því.

   ÞVÍ ERU AÐEINS FJÖGUR INNTÖK: rík sett voru mæld og VERSNA valið
   (57 inntök gáfu topp-5 5,95 á móti 6,07). Hreiðruð valprófun sýndi
   þéttan lista betri í 5/5 tímabilum. `mins5` og `price` voru valin í
   ÖLLUM foldum, FFDR í 3/5. Fleiri tölur = meira suð, ekki meiri vísdómur.

   HVERS VEGNA ÞESSI FJÖGUR (öll formerki túlkanleg):
     form   ↑ -> betra    (nýleg stig — geta og staða í liðinu)
     mínútur↑ -> betra    (stærsta einstaka tellið; hann verður að spila)
     verð   ↑ -> betra    (markaðurinn verðleggur getu sem tölur okkar sjá ekki)
     FFDR   ↑ -> VERRA    (þyngri leikur)
   Vogtölur fittaðar á öll 5 tímabil (ridge, tests/rank-model.mjs).       */
export const RANK_W = {
  bias: 1.38487, form: 0.13805, minsPerGame: 0.01607, price: 0.28235, ffdr: -0.59359,
  minsTrend: 0.01,
};
/* form = meðalstig síðustu ~5 (FPL `form`) · minsPerGame = mínútur/leik
   · price = £m · ffdr = leikjaþyngd stöðunnar. Vantandi gildi fara í
   varfærið sjálfgildi, ekki 0, svo skorið hrynji ekki í tómi.

   minsTrend = mín/umferð síðustu 2 MÍNUS mín/umferð þriggja þar á undan
   (mínútur, um −90..+90). Þetta er EINA inntakið sem árstölur geta ekki
   gefið: `minutes/gamesPlayed` sér ekki hvort sess er að VAXA eða RÝRNA.
   Mælt á 5 tímabilum (`tests/rank-model.mjs`), vog 0,01 valin með LOSO:
     laug sem inniheldur ALLA leikmenn (verkefni tillögu-vélarinnar)
       topp-15 4,669 -> 4,735, jákvætt 5/5 tímabil, t=6,66
     laug aðeins þeirra sem SPILUÐU
       −0,008, 2/5 tímabil — ógreinanlegt, sem er væntanlegt: hafi maður
       spilað skiptir þróunin minna máli en hitt.
   Vantar merkið (preseason, eða <4 loknar umferðir) -> 0 og skorið er
   nákvæmlega eins og áður. Krefst `data/player_form.json` (pipeline).  */
export function rankScore({ form, minsPerGame, price, ffdr, minsTrend }) {
  const W = RANK_W;
  const f = Number.isFinite(form) ? form : 0;
  const m = Number.isFinite(minsPerGame) ? clamp(minsPerGame, 0, 90) : 0;
  const p = Number.isFinite(price) ? price : 4.5;
  const d = Number.isFinite(ffdr) ? ffdr : 2.5;
  const t = Number.isFinite(minsTrend) ? clamp(minsTrend, -90, 90) : 0;
  return W.bias + W.form * f + W.minsPerGame * m + W.price * p + W.ffdr * d
       + W.minsTrend * t;
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

/* ============================================================
   „ÞÚ NOTAR HANN ALDREI" — LEIKMAÐUR SEM SITUR ALLA ÁÆTLUNINA

   Beiðni notandans: þegar hann er búinn að stilla upp liðinu fyrir næstu
   5–6 umferðir og einhver leikmaður KEMST ALDREI Í BYRJUNARLIÐIÐ, á appið
   að benda á að líklega eigi að selja hann.

   OG UNDANTEKNINGIN ER KJARNI MÁLSINS, EKKI SNYRTING: ódýrasti bekkjar-
   maðurinn Á að sitja. Það er hlutverkið hans. Að selja hann losar EKKERT
   fé því ekkert ódýrara er til, svo ábendingin væri ekki bara gagnslaus
   heldur röng — hún segði „gerðu skipti" þar sem ekkert skipti er mögulegt.

   VERÐGÓLFIÐ ER REIKNAÐ, EKKI SLEGIÐ INN. Notandinn nefndi 4,0 / 4,5 og
   mælt á `players.json` í dag stemmir það nákvæmlega (GK £4,0 · DEF £4,0 ·
   MID £4,5 · FWD £4,5). En FPL færir verð á hverri nóttu og bætir við
   leikmönnum í janúar; hardkóðað gólf yrði rangt þegjandi — nákvæmlega
   sama ætt og „MEASURED: the range is 4-10" nótan sem úreltist (kafli 8).
   Gólfið er því lægsta verð sem TIL ER í stöðunni, lesið úr lauginni.

   ÞETTA ER EKKI SPÁ OG MÁ EKKI LÍTA ÚT EINS OG SPÁ. Hún les EKKERT nema
   áætlun notandans sjálfs: engin FFDR, engin vænt stig, ekkert `rankScore`.
   Fullyrðingin er „þú ætlar aldrei að spila honum", sem er staðreynd um
   áætlunina, ekki mat á leikmanninum. Þess vegna á hún hvergi heima í
   röðun (kafli 4 hafnaði DefCon í röðun af skyldri ástæðu: liður sem er
   réttur á spjaldi er ekki þar með réttur í röðun).
   ============================================================ */

/* Lægsta verð sem er TIL í hverri stöðu, í tíundum. Reiknað úr lauginni. */
export function priceFloors(players) {
  const f = {};
  /* EKKI `= []` SJALFGILDI — ThAD VER ADEINS `undefined` (lagad 18.8.2026).
     `players` i App.jsx er `useState(null)` og memo-an keyrir i HVERRI
     teikningu, svo `for (const p of null)` kastadi
     "players is not iterable" — og af thvi ad ErrorBoundary er utan um
     allt appid for notandinn beint i villuskjainn VID HVERJA HLEDSLU
     thangad til sokni lauk. Eina utgangan thar EYDIR ollu lidinu,
     fyrirlidanum, skiptaaaetluninni og chip-unum. Hvorugt profasafnid gat
     sed thetta: `data-resilience` skrifar aldrei `fpl_planner_v3` og
     `untrusted-input` gefur heilbrigd gagnaskrar — villan bjo nakvaemlega
     i bilinu milli theirra.                                             */
  if (!Array.isArray(players)) return f;
  for (const p of players) {
    const k = p?.element_type, c = Number(p?.now_cost);
    /* `c <= 0` ER NAUDSYNLEGT, EKKI VARFAERNI: `Number(null)` er 0 og
       `Number("")` er 0, badar standast `isFinite`. Einn leikmadur med
       `now_cost: null` setti golfid i 0 fyrir ALLA stoduna, sem gerdi
       undanthaguna gagnslausa OG setningu bordans osanna.               */
    if (!k || !Number.isFinite(c) || c <= 0) continue;
    if (f[k] == null || c < f[k]) f[k] = c;
  }
  return f;
}

/* ============================================================
   HVE OFT VAR HANN I XI-INU — TALA, EKKI JA/NEI (20.8.2026)
   ============================================================
   `perGw`: [{ gw, squad: [{ id, starter }] }] — hopurinn EINS OG HANN VAR
   i hverri umferd. Fra 20.8. er glugginn AFTURABAK (sja `unusedPlan` i
   App.jsx), svo thetta er saga og ekki spa.

   HET `neverStarted` OG SVARADI JA/NEI. Notandinn: „Thegar horft er til
   baka Never in your XI, teldu tha hversu oft vidkomandi er i XI. Ballard
   t.d. kannski bara 1x eda eitthvad". Hann hefur rett fyrir ser og thad er
   ekki smekksatridi: `starts === 0` er KLETTUR a versta stad. Madur sem
   var i XI-inu EINU SINNI af atta er nanast jafn seljanlegur og sa sem var
   thad aldrei — og hann var OSYNILEGUR. Talan gerir bordann lika gagnlegan
   FYRR: „0 af 2" segir naest ekkert, „1 af 3" segir eitthvad.

   HEITID FYLGDI MERKINGUNNI. `neverStarted` var ord sem lygdi um sitt eigid
   svar um leid og talan kom (sbr. `ZONE_IS` -> `ZONE_LABEL` og „Start rate"
   sem var VILLANDI, ekki bara stutt).

   HVAD TELUR SEM „I XI-INU": `s.starter` — uppstillingin sem APPID heldur,
   thad er ad segja „eg valdi hann i byrjunarlidid". ThAD ER ASETT OG ThAD
   ER EKKI ThAD SAMA og „hann spiladi": vara-innkoma (autosub) er hvergi i
   thessum gognum og appid a enga heimild um hana per umferd. Bordinn segir
   thvi „in your XI", ekki „played".

   NEFNARINN ER UMFERDIRNAR SEM HANN VAR I HOPNUM (`r.gws.size`), ekki
   gluggin. Madur sem var keyptur i GW4 af glugganum GW1-6 var ekki
   valanlegur i GW1-3, svo „0 af 6" vaeri osatt um hann; „0 af 3" er satt.
   Fyrir thann sem er i hopnum allan gluggann eru thessar tolur ThAER SOMU.

   `maxShare` OG `maxRows` ERU UI-AFMARKANIR, EKKI LIKAN — eins og
   `MIN_WINDOW`/`MAX_WINDOWS` i `buywindow.js` og verdthakid i
   `rotation.js`. Ekkert i FFDR, `rankScore` ne vaentum stigum les thau.
   1/3 er ThAR SEM LISTINN STOPPAR a skjanum; TALAN A HVERRI ROD er
   upplysingin og lesandinn dæmir sjalfur.
   Radad EFTIR NOTKUN UPP (faestar byrjanir fyrst), svo fe.             */
export function rarelyStarted({ perGw = [], byId = {}, floors = {},
                                maxShare = 1 / 3, maxRows = 5 } = {}) {
  if (!Array.isArray(perGw) || !perGw.length) return [];
  const last = perGw[perGw.length - 1];
  const lastIds = new Set((last?.squad || []).map(s => s?.id).filter(v => v != null));
  const seen = new Map();          // id -> { gws:Set, starts }
  for (const { gw, squad } of perGw) {
    for (const s of squad || []) {
      if (!s || s.id == null) continue;
      const r = seen.get(s.id) || { id: s.id, gws: new Set(), starts: 0 };
      /* TALID A EINKVAEMUM UMFERDUM, EKKI FAERSLUM (lagad 18.8.2026).
         Adur var `r.gws++` per fardu i hopnum, svo leikmadur sem var
         KEYPTUR TVISVAR og seldur tvisvar nadi `gws === perGw.length`
         thott hann vaeri fjarverandi i fyrstu OG sidustu umferd
         gluggans — og var thvi flaggadur sem "aldrei notadur" thott
         aaetlunin seldi hann thegar.                                   */
      r.gws.add(gw);
      if (s.starter) r.starts++;
      seen.set(s.id, r);
    }
  }
  const out = [];
  for (const r of seen.values()) {
    /* VIDMIDID ER SIDASTA UMFERD GLUGGANS, EKKI FULL THEKJA.
       Gamla reglan (`gws < perGw.length` -> sleppa) atti ad utiloka thann
       sem er A FORUM, en hun utilokadi lika thann sem er AD KOMA — og
       "thu aetlar ad KAUPA hann og aldrei spila honum" er verdmaetasta
       utgafa thessarar abendingar. Maelt: kaup i GW1 + bekkur = flaggad,
       nakvaemlega somu kaup i GW2 = THOGN. Ny regla: hann verdur ad vera
       i hopnum i SIDUSTU umferd gluggans (sa sem er seldur er thad ekki)
       og hafa verid thar i minnst tveimur umferdum (ein umferd er ekki
       vitnisburdur um "aldrei").                                       */
    if (!lastIds.has(r.id)) continue;
    if (r.gws.size < 2) continue;
    /* UI-AFMORKUNIN (sja hausinn): hann er nefndur adeins ef hann var i
       XI-inu i ThRIDJUNGI umferdanna eda sjaldnar. `>` og ekki `>=` svo
       „2 af 6" komist inn — nakvaemlega thridjungur er enn sjaldan.    */
    if (r.starts > r.gws.size * maxShare) continue;
    const p = byId[r.id];
    if (!p) continue;
    const price = Number(p.now_cost);
    /* OMAELD TALA FAER ENGA ABENDINGU: `now_cost` sem er ruslstrengur gaf
       `freesTenths: NaN` og bordinn prentadi "frees up to £NaN".        */
    if (!Number.isFinite(price) || price <= 0) continue;
    const floor = floors[p.element_type];
    /* VITUM VID EKKI GOLFID GETUM VID EKKI BEITT UNDANThAGUNNI — og an
       hennar vaeri abendingin "losar £0,0", tillaga an tilgangs.        */
    if (floor == null) continue;
    if (price <= floor) continue;   // odyrasti bekkjarmadur: ekkert losnar
    out.push({ id: r.id, gws: r.gws.size, starts: r.starts, freesTenths: price - floor });
  }
  /* MINNST NOTADUR FYRST — thad er spurningin sem bordinn svarar. Fe er
     onnur rod (og var su fyrsta medan svarid var ja/nei).               */
  return out
    .sort((a, b) => a.starts - b.starts || b.freesTenths - a.freesTenths || a.id - b.id)
    .slice(0, maxRows);
}
