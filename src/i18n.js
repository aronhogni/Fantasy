/* ============================================================
   TUNGUMAL — islenska ER frumtextinn, thess vegna er hann LYKILLINN.

   AF HVERJU ISLENSKI STRENGURINN ER LYKILLINN OG EKKI `nav.planner`:
   appid var skrifad a islensku i ~9.000 linum. Abstrakt lyklar hefdu
   krafist thess ad HVER strengur faeri i tvo skjol (lykill + islenska)
   og hver ohnitud lyklun (`nav.planer`) hefdi thagad — birt lykilinn
   sjalfan i vidmotinu. Med frumtextann sem lykil er islenskan ALLTAF
   rett (t() skilar lyklinum), og eina sem getur brostid er thydingin,
   sem PROFID finnur (tests/i18n.mjs les hvern t()-lykil ur kodanum og
   fellur ef hann er ekki i EN).

   STIKUR: `{0}`, `{1}` ... i sama ordi og roð sem thau komu i
   sniðmatinu. Their MEGA endurradast i thydingunni — thad er tilgangurinn:
     is: "Vantar £{0}m — of dyr skipti."
     en: "£{0}m short — transfer too expensive."

   TVO TUNGUMAL: `is` hefur ENGA orðabok (t() skilar lyklinum obreyttum),
   svo islenska leidin er alveg kostnadarlaus og getur ekki brostid.
   ============================================================ */
import { EN } from "./i18n-en.js";

export const LANGS = [
  ["is", "IS", "Íslenska"],
  ["en", "EN", "English"],
];
const DICTS = { is: null, en: EN };
const STORE_KEY = "fpl_lang";
const DEFAULT_LANG = "is";

let LANG = DEFAULT_LANG;
const subs = new Set();
/* Lyklar sem vantadi i vidmotinu. Profid les kodann (ekki thetta), en
   thetta gerir vantandi thydingu SYNILEGA i dev-console lika.        */
const missing = new Set();

function norm(l) {
  return DICTS[l] !== undefined ? l : DEFAULT_LANG;
}

/* localStorage getur kastad (Safari private mode) og er ekki til i Node —
   tungumal ma ALDREI vera thad sem fellir appid.                     */
function read() {
  try {
    const v = globalThis.localStorage?.getItem(STORE_KEY);
    if (v) return norm(v);
  } catch { /* ignore */ }
  return DEFAULT_LANG;
}
function write(l) {
  try { globalThis.localStorage?.setItem(STORE_KEY, l); } catch { /* ignore */ }
}

LANG = read();

export function getLang() { return LANG; }

export function setLang(next) {
  const l = norm(next);
  if (l === LANG) return;
  LANG = l;
  write(l);
  applyDocument();
  for (const fn of [...subs]) fn(l);
}

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/* <html lang> og flipa-titill fylgja valinu — skjalesarar og
   ordabaekur vafrans lesa lang-attributid, svo thad ma ekki lugja.  */
export function applyDocument() {
  const d = globalThis.document;
  if (!d) return;
  if (d.documentElement) d.documentElement.lang = LANG;
  d.title = t("Fantasy plönun");
}

/* SAMHENGI: "M|mörk" er lykill fyrir M sem thydir MORK, adgreindur fra
   "M" sem thydir MIÐJA. Islenskan er thad sem stendur FYRIR pipuna; enskan
   kemur ur ordabokinni undir FULLA lyklinum. Homograf getur ekki haft eina
   thydingu, og hann er RAUNVERULEGUR her: "M" er badi Mork og Midja.   */
function bare(key) {
  const i = key.lastIndexOf("|");
  return i > 0 ? key.slice(0, i) : key;
}

export function t(key, args) {
  const dict = DICTS[LANG];
  let s = bare(key);
  if (dict) {
    const hit = dict[key];
    if (hit == null) missing.add(key);
    else s = hit;
  }
  /* Skipt UT thegar rok eru GEFIN, ekki adeins thegar their eru toma —
     annars laekir "{0}" sjalfur ut i vidmotid ef listinn er tomur.      */
  if (Array.isArray(args)) {
    s = s.replace(/\{(\d+)\}/g, (m, i) => {
      const v = args[Number(i)];
      return v == null ? "" : String(v);
    });
  }
  return s;
}

export function missingKeys() { return [...missing]; }
