/* ============================================================
   COMPARE.JSX — samanburdur a leikmonnum hlid vid hlid

   TIMABIL **OG** UMFERDAR-BIL (bilid kom 20.8.2026, ad beidni: "bara
   sidustu 8 leikina").

   HER STOD RANGT SVAR OG ThAD VAR BIRT A SKJANUM I TVAER VIKUR:
     "frjalst gameweek-bil krefst per-umferdar gagna ... Their liggja
      ADEINS fyrir i data/live/gw{n}.json og thau eru TOM thangad til
      fyrsta umferd 2026/27 klarast."
   Fullyrdingin var osonn og maelanleg: `data/live/` er ekki adeins tom,
   HUN ER EKKI TIL (0 skrar) — og hun er um YFIRSTANDANDI timabil. Per-
   umferdar gogn LIGGJA FYRIR fyrir fimm lokin timabil
   (`data/player_gw_2122.json` ... `player_gw_2526.json`, 1,3-1,6 MB hver;
   2025/26 ber 841 leikmenn med 38 umferdum) og LEIKMANNALISTINN BYGGDI
   UMFERDAR-BIL UR NAKVAEMLEGA ThESSUM SKRAM allan timann. Retta hindrunin
   var thvi adeins yfirstandandi timabilid, sem er einn valkostur i
   valmyndinni — ekki eiginleikinn. Setningin var ekki VARDVEITT heldur
   LEIDRETT, og tolurnar i henni eru nu LEIDDAR ur `consistency.json` i
   stad thess ad vera skrifadar ("3 ar aftur" var lika ordid rangt: thau
   eru fimm).

   VELIN ER EKKI HER: hledslan, skyndiminnid og thakid a bilinu eru i
   `src/gwRange.js` og summan er `sumGwRange` i `src/stats.js`. Hvorugt var
   endurskrifad her. Afrit af annadhvort hefdi verid sama gildran og
   `buildTeamMetrics` (CLAUDE.md 7): afritid skrifadi NaN fyrir oll 17
   lidin og merkti thad sem maelingu.

   HVADA TOLUR: valdar ur FFS-listanum eftir thvi hvort thaer eru (a) til
   i okkar heimildum og (b) fantasy-relevant. Snertingar i teig, big
   chances, dribbles og aerial duels eru EKKI her thvi engin heimild sem
   vid naum i gefur thaer — sja kafla 6b i CLAUDE.md.
   ============================================================ */

import React, { useEffect, useMemo, useState } from "react";
import { num, liveSeasonRow, sumGwRange, gwBlindKeys } from "./stats.js";
import { useGwSeasonFile, gwSeasonsOf, nextRange, lastNRange, rangeBlind,
         RANGE_BLIND_BADGE, RANGE_LIVE_BADGE } from "./gwRange.js";
import { photoNext } from "./Crest.jsx";

const C = {
  card:"#ffffff", cardAlt:"#fafafb", border:"#e0e0e4", text:"#1d1d20",
  text2:"#61616b", text3:"#8b8b95", purple:"#37003c", green:"#00b96b",
  amber:"#c98a00", red:"#d92d3c", amberBg:"#fff6e0",
};
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const POS = { 1:"GK", 2:"DEF", 3:"MID", 4:"FWD" };

const per90 = (v, m) => (!m || m <= 0 || v == null) ? null : (v / m) * 90;

/* Mynd sem HVERFUR vid 404 i stad brotins-myndar-taks. premierleague.com
   skilar 404 fyrir nyflutta menn; nafnid stendur hvort sem er fyrir nedan. */
function SafeImg({ src, style }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  /* TVAER FOTUR — sja maelinguna i Crest.jsx. Myndin hverfur fyrst
     thegar BADAR hafa brugdist.                                        */
  return <img src={src} alt="" style={style} loading="lazy"
    onError={e => { const n = photoNext(e.target.src); if (n) e.target.src = n; else setOk(false); }} />;
}
const div = (a, b) => (b == null || b === 0 || a == null) ? null : a / b;

/* Radirnar. `hi:false` = laegra er betra. `fmt` styrir birtingu.        */
import { advise, contextFactors } from "./advisor.js";
import { indexImminentByTeam, matchImminent, startRisk } from "./stats.js";

export const ROWS = [
  { grp: "Basics" },
  { k:"total_points", label: "FPL points",       hi:true,  get:r => r.total_points },
  { k:"minutes",      label: "Minutes",        hi:true,  get:r => r.minutes },
  { k:"starts",       label: "Starts",hi:true,  get:r => r.starts },
  { k:"pts90",        label: "Points / 90",      hi:true,  dec:2, get:r => per90(r.total_points, r.minutes) },
  { k:"minPerPt",     label: "Mins per point",  hi:false, dec:1,
    note: "Lower is better — how long he takes to earn a point",
    get:r => div(r.minutes, r.total_points) },
  /* `live_only` ER YFIRLYSING, EKKI SKRAUT. Verdid er ALLTAF dagsins verd —
     lika i sogulegu timabili og lika i umferdar-bili (sja rokstudninginn vid
     `cols` nedar: arkiv-verdid vann einu sinni og gaf tvo verd a sama manni i
     sama glugga). Talan getur thvi ekki fylgt bili, og `gwBlindKeys` GETUR
     EKKI SED ThAD: hun maelir hvort `get()` lesi summanleg svid, og
     `now_cost` er ekki eitt af theim — hun myndi flagga rodina sem
     "arstidar-summu", sem er osatt. Reiturinn segir thad sem maelingin getur
     ekki: thetta er dagsins tala. Sami tvithaetti skilyrdis-parturinn og
     `rangeBlind` les i leikmannalistanum.                                */
  { k:"cost",         label: "Price",           hi:false, dec:1, money:true, live_only:true,
    get:r => r.now_cost == null ? null : r.now_cost / 10 },
  { k:"ppm",          label: "Points per million", hi:true, dec:1,
    get:r => div(r.total_points, r.now_cost == null ? null : r.now_cost / 10) },

  { grp: "Attack" },
  { k:"goals_scored", label: "Goals",           hi:true,  get:r => r.goals_scored },
  { k:"assists",      label: "Assists",         hi:true,  get:r => r.assists },
  { k:"gi",           label: "Goals + assists",  hi:true,  get:r => (r.goals_scored ?? 0) + (r.assists ?? 0) },
  { k:"gi90",         label: "G+A / 90",       hi:true,  dec:2,
    get:r => per90((r.goals_scored ?? 0) + (r.assists ?? 0), r.minutes) },
  { k:"minPerGi",     label: "Mins per GI", hi:false, dec:0,
    get:r => { const gi = (r.goals_scored ?? 0) + (r.assists ?? 0); return gi ? div(r.minutes, gi) : null; } },

  { grp: "Expected" },
  { k:"expected_goals", label:"xG",           hi:true, dec:2, get:r => r.expected_goals },
  { k:"xg90",         label:"xG / 90",        hi:true, dec:2, get:r => r.expected_goals_per_90 },
  { k:"xgDelta",      label: "Goals − xG",      hi:true, dec:2, signed:true,
    note: "Above zero = clinical finishing or luck",
    get:r => (r.goals_scored == null || r.expected_goals == null) ? null : r.goals_scored - r.expected_goals },
  { k:"expected_assists", label:"xA",         hi:true, dec:2, get:r => r.expected_assists },
  { k:"xa90",         label:"xA / 90",        hi:true, dec:2, get:r => r.expected_assists_per_90 },
  { k:"xaDelta",      label: "Assists − xA",    hi:true, dec:2, signed:true,
    get:r => (r.assists == null || r.expected_assists == null) ? null : r.assists - r.expected_assists },
  { k:"expected_goal_involvements", label:"xGI", hi:true, dec:2, get:r => r.expected_goal_involvements },
  /* SAMA GOLF OG `mins_per_xgi` i stats.js — annars svarar sami maelikvardi
     TVEIMUR tolum eftir thvi hvar hann er lesinn. xGI er birt med tveimur
     aukastofum, svo 0,01 er upplausnarmork: an golfsins syndi Compare
     sprengda tolu (markmenn upp i 326.100) thar sem leikmannalistinn synir
     "—". Maelt: sami throskuldur og `conversion` ber thegar.             */
  { k:"minPerXgi",    label: "Mins per xGI",   hi:false, dec:0,
    get:r => (r.expected_goal_involvements == null || r.expected_goal_involvements < 0.5)
      ? null : div(r.minutes, r.expected_goal_involvements) },

  { grp: "Defence", defOnly:true },
  { defOnly:true, k:"clean_sheets", label:"CS",             hi:true,  get:r => r.clean_sheets },
  { defOnly:true, k:"csPct",        label:"CS %",           hi:true,  dec:0, pct:true,
    get:r => { const v = div(r.clean_sheets, r.starts); return v == null ? null : v * 100; } },
  { defOnly:true, k:"goals_conceded", label:"GC",           hi:false, get:r => r.goals_conceded },
  { defOnly:true, k:"expected_goals_conceded", label:"xGC", hi:false, dec:2, get:r => r.expected_goals_conceded },
  { defOnly:true, k:"gcDelta",      label:"GC − xGC",       hi:false, dec:2, signed:true,
    note: "Below zero = defended better than the chances implied",
    get:r => (r.goals_conceded == null || r.expected_goals_conceded == null) ? null
             : r.goals_conceded - r.expected_goals_conceded },
  { defOnly:true, k:"defensive_contribution", label:"DC",   hi:true,  get:r => r.defensive_contribution },
  { defOnly:true, k:"dc_per_start", label: "DC per start",  hi:true,  dec:1, get:r => r.dc_per_start },
  { defOnly:true, gkOnly:true, k:"saves", label: "Saves", hi:true, get:r => r.saves },

  { grp: "Bonus and discipline" },
  { k:"bonus",        label: "Bonus points",      hi:true,  get:r => r.bonus },
  { k:"bps",          label:"BPS",            hi:true,  get:r => r.bps },
  { k:"bps90",        label:"BPS / 90",       hi:true,  dec:1, get:r => per90(r.bps, r.minutes) },
  { k:"yellow_cards", label: "Yellow cards",     hi:false, get:r => r.yellow_cards },
  { k:"red_cards",    label: "Red cards",    hi:false, get:r => r.red_cards },
];

/* ============================================================
   HVADA RADIR GETA FYLGT UMFERDAR-BILI — MAELT, EKKI HANDSKRIFAD

   `gwBlindKeys` (stats.js) er ThEGAR til og hun tekur vid dalkaskra sem
   vidfangi. `ROWS` her nota `k` thar sem `STAT_DEFS` nota `key`, svo her er
   ADLOGUN — ekki onnur maeling. Ad skrifa listann handvirkt var kosturinn og
   hann er sannreynt slaemur: fyrsta utgafa hins listans hafdi 13 af 22 lyklum
   RANGA (CLAUDE.md 8).

   VORPUNIN SEM VAR VALIN OG HVERS VEGNA: `gwBlindKeys` SLEPPIR
   `live_only`-dalkum viljandi (rokstudningurinn i stats.js er ad their beri
   eigid merki), svo skilyrdid er TVITHAETT — `rangeBlind(d, blind)` — sama
   fall og leikmannalistinn les. I `ROWS` var `live_only` ekki til; hann er nu
   settur a EINA rod (Verd) thar sem hann er raunverulega sannur, svo baedi
   lidir skilyrdisins bera raunverulegt hlutverk her og geta ekki dofnad i
   skreytingu.
   MAELT 20.8.2026 a raunverulegu `ROWS`: 33 radir · 31 FYLGJA bilinu ·
   2 GETA ekki: `dc_per_start` (arkiv-svid, engin per-umferdar heimild ->
   "season") og `cost` (dagsins verd -> "today").
   ============================================================ */
const ROW_DEFS = ROWS.filter(r => r.k).map(r => ({ ...r, key: r.k }));
export const ROW_BLIND = gwBlindKeys(ROW_DEFS);
/* TALAN ER REIKNUD, EKKI SKRIFUD — notan undir toflunni birtir hana og fost
   tala um lifandi dalkaskra urealdast thegjandi (sama villa og "4-10 and
   never reach 1" i Set pieces, CLAUDE.md 8).                             */
export const rowFollowsRange = row => !!row.k && !rangeBlind({ ...row, key: row.k }, ROW_BLIND);
export const ROW_FOLLOW_N = ROW_DEFS.filter(rowFollowsRange).length;

/* SJONRAENA SNIDID VAR TEKID UT 14.8.2026 AD BEIDNI NOTANDA — samanburdur
   er ALLTAF TAFLA nu. Med thvi hurfu `VisualRows`, `barGeom` og sulu-stilarnir.
   REGLAN SEM SULURNAR BARU LIFIR AFRAM I TOFLUNNI og ma ekki tapast: `hi`
   raedur hver telst BESTUR i hverri rod ("Min. per stig", "Verd", "GC" og gul
   spjold eru LAEGRA-ER-BETRA, svo haesta talan er thar VERST). Graena
   merkingin i toflunni les sama `hi`, og `tests/compare-visual.mjs` var
   endurskrifad til ad verja HANA i stad sulnanna.                          */



/* Litir per leikmann thegar hvorugur leidir (jafntefli/eitt gildi).
   Graent er FRATEKID fyrir forustuna, sbr. toflusnidid.                */

function fmtVal(row, v) {
  if (v == null || !Number.isFinite(v)) return "—";
  const body = v.toFixed(row.dec ?? 0);
  const sign = row.signed && v > 0 ? "+" : "";
  if (row.money) return `£${body}`;
  if (row.pct) return `${body}%`;
  return sign + body;
}

/* Lifandi rod ur bootstrap svo yfirstandandi timabil noti somu svid. */
/* `liveRow` ER NU `liveSeasonRow` UR stats.js (11.8.2026) — sama rod var
   byggd her OG i PlayerPanel.jsx (`liveRecord`). Kjarninn skilar HRAU og
   thessi tafla namundar sjalf i birtingu (`dec:` a hverjum dalki), svo
   talan a skjanum er obreytt. Sja skyringuna i stats.js.               */
const liveRow = liveSeasonRow;


/* ============================================================
   RADGJOFIN — birting eingongu. Hver tala kemur ur src/advisor.js.

   ThRJAR BIRTINGAR-AKVARDANIR, ALLAR TIL AD TALAN LJUGI EKKI:
     1. PROSENTAN BER SINA EIGIN SKYRINGU A SKJANUM, ekki i tooltip-i:
        "af 306.653 samanburdum i fortidinni". An hennar les hun sem
        spadomur, sem hun er ekki.
     2. ThEGAR MUNURINN ER UNDIR 55% SEGIR HUN ThAD BERUM ORDUM. Gognin
        vita thad ekki, og verkfaeri sem thykist vissara en gognin er
        verra en ekkert.
     3. SAMHENGIS-TOLURNAR (DefCon, jofnudur, byrjunar-likur) eru i
        EIGIN kassa med sinum fyrirvara. Their eru THAR af thvi ad
        notandinn bad um "oll gogn" — en their eru UTAN talunnar af thvi
        ad maelingin hafnadi theim, og bædi verdur ad sjast.
   ============================================================ */
function Advisor({ picked, advisorById, imminent, defcon, consist, teamById, horizon, bsd, season }) {
  const immByTeam = useMemo(() => indexImminentByTeam(imminent), [imminent]);
  /* ============================================================
     TVEIR AF FJORUM SAMHENGIS-ThATTUM VORU DAUDIR — MAELT 14.8.2026.
     `contextFactors` (advisor.js) getur birt `start` · `dc` · `aron` · `bc`.
     Mælt a ollum 584 leikmonnum med RAUNVERULEGA inntakinu sem thessi hluti
     byggdi: `start` 465 gildi, `aron` 473, **`dc` 0 og `bc` 0**. Profin voru
     graen thvi `tests/advisor.mjs` byggir inntakid SJALFT
     (`{dc:95, aron:0.4, startProb:0.95, bigChances:9}`) — thau profudu
     formuluna, aldrei tenginguna.
     (a) `dc` las `defcon?.players?.[p.id]`. `defcon.players` er FYLKI, svo
         `[p.id]` er uppfletting eftir SAETI — og `defcon_opportunity` er ekki
         a leikmanna-rodum, hun bur a `defcon.opportunity[TEAM_ID]`
         (`stats.js` les hana rett). Verra en null: hermt i-timabils-fylki
         sýndi ad 299 af 300 uppflettingum hittu a ANNAN leikmann, svo hefdi
         svidid einhvern tima verid sett a radirnar hefdi thetta birt tolu
         ANNARS manns. Thogul rong porun er verri en engin (CLAUDE.md 6).
     (b) `p.bigChances` var HVERGI sett i framleidslu — `advisor.js` var eini
         lesandinn i öllu repo-inu. Talan er til: `big_chances` i
         `bsd_players.json` (sama sem `_b_big` i leikmannalistanum).
     BSD er lykluð a `code` (fast yfir timabil) og VELIN VELUR SKRA EFTIR
     TIMABILI, eins og `makeEnricher` gerir: `bsd_live` er yfirstandandi
     timabil og `bsd_players` er 2025/26, svo ranga skrain gaefi tomt.
     ============================================================ */
  const dcByTeam = defcon?.opportunity || null;
  const bigByCode = useMemo(() => {
    const files = Array.isArray(bsd) ? bsd.filter(Boolean) : (bsd ? [bsd] : []);
    /* TIMASPRENGJA VID GW1-LOK — AFTENGD 19.8.2026.
       Sjalfgefna timabilid i thessum glugga flippast i `currentLabel`
       ("2026/27") um leid og FYRSTA umferd telst kladud (`seasonStarted`).
       BSD ber adeins 2025/26 thangad til `bsd_live.json` hefur gogn, svo
       `bigChances` hefdi ordid 0 af 592 I SOMU VIKU og draftid — og tvaer
       fullyrdingar i `compare-visual.mjs` ordid raudar med thvi.
       LAUSNIN ER EKKI AD PINNA A FASTA SKRA (hun myndi urealdast um leid
       og bsd_live fyllist) heldur ad taka THA SKRA SEM HEFUR GOGN: valid
       timabil fyrst, annars nyjasta skra sem ber leikmenn. Nota
       radgjafans nefnir hvort ed er timabilid ("2025/26 only"), svo talan
       er ekki oskilgreind — hun er merkt.                               */
    const withData = files.filter(f => f && (f.players?.length || 0) > 0);
    const pick = withData.find(f => f.season === season) || withData[0] || null;
    const m = new Map();
    for (const r of (Array.isArray(pick?.players) ? pick.players : []))
      if (r?.code != null && r.big_chances != null) m.set(String(r.code), r.big_chances);
    return m;
  }, [bsd, season]);

  const input = useMemo(() => picked.map(p => {
    const a = advisorById?.[p.id];
    const im = matchImminent(p, immByTeam, teamById?.[p.team]?.short);
    const cRec = consist?.seasons
      ? Object.values(consist.seasons).map(sn => sn?.[String(p.code)]).filter(Boolean).pop()
      : null;
    return {
      id: p.id, name: p.web_name, pos: p.element_type, p,
      inputs: a?.inputs || {},
      available: a?.avail,
      /* SAMA UTFAERSLA OG LEIKMANNALISTINN NOTAR. Fyrsta utgafan las
         `im.start_prob` sem er EKKI til i skranni — reiturinn var thvi
         alltaf tomur og enginn hefdi tekid eftir thvi, thvi "engin gogn"
         er gild nidurstada. Talan er leidd ur `start_feats` gegnum
         `startRisk`, eins og dalkurinn i listanum.                     */
      startProb: im?.start_feats ? (startRisk(im.start_feats)?.p ?? null) : null,
      /* SOMU STODUR SEM SKORID NOTAR (`App.jsx` scoreOf: `element_type <= 2`).
         Talan er LIDS-tala um varnarálag (`own_xgc90`, `opp_attack_avg`), svo
         hun segir ekkert um framherja — og samhengis-thattur sem birtist a
         rongum manni er verri en enginn. Ekki ny stodu-regla, heldur SAMA
         regla og talan er thegar notud eftir annars stadar.              */
      /* MARKMENN UT (19.8.2026). `<= 2` er GK+DEF, svo 66 markmenn fengu
         "DefCon opportunity"-linu fyrir stig sem their geta ekki unnid:
         maelt a `player_gw_2526.json` eiga their 663 leikja-umferdir og
         NULL DefCon-stig, hamark 0. Rokstudningurinn hér ad ofan visadi i
         `scoreOf`-reglu i App.jsx sem var EYDD 18.8. thegar `dcB` for ut —
         athugasemdin lifdi regluna sem hun vitnadi i.                    */
      dc: p.element_type === 2 ? num(dcByTeam?.[p.team]?.defcon_opportunity) : null,
      aron: num(cRec?.aron),
      bigChances: bigByCode.get(String(p.code)) ?? null,
    };
  }), [picked, advisorById, immByTeam, dcByTeam, bigByCode, consist, teamById]);

  const res = useMemo(() => advise(input), [input]);
  if (!res.ok) return null;

  const pct = v => `${Math.round(v * 100)}%`;
  const lead = res.lead;
  const risky = res.ranked.filter(r => (r.startProb != null && r.startProb < 0.5)
                                    || (r.available != null && r.available < 0.75));

  return (
    <div style={S.adv}>
      <div style={S.advHead}>
        <b style={S.advTitle}>{"Which one?"}</b>
        <span style={S.advSub}>
          {`over the next ${horizon || 5} gameweeks`}
        </span>
      </div>

      <div style={S.advBars}>
        {res.ranked.map(r => (
          <div key={r.id} style={S.advBarRow}>
            <span style={{ ...S.advName, ...(r.id === lead.id ? S.advNameLead : null) }}>
              {r.name}
            </span>
            <div style={S.advTrack}>
              <div style={{ ...S.advFill, width: `${Math.max(2, r.share * 100)}%`,
                            background: r.id === lead.id ? "#1b5e9c" : "#c3cbd6" }} />
            </div>
            <span style={{ ...S.advPct, ...(r.id === lead.id ? S.advPctLead : null) }}>
              {pct(r.share)}
            </span>
          </div>
        ))}
      </div>

      <p style={S.advWhat}>
        {res.close ? (
          <>
            <b>{"Too close to call."}</b>{" The measured gap between "}
            <b>{res.ranked[0].name}</b>{" and "}<b>{res.ranked[1].name}</b>
            {" puts the head-to-head at "}<b>{pct(res.decisiveProb)}</b>
            {" — barely better than a coin toss. On these numbers there is no real "}
            {"case for one over the other; decide on something the model does not see."}
          </>
        ) : (
          <>
            <b>{lead.name}</b>{" leads. Head to head against "}
            <b>{res.ranked[1].name}</b>{", the higher-rated player outscored the other in "}
            <b>{pct(res.decisiveProb)}</b>{" of comparable cases."}
          </>
        )}
      </p>

      <p style={S.advCal}>
        {"The percentage is not a probability that the transfer works out — nothing measures "}
        {"that. It is how often the better-rated player actually scored more, counted over "}
        <b>{"306,653 head-to-heads inside the same gameweek"}</b>{" across five seasons. "}
        {"The ceiling is real: even the widest gap in the data only reaches about 81%, "}
        {"because one gameweek of football is that noisy."}
      </p>

      {risky.length > 0 && (
        <p style={S.advWarn}>
          <b>{"The number above assumes they both play."}</b>{" "}
          {risky.map(r => `${r.name}: ${r.startProb != null
            ? `${Math.round(r.startProb * 100)}% to play 60+ minutes`
            : "flagged as doubtful"}`).join(" · ")}
          {". A player who does not start scores nothing, which is a harder problem than "}
          {"who scores more — so it sits here rather than inside the percentage."}
        </p>
      )}

      <div style={S.advCols}>
        {res.ranked.map(r => {
          const ctx = contextFactors(r);
          return (
            <div key={r.id} style={S.advCol}>
              <div style={S.advColHd}>{r.name}</div>
              <div style={S.advColSub}>{"What moves the score"}</div>
              {r.terms.filter(t => t.delta != null && Math.abs(t.delta) >= 0.01).map(t => (
                <div key={t.key} style={S.advTerm} title={`${t.label}: ${t.value}`}>
                  <span style={S.advTermL}>{t.label}</span>
                  <span style={{ ...S.advTermV,
                                 color: t.delta > 0 ? "#0a5c3e" : "#8f2230" }}>
                    {t.delta > 0 ? "+" : ""}{t.delta.toFixed(2)}
                  </span>
                </div>
              ))}
              {ctx.length > 0 && <div style={S.advColSub}>{"Shown, but not in the score"}</div>}
              {ctx.map(c => (
                <div key={c.key} style={S.advTerm} title={c.note}>
                  <span style={S.advTermL}>{c.label}</span>
                  <span style={S.advTermCtx}>
                    {c.fmt === "pct" ? `${Math.round(c.value * 100)}%`
                      : c.fmt === "signed" ? `${c.value > 0 ? "+" : ""}${c.value.toFixed(2)}`
                      : c.fmt === "int" ? String(Math.round(c.value)) : c.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <p style={S.advFoot}>
        {"The score behind this is the same one the buy recommendations are ranked by — "}
        {"five inputs (form, minutes, price, fixture difficulty, minutes trend), fitted on "}
        {"five seasons and validated season-by-season. It beats both the app's own expected "}
        {"points and "}<b>{"FPL's published xP"}</b>{". The numbers under each name are how "}
        {"much each input moved that player relative to the others in this comparison, so "}
        {"they add up to the gap rather than explaining it after the fact. "}
        <b>{"Price counts upwards on purpose"}</b>{": it is the market's own rating of a "}
        {"player, and it carries the ability our five numbers cannot see. That is why an "}
        {"expensive player starts ahead — the model is not rewarding the cost, it is "}
        {"reading what the cost implies."}
      </p>
    </div>
  );
}

export default function Compare({ ids, players, teamById, seasonsFile, photoUrl, Crest,
                                  currentLabel, seasonStarted, onRemove, onClear, onClose,
                                  advisorById, imminent, defcon, consist, horizon, bsd }) {
  const seasons = useMemo(() => {
    const older = (seasonsFile?.seasons || []);
    return [{ key: currentLabel, live: true }, ...older.map(s => ({ key: s }))];
  }, [seasonsFile, currentLabel]);
  const [season, setSeason] = useState(() => seasonStarted ? currentLabel
                                            : (seasonsFile?.seasons?.[0] || currentLabel));
  /* SJONRAENT ER SJALFGEFID THEGAR TVEIR ERU VALDIR — thad var bedin:
     "velja tvo leikmenn og bera stat theirra saman med sjonraenum haetti".
     Med thremur eda fjorum verdur taflan laesilegri (fjorar sulur per rod
     verda thunnar), svo hun er sjalfgefin tha. Notandinn getur skipt.     */

  const picked = (ids || []).map(id => (players || []).find(p => p.id === id)).filter(Boolean);
  const isLive = season === currentLabel;

  /* ---------- UMFERDAR-BIL ----------
     null = HEILT timabil, eins og i leikmannalistanum. Bilid er nullstillt
     vid timabils-skipti: annars saeti "GW 31-38" eftir a timabili sem
     notandinn valdi thad ekki a.                                         */
  const [gwOpen, setGwOpen] = useState(false);
  const [gwRange, setGwRange] = useState(null);
  useEffect(() => { setGwRange(null); }, [season]);

  /* HLADID ThEGAR VALARINN ER OPNADUR, EKKI ThEGAR BIL ER VALID — og thad er
     ekki smekkur: kassarnir og "last 8" thurfa ThAKID (`maxGw`), og thakid er
     LESID UR SKRANNI, ekki 38 harkodad. Vaeri hledslan bundin vid valid bil
     yrdi hun hringur: ekkert bil an thaks, ekkert thak an skrar.
     Skyndiminnid er sameiginlegt med leikmannalistanum, svo se hann buinn ad
     opna sama timabil kostar thetta ekkert kall (sja `gwRange.js`).      */
  const gwSrc = useGwSeasonFile({ season, consist, enabled: gwOpen });
  /* HVERS VEGNA `!isLive` LIKA OG EKKI ADEINS `available`: `available` er
     leidd ur `consistency.json`, svo vaeri hun ekki komin (eda hordfin)
     opnadist bilid a yfirstandandi timabili og skiladi 404 fra
     raw.githubusercontent AN CORS-hausa — thad er nakvaemlega "Failed to
     fetch"-villan fra 7.8.2026 i nyjum glugga. Yfirstandandi timabil A ENGA
     per-umferdar skra fyrr en thad hefur verid spilad, og thad er vitad an
     thess ad spyrja skra.                                                */
  const rangeOk = !isLive && gwSrc.available;
  /* ASTAEDAN ER SOGD, EKKI GEFIN I SKYN — og hun er ORDUD EFTIR ThVI HVOR
     hindrunin gildir. "No data" um yfirstandandi timabil vaeri halfur satt
     og fullur ruglingur: skrain er ekki tom, hun er ekki til enn.        */
  const rangeWhy = !isLive ? (gwSrc.available ? null
                              : `No per-gameweek data for ${season}.`)
    : `${currentLabel} has no per-gameweek data yet — that file is written from `
      + `matches already played, so a range needs a finished season.`;
  const gwMax = gwSrc.maxGw;
  const gwActive = !!(gwRange && gwSrc.data);
  /* TALIN UR `consistency.json` — hun er BYGGD UR per-umferdar skranum, svo
     lyklar hennar ERU skrain yfir thad sem er til. Notan undir toflunni birtir
     thetta; harkodad "3 ar aftur" stod thar og var ordid rangt.          */
  const gwSeasonList = useMemo(() => [...gwSeasonsOf(consist)].sort(), [consist]);

  const cols = picked.map(p => {
    /* UMFERDAR-BIL KEMUR I STAD arstidar-rodarinnar. `sumGwRange` skilar
       FPL-nefndum svidum, svo hver rod her — lika afleiddu — virkar obreytt.
       ENGIN NY SAMLAGNING HER: sama fall og leikmannalistinn notar.      */
    const gwEntry = gwActive ? gwSrc.data.players?.[String(p.code)] : null;
    const ranged = gwEntry ? sumGwRange(gwEntry, gwSrc.data, gwRange[0], gwRange[1]) : null;
    const rec = isLive
      ? (seasonStarted ? liveRow(p) : null)
      : (gwActive ? ranged
                  : (seasonsFile?.players?.[String(p.code)]?.[season] || null));
    /* VERD ER ALLTAF DAGSINS — LIKA I SOGULEGU TIMABILI (sama regla og
       leikmannalistinn fylgir: "thu kaupir a verdi dagsins").
       VILLAN SEM VAR: `rec.now_cost ?? p.now_cost` let SOGULEGA verdid vinna
       thvi arkiv-rodin BER now_cost. Haaland birtist thvi a GBP14,7 (lok
       2025/26) i sulunum medan RADGJOFIN i SAMA glugga reiknadi med GBP15,5
       (dagsins) — tvo verd a sama manni i sama glugga. Og "Points per
       million" deildi med verdi sem ekki er haegt ad kaupa a.
       Rodin er thvi VIDSNUIN: dagsins verd vinnur, arkivid er varaleidin. */
    /* OG `element_type` VERDUR AD FYLGJA MED — ANNARS ER STODU-HLIDID SLOKKT.
       `sumGwRange` skilar ADEINS FPL-summum og /90-tolum, ENGRI stodu, svo i
       umferdar-bils-ham vaeri rodin STODULAUS. I leikmannalistanum kostadi
       nakvaemlega thad 410 radir med 1.535 stodu-laestum gildum (Gyokeres med
       "Clean sheet % 46,2"); her er hlidid `defOnly`/`gkOnly` og thad les
       `posOf` nedar. Lifandi `p` er einratt — sama tala og hausinn (`POS[...]`)
       og radgjofin nota — og hun skrifast YFIR stodu arkiv-rodarinnar, sem er
       stada ThESS timabils (maelt i listanum: 2 leikmenn med live 4 / hist 3
       syndu 16 varnargildi).                                             */
    return { p, rec: rec ? { ...rec, now_cost: num(p.now_cost) ?? rec.now_cost,
                             element_type: p.element_type } : null };
  });

  /* STADAN ER LESIN AF RODINNI SEM TAFLAN BIRTIR, ekki af `p` vid hlidina a
     henni: se rodin til en stodulaus er svarid "vid vitum ekki hvada stodu
     thessar tolur eiga", og tha ma varnar-rodin ekki teiknast. Thad er lidurinn
     sem gerir `element_type`-flutninginn her ad ofan BURDARVIRKI og ekki
     skreytingu — an hans deyr hlidid thegjandi i bils-ham.               */
  const posOf = c => c.rec ? c.rec.element_type : c.p.element_type;
  const anyDef = cols.some(c => posOf(c) <= 3);
  const anyGk  = cols.some(c => posOf(c) === 1);

  return (
    <div style={S.wrap} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        <div style={S.head}>
          <h2 style={S.h2}>{"Comparison"}</h2>
          <div style={S.headCtl}>
            <select style={S.sel} value={season} onChange={e => setSeason(e.target.value)}>
              {seasons.map(s => (
                <option key={s.key} value={s.key}>
                  {s.key}{s.live && !seasonStarted ? " (not started)" : ""}
                </option>
              ))}
            </select>
            {/* VID HLIDINA A TIMABILS-VALINU, thvi thad er sama spurningin i
                tveimur throngvunum: HVAD er borid saman. Sama snid og i
                leikmannalistanum (samanbrots-hnappur + kassa-strik +
                "whole season") svo thetta se EIN hegdun a tveimur stodum og
                ekki tvo hugmyndir.
                HNAPPURINN ER SYNDUR LIKA ThEGAR HANN ER OVIRKUR og ber tha
                astaeduna: eiginleiki sem er einfaldlega FJARVERANDI segir
                ekkert, og notandinn hefur ThEGAR tilkynnt horfid gw-strik
                sem bilun (sja PlayerList, 8.8.2026).                      */}
            <button style={{ ...S.gwToggle, ...(rangeOk ? null : S.gwToggleOff) }}
              aria-expanded={gwOpen} disabled={!rangeOk}
              title={rangeOk ? "Pick a gameweek range instead of the whole season"
                             : rangeWhy}
              onClick={() => setGwOpen(v => !v)}>
              <span style={{ ...S.caret, transform: gwOpen ? "none" : "rotate(-90deg)" }}>▾</span>
              {"Gameweeks"}
            </button>
            <button style={S.clear} onClick={onClear}>{"Clear"}</button>
            <button style={S.close} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ---------- UMFERDAR-VALARINN ----------
            EIGIN ROD, thvi kassarnir taka fulla breidd (38 x 19 px). Hann er
            ADEINS teiknadur thegar hann er opnadur OG virkur; astaedan fyrir
            hinu tilvikinu stendur i tooltip-inu a hnappnum OG her ad nedan
            thegar bil er valid, svo hun se laesileg an thess ad benda. */}
        {!rangeOk && gwOpen && <div style={S.gwWhy}>{rangeWhy}</div>}
        {rangeOk && gwOpen && (
          <div style={S.gwWrap}>
            <div style={S.gwTop}>
              {/* "SIDUSTU N" ER BEIDNIN SJALF ("bara sidustu 8 leikina"). N-in
                  eru fost en ThAKID kemur UR GOGNUNUM (`lastNRange` skilar
                  null nai N yfir allt timabilid), svo hnappur getur ekki bodid
                  bil sem skrain ber ekki. Harkodad 38 hefdi gefid thogla
                  null-summu a timabili sem naer skemur — tolu sem litur ut
                  eins og maeling.                                          */}
              {[3, 5, 8, 10].map(n => {
                const r = lastNRange(n, gwMax);
                return r ? (
                  <button key={n} style={S.gwPreset}
                    title={`GW ${r[0]}–${r[1]}`}
                    onClick={() => setGwRange(r)}>{`last ${n}`}</button>
                ) : null;
              })}
              {gwRange && (
                <button style={S.gwPreset} onClick={() => setGwRange(null)}>
                  {"whole season"}
                </button>
              )}
              <span style={S.gwNow}>
                {gwRange ? `GW ${gwRange[0]}–${gwRange[1]}` : "whole season"}
                {gwSrc.loading ? " · loading…" : ""}
                {gwSrc.err ? <>
                  {` · data missing: ${gwSrc.err} `}
                  <button style={S.gwRetry} onClick={gwSrc.retry}>{"retry"}</button>
                </> : null}
              </span>
            </div>
            {gwMax ? (
              /* AUDKENNID ER ANNAD EN I LEIKMANNALISTANUM ("Select gameweek
                 range") ASETT: badir valararnir eru i DOM samtimis thegar
                 glugginn er opinn ofan a listanum, og tvo eins aria-label i
                 sama skjali er hvorki lesanlegt fyrir skjalesara ne
                 addressanlegt fyrir prof — sama regla og "tveir flipar med
                 sama takni er thad sama og ekkert takn" (CLAUDE.md 8).   */
              <div style={S.gwBar} role="group"
                   aria-label={"Select gameweek range for the comparison"}>
                {Array.from({ length: gwMax }, (_, i) => i + 1).map(n => {
                  const on = gwRange && n >= gwRange[0] && n <= gwRange[1];
                  const edge = gwRange && (n === gwRange[0] || n === gwRange[1]);
                  return (
                    <button key={n} title={`GW ${n}`} aria-pressed={!!on}
                      style={{ ...S.gwCell, ...(on ? S.gwOn : {}), ...(edge ? S.gwEdge : {}) }}
                      /* SMELL-REGLAN ER I `gwRange.js` — sama fall og
                         leikmannalistinn notar, svo "annar smellur" hegdar
                         ser eins i badum glugum.                          */
                      onClick={() => setGwRange(r => nextRange(r, n))}>
                      {n}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}

        {!picked.length ? (
          <div style={S.empty}>
            {"None selected. Open a player and click"} <b>{"⇄ Compare"}</b> {"to add him."}
          </div>
        ) : (
          <>
            {isLive && !seasonStarted && (
              <div style={S.warn}>
                <b>{currentLabel} {"has not started"}</b> {"— no numbers exist. Pick an earlier season in the dropdown to compare."}
              </div>
            )}

            {/* RADGJOFIN STENDUR EFST. Hun er SVARID vid spurningunni sem
                madur opnadi gluggann til ad svara ("hvorn a eg ad taka?");
                taflan fyrir nedan er ROKSTUDNINGURINN. Vaeri hun nedst
                thyrfti madur ad skruna fram hja ollum tolunum til ad fa
                nidurstoduna, sem er ofug rod.                            */}
            {/* SEASON = GLUGGANS EIGIN STADA, EKKI `currentLabel`. Maelt
                16.8.2026: med `currentLabel` ("2026/27") fann uppflettingin
                enga BSD-skra — `bsd_players.json` ber "2025/26" og
                `bsd_live.json` verdur ekki til fyrr en eftir 21.8. — svo
                `bigByCode` var TOM og "Big chances" birtist ALDREI: 0 af 587
                leikmonnum med gildi. Med `season` (sjalfgefid "2025/26" i
                forleik) eru their 316 af 587. Thetta laetur radgjofina lesa
                SOMU skra og taflan fyrir nedan les — og somu reglu og
                `makeEnricher` i stats.js beitir. EKKI `seasons[0]`: sa
                lykill er lifandi faerslan sem var einmitt vandamalid.     */}
            <Advisor picked={picked} advisorById={advisorById} imminent={imminent}
              defcon={defcon} consist={consist} teamById={teamById} horizon={horizon}
              bsd={bsd} season={season} />

            {/* ============================================================
                SETNINGIN SEM STOD HER VAR OSONN — LEIDRETT 20.8.2026.
                Hun sagdi ad per-umferdar tolur "eru adeins til i
                live/gw*.json" og fyllist "thegar 2026/27 byrjar". `data/live/`
                ER EKKI TIL (0 skrar) og er hvort ed er um YFIRSTANDANDI
                timabil; per-umferdar gogn liggja fyrir fyrir fimm LOKIN
                timabil og leikmannalistinn hefur notad thau fra 7.8.2026.
                TOLURNAR ERU LEIDDAR, EKKI SKRIFADAR: "3 ar aftur" var lika
                ordid rangt (thau eru fimm), og fost tala um lifandi gagnaskra
                urealdast thegjandi — sama villa og "4-10 and never reach 1"
                i Set pieces (CLAUDE.md 8).
                ============================================================ */}
            <div style={S.note}>
              {gwActive ? <>
                {"Compared over "}<b>{`GW ${gwRange[0]}–${gwRange[1]}`}</b>
                {` of ${season}, summed from that season's per-gameweek file. `}
                <b>{`${ROW_FOLLOW_N} of the ${ROW_DEFS.length} rows`}</b>
                {" below follow the range; the rest are marked, because they cannot."}
              </> : <>
                {"Compared over a "}<b>{"whole season"}</b>
                {". For a "}<b>{"gameweek range"}</b>{" — the last 8 matches, say — use "}
                <b>{"Gameweeks"}</b>{" above."}
              </>}
              {gwSeasonList.length > 0
                ? ` A range works on the ${gwSeasonList.length} completed `
                  + `season${gwSeasonList.length === 1 ? "" : "s"} that have per-gameweek `
                  + `data (${gwSeasonList[0]} to ${gwSeasonList[gwSeasonList.length - 1]}). `
                : " A range works on completed seasons that have per-gameweek data. "}
              {`${currentLabel} has none until it is played, so a range cannot reach it — `
                + "the whole-season view is what it has."}
            </div>

            {(
            <div style={S.scroll}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={S.thK}></th>
                    {cols.map(({ p }) => {
                      const t = teamById?.[p.team];
                      return (
                        <th key={p.id} style={S.thP}>
                          <div style={S.pHead}>
                            {photoUrl && p.code
                              ? <SafeImg src={photoUrl(p.code)} style={S.img} />
                              : null}
                            <div style={S.pName}>{p.web_name}</div>
                            <div style={S.pMeta}>
                              {Crest && t ? <Crest team={t} size={11} /> : null}
                              {t?.short} · {POS[p.element_type]} · £{((p.now_cost ?? 0)/10).toFixed(1)}
                            </div>
                            <button style={S.rm} onClick={() => onRemove(p.id)}>{"remove"}</button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, ri) => {
                    if (row.grp) {
                      if (row.defOnly && !anyDef) return null;
                      return (
                        <tr key={`g${ri}`}>
                          <td colSpan={cols.length + 1} style={S.grp}>{row.grp}</td>
                        </tr>
                      );
                    }
                    /* VILLA SEM VAR: defOnly gilti adeins um HOPS-HAUSINN, svo
                       varnar-radirnar sjalfar birtust fyrir framherja (Haaland
                       med "CS 13" og "xGC 38,60"). Nu er sian a hverri rod.   */
                    if (row.defOnly && !anyDef) return null;
                    if (row.gkOnly && !anyGk) return null;
                    const vals = cols.map(c => c.rec ? row.get(c.rec) : null);
                    const nums = vals.filter(v => v != null && Number.isFinite(v));
                    // BESTA gildid merkt — adeins ef fleiri en einn og ekki jafntefli
                    let best = null;
                    if (nums.length > 1) {
                      const b = row.hi ? Math.max(...nums) : Math.min(...nums);
                      if (nums.filter(v => v === b).length === 1) best = b;
                    }
                    return (
                      <tr key={row.k} style={S.tr}>
                        {/* ▼ = LAEGRA ER BETRA. Merkid hvarf med `VisualRows`
                            14.8.2026 en TEXTINN undir toflunni lofar thvi
                            afram ("▼ in a row label marks a number where lower
                            is better"). Maelt 16.8.2026: 32 radir teiknadar,
                            NULL med merki, medan 9 radir bera `hi:false`.
                            `hi` er FORSENDA (CLAUDE.md 8) — villandi mynd er
                            verri en engin — svo merkid er endurreist i stad
                            thess ad fella setninguna. `hi === false` en ekki
                            `!row.hi`: adeins berum ordum merkt rod faer ▼.  */}
                        <td style={S.tdK} title={row.note || ""}>
                          {row.label}
                          {row.hi === false
                            ? <span style={S.vLo} title={"Lower is better"}>▼</span>
                            : null}
                          {/* MERKID A RODINNI, EKKI ADEINS I FOTNOTU: notandinn
                              les tofluna. Sama laerdomur og i leikmannalistanum,
                              thar sem eina merkid var `∑` i 9 px og notandinn
                              tilkynnti bilid sem BILUN (14.8.2026) — merking
                              sem sest ekki er engin merking.
                              ORDID FYLGIR ASTAEDUNNI: "season" = arstidar-tala,
                              "today" = dagsins tala. Eitt ord fyrir baedi hefdi
                              kallad Verdid arstidar-summu, sem thad er ekki. */}
                          {gwActive && !rowFollowsRange(row)
                            ? <span style={S.blindMark}
                                    title={row.live_only
                                      ? `Today's figure — it does not follow GW ${gwRange[0]}–${gwRange[1]}`
                                      : `Season figure — it does not follow GW ${gwRange[0]}–${gwRange[1]}`}>
                                {row.live_only ? RANGE_LIVE_BADGE : RANGE_BLIND_BADGE}
                              </span>
                            : null}
                        </td>
                        {vals.map((v, i) => (
                          <td key={i} style={{ ...S.td, ...(best != null && v === best ? S.tdBest : {}) }}>
                            {fmtVal(row, v)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

            <div style={S.legend}>
              <span style={S.tdBestInline}>{"Green"}</span> {"= the better value (only marked when one is unambiguously higher, never on a tie). "}
              <b>▼</b> {"in a row label marks a number where"} <b>{"lower is better"}</b> {"— minutes per point, price, goals conceded and cards, where the biggest number is the worst one."}
              {" A missing number gets \"—\", never a 0: a measured zero and \"no data\" are not the same thing."}
              {" Numbers FFS shows but no source of ours provides — touches in the box, big chances, dribbles, duels — are"} <b>{"not"}</b> {"here. See section 6b in CLAUDE.md."}
              {/* OG ThETTA ER SAGT ThVI ANNARS ER ThAD AGISKUN NOTANDANS:
                  bilid faerir TOLURNAR i toflunni, en radgjofin efst les
                  `rankScore` med LIFANDI inntokum um leikina FRAMUNDAN og
                  hun getur ekki fylgt bili aftur i timann. Vaeri thad
                  othogult vaeri thad prosenta sem litur ut eins og hun
                  hafi verid reiknud ur valda bilinu — sem hun er ekki.  */}
              {" A gameweek range moves the numbers in this table only."}
              {" The recommendation at the top reads the fixtures"} <b>{"ahead"}</b>
              {" from today's form and price, so it does not follow a range backwards —"}
              {" and a row that cannot follow the range says so next to its name"}
              {` ("${RANGE_BLIND_BADGE}" for a season figure, "${RANGE_LIVE_BADGE}" for a figure that is always current).`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  /* ---- radgjofin ---- */
  adv:{ border:"1px solid #cfe0f0", background:"#f7fbff", borderRadius:9,
        padding:"11px 13px", marginBottom:10 },
  advHead:{ display:"flex", alignItems:"baseline", gap:8, marginBottom:8 },
  advTitle:{ fontSize:14, fontWeight:700, color:"#12456f" },
  advSub:{ fontSize:11, color:C.text3 },
  advBars:{ display:"flex", flexDirection:"column", gap:4 },
  advBarRow:{ display:"grid", gridTemplateColumns:"minmax(78px,132px) 1fr 44px",
              alignItems:"center", gap:8 },
  advName:{ fontSize:12, color:C.text2, overflow:"hidden", textOverflow:"ellipsis",
            whiteSpace:"nowrap" },
  advNameLead:{ fontWeight:700, color:C.text },
  advTrack:{ height:11, background:"#e7edf4", borderRadius:6, overflow:"hidden" },
  advFill:{ height:"100%", borderRadius:6 },
  advPct:{ fontFamily:mono, fontSize:12, textAlign:"right", color:C.text2 },
  advPctLead:{ fontWeight:700, color:"#12456f", fontSize:13 },
  advWhat:{ fontSize:12, color:C.text, lineHeight:1.5, margin:"9px 0 0" },
  advCal:{ fontSize:11, color:C.text2, lineHeight:1.45, margin:"6px 0 0" },
  advWarn:{ fontSize:11.5, color:"#7a5600", background:C.amberBg,
            border:"1px solid #f0dcae", borderRadius:7, padding:"7px 9px",
            margin:"8px 0 0", lineHeight:1.45 },
  advCols:{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 },
  advCol:{ flex:"1 1 150px", minWidth:140, background:"#fff",
           border:`1px solid ${C.border}`, borderRadius:7, padding:"7px 9px" },
  advColHd:{ fontSize:12, fontWeight:700, color:C.text, marginBottom:3 },
  advColSub:{ fontSize:9, fontWeight:700, letterSpacing:0.5, textTransform:"uppercase",
              color:C.text3, margin:"6px 0 2px" },
  advTerm:{ display:"flex", justifyContent:"space-between", gap:6, fontSize:11,
            color:C.text2, padding:"1px 0" },
  advTermL:{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  advTermV:{ fontFamily:mono, fontWeight:700, flex:"0 0 auto" },
  advTermCtx:{ fontFamily:mono, color:C.text3, flex:"0 0 auto" },
  advFoot:{ fontSize:10.5, color:C.text3, lineHeight:1.45, margin:"9px 0 0" },
  /* Eini stillinn sem lifdi sulurnar af: ▼-merkid i rod-heitinu. `vGrp` var
     eftir sem DAUDUR still (eina tilvikid i ollu repo-inu var eigin
     skilgreining) og var fjarlaegdur 16.8.2026.                            */
  vLo:{ fontSize:8, color:C.text3, flexShrink:0, marginLeft:3 },

  wrap:{ position:"fixed", inset:0, background:"rgba(20,20,25,0.5)", zIndex:70,
         display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 12px", overflowY:"auto" },
  panel:{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, padding:14,
          width:"min(880px, 100%)", boxShadow:"0 20px 60px rgba(0,0,0,0.28)" },
  head:{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:8 },
  h2:{ margin:0, fontSize:16, fontWeight:700, color:C.purple },
  headCtl:{ display:"flex", alignItems:"center", gap:6 },
  sel:{ border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 7px", fontSize:12 },
  /* ---- umferdar-bilid. Tolurnar eru THAER SOMU og i leikmannalistanum
     (19 px kassar, 18 px haed) svo strikid se sama hlutur sjonraent; thad
     er 38 x 19 = ~760 px og glugginn er 880, svo thad passar. ---- */
  gwToggle:{ display:"inline-flex", alignItems:"center", gap:3, border:`1px solid ${C.border}`,
             background:C.card, color:C.text2, borderRadius:6, padding:"3px 8px",
             fontSize:11.5, cursor:"pointer" },
  gwToggleOff:{ color:C.text3, background:C.cardAlt, cursor:"not-allowed" },
  caret:{ fontSize:9, display:"inline-block", transition:"transform .12s" },
  gwWrap:{ border:`1px solid ${C.border}`, background:C.cardAlt, borderRadius:7,
           padding:"6px 8px", marginBottom:8 },
  gwTop:{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:5 },
  gwPreset:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2,
             borderRadius:5, padding:"2px 7px", fontSize:11, cursor:"pointer" },
  gwNow:{ fontSize:11, color:C.text2, fontFamily:mono },
  gwRetry:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2,
            borderRadius:4, padding:"1px 5px", fontSize:10, cursor:"pointer" },
  gwWhy:{ fontSize:11.5, color:"#7a5600", background:C.amberBg,
          border:"1px solid #f0dcae", borderRadius:6, padding:"7px 9px",
          marginBottom:8, lineHeight:1.5 },
  gwBar:{ display:"flex", gap:1, flexWrap:"nowrap", overflowX:"auto" },
  gwCell:{ flex:"1 1 0", minWidth:19, height:18, border:`1px solid ${C.border}`,
           background:"#fafafb", color:C.text3, borderRadius:2, cursor:"pointer",
           fontSize:9, padding:0, lineHeight:"16px", fontFamily:mono },
  gwOn:{ background:"#e8e2ee", color:C.purple, border:"1px solid #cdbcd8" },
  gwEdge:{ background:C.purple, color:"#fff", border:`1px solid ${C.purple}`, fontWeight:700 },
  /* SAMA MERKI OG HAUSINN I LEIKMANNALISTANUM ber (`blindMark` thar) —
     ordid sjalft er i `gwRange.js` svo thau geti ekki ordid tvennt.      */
  blindMark:{ fontSize:9, fontWeight:700, color:"#fff", background:"#8b7d9b",
              borderRadius:3, padding:"1px 3px", marginLeft:4, letterSpacing:0.2 },
  clear:{ border:`1px solid ${C.border}`, background:C.card, color:C.text2, borderRadius:6,
          padding:"3px 9px", fontSize:11.5, cursor:"pointer" },
  close:{ border:"none", background:"transparent", fontSize:16, color:C.text2, cursor:"pointer" },
  empty:{ fontSize:12.5, color:C.text2, padding:"18px 4px", lineHeight:1.6 },
  warn:{ fontSize:11.5, color:"#7a5600", background:"#fff6e0", border:"1px solid #f0dcae",
         borderRadius:6, padding:"7px 9px", marginBottom:8 },
  note:{ fontSize:11, color:C.text2, background:C.cardAlt, border:`1px solid ${C.border}`,
         borderRadius:6, padding:"7px 9px", marginBottom:9, lineHeight:1.55 },
  scroll:{ overflowX:"auto" },
  tbl:{ borderCollapse:"collapse", width:"100%", fontSize:12 },
  thK:{ width:150, borderBottom:`1px solid ${C.border}` },
  thP:{ padding:"4px 6px", borderBottom:`1px solid ${C.border}`, verticalAlign:"bottom", minWidth:110 },
  pHead:{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 },
  img:{ width:38, height:48, objectFit:"contain" },
  pName:{ fontSize:11.5, fontWeight:700, color:C.text, textAlign:"center" },
  pMeta:{ fontSize:9, color:C.text3, display:"flex", alignItems:"center", gap:3 },
  rm:{ border:"none", background:"transparent", color:C.text3, fontSize:9,
       textDecoration:"underline", cursor:"pointer", padding:0, marginTop:2 },
  grp:{ fontSize:10, fontWeight:700, color:C.purple, textTransform:"uppercase",
        letterSpacing:0.4, padding:"8px 6px 3px", borderBottom:`1px solid ${C.border}` },
  tr:{ borderBottom:"1px solid #f4f4f6" },
  tdK:{ padding:"3px 6px", fontSize:11, color:C.text2, whiteSpace:"nowrap" },
  td:{ padding:"3px 6px", textAlign:"center", fontFamily:mono, fontSize:11.5, color:C.text2 },
  tdBest:{ background:"#e6f9f0", color:"#046b41", fontWeight:700 },
  tdBestInline:{ background:"#e6f9f0", color:"#046b41", fontWeight:700, padding:"0 4px", borderRadius:3 },
  legend:{ fontSize:10.5, color:C.text3, marginTop:9, paddingTop:8,
           borderTop:`1px solid ${C.border}`, lineHeight:1.55 },
};
