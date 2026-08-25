/* ============================================================
   VISTAD ASTAND — ThRJAR GEYMSLU-LEIDIR, EIN HURD

   Flutt ur `App.jsx` 11.8.2026 (F1). Thetta er ekki stilsnyrting: thessi
   thrju foll eru ThAD SEM STENDUR MILLI NOTANDANS OG ThESS AD MISSA LIDID
   SITT, og their voru grafin a milli litaspjalds og React-vidmota.

   REGLAN SEM MA EKKI TAPAST (CLAUDE.md kafla 8c): `loadState` ver ADEINS
   gegn ONYTU JSON. GERD hvers svids er thvingud a KALLSTADNUM i App.jsx,
   thvi thad er thar sem vitad er hvad hvert svid A ad vera. Ad flytja
   thvinguninna hingad hefdi thytt ad thessi skra thyrfti ad thekkja
   plonunar-snidid — og tha vaeri hun ekki lengur geymslulag.

   `_storeMode` er RATAD EINU SINNI og geymt: probe-skrifin (`__fpl_probe__`)
   kosta annars eitt setItem/removeItem-par i hverju kalli.
   ============================================================ */

let _memStore = {};
/* Lyklar thar sem localStorage-skrifid BRAST og `_memStore` ber thvi
   ferskara gildi en diskurinn. Sja `saveState`/`loadState`.          */
const _memOnly = new Set();
let _storeMode = null;

export function storageMode() {
  if (_storeMode) return _storeMode;
  try {
    const k = "__fpl_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    _storeMode = "local";
  } catch {
    _storeMode = (typeof window !== "undefined" && window.storage) ? "artifact" : "memory";
    if (_storeMode === "memory")
      console.warn("FPL: neither localStorage nor window.storage is available — state will NOT be saved.");
  }
  return _storeMode;
}

export async function saveState(key, val) {
  const mode = storageMode();
  const s = JSON.stringify(val);
  try {
    if (mode === "local") window.localStorage.setItem(key, s);
    else if (mode === "artifact") await window.storage.set(key, s);
    else _memStore[key] = s;
  } catch (e) {
    /* ============================================================
       FALLBACKID VAR DAUTT — `loadState` LEIT ALDREI I `_memStore`
       (25.8.2026)

       `saveState` skrifar i `_memStore` thegar localStorage-skrifid
       bregst (kvoti fullur, einka-gluggi, "block site data"), en
       `loadState` las i "local"-ham EINGONGU localStorage. Vistun sem
       tokst "i minni" var thvi ekki laesileg af neinum, og notandinn
       fekk ThOGULT tap: appid sagdi ekkert, en naesti lestur i SOMU
       lotu skilaði gamla gildinu — eda engu.

       Lykillinn er merktur sem ostodugur svo lesturinn viti ad
       `_memStore` se FERSKARI en localStorage. An merkisins yrdi
       varð annad tveggja rangt: annadhvort myndi `_memStore` alltaf
       skyggja a localStorage (og gomul lota lifad af endurhledslu),
       eda localStorage alltaf vinna (og ferska gildid tapast).
       ============================================================ */
    console.warn(`FPL: save failed (${mode}):`, e?.message || e);
    _memStore[key] = s;
    _memOnly.add(key);
    return false;
  }
  /* HEPPNAD SKRIF HREINSAR MERKID: kvoti getur losnad (notandinn eydir
     odru), og tha er localStorage aftur retta heimildin. Merki sem er
     bara SETT en aldrei tekid af er merki sem verdur rangt.          */
  _memOnly.delete(key);
  return true;
}

export async function loadState(key) {
  const mode = storageMode();
  try {
    let raw = null;
    /* MINNIS-AFRITID GENGUR FYRIR ThEGAR SKRIFID BRAST — sja `saveState`.
       Adeins fyrir lykla sem eru MERKTIR, svo venjulegur lestur se
       obreyttur og endurhledsla lesi afram raunverulega localStorage. */
    if (mode === "local" && _memOnly.has(key)) raw = _memStore[key] ?? null;
    else if (mode === "local") raw = window.localStorage.getItem(key);
    else if (mode === "artifact") { const r = await window.storage.get(key); raw = r ? r.value : null; }
    else raw = _memStore[key] ?? null;
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn(`FPL: read failed (${mode}):`, e?.message || e);
    return null;
  }
}
