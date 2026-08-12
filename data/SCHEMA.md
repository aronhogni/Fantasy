# data/ — skema

Allt hér er skrifað af `scripts/fetch.mjs` gegnum GitHub Actions og lesið af
framendanum frá `raw.githubusercontent.com/aronhogni/Fantasy/main/data/…`
(CORS-opið, engin function-köll, enginn hýsingar-kostnaður).

Tvær keyrslur:

| Workflow | Tíðni | Skrifar |
|---|---|---|
| `fetch-data` | 05:00 daglega | allt |
| `fetch-fast` | á 30 mín | `news.json`, `fixtures.json` |

`status.json` og `status_fast.json` telja raðir úr hverri heimild. **Núll raðir
eru verri en villa** — athugaðu þau fyrst ef eitthvað vantar.

---

## TVÖ ATRIÐI SEM MÁ EKKI MISSKILJA

### CS% og DefCon draga í GAGNSTÆÐA ÁTT — leggið þau ALDREI saman

Stærstu DefCon-vinningsmennirnir eru miðverðir í liðum **undir þrýstingi**.
Fleiri skot á sig þýðir fleiri hreinsanir og blokkeringar. Það eru ekki bestu
varnirnar sem skora varnarframlags-stig, heldur þær sem hafa **mest að gera**.

Staðfest í okkar eigin gögnum: Arsenal er **lægst** í DefCon-tækifæri (52) því
vörnin er svo góð, Tottenham **hæst** (87) því þeir sæta miklum þrýstingi.

Sýnið þau sem **tvo aðskilda mælikvarða**. Samanlögð tala eyðir upplýsingunni.

### `defensive_contribution` — ÓSTAÐFEST merking

Sviðið kemur úr FPL en við höfum **ekki staðfest** hvort það er fjöldi
*aðgerða* eða fjöldi *leikja þar sem þröskuldur náðist*. Það er allt annar
hlutur. `defcon.json` reiknar `hit_rate` úr **live-gögnum umferð fyrir umferð**,
sem er óháð þessari óvissu — notið það, ekki árstíðarsummuna.

Reglur 2026/27: **DEF 10+ CBIT**, **MID/FWD 12+ CBIRT**, hámark 2 stig í leik.

---

## Kjarni — FPL

### `players.json`
`{ updated, players: [...] }` — 558 leikmenn, valin svið úr `bootstrap-static`.

| Svið | Merking |
|---|---|
| `id`, `web_name`, `first_name`, `second_name` | auðkenni |
| `team` | FPL team id → `teams.json` |
| `element_type` | 1 GK, 2 DEF, 3 MID, 4 FWD |
| `code` | myndakóði → `resources.premierleague.com/premierleague/photos/players/110x140/p{code}.png` |
| `now_cost` | verð **×10** (155 = £15,5) |
| `cost_change_start`, `cost_change_event` | verðbreyting frá upphafi / í umferð, ×10 |
| `ep_next` | FPL-eigin stigaspá næstu umferðar |
| `form`, `points_per_game`, `total_points`, `minutes` | **síðasta tímabil** þar til GW1 |
| `expected_goals`, `expected_assists`, `expected_goals_conceded` | Opta-xG gegnum FPL |
| `expected_goal_involvements` | xG **+** xA — tvítelur mark með assisti. Nota **ekki** fyrir lið-xG |
| `*_per_90` | per-90 útgáfur, betri til samanburðar |
| `yellow_cards`, `red_cards` | spjöld — grunnur bann-hættu |
| `starts`, `starts_per_90` | skiptingar-hætta |
| `penalties_order` | **1 = fyrsti vítataki** |
| `corners_and_indirect_freekicks_order`, `direct_freekicks_order` | fastaleikja-röð |
| `status` | `a` til leiks, `d` vafi, `i` meiddur, **`s` Í BANNI**, `u` ótiltækur, `n` ekki í hóp |
| `chance_of_playing_next_round` / `_this_round` | `null` eða 0/25/50/75/100 — sett af FPL-ritstjórum |
| `news`, `news_added` | fréttatexti, t.d. „Groin injury - Expected back 22 Aug" |
| `defensive_contribution`, `clearances_blocks_interceptions`, `tackles`, `recoveries` | sjá viðvörun ofar |

### `news.json` — HRAÐUR CRON, á 30 mín
`{ updated, current_gw, next_gw, next_deadline, players: [...], price_changes: [...] }`

Aðeins leikmenn með **frétt, vafa eða verðbreytingu** (~40–60 manns).
**Framendinn á að leggja þetta OFAN Á `players.json`** — þá sérðu meiðslafrétt
sem barst fyrir hálftíma, ekki í gær.

### `teams.json`
`{ id, name, short, code, strength, strength_overall_home/away, strength_attack_*, strength_defence_* }`
`code` er fyrir félagsmerki: `…/premierleague/badges/50/t{code}.png`

### `teams_map.json` — NAFNAVÖRPUN, lyklað á FPL team id
`{ fpl, short, clubelo, fdcouk, understat, lat, lon, badge }`

**Allar nýjar heimildir fara gegnum þetta borð.** Aldrei hörð liðanöfn í kóða.
`lat`/`lon` eru notuð fyrir bæði veður og ferðalengd.

### `fixtures.json`
`[{ id, event, kickoff_time, finished, started, minutes, finished_provisional,
team_h, team_a, team_h_score, team_a_score, team_h_difficulty, team_a_difficulty }]`

`team_h_difficulty` er FDR **fyrir heimaliðið** (1 auðveldast, 5 erfiðast).
`event: null` = ótímasettur (frestað).

### `events.json`
`[{ id, name, deadline_time, finished, is_current, is_next, average_entry_score }]`

### `live/gw{n}.json` — aðeins loknar umferðir
Óskert FPL-svar. **`explain`-blokkin er geymd ÓSKERT** — hún er eina óyggjandi
heimildin um hvaða stig voru veitt og hvers vegna.

### `player_gw_{season}.json` — ein skrá per tímabil
`scripts/fetch-player-gw.mjs` skrifar eina slíka **per tímabil** (slétt,
lyklað á FPL `code`) svo aðeins valið tímabil sé hlaðið. Þær eru grunnurinn
undir umferðar-bili í leikmannalistanum („bara GW 30–38 síðasta tímabil").
Verðir: `tests/player-gw-range.mjs` (summur stemma við `player_seasons.json`
— óháð heimild) og `tests/euro-congestion.mjs`.

Skriftin er **ekki í cron**; til að endurgera: `node scripts/fetch-player-gw.mjs`.

**AÐVÖRUN ÚR REYNSLU (1.8.2026):** þessar skrár mældust „án lesanda" og
**fjórar voru fjarlægðar** — ranglega. Lesandinn (`player-gw-range.mjs`) hafði
landað í repo-inu *mínútum áður* í samhliða lotu, svo `grep`-mælingin var
réttur mælikvarði á úreltu tré. Prófin stöðvuðu þetta og skrárnar voru
endurheimtar. **Lærdómur: `git pull` OG endurlesa lesendur ÁÐUR en gögnum er
eytt, ekki bara þegar ýtt er.**

### `lineups.json` — STAÐFEST byrjunarlið (API-Sports)
`{ updated, gws, calls, teams:[{fpl_team, gw, formation, fixture}],
players:[{fpl_id, fpl_team, gw, fixture, started, pos, name_api}],
unmatched, errors, probe, note }`

`started: true` = í **startXI**, `false` = á bekk. Þetta er **staðfesting**,
ekki spá — FPL-status ræður áfram tiltækileika.

**Tómt utan leikdags-glugga** (leikur innan 2 klst eða nýbyrjaður). Þá er
`probe` skrifað í staðinn: eitt könnunar-kall sem svarar því hvort fría þrepið
LEYFI endapunktinn (`probe.gated`). Sú heimild var **óstaðfest þegar þetta var
skrifað** — hvorki notandi né Claude nær í `API_SPORTS_KEY` (aðeins í GitHub
Secrets), svo svarið kemur úr fyrstu Actions-keyrslu.

Skrifað úr **`--fast`** (30 mín) og EKKI úr daglegu keyrslunni: liðin birtast
40–60 mín fyrir leik og daglega keyrslan er kl. 05 UTC.

### `player_form.json` — per-umferðar mínútusaga, LEIDD (engin ný köll)
`{ updated, gws_used, players: { <id>: { gws, mins5, mins_trend, ppg5,
start_rate5 } }, note }`

Leitt ÚT ÚR `live/gw{n}.json` — sækir ekkert sjálft. `mins_trend` = mín/umferð
síðustu 2 mínus þriggja þar á undan.

**Raðirnar eru per UMFERÐ, ekki per leikinn leik**: bekkjarmaður fær 0 og telur
með. Það er ekki smáatriði — mæling sem sleppti 0-röðum sýndi bekkjarmenn „í
formi“.

`mins_trend` er inntak í `rankScore` með vog 0,01 (mælt +0,066 topp-15, 5/5
tímabil — sjá CLAUDE.md kafla 3c). **Krefst ≥4 loknar umferðir**; fyrir það er
þróunin 0 og röðunin er eins og áður. Í forleik er skráin tóm (`gws_used: 0`)
og `status.json` segir „engin lokin umferd (preseason) — throunin kviknar vid
GW4“.

### `history/YYYY-MM-DD.json` — dagleg verðmynd
`[{ id, now_cost, cost_change_event, selected_by_percent, transfers_in_event,
transfers_out_event, total_points, ep_next, ep_this, chance_next, status }]`

Byggir verðbreytinga-tímaröð sem ekkert API selur. ~40 bæti á leikmann.

**`ep_next` / `ep_this` / `chance_next` / `status` bættust við 9.8.2026** og
ástæðan er mæling sem var **ekki hægt að klára**. Skipta-hreyfing fjöldans
mælist sterk gegn hráu formi (r = +0,248 á 104.160 leikmanna-umferðum) en
**núll** gegn `xP` (−0,0005). Munurinn ræður því hvort talan sé nothæf — en
`xP` í vaastav-speglinum er sótt **eftir** að umferðin kláraðist, svo það er
engin leið að sanna afturvirkt að hún hafi verið til fyrir frest.

Dagleg mynd tekin **fyrir** frest getur ekki verið menguð af útkomunni og
lokar gáttinni. **Þetta verður ekki til eftir á** — sama regla og verðmyndin
sjálf.

### `chips.json` — REGLURNAR, ekki lýsigögn
`[{ id, name, number, start_event, stop_event, chip_type }]`

**Tvö sett** — eitt per hálfleik. Wildcard og Free Hit byrja í **GW2**.
Fyrra settið **fellur úr gildi** við GW19-frest (2. jan 2027).
Framendinn á að lesa gildistímann héðan, ekki harðkóða hann.

### `set_piece_notes.json`
Hvað klúbburinn **segir** um vítatakara. Tómt fyrir tímabil.

---

## Afleitt úr FPL

### `defcon.json`
```
{ players: [{ fpl_id, position, starts, threshold_hits, hit_rate,
              hit_rate_adj, p0, cbit_per_90, cbirt_per_90 }],
  opportunity: { <fpl_id>: { own_xgc90, opp_attack_avg,
                             defcon_opportunity, fixtures_used } } }
```
`hit_rate` = `threshold_hits / starts`, reiknað **umferð fyrir umferð** —
**HRÁ og ofmælist á litlum sýnum** (mælt gegn ytra viðmiði: okkar n=10–15
mælingar fóru í 75–80% en engin leikmaður í ~470 manna tímabilsspá fer yfir
~57%). Til birtingar er `hit_rate_adj` = `(hits + 10·p0)/(starts + 10)`,
`p0` = stöðu-meðaltal (empirísk Bayes-afturvirkni, TERMINAL_HANDOFF_4 §2).
Sýnið `starts` alltaf við hlið hittninnar. Vörður: `tests/defcon-shrink.mjs`.
`defcon_opportunity` 0–100 = vinnuálag varnar. **Aðskilið frá CS%.**

### `consistency.json` — ARON-STUÐULL (jöfnuður)
```
{ seasons: { "2025/26": { <code>: { pos, games, hit4, hit6, blank,
      ppg, hit4_pct, hit6_pct, blank_pct, aron } } } }
```
Hlutfall **spilaðra** leikja með ≥4 / ≥6 / ≤2 stig, afturvirkjað (K=10 að
stöðu-meðaltali) svo maður með 3 leiki fái ekki 100%.
`aron = hit4_pct − blank_pct` — „4+ er gott, 1–2 er galli".

**LÝSING Á FORTÍÐ, EKKI SPÁ — og það er MÆLT** (5 tímabil, 7.8.2026):
hit4 fylgir stigum/leik með **r = 0,90**; enginn þröskuldur (≥3/4/5/6/7)
gaf forspárgildi umfram stig/leik og ábatinn **skipti formerki**
(+0,6 / +1,4 / −0,6 / +1,4 / −1,0 pp); verð ræður miklu (r 0,43–0,66) og
eftir að stjórnað er fyrir stigum **og verði** innan stöðu er engin
varanleg leif (DEF 0,12 · MID 0,13, 2·SE 0,21–0,27, formerki flakka).
**Fer því ALDREI í `rankScore`** — vörður: kafli 5 í `tests/consistency.mjs`.
Rétta notkunin: bera saman menn í **sömu stöðu á svipuðu verði**.

### `defcon_history.json`
```
{ seasons: { "2025/26": { <code>: { pos, starts, hits, hit_rate,
                                     hit_rate_adj, p0 } } } }
```
DC-hittni **fyrri tímabila**, leidd úr `player_gw_{s}.json` (`dc` = FPL
`defensive_contribution`, sem er TALNINGIN 1–27, ekki stigin). Lyklað á
FPL `code` (fast yfir tímabil, ólíkt `id`). Sömu þröskuldar og
afturvirkni og `defcon.json` svo tölurnar séu samanburðarhæfar.
**AÐEINS tímabil sem EIGA DefCon:** mælt eru 2021/22–2024/25 með `dc`
skrifað sem **0** (ekki null) — án síu hefði hver leikmaður fengið
hittni 0,000 sem *lítur út eins og mæling*. Þau eru því sleppt og appið
sýnir „—" (VANTAR). DefCon er ný stigagjöf frá 2025/26.

---

## Bókmakarar

### `odds.json`
```
{ updated, requests_remaining,
  teams: { ARS: { cs, xga, xg, opp, home, kickoff, books } } }
```
`cs` er Poisson: `e^(−vænt mörk mótherja) × 100`.

**`opp` og `kickoff` eru ekki skraut** — línan gildir aðeins um **þann leik**.
Framendinn verður að staðfesta bæði áður en talan er notuð, annars sýnir hann
GW1-líkur í GW5. Falla annars á ClubElo eða FDR+xGC.

Kvóti: 2 kredit/dag af 500/mán. Sótt á cron, **ekki** gegnum Netlify.

---

## ClubElo

### `elo.json`
`{ teams: [{ fpl_id, short, elo, rank, level, clubelo_name }] }`
Filter: `Country=ENG`, `Level` 1 **og** 2 (nýliðar þurfa samfellda sögu).

### `elo_fixtures.json`
```
{ fixtures: [{ date, home, away, home_fpl, away_fpl,
               cs_home, cs_away, p_home, p_draw, p_away, xg_home, xg_away }] }
```
Afleitt úr `R:0-0`…`R:6-0` úrslitalíkindum. **Ókeypis CS%** — engin Odds-kredit.
`/Fixtures` sýnir aðeins næstu daga, svo þetta er tómt utan leikjatíma.

---

## football-data.co.uk

### `fdcouk/E0-{SS}.json` — 9 tímabil, 1718–2526
`{ season, header, rows, untrusted_columns, untrusted_note }`

Hrátt CSV óskert. **132 kolónur** í nýjustu tímabilum.

| Til | Athugasemd |
|---|---|
| `Referee` | dómarí — grunnur spjalda-vísitölu |
| `HS/AS`, `HST/AST`, `HC/AC`, `HF/AF`, `HY/AY`, `HR/AR` | leikjatölur |
| `B365CH`, `AHCh`, `AvgCAHH` … | **lokalínur** (C-innskot) — skarpasta fría líkindaspáin |
| `PSH/PSD/PSA`, `PSC*` | **ÓTRAUST** frá 2025-07-23, listað í `untrusted_columns` |

**Fullur kolónulisti og hvað er afsannað:** sjá viðauka neðst.

### `fdcouk/referees.json`
`{ league_avg_yellow_pg, referees: { "<nafn>": { games, yellow_pg, red_pg, fouls_pg, card_index } } }`
`card_index > 1` = fleiri spjöld en meðal-dómari. Lágmark 20 leikir.

### `fdcouk/h2h.json`
`{ pairs: { "HomeTeam|AwayTeam": { games, home_w, draw, away_w, home_w_pct,
cs_home_pct, cs_away_pct, avg_goals, goals_home_pg, goals_away_pg,
btts_pct, over25_pct } } }`

Lyklað með **fdcouk-nöfnum** → `teams_map.json.fdcouk`.
Hrein blöð eru **talin beint**, ekki afleidd úr BTTS.

### `promoted_baseline.json`
`{ "<lið>": { source: "championship_proxy", games, shots_pg, sot_pg, goals_pg,
conv, shots_against_pg, sot_against_pg, goals_against_pg } }`

**Staðgengill, EKKI xG.** Coventry og Hull hafa enga úrvalsdeildar-sögu.
Framendinn verður að sýna að þetta sé áætlun.

---

## Evrópa og bikarar

### `euro_fixtures.json`
```
{ sources_ok, fixtures: [{ comp, comp_label, date, home, away,
                           home_fpl, away_fpl }],
  by_team: { <fpl_id>: [{ comp, comp_label, date }] },
  participation: { <fpl_id>: ["CL"] } }
```

Heimildir: ESPN (enginn lykill, óformlegt) + football-data.org (Meistaradeild
frí, þarf `EURO_API_KEY`). Staðfestir ESPN-kóðar: `uefa.super_cup`,
`uefa.champions_qual`, `uefa.europa_qual`, `eng.league_cup`, `eng.charity`.

**Harður dagsetninga-filter:** allt í fortíðinni er sleppt. Nauðsynlegt því
football-data.org skilar **síðasta tímabili** þegar nýtt er ódregið — það sendi
okkur alla Meistaradeildina 2025/26 einu sinni.

`participation` nýtist **mánuðum áður** en dráttur er gerður.

**Æfingarleikir eru útilokaðir** — þeir myndu búa til falskar tvöfaldar umferðir.

---

## Afleidd lög — engin ný köll

### `travel.json`
`{ long_trip_km, fixtures: [{ fixture_id, event, kickoff_time,
home_fpl_id, away_fpl_id, km, is_long_trip }] }`

Haversine úr `teams_map` hnitum. `km` gildir um **útiliðið**.
Þröskuldur 300 km. Staðfest: Newcastle→Bournemouth 472 km.

### `gameweek_shape.json`
`{ cup_status: { <fpl_id>: { extra_games, cup_exited } },
  shape: [{ event, teams_playing, blanks, doubles }] }`

`cup_exited: null` = **óþekkt** (bikarar ódregnir) — ekki `false`.

**Merking sem er oft misskilin:** lið sem fer ÚR bikar snemma fær **TRYGGARI**
mínútur, ekki verri.

### `team_form.json` — LIÐ-STYRKUR, HEILT
`{ season, header_columns, teams: [{ fpl_id, short, matches, source,
goals_pg, conceded_pg, shots_pg, shots_against_pg, sot_pg, sot_against_pg,
corners_pg, fouls_pg, yellows_pg, reds_pg, clean_sheet_pct,
conversion, sot_conversion }] }`

**NOTIÐ ÞETTA FYRIR LIÐ-STYRK, EKKI FPL-SUMMUR.**

FPL `bootstrap-static` inniheldur aðeins leikmenn sem eru í leiknum **núna**.
Þeir sem fóru úr deildinni eru fjarlægðir — og tölur þeirra frá síðasta
tímabili með þeim. Mælt: **19% af mörkum 2025/26 vantar** í summu FPL-leikmanna
(851 af 1045). Fulham vantar 57%.

E0 hefur alla 380 leiki, svo þetta er heilt. 17 lið með sögu, 3 nýliðar `matches: 0`.

### `predictions/gw{N}.json` — SPÁ-BÓKHALDIÐ

```
{ gw, generated, sources:{odds,elo,team_form,player_form}, note,
  ffdr: [{ fixture, team, opp, home, def, def_tier, att, att_tier }],
  rank: [{ id, code, team, pos, score, score_avail, avail,
           inputs:{form,minsPerGame,price,ffdr,minsTrend},
           start_prob, ep_next, status, fixtures }] }
```

**Þetta er EKKI birtingargagn — appið les það ekki.** Það er mælitæki:
`scripts/snapshot-predictions.mjs` skrifar niður hvað við SPÁÐUM fyrir umferð,
og `tests/calibration.mjs` ber það síðar við það sem gerðist.

**Af hverju það verður að vera skrifað fyrirfram:** FFDR, `rankScore` og
byrjunar-líkurnar eru reiknaðar úr gögnum sem BREYTAST í hverri viku (verð,
form, elo, markaðslína). „Hvað hefðum við sagt fyrir GW5" er ÓSVARANLEGT þegar
GW5 er liðin — inntökin eru horfin. Sama röksemd og `history/` (CLAUDE.md 7):
**dagleg mynd verður ekki búin til eftir á.**

**ÞRJÁR REGLUR — án þeirra væri bókhaldið sjálfs-uppfyllandi:**
1. **Aðeins FYRIR frest.** Spá skrifuð eftir að leikur er byrjaður er ekki spá.
2. **Aðeins EINU SINNI.** Röð sem er til er ALDREI endurskrifuð, ekki heldur
   „með betri gögnum" — endurskrifuð spá er retro-fitting. Skráin er ÓNEMANDI.
3. **Þunn inntök -> engin skrá.** Betra að umferð vanti en að hún beri spá
   reiknaða úr hálfum gögnum; síðara les eins og mæling.

`score` er hrátt `rankScore`; `score_avail` er það sama × tiltækileika — RÖÐIN
SEM NOTANDINN SÉR. Bæði eru skráð svo kvörðunin geti mælt röðunar-vélina eina
OG röðunina eins og hún birtist. `ep_next` er FPL-eigið xP og er VIÐMIÐIÐ.

Vex um ~1 MB á umferð (38 MB/tímabil). **Eyðið henni ekki** — sama regla og
`history/`: hún verður ekki búin til eftir á.

### `luck.json`
```
{ result_enum_seen: [...],
  teams:   [{ fpl_id, short, matches, goals, conceded, xg, xgc,
              goals_minus_xg, conceded_minus_xgc,
              woodwork_for, woodwork_against, source, xg_incomplete }] }
```

**`players`-sviðið var tekið út 11.8.2026.** Það var skjalfest hér með
Understat-sviðum (`understat_id`, `npxg`, `penalties_taken` …) en var
**alltaf tómt**: `playerAgg` í `deriveLuck` var skilgreint og aldrei skrifað
í, svo `luck.json` skilaði `players: []` frá fyrsta degi. Understat-heimildin
er horfin (CLAUDE.md 6e) og ekkert í framendanum las sviðið. Tómt fylki sem
lofar leikmanna-tölum er sama ætt og dauður dálkur.

`woodwork` kemur úr BSD-skotakortinu (`type: "post"`) — **per SKOT**, per lið.
Það er betra en HHW/AHW hefði verið (sem eru ekki til).

`result_enum_seen` listar öll ólík `result`-gildi sem raunverulega komu —
ENUM-gildin voru óstaðfest og eru nú skjalfest úr keyrslu.

`goals` kemur úr E0 (heilt), `xg` úr FPL-summu sem vantar ~19% →
**`xg_incomplete: true`**. Framendinn má ekki sýna `goals_minus_xg` sem
nákvæma tölu þegar það flagg er sett.

Nýliðar: `championship_proxy`, og **`woodwork: null` — EKKI núll.**
Stangarskot eru ekki til fyrir þau, og núll myndi lesast sem „engin stangarskot".

### `form_features.json` — INNTAK Í MÆLDA STIGALÍKANIÐ
`{ gws_used, window_5, window_10, mode, players: [{ fpl_id, mins5, pts5,
start_rate, over60_rate, xgi90, bps90, dc90, samples, minutes_window }] }`

Reiknað **umferð fyrir umferð** úr `live/gw{n}.json`, ekki úr uppsöfnuðum
`minutes` í `players.json`.

`mode`: `preseason` (0 umferðir) → `warmup` (1–4) → `fitted` (5+).
Framendinn á að **lækka öryggi** í warmup.

**MÆLING (út-af-úrtaki, 2025/26, 19.448 sýni, lært GW6–20, prófað GW21–33):**

| Líkan | MAE stig/5 umferðir |
|---|---|
| ekkert líkan (meðaltal) | 6,70 |
| FPL-eigin `xP` | 6,43 |
| handvaldar vogtölur | 5,00 |
| **fittað** | **3,66** |

Stöðluð áhrif, mest fyrst: **mins5 +4,6 til +5,1**, verð +1,0 til +1,3,
xgi90 +0,7, pts5 +0,3 til +1,0, **FDR −0,2 til −0,6**.

**FDR MÆLIST ~0.** Prófað á sjóndeildarhring 1, 2, 3, 5 og 8 umferðir —
bætingin er **negatíf alls staðar**. Það er samt haft með á sinni mældu
(lítilli) vog. Litakóðar á leikjum eru gagnlegt samhengi, ekki forspá.

## FFDR — Fantasy Fixture Difficulty Rating

Okkar mælda leikjaþyngd. **MÆLT á 7 tímabilum** (2019/20–2025/26),
**3.808 lið-leikjum**. Liðsstyrkur alltaf úr fyrra tímabili → ekkert leki.

| Staða | FPL FDR | **FFDR** | Bæting | Brestir |
|---|---|---|---|---|
| GK | 0,131 | 0,149 | **+14%** | 1/7 |
| DEF | 0,233 | 0,307 | **+32%** | 0/7 |
| MID | 0,207 | 0,307 | **+48%** | 0/7 |
| FWD | 0,119 | 0,183 | **+54%** | 2/7 |
| **MEÐAL** | **0,172** | **0,236** | **+37%** | 3/28 |

### Þættir FFDR

| Þáttur | GK | DEF | MID | FWD |
|---|---|---|---|---|
| FDR (opinbert) | 0,45 | 0,45 | 0,40 | 0,40 |
| Eigin styrkur | 0,45 | 0,50 | 0,60 | 0,60 |
| Andstæðingur | 0,10 | 0,05 | 0,00 | 0,00 |
| Umbreyting | varnar | varnar | varnar | sóknar |
| Skot á mark | — | 0,50 | 0,20 | — |
| Fyrra tímabil | — | — | 0,45 | — |
| Elo-munur | — | — | 0,15 | 0,30 |
| **Markaðslína** | **0,35** | **0,65** | **0,35** | **0,35** |
| Heimavöllur | 0,04 | **0,00** | 0,08 | 0,12 |

### LÆRDÓMUR SEM BREYTTI STILLINGUM

**Markaðslínan inniheldur ÞEGAR heimavöllinn.** Þegar hún er blönduð inn verður
sér-heima-stuðull **tvítalning**. Fyrir varnarmenn fellur fylgnin **einræn**
þegar hann hækkar:

| Heima-stuðull | 0,00 | 0,08 | 0,16 | 0,24 |
|---|---|---|---|---|
| DEF fylgni | **0,3071** | 0,3052 | 0,2997 | 0,2919 |

Hann var því settur í **núll** fyrir varnarmenn og lækkaður hjá öllum öðrum
(FWD 0,24 → 0,12). Þetta var hugmyndavilla í 5-tímabila útgáfunni.

### Brestirnir — báðir skýrðir

**FWD 2020/21** — COVID, engir áhorfendur. Heimavallar-forskot framherja varð
**negatíft (−0,140)** og heima-stuðullinn refsaði því ranglega:

| Tímabil | DEF heima | FWD heima |
|---|---|---|
| 2019-20 | +0,614 | +0,236 |
| **2020-21** | **+0,116** | **−0,140** |
| 2021-22 | +0,372 | +0,334 |
| 2022-23 | +0,806 | +0,811 |
| 2024-25 | +0,089 | +0,831 |

Heimavallar-forskotið er **mjög sveiflukennt** (DEF +0,089 til +0,806). Fastur
stuðull er alltaf málamiðlun — sem er önnur ástæða til að hafa hann lítinn.

**GK 2019/20** — markverðir eru innbyggt veikast spáðir. Vörslur gefa stig og
þær eru **fleiri í erfiðum leikjum**, sem vinnur á móti hreinu blaði og dempar
öll merki. Það er eðli stöðunnar, ekki líkanavilla.

### BLÖNDUN MARKAÐS OG FORMÚLU — FULLMÆLT

E0-lokalínur **paraðar við** vaastav leikmanna-stig: 2.720 lið-leikir, 5 tímabil.
Krossprófað (læra á 4 tímabil, velja blöndu, prófa á því fimmta).

#### Bæði mælt: fylgni OG praktískt val

| Staða | Blanda | Fylgni (ÚaÚ) | Praktískt* | Yfir grunn |
|---|---|---|---|---|
| GK | **20%** | 0,1648 | 4,05 | +0,62 |
| DEF | **65%** | 0,3062 | 4,32 | +1,27 |
| MID | **40%** | 0,2996 | 4,29 | +0,83 |
| FWD | **35%** | 0,1931 | 5,19 | +1,09 |

\* meðalstig per leikmann þegar léttustu 15% leikja eru valin

#### Þrjár niðurstöður sem stangast á — og hvað þær segja

**1. Yfirborðið er FLATT.** DEF gefur 0,3045–0,3064 á öllu bilinu 40–80%.
Nákvæma talan skiptir litlu; **það sem skiptir máli er AÐ blanda**.

**2. Fylgni og praktískt val gefa ólík svör.** Fyrir DEF segir fylgni 60%,
praktískt val segir 100%. Ástæðan: fylgni mælir alla dreifinguna, praktískt
val aðeins **toppinn**. Markaðurinn er betri í að finna öfgaleiki en verri
í miðjunni.

**3. Besta blandan fer eftir LEIKJATEGUND:**

| Staða | Öfgaleikir (þyngd <2 eða >4) | Jafnir leikir |
|---|---|---|
| GK | 55% (r 0,146) | 35% (r 0,141) |
| DEF | **100%** (r 0,294) | 60% (r 0,230) |
| MID | 65% (r 0,291) | 35% (r 0,190) |
| FWD | **5%** (r 0,206) | 40% (r 0,152) |

Fyrir varnarmenn er markaðurinn **einn** bestur í öfgaleikjum. Fyrir framherja
er hann nánast gagnslaus þar (5%) en gagnlegur í jöfnum leikjum (40%).

**EKKI ÚTFÆRT.** Skilyrt blöndun tvöfaldar breytufjöldann (8 í stað 4) á sömu
2.720 sýnum. FWD-talan (5%) er tortryggileg. Föst blöndun er valin sem
of-fittunar-vörn — sama ákvörðun sem var tekin með premium-liðnum.

#### Stöðugleiki

| Staða | Val per haldið tímabil | Dómur |
|---|---|---|
| GK | 30 · 30 · 35 · 45 · 40 | stöðugt |
| DEF | 60 · 65 · 55 · **85** · 65 | **óstöðugt — varúð** |
| MID | 45 · 45 · 45 · 45 · 50 | mjög stöðugt |
| FWD | 30 · 35 · 25 · 20 · 20 | stöðugt |

DEF er flaggað óstöðugt (eitt tímabil valdi 85%). Út-af-úrtaki árangur er samt
góður (0,3033), og flata yfirborðið þýðir að 65% er óhætt val.

### ÞRJÁR VIÐBÆTUR — MÆLDAR

#### 1. Lifandi lokalínur (stærsta viðbótin)

Odds-kallið sækir nú `h2h,totals,**spreads**` (3 kredit/dag = 90/mán af 500).

**Bakprófuð aðferð** (380 leikir):
1. λ heildarmarka leyst úr yfir/undir-**líkum** með Poisson-inversion — línan
   sjálf (2,5) er viðmið, ekki vænting.
2. Handicap skiptir mörkunum: `heima = (λ − AH) / 2`.
   **FORMERKI STAÐFEST:** negatíft AH = heimalið favorít. Öfuga túlkunin gaf
   1,306 heima á móti raunverulegum 1,526 — víxlaði liðunum.
3. Kvörðun **−4,1%** — líkanið mældist systematískt bjartsýnt (2,864 á móti 2,750).

`odds.json` skrifar nú `diff` á sama 1–5 kvarða sem framendinn notar, plús
`method` (`totals+spreads` eða `totals+h2h` sem fallback) og `lambda`.

Framendinn blandar **60% markaður / 40% mælda formúla** — markaðurinn er betri
(r 0,374 á móti 0,283) en formúlan hefur liðsstyrk sem markaðslínan getur misst.

Dæmi: Wolves v Man City, AH +1 → City þyngd **1,56**, Wolves **3,11**. Raun 0-4.

#### 2. Sóknar-umbreytingin fittuð

| Form | r (FWD) |
|---|---|
| Gagnstætt `LG/xg` (áður) | 0,1821 |
| **Línulegt `2 − xg/LG`** | **0,1869** |
| Log | 0,1853 |
| Veldi 0,5 / 1,5 | 0,1744 / 0,1759 |

#### 3. Elo — prófað með OKKAR EIGIN útreikningi

ClubElo-sagan var ekki fáanleg (elo.json er aðeins 2026/27), svo ég **reiknaði
Elo sjálfur** úr E0-úrslitum 9 tímabila: K=20, heimavöllur 60 stig,
markamunar-vog, 25% aðhvarf að meðaltali milli tímabila.

Raðar rétt: 25/26 Arsenal 1739 · Man City 1715 · Man United 1635 — sem passar
við lokastöðuna (85/78/71 stig).

**Elo-munur slær mörk sem inntak á öllum stöðum:**

| Staða | Mörk (vörn) | Elo eigin | **Elo-munur** |
|---|---|---|---|
| GK | 0,088 | 0,071 | **0,124** |
| DEF | 0,157 | 0,151 | **0,222** |
| MID | 0,192 | 0,220 | **0,243** |
| FWD | 0,113 | 0,141 | **0,163** |

**En inni í samsetta stuðlinum hjálpar hann aðeins sóknarstöðum:**

| Staða | Án Elo | Með Elo | Vog |
|---|---|---|---|
| GK | 0,161 | 0,161 | 0,00 |
| DEF | 0,282 | 0,282 | 0,00 |
| MID | 0,285 | **0,290** | 0,15 |
| FWD | 0,182 | **0,189** | 0,30 |

Samsett með línulega forminu: **FWD 0,1909** (upp úr 0,1821).

### FRAMHALDS-TILRAUNIR — hvað bætir spágildið?

#### Hjálpa fleiri þrep? JÁ, sex eru betri en fimm

Þrepun **tapar** upplýsingum úr samfellda stuðlinum:

| Staða | Samfellt | 3 þrep | 5 þrep | **6 þrep** | 8 þrep |
|---|---|---|---|---|---|
| GK | 0,161 | 0,160 | 0,151 | **0,162** | 0,157 |
| DEF | 0,278 | 0,252 | 0,267 | **0,268** | 0,271 |
| MID | 0,282 | 0,258 | 0,270 | **0,276** | 0,277 |
| FWD | 0,182 | 0,169 | 0,172 | **0,179** | 0,180 |

Sex þrep tapa minna en fimm. Appið notar nú **sex þrep OG sýnir töluna**,
svo ekkert tapast í raun.

#### Liðsstyrks-inntak — hvað mælist best?

| Staða | Mörk | Skot á mark | Blanda | 2 tímabil |
|---|---|---|---|---|
| GK | **0,161** | 0,156 | 0,160 | 0,159 |
| DEF | 0,278 | 0,278 | **0,282** | 0,277 |
| MID | 0,282 | 0,280 | 0,286 | **0,294** |
| FWD | **0,182** | 0,170 | 0,180 | 0,184 |

**Skot á mark EIN eru verri en mörk** — þótt þau séu stöðugri. FPL gefur stig
fyrir mörk, svo mörk eru beinni mælikvarði.

Samsett leit (skot-hlutfall × 2-tímabila vog):

| Staða | Núverandi | Best | Stillingar | Bæting |
|---|---|---|---|---|
| GK | 0,161 | 0,161 | — | +0,0002 |
| DEF | 0,278 | **0,282** | skot 0,50 | +0,0041 |
| MID | 0,282 | **0,297** | skot 0,20 · prev 0,45 | **+0,0143** |
| FWD | 0,182 | 0,184 | prev 0,30 | +0,0018 |

**Aðeins DEF og MID tekið inn.** GK (+0,0002) og FWD (+0,0018) eru innan
hávaða og að stilla þau væri of-fittun á 2.720 sýni.

### ENDANLEGUR SAMANBURÐUR — ÞRJÁR FDR-ÚTGÁFUR, 5 TÍMABIL

2.720 lið-leikir 2021/22–2025/26. Liðsstyrkur alltaf úr fyrra tímabili.
Krossprófað (læra á 4 tímabil, prófa á það fimmta).

#### A. Fylgni við raunveruleg stig per leikmann

| Staða | FPL-opinbert | Okkar gamla | **Okkar nýja** | Vs FPL |
|---|---|---|---|---|
| GK | +0,140 | +0,158 | **+0,161** | +15% |
| DEF | +0,236 | +0,267 | **+0,278** | +18% |
| MID | +0,202 | +0,252 | **+0,282** | **+40%** |
| FWD | +0,117 | +0,156 | **+0,182** | **+56%** |
| **Meðal** | +0,174 | +0,208 | **+0,226** | **+30%** |

#### B. Aðgreiningarhæfni — stig í léttasta vs þyngsta fimmtungi

| Staða | FPL-opinbert | Okkar gamla | Okkar nýja |
|---|---|---|---|
| GK | +0,92 | **+1,20** | +1,17 |
| DEF | +1,39 | +1,75 | **+1,96** |
| MID | +0,77 | +1,20 | **+1,34** |
| FWD | +0,94 | +1,43 | **+1,78** |

Fyrir framherja **næstum tvöfaldast** spönnin (+0,94 → +1,78).

#### C. Praktískt próf — velja léttustu leiki per stöðu

Meðalstig per valinn leikmann:

| Staða | FPL | Gamla | **Nýja** | Allir |
|---|---|---|---|---|
| GK | 3,92 | 3,90 | **4,09** | 3,43 |
| DEF | 3,71 | 3,96 | **4,11** | 3,05 |
| MID | 3,68 | 4,05 | **4,18** | 3,46 |
| FWD | 4,40 | 4,74 | **5,21** | 4,10 |

Framherjar: **+0,81 stig per leik** yfir opinbert FDR. Yfir fimm umferðir ~4 stig.

#### D. Stöðugleiki — 13 af 15 tilvikum bötnuðu

| Tímabil | DEF | MID | FWD |
|---|---|---|---|
| 2021-22 | ✓ | ✓ | ✓ |
| 2022-23 | ✗ (flatt) | ✓ | ✓ |
| 2023-24 | ✓ | ✓ | ✗ |
| 2024-25 | ✓ | ✓ | ✓ |
| 2025-26 | ✓ | ✓ | ✓ |

Tveir brestir: DEF 2022/23 stóð í stað (0,267 → 0,264), FWD 2023/24 versnaði
(0,158 → 0,145). Það er 13% brestahlutfall — bætingin er sterk en ekki einhliða.

### HEIMAVÖLLUR — MÆLDUR

**Pöruð greining** (sama liðapar, bæði áttir — liðsstyrkur eyðist úr jöfnunni):

| | Síðustu 4 tímabil | Öll 9 tímabil |
|---|---|---|
| Samanburðir | 1.520 | 3.420 |
| Mörk skoruð | **+0,283** | +0,262 |
| Mörk á sig | −0,283 | −0,262 |
| Stig | **+0,391** | +0,348 |
| Hreint blað | **+5,4pp** | +6,6pp |

Marktækt: staðalvilla stiga 0,042 → níu staðalvillur.

**NÁTTÚRULEG TILRAUN:** 2020/21 (COVID, engir áhorfendur) gaf **+0,01 mörk** —
heimavöllurinn hvarf nánast. Áhorfendur eru vélbúnaðurinn, ekki ferðalög eða
kunnugleiki á vellinum.

| Tímabil | Munur í mörkum |
|---|---|
| 17/18 | +0,38 |
| 18/19 | +0,32 |
| 19/20 | +0,31 |
| **20/21** | **+0,01** ← engir áhorfendur |
| 21/22 | +0,21 |
| 22/23 | +0,42 |
| 23/24 | +0,32 |
| 24/25 | +0,09 |
| 25/26 | +0,30 |

**Fantasy-stig, parað á LEIKMANN** (5 tímabil, ≥60 mín, ≥5 leikir hvor átt):

| Staða | n | Forskot heima | Staðalvilla | Marktækt |
|---|---|---|---|---|
| FWD | 157 | **+0,735** | 0,124 | ✓ |
| DEF | 575 | **+0,507** | 0,057 | ✓ |
| MID | 637 | +0,297 | 0,052 | ✓ |
| GK | 123 | +0,197 | 0,102 | á mörkum |

**Þyngdar-stuðlar eru EFTIRSTÖÐVAR, ekki hráa forskotið.** FDR gefur þegar
lægra gildi heima, svo við bætum aðeins því við sem FDR **missir**:

| Staða | Hrátt forskot | Þyngdar-stuðull | Bæting í r |
|---|---|---|---|
| FWD | +0,735 | **0,24** | +0,011 |
| MID | +0,297 | **0,16** | +0,010 |
| DEF | +0,507 | **0,08** | +0,003 |
| GK | +0,197 | 0,02 | ~0 |

Röðin er önnur af þessari ástæðu: FDR fangar næstum allt heimavallar-forskot
varnarmanna (hreint blað), en mun minna af forskoti framherja.

**Dæmi** — Liverpool gegn Chelsea, FDR 3 í bæði áttir:

| Staða | Heima | Úti | Munur |
|---|---|---|---|
| GK | 2,94 | 2,98 | 0,04 |
| DEF | 2,87 | 3,03 | 0,16 |
| MID | 2,77 | 3,09 | 0,32 |
| FWD | **2,53** | **3,01** | **0,48** |

### SÉR-LEIKJAÞYNGD PER STÖÐU — MÆLT

Grid-leit með krossprófun yfir 5 tímabil (2.720 lið-leikir, liðsstyrkur úr
fyrra tímabili). Markmið: **raunveruleg meðalstig per leikmann** í stöðunni.

| Staða | FDR | Eigin styrkur | Andstæðingur | Umbreyting |
|---|---|---|---|---|
| GK | 0,45 | 0,45 | 0,10 | varnar |
| DEF | 0,45 | 0,50 | 0,05 | varnar |
| MID | 0,40 | 0,60 | 0,00 | **varnar** |
| FWD | 0,40 | 0,60 | 0,00 | sóknar |

**Krossprófuð fylgni við raunstig:**

| Staða | Hrátt FDR | Ein formúla | Sér per stöðu |
|---|---|---|---|
| GK | +0,140 | +0,158 | **+0,161** |
| DEF | +0,236 | +0,267 | **+0,275** |
| MID | +0,202 | +0,252 | **+0,272** |
| FWD | +0,117 | +0,156 | **+0,171** |

**TVENNT ÓVÆNT:**

1. **Andstæðingurinn vegur nánast núll** (0,00–0,10). FDR fangar hann þegar,
   svo sér-liður fyrir hann er nær óþarfur. Það sem bætir er **eigin styrkur**.
2. **Miðjumenn nota varnar-umbreytinguna.** Þeir fá hreint-blað-stig og eigin
   varnarstyrkur spáir betur en sóknarstyrkur.

**Mældir flokkar (kvantílar, allir einrænir) — meðalstig per leikmann:**

| Þrep | GK | DEF | MID | FWD |
|---|---|---|---|---|
| A (léttast) | 3,92 | 3,86 | 4,13 | 4,86 |
| B | 3,81 | 3,53 | 3,62 | 4,53 |
| C | 3,38 | 3,20 | 3,45 | 4,07 |
| D | 3,32 | 2,72 | 3,30 | 3,69 |
| E (þyngst) | 2,72 | 1,93 | 2,82 | 3,40 |
| **Spönn** | **1,20** | **1,93** | **1,31** | **1,46** |

Varnarmenn hafa mestu spönn — 1,93 stig per leikmann per leik, eða ~10 stig
yfir fimm umferðir.

**Dæmi um hvers vegna sér-þyngd skiptir máli:** Sunderland gegn Ipswich er
þrep **A** fyrir vörn og markvörð, en þrep **D** fyrir framherja — því
Sunderland skoraði 0,92 mörk per leik. Ein tala hefði falið það.

### FYRRI KVÖRÐUN — FIMM TÍMABIL, 2.720 LIÐ-LEIKIR

Nýi samsetti stuðullinn (FDR 0,45 + eigin styrkur 0,35 + andstæðingur 0,20)
mældur gegn **raunverulegum fantasy-útkomum** 2021/22–2025/26.
Liðsstyrkur alltaf úr **fyrra tímabili** → ekkert leki.

| Markmið | FDR | Nýr stuðull | Bæting |
|---|---|---|---|
| Hreint blað | +0,170 | **+0,190** | +12% |
| Mörk á sig | +0,276 | **+0,289** | +5% |
| Varnarmanna-stig | +0,207 | **+0,241** | +16% |
| Markmanna-stig | +0,126 | **+0,152** | +21% |
| Sóknar-stig (MID+FWD) | +0,171 | **+0,226** | +32% |

**Bætingin er jákvæð í öllum fimm tímabilum**, aldrei negatíf (+0,005 til +0,057).

**Staðsetningarnæmt skiptir máli:** varnar-útgáfan er best fyrir varnarmenn og
markverði, sóknar-útgáfan fyrir miðju og sókn (+0,226 á móti +0,214).

#### Mældir flokkar — `MEASURED` í appinu

| Þyngd | n | CS% | Á sig | Varnarst. | Markm.st. | Sóknarst. |
|---|---|---|---|---|---|---|
| 1,0–2,2 | 214 | **40,2%** | 1,00 | 18,8 | 4,2 | 31,2 |
| 2,2–2,6 | 518 | 30,3% | 1,11 | 17,3 | 4,2 | 29,9 |
| 2,6–3,0 | 660 | 28,5% | 1,28 | 15,1 | 3,8 | 28,0 |
| 3,0–3,4 | 659 | 22,8% | 1,53 | 13,9 | 3,5 | 26,3 |
| 3,4–5,0 | 669 | **13,0%** | 1,99 | 10,2 | 3,0 | 22,8 |

Fullkomlega einræn á öllum fimm mælikvörðum. **Litaþrepin fimm í appinu eru
þessi bil** — ekki valin tala, heldur mældir flokkar.

Til samanburðar nær hrátt FDR aðeins 31,8% (FDR 2) niður í 9,8% (FDR 5).
Nýi stuðullinn finnur **214 leiki með 40,2% CS-tíðni** sem FDR fleygir saman
við FDR 2.

### GAMLA KVÖRÐUNIN (FDR-lyklað, 1.102 leikir)

**1.102 leikir yfir 3 tímabil, FDR borið við LOKALÍNUR markaðarins:**

| FDR | Raun mörk á sig | Markaður spáði | Raun CS% |
|---|---|---|---|
| 1 | 0,76 | 1,00 | 43,9% |
| 2 | 1,19 | 1,20 | 28,7% |
| 3 | 1,44 | 1,45 | 24,5% |
| 4 | 1,82 | 1,83 | 13,9% |
| 5 | 2,25 | 2,24 | 8,8% |

**FDR er RÉTT KVARÐAÐ að meðaltali** — nánast eins og markaðurinn.

**Vandinn er UPPLAUSN, ekki skekkja.** Innan „FDR 3" er markaðs-breiddin
**0,61–2,75 mörk**. 16% af FDR-3 leikjum eru mun erfiðari en talan segir,
14% mun léttari. Markaðurinn er 1,3× betri spá (r 0,374 á móti 0,283) af
þessari ástæðu einni.

**Lausn í appinu:** samfelld þyngd = FDR 0,45 + eigin styrkur 0,35 +
andstæðingur 0,20 (mældar vogtölur), brúað gegn töflunni að ofan.
Dæmi: Arsenal og Man Utd eru bæði FDR 2, en fá 35% og 28% því vörnin
þeirra var 0,71 á móti 1,32 mörk á sig.

**Gluggalengd — MÆLT (400 lið-leikir):** heilt fyrra tímabil er BEST
(r +0,236 samsett). Síðustu 6 leikir eru VERST (+0,182 — verra en FDR eitt).
Nýleg gögn eru of hávaðakennd á lið-stigi. **Regla: nýleg gögn fyrir
leikmenn, heilt tímabil fyrir lið.**

### `rotation.json`
`{ rows: [{ fpl_id, event, kickoff_time, rest_days,
euro_before, euro_after, euro_competition }] }`

**`rest_days` ER UPPLÝSING, EKKI HÆTTUMERKI (29.7.2026).** Mælt á 10.448
leikjum með skammri hvíld: 27,0% spila 60+ mínútur eftir <4 daga hvíld á móti
27,3% annars — ekkert forspárgildi. „<4 daga hvíld"-talningin var því tekin úr
`status.json`; `rest_measured` í skránni geymir tölurnar. Evrópu-nálægð er
**ómæld** og heldur sér.

`rest_days` úr **kickoff-tíma**, yfir allar keppnir. `euro_before`/`euro_after`
= Evrópu-/bikarleikur 2–4 dögum fyrir/eftir. Þau eru `false` þar til dráttur
er gerður — það er rétt, ekki vöntun.

---

## Veður

### `weather.json`
`{ fixtures: [{ fixture_id, kickoff, temp_c, precip_mm, wind_kmh, gust_kmh }] }`

Open-Meteo nær **~16 daga**. Fjarlægari leikir fá `null`, **ekki ágiskun**.
Framendinn verður að þola `null`.

---

## BSD (Bzzoiro Sports Data) — skot, xG og leikmannatölur

> **UNDERSTAT-KAFLINN SEM VAR HÉR ER FARINN.** Hann lýsti
> `understat/season.json`, `understat/match/{id}.json` og
> `understat/big_chances.json` — **engin þeirra var nokkurn tíma til**
> (`data/understat/` er ekki til og hefur aldrei verið), og heimildin
> sjálf var tekin úr `fetch.mjs`. Skjölun á skrám sem eru ekki til er
> verri en engin skjölun: hún lætur næsta mann leita að gögnum sem hann
> mun aldrei finna.

### `bsd_players.json` — leikmanna-samtölur fyrir lokið tímabil
`{ updated, source, league_id, season_id, season, matches, measured, note,
   players_total, players_matched_to_fpl, unmatched, unmatched_names, players[] }`

Hver röð: `bsd_id, name, pos, team, fpl_id, code, apps, minutes, rating,
goals, assists, shots, xg, xg_per_shot, big_chances, shots_in_box,
shots_out_box, sp_shots, sp_xg, op_xg, sp_xg_share, head_shots, head_xg,
pen_shots, np_xg, woodwork, key_pass, crosses, crosses_acc, touches,
dribbles, dribbles_won, duels_won, duels_lost, aerials…`

**PÖRUNIN VIÐ FPL ER KROSSPRÓFUÐ, EKKI VONAST TIL.** Mælt á öllum 393
pörunum gegn `season_baseline.json`: **0 raðir með mínútu-frávik yfir 90**
(mesta 90 = einn leikur), 2 marka-frávik, og 47 assist-frávik **öll í sömu
átt** — það er skjalfesti munurinn á FPL- og Opta-skilgreiningu (FPL gefur
assist fyrir unnið víti). Vörður: `tests/bsd.mjs` kafli 3.

### `bsd_shots.json` — hvert einasta skot með hnitum
`{ updated, season, calib, shots: [{ code, team, gw, x, y, xg, sit, res, gm… }] }`

**`calib` ER Í SKRÁNNI SJÁLFRI** svo völlurinn og deplarnir geti ekki rekið
í sundur — `ShotMap.jsx` les hana þaðan og teiknar aldrei eftir harðkóðuðum
kvarða. `x` er hlutfall af **FULLUM** velli (105 m), ólíkt ESPN sem er
hlutfall af hálfum. Að rugla þeim saman gefur tvöfalda fjarlægð (sú villa
var raunveruleg í ESPN-kortinu, sjá CLAUDE.md).

### `bsd_teams.json` / `bsd_odds.json`
Liða-samtölur og markaðslínur úr sömu heimild. `bsd_odds` er **valfrjáls**
viðbót við `odds.json`, ekki staðgengill.

### `bsd_live.json` — YFIRSTANDANDI tímabil
Skrifuð af `fetchBsdLive()`. **Er ekki til í forleik** og það er rétt:
`record("bsd_live", true, 0, "no season")`. Framendinn sækir hana og þolir
404 — prófað í `tests/untrusted-input.mjs` og `data-resilience.mjs`.

---

## Óútfært

| Skrá | Bíður |
|---|---|
| `minutes.json` | live-gögn (21. ágúst) |
| `bps.json` | live-gögn |
| `set_pieces.json` | klúbbnótur (spyrnuröð er þegar í `players.json`) |

`luck.json` **er komin** og tréverkið kemur nú úr BSD (`woodwork`), ekki úr
Understat. Vörpunarskráin sem áður var áformuð fyrir Understat-auðkenni á
ekki lengur við — BSD ber `fpl_id` og `code` beint.

---

## SKRÁR SEM VANTAÐI Í ÞETTA SKJAL (bætt við 9.8.2026)

Vélræn athugun (`ls data/*.json` borið við þetta skjal) fann **fimmtán**
skrár sem enginn kafli nefndi — þar af allar fjórar BSD-skrárnar og þessar
sex. Skjalið er tilvísunin sem CLAUDE.md kafli 7 bendir á, svo gat í því er
gat í leiðarvísinum.

### `season_baseline.json` — LOKATÖLUR fyrra tímabils
`{ updated, label: "2025/26", note, players: [{ id, total_points, minutes,
points_per_game, starts, goals_scored, assists, expected_goals,
expected_assists, clean_sheets, yellow_cards, red_cards }] }`

**Lyklað á FPL `id`, EKKI `code`.** (BSD-skrárnar eru lyklaðar á `code`, sem
er fast yfir tímabil — þær tvær má því ekki para saman í hugsunarleysi.)
Skrifað daglega **fram að GW1**, frýs svo. Viðmiðið sem BSD-pörunin er
krossprófuð gegn.

### `imminent.json` — mó/aó (yfirvofandi framlag)
`{ updated, season, archive, gws, window, start_window, fetched_gws, players }`
`archive: true` þýðir **fyrra tímabil** — í forleik er það rétt gildi.
Ber `xa` í hverjum glugga; ef hún hyrfi myndi mó-formúlan lesa 0 og bætingin
hverfa **þegjandi**. Vörður: `tests/stats.test.mjs`.

### `injuries.json` — TEGUND meiðsla (API-Sports)
`{ updated, plan, via, note, players, unmatched }`
**FPL-status ræður áfram tiltækileika**; þetta auðgar hann bara („Hamstring
Injury"). `via` segir hvers vegna hún er tóm — í forleik: engir leikdagar
innan ±1 dags glugga fría þrepsins.

### `team_shots.json` — liða-skot per svæði
`{ updated, season, source, matches, note, no_zone, no_team, … }`
`no_zone`/`no_team` eru **taldir**, ekki huntir — röð án svæðis er
upplýsing um heimildina, ekki rusl.

### `clubelo_history.json` / `fpl_fdr_history.json` — BAKPRÓFA-GÖGN
Bæði `{ updated, source, note, seasons }`. **Framendinn les hvoruga** —
þær fæða `tests/lib/e0.mjs` og bakprófin. `fpl_fdr_history` geymir
raunverulegt `team_h_difficulty`/`team_a_difficulty` per leik 1819–2526, sem
er ástæða þess að FFDR-samanburðurinn er við ALVÖRU FDR en ekki nálgun.

## Ekki fáanlegt

**Spáð byrjunarlið** — engin frí, áreiðanleg heimild.
**Landsleikja-boð per leikmann** — FPL hefur ekki þjóðerni.
**Progressive passes, pressures, hlaupagögn** — aðeins greitt (Stats Perform).
**openfootball bikarar** — lagt niður eftir 2024-25.

---

## VIÐAUKI: RAUNVERULEGAR CSV-HEADER-RAÐIR

**Regla:** aldrei treysta skjölun. `notes.txt` hjá football-data.co.uk er
orðabók yfir **allar deildir og öll tímabil** með klausunni *where available*
— ekki skema fyrir E0. Pipeline-inn prentar raunverulega header-röð í hverri
keyrslu og hún er skjalfest hér.

### Kolónufjöldi per tímabil

| Tímabil | Kolónur |
|---|---|
| 17/18 | 65 |
| 18/19 | 62 |
| 19/20 | 106 |
| 20/21 | 106 |
| 21/22 | 106 |
| 22/23 | 106 |
| 23/24 | 106 |
| 24/25 | 120 |
| 25/26 | 132 |

### E0-2526 — öll 132 kolónuheiti, í röð

```
Div, Date, Time, HomeTeam, AwayTeam, FTHG, FTAG, FTR
HTHG, HTAG, HTR, Referee, HS, AS, HST, AST
HF, AF, HC, AC, HY, AY, HR, AR
B365H, B365D, B365A, BFDH, BFDD, BFDA, BMGMH, BMGMD
BMGMA, BVH, BVD, BVA, BWH, BWD, BWA, CLH
CLD, CLA, LBH, LBD, LBA, PSH, PSD, PSA
MaxH, MaxD, MaxA, AvgH, AvgD, AvgA, BFEH, BFED
BFEA, B365>2.5, B365<2.5, P>2.5, P<2.5, Max>2.5, Max<2.5, Avg>2.5
Avg<2.5, BFE>2.5, BFE<2.5, AHh, B365AHH, B365AHA, PAHH, PAHA
MaxAHH, MaxAHA, AvgAHH, AvgAHA, BFEAHH, BFEAHA, B365CH, B365CD
B365CA, BFDCH, BFDCD, BFDCA, BMGMCH, BMGMCD, BMGMCA, BVCH
BVCD, BVCA, BWCH, BWCD, BWCA, CLCH, CLCD, CLCA
LBCH, LBCD, LBCA, PSCH, PSCD, PSCA, MaxCH, MaxCD
MaxCA, AvgCH, AvgCD, AvgCA, BFECH, BFECD, BFECA, B365C>2.5
B365C<2.5, PC>2.5, PC<2.5, MaxC>2.5, MaxC<2.5, AvgC>2.5, AvgC<2.5, BFEC>2.5
BFEC<2.5, AHCh, B365CAHH, B365CAHA, PCAHH, PCAHA, MaxCAHH, MaxCAHA
AvgCAHH, AvgCAHA, BFECAHH, BFECAHA
```

### Hvað er STAÐFEST til (öll 9 tímabil)

| Svið | Staða |
|---|---|
| `Referee` | ✓ öll tímabil |
| `HF`, `AF` (brot) | ✓ öll tímabil, engar tómar raðir → **`fouls_per_match` er GILT** |
| `HY`,`AY`,`HR`,`AR` (spjöld) | ✓ öll tímabil |
| `HS`,`AS`,`HST`,`AST` (skot) | ✓ öll tímabil |
| `HC`,`AC` (horn) | ✓ öll tímabil |

### Hvað er AFSANNAÐ — aldrei til í E0

Athugað í öllum níu tímabilum (1718–2526):

`Attendance`, `HHW`/`AHW` (stöng/þverslá), `HFKC`/`AFKC`, `HO`/`AO`, `HBP`/`ABP`

Heppnismælir byggður á stangarskotum verður að koma frá **Understat**
(`result: "ShotOnPost"`) — sem er í raun betra, því það er per SKOT og gefur
því tölu per LEIKMANN, ekki per leik.

---

## `last_gw.json` — SÍÐASTA LOKNA UMFERÐIN (flipinn „Umferðin")

Skrifað af `deriveLastGwReport()`. **SJÁLFSTÆÐ skrá:** hún ber sín eigin nöfn,
lið og stöður og er EKKI pöruð við `players.json` á `element`-id, því FPL
endurnýtir id milli tímabila — safn-skýrsla pöruð á id myndi birta vitlaus nöfn.

```
updated   ISO
season    "2025/26"      artalid sem gogn eiga vid
gw        38
archive   true|false     true = FYRRA timabil (ekki yfirstandandi)
source    "fpl-live" | "vaastav-mirror"
note      skyring a islensku — BIRT i vidmotinu
missing   { shot_map, avg_position, touches_in_box, big_chances, woodwork, measured }
          hvad VANTAR og hvers vegna. Vidmotid a ad birta thetta, ekki thegja.
fixtures  [ { id, h, a, h_score, a_score, kickoff,
              stats: { shots_h, shots_a, sot_h, sot_a, corners_h, corners_a,
                       fouls_h, fouls_a, yellow_*, red_*, ht_h, ht_a, referee } | null } ]
          stats = football-data.co.uk E0, parad a (dagsetning, heimalid, utilid).
          Maelt: 10/10 i GW38 2025/26.
players   [ { id|null, name, pos GK|DEF|MID|FWD, team, opp, home, fixture, multi,
              value, minutes, points, starts, goals, assists, cs, gc, og, saves,
              pens_saved, pens_missed, yellow, red, bonus, bps,
              xg, xa, xgi, xgc, dc, tackles, recoveries, cbi,
              influence, creativity, threat, ict, xp } ]
```

**Tvær leiðir, sama lögun.** Í tímabili: `data/live/gw{n}.json` + `fixtures.json`
+ `E0-2627`. Fyrir tímabil (engin lokin umferð til): síðasta lokna umferð fyrra
tímabils úr vaastav-speglun FPL-gagna á GitHub + `E0-2526` sem við höfum þegar.

## `last_gw_shots.json` — SKOT MEÐ HNITUM (ESPN)

Skrifað af `fetchEspnShots()`. Sjá kafla 6b í `CLAUDE.md` fyrir mælingarnar.

```
season, gw, archive, source "espn-site-api"
note      hnitakerfid skyrt
caveats   { no_xg, excluded, no_touches }   TAKMARKANIR, birtar i vidmotinu
fixtures  [ { fixture, espn_event, h, a, h_score, a_score,
              formation_h, formation_a,        "4-2-3-1" — UPPSTILLING, ekki maeld stada
              team_stats: { h:{...}, a:{...} },
                possessionPct, totalPasses, accuratePasses, passPct,
                totalShots, shotsOnTarget, blockedShots, totalCrosses,
                totalTackles, interceptions, totalClearance, offsides, saves ...
              lineup: [ { name, team, pos, starter, formation_place,
                          shots, sot, fouls, fouled, saves, shots_faced } ] } ]
shots     [ { fixture, espn_event, team, player,
              kind  goal|on_target|off_target|blocked|woodwork|own_goal,
              minute, period,
              x, y      x = FJARLAEGD FRA SOTTA MARKINU sem HLUTFALL AF HALFUM
                        VELLI -> metrar = x * 52,5  (EKKI * 105; kvardad gegn
                        svaedis-texta ESPN: markteigur 0,105 / teigur 0,314).
                        y = thvert yfir vollinn (0..1 af 68 m).
              usable    false adeins ef hnit vantar eda eru (0,0) = oskrad
              zone      box_centre|box_left|box_right|close_range|penalty_spot|outside|far
              in_box    bool|null   — LESID UR TEXTA ESPN, ekki reiknad ur hnitum
              foot      left|right|head
              text      upprunalegi ESPN-textinn (rekjanleiki) } ]
players   [ { name, team, shots, on_target, off_target, blocked, woodwork, goals, in_box } ]
```

**Woodwork er hér** (`kind:"woodwork"`, ESPN-tegundin `Shot Hit Woodwork`) — það
er heimildin sem Understat átti að gefa en gefur ekki lengur.
**xG per skot er EKKI hér** og því eru *big chances* ekki reiknuð.

---

## `player_seasons.json` — LOKATOLUR FYRRI TIMABILA (uppfaert 29.7.2026)

Skrifad af `fetchPlayerSeasons()`. **LYKLAD A `code`, EKKI `id`** — FPL
endurnytir element-id milli timabila, svo id-porun syndi vitlausan leikmann.

```
updated, seasons ["2025/26","2024/25","2023/24"], key "code"
pool_sizes  { "2025/26": 537, ... }   fjoldi sem SPILADI hvert timabil
field_availability { svid: [timabil sem hafa thad] }
missing_note  DC kom fyrst 2025/26 -> null fyrir eldri, EKKI 0
players { <code>: { "<timabil>": {
    code, id, element_type, web_name, now_cost,
    -- MED SAETUM (SEASON_STATS): total_points, minutes, starts,
       goals_scored, assists, expected_goals(+_per_90),
       expected_assists(+_per_90), expected_goal_involvements(+_per_90),
       expected_goals_conceded, clean_sheets, goals_conceded, saves,
       bonus, bps, defensive_contribution, points_per_90, dc_per_start
    -- BORIN AFRAM (SEASON_CARRY, engin saeti): points_per_game, form,
       ict_index, influence, creativity, threat, selected_by_percent,
       yellow_cards, red_cards, own_goals, penalties_missed,
       penalties_saved, dreamteam_count, clearances_blocks_interceptions,
       tackles, recoveries, starts_per_90, saves_per_90,
       clean_sheets_per_90, goals_conceded_per_90,
       expected_goals_conceded_per_90, defensive_contribution_per_90,
       value_season, value_form, cost_change_start
    rank    { svid: saeti }      innan TIMABILS
    rank_of { svid: fjoldi }     nefnari = ALLIR sem spiludu, EKKI siun
    played  bool
} } }
```

**TVAER SIUR SEM MA EKKI RUGLA SAMAN:**
1. Skrain heldur adeins leikmonnum sem eru I DEILDINNI NUNA (935 af 1420
   sleppt, -63%): framendinn flettir alltaf upp med `code` ur
   `players.json`, svo saga leikmanns sem er farinn er onothaef.
2. **SAETIN eru samt reiknud UR OLLUM sem spiludu** (537, ekki 485).
   Prof stadfestir ad 485 komi hvergi fram sem nefnari.

`SEASON_CARRY` var baett vid 29.7. svo SOMU dalkarnir virki i
leikmannalistanum yfir oll timabil — adur virkudu adeins 31 af 108
STAT_DEFS a sogulegri rod, nu 74.


---

## `player_gw_{season}.json` — per-umferðar tölur (31.7.2026)

Fimm skrár: `player_gw_2122` … `player_gw_2526`. Grunnurinn undir
**umferðar-bil** í leikmannalistanum („bara GW 30–38 síðasta tímabil").

```
{ season:"2526", label:"2025/26",
  stats: ["mins","starts","pts","goals","assists","cs","gc","saves","bonus",
          "bps","xg","xa","xgc","dc","cbit","threat","creat","infl",
          "recov","tack","yc","rc"],
  scale: { xg:100, xa:100, xgc:100, creat:10, infl:10, threat:1 },
  players: { "<code>": { t:"Arsenal", p:"MID", gw: { "1":[...22 tölur], ... } } } }
```

**EIN SKRÁ PER TÍMABIL, LETIHLAÐIN.** `fpl_player_gw.json` er **19 MB** og því
ónothæf í vafra. Mælt 31.7.: þjappaða sniðið er **1,2–1,5 MB per tímabil
(≈0,21 MB gzip)**; öll fimm í einni skrá væru 7,3 MB (0,87 MB gzip) — gzip er
ekki vandinn, **þáttingin** er.

**LYKILLINN ER `code`, EKKI `id`.** FPL endurnýtir `id` milli tímabila, svo
id-lykill gæfi rangan leikmann í eldra tímabili. `code` er fast. Vörpunin
`element → code` kemur úr `players_raw.csv` per tímabil.

**AÐEINS SAMLAGNINGARHÆFAR TÖLUR.** Verð, eignarhald, FPL-sæti og
`value_season` eru **árstíðartölur** — þær má ekki leggja saman yfir bil og
eru því ekki hér. Afleiddar tölur (per-90, hlutföll, nýting) eru reiknaðar
úr summunum.

**DESIMALAR ERU HEILTÖLU-KVARÐAÐIR** (`xg*100` o.s.frv.); `scale` segir
hvernig lesa skal. Það er ástæðan fyrir að skráin er lítil.

### AFMÖRKUN Á `(code, umferð, DAGSETNING)` — mælt nauðsynleg
FPL á stundum **tvö `element`** fyrir sama mann (nýtt skráningarnúmer á miðju
tímabili) og bæði varpast á sama `code`. Junior Kroupi fékk þá **1826 mínútur
í stað 1663** — umferðir 1–9 tvítaldar. **10 slíkar raðir** í 2025/26, engin í
öðrum tímabilum.

Dagsetningin er rétta skilyrðið, **ekki umferðin ein**: í umferð 33 hafði hann
tvo **raunverulega** leiki (18/04 og 22/04) — tvöföld umferð — og þeir eiga
**báðir** að teljast. Að afmarka á umferð hefði þagað yfir tvöföldum umferðum
hjá öllum leikmönnum.

### Krossprófun gegn óháðri heimild
Summa yfir allar umferðir á að vera jöfn árstíðartölunni í
`player_seasons.json` (annar FPL-endapunktur):

| tímabil | stemmir |
|---|---|
| 2025/26 | **457/457 (100%)** |
| 2024/25 | 347/348 (99,7%) — Ferguson 368 á móti 385 mín |
| 2023/24 | **278/278 (100%)** |

**2022/23 hefur 37 umferðir, ekki 38, og það er rétt:** umferð 7 hefur núll
raðir í heimildinni sjálfri (leikirnir 10.–11. september 2022 frestaðir).
Fyrsta útgáfa varðarins krafðist 38 og **féll á raungögnum** — krafan var
röng, ekki gögnin.

Vörður: `tests/player-gw-range.mjs` (31 próf) — summur, tvítekningar **og**
að tvöfaldar umferðir haldi báðum leikjum, kvörðun desimala, og að GW30–38
gefi raunverulegar tölur (443 leikmenn með mínútur).

---

## `pros.json` — sérfræðinga-hópurinn ("Best of the best")

Skrifuð **handvirkt** af `scripts/scan-elite.mjs`, einu sinni fyrir hvert
tímabil. Ekki hluti af daglegu pipeline.

| svið | merking |
|---|---|
| `built` · `season` | hvenær hópurinn var byggður og fyrir hvaða tímabil |
| `method` | valreglan í einni setningu (mæld, sjá `src/pros.js`) |
| `scanned` · `candidates` | hve mörg lið voru skönnuð og hve mörg komust í úrtakið |
| `panel[]` | `{ id, score, seasons, best, t1, ft, ya, cc }` — **1.000 stjórnendur** |
| `control[]` | **1.000 slembin lið-id** — viðmiðshópurinn, fastur yfir tímabilið |

`score` er **veg­ið meðaltal á log10(lokapersentíli), helmingunartími 3
tímabil**, birt aftur á prósentu-kvarða (0,0132% = liðið endar að jafnaði í
efstu 0,0132%). Lægra er betra.

**Hvers vegna 1.000 en ekki 10:** mælt út fyrir úrtak á 80.000+ raunferlum —
topp-3 eftir fyrri ferli standa sig **verr** en meðaltal topp-100
(afturhvarf til meðaltals), og með 10 mönnum er 60/40 skipting ekki
aðgreinanleg frá hlutkesti (±16 prósentustig). Full röksemdafærsla með
öllum mælingunum er í hausnum á `src/pros.js`.

`ft` = favourite_team (klúbbur hans sjálfs), `ya` = years_active, `cc` =
landskóði. Sótt **einu sinni á ári** (1.000 köll, ~10 sek) því þetta er
stöðugt innan tímabils. `ft` opnar spurningu sem talningin ein getur ekki
svarað: **eiga þeir oftar leikmenn úr sínu eigin félagi?** Klúbb-slagsíðan er
raunveruleg hjá fjöldanum; hvort hópurinn sé laus við hana er ómælt.
Mælt við byggingu: 763 af 1.000 hafa sett félag, allir 1.000 hafa
`years_active` (miðgildi **7**, bil 3–15), og 339 eru enskir, 84 norskir.

**Hópurinn eldist:** valinn á gögnum t.o.m. 2021/22 hélt hann forskoti en
tapaði 29% af því á fjórum árum. Endurbyggðu hann á hverju sumri — árleg
endurbygging heldur ~46% af hópnum.

**Helmingunartíminn var 1,5 og það var mælt á RÖNGU markmiði (breytt
10.8.2026).** Fyrsta valið hámarkaði fylgni (r) yfir alla 44.000 stjórnendur,
og r toppar við h=1,75. En við tökum **topp 1.000**, ekki fylgni. Mælt á fjórum
óháðum tímaskiptingum batnar hópurinn áfram: h=1,5 gefur 0,991% en **h=3,0
gefur 0,929%** (−6,2% í persentíli). Batinn heldur við hverja hópsstærð
(N=100 … 2.000) og með báðum gildis-umbreytingum. Ástæðan er að r ræðst af
**miðjunni** en hópurinn er **ysta taglið**: langt minni greinir varanlega
yfirburði, stutt minni raðar miðjunni.

**Athugasemd um fyrstu byggingu (9.8.2026):** skönnunin sem byggði þennan
hóp geymdi aðeins lið sem áttu **≥2 topp-1% tímabil eða topp-100 sæti** —
sía sem `scripts/scan-elite.mjs` hefur **ekki** (hún skorar alla með ≥3
tímabil). Skekkjan var **mæld** á id-bilinu 1–3000: við skor ≤0,20%, sem er
skurðpunktur hópsins, vantaði **0 af 96**. Fyrst við 0,30% birtist einn
(0,5%). Þeir sem síast burt eiga allir nákvæmlega eitt topp-1% tímabil og
skora undir mörkunum. Næsta bygging notar skriftuna beint og hefur enga síu.

## `pros_gw.json` — hvað hópurinn GERÐI, per umferð

Skrifuð af `collectPros()` (`scripts/pros-collect.mjs`) úr **hröðu**
keyrslunni, strax eftir frest. **Ekki til í forleik** — hún verður til við
fyrstu umferð.

| svið | merking |
|---|---|
| `panel_size` | stærð hópsins (svo þekja sé lesanleg) |
| `gw[N].n` | hve margir **svöruðu** — hlutföll miðast við þessa tölu |
| `gw[N].own` · `capt` · `vice` | talning per leikmanni (sparse) |
| `gw[N].in` · `out` | keypt/selt **í þessari umferð** (síað á `event`) |
| `gw[N].chips` | talning per chip |
| `gw[N].chipIds` | **hvaða lið** spiluðu hvert chip (`{bboost:[id,…]}`) |
| `gw[N].pairs` | **skipta-pör**: `{"út>inn": fjöldi}`, aðeins pör sem 2+ gerðu |
| `gw[N].formations` | `{"3-4-3": 412, …}` — leikstöðukerfi byrjunarliðs |
| `gw[N].benchPos` | `{"1234": 380, …}` — bekkjar-samsetning (raðað) |
| `gw[N].byPos` · `startCost` · `benchCost` | meðal-eyðsla per línu, byrjunarlið, bekkur (tíundir) |
| `gw[N].shapeN` | hve mörg lið gáfu **fullgilt** kerfi (11 þekktar stöður) |
| `gw[N].priceStart` · `priceBench` | **verð-punktar** per stöðu: `{1:{45:700,50:250}}` — svarar „4,5 GK eða 4,0?" |
| `gw[N].points` · `benchPoints` | meðal-stig umferðarinnar og **stig sem sátu á bekknum** |
| `gw[N].autoSubs` | meðalfjöldi sjálfvirkra skiptinga — kom bekkurinn inn? |
| `gw[N].transferMinsMedian` · `transferLateShare` | **hvenær** þeir skipta: mínútur fyrir frest, og hlutfall á síðasta klukkutíma |
| `gw[N].control` | **viðmiðið**: sama talning fyrir 1.000 slembna stjórnendur |
| `gw[N].outcome` | **hvað stóð sig best**: `{byFormation:{"3-4-3":{n,delta}}, panelDelta}` — miðgildi röðunar-breytingar þeirra sömu manna |
| `gw[N].transfers` · `hitCost` · `hitShare` · `value` · `bank` | meðaltöl, `null` ef enginn svaraði |
| `gw[N].rankMedian` | miðgildi heildarraðar hópsins |

**`pairs` og `chipIds` bættust við 10.8.2026 og ástæðan er spurningin sem
flipinn er til fyrir.** `in` og `out` talin sitt í hvoru lagi segja **ekki** að
það hafi verið sama skiptið — „hvað selja þeir til að fjármagna X" var
ósvaranleg. Og „1 spilaði wildcard" gerir ómögulegt að mæla **hvort chip-ið
borgaði sig**: til þess þarf að fylgja sömu mönnum yfir næstu umferðir, svo
lið-id þeirra sem spiluðu eru vistuð (opinber FPL-id, þegar í `pros.json`).

Kostnaður mældur: +15% á skrána (814 → 935 KB yfir tímabil), og hún er
**letihlaðin** svo það kemur fyrstu hleðslu ekki við. Pör sem **aðeins einn**
gerði eru sleppt — eitt par frá einum manni er suð og öll pör væru ~1.200
raðir á umferð.

**Þetta verður ekki til eftir á.** Picks fyrir liðin umferð svara **404** um
leið og tímabilinu lýkur (mælt á GW38 síðasta tímabils), svo það sem er ekki
safnað í vikunni er farið að eilífu.

### Viðmiðshópurinn (`control`) — af hverju hann er nauðsynlegur

„Hópurinn eyðir 15,5 í vörn" er **merkingarlaus tala** án viðmiðs. FPL gefur
viðmið fyrir **eignarhald** (`selected_by_percent`) og fyrir **ekkert annað** —
hvorki leikstöðukerfi, bekkjar-kostnað, verð-punkta né tímasetningu skipta. Án
viðmiðs er ekki hægt að segja hvort nokkuð af því sé sérstakt við þá bestu eða
einfaldlega hvernig FPL er spilað.

`control` er **1.000 slembin, virk lið**, valin með **föstu fræi** svo úrtakið
sé endurgeranlegt, og **fast yfir tímabilið** — annars væri breyting milli vikna
blanda af hegðun og nýju úrtaki. Mælt 10.8.2026: **300 af 300** slembnum
lið-id voru gild og öll byrja í GW1, svo úrtakið þarf enga yfirstærð.

Viðmiðið ber **hvorki `chipIds` né `pairs`** — við fylgjum ekki einstaklingum í
því, og per-stjórnanda sagan er aðeins fyrir hópinn (1.000 til viðbótar myndu
tvöfalda 3,8 MB án þess að svara nýrri spurningu).

## `pros_moves.json` — hvaða stjórnandi gerði hvaða breytingar

Skrifuð af sömu keyrslu og `pros_gw.json`. **Greiningarskrá: appið les hana
aldrei**, svo stærð hennar kemur notandanum ekki við (~1,1 MB yfir tímabil).

```
m: { "<entryId>": { "<gw>": { p:[15 id í stöðuröð], cap:id,
                              t:[[út,inn],…], c:"bboost", r:41250 } } }
```

`p` = **liðið sjálft**, 15 lið-id í **stöðuröð** (fyrstu 11 = byrjunarlið,
12–15 = bekkur í þeirri röð sem hann kemur inn) · `cap` = fyrirliði ·
`t` = skiptin sem **pör** · `c` = chip (sleppt ef ekkert) · `r` = heildarröðun.
Tómum sviðum er sleppt. ~3,8 MB yfir tímabil.

**HRÁTT LIÐ, EKKI AFLEIDDAR TÖLUR — og það er meðvitað.** Verð og staða
leikmanns eru **þegar í repo-inu** (`players.json` og dagleg mynd í
`history/YYYY-MM-DD.json`), svo leikstöðukerfi (4-3-3 / 4-4-2 / 3-5-2),
bekkjar-kostnaður og eyðsla per línu eru **reiknanleg hvenær sem er** út úr
id-unum. Að geyma í staðinn þær tölur sem *við völdum* að reikna læsir
greininguna við það val: spurning sem einhver spyr 2028 — „hversu mikið af
liðinu var úr sama félagi?", „hve oft var varamarkmaður dýrari en 4,0?",
„hvað var skörunin milli tveggja bestu?" — væri ósvaranleg. Hráa liðið
svarar þeim öllum.

**Eftir 2–3 tímabil** er þetta gagnasettið sem svarar spurningunni sem
flipinn er til fyrir: *hvernig stilla þeir sem endast í topp 1% liðinu upp?*
Dýr sókn og ódýr vörn, eða jafnt? Hvað kostar bekkurinn? Hvaða kerfi?

**Hvers vegna þetta verður að vistast jafnóðum:** lið-id í FPL eru
**tímabils-bundin**. Lið 174 í 2026/27 er **nýtt** lið, og `history`
gefur aðeins tímabil/stig/röðun — **engin id**. Id fyrra tímabils er því
ófinnanlegt og `event/{gw}/picks/` svarar **404** um leið og tímabilinu
lýkur (mælt á GW38 2025/26). Innan tímabils gefur `entry/{id}/transfers/`
allan ferilinn í einu kalli; eftir 25. maí er hann **horfinn að eilífu**.

Skráin má aldrei fella söfnunina sjálfa — hún er skrifuð í `try/catch` og
skráir sig sérstaklega í `status` sem `pros_moves`.

**Ein talning, ekki 1.000 lið.** Sama regla og `bsd_shots.json`: við geymum
samtölur, ekki hrá lið — 1.000 hópar × 15 leikmenn × 38 umferðir væri ~20 MB
og þrjár afritanir af sömu tölu geta rekið í sundur.

**Hver umferð er sótt nákvæmlega einu sinni.** Hraða keyrslan gengur á 15–30
mín fresti; óvarið væru þetta ~96.000 köll á dag. Picks breytast ekki eftir
frest. Kvótavörnin er í `collectPros`, ekki í cron — sama regla og annars
staðar í þessu repo-i. Vörður: `tests/pros.mjs` kafli 13.

**Engin tala héðan fer í líkanið.** Sama viðbótarprófun á almenna markaðnum
(4 tímabil, 104.160 leikmanna-umferðir) sýndi að skipta-hreyfing fjöldans
bætir **engu** ofan á `ep_next` (r = −0,0005) og er **neikvæð** meðal þeirra
sem spiluðu í raun (−0,111). Hvort þessi hópur sé öðruvísi er ómælt þar til
~10 umferðir liggja fyrir.
