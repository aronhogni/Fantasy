/* ============================================================
   RADGJOFIN — "hvorn theirra a eg ad kaupa?"

   HREINT, EKKERT REACT (sama regla og model.js/stats.js: profin keyra
   NAKVAEMLEGA sama kodann og skjarinn synir).

   ============================================================
   ThAD SEM SKIPTIR MESTU: HVAD PROSENTAN ThYDIR
   ============================================================
   Hun er EKKI "70% likur a ad thetta se god kaup". Su tala vaeri
   omaelanleg — enginn veit hvad "god kaup" er sem utkoma — og hun vaeri
   thvi okkar agiskun i bunimgi maelingar, nakvaemlega thad sem allt
   thetta repo fordast.

   Hun ER: **hlutfall theirra skipta i fortidinni sem sa sem skorid setti
   ofar skoradi raunverulega fleiri stig i umferdinni**. Thad er maelt:

     306.653 samanburdir INNAN SOMU UMFERDAR, 5 timabil, ur sama spjaldi
     og rank-model.mjs notar (tests/lib/panel.mjs — timaheidarlegt).

     bil i rankScore   n        P(haerri skorar meira)
        0 - 0,25     42.861            51,2%
     0,25 - 0,5      41.144            54,2%
      0,5 - 0,75     38.069            57,2%
     0,75 - 1        34.697            59,3%
        1 - 1,5      57.046            63,4%
      1,5 - 2        40.736            68,1%
        2 - 3        38.805            73,1%
        3 +          13.295            80,6%

     Logistisk fitun:  P = 1 / (1 + exp(-(A + B*bil)))
     LOSO a timabilum: B = 0,400-0,416 og A = 0,022-0,027 — thett, svo
     thetta er ekki yfirfitting. Brier slaer 0,5-vidmidid i 5/5
     timabilum (0,1706-0,1818 a moti 0,1923-0,1996), UT FYRIR URTAK.

   ============================================================
   ThAKIÐ ER RAUNVERULEIKINN, EKKI HOGVAERD
   ============================================================
   Jafnvel VID MESTA BIL sem gognin geyma fer talan adeins i ~81%.
   Fotbolti i einni umferd er thad hávaðasamur. Verkfaeri sem segdi
   "95% buy" vaeri ad ljuga, og thess vegna getur thetta thad ekki:
   thakid kemur ur maelingunni, ekki ur varfaerni i ordalagi.

   ============================================================
   KJARNINN ER `rankScore`, OG ThAÐ ER ASETT
   ============================================================
   Skorid er MAELDA rodunar-vélin (model.js, RANK_W): fittud a 5
   timabilum med ridge og LOSO, og hun slaer BAEDI adferd appsins
   (topp-15 5,13 a moti 4,70) OG **FPL-eigid xP** (4,48) — hardasta
   vidmidid, thvi FPL hefur gogn sem vid hofum ekki.

   Ad byggja NYTT skor fyrir thetta vidmot hefdi thytt annad, omælt skor
   vid hlidina a thvi maelda. Fjogur inntok — form, minutur, verd, FFDR
   (+ minutu-throun) — voru ekki valin af smekk: 57 inntok voru profud og
   VERSNUDU valid.

   ============================================================
   ThAD SEM ER **EKKI** I PROSENTUNNI, OG HVERS VEGNA
   ============================================================
   Notandinn bad um "OLL gogn". Sum theirra hafa verid MAELD OG HOFNUD
   sem spágildi, og ad lauma theim inn i toluna vaeri ad selja havada
   sem visdóm. Their eru thvi birtir SER, sem SAMHENGI, med sinum
   fyrirvara — sest, en vega ekki:

     DefCon      — MAELT ad hun dregur i GAGNSTAEDA att vid hreint blad
                   (DC fylgir thyngri leikjum). Blondun laetur merkin eta
                   hvort annad. CLAUDE.md kafli 3.
     Jofnudur    — leif eftir stig og verd er ogreinanleg fra nulli innan
                   stodu (DEF 0,12 / MID 0,13, 2*SE 0,21-0,27, formerki
                   flakka). Vordur bannar hana i rankScore. Kafli 6o.
     "Heitur"    — INNAN LEIKMANNS er vaeg AFTURHVARF, ekki form:
                   -4,52pp eftir mark (t = -5,26). Kafli 6c.
     Byrjunar-   — MAELD (Brier -24%) en hun svarar ANNARRI spurningu:
     likur         "spilar hann?" en ekki "hver skorar meira?". Hun er
                   thvi HLID, ekki lidur — sja nedar.

   ============================================================
   BYRJUNAR-LIKUR ERU HLIÐ, EKKI LIÐUR
   ============================================================
   Maelda talan svarar "hvor skorar meira **ef badir spila**". Sa sem
   spilar ekki skorar ekki neitt, og thad er onnur og HARDARI spurning.
   Ad margfalda tolunum saman hefdi falid badar: 60% sem verdur 45%
   segir hvorki ad hann se betri ne ad hann se i haettu.
   Thess vegna stendur prosentan obreytt OG vidvorunin vid hlidina.
   ============================================================ */

import { rankScore } from "./model.js";

/* MAELDIR FASTAR — sja hausinn. Ekki breyta an nyrrar maelingar.
   (Fittad a ollum 5 timabilum; LOSO-svidid er A 0,022-0,027 og
   B 0,400-0,416, svo thessi gildi liggja inni i thvi.)              */
export const ADVISOR_CAL = { A: 0.0258, B: 0.4066 };
/* Haesta bil sem gognin geyma i marktaeku magni. Umfram thad er
   framreikningur, ekki maeling, svo talan er KLIPPT thar.           */
export const ADVISOR_MAX_GAP = 3.5;

/* P(sa haerri skorar meira i umferdinni) fyrir gefid bil i rankScore. */
export function pairWinProb(gap, cal = ADVISOR_CAL) {
  const g = Math.min(Math.abs(Number.isFinite(gap) ? gap : 0), ADVISOR_MAX_GAP);
  return 1 / (1 + Math.exp(-(cal.A + cal.B * g)));
}

/* Framlag hvers inntaks til skorsins, MIDAD VID HOPINN.
   rankScore er LINULEGT, svo framlagid er nakvaemlega w*(x - medaltal
   hopsins) — engin agiskun, engin "mikilvaegis"-heuristik. Thess vegna
   LEGGJAST thessar tolur saman i skor-mun mannsins vid hopinn, og
   skyringin getur ekki stangast a vid nidurstoduna.                  */
const TERMS = [
  { key: "form",        w: "form",        label: "Form (points per match, last 5)" },
  { key: "minsPerGame", w: "minsPerGame", label: "Minutes per match" },
  { key: "price",       w: "price",       label: "Price — the market's own rating" },
  { key: "ffdr",        w: "ffdr",        label: "Fixture difficulty (FFDR)" },
  { key: "minsTrend",   w: "minsTrend",   label: "Minutes trend" },
];

const num = v => (typeof v === "number" && Number.isFinite(v) ? v : null);

/* `players` = [{ id, name, pos, inputs:{form,minsPerGame,price,ffdr,minsTrend},
                  startProb, available, dc, aron, note }]
   Skilar rodum i SOMU rod og inn kom, hverri med `share` (0-1) sem
   leggst saman i 1 yfir hopinn.                                      */
export function advise(players, { weights = null } = {}) {
  const list = (players || []).filter(Boolean);
  if (list.length < 2) return { rows: [], n: list.length, ok: false, reason: "need_two" };

  const W = weights || RANK_W_SAFE();
  const scored = list.map(p => {
    const i = p.inputs || {};
    return {
      ...p,
      score: rankScore({
        form: num(i.form), minsPerGame: num(i.minsPerGame), price: num(i.price),
        ffdr: num(i.ffdr), minsTrend: num(i.minsTrend),
      }),
      inputs: i,
    };
  });

  /* HLUTDEILD UR PORUM, EKKI UR SOFTMAX. Softmax vaeri NY tala med nyjum
     hitastigs-stika sem enginn hefur maelt. Medal-vinningslikindi gegn
     hinum i hopnum er hins vegar BEIN framlenging a thvi sem VAR maelt:
     fyrir TVO menn skilar hun nakvaemlega maeldu tolunni.              */
  const rows = scored.map((p, idx) => {
    const others = scored.filter((_, j) => j !== idx);
    const wins = others.map(o => {
      const gap = p.score - o.score;
      const win = gap >= 0 ? pairWinProb(gap) : 1 - pairWinProb(gap);
      return { id: o.id, name: o.name, gap: +gap.toFixed(3), win };
    });
    const mean = wins.reduce((a, b) => a + b.win, 0) / wins.length;
    return { ...p, headToHead: wins, meanWin: mean };
  });

  const total = rows.reduce((a, r) => a + r.meanWin, 0) || 1;
  for (const r of rows) r.share = r.meanWin / total;

  /* FRAMLAG PER INNTAK, midad vid medaltal hopsins. */
  const avg = {};
  for (const t of TERMS) {
    const vals = scored.map(p => num(p.inputs[t.key])).filter(v => v != null);
    avg[t.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  for (const r of rows) {
    r.terms = TERMS.map(t => {
      const v = num(r.inputs[t.key]);
      if (v == null || avg[t.key] == null) return { ...t, value: v, delta: null };
      /* EKKI NAMUNDAD HER. Framlogin eiga ad LEGGJAST NAKVAEMLEGA saman
         i skor-muninn — thad er thad sem gerir skyringuna ad skyringu en
         ekki ad eftira-rokstudningi. Namundun i gognunum braut thad um
         0,0002 og profid greip thad. Namundad er i BIRTINGU i stadinn. */
      return { ...t, value: v, delta: W[t.w] * (v - avg[t.key]) };
    /* Storsta ahrifin efst — thad er thad sem svarar "af hverju hann?" */
    }).sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
  }

  const sorted = [...rows].sort((a, b) => b.share - a.share);
  const lead = sorted[0], second = sorted[1];
  /* MUNURINN A EFSTU TVEIMUR er thad sem raedur hvort thetta er
     rádlegging eda jafntefli. Bilid er a SKOR-kvarda, svo thad er
     lesid gegnum SOMU maeldu kurfu.                                   */
  const decisive = pairWinProb(lead.score - second.score);

  return {
    ok: true, n: rows.length, rows, ranked: sorted,
    lead, decisiveProb: decisive,
    /* `close` thegar maelda talan er undir 55%: tha SEGJA GOGNIN AD
       ThAU VITI ThAD EKKI, og verkfaeri sem thykist vissara en gognin
       er verra en ekkert.                                             */
    close: decisive < 0.55,
    cal: ADVISOR_CAL,
  };
}

/* Vogtolurnar eru i model.js; hér er adeins oruggur lestur svo
   advisor.js geti verid profadur med hermdum vogum.                  */
function RANK_W_SAFE() {
  return { form: 0.13805, minsPerGame: 0.01607, price: 0.28235, ffdr: -0.59359, minsTrend: 0.01 };
}

/* ---- SAMHENGI SEM VEGUR EKKI ----
   Birt vid hlidina med sinum fyrirvara. `weighted:false` er thad sem
   vidmótid les til ad adgreina thau — og profid ver ad hver einasta
   faersla her beri thad flagg.                                        */
export function contextFactors(p) {
  const out = [];
  const sp = num(p?.startProb);
  if (sp != null) out.push({
    key: "start", label: "Chance of 60+ minutes", value: sp, fmt: "pct", weighted: false,
    tone: sp < 0.5 ? "bad" : sp < 0.75 ? "warn" : "good",
    note: "Measured model (Brier 0.089 against 0.118 for \"started last time\"). It answers "
        + "whether he plays, not who scores more, so it sits beside the percentage rather "
        + "than inside it — a player who does not start scores nothing at all.",
  });
  const dc = num(p?.dc);
  if (dc != null) out.push({
    key: "dc", label: "DefCon opportunity", value: dc, fmt: "int", weighted: false,
    tone: dc >= 70 ? "good" : "flat",
    note: "Defensive workload. Deliberately outside the score: it was measured to pull the "
        + "OPPOSITE way to clean sheets, because heavy defensive work goes with harder "
        + "matches. Blending them lets the two signals eat each other.",
  });
  const ar = num(p?.aron);
  if (ar != null) out.push({
    key: "aron", label: "Consistency (Aron)", value: ar, fmt: "signed", weighted: false,
    tone: ar > 0.15 ? "good" : ar < -0.1 ? "warn" : "flat",
    note: "How often he returns 4+ rather than 1-2. Description, not prediction: once points "
        + "and price are controlled for, nothing measurable is left within a position, so it "
        + "is barred from the score.",
  });
  const bc = num(p?.bigChances);
  if (bc != null) out.push({
    key: "bc", label: "Big chances", value: bc, fmt: "num", weighted: false,
    tone: "flat",
    note: "Shots worth 0.18 expected goals or more, from the BSD shot map (2025/26 only). "
        + "Shown as context; it is not one of the five measured inputs.",
  });
  return out;
}
