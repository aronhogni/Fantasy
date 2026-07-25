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

**EKKI til í E0** (athugað í öllum 9 tímabilum): `Attendance`, `HHW`/`AHW`
(stöng/þverslá), `HFKC`/`AFKC`, `HO`/`AO`, `HBP`/`ABP`.
Heppnismælir byggður á stangarskotum verður að koma frá **Understat**
(`result: "ShotOnPost"`), ekki héðan.

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
