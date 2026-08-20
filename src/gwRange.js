/* ============================================================
   GWRANGE.JS — UMFERDAR-BILID: EIN HLEDSLA, EITT SKYNDIMINNI

   Fluttur ut ur PlayerList.jsx 20.8.2026 thegar Compare fekk sama
   eiginleika ("bara sidustu 8 leikina").

   AF HVERJU UTFLUTNINGUR OG EKKI AFRIT: skyndiminnid er FORSENDA
   hledslunnar, ekki hagraeding. Skrarnar eru 1,3-1,6 MB og notandinn hefur
   fengid "Failed to fetch" TVISVAR (7.8. og 9.8.2026) thegar
   raw.githubusercontent throttladi vid flakk milli timabila. Vaeri Compare
   med sitt eigid `Map` vaeri sama skra sott TVISVAR — einu sinni fyrir
   listann og einu sinni fyrir gluggann — og throttlunin sem var lagfaerd
   kviknadi aftur. Skyndiminni sem er EKKI sameiginlegt er ekki skyndiminni.
   Sama rok og `buildTeamMetrics` og `passesThreshold` (CLAUDE.md 7, 7.1):
   tvo eintok af sama hlut reka i sundur.

   HVAD ER HER: hledslan (skyndiminni + thrjar tilraunir + timamork),
   uppflettingin "hvada timabil eiga per-umferdar gogn", THAKID a bilinu
   (LEITT UT UR SKRANNI, ekki 38 harkodad) og reglan um hvada dalkur getur
   fylgt bili. HVAD ER **EKKI** HER: `sumGwRange` sjalft — thad er i
   `stats.js` med dalkaskranni sem thad thjonar, og tvaer utfaerslur a
   samlagningunni vaeri einmitt thad sem thetta skjal varnar.
   ============================================================ */

import { useEffect, useMemo, useState } from "react";
import { RAW } from "./dataUrl.js";

/* Per-umferdar skrarnar eru 1,3-1,6 MB og BREYTAST EKKI innan lotu (lokin
   timabil). Geymt UTAN einingarinnar svo thad lifi endur-teikningar, flipa-
   skipti OG skipti milli lesenda af (leikmannalistinn og samanburdurinn
   deila thvi — sja hausinn).                                            */
export const GW_CACHE = new Map();

/* "2025/26" -> "2526". Skrarnar heita player_gw_{key}.json.              */
export function seasonToKey(season) {
  const m = String(season || "").match(/^(\d{4})\/(\d{2})$/);
  return m ? m[1].slice(2) + m[2] : null;
}

/* HVADA TIMABIL EIGA PER-UMFERDAR GOGN? `consistency.json` er BYGGD UR
   NAKVAEMLEGA thessum skram (player_gw_{s}.json), svo lyklar hennar eru
   sjalfvirk og sjalfvidhaldandi skra yfir thad sem er til — enginn
   handskrifadur listi sem urealdast (CLAUDE.md 8).
   VILLAN SEM ThETTA LAGAR (7.8.2026): yfirstandandi timabil a enga slika
   skra. Appid reyndi samt ad saekja hana og raw.githubusercontent skilar
   404 AN CORS-hausa — svo vafrinn hafnar kallinu og notandinn sa "gogn
   vantar: Failed to fetch" i stad thess ad fa ad vita ad timabilid eigi
   einfaldlega engar umferdar-tolur enn.                                  */
export function gwSeasonsOf(consist) {
  return new Set(Object.keys(consist?.seasons || {}));
}
/* Vanti `consistency.json` sjalf er svarid JA — annars myndi ein vantandi
   gagnaskra slokkva eiginleika sem virkar. Sama regla og annars stadar:
   engin gogn um hvad er til er ekki thad sama og "ekkert er til".        */
export function gwSeasonAvailable(consist, season) {
  const s = gwSeasonsOf(consist);
  return !consist || s.size === 0 || s.has(season);
}

/* ============================================================
   ThAKID A BILINU ER LEITT UT UR SKRANNI, EKKI 38

   38 er rett tala fyrir 20-lida deild i dag. Appid a ThEGAR eina slika tolu
   (`maxGw` i App.jsx, leidd ur `events.length`) en HUN ER UM YFIRSTANDANDI
   TIMABIL og bilid her er um LOKID timabil — svo hun svarar ekki thessari
   spurningu og ma ekki gera thad.
   Talan er samt LESIN af gognunum af thvi ad "sidustu 8" ma ALDREI vera
   reiknad ur tolu sem skrain gaeti ekki bakkad upp: bil sem endar a GW38 i
   skra sem naer til GW34 gaefi thogla null-summu — tolu sem litur ut eins
   og maeling.
   Reiknad EINU SINNI per skra (WeakMap, 841 leikmenn x 38 umferdir).    */
const MAX_GW = new WeakMap();
export function maxGwOf(file) {
  if (!file || typeof file !== "object") return null;
  if (MAX_GW.has(file)) return MAX_GW.get(file);
  let mx = 0;
  for (const e of Object.values(file.players || {}))
    for (const k of Object.keys(e?.gw || {})) {
      const n = Number(k);
      if (Number.isFinite(n) && n > mx) mx = n;
    }
  const out = mx > 0 ? mx : null;
  MAX_GW.set(file, out);
  return out;
}

/* SMELLUR A KASSA — EIN UTFAERSLA FYRIR BADA VALARANA.
   Fyrsti smellur = nytt upphaf. Annar smellur = endi. Ef smellt er FYRIR
   upphafid snyst bilid vid i stad thess ad gera ekkert — annars virkar
   valarinn "bara til haegri" og thad er ekki thad sem notandinn gerir.  */
export function nextRange(r, n) {
  if (!r || r[0] !== r[1]) return [n, n];
  return n < r[0] ? [n, r[0]] : [r[0], n];
}

/* "SIDUSTU N" — ThAKID KEMUR FRA GOGNUNUM. `null` thegar thakid er ekki
   thekkt eda N naer yfir allt timabilid (tha er "whole season" svarid og
   hnappur sem gerir ekkert er verri en enginn hnappur).                 */
export function lastNRange(n, maxGw) {
  if (!(maxGw > 0) || !(n > 0) || n >= maxGw) return null;
  return [maxGw - n + 1, maxGw];
}

/* ============================================================
   HLEDSLAN — ThRJAR TILRAUNIR + SKYNDIMINNI

   Notandinn hefur fengid "Failed to fetch" TVISVAR (7.8. og 9.8.2026).
   Thad er NETVILLA, ekki 404 — allar skrarnar svara 200. Orsokin er
   raunhaef: raw.githubusercontent throttlar, og skran var sott UPP A NYTT
   i hvert sinn sem timabili var skipt fram og til baka.

   Tvennt lagad, og hvorugt dugir eitt:
     · SKYNDIMINNI per lotu — hvert timabil er sott EINU SINNI, svo flakk
       milli timabila (OG milli lesenda) kostar ekkert og throttlunin
       kviknar ekki.
     · ThRJAR tilraunir med vaxandi bid (0,8 s / 3,2 s) i stad einnar. Ein
       tilraun eftir 800 ms taekur venjulegan hiksta en ekki throttlun, sem
       er einmitt thad sem gerdist.
   ============================================================ */
export function loadGwSeason(seasonKey, { attempts = 3, timeoutMs = 25000 } = {}) {
  const cached = GW_CACHE.get(seasonKey);
  if (cached) return Promise.resolve(cached);
  const once = () =>
    fetch(`${RAW}/player_gw_${seasonKey}.json`, { signal: AbortSignal.timeout(timeoutMs) })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
  const run = (attempt = 0) => once().catch(e => {
    if (attempt >= attempts - 1) throw e;
    return new Promise(res => setTimeout(res, 800 * (attempt + 1) ** 2))
      .then(() => run(attempt + 1));
  });
  return run().then(data => { GW_CACHE.set(seasonKey, data); return data; });
}

/* ============================================================
   HOOKID SEM BADIR LESENDUR NOTA

   `enabled` er letihledslan: skrain er 1,3-1,6 MB og thad er tilgangslaust
   ad hlada henni thegar bilid er ekki i notkun. Leikmannalistinn kveikir
   thegar BIL er valid; samanburdurinn kveikir thegar VALARINN er opnadur,
   thvi hann tharf thakid (`maxGw`) ADUR en hann getur teiknad kassana eda
   bodid "sidustu 8". Baedi eru rett — thau spyrja ekki somu spurningar.

   `retry` BER TELJARA og thad er lagfaering, ekki snyrting: gamla utgafan i
   PlayerList.jsx gerdi `setGwErr(null); setGwFile(null);` — og hvorugt var
   i deps-listanum eftir bilun (`gwFile` var ThEGAR null), svo effectinn
   keyrdi ALDREI aftur. Hnappurinn hreinsadi villuskilabodin og gerdi
   ekkert annad. Hann var med odrum ordum HNAPPUR SEM LEIT UT EINS OG HANN
   VIRKADI — sama aett og daudi markadslidurinn (CLAUDE.md 3).
   ============================================================ */
export function useGwSeasonFile({ season, consist, enabled }) {
  const seasonKey = useMemo(() => seasonToKey(season), [season]);
  const available = useMemo(() => gwSeasonAvailable(consist, season), [consist, season]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [tries, setTries] = useState(0);

  /* Villa fra fyrra timabili ma ekki hanga a nyju vali.                  */
  useEffect(() => { setErr(null); }, [season]);

  useEffect(() => {
    if (!enabled || !seasonKey || !available) return;
    if (file?.key === seasonKey) return;
    /* Skyndiminnid er lesid SAMSTUNDIS (ekki gegnum promise) svo skipti
       milli timabila sem thegar eru sott seu ein endur-teikning.        */
    const cached = GW_CACHE.get(seasonKey);
    if (cached) { setFile({ key: seasonKey, data: cached }); setLoading(false); setErr(null); return; }
    let dead = false;
    setLoading(true); setErr(null);
    loadGwSeason(seasonKey)
      .then(data => { if (!dead) { setFile({ key: seasonKey, data }); setLoading(false); } })
      .catch(e => { if (!dead) { setErr(String(e?.message || e)); setLoading(false); } });
    return () => { dead = true; };
  }, [enabled, seasonKey, available, file, tries]);

  /* `data` er ADEINS skilad thegar skrain sem er i minni er skra ThESSA
     timabils. Annars laesi taflan 2024/25-tolur undir hausnum "2025/26"
     i thann eina ramma sem tekur ad skipta.                             */
  const data = (enabled && file?.key === seasonKey) ? (file.data || null) : null;
  return {
    seasonKey, available, data, loading, err,
    maxGw: maxGwOf(data),
    retry: () => { setErr(null); setFile(null); setTries(t => t + 1); },
  };
}

/* ============================================================
   HVADA DALKUR GETUR FYLGT UMFERDAR-BILI — EITT SKILYRDI

   `gwBlindKeys` (stats.js) maelir thad fyrir summanlegu dalkana, en hun
   SLEPPIR `live_only`-dalkum viljandi a theim forsendum ad their "beri
   eigid now-merki". MAELT 16.8.2026: thad merki er adeins til i
   dalkavalaranum, aldrei i haus toflunnar — fimm framsynir dalkar
   ("Upcoming fixtures") syndu dagsins tolur medan hausinn sagdi GW 30-38
   og EKKERT a skjanum sagdi fra. Skilyrdid er thvi EITT fall sem ALLIR
   lesa; tvo skilyrdi um sama hlut er hvernig thau fara i sundur.

   MERKI-ORDID ER LIKA HER, EKKI TVISVAR: baedi leikmannalistinn (haus-
   merkid, sem er MAELT i px) og samanburdurinn (rod-merkid) teikna sama
   ord, og ord sem er skrifad tvisvar er ord sem getur ordid tvennt.

   TVO ORD, ThVI ThAU ERU TVO ATRIDI: dalkur sem er "arstidar-summa" og
   dalkur sem er "dagsins tala" geta hvorugur fylgt bilinu, en af SITTHVORRI
   astaedu — og bordinn i leikmannalistanum laerdi thad dyrt (`rangeBlindKind`
   var settur inn af thvi ad hann kalladi FDR6 og Team CS "season totals",
   sem thau eru ekki). Merki sem segir "season" a Verdi vaeri sama villan i
   minni umbud: verdid er DAGSINS verd (CLAUDE.md 8 — "thu kaupir a verdi
   dagsins"), aldrei summa umferda.                                       */
export const RANGE_BLIND_BADGE = "season";
export const RANGE_LIVE_BADGE = "today";
export const rangeBlind = (d, blind) => blind.has(d.key) || !!d.live_only;
