# HANDOVER — NFL appið (`nfl/`), 15.8.2026 (v2)

Þú tekur við eftir stóra lotu 14.8.: h2h-lab, DST-lab + streymi í loftið, fimm
dagsettar gagnaseríur byrjaðar, usageblend-leiðréttingarnar kláraðar, og
flex-úthlutunin löguð með fullri endurmælingu. Reglur óbreyttar: README fyrst
(nýir kaflar 4b-2, 4k, 5n), tölur mældar, walk-forward, per-leikmanns bootstrap
er ráið, mutate-aðu hverja lagfæringu. Fullkeyrsla 15.8.: **öll 23 prófasöfn
græn** (visual sleppt án Chrome — keyrðu hana lókalt).

**Tímapressa: Sleeper-draftið er 21.8.** Vikuspár-glugginn opnast ~6.9.

---

## 0. FYRST: stór staged-breyting er ÓCOMMITTUÐ og því ÓPUSHUÐ

Í vinnutrénu bíða staged: `model.js` (Hamilton-úthlutun flex-sæta + `flexPos`
virt), `rulebasis.js` (HALF_LAB 10-liða: 186,1/182,9/158,6), `vbdbase-lab`
(zeroSlot-blokkin nú afturfarar-VÖRÐUR með `stillPresent`), `tests/model.mjs`
kafli 8b (72+9 lagnir, kvóta-invariant, legacy-fall, fimm stökkbreytingar),
README 4b-2, og endurgerðu measure-skrárnar (shapes, half, ecr_duel, opp,
shrink, vbdbase, agecurve, waiver). Ég fór yfir diffið í heild: **rétt unnið**
— summu-invariant falsanlegt, endurnormölun flexPos skjalfest sem varfærin
nálgun, 12-liða deildin bitaeins. Tvennt áður en þú committar:

1. **Ósamræmi milli measure-skráa:** `data/measure/h2h.json` ber
   `shapeGuard.legacyDrift` sem segir „waiver.json 30 vs hér 29" — en
   waiver.json var endurgerð EFTIR að h2h keyrði. Endurkeyrðu h2h-lab (eða
   a.m.k. shapeGuard-hlutann) svo skrárnar tvær beri sama WR-þrep, eða
   annotaðu driftið sem sögulegt. Tvær measure-skrár sem stangast á um
   varamanns-þrep deildar notandans mega ekki fara inn þannig.
2. Keyrðu `npm test` þrisvar og committaðu ALLT saman (kóði + measure + README)
   í einni færslu — skrárnar eru borin saman við diskinn í prófunum og hálft
   commit fellir þau.

---

## A. Nýjar villur og ósamræmi í 14.8.-vinnunni (öll sannreynd)

**A.1 DST-stigagjöfin er aftur lokaður hringur — og README fullyrðir annað.**
`dstPoints`/`dstBracket`/`dstPointsAllowed` (`scoring.js:279/314/337`) og
`dstRulesFromSettings` (`sleeper-league.js:348`) hafa **núll kallendur í
`src/`** — aðeins lab og próf. `README.md:899` segir „appið les reglurnar úr
deildinni (`dstRulesFromSettings`) og notar `BASE` aðeins þegar deildin nefnir
regluna ekki — og segir þá frá því (`missing`)" — appið gerir ekkert af þessu;
`missing`/`unmodelled` ná aldrei á skjá. Streymið sjálft ER víra (Dashboard,
gated á `league.starters.DST`) en verðlagning DST-manna í waiver/MyTeam er ekki
til. *Verk:* annaðhvort víra `dstRulesFromSettings` + `missing`-viðvörun þar
sem DST birtist (Patriots-deildin) eða leiðrétta README-setninguna — og vörður
í `tests/dst.mjs` §9-stíl sem fellur ef hvorugt er satt.

**A.2 `fetch-nfl.mjs:650` — athugasemd fullyrðir mælingu sem eigin úttak
afsannar.** „`normPos` skilar null fyrir RCB/LDE ... sían væri engin aðgerð" —
en `normPos` (`scoring.js:386`) skilar `s` óbreyttu fyrir óþekktar stöður, og
`data/depth/2026-08-14.json` ber `rowsBeforePosFilter: 3228` → 975 eftir síu:
**sían fellir 2.253 raðir (70%)**. README 7b hefur þetta rétt; skjölin tvö
stangast á í sömu lotu. Lagaðu athugasemdina (og `: null`-fullyrðinguna í henni).

**A.3 Stale talning í prósa:** `scoring.js:81` og `README.md:891` segja
Sleeper-sjálfsmisræmið „195 raðir, 43 ólíkar, 152 eins" — akkerið fimm línum
neðar (`DST_ANCHOR.sleeperSelfDisagreement`) og `measure/dst.json` segja bæði
**agree 160 / differ 49** (n=209). Prófið les aðeins vélsviðið, svo prósinn er
óvarinn — nákvæmlega „athugasemd sem ekkert próf getur fellt".

**A.4 `trending/` er eina dagsetta serían sem fylgir EKKI writeOnce-reglunni.**
`fetch-nfl.mjs:374` yfirskrifar sama dags skrá viljandi („keyrsla sama dags
yfirskrifar sjálfa sig") meðan nýja kenningin (`:249`) bannar það. Raunverulegt:
14.8. keyrði core tvisvar (09:53 og 21:19) og seinni 24h-glugginn yfirskrifaði
þann fyrri undir sama nafni — gögn glötuð. *Verk:* ákveddu eina stefnu; ef
báðir gluggar eiga að lifa, lykla á tíma (t.d. `2026-08-14T0953.json`) eða
writeOnce + sér kvöldskrá. Skjalað hvor leiðin varð fyrir valinu.

**A.5 Smærri, ein lota:**
- `weekly-ecr/2025-12-30.json` ber `"season": 2026` á viku-17-2025 gögnum —
  skráarnafnið var lagað (scrapeDate), sviðið ekki (`fetch-nfl.mjs:588`).
- `nflverse.mjs:276` — nýja depth-skemað setur `pos_grp` í svið sem heitir
  `formation` („Special Teams" á kicker); lab sem joinar á formation þvert á
  skema-tímabil ber saman tvo ólíka hluti. Endurnefna eða skjala í röðinni.
- `fetch-nfl.mjs:1049` — snap-merge ver 404 en EKKI hálfa skrá: þröskuldur
  `byKey.size < 100` er ~1,5% af væntu magni; hálf skrá skrifar null yfir
  ~6.400 raðir. Hækkaðu í hlutfall af fyrra ári.
- `accuracy.js:296` — `list[i] ? list[i].pts : 0` gefur NaN ef `pts` vantar á
  hlut (gamla hegðunin gaf 0); og `:288` `by ?? pts`-fallbackið er dulinn
  hindsight-leki ef selectBy skilar null fyrir SUMA. Hvorugt nåanlegt frá
  núverandi köllurum — pinnaðu bæði í `tests/accuracy.mjs` §5b.
- `usageblend.js:899` — `PRIOR_FIT_SCALE` enn dautt export (þriðja handover).
- Status-göt: nýju seríurnar skrifuðu ENGAR `archive:*`-línur í lifandi
  `status.json` nema adp-history (news/depth/weekly-ecr skrifuðust 14.8. án
  þess að status-keyrslan varðveittist) og `snap_merge`-lína er ekki til.
  Today-vörðurinn í `pipeline.mjs` nær aðeins yfir trending. *Verk:* today-
  vörður fyrir allar fimm seríurnar á tímabili + status-lína per seríu per dag.

---

## B. Klára það sem er hálfnað (röð skiptir máli)

**B.1 `stageHistory` hefur ekki verið endurkeyrt eftir snap-merge.**
`mergeSnapCounts` er skrifað og kallað — en `data/weekly/2025.json` er bitaeins
frá 9.8. og ber engin `snaps`/`snapPct` svið. Keyrðu
`node scripts/fetch-nfl.mjs --stage=history`, staðfestu sviðin (og A.5-
þröskuldinn fyrst), skrifaðu `snap_merge`-status. **Þetta opnar snap-útgáfu
handcuff-mælingarinnar** („ódýrasta einstaka bætingin") og snap-feature-probe.

**B.2 TD-props er eina heimildin af sjö sem enn er ókallað.**
`tdProps` (`espnodds.mjs:152`) — bókmakarar verðleggja dögum fyrir leik, svo
writeOnce-sería `td-props/{date}.json` þarf að vera tilbúin í byrjun september.
Sama snið og hinar fimm; today-vörður frá viku 1.

**B.3 Draft-kvöldið 21.8.:** mock-draft generalprufa (pollunin hefur aldrei
keyrt í alvöru drafti); F13-stökkbreytingarnar fimm (survivalProb-continuity,
adpSd, expectedBestAt-gólf, myRosterId, FLEX í fixedSlotNeeds) fengu enn engin
próf; `Reset` slítur nú draftinu (lagað 13.8.) — prófaðu í vafra; staðfestu að
nýju HALF_LAB-tölurnar (186,1) birtist rétt í ImportedRules eftir commit 0.

**B.4 usageblend-vírunin** (óbreytt frá fyrra handoveri, nú með hreinum
grunni): (a) láttu usage-lab skrifa `accFit`-stuðlana (4×2 tölur) í
measure/usage.json, bókaðu + pinnaðu; (b) pípan skrifar `weekly/2026.json` á
tímabili; (c) vírun í weekview á Bayes-kúrfunni — verður ~núll til viku 5–6.
ROS-gjaldmiðillinn (+13,6, t 3,33, 7/7 eftir endurmælingu) fylgir sömu lögn og
MUNDU: gólfið hlutfallast þá á vikur-eftir (mælt +7,1 [3,8·10,0] annars).

---

## C. Næstu mælingar — með h2h-niðurstöðuna í huga

h2h-lab svaraði stóru spurningunni og svarið var **núll með gildi**: sigrar og
stig raða nánast eins (rho 0,961–0,989, yfir sjálfsáreiðanleika), A-Ranking
vinnur á sigrum í 4/4 lögnum, meistaraprósenta ber ekki merki en „komast í
úrslitakeppni" gerir það. **Ekki fjárfesta meira í sigra-metríkinni sem slíkri**
— stiga-harnessið var fullnægjandi allan tímann. Það sem OPNAÐIST samt:
primitívurnar (`roundRobin`, `simulateSeason`, `playoffChampion` í
`accuracy.js`) gera næstu tvö lab ódýr:

**C.1 `winprob-lineup-lab`** — vikuval á P(sigur) þegar væntur munur við
mótherja er stór (undirdogg → þak, yfir → gólf). Val alltaf ex ante, dreifingar
úr fyrri vikum, talið í sigrum; risk-lab-varnaglinn í hausnum. Þetta er eina
H2H-spurningin sem stig-metríkin getur EKKI svarað per skilgreiningu — og hún
er ómæld enn.

**C.2 `stream-lab` fyrir QB/TE/K** — DST-streymið mældist +3,82 (t 5,75, 6/6)
gegn placebo +0,26 og er í loftinu; sama spurning fyrir hinar stöðurnar með
kicker-lab-grunninn (K r=0,15 ár-í-ár) og vikuspár-seríuna þegar hún safnast.

**C.3 Snap-handcuff og snap-probe** eftir B.1; trending-lab harness (safnið á
nú 4 daga órofið) tilbúið fyrir janúar; stash-lab þegar meiðslasagan tengist.

## EKKI gera (viðbætur 14.8. við mælt-og-fellt)
Season-röðun varna (−0,82 á waiver-laug, blöndun KOSTAR 3,82→1,92) · „heit
vörn" (r 0,049) · yds-bónusar · meistaraprósenta sem metrík · allar 37
stefnurnar gegn BPA á sigrum (allar marktækt negatífar) · og allt af gamla
listanum (defweek, mktweek, tiebreak, shrink, agecurve, vbdbase-afbrigði,
room, minGain-hreyfingin — athugið: flex-lagfæringin FÆRÐI minGain-hliðið yfir
t>2 í 10-liða en README 4g tekur það í sundur; sú höfnun stendur).

Keyrðu `npm test` þrisvar, `npm run build`, committaðu staged-lotuna FYRST
(kafli 0), og skráðu hverja mælingu í README — líka þær sem falla.
