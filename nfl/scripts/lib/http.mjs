/* ============================================================
   http.mjs — saekja + DISKA-SKYNDIMINNI + heimildaskra.

   TVAER ASTAEDUR FYRIR SKYNDIMINNINU:
   1. nflverse-skrarnar eru ~8 MB hver og pipeline-id les 7 timabil.
      An skyndiminnis tekur hver throunar-keyrsla margar minutur og
      GitHub faer 60+ koll ad tharflausu.
   2. **Maelingar verda ad vera endurgeranlegar.** Ef bakprofid
      saekir ny gogn i hverri keyrslu er ekki haegt ad segja hvort
      breyting a tolu kom fra kodanum eda fra gognunum. Skyndiminnid
      frystir heiminn medan verid er ad maela.

   Skyndiminnid er i `.cache-nfl/` (i .gitignore) og er ALDREI lesid
   i CI (`NFL_NO_CACHE=1` i workflow-inu) — thar eiga fersk gogn ad
   raeda.

   HEIMILDASKRAIN (`record`) speglar `status.json` i FPL-appinu:
   hver heimild skrair sig, svo hun se SYNILEG i vidmotinu thegar hun
   brotnar. Heimild sem enginn ser bilar hljodlega.
   ============================================================ */

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const CACHE_DIR = path.resolve(process.cwd(), ".cache-nfl");
const USE_CACHE = process.env.NFL_NO_CACHE !== "1";
const CACHE_TTL_MS = Number(process.env.NFL_CACHE_TTL_H || 12) * 3600e3;

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/* ---------- heimildaskra ---------- */
const sources = [];
/**
 * Skrair heimild.
 *
 * `note` ER A ENSKU — OLIKT FPL-PIPELINE-INU, OG VILJANDI.
 * Thar eru `status.json`-noturnar islenskar med theirri rokfaerslu ad
 * thaer seu GOGN en ekki vidmot (CLAUDE.md kafli 9). Su undanthaga
 * var til thvi afturvirk thyding a ~20 kallstodum i 3.371-linu
 * skriftu var dyr — ekki thvi hun vaeri rett i sjalfri ser.
 *
 * Hér RATA thaer beint i vidmotid (Sources-flipinn birtir `note`
 * ordrett), svo thaer eru vidmot og eiga ad vera enskar eins og allt
 * annad sem notandinn les. `tests/nfl-render.mjs` kafli 7 ver thad —
 * hann greip einmitt tha fyrstu utgafu sem erfdi FPL-undanthaguna
 * an thess ad erfa astaeduna fyrir henni.
 */
export function record(name, ok, note, extra = {}) {
  const prev = sources.find((s) => s.name === name);
  const row = { name, ok: !!ok, note, ts: new Date().toISOString(), ...extra };
  if (prev) Object.assign(prev, row);
  else sources.push(row);
  const mark = ok ? "ok " : "ERR";
  console.log(`  [${mark}] ${name} — ${note}`);
  return row;
}
export function sourceReport() { return sources.slice(); }

/* ---------- saekja ---------- */
function cacheKey(url) {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

async function readCache(url) {
  if (!USE_CACHE) return null;
  const f = path.join(CACHE_DIR, cacheKey(url));
  try {
    const st = await stat(f);
    if (Date.now() - st.mtimeMs > CACHE_TTL_MS) return null;
    return await readFile(f);
  } catch { return null; }
}

async function writeCache(url, buf) {
  if (!USE_CACHE) return;
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, cacheKey(url)), buf);
  } catch { /* skyndiminni ma bila an thess ad fella keyrsluna */ }
}

/**
 * Saekir slod og skilar Buffer. Endurtekur 3x med vaxandi bid.
 * `.gz` er afthjappad sjalfkrafa — nflverse birtir baedi .csv og
 * .csv.gz og gz-utgafan er ~5x minni yfir vir.
 */
export async function getBuf(url, { retries = 3, headers = {}, timeout = 90_000 } = {}) {
  const hit = await readCache(url);
  if (hit) return hit;

  let lastErr;
  for (let a = 0; a < retries; a++) {
    if (a) await new Promise((r) => setTimeout(r, 800 * 2 ** a));
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), timeout);
      const res = await fetch(url, {
        signal: ctl.signal,
        headers: { "User-Agent": UA, "Accept": "*/*", ...headers },
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let buf = Buffer.from(await res.arrayBuffer());
      // gzip-toframi: 1f 8b. Sumir hostar senda gz an content-encoding.
      if (buf[0] === 0x1f && buf[1] === 0x8b) buf = Buffer.from(gunzipSync(buf));
      await writeCache(url, buf);
      return buf;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

export async function getText(url, opt) { return (await getBuf(url, opt)).toString("utf8"); }

export async function getJSON(url, opt) {
  const t = await getText(url, opt);
  try { return JSON.parse(t); }
  catch (e) { throw new Error(`not JSON from ${url}: ${t.slice(0, 120)}`); }
}

/**
 * Saekir en FELLUR EKKI — skilar `fallback` og skrair villuna.
 * Notad fyrir heimildir sem mega vanta (vedur, likur, BSD-jafngildi).
 * Regla ur FPL-appinu: heimild sem dettur ut ma ALDREI fella pipeline-id,
 * en hun ma heldur aldrei hverfa thogul — thess vegna `record`.
 */
export async function tryGet(name, url, parse = "json", opt) {
  try {
    const v = parse === "json" ? await getJSON(url, opt)
            : parse === "buf" ? await getBuf(url, opt)
            : await getText(url, opt);
    return v;
  } catch (e) {
    record(name, false, `failed: ${e.message}`);
    return null;
  }
}

/* ============================================================
   SAMA LEID, FLEIRI EN EINN HOSTUR — HOSTUR ER BILUNARPUNKTUR
   ============================================================
   ThETTA VAR RAUNVERULEGT OG ThAD VAR STANDANDI:

   `site.api.espn.com` skilar **403 ur GitHub Actions** medan
   `lm-api-reads.fantasy.espn.com` og `sports.core.api.espn.com` skila
   200 UR SOMU KEYRSLU. Lokalt svara allir thrir 200. Þad er
   jadar-/svaeda-sia hja einum hosti, ekki bilun i leidinni og ekki
   kvoti — engin heimild hér krefst lykils.

   AFLEIDINGIN VAR SEM HER SEGIR, MAELD 21.8.2026:
     · `espn_lines_w1..w18` — 18 radir `failed: HTTP 403` i status.json.
       `market.json` er thvi vardur af `minRows: 200` og STENDUR OSNERT,
       sem er rett — en thad thydir ad markadslagid (sterkasta einstaka
       inntakid i vikulega likanid) ROTNAR nema einhver keyri lokalt.
     · `archive:news/{dagur}` — HAFNAD fimm daga i rod (15.-18.8. og
       19.8.) med "REFUSED: 4 rows". Frettasafnid er dagsett og
       `writeOnce` skrifar ALDREI ofan i, svo their dagar eru
       OENDURHEIMTANLEGIR. ESPN-fretta-glugginn er auk thess adeins
       ~22 klst (50 greinar, nyjasta 16:18, elsta 18:16 i gaer), svo
       gaerdagurinn er ekki til.

   LAUSNIN ER EKKI PROXY HELDUR ANNAR HOSTUR MED SOMU LEID.
   `site.web.api.espn.com` ber **nakvaemlega somu slodir** og
   `site.api.espn.com`. Maelt 21.8.2026, svid fyrir svid:
     /teams                    IDENTICAL (32 lid, id/skammstofun/litir/merki)
     /injuries                 IDENTICAL (32 lid, 800 radir)
     /news?limit=50            IDENTICAL — somu 50 greina-id i somu rod
     /scoreboard?...&week=3    IDENTICAL (16 leikir, spread/overUnder/
                               details/provider, allt eins)
   Þetta er thvi ekki "onnur heimild med annad snid" (sem vaeri thogul
   snidsbreyting i bid) heldur SAMA SVAR UR ODRUM DYRUM. Ekkert i
   thattaranum tharf ad vita hvor svaradi.

   `getJSONFirst` reynir hostana i rod og SKRAIR thegar varahostur
   svarar — annars fengjum vid graena keyrslu an ad vita ad
   adalhosturinn er fallinn, og thad er thogla bilunin sem thetta repo
   er fullt af varnaglum gegn. Svari adalhosturinn er ENGIN rod skrad:
   "allt eins og venjulega" er ekki frett.                           */
export async function getJSONFirst(tag, urls, opt) {
  let lastErr;
  for (let i = 0; i < urls.length; i++) {
    try {
      const v = await getJSON(urls[i], opt);
      if (i > 0) {
        record(`host:${tag}`, true,
          `primary host failed, served by ${hostOf(urls[i])} ` +
          `(same path, identical payload)`);
      }
      return v;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

function hostOf(u) {
  try { return new URL(u).host; } catch { return String(u).slice(0, 40); }
}

/** Keyrir `n` samhlida — GitHub tholir illa 40 samtimis koll. */
export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const j = i++;
      out[j] = await fn(items[j], j);
    }
  }));
  return out;
}
