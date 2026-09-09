# HANDOVER — FPL appið (rót repo-sins), 13.8.2026

Þú ert að taka við FPL-hluta Fantasy-repo-sins. Lestu `CLAUDE.md` FYRST og fylgdu því
í hvívetna: tölur eru mældar, ekki valdar; NULL er ekki núll; ómæld tala sem lítur út
eins og mæling er versta útkoman; mutate-aðu hverja lagfæringu (afturkallaðu og
staðfestu að vörðurinn falli); `git pull --rebase` alltaf fyrst (fast-cron committar
`data/` á 30 mín fresti); `git add <skrár>`, aldrei `-A`; prófin þrisvar og
`npm run build` grænt fyrir push. `docs/MAELINGAR.md` §4 og CLAUDE.md §4 eru listinn
yfir mælt-og-fellt — leggðu EKKERT þaðan til aftur.

**Tímapressa:** GW1-deadline er 21.8.2026 kl. 17:30 UTC. Hluti B verður að vera
kláraður fyrir þann tíma. Byrjaðu samt á A.1 — hún er lifandi bilun í pípunni núna.

Sannreyndu fyrst að allt sé grænt áður en þú breytir nokkru:
```
npm ci && npm test && npm run build
cat data/status.json | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>Object.entries(JSON.parse(d).sources??JSON.parse(d)).forEach(([k,v])=>v.ok===false&&console.log('RAUTT:',k,v.note)))"
```

---

## A. Lifandi villur — laga strax

**A.1 `scripts/fetch.mjs:~2775` — `last_gw` er dautt, staðfest með repro.**
`const parsed = parseCSVQuoted(text).rows.filter(...)` — en `parseCSVQuoted` skilar
FYLKI (það er `parseCSV` sem skilar `{header, rows}`). `.rows` er `undefined`,
`.filter` kastar, `try/catch` gleypir, lykkjan gengur g=38→1 til einskis og endar á
`record("last_gw", false, 0, "no gameweek file in the mirror for 2025-26")` — sem er
nákvæmlega rauða línan í `data/status.json` núna. Athugasemdin FYRIR OFAN línuna
skjalar að skipt var yfir í `parseCSVQuoted` vegna gæsalappa-kommu-villu — fixið
skipti um þáttara en skildi `.rows` eftir. Aukaverkun: 38 tilgangslaus köll á
raw.githubusercontent í hverri dagskeyrslu, og `fetchEspnShots` les `last_gw.json`
sem er frosið á 11.8.
*Lagfæring:* `parseCSVQuoted(text).filter(r => r.element)`. Berðu saman við rétta
notkun í `deriveImminent` (~línur 3400, 3435). *Vörður:* próf sem keyrir
`buildArchiveGwReport` á raunverulegu CSV-broti og krefst `ok: true` + >0 raða;
staðfestu að það falli með `.rows` aftur inni.

**A.2 `src/stats.js:1647–1648` — markmenn fá mó/aó, sem er skjalfest sem ómögulegt.**
Þegar enrichment var miðlað í `makeEnricher` (8.8.) týndist vörðurinn sem er enn í
`App.jsx:1519` (`p.element_type !== 1`). 17 markmenn bera nú `_mo`/`_ao` í
leikmannatöflunni og stigatöflunni — átta þeirra sýna bókstaflega `0.0`, „ómælda
talan sem lítur út eins og mæling". Nótur dálkanna segja sjálfar „goalkeepers never
get it".
*Lagfæring í tveimur lögum:* (1) settu GK-vörðinn í `makeEnricher`; (2) rótarorsökin —
`mo`/`ao` í `STAT_DEFS` bera enga `pos`-takmörkun OG `PlayerList.jsx:78` virðir
`def.pos` ekki (predicate-ið `!d.pos || d.pos.length` er satt fyrir allt). Bættu
`pos: [2,3,4]` á mó/aó og láttu PlayerList sía eftir `def.pos` eins og
`buildLeaderboard` gerir (`stats.js:781`). *Vörður:* próf sem telur markmenn með
`_mo != null` og krefst 0 — og fellur ef vörðurinn er tekinn út.

**A.3 `src/Compare.jsx:231,245` + `advisor.js:256` — tveir af fjórum context-þáttum
ráðgjafans eru DAUÐIR í framleiðslu, prófin græn af því þau smíða inntakið sjálf.**
(a) `defcon?.players?.[p.id]` flettir upp í FYLKI eftir sæti (röð 5 tilheyrir sjötta
manni í skránni) og `defcon_opportunity` er ekki einu sinni til á leikmannaröðum —
það býr á `defcon.opportunity[TEAM_ID]` (`stats.js:1656` les það rétt). `dc` er því
`null` að eilífu. (b) `p.bigChances` er hvergi sett af neinum framleiðslukalla —
gögnin eru samt þegar til (`_b_big` úr BSD, `stats.js:1669`).
*Lagfæring:* láttu `Compare.jsx` byggja inntakið úr sömu leiðum og `stats.js` notar
(`dcById[p.team]?.defcon_opportunity`, `_b_big`). *Vörður:* wiring-próf í anda
`tests/wiring.mjs` en á SVIÐ, ekki skrár: hvert svið sem `contextFactors` les verður
að vera framleitt af raunverulegum kalla í `src/` — það hefði gripið báðar.

**A.4 `src/model.js:840` — tvær mótsagnakenndar reglur um óþekktar spilunarlíkur.**
`availForKickoff`: `(p?.chance_of_playing_next_round ?? 0)` — en `App.jsx:1573–1580`
skjalar hina MÆLDU ákvörðun: null = „veit ekki" = 0,5, ekki útilokun. Maður með
status "d" og `chance: null` fær 0 vænt stig á vellinum, í `transferNet` og í
rótasjónpörun — en 50% í tillögulistanum við hliðina. Dormant í dag (allir 70
óheilbrigðir bera tölu) en App.jsx-athugasemdin er fyrstu-handar sönnun þess að FPL
skilar null á tímabili.
*Lagfæring:* samræmdu á 0,5-regluna í `availForKickoff`. *Vörður:* próf með
`{status:"d", chance: null}` — ekkert tilfelli í `tests/model.test.mjs:408–437`
prófar null-slóðina í dag.

**A.5 `src/stats.js:1578,1608,1624` — `makeEnricher` hrynur á rangt-týpuðum valkvæðum
skrám.** Lofar seiglu og á `rowsOf` til þess — en notar það bara fyrir `imminent`.
`shotsFile.players = {}` / `defcon.players = {}` / `bsd[0].players = {}` kasta öll
(staðfest með repro) og enda í ErrorBoundary. `tests/data-resilience.mjs` prófar
16 spillingar en EKKI þessa lögun (hlutur þar sem fylki á að vera).
*Lagfæring:* `rowsOf` á allar þrjár. *Vörður:* bættu „object where array expected"
við data-resilience fyrir allar valkvæðu skrárnar.

**A.6 Smærri, öll með sama sniði (skjalað ósamræmi):**
- `scripts/fetch.mjs:44` — `FLAGS.espn` er skilgreint og ALDREI notað;
  `fetch.yml` setur `ENABLE_ESPN: "false"` og ESPN er sótt samt (undir
  `FLAGS.derived`). Annaðhvort víra eða eyða báðum megin; víkkaðu
  `tests/workflow-push.mjs` (síar á `/_KEY$/` í dag) yfir `ENABLE_*`.
- `scripts/fetch-team-shots.mjs:216` — eina sækjuskriftan án tóm-skrifa-varðar;
  hinar sex hafa hann allar, með athugasemd.
- `scripts/fetch.mjs:2125,2192` — `bsd_live.json.shots` er skrifað `[]` að eilífu en
  nótan í skránni lofar „The app reads players/shots". Fjarlægðu sviðið eða fylltu.
- `scripts/pros-collect.mjs:236/263/303` — control-hópurinn er sóttur (~300 köll á
  umferð) og HENT fyrir GW1: `agg.control` er sett EFTIR `writeJSON` og
  endurskrifin er skilyrt á `__outcomeAdded` sem krefst fyrri umferðar. Panel-tölur
  án viðmiðs eru merkingarlausar — lagaðu fyrir 21.8.
- Doc-drift: CLAUDE.md §3 segir `rankScore`/`RANK_W` búa í `stats.js` (þau eru í
  `model.js:896/915`); CLAUDE.md:816 vísar í `tests/saved-state.mjs` sem er ekki til
  í FPL (bara nfl/); `stats.js:87` „7 flokkar" (eru 6); „108 dálkar" á tveimur
  stöðum og „102 lyklar" í CLAUDE.md (eru 124); `LG_XG`=1,45 skilgreint tvisvar
  (`model.js:232`, `market.js:157`) án prófs sem bindur þau saman.

---

## B. Fyrir GW1-deadline 21.8 kl. 17:30 UTC — einskota tækifæri

**B.1 Spábókhaldið (prediction ledger) MÁ EKKI klikka.** `snapshot-predictions.mjs`
keyrir úr `fetch-fast.yml` með `continue-on-error: true` — viljandi, en það þýðir að
bilun í 12-tíma glugganum (opnast ~05:30 UTC 21.8.) er ÞÖGUL og GW1-línan verður
aldrei endursköpuð. Gerðu generalprufu NÚNA: keyrðu skriftuna handvirkt (hún á að
segja „skipped - Xh before the deadline"), farðu yfir `inputsUsable`-gátina, og
bættu við eftirlitsskrefi í workflowið sem ber saman „gluggi opinn" og „skrá til" og
skrifar áberandi rauða línu í `status.json` ef glugginn er opinn og engin skrá kom.

**B.2 ClubElo-bilunin.** `elo: ok:false` (timeout) í status núna og skráin degi á
eftir. FFDR-inntak; `homeCore` slekkur á sér án Elo (rétt hönnun) svo þögul
langvarandi bilun BREYTIR líkaninu. `eloStale()` varar við á 2/5 dögum í viðmótinu —
en enginn verður í pípunni. Bættu við: (a) retry-keyrsla seinna um daginn ef Elo
brást (ódýrt — eitt CSV), (b) status-lína sem telur daga frá síðasta heila Elo.

**B.3 E0-2627 ákvörðunin sem CLAUDE.md segir að sé „í ágúst".** `team_form` les
E0-2526/2425 harðkóðað; `fdcouk/E0-2627.json` er skrifað og ekkert les það. Hvort
yfirstandandi tímabil eigi að blandast inn í liðstyrk er INNTAKSBREYTING í FFDR —
mældu fyrst (walk-forward á fyrri tímabilum: hjálpar blöndun N-tímabils inn í
N-styrk eftir k umferðir?), ákvarðaðu svo. Skjalað í `wiring.mjs` „svo það gleymist
ekki í ágúst".

**B.4 GW1-gátlistinn.** `tests/gw1-checklist.mjs` vaknar við fyrstu kláruðu umferð.
Farðu yfir hann fyrirfram og tryggðu að atriðin þar (API-Sports meiðslategund,
confirmed lineups við stytt nöfn, „this year vs last year"-taflan sem hefur ALDREI
keyrt, fdcouk 2627 404→200, BSD predicted-lineups mæling gegn 6h-líkani GW1–4)
eigi hvert sinn eiganda/vörð.

---

## C. Mælingar og bætingar (eftir B, í þessari röð)

**C.1 Sölu-ráðgjöfin er á skjön við stjórnarskrána — stærsta einstaka skuldin.**
`App.jsx:1557–1727`: `recommendations`/`scoreOf` er ANNAÐ stigalíkan (`FIT`) plús
fimm handstilltar leiðréttingar með NÍU ómældum föstum (`ep*1.2`, `banPen −2.5/−1`,
`spB 2.2`, `rotPen −2/−0.8`, `dcB (o−60)/30`, `0.35+0.65*avail`) — og `dcB` setur
DefCon INN í ákvörðun þótt CLAUDE.md §4 skrái „DefCon í röðun" sem mælt-og-fellt og
Compare-flipinn segi notandanum að DefCon vegi hvergi. Kauplistinn við hliðina raðar
rétt eftir `rankScore`. Engin prófsvíta snertir neitt af þessu.
*Verk:* dragðu út í hreint módúl (`src/recommend.js`), mældu hvern lið á sama hátt
og `minsTrend` var mælt (yfirlag ofan á mælda kjarnann, LOSO, ákvörðunar-metrík =
raunstig þeirra sem valdir/seldir voru) — og fjarlægðu það sem ekki stenst. Vörður í
anda `tests/advisor.mjs`.

**C.2 `csFor`-fossinn og `chipValue`/`bestGwFor` úr App.jsx í hrein módúl + próf.**
Fjögurra-þrepa CS-fossinn (`App.jsx:1130–1169`) og chip-tímasetningin
(`App.jsx:1858–1897`) eru óprófaðar ákvarðanir. Sama aðferð og `buildTeamMetrics`
flutningurinn 12.8. (sem spábókhaldið krafðist).

**C.3 Fyrirliða-ráðgjöf — stærsta virknigatið.** Engin sjálfvirk captain-tillaga er
til í appinu; eina merkið er nóta á `penalties_order` („strongest single captaincy
signal"). Byggðu MÆLDA captain-röð: framboð = `expPointsFor` × start-líkur ofan á
FFDR, plús vítataka sem mælt yfirlag; bakprófaðu á `fpl_player_gw.json` (5+ tímabil):
metrík = raunstig þess sem reglan velur vs (a) hæsta EO, (b) `ep_next`-topp, (c)
óráðin blanda. Ef ekkert slær einföldu regluna er það líka svar og fer í §4-töfluna.

**C.4 Archívaðu hrá-verðin sem er hent.** (a) Odds API: aðeins afleiddar tölur eru
geymdar — hrá bookmaker-verð (h2h/totals/spreads per veðbanka) glatast við hverja
sókn; skrifaðu þau í `data/odds_raw/{gw}-{ts}.json` (sama rök og `data/history/`:
verður ekki endurskapað). (b) FPL `events`-sviðin `most_captained`,
`most_transferred_in`, `chip_plays`, `transfers_made` o.fl. er hent í
`fetch.mjs:304–306` — ódýr viðbót við daglega snapshot-ið, nýtist EO/captain-greiningu
og panel-samanburði. (c) ESPN `gameInfo.officials` er hent á meðan dómaragögn eru
unnin úr E0 annars staðar — geymdu nafnið á fixture-röðinni.

**C.5 `bsd_odds.json` fallback-vírunin.** Skjalað sem „fallback sem ekkert les".
Þarf join (odds keyed á lið, bsd á event-id) + mælingu á að afleiddu tölurnar séu
sambærilegar (lambda/cs á sömu leikjum bæði megin). Gerðu það sem mælingu, ekki
quick-fix — og skráðu niðurstöðuna hvor sem hún verður.

**C.6 `data/history/` fær fyrsta lesandann.** 20 daglegar skrár og vaxandi; engin
sýn les þær. Ódýrasta byrjunin: verðbreytinga-tímalína í PlayerPanel (verð þá vs nú,
hver hreyfðist í nótt) — og lokar um leið „gatinu í verðinum" með því að láta
wiring-próf vita af template-slóðum.

**C.7 Prófagöt sem úttektin nefndi:** `banRisk`/`availOf` (ekkert próf),
`storageMode` þrígreinin, `recommendations`-slóðin öll (C.1), null-chance (A.4),
object-í-stað-fylkis (A.5). Taktu þau í sömu lotu og viðkomandi lagfæringu.

---

## D. Yfir tímabilið (skipuleggðu núna, keyrist frá viku 1)

- **BSD predicted lineups vs 6h-líkanið, GW1–4** — skjalað skilyrði þess að treysta
  þeim; glugginn þeirra (~11–13 klst fyrir leik) nær ekki deadline fyrir
  laugardagsleiki, svo mælingin þarf að taka það fram.
- **Panel-merkið** — „hvort þessi hópur sé öðruvísi er ómælt þar til ~10 umferðir
  liggja fyrir"; skrifaðu mælinguna núna (harness + verðir), láttu hana sofa eins og
  `gw1-checklist`.
- **Kvörðunarskýrslan á skjá** — `src/calibration.js` er hreint, prófað og á sér
  ENGAN neytanda í viðmótinu; „prófin keyra sama kóða og skýrslan birtir" er tóm
  fullyrðing þar til skýrslan er til. Lítill Sources/Calibration-flipi sem birtir
  ledger-vs-raun eftir 3–4 umferðir.
- **Clean-sheet regime-vaktin** — CS féll ~28%→~23%; CLAUDE.md segir `SCALE_FIX`
  fyrstu töluna sem á að endurmæla ef þróunin heldur. Settu ársfjórðungslega
  endurmælingu á dagatalið (eftir ~GW8).

## EKKI gera (mælt og fellt — sjá CLAUDE.md §4 í heild)
Ferðalög í FFDR · DefCon í röðun (nema að MÆLA hana út úr C.1) · „heitur leikmaður" ·
staða-vs-andstæðingur · xGChain/xGBuildup · box-touches (endurmælt 12.8, CI inniheldur
núll, enginn proxy dugar) · PSxG-afleiðurnar („goals prevented", placement skill) ·
dómaraspjöld sem spá · stöðu-prior fyrir nýliða · sjöunda þrepið · crowd-transfers
ofan á ep_next · lítið panel / vigtun innan panels · BSD availability í stað FPL ·
hvíldardagar. Dauðar heimildir: FBref, SofaScore, FotMob, Understat.

Að lokum: keyrðu `npm test` þrisvar, `npm run build`, og skildu eftir stutta færslu í
`docs/MAELINGAR.md` fyrir hverja mælingu — líka þær sem féllu.
