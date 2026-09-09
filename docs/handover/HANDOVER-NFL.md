# HANDOVER — NFL appið (`nfl/`), 13.8.2026

Þú ert að taka við NFL-hluta Fantasy-repo-sins eftir mjög afkastamikla lotu 12.–13.8.
Lestu `nfl/README.md` FYRST (kaflar 3–5 og 4b–4e eru mælingasagan) og
`nfl/AUDIT-2026-08-12.md`. Reglurnar eru þær sömu og í `CLAUDE.md`: tölur mældar,
ekki valdar; walk-forward alltaf; mælikvarðinn er ákvörðunin (draft-einvígi /
vikustig), ekki fylgni; per-leikmanns bootstrap er nú lágmarksrán (README 4c);
einhliða spurning þarf einhliða þröskuld (README 4e); ekkert í `src/` án varðar.
Allt keyrt inni í `nfl/`: `npm ci && npm test && npm run build`.

**Tímapressa:** Sleeper-draftið er 21.8 — fyrsta raunprófun lifandi pollunar og
innflutnings. Vikuleg gögn án sögu byrja að glatast STRAX (sjá D).

---

## 0. Fyrst: ócommitaðar breytingar í vinnutrénu

`nfl/src/rulebasis.js` + `nfl/tests/rulebasis.mjs` eru breytt en ekki committuð
(einu skrárnar; annars er main = origin/main). Breytingin er góð og sjálfstæð:
`scoringKeyOf` skilar nú `null` í stað þess að default-a á `"ppr"` — óþekkt
stigagjöf hefði annars fengið +188,0 „mælt" úr PPR-töflunni undir eigin nafni —
og `T_CRIT` er orðin ára-vísitöfluð. Prófið prófar báðar áttir rétt.
**Verk:** (1) lagaðu fylgivilluna í `rulebasis.js:218–221` áður en þú committar:
þegar nýja null-slóðin logar segir `edgeSentence` „This league SHAPE has not been
backtested" — en það er STIGAGJÖFIN sem er óþekkt, lögunin getur verið fullmæld;
láttu setninguna nefna rétta orsök. (2) Keyrðu `node tests/rulebasis.mjs` og
`npm test`, committaðu hvort tveggja saman.

---

## A. Villur og ósamræmi að laga (allt sannreynt í kóðanum)

**A.1 `usageblend.js` ber ÞRJÚ afrit af afturkölluðum tölum og eitt rangt akkeri —
nákvæmlega villuklasinn sem SHIPPED/HEADLINE-skiptingin var búin til gegn:**
- `:322` — `USAGE_BLEND.note` segir „(+12.3/+12.1/+9.0 pp)" fyrir w10–18; 12,1 er
  HEADLINE-hólf half (const0.5) en ekki SHIPPED-armurinn; rétt þrenna úr eigin
  `bins` skránnar er **+12.3 / +10.2 / +9.0** (`:112/:133/:148`).
- `:379–380` — `rejected.constantWeight.note` ber enn „3.9-8.1" og „11.4-20.1" sem
  `:187–198` í SÖMU skrá leiðréttir („4.6-9.4" og „21.1-25.6").
- `:31–32` — þriðja afritið af sömu úreltu tölum í hausnum.
- `:260–282` — `deadClaim`/`deadBasis` („constant blending IS harmful in w1–4",
  grunnur `DEAD_GAMES: 4`) er fest við `ptsPG`-arminn, en shipped-armurinn er
  `opp_prior`. Undir `opp_prior · last3` er const0.5 í w1–4 JÁKVÆTT í tveimur af
  þremur sniðum (ppr −3,9 t −1,1 · half +2,0 · std +4,2). Endurakkeraðu
  fullyrðinguna við shipped-arminn — eða endurmældu dauða svæðið á honum og
  uppfærðu `deadMeasured` í samræmi.
- `tests/usageblend.mjs:871–875` — vörðurinn fyrir afturkölluðu strengina les
  AÐEINS `CURVE.deadBasis`; láttu hann skanna `JSON.stringify(USAGE_BLEND)` (og
  helst skrártextann) svo `:31` og `:379` sjáist. Prófið `:845–849` les líka
  `ptsPG`-slóðina — sama endurakkeri þar.

**A.2 Waiver-skýringin á skjánum lýgur um orsök (F23 hálfklárað).**
`Dashboard.jsx:690`: neðanmálið segir að ógrænar raðir hvíli m.a. á gain-gólfinu —
en hver birt röð er ÞEGAR komin yfir gólfið (`waivers.js:373` síar fyrst) og
`confidenceOf` (`waivers.js:464–482`) prófar það viljandi ekki. Sama villa í
vélalæsilegu sviði: `WAIVER_CAL.confidence.value` (`waivers.js:139`) byrjar á
„gain >= minGain AND …" sem `confidenceOf` útfærir ekki. Lagaðu bæði + próf sem
ber `confidence.value` saman við raunverulegu skilyrðin.

**A.3 README-drift sem myndi láta næstu lotu endurtaka unnin verk:**
`nfl/README.md:381` og `:473` fullyrða bæði að `data.js` vanti `loadWeekly` — hún
er til (`data.js:132`) og `waivers.js:112–114` segir það réttilega. Uppfærðu bæði;
kafla-4e þriggja skrefa planið á að sýna skref (2) klárað.

**A.4 F8 er bara hálf-lokað.** `tests/dashboard.mjs:749–763` prófar
`weeklyEdgeNote("ppr")`/`("half-ppr")` sem föll — ekkert les RENDRAÐA per-deildar
kortið, svo stökkbreytingin `weeklyEdgeNote(scoring)` → `weeklyEdgeNote("ppr")` í
`Dashboard.jsx:398` lifði enn af. Bættu DOM-prófi í `tests/dashboard.mjs` sem
krefst 2,860 (ekki 3,482) á half-kortinu.

**A.5 Dautt smælki (F25-afgangur):** `scoring.js:161` endar á
`? s : s` (báðar greinar eins); `usageblend.js:694` exportar `PRIOR_FIT_SCALE` með
núll kallendur. Hreinsa með mutate-staðfestingu.

**A.6 Trending-safnið gæti verið með gat.** `data/trending/` ber aðeins
2026-08-11 og 2026-08-12 — engin skrá 13.8. þrátt fyrir 09:00 UTC cron.
Endapunkturinn er skjalfest ÓENDURSKAPANLEGUR (24 klst gluggi). Athugaðu strax
hvort nfl-data keyrslan 13.8. fór af stað (gh run list), af hverju skráin vantar,
og bættu verði í `pipeline.mjs`: á tímabilinu ágúst–janúar fellur byggingin ef
dagsins skrá vantar eftir 10:00 UTC.

---

## B. Fyrir draft-kvöldið 21.8

- **Generalprufa á lifandi drafti:** mock-draft í Sleeper gegn appinu — pollunin
  (`draft-sync.js`, POLL fast/slow) hefur aldrei keyrt í alvöru drafti; F13-stökk-
  breytingarnar fimm (survivalProb, adpSd, expectedBestAt-gólf, myRosterId,
  FLEX í fixedSlotNeeds) fengu enn engin próf — bættu þeim við fyrst.
- **`draft_order` er null þar til dregið er** — sætin á skjánum eru hópsæti úr
  `slot_to_roster_id`; staðfestu að viðvörunin um það birtist enn og að smellur á
  eigið lið haldist eftir refresh (localStorage-villan sem var löguð 12.8).
- **`replacementRanks` tvær skráðar veilur** (README 4b): flex-sæti með
  `Math.round` PER stöðu summast ekki (10-lið 2FLEX fær 21 sæti fyrir 20; 14-lið
  27 fyrir 28) og `league.flexPos` er hunsað (FLEX_SPLIT harðkóðuð RB/WR/TE).
  Viljandi ólagað því lagfæring ógildir `shapes_sleeper.json`/`half.json`. Taktu
  MÆLINGUNA fyrir draft: keyrðu shape-lab/half-lab með leiðréttri sætadreifingu og
  berðu saman — ef röðin hreyfist ekki er skjalað að veilan sé meinlaus; ef hún
  hreyfist þarf ákvörðun fyrir 21.8.

---

## C. Víra mældu vinningana (þeir bíða tilbúnir)

**C.1 `usageblend` — eina stóra JÁ-ið úr lab-lotunni (+6,4/+8,6/+7,1 pp ofan á
startsit, per-leikmanns CI útiloka núll, placebo-þak slegið).** Vantar tvennt sem
skráin nefnir sjálf (`usageblend.js:369–372`): (a) mapping-stuðlarnir eru ekki til
á diski — láttu `usage-lab.mjs` skrifa `accFit(priorAcc, pos, opp, last3)` (4
stöður × 2 tölur) í `data/measure/usage.json`, bókaðu og pinnaðu með prófi eins og
allt annað; (b) pípan þarf að skrifa `data/weekly/2026.json` yfir tímabilið
(`loadWeekly` er þegar til appmegin). Vírun í `weekview.js` á Bayes-kúrfunni
(K=10, dautt svæði fyrstu vikur — sjá A.1 um endurakkerið) — og verður ~núll fram
í viku 5–6, sem er rétt.

**C.2 ROS-gjaldmiðillinn í waiver (+13,2 stig/tímabil, t 2,97, 17/18 hólf).**
Bókað í `waivers.js:95–118`, óvíranlegt fyrr en vikur-eftir eru til. Sama plumbing
og C.1 þjónar báðum. MUNDU skilyrta niðurstöðu sem verður að fylgja
(`waivers.js:133–137`): með ROS-gjaldmiðli byrjar FAST gólf að skaða — gólfið á að
hlutfallast við vikur sem eftir eru.

**C.3 `prevCarG` (opp-lab) og handcuff-niðurstaðan:** hvort tveggja stendur skjalað
sem EKKI-vírað og á að standa þannig — verðirnir sem felldu þau sem breytingu eru
raktir í README 4d. Ekki endurvekja án nýrrar mælingar.

---

## D. Gagnasöfnun sem glatast ef hún byrjar ekki NÚNA (ódýrasta vinnan, mest virði)

Öll fimm wrapper-föllin eru skrifuð og ónotuð — vantar bara kall + dagsetta skrá +
`minRows`-vörð + status-línu (breyttu ENGU í röðunum sjálfum):
1. **Sleeper VIKUSPÁR** — `sl.projections(season, week)` (`sources/sleeper.mjs:96`)
   er aldrei kallað með viku; `weekview.js:250` ber enn viðvörunina um season/17.
   Skrifaðu `data/weekly-proj/{season}-w{week}.json`, aldrei yfirskrifað eftir á.
2. **Snap counts inn í `data/weekly/`** — `nflverse.snapCounts` (`sources/
   nflverse.mjs:153`); handcuff-lab nefnir þetta orðrétt sem „ódýrustu einstöku
   bætinguna á mælinguna". pfrId-brúin er þegar til.
3. **Frétta-archív** — `news.json` er rúllandi 50-greina gluggi; handcuff-lab
   nefnir þetta sem blokkina fyrir allri „er hann að koma til baka?"-hliðinni.
   Dagleg dagsett skrá eins og trending.
4. **FantasyPros weekly ECR** — `WEEKLY_MIRROR` (`sources/fantasypros.mjs:259`),
   exportað, núll kallendur. (Per-scoring ECR er hins vegar komið — vel gert.)
5. **FFC half-PPR ADP dagsett** — `adp.json` er endurskrifað daglega; dagsett
   snapshot í ágúst–september er fyrsta árið í seríunni sem eyðir ppr/std-bilinu
   sem þrjú lab stranda á. Plús: **TD-props** (`espnodds.mjs:152`) kveikt þegar
   bókmakarar byrja að verðleggja í september.
Og: **`depthCharts`** (`nflverse.mjs:172`) fyrir bakprófanlega dýptarsögu.

---

## E. Næstu mælingar (eftir A–D)

**E.1 `h2h-lab` — stærsta ómælda spurningin.** Ekkert í repo-inu mælir VIÐUREIGNIR:
öll met eru stig. Útvíkkaðu hermunarharnessið í fulla deild með vikudagskrá og
úrslitakeppni í vikum 15–17; metrík = vikusigrar og meistaralíkur; núllpróf = borð
gegn sjálfu sér verður að gefa nákvæmlega 50%. Endursannreyndu fyrst A-Ranking vs
ADP og efstu stefnurnar úr `strategy_ppr.json` á nýja mælikvarðanum — víxlist engin
röð er það líka svar (sama hlutverk og weekly-lab hafði fyrir summuna).

**E.2 `winprob-lineup-lab`** (krefst E.1): þegar liðið er undirdogg vikunnar, borgar
sig að stilla upp á þak frekar en gólf? Dreifingar metnar úr FYRRI vikum, val alltaf
ex ante (risk-lab varnaglinn um fullkomna vitneskju vitnaður í hausnum), talið í
sigrum. Engin ný gögn.

**E.3 DST-stigagjöf úr gögnum sem eru þegar sótt:** `teamWeekly` ber `def_sacks`/
`def_interceptions` (mappað, ónotað) og `def_tds` (sótt, ekki mappað);
points-allowed er í `schedule.json`. Byggðu `dstPoints()`, akkeraðu gegn birtum
Sleeper-DST-stigum 2025 (sama tvíleiða-akkeri og 6b) — opnar DST-röðun og streaming
fyrir Patriots-deildina. Kicker-hliðin á sér þegar lab (r=0,15 ár-í-ár = streaming-
rök). Streaming-labið sjálft þarf D.1.

**E.4 Skuggabókhald frá viku 1** (hliðstæða FPL-ledgersins): vikuleg færsla per
deild — hvað ráðlagði appið (lineup/waiver), hvað var gert, hvað skoraði hvor leið
(`benchRegret` er til). Eina prófið á keðjunni í beinni; verður ekki búið til
eftir á.

## EKKI gera (mælt og fellt 12.–13.8 — sjá README og data/measure/)
defweek-yfirlagið (0/2700 gegn placebo; mótherjaleiðrétting SKAÐAR í half) ·
mktweek/game-script (þjóðsagan öfug; 12/12 CI innihalda núll) · tiebreak á
lifunarlíkur (t −0,06) · shrink-fjölskyldan öll (0/36) · aldurs/reynslukúrfur
(Sleeper hefur þegar verðlagt aldur) · vbdbase-afbrigðin (0/153 per-leikmanns) ·
room-analýsa (winnerChanges: false) · minGain-gólfið (ÓMÆLANLEGT innan ±1,8 stiga —
10 stendur sem val, ekki mæling) · „skoraði vel í fyrra viku" sem pickup-merki
(eitrað: −11,8 QB við endurkomu) · avail-taflan (giskaða taflan stendur; practice
status +0,44 pp t 0,61; líkamshluti nei).

Að lokum: `npm test` (22 svítur) þrisvar, `npm run build`, mælingar skráðar í
README með sama sniði og fyrri kaflar — líka þær sem falla.
