/* ============================================================
   goalassist.js — HVADA ASSIST TILHEYRIR HVADA MARKI

   Notandinn: "hérna skulum vid syna assist undir markinu, thannig ad
   sjaist hver gaf assist fyrir hvada mark."

   ============================================================
   AF HVERJU ThESSI SKRA ER TIL — OG HVERS VEGNA FYRRI SVARID VAR RANGT
   ============================================================
   Fram til 25.8.2026 stod i `App.jsx` (og i tveimur handover-skjolum) ad
   **"PORUNIN mark<->assist ER EKKI I NEINNI HEIMILD SEM VID HOFUM"**.
   Su fullyrding var byggd a raunverulegri maelingu — en a ROFUM URTAKI:
   skodadar voru `live/gw{n}.json`, `explain`-blokkirnar og
   `last_gw.json`, allar ThRJAR FPL-heimildir, og thaer bera engin
   porun. Su nidurstada er RETT um FPL.

   EN HUN VAR ALHAEFD YFIR I "ENGRI HEIMILD", OG ThAD ER RANGT:
   `data/last_gw_shots.json` — skra sem appid SAEKIR ThEGAR
   (`App.jsx`, `last_gw_shots.json`) og sendir inn i `GwReport` og
   `PlayerList` — ber `assist_by`, `assist_type` og `assist_context`
   A HVERJU SKOTI. Maelt 25.8.2026 a GW1 2026/27: **29 mork, 20 theirra
   med nefndan `assist_by`**, lesid ur ESPN-textanum sjalfum
   ("... Assisted by Riccardo Calafiori.").

   LAERDOMURINN ER ALMENNUR OG HANN ER SKRIFADUR HER SVO HANN TYNIST
   EKKI: **"vid leituðum og fundum ekki" er fullyrding um LEITINA, ekki
   um heiminn.** Neitun sem er alhaefd ut fyrir thad sem var skodad er
   haettulegri en engin neitun, thvi hun LOKAR spurningunni — naesti
   madur les "ekki til i neinni heimild" og leitar aldrei aftur. Sama
   aett og `grep` sem skilar nulli (kafli 2 i kodaryni-handover): nullid
   var rett, alyktunin af thvi var thad ekki.

   ============================================================
   ThRJAR REGLUR SEM GILDA UM ThESSA TOLU
   ============================================================
   1. **ESPN-ASSIST ER **EKKI** FANTASY-ASSIST OG ThAU MEGA ALDREI
      RENNA SAMAN.** ESPN notar Opta-skilgreininguna; FPL notar sina
      eigin, sem er VIDARI (thess vegna eru BSD-assist 29% faerri en
      FPL-assist, CLAUDE.md kafli 6). Tzolis-daemid sem notandinn nefndi
      — fantasy-assist an opinbers assists — er nakvaemlega bilid milli
      thessara tveggja. Thau eru thvi bædi synd, hvort undir sinu heiti.
      Ad birta adra sem hina vaeri rong tala med rettu utliti.
   2. **MARK AN `assist_by` ER "EKKI SAGT", ALDREI "ENGINN ASSIST".**
      9 af 29 morkum i GW1 bera engan. Sum eru raunverulega oassistud
      (einleikur, viti), onnur eru einfaldlega ekki ordud i textanum.
      Skilad er `null`, og vidmotid birtir ekkert — ekki strik sem les
      eins og "enginn atti thatt i thessu". Sama regla og "NULL ER EKKI
      NULL" (CLAUDE.md kafli 8).
   3. **SJALFSMORK FA ENGAN ASSIST.** `kind === "own_goal"` er sleppt
      med ollu: ESPN skrair thau a thann sem skoradi i eigid mark, og ad
      hengja assist a thau vaeri ad kenna manni um mark sem hann a ekki.

   ============================================================
   TIMABILS-HLIDID ER EKKI SKRAUT — ThAD ER SAMA GILDRAN OG WATKINS
   ============================================================
   `last_gw_shots.json` er lykluð a EITT timabil og EINA umferd, og hun
   getur borid ARKIV ur fyrra timabili (`archive: true`). Nakvaemlega
   thad gerdist 25.8.2026: skran bar `season "2025/26", gw 38` inn i
   2026/27 og **64 leikmenn med 0 minutur baru skot-tolur** — Watkins
   efstur. Vaeri ekki gatað her myndi sama skra para mork ur FYRRA
   timabili vid leiki thessa, og porun er VERRI en tala: hun nefnir
   TVO menn, badda ranga, i setningu sem les eins og stadreynd.
   Thess vegna er `season` OG `gw` bædi krafist.                      */

/** Mark sem ESPN skradi, med theim assist sem textinn nefndi. */
function goalRowsOf(shotsFile) {
  const rows = Array.isArray(shotsFile?.shots) ? shotsFile.shots : [];
  return rows.filter((s) => s && s.kind === "goal");
}

/**
 * BYGGIR UPPFLETTINGU: FPL-leikur -> { h: [...], a: [...] } thar sem hver
 * faersla er { scorer, assist, assistType, assistContext, minute }.
 *
 * `fixtures` eru FPL-leikir (bera `team_h`/`team_a` sem ID) og
 * `teamById` varpar ID -> lidi med `short`. ESPN-skrain ber lids-STYTTINGAR,
 * svo porunin er gerd a (short, short) PARINU — badir klubbar sannreyndir,
 * ekki annar. Einn klubbur gaeti att tvo leiki i sama farmi.
 *
 * Skilar TOMU korti (ekki null) thegar skran a ekki vid — kallandinn
 * tharf tha enga sertilfella-grein.
 */
export function goalAssistsByFixture({ shotsFile, fixtures, teamById, season, gw } = {}) {
  const out = new Map();
  if (!shotsFile || !Array.isArray(fixtures)) return out;

  /* TIMABILS- OG UMFERDAR-HLIDID (sja hausinn). Vanti annad hvort i
     KALLANDANUM er ekki gatað a thvi — tha er thad OThEKKT, ekki rangt,
     og vid follum aftur a thad eitt ad skran nefni sig sjalf. */
  if (season && shotsFile.season && shotsFile.season !== season) return out;
  if (gw != null && shotsFile.gw != null && Number(shotsFile.gw) !== Number(gw)) return out;

  const goals = goalRowsOf(shotsFile);
  if (!goals.length) return out;

  /* ESPN-leikur -> { h, a } styttingar. */
  const espnFx = new Map();
  for (const fx of (shotsFile.fixtures || [])) {
    if (fx && fx.fixture != null) espnFx.set(String(fx.fixture), { h: fx.h, a: fx.a });
  }

  /* (heima|uti) -> FPL-leikur. BADIR klubbar i lyklinum. */
  const byPair = new Map();
  for (const f of fixtures) {
    const h = teamById?.[f.team_h]?.short, a = teamById?.[f.team_a]?.short;
    if (h && a) byPair.set(`${h}|${a}`, f);
  }

  for (const g of goals) {
    const ef = espnFx.get(String(g.fixture));
    if (!ef || !ef.h || !ef.a) continue;
    const f = byPair.get(`${ef.h}|${ef.a}`);
    if (!f) continue;                       // leikur sem er ekki i thessari synu
    const side = g.team === ef.h ? "h" : g.team === ef.a ? "a" : null;
    if (!side) continue;                    // lid sem tilheyrir hvorugu — sleppt, ekki giskad

    if (!out.has(f.id)) out.set(f.id, { h: [], a: [] });
    out.get(f.id)[side].push({
      scorer: g.player || null,
      /* Regla 2: vantandi assist er `null`, ekki tomur strengur. */
      assist: g.assist_by || null,
      assistType: g.assist_type || null,
      assistContext: g.assist_context || null,
      minute: g.minute || null,
    });
  }

  /* Rod eftir minutu svo listinn lesist eins og leikurinn gerdist.
     `minute` er strengur ("15'", "90+2'"), svo talan er dregin ut;
     `90+2` verdur 92 svo vidbotartimi lendi a réttum stad og ekki
     ofan a 90. */
  const minOf = (m) => {
    const s = String(m || "");
    const base = Number((s.match(/^(\d+)/) || [])[1]);
    const add = Number((s.match(/\+(\d+)/) || [])[1]) || 0;
    return Number.isFinite(base) ? base + add : Number.POSITIVE_INFINITY;
  };
  for (const v of out.values()) {
    v.h.sort((x, y) => minOf(x.minute) - minOf(y.minute));
    v.a.sort((x, y) => minOf(x.minute) - minOf(y.minute));
  }
  return out;
}

/**
 * "Assisted by X with a cross following a corner" -> stutt ordalag.
 * Skilar `null` thegar ekkert er ad segja, svo vidmotid geti sleppt
 * reitnum i stad thess ad birta tomt svigi.
 */
export function assistPhrase(entry) {
  if (!entry || !entry.assist) return null;
  const t = entry.assistType && entry.assistType !== "pass" ? entry.assistType.replace(/_/g, " ") : null;
  const c = entry.assistContext || null;
  if (t && c) return `${t}, ${c}`;
  return t || c || null;
}
