/* ============================================================
   advice.js — FRA TOLUM AD AKVORDUN. Hrein, engin gogn, ekkert React.

   ALLT HITT I THESSU VERKEFNI SVARAR "hver er bestur". Thessi skra
   svarar hinni spurningunni, sem er su eina sem thu stendur
   raunverulega frammi fyrir: **hvern a ad taka NUNA?**

   THAER ERU EKKI SAMA SPURNINGIN, og munurinn er thad sem gerir
   draft ad draft: besti lausi madurinn getur verid rangt val ef hann
   verdur enn lasus thegar rodin kemur aftur ad ther, medan sa
   naestbesti verdur farinn.

   HUGMYNDIN SEM VAR PROFUD — OG FELLD
   Fyrir hverja stodu ma reikna hversu god hun verdur VID NAESTA VAL
   thitt, ad teknu tilliti til thess hverjir lifa af:

       bradanauðsyn(i) = VBD(i) - E[besta VBD a hans stodu vid naesta val]

   Thad hljomar rett og thad er thad sem hver einasta draft-leidbeining
   segir. **Thad var maelt og thad tapar.** I standard-sniði er lid sem
   velur eftir bradanauðsyn 63,8 stigum UNDIR lidi sem tekur einfaldlega
   besta A-Ranking-manninn, og vinnur 0 af 4 arum. Sja langa notu i
   `recommend` um hvers vegna.

   THVI ER SVARID EINFALT: **taktu besta A-Ranking-manninn sem thu matt.**
   Bradanauðsyn og lifunarlikur eru skiladar sem UPPLYSINGAR — thaer
   segja ther hvort thu getir beðid — en thaer rada ekki.

   LIFUNARLIKUR eru reiknadar ur ADP OG DREIFINGU THESS. ADP eitt
   dugar ekki: leikmadur med ADP 30 og stadalfravik 3 er nanast
   oruggur i 20 saeta bid, en ADP 30 med stadalfravik 20 er thad
   ekki. FantasyFootballCalculator birtir `stdev` og hann er notadur.

   MAELT (`scripts/advice-lab.mjs`): sja `MEASURED` nedst.
   ============================================================ */

/* ---------- lifunarlikur ---------- */

/**
 * Likur a ad leikmadur se ENN LAUS vid val numer `pick`.
 *
 * Likan: draft-stada hans er normaldreifd um ADP med stadalfraviki
 * `sd`. Likur a ad hann se farinn vid val `p` = P(draftstada <= p).
 *
 * HVERS VEGNA NORMALDREIFING OG EKKI EITTHVAD FINNA: FFC birtir
 * `stdev` beint ur raunverulegum droftum, svo dreifingin er MAELD
 * en ekki agiskud. Snidid sjalft (normal) er nalgun, en skekkjan i
 * thvi er miklu minni en skekkjan sem faest af thvi ad hunsa
 * dreifinguna alveg — sem er thad sem hvert einasta bord gerir
 * thegar thad birtir ADP sem eina tolu.
 *
 * VANTI `sd` er notad `SD_K * sqrt(ADP)`.
 *
 * SD_K ER MAELT, EKKI VALID. Fittad a 1.882 leikmanna-arum 2015-2025
 * thar sem FFC birti bædi ADP og stdev:  **k = 1,082**.
 * Fyrsta utgafa thessarar skrar setti 0,55 — HELMING af rettu gildi.
 * Su villa hefdi gert hvern einasta leikmann ad lita ut fyrir ad vera
 * MIKLU oruggari en hann er, og radgjofin hefdi thvi radlagt ad bida
 * eftir monnum sem eru i raun farnir. Villan sast adeins thvi
 * `advice-lab.mjs` fittar tolina i hverri keyrslu og prentar hana
 * vid hlidina a theirri sem kodinn notar.
 */
export const SD_K = 1.08;

export function survivalProb(adp, sd, pick) {
  if (adp == null || pick == null) return null;
  const s = sd != null && sd > 0 ? sd : defaultSd(adp);
  /* Samfelldnileidretting: val `pick` er heiltala, svo mork liggja
     a pick - 0,5. An hennar skeikar talan kerfisbundid um halft val. */
  const z = (pick - 0.5 - adp) / s;
  return clamp(1 - normalCdf(z), 0, 1);
}

export const defaultSd = (adp) => Math.max(2, SD_K * Math.sqrt(Math.max(1, adp)));

/** Abramowitz-Stegun 7.1.26 — nog nakvaemni (|villa| < 7,5e-8). */
export function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t *
    (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/* ---------- vaent besta gildi vid naesta val ---------- */

/**
 * E[haesta VBD a stodu `pos` sem er enn laust vid val `nextPick`].
 *
 * Reiknad nakvaemlega, ekki hermt: ef leikmenn eru radadir eftir VBD
 * tha er vaentigildi haesta lifandi gildis
 *
 *     sum_i  VBD_i * P(i lifir) * prod_{j<i} P(j lifir EKKI)
 *
 * Thetta er rett svo lengi sem lifun er ohad milli leikmanna. Hun er
 * thad ekki alveg — thegar einn hlaupari fer snemma faerast hinir upp
 * — en fylgnin er jakvaed, sem thydir ad talan er VARFAERIN
 * (vanmetur hve mikid tapast vid ad bida). Rett att ad skeika i.
 */
export function expectedBestAt(players, pos, nextPick) {
  const list = players
    .filter((p) => p.pos === pos && p.vbd != null && p.adp != null)
    .sort((a, b) => b.vbd - a.vbd);
  if (!list.length) return { value: 0, n: 0 };

  let acc = 0, none = 1;
  for (const p of list) {
    const s = survivalProb(p.adp, p.adpSd, nextPick);
    if (s == null) continue;
    acc += p.vbd * s * none;
    none *= 1 - s;
    if (none < 1e-4) break;              // afgangurinn skiptir engu
  }
  /* `none` er su likur ad ENGINN theirra lifi. Tha faerdu thann sem
     er neðstur i listanum — ekki 0. Ad setja 0 ofmaeti bradanauðsyn
     stodunnar storlega. */
  const floorV = list[list.length - 1].vbd;
  return { value: acc + none * floorV, n: list.length };
}

/* ---------- rodun hopsins ---------- */

/**
 * Hversu morg saeti eru thangad til thu velur naest, i snakk-drafti.
 * `pick` er heildar-valnumer (1-basad), `teams` fjoldi lida.
 *
 * I snakki er bidin MISLONG eftir thvi hvar i umferdinni thu ert:
 * ur saeti 1 bidur thu 2N-1 val eftir fyrsta valid en adeins 1 eftir
 * annad. Ad nota fastan N vaeri rangt fyrir alla nema thann sem
 * situr nakvaemlega i midjunni.
 */
/**
 * Valnumerid sem SAETI `slot` a i umferd `round`, i snakki.
 *
 * Ojafnar umferdir gefa `(round-1)*teams + slot`; jafnar umferdir eru
 * ANDHVERFAR, svo saeti 1 velur SIDAST. Thetta er nakvaemlega sama
 * vorpun og `picksUntilNext` notar, bara i hina attina — thaer VERDA
 * ad vera samhljoda, annars segdi bordid annad en radgjofin.
 */
export function ownPickNo(round, teams, slot) {
  return round % 2 === 1
    ? (round - 1) * teams + slot
    : (round - 1) * teams + (teams - slot + 1);
}

/**
 * Naesta val ÞITT eftir valnumer `cur`. Skilar `null` vanti saeti eda
 * lidafjolda — thad er rett: an saetis er engin snakk-rod og tha ma
 * appid ekki lita einn einasta leikmann.
 *
 * `cur` er valid SEM ER A KLUKKUNNI. Skilyrdid er `> cur`, ekki
 * `>= cur`, og thad er merkingarbaert i BADUM tilfellum:
 *
 *   · er valid THITT (cur === thitt val): tha er allt laust fyrir ther
 *     NUNA, svo spurningin er um valid a EFTIR — "ef eg sleppi honum".
 *   · er valid annars: tha er `> cur` einfaldlega naesta val thitt.
 *
 * Ein regla ber baedi tilfellin, svo thau geta ekki rekid i sundur.
 */
export function nextOwnPick(cur, teams, slot, maxRounds = 40) {
  /* `Number(null)` ER 0 OG `Number("")` ER LIKA 0 — svo `Number.isFinite`
     eitt hleypir theim BADUM i gegn sem gildu vali nr. 0. Thad er
     einmitt tilfellid sem tharf ad stoppa: "vid vitum ekki hvar draftid
     er" myndi tha lesast eins og "draftid er ekki byrjad", og bordid
     litadi hvern leikmann eftir vali sem er ekki til. `== null` fyrst,
     tolupróf sidan. */
  if (cur == null || teams == null || slot == null) return null;
  const t = Math.round(Number(teams)), s = Math.round(Number(slot));
  const c = Math.round(Number(cur));
  if (!Number.isFinite(t) || !Number.isFinite(s) || !Number.isFinite(c)) return null;
  if (t < 2 || s < 1 || s > t) return null;
  for (let r = 1; r <= maxRounds; r++) {
    const p = ownPickNo(r, t, s);
    if (p > c) return p;
  }
  return null;
}

/**
 * Bid fra `pick` ad naesta vali SAMA SAETIS — thegar `pick` ER thitt val.
 *
 * ============================================================
 * ÞETTA FALL LEIDIR SAETID UT AF VALNUMERINU, OG ÞAD ER FORSENDA
 * ============================================================
 * `slot` hér ad nedan er REIKNAD ur `pick`. Thad er rett nakvaemlega
 * thegar `pick` er MITT val — tha er saetid sem a `pick` mitt saeti.
 * Se `pick` valid SEM ER A KLUKKUNNI (og einhver annar a thad) leidir
 * fallid ut SAETI HINS og skilar bidinni HANS.
 *
 * ÞAÐ VAR RAUNVERULEG VILLA OG HUN VAR A SKJANUM: `NextPick` sendi
 * `taken.size + 1` (klukkuvalid) hingad medan bordid lit sig med
 * `nextOwnPick(cur, teams, sync.slot)` — sem notar RAUNVERULEGA saetid.
 * I 10-lida deild med saeti 7 og 20 vol komin sagdi sami skjar
 * samtimis **"naesta val #27"** (bordid) og **"naesta val 40, bid 19"**
 * (kassinn). Tolurnar voru samhljoda i **6 af 60 volum (10%)** — bara
 * thegar valid a klukkunni var mitt. Sami leikmadur bar 0% i kassanum
 * og 31% i sinni eigin rod.
 *
 * Þess vegna tekur `recommend` nu vid `nextPick` BERUM ORDUM thegar
 * saetid er thekkt, og thessi afleidsla er ADEINS bakleid fyrir
 * handvirkt draft an Sleeper-samstillingar. Vordur:
 * `tests/advice.mjs` kafli 12 — hann ber toluna sem BORDID litar med
 * vid toluna sem KASSINN birtir og fellur ef thaer skilja.
 */
export function picksUntilNext(pick, teams) {
  const round = Math.ceil(pick / teams);
  const idx = pick - (round - 1) * teams;            // 1..teams
  const slot = round % 2 === 1 ? idx : teams - idx + 1;
  const nextPick = round % 2 === 1
    ? round * teams + (teams - slot + 1)
    : round * teams + slot;
  return nextPick - pick;
}

/* ---------- radgjofin ---------- */

/**
 * Metur hvern lausan leikmann og skilar rodudum lista med ROKUM.
 *
 * `available`  [{ id, name, pos, vbd, adp, adpSd, tier, ... }]
 * `roster`     [{ pos }] — thad sem thu att thegar
 * `pick`       valid sem er A KLUKKUNNI (thad naesta sem verdur tekid)
 * `nextPick`   MITT naesta val, BERUM ORDUM. Se thad gefid er thad notad
 *              og engu giskad; vanti thad er thad leitt ut med
 *              `picksUntilNext` — sem gerir tha rad fyrir ad `pick` se
 *              mitt. Sja hausinn a `picksUntilNext` fyrir villuna sem
 *              thessi breyta er til ad utiloka.
 * `league`     { teams, starters, maxPos }
 *
 * ROKIN ERU HLUTI AF UTKOMUNNI, EKKI SKRAUT. Radgjof sem segir
 * "taktu X" an thess ad segja hvers vegna er ekki haegt ad vera
 * osammala, og notandi sem getur ekki verid osammala haettir ad nota
 * tolurnar og fer ad nota magatilfinninguna.
 */
export function recommend({ available, roster = [], pick, league, nextPick: nextIn }) {
  const teams = league.teams || 12;
  /* Gefid `nextPick` VINNUR. Hafnad er adeins tolu sem er ekki eftir
     `pick` — hun gaefi negatifa bid og "0% lifun" a alla. */
  const nextPick = Number.isFinite(nextIn) && nextIn > pick
    ? Math.round(nextIn)
    : pick + picksUntilNext(pick, teams);
  const wait = nextPick - pick;

  /* Hvad a hver stada ad vera vid naesta val? */
  const expNext = {};
  for (const pos of ["QB", "RB", "WR", "TE"]) {
    expNext[pos] = expectedBestAt(available, pos, nextPick);
  }

  const counts = {};
  for (const r of roster) counts[r.pos] = (counts[r.pos] || 0) + 1;

  const out = [];
  for (const p of available) {
    if (p.vbd == null || !expNext[p.pos]) continue;
    const max = (league.maxPos || {})[p.pos];
    if (max != null && (counts[p.pos] || 0) >= max) continue;

    const eNext = expNext[p.pos].value;
    const urgency = p.vbd - eNext;
    const survive = survivalProb(p.adp, p.adpSd, nextPick);

    out.push({
      ...p,
      urgency: round1(urgency),
      expectedNext: round1(eNext),
      survive: survive == null ? null : Math.round(survive * 100) / 100,
      /* HVERS VEGNA HANN, i einni setningu sem er RETT. */
      reasons: reasonsFor(p, { urgency, eNext, survive, wait, counts, league }),
    });
  }

  /* ============================================================
     RODAD EFTIR VBD (A-RANKING), EKKI EFTIR BRADANAUÐSYN.

     ÞETTA ER NIDURSTADA MAELINGAR, EKKI SMEKKUR.
     `scripts/advice-lab.mjs` hermdi bædi: lid sem valdi eftir
     haestu bradanauðsyn gegn lidi sem valdi einfaldlega besta
     A-Ranking-manninn, 12-lida snakk, oll saeti, 2022-2025.

       PPR       radgjof 1998,9  ·  A-Ranking 1985,3   (+13,6, INNAN vikmarka)
       standard  radgjof 1501,5  ·  A-Ranking 1565,3   (-63,8, MARKTAEKT VERRI,
                                                        vinnur 0 af 4 arum)

     HVERS VEGNA HUN TAPAR: bradanauðsyn maelir STADBUNDINN bratta —
     hversu mikid stadan versnar fram ad naesta vali — og verdlaunar
     thvi mann med litid algilt virdi ef bratti er skarpur fyrir aftan
     hann. I hermuninni 2024 (standard) tok hun Tyreek Hill i vali 43
     framyfir Christian McCaffrey sem bar VBD 82. Su skipti kostar 40+
     stig sem faest ALDREI aftur, i skiptum fyrir bratta sem jafnast
     ut sidar hvort sem er.

     I PPR eru stodurnar naerri jafngildar og villan kostar litid; i
     standard, thar sem hlauparar bera virdid, kostar hun timabilid.
     Ein tala sem virkar i odru sniði en ekki hinu er ekki likan
     heldur tilviljun.

     THVI ER `urgency` SKILAD SEM UPPLYSING EN RAEDUR EKKI ROD.
     Lifunarlikur eru gagnlegar — thaer segja hvort thu getir beðid —
     en akvordunin er afram: taktu besta A-Ranking-manninn sem thu matt.
     ============================================================ */
  out.sort((a, b) => b.vbd - a.vbd);

  /* ============================================================
     SAETI SEM RODIN NAER ALDREI TIL — K OG DST
     ============================================================
     K og DST eru VILJANDI utan A-Ranking: their voru aldrei med i
     neinni hermun sem stadfestir rodina, og rod an maelingar er
     agiskun sem litur ut eins og maeling.

     EN ad rada theim ekki ma ekki thyda ad thegja um tha. Hermd
     drafting i 14 umferdum gaf hopinn RB3 WR7 TE2 QB2 — fullkomlega
     nothaefan NEMA ad tvo byrjunarsaeti stodu tom alla leidina, thvi
     radgjofin nefndi hvorugan einu sinni. Notandi sem fylgir henni i
     blindni endar med enga spyrnu og enga vorn.

     Thess vegna er skilad LISTA, ekki rod: hvada stodur deildin
     BYRJAR med, ber engan i hopnum, og radgjofin mun aldrei stinga
     upp a. `urgent` kviknar thegar valin sem eftir eru duga vart
     lengur til ad fylla thau.                                    */
  const st = league.starters || {};
  /* ============================================================
     SJALFGEFID `rounds` VAR 14 HER OG 15 I `DEFAULT_LEAGUE`
     ============================================================
     Tvo olik sjalfgefin gildi fyrir SAMA reit, og thad hefur afleidingu:
     `picksLeft = rounds - roster.length` styrir `mustFillUrgent`, sem er
     thad eina sem segir ther ad taka spyrnumann eda vorn. Vid 14 taldi
     radgjofin EINU VALI FAERRA en deildin ber, svo hun kallaði
     "bradanauðsyn" einni umferd of snemma i hverri deild sem notar
     sjalfgefna toluna.

     ÞETTA ER NAKVAEMLEGA VILLAN SEM `build.js` SKJALAR UM `maxPos`:
     "thad sem var maelt var ekki thad sem for i loftid". Þar bar
     hermunin stodu-thak sem appid hafdi ekki; hér ber radgjofin
     umferda-fjolda sem deildin hefur ekki. Bædi eru sama aett: TVAER
     UTGAFUR AF SOMU DEILD.

     `DEFAULT_LEAGUE` er heimildin. `advice.js` flytur hana EKKI inn
     (thad byggi til hring: `build.js` -> `model.js` og `advice.js` er
     lesin af `build.js`-notendum), svo talan er skrifud hér med
     TILVISUN i heimildina og profid ber thaer saman — sja
     `tests/advice.mjs`, sem fellur ef thaer reka i sundur.           */
  const rounds = league.rounds || 15;
  const picksLeft = Math.max(0, rounds - roster.length);
  const mustFill = [];
  for (const pos of Object.keys(st)) {
    if (pos === "FLEX" || pos === "SUPERFLEX") continue;
    if (expNext[pos]) continue;               // stada sem rodin naer til
    const short = (st[pos] || 0) - (counts[pos] || 0);
    if (short > 0) mustFill.push({ pos, short });
  }
  const needed = mustFill.reduce((a, m) => a + m.short, 0);

  /* ============================================================
     AUDAR VIKUR — TALDAR, EKKI VEGNAR
     ============================================================
     Hopurinn getur borid thrja hlaupara sem eru allir i frii i viku 7.
     Timabils-summan sem stadfestir rodina er BLIND a thad, svo thetta
     var ekki haegt ad maela fyrr en vikulega talningin var byggd.

     MAELT (bye-lab.mjs, vikulega, 2019-2025, badar spaheimildir): tiu
     af tiu vogum jakvaedar en 8 af 12 arum og vikmorkin innihalda
     null. Merkid faer thvi AD SJAST og EKKI ad rada — sama regla og
     Evruálagid i FPL-verkefninu.                                    */
  const byeClash = [];
  {
    const seen = new Map();
    for (const r of roster) {
      if (r.bye == null || !r.pos) continue;
      const k = `${r.pos}|${r.bye}`;
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    for (const [k, n] of seen) {
      if (n < 2) continue;
      const [pos, bye] = k.split("|");
      byeClash.push({ pos, bye: Number(bye), n });
    }
    byeClash.sort((a, b) => b.n - a.n);
  }

  return {
    pick, nextPick, wait,
    /* Audar vikur sem rekast a — UPPLYSING, ekki thattur i rodinni. */
    byeClash,
    /* Stodur sem thu verdur ad fylla en rodin nefnir aldrei. */
    mustFill,
    mustFillUrgent: needed > 0 && picksLeft <= needed + 1,
    picksLeft,
    /* Sa sem bradanauðsyn hefdi valid. Hafdur med svo haegt se ad sja
       HVENAER thaer tvaer adferdir eru osammala — thad er sjalft
       upplysandi — en hann er EKKI tillagan. */
    urgencyPick: out.slice().sort((a, b) => b.urgency - a.urgency)[0] || null,
    picks: out,
    expectedNext: Object.fromEntries(
      Object.entries(expNext).map(([k, v]) => [k, round1(v.value)])),
    /* Vidmotid VERDUR ad geta sagt fra thvi ad rodin se A-Ranking. */
    orderedBy: "aRank",
  };
}

function reasonsFor(p, { urgency, eNext, survive, wait, counts, league }) {
  const r = [];
  const need = ((league.starters || {})[p.pos] || 0) - (counts[p.pos] || 0);

  if (survive != null && survive < 0.25) {
    r.push({ kind: "gone", text:
      `only ${Math.round(survive * 100)}% likely to last your next ${wait} picks` });
  } else if (survive != null && survive > 0.7) {
    r.push({ kind: "wait", text:
      `${Math.round(survive * 100)}% likely to still be here in ${wait} picks` });
  }

  if (urgency > 25) {
    r.push({ kind: "drop", text:
      `${Math.round(urgency)} points better than what ${p.pos} should offer next time` });
  } else if (urgency < 5) {
    r.push({ kind: "flat", text:
      `${p.pos} drops off by only ${Math.max(0, Math.round(urgency))} before your next pick` });
  }

  /* ============================================================
     "ÞU THARFT ENN 2 WR" ER STADREYND, EKKI ROKSTUDNINGUR.
     ============================================================
     Notandinn las thennan streng og spurdi hvort akvordunin taeki
     tillit til thess ad hann aetti engan WR. Hun gerir thad EKKI —
     `out.sort((a, b) => b.vbd - a.vbd)` og ekkert annad. En strengur
     sem stendur i dalki sem heitir "Why" les eins og hann hafi radid,
     og thad er sama aett af villu og omaeld tala i eigin reit.

     Stodu-thorf var maeld i thremur myndum og engin theirra slaer
     "besta lausa mann": 19 stodu-plon (strategy-lab, ekkert marktaekt),
     bradanauðsyn sem rod (advice-lab, -63,8 i standard, 0/4 ar) og
     lifunarlikur sem jafnteflis-rof (tiebreak-lab, t=-0,06 / +0,79).
     Thess vegna segir strengurinn nu sjalfur hvad hann er.

     Vordur: `tests/advice.mjs` — spegilmynd hopsins verdur ad gefa
     NAKVAEMLEGA somu rod, OG thorfin verdur samt ad vera nefnd.      */
  if (need > 0) {
    r.push({ kind: "need",
             text: `you still need ${need} at ${p.pos} — noted, not ranked` });
  }
  if (p.tier != null) r.push({ kind: "tier", text: `tier ${p.tier}` });
  return r;
}

const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

/* ============================================================
   MAELDAR TOLUR — sja `scripts/advice-lab.mjs`
   ============================================================
   Fyllt inn thegar maelingin hefur keyrt. Ef thessi hlutur er tomur
   a vidmotid ad segja ad radgjofin se OMAELD.
   ============================================================ */
export const MEASURED = {
  /* Stadalfravik ADP thegar FFC birtir thad ekki. Fittad a 1.882
     leikmanna-arum 2015-2025: k = 1,082. Kodinn notar 1,08. */
  sdRule: "1.08 * sqrt(ADP)",
  sdRuleFitted: 1.082,
  sdRuleSample: 1882,

  /* Hermun 2022-2025, 12-lida snakk, oll saeti, motherjar eftir ADP.
     Bradanauðsyn gegn thvi ad taka einfaldlega besta A-Ranking-mann. */
  urgencyVsARank: {
    ppr: { diff: 13.6, lo: -42.4, hi: 47.9, significant: false, winYears: 3, years: 4 },
    standard: { diff: -63.8, lo: -100.4, hi: -21.9, significant: true, winYears: 0, years: 4 },
  },
  /* NIDURSTADAN: bradanauðsyn radar EKKI. Sja langa notu i `recommend`. */
  urgencyDrivesOrder: false,

  /* A-Ranking gegn hraru ADP i somu hermun — thad sem RAEDUR. */
  aRankVsAdp: {
    ppr: { diff: 239.4, significant: true },
    standard: { diff: 267.1, significant: true },
  },
};
