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
    return true;
  } catch (e) {
    console.warn(`FPL: save failed (${mode}):`, e?.message || e);
    _memStore[key] = s;
    return false;
  }
}

export async function loadState(key) {
  const mode = storageMode();
  try {
    let raw = null;
    if (mode === "local") raw = window.localStorage.getItem(key);
    else if (mode === "artifact") { const r = await window.storage.get(key); raw = r ? r.value : null; }
    else raw = _memStore[key] ?? null;
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn(`FPL: read failed (${mode}):`, e?.message || e);
    return null;
  }
}
