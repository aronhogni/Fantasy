/* ============================================================
   HVENAER A AD GERA SKIPTIN? — MAELT 5.9.2026
   ============================================================
   Notandinn: „thad hlytur ad vera rettur timi ef vid horfum serstaklega
   a FFDR. Thegar leikmadur sem eg aetla ad selja a erfitt program og sa
   sem eg aetla ad kaupa lett program."

   INNSAEID ER RETT — OG HELMINGUR ThESS VAR ThEGAR I APPINU.
   `expPointsFor` ber FFDR-margfaldarann, svo `transferNet` er ThEGAR
   „skiptu thegar leikirnir snuast". Thad er VIDMIDID sem thessi skra
   tharf ad sla, ekki nidurstada.

   OPNA SPURNINGIN VAR SU GAGNSTAEDA: borgar sig ad BIDA? Daemi notandans
   sjalfs (ut = erfitt, inn = lett) maelir med thvi ad gera thad STRAX.
   Bid borgar sig i speglinum: sa sem a ad koma inn a slaema leiki i
   1-3 umferdir og betri eftir thad, medan sa sem fer ut er i lagi
   thaer vikur.

   MAELT A 5 TIMABILUM, 140 akvordunar-punktum, 8.400 pörum (FFDR
   endurreiknad FROSID vid hvern punkt — lidsvisar ur leikjum sem voru
   bunir fyrir fyrsta upphafsspark umferdarinnar, elo ur sidasta leik
   hvers lids, markadslinur adeins fyrir umferdina sjalfa).

   LAUGIN SEM SKIPTIR MALI er ekki oll pör heldur ThAU SEM APPID METUR
   ThEGAR JAKVAED (`transferNet > 0`, 3.267 pör): „hvenaer" er adeins
   spurning um skipti sem eru thess virdi ad gera.

     · Reglan segir SKIPTU NUNA i **78-92%** tilfella — og i **92,1%**
       theirra thar sem sa sem kemur inn a lettari leik thessa viku,
       sem er einmitt daemi notandans.
     · Bid borgar sig i **17,1%** paranna (krossunar-lögunin) og er tha
       verd **+1,136 stig CI [0,681, 1,573]**, 4 ar af 5.
     · HREIN LEIKJAThYNGD, an blanks og tvofaldra: **11,0%** paranna,
       **+0,841 CI [0,274, 1,348]**, 4 ar af 5. Innsaei notandans
       stendur eitt og ser.
     · YFIR OLL jakvaed skipti er timasetningin verd **+0,19 til +0,26
       stig** a sex umferdum — um tuttugasti hluti ur refsingu.

   ThRENNT SEM ThESSI SKRA MA EKKI FULLYRDA:
   1. ENGIN ORAKEL-TALA. „Besta vikan hefdi verid verd +3,08" er
      **100% havadi**: sama orakel a STOKKUDUM vikum gefur +3,12.
      Hamark yfir fjora havada-kosti er alltaf jakvaett.
   2. FFDR-LITURINN ER EKKI ADAL-DRIFKRAFTURINN. ~72% af
      timasetningar-virdinu eru **blank og tvofaldar umferdir**;
      eiginlegt framlag litarins er +0,072 CI [0,006, 0,151] — raunverulegt
      og thunnt.
   3. EKKERT UM MEIDSLI. Engin tiltaekileika-saga er til i repo-inu
      (`data/history/` er verd-eingongu fra 25.7.2026), svo allar
      maelingar keyrdu med `avail = 1`. Ad rada uppfaerist vid nyjar
      frettir er eiginleiki PIPELINE-unnar, ekki nidurstada hedan.

   `SWAP_KMAX = 3` ER MAELT (nested val velur k3 i ollum fimm foldum).
   `tau` er hins vegar **STILLING A ThVI HVE OFT REGLAN TALAR**, ekki
   maeldur fasti: oll 21 afbrigdi tau x kmax hafa CI sem utiloka null og
   avinningurinn fellur einraent 0,257 -> 0,088 thegar tau fer 0 -> 2.
   Hun ma thvi ALDREI birtast sem maeld tala.
   ============================================================ */

/* Nested val velur k3 i ollum foldum — thetta er maelt. */
export const SWAP_KMAX = 3;
/* Hve mikid k != 0 tharf ad sla „nuna" til ad vera sagt. STILLING:
   vid 0,25 talar reglan a 15,2% jakvaedra skipta og er tha verd
   +1,598 CI [0,952, 2,192]. */
export const SWAP_TAU = 0.25;
/* „Engin breyting" er um ad SKIPTIN seu veik, ekki um ad vikan se rong.
   KVORDUN, ekki throskuldur ur leit: undir ~+3 spadum stigum a sex
   umferdum er raunutkoman **hlutkesti** (49-52% jakvaed) medan hun er
   65,9% yfir +5. */
export const SWAP_WEAK_NET = 3;

/* UTFLUTT svo `buysell.js` reikni EKKI sina eigin summu — tvaer
   utfaerslur af sömu formulu eru tvaer formulur (CLAUDE.md kafli 7). */
export const sum = (a, from = 0, to = a.length) => {
  let s = 0;
  for (let i = from; i < to && i < a.length; i++) s += Number(a[i]) || 0;
  return s;
};

/* ============================================================
   epOut / epIn — VAENT STIG PER UMFERD FRA AKVORDUNAR-PUNKTI.
   Kallandinn reiknar thau med `expPointsFor` (sami margfaldari,
   sama kvordun og vollurinn synir), svo thessi skra baetir ENGRI
   nyrri stiga-formulu vid — hun raðar adeins i tima.
   ============================================================ */
export function swapTiming({ epOut, epIn, freeTransfers = 1,
                             tau = SWAP_TAU, kmax = SWAP_KMAX }) {
  const out = Array.isArray(epOut) ? epOut : null;
  const inn = Array.isArray(epIn) ? epIn : null;
  if (!out || !inn || !out.length || !inn.length) return null;
  const H = Math.min(out.length, inn.length);
  if (H < 2) return null;

  /* NAMUNDAD I SEX AUKASTAFI ADUR EN ThROSKULDURINN ER LESINN. Ekki
     endurkvordun heldur HAVADA-HREINSUN: 1,6 a moti 1,1 per viku er
     nakvaemlega 3,0 en leggst i 3,0000000000000004 og slapp thvi ur
     „weak"-flokknum. Flokkur sem raest af sextanda aukastaf er ekki
     flokkur.                                                          */
  const net = +(sum(inn, 0, H) - sum(out, 0, H)).toFixed(6);
  /* VEIKT SKIPTI: talan er um SKIPTIN, ekki um vikuna. Reglan talar
     ekki um timasetningu thegar sjalft skiptid er hlutkesti.        */
  if (net <= SWAP_WEAK_NET) {
    return { verdict: "weak", k: null, net, gain: 0, horizon: H,
             why: "netGainBelowThreshold" };
  }
  /* ENGIN FRISKIPTI: hrein reikningsdaemi, ekki likan. Alltaf taka
     -4 gefur 12,598; alltaf bida eina viku gefur 16,015; likan sem
     velur gefur 16,015 — delta 0,000 CI [-0,022, +0,027]. */
  if (!(freeTransfers >= 1)) {
    return { verdict: "wait", k: 1, net, gain: null, horizon: H,
             why: "noFreeTransfer" };
  }

  const valueOf = k => sum(out, 0, k) + sum(inn, k, H);
  const now = valueOf(0);
  let best = { k: 0, v: now };
  for (let k = 1; k <= Math.min(kmax, H - 1); k++) {
    const v = valueOf(k);
    if (v > best.v) best = { k, v };
  }
  const gain = best.v - now;
  if (best.k === 0 || gain <= tau) {
    return { verdict: "now", k: 0, net, gain: 0, horizon: H, why: "nowIsBest" };
  }
  return { verdict: "wait", k: best.k, net, gain: +gain.toFixed(3), horizon: H,
           why: "fixtureCrossover" };
}
