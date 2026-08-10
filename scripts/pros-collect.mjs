/* pros-collect.mjs — safnar thvi sem sérfraedinga-hopurinn GERDI i umferdinni.

   Kallad ur `fetchFast()` i fetch.mjs, EKKI ur daglegu keyrslunni. Astaedan er
   nakvaemlega su sama og hja `fetchLineups` (sja CLAUDE.md 7.1): daglega
   keyrslan gengur kl. 05 UTC en frestir eru 11-18 UTC, svo dagleg keyrsla
   naedi umferdinni fyrst SOLARHRING of seint. Notandinn vill sja kaupin
   UM LEID OG UMFERDIN OPNAR.

   KVOTAVORN ER HER, EKKI I CRON-INU (sama regla og annars stadar i thessu
   repo-i): hrada keyrslan gengur a 30 min fresti — og a 15 min fresti fos-man
   — svo ovarid myndi thetta gera ~48.000 koll a dag. Picks BREYTAST EKKI
   eftir frest, svo vid saekjum HVERJA UMFERD NAKVAEMLEGA EINU SINNI og
   sleppum henni sidan. Full umferd = ~2.000 koll, ~20 sek.                  */

import { aggregate, coverageOk } from "../src/pros.js";

const FPL = "https://fantasy.premierleague.com/api";

/* Samhlida kollum haldid nidri. Maelt 9.8.2026 gegn FPL-API-inu:
   32 samtimis gaf 3,2% HTTP 429, 18 gaf 0 villur a 1,3 milljon kollum.     */
const CONC = 12;
const RETRY = 3;

async function pool(items, worker, conc = CONC) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, async () => {
    for (;;) {
      const k = i++;
      if (k >= items.length) return;
      out[k] = await worker(items[k], k);
    }
  }));
  return out;
}

/* HTTP-stada UR VILLUSKILABODUM. `getText` i fetch.mjs kastar
   `${status} ${url}`, en profin herma `HTTP 404 fyrir ${url}` — thess vegna
   er badum sniðum leyft, en STADAN ER LESIN AF BYRJUNINNI.

   HVERS VEGNA EKKI /\b404\b/ A OLLUM STRENGNUM (fyrsta utgafan):
   slodin sjalf ber tolur. Lid med id 404 gefur
   `500 .../entry/404/event/7/picks/` — og su villa hefdi verid RANGLEGA
   flokkud sem "lidid er ekki til", svo endurtilraunir hefdu verid slepptar
   og madurinn tapast ur thekjunni thegjandi. Fundid vid samthaettingar-
   yfirferd 10.8.2026 (`fetch.mjs` og profin nota ekki sama snidid).      */
function httpStatus(e) {
  const m = /^(?:HTTP\s+)?(\d{3})\b/.exec(e?.message || "");
  return m ? +m[1] : null;
}

/* Eitt lid, ein umferd. Skilar `null` ef ekki naest — kallandinn TELUR thau
   og thekjan verdur fullyrding, ekki thogn.                                */
async function one(getJSON, id, gw) {
  let picks = null, transfers = null;
  for (let a = 0; a < RETRY; a++) {
    try { picks = await getJSON(`${FPL}/entry/${id}/event/${gw}/picks/`); break; }
    catch (e) {
      /* 404 = thetta lid a enga umferd (nytt lid, eda eytt). Ekki villa,
         og EKKI reynt aftur — annars eyddum vid throngum kvota i tomt.     */
      if (httpStatus(e) === 404) return null;
      await new Promise(r => setTimeout(r, 400 * (a + 1)));
    }
  }
  if (!picks) return null;
  for (let a = 0; a < RETRY; a++) {
    try { transfers = await getJSON(`${FPL}/entry/${id}/transfers/`); break; }
    catch { await new Promise(r => setTimeout(r, 400 * (a + 1))); }
  }
  /* Skiptin sem gerd voru FYRIR thennan frest bera `event === gw`. Skrain
     skilar ollu timabilinu, svo vid siumn — annars taldist hver umferd
     uppsafnad og "kaup vikunnar" yrdi "kaup timabilsins".                  */
  /* GERDIN ER GATID, EKKI NETID. `event === gw` er strong jafna og fellur
     thegjandi ef FPL skilar `"7"` i stad `7` — tha hverfa OLL skipti og
     notan segir "0 bought, 0 sold", sem les eins og "enginn keypti neitt".
     Maelt 10.8.2026: strengur gaf 0 kaup thar sem tala gaf 1.
     Somu aett og `bank:"mikid"` -> NaN (CLAUDE.md kafla 5, untrusted-input):
     net-bilanirnar voru allar i lagi, TALNA-GERDIN var gatid.             */
  const mine = Array.isArray(transfers)
    ? transfers.filter(t => t && Number(t.event) === gw)
    : [];
  return { picks, transfers: mine };
}

/* `deps` = { getJSON, writeJSON, readJSON, record } ur fetch.mjs, svo thetta
   erfir timamork, status-skraningu og skrifleid thadan.                     */
export async function collectPros(deps, events) {
  const { getJSON, writeJSON, readJSON, record } = deps;

  const panelFile = await readJSON("pros.json").catch(() => null);
  const panel = panelFile?.panel;
  if (!Array.isArray(panel) || !panel.length) {
    record("pros", false, 0, "pros.json missing or empty - the expert panel has not been built");
    return;
  }

  /* ADEINS UMFERD THAR SEM FRESTURINN ER LIDINN.

     FPL SYNIR ENGUM LID ANNARRA FYRR EN FRESTUR ER LIDINN — thad er
     grundvallarregla leiksins, ekki tilviljun i API-inu: fyrir frest myndi
     thad leka thvi sem adrir aetla ad gera. `entry/{id}/event/{gw}/picks/`
     skilar thvi 404 hja ollum thangad til, og full keyrsla fyrir frest
     vaeri 2.000 koll i ekkert.

     VID LESUM `deadline_time` BEINT, EKKI `is_current`. Fyrsta utgafan
     notadi `is_current` — thad VIRKAR en er ohein leid ad spurningunni
     "er fresturinn lidinn?" og faerist eftir thvi hvenaer FPL flettir
     flagginu. Dagsetningin er otviraed.                                   */
  const now = Date.now();
  const passed = (events || [])
    .filter(e => e && e.deadline_time && Date.parse(e.deadline_time) <= now)
    .sort((a, b) => a.id - b.id);
  const cur = passed.length ? passed[passed.length - 1]
                            : (events || []).find(e => e.is_current) || null;
  if (!cur) { record("pros", true, 0, "no deadline has passed yet (preseason)"); return; }
  const gw = cur.id;

  /* EINKVAEM ID. Tvitekning i `pros.json` blaes UT ALLAR birtar tolur:
     sami stjornandi telst tvisvar, `n` verdur haerra en hopurinn, thekjan
     maelist 100% thott faerri hafi svarad, og hvert eignarhalds-hlutfall
     verdur skekkt i sömu att. Maelt 10.8.2026: hopur med 5 radir og 3
     einkvaem id gaf n=5 og eignarhald 5 i stad 3.
     Skrain er byggd handvirkt einu sinni a ari — thad er nakvaemlega su
     tegund skrar sem faer tvitekningu vid samslattur. Vid siumn her, i
     NEYTANDANUM, thvi thad er sa sem tolurnar hanga a.

     ROD SKIPTIR MALI: thetta VERDUR ad koma a undan kvotavorninni, sem les
     `ids.length`. Fyrsta utgafan hafdi thad a eftir og fell i "Cannot access
     'ids' before initialization" — en ADEINS a theirri braut thar sem fyrri
     umferd var til, thvi `done && ...` skammhleypti annars framhja. Beina
     profid mitt slapp; SAFNID greip thad.                                  */
  const ids = [...new Set(panel.map(p => p.id).filter(x => Number.isInteger(x) && x > 0))];
  if (!ids.length) {
    record("pros", false, 0, "pros.json has no usable entry ids");
    return;
  }

  const prev = (await readJSON("pros_gw.json").catch(() => null)) || { season: null, gw: {} };
  const done = prev.gw?.[gw];
  if (done && done.n && coverageOk(done, ids.length)) {
    record("pros", true, done.n, `GW${gw} already collected (${done.n}/${ids.length}) - skipped`);
    return;
  }

  const res = await pool(ids, id => one(getJSON, id, gw));
  const got = res.filter(Boolean);
  const agg = aggregate(got);

  /* ALGERLEGA TOM KEYRSLA SKRIFAR EKKERT.

     FUNDID MED LIFANDI THURRKEYRSLU 10.8.2026: 1.000 raunveruleg koll thar
     sem OLL svorudu 404 skrifudu `{ n: 0, own: {}, in: {}, ... }` i skrana.
     Thad er ekki hraedilegt — appid syni tomt astand og naesta keyrsla
     endursaekir — en rod med n=0 LES EINS OG "enginn gerdi neitt" i stad
     "sofnunin brast", og thad er nakvaemlega su tegund thagnar sem
     CLAUDE.md kafla 8 kallar "ómæld tala sem lítur út eins og mæling".
     Betra er engin rod: `pros_gw.json` sem vantar umferdina segir satt.   */
  if (agg.n === 0) {
    record("pros", false, 0, `GW${gw}: no manager could be read (${ids.length} attempted) - nothing written`);
    return;
  }

  /* TOM KEYRSLA MA ALDREI THURRKA UT GOD GOGN (sama regla og BSD, 8e).
     Ef vid naum verr en adur i somu umferd, höldum vid gomlu tolunni.      */
  if (done && done.n > agg.n) {
    record("pros", false, agg.n, `GW${gw}: new run reached only ${agg.n} of ${done.n} - kept previous`);
    return;
  }

  const out = { ...prev, season: panelFile.season || prev.season,
                updated: new Date().toISOString(),
                panel_size: ids.length,
                gw: { ...(prev.gw || {}), [gw]: agg } };
  await writeJSON("pros_gw.json", out);

  const cov = agg.n / ids.length;
  record("pros", coverageOk(agg, ids.length), agg.n,
         `GW${gw}: ${agg.n}/${ids.length} (${(100 * cov).toFixed(0)}%)`
         + `, ${Object.keys(agg.in).length} bought, ${Object.keys(agg.out).length} sold`);
}
