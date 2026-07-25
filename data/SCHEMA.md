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

### `history/YYYY-MM-DD.json` — dagleg verðmynd
`[{ id, now_cost, cost_change_event, selected_by_percent, transfers_in_event,
transfers_out_event, total_points }]`

Byggir verðbreytinga-tímaröð sem ekkert API selur. ~40 bæti á leikmann.

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
              cbit_per_90, cbirt_per_90 }],
  opportunity: { <fpl_id>: { own_xgc90, opp_attack_avg,
                             defcon_opportunity, fixtures_used } } }
```
`hit_rate` = `threshold_hits / starts`, reiknað **umferð fyrir umferð**.
`defcon_opportunity` 0–100 = vinnuálag varnar. **Aðskilið frá CS%.**

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

### `luck.json`
```
{ result_enum_seen: [...],
  teams:   [{ fpl_id, short, matches, goals, conceded, xg, xgc,
              goals_minus_xg, conceded_minus_xgc,
              woodwork_for, woodwork_against, source, xg_incomplete }],
  players: [{ understat_id, player, shots, woodwork, goals, xg, npxg,
              goals_minus_xg, penalties_taken, penalties_scored,
              freekicks_taken, corners }] }
```

`woodwork` úr Understat `result: "ShotOnPost"` — **per SKOT**, svo það gefur
tölu per leikmann. Það er betra en HHW/AHW hefði verið (sem eru ekki til).

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

## Understat

### `understat/season.json`
`{ season, teams, players, dates, vars_found }`
Tómt fyrir tímabil — EPL-síðan hefur aðeins `PROMOTION` þangað til leikir hefjast.

### `understat/match/{id}.json`
Skot per leik. `result` inniheldur `Goal`, `MissedShots`, `BlockedShot`,
`SavedShot`, **`ShotOnPost`** (heppnismælir), `OwnGoal`.
`situation`: `OpenPlay`, `FromCorner`, `SetPiece`, `Penalty`, `DirectFreekick`
— þetta segir hver tók vítin í **RAUN**, sem stangast oftar á við klúbbnótuna
en maður heldur.

### `understat/big_chances.json`
`{ threshold_xg: 0.30, players: { <understat_id>: { player, missed, xg_sum } } }`
Skot með xG yfir þröskuldi sem fóru **ekki** inn.
Understat-ID ≠ FPL-ID — þarf vörpun.

---

## Óútfært

| Skrá | Bíður |
|---|---|
| `minutes.json` | live-gögn (21. ágúst) |
| `bps.json` | live-gögn |
| `set_pieces.json` | Understat-skot + klúbbnótur |
| `luck.json` | Understat `ShotOnPost` |
| `understat_id_map.json` | vörpun frá vaastav |

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
